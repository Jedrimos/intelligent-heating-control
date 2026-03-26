# Roadmap – Intelligent Heating Control

Hier sind alle geplanten Verbesserungen und Ideen für zukünftige Versionen dokumentiert.

---

## ✅ Umgesetzt in v1.0.x

- [x] Außentemperaturgeführte Heizkurve mit konfigurierbaren Stützpunkten
- [x] Loxone-artiger Klimabaustein (gewichtete Anforderungsaggregation)
- [x] Wöchentliche Zeitpläne mit Tagesgruppen und Temperatur-Offsets
- [x] Mehrere TRVs/Thermostate pro Zimmer
- [x] Mehrere Fenstersensoren pro Zimmer
- [x] Boost-Funktion (zeitlich begrenzter Komfortmodus)
- [x] Nachtabsenkung (sonnenstandsbasiert)
- [x] Anwesenheitserkennung (person.* / device_tracker.*)
- [x] Frostschutz-Temperatur (greift auch bei OFF-Modus)
- [x] Solar-Überschuss-Heizung (Temperatur-Boost bei Solarüberschuss)
- [x] Dynamischer Strompreis (Eco-Modus bei hohem Preis)
- [x] Vorheizen vor Zeitplan-Start (Pre-Heat)
- [x] Energieverbrauchsschätzung (Laufzeit × kW)
- [x] Vorlauftemperatur-Steuerung über number-Entity
- [x] Entity-Autocomplete in Zimmer-Modalen
- [x] Heizkurve korrekt speichern und laden
- [x] Zimmer-Edit: Alle Felder vorausgefüllt und speicherbar
- [x] Zeitpläne: Bestehende Zeitpläne werden geladen

---

## ✅ Umgesetzt in v1.2.0

- [x] **Alle Temperaturen outdoor-geregelt**: Komfort/Eco/Schlaf/Abwesend folgen der Heizkurve
- [x] **Konfigurierbarer Offset pro Modus**: Eco/Schlaf/Abwesend = Komfort − einstellbarer Abzug
- [x] **Maximum pro Modus**: Eco/Schlaf/Abwesend-Temps haben konfigurierbare Obergrenzen
- [x] **HA Schedule-Integration**: `schedule.*`-Entities als Heizplan pro Zimmer einbindbar
- [x] **`ha_schedule_off_mode`**: Einstellbarer Fallback bei keinem aktiven HA-Zeitplan
- [x] **Anwesenheit → Abwesend-Temperatur**: Wenn niemand zuhause, outdoor-geregelte Abwesend-Temp
- [x] **Gäste-Modus**: Systemweiter Komfortbetrieb mit konfigurierbarer Dauer
- [x] **Schimmelschutz pro Zimmer**: Luftfeuchtigkeit + Taupunktberechnung + automatische Temperaturerhöhung
- [x] **Wettervorhersage in der Heizregelung**: Kälte-Boost bei prognostizierter Kältewelle
- [x] **Wetteranzeige auf Deutsch**: Alle 15 HA-Wetterzustände übersetzt mit Emoji
- [x] **Übersicht-Tab neu gestaltet**: Hero-Bereich, Override-Banner, Temperatur-Differenz-Indikator
- [x] **TRV-Modus überarbeitet**: Ventilposition als primäres Anforderungssignal (60%/40% Blending)
- [x] **TRV Setpoint-Quantisierung**: 0,5 °C-Schritte → reduziert Funk-Traffic, schont Akkus
- [x] **Event-getriebene Fenstererkennung**: Sofortige Reaktion statt 60-Sekunden-Polling
- [x] **Startup-Gnadenfrist**: Zigbee/Z-Wave Sensoren haben 60 s Zeit nach HA-Neustart
- [x] **Zeitpläne als Sub-Tabs im Zimmer-Detail**: Keine globalen Zeitplan-/Kalender-Tabs mehr
- [x] **Config-Flow vollständig synchronisiert**: Add- und Edit-Modal haben denselben Funktionsumfang
- [x] **4 neue Services dokumentiert**: `export_config`, `activate_guest_mode`, `deactivate_guest_mode`, `reset_stats`
- [x] **Backup & Restore**: Export als JSON-Download, Import via Datei-Upload
- [x] **Gelernte Werte zurücksetzen**: Kurvenkorrektur + Aufheizzeiten getrennt rücksetzbar
- [x] **HACS-Kompatibilität**: icon.png 256×256, strings.json erstellt
- [x] **`sun_entity` im Panel konfigurierbar**
- [x] **Switch-only Einstellungen im TRV-Modus ausgeblendet**

