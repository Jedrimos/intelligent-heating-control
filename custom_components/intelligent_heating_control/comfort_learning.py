"""Comfort feedback learning for the "Mir ist kalt / warm" button (v2.6) – HA-free.

Every press is stored as (timestamp, hour-of-day, +1/-1). A press gives an immediate,
temporary ±1 °C for the room (handled by the coordinator). On top of that, IHC learns
a permanent per-hour offset: if somebody repeatedly feels cold around the same time
of day, that hour gets a little more heat from then on.

Rules (deliberately conservative - a single press never changes anything permanently):
  * presses older than LEARN_WINDOW_DAYS are forgotten
  * an hour band (the hour ±1) needs at least LEARN_MIN_PRESSES presses
  * offset = net presses × LEARN_STEP, rounded to 0.5 °C, capped at ±LEARN_MAX
"""
from __future__ import annotations

import math
from datetime import datetime, timedelta
from typing import Iterable

LEARN_WINDOW_DAYS = 30
LEARN_MIN_PRESSES = 3
LEARN_STEP = 0.25
LEARN_MAX = 1.5
TEMP_FEEL_STEP = 1.0
TEMP_FEEL_MAX = 2.0


def prune(presses: Iterable[tuple], now: datetime) -> list:
    cutoff = now - timedelta(days=LEARN_WINDOW_DAYS)
    out = []
    for ts, hour, delta in presses:
        try:
            when = datetime.fromisoformat(ts)
        except (TypeError, ValueError):
            continue
        if when.tzinfo is None and now.tzinfo is not None:
            when = when.replace(tzinfo=now.tzinfo)
        if when >= cutoff:
            out.append((ts, int(hour), int(delta)))
    return out


def learned_offset(presses: Iterable[tuple], hour: int) -> float:
    """Permanent learned offset (°C) for the given hour of day."""
    band = [d for _, h, d in presses if min(abs(h - hour), 24 - abs(h - hour)) <= 1]
    if len(band) < LEARN_MIN_PRESSES:
        return 0.0
    net = sum(band)
    value = max(-LEARN_MAX, min(LEARN_MAX, net * LEARN_STEP))
    # round towards zero to 0.5 °C steps - conservative (3 presses = 0.5 °C, 4 = 1.0 °C)
    return math.copysign(math.floor(abs(value) * 2) / 2, value) if value else 0.0


def learned_profile(presses: Iterable[tuple]) -> list:
    """24 learned offsets (one per hour) for display."""
    presses = list(presses)
    return [learned_offset(presses, h) for h in range(24)]


def add_temporary(current: float, delta: int) -> float:
    """New temporary offset after a press (stacks, capped at ±TEMP_FEEL_MAX)."""
    return max(-TEMP_FEEL_MAX, min(TEMP_FEEL_MAX, current + delta * TEMP_FEEL_STEP))
