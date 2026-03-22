"""Vacation mode management mixin for IHC Coordinator."""
from __future__ import annotations

import logging
from datetime import date, datetime, timedelta
from typing import Optional

from .const import (
    CONF_VACATION_START,
    CONF_VACATION_END,
    CONF_VACATION_CALENDAR,
    CONF_VACATION_CALENDAR_KEYWORD,
    CONF_VACATION_RETURN_PREHEAT_DAYS,
    DEFAULT_VACATION_CALENDAR_KEYWORD,
    DEFAULT_VACATION_RETURN_PREHEAT_DAYS,
    SYSTEM_MODE_AUTO,
    SYSTEM_MODE_AWAY,
    SYSTEM_MODE_VACATION,
)

_LOGGER = logging.getLogger(__name__)


class VacationManagerMixin:
    """Mixin for vacation date range management and calendar integration."""

    def _update_vacation_auto_mode(self) -> None:
        """
        Auto-switch to VACATION mode when the current date is within the configured
        vacation date range, and restore AUTO when the range ends.
        Respects manual mode changes: only activates/deactivates if system is in AUTO
        (or already in auto-vacation).
        """
        cfg = self.get_config()
        start_str = cfg.get(CONF_VACATION_START, "")
        end_str = cfg.get(CONF_VACATION_END, "")
        if not start_str or not end_str:
            return  # no vacation range configured

        try:
            vac_start = date.fromisoformat(start_str)
            vac_end = date.fromisoformat(end_str)
        except ValueError:
            return

        today = date.today()
        in_vacation = vac_start <= today <= vac_end

        # Allow activation from AUTO or presence-triggered AWAY (so airport-departure doesn't block it)
        can_activate = self._system_mode == SYSTEM_MODE_AUTO or (
            self._system_mode == SYSTEM_MODE_AWAY and self._presence_away_active
        )
        if in_vacation and can_activate:
            _LOGGER.info("IHC: Vacation range active (%s–%s) – switching to vacation mode", start_str, end_str)
            self._system_mode = SYSTEM_MODE_VACATION
            self._vacation_auto_active = True
            self._presence_away_active = False  # vacation supersedes presence-away
            self.hass.async_create_task(self._async_save_runtime_state())

        elif not in_vacation and self._vacation_auto_active:
            _LOGGER.info("IHC: Vacation range ended – restoring auto mode")
            self._system_mode = SYSTEM_MODE_AUTO
            self._vacation_auto_active = False
            self.hass.async_create_task(self._async_save_runtime_state())

    def set_vacation_range(self, start: str, end: str) -> None:
        """Store vacation start/end dates and immediately evaluate."""
        self.hass.async_create_task(self.async_update_global_settings({
            CONF_VACATION_START: start,
            CONF_VACATION_END: end,
        }))

    def clear_vacation_range(self) -> None:
        """Clear vacation date range and restore auto mode if in auto-vacation."""
        if self._vacation_auto_active:
            self._system_mode = SYSTEM_MODE_AUTO
            self._vacation_auto_active = False
        self.hass.async_create_task(self.async_update_global_settings({
            CONF_VACATION_START: "",
            CONF_VACATION_END: "",
        }))

    def get_vacation_range(self) -> dict:
        """Return the configured vacation date range."""
        cfg = self.get_config()
        return {
            "start": cfg.get(CONF_VACATION_START, ""),
            "end": cfg.get(CONF_VACATION_END, ""),
            "active": self._vacation_auto_active,
        }

    def _update_vacation_return_preheat(self) -> None:
        """
        Roadmap 2.0 – Rückkehr-Vorheizung.
        Switch from VACATION mode to AUTO N days before the configured vac_end date.
        This allows the house to be warm when residents return from vacation.
        """
        cfg = self.get_config()
        preheat_days = int(cfg.get(CONF_VACATION_RETURN_PREHEAT_DAYS, DEFAULT_VACATION_RETURN_PREHEAT_DAYS))
        if preheat_days <= 0:
            return
        end_str = cfg.get(CONF_VACATION_END, "")
        if not end_str:
            return
        try:
            vac_end = date.fromisoformat(end_str)
        except ValueError:
            return
        today = date.today()
        days_until_return = (vac_end - today).days
        # Activate pre-heat if within preheat_days before end AND system is currently in vacation
        if 0 <= days_until_return < preheat_days and self._system_mode == SYSTEM_MODE_VACATION and self._vacation_auto_active:
            _LOGGER.info("IHC: Vacation return in %d days – switching to AUTO for pre-heating", days_until_return)
            self._system_mode = SYSTEM_MODE_AUTO
            self._vacation_auto_active = False
            self._return_preheat_active = True
            self.hass.async_create_task(self._async_save_runtime_state())
        elif days_until_return >= preheat_days and self._return_preheat_active:
            # Reset flag if vacation dates changed and we are outside preheat window again
            self._return_preheat_active = False

    async def _async_check_vacation_calendar(self) -> None:
        """
        Auto-detect vacation periods from a HA calendar entity.

        Calls 'calendar.get_events' for the next 30 days and searches for
        events whose summary contains CONF_VACATION_CALENDAR_KEYWORD (default: "urlaub").
        If found, updates vacation_start/end in config options automatically.
        """
        cfg = self.get_config()
        cal_entity = cfg.get(CONF_VACATION_CALENDAR)
        if not cal_entity:
            return
        today_yday = datetime.now().timetuple().tm_yday
        if self._vac_calendar_last_check == today_yday:
            return
        self._vac_calendar_last_check = today_yday

        keyword = cfg.get(CONF_VACATION_CALENDAR_KEYWORD, DEFAULT_VACATION_CALENDAR_KEYWORD).lower()
        today = date.today()
        end_date = today + timedelta(days=30)
        try:
            result = await self.hass.services.async_call(
                "calendar", "get_events",
                {
                    "entity_id": cal_entity,
                    "start_date_time": today.isoformat() + "T00:00:00",
                    "end_date_time": end_date.isoformat() + "T23:59:59",
                },
                blocking=True,
                return_response=True,
            )
        except Exception as err:  # noqa: BLE001
            _LOGGER.debug("Vacation calendar check failed: %s", err)
            return

        events = (result or {}).get(cal_entity, {}).get("events", [])
        for event in events:
            summary = event.get("summary", "").lower()
            if keyword in summary:
                start_str = str(event.get("start", ""))[:10]
                end_str   = str(event.get("end",   ""))[:10]
                if start_str and end_str:
                    if start_str != cfg.get(CONF_VACATION_START) or end_str != cfg.get(CONF_VACATION_END):
                        _LOGGER.info("Vacation calendar: found '%s' → %s – %s", summary, start_str, end_str)
                        new_opts = dict(self._config_entry.options)
                        new_opts[CONF_VACATION_START] = start_str
                        new_opts[CONF_VACATION_END]   = end_str
                        self._suppress_reload = True
                        self.hass.config_entries.async_update_entry(self._config_entry, options=new_opts)
                return  # first match wins
