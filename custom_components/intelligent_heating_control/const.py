"""Constants for Intelligent Heating Control."""
from typing import Final

DOMAIN: Final = "intelligent_heating_control"
PLATFORMS: Final = ["climate", "sensor", "switch", "number", "select"]

# Config keys - global
CONF_OUTDOOR_TEMP_SENSOR: Final = "outdoor_temp_sensor"
CONF_HEATING_SWITCH: Final = "heating_switch"
CONF_COOLING_SWITCH: Final = "cooling_switch"
CONF_HEATING_CURVE: Final = "heating_curve"
CONF_DEMAND_THRESHOLD: Final = "demand_threshold"
CONF_DEMAND_HYSTERESIS: Final = "demand_hysteresis"
CONF_MIN_ON_TIME: Final = "min_on_time"
CONF_MIN_OFF_TIME: Final = "min_off_time"
CONF_MIN_ROOMS_DEMAND: Final = "min_rooms_demand"
CONF_SYSTEM_MODE: Final = "system_mode"
CONF_AWAY_TEMP: Final = "away_temp"
CONF_VACATION_TEMP: Final = "vacation_temp"
CONF_PRESENCE_ENTITY: Final = "presence_entity"
CONF_ENABLE_COOLING: Final = "enable_cooling"
CONF_SUMMER_MODE_ENABLED: Final = "summer_mode_enabled"
CONF_SUMMER_THRESHOLD: Final = "summer_threshold"
CONF_SHOW_PANEL: Final = "show_panel"

# Presence detection
CONF_PRESENCE_ENTITIES: Final = "presence_entities"  # list of person / device_tracker entities

# Frost protection
CONF_FROST_PROTECTION_TEMP: Final = "frost_protection_temp"  # min temp even in OFF/AWAY mode

# Night setback
CONF_NIGHT_SETBACK_ENABLED: Final = "night_setback_enabled"
CONF_NIGHT_SETBACK_OFFSET: Final = "night_setback_offset"   # °C to subtract at night
CONF_SUN_ENTITY: Final = "sun_entity"                        # defaults to "sun.sun"

# Pre-heat window (minutes before schedule start to begin heating)
CONF_PREHEAT_MINUTES: Final = "preheat_minutes"

# Config keys - rooms
CONF_ROOMS: Final = "rooms"
CONF_ROOM_ID: Final = "id"
CONF_ROOM_NAME: Final = "name"
CONF_TEMP_SENSOR: Final = "temp_sensor"
CONF_VALVE_ENTITY: Final = "valve_entity"
CONF_ROOM_OFFSET: Final = "room_offset"
CONF_DEADBAND: Final = "deadband"
CONF_WEIGHT: Final = "weight"
CONF_MIN_TEMP: Final = "min_temp"
CONF_MAX_TEMP: Final = "max_temp"
CONF_COMFORT_TEMP: Final = "comfort_temp"
CONF_AWAY_TEMP_ROOM: Final = "away_temp_room"
CONF_WINDOW_SENSOR: Final = "window_sensor"
CONF_WINDOW_SENSORS: Final = "window_sensors"   # list – mehrere Fenstersensoren
CONF_WINDOW_REACTION_TIME: Final = "window_reaction_time"   # seconds open before reacting (per room)
CONF_WINDOW_CLOSE_DELAY: Final = "window_close_delay"       # seconds after close before resuming (per room)
CONF_VALVE_ENTITIES: Final = "valve_entities"   # list – mehrere Thermostate/TRVs
CONF_ABSOLUTE_MIN_TEMP: Final = "absolute_min_temp"  # per-room hard floor – setpoint never goes below this
CONF_ROOM_QM: Final = "room_qm"                      # room area in m² (for preheat/weight/energy)
CONF_ROOM_PREHEAT_MINUTES: Final = "room_preheat_minutes"  # per-room preheat override (-1 = use global/auto)
CONF_ECO_OFFSET: Final = "eco_offset"              # °C below comfort/curve target
CONF_SLEEP_OFFSET: Final = "sleep_offset"          # °C below comfort/curve target
CONF_AWAY_OFFSET: Final = "away_offset"            # °C below comfort/curve target (per room away)
CONF_ECO_MAX_TEMP: Final = "eco_max_temp"          # hard ceiling for eco temperature
CONF_SLEEP_MAX_TEMP: Final = "sleep_max_temp"      # hard ceiling for sleep temperature
CONF_AWAY_MAX_TEMP: Final = "away_max_temp"        # hard ceiling for per-room away temperature
CONF_HA_SCHEDULE_OFF_MODE: Final = "ha_schedule_off_mode"  # "eco" or "sleep" when no HA schedule active
CONF_RADIATOR_KW: Final = "radiator_kw"          # rated heat output of this room's radiator(s) in kW
CONF_HKV_SENSOR: Final = "hkv_sensor"            # HA sensor entity with live HKV Einheiten reading
CONF_HKV_FACTOR: Final = "hkv_factor"            # kWh per HKV-Einheit (from annual billing statement)
CONF_SCHEDULES: Final = "schedules"
CONF_SCHEDULE_DAYS: Final = "days"
CONF_SCHEDULE_PERIODS: Final = "periods"
CONF_SCHEDULE_START: Final = "start"
CONF_SCHEDULE_END: Final = "end"
CONF_SCHEDULE_TEMP: Final = "temperature"
CONF_SCHEDULE_OFFSET: Final = "offset"
CONF_ENABLED: Final = "enabled"

