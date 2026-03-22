# Entitäten

IHC erstellt beim Start automatisch alle Entitäten basierend auf der Konfiguration. Alle Entitäten sind mit der IHC-Integration verknüpft und werden beim Entfernen der Integration gelöscht.

> **Geräte-Struktur (ab v1.3.0):** Jedes Zimmer erscheint als eigenes HA-Gerät unterhalb des zentralen Hub-Geräts „Intelligent Heating Control". Alle zimmer-spezifischen Entitäten sind dem jeweiligen Zimmer-Gerät zugeordnet.

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
| `comfort_temp` | float | Fallback-Komforttemperatur (wenn kein Außensensor) |
| `eco_offset` | float | Eco-Abzug von der Komforttemperatur in °C |
| `eco_max_temp` | float | Maximale Eco-Temperatur (Deckelung) |
| `sleep_offset` | float | Schlaf-Abzug von der Komforttemperatur in °C |
| `sleep_max_temp` | float | Maximale Schlaf-Temperatur (Deckelung) |
| `away_offset` | float | Abwesend-Abzug von der Komforttemperatur in °C |
| `away_max_temp` | float | Maximale Abwesend-Temperatur (Deckelung) |
| `ha_schedule_off_mode` | string | Fallback-Modus bei inaktivem HA-Zeitplan (`eco` / `sleep`) |
| `comfort_temp_eff` | float | Berechnete effektive Komforttemperatur (aktuell) |
| `eco_temp_eff` | float | Berechnete effektive Eco-Temperatur (aktuell) |
| `sleep_temp_eff` | float | Berechnete effektive Schlaf-Temperatur (aktuell) |
| `away_temp_eff` | float | Berechnete effektive Abwesend-Temperatur (aktuell) |
| `room_offset` | float | Konfigurierter Zimmer-Offset |
| `deadband` | float | Konfiguriertes Totband |
| `weight` | float | Konfigurierte Klimabaustein-Gewichtung |
| `schedules` | list | Alle konfigurierten internen Zeitpläne als Liste |
| `ha_schedules` | list | Alle konfigurierten HA schedule.* Bindungen |
| `humidity_sensor` | string | Entity-ID des konfigurierten Luftfeuchtigkeit-Sensors |
| `mold_protection_enabled` | bool | Schimmelschutz aktiviert? |
| `mold` | dict | Schimmelschutz-Status: `{risk, dew_point, humidity}` |
| `room_presence_active` | bool | Zimmer-spezifische Anwesenheit (wenn konfiguriert) |
| `trv_raw_temp` | float | Unkorrigierte TRV-Durchschnittstemperatur (am Heizkörper) |
| `trv_humidity` | float | TRV-Luftfeuchtigkeit (falls TRV dieses Attribut meldet) |
| `trv_avg_valve` | float | Durchschnittliche Ventilöffnung aller TRVs (0–100 %) |
| `trv_any_heating` | bool | Mindestens ein TRV meldet `hvac_action: heating` |
| `trv_min_battery` | int | Niedrigster Akkustand aller konfigurierten TRVs (%) |
| `trv_low_battery` | bool | `true` wenn ein TRV unter 20 % Akkustand hat |
| `temp_history` | list | Stündliche Temperatur-Snapshots (max. 168 Einträge / 7 Tage) |
| `avg_warmup_minutes` | float | Lernbasierte Ø-Aufheizzeit (für adaptives Vorheizen) |
| `anomaly` | string | Sensor-Anomalie: `sensor_stuck`, `temp_drop` oder `null` |
| `next_period` | dict | Nächster Zeitplan-Eintrag `{start, end, mode, temperature}` |

**Mögliche `source`-Werte:**

| Wert | Beschreibung |
|------|-------------|
| `heating_curve` | Heizkurve + Zimmer-Offset (Auto-Modus, kein Zeitplan) |
| `schedule` | Aktiver interner Zeitplan |
| `preheat` | Vorheizen vor internem Zeitplan |
| `ha_schedule_comfort` | Aktiver HA-Zeitplan (Komfort-Modus) |
| `ha_schedule_eco` | Aktiver HA-Zeitplan (Eco-Modus) |
| `ha_schedule_sleep` | Aktiver HA-Zeitplan (Schlaf-Modus) |
| `ha_schedule_away` | Aktiver HA-Zeitplan (Abwesend-Modus) |
| `ha_schedule_eco` | Fallback bei inaktivem HA-Zeitplan (eco-Modus) |
| `ha_schedule_sleep` | Fallback bei inaktivem HA-Zeitplan (sleep-Modus) |
| `comfort` | Zimmer-Preset: Komfort (outdoor-geregelt) |
| `eco` | Zimmer-Preset: Eco (outdoor-geregelt) |
| `sleep` | Zimmer-Preset: Schlaf (outdoor-geregelt) |
| `room_away` | Zimmer-Preset: Abwesend (outdoor-geregelt) |
| `room_presence_away` | Anwesenheits-Auto: alle weg → Abwesend-Temperatur |
| `guest` | Gäste-Modus aktiv |
| `manual` | Manuell gesetzte Temperatur |
| `system_away` | System-Abwesend-Modus (globale away_temp) |
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

### `sensor.ihc_wohnzimmer_luftfeuchtigkeit` *(neu in 1.3.0)*

Aktuelle Raumluftfeuchtigkeit in Prozent. Wird nur erstellt wenn im Zimmer ein `humidity_sensor` konfiguriert ist.

**Geräteklasse:** `humidity` (%)

| Attribut | Typ | Beschreibung |
|----------|-----|-------------|
| `dew_point` | float | Berechneter Taupunkt (Magnus-Formel) in °C |
| `mold_risk` | bool | Ist der Schimmelschutz-Schwellwert überschritten? |
| `threshold` | float | Konfigurierter Schimmelschutz-Schwellwert in % |

---

### `binary_sensor.ihc_wohnzimmer_lueftungsempfehlung`

Lüftungsempfehlung basierend auf CO₂-Gehalt und/oder Luftfeuchtigkeit. Wird nur erstellt wenn `humidity_sensor` ODER `co2_sensor` konfiguriert ist.

**Ein** (`on`) wenn Level `urgent` oder `recommended`.

| Attribut | Typ | Beschreibung |
|----------|-----|-------------|
| `level` | string | `urgent`, `recommended`, `possible`, `none` |
| `score` | int | Interner Bewertungswert (höher = dringlicher) |
| `reasons` | list | Texte die die Empfehlung begründen |
| `co2_ppm` | float | Aktueller CO₂-Wert (falls Sensor konfiguriert) |
| `room_humidity` | float | Aktuelle Luftfeuchtigkeit (falls Sensor konfiguriert) |

---

### `binary_sensor.ihc_wohnzimmer_co2_warnung`

CO₂-Warnung (device_class: `gas`). Wird nur erstellt wenn `co2_sensor` konfiguriert ist.

**Ein** (`on`) wenn CO₂ > konfigurierter `co2_threshold_bad` (Standard: 1200 ppm).

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
