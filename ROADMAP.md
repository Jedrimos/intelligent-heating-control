# Roadmap – Intelligent Heating Control

Hier sind alle geplanten Verbesserungen und Ideen für zukünftige Versionen dokumentiert.

---

## ✅ Bereits umgesetzt (v1.0.x)

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

## Version 1.1 – Intelligentere Regelung

### Adaptive Heizkurve (Auto-Learning)
- Die Heizkurve lernt automatisch aus vergangenen Daten
- Wenn ein Zimmer trotz Kurventemperatur zu kalt/warm ist, wird die Kurve leicht angepasst
- Konfigurierbare Lernrate (aggressiv / konservativ) und maximale Abweichung
- Protokoll der Kurvenanpassungen mit Zeitstempel

### Predictive Pre-Heating (Vorausschauendes Vorheizen)
- Analysiert historische Aufheizzeiten pro Zimmer
- Berechnet automatisch den idealen Start-Zeitpunkt damit die Zieltemperatur exakt zum Zeitplan erreicht wird
- Beispiel: *„Wohnzimmer braucht bei -5°C im Schnitt 48 min → Heizung um 16:12 starten für 17:00 Ziel"*
- Integration mit HA Weather-Forecast für morgen-basierte Planung

### Wettervorhersage-Integration
- OpenMeteo / HA `weather.*` Entity als Datenquelle
- Präventives Vorheizen vor prognostiziertem Kälteeinbruch
- Tagesplanung: „Morgen wird es -8°C – Zeitpläne entsprechend anpassen"
- Anzeige der Wettervorhersage im Übersicht-Tab

### Temperaturverlauf-Analyse
- Erweiterte Speicherung der letzten 7 Tage pro Zimmer (stündliche Snapshots)
- Anomalie-Erkennung: plötzliche Abkühlung trotz laufender Heizung → Alarm
- Mini-Sparkline-Graphen im Übersicht-Tab (bereits teilweise implementiert)
- Tagesvergleich: „Heute vs. gestern – Abweichungen"

---

## Version 1.2 – Präsenz & Personensteuerung

### Verbesserte Anwesenheitserkennung
- **ETA-basiertes Vorheizen**: Wenn Person X nach Hause fährt (Google Maps ETA via HA) → Heizung X Minuten vor Ankunft starten
- **Multi-Zonen-Anwesenheit**: Verschiedene Heimzonen (Hauptwohnsitz, Wochenendhaus)
- **Gäste-Modus**: Vorübergehend Komfort-Preset für alle Zimmer ohne Konfigurationsänderung

### Zimmer-spezifische Anwesenheit
- Pro Zimmer: eigene `person.*` / `device_tracker.*` Entitäten konfigurierbar
- Bürozimmer nur heizen wenn Person im Homeoffice ist
- Schlafzimmer tagsüber automatisch in Eco wenn niemand dort schläft
- Integration mit HA Bayesian Sensor / Template Sensor

### Urlaubs-Assistent
- Einfache Eingabe von Abwesenheitszeitraum: „Ich bin vom 15.12.–02.01. im Urlaub"
- Kalenderintegration (HA-Kalender-Entities)
- **Rückkehr-Vorheizung**: Zimmer sind warm wenn man zurückkommt – ohne manuelles Eingreifen
- Frostschutz-Optimierung für den Urlaubszeitraum

---

## Version 1.3 – Energieoptimierung *(Basis bereits vorhanden)*

### Echte Energiestatistiken
- Tages-/Wochen-/Monatsauswertungen mit Vergleich zur Vorperiode
- Integration mit HA Energy Dashboard (echte kWh-Entitäten)
- Export als Long-Term Statistics für Recorder

### Heizungsoptimierungs-Score
- Täglicher Effizienz-Score (0–100 Punkte)
- Bewertet: Laufzeit vs. Außentemperatur, Zeitplan-Einhaltung, Boost-Häufigkeit
- „Heute: 87 Punkte – 15% effizienter als letzte Woche"
- Tipp-System: „Dein Wohnzimmer heizt öfter als andere Zimmer – Offset prüfen?"

