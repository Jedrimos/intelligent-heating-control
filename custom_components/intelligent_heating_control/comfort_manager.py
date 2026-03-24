"""Comfort monitoring mixin for IHC Coordinator (mold, CO2, ventilation)."""
from __future__ import annotations

import logging
import math
from typing import Optional

from homeassistant.const import STATE_UNAVAILABLE, STATE_UNKNOWN

from .const import (
    CONF_HUMIDITY_SENSOR,
    CONF_MOLD_PROTECTION_ENABLED,
    CONF_MOLD_HUMIDITY_THRESHOLD,
    CONF_OUTDOOR_HUMIDITY_SENSOR,
    CONF_CO2_SENSOR,
    CONF_CO2_THRESHOLD_GOOD,
    CONF_CO2_THRESHOLD_BAD,
    CONF_VENTILATION_ADVICE_ENABLED,
    CONF_TEMP_CALIBRATION,
    DEFAULT_MOLD_HUMIDITY_THRESHOLD,
    DEFAULT_MOLD_PROTECTION_ENABLED,
    DEFAULT_CO2_THRESHOLD_GOOD,
    DEFAULT_CO2_THRESHOLD_BAD,
    DEFAULT_VENTILATION_ADVICE_ENABLED,
)

_LOGGER = logging.getLogger(__name__)


