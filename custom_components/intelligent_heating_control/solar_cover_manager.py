"""Passive solar heating/shading via cover control - mixin for IHC Coordinator.

Roadmap 2.1: before the heating kicks in on a cold morning, open the covers of a
sun-facing room so free solar heat helps warm it up; in summer, close them a bit
before the room overheats. Purely opt-in per room (CONF_SOLAR_PASSIVE_HEAT/_COOL) -
a room without covers configured, or with both flags off, is never touched.
"""
from __future__ import annotations

import logging
from typing import Dict, Optional

from .const import (
    CONF_ROOM_ID,
    CONF_COVER_ENTITIES,
    CONF_WINDOW_ORIENTATION,
    CONF_SOLAR_PASSIVE_HEAT,
    DEFAULT_SOLAR_PASSIVE_HEAT,
    CONF_SOLAR_PASSIVE_COOL,
    DEFAULT_SOLAR_PASSIVE_COOL,
    CONF_SOLAR_MIN_ELEVATION,
    DEFAULT_SOLAR_MIN_ELEVATION,
    CONF_SOLAR_SHADE_POSITION,
    DEFAULT_SOLAR_SHADE_POSITION,
    CONF_SOLAR_HEAT_MIN_OUTDOOR,
    DEFAULT_SOLAR_HEAT_MIN_OUTDOOR,
    CONF_SOLAR_WEATHER_PROTECTION_ENABLED,
    DEFAULT_SOLAR_WEATHER_PROTECTION_ENABLED,
    CONF_SOLAR_WIND_SPEED_THRESHOLD,
    DEFAULT_SOLAR_WIND_SPEED_THRESHOLD,
    CONF_WEATHER_ENTITY,
    CONF_SUN_ENTITY,
    CONF_COMFORT_TEMP,
    DEFAULT_COMFORT_TEMP,
)

# Literal values instead of importing from homeassistant.const - this module has
# no other Home Assistant dependency and is unit-tested without HA installed
# (tests/test_solar_cover_manager.py); these two string constants are stable
# across HA core versions.
STATE_UNAVAILABLE = "unavailable"
STATE_UNKNOWN = "unknown"

_LOGGER = logging.getLogger(__name__)

# Fensterausrichtung -> Kompass-Azimut in Grad
ORIENTATION_AZIMUTHS: Dict[str, int] = {
    "N": 0, "NE": 45, "E": 90, "SE": 135,
    "S": 180, "SW": 225, "W": 270, "NW": 315,
}
# Zwei-Schwellen-Toleranz (Hysterese) statt einer festen Grenze: die Sonne muss näher an der
# Fensterausrichtung sein um die Beschattung/Vorwärmung erstmals zu "scharfen" (ENTER, enger),
# bleibt danach aber bis zu einem größeren Winkel "scharf" (EXIT, weiter) - verhindert Flackern
# wenn der Azimut genau um die alte feste Grenze pendelt. Analog zu Loxones Praxis getrennter
# Ein-/Ausschalt-Schwellen (z.B. für Lux-Sensoren), hier auf den Sonnenwinkel übertragen.
SUN_HIT_ENTER_TOLERANCE_DEG = 45
SUN_HIT_EXIT_TOLERANCE_DEG = 70
# Fixer Sicherheitsabstand für Beschattung (°C unter Komforttemperatur, ab dem vorsorglich beschattet wird)
SHADE_TRIGGER_MARGIN = 1.0
# HA-Standard-Wetterbedingungen (homeassistant.components.weather), bei denen ausgefahrene Rollos
# beschädigt werden könnten (Regen/Schnee/Hagel/Eis) oder durch Wind - unabhängig vom wind_speed-
# Attribut, falls die Integration den Zustand direkt als "windy" meldet.
SOLAR_UNSAFE_WEATHER_CONDITIONS = frozenset({
    "rainy", "pouring", "lightning-rainy", "hail", "snowy", "snowy-rainy", "windy", "windy-variant",
})


def sun_hits_orientation(
    azimuth: float, elevation: float, orientation: str, min_elevation: float, *, was_active: bool = False,
) -> bool:
    """Pure azimuth/elevation check: does the sun currently shine on a window facing
    `orientation`? Extracted as a standalone function so it's unit-testable without a
    coordinator/hass instance.

    `was_active` selects which of the two hysteresis tolerances to use: pass the previous
    cycle's result back in to get the wider EXIT tolerance once already active, and the
    narrower ENTER tolerance while inactive. Defaults to the narrower (safe) tolerance for
    any caller that doesn't track state.
    """
    if orientation not in ORIENTATION_AZIMUTHS:
        return False
    if elevation < min_elevation:
        return False
    window_azimuth = ORIENTATION_AZIMUTHS[orientation]
    delta = abs((azimuth - window_azimuth + 180) % 360 - 180)
    tolerance = SUN_HIT_EXIT_TOLERANCE_DEG if was_active else SUN_HIT_ENTER_TOLERANCE_DEG
    return delta <= tolerance


