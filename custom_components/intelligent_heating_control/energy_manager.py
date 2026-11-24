"""Energy tracking and runtime statistics mixin for IHC Coordinator."""
from __future__ import annotations

import logging
import time
from datetime import datetime
from typing import Optional

from homeassistant.const import STATE_UNAVAILABLE, STATE_UNKNOWN
from homeassistant.util import dt as dt_util

from .const import (
    CONF_HKV_SENSOR,
    CONF_HKV_FACTOR,
    CONF_RADIATOR_KW,
    CONF_ROOM_QM,
    DEFAULT_HKV_FACTOR,
    DEFAULT_RADIATOR_KW,
    DEFAULT_ROOM_QM,
    CONF_BOILER_SWITCH_ENTITY,
    CONF_BOILER_MIN_ON_SECONDS,
    DEFAULT_BOILER_MIN_ON_SECONDS,
    CONF_BOILER_MIN_OFF_SECONDS,
    DEFAULT_BOILER_MIN_OFF_SECONDS,
    CONF_HEATING_SYSTEM,
    DEFAULT_HEATING_SYSTEM,
    CONF_HEATING_EFFICIENCY,
    CONF_DESIGN_FLOW_TEMP,
    CONF_FLOW_TEMP_SENSOR,
    CONF_ENERGY_METER_ENTITY,
    CONF_ROOM_ID,
)
from . import heat_output

_LOGGER = logging.getLogger(__name__)


