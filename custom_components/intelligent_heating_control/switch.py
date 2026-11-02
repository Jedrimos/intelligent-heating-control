"""Switch platform - heating active state (read-only mirror)."""
from __future__ import annotations

import logging
from typing import Any

from homeassistant.components.switch import SwitchEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN, SYSTEM_MODE_OFF, SYSTEM_MODE_AUTO, CONF_ROOM_ID, CONF_ROOM_NAME
from .coordinator import IHCCoordinator

_LOGGER = logging.getLogger(__name__)


def _room_device_info(entry_id: str, room_id: str, room_name: str) -> dict:
    """Return per-room device info linked to the hub device."""
    return {
        "identifiers": {(DOMAIN, f"{entry_id}_{room_id}")},
        "name": f"IHC {room_name}",
        "manufacturer": "IHC",
        "model": "Zimmer",
        "via_device": (DOMAIN, entry_id),
    }


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    coordinator: IHCCoordinator = hass.data[DOMAIN][entry.entry_id]
    entities: list = [
        IHCHeatingSwitch(coordinator, entry),
    ]
    for room in coordinator.get_rooms():
        entities.append(IHCRoomChildLockSwitch(coordinator, entry, room))
    async_add_entities(entities, update_before_add=True)


class IHCHeatingSwitch(CoordinatorEntity, SwitchEntity):
    """
    Mirror of the heating active state (ON whenever any room's TRV is heating).
    Turning it OFF forces the system into OFF mode.
    Turning it ON returns to AUTO mode.
    """

    _attr_icon = "mdi:radiator"
    _attr_has_entity_name = False

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


class IHCRoomChildLockSwitch(CoordinatorEntity, SwitchEntity):
    """Backlog 2026-11-02 – Kindersicherung pro Zimmer.

    ON = IHC must not touch this room's TRVs or mode at all - no schedule, no mode
    auto-reset, no window/Sommerautomatik shutoff, nothing (enforced in
    coordinator._update_phase_apply_trv_setpoints - see CLAUDE.md Kapitel 15 Phase D).
    Runtime state like room_mode, not config_flow - meant to be flipped often.
    """

    _attr_has_entity_name = False
    _attr_icon = "mdi:lock"

    def __init__(self, coordinator: IHCCoordinator, entry: ConfigEntry, room: dict) -> None:
        super().__init__(coordinator)
        self._room_id = room[CONF_ROOM_ID]
        self._room_name = room.get(CONF_ROOM_NAME, self._room_id)
        self._entry_id = entry.entry_id
        self._attr_unique_id = f"{entry.entry_id}_room_{self._room_id}_child_lock"
        self._attr_name = f"IHC {self._room_name} Kindersicherung"

    @property
    def device_info(self):
        return _room_device_info(self._entry_id, self._room_id, self._room_name)

    @property
    def is_on(self) -> bool:
        return self.coordinator.is_room_child_locked(self._room_id)

    async def async_turn_on(self, **kwargs: Any) -> None:
        self.coordinator.set_child_lock(self._room_id, True)

    async def async_turn_off(self, **kwargs: Any) -> None:
        self.coordinator.set_child_lock(self._room_id, False)
