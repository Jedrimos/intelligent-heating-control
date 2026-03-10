# Erweiterte Konfiguration

## Heizkurve im Detail

### Grundprinzip

Die Heizkurve ist das Herzstück der witterungsgeführten Regelung. Sie definiert, bei welcher Außentemperatur welche Raumtemperatur angestrebt wird – ohne dass ein Bewohner eingreifen muss.

**Warum Heizkurve statt feste Temperatur?**
- Bei -15°C draußen braucht das Haus mehr Wärme als bei +5°C
- Eine feste Zieltemperatur führt dazu, dass die Heizung entweder zu früh anspringt oder die Temperatur nie ganz erreicht wird
- Die Heizkurve passt den Sollwert automatisch an die Witterung an

### Interpolation

Zwischen den konfigurierten Stützpunkten wird **linear interpoliert**:

```
Außentemp = 5°C → zwischen (0°C→22°C) und (10°C→20.5°C)
Interpoliert: 22 + (5-0)/(10-0) * (20.5-22) = 22 - 0.75 = 21.25°C
```

Außerhalb des Bereichs wird der erste/letzte Wert verwendet (Clipping).

### Heizkurve für verschiedene Systeme

**Wärmepumpe (Luft-Wasser):**
```
-15°C → 40°C (Vorlauf-Äquivalent ~35°C)
0°C   → 35°C
10°C  → 30°C
20°C  → 25°C
```
> Wärmepumpen bevorzugen flache Kurven mit niedrigen Vorlauftemperaturen für höhere COP-Werte.

**Gas-/Ölheizung mit Heizkörpern (Standard):**
```
-20°C → 24°C
-10°C → 23°C
0°C   → 22°C
10°C  → 20.5°C
20°C  → 18°C
```

**Fußbodenheizung:**
```
-20°C → 23°C
0°C   → 21°C
10°C  → 20°C
20°C  → 19°C
```
> Fußbodenheizungen haben geringeren Temperaturbedarf, reagieren aber sehr träge.

**Passivhaus:**
```
-20°C → 21°C
0°C   → 20.5°C
15°C  → 20°C
```
> Extrem flache Kurve – das Haus hält Temperatur fast von selbst.

---

## Klimabaustein im Detail

### Anforderungsberechnung pro Zimmer

```
Anforderung = (Zieltemp - Isttemp) / (Totband × 2) × 100%

Isttemp = 19.5°C, Zieltemp = 21°C, Totband = 0.5°C:
  Diff = 21 - 19.5 = 1.5°C
  MaxDiff = 0.5 × 2 = 1.0°C
  Diff > MaxDiff → 100% Anforderung

Isttemp = 20.5°C, Zieltemp = 21°C, Totband = 0.5°C:
  Diff = 21 - 20.5 = 0.5°C
  Anforderung = (0.5 / 1.0) × 100 = 50%

Isttemp ≥ Zieltemp:
  Anforderung = 0%
```

### Gewichtete Aggregation

```
Zimmer A: 80% Anforderung, Gewichtung 1.0
Zimmer B: 40% Anforderung, Gewichtung 1.0
Zimmer C:  0% Anforderung, Gewichtung 2.0 (Wohnzimmer – doppelt gewichtet)

Gesamtanforderung = (80×1 + 40×1 + 0×2) / (1+1+2) = 120/4 = 30%
```

> Zimmer C ist bereits warm, zieht die Gesamtanforderung runter.

### Hysterese und Schaltzustände

```
Einschaltschwelle: 15%
Hysterese: 5%
→ Ausschaltschwelle: 10%

Heizung AUS:
  Anforderung steigt auf 15% → Heizung EIN

Heizung EIN:
  Anforderung fällt auf 10% → Heizung AUS
  Anforderung bei 12% → Heizung bleibt EIN (Hysterese)
```

**Mindestzeiten** verhindern Kurzläufe:
```
Mindest-Einschaltzeit: 10 min
→ Auch wenn Anforderung sofort auf 0% fällt, bleibt Heizung 10 min an

Mindest-Ausschaltzeit: 5 min
→ Auch wenn Anforderung sofort wieder 100% wird, bleibt Heizung 5 min aus
```

### Totband einstellen

Das Totband (Deadband) bestimmt wie sensibel ein Zimmer auf Temperaturabweichungen reagiert:

| Totband | Verhalten | Empfehlung |
|---------|-----------|-----------|
| 0.2 °C | Sehr sensibel, hohes Taktungsrisiko | Nicht empfohlen |
| 0.5 °C | Standard für TRVs | **Standard** |
| 1.0 °C | Träge Reaktion | Fußbodenheizung |
| 2.0 °C | Sehr träge | Schwere Steinmauern |

---

## Zeitpläne im Detail

### Prioritäten-Logik

```
Priorität 1: System OFF/Urlaub   → Frostschutz-Temp
Priorität 2: System Abwesend     → Globale Abwesend-Temp
Priorität 3: Zimmermodus Manuell → Manuell-Temp
Priorität 4: Zimmer Aus          → Frostschutz-Temp
Priorität 5: Zimmer Komfort/Eco/Schlaf/Abwesend → Preset-Temp
Priorität 6: Aktiver Zeitplan    → Zeitplan-Temp + Offsets
Priorität 7: Vorheizen           → Nächste Zeitplan-Temp
Priorität 8: Heizkurve           → Kurven-Basis + Zimmer-Offset
```

