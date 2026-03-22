# Services

IHC registriert folgende HA-Services unter der Domain `intelligent_heating_control`.

---

## `add_room`

Fügt ein neues Zimmer hinzu. Erstellt automatisch alle zugehörigen Entitäten.

```yaml
service: intelligent_heating_control.add_room
data:
  name: "Wohnzimmer"                        # Pflichtfeld
  temp_sensor: sensor.wohnzimmer_temp       # optional
  valve_entity: climate.wohnzimmer_trv      # erstes TRV (Kompatibilität)
  valve_entities:                           # alle TRVs (empfohlen)
    - climate.wohnzimmer_trv_links
    - climate.wohnzimmer_trv_rechts
  window_sensor: binary_sensor.fenster_wz   # erster Fenstersensor
  window_sensors:                           # alle Fenstersensoren
    - binary_sensor.fenster_wz_links
    - binary_sensor.fenster_wz_rechts
  room_offset: 1.5                          # Standard: 0.0
  comfort_temp: 22.0                        # Fallback wenn kein Außensensor (Standard: 21.0)
  # Outdoor-geregelte Offsets (alle relativ zu comfort_base von der Heizkurve)
  eco_offset: 3.0                           # Standard: 3.0  → Eco = Komfort − 3 °C
  eco_max_temp: 21.0                        # Standard: 21.0 → Eco nie über 21 °C
  sleep_offset: 4.0                         # Standard: 4.0  → Schlaf = Komfort − 4 °C
  sleep_max_temp: 19.0                      # Standard: 19.0 → Schlaf nie über 19 °C
  away_offset: 6.0                          # Standard: 6.0  → Abwesend = Komfort − 6 °C
  away_max_temp: 18.0                       # Standard: 18.0 → Abwesend nie über 18 °C
  ha_schedule_off_mode: eco                 # eco | sleep – Fallback bei inaktivem HA-Zeitplan
  deadband: 0.5                             # Standard: 0.5
  weight: 1.5                               # Standard: 1.0
  min_temp: 5.0                             # Standard: 5.0
  max_temp: 30.0                            # Standard: 30.0
  schedules: []                             # Interne Zeitpläne (leer = keine)
  ha_schedules:                             # HA schedule.* Entities als Heizplan
    - entity: schedule.wohnzimmer_plan
      mode: comfort                         # comfort | eco | sleep | away
    - entity: schedule.wohnzimmer_nacht
      mode: sleep
      condition_entity: input_boolean.kinder_zuhause
      condition_state: "on"
  humidity_sensor: sensor.wohnzimmer_luftfeuchte   # optional – für Schimmelschutz
  mold_protection_enabled: true             # Standard: true
```

---

## `remove_room`

Entfernt ein Zimmer und alle zugehörigen Entitäten.

```yaml
service: intelligent_heating_control.remove_room
data:
  id: "abc12345"  # room_id aus climate.*-Attributen
```

> Die `id` findest du in den Attributen der `climate.ihc_*` Entität unter `room_id`.

---

## `update_room`

Aktualisiert die Konfiguration eines bestehenden Zimmers. Nur angegebene Felder werden geändert.

```yaml
service: intelligent_heating_control.update_room
data:
  id: "abc12345"
  # Alle Felder aus add_room sind verwendbar, außer name
  comfort_temp: 22.5
  room_offset: 2.0
  valve_entities:
    - climate.wohnzimmer_trv_neu
  schedules:
    - days: ["mon", "tue", "wed", "thu", "fri"]
      periods:
        - start: "06:30"
          end: "08:00"
          temperature: 22.0
          offset: 0.0
        - start: "17:00"
          end: "22:30"
          temperature: 21.5
          offset: 0.5
    - days: ["sat", "sun"]
      periods:
        - start: "08:00"
          end: "23:00"
          temperature: 21.0
          offset: 0.0
```

---

## `set_room_mode`

Setzt den Betriebsmodus eines Zimmers.

```yaml
service: intelligent_heating_control.set_room_mode
data:
  id: "abc12345"
  mode: eco  # auto | comfort | eco | sleep | away | off | manual
```

| Modus | Beschreibung |
|-------|-------------|
| `auto` | Zeitplan + Heizkurve (Standardmodus) |
| `comfort` | Outdoor-geregelte Komfort-Temperatur |
| `eco` | Outdoor-geregelte Eco-Temperatur (Komfort − eco_offset, max eco_max_temp) |
| `sleep` | Outdoor-geregelte Schlaf-Temperatur (Komfort − sleep_offset, max sleep_max_temp) |
| `away` | Outdoor-geregelte Abwesend-Temperatur (Komfort − away_offset, max away_max_temp) |
| `off` | Zimmer ausschalten (0 % Anforderung, nur Frostschutz) |
| `manual` | Manuell über `climate.*` eingestellte Temperatur |

---

## `set_system_mode`

Setzt den globalen Systemmodus.

```yaml
service: intelligent_heating_control.set_system_mode
data:
  mode: away  # auto | heat | cool | off | away | vacation
```

| Modus | Beschreibung |
|-------|-------------|
| `auto` | Normale automatische Steuerung |
| `heat` | Erzwingt Heizbetrieb (überschreibt Sommerautomatik) |
| `cool` | Aktiviert Kühlbetrieb (wenn cooling_switch konfiguriert) |
| `off` | Alle Zimmer aus (nur Frostschutz aktiv) |
| `away` | Alle Zimmer auf globale Abwesend-Temperatur |
| `vacation` | Alle Zimmer auf Urlaubs-Temperatur (minimaler Frostschutz) |

---

## `boost_room`

Aktiviert oder deaktiviert den Boost-Modus für ein Zimmer.

