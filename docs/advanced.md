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
-15°C → 24°C (flache Kurve, TRVs regeln die Raumtemperatur, nicht den Vorlauf)
0°C   → 22°C
10°C  → 20°C
20°C  → 18°C
```
> Da IHC keine Vorlauftemperatur regelt, gilt die Kurve hier für die **Raum-Zieltemperatur** –
> die eigentliche COP-Optimierung übernimmt die Wärmepumpen-eigene Regelung.

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
> Fußbodenheizungen haben geringeren Temperaturbedarf, reagieren aber sehr träge – ein größeres Totband (`deadband`) ist hier sinnvoll.

**Passivhaus:**
```
-20°C → 21°C
0°C   → 20.5°C
15°C  → 20°C
```
> Extrem flache Kurve – das Haus hält Temperatur fast von selbst.

---

## Anforderungsberechnung pro Zimmer

Jedes Zimmer hat kein zentrales An/Aus-Signal mehr (kein Heizungsschalter) – stattdessen berechnet
IHC pro Zimmer eine Heizanforderung von 0–100 %, die als Statussignal im Dashboard dient, in die
Laufzeit-/Energieschätzung einfließt und im TRV-Modus mit der gemeldeten Ventilposition kombiniert
wird (siehe [Architektur → TRV-Steuerung](architecture.md#trv-steuerung)).

### Formel

```python
def calculate_room_demand(current_temp, target_temp, deadband=0.5, demand_range=5.0):
    diff = target_temp - current_temp
    if diff <= deadband:
        return 0.0                                  # innerhalb des Totbands → kein Bedarf
    effective_diff = diff - deadband
    return min(100.0, (effective_diff / demand_range) * 100.0)
```

Mit den Standardwerten (`deadband=0.5`, `demand_range=5.0`):

| Isttemp vs. Zieltemp | Anforderung |
|-----------------------|-------------|
| ≥ Zieltemp − 0,5 °C | 0 % (im Totband) |
| = Zieltemp − 1,0 °C | 10 % |
| = Zieltemp − 3,0 °C | 50 % |
| ≤ Zieltemp − 5,5 °C | 100 % |

Fenster offen, Zimmermodus `off` oder fehlender Temperatursensor → immer 0 % Anforderung.

### Gesamtanforderung

Die im Dashboard gezeigte Gesamtanforderung (`sensor.ihc_gesamtanforderung`) ist der **einfache
Durchschnitt** der Anforderung aller aktiven (nicht auf `off` stehenden) Zimmer – es gibt keine
Gewichtung einzelner Zimmer.

### Totband einstellen

Das Totband (`deadband`) bestimmt wie sensibel ein Zimmer auf Temperaturabweichungen reagiert:

| Totband | Verhalten | Empfehlung |
|---------|-----------|-----------|
| 0.2 °C | Sehr sensibel, viele kleine Setpoint-Änderungen | Nicht empfohlen bei batteriebetriebenen TRVs |
| 0.5 °C | Standard für TRVs | **Standard** |
| 1.0 °C | Träge Reaktion | Fußbodenheizung |
| 2.0 °C | Sehr träge | Schwere Steinmauern |

### Peak Shaving

Wenn `peak_shaving_enabled` aktiv ist und mehrere Zimmer gleichzeitig neu in die Anforderung
gehen (Wechsel von „niemand heizt" zu „mindestens ein Zimmer heizt"), wird für die konfigurierte
`peak_shaving_delay_minutes` die untere Hälfte der anfordernden Zimmer (nach aktueller Anforderung
sortiert) auf maximal 30 % gedeckelt. So reißen nicht alle TRVs gleichzeitig auf.

---

## Zeitpläne im Detail

### Prioritäten-Logik

```
1. System OFF/Urlaub          → Frostschutz-Temperatur
2. System Abwesend            → Globale Abwesend-Temperatur
3. Gäste-Modus                → Komfort-Temperatur + Zimmer-Offset
4. Anwesenheit (alle weg)     → Abwesend-Temperatur (outdoor-geregelt) + Zimmer-Offset
5. Zimmermodus Manuell        → Manuell-Temp
6. Zimmer Aus                 → Frostschutz-Temp
7. Zimmer Komfort/Eco/Schlaf/Abwesend → Preset-Temp (outdoor-geregelt)
8. Aktiver HA-Zeitplan        → Preset des Zeitplan-Modus
9. Aktiver interner Zeitplan  → Zeitplan-Temp + Zeitplan-Offset + Zimmer-Offset
10. Vorheizen                 → Nächste Zeitplan-Temp (wenn Pre-Heat aktiv)
11. Heizkurve                 → Kurven-Basis + Zimmer-Offset
```

Korrekturen werden anschließend addiert:
- `-night_setback` wenn Sonne unter Horizont
- `+solar_boost` wenn Solar-Überschuss
- `-energy_price_eco_offset` wenn Strompreis hoch
- `+weather_cold_boost` wenn Kältewarnung aus der Wettervorhersage
- ggf. Mold-Protection-Erhöhung, CO₂-Vorheiz-Boost, Fenster-Kaskade-Absenkung eines Nachbarraums

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

Der Boost setzt für eine konfigurierbare Dauer die Zieltemperatur auf `boost_temp` (falls
konfiguriert, sonst Komfort-Preset):

```
Boost aktiviert:
  room_mode → comfort (bzw. boost_temp als Zielwert)
  boost_remaining → 60 min (zählt runter)

