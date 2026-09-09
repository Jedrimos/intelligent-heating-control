"""Switch platform - heating active state (read-only mirror)."""
from __future__ import annotations

import logging
from typing import Any

from homeassistant.components.switch import SwitchEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN, SYSTEM_MODE_OFF, SYSTEM_MODE_AUTO
from .coordinator import IHCCoordinator

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    coordinator: IHCCoordinator = hass.data[DOMAIN][entry.entry_id]
    async_add_entities([
        IHCHeatingSwitch(coordinator, entry),
    ], update_before_add=True)


class IHCHeatingSwitch(CoordinatorEntity, SwitchEntity):
    """
    Mirror of the heating active state (ON whenever any room's TRV is heating).
    Turning it OFF forces the system into OFF mode.
    Turning it ON returns to AUTO mode.
    """

    _attr_icon = "mdi:radiator"

    def __init__(self, coordinator: IHCCoordinator, entry: ConfigEntry) -> None:
        super().__init__(coordinator)
        self._entry = entry
        self._attr_unique_id = f"{entry.entry_id}_heating_switch"
        self._attr_name = "IHC Heizung aktiv"

    @property
    def device_info(self):
        return {
            "identifiers": {(DOMAIN, self._entry.entry_id)},
            "name": "Intelligent Heating Control",
            "manufacturer": "IHC",
            "model": "v1.0",
        }

    @property
    def is_on(self) -> bool:
        if self.coordinator.data:
            return bool(self.coordinator.data.get("heating_active", False))
        return False

    @property
    def extra_state_attributes(self) -> dict:
        d = self.coordinator.data or {}
        return {
            "total_demand": d.get("total_demand", 0),
            "rooms_demanding": d.get("rooms_demanding", 0),
            "system_mode": d.get("system_mode", "auto"),
        }

    async def async_turn_on(self, **kwargs: Any) -> None:
        self.coordinator.set_system_mode(SYSTEM_MODE_AUTO)

    async def async_turn_off(self, **kwargs: Any) -> None:
        self.coordinator.set_system_mode(SYSTEM_MODE_OFF)
