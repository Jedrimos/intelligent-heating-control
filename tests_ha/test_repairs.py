"""Repairs: missing / long-unavailable entities show up in Settings → Repairs."""
from datetime import datetime
from zoneinfo import ZoneInfo

from homeassistant.helpers import issue_registry as ir

from .conftest import DOMAIN, cycle, room, temp_sensor, trv

BERLIN = ZoneInfo("Europe/Berlin")


async def test_missing_and_unavailable_entities_create_repairs(hass, setup_ihc, freezer):
    freezer.move_to(datetime(2026, 11, 24, 12, tzinfo=BERLIN))
    trv(hass, "climate.trv_wz")
    temp_sensor(hass, "sensor.t_wz", 19.0)
    coord, hw = await setup_ihc([room(temp_sensor="sensor.t_wz", window_sensors=["binary_sensor.gibts_nicht"])])
    reg = ir.async_get(hass)
    await cycle(hass, coord)
    assert not reg.async_get_issue(DOMAIN, "missing_binary_sensor.gibts_nicht"), "grace period after startup"
    freezer.tick(400)
    for _ in range(5):
        await cycle(hass, coord)
    issue = reg.async_get_issue(DOMAIN, "missing_binary_sensor.gibts_nicht")
    assert issue is not None and issue.translation_key == "missing_entity"
    assert issue.translation_placeholders["room"] == "Wohnzimmer"

    hass.states.async_set("sensor.t_wz", "unavailable")
    for _ in range(5):
        await cycle(hass, coord)
    assert not reg.async_get_issue(DOMAIN, "unavailable_sensor.t_wz"), "not before an hour"
    freezer.tick(3700)
    for _ in range(5):
        await cycle(hass, coord)
    assert reg.async_get_issue(DOMAIN, "unavailable_sensor.t_wz") is not None

    temp_sensor(hass, "sensor.t_wz", 19.5)
    hass.states.async_set("binary_sensor.gibts_nicht", "off")
    for _ in range(5):
        await cycle(hass, coord)
    assert reg.async_get_issue(DOMAIN, "unavailable_sensor.t_wz") is None
    assert reg.async_get_issue(DOMAIN, "missing_binary_sensor.gibts_nicht") is None
