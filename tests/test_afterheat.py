from custom_components.intelligent_heating_control.afterheat import (
    add_sample,
    coast_setpoint,
    coast_step,
    learned,
    update_tracker,
)

MIN = 60.0


def run(state, series, start=0.0, step=MIN):
    """series: list of (temp, heating); returns the samples produced."""
    out = []
    t = start
    for temp, heating in series:
        s = update_tracker(state, temp, t, heating, False)
        if s:
            out.append(s)
        t += step
    return out


def test_learns_overshoot_and_time_to_peak():
    st = {}
    heat = [(20.0, True)] * 20                       # 20 min heating
    after = [(20.5, False), (20.7, False), (20.9, False), (21.0, False), (21.1, False)]  # rising 4 min
    fall = [(21.0, False)] * 16                       # settles 0.1 below the peak
    samples = run(st, heat + after + fall)
    assert samples == [(1.1, 5.0)]   # from the last open-valve sample (20.0) to the peak


def test_short_pulse_and_open_window_are_ignored():
    st = {}
    assert run(st, [(20.0, True)] * 5 + [(20.0, False)] + [(20.3, False)] * 30) == []
    st = {}
    run(st, [(20.0, True)] * 20 + [(20.0, False), (20.3, False)])
    assert update_tracker(st, 20.4, 9999, False, True) is None   # window opened
    assert "track" not in st


def test_heating_again_after_clear_peak_still_counts():
    st = {}
    samples = run(st, [(20.0, True)] * 15 + [(20.0, False), (20.4, False), (20.2, False), (20.1, True)])
    assert samples == [(0.4, 2.0)]


def test_learned_needs_three_and_uses_median_capped():
    s = []
    for x in [(0.4, 20), (0.6, 30)]:
        s = add_sample(s, x)
    assert learned(s) is None
    s = add_sample(s, (3.0, 40))
    assert learned(s) == {"overshoot": 0.6, "minutes": 30, "count": 3}
    for _ in range(12):
        s = add_sample(s, (2.5, 50))
    assert len(s) == 10 and learned(s)["overshoot"] == 1.5


def test_coast_starts_near_target_and_ends_at_target_or_when_falling():
    c = coast_step(None, 20.3, 21.0, True, 0.6, 0)
    assert c is None                                  # 0.7 below target: keep heating
    c = coast_step(None, 20.5, 21.0, True, 0.6, 0)
    assert c == {"since": 0, "tmax": 20.5}
    c = coast_step(c, 20.8, 21.0, False, 0.6, 600)
    assert c["tmax"] == 20.8
    assert coast_step(c, 21.0, 21.0, False, 0.6, 900) is None          # reached
    assert coast_step(c, 20.7, 21.0, False, 0.6, 900) is None          # falling again
    assert coast_step(None, 20.5, 21.0, False, 0.6, 0) is None         # not heating
    assert coast_step(None, 20.9, 21.0, True, 0.1, 0) is None          # nothing learned


def test_coast_setpoint():
    assert coast_setpoint(20.5, 21.0, 7.0) == 20.0
    assert coast_setpoint(20.7, 21.0, 7.0) == 20.0
    assert coast_setpoint(8.0, 21.0, 7.5) == 7.5
