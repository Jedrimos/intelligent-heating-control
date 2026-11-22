"""TRV capability detection (v2.6) – HA-free so it can be unit-tested.

Instead of a big "model -> settings" database (fragile: hundreds of Tuya clones,
Zigbee2MQTT and ZHA expose the same device differently, firmware differs), IHC looks
at what a thermostat's device actually offers:

  * a live valve-position sensor        (Danfoss/Bosch pi_heating_demand, Shelly, HmIP …)
  * an "external room temperature" input (Sonoff TRVZB, Aqara E1, Bosch BTH-RA,
                                          Danfoss Ally, Shelly BLU TRV …)
  * a select that switches the TRV to that external sensor (Sonoff, Aqara)
  * a temperature-calibration number

and only keeps a small table for quirks that can't be detected from entities.
"""
from __future__ import annotations

from typing import Optional

# Entity-name fragments (object_id / translation_key / original_name, lowercased)
_VALVE_KEYS = ("pi_heating_demand", "valve_position", "heating_demand", "valve_opening_position",
               "position", "ventilstellung", "level")
# Sonoff TRVZB "valve_opening_degree"/"valve_closing_degree" are LIMIT SETTINGS, never a live position
_VALVE_EXCLUDE = ("degree", "limit", "max", "min", "calibrat", "detection", "alarm", "battery")
_EXTERNAL_KEYS = ("external_temperature_input", "external_measured_room_sensor", "remote_temperature",
                  "external_temperature", "external_temp", "sensor_temp")
_CALIBRATION_KEYS = ("local_temperature_calibration", "temperature_calibration", "temperature_offset",
                     "local_temperature_offset", "calibration")
_SENSOR_SELECT_KEYS = ("temperature_sensor_select", "sensor_select", "sensor")


def _text(*parts: Optional[str]) -> str:
    return " ".join(p for p in parts if p).lower()


def classify_sibling(
    entity_id: str,
    translation_key: Optional[str] = None,
    original_name: Optional[str] = None,
    unit: Optional[str] = None,
    options: Optional[list] = None,
) -> Optional[str]:
    """Role of an entity that belongs to the same device as a TRV, or None.

    Roles: "valve" (live valve opening %), "external_temp" (writable external room
    temperature), "sensor_select" (internal/external sensor switch), "calibration".
    """
    domain, _, object_id = entity_id.partition(".")
    text = _text(object_id, translation_key, original_name)
    if domain == "number":
        if any(k in text for k in _EXTERNAL_KEYS):
            return "external_temp"
        if any(k in text for k in _CALIBRATION_KEYS) and "external" not in text:
            return "calibration"
        # Shelly BLU TRV exposes the live valve position as a number when its own
        # temperature control is active - only accept an exact "valve_position" there
        if "valve_position" in text and not any(x in text for x in _VALVE_EXCLUDE):
            return "valve"
        return None
    if domain == "sensor":
        if any(x in text for x in _VALVE_EXCLUDE):
            return None
        if any(k in text for k in _VALVE_KEYS):
            # "position"/"level" alone are generic - require a percent unit for those
            generic_only = not any(k in text for k in _VALVE_KEYS[:4] + ("ventilstellung",))
            if generic_only and unit != "%":
                return None
            return "valve"
        return None
    if domain == "select":
        opts = [str(o).lower() for o in (options or [])]
        if any(k in text for k in _SENSOR_SELECT_KEYS) and any("external" in o or "remote" in o for o in opts):
            return "sensor_select"
    return None


def external_option(options: Optional[list]) -> Optional[str]:
    """The option of a sensor_select that means "use the external sensor"."""
    for o in options or []:
        lo = str(o).lower()
        if lo in ("external", "remote", "external_sensor") or lo.startswith("external"):
            return str(o)
    return None


def external_temp_value(temp: float, number_max: Optional[float]) -> float:
    """Scale a room temperature for the TRV's external-temperature number entity.
    Danfoss Ally (Z2M) expects centi-degrees (range up to 3500, -8000 = unset)."""
    if number_max is not None and number_max >= 1000:
        return round(temp * 100)
    return round(temp, 1)


# Quirks that can't be detected from entities. Matched case-insensitively against
# "<manufacturer> <model>" of the TRV's device.
QUIRKS = [
    {"match": ("eq-3", "homematic"), "id": "duty_cycle",
     "min_send_interval": 300, "note": "Homematic: Funk-Zeitbudget (Duty Cycle) – seltener senden"},
    {"match": ("bth-ra", "bosch"), "id": "external_resend",
     "external_resend_s": 1200, "note": "Bosch: externer Wert muss mind. alle 30 min kommen"},
    {"match": ("danfoss", "014g2461", "ally"), "id": "external_resend",
     "external_resend_s": 1200, "note": "Danfoss Ally: externer Wert dient als Korrektur, regelmäßig senden"},
    {"match": ("trvzb", "sonoff"), "id": "sonoff_limits",
     "note": "Sonoff: valve_opening_degree ist ein Grenzwert, keine Ventilstellung"},
    {"match": ("_tze", "tuya", "ts0601"), "id": "tuya_auto",
     "avoid_auto_mode": True, "note": "Tuya: eigener Auto-Zeitplan überschreibt Sollwerte – IHC nutzt 'heat'"},
]


def quirks_for(manufacturer: Optional[str], model: Optional[str]) -> list:
    text = _text(manufacturer, model)
    if not text:
        return []
    return [q for q in QUIRKS if any(m in text for m in q["match"])]
