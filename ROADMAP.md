# Roadmap – Intelligent Heating Control

Diese Datei dokumentiert was bereits umgesetzt ist und welche Ideen für kommende Releases
auf dem Tisch liegen.

> **Hinweis zur Versionierung:** Frühere Versionen dieser Datei haben Features fest an
> Versionsnummern gebunden („Version 1.6", „Version 3.0", …). Diese Leiter ist überholt:
> Der Großteil der damals geplanten Funktionen ist inzwischen ausgeliefert, und die real
> erschienenen Releases **2.0.0** (TRV-only – Heizungsschalter-/Switch-Modus und Wärmeerzeuger-
> Modus entfernt) und **2.1.0** (aktive Kühlung entfernt) hatten mit den damals so benannten
> Meilensteinen nichts zu tun. Diese Roadmap arbeitet deshalb mit Prioritäts-Buckets statt mit
> Versionsversprechen. Aktueller Stand des Codes: **2.1.0**.

> **Architektur-Kontext:** IHC steuert ausschließlich **Thermostatventile (TRVs)** direkt.
> Es gibt keinen zentralen Heizungsschalter-Modus, keine Vorlauftemperatur-PID-Regelung,
> keinen Wärmeerzeuger-/Heizkreis-Modus und keine aktive Kühlung mehr. Alle Ideen unten sind
> mit dieser TRV-only-Architektur verträglich.

---

## ✅ Bereits umgesetzt

### Kernfunktionen

- [x] Außentemperaturgeführte Heizkurve mit konfigurierbaren Stützpunkten
- [x] Wöchentliche Zeitpläne mit Tagesgruppen und Temperatur-Offsets
- [x] HA Schedule-Integration (`schedule.*`-Entities pro Zimmer, inkl. Bedingungsentität)
- [x] `ha_schedule_off_mode`: einstellbarer Fallback bei keinem aktiven HA-Zeitplan
- [x] Mehrere TRVs/Thermostate pro Zimmer
- [x] Mehrere Fenstersensoren pro Zimmer, event-getriebene Fenstererkennung
- [x] Fenster-Restore-Modus (Sollwert aus Zeitplan oder Wert vor dem Öffnen)
- [x] Fenster-Kaskade: Nachbarräume senken ab wenn ein Zimmer zu lange lüftet
- [x] Boost-Funktion (zeitlich begrenzter Komfortmodus)
- [x] Nachtabsenkung (sonnenstandsbasiert)
- [x] Frostschutz-Temperatur (greift auch im OFF-Modus)
- [x] Sommerautomatik inkl. externem Schalter und Kälteprognose-Frühstart
- [x] Alle Preset-Temperaturen outdoor-geregelt (Komfort/Eco/Schlaf/Abwesend mit Offset + Maximum)
- [x] Solar-Überschuss-Heizung (Temperatur-Boost bei Solarüberschuss)
- [x] Dynamischer Strompreis (Eco-Modus bei hohem Preis) + Energiepreis-Chart
- [x] Schimmelschutz pro Zimmer (Luftfeuchtigkeit + Taupunkt)
- [x] CO₂-Überwachung + Lüftungsempfehlung
- [x] Energieverbrauchsschätzung pro Zimmer (Laufzeit × `radiator_kw`, alternativ HKV-Sensor)
- [x] Backup & Restore (JSON-Export/Import), Reset gelernter Werte und Statistiken
- [x] HACS-Kompatibilität (icon.png 256×256, `strings.json`)

### TRV-Steuerung