---

## Version 1.6 – Erweiterte Raumsteuerung (nächste Priorität)

### Zimmer-spezifische Anwesenheit
- Pro Zimmer: eigene `person.*` / `device_tracker.*` Entitäten konfigurierbar
- Bürozimmer nur heizen wenn Person im Homeoffice ist
- Schlafzimmer tagsüber automatisch in Eco wenn niemand dort schläft
- Integration mit HA Bayesian Sensor / Template Sensor

### Multi-Zonen-Anwesenheit
- Verschiedene Heimzonen (Hauptwohnsitz, Wochenendhaus)

### Urlaubs-Assistent
- Einfache Eingabe von Abwesenheitszeitraum: „Ich bin vom 15.12.–02.01. im Urlaub"
- Kalenderintegration (HA-Kalender-Entities)
- **Rückkehr-Vorheizung**: Zimmer sind warm wenn man zurückkommt
- Frostschutz-Optimierung für den Urlaubszeitraum

---

## Version 1.7 – UI/UX & Konfiguration

### Erweitertes Dashboard
- **Zeitplan-Kalenderansicht**: Wochenüberblick aller Zimmer gleichzeitig (Heatmap-Stil)
- **Anforderungs-Heatmap**: Welche Zimmer heizen wann? Farbkodiert nach Stunde und Wochentag
- **Heizkurven-Simulation**: „Was wäre wenn Außentemperatur -15°C wäre?" – interaktiver Slider
- **Temperaturverlauf-Graph**: Echte 24h-Kurve pro Zimmer (Ist/Soll/Außen)

### Konfigurations-Assistent (Setup Wizard)
- Geführter Einrichtungsassistent für neue Nutzer
- **Automatische Entitätserkennung**: scannt alle `climate.*`, `sensor.*temperature*`, `binary_sensor.*window*` und schlägt sinnvolle Zuordnungen vor
- Gebäudetyp-Auswahl (Altbau / Neubau / Passivhaus) → vorbelegte Heizkurve
- Test-Modus: „Alles korrekt verbunden?" mit visueller Prüfung

