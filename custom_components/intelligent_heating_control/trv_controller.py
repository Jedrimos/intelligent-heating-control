"""TRV (Thermostatic Radiator Valve) controller mixin for IHC Coordinator."""
from __future__ import annotations

import logging
import math
import time
from typing import Optional

from homeassistant.const import STATE_UNAVAILABLE, STATE_UNKNOWN
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers import device_registry as dr

from .trv_capabilities import classify_sibling, external_option, external_temp_value, quirks_for
from homeassistant.util import dt as dt_util

from .const import (
    CONF_TRV_EXTERNAL_SENSOR_SYNC,
    DEFAULT_TRV_EXTERNAL_SENSOR_SYNC,
    EXTERNAL_SYNC_RESEND_S,
    CONF_ROOM_ID,
    CONF_ROOM_NAME,
    CONF_VALVE_ENTITY,
    CONF_VALVE_ENTITIES,
    CONF_TRV_TEMP_WEIGHT,
    DEFAULT_TRV_TEMP_WEIGHT,
    CONF_TRV_TEMP_OFFSET,
    DEFAULT_TRV_TEMP_OFFSET,
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
    ROOM_MODE_MANUAL,
)

_LOGGER = logging.getLogger(__name__)

# TRV battery-save constants (same values as coordinator.py)
TRV_TEMP_HYSTERESIS = 0.3       # °C – only send update if setpoint changes by at least this much
TRV_LARGE_CHANGE_THRESHOLD = 1.0  # °C – above this, always send immediately (mode change etc.)
TRV_SETPOINT_STEP = 0.5         # °C – quantise setpoint to TRV resolution (most TRVs: 0.5 °C)

# Heating inference for TRVs that report neither hvac_action nor a valve position (e.g. Matter
# thermostats): a TRV only opens its valve while its own (radiator-side) temperature is below its
# setpoint, so "setpoint - own temperature >= gap" means the valve is open and the radiator heats.
TRV_HEATING_INFER_GAP_C = 0.5

