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
import math
import time
import uuid
from collections import deque
from datetime import date, datetime, timedelta
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
    CONF_AWAY_TEMP_ROOM,
    CONF_WINDOW_SENSOR,
    CONF_WINDOW_SENSORS,
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
    DEFAULT_AWAY_TEMP_ROOM,
    DEFAULT_AWAY_TEMP,
    DEFAULT_VACATION_TEMP,
    DEFAULT_MIN_TEMP,
    DEFAULT_MAX_TEMP,
    DEFAULT_HEATING_CURVE,
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
    SYSTEM_MODE_COOL,
    SYSTEM_MODE_HEAT,
    # Roadmap 1.2 – Vacation assistant
    CONF_VACATION_START,
    CONF_VACATION_END,
    # Roadmap 2.0 – New features
    CONF_CONTROLLER_MODE,
    CONTROLLER_MODE_SWITCH,
    CONTROLLER_MODE_TRV,
    DEFAULT_CONTROLLER_MODE,
    SYSTEM_MODE_GUEST,
    CONF_GUEST_DURATION_HOURS,
    DEFAULT_GUEST_DURATION_HOURS,
    CONF_VACATION_RETURN_PREHEAT_DAYS,
    DEFAULT_VACATION_RETURN_PREHEAT_DAYS,
    CONF_WEATHER_ENTITY,
    CONF_WEATHER_COLD_THRESHOLD,
    DEFAULT_WEATHER_COLD_THRESHOLD,
    CONF_WEATHER_COLD_BOOST,
    DEFAULT_WEATHER_COLD_BOOST,
    CONF_HA_SCHEDULES,
    CONF_ECO_OFFSET,
    CONF_SLEEP_OFFSET,
    CONF_AWAY_OFFSET,
    CONF_ECO_MAX_TEMP,
    CONF_SLEEP_MAX_TEMP,
    CONF_AWAY_MAX_TEMP,
    CONF_HA_SCHEDULE_OFF_MODE,
    DEFAULT_ECO_OFFSET,
    DEFAULT_SLEEP_OFFSET,
    DEFAULT_AWAY_OFFSET,
    DEFAULT_ECO_MAX_TEMP,
    DEFAULT_SLEEP_MAX_TEMP,
    DEFAULT_AWAY_MAX_TEMP,
    DEFAULT_HA_SCHEDULE_OFF_MODE,
    CONF_HUMIDITY_SENSOR,
    CONF_MOLD_PROTECTION_ENABLED,
    CONF_MOLD_HUMIDITY_THRESHOLD,
    DEFAULT_MOLD_HUMIDITY_THRESHOLD,
    DEFAULT_MOLD_PROTECTION_ENABLED,
    # Ventilation advice
    CONF_OUTDOOR_HUMIDITY_SENSOR,
    CONF_CO2_SENSOR,
    CONF_CO2_THRESHOLD_GOOD,
    CONF_CO2_THRESHOLD_BAD,
    DEFAULT_CO2_THRESHOLD_GOOD,
    DEFAULT_CO2_THRESHOLD_BAD,
    CONF_VENTILATION_ADVICE_ENABLED,
    DEFAULT_VENTILATION_ADVICE_ENABLED,
    # Per-room energy / HKV
    CONF_RADIATOR_KW,
    CONF_HKV_SENSOR,
    CONF_HKV_FACTOR,
    DEFAULT_RADIATOR_KW,
    DEFAULT_HKV_FACTOR,
    # v1.3 – Adaptive curve & predictive pre-heat
    CONF_ADAPTIVE_CURVE_ENABLED,
    CONF_ADAPTIVE_CURVE_MAX_DELTA,
    DEFAULT_ADAPTIVE_CURVE_ENABLED,
    DEFAULT_ADAPTIVE_CURVE_MAX_DELTA,
    CONF_ADAPTIVE_PREHEAT_ENABLED,
    DEFAULT_ADAPTIVE_PREHEAT_ENABLED,
    # v1.4 – ETA pre-heat, vacation calendar
    CONF_ETA_PREHEAT_ENABLED,
    DEFAULT_ETA_PREHEAT_ENABLED,
    CONF_VACATION_CALENDAR,
    CONF_VACATION_CALENDAR_KEYWORD,
    DEFAULT_VACATION_CALENDAR_KEYWORD,
    # v1.5 – Cooling target, PID, smart meter, price forecast
    CONF_COOLING_TARGET_TEMP,
    DEFAULT_COOLING_TARGET_TEMP,
    CONF_FLOW_TEMP_SENSOR,
    CONF_PID_KP,
    CONF_PID_KI,
    CONF_PID_KD,
    DEFAULT_PID_KP,
    DEFAULT_PID_KI,
    DEFAULT_PID_KD,
    CONF_SMART_METER_ENTITY,
    CONF_PRICE_FORECAST_ATTRIBUTE,
    DEFAULT_PRICE_FORECAST_ATTRIBUTE,
    # v2.x – per-room advanced settings
    CONF_ABSOLUTE_MIN_TEMP,
    CONF_ROOM_QM,
    CONF_ROOM_PREHEAT_MINUTES,
    CONF_WINDOW_CLOSE_DELAY,
    DEFAULT_ABSOLUTE_MIN_TEMP,
    DEFAULT_ROOM_QM,
    DEFAULT_ROOM_PREHEAT_MINUTES,
    DEFAULT_WINDOW_CLOSE_DELAY,
    DEFAULT_WINDOW_REACTION_TIME,
)
from .heating_curve import HeatingCurve
from .schedule_manager import ScheduleManager
from .heating_controller import HeatingController
from .flow_temp_pid import FlowTempPID

_LOGGER = logging.getLogger(__name__)

