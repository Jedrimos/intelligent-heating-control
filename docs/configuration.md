# Konfiguration

## Setup-Wizard (Ersteinrichtung)

Nach dem Hinzufügen der Integration erscheint ein 3-Schritt-Assistent:

### Schritt 1: Außensensor & Heizungsschalter

| Feld | Beschreibung | Beispiel |
|------|-------------|---------|
| `outdoor_temp_sensor` | Entity-ID des Außentemperatursensors | `sensor.aussentemperatur` |
| `heating_switch` | Switch zum Ein-/Ausschalten des Kessels | `switch.heizung` |
| `cooling_switch` | Switch für Kühlung (optional) | `switch.klimaanlage` |

> Der `heating_switch` wird von IHC direkt gesteuert. Es kann eine `switch.*`, `input_boolean.*` oder jede andere schaltbare Entity sein.

### Schritt 2: Klimabaustein-Parameter

| Parameter | Standard | Beschreibung |
|-----------|---------|-------------|
| `demand_threshold` | 15 % | Ab welcher Gesamtanforderung schaltet die Heizung ein |
| `demand_hysteresis` | 5 % | Heizung bleibt an bis Anforderung unter `threshold - hysteresis` fällt |
| `min_on_time` | 5 min | Mindest-Einschaltdauer (Kesselschutz) |
| `min_off_time` | 5 min | Mindest-Ausschaltdauer (Kesselschutz) |
| `min_rooms_demand` | 1 | Mindestanzahl Zimmer mit Anforderung > 0 |

### Schritt 3: Globale Temperaturen

| Parameter | Standard | Beschreibung |
|-----------|---------|-------------|
| `away_temp` | 16 °C | Temperatur für alle Zimmer im System-Abwesend-Modus |
| `vacation_temp` | 14 °C | Temperatur für alle Zimmer im Urlaubs-Modus |

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
| `valve_entities` | Liste der Thermostate/TRVs | `[climate.wohnzimmer_trv]` |
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

#### Erweiterte Einstellungen

| Feld | Standard | Beschreibung |
|------|---------|-------------|
| `room_offset` | 0 °C | Korrektur-Offset zum Heizkurven-Basiswert (±5 °C) |
| `deadband` | 0,5 °C | Totband für Anforderungsberechnung |
| `weight` | 1,0 | Gewichtung im Klimabaustein (1,0 = normal, 2,0 = doppelt) |
| `min_temp` | 5 °C | Minimale Temperaturgrenze |
| `max_temp` | 30 °C | Maximale Temperaturgrenze |

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

#### Schimmelschutz

| Feld | Standard | Beschreibung |
|------|---------|-------------|
| `humidity_sensor` | — | Optionaler Luftfeuchtigkeit-Sensor (`sensor.*`) |
| `mold_protection_enabled` | true | Automatische Temperaturerhöhung bei Schimmelrisiko aktivieren |

Wenn `humidity_sensor` konfiguriert ist, berechnet IHC laufend den Taupunkt. Bei Schimmelgefahr (relative Feuchte nahe Taupunkt) wird die Zieltemperatur automatisch angehoben. Der aktuelle Status ist im Attribut `mold` der Climate-Entity abrufbar.

### Zimmer bearbeiten

**IHC Panel → Zimmer → Bearbeiten**

Alle oben genannten Felder sind nachträglich änderbar. Änderungen werden sofort übernommen.

### Zimmer entfernen

**IHC Panel → Zimmer → 🗑** oder per Service `remove_room`.

> ⚠️ Das Entfernen löscht alle zugehörigen HA-Entitäten (`climate.*`, `sensor.*`, etc.).

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

**IHC Panel → Zeitpläne**

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

Wenn `preheat_minutes > 0` eingestellt ist, startet die Heizung entsprechend früher um die Zieltemperatur pünktlich zum Zeitplan-Start zu erreichen.

**Einstellung:** IHC Panel → Einstellungen → Nachtabsenkung & Vorheizen

---

## Gäste-Modus

**IHC Panel → Einstellungen → Systemmodus → Gäste-Modus**

Aktiviert vorübergehend den Komfortbetrieb für alle Zimmer ohne Konfigurationsänderung.

| Parameter | Standard | Beschreibung |
|-----------|---------|-------------|
| `guest_duration_hours` | 4 | Dauer des Gäste-Modus in Stunden |

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
- Alle Personen `not_home` → System automatisch auf Abwesend-Modus
- Erste Person kehrt zurück → System zurück auf Auto-Modus

> Wenn keine Entities konfiguriert sind, ist die Funktion deaktiviert (System läuft immer normal).

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
| `energy_price_eco_offset` | -2 °C | Temperaturabsenkung bei hohem Preis |

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
  demand_threshold: 20
  away_temp: 15
  frost_protection_temp: 8
  night_setback_enabled: true
  night_setback_offset: 3
  solar_entity: sensor.solar_leistung
  solar_surplus_threshold: 800
```

Siehe [services.md](services.md) für alle verfügbaren Parameter.
