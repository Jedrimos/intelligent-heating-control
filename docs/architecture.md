# Technische Architektur

## Übersicht

IHC steuert **ausschließlich Thermostatventile (TRVs)** direkt. Es gibt keinen zentralen
Heizungsschalter, keine Vorlauftemperatur-Regelung und keine aktive Kühlung – jedes Zimmer
berechnet seine eigene Zieltemperatur und schreibt sie auf seine konfigurierten TRVs.

```
┌─────────────────────────────────────────────────────────────────────┐
│  Home Assistant                                                      │
│                                                                       │
│  ┌──────────────┐    ┌────────────────────────────────────────────┐ │
│  │ Config Entry  │    │  IHCCoordinator (Update-Zyklus 60s)         │ │
│  │ data/options  │───▶│  (Mixins: Presence/Window/TRV/RoomLogic/    │ │
│  └──────────────┘    │   Energy/Comfort/Vacation/ClimateAdjustments)│ │
│                       │  ┌─────────────┐  ┌───────────────────┐    │ │
│  ┌──────────────┐    │  │ HeatingCurve│  │ ScheduleManager[]  │    │ │
│  │  HA Services  │    │  └─────────────┘  └───────────────────┘    │ │
│  │ add_room etc. │───▶│  ┌─────────────────────────────────────┐   │ │
│  └──────────────┘    │  │ HeatingController (Anforderung 0-100%)│  │ │
│                       │  └─────────────────────────────────────┘   │ │
│                       └──────────────────┬──────────────────────────┘ │
│                                           │ coordinator.data           │
│  ┌───────────────────────────────────────▼──────────────────────┐    │
│  │  HA Entities (subscriben auf Coordinator)                     │    │
│  │  climate.ihc_*  sensor.ihc_*  binary_sensor.*  switch.*  …    │    │
│  └───────────────────────────────────────┬──────────────────────┘    │
│                                           │                           │
│  ┌────────────────────────────────────────▼─────────────────────┐    │
│  │  ihc-panel.js (Custom Panel Web Component)                    │    │
│  │  Liest: hass.states  Schreibt: hass.callService()             │    │
│  └────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Dateien und Verantwortlichkeiten

### `__init__.py` – Integration-Setup

- `async_setup_entry()`: Erstellt Coordinator, richtet Platforms ein, registriert Panel und Services
- `_register_services()`: Registriert alle 16 HA-Services mit ihren Handler-Funktionen
- `_async_register_panel()`: Registriert `/ihc_static` als Static-Path und das Custom Panel
- `_async_reload_entry()`: Update-Listener – lädt Integration neu wenn Options geändert werden

### `coordinator.py` – Haupt-Koordinator

**Klasse:** `IHCCoordinator(PresenceManagerMixin, WindowManagerMixin, TRVControllerMixin, RoomLogicMixin, EnergyManagerMixin, ComfortManagerMixin, VacationManagerMixin, ClimateAdjustmentsMixin, DataUpdateCoordinator)`
**Update-Intervall:** 60 Sekunden

Die Logik ist über Mixins auf mehrere Dateien verteilt (siehe unten); `coordinator.py` selbst
orchestriert den Update-Zyklus und implementiert alle Service-Handler-Aufrufe.

**Update-Zyklus (`_async_update_data`, vereinfacht):**

```
1. Startup-Gnadenfrist prüfen (Zigbee/Z-Wave-Sensoren brauchen Zeit nach HA-Neustart)
2. Boost-/Gäste-Modus-Timer auf Ablauf prüfen
3. Anwesenheit auswerten → ggf. Auto-Away (mit Verzögerung) aktivieren
4. Urlaubs-Assistent (Datumsbereich/Kalender) + Rückkehr-Vorheizung aktualisieren
5. Außentemperatur lesen (optional geglättet) → Heizkurven-Basis berechnen
6. Sommerautomatik, Kälteprognose-Frühstart, Heizperiode-Status auswerten
7. Fenster-Kaskade vorab berechnen (welche Nachbarräume gerade abgesenkt werden)
8. Für jedes Zimmer:
   a. Isttemperatur lesen (Raumsensor, TRV-Blend als Fallback)
   b. Fenster-Status prüfen (event-getrieben, kein Polling)
   c. Effektive Zieltemperatur berechnen (Prioritätskette, siehe advanced.md)
   d. Solar-Boost, Energiepreis-Eco, Nachtabsenkung, Wetter-Kälte-Boost anwenden
   e. Anforderung berechnen (HeatingController, TRV-Ventilposition eingerechnet)
   f. Solltemperatur an alle TRVs des Zimmers senden (quantisiert auf 0,5 °C)
   g. Optimum Start / Optimum Stop / Anforderungs-Heatmap / Abkühlrate aktualisieren
