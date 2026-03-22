"""TRV (Thermostatic Radiator Valve) controller mixin for IHC Coordinator."""
from __future__ import annotations

import logging
import time
from typing import Optional

from homeassistant.const import STATE_UNAVAILABLE, STATE_UNKNOWN

from .const import (
    CONF_ROOM_ID,
    CONF_ROOM_NAME,
    CONF_VALVE_ENTITY,
    CONF_VALVE_ENTITIES,
    CONF_TRV_TEMP_WEIGHT,
    DEFAULT_TRV_TEMP_WEIGHT,
    CONF_TRV_TEMP_OFFSET,
    DEFAULT_TRV_TEMP_OFFSET,
    CONF_TRV_VALVE_DEMAND,
    DEFAULT_TRV_VALVE_DEMAND,
    CONF_TRV_MIN_SEND_INTERVAL,
    DEFAULT_TRV_MIN_SEND_INTERVAL,
    ROOM_MODE_OFF,
    ROOM_MODE_MANUAL,
)

_LOGGER = logging.getLogger(__name__)

# TRV battery-save constants (same values as coordinator.py)
TRV_TEMP_HYSTERESIS = 0.3       # °C – only send update if setpoint changes by at least this much
TRV_LARGE_CHANGE_THRESHOLD = 1.0  # °C – above this, always send immediately (mode change etc.)
TRV_SETPOINT_STEP = 0.5         # °C – quantise setpoint to TRV resolution (most TRVs: 0.5 °C)


