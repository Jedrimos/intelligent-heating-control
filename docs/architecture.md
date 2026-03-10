# Technische Architektur

## Übersicht

```
┌─────────────────────────────────────────────────────────────────┐
│  Home Assistant                                                  │
│                                                                  │
│  ┌──────────────┐    ┌──────────────────────────────────────┐   │
│  │ Config Entry  │    │  IHCCoordinator (Update-Zyklus 60s)  │   │
│  │ data/options  │───▶│                                      │   │
│  └──────────────┘    │  ┌─────────────┐  ┌──────────────┐  │   │
│                       │  │ HeatingCurve│  │ScheduleMgr[] │  │   │
│  ┌──────────────┐    │  └─────────────┘  └──────────────┘  │   │
│  │  HA Services  │    │  ┌──────────────────────────────┐   │   │
│  │ add_room etc. │───▶│  │ HeatingController (Klimabau.) │   │   │
│  └──────────────┘    │  └──────────────────────────────┘   │   │
│                       └──────────────┬───────────────────────┘   │
│                                      │ coordinator.data          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  HA Entities (subscriben auf Coordinator)               │    │
│  │  climate.ihc_*  sensor.ihc_*  switch.*  number.*  select.* │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                      │                           │
│  ┌──────────────────────────────────▼──────────────────────┐    │
│  │  ihc-panel.js (Custom Panel Web Component)              │    │
│  │  Liest: hass.states  Schreibt: hass.callService()       │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Dateien und Verantwortlichkeiten

### `__init__.py` – Integration-Setup

- `async_setup_entry()`: Erstellt Coordinator, richtet Platforms ein, registriert Panel und Services
- `_register_services()`: Registriert alle HA-Services mit ihren Handler-Funktionen
- `_async_register_panel()`: Registriert `/ihc_static` als Static-Path und das Custom Panel
- `_async_reload_entry()`: Update-Listener – lädt Integration neu wenn Options geändert werden

### `coordinator.py` – Haupt-Koordinator

**Klasse:** `IHCCoordinator(DataUpdateCoordinator)`
**Update-Intervall:** 60 Sekunden

**Update-Zyklus (`_async_update_data`):**

```
1. Anwesenheit prüfen → ggf. Auto-Away aktivieren
2. Außentemperatur lesen
3. Heizkurven-Basis berechnen
4. Sommerautomatik prüfen
5. Für jedes Zimmer:
   a. Isttemperatur lesen
   b. Fenster-Status prüfen
   c. Effektive Zieltemperatur berechnen (Prioritätskette)
   d. Solar-Boost und Energiepreis-Eco anwenden
   e. Nachtabsenkung anwenden
   f. Anforderung berechnen (via HeatingController)
   g. Solltemperatur an alle TRVs senden
6. Klimabaustein-Entscheidung (should_heat, should_cool)
7. Heizungs-/Kühl-Switch steuern
8. Laufzeit-Tracking aktualisieren
9. Return: coordinator.data dict mit allen Werten
```

**Wichtige Methoden:**

| Methode | Beschreibung |
|---------|-------------|
| `_rebuild_from_config()` | Baut HeatingCurve, ScheduleManagers, HeatingController neu aus Config |
| `get_config()` | Merged `config_entry.data` + `config_entry.options` |
| `get_rooms()` | Gibt Liste aller Zimmer-Configs zurück |
| `get_room_config(id)` | Gibt Config eines bestimmten Zimmers zurück |
| `get_room_mode(id)` | Aktueller Zimmermodus (aus `_room_modes` dict) |
| `set_room_mode(id, mode)` | Setzt Zimmermodus und triggert Refresh |
| `set_room_manual_temp(id, temp)` | Setzt manuelle Temperatur |
| `set_room_boost(id, minutes)` | Aktiviert Boost |
| `cancel_room_boost(id)` | Deaktiviert Boost |
| `async_add_room(config)` | Fügt Zimmer zur Config hinzu, triggert Rebuild |
| `async_remove_room(id)` | Entfernt Zimmer aus Config |
| `async_update_room(id, updates)` | Aktualisiert Zimmer-Config |
| `async_update_global_settings(updates)` | Aktualisiert globale Einstellungen |

### `heating_curve.py` – Heizkurven-Logik

**Klasse:** `HeatingCurve`

```python
curve = HeatingCurve([
    {"outdoor_temp": -20, "target_temp": 24},
    {"outdoor_temp":  25, "target_temp": 16},
])

temp = curve.get_target_temp(-5.0)  # → ~22.6°C (linear interpoliert)
```

Funktionen:
- Sortiert Punkte nach Außentemperatur
- Lineare Interpolation zwischen benachbarten Punkten
- Clipping außerhalb des Bereichs (erster/letzter Wert)

### `schedule_manager.py` – Zeitplan-Verwaltung

**Klasse:** `ScheduleManager`

```python
manager = ScheduleManager(room_schedules)
active = manager.get_active_period()     # → {temperature, offset} oder None
upcoming = manager.get_upcoming_period(preheat_minutes=30)  # → nächster Zeitraum
```

Unterstützt:
- Übernacht-Zeiträume (end < start)
- Mehrere Tagesgruppen pro Zimmer
- Vorschau für Pre-Heat

### `heating_controller.py` – Klimabaustein

**Klasse:** `HeatingController`

```python
ctrl = HeatingController(
    demand_threshold=15, demand_hysteresis=5,
    min_on_time=5, min_off_time=5, min_rooms_demand=1
)

ctrl.update_room("room_id", current_temp=19.5, target_temp=21,
                 deadband=0.5, weight=1.0, window_open=False, room_mode="auto")

