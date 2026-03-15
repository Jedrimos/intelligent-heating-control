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

## ⚠️ Breaking Changes

| Was geändert | Alt | Neu |
|-------------|-----|-----|
| Eco-Temperatur-Konfiguration | `eco_temp: 18.0` (fester Wert) | `eco_offset: 3.0` + `eco_max_temp: 21.0` |
| Schlaf-Temperatur-Konfiguration | `sleep_temp: 17.0` (fester Wert) | `sleep_offset: 4.0` + `sleep_max_temp: 19.0` |
| Abwesend-Temperatur-Konfiguration | `away_temp_room: 16.0` (fester Wert) | `away_offset: 6.0` + `away_max_temp: 18.0` |
| Anwesenheits-Auto-Quelle | `room_presence_eco` | `room_presence_away` |

**Migration:** Bestehende Zimmer-Konfigurationen werden mit den neuen Standardwerten geladen. Bitte die Offsets und Maxima im Panel pro Zimmer anpassen.

---

## 🐛 Bug Fixes

- **Frontend ReferenceError**: Override-Banner hat nie angezeigt (`systemOverrides` / `overrideLabel` wurden nach dem `.map()`-Callback definiert, in dem sie schon verwendet wurden)
- **Stale srcMap-Eintrag**: `room_presence_away` hatte keine Zuordnung → roher String statt Label angezeigt

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
