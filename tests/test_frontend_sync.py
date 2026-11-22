"""Guards against the project's #1 bug pattern (CLAUDE.md Kapitel 9: "changed place A,
forgot place B") between backend attributes and the panel.

v2.6 found 15 room fields the panel used but never mapped from the climate entity -
room settings showed them empty and SAVING wiped them (covers, sleep profile, extra
temperature sensors). These checks fail the build if that happens again.
"""
import re
from pathlib import Path

COMP = Path(__file__).resolve().parent.parent / "custom_components" / "intelligent_heating_control"
SRC = COMP / "frontend" / "src"

# Properties read from objects that are NOT the climate room mapping
NOT_ROOM_FIELDS = {"area_id", "exists", "valves", "windows", "temps", "mins", "time", "length"}


def _js(*names):
    return "".join((SRC / n).read_text(encoding="utf-8") for n in names)


def _all_js():
    return "".join(p.read_text(encoding="utf-8") for p in sorted(SRC.glob("0*.js")))


def _block(text, start_marker, end_marker):
    i = text.index(start_marker)
    return text[i:text.index(end_marker, i + len(start_marker))]


def test_every_room_field_used_by_the_panel_is_mapped():
    utils = _js("02_utils.js")
    mapped = set(re.findall(r"^\s+([a-z_0-9]+)[:,]", _block(utils, "  _getRoomData() {", "  _getGlobal() {"), re.M))
    used = set(re.findall(r"\b(?:room|r)\.([a-z_0-9]+)\b", _all_js()))
    missing = sorted(used - mapped - NOT_ROOM_FIELDS)
    assert not missing, f"panel uses room fields that _getRoomData() never maps: {missing}"


def test_mapped_room_fields_exist_on_the_climate_entity():
    utils = _js("02_utils.js")
    # only the climate-entity part (the rest enriches from the *_anforderung sensors)
    block = _block(utils, "  _getRoomData() {", "// Enrich from demand sensors")
    read = set(re.findall(r"state\.attributes\.([a-z_0-9]+)", block))
    climate = (COMP / "climate.py").read_text(encoding="utf-8")
    attrs = climate[climate.index("def extra_state_attributes"):]
    exposed = set(re.findall(r'"([a-z_0-9]+)":\s', attrs))
    const = (COMP / "const.py").read_text(encoding="utf-8")
    for name in re.findall(r"\b(ATTR_[A-Z_]+):", attrs):
        m = re.search(rf'^{name}: Final = "([a-z_0-9]+)"', const, re.M)
        if m:
            exposed.add(m.group(1))
    # standard ClimateEntity attributes HA adds itself
    exposed |= {"current_temperature", "temperature", "hvac_action", "preset_mode", "friendly_name"}
    missing = sorted(read - exposed)
    assert not missing, f"_getRoomData() reads attributes climate.py never exposes: {missing}"


def test_global_settings_read_by_panel_are_exposed():
    src = _all_js()
    used = set(re.findall(r"\ba\.([a-z_0-9]+)\b", src)) - NOT_ROOM_FIELDS - {"outdoor_temp"}
    sensor = (COMP / "sensor.py").read_text(encoding="utf-8")
    exposed = set(re.findall(r'"([a-z_0-9]+)":\s', sensor))
    missing = sorted(used - exposed)
    assert not missing, f"settings tab reads attributes sensor.py never exposes: {missing}"


def test_global_settings_sent_by_panel_are_accepted():
    src = _all_js()
    init = (COMP / "__init__.py").read_text(encoding="utf-8")
    allowed = set(re.findall(r'"([a-z_0-9]+)"', _block(init, "async def handle_update_global_settings",
                                                        "updates = {k: v for k, v in call.data.items()")))
    sent = set()
    for body in re.findall(r'_callService\("update_global_settings",\s*\{(.*?)\}\);', src, re.S):
        sent |= set(re.findall(r"^\s*([a-z_0-9]+)\s*:", body, re.M))
    missing = sorted(sent - allowed)
    assert not missing, f"panel sends global settings the service silently drops: {missing}"