# Heating curve config keys
CONF_CURVE_POINTS: Final = "points"
CONF_CURVE_OUTDOOR_TEMP: Final = "outdoor_temp"
CONF_CURVE_TARGET_TEMP: Final = "target_temp"

# Defaults
DEFAULT_DEMAND_THRESHOLD: Final = 15.0
DEFAULT_DEMAND_HYSTERESIS: Final = 5.0
DEFAULT_MIN_ON_TIME: Final = 5
DEFAULT_MIN_OFF_TIME: Final = 5
DEFAULT_MIN_ROOMS_DEMAND: Final = 1
DEFAULT_DEADBAND: Final = 0.5
DEFAULT_WEIGHT: Final = 1.0
DEFAULT_COMFORT_TEMP: Final = 21.0
DEFAULT_AWAY_TEMP_ROOM: Final = 16.0
DEFAULT_AWAY_TEMP: Final = 16.0
DEFAULT_VACATION_TEMP: Final = 14.0
DEFAULT_MIN_TEMP: Final = 5.0
DEFAULT_MAX_TEMP: Final = 30.0
DEFAULT_WINDOW_REACTION_TIME: Final = 30   # seconds
DEFAULT_WINDOW_CLOSE_DELAY: Final = 0      # seconds (0 = immediate resume)
DEFAULT_ABSOLUTE_MIN_TEMP: Final = 15.0    # °C – absolute per-room floor
DEFAULT_ROOM_QM: Final = 0.0               # 0 = not configured
DEFAULT_ROOM_PREHEAT_MINUTES: Final = -1   # -1 = use global/auto
DEFAULT_ECO_OFFSET: Final = 3.0       # eco is 3°C below comfort by default
DEFAULT_SLEEP_OFFSET: Final = 4.0     # sleep is 4°C below comfort by default
DEFAULT_AWAY_OFFSET: Final = 6.0      # away is 6°C below comfort by default
DEFAULT_ECO_MAX_TEMP: Final = 21.0    # eco never above 21°C
DEFAULT_SLEEP_MAX_TEMP: Final = 19.0  # sleep never above 19°C
DEFAULT_AWAY_MAX_TEMP: Final = 18.0   # per-room away never above 18°C
DEFAULT_HA_SCHEDULE_OFF_MODE: Final = "eco"  # fallback when no HA schedule active
DEFAULT_RADIATOR_KW: Final = 1.0             # kW – sensible default for a single-radiator room
DEFAULT_HKV_FACTOR: Final = 0.083           # kWh per Einheit (typical district-heating value)
DEFAULT_SUMMER_THRESHOLD: Final = 18.0
DEFAULT_FROST_PROTECTION_TEMP: Final = 7.0
DEFAULT_NIGHT_SETBACK_OFFSET: Final = 2.0
DEFAULT_PREHEAT_MINUTES: Final = 0  # disabled by default

# Default heating curve points (outdoor_temp -> target_temp)
DEFAULT_HEATING_CURVE: Final = [
    {"outdoor_temp": -20.0, "target_temp": 24.0},
    {"outdoor_temp": -10.0, "target_temp": 23.0},
    {"outdoor_temp":   0.0, "target_temp": 22.0},
    {"outdoor_temp":  10.0, "target_temp": 20.5},
    {"outdoor_temp":  15.0, "target_temp": 19.5},
    {"outdoor_temp":  20.0, "target_temp": 18.0},
    {"outdoor_temp":  25.0, "target_temp": 16.0},
]