9. Laufzeit-/Energie-Tracking aktualisieren (TRV-Heizsignal, nicht die reine Anforderung)
10. Return: coordinator.data dict, aus dem alle Entities lesen
```

Es gibt **keinen** zentralen `should_heat`/`should_cool`-Schritt und keinen Heizungs-/Kühl-Switch
mehr – jedes Zimmer regelt unabhängig über seine eigenen TRVs.

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
| `set_room_boost(id, minutes)` / `cancel_room_boost(id)` | Boost aktivieren/abbrechen |
| `async_add_room(config)` / `async_remove_room(id)` / `async_update_room(id, updates)` | Zimmer-CRUD, triggert Rebuild |
| `async_update_global_settings(updates)` | Aktualisiert globale Einstellungen |

### Mixin-Dateien (von `coordinator.py` importiert und geerbt)

| Datei | Verantwortung |
|-------|--------------|
| `presence_manager.py` | Anwesenheitserkennung, Auto-Away mit Verzögerung, ETA-Vorheizen |
| `window_manager.py` | Event-getriebene Fenstererkennung, Fenster-Kaskade, Restore-Modus |
| `trv_controller.py` | TRV-Sollwert-Versand, Setpoint-Quantisierung, Override-Erkennung, Ventilpositions-Blending |
| `room_logic.py` | Zieltemperatur-Prioritätskette, Preset-Berechnung, Heatmap/Optimum-Start-Buchführung |
| `energy_manager.py` | Laufzeitmessung, kWh-Schätzung, Heizkurven-Logik-Aufruf |
| `comfort_manager.py` | Schimmelschutz, CO₂-Überwachung, Lüftungsempfehlung |
| `vacation_manager.py` | Urlaubs-Modus, Kalenderintegration, Gäste-Modus, Feiertagskalender |
| `climate_adjustments.py` | Solar-Boost, Energiepreis-Eco, Wetter-Kälte-Boost |

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

### `heating_controller.py` – Anforderungs-Engine

**Klasse:** `HeatingController`

Berechnet und aggregiert die 0–100 %-Heizanforderung jedes Zimmers – es gibt **keinen**
zentralen Ein-/Ausschalt-Aktor mehr, `HeatingController` ist ein reines Diagnose-/Dashboard-Signal
(siehe [Anforderungsberechnung](advanced.md#anforderungsberechnung-pro-zimmer)):

```python
ctrl = HeatingController()

ctrl.update_room("room_id", current_temp=19.5, target_temp=21,
                  deadband=0.5, window_open=False, room_mode="auto")

