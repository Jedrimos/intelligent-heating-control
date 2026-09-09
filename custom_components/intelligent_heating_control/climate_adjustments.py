"""Climate adjustment factors mixin for IHC Coordinator."""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Optional

from homeassistant.const import STATE_UNAVAILABLE, STATE_UNKNOWN
from homeassistant.util import dt as dt_util

from .const import (
    CONF_NIGHT_SETBACK_ENABLED,
    CONF_SUN_ENTITY,
    CONF_FROST_PROTECTION_TEMP,
    CONF_SOLAR_ENTITY,
    CONF_SOLAR_SURPLUS_THRESHOLD,
    CONF_SOLAR_BOOST_TEMP,
    CONF_ENERGY_PRICE_ENTITY,
    CONF_ENERGY_PRICE_THRESHOLD,
    CONF_ENERGY_PRICE_ECO_OFFSET,
    CONF_WEATHER_ENTITY,
    CONF_WEATHER_COLD_THRESHOLD,
    CONF_WEATHER_COLD_BOOST,
    CONF_ADAPTIVE_PREHEAT_ENABLED,
    CONF_ETA_PREHEAT_ENABLED,
    CONF_ETA_PREHEAT_THRESHOLD_MINUTES,
    DEFAULT_ETA_PREHEAT_THRESHOLD_MINUTES,
    CONF_PRESENCE_ENTITIES,
    CONF_PRICE_FORECAST_ATTRIBUTE,
    DEFAULT_FROST_PROTECTION_TEMP,
    DEFAULT_SOLAR_SURPLUS_THRESHOLD,
    DEFAULT_SOLAR_BOOST_TEMP,
    DEFAULT_ENERGY_PRICE_THRESHOLD,
    DEFAULT_ENERGY_PRICE_ECO_OFFSET,
    DEFAULT_WEATHER_COLD_THRESHOLD,
    DEFAULT_WEATHER_COLD_BOOST,
    DEFAULT_ADAPTIVE_PREHEAT_ENABLED,
    DEFAULT_ETA_PREHEAT_ENABLED,
    DEFAULT_PRICE_FORECAST_ATTRIBUTE,
)

_LOGGER = logging.getLogger(__name__)


