# Konfiguration

## Setup-Wizard (Ersteinrichtung)

Nach dem Hinzufügen der Integration erscheint ein **2-Schritt-Assistent**. Er ist bewusst kurz
gehalten – alles Weitere wird danach im **IHC-Panel** oder unter **Konfigurieren** eingestellt.

### Schritt 1: Außensensor

| Feld | Beschreibung | Beispiel |
|------|-------------|---------|
| `outdoor_temp_sensor` | Entity-ID des Außentemperatursensors (optional, aber empfohlen: speist die Heizkurve) | `sensor.aussentemperatur` |

> Ohne Außensensor fällt jedes Zimmer auf seine konfigurierte `comfort_temp` (fester Wert) zurück.

### Schritt 2: Globale Temperaturen

| Parameter | Standard | Beschreibung |
|-----------|---------|-------------|
| `away_temp` | 16 °C | Temperatur für alle Zimmer im System-Abwesend-Modus |
| `vacation_temp` | 14 °C | Temperatur für alle Zimmer im Urlaubs-Modus |

Es gibt **keinen** zentralen Heizungsschalter- oder Kühlungs-Schritt mehr im Wizard – IHC steuert
ausschließlich TRVs direkt (siehe [Architektur](architecture.md)).

---

## Zimmer verwalten

### Zimmer hinzufügen

**IHC Panel → Zimmer → + Zimmer hinzufügen**

oder über **Einstellungen → Integrationen → IHC → Konfigurieren → Zimmer hinzufügen**

#### Pflichtfelder

