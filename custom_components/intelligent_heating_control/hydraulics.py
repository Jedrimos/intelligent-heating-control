"""Hydraulic balancing hints + flow temperature recommendation (v2.7) – HA-free, unit-tested.

IHC sees for every room how far its thermostat opens while heating and how long the room
needs to warm up. Comparing rooms reveals a poor hydraulic balance ("hydraulischer
Abgleich") - one of the biggest and cheapest efficiency levers in a wet heating system:

  * a room whose valve is fully open most of the time while it is still too cold gets too
    little hot water (often the radiator furthest from the pump)
  * a room whose valve barely opens while the others work hard gets more than it needs and
    "steals" water from the others - its valve insert preset can be turned down

If ALL rooms reach their target with half-open valves, the heat source's flow temperature
(heating curve) is higher than necessary - lowering it saves energy, a lot for heat pumps.
If most rooms are starved, the flow temperature is too low.

IHC only gives hints here, it never changes the hydraulics or the heat source itself.
"""
from __future__ import annotations

from statistics import median
from typing import Optional

MIN_SAMPLES = 360          # heating minutes (one sample per minute) before a room counts
EMA_ALPHA = 1.0 / 240.0    # ~4 heating hours of memory
FULL_OPEN = 90.0           # % – valve considered fully open
STARVED_SHARE = 0.5        # share of cold-heating time with a fully open valve
LOW_VALVE = 30.0           # % – barely opens
SLOW_FACTOR = 1.5          # warm-up much slower than the median room
FAST_FACTOR = 0.7


def update_stats(stats: Optional[dict], valve: Optional[float], heating: bool,
                 below_target: bool) -> Optional[dict]:
    """Update a room's running statistics with one sample (call once per minute).
    Only heating samples count. `below_target`: the room is still clearly too cold."""
    if valve is None or not heating:
        return stats
    s = dict(stats or {"avg": float(valve), "starved": 0.0, "n": 0})
    s["avg"] += (float(valve) - s["avg"]) * EMA_ALPHA
    if below_target:
        hit = 1.0 if valve >= FULL_OPEN else 0.0
        s["starved"] += (hit - s["starved"]) * EMA_ALPHA * 2
    s["n"] = int(s.get("n", 0)) + 1
    return s


def balance_hints(rooms: dict) -> dict:
    """rooms: {room_id: {"avg": %, "starved": 0..1, "n": samples, "warmup": min|None}}
    → {room_id: "too_little" | "too_much"} for rooms that stand out (needs ≥ 2 rooms)."""
    ok = {rid: r for rid, r in rooms.items() if r and r.get("n", 0) >= MIN_SAMPLES}
    if len(ok) < 2:
        return {}
    med_avg = median(r["avg"] for r in ok.values())
    warmups = [r["warmup"] for r in ok.values() if r.get("warmup")]
    med_warm = median(warmups) if len(warmups) >= 2 else None
    hints = {}
    for rid, r in ok.items():
        slow = med_warm and r.get("warmup") and r["warmup"] >= SLOW_FACTOR * med_warm
        fast = med_warm is None or (r.get("warmup") and r["warmup"] <= FAST_FACTOR * med_warm)
        if r.get("starved", 0) >= STARVED_SHARE or (r["avg"] >= FULL_OPEN - 5 and slow):
            hints[rid] = "too_little"
        elif r["avg"] <= LOW_VALVE and med_avg - r["avg"] >= 25 and fast:
            hints[rid] = "too_much"
    return hints


def flow_recommendation(rooms: dict) -> Optional[dict]:
    """{"direction": "down"|"up", "kelvin": K} or None (fits / not enough data)."""
    ok = [r for r in rooms.values() if r and r.get("n", 0) >= MIN_SAMPLES]
    if len(ok) < 2:
        return None
    starved = [r for r in ok if r.get("starved", 0) >= 0.3]
    if len(starved) * 2 >= len(ok) and any(r.get("starved", 0) >= STARVED_SHARE for r in ok):
        return {"direction": "up", "kelvin": 3}
    if starved:
        return None  # single rooms starved → balance first, not the flow temperature
    top = max(r["avg"] for r in ok)
    if top <= 40:
        return {"direction": "down", "kelvin": 5}
    if top <= 60:
        return {"direction": "down", "kelvin": 3}
    return None
