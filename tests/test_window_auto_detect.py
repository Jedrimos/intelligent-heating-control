from custom_components.intelligent_heating_control.window_auto_detect import (
    new_state,
    update_auto_window,
)

DROP, WIN, HOLD = 0.8, 360, 1800


def feed(state, readings):
    """readings: list of (ts, temp) -> list of verdicts"""
    return [update_auto_window(state, ts, t, DROP, WIN, HOLD) for ts, t in readings]


def test_slow_cooling_is_not_a_window():
    s = new_state()
    # 0.1 °C per minute -> 0.6 °C in 6 minutes, below threshold
    verdicts = feed(s, [(i * 60, 21.0 - i * 0.1) for i in range(7)])
    assert not any(verdicts)


def test_fast_drop_triggers():
    s = new_state()
    verdicts = feed(s, [(0, 21.0), (60, 20.8), (120, 20.4), (180, 20.1)])
    assert verdicts[-1] is True


def test_drop_outside_window_does_not_trigger():
    s = new_state()
    # 0.9 °C drop but spread over 10 minutes (window is 6 minutes)
    verdicts = feed(s, [(0, 21.0), (300, 20.7), (600, 20.4), (900, 20.1)])
    assert not any(verdicts)


def test_recovery_ends_detection_after_min_active():
    s = new_state()
    feed(s, [(0, 21.0), (120, 20.0)])            # trigger at ts=120, min 20.0
    assert update_auto_window(s, 240, 20.5, DROP, WIN, HOLD) is True   # too early to end
    assert update_auto_window(s, 480, 20.4, DROP, WIN, HOLD) is False  # >5 min, recovered
    # buffer was cleared -> no immediate re-trigger from old peak
    assert update_auto_window(s, 540, 20.3, DROP, WIN, HOLD) is False


def test_hold_cap_ends_detection():
    s = new_state()
    feed(s, [(0, 21.0), (60, 20.0)])
    assert update_auto_window(s, 60 + HOLD - 1, 19.0, DROP, WIN, HOLD) is True
    assert update_auto_window(s, 60 + HOLD, 19.0, DROP, WIN, HOLD) is False


def test_unavailable_sensor_keeps_verdict():
    s = new_state()
    feed(s, [(0, 21.0), (60, 20.0)])
    assert update_auto_window(s, 120, None, DROP, WIN, HOLD) is True
    s2 = new_state()
    assert update_auto_window(s2, 0, None, DROP, WIN, HOLD) is False
