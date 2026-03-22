# 🌡️ Intelligent Heating Control v1.2.0

> **Breaking Change**: Temperatur-Presets (Eco / Schlaf / Abwesend) sind nicht mehr als feste °C-Werte konfigurierbar — sie folgen jetzt der Außentemperatur-Heizkurve.

---

## ✨ Was ist neu?

### 🌡️ Alle Temperaturen outdoor-geregelt

Sämtliche Preset-Temperaturen folgen jetzt der Heizkurve:

```
comfort_base  = Heizkurve(Außentemperatur)
eco_base      = min(eco_max_temp,    comfort_base − eco_offset)   [Standard: Komfort − 3 °C]
sleep_base    = min(sleep_max_temp,  comfort_base − sleep_offset) [Standard: Komfort − 4 °C]
away_base     = min(away_max_temp,   comfort_base − away_offset)  [Standard: Komfort − 6 °C]
```

Pro Modus konfigurierbar: Offset (Abzug) + Maximum (Deckelung bei milden Perioden). Alles **pro Zimmer** einstellbar.

Die aktuell berechneten Effektivwerte (`comfort_temp_eff`, `eco_temp_eff`, `sleep_temp_eff`, `away_temp_eff`) sind im Zimmer-Bearbeiten-Dialog und als Climate-Attribute sichtbar.

---

### 📅 HA Schedule-Integration

Bestehende **`schedule.*`-Entitäten** aus Home Assistant können jetzt als Heizplan pro Zimmer eingebunden werden:

- Beliebig viele Bindungen pro Zimmer
- Jede Bindung hat: Entity, Temperaturmodus (Komfort/Eco/Schlaf/Abwesend) und optionale Bedingungsentität
- **Bedingungsentität**: z.B. Kinderzimmer – Zeitplan A wenn Kinder zuhause, Zeitplan B wenn nicht
- **`ha_schedule_off_mode`**: Wählbar ob bei keinem aktiven HA-Zeitplan Eco- oder Schlaf-Temperatur gilt
- HA-Zeitpläne haben Vorrang vor internen Zeitplänen

---

### 🚶 Anwesenheit → Abwesend-Temperatur

Wenn niemand zuhause ist, verwendet IHC jetzt die **outdoor-geregelte Abwesend-Temperatur** statt der Eco-Temperatur. Im Frontend: `🚶 Abwesend` (bisher: `🚶 Eco (leer)`).

---

### 🌦️ Wettervorhersage in der Heizregelung

- `weather_cold_boost`: Automatischer Temperatur-Boost bei Kältewarnung
- `weather_cold_threshold`: Prognostizierte Temperatur als Auslöser
- Konfigurierbar im Panel → Einstellungen → Hardware & Sensoren

---

### 🌤️ Wetteranzeige verbessert

- Wetterbedingungen auf **Deutsch** mit großem Emoji
- Alle 15 Standard-HA-Wetterzustände übersetzt
- Temperaturbereich (min/max) aus Tagesvorhersage

---

### 🧳 Gäste-Modus

Neuer Systemmodus `guest` für temporären Komfortbetrieb aller Zimmer:
- Konfigurierbare Dauer in Stunden (`guest_duration_hours`)
- Per Panel, Service oder Automation aktivierbar

---

### 💧 Schimmelschutz pro Zimmer

- Optionaler `humidity_sensor` pro Zimmer
- Taupunktberechnung + automatische Temperaturerhöhung bei Schimmelrisiko
- Mold-Status als Attribut `mold` in der Climate-Entität

---

### 🖥️ Übersicht-Tab neu gestaltet

- **Hero-Bereich**: Heizstatus | Gesamtanforderung | Systemmodus — mit Dropdown direkt bedienbar
- **Override-Banner** pro Raumkarte wenn Systemmodus den Zimmermodus übersteuert
- **Temperatur-Differenz-Indikator** (↑/↓/≈)
- Zimmer sortiert nach Priorität: Heizt > Fenster offen > Anforderung > Zufrieden > Aus

---

### 🔧 TRV-Intelligenz — Komplett überarbeitet

Thermostatic Radiator Valves werden jetzt deutlich präziser angesteuert:

**Ventilposition als primäres Anforderungssignal:**

```
TRV-Modus:     demand = temp_demand × 0.40 + valve_position × 0.60
Switch-Modus:  demand = temp_demand × 0.70 + valve_position × 0.30
```

Der TRV-interne Regler entscheidet bereits ob und wie weit das Ventil öffnet — diese Information wird jetzt direkt genutzt statt zu ignorieren. Kompatibel mit allen gängigen TRV-Typen:

| Hersteller | Attribut |
|------------|----------|
| Zigbee2MQTT TRVs | `valve_position` |
| Z-Wave TRVs | `position` |
| Eurotronic / Spirit | `pi_heating_demand` |

**TRV-Temperatur für Anforderung, Raumsensor für Komfort:**
- Die TRV-Temperatur (direkt am Heizkörper) reagiert schneller als Raumluft → wird für die Anforderungsberechnung genutzt
- Der Raumsensor bleibt Referenz für Ist-Temperatur-Anzeige, Fenster- und Schimmelerkennung

**Phantom-Anforderung verhindert:**
Wenn die TRV-Temperatur bereits über dem Sollwert liegt, wird `demand = 0` gesetzt — auch wenn der Temperaturdelta noch positiv erscheint. Verhindert unnötiges Heizen nach Schaltzeiten.

**Setpoint-Quantisierung auf 0,5 °C-Schritte:**
TRV-Sollwerte werden auf 0,5 °C gerundet — reduziert unnötige Funk-Übertragungen und schont TRV-Akkus erheblich.

**Laufzeitmessung:**
Ventilposition > 8% gilt als "Zimmer heizt aktiv" — direktes Signal, keine Berechnung nötig.

---

### ⚡ Event-getriebene Fenstererkennung

Fenstersensoren lösen jetzt **sofort** via `async_track_state_change_event` aus — vorher gab es einen fixen 60-Sekunden-Polling-Delay. Die konfigurierten Reaktions- und Schließverzögerungen bleiben erhalten.

**Sofortige Erkennung bei Modus-Wechsel:** Beim Wechsel von `off` → `auto` werden alle Fensterzustände sofort eingelesen (`_prefill_window_states`) — kein Warten auf den nächsten Poll.

---

### ⏱️ Startup-Gnadenfrist für Zigbee / Z-Wave

Sensoren brauchen nach einem HA-Neustart Zeit bis sie ihren Zustand melden. Neue Einstellung `startup_grace_seconds` (Standard: 60 s) — während dieser Zeit werden `unavailable`-Zustände von Temperatursensoren nicht als Fehler gewertet.

---

### 🎨 UX / UI Overhaul

- Modernes Card-Layout mit klarer Hierarchie
- Zimmer-Zeitpläne und Kalenderansicht als **Sub-Tabs direkt im Zimmer-Detail** (statt eigene globale Tabs)
- Verbesserte Responsivität
- Konsistente Farbgebung nach Heizstatus
- Switch-only Einstellungen (Hysterese, adaptive Kurve, PID) im TRV-Modus automatisch ausgeblendet

---

### 📋 Config-Flow vollständig synchronisiert

Alle Felder die im Edit-Modal verfügbar sind, sind jetzt auch im Add-Modal vorhanden:
- CO₂-Sensor + Schwellwert
- Raum-Anwesenheitsliste (`room_presence_entities`)
- Boost-Temperatur (`boost_temp`) + Standard-Dauer
- TRV-Felder: `trv_temp_weight`, `trv_temp_offset`, `trv_min_send_interval`

---

### 🛠️ Neue Services

Vier weitere Services sind jetzt vollständig registriert und in `services.yaml` dokumentiert:

| Service | Beschreibung |
|---------|-------------|
| `export_config` | Konfiguration als JSON herunterladen + HA-Event ausgeben |
| `activate_guest_mode` | Gäste-Modus mit optionaler Dauer aktivieren |
| `deactivate_guest_mode` | Gäste-Modus sofort beenden |
| `reset_stats` | Laufzeit- und Energiestatistiken zurücksetzen |

---

### 🔕 Modus „Aus" wirklich aus

Im Modus `off` werden alle Thermostate jetzt auf `hvac_mode: off` gesetzt statt auf Frostschutztemperatur. Notfall-Frostschutz bleibt aktiv: bei Minusgraden außen greift trotzdem der absolute Frostschutz — das Zimmer friert nicht ein.

---

### 🔄 Gelernte Werte zurücksetzen

IHC lernt im Hintergrund (Kurvenkorrektur, Aufheizzeiten) — diese Werte können jetzt gezielt zurückgesetzt werden:

- **Einstellungen → Intelligente Regelung**: Button „Gelernte Werte zurücksetzen"
  → setzt Kurvenkorrektur auf 0 °C + löscht die Aufheizzeiten-Historie
- **Backup & Restore**: Zwei separate Reset-Buttons
  - „Gelernte Werte zurücksetzen" (Kurve + Aufheizhistorie)
  - „Statistiken zurücksetzen" (Laufzeiten + Energiedaten heute)

---

### 💾 Backup & Restore

