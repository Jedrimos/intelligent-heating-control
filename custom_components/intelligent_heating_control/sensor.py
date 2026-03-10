"""Sensor platform - demand, target temp, outdoor temp, total demand."""
from __future__ import annotations

import logging
from typing import Optional

from homeassistant.components.sensor import (
    SensorEntity,
    SensorDeviceClass,
    SensorStateClass,
)
from homeassistant.const import UnitOfTemperature, PERCENTAGE
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import (
    DOMAIN, CONF_ROOM_ID, CONF_ROOM_NAME,
    CONF_AWAY_TEMP, CONF_VACATION_TEMP,
    CONF_SUMMER_MODE_ENABLED, CONF_SUMMER_THRESHOLD,
    CONF_FROST_PROTECTION_TEMP, CONF_NIGHT_SETBACK_ENABLED,
    CONF_NIGHT_SETBACK_OFFSET, CONF_PREHEAT_MINUTES,
    CONF_PRESENCE_ENTITIES,
    CONF_BOILER_KW, CONF_SOLAR_ENTITY, CONF_SOLAR_SURPLUS_THRESHOLD, CONF_SOLAR_BOOST_TEMP,
    CONF_ENERGY_PRICE_ENTITY, CONF_ENERGY_PRICE_THRESHOLD, CONF_ENERGY_PRICE_ECO_OFFSET,
    CONF_FLOW_TEMP_ENTITY,
    DEFAULT_AWAY_TEMP, DEFAULT_VACATION_TEMP,
    DEFAULT_SUMMER_THRESHOLD, DEFAULT_FROST_PROTECTION_TEMP,
    DEFAULT_NIGHT_SETBACK_OFFSET, DEFAULT_PREHEAT_MINUTES,
    DEFAULT_BOILER_KW, DEFAULT_SOLAR_SURPLUS_THRESHOLD, DEFAULT_SOLAR_BOOST_TEMP,
    DEFAULT_ENERGY_PRICE_THRESHOLD, DEFAULT_ENERGY_PRICE_ECO_OFFSET,
)
from .coordinator import IHCCoordinator

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    coordinator: IHCCoordinator = hass.data[DOMAIN][entry.entry_id]
    entities: list = [
        IHCTotalDemandSensor(coordinator, entry),
        IHCOutdoorTempSensor(coordinator, entry),
        IHCCurveTargetSensor(coordinator, entry),
        IHCHeatingRuntimeSensor(coordinator, entry),
        IHCEnergyTodaySensor(coordinator, entry),
    ]
    for room in coordinator.get_rooms():
        entities.append(IHCRoomDemandSensor(coordinator, entry, room))
        entities.append(IHCRoomTargetTempSensor(coordinator, entry, room))
        entities.append(IHCRoomRuntimeSensor(coordinator, entry, room))
    async_add_entities(entities, update_before_add=True)


class _IHCBase(CoordinatorEntity):
    def __init__(self, coordinator: IHCCoordinator, entry: ConfigEntry) -> None:
        super().__init__(coordinator)
        self._entry = entry

    @property
    def device_info(self):
        return {
            "identifiers": {(DOMAIN, self._entry.entry_id)},
            "name": "Intelligent Heating Control",
            "manufacturer": "IHC",
            "model": "v1.0",
        }


# ------------------------------------------------------------------
# Global sensors
# ------------------------------------------------------------------

