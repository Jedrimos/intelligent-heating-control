/**
 * 03_tab_dashboard.js
 * IHC Frontend – Dashboard / Übersicht Tab
 * Contains: _renderOverview()
 */

  // ── Übersicht Tab ──────────────────────────────────────────────────────────

  _renderOverview(content) {
    const g = this._getGlobal();
    const rooms = this._getRoomData();

    // Sort rooms: heating → window open → demanding → satisfied → off
    const sortedRooms = Object.values(rooms).sort((a, b) => {
      const priority = r => {
        if (r.window_open) return 1;
        if (r.demand > 0 && g.heating_active) return 0;
        if (r.room_mode === "off") return 4;
        if (r.demand === 0) return 3;
        return 2;
      };
      return priority(a) - priority(b);
    });

    const srcMap = {
      "heating_curve": "Heizkurve", "schedule": "Zeitplan",
      "preheat": "⏱ Vorheizen", "comfort": "Komfort",
      "eco": "Eco", "sleep": "Schlafen",
      "system_away": "Sys. Abwesend", "system_vacation": "Urlaub",
      "room_off": "Aus", "manual": "Manuell", "room_away": "Abwesend",
      "system_off": "⛔ Aus",
      "frost_protection": "❄ Frostschutz",
      "guest_mode": "🎉 Gäste",
      "room_presence_eco": "🚶 Eco (leer)",   // legacy – kept for old stored states
      "room_presence_away": "🚶 Abwesend",
      "ha_schedule": "📅 HA Zeitplan",
      "ha_schedule_eco": "📅 HA Zeitplan (Eco)",
      "ha_schedule_sleep": "📅 HA Zeitplan (Schlaf)",
    };

    // Which system modes fully override room modes? (must be defined before roomCards map)
    const OVERRIDE_MODES = ["away", "vacation", "off", "guest"];
    const systemOverrides = OVERRIDE_MODES.includes(g.system_mode);
    const overrideLabel = systemOverrides
      ? ({ away: "🚶 Abwesend", vacation: "✈️ Urlaub", off: "⛔ Aus", guest: "🎉 Gäste" }[g.system_mode] || g.system_mode)
      : null;

    const roomCards = sortedRooms.map(room => {
      const isHeating  = room.demand > 0 && g.heating_active;
      const isWindow   = room.window_open;
      const isOff      = room.room_mode === "off";
      const isSat      = !isOff && !isWindow && room.demand === 0;

      // Determine card left-border class based on state
      let cardStatusCls = "";
      if (isWindow) cardStatusCls = " window-open";
      else if (isOff) cardStatusCls = " off";
      else if (isHeating) cardStatusCls = " heating";
      else if (room.room_mode === "eco") cardStatusCls = " eco";
      else if (room.room_mode === "sleep") cardStatusCls = " sleep";
      else if (room.room_mode === "away") cardStatusCls = " away";
      else if (isSat) cardStatusCls = " satisfied";

      // Compact status badge (top right)
      const statusBadge = (() => {
        if (isWindow) return `<span class="badge badge-window">🪟 offen</span>`;
        if (isOff)    return `<span class="badge badge-off">⛔ Aus</span>`;
        if (room.boost_remaining > 0)  return `<span class="badge badge-boost">⚡ ${room.boost_remaining}min</span>`;
        if (isHeating) return `<span class="badge badge-heat">🔥 Heizt</span>`;
        if (room.room_mode === "eco")   return `<span class="badge badge-eco">🌿 Eco</span>`;
        if (room.room_mode === "away")  return `<span class="badge badge-away">🚶 Abwesend</span>`;
        if (room.room_mode === "sleep") return `<span class="badge badge-sleep">🌙 Schlaf</span>`;
        if (isSat)     return `<span class="badge badge-ok">✓ OK</span>`;
        return "";
      })();

      const src = srcMap[room.source] || room.source;

      // Temp delta indicator
      const tempDiff = (room.current_temp !== null && room.target_temp !== null)
        ? room.target_temp - room.current_temp : null;
      const tempDiffStr = tempDiff !== null
        ? (tempDiff > 0.3 ? `<span style="color:#ef5350;font-size:10px;font-weight:700">↑${tempDiff.toFixed(1)}°</span>`
           : tempDiff < -0.3 ? `<span style="color:#66bb6a;font-size:10px;font-weight:700">↓${Math.abs(tempDiff).toFixed(1)}°</span>`
           : `<span style="color:#66bb6a;font-size:10px">≈</span>`)
        : "";

      const modeOptions = ["auto","comfort","eco","sleep","away","off","manual"].map(m =>
        `<option value="${m}" ${room.room_mode === m ? "selected" : ""}>${MODE_ICONS[m] || ""} ${MODE_LABELS[m]}</option>`
      ).join("");

      // Alert chips (compact, stacked)
      const alerts = [];
      if (systemOverrides) alerts.push(`<div class="room-alert alert-override">${overrideLabel} – Zimmermodus übersteuert</div>`);
      if (room.anomaly === "sensor_stuck") alerts.push(`<div class="room-alert alert-danger">⚠️ Sensor konstant – bitte prüfen</div>`);
      if (room.anomaly === "temp_drop")    alerts.push(`<div class="room-alert alert-warn">⚠️ Starker Temperaturabfall</div>`);
      if (room.mold && room.mold.risk)     alerts.push(`<div class="room-alert alert-info">💧 Schimmelrisiko – ${room.mold.humidity}%${room.mold.dew_point != null ? ` · Taupunkt ${room.mold.dew_point}°C` : ""}</div>`);
      if (room.trv_low_battery)            alerts.push(`<div class="room-alert alert-danger">🔋 TRV-Batterie schwach (${room.trv_min_battery ?? '?'}%) – bitte tauschen</div>`);
      const v = room.ventilation;
      if (v && v.level !== "none") {
        const icons = { urgent: "🪟❗", recommended: "🪟", possible: "🌬️" };
        const cls   = { urgent: "alert-danger", recommended: "alert-warn", possible: "alert-info" };
        const tip = v.reasons && v.reasons.length ? v.reasons.join(" · ") : v.level;
        const co2part = v.co2_ppm != null ? ` · CO₂ ${v.co2_ppm}` : "";
        alerts.push(`<div class="room-alert ${cls[v.level] || 'alert-info'}">${icons[v.level] || "🌬️"} ${tip}${co2part}</div>`);
      }
      const alertsHtml = alerts.length ? `<div class="room-alerts">${alerts.join("")}</div>` : "";

      // TRV chips
      const hasTrvInfo = room.trv_raw_temp != null || (room.trv_avg_valve != null && room.trv_avg_valve > 0) || room.trv_humidity != null || room.trv_min_battery != null;
      const batColor = room.trv_min_battery != null && room.trv_min_battery < 20 ? "#c62828" : room.trv_min_battery != null && room.trv_min_battery < 40 ? "#e65100" : "#2e7d32";
      const batBg    = room.trv_min_battery != null && room.trv_min_battery < 20 ? "#fce4ec" : room.trv_min_battery != null && room.trv_min_battery < 40 ? "#fff3e0" : "#e8f5e9";
      const batIcon  = room.trv_min_battery != null && room.trv_min_battery < 20 ? "🪫" : "🔋";
      const trvChips = hasTrvInfo ? `
        <div class="trv-chips">
          ${room.trv_raw_temp != null ? `<span class="trv-chip" style="background:#fff3e0;color:#e65100" title="TRV-Rohtemperatur">🌡️ TRV ${parseFloat(room.trv_raw_temp).toFixed(1)}°</span>` : ""}
          ${room.trv_avg_valve != null && room.trv_avg_valve > 0 ? `<span class="trv-chip" style="background:#e3f2fd;color:#1565c0" title="Ventilöffnung Ø">🔧 ${Math.round(room.trv_avg_valve)}%</span>` : ""}
          ${room.trv_humidity != null ? `<span class="trv-chip" style="background:#e8f5e9;color:#2e7d32" title="TRV-Luftfeuchtigkeit">💧 ${Math.round(room.trv_humidity)}%</span>` : ""}
          ${room.trv_min_battery != null ? `<span class="trv-chip" style="background:${batBg};color:${batColor}" title="TRV-Batterie (niedrigster Wert)">${batIcon} ${room.trv_min_battery}%</span>` : ""}
          ${room.trv_any_heating ? `<span class="trv-chip" style="background:#fce4ec;color:#c62828" title="TRV heizt aktiv">🔥</span>` : ""}
        </div>` : "";

      // Footer info
      const footerParts = [];
      const showRuntime = localStorage.getItem("ihc_show_runtime") !== "false";
      const showCosts   = localStorage.getItem("ihc_show_costs") !== "false";
      if (showRuntime && room.runtime_today_minutes > 0) footerParts.push(`⏱ ${room.runtime_today_minutes} min`);
      if (showCosts && room.energy_today_kwh > 0) footerParts.push(this._costStr(room.energy_today_kwh, g.static_energy_price));
      if (room.avg_warmup_minutes) footerParts.push(`Ø Aufheiz: ${room.avg_warmup_minutes} min`);
      if (room.next_period && !room.schedule_active) {
        const np = room.next_period;
        const npMode = np.mode && np.mode !== "manual" ? np.mode : null;
        const npTemp = npMode ? `(${npMode})` : (np.temperature != null ? `${np.temperature}°C` : "");
        // In manual mode: highlight as "Reset" instead of generic next-schedule info
        if (room.room_mode === "manual") {
          footerParts.push(`↩ Reset ${np.start} Uhr`);
        } else {
          footerParts.push(`📅 ${np.start}${npTemp ? " · " + npTemp : ""}`);
        }
      }

      return `
        <div class="room-card${cardStatusCls}">
          <div class="room-card-inner">
            ${alertsHtml}
            <div class="room-header">
              <div class="room-name">${room.name}</div>
              <div class="room-status-chips">${statusBadge}</div>
            </div>
            <div class="room-temp-row">
              <div class="room-temp-current">
                <div class="room-temp-big">
                  ${room.current_temp !== null ? parseFloat(room.current_temp).toFixed(1) : "—"}<span class="room-temp-unit-big">°</span>
                </div>
                <div class="room-temp-lbl">Ist</div>
              </div>
              <div style="display:flex;flex-direction:column;justify-content:flex-end;padding-bottom:4px;padding-left:4px">
                <svg width="14" height="14" viewBox="0 0 14 14" style="opacity:.35"><path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </div>
              <div class="room-temp-target" style="padding-bottom:4px">
                <div class="room-temp-target-val">
                  ${room.source === "system_off" ? '<span style="font-size:15px;font-weight:700;color:#9e9e9e">Aus</span>'
                    : (room.target_temp !== null ? parseFloat(room.target_temp).toFixed(1) + '<span style="font-size:13px;font-weight:400;color:var(--secondary-text-color)">°</span>' : "—")}
                  ${tempDiffStr}
                </div>
                <div class="room-temp-target-lbl">Soll</div>
              </div>
              <div style="flex:1"></div>
              ${this._sparkline(room.temp_history, 60, 28)}
            </div>
            <div class="demand-wrap">
              <div class="demand-bar-bg">
                <div class="demand-bar" style="width:${room.demand}%;background:${this._demandColor(room.demand)}"></div>
              </div>
              <div class="demand-meta">
                <span style="font-weight:600;color:${this._demandColor(room.demand)}">${room.demand} %</span>
                <span>· ${src}</span>
                ${room.night_setback > 0 ? `<span>· 🌙 -${room.night_setback}°</span>` : ""}
                ${room.room_presence_active === false ? `<span>· 🚶 niemand da</span>` : ""}
                ${room.co2_ppm > 0 ? `<span>· CO₂ ${room.co2_ppm} ppm</span>` : ""}
              </div>
            </div>
            ${trvChips}
            <div class="room-action-row">
              <select class="mode-select active-${room.room_mode || 'auto'}" data-room-id="${room.room_id}">
                ${modeOptions}
              </select>
              ${room.boost_remaining > 0
                ? `<button class="btn-boost" data-room-id="${room.room_id}" data-action="boost-cancel" title="Boost beenden" style="background:#ff7043;color:white;border-color:#ff7043">⚡ ${room.boost_remaining}min ✕</button>`
                : `<button class="btn-boost" data-room-id="${room.room_id}" data-action="boost" title="Boost starten">⚡</button>`}
            </div>
            ${footerParts.length ? `<div class="room-footer"><span class="room-footer-meta">${footerParts.join(" · ")}</span></div>` : ""}
          </div>
        </div>`;
    }).join("");

    // Build system banners (compact new style)
    const banners = [
      g.summer_mode           ? `<div class="system-banner summer">☀️ <strong>Sommerautomatik aktiv</strong> – Heizung gesperrt</div>` : "",
      g.night_setback_active  ? `<div class="system-banner night">🌙 <strong>Nachtabsenkung aktiv</strong> – Temperaturen reduziert</div>` : "",
      g.presence_away_active  ? `<div class="system-banner away">🚶 <strong>Niemand zuhause</strong> – Abwesend-Modus aktiv</div>` : "",
      g.solar_boost > 0       ? `<div class="system-banner solar">🌞 <strong>Solar-Überschuss</strong>${g.solar_power != null ? " · " + g.solar_power + " W" : ""} · +${g.solar_boost}°C angehoben</div>` : "",
      g.cold_boost > 0        ? `<div class="system-banner cold">🥶 <strong>Kälteboost</strong> – alle Zimmer +${g.cold_boost}°C angehoben</div>` : "",
      g.energy_price_eco_active ? `<div class="system-banner price">💶 <strong>Hoher Strompreis</strong>${g.energy_price != null ? " · " + g.energy_price.toFixed(3) + " €/kWh" : ""} – Eco-Absenkung aktiv</div>` : "",
      g.vacation_auto_active  ? `<div class="system-banner vacation">✈️ <strong>Urlaubs-Modus aktiv</strong></div>` : "",
      g.return_preheat_active ? `<div class="system-banner preheat">🏠 <strong>Rückkehr-Vorheizung</strong> – Haus wird aufgeheizt</div>` : "",
      g.guest_mode_active     ? `<div class="system-banner guest">🎉 <strong>Gäste-Modus aktiv</strong>${g.guest_remaining_minutes != null ? ` · noch ${g.guest_remaining_minutes} min` : ""}</div>` : "",
      g.weather_forecast && g.weather_forecast.cold_warning ? `<div class="system-banner cold">🥶 <strong>Kältewarnung</strong> – Tiefst heute: ${g.weather_forecast.forecast_today_min}°C${g.weather_forecast.forecast_today_max != null ? ` / max. ${g.weather_forecast.forecast_today_max}°C` : ""}</div>` : "",
      g.eta_preheat_minutes != null && g.eta_preheat_minutes <= 90 ? `<div class="system-banner eta">🕒 <strong>ETA-Vorheizen</strong> – Ankunft in ~${Math.round(g.eta_preheat_minutes)} min</div>` : "",
    ].filter(Boolean).join("");

    // Hero section
    const heatingState = g.heating_active ? "🔥 Heizt" : "✓ Bereit";
    const heatingCls   = g.heating_active ? "heating" : "ok";
    const demandNum    = g.total_demand != null ? `${g.total_demand} %` : "—";
    const demandCls    = (g.total_demand || 0) > 0 ? "warn" : "ok";

    // Quick system-mode pills
    const sysModes = [
      ["auto","⚙️","Automatisch"], ["heat","🔥","Heizen"], ["cool","❄️","Kühlen"],
      ["away","🚶","Abwesend"], ["vacation","✈️","Urlaub"], ["off","⛔","Aus"], ["guest","🎉","Gäste"],
    ];
    const modeDisplay = SYSTEM_MODE_LABELS[g.system_mode] || g.system_mode;

    const heroSection = `
      <div class="overview-hero">
        <div class="hero-card">
          <div class="hero-label">Heizung</div>
          <div class="hero-value ${heatingCls}">${heatingState}</div>
          <div class="hero-sub">${g.rooms_demanding} Zimmer mit Anforderung</div>
        </div>
        <div class="hero-card">
          <div class="hero-label">Gesamtanforderung</div>
          <div class="hero-value ${demandCls}">${demandNum}</div>
          ${(() => {
            const showRuntime = localStorage.getItem("ihc_show_runtime") !== "false";
            const showCosts   = localStorage.getItem("ihc_show_costs") !== "false";
            if (!showRuntime && !showCosts) return "";
            const parts = [];
            if (showRuntime && g.heating_runtime_today > 0) parts.push(`⏱ ${g.heating_runtime_today} min`);
            if (showCosts && g.energy_today_kwh > 0) parts.push(this._costStr(g.energy_today_kwh, g.static_energy_price));
            return parts.length ? `<div class="hero-sub">${parts.join(" · ")}</div>` : "";
          })()}
        </div>
        <div class="hero-card">
          <div class="hero-label">Außen / Vorlauf</div>
          <div class="hero-value" style="font-size:20px">
            ${g.outdoor_temp != null ? g.outdoor_temp + " °C" : "—"}
            ${g.curve_target != null ? `<span style="font-size:13px;font-weight:400;color:var(--secondary-text-color);margin-left:4px">→ ${g.curve_target.toFixed(1)} °C</span>` : ""}
          </div>
          ${g.flow_temp != null ? `<div class="hero-sub">Vorlauf: ${g.flow_temp.toFixed(1)} °C</div>` : ""}
          ${g.efficiency_score != null ? `<div class="hero-sub">Effizienz: <strong style="color:${g.efficiency_score >= 80 ? "#66bb6a" : g.efficiency_score >= 50 ? "#ffa726" : "#ef5350"}">${g.efficiency_score.toFixed(0)} %</strong></div>` : ""}
        </div>
      </div>
      <div class="system-mode-row">
        <span class="system-mode-label">Modus:</span>
        ${sysModes.map(([k, icon, label]) =>
          `<button class="sysmode-pill active-${g.system_mode === k ? k : ''}" data-sysmode="${k}"
            title="${label}">${icon} ${label}</button>`
        ).join("")}
      </div>`;

    // Secondary stats (weather + yesterday)
    const statsGrid = `
      <div class="status-grid">
        ${g.weather_forecast ? (() => {
          const fc = g.weather_forecast;
          const wc = WEATHER_CONDITIONS[fc.condition] || { label: fc.condition || "—", icon: "🌡️" };
          const range = fc.forecast_today_min != null ? `${fc.forecast_today_min}–${fc.forecast_today_max}°` : "";
          const dayLabels = ["Heute","Morgen","Überg."];
          const fcDays = (fc.forecast || []).slice(0, 3).map((d, i) => {
            const dc = WEATHER_CONDITIONS[d.condition] || { icon: "🌡️" };
            return `<span style="display:inline-flex;flex-direction:column;align-items:center;margin:0 3px;font-size:10px">
              <span style="color:var(--secondary-text-color)">${dayLabels[i] || ""}</span>
              <span style="font-size:14px;margin:1px 0">${dc.icon}</span>
              <span style="font-weight:700">${d.min != null ? d.min : "?"}/${d.max != null ? d.max : "?"}°</span>
            </span>`;
          }).join("");
          return `<div class="status-item" title="Wettervorhersage 3 Tage" style="min-width:120px;text-align:left;padding:10px 12px">
            <div class="status-label">Wetter</div>
            <div style="display:flex;align-items:center;gap:5px;margin:3px 0">
              <span style="font-size:20px">${wc.icon}</span>
              <span style="font-size:11px;font-weight:600">${wc.label}${range ? " · " + range : ""}</span>
            </div>
            ${fcDays ? `<div style="display:flex;margin-top:4px;gap:4px">${fcDays}</div>` : ""}
          </div>`;
        })() : ""}
        ${g.solar_power != null ? `<div class="status-item">
          <div class="status-label">Solar</div>
          <div class="status-value" style="color:#f9a825">${g.solar_power} W</div>
          ${g.solar_boost > 0 ? `<div style="font-size:10px;color:#f9a825">+${g.solar_boost}°C Boost</div>` : ""}
        </div>` : ""}
        ${g.energy_price != null ? `<div class="status-item">
          <div class="status-label">Strompreis</div>
          <div class="status-value" style="color:${g.energy_price_eco_active ? "#ef5350" : "#66bb6a"}">${g.energy_price.toFixed(3)}</div>
          <div style="font-size:10px;color:var(--secondary-text-color)">€/kWh</div>
        </div>` : ""}
        ${g.heating_runtime_yesterday > 0 && localStorage.getItem("ihc_show_energy") !== "false" ? `<div class="status-item" title="Gestriger Verbrauch">
          <div class="status-label">Gestern</div>
          <div class="status-value ${g.energy_today_kwh > g.energy_yesterday_kwh ? "on" : "ok"}" style="font-size:13px">${this._costStr(g.energy_yesterday_kwh, g.static_energy_price)}</div>
        </div>` : ""}
        ${g.outdoor_humidity != null ? `<div class="status-item">
          <div class="status-label">Außenfeuchte</div>
          <div class="status-value">${g.outdoor_humidity.toFixed(0)} %</div>
        </div>` : ""}
      </div>`;

    content.innerHTML = `
      ${Object.keys(rooms).length === 0 ? `<div class="info-box">
        Noch keine Zimmer konfiguriert. Gehe zum Tab <strong>Zimmer</strong> und füge dein erstes Zimmer hinzu.
      </div>` : ""}

      ${banners}
      ${heroSection}
      ${statsGrid}
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.7px;color:var(--secondary-text-color);margin-bottom:10px">${sortedRooms.length} Zimmer</div>
      <div class="rooms-grid">${roomCards}</div>
    `;

    // Sysmode-pill buttons (system mode quick-select in hero section)
    content.querySelectorAll(".sysmode-pill[data-sysmode]").forEach(btn => {
      btn.addEventListener("click", () => {
        const mode = btn.dataset.sysmode;
        // Optimistic UI: immediately highlight selected pill
        content.querySelectorAll(".sysmode-pill").forEach(b => { b.className = "sysmode-pill"; });
        btn.className = `sysmode-pill active-${mode}`;
        this._callService("set_system_mode", { mode }).then(() => {
          setTimeout(() => { if (this._activeTab === "overview" && !this._modalOpen) this._renderTabContent(); }, 400);
        });
        this._toast(`✓ Systemmodus: ${SYSTEM_MODE_LABELS[mode] || mode}`);
      });
    });

    // Mode select changes
    content.querySelectorAll(".mode-select[data-room-id]").forEach(sel => {
      sel.addEventListener("change", () => {
        const roomId = sel.dataset.roomId;
        if (!roomId) return;
        const m = sel.value;
        // Optimistic UI: update class immediately
        sel.className = `mode-select active-${m}`;
        this._callService("set_room_mode", { id: roomId, mode: m }).then(() => {
          setTimeout(() => { if (this._activeTab === "overview" && !this._modalOpen) this._renderTabContent(); }, 1200);
        });
        this._toast(`✓ Modus: ${MODE_LABELS[m] || m}`);
      });
    });

    // Boost buttons
    content.querySelectorAll(".btn-boost[data-room-id]").forEach(btn => {
      btn.addEventListener("click", () => {
        const roomId = btn.dataset.roomId;
        if (!roomId) return;
        const isCancel = btn.dataset.action === "boost-cancel";
        if (isCancel) {
          this._callService("boost_room", { id: roomId, cancel: true }).then(() => {
            setTimeout(() => { if (this._activeTab === "overview" && !this._modalOpen) this._renderTabContent(); }, 1200);
          });
          this._toast("✓ Boost beendet");
        } else {
          const rooms = this._getRoomData();
          const room  = Object.values(rooms).find(r => r.room_id === roomId);
          const dur  = room?.boost_default_duration || 60;
          this._callService("boost_room", { id: roomId, duration_minutes: dur }).then(() => {
            setTimeout(() => { if (this._activeTab === "overview" && !this._modalOpen) this._renderTabContent(); }, 1200);
          });
          this._toast(`⚡ Boost aktiviert (${dur} min${temp ? ` → ${temp}°C` : ""})`);
        }
      });
    });
  }
