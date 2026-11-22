"""Persistence, HA schedules, services, entities, heating period, limescale, peak shaving."""
from datetime import datetime
from zoneinfo import ZoneInfo

from pytest_homeassistant_custom_component.common import MockConfigEntry

from .conftest import DOMAIN, cycle, room, temp_sensor, trv

BERLIN = ZoneInfo("Europe/Berlin")


def at(freezer, hh, mm=0, day=24):
    freezer.move_to(datetime(2026, 11, day, hh, mm, tzinfo=BERLIN))


def base(hass, rid="wz", t=19.0):
    trv(hass, f"climate.trv_{rid}", hvac_action="idle", valve_position=0)
    temp_sensor(hass, f"sensor.t_{rid}", t)


async def test_runtime_state_survives_restart(hass, setup_ihc, freezer):
    at(freezer, 12)
    base(hass)
    coord, hw = await setup_ihc([room(temp_sensor="sensor.t_wz")])
    coord.set_room_mode("wz", "eco")
    coord.set_child_lock("wz", True)
    await coord._async_save_runtime_state()
    entry = hass.config_entries.async_entries(DOMAIN)[0]
    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    coord2 = hass.data[DOMAIN][entry.entry_id]
    assert coord2 is not coord
    assert coord2.get_room_mode("wz") == "eco"
    assert coord2.is_room_child_locked("wz") is True


async def test_ha_schedule_entity(hass, setup_ihc, freezer):
    at(freezer, 12)
    base(hass)
    hass.states.async_set("schedule.wz", "on")
    coord, hw = await setup_ihc([room(temp_sensor="sensor.t_wz", comfort_temp=22.0,
                                      ha_schedules=[{"entity": "schedule.wz", "mode": "comfort"}])])
    await cycle(hass, coord)
    assert coord.data["rooms"]["wz"]["source"] == "ha_schedule"
    assert coord.data["rooms"]["wz"]["target_temp"] == coord.data["rooms"]["wz"]["comfort_temp_eff"]
    hass.states.async_set("schedule.wz", "off")
    await cycle(hass, coord)
    assert coord.data["rooms"]["wz"]["source"].startswith("ha_schedule_")
    assert coord.data["rooms"]["wz"]["target_temp"] < 22.0


async def test_services_end_to_end(hass, setup_ihc, freezer):
    at(freezer, 12)
    base(hass)
    trv(hass, "climate.trv_bad")
    coord, hw = await setup_ihc([room(temp_sensor="sensor.t_wz")])
    await hass.services.async_call(DOMAIN, "set_room_mode", {"id": "wz", "mode": "comfort"}, blocking=True)
    assert coord.get_room_mode("wz") == "comfort"
    await hass.services.async_call(DOMAIN, "boost_room", {"id": "wz", "duration_minutes": 15}, blocking=True)
    assert coord.get_boost_remaining_minutes("wz") > 0
    await hass.services.async_call(DOMAIN, "update_room", {"id": "wz", "comfort_temp": 23.5}, blocking=True)
    await hass.async_block_till_done()
    coord = hass.data[DOMAIN][hass.config_entries.async_entries(DOMAIN)[0].entry_id]
    assert coord.get_room_config("wz")["comfort_temp"] == 23.5
    await hass.services.async_call(DOMAIN, "update_global_settings", {"away_temp": 15.5}, blocking=True)
    await hass.async_block_till_done()
    coord = hass.data[DOMAIN][hass.config_entries.async_entries(DOMAIN)[0].entry_id]
    assert coord.get_config()["away_temp"] == 15.5
    await hass.services.async_call(DOMAIN, "add_rooms", {"rooms": [
        {"name": "Bad", "valve_entities": ["climate.trv_bad"], "valve_entity": "climate.trv_bad"},
        {"name": "Flur", "valve_entities": []},
    ]}, blocking=True)
    await hass.async_block_till_done()
    coord = hass.data[DOMAIN][hass.config_entries.async_entries(DOMAIN)[0].entry_id]
    names = sorted(r["name"] for r in coord.get_rooms())
    assert names == ["Bad", "Flur", "Wohnzimmer"]
    assert hass.states.get("climate.ihc_bad") is not None
    await hass.services.async_call(DOMAIN, "set_system_mode", {"mode": "off"}, blocking=True)
    assert coord.get_system_mode() == "off"


