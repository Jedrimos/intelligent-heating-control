/**
 * IHC Dashboard Card – Lovelace overview card for all IHC rooms
 *
 * Config:
 *   type: custom:ihc-dashboard-card
 *   title: "Heizungssteuerung"   # optional
 *   show_energy: true            # optional (default true)
 *   compact: false               # optional – compact single-row room tiles
 */

const _IHC_DB_DOMAIN = "intelligent_heating_control";

const _DB_MODE_LABELS = {
  auto: "Auto", comfort: "Komfort", eco: "Eco",
  sleep: "Schlafen", away: "Abwesend", off: "Aus", manual: "Manuell",
};
const _DB_MODE_ICONS = {
  auto: "⚙️", comfort: "☀️", eco: "🌿", sleep: "🌙",
  away: "🚶", off: "⛔", manual: "✏️",
};
const _SYS_MODE_LABELS = {
  auto: "Automatisch", heat: "Heizen", cool: "Kühlen",
  off: "Aus", away: "Abwesend", vacation: "Urlaub", guest: "Gäste",
};
const _WEATHER_ICONS = {
  "clear-night":"🌙","cloudy":"☁️","fog":"🌫️","hail":"🌨️","lightning":"⛈️",
  "lightning-rainy":"⛈️","partlycloudy":"⛅","pouring":"🌧️","rainy":"🌦️",
  "snowy":"❄️","snowy-rainy":"🌨️","sunny":"☀️","windy":"🌬️","windy-variant":"💨",
};

