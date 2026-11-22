from custom_components.intelligent_heating_control.trv_capabilities import (
    classify_sibling,
    external_option,
    external_temp_value,
    quirks_for,
)


def test_valve_sensors_are_found():
    assert classify_sibling("sensor.trv_bad_pi_heating_demand") == "valve"
    assert classify_sibling("sensor.danfoss_wz_valve_position", unit="%") == "valve"
    assert classify_sibling("sensor.hmip_etrv_level", unit="%") == "valve"
    assert classify_sibling("number.shelly_blu_trv_valve_position") == "valve"


def test_sonoff_limit_settings_are_not_valve_positions():
    assert classify_sibling("number.trvzb_valve_opening_degree") is None
    assert classify_sibling("sensor.trvzb_valve_opening_degree", unit="%") is None
    assert classify_sibling("number.trvzb_valve_closing_degree") is None


def test_generic_position_needs_percent():
    assert classify_sibling("sensor.cover_position") is None
    assert classify_sibling("sensor.trv_position", unit="%") == "valve"
    assert classify_sibling("sensor.trv_battery_level", unit="%") is None


def test_external_temperature_inputs():
    assert classify_sibling("number.trvzb_external_temperature_input") == "external_temp"
    assert classify_sibling("number.ally_external_measured_room_sensor") == "external_temp"
    assert classify_sibling("number.bth_ra_remote_temperature") == "external_temp"
    assert classify_sibling("number.trv_local_temperature_calibration") == "calibration"


def test_sensor_select():
    assert classify_sibling("select.trvzb_temperature_sensor_select", options=["internal", "external"]) == "sensor_select"
    assert classify_sibling("select.aqara_e1_sensor", options=["internal", "external"]) == "sensor_select"
    assert classify_sibling("select.trv_preset", options=["comfort", "eco"]) is None
    assert external_option(["internal", "external", "external_2"]) == "external"
    assert external_option(["internal"]) is None


def test_external_value_scaling():
    assert external_temp_value(21.37, 35) == 21.4
    assert external_temp_value(21.37, 3500) == 2137  # Danfoss centi-degrees


def test_quirks():
    assert [q["id"] for q in quirks_for("eQ-3", "HmIP-eTRV-2")] == ["duty_cycle"]
    assert [q["id"] for q in quirks_for("Bosch", "BTH-RA")] == ["external_resend"]
    assert [q["id"] for q in quirks_for("_TZE200_ckud7u2l", "TS0601")] == ["tuya_auto"]
    assert quirks_for(None, None) == []