class IHCTotalDemandSensor(_IHCBase, SensorEntity):
    """Total / aggregated heating demand across all rooms."""

    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_native_unit_of_measurement = PERCENTAGE
    _attr_icon = "mdi:thermometer-lines"

    def __init__(self, coordinator: IHCCoordinator, entry: ConfigEntry) -> None:
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_total_demand"
        self._attr_name = "IHC Gesamtanforderung"

    @property
    def native_value(self) -> Optional[float]:
        if self.coordinator.data:
            return self.coordinator.data.get("total_demand")
        return None

    @property
    def extra_state_attributes(self) -> dict:
        d = self.coordinator.data or {}
        debug = d.get("debug", {})
        return {
            "rooms_demanding":        d.get("rooms_demanding", 0),
            "heating_active":         d.get("heating_active", False),
            "cooling_active":         d.get("cooling_active", False),
            "summer_mode":            d.get("summer_mode", False),
            "night_setback_active":   d.get("night_setback_active", False),
            "presence_away_active":   d.get("presence_away_active", False),
            "system_mode":            d.get("system_mode", "auto"),
            "heating_runtime_today":  d.get("heating_runtime_today", 0.0),
            # Controller settings (read by frontend panel)
            "demand_threshold":     debug.get("demand_threshold"),
            "demand_hysteresis":    debug.get("demand_hysteresis"),
            "min_on_time_minutes":  debug.get("min_on_time_minutes"),
            "min_off_time_minutes": debug.get("min_off_time_minutes"),
            "min_rooms_demand":     debug.get("min_rooms_demand"),
            # Global config settings (read by frontend panel for pre-populating forms)
            **self._get_global_config_attrs(),
        }


    def _get_global_config_attrs(self) -> dict:
        cfg = self.coordinator.get_config()
        return {
            "away_temp":                   cfg.get(CONF_AWAY_TEMP, DEFAULT_AWAY_TEMP),
            "vacation_temp":               cfg.get(CONF_VACATION_TEMP, DEFAULT_VACATION_TEMP),
            "summer_mode_enabled":         cfg.get(CONF_SUMMER_MODE_ENABLED, False),
            "summer_threshold":            cfg.get(CONF_SUMMER_THRESHOLD, DEFAULT_SUMMER_THRESHOLD),
            "frost_protection_temp":       cfg.get(CONF_FROST_PROTECTION_TEMP, DEFAULT_FROST_PROTECTION_TEMP),
            "night_setback_enabled":       cfg.get(CONF_NIGHT_SETBACK_ENABLED, False),
            "night_setback_offset":        cfg.get(CONF_NIGHT_SETBACK_OFFSET, DEFAULT_NIGHT_SETBACK_OFFSET),
            "preheat_minutes":             cfg.get(CONF_PREHEAT_MINUTES, DEFAULT_PREHEAT_MINUTES),
            "presence_entities":           cfg.get(CONF_PRESENCE_ENTITIES, []),
            "boiler_kw":                   cfg.get(CONF_BOILER_KW, DEFAULT_BOILER_KW),
            "solar_entity":                cfg.get(CONF_SOLAR_ENTITY, ""),
            "solar_surplus_threshold":     cfg.get(CONF_SOLAR_SURPLUS_THRESHOLD, DEFAULT_SOLAR_SURPLUS_THRESHOLD),
            "solar_boost_temp":            cfg.get(CONF_SOLAR_BOOST_TEMP, DEFAULT_SOLAR_BOOST_TEMP),
            "energy_price_entity":         cfg.get(CONF_ENERGY_PRICE_ENTITY, ""),
            "energy_price_threshold":      cfg.get(CONF_ENERGY_PRICE_THRESHOLD, DEFAULT_ENERGY_PRICE_THRESHOLD),
            "energy_price_eco_offset":     cfg.get(CONF_ENERGY_PRICE_ECO_OFFSET, DEFAULT_ENERGY_PRICE_ECO_OFFSET),
            "flow_temp_entity":            cfg.get(CONF_FLOW_TEMP_ENTITY, ""),
        }


class IHCOutdoorTempSensor(_IHCBase, SensorEntity):
    """Outdoor temperature (mirrored for easy access)."""

    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_device_class = SensorDeviceClass.TEMPERATURE
    _attr_native_unit_of_measurement = UnitOfTemperature.CELSIUS

    def __init__(self, coordinator: IHCCoordinator, entry: ConfigEntry) -> None:
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_outdoor_temp"
        self._attr_name = "IHC Außentemperatur"

    @property
    def native_value(self) -> Optional[float]:
        if self.coordinator.data:
            return self.coordinator.data.get("outdoor_temp")
        return None


class IHCCurveTargetSensor(_IHCBase, SensorEntity):
    """Current heating curve target temperature (before room offsets)."""

    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_device_class = SensorDeviceClass.TEMPERATURE
    _attr_native_unit_of_measurement = UnitOfTemperature.CELSIUS

    def __init__(self, coordinator: IHCCoordinator, entry: ConfigEntry) -> None:
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_curve_target"
        self._attr_name = "IHC Heizkurven-Zieltemperatur"

    @property
    def native_value(self) -> Optional[float]:
        if self.coordinator.data:
            return self.coordinator.data.get("curve_target")
        return None

    @property
    def extra_state_attributes(self) -> dict:
        cfg = self.coordinator.get_config()
        curve_data = cfg.get("heating_curve", {})
        return {
            "curve_points": curve_data.get("points", []),
        }


# ------------------------------------------------------------------
# Per-room sensors
# ------------------------------------------------------------------

class IHCRoomDemandSensor(_IHCBase, SensorEntity):
    """Heating demand for a single room (0-100 %)."""

    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_native_unit_of_measurement = PERCENTAGE
    _attr_icon = "mdi:thermometer-alert"

    def __init__(self, coordinator: IHCCoordinator, entry: ConfigEntry, room: dict) -> None:
        super().__init__(coordinator, entry)
        self._room_id = room[CONF_ROOM_ID]
        self._room_name = room.get(CONF_ROOM_NAME, self._room_id)
        self._attr_unique_id = f"{entry.entry_id}_room_{self._room_id}_demand"
        self._attr_name = f"IHC {self._room_name} Anforderung"

    @property
    def native_value(self) -> Optional[float]:
        if self.coordinator.data:
            room = self.coordinator.data.get("rooms", {}).get(self._room_id)
            if room:
                return room.get("demand", 0)
        return None

    @property
    def extra_state_attributes(self) -> dict:
        if self.coordinator.data:
            room = self.coordinator.data.get("rooms", {}).get(self._room_id, {})
            return {
                "current_temp": room.get("current_temp"),
                "target_temp": room.get("target_temp"),
                "window_open": room.get("window_open", False),
                "room_mode": room.get("room_mode", "auto"),
                "source": room.get("source", ""),
                "temp_history": room.get("temp_history", []),          # Roadmap 1.1
                "avg_warmup_minutes": room.get("avg_warmup_minutes"),  # Roadmap 1.1
            }
        return {}


