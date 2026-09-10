# Entitäten

IHC erstellt beim Start automatisch alle Entitäten basierend auf der Konfiguration. Alle Entitäten sind mit der IHC-Integration verknüpft und werden beim Entfernen der Integration gelöscht.

> **Geräte-Struktur:** Jedes Zimmer erscheint als eigenes HA-Gerät unterhalb des zentralen Hub-Geräts „Intelligent Heating Control" (`via_device`).

> IHC steuert ausschließlich TRVs direkt – es gibt keinen zentralen Heizungs-Switch und keinen
> Kühlmodus. `switch.ihc_heizung_aktiv` ist ein reiner Status-/Komfort-Switch (siehe unten).

---

## Pro Zimmer

Für jedes konfigurierte Zimmer werden folgende Entitäten erstellt (Beispiel: Zimmer „Wohnzimmer"):

### `climate.ihc_wohnzimmer`

Die Hauptentität des Zimmers. Kompatibel mit allen HA-Features die `climate.*` Entitäten unterstützen (Lovelace-Cards, Google Home, Alexa, etc.). IHC schreibt die berechnete Solltemperatur direkt auf alle konfigurierten `valve_entities` (TRVs).

| Attribut | Typ | Beschreibung |
|----------|-----|-------------|
| `current_temperature` | float | Aktuelle Zimmertemperatur (vom konfigurierten Sensor, oder TRV-Fallback) |
| `temperature` | float | Aktuelle Solltemperatur |
| `hvac_mode` | string | `heat` oder `off` |
| `hvac_action` | string | `heating`, `idle` oder `off` (kein `cooling` – TRVs können nicht aktiv kühlen) |
| `preset_mode` | string | `Auto`, `Comfort`, `Eco`, `Sleep`, `Away`, `Manual`, `Boost` |
| `room_id` | string | Interne UUID des Zimmers |
| `room_mode` | string | `auto`, `comfort`, `eco`, `sleep`, `away`, `off`, `manual` |
| `demand` | float | Aktuelle Heizanforderung 0–100 % (siehe [Anforderungsberechnung](advanced.md)) |
| `window_open` | bool | Ist ein Fenster offen? |
| `schedule_active` | bool | Ist gerade ein Zeitplan aktiv? |
| `source` | string | Quelle der aktuellen Zieltemperatur |
| `boost_remaining` | int | Verbleibende Boost-Minuten (0 = kein Boost) |
| `night_setback` | float | Aktuell aktive Nachtabsenkung in °C |
| `runtime_today_minutes` | float | Heizlaufzeit heute in Minuten |
| `energy_today_kwh` | float | Geschätzter Energieverbrauch heute in kWh |
| `comfort_temp_eff` / `eco_temp_eff` / `sleep_temp_eff` / `away_temp_eff` | float | Aktuell berechnete effektive Preset-Temperaturen |
| `mold` | dict | Schimmelschutz-Status: `{risk, dew_point, humidity}` |
| `felt_temperature` | float | Gefühlte Temperatur aus Raumtemperatur + Luftfeuchte |
| `ventilation` | dict | Lüftungsempfehlung: `{level, score, reasons, co2_ppm, room_humidity}` |
| `co2_ventilation_eta_minutes` | float | Prognostizierte Zeit bis zur Lüftungsempfehlung |
| `room_presence_active` | bool | Zimmer-spezifische Anwesenheit (wenn konfiguriert) |
| `pir_presence` | bool | Status eines optionalen PIR-Präsenzsensors (`presence_sensor`) |
| `anomaly` | string | Sensor-Anomalie: `sensor_stuck`, `temp_drop` oder `null` |
| `next_period` | dict | Nächster Zeitplan-Eintrag `{start, end, mode, temperature}` |
| `trv_raw_temp` | float | Unkorrigierte TRV-Durchschnittstemperatur (am Heizkörper) |
| `trv_humidity` | float | TRV-Luftfeuchtigkeit (falls TRV dieses Attribut meldet) |
| `trv_avg_valve` | float | Durchschnittliche Ventilöffnung aller TRVs (0–100 %) |
| `trv_any_heating` | bool | Mindestens ein TRV meldet `hvac_action: heating` |
| `trv_min_battery` / `trv_low_battery` | int / bool | Niedrigster Akkustand aller TRVs (%) / `true` wenn < 20 % |
| `trv_stuck_valves` | list | Entity-IDs von TRVs, die trotz Anforderung nicht reagieren |
| `temp_history` / `target_history` | list | Stündliche Ist-/Soll-Temperatur-Snapshots (max. 168 Einträge / 7 Tage) |
| `demand_heatmap` | list | Gelernte Heizanforderung nach Wochentag/Uhrzeit (7×24 EMA-Werte), Basis für den Analyse-Tab |
| `avg_warmup_minutes` / `warmup_curve` | float / list | Gelernte Ø-Aufheizzeit (flach bzw. je Außentemperatur-Bucket) |
| `learned_preheat_minutes` | float | Aktuell berechnete, außentemperatur-korrigierte Vorheizzeit (Optimum Start) |
| `avg_cooling_rate` | float | Gelernte passive Abkühlrate (°C/h je °C Δ innen/außen, thermische Masse) |
| `thermal_bridge` | dict | `{suspected, ratio}` – Wärmebrücken-Hinweis wenn das Zimmer ≥1,8× schneller auskühlt als der Durchschnitt der übrigen Zimmer (rein informativ) |
| `optimum_stop_active` / `optimum_stop_minutes` / `optimum_stop_predicted` | bool / float / float | Optimum-Stop-Status: schaltet vor Zeitplan-Ende ab, wenn das Zimmer die Zieltemperatur ohnehin hält |
| `window_cascade_active` / `window_cascade_offset` / `window_cascade_source` | bool / float / string | Ist die Fenster-Kaskade eines Nachbarraums gerade aktiv, und mit welchem Offset/welcher Quelle |

Daneben spiegelt die Entität die komplette Zimmer-Konfiguration (`temp_sensor`, `valve_entities`,
`window_sensors`, `deadband`, `room_offset`, `schedules`, `ha_schedules`, TRV-Einstellungen,
CO₂-/Feuchte-Schwellen, Boost-Konfiguration, Fenster-Kaskade-Konfiguration, …) als Attribute –
das Frontend-Panel nutzt diese zum Vorbelegen der Bearbeiten-Dialoge.

**Mögliche `source`-Werte:**

| Wert | Beschreibung |
|------|-------------|
| `heating_curve` | Heizkurve + Zimmer-Offset (Auto-Modus, kein Zeitplan) |
| `schedule` | Aktiver interner Zeitplan |
| `preheat` | Vorheizen vor internem Zeitplan |
| `ha_schedule_comfort` / `_eco` / `_sleep` / `_away` | Aktiver HA-Zeitplan im jeweiligen Modus |
| `comfort` / `eco` / `sleep` | Zimmer-Preset (outdoor-geregelt) |
| `room_away` | Zimmer-Preset: Abwesend (outdoor-geregelt) |
| `room_presence_away` | Anwesenheits-Auto: alle weg → Abwesend-Temperatur |
| `guest` | Gäste-Modus aktiv |
| `manual` | Manuell gesetzte Temperatur |
| `system_away` | System-Abwesend-Modus (globale `away_temp`) |
| `system_vacation` | Urlaubs-Modus |
| `room_off` | Zimmer-AUS-Modus |
| `frost_protection` | Frostschutz aktiv |
| `temp_threshold_override` | `room_temp_threshold` hat den sonst berechneten Sollwert übersteuert |

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

---

### `sensor.ihc_wohnzimmer_zieltemperatur`

Berechnete Solltemperatur des Zimmers.

**Geräteklasse:** `temperature` (°C)

---

### `sensor.ihc_wohnzimmer_laufzeit_heute`

Heizlaufzeit des Zimmers heute in Minuten (zurückgesetzt um Mitternacht). Basiert auf dem realen
TRV-Heizsignal (Ventilposition > 8 % → `hvac_action: heating` → berechnete Anforderung > 0 →
Fallback Raumtemp < Zieltemp), nicht auf der rohen Anforderung.

**Geräteklasse:** `duration` (min)

---

### `sensor.ihc_wohnzimmer_luftfeuchtigkeit`

Aktuelle Raumluftfeuchtigkeit in Prozent. Wird nur erstellt wenn im Zimmer ein `humidity_sensor` konfiguriert ist.

**Geräteklasse:** `humidity` (%)

| Attribut | Typ | Beschreibung |
|----------|-----|-------------|
| `dew_point` | float | Berechneter Taupunkt (Magnus-Formel) in °C |
| `mold_risk` | bool | Ist der Schimmelschutz-Schwellwert überschritten? |
| `threshold` | float | Konfigurierter Schimmelschutz-Schwellwert in % |

---

### `sensor.ihc_wohnzimmer_gefuehlte_temperatur`

Gefühlte Temperatur (Komfortindex) aus Raumtemperatur und Luftfeuchtigkeit. Wird nur erstellt wenn `humidity_sensor` konfiguriert ist.

**Geräteklasse:** `temperature` (°C)

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

### `binary_sensor.ihc_wohnzimmer_ventil_fehler`

Stuck-Valve-Erkennung (device_class: `problem`). Wird nur erstellt wenn mindestens ein TRV (`valve_entities`) konfiguriert ist.

**Ein** (`on`) wenn ein TRV trotz Heizanforderung länger als `stuck_valve_timeout` (Standard 1800 s) nicht reagiert – z. B. verkalkt oder mechanisch blockiert.

| Attribut | Typ | Beschreibung |
|----------|-----|-------------|
| `stuck_valve_entities` | list | Entity-IDs der betroffenen TRVs |

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

Gesamtanforderung aller aktiven (nicht auf `off` stehenden) Zimmer in Prozent, als einfacher
Durchschnitt. Enthält außerdem eine große Menge an Status- und Konfigurations-Attributen, u. a.:

| Attribut | Typ | Beschreibung |
|----------|-----|-------------|
| `heating_active` | bool | Heizt aktuell irgendein Zimmer? |
| `rooms_demanding` | int | Anzahl Zimmer mit Anforderung > 0 |
| `system_mode` | string | Aktueller Systemmodus |
| `summer_mode` | bool | Ist die Sommerautomatik aktuell aktiv? |
| `night_setback_active` | bool | Ist die Nachtabsenkung aktuell aktiv? |
| `heating_period_active` | bool | Ist die Heizperiode aktiv (`heating_period_entity`)? |
| `presence_away_active` / `presence_away_pending` / `presence_away_pending_minutes_remaining` | bool / bool / float | Status der Anwesenheits-Verzögerung |
| `vacation_auto_active` / `vacation_range` / `return_preheat_active` | bool / dict / bool | Urlaubs-Assistent-Status |
| `guest_mode_active` / `guest_remaining_minutes` | bool / float | Gäste-Modus-Status |
| `holiday_active` / `holiday_schedule_mode` | bool / string | Feiertagskalender-Status |
| `peak_shaving_active` | bool | Läuft gerade die Peak-Shaving-Verzögerung? |
| `forecast_coldnight_active` | bool | Ist die Kälteprognose-Frühstart-Logik aktiv? |
| `groups` | list | Alle konfigurierten Heizgruppen `{group_id, group_name, group_rooms}` |
| `heating_runtime_today` / `heating_runtime_yesterday` | float | Gesamte Heizlaufzeit heute/gestern in Minuten |
| `efficiency_score` | float | Interner Effizienz-Score |
| `weather_forecast` / `outdoor_humidity` | dict / float | Wetterprognose- bzw. Außenfeuchte-Daten |

Ergänzend spiegelt der Sensor die komplette globale Konfiguration (Außensensor, Heizkurve,
Solar-, Strompreis-, Nachtabsenkungs-, Anwesenheits- und TRV-bezogene Einstellungen) als
Attribute – das Frontend-Panel nutzt diese zum Vorbelegen des Einstellungen-Tabs.

---

### `sensor.ihc_aussentemperatur`

Spiegelt den konfigurierten Außentemperatursensor (optional geglättet über
`outdoor_temp_smoothing_minutes`). Wird von IHC intern gelesen und als eigene Entity bereitgestellt.

**Geräteklasse:** `temperature` (°C)

---

### `sensor.ihc_heizkurven_zieltemperatur`

Aktueller Heizkurven-Basiswert (vor Zimmer-Offset) basierend auf der aktuellen Außentemperatur.

**Geräteklasse:** `temperature` (°C)

| Attribut | Typ | Beschreibung |
|----------|-----|-------------|
| `curve_points` | list | Alle konfigurierten Heizkurven-Punkte `[{outdoor_temp, target_temp}, ...]` |

---

### `sensor.ihc_heizlaufzeit_heute` / `sensor.ihc_heizlaufzeit_gestern`

Gesamte Heizlaufzeit aller Zimmer heute bzw. gestern in Minuten (zurückgesetzt um Mitternacht).

---

### `sensor.ihc_energie_heute` / `sensor.ihc_energie_gestern`

Geschätzter Gesamt-Energieverbrauch heute bzw. gestern in kWh. Pro Zimmer berechnet als
`Laufzeit [h] × radiator_kw`, alternativ direkt aus einem konfigurierten `hkv_sensor`, und über
alle Zimmer aufsummiert.

---

### `switch.ihc_heizung_aktiv`

Spiegelt, ob aktuell irgendein Zimmer heizt (`heating_active`). Manuelles Umschalten wechselt den
**Systemmodus**: AUS → `off`, EIN → `auto`. Es handelt sich um einen Komfort-/Status-Switch für
Automationen und Dashboards, **nicht** um einen Kessel- oder TRV-Aktor.

---

### `select.ihc_systemmodus`

Direktes Umschalten des Systemmodus.

**Optionen:** `auto`, `heat`, `off`, `away`, `vacation`, `guest`

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
  - from: 40
    color: "#FF9800"
  - from: 75
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
