from custom_components.intelligent_heating_control.hydraulics import (
    MIN_SAMPLES,
    balance_hints,
    flow_recommendation,
    update_stats,
)


def room(avg, starved=0.0, warmup=None, n=MIN_SAMPLES):
    return {"avg": avg, "starved": starved, "n": n, "warmup": warmup}


def test_stats_only_count_heating_samples():
    s = update_stats(None, 50, False, True)
    assert s is None
    s = None
    for _ in range(400):
        s = update_stats(s, 100, True, True)
    assert s["n"] == 400 and s["avg"] == 100 and s["starved"] > 0.9


def test_starved_and_greedy_rooms_are_found():
    hints = balance_hints({
        "bad": room(97, starved=0.7, warmup=140),
        "wz": room(55, warmup=60),
        "kz": room(60, warmup=70),
        "gaeste": room(20, warmup=30),
    })
    assert hints == {"bad": "too_little", "gaeste": "too_much"}


def test_not_enough_data_gives_no_hints():
    assert balance_hints({"a": room(97, starved=0.9), "b": room(40, n=10)}) == {}
    assert flow_recommendation({"a": room(30)}) is None


def test_flow_temperature_recommendation():
    assert flow_recommendation({"a": room(35), "b": room(30)}) == {"direction": "down", "kelvin": 5}
    assert flow_recommendation({"a": room(55), "b": room(45)}) == {"direction": "down", "kelvin": 3}
    assert flow_recommendation({"a": room(80), "b": room(45)}) is None
    up = flow_recommendation({"a": room(98, starved=0.6), "b": room(95, starved=0.4), "c": room(60)})
    assert up == {"direction": "up", "kelvin": 3}
    # one starved room alone is a balancing problem, not a flow temperature problem
    assert flow_recommendation({"a": room(98, starved=0.6), "b": room(30), "c": room(35)}) is None
