"""Virtual sensors (same automation with few sensors) and cost-saving features."""
from datetime import datetime
from zoneinfo import ZoneInfo

from .conftest import cycle, room, temp_sensor, trv

BERLIN = ZoneInfo("Europe/Berlin")


def at(freezer, hh, mm=0, day=24):
    freezer.move_to(datetime(2026, 11, day, hh, mm, tzinfo=BERLIN))


def base(hass, rid="wz", t=19.0):
    trv(hass, f"climate.trv_{rid}", hvac_action="idle", valve_position=0)
    temp_sensor(hass, f"sensor.t_{rid}", t)


async def test_auto_persons_presence(hass, setup_ihc, freezer):
    at(freezer, 12)
    base(hass)
    hass.states.async_set("person.anna", "home")
    hass.states.async_set("person.admin", "unknown")  # no tracker -> ignored
    coord, hw = await setup_ihc([room(temp_sensor="sensor.t_wz")])
    await cycle(hass, coord)
    assert coord._get_presence_entities() == ["person.anna"]
    hass.states.async_set("person.anna", "not_home")
    await cycle(hass, coord)
    freezer.tick(10 * 60)
    await cycle(hass, coord)
    assert coord.get_system_mode() == "auto", "auto persons: at least 20 min delay"
    freezer.tick(15 * 60)
    await cycle(hass, coord, 2)
    assert coord.get_system_mode() == "away"
    hass.states.async_set("person.anna", "home")
    await cycle(hass, coord, 2)
    assert coord.get_system_mode() == "auto"


async def test_auto_persons_can_be_disabled(hass, setup_ihc, freezer):
    at(freezer, 12)
    base(hass)
    hass.states.async_set("person.anna", "not_home")
    coord, hw = await setup_ihc([room(temp_sensor="sensor.t_wz")], presence_auto_persons=False)
    freezer.tick(3600)
    await cycle(hass, coord, 2)
    assert coord.get_system_mode() == "auto"


async def test_startup_does_not_switch_away_on_unknown_trackers(hass, setup_ihc, freezer):
    at(freezer, 12)
    base(hass)
    hass.states.async_set("device_tracker.phone", "unknown")
    coord, hw = await setup_ihc([room(temp_sensor="sensor.t_wz")], presence_entities=["device_tracker.phone"])
    await cycle(hass, coord)
    assert coord.get_system_mode() == "auto"


async def test_outdoor_humidity_from_weather(hass, setup_ihc, freezer):
    at(freezer, 12)
    base(hass)
    hass.states.async_set("weather.home", "cloudy", {"temperature": 4, "humidity": 91})
    coord, hw = await setup_ihc([room(temp_sensor="sensor.t_wz")])
    await cycle(hass, coord)
    assert coord._get_outdoor_humidity() == 91.0


async def test_window_reminder_notification_and_event(hass, setup_ihc, freezer):
    at(freezer, 12)
    base(hass)
    temp_sensor(hass, "sensor.out", 3.0)
    hass.states.async_set("binary_sensor.w", "off")
    events = []
    hass.bus.async_listen("intelligent_heating_control_window_open_too_long", lambda e: events.append(e.data))
    coord, hw = await setup_ihc([room(temp_sensor="sensor.t_wz", window_sensors=["binary_sensor.w"], window_reaction_time=0)],
                                outdoor_temp_sensor="sensor.out", window_reminder_minutes=10)
    hass.states.async_set("binary_sensor.w", "on")
    await cycle(hass, coord)
    freezer.tick(11 * 60)
    await cycle(hass, coord)
    await hass.async_block_till_done()
    assert [c for c in hw.of("persistent_notification", "create") if c["notification_id"] == "ihc_window_open_wz"]
    assert events and events[0]["room_id"] == "wz" and events[0]["minutes"] >= 10
    await cycle(hass, coord)
    assert len(events) == 1, "only once per opening"
    hass.states.async_set("binary_sensor.w", "off")
    await cycle(hass, coord)
    assert [c for c in hw.of("persistent_notification", "dismiss") if c["notification_id"] == "ihc_window_open_wz"]


async def test_saving_offset(hass, setup_ihc, freezer):
    at(freezer, 12)
    base(hass)
    coord, hw = await setup_ihc([room(temp_sensor="sensor.t_wz")], away_temp=16.0)
    coord.set_room_mode("wz", "comfort")
    await cycle(hass, coord)
    normal = coord.data["rooms"]["wz"]["target_temp"]
    await coord.async_update_global_settings({"saving_offset": 1.0})
    await cycle(hass, coord)
    assert coord.data["rooms"]["wz"]["target_temp"] == normal - 1.0
    assert hw.last_temp("climate.trv_wz") == normal - 1.0
    coord.set_system_mode("away")
    await cycle(hass, coord)
    away = coord.data["rooms"]["wz"]["target_temp"]
    await coord.async_update_global_settings({"saving_offset": 0.0})
    await cycle(hass, coord)
    assert coord.data["rooms"]["wz"]["target_temp"] == away, "away temperature is not lowered further"
