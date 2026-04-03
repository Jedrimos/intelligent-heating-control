"""Presence management mixin for IHC Coordinator."""
from __future__ import annotations

import logging
from typing import Optional

from homeassistant.const import STATE_ON
from homeassistant.util import dt as dt_util

from .const import (
    CONF_PRESENCE_ENTITIES,
    CONF_PRESENCE_AWAY_DELAY_MINUTES,
    DEFAULT_PRESENCE_AWAY_DELAY_MINUTES,
    CONF_PRESENCE_ARRIVE_DELAY_MINUTES,
    DEFAULT_PRESENCE_ARRIVE_DELAY_MINUTES,
    CONF_ROOM_PRESENCE_ENTITIES,
    SYSTEM_MODE_AUTO,
    SYSTEM_MODE_AWAY,
)

_LOGGER = logging.getLogger(__name__)


class PresenceManagerMixin:
    """Mixin for presence detection and auto-away logic."""

    def _check_presence(self) -> bool:
        """
        Return True if at least one tracked person is home.

        Checks `presence_entities` list (person.* or device_tracker.*).
        If no entities configured, always returns True (unknown = home).
        """
        cfg = self.get_config()
        entities: list = cfg.get(CONF_PRESENCE_ENTITIES, [])
        if not entities:
            return True  # no tracking configured → assume home

        home_states = {"home", "on", STATE_ON}
        for entity_id in entities:
            if not entity_id:
                continue
            state = self.hass.states.get(entity_id)
            if state and state.state.lower() in home_states:
                return True
        return False

    def _update_presence_auto_away(self) -> None:
        """
        Auto-switch system mode to AWAY when everyone leaves,
        and back to AUTO when someone returns.
        Only acts when system_mode is currently AUTO (or already presence-away).
        """
        someone_home = self._check_presence()
        cfg = self.get_config()
        entities: list = cfg.get(CONF_PRESENCE_ENTITIES, [])
        if not entities:
            return  # feature disabled

        delay_minutes = int(cfg.get(CONF_PRESENCE_AWAY_DELAY_MINUTES, DEFAULT_PRESENCE_AWAY_DELAY_MINUTES))

        if not someone_home and self._system_mode == SYSTEM_MODE_AUTO:
            if delay_minutes > 0:
                # Start or check pending timer
                if self._presence_away_pending_since is None:
                    self._presence_away_pending_since = dt_util.utcnow()
                    _LOGGER.info("IHC: All persons away – auto-away pending (%d min delay)", delay_minutes)
                    return
                elapsed = (dt_util.utcnow() - self._presence_away_pending_since).total_seconds() / 60
                if elapsed < delay_minutes:
                    return  # Still waiting
            _LOGGER.info("IHC: All persons away – activating auto-away mode")
            self._presence_away_pending_since = None
            self._system_mode = SYSTEM_MODE_AWAY
            self._presence_away_active = True
            self.hass.async_create_task(self._async_save_runtime_state())

        elif someone_home and (self._presence_away_active or self._presence_away_pending_since is not None):
            # Cancel pending away timer if still counting
            self._presence_away_pending_since = None
            arrive_delay = int(cfg.get(CONF_PRESENCE_ARRIVE_DELAY_MINUTES, DEFAULT_PRESENCE_ARRIVE_DELAY_MINUTES))
            if self._presence_away_active:
                if arrive_delay > 0:
                    if self._presence_arrive_pending_since is None:
                        self._presence_arrive_pending_since = dt_util.utcnow()
                        _LOGGER.info("IHC: Person arrived – waiting %d min before restoring auto", arrive_delay)
                        return
                    elapsed = (dt_util.utcnow() - self._presence_arrive_pending_since).total_seconds() / 60
                    if elapsed < arrive_delay:
                        return
                _LOGGER.info("IHC: Person arrived home – restoring auto mode")
                self._presence_arrive_pending_since = None
                self._system_mode = SYSTEM_MODE_AUTO
                self._presence_away_active = False
                self.hass.async_create_task(self._async_save_runtime_state())
            else:
                # Was only in pending-away state, just cancel it
                _LOGGER.info("IHC: Person returned during away-pending window – cancelling")
                self._presence_arrive_pending_since = None

    async def _async_startup_presence_sync(self) -> None:
        """Called ONCE at startup to sync presence state from current HA states.
        Fixes the bug where after HA restart, if someone is home but system mode
        is AWAY (was set automatically before restart), IHC doesn't restore AUTO mode."""
        if not self.hass:
            return
        presence_entities = self.get_config().get(CONF_PRESENCE_ENTITIES, [])
        if not presence_entities:
            return
        someone_home = any(
            (s := self.hass.states.get(e)) and s.state in ("home", "on", "true", "1")
            for e in presence_entities
        )
        # If someone is home but we're in AWAY mode, check if IHC set this automatically
        if someone_home and self._system_mode == SYSTEM_MODE_AWAY and self._presence_away_active:
            _LOGGER.info("IHC startup sync: presence detected home, restoring AUTO mode")
            self._presence_away_active = False
            self._system_mode = SYSTEM_MODE_AUTO
        elif not someone_home and self._system_mode == SYSTEM_MODE_AUTO:
            # Nobody home at startup - mark as away
            _LOGGER.info("IHC startup sync: no presence detected, switching to AWAY")
            self._presence_away_active = True
            self._system_mode = SYSTEM_MODE_AWAY

    def _check_room_presence(self, room: dict) -> bool:
        """
        Return True if someone is present for this specific room.
        If no room_presence_entities configured, always returns True.
        """
        entities: list = room.get(CONF_ROOM_PRESENCE_ENTITIES, [])
        if not entities:
            return True
        home_states = {"home", "on", STATE_ON}
        for entity_id in entities:
            if not entity_id:
                continue
            state = self.hass.states.get(entity_id)
            if state and state.state.lower() in home_states:
                return True
        return False
