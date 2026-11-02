"""Backlog 2026-11-02 – Decision-Sensor pro Zimmer: pure translation helpers.

Turns the internal "source" tag (the rule that decided a room's target_temp,
see room_logic.py's _calculate_target_temp) into a human-readable reason, and
explains why a below-target room isn't currently calling for heat. Kept free
of any `homeassistant.*` import (same reasoning as schedule_manager.py /
heating_curve.py / solar_cover_manager.py's pure functions) so it can be
unit-tested directly and reused from both coordinator.py and sensor.py.
"""
from __future__ import annotations

from typing import Optional

# Human-readable translation of every "source" tag _calculate_target_temp() can
# return. Kept as a flat dict so a new source added there has an obvious place
# to register its label - an unregistered tag still degrades gracefully via
# get_decision_reason()'s fallback.
SOURCE_REASON_LABELS: dict[str, str] = {
    "frost_protection": "Frostschutz",
    "system_off": "System ausgeschaltet",
    "system_away": "Systemmodus Abwesend",
    "system_vacation": "Systemmodus Urlaub",
    "guest_mode": "Gästemodus",
    "system_heat": "Systemmodus Heizen (Override)",
    "temp_threshold_override": "Temperaturschwelle unterschritten (Sicherheitsheizung)",
    "holiday_comfort": "Feiertag/Ferien (Komfort)",
    "room_presence_away": "Zimmer-Anwesenheit: niemand da",
    "pir_absence": "Bewegungsmelder: keine Anwesenheit erkannt",
    "room_off": "Zimmer ausgeschaltet",
    "room_away": "Zimmermodus Abwesend",
    "boost": "Boost aktiv",
    "comfort": "Zimmermodus Komfort",
    "eco": "Zimmermodus Eco",
    "sleep": "Zimmermodus Schlafen",
    "manual": "Manuelle Temperatur",
    "comfort_extended": "Komfort-Verlängerung aktiv",
    "ha_schedule": "HA-Zeitplan aktiv",
    "ha_schedule_eco": "HA-Zeitplan inaktiv → Eco",
    "ha_schedule_sleep": "HA-Zeitplan inaktiv → Schlafen",
    "preheat": "Vorheizen vor nächster Zeitplan-Periode",
    "schedule": "Zeitplan aktiv",
    "heating_curve": "Heizkurve (außerhalb Zeitplan)",
}


def get_decision_reason(source: Optional[str]) -> str:
    """Translate a room_data "source" tag into a human-readable reason.

    Handles the "+window_restore" suffix coordinator.py's _process_room appends
    after a window-close setpoint restore.
    """
    if not source:
        return "Unbekannt"
    base = source
    window_restore = False
    if base.endswith("+window_restore"):
        base = base[: -len("+window_restore")]
        window_restore = True
    label = SOURCE_REASON_LABELS.get(base, base.replace("_", " ").strip().capitalize())
    if window_restore:
        label += " (nach Fenster wiederhergestellt)"
    return label


def get_no_heat_reason(room: dict, global_suppressed_reason: Optional[str] = None) -> Optional[str]:
    """Explain why a room isn't currently calling for heat despite being below its
    target temperature - the "surprising" case a Decision sensor should call out.
    Returns None whenever there's nothing to explain (already heating, at/within
    deadband of target, or not enough data).

    `global_suppressed_reason` lets the caller pass in a system-wide gate (startup
    grace / Sommerautomatik / inactive Heizperiode) that isn't tracked per room -
    skipped for rooms with CONF_ROOM_IGNORE_HEATING_PERIOD set, since those bypass
    exactly that gate (see coordinator._update_phase_apply_trv_setpoints).
    """
    current_temp = room.get("current_temp")
    target_temp = room.get("target_temp")
    demand = room.get("demand", 0) or 0
    if demand > 0 or current_temp is None or target_temp is None or current_temp >= target_temp:
        return None
    if room.get("window_open"):
        return "Fenster offen"
    if room.get("room_mode") == "off":
        return "Zimmer manuell ausgeschaltet"
    if global_suppressed_reason and not room.get("ignore_heating_period"):
        return global_suppressed_reason
    if room.get("optimum_stop_active"):
        return "Optimum-Stop: Nachlaufwärme reicht voraussichtlich noch aus"
    if room.get("warmup_stall_active"):
        return "Aufheizen hängt – TRV meldet Anforderung, aber Raum wird nicht wärmer"
    if room.get("trv_stuck_valves"):
        return "TRV-Ventil vermutlich verkalkt/festsitzend"
    return None
