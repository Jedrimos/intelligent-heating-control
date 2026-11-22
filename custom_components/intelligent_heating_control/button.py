"""Button platform - global actions (Backlog 2026-11-02: globaler Reset-Button)."""
from __future__ import annotations

import logging

from homeassistant.components.button import ButtonEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import CONF_ROOM_ID, CONF_ROOM_NAME, DOMAIN
from .coordinator import IHCCoordinator

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    coordinator: IHCCoordinator = hass.data[DOMAIN][entry.entry_id]
    entities = [IHCResetAllRoomsButton(coordinator, entry)]
    for room in coordinator.get_rooms():
        for feeling in ("cold", "warm"):
            entities.append(IHCFeelButton(coordinator, entry, room, feeling))
    async_add_entities(entities)


class IHCResetAllRoomsButton(CoordinatorEntity, ButtonEntity):
    """Resets every room to AUTO mode in one press (child-locked rooms are skipped -
    see coordinator.async_reset_all_rooms / CLAUDE.md Kapitel 15/Backlog 2026-11-02)."""

    _attr_has_entity_name = False
    _attr_icon = "mdi:restore"

    def __init__(self, coordinator: IHCCoordinator, entry: ConfigEntry) -> None:
        super().__init__(coordinator)
        self._entry = entry
        self._attr_unique_id = f"{entry.entry_id}_reset_all_rooms"
        self._attr_name = "IHC Alle Zimmer zurücksetzen"

    @property
    def device_info(self):
        return {
            "identifiers": {(DOMAIN, self._entry.entry_id)},
            "name": "Intelligent Heating Control",
            "manufacturer": "IHC",
            "model": "v1.0",
        }

    async def async_press(self) -> None:
        await self.coordinator.async_reset_all_rooms()


class IHCFeelButton(CoordinatorEntity, ButtonEntity):
    """v2.6 – "Mir ist kalt" / "Mir ist warm" per room (±1 °C for 2 h, IHC learns from it).
    Works from dashboards, NFC tags and voice assistants."""

    _attr_has_entity_name = False

    def __init__(self, coordinator: IHCCoordinator, entry: ConfigEntry, room: dict, feeling: str) -> None:
        super().__init__(coordinator)
        self._entry = entry
        self._room_id = room[CONF_ROOM_ID]
        self._room_name = room.get(CONF_ROOM_NAME, self._room_id)
        self._feeling = feeling
        self._attr_unique_id = f"{entry.entry_id}_room_{self._room_id}_feel_{feeling}"
        self._attr_name = f"IHC {self._room_name} " + ("Mir ist kalt" if feeling == "cold" else "Mir ist warm")
        self._attr_icon = "mdi:snowflake-thermometer" if feeling == "cold" else "mdi:sun-thermometer"

    @property
    def device_info(self):
        return {
            "identifiers": {(DOMAIN, f"{self._entry.entry_id}_{self._room_id}")},
            "name": f"IHC {self._room_name}",
            "manufacturer": "IHC",
            "model": "Zimmer",
            "via_device": (DOMAIN, self._entry.entry_id),
        }

    async def async_press(self) -> None:
        await self.coordinator.async_feel(self._room_id, self._feeling)
