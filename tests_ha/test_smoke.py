from .conftest import cycle, room, temp_sensor, trv


async def test_setup_and_basic_setpoint(hass, setup_ihc):
    trv(hass, "climate.trv_wz", current=18.0, target=17.0)
    temp_sensor(hass, "sensor.t_wz", 18.0)
    coord, hw = await setup_ihc([room(temp_sensor="sensor.t_wz")])
    await cycle(hass, coord, 2)
    rd = coord.data["rooms"]["wz"]
    print(rd["source"], rd["target_temp"], hw.calls)
    assert rd["current_temp"] == 18.0
    assert hw.last_temp("climate.trv_wz") == rd["target_temp"]
