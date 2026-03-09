"""Intelligent Heating Control - Home Assistant Integration."""
from __future__ import annotations

import logging
from typing import Any

from homeassistant.components import frontend
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.helpers.typing import ConfigType

from .const import (
    DOMAIN,
    PLATFORMS,
    PANEL_URL,
    PANEL_TITLE,
    PANEL_ICON,
    SERVICE_ADD_ROOM,
    SERVICE_REMOVE_ROOM,
    SERVICE_UPDATE_ROOM,
    SERVICE_SET_ROOM_MODE,
    SERVICE_SET_SYSTEM_MODE,
    SERVICE_BOOST_ROOM,
    CONF_ROOM_ID,
    CONF_ROOM_NAME,
    CONF_TEMP_SENSOR,
    CONF_VALVE_ENTITY,
    CONF_ROOM_OFFSET,
    CONF_DEADBAND,
    CONF_WEIGHT,
    CONF_SCHEDULES,
    CONF_WINDOW_SENSOR,
    CONF_COMFORT_TEMP,
    CONF_ECO_TEMP,
    CONF_SLEEP_TEMP,
    CONF_AWAY_TEMP_ROOM,
    CONF_MIN_TEMP,
    CONF_MAX_TEMP,
    DEFAULT_DEADBAND,
    DEFAULT_WEIGHT,
    DEFAULT_COMFORT_TEMP,
    DEFAULT_ECO_TEMP,
    DEFAULT_SLEEP_TEMP,
    DEFAULT_AWAY_TEMP_ROOM,
    DEFAULT_MIN_TEMP,
    DEFAULT_MAX_TEMP,
    ROOM_MODES,
    SYSTEM_MODES,
    CONF_SHOW_PANEL,
)
from .coordinator import IHCCoordinator

_LOGGER = logging.getLogger(__name__)


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up the integration from YAML (not used, but required)."""
    hass.data.setdefault(DOMAIN, {})
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Intelligent Heating Control from a config entry."""
    hass.data.setdefault(DOMAIN, {})

    coordinator = IHCCoordinator(hass, entry)
    await coordinator.async_config_entry_first_refresh()

    hass.data[DOMAIN][entry.entry_id] = coordinator

    # Register entity platforms
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    # Register the custom frontend panel (only if not hidden by user)
    cfg = dict(entry.data)
    cfg.update(entry.options)
    if cfg.get(CONF_SHOW_PANEL, True):
        await _async_register_panel(hass)

    # Register HA services
    _register_services(hass, coordinator, entry)

    # Reload when options change
    entry.async_on_unload(entry.add_update_listener(_async_reload_entry))

    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    unloaded = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unloaded:
        hass.data[DOMAIN].pop(entry.entry_id, None)

    # Remove panel if no more entries
    if not hass.data[DOMAIN]:
        frontend.async_remove_panel(hass, PANEL_URL)

    return unloaded


