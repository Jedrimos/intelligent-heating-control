"""
Data coordinator for Intelligent Heating Control.

Responsible for:
- Reading outdoor temperature
- Calculating heating curve target
- Evaluating schedules per room
- Calculating effective target temp (curve + schedule + offset)
- Detecting window open events
- Aggregating demands via HeatingController
- Controlling heating/cooling switch entities
- Providing debug data for the frontend panel
"""
from __future__ import annotations

import logging
import uuid
from collections import deque
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.storage import Store
from homeassistant.const import STATE_ON, STATE_OFF, STATE_UNAVAILABLE, STATE_UNKNOWN

from .const import (
    DOMAIN,
    UPDATE_INTERVAL,
    CONF_OUTDOOR_TEMP_SENSOR,
    CONF_HEATING_SWITCH,
    CONF_COOLING_SWITCH,
    CONF_HEATING_CURVE,
    CONF_DEMAND_THRESHOLD,
    CONF_DEMAND_HYSTERESIS,
    CONF_MIN_ON_TIME,
    CONF_MIN_OFF_TIME,
    CONF_MIN_ROOMS_DEMAND,
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
    CONF_WINDOW_SENSORS,
    CONF_WINDOW_OPEN_TEMP,
    CONF_WINDOW_REACTION_TIME,
    CONF_VALVE_ENTITIES,
    CONF_SCHEDULES,
    CONF_MIN_TEMP,
    CONF_MAX_TEMP,
    CONF_ENABLE_COOLING,
    CONF_SYSTEM_MODE,
    STORAGE_KEY,
    CONF_AWAY_TEMP,
    CONF_VACATION_TEMP,
    CONF_CURVE_POINTS,
    CONF_SUMMER_MODE_ENABLED,
    CONF_SUMMER_THRESHOLD,
    CONF_PRESENCE_ENTITIES,
    CONF_FROST_PROTECTION_TEMP,
    CONF_NIGHT_SETBACK_ENABLED,
    CONF_NIGHT_SETBACK_OFFSET,
    CONF_SUN_ENTITY,
    CONF_PREHEAT_MINUTES,
    # Roadmap 1.3 – Energy
    CONF_BOILER_KW,
    CONF_SOLAR_ENTITY,
    CONF_SOLAR_SURPLUS_THRESHOLD,
    CONF_SOLAR_BOOST_TEMP,
    CONF_ENERGY_PRICE_ENTITY,
    CONF_ENERGY_PRICE_THRESHOLD,
    CONF_ENERGY_PRICE_ECO_OFFSET,
    # Roadmap 1.4
    CONF_TEMP_CALIBRATION,
    CONF_ROOM_PRESENCE_ENTITIES,
    CONF_FLOW_TEMP_ENTITY,
    # Roadmap 1.1
    CONF_TEMP_HISTORY_SIZE,
    DEFAULT_SUMMER_THRESHOLD,
    DEFAULT_FROST_PROTECTION_TEMP,
    DEFAULT_NIGHT_SETBACK_OFFSET,
    DEFAULT_PREHEAT_MINUTES,
    DEFAULT_BOILER_KW,
    DEFAULT_SOLAR_SURPLUS_THRESHOLD,
    DEFAULT_SOLAR_BOOST_TEMP,
    DEFAULT_ENERGY_PRICE_THRESHOLD,
    DEFAULT_ENERGY_PRICE_ECO_OFFSET,
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
    ROOM_MODE_AUTO,
    ROOM_MODE_COMFORT,
    ROOM_MODE_ECO,
    ROOM_MODE_SLEEP,
    ROOM_MODE_AWAY,
    ROOM_MODE_OFF,
    ROOM_MODE_MANUAL,
    SYSTEM_MODE_AUTO,
    SYSTEM_MODE_OFF,
    SYSTEM_MODE_AWAY,
    SYSTEM_MODE_VACATION,
)
from .heating_curve import HeatingCurve
from .schedule_manager import ScheduleManager
from .heating_controller import HeatingController

_LOGGER = logging.getLogger(__name__)


