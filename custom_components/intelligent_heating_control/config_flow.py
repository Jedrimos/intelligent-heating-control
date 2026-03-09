"""Config flow for Intelligent Heating Control."""
from __future__ import annotations

import logging
import uuid
from typing import Any, Optional

import voluptuous as vol

from homeassistant import config_entries
from homeassistant.core import callback
from homeassistant.helpers import selector

from .const import (
    DOMAIN,
    CONF_OUTDOOR_TEMP_SENSOR,
    CONF_HEATING_SWITCH,
    CONF_COOLING_SWITCH,
    CONF_ENABLE_COOLING,
    CONF_DEMAND_THRESHOLD,
    CONF_DEMAND_HYSTERESIS,
    CONF_MIN_ON_TIME,
    CONF_MIN_OFF_TIME,
    CONF_MIN_ROOMS_DEMAND,
    CONF_AWAY_TEMP,
    CONF_VACATION_TEMP,
    CONF_SUMMER_MODE_ENABLED,
    CONF_SUMMER_THRESHOLD,
    CONF_SHOW_PANEL,
    CONF_HEATING_CURVE,
    CONF_CURVE_POINTS,
    CONF_ROOMS,
    CONF_ROOM_ID,
    CONF_ROOM_NAME,
    CONF_TEMP_SENSOR,
    CONF_VALVE_ENTITY,
    CONF_ROOM_OFFSET,
    CONF_DEADBAND,
    CONF_WEIGHT,
    CONF_COMFORT_TEMP,
    CONF_ECO_TEMP,
    CONF_SLEEP_TEMP,
    CONF_AWAY_TEMP_ROOM,
    CONF_WINDOW_SENSOR,
    CONF_WINDOW_OPEN_TEMP,
    CONF_WINDOW_REACTION_TIME,
    CONF_MIN_TEMP,
    CONF_MAX_TEMP,
    CONF_SCHEDULES,
    DEFAULT_DEMAND_THRESHOLD,
    DEFAULT_DEMAND_HYSTERESIS,
    DEFAULT_MIN_ON_TIME,
    DEFAULT_MIN_OFF_TIME,
    DEFAULT_MIN_ROOMS_DEMAND,
    DEFAULT_DEADBAND,
    DEFAULT_WEIGHT,
    DEFAULT_COMFORT_TEMP,
    DEFAULT_ECO_TEMP,
    DEFAULT_SLEEP_TEMP,
    DEFAULT_AWAY_TEMP_ROOM,
    DEFAULT_AWAY_TEMP,
    DEFAULT_VACATION_TEMP,
    DEFAULT_MIN_TEMP,
    DEFAULT_MAX_TEMP,
    DEFAULT_HEATING_CURVE,
    DEFAULT_WINDOW_OPEN_TEMP,
    DEFAULT_WINDOW_REACTION_TIME,
    DEFAULT_SUMMER_THRESHOLD,
)

_LOGGER = logging.getLogger(__name__)


class IHCConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle the initial setup flow for Intelligent Heating Control."""

    VERSION = 1

    def __init__(self) -> None:
        self._data: dict = {}

    async def async_step_user(
        self, user_input: Optional[dict[str, Any]] = None
    ) -> config_entries.FlowResult:
        """Step 1: Basic settings (outdoor sensor, heating switch)."""
        errors: dict = {}

        if user_input is not None:
            # Validate that the outdoor sensor exists
            outdoor_sensor = user_input.get(CONF_OUTDOOR_TEMP_SENSOR, "")
            if outdoor_sensor and self.hass.states.get(outdoor_sensor) is None:
                errors[CONF_OUTDOOR_TEMP_SENSOR] = "entity_not_found"

            heating_switch = user_input.get(CONF_HEATING_SWITCH, "")
            if heating_switch and self.hass.states.get(heating_switch) is None:
                errors[CONF_HEATING_SWITCH] = "entity_not_found"

            enable_cooling = user_input.get(CONF_ENABLE_COOLING, False)
            if enable_cooling:
                cooling_switch = user_input.get(CONF_COOLING_SWITCH, "")
                if not cooling_switch:
                    errors[CONF_COOLING_SWITCH] = "entity_not_found"
                elif self.hass.states.get(cooling_switch) is None:
                    errors[CONF_COOLING_SWITCH] = "entity_not_found"
            else:
                user_input[CONF_COOLING_SWITCH] = ""

            if not errors:
                self._data.update(user_input)
                return await self.async_step_controller()

        enable_cooling_current = (user_input or {}).get(CONF_ENABLE_COOLING, False)
        schema_dict: dict = {
            vol.Optional(CONF_OUTDOOR_TEMP_SENSOR, default=""): selector.selector({
                "entity": {"domain": "sensor"}
            }),
            vol.Optional(CONF_HEATING_SWITCH, default=""): selector.selector({
                "entity": {"domain": ["switch", "input_boolean"]}
            }),
            vol.Optional(CONF_ENABLE_COOLING, default=False): selector.selector({
                "boolean": {}
            }),
        }
        if enable_cooling_current:
            schema_dict[vol.Optional(CONF_COOLING_SWITCH, default=(user_input or {}).get(CONF_COOLING_SWITCH, ""))] = selector.selector({
                "entity": {"domain": ["switch", "input_boolean"]}
            })
        schema = vol.Schema(schema_dict)

        return self.async_show_form(
            step_id="user",
            data_schema=schema,
            errors=errors,
            description_placeholders={},
        )

    async def async_step_controller(
        self, user_input: Optional[dict[str, Any]] = None
    ) -> config_entries.FlowResult:
        """Step 2: Klimabaustein / controller settings."""
        if user_input is not None:
            self._data.update(user_input)
            return await self.async_step_temperatures()

        schema = vol.Schema({
            vol.Optional(CONF_DEMAND_THRESHOLD, default=DEFAULT_DEMAND_THRESHOLD): selector.selector({
                "number": {"min": 1, "max": 100, "step": 1, "unit_of_measurement": "%", "mode": "slider"}
            }),
            vol.Optional(CONF_DEMAND_HYSTERESIS, default=DEFAULT_DEMAND_HYSTERESIS): selector.selector({
                "number": {"min": 1, "max": 30, "step": 1, "unit_of_measurement": "%", "mode": "slider"}
            }),
            vol.Optional(CONF_MIN_ON_TIME, default=DEFAULT_MIN_ON_TIME): selector.selector({
                "number": {"min": 1, "max": 60, "step": 1, "unit_of_measurement": "min", "mode": "box"}
            }),
            vol.Optional(CONF_MIN_OFF_TIME, default=DEFAULT_MIN_OFF_TIME): selector.selector({
                "number": {"min": 1, "max": 60, "step": 1, "unit_of_measurement": "min", "mode": "box"}
            }),
            vol.Optional(CONF_MIN_ROOMS_DEMAND, default=DEFAULT_MIN_ROOMS_DEMAND): selector.selector({
                "number": {"min": 1, "max": 20, "step": 1, "mode": "box"}
            }),
        })

        return self.async_show_form(
            step_id="controller",
            data_schema=schema,
        )

    async def async_step_temperatures(
        self, user_input: Optional[dict[str, Any]] = None
    ) -> config_entries.FlowResult:
        """Step 3: Global temperature settings (away, vacation)."""
        if user_input is not None:
            self._data.update(user_input)
            # Add default heating curve and empty rooms list
            self._data[CONF_HEATING_CURVE] = {CONF_CURVE_POINTS: DEFAULT_HEATING_CURVE}
            self._data[CONF_ROOMS] = []
            return self.async_create_entry(
                title="Intelligent Heating Control",
                data=self._data,
            )

        schema = vol.Schema({
            vol.Optional(CONF_AWAY_TEMP, default=DEFAULT_AWAY_TEMP): selector.selector({
                "number": {"min": 5, "max": 30, "step": 0.5, "unit_of_measurement": "°C", "mode": "box"}
            }),
            vol.Optional(CONF_VACATION_TEMP, default=DEFAULT_VACATION_TEMP): selector.selector({
                "number": {"min": 5, "max": 25, "step": 0.5, "unit_of_measurement": "°C", "mode": "box"}
            }),
        })

        return self.async_show_form(
            step_id="temperatures",
            data_schema=schema,
        )

    @staticmethod
    @callback
    def async_get_options_flow(config_entry):
        return IHCOptionsFlow(config_entry)


class IHCOptionsFlow(config_entries.OptionsFlow):
    """Handle options flow - manage rooms, heating curve, schedules."""

    def __init__(self, config_entry: config_entries.ConfigEntry) -> None:
        self._config_entry = config_entry
        self._options = dict(config_entry.options)
        self._selected_room_id: Optional[str] = None

    async def async_step_init(
        self, user_input: Optional[dict[str, Any]] = None
    ) -> config_entries.FlowResult:
        """Main options menu."""
        return self.async_show_menu(
            step_id="init",
            menu_options=[
                "global_settings",
                "heating_curve",
                "add_room",
                "edit_room",
                "remove_room",
            ],
        )

    # ------------------------------------------------------------------
    # Global settings
    # ------------------------------------------------------------------

    async def async_step_global_settings(
        self, user_input: Optional[dict[str, Any]] = None
    ) -> config_entries.FlowResult:
        cfg = dict(self._config_entry.data)
        cfg.update(self._options)
        errors: dict = {}

        if user_input is not None:
            enable_cooling = user_input.get(CONF_ENABLE_COOLING, False)
            if enable_cooling:
                cooling_switch = user_input.get(CONF_COOLING_SWITCH, "")
                if not cooling_switch:
                    errors[CONF_COOLING_SWITCH] = "entity_not_found"
                elif self.hass.states.get(cooling_switch) is None:
                    errors[CONF_COOLING_SWITCH] = "entity_not_found"
            else:
                user_input[CONF_COOLING_SWITCH] = ""

            if not errors:
                self._options.update(user_input)
                return self.async_create_entry(title="", data=self._options)

        enable_cooling_current = (user_input or cfg).get(CONF_ENABLE_COOLING, False)
        schema_dict: dict = {
            vol.Optional(
                CONF_OUTDOOR_TEMP_SENSOR,
                default=cfg.get(CONF_OUTDOOR_TEMP_SENSOR, "")
            ): selector.selector({"entity": {"domain": "sensor"}}),
            vol.Optional(
                CONF_HEATING_SWITCH,
                default=cfg.get(CONF_HEATING_SWITCH, "")
            ): selector.selector({"entity": {"domain": ["switch", "input_boolean"]}}),
            vol.Optional(
                CONF_ENABLE_COOLING,
                default=bool(enable_cooling_current)
            ): selector.selector({"boolean": {}}),
        }
        if enable_cooling_current:
            cooling_default = (user_input or cfg).get(CONF_COOLING_SWITCH, "")
            schema_dict[vol.Optional(CONF_COOLING_SWITCH, default=cooling_default)] = selector.selector(
                {"entity": {"domain": ["switch", "input_boolean"]}}
            )
        schema_dict.update({
            vol.Optional(
                CONF_DEMAND_THRESHOLD,
                default=float(cfg.get(CONF_DEMAND_THRESHOLD, DEFAULT_DEMAND_THRESHOLD))
            ): selector.selector({
                "number": {"min": 1, "max": 100, "step": 1, "unit_of_measurement": "%", "mode": "slider"}
            }),
            vol.Optional(
                CONF_DEMAND_HYSTERESIS,
                default=float(cfg.get(CONF_DEMAND_HYSTERESIS, DEFAULT_DEMAND_HYSTERESIS))
            ): selector.selector({
                "number": {"min": 1, "max": 30, "step": 1, "unit_of_measurement": "%", "mode": "slider"}
            }),
            vol.Optional(
                CONF_MIN_ON_TIME,
                default=int(cfg.get(CONF_MIN_ON_TIME, DEFAULT_MIN_ON_TIME))
            ): selector.selector({
                "number": {"min": 1, "max": 60, "step": 1, "unit_of_measurement": "min", "mode": "box"}
            }),
            vol.Optional(
                CONF_MIN_OFF_TIME,
                default=int(cfg.get(CONF_MIN_OFF_TIME, DEFAULT_MIN_OFF_TIME))
            ): selector.selector({
                "number": {"min": 1, "max": 60, "step": 1, "unit_of_measurement": "min", "mode": "box"}
            }),
            vol.Optional(
                CONF_MIN_ROOMS_DEMAND,
                default=int(cfg.get(CONF_MIN_ROOMS_DEMAND, DEFAULT_MIN_ROOMS_DEMAND))
            ): selector.selector({
                "number": {"min": 1, "max": 20, "step": 1, "mode": "box"}
            }),
            vol.Optional(
                CONF_AWAY_TEMP,
                default=float(cfg.get(CONF_AWAY_TEMP, DEFAULT_AWAY_TEMP))
            ): selector.selector({
                "number": {"min": 5, "max": 30, "step": 0.5, "unit_of_measurement": "°C", "mode": "box"}
            }),
            vol.Optional(
                CONF_VACATION_TEMP,
                default=float(cfg.get(CONF_VACATION_TEMP, DEFAULT_VACATION_TEMP))
            ): selector.selector({
                "number": {"min": 5, "max": 25, "step": 0.5, "unit_of_measurement": "°C", "mode": "box"}
            }),
            vol.Optional(
                CONF_SUMMER_MODE_ENABLED,
                default=bool(cfg.get(CONF_SUMMER_MODE_ENABLED, False))
            ): selector.selector({"boolean": {}}),
            vol.Optional(
                CONF_SUMMER_THRESHOLD,
                default=float(cfg.get(CONF_SUMMER_THRESHOLD, DEFAULT_SUMMER_THRESHOLD))
            ): selector.selector({
                "number": {"min": 10, "max": 30, "step": 0.5, "unit_of_measurement": "°C", "mode": "box"}
            }),
            vol.Optional(
                CONF_SHOW_PANEL,
                default=bool(cfg.get(CONF_SHOW_PANEL, True))
            ): selector.selector({"boolean": {}}),
        })
        return self.async_show_form(step_id="global_settings", data_schema=vol.Schema(schema_dict), errors=errors)

    # ------------------------------------------------------------------
    # Heating curve editor
    # ------------------------------------------------------------------

    async def async_step_heating_curve(
        self, user_input: Optional[dict[str, Any]] = None
    ) -> config_entries.FlowResult:
        """Edit the heating curve as a text field (JSON-like)."""
        cfg = dict(self._config_entry.data)
        cfg.update(self._options)
        current_curve = cfg.get(CONF_HEATING_CURVE, {}).get(CONF_CURVE_POINTS, DEFAULT_HEATING_CURVE)
        errors: dict = {}

        if user_input is not None:
            # Parse the curve from individual fields
            try:
                points = []
                for i in range(7):
                    ot_key = f"outdoor_{i}"
                    tt_key = f"target_{i}"
                    if ot_key in user_input and tt_key in user_input:
                        points.append({
                            "outdoor_temp": float(user_input[ot_key]),
                            "target_temp": float(user_input[tt_key]),
                        })
                points = sorted(points, key=lambda p: p["outdoor_temp"])
                self._options[CONF_HEATING_CURVE] = {CONF_CURVE_POINTS: points}
                return self.async_create_entry(title="", data=self._options)
            except (ValueError, KeyError) as e:
                errors["base"] = "invalid_curve"

        # Build form with 7 curve point rows
        schema_dict = {}
        for i, pt in enumerate(current_curve[:7]):
            schema_dict[vol.Optional(f"outdoor_{i}", default=float(pt["outdoor_temp"]))] = (
                selector.selector({"number": {"min": -30, "max": 40, "step": 0.5, "unit_of_measurement": "°C", "mode": "box"}})
            )
            schema_dict[vol.Optional(f"target_{i}", default=float(pt["target_temp"]))] = (
                selector.selector({"number": {"min": 10, "max": 30, "step": 0.5, "unit_of_measurement": "°C", "mode": "box"}})
            )

        return self.async_show_form(
            step_id="heating_curve",
            data_schema=vol.Schema(schema_dict),
            errors=errors,
        )

    # ------------------------------------------------------------------
    # Room management
    # ------------------------------------------------------------------

    async def async_step_add_room(
        self, user_input: Optional[dict[str, Any]] = None
    ) -> config_entries.FlowResult:
        """Add a new room."""
        errors: dict = {}
        if user_input is not None:
            temp_sensor = user_input.get(CONF_TEMP_SENSOR, "")
            if temp_sensor and self.hass.states.get(temp_sensor) is None:
                errors[CONF_TEMP_SENSOR] = "entity_not_found"

            if not errors:
                new_room = {
                    CONF_ROOM_ID: str(uuid.uuid4())[:8],
                    CONF_ROOM_NAME: user_input[CONF_ROOM_NAME],
                    CONF_TEMP_SENSOR: user_input.get(CONF_TEMP_SENSOR, ""),
                    CONF_VALVE_ENTITY: user_input.get(CONF_VALVE_ENTITY, ""),
                    CONF_ROOM_OFFSET: float(user_input.get(CONF_ROOM_OFFSET, 0.0)),
                    CONF_DEADBAND: float(user_input.get(CONF_DEADBAND, DEFAULT_DEADBAND)),
                    CONF_WEIGHT: float(user_input.get(CONF_WEIGHT, DEFAULT_WEIGHT)),
                    CONF_COMFORT_TEMP: float(user_input.get(CONF_COMFORT_TEMP, DEFAULT_COMFORT_TEMP)),
                    CONF_ECO_TEMP: float(user_input.get(CONF_ECO_TEMP, DEFAULT_ECO_TEMP)),
                    CONF_SLEEP_TEMP: float(user_input.get(CONF_SLEEP_TEMP, DEFAULT_SLEEP_TEMP)),
                    CONF_AWAY_TEMP_ROOM: float(user_input.get(CONF_AWAY_TEMP_ROOM, DEFAULT_AWAY_TEMP_ROOM)),
                    CONF_WINDOW_SENSOR: user_input.get(CONF_WINDOW_SENSOR, ""),
                    CONF_MIN_TEMP: float(user_input.get(CONF_MIN_TEMP, DEFAULT_MIN_TEMP)),
                    CONF_MAX_TEMP: float(user_input.get(CONF_MAX_TEMP, DEFAULT_MAX_TEMP)),
                    CONF_SCHEDULES: [],
                }
                rooms = list(self._options.get(CONF_ROOMS, []))
                rooms.append(new_room)
                self._options[CONF_ROOMS] = rooms
                return self.async_create_entry(title="", data=self._options)

        schema = vol.Schema({
            vol.Required(CONF_ROOM_NAME): str,
            vol.Optional(CONF_TEMP_SENSOR, default=""): selector.selector({
                "entity": {"domain": "sensor"}
            }),
            vol.Optional(CONF_VALVE_ENTITY, default=""): selector.selector({
                "entity": {"domain": "climate"}
            }),
            vol.Optional(CONF_WINDOW_SENSOR, default=""): selector.selector({
                "entity": {"domain": "binary_sensor"}
            }),
            vol.Optional(CONF_ROOM_OFFSET, default=0.0): selector.selector({
                "number": {"min": -5, "max": 5, "step": 0.5, "unit_of_measurement": "°C", "mode": "slider"}
            }),
            vol.Optional(CONF_DEADBAND, default=DEFAULT_DEADBAND): selector.selector({
                "number": {"min": 0.1, "max": 2.0, "step": 0.1, "unit_of_measurement": "°C", "mode": "box"}
            }),
            vol.Optional(CONF_WEIGHT, default=DEFAULT_WEIGHT): selector.selector({
                "number": {"min": 0.1, "max": 5.0, "step": 0.1, "mode": "box"}
            }),
            vol.Optional(CONF_COMFORT_TEMP, default=DEFAULT_COMFORT_TEMP): selector.selector({
                "number": {"min": 15, "max": 30, "step": 0.5, "unit_of_measurement": "°C", "mode": "box"}
            }),
            vol.Optional(CONF_ECO_TEMP, default=DEFAULT_ECO_TEMP): selector.selector({
                "number": {"min": 10, "max": 25, "step": 0.5, "unit_of_measurement": "°C", "mode": "box"}
            }),
            vol.Optional(CONF_SLEEP_TEMP, default=DEFAULT_SLEEP_TEMP): selector.selector({
                "number": {"min": 10, "max": 25, "step": 0.5, "unit_of_measurement": "°C", "mode": "box"}
            }),
            vol.Optional(CONF_AWAY_TEMP_ROOM, default=DEFAULT_AWAY_TEMP_ROOM): selector.selector({
                "number": {"min": 5, "max": 20, "step": 0.5, "unit_of_measurement": "°C", "mode": "box"}
            }),
            vol.Optional(CONF_MIN_TEMP, default=DEFAULT_MIN_TEMP): selector.selector({
                "number": {"min": 5, "max": 15, "step": 0.5, "unit_of_measurement": "°C", "mode": "box"}
            }),
            vol.Optional(CONF_MAX_TEMP, default=DEFAULT_MAX_TEMP): selector.selector({
                "number": {"min": 20, "max": 35, "step": 0.5, "unit_of_measurement": "°C", "mode": "box"}
            }),
        })
        return self.async_show_form(
            step_id="add_room",
            data_schema=schema,
            errors=errors,
        )

    async def async_step_edit_room(
        self, user_input: Optional[dict[str, Any]] = None
    ) -> config_entries.FlowResult:
        """Select which room to edit."""
        rooms = self._options.get(CONF_ROOMS, [])
        if not rooms:
            return self.async_abort(reason="no_rooms")

        room_options = {r[CONF_ROOM_ID]: r.get(CONF_ROOM_NAME, r[CONF_ROOM_ID]) for r in rooms}

        if user_input is not None:
            self._selected_room_id = user_input["room_id"]
            return await self.async_step_edit_room_details()

        schema = vol.Schema({
            vol.Required("room_id"): vol.In(room_options)
        })
        return self.async_show_form(step_id="edit_room", data_schema=schema)

    async def async_step_edit_room_details(
        self, user_input: Optional[dict[str, Any]] = None
    ) -> config_entries.FlowResult:
        """Edit the selected room's details."""
        rooms = list(self._options.get(CONF_ROOMS, []))
        room = next((r for r in rooms if r[CONF_ROOM_ID] == self._selected_room_id), None)
        if room is None:
            return self.async_abort(reason="room_not_found")

        if user_input is not None:
            updated_room = {**room, **user_input}
            for i, r in enumerate(rooms):
                if r[CONF_ROOM_ID] == self._selected_room_id:
                    rooms[i] = updated_room
                    break
            self._options[CONF_ROOMS] = rooms
            return self.async_create_entry(title="", data=self._options)

        schema = vol.Schema({
            vol.Optional(CONF_ROOM_NAME, default=room.get(CONF_ROOM_NAME, "")): str,
            vol.Optional(CONF_TEMP_SENSOR, default=room.get(CONF_TEMP_SENSOR, "")): selector.selector({
                "entity": {"domain": "sensor"}
            }),
            vol.Optional(CONF_VALVE_ENTITY, default=room.get(CONF_VALVE_ENTITY, "")): selector.selector({
                "entity": {"domain": "climate"}
            }),
            vol.Optional(CONF_WINDOW_SENSOR, default=room.get(CONF_WINDOW_SENSOR, "")): selector.selector({
                "entity": {"domain": "binary_sensor"}
            }),
            vol.Optional(CONF_ROOM_OFFSET, default=float(room.get(CONF_ROOM_OFFSET, 0.0))): selector.selector({
                "number": {"min": -5, "max": 5, "step": 0.5, "unit_of_measurement": "°C", "mode": "slider"}
            }),
            vol.Optional(CONF_DEADBAND, default=float(room.get(CONF_DEADBAND, DEFAULT_DEADBAND))): selector.selector({
                "number": {"min": 0.1, "max": 2.0, "step": 0.1, "unit_of_measurement": "°C", "mode": "box"}
            }),
            vol.Optional(CONF_WEIGHT, default=float(room.get(CONF_WEIGHT, DEFAULT_WEIGHT))): selector.selector({
                "number": {"min": 0.1, "max": 5.0, "step": 0.1, "mode": "box"}
            }),
            vol.Optional(CONF_COMFORT_TEMP, default=float(room.get(CONF_COMFORT_TEMP, DEFAULT_COMFORT_TEMP))): selector.selector({
                "number": {"min": 15, "max": 30, "step": 0.5, "unit_of_measurement": "°C", "mode": "box"}
            }),
            vol.Optional(CONF_ECO_TEMP, default=float(room.get(CONF_ECO_TEMP, DEFAULT_ECO_TEMP))): selector.selector({
                "number": {"min": 10, "max": 25, "step": 0.5, "unit_of_measurement": "°C", "mode": "box"}
            }),
            vol.Optional(CONF_SLEEP_TEMP, default=float(room.get(CONF_SLEEP_TEMP, DEFAULT_SLEEP_TEMP))): selector.selector({
                "number": {"min": 10, "max": 25, "step": 0.5, "unit_of_measurement": "°C", "mode": "box"}
            }),
            vol.Optional(CONF_AWAY_TEMP_ROOM, default=float(room.get(CONF_AWAY_TEMP_ROOM, DEFAULT_AWAY_TEMP_ROOM))): selector.selector({
                "number": {"min": 5, "max": 20, "step": 0.5, "unit_of_measurement": "°C", "mode": "box"}
            }),
            vol.Optional(CONF_MIN_TEMP, default=float(room.get(CONF_MIN_TEMP, DEFAULT_MIN_TEMP))): selector.selector({
                "number": {"min": 5, "max": 15, "step": 0.5, "unit_of_measurement": "°C", "mode": "box"}
            }),
            vol.Optional(CONF_MAX_TEMP, default=float(room.get(CONF_MAX_TEMP, DEFAULT_MAX_TEMP))): selector.selector({
                "number": {"min": 20, "max": 35, "step": 0.5, "unit_of_measurement": "°C", "mode": "box"}
            }),
        })
        return self.async_show_form(step_id="edit_room_details", data_schema=schema)

    async def async_step_remove_room(
        self, user_input: Optional[dict[str, Any]] = None
    ) -> config_entries.FlowResult:
        """Remove a room."""
        rooms = self._options.get(CONF_ROOMS, [])
        if not rooms:
            return self.async_abort(reason="no_rooms")

        room_options = {r[CONF_ROOM_ID]: r.get(CONF_ROOM_NAME, r[CONF_ROOM_ID]) for r in rooms}

        if user_input is not None:
            room_id = user_input["room_id"]
            self._options[CONF_ROOMS] = [r for r in rooms if r[CONF_ROOM_ID] != room_id]
            return self.async_create_entry(title="", data=self._options)

        schema = vol.Schema({
            vol.Required("room_id"): vol.In(room_options)
        })
        return self.async_show_form(step_id="remove_room", data_schema=schema)
