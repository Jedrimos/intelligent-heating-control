"""Passive solar heating/shading via cover control - mixin for IHC Coordinator.

Roadmap 2.1: before the heating kicks in on a cold morning, open the covers of a
sun-facing room so free solar heat helps warm it up; in summer, close them a bit
before the room overheats. Purely opt-in per room (CONF_SOLAR_PASSIVE_HEAT/_COOL) -
a room without covers configured, or with both flags off, is never touched.
"""
from __future__ import annotations

import logging
from collections import deque
from datetime import time as dt_time
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
    CONF_SOLAR_EVENING_PRIVACY_ENABLED,
    DEFAULT_SOLAR_EVENING_PRIVACY_ENABLED,
    CONF_SOLAR_EVENING_PRIVACY_MODE,
    DEFAULT_SOLAR_EVENING_PRIVACY_MODE,
    CONF_SOLAR_EVENING_PRIVACY_TIME,
    DEFAULT_SOLAR_EVENING_PRIVACY_TIME,
    CONF_SOLAR_EVENING_PRIVACY_POSITION,
    DEFAULT_SOLAR_EVENING_PRIVACY_POSITION,
    CONF_LUX_SENSOR,
    CONF_LUX_ON_THRESHOLD,
    DEFAULT_LUX_ON_THRESHOLD,
    CONF_LUX_OFF_THRESHOLD,
    DEFAULT_LUX_OFF_THRESHOLD,
    CONF_SOLAR_COVER_OVERRIDE_REARM_MINUTES,
    DEFAULT_SOLAR_COVER_OVERRIDE_REARM_MINUTES,
    CONF_SOLAR_GLARE_PROTECTION_ENABLED,
    DEFAULT_SOLAR_GLARE_PROTECTION_ENABLED,
    CONF_SOLAR_GLARE_MAX_ELEVATION,
    DEFAULT_SOLAR_GLARE_MAX_ELEVATION,
    CONF_SOLAR_GLARE_POSITION,
    DEFAULT_SOLAR_GLARE_POSITION,
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

# Rollo-Backlog (2026-10-15): tuning constants for the four extensions below.
LUX_BUFFER_MAXLEN = 30  # ~30 min at one reading/update-cycle, matches the researched Loxone example
COVER_OVERRIDE_CONFIRM_SECONDS = 90  # grace period for a cover to physically reach a sent position
EVENING_PRIVACY_MORNING_CUTOFF = dt_time(6, 0)  # "time" mode: privacy window ends here at the latest


def is_evening_privacy_window(
    mode: str, now_time: dt_time, privacy_time: dt_time, elevation: Optional[float],
) -> bool:
    """Pure time/sun check: is the evening-privacy-close window currently active?

    "sunset" mode: active whenever the sun is below the horizon (elevation < 0) - tracks actual
    darkness regardless of season. "time" mode: active from the configured clock time until
    EVENING_PRIVACY_MORNING_CUTOFF the next morning (wraps across midnight).
    """
    if mode == "time":
        if privacy_time <= EVENING_PRIVACY_MORNING_CUTOFF:
            return False  # nonsensical configuration (privacy time inside the morning cutoff itself)
        return now_time >= privacy_time or now_time < EVENING_PRIVACY_MORNING_CUTOFF
    # "sunset" mode (also the fallback for any unrecognised mode value)
    return elevation is not None and elevation < 0


def sun_in_glare_band(azimuth: float, elevation: float, orientation: str, max_elevation: float) -> bool:
    """Pure azimuth/elevation check for the TV/screen glare-protection zone: is the sun low on the
    horizon (likely to cause direct glare through a window) and roughly facing `orientation`?
    Deliberately a narrower band than sun_hits_orientation's own min_elevation gate - glare is a
    low-sun phenomenon, not the same condition that triggers passive solar heating.
    """
    if orientation not in ORIENTATION_AZIMUTHS:
        return False
    if elevation <= 0 or elevation > max_elevation:
        return False
    window_azimuth = ORIENTATION_AZIMUTHS[orientation]
    delta = abs((azimuth - window_azimuth + 180) % 360 - 180)
    return delta <= SUN_HIT_ENTER_TOLERANCE_DEG