```yaml
# Boost aktivieren (60 Minuten)
service: intelligent_heating_control.boost_room
data:
  id: "abc12345"
  duration_minutes: 60

# Boost mit eigener Dauer
service: intelligent_heating_control.boost_room
data:
  id: "abc12345"
  duration_minutes: 120  # 2 Stunden

# Boost abbrechen
service: intelligent_heating_control.boost_room
data:
  id: "abc12345"
  cancel: true
```

Während des Boosts wird der Zimmermodus auf `comfort` gesetzt. Nach Ablauf kehrt das Zimmer automatisch zum vorherigen Modus zurück.

---

## `activate_guest_mode`

Aktiviert den Gäste-Modus (alle Zimmer auf Komfort-Temperatur für eine konfigurierbare Dauer).

```yaml
service: intelligent_heating_control.activate_guest_mode
data:
  duration_hours: 4  # optional – Standard aus Einstellungen (guest_duration_hours)
```

---

## `deactivate_guest_mode`

Beendet den Gäste-Modus sofort.

```yaml
service: intelligent_heating_control.deactivate_guest_mode
```

---

## `update_global_settings`

Aktualisiert globale Einstellungen. Nur angegebene Parameter werden geändert.

```yaml
service: intelligent_heating_control.update_global_settings
data:
  # Klimabaustein
  demand_threshold: 20          # Einschaltschwelle in %
  demand_hysteresis: 5          # Hysterese in %
  min_on_time: 10               # Mindest-Einschaltzeit in Minuten
  min_off_time: 5               # Mindest-Ausschaltzeit in Minuten
  min_rooms_demand: 1           # Mindestanzahl Zimmer mit Anforderung

  # Globale Temperaturen
  away_temp: 16.0               # System-Abwesend-Temperatur
  vacation_temp: 14.0           # System-Urlaubs-Temperatur
  frost_protection_temp: 7.0    # Frostschutz-Temperatur

  # Sommerautomatik
  summer_mode_enabled: true
  summer_threshold: 18.0        # °C Außentemperatur ab der Heizung gesperrt wird

  # Nachtabsenkung
  night_setback_enabled: true
  night_setback_offset: 2.0     # °C Absenkung nachts
  sun_entity: "sun.sun"         # Entity für Sonnenstand
  preheat_minutes: 30           # Minuten Vorheizzeit vor Zeitplan

  # Anwesenheit
  presence_entities:
    - person.max_mustermann
    - person.erika_mustermann

  # Heizkurve
  heating_curve:
    points:
      - outdoor_temp: -20
        target_temp: 24.0
      - outdoor_temp: -10
        target_temp: 23.0
      - outdoor_temp: 0
        target_temp: 22.0
      - outdoor_temp: 10
        target_temp: 20.5
      - outdoor_temp: 15
        target_temp: 19.5
      - outdoor_temp: 20
        target_temp: 18.0
      - outdoor_temp: 25
        target_temp: 16.0

  # Energie & Solar
  boiler_kw: 20.0
  solar_entity: sensor.solar_leistung
  solar_surplus_threshold: 1000  # Watt
  solar_boost_temp: 1.0          # °C Boost

  # Dynamischer Strompreis
  energy_price_entity: sensor.strompreis_aktuell
  energy_price_threshold: 0.30   # €/kWh
  energy_price_eco_offset: 2.0   # °C Absenkung

  # Vorlauftemperatur
  flow_temp_entity: number.boiler_vorlauf

  # Verbundene Geräte
  heating_switch: switch.heizkessel
  outdoor_temp_sensor: sensor.aussentemperatur

  # Wettervorhersage & Kälte-Boost
  weather_entity: weather.home
  weather_cold_threshold: 0.0   # °C – Vorhersage unter diesem Wert → Kälte-Boost
  weather_cold_boost: 1.0       # °C – Boost bei Kältewarnung

  # Gäste-Modus Standarddauer
  guest_duration_hours: 4
```

---

## `export_config`

Exportiert die komplette Konfiguration als JSON-Datei.

```yaml
service: intelligent_heating_control.export_config
```

Der Export wird direkt als `.json`-Datei im Browser heruntergeladen. Er enthält alle Zimmer, Zeitpläne, Heizkurven-Punkte und Globaleinstellungen und kann über **Backup & Restore → Import** wieder eingespielt werden.

---

## `reload`

Lädt die Integration neu (entspricht einem HA-Integration-Reload).

```yaml
service: intelligent_heating_control.reload
```

---

## Services in Automationen verwenden

### Urlaubsmodus-Automation

```yaml
alias: "IHC: Urlaub aktivieren"
trigger:
  - platform: state
    entity_id: input_boolean.urlaub
    to: "on"
action:
  - service: intelligent_heating_control.set_system_mode
    data:
      mode: vacation

alias: "IHC: Urlaub beenden"
trigger:
  - platform: state
    entity_id: input_boolean.urlaub
    to: "off"
action:
  - service: intelligent_heating_control.set_system_mode
    data:
      mode: auto
```

### Boost beim Gäste-Klingeln

```yaml
alias: "IHC: Gäste – Wohnzimmer Boost"
trigger:
  - platform: state
    entity_id: binary_sensor.tuerklingel
    to: "on"
action:
  - service: intelligent_heating_control.boost_room
    data:
      id: "abc12345"  # room_id des Wohnzimmers
      duration_minutes: 120
```

### Wochenend-Modus

```yaml
alias: "IHC: Samstag Komfort"
trigger:
  - platform: time
    at: "08:00:00"
condition:
  - condition: time
    weekday:
      - sat
      - sun
action:
  - service: intelligent_heating_control.set_system_mode
    data:
      mode: heat
```
