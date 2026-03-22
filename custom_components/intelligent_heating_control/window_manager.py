"""Window detection mixin for IHC Coordinator."""
from __future__ import annotations

import logging
import time
from typing import Any, Optional

from homeassistant.core import callback, Event
from homeassistant.const import STATE_ON
from homeassistant.helpers.event import async_track_state_change_event

from .const import (
    CONF_ROOM_ID,
    CONF_ROOM_NAME,
    CONF_WINDOW_SENSOR,
    CONF_WINDOW_SENSORS,
    CONF_WINDOW_REACTION_TIME,
    CONF_WINDOW_CLOSE_DELAY,
    DEFAULT_WINDOW_REACTION_TIME,
    DEFAULT_WINDOW_CLOSE_DELAY,
)

_LOGGER = logging.getLogger(__name__)


class WindowManagerMixin:
    """Mixin for window open detection and sensor event listeners."""

    def _is_window_open(self, room: dict, current_temp: Optional[float]) -> bool:
        """
        Detect window open state with per-room reaction time and close delay.

        - window_reaction_time: seconds a sensor must be ON before IHC reacts (default 30 s)
        - window_close_delay:   seconds after sensor goes OFF before IHC resumes heating (default 0 s)

        Startup grace period: if a window sensor reports unknown/unavailable (e.g. Zigbee
        not yet ready after HA restart), treat it as "open" during the grace window so IHC
        does not start heating while the sensor state is unreliable.
        """
        room_id = room.get(CONF_ROOM_ID, "")
        reaction_time = int(room.get(CONF_WINDOW_REACTION_TIME, DEFAULT_WINDOW_REACTION_TIME))
        close_delay   = int(room.get(CONF_WINDOW_CLOSE_DELAY, DEFAULT_WINDOW_CLOSE_DELAY))
        now           = time.monotonic()
        in_grace      = now < self._startup_grace_until

        # Check raw sensor state
        sensor_open = False
        sensor_unknown = False  # any configured sensor is unknown/unavailable
        window_sensors: list = room.get(CONF_WINDOW_SENSORS, [])
        for sensor in window_sensors:
            if sensor:
                state = self.hass.states.get(sensor)
                if state and state.state == STATE_ON:
                    sensor_open = True
                    break
                if state is None or state.state in ("unknown", "unavailable"):
                    sensor_unknown = True
        if not sensor_open:
            window_sensor = room.get(CONF_WINDOW_SENSOR)
            if window_sensor:
                state = self.hass.states.get(window_sensor)
                if state and state.state == STATE_ON:
                    sensor_open = True
                elif state is None or state.state in ("unknown", "unavailable"):
                    sensor_unknown = True

        # During startup grace: treat unknown sensor as open (conservative / safe)
        if not sensor_open and sensor_unknown and in_grace:
            _LOGGER.debug(
                "IHC: Startup grace – window sensor unknown in '%s', treating as open",
                room.get(CONF_ROOM_NAME, room_id),
            )
            return True

        if sensor_open:
            # Record first time seen open; reset close timestamp
            if self._window_open_since.get(room_id) is None:
                self._window_open_since[room_id] = now
            self._window_closed_since[room_id] = None
            # React only after reaction_time has elapsed
            return (now - self._window_open_since[room_id]) >= reaction_time
        else:
            # Window closed: reset open timestamp
            if self._window_open_since.get(room_id) is not None:
                self._window_open_since[room_id] = None
                # Start close-delay countdown only if we were previously "reacting"
                if close_delay > 0:
                    self._window_closed_since[room_id] = now
            # During close delay: still report as open
            closed_at = self._window_closed_since.get(room_id)
            if closed_at is not None:
                if (now - closed_at) < close_delay:
                    return True
                self._window_closed_since[room_id] = None
            return False

    def _prefill_window_states(self) -> None:
        """Pre-populate _window_open_since for windows that are already open at startup.

        Without this, after an HA restart the system needs to wait reaction_time seconds
        before recognizing an already-open window.  During that gap a mode change would
        compute a demand and potentially start heating even though the window is open.

        Fix: if a window sensor is already ON at startup, set _window_open_since to
        ``now - reaction_time`` so the very first call to _is_window_open returns True.
        """
        now = time.monotonic()
        for room in self.get_rooms():
            room_id = room.get(CONF_ROOM_ID, "")
            if not room_id:
                continue
            if room_id in self._window_open_since and self._window_open_since[room_id] is not None:
                continue  # already tracked

            reaction_time = int(room.get(CONF_WINDOW_REACTION_TIME, DEFAULT_WINDOW_REACTION_TIME))

            # Check all window sensors
            sensor_open = False
            for sensor in room.get(CONF_WINDOW_SENSORS, []):
                if sensor:
                    state = self.hass.states.get(sensor)
                    if state and state.state == STATE_ON:
                        sensor_open = True
                        break
            if not sensor_open:
                single = room.get(CONF_WINDOW_SENSOR)
                if single:
                    state = self.hass.states.get(single)
                    if state and state.state == STATE_ON:
                        sensor_open = True

            if sensor_open:
                # Mark window as already open long enough to react immediately
                self._window_open_since[room_id] = now - reaction_time
                _LOGGER.debug(
                    "IHC: Startup – window already open in '%s', pre-filled reaction timer",
                    room.get(CONF_ROOM_NAME, room_id),
                )

    def _setup_window_listeners(self) -> None:
        """Subscribe to state changes of all window sensors for event-driven detection.

        When a window sensor changes state, immediately trigger a coordinator refresh
        so the reaction_time countdown starts right away instead of waiting up to
        UPDATE_INTERVAL seconds (60s) before the next timer-based cycle.

        Uses a SINGLE subscription for all sensors (not per-sensor).  A per-sensor
        approach had a bug: removing one sensor called the shared unsub and silently
        cancelled monitoring for ALL sensors.
        """
        # Collect all configured window sensor entity_ids
        sensor_ids: set[str] = set()
        for room in self.get_rooms():
            for sid in room.get(CONF_WINDOW_SENSORS, []):
                if sid:
                    sensor_ids.add(sid)
            single = room.get(CONF_WINDOW_SENSOR)
            if single:
                sensor_ids.add(single)

        # Nothing to do if sensor set hasn't changed
        if sensor_ids == self._window_listener_sensors:
            return

        # Cancel the old subscription (covers previous sensor set)
        if self._window_listener_unsub is not None:
            self._window_listener_unsub()
            self._window_listener_unsub = None

        self._window_listener_sensors = sensor_ids

        if not sensor_ids:
            return

        @callback
        def _on_window_sensor_change(event: Event) -> None:
            """Trigger coordinator refresh when any window sensor changes."""
            new_state = event.data.get("new_state")
            old_state = event.data.get("old_state")
            # Only refresh on meaningful state transitions (not attribute-only updates)
            new_s = new_state.state if new_state else None
            old_s = old_state.state if old_state else None
            if new_s != old_s:
                _LOGGER.debug(
                    "IHC: Window sensor %s changed %s→%s, requesting immediate refresh",
                    event.data.get("entity_id"), old_s, new_s,
                )
                self.hass.async_create_task(self.async_request_refresh())

        self._window_listener_unsub = async_track_state_change_event(
            self.hass, list(sensor_ids), _on_window_sensor_change
        )
