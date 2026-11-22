"""Sensorless open-window detection from a sudden room-temperature drop.

HA-free (no homeassistant imports) so it can be unit-tested directly, like
schedule_manager.py / heating_curve.py.

Idea (same principle as tado°/Versatile Thermostat "auto window"): an open
window makes the room air temperature fall much faster than any normal cooling
does. If the temperature drops by at least ``drop_threshold`` °C within
``window_seconds``, the window is assumed open. The detection ends when

  * the temperature recovers (rises ``RECOVERY_DELTA`` °C above the lowest
    value seen since the trigger, after ``MIN_ACTIVE_SECONDS``) - window was
    closed and the room warms up again, or
  * ``hold_seconds`` have passed (safety cap so a mis-detection can never
    keep a room cold for long).

After it ends, the sample buffer is cleared, so a single drop never triggers
twice in a row.
"""
from __future__ import annotations

from typing import Optional

RECOVERY_DELTA = 0.3        # °C rise from the minimum that counts as "window closed again"
MIN_ACTIVE_SECONDS = 300    # don't end on noise during the first 5 minutes

# Adaptive threshold (v2.6): every room records the temperature drops it sees in normal
# operation (no detection). A room with naturally jumpy readings (bathroom after a shower,
# kitchen, sensor next to a door) raises its own threshold to 1.5x its 95th percentile -
# never above ADAPT_MAX_FACTOR x the configured value, so detection always stays possible.
ADAPT_MIN_SAMPLES = 60
ADAPT_MAX_SAMPLES = 1440    # ~1 day at one reading per minute
ADAPT_FACTOR = 1.5
ADAPT_MAX_FACTOR = 2.0


def effective_threshold(state: dict, base: float) -> float:
    """Configured threshold, raised for rooms whose normal drops are larger."""
    drops = state.get("drops") or []
    if len(drops) < ADAPT_MIN_SAMPLES:
        return base
    ordered = sorted(drops)
    p95 = ordered[int(0.95 * (len(ordered) - 1))]
    return round(min(base * ADAPT_MAX_FACTOR, max(base, p95 * ADAPT_FACTOR)), 2)


def new_state() -> dict:
    """Fresh per-room detector state."""
    return {"samples": [], "active_since": None, "min_temp": None, "drops": []}


def update_auto_window(
    state: dict,
    now_ts: float,
    temp: Optional[float],
    drop_threshold: float,
    window_seconds: float,
    hold_seconds: float,
) -> bool:
    """Feed one temperature reading, return True while a window is assumed open.

    ``state`` is mutated in place (create it with ``new_state()``).
    ``now_ts`` is a monotonic timestamp in seconds. ``temp`` may be None
    (sensor unavailable) - the current verdict is kept, nothing is learned.
    """
    active_since = state.get("active_since")

    if active_since is not None:
        elapsed = now_ts - active_since
        if temp is not None:
            if state.get("min_temp") is None or temp < state["min_temp"]:
                state["min_temp"] = temp
        recovered = (
            temp is not None
            and state.get("min_temp") is not None
            and elapsed >= MIN_ACTIVE_SECONDS
            and temp >= state["min_temp"] + RECOVERY_DELTA
        )
        if recovered or elapsed >= hold_seconds:
            state["active_since"] = None
            state["min_temp"] = None
            state["samples"] = []
            return False
        return True

    if temp is None:
        return False

    samples = [(ts, t) for ts, t in state.get("samples", []) if now_ts - ts <= window_seconds]
    samples.append((now_ts, temp))
    state["samples"] = samples

    peak = max(t for _, t in samples)
    drop = peak - temp
    threshold = effective_threshold(state, drop_threshold)
    if drop_threshold > 0 and drop >= threshold:
        state["active_since"] = now_ts
        state["min_temp"] = temp
        state["samples"] = []
        return True
    drops = state.setdefault("drops", [])
    drops.append(round(max(0.0, drop), 2))
    if len(drops) > ADAPT_MAX_SAMPLES:
        del drops[: len(drops) - ADAPT_MAX_SAMPLES]
    return False