total = ctrl.get_total_demand()        # → 0-100%, einfacher Durchschnitt aktiver Zimmer
demanding = ctrl.get_rooms_demanding() # → Anzahl Zimmer mit Anforderung > 0
```

### `trv_controller.py` – TRV-Steuerung

Details siehe [Kapitel „TRV-Steuerung"](#trv-steuerung) unten.

### `climate.py` – Climate-Platform

Eine `IHCRoomClimate`-Entität pro Zimmer plus eine globale Hub-Entität.

- Liest alle Werte aus `coordinator.data["rooms"][room_id]`
- Schreibt über `coordinator.set_room_mode()`, `coordinator.set_room_manual_temp()`,
  `coordinator.set_room_boost()`
- `hvac_action` liefert nur `heating`/`idle`/`off` – kein `cooling` (TRVs können nicht aktiv kühlen)
- Exposes in `extra_state_attributes`: die komplette Raumkonfiguration und alle Laufzeitdaten
  für das Frontend-Panel (siehe [entities.md](entities.md))

### `sensor.py` – Sensor-Platform

12 Sensor-Klassen, u. a.:
- `IHCRoomDemandSensor` / `IHCRoomTargetTempSensor` / `IHCRoomRuntimeSensor` / `IHCRoomHumiditySensor` / `IHCRoomFeltTempSensor` – pro Zimmer
- `IHCTotalDemandSensor` – Gesamtanforderung mit umfangreichen globalen Status-Attributen
- `IHCOutdoorTempSensor`, `IHCCurveTargetSensor` – Außentemperatur-Spiegel bzw. Heizkurven-Basiswert
- `IHCHeatingRuntimeSensor` / `IHCHeatingRuntimeYesterdaySensor`, `IHCEnergyTodaySensor` / `IHCEnergyYesterdaySensor`

### `binary_sensor.py` – Binary-Sensor-Platform

Pro Zimmer (jeweils nur erstellt wenn die zugehörigen Sensoren/TRVs konfiguriert sind):
- `IHCVentilationAdviceSensor` – Lüftungsempfehlung
- `IHCCO2WarningSensor` – CO₂-Warnung
- `IHCStuckValveSensor` – Stuck-Valve-Erkennung (verkalktes/blockiertes TRV)

---

## TRV-Steuerung

### Warum Ventilposition statt reinem Raumsensor?

| Signal | Reaktionszeit | Verfügbarkeit |
|--------|--------------|---------------|
| Raumsensor (Luft) | 15–30 min | optional |
| TRV `current_temperature` | 5–15 min | wenn TRV vorhanden |
| TRV Ventilposition | sofort | wenn TRV unterstützt |

Die Ventilposition ist das schnellste Anforderungssignal, weil der TRV-interne Controller
bereits selbst regelt und sein Ergebnis (Ventil auf/zu) direkt zurückmeldet.

### Attribut-Namen für Ventilposition (verschiedene TRV-Hersteller)

```python
vp = attrs.get("valve_position") or attrs.get("position") or attrs.get("pi_heating_demand")
```
- Zigbee2MQTT-TRVs: `valve_position` (0–100)
- Z-Wave-TRVs: `position` (0–100)
- Eurotronic/Spirit: `pi_heating_demand` (0–100)

### Blending-Logik

```
demand = temp_demand × 0.40 + valve_position × 0.60
```

Wird immer angewendet – es gibt kein Modus-Flag mehr, TRV-Steuerung ist der einzige Modus.

### Temperatur-Blending

```
trv_temp_weight = 0 (Standard):  Raumsensor primär, TRV-Temp nur Fallback wenn kein Raumsensor
trv_temp_weight > 0:             Blended = Raum × (1-w) + (TRV-Ø + trv_temp_offset) × w
trv_temp_offset (Standard 0):    Kalibrierung – TRV sitzt am Heizkörper, oft wärmer als der Raum
```

### Setpoint-Quantisierung & Override-Erkennung

- Sollwerte werden auf 0,5 °C-Schritte gerundet (`TRV_SETPOINT_STEP`) – weniger Funk-Traffic, längere Akkulaufzeit
- Bestätigungs-basiert: `_trv_cmd_pending[entity_id]` verfolgt gesendete Sollwerte; ein manueller
  Eingriff wird erst erkannt, wenn der TRV einen abweichenden Wert zurückmeldet (oder nach 600 s
  Timeout) – verhindert falsches „manuell" direkt nach einem Zeitplanwechsel

### Laufzeitmessung

„Heizt gerade" ist rein TRV-signalbasiert (gleiche Priorität wie `hvac_action`):
Ventilposition > 8 % → TRV meldet `hvac_action == "heating"` → berechnete Anforderung > 0 →
Fallback: Raumtemp < Zieltemp. Wird global (`heating_active`) und pro Zimmer
(`runtime_today_minutes`) verwendet.

### Wo TRV-Daten landen

Nach `_async_update_data()` enthält jedes room_data-Entry u. a.:

```python
"trv_raw_temp":     float | None   # Rohtemperatur vom TRV (ohne Offset)
"trv_avg_valve":    float | None   # Ventilöffnung 0-100 %
"trv_any_heating":  bool           # True wenn hvac_action == "heating" bei irgendeinem TRV
"trv_min_battery":  int | None     # Niedrigster Akkustand aller TRVs
"trv_stuck_valves": list           # Entity-IDs verdächtiger (verklemmter) TRVs
```

---

## Konfigurationsspeicherung

### Struktur im Config Entry

```python
config_entry.data = {
    # Initiale Setup-Daten (Wizard-Schritt 1-2)
    "outdoor_temp_sensor": "sensor.aussentemperatur",
    "away_temp": 16.0,
    "vacation_temp": 14.0,
}

