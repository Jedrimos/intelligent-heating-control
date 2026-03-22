# CLAUDE.md – Vollständige Entwicklungsdokumentation: Intelligent Heating Control

> **Wenn du diese Datei liest ohne Chat-Verlauf:** Lies diese Datei komplett durch.
> Sie enthält alles was du brauchst um das Projekt weiterzuentwickeln.

---

## 1. Was ist dieses Projekt?

**Intelligent Heating Control (IHC)** ist eine Home Assistant Custom Integration (HACS-kompatibel),
die eine intelligente, raumbasierte Heizungssteuerung realisiert.

- **Domain:** `intelligent_heating_control`
- **Version:** `1.2.0`
- **Repository:** https://github.com/Jedrimos/intelligent-heatingcontroll
- **Aktiver Entwicklungs-Branch:** `claude/review-homeassistant-repo-PL7tn`
- **Dateipfad:** `/home/user/intelligent-heatingcontrol/`
- **Integration-Pfad:** `custom_components/intelligent_heating_control/`

### Was kann es?
- Pro-Zimmer Heizplanung mit Zeitplänen (eigenes Format + HA schedule entities)
- Mehrere Betriebsmodi: auto, comfort, eco, sleep, away, vacation, guest, boost
- Heizkurve (Außentemperatur → Vorlauftemperatur)
- Fenstererkennung mit Reaktions- und Schließverzögerung
- Schimmelschutz (Humidity-Sensor), CO₂-Überwachung, HKV-Sensor
- Boost-Modus pro Zimmer (temporäre Erhöhung)
- TRV-Modus: Thermostatic Radiator Valves direkt steuern ODER Switch-Modus
- Nachtabsenkung, Sommerautomatik, Frostschutz, Vorheizung
- Vollständiges Web-Frontend (Single-Page-App in `ihc-panel.js`)

---

## 2. Datei-Übersicht

> **Schnellreferenz:** Welche Datei für welche Änderung?

### Backend-Dateien

```
custom_components/intelligent_heating_control/
├── __init__.py              # Integration setup, Service-Registrierung (add_room, update_room etc.)
│                            # → Neue Services? Hier registrieren + handle_*() implementieren
│
├── manifest.json            # HACS-Metadaten (version, domain, requirements)
│                            # → Version bumpen für jedes Release
│
├── const.py                 # ALLE Konstanten: CONF_*, DEFAULT_*, SERVICE_*, MODE_*
│                            # → Neue Konstante? Hier definieren, dann in allen Stellen importieren
│
├── coordinator.py           # Orchestrator: ruft Mixin-Methoden auf, Update-Zyklus, Service-Handler
│                            # → Hier: _async_update_data(), alle Service-Handler, TRV-Sendlogik
│
├── config_flow.py           # HA ConfigFlow (Setup-Wizard + Options-Dialog)
│                            # → Neue Einstellungen? Hier in Schema + save-handler eintragen
│
├── climate.py               # Climate-Entitäten (pro Zimmer + global)
│                            # → extra_state_attributes: hier werden alle Daten ans Frontend geliefert
│
├── sensor.py                # Sensor-Entitäten (Gesamtanforderung, Laufzeit, etc.)
├── binary_sensor.py         # Binary-Sensor-Entitäten (Lüftungsempfehlung, CO₂-Warnung pro Zimmer)
├── switch.py                # Switch-Entitäten
├── number.py                # Number-Entitäten
├── select.py                # Select-Entitäten
│
├── services.yaml            # Service-Dokumentation für HA UI (Developer Tools)
│                            # → Neuer Service? IMMER hier dokumentieren, sonst unsichtbar in HA
│
├── strings.json             # Pflichtdatei für HA ConfigFlow-Übersetzungen (= Kopie von translations/en.json)
├── icon.png                 # Integration-Icon (256×256 PNG, HACS-Pflicht)
│
└── Mixin-Dateien (werden von coordinator.py importiert und geerbt):
    ├── presence_manager.py      # Anwesenheitserkennung, away-Modus-Logik
    │                            # → _check_presence_based_away(), _async_startup_presence_sync()
    ├── window_manager.py        # Fenstererkennung (Event-getrieben), last-known-state Logik
    │                            # → _is_window_open(), _prefill_window_states(), _setup_window_listeners()
    │                            # → KEIN Grace-Timer mehr! Unbekannte Sensoren nutzen letzten bekannten Zustand
    ├── trv_controller.py        # TRV-Ventilsteuerung, Setpoint-Quantisierung, Override-Erkennung
    │                            # → _apply_trv_mode(), _blend_trv_temp(), _apply_trv_valve_demand()
    ├── room_logic.py            # Raumtemperatur-Berechnung, Anforderung, Modus-Auflösung
    │                            # → _calculate_room_data(), _get_target_temp(), Zeitplan-Auswertung
    ├── energy_manager.py        # Laufzeitmessung, kWh-Schätzung, Heizkurve
    │                            # → _update_runtime_tracking(), _get_heating_curve_temp()
    ├── comfort_manager.py       # Schimmelschutz, CO₂-Überwachung, Lüftungsempfehlung
    │                            # → _check_mold_protection(), _check_co2(), _check_ventilation()
    ├── vacation_manager.py      # Urlaubs-Modus, Kalender-Integration, Gäste-Modus
    │                            # → _check_vacation_mode(), _check_calendar_vacation()
    ├── climate_adjustments.py   # Solar-Boost, Energiepreis-Eco, Adaptive Heizkurve
    │                            # → _get_solar_boost(), _get_energy_price_eco_offset(), _adapt_heating_curve()
    └── heat_generator_stub.py   # Wärmeerzeuger-Modus Stub (Roadmap 3.0, WIP)
```

### Frontend-Dateien

```
custom_components/intelligent_heating_control/frontend/
├── ihc-panel.js             # KOMPILIERTE Datei – NICHT direkt bearbeiten!
│                            # Wird von build.py aus src/ zusammengebaut
│                            # Diese Datei lädt Home Assistant
│
├── build.py                 # Build-Script: python3 frontend/build.py
│                            # → Konkateniert src/-Dateien in korrekter Reihenfolge → ihc-panel.js
│
└── src/                     # Quell-Dateien (hier entwickeln!)
    ├── 00_constants.js      # DOMAIN, DAYS, MODE_LABELS, WEATHER_CONDITIONS
    ├── 01_styles.css.js     # Komplettes CSS als Template-Literal (STYLES)
    │                        # → Design-Änderungen hier
    ├── 02_utils.js          # Helper-Methoden: _getRoomData, _getGlobal, _callService,
    │                        # _toast, _attachEntityPickers, _renderPresenceCheckboxes
    │                        # → Neue Helper-Methoden hier
    ├── 03_tab_dashboard.js  # Dashboard-Tab: _renderOverview()
    │                        # → Hero-Bereich, Zimmer-Kacheln, Systemmodus-Buttons
    ├── 04_tab_rooms.js      # Zimmer-Tab: _renderRooms(), _renderRoomDetail(),
    │                        # _renderRoomScheduleInline(), _renderRoomCalendarInline()
    │                        # → Zimmer-Detail, Zeitplan-Editor, Kalender-Ansicht
    ├── 05_tab_settings.js   # Einstellungen-Tab: _renderSettings()
    │                        # → MODUS-ABHÄNGIG: Abschnitte werden je nach controller_mode
    │                        #   (trv/switch/hg) ein-/ausgeblendet
    │                        # → TRV: nur Basis-Einstellungen sichtbar
    │                        # → Switch: + Heizungsregelung, Vorlauf, Kalibrierung
    │                        # → HG (WIP): + Wärmeerzeuger-Sektion mit WIP-Badge
    ├── 06_tab_diagnose.js   # Diagnose-Tab: _renderDiagnose()
    │                        # → System-Status, Sensor-Werte, Energie-Statistiken
    ├── 07_tab_curve.js      # Heizkurve-Tab: _renderCurve(), _drawCurve()
    ├── 08_modals.js         # Modale Dialoge: _showAddRoomModal(), _showEditRoomModal(),
    │                        # _showConfirmModal(), _showModal()
    │                        # → Zimmer hinzufügen/bearbeiten
    └── 09_main.js           # IHCPanel Klasse: constructor, lifecycle (set hass, connectedCallback),
                             # _renderTabContent() Switch-Case
                             # → Tab-Navigation, Panel-Mounting, Klasse-Definition
```

### Häufige Aufgaben → Welche Datei?

