"""Rollladen-Automatik: Loxone-Tageszyklus, Wolken, Markise, Sicherheit, Handbetrieb."""
from datetime import datetime
from zoneinfo import ZoneInfo

from .conftest import cycle, room, temp_sensor, trv

BERLIN = ZoneInfo("Europe/Berlin")


def at(freezer, hh, mm=0, day=24):
    freezer.move_to(datetime(2026, 11, day, hh, mm, tzinfo=BERLIN))


def sun(hass, azimuth, elevation):
    hass.states.async_set("sun.sun", "above_horizon" if elevation > 0 else "below_horizon",
                          {"azimuth": azimuth, "elevation": elevation})


def weather(hass, state="sunny", **attrs):
    hass.states.async_set("weather.home", state, {"temperature": 2.0, **attrs})


def cover(hass, eid="cover.wz", position=100, device_class="shutter"):
    hass.states.async_set(eid, "open" if position else "closed",
                          {"current_position": position, "device_class": device_class})


def pos(hass, eid="cover.wz"):
    return hass.states.get(eid).attributes["current_position"]


async def _setup(hass, setup_ihc, room_temp=19.0, **room_cfg):
    trv(hass, "climate.trv_wz", hvac_action="idle", valve_position=0)
    temp_sensor(hass, "sensor.t_wz", room_temp)
    cfg = dict(temp_sensor="sensor.t_wz", cover_entities=["cover.wz"], window_orientation="S",
               solar_passive_heat=True, solar_passive_cool=True)
    cfg.update(room_cfg)
    return await setup_ihc([room(**cfg)], weather_entity="weather.home")


async def test_winter_day_cycle(hass, setup_ihc, freezer):
    weather(hass, "sunny")
    cover(hass, position=100)
    at(freezer, 22)
    sun(hass, 340, -30)
    coord, hw = await _setup(hass, setup_ihc)
    await cycle(hass, coord)
    assert pos(hass) == 0, "night insulation in the heating season"
    assert coord.data["rooms"]["wz"]["solar_cover_reason"] == "night_insulation"

    at(freezer, 7, 45, day=25)
    sun(hass, 120, 2)  # sun is up but low in the south-east, not yet on the façade (min elevation 10)
    await cycle(hass, coord)
    assert pos(hass) == 0, "morning: stay closed until the sun reaches the façade"
    assert coord.data["rooms"]["wz"]["solar_cover_reason"] == "morning_hold"

    at(freezer, 10, 30, day=25)
    sun(hass, 160, 15)  # now on the south façade
    await cycle(hass, coord)
    assert pos(hass) == 100, "open for free solar heat"
    assert coord.data["rooms"]["wz"]["solar_cover_reason"] == "solar_gain"

    temp_sensor(hass, "sensor.t_wz", 20.6)  # warm, but below target+1 -> keep the sun coming
    await cycle(hass, coord)
    assert pos(hass) == 100, "no winter shading before the room actually overheats"

    target = coord.data["rooms"]["wz"]["target_temp"]
    temp_sensor(hass, "sensor.t_wz", target + 1.5)  # overheating
    await cycle(hass, coord)
    assert pos(hass) == 20
    assert coord.data["rooms"]["wz"]["solar_cover_reason"] == "shade"

    weather(hass, "cloudy")  # clouds: no sun on the window any more -> daylight
    await cycle(hass, coord)
    assert pos(hass) == 100
    assert coord.data["rooms"]["wz"]["solar_cover_reason"] == "daylight"

    at(freezer, 17, 30, day=25)
    sun(hass, 250, -2)
    await cycle(hass, coord)
    assert pos(hass) == 0


async def test_north_window_opens_at_latest_time(hass, setup_ihc, freezer):
    weather(hass, "sunny")
    cover(hass, position=100)
    at(freezer, 23)
    sun(hass, 0, -40)
    coord, hw = await _setup(hass, setup_ihc, window_orientation="N")
    await cycle(hass, coord)
    assert pos(hass) == 0
    at(freezer, 9, 0, day=25)
    sun(hass, 140, 10)
    await cycle(hass, coord)
    assert pos(hass) == 0
    at(freezer, 9, 31, day=25)
    sun(hass, 145, 12)
    await cycle(hass, coord)
    assert pos(hass) == 100, "latest opening time for façades the sun never reaches"


async def test_summer_preemptive_shading(hass, setup_ihc, freezer):
    weather(hass, "sunny")
    cover(hass, position=100)
    at(freezer, 13, day=24)
    sun(hass, 180, 55)
    temp_sensor(hass, "sensor.out", 28.0)
    trv(hass, "climate.trv_wz")
    temp_sensor(hass, "sensor.t_wz", 20.5)
    coord, hw = await setup_ihc([room(temp_sensor="sensor.t_wz", cover_entities=["cover.wz"], window_orientation="S",
                                      solar_passive_cool=True)],
                                outdoor_temp_sensor="sensor.out", summer_mode_enabled=True,
                                summer_mode_hysteresis_enabled=False, weather_entity="weather.home")
    await cycle(hass, coord)
    assert coord.data["summer_mode"] is True
    assert pos(hass) == 20


async def test_awning_is_inverted_and_skips_night(hass, setup_ihc, freezer):
    weather(hass, "sunny")
    cover(hass, position=0, device_class="awning")
    at(freezer, 23)
    sun(hass, 0, -40)
    coord, hw = await _setup(hass, setup_ihc)
    await cycle(hass, coord)
    assert pos(hass) == 0, "awnings are not used for night insulation"
    at(freezer, 12, day=25)
    sun(hass, 180, 18)
    target = 21.0
    temp_sensor(hass, "sensor.t_wz", target + 3)
    await cycle(hass, coord)
    assert pos(hass) == 80, "shade 20 % daylight = awning extended 80 %"


async def test_weather_protection_and_manual_override(hass, setup_ihc, freezer):
    cover(hass, position=100)
    at(freezer, 23)
    sun(hass, 0, -40)
    weather(hass, "sunny", wind_speed=10)
    trv(hass, "climate.trv_wz", hvac_action="idle", valve_position=0)
    temp_sensor(hass, "sensor.t_wz", 19.0)
    coord, hw = await setup_ihc([room(temp_sensor="sensor.t_wz", cover_entities=["cover.wz"], window_orientation="S",
                                      solar_passive_heat=True)],
                                weather_entity="weather.home", solar_weather_protection_enabled=True)
    await cycle(hass, coord)
    assert pos(hass) == 0
    weather(hass, "sunny", wind_speed=70)
    await cycle(hass, coord)
    assert pos(hass) == 100, "storm: raise the shutter out of harm's way"
    weather(hass, "sunny", wind_speed=10)
    await cycle(hass, coord)
    assert pos(hass) == 0
    cover(hass, position=60)  # user opens it by hand
    freezer.tick(120)
    await cycle(hass, coord)
    assert pos(hass) == 60 and coord.data["rooms"]["wz"]["solar_cover_overridden"] is True


async def test_child_lock_leaves_covers_alone(hass, setup_ihc, freezer):
    weather(hass, "sunny")
    cover(hass, position=100)
    at(freezer, 23)
    sun(hass, 0, -40)
    coord, hw = await _setup(hass, setup_ihc)
    coord.set_child_lock("wz", True)
    cover(hass, position=100)  # first refresh during setup ran before the lock was set
    freezer.tick(7200)  # past manual-override re-arm
    await cycle(hass, coord, 2)
    assert pos(hass) == 100
