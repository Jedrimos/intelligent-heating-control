"""Feature scenarios: presence, weather/forecast, prices, relay, cascade, comfort."""
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from .conftest import cycle, room, temp_sensor, trv

BERLIN = ZoneInfo("Europe/Berlin")


def at(freezer, hh, mm=0, day=24):
    freezer.move_to(datetime(2026, 11, day, hh, mm, tzinfo=BERLIN))


def weather(hass, temp=5.0, state="sunny", **attrs):
    hass.states.async_set("weather.home", state, {"temperature": temp, "temperature_unit": "°C", **attrs})


def base(hass, rid="wz", t=19.0):
    trv(hass, f"climate.trv_{rid}", hvac_action="idle", valve_position=0)
    temp_sensor(hass, f"sensor.t_{rid}", t)


async def test_presence_auto_away_with_delay(hass, setup_ihc, freezer):
    at(freezer, 12)
    base(hass)
    hass.states.async_set("person.a", "home")
    coord, hw = await setup_ihc([room(temp_sensor="sensor.t_wz")], presence_entities=["person.a"],
                                presence_away_delay_minutes=30, away_temp=16.0)
    await cycle(hass, coord)
    assert coord.get_system_mode() == "auto"
    hass.states.async_set("person.a", "not_home")
    await cycle(hass, coord)
    assert coord.get_system_mode() == "auto"  # still in delay
    freezer.tick(31 * 60)
    await cycle(hass, coord, 2)
    assert coord.get_system_mode() == "away"
    assert coord.data["rooms"]["wz"]["source"] == "system_away"
    hass.states.async_set("person.a", "home")
    await cycle(hass, coord, 2)
    assert coord.get_system_mode() == "auto"


async def test_heating_curve_uses_weather_when_no_outdoor_sensor(hass, setup_ihc, freezer):
    at(freezer, 12)
    base(hass)
    weather(hass, temp=-10.0)
    coord, hw = await setup_ihc([room(temp_sensor="sensor.t_wz")])
    await cycle(hass, coord)
    assert coord.data["outdoor_temp"] == -10.0
    assert coord.data["outdoor_temp_source"] == "weather:weather.home"
    cold_target = coord.data["rooms"]["wz"]["target_temp"]
    weather(hass, temp=12.0)
    await cycle(hass, coord)
    assert coord.data["rooms"]["wz"]["target_temp"] < cold_target, "heating curve must react to outdoor temp"


async def test_outdoor_sensor_wins_and_falls_back_to_weather(hass, setup_ihc, freezer):
    at(freezer, 12)
    base(hass)
    weather(hass, temp=-10.0)
    temp_sensor(hass, "sensor.out", 3.0)
    coord, hw = await setup_ihc([room(temp_sensor="sensor.t_wz")], outdoor_temp_sensor="sensor.out")
    await cycle(hass, coord)
    assert coord.data["outdoor_temp"] == 3.0
    hass.states.async_set("sensor.out", "unavailable")
    freezer.tick(3600)  # past the 30-min last-known window
    await cycle(hass, coord)
    assert coord.data["outdoor_temp"] == -10.0


async def test_forecast_via_service_feeds_cold_boost(hass, setup_ihc, freezer):
    at(freezer, 12)
    base(hass)
    weather(hass, temp=0.0)
    coord, hw = await setup_ihc([room(temp_sensor="sensor.t_wz")], weather_entity="weather.home",
                                weather_cold_threshold=-5.0, weather_cold_boost=1.0)
    hw.forecast["weather.home"] = [
        {"datetime": "2026-11-24T00:00:00+01:00", "temperature": 1.0, "templow": -8.0, "condition": "snowy"},
        {"datetime": "2026-11-25T00:00:00+01:00", "temperature": 3.0, "templow": -1.0, "condition": "cloudy"},
    ]
    coord._weather_forecast_cache = (None, [], 0.0)
    await cycle(hass, coord)
    fc = coord._get_weather_forecast()
    assert fc["forecast_today_min"] == -8.0
    assert fc["cold_warning"] is True
    assert coord.data["rooms"]["wz"].get("cold_boost") == 1.0


async def test_coldnight_forecast_suspends_summer_mode(hass, setup_ihc, freezer):
    at(freezer, 12)
    base(hass)
    weather(hass, temp=22.0)
    coord, hw = await setup_ihc([room(temp_sensor="sensor.t_wz")], weather_entity="weather.home",
                                summer_mode_enabled=True, summer_threshold=18.0, summer_mode_hysteresis_enabled=False,
                                forecast_coldnight_enabled=True, forecast_coldnight_temp=3.0)
    hw.forecast["weather.home"] = [{"datetime": "2026-11-24T00:00:00+01:00", "temperature": 22.0, "templow": 10.0}]
    await cycle(hass, coord)
    assert coord.data["summer_mode"] is True
    hw.forecast["weather.home"] = [{"datetime": "2026-11-24T00:00:00+01:00", "temperature": 22.0, "templow": 1.0}]
    coord._weather_forecast_cache = (None, [], 0.0)
    await cycle(hass, coord)
    assert coord.data["summer_mode"] is False


async def test_night_setback(hass, setup_ihc, freezer):
    at(freezer, 23)
    base(hass)
    hass.states.async_set("sun.sun", "below_horizon", {"azimuth": 0, "elevation": -20})
    coord, hw = await setup_ihc([room(temp_sensor="sensor.t_wz")], night_setback_enabled=True, night_setback_offset=2.0)
    await cycle(hass, coord)
    night = coord.data["rooms"]["wz"]["target_temp"]
    hass.states.async_set("sun.sun", "above_horizon", {"azimuth": 180, "elevation": 20})
    await cycle(hass, coord)
    day = coord.data["rooms"]["wz"]["target_temp"]
    assert day - night == 2.0, (day, night)


