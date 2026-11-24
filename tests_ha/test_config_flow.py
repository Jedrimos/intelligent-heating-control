"""Config/options flow with optional entity fields left EMPTY (HACS review 2026-11-24).

An entity selector rejects "" - a vol.Optional(..., default="") in front of one made every
form fail as soon as the user left the (optional!) field empty."""
from homeassistant import config_entries
from homeassistant.data_entry_flow import FlowResultType

from .conftest import room, trv

DOMAIN = "intelligent_heating_control"


async def test_setup_with_empty_outdoor_sensor(hass):
    result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": config_entries.SOURCE_USER})
    assert result["type"] == FlowResultType.FORM
    result = await hass.config_entries.flow.async_configure(result["flow_id"], {})
    assert result["type"] == FlowResultType.FORM and result["step_id"] == "temperatures", result
    result = await hass.config_entries.flow.async_configure(result["flow_id"], {})
    assert result["type"] == FlowResultType.CREATE_ENTRY, result


async def test_global_settings_save_with_empty_entities_and_clearing(hass, setup_ihc):
    trv(hass, "climate.trv_wz")
    coord, hw = await setup_ihc([room()], summer_mode_entity="input_boolean.sommer",
                                boiler_switch_entity="switch.kessel")
    entry = coord.config_entry
    result = await hass.config_entries.options.async_init(entry.entry_id)
    result = await hass.config_entries.options.async_configure(result["flow_id"], {"next_step_id": "global_settings"})
    assert result["type"] == FlowResultType.FORM
    # the user cleared the two entity fields -> the frontend omits the keys
    result = await hass.config_entries.options.async_configure(result["flow_id"], {})
    assert result["type"] == FlowResultType.CREATE_ENTRY, result
    assert entry.options.get("summer_mode_entity", "") == ""
    assert entry.options.get("boiler_switch_entity", "") == ""


async def test_add_and_edit_room_with_empty_optional_entities(hass, setup_ihc):
    trv(hass, "climate.trv_wz")
    coord, hw = await setup_ihc([room()])
    entry = coord.config_entry
    result = await hass.config_entries.options.async_init(entry.entry_id)
    result = await hass.config_entries.options.async_configure(result["flow_id"], {"next_step_id": "add_room"})
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"name": "Bad", "valve_entity": "climate.trv_bad"})
    assert result["type"] == FlowResultType.CREATE_ENTRY, result
    await hass.async_block_till_done()

    result = await hass.config_entries.options.async_init(entry.entry_id)
    result = await hass.config_entries.options.async_configure(result["flow_id"], {"next_step_id": "edit_room"})
    result = await hass.config_entries.options.async_configure(result["flow_id"], {"room_id": "wz"})
    assert result["type"] == FlowResultType.FORM and result["step_id"] == "edit_room_details"
    result = await hass.config_entries.options.async_configure(result["flow_id"], {})
    assert result["type"] == FlowResultType.CREATE_ENTRY, result
