"""
Heating Controller - per-room demand engine + cooling actuator gate.

TRV mode uses each room's 0-100% demand directly as the heating signal
(no central boiler on/off decision). This module still aggregates a
simple, fixed-tuning on/off gate for the optional CONF_COOLING_SWITCH
actuator, since TRVs cannot cool and cooling therefore still needs a
short-cycling-safe switch decision.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Dict, Optional

from .const import (
    SYSTEM_MODE_HEAT,
    SYSTEM_MODE_OFF,
    SYSTEM_MODE_AWAY,
    SYSTEM_MODE_VACATION,
    ROOM_MODE_OFF,
)

_LOGGER = logging.getLogger(__name__)

# Fixed cooling-switch tuning. Not user-configurable: this only protects the
# physical cooling actuator from short-cycling, unlike the old boiler
# threshold/hysteresis/min-times which were configurable for switch mode.
_COOLING_THRESHOLD = 15.0
_COOLING_HYSTERESIS = 5.0
_COOLING_MIN_ON = timedelta(minutes=5)
_COOLING_MIN_OFF = timedelta(minutes=5)


def calculate_room_demand(
    current_temp: float,
    target_temp: float,
    deadband: float = 0.5,
    demand_range: float = 5.0,
) -> float:
    """
    Calculate proportional heating demand for a room (0.0 - 100.0 %).

    Two-zone model:
      1. Deadband zone  [current >= target - deadband]  → 0 %
         (room is close enough to target, no heating needed)
      2. Proportional zone  [deadband ... deadband + demand_range]  → 0–100 %
         Demand scales linearly from 0 % at the deadband edge to 100 % when
         the room is (deadband + demand_range) °C below target.

    With defaults (deadband=0.5, demand_range=5.0):
      current >= target - 0.5°C  →   0 %  (within comfort zone)
      current =  target - 1.0°C  →  10 %  (slightly cold)
      current =  target - 3.0°C  →  50 %  (noticeably cold)
      current <= target - 5.5°C  → 100 %  (very cold, full demand)

    This makes the 0–100 % scale meaningful: you can actually tell the
    difference between a room that is 1 °C cold (10 %) and one that is
    5 °C cold (90 %), instead of both capping at 100 % after just 1 °C.
    """
    diff = target_temp - current_temp
    # Within deadband or above target → no demand
    if diff <= deadband:
        return 0.0
    # Proportional range above the deadband
    effective_diff = diff - deadband
    return round(min(100.0, (effective_diff / demand_range) * 100.0), 1)


def calculate_room_cooling_demand(
    current_temp: float,
    target_temp: float,
    deadband: float = 0.5,
    demand_range: float = 5.0,
) -> float:
    """Calculate cooling demand (0-100%) - mirrors heating logic (inverted direction)."""
    diff = current_temp - target_temp
    if diff <= deadband:
        return 0.0
    effective_diff = diff - deadband
    return round(min(100.0, (effective_diff / demand_range) * 100.0), 1)


class HeatingController:
    """
    Per-room demand engine.

    Collects each room's demand (used directly by TRV mode as the
    per-room heating signal) and separately aggregates a fixed-tuning
    on/off decision for the optional cooling switch.
    """

    def __init__(self) -> None:
        self._cooling_active: bool = False
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
            "deadband": deadband,
            "window_open": window_open,
            "room_mode": room_mode,
        }
        return self._room_states[room_id]

    # ------------------------------------------------------------------
    # Demand aggregation (diagnostic/dashboard metric, not an actuator gate)
    # ------------------------------------------------------------------

    def get_total_demand(self) -> float:
        """
        Aggregate demand from all active (non-OFF) rooms as a plain average.

        Returns 0-100 %.
        """
        demands = [
            s["demand"] for s in self._room_states.values()
            if s["room_mode"] != ROOM_MODE_OFF
        ]
        if not demands:
            return 0.0
        return round(sum(demands) / len(demands), 1)

    def get_rooms_demanding(self) -> int:
        """Count rooms that have non-zero demand."""
        return sum(
            1 for s in self._room_states.values()
            if s["demand"] > 0 and s["room_mode"] != ROOM_MODE_OFF
        )

    def override_demand(self, room_id: str, demand: float) -> None:
        """Override the stored demand for a room after post-processing (e.g. safety gate).

        This keeps get_total_demand() and get_rooms_demanding() in sync with the
        actual demand values stored in room_data by the coordinator.
        """
        if room_id in self._room_states:
            self._room_states[room_id]["demand"] = demand

    # ------------------------------------------------------------------
    # Cooling actuator gate (TRVs cannot cool - this is the only actuator)
    # ------------------------------------------------------------------

    def should_cool(self, system_mode: str) -> bool:
        """Decide whether the cooling switch should be active."""
        if system_mode in (SYSTEM_MODE_OFF, SYSTEM_MODE_HEAT, SYSTEM_MODE_AWAY, SYSTEM_MODE_VACATION):
            return self._apply_min_time_cooling(False)

        demands = []
        for state in self._room_states.values():
            if state["room_mode"] == ROOM_MODE_OFF or state.get("window_open", False):
                continue
            ct = state["current_temp"]
            tt = state["target_temp"]
            if ct is None:
                continue
            demands.append(calculate_room_cooling_demand(ct, tt, state.get("deadband", 0.5)))

        if not demands:
            return self._apply_min_time_cooling(False)

        total_cooling = sum(demands) / len(demands)
        if self._cooling_active:
            new_state = total_cooling >= (_COOLING_THRESHOLD - _COOLING_HYSTERESIS)
        else:
            new_state = total_cooling >= _COOLING_THRESHOLD

        return self._apply_min_time_cooling(new_state)

    def _apply_min_time_cooling(self, desired: bool) -> bool:
        """Enforce minimum on/off times for cooling."""
        now = datetime.now()
        elapsed = now - self._last_cooling_state_change

        if desired == self._cooling_active:
            return self._cooling_active

        if self._cooling_active and not desired:
            if elapsed < _COOLING_MIN_ON:
                return True
            self._cooling_active = False
            self._last_cooling_state_change = now
        elif not self._cooling_active and desired:
            if elapsed < _COOLING_MIN_OFF:
                return False
            self._cooling_active = True
            self._last_cooling_state_change = now

        return self._cooling_active

    # ------------------------------------------------------------------
    # Properties & serialization
    # ------------------------------------------------------------------

    @property
    def cooling_active(self) -> bool:
        return self._cooling_active

    @property
    def room_states(self) -> dict:
        return dict(self._room_states)

    def get_debug_info(self) -> dict:
        """Return full debug information for the UI."""
        return {
            "cooling_active": self._cooling_active,
            "total_demand": self.get_total_demand(),
            "rooms_demanding": self.get_rooms_demanding(),
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