# System / room operation modes
SYSTEM_MODE_AUTO: Final = "auto"
SYSTEM_MODE_HEAT: Final = "heat"
SYSTEM_MODE_COOL: Final = "cool"
SYSTEM_MODE_OFF: Final = "off"
SYSTEM_MODE_AWAY: Final = "away"
SYSTEM_MODE_VACATION: Final = "vacation"
SYSTEM_MODE_GUEST: Final = "guest"
SYSTEM_MODES: Final = [
    SYSTEM_MODE_AUTO,
    SYSTEM_MODE_HEAT,
    SYSTEM_MODE_COOL,
    SYSTEM_MODE_OFF,
    SYSTEM_MODE_AWAY,
    SYSTEM_MODE_VACATION,
    SYSTEM_MODE_GUEST,
]

ROOM_MODE_AUTO: Final = "auto"
ROOM_MODE_COMFORT: Final = "comfort"
ROOM_MODE_ECO: Final = "eco"
ROOM_MODE_SLEEP: Final = "sleep"
ROOM_MODE_AWAY: Final = "away"
ROOM_MODE_OFF: Final = "off"
ROOM_MODE_MANUAL: Final = "manual"
ROOM_MODES: Final = [
    ROOM_MODE_AUTO,
    ROOM_MODE_COMFORT,
    ROOM_MODE_ECO,
    ROOM_MODE_SLEEP,
    ROOM_MODE_AWAY,
    ROOM_MODE_OFF,
    ROOM_MODE_MANUAL,
]

# Update interval in seconds
UPDATE_INTERVAL: Final = 60

# Signal constants
SIGNAL_UPDATE_ENTITY: Final = f"{DOMAIN}_update_{{entry_id}}"

# Service names
SERVICE_ADD_ROOM: Final = "add_room"
SERVICE_REMOVE_ROOM: Final = "remove_room"
SERVICE_UPDATE_ROOM: Final = "update_room"
SERVICE_SET_ROOM_MODE: Final = "set_room_mode"
SERVICE_SET_SYSTEM_MODE: Final = "set_system_mode"
SERVICE_BOOST_ROOM: Final = "boost_room"
SERVICE_RELOAD: Final = "reload"

# Roadmap 1.3 – Energy optimisation
CONF_BOILER_KW: Final = "boiler_kw"                             # kW output of the heating system
CONF_SOLAR_ENTITY: Final = "solar_entity"                       # solar power sensor (W)
CONF_SOLAR_SURPLUS_THRESHOLD: Final = "solar_surplus_threshold" # W above which surplus is detected
CONF_SOLAR_BOOST_TEMP: Final = "solar_boost_temp"               # °C boost added when solar surplus
CONF_ENERGY_PRICE_ENTITY: Final = "energy_price_entity"         # dynamic price sensor (€/kWh)
CONF_ENERGY_PRICE_THRESHOLD: Final = "energy_price_threshold"   # €/kWh above which eco kicks in
CONF_ENERGY_PRICE_ECO_OFFSET: Final = "energy_price_eco_offset" # °C reduction when price is high

# Roadmap 1.4 – Advanced room control
CONF_TEMP_CALIBRATION: Final = "temp_calibration"               # per-room sensor offset (°C)
CONF_ROOM_PRESENCE_ENTITIES: Final = "room_presence_entities"   # per-room presence list
CONF_FLOW_TEMP_ENTITY: Final = "flow_temp_entity"               # boiler flow-temp number entity
CONF_FLOW_TEMP_SENSOR: Final = "flow_temp_sensor"               # sensor.* to read actual flow temp (PID feedback)

# Roadmap 1.1 – Temperature history (7 days × 24 hours of hourly snapshots)
CONF_TEMP_HISTORY_SIZE: Final = 168                             # 7 × 24 hourly readings per room

# Roadmap 1.2 – Vacation assistant (date range for automatic vacation mode)
CONF_VACATION_START: Final = "vacation_start"    # ISO date string "YYYY-MM-DD"
CONF_VACATION_END: Final = "vacation_end"        # ISO date string "YYYY-MM-DD" (inclusive)
CONF_VACATION_CALENDAR: Final = "vacation_calendar"         # calendar.* entity to auto-detect vacation
CONF_VACATION_CALENDAR_KEYWORD: Final = "vacation_calendar_keyword"  # keyword to match in event summary
DEFAULT_VACATION_CALENDAR_KEYWORD: Final = "urlaub"

