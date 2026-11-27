"""v2.7.1 – hand-set temperatures stay put, preset maximum is a real cap, adjustments are explained."""
from datetime import datetime
from zoneinfo import ZoneInfo

from .conftest import cycle, room, temp_sensor, trv

BERLIN = ZoneInfo("Europe/Berlin")


def setup_room(hass, freezer, t, humidity):
    freezer.move_to(datetime(2026, 11, 24, 3, 0, tzinfo=BERLIN))
    trv(hass, "climate.trv_wz", hvac_action="idle", valve_position=0)
    temp_sensor(hass, "sensor.t_wz", t)
    hass.states.async_set("sensor.h_wz", str(humidity), {"device_class": "humidity"})


async def test_mold_protection_does_not_raise_a_hand_set_temperature(hass, setup_ihc, freezer):
    # bedroom at night: someone turns the thermostat to 17 °C, humidity hits the mold threshold
    setup_room(hass, freezer, 16.5, 72)
    coord, hw = await setup_ihc([room(temp_sensor="sensor.t_wz", humidity_sensor="sensor.h_wz",
                                      mold_humidity_threshold=70)])
    coord.set_room_mode("wz", "manual")
    coord.set_room_manual_temp("wz", 17.0)
    await cycle(hass, coord, 2)
    rd = coord.data["rooms"]["wz"]
    assert (rd.get("mold") or {}).get("risk")          # risk is still reported ...
    assert rd["target_temp"] == 17.0                   # ... but the 17 °C stays 17 °C (was 18)
    assert not any(a["key"] == "mold" for a in rd["target_adjustments"])


async def test_felt_temperature_respects_the_sleep_maximum(hass, setup_ihc, freezer):
    # dry air feels colder → felt boost, but "sleep max 17 °C" must hold
    setup_room(hass, freezer, 16.0, 25)
    coord, hw = await setup_ihc([room(temp_sensor="sensor.t_wz", humidity_sensor="sensor.h_wz",
                                      comfort_temp=21.0, sleep_offset=3.0, sleep_max_temp=17.0,
                                      mold_protection_enabled=False)],
                                felt_temp_adjustment_enabled=True, felt_temp_adjustment_max=1.5)
    coord.set_room_mode("wz", "sleep")
    await cycle(hass, coord, 2)
    rd = coord.data["rooms"]["wz"]
    assert rd["felt_temperature"] < 16.0
    assert rd["target_temp"] == 17.0
    keys = [a["key"] for a in rd["target_adjustments"]]
    assert keys == ["felt", "preset_max"]


async def test_adjustments_explain_the_target(hass, setup_ihc, freezer):
    setup_room(hass, freezer, 18.0, 25)
    coord, hw = await setup_ihc([room(temp_sensor="sensor.t_wz", humidity_sensor="sensor.h_wz",
                                      comfort_temp=20.5, mold_protection_enabled=False)],
                                felt_temp_adjustment_enabled=True, felt_temp_adjustment_max=0.5)
    coord.set_room_mode("wz", "comfort")
    await cycle(hass, coord, 2)
    rd = coord.data["rooms"]["wz"]
    assert rd["target_base"] == 20.5
    assert rd["target_adjustments"] == [{"key": "felt", "delta": 0.5}]
    assert rd["target_temp"] == 21.0
    state = hass.states.get("climate.ihc_wohnzimmer") or next(
        s for s in hass.states.async_all("climate") if s.attributes.get("room_id") == "wz")
    assert state.attributes["target_adjustments"] == [{"key": "felt", "delta": 0.5}]