class IHCRoomTargetTempSensor(_IHCBase, SensorEntity):
    """Calculated target temperature for a single room."""

    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_device_class = SensorDeviceClass.TEMPERATURE
    _attr_native_unit_of_measurement = UnitOfTemperature.CELSIUS

    def __init__(self, coordinator: IHCCoordinator, entry: ConfigEntry, room: dict) -> None:
        super().__init__(coordinator, entry)
        self._room_id = room[CONF_ROOM_ID]
        self._room_name = room.get(CONF_ROOM_NAME, self._room_id)
        self._attr_unique_id = f"{entry.entry_id}_room_{self._room_id}_target"
        self._attr_name = f"IHC {self._room_name} Zieltemperatur"

    @property
    def native_value(self) -> Optional[float]:
        if self.coordinator.data:
            room = self.coordinator.data.get("rooms", {}).get(self._room_id)
            if room:
                return room.get("target_temp")
        return None

    @property
    def extra_state_attributes(self) -> dict:
        if self.coordinator.data:
            room = self.coordinator.data.get("rooms", {}).get(self._room_id, {})
            return {
                "source": room.get("source", ""),
                "schedule_active": room.get("schedule_active", False),
                "curve_base": room.get("curve_base"),
                "room_offset": room.get("room_offset"),
                "schedule_base": room.get("schedule_base"),
                "schedule_offset": room.get("schedule_offset"),
                "period_start": room.get("period_start"),
                "period_end": room.get("period_end"),
                "night_setback": room.get("night_setback", 0.0),
            }
        return {}


class IHCHeatingRuntimeSensor(_IHCBase, SensorEntity):
    """Total heating system on-time today in minutes."""

    _attr_state_class = SensorStateClass.TOTAL_INCREASING
    _attr_native_unit_of_measurement = "min"
    _attr_icon = "mdi:timer-outline"

    def __init__(self, coordinator: IHCCoordinator, entry: ConfigEntry) -> None:
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_heating_runtime_today"
        self._attr_name = "IHC Heizlaufzeit heute"

    @property
    def native_value(self) -> Optional[float]:
        if self.coordinator.data:
            return self.coordinator.data.get("heating_runtime_today", 0.0)
        return None

    @property
    def extra_state_attributes(self) -> dict:
        d = self.coordinator.data or {}
        return {
            "heating_active": d.get("heating_active", False),
        }


class IHCEnergyTodaySensor(_IHCBase, SensorEntity):
    """Estimated energy consumption today in kWh (runtime × boiler_kw)."""

    _attr_state_class = SensorStateClass.TOTAL_INCREASING
    _attr_device_class = SensorDeviceClass.ENERGY
    _attr_native_unit_of_measurement = "kWh"
    _attr_icon = "mdi:lightning-bolt"

    def __init__(self, coordinator: IHCCoordinator, entry: ConfigEntry) -> None:
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_energy_today_kwh"
        self._attr_name = "IHC Energie heute"

    @property
    def native_value(self) -> Optional[float]:
        if self.coordinator.data:
            return self.coordinator.data.get("energy_today_kwh", 0.0)
        return None

    @property
    def extra_state_attributes(self) -> dict:
        d = self.coordinator.data or {}
        return {
            "solar_boost":           d.get("solar_boost", 0.0),
            "solar_power":           d.get("solar_power"),
            "energy_price":          d.get("energy_price"),
            "energy_price_eco_active": d.get("energy_price_eco_offset", 0.0) > 0,
            "flow_temp":             d.get("flow_temp"),
        }


class IHCRoomRuntimeSensor(_IHCBase, SensorEntity):
    """Heating demand runtime today for a single room in minutes."""

    _attr_state_class = SensorStateClass.TOTAL_INCREASING
    _attr_native_unit_of_measurement = "min"
    _attr_icon = "mdi:timer-sand"

    def __init__(self, coordinator: IHCCoordinator, entry: ConfigEntry, room: dict) -> None:
        super().__init__(coordinator, entry)
        self._room_id = room[CONF_ROOM_ID]
        self._room_name = room.get(CONF_ROOM_NAME, self._room_id)
        self._attr_unique_id = f"{entry.entry_id}_room_{self._room_id}_runtime"
        self._attr_name = f"IHC {self._room_name} Laufzeit heute"

    @property
    def native_value(self) -> Optional[float]:
        if self.coordinator.data:
            room = self.coordinator.data.get("rooms", {}).get(self._room_id)
            if room:
                return room.get("runtime_today_minutes", 0.0)
        return None
