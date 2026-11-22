"""Core regulation scenarios (real HA core, fake hardware)."""
from datetime import datetime
from zoneinfo import ZoneInfo

from .conftest import cycle, room, temp_sensor, trv

BERLIN = ZoneInfo("Europe/Berlin")
WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
SCHED = [{"days": WEEKDAYS, "periods": [{"start": "06:00", "end": "08:00", "temperature": 22.5}]}]


def at(freezer, hh, mm=0, day=24):  # 2026-11-24 is a Tuesday
    freezer.move_to(datetime(2026, 11, day, hh, mm, tzinfo=BERLIN))


async def test_schedule_uses_ha_timezone(hass, setup_ihc, freezer):
    """07:00 Berlin == 06:00 UTC. The OS runs in UTC in tests, so this catches
    schedules that evaluate datetime.now() instead of HA's time zone."""
    at(freezer, 7, 0)
    trv(hass, "climate.trv_wz", current=19.0)
    temp_sensor(hass, "sensor.t_wz", 19.0)
    coord, hw = await setup_ihc([room(temp_sensor="sensor.t_wz", schedules=SCHED)])
    await cycle(hass, coord)
    rd = coord.data["rooms"]["wz"]
    assert rd["source"] == "schedule", rd["source"]
    assert rd["target_temp"] == 22.5
    assert hw.last_temp("climate.trv_wz") == 22.5


async def test_outside_schedule_falls_back_to_eco(hass, setup_ihc, freezer):
    at(freezer, 12, 0)
    trv(hass, "climate.trv_wz")
    temp_sensor(hass, "sensor.t_wz", 19.0)
    coord, hw = await setup_ihc([room(temp_sensor="sensor.t_wz", schedules=SCHED)])
    await cycle(hass, coord)
    rd = coord.data["rooms"]["wz"]
    assert rd["target_temp"] < 22.5
    assert rd["source"] != "schedule"


async def test_window_sensor_turns_trv_off_and_back(hass, setup_ihc, freezer):
    at(freezer, 12)
    trv(hass, "climate.trv_wz")
    temp_sensor(hass, "sensor.t_wz", 19.0)
    hass.states.async_set("binary_sensor.w_wz", "off", {"device_class": "window"})
    coord, hw = await setup_ihc([room(temp_sensor="sensor.t_wz", window_sensors=["binary_sensor.w_wz"], window_reaction_time=0)])
    await cycle(hass, coord)
    hw.clear()
    hass.states.async_set("binary_sensor.w_wz", "on", {"device_class": "window"})
    await hass.async_block_till_done()
    await cycle(hass, coord)
    assert coord.data["rooms"]["wz"]["window_open"] is True
    assert hw.of("climate", "set_hvac_mode", "climate.trv_wz")[-1]["hvac_mode"] == "off"
    hw.clear()
    await cycle(hass, coord)
    assert not hw.of("climate", "set_hvac_mode"), "off must not be re-sent every cycle"
    hass.states.async_set("binary_sensor.w_wz", "off", {"device_class": "window"})
    await hass.async_block_till_done()
    await cycle(hass, coord)
    assert coord.data["rooms"]["wz"]["window_open"] is False
    assert hw.of("climate", "set_hvac_mode", "climate.trv_wz")[-1]["hvac_mode"] == "heat"
    assert hw.last_temp("climate.trv_wz") is not None


async def test_sensorless_window_detection(hass, setup_ihc, freezer):
    at(freezer, 12)
    trv(hass, "climate.trv_wz")
    temp_sensor(hass, "sensor.t_wz", 21.0)
    coord, hw = await setup_ihc([room(temp_sensor="sensor.t_wz")])
    await cycle(hass, coord)
    for t in (20.8, 20.4, 20.0):
        freezer.tick(60)
        temp_sensor(hass, "sensor.t_wz", t)
        await cycle(hass, coord)
    rd = coord.data["rooms"]["wz"]
    assert rd["window_auto_detected"] is True
    assert rd["window_open"] is True
    assert hw.of("climate", "set_hvac_mode", "climate.trv_wz")[-1]["hvac_mode"] == "off"


