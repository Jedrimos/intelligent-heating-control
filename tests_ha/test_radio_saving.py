"""v2.7.3 – fewer radio commands / valve movements."""
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from .conftest import cycle, room, temp_sensor, trv

BERLIN = ZoneInfo("Europe/Berlin")


async def test_target_hovering_at_rounding_boundary_is_not_sent_back_and_forth(hass, setup_ihc, freezer):
    """Default curve: 10 °C → 20.5, 0 °C → 22.0, so 8.33 °C outside is exactly 20.75 °C.
    The outdoor temperature wobbling around that point used to send 20.5/21.0/20.5/..."""
    t = datetime(2026, 11, 24, 12, 0, tzinfo=BERLIN)
    freezer.move_to(t)
    trv(hass, "climate.trv_wz")
    temp_sensor(hass, "sensor.t_wz", 19.0)
    temp_sensor(hass, "sensor.out", 8.3)
    coord, hw = await setup_ihc([room(temp_sensor="sensor.t_wz")], outdoor_temp_sensor="sensor.out", outdoor_temp_smoothing_minutes=0)
    await cycle(hass, coord, 2)
    hw.clear()
    for i in range(10):
        temp_sensor(hass, "sensor.out", 8.37 if i % 2 else 8.30)   # 20.745 / 20.755 °C
        t += timedelta(minutes=1)
        freezer.move_to(t)
        await cycle(hass, coord)
    assert len(hw.of("climate", "set_temperature", "climate.trv_wz")) <= 1

    # a real change still goes out right away
    temp_sensor(hass, "sensor.out", 0.0)                              # → 22.0 °C
    await cycle(hass, coord)
    assert coord.data["rooms"]["wz"]["target_temp"] == 22.0
    assert hw.last_temp("climate.trv_wz") == 22.0


async def test_startup_grace_sends_nothing(hass, setup_ihc, freezer):
    """Restart/update: the thermostats keep their setpoint until sensors are up - no
    frost-protection command followed by the real target a minute later."""
    t = datetime(2026, 11, 24, 12, 0, tzinfo=BERLIN)
    freezer.move_to(t)
    trv(hass, "climate.trv_wz", target=20.5)
    temp_sensor(hass, "sensor.t_wz", 19.0)
    coord, hw = await setup_ihc([room(temp_sensor="sensor.t_wz")], startup_grace_seconds=120)
    hw.clear()
    await cycle(hass, coord, 2)
    assert coord.data.get("startup_grace_active") is True
    assert not [c for c in hw.calls if c[0] == "climate" and c[2].get("entity_id") == "climate.trv_wz"]
    assert hass.states.get("climate.trv_wz").attributes["temperature"] == 20.5
    t += timedelta(minutes=3)
    freezer.move_to(t)
    await cycle(hass, coord, 2)
    assert coord.data.get("startup_grace_active") is False
    temps = [c["temperature"] for c in hw.of("climate", "set_temperature", "climate.trv_wz")]
    assert 7.0 not in temps