### Predictive Demand-Response
- Vorausschauende Lastverschiebung basierend auf Spot-Preis-Prognose (ENTSO-E, Tibber API)
- *„Morgen 02:00–05:00 Uhr günstiger Strom → jetzt auf 22°C aufheizen, dann Pause bis 06:00"*
- Konfigurierbare maximale Vorab-Ladetemperatur

### Smart Meter Integration
- Echten Gas-/Stromverbrauch aus Smart Meter (DSMR, SML) lesen
- Echtzeit-Kostenberechnung statt nur Schätzung aus Laufzeit × kW
- CO₂-Emission-Tracking

---

## Version 1.4 – Erweiterte Raumsteuerung *(Basis bereits vorhanden)*

### Schimmelschutz-Modus
- Kombination aus Temperaturmessung + Luftfeuchtigkeit (wenn Sensor vorhanden)
- Taupunkt-Berechnung pro Zimmer
- Automatische Temperaturerhöhung wenn Schimmelrisiko erkannt wird
- Push-Alarm: *„Schlafzimmer: Schimmelgefahr! Luftfeuchte 78% bei 16°C"*

### CO₂-Sensor-Integration
- Lüftungsempfehlung bei zu hohem CO₂-Wert
- Nach dem Lüften: automatisch kurze Aufheizphase starten
- CO₂-Verlauf als Datenpunkt für Raumqualitäts-Anzeige im Panel

### Fußbodenheizungs-Modus
- Eigene Regelparameter für die träge Fußbodenheizung
- Größeres Totband (Deadband), deutlich längere Mindest-Ein/Aus-Zeiten
- Schutz vor Überhitzung durch Temperaturgrenzen für Estrich
- Automatischer Wechsel zwischen Fußboden- und Heizkörper-Modus im Hybridsystem

### Hydraulischer Abgleich (Hilfsfunktion)
- Geführter Assistent: misst Aufheizzeiten aller Zimmer
- Erkennt Ungleichgewichte (ein Zimmer heizt viel schneller als andere)
- Gibt Hinweise für Ventilvoreinstellungen
- Protokoll der Messergebnisse als Export

### Mehrzone-Heizkreis-Unterstützung
- Separate Heizkreise (Fußbodenheizung vs. Heizkörper)
- Pro Zimmer: Zuweisung zu einem oder mehreren Heizkreisen
- Separate Klimabaustein-Instanz pro Heizkreis
- Visualisierung der Heizkreise im Panel

---

## Version 1.5 – UI/UX & Konfiguration

### Erweitertes Dashboard
- **Zeitplan-Kalenderansicht**: Wochenüberblick aller Zimmer gleichzeitig (Heatmap-Stil)
- **Anforderungs-Heatmap**: Welche Zimmer heizen wann? Farbkodiert nach Stunde und Wochentag
- **Heizkurven-Simulation**: „Was wäre wenn Außentemperatur -15°C wäre?" – interaktiver Slider
- **Temperaturverlauf-Graph**: Echte 24h-Kurve pro Zimmer (Ist/Soll/Außen)

### Konfigurations-Assistent (Setup Wizard)
- Geführter Einrichtungsassistent für neue Nutzer
- **Automatische Entitätserkennung**: scannt alle `climate.*`, `sensor.*temperature*`, `binary_sensor.*window*` im System und schlägt sinnvolle Zuordnungen vor
- Gebäudetyp-Auswahl (Altbau / Neubau / Passivhaus) → vorbelegte Heizkurve
- Test-Modus: „Alles korrekt verbunden?" mit visueller Prüfung

