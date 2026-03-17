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
    CONF_PRESENCE_ENTITIES,
    CONF_FROST_PROTECTION_TEMP,
    CONF_OFF_USE_FROST_PROTECTION,
    CONF_NIGHT_SETBACK_ENABLED,
    CONF_NIGHT_SETBACK_OFFSET,
    CONF_SUN_ENTITY,
    CONF_PREHEAT_MINUTES,
    CONF_BOILER_KW,
    CONF_SOLAR_ENTITY,
    CONF_SOLAR_SURPLUS_THRESHOLD,
    CONF_SOLAR_BOOST_TEMP,
    CONF_ENERGY_PRICE_ENTITY,
    CONF_ENERGY_PRICE_THRESHOLD,
    CONF_ENERGY_PRICE_ECO_OFFSET,
    CONF_FLOW_TEMP_ENTITY,
    DEFAULT_BOILER_KW,
    DEFAULT_SOLAR_SURPLUS_THRESHOLD,
    DEFAULT_SOLAR_BOOST_TEMP,
    DEFAULT_ENERGY_PRICE_THRESHOLD,
    DEFAULT_ENERGY_PRICE_ECO_OFFSET,
    CONF_HEATING_CURVE,
    CONF_CURVE_POINTS,
    CONF_ROOMS,
    CONF_ROOM_ID,
    CONF_ROOM_NAME,
    CONF_TEMP_SENSOR,
    CONF_VALVE_ENTITY,
    CONF_VALVE_ENTITIES,
    CONF_WINDOW_SENSORS,
    CONF_ROOM_OFFSET,
    CONF_DEADBAND,
    CONF_WEIGHT,
    CONF_COMFORT_TEMP,
    CONF_AWAY_TEMP_ROOM,
    CONF_ECO_OFFSET,
    CONF_SLEEP_OFFSET,
    CONF_AWAY_OFFSET,
    CONF_ECO_MAX_TEMP,
    CONF_SLEEP_MAX_TEMP,
    CONF_AWAY_MAX_TEMP,
    CONF_WINDOW_SENSOR,
    CONF_WINDOW_REACTION_TIME,
    CONF_WINDOW_CLOSE_DELAY,
    CONF_MIN_TEMP,
    CONF_MAX_TEMP,
    CONF_SCHEDULES,
    CONF_ABSOLUTE_MIN_TEMP,
    CONF_ROOM_QM,
    CONF_ROOM_PREHEAT_MINUTES,
    # Room-level features
    CONF_HUMIDITY_SENSOR,
    CONF_MOLD_PROTECTION_ENABLED,
    CONF_MOLD_HUMIDITY_THRESHOLD,
    CONF_CO2_SENSOR,
    CONF_CO2_THRESHOLD_GOOD,
    CONF_CO2_THRESHOLD_BAD,
    CONF_RADIATOR_KW,
    CONF_HKV_SENSOR,
    CONF_HKV_FACTOR,
    CONF_HA_SCHEDULE_OFF_MODE,
    CONF_BOOST_TEMP,
    CONF_BOOST_DEFAULT_DURATION,
    CONF_ROOM_PRESENCE_ENTITIES,
    CONF_TRV_TEMP_WEIGHT,
    CONF_TRV_TEMP_OFFSET,
    CONF_TRV_VALVE_DEMAND,
    CONF_TRV_MIN_SEND_INTERVAL,
    # Global advanced settings missing from original flow
    CONF_CONTROLLER_MODE,
    CONF_WEATHER_ENTITY,
    CONF_WEATHER_COLD_THRESHOLD,
    CONF_WEATHER_COLD_BOOST,
    CONF_SMART_METER_ENTITY,
    CONF_FLOW_TEMP_SENSOR,
    CONF_COOLING_TARGET_TEMP,
    CONF_OUTDOOR_HUMIDITY_SENSOR,
    CONF_VENTILATION_ADVICE_ENABLED,
    CONF_ADAPTIVE_CURVE_ENABLED,
    CONF_ADAPTIVE_PREHEAT_ENABLED,
    CONF_ETA_PREHEAT_ENABLED,
    CONF_VACATION_CALENDAR,
    CONF_VACATION_CALENDAR_KEYWORD,
    DEFAULT_DEMAND_THRESHOLD,
    DEFAULT_DEMAND_HYSTERESIS,
    DEFAULT_MIN_ON_TIME,
    DEFAULT_MIN_OFF_TIME,
    DEFAULT_MIN_ROOMS_DEMAND,
    DEFAULT_DEADBAND,
    DEFAULT_WEIGHT,
    DEFAULT_COMFORT_TEMP,
    DEFAULT_AWAY_TEMP_ROOM,
    DEFAULT_AWAY_TEMP,
    DEFAULT_VACATION_TEMP,
    DEFAULT_MIN_TEMP,
    DEFAULT_MAX_TEMP,
    DEFAULT_HEATING_CURVE,
    DEFAULT_WINDOW_REACTION_TIME,
    DEFAULT_WINDOW_CLOSE_DELAY,
    DEFAULT_ABSOLUTE_MIN_TEMP,
    DEFAULT_ROOM_QM,
    DEFAULT_ROOM_PREHEAT_MINUTES,
    DEFAULT_MOLD_HUMIDITY_THRESHOLD,
    DEFAULT_MOLD_PROTECTION_ENABLED,
    DEFAULT_CO2_THRESHOLD_GOOD,
    DEFAULT_CO2_THRESHOLD_BAD,
    DEFAULT_RADIATOR_KW,
    DEFAULT_HKV_FACTOR,
    DEFAULT_HA_SCHEDULE_OFF_MODE,
    DEFAULT_BOOST_DEFAULT_DURATION,
    DEFAULT_TRV_TEMP_WEIGHT,
    DEFAULT_TRV_TEMP_OFFSET,
    DEFAULT_TRV_VALVE_DEMAND,
    DEFAULT_TRV_MIN_SEND_INTERVAL,
    DEFAULT_SUMMER_THRESHOLD,
    DEFAULT_CONTROLLER_MODE,
    DEFAULT_WEATHER_COLD_THRESHOLD,
    DEFAULT_WEATHER_COLD_BOOST,
    DEFAULT_COOLING_TARGET_TEMP,
    DEFAULT_ADAPTIVE_CURVE_ENABLED,
    DEFAULT_ADAPTIVE_PREHEAT_ENABLED,
    DEFAULT_ETA_PREHEAT_ENABLED,
    DEFAULT_VACATION_CALENDAR_KEYWORD,
    DEFAULT_VENTILATION_ADVICE_ENABLED,
    DEFAULT_FROST_PROTECTION_TEMP,
    DEFAULT_OFF_USE_FROST_PROTECTION,
    DEFAULT_NIGHT_SETBACK_OFFSET,
    DEFAULT_PREHEAT_MINUTES,
    DEFAULT_ECO_OFFSET,
    DEFAULT_SLEEP_OFFSET,
    DEFAULT_AWAY_OFFSET,
    DEFAULT_ECO_MAX_TEMP,
    DEFAULT_SLEEP_MAX_TEMP,
    DEFAULT_AWAY_MAX_TEMP,
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
                "text": {}
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
            if not user_input.get(CONF_ENABLE_COOLING, False):
                user_input[CONF_COOLING_SWITCH] = ""

            if not errors:
                self._options.update(user_input)
                return self.async_create_entry(title="", data=self._options)

        enable_cooling_current = (user_input or cfg).get(CONF_ENABLE_COOLING, False)
        schema_dict: dict = {
            vol.Optional(
                CONF_OUTDOOR_TEMP_SENSOR,
                default=cfg.get(CONF_OUTDOOR_TEMP_SENSOR, "")
            ): selector.selector({"text": {}}),
            vol.Optional(
                CONF_HEATING_SWITCH,
                default=cfg.get(CONF_HEATING_SWITCH, "")
            ): selector.selector({"text": {}}),
            vol.Optional(
                CONF_ENABLE_COOLING,
                default=bool(enable_cooling_current)
            ): selector.selector({"boolean": {}}),
        }
        if enable_cooling_current:
            cooling_default = (user_input or cfg).get(CONF_COOLING_SWITCH, "")
            schema_dict[vol.Optional(CONF_COOLING_SWITCH, default=cooling_default)] = selector.selector(
                {"text": {}}
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
            # --- Presence detection ---
            vol.Optional(
                CONF_PRESENCE_ENTITIES,
                default=list(cfg.get(CONF_PRESENCE_ENTITIES, []))
            ): selector.selector({
                "entity": {"domain": ["person", "device_tracker", "input_boolean"], "multiple": True}
            }),
            # --- Frost protection ---
            vol.Optional(
                CONF_FROST_PROTECTION_TEMP,
                default=float(cfg.get(CONF_FROST_PROTECTION_TEMP, DEFAULT_FROST_PROTECTION_TEMP))
            ): selector.selector({
                "number": {"min": 4, "max": 15, "step": 0.5, "unit_of_measurement": "°C", "mode": "box"}
            }),
            vol.Optional(
                CONF_OFF_USE_FROST_PROTECTION,
                default=bool(cfg.get(CONF_OFF_USE_FROST_PROTECTION, DEFAULT_OFF_USE_FROST_PROTECTION))
            ): selector.selector({"boolean": {}}),
            # --- Night setback ---
            vol.Optional(
                CONF_NIGHT_SETBACK_ENABLED,
                default=bool(cfg.get(CONF_NIGHT_SETBACK_ENABLED, False))
            ): selector.selector({"boolean": {}}),
            vol.Optional(
                CONF_NIGHT_SETBACK_OFFSET,
                default=float(cfg.get(CONF_NIGHT_SETBACK_OFFSET, DEFAULT_NIGHT_SETBACK_OFFSET))
            ): selector.selector({
                "number": {"min": 0.5, "max": 6, "step": 0.5, "unit_of_measurement": "°C", "mode": "box"}
            }),
            vol.Optional(
                CONF_SUN_ENTITY,
                default=cfg.get(CONF_SUN_ENTITY, "sun.sun")
            ): selector.selector({"text": {}}),
            # --- Pre-heat window ---
            vol.Optional(
                CONF_PREHEAT_MINUTES,
                default=int(cfg.get(CONF_PREHEAT_MINUTES, DEFAULT_PREHEAT_MINUTES))
            ): selector.selector({
                "number": {"min": 0, "max": 120, "step": 5, "unit_of_measurement": "min", "mode": "slider"}
            }),
            # --- Roadmap 1.3: Energy optimisation ---
            vol.Optional(
                CONF_BOILER_KW,
                default=float(cfg.get(CONF_BOILER_KW, DEFAULT_BOILER_KW))
            ): selector.selector({
                "number": {"min": 1, "max": 100, "step": 1, "unit_of_measurement": "kW", "mode": "box"}
            }),
            vol.Optional(
                CONF_SOLAR_ENTITY,
                default=cfg.get(CONF_SOLAR_ENTITY, "")
            ): selector.selector({"text": {}}),
            vol.Optional(
                CONF_SOLAR_SURPLUS_THRESHOLD,
                default=float(cfg.get(CONF_SOLAR_SURPLUS_THRESHOLD, DEFAULT_SOLAR_SURPLUS_THRESHOLD))
            ): selector.selector({
                "number": {"min": 100, "max": 10000, "step": 100, "unit_of_measurement": "W", "mode": "box"}
            }),
            vol.Optional(
                CONF_SOLAR_BOOST_TEMP,
                default=float(cfg.get(CONF_SOLAR_BOOST_TEMP, DEFAULT_SOLAR_BOOST_TEMP))
            ): selector.selector({
                "number": {"min": 0.5, "max": 5, "step": 0.5, "unit_of_measurement": "°C", "mode": "box"}
            }),
            vol.Optional(
                CONF_ENERGY_PRICE_ENTITY,
                default=cfg.get(CONF_ENERGY_PRICE_ENTITY, "")
            ): selector.selector({"text": {}}),
            vol.Optional(
                CONF_ENERGY_PRICE_THRESHOLD,
                default=float(cfg.get(CONF_ENERGY_PRICE_THRESHOLD, DEFAULT_ENERGY_PRICE_THRESHOLD))
            ): selector.selector({
                "number": {"min": 0.05, "max": 2.0, "step": 0.01, "unit_of_measurement": "€/kWh", "mode": "box"}
            }),
            vol.Optional(
                CONF_ENERGY_PRICE_ECO_OFFSET,
                default=float(cfg.get(CONF_ENERGY_PRICE_ECO_OFFSET, DEFAULT_ENERGY_PRICE_ECO_OFFSET))
            ): selector.selector({
                "number": {"min": 0.5, "max": 6, "step": 0.5, "unit_of_measurement": "°C", "mode": "box"}
            }),
            # --- Flow temperature control ---
            vol.Optional(
                CONF_FLOW_TEMP_ENTITY,
                default=cfg.get(CONF_FLOW_TEMP_ENTITY, "")
            ): selector.selector({"text": {}}),
            vol.Optional(
                CONF_FLOW_TEMP_SENSOR,
                default=cfg.get(CONF_FLOW_TEMP_SENSOR, "")
            ): selector.selector({"text": {}}),
            vol.Optional(
                CONF_COOLING_TARGET_TEMP,
                default=float(cfg.get(CONF_COOLING_TARGET_TEMP, DEFAULT_COOLING_TARGET_TEMP))
            ): selector.selector({
                "number": {"min": 18, "max": 30, "step": 0.5, "unit_of_measurement": "°C", "mode": "box"}
            }),
            # --- Controller mode ---
            vol.Optional(
                CONF_CONTROLLER_MODE,
                default=cfg.get(CONF_CONTROLLER_MODE, DEFAULT_CONTROLLER_MODE)
            ): selector.selector({
                "select": {"options": ["switch", "trv"]}
            }),
            # --- Smart meter ---
            vol.Optional(
                CONF_SMART_METER_ENTITY,
                default=cfg.get(CONF_SMART_METER_ENTITY, "")
            ): selector.selector({"text": {}}),
            # --- Weather integration ---
            vol.Optional(
                CONF_WEATHER_ENTITY,
                default=cfg.get(CONF_WEATHER_ENTITY, "")
            ): selector.selector({"text": {}}),
            vol.Optional(
                CONF_WEATHER_COLD_THRESHOLD,
                default=float(cfg.get(CONF_WEATHER_COLD_THRESHOLD, DEFAULT_WEATHER_COLD_THRESHOLD))
            ): selector.selector({
                "number": {"min": -20, "max": 10, "step": 0.5, "unit_of_measurement": "°C", "mode": "box"}
            }),
            vol.Optional(
                CONF_WEATHER_COLD_BOOST,
                default=float(cfg.get(CONF_WEATHER_COLD_BOOST, DEFAULT_WEATHER_COLD_BOOST))
            ): selector.selector({
                "number": {"min": 0, "max": 5, "step": 0.5, "unit_of_measurement": "°C", "mode": "box"}
            }),
            # --- Humidity / ventilation ---
            vol.Optional(
                CONF_OUTDOOR_HUMIDITY_SENSOR,
                default=cfg.get(CONF_OUTDOOR_HUMIDITY_SENSOR, "")
            ): selector.selector({"text": {}}),
            vol.Optional(
                CONF_VENTILATION_ADVICE_ENABLED,
                default=bool(cfg.get(CONF_VENTILATION_ADVICE_ENABLED, DEFAULT_VENTILATION_ADVICE_ENABLED))
            ): selector.selector({"boolean": {}}),
            # --- Adaptive curve / preheat ---
            vol.Optional(
                CONF_ADAPTIVE_CURVE_ENABLED,
                default=bool(cfg.get(CONF_ADAPTIVE_CURVE_ENABLED, DEFAULT_ADAPTIVE_CURVE_ENABLED))
            ): selector.selector({"boolean": {}}),
            vol.Optional(
                CONF_ADAPTIVE_PREHEAT_ENABLED,
                default=bool(cfg.get(CONF_ADAPTIVE_PREHEAT_ENABLED, DEFAULT_ADAPTIVE_PREHEAT_ENABLED))
            ): selector.selector({"boolean": {}}),
            vol.Optional(
                CONF_ETA_PREHEAT_ENABLED,
                default=bool(cfg.get(CONF_ETA_PREHEAT_ENABLED, DEFAULT_ETA_PREHEAT_ENABLED))
            ): selector.selector({"boolean": {}}),
            # --- Vacation calendar ---
            vol.Optional(
                CONF_VACATION_CALENDAR,
                default=cfg.get(CONF_VACATION_CALENDAR, "")
            ): selector.selector({"text": {}}),
            vol.Optional(
                CONF_VACATION_CALENDAR_KEYWORD,
                default=cfg.get(CONF_VACATION_CALENDAR_KEYWORD, DEFAULT_VACATION_CALENDAR_KEYWORD)
            ): selector.selector({"text": {}}),
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
            # Parse the curve from individual fields (up to 15 points, skip empty)
            try:
                points = []
                for i in range(15):
                    ot_key = f"outdoor_{i}"
                    tt_key = f"target_{i}"
                    ot = user_input.get(ot_key)
                    tt = user_input.get(tt_key)
                    if ot is not None and tt is not None:
                        points.append({
                            "outdoor_temp": float(ot),
                            "target_temp": float(tt),
                        })
                points = sorted(points, key=lambda p: p["outdoor_temp"])
                self._options[CONF_HEATING_CURVE] = {CONF_CURVE_POINTS: points}
                return self.async_create_entry(title="", data=self._options)
            except (ValueError, KeyError):
                errors["base"] = "invalid_curve"

        # Build form with up to 15 curve point rows (show all existing + 2 spares)
        _max_points = min(15, max(7, len(current_curve) + 2))
        schema_dict = {}
        for i in range(_max_points):
            pt = current_curve[i] if i < len(current_curve) else None
            if pt is not None:
                schema_dict[vol.Optional(f"outdoor_{i}", default=float(pt["outdoor_temp"]))] = (
                    selector.selector({"number": {"min": -30, "max": 40, "step": 0.5, "unit_of_measurement": "°C", "mode": "box"}})
                )
                schema_dict[vol.Optional(f"target_{i}", default=float(pt["target_temp"]))] = (
                    selector.selector({"number": {"min": 10, "max": 80, "step": 0.5, "unit_of_measurement": "°C", "mode": "box"}})
                )
            else:
                schema_dict[vol.Optional(f"outdoor_{i}")] = (
                    selector.selector({"number": {"min": -30, "max": 40, "step": 0.5, "unit_of_measurement": "°C", "mode": "box"}})
                )
                schema_dict[vol.Optional(f"target_{i}")] = (
                    selector.selector({"number": {"min": 10, "max": 80, "step": 0.5, "unit_of_measurement": "°C", "mode": "box"}})
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
            single_valve = user_input.get(CONF_VALVE_ENTITY, "")
            single_window = user_input.get(CONF_WINDOW_SENSOR, "")
            new_room = {
                CONF_ROOM_ID: str(uuid.uuid4())[:8],
                CONF_ROOM_NAME: user_input[CONF_ROOM_NAME],
                CONF_TEMP_SENSOR: user_input.get(CONF_TEMP_SENSOR, ""),
                CONF_VALVE_ENTITY: single_valve,
                CONF_VALVE_ENTITIES: [single_valve] if single_valve else [],
                CONF_ROOM_OFFSET: float(user_input.get(CONF_ROOM_OFFSET, 0.0)),
                CONF_DEADBAND: float(user_input.get(CONF_DEADBAND, DEFAULT_DEADBAND)),
                CONF_WEIGHT: float(user_input.get(CONF_WEIGHT, DEFAULT_WEIGHT)),
                CONF_COMFORT_TEMP: float(user_input.get(CONF_COMFORT_TEMP, DEFAULT_COMFORT_TEMP)),
                CONF_AWAY_TEMP_ROOM: float(user_input.get(CONF_AWAY_TEMP_ROOM, DEFAULT_AWAY_TEMP_ROOM)),
                CONF_ECO_OFFSET: float(user_input.get(CONF_ECO_OFFSET, DEFAULT_ECO_OFFSET)),
                CONF_SLEEP_OFFSET: float(user_input.get(CONF_SLEEP_OFFSET, DEFAULT_SLEEP_OFFSET)),
                CONF_AWAY_OFFSET: float(user_input.get(CONF_AWAY_OFFSET, DEFAULT_AWAY_OFFSET)),
                CONF_ECO_MAX_TEMP: float(user_input.get(CONF_ECO_MAX_TEMP, DEFAULT_ECO_MAX_TEMP)),
                CONF_SLEEP_MAX_TEMP: float(user_input.get(CONF_SLEEP_MAX_TEMP, DEFAULT_SLEEP_MAX_TEMP)),
                CONF_AWAY_MAX_TEMP: float(user_input.get(CONF_AWAY_MAX_TEMP, DEFAULT_AWAY_MAX_TEMP)),
                CONF_WINDOW_SENSOR: single_window,
                CONF_WINDOW_SENSORS: [single_window] if single_window else [],
                CONF_MIN_TEMP: float(user_input.get(CONF_MIN_TEMP, DEFAULT_MIN_TEMP)),
                CONF_MAX_TEMP: float(user_input.get(CONF_MAX_TEMP, DEFAULT_MAX_TEMP)),
                CONF_ABSOLUTE_MIN_TEMP: float(user_input.get(CONF_ABSOLUTE_MIN_TEMP, DEFAULT_ABSOLUTE_MIN_TEMP)),
                CONF_ROOM_QM: float(user_input.get(CONF_ROOM_QM, DEFAULT_ROOM_QM)),
                CONF_ROOM_PREHEAT_MINUTES: int(user_input.get(CONF_ROOM_PREHEAT_MINUTES, DEFAULT_ROOM_PREHEAT_MINUTES)),
                CONF_WINDOW_REACTION_TIME: int(user_input.get(CONF_WINDOW_REACTION_TIME, DEFAULT_WINDOW_REACTION_TIME)),
                CONF_WINDOW_CLOSE_DELAY: int(user_input.get(CONF_WINDOW_CLOSE_DELAY, DEFAULT_WINDOW_CLOSE_DELAY)),
                CONF_HA_SCHEDULE_OFF_MODE: user_input.get(CONF_HA_SCHEDULE_OFF_MODE, DEFAULT_HA_SCHEDULE_OFF_MODE),
                CONF_HUMIDITY_SENSOR: user_input.get(CONF_HUMIDITY_SENSOR, ""),
                CONF_MOLD_PROTECTION_ENABLED: bool(user_input.get(CONF_MOLD_PROTECTION_ENABLED, DEFAULT_MOLD_PROTECTION_ENABLED)),
                CONF_MOLD_HUMIDITY_THRESHOLD: float(user_input.get(CONF_MOLD_HUMIDITY_THRESHOLD, DEFAULT_MOLD_HUMIDITY_THRESHOLD)),
                CONF_CO2_SENSOR: user_input.get(CONF_CO2_SENSOR, ""),
                CONF_CO2_THRESHOLD_GOOD: int(user_input.get(CONF_CO2_THRESHOLD_GOOD, DEFAULT_CO2_THRESHOLD_GOOD)),
                CONF_CO2_THRESHOLD_BAD: int(user_input.get(CONF_CO2_THRESHOLD_BAD, DEFAULT_CO2_THRESHOLD_BAD)),
                CONF_RADIATOR_KW: float(user_input.get(CONF_RADIATOR_KW, DEFAULT_RADIATOR_KW)),
                CONF_HKV_SENSOR: user_input.get(CONF_HKV_SENSOR, ""),
                CONF_HKV_FACTOR: float(user_input.get(CONF_HKV_FACTOR, DEFAULT_HKV_FACTOR)),
                CONF_BOOST_TEMP: user_input.get(CONF_BOOST_TEMP),
                CONF_BOOST_DEFAULT_DURATION: int(user_input.get(CONF_BOOST_DEFAULT_DURATION, DEFAULT_BOOST_DEFAULT_DURATION)),
                CONF_ROOM_PRESENCE_ENTITIES: [],
                CONF_TRV_TEMP_WEIGHT: float(user_input.get(CONF_TRV_TEMP_WEIGHT, DEFAULT_TRV_TEMP_WEIGHT)),
                CONF_TRV_TEMP_OFFSET: float(user_input.get(CONF_TRV_TEMP_OFFSET, DEFAULT_TRV_TEMP_OFFSET)),
                CONF_TRV_VALVE_DEMAND: bool(user_input.get(CONF_TRV_VALVE_DEMAND, DEFAULT_TRV_VALVE_DEMAND)),
                CONF_TRV_MIN_SEND_INTERVAL: int(user_input.get(CONF_TRV_MIN_SEND_INTERVAL, DEFAULT_TRV_MIN_SEND_INTERVAL)),
                CONF_SCHEDULES: [],
            }
            rooms = list(self._options.get(CONF_ROOMS, []))
            rooms.append(new_room)
            self._options[CONF_ROOMS] = rooms
            return self.async_create_entry(title="", data=self._options)

        schema = vol.Schema({
            vol.Required(CONF_ROOM_NAME): str,
            vol.Optional(CONF_TEMP_SENSOR, default=""): selector.selector({"text": {}}),
            vol.Optional(CONF_VALVE_ENTITY, default=""): selector.selector({"text": {}}),
            vol.Optional(CONF_WINDOW_SENSOR, default=""): selector.selector({"text": {}}),
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
            vol.Optional(CONF_ECO_OFFSET, default=DEFAULT_ECO_OFFSET): selector.selector({
                "number": {"min": 0, "max": 8, "step": 0.5, "unit_of_measurement": "°C", "mode": "box"}
            }),
            vol.Optional(CONF_SLEEP_OFFSET, default=DEFAULT_SLEEP_OFFSET): selector.selector({
                "number": {"min": 0, "max": 8, "step": 0.5, "unit_of_measurement": "°C", "mode": "box"}
            }),
            vol.Optional(CONF_AWAY_OFFSET, default=DEFAULT_AWAY_OFFSET): selector.selector({
                "number": {"min": 0, "max": 10, "step": 0.5, "unit_of_measurement": "°C", "mode": "box"}
            }),
            vol.Optional(CONF_MIN_TEMP, default=DEFAULT_MIN_TEMP): selector.selector({
                "number": {"min": 5, "max": 15, "step": 0.5, "unit_of_measurement": "°C", "mode": "box"}
            }),
            vol.Optional(CONF_MAX_TEMP, default=DEFAULT_MAX_TEMP): selector.selector({
                "number": {"min": 20, "max": 35, "step": 0.5, "unit_of_measurement": "°C", "mode": "box"}
            }),
            vol.Optional(CONF_ABSOLUTE_MIN_TEMP, default=DEFAULT_ABSOLUTE_MIN_TEMP): selector.selector({
                "number": {"min": 5, "max": 25, "step": 0.5, "unit_of_measurement": "°C", "mode": "box"}
            }),
            vol.Optional(CONF_ROOM_QM, default=DEFAULT_ROOM_QM): selector.selector({
                "number": {"min": 0, "max": 200, "step": 1, "unit_of_measurement": "m²", "mode": "box"}
            }),
            vol.Optional(CONF_ROOM_PREHEAT_MINUTES, default=DEFAULT_ROOM_PREHEAT_MINUTES): selector.selector({
                "number": {"min": -1, "max": 120, "step": 1, "unit_of_measurement": "min", "mode": "box"}
            }),
            vol.Optional(CONF_WINDOW_REACTION_TIME, default=DEFAULT_WINDOW_REACTION_TIME): selector.selector({
                "number": {"min": 0, "max": 300, "step": 5, "unit_of_measurement": "s", "mode": "box"}
            }),
            vol.Optional(CONF_WINDOW_CLOSE_DELAY, default=DEFAULT_WINDOW_CLOSE_DELAY): selector.selector({
                "number": {"min": 0, "max": 600, "step": 5, "unit_of_measurement": "s", "mode": "box"}
            }),
            vol.Optional(CONF_HA_SCHEDULE_OFF_MODE, default=DEFAULT_HA_SCHEDULE_OFF_MODE): selector.selector({
                "select": {"options": ["eco", "sleep", "away"]}
            }),
            vol.Optional(CONF_HUMIDITY_SENSOR, default=""): selector.selector({"text": {}}),
            vol.Optional(CONF_MOLD_PROTECTION_ENABLED, default=DEFAULT_MOLD_PROTECTION_ENABLED): selector.selector({"boolean": {}}),
            vol.Optional(CONF_MOLD_HUMIDITY_THRESHOLD, default=DEFAULT_MOLD_HUMIDITY_THRESHOLD): selector.selector({
                "number": {"min": 50, "max": 95, "step": 1, "unit_of_measurement": "%", "mode": "box"}
            }),
            vol.Optional(CONF_CO2_SENSOR, default=""): selector.selector({"text": {}}),
            vol.Optional(CONF_CO2_THRESHOLD_GOOD, default=DEFAULT_CO2_THRESHOLD_GOOD): selector.selector({
                "number": {"min": 400, "max": 1000, "step": 50, "unit_of_measurement": "ppm", "mode": "box"}
            }),
            vol.Optional(CONF_CO2_THRESHOLD_BAD, default=DEFAULT_CO2_THRESHOLD_BAD): selector.selector({
                "number": {"min": 800, "max": 2000, "step": 50, "unit_of_measurement": "ppm", "mode": "box"}
            }),
            vol.Optional(CONF_RADIATOR_KW, default=DEFAULT_RADIATOR_KW): selector.selector({
                "number": {"min": 0.1, "max": 10, "step": 0.1, "unit_of_measurement": "kW", "mode": "box"}
            }),
            vol.Optional(CONF_HKV_SENSOR, default=""): selector.selector({"text": {}}),
            vol.Optional(CONF_HKV_FACTOR, default=DEFAULT_HKV_FACTOR): selector.selector({
                "number": {"min": 0.01, "max": 1.0, "step": 0.001, "unit_of_measurement": "kWh/Einheit", "mode": "box"}
            }),
            vol.Optional(CONF_BOOST_DEFAULT_DURATION, default=DEFAULT_BOOST_DEFAULT_DURATION): selector.selector({
                "number": {"min": 5, "max": 480, "step": 5, "unit_of_measurement": "min", "mode": "box"}
            }),
            vol.Optional(CONF_BOOST_TEMP): selector.selector({
                "number": {"min": 15, "max": 35, "step": 0.5, "unit_of_measurement": "°C", "mode": "box"}
            }),
            vol.Optional(CONF_TRV_TEMP_WEIGHT, default=DEFAULT_TRV_TEMP_WEIGHT): selector.selector({
                "number": {"min": 0.0, "max": 0.5, "step": 0.05, "mode": "box"}
            }),
            vol.Optional(CONF_TRV_TEMP_OFFSET, default=DEFAULT_TRV_TEMP_OFFSET): selector.selector({
                "number": {"min": -10, "max": 5, "step": 0.5, "unit_of_measurement": "°C", "mode": "box"}
            }),
            vol.Optional(CONF_TRV_VALVE_DEMAND, default=DEFAULT_TRV_VALVE_DEMAND): selector.selector({"boolean": {}}),
            vol.Optional(CONF_TRV_MIN_SEND_INTERVAL, default=DEFAULT_TRV_MIN_SEND_INTERVAL): selector.selector({
                "number": {"min": 0, "max": 1800, "step": 60, "unit_of_measurement": "s", "mode": "box"}
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
            vol.Optional(CONF_TEMP_SENSOR, default=room.get(CONF_TEMP_SENSOR, "")): selector.selector({"text": {}}),
            vol.Optional(CONF_VALVE_ENTITY, default=room.get(CONF_VALVE_ENTITY, "")): selector.selector({"text": {}}),
            vol.Optional(CONF_WINDOW_SENSOR, default=room.get(CONF_WINDOW_SENSOR, "")): selector.selector({"text": {}}),
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
            vol.Optional(CONF_ECO_OFFSET, default=float(room.get(CONF_ECO_OFFSET, DEFAULT_ECO_OFFSET))): selector.selector({
                "number": {"min": 0, "max": 8, "step": 0.5, "unit_of_measurement": "°C", "mode": "box"}
            }),
            vol.Optional(CONF_SLEEP_OFFSET, default=float(room.get(CONF_SLEEP_OFFSET, DEFAULT_SLEEP_OFFSET))): selector.selector({
                "number": {"min": 0, "max": 8, "step": 0.5, "unit_of_measurement": "°C", "mode": "box"}
            }),
            vol.Optional(CONF_AWAY_OFFSET, default=float(room.get(CONF_AWAY_OFFSET, DEFAULT_AWAY_OFFSET))): selector.selector({
                "number": {"min": 0, "max": 10, "step": 0.5, "unit_of_measurement": "°C", "mode": "box"}
            }),
            vol.Optional(CONF_MIN_TEMP, default=float(room.get(CONF_MIN_TEMP, DEFAULT_MIN_TEMP))): selector.selector({
                "number": {"min": 5, "max": 15, "step": 0.5, "unit_of_measurement": "°C", "mode": "box"}
            }),
            vol.Optional(CONF_MAX_TEMP, default=float(room.get(CONF_MAX_TEMP, DEFAULT_MAX_TEMP))): selector.selector({
                "number": {"min": 20, "max": 35, "step": 0.5, "unit_of_measurement": "°C", "mode": "box"}
            }),
            vol.Optional(CONF_ABSOLUTE_MIN_TEMP, default=float(room.get(CONF_ABSOLUTE_MIN_TEMP, DEFAULT_ABSOLUTE_MIN_TEMP))): selector.selector({
                "number": {"min": 5, "max": 25, "step": 0.5, "unit_of_measurement": "°C", "mode": "box"}
            }),
            vol.Optional(CONF_ROOM_QM, default=float(room.get(CONF_ROOM_QM, DEFAULT_ROOM_QM))): selector.selector({
                "number": {"min": 0, "max": 200, "step": 1, "unit_of_measurement": "m²", "mode": "box"}
            }),
            vol.Optional(CONF_ROOM_PREHEAT_MINUTES, default=int(room.get(CONF_ROOM_PREHEAT_MINUTES, DEFAULT_ROOM_PREHEAT_MINUTES))): selector.selector({
                "number": {"min": -1, "max": 120, "step": 1, "unit_of_measurement": "min", "mode": "box"}
            }),
            vol.Optional(CONF_WINDOW_REACTION_TIME, default=int(room.get(CONF_WINDOW_REACTION_TIME, DEFAULT_WINDOW_REACTION_TIME))): selector.selector({
                "number": {"min": 0, "max": 300, "step": 5, "unit_of_measurement": "s", "mode": "box"}
            }),
            vol.Optional(CONF_WINDOW_CLOSE_DELAY, default=int(room.get(CONF_WINDOW_CLOSE_DELAY, DEFAULT_WINDOW_CLOSE_DELAY))): selector.selector({
                "number": {"min": 0, "max": 600, "step": 5, "unit_of_measurement": "s", "mode": "box"}
            }),
            vol.Optional(CONF_HA_SCHEDULE_OFF_MODE, default=room.get(CONF_HA_SCHEDULE_OFF_MODE, DEFAULT_HA_SCHEDULE_OFF_MODE)): selector.selector({
                "select": {"options": ["eco", "sleep", "away"]}
            }),
            vol.Optional(CONF_HUMIDITY_SENSOR, default=room.get(CONF_HUMIDITY_SENSOR, "")): selector.selector({"text": {}}),
            vol.Optional(CONF_MOLD_PROTECTION_ENABLED, default=bool(room.get(CONF_MOLD_PROTECTION_ENABLED, DEFAULT_MOLD_PROTECTION_ENABLED))): selector.selector({"boolean": {}}),
            vol.Optional(CONF_MOLD_HUMIDITY_THRESHOLD, default=float(room.get(CONF_MOLD_HUMIDITY_THRESHOLD, DEFAULT_MOLD_HUMIDITY_THRESHOLD))): selector.selector({
                "number": {"min": 50, "max": 95, "step": 1, "unit_of_measurement": "%", "mode": "box"}
            }),
            vol.Optional(CONF_CO2_SENSOR, default=room.get(CONF_CO2_SENSOR, "")): selector.selector({"text": {}}),
            vol.Optional(CONF_CO2_THRESHOLD_GOOD, default=int(room.get(CONF_CO2_THRESHOLD_GOOD, DEFAULT_CO2_THRESHOLD_GOOD))): selector.selector({
                "number": {"min": 400, "max": 1000, "step": 50, "unit_of_measurement": "ppm", "mode": "box"}
            }),
            vol.Optional(CONF_CO2_THRESHOLD_BAD, default=int(room.get(CONF_CO2_THRESHOLD_BAD, DEFAULT_CO2_THRESHOLD_BAD))): selector.selector({
                "number": {"min": 800, "max": 2000, "step": 50, "unit_of_measurement": "ppm", "mode": "box"}
            }),
            vol.Optional(CONF_RADIATOR_KW, default=float(room.get(CONF_RADIATOR_KW, DEFAULT_RADIATOR_KW))): selector.selector({
                "number": {"min": 0.1, "max": 10, "step": 0.1, "unit_of_measurement": "kW", "mode": "box"}
            }),
            vol.Optional(CONF_HKV_SENSOR, default=room.get(CONF_HKV_SENSOR, "")): selector.selector({"text": {}}),
            vol.Optional(CONF_HKV_FACTOR, default=float(room.get(CONF_HKV_FACTOR, DEFAULT_HKV_FACTOR))): selector.selector({
                "number": {"min": 0.01, "max": 1.0, "step": 0.001, "unit_of_measurement": "kWh/Einheit", "mode": "box"}
            }),
            vol.Optional(CONF_BOOST_DEFAULT_DURATION, default=int(room.get(CONF_BOOST_DEFAULT_DURATION, DEFAULT_BOOST_DEFAULT_DURATION))): selector.selector({
                "number": {"min": 5, "max": 480, "step": 5, "unit_of_measurement": "min", "mode": "box"}
            }),
            vol.Optional(CONF_BOOST_TEMP, default=room.get(CONF_BOOST_TEMP)): selector.selector({
                "number": {"min": 15, "max": 35, "step": 0.5, "unit_of_measurement": "°C", "mode": "box"}
            }),
            vol.Optional(CONF_TRV_TEMP_WEIGHT, default=float(room.get(CONF_TRV_TEMP_WEIGHT, DEFAULT_TRV_TEMP_WEIGHT))): selector.selector({
                "number": {"min": 0.0, "max": 0.5, "step": 0.05, "mode": "box"}
            }),
            vol.Optional(CONF_TRV_TEMP_OFFSET, default=float(room.get(CONF_TRV_TEMP_OFFSET, DEFAULT_TRV_TEMP_OFFSET))): selector.selector({
                "number": {"min": -10, "max": 5, "step": 0.5, "unit_of_measurement": "°C", "mode": "box"}
            }),
            vol.Optional(CONF_TRV_VALVE_DEMAND, default=bool(room.get(CONF_TRV_VALVE_DEMAND, DEFAULT_TRV_VALVE_DEMAND))): selector.selector({"boolean": {}}),
            vol.Optional(CONF_TRV_MIN_SEND_INTERVAL, default=int(room.get(CONF_TRV_MIN_SEND_INTERVAL, DEFAULT_TRV_MIN_SEND_INTERVAL))): selector.selector({
                "number": {"min": 0, "max": 1800, "step": 60, "unit_of_measurement": "s", "mode": "box"}
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