Korrekturen werden anschließend addiert:
- `-night_setback` wenn Sonne unter Horizont
- `+solar_boost` wenn Solar-Überschuss
- `-eco_offset` wenn Strompreis hoch

### Übernacht-Zeiträume

```yaml
# Beispiel: Abendprogramm 22:00 bis 06:00
periods:
  - start: "22:00"
    end: "06:00"
    temperature: 18.0
    offset: 0.0
```

Der Schedule-Manager erkennt automatisch, dass `end < start` und behandelt den Zeitraum als über Mitternacht gehend.

### Zeitplan + Offset Formel

```
22°C (Zeitplan) + 0.5°C (Zeitplan-Offset) + 1.5°C (Zimmer-Offset) = 24°C Ziel
```

**Wann welchen Offset nutzen?**
- **Zeitplan-Offset**: „Dienstags gibt es immer Besuch" → dienstäglichen Zeitraum um +1°C anheben
- **Zimmer-Offset**: „Das Wohnzimmer ist generell zu kalt" → dauerhafter Aufschlag

---

## Boost-Funktion

Der Boost aktiviert den `comfort`-Modus für eine konfigurierbare Dauer:

```
Boost aktiviert:
  room_mode → comfort (Komfort-Preset aktiv)
  boost_remaining → 60 min (zählt runter)

Nach Ablauf:
  room_mode → zurück zum vorherigen Modus
  boost_remaining → 0
```

Der Countdown wird durch den 60-Sekunden-Update-Zyklus dekrementiert.

---

## Anwesenheitserkennung

### Präsenz-Logik

```
person.max: home
person.erika: not_home
→ Mindestens eine Person zuhause → System normal

person.max: not_home
person.erika: not_home
→ Niemand zuhause → System automatisch auf "away"

person.max: home (kommt zurück)
→ System zurück auf "auto"
```

Die automatische Umschaltung respektiert den aktuellen Systemmodus:
- Sie schaltet nur wenn der Systemmodus `auto` (oder bereits durch Anwesenheit auf `away` gesetzt)
- Manuelle Moduswechsel (z.B. `vacation`) werden nicht überschrieben

### Unterstützte Entity-Typen

| Entity-Typ | Zuhause wenn |
|-----------|-------------|
| `person.*` | State = `home` |
| `device_tracker.*` | State = `home` |
| `input_boolean.*` | State = `on` |

---

## Energie-Optimierung

### Solar-Überschuss-Heizung

**Idee:** Wenn die Solaranlage mehr erzeugt als der Haushalt verbraucht, wird die Überschussenergie für Heizung genutzt:

```
solar_entity: sensor.solar_leistung  (Watt)
solar_surplus_threshold: 1000 W

Solarleistung > 1000 W:
  Zieltemperatur aller Zimmer += solar_boost_temp (+1°C)
  → „Wärme einkaufen" wenn Strom kostenlos ist
```

### Dynamischer Strompreis

**Idee:** Bei teurem Strom (z.B. Spitzenzeiten) die Heizlast reduzieren:

```
energy_price_entity: sensor.tibber_preis  (€/kWh)
energy_price_threshold: 0.30 €/kWh

Strompreis > 0.30 €/kWh:
  Zieltemperatur aller Zimmer -= eco_offset (-2°C)
  → Heizung läuft weniger → günstigere Stunden abwarten
```

**Geeignete Sensoren:**
- Tibber: `sensor.tibber_electricity_price`
- Octopus Energy: `sensor.octopus_current_rate`
- ENTSO-E: `sensor.nordpool_kwh_de_eur_3_10_025` (via HACS)

---

## Mehrere TRVs pro Zimmer

Wenn ein Zimmer mehrere Thermostate hat, werden diese **alle gleichzeitig** mit der berechneten Zieltemperatur angesteuert:

```python
# Für jeden TRV in valve_entities:
hass.services.async_call(
    "climate", "set_temperature",
    {"entity_id": trv_id, "temperature": target_temp}
)
```

Alle TRVs bekommen dieselbe Zieltemperatur. Die Koordination zwischen TRVs übernimmt das IHC-System.

---

## Fortgeschrittene Automationen

### Zimmer-ID per Template

```yaml
# room_id aus climate-Attribut lesen
service: intelligent_heating_control.boost_room
data:
  id: "{{ state_attr('climate.ihc_wohnzimmer', 'room_id') }}"
  duration_minutes: 60
```

### Alle Zimmer auf Eco (Automation)

```yaml
# Alle IHC climate-Entities auf Eco setzen
service: climate.set_preset_mode
target:
  entity_id: >
    {{ states.climate | selectattr('entity_id', 'match', 'climate.ihc_.*')
       | map(attribute='entity_id') | list }}
data:
  preset_mode: "Eco"
```

### Konditionaler Boost (jemand kommt heim)

```yaml
alias: "IHC: Vorheizen bei Heimkehr"
trigger:
  - platform: state
    entity_id: person.max_mustermann
    to: "home"
condition:
  - condition: state
    entity_id: select.ihc_systemmodus
    state: "auto"
action:
  - service: intelligent_heating_control.set_system_mode
    data:
      mode: auto
  - service: intelligent_heating_control.boost_room
    data:
      id: "{{ state_attr('climate.ihc_wohnzimmer', 'room_id') }}"
      duration_minutes: 60
```