async def test_entities_expose_state(hass, setup_ihc, freezer):
    at(freezer, 12)
    base(hass)
    hass.states.async_set("sensor.co2_wz", "1500")
    coord, hw = await setup_ihc([room(temp_sensor="sensor.t_wz", co2_sensor="sensor.co2_wz")])
    await cycle(hass, coord)
    climate = hass.states.get("climate.ihc_wohnzimmer")
    assert climate.attributes["current_temperature"] == 19.0
    assert climate.attributes["temperature"] == coord.data["rooms"]["wz"]["target_temp"]
    assert hass.states.get("sensor.ihc_wohnzimmer_entscheidung").state == coord.data["rooms"]["wz"]["source"]
    vent = [s for s in hass.states.async_all("binary_sensor") if "luftung" in s.entity_id or "lueftung" in s.entity_id]
    assert vent and vent[0].state == "on", [s.entity_id for s in hass.states.async_all("binary_sensor")]
    # climate entity controls (called on the entity: the harness mocks the climate.* services)
    ent = hass.data["entity_components"]["climate"].get_entity("climate.ihc_wohnzimmer")
    await ent.async_set_preset_mode("Eco")
    assert coord.get_room_mode("wz") == "eco"
    await ent.async_set_temperature(temperature=22.5)
    assert coord.get_room_mode("wz") == "manual" and coord.get_room_manual_temp("wz") == 22.5


async def test_heating_period_auto_turns_off_after_warm_days(hass, setup_ihc, freezer):
    at(freezer, 12, day=20)
    base(hass)
    temp_sensor(hass, "sensor.out", 20.0)
    coord, hw = await setup_ihc([room(temp_sensor="sensor.t_wz")], outdoor_temp_sensor="sensor.out",
                                heating_period_auto_days=2, heating_period_notify_enabled=False,
                                outdoor_temp_smoothing_minutes=0)
    for day in (20, 21, 22, 23):
        at(freezer, 12, day=day)
        await cycle(hass, coord)
    assert coord.data["heating_period_active"] is False
    assert hw.of("climate", "set_hvac_mode", "climate.trv_wz")[-1]["hvac_mode"] == "off"
    temp_sensor(hass, "sensor.out", 2.0)
    for day in (24, 25, 26, 27):
        at(freezer, 12, day=day)
        await cycle(hass, coord)
    assert coord.data["heating_period_active"] is True


async def test_holiday_calendar_uses_weekend_schedule(hass, setup_ihc, freezer):
    at(freezer, 9)  # Tuesday 09:00
    base(hass)
    hass.states.async_set("calendar.feiertage", "on", {"message": "Feiertag"})
    scheds = [
        {"days": ["mon", "tue", "wed", "thu", "fri"], "periods": [{"start": "06:00", "end": "07:00", "temperature": 21.0}]},
        {"days": ["sat", "sun"], "periods": [{"start": "08:00", "end": "11:00", "temperature": 22.5}]},
    ]
    coord, hw = await setup_ihc([room(temp_sensor="sensor.t_wz", schedules=scheds)], holiday_calendar="calendar.feiertage")
    await cycle(hass, coord)
    assert coord.data["rooms"]["wz"]["target_temp"] == 22.5


async def test_limescale_exercise_does_not_flip_to_manual(hass, setup_ihc, freezer):
    at(freezer, 10, 0)
    base(hass, t=22.0)
    coord, hw = await setup_ihc([room(temp_sensor="sensor.t_wz")], limescale_protection_enabled=True,
                                limescale_interval_days=7, limescale_time="10:00", limescale_duration_minutes=5)
    await cycle(hass, coord)
    assert hw.last_temp("climate.trv_wz") == 30
    for _ in range(3):
        freezer.tick(60)
        await cycle(hass, coord)
    assert coord.get_room_mode("wz") == "auto"
    freezer.tick(5 * 60)
    await cycle(hass, coord, 2)
    assert coord.get_room_mode("wz") == "auto"
    assert hw.last_temp("climate.trv_wz") == coord.data["rooms"]["wz"]["target_temp"]


async def test_peak_shaving_holds_lower_priority_room(hass, setup_ihc, freezer):
    at(freezer, 12)
    for rid, t in (("a", 15.0), ("b", 18.0)):
        trv(hass, f"climate.trv_{rid}", current=t, hvac_action="heating", valve_position=60)
        temp_sensor(hass, f"sensor.t_{rid}", t)
    coord, hw = await setup_ihc([room("a", "A", temp_sensor="sensor.t_a"), room("b", "B", temp_sensor="sensor.t_b")],
                                peak_shaving_enabled=True, peak_shaving_delay_minutes=15)
    await cycle(hass, coord, 2)
    assert coord.data.get("peak_shaving_active") is True
    assert hw.last_temp("climate.trv_b") < coord.data["rooms"]["b"]["target_temp"]
    freezer.tick(16 * 60)
    await cycle(hass, coord)
    assert hw.last_temp("climate.trv_b") == coord.data["rooms"]["b"]["target_temp"]
