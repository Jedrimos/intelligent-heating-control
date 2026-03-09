"""Schedule manager - time-based temperature setpoints with offsets."""
from __future__ import annotations

import logging
from datetime import datetime, time
from typing import Optional

_LOGGER = logging.getLogger(__name__)

WEEKDAY_MAP = {
    "mon": 0, "tue": 1, "wed": 2, "thu": 3,
    "fri": 4, "sat": 5, "sun": 6,
}


def _parse_time(time_str: str) -> time:
    """Parse 'HH:MM' string to time object."""
    parts = time_str.split(":")
    return time(int(parts[0]), int(parts[1]))


class ScheduleManager:
    """
    Manages weekly schedules for a room.

    Schedule structure:
      [
        {
          "days": ["mon", "tue", "wed", "thu", "fri"],
          "periods": [
            {"start": "06:30", "end": "08:00", "temperature": 21.0, "offset": 0.0},
            {"start": "17:00", "end": "22:00", "temperature": 22.0, "offset": 0.5}
          ]
        },
        {
          "days": ["sat", "sun"],
          "periods": [
            {"start": "08:00", "end": "23:00", "temperature": 21.5, "offset": 0.0}
          ]
        }
      ]
    """

    def __init__(self, schedules: list) -> None:
        self._schedules = schedules

    def get_active_period(self, now: Optional[datetime] = None) -> Optional[dict]:
        """
        Return the currently active schedule period, or None if outside all periods.

        Returns dict with keys: temperature, offset, start, end
        """
        if now is None:
            now = datetime.now()

        weekday = now.weekday()  # 0=Mon, 6=Sun
        current_time = now.time().replace(second=0, microsecond=0)

        for schedule in self._schedules:
            days = [WEEKDAY_MAP.get(d, -1) for d in schedule.get("days", [])]
            if weekday not in days:
                continue
            for period in schedule.get("periods", []):
                try:
                    start = _parse_time(period["start"])
                    end = _parse_time(period["end"])
                except (KeyError, ValueError):
                    continue

                # Handle overnight periods (e.g. 22:00 - 06:00)
                if start <= end:
                    active = start <= current_time < end
                else:
                    active = current_time >= start or current_time < end

                if active:
                    return {
                        "temperature": float(period.get("temperature", 21.0)),
                        "offset": float(period.get("offset", 0.0)),
                        "start": period["start"],
                        "end": period["end"],
                    }
        return None

    def get_upcoming_period(self, within_minutes: int, now: Optional[datetime] = None) -> Optional[dict]:
        """
        Return the next scheduled period if it starts within `within_minutes` from now.
        Used for pre-heat logic: start heating before scheduled start.
        """
        if now is None:
            now = datetime.now()

        weekday = now.weekday()
        current_time = now.time().replace(second=0, microsecond=0)

        for schedule in self._schedules:
            days = [WEEKDAY_MAP.get(d, -1) for d in schedule.get("days", [])]
            if weekday not in days:
                continue
            for period in schedule.get("periods", []):
                try:
                    start = _parse_time(period["start"])
                except (KeyError, ValueError):
                    continue
                if start <= current_time:
                    continue
                # How many minutes until start?
                start_seconds = start.hour * 3600 + start.minute * 60
                now_seconds = current_time.hour * 3600 + current_time.minute * 60
                minutes_until = (start_seconds - now_seconds) / 60
                if 0 < minutes_until <= within_minutes:
                    return {
                        "temperature": float(period.get("temperature", 21.0)),
                        "offset": float(period.get("offset", 0.0)),
                        "start": period["start"],
                        "end": period["end"],
                    }
        return None

    def get_next_period(self, now: Optional[datetime] = None) -> Optional[dict]:
        """Return the next scheduled period (for informational display)."""
        if now is None:
            now = datetime.now()

        weekday = now.weekday()
        current_time = now.time().replace(second=0, microsecond=0)
        candidates = []

        for day_offset in range(7):
            check_day = (weekday + day_offset) % 7
            for schedule in self._schedules:
                days = [WEEKDAY_MAP.get(d, -1) for d in schedule.get("days", [])]
                if check_day not in days:
                    continue
                for period in schedule.get("periods", []):
                    try:
                        start = _parse_time(period["start"])
                    except (KeyError, ValueError):
                        continue
                    if day_offset == 0 and start <= current_time:
                        continue
                    candidates.append((day_offset, start, period))

        if not candidates:
            return None

        candidates.sort(key=lambda x: (x[0], x[1]))
        _, _, period = candidates[0]
        return {
            "temperature": float(period.get("temperature", 21.0)),
            "offset": float(period.get("offset", 0.0)),
            "start": period["start"],
            "end": period["end"],
        }

    def update_schedules(self, schedules: list) -> None:
        """Update schedules."""
        self._schedules = schedules

    @property
    def schedules(self) -> list:
        """Return current schedules."""
        return self._schedules
