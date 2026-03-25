"""Number platform - per-room offset adjustment at runtime."""
from __future__ import annotations

import logging

from homeassistant.components.number import NumberEntity, NumberMode
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import (
    DOMAIN,
    CONF_ROOM_ID,
    CONF_ROOM_NAME,
    CONF_ROOM_OFFSET,
)
from .coordinator import IHCCoordinator

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    coordinator: IHCCoordinator = hass.data[DOMAIN][entry.entry_id]
    entities = []
    for room in coordinator.get_rooms():
        entities.append(IHCRoomOffsetNumber(coordinator, entry, room))
    async_add_entities(entities, update_before_add=True)


class IHCRoomOffsetNumber(CoordinatorEntity, NumberEntity):
    """
    Adjustable temperature offset for a room.
    Changes are applied immediately and persisted to config options.
    """

    _attr_mode = NumberMode.BOX
    _attr_native_min_value = -5.0
    _attr_native_max_value = 5.0
    _attr_native_step = 0.5
    _attr_native_unit_of_measurement = "°C"
    _attr_icon = "mdi:thermometer-plus"

    def __init__(self, coordinator: IHCCoordinator, entry: ConfigEntry, room: dict) -> None:
        super().__init__(coordinator)
        self._entry = entry
        self._room_id = room[CONF_ROOM_ID]
        self._room_name = room.get(CONF_ROOM_NAME, self._room_id)
        self._attr_unique_id = f"{entry.entry_id}_room_{self._room_id}_offset"
        self._attr_name = f"IHC {self._room_name} Offset"

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
    def native_value(self) -> float:
        room = self.coordinator.get_room_config(self._room_id)
        if room:
            return float(room.get(CONF_ROOM_OFFSET, 0.0))
        return 0.0

    async def async_set_native_value(self, value: float) -> None:
        """Persist the new offset to the room config."""
        await self.coordinator.async_update_room(
            self._room_id, {CONF_ROOM_OFFSET: value}
        )
