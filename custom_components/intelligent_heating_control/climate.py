"""Climate platform - one entity per room."""
from __future__ import annotations

import logging
from typing import Any, Optional

from homeassistant.components.climate import (
    ClimateEntity,
    ClimateEntityFeature,
    HVACMode,
    HVACAction,
)
from homeassistant.const import UnitOfTemperature, ATTR_TEMPERATURE
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import (
    DOMAIN,
    CONF_ROOM_ID,
    CONF_ROOM_NAME,
    CONF_MIN_TEMP,
    CONF_MAX_TEMP,
    DEFAULT_MIN_TEMP,
    DEFAULT_MAX_TEMP,
    ROOM_MODE_AUTO,
    ROOM_MODE_COMFORT,
    ROOM_MODE_ECO,
    ROOM_MODE_SLEEP,
    ROOM_MODE_AWAY,
    ROOM_MODE_OFF,
    ROOM_MODE_MANUAL,
    SYSTEM_MODE_OFF,
    ATTR_DEMAND,
    ATTR_SCHEDULE_ACTIVE,
    ATTR_WINDOW_OPEN,
    ATTR_ROOM_MODE,
    ATTR_OFFSET,
    CONF_ABSOLUTE_MIN_TEMP,
    CONF_ROOM_QM,
    CONF_ROOM_PREHEAT_MINUTES,
    CONF_WINDOW_REACTION_TIME,
    CONF_WINDOW_CLOSE_DELAY,
    CONF_HA_SCHEDULE_OFF_MODE,
    CONF_HUMIDITY_SENSOR,
    CONF_MOLD_PROTECTION_ENABLED,
    CONF_MOLD_HUMIDITY_THRESHOLD,
    CONF_CO2_SENSOR,
    CONF_CO2_THRESHOLD_GOOD,
    CONF_CO2_THRESHOLD_BAD,
    CONF_RADIATOR_KW,
    CONF_HKV_SENSOR,
    CONF_HKV_FACTOR,
    CONF_AWAY_TEMP_ROOM,
    DEFAULT_AWAY_TEMP_ROOM,
    CONF_BOOST_DEFAULT_DURATION,
    CONF_TRV_TEMP_WEIGHT,
    DEFAULT_TRV_TEMP_WEIGHT,
    CONF_TRV_TEMP_OFFSET,
    DEFAULT_TRV_TEMP_OFFSET,
    CONF_TRV_VALVE_DEMAND,
    DEFAULT_TRV_VALVE_DEMAND,
    CONF_TRV_MIN_SEND_INTERVAL,
    DEFAULT_TRV_MIN_SEND_INTERVAL,
    CONF_TRV_CALIBRATIONS,
    CONF_TEMP_CALIBRATION,
    DEFAULT_ABSOLUTE_MIN_TEMP,
    DEFAULT_ROOM_QM,
    DEFAULT_ROOM_PREHEAT_MINUTES,
    DEFAULT_WINDOW_REACTION_TIME,
    DEFAULT_WINDOW_CLOSE_DELAY,
    DEFAULT_HA_SCHEDULE_OFF_MODE,
    DEFAULT_MOLD_PROTECTION_ENABLED,
    DEFAULT_MOLD_HUMIDITY_THRESHOLD,
    DEFAULT_CO2_THRESHOLD_GOOD,
    DEFAULT_CO2_THRESHOLD_BAD,
    DEFAULT_RADIATOR_KW,
    DEFAULT_HKV_FACTOR,
    DEFAULT_BOOST_DEFAULT_DURATION,
    CONF_PRESENCE_SENSOR,
    CONF_PRESENCE_SENSOR_ON_DELAY,
    CONF_PRESENCE_SENSOR_OFF_DELAY,
    DEFAULT_PRESENCE_SENSOR_ON_DELAY,
    DEFAULT_PRESENCE_SENSOR_OFF_DELAY,
    CONF_WINDOW_OPEN_TEMP,
    DEFAULT_WINDOW_OPEN_TEMP,
    CONF_WINDOW_RESTORE_MODE,
    DEFAULT_WINDOW_RESTORE_MODE,
    CONF_ROOM_TEMP_THRESHOLD,
    DEFAULT_ROOM_TEMP_THRESHOLD,
    CONF_COMFORT_TEMP_ENTITY,
    CONF_ECO_TEMP_ENTITY,
    CONF_COMFORT_EXTEND_ENTITY,
    CONF_COMFORT_EXTEND_STATE,
    CONF_COMFORT_EXTEND_ENTRIES,
    DEFAULT_COMFORT_EXTEND_STATE,
    CONF_AGGRESSIVE_MODE_ENABLED,
    DEFAULT_AGGRESSIVE_MODE_ENABLED,
    CONF_AGGRESSIVE_MODE_RANGE,
    DEFAULT_AGGRESSIVE_MODE_RANGE,
    CONF_AGGRESSIVE_MODE_OFFSET,
    DEFAULT_AGGRESSIVE_MODE_OFFSET,
)
from .coordinator import IHCCoordinator

