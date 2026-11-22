from datetime import datetime, timedelta, timezone

from custom_components.intelligent_heating_control.comfort_learning import (
    add_temporary,
    learned_offset,
    learned_profile,
    prune,
)

NOW = datetime(2026, 11, 24, 7, 0, tzinfo=timezone.utc)


def p(days_ago, hour, delta):
    return ((NOW - timedelta(days=days_ago)).isoformat(), hour, delta)


def test_single_press_learns_nothing():
    assert learned_offset([p(1, 7, +1)], 7) == 0.0


def test_repeated_cold_mornings_learn_more_heat():
    presses = [p(1, 7, +1), p(2, 7, +1), p(3, 6, +1), p(4, 8, +1)]
    assert learned_offset(presses, 7) == 1.0
    assert learned_offset(presses, 15) == 0.0  # only around that time of day


def test_mixed_feedback_cancels_out_and_is_capped():
    assert learned_offset([p(1, 20, +1), p(2, 20, -1), p(3, 20, +1)], 20) == 0.0
    many = [p(i % 20, 7, +1) for i in range(20)]
    assert learned_offset(many, 7) == 1.5
    warm = [p(1, 22, -1), p(2, 22, -1), p(3, 23, -1)]
    assert learned_offset(warm, 22) == -0.5


def test_wraps_midnight_and_profile():
    presses = [p(1, 23, +1), p(2, 0, +1), p(3, 23, +1)]
    assert learned_offset(presses, 0) == 0.5
    assert len(learned_profile(presses)) == 24


def test_old_presses_are_forgotten():
    presses = prune([p(40, 7, +1), p(31, 7, +1), p(2, 7, +1)], NOW)
    assert len(presses) == 1


def test_temporary_offset_stacks_and_caps():
    assert add_temporary(0, +1) == 1.0
    assert add_temporary(1.0, +1) == 2.0
    assert add_temporary(2.0, +1) == 2.0
    assert add_temporary(1.0, -1) == 0.0