| Aufgabe | Datei(en) |
|---------|-----------|
| Neue globale Einstellung hinzufügen | `const.py` → `config_flow.py` → `climate.py` → `coordinator.py` → `src/05_tab_settings.js` |
| Neue Zimmer-Einstellung | `const.py` → `coordinator.py` → `climate.py` → `__init__.py` → `config_flow.py` → `src/08_modals.js` |
| Neuen Service | `const.py` → `__init__.py` → `services.yaml` |
| Dashboard ändern | `src/03_tab_dashboard.js` |
| Zimmer-Detail ändern | `src/04_tab_rooms.js` |
| Einstellungen-Tab | `src/05_tab_settings.js` |
| Diagnose-Tab | `src/06_tab_diagnose.js` |
| CSS/Design | `src/01_styles.css.js` |
| Fensterlogik | `window_manager.py` |
| TRV-Steuerung | `trv_controller.py` |
| Heizlogik pro Zimmer | `room_logic.py` |
| Solar/Energiepreis | `climate_adjustments.py` |
| Anwesenheit | `presence_manager.py` |

> **Nach Änderungen in src/:** Immer `python3 frontend/build.py` ausführen um `ihc-panel.js` neu zu bauen!

---

## 3. Architektur & Datenfluss

```
config_flow.py  →  HA Options-Store  →  coordinator.py  →  climate.py  →  ihc-panel.js
   (UI-Config)                           (Logik/Calc)      (Attribute)    (Web Frontend)
                                              ↑
                                    callService() vom Frontend
```

### Wie kommen Daten ins Frontend?

1. **coordinator.py** berechnet pro Zimmer: Zieltemperatur, Anforderung (demand), Modus, Status
2. **climate.py** stellt `extra_state_attributes` bereit – ein großes dict mit allem
3. **ihc-panel.js** liest via `hass.states["climate.ihc_ZIMMER_NAME"]` die Attribute
4. Frontend schreibt via `callService(domain, service, data)` zurück

### Entitäts-Namensschema
- Global: `climate.intelligent_heating_control` (enthält alle Zimmer in Attributen)
- Pro Zimmer: `climate.ihc_<zimmer_name_lowercase>` (z.B. `climate.ihc_wohnzimmer`)

---

## 4. Frontend-Architektur (ihc-panel.js)

### Tab-Struktur (aktueller Stand nach Refactor)
```
🏠 Dashboard      → _renderOverview()
🚪 Zimmer         → _renderRooms()
                     ↓ wenn Zimmer ausgewählt (_selectedRoom != null):
                     _renderRoomDetail(room, container)
                       Sub-Tab 📅 Zeitplan    → _renderRoomScheduleInline(room, container)
                       Sub-Tab 🗓️ Wochenansicht → _renderRoomCalendarInline(room, container)
📊 Übersicht      → _renderDiagnose()
⚙️ Einstellungen  → _renderSettings()
📈 Heizkurve      → _renderCurve()
```

### Wichtige State-Variablen
```javascript
this._activeTab         // aktueller Haupt-Tab ("overview" | "rooms" | "diagnose" | "settings" | "curve")
this._selectedRoom      // entity_id des ausgewählten Zimmers (null = Zimmerliste anzeigen)
this._selectedRoomTab   // "schedule" | "calendar"
this._editingSchedules  // { [entityId]: schedules[] } – Zeitplan-Puffer bis Speichern
this._modalOpen         // true wenn Add/Edit-Modal offen
```

### Zeitplan-Format
```javascript
// IHC-eigenes Format (CONF_SCHEDULES)
[{
  days: ["mon", "tue", "wed", "thu", "fri"],
  periods: [
    { start: "06:00", end: "08:00", temperature: 21.0, offset: 0 },
    { start: "17:00", end: "22:00", temperature: 22.0, offset: 0 }
  ]
}]

// HA Schedule-Format (CONF_HA_SCHEDULES)
[{
  entity: "schedule.wohnzimmer_heizung",
  temperature: 22.0,
  condition_entity: "person.max",  // optional
  condition_state: "home"          // optional, default "on"
}]
```

### Service-Calls (Frontend → Backend)
```javascript
// Immer über:
this._callService("service_name", { field: value, ... })
// Übersetzt zu: hass.callService("intelligent_heating_control", "service_name", data)

_callService("add_room",               { name, temp_sensor, valve_entities, ... })
_callService("update_room",            { id, schedules, ha_schedules, ... })
_callService("remove_room",            { id })
_callService("set_room_mode",          { id, mode })
_callService("boost_room",             { id, duration_minutes, temp?, cancel? })
_callService("update_global_settings", { outdoor_temp_sensor, controller_mode, ... })
_callService("set_system_mode",        { mode })
_callService("reload",                 {})
```

---

## 5. Alle Konstanten (const.py)

### Globale CONF_* (Systemkonfiguration)
| Konstante | Typ | Default | Beschreibung |
|-----------|-----|---------|--------------|
| `CONF_OUTDOOR_TEMP_SENSOR` | str | – | Außentemperatursensor entity_id |
| `CONF_HEATING_SWITCH` | str | – | Heizungsschalter entity_id |
| `CONF_COOLING_SWITCH` | str | – | Kühlschalter entity_id |
| `CONF_HEATING_CURVE` | list | DEFAULT_HEATING_CURVE | Heizkurvenpunkte |
| `CONF_DEMAND_THRESHOLD` | float | 15.0 | Einschaltschwelle % |
| `CONF_DEMAND_HYSTERESIS` | float | 5.0 | Hysterese % |
| `CONF_MIN_ON_TIME` | int | 5 | Min. Einschaltzeit (min) |
| `CONF_MIN_OFF_TIME` | int | 5 | Min. Ausschaltzeit (min) |
| `CONF_MIN_ROOMS_DEMAND` | int | 1 | Min. Zimmer mit Anforderung |
| `CONF_SYSTEM_MODE` | str | "auto" | Systemmodus |
| `CONF_AWAY_TEMP` | float | 16.0 | Abwesend-Temperatur global |
| `CONF_VACATION_TEMP` | float | 14.0 | Urlaubstemperatur |
| `CONF_PRESENCE_ENTITY` | str | – | Globale Anwesenheit entity_id |
| `CONF_PRESENCE_ENTITIES` | list | – | Liste Anwesenheits-Entitäten |
| `CONF_ENABLE_COOLING` | bool | False | Kühlung aktiviert |
| `CONF_SUMMER_MODE_ENABLED` | bool | False | Sommerautomatik |
| `CONF_SUMMER_THRESHOLD` | float | 18.0 | Sommer-Schwelle °C |
| `CONF_SHOW_PANEL` | bool | True | Frontend-Panel anzeigen |
| `CONF_FROST_PROTECTION_TEMP` | float | 7.0 | Frostschutz-Temperatur °C |
| `CONF_NIGHT_SETBACK_ENABLED` | bool | False | Nachtabsenkung aktiv |
| `CONF_NIGHT_SETBACK_OFFSET` | float | 2.0 | Nachtabsenkungs-Offset °C |
| `CONF_SUN_ENTITY` | str | "sun.sun" | Sonnen-Entität |
| `CONF_PREHEAT_MINUTES` | int | 0 | Globale Vorheizzeit (min) |
| `CONF_CONTROLLER_MODE` | str | "switch" | "switch" oder "trv" |
| `CONF_BOILER_KW` | float | 20.0 | Kesselleistung kW |
| `CONF_SOLAR_ENTITY` | str | – | Solar-Leistungssensor |
| `CONF_SOLAR_SURPLUS_THRESHOLD` | int | 1000 | Solar-Überschuss W |
| `CONF_SOLAR_BOOST_TEMP` | float | 1.0 | Boost bei Solar-Überschuss °C |
| `CONF_ENERGY_PRICE_ENTITY` | str | – | Dynamischer Strompreissensor |
| `CONF_ENERGY_PRICE_THRESHOLD` | float | 0.30 | Teuer-Schwelle €/kWh |
| `CONF_ENERGY_PRICE_ECO_OFFSET` | float | 2.0 | Eco-Abzug bei hohem Preis °C |
| `CONF_FLOW_TEMP_ENTITY` | str | – | Vorlauftemperatur **number entity** (Schreiben: PID schickt Sollwert hierher, z.B. `number.heizung_vorlauf`) |
| `CONF_FLOW_TEMP_SENSOR` | str | – | Vorlauftemperatur **sensor entity** (Lesen: aktueller IST-Wert, z.B. `sensor.vorlauftemperatur`) |
| `CONF_VACATION_START` | str | – | Urlaubsstart ISO-Datum |
| `CONF_VACATION_END` | str | – | Urlaubsende ISO-Datum |
| `CONF_VACATION_CALENDAR` | str | – | Kalender-Entität für Urlaub |
| `CONF_VACATION_CALENDAR_KEYWORD` | str | "urlaub" | Stichwort im Kalender |
| `CONF_VACATION_RETURN_PREHEAT_DAYS` | int | 0 | Vorheizung vor Urlaubsende (Tage) |
| `CONF_WEATHER_ENTITY` | str | – | Wetter-Entität |
| `CONF_WEATHER_COLD_THRESHOLD` | float | 0.0 | Kalt-Warnung °C |
| `CONF_WEATHER_COLD_BOOST` | float | 0.0 | Boost bei Kältewarnung °C |
| `CONF_ADAPTIVE_CURVE_ENABLED` | bool | False | Adaptive Heizkurve |
| `CONF_ADAPTIVE_CURVE_MAX_DELTA` | float | 3.0 | Max. Kurvenverschiebung °C |
| `CONF_ADAPTIVE_PREHEAT_ENABLED` | bool | True | Adaptive Vorheizung |
| `CONF_ETA_PREHEAT_ENABLED` | bool | False | ETA-basierte Vorheizung |
| `CONF_COOLING_TARGET_TEMP` | float | 24.0 | Kühl-Zieltemperatur °C |
| `CONF_PID_KP` | float | 2.0 | PID Proportionalanteil |
| `CONF_PID_KI` | float | 0.1 | PID Integrationsanteil |
| `CONF_PID_KD` | float | 0.5 | PID Differentialanteil |
| `CONF_SMART_METER_ENTITY` | str | – | Smart-Meter kWh-Sensor |
| `CONF_PRICE_FORECAST_ATTRIBUTE` | str | "today_prices" | Tibber-Preis-Attribut |
| `CONF_OUTDOOR_HUMIDITY_SENSOR` | str | – | Außen-Feuchtigkeitssensor |
| `CONF_GUEST_DURATION_HOURS` | int | 24 | Gäste-Modus Dauer (h) |

