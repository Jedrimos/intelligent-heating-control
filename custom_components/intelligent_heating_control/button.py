"""Button platform - global actions (Backlog 2026-11-02: globaler Reset-Button)."""
from __future__ import annotations

import logging

from homeassistant.components.button import ButtonEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN
from .coordinator import IHCCoordinator

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    coordinator: IHCCoordinator = hass.data[DOMAIN][entry.entry_id]
    async_add_entities([
        IHCResetAllRoomsButton(coordinator, entry),
    ])


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
