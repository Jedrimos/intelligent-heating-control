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
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from homeassistant.core import HomeAssistant, callback, Event
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.storage import Store
from homeassistant.helpers.event import async_track_state_change_event
from homeassistant.const import STATE_ON, STATE_OFF, STATE_UNAVAILABLE, STATE_UNKNOWN
from homeassistant.util import dt as dt_util

# Mixin imports – each mixin contains a focused group of methods
from .presence_manager import PresenceManagerMixin
from .window_manager import WindowManagerMixin
from .trv_controller import TRVControllerMixin
from .room_logic import RoomLogicMixin
from .energy_manager import EnergyManagerMixin
from .comfort_manager import ComfortManagerMixin
from .vacation_manager import VacationManagerMixin
from .climate_adjustments import ClimateAdjustmentsMixin
from .heat_generator_stub import HeatGeneratorMixin

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
    CONF_HEATING_PERIOD_ENTITY,
    CONF_PRESENCE_AWAY_DELAY_MINUTES,
    DEFAULT_PRESENCE_AWAY_DELAY_MINUTES,
    CONF_PRESENCE_ARRIVE_DELAY_MINUTES,
    DEFAULT_PRESENCE_ARRIVE_DELAY_MINUTES,
    CONF_PRESENCE_SENSOR,
    CONF_PRESENCE_SENSOR_ON_DELAY,
    CONF_PRESENCE_SENSOR_OFF_DELAY,
    DEFAULT_PRESENCE_SENSOR_ON_DELAY,
    DEFAULT_PRESENCE_SENSOR_OFF_DELAY,
    CONF_WINDOW_OPEN_TEMP,
    DEFAULT_WINDOW_OPEN_TEMP,
    CONF_WINDOW_RESTORE_MODE,
    DEFAULT_WINDOW_RESTORE_MODE,
    CONF_FROST_PROTECTION_TEMP,
    CONF_OFF_USE_FROST_PROTECTION,
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
    CONF_OUTDOOR_TEMP_SMOOTHING_MINUTES,
    DEFAULT_OUTDOOR_TEMP_SMOOTHING_MINUTES,
    CONF_STARTUP_GRACE_SECONDS,
    DEFAULT_STARTUP_GRACE_SECONDS,
    DEFAULT_SUMMER_THRESHOLD,
    CONF_SUMMER_MODE_ENTITY,
    CONF_FORECAST_COLDNIGHT_ENABLED,
    DEFAULT_FORECAST_COLDNIGHT_ENABLED,
    CONF_FORECAST_COLDNIGHT_TEMP,
    DEFAULT_FORECAST_COLDNIGHT_TEMP,
    CONF_FORECAST_ADVANCE_HOURS,
    DEFAULT_FORECAST_ADVANCE_HOURS,
    DEFAULT_FROST_PROTECTION_TEMP,
    DEFAULT_OFF_USE_FROST_PROTECTION,
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
    CONF_OPTIMUM_START_ENABLED,
    DEFAULT_OPTIMUM_START_ENABLED,
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
    # TRV sensor data integration
    CONF_TRV_TEMP_WEIGHT,
    DEFAULT_TRV_TEMP_WEIGHT,
    CONF_TRV_TEMP_OFFSET,
    DEFAULT_TRV_TEMP_OFFSET,
    CONF_TRV_VALVE_DEMAND,
    DEFAULT_TRV_VALVE_DEMAND,
    CONF_TRV_MIN_SEND_INTERVAL,
    DEFAULT_TRV_MIN_SEND_INTERVAL,
    CONF_BOOST_DEFAULT_DURATION,
    DEFAULT_BOOST_DEFAULT_DURATION,
    CONF_AGGRESSIVE_MODE_ENABLED,
    DEFAULT_AGGRESSIVE_MODE_ENABLED,
    CONF_AGGRESSIVE_MODE_RANGE,
    DEFAULT_AGGRESSIVE_MODE_RANGE,
    CONF_AGGRESSIVE_MODE_OFFSET,
    DEFAULT_AGGRESSIVE_MODE_OFFSET,
    # v1.7 – Heizgruppen
    CONF_GROUPS,
    CONF_GROUP_ID,
    CONF_GROUP_NAME,
    CONF_GROUP_ROOMS,
)
from .heating_curve import HeatingCurve
from .schedule_manager import ScheduleManager
from .heating_controller import HeatingController
from .flow_temp_pid import FlowTempPID

_LOGGER = logging.getLogger(__name__)

# TRV battery-save: minimum temperature change before sending a new setpoint to TRV
TRV_TEMP_HYSTERESIS = 0.3       # °C – only send update if setpoint changes by at least this much
TRV_LARGE_CHANGE_THRESHOLD = 1.0  # °C – above this, always send immediately (mode change etc.)
TRV_SETPOINT_STEP = 0.5         # °C – quantise setpoint to TRV resolution (most TRVs: 0.5 °C)


