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
    ATTR_DEMAND,
    ATTR_SCHEDULE_ACTIVE,
    ATTR_WINDOW_OPEN,
    ATTR_ROOM_MODE,
    ATTR_OFFSET,
)
from .coordinator import IHCCoordinator

_LOGGER = logging.getLogger(__name__)

# Map HA preset names to our room modes
PRESET_TO_MODE = {
    "Auto": ROOM_MODE_AUTO,
    "Comfort": ROOM_MODE_COMFORT,
    "Eco": ROOM_MODE_ECO,
    "Sleep": ROOM_MODE_SLEEP,
    "Away": ROOM_MODE_AWAY,
    "Manual": ROOM_MODE_MANUAL,
}
MODE_TO_PRESET = {v: k for k, v in PRESET_TO_MODE.items()}

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
    _attr_preset_modes = list(PRESET_TO_MODE.keys())
    _attr_supported_features = (
        ClimateEntityFeature.TARGET_TEMPERATURE
        | ClimateEntityFeature.PRESET_MODE
    )

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
            "identifiers": {(DOMAIN, self._entry.entry_id)},
            "name": "Intelligent Heating Control",
            "manufacturer": "IHC",
            "model": "v1.0",
        }

    @property
    def _room_data(self) -> Optional[dict]:
        if self.coordinator.data:
            return self.coordinator.data.get("rooms", {}).get(self._room_id)
        return None

    @property
    def current_temperature(self) -> Optional[float]:
        d = self._room_data
        return d["current_temp"] if d else None

    @property
    def target_temperature(self) -> Optional[float]:
        d = self._room_data
        return d["target_temp"] if d else None

    @property
    def hvac_mode(self) -> HVACMode:
        mode = self.coordinator.get_room_mode(self._room_id)
        if mode == ROOM_MODE_OFF:
            return HVACMode.OFF
        return HVACMode.HEAT

    @property
    def hvac_action(self) -> Optional[HVACAction]:
        d = self._room_data
        if d is None:
            return None
        if d.get("room_mode") == ROOM_MODE_OFF:
            return HVACAction.OFF
        demand = d.get("demand", 0)
        if demand > 0 and self.coordinator.data.get("heating_active"):
            return HVACAction.HEATING
        if self.coordinator.data and self.coordinator.data.get("cooling_active"):
            return HVACAction.COOLING
        return HVACAction.IDLE

    @property
    def preset_mode(self) -> Optional[str]:
        mode = self.coordinator.get_room_mode(self._room_id)
        return MODE_TO_PRESET.get(mode, "Auto")

    @property
    def extra_state_attributes(self) -> dict:
        d = self._room_data or {}
        return {
            ATTR_DEMAND: d.get("demand", 0),
            ATTR_SCHEDULE_ACTIVE: d.get("schedule_active", False),
            ATTR_WINDOW_OPEN: d.get("window_open", False),
            ATTR_ROOM_MODE: d.get("room_mode", ROOM_MODE_AUTO),
            "source": d.get("source", ""),
            "room_id": self._room_id,
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
        mode = PRESET_TO_MODE.get(preset_mode, ROOM_MODE_AUTO)
        self.coordinator.set_room_mode(self._room_id, mode)