### Raum-CONF_* (pro Zimmer)
| Konstante | Typ | Default | Beschreibung |
|-----------|-----|---------|--------------|
| `CONF_ROOMS` | list | [] | Alle Zimmer-Konfigurationen |
| `CONF_ROOM_ID` | str | – | Interne Zimmer-ID |
| `CONF_ROOM_NAME` | str | – | Zimmername |
| `CONF_TEMP_SENSOR` | str | – | Temperatursensor entity_id |
| `CONF_VALVE_ENTITY` | str | – | Primär-Thermostat entity_id |
| `CONF_VALVE_ENTITIES` | list | – | Liste aller Thermostate/TRVs |
| `CONF_WINDOW_SENSOR` | str | – | Primär-Fenstersensor |
| `CONF_WINDOW_SENSORS` | list | – | Liste aller Fenstersensoren |
| `CONF_WINDOW_REACTION_TIME` | int | 30 | Sekunden bis Fenster-Reaktion |
| `CONF_WINDOW_CLOSE_DELAY` | int | 0 | Sekunden nach Schließen |
| `CONF_ROOM_OFFSET` | float | 0.0 | Offset zur Heizkurve °C |
| `CONF_DEADBAND` | float | 0.5 | Totband °C |
| `CONF_WEIGHT` | float | 1.0 | Gewichtung in Gesamtanforderung |
| `CONF_MIN_TEMP` | float | 5.0 | Minimale Temperatur °C |
| `CONF_MAX_TEMP` | float | 30.0 | Maximale Temperatur °C |
| `CONF_COMFORT_TEMP` | float | 21.0 | Komfort-Temperatur °C |
| `CONF_AWAY_TEMP_ROOM` | float | 16.0 | Abwesend-Temp pro Zimmer °C |
| `CONF_ABSOLUTE_MIN_TEMP` | float | 15.0 | Absoluter Boden °C |
| `CONF_ROOM_QM` | float | 0.0 | Zimmerfläche m² |
| `CONF_ROOM_PREHEAT_MINUTES` | int | -1 | Vorheizzeit (-1=global) |
| `CONF_ECO_OFFSET` | float | 3.0 | Eco-Abzug von Komfort °C |
| `CONF_SLEEP_OFFSET` | float | 4.0 | Schlaf-Abzug von Komfort °C |
| `CONF_AWAY_OFFSET` | float | 6.0 | Away-Abzug von Komfort °C |
| `CONF_ECO_MAX_TEMP` | float | 21.0 | Eco-Maximum °C |
| `CONF_SLEEP_MAX_TEMP` | float | 19.0 | Schlaf-Maximum °C |
| `CONF_AWAY_MAX_TEMP` | float | 18.0 | Away-Maximum °C |
| `CONF_HA_SCHEDULE_OFF_MODE` | str | "eco" | Fallback-Modus ohne Zeitplan |
| `CONF_SCHEDULES` | list | [] | IHC-Zeitpläne |
| `CONF_HA_SCHEDULES` | list | [] | HA Schedule-Entitäten |
| `CONF_HUMIDITY_SENSOR` | str | – | Feuchtigkeitssensor |
| `CONF_MOLD_PROTECTION_ENABLED` | bool | True | Schimmelschutz aktiv |
| `CONF_MOLD_HUMIDITY_THRESHOLD` | float | 70.0 | Schimmel-Schwelle % |
| `CONF_CO2_SENSOR` | str | – | CO₂-Sensor entity_id |
| `CONF_CO2_THRESHOLD_GOOD` | int | 800 | Gute Luft ppm |
| `CONF_CO2_THRESHOLD_BAD` | int | 1200 | Schlechte Luft ppm |
| `CONF_VENTILATION_ADVICE_ENABLED` | bool | True | Lüftungsempfehlung aktiv |
| `CONF_RADIATOR_KW` | float | 1.0 | Heizkörperleistung kW |
| `CONF_HKV_SENSOR` | str | – | HKV-Einheiten Sensor |
| `CONF_HKV_FACTOR` | float | 0.083 | kWh pro HKV-Einheit |
| `CONF_ROOM_PRESENCE_ENTITIES` | list | – | Zimmer-Anwesenheitsliste |
| `CONF_BOOST_TEMP` | float | – | Boost-Zieltemperatur °C |
| `CONF_BOOST_DEFAULT_DURATION` | int | 60 | Boost-Standarddauer (min) |
| `CONF_TEMP_CALIBRATION` | float | 0.0 | Sensor-Kalibrierungsoffset °C |
| `CONF_ECO_OFFSET` | float | 3.0 | Eco-Abzug °C |

### Systemmodi (`SYSTEM_MODES`)
`auto` | `heat` | `cool` | `off` | `away` | `vacation` | `guest`

### Zimmermodi (`ROOM_MODES`)
`auto` | `comfort` | `eco` | `sleep` | `away` | `off` | `manual`

### Controller-Modi
`switch` (Heizungsschalter steuern) | `trv` (TRVs direkt steuern, bei kein Bedarf zudrehen)

---

## 6. Services (services.yaml)

### `add_room`
Neues Zimmer hinzufügen.
```
name (required), temp_sensor, valve_entity, window_sensor,
room_offset, comfort_temp, eco_temp, sleep_temp, deadband, weight
```

### `remove_room`
```
id (required)
```

### `update_room`
Bestehendes Zimmer aktualisieren – alle Felder optional außer `id`.
```
id (required), temp_sensor, valve_entity, valve_entities, window_sensor, window_sensors,
comfort_temp, eco_offset, eco_max_temp, sleep_offset, sleep_max_temp, away_offset, away_max_temp,
room_offset, deadband, weight, ha_schedule_off_mode, schedules, ha_schedules,
humidity_sensor, mold_protection_enabled, co2_sensor, radiator_kw,
hkv_sensor, hkv_factor, room_presence_entities, boost_temp, boost_default_duration
```

### `set_room_mode`
```
id (required), mode (required): auto|comfort|eco|sleep|away|off|manual
```

### `set_system_mode`
```
mode (required): auto|heat|cool|off|away|vacation
```

### `boost_room`
```
id (required), duration_minutes (default:60), cancel (bool, default:false)
```

### `update_global_settings`
```
demand_threshold, demand_hysteresis, min_on_time, min_off_time, min_rooms_demand,
away_temp, vacation_temp, frost_protection_temp, summer_mode_enabled, summer_threshold,
night_setback_enabled, night_setback_offset, preheat_minutes
```

### `reload`
Integration neu laden (keine Parameter).

---

## 7. Git-Workflow

Der aktive Branch heißt `claude/review-homeassistant-repo-PL7tn`.
Branches beginnen immer mit `claude/` + Session-ID. Push scheitert mit HTTP 403 wenn Branchname falsch.

```bash
# Auf korrekten Branch wechseln / erstellen
git checkout claude/review-homeassistant-repo-PL7tn
# oder erstellen falls nötig:
git checkout -b claude/review-homeassistant-repo-PL7tn

# Commiten
git add custom_components/intelligent_heating_control/DATEI.py
git commit -m "fix: beschreibung der änderung"

# Pushen (IMMER so, nie abkürzen)
git push -u origin claude/review-homeassistant-repo-PL7tn
```

