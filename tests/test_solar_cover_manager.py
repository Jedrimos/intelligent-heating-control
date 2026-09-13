"""Tests for solar_cover_manager.sun_hits_orientation (passive solar azimuth check)."""
from custom_components.intelligent_heating_control.solar_cover_manager import (
    sun_hits_orientation,
)


def test_sun_directly_on_south_window():
    assert sun_hits_orientation(azimuth=180, elevation=30, orientation="S", min_elevation=10) is True


def test_sun_on_opposite_side_does_not_hit():
    assert sun_hits_orientation(azimuth=0, elevation=30, orientation="S", min_elevation=10) is False


def test_sun_within_tolerance_band():
    # 60° tolerance: 180 - 60 = 120 should still hit
    assert sun_hits_orientation(azimuth=120, elevation=30, orientation="S", min_elevation=10) is True
    assert sun_hits_orientation(azimuth=119, elevation=30, orientation="S", min_elevation=10) is False


def test_below_min_elevation_never_hits():
    assert sun_hits_orientation(azimuth=180, elevation=5, orientation="S", min_elevation=10) is False


def test_unknown_orientation_returns_false():
    assert sun_hits_orientation(azimuth=180, elevation=30, orientation="", min_elevation=10) is False
    assert sun_hits_orientation(azimuth=180, elevation=30, orientation="XX", min_elevation=10) is False


def test_wraparound_near_zero_azimuth():
    # North-facing window (azimuth 0), sun at 350° should still be within 60° tolerance
    assert sun_hits_orientation(azimuth=350, elevation=15, orientation="N", min_elevation=10) is True