class IHCCoordinator(DataUpdateCoordinator):
    """Central coordinator for Intelligent Heating Control."""

    def __init__(self, hass: HomeAssistant, config_entry) -> None:
        super().__init__(
            hass,
            _LOGGER,
            name=DOMAIN,
            update_interval=timedelta(seconds=UPDATE_INTERVAL),
        )
        self._config_entry = config_entry
        self._entry_id = config_entry.entry_id

        # Persistent storage for runtime state
        self._store: Store = Store(hass, 1, f"{STORAGE_KEY}.{config_entry.entry_id}")

        # Runtime state (persisted via Store)
        self._system_mode: str = SYSTEM_MODE_AUTO
        self._room_modes: Dict[str, str] = {}
        self._room_manual_temps: Dict[str, float] = {}
        self._window_open_counters: Dict[str, int] = {}  # room_id → consecutive drops
        self._boost_until: Dict[str, datetime] = {}  # room_id → boost expiry time

        # Presence-based auto-away
        self._presence_away_active: bool = False  # True when auto-away triggered by presence

        # Energy / runtime tracking
        self._heating_started_at: Optional[datetime] = None
        self._heating_runtime_today: float = 0.0       # total seconds today
        self._room_demand_started: Dict[str, datetime] = {}  # room_id → when demand went > 0
        self._room_runtime_today: Dict[str, float] = {}      # room_id → seconds today
        self._runtime_day: int = datetime.now().day           # to detect day rollover

        # Flag: suppress the update_listener reload for internal option writes
        self._suppress_reload: bool = False

        # Roadmap 1.1 – Temperature history per room (deque of (ts_iso, temp) tuples)
        self._temp_history: Dict[str, deque] = {}

        # Roadmap 1.1 – Warmup tracking (for predictive pre-heating)
        self._warmup_start: Dict[str, Optional[datetime]] = {}    # room_id → when heat request started
        self._warmup_history: Dict[str, List[float]] = {}          # room_id → list of warmup minutes

        # Build sub-components from config
        self._rebuild_from_config()

    # ------------------------------------------------------------------
    # Configuration helpers
    # ------------------------------------------------------------------

    def _rebuild_from_config(self) -> None:
        """Re-build all sub-components from the current config entry options."""
        opts = dict(self._config_entry.data)
        opts.update(self._config_entry.options)

        # Heating curve – fall back to defaults if saved curve has fewer than 2 points
        curve_points = opts.get(CONF_HEATING_CURVE, {}).get(
            CONF_CURVE_POINTS, DEFAULT_HEATING_CURVE
        )
        if not isinstance(curve_points, list) or len(curve_points) < 2:
            _LOGGER.warning("IHC: Heating curve has < 2 points, using defaults")
            curve_points = DEFAULT_HEATING_CURVE
        self._heating_curve = HeatingCurve(curve_points)

        # Schedule managers per room
        rooms = opts.get(CONF_ROOMS, [])
        self._schedule_managers: Dict[str, ScheduleManager] = {}
        for room in rooms:
            rid = room.get(CONF_ROOM_ID, "")
            schedules = room.get(CONF_SCHEDULES, [])
            self._schedule_managers[rid] = ScheduleManager(schedules)

        # Heating controller (Klimabaustein)
        self._controller = HeatingController(
            demand_threshold=float(opts.get(CONF_DEMAND_THRESHOLD, DEFAULT_DEMAND_THRESHOLD)),
            demand_hysteresis=float(opts.get(CONF_DEMAND_HYSTERESIS, DEFAULT_DEMAND_HYSTERESIS)),
            min_on_time=int(opts.get(CONF_MIN_ON_TIME, DEFAULT_MIN_ON_TIME)),
            min_off_time=int(opts.get(CONF_MIN_OFF_TIME, DEFAULT_MIN_OFF_TIME)),
            min_rooms_demand=int(opts.get(CONF_MIN_ROOMS_DEMAND, DEFAULT_MIN_ROOMS_DEMAND)),
        )

    async def async_load_runtime_state(self) -> None:
        """Load persisted runtime state (system_mode, room_modes, manual temps) from Store."""
        data = await self._store.async_load()
        if not data:
            return
        self._system_mode = data.get("system_mode", SYSTEM_MODE_AUTO)
        self._room_modes = data.get("room_modes", {})
        self._room_manual_temps = data.get("room_manual_temps", {})

    async def _async_save_runtime_state(self) -> None:
        """Persist current runtime state to Store."""
        await self._store.async_save({
            "system_mode": self._system_mode,
            "room_modes": self._room_modes,
            "room_manual_temps": self._room_manual_temps,
        })

    def get_config(self) -> dict:
        """Return merged config (data + options)."""
        cfg = dict(self._config_entry.data)
        cfg.update(self._config_entry.options)
        return cfg

    def get_rooms(self) -> list:
        return self.get_config().get(CONF_ROOMS, [])

    def get_room_config(self, room_id: str) -> Optional[dict]:
        return next((r for r in self.get_rooms() if r.get(CONF_ROOM_ID) == room_id), None)

    # ------------------------------------------------------------------
    # Room / system mode management
    # ------------------------------------------------------------------

    def set_system_mode(self, mode: str) -> None:
        self._system_mode = mode
        self.hass.async_create_task(self._async_save_runtime_state())
        self.hass.async_create_task(self.async_request_refresh())

    def get_system_mode(self) -> str:
        return self._system_mode

    def set_room_mode(self, room_id: str, mode: str) -> None:
        self._room_modes[room_id] = mode
        self.hass.async_create_task(self._async_save_runtime_state())
        self.hass.async_create_task(self.async_request_refresh())

    def get_room_mode(self, room_id: str) -> str:
        return self._room_modes.get(room_id, ROOM_MODE_AUTO)

    def set_room_manual_temp(self, room_id: str, temp: float) -> None:
        self._room_manual_temps[room_id] = temp
        self._room_modes[room_id] = ROOM_MODE_MANUAL
        self.hass.async_create_task(self._async_save_runtime_state())
        self.hass.async_create_task(self.async_request_refresh())

    def get_room_manual_temp(self, room_id: str) -> Optional[float]:
        return self._room_manual_temps.get(room_id)

    def set_room_boost(self, room_id: str, duration_minutes: int = 60) -> None:
        """Activate boost mode for a room for the given duration."""
        self._boost_until[room_id] = datetime.now() + timedelta(minutes=duration_minutes)
        self._room_modes[room_id] = ROOM_MODE_COMFORT
        self.hass.async_create_task(self._async_save_runtime_state())
        self.hass.async_create_task(self.async_request_refresh())

    def cancel_room_boost(self, room_id: str) -> None:
        """Cancel boost mode for a room."""
        self._boost_until.pop(room_id, None)
        if self._room_modes.get(room_id) == ROOM_MODE_COMFORT:
            self._room_modes[room_id] = ROOM_MODE_AUTO
        self.hass.async_create_task(self._async_save_runtime_state())
        self.hass.async_create_task(self.async_request_refresh())

    def get_boost_remaining_minutes(self, room_id: str) -> int:
        """Return remaining boost minutes, 0 if not active."""
        expiry = self._boost_until.get(room_id)
        if expiry is None:
            return 0
        remaining = (expiry - datetime.now()).total_seconds() / 60
        return max(0, int(remaining))

    def _check_boost_expiry(self) -> None:
        """Expire boost modes that have timed out."""
        now = datetime.now()
        expired = [rid for rid, expiry in self._boost_until.items() if now >= expiry]
        for rid in expired:
            del self._boost_until[rid]
            if self._room_modes.get(rid) == ROOM_MODE_COMFORT:
                self._room_modes[rid] = ROOM_MODE_AUTO

    def _is_summer_mode_active(self) -> bool:
        """Return True if Sommerautomatik should block heating."""
        cfg = self.get_config()
        if not cfg.get(CONF_SUMMER_MODE_ENABLED, False):
            return False
        threshold = float(cfg.get(CONF_SUMMER_THRESHOLD, DEFAULT_SUMMER_THRESHOLD))
        outdoor_temp = self._get_outdoor_temp()
        if outdoor_temp is None:
            return False
        return outdoor_temp >= threshold

    # ------------------------------------------------------------------
    # Presence detection
    # ------------------------------------------------------------------

    def _check_presence(self) -> bool:
        """
        Return True if at least one tracked person is home.

        Checks `presence_entities` list (person.* or device_tracker.*).
        If no entities configured, always returns True (unknown = home).
        """
        cfg = self.get_config()
        entities: list = cfg.get(CONF_PRESENCE_ENTITIES, [])
        if not entities:
            return True  # no tracking configured → assume home

        home_states = {"home", "on", STATE_ON}
        for entity_id in entities:
            if not entity_id:
                continue
            state = self.hass.states.get(entity_id)
            if state and state.state.lower() in home_states:
                return True
        return False

    def _update_presence_auto_away(self) -> None:
        """
        Auto-switch system mode to AWAY when everyone leaves,
        and back to AUTO when someone returns.
        Only acts when system_mode is currently AUTO (or already presence-away).
        """
        someone_home = self._check_presence()
        cfg = self.get_config()
        entities: list = cfg.get(CONF_PRESENCE_ENTITIES, [])
        if not entities:
            return  # feature disabled

        if not someone_home and self._system_mode == SYSTEM_MODE_AUTO:
            _LOGGER.info("IHC: All persons away – activating auto-away mode")
            self._system_mode = SYSTEM_MODE_AWAY
            self._presence_away_active = True
            self.hass.async_create_task(self._async_save_runtime_state())

        elif someone_home and self._presence_away_active:
            _LOGGER.info("IHC: Person arrived home – restoring auto mode")
            self._system_mode = SYSTEM_MODE_AUTO
            self._presence_away_active = False
            self.hass.async_create_task(self._async_save_runtime_state())

    # ------------------------------------------------------------------
    # Night setback
    # ------------------------------------------------------------------

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

    # ------------------------------------------------------------------
    # Frost protection
    # ------------------------------------------------------------------

    def _get_frost_protection_temp(self) -> float:
        cfg = self.get_config()
        return float(cfg.get(CONF_FROST_PROTECTION_TEMP, DEFAULT_FROST_PROTECTION_TEMP))

    # ------------------------------------------------------------------
    # Roadmap 1.1 – Temperature history
    # ------------------------------------------------------------------

    def _update_temp_history(self, room_id: str, current_temp: Optional[float]) -> None:
        """Append the current temperature reading to the per-room history deque."""
        if current_temp is None:
            return
        history = self._temp_history.setdefault(
            room_id, deque(maxlen=CONF_TEMP_HISTORY_SIZE)
        )
        ts = datetime.now().strftime("%H:%M")
        history.append({"t": ts, "v": round(current_temp, 1)})

    def get_temp_history(self, room_id: str) -> list:
        return list(self._temp_history.get(room_id, []))

    def _update_warmup_tracking(self, room_id: str, was_cold: bool, is_now_warm: bool) -> None:
        """Track how long a room took to warm up (predictive pre-heating data)."""
        if was_cold and self._warmup_start.get(room_id) is None:
            self._warmup_start[room_id] = datetime.now()
        if is_now_warm and self._warmup_start.get(room_id) is not None:
            minutes = (datetime.now() - self._warmup_start[room_id]).total_seconds() / 60
            history = self._warmup_history.setdefault(room_id, [])
            history.append(round(minutes, 1))
            if len(history) > 10:
                history.pop(0)
            self._warmup_start[room_id] = None

    def get_avg_warmup_minutes(self, room_id: str) -> Optional[float]:
        """Average warmup duration in minutes for predictive pre-heating."""
        history = self._warmup_history.get(room_id, [])
        if not history:
            return None
        return round(sum(history) / len(history), 1)

    # ------------------------------------------------------------------
    # Roadmap 1.3 – Solar surplus & dynamic energy pricing
    # ------------------------------------------------------------------

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
            return float(cfg.get(CONF_ENERGY_PRICE_ECO_OFFSET, DEFAULT_ENERGY_PRICE_ECO_OFFSET))
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

    # ------------------------------------------------------------------
    # Roadmap 1.4 – Room sensor calibration & flow temp
    # ------------------------------------------------------------------

    def _apply_room_calibration(self, room: dict, raw_temp: Optional[float]) -> Optional[float]:
        """Apply per-room sensor calibration offset."""
        if raw_temp is None:
            return None
        offset = float(room.get(CONF_TEMP_CALIBRATION, 0.0))
        return round(raw_temp + offset, 2)

    def _check_room_presence(self, room: dict) -> bool:
        """
        Return True if someone is present for this specific room.
        If no room_presence_entities configured, always returns True.
        """
        entities: list = room.get(CONF_ROOM_PRESENCE_ENTITIES, [])
        if not entities:
            return True
        home_states = {"home", "on", STATE_ON}
        for entity_id in entities:
            if not entity_id:
                continue
            state = self.hass.states.get(entity_id)
            if state and state.state.lower() in home_states:
                return True
        return False

    def _set_flow_temp(self, flow_temp: float) -> None:
        """Set the boiler flow temperature via a number entity."""
        cfg = self.get_config()
        flow_entity = cfg.get(CONF_FLOW_TEMP_ENTITY)
        if not flow_entity:
            return
        self.hass.async_create_task(
            self.hass.services.async_call(
                "number", "set_value",
                {"entity_id": flow_entity, "value": round(flow_temp, 1)},
            )
        )

    def _calculate_flow_temp(self, outdoor_temp: Optional[float], total_demand: float) -> Optional[float]:
        """
        Calculate boiler flow temperature from outdoor temp + demand.
        Simple linear: higher demand or lower outdoor temp → higher flow temp.
        """
        if outdoor_temp is None:
            return None
        # Base flow temp from outdoor: cold outside → higher flow
        base = 70.0 - (outdoor_temp * 1.5)
        base = max(30.0, min(80.0, base))
        # Modulate by demand (0–100 → ±10°C)
        base += (total_demand / 100.0) * 10.0 - 5.0
        return round(max(30.0, min(80.0, base)), 1)

    # ------------------------------------------------------------------
    # Energy / runtime tracking
    # ------------------------------------------------------------------

    def _reset_runtime_if_new_day(self) -> None:
        today = datetime.now().day
        if today != self._runtime_day:
            self._heating_runtime_today = 0.0
            self._room_runtime_today = {}
            self._runtime_day = today

    def _update_runtime_tracking(self, should_heat: bool, room_data: dict) -> None:
        """Track heating on-times for energy statistics."""
        now = datetime.now()
        self._reset_runtime_if_new_day()

        # Global heating runtime
        if should_heat:
            if self._heating_started_at is None:
                self._heating_started_at = now
        else:
            if self._heating_started_at is not None:
                elapsed = (now - self._heating_started_at).total_seconds()
                self._heating_runtime_today += elapsed
                self._heating_started_at = None

        # Per-room demand runtime (demand > 0 counts as "room heating")
        for room_id, rdata in room_data.items():
            demand = rdata.get("demand", 0.0)
            if demand > 0 and should_heat:
                if room_id not in self._room_demand_started:
                    self._room_demand_started[room_id] = now
            else:
                started = self._room_demand_started.pop(room_id, None)
                if started is not None:
                    elapsed = (now - started).total_seconds()
                    self._room_runtime_today[room_id] = (
                        self._room_runtime_today.get(room_id, 0.0) + elapsed
                    )

    def get_heating_runtime_today_minutes(self) -> float:
        """Total heating runtime today in minutes (including current session)."""
        total = self._heating_runtime_today
        if self._heating_started_at is not None:
            total += (datetime.now() - self._heating_started_at).total_seconds()
        return round(total / 60.0, 1)

    def get_room_runtime_today_minutes(self, room_id: str) -> float:
        """Room heating demand runtime today in minutes."""
        total = self._room_runtime_today.get(room_id, 0.0)
        started = self._room_demand_started.get(room_id)
        if started is not None:
            total += (datetime.now() - started).total_seconds()
        return round(total / 60.0, 1)

    # ------------------------------------------------------------------
    # Temperature calculation logic
    # ------------------------------------------------------------------

    def _get_outdoor_temp(self) -> Optional[float]:
        cfg = self.get_config()
        sensor = cfg.get(CONF_OUTDOOR_TEMP_SENSOR)
        if not sensor:
            return None
        state = self.hass.states.get(sensor)
        if state is None or state.state in (STATE_UNAVAILABLE, STATE_UNKNOWN):
            return None
        try:
            return float(state.state)
        except ValueError:
            return None

    def _get_sensor_temp(self, sensor_entity: str) -> Optional[float]:
        if not sensor_entity:
            return None
        state = self.hass.states.get(sensor_entity)
        if state is None or state.state in (STATE_UNAVAILABLE, STATE_UNKNOWN):
            return None
        try:
            return float(state.state)
        except ValueError:
            return None

    def _is_window_open(self, room: dict, current_temp: Optional[float]) -> bool:
        """
        Detect window open state.
        1. Multiple window/door sensors (window_sensors list) if configured.
        2. Single window sensor (window_sensor) as fallback.
        3. Temperature drop detection (future implementation).
        """
        # Check list of window sensors first (new multi-sensor support)
        window_sensors: list = room.get(CONF_WINDOW_SENSORS, [])
        for sensor in window_sensors:
            if sensor:
                state = self.hass.states.get(sensor)
                if state and state.state == STATE_ON:
                    return True

        # Legacy single window sensor
        window_sensor = room.get(CONF_WINDOW_SENSOR)
        if window_sensor:
            state = self.hass.states.get(window_sensor)
            if state and state.state == STATE_ON:
                return True

        return False

    def _calculate_target_temp(self, room: dict, outdoor_temp: Optional[float]) -> tuple[float, dict]:
        """
        Calculate the effective target temperature for a room.

        Priority (highest wins):
          1. System mode override (AWAY, VACATION → fixed global temp)
          2. Room mode override (COMFORT, ECO, SLEEP, AWAY, OFF, MANUAL)
          3. Active schedule period temperature
          4. Heating curve target + room offset (default)

        Returns (effective_target_temp, metadata_dict)
        """
        room_id = room.get(CONF_ROOM_ID, "")
        room_offset = float(room.get(CONF_ROOM_OFFSET, 0.0))
        min_temp = float(room.get(CONF_MIN_TEMP, DEFAULT_MIN_TEMP))
        max_temp = float(room.get(CONF_MAX_TEMP, DEFAULT_MAX_TEMP))

        cfg = self.get_config()
        room_mode = self.get_room_mode(room_id)
        system_mode = self._system_mode

        frost_temp = self._get_frost_protection_temp()

        # --- 1. System mode overrides ---
        if system_mode == SYSTEM_MODE_OFF:
            # Frost protection: even in OFF we keep a minimum
            return frost_temp, {"source": "frost_protection", "schedule_active": False}

        if system_mode == SYSTEM_MODE_AWAY:
            away_temp = float(cfg.get(CONF_AWAY_TEMP, DEFAULT_AWAY_TEMP))
            # Frost protection: away temp must be at least frost_temp
            return max(away_temp, frost_temp), {"source": "system_away", "schedule_active": False}

        if system_mode == SYSTEM_MODE_VACATION:
            vac_temp = float(cfg.get(CONF_VACATION_TEMP, DEFAULT_VACATION_TEMP))
            return max(vac_temp, frost_temp), {"source": "system_vacation", "schedule_active": False}

        # --- 1b. Room-specific presence auto-eco (Roadmap 1.2) ---
        if not self._check_room_presence(room) and room_mode == ROOM_MODE_AUTO:
            eco = float(room.get(CONF_ECO_TEMP, DEFAULT_ECO_TEMP))
            return min(max_temp, max(min_temp, eco + room_offset)), {
                "source": "room_presence_eco", "schedule_active": False
            }

        # --- 2. Room mode preset overrides ---
        if room_mode == ROOM_MODE_OFF:
            return min_temp, {"source": "room_off", "schedule_active": False}

        if room_mode == ROOM_MODE_AWAY:
            away_r = float(room.get(CONF_AWAY_TEMP_ROOM, DEFAULT_AWAY_TEMP_ROOM))
            return away_r, {"source": "room_away", "schedule_active": False}

        if room_mode == ROOM_MODE_COMFORT:
            comfort = float(room.get(CONF_COMFORT_TEMP, DEFAULT_COMFORT_TEMP))
            return min(max_temp, max(min_temp, comfort + room_offset)), {
                "source": "comfort", "schedule_active": False
            }

        if room_mode == ROOM_MODE_ECO:
            eco = float(room.get(CONF_ECO_TEMP, DEFAULT_ECO_TEMP))
            return min(max_temp, max(min_temp, eco + room_offset)), {
                "source": "eco", "schedule_active": False
            }

        if room_mode == ROOM_MODE_SLEEP:
            sleep = float(room.get(CONF_SLEEP_TEMP, DEFAULT_SLEEP_TEMP))
            return min(max_temp, max(min_temp, sleep + room_offset)), {
                "source": "sleep", "schedule_active": False
            }

        if room_mode == ROOM_MODE_MANUAL:
            manual = self.get_room_manual_temp(room_id)
            if manual is not None:
                return min(max_temp, max(min_temp, manual)), {
                    "source": "manual", "schedule_active": False
                }

        # Determine night setback modifier (applied to schedule and curve temps)
        night_setback = 0.0
        night_active = self._is_night_setback_active()
        if night_active:
            night_setback = float(cfg.get(CONF_NIGHT_SETBACK_OFFSET, DEFAULT_NIGHT_SETBACK_OFFSET))

        # Pre-heat window: look ahead into schedule to decide if we should heat early
        preheat_minutes = int(cfg.get(CONF_PREHEAT_MINUTES, DEFAULT_PREHEAT_MINUTES))

        # --- 3. Active schedule or upcoming pre-heat period ---
        schedule_mgr = self._schedule_managers.get(room_id)
        if schedule_mgr:
            active_period = schedule_mgr.get_active_period()

            # Pre-heat: if no active period but an upcoming one starts within preheat_minutes
            if active_period is None and preheat_minutes > 0:
                active_period = schedule_mgr.get_upcoming_period(preheat_minutes)
                if active_period:
                    source_tag = "preheat"
                else:
                    source_tag = "schedule"
            else:
                source_tag = "schedule"

            if active_period:
                sched_temp = float(active_period["temperature"])
                sched_offset = float(active_period.get("offset", 0.0))
                # Schedule temp + per-period offset + room offset - night setback
                target = sched_temp + sched_offset + room_offset - night_setback
                target = min(max_temp, max(min_temp, target))
                return target, {
                    "source": source_tag,
                    "schedule_active": True,
                    "period_start": active_period["start"],
                    "period_end": active_period["end"],
                    "schedule_base": sched_temp,
                    "schedule_offset": sched_offset,
                    "night_setback": night_setback,
                }

        # --- 4. Heating curve + room offset (default / outside schedule) ---
        if outdoor_temp is not None:
            curve_target = self._heating_curve.get_target_temp(outdoor_temp)
        else:
            # Fallback: use comfort temp if no outdoor sensor available
            curve_target = float(room.get(CONF_COMFORT_TEMP, DEFAULT_COMFORT_TEMP))

        target = curve_target + room_offset - night_setback
        target = min(max_temp, max(min_temp, target))
        return target, {
            "source": "heating_curve",
            "schedule_active": False,
            "curve_base": curve_target,
            "room_offset": room_offset,
            "night_setback": night_setback,
        }

    # ------------------------------------------------------------------
    # Control output
    # ------------------------------------------------------------------

    def _set_heating_switch(self, active: bool) -> None:
        cfg = self.get_config()
        switch_entity = cfg.get(CONF_HEATING_SWITCH)
        if not switch_entity:
            return
        service = "turn_on" if active else "turn_off"
        self.hass.async_create_task(
            self.hass.services.async_call(
                "homeassistant", service, {"entity_id": switch_entity}
            )
        )

    def _set_cooling_switch(self, active: bool) -> None:
        cfg = self.get_config()
        switch_entity = cfg.get(CONF_COOLING_SWITCH)
        if not switch_entity:
            return
        service = "turn_on" if active else "turn_off"
        self.hass.async_create_task(
            self.hass.services.async_call(
                "homeassistant", service, {"entity_id": switch_entity}
            )
        )

    def _set_valve_entity(self, valve_entity: str, target_temp: float) -> None:
        """Set setpoint on a single TRV / climate entity."""
        if not valve_entity:
            return
        state = self.hass.states.get(valve_entity)
        if state is None:
            return
        if valve_entity.split(".")[0] == "climate":
            self.hass.async_create_task(
                self.hass.services.async_call(
                    "climate",
                    "set_temperature",
                    {"entity_id": valve_entity, "temperature": target_temp},
                )
            )

    def _set_valve_entities(self, room: dict, target_temp: float) -> None:
        """Set setpoint on all TRV / climate entities configured for a room."""
        # New: list of valve entities
        for entity in room.get(CONF_VALVE_ENTITIES, []):
            if entity:
                self._set_valve_entity(entity, target_temp)
        # Legacy: single valve entity
        single = room.get(CONF_VALVE_ENTITY)
        if single and single not in room.get(CONF_VALVE_ENTITIES, []):
            self._set_valve_entity(single, target_temp)

    # ------------------------------------------------------------------
    # Main update cycle
    # ------------------------------------------------------------------

    async def _async_update_data(self) -> dict:
        """
        Main update cycle - called every UPDATE_INTERVAL seconds.

        Returns the full data dict that entities read from.
        """
        # Expire any boost timers
        self._check_boost_expiry()

        # Presence-based auto-away
        self._update_presence_auto_away()

        outdoor_temp = self._get_outdoor_temp()
        curve_target = (
            self._heating_curve.get_target_temp(outdoor_temp)
            if outdoor_temp is not None
            else None
        )
        summer_mode = self._is_summer_mode_active()

        room_data: Dict[str, dict] = {}

        solar_boost = self._get_solar_boost()
        price_eco_offset = self._get_energy_price_eco_offset()

        for room in self.get_rooms():
            room_id = room.get(CONF_ROOM_ID, "")
            if not room_id:
                continue

            temp_sensor = room.get(CONF_TEMP_SENSOR, "")
            raw_temp = self._get_sensor_temp(temp_sensor)
            current_temp = self._apply_room_calibration(room, raw_temp)  # Roadmap 1.4
            window_open = self._is_window_open(room, current_temp)
            room_mode = self.get_room_mode(room_id)
            deadband = float(room.get(CONF_DEADBAND, DEFAULT_DEADBAND))
            weight = float(room.get(CONF_WEIGHT, DEFAULT_WEIGHT))

            # Update temperature history (Roadmap 1.1)
            self._update_temp_history(room_id, current_temp)

            target_temp, meta = self._calculate_target_temp(room, outdoor_temp)

            # Apply solar boost (Roadmap 1.3)
            if solar_boost > 0 and meta.get("source") not in ("frost_protection", "system_away", "system_vacation", "room_off"):
                target_temp = min(float(room.get(CONF_MAX_TEMP, DEFAULT_MAX_TEMP)), target_temp + solar_boost)
                meta["solar_boost"] = solar_boost

            # Apply energy price eco offset (Roadmap 1.3)
            if price_eco_offset > 0 and meta.get("source") not in ("frost_protection", "system_away", "system_vacation", "room_off"):
                target_temp = max(float(room.get(CONF_MIN_TEMP, DEFAULT_MIN_TEMP)), target_temp - price_eco_offset)
                meta["price_eco_offset"] = price_eco_offset

            # Update controller state for this room
            controller_state = self._controller.update_room(
                room_id=room_id,
                current_temp=current_temp,
                target_temp=target_temp,
                deadband=deadband,
                weight=weight,
                window_open=window_open,
                room_mode=room_mode,
                manual_temp=self.get_room_manual_temp(room_id),
            )

            # Propagate setpoint to all TRV / climate entities
            if not window_open and room_mode != ROOM_MODE_OFF:
                self._set_valve_entities(room, target_temp)

            room_data[room_id] = {
                "name": room.get(CONF_ROOM_NAME, room_id),
                "current_temp": current_temp,
                "target_temp": target_temp,
                "demand": controller_state["demand"],
                "window_open": window_open,
                "room_mode": room_mode,
                "manual_temp": self.get_room_manual_temp(room_id),
                "boost_remaining": self.get_boost_remaining_minutes(room_id),
                "temp_history": self.get_temp_history(room_id),     # Roadmap 1.1
                "avg_warmup_minutes": self.get_avg_warmup_minutes(room_id),
                # Ensure night_setback is always present (meta may omit it for mode overrides)
                "night_setback": 0.0,
                **meta,
            }

        # Klimabaustein decision
        cfg = self.get_config()
        enable_cooling = bool(cfg.get(CONF_ENABLE_COOLING, False))
        # Sommerautomatik: block heating if outdoor temp exceeds threshold
        should_heat = False if summer_mode else self._controller.should_heat(self._system_mode)
        should_cool = self._controller.should_cool(self._system_mode) if enable_cooling else False
        total_demand = self._controller.get_total_demand()
        rooms_demanding = self._controller.get_rooms_demanding()

        # Track energy / runtime
        self._update_runtime_tracking(should_heat, room_data)

        # Add per-room runtime to room_data
        for room_id in room_data:
            room_data[room_id]["runtime_today_minutes"] = self.get_room_runtime_today_minutes(room_id)

        # Control the physical heating/cooling switches
        self._set_heating_switch(should_heat)
        if enable_cooling:
            self._set_cooling_switch(should_cool)

        # Roadmap 1.4 – Set boiler flow temp
        flow_temp = self._calculate_flow_temp(outdoor_temp, total_demand)
        if should_heat and flow_temp is not None:
            self._set_flow_temp(flow_temp)

        night_setback_active = self._is_night_setback_active()

        # Roadmap 1.3 – Energy cost estimate
        cfg = self.get_config()
        boiler_kw = float(cfg.get(CONF_BOILER_KW, DEFAULT_BOILER_KW))
        energy_today_kwh = round(self.get_heating_runtime_today_minutes() / 60.0 * boiler_kw, 2)

        return {
            "outdoor_temp": outdoor_temp,
            "curve_target": curve_target,
            "total_demand": total_demand,
            "rooms_demanding": rooms_demanding,
            "heating_active": should_heat,
            "cooling_active": should_cool,
            "summer_mode": summer_mode,
            "night_setback_active": night_setback_active,
            "presence_away_active": self._presence_away_active,
            "system_mode": self._system_mode,
            "heating_runtime_today": self.get_heating_runtime_today_minutes(),
            "energy_today_kwh": energy_today_kwh,
            "solar_boost": solar_boost,
            "solar_power": self._get_solar_power(),
            "energy_price": self._get_current_energy_price(),
            "energy_price_eco_offset": price_eco_offset,
            "flow_temp": flow_temp,
            "rooms": room_data,
            "debug": self._controller.get_debug_info(),
        }

    # ------------------------------------------------------------------
    # Config management (add/remove/update rooms)
    # ------------------------------------------------------------------

    async def async_add_room(self, room_config: dict) -> str:
        """Add a new room. Returns the new room_id."""
        if not room_config.get(CONF_ROOM_ID):
            room_config[CONF_ROOM_ID] = str(uuid.uuid4())[:8]

        new_options = dict(self._config_entry.options)
        rooms = list(new_options.get(CONF_ROOMS, []))
        rooms.append(room_config)
        new_options[CONF_ROOMS] = rooms

        self.hass.config_entries.async_update_entry(
            self._config_entry, options=new_options
        )
        self._rebuild_from_config()
        await self.async_request_refresh()
        return room_config[CONF_ROOM_ID]

    async def async_remove_room(self, room_id: str) -> None:
        """Remove a room by ID."""
        new_options = dict(self._config_entry.options)
        rooms = [r for r in new_options.get(CONF_ROOMS, []) if r.get(CONF_ROOM_ID) != room_id]
        new_options[CONF_ROOMS] = rooms
        self.hass.config_entries.async_update_entry(
            self._config_entry, options=new_options
        )
        self._room_modes.pop(room_id, None)
        self._room_manual_temps.pop(room_id, None)
        self._schedule_managers.pop(room_id, None)
        self._rebuild_from_config()
        await self.async_request_refresh()

    async def async_update_room(self, room_id: str, updates: dict) -> None:
        """Update a room's configuration (no entity changes → no reload needed)."""
        new_options = dict(self._config_entry.options)
        rooms = list(new_options.get(CONF_ROOMS, []))
        for i, room in enumerate(rooms):
            if room.get(CONF_ROOM_ID) == room_id:
                rooms[i] = {**room, **updates}
                break
        new_options[CONF_ROOMS] = rooms
        self._suppress_reload = True
        try:
            self.hass.config_entries.async_update_entry(
                self._config_entry, options=new_options
            )
        finally:
            self._suppress_reload = False
        self._rebuild_from_config()
        await self.async_request_refresh()

    async def async_update_global_settings(self, updates: dict) -> None:
        """Update global settings (threshold, curve, etc.) – no entity changes → no reload."""
        new_options = dict(self._config_entry.options)
        new_options.update(updates)
        self._suppress_reload = True
        try:
            self.hass.config_entries.async_update_entry(
                self._config_entry, options=new_options
            )
        finally:
            self._suppress_reload = False
        self._rebuild_from_config()
        await self.async_request_refresh()