const _DB_STYLES = `
  :host { display: block; }
  * { box-sizing: border-box; }

  ha-card { padding: 16px; }

  /* Header */
  .db-header {
    display: flex; align-items: center; gap: 10px; margin-bottom: 16px;
    flex-wrap: wrap;
  }
  .db-title { font-size: 16px; font-weight: 700; color: var(--primary-text-color); flex: 1; }
  .sys-mode-select {
    padding: 5px 10px; border-radius: 8px; border: 1.5px solid var(--divider-color);
    background: var(--card-background-color); color: var(--primary-text-color);
    font-size: 13px; cursor: pointer;
  }

  /* Status strip */
  .status-strip {
    display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px;
  }
  .stat {
    background: var(--secondary-background-color, #f5f5f5);
    border-radius: 10px; padding: 8px 12px;
    display: flex; flex-direction: column; align-items: center; gap: 2px;
    min-width: 72px;
  }
  .stat-val { font-size: 16px; font-weight: 700; color: var(--primary-text-color); }
  .stat-val.on  { color: var(--error-color, #e53935); }
  .stat-val.off { color: var(--secondary-text-color); }
  .stat-lbl { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px;
              color: var(--secondary-text-color); font-weight: 600; }

  /* Weather strip */
  .weather-strip {
    display: flex; gap: 8px; margin-bottom: 16px;
  }
  .wday {
    background: var(--secondary-background-color, #f5f5f5);
    border-radius: 10px; padding: 8px 10px;
    display: flex; flex-direction: column; align-items: center; gap: 2px; flex: 1;
  }
  .wday-lbl  { font-size: 10px; font-weight: 700; color: var(--secondary-text-color); text-transform: uppercase; }
  .wday-icon { font-size: 20px; }
  .wday-minmax { font-size: 11px; color: var(--secondary-text-color); }

  /* Banners */
  .banner {
    border-radius: 8px; padding: 10px 14px; margin-bottom: 12px;
    font-size: 13px; display: flex; align-items: center; gap: 8px;
  }
  .banner-warn { background: linear-gradient(135deg,#fff9c4,#fffde7); border: 1px solid #f9a825; }
  .banner-info { background: linear-gradient(135deg,#e3f2fd,#e8f5fd); border: 1px solid #1e88e5; }
  .banner-eco  { background: linear-gradient(135deg,#e8f5e9,#f1f8e9); border: 1px solid #43a047; }

  /* Room grid */
  .rooms-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 10px;
  }
  .rooms-grid.compact {
    grid-template-columns: 1fr;
    gap: 4px;
  }

  /* Room tile */
  .room-tile {
    background: var(--card-background-color, #fff);
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 10px; padding: 12px;
    border-left: 4px solid var(--divider-color, #e0e0e0);
    transition: border-color 0.3s, box-shadow 0.2s;
    cursor: default;
  }
  .room-tile:hover { box-shadow: 0 2px 8px rgba(0,0,0,.1); }
  .room-tile.heating     { border-left-color: var(--error-color, #e53935); }
  .room-tile.satisfied   { border-left-color: var(--success-color, #43a047); }
  .room-tile.window-open { border-left-color: #1e88e5; }
  .room-tile.mode-off    { border-left-color: #9e9e9e; opacity: 0.7; }

  .tile-top {
    display: flex; justify-content: space-between; align-items: flex-start;
    margin-bottom: 8px;
  }
  .tile-name { font-size: 13px; font-weight: 700; color: var(--primary-text-color); }
  .tile-icons { font-size: 14px; display: flex; gap: 3px; }

  .tile-temps {
    display: flex; align-items: baseline; gap: 6px; margin-bottom: 8px;
  }
  .tile-cur  { font-size: 24px; font-weight: 300; color: var(--primary-text-color); }
  .tile-arr  { font-size: 13px; color: var(--secondary-text-color); }
  .tile-tgt  { font-size: 18px; font-weight: 600; color: var(--primary-color); }

  .tile-demand-bg {
    background: var(--secondary-background-color, #f5f5f5);
    border-radius: 4px; height: 4px; margin-bottom: 6px; overflow: hidden;
  }
  .tile-demand-bar { height: 100%; border-radius: 4px; transition: width 0.5s, background 0.3s; }

  .tile-chips { display: flex; gap: 3px; flex-wrap: wrap; }
  .tile-chip {
    padding: 2px 7px; border-radius: 10px; font-size: 11px; font-weight: 600;
    border: 1.5px solid var(--divider-color); cursor: pointer;
    transition: all 0.15s; color: var(--secondary-text-color); background: transparent;
  }
  .tile-chip:hover  { border-color: var(--primary-color); color: var(--primary-color); }
  .tile-chip.active { background: var(--primary-color); color: white; border-color: var(--primary-color); }
  .tile-chip.boost  { border-color: #fb8c00; color: #fb8c00; }
  .tile-chip.boost.active { background: #fb8c00; color: white; }

  /* Compact tile */
  .room-tile.compact-tile { padding: 8px 12px; }
  .compact-row { display: flex; align-items: center; gap: 8px; }
  .compact-name { font-weight: 700; font-size: 13px; flex: 1; min-width: 0;
                  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .compact-cur  { font-size: 16px; font-weight: 300; min-width: 44px; text-align: right; }
  .compact-tgt  { font-size: 14px; font-weight: 600; color: var(--primary-color);
                  min-width: 40px; text-align: right; }
  .compact-icons { font-size: 13px; display: flex; gap: 2px; }

  /* Energy footer */
  .energy-row {
    display: flex; gap: 8px; flex-wrap: wrap;
    margin-top: 16px; padding-top: 12px;
    border-top: 1px solid var(--divider-color, #e0e0e0);
  }
  .energy-stat {
    display: flex; align-items: center; gap: 5px;
    font-size: 12px; color: var(--secondary-text-color);
  }
  .energy-stat b { color: var(--primary-text-color); }

  .no-rooms { font-size: 14px; color: var(--secondary-text-color); padding: 16px 0; }
`;

class IhcDashboardCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._hass = null;
  }

  setConfig(config) {
    this._config = {
      title: config.title || "Heizungssteuerung",
      show_energy: config.show_energy !== false,
      compact: config.compact === true,
    };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  _st(entityId) {
    return this._hass && this._hass.states ? this._hass.states[entityId] : null;
  }

  // ── Data helpers ────────────────────────────────────────────────────────────

  _getRooms() {
    if (!this._hass) return [];
    const rooms = {};

    Object.entries(this._hass.states).forEach(([eid, state]) => {
      if (!eid.startsWith("climate.ihc_")) return;
      const a = state.attributes;
      const baseName = eid.replace("climate.ihc_", "");
      rooms[eid] = {
        entity_id: eid,
        base_name: baseName,
        room_id: a.room_id || baseName,
        name: (a.friendly_name || eid).replace(/^IHC\s*/i, ""),
        current_temp: a.current_temperature ?? null,
        target_temp: a.temperature ?? null,
        hvac_action: a.hvac_action || "",
        room_mode: a.room_mode || "auto",
        demand: a.demand || 0,
        window_open: a.window_open || false,
        boost_remaining: a.boost_remaining || 0,
        room_presence_active: null,
        mold: false,
      };
    });

    // Enrich from demand sensors
    Object.entries(this._hass.states).forEach(([eid, state]) => {
      if (!eid.startsWith("sensor.ihc_") || !eid.endsWith("_anforderung")) return;
      const baseName = eid.replace("sensor.ihc_", "").replace("_anforderung", "");
      const cid = `climate.ihc_${baseName}`;
      if (!rooms[cid]) return;
      const da = state.attributes;
      rooms[cid].demand = parseFloat(state.state) || 0;
      if (da.room_mode !== undefined) rooms[cid].room_mode = da.room_mode;
      if (da.window_open !== undefined) rooms[cid].window_open = da.window_open;
      if (da.room_presence_active !== undefined) rooms[cid].room_presence_active = da.room_presence_active;
      if (da.mold !== undefined) rooms[cid].mold = da.mold;
      if (da.ventilation !== undefined) rooms[cid].ventilation = da.ventilation;
      if (da.co2_ppm !== undefined) rooms[cid].co2_ppm = da.co2_ppm;
    });

    return Object.values(rooms).sort((a, b) => {
      const p = r => {
        if (r.window_open)      return 0;
        if (r.demand > 5)       return 1;
        if (r.room_mode === "off") return 4;
        if (r.demand > 0)       return 2;
        return 3;
      };
      return p(a) - p(b);
    });
  }

  _getGlobal() {
    const dem = this._st("sensor.ihc_gesamtanforderung");
    const sw  = this._st("switch.ihc_heizung_aktiv");
    const sel = this._st("select.ihc_systemmodus");
    const ot  = this._st("sensor.ihc_aussentemperatur");
    const rt  = this._st("sensor.ihc_heizlaufzeit_heute");
    const egy = this._st("sensor.ihc_energie_heute");
    const a   = dem ? (dem.attributes || {}) : {};
    const ea  = egy ? (egy.attributes || {}) : {};
    return {
      total_demand:           dem ? parseFloat(dem.state) || 0 : null,
      heating_active:         sw  ? sw.state === "on" : (a.heating_active || false),
      system_mode:            sel ? sel.state : null,
      outdoor_temp:           ot  ? parseFloat(ot.state) : null,
      rooms_demanding:        a.rooms_demanding || 0,
      summer_mode:            a.summer_mode || false,
      night_setback_active:   a.night_setback_active || false,
      presence_away_active:   a.presence_away_active || false,
      guest_mode_active:      a.guest_mode_active || false,
      guest_remaining_minutes: a.guest_remaining_minutes ?? null,
      vacation_auto_active:   a.vacation_auto_active || false,
      return_preheat_active:  a.return_preheat_active || false,
      eta_preheat_minutes:    a.eta_preheat_minutes ?? null,
      adaptive_curve_delta:   a.adaptive_curve_delta ?? 0,
      energy_price_eco_active: ea.energy_price_eco_active || false,
      solar_boost:            ea.solar_boost || 0,
      weather_forecast:       a.weather_forecast || null,
      heating_runtime_today:  rt ? parseFloat(rt.state) || 0 : (a.heating_runtime_today || 0),
      energy_today_kwh:       egy ? parseFloat(egy.state) || 0 : 0,
      energy_yesterday_kwh:   ea.energy_yesterday_kwh || 0,
      flow_temp:              ea.flow_temp != null ? parseFloat(ea.flow_temp) : null,
      outdoor_humidity:       a.outdoor_humidity != null ? parseFloat(a.outdoor_humidity) : null,
    };
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  _demandColor(d) {
    if (d >= 80) return "#e53935";
    if (d >= 60) return "#fb8c00";
    if (d >= 30) return "#fdd835";
    return "#43a047";
  }

  _fmt(v, unit = "") {
    return v !== null && v !== undefined && !isNaN(v) ? `${v}${unit}` : "—";
  }

  _renderHeader(g) {
    const sysModeOptions = Object.entries(_SYS_MODE_LABELS).map(([k, v]) => {
      const sel = g.system_mode === k ? " selected" : "";
      return `<option value="${k}"${sel}>${v}</option>`;
    }).join("");
    return `
      <div class="db-header">
        <div class="db-title">🔥 ${this._config.title}</div>
        <select class="sys-mode-select" id="sys-mode-sel">
          ${sysModeOptions}
        </select>
      </div>
    `;
  }

  _renderStatusStrip(g) {
    const heatClass = g.heating_active ? "on" : "off";
    const heatIcon  = g.heating_active ? "🔥 AN" : "⬜ AUS";
    return `
      <div class="status-strip">
        <div class="stat">
          <div class="stat-val ${heatClass}">${heatIcon}</div>
          <div class="stat-lbl">Heizung</div>
        </div>
        <div class="stat">
          <div class="stat-val">${g.outdoor_temp !== null ? g.outdoor_temp.toFixed(1) + "°" : "—"}</div>
          <div class="stat-lbl">Außen</div>
        </div>
        <div class="stat">
          <div class="stat-val">${g.total_demand !== null ? g.total_demand.toFixed(0) + "%" : "—"}</div>
          <div class="stat-lbl">Gesamt</div>
        </div>
        <div class="stat">
          <div class="stat-val">${g.rooms_demanding}</div>
          <div class="stat-lbl">Zimmer</div>
        </div>
        ${g.flow_temp !== null ? `<div class="stat"><div class="stat-val">${g.flow_temp.toFixed(1)}°</div><div class="stat-lbl">Vorlauf</div></div>` : ""}
        ${g.outdoor_humidity !== null ? `<div class="stat"><div class="stat-val">${g.outdoor_humidity.toFixed(0)}%</div><div class="stat-lbl">Außenfeuchte</div></div>` : ""}
      </div>
    `;
  }

  _renderWeather(forecast) {
    if (!forecast || !forecast.length) return "";
    const DAY_LABELS = ["Heute", "Morgen", "Übermorgen"];
    const days = forecast.slice(0, 3).map((d, i) => {
      const icon = _WEATHER_ICONS[d.condition] || "🌡️";
      const minV = d.min !== undefined && d.min !== null ? Math.round(d.min) : "?";
      const maxV = d.max !== undefined && d.max !== null ? Math.round(d.max) : "?";
      return `<div class="wday">
        <div class="wday-lbl">${DAY_LABELS[i] || ""}</div>
        <div class="wday-icon">${icon}</div>
        <div class="wday-minmax">${minV}° / ${maxV}°</div>
      </div>`;
    });
    return `<div class="weather-strip">${days.join("")}</div>`;
  }

  _renderBanners(g) {
    const banners = [];
    if (g.summer_mode)
      banners.push(`<div class="banner banner-warn">☀️ <b>Sommermodus</b> aktiv – Heizung pausiert</div>`);
    if (g.vacation_auto_active)
      banners.push(`<div class="banner banner-info">✈️ <b>Urlaubsmodus</b> aktiv</div>`);
    if (g.return_preheat_active)
      banners.push(`<div class="banner banner-info">🏠 Vorheizen zur Urlaubsrückkehr aktiv</div>`);
    if (g.guest_mode_active && g.guest_remaining_minutes !== null)
      banners.push(`<div class="banner banner-info">👥 <b>Gäste-Modus</b> – noch ${g.guest_remaining_minutes} min</div>`);
    if (g.night_setback_active)
      banners.push(`<div class="banner banner-eco">🌙 Nachtabsenkung aktiv</div>`);
    if (g.presence_away_active)
      banners.push(`<div class="banner banner-warn">🚶 Abwesenheits-Absenkung aktiv</div>`);
    if (g.energy_price_eco_active)
      banners.push(`<div class="banner banner-eco">💡 Energiepreis-Eco aktiv (hoher Strompreis)</div>`);
    if (g.solar_boost > 0)
      banners.push(`<div class="banner banner-eco">☀️ Solar-Boost +${g.solar_boost.toFixed(1)}°C aktiv</div>`);
    if (g.eta_preheat_minutes !== null && g.eta_preheat_minutes <= 90)
      banners.push(`<div class="banner banner-info">🚗 Ankunft in ${g.eta_preheat_minutes} min – Vorheizen aktiv</div>`);
    if (g.adaptive_curve_delta && Math.abs(g.adaptive_curve_delta) >= 0.1)
      banners.push(`<div class="banner banner-eco">📈 Adaptive Kurve: ${g.adaptive_curve_delta > 0 ? "+" : ""}${g.adaptive_curve_delta.toFixed(1)}°C Anpassung</div>`);
    return banners.join("");
  }

  _tileClass(room) {
    if (room.window_open)      return "window-open";
    if (room.room_mode === "off") return "mode-off";
    if (room.demand > 5)       return "heating";
    return "satisfied";
  }

  _tileIcons(room) {
    const parts = [];
    if (room.window_open)             parts.push("🪟");
    if (room.mold && room.mold.risk)  parts.push("💧");
    if (room.boost_remaining > 0)     parts.push("⚡");
    if (room.room_presence_active === false) parts.push("🚶");
    if (room.ventilation && room.ventilation.level === "urgent")      parts.push("🪟❗");
    else if (room.ventilation && room.ventilation.level === "recommended") parts.push("🌬️");
    if (room.co2_ppm != null) parts.push(`CO₂`);
    return parts.join(" ");
  }

  _ventilationSubline(room) {
    const v = room.ventilation;
    if (!v || v.level === "none") {
      // Show CO2 only if sensor present but no advice needed
      if (room.co2_ppm != null) return `<div style="font-size:10px;color:var(--secondary-text-color);margin-top:3px">CO₂ ${room.co2_ppm} ppm ✓</div>`;
      return "";
    }
    const colors = { urgent: "#b71c1c", recommended: "#e65100", possible: "#1565c0" };
    const fg = colors[v.level] || "#555";
    const co2 = room.co2_ppm != null ? ` · CO₂ ${room.co2_ppm} ppm` : "";
    const reason = v.reasons && v.reasons.length ? v.reasons[0] : v.level;
    return `<div style="font-size:10px;color:${fg};margin-top:3px">🌬️ ${reason}${co2}</div>`;
  }

  _renderRoomTile(room) {
    const cur   = room.current_temp !== null ? room.current_temp.toFixed(1) + "°" : "—";
    const tgt   = room.target_temp  !== null ? room.target_temp.toFixed(1)  + "°" : "—";
    const bw    = Math.min(100, room.demand || 0);
    const bc    = this._demandColor(room.demand);
    const icons = this._tileIcons(room);

    if (this._config.compact) {
      return `
        <div class="room-tile compact-tile ${this._tileClass(room)}">
          <div class="compact-row">
            <div class="compact-name">${room.name}</div>
            <div class="compact-icons">${icons}</div>
            <div class="compact-cur">${cur}</div>
            <div class="compact-tgt">${tgt}</div>
          </div>
        </div>
      `;
    }

    const chips = ["auto", "comfort", "eco", "sleep", "away", "off"].map(m => {
      const active = room.room_mode === m ? " active" : "";
      return `<button class="tile-chip${active}" data-mode="${m}" data-room-id="${room.room_id}">${_DB_MODE_ICONS[m]}</button>`;
    });
    const boostChip = room.boost_remaining > 0
      ? `<button class="tile-chip boost active" data-action="boost-cancel" data-room-id="${room.room_id}">⚡${room.boost_remaining}m</button>`
      : `<button class="tile-chip boost" data-action="boost" data-room-id="${room.room_id}">⚡</button>`;

    return `
      <div class="room-tile ${this._tileClass(room)}">
        <div class="tile-top">
          <div class="tile-name">${room.name}</div>
          <div class="tile-icons">${icons}</div>
        </div>
        <div class="tile-temps">
          <span class="tile-cur">${cur}</span>
          <span class="tile-arr">→</span>
          <span class="tile-tgt">${tgt}</span>
        </div>
        <div class="tile-demand-bg">
          <div class="tile-demand-bar" style="width:${bw}%;background:${bc}"></div>
        </div>
        ${this._ventilationSubline(room)}
        <div class="tile-chips">${chips.join("")}${boostChip}</div>
      </div>
    `;
  }

  _renderEnergy(g) {
    if (!this._config.show_energy) return "";
    // Only show if there's actual data
    if (!g.energy_today_kwh && !g.heating_runtime_today) return "";
    return `
      <div class="energy-row">
        <div class="energy-stat">⚡ Heute: <b>${g.energy_today_kwh.toFixed(2)} kWh</b></div>
        <div class="energy-stat">📅 Gestern: <b>${(g.energy_yesterday_kwh || 0).toFixed(2)} kWh</b></div>
        <div class="energy-stat">⏱ Laufzeit: <b>${g.heating_runtime_today.toFixed(0)} min</b></div>
      </div>
    `;
  }

  _render() {
    const shadow = this.shadowRoot;
    if (!shadow.querySelector("style")) {
      const style = document.createElement("style");
      style.textContent = _DB_STYLES;
      shadow.appendChild(style);
    }

    let card = shadow.querySelector("ha-card");
    if (!card) {
      card = document.createElement("ha-card");
      shadow.appendChild(card);
    }

    if (!this._hass) { card.innerHTML = ""; return; }

    const g     = this._getGlobal();
    const rooms = this._getRooms();

    const roomTilesHtml = rooms.length
      ? rooms.map(r => this._renderRoomTile(r)).join("")
      : `<div class="no-rooms">Keine IHC-Zimmer gefunden. Bitte Zimmer im IHC-Panel anlegen.</div>`;

    card.innerHTML = `
      ${this._renderHeader(g)}
      ${this._renderStatusStrip(g)}
      ${this._renderWeather(g.weather_forecast)}
      ${this._renderBanners(g)}
      <div class="rooms-grid ${this._config.compact ? "compact" : ""}">${roomTilesHtml}</div>
      ${this._renderEnergy(g)}
    `;

    // System mode select
    const sysSel = card.querySelector("#sys-mode-sel");
    if (sysSel) {
      sysSel.addEventListener("change", () => {
        this._hass.callService(_IHC_DB_DOMAIN, "set_system_mode", { mode: sysSel.value });
      });
    }

    // Room mode chips
    card.querySelectorAll("[data-mode]").forEach(btn => {
      btn.addEventListener("click", () => {
        this._hass.callService(_IHC_DB_DOMAIN, "set_room_mode", {
          room_id: btn.dataset.roomId, mode: btn.dataset.mode,
        });
      });
    });
    card.querySelectorAll("[data-action='boost']").forEach(btn => {
      btn.addEventListener("click", () => {
        this._hass.callService(_IHC_DB_DOMAIN, "boost_room", {
          room_id: btn.dataset.roomId, minutes: 30,
        });
      });
    });
    card.querySelectorAll("[data-action='boost-cancel']").forEach(btn => {
      btn.addEventListener("click", () => {
        this._hass.callService(_IHC_DB_DOMAIN, "set_room_mode", {
          room_id: btn.dataset.roomId, mode: "auto",
        });
      });
    });
  }

  static getStubConfig() {
    return { title: "Heizungssteuerung" };
  }

  getCardSize() {
    return 6;
  }
}

customElements.define("ihc-dashboard-card", IhcDashboardCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "ihc-dashboard-card",
  name: "IHC Dashboard",
  description: "Gesamtübersicht aller IHC-Zimmer mit Systemsteuerung, Wetter und Energie.",
  preview: false,
  documentationURL: "https://github.com/Jedrimos/intelligent-heatingcontrol",
});
