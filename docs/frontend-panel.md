# Frontend Panel

Das IHC-Panel ist ein eigenes Dashboard das in der HA-Seitenleiste unter dem Menüpunkt **IHC** (🌡️) erscheint.

Es ist als Vanilla JavaScript Web Component implementiert (`ihc-panel.js`) und benötigt keine externe Abhängigkeiten. Es hat sechs Tabs: 🏠 Dashboard, 🚪 Zimmer, 📊 Übersicht (Diagnose), 🔥 Analyse, ⚙️ Einstellungen, 📈 Heizkurve.

---

## Tab: 🏠 Dashboard

Der Dashboard-Tab ist der Hauptanzeigebereich und aktualisiert sich **automatisch alle 5 Sekunden**.

### Hero-Bereich

Oben auf der Seite: Heizstatus, Gesamtanforderung und Systemmodus – der Systemmodus lässt sich
direkt hier per Klick auf die Modus-Pills umschalten.

### Status-Leiste

| Kachel | Beschreibung |
|--------|-------------|
| Außentemp. | Aktuelle Außentemperatur |
| Kurven-Ziel | Aktueller Heizkurven-Basiswert |
| Anforderung | Gesamtanforderung in % (Durchschnitt aller aktiven Zimmer) |
| Heizung | `🔥 EIN` oder `✓ AUS` |
| Zimmer aktiv | Anzahl Zimmer mit Anforderung > 0 |
| Modus | Aktueller Systemmodus |
| Laufzeit heute | Gesamte Heizlaufzeit heute in Minuten |
| Energie heute | Geschätzter Verbrauch in kWh |

### Sonderzustand-Banner

Wenn besondere Zustände aktiv sind, erscheinen farbige Banner:

- ☀️ **Sommerautomatik aktiv** – Heizung gesperrt (gelb)
- 🌙 **Nachtabsenkung aktiv** – Temperaturen reduziert (blau)
- 🚶 **Anwesenheits-Abwesend** – niemand zuhause (orange)
- 🌞 **Solarüberschuss** – Zieltemperatur angehoben (gelb)
- 💶 **Hoher Strompreis** – Eco-Modus aktiv (rot)
- 🥶 **Kälteprognose** – Frühstart der Heizung aktiv
- 🎉 **Gäste-Modus** aktiv

### Alert-Leiste

- 🔋 Schwache TRV-Batterien
- 🔩 Festsitzendes Ventil (Stuck-Valve-Erkennung)
- 🌊 Fenster-Kaskade aktiv, mit Countdown und Quell-Raum

### Raumkarten

Jedes Zimmer hat eine eigene Karte mit:

- **Name** + Statusbadge (Heizt / OK / Fenster offen / Boost / Eco / Abwesend / Aus / Manuell)
- **Temperaturen**: Ist → Soll (große Anzeige)
- **Anforderungsbalken**: farbkodiert (grün–gelb–orange–rot)
- **Quelle**: woher die Zieltemperatur stammt (Zeitplan / Heizkurve / Preset / etc.)
- **Nachtabsenkung**: „🌙 -2°" wenn aktiv
- **Modus-Chips**: Schnellauswahl Auto / Komfort / Eco / Schlafen / Abwesend / Aus
- **Boost-Button**: ⚡ aktiviert den konfigurierten Boost
- **Override-Banner**: wenn der Zimmermodus `manual` ist (nach TRV-Eingriff), inkl.
  „↩ Reset HH:MM Uhr" bis zum nächsten Zeitplan-Eintrag
- **Laufzeit** und **Ø Aufheizzeit** (unten links/rechts)
- **Sparkline**: Mini-Temperaturverlauf der letzten Stunden

**Rahmenfarbe der Karte:**
- 🔴 Rot – Zimmer heizt gerade
- 🟢 Grün – Zimmer ist zufrieden (Zieltemp. erreicht)
- 🔵 Blau – Fenster offen
- Grau – Zimmer ausgeschaltet

---

## Tab: 🚪 Zimmer

Verwaltung aller konfigurierten Zimmer.

### Zimmer hinzufügen

Klick auf **+ Zimmer hinzufügen** öffnet ein Modal mit:

- **Zimmername** (Pflichtfeld)
- **Temperatursensor** – mit Autocomplete (tippt man `sensor.` erscheinen Vorschläge)
- **Thermostate/TRVs** – mehrere möglich, `+` für weitere Zeilen, mit Autocomplete
- **Fenstersensoren** – mehrere möglich, `+` für weitere Zeilen, mit Autocomplete
- **Temperatur-Presets**: Komfort, Eco-Offset/Max, Schlaf-Offset/Max, Abwesend-Offset/Max
- **CO₂-Sensor, Feuchtigkeit-Sensor** (Schimmelschutz), Anwesenheits-Entitäten, Boost-Temperatur
- **Erweitert**: Zimmer-Offset, Totband, TRV-Verhalten (`trv_temp_weight`, `trv_temp_offset`, `trv_min_send_interval`)

Das Add-Modal ist vollständig mit dem Edit-Modal synchronisiert – kein Feld fehlt in einem der beiden.

### Zimmer bearbeiten

Klick auf **Bearbeiten** öffnet das Edit-Modal mit allen aktuellen Werten vorausgefüllt:
- Alle Thermostate und Fenstersensoren werden angezeigt
- Alle Presets und erweiterten Einstellungen sind editierbar
- **Schnell-Boost**: Boost-Dauer eingeben und direkt aktivieren
- **💾 Speichern** übernimmt alle Änderungen

### Zimmer löschen

**🗑** → Bestätigungs-Dialog → Zimmer und alle Entitäten werden entfernt.

### Sub-Tabs im Zimmer-Detail

Nach Auswahl eines Zimmers stehen drei Sub-Tabs zur Verfügung:

#### 📅 Zeitplan

Wöchentliche Zeitpläne für das ausgewählte Zimmer bearbeiten.

**Tagesgruppen:**
- Mehrere Tagesgruppen möglich (z.B. „Mo–Fr" und „Sa–So")
- Tage per Klick auf die Wochentags-Chips auswählen/abwählen
- **+ Gruppe hinzufügen** für weitere Tagesgruppen

**Zeiträume** pro Gruppe:

| Spalte | Beschreibung |
|--------|-------------|
| Von | Startzeit (HH:MM) |
| Bis | Endzeit (HH:MM) |
| Temp °C | Zieltemperatur in diesem Zeitraum |
| Offset | Zusätzlicher Offset (±3°C) |
| ✕ | Zeitraum löschen |

> Übernacht-Zeiträume (z.B. 22:00–06:00) sind möglich.

**💾 Zeitpläne speichern** speichert die Zeitpläne des aktuell ausgewählten Zimmers.

> **Hinweis:** Zeitpläne werden zimmerweise gespeichert. Das Wechseln zu einem anderen Zimmer **verliert ungespeicherte Änderungen**.

#### 🗓️ Wochenansicht

Kalenderartige Übersicht des Zimmer-Zeitplans über die Woche.

#### 📈 Verlauf

SVG-Chart mit der 7-Tage-Historie (stündlich): Ist-Temperatur und Solltemperatur-Verlauf,
inkl. Min/Max/Ø-Statistik.

---

## Tab: 📊 Übersicht (Diagnose)

Aktualisiert sich ebenfalls automatisch alle 5 Sekunden.

- Systemstatus aller Zimmer auf einen Blick
- Anforderungen, Betriebszustände, Sensor-Werte
- Energie- und Laufzeit-Statistiken
- Strompreis-Chart (Tibber/Nordpool-Stundenpreise)
- Live-ETA-Vorheiz-Status mit Ankunfts-Tabelle

---

## Tab: 🔥 Analyse

Zimmer-Auswahl per Pill-Buttons oben, dann pro Zimmer:

- **Anforderungs-Heatmap**: gelernter Wochentag/Uhrzeit-Verlauf der Heizanforderung (EMA über
  mehrere Wochen). Blau = niedrige, Rot = hohe Anforderung
- **Optimum-Start-Lernkurve**: Ø-Aufheizzeit (flach, ohne Außensensor) und außentemperatur-
  korrigierte Vorheizzeit, tabellarisch mit Außentemperatur-Bucket, Ø-Minuten und Messpunkten