class ClimateAdjustmentsMixin:
    """Mixin for climate adjustment calculations (setback, solar, energy price, weather)."""

    def _is_night_setback_active(self) -> bool:
        """Return True if night setback should apply (sun below horizon)."""
        cfg = self.get_config()
        if not cfg.get(CONF_NIGHT_SETBACK_ENABLED, False):
            return False
        sun_entity = cfg.get(CONF_SUN_ENTITY, "sun.sun")
        state = self.hass.states.get(sun_entity)
        if state is None:
            return False
        return state.state == "below_horizon"

    def _get_frost_protection_temp(self) -> float:
        cfg = self.get_config()
        return float(cfg.get(CONF_FROST_PROTECTION_TEMP, DEFAULT_FROST_PROTECTION_TEMP))

    def _get_solar_boost(self) -> float:
        """Return temperature boost (°C) when solar surplus is available."""
        cfg = self.get_config()
        solar_entity = cfg.get(CONF_SOLAR_ENTITY)
        if not solar_entity:
            return 0.0
        state = self.hass.states.get(solar_entity)
        if state is None or state.state in (STATE_UNAVAILABLE, STATE_UNKNOWN):
            return 0.0
        try:
            surplus_w = float(state.state)
        except ValueError:
            return 0.0
        threshold = float(cfg.get(CONF_SOLAR_SURPLUS_THRESHOLD, DEFAULT_SOLAR_SURPLUS_THRESHOLD))
        if surplus_w >= threshold:
            return float(cfg.get(CONF_SOLAR_BOOST_TEMP, DEFAULT_SOLAR_BOOST_TEMP))
        return 0.0

    def _get_energy_price_eco_offset(self) -> float:
        """Return temperature reduction (°C) when electricity price is high."""
        cfg = self.get_config()
        price_entity = cfg.get(CONF_ENERGY_PRICE_ENTITY)
        if not price_entity:
            return 0.0
        state = self.hass.states.get(price_entity)
        if state is None or state.state in (STATE_UNAVAILABLE, STATE_UNKNOWN):
            return 0.0
        try:
            price = float(state.state)
        except ValueError:
            return 0.0
        threshold = float(cfg.get(CONF_ENERGY_PRICE_THRESHOLD, DEFAULT_ENERGY_PRICE_THRESHOLD))
        if price >= threshold:
            # Return NEGATIVE offset so the setpoint is LOWERED when electricity is expensive.
            # CONF_ENERGY_PRICE_ECO_OFFSET is user-configured as a positive "reduction" value (e.g. 2 °C).
            # Downstream logic applies: target_temp += price_eco_offset (so negative = lower setpoint).
            return -abs(float(cfg.get(CONF_ENERGY_PRICE_ECO_OFFSET, DEFAULT_ENERGY_PRICE_ECO_OFFSET)))
        return 0.0

    def _get_weather_cold_boost(self) -> float:
        """Return temperature boost (°C) when a cold day is forecast.

        Applies when forecast_today_min ≤ weather_cold_threshold AND
        weather_cold_boost > 0.  Raises all room targets to pre-compensate
        for high heat demand on frigid days.
        """
        cfg = self.get_config()
        cold_boost = float(cfg.get(CONF_WEATHER_COLD_BOOST, DEFAULT_WEATHER_COLD_BOOST))
        if cold_boost <= 0:
            return 0.0
        forecast = self._get_weather_forecast()
        if forecast and forecast.get("cold_warning"):
            return cold_boost
        return 0.0

    def _get_current_energy_price(self) -> Optional[float]:
        """Return current energy price for display."""
        cfg = self.get_config()
        price_entity = cfg.get(CONF_ENERGY_PRICE_ENTITY)
        if not price_entity:
            return None
        state = self.hass.states.get(price_entity)
        if state is None or state.state in (STATE_UNAVAILABLE, STATE_UNKNOWN):
            return None
        try:
            return float(state.state)
        except ValueError:
            return None

    def _get_solar_power(self) -> Optional[float]:
        """Return current solar power for display."""
        cfg = self.get_config()
        solar_entity = cfg.get(CONF_SOLAR_ENTITY)
        if not solar_entity:
            return None
        state = self.hass.states.get(solar_entity)
        if state is None or state.state in (STATE_UNAVAILABLE, STATE_UNKNOWN):
            return None
        try:
            return float(state.state)
        except ValueError:
            return None

    def _get_weather_forecast(self) -> Optional[dict]:
        """
        Read forecast from a weather.* entity (HA native forecast attribute).
        Returns dict with today's min/max forecast temp and condition, or None.
        """
        cfg = self.get_config()
        weather_entity = cfg.get(CONF_WEATHER_ENTITY)
        if not weather_entity:
            return None
        state = self.hass.states.get(weather_entity)
        if state is None or state.state in (STATE_UNAVAILABLE, STATE_UNKNOWN):
            return None
        attrs = state.attributes
        # Current conditions
        current_temp = attrs.get("temperature")
        forecast_list = attrs.get("forecast", [])
        cold_threshold = float(cfg.get(CONF_WEATHER_COLD_THRESHOLD, DEFAULT_WEATHER_COLD_THRESHOLD))
        result = {
            "condition": state.state,
            "current_temp": current_temp,
            "forecast_today_min": None,
            "forecast_today_max": None,
            "cold_warning": False,
            "forecast": [],  # multi-day: list of {day_offset, datetime, min, max, condition}
        }
        for i, fc in enumerate(forecast_list[:3]):
            result["forecast"].append({
                "day_offset": i,
                "datetime": fc.get("datetime"),
                "min": fc.get("templow"),
                "max": fc.get("temperature"),
                "condition": fc.get("condition"),
            })
        if forecast_list:
            today_fc = forecast_list[0]
            result["forecast_today_min"] = today_fc.get("templow")
            result["forecast_today_max"] = today_fc.get("temperature")
            min_temp = today_fc.get("templow")
            if min_temp is not None and min_temp <= cold_threshold:
                result["cold_warning"] = True
        return result

    def _get_price_forecast_offset(self) -> float:
        """
        Dynamic price-based temperature offset using hourly price forecast.

        Reads 'today_prices' (or CONF_PRICE_FORECAST_ATTRIBUTE) from the energy
        price sensor – compatible with Tibber integration and HACS Nordpool.

        Returns a positive value to RAISE the setpoint (cheap hour → store heat)
        or a negative value to LOWER it (expensive hour → save energy).
        Falls back to the simple threshold logic when no hourly prices are found.
        """
        cfg = self.get_config()
        price_entity = cfg.get(CONF_ENERGY_PRICE_ENTITY)
        if not price_entity:
            return 0.0
        state = self.hass.states.get(price_entity)
        if state is None or state.state in (STATE_UNAVAILABLE, STATE_UNKNOWN):
            return 0.0

        eco_offset = float(cfg.get(CONF_ENERGY_PRICE_ECO_OFFSET, DEFAULT_ENERGY_PRICE_ECO_OFFSET))
        solar_boost = float(cfg.get(CONF_SOLAR_BOOST_TEMP, DEFAULT_SOLAR_BOOST_TEMP))

        # Hourly forecast path (Tibber / Nordpool)
        forecast_attr = cfg.get(CONF_PRICE_FORECAST_ATTRIBUTE, DEFAULT_PRICE_FORECAST_ATTRIBUTE)
        today_prices = state.attributes.get(forecast_attr, [])
        if today_prices and isinstance(today_prices, list):
            current_hour = dt_util.now().hour
            if current_hour < len(today_prices):
                current_price = float(today_prices[current_hour])
                avg_price = sum(float(p) for p in today_prices) / len(today_prices)
                if avg_price > 0:
                    if current_price > avg_price * 1.3:    # ≥30% above avg → reduce demand
                        return -eco_offset
                    elif current_price < avg_price * 0.7:  # ≥30% below avg → pre-heat
                        return solar_boost
                return 0.0

        # Simple threshold fallback
        try:
            price = float(state.state)
            threshold = float(cfg.get(CONF_ENERGY_PRICE_THRESHOLD, DEFAULT_ENERGY_PRICE_THRESHOLD))
            return -eco_offset if price > threshold else 0.0
        except (ValueError, TypeError):
            return 0.0

    def _get_eta_preheat_minutes(self) -> Optional[float]:
        """
        Check person.*/device_tracker.* entities for an ETA home arrival.

        Reads the 'estimated_arrival_time' attribute (set by the Google Maps
        travel time integration or similar). Returns the number of minutes
        until the earliest ETA within the next 2 hours, or None.
        """
        cfg = self.get_config()
        if not cfg.get(CONF_ETA_PREHEAT_ENABLED, DEFAULT_ETA_PREHEAT_ENABLED):
            return None
        entities = cfg.get(CONF_PRESENCE_ENTITIES, [])
        min_minutes: Optional[float] = None
        for entity_id in entities:
            if not entity_id:
                continue
            state = self.hass.states.get(entity_id)
            if state is None:
                continue
            eta_attr = state.attributes.get("estimated_arrival_time")
            if not eta_attr:
                continue
            try:
                eta_dt = datetime.fromisoformat(str(eta_attr).replace("Z", "+00:00"))
                # Normalise to HA's configured timezone (not the OS/process timezone,
                # which can differ, e.g. a UTC-configured Docker host running an
                # Europe/Berlin Home Assistant instance).
                if eta_dt.tzinfo is not None:
                    eta_dt = dt_util.as_local(eta_dt)
                else:
                    eta_dt = eta_dt.replace(tzinfo=dt_util.DEFAULT_TIME_ZONE)
                minutes = (eta_dt - dt_util.now()).total_seconds() / 60
                threshold = int(cfg.get(CONF_ETA_PREHEAT_THRESHOLD_MINUTES, DEFAULT_ETA_PREHEAT_THRESHOLD_MINUTES))
                if 0 < minutes <= threshold:
                    min_minutes = min(min_minutes or minutes, minutes)
            except (ValueError, TypeError, AttributeError):
                pass
        return min_minutes