total = ctrl.get_total_demand()    # → 0-100%
heat = ctrl.should_heat("auto")    # → bool
```

### `climate.py` – Climate-Platform

Eine `IHCRoomClimate` Entität pro Zimmer.

- Liest alle Werte aus `coordinator.data["rooms"][room_id]`
- Schreibt über `coordinator.set_room_mode()` und `coordinator.set_room_manual_temp()`
- Exposes in `extra_state_attributes`: alle Raumkonfiguration für das Frontend Panel

### `sensor.py` – Sensor-Platform

Mehrere Sensor-Typen:
- `IHCRoomDemandSensor` – Anforderung pro Zimmer
- `IHCRoomTargetTempSensor` – Zieltemperatur pro Zimmer
- `IHCRoomRuntimeSensor` – Laufzeit pro Zimmer
- `IHCTotalDemandSensor` – Gesamtanforderung mit allen Klimabaustein-Attributen
- `IHCOutdoorTempSensor` – Außentemperatur-Spiegel
- `IHCCurveTargetSensor` – Heizkurven-Basiswert + `curve_points` Attribut
- `IHCHeatingRuntimeSensor` – Gesamte Heizlaufzeit heute
- `IHCEnergyTodaySensor` – Energie-Schätzung heute

---

## Konfigurationsspeicherung

### Struktur im Config Entry

```python
config_entry.data = {
    # Initiale Setup-Daten (Schritt 1-3)
    "outdoor_temp_sensor": "sensor.aussentemperatur",
    "heating_switch": "switch.heizkessel",
}

config_entry.options = {
    # Alle änderbaren Einstellungen
    "demand_threshold": 15.0,
    "demand_hysteresis": 5.0,
    "away_temp": 16.0,
    "heating_curve": {
        "points": [
            {"outdoor_temp": -20, "target_temp": 24},
            ...
        ]
    },
    "rooms": [
        {
            "id": "abc12345",
            "name": "Wohnzimmer",
            "temp_sensor": "sensor.wohnzimmer_temp",
            "valve_entities": ["climate.wohnzimmer_trv"],
            "window_sensors": [],
            "comfort_temp": 21.0,
            ...
            "schedules": [...]
        }
    ]
}
```

### Speicher-Ablauf beim Frontend-Save

```
User klickt "Speichern" im Panel
    ↓
hass.callService("intelligent_heating_control", "update_global_settings", {...})
    ↓
handle_update_global_settings() in __init__.py
    ↓
coordinator.async_update_global_settings(updates)
    ↓
new_options = dict(config_entry.options)
new_options.update(updates)
hass.config_entries.async_update_entry(entry, options=new_options)
    ↓
_async_reload_entry() (via update_listener)
    ↓
HA lädt Integration neu → alle Entities neu erstellt
    ↓
Neue Sensor-Attribute reflektieren gespeicherte Werte
```

---

## Frontend Panel – Technische Details

**Typ:** Vanilla JavaScript Web Component (kein Framework)
**Registrierung:** `customElements.define("ihc-panel", IHCPanel)`
**HA-Integration:** Panel wird via `frontend.async_register_built_in_panel()` registriert
**Statische Dateien:** Served über `/ihc_static/ihc-panel.js`

### Datenfluss

```
Home Assistant
    ↓ (HA State-Push)
IHCPanel.set hass(hass)
    ↓
this._hass = hass (gespeichert)
    ↓ (nur wenn nicht initialized)
this._render() → DOM aufgebaut

Alle 5s (Übersicht-Tab):
    ↓
this._renderOverview(content)
    ↓
this._getRoomData()    → liest climate.ihc_* Entities
this._getGlobal()      → liest sensor.ihc_* Entities
    ↓
HTML-String → content.innerHTML
    ↓
Event-Listener auf neue DOM-Elemente binden
```

### Warum kein Framework (React/Vue)?

- Keine Build-Pipeline nötig → direktes Deployment
- Keine externen Abhängigkeiten → offline-fähig
- Geringere Dateigröße
- Vollständige Kontrolle über DOM-Updates (verhindert unerwünschte Re-Renders)

### Shadow DOM

Das Panel nutzt Shadow DOM (`attachShadow({mode: "open"})`):
- CSS ist vom Rest von HA isoliert (keine Konflikte)
- Styles werden als `<style>` Tag in den Shadow Root eingefügt
- HA-CSS-Variablen (`--primary-color` etc.) sind trotzdem zugänglich (Cascading durch Shadow DOM)

---

## Datenfluss: Neue Zimmer

```
Frontend: "Zimmer hinzufügen" bestätigen
    ↓
hass.callService("add_room", {name, temp_sensor, valve_entities, ...})
    ↓
coordinator.async_add_room(room_config)
    ↓
room_id = uuid.uuid4().hex[:8]
new_options["rooms"].append(room_config)
hass.config_entries.async_update_entry(entry, options=new_options)
    ↓
_rebuild_from_config() → neue ScheduleManager Instanz für das Zimmer
await async_request_refresh()
    ↓
_async_update_data() läuft → neues Zimmer wird verarbeitet
    ↓
Update-Listener: async_reload_entry()
    ↓
Alle Platforms werden neu eingerichtet:
  climate.py: neue IHCRoomClimate Entity
  sensor.py: neue Demand/Target/Runtime Sensoren
  number.py: neuer Offset-Number
  select.py: neuer Modus-Select
    ↓
HA pusht neue Entities → Frontend sieht climate.ihc_neues_zimmer
```
