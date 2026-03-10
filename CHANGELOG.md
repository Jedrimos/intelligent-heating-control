# Changelog

Alle nennenswerten Änderungen an diesem Projekt werden hier dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/),
und dieses Projekt folgt [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Geplant
- Adaptive Heizkurve (Auto-Learning)
- Wettervorhersage-Integration
- ETA-basiertes Vorheizen bei Heimkehr
- Schimmelschutz-Modus (Temperatur + Luftfeuchte)
- Anforderungs-Heatmap im Dashboard

---

## [1.0.1] - 2026-03-10

### Behoben

#### Frontend Panel
- **Entity-Autocomplete**: Texteingaben für Temperatursensor, Thermostate/TRVs und Fenstersensoren im „Zimmer hinzufügen"- und „Zimmer bearbeiten"-Modal zeigen jetzt Vorschläge aus dem HA-Entitäten-Katalog während der Eingabe (`<datalist>`-basiert)
- **Zimmer bearbeiten – vorausgefüllt**: Das Bearbeiten-Modal lädt jetzt alle bestehenden Konfigurationsdaten korrekt vor (Thermostate, Fenstersensoren, Temperatursensor, Temperatur-Presets, Offset, Totband, Gewichtung) statt leere Felder anzuzeigen
- **Zimmer bearbeiten – speichert alle Felder**: Die Bestätigung im Edit-Modal speichert nun alle Felder via `update_room` Service statt nur den Betriebsmodus
- **Heizkurve laden**: Der Heizkurven-Tab zeigt jetzt die tatsächlich konfigurierte Kurve aus den Sensor-Attributen statt immer die Standardkurve (Hardcode)
- **Heizkurve speichern**: War komplett defekt – hat nur `reload` aufgerufen ohne die Kurve zu speichern. Ruft jetzt korrekt `update_global_settings` mit den Kurvenpoints auf
- **Zeitpläne laden**: Der Zeitplan-Tab lädt jetzt die tatsächlich gespeicherten Zeitpläne des Zimmers statt immer Beispielzeitpläne anzuzeigen
- **Neue Entitätszeilen**: Beim Klick auf `+` in Thermostat/Fenstersensor-Listen erhalten neue Zeilen ebenfalls die korrekte Datalist für Autocomplete

#### Backend
- **`update_global_settings` Service**: `heating_curve` fehlte in der Liste erlaubter Keys → Heizkurve konnte nie über das Panel gespeichert werden
- **Climate-Entity Attribute**: `extra_state_attributes` exposen jetzt alle Raumkonfigurationsdaten (`temp_sensor`, `valve_entities`, `window_sensors`, `schedules`, alle Temperatur-Presets, `room_offset`, `deadband`, `weight`) → Grundlage für das Frontend-Laden
- **Kurven-Sensor Attribute**: `IHCCurveTargetSensor` exposes `curve_points` als Attribut → Grundlage für das Laden der Heizkurve im Panel

---

## [1.0.0] - 2026-03-09

### Erstveröffentlichung

#### Hinzugefügt

##### Kernfunktionen
- **Heizkurve (Außentemperaturgeführte Regelung)**
  - Lineare Interpolation zwischen konfigurierbaren Kurven-Punkten
  - Bis zu 7 Stützpunkte, Graphen-Vorschau mit Canvas
  - Automatischer Fallback auf Komforttemperatur ohne Außensensor
- **Zimmer-Offset per Raum**
  - Individueller ±5 °C Offset zur Heizkurven-Basistemperatur
  - Laufzeit-anpassbar via `number.ihc_<zimmer>_offset` Entität
- **Zeitpläne mit Offset**
  - Wöchentliche Zeitpläne mit beliebig vielen Tagesgruppen und Zeiträumen
  - Pro Zeitraum: eigene Temperatur + eigener Offset
  - Formel: `Ziel = Zeitplan-Temp + Zeitplan-Offset + Zimmer-Offset`
  - Übernacht-Zeiträume unterstützt (z.B. 22:00–06:00)

##### Klimabaustein (Loxone-Style)
- Proportionale Anforderungsberechnung pro Zimmer (0–100 %)
- Gewichteter Durchschnitt aller Zimmeranforderungen
- Konfigurierbare Einschaltschwelle (Standard: 15 %)
- Hysterese für stabilen Betrieb (Standard: 5 %)
- Mindest-Einschaltzeit und Mindest-Ausschaltzeit (Kesselschutz)
- Mindestanzahl Zimmer mit Anforderung als Bedingung

##### Betriebsmodi
- **Systemmodi**: Automatisch, Heizen, Kühlen, Aus, Abwesend, Urlaub
- **Zimmermodi**: Automatisch, Komfort, Eco, Schlafen, Abwesend, Aus, Manuell
- Temperatur-Presets pro Zimmer: Komfort, Eco, Schlaf, Abwesend
- Globale Abwesend- und Urlaubstemperatur
- Frostschutz-Temperatur (wirkt auch im OFF/Urlaub-Modus)

##### Zimmersteuerung
- Temperatursensor pro Zimmer
- Direkte Thermostat/TRV-Steuerung (climate-Entities)
- **Mehrere TRVs pro Zimmer** (valve_entities Liste)
- **Mehrere Fenstersensoren pro Zimmer** (window_sensors Liste)
- Fenster-offen-Erkennung via Binärsensor
- Min/Max Temperaturgrenzen pro Zimmer
- Zimmergewichtung für Klimabaustein

##### Erweiterte Funktionen (Roadmap 1.2–1.4 Basis)
- **Anwesenheitserkennung**: Automatischer Abwesend-Modus wenn alle konfigurierten Personen weg sind
- **Nachtabsenkung**: Sonnenstandsbasiert mit konfigurierbarem Offset
- **Vorheizen (Pre-Heat)**: Heizstart X Minuten vor Zeitplan-Beginn
- **Boost-Funktion**: Zeitlich begrenzter Komfortmodus pro Zimmer (Service + UI-Button)
- **Sommerautomatik**: Heizung gesperrt wenn Außentemperatur über Schwellenwert
- **Solar-Überschuss-Heizung**: Temperatur-Boost wenn Solar-Leistung > Schwellenwert
- **Dynamischer Strompreis**: Eco-Modus bei hohem Energiepreis
- **Vorlauftemperatur-Steuerung**: Weiterleitung an `number.*` Entity
- **Temperaturhistorie**: Letzten N Messwerte pro Zimmer als Sparkline
- **Aufheiz-Zeitverfolgung**: Ø Minuten bis Zieltemperatur erreicht

##### Home Assistant Integration
- Config Flow (3-Schritt Einrichtung)
- Options Flow (Zimmer verwalten, Heizkurve, alle Einstellungen)
- 5 HA-Platforms: `climate`, `sensor`, `switch`, `number`, `select`
- Deutschsprachige Übersetzungen (`de.json`)
- Englischsprachige Übersetzungen (`en.json`)
- HA-Services: `add_room`, `remove_room`, `update_room`, `set_room_mode`, `set_system_mode`, `boost_room`, `update_global_settings`, `export_config`, `reload`
- HACS-kompatibel (`hacs.json`)

##### Frontend Panel
- Eigenes Panel in der HA-Seitenleiste (`IHC`)
- **Tab „Übersicht"**: Echtzeit-Raumkarten mit Temperaturen, Anforderungen, Modus-Chips, Boost-Button; Klima-Status-Leiste; Sommer/Nacht/Präsenz-Banner
- **Tab „Zimmer"**: Zimmerverwaltung mit Hinzufügen/Bearbeiten/Löschen
- **Tab „Einstellungen"**: Systemmodus, Temperaturen, Nachtabsenkung, Klimabaustein, Anwesenheit, Energie/Solar
- **Tab „Zeitpläne"**: Wöchentlicher Zeitplan-Editor pro Zimmer
- **Tab „Heizkurve"**: Kurven-Editor mit Canvas-Vorschau und Außentemperatur-Marker
- Auto-Refresh alle 5 Sekunden (nur Übersicht-Tab)
- Toast-Benachrichtigungen für Aktionen
- Modal bleibt bei HA-State-Updates offen (kein DOM-Reset)
- Responsive Design (Mobile-optimiert)

---

## Geplante Versionen (Roadmap)

Siehe [ROADMAP.md](ROADMAP.md) für Details zu allen geplanten Funktionen.
