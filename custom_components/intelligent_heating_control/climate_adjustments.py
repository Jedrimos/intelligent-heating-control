"""Climate adjustment factors mixin for IHC Coordinator."""
from __future__ import annotations

import logging
import time
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
    CONF_LOAD_MANAGEMENT_ENABLED,
    DEFAULT_LOAD_MANAGEMENT_ENABLED,
    CONF_BATTERY_SOC_ENTITY,
    CONF_BATTERY_SOC_LOW_THRESHOLD,
    DEFAULT_BATTERY_SOC_LOW_THRESHOLD,
    CONF_BATTERY_SOC_FULL_THRESHOLD,
    DEFAULT_BATTERY_SOC_FULL_THRESHOLD,
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

    def _get_battery_soc(self) -> Optional[float]:
        """Return the configured home battery's state of charge (%), or None if no
        battery sensor is configured/available. Used by the load-management extensions
        to _get_solar_boost/_get_price_forecast_offset below."""
        cfg = self.get_config()
        entity = cfg.get(CONF_BATTERY_SOC_ENTITY)
        if not entity:
            return None
        state = self.hass.states.get(entity)
        if state is None or state.state in (STATE_UNAVAILABLE, STATE_UNKNOWN):
            return None
        try:
            return float(state.state)
        except ValueError:
            return None

    def _get_solar_boost(self) -> float:
        """Return temperature boost (°C) when solar surplus is available.

        Echtes Lastmanagement (opt-in via CONF_LOAD_MANAGEMENT_ENABLED): if a home battery
        is configured and not yet reasonably full, the surplus is needed there first - the
        boost is suppressed until CONF_BATTERY_SOC_FULL_THRESHOLD is reached, instead of
        opening the heating wider on every momentary PV surplus regardless of battery state.
        """
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
        if surplus_w < threshold:
            return 0.0
        if cfg.get(CONF_LOAD_MANAGEMENT_ENABLED, DEFAULT_LOAD_MANAGEMENT_ENABLED):
            battery_soc = self._get_battery_soc()
            if battery_soc is not None:
                full_threshold = float(cfg.get(CONF_BATTERY_SOC_FULL_THRESHOLD, DEFAULT_BATTERY_SOC_FULL_THRESHOLD))
                if battery_soc < full_threshold:
                    return 0.0
        return float(cfg.get(CONF_SOLAR_BOOST_TEMP, DEFAULT_SOLAR_BOOST_TEMP))

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

    def _get_weather_entity_id(self) -> Optional[str]:
        """v2.6 – effective weather entity: the configured one, otherwise the first
        available weather.* entity in Home Assistant (a fresh HA install ships one via
        Met.no). Lets people without any sensors still get outdoor temperature and
        forecasts with zero configuration.
        """
        configured = self.get_config().get(CONF_WEATHER_ENTITY)
        if configured:
            return configured
        candidates = sorted(
            s.entity_id for s in self.hass.states.async_all("weather")
            if s.state not in (STATE_UNAVAILABLE, STATE_UNKNOWN)
        )
        return candidates[0] if candidates else None

    async def _async_refresh_weather_forecast(self) -> None:
        """v2.6 – fetch the daily forecast via the weather.get_forecasts service.

        Home Assistant removed the `forecast` state attribute in 2024.3, so every
        forecast-based feature (Kälteprognose, Mehrtages-Vorschau, ...) silently got an
        empty list on current versions. Cached for 30 minutes.
        """
        entity_id = self._get_weather_entity_id()
        if not entity_id:
            self._weather_forecast_cache = (None, [], 0.0)
            return
        cached_entity, _, fetched_at = getattr(self, "_weather_forecast_cache", (None, [], 0.0))
        now = time.monotonic()
        if cached_entity == entity_id and now - fetched_at < 1800:
            return
        forecast: list = []
        for fc_type in ("daily", "twice_daily"):
            try:
                resp = await self.hass.services.async_call(
                    "weather", "get_forecasts",
                    {"entity_id": entity_id, "type": fc_type},
                    blocking=True, return_response=True,
                )
                forecast = ((resp or {}).get(entity_id) or {}).get("forecast") or []
            except Exception:  # entity doesn't support this forecast type
                _LOGGER.debug("IHC: %s forecast type %s unavailable", entity_id, fc_type, exc_info=True)
                forecast = []
            if forecast:
                if fc_type == "twice_daily":
                    forecast = self._merge_twice_daily_forecast(forecast)
                break
        self._weather_forecast_cache = (entity_id, forecast, now)

    @staticmethod
    def _merge_twice_daily_forecast(forecast: list) -> list:
        """Collapse day/night entries into one entry per date (min = lowest, max = highest)."""
        by_date: dict = {}
        for fc in forecast:
            date = str(fc.get("datetime", ""))[:10]
            temps = [t for t in (fc.get("temperature"), fc.get("templow")) if t is not None]
            if not date or not temps:
                continue
            d = by_date.setdefault(date, {"datetime": fc.get("datetime"), "temperature": max(temps),
                                          "templow": min(temps), "condition": fc.get("condition")})
            d["temperature"] = max(d["temperature"], *temps)
            d["templow"] = min(d["templow"], *temps)
        return list(by_date.values())

    def _get_weather_forecast(self) -> Optional[dict]:
        """
        Read forecast from the effective weather.* entity (see _get_weather_entity_id).
        Returns dict with today's min/max forecast temp and condition, or None.
        """
        cfg = self.get_config()
        weather_entity = self._get_weather_entity_id()
        if not weather_entity:
            return None
        state = self.hass.states.get(weather_entity)
        if state is None or state.state in (STATE_UNAVAILABLE, STATE_UNKNOWN):
            return None
        attrs = state.attributes
        # Current conditions
        current_temp = attrs.get("temperature")
        cached_entity, cached_forecast, _ = getattr(self, "_weather_forecast_cache", (None, [], 0.0))
        # Service-based forecast (HA ≥ 2024.3); legacy attribute only as fallback
        forecast_list = cached_forecast if cached_entity == weather_entity and cached_forecast else attrs.get("forecast", [])
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

    def _get_forecast_min_within_days(self, forecast: dict, lookahead_days: int) -> Optional[float]:
        """Lowest forecasted low-temp within the next `lookahead_days` days (1 = today
        only - the original single-night cold-forecast behavior; up to 3, the horizon
        _get_weather_forecast() fetches). Lets a cold snap 1-2 days out reactivate the
        heating period / suspend summer mode / add preheat time early, instead of only
        reacting once it's literally tonight. Falls back to forecast_today_min if the
        day-list is empty for some reason (defensive - should normally agree with it).
        """
        days = forecast.get("forecast") or []
        mins = [
            d["min"] for d in days
            if d.get("day_offset", 0) < lookahead_days and d.get("min") is not None
        ]
        if mins:
            return min(mins)
        return forecast.get("forecast_today_min")

    def _get_price_forecast_offset(self) -> float:
        """
        Dynamic price-based temperature offset using hourly price forecast.

        Reads 'today_prices' (or CONF_PRICE_FORECAST_ATTRIBUTE) from the energy
        price sensor – compatible with Tibber integration and HACS Nordpool.

        Returns a positive value to RAISE the setpoint (cheap hour → store heat)
        or a negative value to LOWER it (expensive hour → save energy).
        Falls back to the simple threshold logic when no hourly prices are found.

        Echtes Lastmanagement (opt-in via CONF_LOAD_MANAGEMENT_ENABLED): when the home
        battery is configured and below CONF_BATTERY_SOC_LOW_THRESHOLD, and there's no
        solar surplus to draw on right now, the result is clamped to at most the eco
        offset - a cheap-hour pre-heat boost is suppressed (importing grid power to both
        pre-heat AND leave the battery depleted isn't the point) and a neutral/no-signal
        hour still gets nudged into eco, same as an expensive one.
        """
        eco_offset = float(self.get_config().get(CONF_ENERGY_PRICE_ECO_OFFSET, DEFAULT_ENERGY_PRICE_ECO_OFFSET))
        offset = self._get_price_forecast_offset_raw()
        if self._is_battery_low_without_solar_surplus():
            return min(offset, -eco_offset)
        return offset

    def _is_battery_low_without_solar_surplus(self) -> bool:
        cfg = self.get_config()
        if not cfg.get(CONF_LOAD_MANAGEMENT_ENABLED, DEFAULT_LOAD_MANAGEMENT_ENABLED):
            return False
        battery_soc = self._get_battery_soc()
        if battery_soc is None:
            return False
        low_threshold = float(cfg.get(CONF_BATTERY_SOC_LOW_THRESHOLD, DEFAULT_BATTERY_SOC_LOW_THRESHOLD))
        return battery_soc < low_threshold and self._get_solar_boost() == 0.0

    @staticmethod
    def _normalize_price_list(raw) -> list:
        """Price lists come as plain numbers (Nordpool "today") or as dicts (Tibber /
        Nordpool "raw_today": {"total"|"value"|"price": ...}). Returns floats, or [] if the
        list isn't usable - a single malformed entry used to abort the whole update cycle."""
        if not isinstance(raw, list) or not raw:
            return []
        out = []
        for item in raw:
            if isinstance(item, dict):
                item = next((item[k] for k in ("total", "value", "price") if item.get(k) is not None), None)
            try:
                out.append(float(item))
            except (TypeError, ValueError):
                return []
        return out if len(out) in (24, 23, 25, 96, 92, 100) else []

    def _get_price_forecast_offset_raw(self) -> float:
        """The price-forecast offset before the load-management battery clamp above."""
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
        today_prices = self._normalize_price_list(state.attributes.get(forecast_attr, []))
        if today_prices:
            # 24 hourly or 96 quarter-hourly prices (Nordpool switched to 15-min
            # resolution in Oct 2025) - pick the slot for the current time of day.
            now = dt_util.now()
            slot = int((now.hour * 60 + now.minute) * len(today_prices) / 1440)
            if slot < len(today_prices):
                current_price = today_prices[slot]
                avg_price = sum(today_prices) / len(today_prices)
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
