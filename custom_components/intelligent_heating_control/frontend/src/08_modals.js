/**
 * 08_modals.js
 * IHC Frontend – Modals
 * Contains: _showAddRoomModal, _showEditRoomModal, _showConfirmModal,
 *           _showModal, _closeModal, _cleanupEntityPickers,
 *           _bindEntityListAdders, _makeHaSchedRow, _bindHaSchedAdder, _collectHaScheduleRows
 */

  _showAddRoomModal() {
    const isTrv = (this._getGlobal()?.controller_mode || 'switch') === 'trv';
    this._showModal(`
      <div class="modal-title">+ Zimmer hinzufügen</div>

      <div class="form-group">
        <label class="form-label">Zimmername *</label>
        <input type="text" class="form-input full" id="m-name" placeholder="z.B. Wohnzimmer">
      </div>

      <div class="form-group">
        <label class="form-label">Temperatursensor</label>
        <input type="text" class="form-input full" id="m-sensor"
          placeholder="sensor.wohnzimmer_temp" data-ep-domains="sensor" autocomplete="off">
        <span class="form-hint">Entity-ID des Temperatursensors</span>
      </div>

      <div class="modal-section">
        <div class="modal-section-title">Thermostate / TRVs (mehrere möglich)</div>
        <div class="entity-list" id="valve-list">
          <div class="entity-row">
            <input type="text" class="form-input" placeholder="climate.wohnzimmer (optional)"
              data-ep-domains="climate" autocomplete="off">
            <button class="btn btn-secondary btn-icon add-entity" data-list="valve-list" data-ep-domains="climate">+</button>
          </div>
        </div>
      </div>

      <div class="modal-section">
        <div class="modal-section-title">Fenstersensoren (mehrere möglich)</div>
        <div class="entity-list" id="window-list">
          <div class="entity-row">
            <input type="text" class="form-input" placeholder="binary_sensor.fenster_wz (optional)"
              data-ep-domains="binary_sensor" autocomplete="off">
            <button class="btn btn-secondary btn-icon add-entity" data-list="window-list" data-ep-domains="binary_sensor">+</button>
          </div>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Luftfeuchtigkeitssensor (optional)</label>
        <input type="text" class="form-input full" id="m-humidity-sensor"
          placeholder="sensor.wohnzimmer_humidity" data-ep-domains="sensor" autocomplete="off">
        <span class="form-hint">Für Schimmelschutz-Erkennung</span>
      </div>

      <div class="form-group">
        <label class="form-label">Schimmelschutz</label>
        <select class="form-select" id="m-mold-protection">
          <option value="true">Aktiviert</option>
          <option value="false">Deaktiviert</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Schimmelschutz-Schwelle (%)</label>
        <input type="number" class="form-input full" id="m-mold-humidity-threshold" value="70" step="1" min="50" max="95">
        <span class="form-hint">Luftfeuchtigkeit ab der Schimmelschutz-Warnung ausgelöst wird</span>
      </div>

      <div class="form-group">
        <label class="form-label">CO₂-Sensor (optional)</label>
        <input type="text" class="form-input full" id="m-co2-sensor"
          placeholder="sensor.co2_wohnzimmer" data-ep-domains="sensor" autocomplete="off">
        <span class="form-hint">ppm → Lüftungsempfehlung</span>
      </div>

      <div class="form-group">
        <label class="form-label">CO₂ Gut-Schwelle (ppm)</label>
        <input type="number" class="form-input full" id="m-co2-threshold-good" value="800" step="50" min="400" max="1000">
        <span class="form-hint">Unter diesem Wert = gute Luft (Standard: 800 ppm)</span>
      </div>

      <div class="form-group">
        <label class="form-label">CO₂ Lüften-Schwelle (ppm)</label>
        <input type="number" class="form-input full" id="m-co2-threshold-bad" value="1200" step="50" min="800" max="2000">
        <span class="form-hint">Über diesem Wert = Lüftungsempfehlung (Standard: 1200 ppm)</span>
      </div>

      <div class="form-group">
        <label class="form-label">Anwesenheits-Entitäten (optional)</label>
        <input type="text" class="form-input full" id="m-presence-entities"
          placeholder="person.max, device_tracker.handy"
          data-ep-domains="person,device_tracker,input_boolean,binary_sensor" autocomplete="off">
        <span class="form-hint">Zimmer wechselt auf Abwesend-Temp wenn niemand da · leer = immer anwesend</span>
      </div>

      <div class="form-group">
        <label class="form-label">Bewegungsmelder (PIR)</label>
        <input class="form-input" type="text" id="m-presence-sensor"
          value="" placeholder="binary_sensor.bewegung_wohnzimmer">
      </div>
      <div class="form-group">
        <label class="form-label">PIR Einschalt-Verzögerung (s)</label>
        <input class="form-input" type="number" id="m-presence-sensor-on-delay"
          min="0" max="3600" step="30" value="300">
      </div>
      <div class="form-group">
        <label class="form-label">PIR Ausschalt-Verzögerung (s)</label>
        <input class="form-input" type="number" id="m-presence-sensor-off-delay"
          min="0" max="3600" step="30" value="300">
      </div>

      <div class="form-group">
        <label class="form-label">🎚️ Sensor-Kalibrierung (°C)</label>
        <input type="number" class="form-input full" id="m-temp-calibration" value="0" step="0.1" min="-5" max="5">
        <span class="form-hint">Offset für den Raumtemperatursensor. Positiv = Sensor misst zu kalt, negativ = zu warm. 0 = deaktiviert.</span>
      </div>

      <details class="modal-collapsible">
        <summary class="modal-section-title">⚡ Aggressiver Modus (für träge TRVs)</summary>
        <div style="font-size:11px;color:var(--secondary-text-color);margin:8px 0 10px">
          Wenn der Raum weit unter dem Sollwert liegt, wird der TRV-Sollwert temporär überhöht um
          schneller aufzuheizen. Der TRV schließt selbst wenn er die Zieltemperatur erreicht.
          <strong>Standard: deaktiviert.</strong>
        </div>
        <div class="settings-grid">
          <div class="settings-item" style="grid-column:1/-1">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
              <input type="checkbox" id="m-aggressive-mode">
              Aggressiver Modus aktivieren
            </label>
            <span class="form-hint">Nur sinnvoll bei TRVs mit eigener Regelung (z.B. Zigbee2MQTT TRVs)</span>
          </div>
          <div class="settings-item">
            <label>Aktivierungsbereich (°C unter Soll)</label>
            <input type="number" class="form-input" id="m-aggressive-range" value="2" step="0.5" min="0.5" max="5">
            <span class="form-hint">Modus aktiviert wenn Raumtemp um diesen Wert unter Soll liegt</span>
          </div>
          <div class="settings-item">
            <label>Überhöhung (°C über Soll)</label>
            <input type="number" class="form-input" id="m-aggressive-offset" value="3" step="0.5" min="0.5" max="8">
            <span class="form-hint">TRV bekommt Soll + Überhöhung als Setpoint</span>
          </div>
        </div>
      </details>

      <div class="modal-section">
        <div class="modal-section-title">Energieerfassung</div>
        <div style="font-size:11px;color:var(--secondary-text-color);margin-bottom:10px">
          Im TRV-Modus wird der Verbrauch pro Zimmer geschätzt. Mit einem Heizkostenverteiler-Sensor
          (Wireless M-Bus) ist die Abrechnung direkt aus dem Gerät möglich.
        </div>
        <div class="settings-grid">
          <div class="settings-item">
            <label>Heizleistung Zimmer (kW)</label>
            <input type="number" class="form-input" id="m-radiator-kw" value="1.0" step="0.1" min="0.1" max="5.0">
            <span class="form-hint">Nennleistung der Heizkörper im Zimmer</span>
          </div>
          <div class="settings-item">
            <label>HKV-Sensor (optional)</label>
            <input type="text" class="form-input" id="m-hkv-sensor"
              placeholder="sensor.hkv_wohnzimmer" data-ep-domains="sensor" autocomplete="off">
            <span class="form-hint">Wireless M-Bus / Ista / Techem Einheitenzähler</span>
          </div>
          <div class="settings-item">
            <label>HKV-Faktor (kWh/Einheit)</label>
            <input type="number" class="form-input" id="m-hkv-factor" value="0.083" step="0.001" min="0.001" max="1.0">
            <span class="form-hint">Aus Ihrer Jahresabrechnung: Gesamtkostenkennzahl</span>
          </div>
        </div>
      </div>

      <div class="modal-section">
        <div class="modal-section-title">Temperatur-Presets</div>
        <div style="font-size:11px;color:var(--secondary-text-color);margin-bottom:10px">
          Komfort wird von der Außentemperatur berechnet (Heizkurve).
          Eco und Schlaf = Komfort minus Abzug, mit optionalem Maximum.
        </div>
        <div class="settings-grid">
          <div class="settings-item">
            <label>Komfort Fallback (°C)</label>
            <input type="number" class="form-input" id="m-comfort" value="21" step="0.5" min="15" max="30">
            <span class="form-hint">Nur wenn kein Außensensor vorhanden</span>
          </div>
          <div class="settings-item">
            <label>Abwesend-Temperatur (°C)</label>
            <input type="number" class="form-input" id="m-away-temp-room" value="16" step="0.5" min="10" max="22">
            <span class="form-hint">Feste Temperatur wenn Zimmer-Modus auf "Abwesend" steht</span>
          </div>
        </div>
        <div class="settings-grid" style="margin-top:8px">
          <div class="settings-item">
            <label>Eco Abzug (°C)</label>
            <input type="number" class="form-input" id="m-eco-offset" value="3" step="0.5" min="0" max="10">
            <span class="form-hint">Eco = Komfort − Abzug</span>
          </div>
          <div class="settings-item">
            <label>Eco Maximum (°C)</label>
            <input type="number" class="form-input" id="m-eco-max" value="21" step="0.5" min="10" max="28">
            <span class="form-hint">Eco nie höher als dieser Wert</span>
          </div>
          <div class="settings-item">
            <label>Schlaf Abzug (°C)</label>
            <input type="number" class="form-input" id="m-sleep-offset" value="4" step="0.5" min="0" max="10">
            <span class="form-hint">Schlaf = Komfort − Abzug</span>
          </div>
          <div class="settings-item">
            <label>Schlaf Maximum (°C)</label>
            <input type="number" class="form-input" id="m-sleep-max" value="19" step="0.5" min="10" max="25">
            <span class="form-hint">Schlaf nie höher als dieser Wert</span>
          </div>
          <div class="settings-item">
            <label>Abwesend Abzug (°C)</label>
            <input type="number" class="form-input" id="m-away-offset" value="6" step="0.5" min="0" max="15">
            <span class="form-hint">Abwesend = Komfort − Abzug</span>
          </div>
          <div class="settings-item">
            <label>Abwesend Maximum (°C)</label>
            <input type="number" class="form-input" id="m-away-max" value="18" step="0.5" min="5" max="22">
            <span class="form-hint">Abwesend nie höher als dieser Wert</span>
          </div>
        </div>
      </div>

      <details class="modal-collapsible">
        <summary class="modal-section-title">🚀 Boost &amp; TRV-Sensor</summary>
        <div class="settings-grid" style="margin-top:8px">
          <div class="settings-item">
            <label>Standard-Boost-Dauer (min)</label>
            <input type="number" class="form-input" id="m-boost-dur" value="60" step="5" min="5" max="480">
            <span class="form-hint">Nutzt HA nativen Boost-Modus auf dem TRV – kein manuelles Temperaturziel</span>
          </div>
        </div>
        <div style="font-size:11px;color:var(--secondary-text-color);margin:8px 0">
          TRV-Sensor-Integration: TRV-Temperatur als Korrekturquelle nutzen (0 = deaktiviert)
        </div>
        <div class="settings-grid">
          <div class="settings-item">
            <label>TRV-Temp Gewichtung (0–0.5)</label>
            <input type="number" class="form-input" id="m-trv-temp-weight" value="0" step="0.05" min="0" max="0.5">
            <span class="form-hint">0 = deaktiviert · 0.3 = 30% TRV-Temp einfließen lassen</span>
          </div>
          <div class="settings-item">
            <label>TRV-Temp Offset (°C)</label>
            <input type="number" class="form-input" id="m-trv-temp-offset" value="-2" step="0.5" min="-10" max="5">
            <span class="form-hint">Korrektur für Nähe zum Heizkörper (meist negativ)</span>
          </div>
          <div class="settings-item">
            <label>Ventil-Position als Demand</label>
            <label class="checkbox-row">
              <input type="checkbox" id="m-trv-valve-demand">
              <span>Aktiviert</span>
            </label>
            <span class="form-hint">TRV-Ventilöffnung in Heizbedarf-Berechnung einbeziehen</span>
          </div>
          <div class="settings-item">
            <label>Min. Sendeintervall (s)</label>
            <input type="number" class="form-input" id="m-trv-min-send-interval" value="0" step="60" min="0" max="1800">
            <span class="form-hint">0 = nur Temperatur-Hysterese · z.B. 300 = max alle 5 min</span>
          </div>
        </div>
      </details>

      <div class="modal-section">
        <div class="modal-section-title">Erweitert</div>
        <div class="settings-grid">
          <div class="settings-item">
            <label>Zimmer-Offset (°C)</label>
            <input type="number" class="form-input" id="m-offset" value="0" step="0.5" min="-5" max="5">
          </div>
          <div class="settings-item">
            <label>Totband (°C)</label>
            <input type="number" class="form-input" id="m-deadband" value="0.5" step="0.1" min="0.1" max="2">
          </div>
          <div class="settings-item" style="${isTrv ? 'display:none' : ''}">
            <label>Gewichtung</label>
            <input type="number" class="form-input" id="m-weight" value="1.0" step="0.1" min="0.1" max="5">
            <span class="form-hint">Nur im Heizungsschalter-Modus relevant (Einfluss auf Kessel-Anforderung)</span>
          </div>
        </div>
      </div>

      <div class="modal-section">
        <div class="modal-section-title">🌡️ Temperaturgrenzen &amp; Zeiten</div>
        <div class="settings-grid">
          <div class="settings-item">
            <label>Absolute Mindesttemperatur (°C)</label>
            <input type="number" class="form-input" id="m-absolute-min-temp" value="15" step="0.5" min="5" max="25">
            <span class="form-hint">Soll-Temperatur fällt nie unter diesen Wert (auch bei Eco/Away/Schlaf)</span>
          </div>
          <div class="settings-item">
            <label>Mindesttemperatur-Schwelle (°C)</label>
            <input type="number" class="form-input" id="m-room-temp-threshold" value="0" step="0.5" min="0" max="25" placeholder="0 = deaktiviert">
            <span class="form-hint">Heizt immer wenn Raumtemp darunter fällt (0 = deaktiviert)</span>
          </div>
          <div class="settings-item">
            <label>HA Klimaregler – Min.-Temperatur (°C)</label>
            <input type="number" class="form-input" id="m-min-temp" value="5" step="0.5" min="4" max="15">
            <span class="form-hint">Untergrenze des Temperatur-Schiebereglers im HA Climate-Baustein</span>
          </div>
          <div class="settings-item">
            <label>HA Klimaregler – Max.-Temperatur (°C)</label>
            <input type="number" class="form-input" id="m-max-temp" value="30" step="0.5" min="20" max="35">
            <span class="form-hint">Obergrenze des Temperatur-Schiebereglers im HA Climate-Baustein</span>
          </div>
          <div class="settings-item">
            <label>Zimmergröße (m²)</label>
            <input type="number" class="form-input" id="m-room-qm" value="0" step="1" min="0" max="200">
            <span class="form-hint">0 = nicht gesetzt · wird für Vorheizzeit, Gewichtung &amp; Energieberechnung genutzt</span>
          </div>
          <div class="settings-item">
            <label>Vorheizzeit pro Zimmer (min)</label>
            <input type="number" class="form-input" id="m-room-preheat" value="-1" step="1" min="-1" max="120">
            <span class="form-hint">-1 = globale Einstellung / automatisch aus qm</span>
          </div>
          <div class="settings-item">
            <label>Fenster-Reaktionszeit (s)</label>
            <input type="number" class="form-input" id="m-window-reaction-time" value="30" step="5" min="0" max="300">
            <span class="form-hint">Sekunden bis IHC auf offenes Fenster reagiert</span>
          </div>
          <div class="settings-item">
            <label>Wiederaufnahme nach Fenster-zu (s)</label>
            <input type="number" class="form-input" id="m-window-close-delay" value="0" step="5" min="0" max="600">
            <span class="form-hint">Sekunden nach Schließen bis normale Heizung wieder beginnt</span>
          </div>
          <div class="settings-item">
            <label>Fenster-Mindesttemperatur (°C)</label>
            <input type="number" class="form-input" id="m-window-open-temp" min="0" max="22" step="0.5" value="0" placeholder="0 = Frostschutz">
            <span class="form-hint">Temperatur bei offenem Fenster (0 = Frostschutz 7°C)</span>
          </div>
          <div class="settings-item">
            <label>Nach Fenster schließen</label>
            <select class="form-select" id="m-window-restore-mode">
              <option value="schedule">Zeitplan neu berechnen</option>
              <option value="previous">Letzten Sollwert wiederherstellen</option>
            </select>
            <span class="form-hint">Was passiert mit dem Sollwert wenn das Fenster wieder geschlossen wird</span>
          </div>
        </div>
      </div>

      <div class="modal-section">
        <div class="modal-section-title">🔗 Dynamische Sollwert-Entitäten <span style="font-weight:400;font-size:10px">(optional)</span></div>
        <div class="settings-grid">
          <div class="settings-item" style="grid-column:1/-1">
            <label>Komfort-Sollwert Entity</label>
            <input type="text" class="form-input full" id="m-comfort-temp-entity"
              placeholder="input_number.komfort_soll"
              data-ep-domains="input_number,sensor" autocomplete="off">
            <span class="form-hint">Überschreibt die Heizkurve als Komfort-Sollwert (optional)</span>
          </div>
          <div class="settings-item" style="grid-column:1/-1">
            <label>Eco-Sollwert Entity</label>
            <input type="text" class="form-input full" id="m-eco-temp-entity"
              placeholder="input_number.eco_soll"
              data-ep-domains="input_number,sensor" autocomplete="off">
            <span class="form-hint">Überschreibt den berechneten Eco-Sollwert (optional)</span>
          </div>
        </div>
        <div class="modal-section-title">⏱️ Komfort-Verlängerung <span style="font-weight:400;font-size:10px">(optional)</span></div>
        <div style="font-size:12px;color:var(--secondary-text-color);margin-bottom:8px">
          Heizung bleibt im Komfortmodus solange eine der Bedingungen zutrifft (z.B. TV läuft → kein Eco um 22 Uhr).
        </div>
        <div id="m-comfort-extend-list">
          <div class="entity-row ce-row">
            <input type="text" class="form-input" placeholder="entity_id" value="" autocomplete="off" data-ce-field="entity"
              data-ep-domains="media_player,switch,binary_sensor,input_boolean,person,device_tracker">
            <input type="text" class="form-input" style="max-width:90px" placeholder="on" value="on" data-ce-field="state">
            <button class="btn btn-secondary btn-icon" id="m-add-ce-entry">+</button>
          </div>
        </div>
        <span class="form-hint">Entity · Zustand – z.B. <code>media_player.tv</code> / <code>playing</code> oder <code>person.max</code> / <code>home</code></span>
      </div>

      <div class="modal-section">
        <div class="modal-section-title">📅 HA Zeitpläne <span style="font-weight:400;font-size:10px">(optional)</span></div>
        <div style="font-size:11px;color:var(--secondary-text-color);margin-bottom:10px">
          Verbindet bestehende HA <code>schedule.*</code>-Entitäten mit diesem Zimmer.
          Wenn ein Zeitplan aktiv ist, wird die gewählte Temperatur (Komfort/Eco/Schlaf) verwendet.
          Wenn kein Zeitplan aktiv ist, wird die unten gewählte Temperatur verwendet. Bedingung optional.
        </div>
        <div class="settings-item" style="margin-bottom:10px">
          <label>Wenn kein Zeitplan aktiv</label>
          <select class="form-select" id="m-sched-off-mode">
            <option value="eco" selected>Eco-Temperatur</option>
            <option value="sleep">Schlaf-Temperatur</option>
            <option value="away">Abwesend-Temperatur</option>
          </select>
        </div>
        <!-- schedule/condition rows use data-ep-domains via _createHaScheduleRow -->
        <div id="m-ha-sched-list"></div>
        <button class="btn btn-secondary" id="m-add-ha-sched" style="font-size:12px;margin-top:6px">+ Zeitplan hinzufügen</button>
      </div>

      <div class="btn-row">
        <button class="btn btn-primary" id="modal-confirm">Zimmer hinzufügen</button>
        <button class="btn btn-secondary modal-close-btn">Abbrechen</button>
      </div>
    `, async () => {
      const modal = this.shadowRoot.querySelector("#modal-root .modal");
      if (!modal) { this._toast("❌ Modal nicht gefunden"); return; }
      const name = modal.querySelector("#m-name")?.value.trim() || "";
      if (!name) { this._toast("❌ Bitte Zimmername eingeben"); return; }

      const valves  = [...modal.querySelectorAll("#valve-list input")].map(i => i.value.trim()).filter(Boolean);
      const windows = [...modal.querySelectorAll("#window-list input")].map(i => i.value.trim()).filter(Boolean);
      const ha_schedules = this._collectHaScheduleRows(modal);

      await this._callService("add_room", {
        name,
        temp_sensor:            modal.querySelector("#m-sensor")?.value.trim() || "",
        valve_entity:           valves[0] || "",
        valve_entities:         valves,
        window_sensor:          windows[0] || "",
        window_sensors:         windows,
        room_offset:            parseFloat(modal.querySelector("#m-offset")?.value) || 0,
        comfort_temp:           parseFloat(modal.querySelector("#m-comfort")?.value) || 21.0,
        away_temp_room:         parseFloat(modal.querySelector("#m-away-temp-room")?.value) || 16.0,
        eco_offset:             parseFloat(modal.querySelector("#m-eco-offset")?.value) || 3.0,
        eco_max_temp:           parseFloat(modal.querySelector("#m-eco-max")?.value) || 21.0,
        sleep_offset:           parseFloat(modal.querySelector("#m-sleep-offset")?.value) || 4.0,
        sleep_max_temp:         parseFloat(modal.querySelector("#m-sleep-max")?.value) || 19.0,
        away_offset:            parseFloat(modal.querySelector("#m-away-offset")?.value) || 6.0,
        away_max_temp:          parseFloat(modal.querySelector("#m-away-max")?.value) || 18.0,
        ha_schedule_off_mode:   modal.querySelector("#m-sched-off-mode")?.value || "eco",
        deadband:               parseFloat(modal.querySelector("#m-deadband")?.value) || 0.5,
        weight:                 parseFloat(modal.querySelector("#m-weight")?.value) || 1.0,
        absolute_min_temp:      parseFloat(modal.querySelector("#m-absolute-min-temp")?.value) || 15.0,
        min_temp:               parseFloat(modal.querySelector("#m-min-temp")?.value) || 5.0,
        max_temp:               parseFloat(modal.querySelector("#m-max-temp")?.value) || 30.0,
        room_temp_threshold:    parseFloat(modal.querySelector("#m-room-temp-threshold")?.value ?? "0") || 0,
        room_qm:                parseFloat(modal.querySelector("#m-room-qm")?.value) || 0,
        room_preheat_minutes:   parseInt(modal.querySelector("#m-room-preheat")?.value ?? "-1", 10),
        window_reaction_time:   parseInt(modal.querySelector("#m-window-reaction-time")?.value, 10) || 30,
        window_close_delay:     parseInt(modal.querySelector("#m-window-close-delay")?.value, 10) || 0,
        window_open_temp:       parseFloat(modal.querySelector("#m-window-open-temp")?.value ?? "0") || 0,
        window_restore_mode:    modal.querySelector("#m-window-restore-mode")?.value || "schedule",
        humidity_sensor:          modal.querySelector("#m-humidity-sensor")?.value.trim() || "",
        mold_protection_enabled:  modal.querySelector("#m-mold-protection")?.value === "true",
        mold_humidity_threshold:  parseFloat(modal.querySelector("#m-mold-humidity-threshold")?.value) || 70,
        co2_sensor:               modal.querySelector("#m-co2-sensor")?.value.trim() || "",
        co2_threshold_good:       parseInt(modal.querySelector("#m-co2-threshold-good")?.value, 10) || 800,
        co2_threshold_bad:        parseInt(modal.querySelector("#m-co2-threshold-bad")?.value, 10) || 1200,
        room_presence_entities: (modal.querySelector("#m-presence-entities")?.value || "")
                                  .split(",").map(s => s.trim()).filter(Boolean),
        presence_sensor:        modal.querySelector("#m-presence-sensor")?.value?.trim() || "",
        presence_sensor_on_delay: parseInt(modal.querySelector("#m-presence-sensor-on-delay")?.value ?? "300", 10),
        presence_sensor_off_delay: parseInt(modal.querySelector("#m-presence-sensor-off-delay")?.value ?? "300", 10),
        aggressive_mode_enabled: modal.querySelector("#m-aggressive-mode")?.checked === true,
        aggressive_mode_range:   parseFloat(modal.querySelector("#m-aggressive-range")?.value ?? "2") || 2.0,
        aggressive_mode_offset:  parseFloat(modal.querySelector("#m-aggressive-offset")?.value ?? "3") || 3.0,
        radiator_kw:            parseFloat(modal.querySelector("#m-radiator-kw")?.value) || 1.0,
        hkv_sensor:             modal.querySelector("#m-hkv-sensor")?.value.trim() || "",
        hkv_factor:             parseFloat(modal.querySelector("#m-hkv-factor")?.value) || 0.083,
        boost_default_duration: parseInt(modal.querySelector("#m-boost-dur")?.value, 10) || 60,
        trv_temp_weight:        parseFloat(modal.querySelector("#m-trv-temp-weight")?.value) || 0,
        trv_temp_offset:        parseFloat(modal.querySelector("#m-trv-temp-offset")?.value ?? "-2"),
        trv_valve_demand:       modal.querySelector("#m-trv-valve-demand")?.checked === true,
        trv_min_send_interval:  parseInt(modal.querySelector("#m-trv-min-send-interval")?.value, 10) || 0,
        temp_calibration:       parseFloat(modal.querySelector("#m-temp-calibration")?.value ?? "0") || 0,
        comfort_temp_entity:      modal.querySelector("#m-comfort-temp-entity")?.value.trim() || "",
        eco_temp_entity:          modal.querySelector("#m-eco-temp-entity")?.value.trim() || "",
        comfort_extend_entity: "",
        comfort_extend_state:  "on",
        comfort_extend_entries: [...modal.querySelectorAll("#m-comfort-extend-list .ce-row")]
          .map(r => ({ entity: r.querySelector('[data-ce-field="entity"]')?.value.trim() || "", state: r.querySelector('[data-ce-field="state"]')?.value.trim() || "on" }))
          .filter(e => e.entity),
        ha_schedules,
      });
      this._closeModal();
      this._toast("✓ Zimmer hinzugefügt – HA lädt Entitäten neu");
    });
    this._bindEntityListAdders();
    this._bindHaSchedAdder([], "m-ha-sched-list", "m-add-ha-sched");
    this._bindComfortExtendAdder("m-comfort-extend-list", "m-add-ce-entry");
    // Pickers are attached by _showModal already; schedule rows attached separately
  }

  _showEditRoomModal(entityId) {
    const isTrv = (this._getGlobal()?.controller_mode || 'switch') === 'trv';
    const rooms = this._getRoomData();
    const room  = rooms[entityId];
    if (!room) return;

    // Pre-fill existing valve entities
    const valveRows = room.valve_entities.length > 0
      ? room.valve_entities.map((e, i) => `
          <div class="entity-row">
            <input type="text" class="form-input" value="${e}"
              data-ep-domains="climate" autocomplete="off" placeholder="climate.entity">
            ${i === 0
              ? `<button class="btn btn-secondary btn-icon add-entity" data-list="valve-list" data-ep-domains="climate">+</button>`
              : `<button class="btn btn-danger btn-icon remove-entity">✕</button>`}
          </div>`).join("")
      : `<div class="entity-row">
           <input type="text" class="form-input" placeholder="climate.entity (optional)"
             data-ep-domains="climate" autocomplete="off">
           <button class="btn btn-secondary btn-icon add-entity" data-list="valve-list" data-ep-domains="climate">+</button>
         </div>`;

    // Pre-fill existing window sensors
    const windowRows = room.window_sensors.length > 0
      ? room.window_sensors.map((e, i) => `
          <div class="entity-row">
            <input type="text" class="form-input" value="${e}"
              data-ep-domains="binary_sensor" autocomplete="off" placeholder="binary_sensor.fenster">
            ${i === 0
              ? `<button class="btn btn-secondary btn-icon add-entity" data-list="window-list" data-ep-domains="binary_sensor">+</button>`
              : `<button class="btn btn-danger btn-icon remove-entity">✕</button>`}
          </div>`).join("")
      : `<div class="entity-row">
           <input type="text" class="form-input" placeholder="binary_sensor.fenster (optional)"
             data-ep-domains="binary_sensor" autocomplete="off">
           <button class="btn btn-secondary btn-icon add-entity" data-list="window-list" data-ep-domains="binary_sensor">+</button>
         </div>`;

    this._showModal(`
      <div class="modal-title">✏️ ${room.name} bearbeiten</div>

      <div class="info-box" style="margin-bottom:12px">
        Ist: <strong>${room.current_temp ?? "—"} °C</strong>
        &nbsp;→&nbsp; Soll: <strong>${room.target_temp ?? "—"} °C</strong>
        &nbsp;· Anforderung: <strong>${room.demand} %</strong>
      </div>

      <div class="form-group">
        <label class="form-label">Betriebsmodus</label>
        <select class="form-select full" id="m-mode">
          ${Object.entries(MODE_LABELS).map(([k, v]) =>
            `<option value="${k}" ${room.room_mode === k ? "selected" : ""}>${MODE_ICONS[k]} ${v}</option>`
          ).join("")}
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Temperatursensor</label>
        <input type="text" class="form-input full" id="m-sensor"
          value="${room.temp_sensor}" placeholder="sensor.wohnzimmer_temp"
          data-ep-domains="sensor" autocomplete="off">
      </div>

      <div class="modal-section">
        <div class="modal-section-title">Thermostate / TRVs (mehrere möglich)</div>
        <div class="entity-list" id="valve-list">${valveRows}</div>
      </div>

      <div class="modal-section">
        <div class="modal-section-title">Fenstersensoren (mehrere möglich)</div>
        <div class="entity-list" id="window-list">${windowRows}</div>
      </div>

      <div class="modal-section">
        <div class="modal-section-title">Temperatur-Presets</div>
        <div style="font-size:11px;color:var(--secondary-text-color);margin-bottom:10px">
          Alle Temperaturen werden von der Heizkurve (Außentemperatur) geführt.<br>
          ${room.comfort_temp_eff != null ? `<strong>Aktuell → Komfort: ${room.comfort_temp_eff.toFixed(1)}°C · Eco: ${room.eco_temp_eff != null ? room.eco_temp_eff.toFixed(1) : '—'}°C · Schlaf: ${room.sleep_temp_eff != null ? room.sleep_temp_eff.toFixed(1) : '—'}°C · Abwesend: ${room.away_temp_eff != null ? room.away_temp_eff.toFixed(1) : '—'}°C</strong>` : ''}
        </div>
        <div class="settings-grid">
          <div class="settings-item">
            <label>Komfort Fallback (°C)</label>
            <input type="number" class="form-input" id="m-comfort" value="${room.comfort_temp}" step="0.5" min="15" max="30">
            <span class="form-hint">Nur wenn kein Außensensor vorhanden</span>
          </div>
          <div class="settings-item">
            <label>Abwesend-Temperatur (°C)</label>
            <input type="number" class="form-input" id="m-away-temp-room" value="${room.away_temp_room ?? 16}" step="0.5" min="10" max="22">
            <span class="form-hint">Feste Temperatur wenn Zimmer-Modus auf "Abwesend" steht</span>
          </div>
        </div>
        <div class="settings-grid" style="margin-top:8px">
          <div class="settings-item">
            <label>Eco Abzug (°C)</label>
            <input type="number" class="form-input" id="m-eco-offset" value="${room.eco_offset}" step="0.5" min="0" max="10">
            <span class="form-hint">Eco = Komfort − Abzug</span>
          </div>
          <div class="settings-item">
            <label>Eco Maximum (°C)</label>
            <input type="number" class="form-input" id="m-eco-max" value="${room.eco_max_temp}" step="0.5" min="10" max="28">
            <span class="form-hint">Eco nie höher als dieser Wert</span>
          </div>
          <div class="settings-item">
            <label>Schlaf Abzug (°C)</label>
            <input type="number" class="form-input" id="m-sleep-offset" value="${room.sleep_offset}" step="0.5" min="0" max="10">
            <span class="form-hint">Schlaf = Komfort − Abzug</span>
          </div>
          <div class="settings-item">
            <label>Schlaf Maximum (°C)</label>
            <input type="number" class="form-input" id="m-sleep-max" value="${room.sleep_max_temp}" step="0.5" min="10" max="25">
            <span class="form-hint">Schlaf nie höher als dieser Wert</span>
          </div>
          <div class="settings-item">
            <label>Abwesend Abzug (°C)</label>
            <input type="number" class="form-input" id="m-away-offset" value="${room.away_offset}" step="0.5" min="0" max="15">
            <span class="form-hint">Abwesend = Komfort − Abzug</span>
          </div>
          <div class="settings-item">
            <label>Abwesend Maximum (°C)</label>
            <input type="number" class="form-input" id="m-away-max" value="${room.away_max_temp}" step="0.5" min="5" max="22">
            <span class="form-hint">Abwesend nie höher als dieser Wert</span>
          </div>
        </div>
      </div>

      <div class="modal-section">
        <div class="modal-section-title">🔗 Dynamische Sollwert-Entitäten <span style="font-weight:400;font-size:10px">(optional)</span></div>
        <div class="settings-grid">
          <div class="settings-item" style="grid-column:1/-1">
            <label>Komfort-Sollwert Entity</label>
            <input type="text" class="form-input full" id="m-comfort-temp-entity"
              value="${room.comfort_temp_entity || ''}"
              placeholder="input_number.komfort_soll"
              data-ep-domains="input_number,sensor" autocomplete="off">
            <span class="form-hint">Überschreibt die Heizkurve als Komfort-Sollwert (optional)</span>
          </div>
          <div class="settings-item" style="grid-column:1/-1">
            <label>Eco-Sollwert Entity</label>
            <input type="text" class="form-input full" id="m-eco-temp-entity"
              value="${room.eco_temp_entity || ''}"
              placeholder="input_number.eco_soll"
              data-ep-domains="input_number,sensor" autocomplete="off">
            <span class="form-hint">Überschreibt den berechneten Eco-Sollwert (optional)</span>
          </div>
        </div>
        <div class="modal-section-title">⏱️ Komfort-Verlängerung <span style="font-weight:400;font-size:10px">(optional)</span>
          ${room.comfort_extend_active ? '<span style="color:#43a047;font-size:11px;margin-left:4px">● aktiv</span>' : ''}
        </div>
        <div style="font-size:12px;color:var(--secondary-text-color);margin-bottom:8px">
          Heizung bleibt im Komfortmodus solange eine der Bedingungen zutrifft (z.B. TV läuft → kein Eco um 22 Uhr).
        </div>
        <div id="m-comfort-extend-list">
          ${(() => {
            const entries = (room.comfort_extend_entries && room.comfort_extend_entries.length > 0)
              ? room.comfort_extend_entries
              : (room.comfort_extend_entity ? [{entity: room.comfort_extend_entity, state: room.comfort_extend_state || "on"}] : []);
            if (entries.length === 0) {
              return `<div class="entity-row ce-row">
                <input type="text" class="form-input" placeholder="entity_id" value="" autocomplete="off" data-ce-field="entity"
                  data-ep-domains="media_player,switch,binary_sensor,input_boolean,person,device_tracker">
                <input type="text" class="form-input" style="max-width:90px" placeholder="on" value="on" data-ce-field="state">
                <button class="btn btn-secondary btn-icon" id="m-add-ce-entry">+</button>
              </div>`;
            }
            return entries.map((e, i) => `
              <div class="entity-row ce-row">
                <input type="text" class="form-input" placeholder="entity_id" value="${e.entity || ''}" autocomplete="off" data-ce-field="entity"
                  data-ep-domains="media_player,switch,binary_sensor,input_boolean,person,device_tracker">
                <input type="text" class="form-input" style="max-width:90px" placeholder="on" value="${e.state || 'on'}" data-ce-field="state">
                ${i === 0
                  ? `<button class="btn btn-secondary btn-icon" id="m-add-ce-entry">+</button>`
                  : `<button class="btn btn-danger btn-icon remove-ce-entry">✕</button>`}
              </div>`).join("");
          })()}
        </div>
        <span class="form-hint">Entity · Zustand – z.B. <code>media_player.tv</code> / <code>playing</code> oder <code>person.max</code> / <code>home</code></span>
      </div>

      <details class="modal-collapsible">
        <summary>Erweitert</summary>
        <div class="modal-collapsible-body">
          <div class="settings-grid">
            <div class="settings-item">
              <label>Zimmer-Offset (°C)</label>
              <input type="number" class="form-input" id="m-offset" value="${room.room_offset}" step="0.5" min="-5" max="5">
            </div>
            <div class="settings-item">
              <label>Totband (°C)</label>
              <input type="number" class="form-input" id="m-deadband" value="${room.deadband}" step="0.1" min="0.1" max="2">
            </div>
            <div class="settings-item" style="${isTrv ? 'display:none' : ''}">
              <label>Gewichtung</label>
              <input type="number" class="form-input" id="m-weight" value="${room.weight}" step="0.1" min="0.1" max="5">
              <span class="form-hint">Nur im Heizungsschalter-Modus relevant · Auto aus qm wenn 1.0 &amp; qm gesetzt${room.effective_weight && room.effective_weight !== room.weight ? ` · aktuell: ${room.effective_weight}` : ""}</span>
            </div>
          </div>
        </div>
      </details>

      <details class="modal-collapsible" ${(room.room_qm > 0 || room.absolute_min_temp !== 15 || room.room_temp_threshold > 0 || room.min_temp !== 5 || room.max_temp !== 30) ? "open" : ""}>
        <summary>🌡️ Temperaturgrenzen &amp; Zeiten</summary>
        <div class="modal-collapsible-body">
          <div class="settings-grid">
            <div class="settings-item">
              <label>Absolute Mindesttemperatur (°C)</label>
              <input type="number" class="form-input" id="m-absolute-min-temp"
                value="${room.absolute_min_temp ?? 15}" step="0.5" min="5" max="25">
              <span class="form-hint">Setpoint fällt nie unter diesen Wert (auch bei Eco/Away/Schlaf)</span>
            </div>
            <div class="settings-item">
              <label>Mindesttemperatur-Schwelle (°C)</label>
              <input type="number" class="form-input" id="m-room-temp-threshold"
                value="${room.room_temp_threshold ?? 0}" step="0.5" min="0" max="25" placeholder="0 = deaktiviert">
              <span class="form-hint">Heizt immer wenn Raumtemp darunter fällt (0 = deaktiviert)</span>
            </div>
            <div class="settings-item">
              <label>HA Klimaregler – Min.-Temperatur (°C)</label>
              <input type="number" class="form-input" id="m-min-temp"
                value="${room.min_temp ?? 5}" step="0.5" min="4" max="15">
              <span class="form-hint">Untergrenze des Temperatur-Schiebereglers im HA Climate-Baustein</span>
            </div>
            <div class="settings-item">
              <label>HA Klimaregler – Max.-Temperatur (°C)</label>
              <input type="number" class="form-input" id="m-max-temp"
                value="${room.max_temp ?? 30}" step="0.5" min="20" max="35">
              <span class="form-hint">Obergrenze des Temperatur-Schiebereglers im HA Climate-Baustein</span>
            </div>
            <div class="settings-item">
              <label>Zimmergröße (m²)</label>
              <input type="number" class="form-input" id="m-room-qm"
                value="${room.room_qm ?? 0}" step="1" min="0" max="200">
              <span class="form-hint">0 = nicht gesetzt · beeinflusst Vorheizzeit, Gewichtung, Energieberechnung</span>
            </div>
            <div class="settings-item">
              <label>Vorheizzeit pro Zimmer (min)</label>
              <input type="number" class="form-input" id="m-room-preheat"
                value="${room.room_preheat_minutes ?? -1}" step="1" min="-1" max="120">
              <span class="form-hint">-1 = globale Einstellung / auto aus qm · 0 = deaktiviert</span>
            </div>
            <div class="settings-item">
              <label>Fenster-Reaktionszeit (s)</label>
              <input type="number" class="form-input" id="m-window-reaction-time"
                value="${room.window_reaction_time ?? 30}" step="5" min="0" max="300">
              <span class="form-hint">Sekunden bis IHC auf offenes Fenster reagiert</span>
            </div>
            <div class="settings-item">
              <label>Wiederaufnahme nach Fenster-zu (s)</label>
              <input type="number" class="form-input" id="m-window-close-delay"
                value="${room.window_close_delay ?? 0}" step="5" min="0" max="600">
              <span class="form-hint">Sekunden nach Schließen bis normale Heizung wieder beginnt</span>
            </div>
            <div class="settings-item">
              <label>Fenster-Mindesttemperatur (°C)</label>
              <input type="number" class="form-input" id="m-window-open-temp"
                min="0" max="22" step="0.5" value="${room.window_open_temp ?? 0}" placeholder="0 = Frostschutz">
              <span class="form-hint">Temperatur bei offenem Fenster (0 = Frostschutz 7°C)</span>
            </div>
            <div class="settings-item">
              <label>Nach Fenster schließen</label>
              <select class="form-select" id="m-window-restore-mode">
                <option value="schedule" ${(room.window_restore_mode || 'schedule') === 'schedule' ? 'selected' : ''}>Zeitplan neu berechnen</option>
                <option value="previous" ${room.window_restore_mode === 'previous' ? 'selected' : ''}>Letzten Sollwert wiederherstellen</option>
              </select>
              <span class="form-hint">Was passiert mit dem Sollwert wenn das Fenster wieder geschlossen wird</span>
            </div>
          </div>
        </div>
      </details>

      <details class="modal-collapsible" ${(room.room_presence_entities?.length || room.presence_sensor) ? "open" : ""}>
        <summary>👤 Zimmer-Anwesenheit</summary>
        <div class="modal-collapsible-body">
          <div class="settings-item">
            <label>Anwesenheits-Entitäten</label>
            <input type="text" class="form-input" id="m-presence-entities"
              value="${(room.room_presence_entities || []).join(', ')}"
              placeholder="person.max, device_tracker.handy (leer = immer anwesend)"
              data-ep-domains="person,device_tracker,input_boolean,binary_sensor" autocomplete="off">
            <span class="form-hint">Zimmer wechselt auf Abwesend-Temperatur wenn niemand da</span>
          </div>
          <div class="settings-item">
            <label>Bewegungsmelder (PIR)</label>
            <input class="form-input" type="text" id="m-presence-sensor"
              value="${room.presence_sensor ?? ''}" placeholder="binary_sensor.bewegung_wohnzimmer">
          </div>
          <div class="settings-item">
            <label>PIR Einschalt-Verzögerung (s)</label>
            <input class="form-input" type="number" id="m-presence-sensor-on-delay"
              min="0" max="3600" step="30" value="${room.presence_sensor_on_delay ?? 300}">
          </div>
          <div class="settings-item">
            <label>PIR Ausschalt-Verzögerung (s)</label>
            <input class="form-input" type="number" id="m-presence-sensor-off-delay"
              min="0" max="3600" step="30" value="${room.presence_sensor_off_delay ?? 300}">
          </div>
        </div>
      </details>

      <details class="modal-collapsible" ${room.aggressive_mode_enabled ? "open" : ""}>
        <summary>⚡ Aggressiver Modus (für träge TRVs)</summary>
        <div class="modal-collapsible-body">
          <p style="font-size:11px;color:var(--secondary-text-color);margin:0 0 10px">
            Überhöht den TRV-Sollwert temporär wenn der Raum weit unter dem Zielwert liegt.
            Der TRV schließt selbst sobald er seine Eigentemperatur erreicht.
          </p>
          <div class="settings-grid">
            <div class="settings-item" style="grid-column:1/-1">
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
                <input type="checkbox" id="m-aggressive-mode" ${room.aggressive_mode_enabled ? "checked" : ""}>
                Aggressiver Modus aktivieren
              </label>
            </div>
            <div class="settings-item">
              <label>Aktivierungsbereich (°C unter Soll)</label>
              <input type="number" class="form-input" id="m-aggressive-range"
                value="${room.aggressive_mode_range ?? 2}" step="0.5" min="0.5" max="5">
              <span class="form-hint">Aktiv wenn Raumtemp um diesen Wert unter Soll liegt</span>
            </div>
            <div class="settings-item">
              <label>Überhöhung (°C über Soll)</label>
              <input type="number" class="form-input" id="m-aggressive-offset"
                value="${room.aggressive_mode_offset ?? 3}" step="0.5" min="0.5" max="8">
              <span class="form-hint">TRV bekommt Soll + Überhöhung als Setpoint</span>
            </div>
          </div>
        </div>
      </details>

      <details class="modal-collapsible" ${room.humidity_sensor || room.co2_sensor ? "open" : ""}>
        <summary>🌬️ Lüftung &amp; Schimmelschutz</summary>
        <div class="modal-collapsible-body">
          <div class="settings-grid">
            <div class="settings-item">
              <label>Feuchtigkeitssensor</label>
              <input type="text" class="form-input" id="m-humidity-sensor"
                value="${room.humidity_sensor || ''}" placeholder="sensor.feuchte (optional)"
                data-ep-domains="sensor" autocomplete="off">
              <span class="form-hint">Schimmelrisiko-Erkennung &amp; Lüftungsempfehlung</span>
            </div>
            <div class="settings-item">
              <label>Schimmelschutz</label>
              <select class="form-select" id="m-mold-protection">
                <option value="true" ${room.mold_protection_enabled !== false ? "selected" : ""}>Aktiviert</option>
                <option value="false" ${room.mold_protection_enabled === false ? "selected" : ""}>Deaktiviert</option>
              </select>
            </div>
            <div class="settings-item">
              <label>Schimmelschutz-Schwelle (%)</label>
              <input type="number" class="form-input" id="m-mold-humidity-threshold"
                value="${room.mold_humidity_threshold ?? 70}" step="1" min="50" max="95">
              <span class="form-hint">Luftfeuchtigkeit ab der Schimmelschutz ausgelöst wird</span>
            </div>
            <div class="settings-item">
              <label>CO₂-Sensor <em style="font-weight:400">(optional)</em></label>
              <input type="text" class="form-input" id="m-co2-sensor"
                value="${room.co2_sensor || ''}" placeholder="sensor.co2_wohnzimmer (optional)"
                data-ep-domains="sensor" autocomplete="off">
              <span class="form-hint">ppm → Lüftungsempfehlung</span>
            </div>
            <div class="settings-item">
              <label>CO₂ Gut-Schwelle (ppm)</label>
              <input type="number" class="form-input" id="m-co2-threshold-good"
                value="${room.co2_threshold_good ?? 800}" step="50" min="400" max="1000">
              <span class="form-hint">Unter diesem Wert = gute Luft (Standard: 800 ppm)</span>
            </div>
            <div class="settings-item">
              <label>CO₂ Lüften-Schwelle (ppm)</label>
              <input type="number" class="form-input" id="m-co2-threshold-bad"
                value="${room.co2_threshold_bad ?? 1200}" step="50" min="800" max="2000">
              <span class="form-hint">Über diesem Wert = Lüftungsempfehlung (Standard: 1200 ppm)</span>
            </div>
          </div>
        </div>
      </details>

      <details class="modal-collapsible" ${room.hkv_sensor || room.radiator_kw !== 1.0 ? "open" : ""}>
        <summary>⚡ Energieerfassung</summary>
        <div class="modal-collapsible-body">
          <p style="font-size:11px;color:var(--secondary-text-color);margin:0 0 10px">
            TRV-Modus: Verbrauch = Laufzeit × Heizleistung. Mit HKV-Sensor wird der Zähler direkt gelesen.
          </p>
          <div class="settings-grid">
            <div class="settings-item">
              <label>Heizleistung Zimmer (kW)</label>
              <input type="number" class="form-input" id="m-radiator-kw"
                value="${room.radiator_kw ?? 1.0}" step="0.1" min="0.1" max="5.0">
              <span class="form-hint">Nennleistung aller Heizkörper im Zimmer</span>
            </div>
            <div class="settings-item">
              <label>HKV-Sensor (optional)</label>
              <input type="text" class="form-input" id="m-hkv-sensor"
                value="${room.hkv_sensor || ''}" placeholder="sensor.hkv_wohnzimmer"
                data-ep-domains="sensor" autocomplete="off">
              <span class="form-hint">Ista / Techem / Wireless M-Bus Einheitenzähler</span>
            </div>
            <div class="settings-item">
              <label>HKV-Faktor (kWh/Einheit)</label>
              <input type="number" class="form-input" id="m-hkv-factor"
                value="${room.hkv_factor ?? 0.083}" step="0.001" min="0.001" max="1.0">
              <span class="form-hint">Aus der Jahresabrechnung: Gesamtenergie ÷ Gesamteinheiten</span>
            </div>
          </div>
        </div>
      </details>

      <details class="modal-collapsible" ${room.temp_calibration != null && room.temp_calibration !== 0 ? "open" : ""}>
        <summary>🎚️ Sensor-Kalibrierung</summary>
        <div class="modal-collapsible-body">
          <div class="settings-grid">
            <div class="settings-item" style="grid-column:1/-1">
              <label>Raumtemperatursensor-Offset (°C)</label>
              <input type="number" class="form-input" id="m-temp-calibration"
                value="${room.temp_calibration ?? 0}" step="0.1" min="-5" max="5">
              <span class="form-hint">Positiv = Sensor misst zu kalt (IHC addiert den Wert). Negativ = Sensor misst zu warm. 0 = deaktiviert.</span>
            </div>
          </div>
        </div>
      </details>

      <details class="modal-collapsible" ${room.ha_schedules?.length ? "open" : ""}>
        <summary>📅 HA Zeitpläne <span style="font-weight:400;font-size:10px;margin-left:6px">(optional)</span></summary>
        <div class="modal-collapsible-body">
          <p style="font-size:11px;color:var(--secondary-text-color);margin:0 0 10px">
            Verbindet HA <code>schedule.*</code>-Entitäten — wenn aktiv, wird die gewählte Temperatur (Komfort/Eco/Schlaf) verwendet.
          </p>
          <div class="settings-item" style="margin-bottom:10px">
            <label>Wenn kein Zeitplan aktiv</label>
            <select class="form-select" id="m-sched-off-mode">
              <option value="eco"   ${(room.ha_schedule_off_mode || 'eco') === 'eco'   ? 'selected' : ''}>Eco-Temperatur</option>
              <option value="sleep" ${(room.ha_schedule_off_mode || 'eco') === 'sleep' ? 'selected' : ''}>Schlaf-Temperatur</option>
              <option value="away"  ${(room.ha_schedule_off_mode || 'eco') === 'away'  ? 'selected' : ''}>Abwesend-Temperatur</option>
            </select>
          </div>
          <div id="m-ha-sched-list"></div>
          <button class="btn btn-secondary" id="m-add-ha-sched" style="font-size:12px;margin-top:6px">+ Zeitplan hinzufügen</button>
        </div>
      </details>

      <details class="modal-collapsible">
        <summary>⚡ Boost</summary>
        <div class="modal-collapsible-body">
          <p style="font-size:0.85em;color:var(--secondary-text-color);margin:0 0 8px">
            Aktiviert den nativen HA-Boost-Modus auf den TRVs. Kein Temperaturziel – der TRV öffnet vollständig.
          </p>
          <div class="settings-grid" style="margin-bottom:10px">
            <div class="settings-item">
              <label>Boost-Dauer (min)</label>
              <input type="number" class="form-input" id="m-boost-dur"
                value="${room.boost_default_duration ?? 60}" min="5" max="480" step="5">
            </div>
          </div>
          <div class="form-row" style="gap:8px">
            <button class="btn btn-secondary" id="m-boost-btn">⚡ Boost starten</button>
            ${room.boost_remaining > 0 ? `<button class="btn btn-danger" id="m-boost-cancel-btn">✕ Boost beenden (${room.boost_remaining} min übrig)</button>` : ""}
          </div>
        </div>
      </details>

      <details class="modal-collapsible" ${(room.trv_temp_weight > 0 || room.trv_valve_demand || room.trv_min_send_interval > 0) ? "open" : ""}>
        <summary>🌡️ TRV-Sensordaten &amp; Batterieschutz (optional)</summary>
        <div class="modal-collapsible-body">
          <p style="font-size:11px;color:var(--secondary-text-color);margin:0 0 10px">
            Thermostatventile (TRVs) haben eigene Sensoren. Alle Optionen sind optional und standardmäßig deaktiviert.
          </p>
          <div class="settings-grid">
            <div class="settings-item">
              <label>TRV-Temperaturanteil (0 = aus, 0.3 = 30 %)</label>
              <input type="number" class="form-input" id="m-trv-temp-weight"
                value="${room.trv_temp_weight ?? 0}" min="0" max="0.5" step="0.05"
                placeholder="0 = deaktiviert">
              <span class="form-hint">Wie stark die TRV-Eigentemperatur in den Messwert einfließt. 0 = gar nicht, 0.3 = 30 % TRV + 70 % Raumsensor. Als Fallback wenn kein Raumsensor vorhanden.</span>
            </div>
            <div class="settings-item">
              <label>TRV-Temperaturkorrektur (°C)</label>
              <input type="number" class="form-input" id="m-trv-temp-offset"
                value="${room.trv_temp_offset ?? -2}" min="-10" max="5" step="0.5"
                placeholder="-2.0">
              <span class="form-hint">TRV sitzt am Heizkörper → misst wärmer. Typischer Wert: −2 bis −5 °C. Wird vor dem Mischen abgezogen.</span>
            </div>
            <div class="settings-item" style="grid-column:1/-1">
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
                <input type="checkbox" id="m-trv-valve-demand" ${room.trv_valve_demand ? "checked" : ""}>
                Ventilstellung für Anforderungsberechnung nutzen
              </label>
              <span class="form-hint">Wenn das TRV seinen Öffnungsgrad meldet (0–100 %), wird dieser zur Korrektur der Heizanforderung verwendet. Voll offen → min. 30 % Anforderung. Fast geschlossen → max. 30 %.</span>
            </div>
            <div class="settings-item" style="grid-column:1/-1">
              <label>🔋 Batterieschutz: Mindestabstand zwischen Funkbefehlen (Sekunden)</label>
              <input type="number" class="form-input" id="m-trv-min-send-interval"
                value="${room.trv_min_send_interval ?? 0}" min="0" max="1800" step="60"
                placeholder="0 = deaktiviert">
              <span class="form-hint">
                IHC sendet normalerweise bei jeder Temperaturänderung ≥ 0,3 °C einen neuen Sollwert.
                Bei Funk-TRVs (Zigbee, Z-Wave) verbraucht jeder Funk-Befehl Batterie.
                Mit diesem Wert begrenzt du die Sendehäufigkeit: z.B. <strong>300 = maximal alle 5 Minuten</strong>.
                Große Änderungen (Modus-Wechsel, &gt;1 °C) werden trotzdem sofort gesendet.
                Empfehlung: 300–600 s. 0 = deaktiviert (immer senden wenn Schwelle überschritten).
              </span>
            </div>
            <div class="settings-item" style="grid-column:1/-1">
              <label>🎯 Per-TRV-Kalibrierung (JSON-Dict)</label>
              <textarea class="form-input" id="m-trv-calibrations" rows="3"
                placeholder='{"climate.trv_schrank": -2.0, "climate.trv_fenster": 0.5}'
                style="font-family:monospace;font-size:11px">${room.trv_calibrations ? JSON.stringify(room.trv_calibrations, null, 0) : ""}</textarea>
              <span class="form-hint">
                Optionale Temperatur-Offsets pro TRV-Entität (in °C). Negativ = TRV misst zu warm (z.B. nahe am Heizkörper).
                Format: <code>{"climate.trv_name": -2.0}</code>. Leer = deaktiviert.
              </span>
            </div>
          </div>
        </div>
      </details>

      <div class="btn-row">
        <button class="btn btn-primary" id="modal-confirm">💾 Speichern</button>
        <button class="btn btn-secondary modal-close-btn">Abbrechen</button>
      </div>
    `, async () => {
      const modal  = this.shadowRoot.querySelector("#modal-root .modal");
      if (!modal) { this._toast("❌ Modal nicht gefunden"); return; }
      const roomId = room.room_id;
      if (!roomId) { this._toast("❌ room_id fehlt – bitte HA neu starten"); return; }
      const mode    = modal.querySelector("#m-mode").value;
      const valves  = [...modal.querySelectorAll("#valve-list input")].map(i => i.value.trim()).filter(Boolean);
      const windows = [...modal.querySelectorAll("#window-list input")].map(i => i.value.trim()).filter(Boolean);
      const ha_schedules = this._collectHaScheduleRows(modal);
      await this._callService("set_room_mode", { id: roomId, mode });
      await this._callService("update_room", {
        id: roomId,
        temp_sensor:    modal.querySelector("#m-sensor").value.trim(),
        valve_entity:   valves[0] || "",
        valve_entities: valves,
        window_sensor:  windows[0] || "",
        window_sensors: windows,
        comfort_temp:          parseFloat(modal.querySelector("#m-comfort").value),
        away_temp_room:        parseFloat(modal.querySelector("#m-away-temp-room")?.value) || 16.0,
        eco_offset:            parseFloat(modal.querySelector("#m-eco-offset").value),
        eco_max_temp:          parseFloat(modal.querySelector("#m-eco-max").value),
        sleep_offset:          parseFloat(modal.querySelector("#m-sleep-offset").value),
        sleep_max_temp:        parseFloat(modal.querySelector("#m-sleep-max").value),
        away_offset:           parseFloat(modal.querySelector("#m-away-offset").value),
        away_max_temp:         parseFloat(modal.querySelector("#m-away-max").value),
        ha_schedule_off_mode:  modal.querySelector("#m-sched-off-mode")?.value || "eco",
        room_offset:    parseFloat(modal.querySelector("#m-offset").value),
        deadband:       parseFloat(modal.querySelector("#m-deadband").value),
        weight:         parseFloat(modal.querySelector("#m-weight").value),
        absolute_min_temp:      parseFloat(modal.querySelector("#m-absolute-min-temp")?.value) || 15,
        min_temp:               parseFloat(modal.querySelector("#m-min-temp")?.value) || 5.0,
        max_temp:               parseFloat(modal.querySelector("#m-max-temp")?.value) || 30.0,
        room_temp_threshold:    parseFloat(modal.querySelector("#m-room-temp-threshold")?.value ?? "0") || 0,
        room_qm:                parseFloat(modal.querySelector("#m-room-qm")?.value) || 0,
        room_preheat_minutes:   parseInt(modal.querySelector("#m-room-preheat")?.value ?? "-1", 10),
        window_reaction_time:   parseInt(modal.querySelector("#m-window-reaction-time")?.value, 10) || 30,
        window_close_delay:     parseInt(modal.querySelector("#m-window-close-delay")?.value, 10) || 0,
        window_open_temp:       parseFloat(modal.querySelector("#m-window-open-temp")?.value ?? "0") || 0,
        window_restore_mode:    modal.querySelector("#m-window-restore-mode")?.value || "schedule",
        humidity_sensor:          modal.querySelector("#m-humidity-sensor")?.value.trim() || "",
        mold_protection_enabled:  modal.querySelector("#m-mold-protection")?.value === "true",
        mold_humidity_threshold:  parseFloat(modal.querySelector("#m-mold-humidity-threshold")?.value) || 70,
        co2_sensor:               modal.querySelector("#m-co2-sensor")?.value.trim() || "",
        co2_threshold_good:       parseInt(modal.querySelector("#m-co2-threshold-good")?.value, 10) || 800,
        co2_threshold_bad:        parseInt(modal.querySelector("#m-co2-threshold-bad")?.value, 10) || 1200,
        radiator_kw:              parseFloat(modal.querySelector("#m-radiator-kw")?.value) || 1.0,
        hkv_sensor:               modal.querySelector("#m-hkv-sensor")?.value.trim() || "",
        hkv_factor:               parseFloat(modal.querySelector("#m-hkv-factor")?.value) || 0.083,
        room_presence_entities:   (modal.querySelector("#m-presence-entities")?.value || "")
                                    .split(",").map(s => s.trim()).filter(Boolean),
        presence_sensor:          modal.querySelector("#m-presence-sensor")?.value?.trim() || "",
        presence_sensor_on_delay: parseInt(modal.querySelector("#m-presence-sensor-on-delay")?.value ?? "300", 10),
        presence_sensor_off_delay: parseInt(modal.querySelector("#m-presence-sensor-off-delay")?.value ?? "300", 10),
        aggressive_mode_enabled:  modal.querySelector("#m-aggressive-mode")?.checked === true,
        aggressive_mode_range:    parseFloat(modal.querySelector("#m-aggressive-range")?.value ?? "2") || 2.0,
        aggressive_mode_offset:   parseFloat(modal.querySelector("#m-aggressive-offset")?.value ?? "3") || 3.0,
        boost_default_duration:   parseInt(modal.querySelector("#m-boost-dur")?.value, 10) || 60,
        trv_temp_weight:          parseFloat(modal.querySelector("#m-trv-temp-weight")?.value) || 0,
        trv_temp_offset:          parseFloat(modal.querySelector("#m-trv-temp-offset")?.value ?? "-2"),
        trv_valve_demand:         modal.querySelector("#m-trv-valve-demand")?.checked === true,
        trv_min_send_interval:    parseInt(modal.querySelector("#m-trv-min-send-interval")?.value, 10) || 0,
        trv_calibrations:         (() => { try { const v = modal.querySelector("#m-trv-calibrations")?.value.trim(); return v ? JSON.parse(v) : {}; } catch { return {}; } })(),
        temp_calibration:         parseFloat(modal.querySelector("#m-temp-calibration")?.value ?? "0") || 0,
        comfort_temp_entity:      modal.querySelector("#m-comfort-temp-entity")?.value.trim() || "",
        eco_temp_entity:          modal.querySelector("#m-eco-temp-entity")?.value.trim() || "",
        comfort_extend_entity: "",
        comfort_extend_state:  "on",
        comfort_extend_entries: [...modal.querySelectorAll("#m-comfort-extend-list .ce-row")]
          .map(r => ({ entity: r.querySelector('[data-ce-field="entity"]')?.value.trim() || "", state: r.querySelector('[data-ce-field="state"]')?.value.trim() || "on" }))
          .filter(e => e.entity),
        ha_schedules,
      });
      this._closeModal();
      this._toast(`✓ ${room.name} gespeichert`);
    });

    // Boost buttons inside modal
    setTimeout(() => {
      const modal = this.shadowRoot.querySelector("#modal-root .modal");
      const boostBtn = modal?.querySelector("#m-boost-btn");
      if (boostBtn) {
        boostBtn.addEventListener("click", () => {
          const dur = parseInt(modal.querySelector("#m-boost-dur")?.value, 10) || 60;
          this._callService("boost_room", { id: room.room_id, duration_minutes: dur });
          this._toast(`⚡ Boost ${dur} min für ${room.name}`);
          this._closeModal();
        });
      }
      const cancelBtn = modal?.querySelector("#m-boost-cancel-btn");
      if (cancelBtn) {
        cancelBtn.addEventListener("click", () => {
          this._callService("boost_room", { id: room.room_id, cancel: true });
          this._toast(`✓ Boost für ${room.name} beendet`);
          this._closeModal();
        });
      }
    }, 50);

    this._bindEntityListAdders();
    this._bindHaSchedAdder(room.ha_schedules || [], "m-ha-sched-list", "m-add-ha-sched");
    this._bindComfortExtendAdder("m-comfort-extend-list", "m-add-ce-entry");
  }

  _showConfirmModal(title, body, onConfirm) {
    this._showModal(`
      <div class="modal-title">${title}</div>
      <p style="color:var(--secondary-text-color);font-size:14px;margin-bottom:16px">${body}</p>
      <div class="btn-row">
        <button class="btn btn-danger" id="modal-confirm">Löschen</button>
        <button class="btn btn-secondary modal-close-btn">Abbrechen</button>
      </div>
    `, onConfirm);
  }

  _showModal(html, onConfirm) {
    const root = this.shadowRoot.querySelector("#modal-root");
    root.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal">
          <button class="modal-close">✕</button>
          ${html}
        </div>
      </div>`;

    this._modalOpen = true;

    const backdrop = root.querySelector(".modal-backdrop");
    backdrop.addEventListener("click", e => { if (e.target === backdrop) this._closeModal(); });
    root.querySelector(".modal-close").addEventListener("click", () => this._closeModal());
    root.querySelectorAll(".modal-close-btn").forEach(b =>
      b.addEventListener("click", () => this._closeModal())
    );
    const confirmBtn = root.querySelector("#modal-confirm");
    if (confirmBtn && onConfirm) confirmBtn.addEventListener("click", onConfirm);

    // Attach HA-style entity pickers to all entity inputs in the modal
    this._attachEntityPickers(root.querySelector(".modal"));
  }

  _closeModal() {
    // Clean up entity picker dropdowns from closed modal inputs
    const root = this.shadowRoot.querySelector("#modal-root");
    if (root) {
      root.querySelectorAll("input[data-ep-domains]").forEach(inp => inp._epCleanup?.());
      root.innerHTML = "";
    }
    this._modalOpen = false;
  }

  _cleanupEntityPickers(container) {
    container?.querySelectorAll("input[data-ep-domains]").forEach(inp => inp._epCleanup?.());
  }

  /** Binds "+"-buttons that add entity rows to entity-list containers. */
  _bindEntityListAdders() {
    setTimeout(() => {
      this.shadowRoot.querySelectorAll(".add-entity").forEach(btn => {
        btn.addEventListener("click", () => {
          const listId    = btn.dataset.list;
          const epDomains = btn.dataset.epDomains || "";
          const list      = this.shadowRoot.querySelector(`#${listId}`);
          if (!list) return;
          const placeholder = btn.closest(".entity-row").querySelector("input").placeholder;
          const row = document.createElement("div");
          row.className = "entity-row";
          row.innerHTML = `
            <input type="text" class="form-input" placeholder="${placeholder}"
              ${epDomains ? `data-ep-domains="${epDomains}"` : ""} autocomplete="off">
            <button class="btn btn-danger btn-icon remove-entity">✕</button>`;
          list.appendChild(row);
          row.querySelector(".remove-entity").addEventListener("click", () => row.remove());
          // Attach entity picker to the new input
          if (epDomains) this._attachEntityPickers(row);
        });
      });
      // Also bind remove-entity buttons already in DOM (pre-filled rows)
      this.shadowRoot.querySelectorAll(".remove-entity").forEach(btn => {
        if (!btn._bound) {
          btn._bound = true;
          btn.addEventListener("click", () => btn.closest(".entity-row").remove());
        }
      });
    }, 30);
  }

  // ── HA Schedule row helpers ─────────────────────────────────────────────

  /** Renders a single HA schedule row and returns its element. */
  _makeHaSchedRow(entry = {}) {
    const row = document.createElement("div");
    row.className = "ha-sched-row";
    row.style.cssText = "display:grid;grid-template-columns:1fr auto 1fr auto auto;gap:6px;align-items:center;margin-bottom:6px";
    row.innerHTML = `
      <input type="text" class="form-input hs-entity" placeholder="schedule.zimmer"
        data-ep-domains="schedule" autocomplete="off" value="${entry.entity || ''}">
      <select class="form-select hs-mode" style="min-width:90px">
        <option value="comfort" ${(entry.mode||'comfort')==='comfort'?'selected':''}>Komfort</option>
        <option value="eco"     ${entry.mode==='eco'    ?'selected':''}>Eco</option>
        <option value="sleep"   ${entry.mode==='sleep'  ?'selected':''}>Schlaf</option>
        <option value="away"    ${entry.mode==='away'   ?'selected':''}>Abwesend</option>
      </select>
      <input type="text" class="form-input hs-cond" placeholder="Bedingung (optional)"
        data-ep-domains="input_boolean,binary_sensor,person,device_tracker" autocomplete="off" value="${entry.condition_entity || ''}">
      <input type="text" class="form-input hs-cond-state" placeholder="Zustand"
        style="width:70px" value="${entry.condition_state || 'on'}">
      <button class="btn btn-danger btn-icon hs-remove" title="Entfernen">✕</button>`;
    row.querySelector(".hs-remove").addEventListener("click", () => row.remove());
    // Attach entity pickers after row is appended (caller must ensure DOM is ready)
    setTimeout(() => this._attachEntityPickers(row), 0);
    return row;
  }

  /** Attaches the "add" button for HA schedule rows. Call after modal renders. */
  _bindHaSchedAdder(existingEntries, listId, addBtnId) {
    setTimeout(() => {
      const list = this.shadowRoot.querySelector(`#${listId}`);
      if (!list) return;
      // Render pre-existing entries
      existingEntries.forEach(entry => list.appendChild(this._makeHaSchedRow(entry)));
      const btn = this.shadowRoot.querySelector(`#${addBtnId}`);
      if (btn) btn.addEventListener("click", () => list.appendChild(this._makeHaSchedRow()));
    }, 50);
  }

  /** Binds the add/remove buttons for comfort-extend entry rows. */
  _bindComfortExtendAdder(listId, addBtnId) {
    setTimeout(() => {
      const list = this.shadowRoot.querySelector(`#${listId}`);
      if (!list) return;
      // Bind existing remove buttons
      list.querySelectorAll(".remove-ce-entry").forEach(btn => {
        btn.addEventListener("click", () => btn.closest(".ce-row").remove());
      });
      const addBtn = this.shadowRoot.querySelector(`#${addBtnId}`);
      if (addBtn) {
        addBtn.addEventListener("click", () => {
          const row = document.createElement("div");
          row.className = "entity-row ce-row";
          row.innerHTML = `
            <input type="text" class="form-input" placeholder="entity_id" value="" autocomplete="off" data-ce-field="entity"
              data-ep-domains="media_player,switch,binary_sensor,input_boolean,person,device_tracker">
            <input type="text" class="form-input" style="max-width:90px" placeholder="on" value="on" data-ce-field="state">
            <button class="btn btn-danger btn-icon remove-ce-entry">✕</button>`;
          row.querySelector(".remove-ce-entry").addEventListener("click", () => row.remove());
          list.appendChild(row);
        });
      }
    }, 50);
  }

  /** Collects HA schedule rows from a modal container into an array. */
  _collectHaScheduleRows(modal) {
    return [...modal.querySelectorAll(".ha-sched-row")]
      .map(row => {
        const entity = row.querySelector(".hs-entity").value.trim();
        if (!entity) return null;
        const entry = { entity, mode: row.querySelector(".hs-mode").value };
        const cond = row.querySelector(".hs-cond").value.trim();
        if (cond) {
          entry.condition_entity = cond;
          entry.condition_state  = row.querySelector(".hs-cond-state").value.trim() || "on";
        }
        return entry;
      })
      .filter(Boolean);
  }

  // ── Service Calls ──────────────────────────────────────────────────────────
