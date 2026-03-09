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

from .const import DOMAIN, CONF_ROOM_ID, CONF_ROOM_NAME
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