**Niemals auf `main` pushen.**

### Korrekte Pfade
- Arbeitsverzeichnis: `/home/user/intelligent-heatingcontrol/` (KEIN doppeltes `l` am Ende!)
- Integration: `custom_components/intelligent_heating_control/`

---

## 8. Pflicht-Checks vor jedem Commit

```bash
cd /home/user/intelligent-heatingcontrol

# 1. Python-Syntax prüfen
python3 -m py_compile custom_components/intelligent_heating_control/const.py && echo OK
python3 -m py_compile custom_components/intelligent_heating_control/coordinator.py && echo OK
python3 -m py_compile custom_components/intelligent_heating_control/config_flow.py && echo OK
python3 -m py_compile custom_components/intelligent_heating_control/climate.py && echo OK

# 2. Keine verwaisten Importe (Beispiel: nach Löschen einer Konstante)
grep -rn "CONF_XYZ" custom_components/ --include="*.py"
# → muss leer sein

# 3. Keine querySelector-Referenzen auf gelöschte HTML-Elemente
grep -n "querySelector.*#element-id" custom_components/intelligent_heating_control/frontend/ihc-panel.js

# 4. Diff lesen
git diff --stat
```

---

## 9. Bug-Analyse: Woher kamen die Bugs?

Alle Bugs hatten **ein einziges Muster**: Eine Änderung wurde an Stelle A gemacht,
aber die abhängige Stelle B wurde vergessen.

| Bug | Ursache |
|-----|---------|
| `CONF_WINDOW_OPEN_TEMP` Import-Crash HA | In `const.py` gelöscht, `coordinator.py` importierte es noch |
| `enable-heating-switch` JS-Fehler | HTML-Element entfernt, `querySelector` im save-handler blieb |
| Zeitpläne/Kalender Switch-Case blieb | Tab aus HTML entfernt, `case` in `_renderTabContent()` blieb |
| Add-Room fehlte CO₂ + Presence-Feld | Felder im Edit-Modal ergänzt, Add-Modal nie synchronisiert |
| `<select>` hatte Klasse `form-input` | Aus `<input>`-Template kopiert ohne Klasse anzupassen |
| Float statt Int für Reaktionszeiten | Frontend: `parseFloat()`, Backend: `int()` – nie abgeglichen |
| TRV-Sensor-Felder nie konfigurierbar | In const.py+coordinator.py implementiert, config_flow+Frontend vergessen |
| `CONF_ROOM_PRESENCE_ENTITIES` nur halb | In __init__.py handle_add_room, aber nicht in config_flow-Schema |
| `CONF_BOOST_TEMP` im Add-Modal fehlend | Im Edit-Modal ergänzt, Add-Modal nie synchronisiert (klassischer Sync-Bug) |
| `"update_global_settings"` Magic String | Service-Name als Hardstring statt Konstante in const.py |
| sysmode-Buttons Dashboard kein Handler | `#hero-set-mode`/`#hero-system-mode` Elemente existierten nicht mehr; querySelectorAll + data-sysmode nötig |
| 4 Services fehlten in services.yaml | Im __init__.py registriert, aber nie in services.yaml dokumentiert → unsichtbar in HA |
| strings.json fehlte | HA lädt ConfigFlow-Übersetzungen aus strings.json (Pflicht), Datei = Kopie von translations/en.json |
| icon.png falsche Größe (359×354) | HACS erwartet exakt 256×256px; Pillow-Resize nötig |

---

## 10. Checklisten nach Änderungstyp

### Wenn eine Konstante aus `const.py` gelöscht oder umbenannt wird

```bash
# PFLICHT vor dem Löschen: alle Referenzen suchen
grep -rn "CONF_XYZ\|DEFAULT_XYZ" custom_components/ --include="*.py"
```

Alle gefundenen Stellen müssen **im gleichen Commit** bereinigt werden:
- [ ] `const.py` – Definition entfernt
- [ ] `coordinator.py` – Import + alle Verwendungen entfernt
- [ ] `config_flow.py` – Import + Formular + save-handler bereinigt
- [ ] `climate.py` – Import + `extra_state_attributes` bereinigt

### Wenn eine Konstante in `const.py` neu hinzugefügt wird

- [ ] `const.py` – Definition mit `CONF_` und `DEFAULT_` Wert
- [ ] `config_flow.py` – Import, im Formular anzeigen, im save-handler `int()`/`float()`/`str()` speichern
- [ ] `climate.py` – Import, in `extra_state_attributes` zurückgeben mit korrektem Fallback-Typ
- [ ] `coordinator.py` – Import, in der Logik verwenden

### Wenn eine neue Zimmer-Konstante hinzugefügt wird (KRITISCH: 5+2 Stellen!)

Zimmer-Felder existieren in **sieben** Stellen – alle müssen synchron sein:

```
const.py → coordinator.py → climate.py → __init__.py (handle_add_room)
                                        → config_flow.py (Add-Schema + Edit-Schema)
                                        → ihc-panel.js (_showAddRoomModal HTML + saveHandler)
                                        → ihc-panel.js (_showEditRoomModal HTML + saveHandler)
```

Checkliste:
- [ ] `const.py` – `CONF_*` + `DEFAULT_*` Definition
- [ ] `coordinator.py` – Import + Verwendung in Logik
- [ ] `climate.py` – Import + in `extra_state_attributes` mit korrektem Fallback
- [ ] `__init__.py` – in `handle_add_room()` aus `call.data.get(...)` mit Typ-Konvertierung
- [ ] `config_flow.py` Add-Room schema – Feld mit `vol.Optional()` + `selector.selector()`
- [ ] `config_flow.py` Add-Room save-handler – Feld in `new_room` dict mit Typ-Konvertierung
- [ ] `config_flow.py` Edit-Room schema – Feld mit `vol.Optional(default=room.get(...))` + selector
- [ ] `ihc-panel.js` `_showAddRoomModal()` – HTML-Eingabefeld mit id `m-*`
- [ ] `ihc-panel.js` `_showAddRoomModal()` save-handler – Feld im `_callService()` Aufruf
- [ ] `ihc-panel.js` `_showEditRoomModal()` – HTML-Eingabefeld mit Vorbelegung aus `room.*`
- [ ] `ihc-panel.js` `_showEditRoomModal()` save-handler – Feld im `_callService()` Aufruf

> **Hinweis:** Edit-Room in config_flow braucht keinen eigenen save-handler – `{**room, **user_input}` merged automatisch. Aber das Schema muss das Feld enthalten, sonst wird es nie geändert.

### Wenn ein neuer Service hinzugefügt wird

Magic Strings sind Bug-Quellen. Immer:
- [ ] `const.py` – `SERVICE_XYZ: Final = "xyz_service_name"` definieren
- [ ] `__init__.py` – `SERVICE_XYZ` importieren und bei `hass.services.async_register()` verwenden
- [ ] Kein Hardstring `"xyz_service_name"` irgendwo im Code

### Wenn ein HTML-Element im Frontend entfernt oder umbenannt wird

Für jede entfernte `id="foo"`:
- [ ] Suche alle `querySelector("#foo")` und `#foo` im JS → entfernen oder anpassen
- [ ] Prüfe ob Event-Listener (`addEventListener`) für dieses Element existieren → entfernen

```bash
grep -n "foo" custom_components/intelligent_heating_control/frontend/ihc-panel.js
```

### Wenn ein Tab aus der Tab-Bar entfernt wird

Beide Stellen sind immer gemeinsam zu ändern:
- [ ] HTML: `<div class="tab" data-tab="xyz">` entfernen
- [ ] JS: `case "xyz": this._renderXyz(content); break;` in `_renderTabContent()` entfernen
- [ ] JS: Auto-Refresh-Timer prüfen (suche nach `this._activeTab === "xyz"`)

### Wenn ein Feld zu einem Modal hinzugefügt wird

Add-Room und Edit-Room Modal müssen **immer synchron** bleiben:
- [ ] Feld im `_showAddRoomModal()` HTML ergänzt
- [ ] Feld im `_showAddRoomModal()` save-handler ergänzt (mit `?.value` für sichere Abfrage)
- [ ] Feld im `_showEditRoomModal()` HTML ergänzt (mit Vorbelegung aus `room.xyz`)
- [ ] Feld im `_showEditRoomModal()` save-handler ergänzt

### Typen zwischen Frontend und Backend

| Python-Typ | Frontend → Backend | Backend → Frontend |
|------------|--------------------|--------------------|
| `int` | `parseInt(val, 10)` | `?? 0` |
| `float` | `parseFloat(val)` | `?? 0.0` |
| `bool` | `val === "true"` | `!== false` |
| `str` | `.value.trim()` | `\|\| ""` |
| `list` | `.split(",").map(s=>s.trim()).filter(Boolean)` | `\|\| []` |