# TRV battery-save: minimum temperature change before sending a new setpoint to TRV
TRV_TEMP_HYSTERESIS = 0.3  # °C – only send update if setpoint changes by at least this much


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

        # Roadmap 1.2 – Vacation assistant: track auto-vacation mode
        self._vacation_auto_active: bool = False  # True when activated by date range

        # Roadmap 2.0 – Guest mode
        self._guest_mode_active: bool = False
        self._guest_mode_until: Optional[datetime] = None  # auto-revert time

        # Roadmap 2.0 – Vacation return pre-heat: switched to AUTO N days before vac_end
        self._return_preheat_active: bool = False

        # Energy / runtime tracking
        self._heating_started_at: Optional[datetime] = None
        self._heating_runtime_today: float = 0.0       # total seconds today
        self._heating_runtime_yesterday: float = 0.0   # total seconds yesterday (Roadmap 2.0)
        self._room_demand_started: Dict[str, datetime] = {}  # room_id → when demand went > 0
        self._room_runtime_today: Dict[str, float] = {}      # room_id → seconds today
        self._runtime_day: int = datetime.now().day           # to detect day rollover
        # HKV (Heizkostenverteiler) – per-room reading at start of current day
        self._hkv_day_start: Dict[str, Optional[float]] = {}  # room_id → Einheiten at 00:00

        # Flag: suppress the update_listener reload for internal option writes
        self._suppress_reload: bool = False

        # Roadmap 1.1 – Temperature history per room (deque of (ts_iso, temp) tuples)
        self._temp_history: Dict[str, deque] = {}
        # Track when history was last persisted (save at most once per hour)
        self._history_last_saved: Optional[datetime] = None

        # Roadmap 1.1 – Warmup tracking (for predictive pre-heating)
        self._warmup_start: Dict[str, Optional[datetime]] = {}    # room_id → when heat request started
        self._warmup_history: Dict[str, List[float]] = {}          # room_id → list of warmup minutes

        # v1.3 – Adaptive heating curve: cumulative offset applied so far
        self._curve_adaptation_delta: float = 0.0   # °C total shift applied
        self._curve_last_adapted: Optional[int] = None  # day-of-year when last adapted

        # v1.5 – PID controller for flow temperature
        self._flow_pid: FlowTempPID = FlowTempPID()
        self._flow_pid_last_setpoint: Optional[float] = None  # detect large setpoint jumps

        # v1.5 – Smart meter daily baseline
        self._smart_meter_day_start: Optional[float] = None

        # v1.4 – Vacation calendar last-check (to avoid calling service every minute)
        self._vac_calendar_last_check: Optional[int] = None  # day-of-year

        # TRV battery save: track last sent temperature per entity to avoid unnecessary updates
        self._last_sent_temps: Dict[str, float] = {}  # entity_id → last sent temperature

        # Manual TRV override detection: track last IHC-set temperature per room
        self._last_ihc_set_temps: Dict[str, float] = {}  # room_id → last temp IHC intentionally set

        # Window timing: track when window was first seen open/closed (timestamp)
        self._window_open_since: Dict[str, Optional[float]] = {}   # room_id → epoch when opened
        self._window_closed_since: Dict[str, Optional[float]] = {} # room_id → epoch when closed

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
        """Load persisted runtime state from Store."""
        data = await self._store.async_load()
        if not data:
            return
        self._system_mode = data.get("system_mode", SYSTEM_MODE_AUTO)
        self._room_modes = data.get("room_modes", {})
        self._room_manual_temps = data.get("room_manual_temps", {})
        self._vacation_auto_active = data.get("vacation_auto_active", False)
        self._heating_runtime_today = data.get("heating_runtime_today", 0.0)
        self._heating_runtime_yesterday = data.get("heating_runtime_yesterday", 0.0)
        self._room_runtime_today = data.get("room_runtime_today", {})
        self._return_preheat_active = data.get("return_preheat_active", False)
        # Restore the day number so we don't falsely roll over on first update
        stored_day = data.get("runtime_day")
        if stored_day is not None:
            self._runtime_day = stored_day
        # Guest mode revert time (ISO string → datetime)
        guest_until_str = data.get("guest_mode_until")
        if guest_until_str:
            try:
                self._guest_mode_until = datetime.fromisoformat(guest_until_str)
                if self._system_mode == SYSTEM_MODE_GUEST:
                    self._guest_mode_active = True
            except ValueError:
                pass
        # Restore HKV day-start baselines (so energy deltas survive HA restarts)
        self._hkv_day_start = data.get("hkv_day_start", {})
        # Restore smart meter baseline
        self._smart_meter_day_start = data.get("smart_meter_day_start")
        # Restore boost expiry times (ISO string → datetime)
        for rid, dt_str in data.get("boost_until", {}).items():
            try:
                self._boost_until[rid] = datetime.fromisoformat(dt_str)
            except (ValueError, TypeError):
                pass
        # Restore temperature history (persisted across restarts)
        for room_id, entries in data.get("temp_history", {}).items():
            self._temp_history[room_id] = deque(entries, maxlen=CONF_TEMP_HISTORY_SIZE)
        # Restore warmup history (for predictive pre-heating)
        self._warmup_history = data.get("warmup_history", {})
        # Restore adaptive curve state
        self._curve_adaptation_delta = float(data.get("curve_adaptation_delta", 0.0))

    async def _async_save_runtime_state(self) -> None:
        """Persist current runtime state to Store."""
        await self._store.async_save({
            "system_mode": self._system_mode,
            "room_modes": self._room_modes,
            "room_manual_temps": self._room_manual_temps,
            "vacation_auto_active": self._vacation_auto_active,
            "heating_runtime_today": self._heating_runtime_today,
            "heating_runtime_yesterday": self._heating_runtime_yesterday,
            "room_runtime_today": self._room_runtime_today,
            "runtime_day": self._runtime_day,
            "return_preheat_active": self._return_preheat_active,
            "guest_mode_until": self._guest_mode_until.isoformat() if self._guest_mode_until else None,
            # Persist HKV day-start baselines so energy deltas survive HA restarts
            "hkv_day_start": self._hkv_day_start,
            # Persist smart meter baseline
            "smart_meter_day_start": self._smart_meter_day_start,
            # Persist boost expiry times so active boosts survive HA restarts
            "boost_until": {rid: dt.isoformat() for rid, dt in self._boost_until.items()},
            # Persist temperature history so sparklines survive HA restarts
            "temp_history": {rid: list(hist) for rid, hist in self._temp_history.items()},
            # Persist warmup history for predictive pre-heating
            "warmup_history": self._warmup_history,
            # Persist adaptive curve state
            "curve_adaptation_delta": self._curve_adaptation_delta,
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

    def set_room_boost(self, room_id: str, duration_minutes: int = 60, temp: Optional[float] = None) -> None:
        """Activate boost mode for a room for the given duration.

        If `temp` is given the room switches to manual mode at that temperature.
        Otherwise the room config's boost_temp is used; if absent, comfort mode is used.
        """
        self._boost_until[room_id] = datetime.now() + timedelta(minutes=duration_minutes)
        boost_temp = temp
        if boost_temp is None:
            room_cfg = self.get_room_config(room_id)
            boost_temp = room_cfg.get("boost_temp") if room_cfg else None
        if boost_temp is not None:
            self._room_modes[room_id] = ROOM_MODE_MANUAL
            self._room_manual_temps[room_id] = float(boost_temp)
        else:
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
    # Roadmap 1.2 – Vacation assistant
    # ------------------------------------------------------------------

    def _update_vacation_auto_mode(self) -> None:
        """
        Auto-switch to VACATION mode when the current date is within the configured
        vacation date range, and restore AUTO when the range ends.
        Respects manual mode changes: only activates/deactivates if system is in AUTO
        (or already in auto-vacation).
        """
        cfg = self.get_config()
        start_str = cfg.get(CONF_VACATION_START, "")
        end_str = cfg.get(CONF_VACATION_END, "")
        if not start_str or not end_str:
            return  # no vacation range configured

        try:
            vac_start = date.fromisoformat(start_str)
            vac_end = date.fromisoformat(end_str)
        except ValueError:
            return

        today = date.today()
        in_vacation = vac_start <= today <= vac_end

        # Allow activation from AUTO or presence-triggered AWAY (so airport-departure doesn't block it)
        can_activate = self._system_mode == SYSTEM_MODE_AUTO or (
            self._system_mode == SYSTEM_MODE_AWAY and self._presence_away_active
        )
        if in_vacation and can_activate:
            _LOGGER.info("IHC: Vacation range active (%s–%s) – switching to vacation mode", start_str, end_str)
            self._system_mode = SYSTEM_MODE_VACATION
            self._vacation_auto_active = True
            self._presence_away_active = False  # vacation supersedes presence-away
            self.hass.async_create_task(self._async_save_runtime_state())

        elif not in_vacation and self._vacation_auto_active:
            _LOGGER.info("IHC: Vacation range ended – restoring auto mode")
            self._system_mode = SYSTEM_MODE_AUTO
            self._vacation_auto_active = False
            self.hass.async_create_task(self._async_save_runtime_state())

    def set_vacation_range(self, start: str, end: str) -> None:
        """Store vacation start/end dates and immediately evaluate."""
        self.hass.async_create_task(self.async_update_global_settings({
            CONF_VACATION_START: start,
            CONF_VACATION_END: end,
        }))

    def clear_vacation_range(self) -> None:
        """Clear vacation date range and restore auto mode if in auto-vacation."""
        if self._vacation_auto_active:
            self._system_mode = SYSTEM_MODE_AUTO
            self._vacation_auto_active = False
        self.hass.async_create_task(self.async_update_global_settings({
            CONF_VACATION_START: "",
            CONF_VACATION_END: "",
        }))

    def get_vacation_range(self) -> dict:
        """Return the configured vacation date range."""
        cfg = self.get_config()
        return {
            "start": cfg.get(CONF_VACATION_START, ""),
            "end": cfg.get(CONF_VACATION_END, ""),
            "active": self._vacation_auto_active,
        }

    def _update_vacation_return_preheat(self) -> None:
        """
        Roadmap 2.0 – Rückkehr-Vorheizung.
        Switch from VACATION mode to AUTO N days before the configured vac_end date.
        This allows the house to be warm when residents return from vacation.
        """
        cfg = self.get_config()
        preheat_days = int(cfg.get(CONF_VACATION_RETURN_PREHEAT_DAYS, DEFAULT_VACATION_RETURN_PREHEAT_DAYS))
        if preheat_days <= 0:
            return
        end_str = cfg.get(CONF_VACATION_END, "")
        if not end_str:
            return
        try:
            vac_end = date.fromisoformat(end_str)
        except ValueError:
            return
        today = date.today()
        days_until_return = (vac_end - today).days
        # Activate pre-heat if within preheat_days before end AND system is currently in vacation
        if 0 <= days_until_return < preheat_days and self._system_mode == SYSTEM_MODE_VACATION and self._vacation_auto_active:
            _LOGGER.info("IHC: Vacation return in %d days – switching to AUTO for pre-heating", days_until_return)
            self._system_mode = SYSTEM_MODE_AUTO
            self._vacation_auto_active = False
            self._return_preheat_active = True
            self.hass.async_create_task(self._async_save_runtime_state())
        elif days_until_return >= preheat_days and self._return_preheat_active:
            # Reset flag if vacation dates changed and we are outside preheat window again
            self._return_preheat_active = False

    # ------------------------------------------------------------------
    # Roadmap 2.0 – Guest mode
    # ------------------------------------------------------------------

    def activate_guest_mode(self, duration_hours: Optional[int] = None) -> None:
        """
        Activate guest mode: all rooms get comfort temperature.
        Optionally auto-reverts to AUTO after duration_hours.
        """
        cfg = self.get_config()
        hours = duration_hours if duration_hours is not None else int(
            cfg.get(CONF_GUEST_DURATION_HOURS, DEFAULT_GUEST_DURATION_HOURS)
        )
        self._system_mode = SYSTEM_MODE_GUEST
        self._guest_mode_active = True
        self._guest_mode_until = datetime.now() + timedelta(hours=hours) if hours > 0 else None
        _LOGGER.info("IHC: Guest mode activated (duration: %s h)", hours if hours > 0 else "indefinite")
        self.hass.async_create_task(self._async_save_runtime_state())
        self.hass.async_create_task(self.async_request_refresh())

    def deactivate_guest_mode(self) -> None:
        """Deactivate guest mode and return to AUTO."""
        self._system_mode = SYSTEM_MODE_AUTO
        self._guest_mode_active = False
        self._guest_mode_until = None
        _LOGGER.info("IHC: Guest mode deactivated")
        self.hass.async_create_task(self._async_save_runtime_state())
        self.hass.async_create_task(self.async_request_refresh())

    def _check_guest_mode_expiry(self) -> None:
        """Auto-revert guest mode when its timer expires."""
        if not self._guest_mode_active:
            return
        if self._guest_mode_until is None:
            return
        if datetime.now() >= self._guest_mode_until:
            _LOGGER.info("IHC: Guest mode timer expired – returning to AUTO")
            self._system_mode = SYSTEM_MODE_AUTO
            self._guest_mode_active = False
            self._guest_mode_until = None
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
        """Append hourly temperature snapshot to the per-room history deque (7 days)."""
        if current_temp is None:
            return
        history = self._temp_history.setdefault(
            room_id, deque(maxlen=CONF_TEMP_HISTORY_SIZE)
        )
        now = datetime.now()
        # Only store one reading per hour (55-minute guard)
        if history:
            last_entry = list(history)[-1]
            try:
                last_dt = datetime.fromisoformat(last_entry["t"])
                if (now - last_dt).total_seconds() < 3300:  # 55 min
                    return
            except (ValueError, KeyError):
                pass  # old format or missing – allow overwrite
        ts = now.isoformat(timespec="minutes")   # "2026-03-15T14:30"
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

    def _detect_sensor_anomaly(self, room_id: str) -> Optional[str]:
        """
        Roadmap 1.1 – Anomalie-Erkennung.

        Returns a short anomaly description or None.
        Checks:
          - Sensor drift: last 10 readings all identical (stuck value)
          - Sudden drop: temperature fell > 4 °C in last 3 readings (window open?)
        """
        history = list(self._temp_history.get(room_id, []))
        if len(history) < 3:
            return None
        vals = [p["v"] for p in history]
        # Stuck sensor: last 10 readings (or all available) are identical
        check = vals[-10:]
        if len(check) >= 5 and len(set(check)) == 1:
            return "sensor_stuck"
        # Sudden temperature drop (>4°C over last 3 readings)
        if vals[-1] < vals[-3] - 4.0:
            return "temp_drop"
        return None

    def get_next_schedule_period(self, room_id: str) -> Optional[dict]:
        """Return the next scheduled period for a room (for informational display)."""
        mgr = self._schedule_managers.get(room_id)
        if mgr is None:
            return None
        return mgr.get_next_period()

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

    # ------------------------------------------------------------------
    # Roadmap 2.0 – Weather forecast
    # ------------------------------------------------------------------

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

    # ------------------------------------------------------------------
    # Roadmap 2.0 – Schimmelschutz (mold protection)
    # ------------------------------------------------------------------

    def _check_mold_risk(self, room: dict, current_temp: Optional[float]) -> Optional[dict]:
        """
        Check mold risk for a room using humidity sensor.
        Calculates approximate dew point and flags risk when humidity is high.
        Returns dict with humidity, dew_point, risk_level, or None if no sensor.
        """
        if not room.get(CONF_MOLD_PROTECTION_ENABLED, DEFAULT_MOLD_PROTECTION_ENABLED):
            return None
        humidity_sensor = room.get(CONF_HUMIDITY_SENSOR)
        if not humidity_sensor:
            return None
        state = self.hass.states.get(humidity_sensor)
        if state is None or state.state in (STATE_UNAVAILABLE, STATE_UNKNOWN):
            return None
        try:
            humidity = float(state.state)
        except ValueError:
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

    # ------------------------------------------------------------------
    # Lüftungsempfehlung (ventilation advice)
    # ------------------------------------------------------------------

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

        # ── Temperature delta indoor vs outdoor ─────────────────────────
        if current_temp is not None and outdoor_temp is not None:
            delta = current_temp - outdoor_temp
            if delta >= 6:
                score += 2
                reasons.append(f"Temperaturunterschied {delta:.1f}°C")
            elif delta >= 3:
                score += 1

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

        # ── Skip if nothing meaningful ───────────────────────────────────
        if co2 is None and mold is None and current_temp is None:
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
        Calculate boiler flow temperature setpoint.

        Uses a linear weather-compensation curve as the desired setpoint, then
        applies a PID correction if a flow-temp sensor (CONF_FLOW_TEMP_SENSOR) is
        configured. Without the sensor, the raw curve value is returned directly.

        Weather-compensation base: cold outside → higher flow temp.
        Demand modulation: ±10°C depending on current aggregate demand.
        """
        if outdoor_temp is None:
            return None
        # Weather-compensation base (linear)
        setpoint = 70.0 - (outdoor_temp * 1.5)
        setpoint = max(30.0, min(80.0, setpoint))
        # Modulate by demand (0–100 → ±10°C)
        setpoint += (total_demand / 100.0) * 10.0 - 5.0
        setpoint = round(max(30.0, min(80.0, setpoint)), 1)

        # PID correction when a measurement sensor is available
        cfg = self.get_config()
        flow_sensor = cfg.get(CONF_FLOW_TEMP_SENSOR)
        if flow_sensor:
            state = self.hass.states.get(flow_sensor)
            if state and state.state not in (STATE_UNAVAILABLE, STATE_UNKNOWN):
                try:
                    measured = float(state.state)
                    # Reset PID if setpoint shifted significantly (> 5°C jump)
                    if self._flow_pid_last_setpoint is not None and abs(setpoint - self._flow_pid_last_setpoint) > 5:
                        self._flow_pid.reset()
                    self._flow_pid_last_setpoint = setpoint
                    kp = float(cfg.get(CONF_PID_KP, DEFAULT_PID_KP))
                    ki = float(cfg.get(CONF_PID_KI, DEFAULT_PID_KI))
                    kd = float(cfg.get(CONF_PID_KD, DEFAULT_PID_KD))
                    self._flow_pid.kp = kp
                    self._flow_pid.ki = ki
                    self._flow_pid.kd = kd
                    return round(self._flow_pid.compute(setpoint, measured), 1)
                except (ValueError, TypeError):
                    pass  # fall through to raw setpoint

        return setpoint

    # ------------------------------------------------------------------
    # Energy / runtime tracking
    # ------------------------------------------------------------------

    def _reset_runtime_if_new_day(self) -> None:
        today = datetime.now().day
        if today != self._runtime_day:
            # Save today's runtime as yesterday before reset
            self._heating_runtime_yesterday = self._heating_runtime_today
            self._heating_runtime_today = 0.0
            self._room_runtime_today = {}
            self._runtime_day = today
            # Reset HKV day-start so sensor deltas are measured from midnight
            self._hkv_day_start = {}
            # Reset smart meter baseline
            self._smart_meter_day_start = None
            self.hass.async_create_task(self._async_save_runtime_state())

    def _update_runtime_tracking(self, should_heat: bool, room_data: dict) -> None:
        """Track heating on-times for energy statistics."""
        now = datetime.now()
        self._reset_runtime_if_new_day()
        controller_mode = self.get_config().get(CONF_CONTROLLER_MODE, DEFAULT_CONTROLLER_MODE)

        # Global heating runtime
        # In TRV mode there is no central switch; treat "any room demanding" as heating active
        global_heat = should_heat if controller_mode != CONTROLLER_MODE_TRV else any(
            rd.get("demand", 0.0) > 0 for rd in room_data.values()
        )
        if global_heat:
            if self._heating_started_at is None:
                self._heating_started_at = now
        else:
            if self._heating_started_at is not None:
                elapsed = (now - self._heating_started_at).total_seconds()
                self._heating_runtime_today += elapsed
                self._heating_started_at = None

        # Per-room demand runtime
        # TRV mode: count whenever TRV is open (demand > 0) – building heating runs independently
        # Switch mode: count only when central heater is also on (demand > 0 AND should_heat)
        for room_id, rdata in room_data.items():
            demand = rdata.get("demand", 0.0)
            room_heating = demand > 0 and (should_heat or controller_mode == CONTROLLER_MODE_TRV)
            if room_heating:
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

    def get_heating_runtime_yesterday_minutes(self) -> float:
        """Total heating runtime yesterday in minutes."""
        return round(self._heating_runtime_yesterday / 60.0, 1)

    def get_room_runtime_today_minutes(self, room_id: str) -> float:
        """Room heating demand runtime today in minutes."""
        total = self._room_runtime_today.get(room_id, 0.0)
        started = self._room_demand_started.get(room_id)
        if started is not None:
            total += (datetime.now() - started).total_seconds()
        return round(total / 60.0, 1)

    def reset_runtime_stats(self) -> None:
        """Reset today's heating runtime and energy statistics to zero."""
        if self._heating_started_at is not None:
            self._heating_started_at = datetime.now()  # restart session clock
        self._heating_runtime_today = 0.0
        self._room_runtime_today.clear()
        for room_id in list(self._room_demand_started.keys()):
            self._room_demand_started[room_id] = datetime.now()
        _LOGGER.info("IHC: Runtime and energy stats reset by user.")

    def _calculate_room_energy_today(self, room: dict, room_id: str) -> float:
        """
        Calculate today's energy estimate for one room.

        Priority order:
          1. HKV sensor (Heizkostenverteiler) – most accurate for Mietwohnung.
             Reads the live sensor delta since midnight and multiplies by
             hkv_factor (kWh/Einheit from the annual billing statement).
          2. Runtime × radiator_kw – per-room thermal power × demand-open time.
             Works in both TRV mode (demand > 0 independent of boiler) and
             switch mode (runtime already gated on boiler-on).
        """
        # --- Option 1: HKV sensor ---
        hkv_entity = room.get(CONF_HKV_SENSOR, "")
        hkv_factor = float(room.get(CONF_HKV_FACTOR, DEFAULT_HKV_FACTOR))
        if hkv_entity:
            state = self.hass.states.get(hkv_entity)
            if state and state.state not in (STATE_UNKNOWN, STATE_UNAVAILABLE):
                try:
                    current_val = float(state.state)
                    day_start = self._hkv_day_start.get(room_id)
                    if day_start is None:
                        # First reading of the day – store as baseline
                        self._hkv_day_start[room_id] = current_val
                        return 0.0
                    delta = max(0.0, current_val - day_start)
                    return round(delta * hkv_factor, 3)
                except (ValueError, TypeError):
                    pass  # fall through to runtime estimate

        # --- Option 2: runtime × radiator power ---
        radiator_kw = float(room.get(CONF_RADIATOR_KW, DEFAULT_RADIATOR_KW))
        # If room_qm is set and radiator_kw is at default, estimate from area
        # (rough rule: ~50 W/m² for well-insulated, ~80 W/m² for older buildings → use 65 W/m²)
        room_qm_e = float(room.get(CONF_ROOM_QM, DEFAULT_ROOM_QM))
        if room_qm_e > 0 and radiator_kw == DEFAULT_RADIATOR_KW:
            radiator_kw = round(room_qm_e * 0.065, 2)  # 65 W/m² → kW
        room_runtime_min = self.get_room_runtime_today_minutes(room_id)
        return round(room_runtime_min / 60.0 * radiator_kw, 3)

    def _get_smart_meter_energy_today(self) -> Optional[float]:
        """
        Return today's energy consumption in kWh from a smart meter sensor.

        The sensor must have state_class = TOTAL_INCREASING (e.g. utility_meter.*
        or any sensor.* that accumulates kWh since a fixed point).
        A daily baseline is stored at midnight and subtracted to get the day delta.
        Returns None when no sensor is configured.
        """
        cfg = self.get_config()
        meter_entity = cfg.get(CONF_SMART_METER_ENTITY)
        if not meter_entity:
            return None
        state = self.hass.states.get(meter_entity)
        if state is None or state.state in (STATE_UNAVAILABLE, STATE_UNKNOWN):
            return None
        try:
            current = float(state.state)
        except (ValueError, TypeError):
            return None
        if self._smart_meter_day_start is None:
            self._smart_meter_day_start = current
            return 0.0
        return round(max(0.0, current - self._smart_meter_day_start), 3)

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
            current_hour = datetime.now().hour
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
                # Normalise to naive local time for comparison
                if eta_dt.tzinfo is not None:
                    from datetime import timezone
                    eta_dt = eta_dt.astimezone(timezone.utc).replace(tzinfo=None)
                minutes = (eta_dt - datetime.utcnow()).total_seconds() / 60
                if 0 < minutes <= 120:
                    min_minutes = min(min_minutes or minutes, minutes)
            except (ValueError, TypeError, AttributeError):
                pass
        return min_minutes

    def _adapt_heating_curve(self) -> None:
        """
        Adaptive heating curve: subtly adjust the curve up/down based on whether
        rooms are systematically warm-up faster or slower than expected.

        Logic:
          - Compute the average warmup minutes across all rooms.
          - If avg > preheat_minutes + 15 min  → rooms heat too slowly → shift curve +0.5°C
          - If avg < preheat_minutes - 15 min  → rooms heat too quickly → shift curve -0.5°C
          - Maximum total shift: ±CONF_ADAPTIVE_CURVE_MAX_DELTA (default ±3°C)
          - Runs at most once per day.
        """
        cfg = self.get_config()
        if not cfg.get(CONF_ADAPTIVE_CURVE_ENABLED, DEFAULT_ADAPTIVE_CURVE_ENABLED):
            return
        today_yday = datetime.now().timetuple().tm_yday
        if self._curve_last_adapted == today_yday:
            return
        self._curve_last_adapted = today_yday

        # Need at least 3 rooms with warmup data
        all_warmups = [wm for wms in self._warmup_history.values() for wm in wms if wm > 0]
        if len(all_warmups) < 3:
            return

        avg_warmup = sum(all_warmups) / len(all_warmups)
        target_warmup = float(cfg.get(CONF_PREHEAT_MINUTES, DEFAULT_PREHEAT_MINUTES)) or 30.0
        max_delta = float(cfg.get(CONF_ADAPTIVE_CURVE_MAX_DELTA, DEFAULT_ADAPTIVE_CURVE_MAX_DELTA))
        step = 0.5  # °C per adaptation step

        if avg_warmup > target_warmup + 15:
            delta = step
        elif avg_warmup < target_warmup - 15:
            delta = -step
        else:
            return

        # Enforce maximum cumulative delta
        new_total = self._curve_adaptation_delta + delta
        if abs(new_total) > max_delta:
            return

        # Apply shift to all curve points
        current_points = cfg.get(CONF_HEATING_CURVE, {}).get(CONF_CURVE_POINTS, DEFAULT_HEATING_CURVE)
        new_points = [
            {"outdoor_temp": p["outdoor_temp"], "target_temp": round(p["target_temp"] + delta, 1)}
            for p in current_points
        ]
        self._curve_adaptation_delta = new_total
        self._heating_curve.update_points(new_points)

        # Persist curve via config entry options
        new_options = dict(self._config_entry.options)
        new_options[CONF_HEATING_CURVE] = {CONF_CURVE_POINTS: new_points}
        self._suppress_reload = True
        self.hass.config_entries.async_update_entry(self._config_entry, options=new_options)
        _LOGGER.info(
            "Adaptive heating curve: shifted %.1f°C (total %.1f°C). avg_warmup=%.1f min",
            delta, self._curve_adaptation_delta, avg_warmup,
        )
        self.hass.async_create_task(self._async_save_runtime_state())

    async def _async_check_vacation_calendar(self) -> None:
        """
        Auto-detect vacation periods from a HA calendar entity.

        Calls 'calendar.get_events' for the next 30 days and searches for
        events whose summary contains CONF_VACATION_CALENDAR_KEYWORD (default: "urlaub").
        If found, updates vacation_start/end in config options automatically.
        """
        cfg = self.get_config()
        cal_entity = cfg.get(CONF_VACATION_CALENDAR)
        if not cal_entity:
            return
        today_yday = datetime.now().timetuple().tm_yday
        if self._vac_calendar_last_check == today_yday:
            return
        self._vac_calendar_last_check = today_yday

        keyword = cfg.get(CONF_VACATION_CALENDAR_KEYWORD, DEFAULT_VACATION_CALENDAR_KEYWORD).lower()
        today = date.today()
        end_date = today + timedelta(days=30)
        try:
            result = await self.hass.services.async_call(
                "calendar", "get_events",
                {
                    "entity_id": cal_entity,
                    "start_date_time": today.isoformat() + "T00:00:00",
                    "end_date_time": end_date.isoformat() + "T23:59:59",
                },
                blocking=True,
                return_response=True,
            )
        except Exception as err:  # noqa: BLE001
            _LOGGER.debug("Vacation calendar check failed: %s", err)
            return

        events = (result or {}).get(cal_entity, {}).get("events", [])
        for event in events:
            summary = event.get("summary", "").lower()
            if keyword in summary:
                start_str = str(event.get("start", ""))[:10]
                end_str   = str(event.get("end",   ""))[:10]
                if start_str and end_str:
                    if start_str != cfg.get(CONF_VACATION_START) or end_str != cfg.get(CONF_VACATION_END):
                        _LOGGER.info("Vacation calendar: found '%s' → %s – %s", summary, start_str, end_str)
                        new_opts = dict(self._config_entry.options)
                        new_opts[CONF_VACATION_START] = start_str
                        new_opts[CONF_VACATION_END]   = end_str
                        self._suppress_reload = True
                        self.hass.config_entries.async_update_entry(self._config_entry, options=new_opts)
                return  # first match wins

    # ------------------------------------------------------------------
    # Roadmap 1.3 – Heizungsoptimierungs-Score
    # ------------------------------------------------------------------

    def calculate_efficiency_score(self, outdoor_temp: Optional[float]) -> Optional[int]:
        """
        Calculate a daily heating efficiency score (0–100).

        Higher = more efficient. Based on the ratio of actual runtime to the
        expected runtime for the current outdoor temperature.

        Formula:
          expected_hours = max(0.5, (20 - outdoor_temp) / 5)   [h/day]
          actual_hours   = runtime_today_minutes / 60
          ratio          = expected_hours / actual_hours
          score          = clamp(round(ratio * 100), 0, 100)

        Interpretation:
          100 – heating exactly as long as expected for this outdoor temp
          >100 – heating less than expected (very efficient or house well insulated)
           <100 – heating more than expected (less efficient)
        Score is None if no outdoor temp or no runtime data yet.
        """
        if outdoor_temp is None:
            return None
        actual_h = self.get_heating_runtime_today_minutes() / 60.0
        if actual_h < 0.05:
            return None  # too early in the day for a meaningful score
        expected_h = max(0.5, (20.0 - outdoor_temp) / 5.0)
        ratio = expected_h / actual_h
        return min(100, max(0, round(ratio * 100)))

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
        Detect window open state with per-room reaction time and close delay.

        - window_reaction_time: seconds a sensor must be ON before IHC reacts (default 30 s)
        - window_close_delay:   seconds after sensor goes OFF before IHC resumes heating (default 0 s)
        """
        room_id = room.get(CONF_ROOM_ID, "")
        reaction_time = float(room.get(CONF_WINDOW_REACTION_TIME, DEFAULT_WINDOW_REACTION_TIME))
        close_delay   = float(room.get(CONF_WINDOW_CLOSE_DELAY, DEFAULT_WINDOW_CLOSE_DELAY))
        now           = time.monotonic()

        # Check raw sensor state
        sensor_open = False
        window_sensors: list = room.get(CONF_WINDOW_SENSORS, [])
        for sensor in window_sensors:
            if sensor:
                state = self.hass.states.get(sensor)
                if state and state.state == STATE_ON:
                    sensor_open = True
                    break
        if not sensor_open:
            window_sensor = room.get(CONF_WINDOW_SENSOR)
            if window_sensor:
                state = self.hass.states.get(window_sensor)
                if state and state.state == STATE_ON:
                    sensor_open = True

        if sensor_open:
            # Record first time seen open; reset close timestamp
            if self._window_open_since.get(room_id) is None:
                self._window_open_since[room_id] = now
            self._window_closed_since[room_id] = None
            # React only after reaction_time has elapsed
            return (now - self._window_open_since[room_id]) >= reaction_time
        else:
            # Window closed: reset open timestamp
            if self._window_open_since.get(room_id) is not None:
                self._window_open_since[room_id] = None
                # Start close-delay countdown only if we were previously "reacting"
                if close_delay > 0:
                    self._window_closed_since[room_id] = now
            # During close delay: still report as open
            closed_at = self._window_closed_since.get(room_id)
            if closed_at is not None:
                if (now - closed_at) < close_delay:
                    return True
                self._window_closed_since[room_id] = None
            return False

    def _get_room_preset_temps(self, room: dict, outdoor_temp: Optional[float]) -> tuple[float, float, float, float]:
        """
        Compute outdoor-regulated comfort/eco/sleep/away base temperatures for a room.

        comfort = heating_curve(outdoor_temp)  [fallback: room comfort_temp if no sensor]
        eco     = min(eco_max_temp,   comfort - eco_offset)
        sleep   = min(sleep_max_temp, comfort - sleep_offset)
        away    = min(away_max_temp,  comfort - away_offset)

        Values are bounded by room min_temp/max_temp but do NOT include room_offset
        (that is applied separately in _calculate_target_temp when returning).

        Returns (comfort_base, eco_base, sleep_base, away_base) – all WITHOUT room_offset.
        """
        min_temp     = float(room.get(CONF_MIN_TEMP, DEFAULT_MIN_TEMP))
        max_temp     = float(room.get(CONF_MAX_TEMP, DEFAULT_MAX_TEMP))
        abs_min_temp = float(room.get(CONF_ABSOLUTE_MIN_TEMP, DEFAULT_ABSOLUTE_MIN_TEMP))
        # Effective floor is the higher of min_temp and absolute_min_temp
        effective_floor = max(min_temp, abs_min_temp)

        if outdoor_temp is not None:
            comfort_base = self._heating_curve.get_target_temp(outdoor_temp)
        else:
            # No outdoor sensor: fall back to the room's stored comfort_temp
            comfort_base = float(room.get(CONF_COMFORT_TEMP, DEFAULT_COMFORT_TEMP))

        comfort_base = min(max_temp, max(effective_floor, comfort_base))

        eco_offset  = float(room.get(CONF_ECO_OFFSET, DEFAULT_ECO_OFFSET))
        eco_max     = float(room.get(CONF_ECO_MAX_TEMP, DEFAULT_ECO_MAX_TEMP))
        eco_base    = min(eco_max, min(max_temp, max(effective_floor, comfort_base - eco_offset)))

        sleep_offset = float(room.get(CONF_SLEEP_OFFSET, DEFAULT_SLEEP_OFFSET))
        sleep_max    = float(room.get(CONF_SLEEP_MAX_TEMP, DEFAULT_SLEEP_MAX_TEMP))
        sleep_base   = min(sleep_max, min(max_temp, max(effective_floor, comfort_base - sleep_offset)))

        away_offset  = float(room.get(CONF_AWAY_OFFSET, DEFAULT_AWAY_OFFSET))
        away_max     = float(room.get(CONF_AWAY_MAX_TEMP, DEFAULT_AWAY_MAX_TEMP))
        away_base    = min(away_max, min(max_temp, max(effective_floor, comfort_base - away_offset)))

        return comfort_base, eco_base, sleep_base, away_base

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

        # Compute outdoor-regulated base temps (WITHOUT room_offset — applied at return time)
        comfort_base, eco_base, sleep_base, away_base = self._get_room_preset_temps(room, outdoor_temp)

        # --- 1. System mode overrides ---
        if system_mode == SYSTEM_MODE_OFF:
            # Frost protection: even in OFF we keep a minimum
            return frost_temp, {"source": "frost_protection", "schedule_active": False}

        if system_mode == SYSTEM_MODE_COOL:
            # Cooling mode: target is the configured cooling temperature (room wants to stay BELOW this)
            cooling_target = float(cfg.get(CONF_COOLING_TARGET_TEMP, DEFAULT_COOLING_TARGET_TEMP))
            return min(max_temp, max(min_temp, cooling_target)), {
                "source": "cooling_mode", "schedule_active": False
            }

        if system_mode == SYSTEM_MODE_AWAY:
            away_temp = float(cfg.get(CONF_AWAY_TEMP, DEFAULT_AWAY_TEMP))
            # Frost protection: away temp must be at least frost_temp
            return max(away_temp, frost_temp), {"source": "system_away", "schedule_active": False}

        if system_mode == SYSTEM_MODE_VACATION:
            vac_temp = float(cfg.get(CONF_VACATION_TEMP, DEFAULT_VACATION_TEMP))
            return max(vac_temp, frost_temp), {"source": "system_vacation", "schedule_active": False}

        if system_mode == SYSTEM_MODE_GUEST:
            return min(max_temp, max(min_temp, comfort_base + room_offset)), {
                "source": "guest_mode", "schedule_active": False
            }

        # --- 1b. Room-specific presence → away temp (Roadmap 1.2) ---
        if not self._check_room_presence(room) and room_mode == ROOM_MODE_AUTO:
            return min(max_temp, max(min_temp, away_base + room_offset)), {
                "source": "room_presence_away", "schedule_active": False,
                "away_base": away_base,
            }

        # --- 2. Room mode preset overrides ---
        if room_mode == ROOM_MODE_OFF:
            return min_temp, {"source": "room_off", "schedule_active": False}

        if room_mode == ROOM_MODE_AWAY:
            return min(max_temp, max(min_temp, away_base + room_offset)), {
                "source": "room_away", "schedule_active": False, "away_base": away_base,
            }

        if room_mode == ROOM_MODE_COMFORT:
            return min(max_temp, max(min_temp, comfort_base + room_offset)), {
                "source": "comfort", "schedule_active": False,
                "comfort_base": comfort_base,
            }

        if room_mode == ROOM_MODE_ECO:
            return min(max_temp, max(min_temp, eco_base + room_offset)), {
                "source": "eco", "schedule_active": False,
                "eco_base": eco_base,
            }

        if room_mode == ROOM_MODE_SLEEP:
            return min(max_temp, max(min_temp, sleep_base + room_offset)), {
                "source": "sleep", "schedule_active": False,
                "sleep_base": sleep_base,
            }

        if room_mode == ROOM_MODE_MANUAL:
            manual = self.get_room_manual_temp(room_id)
            if manual is not None:
                return min(max_temp, max(min_temp, manual)), {
                    "source": "manual", "schedule_active": False
                }
            # No stored manual temp (e.g. after restart without persisted value) –
            # fall back to auto so the room continues heating normally.
            self._room_modes[room_id] = ROOM_MODE_AUTO
            room_mode = ROOM_MODE_AUTO

        # Determine night setback modifier (applied to schedule and curve temps)
        night_setback = 0.0
        night_active = self._is_night_setback_active()
        if night_active:
            night_setback = float(cfg.get(CONF_NIGHT_SETBACK_OFFSET, DEFAULT_NIGHT_SETBACK_OFFSET))

        # Pre-heat window: per-room override > adaptive warmup history > qm-based > global static
        global_preheat  = int(cfg.get(CONF_PREHEAT_MINUTES, DEFAULT_PREHEAT_MINUTES))
        room_preheat_cfg = int(room.get(CONF_ROOM_PREHEAT_MINUTES, DEFAULT_ROOM_PREHEAT_MINUTES))
        room_qm          = float(room.get(CONF_ROOM_QM, DEFAULT_ROOM_QM))

        if room_preheat_cfg >= 0:
            # Explicit per-room override (0 = disabled for this room)
            static_preheat = room_preheat_cfg
        elif room_qm > 0 and global_preheat > 0:
            # Scale global preheat by room size relative to a 15 m² reference room
            static_preheat = max(1, round(global_preheat * math.sqrt(room_qm / 15.0)))
        else:
            static_preheat = global_preheat

        if static_preheat > 0 and cfg.get(CONF_ADAPTIVE_PREHEAT_ENABLED, DEFAULT_ADAPTIVE_PREHEAT_ENABLED):
            avg_warmup = self.get_avg_warmup_minutes(room_id)
            # Use historical warmup + 10% safety buffer (floor = static_preheat)
            preheat_minutes = max(static_preheat, round(avg_warmup * 1.1)) if avg_warmup else static_preheat
        else:
            preheat_minutes = static_preheat

        # --- 3a. HA schedule entities (external schedule.* entities with optional condition) ---
        # Each entry uses an existing room preset (comfort/eco/sleep/away) – no separate temp needed.
        # First matching active schedule wins. If schedules are configured but none fires → Eco.
        ha_scheds = room.get(CONF_HA_SCHEDULES, [])
        if ha_scheds:
            mode_to_temp = {
                ROOM_MODE_COMFORT: comfort_base,
                ROOM_MODE_ECO:     eco_base,
                ROOM_MODE_SLEEP:   sleep_base,
                ROOM_MODE_AWAY:    away_base,
            }
            for ha_sched in ha_scheds:
                entity_id = ha_sched.get("entity", "")
                if not entity_id:
                    continue
                # Check optional condition entity
                cond_entity = ha_sched.get("condition_entity", "")
                if cond_entity:
                    cond_state = self.hass.states.get(cond_entity)
                    expected = ha_sched.get("condition_state", "on")
                    if cond_state is None or cond_state.state != expected:
                        continue  # Condition not met – skip this binding
                # Check whether the HA schedule is currently active
                sched_state = self.hass.states.get(entity_id)
                if sched_state and sched_state.state == STATE_ON:
                    sched_mode = ha_sched.get("mode", ROOM_MODE_COMFORT)
                    ha_temp = mode_to_temp.get(sched_mode, mode_to_temp[ROOM_MODE_COMFORT])
                    target = min(max_temp, max(min_temp, ha_temp + room_offset - night_setback))
                    return target, {
                        "source": "ha_schedule",
                        "schedule_active": True,
                        "ha_schedule_entity": entity_id,
                        "ha_schedule_mode": sched_mode,
                        "night_setback": night_setback,
                    }
            # Schedules configured but none active → use configured off-mode (eco or sleep)
            off_mode = room.get(CONF_HA_SCHEDULE_OFF_MODE, DEFAULT_HA_SCHEDULE_OFF_MODE)
            off_base = sleep_base if off_mode == ROOM_MODE_SLEEP else eco_base
            target = min(max_temp, max(min_temp, off_base + room_offset - night_setback))
            return target, {
                "source": f"ha_schedule_{off_mode}",
                "schedule_active": False,
                "ha_schedule_off_mode": off_mode,
                "night_setback": night_setback,
            }

        # --- 3b. Active internal schedule or upcoming pre-heat period ---
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
        # comfort_base is already the curve-derived comfort target (see _get_room_preset_temps)
        target = comfort_base + room_offset - night_setback
        target = min(max_temp, max(min_temp, target))
        return target, {
            "source": "heating_curve",
            "schedule_active": False,
            "curve_base": comfort_base,
            "eco_base": eco_base,
            "sleep_base": sleep_base,
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

    def _set_valve_entity(self, valve_entity: str, target_temp: float, force: bool = False) -> None:
        """Set setpoint on a single TRV / climate entity.

        Battery-save: only sends a new setpoint when the temperature differs
        by more than TRV_TEMP_HYSTERESIS °C from the last sent value (unless force=True).
        """
        if not valve_entity:
            return
        state = self.hass.states.get(valve_entity)
        if state is None:
            return
        if valve_entity.split(".")[0] == "climate":
            # Battery-save hysteresis: skip if change is below threshold
            last = self._last_sent_temps.get(valve_entity)
            if not force and last is not None and abs(target_temp - last) < TRV_TEMP_HYSTERESIS:
                return
            self._last_sent_temps[valve_entity] = target_temp
            self.hass.async_create_task(
                self.hass.services.async_call(
                    "climate",
                    "set_temperature",
                    {"entity_id": valve_entity, "temperature": target_temp},
                )
            )

    def _turn_off_valve_entity(self, valve_entity: str) -> None:
        """Turn off a TRV climate entity (hvac_mode=off), or set frost temp as fallback."""
        if not valve_entity:
            return
        state = self.hass.states.get(valve_entity)
        if state is None:
            return
        if valve_entity.split(".")[0] == "climate":
            hvac_modes = state.attributes.get("hvac_modes", [])
            # Prefer setting hvac_mode to off (saves battery, no hunting)
            if "off" in hvac_modes:
                self._last_sent_temps.pop(valve_entity, None)  # force update when turning back on
                self.hass.async_create_task(
                    self.hass.services.async_call(
                        "climate",
                        "set_hvac_mode",
                        {"entity_id": valve_entity, "hvac_mode": "off"},
                    )
                )
            else:
                # Fallback: set to frost protection temperature
                frost_temp = self._get_frost_protection_temp()
                self._set_valve_entity(valve_entity, frost_temp, force=True)

    def _turn_on_valve_entity(self, valve_entity: str) -> None:
        """Ensure TRV is in heat mode (turn on if it was set to off)."""
        if not valve_entity:
            return
        state = self.hass.states.get(valve_entity)
        if state is None:
            return
        if valve_entity.split(".")[0] == "climate":
            current_hvac = state.state  # "off", "heat", "auto", etc.
            if current_hvac == "off":
                hvac_modes = state.attributes.get("hvac_modes", [])
                preferred = "heat" if "heat" in hvac_modes else ("auto" if "auto" in hvac_modes else None)
                if preferred:
                    self.hass.async_create_task(
                        self.hass.services.async_call(
                            "climate",
                            "set_hvac_mode",
                            {"entity_id": valve_entity, "hvac_mode": preferred},
                        )
                    )

    def _set_valve_entities(self, room: dict, target_temp: float, force: bool = False) -> None:
        """Set setpoint on all TRV / climate entities configured for a room."""
        # New: list of valve entities
        for entity in room.get(CONF_VALVE_ENTITIES, []):
            if entity:
                # Ensure TRV is in heat mode before setting temperature
                self._turn_on_valve_entity(entity)
                self._set_valve_entity(entity, target_temp, force=force)
        # Legacy: single valve entity
        single = room.get(CONF_VALVE_ENTITY)
        if single and single not in room.get(CONF_VALVE_ENTITIES, []):
            self._turn_on_valve_entity(single)
            self._set_valve_entity(single, target_temp, force=force)

    def _turn_off_valve_entities(self, room: dict) -> None:
        """Turn off all TRV entities for a room (window open / room off)."""
        for entity in room.get(CONF_VALVE_ENTITIES, []):
            if entity:
                self._turn_off_valve_entity(entity)
        single = room.get(CONF_VALVE_ENTITY)
        if single and single not in room.get(CONF_VALVE_ENTITIES, []):
            self._turn_off_valve_entity(single)

    def _detect_manual_trv_override(self, room: dict, room_id: str, room_mode: str) -> None:
        """Detect if a TRV was manually adjusted and switch room to manual mode.

        Compares the TRV's reported target_temperature against the last value IHC set.
        If they differ by more than TRV_TEMP_HYSTERESIS, a manual override is assumed.
        """
        valve_entities = list(room.get(CONF_VALVE_ENTITIES, []))
        single = room.get(CONF_VALVE_ENTITY)
        if single and single not in valve_entities:
            valve_entities.append(single)

        if not valve_entities:
            return

        for entity_id in valve_entities:
            if not entity_id:
                continue
            state = self.hass.states.get(entity_id)
            if state is None:
                continue
            trv_target = state.attributes.get("temperature")
            if trv_target is None:
                continue
            trv_target = float(trv_target)
            last_ihc = self._last_sent_temps.get(entity_id)
            if last_ihc is None:
                # First cycle – record current TRV temp as baseline
                self._last_ihc_set_temps[room_id] = trv_target
                continue
            # If TRV temperature differs significantly from what IHC last sent, user adjusted it
            if abs(trv_target - last_ihc) >= 0.5:
                room_name = room.get(CONF_ROOM_NAME, room_id)
                _LOGGER.info(
                    "IHC: Manual TRV override detected in %s – TRV set to %.1f°C (IHC had %.1f°C). "
                    "Switching to manual mode.",
                    room_name, trv_target, last_ihc,
                )
                # Switch room to manual mode and record the manually set temperature
                self.set_room_mode(room_id, ROOM_MODE_MANUAL)
                self.set_room_manual_temp(room_id, trv_target)
                # Update last sent temp to avoid re-triggering
                self._last_sent_temps[entity_id] = trv_target
                # Get next schedule time for notification message
                next_period = self.get_next_schedule_period(room_id)
                next_str = ""
                if next_period:
                    try:
                        next_str = f" bis {next_period.get('start', '')} Uhr"
                    except Exception as exc:
                        _LOGGER.debug("IHC: Could not format next period for notification: %s", exc)
                # Send HA notification
                self.hass.async_create_task(
                    self.hass.services.async_call(
                        "persistent_notification",
                        "create",
                        {
                            "title": f"IHC: Manueller Eingriff – {room_name}",
                            "message": (
                                f"**{room_name}** wurde manuell am Gerät auf "
                                f"**{trv_target:.1f} °C** gestellt "
                                f"und bleibt bis zur nächsten Schaltzeit{next_str} im Modus **Manuell**.\n\n"
                                "Der Modus wird beim nächsten Zeitplan-Event automatisch zurückgesetzt."
                            ),
                            "notification_id": f"ihc_manual_override_{room_id}",
                        },
                    )
                )
                break  # Only trigger once per update cycle per room

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

        # Check guest mode timer expiry (Roadmap 2.0)
        self._check_guest_mode_expiry()

        # Presence-based auto-away
        self._update_presence_auto_away()

        # Vacation assistant: auto-activate/deactivate based on date range (Roadmap 1.2)
        self._update_vacation_auto_mode()

        # v1.4 – Auto-detect vacation from HA calendar (once per day)
        self.hass.async_create_task(self._async_check_vacation_calendar())

        # Rückkehr-Vorheizung: pre-heat before returning from vacation (Roadmap 2.0)
        self._update_vacation_return_preheat()

        # v1.3 – Adaptive heating curve (once per day)
        self._adapt_heating_curve()

        # Persist temperature history once per hour (survives HA restarts)
        now = datetime.now()
        if self._history_last_saved is None or (now - self._history_last_saved).total_seconds() >= 3600:
            self._history_last_saved = now
            self.hass.async_create_task(self._async_save_runtime_state())

        outdoor_temp = self._get_outdoor_temp()
        curve_target = (
            self._heating_curve.get_target_temp(outdoor_temp)
            if outdoor_temp is not None
            else None
        )
        summer_mode = self._is_summer_mode_active()

        room_data: Dict[str, dict] = {}

        solar_boost = self._get_solar_boost()
        # Use enhanced price-forecast offset (Tibber / Nordpool hourly aware)
        price_eco_offset = self._get_price_forecast_offset()
        cold_boost = self._get_weather_cold_boost()
        # v1.4 – ETA pre-heat: minutes until someone arrives home
        eta_minutes = self._get_eta_preheat_minutes()

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
            configured_weight = float(room.get(CONF_WEIGHT, DEFAULT_WEIGHT))
            room_qm_val = float(room.get(CONF_ROOM_QM, DEFAULT_ROOM_QM))
            # If weight is at its default (1.0) and room_qm is set, derive weight from area
            if configured_weight == DEFAULT_WEIGHT and room_qm_val > 0:
                weight = round(math.sqrt(room_qm_val / 15.0), 2)  # 15 m² = weight 1.0
            else:
                weight = configured_weight

            # Update temperature history (Roadmap 1.1)
            self._update_temp_history(room_id, current_temp)

            # Room-level presence check (Roadmap 1.2 – exposed to UI)
            room_presence_active = self._check_room_presence(room)

            target_temp, meta = self._calculate_target_temp(room, outdoor_temp)
            # Store the outdoor-regulated effective preset temps so entities can expose them
            comfort_eff, eco_eff, sleep_eff, away_eff = self._get_room_preset_temps(room, outdoor_temp)

            # Apply solar boost (Roadmap 1.3)
            if solar_boost > 0 and meta.get("source") not in ("frost_protection", "system_away", "system_vacation", "room_off"):
                target_temp = min(float(room.get(CONF_MAX_TEMP, DEFAULT_MAX_TEMP)), target_temp + solar_boost)
                meta["solar_boost"] = solar_boost

            # Apply energy price offset (Roadmap 1.3)
            # price_eco_offset > 0 → cheap hour: raise setpoint to store heat
            # price_eco_offset < 0 → expensive hour: lower setpoint to save energy
            if price_eco_offset != 0 and meta.get("source") not in ("frost_protection", "system_away", "system_vacation", "room_off"):
                target_temp = min(
                    float(room.get(CONF_MAX_TEMP, DEFAULT_MAX_TEMP)),
                    max(float(room.get(CONF_MIN_TEMP, DEFAULT_MIN_TEMP)), target_temp + price_eco_offset),
                )
                meta["price_eco_offset"] = price_eco_offset

            # Mold protection boost (Roadmap 2.0) – raise target to reduce humidity risk
            mold_boost = self._get_mold_temp_boost(room, current_temp)
            if mold_boost > 0 and meta.get("source") not in ("frost_protection", "system_away", "system_vacation"):
                target_temp = min(float(room.get(CONF_MAX_TEMP, DEFAULT_MAX_TEMP)), target_temp + mold_boost)
                meta["mold_boost"] = mold_boost

            # Weather cold boost – raise target on forecasted cold days
            if cold_boost > 0 and meta.get("source") not in ("frost_protection", "system_away", "system_vacation", "room_off"):
                target_temp = min(float(room.get(CONF_MAX_TEMP, DEFAULT_MAX_TEMP)), target_temp + cold_boost)
                meta["cold_boost"] = cold_boost

            # Manual TRV override detection: if TRV was adjusted by hand, switch room to manual
            if room_mode not in (ROOM_MODE_OFF, ROOM_MODE_MANUAL) and not window_open:
                self._detect_manual_trv_override(room, room_id, room_mode)

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

            # Warmup tracking: update predictive pre-heat data (Roadmap 1.1)
            demand = controller_state["demand"]
            self._update_warmup_tracking(
                room_id,
                was_cold=demand > 0,
                is_now_warm=demand == 0 and current_temp is not None,
            )

            # Collect mold data for room info
            mold_data = self._check_mold_risk(room, current_temp)

            room_data[room_id] = {
                "ventilation": None,  # filled below after outdoor_humidity is known
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
                "next_period": self.get_next_schedule_period(room_id),  # Roadmap 1.1
                "anomaly": self._detect_sensor_anomaly(room_id),    # Roadmap 1.1
                "room_presence_active": room_presence_active,       # Roadmap 1.2
                "mold": mold_data,                                  # Roadmap 2.0
                # Outdoor-regulated effective preset temps (for display in frontend)
                "comfort_temp_eff": comfort_eff,
                "eco_temp_eff": eco_eff,
                "sleep_temp_eff": sleep_eff,
                "away_temp_eff": away_eff,
                "effective_weight": weight,
                # Ensure night_setback is always present (meta may omit it for mode overrides)
                "night_setback": 0.0,
                # HA schedule time blocks (read from schedule.* entity config entries)
                "ha_schedule_blocks": self.get_ha_schedule_blocks_for_room(room),
                **meta,
            }

        # Klimabaustein decision
        cfg = self.get_config()
        enable_cooling = bool(cfg.get(CONF_ENABLE_COOLING, False))
        controller_mode = cfg.get(CONF_CONTROLLER_MODE, DEFAULT_CONTROLLER_MODE)
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

        # Apply TRV setpoints and/or control heating switch
        if controller_mode == CONTROLLER_MODE_TRV:
            # TRV mode: each TRV self-regulates — always send the desired target temp.
            # The TRV opens/closes its valve based on its own thermostat (current vs target).
            # We do NOT suppress setpoints based on should_heat because:
            #   - There is no central boiler in TRV mode
            #   - TRVs decide themselves whether to heat
            # Exception: room OFF or window open → turn off TRV (or frost-protect as fallback).
            for room in self.get_rooms():
                room_id = room.get(CONF_ROOM_ID, "")
                if not room_id or room_id not in room_data:
                    continue
                rdata = room_data[room_id]
                room_mode = rdata.get("room_mode", ROOM_MODE_AUTO)
                window_open = rdata.get("window_open", False)
                if window_open or room_mode == ROOM_MODE_OFF:
                    # Turn TRV off (or frost-protect if off mode not supported)
                    self._turn_off_valve_entities(room)
                else:
                    # Always send the desired target – TRV decides whether to heat
                    self._set_valve_entities(room, rdata["target_temp"])
            # TRV mode does NOT use a heating switch (no central boiler switch)
        else:
            # Switch mode: propagate setpoints to TRVs, control central heating switch
            for room in self.get_rooms():
                room_id = room.get(CONF_ROOM_ID, "")
                if not room_id or room_id not in room_data:
                    continue
                rdata = room_data[room_id]
                room_mode = rdata.get("room_mode", ROOM_MODE_AUTO)
                window_open = rdata.get("window_open", False)
                if window_open or room_mode == ROOM_MODE_OFF:
                    # Switch mode: turn off TRVs when window open or room off
                    self._turn_off_valve_entities(room)
                else:
                    self._set_valve_entities(room, rdata["target_temp"])
            self._set_heating_switch(should_heat)

        if enable_cooling:
            self._set_cooling_switch(should_cool)

        # Roadmap 1.4 – Set boiler flow temp
        flow_temp = self._calculate_flow_temp(outdoor_temp, total_demand)
        if should_heat and flow_temp is not None:
            self._set_flow_temp(flow_temp)

        night_setback_active = self._is_night_setback_active()

        # Energy cost estimate
        boiler_kw = float(cfg.get(CONF_BOILER_KW, DEFAULT_BOILER_KW))

        # Per-room energy calculation (works for both switch and TRV mode)
        rooms_list = self.get_rooms()
        for room in rooms_list:
            room_id = room.get(CONF_ROOM_ID, "")
            if room_id and room_id in room_data:
                room_data[room_id]["energy_today_kwh"] = self._calculate_room_energy_today(room, room_id)

        if controller_mode == CONTROLLER_MODE_TRV:
            # TRV/Mietwohnung: total = sum of all rooms (no central boiler kW)
            energy_today_kwh = round(
                sum(rd.get("energy_today_kwh", 0.0) for rd in room_data.values()), 2
            )
            # Yesterday not easily tracked per-room; fall back to runtime-based with boiler_kw
            energy_yesterday_kwh = round(
                self.get_heating_runtime_yesterday_minutes() / 60.0 * boiler_kw, 2
            )
        else:
            # Switch mode: prefer smart meter if available, else runtime × boiler_kw
            sm_energy = self._get_smart_meter_energy_today()
            if sm_energy is not None:
                energy_today_kwh = round(sm_energy, 2)
            else:
                energy_today_kwh = round(self.get_heating_runtime_today_minutes() / 60.0 * boiler_kw, 2)
            energy_yesterday_kwh = round(self.get_heating_runtime_yesterday_minutes() / 60.0 * boiler_kw, 2)

        efficiency_score = self.calculate_efficiency_score(outdoor_temp)

        # Weather forecast (multi-day)
        weather_forecast = self._get_weather_forecast()

        # Ventilation advice – compute per room now that outdoor_temp is known
        try:
            outdoor_humidity = self._get_outdoor_humidity()
            weather_condition = (weather_forecast["condition"] if weather_forecast else None)
            energy_price_high = price_eco_offset > 0  # positive offset = eco active = high price period
            for room in self.get_rooms():
                room_id = room.get(CONF_ROOM_ID, "")
                if not room_id or room_id not in room_data:
                    continue
                v_advice = self._calculate_ventilation_advice(
                    room=room,
                    current_temp=room_data[room_id].get("current_temp"),
                    outdoor_temp=outdoor_temp,
                    outdoor_humidity=outdoor_humidity,
                    weather_condition=weather_condition,
                    total_demand=total_demand,
                    energy_price_high=energy_price_high,
                )
                room_data[room_id]["ventilation"] = v_advice
                room_data[room_id]["co2_ppm"] = v_advice["co2_ppm"] if v_advice else None
            outdoor_humidity_out = outdoor_humidity
        except Exception:
            _LOGGER.debug("IHC: Ventilation advice calculation failed", exc_info=True)
            outdoor_humidity_out = None

        # Guest mode info
        guest_remaining_minutes = None
        if self._guest_mode_active and self._guest_mode_until:
            remaining = (self._guest_mode_until - datetime.now()).total_seconds() / 60
            guest_remaining_minutes = max(0, round(remaining))

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
            "vacation_auto_active": self._vacation_auto_active,
            "vacation_range": self.get_vacation_range(),
            "return_preheat_active": self._return_preheat_active,
            "system_mode": self._system_mode,
            "controller_mode": controller_mode,
            "guest_mode_active": self._guest_mode_active,
            "guest_remaining_minutes": guest_remaining_minutes,
            "heating_runtime_today": self.get_heating_runtime_today_minutes(),
            "heating_runtime_yesterday": self.get_heating_runtime_yesterday_minutes(),
            "energy_today_kwh": energy_today_kwh,
            "energy_yesterday_kwh": energy_yesterday_kwh,
            "efficiency_score": efficiency_score,
            "solar_boost": solar_boost,
            "cold_boost": cold_boost,
            "solar_power": self._get_solar_power(),
            "energy_price": self._get_current_energy_price(),
            "energy_price_eco_offset": price_eco_offset,
            "flow_temp": flow_temp,
            "weather_forecast": weather_forecast,
            "eta_preheat_minutes": eta_minutes,          # v1.4 – ETA-based pre-heat
            "adaptive_curve_delta": self._curve_adaptation_delta,  # v1.3 – debug info
            "curve_adaptation_enabled": cfg.get(CONF_ADAPTIVE_CURVE_ENABLED, DEFAULT_ADAPTIVE_CURVE_ENABLED),
            "outdoor_humidity": outdoor_humidity_out,
            "rooms": room_data,
            "debug": self._controller.get_debug_info(),
        }

    # ------------------------------------------------------------------
    # HA Schedule entity block reader
    # ------------------------------------------------------------------

    def _get_ha_schedule_blocks(self, entity_id: str) -> list[dict]:
        """Read weekly time blocks from a HA schedule.* helper entity config.

        HA stores schedule blocks in the config_entry.data / options under day keys:
          {"monday": [{"from": "07:00:00", "to": "09:00:00"}], "tuesday": [...], ...}

        Returns IHC-compatible block list:
          [{"days": ["mon", "tue"], "periods": [{"start": "07:00", "end": "09:00"}]}]
        """
        DAY_MAP = {
            "monday": "mon", "tuesday": "tue", "wednesday": "wed",
            "thursday": "thu", "friday": "fri", "saturday": "sat", "sunday": "sun",
        }
        try:
            registry = er.async_get(self.hass)
            entry = registry.async_get(entity_id)
            if not entry or not entry.config_entry_id:
                return []
            config_entry = self.hass.config_entries.async_get_entry(entry.config_entry_id)
            if not config_entry:
                return []

            # Merge data + options (HA may store schedule blocks in either)
            cfg: dict = {}
            cfg.update(config_entry.data or {})
            cfg.update(config_entry.options or {})

            # Collect all periods grouped by start/end time (merge same-time different days)
            # Structure: {(start, end): [day, ...]}
            period_map: dict[tuple[str, str], list[str]] = {}
            for ha_day, ihc_day in DAY_MAP.items():
                for period in cfg.get(ha_day, []):
                    start = str(period.get("from", ""))[:5]  # "07:00:00" → "07:00"
                    end   = str(period.get("to", ""))[:5]
                    if not start or not end:
                        continue
                    key = (start, end)
                    period_map.setdefault(key, []).append(ihc_day)

            # Convert to IHC schedule block list
            blocks = [
                {"days": days, "periods": [{"start": s, "end": e}]}
                for (s, e), days in period_map.items()
            ]
            return blocks
        except Exception:  # noqa: BLE001
            _LOGGER.debug("IHC: could not read HA schedule blocks for %s", entity_id)
            return []

    def get_ha_schedule_blocks_for_room(self, room: dict) -> dict[str, list[dict]]:
        """Return {entity_id: [blocks]} for all ha_schedules configured for a room."""
        result: dict[str, list[dict]] = {}
        for ha_sched in room.get("ha_schedules", []):
            entity_id = ha_sched.get("entity", "")
            if entity_id:
                result[entity_id] = self._get_ha_schedule_blocks(entity_id)
        return result

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
        """Remove a room by ID and clean up all associated entities from the registry."""
        new_options = dict(self._config_entry.options)
        rooms = [r for r in new_options.get(CONF_ROOMS, []) if r.get(CONF_ROOM_ID) != room_id]
        new_options[CONF_ROOMS] = rooms
        self.hass.config_entries.async_update_entry(
            self._config_entry, options=new_options
        )
        self._room_modes.pop(room_id, None)
        self._room_manual_temps.pop(room_id, None)
        self._schedule_managers.pop(room_id, None)

        # Remove all HA entities associated with this room from the entity registry
        try:
            registry = er.async_get(self.hass)
            entry_id = self._config_entry.entry_id
            # Find all entities for this config entry that belong to this room
            # Unique IDs follow the pattern: {entry_id}_room_{room_id}*
            room_uid_prefix = f"{entry_id}_room_{room_id}"
            entities_to_remove = [
                entity for entity in er.async_entries_for_config_entry(registry, entry_id)
                if entity.unique_id and entity.unique_id.startswith(room_uid_prefix)
            ]
            for entity_entry in entities_to_remove:
                registry.async_remove(entity_entry.entity_id)
                _LOGGER.debug("IHC: Removed entity %s for deleted room %s", entity_entry.entity_id, room_id)
        except Exception as exc:
            _LOGGER.warning("IHC: Could not clean up entities for room %s: %s", room_id, exc)

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