### Heizgruppen
- Mehrere Zimmer zu einer Gruppe zusammenfassen (z.B. „Erdgeschoss")
- Gemeinsame Zeitpläne für eine Gruppe pflegen
- Wenn Person im EG → alle EG-Zimmer auf Komfort
- Gruppen-Boost, Gruppen-Modus-Wechsel

### Lovelace-Card (separate HACS-Komponente)
- Kompakte Karte für das normale HA-Dashboard
- Zeigt: aktuelle Zimmertemperaturen, Heizstatus, Systemmode
- „Quick Actions": Modus-Chips direkt in der Karte
- Responsive für Sidebar-Widgets

### Backup & Restore *(Basis bereits vorhanden)*
- Vollständiger Export inkl. Zeitplänen als JSON/YAML
- **Import-Funktion**: Konfiguration wiederherstellen per Datei-Upload
- Automatische tägliche Backups als HA-Persistent-Notification
- Versioniertes Backup-Archiv

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
- Optimiert Mindest-Aus-Zeiten auf Basis des Modells

### Sprachsteuerungsoptimierung
- Optimierte Expose-Integration für Google Assistant / Alexa / Apple Siri
- Natürlichsprachliche Befehle via HA Conversations/Assist:
  - *„Schlafzimmer auf 18 Grad für die nächsten 2 Stunden"*
  - *„Alle Zimmer auf Eco-Modus"*
  - *„Urlaub: Ich bin vom 20. bis 27. Dezember weg"*

---

## Langfristige Ideen (Backlog)

### Integration mit externen Systemen
- **OpenTherm**: Direkte Kesselkommunikation für Vorlauftemperaturregelung (ohne externen Switch)
- **KNX**: Direkte KNX-Gruppenadressierung für Aktoren
- **Loxone**: Bidirektionale Sync mit Loxone Miniserver
- **Zigbee2MQTT**: Erweiterte TRV-Unterstützung mit Direktkopplung ohne HA-Climate-Entity
- **MQTT Discovery**: Automatische Geräteerkennung neuer TRVs
- **Matter/Thread**: Zukunftssichere Smart-Home-Integration

### Gebäudespezifische Physik-Modelle
- **Thermische Masse**: Berücksichtigung der Gebäude-Wärmekapazität (Beton vs. Holz)
- **Solargewinn**: Südausgerichtete Zimmer bei Sonnenschein automatisch kühler regulieren
- **Nachbarschaftseffekte**: Wärmeübertragung zwischen Zimmern modellieren (offene Türen)
- **Lüftungsanlage**: MVHR/Wohnraumlüftung als Wärmequelle/-senke berücksichtigen

### Smart Grid & Demand Response
- Integration mit Smart Grid Tarifsignalen (§14a EnWG, DR-Signale)
- Lastverschiebung für netzkonforme Steuerung
- Teilnahme an aggregierten Demand-Response-Programmen

### Multi-Instanz & Multi-Haus
- Mehrere IHC-Instanzen für verschiedene Wohneinheiten
- Mandantenfähige Konfiguration (Vermieter/Mieter-Modell)
- Cloud-Sync zwischen mehreren HA-Instanzen

### Community & Ecosystem
- **Konfigurations-Templates**: Vorlagen für Altbau, Neubau, Passivhaus teilen
- **Heizkurven-Community**: Bewährte Kurven für gängige Heizsysteme (Gas, Wärmepumpe, Pellets)
- **Sensor-Bibliothek**: Getestete und empfohlene Sensorkombinationen
- **Lovelace Card**: Separate HACS-Komponente für HA-Dashboard-Integration

---

## Bekannte Einschränkungen (zu beheben)

- [ ] Kühlmodus: Grundgerüst vorhanden, aber noch nicht vollständig getestet und dokumentiert
- [ ] Config-Flow Heizkurven-Editor: Auf 7 Punkte limitiert – Frontend-Editor ohne Limit bevorzugen
- [ ] Zeitplan-Persistierung nach Neustart: Bearbeitete Zeitpläne im Frontend gehen ohne Speichern verloren
- [ ] Vorlauftemperaturregelung: Momentan nur Weiterleitung an `number.*` Entity, kein echter PID-Regler
- [ ] Keine persistente Temperaturhistorie über HA-Neustarts hinaus (nur RAM)
- [ ] Kein Support für mehrere separate Config Entries (nur eine IHC-Instanz pro HA-Instanz)

---

*Zuletzt aktualisiert: 2026-03-10*

*Beiträge und Feature-Requests sind herzlich willkommen über [GitHub Issues](https://github.com/Jedrimos/intelligent-heatingcontroll/issues)*