**Niemals** `parseFloat()` für Werte die Backend als `int` erwartet (Sekunden, Minuten, ppm).

---

## 11. Bekannte offene Punkte / Roadmap

### Implementiert (✅)
- Zeitpläne und Kalender als Zimmer-Sub-Tabs statt globale Tabs
- TRV-Modus sichtbar in Einstellungen (Hardware & Steuerung)
- Hysterese und Timing sichtbar (Heizungsregelung & Hysterese, standardmäßig offen)
- Add-Room Modal: CO₂-Sensor und Presence-Entitäten Felder ergänzt
- Schimmelschutz-Select: CSS-Klasse auf `form-select` korrigiert
- HA-Startup-Crash (CONF_WINDOW_OPEN_TEMP) behoben
- icon.png auf 256×256px skaliert (HACS-Pflicht), strings.json erstellt (HA-Pflichtdatei)
- CLAUDE.md als vollständiges Onboarding-Dokument
- TRV-Sensor-Felder (trv_temp_weight, trv_temp_offset, trv_valve_demand, trv_min_send_interval) in config_flow + Add-Room Modal ergänzt
- CONF_ROOM_PRESENCE_ENTITIES in config_flow Add/Edit-Room Schema ergänzt
- CONF_BOOST_TEMP in config_flow Add-Room Schema + Add-Room Modal ergänzt
- SERVICE_UPDATE_GLOBAL_SETTINGS als Konstante in const.py + __init__.py (kein Magic String mehr)
- TRV-Setpoint-Quantisierung auf 0.5°C-Schritte (Akkusparmodus, TRV_SETPOINT_STEP)
- Startup-Gnadenfrist für Zigbee/Z-Wave-Sensoren (CONF_STARTUP_GRACE_SECONDS, Standard 60s)
- Event-getriebene Fenstererkennung via async_track_state_change_event (kein 60s Delay mehr)
- Sofortige Fenstererkennung bei Modus-Wechsel (OFF→AUTO) via _prefill_window_states()
- Code-Audit: 7 Bugs behoben (hardcoded Strings, timezone-Import, Window-Listener-Unsub-Bug,
  fehlende Felder im config_flow-Schema, trv_valve_demand Typ-Inkonsistenz, CONF_BOOST_TEMP float())
- services.yaml: 4 fehlende Services ergänzt (export_config, activate_guest_mode, deactivate_guest_mode, reset_stats)
- sysmode-pill Buttons im Dashboard repariert (querySelector → querySelectorAll + data-sysmode)
- TRV-first Berechnung: Im TRV-Modus wird die Ventilposition als primäres Anforderungssignal
  verwendet (60% Ventil + 40% Temperaturdelta), auto-aktiviert ohne CONF_TRV_VALVE_DEMAND Flag.
  Laufzeitmessung nutzt ebenfalls Ventilposition > 8% statt berechnete Anforderung → reaktionsschneller

---

## 13. TRV-Architektur (Wichtig für alle zukünftigen Sessions)

### Warum Ventilposition statt Raumsensor?

| Signal | Reaktionszeit | Genauigkeit für Anforderung | Verfügbarkeit |
|--------|--------------|----------------------------|---------------|
| Raumsensor (Luft) | 15–30 min | gut für Komfort, träge für Regelung | optional |
| TRV current_temperature | 5–15 min | am Heizkörper = leicht wärmer als Raum | wenn TRV vorhanden |
| TRV Ventilposition | sofort | direktes Signal: TRV-eigener Controller hat entschieden | wenn TRV unterstützt |

**Fazit:** Die Ventilposition ist das beste Anforderungssignal in TRV-Modus, weil der TRV-interne Controller bereits eine eigene Regelung macht und das Ergebnis (Ventil auf/zu) direkt ausgibt.

### Attribut-Namen für Ventilposition (verschiedene TRVs)
```python
vp = attrs.get("valve_position") or attrs.get("position") or attrs.get("pi_heating_demand")
```
- Zigbee2MQTT TRVs: `valve_position` (0–100)
- Z-Wave TRVs: `position` (0–100)
- Eurotronic/Spirit: `pi_heating_demand` (0–100)

### Blending-Logik (coordinator.py `_apply_trv_valve_demand`)
```
TRV-Modus (auto):    demand = temp_demand * 0.40 + valve_position * 0.60
Switch-Modus (opt):  demand = temp_demand * 0.70 + valve_position * 0.30
                     + Klammerung: valve>85% → min 30, valve<8% → max 30
```

### Temperatur-Blending (`_blend_trv_temp`)
```
trv_temp_weight = 0 (default):  Raumsensor primär, TRV-Temp nur Fallback wenn kein Raumsensor
trv_temp_weight > 0:             Blended = room * (1-w) + (trv_avg + offset) * w
trv_temp_offset (default 0):     Kalibrierung: TRV sitzt am Heizkörper → oft leicht wärmer
                                  Negativer Offset (z.B. -2.0) kompensiert Nahwärme
```

### Laufzeitmessung in TRV-Modus (coordinator.py `_update_runtime_tracking`)
```python
# TRV-Modus: Ventilposition > 8% = Zimmer heizt (direktes Signal)
avg_valve = rdata.get("trv_avg_valve")
if avg_valve is not None:
    room_heating = avg_valve > 8
else:
    room_heating = demand > 0  # Fallback
```

### Wo TRV-Daten im room_data dict landen
Nach `_async_update_data()` enthält jedes room_data-Entry:
```python
"trv_raw_temp":    float | None   # Rohtemperatur vom TRV (ohne Offset)
"trv_humidity":    float | None   # Luftfeuchtigkeit aus TRV-Attributen
"trv_avg_valve":   float | None   # Ventilöffnung 0-100%
"trv_any_heating": bool           # True wenn hvac_action == "heating" bei irgendeinem TRV
```

---

### Geplant / Roadmap
- 1.1: Temperaturverlauf 7 Tage (168h Snapshots)
- 1.2: Urlaubs-Assistent (Datumsbereich, Kalender-Keyword)
- 1.3: Adaptive Heizkurve, Solarüberschuss-Integration, Energiepreisoptimierung
- 1.4: ETA-basierte Vorheizung
- 1.5: PID Vorlauftemperaturregelung, Smart-Meter, Tibber-Forecast
- 2.0: Wettervorhersage-Integration, Gäste-Modus erweitert
- 2.1: Passive Solar Heating / Rollosteuerung (siehe Notizen unten)

---

### Notizen: 2.1 – Passive Solar Heating via Rollosteuerung

**Idee (analog zu Loxone "Passive Cooling/Heating via Blinds"):**
Bevor die Heizung morgens anläuft → Rolladen hochfahren damit Sonnenwärme den Raum vorwärmt.
Im Sommer umgekehrt: Rolladen runterfahren um Aufheizung durch Sonne zu verhindern.
Sehr energieeffizient, weil kostenlose Solarenergie genutzt wird bevor der Kessel anspringt.

**Benötigte Daten (alle schon in HA vorhanden oder einfach konfigurierbar):**
- `cover.*` Entitäten – die Rolladen/Jalousien des Zimmers (neu: `CONF_COVER_ENTITIES` pro Zimmer)
- `sun.sun` – Sonnenazimut + Elevation (schon als `CONF_SUN_ENTITY` vorhanden)
- Fensterausrichtung pro Zimmer – z.B. `CONF_WINDOW_ORIENTATION`: `"S"` / `"SW"` / `"W"` etc.
  → Damit IHC weiß ob die Sonne gerade auf dieses Fenster scheint
- Außentemperatur – schon vorhanden (`CONF_OUTDOOR_TEMP_SENSOR`)
- Optional: Wolkenbedeckungsgrad aus `CONF_WEATHER_ENTITY` (weather.state)

**Logik (Entwurf):**

```
Passive Heizen (Winter/Herbst):
  WENN Raum hat Heizanforderung
  UND sun.elevation > CONF_SOLAR_MIN_ELEVATION (z.B. 10°)
  UND Sonne trifft auf Fensterausrichtung (Azimut-Check ±60°)
  UND Außentemp > CONF_SOLAR_HEAT_MIN_OUTDOOR (z.B. 5°C) – lohnt sich nicht bei <5°C
  UND Wetter nicht stark bewölkt (optional)
  DANN: Rolladen öffnen BEVOR Heizung einschaltet
        → Heizung erst zuschalten wenn Raumtemp trotzdem nicht steigt (nach X min)

Passive Kühlen (Sommer):
  WENN Systemmodus = cool ODER Sommerautomatik aktiv
  UND sun.elevation > CONF_SOLAR_MIN_ELEVATION
  UND Sonne trifft auf Fensterausrichtung
  UND Raumtemp > comfort_temp - CONF_SOLAR_SHADE_OFFSET (z.B. 1°C darunter vorsorglich)
  DANN: Rolladen schließen (Position z.B. 20% = Lichteinfall aber kein direktes Sonnenlicht)

Nachts / keine Sonne:
  → Normale IHC-Heizlogik, Rolladen nicht von IHC gesteuert
```