config_entry.options = {
    # Alle änderbaren Einstellungen
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
    ],
    "groups": [
        {"group_id": "grp001", "group_name": "Obergeschoss", "group_rooms": ["abc12345"]}
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
**Statische Dateien:** Served über `/ihc_static/ihc-panel.js` (mit `?v=<version>` Cache-Busting)

### Datenfluss

```
Home Assistant
    ↓ (HA State-Push)
IHCPanel.set hass(hass)
    ↓
this._hass = hass (gespeichert)
    ↓ (nur wenn nicht initialized)
this._render() → DOM aufgebaut

Alle 5s (Dashboard- und Diagnose-Tab):
    ↓
this._renderTabContent()
    ↓
this._getRoomData()    → liest climate.ihc_* Entities
this._getGlobal()      → liest sensor.ihc_gesamtanforderung
    ↓
HTML-String → content.innerHTML
    ↓
Event-Listener auf neue DOM-Elemente binden
```

Alle anderen Tabs (Zimmer, Analyse, Einstellungen, Heizkurve) rendern nur beim Tab-Wechsel, nicht
im 5-Sekunden-Takt – siehe [Frontend Panel](frontend-panel.md#technische-details).

### Warum kein Framework (React/Vue)?

- Keine Build-Pipeline nötig → direktes Deployment (nur `frontend/build.py` konkateniert `src/`)
- Keine externen Abhängigkeiten → offline-fähig
- Geringere Dateigröße
- Vollständige Kontrolle über DOM-Updates (verhindert unerwünschte Re-Renders während Klicks)

### Shadow DOM

Das Panel nutzt Shadow DOM (`attachShadow({mode: "open"})`):
- CSS ist vom Rest von HA isoliert (keine Konflikte)
- Styles werden als `<style>`-Tag in den Shadow Root eingefügt
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
_rebuild_from_config() → neue ScheduleManager-Instanz für das Zimmer
await async_request_refresh()
    ↓
_async_update_data() läuft → neues Zimmer wird verarbeitet
    ↓
Update-Listener: async_reload_entry()
    ↓
Alle Platforms werden neu eingerichtet:
  climate.py: neue IHCRoomClimate Entity (+ eigenes HA-Gerät via `via_device`)
  sensor.py: neue Demand/Target/Runtime/Humidity/FeltTemp-Sensoren
  binary_sensor.py: Lüftung/CO₂/Ventil-Fehler-Sensoren (falls konfiguriert)
  number.py: neuer Offset-Number
  select.py: neuer Modus-Select
    ↓
HA pusht neue Entities → Frontend sieht climate.ihc_neues_zimmer
```
