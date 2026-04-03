"""Energy tracking and runtime statistics mixin for IHC Coordinator."""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Optional

from homeassistant.const import STATE_UNAVAILABLE, STATE_UNKNOWN

from .const import (
    CONF_HKV_SENSOR,
    CONF_HKV_FACTOR,
    CONF_RADIATOR_KW,
    CONF_ROOM_QM,
    CONF_SMART_METER_ENTITY,
    CONF_CONTROLLER_MODE,
    DEFAULT_HKV_FACTOR,
    DEFAULT_RADIATOR_KW,
    DEFAULT_ROOM_QM,
    DEFAULT_CONTROLLER_MODE,
    CONTROLLER_MODE_TRV,
)

_LOGGER = logging.getLogger(__name__)


class EnergyManagerMixin:
    """Mixin for heating runtime tracking and energy estimation."""

    def _reset_runtime_if_new_day(self) -> None:
        today = datetime.now().day
        if today != self._runtime_day:
            # Save today's runtime as yesterday before reset
            self._heating_runtime_yesterday = self._heating_runtime_today
            self._heating_runtime_today = 0.0
            self._room_runtime_today = {}
            self._runtime_day = today
            # Reset HKV day-start so sensor deltas are measured from midnight
            self._hkv_day_start = {}
            # Reset smart meter baseline
            self._smart_meter_day_start = None
            self.hass.async_create_task(self._async_save_runtime_state())

    def _update_runtime_tracking(self, should_heat: bool, room_data: dict) -> None:
        """Track heating on-times for energy statistics."""
        now = datetime.now()
        self._reset_runtime_if_new_day()
        controller_mode = self.get_config().get(CONF_CONTROLLER_MODE, DEFAULT_CONTROLLER_MODE)

        # Global heating runtime
        # In TRV mode there is no central switch; treat "any room demanding" as heating active
        global_heat = should_heat if controller_mode != CONTROLLER_MODE_TRV else any(
            rd.get("demand", 0.0) > 0 for rd in room_data.values()
        )
        if global_heat:
            if self._heating_started_at is None:
                self._heating_started_at = now
        else:
            if self._heating_started_at is not None:
                elapsed = (now - self._heating_started_at).total_seconds()
                self._heating_runtime_today += elapsed
                self._heating_started_at = None

        # Per-room demand runtime
        # TRV mode: prefer valve position > threshold as heating signal – it reacts faster
        #           and directly represents actual heat flow (no lag from room sensor).
        #           Falls back to demand > 0 when valve data is not available.
        # Switch mode: count only when central heater is also on (demand > 0 AND should_heat)
        for room_id, rdata in room_data.items():
            demand = rdata.get("demand", 0.0)
            if controller_mode == CONTROLLER_MODE_TRV:
                avg_valve = rdata.get("trv_avg_valve")
                if avg_valve is not None:
                    room_heating = avg_valve > 8  # valve open → actively heating
                else:
                    room_heating = demand > 0
            else:
                room_heating = demand > 0 and should_heat
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

    def reset_runtime_stats(self) -> None:
        """Reset today's heating runtime and energy statistics to zero."""
        if self._heating_started_at is not None:
            self._heating_started_at = datetime.now()  # restart session clock
        self._heating_runtime_today = 0.0
        self._room_runtime_today.clear()
        for room_id in list(self._room_demand_started.keys()):
            self._room_demand_started[room_id] = datetime.now()
        _LOGGER.info("IHC: Runtime and energy stats reset by user.")

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

        # --- Option 2: runtime × radiator power ---
        radiator_kw = float(room.get(CONF_RADIATOR_KW, DEFAULT_RADIATOR_KW))
        # If room_qm is set and radiator_kw is at default, estimate from area
        # (rough rule: ~50 W/m² for well-insulated, ~80 W/m² for older buildings → use 65 W/m²)
        room_qm_e = float(room.get(CONF_ROOM_QM, DEFAULT_ROOM_QM))
        if room_qm_e > 0 and radiator_kw == DEFAULT_RADIATOR_KW:
            radiator_kw = round(room_qm_e * 0.065, 2)  # 65 W/m² → kW
        room_runtime_min = self.get_room_runtime_today_minutes(room_id)
        return round(room_runtime_min / 60.0 * radiator_kw, 3)

    def _get_smart_meter_energy_today(self) -> Optional[float]:
        """
        Return today's energy consumption in kWh from a smart meter sensor.

        The sensor must have state_class = TOTAL_INCREASING (e.g. utility_meter.*
        or any sensor.* that accumulates kWh since a fixed point).
        A daily baseline is stored at midnight and subtracted to get the day delta.
        Returns None when no sensor is configured.
        """
        cfg = self.get_config()
        meter_entity = cfg.get(CONF_SMART_METER_ENTITY)
        if not meter_entity:
            return None
        state = self.hass.states.get(meter_entity)
        if state is None or state.state in (STATE_UNAVAILABLE, STATE_UNKNOWN):
            return None
        try:
            current = float(state.state)
        except (ValueError, TypeError):
            return None
        if self._smart_meter_day_start is None:
            self._smart_meter_day_start = current
            return 0.0
        return round(max(0.0, current - self._smart_meter_day_start), 3)

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