**Neue Konstanten (pro Zimmer):**
| Konstante | Typ | Default | Beschreibung |
|-----------|-----|---------|--------------|
| `CONF_COVER_ENTITIES` | list | [] | Rolladen-Entitäten des Zimmers |
| `CONF_WINDOW_ORIENTATION` | str | "" | Fensterausrichtung: N/NE/E/SE/S/SW/W/NW |
| `CONF_SOLAR_PASSIVE_HEAT` | bool | False | Passive Solarheizung aktiviert |
| `CONF_SOLAR_PASSIVE_COOL` | bool | False | Passive Solarkühlung aktiviert |
| `CONF_SOLAR_MIN_ELEVATION` | float | 10.0 | Min. Sonnenhöhe für Aktivierung (°) |
| `CONF_SOLAR_SHADE_POSITION` | int | 20 | Rolladen-Position bei Beschattung (%) |
| `CONF_SOLAR_HEAT_MIN_OUTDOOR` | float | 5.0 | Min. Außentemp für passives Heizen (°C) |
| `CONF_SOLAR_HEAT_DELAY_MIN` | int | 15 | Minuten warten bevor Heizung als Fallback |

**Azimut-Check (Fensterausrichtung → Sonnenstand):**
```python
ORIENTATION_AZIMUTHS = {
    "N": 0, "NE": 45, "E": 90, "SE": 135,
    "S": 180, "SW": 225, "W": 270, "NW": 315
}
sun_azimuth = hass.states.get("sun.sun").attributes["azimuth"]
window_azimuth = ORIENTATION_AZIMUTHS[orientation]
delta = abs((sun_azimuth - window_azimuth + 180) % 360 - 180)
sun_hits_window = delta <= 60  # ±60° Toleranz
```

**HA Service für Rolladen:**
```python
await hass.services.async_call("cover", "set_cover_position",
    {"entity_id": cover_entity, "position": position})
```

**Wichtige Implementierungshinweise:**
- Rolladen-Steuerung NUR wenn `CONF_SOLAR_PASSIVE_HEAT/COOL` aktiv → opt-in
- Zustand merken: `_cover_managed_by_ihc: Dict[str, bool]` → nur IHC-gesteuerte zurücksetzen
- Bei Fenster öffnen (Fenstersensor ON) → Rolladen NICHT steuern (würde herausfall erzeugen)
- Beim Deaktivieren des Features oder HA-Neustart: Rolladen NICHT automatisch bewegen
- Frontend: neuer Sub-Tab "Rolladen" im Zimmer-Detail oder in Einstellungen
- Priorität: Fensteroffenerkennung > Rollosteuerung > Heizanforderung

---

## 12. Schnellstart für neuen Claude-Context

Falls du diesen Chat frisch öffnest ohne Verlauf, tue folgendes:

```bash
# 1. Ins Projekt wechseln
cd /home/user/intelligent-heatingcontrol

# 2. Auf richtigen Branch wechseln
git checkout claude/review-homeassistant-repo-PL7tn

# 3. Aktuellen Status sehen
git status
git log --oneline -10

# 4. Python-Syntax aller Backend-Dateien prüfen
for f in const.py coordinator.py config_flow.py climate.py; do
  python3 -m py_compile custom_components/intelligent_heating_control/$f && echo "✓ $f"
done

# 5. Frontend-Datei lesen wenn nötig
# Read: custom_components/intelligent_heating_control/frontend/ihc-panel.js
```

**Dann diese CLAUDE.md lesen und Aufgaben aus dem letzten Chat-Kontext übernehmen.**

---

## 14. Architektur-Vision: Zwei Haupt-Betriebsmodi

> **Status (2026-03-17):** TRV-Modus ist implementiert und wird weiter verfeinert.
> Wärmeerzeuger-Modus ist auf der Roadmap (3.0). Beide Modi sollen sich fundamental unterscheiden.

### Überblick der Betriebsmodi

```
CONTROLLER_MODE_TRV    = "trv"    → Jetzt implementiert
CONTROLLER_MODE_SWITCH = "switch" → Jetzt implementiert (Heizungsschalter-Modus)
CONTROLLER_MODE_HG     = "hg"     → Roadmap 3.0: Wärmeerzeuger-Modus (Heat Generator)
```

### Modus-Vergleich: Was ist wo aktiv?

| Feature | TRV-Modus | Switch-Modus | Wärmeerzeuger-Modus (3.0) |
|---------|:---------:|:------------:|:------------------------:|
| Raumtemperatur-Sollwert | ✅ | ✅ | ✅ |
| Zeitpläne (IHC + HA) | ✅ | ✅ | ✅ |
| Manuell-Override mit Auto-Reset | ✅ | ✅ | ✅ |
| Fenstererkennung | ✅ | ✅ | ✅ |
| Schimmelschutz / CO₂ | ✅ | ✅ | ✅ |
| Anwesenheit / Urlaub / Gäste | ✅ | ✅ | ✅ |
| Boost-Modus | ✅ | ✅ | ✅ |
| Nachtabsenkung | ✅ | ✅ | ✅ |
| Adaptives Vorheizen (lernt Aufheizzeit) | ✅ | ✅ | ✅ |
| TRV-Ventilposition als Demand-Signal | ✅ | optional | — |
| TRV-Sensor-Blending | ✅ | optional | — |
| Heizungsschalter (EIN/AUS) | optional¹ | ✅ | — |
| Klimabaustein (Hysterese, Min-Zeiten) | optional¹ | ✅ | — |
| Adaptive Heizkurve | ❌ | ✅ | ✅ |
| Sommerautomatik (schließt TRVs) | ✅² | ✅ | ✅ |
| Vorlauftemperatur-Regelung (PID) | ❌ | ✅ | ✅ |
| Solarüberschuss-Nutzung | optional | ✅ | ✅ |
| Dynamischer Energiepreis | optional | ✅ | ✅ |
| Heizkreis-Pumpensteuerung | ❌ | ❌ | ✅ |
| Mehrkreis-Heizung (HK1/HK2/FBH) | ❌ | ❌ | ✅ |
| Mischventil-Regelung | ❌ | ❌ | ✅ |
| KNX-Thermostat-Integration | ❌ | ❌ | ✅ |
| Pufferspeicher-Management | ❌ | ❌ | ✅ |
| Warmwasser-Priorisierung (TWW) | ❌ | ❌ | ✅ |
| Wärmepumpe-Optimierung (COP) | ❌ | ❌ | ✅ |
| Hydraulischer Abgleich | ❌ | ❌ | ✅ |

¹ Wenn `CONF_HEATING_SWITCH` konfiguriert → Kessel mit TRVs (Hybrid-Setup)
² Sendet Frost-Schutz-Temperatur statt Zieltemperatur → TRV schließt

---

## 15. Roadmap 3.0 – Wärmeerzeuger-Modus (Heat Generator Mode)

> **Ziel:** Einen vollständigen dritten Betriebsmodus für professionelle Zentralheizungsanlagen
> mit mehren Heizkreisen, Wärmepumpen, KNX-Integration und hydraulischem Abgleich.

### 15.1 Anwendungsfälle (Wer braucht den Wärmeerzeuger-Modus?)

```
Typische Setups:
  A) Einfamilienhaus mit Gas/Öl-Kessel + Fußbodenheizung (mehrere Kreise)
  B) Haus mit Wärmepumpe + Niedertemperatur-Heizkörper oder FBH
  C) KNX-Haus mit Raumtemperaturreglern (KNX-Thermostate, Präsenzmelder)
  D) Gebäude mit mehreren Heizkreisen (z.B. HK1 = Heizkörper 60°C, HK2 = FBH 35°C)
  E) Solar-thermisch + Pufferspeicher + Gas-Kessel (Hybrid-Heizung)
  F) Pellet-/Holzheizung mit Pufferspeicher und mehreren Entnahmepunkten
```

### 15.2 Neue Konzepte im Wärmeerzeuger-Modus

#### Heizkreis (CONF_HEATING_CIRCUIT)
Ein Heizkreis ist eine Gruppe von Räumen die über eine gemeinsame Pumpe/Mischventil versorgt werden.