class TRVControllerMixin:
    """Mixin for TRV data collection, blending, and control output."""

    def _get_trv_data(self, room: dict) -> dict:
        """Collect live data from all valve_entities (TRVs) in a room.

        Returns a dict with:
          trv_temps         – list of current_temperature values (floats)
          trv_avg_temp      – average or None if none available
          trv_humidity      – average humidity attribute or None
          trv_valve_positions – list of valve_position / position values (0-100)
          trv_avg_valve     – average valve opening % or None
          trv_any_heating   – True if any TRV hvac_action == "heating"
          trv_hvac_actions  – list of hvac_action strings
        """
        entities: list[str] = list(room.get(CONF_VALVE_ENTITIES) or [])
        single = room.get(CONF_VALVE_ENTITY, "")
        if single and single not in entities:
            entities.insert(0, single)

        temps: list[float] = []
        humidities: list[float] = []
        valve_positions: list[float] = []
        hvac_actions: list[str] = []

        for eid in entities:
            state = self.hass.states.get(eid)
            if state is None or state.state in (STATE_UNAVAILABLE, STATE_UNKNOWN):
                continue
            attrs = state.attributes

            t = attrs.get("current_temperature")
            if t is not None:
                try:
                    temps.append(float(t))
                except (ValueError, TypeError):
                    pass

            h = attrs.get("humidity") or attrs.get("current_humidity")
            if h is not None:
                try:
                    humidities.append(float(h))
                except (ValueError, TypeError):
                    pass

            # Valve position: different TRVs use different attribute names
            vp = attrs.get("valve_position") or attrs.get("position") or attrs.get("pi_heating_demand")
            if vp is not None:
                try:
                    valve_positions.append(float(vp))
                except (ValueError, TypeError):
                    pass

            action = attrs.get("hvac_action", "")
            if action:
                hvac_actions.append(str(action))

        batteries: list[float] = []
        for eid in entities:
            state = self.hass.states.get(eid)
            if state is None or state.state in (STATE_UNAVAILABLE, STATE_UNKNOWN):
                continue
            attrs = state.attributes
            bat = attrs.get("battery") or attrs.get("battery_level")
            if bat is not None:
                try:
                    batteries.append(float(bat))
                except (ValueError, TypeError):
                    pass

        trv_min_battery = round(min(batteries)) if batteries else None
        trv_low_battery = any(b < 20 for b in batteries)

        return {
            "trv_temps": temps,
            "trv_avg_temp": round(sum(temps) / len(temps), 1) if temps else None,
            "trv_humidity": round(sum(humidities) / len(humidities), 1) if humidities else None,
            "trv_valve_positions": valve_positions,
            "trv_avg_valve": round(sum(valve_positions) / len(valve_positions), 1) if valve_positions else None,
            "trv_any_heating": any(a == "heating" for a in hvac_actions),
            "trv_hvac_actions": hvac_actions,
            "trv_min_battery": trv_min_battery,
            "trv_low_battery": trv_low_battery,
        }

    def _blend_trv_temp(
        self,
        room: dict,
        room_temp: Optional[float],
        trv_data: dict,
        trv_mode: bool = False,
    ) -> tuple[Optional[float], Optional[float], Optional[float]]:
        """Return (display_temp, demand_temp, raw_trv_temp) for a room.

        Two temperatures with distinct roles:

        display_temp  – "Ist-Temperatur" for UI, frost-protection, mold, window logic.
                        → Always the room sensor if available; TRV temp only as
                          last-resort fallback when no room sensor is configured.

        demand_temp   – temperature fed into the demand calculation.
                        → TRV temp available (any mode, no explicit weight):
                            Use TRV temp directly. The TRV sensor at the radiator
                            reacts immediately. If TRV reports 21°C while target is
                            19°C the demand is correctly 0 % — even if the wall
                            sensor still shows 18°C. Prevents phantom demand.
                        → Explicit trv_temp_weight > 0: user-configured blend.
                        → No TRV data: same as display_temp (room sensor fallback).

        raw_trv_temp  – unmodified average TRV temperature for diagnostics.

        The trv_mode parameter is kept for potential future differentiation but
        demand_temp now uses TRV temp whenever available, regardless of mode.
        """
        trv_avg = trv_data.get("trv_avg_temp")
        weight = float(room.get(CONF_TRV_TEMP_WEIGHT, DEFAULT_TRV_TEMP_WEIGHT))
        offset = float(room.get(CONF_TRV_TEMP_OFFSET, DEFAULT_TRV_TEMP_OFFSET))

        corrected_trv = round(trv_avg + offset, 1) if trv_avg is not None else None

        # --- display_temp: room sensor first, TRV only when no room sensor ----
        display_temp = room_temp if room_temp is not None else corrected_trv

        # --- demand_temp: TRV temp whenever available (any controller mode) ---
        if trv_avg is None:
            # No TRV temperature data → demand same as display
            demand_temp = display_temp
        elif weight > 0.0:
            # Explicit user-configured blend overrides the auto behaviour
            if room_temp is not None:
                demand_temp = round(room_temp * (1.0 - weight) + corrected_trv * weight, 1)
            else:
                demand_temp = corrected_trv
        else:
            # TRV temp available, no explicit blend → use TRV directly.
            # This catches the "TRV already at target, room sensor still cold" case
            # and prevents the system from reporting phantom 100 % demand.
            demand_temp = corrected_trv

        return display_temp, demand_temp, trv_avg

    def _apply_trv_valve_demand(self, demand: float, trv_data: dict, trv_mode: bool = False) -> float:
        """Correct demand based on TRV valve position.

        In TRV controller mode (auto-applied when valve data is available):
          The valve position IS the most accurate demand signal – it reflects what
          the TRV's own thermostat decided, reacts instantly, and is not affected by
          sensor lag or room stratification.
          Blending: 40 % temp-based (target context) + 60 % valve-based (actual demand).

        In switch mode (opt-in via CONF_TRV_VALVE_DEMAND):
          Conservative correction – only clamps extreme outliers.
          - Valve > 85 %: TRV fully open → raise demand floor to 30
          - Valve < 8 %: TRV nearly closed → cap demand at 30
          - In between: 70 % temp-based + 30 % valve-based
        """
        avg_valve = trv_data.get("trv_avg_valve")
        if avg_valve is None:
            return demand

        valve_demand = avg_valve  # valve position maps directly to demand 0-100

        if trv_mode:
            # Valve is dominant: fast-reacting, physically accurate
            blended = demand * 0.40 + valve_demand * 0.60
            return round(max(0.0, min(100.0, blended)), 1)

        # Switch mode: conservative
        if avg_valve > 85:
            return max(demand, 30.0)
        if avg_valve < 8:
            return min(demand, 30.0)
        blended = demand * 0.70 + valve_demand * 0.30
        return round(max(0.0, min(100.0, blended)), 1)

    def _set_valve_entity(
        self,
        valve_entity: str,
        target_temp: float,
        force: bool = False,
        min_send_interval: int = 0,
    ) -> None:
        """Set setpoint on a single TRV / climate entity.

        Battery-save strategy (applies when force=False):
          1. Temperature hysteresis: skip if change < TRV_TEMP_HYSTERESIS (0.3 °C).
          2. Time throttle: if min_send_interval > 0, skip medium changes (< TRV_LARGE_CHANGE_THRESHOLD)
             that arrive faster than the configured interval.
             Large changes (>= TRV_LARGE_CHANGE_THRESHOLD, e.g. mode switch) always send immediately.
        """
        if not valve_entity:
            return
        state = self.hass.states.get(valve_entity)
        if state is None:
            return
        if valve_entity.split(".")[0] == "climate":
            # Quantise to TRV resolution (0.5 °C) to reduce unnecessary radio traffic.
            # e.g. 21.1 → 21.0, 21.3 → 21.5, 21.7 → 21.5
            target_temp = round(target_temp / TRV_SETPOINT_STEP) * TRV_SETPOINT_STEP
            last = self._last_sent_temps.get(valve_entity)
            now  = time.monotonic()

            if not force and last is not None:
                delta = abs(target_temp - last)

                # 1. Hysteresis: change too small → skip always
                if delta < TRV_TEMP_HYSTERESIS:
                    return

                # 2. Time throttle: medium change → skip if too soon
                if min_send_interval > 0 and delta < TRV_LARGE_CHANGE_THRESHOLD:
                    last_time = self._last_sent_times.get(valve_entity)
                    if last_time is not None and (now - last_time) < min_send_interval:
                        return  # throttled – battery save

            self._last_sent_temps[valve_entity] = target_temp
            self._last_sent_times[valve_entity] = now
            # Record command timestamp so manual-override detector skips grace period
            self._trv_command_sent_at[valve_entity] = now
            self.hass.async_create_task(
                self.hass.services.async_call(
                    "climate",
                    "set_temperature",
                    {"entity_id": valve_entity, "temperature": target_temp},
                )
            )

    def _turn_off_valve_entity(self, valve_entity: str) -> None:
        """Turn off a TRV climate entity (hvac_mode=off), or set frost temp as fallback."""
        if not valve_entity:
            return
        state = self.hass.states.get(valve_entity)
        if state is None:
            return
        if valve_entity.split(".")[0] == "climate":
            hvac_modes = state.attributes.get("hvac_modes", [])
            # Prefer setting hvac_mode to off (saves battery, no hunting)
            if "off" in hvac_modes:
                self._last_sent_temps.pop(valve_entity, None)  # force update when turning back on
                self._trv_command_sent_at[valve_entity] = time.monotonic()
                self.hass.async_create_task(
                    self.hass.services.async_call(
                        "climate",
                        "set_hvac_mode",
                        {"entity_id": valve_entity, "hvac_mode": "off"},
                    )
                )
            else:
                # Fallback: set to frost protection temperature
                frost_temp = self._get_frost_protection_temp()
                self._set_valve_entity(valve_entity, frost_temp, force=True)

    def _turn_on_valve_entity(self, valve_entity: str) -> None:
        """Ensure TRV is in heat mode (turn on if it was set to off)."""
        if not valve_entity:
            return
        state = self.hass.states.get(valve_entity)
        if state is None:
            return
        if valve_entity.split(".")[0] == "climate":
            current_hvac = state.state  # "off", "heat", "auto", etc.
            if current_hvac == "off":
                hvac_modes = state.attributes.get("hvac_modes", [])
                preferred = "heat" if "heat" in hvac_modes else ("auto" if "auto" in hvac_modes else None)
                if preferred:
                    self.hass.async_create_task(
                        self.hass.services.async_call(
                            "climate",
                            "set_hvac_mode",
                            {"entity_id": valve_entity, "hvac_mode": preferred},
                        )
                    )

    def _set_valve_entities(self, room: dict, target_temp: float, force: bool = False) -> None:
        """Set setpoint on all TRV / climate entities configured for a room."""
        min_interval = int(room.get(CONF_TRV_MIN_SEND_INTERVAL, DEFAULT_TRV_MIN_SEND_INTERVAL))
        # New: list of valve entities
        for entity in room.get(CONF_VALVE_ENTITIES, []):
            if entity:
                # Ensure TRV is in heat mode before setting temperature
                self._turn_on_valve_entity(entity)
                self._set_valve_entity(entity, target_temp, force=force, min_send_interval=min_interval)
        # Legacy: single valve entity
        single = room.get(CONF_VALVE_ENTITY)
        if single and single not in room.get(CONF_VALVE_ENTITIES, []):
            self._turn_on_valve_entity(single)
            self._set_valve_entity(single, target_temp, force=force, min_send_interval=min_interval)

    def _turn_off_valve_entities(self, room: dict) -> None:
        """Turn off all TRV entities for a room (window open / room off)."""
        for entity in room.get(CONF_VALVE_ENTITIES, []):
            if entity:
                self._turn_off_valve_entity(entity)
        single = room.get(CONF_VALVE_ENTITY)
        if single and single not in room.get(CONF_VALVE_ENTITIES, []):
            self._turn_off_valve_entity(single)

    def _prefill_last_sent_temps(self) -> None:
        """Pre-populate _last_sent_temps with TRVs' current target temperatures.

        Called once on startup before the first update cycle so the manual-override
        detector has a valid baseline and does not fire false positives immediately
        after HA restarts (the TRVs still hold their last setpoint, not necessarily
        what IHC would calculate now).
        """
        for room in self.get_rooms():
            valve_entities = list(room.get(CONF_VALVE_ENTITIES, []))
            single = room.get(CONF_VALVE_ENTITY)
            if single and single not in valve_entities:
                valve_entities.append(single)
            for entity_id in valve_entities:
                if not entity_id:
                    continue
                if entity_id in self._last_sent_temps:
                    continue  # already known (e.g. from previous cycle)
                state = self.hass.states.get(entity_id)
                if state is None:
                    continue
                trv_target = state.attributes.get("temperature")
                if trv_target is not None:
                    self._last_sent_temps[entity_id] = float(trv_target)
                    _LOGGER.debug(
                        "IHC: Startup – pre-filled baseline for %s = %.1f °C", entity_id, float(trv_target)
                    )

    def _detect_manual_trv_override(self, room: dict, room_id: str, room_mode: str) -> None:
        """Detect if a TRV was manually adjusted and switch room to manual mode.

        Compares the TRV's reported target_temperature against the last value IHC set.
        If they differ by more than TRV_TEMP_HYSTERESIS, a manual override is assumed.
        """
        valve_entities = list(room.get(CONF_VALVE_ENTITIES, []))
        single = room.get(CONF_VALVE_ENTITY)
        if single and single not in valve_entities:
            valve_entities.append(single)

        if not valve_entities:
            return

        now = time.monotonic()
        for entity_id in valve_entities:
            if not entity_id:
                continue
            state = self.hass.states.get(entity_id)
            if state is None:
                continue
            trv_target = state.attributes.get("temperature")
            if trv_target is None:
                continue
            trv_target = float(trv_target)
            last_ihc = self._last_sent_temps.get(entity_id)
            if last_ihc is None:
                # First cycle – record current TRV temp as baseline
                self._last_ihc_set_temps[room_id] = trv_target
                continue
            # Grace period: IHC just sent a command – TRV may not have reported new state yet.
            # Skip detection until TRV has had time to update its reported setpoint.
            sent_at = self._trv_command_sent_at.get(entity_id)
            if sent_at is not None and (now - sent_at) < self._trv_command_grace:
                continue
            # If TRV temperature differs significantly from what IHC last sent, user adjusted it
            if abs(trv_target - last_ihc) >= 0.5:
                room_name = room.get(CONF_ROOM_NAME, room_id)
                _LOGGER.info(
                    "IHC: Manual TRV override detected in %s – TRV set to %.1f°C (IHC had %.1f°C). "
                    "Switching to manual mode.",
                    room_name, trv_target, last_ihc,
                )
                # Switch room to manual mode and record the manually set temperature
                self.set_room_mode(room_id, ROOM_MODE_MANUAL)
                self.set_room_manual_temp(room_id, trv_target)
                # Update last sent temp to avoid re-triggering
                self._last_sent_temps[entity_id] = trv_target
                # Get next schedule time for notification message
                next_period = self.get_next_schedule_period(room_id)
                next_str = ""
                if next_period:
                    try:
                        next_str = f" bis {next_period.get('start', '')} Uhr"
                    except Exception as exc:
                        _LOGGER.debug("IHC: Could not format next period for notification: %s", exc)
                # Send HA notification
                self.hass.async_create_task(
                    self.hass.services.async_call(
                        "persistent_notification",
                        "create",
                        {
                            "title": f"IHC: Manueller Eingriff – {room_name}",
                            "message": (
                                f"**{room_name}** wurde manuell am Gerät auf "
                                f"**{trv_target:.1f} °C** gestellt "
                                f"und bleibt bis zur nächsten Schaltzeit{next_str} im Modus **Manuell**.\n\n"
                                "Der Modus wird beim nächsten Zeitplan-Event automatisch zurückgesetzt."
                            ),
                            "notification_id": f"ihc_manual_override_{room_id}",
                        },
                    )
                )
                break  # Only trigger once per update cycle per room
