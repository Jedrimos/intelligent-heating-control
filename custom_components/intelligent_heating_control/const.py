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
CONF_ECO_TEMP: Final = "eco_temp"
CONF_SLEEP_TEMP: Final = "sleep_temp"
CONF_AWAY_TEMP_ROOM: Final = "away_temp_room"
CONF_WINDOW_SENSOR: Final = "window_sensor"
CONF_WINDOW_SENSORS: Final = "window_sensors"   # list – mehrere Fenstersensoren
CONF_WINDOW_OPEN_TEMP: Final = "window_open_temp"
CONF_WINDOW_REACTION_TIME: Final = "window_reaction_time"
CONF_VALVE_ENTITIES: Final = "valve_entities"   # list – mehrere Thermostate/TRVs
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
DEFAULT_ECO_TEMP: Final = 18.0
DEFAULT_SLEEP_TEMP: Final = 17.0
DEFAULT_AWAY_TEMP_ROOM: Final = 16.0
DEFAULT_AWAY_TEMP: Final = 16.0
DEFAULT_VACATION_TEMP: Final = 14.0
DEFAULT_MIN_TEMP: Final = 5.0
DEFAULT_MAX_TEMP: Final = 30.0
DEFAULT_WINDOW_OPEN_TEMP: Final = 5.0
DEFAULT_WINDOW_REACTION_TIME: Final = 30
DEFAULT_SUMMER_THRESHOLD: Final = 18.0

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
SYSTEM_MODES: Final = [
    SYSTEM_MODE_AUTO,
    SYSTEM_MODE_HEAT,
    SYSTEM_MODE_COOL,
    SYSTEM_MODE_OFF,
    SYSTEM_MODE_AWAY,
    SYSTEM_MODE_VACATION,
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
SERVICE_SET_ROOM_SCHEDULE: Final = "set_room_schedule"
SERVICE_BOOST_ROOM: Final = "boost_room"
SERVICE_RELOAD: Final = "reload"

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