```python
# Neues Konzept: Heizkreis-Konfiguration
CONF_CIRCUITS = "circuits"        # Liste aller Heizkreise
CONF_CIRCUIT_ID = "circuit_id"
CONF_CIRCUIT_NAME = "circuit_name"
CONF_CIRCUIT_PUMP = "circuit_pump"           # switch.heizkreis_pumpe
CONF_CIRCUIT_MIXER_ENTITY = "circuit_mixer"  # number.mischventil_position
CONF_CIRCUIT_FLOW_SENSOR = "circuit_flow"    # sensor.vorlauf_HK1
CONF_CIRCUIT_RETURN_SENSOR = "circuit_return" # sensor.rücklauf_HK1
CONF_CIRCUIT_TYPE = "circuit_type"           # "radiator" | "underfloor" | "mixed"
CONF_CIRCUIT_MAX_FLOW = "circuit_max_flow"   # max. Vorlauftemperatur °C
CONF_CIRCUIT_ROOMS = "circuit_rooms"         # Zimmer-IDs die zu diesem HK gehören
CONF_CIRCUIT_DESIGN_TEMP = "circuit_design"  # Auslegungstemperatur (Norm-AT)

# Vorlauftemperatur je Heizkreis (eigene Heizkurve pro Kreis)
circuit_comfort_base = heating_curve_hk.get_target_temp(outdoor_temp)
# FBH-Kreis läuft z.B. bei 35°C, Heizkörper-Kreis bei 60°C
```

#### Mischventil-Regelung
```python
# Mischventil: Vorlauftemperatur des Kreises regulieren
# Regelungsart: PID oder Zwei-Punkt mit Hysterese
# Aktuatoren: number.* entity für Ventil-Position (0-100%)

CONF_MIXER_KP = "mixer_kp"           # PID Proportional
CONF_MIXER_KI = "mixer_ki"           # PID Integral
CONF_MIXER_KD = "mixer_kd"           # PID Differential
CONF_MIXER_RUN_TIME = "mixer_runtime" # Motorlaufzeit Sekunden (typisch 60-120s)
```

#### Hydraulischer Abgleich (automatisch)
```python
# IHC lernt aus Rücklauftemperatur-Differenzen:
# Wenn Rücklauf >> Vorlauf − Delta_soll → Ventil öffnet zu schnell → Drosseln
# Speichert optimale kV-Werte pro Zimmer/Heizkreis

CONF_HYDRAULIC_BALANCE_ENABLED = "hydraulic_balance"  # bool
CONF_HYDRAULIC_DELTA_SOLL = "hydraulic_delta"         # °C Soll-Spreizung (typisch 10-15°C)
```

#### Wärmepumpe-Optimierung
```python
# WP läuft am effizientesten bei niedrigen Vorlauftemperaturen (besserer COP)
# IHC minimiert Vorlauftemperatur → WP-Effizienz steigt

CONF_HEATPUMP_ENTITY = "heatpump_entity"          # climate.wärmepumpe
CONF_HEATPUMP_COP_SENSOR = "heatpump_cop"         # sensor.wp_cop
CONF_HEATPUMP_MODE = "heatpump_mode"              # "flow_opt" | "room_prio"
CONF_HEATPUMP_MIN_FLOW = "heatpump_min_flow"      # min. Vorlauftemp. WP (z.B. 25°C)
CONF_HEATPUMP_BIVALENZ_TEMP = "bivalenz_temp"     # AT unter der Zusatz-Heizung startet
CONF_HEATPUMP_BIVALENZ_ENTITY = "bivalenz_entity" # switch.elektro_heizstab

# COP-geführte Optimierung:
# Wenn COP < threshold → WP nicht für Spitzenlast nutzen → Heizstab besser
```

#### Pufferspeicher-Management
```python
CONF_BUFFER_TEMP_TOP = "buffer_temp_top"     # sensor.puffer_oben
CONF_BUFFER_TEMP_MID = "buffer_temp_mid"     # sensor.puffer_mitte (optional)
CONF_BUFFER_TEMP_BOT = "buffer_temp_bot"     # sensor.puffer_unten
CONF_BUFFER_TARGET = "buffer_target"         # gewünschte Mindest-Puffertemperatur
CONF_BUFFER_HYSTERESIS = "buffer_hysteresis" # Puffer-Hysterese

# Logik:
# Wenn Puffer oben < buffer_target - hysteresis → Erzeuger einschalten
# Wenn Puffer oben > buffer_target + hysteresis → Erzeuger ausschalten
# Heizkreis-Pumpen laufen solange Puffer warm genug (oben > HK-Vorlauf-Soll)
```

#### Warmwasser-Priorisierung (TWW = Trinkwarmwasser)
```python
CONF_TWW_ENABLED = "tww_enabled"
CONF_TWW_SENSOR = "tww_sensor"               # sensor.boiler_temp
CONF_TWW_TARGET = "tww_target"               # Ziel-Warmwassertemperatur
CONF_TWW_HYSTERESIS = "tww_hysteresis"       # typisch 5°C
CONF_TWW_PRIORITY_ENTITY = "tww_priority"    # switch.tww_umschaltventil
CONF_TWW_SCHEDULE = "tww_schedule"           # Zeitpläne für TWW-Aufheizung

# Logik:
# Wenn TWW-Sensor < target - hysteresis → TWW-Priorisierung EIN
# Heizkreise werden für TWW-Dauer gestoppt (Pumpen aus)
# TWW-Umschaltventil auf "TWW" schalten
# Wenn TWW-Sensor > target → zurückschalten auf Heizkreis
```

#### KNX-Integration
```python
# KNX-Thermostate liefern Raum-Sollwert und Ist-Temperatur via KNX-Integration in HA
# IHC liest KNX-Thermostate als normale climate.*-Entitäten
# IHC überschreibt KNX-Thermostate NICHT (sie haben ihre eigene Logik)
# Stattdessen: KNX-Thermostat-Anforderung (Heizanforderung) als Input für IHC

CONF_KNX_ROOM_DEMAND_ENTITY = "knx_demand"   # binary_sensor.* oder number.* (0-100%)
# Wenn KNX-Thermostat Anforderung gibt → IHC öffnet Stellantrieb + regelt Kreis-Pumpe

# Stellantriebe (KNX-Ventile für FBH):
CONF_KNX_ACTUATOR_ENTITY = "knx_actuator"    # switch.* oder number.* (0-100%)
# IHC berechnet Ventilposition aus PID-Regelung und schreibt auf KNX-Gruppe
```

### 15.3 Neue Architektur-Dateien für 3.0

```
custom_components/intelligent_heating_control/
├── coordinator.py        → erweitert: Heizkreis-Logik, Puffer, TWW, WP
├── circuit_manager.py    → NEU: Heizkreis-Verwaltung + Mischventil-PID
├── buffer_manager.py     → NEU: Pufferspeicher-Logik
├── heatpump_optimizer.py → NEU: WP-COP-Optimierung + Bivalenz
├── tww_manager.py        → NEU: Trinkwarmwasser-Priorisierung
├── hydraulic_balance.py  → NEU: Automatischer hydraulischer Abgleich
└── frontend/
    └── ihc-panel.js      → erweitert: Heizkreis-Tab, Puffer-Dashboard, KNX-Konfig
```

### 15.4 Frontend-Erweiterungen für 3.0

Neue Tabs/Sektionen:
```
🔥 Wärmeerzeugung      → Erzeuger-Status, Pufferspeicher-Visualisierung, TWW
🔄 Heizkreise          → Übersicht aller HKs, Vorlauf/Rücklauf, Pumpen-Status
⚙️ Einstellungen       → neuer Bereich "Wärmeerzeuger" mit Heizkreis-Konfigurator
```

### 15.5 Neue Konstanten (3.0)

