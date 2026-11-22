import pytest

from custom_components.intelligent_heating_control.savings import add, month_report, savings_kw


def test_eco_at_night_counts_as_schedule():
    kw = savings_kw(1.6, 21.0, 18.0, 0.0, "schedule")
    assert kw == {"schedule": pytest.approx(1.6 / 32 * 3)}


def test_saving_dial_and_away_are_split():
    kw = savings_kw(3.2, 21.0, 16.0, 5.0, "system_away", saving_offset=1.0)
    assert kw["saving"] == pytest.approx(0.1)
    assert kw["away"] == pytest.approx(0.4)


def test_window_saves_the_whole_heat_load_and_explicit_choices_count_nothing():
    assert savings_kw(1.6, 21.0, 7.0, 1.0, "schedule", window_open=True) == {"window": pytest.approx(1.0)}
    assert savings_kw(1.6, 21.0, 7.0, 1.0, "room_off") == {}
    assert savings_kw(1.6, 21.0, 18.0, 22.0, "schedule") == {}       # warmer outside: no heating need
    assert savings_kw(1.6, 21.0, 21.0, 0.0, "comfort") == {}


def test_afterheat_and_accumulation():
    kw = savings_kw(1.6, 21.0, 21.0, 0.0, "comfort", coasting=True, overshoot=0.5)
    assert kw == {"afterheat": pytest.approx(0.025)}
    t = add({}, {"schedule": 0.15}, 2.0)
    t = add(t, {"schedule": 0.15, "window": 1.0}, 0.5)
    assert t == {"schedule": pytest.approx(0.375), "window": pytest.approx(0.5)}


def test_month_report_text():
    txt = month_report("2026-11", 420.0, {"schedule": 46.0, "window": 9.2}, 0.92, 1.0, 0.12, 400.0,
                       ["Bad bekommt zu wenig Heizwasser"])
    assert "420 kWh" in txt and "+5 %" in txt
    assert "60 kWh" in txt and "≈ 7.20 €" in txt          # (46+9.2)/0.92 = 60 kWh × 0.12 €
    assert txt.index("Zeitplan") < txt.index("Fenster")
    assert "💡 Bad" in txt
    assert "Saved by IHC" in month_report("2026-11", None, {}, 1.0, 1.0, None, None, [], en=True)
