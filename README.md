# 🌡️ Intelligent Heating Control (IHC)

[![HACS Custom](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://hacs.xyz/)
[![HA Version](https://img.shields.io/badge/HA-2024.2%2B-blue.svg)](https://home-assistant.io)
[![Version](https://img.shields.io/badge/Version-2.1.0-green.svg)](CHANGELOG.md)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**Die intelligente Mehrzimmer-Heizungssteuerung für Thermostat-Ventile (TRVs) in Home Assistant.**

IHC macht aus einzelnen, voneinander nichts wissenden Heizkörperthermostaten ein zusammenhängendes,
lernendes Heizsystem: außentemperaturgeführte Solltemperaturen, Zeitpläne pro Zimmer, Fenster- und
Anwesenheitserkennung, Schimmel- und CO₂-Schutz, Urlaubs- und Gästebetrieb, Wetterprognose –
und ein vollwertiges eigenes Dashboard-Panel in der HA-Seitenleiste.

**Das Grundprinzip:** IHC berechnet für jedes Zimmer laufend die richtige Solltemperatur und schreibt sie
**direkt auf die TRVs des Raums** – es gibt keinen zentralen Kessel-Schalter und keine Aggregation dazwischen.
**Alle Preset-Temperaturen** (Komfort / Eco / Schlaf / Abwesend) werden dynamisch aus der
Außentemperatur-Heizkurve abgeleitet – Eco, Schlaf und Abwesend als konfigurierbarer Abzug von der
Komforttemperatur, jeweils mit einstellbarer Obergrenze. Zusätzlich lernt IHC pro Zimmer die
**Aufheizzeit** und die **thermische Masse**, um Zeitpläne punktgenau statt pauschal vorzuheizen.

---

## ✨ Highlights

| Feature | Beschreibung |
|---------|-------------|
| 🎯 **TRV-Direktsteuerung** | Jedes Ventil bekommt seinen eigenen berechneten Sollwert – inklusive Erkennung manueller Eingriffe am Thermostat mit Auto-Reset |
| 📈 **Heizkurve** | Außentemperaturgeführte Basistemperatur – alle Presets (Komfort/Eco/Schlaf/Abwesend) folgen der Kurve |
| 📅 **Zeitpläne** | Wöchentliche Zeitpläne + HA `schedule.*` Entities als Heizplan pro Zimmer |
| 🚪 **Multi-TRV** | Mehrere Thermostate + Fenstersensoren pro Zimmer |
| 🪟 **Fenstererkennung** | Ereignisgesteuert (keine Abfrageverzögerung), mit Reaktions- und Schließverzögerung |
| 🌊 **Fenster-Kaskade** | Lüftet ein Zimmer zu lange, senken konfigurierbare Nachbarräume automatisch ab |
| 🧠 **Optimum Start** | IHC lernt die Aufheizzeit je Außentemperatur und startet exakt so früh wie nötig |
| 🧱 **Thermische Masse** | Gelernte Abkühlrate pro Zimmer – Betonwände brauchen weniger Vorlauf als Dachzimmer |
| ⚡ **Boost** | Zeitlich begrenzter Komfortmodus per Button oder Service |
| 🚶 **Anwesenheit** | Automatischer Abwesend-Modus (mit einstellbarer Verzögerung) wenn niemand zuhause ist |
| 🕒 **ETA-Vorheizen** | `device_tracker`-basiert: heizt vor, wenn jemand auf dem Heimweg ist |
| 🌙 **Nachtabsenkung** | Sonnenstandsbasierte Temperaturabsenkung |
| ☀️ **Solar-Boost** | Mehr Heizen wenn Solarüberschuss vorhanden |
| 💶 **Strompreis** | Eco-Modus bei hohem dynamischen Strompreis (Tibber, Nordpool …) inkl. Preis-Chart |
| 🌦️ **Wettervorhersage** | Temperatur-Boost bei prognostizierter Kältewelle + Kälteprognose-Frühstart |
| 💧 **Schimmelschutz** | Pro Zimmer: Taupunktberechnung + automatische Temperaturerhöhung bei Risiko |
| 🌬️ **CO₂ & Lüftung** | Lüftungsempfehlung, CO₂-Warnung und CO₂-Vorheiz-Boost gegen den Kälteschock |
| 🎉 **Gäste-Modus** | Vorübergehend Komfortbetrieb aller Zimmer ohne Konfigurationsänderung |
| ✈️ **Urlaubs-Assistent** | Datumsbereich oder Kalender-Stichwort, inkl. Vorheizen vor der Rückkehr |
| 🗓️ **Feiertagskalender** | HA-Kalender → automatisch Wochenend-Zeitplan oder Komfortbetrieb |
| ⚡ **Peak Shaving** | Gestaffelter Heizungsstart statt Lastspitze, wenn alle Zimmer gleichzeitig anfordern |
| ❄️ **Frostschutz** | Immer aktiv, auch im OFF-Modus |
| 🔩 **Stuck-Valve-Erkennung** | Erkennt festsitzende Ventile und meldet sie als Binary Sensor |
| 🔋 **TRV-Batteriestatus** | Akkustand aller TRVs im Dashboard – Warnung bei < 20 % |
| 📈 **Temperaturverlauf** | 7-Tage-Chart pro Zimmer inkl. Solltemperatur-Verlauf und Min/Max/Ø-Statistik |
| 🏘️ **Heizgruppen** | Mehrere Zimmer zu Gruppen bündeln und gemeinsam umschalten |
| 🏠 **Pro-Zimmer-Geräte** | Jedes Zimmer als eigenes Gerät in HA Geräte & Dienste |
| 🖥️ **Custom Panel** | Eigenes Dashboard-Panel in der HA-Seitenleiste |

---

## 📸 Screenshots

> Das IHC-Panel ist direkt in der HA-Seitenleiste zugänglich unter dem Menüpunkt „IHC".

**Übersicht-Tab:** Echtzeit-Raumkarten mit Temperaturen, Anforderungen und Schnell-Modi
**Einstellungen-Tab:** Alle globalen Parameter zentral konfigurierbar
**Heizkurven-Tab:** Grafischer Editor mit Live-Preview und Außentemperatur-Marker
**Zeitplan-Tab:** Wöchentlicher Zeitplan-Editor pro Zimmer mit Tagesgruppen

---

## 🚀 Installation

### Via HACS (empfohlen)

1. **HACS** → **Integrationen** → **⋮** → **Benutzerdefinierte Repositories**
2. URL: `https://github.com/Jedrimos/intelligent-heating-control`
3. Kategorie: **Integration**
4. `Intelligent Heating Control` suchen und installieren
5. Home Assistant neu starten

### Manuell

```bash
# In dein HA-Konfigurationsverzeichnis kopieren
cp -r custom_components/intelligent_heating_control /config/custom_components/
```
Dann HA neu starten.

---

## ⚙️ Einrichtung

### 1. Integration hinzufügen

**Einstellungen → Integrationen → + Integration → „Intelligent Heating Control"**

Der Setup-Assistent ist bewusst kurz gehalten – zwei Schritte, danach läuft die Integration:

1. **Außensensor** – Welcher Sensor misst die Außentemperatur? (optional, aber empfohlen: er speist die Heizkurve)
2. **Globale Temperaturen** – Abwesend-Temperatur und Urlaubs-Temperatur

Alles Weitere (Heizkurve, Zimmer, Zeitpläne, Anwesenheit, Solar, Wetter …) wird danach bequem
im **IHC-Panel** oder unter **Konfigurieren** eingestellt.

### 2. Zimmer hinzufügen

Im **IHC Panel** (Seitenleiste) → **Zimmer** → **+ Zimmer hinzufügen**

Oder über **Einstellungen → Integrationen → IHC → Konfigurieren → Zimmer hinzufügen**

Pro Zimmer konfigurierbar:
- Temperatursensor (`sensor.*`)
- Ein oder mehrere Thermostate/TRVs (`climate.*`)
- Ein oder mehrere Fenstersensoren (`binary_sensor.*`)
- Komfort-Fallback-Temperatur + Eco/Schlaf/Abwesend als Abzug von der Heizkurve
- HA `schedule.*` Entities als Heizplan (mit Temperaturmodus und optionaler Bedingung)
- Zimmer-Offset, Totband, Gewichtung
- Luftfeuchtigkeit-Sensor + Schimmelschutz, CO₂-Sensor
- Heizkörperleistung (kW) und optionaler HKV-Sensor für die Energieschätzung

### 3. Heizkurve anpassen

**IHC Panel → Heizkurve** – Stützpunkte anpassen, grafisch prüfen, speichern.

Standardkurve (für Niedertemperatur-Heizsysteme geeignet):

| Außentemperatur | Basistemperatur |
|----------------|-----------------|
| -20 °C         | 24,0 °C         |
| -10 °C         | 23,0 °C         |
|   0 °C         | 22,0 °C         |
|  10 °C         | 20,5 °C         |
|  15 °C         | 19,5 °C         |
|  20 °C         | 18,0 °C         |
|  25 °C         | 16,0 °C         |

### 4. Zeitpläne erstellen

**IHC Panel → Zimmer** → Zimmer auswählen → Sub-Tab **📅 Zeitplan** → Tagesgruppen und Zeiträume konfigurieren.

---

## 🧠 Funktionsweise im Detail

### Solltemperatur-Berechnung (Prioritäten)

Alle Preset-Temperaturen werden zuvor aus der Heizkurve berechnet:
```
comfort_base  = Heizkurve(Außentemperatur)           [Fallback: comfort_temp falls kein Sensor]
eco_base      = min(eco_max_temp,    comfort_base − eco_offset)
sleep_base    = min(sleep_max_temp,  comfort_base − sleep_offset)
away_base     = min(away_max_temp,   comfort_base − away_offset)
```

Dann die Prioritätskette pro Zimmer:
```
1. System OFF/Urlaub       → Frostschutz-Temperatur
2. System Abwesend         → Globale Abwesend-Temperatur
3. Gäste-Modus             → comfort_base + Zimmer-Offset
4. Anwesenheit (alle weg)  → away_base + Zimmer-Offset
5. Zimmer Manuell          → Manuell eingestellte Temperatur
6. Zimmer Aus              → Frostschutz
7. Zimmer Komfort/Eco/Schlaf/Abwesend → outdoor-geregelte Preset-Temp
8. Aktiver HA-Zeitplan     → Preset des Zeitplan-Modus (Komfort/Eco/Schlaf/Abwesend)
9. Aktiver interner Zeitplan → Zeitplan-Temp + Zeitplan-Offset + Zimmer-Offset
10. Vorheizen              → Nächste Zeitplan-Temperatur (wenn Pre-Heat aktiv)
11. Heizkurve              → comfort_base + Zimmer-Offset
```

Korrekturen werden zusätzlich angewendet:
- **Nachtabsenkung**: -X °C wenn Sonne unter dem Horizont
- **Solar-Boost**: +X °C wenn Solarleistung > Schwellenwert
- **Energiepreis-Eco**: -X °C wenn Strompreis > Schwellenwert
- **Wetter-Kälte-Boost**: +X °C wenn Vorhersage unter Schwellenwert
- **Schimmelschutz**: automatische Temperaturerhöhung bei Schimmelrisiko
- **Fenster offen**: sofort 0 % Anforderung (kein Heizen bei offenem Fenster)
- **Fenster-Kaskade**: Absenkung in Nachbarräumen, wenn ein Zimmer lange lüftet

### Zimmer-Feinabstimmung: Totband & Anforderung

Jedes Zimmer berechnet zusätzlich eine Heizanforderung von 0–100 %. Sie ist das Statussignal
im Dashboard, fließt in die Laufzeit- und Energieschätzung ein und wird im TRV-Modus mit der
gemeldeten Ventilposition kombiniert:

```
Anforderung = (Zieltemp - Isttemp) / (Totband × 2) × 100 %

Isttemp ≥ Zieltemp          → 0 %   (kein Bedarf)
Isttemp ≤ Zieltemp - 2×DB  → 100 % (voller Bedarf)
```

Das **Totband** (`deadband`, Standard 0,5 °C) bestimmt also, wie „scharf" ein Zimmer reagiert:
kleines Totband = schnelleres Anfordern, größeres Totband = ruhigerer Betrieb.
Die **Gewichtung** (`weight`) beeinflusst, wie stark ein Zimmer in die angezeigte
Gesamtanforderung des Systems eingeht.

### Lernende Vorheizung

IHC misst bei jedem Aufheizvorgang, wie lange ein Zimmer vom Ist- zum Sollwert braucht – getrennt
nach Außentemperatur-Bucket (`warmup_curve`). Parallel wird die Abkühlrate (thermische Masse,
`avg_cooling_rate`) beobachtet. Aus beidem ergibt sich der spätestmögliche Startzeitpunkt, damit
die Zieltemperatur pünktlich zum Zeitplanbeginn erreicht ist – statt eines pauschalen
Vorheiz-Zeitfensters.

---

## 📊 Erstellte Entitäten

### Pro Zimmer

| Entität | Typ | Beschreibung |
|---------|-----|-------------|
| `climate.ihc_<zimmer>` | Climate | Hauptentität: Ist/Soll-Temp, HVAC-Modus, Presets |
| `sensor.ihc_<zimmer>_anforderung` | Sensor | Heizanforderung 0–100 % |
| `sensor.ihc_<zimmer>_zieltemperatur` | Sensor | Berechnete Zieltemperatur |
| `sensor.ihc_<zimmer>_laufzeit_heute` | Sensor | Heizlaufzeit heute in Minuten |
| `sensor.ihc_<zimmer>_luftfeuchtigkeit` | Sensor | Luftfeuchtigkeit + Taupunkt + Schimmelrisiko *(nur wenn humidity_sensor konfiguriert)* |
| `sensor.ihc_<zimmer>_gefuehlte_temperatur` | Sensor | Gefühlte Temperatur aus Raumtemperatur + Luftfeuchte *(nur wenn humidity_sensor konfiguriert)* |
| `binary_sensor.ihc_<zimmer>_lueftungsempfehlung` | Binary Sensor | Lüftungsempfehlung (CO₂ / Feuchte) *(nur wenn Sensor konfiguriert)* |
| `binary_sensor.ihc_<zimmer>_co2_warnung` | Binary Sensor | CO₂-Warnung *(nur wenn co2_sensor konfiguriert)* |
| `binary_sensor.ihc_<zimmer>_ventil_fehler` | Binary Sensor | Festsitzendes Ventil erkannt (Stuck-Valve-Erkennung) |
| `number.ihc_<zimmer>_offset` | Number | Zimmer-Offset laufzeit-anpassbar (±5 °C) |
| `select.ihc_<zimmer>_modus` | Select | Zimmermodus-Auswahl |

### Global

| Entität | Typ | Beschreibung |
|---------|-----|-------------|
| `sensor.ihc_gesamtanforderung` | Sensor | Gewichtete Gesamtanforderung %; dazu umfangreiche Status-Attribute (Systemmodus, Sommer-/Nachtabsenkung, Anwesenheit, Urlaub, Gäste, Feiertag, Peak Shaving, Wetterprognose, Gruppen …) |
| `sensor.ihc_aussentemperatur` | Sensor | Außentemperatur (Spiegel-Sensor) |
| `sensor.ihc_heizkurven_zieltemperatur` | Sensor | Aktueller Heizkurven-Basiswert; `curve_points`-Attribut |
| `sensor.ihc_heizlaufzeit_heute` | Sensor | Gesamte Heizlaufzeit heute in Minuten |
| `sensor.ihc_heizlaufzeit_gestern` | Sensor | Gesamte Heizlaufzeit gestern in Minuten |
| `sensor.ihc_energie_heute` | Sensor | Geschätzter Energieverbrauch heute in kWh |
| `sensor.ihc_energie_gestern` | Sensor | Geschätzter Energieverbrauch gestern in kWh |
| `switch.ihc_heizung_aktiv` | Switch | Spiegelt, ob gerade irgendein Zimmer heizt. Umschalten wechselt den Systemmodus: AUS → `off`, EIN → `auto` |
| `select.ihc_systemmodus` | Select | Globaler Systemmodus |

---

## 🔧 Services

### Zimmer verwalten

```yaml
# Zimmer hinzufügen
service: intelligent_heating_control.add_room
data:
  name: "Wohnzimmer"
  temp_sensor: sensor.wohnzimmer_temperatur
  valve_entities:
    - climate.wohnzimmer_trv1
    - climate.wohnzimmer_trv2
  window_sensors:
    - binary_sensor.fenster_wohnzimmer_links
    - binary_sensor.fenster_wohnzimmer_rechts
  room_offset: 1.5
  comfort_temp: 22.0          # Fallback wenn kein Außensensor
  eco_offset: 3.0             # Eco = Komfort − 3 °C
  eco_max_temp: 21.0          # Eco nie höher als 21 °C
  sleep_offset: 4.0           # Schlaf = Komfort − 4 °C
  sleep_max_temp: 19.0        # Schlaf nie höher als 19 °C
  away_offset: 6.0            # Abwesend = Komfort − 6 °C
  away_max_temp: 18.0         # Abwesend nie höher als 18 °C
  ha_schedule_off_mode: eco   # Fallback bei inaktivem HA-Zeitplan
  deadband: 0.5
  weight: 1.5

# Zimmer konfigurieren
service: intelligent_heating_control.update_room
data:
  id: "abc12345"
  comfort_temp: 22.5
  room_offset: 2.0

# Zimmer entfernen
service: intelligent_heating_control.remove_room
data:
  id: "abc12345"
```

### Modi steuern

```yaml
# Systemmodus
service: intelligent_heating_control.set_system_mode
data:
  mode: away  # auto | heat | off | away | vacation | guest

# Zimmermodus
service: intelligent_heating_control.set_room_mode
data:
  id: "abc12345"
  mode: eco   # auto | comfort | eco | sleep | away | off | manual

# Boost aktivieren
service: intelligent_heating_control.boost_room
data:
  id: "abc12345"
  duration_minutes: 90

# Boost abbrechen
service: intelligent_heating_control.boost_room
data:
  id: "abc12345"
  cancel: true
```

### Heizgruppen

Mehrere Zimmer als Gruppe bündeln (z. B. „Obergeschoss") und gemeinsam umschalten:

```yaml
# Gruppe anlegen
service: intelligent_heating_control.add_group
data:
  group_name: "Obergeschoss"
  group_rooms: ["abc12345", "def67890"]

# Gruppe komplett auf Eco schalten
service: intelligent_heating_control.set_group_mode
data:
  group_id: "grp001"
  mode: eco
```

Dazu gibt es `update_group` (Name / Zimmerzuordnung ändern) und `remove_group`
(Gruppe auflösen, die Zimmer bleiben erhalten).

### Globale Einstellungen

```yaml
# Heizkurve aktualisieren
service: intelligent_heating_control.update_global_settings
data:
  heating_curve:
    points:
      - outdoor_temp: -20
        target_temp: 24.0
      - outdoor_temp: 0
        target_temp: 22.0
      - outdoor_temp: 20
        target_temp: 18.0

# Globale Temperaturen anpassen
service: intelligent_heating_control.update_global_settings
data:
  away_temp: 16.0
  vacation_temp: 14.0
  frost_protection_temp: 7.0

# Konfiguration exportieren (als HA-Benachrichtigung)
service: intelligent_heating_control.export_config

# Laufzeit- und Energiestatistiken zurücksetzen
service: intelligent_heating_control.reset_stats
```

Weitere Services: `activate_guest_mode` / `deactivate_guest_mode` (Gästebetrieb ein-/ausschalten)
und `reload` (Integration neu laden).

---

## 🏠 IHC Panel (Frontend)

Das Plugin registriert ein eigenes Panel unter dem Seitenleisten-Eintrag **IHC**.

### Tabs im Überblick

#### 🏠 Dashboard (Übersicht)
- Echtzeit-Raumkarten: Ist/Soll-Temperatur, Anforderungsbalken, Betriebsstatus
- **Hero-Bereich**: Heizstatus | Gesamtanforderung | Systemmodus — direkt umschaltbar
- Schnell-Modi: Modus-Chips direkt auf der Karte umschalten
- Boost-Button: 60-Minuten-Komfortmodus per Klick
- Override-Banner pro Karte wenn Systemmodus den Zimmermodus übersteuert
- Status-Leiste: Außentemperatur, Heizkurven-Ziel, Gesamtanforderung, Laufzeit, Energie
- Banner für aktive Sonderzustände: Sommer, Nacht, Abwesend, Solar-Boost, Hoher Strompreis
- Alert-Chips: schwache TRV-Batterien, festsitzende Ventile, Fenster-Kaskade mit Countdown

#### 🚪 Zimmer
- Alle Zimmer auflisten mit Modus, Temperatur, Fensterstatus
- Zimmer hinzufügen/bearbeiten/löschen
- Entity-Autocomplete: Vorschläge während der Eingabe von Sensor-IDs
- Bearbeiten-Modal: alle Felder vorausgefüllt (Thermostate, Sensoren, Presets, Offsets)
- **Sub-Tab 📅 Zeitplan**: Wöchentliche Zeitpläne direkt im Zimmer-Detail
- **Sub-Tab 🗓️ Wochenansicht**: Kalenderansicht des Zimmer-Zeitplans
- **Sub-Tab 📈 Verlauf**: SVG-Temperaturverlauf der letzten 7 Tage inkl. Solltemperatur und Min/Max/Ø

#### 📊 Diagnose / Übersicht
- Systemstatus aller Zimmer auf einen Blick
- Anforderungen, Betriebszustände, Sensor-Werte
- Energie- und Laufzeit-Statistiken, Strompreis-Chart, ETA-Vorheiz-Status

#### ⚙️ Einstellungen
- Hardware & Steuerung: TRV-Verhalten, Sendeintervall, Ventilpositions-Auswertung
- Systemmodus manuell setzen
- Temperaturen: Abwesend, Urlaub, Frostschutz, Sommerautomatik
- Kälteprognose-Frühstart
- Nachtabsenkung & Vorheizen
- Anwesenheitserkennung: `person.*` / `device_tracker.*` auswählen, inkl. ETA-Vorheizen
- Gäste-Modus & Urlaubs-Assistent
- Energie & Solar: Solar-Sensor, Strompreis-Sensor, Energiepreis *(die kWh-Schätzung erfolgt pro Zimmer über Heizkörperleistung und optionalen HKV-Sensor)*
- Lüftungsempfehlung, Intelligente Regelung, Kalkschutz & Stuck-Valve-Erkennung, Peak Shaving
- Backup & Restore: Export als JSON-Datei, Import via Datei-Upload

#### 📈 Heizkurve
- Stützpunkte bearbeiten (Außentemperatur → Zieltemperatur)
- Live-Canvas-Vorschau mit Farbverlauf
- Aktueller Außentemperatur-Marker
- Speichert direkt in die Integration

---

## 🗂️ Dokumentation

Ausführliche Dokumentation in [`docs/`](docs/):

| Datei | Inhalt |
|-------|--------|
| [Installation](docs/installation.md) | Detaillierte Installationsanleitung |
| [Konfiguration](docs/configuration.md) | Setup-Wizard, Zimmer, Heizkurve |
| [Entitäten](docs/entities.md) | Alle erstellten Entitäten mit Attributen |
| [Services](docs/services.md) | Alle Services mit Parametern und Beispielen |
| [Frontend Panel](docs/frontend-panel.md) | Anleitung zum IHC-Dashboard-Panel |
| [Architektur](docs/architecture.md) | Technische Architektur für Entwickler |
| [FAQ](docs/faq.md) | Häufige Fragen & Fehlerbehebung |
| [Erweiterte Konfiguration](docs/advanced.md) | Heizkurve, Zeitpläne im Detail |

---

## 📁 Projektstruktur

```
intelligent_heating_control/
├── __init__.py               # Setup, Services, Panel-Registrierung
├── manifest.json             # HACS/HA Manifest
├── const.py                  # Alle Konstanten und Standardwerte
├── config_flow.py            # Einrichtungs- und Options-Flow
├── coordinator.py            # Zentraler Update-Koordinator (~60s Zyklus)
│
├── room_logic.py             # Solltemperatur-Ermittlung + Prioritätskette pro Zimmer
├── heating_controller.py     # Anforderungs-Berechnung pro Zimmer (0–100 %)
├── heating_curve.py          # Heizkurven-Logik (lineare Interpolation)
├── schedule_manager.py       # Zeitplan-Verwaltung und -Auswertung
├── trv_controller.py         # TRV-Sollwert-Versand, Quantisierung, Override-Erkennung
├── window_manager.py         # Ereignisgesteuerte Fenstererkennung + Kaskade
├── presence_manager.py       # Anwesenheitserkennung, Auto-Abwesend, ETA-Vorheizen
├── vacation_manager.py       # Urlaubs- und Gäste-Modus, Kalender-Integration
├── comfort_manager.py        # Schimmelschutz, CO₂, Lüftungsempfehlung
├── climate_adjustments.py    # Solar-Boost, Strompreis-Eco, Wetterkorrekturen
├── energy_manager.py         # Laufzeitmessung, kWh-Schätzung, Lernkurven
│
├── climate.py                # Climate-Platform (eine Entity pro Zimmer + global)
├── sensor.py                 # Sensor-Platform
├── binary_sensor.py          # Binary-Sensor-Platform (Lüftung, CO₂, Ventil-Fehler)
├── switch.py                 # Switch-Platform
├── number.py                 # Number-Platform (Offsets)
├── select.py                 # Select-Platform (Modi)
├── services.yaml             # Service-Definitionen
├── strings.json              # ConfigFlow-Texte
├── translations/
│   ├── de.json               # Deutsch
│   └── en.json               # Englisch
└── frontend/
    ├── build.py              # Build-Script: baut src/ → ihc-panel.js
    ├── ihc-panel.js          # Kompiliertes Custom Panel (nicht direkt bearbeiten)
    ├── ihc-dashboard-card.js # Lovelace-Karte: System-Übersicht
    ├── ihc-room-card.js      # Lovelace-Karte: einzelnes Zimmer
    └── src/                  # Quelldateien des Panels
        ├── 00_constants.js
        ├── 01_styles.css.js
        ├── 02_utils.js
        ├── 03_tab_dashboard.js
        ├── 04_tab_rooms.js
        ├── 05_tab_settings.js
        ├── 06_tab_diagnose.js
        ├── 07_tab_curve.js
        ├── 08_modals.js
        └── 09_main.js
```

> **Frontend-Entwicklung:** Änderungen immer in `frontend/src/` vornehmen und anschließend
> `python3 frontend/build.py` ausführen – daraus entsteht `frontend/ihc-panel.js`.

---

## 🤝 Mitwirken

Beiträge sind herzlich willkommen!

1. Fork des Repositories
2. Feature-Branch erstellen: `git checkout -b feature/mein-feature`
3. Änderungen committen
4. Pull Request öffnen

**Bugs und Feature-Wünsche:** [GitHub Issues](https://github.com/Jedrimos/intelligent-heating-control/issues)

---

## 📋 Roadmap

Sieh dir die [ROADMAP.md](ROADMAP.md) an für alle geplanten Funktionen, darunter:
- Passive Solarheizung / Beschattung über Rollosteuerung
- Schlaf-Temperatur-Profil (Kurve über die Nacht statt fixer Absenkung)
- Komfortindex nach ASHRAE 55 (gefühlte Temperatur als Regelgröße)
- Anforderungs-Heatmap im Dashboard
- Erweiterte Lovelace-Karten für das HA-Dashboard
- Und vieles mehr

---

## 📝 Lizenz

MIT License – siehe [LICENSE](LICENSE)

## 👤 Mitwirkende

- [@Jedrimos](https://github.com/Jedrimos) – Projektinitiator und Hauptentwickler

---

> **Hinweis:** Bugs und Feature-Wünsche bitte als [GitHub Issue](https://github.com/Jedrimos/intelligent-heating-control/issues) melden. Aktuell ist Version 2.1.0 stabil und HACS-kompatibel.