def lux_hysteresis_active(avg_lux: Optional[float], was_active: bool, on_threshold: float, off_threshold: float) -> bool:
    """Pure hysteresis check for the optional lux-sensor gate. Fails open (True = "don't block the
    geometric decision") whenever there's no reading yet, same philosophy as the weather-protection
    override elsewhere in this file - a missing/unavailable lux sensor never blocks normal operation.
    """
    if avg_lux is None:
        return True
    return avg_lux >= (off_threshold if was_active else on_threshold)


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

    def _record_cover_command(self, cover: str, position: int) -> None:
        """Remember a position IHC just sent, for the override-confirmation check below."""
        from homeassistant.util import dt as dt_util  # local: keep this module HA-free at import time
        self._cover_cmd_pending[cover] = {"position": position, "sent_at": dt_util.utcnow()}

    def _is_cover_overridden(self, cover: str) -> bool:
        """Confirmation-based manual-override detection, same idea as the existing TRV override
        detection (_trv_cmd_pending): a cover counts as manually overridden only once its reported
        position still doesn't match what IHC last sent, after giving the motor
        COVER_OVERRIDE_CONFIRM_SECONDS to actually get there - not on every transient mismatch while
        it's still moving. Re-arms itself after CONF_SOLAR_COVER_OVERRIDE_REARM_MINUTES so a one-off
        manual adjustment doesn't lock IHC out of that cover forever.
        """
        from homeassistant.util import dt as dt_util  # local: keep this module HA-free at import time
        now = dt_util.utcnow()

        since = self._cover_override_since.get(cover)
        if since is not None:
            rearm_minutes = float(self.get_config().get(
                CONF_SOLAR_COVER_OVERRIDE_REARM_MINUTES, DEFAULT_SOLAR_COVER_OVERRIDE_REARM_MINUTES
            ))
            if (now - since).total_seconds() >= rearm_minutes * 60:
                self._cover_override_since.pop(cover, None)
            else:
                return True

        pending = self._cover_cmd_pending.get(cover)
        if pending is None:
            return False
        state = self.hass.states.get(cover)
        current_position = state.attributes.get("current_position") if state else None
        if current_position is None:
            return False  # can't tell - fail open, don't block automation on an unreadable cover
        if current_position == pending["position"]:
            self._cover_cmd_pending.pop(cover, None)
            return False
        if (now - pending["sent_at"]).total_seconds() < COVER_OVERRIDE_CONFIRM_SECONDS:
            return False  # still waiting for the motor to reach the sent position
        self._cover_cmd_pending.pop(cover, None)
        self._cover_override_since[cover] = now
        _LOGGER.debug("IHC: cover %s treated as manually overridden (sent %s, now at %s)",
                      cover, pending["position"], current_position)
        return True

    def _update_and_get_lux_average(self, room_id: str, lux_entity: str) -> Optional[float]:
        """Feed the room's rolling lux buffer and return its current average (None if no
        reading yet). One sample per update cycle, LUX_BUFFER_MAXLEN deep (~30 min)."""
        state = self.hass.states.get(lux_entity)
        if state is not None and state.state not in (STATE_UNAVAILABLE, STATE_UNKNOWN):
            try:
                buf = self._lux_buffer.setdefault(room_id, deque(maxlen=LUX_BUFFER_MAXLEN))
                buf.append(float(state.state))
            except (TypeError, ValueError):
                pass
        buf = self._lux_buffer.get(room_id)
        if not buf:
            return None
        return sum(buf) / len(buf)

    def _update_solar_covers(self, room_data: Dict[str, dict], outdoor_temp: Optional[float]) -> None:
        """Roadmap 2.1 (+ Rollo-Backlog 2026-10-15): move each opted-in room's covers for
        passive solar heating/shading, evening privacy, and TV/screen glare protection. Runs
        once per update cycle. Never touches a room with none of the four flags enabled or
        without covers configured - those rooms are left exactly as the user set them.

        Priority order (highest first), matching Loxone's own hierarchy:
        wind/rain/frost safety override > manual-override (leave untouched) >
        window-open (leave untouched) > evening privacy close > glare protection >
        passive heat/cool logic.
        """
        cfg = self.get_config()
        min_elevation = float(cfg.get(CONF_SOLAR_MIN_ELEVATION, DEFAULT_SOLAR_MIN_ELEVATION))
        sun_data = self._get_sun_data()
        weather_protection_active = self._is_solar_weather_protection_active()
        from homeassistant.util import dt as dt_util  # local: keep this module HA-free at import time
        now_local = dt_util.now()

        for room in self.get_rooms():
            passive_heat = bool(room.get(CONF_SOLAR_PASSIVE_HEAT, DEFAULT_SOLAR_PASSIVE_HEAT))
            passive_cool = bool(room.get(CONF_SOLAR_PASSIVE_COOL, DEFAULT_SOLAR_PASSIVE_COOL))
            evening_privacy = bool(room.get(CONF_SOLAR_EVENING_PRIVACY_ENABLED, DEFAULT_SOLAR_EVENING_PRIVACY_ENABLED))
            glare_protection = bool(room.get(CONF_SOLAR_GLARE_PROTECTION_ENABLED, DEFAULT_SOLAR_GLARE_PROTECTION_ENABLED))
            if not (passive_heat or passive_cool or evening_privacy or glare_protection):
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
            rdata["solar_cover_overridden"] = False

            target_position: Optional[int] = None

            if weather_protection_active:
                # Hard override: raise the cover out of harm's way regardless of everything
                # else below - an extended cover is the one at risk, and hardware safety wins
                # even over a manual override.
                target_position = 100
            elif any(self._is_cover_overridden(c) for c in covers):
                rdata["solar_cover_overridden"] = True
                continue  # user moved it by hand recently - leave it alone until it re-arms
            elif rdata.get("window_open"):
                continue  # window-open handling always wins, don't fight it

            orientation = room.get(CONF_WINDOW_ORIENTATION, "")

            if target_position is None and evening_privacy:
                mode = cfg.get(CONF_SOLAR_EVENING_PRIVACY_MODE, DEFAULT_SOLAR_EVENING_PRIVACY_MODE)
                privacy_time = self._parse_hhmm(
                    cfg.get(CONF_SOLAR_EVENING_PRIVACY_TIME, DEFAULT_SOLAR_EVENING_PRIVACY_TIME)
                )
                elevation = sun_data[1] if sun_data is not None else None
                if is_evening_privacy_window(mode, now_local.time(), privacy_time, elevation):
                    target_position = int(cfg.get(
                        CONF_SOLAR_EVENING_PRIVACY_POSITION, DEFAULT_SOLAR_EVENING_PRIVACY_POSITION
                    ))

            if target_position is None and glare_protection and sun_data is not None and orientation:
                azimuth, elevation = sun_data
                max_elev = float(cfg.get(CONF_SOLAR_GLARE_MAX_ELEVATION, DEFAULT_SOLAR_GLARE_MAX_ELEVATION))
                if sun_in_glare_band(azimuth, elevation, orientation, max_elev):
                    target_position = int(cfg.get(CONF_SOLAR_GLARE_POSITION, DEFAULT_SOLAR_GLARE_POSITION))

            if target_position is None and (passive_heat or passive_cool) and sun_data is not None and orientation:
                azimuth, elevation = sun_data
                was_active = self._solar_cover_armed.get(room_id, False)
                sun_hits = sun_hits_orientation(azimuth, elevation, orientation, min_elevation, was_active=was_active)
                if sun_hits:
                    lux_entity = room.get(CONF_LUX_SENSOR)
                    if lux_entity:
                        avg_lux = self._update_and_get_lux_average(room_id, lux_entity)
                        lux_on = float(cfg.get(CONF_LUX_ON_THRESHOLD, DEFAULT_LUX_ON_THRESHOLD))
                        lux_off = float(cfg.get(CONF_LUX_OFF_THRESHOLD, DEFAULT_LUX_OFF_THRESHOLD))
                        sun_hits = lux_hysteresis_active(avg_lux, was_active, lux_on, lux_off)
                self._solar_cover_armed[room_id] = sun_hits

                if sun_hits and passive_heat and rdata.get("demand", 0) > 0:
                    min_outdoor = float(cfg.get(CONF_SOLAR_HEAT_MIN_OUTDOOR, DEFAULT_SOLAR_HEAT_MIN_OUTDOOR))
                    if outdoor_temp is not None and outdoor_temp >= min_outdoor:
                        target_position = 100  # fully open - let the sun help heat the room

                if sun_hits and target_position is None and passive_cool:
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
                self._record_cover_command(cover, target_position)
                self.hass.async_create_task(
                    self.hass.services.async_call(
                        "cover", "set_cover_position",
                        {"entity_id": cover, "position": target_position},
                    )
                )

    @staticmethod
    def _parse_hhmm(value: str) -> dt_time:
        """Parse a "HH:MM" config string into a time object, falling back to the default
        evening-privacy time on anything malformed."""
        try:
            hour, minute = value.split(":")
            return dt_time(int(hour), int(minute))
        except (ValueError, AttributeError):
            h, m = DEFAULT_SOLAR_EVENING_PRIVACY_TIME.split(":")
            return dt_time(int(h), int(m))
