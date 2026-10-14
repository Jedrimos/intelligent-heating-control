/**
 * 00_constants.js
 * IHC Frontend – Shared Constants
 * Contains: DOMAIN, DAYS, DAY_KEYS, MODE_LABELS, MODE_ICONS, SYSTEM_MODE_LABELS, WEATHER_CONDITIONS
 */

const DOMAIN = "intelligent_heating_control";
const DAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

const MODE_LABELS = {
  auto: "Auto", comfort: "Komfort", eco: "Eco",
  sleep: "Schlafen", away: "Abwesend", off: "Aus", manual: "Manuell",
  vacation: "Urlaub", guest: "Gäste", boost: "Boost"
};
const MODE_ICONS = {
  auto: "⚙️", comfort: "☀️", eco: "🌿", sleep: "🌙",
  away: "🚶", off: "⛔", manual: "✏️",
  vacation: "🏖️", guest: "👥", boost: "⚡"
};
const SYSTEM_MODE_LABELS = {
  auto: "Automatisch", heat: "Heizen",
  off: "Aus", away: "Abwesend", vacation: "Urlaub", guest: "Gäste-Modus"
};
// select.ihc_systemmodus's state/current_option is the translated label above
// (set by select.py's own SYSTEM_MODE_LABELS, kept in sync with this one),
// not the raw mode key. Reverse-lookup needed wherever we read the raw key
// back out of that entity's live state.
const SYSTEM_MODE_LABEL_TO_KEY = Object.fromEntries(
  Object.entries(SYSTEM_MODE_LABELS).map(([k, v]) => [v, k])
);

// HA weather condition → German label + emoji icon
const WEATHER_CONDITIONS = {
  "clear-night":      { label: "Klare Nacht",           icon: "🌙" },
  "cloudy":           { label: "Bewölkt",                icon: "☁️" },
  "exceptional":      { label: "Außergewöhnlich",        icon: "⚠️" },
  "fog":              { label: "Nebel",                  icon: "🌫️" },
  "hail":             { label: "Hagel",                  icon: "🌨️" },
  "lightning":        { label: "Gewitter",               icon: "⛈️" },
  "lightning-rainy":  { label: "Gewitter m. Regen",      icon: "⛈️" },
  "partlycloudy":     { label: "Teils bewölkt",          icon: "⛅" },
  "pouring":          { label: "Starkregen",             icon: "🌧️" },
  "rainy":            { label: "Regen",                  icon: "🌦️" },
  "snowy":            { label: "Schnee",                 icon: "❄️" },
  "snowy-rainy":      { label: "Schneeregen",            icon: "🌨️" },
  "sunny":            { label: "Sonnig",                 icon: "☀️" },
  "windy":            { label: "Windig",                 icon: "🌬️" },
  "windy-variant":    { label: "Stürmisch",              icon: "💨" },
};