| Feld | Beschreibung |
|------|-------------|
| `name` | Name des Zimmers (z.B. „Wohnzimmer") |

#### Empfohlene Felder

| Feld | Beschreibung | Beispiel |
|------|-------------|---------|
| `temp_sensor` | Temperatursensor im Zimmer | `sensor.wohnzimmer_temp` |
| `valve_entities` | Liste der Thermostate/TRVs – IHC schreibt die berechnete Solltemperatur direkt auf jeden davon | `[climate.wohnzimmer_trv]` |
| `window_sensors` | Liste der Fenstersensoren | `[binary_sensor.fenster_wz]` |

#### Temperatur-Presets (outdoor-geregelt)

Alle Presets werden **dynamisch aus der Heizkurve** berechnet:

```
comfort_base = Heizkurve(Außentemperatur)   [Fallback: comfort_temp wenn kein Außensensor]
eco_base     = min(eco_max_temp,    comfort_base − eco_offset)
sleep_base   = min(sleep_max_temp,  comfort_base − sleep_offset)
away_base    = min(away_max_temp,   comfort_base − away_offset)
```

| Parameter | Standard | Beschreibung |
|-----------|---------|-------------|
| `comfort_temp` | 21 °C | Fallback-Komforttemperatur wenn kein Außensensor konfiguriert ist |
| `eco_offset` | 3 °C | Eco = Komfort − `eco_offset` |
| `eco_max_temp` | 21 °C | Eco nie höher als dieser Wert (Deckelung bei milden Perioden) |
| `sleep_offset` | 4 °C | Schlaf = Komfort − `sleep_offset` |
| `sleep_max_temp` | 19 °C | Schlaf nie höher als dieser Wert |
| `away_offset` | 6 °C | Abwesend = Komfort − `away_offset` |
| `away_max_temp` | 18 °C | Abwesend nie höher als dieser Wert |

> **Beispiel** bei Außentemperatur 0 °C (Heizkurve → 22 °C):
> Eco = min(21, 22−3) = **19 °C** · Schlaf = min(19, 22−4) = **18 °C** · Abwesend = min(18, 22−6) = **16 °C**

Die berechneten Effektivwerte werden als `comfort_temp_eff`, `eco_temp_eff`, `sleep_temp_eff`, `away_temp_eff` in den Climate-Attributen exponiert.

**Dynamische Sollwert-Entitäten (optional):** Statt der festen `comfort_temp`/`eco_offset`-Werte
können `comfort_temp_entity` bzw. `eco_temp_entity` (je eine `input_number.*`- oder `sensor.*`-Entity)
gesetzt werden – ihr Live-Wert überschreibt dann den Heizkurven-Wert für diesen Modus.

**Temperaturschwelle (optional):** `room_temp_threshold` (Standard 0 °C = deaktiviert) verhindert
Heizen unterhalb einer absoluten Grenztemperatur, unabhängig vom sonst berechneten Sollwert.

#### Erweiterte Einstellungen

| Feld | Standard | Beschreibung |
|------|---------|-------------|
| `room_offset` | 0 °C | Korrektur-Offset zum Heizkurven-Basiswert (±5 °C) |
| `deadband` | 0,5 °C | Totband für die Anforderungsberechnung (siehe [Erweiterte Konfiguration](advanced.md#anforderungsberechnung-pro-zimmer)) |
| `min_temp` | 5 °C | Minimale Temperaturgrenze |
| `max_temp` | 30 °C | Maximale Temperaturgrenze |
| `room_qm` | 0 m² | Zimmerfläche (fließt in Vorheiz-/Energieschätzung ein) |
| `temp_calibration` | 0 °C | Kalibrierungs-Offset für den Temperatursensor |

#### TRV-Verhalten

| Feld | Standard | Beschreibung |
|------|---------|-------------|
| `trv_temp_weight` | 0.0 | 0 = Raumsensor primär (TRV-Temp nur Fallback); > 0 = Blend aus Raumsensor und TRV-Temperatur |
| `trv_temp_offset` | 0 °C | Kalibrierung der TRV-eigenen Temperatur (TRVs sitzen am Heizkörper, oft wärmer als der Raum) |
| `trv_min_send_interval` | – | Mindestabstand (Sekunden) zwischen zwei Sollwert-Übertragungen an den TRV |
| `stuck_valve_timeout` | 1800 s | Nach dieser Zeit ohne TRV-Reaktion trotz Anforderung → `binary_sensor.ihc_<zimmer>_ventil_fehler` |

Details zur Ventilpositions-Auswertung und zum Temperatur-Blending siehe
[Architektur → TRV-Steuerung](architecture.md#trv-steuerung).

#### HA Zeitpläne (schedule.* Entities)

Pro Zimmer können beliebig viele bestehende **`schedule.*`-Entitäten** als Heizplan eingebunden werden.

Jede Bindung konfiguriert:

| Feld | Beschreibung |
|------|-------------|
| `entity` | Entity-ID des HA-Zeitplan (`schedule.*`) |
| `mode` | Temperaturmodus: `comfort` / `eco` / `sleep` / `away` |
| `condition_entity` | Optional: Bedingungsentität (schaltet zwischen Zeitplänen um) |
| `condition_state` | Zustand den die Bedingungsentität haben muss (Standard: `on`) |

**`ha_schedule_off_mode`** (pro Zimmer): Wenn kein HA-Zeitplan aktiv ist, welche Temperatur verwenden?
- `eco` (Standard): Eco-Temperatur (outdoor-geregelt)
- `sleep`: Schlaf-Temperatur (outdoor-geregelt)

> HA-Zeitpläne haben Vorrang vor internen Zeitplänen im Auto-Modus.

#### Schimmelschutz, CO₂ & Lüftung

| Feld | Standard | Beschreibung |
|------|---------|-------------|
| `humidity_sensor` | — | Optionaler Luftfeuchtigkeit-Sensor (`sensor.*`) |
| `mold_protection_enabled` | true | Automatische Temperaturerhöhung bei Schimmelrisiko aktivieren |
| `mold_humidity_threshold` | 70 % | Ab welcher relativen Feuchte das Schimmelrisiko als aktiv gilt |
| `co2_sensor` | — | Optionaler CO₂-Sensor (`sensor.*`) |
| `co2_threshold_good` / `co2_threshold_bad` | 800 / 1200 ppm | Schwellen für die Lüftungsempfehlung |

Wenn `humidity_sensor` konfiguriert ist, berechnet IHC laufend den Taupunkt. Bei Schimmelgefahr
wird die Zieltemperatur automatisch angehoben. Der aktuelle Status ist im Attribut `mold` der
Climate-Entity abrufbar.

#### Energieschätzung

| Feld | Standard | Beschreibung |
|------|---------|-------------|
| `radiator_kw` | 1.0 kW | Heizkörperleistung dieses Zimmers – Basis für `Laufzeit × radiator_kw` |
| `hkv_sensor` | — | Optional: HA-Sensor mit HKV-Einheiten (Heizkostenverteiler) statt Laufzeit-Schätzung |
| `hkv_factor` | 0,083 kWh/Einheit | Umrechnungsfaktor laut Jahresabrechnung |

#### Zimmer-spezifische Anwesenheit, Boost & Fenster-Kaskade

| Feld | Beschreibung |
|------|-------------|
| `room_presence_entities` | `person.*`/`device_tracker.*`-Liste – heizt nur wenn jemand hier ist (z. B. Homeoffice) |
| `boost_temp` | Zieltemperatur während des Boosts (Standard: Komfort) |
| `boost_default_duration` | Standard-Boost-Dauer in Minuten (Standard: 60) |
| `window_cascade_rooms` | Zimmer, die bei zu langem Lüften dieses Zimmers automatisch absenken |
| `window_cascade_delay_minutes` / `window_cascade_offset` | Verzögerung bis zur Kaskade / Absenkung in °C |
| `window_restore_mode` | `schedule` (Standard, Zeitplan neu berechnen) oder `previous` (Sollwert vor dem Öffnen wiederherstellen) |

### Zimmer bearbeiten

**IHC Panel → Zimmer → Bearbeiten**

Alle oben genannten Felder sind nachträglich änderbar. Änderungen werden sofort übernommen.

### Zimmer entfernen

**IHC Panel → Zimmer → 🗑** oder per Service `remove_room`.

> ⚠️ Das Entfernen löscht alle zugehörigen HA-Entitäten (`climate.*`, `sensor.*`, etc.).

### Heizgruppen

Mehrere Zimmer können zu einer Gruppe zusammengefasst werden (z. B. „Obergeschoss"), um sie
gemeinsam auf einen Modus zu schalten – siehe [Services → Heizgruppen](services.md#heizgruppen).

---

## Heizkurve konfigurieren

**IHC Panel → Heizkurve**

Die Heizkurve definiert die **Basis-Solltemperatur** in Abhängigkeit der Außentemperatur.

### Stützpunkte

Mindestens 2, maximal unbegrenzt viele Punkte. Zwischen den Punkten wird linear interpoliert.

**Empfehlungen nach Heizsystem:**

| Heizsystem | Empfohlene Kurve |
|------------|-----------------|
| Niedertemperatur (Fußboden) | -20°C→28°C bis 15°C→20°C |
| Standard-Heizkörper | -20°C→24°C bis 15°C→18°C *(Standard)* |
| Wärmepumpe | -20°C→22°C bis 10°C→18°C (flache Kurve) |
| Passivhaus | Sehr flache Kurve, da kaum Heizbedarf |

### Zimmer-Offset

Jedes Zimmer kann einen individuellen Offset zur Heizkurven-Basis haben:
- `+1,5 °C` für das Wohnzimmer (soll wärmer sein)
- `-0,5 °C` für das Schlafzimmer (soll kühler sein)

```
Zimmer-Ziel = Heizkurven-Basis + Zimmer-Offset - Nachtabsenkung
```

---

## Zeitpläne konfigurieren

**IHC Panel → Zimmer → Zimmer auswählen → Sub-Tab 📅 Zeitplan**

### Konzept

Ein Zeitplan besteht aus **Tagesgruppen** und **Zeiträumen**:

```
Gruppe 1: Mo–Fr
  Zeitraum 1: 06:30 – 08:00, 22°C, +0°C Offset
  Zeitraum 2: 17:00 – 22:30, 21°C, +0,5°C Offset

Gruppe 2: Sa–So
  Zeitraum 1: 08:00 – 23:00, 21°C, +0°C Offset
```

**Zeitplan-Formel:**
```
Zieltemperatur = Zeitplan-Temp + Zeitplan-Offset + Zimmer-Offset
```

Außerhalb aller Zeiträume gilt die Heizkurve.

### Übernacht-Zeiträume

Zeiträume die über Mitternacht gehen (z.B. 22:00–06:00) werden unterstützt.

### Vorheizen (Pre-Heat)

Wenn `preheat_minutes > 0` eingestellt ist, startet die Heizung entsprechend früher um die Zieltemperatur pünktlich zum Zeitplan-Start zu erreichen. Ist zusätzlich **Optimum Start** (`optimum_start_enabled`) aktiviert, lernt IHC die tatsächliche Aufheizzeit je Außentemperatur-Bucket und ersetzt den festen Wert durch eine gelernte Vorlaufzeit (siehe [Erweiterte Konfiguration](advanced.md)).

**Einstellung:** IHC Panel → Einstellungen → Nachtabsenkung & Vorheizen

### Feiertage & Schulferien

Ein `holiday_calendar` (`calendar.*`-Entity) kann global konfiguriert werden. Ist der Kalender an
einem Tag aktiv, verwendet IHC statt des Werktagsplans wahlweise den Wochenend-Zeitplan oder
durchgehend den Komfort-Modus (`holiday_schedule_mode`: `weekend` | `comfort`).

---

## Gäste-Modus

**IHC Panel → Einstellungen → Systemmodus → Gäste-Modus**

Aktiviert vorübergehend den Komfortbetrieb für alle Zimmer ohne Konfigurationsänderung.

| Parameter | Standard | Beschreibung |
|-----------|---------|-------------|
| `guest_duration_hours` | 24 | Dauer des Gäste-Modus in Stunden |

```yaml
# Gäste-Modus per Service aktivieren
service: intelligent_heating_control.activate_guest_mode
data:
  duration_hours: 6  # optional – Standard aus Einstellungen

# Gäste-Modus beenden
service: intelligent_heating_control.deactivate_guest_mode
```

---

## Anwesenheitserkennung

**IHC Panel → Einstellungen → Anwesenheitserkennung**

Konfiguriere eine oder mehrere `person.*` oder `device_tracker.*` Entitäten.

**Logik:**
- Mindestens eine Person `home` → System im normalen Modus
- Alle Personen `not_home` → System automatisch auf Abwesend-Modus (nach optionaler Verzögerung)
- Erste Person kehrt zurück → System zurück auf Auto-Modus

| Parameter | Standard | Beschreibung |
|-----------|---------|-------------|
| `presence_away_delay_minutes` | 0 | Minuten bis zum Auto-Away, nachdem alle als abwesend gelten (0 = sofort) |

> Wenn keine Entities konfiguriert sind, ist die Funktion deaktiviert (System läuft immer normal).

Für zimmerspezifische Anwesenheit siehe `room_presence_entities` weiter oben. Für ETA-basiertes
Vorheizen (Ankunft eines `device_tracker.*` timen) siehe [Erweiterte Konfiguration](advanced.md).

---

## Heizperiode (Winter-/Sommer-Schalter)

**Einstellungen → Integrationen → IHC → Konfigurieren**

| Parameter | Beschreibung |
|-----------|-------------|
| `heating_period_entity` | Optionale `input_boolean.*`/`binary_sensor.*`-Entity: steht sie auf OFF, ist die Heizperiode inaktiv und es wird nicht geheizt (unabhängig von der Sommerautomatik) |

---

## Nachtabsenkung

**IHC Panel → Einstellungen → Nachtabsenkung**

| Parameter | Standard | Beschreibung |
|-----------|---------|-------------|
| `night_setback_enabled` | false | Aktiviert/deaktiviert die Funktion |
| `night_setback_offset` | 2 °C | Um wieviel °C die Temperatur nachts abgesenkt wird |
| `sun_entity` | `sun.sun` | Welche Entity den Sonnenstand liefert |

**Logik:** Wenn `sun.sun` den Status `below_horizon` hat, wird die Zieltemperatur jedes Zimmers um `night_setback_offset` reduziert.

---

## Sommerautomatik

| Parameter | Standard | Beschreibung |
|-----------|---------|-------------|
| `summer_mode_enabled` | false | Sperrt die Heizung oberhalb der Außentemperatur-Schwelle |
| `summer_threshold` | 18 °C | Außentemperatur ab der die Sommerautomatik greift |
| `summer_mode_entity` | — | Optional: externer `input_boolean.*`/`binary_sensor.*`, überschreibt die Temperatur-Automatik |

Ergänzend kann eine **Kälteprognose-Frühstart**-Funktion die Sommerautomatik bei einer kalten
Wetterprognose deaktivieren und die Heizung entsprechend früher starten lassen (Wetter-Entity
erforderlich, siehe [Erweiterte Konfiguration](advanced.md)).

---

## Solar & Energiepreis

### Solar-Überschuss-Heizung

Wenn überschüssige Solarleistung vorhanden ist, wird die Zieltemperatur erhöht:

| Parameter | Standard | Beschreibung |
|-----------|---------|-------------|
| `solar_entity` | — | Sensor der die Solarleistung in Watt liefert |
| `solar_surplus_threshold` | 1000 W | Ab wann Solar-Boost aktiv wird |
| `solar_boost_temp` | +1 °C | Temperaturerhöhung bei Solar-Überschuss |

### Dynamischer Strompreis

Bei hohem Strompreis wird der Eco-Modus aktiviert:

| Parameter | Standard | Beschreibung |
|-----------|---------|-------------|
| `energy_price_entity` | — | Sensor der den aktuellen Strompreis liefert (€/kWh) |
| `energy_price_threshold` | 0,30 €/kWh | Ab wann Eco-Modus aktiv wird |
| `energy_price_eco_offset` | 2 °C | Temperaturabsenkung bei hohem Preis |

---

## Frostschutz

**IHC Panel → Einstellungen → Temperaturen**

Die Frostschutz-Temperatur gilt immer – auch wenn das System auf `OFF` oder `Urlaub` steht:

| Parameter | Standard | Beschreibung |
|-----------|---------|-------------|
| `frost_protection_temp` | 7 °C | Niemals unter diesen Wert (alle Modi) |

---

## Konfiguration per Service

Alle Einstellungen können auch per HA-Service gesetzt werden:

```yaml
service: intelligent_heating_control.update_global_settings
data:
  away_temp: 15
  frost_protection_temp: 8
  night_setback_enabled: true
  night_setback_offset: 3
  solar_entity: sensor.solar_leistung
  solar_surplus_threshold: 800
```

Siehe [services.md](services.md) für alle verfügbaren Parameter.