# v1.3 – Adaptive heating curve
CONF_ADAPTIVE_CURVE_ENABLED: Final = "adaptive_curve_enabled"
CONF_ADAPTIVE_CURVE_MAX_DELTA: Final = "adaptive_curve_max_delta"   # max total °C shift allowed
DEFAULT_ADAPTIVE_CURVE_ENABLED: Final = False
DEFAULT_ADAPTIVE_CURVE_MAX_DELTA: Final = 3.0

# v1.3 – Predictive pre-heating (uses warmup history when available)
CONF_ADAPTIVE_PREHEAT_ENABLED: Final = "adaptive_preheat_enabled"
DEFAULT_ADAPTIVE_PREHEAT_ENABLED: Final = True

# v1.4 – ETA-based pre-heating
CONF_ETA_PREHEAT_ENABLED: Final = "eta_preheat_enabled"
DEFAULT_ETA_PREHEAT_ENABLED: Final = False

# v1.5 – Cooling mode target temperature
CONF_COOLING_TARGET_TEMP: Final = "cooling_target_temp"
DEFAULT_COOLING_TARGET_TEMP: Final = 24.0

# v1.5 – PID flow temperature controller
CONF_PID_KP: Final = "pid_kp"
CONF_PID_KI: Final = "pid_ki"
CONF_PID_KD: Final = "pid_kd"
DEFAULT_PID_KP: Final = 2.0
DEFAULT_PID_KI: Final = 0.1
DEFAULT_PID_KD: Final = 0.5

# v1.5 – Smart meter integration
CONF_SMART_METER_ENTITY: Final = "smart_meter_entity"   # sensor.* with accumulated kWh (TOTAL_INCREASING)

# v1.5 – Tibber / dynamic price forecast attribute
CONF_PRICE_FORECAST_ATTRIBUTE: Final = "price_forecast_attribute"
DEFAULT_PRICE_FORECAST_ATTRIBUTE: Final = "today_prices"

# Defaults for new options
DEFAULT_BOILER_KW: Final = 20.0
DEFAULT_SOLAR_SURPLUS_THRESHOLD: Final = 1000   # W
DEFAULT_SOLAR_BOOST_TEMP: Final = 1.0           # °C
DEFAULT_ENERGY_PRICE_THRESHOLD: Final = 0.30   # €/kWh
DEFAULT_ENERGY_PRICE_ECO_OFFSET: Final = 2.0   # °C

# Presence / away-mode reason
PRESENCE_AUTO_AWAY_REASON: Final = "presence_auto_away"

# Storage key
STORAGE_KEY: Final = f"{DOMAIN}.storage"
STORAGE_VERSION: Final = 1

# Frontend panel
PANEL_URL: Final = "intelligent-heating-control"
PANEL_TITLE: Final = "IHC"
PANEL_ICON: Final = "mdi:radiator"

# Days of week
DAYS_OF_WEEK: Final = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
DAY_NAMES_DE: Final = {
    "mon": "Montag",
    "tue": "Dienstag",
    "wed": "Mittwoch",
    "thu": "Donnerstag",
    "fri": "Freitag",
    "sat": "Samstag",
    "sun": "Sonntag",
}

# Attribute names (for extra state attributes)
ATTR_DEMAND: Final = "demand"
ATTR_TARGET_TEMP: Final = "target_temperature"
ATTR_CURRENT_TEMP: Final = "current_temperature"
ATTR_OUTDOOR_TEMP: Final = "outdoor_temperature"
ATTR_CURVE_TARGET: Final = "curve_target"
ATTR_SCHEDULE_ACTIVE: Final = "schedule_active"
ATTR_SCHEDULE_NAME: Final = "schedule_name"
ATTR_WINDOW_OPEN: Final = "window_open"
ATTR_ROOM_MODE: Final = "room_mode"
ATTR_OFFSET: Final = "offset"
ATTR_MANUAL_TEMP: Final = "manual_temperature"
ATTR_ROOMS: Final = "rooms"
ATTR_TOTAL_DEMAND: Final = "total_demand"
ATTR_HEATING_ACTIVE: Final = "heating_active"
ATTR_ROOMS_DEMANDING: Final = "rooms_demanding"
ATTR_SYSTEM_MODE: Final = "system_mode"

