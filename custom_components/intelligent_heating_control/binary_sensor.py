"""Binary sensor entities for IHC ventilation advice and CO2 warnings."""
from __future__ import annotations
import logging
from homeassistant.components.binary_sensor import BinarySensorEntity, BinarySensorDeviceClass
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import (
    DOMAIN,
    CONF_ROOM_ID,
    CONF_ROOM_NAME,
    CONF_CO2_THRESHOLD_BAD,
    DEFAULT_CO2_THRESHOLD_BAD,
)
from .coordinator import IHCCoordinator


def _room_device_info(entry_id: str, room_id: str, room_name: str) -> dict:
    """Return per-room device info linked to the hub device."""
    return {
        "identifiers": {(DOMAIN, f"{entry_id}_{room_id}")},
        "name": f"IHC {room_name}",
        "manufacturer": "IHC",
        "model": "Zimmer",
        "via_device": (DOMAIN, entry_id),
    }

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up IHC binary sensors from config entry."""
    coordinator: IHCCoordinator = hass.data[DOMAIN][entry.entry_id]
    rooms = coordinator.get_rooms()
    entities: list[BinarySensorEntity] = []
    for room in rooms:
        room_id = room.get(CONF_ROOM_ID)
        room_name = room.get(CONF_ROOM_NAME, room_id)
        if not room_id:
            continue
        has_humidity = bool(room.get("humidity_sensor"))
        has_co2      = bool(room.get("co2_sensor"))
        # Ventilation advice binary sensor: only useful when actual sensor data exists
        if has_humidity or has_co2:
            entities.append(
                IHCVentilationAdviceSensor(coordinator, entry, room_id, room_name)
            )
        # CO2 warning: only when CO2 sensor is configured
        if has_co2:
            entities.append(
                IHCCO2WarningSensor(coordinator, entry, room_id, room_name)
            )
    async_add_entities(entities, True)


class IHCVentilationAdviceSensor(CoordinatorEntity, BinarySensorEntity):
    """Binary sensor: True when ventilation is recommended (CO2 or humidity)."""

    _attr_has_entity_name = False

    def __init__(
        self,
        coordinator: IHCCoordinator,
        entry: ConfigEntry,
        room_id: str,
        room_name: str,
    ) -> None:
        super().__init__(coordinator)
        self._room_id = room_id
        self._room_name = room_name
        self._entry_id = entry.entry_id
        self._attr_name = f"IHC {room_name} Lüftungsempfehlung"
        self._attr_unique_id = f"{entry.entry_id}_{room_id}_ventilation_advice"

    @property
    def device_info(self):
        return _room_device_info(self._entry_id, self._room_id, self._room_name)

    @property
    def is_on(self) -> bool | None:
        data = self.coordinator.data or {}
        room = data.get(self._room_id, {})
        ventilation = room.get("ventilation", {})
        level = ventilation.get("level", "none")
        return level in ("urgent", "recommended")

    @property
    def extra_state_attributes(self) -> dict:
        data = self.coordinator.data or {}
        room = data.get(self._room_id, {})
        ventilation = room.get("ventilation", {})
        return {
            "level": ventilation.get("level", "none"),
            "score": ventilation.get("score", 0),
            "reasons": ventilation.get("reasons", []),
            "co2_ppm": ventilation.get("co2_ppm"),
            "room_humidity": ventilation.get("room_humidity"),
            "room_id": self._room_id,
        }

    @property
    def icon(self) -> str:
        if self.is_on:
            return "mdi:air-filter"
        return "mdi:check-circle-outline"


class IHCCO2WarningSensor(CoordinatorEntity, BinarySensorEntity):
    """Binary sensor: True when CO2 level exceeds the bad threshold."""

    _attr_device_class = BinarySensorDeviceClass.GAS
    _attr_has_entity_name = False

    def __init__(
        self,
        coordinator: IHCCoordinator,
        entry: ConfigEntry,
        room_id: str,
        room_name: str,
    ) -> None:
        super().__init__(coordinator)
        self._room_id = room_id
        self._room_name = room_name
        self._entry = entry
        self._attr_name = f"IHC {room_name} CO2-Warnung"
        self._attr_unique_id = f"{entry.entry_id}_{room_id}_co2_warning"

    @property
    def device_info(self):
        return _room_device_info(self._entry.entry_id, self._room_id, self._room_name)

    @property
    def is_on(self) -> bool | None:
        data = self.coordinator.data or {}
        room = data.get(self._room_id, {})
        ventilation = room.get("ventilation", {})
        co2 = ventilation.get("co2_ppm")
        if co2 is None:
            return None
        rooms = self.coordinator.get_rooms()
        room_cfg = next(
            (r for r in rooms if r.get(CONF_ROOM_ID) == self._room_id), {}
        )
        threshold = room_cfg.get(CONF_CO2_THRESHOLD_BAD, DEFAULT_CO2_THRESHOLD_BAD)
        return float(co2) >= float(threshold)

    @property
    def extra_state_attributes(self) -> dict:
        data = self.coordinator.data or {}
        room = data.get(self._room_id, {})
        ventilation = room.get("ventilation", {})
        rooms = self.coordinator.get_rooms()
        room_cfg = next(
            (r for r in rooms if r.get(CONF_ROOM_ID) == self._room_id), {}
        )
        return {
            "co2_ppm": ventilation.get("co2_ppm"),
            "threshold": room_cfg.get(CONF_CO2_THRESHOLD_BAD, DEFAULT_CO2_THRESHOLD_BAD),
            "room_id": self._room_id,
        }

    @property
    def icon(self) -> str:
        if self.is_on:
            return "mdi:molecule-co2"
        return "mdi:leaf"
