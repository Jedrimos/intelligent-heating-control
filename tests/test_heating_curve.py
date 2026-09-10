"""Tests for heating_curve.HeatingCurve (outdoor temp -> base target temp)."""
import pytest

from custom_components.intelligent_heating_control.heating_curve import HeatingCurve


DEFAULT_POINTS = [
    {"outdoor_temp": -20, "target_temp": 24.0},
    {"outdoor_temp": -10, "target_temp": 23.0},
    {"outdoor_temp": 0, "target_temp": 22.0},
    {"outdoor_temp": 10, "target_temp": 20.5},
    {"outdoor_temp": 20, "target_temp": 18.0},
]


def test_requires_at_least_two_points():
    with pytest.raises(ValueError):
        HeatingCurve([{"outdoor_temp": 0, "target_temp": 20.0}])


def test_exact_point_match():
    curve = HeatingCurve(DEFAULT_POINTS)
    assert curve.get_target_temp(0) == 22.0
    assert curve.get_target_temp(-20) == 24.0
    assert curve.get_target_temp(20) == 18.0


def test_linear_interpolation_between_points():
    curve = HeatingCurve(DEFAULT_POINTS)
    # Halfway between (0, 22.0) and (10, 20.5) -> 21.25, rounded to 1 decimal.
    # Python's round() is round-half-to-even, so 21.25 rounds to 21.2, not 21.3.
    assert curve.get_target_temp(5) == 21.2


def test_clips_below_minimum():
    curve = HeatingCurve(DEFAULT_POINTS)
    assert curve.get_target_temp(-30) == 24.0


def test_clips_above_maximum():
    curve = HeatingCurve(DEFAULT_POINTS)
    assert curve.get_target_temp(30) == 18.0


def test_points_are_sorted_regardless_of_input_order():
    shuffled = [DEFAULT_POINTS[3], DEFAULT_POINTS[0], DEFAULT_POINTS[4], DEFAULT_POINTS[1], DEFAULT_POINTS[2]]
    curve = HeatingCurve(shuffled)
    assert curve.points[0]["outdoor_temp"] == -20
    assert curve.points[-1]["outdoor_temp"] == 20


def test_duplicate_outdoor_temp_points_do_not_crash():
    curve = HeatingCurve([
        {"outdoor_temp": 0, "target_temp": 22.0},
        {"outdoor_temp": 0, "target_temp": 21.0},
        {"outdoor_temp": 10, "target_temp": 20.0},
    ])
    # Should return a value without raising ZeroDivisionError
    assert curve.get_target_temp(0) in (21.0, 22.0)


def test_update_points_replaces_curve():
    curve = HeatingCurve(DEFAULT_POINTS)
    curve.update_points([
        {"outdoor_temp": -10, "target_temp": 30.0},
        {"outdoor_temp": 10, "target_temp": 10.0},
    ])
    assert curve.get_target_temp(0) == 20.0


def test_as_dict_roundtrip():
    curve = HeatingCurve(DEFAULT_POINTS)
    data = curve.as_dict()
    assert "points" in data
    assert len(data["points"]) == len(DEFAULT_POINTS)