# Roadmap 2.0 – New features

# TRV-Modus: Klimabaustein controller output mode
CONF_CONTROLLER_MODE: Final = "controller_mode"
CONTROLLER_MODE_SWITCH: Final = "switch"   # control a boiler switch (default)
CONTROLLER_MODE_TRV: Final = "trv"         # control TRVs directly (close them when no demand)
DEFAULT_CONTROLLER_MODE: Final = CONTROLLER_MODE_SWITCH

# Boost-Modus (per room)
CONF_BOOST_TEMP: Final = "boost_temp"               # °C target during boost
CONF_BOOST_DEFAULT_DURATION: Final = "boost_default_duration"  # minutes
DEFAULT_BOOST_DEFAULT_DURATION: Final = 60

# Gäste-Modus
CONF_GUEST_DURATION_HOURS: Final = "guest_duration_hours"
DEFAULT_GUEST_DURATION_HOURS: Final = 24

# Rückkehr-Vorheizung: start heating N days before vacation end
CONF_VACATION_RETURN_PREHEAT_DAYS: Final = "vacation_return_preheat_days"
DEFAULT_VACATION_RETURN_PREHEAT_DAYS: Final = 0  # disabled

# Wettervorhersage
CONF_WEATHER_ENTITY: Final = "weather_entity"
CONF_WEATHER_COLD_THRESHOLD: Final = "weather_cold_threshold"  # °C below which cold warning shows
DEFAULT_WEATHER_COLD_THRESHOLD: Final = 0.0
CONF_WEATHER_COLD_BOOST: Final = "weather_cold_boost"          # °C added to target when cold warning
DEFAULT_WEATHER_COLD_BOOST: Final = 0.0                        # 0 = disabled by default

# HA Schedule-Entitäten pro Zimmer
CONF_HA_SCHEDULES: Final = "ha_schedules"
# Each entry is a dict:
#   entity          (str)  – schedule.* entity_id
#   temperature     (float)– target temp when schedule is ON
#   condition_entity(str)  – optional entity to check before using this schedule
#   condition_state (str)  – state the condition_entity must have (default "on")

# Schimmelschutz (mold protection) – per room
CONF_HUMIDITY_SENSOR: Final = "humidity_sensor"
CONF_MOLD_PROTECTION_ENABLED: Final = "mold_protection_enabled"
CONF_MOLD_HUMIDITY_THRESHOLD: Final = "mold_humidity_threshold"  # % above which risk is elevated
DEFAULT_MOLD_HUMIDITY_THRESHOLD: Final = 70.0
DEFAULT_MOLD_PROTECTION_ENABLED: Final = True

# Lüftungsempfehlung (ventilation advice) – global + per room
CONF_OUTDOOR_HUMIDITY_SENSOR: Final = "outdoor_humidity_sensor"
CONF_CO2_SENSOR: Final = "co2_sensor"               # per room – optional
CONF_CO2_THRESHOLD_GOOD: Final = "co2_threshold_good"
CONF_CO2_THRESHOLD_BAD: Final = "co2_threshold_bad"
DEFAULT_CO2_THRESHOLD_GOOD: Final = 800    # ppm – below = good air quality
DEFAULT_CO2_THRESHOLD_BAD: Final = 1200   # ppm – above = ventilation recommended
CONF_VENTILATION_ADVICE_ENABLED: Final = "ventilation_advice_enabled"
DEFAULT_VENTILATION_ADVICE_ENABLED: Final = True

# TRV-Sensordaten (per room – all optional)
# Temperatur-Blending: gewichteter Anteil der TRV-Eigentemperatur
CONF_TRV_TEMP_WEIGHT: Final = "trv_temp_weight"   # 0.0 = deaktiviert
DEFAULT_TRV_TEMP_WEIGHT: Final = 0.0
# Offset der TRV-Temperatur vor dem Blending (TRV sitzt nah am Heizkörper → misst wärmer)
CONF_TRV_TEMP_OFFSET: Final = "trv_temp_offset"   # °C – typisch negativ (z.B. -2.0)
DEFAULT_TRV_TEMP_OFFSET: Final = -2.0
# Ventilstellung für Anforderungskorrektur: TRV-Öffnung beeinflusst Demand
CONF_TRV_VALVE_DEMAND: Final = "trv_valve_demand"  # bool
DEFAULT_TRV_VALVE_DEMAND: Final = False
