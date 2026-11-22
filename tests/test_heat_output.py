import pytest

from custom_components.intelligent_heating_control.heat_output import (
    estimate_radiator_kw,
    final_energy,
    log_mean_dt,
    meter_to_kwh,
    output_factor,
    room_heat_power_kw,
    valve_output_share,
    weather_compensated_flow,
)


def test_norm_point_is_100_percent():
    assert log_mean_dt(75, 65, 20) == pytest.approx(49.83, abs=0.01)
    assert output_factor(75, 65, 20) == pytest.approx(1.0, abs=0.01)


def test_heat_pump_temperatures_deliver_a_fraction():
    # 45/38 °C into a 21 °C room ≈ 31 % of the rated output
    assert output_factor(45, 38, 21) == pytest.approx(0.31, abs=0.02)
    # 70/55 °C gas boiler ≈ 80 %
    assert output_factor(70, 55, 20) == pytest.approx(0.80, abs=0.03)
    assert output_factor(20, 18, 21) == 0.0


def test_weather_compensation():
    assert weather_compensated_flow(60, -12) == pytest.approx(60)
    assert 25 < weather_compensated_flow(60, 10) < 45
    assert weather_compensated_flow(60, None) == 60


def test_valve_share_is_concave():
    assert valve_output_share(0) == 0
    assert valve_output_share(100) == 1
    assert 0.45 < valve_output_share(30) < 0.52
    assert valve_output_share(None) == 0


def test_room_power_and_final_energy():
    # 1.5 kW radiator, heat pump flow 40/35, valve 40 %
    p = room_heat_power_kw(1.5, 40, True, 50, 40, 35, 21)
    assert 0.15 < p < 0.35, p  # the old method counted the full 1.5 kW
    assert room_heat_power_kw(1.5, None, False, 0, 60, 50, 20) == 0
    assert final_energy(3.5, 3.5) == 1.0   # heat pump JAZ 3.5
    assert final_energy(0.92, 0.92) == pytest.approx(1.0)


def test_radiator_size_estimate_and_meter_units():
    assert estimate_radiator_kw("22", 600, 1000) == pytest.approx(1.65)
    assert estimate_radiator_kw("11", 300, 800) < estimate_radiator_kw("11", 600, 800)
    assert estimate_radiator_kw("99", 600, 1000) is None
    assert meter_to_kwh(2.0, "m³") == pytest.approx(20.6)
    assert meter_to_kwh(1500, "Wh") == 1.5
    assert meter_to_kwh(3.0, "kWh") == 3.0
