"""Pre-heat, window restore, vacation calendar, notifications, reload-suppression."""
from datetime import datetime
from zoneinfo import ZoneInfo

from homeassistant.core import SupportsResponse

from .conftest import DOMAIN, cycle, room, temp_sensor, trv

BERLIN = ZoneInfo("Europe/Berlin")
ALL = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]


def at(freezer, hh, mm=0, day=24):
    freezer.move_to(datetime(2026, 11, day, hh, mm, tzinfo=BERLIN))


def base(hass, rid="wz", t=19.0):
    trv(hass, f"climate.trv_{rid}", hvac_action="idle", valve_position=0)
    temp_sensor(hass, f"sensor.t_{rid}", t)


async def test_preheat_before_schedule(hass, setup_ihc, freezer):
    at(freezer, 5, 30)
    base(hass)
    sched = [{"days": ALL, "periods": [{"start": "06:00", "end": "08:00", "temperature": 22.5}]}]
    coord, hw = await setup_ihc([room(temp_sensor="sensor.t_wz", schedules=sched)],
                                preheat_minutes=45, optimum_start_enabled=False, adaptive_preheat_enabled=False)
    await cycle(hass, coord)
    rd = coord.data["rooms"]["wz"]
    assert rd["source"] == "preheat", rd["source"]
    assert rd["target_temp"] == 22.5


async def test_window_restore_previous_is_held(hass, setup_ihc, freezer):
    at(freezer, 7, 50)
    base(hass)
    hass.states.async_set("binary_sensor.w", "off")
    sched = [{"days": ALL, "periods": [{"start": "06:00", "end": "08:00", "temperature": 22.5}]}]
    coord, hw = await setup_ihc([room(temp_sensor="sensor.t_wz", schedules=sched, window_sensors=["binary_sensor.w"],
                                      window_reaction_time=0, window_restore_mode="previous")])
    await cycle(hass, coord)
    hass.states.async_set("binary_sensor.w", "on")
    await cycle(hass, coord)
    at(freezer, 8, 5)  # schedule period ended while the window was open
    await cycle(hass, coord)
    hass.states.async_set("binary_sensor.w", "off")
    await cycle(hass, coord)
    assert coord.data["rooms"]["wz"]["target_temp"] == 22.5
    freezer.tick(120)
    await cycle(hass, coord, 2)  # held for more than one cycle
    assert coord.data["rooms"]["wz"]["target_temp"] == 22.5
    assert coord.data["rooms"]["wz"]["source"].endswith("+window_restore")


async def test_vacation_calendar_retries_and_does_not_block_reloads(hass, setup_ihc, freezer):
    at(freezer, 12)
    base(hass)
    coord, hw = await setup_ihc([room(temp_sensor="sensor.t_wz")], vacation_calendar="calendar.privat")
    await cycle(hass, coord)  # calendar service not available yet -> must retry

    async def _events(call):
        return {"calendar.privat": {"events": [{"summary": "Urlaub Italien", "start": "2026-11-23", "end": "2026-12-01"}]}}
    hass.services.async_register("calendar", "get_events", _events, supports_response=SupportsResponse.ONLY)
    await cycle(hass, coord, 2)
    assert coord.get_config().get("vacation_start") == "2026-11-23"
    assert coord.get_config().get("vacation_end") == "2026-11-30"
    assert coord._suppress_reload is False
    await cycle(hass, coord)
    assert coord.get_system_mode() == "vacation"


async def test_group_change_does_not_leave_reload_suppressed(hass, setup_ihc, freezer):
    at(freezer, 12)
    base(hass)
    coord, hw = await setup_ihc([room(temp_sensor="sensor.t_wz")])
    await coord.async_add_group("Oben", ["wz"])
    assert coord._suppress_reload is False


async def test_heating_period_notification(hass, setup_ihc, freezer):
    at(freezer, 12)
    base(hass, t=17.0)
    hass.states.async_set("input_boolean.heizperiode", "off")
    coord, hw = await setup_ihc([room(temp_sensor="sensor.t_wz")], heating_period_entity="input_boolean.heizperiode")
    await cycle(hass, coord)
    from homeassistant.helpers import issue_registry as ir
    reg = ir.async_get(hass)
    issue = reg.async_get_issue("intelligent_heating_control", "heating_period_blocked_wz")
    assert issue is not None and issue.translation_placeholders == {"room": "Wohnzimmer"}   # v2.7: Repairs
    assert hw.of("climate", "set_hvac_mode", "climate.trv_wz")[-1]["hvac_mode"] == "off"
    hass.states.async_set("input_boolean.heizperiode", "on")
    await cycle(hass, coord)
    assert reg.async_get_issue("intelligent_heating_control", "heating_period_blocked_wz") is None


async def test_warmup_stall_is_a_repair_issue(hass, setup_ihc, freezer):
    """v2.7 – 'room is not warming up' appears under Repairs and clears itself."""
    at(freezer, 12)
    base(hass)
    coord, hw = await setup_ihc([room(temp_sensor="sensor.t_wz")])
    from homeassistant.helpers import issue_registry as ir
    reg = ir.async_get(hass)
    coord._check_warmup_stall_notifications({"wz": {"warmup_stall_active": True,
                                                    "warmup_stall_minutes_elapsed": 140,
                                                    "warmup_stall_expected_minutes": 60}})
    issue = reg.async_get_issue("intelligent_heating_control", "warmup_stall_wz")
    assert issue.translation_key == "warmup_stall"
    assert issue.translation_placeholders == {"room": "Wohnzimmer", "minutes": "140", "expected": "60"}
    coord._check_warmup_stall_notifications({"wz": {"warmup_stall_active": False}})
    assert reg.async_get_issue("intelligent_heating_control", "warmup_stall_wz") is None