class IHCCoordinator(
    PresenceManagerMixin,
    WindowManagerMixin,
    TRVControllerMixin,
    RoomLogicMixin,
    EnergyManagerMixin,
    ComfortManagerMixin,
    VacationManagerMixin,
    ClimateAdjustmentsMixin,
    HeatGeneratorMixin,
    DataUpdateCoordinator,
):
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
        # Manual-override tracking: reset to AUTO on schedule transition
        self._room_manual_since: Dict[str, datetime] = {}       # room_id → when manual was set
        self._room_manual_period_key: Dict[str, str] = {}       # room_id → "start|end" snapshot
        self._window_open_counters: Dict[str, int] = {}  # room_id → consecutive drops
        self._boost_until: Dict[str, datetime] = {}  # room_id → boost expiry time
        self._room_pre_boost_mode: Dict[str, str] = {}  # room_id → mode before boost
        # Cache for YAML-defined schedule entities (logged once, not every 60s cycle)
        self._yaml_schedule_warned: set = set()  # entity_ids already warned about

        # Presence-based auto-away
        self._presence_away_active: bool = False  # True when auto-away triggered by presence
        self._presence_away_pending_since = None  # datetime when all persons left (for delay)
        self._presence_arrive_pending_since = None  # datetime when someone arrived (for arrival delay)

        # PIR/motion sensor tracking per room: {room_id: datetime_of_last_motion}
        self._pir_last_on: Dict[str, Any] = {}   # when PIR last detected motion
        self._pir_last_off: Dict[str, Any] = {}  # when PIR last saw no motion

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
        # Target temperature history (same format/cadence as _temp_history)
        self._target_history: Dict[str, deque] = {}
        # Track when history was last persisted (save at most once per hour)
        self._history_last_saved: Optional[datetime] = None

        # Roadmap 1.1 – Warmup tracking (for predictive pre-heating)
        self._warmup_start: Dict[str, Any] = {}                    # room_id → (start_time, outdoor_temp)
        self._warmup_history: Dict[str, List[float]] = {}          # room_id → flat warmup minutes (compat)

        # v1.7 – Optimum Start: outdoor-temp-bucketed warmup history
        self._warmup_history_by_temp: Dict[str, Dict[int, List[float]]] = {}  # room_id → {bucket→[minutes]}

        # v1.7 – Thermal mass: cooling rate tracking
        self._cooling_rate_history: Dict[str, List[float]] = {}    # room_id → [rate, ...]
        self._cooling_start: Dict[str, tuple] = {}                  # room_id → (start_time, start_temp, outdoor)
        self._cooling_prev_demand: Dict[str, float] = {}            # room_id → demand from last cycle

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
        # TRV battery save: track timestamp of last actual send per entity (for time throttle)
        self._last_sent_times: Dict[str, float] = {}  # entity_id → monotonic time of last send
        # Manual override detection: track timestamp of last send per entity (for fallback timeout)
        self._trv_command_sent_at: Dict[str, float] = {}
        # Confirmation-based override guard: when IHC sends a new setpoint, suppress override
        # detection until the TRV *confirms* the command by reporting back the expected value.
        # This replaces the old time-based grace period and handles slow TRVs correctly
        # (e.g. Homematic TRVs that only update every 5–10 min via duty cycle).
        # Key = entity_id, value = the setpoint IHC sent that we're waiting to be confirmed.
        self._trv_cmd_pending: Dict[str, float] = {}
        # Fallback: if TRV never confirms within this many seconds (connectivity issue), give up
        # waiting and reset the baseline to the TRV's current reported value.
        self._trv_confirm_timeout: int = 600  # 10 minutes
        # On startup skip one cycle so _last_sent_temps can be pre-populated from TRV states
        # before the manual-override detector runs (prevents false "manual override" alerts)
        self._startup_cycles_remaining: int = 1
        # Startup grace: track the real wall-clock time when the first update cycle ran.
        # During this window all TRVs are held at frost-protection temp and the heating
        # switch stays off so we never blast heat before window sensors have reported.
        self._startup_time: Optional[datetime] = None

        # Save debounce: avoid hammering the .storage/ file on bursts of rapid mode changes.
        # All save requests are coalesced into a single write after _SAVE_DEBOUNCE_SECONDS.
        self._save_debounce_handle: Optional[Any] = None
        self._SAVE_DEBOUNCE_SECONDS: int = 30

        # Manual TRV override detection: track last IHC-set temperature per room
        self._last_ihc_set_temps: Dict[str, float] = {}  # room_id → last temp IHC intentionally set
        # Reconnect guard: entities that were unavailable/unknown last cycle → skip override detection
        self._trv_unavailable_entities: set = set()

        # Stuck-valve detection: entity_id → monotonic time when stuck condition first appeared
        self._trv_stuck_since: Dict[str, float] = {}

        # Kalkschutz: entity_id → date of last exercise
        self._limescale_last_exercise: Dict[str, Any] = {}
        # Kalkschutz: entity_id → monotonic time when exercise started (None = not in progress)
        self._limescale_in_progress: Dict[str, float] = {}

        # ETA preheat: last computed eta_minutes (shared across room loop)
        self._current_eta_minutes: Optional[float] = None

        # Window timing: track when window was first seen open/closed (timestamp)
        self._window_open_since: Dict[str, Optional[float]] = {}   # room_id → epoch when opened
        self._window_closed_since: Dict[str, Optional[float]] = {} # room_id → epoch when closed
        # Brief-reopen guard: saves opening time when window closes, restored on quick reopen
        self._window_prev_open_since: Dict[str, Optional[float]] = {}
        self._window_closed_at: Dict[str, Optional[float]] = {}    # always set when window closes
        # Window restore mode: track per-room state to detect open→closed transitions
        self._prev_window_open: Dict[str, bool] = {}               # room_id → was window open last cycle
        self._pre_window_temps: Dict[str, float] = {}              # room_id → target_temp before window opened
        # Last-known sensor temperature cache: entity_id → (value, timestamp)
        # Used as fallback when a sensor goes unavailable during normal operation.
        # Stale after SENSOR_FALLBACK_SECONDS (30 min) → returns None again.
        self._last_known_sensor_temps: Dict[str, tuple] = {}       # entity_id → (float, datetime)

        # Event-driven window detection: single subscription for all window sensors.
        # Using one subscription (not per-sensor) avoids a bug where removing one sensor
        # would cancel the shared unsub and leave all other sensors unmonitored.
        self._window_listener_unsub: Optional[Any] = None   # single unsub callback
        self._window_listener_sensors: set = set()           # currently subscribed sensors
        self._window_sensor_last_known: Dict[str, bool] = {}  # entity_id → last real state

        # Event-driven HA schedule / condition detection: triggers immediate refresh when
        # a schedule entity or condition_entity (input_boolean, etc.) changes state.
        self._ha_sched_listener_unsub: Optional[Any] = None
        self._ha_sched_listener_entities: set = set()

        # Outdoor temperature smoothing: rolling buffer of raw readings (one per cycle = 1/min).
        # Moving average over the last N minutes filters out fast sun/cloud transitions that would
        # otherwise cause the heating curve to oscillate and the boiler to hunt.
        self._outdoor_temp_buffer: deque = deque(maxlen=60)  # max 60 readings = 60 min history

        # v1.6 – Anforderungs-Heatmap: 7-day × 24-hour EMA grid per room
        # Index [weekday 0=Mon…6][hour 0…23] → smoothed demand 0-100
        # Updated each cycle: new = 0.9 × old + 0.1 × current_demand
        self._demand_heatmap: Dict[str, List[List[float]]] = {}

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

        # Re-subscribe window sensor listeners whenever config changes so that newly
        # added sensors are monitored immediately (without needing an HA restart).
        # _setup_window_listeners() is a no-op when the sensor set hasn't changed.
        if self.hass is not None:
            self._setup_window_listeners()
            self._setup_ha_schedule_listeners()

    async def async_load_runtime_state(self) -> None:
        """Load persisted runtime state from Store."""
        data = await self._store.async_load()
        if not data:
            return
        self._system_mode = data.get("system_mode", SYSTEM_MODE_AUTO)
        self._room_modes = data.get("room_modes", {})
        self._room_manual_temps = data.get("room_manual_temps", {})
        # Populate manual tracking for rooms that were in MANUAL mode before restart.
        # Without a timestamp, the auto-reset logic would never fire after restart.
        # Setting utcnow() means: any schedule change AFTER restart will trigger auto-reset.
        for room_id, mode in self._room_modes.items():
            if mode == ROOM_MODE_MANUAL and room_id not in self._room_manual_since:
                self._room_manual_since[room_id] = dt_util.utcnow()
        self._presence_away_active = data.get("presence_away_active", False)
        pending_str = data.get("presence_away_pending_since")
        if pending_str:
            try:
                from datetime import datetime
                self._presence_away_pending_since = datetime.fromisoformat(pending_str)
            except (ValueError, TypeError):
                self._presence_away_pending_since = None
        arrive_str = data.get("presence_arrive_pending_since")
        if arrive_str:
            try:
                from datetime import datetime
                self._presence_arrive_pending_since = datetime.fromisoformat(arrive_str)
            except (ValueError, TypeError):
                self._presence_arrive_pending_since = None
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
                _LOGGER.warning("IHC: Could not restore guest_mode_until from store: %s", guest_until_str)
        # Restore HKV day-start baselines (so energy deltas survive HA restarts)
        self._hkv_day_start = data.get("hkv_day_start", {})
        # Restore smart meter baseline
        self._smart_meter_day_start = data.get("smart_meter_day_start")
        # Restore boost expiry times (ISO string → datetime)
        for rid, dt_str in data.get("boost_until", {}).items():
            try:
                self._boost_until[rid] = datetime.fromisoformat(dt_str)
            except (ValueError, TypeError):
                _LOGGER.debug("IHC: Could not restore boost_until for room %s: %s", rid, dt_str)
        # Restore temperature history (persisted across restarts)
        for room_id, entries in data.get("temp_history", {}).items():
            self._temp_history[room_id] = deque(entries, maxlen=CONF_TEMP_HISTORY_SIZE)
        for room_id, entries in data.get("target_history", {}).items():
            self._target_history[room_id] = deque(entries, maxlen=CONF_TEMP_HISTORY_SIZE)
        # Restore warmup history (for predictive pre-heating)
        self._warmup_history = data.get("warmup_history", {})
        # v1.7 – Restore bucketed warmup history and cooling rates
        for room_id, buckets in data.get("warmup_history_by_temp", {}).items():
            self._warmup_history_by_temp[room_id] = {int(k): list(v) for k, v in buckets.items()}
        self._cooling_rate_history = {k: list(v) for k, v in data.get("cooling_rate_history", {}).items()}
        # Restore adaptive curve state
        self._curve_adaptation_delta = float(data.get("curve_adaptation_delta", 0.0))
        # Restore demand heatmap (v1.6)
        for room_id, grid in data.get("demand_heatmap", {}).items():
            if isinstance(grid, list) and len(grid) == 7:
                self._demand_heatmap[room_id] = grid

    def _schedule_save(self) -> None:
        """Request a debounced save – coalesces rapid successive calls into one write."""
        if self._save_debounce_handle is not None:
            self._save_debounce_handle.cancel()
        self._save_debounce_handle = self.hass.loop.call_later(
            self._SAVE_DEBOUNCE_SECONDS,
            lambda: self.hass.async_create_task(self._async_save_runtime_state()),
        )

    async def _async_save_runtime_state(self) -> None:
        """Persist current runtime state to Store."""
        self._save_debounce_handle = None
        await self._store.async_save({
            "system_mode": self._system_mode,
            "room_modes": self._room_modes,
            "room_manual_temps": self._room_manual_temps,
            "presence_away_active": self._presence_away_active,
            "presence_away_pending_since": self._presence_away_pending_since.isoformat() if self._presence_away_pending_since else None,
            "presence_arrive_pending_since": self._presence_arrive_pending_since.isoformat() if self._presence_arrive_pending_since else None,
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
            "temp_history":    {rid: list(hist) for rid, hist in self._temp_history.items()},
            "target_history":  {rid: list(hist) for rid, hist in self._target_history.items()},
            # Persist warmup history for predictive pre-heating
            "warmup_history": self._warmup_history,
            # Persist adaptive curve state
            "curve_adaptation_delta": self._curve_adaptation_delta,
            # Persist demand heatmap (v1.6)
            "demand_heatmap": self._demand_heatmap,
            # v1.7 – Optimum Start: bucketed warmup history + cooling rates
            "warmup_history_by_temp": self._warmup_history_by_temp,
            "cooling_rate_history": self._cooling_rate_history,
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
    # v1.7 – Group management
    # ------------------------------------------------------------------

    def get_groups(self) -> list:
        return self.get_config().get(CONF_GROUPS, [])

    def get_group_config(self, group_id: str) -> Optional[dict]:
        return next((g for g in self.get_groups() if g.get(CONF_GROUP_ID) == group_id), None)

    async def async_add_group(self, name: str, room_ids: list) -> None:
        """Add a new room group and persist."""
        new_group = {
            CONF_GROUP_ID: str(uuid.uuid4()),
            CONF_GROUP_NAME: name,
            CONF_GROUP_ROOMS: room_ids,
        }
        opts = dict(self._config_entry.options)
        opts[CONF_GROUPS] = self.get_groups() + [new_group]
        self._suppress_reload = True
        self.hass.config_entries.async_update_entry(self._config_entry, options=opts)
        await self.async_request_refresh()

    async def async_remove_group(self, group_id: str) -> None:
        """Remove a group by ID and persist."""
        opts = dict(self._config_entry.options)
        opts[CONF_GROUPS] = [g for g in self.get_groups() if g.get(CONF_GROUP_ID) != group_id]
        self._suppress_reload = True
        self.hass.config_entries.async_update_entry(self._config_entry, options=opts)
        await self.async_request_refresh()

    async def async_update_group(self, group_id: str, **kwargs) -> None:
        """Update group name or room_ids and persist."""
        groups = list(self.get_groups())
        for i, g in enumerate(groups):
            if g.get(CONF_GROUP_ID) == group_id:
                groups[i] = {**g, **{k: v for k, v in kwargs.items() if v is not None}}
                break
        opts = dict(self._config_entry.options)
        opts[CONF_GROUPS] = groups
        self._suppress_reload = True
        self.hass.config_entries.async_update_entry(self._config_entry, options=opts)
        await self.async_request_refresh()

    async def async_set_group_mode(self, group_id: str, mode: str) -> None:
        """Set room mode for all rooms in a group."""
        group = self.get_group_config(group_id)
        if not group:
            _LOGGER.warning("IHC: set_group_mode – group %s not found", group_id)
            return
        for room_id in group.get(CONF_GROUP_ROOMS, []):
            self._room_modes[room_id] = mode
        await self._async_save_runtime_state()
        await self.async_request_refresh()

    # ------------------------------------------------------------------
    # Room / system mode management
    # ------------------------------------------------------------------

    def set_system_mode(self, mode: str) -> None:
        self._system_mode = mode
        # Re-check window states immediately so already-open windows are detected
        # on the very first update cycle after a mode change (e.g. OFF → AUTO).
        # Without this, the reaction_time delay causes a false "no window open" on
        # the first cycle because _window_open_since is None for that room.
        self._prefill_window_states()
        # Immediately notify all coordinator listeners (climate entities) so they
        # write their new hvac_mode to HA without waiting for the next 60s cycle.
        # hvac_mode reads from get_system_mode() which already reflects the new value.
        self.async_update_listeners()
        self._schedule_save()
        self.hass.async_create_task(self.async_request_refresh())

    def get_system_mode(self) -> str:
        return self._system_mode

    def set_room_mode(self, room_id: str, mode: str) -> None:
        if mode == ROOM_MODE_MANUAL:
            # Track when manual mode was entered (for auto-reset on schedule transition)
            self._room_manual_since[room_id] = dt_util.utcnow()
            self._room_manual_period_key.pop(room_id, None)
        else:
            # Clear manual tracking when leaving manual mode
            self._room_manual_since.pop(room_id, None)
            self._room_manual_period_key.pop(room_id, None)
        self._room_modes[room_id] = mode
        # Same fix: re-check open windows so mode changes react immediately
        self._prefill_window_states()
        # Immediately notify all coordinator listeners so climate entities write their
        # new preset_mode/hvac_mode without waiting for the next full 60s cycle.
        # preset_mode reads from get_room_mode() which already reflects the new value.
        self.async_update_listeners()
        self._schedule_save()
        self.hass.async_create_task(self.async_request_refresh())

    def get_room_mode(self, room_id: str) -> str:
        return self._room_modes.get(room_id, ROOM_MODE_AUTO)

    def set_room_manual_temp(self, room_id: str, temp: float) -> None:
        self._room_manual_temps[room_id] = temp
        # Use set_room_mode so _room_manual_since tracking is correctly recorded
        self.set_room_mode(room_id, ROOM_MODE_MANUAL)

    def get_room_manual_temp(self, room_id: str) -> Optional[float]:
        return self._room_manual_temps.get(room_id)

    def set_room_boost(self, room_id: str, duration_minutes: int = 60) -> None:
        """Activate boost mode for a room for the given duration.

        Uses HA native climate boost preset on TRV entities when supported.
        Falls back to comfort mode temperature for non-boost TRVs and switch mode.
        """
        # Remember current mode so we can restore it after boost ends
        if room_id not in self._boost_until:  # Only save if not already in boost
            self._room_pre_boost_mode[room_id] = self._room_modes.get(room_id, ROOM_MODE_AUTO)
        self._boost_until[room_id] = datetime.now() + timedelta(minutes=duration_minutes)
        self._room_modes[room_id] = ROOM_MODE_COMFORT
        self.async_update_listeners()
        self._schedule_save()
        self.hass.async_create_task(self.async_request_refresh())

    def cancel_room_boost(self, room_id: str) -> None:
        """Cancel boost mode for a room, restoring the mode that was active before boost."""
        self._boost_until.pop(room_id, None)
        prev_mode = self._room_pre_boost_mode.pop(room_id, ROOM_MODE_AUTO)
        self._room_modes[room_id] = prev_mode
        self.async_update_listeners()
        self._schedule_save()
        self.hass.async_create_task(self.async_request_refresh())

    def get_boost_remaining_minutes(self, room_id: str) -> int:
        """Return remaining boost minutes, 0 if not active."""
        expiry = self._boost_until.get(room_id)
        if expiry is None:
            return 0
        remaining = (expiry - datetime.now()).total_seconds() / 60
        return max(0, int(remaining))

    def _check_boost_expiry(self) -> None:
        """Expire boost modes that have timed out, restoring pre-boost mode."""
        now = datetime.now()
        expired = [rid for rid, expiry in self._boost_until.items() if now >= expiry]
        for rid in expired:
            del self._boost_until[rid]
            prev_mode = self._room_pre_boost_mode.pop(rid, ROOM_MODE_AUTO)
            self._room_modes[rid] = prev_mode

    def _is_summer_mode_active(self) -> bool:
        """Return True if Sommerautomatik should block heating."""
        cfg = self.get_config()

        # External entity takes full control when configured.
        # ON = summer active (heating blocked); OFF = summer inactive (heating allowed).
        summer_entity = cfg.get(CONF_SUMMER_MODE_ENTITY, "")
        if summer_entity:
            state = self.hass.states.get(summer_entity)
            if state is not None and state.state not in (STATE_UNAVAILABLE, STATE_UNKNOWN):
                return state.state in ("on", "true", "1")

        if not cfg.get(CONF_SUMMER_MODE_ENABLED, False):
            return False
        threshold = float(cfg.get(CONF_SUMMER_THRESHOLD, DEFAULT_SUMMER_THRESHOLD))
        outdoor_temp = self._get_outdoor_temp()
        if outdoor_temp is None:
            return False
        if outdoor_temp < threshold:
            return False

        # Cold night forecast override: if tonight will be cold, suspend summer mode for today
        # so the schedule-based heating can start normally.
        if cfg.get(CONF_FORECAST_COLDNIGHT_ENABLED, DEFAULT_FORECAST_COLDNIGHT_ENABLED):
            forecast = self._get_weather_forecast()
            if forecast:
                tonight_min = forecast.get("forecast_today_min")
                coldnight_temp = float(cfg.get(CONF_FORECAST_COLDNIGHT_TEMP, DEFAULT_FORECAST_COLDNIGHT_TEMP))
                if tonight_min is not None and tonight_min <= coldnight_temp:
                    return False  # Cold night predicted – keep heating available

        return True

    def _check_room_pir_presence(self, room: dict) -> Optional[bool]:
        """Return True=present / False=absent / None=not configured or pending.

        Tracks per-room PIR/motion sensor with configurable on/off delays.
        The sensor state changes are picked up on every update cycle (60s).
        """
        sensor_id = room.get(CONF_PRESENCE_SENSOR, "")
        if not sensor_id:
            return None  # feature not configured for this room
        room_id = room.get(CONF_ROOM_ID, "")
        if not room_id:
            return None
        state = self.hass.states.get(sensor_id)
        if state is None:
            return None  # sensor unavailable → don't influence temp

        on_delay = int(room.get(CONF_PRESENCE_SENSOR_ON_DELAY, DEFAULT_PRESENCE_SENSOR_ON_DELAY))
        off_delay = int(room.get(CONF_PRESENCE_SENSOR_OFF_DELAY, DEFAULT_PRESENCE_SENSOR_OFF_DELAY))
        now = dt_util.utcnow()

        if state.state in ("on", "home", "detected", "true", "1"):
            # Motion detected: start or maintain ON timer
            if self._pir_last_off.get(room_id) is not None:
                self._pir_last_off[room_id] = None  # cancel off-timer
            if self._pir_last_on.get(room_id) is None:
                self._pir_last_on[room_id] = now
            elapsed = (now - self._pir_last_on[room_id]).total_seconds()
            return elapsed >= on_delay  # True only after on_delay elapsed
        else:
            # No motion: start or maintain OFF timer
            if self._pir_last_on.get(room_id) is not None:
                self._pir_last_on[room_id] = None  # cancel on-timer
            if self._pir_last_off.get(room_id) is None:
                self._pir_last_off[room_id] = now
            elapsed = (now - self._pir_last_off[room_id]).total_seconds()
            if elapsed >= off_delay:
                return False  # confirmed absent
            return True  # still within off_delay → treat as present (pending)

    def _apply_aggressive_mode(
        self,
        room: dict,
        target_temp: float,
        current_temp: Optional[float],
    ) -> float:
        """Apply aggressive mode: overshoot setpoint when room is far from target.

        Only activates when:
          - aggressive_mode_enabled is True for the room
          - current_temp is known
          - current_temp < (target_temp - aggressive_mode_range)

        Returns the (possibly boosted) setpoint. The overshoot is capped
        by room max_temp so the TRV cannot be commanded above the configured maximum.
        """
        if not room.get(CONF_AGGRESSIVE_MODE_ENABLED, DEFAULT_AGGRESSIVE_MODE_ENABLED):
            return target_temp
        if current_temp is None:
            return target_temp
        agg_range = float(room.get(CONF_AGGRESSIVE_MODE_RANGE, DEFAULT_AGGRESSIVE_MODE_RANGE))
        agg_offset = float(room.get(CONF_AGGRESSIVE_MODE_OFFSET, DEFAULT_AGGRESSIVE_MODE_OFFSET))
        if current_temp < (target_temp - agg_range):
            max_temp = float(room.get(CONF_MAX_TEMP, DEFAULT_MAX_TEMP))
            boosted = min(target_temp + agg_offset, max_temp)
            room_name = room.get(CONF_ROOM_NAME, room.get(CONF_ROOM_ID, "?"))
            _LOGGER.debug(
                "IHC: Aggressive mode active for %s – overshooting to %.1f°C (target %.1f°C, current %.1f°C)",
                room_name, boosted, target_temp, current_temp,
            )
            return boosted
        return target_temp

    def _is_heating_period_active(self) -> bool:
        """Return True if heating is enabled via external entity (Heizperiode)."""
        cfg = self.get_config()
        entity_id = cfg.get(CONF_HEATING_PERIOD_ENTITY, "")
        if not entity_id:
            return True  # no entity configured → always enabled
        state = self.hass.states.get(entity_id)
        if state is None:
            return True  # entity unavailable → assume enabled
        return state.state.lower() not in ("off", "false", "0", "no")

    def _setup_ha_schedule_listeners(self) -> None:
        """Subscribe to state changes of all HA schedule entities and condition entities.

        When a schedule.* entity or a condition_entity (input_boolean etc.) changes state,
        trigger an immediate coordinator refresh so the heating reacts without waiting up
        to 60 seconds for the next regular poll cycle.

        Example: Plan 1 (no condition) ends at 18:00. User switches boolean ON at 18:30.
        Plan 2 (condition: boolean=on, active until 20:00) should immediately start heating.
        """
        entity_ids: set[str] = set()
        for room in self.get_rooms():
            for ha_sched in room.get(CONF_HA_SCHEDULES, []):
                sched_entity = ha_sched.get("entity", "")
                if sched_entity:
                    entity_ids.add(sched_entity)
                cond_entity = ha_sched.get("condition_entity", "")
                if cond_entity:
                    entity_ids.add(cond_entity)

        # No-op if entity set hasn't changed
        if entity_ids == self._ha_sched_listener_entities:
            return

        # Cancel old subscription
        if self._ha_sched_listener_unsub is not None:
            self._ha_sched_listener_unsub()
            self._ha_sched_listener_unsub = None

        self._ha_sched_listener_entities = entity_ids

        if not entity_ids:
            return

        @callback
        def _on_ha_sched_change(event: Event) -> None:
            """Trigger immediate coordinator refresh on schedule/condition state change."""
            new_state = event.data.get("new_state")
            old_state = event.data.get("old_state")
            new_s = new_state.state if new_state else None
            old_s = old_state.state if old_state else None
            if new_s == old_s:
                return  # attribute-only update, ignore
            entity_id = event.data.get("entity_id")
            _LOGGER.debug(
                "IHC: HA schedule/condition entity %s changed %s→%s, triggering refresh",
                entity_id, old_s, new_s,
            )
            self.hass.async_create_task(self.async_request_refresh())

        self._ha_sched_listener_unsub = async_track_state_change_event(
            self.hass, list(entity_ids), _on_ha_sched_change
        )
        _LOGGER.debug("IHC: Registered HA schedule listeners for %d entities", len(entity_ids))

    # ------------------------------------------------------------------
    # Roadmap 1.2 – Vacation assistant
    # ------------------------------------------------------------------

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
        self._schedule_save()
        self.hass.async_create_task(self.async_request_refresh())

    def deactivate_guest_mode(self) -> None:
        """Deactivate guest mode and return to AUTO."""
        self._system_mode = SYSTEM_MODE_AUTO
        self._guest_mode_active = False
        self._guest_mode_until = None
        _LOGGER.info("IHC: Guest mode deactivated")
        self._schedule_save()
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
            self._schedule_save()

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

    def _update_target_history(self, room_id: str, target_temp: Optional[float]) -> None:
        """Append hourly target-temperature snapshot (same cadence as _update_temp_history)."""
        if target_temp is None:
            return
        history = self._target_history.setdefault(
            room_id, deque(maxlen=CONF_TEMP_HISTORY_SIZE)
        )
        now = datetime.now()
        if history:
            last_entry = list(history)[-1]
            try:
                last_dt = datetime.fromisoformat(last_entry["t"])
                if (now - last_dt).total_seconds() < 3300:  # 55 min
                    return
            except (ValueError, KeyError):
                pass
        ts = now.isoformat(timespec="minutes")
        history.append({"t": ts, "v": round(target_temp, 1)})

    def get_target_history(self, room_id: str) -> list:
        return list(self._target_history.get(room_id, []))

    # NOTE: _update_warmup_tracking, _detect_sensor_anomaly, _is_schedule_group_active,
    # get_next_schedule_period, get_avg_warmup_minutes, _get_solar_boost,
    # _get_energy_price_eco_offset, _get_weather_cold_boost, _get_current_energy_price,
    # _get_solar_power, _get_weather_forecast, _check_mold_risk, _get_mold_temp_boost,
    # _get_outdoor_humidity, _get_room_co2, _calculate_ventilation_advice
    # are now in the mixin classes (RoomLogicMixin, ClimateAdjustmentsMixin, ComfortManagerMixin)

    # NOTE: _apply_room_calibration and _check_room_presence are in ComfortManagerMixin
    # and PresenceManagerMixin respectively.

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

    # NOTE: _reset_runtime_if_new_day, _update_runtime_tracking, get_heating_runtime_today_minutes,
    # get_heating_runtime_yesterday_minutes, get_room_runtime_today_minutes, reset_runtime_stats,
    # _calculate_room_energy_today, _get_smart_meter_energy_today, calculate_efficiency_score
    # are now in EnergyManagerMixin.

    def reset_curve_adaptation(self) -> None:
        """Reset only the adaptive heating curve offset back to 0.0 °C."""
        self._curve_adaptation_delta = 0.0
        self._curve_last_adapted = None
        _LOGGER.info("IHC: Adaptive curve offset reset to 0 by user.")

    # NOTE: _calculate_room_energy_today, _get_smart_meter_energy_today, _get_price_forecast_offset,
    # _get_eta_preheat_minutes, _adapt_heating_curve, _async_check_vacation_calendar,
    # calculate_efficiency_score are now in EnergyManagerMixin, ClimateAdjustmentsMixin,
    # and VacationManagerMixin respectively.

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
            # Outdoor sensor unavailable – reuse last known value (same 30-min window)
            cached = self._last_known_sensor_temps.get(f"__outdoor__{sensor}")
            if cached is not None:
                cached_value, cached_at = cached
                if (dt_util.utcnow() - cached_at).total_seconds() < self._SENSOR_FALLBACK_SECONDS:
                    return cached_value
            return None
        try:
            raw = float(state.state)
            # Cache the fresh reading under a namespaced key
            self._last_known_sensor_temps[f"__outdoor__{sensor}"] = (raw, dt_util.utcnow())
        except ValueError:
            return None

        smoothing = int(cfg.get(CONF_OUTDOOR_TEMP_SMOOTHING_MINUTES, DEFAULT_OUTDOOR_TEMP_SMOOTHING_MINUTES))
        if smoothing <= 1:
            return raw  # smoothing disabled or set to 0/1 → use raw reading

        # Feed into rolling buffer and return the moving average.
        # The buffer holds at most 60 entries (one per coordinator cycle = ~1 per minute).
        # We only use the last `smoothing` readings so the window length is configurable
        # without changing the deque maxlen.
        self._outdoor_temp_buffer.append(raw)
        n = min(smoothing, len(self._outdoor_temp_buffer))
        readings = list(self._outdoor_temp_buffer)[-n:]
        return round(sum(readings) / len(readings), 1)

    # Max age for last-known sensor temperature fallback (30 minutes)
    _SENSOR_FALLBACK_SECONDS: int = 1800

    def _get_sensor_temp(self, sensor_entity: str) -> Optional[float]:
        if not sensor_entity:
            return None
        state = self.hass.states.get(sensor_entity)
        if state is not None and state.state not in (STATE_UNAVAILABLE, STATE_UNKNOWN):
            try:
                value = float(state.state)
                # Update last-known cache with fresh reading
                self._last_known_sensor_temps[sensor_entity] = (value, dt_util.utcnow())
                return value
            except ValueError:
                return None
        # Sensor unavailable/unknown – use last-known value if fresh enough
        cached = self._last_known_sensor_temps.get(sensor_entity)
        if cached is not None:
            cached_value, cached_at = cached
            age = (dt_util.utcnow() - cached_at).total_seconds()
            if age < self._SENSOR_FALLBACK_SECONDS:
                _LOGGER.debug(
                    "IHC: Sensor %s unavailable – using last known value %.1f°C (age %.0fs)",
                    sensor_entity, cached_value, age,
                )
                return cached_value
        return None

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

    # ------------------------------------------------------------------
    # Main update cycle
    # ------------------------------------------------------------------

    async def _async_update_data(self) -> dict:
        """
        Main update cycle - called every UPDATE_INTERVAL seconds.

        Returns the full data dict that entities read from.
        """
        # Startup grace period: pre-populate _last_sent_temps from TRV states so the
        # manual-override detector has a valid baseline on the very first run.
        # This prevents false "manuell bedient" notifications right after HA restart.
        if self._startup_cycles_remaining > 0:
            self._startup_cycles_remaining -= 1
            self._startup_time = dt_util.utcnow()  # record when first cycle ran
            self._prefill_window_states()
            self._prefill_last_sent_temps()
            self._setup_window_listeners()
            self._setup_ha_schedule_listeners()
            await self._async_startup_presence_sync()

        # Check whether we are still inside the startup grace window.
        # During grace: TRVs stay at frost-protection temp, heating switch stays off.
        # This prevents blasting heat while window/temp sensors haven't reported yet.
        cfg = self.get_config()
        grace_seconds = int(cfg.get(CONF_STARTUP_GRACE_SECONDS, DEFAULT_STARTUP_GRACE_SECONDS))
        startup_grace_active = (
            self._startup_time is not None
            and grace_seconds > 0
            and (dt_util.utcnow() - self._startup_time).total_seconds() < grace_seconds
        )

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

        # v1.3 – Adaptive heating curve (once per day, skip in TRV mode – curve unused there)
        if self.get_config().get(CONF_CONTROLLER_MODE, DEFAULT_CONTROLLER_MODE) != CONTROLLER_MODE_TRV:
            self._adapt_heating_curve()

        # Persist temperature history once per hour (survives HA restarts)
        now = datetime.now()
        if self._history_last_saved is None or (now - self._history_last_saved).total_seconds() >= 3600:
            self._history_last_saved = now
            self._schedule_save()

        outdoor_temp = self._get_outdoor_temp()
        curve_target = (
            self._heating_curve.get_target_temp(outdoor_temp)
            if outdoor_temp is not None
            else None
        )
        summer_mode = self._is_summer_mode_active()

        # Compute forecast cold night status for data dict / sensor
        forecast_coldnight_active = False
        if cfg.get(CONF_FORECAST_COLDNIGHT_ENABLED, DEFAULT_FORECAST_COLDNIGHT_ENABLED):
            _fc = self._get_weather_forecast()
            if _fc and _fc.get("forecast_today_min") is not None:
                _cn_temp = float(cfg.get(CONF_FORECAST_COLDNIGHT_TEMP, DEFAULT_FORECAST_COLDNIGHT_TEMP))
                forecast_coldnight_active = _fc["forecast_today_min"] <= _cn_temp

        room_data: Dict[str, dict] = {}

        solar_boost = self._get_solar_boost()
        # Use enhanced price-forecast offset (Tibber / Nordpool hourly aware)
        price_eco_offset = self._get_price_forecast_offset()
        cold_boost = self._get_weather_cold_boost()
        # v1.4 – ETA pre-heat: minutes until someone arrives home
        eta_minutes = self._get_eta_preheat_minutes()
        self._current_eta_minutes = eta_minutes
        # Controller mode – needed inside the room loop for TRV-specific behaviour
        _loop_ctrl_mode = self.get_config().get(CONF_CONTROLLER_MODE, DEFAULT_CONTROLLER_MODE)
        _loop_trv_mode = _loop_ctrl_mode == CONTROLLER_MODE_TRV

        for room in self.get_rooms():
            room_id = room.get(CONF_ROOM_ID, "")
            if not room_id:
                continue

            temp_sensor = room.get(CONF_TEMP_SENSOR, "")
            raw_temp = self._get_sensor_temp(temp_sensor)
            calibrated_temp = self._apply_room_calibration(room, raw_temp)

            # TRV sensor data integration.
            # Returns three values with distinct roles:
            #   current_temp  – Ist-Temperatur for display, window/frost/mold logic
            #                   Always room sensor; TRV only as last-resort fallback.
            #   demand_temp   – Temperature for demand calculation.
            #                   TRV mode: TRV sensor directly (faster, at radiator).
            #                   Switch mode / no TRV: same as current_temp.
            #   trv_raw_temp  – Unmodified TRV average for diagnostics.
            trv_data = self._get_trv_data(room)
            current_temp, demand_temp, trv_raw_temp = self._blend_trv_temp(
                room, calibrated_temp, trv_data, trv_mode=_loop_trv_mode
            )

            window_open = self._is_window_open(room, current_temp)
            room_mode = self.get_room_mode(room_id)
            deadband = float(room.get(CONF_DEADBAND, DEFAULT_DEADBAND))

            # ── Manual mode auto-reset on schedule transition ─────────────────
            if room_mode == ROOM_MODE_MANUAL:
                manual_since = self._room_manual_since.get(room_id)
                if manual_since is not None:
                    reset_to_auto = False
                    # 1. HA schedule: reset if any bound schedule entity changed state after manual was set
                    for ha_sched in room.get(CONF_HA_SCHEDULES, []):
                        eid = ha_sched.get("entity", "")
                        st = self.hass.states.get(eid)
                        if st is not None and st.last_changed > manual_since:
                            reset_to_auto = True
                            break
                    # 2. IHC schedule: reset if the active period has changed since manual was set
                    if not reset_to_auto:
                        mgr = self._schedule_managers.get(room_id)
                        if mgr:
                            active = mgr.get_active_period()
                            current_key = f"{active.get('start')}|{active.get('end')}" if active else "none"
                            stored_key = self._room_manual_period_key.get(room_id)
                            if stored_key is None:
                                # First cycle after entering manual – snapshot current period
                                self._room_manual_period_key[room_id] = current_key
                            elif current_key != stored_key:
                                reset_to_auto = True
                    if reset_to_auto:
                        _LOGGER.info("IHC: Room %s auto-reset from MANUAL to AUTO (schedule transitioned)", room_id)
                        self.set_room_mode(room_id, ROOM_MODE_AUTO)
                        room_mode = ROOM_MODE_AUTO
            # ─────────────────────────────────────────────────────────────────
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

            # target_history logged after target_temp is known (v1.6.2)
            self._update_target_history(room_id, target_temp)

            # Emergency frost protection when system is OFF (and not already frost-protecting):
            # If outdoor temp is below 0°C AND room temp is very cold (<10°C) AND window is closed,
            # override to frost protection to prevent pipe freezing.
            if (
                meta.get("source") == "system_off"
                and outdoor_temp is not None and outdoor_temp < 0.0
                and current_temp is not None and current_temp < 10.0
                and not window_open
            ):
                target_temp = self._get_frost_protection_temp()
                meta["source"] = "frost_protection"
                meta["emergency_frost"] = True
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

            # Window restore mode: snapshot/restore target_temp around window open events
            prev_win = self._prev_window_open.get(room_id, False)
            if window_open and not prev_win:
                # Window just opened → snapshot pre-window target so we can restore it later
                self._pre_window_temps[room_id] = target_temp
            elif not window_open and prev_win:
                # Window just closed → restore previous target if mode == "previous"
                restore_mode = room.get(CONF_WINDOW_RESTORE_MODE, DEFAULT_WINDOW_RESTORE_MODE)
                if restore_mode == "previous" and room_id in self._pre_window_temps:
                    target_temp = self._pre_window_temps.pop(room_id)
                    meta["source"] = meta.get("source", "schedule") + "+window_restore"
                else:
                    self._pre_window_temps.pop(room_id, None)
            self._prev_window_open[room_id] = window_open

            # Manual TRV override detection: if TRV was adjusted by hand, switch room to manual
            if room_mode not in (ROOM_MODE_OFF, ROOM_MODE_MANUAL) and not window_open:
                self._detect_manual_trv_override(room, room_id, room_mode)

            # Update controller state for this room.
            # demand_temp is used here: in TRV mode it is the TRV sensor temperature
            # (faster, physically at the radiator). current_temp (room sensor) is kept
            # for display and comfort-related logic throughout the rest of the loop.
            controller_state = self._controller.update_room(
                room_id=room_id,
                current_temp=demand_temp,
                target_temp=target_temp,
                deadband=deadband,
                weight=weight,
                window_open=window_open,
                room_mode=room_mode,
                manual_temp=self.get_room_manual_temp(room_id),
            )

            # Warmup tracking: update predictive pre-heat data (Roadmap 1.1)
            demand = controller_state["demand"]

            # Correct demand using TRV valve position (optional, graceful fallback).
            # In TRV mode: auto-applied when valve data is available (trv_avg_valve != None).
            #   If TRV does not report valve position → returns demand unchanged (no effect).
            # In switch mode: only applied when CONF_TRV_VALVE_DEMAND explicitly enabled.
            if _loop_trv_mode or room.get(CONF_TRV_VALVE_DEMAND, DEFAULT_TRV_VALVE_DEMAND):
                demand = self._apply_trv_valve_demand(demand, trv_data, trv_mode=_loop_trv_mode)

            # Safety gate: if room sensor is within deadband (current >= target - deadband),
            # the room is comfortable enough → force demand to 0 regardless of TRV valve
            # position. This matches the new demand formula which returns 0 within the
            # deadband zone, preventing TRV valve-position blending from inflating demand.
            if current_temp is not None and current_temp >= (target_temp - deadband):
                demand = 0.0
            # Sync the post-gate demand back to the controller so that get_total_demand()
            # and get_rooms_demanding() use the correct (gated) value, not the stale
            # pre-gate TRV-blended value. Without this, total demand would appear inflated
            # (e.g. "41.7% total demand, 3 rooms demanding" despite all rooms showing 0%).
            self._controller.override_demand(room_id, demand)

            self._update_warmup_tracking(
                room_id,
                was_cold=demand > 0,
                is_now_warm=demand == 0 and current_temp is not None,
                outdoor_temp=outdoor_temp,
            )
            self._update_cooling_tracking(
                room_id,
                demand=demand,
                current_temp=current_temp,
                outdoor_temp=outdoor_temp,
                window_open=window_open,
            )

            # Stuck-valve detection: are any TRV valves stuck (calcified / jammed)?
            stuck_valves = self._detect_stuck_valves(room, room_id, demand)

            # Collect mold data – use TRV humidity as fallback if no room humidity sensor
            mold_data = self._check_mold_risk(room, current_temp, trv_humidity=trv_data.get("trv_humidity"))

            # Felt temperature (apparent temperature based on humidity)
            felt_temperature = None
            if mold_data and mold_data.get("humidity") is not None and current_temp is not None:
                felt_temperature = self._calculate_felt_temperature(current_temp, mold_data["humidity"])

            # In TRV mode: quantise displayed target to 0.5 °C steps to stay consistent
            # with the actual setpoint sent to TRVs (avoids "21.1°C SOLL, but TRV gets 21.0°C")
            display_target = target_temp
            if _loop_trv_mode:
                display_target = round(target_temp / TRV_SETPOINT_STEP) * TRV_SETPOINT_STEP

            room_data[room_id] = {
                "ventilation": None,  # filled below after outdoor_humidity is known
                "name": room.get(CONF_ROOM_NAME, room_id),
                "current_temp": current_temp,
                "target_temp": display_target,
                "demand": demand,
                "window_open": window_open,
                "room_mode": room_mode,
                "manual_temp": self.get_room_manual_temp(room_id),
                "boost_remaining": self.get_boost_remaining_minutes(room_id),
                "temp_history":   self.get_temp_history(room_id),    # Roadmap 1.1
                "target_history": self.get_target_history(room_id), # v1.6.2 – target temp trend
                "avg_warmup_minutes": self.get_avg_warmup_minutes(room_id),
                # v1.7 – Optimum Start: learned warmup + thermal mass
                "learned_preheat_minutes": (
                    self.get_learned_preheat_minutes(room_id, outdoor_temp)
                    if cfg.get(CONF_OPTIMUM_START_ENABLED, DEFAULT_OPTIMUM_START_ENABLED) and outdoor_temp is not None
                    else None
                ),
                "avg_cooling_rate": self.get_avg_cooling_rate(room_id),
                "warmup_curve": self.get_warmup_curve_data(room_id),
                "next_period": self.get_next_schedule_period(room_id),  # Roadmap 1.1
                "anomaly": self._detect_sensor_anomaly(room_id),    # Roadmap 1.1
                "room_presence_active": room_presence_active,       # Roadmap 1.2
                "pir_presence": self._check_room_pir_presence(room),  # PIR sensor presence state
                "mold": mold_data,                                  # Roadmap 2.0
                "felt_temperature": felt_temperature,              # Gefühlte Temperatur
                # TRV sensor data (optional – all None when not available)
                "trv_raw_temp": trv_raw_temp,
                "trv_humidity": trv_data.get("trv_humidity"),
                "trv_avg_valve": trv_data.get("trv_avg_valve"),
                "trv_any_heating": trv_data.get("trv_any_heating", False),
                "trv_min_battery": trv_data.get("trv_min_battery"),
                "trv_low_battery": trv_data.get("trv_low_battery", False),
                "trv_stuck_valves": stuck_valves,
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
        # Sommerautomatik / Heizperiode: block heating if outdoor temp exceeds threshold or period inactive
        heating_period_active = self._is_heating_period_active()
        should_heat = False if (summer_mode or not heating_period_active) else self._controller.should_heat(self._system_mode)
        should_cool = self._controller.should_cool(self._system_mode) if enable_cooling else False

        # Startup grace: suppress all heating while sensors haven't reported yet
        if startup_grace_active:
            should_heat = False
            should_cool = False
        total_demand = self._controller.get_total_demand()
        rooms_demanding = self._controller.get_rooms_demanding()

        # Track energy / runtime
        self._update_runtime_tracking(should_heat, room_data)

        # Add per-room runtime to room_data
        for room_id in room_data:
            room_data[room_id]["runtime_today_minutes"] = self.get_room_runtime_today_minutes(room_id)

        # v1.6 – Anforderungs-Heatmap: update EMA for current weekday + hour
        _now = dt_util.now()
        _weekday = _now.weekday()   # 0 = Monday … 6 = Sunday
        _hour = _now.hour
        for room_id, rdata in room_data.items():
            if room_id not in self._demand_heatmap:
                self._demand_heatmap[room_id] = [[0.0] * 24 for _ in range(7)]
            demand_now = float(rdata.get("demand", 0) or 0)
            old = self._demand_heatmap[room_id][_weekday][_hour]
            self._demand_heatmap[room_id][_weekday][_hour] = round(0.9 * old + 0.1 * demand_now, 1)
            rdata["demand_heatmap"] = [list(day) for day in self._demand_heatmap[room_id]]

        # Determine if system OFF should turn valves off completely or frost-protect
        off_use_frost = bool(cfg.get(CONF_OFF_USE_FROST_PROTECTION, DEFAULT_OFF_USE_FROST_PROTECTION))
        system_is_off = (self._system_mode == SYSTEM_MODE_OFF)

        # Apply TRV setpoints and/or control heating switch
        if controller_mode == CONTROLLER_MODE_TRV:
            # TRV mode: each TRV self-regulates — always send the desired target temp.
            # The TRV opens/closes its valve based on its own thermostat (current vs target).
            # We do NOT suppress setpoints based on should_heat because:
            #   - There is no central boiler in TRV mode
            #   - TRVs decide themselves whether to heat
            # Exception: room OFF, window open, system OFF, or summer mode → close TRV.
            if startup_grace_active:
                # Startup grace: hold all TRVs at frost-protection temp until sensors report.
                # Windows might be open — don't blast heat into unknown room states.
                _frost = self._get_frost_protection_temp()
                for _room in self.get_rooms():
                    self._set_valve_entities(_room, _frost)
            for room in self.get_rooms():
                room_id = room.get(CONF_ROOM_ID, "")
                if not room_id or room_id not in room_data:
                    continue
                if startup_grace_active:
                    continue  # already handled above
                rdata = room_data[room_id]
                room_mode = rdata.get("room_mode", ROOM_MODE_AUTO)
                window_open = rdata.get("window_open", False)
                window_open_temp = float(room.get(CONF_WINDOW_OPEN_TEMP, DEFAULT_WINDOW_OPEN_TEMP))
                frost_temp = self._get_frost_protection_temp()
                if window_open and window_open_temp > 0:
                    # Window open but configured min-temp: hold at that temp (e.g. 15°C) instead of frost
                    actual = max(window_open_temp, frost_temp)
                    rdata["target_temp"] = actual
                    self._set_valve_entities(room, actual)
                elif window_open or room_mode == ROOM_MODE_OFF or (system_is_off and not off_use_frost):
                    # Turn TRV off (or frost-protect if off mode not supported by the device)
                    if window_open:
                        rdata["target_temp"] = float(room.get(CONF_MIN_TEMP, DEFAULT_MIN_TEMP))
                    self._turn_off_valve_entities(room)
                elif summer_mode or not self._is_heating_period_active():
                    # Sommerautomatik or heating period disabled: turn TRVs off completely.
                    # Setting frost temp keeps them in HEAT mode which misleads users.
                    self._turn_off_valve_entities(room)
                elif self.get_boost_remaining_minutes(room_id) > 0:
                    # Boost active: try native HA boost preset first.
                    # Fallback (TRV doesn't support boost preset): send max_temp so the
                    # TRV opens the valve fully and heats as fast as possible.
                    if not self._boost_valve_entities(room):
                        max_temp = float(room.get(CONF_MAX_TEMP, DEFAULT_MAX_TEMP))
                        self._set_valve_entities(room, max_temp)
                else:
                    # Always send the desired target – TRV decides whether to heat
                    trv_target = self._apply_aggressive_mode(room, rdata["target_temp"], rdata.get("current_temp"))
                    self._set_valve_entities(room, trv_target)
            # TRV mode: if a heating_switch is configured, use it to fire the central boiler
            # when any room demands heat. This supports setups with TRVs + central boiler:
            # the boiler must run to supply hot water, while TRVs distribute it per-room.
            if cfg.get(CONF_HEATING_SWITCH) and not summer_mode and self._is_heating_period_active():
                trv_heat_needed = any(
                    rd.get("demand", 0) > 0
                    and not rd.get("window_open", False)
                    and rd.get("room_mode") != ROOM_MODE_OFF
                    for rd in room_data.values()
                )
                self._set_heating_switch(trv_heat_needed and not system_is_off)
        else:
            # Switch mode: propagate setpoints to TRVs, control central heating switch
            for room in self.get_rooms():
                room_id = room.get(CONF_ROOM_ID, "")
                if not room_id or room_id not in room_data:
                    continue
                if startup_grace_active:
                    # Hold TRVs at frost-protection temp until sensors have reported
                    self._set_valve_entities(room, self._get_frost_protection_temp())
                    continue
                rdata = room_data[room_id]
                room_mode = rdata.get("room_mode", ROOM_MODE_AUTO)
                window_open = rdata.get("window_open", False)
                window_open_temp = float(room.get(CONF_WINDOW_OPEN_TEMP, DEFAULT_WINDOW_OPEN_TEMP))
                frost_temp_sw = self._get_frost_protection_temp()
                if window_open and window_open_temp > 0:
                    actual_sw = max(window_open_temp, frost_temp_sw)
                    rdata["target_temp"] = actual_sw
                    self._set_valve_entities(room, actual_sw)
                elif window_open or room_mode == ROOM_MODE_OFF or (system_is_off and not off_use_frost):
                    # Turn off TRVs when window open, room off, or system off (without frost-protect)
                    if window_open:
                        rdata["target_temp"] = float(room.get(CONF_MIN_TEMP, DEFAULT_MIN_TEMP))
                    self._turn_off_valve_entities(room)
                else:
                    sw_target = self._apply_aggressive_mode(room, rdata["target_temp"], rdata.get("current_temp"))
                    self._set_valve_entities(room, sw_target)
            self._set_heating_switch(should_heat)

        if enable_cooling:
            self._set_cooling_switch(should_cool)

        # Kalkschutz: periodisch Ventile bewegen um Verkalkungs-Festfressen zu verhindern
        self._run_limescale_protection(room_data)

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
            weather_condition = (weather_forecast.get("condition") if weather_forecast else None)
            energy_price_high = price_eco_offset < 0  # negative offset = expensive hour (reduces setpoint to save energy)
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
            "forecast_coldnight_active": forecast_coldnight_active,
            "forecast_advance_hours": int(cfg.get(CONF_FORECAST_ADVANCE_HOURS, DEFAULT_FORECAST_ADVANCE_HOURS)),
            "startup_grace_active": startup_grace_active,
            "heating_period_active": heating_period_active,
            "night_setback_active": night_setback_active,
            "presence_away_active": self._presence_away_active,
            "presence_away_pending": self._presence_away_pending_since is not None,
            "presence_away_pending_minutes_remaining": (
                max(0.0, int(cfg.get(CONF_PRESENCE_AWAY_DELAY_MINUTES, DEFAULT_PRESENCE_AWAY_DELAY_MINUTES))
                    - (dt_util.utcnow() - self._presence_away_pending_since).total_seconds() / 60)
                if self._presence_away_pending_since is not None else None
            ),
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
            "groups": self.get_groups(),
            "debug": self._controller.get_debug_info(),
        }

    # ------------------------------------------------------------------
    # HA Schedule entity block reader
    # ------------------------------------------------------------------

    def _get_ha_schedule_blocks(self, entity_id: str) -> list[dict]:
        """Read weekly time blocks from a HA schedule.* helper entity config.

        HA stores schedule blocks in config_entry.options (or .data) under full day keys:
          {"monday": [{"from": "07:00:00", "to": "09:00:00"}], ...}
        Some HA versions use short keys ("mon", "tue") or "start"/"end" instead of "from"/"to".
        We try all variants.

        Returns IHC-compatible block list:
          [{"days": ["mon", "tue"], "periods": [{"start": "07:00", "end": "09:00"}]}]
        """
        # Full day names (HA default since 2023.3)
        DAY_MAP_FULL = {
            "monday": "mon", "tuesday": "tue", "wednesday": "wed",
            "thursday": "thu", "friday": "fri", "saturday": "sat", "sunday": "sun",
        }
        # Short day names (used in some HA versions / custom components)
        DAY_MAP_SHORT = {
            "mon": "mon", "tue": "tue", "wed": "wed",
            "thu": "thu", "fri": "fri", "sat": "sat", "sun": "sun",
        }
        try:
            registry = er.async_get(self.hass)
            entry = registry.async_get(entity_id)
            if not entry:
                _LOGGER.warning(
                    "IHC: HA-Zeitplan '%s' nicht in Entity-Registry – existiert die Entität?", entity_id
                )
                return []
            if not entry.config_entry_id:
                # Fallback 1: HA schedule helpers created via UI use their config_entry.entry_id
                # as the entity's unique_id – try a direct lookup with the unique_id.
                config_entry = None
                if entry.unique_id:
                    config_entry = self.hass.config_entries.async_get_entry(entry.unique_id)
                    if config_entry:
                        _LOGGER.debug(
                            "IHC: Fallback 1 – '%s' config entry via unique_id gefunden: %s",
                            entity_id, config_entry.entry_id,
                        )
                # Fallback 2: search all schedule config entries by associated entities
                if config_entry is None:
                    for ce in self.hass.config_entries.async_entries("schedule"):
                        associated = er.async_entries_for_config_entry(registry, ce.entry_id)
                        if any(ae.entity_id == entity_id for ae in associated):
                            config_entry = ce
                            _LOGGER.debug(
                                "IHC: Fallback 2 – '%s' config entry via Schedule-Suche: %s",
                                entity_id, ce.entry_id,
                            )
                            break
                if config_entry is None:
                    # YAML-defined schedule helpers have no config entry.
                    # The schedule state ("on"/"off") still works for heating decisions –
                    # only the frontend calendar display is unavailable.
                    # Log only once per entity_id to avoid spam every 60s.
                    if entity_id not in self._yaml_schedule_warned:
                        self._yaml_schedule_warned.add(entity_id)
                        _LOGGER.warning(
                            "IHC: HA-Zeitplan '%s': Config-Entry nicht gefunden. "
                            "Heizsteuerung funktioniert normal über Entity-State. "
                            "Kalenderanzeige nicht verfügbar (nur für UI-erstellte Helfer). "
                            "Falls via HA-UI erstellt: Integration einmal neu laden.", entity_id
                        )
                    return [{"_yaml_defined": True}]
            else:
                config_entry = self.hass.config_entries.async_get_entry(entry.config_entry_id)
                if not config_entry:
                    _LOGGER.warning(
                        "IHC: Config Entry '%s' für '%s' nicht gefunden.", entry.config_entry_id, entity_id
                    )
                    return []

            # Merge data + options (HA may store schedule blocks in either location)
            cfg: dict = {}
            cfg.update(config_entry.data or {})
            cfg.update(config_entry.options or {})

            # Pick the day-map whose keys appear in cfg
            has_full  = any(k in cfg for k in DAY_MAP_FULL)
            has_short = any(k in cfg for k in DAY_MAP_SHORT)
            day_map = DAY_MAP_FULL if (has_full or not has_short) else DAY_MAP_SHORT

            # Collect periods, merging identical start/end times across days
            period_map: dict[tuple[str, str], list[str]] = {}
            for ha_day, ihc_day in day_map.items():
                for period in cfg.get(ha_day, []):
                    # Support both "from"/"to" (HA default) and "start"/"end" variants
                    raw_start = period.get("from") or period.get("start") or ""
                    raw_end   = period.get("to")   or period.get("end")   or ""
                    start = str(raw_start)[:5]  # "07:00:00" → "07:00"
                    end   = str(raw_end)[:5]
                    if not start or not end:
                        continue
                    period_map.setdefault((start, end), []).append(ihc_day)

            blocks = [
                {"days": days, "periods": [{"start": s, "end": e}]}
                for (s, e), days in period_map.items()
            ]

            if not blocks:
                found_keys = [k for k in cfg if k in {**DAY_MAP_FULL, **DAY_MAP_SHORT}]
                _LOGGER.warning(
                    "IHC: Keine Blöcke für '%s' gefunden. "
                    "Gefundene Tages-Keys: %s. Bitte im HA-Helfer Zeitblöcke definieren.",
                    entity_id, found_keys or "(keine)"
                )
            return blocks
        except Exception:  # noqa: BLE001
            _LOGGER.warning("IHC: Fehler beim Lesen der HA-Zeitplan-Blöcke für '%s':", entity_id, exc_info=True)
            return []

    def get_ha_schedule_blocks_for_room(self, room: dict) -> dict[str, list[dict]]:
        """Return {entity_id: [blocks]} for all ha_schedules configured for a room."""
        result: dict[str, list[dict]] = {}
        for ha_sched in room.get(CONF_HA_SCHEDULES, []):
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
