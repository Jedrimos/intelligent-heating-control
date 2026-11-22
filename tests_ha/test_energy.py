"""v2.6 energy model: integrated heat output, efficiency/COP, meter calibration."""
from datetime import datetime
from zoneinfo import ZoneInfo

import pytest

from .conftest import cycle, room, temp_sensor, trv

BERLIN = ZoneInfo("Europe/Berlin")


def at(freezer, hh, mm=0, day=24):
    freezer.move_to(datetime(2026, 11, day, hh, mm, tzinfo=BERLIN))


async def _run_hour(hass, coord, freezer):
    for _ in range(60):
        freezer.tick(60)
        await cycle(hass, coord)


@pytest.mark.parametrize("system,expected_range", [
    ("heatpump", (0.03, 0.12)),   # ~0.2 kW heat / JAZ 3.5  → well below the old 1.5 kWh
    ("gas", (0.25, 0.6)),         # ~47 °C flow at 0 °C outside → ~0.34 kW heat / 0.92
])
async def test_one_hour_of_heating(hass, setup_ihc, freezer, system, expected_range):
    at(freezer, 12)
    trv(hass, "climate.trv_wz", current=19.0, hvac_action="heating", valve_position=40)
    temp_sensor(hass, "sensor.t_wz", 19.0)
    temp_sensor(hass, "sensor.out", 0.0)
    coord, hw = await setup_ihc([room(temp_sensor="sensor.t_wz", radiator_kw=1.5)],
                                outdoor_temp_sensor="sensor.out", heating_system=system)
    await cycle(hass, coord)
    await _run_hour(hass, coord, freezer)
    kwh = coord.data["rooms"]["wz"]["energy_today_kwh"]
    lo, hi = expected_range
    assert lo < kwh < hi, (system, kwh)
    assert coord.data["rooms"]["wz"]["instant_power_w"] > 0


async def test_meter_calibration_and_yesterday(hass, setup_ihc, freezer):
    at(freezer, 21, 30)
    trv(hass, "climate.trv_wz", current=19.0, hvac_action="heating", valve_position=80)
    temp_sensor(hass, "sensor.t_wz", 19.0)
    temp_sensor(hass, "sensor.out", -5.0)
    hass.states.async_set("sensor.gas", "1000.0", {"unit_of_measurement": "m³"})
    coord, hw = await setup_ihc([room(temp_sensor="sensor.t_wz", radiator_kw=1.5)],
                                outdoor_temp_sensor="sensor.out", heating_system="gas",
                                energy_meter_entity="sensor.gas")
    await cycle(hass, coord)
    await _run_hour(hass, coord, freezer)
    await _run_hour(hass, coord, freezer)  # 21:30-23:30
    at(freezer, 23, 59)
    await cycle(hass, coord)
    estimated = coord.data["rooms"]["wz"]["energy_today_kwh"]
    assert estimated > 0.5
    # the real meter measured 0.2 m³ (≈ 2.06 kWh) - IHC's estimate was lower
    hass.states.async_set("sensor.gas", "1000.2", {"unit_of_measurement": "m³"})
    at(freezer, 0, 1, day=25)
    await cycle(hass, coord)
    assert coord._energy_calibration_factor > 1.0
    assert coord.data["rooms"]["wz"]["energy_yesterday_kwh"] == pytest.approx(estimated, rel=0.05)
    assert coord.data["rooms"]["wz"]["energy_today_kwh"] < 0.1