class SolarCoverManagerMixin:
    """Mixin for passive solar heating/shading via cover entities."""

    def _get_sun_data(self) -> Optional[tuple[float, float]]:
        """Return (azimuth, elevation) from the configured sun entity, or None if
        unavailable."""
        cfg = self.get_config()
        sun_entity = cfg.get(CONF_SUN_ENTITY, "sun.sun") or "sun.sun"
        state = self.hass.states.get(sun_entity)
        if state is None:
            return None
        azimuth = state.attributes.get("azimuth")
        elevation = state.attributes.get("elevation")
        if azimuth is None or elevation is None:
            return None
        try:
            return float(azimuth), float(elevation)
        except (TypeError, ValueError):
            return None

    def _is_solar_weather_protection_active(self) -> bool:
        """Hard safety override: is the configured weather entity currently reporting wind/
        rain/snow/hail conditions a retracted (fully open) cover should hide from? Opt-in via
        CONF_SOLAR_WEATHER_PROTECTION_ENABLED, reuses the existing global CONF_WEATHER_ENTITY -
        no dedicated per-room sensor needed. Fails open (returns False) whenever it can't tell,
        so a missing/unavailable weather entity never blocks normal passive-solar operation.
        """
        cfg = self.get_config()
        if not bool(cfg.get(CONF_SOLAR_WEATHER_PROTECTION_ENABLED, DEFAULT_SOLAR_WEATHER_PROTECTION_ENABLED)):
            return False
        weather_entity = cfg.get(CONF_WEATHER_ENTITY)
        if not weather_entity:
            return False
        state = self.hass.states.get(weather_entity)
        if state is None or state.state in (STATE_UNAVAILABLE, STATE_UNKNOWN):
            return False
        if state.state in SOLAR_UNSAFE_WEATHER_CONDITIONS:
            return True
        wind_speed = state.attributes.get("wind_speed")
        if wind_speed is None:
            return False
        threshold = float(cfg.get(CONF_SOLAR_WIND_SPEED_THRESHOLD, DEFAULT_SOLAR_WIND_SPEED_THRESHOLD))
        try:
            return float(wind_speed) >= threshold
        except (TypeError, ValueError):
            return False

    def _update_solar_covers(self, room_data: Dict[str, dict], outdoor_temp: Optional[float]) -> None:
        """Roadmap 2.1: move each opted-in room's covers for passive solar
        heating/shading. Runs once per update cycle. Never touches a room whose
        window is currently open (the window-open TRV logic already takes priority),
        and never fights a room with neither flag enabled or without covers
        configured - those rooms are left exactly as the user set them.

        Priority order (highest first), matching Loxone's own hierarchy: wind/rain/frost
        safety override > window-open (leave untouched) > passive heat/cool logic.
        """
        cfg = self.get_config()
        min_elevation = float(cfg.get(CONF_SOLAR_MIN_ELEVATION, DEFAULT_SOLAR_MIN_ELEVATION))
        sun_data = self._get_sun_data()
        weather_protection_active = self._is_solar_weather_protection_active()

        for room in self.get_rooms():
            passive_heat = bool(room.get(CONF_SOLAR_PASSIVE_HEAT, DEFAULT_SOLAR_PASSIVE_HEAT))
            passive_cool = bool(room.get(CONF_SOLAR_PASSIVE_COOL, DEFAULT_SOLAR_PASSIVE_COOL))
            if not passive_heat and not passive_cool:
                continue
            covers = room.get(CONF_COVER_ENTITIES, [])
            if not covers:
                continue
            room_id = room.get(CONF_ROOM_ID, "")
            rdata = room_data.get(room_id)
            if rdata is None:
                continue

            rdata["solar_cover_active"] = False
            rdata["solar_cover_position"] = None

            target_position: Optional[int] = None

            if weather_protection_active:
                # Hard override: raise the cover out of harm's way regardless of window state
                # or the heat/cool logic below - an extended cover is the one at risk.
                target_position = 100
            elif rdata.get("window_open"):
                continue  # window-open handling always wins, don't fight it

            if target_position is None:
                orientation = room.get(CONF_WINDOW_ORIENTATION, "")
                if sun_data is None or not orientation:
                    continue
                azimuth, elevation = sun_data
                was_active = self._solar_cover_armed.get(room_id, False)
                sun_hits = sun_hits_orientation(azimuth, elevation, orientation, min_elevation, was_active=was_active)
                self._solar_cover_armed[room_id] = sun_hits
                if not sun_hits:
                    continue

            if target_position is None and passive_heat and rdata.get("demand", 0) > 0:
                min_outdoor = float(cfg.get(CONF_SOLAR_HEAT_MIN_OUTDOOR, DEFAULT_SOLAR_HEAT_MIN_OUTDOOR))
                if outdoor_temp is not None and outdoor_temp >= min_outdoor:
                    target_position = 100  # fully open - let the sun help heat the room

            if target_position is None and passive_cool:
                comfort_temp = float(room.get(CONF_COMFORT_TEMP, DEFAULT_COMFORT_TEMP))
                current_temp = rdata.get("current_temp")
                if current_temp is not None and current_temp > comfort_temp - SHADE_TRIGGER_MARGIN:
                    target_position = int(cfg.get(CONF_SOLAR_SHADE_POSITION, DEFAULT_SOLAR_SHADE_POSITION))

            if target_position is None:
                continue

            rdata["solar_cover_active"] = True
            rdata["solar_cover_position"] = target_position
            for cover in covers:
                cover_state = self.hass.states.get(cover)
                current_position = cover_state.attributes.get("current_position") if cover_state else None
                if current_position == target_position:
                    continue  # already there - avoid redundant service calls
                self.hass.async_create_task(
                    self.hass.services.async_call(
                        "cover", "set_cover_position",
                        {"entity_id": cover, "position": target_position},
                    )
                )
