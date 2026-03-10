# Entitäten

IHC erstellt beim Start automatisch alle Entitäten basierend auf der Konfiguration. Alle Entitäten sind mit der IHC-Integration verknüpft und werden beim Entfernen der Integration gelöscht.

---

## Pro Zimmer

Für jedes konfigurierte Zimmer werden folgende Entitäten erstellt (Beispiel: Zimmer „Wohnzimmer"):

### `climate.ihc_wohnzimmer`

Die Hauptentität des Zimmers. Kompatibel mit allen HA-Features die `climate.*` Entitäten unterstützen (Lovelace-Cards, Google Home, Alexa, etc.).

| Attribut | Typ | Beschreibung |
|----------|-----|-------------|
| `current_temperature` | float | Aktuelle Zimmertemperatur (vom konfigurierten Sensor) |
| `temperature` | float | Aktuelle Solltemperatur |
| `hvac_mode` | string | `heat` oder `off` |
| `hvac_action` | string | `heating`, `idle`, `off`, `cooling` |
| `preset_mode` | string | `Auto`, `Comfort`, `Eco`, `Sleep`, `Away`, `Manual` |
| `room_id` | string | Interne UUID des Zimmers |
| `room_mode` | string | `auto`, `comfort`, `eco`, `sleep`, `away`, `off`, `manual` |
| `demand` | float | Aktuelle Heizanforderung 0–100 % |
| `window_open` | bool | Ist ein Fenster offen? |
| `schedule_active` | bool | Ist gerade ein Zeitplan aktiv? |
| `source` | string | Quelle der aktuellen Zieltemperatur |
| `boost_remaining` | int | Verbleibende Boost-Minuten (0 = kein Boost) |
| `night_setback` | float | Aktuell aktive Nachtabsenkung in °C |
| `runtime_today_minutes` | float | Heizlaufzeit heute in Minuten |
| `temp_sensor` | string | Entity-ID des konfigurierten Temperatursensors |
| `valve_entities` | list | Liste der konfigurierten TRV/Thermostat-Entity-IDs |
| `window_sensors` | list | Liste der konfigurierten Fenstersensor-Entity-IDs |
| `comfort_temp` | float | Konfigurierter Komfort-Preset |
| `eco_temp` | float | Konfigurierter Eco-Preset |
| `sleep_temp` | float | Konfigurierter Schlaf-Preset |
| `away_temp_room` | float | Konfigurierter Abwesend-Preset |
| `room_offset` | float | Konfigurierter Zimmer-Offset |
| `deadband` | float | Konfiguriertes Totband |
| `weight` | float | Konfigurierte Klimabaustein-Gewichtung |
| `schedules` | list | Alle konfigurierten Zeitpläne als Liste |

**Mögliche `source`-Werte:**

| Wert | Beschreibung |
|------|-------------|
| `heating_curve` | Heizkurve + Zimmer-Offset |
| `schedule` | Aktiver Zeitplan |
| `preheat` | Vorheizen vor Zeitplan |
| `comfort` | Komfort-Preset |
| `eco` | Eco-Preset |
| `sleep` | Schlaf-Preset |
| `room_away` | Zimmer-Abwesend-Preset |
| `manual` | Manuell gesetzte Temperatur |
| `system_away` | System-Abwesend-Modus |
| `system_vacation` | Urlaubs-Modus |
| `room_off` | Zimmer-AUS-Modus |
| `frost_protection` | Frostschutz aktiv |

---

### `sensor.ihc_wohnzimmer_anforderung`

Heizanforderung des Zimmers in Prozent (0–100).

| Attribut | Typ | Beschreibung |
|----------|-----|-------------|
| `current_temp` | float | Aktuelle Zimmertemperatur |
| `target_temp` | float | Solltemperatur |
| `room_mode` | string | Zimmermodus |
| `window_open` | bool | Fensterstatus |
| `source` | string | Quelle der Zieltemperatur |
| `night_setback` | float | Aktive Nachtabsenkung |
| `temp_history` | list | Letzte N Temperaturwerte `[{t: timestamp, v: value}, ...]` |
| `avg_warmup_minutes` | float | Durchschnittliche Aufheizzeit in Minuten |

---

### `sensor.ihc_wohnzimmer_zieltemperatur`

Berechnete Solltemperatur des Zimmers.

**Geräteklasse:** `temperature` (°C)

---

### `sensor.ihc_wohnzimmer_laufzeit_heute`

Heizlaufzeit des Zimmers heute in Minuten (zurückgesetzt um Mitternacht).

**Geräteklasse:** `duration` (min)

---

### `number.ihc_wohnzimmer_offset`

Zimmer-Offset zur Heizkurven-Basistemperatur. Kann zur Laufzeit ohne HA-Neustart geändert werden.

| Eigenschaft | Wert |
|-------------|------|
| Min | -5 °C |
| Max | +5 °C |
| Schritt | 0,5 °C |

---

### `select.ihc_wohnzimmer_modus`

Direktes Umschalten des Zimmermodus.

**Optionen:** `auto`, `comfort`, `eco`, `sleep`, `away`, `off`, `manual`

---

## Global

### `sensor.ihc_gesamtanforderung`

Gewichtete Gesamtanforderung aller Zimmer in Prozent. Enthält alle Klimabaustein-Parameter als Attribute.

| Attribut | Typ | Beschreibung |
|----------|-----|-------------|
| `heating_active` | bool | Ist die Heizung aktuell aktiv? |
| `total_demand` | float | Gesamtanforderung 0–100 % |
| `rooms_demanding` | int | Anzahl Zimmer mit Anforderung > 0 |
| `demand_threshold` | float | Konfigurierte Einschaltschwelle |
| `demand_hysteresis` | float | Konfigurierte Hysterese |
| `min_on_time_minutes` | int | Mindest-Einschaltzeit |
| `min_off_time_minutes` | int | Mindest-Ausschaltzeit |
| `min_rooms_demand` | int | Mindestanzahl Zimmer |
| `away_temp` | float | Globale Abwesend-Temperatur |
| `vacation_temp` | float | Globale Urlaubs-Temperatur |
| `frost_protection_temp` | float | Frostschutz-Temperatur |
| `summer_mode_enabled` | bool | Sommerautomatik aktiv? |
| `summer_threshold` | float | Sommerautomatik-Schwelle in °C |
| `night_setback_enabled` | bool | Nachtabsenkung aktiviert? |
| `night_setback_offset` | float | Nachtabsenkungs-Offset in °C |
| `preheat_minutes` | int | Vorheiz-Vorlaufzeit in Minuten |
| `presence_entities` | list | Konfigurierte Anwesenheits-Entities |
| `boiler_kw` | float | Konfigurierte Kesselleistung in kW |
| `solar_entity` | string | Konfigurierter Solar-Sensor |
| `solar_surplus_threshold` | float | Solar-Überschuss-Schwelle in W |
| `energy_price_entity` | string | Konfigurierter Strompreis-Sensor |
| `summer_mode` | bool | Ist Sommerautomatik aktuell aktiv? |
| `night_setback_active` | bool | Ist Nachtabsenkung aktuell aktiv? |
| `presence_away_active` | bool | Ist Anwesenheits-Abwesend aktuell aktiv? |
| `heating_runtime_today` | float | Gesamte Heizlaufzeit heute in Minuten |

---

### `sensor.ihc_aussentemperatur`

Spiegelt den konfigurierten Außentemperatursensor. Wird von IHC intern gelesen und als eigene Entity bereitgestellt.

**Geräteklasse:** `temperature` (°C)

---

### `sensor.ihc_heizkurven_zieltemperatur`

Aktueller Heizkurven-Basiswert (vor Zimmer-Offset) basierend auf der aktuellen Außentemperatur.

**Geräteklasse:** `temperature` (°C)

| Attribut | Typ | Beschreibung |
|----------|-----|-------------|
| `curve_points` | list | Alle konfigurierten Heizkurven-Punkte `[{outdoor_temp, target_temp}, ...]` |

---

### `sensor.ihc_heizlaufzeit_heute`

Gesamte Heizlaufzeit heute in Minuten (zurückgesetzt um Mitternacht).

---

### `sensor.ihc_energie_heute`

Geschätzter Energieverbrauch heute in kWh. Berechnet als `Heizlaufzeit [h] × Kesselleistung [kW]`.

| Attribut | Typ | Beschreibung |
|----------|-----|-------------|
| `solar_boost` | float | Aktueller Solar-Boost in °C (0 = kein Boost) |
| `solar_power` | float | Aktuelle Solarleistung in W (wenn konfiguriert) |
| `energy_price` | float | Aktueller Strompreis in €/kWh (wenn konfiguriert) |
| `energy_price_eco_active` | bool | Ist der Strompreis-Eco-Modus aktiv? |
| `flow_temp` | float | Aktuelle Vorlauftemperatur in °C (wenn konfiguriert) |

---

### `switch.ihc_heizung_aktiv`

Zeigt den aktuellen Heizungsstatus. Kann auch manuell ein-/ausgeschaltet werden (überschreibt vorübergehend die automatische Steuerung).

---

### `select.ihc_systemmodus`

Direktes Umschalten des Systemmodus.

**Optionen:** `auto`, `heat`, `cool`, `off`, `away`, `vacation`

---

## Entitäten in Lovelace verwenden

### Einfache Raumkarte

```yaml
type: thermostat
entity: climate.ihc_wohnzimmer
```

### Anforderungs-Gauge

```yaml
type: gauge
entity: sensor.ihc_gesamtanforderung
name: Heizanforderung
min: 0
max: 100
segments:
  - from: 0
    color: "#4CAF50"
  - from: 15
    color: "#FF9800"
  - from: 60
    color: "#F44336"
```

### Mini-Übersicht aller Zimmer

```yaml
type: entities
title: Heizung
entities:
  - entity: select.ihc_systemmodus
    name: System-Modus
  - entity: sensor.ihc_gesamtanforderung
    name: Gesamtanforderung
  - entity: switch.ihc_heizung_aktiv
    name: Heizung aktiv
  - entity: climate.ihc_wohnzimmer
  - entity: climate.ihc_schlafzimmer
  - entity: climate.ihc_kinderzimmer
```