- **Abkühlrate** (thermische Masse): °C/h je °C Differenz innen/außen
- **Optimum-Stop-Status**: erscheint nur, wenn gerade aktiv – zeigt wie viele Minuten früher
  abgeschaltet wurde und die vorhergesagte Temperatur bei Zeitplan-Ende

Dieser Tab hat **keinen** automatischen Refresh (die Lerndaten ändern sich nur langsam).

---

## Tab: ⚙️ Einstellungen

Alle globalen Parameter auf einen Blick, u. a.:

- **Hardware & Steuerung**: Außensensor, TRV-Sendeintervall, Ventilpositions-Auswertung
- **Systemmodus** manuell setzen
- **Temperaturen**: Abwesend, Urlaub, Frostschutz
- **Sommerautomatik**: Ein/Aus + Schwellenwert + externer Schalter, Kälteprognose-Frühstart
- **Nachtabsenkung & Vorheizen**: Absenkung in °C, Vorheiz-Vorlaufzeit, Optimum Start
- **Anwesenheitserkennung**: `person.*`/`device_tracker.*` auswählen, Verzögerung, ETA-Vorheizen
- **Gäste-Modus & Urlaubs-Assistent**: Dauer, Datumsbereich, Kalenderintegration, Feiertagskalender
- **Energie & Solar**: Solar-Sensor + Schwellenwert + Boost, Strompreis-Sensor + Schwellenwert + Eco-Absenkung
- **Lüftungsempfehlung**: CO₂-/Feuchte-Schwellen
- **Intelligente Regelung**: Adaptives Vorheizen, ETA-Schwelle
- **Kalkschutz & Stuck-Valve-Erkennung**: Ventil-Übungszyklus, Timeout für die Fehlererkennung
- **Peak Shaving**: Ein/Aus + Verzögerung
- **Backup & Restore**: Export als JSON-Datei-Download, Import via Datei-Upload; Reset gelernter Werte (Heizkurven-Korrektur, Aufheizhistorie) und Statistiken (Laufzeiten/Energie heute) getrennt voneinander

Es gibt **keinen** Bereich für einen zentralen Heizungsschalter, Hysterese/Mindestzeiten oder
Kühlung – diese Funktionen existieren seit v2.0.0/v2.1.0 nicht mehr.

---

## Tab: 📈 Heizkurve

Grafischer Editor für die Außentemperatur-Heizkurve.

### Tabelle

Jede Zeile: Außentemperatur → Zieltemperatur. Mindestens 2 Punkte erforderlich.

- **+ Punkt** fügt eine neue Zeile hinzu
- **✕** löscht eine Zeile
- Beim Eingeben wird die Vorschau live aktualisiert

### Canvas-Vorschau

- Farbverlauf-Linie (rot = hoch, grün = niedrig)
- Datenpunkte als rote Kreise
- **Blauer gestrichelter Marker**: aktuelle Außentemperatur

### Speichern

**💾 Heizkurve speichern** – speichert direkt in die Integration. Kein Neustart nötig.

---

## Technische Details

### Warum kein Auto-Refresh in allen Tabs?

HA sendet State-Updates sehr häufig (mehrmals pro Sekunde). Würde das Panel bei jedem Update neu rendern, würden DOM-Elemente während Klicks ersetzt und Buttons wären unbenutzbar.

**Lösung:**
- Nur Dashboard und Übersicht (Diagnose) refreshen automatisch (alle 5 s, pausiert während der Nutzer interagiert)
- Alle anderen Tabs (Zimmer, Analyse, Einstellungen, Heizkurve) rendern nur beim Tab-Wechsel
- Modals leben in einem separaten `#modal-root` Container und überleben Tab-Wechsel

### Entity-Autocomplete

Alle Text-Inputs für Entity-IDs nutzen `<datalist>` mit allen passenden HA-Entitäten:
- Temperatursensor: alle `sensor.*`
- Thermostate/TRVs: alle `climate.*`
- Fenstersensoren: alle `binary_sensor.*`

Beim Tippen filtert der Browser automatisch die Vorschläge.

### Fehlerbehandlung

Alle Service-Calls sind in try/catch gewrappt. Fehler erscheinen als Toast-Benachrichtigung am unteren Bildschirmrand. Ein Rendering-Fehler in einem Tab zeigt eine Fehlermeldung statt eines leeren/schwarzen Bildschirms an.
