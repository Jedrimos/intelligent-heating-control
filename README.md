# 🌡️ Intelligent Heating Control (IHC)

[![HACS Custom](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://hacs.xyz/)
[![HA Version](https://img.shields.io/badge/HA-2023.6%2B-blue.svg)](https://home-assistant.io)
[![Version](https://img.shields.io/badge/Version-1.0.1-green.svg)](CHANGELOG.md)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Eine fortschrittliche, zentral aggregierende Heizungssteuerung für Home Assistant – inspiriert von Loxone und Advanced Heating Control v5.

**Das Grundprinzip:** Jeder Raum berechnet seine Heizanforderung (0–100 %). Der Klimabaustein aggregiert alle Anforderungen gewichtet und entscheidet zentral, ob die Heizung läuft. Die Solltemperatur pro Zimmer wird aus einer konfigurierbaren Außentemperatur-Heizkurve + individuellem Zimmer-Offset berechnet. Zeitpläne können diesen Wert überschreiben.

---

## ✨ Highlights

| Feature | Beschreibung |
|---------|-------------|
| 🏗️ **Klimabaustein** | Loxone-artiger zentraler Regler – aggregiert alle Zimmer, entscheidet den Kessel |
| 📈 **Heizkurve** | Außentemperaturgeführte Basistemperatur mit konfigurierbaren Stützpunkten |
| 📅 **Zeitpläne** | Wöchentliche Zeitpläne mit Tagesgruppen und eigenem Offset je Zeitraum |
| 🚪 **Multi-TRV** | Mehrere Thermostate + Fenstersensoren pro Zimmer |
| ⚡ **Boost** | Zeitlich begrenzter Komfortmodus per Button oder Service |
| 🚶 **Anwesenheit** | Automatischer Abwesend-Modus wenn niemand zuhause ist |
| 🌙 **Nachtabsenkung** | Sonnenstandsbasierte Temperaturabsenkung |
| ☀️ **Solar-Boost** | Mehr Heizen wenn Solarüberschuss vorhanden |
| 💶 **Strompreis** | Eco-Modus bei hohem dynamischen Strompreis |
| ❄️ **Frostschutz** | Immer aktiv, auch bei OFF-Modus |
| 🖥️ **Custom Panel** | Eigenes Dashboard-Panel mit 5 Tabs in der HA-Seitenleiste |

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
2. URL: `https://github.com/Jedrimos/intelligent-heatingcontroll`
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

Der Setup-Assistent führt durch 3 Schritte:
1. **Außensensor & Heizungsschalter** – Welcher Sensor misst die Außentemperatur? Welcher Switch steuert den Kessel?
2. **Klimabaustein-Parameter** – Einschaltschwelle, Hysterese, Mindest-Zeiten
3. **Globale Temperaturen** – Abwesend-Temp, Urlaubs-Temp

### 2. Zimmer hinzufügen

Im **IHC Panel** (Seitenleiste) → **Zimmer** → **+ Zimmer hinzufügen**

Oder über **Einstellungen → Integrationen → IHC → Konfigurieren → Zimmer hinzufügen**

Pro Zimmer konfigurierbar:
- Temperatursensor (`sensor.*`)
- Ein oder mehrere Thermostate/TRVs (`climate.*`)
- Ein oder mehrere Fenstersensoren (`binary_sensor.*`)
- Temperatur-Presets (Komfort / Eco / Schlaf / Abwesend)
- Zimmer-Offset, Totband, Gewichtung

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

**IHC Panel → Zeitpläne** → Zimmer auswählen → Tagesgruppen und Zeiträume konfigurieren.

---

## 🧠 Funktionsweise im Detail

### Klimabaustein (Das Herzstück)

Jedes Zimmer berechnet seine Heizanforderung proportional:

```
Anforderung = (Zieltemp - Isttemp) / (Totband × 2) × 100 %

Isttemp ≥ Zieltemp          → 0 %   (kein Bedarf)
Isttemp ≤ Zieltemp - 2×DB  → 100 % (voller Bedarf)
```

Der Klimabaustein aggregiert alle Zimmer gewichtet:

```
Gesamtanforderung = Σ(Anforderung_i × Gewichtung_i) / Σ(Gewichtung_i)

Heizung EIN:  Gesamtanforderung ≥ Einschaltschwelle (Standard: 15 %)
Heizung AUS:  Gesamtanforderung < Einschaltschwelle - Hysterese (Standard: 10 %)
```

Zusätzlich: Mindest-Einschaltzeit und Mindest-Ausschaltzeit schützen den Kessel.

### Solltemperatur-Berechnung (Prioritäten)

```
1. System OFF/Urlaub   → Frostschutz-Temperatur
2. System Abwesend     → Globale Abwesend-Temperatur
3. Zimmer Manuell      → Manuell eingestellte Temperatur
4. Zimmer Aus          → Frostschutz
5. Zimmer Komfort/Eco/Schlaf/Abwesend → Preset-Temperatur
6. Aktiver Zeitplan    → Zeitplan-Temp + Zeitplan-Offset + Zimmer-Offset
7. Vorheizen           → Nächste Zeitplan-Temperatur (wenn Pre-Heat aktiv)
8. Heizkurve           → Heizkurven-Basis + Zimmer-Offset
```

Korrekturen werden zusätzlich angewendet:
- **Nachtabsenkung**: -X °C wenn Sonne unter dem Horizont
- **Solar-Boost**: +X °C wenn Solarleistung > Schwellenwert
- **Energiepreis-Eco**: -X °C wenn Strompreis > Schwellenwert
- **Fenster offen**: sofort 0 % Anforderung (kein Heizen bei offenem Fenster)

---

## 📊 Erstellte Entitäten

### Pro Zimmer

| Entität | Typ | Beschreibung |
|---------|-----|-------------|
| `climate.ihc_<zimmer>` | Climate | Hauptentität: Ist/Soll-Temp, HVAC-Modus, Presets |
| `sensor.ihc_<zimmer>_anforderung` | Sensor | Heizanforderung 0–100 % |
| `sensor.ihc_<zimmer>_zieltemperatur` | Sensor | Berechnete Zieltemperatur |
| `sensor.ihc_<zimmer>_laufzeit_heute` | Sensor | Heizlaufzeit heute in Minuten |
| `number.ihc_<zimmer>_offset` | Number | Zimmer-Offset laufzeit-anpassbar (±5 °C) |
| `select.ihc_<zimmer>_modus` | Select | Zimmermodus-Auswahl |

### Global

| Entität | Typ | Beschreibung |
|---------|-----|-------------|
| `sensor.ihc_gesamtanforderung` | Sensor | Gewichtete Gesamtanforderung %; Klimabaustein-Attribute |
| `sensor.ihc_aussentemperatur` | Sensor | Außentemperatur (Spiegel-Sensor) |
| `sensor.ihc_heizkurven_zieltemperatur` | Sensor | Aktueller Heizkurven-Basiswert; `curve_points`-Attribut |
| `sensor.ihc_heizlaufzeit_heute` | Sensor | Gesamte Heizlaufzeit heute in Minuten |
| `sensor.ihc_energie_heute` | Sensor | Geschätzter Energieverbrauch heute in kWh |
| `switch.ihc_heizung_aktiv` | Switch | Heizungsstatus (les-/schaltbar) |
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
  comfort_temp: 22.0
  eco_temp: 18.0
  sleep_temp: 17.0
  away_temp_room: 16.0
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
  mode: away  # auto | heat | cool | off | away | vacation

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

# Klimabaustein-Parameter
service: intelligent_heating_control.update_global_settings
data:
  demand_threshold: 20
  demand_hysteresis: 5
  min_on_time: 10
  min_off_time: 5

# Konfiguration exportieren (als HA-Benachrichtigung)
service: intelligent_heating_control.export_config
```

---

## 🏠 IHC Panel (Frontend)

Das Plugin registriert ein eigenes Panel unter dem Seitenleisten-Eintrag **IHC**.

### Tabs im Überblick

#### 📊 Übersicht
- Echtzeit-Raumkarten: Ist/Soll-Temperatur, Anforderungsbalken, Betriebsstatus
- Schnell-Modi: Modus-Chips direkt auf der Karte umschalten
- Boost-Button: 60-Minuten-Komfortmodus per Klick
- Status-Leiste: Außentemperatur, Heizkurven-Ziel, Gesamtanforderung, Systemmodus, Laufzeit, Energie
- Banner für aktive Sonderzustände: Sommer, Nacht, Abwesend, Solar-Boost, Hoher Strompreis

#### 🚪 Zimmer
- Alle Zimmer auflisten mit Modus, Temperatur, Fensterstatus
- Zimmer hinzufügen/bearbeiten/löschen
- Entity-Autocomplete: Vorschläge während der Eingabe von Sensor-IDs
- Bearbeiten-Modal: alle Felder vorausgefüllt (Thermostate, Sensoren, Presets, Offsets)

#### ⚙️ Einstellungen
- Systemmodus manuell setzen
- Temperaturen: Abwesend, Urlaub, Frostschutz, Sommerautomatik
- Nachtabsenkung & Vorheizen
- Klimabaustein: Schwellenwert, Hysterese, Mindestzeiten
- Anwesenheitserkennung: person.* / device_tracker.* auswählen
- Energie & Solar: Kesselleistung, Solar-Sensor, Strompreis-Sensor

#### 📅 Zeitpläne
- Zimmerauswahl per Tab
- Tagesgruppen (Mo–Fr / Sa–So oder beliebige Kombination)
- Zeiträume: Von/Bis, Temperatur, Offset
- Übernacht-Zeiträume möglich
- Lädt bestehende Zeitpläne automatisch

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
| [Erweiterte Konfiguration](docs/advanced.md) | Heizkurve, PID-Logik, Zeitpläne im Detail |

---

## 📁 Projektstruktur

```
intelligent_heating_control/
├── __init__.py            # Setup, Services, Panel-Registrierung
├── manifest.json          # HACS/HA Manifest
├── const.py               # Alle Konstanten und Standardwerte
├── config_flow.py         # Einrichtungs- und Options-Flow
├── coordinator.py         # Zentraler Update-Koordinator (~60s Zyklus)
├── heating_curve.py       # Heizkurven-Logik (lineare Interpolation)
├── schedule_manager.py    # Zeitplan-Verwaltung und -Auswertung
├── heating_controller.py  # Klimabaustein (Anforderungs-Aggregation)
├── climate.py             # Climate-Platform (eine Entity pro Zimmer)
├── sensor.py              # Sensor-Platform
├── switch.py              # Switch-Platform
├── number.py              # Number-Platform (Offsets)
├── select.py              # Select-Platform (Modi)
├── services.yaml          # Service-Definitionen
├── translations/
│   ├── de.json            # Deutsch
│   └── en.json            # Englisch
└── frontend/
    └── ihc-panel.js       # Custom Panel (Vanilla JS Web Component)
```

---

## 🤝 Mitwirken

Beiträge sind herzlich willkommen!

1. Fork des Repositories
2. Feature-Branch erstellen: `git checkout -b feature/mein-feature`
3. Änderungen committen
4. Pull Request öffnen

**Bugs und Feature-Wünsche:** [GitHub Issues](https://github.com/Jedrimos/intelligent-heatingcontroll/issues)

---

## 📋 Roadmap

Sieh dir die [ROADMAP.md](ROADMAP.md) an für alle geplanten Funktionen, darunter:
- Adaptive Heizkurve (Auto-Learning)
- Wettervorhersage-Integration
- Schimmelschutz-Modus
- KI-basierte Temperaturvorhersage
- Lovelace-Card für das HA-Dashboard
- Und vieles mehr

---

## 📝 Lizenz

MIT License – siehe [LICENSE](LICENSE)

## 👤 Mitwirkende

- [@Jedrimos](https://github.com/Jedrimos) – Projektinitiator und Hauptentwickler

---

> **Hinweis:** Dieses Plugin befindet sich in aktiver Entwicklung. Bugs und Feature-Wünsche bitte als [GitHub Issue](https://github.com/Jedrimos/intelligent-heatingcontroll/issues) melden.
