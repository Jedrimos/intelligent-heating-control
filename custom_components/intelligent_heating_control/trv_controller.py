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
    CONF_TRV_CALIBRATIONS,
    CONF_STUCK_VALVE_TIMEOUT,
    DEFAULT_STUCK_VALVE_TIMEOUT,
    CONF_LIMESCALE_PROTECTION_ENABLED,
    DEFAULT_LIMESCALE_PROTECTION_ENABLED,
    CONF_LIMESCALE_INTERVAL_DAYS,
    DEFAULT_LIMESCALE_INTERVAL_DAYS,
    CONF_LIMESCALE_TIME,
    DEFAULT_LIMESCALE_TIME,
    CONF_LIMESCALE_DURATION_MINUTES,
    DEFAULT_LIMESCALE_DURATION_MINUTES,
    CONF_AGGRESSIVE_MODE_ENABLED,
    DEFAULT_AGGRESSIVE_MODE_ENABLED,
    CONF_AGGRESSIVE_MODE_RANGE,
    DEFAULT_AGGRESSIVE_MODE_RANGE,
    CONF_AGGRESSIVE_MODE_OFFSET,
    DEFAULT_AGGRESSIVE_MODE_OFFSET,
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

        calibrations: dict = room.get(CONF_TRV_CALIBRATIONS) or {}

        for eid in entities:
            state = self.hass.states.get(eid)
            if state is None or state.state in (STATE_UNAVAILABLE, STATE_UNKNOWN):
                continue
            attrs = state.attributes

            t = attrs.get("current_temperature")
            if t is not None:
                try:
                    per_trv_cal = float(calibrations.get(eid, 0.0))
                    temps.append(float(t) + per_trv_cal)
                except (ValueError, TypeError):
                    pass

            # Use "is not None" checks to avoid falsy-0 fallthrough (humidity=0 is valid)
            _h = attrs.get("humidity")
            h = _h if _h is not None else attrs.get("current_humidity")
            if h is not None:
                try:
                    humidities.append(float(h))
                except (ValueError, TypeError):
                    pass

            # Valve position: different TRVs use different attribute names.
            # Must use explicit None checks – valve=0 (fully closed) is valid and falsy.
            _vp = attrs.get("valve_position")
            if _vp is None:
                _vp = attrs.get("position")
            if _vp is None:
                _vp = attrs.get("pi_heating_demand")
            vp = _vp
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
            # Explicit None check: battery=0% is falsy but valid data
            _bat = attrs.get("battery")
            bat = _bat if _bat is not None else attrs.get("battery_level")
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
            self._trv_command_sent_at[valve_entity] = now
            # Mark as pending: suppress override detection until TRV confirms this setpoint
            self._trv_cmd_pending[valve_entity] = target_temp
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

    def _boost_valve_entity(self, valve_entity: str) -> bool:
        """Activate HA native boost preset on a single TRV climate entity.

        Returns True if the boost preset was sent successfully (TRV supports it),
        False if the TRV does not expose a 'boost' preset_mode.
        """
        if not valve_entity or not valve_entity.startswith("climate."):
            return False
        state = self.hass.states.get(valve_entity)
        if state is None:
            return False
        if "boost" not in (state.attributes.get("preset_modes") or []):
            return False
        self._trv_command_sent_at[valve_entity] = time.monotonic()
        self.hass.async_create_task(
            self.hass.services.async_call(
                "climate",
                "set_preset_mode",
                {"entity_id": valve_entity, "preset_mode": "boost"},
            )
        )
        return True

    def _boost_valve_entities(self, room: dict) -> bool:
        """Try to activate native boost preset on all TRV entities in a room.

        Returns True if ALL configured TRV entities received the boost preset
        (i.e. every TRV supports it).  Returns False if any TRV does not support
        boost – in that case the caller should fall back to sending a temperature.
        """
        entities = list(room.get(CONF_VALVE_ENTITIES, []))
        single = room.get(CONF_VALVE_ENTITY)
        if single and single not in entities:
            entities.insert(0, single)
        entities = [e for e in entities if e]
        if not entities:
            return False
        return all(self._boost_valve_entity(e) for e in entities)

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
                self._trv_unavailable_entities.add(entity_id)
                continue
            # Track unavailable/unknown transitions
            is_unavailable = state.state in ("unavailable", "unknown")
            was_unavailable = entity_id in self._trv_unavailable_entities
            if is_unavailable:
                self._trv_unavailable_entities.add(entity_id)
                continue
            if was_unavailable:
                # TRV just reconnected – reset baseline to avoid false override detection.
                # The TRV may have lost its setpoint during power loss/reconnect.
                self._trv_unavailable_entities.discard(entity_id)
                self._trv_cmd_pending.pop(entity_id, None)  # discard any stale pending command
                trv_target_now = state.attributes.get("temperature")
                if trv_target_now is not None:
                    self._last_sent_temps[entity_id] = float(trv_target_now)
                _LOGGER.debug(
                    "IHC: %s reconnected – baseline reset, override detection skipped this cycle.",
                    entity_id,
                )
                continue
            trv_target = state.attributes.get("temperature")
            if trv_target is None:
                continue
            trv_target = float(trv_target)
            last_ihc = self._last_sent_temps.get(entity_id)
            if last_ihc is None:
                # First cycle – record current TRV temp as baseline, no detection yet
                self._last_ihc_set_temps[room_id] = trv_target
                continue

            # Confirmation-based pending check (replaces time-based grace):
            # After IHC sends a new setpoint, we wait until the TRV *reports back* that value
            # before re-enabling override detection.  This correctly handles slow TRVs (e.g.
            # Homematic duty cycle, Z-Wave wake-up intervals) that may take many minutes to
            # reflect a new setpoint – a window far beyond the old 3-minute fixed grace.
            pending = self._trv_cmd_pending.get(entity_id)
            if pending is not None:
                # Use TRV_SETPOINT_STEP (0.5 °C) as confirmation window, not TRV_TEMP_HYSTERESIS.
                # Reason: TRVs always quantise their reported temperature to their own resolution
                # (typically 0.5 °C, some older models 1.0 °C).  If IHC sends 19.5 °C and the
                # TRV rounds to 20.0 °C the 0.3 °C hysteresis would never match, causing the
                # command to sit in "pending" forever until the 600 s timeout.  After the timeout
                # the baseline is reset to the TRV value, and on the very next cycle the
                # calculated setpoint is 0.5–1.0 °C below the TRV's rounded-up value – which is
                # exactly the 1.0 °C threshold that triggers a false "Manuell" override.
                # Using TRV_SETPOINT_STEP (0.5 °C) as the confirmation window handles both
                # 0.5 °C-step and 1.0 °C-step TRVs without false positives.
                if abs(trv_target - pending) <= TRV_SETPOINT_STEP:
                    # TRV confirmed our command (within its resolution) → detection resumes next cycle
                    del self._trv_cmd_pending[entity_id]
                    self._last_sent_temps[entity_id] = trv_target  # sync baseline to confirmed value
                else:
                    # TRV hasn't confirmed yet.  Check for stale pending (connectivity issue):
                    # if the TRV never reports back within _trv_confirm_timeout, give up waiting
                    # and reset the baseline so we don't permanently suppress detection.
                    sent_at = self._trv_command_sent_at.get(entity_id)
                    if sent_at is not None and (now - sent_at) > self._trv_confirm_timeout:
                        _LOGGER.debug(
                            "IHC: %s – pending setpoint %.1f°C unconfirmed after %ds, "
                            "resetting baseline to TRV value %.1f°C.",
                            entity_id, pending, self._trv_confirm_timeout, trv_target,
                        )
                        del self._trv_cmd_pending[entity_id]
                        self._last_sent_temps[entity_id] = trv_target
                    # Either way: skip override detection while a pending command exists
                    continue

            # If TRV temperature differs significantly from what IHC last sent, user adjusted it.
            # Threshold is 1.0 °C (= TRV_LARGE_CHANGE_THRESHOLD) to avoid false positives from:
            #   - TRV rounding differences (quantisation to 0.5 °C steps)
            #   - Single button press on TRV (usually ±0.5 °C per press)
            # Only a clear intentional adjustment (≥ 1 °C) triggers manual mode.
            if abs(trv_target - last_ihc) >= TRV_LARGE_CHANGE_THRESHOLD:
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

    # ------------------------------------------------------------------
    # Stuck-Valve-Erkennung
    # ------------------------------------------------------------------

    def _detect_stuck_valves(self, room: dict, room_id: str, demand: float) -> list[str]:
        """Detect TRV valves that appear stuck (calcified / mechanically jammed).

        A valve is considered stuck when:
          1. IHC is requesting heat for this room (demand > 0).
          2. IHC sent a setpoint to this TRV more than GRACE_PERIOD ago.
          3. The valve position is below STUCK_THRESHOLD (5%) despite the above.
          4. This condition has persisted for at least STUCK_TIMEOUT seconds.

        Returns a list of entity_ids that are currently stuck.
        """
        entities: list[str] = list(room.get(CONF_VALVE_ENTITIES) or [])
        single = room.get(CONF_VALVE_ENTITY, "")
        if single and single not in entities:
            entities.insert(0, single)
        if not entities:
            return []

        cfg = self.get_config()
        stuck_timeout = int(cfg.get(CONF_STUCK_VALVE_TIMEOUT, DEFAULT_STUCK_VALVE_TIMEOUT))
        stuck_entities: list[str] = []
        now = time.monotonic()

        for eid in entities:
            state = self.hass.states.get(eid)
            if state is None or state.state in (STATE_UNAVAILABLE, STATE_UNKNOWN):
                # Unavailable → clear any stuck tracking
                self._trv_stuck_since.pop(eid, None)
                continue
            attrs = state.attributes
            # Explicit None checks: valve=0 (fully closed) is valid but falsy
            _vp = attrs.get("valve_position")
            if _vp is None:
                _vp = attrs.get("position")
            if _vp is None:
                _vp = attrs.get("pi_heating_demand")
            vp = _vp
            if vp is None:
                # TRV does not report valve position → cannot detect stuck
                self._trv_stuck_since.pop(eid, None)
                continue
            try:
                valve_pos = float(vp)
            except (ValueError, TypeError):
                self._trv_stuck_since.pop(eid, None)
                continue

            # Only suspect stuck if:
            # – room has active demand (IHC wants heat)
            # – IHC had sent a command to this TRV (it knows the setpoint)
            # – command was not just sent (grace period elapsed)
            # – valve is essentially closed
            last_sent = self._last_sent_temps.get(eid)
            sent_at = self._trv_command_sent_at.get(eid)
            grace_elapsed = (sent_at is None) or ((now - sent_at) > self._trv_command_grace)

            if demand > 0 and last_sent is not None and grace_elapsed and valve_pos < 5.0:
                # Stuck condition active – track since when
                if eid not in self._trv_stuck_since:
                    self._trv_stuck_since[eid] = now
                elif (now - self._trv_stuck_since[eid]) >= stuck_timeout:
                    stuck_entities.append(eid)
            else:
                # Condition cleared – reset tracker
                self._trv_stuck_since.pop(eid, None)

        return stuck_entities

    # ------------------------------------------------------------------
    # Kalkschutz (Limescale Protection)
    # ------------------------------------------------------------------

    def _run_limescale_protection(self, room_data: dict) -> None:
        """Periodically exercise all TRV valves to prevent limescale calcification.

        When enabled, sends the maximum temperature (fully opens valve) to each
        TRV once per interval (default: every 14 days). After the exercise
        duration (default: 5 min), normal operation resumes automatically.

        Exercise only starts when:
        – Feature is enabled globally.
        – Current time is within the configured exercise window (±15 min).
        – No room is currently demanding heat (to avoid interrupting heating).
        – The TRV entity is reachable.
        """
        from datetime import date, datetime as dt

        cfg = self.get_config()
        if not cfg.get(CONF_LIMESCALE_PROTECTION_ENABLED, DEFAULT_LIMESCALE_PROTECTION_ENABLED):
            return

        interval_days = int(cfg.get(CONF_LIMESCALE_INTERVAL_DAYS, DEFAULT_LIMESCALE_INTERVAL_DAYS))
        exercise_time_str = cfg.get(CONF_LIMESCALE_TIME, DEFAULT_LIMESCALE_TIME)
        exercise_duration_s = int(cfg.get(CONF_LIMESCALE_DURATION_MINUTES, DEFAULT_LIMESCALE_DURATION_MINUTES)) * 60

        now_dt = dt.now()
        today = now_dt.date()
        now_mono = time.monotonic()

        # Parse exercise time window
        try:
            hour, minute = (int(x) for x in exercise_time_str.split(":"))
        except (ValueError, AttributeError):
            hour, minute = 10, 0

        window_start = now_dt.replace(hour=hour, minute=minute, second=0, microsecond=0)
        window_end = now_dt.replace(hour=hour, minute=minute + 15 if minute <= 44 else 59, second=59, microsecond=0)
        in_window = window_start <= now_dt <= window_end

        # Any room demanding heat right now? Skip to avoid cold rooms.
        any_demand = any(
            rdata.get("demand", 0) > 0
            for rdata in room_data.values()
        )

        for room in self.get_rooms():
            entities: list[str] = list(room.get(CONF_VALVE_ENTITIES) or [])
            single = room.get(CONF_VALVE_ENTITY, "")
            if single and single not in entities:
                entities.insert(0, single)
            for eid in entities:
                if not eid:
                    continue
                state = self.hass.states.get(eid)
                if state is None or state.state in (STATE_UNAVAILABLE, STATE_UNKNOWN):
                    continue

                # Check if exercise is in progress for this entity
                started_at = self._limescale_in_progress.get(eid)
                if started_at is not None:
                    if (now_mono - started_at) >= exercise_duration_s:
                        # Exercise done – remove from in-progress (normal control resumes)
                        del self._limescale_in_progress[eid]
                        self._last_sent_temps.pop(eid, None)  # force fresh setpoint next cycle
                        _LOGGER.info("IHC: Kalkschutz abgeschlossen für %s", eid)
                    # Still in progress – keep max_temp (set again to be safe)
                    else:
                        max_temp = float(state.attributes.get("max_temp", 30.0))
                        self.hass.async_create_task(
                            self.hass.services.async_call(
                                "climate", "set_temperature",
                                {"entity_id": eid, "temperature": max_temp},
                            )
                        )
                    continue

                # Not in progress – check if due
                last_exercise = self._limescale_last_exercise.get(eid)
                days_since = (today - last_exercise).days if last_exercise else interval_days + 1

                if days_since >= interval_days and in_window and not any_demand:
                    max_temp = float(state.attributes.get("max_temp", 30.0))
                    _LOGGER.info(
                        "IHC: Kalkschutz gestartet für %s (letzter: %s, max=%.1f°C)",
                        eid, last_exercise, max_temp,
                    )
                    self._limescale_in_progress[eid] = now_mono
                    self._limescale_last_exercise[eid] = today
                    self.hass.async_create_task(
                        self.hass.services.async_call(
                            "climate", "set_temperature",
                            {"entity_id": eid, "temperature": max_temp},
                        )
                    )