async def _async_reload_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Reload the config entry when options change."""
    await hass.config_entries.async_reload(entry.entry_id)


async def _async_register_panel(hass: HomeAssistant) -> None:
    """Register the custom frontend panel."""
    import os
    from pathlib import Path

    panel_dir = Path(__file__).parent / "frontend"
    panel_file = panel_dir / "ihc-panel.js"

    if not panel_file.exists():
        _LOGGER.warning("IHC frontend panel file not found: %s", panel_file)
        return

    # Register static path
    await hass.http.async_register_static_paths([
        StaticPathConfig("/ihc_static", str(panel_dir), cache_headers=False)
    ])

    # Register as custom panel
    frontend.async_register_built_in_panel(
        hass,
        component_name="custom",
        sidebar_title=PANEL_TITLE,
        sidebar_icon=PANEL_ICON,
        frontend_url_path=PANEL_URL,
        config={
            "_panel_custom": {
                "name": "ihc-panel",
                "js_url": "/ihc_static/ihc-panel.js",
                "embed_iframe": False,
                "trust_external_script": True,
            }
        },
        require_admin=False,
    )


def _register_services(hass: HomeAssistant, coordinator: IHCCoordinator, entry: ConfigEntry) -> None:
    """Register custom HA services."""

    async def handle_add_room(call: ServiceCall) -> None:
        room_config = {
            CONF_ROOM_NAME: call.data.get(CONF_ROOM_NAME, "New Room"),
            CONF_TEMP_SENSOR: call.data.get(CONF_TEMP_SENSOR, ""),
            CONF_VALVE_ENTITY: call.data.get(CONF_VALVE_ENTITY, ""),
            CONF_ROOM_OFFSET: float(call.data.get(CONF_ROOM_OFFSET, 0.0)),
            CONF_DEADBAND: float(call.data.get(CONF_DEADBAND, DEFAULT_DEADBAND)),
            CONF_WEIGHT: float(call.data.get(CONF_WEIGHT, DEFAULT_WEIGHT)),
            CONF_COMFORT_TEMP: float(call.data.get(CONF_COMFORT_TEMP, DEFAULT_COMFORT_TEMP)),
            CONF_ECO_TEMP: float(call.data.get(CONF_ECO_TEMP, DEFAULT_ECO_TEMP)),
            CONF_SLEEP_TEMP: float(call.data.get(CONF_SLEEP_TEMP, DEFAULT_SLEEP_TEMP)),
            CONF_AWAY_TEMP_ROOM: float(call.data.get(CONF_AWAY_TEMP_ROOM, DEFAULT_AWAY_TEMP_ROOM)),
            CONF_WINDOW_SENSOR: call.data.get(CONF_WINDOW_SENSOR, ""),
            CONF_MIN_TEMP: float(call.data.get(CONF_MIN_TEMP, DEFAULT_MIN_TEMP)),
            CONF_MAX_TEMP: float(call.data.get(CONF_MAX_TEMP, DEFAULT_MAX_TEMP)),
            CONF_SCHEDULES: call.data.get(CONF_SCHEDULES, []),
        }
        await coordinator.async_add_room(room_config)

    async def handle_remove_room(call: ServiceCall) -> None:
        room_id = call.data.get(CONF_ROOM_ID)
        if room_id:
            await coordinator.async_remove_room(room_id)

    async def handle_update_room(call: ServiceCall) -> None:
        room_id = call.data.get(CONF_ROOM_ID)
        if room_id:
            updates = {k: v for k, v in call.data.items() if k != CONF_ROOM_ID}
            await coordinator.async_update_room(room_id, updates)

    async def handle_set_room_mode(call: ServiceCall) -> None:
        room_id = call.data.get(CONF_ROOM_ID)
        mode = call.data.get("mode", "auto")
        if room_id and mode in ROOM_MODES:
            coordinator.set_room_mode(room_id, mode)

    async def handle_set_system_mode(call: ServiceCall) -> None:
        mode = call.data.get("mode", "auto")
        if mode in SYSTEM_MODES:
            coordinator.set_system_mode(mode)

    async def handle_boost_room(call: ServiceCall) -> None:
        room_id = call.data.get(CONF_ROOM_ID)
        duration = int(call.data.get("duration_minutes", 60))
        cancel = bool(call.data.get("cancel", False))
        if room_id:
            if cancel:
                coordinator.cancel_room_boost(room_id)
            else:
                coordinator.set_room_boost(room_id, duration)

    async def handle_reload(call: ServiceCall) -> None:
        await hass.config_entries.async_reload(entry.entry_id)

    if not hass.services.has_service(DOMAIN, SERVICE_ADD_ROOM):
        hass.services.async_register(DOMAIN, SERVICE_ADD_ROOM, handle_add_room)
        hass.services.async_register(DOMAIN, SERVICE_REMOVE_ROOM, handle_remove_room)
        hass.services.async_register(DOMAIN, SERVICE_UPDATE_ROOM, handle_update_room)
        hass.services.async_register(DOMAIN, SERVICE_SET_ROOM_MODE, handle_set_room_mode)
        hass.services.async_register(DOMAIN, SERVICE_SET_SYSTEM_MODE, handle_set_system_mode)
        hass.services.async_register(DOMAIN, SERVICE_BOOST_ROOM, handle_boost_room)
        hass.services.async_register(DOMAIN, "reload", handle_reload)