async def test_energy_price_quarter_hourly_and_dict_lists(hass, setup_ihc, freezer):
    at(freezer, 18, 10)  # slot 72/96 is the expensive one
    base(hass)
    prices = [0.20] * 96
    for i in range(72, 76):
        prices[i] = 0.60
    hass.states.async_set("sensor.price", "0.25", {"today_prices": [{"total": p} for p in prices]})
    coord, hw = await setup_ihc([room(temp_sensor="sensor.t_wz")], energy_price_entity="sensor.price",
                                energy_price_eco_offset=2.0)
    await cycle(hass, coord)
    assert coord.last_update_success
    assert coord.data["rooms"]["wz"].get("price_eco_offset") == -2.0
    assert len(coord.data["price_forecast"]) == 24


async def test_boiler_relay_follows_heating(hass, setup_ihc, freezer):
    at(freezer, 12)
    trv(hass, "climate.trv_wz", current=17.0, hvac_action="heating", valve_position=80)
    temp_sensor(hass, "sensor.t_wz", 17.0)
    hass.states.async_set("switch.boiler", "off")
    coord, hw = await setup_ihc([room(temp_sensor="sensor.t_wz")], boiler_switch_entity="switch.boiler",
                                boiler_min_on_seconds=0, boiler_min_off_seconds=0)
    await cycle(hass, coord)
    assert hw.of("switch", "turn_on", "switch.boiler")
    hass.states.async_set("switch.boiler", "on")
    st = hass.states.get("climate.trv_wz")
    hass.states.async_set("climate.trv_wz", "heat", dict(st.attributes, hvac_action="idle", valve_position=0, current_temperature=22))
    temp_sensor(hass, "sensor.t_wz", 22.0)
    freezer.tick(120)
    await cycle(hass, coord)
    assert hw.of("switch", "turn_off", "switch.boiler")


async def test_window_cascade(hass, setup_ihc, freezer):
    at(freezer, 12)
    base(hass, "wz"); base(hass, "kz")
    hass.states.async_set("binary_sensor.w_wz", "off")
    coord, hw = await setup_ihc([
        room("wz", "Wohnzimmer", temp_sensor="sensor.t_wz", window_sensors=["binary_sensor.w_wz"], window_reaction_time=0,
             window_cascade_rooms=["kz"], window_cascade_delay_minutes=10, window_cascade_offset=3.0),
        room("kz", "Kinderzimmer", temp_sensor="sensor.t_kz"),
    ])
    await cycle(hass, coord)
    normal = coord.data["rooms"]["kz"]["target_temp"]
    hass.states.async_set("binary_sensor.w_wz", "on")
    await cycle(hass, coord)
    freezer.tick(11 * 60)
    await cycle(hass, coord)
    assert coord.data["rooms"]["kz"]["window_cascade_active"] is True
    assert coord.data["rooms"]["kz"]["target_temp"] == normal - 3.0


async def test_mold_boost_and_ventilation_advice(hass, setup_ihc, freezer):
    at(freezer, 12)
    base(hass)
    hass.states.async_set("sensor.h_wz", "78", {"device_class": "humidity"})
    hass.states.async_set("sensor.co2_wz", "1500", {"device_class": "carbon_dioxide"})
    coord, hw = await setup_ihc([room(temp_sensor="sensor.t_wz", humidity_sensor="sensor.h_wz",
                                      co2_sensor="sensor.co2_wz", mold_humidity_threshold=70)])
    await cycle(hass, coord)
    rd = coord.data["rooms"]["wz"]
    assert rd["ventilation"] is not None and rd["ventilation"]["level"] in ("urgent", "recommended")
    assert rd["co2_ppm"] == 1500
    assert rd["humidity"] == 78.0
    assert (rd.get("mold") or {}).get("risk")


async def test_vacation_date_range(hass, setup_ihc, freezer):
    at(freezer, 12)
    base(hass)
    coord, hw = await setup_ihc([room(temp_sensor="sensor.t_wz")], vacation_start="2026-11-23",
                                vacation_end="2026-11-30", vacation_temp=14.0)
    await cycle(hass, coord, 2)
    assert coord.get_system_mode() == "vacation"
    assert coord.data["rooms"]["wz"]["target_temp"] == 14.0


async def test_guest_mode_and_expiry(hass, setup_ihc, freezer):
    at(freezer, 12)
    base(hass)
    coord, hw = await setup_ihc([room(temp_sensor="sensor.t_wz")])
    coord.activate_guest_mode(2)
    await cycle(hass, coord)
    assert coord.data["rooms"]["wz"]["source"] == "guest_mode"
    freezer.tick(3 * 3600)
    await cycle(hass, coord, 2)
    assert coord.get_system_mode() == "auto"


async def test_temp_threshold_heats_even_in_summer(hass, setup_ihc, freezer):
    at(freezer, 12)
    base(hass, t=14.0)
    temp_sensor(hass, "sensor.out", 25.0)
    coord, hw = await setup_ihc([room(temp_sensor="sensor.t_wz", room_temp_threshold=16.0)],
                                outdoor_temp_sensor="sensor.out", summer_mode_enabled=True,
                                summer_mode_hysteresis_enabled=False)
    await cycle(hass, coord)
    assert coord.data["summer_mode"] is True
    assert coord.data["rooms"]["wz"]["source"] == "temp_threshold_override"
    assert hw.last_temp("climate.trv_wz") is not None
