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


def test_threshold_adapts_to_a_jumpy_room():
    from custom_components.intelligent_heating_control.window_auto_detect import effective_threshold
    s = new_state()
    # a bathroom whose readings regularly wobble by ~0.6 °C within the window
    ts = 0
    for i in range(200):
        ts += 60
        update_auto_window(s, ts, 21.0 if i % 4 else 20.4, DROP, WIN, HOLD)
    thr = effective_threshold(s, DROP)
    assert DROP < thr <= DROP * 2.0
    # a 0.9 °C drop no longer counts as a window there ...
    assert update_auto_window(s, ts + 60, 21.0, DROP, WIN, HOLD) is False
    assert update_auto_window(s, ts + 120, 20.1, DROP, WIN, HOLD) is False
    # ... but a real one (1.8 °C) still does
    assert update_auto_window(s, ts + 180, 19.2, DROP, WIN, HOLD) is True


def test_calm_room_keeps_configured_threshold():
    from custom_components.intelligent_heating_control.window_auto_detect import effective_threshold
    s = new_state()
    for i in range(200):
        update_auto_window(s, i * 60, 21.0 - (i % 2) * 0.1, DROP, WIN, HOLD)
    assert effective_threshold(s, DROP) == DROP