class ComfortManagerMixin:
    """Mixin for mold protection, CO2 monitoring, and ventilation advice."""

    def _check_mold_risk(
        self,
        room: dict,
        current_temp: Optional[float],
        trv_humidity: Optional[float] = None,
    ) -> Optional[dict]:
        """
        Check mold risk for a room using humidity sensor.
        Calculates approximate dew point and flags risk when humidity is high.
        Falls back to TRV humidity attribute if no humidity_sensor is configured.
        Returns dict with humidity, dew_point, risk_level, or None if no data.
        """
        if not room.get(CONF_MOLD_PROTECTION_ENABLED, DEFAULT_MOLD_PROTECTION_ENABLED):
            return None
        humidity_sensor = room.get(CONF_HUMIDITY_SENSOR)
        humidity: Optional[float] = None
        if humidity_sensor:
            state = self.hass.states.get(humidity_sensor)
            if state and state.state not in (STATE_UNAVAILABLE, STATE_UNKNOWN):
                try:
                    humidity = float(state.state)
                except ValueError:
                    pass
        if humidity is None:
            # Fall back to TRV humidity sensor (optional)
            humidity = trv_humidity
        if humidity is None:
            return None

        threshold = float(room.get(CONF_MOLD_HUMIDITY_THRESHOLD, DEFAULT_MOLD_HUMIDITY_THRESHOLD))
        risk = humidity >= threshold

        # Magnus formula approximation for dew point
        dew_point = None
        if current_temp is not None and humidity > 0:
            a = 17.27
            b = 237.7
            alpha = ((a * current_temp) / (b + current_temp)) + math.log(humidity / 100.0)
            dew_point = round((b * alpha) / (a - alpha), 1)

        return {
            "humidity": round(humidity, 1),
            "dew_point": dew_point,
            "risk": risk,
            "threshold": threshold,
        }

    def _get_mold_temp_boost(self, room: dict, current_temp: Optional[float]) -> float:
        """
        Return temperature boost (°C) to reduce mold risk.
        When mold risk is detected, raise target temp by 1°C to reduce relative humidity.
        """
        mold = self._check_mold_risk(room, current_temp)
        if mold and mold["risk"]:
            return 1.0
        return 0.0

    def _get_outdoor_humidity(self) -> Optional[float]:
        """Read outdoor humidity from optional sensor."""
        cfg = self.get_config()
        sensor = cfg.get(CONF_OUTDOOR_HUMIDITY_SENSOR)
        if not sensor:
            return None
        state = self.hass.states.get(sensor)
        if state is None or state.state in (STATE_UNAVAILABLE, STATE_UNKNOWN):
            return None
        try:
            return float(state.state)
        except ValueError:
            return None

    def _get_room_co2(self, room: dict) -> Optional[float]:
        """Read CO2 level (ppm) from optional per-room sensor."""
        sensor = room.get(CONF_CO2_SENSOR)
        if not sensor:
            return None
        state = self.hass.states.get(sensor)
        if state is None or state.state in (STATE_UNAVAILABLE, STATE_UNKNOWN):
            return None
        try:
            return float(state.state)
        except ValueError:
            return None

    def _calculate_ventilation_advice(
        self,
        room: dict,
        current_temp: Optional[float],
        outdoor_temp: Optional[float],
        outdoor_humidity: Optional[float],
        weather_condition: Optional[str],
        total_demand: float,
        energy_price_high: bool,
    ) -> Optional[dict]:
        """
        Calculate ventilation recommendation for a room.

        Returns dict with:
          level: "urgent" | "recommended" | "possible" | "none"
          score: int
          reasons: list[str]
          co2_ppm: float | None
          room_humidity: float | None
        Returns None if ventilation advice is disabled or nothing to evaluate.
        """
        cfg = self.get_config()
        if not cfg.get(CONF_VENTILATION_ADVICE_ENABLED, DEFAULT_VENTILATION_ADVICE_ENABLED):
            return None

        score = 0
        reasons: list[str] = []

        # ── CO2 (most reliable signal if sensor present) ────────────────
        co2 = self._get_room_co2(room)
        if co2 is not None:
            bad = float(room.get(CONF_CO2_THRESHOLD_BAD, DEFAULT_CO2_THRESHOLD_BAD))
            good = float(room.get(CONF_CO2_THRESHOLD_GOOD, DEFAULT_CO2_THRESHOLD_GOOD))
            if co2 > bad:
                score += 4
                reasons.append(f"CO₂ {co2:.0f} ppm (>{ bad:.0f})")
            elif co2 > good:
                score += 2
                reasons.append(f"CO₂ {co2:.0f} ppm (mäßig)")

        # ── Indoor humidity ──────────────────────────────────────────────
        mold = self._check_mold_risk(room, current_temp)
        room_humidity = mold["humidity"] if mold else None
        if mold:
            if mold["risk"]:
                score += 3
                reasons.append(f"Luftfeuchtigkeit {mold['humidity']}% (Schimmelrisiko)")
            elif mold["humidity"] > 60:
                score += 1
                reasons.append(f"Luftfeuchtigkeit {mold['humidity']}%")

        # ── Outdoor conditions (negative factors) ───────────────────────
        BAD_CONDITIONS = {"rainy", "pouring", "fog", "hail", "snowy", "snowy-rainy"}
        if weather_condition in BAD_CONDITIONS:
            score -= 2  # outdoor air is wet/bad
        if outdoor_humidity is not None and outdoor_humidity > 85:
            score -= 2
            if score > 0:
                reasons.append(f"⚠️ Außenluftfeuchte hoch ({outdoor_humidity:.0f}%)")
        if outdoor_temp is not None and outdoor_temp < -5:
            score -= 2  # too cold – heavy heat loss
        elif outdoor_temp is not None and outdoor_temp > 28:
            score -= 1  # hotter outside than in

        # ── Heating load ─────────────────────────────────────────────────
        if total_demand > 70:
            score -= 1  # system working hard, avoid ventilation heat loss

        # ── Energy price – ventilate before expensive period ─────────────
        if energy_price_high and score >= 1:
            score += 1
            reasons.append("Hoher Strompreis – jetzt lüften spart Energie")

        # ── Skip if no sensor data at all ───────────────────────────────
        # Ventilation advice only makes sense when there is actual sensor evidence.
        # Without CO2 or humidity data there is nothing to recommend ventilation for.
        if co2 is None and mold is None:
            return None

        if score >= 4:
            level = "urgent"
        elif score >= 2:
            level = "recommended"
        elif score >= 1:
            level = "possible"
        else:
            level = "none"

        return {
            "level": level,
            "score": score,
            "reasons": reasons,
            "co2_ppm": round(co2, 0) if co2 is not None else None,
            "room_humidity": room_humidity,
        }

    @staticmethod
    def _calculate_felt_temperature(temp: float, humidity: float) -> float:
        """Calculate apparent (felt) temperature from air temperature and relative humidity.

        Uses Steadman's Apparent Temperature formula adapted for indoor use (no wind):
            e  = (rh/100) × 6.112 × exp(17.67 × T / (T + 243.5))   [hPa vapour pressure]
            AT = T + 0.348 × e − 4.25

        At typical indoor conditions (20 °C / 50 % RH) this yields ≈ 19.8 °C.
        High humidity makes warm rooms feel warmer; low humidity makes them feel cooler.
        """
        e = (humidity / 100.0) * 6.112 * math.exp(17.67 * temp / (temp + 243.5))
        return round(temp + 0.348 * e - 4.25, 1)

    def _apply_room_calibration(self, room: dict, raw_temp: Optional[float]) -> Optional[float]:
        """Apply per-room sensor calibration offset."""
        if raw_temp is None:
            return None
        offset = float(room.get(CONF_TEMP_CALIBRATION, 0.0))
        return round(raw_temp + offset, 2)
