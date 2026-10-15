"""Tests for solar_cover_manager.sun_hits_orientation (passive solar azimuth check)."""
from custom_components.intelligent_heating_control.solar_cover_manager import (
    sun_hits_orientation,
)


def test_sun_directly_on_south_window():
    assert sun_hits_orientation(azimuth=180, elevation=30, orientation="S", min_elevation=10) is True


def test_sun_on_opposite_side_does_not_hit():
    assert sun_hits_orientation(azimuth=0, elevation=30, orientation="S", min_elevation=10) is False


def test_sun_within_enter_tolerance_band():
    # Default (was_active=False, not yet armed) uses the narrower 45° enter tolerance.
    assert sun_hits_orientation(azimuth=135, elevation=30, orientation="S", min_elevation=10) is True
    assert sun_hits_orientation(azimuth=134, elevation=30, orientation="S", min_elevation=10) is False


def test_sun_within_exit_tolerance_band_once_active():
    # Once already armed (was_active=True), the wider 70° exit tolerance applies - a sun angle
    # that wouldn't newly trigger it can still keep it active, avoiding flicker at the boundary.
    assert sun_hits_orientation(azimuth=110, elevation=30, orientation="S", min_elevation=10, was_active=True) is True
    assert sun_hits_orientation(azimuth=109, elevation=30, orientation="S", min_elevation=10, was_active=True) is False
    # That same angle would NOT newly arm it if it wasn't already active:
    assert sun_hits_orientation(azimuth=110, elevation=30, orientation="S", min_elevation=10, was_active=False) is False


def test_below_min_elevation_never_hits():
    assert sun_hits_orientation(azimuth=180, elevation=5, orientation="S", min_elevation=10) is False


def test_unknown_orientation_returns_false():
    assert sun_hits_orientation(azimuth=180, elevation=30, orientation="", min_elevation=10) is False
    assert sun_hits_orientation(azimuth=180, elevation=30, orientation="XX", min_elevation=10) is False


def test_wraparound_near_zero_azimuth():
    # North-facing window (azimuth 0), sun at 350° should still be within 60° tolerance
    assert sun_hits_orientation(azimuth=350, elevation=15, orientation="N", min_elevation=10) is True