_LOGGER = logging.getLogger(__name__)

# Map HA preset names to our room modes (permanent modes only)
PRESET_TO_MODE = {
    "Auto": ROOM_MODE_AUTO,
    "Comfort": ROOM_MODE_COMFORT,
    "Eco": ROOM_MODE_ECO,
    "Sleep": ROOM_MODE_SLEEP,
    "Away": ROOM_MODE_AWAY,
    "Manual": ROOM_MODE_MANUAL,
}
MODE_TO_PRESET = {v: k for k, v in PRESET_TO_MODE.items()}
# "Boost" is a runtime-only preset – handled separately in preset_mode/async_set_preset_mode.
# It must NOT be in PRESET_TO_MODE to avoid MODE_TO_PRESET overwriting "Comfort" → "Boost".

HVAC_MODE_MAP = {
    ROOM_MODE_OFF: HVACMode.OFF,
}


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    coordinator: IHCCoordinator = hass.data[DOMAIN][entry.entry_id]
    entities = []
    for room in coordinator.get_rooms():
        entities.append(IHCRoomClimate(coordinator, entry, room))
    async_add_entities(entities, update_before_add=True)


class IHCRoomClimate(CoordinatorEntity, ClimateEntity):
    """Climate entity representing a single room."""

    _attr_temperature_unit = UnitOfTemperature.CELSIUS
    _attr_hvac_modes = [HVACMode.HEAT, HVACMode.OFF]
    _attr_preset_modes = list(PRESET_TO_MODE.keys()) + ["Boost"]
    _attr_supported_features = (
        ClimateEntityFeature.TARGET_TEMPERATURE
        | ClimateEntityFeature.PRESET_MODE
        | ClimateEntityFeature.TURN_OFF
        | ClimateEntityFeature.TURN_ON
    )
    # Exclude large/static attributes from recorder.
    # The climate entity carries the full room config mirror (~40 KB); only the small
    # operational attributes (temperature, demand, mode, window_open) are useful historically.
    _attr_extra_state_attributes_excluded_from_recorder = frozenset({
        # Schedules – static config, large JSON, only current value matters
        "schedules",
        "ha_schedules",
        "ha_schedule_blocks",
        # 7×24 EMA grid that changes every 60 s – no historical value in DB
        "demand_heatmap",
        # Static config lists – never useful as time-series data
        "valve_entities",
        "window_sensors",
        "room_presence_entities",
        "trv_calibrations",
        "trv_stuck_valves",
        # Sensor entity-IDs – static config mirrors
        "temp_sensor",
        "humidity_sensor",
        "co2_sensor",
        "hkv_sensor",
        "presence_sensor",
        "comfort_temp_entity",
        "eco_temp_entity",
        "comfort_extend_entity",
        # next_period / anomaly – transient, not useful in long-term history
        "next_period",
        "anomaly",
        # Learning data – large lists, best read on demand not stored every 60 s
        "warmup_curve",
    })

    def __init__(self, coordinator: IHCCoordinator, entry: ConfigEntry, room: dict) -> None:
        super().__init__(coordinator)
        self._entry = entry
        self._room_id = room[CONF_ROOM_ID]
        self._room_name = room.get(CONF_ROOM_NAME, self._room_id)
        self._attr_unique_id = f"{entry.entry_id}_room_{self._room_id}"
        self._attr_name = f"IHC {self._room_name}"
        self._attr_min_temp = float(room.get(CONF_MIN_TEMP, DEFAULT_MIN_TEMP))
        self._attr_max_temp = float(room.get(CONF_MAX_TEMP, DEFAULT_MAX_TEMP))
        self._attr_target_temperature_step = 0.5

    @property
    def device_info(self):
        return {
            "identifiers": {(DOMAIN, f"{self._entry.entry_id}_{self._room_id}")},
            "name": f"IHC {self._room_name}",
            "manufacturer": "IHC",
            "model": "Zimmer",
            "via_device": (DOMAIN, self._entry.entry_id),
        }

    @property
    def _room_data(self) -> Optional[dict]:
        if self.coordinator.data:
            return self.coordinator.data.get("rooms", {}).get(self._room_id)
        return None

    @property
    def current_temperature(self) -> Optional[float]:
        d = self._room_data
        return d.get("current_temp") if d else None

    @property
    def target_temperature(self) -> Optional[float]:
        # In summer mode there is no heating target
        if (self.coordinator.data or {}).get("summer_mode", False):
            return None
        # During boost: report max_temp so the climate tile matches what we send to the TRV
        if self.coordinator.get_boost_remaining_minutes(self._room_id) > 0:
            room_cfg = self.coordinator.get_room_config(self._room_id) or {}
            return float(room_cfg.get(CONF_MAX_TEMP, DEFAULT_MAX_TEMP))
        d = self._room_data
        return d.get("target_temp") if d else None

    @property
    def hvac_mode(self) -> HVACMode:
        if self.coordinator.get_system_mode() == SYSTEM_MODE_OFF:
            return HVACMode.OFF
        # Summer mode: heating globally disabled
        if (self.coordinator.data or {}).get("summer_mode", False):
            return HVACMode.OFF
        mode = self.coordinator.get_room_mode(self._room_id)
        if mode == ROOM_MODE_OFF:
            return HVACMode.OFF
        # Window open → OFF (heating is disabled while ventilating)
        d = self._room_data
        if d and d.get("window_open"):
            return HVACMode.OFF
        return HVACMode.HEAT

    @property
    def hvac_action(self) -> Optional[HVACAction]:
        d = self._room_data
        if d is None:
            return None
        if self.coordinator.data and self.coordinator.data.get("summer_mode", False):
            return HVACAction.OFF
        if self.coordinator.get_system_mode() == SYSTEM_MODE_OFF:
            return HVACAction.OFF
        if d.get("room_mode") == ROOM_MODE_OFF:
            return HVACAction.OFF
        # Window open → IDLE (heating paused while ventilating)
        if d.get("window_open"):
            return HVACAction.IDLE

        demand = d.get("demand", 0)
        current_temp = d.get("current_temp")
        target_temp = d.get("target_temp")
        data = self.coordinator.data
        controller_mode = (data or {}).get("controller_mode", "switch")

        if controller_mode == "trv":
            # TRV mode: demand > 0, TRV reports heating action, or valve physically open.
            # Valve > 8% is the most reliable signal – TRV's own controller has decided to heat.
            trv_avg_valve = d.get("trv_avg_valve")
            if (demand > 0
                    or d.get("trv_any_heating", False)
                    or (trv_avg_valve is not None and trv_avg_valve > 8)):
                return HVACAction.HEATING
        else:
            # Switch mode: show HEATING when the room demands heat.
            # Also show HEATING when the central boiler is active and the room is still
            # below its target – the room IS being heated even if demand just dropped to 0
            # (safety gate: demand=0 when current_temp >= target - deadband).
            heating_active = bool((data or {}).get("heating_active", False))
            if demand > 0:
                return HVACAction.HEATING
            if (heating_active
                    and current_temp is not None
                    and target_temp is not None
                    and current_temp < target_temp):
                return HVACAction.HEATING
            if data and data.get("cooling_active"):
                return HVACAction.COOLING
        return HVACAction.IDLE

    @property
    def preset_mode(self) -> Optional[str]:
        # Read boost state directly from coordinator (not from room_data) so the
        # preset updates immediately on set_room_boost() without waiting for the
        # next coordinator refresh cycle.
        if self.coordinator.get_boost_remaining_minutes(self._room_id) > 0:
            return "Boost"
        mode = self.coordinator.get_room_mode(self._room_id)
        return MODE_TO_PRESET.get(mode, "Auto")

    @property
    def extra_state_attributes(self) -> dict:
        d = self._room_data or {}
        room_cfg = self.coordinator.get_room_config(self._room_id) or {}
        return {
            ATTR_DEMAND: d.get("demand", 0),
            ATTR_SCHEDULE_ACTIVE: d.get("schedule_active", False),
            ATTR_WINDOW_OPEN: d.get("window_open", False),
            ATTR_ROOM_MODE: d.get("room_mode", ROOM_MODE_AUTO),
            "source": d.get("source", ""),
            "room_id": self._room_id,
            "boost_remaining": d.get("boost_remaining", 0),
            "night_setback": d.get("night_setback", 0.0),
            "runtime_today_minutes": d.get("runtime_today_minutes", 0.0),
            "energy_today_kwh": d.get("energy_today_kwh", 0.0),
            # Room config – exposed for frontend panel
            "temp_sensor": room_cfg.get("temp_sensor", ""),
            "valve_entities": room_cfg.get("valve_entities", []),
            "window_sensors": room_cfg.get("window_sensors", []),
            # Legacy fixed temps (kept for fallback / sensor-absent scenario)
            "comfort_temp": room_cfg.get("comfort_temp", 21.0),
            "away_temp_room": room_cfg.get(CONF_AWAY_TEMP_ROOM, DEFAULT_AWAY_TEMP_ROOM),
            # Outdoor-regulated offsets & caps
            "eco_offset": room_cfg.get("eco_offset", 3.0),
            "sleep_offset": room_cfg.get("sleep_offset", 4.0),
            "away_offset": room_cfg.get("away_offset", 6.0),
            "eco_max_temp": room_cfg.get("eco_max_temp", 21.0),
            "sleep_max_temp": room_cfg.get("sleep_max_temp", 19.0),
            "away_max_temp": room_cfg.get("away_max_temp", 18.0),
            "ha_schedule_off_mode": room_cfg.get(CONF_HA_SCHEDULE_OFF_MODE, DEFAULT_HA_SCHEDULE_OFF_MODE),
            "ha_schedule_entity": d.get("ha_schedule_entity", ""),
            "ha_schedule_mode": d.get("ha_schedule_mode", ""),
            # Effective computed temps (from coordinator runtime data)
            "comfort_temp_eff": d.get("comfort_temp_eff"),
            "eco_temp_eff": d.get("eco_temp_eff"),
            "sleep_temp_eff": d.get("sleep_temp_eff"),
            "away_temp_eff": d.get("away_temp_eff"),
            "room_offset": room_cfg.get("room_offset", 0.0),
            "deadband": room_cfg.get("deadband", 0.5),
            "weight": room_cfg.get("weight", 1.0),
            # Per-room advanced settings
            "absolute_min_temp": room_cfg.get(CONF_ABSOLUTE_MIN_TEMP, DEFAULT_ABSOLUTE_MIN_TEMP),
            "min_temp": room_cfg.get(CONF_MIN_TEMP, DEFAULT_MIN_TEMP),
            "max_temp": room_cfg.get(CONF_MAX_TEMP, DEFAULT_MAX_TEMP),
            "room_qm": room_cfg.get(CONF_ROOM_QM, DEFAULT_ROOM_QM),
            "room_preheat_minutes": room_cfg.get(CONF_ROOM_PREHEAT_MINUTES, DEFAULT_ROOM_PREHEAT_MINUTES),
            "window_reaction_time": room_cfg.get(CONF_WINDOW_REACTION_TIME, DEFAULT_WINDOW_REACTION_TIME),
            "window_close_delay": room_cfg.get(CONF_WINDOW_CLOSE_DELAY, DEFAULT_WINDOW_CLOSE_DELAY),
            # Derived effective weight (from qm if weight is default)
            "effective_weight": d.get("effective_weight", room_cfg.get("weight", 1.0)),
            "schedules": room_cfg.get("schedules", []),
            "ha_schedules": room_cfg.get("ha_schedules", []),
            "ha_schedule_blocks": d.get("ha_schedule_blocks", {}),
            "next_period": d.get("next_period"),
            "anomaly": d.get("anomaly"),
            # Per-room energy config
            "radiator_kw": room_cfg.get(CONF_RADIATOR_KW, DEFAULT_RADIATOR_KW),
            "hkv_sensor": room_cfg.get(CONF_HKV_SENSOR, ""),
            "hkv_factor": room_cfg.get(CONF_HKV_FACTOR, DEFAULT_HKV_FACTOR),
            # Mold protection
            "humidity_sensor": room_cfg.get(CONF_HUMIDITY_SENSOR, ""),
            "mold_protection_enabled": room_cfg.get(CONF_MOLD_PROTECTION_ENABLED, DEFAULT_MOLD_PROTECTION_ENABLED),
            "mold_humidity_threshold": room_cfg.get(CONF_MOLD_HUMIDITY_THRESHOLD, DEFAULT_MOLD_HUMIDITY_THRESHOLD),
            "mold": d.get("mold"),
            "felt_temperature": d.get("felt_temperature"),
            # Presence
            "room_presence_entities": room_cfg.get("room_presence_entities", []),
            "room_presence_active": d.get("room_presence_active"),
            # PIR sensor presence
            "presence_sensor": room_cfg.get(CONF_PRESENCE_SENSOR, ""),
            "presence_sensor_on_delay": room_cfg.get(CONF_PRESENCE_SENSOR_ON_DELAY, DEFAULT_PRESENCE_SENSOR_ON_DELAY),
            "presence_sensor_off_delay": room_cfg.get(CONF_PRESENCE_SENSOR_OFF_DELAY, DEFAULT_PRESENCE_SENSOR_OFF_DELAY),
            "pir_presence": d.get("pir_presence"),
            # Window open temperature
            "window_open_temp": room_cfg.get(CONF_WINDOW_OPEN_TEMP, DEFAULT_WINDOW_OPEN_TEMP),
            "window_restore_mode": room_cfg.get(CONF_WINDOW_RESTORE_MODE, DEFAULT_WINDOW_RESTORE_MODE),
            # Room temperature threshold
            "room_temp_threshold": room_cfg.get(CONF_ROOM_TEMP_THRESHOLD, DEFAULT_ROOM_TEMP_THRESHOLD),
            # Dynamic temperature entities
            "comfort_temp_entity": room_cfg.get(CONF_COMFORT_TEMP_ENTITY, ""),
            "eco_temp_entity": room_cfg.get(CONF_ECO_TEMP_ENTITY, ""),
            # Comfort extend
            "comfort_extend_entity": room_cfg.get(CONF_COMFORT_EXTEND_ENTITY, ""),
            "comfort_extend_state": room_cfg.get(CONF_COMFORT_EXTEND_STATE, DEFAULT_COMFORT_EXTEND_STATE),
            "comfort_extend_entries": room_cfg.get(CONF_COMFORT_EXTEND_ENTRIES, []),
            "comfort_extend_active": d.get("comfort_extend_active", False),
            # Aggressive mode
            "aggressive_mode_enabled": room_cfg.get(CONF_AGGRESSIVE_MODE_ENABLED, DEFAULT_AGGRESSIVE_MODE_ENABLED),
            "aggressive_mode_range": room_cfg.get(CONF_AGGRESSIVE_MODE_RANGE, DEFAULT_AGGRESSIVE_MODE_RANGE),
            "aggressive_mode_offset": room_cfg.get(CONF_AGGRESSIVE_MODE_OFFSET, DEFAULT_AGGRESSIVE_MODE_OFFSET),
            # Boost config
            "boost_default_duration": room_cfg.get(CONF_BOOST_DEFAULT_DURATION, DEFAULT_BOOST_DEFAULT_DURATION),
            # Ventilation advice + CO2
            "co2_sensor": room_cfg.get(CONF_CO2_SENSOR, ""),
            "co2_threshold_good": room_cfg.get(CONF_CO2_THRESHOLD_GOOD, DEFAULT_CO2_THRESHOLD_GOOD),
            "co2_threshold_bad": room_cfg.get(CONF_CO2_THRESHOLD_BAD, DEFAULT_CO2_THRESHOLD_BAD),
            "co2_ppm": d.get("co2_ppm"),
            "co2_ventilation_eta_minutes": d.get("co2_ventilation_eta_minutes"),
            "ventilation": d.get("ventilation"),
            # TRV sensor data integration (optional)
            "trv_temp_weight": room_cfg.get(CONF_TRV_TEMP_WEIGHT, DEFAULT_TRV_TEMP_WEIGHT),
            "trv_temp_offset": room_cfg.get(CONF_TRV_TEMP_OFFSET, DEFAULT_TRV_TEMP_OFFSET),
            "trv_valve_demand": room_cfg.get(CONF_TRV_VALVE_DEMAND, DEFAULT_TRV_VALVE_DEMAND),
            "trv_min_send_interval": room_cfg.get(CONF_TRV_MIN_SEND_INTERVAL, DEFAULT_TRV_MIN_SEND_INTERVAL),
            "trv_calibrations": room_cfg.get(CONF_TRV_CALIBRATIONS, {}),
            "temp_calibration": room_cfg.get(CONF_TEMP_CALIBRATION, 0.0),
            "trv_raw_temp": d.get("trv_raw_temp"),
            "trv_humidity": d.get("trv_humidity"),
            "trv_avg_valve": d.get("trv_avg_valve"),
            "trv_any_heating": d.get("trv_any_heating", False),
            "trv_min_battery": d.get("trv_min_battery"),
            "trv_low_battery": d.get("trv_low_battery", False),
            "trv_stuck_valves": d.get("trv_stuck_valves", []),
            # Demand heatmap (7 days × 24 hours EMA)
            "demand_heatmap": d.get("demand_heatmap", []),
            # Optimum Start & Thermal Mass learning data
            "learned_preheat_minutes": d.get("learned_preheat_minutes"),
            "avg_cooling_rate": d.get("avg_cooling_rate"),
            "warmup_curve": d.get("warmup_curve", []),
            # Optimum Stop (Abschaltzeit-Optimierung)
            "optimum_stop_active": d.get("optimum_stop_active", False),
            "optimum_stop_minutes": d.get("optimum_stop_minutes"),
            "optimum_stop_predicted": d.get("optimum_stop_predicted"),
        }

    async def async_set_temperature(self, **kwargs: Any) -> None:
        temp = kwargs.get(ATTR_TEMPERATURE)
        if temp is not None:
            self.coordinator.set_room_manual_temp(self._room_id, float(temp))

    async def async_set_hvac_mode(self, hvac_mode: HVACMode) -> None:
        if hvac_mode == HVACMode.OFF:
            self.coordinator.set_room_mode(self._room_id, ROOM_MODE_OFF)
        elif hvac_mode == HVACMode.HEAT:
            current = self.coordinator.get_room_mode(self._room_id)
            if current == ROOM_MODE_OFF:
                self.coordinator.set_room_mode(self._room_id, ROOM_MODE_AUTO)

    async def async_set_preset_mode(self, preset_mode: str) -> None:
        if preset_mode == "Boost":
            room_cfg = self.coordinator.get_room_config(self._room_id) or {}
            duration = int(room_cfg.get(CONF_BOOST_DEFAULT_DURATION, DEFAULT_BOOST_DEFAULT_DURATION))
            self.coordinator.set_room_boost(self._room_id, duration)
        else:
            # Cancel boost timer before switching to another preset so the countdown
            # stops immediately and the TRV returns to normal setpoint on the next cycle.
            if self.coordinator.get_boost_remaining_minutes(self._room_id) > 0:
                self.coordinator.cancel_room_boost(self._room_id)
            mode = PRESET_TO_MODE.get(preset_mode, ROOM_MODE_AUTO)
            self.coordinator.set_room_mode(self._room_id, mode)
