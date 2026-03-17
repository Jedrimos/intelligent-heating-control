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
    SERVICE_UPDATE_GLOBAL_SETTINGS,
    SERVICE_SET_ROOM_MODE,
    SERVICE_SET_SYSTEM_MODE,
    SERVICE_BOOST_ROOM,
    SERVICE_RELOAD,
    SERVICE_EXPORT_CONFIG,
    SERVICE_ACTIVATE_GUEST_MODE,
    SERVICE_DEACTIVATE_GUEST_MODE,
    SERVICE_RESET_STATS,
    CONF_ROOM_ID,
    CONF_ROOM_NAME,
    CONF_TEMP_SENSOR,
    CONF_VALVE_ENTITY,
    CONF_ROOM_OFFSET,
    CONF_DEADBAND,
    CONF_WEIGHT,
    CONF_SCHEDULES,
    CONF_WINDOW_SENSOR,
    CONF_WINDOW_SENSORS,
    CONF_VALVE_ENTITIES,
    CONF_COMFORT_TEMP,
    CONF_AWAY_TEMP_ROOM,
    CONF_MIN_TEMP,
    CONF_MAX_TEMP,
    DEFAULT_DEADBAND,
    DEFAULT_WEIGHT,
    DEFAULT_COMFORT_TEMP,
    DEFAULT_AWAY_TEMP_ROOM,
    DEFAULT_MIN_TEMP,
    DEFAULT_MAX_TEMP,
    ROOM_MODES,
    SYSTEM_MODES,
    CONF_SHOW_PANEL,
    CONF_HA_SCHEDULES,
    CONF_HUMIDITY_SENSOR,
    CONF_MOLD_PROTECTION_ENABLED,
    DEFAULT_MOLD_PROTECTION_ENABLED,
    CONF_CO2_SENSOR,
    CONF_CO2_THRESHOLD_GOOD,
    CONF_CO2_THRESHOLD_BAD,
    DEFAULT_CO2_THRESHOLD_GOOD,
    DEFAULT_CO2_THRESHOLD_BAD,
    CONF_RADIATOR_KW,
    CONF_HKV_SENSOR,
    CONF_HKV_FACTOR,
    DEFAULT_RADIATOR_KW,
    DEFAULT_HKV_FACTOR,
    CONF_ECO_OFFSET,
    CONF_SLEEP_OFFSET,
    CONF_AWAY_OFFSET,
    CONF_ECO_MAX_TEMP,
    CONF_SLEEP_MAX_TEMP,
    CONF_AWAY_MAX_TEMP,
    CONF_HA_SCHEDULE_OFF_MODE,
    DEFAULT_ECO_OFFSET,
    DEFAULT_SLEEP_OFFSET,
    DEFAULT_AWAY_OFFSET,
    DEFAULT_ECO_MAX_TEMP,
    DEFAULT_SLEEP_MAX_TEMP,
    DEFAULT_AWAY_MAX_TEMP,
    DEFAULT_HA_SCHEDULE_OFF_MODE,
    CONF_WINDOW_REACTION_TIME,
    CONF_WINDOW_CLOSE_DELAY,
    CONF_ROOM_QM,
    CONF_ABSOLUTE_MIN_TEMP,
    CONF_ROOM_PREHEAT_MINUTES,
    CONF_ROOM_PRESENCE_ENTITIES,
    CONF_BOOST_TEMP,
    CONF_BOOST_DEFAULT_DURATION,
    DEFAULT_WINDOW_REACTION_TIME,
    DEFAULT_WINDOW_CLOSE_DELAY,
    DEFAULT_ROOM_QM,
    DEFAULT_ABSOLUTE_MIN_TEMP,
    DEFAULT_ROOM_PREHEAT_MINUTES,
    DEFAULT_BOOST_DEFAULT_DURATION,
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
    await coordinator.async_load_runtime_state()
    await coordinator.async_config_entry_first_refresh()

    hass.data[DOMAIN][entry.entry_id] = coordinator

    # Register entity platforms
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    # Register the custom frontend panel (only if not hidden by user)
    cfg = dict(entry.data)
    cfg.update(entry.options)
    if cfg.get(CONF_SHOW_PANEL, True):
        try:
            await _async_register_panel(hass)
        except Exception:  # noqa: BLE001
            _LOGGER.warning(
                "IHC: Panel registration failed – integration will still work, "
                "but the custom panel may not appear in the sidebar.",
                exc_info=True,
            )

    # Register HA services (always fresh, so the current coordinator is used)
    _register_services(hass, coordinator, entry)

    # Reload when options change (e.g. from HA options flow)
    entry.async_on_unload(entry.add_update_listener(_async_reload_entry))

    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    # Unregister services so they are re-registered with the new coordinator on reload
    for service in [
        SERVICE_ADD_ROOM, SERVICE_REMOVE_ROOM, SERVICE_UPDATE_ROOM,
        SERVICE_SET_ROOM_MODE, SERVICE_SET_SYSTEM_MODE, SERVICE_BOOST_ROOM,
        SERVICE_RELOAD, SERVICE_EXPORT_CONFIG, SERVICE_UPDATE_GLOBAL_SETTINGS,
        SERVICE_ACTIVATE_GUEST_MODE, SERVICE_DEACTIVATE_GUEST_MODE, SERVICE_RESET_STATS,
    ]:
        hass.services.async_remove(DOMAIN, service)

    unloaded = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unloaded:
        hass.data[DOMAIN].pop(entry.entry_id, None)

    # Remove panel if no more entries
    if not hass.data[DOMAIN]:
        frontend.async_remove_panel(hass, PANEL_URL)

    return unloaded


