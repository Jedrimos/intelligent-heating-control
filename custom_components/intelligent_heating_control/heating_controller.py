"""
Heating Controller - per-room demand engine.

TRV mode uses each room's 0-100% demand directly as the heating signal
(no central boiler on/off decision, no cooling actuator - TRVs cannot cool).
"""
from __future__ import annotations

import logging
from typing import Dict, Optional

from .const import ROOM_MODE_OFF

_LOGGER = logging.getLogger(__name__)


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


class HeatingController:
    """
    Per-room demand engine.

    Collects each room's demand and aggregates it into total demand / rooms
    demanding metrics for the dashboard and diagnostics.
    """

    def __init__(self) -> None:
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
    # Properties & serialization
    # ------------------------------------------------------------------

    @property
    def room_states(self) -> dict:
        return dict(self._room_states)

    def get_debug_info(self) -> dict:
        """Return full debug information for the UI."""
        return {
            "total_demand": self.get_total_demand(),
            "rooms_demanding": self.get_rooms_demanding(),
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