- [x] Ventilposition als primäres Anforderungssignal (60 % Ventil / 40 % Temperaturdelta)
- [x] Kompatibel mit `valve_position` (Zigbee2MQTT), `position` (Z-Wave), `pi_heating_demand` (Eurotronic)
- [x] Setpoint-Quantisierung auf 0,5 °C-Schritte → weniger Funk-Traffic, längere Akkulaufzeit
- [x] Bestätigungs-basierte Override-Erkennung (kein falsches „manuell" nach Zeitplanwechsel)
- [x] Manueller Override mit Auto-Reset zum nächsten Zeitplan-Eintrag
- [x] TRV-Temperatur-Blending (`trv_temp_weight` / `trv_temp_offset`)
- [x] Laufzeitmessung folgt dem realen Heiz-Signal des TRVs statt einer berechneten Anforderung
- [x] TRV-Batteriestatus mit Warnschwelle im Dashboard
- [x] Startup-Gnadenfrist für Zigbee/Z-Wave-Sensoren nach HA-Neustart

### Anwesenheit, Urlaub & Gruppen

- [x] **Anwesenheitserkennung** (`person.*` / `device_tracker.*`) mit Verzögerung vor Auto-Away
- [x] **Zimmer-spezifische Anwesenheit** (`CONF_ROOM_PRESENCE_ENTITIES`) – z. B. Büro nur heizen
      wenn jemand im Homeoffice ist
- [x] **Urlaubs-Assistent**: Abwesenheitszeitraum (`vacation_start` / `vacation_end`),
      Kalenderintegration (`vacation_calendar` + Stichwort) und **Rückkehr-Vorheizung**
      (`vacation_return_preheat_days`, Status `return_preheat_active`)
- [x] **Gäste-Modus** mit konfigurierbarer Dauer
- [x] **Heizgruppen**: mehrere Zimmer zu einer Gruppe zusammenfassen, Gruppen-Modus-Wechsel –
      Services `add_group`, `remove_group`, `update_group`, `set_group_mode` + `groups`-Attribut
- [x] **Feiertags- & Schulferienkalender**: `holiday_calendar` + `holiday_schedule_mode`
      (`weekend` | `comfort`) – kein manuelles Umschalten an Feiertagen mehr
- [x] **Geo-Fencing / ETA-basierte Ankunftsheizung**: `eta_preheat_enabled`,
      `eta_preheat_threshold_minutes`, `eta_preheat_minutes` – Heizstart getimed auf die Ankunft
- [x] Mehrere Komfort-Verlängerungs-Auslöser (`comfort_extend_entries`)
- [x] Heizperiode-Entity (`heating_period_entity`) als globaler Winter-/Sommer-Schalter

### Intelligente Heizoptimierung

- [x] **Optimum Start** (`CONF_OPTIMUM_START_ENABLED`): IHC lernt die Aufheizzeit je Zimmer
      getrennt nach Außentemperatur-Bucket (`warmup_curve`, `avg_warmup_minutes`) und startet
      spätestmöglich, damit der Raum pünktlich warm ist – ersetzt das fixe `preheat_minutes`
- [x] **Optimum Stop**: schaltet ein Zimmer bereits vor dem Zeitplan-Ende ab, wenn die
      Zieltemperatur laut gelernter Abkühlrate bis dahin ohnehin gehalten wird
      (`optimum_stop_active`, `optimum_stop_minutes`, `optimum_stop_predicted`)
- [x] **Anforderungs-Heatmap pro Zimmer**: gleitender Durchschnitt (EMA) der Heizanforderung
      nach Wochentag und Uhrzeit, gelernt über mehrere Wochen (`demand_heatmap`), sichtbar im
      Analyse-Tab
- [x] **Thermische Masse pro Zimmer**: gelernte Abkühlrate (`avg_cooling_rate`, °C/h je °C
      Differenz innen/außen) für präzisere Start-/Stopp-Zeitpunkte
      *(nicht zu verwechseln mit der in 2.1.0 entfernten aktiven Kühlung – das ist ein
      Lernmodell, keine Kühlfunktion)*
- [x] **Peak Shaving** (`peak_shaving_enabled`, `peak_shaving_delay_minutes`): Wenn mehrere
      Zimmer gleichzeitig in die Anforderung gehen, wird die untere Hälfte (nach aktueller
      Anforderung sortiert) für die konfigurierte Verzögerung auf max. 30 % gedeckelt, statt
      alle TRVs zeitgleich aufzureißen
- [x] **CO₂-prädiktive Lüftungsplanung**: `co2_ventilation_eta_minutes` prognostiziert wann
      Lüften nötig wird; kurz davor leichter Vorheiz-Boost gegen den Kälteschock
- [x] **Gefühlte Temperatur / Komfortindex**: `felt_temperature` aus Raumtemperatur +
      Luftfeuchtigkeit, eigene Entität `IHCRoomFeltTempSensor` pro Zimmer
- [x] Kälteprognose-Frühstart aus der Wettervorhersage + Kälte-Boost
- [x] Adaptives Vorheizen

### Diagnose & UI

- [x] **Defekte-TRV-Erkennung**: `IHCStuckValveSensor` je Zimmer, `stuck_valve_timeout` –
      Alarm wenn ein Ventil trotz Anforderung nicht reagiert
- [x] **Temperaturverlauf-Graph pro Zimmer**: SVG-Chart mit 7-Tage-History (Ist + Soll,
      `temp_history` / `target_history`) als Sub-Tab im Zimmer-Detail
- [x] Pro-Zimmer HA-Geräte (`via_device` verlinkt alle Zimmer mit dem Hub)
- [x] Eigene Sensor-Entitäten pro Zimmer (Luftfeuchtigkeit, gefühlte Temperatur, Laufzeit, …)
- [x] Dashboard mit Hero-Bereich, Override-Banner, Kaskade-Alerts, Batterie-Chips
- [x] Zeitpläne + Wochenansicht + Verlauf als Sub-Tabs im Zimmer-Detail
- [x] Diagnose-Tab mit Live-ETA-Status, Energiepreis-Chart und Sensor-Übersicht
- [x] Analyse-Tab pro Zimmer: Anforderungs-Heatmap, Optimum-Start-Lernkurve, Optimum-Stop-Status
- [x] **Wärmebrücken-Erkennung**: vergleicht die gelernte Abkühlrate (`avg_cooling_rate`) eines
      Zimmers mit dem Durchschnitt der übrigen Zimmer; kühlt es ≥1,8× schneller aus, erscheint
      ein Hinweis im Analyse-Tab (`thermal_bridge: {suspected, ratio}`, rein informativ)
- [x] Config-Flow und Frontend-Modale vollständig synchronisiert (Add-Room = Edit-Room)
- [x] Alle Services vollständig in `services.yaml` dokumentiert

### Architektur (2.x)

- [x] **2.0.0 – TRV-only**: Heizungsschalter-/Switch-Modus, Klimabaustein (Hysterese,
      Min-Ein-/Ausschaltzeiten), adaptive Heizkurve, Vorlauftemperatur-PID und der nie
      fertiggestellte Wärmeerzeuger-Modus entfernt; `binary_sensor`-Plattform ergänzt
- [x] **2.1.0 – Kühlung entfernt**: aktive Kühlung (`enable_cooling`, `cooling_switch`,
      `cooling_target_temp`, Systemmodus `cool`) gestrichen – TRVs können nicht kühlen

---

## 🔜 Kurzfristig geplant

### Konfigurations-Assistent (Setup Wizard)

- Geführter Einrichtungsassistent für neue Nutzer
- **Automatische Entitätserkennung**: scannt `climate.*`, `sensor.*temperature*`,
  `binary_sensor.*window*` und schlägt sinnvolle Zuordnungen vor
- Gebäudetyp-Auswahl (Altbau / Neubau / Passivhaus) → vorbelegte Heizkurve
- Test-Modus: „Alles korrekt verbunden?" mit visueller Prüfung

### Erweiterte Dashboard-Ansichten

- **Zeitplan-Kalenderansicht**: Wochenüberblick aller Zimmer gleichzeitig (Heatmap-Stil)
- **Heizkurven-Simulation**: „Was wäre wenn es draußen −15 °C hätte?" – interaktiver Slider

> Die pro-Zimmer-Anforderungs-Heatmap (welches Zimmer heizt wann) ist bereits im Analyse-Tab
> umgesetzt, siehe oben.

### Schlaf-Temperaturprofil

- Statt eines fixen `sleep_offset`: Temperaturkurve über die Nacht
- Optimum laut Schlafforschung: ~20 °C beim Einschlafen → 16–17 °C um 3 Uhr → 19 °C ab 6 Uhr
- Umsetzung: `CONF_SLEEP_TEMP_PROFILE` = Liste von `{time, temp}`-Punkten pro Zimmer

### Multi-Zonen-Anwesenheit

- Verschiedene Heimzonen (Hauptwohnsitz, Wochenendhaus) getrennt auswertbar
- Baut auf der bereits vorhandenen zimmerspezifischen Anwesenheit auf

---

## 💡 Mittelfristige Ideen

### Rollosteuerung / Passive Solarnutzung

Bevor die Heizung morgens anläuft → Rolladen hochfahren, damit Sonnenwärme den Raum vorwärmt.
Im Sommer umgekehrt: Rolladen runterfahren, um das Aufheizen durch die Sonne zu verhindern.

- Neue Konstanten pro Zimmer: `CONF_COVER_ENTITIES`, `CONF_WINDOW_ORIENTATION`,
  `CONF_SOLAR_PASSIVE_HEAT`, `CONF_SOLAR_PASSIVE_SHADE`
- Azimut-Check aus `sun.sun` (Elevation + Azimut) gegen die Fensterausrichtung
- Opt-in pro Zimmer; IHC bewegt nur Rolladen, die es selbst gesetzt hat
- Priorität: Fensteroffenerkennung > Rollosteuerung > Heizanforderung

> **Nicht verwechseln** mit der in 2.1.0 entfernten aktiven Kühlung: Hier wird nichts
> gekühlt, sondern nur beschattet bzw. Sonneneinstrahlung genutzt. Diese Idee bleibt bestehen.

### Lovelace-Card (separate HACS-Komponente)

- Kompakte Karte für das normale HA-Dashboard
- Zeigt aktuelle Zimmertemperaturen, Heizstatus, Systemmodus
- „Quick Actions": Modus-Chips direkt in der Karte

### Erweiterte Anomalie-Erkennung

- **Energieanomalie**: „Diese Woche 40 % mehr Verbrauch als der Durchschnitt – Ursache?"
- **Push-Benachrichtigungen** über den HA-Notification-Service für alle Diagnose-Alarme
- Baut auf der bestehenden Stuck-Valve-/Sensor-/Wärmebrücken-Erkennung auf

### Gebäude-thermisches Modell

- IHC lernt das thermische Verhalten des gesamten Gebäudes statt nur einzelner Zimmer
- Schätzt automatisch die Wärmedämmung (effektiver U-Wert)
- Prognose: „Bei −2 °C außen und Heizung aus kühlt das Wohnzimmer in ~3 h unter 18 °C"

### Erweiterte Hardware-Anbindung

- **Zigbee2MQTT**: erweiterte TRV-Unterstützung mit Direktkopplung (herstellerspezifische Attribute)
- **MQTT Discovery**: automatische Erkennung neuer TRVs
- **Matter/Thread**: zukunftssichere Smart-Home-Integration

---

## 🔭 Langfristig / unklar

### KI-basierte Temperaturvorhersage

- Lokales ML-Modell (TFLite / scikit-learn), keine Cloud-Abhängigkeit
- Trainiert auf Wettervorhersage, Belegungsmuster und historische Heizzeiten
- Proaktives Anpassen: „Laut Modell wird das Wohnzimmer morgen früher kalt – 30 min früher starten"

### Smart Grid & Demand Response

- Integration mit Smart-Grid-Tarifsignalen (§ 14a EnWG)
- Lastverschiebung für netzkonforme Steuerung
- Teilnahme an aggregierten Demand-Response-Programmen

### Direkte KNX-Aktor-Unterstützung

- Sehr niedrige Priorität, unklarer Bedarf
- Gemeint ist ausschließlich das direkte Ansteuern von KNX-Stellantrieben als Alternative zu
  Zigbee/Z-Wave-TRVs – **nicht** der gestrichene Wärmeerzeuger-Modus mit Heizkreisen,
  Mischventilen und KNX-Raumreglern
- Voraussetzung: die KNX-Aktoren müssten sich wie ein TRV verhalten (Sollwert + Rückmeldung)

### Community & Ecosystem

- **Konfigurations-Templates**: Vorlagen für Altbau, Neubau, Passivhaus teilen
- **Heizkurven-Community**: bewährte Kurven für gängige Heizsysteme teilen

---

## Bekannte Einschränkungen

- [ ] **Keine aktive Kühlung**: IHC steuert TRVs, und TRVs können nicht kühlen. Ein Kühlmodus
      ist nicht geplant. Passive Ansätze (Beschattung via Rollosteuerung, siehe oben) sind die
      einzige angedachte Richtung.
- [ ] Config-Flow Heizkurven-Editor: auf 7 Punkte limitiert — Frontend-Editor empfohlen
- [ ] Zeitplan-Persistierung: ungespeicherte Änderungen im Frontend gehen beim Tab-Wechsel verloren
- [ ] Kein Support für mehrere separate Config Entries (nur eine IHC-Instanz pro HA-Instanz)

---

*Zuletzt aktualisiert: 2026-09-09*

*Beiträge und Feature-Requests sind herzlich willkommen über [GitHub Issues](https://github.com/Jedrimos/intelligent-heating-control/issues)*
