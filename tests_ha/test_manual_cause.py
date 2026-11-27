"""v2.7.1 – why did a room go to manual? Device / HA user / automation / IHC's own late echo."""
from datetime import datetime
from zoneinfo import ZoneInfo

from homeassistant.core import Context

from .conftest import cycle, room, temp_sensor, trv

BERLIN = ZoneInfo("Europe/Berlin")


async def _setup(hass, setup_ihc, freezer):
    freezer.move_to(datetime(2026, 11, 24, 12, 0, tzinfo=BERLIN))
    trv(hass, "climate.trv_wz")
    temp_sensor(hass, "sensor.t_wz", 19.0)
    coord, hw = await setup_ihc([room(temp_sensor="sensor.t_wz")])
    await cycle(hass, coord, 2)
    return coord, hw


def _set(hass, temp, context=None):
    st = hass.states.get("climate.trv_wz")
    hass.states.async_set("climate.trv_wz", "heat", dict(st.attributes, temperature=temp), context=context)


async def test_wheel_on_the_device_is_reported_as_device(hass, setup_ihc, freezer):
    coord, hw = await _setup(hass, setup_ihc, freezer)
    base = hass.states.get("climate.trv_wz").attributes["temperature"]
    _set(hass, base + 0.5)            # two notches on the wheel, a moment apart
    _set(hass, base + 1.0)
    await hass.async_block_till_done()
    hw.clear()
    await cycle(hass, coord)
    assert coord.get_room_mode("wz") == "manual"
    t = coord.data["rooms"]["wz"]["manual_trigger"]
    assert t["cause"] == "device" and t["to"] == base + 1.0 and t["from"] == base
    note = hw.of("persistent_notification", "create")[0]["message"]
    assert "turned on the thermostat" in note or "am Thermostat gedreht" in note
    assert coord.data["manual_log"][0]["cause"] == "device"


async def test_single_jump_without_ha_is_device_or_app(hass, setup_ihc, freezer):
    coord, hw = await _setup(hass, setup_ihc, freezer)
    _set(hass, 25.0)
    await cycle(hass, coord)
    assert coord.data["rooms"]["wz"]["manual_trigger"]["cause"] == "device_or_app"


async def test_change_in_home_assistant_names_the_person(hass, setup_ihc, freezer):
    coord, hw = await _setup(hass, setup_ihc, freezer)
    hass.states.async_set("person.miri", "home", {"user_id": "u-miri", "friendly_name": "Miri"})
    _set(hass, 25.0, context=Context(user_id="u-miri"))
    await cycle(hass, coord)
    t = coord.data["rooms"]["wz"]["manual_trigger"]
    assert t["cause"] == "ha_user" and t["name"] == "Miri"


async def test_automation_is_named(hass, setup_ihc, freezer):
    coord, hw = await _setup(hass, setup_ihc, freezer)
    run = Context()
    hass.states.async_set("automation.morgens_warm", "on", {"friendly_name": "Morgens warm"}, context=run)
    _set(hass, 25.0, context=Context(parent_id=run.id))
    await cycle(hass, coord)
    t = coord.data["rooms"]["wz"]["manual_trigger"]
    assert t["cause"] == "automation" and t["name"] == "Morgens warm"


async def test_late_echo_of_an_ihc_command_is_not_manual(hass, setup_ihc, freezer):
    coord, hw = await _setup(hass, setup_ihc, freezer)
    ihc_ctx = hw.contexts[-1]             # context of IHC's last thermostat command
    assert ihc_ctx is not None and ihc_ctx.id in coord._ihc_context_ids
    _set(hass, 26.0, context=ihc_ctx)     # thermostat reports an (old) IHC value much later
    await cycle(hass, coord)
    assert coord.get_room_mode("wz") != "manual"


async def test_manual_set_in_ihc(hass, setup_ihc, freezer):
    coord, hw = await _setup(hass, setup_ihc, freezer)
    coord.set_room_manual_temp("wz", 22.0)
    await cycle(hass, coord)
    assert coord.data["rooms"]["wz"]["manual_trigger"]["cause"] == "ihc_panel"
    coord.set_room_mode("wz", "auto")
    await cycle(hass, coord)
    assert coord.data["rooms"]["wz"]["manual_trigger"] is None