Nach Ablauf:
  room_mode → zurück zum vorherigen Modus
  boost_remaining → 0
```

---

## Optimum Start (lernbasiertes Vorheizen)

Statt einer festen `preheat_minutes`-Vorlaufzeit lernt IHC bei aktiviertem `optimum_start_enabled`
pro Zimmer, wie lange das Aufheizen tatsächlich dauert – getrennt nach Außentemperatur-Bucket:

```
warmup_curve = [
  {outdoor_temp: -10, avg_minutes: 42, samples: 8},
  {outdoor_temp:   0, avg_minutes: 28, samples: 15},
  {outdoor_temp:  10, avg_minutes: 14, samples: 6},
]
```

Fehlt für die aktuelle Außentemperatur ein Bucket, wird über die nächstgelegenen Buckets
gewichtet interpoliert (Gewicht = Messungen / (1 + Distanz²)). `avg_warmup_minutes` liefert
zusätzlich einen flachen Durchschnitt ohne Außentemperatur-Bezug. Sichtbar im **Analyse-Tab**
(siehe [Frontend Panel](frontend-panel.md)).

## Optimum Stop

Ergänzend kann IHC ein Zimmer bereits **vor** dem Ende des aktiven Zeitplan-Eintrags abschalten,
wenn die gelernte Abkühlrate (`avg_cooling_rate`) zeigt, dass die Zieltemperatur bis zum
tatsächlichen Zeitplan-Ende ohnehin gehalten würde. Status über `optimum_stop_active`,
`optimum_stop_minutes` (wie viel früher abgeschaltet wurde) und `optimum_stop_predicted`
(vorhergesagte Temperatur bei Zeitplan-Ende).

## Thermische Masse (Abkühlrate)

Bei ausgeschalteter Heizung und geschlossenem Fenster misst IHC, wie schnell ein Zimmer relativ
zur Innen-/Außentemperaturdifferenz auskühlt (`avg_cooling_rate`, °C/h je °C Δ). Dieser Wert
fließt sowohl in Optimum Start als auch in Optimum Stop ein. **Nicht zu verwechseln** mit aktiver
Kühlung (Klimaanlage) – TRVs können nicht aktiv kühlen, diese Lernfunktion betrifft ausschließlich
das passive Auskühlverhalten des Raums.

### Wärmebrücken-Erkennung

Sobald mindestens drei Zimmer eine gelernte Abkühlrate haben, vergleicht IHC jedes Zimmer mit dem
Durchschnitt der jeweils *übrigen* Zimmer. Kühlt ein Zimmer mindestens 1,8× schneller aus als
dieser Durchschnitt (und die Rate liegt über einer kleinen Rausch-Schwelle von 0,1), erscheint im
Analyse-Tab ein Hinweis auf eine mögliche Wärmebrücke – z. B. eine ungedämmte Außenwandecke oder
eine undichte Fensterdichtung. Das Attribut `thermal_bridge` liefert `{suspected, ratio}`; die
Erkennung ist rein informativ und verändert das Heizverhalten nicht.

## Anforderungs-Heatmap

Parallel dazu lernt IHC pro Zimmer einen gleitenden Durchschnitt (EMA) der Heizanforderung nach
Wochentag und Uhrzeit (`demand_heatmap`, 7×24-Raster). Über mehrere Wochen entsteht so ein Bild,
wann ein Zimmer typischerweise heizt – nützlich um Zeitpläne zu überprüfen oder Wärmebrücken zu
erkennen. Sichtbar im **Analyse-Tab**.

---

## Anwesenheitserkennung

### Präsenz-Logik

```
person.max: home
person.erika: not_home
→ Mindestens eine Person zuhause → System normal

