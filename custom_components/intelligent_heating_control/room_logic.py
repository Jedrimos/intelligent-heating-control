"""Room temperature calculation and schedule logic mixin for IHC Coordinator."""
from __future__ import annotations

import logging
import math
from collections import deque
from datetime import datetime
from typing import Optional

from .const import (
    CONF_ROOM_ID,
    CONF_ROOM_NAME,
    CONF_MIN_TEMP,
    CONF_MAX_TEMP,
    CONF_ROOM_OFFSET,
    CONF_DEADBAND,
    CONF_COMFORT_TEMP,
    CONF_AWAY_TEMP_ROOM,
    DEFAULT_AWAY_TEMP_ROOM,
    CONF_AWAY_TEMP,
    CONF_VACATION_TEMP,
    CONF_ABSOLUTE_MIN_TEMP,
    CONF_ROOM_QM,
    CONF_ROOM_PREHEAT_MINUTES,
    CONF_ECO_OFFSET,
    CONF_ECO_MAX_TEMP,
    CONF_SLEEP_OFFSET,
    CONF_SLEEP_MAX_TEMP,
    CONF_AWAY_OFFSET,
    CONF_AWAY_MAX_TEMP,
    CONF_HA_SCHEDULES,
    CONF_HA_SCHEDULE_OFF_MODE,
    CONF_SCHEDULES,
    CONF_PREHEAT_MINUTES,
    CONF_NIGHT_SETBACK_OFFSET,
    CONF_COOLING_TARGET_TEMP,
    CONF_OFF_USE_FROST_PROTECTION,
    CONF_ADAPTIVE_PREHEAT_ENABLED,
    CONF_TEMP_HISTORY_SIZE,
    DEFAULT_MIN_TEMP,
    DEFAULT_MAX_TEMP,
    DEFAULT_COMFORT_TEMP,
    DEFAULT_AWAY_TEMP,
    DEFAULT_VACATION_TEMP,
    DEFAULT_ABSOLUTE_MIN_TEMP,
    DEFAULT_ROOM_QM,
    DEFAULT_ROOM_PREHEAT_MINUTES,
    DEFAULT_ECO_OFFSET,
    DEFAULT_ECO_MAX_TEMP,
    DEFAULT_SLEEP_OFFSET,
    DEFAULT_SLEEP_MAX_TEMP,
    DEFAULT_AWAY_OFFSET,
    DEFAULT_AWAY_MAX_TEMP,
    DEFAULT_HA_SCHEDULE_OFF_MODE,
    DEFAULT_PREHEAT_MINUTES,
    DEFAULT_NIGHT_SETBACK_OFFSET,
    DEFAULT_COOLING_TARGET_TEMP,
    DEFAULT_OFF_USE_FROST_PROTECTION,
    DEFAULT_ADAPTIVE_PREHEAT_ENABLED,
    ROOM_MODE_AUTO,
    ROOM_MODE_COMFORT,
    ROOM_MODE_ECO,
    ROOM_MODE_SLEEP,
    ROOM_MODE_AWAY,
    ROOM_MODE_OFF,
    ROOM_MODE_MANUAL,
    SYSTEM_MODE_OFF,
    SYSTEM_MODE_COOL,
    SYSTEM_MODE_AWAY,
    SYSTEM_MODE_VACATION,
    SYSTEM_MODE_GUEST,
)
from .schedule_manager import ScheduleManager

_LOGGER = logging.getLogger(__name__)


