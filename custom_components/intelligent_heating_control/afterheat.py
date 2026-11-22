"""Radiator after-heat learning ("Restwärme nutzen", v2.7) – HA-free, unit-tested.

A radiator keeps giving off heat after its valve closes, so the room typically keeps
warming by a few tenths of a degree (more for cast iron / heavy panels, a lot for floor
heating). IHC measures that overshoot after every heating phase and then closes the valve
early – when the room is only "overshoot" below its target – so the remaining heat brings
it to the target instead of past it.

Learning (per room, room thermometer only – the TRV's own sensor sits at the radiator):
  * a heating phase of at least MIN_HEAT_MINUTES ends → T0 = temperature at the last
    sample with the valve still open
  * follow the room temperature: the peak Tmax and when it was reached
  * the event is complete once the temperature has clearly fallen from the peak
    (PEAK_DROP below it for PEAK_SETTLE_MINUTES) or after MAX_TRACK_MINUTES
  * overshoot = Tmax - T0, minutes = time to peak
  * an open window or heating starting again before the peak was clear discards it

Using it:
  * learned overshoot = median of the last MAX_SAMPLES events (needs MIN_SAMPLES),
    capped at MAX_OVERSHOOT
  * coast while heating and target - overshoot <= room < target; keep coasting until the
    room reaches the target or the temperature starts falling again (then heat normally)
"""
from __future__ import annotations

from statistics import median
from typing import Optional

MIN_HEAT_MINUTES = 10.0
PEAK_DROP = 0.1
PEAK_SETTLE_MINUTES = 15.0
MAX_TRACK_MINUTES = 120.0
MAX_SAMPLES = 10
MIN_SAMPLES = 3
MAX_OVERSHOOT = 1.5
MIN_USEFUL_OVERSHOOT = 0.2
COAST_MAX_MINUTES = 90.0
COAST_FALL = 0.1


def update_tracker(state: dict, temp: Optional[float], now: float, heating: bool,
                   disturbed: bool) -> Optional[tuple]:
    """Advance the per-room learning state. Returns (overshoot, minutes) when an
    after-heat event is complete, else None. `now` is a timestamp in seconds."""
    if temp is None or disturbed:
        state.pop("track", None)
        state.pop("heat_since", None)
        state.pop("last_heat", None)
        return None

    if heating:
        sample = None
        track = state.pop("track", None)
        if track and track["tmax"] - temp >= PEAK_DROP:
            # heating restarted, but the peak was already clear → still a valid event
            sample = _finish(track)
        state.setdefault("heat_since", now)
        # the decision to close early is taken on a heating sample, so the overshoot is
        # measured from the last moment the valve was still seen open
        state["last_heat"] = (temp, now)
        return sample

    heat_since = state.pop("heat_since", None)
    last_heat = state.pop("last_heat", None)
    if heat_since is not None:
        if last_heat and (last_heat[1] - heat_since) / 60.0 >= MIN_HEAT_MINUTES:
            t0, ts0 = last_heat
            state["track"] = {"t0": t0, "ts0": ts0, "tmax": max(t0, temp),
                              "ts_max": now if temp > t0 else ts0}
        return None

    track = state.get("track")
    if not track:
        return None
    if temp > track["tmax"]:
        track["tmax"], track["ts_max"] = temp, now
    settled = track["tmax"] - temp >= PEAK_DROP and (now - track["ts_max"]) / 60.0 >= PEAK_SETTLE_MINUTES
    if settled or (now - track["ts0"]) / 60.0 >= MAX_TRACK_MINUTES:
        state.pop("track", None)
        return _finish(track)
    return None


def _finish(track: dict) -> tuple:
    overshoot = round(max(0.0, track["tmax"] - track["t0"]), 2)
    minutes = round((track["ts_max"] - track["ts0"]) / 60.0, 1)
    return overshoot, minutes


def add_sample(samples: list, sample: tuple) -> list:
    samples = list(samples) + [list(sample)]
    return samples[-MAX_SAMPLES:]


def learned(samples: list) -> Optional[dict]:
    """Learned after-heat: {"overshoot": °C, "minutes": min, "count": n} or None."""
    if not samples or len(samples) < MIN_SAMPLES:
        return None
    over = min(MAX_OVERSHOOT, median(float(s[0]) for s in samples))
    mins = median(float(s[1]) for s in samples)
    return {"overshoot": round(over, 1), "minutes": round(mins), "count": len(samples)}


def coast_step(coast: Optional[dict], current: Optional[float], target: Optional[float],
               heating: bool, overshoot: Optional[float], now: float) -> Optional[dict]:
    """Decide whether to coast on residual heat. `coast` is the previous state
    ({"since": ts, "tmax": °C} or None); returns the new state (None = heat normally)."""
    if current is None or target is None or overshoot is None or overshoot < MIN_USEFUL_OVERSHOOT:
        return None
    if coast:
        tmax = max(coast["tmax"], current)
        if current >= target:                      # residual heat did its job
            return None
        if tmax - current >= COAST_FALL:           # cooling again → heat normally
            return None
        if (now - coast["since"]) / 60.0 >= COAST_MAX_MINUTES:
            return None
        return {"since": coast["since"], "tmax": tmax}
    if heating and target - overshoot <= current < target:
        return {"since": now, "tmax": current}
    return None


def coast_setpoint(current: float, target: float, floor: float) -> float:
    """Setpoint that makes the thermostat close its valve now (0.5 °C steps, never
    below `floor`)."""
    value = min(current, target) - 0.5
    value = int(value * 2) / 2.0  # round down to 0.5
    return max(floor, value)
