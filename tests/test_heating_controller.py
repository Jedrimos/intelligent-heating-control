"""Tests for heating_controller.py - the per-room 0-100% demand engine."""
from custom_components.intelligent_heating_control.heating_controller import (
    HeatingController,
    calculate_room_demand,
)
from custom_components.intelligent_heating_control.const import ROOM_MODE_AUTO, ROOM_MODE_OFF


def test_demand_zero_within_deadband():
    assert calculate_room_demand(current_temp=21.0, target_temp=21.0, deadband=0.5) == 0.0
    assert calculate_room_demand(current_temp=20.6, target_temp=21.0, deadband=0.5) == 0.0


def test_demand_zero_above_target():
    assert calculate_room_demand(current_temp=22.0, target_temp=21.0, deadband=0.5) == 0.0


def test_demand_scales_linearly_over_demand_range():
    # target - current = 1.0, deadband 0.5, demand_range 5.0 -> effective 0.5 -> 10%
    assert calculate_room_demand(current_temp=20.0, target_temp=21.0, deadband=0.5, demand_range=5.0) == 10.0
    # effective 2.5 -> 50%
    assert calculate_room_demand(current_temp=18.0, target_temp=21.0, deadband=0.5, demand_range=5.0) == 50.0


def test_demand_caps_at_100_percent():
    assert calculate_room_demand(current_temp=10.0, target_temp=21.0, deadband=0.5, demand_range=5.0) == 100.0


def test_update_room_window_open_forces_zero_demand():
    ctrl = HeatingController()
    state = ctrl.update_room(
        "r1", current_temp=15.0, target_temp=21.0, deadband=0.5,
        window_open=True, room_mode=ROOM_MODE_AUTO,
    )
    assert state["demand"] == 0.0


def test_update_room_off_mode_forces_zero_demand():
    ctrl = HeatingController()
    state = ctrl.update_room(
        "r1", current_temp=15.0, target_temp=21.0, deadband=0.5,
        window_open=False, room_mode=ROOM_MODE_OFF,
    )
    assert state["demand"] == 0.0


def test_update_room_missing_sensor_forces_zero_demand():
    ctrl = HeatingController()
    state = ctrl.update_room(
        "r1", current_temp=None, target_temp=21.0, deadband=0.5,
        window_open=False, room_mode=ROOM_MODE_AUTO,
    )
    assert state["demand"] == 0.0


def test_total_demand_is_plain_average_of_active_rooms():
    ctrl = HeatingController()
    # diff=6.0, deadband 0.5 -> effective 5.5, capped at demand_range 5.0 -> 100%
    ctrl.update_room("a", current_temp=15.0, target_temp=21.0, deadband=0.5, window_open=False, room_mode=ROOM_MODE_AUTO)  # 100%
    ctrl.update_room("b", current_temp=21.0, target_temp=21.0, deadband=0.5, window_open=False, room_mode=ROOM_MODE_AUTO)  # 0%
    assert ctrl.get_total_demand() == 50.0


def test_total_demand_excludes_off_rooms():
    ctrl = HeatingController()
    ctrl.update_room("a", current_temp=15.0, target_temp=21.0, deadband=0.5, window_open=False, room_mode=ROOM_MODE_AUTO)  # 100%
    ctrl.update_room("b", current_temp=10.0, target_temp=21.0, deadband=0.5, window_open=False, room_mode=ROOM_MODE_OFF)  # excluded
    assert ctrl.get_total_demand() == 100.0


def test_total_demand_zero_when_no_rooms():
    ctrl = HeatingController()
    assert ctrl.get_total_demand() == 0.0


def test_rooms_demanding_counts_only_nonzero_active_rooms():
    ctrl = HeatingController()
    ctrl.update_room("a", current_temp=16.0, target_temp=21.0, deadband=0.5, window_open=False, room_mode=ROOM_MODE_AUTO)
    ctrl.update_room("b", current_temp=21.0, target_temp=21.0, deadband=0.5, window_open=False, room_mode=ROOM_MODE_AUTO)
    ctrl.update_room("c", current_temp=10.0, target_temp=21.0, deadband=0.5, window_open=False, room_mode=ROOM_MODE_OFF)
    assert ctrl.get_rooms_demanding() == 1


def test_override_demand_updates_stored_state_and_aggregation():
    ctrl = HeatingController()
    ctrl.update_room("a", current_temp=16.0, target_temp=21.0, deadband=0.5, window_open=False, room_mode=ROOM_MODE_AUTO)  # 100%
    ctrl.override_demand("a", 30.0)
    assert ctrl.room_states["a"]["demand"] == 30.0
    assert ctrl.get_total_demand() == 30.0


def test_override_demand_on_unknown_room_is_noop():
    ctrl = HeatingController()
    ctrl.override_demand("does-not-exist", 50.0)  # must not raise
    assert ctrl.room_states == {}
