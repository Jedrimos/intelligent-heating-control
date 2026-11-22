"""TRV capability detection, Raumfühler-Sync and the v2.6 comfort features."""
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.core import callback
from pytest_homeassistant_custom_component.common import MockConfigEntry

from .conftest import cycle, room, temp_sensor, trv

BERLIN = ZoneInfo("Europe/Berlin")


def at(freezer, hh, mm=0, day=24):
    freezer.move_to(datetime(2026, 11, day, hh, mm, tzinfo=BERLIN))


def z2m_device(hass, name, manufacturer, model, entities):
    """Register a fake Zigbee2MQTT device with its entities (entity_id -> (state, attrs))."""
    cfg = MockConfigEntry(domain="mqtt")
    cfg.add_to_hass(hass)
    dev = dr.async_get(hass).async_get_or_create(
        config_entry_id=cfg.entry_id, identifiers={("mqtt", name)}, manufacturer=manufacturer, model=model, name=name)
    reg = er.async_get(hass)
    for eid, (state, attrs) in entities.items():
        domain, object_id = eid.split(".", 1)
        reg.async_get_or_create(domain, "mqtt", f"{name}_{object_id}", suggested_object_id=object_id,
                                device_id=dev.id, config_entry=cfg)
        hass.states.async_set(eid, state, attrs)


def record(hass, domain, service, calls):
    @callback
    def _h(call):
        calls.append(dict(call.data))
        eid = call.data["entity_id"]
        st = hass.states.get(eid)
        if st is not None:
            new = call.data.get("value", call.data.get("option"))
            hass.states.async_set(eid, str(new), st.attributes)
    hass.services.async_register(domain, service, _h)


async def test_valve_position_from_device_sensor(hass, setup_ihc, freezer):
    at(freezer, 12)
    trv_attrs = {"current_temperature": 18.0, "temperature": 21.0, "hvac_modes": ["off", "heat"],
                 "min_temp": 5, "max_temp": 30, "hvac_action": "idle"}
    z2m_device(hass, "bosch_wz", "Bosch", "BTH-RA", {
        "climate.trv_wz": ("heat", trv_attrs),
        "sensor.trv_wz_pi_heating_demand": ("42", {"unit_of_measurement": "%"}),
        "number.trv_wz_remote_temperature": ("0", {"min": 0, "max": 35}),
    })
    temp_sensor(hass, "sensor.t_wz", 18.0)
    coord, hw = await setup_ihc([room(temp_sensor="sensor.t_wz")])
    await cycle(hass, coord)
    rd = coord.data["rooms"]["wz"]
    assert rd["trv_avg_valve"] == 42.0
    caps = rd["trv_capabilities"][0]
    assert caps["valve_source"] == "sensor" and caps["external_sensor"] is True
    assert caps["model"] == "BTH-RA" and any("30 min" in q for q in caps["quirks"])


async def test_sonoff_external_sensor_sync_and_limit_not_valve(hass, setup_ihc, freezer):
    at(freezer, 12)
    trv_attrs = {"current_temperature": 23.0, "temperature": 21.0, "hvac_modes": ["off", "auto", "heat"],
                 "min_temp": 4, "max_temp": 35}
    z2m_device(hass, "sonoff_wz", "SONOFF", "TRVZB", {
        "climate.trv_wz": ("heat", trv_attrs),
        "number.trv_wz_valve_opening_degree": ("100", {"min": 0, "max": 100}),
        "number.trv_wz_external_temperature_input": ("0", {"min": 0, "max": 99.9}),
        "select.trv_wz_temperature_sensor_select": ("internal", {"options": ["internal", "external"]}),
    })
    temp_sensor(hass, "sensor.t_wz", 19.27)
    coord, hw = await setup_ihc([room(temp_sensor="sensor.t_wz", trv_external_sensor_sync=True)])
    await cycle(hass, coord)
    num_calls = hw.of("number", "set_value")
    sel_calls = hw.of("select", "select_option")
    assert coord.data["rooms"]["wz"]["trv_avg_valve"] is None, "valve_opening_degree is a limit, not a position"
    assert sel_calls == [{"entity_id": "select.trv_wz_temperature_sensor_select", "option": "external"}]
    assert num_calls[-1] == {"entity_id": "number.trv_wz_external_temperature_input", "value": 19.3}
    await cycle(hass, coord)
    assert len(hw.of("number", "set_value")) == 1, "unchanged value is not re-sent every cycle"
    temp_sensor(hass, "sensor.t_wz", 19.6)
    await cycle(hass, coord)
    assert hw.of("number", "set_value")[-1]["value"] == 19.6
    freezer.tick(1600)
    await cycle(hass, coord)
    assert len(hw.of("number", "set_value")) == 3, "re-sent after the resend interval even if unchanged"


async def test_danfoss_centidegrees(hass, setup_ihc, freezer):
    at(freezer, 12)
    z2m_device(hass, "ally_wz", "Danfoss", "014G2461", {
        "climate.trv_wz": ("heat", {"current_temperature": 22.0, "temperature": 21.0, "hvac_modes": ["heat"],
                                    "min_temp": 5, "max_temp": 32}),
        "number.trv_wz_external_measured_room_sensor": ("-8000", {"min": -8000, "max": 3500}),
    })
    temp_sensor(hass, "sensor.t_wz", 20.45)
    coord, hw = await setup_ihc([room(temp_sensor="sensor.t_wz", trv_external_sensor_sync=True)])
    await cycle(hass, coord)
    assert hw.of("number", "set_value")[-1]["value"] == 2045


