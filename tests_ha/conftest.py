"""End-to-end tests that run the integration inside a real Home Assistant core
(pytest-homeassistant-custom-component). Run with:  pytest tests_ha

Each test builds a config entry, fakes the sensor/thermostat states, runs real
coordinator cycles and asserts the service calls IHC sends to the hardware
(climate.set_temperature, cover.set_cover_position, ...).
"""
from __future__ import annotations

import sys
import types
from pathlib import Path

import pytest

# pytest-homeassistant-custom-component puts its own testing_config/custom_components on
# the path first; point the `custom_components` package at this repository instead.
_REPO_CC = Path(__file__).resolve().parent.parent / "custom_components"
_cc = types.ModuleType("custom_components")
_cc.__path__ = [str(_REPO_CC)]
sys.modules["custom_components"] = _cc
from homeassistant.core import HomeAssistant, ServiceCall, SupportsResponse, callback
from pytest_homeassistant_custom_component.common import MockConfigEntry

DOMAIN = "intelligent_heating_control"


@pytest.fixture(autouse=True)
def auto_enable_custom_integrations(enable_custom_integrations):
    yield


class Hw:
    """Records every hardware command IHC sends."""

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass
        self.calls: list[tuple[str, str, dict]] = []
        self.forecast: dict[str, list] = {}
        self.register()

    def register(self) -> None:
        """(Re-)register the fake services. Must run again after IHC set up its climate
        platform - HA's climate component then registers the real climate.* services."""
        hass = self.hass
        for domain, service in [
            ("climate", "set_temperature"), ("climate", "set_hvac_mode"),
            ("climate", "set_preset_mode"), ("cover", "set_cover_position"),
            ("switch", "turn_on"), ("switch", "turn_off"),
            ("persistent_notification", "create"), ("persistent_notification", "dismiss"),
            ("notify", "notify"),
        ]:
            hass.services.async_register(domain, service, self._record(domain, service))

        async def _forecasts(call: ServiceCall):
            ents = call.data["entity_id"]
            ents = [ents] if isinstance(ents, str) else ents
            if call.data.get("type") != "daily":
                raise ValueError("only daily in tests")
            return {e: {"forecast": self.forecast.get(e, [])} for e in ents}

        hass.services.async_register("weather", "get_forecasts", _forecasts,
                                     supports_response=SupportsResponse.ONLY)

    def _record(self, domain, service):
        @callback
        def _h(call: ServiceCall) -> None:
            self.calls.append((domain, service, dict(call.data)))
            # Mirror the command into the fake entity so IHC sees the TRV "confirm" it
            eid = call.data.get("entity_id")
            if isinstance(eid, str) and domain == "climate":
                st = self.hass.states.get(eid)
                if st is not None:
                    attrs = dict(st.attributes)
                    state = st.state
                    if service == "set_temperature":
                        attrs["temperature"] = call.data["temperature"]
                    elif service == "set_hvac_mode":
                        state = call.data["hvac_mode"]
                    self.hass.states.async_set(eid, state, attrs)
            if isinstance(eid, str) and domain == "cover":
                st = self.hass.states.get(eid)
                if st is not None:
                    attrs = dict(st.attributes, current_position=call.data["position"])
                    self.hass.states.async_set(eid, "open" if call.data["position"] > 0 else "closed", attrs)
        return _h

    def clear(self):
        self.calls.clear()

    def of(self, domain, service, entity_id=None):
        return [c[2] for c in self.calls
                if c[0] == domain and c[1] == service and (entity_id is None or c[2].get("entity_id") == entity_id)]

    def last_temp(self, entity_id):
        temps = self.of("climate", "set_temperature", entity_id)
        return temps[-1]["temperature"] if temps else None


def trv(hass, eid, current=19.0, target=20.0, mode="heat", **extra):
    hass.states.async_set(eid, mode, {
        "current_temperature": current, "temperature": target,
        "hvac_modes": ["off", "heat"], "min_temp": 5, "max_temp": 30,
        "preset_modes": [], **extra,
    })


def temp_sensor(hass, eid, value):
    hass.states.async_set(eid, str(value), {"device_class": "temperature", "unit_of_measurement": "°C"})


def room(room_id="wz", name="Wohnzimmer", **cfg):
    base = {
        "id": room_id, "name": name,
        "valve_entities": [f"climate.trv_{room_id}"], "valve_entity": f"climate.trv_{room_id}",
        "temp_sensor": "", "window_sensors": [], "comfort_temp": 21.0,
    }
    base.update(cfg)
    return base


@pytest.fixture
async def setup_ihc(hass: HomeAssistant):
    """Factory: await setup_ihc(rooms=[...], **global_options) -> (coordinator, hw)."""
    created = {}

    async def _setup(rooms, **options):
        hw = created.get("hw") or Hw(hass)
        created["hw"] = hw
        await hass.config.async_set_time_zone("Europe/Berlin")
        opts = {"show_panel": False, "startup_grace_seconds": 0, "rooms": rooms}
        opts.update(options)
        entry = MockConfigEntry(domain=DOMAIN, data={"outdoor_temp_sensor": options.get("outdoor_temp_sensor", "")}, options=opts)
        entry.add_to_hass(hass)
        assert await hass.config_entries.async_setup(entry.entry_id)
        await hass.async_block_till_done()
        hw.register()
        coordinator = hass.data[DOMAIN][entry.entry_id]
        created["entry"] = entry
        return coordinator, hw

    yield _setup
    if "entry" in created:
        await hass.config_entries.async_unload(created["entry"].entry_id)
        await hass.async_block_till_done()


async def cycle(hass, coordinator, n=1):
    for _ in range(n):
        await coordinator.async_refresh()
        await hass.async_block_till_done()
