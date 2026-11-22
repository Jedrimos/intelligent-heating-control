"""Physically grounded heat / energy estimation (v2.6) – HA-free, unit-tested.

Replaces "heating minutes × rated radiator power", which overestimated by 2–10×:
  * a radiator only delivers its rated power at 75/65/20 °C (EN 442) - at heat-pump
    flow temperatures it is 20–40 % of that
  * a TRV valve is rarely fully open
  * heat delivered ≠ energy paid for (boiler efficiency, heat-pump COP)
"""
from __future__ import annotations

import math
from typing import Optional

NORM_DT = 49.83          # K – log-mean excess temperature at 75/65/20 °C (EN 442)
RADIATOR_EXPONENT = 1.3  # panel radiators (floor heating ≈ 1.1)
DESIGN_OUTDOOR = -12.0   # °C – typical German design outdoor temperature

# Heating systems: default design flow temperature (°C) at DESIGN_OUTDOOR, flow/return
# spread at design point (K), seasonal efficiency (final energy -> heat; heat pump = JAZ)
HEATING_SYSTEMS = {
    "gas":      {"flow": 60.0, "spread": 10.0, "efficiency": 0.92},
    "oil":      {"flow": 65.0, "spread": 10.0, "efficiency": 0.88},
    "pellets":  {"flow": 65.0, "spread": 10.0, "efficiency": 0.85},
    "heatpump": {"flow": 40.0, "spread": 5.0,  "efficiency": 3.5},
    "district": {"flow": 65.0, "spread": 15.0, "efficiency": 1.0},
    "electric": {"flow": 55.0, "spread": 10.0, "efficiency": 1.0},
}
GAS_KWH_PER_M3 = 10.3    # typical calorific value × Zustandszahl (check your gas bill)

# Rated output (W at 75/65/20) per metre length at 600 mm height, by panel type
RADIATOR_W_PER_M_600 = {"10": 640, "11": 900, "20": 1050, "21": 1250, "22": 1650, "33": 2350}


def log_mean_dt(flow: float, ret: float, room: float) -> float:
    """Log-mean excess temperature (K); 0 if the water isn't warmer than the room."""
    a, b = flow - room, ret - room
    if a <= 0.1 or b <= 0.1:
        return 0.0
    if abs(a - b) < 1e-6:
        return a
    return (a - b) / math.log(a / b)


def output_factor(flow: float, ret: float, room: float, n: float = RADIATOR_EXPONENT) -> float:
    """Share of the rated (75/65/20) output a radiator delivers at these temperatures."""
    dt = log_mean_dt(flow, ret, room)
    return 0.0 if dt <= 0 else min(1.5, (dt / NORM_DT) ** n)


def weather_compensated_flow(design_flow: float, outdoor: Optional[float], room: float = 20.0) -> float:
    """Flow temperature of a weather-compensated heat source: design flow at the design
    outdoor temperature, falling linearly towards room+5 °C at 18 °C outside."""
    if outdoor is None:
        return design_flow
    share = (room - outdoor) / (room - DESIGN_OUTDOOR)
    share = max(0.15, min(1.0, share))
    return room + 5.0 + (design_flow - room - 5.0) * share


def valve_output_share(valve_percent: Optional[float]) -> float:
    """Heat output share for a valve opening. Radiator output vs. water flow is strongly
    concave (half the flow still gives well over half the heat), so 30 % ≈ 0.49."""
    if valve_percent is None or valve_percent <= 0:
        return 0.0
    return min(1.0, (min(100.0, valve_percent) / 100.0) ** 0.6)


def room_heat_power_kw(rated_kw: float, valve_percent: Optional[float], heating: bool, demand: float,
                       flow: float, ret: float, room_temp: Optional[float]) -> float:
    """Estimated heat output of a room's radiators right now (kW)."""
    if valve_percent is not None:
        share = valve_output_share(valve_percent)
    elif heating:
        # no valve signal: the TRV says it heats -> assume partial opening
        share = valve_output_share(max(30.0, min(100.0, demand or 0.0)))
    else:
        share = 0.0
    if share <= 0 or rated_kw <= 0:
        return 0.0
    return rated_kw * share * output_factor(flow, ret, room_temp if room_temp is not None else 20.0)


def final_energy(heat_kwh: float, efficiency: float) -> float:
    """Energy you pay for (gas/oil/electricity kWh) for a given amount of heat."""
    return heat_kwh / efficiency if efficiency > 0 else heat_kwh


def estimate_radiator_kw(panel_type: str, height_mm: float, length_mm: float) -> Optional[float]:
    """Rough rated output (kW at 75/65/20) from panel type and size - for people who
    don't know the datasheet value. Height scales sub-linearly (convection)."""
    per_m = RADIATOR_W_PER_M_600.get(str(panel_type))
    if per_m is None or height_mm <= 0 or length_mm <= 0:
        return None
    return round(per_m * (length_mm / 1000.0) * (height_mm / 600.0) ** 0.85 / 1000.0, 2)


def meter_to_kwh(value: float, unit: Optional[str]) -> float:
    """Gas meters report m³ - convert to kWh; everything else is taken as kWh (Wh → kWh)."""
    u = (unit or "").lower()
    if u in ("m³", "m3"):
        return value * GAS_KWH_PER_M3
    if u == "wh":
        return value / 1000.0
    return value