async def test_auto_mode_switched_to_heat_and_coarse_step(hass, setup_ihc, freezer):
    at(freezer, 12)
    trv(hass, "climate.trv_wz", hvac_action="idle", valve_position=0, target_temp_step=1.0)
    st = hass.states.get("climate.trv_wz")
    hass.states.async_set("climate.trv_wz", "auto", dict(st.attributes, hvac_modes=["off", "auto", "heat"]))
    temp_sensor(hass, "sensor.t_wz", 19.0)
    coord, hw = await setup_ihc([room(temp_sensor="sensor.t_wz", comfort_temp=21.5)])
    coord.set_room_mode("wz", "comfort")
    await cycle(hass, coord)
    assert hw.of("climate", "set_hvac_mode", "climate.trv_wz")[-1]["hvac_mode"] == "heat"
    assert hw.last_temp("climate.trv_wz") in (21.0, 22.0), "whole-degree TRV gets whole degrees"


async def test_feel_cold_button_and_learning(hass, setup_ihc, freezer):
    at(freezer, 7)
    trv(hass, "climate.trv_wz", hvac_action="idle", valve_position=0)
    temp_sensor(hass, "sensor.t_wz", 19.0)
    coord, hw = await setup_ihc([room(temp_sensor="sensor.t_wz")])
    coord.set_room_mode("wz", "comfort")
    await cycle(hass, coord)
    base = coord.data["rooms"]["wz"]["target_temp"]
    await hass.services.async_call("intelligent_heating_control", "feel", {"id": "wz", "feeling": "cold"}, blocking=True)
    await cycle(hass, coord)
    assert coord.data["rooms"]["wz"]["target_temp"] == base + 1.0
    btn = [s.entity_id for s in hass.states.async_all("button") if "kalt" in s.entity_id]
    assert btn, "per-room 'Mir ist kalt' button entity exists"
    freezer.tick(timedelta(hours=2, minutes=1))
    await cycle(hass, coord)
    assert coord.data["rooms"]["wz"]["target_temp"] == base, "temporary offset expires"
    # two more cold mornings at ~7:00 -> learned
    for day in (25, 26):
        at(freezer, 7, 5, day=day)
        await coord.async_feel("wz", "cold")
    at(freezer, 7, 0, day=28)
    await cycle(hass, coord)
    rd = coord.data["rooms"]["wz"]
    assert rd["feel_learned_offset"] == 0.5
    assert rd["target_temp"] == base + 0.5
    at(freezer, 15, 0, day=28)
    await cycle(hass, coord)
    assert coord.data["rooms"]["wz"]["feel_learned_offset"] == 0.0, "only around that time of day"
    await coord.async_reset_comfort_learning("wz")
    at(freezer, 7, 0, day=29)
    await cycle(hass, coord)
    assert coord.data["rooms"]["wz"]["feel_learned_offset"] == 0.0


async def test_person_preferences(hass, setup_ihc, freezer):
    at(freezer, 12)
    trv(hass, "climate.trv_wz", hvac_action="idle", valve_position=0)
    temp_sensor(hass, "sensor.t_wz", 19.0)
    hass.states.async_set("person.anna", "home")
    hass.states.async_set("person.ben", "not_home")
    coord, hw = await setup_ihc([room(temp_sensor="sensor.t_wz")], presence_auto_persons=False,
                                person_preferences=[{"person": "person.anna", "offset": 1.0},
                                                    {"person": "person.ben", "offset": -1.0}])
    coord.set_room_mode("wz", "comfort")
    await cycle(hass, coord)
    with_anna = coord.data["rooms"]["wz"]["target_temp"]
    hass.states.async_set("person.ben", "home")
    await cycle(hass, coord)
    assert coord.data["rooms"]["wz"]["target_temp"] == with_anna - 1.0  # average 0
    hass.states.async_set("person.anna", "not_home")
    await cycle(hass, coord)
    assert coord.data["rooms"]["wz"]["target_temp"] == with_anna - 2.0  # only Ben (-1)


async def test_wakeup_with_phone_alarm(hass, setup_ihc, freezer):
    at(freezer, 5, 0)
    trv(hass, "climate.trv_sz", hvac_action="idle", valve_position=0)
    temp_sensor(hass, "sensor.t_sz", 17.0)
    alarm = datetime(2026, 11, 24, 6, 30, tzinfo=BERLIN)
    hass.states.async_set("sensor.pixel_next_alarm", alarm.isoformat(), {"device_class": "timestamp"})
    sched = [{"days": ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
              "periods": [{"start": "18:00", "end": "22:00", "mode": "comfort", "temperature": 21}]}]
    coord, hw = await setup_ihc([room("sz", "Schlafzimmer", temp_sensor="sensor.t_sz", schedules=sched, wakeup_enabled=True)])
    coord.set_room_mode("sz", "sleep")  # bedroom in sleep mode until the alarm rings
    await cycle(hass, coord)
    assert coord.data["rooms"]["sz"]["wakeup_active"] is False
    eco = coord.data["rooms"]["sz"]["target_temp"]
    at(freezer, 6, 5)
    await cycle(hass, coord)
    rd = coord.data["rooms"]["sz"]
    assert rd["wakeup_active"] is True and rd["source"] == "wakeup"
    assert rd["target_temp"] > eco
    # alarm rang - the phone already reports tomorrow's alarm, room must stay warm
    at(freezer, 6, 45)
    hass.states.async_set("sensor.pixel_next_alarm", (alarm + timedelta(days=1)).isoformat(), {"device_class": "timestamp"})
    await cycle(hass, coord)
    assert coord.data["rooms"]["sz"]["wakeup_active"] is True
    at(freezer, 7, 40)
    await cycle(hass, coord)
    assert coord.data["rooms"]["sz"]["wakeup_active"] is False
    assert coord.data["rooms"]["sz"]["target_temp"] == eco