async def test_room_off_and_system_away_override(hass, setup_ihc, freezer):
    at(freezer, 12)
    trv(hass, "climate.trv_wz")
    temp_sensor(hass, "sensor.t_wz", 19.0)
    coord, hw = await setup_ihc([room(temp_sensor="sensor.t_wz")], away_temp=16.0)
    coord.set_room_mode("wz", "off")
    await cycle(hass, coord)
    assert hw.of("climate", "set_hvac_mode", "climate.trv_wz")[-1]["hvac_mode"] == "off"
    coord.set_system_mode("away")
    await cycle(hass, coord)
    rd = coord.data["rooms"]["wz"]
    assert rd["source"] == "system_away"
    assert hw.last_temp("climate.trv_wz") == rd["target_temp"]


async def test_summer_mode_turns_off(hass, setup_ihc, freezer):
    at(freezer, 12)
    trv(hass, "climate.trv_wz")
    temp_sensor(hass, "sensor.t_wz", 19.0)
    temp_sensor(hass, "sensor.outdoor", 25.0)
    coord, hw = await setup_ihc([room(temp_sensor="sensor.t_wz")], outdoor_temp_sensor="sensor.outdoor",
                                summer_mode_enabled=True, summer_threshold=18.0,
                                summer_mode_hysteresis_enabled=False)
    await cycle(hass, coord)
    assert coord.data["summer_mode"] is True
    assert hw.of("climate", "set_hvac_mode", "climate.trv_wz")[-1]["hvac_mode"] == "off"


async def test_boost_sends_max_and_expires(hass, setup_ihc, freezer):
    at(freezer, 12)
    trv(hass, "climate.trv_wz")
    temp_sensor(hass, "sensor.t_wz", 19.0)
    coord, hw = await setup_ihc([room(temp_sensor="sensor.t_wz", max_temp=28.0)])
    await cycle(hass, coord)
    coord.set_room_boost("wz", 30)
    await cycle(hass, coord)
    assert hw.last_temp("climate.trv_wz") == 28.0
    assert coord.get_room_mode("wz") == "auto" or coord.data["rooms"]["wz"]["boost_remaining"] > 0
    freezer.tick(31 * 60)
    await cycle(hass, coord)
    assert coord.get_boost_remaining_minutes("wz") == 0
    assert hw.last_temp("climate.trv_wz") < 28.0


async def test_manual_trv_change_detected_and_child_lock(hass, setup_ihc, freezer):
    at(freezer, 12)
    trv(hass, "climate.trv_wz")
    temp_sensor(hass, "sensor.t_wz", 19.0)
    coord, hw = await setup_ihc([room(temp_sensor="sensor.t_wz")])
    await cycle(hass, coord, 2)
    st = hass.states.get("climate.trv_wz")
    hass.states.async_set("climate.trv_wz", "heat", dict(st.attributes, temperature=25.0))
    await cycle(hass, coord)
    assert coord.get_room_mode("wz") == "manual"
    assert coord.get_room_manual_temp("wz") == 25.0
    coord.set_child_lock("wz", True)
    coord.set_system_mode("off")
    hw.clear()
    await cycle(hass, coord, 2)
    assert not [c for c in hw.calls if c[2].get("entity_id") == "climate.trv_wz"]


async def test_no_room_sensor_uses_trv_temperature(hass, setup_ihc, freezer):
    """Idle TRV (cold radiator): its own reading is used as-is. While heating, the
    default -2 °C radiator correction applies and decays after the TRV stops."""
    at(freezer, 12)
    trv(hass, "climate.trv_wz", current=18.5, hvac_action="idle", valve_position=0)
    coord, hw = await setup_ihc([room()])
    await cycle(hass, coord)
    assert coord.data["rooms"]["wz"]["current_temp"] == 18.5
    assert hw.last_temp("climate.trv_wz") is not None
    st = hass.states.get("climate.trv_wz")
    hass.states.async_set("climate.trv_wz", "heat", dict(st.attributes, current_temperature=23.0, hvac_action="heating", valve_position=80))
    for _ in range(4):  # radiator warms up over a few cycles
        freezer.tick(60)
        await cycle(hass, coord)
    assert 21.0 <= coord.data["rooms"]["wz"]["current_temp"] <= 21.2  # ≈ 23 - 2
    st = hass.states.get("climate.trv_wz")
    hass.states.async_set("climate.trv_wz", "heat", dict(st.attributes, current_temperature=21.0, hvac_action="idle", valve_position=0))
    freezer.tick(1200)  # one time constant after the valve closed
    await cycle(hass, coord)
    assert 20.0 < coord.data["rooms"]["wz"]["current_temp"] < 21.0  # correction partly decayed
    freezer.tick(6000)
    await cycle(hass, coord)
    assert coord.data["rooms"]["wz"]["current_temp"] == 21.0
