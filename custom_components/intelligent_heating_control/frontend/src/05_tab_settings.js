/**
 * 05_tab_settings.js
 * IHC Frontend – Settings Tab
 * Contains: _renderSettings
 */
  _renderSettings(content) {
    const dem = this._st("sensor.ihc_gesamtanforderung") || { attributes: {} };
    const a   = dem.attributes;
    const g   = this._getGlobal();

    // Note: settings tab is never auto-refreshed by set hass() so values won't reset while typing.
    // Helpers: show badge in summary when a section has an active state
    const activeBadge = (label, cls = "") => `<span class="ihc-card-badge ${cls}">${label}</span>`;
    const hasEnergy = !!(a.solar_entity || a.energy_price_entity);

    content.innerHTML = `
      <!-- ── System-Hardware ─────────────────────────────── -->
      <details class="ihc-card" open>
        <summary>
          <span class="ihc-card-title">🔧 Hardware &amp; Steuerung</span>
        </summary>
        <div class="ihc-card-body">
          <div class="settings-grid">
            <div class="settings-item">
              <label>Außentemperatur-Sensor</label>
              <input type="text" class="form-input" id="outdoor-sensor"
                placeholder="sensor.aussensensor"
                value="${a.outdoor_temp_sensor ?? ''}" data-ep-domains="sensor" autocomplete="off">
              <span class="form-hint">Wird für die Heizkurve, Sommerautomatik und Kältewarnung benötigt. Empfohlen: Wetterdienst-Sensor oder externer Temperaturfühler.</span>
            </div>
            <div class="settings-item">
              <label>Außentemperatur-Glättung (Minuten)</label>
              <input type="number" class="form-input" id="outdoor-smoothing" min="0" max="60" step="5" value="${a.outdoor_temp_smoothing_minutes ?? 30}">
              <span class="form-hint">Gleitender Mittelwert über die letzten N Minuten (0 = aus). Verhindert dass schnelle Sonne/Wolken-Wechsel die Heizkurve und die TRVs oszillieren lassen. Empfohlen: 20–30 Minuten.</span>
            </div>
            <div class="settings-item">
              <label>Wettervorhersage-Entität</label>
              <input type="text" class="form-input" id="weather-entity"
                placeholder="weather.home (leer = aus)"
                value="${a.weather_entity ?? ''}" data-ep-domains="weather" autocomplete="off">
              <span class="form-hint">Wetter-Entität aus HA (z.B. <code>weather.home</code>). Aktiviert Kältewarnung-Banners und 3-Tage-Vorschau im Dashboard.</span>
            </div>
            <div class="settings-item">
              <label>Kältewarnung ab (°C)</label>
              <input type="number" class="form-input" id="weather-cold-threshold"
                step="0.5" value="${a.weather_cold_threshold ?? 0}">
              <span class="form-hint">Banner erscheint wenn die vorhergesagte Tiefsttemperatur diesen Wert unterschreitet (0 = deaktiviert).</span>
            </div>
            <div class="settings-item">
              <label>Kälteboost (°C)</label>
              <input type="number" class="form-input" id="weather-cold-boost"
                step="0.5" min="0" max="5" value="${a.weather_cold_boost ?? 0}">
              <span class="form-hint">Bei Kältewarnung werden alle Zimmer um diesen Wert zusätzlich aufgeheizt (0 = kein Boost).</span>
            </div>
          </div>
          <div class="btn-row">
            <button class="btn btn-primary" id="save-hardware-settings">💾 Hardware speichern</button>
          </div>
        </div>
      </details>

      <!-- ── Temperaturen ───────────────────────────────── -->
      <details class="ihc-card">
        <summary>
          <span class="ihc-card-title">🌡️ Temperaturen &amp; Sommerautomatik
            ${g.summer_mode ? activeBadge("☀️ Sommer aktiv","warn") : ""}
          </span>
        </summary>
        <div class="ihc-card-body">
          <div class="settings-grid">
            <div class="settings-item">
              <label>Abwesend-Temperatur (°C)</label>
              <input type="number" class="form-input" id="away-temp" min="5" max="25" step="0.5" value="${a.away_temp ?? 16}">
              <span class="form-hint">Globale Mindesttemperatur wenn niemand zuhause ist (Anwesenheitserkennung aktiv oder Systemmodus = Abwesend).</span>
            </div>
            <div class="settings-item">
              <label>Urlaubs-Temperatur (°C)</label>
              <input type="number" class="form-input" id="vacation-temp" min="5" max="20" step="0.5" value="${a.vacation_temp ?? 14}">
              <span class="form-hint">Niedrige Grundtemperatur für den Urlaubs-Modus – spart Energie und verhindert trotzdem Frostschäden.</span>
            </div>
            <div class="settings-item">
              <label>Frostschutz-Temperatur (°C)</label>
              <input type="number" class="form-input" id="frost-temp" min="4" max="15" step="0.5" value="${a.frost_protection_temp ?? 7}">
              <span class="form-hint">Absolute Untergrenze für Abwesend- und Urlaubsmodus. Im Modus „Aus" wird dieser Wert nur genutzt wenn die Option unten aktiviert ist.</span>
            </div>
            <div class="settings-item">
              <label>Verhalten bei Modus „Aus"</label>
              <select class="form-select" id="off-use-frost">
                <option value="false" ${!a.off_use_frost_protection ? "selected" : ""}>🔴 Thermostate wirklich ausschalten</option>
                <option value="true" ${a.off_use_frost_protection ? "selected" : ""}>❄️ Frostschutz-Temperatur halten</option>
              </select>
              <span class="form-hint">
                <strong>🔴 Ausschalten (Standard):</strong> IHC setzt die Thermostate auf „Aus" (hvac_mode=off). Empfohlen für die meisten Geräte.<br>
                <strong>❄️ Frostschutz:</strong> Thermostate bleiben an und halten die Frostschutz-Temperatur. Für Geräte die keinen Off-Modus unterstützen.
              </span>
            </div>
            <div class="settings-item">
              <label>Sommerautomatik</label>
              <select class="form-select" id="summer-enabled">
                <option value="false" ${!a.summer_mode_enabled ? "selected" : ""}>Deaktiviert</option>
                <option value="true" ${a.summer_mode_enabled ? "selected" : ""}>Aktiviert</option>
              </select>
              <span class="form-hint">Sperrt die Heizung automatisch sobald es draußen warm genug ist – kein manuelles Abschalten nötig.</span>
            </div>
            <div class="settings-item">
              <label>Sommer-Schwelle (°C)</label>
              <input type="number" class="form-input" id="summer-threshold" min="10" max="30" step="0.5" value="${a.summer_threshold ?? 18}">
              <span class="form-hint">Ab dieser Außentemperatur wird die Heizung gesperrt (Sommerautomatik muss aktiviert sein).</span>
            </div>
            <div class="settings-item" style="grid-column:1/-1">
              <label>Sommermodus-Entity (externer Schalter)
                ${a.summer_mode_entity ? `<span class="badge" style="background:#ff9800;color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;margin-left:6px">Extern gesteuert</span>` : ""}
              </label>
              <input type="text" class="form-input full" id="s-summer-mode-entity"
                value="${a.summer_mode_entity || ''}" placeholder="input_boolean.sommermodus"
                data-ep-domains="input_boolean,binary_sensor" autocomplete="off">
              <span class="form-hint">Optional: Überschreibt die Temperatur-Automatik. ON = Sommer aktiv (Heizung gesperrt), OFF = Heizung freigegeben. Ideal für Automationen oder einen physischen Schalter.</span>
            </div>
            <div class="settings-item" style="grid-column:1/-1">
              <label>Heizperiode-Entity
                ${a.heating_period_active === false ? `<span class="badge" style="background:#ff9800;color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;margin-left:6px">⏸ Inaktiv</span>` : a.heating_period_active ? `<span class="badge" style="background:#4caf50;color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;margin-left:6px">✓ Aktiv</span>` : ""}
              </label>
              <input type="text" class="form-input full" id="s-heating-period-entity"
                value="${a.heating_period_entity || ''}" placeholder="input_boolean.heizperiode"
                data-ep-domains="input_boolean,binary_sensor" autocomplete="off">
              <span class="form-hint">Optional: Entity (input_boolean.* oder binary_sensor.*) die die Heizperiode steuert. OFF = Heizperiode inaktiv → Heizung gesperrt wie im Sommer-Modus.</span>
            </div>
          </div>
          <div class="btn-row">
            <button class="btn btn-primary" id="save-temp-settings">💾 Temperaturen speichern</button>
          </div>
        </div>
      </details>

      <!-- ── Kälteprognose & Frühstart ────────────────────── -->
      <details class="ihc-card" ${a.forecast_coldnight_enabled ? "open" : ""}>
        <summary>
          <span class="ihc-card-title">❄️ Kälteprognose – Frühstart
            ${(() => { const fc = g.weather_forecast; const active = a.forecast_coldnight_enabled && fc && fc.forecast_today_min != null && fc.forecast_today_min <= (a.forecast_coldnight_temp ?? 8); return active ? `<span class="badge" style="background:#29b6f6;color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;margin-left:6px">❄️ Aktiv – ${fc.forecast_today_min}°C</span>` : ""; })()}
          </span>
        </summary>
        <div class="ihc-card-body">
          <p style="margin:0 0 12px;font-size:13px;color:var(--secondary-text-color)">
            Wenn die Wetterprognose heute Nacht unter den Schwellwert fällt: Sommerautomatik für heute deaktiviert und Heizung startet automatisch früher (Vorheizzeit verlängert). Erfordert eine konfigurierte Wetter-Entity unter <em>System &amp; Sensoren</em>.
          </p>
          <div class="settings-grid">
            <div class="settings-item">
              <label>Kälteprognose-Frühstart</label>
              <select class="form-select" id="s-forecast-coldnight-enabled">
                <option value="false" ${!a.forecast_coldnight_enabled ? "selected" : ""}>Deaktiviert</option>
                <option value="true" ${a.forecast_coldnight_enabled ? "selected" : ""}>Aktiviert</option>
              </select>
            </div>
            <div class="settings-item">
              <label>Kälteschwelle Nacht (°C)</label>
              <input type="number" class="form-input" id="s-forecast-coldnight-temp"
                min="-10" max="20" step="0.5" value="${a.forecast_coldnight_temp ?? 8}">
              <span class="form-hint">Unter dieser Nachttemperatur-Prognose wird der Frühstart ausgelöst.</span>
            </div>
            <div class="settings-item">
              <label>Frühstart-Vorlaufzeit (Stunden)</label>
              <input type="number" class="form-input" id="s-forecast-advance-hours"
                min="1" max="8" step="1" value="${a.forecast_advance_hours ?? 3}">
              <span class="form-hint">Um wie viele Stunden früher soll die Heizung anspringen. Empfehlung: 2–4 Stunden.</span>
            </div>
          </div>
          <div class="btn-row">
            <button class="btn btn-primary" id="save-forecast-settings">💾 Kälteprognose speichern</button>
          </div>
        </div>
      </details>

      <!-- ── Nachtabsenkung & Vorheizen ─────────────────── -->
      <details class="ihc-card" ${a.night_setback_enabled || a.preheat_minutes ? "open" : ""}>
        <summary>
          <span class="ihc-card-title">🌙 Nachtabsenkung &amp; Vorheizen
            ${g.night_setback_active ? activeBadge("🌙 Aktiv") : ""}
          </span>
        </summary>
        <div class="ihc-card-body">
          ${g.night_setback_active ? `<div class="info-box" style="background:#e3f2fd;border-color:#1565c0;">🌙 Nachtabsenkung ist gerade <strong>aktiv</strong></div>` : ""}
          <div class="settings-grid">
            <div class="settings-item">
              <label>Nachtabsenkung</label>
              <select class="form-select" id="night-setback-enabled">
                <option value="false" ${!a.night_setback_enabled ? "selected" : ""}>Deaktiviert</option>
                <option value="true" ${a.night_setback_enabled ? "selected" : ""}>Aktiviert</option>
              </select>
              <span class="form-hint">Senkt alle Zimmertemperaturen nachts automatisch ab um Energie zu sparen.</span>
            </div>
            <div class="settings-item">
              <label>Absenkungsbetrag (°C)</label>
              <input type="number" class="form-input" id="night-setback-offset" min="0.5" max="6" step="0.5" value="${a.night_setback_offset ?? 2}">
              <span class="form-hint">Um diesen Betrag werden alle Zieltemperaturen in der Nacht reduziert.</span>
            </div>
            <div class="settings-item">
              <label>Vorheiz-Vorlaufzeit (min)</label>
              <input type="number" class="form-input" id="preheat-minutes" min="0" max="120" step="5" value="${a.preheat_minutes ?? 0}">
              <span class="form-hint">Heizung startet so viele Minuten <em>vor</em> dem Zeitplan-Beginn – damit das Zimmer schon warm ist wenn du aufstehst. 0 = deaktiviert.</span>
            </div>
            <div class="settings-item">
              <label>Sonnen-Entität</label>
              <input type="text" class="form-input" id="sun-entity" placeholder="sun.sun" value="${a.sun_entity ?? 'sun.sun'}">
              <span class="form-hint">Wird für die Nacht-Erkennung genutzt. Standard <code>sun.sun</code> ist in HA immer vorhanden.</span>
            </div>
          </div>
          <div class="btn-row">
            <button class="btn btn-primary" id="save-night-settings">💾 Nacht/Vorheizen speichern</button>
          </div>
        </div>
      </details>

      <!-- ── Anwesenheit ────────────────────────────────── -->
      <details class="ihc-card" ${(a.presence_entities || []).length ? "open" : ""}>
        <summary>
          <span class="ihc-card-title">🚶 Anwesenheitserkennung
            ${g.presence_away_active ? activeBadge("Abwesend","warn") : (a.presence_entities || []).length ? activeBadge("Aktiv") : ""}
          </span>
        </summary>
        <div class="ihc-card-body">
          <div class="info-box">
            Wähle die Personen oder Geräte aus die überwacht werden sollen. Wenn <strong>alle</strong> ausgewählten Personen abwesend sind,
            schaltet IHC automatisch auf den <em>Abwesend-Modus</em> – die Heizung spart Energie.
            Sobald jemand wieder <code>home</code> ist, schaltet IHC zurück auf Normal.
            Tipp: Nutze <code>person.*</code>-Entitäten statt einzelner Geräte – zuverlässiger.
          </div>
          <div id="presence-entity-list" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px">
            ${this._renderPresenceCheckboxes(a.presence_entities || [])}
          </div>
          <span class="form-hint">Aktuell ${g.presence_away_active ? "🚶 niemand zuhause" : "✓ jemand zuhause"}</span>
          <div class="settings-grid" style="margin-top:12px">
            <div class="settings-item">
              <label>Auto-Away Verzögerung (min)</label>
              <div style="display:flex;align-items:center;gap:8px">
                <input type="range" id="s-presence-away-delay" min="0" max="120" step="5" value="${a.presence_away_delay_minutes ?? 0}" style="flex:1">
                <span id="s-presence-away-delay-val" style="min-width:42px;text-align:right">${a.presence_away_delay_minutes ?? 0} min</span>
              </div>
              <span class="form-hint">Wie lange alle Personen abwesend sein müssen bevor IHC auf Abwesend-Modus schaltet. 0 = sofort.</span>
            </div>
            <div class="settings-item">
              <label>Ankunfts-Verzögerung (min)</label>
              <div style="display:flex;align-items:center;gap:8px">
                <input type="range" id="s-presence-arrive-delay" min="0" max="30" step="1" value="${a.presence_arrive_delay_minutes ?? 0}" style="flex:1">
                <span id="s-presence-arrive-delay-val" style="min-width:42px;text-align:right">${a.presence_arrive_delay_minutes ?? 0} min</span>
              </div>
              <span class="form-hint">Wartezeit nach Ankunft bevor Komfortmodus aktiv wird (0 = sofort).</span>
            </div>
          </div>
          <details class="ihc-card" style="margin-top:12px;box-shadow:none;border:1px solid var(--divider-color)" ${a.eta_preheat_enabled ? "open" : ""}>
            <summary style="padding:10px 12px">
              <span class="ihc-card-title" style="font-size:13px">🕒 ETA-Vorheizen
                ${g.eta_preheat_minutes != null && g.eta_preheat_minutes <= (a.eta_preheat_threshold_minutes ?? 90)
                  ? activeBadge(`Ankunft ~${Math.round(g.eta_preheat_minutes)} min`, "info") : ""}
              </span>
            </summary>
            <div class="ihc-card-body" style="padding-top:8px">
              <div class="info-box" style="margin-bottom:10px">
                Wenn eine der oben konfigurierten Personen bald nach Hause kommt, heizt IHC die Zimmer
                automatisch vor – auch wenn gerade kein Zeitplan aktiv ist.<br>
                <strong>Benötigt:</strong> <em>Google Maps Travel Time</em> oder <em>Waze Travel Time</em>
                Integration in HA (liefert <code>estimated_arrival_time</code> auf <code>person.*</code>-Entitäten).
              </div>
              <div class="settings-grid">
                <div class="settings-item">
                  <label>ETA-Vorheizen</label>
                  <select class="form-select" id="eta-preheat-enabled">
                    <option value="false" ${!a.eta_preheat_enabled ? "selected" : ""}>Deaktiviert</option>
                    <option value="true"  ${a.eta_preheat_enabled  ? "selected" : ""}>Aktiviert</option>
                  </select>
                </div>
                <div class="settings-item">
                  <label>Vorheizen ab (min vor Ankunft)</label>
                  <input type="number" class="form-input" id="eta-preheat-threshold"
                    min="10" max="120" step="5" value="${a.eta_preheat_threshold_minutes ?? 90}">
                  <span class="form-hint">Vorheizen startet wenn Ankunft ≤ diesem Wert (Standard: 90 min)</span>
                </div>
              </div>
              ${a.eta_preheat_enabled ? (() => {
                const entities = a.presence_entities || [];
                const arrivals = entities.map(eid => {
                  const st = this._hass?.states[eid];
                  if (!st) return null;
                  const t = st.attributes?.estimated_arrival_time;
                  if (!t) return null;
                  const arrival = new Date(t);
                  const mins = Math.round((arrival - new Date()) / 60000);
                  if (mins < 0 || mins > (a.eta_preheat_threshold_minutes ?? 90)) return null;
                  const name = st.attributes?.friendly_name || eid;
                  const time = arrival.toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'});
                  return `<div style="font-size:11px;color:#1565c0;margin-top:4px">⏱ ${name}: ~${mins} min (${time} Uhr)</div>`;
                }).filter(Boolean);
                if (!arrivals.length) return `<div style="font-size:11px;color:var(--secondary-text-color);margin-top:6px">Kein ETA erkannt im konfigurierten Fenster</div>`;
                return `<div style="margin-top:8px;padding:8px;background:#e3f2fd;border-radius:8px;border:1px solid #1565c0">${arrivals.join("")}</div>`;
              })() : ""}
            </div>
          </details>
          <div class="btn-row">
            <button class="btn btn-primary" id="save-presence-settings">💾 Anwesenheit speichern</button>
          </div>
        </div>
      </details>

      <!-- ── Gäste-Modus ────────────────────────────────── -->
      <details class="ihc-card" ${g.guest_mode_active ? "open" : ""}>
        <summary>
          <span class="ihc-card-title">🎉 Gäste-Modus
            ${g.guest_mode_active ? activeBadge(`Aktiv${g.guest_remaining_minutes != null ? " · " + g.guest_remaining_minutes + "min" : ""}`, "warn") : ""}
          </span>
        </summary>
        <div class="ihc-card-body">
          <div class="info-box">
            Aktiviert einen temporären Komfort-Modus für Gäste: alle Zimmer werden auf volle Komfortheizung geschaltet –
            unabhängig von Zeitplänen. Nach Ablauf der Dauer kehrt IHC automatisch zum normalen Betrieb zurück.
          </div>
          ${g.guest_mode_active ? `<div class="info-box" style="background:#fce4ec;border-color:#880e4f;">🎉 Gäste-Modus ist <strong>aktiv</strong></div>` : ""}
          <div class="settings-grid">
            <div class="settings-item">
              <label>Standarddauer (Stunden)</label>
              <input type="number" class="form-input" id="guest-duration" min="0" max="168" step="1" value="${a.guest_duration_hours ?? 24}">
              <span class="form-hint">Wie lange der Gäste-Modus aktiv bleibt. 0 = unbegrenzt (bis manuell beendet). Max 168 h (7 Tage).</span>
            </div>
          </div>
          <div class="btn-row">
            ${g.guest_mode_active
              ? `<button class="btn btn-secondary" id="deactivate-guest-mode">✕ Gäste-Modus beenden</button>`
              : `<button class="btn btn-primary" id="activate-guest-mode">🎉 Gäste-Modus aktivieren</button>`}
            <button class="btn btn-secondary" id="save-guest-duration">💾 Standarddauer speichern</button>
          </div>
        </div>
      </details>

      <!-- ── Energie & Solar ────────────────────────────── -->
      <details class="ihc-card" id="energie-details" ${hasEnergy ? "open" : ""}>
        <summary>
          <span class="ihc-card-title">⚡ Energie &amp; Solar
            ${g.solar_boost > 0 ? activeBadge("☀️ Solar-Boost") : ""}
            ${g.energy_price_eco_active ? activeBadge("💶 Eco","warn") : ""}
          </span>
        </summary>
        <div class="ihc-card-body">
          <div class="settings-grid">
            <div class="settings-item">
              <label>Laufzeit im Dashboard anzeigen</label>
              <select class="form-select" id="show-runtime-stats">
                <option value="true"  ${localStorage.getItem("ihc_show_runtime") !== "false" ? "selected" : ""}>Aktiviert</option>
                <option value="false" ${localStorage.getItem("ihc_show_runtime") === "false"  ? "selected" : ""}>Deaktiviert</option>
              </select>
              <span class="form-hint">Zeigt in jedem Zimmer-Karte wie lange die Heizung heute schon gelaufen ist (in Minuten).</span>
            </div>
            <div class="settings-item">
              <label>Kosten/kWh im Dashboard anzeigen</label>
              <select class="form-select" id="show-cost-stats">
                <option value="true"  ${localStorage.getItem("ihc_show_costs") !== "false" ? "selected" : ""}>Aktiviert</option>
                <option value="false" ${localStorage.getItem("ihc_show_costs") === "false"  ? "selected" : ""}>Deaktiviert</option>
              </select>
              <span class="form-hint">Zeigt geschätzte Kilowattstunden und (wenn Preis konfiguriert) die Kosten des Tages.</span>
            </div>
            <div class="settings-item">
              <label>Fester Energiepreis (€/kWh) <span style="font-size:10px;color:var(--secondary-text-color)">(optional)</span></label>
              <input type="number" class="form-input" id="static-energy-price" min="0.01" max="2" step="0.01" value="${a.static_energy_price ?? ''}" placeholder="z.B. 0.09 (leer = nur kWh)">
              <span class="form-hint">Wenn kein dynamischer Preis-Sensor vorhanden: fester Preis für die Kostenanzeige (Gas ≈ 0,09 €/kWh, Fernwärme ≈ 0,11 €/kWh).</span>
            </div>
          </div>
          <hr class="divider">
          <div class="card-title" style="font-size:13px;margin:8px 0">☀️ Solarüberschuss-Heizung</div>
          <p style="font-size:12px;color:var(--secondary-text-color);margin:0 0 10px">
            Wenn die Photovoltaik-Anlage mehr Strom produziert als verbraucht wird, heizt IHC etwas kräftiger – so nutzt du den Überschuss sinnvoll.
          </p>
          <div class="settings-grid">
            <div class="settings-item">
              <label>Solar-Leistungssensor</label>
              <input type="text" class="form-input" id="solar-entity"
                placeholder="sensor.solar_power (leer = aus)"
                value="${a.solar_entity ?? ''}" data-ep-domains="sensor" autocomplete="off">
              <span class="form-hint">Sensor der die aktuelle Erzeugungsleistung in Watt liefert.</span>
            </div>
            <div class="settings-item">
              <label>Überschuss-Schwelle (W)</label>
              <input type="number" class="form-input" id="solar-surplus-threshold" min="100" max="10000" step="100" value="${a.solar_surplus_threshold ?? 1000}">
              <span class="form-hint">Erst ab diesem Überschuss wird der Heizboost aktiviert.</span>
            </div>
            <div class="settings-item">
              <label>Heizboost bei Solar (°C)</label>
              <input type="number" class="form-input" id="solar-boost-temp" min="0.5" max="5" step="0.5" value="${a.solar_boost_temp ?? 1}">
              <span class="form-hint">Alle Zieltemperaturen werden um diesen Wert angehoben wenn Solar-Überschuss vorhanden ist.</span>
            </div>
          </div>
          <hr class="divider">
          <div class="card-title" style="font-size:13px;margin:8px 0">💶 Dynamischer Strompreis (z.B. Tibber)</div>
          <p style="font-size:12px;color:var(--secondary-text-color);margin:0 0 10px">
            Bei sehr hohen Strompreisen senkt IHC die Zieltemperaturen etwas ab – du heizt dann weniger in der teuren Zeit.
          </p>
          <div class="settings-grid">
            <div class="settings-item">
              <label>Preis-Sensor</label>
              <input type="text" class="form-input" id="energy-price-entity"
                placeholder="sensor.strompreis (leer = aus)"
                value="${a.energy_price_entity ?? ''}" data-ep-domains="sensor" autocomplete="off">
              <span class="form-hint">z.B. Tibber-Integration <code>sensor.tibber_current_price</code>.</span>
            </div>
            <div class="settings-item">
              <label>Teuer-Schwelle (€/kWh)</label>
              <input type="number" class="form-input" id="energy-price-threshold" min="0.05" max="2" step="0.01" value="${a.energy_price_threshold ?? 0.30}">
              <span class="form-hint">Über diesem Preis gilt Strom als „teuer" und der Eco-Modus wird aktiv.</span>
            </div>
            <div class="settings-item">
              <label>Eco-Absenkung bei hohem Preis (°C)</label>
              <input type="number" class="form-input" id="energy-price-eco-offset" min="0.5" max="6" step="0.5" value="${a.energy_price_eco_offset ?? 2}">
              <span class="form-hint">Um diesen Betrag werden die Zieltemperaturen in der teuren Zeit reduziert.</span>
            </div>
            <div class="settings-item">
              <label>Preis-Prognose-Attribut</label>
              <input type="text" class="form-input" id="price-forecast-attribute"
                placeholder="today_prices"
                value="${a.price_forecast_attribute ?? 'today_prices'}">
              <span class="form-hint">Attributname für stündliche Preise (Tibber/Nordpool). Standard: <code>today_prices</code>.</span>
            </div>
          </div>
          <div class="btn-row">
            <button class="btn btn-primary" id="save-energy-settings">💾 Energie / Solar speichern</button>
          </div>
          <div class="info-box" style="margin-top:8px">💡 Aktuelle Messwerte (Laufzeit, Energie, Solar, Preis) sind im Tab <strong>📊 Übersicht</strong> zu sehen.</div>
        </div>
      </details>

      <!-- ── Lüftungsempfehlung ──────────────────────────── -->
      <details class="ihc-card" ${a.outdoor_humidity_sensor ? "open" : ""}>
        <summary>
          <span class="ihc-card-title">🌬️ Lüftungsempfehlung
            ${g.outdoor_humidity != null ? activeBadge(`${g.outdoor_humidity.toFixed(0)}% Außenfeuchte`) : ""}
          </span>
        </summary>
        <div class="ihc-card-body">
          <div class="info-box">
            IHC analysiert Luftfeuchtigkeit und CO₂-Werte und zeigt im Dashboard einen Lüftungshinweis an
            (🪟 oder 🌬️) wenn Lüften empfohlen wird. Je mehr Sensoren konfiguriert sind desto präziser die Empfehlung –
            aber alles optional.
          </div>
          <div class="settings-grid">
            <div class="settings-item">
              <label>Außenfeuchte-Sensor</label>
              <input type="text" class="form-input" id="outdoor-humidity-sensor"
                placeholder="sensor.aussenfeuchte (leer = deaktiviert)"
                value="${a.outdoor_humidity_sensor ?? ''}" data-ep-domains="sensor" autocomplete="off">
              <span class="form-hint">Wird genutzt um zu prüfen ob Lüften bei hoher Außenfeuchte (Nebel, Regen) sinnvoll ist. Verhindert unnötige Empfehlungen.</span>
            </div>
            <div class="settings-item">
              <label>Lüftungsempfehlungen</label>
              <select class="form-select" id="ventilation-advice-enabled">
                <option value="true"  ${a.ventilation_advice_enabled !== false ? "selected" : ""}>Aktiviert</option>
                <option value="false" ${a.ventilation_advice_enabled === false  ? "selected" : ""}>Deaktiviert</option>
              </select>
              <span class="form-hint">CO₂- und Feuchtigkeitssensoren pro Zimmer im Zimmer-Bearbeitungsdialog (🚪 Zimmer-Tab) konfigurieren.</span>
            </div>
          </div>
          <div class="btn-row">
            <button class="btn btn-primary" id="save-ventilation-settings">💾 Lüftung speichern</button>
          </div>
        </div>
      </details>

      <!-- ── Intelligente Regelung ──────────────────────── -->
      <details class="ihc-card" ${a.eta_preheat_enabled || a.vacation_calendar ? "open" : ""}>
        <summary>
          <span class="ihc-card-title">🧠 Intelligente Regelung
            ${g.eta_preheat_minutes != null && g.eta_preheat_minutes <= 90 ? activeBadge(`ETA ${Math.round(g.eta_preheat_minutes)}min`, "info") : ""}
          </span>
        </summary>
        <div class="ihc-card-body">
          <div class="settings-grid">
            <div class="settings-item">
              <label>Adaptives Vorheizen <span style="font-weight:400;font-size:10px">(lernbasiert)</span></label>
              <select class="form-select" id="adaptive-preheat-enabled">
                <option value="true"  ${a.adaptive_preheat_enabled !== false ? "selected" : ""}>Aktiviert</option>
                <option value="false" ${a.adaptive_preheat_enabled === false  ? "selected" : ""}>Deaktiviert – nur fixer Vorlauf-Wert</option>
              </select>
              <span class="form-hint">
                IHC misst bei jedem Aufheizzyklus wie lange es dauert bis der Raum die Solltemperatur erreicht.
                Aus diesen Messungen berechnet es automatisch den optimalen Startzeitpunkt –
                damit die Heizung genau dann fertig ist wenn der Zeitplan beginnt.<br>
                <strong>Benötigt:</strong> globale Vorheizzeit &gt; 0 min (Einstellung darunter).
                ${a.adaptive_preheat_enabled !== false && a.preheat_minutes > 0 ? `
                <br>Aktuell: fixer Basiswert ${a.preheat_minutes} min – IHC passt diesen pro Zimmer an.` : ""}
              </span>
            </div>
            <div class="settings-item">
              <label>Optimum Start <span style="font-weight:400;font-size:10px">(lernt Aufheizrate je Außentemperatur)</span></label>
              <select class="form-select" id="optimum-start-enabled">
                <option value="false" ${!a.optimum_start_enabled ? "selected" : ""}>Deaktiviert</option>
                <option value="true"  ${a.optimum_start_enabled  ? "selected" : ""}>Aktiviert</option>
              </select>
              <span class="form-hint">
                IHC misst bei jedem Aufheizzyklus wie lange der Raum braucht – getrennt nach Außentemperatur.
                Bei −5 °C draußen wird länger vorgeheizt als bei +10 °C.
                Ergebnisse sichtbar im Zimmer-Detail → Verlauf → Lernkurve.
                Ersetzt das klassische adaptive Vorheizen sobald genug Messungen vorliegen.
              </span>
            </div>
            <div class="settings-item">
              <label>ETA-basiertes Vorheizen</label>
              <div style="font-size:12px;color:var(--secondary-text-color);padding:6px 0">
                ${a.eta_preheat_enabled
                  ? `✓ Aktiv – einstellbar unter <strong>Anwesenheitserkennung → ETA-Vorheizen</strong>`
                  : `Deaktiviert – einstellbar unter <strong>Anwesenheitserkennung → ETA-Vorheizen</strong>`}
              </div>
            </div>
            <div class="settings-item">
              <label>Urlaubs-Kalender</label>
              <input type="text" class="form-input" id="vacation-calendar"
                placeholder="calendar.urlaub (leer = aus)"
                value="${a.vacation_calendar ?? ''}" data-ep-domains="calendar" autocomplete="off">
              <span class="form-hint">Kalender-Entität aus HA. Termine die das Schlüsselwort „urlaub" im Namen enthalten schalten automatisch den Urlaubs-Modus ein.</span>
            </div>
            <div class="settings-item">
              <label>Urlaubs-Kalender Stichwort</label>
              <input type="text" class="form-input" id="vacation-calendar-keyword"
                placeholder="urlaub"
                value="${a.vacation_calendar_keyword ?? 'urlaub'}">
              <span class="form-hint">Stichwort im Termintext das den Urlaubs-Kalender oben auslöst (Standard: „urlaub").</span>
            </div>
            <div class="settings-item">
              <label>Feiertags-/Ferienkalender</label>
              <input type="text" class="form-input" id="holiday-calendar"
                placeholder="calendar.feiertage (leer = aus)"
                value="${a.holiday_calendar ?? ''}" data-ep-domains="calendar" autocomplete="off">
              <span class="form-hint">HA-Kalender-Entität. Wenn ein Termin aktiv → Wochenend-Zeitplan oder Komfortmodus.
                ${g.holiday_active ? '<strong style="color:#1565c0">📅 Feiertag/Ferien aktiv</strong>' : ""}</span>
            </div>
            <div class="settings-item">
              <label>Feiertagsmodus</label>
              <select class="form-select" id="holiday-schedule-mode">
                <option value="weekend" ${(a.holiday_schedule_mode || 'weekend') === 'weekend' ? 'selected' : ''}>Wochenend-Zeitplan nutzen</option>
                <option value="comfort" ${a.holiday_schedule_mode === 'comfort' ? 'selected' : ''}>Komforttemperatur halten</option>
              </select>
            </div>
          </div>
          <div class="btn-row">
            <button class="btn btn-primary" id="save-intelligent-settings">💾 Intelligente Regelung speichern</button>
          </div>
        </div>
      </details>

      <!-- ── Kalkschutz & TRV-Wartung ───────────────────── -->
      <details class="ihc-card" ${a.limescale_protection_enabled ? "open" : ""}>
        <summary>
          <span class="ihc-card-title">🔩 Kalkschutz &amp; Stuck-Valve-Erkennung
            ${a.limescale_protection_enabled ? activeBadge("Aktiv") : ""}
          </span>
        </summary>
        <div class="ihc-card-body">
          <div class="info-box">Verhindert das Festfressen von TRV-Ventilen durch Kalk. Bewegt die Ventile regelmäßig durch den vollen Hub.</div>
          <div class="settings-grid">
            <div class="settings-item">
              <label>Kalkschutz aktiviert</label>
              <select class="form-select" id="limescale-enabled">
                <option value="false" ${!a.limescale_protection_enabled ? "selected" : ""}>Deaktiviert</option>
                <option value="true"  ${a.limescale_protection_enabled  ? "selected" : ""}>Aktiviert</option>
              </select>
              <span class="form-hint">Öffnet alle TRV-Ventile vollständig für kurze Zeit in regelmäßigen Abständen.</span>
            </div>
            <div class="settings-item">
              <label>Intervall (Tage)</label>
              <input type="number" class="form-input" id="limescale-interval" min="7" max="90" step="1"
                value="${a.limescale_interval_days ?? 14}">
              <span class="form-hint">Alle N Tage wird die Übung durchgeführt (Standard: 14 Tage).</span>
            </div>
            <div class="settings-item">
              <label>Uhrzeit (HH:MM)</label>
              <input type="text" class="form-input" id="limescale-time" placeholder="10:00"
                value="${a.limescale_time ?? '10:00'}">
              <span class="form-hint">Zeitfenster (±15 min) für die Ventil-Übung. Wähle eine Zeit wenn niemand zuhause friert.</span>
            </div>
            <div class="settings-item">
              <label>Dauer (min)</label>
              <input type="number" class="form-input" id="limescale-duration" min="1" max="30" step="1"
                value="${a.limescale_duration_minutes ?? 5}">
              <span class="form-hint">Wie lange die Ventile vollständig geöffnet bleiben (Standard: 5 min).</span>
            </div>
            <div class="settings-item">
              <label>Stuck-Valve Timeout (s)</label>
              <input type="number" class="form-input" id="stuck-valve-timeout" min="300" max="7200" step="300"
                value="${a.stuck_valve_timeout ?? 1800}">
              <span class="form-hint">Sekunden bis ein klemmendes Ventil als Fehler gemeldet wird (Standard: 1800 = 30 min). Erkannte Fehler erscheinen als binary_sensor.</span>
            </div>
            <div class="settings-item">
              <label>Startup-Gnadenfrist (s)</label>
              <input type="number" class="form-input" id="startup-grace-seconds" min="0" max="300" step="10"
                value="${a.startup_grace_seconds ?? 60}">
              <span class="form-hint">Sekunden nach HA-Start bevor Zigbee/Z-Wave-Sensoren als ungültig gelten (Standard: 60s). Verhindert Fehlalarme beim Neustart.</span>
            </div>
          </div>
          <div class="btn-row">
            <button class="btn btn-primary" id="save-limescale-settings">💾 Kalkschutz speichern</button>
          </div>
        </div>
      </details>

      <!-- ── Peak Shaving ───────────────────────────── -->
      <details class="ihc-card" ${a.peak_shaving_enabled ? "open" : ""}>
        <summary>
          <span class="ihc-card-title">⚡ Peak Shaving – Heizungsstaffelung
            ${a.peak_shaving_enabled ? activeBadge("Aktiv") : ""}
            ${g.peak_shaving_active ? activeBadge("Läuft","warn") : ""}
          </span>
        </summary>
        <div class="ihc-card-body">
          <div class="info-box">Verhindert Lastspitzen beim Hochfahren der Heizung. Räume mit niedrigerer Priorität werden gestaffelt zugeschaltet, statt alle gleichzeitig.</div>
          <div class="settings-grid">
            <div class="settings-item">
              <label>Peak Shaving aktiviert</label>
              <select class="form-select" id="peak-shaving-enabled">
                <option value="false" ${!a.peak_shaving_enabled ? "selected" : ""}>Deaktiviert</option>
                <option value="true"  ${a.peak_shaving_enabled  ? "selected" : ""}>Aktiviert</option>
              </select>
            </div>
            <div class="settings-item">
              <label>Staffelungsverzögerung (min)</label>
              <input type="number" class="form-input" id="peak-shaving-delay" min="1" max="15" step="1"
                value="${a.peak_shaving_delay_minutes ?? 3}">
              <span class="form-hint">Nach dem Einschalten der Heizung werden Räume mit niedrigerer Anforderung erst nach dieser Zeit voll gezählt.</span>
            </div>
          </div>
          <div class="btn-row">
            <button class="btn btn-primary" id="save-peak-shaving-settings">💾 Peak Shaving speichern</button>
          </div>
        </div>
      </details>

      <!-- ── Urlaubs-Assistent ───────────────────────────── -->
      <details class="ihc-card" ${g.vacation_auto_active || a.vacation_start ? "open" : ""}>
        <summary>
          <span class="ihc-card-title">✈️ Urlaubs-Assistent
            ${g.vacation_auto_active ? activeBadge("Aktiv","info") : ""}
            ${g.return_preheat_active ? activeBadge("Vorheizen","info") : ""}
          </span>
        </summary>
        <div class="ihc-card-body">
          <div class="info-box">Schaltet auf Urlaub wenn heutiges Datum im eingegebenen Zeitraum liegt.</div>
          ${g.vacation_auto_active ? `<div class="info-box" style="background:#e3f2fd;border-color:#1565c0;">✈️ Automatischer Urlaubs-Modus ist <strong>aktiv</strong></div>` : ""}
          <div class="settings-grid">
            <div class="settings-item">
              <label>Urlaub von</label>
              <input type="date" class="form-input" id="vacation-start" value="${a.vacation_start || ""}">
            </div>
            <div class="settings-item">
              <label>Urlaub bis (inkl.)</label>
              <input type="date" class="form-input" id="vacation-end" value="${a.vacation_end || ""}">
            </div>
            <div class="settings-item">
              <label>Rückkehr-Vorheizung (Tage)</label>
              <input type="number" class="form-input" id="vacation-return-preheat" min="0" max="14" step="1" value="${a.vacation_return_preheat_days ?? 0}">
              <span class="form-hint">N Tage vor Ende auf Auto schalten (0 = aus)</span>
            </div>
          </div>
          <div class="btn-row">
            <button class="btn btn-primary" id="save-vacation-range">💾 Urlaub speichern</button>
            <button class="btn btn-secondary" id="clear-vacation-range">✕ Urlaub löschen</button>
          </div>
        </div>
      </details>

      <!-- ── Backup ─────────────────────────────────────── -->
      <details class="ihc-card">
        <summary><span class="ihc-card-title">💾 Backup &amp; Restore</span></summary>
        <div class="ihc-card-body">
          <div style="display:flex;flex-direction:column;gap:16px">
            <div>
              <div style="font-weight:600;margin-bottom:4px">📤 Export</div>
              <span class="form-hint">Speichert die gesamte Konfiguration (Einstellungen + alle Zimmer) als JSON-Datei direkt im Browser.</span>
              <div class="btn-row" style="margin-top:8px">
                <button class="btn btn-secondary" id="export-config-btn">📤 Konfiguration herunterladen</button>
              </div>
            </div>
            <hr style="border:none;border-top:1px solid var(--divider-color);margin:0">
            <div>
              <div style="font-weight:600;margin-bottom:4px">🔄 Zurücksetzen</div>
              <span class="form-hint">Setzt gelernte oder berechnete Werte zurück auf den Ausgangszustand.</span>
              <div style="margin-top:8px;display:flex;flex-direction:column;gap:6px">
                <button class="btn btn-secondary" id="reset-learned-btn">🔄 Kurvenkorrektur zurücksetzen<br><small style="font-weight:400;opacity:0.8">Adaptive Heizkurven-Offset zurück auf 0</small></button>
                <button class="btn btn-secondary" id="reset-stats-btn">📊 Statistiken zurücksetzen<br><small style="font-weight:400;opacity:0.8">Laufzeiten + Energiedaten heute</small></button>
              </div>
            </div>
            <hr style="border:none;border-top:1px solid var(--divider-color);margin:0">
            <div>
              <div style="font-weight:600;margin-bottom:4px">📥 Import</div>
              <span class="form-hint">JSON-Backup einspielen. <strong>Achtung:</strong> Bestehende Zimmer werden ersetzt.</span>
              <div style="margin-top:8px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                <input type="file" id="import-config-file" accept=".json,application/json"
                  style="font-size:12px;color:var(--primary-text-color)">
                <button class="btn btn-secondary" id="import-config-btn">📥 Importieren</button>
              </div>
              <div id="import-status" style="margin-top:6px;font-size:12px;color:var(--secondary-text-color)"></div>
            </div>
          </div>
        </div>
      </details>
    `;

    content.querySelector("#save-hardware-settings").addEventListener("click", () => {
      this._callService("update_global_settings", {
        outdoor_temp_sensor:          content.querySelector("#outdoor-sensor").value.trim(),
        outdoor_temp_smoothing_minutes: parseInt(content.querySelector("#outdoor-smoothing").value, 10) || 0,
        weather_entity:           content.querySelector("#weather-entity").value.trim(),
        weather_cold_threshold:   parseFloat(content.querySelector("#weather-cold-threshold").value) || 0,
        weather_cold_boost:       parseFloat(content.querySelector("#weather-cold-boost").value) || 0,
      });
      this._toast("✓ Hardware-Einstellungen gespeichert");
    });

    content.querySelector("#save-temp-settings").addEventListener("click", () => {
      const awayT  = parseFloat(content.querySelector("#away-temp").value);
      const vacT   = parseFloat(content.querySelector("#vacation-temp").value);
      const frostT = parseFloat(content.querySelector("#frost-temp").value);
      const sumT   = parseFloat(content.querySelector("#summer-threshold").value);
      if ([awayT, vacT, frostT, sumT].some(isNaN)) { this._toast("⚠️ Ungültiger Temperaturwert"); return; }
      this._callService("update_global_settings", {
        away_temp:                awayT,
        vacation_temp:            vacT,
        frost_protection_temp:    frostT,
        summer_mode_enabled:      content.querySelector("#summer-enabled").value === "true",
        summer_threshold:         sumT,
        summer_mode_entity:       content.querySelector("#s-summer-mode-entity")?.value.trim() || "",
        off_use_frost_protection: content.querySelector("#off-use-frost").value === "true",
        heating_period_entity:    content.querySelector("#s-heating-period-entity")?.value.trim() || "",
      });
      this._toast("✓ Temperatur-Einstellungen gespeichert");
    });

    content.querySelector("#save-forecast-settings")?.addEventListener("click", () => {
      const cnTemp = parseFloat(content.querySelector("#s-forecast-coldnight-temp").value);
      const advH   = parseInt(content.querySelector("#s-forecast-advance-hours").value, 10);
      if (isNaN(cnTemp) || isNaN(advH)) { this._toast("⚠️ Ungültiger Wert"); return; }
      this._callService("update_global_settings", {
        forecast_coldnight_enabled: content.querySelector("#s-forecast-coldnight-enabled").value === "true",
        forecast_coldnight_temp:    cnTemp,
        forecast_advance_hours:     advH,
      });
      this._toast("✓ Kälteprognose gespeichert");
    });

    content.querySelector("#save-night-settings").addEventListener("click", () => {
      const offset = parseFloat(content.querySelector("#night-setback-offset").value);
      const preheat = parseInt(content.querySelector("#preheat-minutes").value, 10);
      if (isNaN(offset) || isNaN(preheat)) { this._toast("⚠️ Ungültiger Wert"); return; }
      this._callService("update_global_settings", {
        night_setback_enabled:  content.querySelector("#night-setback-enabled").value === "true",
        night_setback_offset:   offset,
        preheat_minutes:        preheat,
        sun_entity:             content.querySelector("#sun-entity").value.trim() || "sun.sun",
      });
      this._toast("✓ Nachtabsenkung/Vorheizen gespeichert");
    });

    // Presence tracker overflow toggle
    const trackerToggle = content.querySelector("#tracker-toggle");
    if (trackerToggle) {
      trackerToggle.addEventListener("click", () => {
        const overflow = content.querySelector("#tracker-overflow");
        const open = overflow.style.display === "flex";
        overflow.style.display = open ? "none" : "flex";
        trackerToggle.textContent = open
          ? `▸ ${overflow.children.length} weitere Geräte anzeigen`
          : `▾ Weniger anzeigen`;
      });
    }

    content.querySelector("#s-presence-away-delay")?.addEventListener("input", e => {
      const el = content.querySelector("#s-presence-away-delay-val");
      if (el) el.textContent = e.target.value + " min";
    });

    content.querySelector("#s-presence-arrive-delay")?.addEventListener("input", e => {
      const el = content.querySelector("#s-presence-arrive-delay-val");
      if (el) el.textContent = e.target.value + " min";
    });

    content.querySelector("#save-presence-settings").addEventListener("click", () => {
      const checked = [...content.querySelectorAll(".presence-cb:checked")].map(cb => cb.value);
      this._callService("update_global_settings", {
        presence_entities: checked,
        presence_away_delay_minutes:   parseInt(content.querySelector("#s-presence-away-delay")?.value ?? "0", 10),
        presence_arrive_delay_minutes: parseInt(content.querySelector("#s-presence-arrive-delay")?.value ?? "0", 10),
        eta_preheat_enabled:           content.querySelector("#eta-preheat-enabled")?.value === "true",
        eta_preheat_threshold_minutes: parseInt(content.querySelector("#eta-preheat-threshold")?.value ?? "90", 10),
      });
      this._toast("✓ Anwesenheitserkennung gespeichert");
    });

    // Runtime / costs visibility toggles – stored in localStorage (frontend-only)
    content.querySelector("#show-runtime-stats").addEventListener("change", e => {
      localStorage.setItem("ihc_show_runtime", e.target.value);
      this._toast(e.target.value === "true" ? "✓ Laufzeit-Anzeige aktiviert" : "✓ Laufzeit-Anzeige deaktiviert");
    });
    content.querySelector("#show-cost-stats").addEventListener("change", e => {
      localStorage.setItem("ihc_show_costs", e.target.value);
      this._toast(e.target.value === "true" ? "✓ Kostenanzeige aktiviert" : "✓ Kostenanzeige deaktiviert");
    });

    content.querySelector("#save-energy-settings").addEventListener("click", () => {
      const solarSurplus = parseFloat(content.querySelector("#solar-surplus-threshold").value);
      const solarBoost   = parseFloat(content.querySelector("#solar-boost-temp").value);
      const priceThresh  = parseFloat(content.querySelector("#energy-price-threshold").value);
      const priceEco     = parseFloat(content.querySelector("#energy-price-eco-offset").value);
      if ([solarSurplus, solarBoost, priceThresh, priceEco].some(isNaN)) { this._toast("⚠️ Ungültiger Wert"); return; }
      const staticPrice = parseFloat(content.querySelector("#static-energy-price").value);
      this._callService("update_global_settings", {
        solar_entity:            content.querySelector("#solar-entity").value.trim(),
        solar_surplus_threshold: solarSurplus,
        solar_boost_temp:        solarBoost,
        energy_price_entity:     content.querySelector("#energy-price-entity").value.trim(),
        energy_price_threshold:  priceThresh,
        energy_price_eco_offset: priceEco,
        ...((!isNaN(staticPrice) && staticPrice > 0) ? { static_energy_price: staticPrice } : {}),
        price_forecast_attribute: content.querySelector("#price-forecast-attribute")?.value.trim() || "today_prices",
      });
      this._toast("✓ Energie/Solar-Einstellungen gespeichert");
    });

    content.querySelector("#save-ventilation-settings").addEventListener("click", () => {
      this._callService("update_global_settings", {
        outdoor_humidity_sensor:    content.querySelector("#outdoor-humidity-sensor").value.trim(),
        ventilation_advice_enabled: content.querySelector("#ventilation-advice-enabled").value === "true",
      });
      this._toast("✓ Lüftungseinstellungen gespeichert");
    });

    content.querySelector("#save-intelligent-settings")?.addEventListener("click", () => {
      this._callService("update_global_settings", {
        adaptive_preheat_enabled: content.querySelector("#adaptive-preheat-enabled")?.value === "true",
        optimum_start_enabled:    content.querySelector("#optimum-start-enabled")?.value === "true",
        eta_preheat_enabled:      content.querySelector("#eta-preheat-enabled")?.value === "true",
        vacation_calendar:        content.querySelector("#vacation-calendar")?.value.trim() ?? "",
        vacation_calendar_keyword: content.querySelector("#vacation-calendar-keyword")?.value.trim() || "urlaub",
        holiday_calendar:         content.querySelector("#holiday-calendar")?.value.trim() ?? "",
        holiday_schedule_mode:    content.querySelector("#holiday-schedule-mode")?.value ?? "weekend",
      });
      this._toast("✓ Intelligente Regelung gespeichert");
    });

    content.querySelector("#save-peak-shaving-settings")?.addEventListener("click", () => {
      this._callService("update_global_settings", {
        peak_shaving_enabled:       content.querySelector("#peak-shaving-enabled")?.value === "true",
        peak_shaving_delay_minutes: parseInt(content.querySelector("#peak-shaving-delay")?.value, 10) || 3,
      });
      this._toast("✓ Peak Shaving gespeichert");
    });

    content.querySelector("#save-limescale-settings")?.addEventListener("click", () => {
      this._callService("update_global_settings", {
        limescale_protection_enabled: content.querySelector("#limescale-enabled")?.value === "true",
        limescale_interval_days:      parseInt(content.querySelector("#limescale-interval")?.value, 10) || 14,
        limescale_time:               content.querySelector("#limescale-time")?.value.trim() || "10:00",
        limescale_duration_minutes:   parseInt(content.querySelector("#limescale-duration")?.value, 10) || 5,
        stuck_valve_timeout:          parseInt(content.querySelector("#stuck-valve-timeout")?.value, 10) || 1800,
        startup_grace_seconds:        (v => Number.isNaN(v) ? 60 : v)(parseInt(content.querySelector("#startup-grace-seconds")?.value, 10)),
      });
      this._toast("✓ Kalkschutz gespeichert");
    });

    content.querySelector("#reset-stats-btn")?.addEventListener("click", () => {
      if (!confirm("Laufzeit- und Energiestatistiken für heute zurücksetzen?")) return;
      this._callService("reset_stats", {}).then(() => {
        setTimeout(() => { if (this._activeTab === "settings") this._renderTabContent(); }, 400);
      });
      this._toast("📊 Statistiken zurückgesetzt");
    });

    content.querySelector("#export-config-btn").addEventListener("click", async () => {
      // Fetch full config from backend via service, then offer as browser download
      try {
        // Build export from current state attributes (available in frontend)
        const exportData = {
          version: "1.2.0",
          exported_at: new Date().toISOString(),
          global_settings: { ...a },
          rooms: Object.values(this.coordinator?.data?.rooms || {}).map(r => ({ ...r })),
        };
        // Also trigger HA notification for completeness
        this._callService("export_config", {});
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `ihc_backup_${new Date().toISOString().slice(0,10)}.json`;
        link.click();
        URL.revokeObjectURL(url);
        this._toast("✓ Konfiguration heruntergeladen");
      } catch (e) {
        this._toast("❌ Export fehlgeschlagen: " + (e.message || e));
      }
    });

    content.querySelector("#import-config-btn").addEventListener("click", async () => {
      const fileInput = content.querySelector("#import-config-file");
      const statusEl  = content.querySelector("#import-status");
      if (!fileInput.files.length) { statusEl.textContent = "⚠ Bitte zuerst eine JSON-Datei auswählen."; return; }
      let cfg;
      try {
        const text = await fileInput.files[0].text();
        cfg = JSON.parse(text);
      } catch {
        statusEl.textContent = "❌ Ungültige JSON-Datei."; return;
      }
      if (!cfg.global_settings && !cfg.rooms) {
        statusEl.textContent = "❌ Kein gültiges IHC-Backup (fehlende Felder)."; return;
      }
      if (!confirm(`IHC-Backup vom ${cfg.exported_at?.slice(0,10) || "??"} einspielen?\nBestehende Zimmer werden ersetzt.`)) return;
      statusEl.textContent = "⏳ Importiere…";
      try {
        // 1. Apply global settings
        if (cfg.global_settings) await this._callService("update_global_settings", cfg.global_settings);
        // 2. Remove existing rooms
        const existingRooms = Object.values(this._hass?.states || {})
          .filter(s => s.entity_id.startsWith("climate.ihc_") && s.entity_id !== "climate.intelligent_heating_control")
          .map(s => s.attributes?.room_id).filter(Boolean);
        for (const id of existingRooms) await this._callService("remove_room", { id });
        // 3. Add rooms from backup
        if (Array.isArray(cfg.rooms)) {
          for (const room of cfg.rooms) await this._callService("add_room", room);
        }
        await this._callService("reload", {});
        statusEl.textContent = `✅ Import abgeschlossen (${cfg.rooms?.length ?? 0} Zimmer)`;
        this._toast("✓ Konfiguration importiert");
      } catch (e) {
        statusEl.textContent = "❌ Import fehlgeschlagen: " + (e.message || e);
      }
    });

    content.querySelector("#save-vacation-range").addEventListener("click", () => {
      const start = content.querySelector("#vacation-start").value;
      const end   = content.querySelector("#vacation-end").value;
      const preheatDays = parseInt(content.querySelector("#vacation-return-preheat").value, 10) || 0;
      if (!start || !end) { this._toast("⚠️ Bitte Von- und Bis-Datum angeben"); return; }
      if (start > end) { this._toast("⚠️ Das Von-Datum muss vor dem Bis-Datum liegen"); return; }
      this._callService("update_global_settings", {
        vacation_start: start,
        vacation_end: end,
        vacation_return_preheat_days: preheatDays,
      });
      this._toast("✓ Urlaubszeitraum gespeichert");
    });

    content.querySelector("#clear-vacation-range").addEventListener("click", () => {
      this._callService("update_global_settings", { vacation_start: "", vacation_end: "" });
      this._toast("✓ Urlaubszeitraum gelöscht");
    });

    // Gäste-Modus
    const activateGuest = content.querySelector("#activate-guest-mode");
    if (activateGuest) {
      activateGuest.addEventListener("click", () => {
        const dur = parseInt(content.querySelector("#guest-duration").value, 10) || 24;
        this._callService("activate_guest_mode", { duration_hours: dur });
        this._toast(`🎉 Gäste-Modus aktiviert (${dur} h)`);
      });
    }
    const deactivateGuest = content.querySelector("#deactivate-guest-mode");
    if (deactivateGuest) {
      deactivateGuest.addEventListener("click", () => {
        this._callService("deactivate_guest_mode", {});
        this._toast("✓ Gäste-Modus beendet");
      });
    }
    content.querySelector("#save-guest-duration").addEventListener("click", () => {
      const dur = parseInt(content.querySelector("#guest-duration").value, 10);
      if (isNaN(dur)) { this._toast("⚠️ Ungültiger Wert"); return; }
      this._callService("update_global_settings", { guest_duration_hours: dur });
      this._toast("✓ Standarddauer gespeichert");
    });

    // ── v1.7 Heizgruppen ────────────────────────────────────────────────────
    this._renderGroupsSection(content);

    // Attach HA-style entity pickers to all entity inputs
    this._attachEntityPickers(content);
  }

  // ── v1.7 Heizgruppen: Render-Methode ────────────────────────────────────────

  _renderGroupsSection(parentContent) {
    const groups = this._getGlobal().groups || [];
    const rooms  = this._getRoomData();
    const roomList = Object.values(rooms);

    const groupsCard = document.createElement("details");
    groupsCard.className = "settings-section";
    groupsCard.open = groups.length > 0;
    groupsCard.innerHTML = `
      <summary class="settings-section-title">👥 Heizgruppen</summary>
      <div id="groups-body" style="padding-top:8px">
        <p style="font-size:12px;color:var(--secondary-text-color);margin:0 0 12px">
          Zusammenfassen von Zimmern zu Gruppen für schnelle Modus-Änderungen.
          Ideal für Etagen, Wohnbereiche oder Schlafzimmer.
        </p>
        <div id="groups-list"></div>
        <div class="btn-row">
          <button class="btn btn-secondary" id="add-group-btn">+ Gruppe hinzufügen</button>
        </div>
      </div>`;
    parentContent.appendChild(groupsCard);

    const groupsList = groupsCard.querySelector("#groups-list");

    const renderGroups = () => {
      const currentGroups = this._getGlobal().groups || [];
      groupsList.innerHTML = currentGroups.length === 0
        ? `<div style="color:var(--secondary-text-color);font-size:12px;padding:8px 0">Noch keine Gruppen.</div>`
        : currentGroups.map(grp => {
          const memberNames = (grp.group_rooms || [])
            .map(id => rooms[Object.keys(rooms).find(eid => rooms[eid].room_id === id)]?.name || id)
            .filter(Boolean).join(", ");
          return `
          <div class="card" style="margin-bottom:10px;padding:12px">
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
              <span style="font-weight:600;font-size:14px;flex:1">${grp.group_name || "Gruppe"}</span>
              <span style="font-size:11px;color:var(--secondary-text-color)">${(grp.group_rooms||[]).length} Zimmer</span>
              <button class="btn btn-secondary" style="font-size:11px;padding:3px 10px"
                data-action="edit-group" data-group-id="${grp.group_id}">✏️ Bearbeiten</button>
              <button class="btn btn-danger" style="font-size:11px;padding:3px 10px"
                data-action="delete-group" data-group-id="${grp.group_id}">✕</button>
            </div>
            ${memberNames ? `<div style="font-size:11px;color:var(--secondary-text-color);margin-top:4px">🚪 ${memberNames}</div>` : ""}
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
              ${["auto","comfort","eco","sleep","away","off"].map(m =>
                `<button class="btn btn-secondary" style="font-size:11px;padding:3px 8px"
                  data-action="group-mode" data-group-id="${grp.group_id}" data-mode="${m}">${MODE_ICONS[m]||""} ${MODE_LABELS[m]||m}</button>`
              ).join("")}
            </div>
          </div>`;
        }).join("");

      // Event delegation
      groupsList.querySelectorAll("[data-action='group-mode']").forEach(btn => {
        btn.addEventListener("click", () => {
          this._callService("set_group_mode", {
            group_id: btn.dataset.groupId,
            mode: btn.dataset.mode,
          });
          this._toast(`✓ Gruppe: ${btn.dataset.mode}`);
        });
      });
      groupsList.querySelectorAll("[data-action='delete-group']").forEach(btn => {
        btn.addEventListener("click", () => {
          this._showConfirmModal(
            "Gruppe löschen?",
            "Die Zimmer bleiben erhalten, nur die Gruppe wird entfernt.",
            async () => {
              await this._callService("remove_group", { group_id: btn.dataset.groupId });
              this._toast("✓ Gruppe gelöscht");
              setTimeout(() => this._renderTabContent(), 600);
            }
          );
        });
      });
      groupsList.querySelectorAll("[data-action='edit-group']").forEach(btn => {
        btn.addEventListener("click", () => {
          const grp = (this._getGlobal().groups || []).find(g => g.group_id === btn.dataset.groupId);
          if (!grp) return;
          this._showGroupEditModal(grp, roomList, () => setTimeout(() => this._renderTabContent(), 600));
        });
      });
    };

    renderGroups();

    groupsCard.querySelector("#add-group-btn").addEventListener("click", () => {
      this._showGroupEditModal(null, roomList, () => setTimeout(() => this._renderTabContent(), 600));
    });
  }

  _showGroupEditModal(group, roomList, onSave) {
    const isNew = !group;
    const existingRooms = group?.group_rooms || [];
    const roomCheckboxes = roomList.map(r => `
      <label style="display:flex;align-items:center;gap:8px;padding:4px 0;cursor:pointer">
        <input type="checkbox" data-room-id="${r.room_id}" ${existingRooms.includes(r.room_id) ? "checked" : ""}>
        <span>${r.name}</span>
        <span style="font-size:10px;color:var(--secondary-text-color)">${r.current_temp != null ? r.current_temp + " °C" : ""}</span>
      </label>`).join("");

    this._showModal(`
      <div class="modal-title">${isNew ? "➕ Neue Gruppe" : "✏️ Gruppe bearbeiten"}</div>
      <div class="form-group">
        <label class="form-label">Gruppenname</label>
        <input type="text" class="form-input full" id="g-name"
          value="${group?.group_name || ''}" placeholder="z.B. Erdgeschoss, Schlafzimmer" autocomplete="off">
      </div>
      <div class="form-group">
        <label class="form-label">Zimmer auswählen</label>
        <div style="max-height:280px;overflow-y:auto;border:1px solid var(--divider-color);border-radius:6px;padding:8px">
          ${roomCheckboxes || '<div style="color:var(--secondary-text-color);font-size:12px">Keine Zimmer konfiguriert.</div>'}
        </div>
      </div>
      <div class="btn-row">
        <button class="btn btn-primary" id="modal-confirm">${isNew ? "Gruppe erstellen" : "Speichern"}</button>
        <button class="btn btn-secondary modal-close-btn">Abbrechen</button>
      </div>
    `, async () => {
      const modal = this.shadowRoot.querySelector("#modal-root .modal");
      const name = modal.querySelector("#g-name").value.trim();
      if (!name) { this._toast("❌ Bitte Gruppenname eingeben"); return; }
      const room_ids = [...modal.querySelectorAll("[data-room-id]:checked")].map(cb => cb.dataset.roomId);
      if (isNew) {
        await this._callService("add_group", { group_name: name, group_rooms: room_ids });
        this._toast("✓ Gruppe erstellt");
      } else {
        await this._callService("update_group", {
          group_id: group.group_id,
          group_name: name,
          group_rooms: room_ids,
        });
        this._toast("✓ Gruppe gespeichert");
      }
      this._closeModal();
      if (onSave) onSave();
    });
  }