```python
# Betriebsmodus
CONTROLLER_MODE_HG = "hg"  # Heat Generator Mode

# System-Level
CONF_CIRCUITS = "circuits"
CONF_TWW_ENABLED = "tww_enabled"
CONF_TWW_SENSOR = "tww_sensor"
CONF_TWW_TARGET = "tww_target"
CONF_TWW_HYSTERESIS = "tww_hysteresis"
CONF_TWW_PRIORITY_ENTITY = "tww_priority_entity"
CONF_BUFFER_TEMP_TOP = "buffer_temp_top"
CONF_BUFFER_TEMP_MID = "buffer_temp_mid"
CONF_BUFFER_TEMP_BOT = "buffer_temp_bot"
CONF_BUFFER_TARGET = "buffer_target"
CONF_BUFFER_HYSTERESIS = "buffer_hysteresis"
CONF_HEATPUMP_ENTITY = "heatpump_entity"
CONF_HEATPUMP_COP_SENSOR = "heatpump_cop_sensor"
CONF_HEATPUMP_BIVALENZ_TEMP = "heatpump_bivalenz_temp"
CONF_HEATPUMP_BIVALENZ_ENTITY = "heatpump_bivalenz_entity"
CONF_HYDRAULIC_BALANCE_ENABLED = "hydraulic_balance_enabled"
CONF_HYDRAULIC_DELTA_SOLL = "hydraulic_delta_soll"

# Pro Heizkreis
CONF_CIRCUIT_ID = "circuit_id"
CONF_CIRCUIT_NAME = "circuit_name"
CONF_CIRCUIT_TYPE = "circuit_type"  # "radiator" | "underfloor" | "mixed"
CONF_CIRCUIT_PUMP = "circuit_pump"
CONF_CIRCUIT_MIXER_ENTITY = "circuit_mixer_entity"
CONF_CIRCUIT_FLOW_SENSOR = "circuit_flow_sensor"
CONF_CIRCUIT_RETURN_SENSOR = "circuit_return_sensor"
CONF_CIRCUIT_MAX_FLOW_TEMP = "circuit_max_flow_temp"
CONF_CIRCUIT_DESIGN_TEMP = "circuit_design_temp"
CONF_CIRCUIT_ROOMS = "circuit_rooms"
CONF_MIXER_KP = "mixer_kp"
CONF_MIXER_KI = "mixer_ki"
CONF_MIXER_KD = "mixer_kd"
CONF_MIXER_RUNTIME_SECONDS = "mixer_runtime_seconds"
```

### 15.6 Implementierungs-Prioritäten (3.0)

Reihenfolge für die Implementierung:

```
Phase 3.1 – Grundstruktur:
  [ ] CONTROLLER_MODE_HG in const.py + config_flow
  [ ] Heizkreis-Konfigurator (circuit_manager.py)
  [ ] Heizkreis-Pumpensteuerung (analog zu heating_switch)
  [ ] Pro-Heizkreis Vorlauftemperatur-Berechnung (Heizkurve pro Kreis)
  [ ] Frontend: Heizkreis-Tab im Einstellungen

Phase 3.2 – Mischventil & Flow:
  [ ] Mischventil-PID-Regelung (circuit_manager.py)
  [ ] Vorlauftemperatur-Messung + Regelkreis
  [ ] Rücklauftemperatur-Überwachung
  [ ] Frontend: Heizkreis-Dashboard mit Vorlauf/Rücklauf-Anzeige

Phase 3.3 – Pufferspeicher:
  [ ] buffer_manager.py
  [ ] Dreischicht-Temperaturüberwachung
  [ ] Erzeuger-Anforderung aus Puffer-Logik
  [ ] Frontend: Puffer-Visualisierung (Schichtung + Temperaturen)

Phase 3.4 – Warmwasser (TWW):
  [ ] tww_manager.py
  [ ] TWW-Priorisierung (Heizkreise stoppen)
  [ ] Zeitplan-geführte TWW-Aufheizung
  [ ] Frontend: TWW-Status + Zeitplan

Phase 3.5 – Wärmepumpe:
  [ ] heatpump_optimizer.py
  [ ] COP-Berechnung + -Überwachung
  [ ] Bivalenz-Punkt-Logik
  [ ] Vorlauftemperatur-Minimierung für WP-Effizienz
  [ ] Frontend: WP-Status + COP-Kurve

Phase 3.6 – Hydraulischer Abgleich:
  [ ] hydraulic_balance.py
  [ ] Rücklauftemperatur-basiertes Lernen
  [ ] Automatische kV-Wert-Optimierung
  [ ] Frontend: Abgleich-Assistent

Phase 3.7 – KNX-Integration:
  [ ] KNX-Thermostat-Anforderungslesung
  [ ] KNX-Stellantrieb-Steuerung
  [ ] Frontend: KNX-Konfigurations-Sektion
```

### 15.7 Wichtige Designentscheidungen für 3.0

**1. Rückwärtskompatibilität:**
- Bestehende Switch-Modus und TRV-Modus Konfigurationen dürfen NICHT brechen
- Wärmeerzeuger-Modus ist ein vollständig neuer Modus-Typ, keine Erweiterung von Switch
- Upgrade-Pfad: Switch-Modus → Wärmeerzeuger-Modus via Config-Flow-Migration

**2. Heizkreis-Hierarchie:**
```
Wärmeerzeuger (Kessel/WP/Pellet)
    └── Pufferspeicher (optional)
         ├── Heizkreis 1: Heizkörper (60°C, Mischventil)
         │    ├── Raum A (Stellantrieb / TRV)
         │    └── Raum B (Stellantrieb / TRV)
         ├── Heizkreis 2: Fußbodenheizung (35°C, Mischventil)
         │    ├── Raum C (Stellantrieb)
         │    └── Raum D (Stellantrieb)
         └── TWW-Kreis (Warmwasser, Priorität)
```

**3. Dual-Mode Räume:**
Ein Raum kann sowohl TRVs (Ventilsteuerung) als auch in einem Heizkreis sein (Pumpe/Mischventil).
In diesem Fall: IHC steuert BEIDE (TRV-Stellantrieb UND Heizkreis-Pumpe).

**4. Energiebilanz:**
Im Wärmeerzeuger-Modus: Erzeuger-Energie = gemessene kWh (Smart-Meter) oder COP × el. Energie.
Pro Heizkreis: Energie-Anteil = (Spreizung × Durchfluss × Laufzeit) / Gesamt.

---

## 11. Bekannte offene Punkte / Roadmap (aktualisiert)

### Implementiert (✅) – Release 1.3.0 (2026-03-22)
- **Pro-Zimmer HA-Geräte:** Jedes Zimmer erscheint als eigenes Gerät in HA
  - `device_info` mit `via_device` → Hub verlinkt alle Zimmer-Geräte
  - Betrifft: climate.py, sensor.py, binary_sensor.py
- **TRV-Batteriestatus:** `battery`/`battery_level` Attribut aus TRV-Entitäten
  - `trv_min_battery` + `trv_low_battery` in room_data + climate.extra_state_attributes
  - Dashboard: Chip (grün/orange/rot) + Alert-Leiste bei < 20%
  - Zimmer-Detail: Badge im Header
- **Temperaturverlauf-Chart:** Neuer Sub-Tab „📈 Verlauf" im Zimmer-Detail
  - SVG-Chart mit 7-Tage-History (stündlich), Ziellinie, Min/Max/Ø-Statistik
- **Manueller Override – Reset-Zeitpunkt:** Badge „↩ Reset HH:MM Uhr" in Dashboard + Zimmer-Detail
- **`sensor.ihc_<zimmer>_luftfeuchtigkeit`:** Neue Sensor-Entität (device_class: humidity)
  - Nur erstellt wenn `humidity_sensor` konfiguriert; Attribute: dew_point, mold_risk, threshold
- **Lüftungsempfehlung – Temperaturunterschied-Bug gefixt:**
  - Delta innen/außen aus Score-Berechnung entfernt (war Dauerwarnung in Heizperiode)
  - Skip-Condition: gibt None zurück wenn weder CO₂ noch Feuchte vorhanden
- **Lüftungsempfehlung – Ghost-Entitäten gefixt:**
  - `binary_sensor.*_lueftungsempfehlung` nur noch bei konfigurierten Sensoren

### Implementiert (✅) – Release 1.2.0 (2026-03-22)
- Zeitpläne und Kalender als Zimmer-Sub-Tabs
- TRV-Modus vollständig implementiert mit:
  - Ventilposition als primäres Anforderungssignal (60% Ventil + 40% Temperaturdelta)
  - Manuell-Override-Erkennung mit Auto-Reset bei Schedule-Wechsel
  - Heizungsschalter-Unterstützung für Hybrid-Setups (Kessel + TRVs)
  - Sommerautomatik schließt TRVs (sendet Frost-Temp statt Ziel-Temp)
  - Adaptive Heizkurve deaktiviert (irrelevant im TRV-Modus)
  - Demand-Korrektur: 0 wenn Raum-IST >= Soll + Totband
  - Display-Quantisierung auf 0.5°C (konsistent mit TRV-Sollwert)
- Switch-only Einstellungen (Hysterese, Vorlauf-PID) in TRV-Modus ausgeblendet
- Backup & Restore Layout repariert
- Services.yaml: alle Services vollständig dokumentiert
- strings.json + icon.png für HACS-Kompatibilität
- Vollständiges CLAUDE.md als Onboarding-Dokument
- Bugfixes (Gesamt 14 behoben)

### Geplant
- **3.0:** Wärmeerzeuger-Modus (Heizkreise, Puffer, WP, TWW, KNX) → siehe Kapitel 15
- **2.1:** Passive Solar Heating via Rollosteuerung → siehe Kapitel 13
- **1.4:** ETA-basierte Vorheizung (Backend bereits implementiert, UI ausstehend)
- **1.5:** PID Vorlauftemperaturregelung, Smart-Meter, Tibber-Forecast