class RoomLogicMixin:
    """Mixin for room temperature calculation and schedule evaluation."""

    def _update_warmup_tracking(self, room_id: str, was_cold: bool, is_now_warm: bool) -> None:
        """Track how long a room took to warm up (predictive pre-heating data)."""
        if was_cold and self._warmup_start.get(room_id) is None:
            self._warmup_start[room_id] = datetime.now()
        if is_now_warm and self._warmup_start.get(room_id) is not None:
            minutes = (datetime.now() - self._warmup_start[room_id]).total_seconds() / 60
            history = self._warmup_history.setdefault(room_id, [])
            history.append(round(minutes, 1))
            if len(history) > 10:
                history.pop(0)
            self._warmup_start[room_id] = None

    def _detect_sensor_anomaly(self, room_id: str) -> Optional[str]:
        """
        Roadmap 1.1 – Anomalie-Erkennung.

        Returns a short anomaly description or None.
        Checks:
          - Sensor drift: last 10 readings all identical (stuck value)
          - Sudden drop: temperature fell > 4 °C in last 3 readings (window open?)
        """
        history = list(self._temp_history.get(room_id, []))
        if len(history) < 3:
            return None
        vals = [p["v"] for p in history]
        # Stuck sensor: last 10 readings (or all available) are identical
        check = vals[-10:]
        if len(check) >= 5 and len(set(check)) == 1:
            return "sensor_stuck"
        # Sudden temperature drop (>4°C over last 3 readings)
        if vals[-1] < vals[-3] - 4.0:
            return "temp_drop"
        return None

    def _is_schedule_group_active(self, schedule_group: dict) -> bool:
        """Return True if the schedule group's condition is met (or no condition is set)."""
        condition_entity = schedule_group.get("condition_entity", "")
        if not condition_entity:
            return True
        state = self.hass.states.get(condition_entity)
        expected = schedule_group.get("condition_state", "on")
        return state is not None and state.state == expected

    def get_next_schedule_period(self, room_id: str) -> Optional[dict]:
        """Return the next scheduled period for a room (for informational display)."""
        mgr = self._schedule_managers.get(room_id)
        if mgr is None:
            return None
        active_scheds = [s for s in mgr.schedules if self._is_schedule_group_active(s)]
        return ScheduleManager(active_scheds).get_next_period()

    def get_avg_warmup_minutes(self, room_id: str) -> Optional[float]:
        """Average warmup duration in minutes for predictive pre-heating."""
        history = self._warmup_history.get(room_id, [])
        if not history:
            return None
        return round(sum(history) / len(history), 1)

    def _get_room_preset_temps(self, room: dict, outdoor_temp: Optional[float]) -> tuple[float, float, float, float]:
        """
        Compute outdoor-regulated comfort/eco/sleep/away base temperatures for a room.

        comfort = heating_curve(outdoor_temp)  [fallback: room comfort_temp if no sensor]
        eco     = min(eco_max_temp,   comfort - eco_offset)
        sleep   = min(sleep_max_temp, comfort - sleep_offset)
        away    = min(away_max_temp,  comfort - away_offset)

        Values are bounded by room min_temp/max_temp but do NOT include room_offset
        (that is applied separately in _calculate_target_temp when returning).

        Returns (comfort_base, eco_base, sleep_base, away_base) – all WITHOUT room_offset.
        """
        min_temp     = float(room.get(CONF_MIN_TEMP, DEFAULT_MIN_TEMP))
        max_temp     = float(room.get(CONF_MAX_TEMP, DEFAULT_MAX_TEMP))
        abs_min_temp = float(room.get(CONF_ABSOLUTE_MIN_TEMP, DEFAULT_ABSOLUTE_MIN_TEMP))
        # Effective floor is the higher of min_temp and absolute_min_temp
        effective_floor = max(min_temp, abs_min_temp)

        if outdoor_temp is not None:
            comfort_base = self._heating_curve.get_target_temp(outdoor_temp)
        else:
            # No outdoor sensor: fall back to the room's stored comfort_temp
            comfort_base = float(room.get(CONF_COMFORT_TEMP, DEFAULT_COMFORT_TEMP))

        comfort_base = min(max_temp, max(effective_floor, comfort_base))

        eco_offset  = float(room.get(CONF_ECO_OFFSET, DEFAULT_ECO_OFFSET))
        eco_max     = float(room.get(CONF_ECO_MAX_TEMP, DEFAULT_ECO_MAX_TEMP))
        eco_base    = min(eco_max, min(max_temp, max(effective_floor, comfort_base - eco_offset)))

        sleep_offset = float(room.get(CONF_SLEEP_OFFSET, DEFAULT_SLEEP_OFFSET))
        sleep_max    = float(room.get(CONF_SLEEP_MAX_TEMP, DEFAULT_SLEEP_MAX_TEMP))
        sleep_base   = min(sleep_max, min(max_temp, max(effective_floor, comfort_base - sleep_offset)))

        away_offset  = float(room.get(CONF_AWAY_OFFSET, DEFAULT_AWAY_OFFSET))
        away_max     = float(room.get(CONF_AWAY_MAX_TEMP, DEFAULT_AWAY_MAX_TEMP))
        away_base    = min(away_max, min(max_temp, max(effective_floor, comfort_base - away_offset)))

        return comfort_base, eco_base, sleep_base, away_base

    def _calculate_target_temp(self, room: dict, outdoor_temp: Optional[float]) -> tuple[float, dict]:
        """
        Calculate the effective target temperature for a room.

        Priority (highest wins):
          1. System mode override (AWAY, VACATION → fixed global temp)
          2. Room mode override (COMFORT, ECO, SLEEP, AWAY, OFF, MANUAL)
          3. Active schedule period temperature
          4. Heating curve target + room offset (default)

        Returns (effective_target_temp, metadata_dict)
        """
        room_id = room.get(CONF_ROOM_ID, "")
        room_offset = float(room.get(CONF_ROOM_OFFSET, 0.0))
        min_temp = float(room.get(CONF_MIN_TEMP, DEFAULT_MIN_TEMP))
        max_temp = float(room.get(CONF_MAX_TEMP, DEFAULT_MAX_TEMP))

        cfg = self.get_config()
        room_mode = self.get_room_mode(room_id)
        system_mode = self._system_mode

        frost_temp = self._get_frost_protection_temp()

        # Compute outdoor-regulated base temps (WITHOUT room_offset — applied at return time)
        comfort_base, eco_base, sleep_base, away_base = self._get_room_preset_temps(room, outdoor_temp)

        # --- 1. System mode overrides ---
        if system_mode == SYSTEM_MODE_OFF:
            off_use_frost = bool(cfg.get(CONF_OFF_USE_FROST_PROTECTION, DEFAULT_OFF_USE_FROST_PROTECTION))
            if off_use_frost:
                # Legacy behaviour: keep valves at frost-protection temp
                return frost_temp, {"source": "frost_protection", "schedule_active": False}
            else:
                # Default: valves are turned off completely (handled in update loop)
                return frost_temp, {"source": "system_off", "schedule_active": False}

        if system_mode == SYSTEM_MODE_COOL:
            # Cooling mode: target is the configured cooling temperature (room wants to stay BELOW this)
            cooling_target = float(cfg.get(CONF_COOLING_TARGET_TEMP, DEFAULT_COOLING_TARGET_TEMP))
            return min(max_temp, max(min_temp, cooling_target)), {
                "source": "cooling_mode", "schedule_active": False
            }

        if system_mode == SYSTEM_MODE_AWAY:
            away_temp = float(cfg.get(CONF_AWAY_TEMP, DEFAULT_AWAY_TEMP))
            # Frost protection: away temp must be at least frost_temp
            return max(away_temp, frost_temp), {"source": "system_away", "schedule_active": False}

        if system_mode == SYSTEM_MODE_VACATION:
            vac_temp = float(cfg.get(CONF_VACATION_TEMP, DEFAULT_VACATION_TEMP))
            return max(vac_temp, frost_temp), {"source": "system_vacation", "schedule_active": False}

        if system_mode == SYSTEM_MODE_GUEST:
            return min(max_temp, max(min_temp, comfort_base + room_offset)), {
                "source": "guest_mode", "schedule_active": False
            }

        # --- 1b. Room-specific presence → away temp (Roadmap 1.2) ---
        if not self._check_room_presence(room) and room_mode == ROOM_MODE_AUTO:
            away_temp_room = float(room.get(CONF_AWAY_TEMP_ROOM, DEFAULT_AWAY_TEMP_ROOM))
            effective_away = max(away_temp_room, frost_temp)
            return min(max_temp, max(min_temp, effective_away)), {
                "source": "room_presence_away", "schedule_active": False,
                "away_base": effective_away,
            }

        # --- 2. Room mode preset overrides ---
        if room_mode == ROOM_MODE_OFF:
            return min_temp, {"source": "room_off", "schedule_active": False}

        if room_mode == ROOM_MODE_AWAY:
            # Use per-room fixed away temperature if configured, else offset-based away_base
            away_temp_room = float(room.get(CONF_AWAY_TEMP_ROOM, DEFAULT_AWAY_TEMP_ROOM))
            effective_away = max(away_temp_room, frost_temp)
            return min(max_temp, max(min_temp, effective_away)), {
                "source": "room_away", "schedule_active": False, "away_base": effective_away,
            }

        if room_mode == ROOM_MODE_COMFORT:
            return min(max_temp, max(min_temp, comfort_base + room_offset)), {
                "source": "comfort", "schedule_active": False,
                "comfort_base": comfort_base,
            }

        if room_mode == ROOM_MODE_ECO:
            return min(max_temp, max(min_temp, eco_base + room_offset)), {
                "source": "eco", "schedule_active": False,
                "eco_base": eco_base,
            }

        if room_mode == ROOM_MODE_SLEEP:
            return min(max_temp, max(min_temp, sleep_base + room_offset)), {
                "source": "sleep", "schedule_active": False,
                "sleep_base": sleep_base,
            }

        if room_mode == ROOM_MODE_MANUAL:
            manual = self.get_room_manual_temp(room_id)
            if manual is not None:
                return min(max_temp, max(min_temp, manual)), {
                    "source": "manual", "schedule_active": False
                }
            # No stored manual temp (e.g. after restart without persisted value) –
            # fall back to auto so the room continues heating normally.
            self._room_modes[room_id] = ROOM_MODE_AUTO
            self._room_manual_since.pop(room_id, None)
            self._room_manual_period_key.pop(room_id, None)
            room_mode = ROOM_MODE_AUTO

        # Determine night setback modifier (applied to schedule and curve temps)
        night_setback = 0.0
        night_active = self._is_night_setback_active()
        if night_active:
            night_setback = float(cfg.get(CONF_NIGHT_SETBACK_OFFSET, DEFAULT_NIGHT_SETBACK_OFFSET))

        # Pre-heat window: per-room override > adaptive warmup history > qm-based > global static
        global_preheat  = int(cfg.get(CONF_PREHEAT_MINUTES, DEFAULT_PREHEAT_MINUTES))
        room_preheat_cfg = int(room.get(CONF_ROOM_PREHEAT_MINUTES, DEFAULT_ROOM_PREHEAT_MINUTES))
        room_qm          = float(room.get(CONF_ROOM_QM, DEFAULT_ROOM_QM))

        if room_preheat_cfg >= 0:
            # Explicit per-room override (0 = disabled for this room)
            static_preheat = room_preheat_cfg
        elif room_qm > 0 and global_preheat > 0:
            # Scale global preheat by room size relative to a 15 m² reference room
            static_preheat = max(1, round(global_preheat * math.sqrt(room_qm / 15.0)))
        else:
            static_preheat = global_preheat

        if static_preheat > 0 and cfg.get(CONF_ADAPTIVE_PREHEAT_ENABLED, DEFAULT_ADAPTIVE_PREHEAT_ENABLED):
            avg_warmup = self.get_avg_warmup_minutes(room_id)
            # Use historical warmup + 10% safety buffer (floor = static_preheat)
            preheat_minutes = max(static_preheat, round(avg_warmup * 1.1)) if avg_warmup else static_preheat
        else:
            preheat_minutes = static_preheat

        # v1.4 – ETA-based preheat: if someone arrives home soon, start heating early enough.
        # Use the ETA as an additional preheat trigger even if static/adaptive preheat is 0.
        eta_minutes = getattr(self, "_current_eta_minutes", None)
        if eta_minutes and eta_minutes > 0:
            preheat_minutes = max(preheat_minutes, int(eta_minutes))

        # --- 3a. HA schedule entities (external schedule.* entities with optional condition) ---
        # Each entry uses an existing room preset (comfort/eco/sleep/away) – no separate temp needed.
        # First matching active schedule wins. If schedules are configured but none fires → Eco.
        ha_scheds = room.get(CONF_HA_SCHEDULES, [])
        if ha_scheds:
            mode_to_temp = {
                ROOM_MODE_COMFORT: comfort_base,
                ROOM_MODE_ECO:     eco_base,
                ROOM_MODE_SLEEP:   sleep_base,
                ROOM_MODE_AWAY:    away_base,
            }
            for ha_sched in ha_scheds:
                entity_id = ha_sched.get("entity", "")
                if not entity_id:
                    continue
                # Check optional condition entity
                cond_entity = ha_sched.get("condition_entity", "")
                if cond_entity:
                    cond_state = self.hass.states.get(cond_entity)
                    expected = ha_sched.get("condition_state", "on")
                    if cond_state is None or cond_state.state != expected:
                        continue  # Condition not met – skip this binding
                # Check whether the HA schedule is currently active
                sched_state = self.hass.states.get(entity_id)
                from homeassistant.const import STATE_ON
                if sched_state and sched_state.state == STATE_ON:
                    sched_mode = ha_sched.get("mode", ROOM_MODE_COMFORT)
                    ha_temp = mode_to_temp.get(sched_mode, mode_to_temp[ROOM_MODE_COMFORT])
                    target = min(max_temp, max(min_temp, ha_temp + room_offset - night_setback))
                    return target, {
                        "source": "ha_schedule",
                        "schedule_active": True,
                        "ha_schedule_entity": entity_id,
                        "ha_schedule_mode": sched_mode,
                        "night_setback": night_setback,
                    }
            # Schedules configured but none active → use configured off-mode (eco or sleep)
            off_mode = room.get(CONF_HA_SCHEDULE_OFF_MODE, DEFAULT_HA_SCHEDULE_OFF_MODE)
            off_base = sleep_base if off_mode == ROOM_MODE_SLEEP else eco_base
            target = min(max_temp, max(min_temp, off_base + room_offset - night_setback))
            return target, {
                "source": f"ha_schedule_{off_mode}",
                "schedule_active": False,
                "ha_schedule_off_mode": off_mode,
                "night_setback": night_setback,
            }

        # --- 3b. Active internal schedule or upcoming pre-heat period ---
        # Filter schedule groups by optional condition (condition_entity / condition_state)
        all_schedules = room.get(CONF_SCHEDULES, [])
        if all_schedules:
            active_scheds = [s for s in all_schedules if self._is_schedule_group_active(s)]
            schedule_mgr = ScheduleManager(active_scheds)
            active_period = schedule_mgr.get_active_period()

            # Pre-heat: if no active period but an upcoming one starts within preheat_minutes
            if active_period is None and preheat_minutes > 0:
                active_period = schedule_mgr.get_upcoming_period(preheat_minutes)
                if active_period:
                    source_tag = "preheat"
                else:
                    source_tag = "schedule"
            else:
                source_tag = "schedule"

            if active_period:
                # Resolve period mode to temperature:
                # comfort/eco/sleep/away → room preset; manual or legacy → stored temperature
                period_mode = active_period.get("mode", "manual")
                mode_to_temp = {
                    ROOM_MODE_COMFORT: comfort_base,
                    ROOM_MODE_ECO:     eco_base,
                    ROOM_MODE_SLEEP:   sleep_base,
                    ROOM_MODE_AWAY:    away_base,
                }
                if period_mode in mode_to_temp:
                    sched_temp = mode_to_temp[period_mode]
                else:
                    sched_temp = float(active_period.get("temperature", comfort_base))
                sched_offset = float(active_period.get("offset", 0.0))
                # Schedule temp + per-period offset + room offset - night setback
                target = sched_temp + sched_offset + room_offset - night_setback
                target = min(max_temp, max(min_temp, target))
                return target, {
                    "source": source_tag,
                    "schedule_active": True,
                    "period_start": active_period["start"],
                    "period_end": active_period["end"],
                    "schedule_mode": period_mode,
                    "schedule_base": sched_temp,
                    "schedule_offset": sched_offset,
                    "night_setback": night_setback,
                }

        # --- 4. Heating curve + room offset (default / outside schedule) ---
        # comfort_base is already the curve-derived comfort target (see _get_room_preset_temps)
        target = comfort_base + room_offset - night_setback
        target = min(max_temp, max(min_temp, target))
        return target, {
            "source": "heating_curve",
            "schedule_active": False,
            "curve_base": comfort_base,
            "eco_base": eco_base,
            "sleep_base": sleep_base,
            "room_offset": room_offset,
            "night_setback": night_setback,
        }
