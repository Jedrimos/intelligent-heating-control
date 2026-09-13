"""Tests for schedule_manager.interpolate_sleep_profile (night-long sleep temp curve)."""
from datetime import time

from custom_components.intelligent_heating_control.schedule_manager import (
    interpolate_sleep_profile,
)

PROFILE = [
    {"time": "22:00", "temp": 19.0},
    {"time": "02:00", "temp": 16.0},
    {"time": "06:00", "temp": 18.0},
]


def test_empty_profile_returns_none():
    assert interpolate_sleep_profile([], time(23, 0)) is None


def test_single_point_is_constant():
    assert interpolate_sleep_profile([{"time": "22:00", "temp": 19.0}], time(3, 0)) == 19.0


def test_exact_point_matches():
    assert interpolate_sleep_profile(PROFILE, time(22, 0)) == 19.0
    assert interpolate_sleep_profile(PROFILE, time(2, 0)) == 16.0
    assert interpolate_sleep_profile(PROFILE, time(6, 0)) == 18.0


def test_interpolates_across_midnight():
    # Halfway between 22:00 (19.0) and 02:00 (16.0) is 00:00 -> 17.5
    assert interpolate_sleep_profile(PROFILE, time(0, 0)) == 17.5


def test_interpolates_within_same_day_segment():
    # Halfway between 02:00 (16.0) and 06:00 (18.0) is 04:00 -> 17.0
    assert interpolate_sleep_profile(PROFILE, time(4, 0)) == 17.0


def test_wraps_from_last_point_back_to_first():
    # Segment from 06:00 (18.0) back around to 22:00 (19.0) spans 16h; at 14:00 (8h in) -> halfway
    assert interpolate_sleep_profile(PROFILE, time(14, 0)) == 18.5


def test_unsorted_input_still_works():
    shuffled = [PROFILE[2], PROFILE[0], PROFILE[1]]
    assert interpolate_sleep_profile(shuffled, time(0, 0)) == 17.5


def test_malformed_entries_are_skipped():
    profile = [{"time": "bad"}, {"time": "22:00", "temp": 19.0}]
    assert interpolate_sleep_profile(profile, time(23, 0)) == 19.0


def test_all_malformed_returns_none():
    assert interpolate_sleep_profile([{"time": "bad"}], time(23, 0)) is None
