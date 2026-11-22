"""v2.7 – Spar-Bilanz and the monthly report."""
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from .conftest import cycle, room, temp_sensor, trv

BERLIN = ZoneInfo("Europe/Berlin")


async def test_savings_accumulate_and_monthly_report(hass, setup_ihc, freezer):
    t = datetime(2026, 11, 30, 22, 0, tzinfo=BERLIN)
    freezer.move_to(t)
    temp_sensor(hass, "sensor.out", 0.0)
    temp_sensor(hass, "sensor.t_wz", 19.0)
    trv(hass, "climate.trv_wz", current=19.0, target=21.0)
    coord, hw = await setup_ihc([room(temp_sensor="sensor.t_wz", radiator_kw=1.6)],
                                outdoor_temp_sensor="sensor.out", static_energy_price=0.12)
    events = []
    hass.bus.async_listen("intelligent_heating_control_monthly_report", lambda e: events.append(e.data))
    coord.set_room_mode("wz", "sleep")
    for _ in range(60):                                  # one hour in sleep mode
        t += timedelta(minutes=1)
        freezer.move_to(t)
        temp_sensor(hass, "sensor.t_wz", 19.0)
        temp_sensor(hass, "sensor.out", 0.0)
        await cycle(hass, coord)
    sv = coord.data["savings"]
    rd = coord.data["rooms"]["wz"]
    assert sv["month"] == "2026-11"
    expected_heat = 1.6 / 32 * (rd["comfort_temp_eff"] - rd["target_temp"])   # kWh in one hour
    assert 0.8 * expected_heat < sv["by_category"]["schedule"] * 0.92 < 1.2 * expected_heat
    assert sv["total_eur"] is not None

    t = datetime(2026, 12, 1, 0, 2, tzinfo=BERLIN)       # new month
    freezer.move_to(t)
    temp_sensor(hass, "sensor.t_wz", 19.0)
    temp_sensor(hass, "sensor.out", 0.0)
    await cycle(hass, coord)
    assert coord.data["savings"]["month"] == "2026-12"
    assert coord.data["savings"]["prev_month"] == "2026-11"
    assert events and events[0]["month"] == "2026-11" and events[0]["saved_kwh"]["schedule"] > 0
    reports = [c for c in hw.of("persistent_notification", "create") if c.get("notification_id") == "ihc_monthly_report"]
    assert reports and "schedule" in reports[0]["message"]   # test HA runs in English