async def _async_reload_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Reload the config entry when options change (e.g. from HA options flow).

    Suppressed when the coordinator itself triggers an internal options update
    (add/remove/update room, global settings) to avoid redundant full reloads.
    """
    coordinator = hass.data.get(DOMAIN, {}).get(entry.entry_id)
    if coordinator is not None and getattr(coordinator, "_suppress_reload", False):
        return
    await hass.config_entries.async_reload(entry.entry_id)


async def _async_register_panel(hass: HomeAssistant) -> None:
    """Register the custom frontend panel."""
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

    # Auto-register Lovelace custom cards as resources (storage mode only).
    # In YAML Lovelace mode this is a no-op; users must add resources manually.
    await _async_register_lovelace_cards(hass)


async def _async_register_lovelace_cards(hass: HomeAssistant) -> None:
    """Register IHC custom Lovelace cards as resources (storage Lovelace only)."""
    card_urls = [
        "/ihc_static/ihc-room-card.js",
        "/ihc_static/ihc-dashboard-card.js",
    ]
    try:
        lovelace = hass.data.get("lovelace")
        if lovelace is None:
            return
        resources = getattr(lovelace, "resources", None)
        if resources is None:
            return
        await resources.async_load()
        existing = {r["url"] for r in resources.async_items()}
        for url in card_urls:
            if url not in existing:
                await resources.async_create_item({"res_type": "module", "url": url})
                _LOGGER.debug("IHC: registered Lovelace resource %s", url)
    except Exception:  # noqa: BLE001
        _LOGGER.info(
            "IHC: Could not auto-register Lovelace card resources "
            "(YAML Lovelace mode?). Add these URLs manually under "
            "Settings → Dashboards → Resources: %s",
            card_urls,
        )


def _register_services(hass: HomeAssistant, coordinator: IHCCoordinator, entry: ConfigEntry) -> None:
    """Register custom HA services."""

    async def handle_add_room(call: ServiceCall) -> None:
        room_config = {
            CONF_ROOM_NAME: call.data.get(CONF_ROOM_NAME, "New Room"),
            CONF_TEMP_SENSOR: call.data.get(CONF_TEMP_SENSOR, ""),
            CONF_VALVE_ENTITY: call.data.get(CONF_VALVE_ENTITY, ""),
            CONF_VALVE_ENTITIES: call.data.get(CONF_VALVE_ENTITIES, []),
            CONF_ROOM_OFFSET: float(call.data.get(CONF_ROOM_OFFSET, 0.0)),
            CONF_DEADBAND: float(call.data.get(CONF_DEADBAND, DEFAULT_DEADBAND)),
            CONF_WEIGHT: float(call.data.get(CONF_WEIGHT, DEFAULT_WEIGHT)),
            CONF_COMFORT_TEMP: float(call.data.get(CONF_COMFORT_TEMP, DEFAULT_COMFORT_TEMP)),
            CONF_AWAY_TEMP_ROOM: float(call.data.get(CONF_AWAY_TEMP_ROOM, DEFAULT_AWAY_TEMP_ROOM)),
            CONF_ECO_OFFSET: float(call.data.get(CONF_ECO_OFFSET, DEFAULT_ECO_OFFSET)),
            CONF_SLEEP_OFFSET: float(call.data.get(CONF_SLEEP_OFFSET, DEFAULT_SLEEP_OFFSET)),
            CONF_AWAY_OFFSET: float(call.data.get(CONF_AWAY_OFFSET, DEFAULT_AWAY_OFFSET)),
            CONF_ECO_MAX_TEMP: float(call.data.get(CONF_ECO_MAX_TEMP, DEFAULT_ECO_MAX_TEMP)),
            CONF_SLEEP_MAX_TEMP: float(call.data.get(CONF_SLEEP_MAX_TEMP, DEFAULT_SLEEP_MAX_TEMP)),
            CONF_AWAY_MAX_TEMP: float(call.data.get(CONF_AWAY_MAX_TEMP, DEFAULT_AWAY_MAX_TEMP)),
            CONF_HA_SCHEDULE_OFF_MODE: call.data.get(CONF_HA_SCHEDULE_OFF_MODE, DEFAULT_HA_SCHEDULE_OFF_MODE),
            CONF_WINDOW_SENSOR: call.data.get(CONF_WINDOW_SENSOR, ""),
            CONF_WINDOW_SENSORS: call.data.get(CONF_WINDOW_SENSORS, []),
            CONF_MIN_TEMP: float(call.data.get(CONF_MIN_TEMP, DEFAULT_MIN_TEMP)),
            CONF_MAX_TEMP: float(call.data.get(CONF_MAX_TEMP, DEFAULT_MAX_TEMP)),
            CONF_SCHEDULES: call.data.get(CONF_SCHEDULES, []),
            CONF_HA_SCHEDULES: call.data.get(CONF_HA_SCHEDULES, []),
            CONF_HUMIDITY_SENSOR: call.data.get(CONF_HUMIDITY_SENSOR, ""),
            CONF_MOLD_PROTECTION_ENABLED: call.data.get(CONF_MOLD_PROTECTION_ENABLED, DEFAULT_MOLD_PROTECTION_ENABLED),
            CONF_CO2_SENSOR: call.data.get(CONF_CO2_SENSOR, ""),
            CONF_CO2_THRESHOLD_GOOD: int(call.data.get(CONF_CO2_THRESHOLD_GOOD, DEFAULT_CO2_THRESHOLD_GOOD)),
            CONF_CO2_THRESHOLD_BAD: int(call.data.get(CONF_CO2_THRESHOLD_BAD, DEFAULT_CO2_THRESHOLD_BAD)),
            CONF_RADIATOR_KW: float(call.data.get(CONF_RADIATOR_KW, DEFAULT_RADIATOR_KW)),
            CONF_HKV_SENSOR: call.data.get(CONF_HKV_SENSOR, ""),
            CONF_HKV_FACTOR: float(call.data.get(CONF_HKV_FACTOR, DEFAULT_HKV_FACTOR)),
            CONF_WINDOW_REACTION_TIME: int(call.data.get(CONF_WINDOW_REACTION_TIME, DEFAULT_WINDOW_REACTION_TIME)),
            CONF_WINDOW_CLOSE_DELAY: int(call.data.get(CONF_WINDOW_CLOSE_DELAY, DEFAULT_WINDOW_CLOSE_DELAY)),
            CONF_ROOM_QM: float(call.data.get(CONF_ROOM_QM, DEFAULT_ROOM_QM)),
            CONF_ABSOLUTE_MIN_TEMP: float(call.data.get(CONF_ABSOLUTE_MIN_TEMP, DEFAULT_ABSOLUTE_MIN_TEMP)),
            CONF_ROOM_PREHEAT_MINUTES: int(call.data.get(CONF_ROOM_PREHEAT_MINUTES, DEFAULT_ROOM_PREHEAT_MINUTES)),
            CONF_ROOM_PRESENCE_ENTITIES: call.data.get(CONF_ROOM_PRESENCE_ENTITIES, []),
            CONF_BOOST_TEMP: float(call.data[CONF_BOOST_TEMP]) if call.data.get(CONF_BOOST_TEMP) is not None else None,
            CONF_BOOST_DEFAULT_DURATION: int(call.data.get(CONF_BOOST_DEFAULT_DURATION, DEFAULT_BOOST_DEFAULT_DURATION)),
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
        temp_raw = call.data.get("temp")
        temp = float(temp_raw) if temp_raw is not None else None
        if room_id:
            if cancel:
                coordinator.cancel_room_boost(room_id)
            else:
                coordinator.set_room_boost(room_id, duration, temp=temp)

    async def handle_reload(call: ServiceCall) -> None:
        await hass.config_entries.async_reload(entry.entry_id)

    async def handle_update_global_settings(call: ServiceCall) -> None:
        # All valid global setting keys – explicitly listed so arbitrary data can't be injected
        allowed = {
            "demand_threshold", "demand_hysteresis", "min_on_time", "min_off_time",
            "min_rooms_demand", "away_temp", "vacation_temp",
            "summer_mode_enabled", "summer_threshold",
            "frost_protection_temp", "off_use_frost_protection",
            "night_setback_enabled", "night_setback_offset", "sun_entity",
            "preheat_minutes",
            "presence_entities",
            "heating_switch", "cooling_switch", "outdoor_temp_sensor",
            "enable_cooling", "show_panel",
            # Heating curve
            "heating_curve",
            # Roadmap 1.3 – Energy
            "boiler_kw", "solar_entity", "solar_surplus_threshold", "solar_boost_temp",
            "energy_price_entity", "energy_price_threshold", "energy_price_eco_offset",
            # Flow temp + PID feedback sensor
            "flow_temp_entity", "flow_temp_sensor",
            "pid_kp", "pid_ki", "pid_kd",
            # Vacation assistant + calendar integration
            "vacation_start", "vacation_end",
            "vacation_calendar", "vacation_calendar_keyword",
            # v1.5 – Cooling target, smart meter, price forecast attribute
            "cooling_target_temp",
            "smart_meter_entity",
            "price_forecast_attribute",
            # v1.3 – Adaptive heating curve & predictive pre-heat
            "adaptive_curve_enabled", "adaptive_curve_max_delta",
            "adaptive_preheat_enabled",
            # v1.4 – ETA-based pre-heat
            "eta_preheat_enabled",
            # Roadmap 2.0
            "controller_mode", "guest_duration_hours",
            "vacation_return_preheat_days",
            "weather_entity", "weather_cold_threshold", "weather_cold_boost",
            # Ventilation advice
            "outdoor_humidity_sensor",
            "ventilation_advice_enabled",
            # Static energy price (fallback when no price sensor)
            "static_energy_price",
            # Startup grace for Zigbee/Z-Wave sensor warmup
            "startup_grace_seconds",
        }
        updates = {k: v for k, v in call.data.items() if k in allowed}
        if updates:
            await coordinator.async_update_global_settings(updates)

    async def handle_export_config(call: ServiceCall) -> None:
        """Roadmap 1.5: Export full config as a persistent notification."""
        import json
        cfg = coordinator.get_config()
        # Remove large runtime data, keep only config
        safe = {k: v for k, v in cfg.items() if k not in ("rooms",)}
        safe["rooms"] = coordinator.get_rooms()
        payload = json.dumps(safe, indent=2, default=str)
        await hass.services.async_call(
            "persistent_notification",
            "create",
            {
                "message": f"```json\n{payload}\n```",
                "title": "IHC Konfigurationsexport",
                "notification_id": f"{DOMAIN}_config_export",
            },
        )

    async def handle_activate_guest_mode(call: ServiceCall) -> None:
        duration = call.data.get("duration_hours")
        coordinator.activate_guest_mode(int(duration) if duration is not None else None)

    async def handle_deactivate_guest_mode(call: ServiceCall) -> None:
        coordinator.deactivate_guest_mode()

    async def handle_reset_stats(call: ServiceCall) -> None:
        """Reset energy and runtime statistics to zero."""
        coordinator.reset_runtime_stats()
        await coordinator.async_request_refresh()

    hass.services.async_register(DOMAIN, SERVICE_ADD_ROOM, handle_add_room)
    hass.services.async_register(DOMAIN, SERVICE_REMOVE_ROOM, handle_remove_room)
    hass.services.async_register(DOMAIN, SERVICE_UPDATE_ROOM, handle_update_room)
    hass.services.async_register(DOMAIN, SERVICE_SET_ROOM_MODE, handle_set_room_mode)
    hass.services.async_register(DOMAIN, SERVICE_SET_SYSTEM_MODE, handle_set_system_mode)
    hass.services.async_register(DOMAIN, SERVICE_BOOST_ROOM, handle_boost_room)
    hass.services.async_register(DOMAIN, SERVICE_RELOAD, handle_reload)
    hass.services.async_register(DOMAIN, SERVICE_EXPORT_CONFIG, handle_export_config)
    hass.services.async_register(DOMAIN, SERVICE_UPDATE_GLOBAL_SETTINGS, handle_update_global_settings)
    hass.services.async_register(DOMAIN, SERVICE_ACTIVATE_GUEST_MODE, handle_activate_guest_mode)
    hass.services.async_register(DOMAIN, SERVICE_DEACTIVATE_GUEST_MODE, handle_deactivate_guest_mode)
    hass.services.async_register(DOMAIN, SERVICE_RESET_STATS, handle_reset_stats)