class EnergyManagerMixin:
    """Mixin for heating runtime tracking and energy estimation."""

    # ── v2.6 physical heat / energy model ──────────────────────────────────────
    def _heating_params(self) -> dict:
        cfg = self.get_config()
        system = cfg.get(CONF_HEATING_SYSTEM, DEFAULT_HEATING_SYSTEM)
        base = heat_output.HEATING_SYSTEMS.get(system, heat_output.HEATING_SYSTEMS["gas"])
        eff = float(cfg.get(CONF_HEATING_EFFICIENCY, 0) or 0) or base["efficiency"]
        design = float(cfg.get(CONF_DESIGN_FLOW_TEMP, 0) or 0) or base["flow"]
        return {"system": system, "efficiency": eff, "design_flow": design, "spread": base["spread"]}

    def _current_flow_return(self, outdoor_temp: Optional[float]) -> tuple:
        """Flow/return temperature now: real flow sensor if configured, else the design
        flow temperature weather-compensated by the outdoor temperature."""
        p = self._heating_params()
        flow = None
        sensor = self.get_config().get(CONF_FLOW_TEMP_SENSOR)
        if sensor:
            st = self.hass.states.get(sensor)
            if st is not None and st.state not in (STATE_UNKNOWN, STATE_UNAVAILABLE):
                try:
                    flow = float(st.state)
                except ValueError:
                    flow = None
        if flow is None:
            flow = heat_output.weather_compensated_flow(p["design_flow"], outdoor_temp)
        share = max(0.3, (flow - 20.0) / max(1.0, p["design_flow"] - 20.0))
        return flow, flow - p["spread"] * min(1.0, share)

    def _update_room_heat_energy(self, room_data: dict, outdoor_temp: Optional[float]) -> None:
        """Integrate each room's estimated heat output (kW) over time → heat kWh today."""
        now = time.monotonic()
        last = getattr(self, "_energy_last_ts", None)
        self._energy_last_ts = now
        dt_h = 0.0 if last is None else min(300.0, max(0.0, now - last)) / 3600.0
        flow, ret = self._current_flow_return(outdoor_temp)
        self._flow_temp_now = round(flow, 1)
        rooms = {r.get(CONF_ROOM_ID, ""): r for r in self.get_rooms()}
        for room_id, rdata in room_data.items():
            room = rooms.get(room_id)
            if room is None:
                continue
            power = heat_output.room_heat_power_kw(
                self._get_room_radiator_kw(room), rdata.get("trv_avg_valve"),
                self._trv_room_is_heating(rdata), float(rdata.get("demand", 0) or 0),
                flow, ret, rdata.get("current_temp"),
            )
            rdata["instant_power_w"] = round(power * 1000.0, 1)
            if dt_h > 0:
                self._room_heat_kwh_today[room_id] = self._room_heat_kwh_today.get(room_id, 0.0) + power * dt_h

    def _meter_reading_kwh(self) -> Optional[float]:
        entity = self.get_config().get(CONF_ENERGY_METER_ENTITY)
        st = self.hass.states.get(entity) if entity else None
        if st is None or st.state in (STATE_UNKNOWN, STATE_UNAVAILABLE):
            return None
        try:
            return heat_output.meter_to_kwh(float(st.state), st.attributes.get("unit_of_measurement"))
        except ValueError:
            return None

    def _meter_today_kwh(self) -> Optional[float]:
        reading = self._meter_reading_kwh()
        if reading is None:
            return None
        if self._smart_meter_day_start is None or reading < self._smart_meter_day_start:
            self._smart_meter_day_start = reading
        return round(reading - self._smart_meter_day_start, 3)

    def _roll_energy_day(self) -> None:
        """At midnight: freeze today's per-room final energy as "yesterday" and, if a real
        meter is configured, learn a calibration factor (measured / estimated)."""
        estimated = 0.0
        self._room_final_kwh_yesterday = {}
        for room in self.get_rooms():
            rid = room.get(CONF_ROOM_ID, "")
            if not rid:
                continue
            value = self._calculate_room_energy_today(room, rid)
            self._room_final_kwh_yesterday[rid] = value
            estimated += value / max(0.01, self._energy_calibration_factor)
        measured = self._meter_today_kwh()
        if measured is not None and estimated > 0.5 and measured > 0:
            ratio = max(0.2, min(5.0, measured / estimated))
            self._energy_calibration_factor = round(0.5 * self._energy_calibration_factor + 0.5 * ratio, 3)
        self._room_heat_kwh_today = {}
        if hasattr(self, "_add_month_consumption"):
            self._add_month_consumption(sum(self._room_final_kwh_yesterday.values()))

    def _reset_runtime_if_new_day(self) -> None:
        today = dt_util.now().day
        if today != self._runtime_day:
            self._roll_energy_day()
            # Save today's runtime as yesterday before reset
            self._heating_runtime_yesterday = self._heating_runtime_today
            self._heating_runtime_today = 0.0
            self._room_runtime_yesterday = dict(self._room_runtime_today)
            self._room_runtime_today = {}
            self._runtime_day = today
            # Reset HKV day-start so sensor deltas are measured from midnight
            self._hkv_day_start = {}
            # Reset smart meter baseline
            self._smart_meter_day_start = None
            self.hass.async_create_task(self._async_save_runtime_state())

    @staticmethod
    def _trv_room_is_heating(rdata: dict) -> bool:
        """Decide if a TRV room is actively heating – same logic as climate.hvac_action.

        Priority:
          1. Valve position > 8 %  (most reliable, direct hardware signal)
          2. TRV reports hvac_action == "heating"
          3. IHC calculated demand > 0 (post-safety-gate)
          4. Fallback: no TRV state available → room below its setpoint
        """
        avg_valve = rdata.get("trv_avg_valve")
        if avg_valve is not None:
            return avg_valve > 8
        if rdata.get("trv_any_heating", False):
            return True
        if rdata.get("demand", 0.0) > 0:
            return True
        # Fallback (mirrors climate.py hvac_action): TRV doesn't report state,
        # count as heating whenever the room is below its target temperature.
        current = rdata.get("current_temp")
        target = rdata.get("target_temp")
        return current is not None and target is not None and current < target

    def _update_runtime_tracking(self, room_data: dict) -> None:
        """Track heating on-times for energy statistics.

        There is no central boiler switch in TRV mode, so "heating" is defined
        as "any room heating" using the same signal hierarchy as climate.hvac_action
        (_trv_room_is_heating), both globally and per room.
        """
        now = datetime.now()
        self._reset_runtime_if_new_day()

        global_heat = any(self._trv_room_is_heating(rd) for rd in room_data.values())
        if global_heat:
            if self._heating_started_at is None:
                self._heating_started_at = now
        else:
            if self._heating_started_at is not None:
                elapsed = (now - self._heating_started_at).total_seconds()
                self._heating_runtime_today += elapsed
                self._heating_started_at = None

        # Per-room demand runtime
        for room_id, rdata in room_data.items():
            room_heating = self._trv_room_is_heating(rdata)
            if room_heating:
                if room_id not in self._room_demand_started:
                    self._room_demand_started[room_id] = now
            else:
                started = self._room_demand_started.pop(room_id, None)
                if started is not None:
                    elapsed = (now - started).total_seconds()
                    self._room_runtime_today[room_id] = (
                        self._room_runtime_today.get(room_id, 0.0) + elapsed
                    )

    def _update_boiler_relay(self, any_room_heating: bool) -> None:
        """Optional: drive an external boiler/pump relay switch from the aggregate
        "any room heating" signal, with minimum on/off times so real hardware isn't
        short-cycled. Purely additive to the existing TRV-only control - TRVs keep
        doing all per-room regulation, this just also flips one extra switch for
        users whose heat source needs an explicit on/off call.
        """
        cfg = self.get_config()
        switch_entity = cfg.get(CONF_BOILER_SWITCH_ENTITY)
        if not switch_entity:
            return
        now = dt_util.utcnow()
        if self._boiler_state is None:
            # First cycle (fresh install or nothing persisted yet) - sync to the
            # switch's actual current state rather than guessing, so a restart
            # can't immediately flip real hardware before we know its history.
            state = self.hass.states.get(switch_entity)
            self._boiler_state = (state.state == "on") if state else any_room_heating
            self._boiler_last_change = now

        if any_room_heating == self._boiler_state:
            return
        min_seconds = (
            float(cfg.get(CONF_BOILER_MIN_OFF_SECONDS, DEFAULT_BOILER_MIN_OFF_SECONDS))
            if any_room_heating
            else float(cfg.get(CONF_BOILER_MIN_ON_SECONDS, DEFAULT_BOILER_MIN_ON_SECONDS))
        )
        elapsed = (now - self._boiler_last_change).total_seconds() if self._boiler_last_change else min_seconds
        if elapsed < min_seconds:
            return  # not yet - re-evaluated next cycle, no command sent
        service = "turn_on" if any_room_heating else "turn_off"
        self.hass.async_create_task(
            self.hass.services.async_call("switch", service, {"entity_id": switch_entity})
        )
        self._boiler_state = any_room_heating
        self._boiler_last_change = now
        self._schedule_save()

    def get_heating_runtime_today_minutes(self) -> float:
        """Total heating runtime today in minutes (including current session)."""
        total = self._heating_runtime_today
        if self._heating_started_at is not None:
            total += (datetime.now() - self._heating_started_at).total_seconds()
        return round(total / 60.0, 1)

    def get_heating_runtime_yesterday_minutes(self) -> float:
        """Total heating runtime yesterday in minutes."""
        return round(self._heating_runtime_yesterday / 60.0, 1)

    def get_room_runtime_today_minutes(self, room_id: str) -> float:
        """Room heating demand runtime today in minutes."""
        total = self._room_runtime_today.get(room_id, 0.0)
        started = self._room_demand_started.get(room_id)
        if started is not None:
            total += (datetime.now() - started).total_seconds()
        return round(total / 60.0, 1)

    def get_room_runtime_yesterday_minutes(self, room_id: str) -> float:
        """Room heating demand runtime yesterday in minutes."""
        return round(self._room_runtime_yesterday.get(room_id, 0.0) / 60.0, 1)

    def reset_runtime_stats(self) -> None:
        """Reset today's heating runtime and energy statistics to zero."""
        if self._heating_started_at is not None:
            self._heating_started_at = datetime.now()  # restart session clock
        self._heating_runtime_today = 0.0
        self._room_runtime_today.clear()
        for room_id in list(self._room_demand_started.keys()):
            self._room_demand_started[room_id] = datetime.now()
        _LOGGER.info("IHC: Runtime and energy stats reset by user.")

    @staticmethod
    def _get_room_radiator_kw(room: dict) -> float:
        """Resolve a room's rated radiator power: explicit radiator_kw, or - if
        that's still at the default - a rough area-based estimate (65 W/m²)."""
        radiator_kw = float(room.get(CONF_RADIATOR_KW, DEFAULT_RADIATOR_KW))
        room_qm_e = float(room.get(CONF_ROOM_QM, DEFAULT_ROOM_QM))
        if room_qm_e > 0 and radiator_kw == DEFAULT_RADIATOR_KW:
            radiator_kw = round(room_qm_e * 0.065, 2)  # 65 W/m² → kW
        return radiator_kw

    def _calculate_room_instant_power_w(self, room: dict, rdata: dict) -> float:
        """Current heat output in W (computed in _update_room_heat_energy, v2.6 model)."""
        return float(rdata.get("instant_power_w", 0.0) or 0.0)

    def _calculate_room_energy_today(self, room: dict, room_id: str) -> float:
        """
        Calculate today's energy estimate for one room.

        Priority order:
          1. HKV sensor (Heizkostenverteiler) – most accurate for Mietwohnung.
             Reads the live sensor delta since midnight and multiplies by
             hkv_factor (kWh/Einheit from the annual billing statement).
          2. Runtime × radiator_kw – per-room thermal power × demand-open time.
             Works in both TRV mode (demand > 0 independent of boiler) and
             switch mode (runtime already gated on boiler-on).
        """
        # --- Option 1: HKV sensor ---
        hkv_entity = room.get(CONF_HKV_SENSOR, "")
        hkv_factor = float(room.get(CONF_HKV_FACTOR, DEFAULT_HKV_FACTOR))
        if hkv_entity:
            state = self.hass.states.get(hkv_entity)
            if state and state.state not in (STATE_UNKNOWN, STATE_UNAVAILABLE):
                try:
                    current_val = float(state.state)
                    day_start = self._hkv_day_start.get(room_id)
                    if day_start is None:
                        # First reading of the day – store as baseline
                        self._hkv_day_start[room_id] = current_val
                        return 0.0
                    if current_val < day_start:
                        # Counter went backwards (sensor reset / replacement) – recalibrate
                        _LOGGER.warning(
                            "IHC: HKV counter reset for room %s (was %.1f, now %.1f) – recalibrating baseline",
                            room_id, day_start, current_val,
                        )
                        self._hkv_day_start[room_id] = current_val
                        return 0.0
                    delta = current_val - day_start
                    return round(delta * hkv_factor, 3)
                except (ValueError, TypeError):
                    pass  # fall through to runtime estimate

        # --- Option 2 (v2.6): integrated heat output → final energy (gas/oil/electricity),
        # calibrated against a real meter if one is configured
        heat_kwh = self._room_heat_kwh_today.get(room_id, 0.0)
        final = heat_output.final_energy(heat_kwh, self._heating_params()["efficiency"])
        return round(final * self._energy_calibration_factor, 3)

    def _calculate_room_energy_yesterday(self, room: dict, room_id: str) -> float:
        """
        Estimate yesterday's energy for one room from its heating runtime.

        Unlike _calculate_room_energy_today, this cannot use the HKV sensor
        (that needs a live delta since midnight, not available for a past day)
        - it always uses runtime × radiator_kw.
        """
        # v2.6: the value frozen at midnight (same method as "today", incl. HKV/meter)
        return round(self._room_final_kwh_yesterday.get(room_id, 0.0), 3)

    def calculate_efficiency_score(self, outdoor_temp: Optional[float]) -> Optional[int]:
        """
        Calculate a daily heating efficiency score (0–100).

        Higher = more efficient. Based on the ratio of actual runtime to the
        expected runtime for the current outdoor temperature.

        Formula:
          expected_hours = max(0.5, (20 - outdoor_temp) / 5)   [h/day]
          actual_hours   = runtime_today_minutes / 60
          ratio          = expected_hours / actual_hours
          score          = clamp(round(ratio * 100), 0, 100)

        Interpretation:
          100 – heating exactly as long as expected for this outdoor temp
          >100 – heating less than expected (very efficient or house well insulated)
           <100 – heating more than expected (less efficient)
        Score is None if no outdoor temp or no runtime data yet.
        """
        if outdoor_temp is None:
            return None
        actual_h = self.get_heating_runtime_today_minutes() / 60.0
        if actual_h < 0.05:
            return None  # too early in the day for a meaningful score
        expected_h = max(0.5, (20.0 - outdoor_temp) / 5.0)
        ratio = expected_h / actual_h
        return min(100, max(0, round(ratio * 100)))
