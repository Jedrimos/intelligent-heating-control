"""Tests for decision_reason's pure functions (Decision-Sensor Backlog 2026-11-02)."""
from custom_components.intelligent_heating_control.decision_reason import (
    get_decision_reason,
    get_no_heat_reason,
)


def test_known_source_is_translated():
    assert get_decision_reason("heating_curve") == "Heizkurve (außerhalb Zeitplan)"
    assert get_decision_reason("room_off") == "Zimmer ausgeschaltet"


def test_window_restore_suffix_is_stripped_and_annotated():
    reason = get_decision_reason("schedule+window_restore")
    assert reason.startswith("Zeitplan aktiv")
    assert "wiederhergestellt" in reason


def test_unregistered_source_falls_back_to_prettified_string():
    assert get_decision_reason("some_future_tag") == "Some future tag"


def test_empty_source_is_unknown():
    assert get_decision_reason("") == "Unbekannt"
    assert get_decision_reason(None) == "Unbekannt"


def test_no_heat_reason_none_when_demand_active():
    room = {"demand": 42.0, "current_temp": 18.0, "target_temp": 21.0}
    assert get_no_heat_reason(room) is None


def test_no_heat_reason_none_when_at_target():
    room = {"demand": 0.0, "current_temp": 21.0, "target_temp": 21.0}
    assert get_no_heat_reason(room) is None


def test_no_heat_reason_window_open_takes_priority():
    room = {
        "demand": 0.0, "current_temp": 18.0, "target_temp": 21.0,
        "window_open": True, "warmup_stall_active": True,
    }
    assert get_no_heat_reason(room) == "Fenster offen"


def test_no_heat_reason_room_off():
    room = {"demand": 0.0, "current_temp": 18.0, "target_temp": 21.0, "room_mode": "off"}
    assert get_no_heat_reason(room) == "Zimmer manuell ausgeschaltet"


def test_no_heat_reason_global_suppression_applies():
    room = {"demand": 0.0, "current_temp": 18.0, "target_temp": 21.0}
    assert get_no_heat_reason(room, "Sommerautomatik aktiv") == "Sommerautomatik aktiv"


def test_no_heat_reason_global_suppression_skipped_for_ignore_heating_period_room():
    room = {
        "demand": 0.0, "current_temp": 18.0, "target_temp": 21.0,
        "ignore_heating_period": True, "warmup_stall_active": True,
    }
    reason = get_no_heat_reason(room, "Heizperiode inaktiv")
    assert reason == "Aufheizen hängt – TRV meldet Anforderung, aber Raum wird nicht wärmer"


def test_no_heat_reason_warmup_stall():
    room = {
        "demand": 0.0, "current_temp": 18.0, "target_temp": 21.0,
        "warmup_stall_active": True,
    }
    assert "wärmer" in get_no_heat_reason(room)


def test_no_heat_reason_stuck_valve():
    room = {
        "demand": 0.0, "current_temp": 18.0, "target_temp": 21.0,
        "trv_stuck_valves": ["trv.living_room"],
    }
    assert get_no_heat_reason(room) == "TRV-Ventil vermutlich verkalkt/festsitzend"


def test_no_heat_reason_none_when_no_sensor_data():
    assert get_no_heat_reason({"demand": 0.0}) is None
