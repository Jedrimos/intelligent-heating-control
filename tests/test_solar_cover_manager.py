"""Tests for solar_cover_manager's pure functions (passive solar + Rollo-Backlog 2026-10-15)."""
from datetime import time

from custom_components.intelligent_heating_control.solar_cover_manager import (
    sun_hits_orientation,
    is_evening_privacy_window,
    sun_in_glare_band,
    lux_hysteresis_active,
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


# ── is_evening_privacy_window ────────────────────────────────────────────────

def test_privacy_sunset_mode_active_when_sun_below_horizon():
    assert is_evening_privacy_window("sunset", time(22, 0), time(21, 0), elevation=-5) is True


def test_privacy_sunset_mode_inactive_during_daytime():
    assert is_evening_privacy_window("sunset", time(14, 0), time(21, 0), elevation=30) is False


def test_privacy_sunset_mode_no_elevation_fails_closed():
    assert is_evening_privacy_window("sunset", time(22, 0), time(21, 0), elevation=None) is False


def test_privacy_time_mode_active_after_configured_time():
    assert is_evening_privacy_window("time", time(21, 30), time(21, 0), elevation=10) is True


def test_privacy_time_mode_inactive_before_configured_time():
    assert is_evening_privacy_window("time", time(18, 0), time(21, 0), elevation=30) is False


def test_privacy_time_mode_wraps_past_midnight():
    # 00:30, configured time 21:00 - still within the overnight window (until the 06:00 cutoff)
    assert is_evening_privacy_window("time", time(0, 30), time(21, 0), elevation=-10) is True
    # 06:30 - past the morning cutoff, window has ended
    assert is_evening_privacy_window("time", time(6, 30), time(21, 0), elevation=5) is False


# ── sun_in_glare_band ─────────────────────────────────────────────────────────

def test_glare_band_low_sun_facing_window():
    assert sun_in_glare_band(azimuth=180, elevation=8, orientation="S", max_elevation=15) is True


def test_glare_band_sun_too_high():
    assert sun_in_glare_band(azimuth=180, elevation=20, orientation="S", max_elevation=15) is False


def test_glare_band_sun_below_horizon():
    assert sun_in_glare_band(azimuth=180, elevation=0, orientation="S", max_elevation=15) is False


def test_glare_band_wrong_direction():
    assert sun_in_glare_band(azimuth=0, elevation=8, orientation="S", max_elevation=15) is False


# ── lux_hysteresis_active ─────────────────────────────────────────────────────

def test_lux_no_reading_fails_open():
    assert lux_hysteresis_active(None, was_active=False, on_threshold=350, off_threshold=270) is True


def test_lux_enter_threshold_when_inactive():
    assert lux_hysteresis_active(360, was_active=False, on_threshold=350, off_threshold=270) is True
    assert lux_hysteresis_active(300, was_active=False, on_threshold=350, off_threshold=270) is False


def test_lux_exit_threshold_once_active():
    assert lux_hysteresis_active(300, was_active=True, on_threshold=350, off_threshold=270) is True
    assert lux_hysteresis_active(250, was_active=True, on_threshold=350, off_threshold=270) is False