person.max: not_home
person.erika: not_home
→ Niemand zuhause → nach presence_away_delay_minutes automatisch auf "away"

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

### ETA-Vorheizen

Ist `eta_preheat_enabled` aktiv, nutzt IHC die Entfernungs-/Ankunftsschätzung eines
`device_tracker.*` (sofern der Tracker das unterstützt): unterschreitet die geschätzte
Ankunftszeit `eta_preheat_threshold_minutes` (Standard 90 min), heizt das betroffene Zimmer
bereits vor dem eigentlichen Zeitplan-Start auf Komfort vor – sowohl im HA-Schedule-Off-Mode-
Fallback als auch beim internen Zeitplan ohne aktiven Eintrag.

### Zimmer-spezifische Anwesenheit

Über `room_presence_entities` heizt ein einzelnes Zimmer nur, wenn dort jemand ist (z. B. ein
Homeoffice-Zimmer nur bei `person.max: home`), unabhängig von der globalen Anwesenheit.

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
  Zieltemperatur aller Zimmer -= energy_price_eco_offset (-2°C)
  → Heizung läuft weniger → günstigere Stunden abwarten
```

**Geeignete Sensoren:**
- Tibber: `sensor.tibber_electricity_price` (Preis-Forecast via `price_forecast_attribute`)
- Octopus Energy: `sensor.octopus_current_rate`
- ENTSO-E: `sensor.nordpool_kwh_de_eur_3_10_025` (via HACS)

### Energieschätzung pro Zimmer

Ohne HKV-Sensor: `Laufzeit [h] × radiator_kw`. Mit konfiguriertem `hkv_sensor`: direkte
Umrechnung über `hkv_factor` (kWh pro HKV-Einheit, aus der Jahresabrechnung).

---

## Fenster-Kaskade

Lüftet ein Zimmer länger als `window_cascade_delay_minutes`, senken die in
`window_cascade_rooms` konfigurierten Nachbarräume automatisch um `window_cascade_offset` ab –
z. B. damit ein offenes Fenster im Flur nicht auch das angrenzende Wohnzimmer auskühlt. Sind
mehrere Quellen gleichzeitig aktiv, gewinnt der höchste Offset. Status pro Zimmer über
`window_cascade_active`, `window_cascade_offset`, `window_cascade_source`.

---

## TRV-Offset-Kalibrierungsassistent

Der `trv_temp_offset` (siehe [Architektur → TRV-Steuerung](architecture.md#trv-steuerung)) muss
normalerweise per Hand geschätzt werden – TRVs sitzen am Heizkörper und melden dadurch oft eine
andere Temperatur als der Raumsensor. IHC nimmt einem diese Schätzung teilweise ab:

- Immer wenn ein Zimmer **im Leerlauf** ist (Anforderung 0 %, Fenster zu) UND sowohl Raumsensor
  als auch TRV-Temperatur vorliegen, wird die Differenz `Raumsensor − TRV-Rohtemperatur`
  aufgezeichnet (bis zu 100 Messwerte, rollierend)
- Absichtlich **nur im Leerlauf**: während aktiven Heizens sitzt der TRV-Fühler direkt am heißen
  Heizkörper und würde die Differenz künstlich vergrößern
- Ab 20 gesammelten Messwerten schlägt IHC den **Median** dieser Differenz, quantisiert auf
  0,5 °C-Schritte, als `trv_suggested_offset` vor
- Sichtbar im **Analyse-Tab**, sobald sich der Vorschlag um ≥0,5 °C vom aktuell konfigurierten
  Wert unterscheidet – die Übernahme erfolgt manuell im Zimmer-Bearbeiten-Dialog, IHC ändert
  `trv_temp_offset` nie von selbst

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

Alle TRVs bekommen dieselbe Zieltemperatur (auf 0,5 °C quantisiert, siehe
[Architektur](architecture.md)). Ventilposition, Batteriestatus und Stuck-Valve-Erkennung werden
je TRV ausgewertet und im Zimmer aggregiert (`trv_avg_valve`, `trv_min_battery`,
`trv_stuck_valves`).

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
  - service: intelligent_heating_control.boost_room
    data:
      id: "{{ state_attr('climate.ihc_wohnzimmer', 'room_id') }}"
      duration_minutes: 60
```
