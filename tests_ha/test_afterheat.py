"""v2.7 – Restwärme nutzen: learn the radiator's after-heat, then close the valve early."""
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from .conftest import cycle, room, temp_sensor, trv

BERLIN = ZoneInfo("Europe/Berlin")


async def test_learns_afterheat_then_closes_valve_early(hass, setup_ihc, freezer):
    t = datetime(2026, 11, 24, 10, 0, tzinfo=BERLIN)
    freezer.move_to(t)
    trv(hass, "climate.trv_wz", current=20.0, target=21.0, valve_position=0)
    temp_sensor(hass, "sensor.t_wz", 20.0)
    coord, hw = await setup_ihc([room(temp_sensor="sensor.t_wz")])
    await cycle(hass, coord)
    target = coord.data["rooms"]["wz"]["target_temp"]

    def set_state(temp, valve):
        temp_sensor(hass, "sensor.t_wz", temp)
        st = hass.states.get("climate.trv_wz")
        hass.states.async_set("climate.trv_wz", st.state, {**st.attributes, "valve_position": valve})

    async def step(minutes, temp, valve):
        nonlocal t
        t += timedelta(minutes=minutes)
        freezer.move_to(t)
        set_state(temp, valve)
        await cycle(hass, coord)

    base = target - 1.0
    for _ in range(3):
        for _ in range(4):                       # 20 min heating, valve open
            await step(5, base, 60)
        await step(5, base + 0.3, 0)            # valve closed - room keeps warming
        await step(5, base + 0.5, 0)            # peak
        for _ in range(4):
            await step(5, base + 0.4, 0)        # settles below the peak
    rd = coord.data["rooms"]["wz"]
    assert rd["afterheat_samples"] == 3
    assert rd["afterheat_overshoot"] == 0.5
    assert rd["afterheat_coasting"] is False

    # heating again, 0.4 °C below target: residual heat (0.5 °C) suffices -> close early
    await step(5, target - 0.4, 60)
    rd = coord.data["rooms"]["wz"]
    assert rd["afterheat_coasting"] is True
    assert hw.last_temp("climate.trv_wz") < target - 0.4
    assert rd["target_temp"] == target                      # the room's target is unchanged

    # still far below target -> heat normally
    await step(5, target - 0.2, 0)                          # rising on residual heat
    await step(5, target - 0.4, 0)                          # cooling again -> normal heating
    assert coord.data["rooms"]["wz"]["afterheat_coasting"] is False
    assert hw.last_temp("climate.trv_wz") >= target


async def test_hand_change_while_coasting_is_sent_and_kept(hass, setup_ihc, freezer):
    """v2.7.1 – reproduces the bathroom: IHC was coasting (valve closed early) when someone
    turned the thermostat up. The new value must be what IHC sends, right away and later -
    it used to send its old, lowered setpoint back within seconds, every time."""
    t = datetime(2026, 11, 24, 10, 0, tzinfo=BERLIN)
    freezer.move_to(t)
    trv(hass, "climate.trv_wz", current=20.0, target=21.0, valve_position=60)
    temp_sensor(hass, "sensor.t_wz", 20.0)
    coord, hw = await setup_ihc([room(temp_sensor="sensor.t_wz")])
    await cycle(hass, coord)
    target = coord.data["rooms"]["wz"]["target_temp"]
    coord._afterheat_samples["wz"] = [[0.5, 15]] * 3
    temp_sensor(hass, "sensor.t_wz", target - 0.3)
    await cycle(hass, coord)
    assert coord.data["rooms"]["wz"]["afterheat_coasting"] is True
    lowered = hw.last_temp("climate.trv_wz")
    assert lowered < target
    await cycle(hass, coord)                  # thermostat confirmed the lowered setpoint

    wanted = target + 2.0
    st = hass.states.get("climate.trv_wz")
    hass.states.async_set("climate.trv_wz", "heat", {**st.attributes, "temperature": wanted, "valve_position": 0})
    hw.clear()
    await cycle(hass, coord)
    assert coord.get_room_mode("wz") == "manual"
    assert all(c["temperature"] == wanted for c in hw.of("climate", "set_temperature", "climate.trv_wz"))
    for _ in range(3):
        t += timedelta(minutes=1)
        freezer.move_to(t)
        await cycle(hass, coord)
    rd = coord.data["rooms"]["wz"]
    assert rd["afterheat_coasting"] is False
    assert hass.states.get("climate.trv_wz").attributes["temperature"] == wanted
    assert all(c["temperature"] == wanted for c in hw.of("climate", "set_temperature", "climate.trv_wz"))


async def test_afterheat_needs_room_thermometer_and_can_be_disabled(hass, setup_ihc, freezer):
    freezer.move_to(datetime(2026, 11, 24, 10, 0, tzinfo=BERLIN))
    trv(hass, "climate.trv_wz", current=20.0, target=21.0, valve_position=60)
    coord, hw = await setup_ihc([room()], afterheat_enabled=False)
    await cycle(hass, coord)
    coord._afterheat_samples["wz"] = [[0.6, 20]] * 3
    await cycle(hass, coord)
    rd = coord.data["rooms"]["wz"]
    assert rd["afterheat_coasting"] is False                # no room sensor + disabled


async def test_hydraulic_hints_and_flow_recommendation(hass, setup_ihc, freezer):
    """v2.7 – rooms compared by valve opening while heating: the starved bathroom is
    flagged, and with one starved room IHC asks for balancing, not a higher flow temp."""
    freezer.move_to(datetime(2026, 11, 24, 10, 0, tzinfo=BERLIN))
    for rid in ("wz", "bad", "kz"):
        trv(hass, f"climate.trv_{rid}", current=19.0, target=21.0, valve_position=50)
    coord, hw = await setup_ihc([room("wz", "Wohnzimmer"), room("bad", "Bad"), room("kz", "Kinderzimmer")])
    await cycle(hass, coord)
    coord._hydraulic_stats.update({
        "wz": {"avg": 35.0, "starved": 0.0, "n": 600},
        "bad": {"avg": 98.0, "starved": 0.8, "n": 600},
        "kz": {"avg": 40.0, "starved": 0.0, "n": 600},
    })
    await cycle(hass, coord)
    rooms = coord.data["rooms"]
    assert rooms["bad"]["hydraulic_hint"] == "too_little"
    assert rooms["wz"]["hydraulic_hint"] is None
    assert coord.data["flow_recommendation"] is None          # balance first

    coord._hydraulic_stats["bad"] = {"avg": 38.0, "starved": 0.0, "n": 600}
    await cycle(hass, coord)
    assert coord.data["flow_recommendation"]["direction"] == "down"   # all rooms ~40 % open
    assert coord._hydraulic_stats["wz"]["n"] == 600 + 2       # heating samples keep counting
