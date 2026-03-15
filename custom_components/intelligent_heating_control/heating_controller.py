"""
Heating Controller - Loxone-style Klimabaustein.

Aggregates heating demand from all rooms and makes a central
on/off decision for the boiler/heating system, including:
- Hysteresis to prevent short cycling
- Minimum on/off times
- Minimum number of rooms demanding heat
- Window open detection per room
- System-wide mode override (Away, Vacation, Off)
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Dict, Optional

from .const import (
    SYSTEM_MODE_AUTO,
    SYSTEM_MODE_HEAT,
    SYSTEM_MODE_COOL,
    SYSTEM_MODE_OFF,
    SYSTEM_MODE_AWAY,
    SYSTEM_MODE_VACATION,
    ROOM_MODE_OFF,
    ROOM_MODE_MANUAL,
    ROOM_MODE_AWAY,
    ROOM_MODE_SLEEP,
    ROOM_MODE_ECO,
    ROOM_MODE_COMFORT,
    ROOM_MODE_AUTO,
)

_LOGGER = logging.getLogger(__name__)


def calculate_room_demand(
    current_temp: float,
    target_temp: float,
    deadband: float = 0.5,
) -> float:
    """
    Calculate proportional heating demand for a room (0.0 - 100.0 %).

    Demand is proportional in the range [target - deadband*2 ... target]:
      - current >= target          → 0 %  (no heating needed)
      - current <= target - 2*db  → 100 % (full demand)
      - linear in between

    The deadband creates a comfortable hysteresis per room.
    """
    diff = target_temp - current_temp
    if diff <= 0:
        return 0.0
    max_diff = deadband * 2.0
    if diff >= max_diff:
        return 100.0
    return round((diff / max_diff) * 100.0, 1)


def calculate_room_cooling_demand(
    current_temp: float,
    target_temp: float,
    deadband: float = 0.5,
) -> float:
    """Calculate cooling demand (0-100%) - mirrors heating logic."""
    diff = current_temp - target_temp
    if diff <= 0:
        return 0.0
    max_diff = deadband * 2.0
    if diff >= max_diff:
        return 100.0
    return round((diff / max_diff) * 100.0, 1)


class HeatingController:
    """
    Central heating/cooling controller - the Klimabaustein.

    Collects demands from all room controllers, aggregates them
    (weighted average), and decides whether the heating system
    should be active.
    """

    def __init__(
        self,
        demand_threshold: float = 15.0,
        demand_hysteresis: float = 5.0,
        min_on_time: int = 5,
        min_off_time: int = 5,
        min_rooms_demand: int = 1,
    ) -> None:
        self._demand_threshold = demand_threshold
        self._demand_hysteresis = demand_hysteresis
        self._min_on_time = timedelta(minutes=min_on_time)
        self._min_off_time = timedelta(minutes=min_off_time)
        self._min_rooms_demand = min_rooms_demand

        self._heating_active: bool = False
        self._cooling_active: bool = False
        self._last_heating_state_change: datetime = datetime.now()
        self._last_cooling_state_change: datetime = datetime.now()

        # Room state cache: {room_id: RoomState}
        self._room_states: Dict[str, dict] = {}

    # ------------------------------------------------------------------
    # Room state management
    # ------------------------------------------------------------------

    def update_room(
        self,
        room_id: str,
        current_temp: Optional[float],
        target_temp: float,
        deadband: float,
        weight: float,
        window_open: bool,
        room_mode: str,
        manual_temp: Optional[float] = None,
    ) -> dict:
        """
        Update a room's state and recalculate its demand.

        Returns the room state dict (including demand %).
        """
        # Window open → no demand
        if window_open:
            demand = 0.0
            effective_target = target_temp
        elif room_mode == ROOM_MODE_OFF:
            demand = 0.0
            effective_target = target_temp
        elif current_temp is None:
            demand = 0.0
            effective_target = target_temp
        else:
            demand = calculate_room_demand(current_temp, target_temp, deadband)
            effective_target = target_temp

        self._room_states[room_id] = {
            "current_temp": current_temp,
            "target_temp": effective_target,
            "demand": demand,
            "weight": weight,
            "window_open": window_open,
            "room_mode": room_mode,
        }
        return self._room_states[room_id]

    # ------------------------------------------------------------------
    # Demand aggregation (the Klimabaustein core logic)
    # ------------------------------------------------------------------

    def get_total_demand(self) -> float:
        """
        Aggregate demand from all rooms using weighted average.

        Only rooms with weight > 0 and mode != OFF count.
        Returns 0-100 %.
        """
        weighted_sum = 0.0
        total_weight = 0.0
        for state in self._room_states.values():
            if state["room_mode"] == ROOM_MODE_OFF:
                continue
            w = state["weight"]
            weighted_sum += state["demand"] * w
            total_weight += w

        if total_weight == 0:
            return 0.0
        return round(weighted_sum / total_weight, 1)

    def get_rooms_demanding(self) -> int:
        """Count rooms that have non-zero demand."""
        return sum(
            1 for s in self._room_states.values()
            if s["demand"] > 0 and s["room_mode"] != ROOM_MODE_OFF
        )

    # ------------------------------------------------------------------
    # Central on/off decision
    # ------------------------------------------------------------------

    def should_heat(self, system_mode: str = SYSTEM_MODE_AUTO) -> bool:
        """
        Decide whether heating should be active.

        Applies:
          - System mode overrides (OFF, AWAY, VACATION → no heat or fixed)
          - Minimum number of rooms demanding heat
          - Hysteresis (ON threshold vs OFF threshold)
          - Minimum ON and OFF times to prevent short cycling
        """
        if system_mode in (SYSTEM_MODE_OFF, SYSTEM_MODE_COOL):
            return self._apply_min_time(False)

        total_demand = self.get_total_demand()
        rooms_demanding = self.get_rooms_demanding()

        # Check minimum rooms requirement
        if rooms_demanding < self._min_rooms_demand:
            return self._apply_min_time(False)

        # Hysteresis logic
        if self._heating_active:
            # Keep heating until demand drops below (threshold - hysteresis)
            new_state = total_demand >= (self._demand_threshold - self._demand_hysteresis)
        else:
            # Start heating when demand exceeds threshold
            new_state = total_demand >= self._demand_threshold

        return self._apply_min_time(new_state)

    def should_cool(self, system_mode: str = SYSTEM_MODE_AUTO) -> bool:
        """Decide whether cooling should be active."""
        if system_mode in (SYSTEM_MODE_OFF, SYSTEM_MODE_HEAT, SYSTEM_MODE_AWAY, SYSTEM_MODE_VACATION):
            return self._apply_min_time_cooling(False)

        # For cooling, calculate cooling demand from room states (weighted average)
        weighted_sum = 0.0
        total_weight = 0.0
        for state in self._room_states.values():
            if state["room_mode"] == ROOM_MODE_OFF:
                continue
            ct = state["current_temp"]
            tt = state["target_temp"]
            if ct is None:
                continue
            w = state["weight"]
            weighted_sum += calculate_room_cooling_demand(ct, tt, 0.5) * w
            total_weight += w

        if total_weight == 0:
            return self._apply_min_time_cooling(False)

        total_cooling = weighted_sum / total_weight
        if self._cooling_active:
            new_state = total_cooling >= (self._demand_threshold - self._demand_hysteresis)
        else:
            new_state = total_cooling >= self._demand_threshold

        return self._apply_min_time_cooling(new_state)

    def _apply_min_time(self, desired: bool) -> bool:
        """Enforce minimum on/off times for heating."""
        now = datetime.now()
        elapsed = now - self._last_heating_state_change

        if desired == self._heating_active:
            return self._heating_active

        if self._heating_active and not desired:
            # Want to turn OFF - check min on time
            if elapsed < self._min_on_time:
                _LOGGER.debug("Min ON time not reached (%s/%s)", elapsed, self._min_on_time)
                return True  # Stay on
            self._heating_active = False
            self._last_heating_state_change = now

        elif not self._heating_active and desired:
            # Want to turn ON - check min off time
            if elapsed < self._min_off_time:
                _LOGGER.debug("Min OFF time not reached (%s/%s)", elapsed, self._min_off_time)
                return False  # Stay off
            self._heating_active = True
            self._last_heating_state_change = now

        return self._heating_active

    def _apply_min_time_cooling(self, desired: bool) -> bool:
        """Enforce minimum on/off times for cooling."""
        now = datetime.now()
        elapsed = now - self._last_cooling_state_change

        if desired == self._cooling_active:
            return self._cooling_active

        if self._cooling_active and not desired:
            if elapsed < self._min_on_time:
                return True
            self._cooling_active = False
            self._last_cooling_state_change = now
        elif not self._cooling_active and desired:
            if elapsed < self._min_off_time:
                return False
            self._cooling_active = True
            self._last_cooling_state_change = now

        return self._cooling_active

    # ------------------------------------------------------------------
    # Properties & serialization
    # ------------------------------------------------------------------

    @property
    def heating_active(self) -> bool:
        return self._heating_active

    @property
    def cooling_active(self) -> bool:
        return self._cooling_active

    @property
    def room_states(self) -> dict:
        return dict(self._room_states)

    def update_settings(
        self,
        demand_threshold: float,
        demand_hysteresis: float,
        min_on_time: int,
        min_off_time: int,
        min_rooms_demand: int,
    ) -> None:
        """Update controller settings at runtime."""
        self._demand_threshold = demand_threshold
        self._demand_hysteresis = demand_hysteresis
        self._min_on_time = timedelta(minutes=min_on_time)
        self._min_off_time = timedelta(minutes=min_off_time)
        self._min_rooms_demand = min_rooms_demand

    def get_debug_info(self) -> dict:
        """Return full debug information for the UI."""
        return {
            "heating_active": self._heating_active,
            "cooling_active": self._cooling_active,
            "total_demand": self.get_total_demand(),
            "rooms_demanding": self.get_rooms_demanding(),
            "demand_threshold": self._demand_threshold,
            "demand_hysteresis": self._demand_hysteresis,
            "min_on_time_minutes": int(self._min_on_time.total_seconds()) // 60,
            "min_off_time_minutes": int(self._min_off_time.total_seconds()) // 60,
            "min_rooms_demand": self._min_rooms_demand,
            "last_heating_state_change": self._last_heating_state_change.isoformat(),
            "last_cooling_state_change": self._last_cooling_state_change.isoformat(),
            "rooms": {
                rid: {
                    "current_temp": s["current_temp"],
                    "target_temp": s["target_temp"],
                    "demand": s["demand"],
                    "window_open": s["window_open"],
                    "room_mode": s["room_mode"],
                }
                for rid, s in self._room_states.items()
            },
        }
