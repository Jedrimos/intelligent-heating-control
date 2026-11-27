from custom_components.intelligent_heating_control.manual_cause import classify, count_steps, describe


def test_count_steps_only_recent_small_steps():
    assert count_steps([(0, 17.0), (0.1, 17.5), (0.2, 18.0)], 1.0) == 2
    assert count_steps([(0, 17.0), (0.1, 19.0)], 1.0) == 0          # one big jump (app)
    assert count_steps([(0, 17.0), (0.1, 17.5)], 100.0) == 0        # too long ago


def test_classify_order():
    assert classify("c1", "u", "p", ["c1"], 3) == "ihc"
    assert classify("c2", "u", None, ["c1"]) == "ha_user"
    assert classify("c2", None, "p", ["c1"]) == "automation"
    assert classify("c2", None, None, ["c1"], 2) == "device"
    assert classify("c2", None, None, ["c1"], 0) == "device_or_app"


def test_describe():
    assert describe("ha_user", "Miri") == "in Home Assistant (Miri)"
    assert "Hersteller-App" in describe("device_or_app")
    assert describe("automation", "Morgens", en=True) == "by “Morgens”"
