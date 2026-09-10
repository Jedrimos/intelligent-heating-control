# Tests

Plain `pytest`, no Home Assistant test harness required:

```bash
pip install -r requirements-test.txt
pytest
```

## Scope

These tests cover the three modules with **zero Home Assistant dependency** and pure,
easily-isolated logic:

- `heating_curve.py` – outdoor temperature → target temperature interpolation
- `schedule_manager.py` – active/upcoming/next period resolution, overnight ranges
- `heating_controller.py` – the 0–100 % per-room demand formula and its aggregation

`conftest.py` registers lightweight namespace-package stubs for
`custom_components` / `custom_components.intelligent_heating_control` in `sys.modules`
before collection, so the modules above (and their internal `from .const import ...`
relative imports) can be imported directly without triggering the real
`__init__.py` (which imports `homeassistant.*` and would fail without a full HA
install).

## What is *not* covered here

`coordinator.py` and the mixins it inherits from (`room_logic.py`, `trv_controller.py`,
`presence_manager.py`, `window_manager.py`, `energy_manager.py`, `comfort_manager.py`,
`vacation_manager.py`, `climate_adjustments.py`) are tightly coupled to `self.hass`,
`DataUpdateCoordinator`, and HA entity state — testing those meaningfully needs the
`pytest-homeassistant-custom-component` plugin and its fixtures, which is a much
heavier addition. That's a good next step if this suite grows further, but out of
scope for the initial pure-logic coverage added here.
