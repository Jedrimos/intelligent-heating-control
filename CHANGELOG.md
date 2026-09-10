# Changelog

Alle nennenswerten Änderungen an diesem Projekt werden hier dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/),
und dieses Projekt folgt [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Geplant
Siehe [ROADMAP.md](ROADMAP.md) für alle geplanten Funktionen (Konfigurations-Assistent,
Schlaf-Temperaturprofil, Passive Solarheizung via Rollosteuerung, u. v. m.).

---

## [2.0.0] - 2026-09-10

Erster Release seit v1.9.2 – markiert den Umstieg von der alten Heizungsschalter-Architektur auf
**TRV-only**. Alles was seit v1.9.2 passiert ist, landet gebündelt in diesem einen Major-Release.

### Entfernt — TRV-only-Architektur

- **Heizungsschalter-/Switch-Modus** komplett entfernt: zentraler Klimabaustein mit Hysterese,
  Min-Ein-/Ausschaltzeiten, Vorlauftemperatur-PID-Regelung
- **Wärmeerzeuger-Modus** (nie fertiggestellt, war für v3.0 geplant: Heizkreise, Pufferspeicher,
  Mischventile, KNX-Raumregler, Wärmepumpen-COP-Optimierung) ersatzlos aus der Roadmap gestrichen
- `CONF_CONTROLLER_MODE` und die komplette switch/trv/hg-Fallunterscheidung im Code entfernt — es
  gibt seit dieser Version nur noch einen Steuerungsmodus: direkte TRV-Ansteuerung
- Dateien entfernt: `flow_temp_pid.py`, `heat_generator_stub.py`
- Switch-only-Einstellungen (Hysterese, Vorlauf-PID) aus Frontend (`05_tab_settings.js`) und
  `services.yaml` entfernt
- `binary_sensor`-Plattform ergänzt (Lüftungsempfehlung, CO₂-Warnung, Ventil-Fehler pro Zimmer)
- **Aktive Kühlung**: TRVs können nicht aktiv kühlen — die optionale Kühlfunktion widersprach der
  TRV-only-Architektur und wurde komplett gestrichen: `CONF_ENABLE_COOLING`, `CONF_COOLING_SWITCH`,
  `CONF_COOLING_TARGET_TEMP`, Systemmodus `cool`. Betroffen: `const.py`, `coordinator.py`
  (inkl. `_set_cooling_switch()`), `climate.py` (`HVACAction.COOLING`), `sensor.py`,
  `config_flow.py`, `select.py`, `services.yaml`, `strings.json`/Übersetzungen, sowie das Frontend
  (Einstellungen-Tab, Dashboard-Systemmodus-Pills, Diagnose-Tab).
  **Nicht betroffen**: die thermische-Masse-Lernfunktion (`avg_cooling_rate`) — eine völlig andere,
  weiterhin aktive Funktion, die die passive Abkühlrate eines Zimmers für Optimum-Stop-Berechnungen
  misst und nichts mit aktiver Kühlung zu tun hat

### Warum

TRVs regeln bereits selbst am Heizkörper; ein zusätzlicher zentraler Kessel-Schalter-Modus ergab
für reine TRV-Setups keinen Mehrwert und verdoppelte jede Konfigurationsänderung (siehe
`CLAUDE.md`, Kapitel 9 „Bug-Analyse"). Der Wärmeerzeuger-Modus wurde nie über den Entwurfsstand
hinaus implementiert.

### Hinzugefügt
- **Wärmebrücken-Erkennung**: vergleicht die gelernte Abkühlrate eines Zimmers mit dem
  Durchschnitt der übrigen Zimmer und zeigt einen Hinweis im Analyse-Tab, wenn es auffällig
  schneller auskühlt (`thermal_bridge`-Attribut, rein informativ, ändert das Heizverhalten nicht)
- **TRV-Offset-Kalibrierungsassistent**: sammelt im Leerlauf (Heizung aus, Fenster zu) die
  Differenz zwischen Raumsensor und TRV-Temperatur und schlägt im Analyse-Tab einen besser
  passenden `trv_temp_offset` vor, sobald genug Messungen vorliegen (`trv_suggested_offset`,
  rein informativ – übernimmt den Wert nicht automatisch)

### Geändert
- `hacs.json`: fehlende `binary_sensor`-Domain ergänzt, `homeassistant`-Mindestversion auf
  `2024.2.0` korrigiert (durch `ClimateEntityFeature.TURN_OFF`/`TURN_ON` in `climate.py` bedingt)
- Repository-URLs in `manifest.json`/`hacs.json` korrigiert (Tippfehler `intelligent-heatingcontroll`)
- **Interne Entwicklerqualität** (kein Verhaltensunterschied für Nutzer):
  - `coordinator.py`: `_async_update_data()` (vormals ~660 Zeilen) in 8 benannte Phasen-Methoden
    zerlegt (`_update_phase_startup_and_timers`, `_update_phase_outdoor_and_adjustments`,
    `_update_phase_window_cascade`, `_process_room`, `_update_phase_aggregate_and_runtime`,
    `_update_phase_apply_trv_setpoints`, `_update_phase_energy_and_ventilation`,
    `_build_update_result`) – reine Extraktion, Reihenfolge und Logik unverändert
  - `pytest`-Testsuite (37 Tests) für `heating_curve.py`, `schedule_manager.py`,
    `heating_controller.py` hinzugefügt, importierbar ohne Home-Assistant-Installation
  - GitHub Actions: hassfest- und HACS-Validierung, pytest-Matrix, JSON/YAML-Sanity-Checks
  - Französische und niederländische Übersetzung ergänzt (`translations/fr.json`, `nl.json`)

### Gefixt
- Persistierter `system_mode: "cool"` aus einer Installation vor 2.0.0 wird beim Laden jetzt
  automatisch auf `auto` zurückgesetzt, statt einen ungültigen Modus zu behalten
- `schedule_manager.get_next_period()` gab `None` zurück statt zum nächsten Wochen-Vorkommen
  zu springen, wenn ein Zimmer nur an einem einzigen Wochentag einen Zeitplan hat und dessen
  letzte Periode für heute bereits vorbei ist
- `translations/de.json` fehlten ~23 Schlüssel neuerer Einstellungen (Solar, Strompreis,
  ETA-Vorheizen, Kalkschutz, Ventil-Fehler-Timeout u. a.) – deutschsprachige Nutzer sahen dort
  rohe Schlüsselnamen statt übersetzter Labels im Options-Dialog
- Frontend-Panel-Cache-Busting-Parameter (`ihc-panel.js?v=...`) war auf `1.6.3` eingefroren
  obwohl der Code weit darüber steht – Browser konnten nach einem Update eine veraltete
  Panel-Version zwischenspeichern

---

## [1.9.0] - 2026-04-12

### Hinzugefügt

- **Fenster-Kaskade**: Lüftet ein Zimmer zu lange, senken konfigurierbare Nachbarräume automatisch
  ab (Ziel-Räume, Verzögerung, Absenkung pro Zimmer konfigurierbar); Dashboard-Alert-Chips mit
  Countdown und Quell-Raum-Anzeige
- **Optimum Start – Lernkurve nach Außentemperatur**: Aufheizzeiten werden getrennt nach
  Außentemperatur-Bucket gelernt (`warmup_curve`), sichtbar als Kurve im Verlauf-Tab
- **Thermische Masse**: gelernte Abkühlrate pro Zimmer (`avg_cooling_rate`) für präzisere
  Vorheiz-Zeitschätzung
- **Fenster-Restore-Modus**: Sollwert nach Fenster-schließen wahlweise aus Zeitplan oder vom Wert
  vor dem Öffnen wiederherstellen
- **Sommermodus – externer Schalter** (`CONF_SUMMER_MODE_ENTITY`) überschreibt die
  Temperatur-Automatik
- **Kälteprognose-Frühstart**: bei kalter Wetterprognose startet die Heizung X Stunden früher,
  Sommerautomatik wird deaktiviert
- **Mehrere Komfort-Verlängerungs-Einträge** (`comfort_extend_entries`): beliebig viele
  Entitäten+Zustände als Auslöser
- **CO₂-Vorheiz-Boost**: kurzes Vorheizen vor dem Lüften bei hohem CO₂-Wert gegen den Kälteschock
- **v1.8 – Feiertags-/Schulferienkalender**: HA-Kalender-Entität → Wochenend-Zeitplan oder
  Komfort-Modus an Feiertagen
- **v1.8 – CO₂-Prognose**: `co2_ventilation_eta_minutes` berechnet die voraussichtliche Zeit bis
  zur Lüftungsempfehlung
- **v1.8 – Energiepreis-Chart**: Tibber/Nordpool-Stundenpreise als Balkendiagramm im Diagnose-Tab
- **v1.8 – Peak Shaving**: gestaffelter Heizungsstart verhindert Lastspitzen bei synchronem
  Anforderungsanstieg

### Gefixt
- `forecast_coldnight_active` war nie im Frontend sichtbar → Kälteprognose-Banner blieb immer aus
- `pid_kp`/`ki`/`kd` wurden nach Panel-Reload immer auf Standardwerte zurückgesetzt
- TRV: kein falsches „manuell" mehr während des Vorheizfensters
- Laufzeit/kWh folgt jetzt exakt dem HVAC-Heating-Signal statt der berechneten Anforderung (TRV-Modus)
- HVAC-Idle-Bug: `hvac_action` zeigte „heating" obwohl der Raum bereits beim Sollwert war
- `avg_warmup_minutes` war im Frontend unsichtbar trotz vorhandener Backend-Daten
- Startup-Crash bei unavailable Zigbee/Z-Wave-Sensoren behoben (letzter bekannter Wert 30 min)
- Massiv reduziertes Schreibvolumen in HA-Recorder/`.storage` (Performance)
- Mehrere Panel-Einstellungen-Bugs (Sichtbarkeit, Felder, `services.yaml`)
- Stuck-Valve-`AttributeError` bei Ventilen ohne `valve_position`-Attribut
- Komfort-Verlängerung: Grund wird jetzt im Dashboard angezeigt
- `min_temp`/`max_temp` fehlten in Add/Edit-Room-Modals und climate-Attributen

---

## [1.6.3] - 2026-04-03

### Hinzugefügt

- **Bestätigungs-basierte TRV-Override-Erkennung**: `_trv_cmd_pending[entity_id]` verfolgt
  gesendete Sollwerte; ein Override wird erst erkannt, wenn der TRV den Wert zurückmeldet (oder
  nach 600 s Timeout) — kein falsches „manuell" mehr nach einem Zeitplanwechsel bei langsamen
  Zigbee2MQTT-, Z-Wave- oder Homematic-TRVs
- **ETA-Vorheizen vollständig**: nicht nur Zeitplanfenster-Verlängerung, sondern auch
  HA-Schedule-Off-Mode-Fallback und IHC-Schedule-kein-nächster-Zeitraum-Fallback heizen bei naher
  Ankunft (`CONF_ETA_PREHEAT_THRESHOLD_MINUTES`, Standard 90 min) auf Komfort vor; Diagnose-Tab
  zeigt Live-ETA-Status mit Ankunfts-Tabelle
- **Solltemperatur-Verlauf im Chart**: `target_history` parallel zu `temp_history`, gleicher
  Ringpuffer-Takt, persistiert über HA-Neustarts hinweg; oranger Stufenlinienzug im Verlauf-Tab
- **Presence Away Pending Status**: neue Attribute `presence_away_pending` und
  `presence_away_pending_minutes_remaining` in `sensor.ihc_gesamtanforderung`
- `services.yaml` um alle bisher fehlenden Felder ergänzt (`trv_*`, `window_*`,
  `room_temp_threshold`, `comfort_temp_entity`, `eco_temp_entity`, `boost_temp`,
  `aggressive_mode_*`, `presence_*`, `eta_preheat_*`, `heating_period_entity`,
  `startup_grace_seconds`)

---

## [1.3.0] - 2026-03-23

### Hinzugefügt

#### Pro-Zimmer HA-Geräte
- Jedes konfigurierte Zimmer erscheint jetzt als **eigenes Gerät** in Einstellungen → Geräte & Dienste
- Alle Zimmer-Entitäten (Climate, Sensoren, Binary Sensors) sind dem Zimmer-Gerät zugeordnet
- Zimmer-Geräte sind via `via_device` mit dem zentralen Hub-Gerät verknüpft
- Übersichtlichere Geräteverwaltung, besonders ab 3+ Zimmern

#### TRV-Batteriestatus
- IHC liest jetzt den Akkustand aller konfigurierten TRV-Entitäten aus (`battery`, `battery_level` Attribut)
- Dashboard-Kachel zeigt Batterie-Chip: 🔋 grün (≥ 40 %), orange (20–39 %), 🪫 rot (< 20 %)
- Rote Alert-Leiste wenn ein TRV unter 20 % fällt: *„🔋 TRV-Batterie schwach – bitte tauschen"*
- Batterie-Badge auch im Zimmer-Detail-Header sichtbar
- Neue Attribute in `climate.*`: `trv_min_battery`, `trv_low_battery`

#### Temperaturverlauf-Chart im Zimmer-Detail
- Neuer Sub-Tab **📈 Verlauf** im Zimmer-Detail (neben Zeitplan / Wochenansicht)
- SVG-Chart mit den stündlichen Temperatur-Snapshots der letzten 7 Tage
- X-Achse: Wochentag + Uhrzeit, Y-Achse: °C mit Labels
- Gestrichelte orange Linie zeigt aktuelle Zieltemperatur
- Statistik-Zeile: Min / Max / Ø / Messpunkte

#### Manueller Override – Reset-Zeitpunkt sichtbar
- Dashboard-Footer zeigt `↩ Reset HH:MM Uhr` statt `📅 HH:MM` wenn ein Zimmer im Modus **Manuell** ist (nach TRV-Eingriff)
- Zimmer-Detail-Header: lila Badge `↩ Reset HH:MM Uhr` wenn `manual` + nächster Zeitplan-Eintrag vorhanden

#### Luftfeuchtigkeit als eigene Sensor-Entität
- Neue Entität `sensor.ihc_<zimmer>_luftfeuchtigkeit` (device_class: `humidity`, Einheit: `%`)
- Wird automatisch erstellt wenn ein `humidity_sensor` im Zimmer konfiguriert ist
- Attribute: `dew_point` (Taupunkt), `mold_risk`, `threshold`
- Nutzbar für Automationen, Verlaufsdiagramme und Lovelace direkt

### Gefixt

#### Lüftungsempfehlungssensor – AttributeError bei fehlendem Sensor
- **Bug:** `binary_sensor.ihc_*_lueftungsempfehlung` warf einen `AttributeError` wenn kein CO₂- oder Feuchtigkeitssensor Daten lieferte. Ursache: `room.get("ventilation", {})` gibt `None` zurück wenn der Key explizit auf `None` steht — der Default `{}` greift nur bei fehlendem Key.
- **Fix:** `or {}` statt Default-Argument in allen Sensor-Properties.

#### Lüftungsempfehlung – falsche Dauerwarnung
- **Bug:** Die Lüftungsempfehlung wertete `Innentemperatur − Außentemperatur` aus.
  In der Heizperiode ist diese Differenz immer 10–20 °C → dauerhaft „Lüften empfohlen" ohne jeden Sensor.
- **Fix:** Temperaturunterschied-Logik komplett entfernt. Die Empfehlung basiert jetzt ausschließlich auf CO₂ (ppm) und/oder Luftfeuchtigkeit (%).

#### Lüftungsempfehlung – Ghost-Entitäten für sensorlose Zimmer
- **Bug:** `binary_sensor.ihc_*_lueftungsempfehlung` wurde für alle Zimmer erstellt, auch ohne Feuchte- oder CO₂-Sensor.
- **Fix:** Entität wird nur noch erstellt wenn `humidity_sensor` ODER `co2_sensor` konfiguriert ist.

#### icon.png – falsche Größe im Repository-Root
- **Bug:** `icon.png` im Repository-Root war 359×354 px — HACS zeigt das Bild in der Store-Übersicht nicht an wenn es nicht exakt 256×256 px ist.
- **Fix:** Root- und `images/`-Kopie auf 256×256 px skaliert (identisch mit der bereits korrekten Version in `custom_components/`).

#### Browser-Cache – altes Frontend nach Update
- **Bug:** HA-Panel lädt `ihc-panel.js` ohne Versions-Parameter → Browser cacht die alte Datei auch nach einem IHC-Update.
- **Fix:** JS-URL enthält jetzt `?v=1.3.0`; bei zukünftigen Releases muss der Parameter entsprechend erhöht werden.

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