# TRV offset calibration assistant (see _update_trv_offset_calibration /
# get_suggested_trv_offset): rolling sample cap and the minimum sample count
# before a suggestion is considered reliable enough to show.
TRV_OFFSET_CALIBRATION_MAX_SAMPLES = 100
TRV_OFFSET_CALIBRATION_MIN_SAMPLES = 20


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
        inferred_heating = False

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
            if h is None:
                h = self._get_trv_sibling_humidity(eid)
            if h is not None:
                try:
                    humidities.append(float(h))
                except (ValueError, TypeError):
                    pass

            # Valve position: different TRVs use different attribute names.
            # Must use explicit None checks – valve=0 (fully closed) is valid and falsy.
            vp = self._read_valve_position(eid, attrs)
            if vp is not None:
                try:
                    valve_positions.append(float(vp))
                except (ValueError, TypeError):
                    pass

            action = attrs.get("hvac_action", "")
            if action:
                hvac_actions.append(str(action))
            elif vp is None and state.state != "off":
                # No hvac_action and no valve position: infer from setpoint vs. own temperature
                _sp = attrs.get("temperature")
                if _sp is not None and t is not None:
                    try:
                        if float(_sp) - float(t) >= TRV_HEATING_INFER_GAP_C:
                            inferred_heating = True
                    except (ValueError, TypeError):
                        pass

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
            "trv_any_heating": any(a == "heating" for a in hvac_actions) or inferred_heating,
            "trv_heating_inferred": inferred_heating,
            "trv_hvac_actions": hvac_actions,
            "trv_min_battery": trv_min_battery,
            "trv_low_battery": trv_low_battery,
        }

    def _read_valve_position(self, climate_entity_id: str, attrs) -> Optional[float]:
        """Valve opening % of a TRV: climate attribute (valve_position / position /
        pi_heating_demand) or - v2.6 - the device's separate valve sensor, which is how
        current Zigbee2MQTT/ZHA/Shelly/Homematic setups expose it. None = not available."""
        vp = attrs.get("valve_position")
        if vp is None:
            vp = attrs.get("position")
        if vp is None:
            vp = attrs.get("pi_heating_demand")
        if vp is None:
            valve_eid = self._get_trv_capabilities(climate_entity_id).get("valve_entity")
            vst = self.hass.states.get(valve_eid) if valve_eid else None
            if vst is not None and vst.state not in (STATE_UNAVAILABLE, STATE_UNKNOWN):
                vp = vst.state
        return vp

    _CAPS_TTL_S = 600.0

    def _get_trv_capabilities(self, climate_entity_id: str) -> dict:
        """v2.6 – what this thermostat's device offers (see trv_capabilities.py), cached
        for 10 min. Works for unknown models: it inspects the device's own entities."""
        if not hasattr(self, "_trv_caps_cache"):
            self._trv_caps_cache = {}
        now = time.monotonic()
        cached = self._trv_caps_cache.get(climate_entity_id)
        if cached is not None and now - cached[1] < self._CAPS_TTL_S:
            return cached[0]
        caps: dict = {"entity": climate_entity_id, "manufacturer": None, "model": None,
                      "valve_entity": None, "external_temp_entity": None, "sensor_select_entity": None,
                      "sensor_select_option": None, "calibration_entity": None, "quirks": []}
        try:
            reg = er.async_get(self.hass)
            entry = reg.async_get(climate_entity_id)
            if entry is not None and entry.device_id:
                device = dr.async_get(self.hass).async_get(entry.device_id)
                if device is not None:
                    caps["manufacturer"], caps["model"] = device.manufacturer, device.model
                for sib in er.async_entries_for_device(reg, entry.device_id):
                    if sib.entity_id == climate_entity_id or sib.disabled_by:
                        continue
                    st = self.hass.states.get(sib.entity_id)
                    attrs = st.attributes if st else {}
                    role = classify_sibling(
                        sib.entity_id, sib.translation_key, sib.original_name,
                        unit=attrs.get("unit_of_measurement") or sib.unit_of_measurement,
                        options=attrs.get("options"),
                    )
                    if role == "valve" and not caps["valve_entity"]:
                        caps["valve_entity"] = sib.entity_id
                    elif role == "external_temp" and not caps["external_temp_entity"]:
                        caps["external_temp_entity"] = sib.entity_id
                    elif role == "sensor_select" and not caps["sensor_select_entity"]:
                        caps["sensor_select_entity"] = sib.entity_id
                        caps["sensor_select_option"] = external_option(attrs.get("options"))
                    elif role == "calibration" and not caps["calibration_entity"]:
                        caps["calibration_entity"] = sib.entity_id
        except Exception:  # noqa: BLE001 - registry lookup must never break the update cycle
            _LOGGER.debug("IHC: capability detection failed for %s", climate_entity_id, exc_info=True)
        caps["quirks"] = [
            {k: v for k, v in q.items() if k != "match"} for q in quirks_for(caps["manufacturer"], caps["model"])
        ]
        self._trv_caps_cache[climate_entity_id] = (caps, now)
        return caps

    def _room_valve_entities(self, room: dict) -> list:
        entities = [e for e in (room.get(CONF_VALVE_ENTITIES) or []) if e]
        single = room.get(CONF_VALVE_ENTITY)
        if single and single not in entities:
            entities.insert(0, single)
        return entities

    def _room_trv_capabilities(self, room: dict) -> list:
        """Per-TRV capability summary for the panel ("IHC hat erkannt: …")."""
        out = []
        for eid in self._room_valve_entities(room):
            if not eid.startswith("climate."):
                continue
            caps = self._get_trv_capabilities(eid)
            st = self.hass.states.get(eid)
            attrs = st.attributes if st else {}
            out.append({
                "entity": eid,
                "manufacturer": caps.get("manufacturer"),
                "model": caps.get("model"),
                "valve_source": ("attribute" if any(attrs.get(k) is not None for k in ("valve_position", "position", "pi_heating_demand"))
                                 else ("sensor" if caps.get("valve_entity") else None)),
                "valve_entity": caps.get("valve_entity"),
                "external_sensor": bool(caps.get("external_temp_entity")),
                "calibration": bool(caps.get("calibration_entity")),
                "step": attrs.get("target_temp_step"),
                "supports_off": "off" in (attrs.get("hvac_modes") or []),
                "supports_boost": "boost" in (attrs.get("preset_modes") or []),
                "quirks": [q.get("note") for q in caps.get("quirks", []) if q.get("note")],
            })
        return out

    def _sync_external_sensor(self, room: dict, room_temp: Optional[float]) -> None:
        """v2.6 – "Raumfühler ins Thermostat": push the real room temperature into every TRV
        of the room that has an external-temperature input, and switch the TRV to that
        sensor where it needs a select (Sonoff/Aqara). Re-sent on change (≥0.1 °C) and at
        least every EXTERNAL_SYNC_RESEND_S (Bosch/Danfoss fall back to the internal sensor
        if no value arrives for 30 min). Opt-in per room."""
        if room_temp is None or not room.get(CONF_TRV_EXTERNAL_SENSOR_SYNC, DEFAULT_TRV_EXTERNAL_SENSOR_SYNC):
            return
        if not hasattr(self, "_ext_sync_last"):
            self._ext_sync_last = {}
        now = time.monotonic()
        for eid in self._room_valve_entities(room):
            caps = self._get_trv_capabilities(eid)
            target = caps.get("external_temp_entity")
            if not target:
                continue
            sel = caps.get("sensor_select_entity")
            opt = caps.get("sensor_select_option")
            if sel and opt:
                sst = self.hass.states.get(sel)
                if sst is not None and sst.state != opt:
                    self.hass.async_create_task(self.hass.services.async_call(
                        "select", "select_option", {"entity_id": sel, "option": opt}))
            nst = self.hass.states.get(target)
            number_max = None
            if nst is not None:
                try:
                    number_max = float(nst.attributes.get("max"))
                except (TypeError, ValueError):
                    number_max = None
            value = external_temp_value(room_temp, number_max)
            last = self._ext_sync_last.get(target)
            resend = float(self._trv_quirk_value(eid, "external_resend_s", EXTERNAL_SYNC_RESEND_S))
            min_delta = 10 if number_max is not None and number_max >= 1000 else 0.1
            if last is not None and abs(last[0] - value) < min_delta and now - last[1] < resend:
                continue
            self.hass.async_create_task(self._async_send_external_temp(target, value, now))

    async def _async_send_external_temp(self, target: str, value: float, ts: float) -> None:
        """Send and only then remember it - a failed call is retried next cycle instead of
        after the full resend interval."""
        try:
            await self.hass.services.async_call("number", "set_value", {"entity_id": target, "value": value},
                                                blocking=True)
            self._ext_sync_last[target] = (value, ts)
        except Exception:  # noqa: BLE001
            _LOGGER.debug("IHC: sending external temperature to %s failed", target, exc_info=True)

    def _trv_quirk_value(self, climate_entity_id: str, key: str, default=None):
        for q in self._get_trv_capabilities(climate_entity_id).get("quirks", []):
            if key in q:
                return q[key]
        return default

    def _get_trv_sibling_humidity(self, climate_entity_id: str) -> Optional[float]:
        """Humidity of the TRV's own device when the climate entity doesn't carry it as an
        attribute (Matter/other integrations expose it as a separate sensor entity)."""
        try:
            reg = er.async_get(self.hass)
            entry = reg.async_get(climate_entity_id)
            if entry is None or not entry.device_id:
                return None
            for sib in er.async_entries_for_device(reg, entry.device_id):
                if sib.domain != "sensor":
                    continue
                if (sib.device_class or sib.original_device_class) != "humidity":
                    continue
                st = self.hass.states.get(sib.entity_id)
                if st is None or st.state in (STATE_UNAVAILABLE, STATE_UNKNOWN):
                    continue
                try:
                    return float(st.state)
                except (ValueError, TypeError):
                    continue
        except Exception:  # noqa: BLE001 - registry lookup must never break the update cycle
            _LOGGER.debug("IHC: TRV humidity lookup failed for %s", climate_entity_id, exc_info=True)
        return None

    def _blend_trv_temp(
        self,
        room: dict,
        room_temp: Optional[float],
        trv_data: dict,
    ) -> tuple[Optional[float], Optional[float], Optional[float]]:
        """Return (display_temp, demand_temp, raw_trv_temp) for a room.

        Two temperatures with distinct roles:

        display_temp  – "Ist-Temperatur" for UI, frost-protection, mold, window logic.
                        → Always the room sensor if available; TRV temp only as
                          last-resort fallback when no room sensor is configured.

        demand_temp   – temperature fed into the demand calculation.
                        → TRV temp available (no explicit weight):
                            Use TRV temp directly. The TRV sensor at the radiator
                            reacts immediately. If TRV reports 21°C while target is
                            19°C the demand is correctly 0 % — even if the wall
                            sensor still shows 18°C. Prevents phantom demand.
                        → Explicit trv_temp_weight > 0: user-configured blend.
                        → No TRV data: same as display_temp (room sensor fallback).

        raw_trv_temp  – unmodified average TRV temperature for diagnostics.
        """
        trv_avg = trv_data.get("trv_avg_temp")
        weight = float(room.get(CONF_TRV_TEMP_WEIGHT, DEFAULT_TRV_TEMP_WEIGHT))
        offset = float(room.get(CONF_TRV_TEMP_OFFSET, DEFAULT_TRV_TEMP_OFFSET))

        # v2.6 – the TRV's own sensor only reads too warm while the radiator is warm. A
        # static offset (default -2 °C) made rooms WITHOUT a room thermometer show 2 °C too
        # little whenever the radiator was cold. The offset now follows a "radiator warmth"
        # factor: 1 while the TRV heats, decaying with a ~20 min time constant afterwards.
        # A user-chosen offset (e.g. from the calibration assistant, measured while idle)
        # stays static as before - only the generic default is made warmth-dependent.
        warmth = self._update_trv_warmth_factor(room.get(CONF_ROOM_ID, ""), trv_data)
        if offset == DEFAULT_TRV_TEMP_OFFSET:
            offset *= warmth
        if room.get(CONF_TRV_EXTERNAL_SENSOR_SYNC, DEFAULT_TRV_EXTERNAL_SENSOR_SYNC) and room_temp is not None:
            offset = 0.0  # TRV regulates with (and reports) the real room temperature

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

    _TRV_WARMTH_TAU_S = 1200.0  # radiator cool-down time constant for the TRV offset

    def _update_trv_warmth_factor(self, room_id: str, trv_data: dict) -> float:
        """0..1: how warm the radiator (and with it the TRV's own sensor) currently is."""
        if not hasattr(self, "_trv_warmth"):
            self._trv_warmth = {}
        now = time.monotonic()
        valve = trv_data.get("trv_avg_valve")
        heating = bool(trv_data.get("trv_any_heating")) or (valve is not None and valve > 8)
        prev = self._trv_warmth.get(room_id)
        if prev is None:
            factor = 1.0 if heating else 0.0
        else:
            last_factor, last_ts = prev
            target = 1.0 if heating else 0.0
            alpha = 1.0 - math.exp(-max(0.0, now - last_ts) / self._TRV_WARMTH_TAU_S)
            # warming up is fast (hot water reaches the valve within minutes)
            if heating:
                alpha = max(alpha, 0.5)
            factor = last_factor + (target - last_factor) * alpha
        self._trv_warmth[room_id] = (factor, now)
        return factor

    def _update_trv_offset_calibration(
        self,
        room_id: str,
        room_temp: Optional[float],
        trv_avg: Optional[float],
        demand: float,
        window_open: bool,
    ) -> None:
        """Record one (room_temp - trv_avg) sample for the offset calibration
        assistant, so get_suggested_trv_offset() has data to suggest a
        trv_temp_offset value from instead of the user having to guess it.

        Only samples while the room is idle (demand == 0) and the window is
        closed: while actively heating, the TRV sensor sits right at the hot
        radiator and reads warmer than steady-state, which would bias the
        difference away from what a display-temperature offset should
        actually correct for.
        """
        if room_temp is None or trv_avg is None or window_open or demand > 0:
            return
        # v2.6 – demand 0 right after heating still means a warm radiator; only sample
        # once the warmth factor has decayed, otherwise the "idle" offset is biased
        warm = self._trv_warmth.get(room_id) if hasattr(self, "_trv_warmth") else None
        if warm is not None and warm[0] > 0.1:
            return
        history = self._trv_offset_samples.setdefault(room_id, [])
        history.append(round(room_temp - trv_avg, 2))
        if len(history) > TRV_OFFSET_CALIBRATION_MAX_SAMPLES:
            history.pop(0)

    def get_suggested_trv_offset(self, room_id: str) -> Optional[float]:
        """Return a suggested trv_temp_offset (median idle-time room-vs-TRV
        difference, quantised to 0.5 °C to match TRV_SETPOINT_STEP), or None
        if there aren't enough idle samples yet to trust the suggestion.

        This never changes the configured offset itself - it's a read-only
        hint surfaced in the frontend for the user to apply if they agree.
        """
        history = self._trv_offset_samples.get(room_id)
        if not history or len(history) < TRV_OFFSET_CALIBRATION_MIN_SAMPLES:
            return None
        sorted_h = sorted(history)
        n = len(sorted_h)
        mid = n // 2
        median = (sorted_h[mid - 1] + sorted_h[mid]) / 2.0 if n % 2 == 0 else sorted_h[mid]
        return round(median / TRV_SETPOINT_STEP) * TRV_SETPOINT_STEP

    def _apply_trv_valve_demand(self, demand: float, trv_data: dict) -> float:
        """Correct demand based on TRV valve position.

        The valve position IS the most accurate demand signal – it reflects what
        the TRV's own thermostat decided, reacts instantly, and is not affected by
        sensor lag or room stratification.
        Blending: 40 % temp-based (target context) + 60 % valve-based (actual demand).
        """
        avg_valve = trv_data.get("trv_avg_valve")
        if avg_valve is None:
            return demand

        valve_demand = avg_valve  # valve position maps directly to demand 0-100
        blended = demand * 0.40 + valve_demand * 0.60
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
        if valve_entity in self._limescale_in_progress:
            return  # Kalkschutz exercise owns this valve until it finishes
        state = self.hass.states.get(valve_entity)
        if state is None:
            return
        if valve_entity.split(".")[0] == "climate":
            # Quantise to TRV resolution to reduce unnecessary radio traffic: 0.5 °C, or the
            # device's own coarser step (v2.6 - some Tuya TRVs only accept whole degrees).
            try:
                step = max(TRV_SETPOINT_STEP, float(state.attributes.get("target_temp_step") or TRV_SETPOINT_STEP))
            except (TypeError, ValueError):
                step = TRV_SETPOINT_STEP
            target_temp = round(round(target_temp / step) * step, 1)
            min_send_interval = max(min_send_interval, int(self._trv_quirk_value(valve_entity, "min_send_interval", 0)))
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
        if valve_entity in self._limescale_in_progress:
            return  # Kalkschutz exercise owns this valve until it finishes
        if valve_entity.split(".")[0] == "climate":
            hvac_modes = state.attributes.get("hvac_modes", [])
            # Prefer setting hvac_mode to off (saves battery, no hunting)
            if "off" in hvac_modes:
                self._last_sent_temps.pop(valve_entity, None)  # force update when turning back on
                self._trv_cmd_pending.pop(valve_entity, None)
                if state.state == "off":
                    # Already off - re-sending set_hvac_mode every 60 s cycle meant one
                    # radio command per TRV per minute for the whole summer (battery drain).
                    return
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
                # No force: the normal hysteresis skips re-sending an unchanged frost
                # setpoint every cycle (force=True did that, draining TRV batteries).
                frost_temp = self._get_frost_protection_temp()
                self._set_valve_entity(valve_entity, frost_temp)

    def _turn_on_valve_entity(self, valve_entity: str) -> bool:
        """Ensure TRV is in heat mode (turn on if it was set to off).

        Returns True if a turn-on command was sent - the caller then force-sends the
        setpoint once, because many TRVs (e.g. several Tuya models) restore their own
        stored setpoint when switching off -> heat.
        """
        if not valve_entity:
            return False
        state = self.hass.states.get(valve_entity)
        if state is None:
            return False
        if valve_entity.split(".")[0] == "climate":
            current_hvac = state.state  # "off", "heat", "auto", etc.
            hvac_modes = state.attributes.get("hvac_modes", [])
            # v2.6 – in "auto" many TRVs (Tuya, Sonoff, tado) follow their OWN schedule and
            # overwrite IHC's setpoint. IHC is the scheduler, so use plain "heat".
            if current_hvac == "auto" and "heat" in hvac_modes:
                self.hass.async_create_task(self.hass.services.async_call(
                    "climate", "set_hvac_mode", {"entity_id": valve_entity, "hvac_mode": "heat"}))
                return True
            if current_hvac == "off":
                preferred = "heat" if "heat" in hvac_modes else ("auto" if "auto" in hvac_modes else None)
                if preferred:
                    self.hass.async_create_task(
                        self.hass.services.async_call(
                            "climate",
                            "set_hvac_mode",
                            {"entity_id": valve_entity, "hvac_mode": preferred},
                        )
                    )
                    return True
        return False

    def _set_valve_entities(self, room: dict, target_temp: float, force: bool = False) -> None:
        """Set setpoint on all TRV / climate entities configured for a room."""
        min_interval = int(room.get(CONF_TRV_MIN_SEND_INTERVAL, DEFAULT_TRV_MIN_SEND_INTERVAL))
        # New: list of valve entities
        for entity in room.get(CONF_VALVE_ENTITIES, []):
            if entity:
                # Ensure TRV is in heat mode before setting temperature
                turned_on = self._turn_on_valve_entity(entity)
                self._set_valve_entity(entity, target_temp, force=force or turned_on, min_send_interval=min_interval)
        # Legacy: single valve entity
        single = room.get(CONF_VALVE_ENTITY)
        if single and single not in room.get(CONF_VALVE_ENTITIES, []):
            turned_on = self._turn_on_valve_entity(single)
            self._set_valve_entity(single, target_temp, force=force or turned_on, min_send_interval=min_interval)

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
            if entity_id in self._limescale_in_progress:
                # Kalkschutz is holding this valve at max_temp on purpose - that is
                # not a manual change (used to flip the room to MANUAL at 30 °C).
                continue
            trv_target = state.attributes.get("temperature")
            if trv_target is None:
                continue
            trv_target = float(trv_target)
            last_ihc = self._last_sent_temps.get(entity_id)
            if last_ihc is None:
                # First cycle – record current TRV temp as baseline, no detection yet
                self._last_sent_temps[entity_id] = trv_target
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
                        next_str = self._t(f" bis {next_period.get('start', '')} Uhr",
                                           f" until {next_period.get('start', '')}")
                    except Exception as exc:
                        _LOGGER.debug("IHC: Could not format next period for notification: %s", exc)
                # Send HA notification
                self.hass.async_create_task(
                    self.hass.services.async_call(
                        "persistent_notification",
                        "create",
                        {
                            "title": self._t(f"IHC: Manueller Eingriff – {room_name}",
                                             f"IHC: manual change – {room_name}"),
                            "message": self._t(
                                f"**{room_name}** wurde manuell am Gerät auf "
                                f"**{trv_target:.1f} °C** gestellt "
                                f"und bleibt bis zur nächsten Schaltzeit{next_str} im Modus **Manuell**.\n\n"
                                "Der Modus wird beim nächsten Zeitplan-Event automatisch zurückgesetzt.",
                                f"**{room_name}** was set to **{trv_target:.1f} °C** on the device and stays "
                                f"in **manual** mode{next_str}.\n\nThe mode is reset automatically at the "
                                "next schedule change.",
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
            vp = self._read_valve_position(eid, attrs)
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
        cfg = self.get_config()
        if not cfg.get(CONF_LIMESCALE_PROTECTION_ENABLED, DEFAULT_LIMESCALE_PROTECTION_ENABLED):
            return

        interval_days = int(cfg.get(CONF_LIMESCALE_INTERVAL_DAYS, DEFAULT_LIMESCALE_INTERVAL_DAYS))
        exercise_time_str = cfg.get(CONF_LIMESCALE_TIME, DEFAULT_LIMESCALE_TIME)
        exercise_duration_s = int(cfg.get(CONF_LIMESCALE_DURATION_MINUTES, DEFAULT_LIMESCALE_DURATION_MINUTES)) * 60

        # Use HA's configured timezone, not the OS/process timezone (which can
        # differ, e.g. a UTC-configured Docker host running an Europe/Berlin
        # Home Assistant instance) — otherwise the exercise window fires at the
        # wrong wall-clock time relative to what the user configured.
        now_dt = dt_util.now()
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
            room_id = room.get(CONF_ROOM_ID, "")
            # Kindersicherung: IHC must not touch a locked room's TRVs at all
            if room_id and self.is_room_child_locked(room_id):
                continue
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
                        self._trv_cmd_pending.pop(eid, None)
                        _LOGGER.info("IHC: Kalkschutz abgeschlossen für %s", eid)
                    # Still in progress – keep max_temp (set again to be safe)
                    # Still in progress: nothing to resend - Phase D skips valves in
                    # _limescale_in_progress, so the max_temp setpoint stays in place
                    # (re-sending it every cycle only cost TRV battery).
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
                    # The exercise is most useful in summer, when IHC has the TRV in
                    # hvac_mode "off" - a setpoint alone would not open the valve then.
                    self._turn_on_valve_entity(eid)
                    self.hass.async_create_task(
                        self.hass.services.async_call(
                            "climate", "set_temperature",
                            {"entity_id": eid, "temperature": max_temp},
                        )
                    )