### Heizgruppen
- Mehrere Zimmer zu einer Gruppe zusammenfassen (z.B. „Erdgeschoss")
- Gemeinsame Zeitpläne für eine Gruppe pflegen
- Gruppen-Boost, Gruppen-Modus-Wechsel

### Lovelace-Card (separate HACS-Komponente)
- Kompakte Karte für das normale HA-Dashboard
- Zeigt: aktuelle Zimmertemperaturen, Heizstatus, Systemmode
- „Quick Actions": Modus-Chips direkt in der Karte

---

## Version 1.8 – Intelligente Heizoptimierung

### Optimum Start (Lernbasierte Vorheizung)
- IHC misst wie lange jeder Raum zum Aufheizen braucht (°C/min je nach Außentemperatur)
- Berechnet automatisch den **spätmöglichsten** Startzeitpunkt damit der Raum pünktlich zum Zeitplan warm ist
- Ersetzt das fixe `CONF_PREHEAT_MINUTES` durch ein lernendes Modell
- Beispiel: Wohnzimmer braucht bei -5°C außen 45 Minuten → Heizung startet 45 min vor Zeitplan-Beginn automatisch

### Thermische Masse pro Zimmer lernen
- IHC beobachtet die **Abkühlrate** wenn Heizung aus und Fenster zu
- Speichert `cooling_rate` (°C/Stunde je °C Differenz innen/außen) pro Zimmer
- Betonzimmer kühlen langsam → brauchen weniger Vorheizung; Dachzimmer schnell → mehr
- Nutzung: Vorhersage wann nächste Heizanforderung kommt + optimale Startzeit

### Peak Shaving – Gestaffelter Heizungsstart
- Wenn alle Zimmer gleichzeitig anfordern → Kessel auf 100% → ineffizient + Stromspitze
- Zimmer werden nach Priorität/Aufheizrate um 1–3 Minuten versetzt gestartet
- Konfiguration: `CONF_PEAK_SHAVING_ENABLED` (bool) + Priorität aus `CONF_WEIGHT`

### Geo-Fencing / ETA-basierte Ankunftsheizung
- HA `device_tracker` kennt GPS-Standort → „Person ist 15 Minuten entfernt"
- Heizung startet automatisch getimed auf Ankunft – kein manuelles „Ich komme gleich"
- Neue Felder: `CONF_ARRIVAL_PREHEAT_ENTITY` (device_tracker.*) + `CONF_ARRIVAL_PREHEAT_MINUTES`

### CO₂-prädiktive Lüftungsplanung
- CO₂-Anstiegsrate messen → Zeitpunkt vorhersagen wann Lüftung nötig sein wird
- Kurz vor prognostizierter Lüftung: Raum leicht vorheizen (+1°C, ca. 5 min vorher)
- Nach dem Lüften keine Kälteschock-Reaktionsheizung nötig → komfortabler + effizienter
- Neues Attribut: `co2_ventilation_eta_minutes` in room_data

### Schlaf-Temperaturprofil (Kurve statt fixer Schlaftemperatur)
- Statt einem fixen `CONF_SLEEP_OFFSET`: Temperaturkurve über die Nacht
- Optimum laut Schlafforschung: ~20°C beim Einschlafen → 16–17°C um 3 Uhr → 19°C ab 6 Uhr
- Umsetzung: `CONF_SLEEP_TEMP_PROFILE` = Liste von `{time, temp}` Punkten pro Zimmer

### Gefühlte Temperatur / Komfortindex (ASHRAE 55)
- Luftfeuchte beeinflusst Wärmeempfinden: 17°C bei 80% fühlt sich kälter an als bei 40%
- Berechnung: PMV (Predicted Mean Vote) aus Raumtemperatur + Luftfeuchtigkeit
- Bei zu niedrigem Komfortindex → Sollwert automatisch leicht anheben
- Nutzt bereits vorhandenen `CONF_HUMIDITY_SENSOR` ohne Extra-Hardware

### Feiertags- & Schulferienkalender
- HA-Kalender-Entität mit Feiertagen/Ferien → wenn aktiv: Wochenend-Zeitplan statt Werktagsplan
- Konfiguration: `CONF_HOLIDAY_CALENDAR` + `CONF_HOLIDAY_SCHEDULE_MODE` ("weekend" | "comfort")
- Kein manuelles Umschalten mehr an Feiertagen / Brückentagen

---

## Version 2.0 – KI & Automatisierung

### KI-basierte Temperaturvorhersage
- Lokales ML-Modell (TFLite / scikit-learn)
- Trainiert auf: Wettervorhersage, Belegungsmuster, historische Heizzeiten
- Proaktives Anpassen von Zeitplänen: „Laut Modell wird Wohnzimmer morgen früher kalt – 30 min früher starten"
- Keine Cloud-Abhängigkeit – läuft vollständig lokal

### Anomalie-Erkennung (Diagnostics)
- **Defekte TRV-Erkennung**: Zimmer bleibt kalt obwohl Heizung läuft → automatischer Alarm
- **Sensor-Drift-Erkennung**: Temperaturwert bleibt unnatürlich konstant → Sensor-Alarm
- **Wärmebrücken-Erkennung**: Zimmer verliert Wärme ungewöhnlich schnell
- **Energieanomalie**: „Diese Woche 40% mehr Verbrauch als Durchschnitt – Ursache?"
- Push-Benachrichtigungen über HA-Notification-Service

### Gebäude-Thermisches Modell
- Das System lernt das thermische Verhalten des Gebäudes
- Schätzt automatisch die Wärmedämmung (effektiver U-Wert)
- Prognose: „Bei aktuell -2°C außen und Heizung aus: Wohnzimmer kühlt in ~3h unter 18°C"

---

## Version 2.1 – Passive Solar Heating via Rollosteuerung

**Idee:** Bevor die Heizung morgens anläuft → Rolladen hochfahren damit Sonnenwärme den Raum vorwärmt.
Im Sommer umgekehrt: Rolladen runterfahren um Aufheizung durch Sonne zu verhindern.

Neue Konstanten pro Zimmer: `CONF_COVER_ENTITIES`, `CONF_WINDOW_ORIENTATION`, `CONF_SOLAR_PASSIVE_HEAT`, `CONF_SOLAR_PASSIVE_COOL`

---

## Version 3.0 – Wärmeerzeuger-Modus (Heat Generator Mode)

Vollständiger dritter Betriebsmodus für professionelle Zentralheizungsanlagen mit mehreren Heizkreisen, Wärmepumpen, KNX-Integration und hydraulischem Abgleich.

### Neue Fähigkeiten:
- **Heizkreis-Verwaltung**: Separate Pumpen und Mischventile pro Heizkreis (Heizkörper 60°C / FBH 35°C)
- **Mischventil-PID-Regelung**: Pro Heizkreis eigene Vorlauftemperatur-Regelung
- **Pufferspeicher-Management**: Dreischicht-Temperaturüberwachung, Erzeuger-Anforderung aus Puffer-Logik
- **Warmwasser-Priorisierung (TWW)**: Heizkreise stoppen während TWW-Aufheizung
- **Wärmepumpe-Optimierung**: COP-geführte Vorlauftemperatur-Minimierung + Bivalenz-Punkt-Logik
- **Hydraulischer Abgleich**: Automatisches Lernen aus Rücklauftemperatur-Differenzen
- **KNX-Integration**: Thermostat-Anforderungslesung + Stellantrieb-Steuerung

Alle Details: siehe Abschnitt 15 in [CLAUDE.md](CLAUDE.md)

---

## Langfristige Ideen (Backlog)

### Integration mit externen Systemen
- **OpenTherm**: Direkte Kesselkommunikation für Vorlauftemperaturregelung
- **KNX**: Direkte KNX-Gruppenadressierung für Aktoren
- **Zigbee2MQTT**: Erweiterte TRV-Unterstützung mit Direktkopplung
- **MQTT Discovery**: Automatische Geräteerkennung neuer TRVs
- **Matter/Thread**: Zukunftssichere Smart-Home-Integration

### Smart Grid & Demand Response
- Integration mit Smart Grid Tarifsignalen (§14a EnWG)
- Lastverschiebung für netzkonforme Steuerung
- Teilnahme an aggregierten Demand-Response-Programmen

### Community & Ecosystem
- **Konfigurations-Templates**: Vorlagen für Altbau, Neubau, Passivhaus teilen
- **Heizkurven-Community**: Bewährte Kurven für gängige Heizsysteme teilen
- **Lovelace Card**: Separate HACS-Komponente für HA-Dashboard-Integration

---

## Bekannte Einschränkungen

- [ ] Kühlmodus: Grundgerüst vorhanden, aber noch nicht vollständig getestet
- [ ] Config-Flow Heizkurven-Editor: Auf 7 Punkte limitiert — Frontend-Editor empfohlen
- [ ] Zeitplan-Persistierung: Ungespeicherte Änderungen im Frontend gehen beim Tab-Wechsel verloren
- [ ] Kein Support für mehrere separate Config Entries (nur eine IHC-Instanz pro HA-Instanz)

---

*Zuletzt aktualisiert: 2026-03-26*

*Beiträge und Feature-Requests sind herzlich willkommen über [GitHub Issues](https://github.com/Jedrimos/intelligent-heatingcontroll/issues)*
