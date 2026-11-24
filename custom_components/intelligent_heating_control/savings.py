"""Savings balance ("Spar-Bilanz", v2.7) – HA-free, unit-tested.

What did IHC save compared with a plain thermostat that holds the comfort temperature all
the time? A room's heat loss is proportional to (room - outside). Every degree IHC keeps a
room below comfort therefore saves  radiator_kw × Δ / DESIGN_DT  (the rated radiator output
roughly matches the room's heat load at the design outdoor temperature, -12 °C → 32 K).
Each saving is attributed to the feature that caused it.

This is an estimate with the same accuracy as the consumption model (heat_output.py) – good
for "where does IHC save the most", not an invoice.
"""
from __future__ import annotations

from typing import Optional

DESIGN_DT = 32.0
CATEGORIES = ("window", "away", "vacation", "schedule", "saving", "afterheat")
_AWAY = {"system_away", "room_away", "room_presence_away", "pir_absence"}
# explicit user choices / safety targets - not counted as an IHC saving
_SKIP = {"frost_protection", "system_off", "room_off", "manual", "boost", "temp_threshold_override",
         "system_heat", "guest_mode"}


def savings_kw(radiator_kw: float, comfort: Optional[float], target: Optional[float],
               outdoor: Optional[float], source: str, window_open: bool = False,
               coasting: bool = False, overshoot: Optional[float] = None,
               saving_offset: float = 0.0) -> dict:
    """Saved heat power (kW) per category for one room right now."""
    if not radiator_kw or radiator_kw <= 0 or comfort is None or outdoor is None or outdoor >= comfort:
        return {}
    k = radiator_kw / DESIGN_DT
    if window_open:
        return {"window": round(k * (comfort - outdoor), 4)}
    out: dict = {}
    if coasting and overshoot:
        out["afterheat"] = k * overshoot
    if source in _SKIP or target is None:
        return {c: round(v, 4) for c, v in out.items()}
    delta = max(0.0, comfort - target)
    if delta <= 0:
        return {c: round(v, 4) for c, v in out.items()}
    saving = min(delta, max(0.0, saving_offset or 0.0))
    if saving > 0:
        out["saving"] = out.get("saving", 0.0) + k * saving
    rest = delta - saving
    if rest > 0:
        cat = "away" if source in _AWAY else "vacation" if source == "system_vacation" else "schedule"
        out[cat] = out.get(cat, 0.0) + k * rest
    return {c: round(v, 4) for c, v in out.items()}


def add(totals: dict, kw: dict, hours: float) -> dict:
    """Accumulate kWh (heat) per category."""
    t = dict(totals or {})
    for cat, v in kw.items():
        t[cat] = round(t.get(cat, 0.0) + v * hours, 4)
    return t


def month_report(month: str, consumption_kwh: Optional[float], saved_heat_kwh: dict,
                 efficiency: float, factor: float, price: Optional[float],
                 prev_consumption_kwh: Optional[float], notes: list, en: bool = False) -> str:
    """Markdown text for the monthly report notification."""
    def fin(heat):  # heat → energy you pay for
        return heat / efficiency * factor if efficiency > 0 else heat
    names_de = {"window": "Fenster-Pausen", "away": "Abwesenheit", "vacation": "Urlaub",
                "schedule": "Zeitplan & Nacht", "saving": "Spar-Regler", "afterheat": "Restwärme"}
    names_en = {"window": "window pauses", "away": "away", "vacation": "vacation",
                "schedule": "schedule & night", "saving": "saving dial", "afterheat": "residual heat"}
    names = names_en if en else names_de

    def k(v):
        return f"{v:.0f}" if v >= 10 else f"{v:.1f}"
    saved = {c: fin(v) for c, v in (saved_heat_kwh or {}).items() if v > 0.05}
    total = sum(saved.values())
    eur = f" ≈ {total * price:.2f} €" if price and total else ""
    lines = []
    if consumption_kwh is not None:
        line = (f"Estimated consumption: **{k(consumption_kwh)} kWh**" if en
                else f"Geschätzter Verbrauch: **{k(consumption_kwh)} kWh**")
        if prev_consumption_kwh:
            diff = (consumption_kwh - prev_consumption_kwh) / prev_consumption_kwh * 100
            line += f" ({diff:+.0f} % " + ("vs. previous month)" if en else "zum Vormonat)")
        lines.append(line)
    lines.append((f"Saved by IHC: **{k(total)} kWh**{eur}" if en
                  else f"Durch IHC gespart: **{k(total)} kWh**{eur}"))
    for cat in sorted(saved, key=lambda c: -saved[c]):
        lines.append(f"- {names.get(cat, cat)}: {k(saved[cat])} kWh")
    lines += [f"- 💡 {n}" for n in notes]
    return "\n".join(lines)
