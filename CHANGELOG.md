# Changelog

Alle nennenswerten Änderungen an diesem Projekt werden hier dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/),
und dieses Projekt folgt [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Geplant
- ETA-basiertes Vorheizen bei Heimkehr
- Anforderungs-Heatmap im Dashboard
- Temperaturverlauf-Graph (24h Ist/Soll/Außen)
- Passive Solar Heating via Rollosteuerung (v2.1)
- Wärmeerzeuger-Modus: Heizkreise, Puffer, Wärmepumpe, TWW (v3.0)

---

## [1.2.0] - 2026-03-22

### Hinzugefügt

#### Außentemperaturgeführte Preset-Temperaturen (Breaking Change)
- **Alle Zimmer-Temperaturen werden jetzt von der Heizkurve geführt** statt als feste Werte konfiguriert
- `comfort_temp` = Heizkurven-Zielwert (dynamisch, Außentemperatur-abhängig)
- `eco_temp` = Komfort − konfigurierbarer `eco_offset` (Standard: 3 °C)
- `sleep_temp` = Komfort − konfigurierbarer `sleep_offset` (Standard: 4 °C)
- `away_temp` = Komfort − konfigurierbarer `away_offset` (Standard: 6 °C)
- Pro Modus ein konfigurierbares **Maximum** (`eco_max_temp`, `sleep_max_temp`, `away_max_temp`) damit die Werte in milden Perioden nicht zu hoch werden
- Effektive Ist-Werte werden als `comfort_temp_eff`, `eco_temp_eff`, `sleep_temp_eff`, `away_temp_eff` in den Climate-Attributen exposes und im Bearbeiten-Dialog angezeigt
- `comfort_temp` bleibt als Fallback-Wert wenn kein Außensensor konfiguriert ist

#### HA Schedule-Integration (Zeitplan-Entitäten aus HA)
- Pro Zimmer können beliebig viele bestehende **`schedule.*`-Entitäten** als Heizplan eingebunden werden
- Jede Bindung konfiguriert: Entität, Temperaturmodus (Komfort/Eco/Schlaf/Abwesend) und optionale Bedingung
- **Bedingungsentität**: eine `input_boolean.*`, `binary_sensor.*`, `person.*` oder andere Entität schaltet zwischen Zeitplänen um (z. B. Kinderzimmer: Zeitplan A wenn Kinder zuhause, Zeitplan B wenn nicht)
- `ha_schedule_off_mode`: Wählbar ob bei keinem aktiven Zeitplan Eco- oder Schlaf-Temperatur verwendet wird
- Priorität: HA-Zeitpläne greifen vor internen Zeitplänen im Auto-Modus

#### Anwesenheit → Abwesend (statt Eco)
- Wenn die Anwesenheitserkennung niemanden zuhause erkennt, wird jetzt die **Abwesend-Temperatur** verwendet (outdoor-geführt) statt der Eco-Temperatur
- Quelle im Frontend: `🚶 Abwesend` statt `🚶 Eco (leer)`

#### Wettervorhersage in der Heizregelung
- Neuer Parameter `weather_cold_boost`: Temperatur-Boost (°C) der bei einer Kältewarnung automatisch auf alle Zimmer angewendet wird
- `weather_cold_threshold`: Prognostizierte Temperatur unter der eine Kältewarnung ausgelöst wird
- Beide Parameter konfigurierbar im Panel → Einstellungen → Hardware & Sensoren

#### Wetteranzeige verbessert
- Wetterbedingungen werden jetzt auf **Deutsch** angezeigt mit großem Emoji
- Alle 15 Standard-HA-Wetterzustände übersetzt (sonnig, bewölkt, Regen, Schnee, Gewitter etc.)
- Temperaturbereich (min/max) aus Tagesvorhersage

#### Gäste-Modus
- Neuer Systemmodus `guest` für temporären Komfortbetrieb aller Zimmer
- Konfigurierbare Dauer in Stunden (`guest_duration_hours`)

#### Schimmelschutz pro Zimmer
- Pro Zimmer optionaler `humidity_sensor` (Luftfeuchtigkeit)
- `mold_protection_enabled`: Automatische Temperaturerhöhung bei Schimmelrisiko
- Mold-Status als Attribut `mold` in der Climate-Entität (Risikostatus + Taupunkt)

#### Übersicht-Tab neu gestaltet
- **Hero-Bereich** oben: Heizstatus | Gesamtanforderung | Systemmodus — mit Dropdown direkt bedienbar
- **Override-Banner** pro Raumkarte wenn Systemmodus den Zimmermodus übersteuert
- **Temperatur-Differenz-Indikator** (↑/↓/≈) zeigt ob Raum noch aufheizt oder Ziel bereits erreicht
- Zimmer sortiert nach Priorität: Heizt > Fenster offen > Anforderung > Zufrieden > Aus
- Wetterbereich in der Statusleiste nutzt deutschen Namen + Emoji

#### Zeitpläne + Kalender als Zimmer-Sub-Tabs
- Zeitpläne und Kalenderansicht sind nicht mehr globale Tabs, sondern **Sub-Tabs direkt im Zimmer-Detail**
- Bessere UX: Zeitplan-Bearbeitung immer im Kontext des ausgewählten Zimmers

#### Einstellungen erweitert
- `sun_entity` jetzt im Panel konfigurierbar (war bisher nur über Config-Flow zugänglich)
- `weather_cold_threshold` und `weather_cold_boost` im Panel konfigurierbar
- TRV-spezifische Einstellungen jetzt im Panel sichtbar (Hardware & Steuerung)
- Switch-only Einstellungen (adaptive Heizkurve, Hysterese, PID) werden im TRV-Modus ausgeblendet

#### TRV-Modus: Komplett überarbeitet
- **Ventilposition als primäres Anforderungssignal**: TRV-Modus nutzt 60% Ventilposition + 40% Temperaturdelta
- Switch-Modus optional: 30% Ventilposition + 70% Temperaturdelta mit Klemmung
- Kompatibel mit allen gängigen TRV-Typen (Zigbee2MQTT: `valve_position`, Z-Wave: `position`, Eurotronic: `pi_heating_demand`)
- **Setpoint-Quantisierung auf 0,5 °C-Schritte**: reduziert unnötige Funk-Übertragungen, schont TRV-Akkus
- **Phantom-Anforderung verhindert**: Wenn TRV-Temp bereits über Sollwert → demand = 0
- **Laufzeitmessung via Ventilposition**: Ventilposition > 8% gilt als „Zimmer heizt aktiv" — direktes Signal
- Temperatur-Blending: Raumsensor primär, TRV-Temp als Fallback oder gewichtet konfigurierbar (`trv_temp_weight`)

#### Event-getriebene Fenstererkennung
- Fenstersensoren lösen jetzt **sofort** via `async_track_state_change_event` aus — vorher gab es einen fixen 60-Sekunden-Polling-Delay
- Konfigurierte Reaktions- und Schließverzögerungen bleiben erhalten
- Beim Wechsel von `off` → `auto`: alle Fensterzustände sofort eingelesen (`_prefill_window_states`)

#### Startup-Gnadenfrist für Zigbee / Z-Wave
- Neue Einstellung `startup_grace_seconds` (Standard: 60 s): während dieser Zeit werden `unavailable`-Zustände von Temperatursensoren nicht als Fehler gewertet
- Verhindert falsche Anforderungen direkt nach einem HA-Neustart

#### Config-Flow vollständig synchronisiert
- Add-Room und Edit-Room Modal haben jetzt denselben Funktionsumfang
- CO₂-Sensor + Schwellwert im Add-Modal ergänzt
- Raum-Anwesenheitsliste (`room_presence_entities`) im Add-Modal ergänzt
- Boost-Temperatur (`boost_temp`) + Standard-Dauer im Add-Modal ergänzt
- TRV-Felder: `trv_temp_weight`, `trv_temp_offset`, `trv_min_send_interval` in config_flow + Add-Modal

#### Neue Services
Vier weitere Services sind jetzt vollständig registriert und in `services.yaml` dokumentiert:
- `export_config` – Konfiguration als JSON-Event + Browser-Download ausgeben
- `activate_guest_mode` – Gäste-Modus mit optionaler Dauer aktivieren
- `deactivate_guest_mode` – Gäste-Modus sofort beenden
- `reset_stats` – Laufzeit- und Energiestatistiken zurücksetzen

#### Backup & Restore
- **Export** direkt als `.json`-Datei im Browser herunterladen (kein Umweg über HA-Benachrichtigung)
- **Import** via Datei-Upload: globale Einstellungen + alle Zimmer werden automatisch via Services eingespielt
- Backup & Restore Layout repariert

#### Gelernte Werte zurücksetzen
- **Einstellungen → Intelligente Regelung**: Reset-Button setzt Kurvenkorrektur + Aufheizzeiten-Historie zurück
- `reset_stats`-Service nimmt optionalen Parameter `reset_curve: true`
- **Backup & Restore**: Zwei separate Reset-Buttons (Gelernte Werte / Tages-Statistiken getrennt)

#### HACS-Kompatibilität
- `icon.png` auf exakt **256×256 px** skaliert (HACS-Pflicht, war 359×354 px)
- `strings.json` erstellt (HA lädt ConfigFlow-Übersetzungen daraus, Pflichtdatei)

### Geändert

- **Temperatur-Presets** (eco/sleep/away) sind nicht mehr als feste °C-Werte konfigurierbar, sondern als Abzug (`_offset`) + Maximum (`_max_temp`) relativ zur Heizkurve
- `room_presence_eco`-Quelle umbenannt zu `room_presence_away` (reflektiert das tatsächliche Verhalten)
- `ROOM_MODE_AWAY` bei explizitem Zimmer-Abwesend-Modus nutzt jetzt ebenfalls den outdoor-geregelten `away_base`-Wert
- `datetime.utcnow()` → `datetime.now(timezone.utc)` (Python 3.12 deprecated + Timezone-Konsistenz)
- `SERVICE_UPDATE_GLOBAL_SETTINGS`: War als Magic-String codiert → jetzt Konstante in `const.py`
- Veraltete Konstante `CONF_PRESENCE_ENTITY` (Singular) entfernt; `CONF_PRESENCE_ENTITIES` (Plural) ist die korrekte Variante

### Behoben

#### Frontend
- **Override-Banner ReferenceError**: `systemOverrides` und `overrideLabel` wurden nach dem `.map()`-Callback definiert, in dem sie schon verwendet wurden → Banner hat nie angezeigt
- **Systemmodus-Buttons im Dashboard**: `querySelector` → `querySelectorAll + data-sysmode` (Elemente existierten nach UI-Refactor nicht mehr)
- **Stale srcMap-Eintrag**: `room_presence_away` hatte keine Zuordnung im srcMap → roher String statt Label angezeigt
- **Dashboard-Crash**: `systemOverrides`/`overrideLabel` Hoisting-Bug behoben
- **TRV-Reaktionszeiten**: Frontend sendete `parseFloat()` wo Backend `int()` erwartet — behoben auf `parseInt()`
- **Schimmelschutz-Select**: CSS-Klasse von `form-input` auf `form-select` korrigiert

#### Heizlogik
- **Phantom-Anforderung**: TRV-Temp > Sollwert → demand wird korrekt auf 0 gesetzt
- **Frostschutz im Aus-Modus**: Dashboard zeigte 7 °C statt „Aus"; Notfall-Frostschutz nur bei echten Minusgraden
- **Modus „Aus"**: Climate-Entitäten zeigen jetzt `HVACMode.OFF` statt Komforttemperatur
- **Demand-Gate**: `override_demand()` synct HeatingController korrekt
- **CONF_BOOST_TEMP**: Typfehler (String statt float) + KeyError-Fix
- **CONF_HA_SCHEDULES**: Fehlte beim Zimmer-Erstellen → KeyError behoben
- **Window-Listener-Unsub-Bug**: Listener wurde beim Reload nicht korrekt abgemeldet → Memory Leak behoben

#### Konfiguration & Services
- **HA-Startup-Crash**: `CONF_WINDOW_OPEN_TEMP` wurde in `coordinator.py` importiert, aber in `const.py` gelöscht
- **4 Services fehlten in `services.yaml`**: `export_config`, `activate_guest_mode`, `deactivate_guest_mode`, `reset_stats`
- **HA-Zeitplan Config-Entry-Lookup**: `unique_id = entry_id` Fallback verbessert
- **CONF_ROOM_PRESENCE_ENTITIES**: Fehlte im config_flow Add-Room Schema
- **CONF_BOOST_TEMP**: Fehlte im config_flow Add-Room Schema + Add-Room Modal

#### HACS & HA-Kompatibilität
- **HA 2024.2+**: `ClimateEntityFeature.TURN_OFF` / `TURN_ON` ergänzt (HA 2024.2 Pflicht)
- **Dashboard Systemmodus-Pill**: Optimistisches UI-Update — Pill-Farbe wechselt sofort beim Klick

---

## [1.0.1] - 2026-03-10

### Behoben

#### Frontend Panel
- **Entity-Autocomplete**: Texteingaben für Temperatursensor, Thermostate/TRVs und Fenstersensoren im „Zimmer hinzufügen"- und „Zimmer bearbeiten"-Modal zeigen jetzt Vorschläge aus dem HA-Entitäten-Katalog während der Eingabe (`<datalist>`-basiert)
- **Zimmer bearbeiten – vorausgefüllt**: Das Bearbeiten-Modal lädt jetzt alle bestehenden Konfigurationsdaten korrekt vor
- **Zimmer bearbeiten – speichert alle Felder**: Die Bestätigung im Edit-Modal speichert nun alle Felder via `update_room` Service
- **Heizkurve laden**: Zeigt jetzt die tatsächlich konfigurierte Kurve statt immer die Standardkurve
- **Heizkurve speichern**: Ruft jetzt korrekt `update_global_settings` mit den Kurvenpoints auf
- **Zeitpläne laden**: Lädt jetzt die tatsächlich gespeicherten Zeitpläne statt Beispieldaten
- **Neue Entitätszeilen**: Beim Klick auf `+` erhalten neue Zeilen ebenfalls die korrekte Datalist

#### Backend
- **`update_global_settings` Service**: `heating_curve` fehlte in der Liste erlaubter Keys
- **Climate-Entity Attribute**: `extra_state_attributes` exposen jetzt alle Raumkonfigurationsdaten
- **Kurven-Sensor Attribute**: `IHCCurveTargetSensor` exposes `curve_points` als Attribut

---

## [1.0.0] - 2026-03-09

### Erstveröffentlichung

#### Hinzugefügt

##### Kernfunktionen
- **Heizkurve** – Außentemperaturgeführte Basistemperatur mit konfigurierbaren Stützpunkten (lineare Interpolation)
- **Klimabaustein** – Loxone-artiger zentraler Regler, aggregiert alle Zimmeranforderungen gewichtet
- **Zeitpläne** – Wöchentliche Zeitpläne mit Tagesgruppen, eigener Temperatur und Offset je Zeitraum
- **Multi-TRV**: Mehrere Thermostate + Fenstersensoren pro Zimmer
- **Boost-Funktion**: Zeitlich begrenzter Komfortmodus per Button oder Service
- **Anwesenheitserkennung**: Automatischer Abwesend-Modus wenn niemand zuhause
- **Nachtabsenkung**: Sonnenstandsbasiert mit konfigurierbarem Offset
- **Vorheizen (Pre-Heat)**: Heizstart X Minuten vor Zeitplan-Beginn
- **Sommerautomatik**: Heizung gesperrt wenn Außentemperatur über Schwellenwert
- **Solar-Überschuss-Heizung**: Temperatur-Boost bei Solarüberschuss
- **Dynamischer Strompreis**: Eco-Modus bei hohem Energiepreis
- **Vorlauftemperatur-Steuerung**: Weiterleitung an `number.*` Entity
- **Frostschutz**: Greift auch bei OFF/Urlaub-Modus
- **Config Flow** (3-Schritt Einrichtung) + Options Flow
- **5 HA-Platforms**: `climate`, `sensor`, `switch`, `number`, `select`
- **Custom Panel** mit 5 Tabs in der HA-Seitenleiste
- **HACS-kompatibel**

---

## Geplante Versionen (Roadmap)

Siehe [ROADMAP.md](ROADMAP.md) für Details zu allen geplanten Funktionen.