- **Export** direkt als `.json`-Datei im Browser herunterladen (kein Umweg über HA-Benachrichtigung)
- **Import** via Datei-Upload:
  1. JSON-Backup auswählen
  2. Bestätigen
  3. IHC spielt globale Einstellungen + alle Zimmer automatisch via Services ein

---

### 🧠 Intelligente Regelung — nur im Switch-Modus

Der Bereich für adaptive Heizkurve und adaptives Vorheizen wird im TRV-Modus ausgeblendet — TRVs haben ihren eigenen internen Regler, eine zusätzliche Host-seitige Kurvenanpassung würde dazwischenfunken. Im Switch-Modus läuft alles wie gehabt.

---

## ⚠️ Breaking Changes

| Was geändert | Alt | Neu |
|-------------|-----|-----|
| Eco-Temperatur-Konfiguration | `eco_temp: 18.0` (fester Wert) | `eco_offset: 3.0` + `eco_max_temp: 21.0` |
| Schlaf-Temperatur-Konfiguration | `sleep_temp: 17.0` (fester Wert) | `sleep_offset: 4.0` + `sleep_max_temp: 19.0` |
| Abwesend-Temperatur-Konfiguration | `away_temp_room: 16.0` (fester Wert) | `away_offset: 6.0` + `away_max_temp: 18.0` |
| Anwesenheits-Auto-Quelle | `room_presence_eco` | `room_presence_away` |

**Migration:** Bestehende Zimmer-Konfigurationen werden mit den neuen Standardwerten geladen. Bitte die Offsets und Maxima im Panel pro Zimmer anpassen.

---

## 🐛 Bug Fixes (14 behoben)

### Heizlogik
- **Phantom-Anforderung**: TRV-Temp > Sollwert → demand wird korrekt auf 0 gesetzt
- **Frostschutz im Aus-Modus**: Dashboard zeigte 7 °C statt „Aus"; Notfall-Frostschutz nur bei echten Minusgraden
- **Modus „Aus"**: Climate-Entitäten zeigen jetzt `HVACMode.OFF` statt Komforttemperatur
- **Demand-Gate**: `override_demand()` synct HeatingController korrekt
- **CONF_BOOST_TEMP**: Typfehler (String statt float) + KeyError behoben
- **CONF_HA_SCHEDULES**: Fehlte beim Zimmer-Erstellen → KeyError behoben

### Frontend
- **Override-Banner**: ReferenceError behoben (`systemOverrides`/`overrideLabel` wurden vor ihrer Definition verwendet)
- **Systemmodus-Buttons im Dashboard**: `querySelector` → `querySelectorAll + data-sysmode` (Elemente existierten nach UI-Refactor nicht mehr)
- **Stale srcMap-Eintrag**: `room_presence_away` hatte keine Label-Zuordnung → roher String wurde angezeigt
- **TRV-Reaktionszeiten**: `parseFloat()` → `parseInt()` (Backend erwartet int)
- **Schimmelschutz-Select**: CSS-Klasse `form-input` → `form-select`

### Konfiguration & Services
- **HA-Startup-Crash**: `CONF_WINDOW_OPEN_TEMP` wurde in `coordinator.py` importiert, aber in `const.py` gelöscht
- **4 Services fehlten in `services.yaml`**: `export_config`, `activate_guest_mode`, `deactivate_guest_mode`, `reset_stats`
- **Window-Listener-Unsub-Bug**: Listener wurde beim Reload nicht korrekt abgemeldet → Memory Leak behoben

### HACS & HA-Kompatibilität
- **icon.png**: War 359×354 px → skaliert auf exakt 256×256 px (HACS-Pflicht)
- **strings.json**: Fehlte komplett → erstellt (HA lädt ConfigFlow-Übersetzungen daraus, Pflichtdatei)
- **HA 2024.2+**: `ClimateEntityFeature.TURN_OFF` / `TURN_ON` ergänzt
- **Dashboard Systemmodus-Pill**: Optimistisches UI-Update, kein 1,2-s-Delay mehr nach Klick

---

## 📦 Installation / Update

### Via HACS
1. HACS → Integrationen → Intelligent Heating Control → Update
2. Home Assistant neu starten

### Manuell
```bash
cp -r custom_components/intelligent_heating_control /config/custom_components/
```
Dann HA neu starten.

---

## 📋 Vollständiges Changelog

Siehe [CHANGELOG.md](https://github.com/Jedrimos/intelligent-heatingcontroll/blob/main/CHANGELOG.md)

---

*Feedback und Bug-Reports: [GitHub Issues](https://github.com/Jedrimos/intelligent-heatingcontroll/issues)*
