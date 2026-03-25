"""Select platform - system mode selector."""
from __future__ import annotations

import logging
from typing import Optional

from homeassistant.components.select import SelectEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import (
    DOMAIN,
    SYSTEM_MODES,
    SYSTEM_MODE_AUTO,
    CONF_ROOM_ID,
    CONF_ROOM_NAME,
    ROOM_MODES,
    ROOM_MODE_AUTO,
)
from .coordinator import IHCCoordinator

_LOGGER = logging.getLogger(__name__)

SYSTEM_MODE_LABELS = {
    "auto": "Automatisch",
    "heat": "Heizen",
    "cool": "Kühlen",
    "off": "Aus",
    "away": "Abwesend",
    "vacation": "Urlaub",
    "guest": "Gäste-Modus",
}

ROOM_MODE_LABELS = {
    "auto": "Automatisch",
    "comfort": "Komfort",
    "eco": "Eco",
    "sleep": "Schlafen",
    "away": "Abwesend",
    "off": "Aus",
    "manual": "Manuell",
}


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    coordinator: IHCCoordinator = hass.data[DOMAIN][entry.entry_id]
    entities: list = [IHCSystemModeSelect(coordinator, entry)]
    for room in coordinator.get_rooms():
        entities.append(IHCRoomModeSelect(coordinator, entry, room))
    async_add_entities(entities, update_before_add=True)


class IHCSystemModeSelect(CoordinatorEntity, SelectEntity):
    """Select entity for the global system mode."""

    _attr_icon = "mdi:home-thermometer"

    def __init__(self, coordinator: IHCCoordinator, entry: ConfigEntry) -> None:
        super().__init__(coordinator)
        self._entry = entry
        self._attr_unique_id = f"{entry.entry_id}_system_mode"
        self._attr_name = "IHC Systemmodus"
        self._attr_options = [SYSTEM_MODE_LABELS[m] for m in SYSTEM_MODES]

    @property
    def device_info(self):
        return {
            "identifiers": {(DOMAIN, self._entry.entry_id)},
            "name": "Intelligent Heating Control",
            "manufacturer": "IHC",
            "model": "v1.0",
        }

    @property
    def current_option(self) -> Optional[str]:
        mode = self.coordinator.get_system_mode()
        return SYSTEM_MODE_LABELS.get(mode, SYSTEM_MODE_LABELS[SYSTEM_MODE_AUTO])

    async def async_select_option(self, option: str) -> None:
        label_to_mode = {v: k for k, v in SYSTEM_MODE_LABELS.items()}
        mode = label_to_mode.get(option, SYSTEM_MODE_AUTO)
        self.coordinator.set_system_mode(mode)


class IHCRoomModeSelect(CoordinatorEntity, SelectEntity):
    """Select entity for a room's operation mode."""

    _attr_icon = "mdi:thermostat"

    def __init__(self, coordinator: IHCCoordinator, entry: ConfigEntry, room: dict) -> None:
        super().__init__(coordinator)
        self._entry = entry
        self._room_id = room[CONF_ROOM_ID]
        self._room_name = room.get(CONF_ROOM_NAME, self._room_id)
        self._attr_unique_id = f"{entry.entry_id}_room_{self._room_id}_mode"
        self._attr_name = f"IHC {self._room_name} Modus"
        self._attr_options = [ROOM_MODE_LABELS[m] for m in ROOM_MODES]

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
    def current_option(self) -> Optional[str]:
        mode = self.coordinator.get_room_mode(self._room_id)
        return ROOM_MODE_LABELS.get(mode, ROOM_MODE_LABELS[ROOM_MODE_AUTO])

    async def async_select_option(self, option: str) -> None:
        label_to_mode = {v: k for k, v in ROOM_MODE_LABELS.items()}
        mode = label_to_mode.get(option, ROOM_MODE_AUTO)
        self.coordinator.set_room_mode(self._room_id, mode)
