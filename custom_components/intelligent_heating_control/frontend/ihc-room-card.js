/**
 * IHC Room Card – Lovelace custom card for a single room
 *
 * Config:
 *   type: custom:ihc-room-card
 *   room_id: wohnzimmer        # required – must match room_id attribute on climate entity
 *   show_sparkline: true       # optional (default true)
 *   show_schedule: true        # optional (default true)
 */

const _IHC_ROOM_DOMAIN = "intelligent_heating_control";

const _MODE_LABELS = {
  auto: "Auto", comfort: "Komfort", eco: "Eco",
  sleep: "Schlafen", away: "Abwesend", off: "Aus", manual: "Manuell",
};
const _MODE_ICONS = {
  auto: "⚙️", comfort: "☀️", eco: "🌿", sleep: "🌙",
  away: "🚶", off: "⛔", manual: "✏️",
};

const _ROOM_CARD_STYLES = `
  :host { display: block; }
  * { box-sizing: border-box; }

  ha-card {
    padding: 16px;
    position: relative;
    overflow: hidden;
  }
  ha-card::before {
    content: "";
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: var(--divider-color, #e0e0e0);
    transition: background 0.3s;
  }
  ha-card.heating::before { background: var(--error-color, #e53935); }
  ha-card.satisfied::before { background: var(--success-color, #43a047); }
  ha-card.window-open::before { background: #1e88e5; }
  ha-card.off::before { background: #9e9e9e; }

  .room-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 12px;
  }
  .room-name {
    font-size: 14px; font-weight: 700;
    color: var(--primary-text-color);
    display: flex; align-items: center; gap: 6px;
  }
  .badges { display: flex; gap: 4px; flex-wrap: wrap; }
  .badge {
    display: inline-flex; align-items: center; gap: 3px;
    padding: 2px 7px; border-radius: 10px;
    font-size: 11px; font-weight: 600;
  }
  .badge-heat   { background: #fce4ec; color: #c62828; }
  .badge-ok     { background: #e8f5e9; color: #2e7d32; }
  .badge-off    { background: #f5f5f5; color: #757575; }
  .badge-window { background: #e3f2fd; color: #1565c0; }
  .badge-eco    { background: #e0f2f1; color: #00695c; }
  .badge-away   { background: #fff3e0; color: #e65100; }
  .badge-boost  { background: #fff3e0; color: #e65100; }
  .badge-mold   { background: #ede7f6; color: #4527a0; }

  .temp-row {
    display: flex; align-items: center; gap: 0;
    margin-bottom: 10px;
  }
  .temp-block { display: flex; flex-direction: column; align-items: center; flex: 1; }
  .temp-main  { font-size: 32px; font-weight: 300; color: var(--primary-text-color); line-height: 1.1; }
  .temp-label { font-size: 10px; color: var(--secondary-text-color); text-transform: uppercase; letter-spacing: 0.5px; }
  .temp-sep   { font-size: 20px; color: var(--divider-color, #e0e0e0); padding: 0 8px; }
  .temp-target { font-size: 26px; font-weight: 600; color: var(--primary-color); line-height: 1.1; }

  .sparkline-row { margin-bottom: 8px; opacity: 0.7; }

  .demand-bg {
    background: var(--secondary-background-color, #f5f5f5);
    border-radius: 6px; height: 6px; margin: 4px 0; overflow: hidden;
  }
  .demand-bar { height: 100%; border-radius: 6px; transition: width 0.6s ease, background 0.4s; }
  .demand-label { font-size: 11px; color: var(--secondary-text-color); margin-bottom: 10px; }

  .mode-chips { display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 8px; }
  .chip {
    padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: 600;
    border: 1.5px solid var(--divider-color); cursor: pointer;
    transition: all 0.15s; color: var(--secondary-text-color);
    background: transparent; display: inline-flex; align-items: center; gap: 3px;
  }
  .chip:hover    { border-color: var(--primary-color); color: var(--primary-color); background: var(--secondary-background-color); }
  .chip.active   { background: var(--primary-color); color: white; border-color: var(--primary-color); }
  .chip.boost    { border-color: #fb8c00; color: #fb8c00; }
  .chip.boost:hover, .chip.boost.active { background: #fb8c00; color: white; border-color: #fb8c00; }

  .schedule-row {
    font-size: 11px; color: var(--secondary-text-color);
    display: flex; align-items: center; gap: 5px;
    padding-top: 6px; border-top: 1px solid var(--divider-color, #e0e0e0);
  }
  .unavailable {
    font-size: 14px; color: var(--secondary-text-color);
    padding: 8px 0;
  }
`;

class IhcRoomCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._hass = null;
  }

  setConfig(config) {
    if (!config.room_id) throw new Error("IHC Room Card: room_id is required");
    this._config = {
      room_id: config.room_id,
      show_sparkline: config.show_sparkline !== false,
      show_schedule: config.show_schedule !== false,
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

  _findRoom() {
    if (!this._hass) return null;
    const roomId = this._config.room_id;

    // Find climate entity with matching room_id attribute
    for (const [eid, state] of Object.entries(this._hass.states)) {
      if (!eid.startsWith("climate.ihc_")) continue;
      if ((state.attributes.room_id || "") === roomId) {
        const baseName = eid.replace("climate.ihc_", "");
        const demandSensor = this._st(`sensor.ihc_${baseName}_anforderung`);
        const runtimeSensor = this._st(`sensor.ihc_${baseName}_laufzeit_heute`);
        const a = state.attributes;
        const da = demandSensor ? (demandSensor.attributes || {}) : {};

        return {
          entity_id: eid,
          room_id: roomId,
          name: (a.friendly_name || eid).replace(/^IHC\s*/i, ""),
          current_temp: da.current_temp ?? a.current_temperature ?? null,
          target_temp: a.temperature ?? null,
          hvac_action: a.hvac_action || "",
          room_mode: da.room_mode || a.room_mode || "auto",
          demand: demandSensor ? (parseFloat(demandSensor.state) || 0) : (a.demand || 0),
          window_open: da.window_open ?? a.window_open ?? false,
          source: da.source || a.source || "",
          boost_remaining: a.boost_remaining || 0,
          night_setback: da.night_setback ?? a.night_setback ?? 0,
          temp_history: da.temp_history || [],
          avg_warmup_minutes: da.avg_warmup_minutes ?? null,
          room_presence_active: da.room_presence_active ?? null,
          mold: da.mold ?? false,
          ventilation: da.ventilation ?? null,
          co2_ppm: da.co2_ppm ?? null,
          next_period: a.next_period || null,
          runtime_today_minutes: runtimeSensor ? (parseFloat(runtimeSensor.state) || 0) : 0,
          comfort_temp: a.comfort_temp ?? 21,
          eco_temp_eff: a.eco_temp_eff ?? null,
          sleep_temp_eff: a.sleep_temp_eff ?? null,
          away_temp_eff: a.away_temp_eff ?? null,
        };
      }
    }
    return null;
  }

  _demandColor(d) {
    if (d >= 80) return "#e53935";
    if (d >= 60) return "#fb8c00";
    if (d >= 30) return "#fdd835";
    return "#43a047";
  }

  _sparkline(history, w = 100, h = 22) {
    if (!history || history.length < 2) return "";
    const vals = history.map(p => (typeof p === "object" ? p.v : p)).filter(v => v != null);
    if (vals.length < 2) return "";
    const min = Math.min(...vals), max = Math.max(...vals);
    const range = max - min || 1;
    const pts = vals.map((v, i) => {
      const x = (i / (vals.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block;width:100%">
      <polyline points="${pts}" fill="none" stroke="var(--primary-color)" stroke-width="1.5"
        stroke-linejoin="round" stroke-linecap="round"/>
    </svg>`;
  }

  _fmt(v, unit = "") {
    return v !== null && v !== undefined && !isNaN(v) ? `${v}${unit}` : "—";
  }

  _cardClass(room) {
    if (room.window_open) return "window-open";
    if (room.room_mode === "off") return "off";
    if (room.demand > 5) return "heating";
    return "satisfied";
  }

  _render() {
    if (!this._config.room_id) return;

    const shadow = this.shadowRoot;
    if (!shadow.querySelector("style")) {
      const style = document.createElement("style");
      style.textContent = _ROOM_CARD_STYLES;
      shadow.appendChild(style);
    }

    let card = shadow.querySelector("ha-card");
    if (!card) {
      card = document.createElement("ha-card");
      shadow.appendChild(card);
    }

    if (!this._hass) { card.innerHTML = ""; return; }

    const room = this._findRoom();
    if (!room) {
      card.className = "";
      card.innerHTML = `<div class="unavailable">Zimmer "${this._config.room_id}" nicht gefunden</div>`;
      return;
    }

    card.className = this._cardClass(room);

    // Status badges
    const badgeParts = [];
    if (room.window_open) badgeParts.push(`<span class="badge badge-window">🪟 Offen</span>`);
    if (room.mold && room.mold.risk) badgeParts.push(`<span class="badge badge-mold">💧 Schimmel ${room.mold.humidity}%</span>`);
    if (room.boost_remaining > 0) badgeParts.push(`<span class="badge badge-boost">⚡ Boost ${room.boost_remaining}min</span>`);
    if (room.night_setback > 0) badgeParts.push(`<span class="badge badge-eco">🌙 Absenkung</span>`);
    if (room.room_presence_active === false) badgeParts.push(`<span class="badge badge-away">🚶 Abwesend</span>`);
    // Ventilation advice – only shown when sensor data is available
    if (room.ventilation && room.ventilation.level !== "none") {
      const vIcons = { urgent: "🪟❗", recommended: "🪟", possible: "🌬️" };
      const vCls   = { urgent: "badge-heat", recommended: "badge-boost", possible: "badge-eco" };
      const co2str = room.co2_ppm != null ? ` · ${room.co2_ppm}ppm` : "";
      badgeParts.push(`<span class="badge ${vCls[room.ventilation.level] || "badge-eco"}">${vIcons[room.ventilation.level] || "🌬️"} Lüften${co2str}</span>`);
    }
    if (room.co2_ppm != null && !(room.ventilation && room.ventilation.level !== "none")) {
      // CO2 only badge when no full ventilation advice (sensor present but level=none)
      badgeParts.push(`<span class="badge badge-ok">CO₂ ${room.co2_ppm} ppm</span>`);
    }
    const heatingBadge = room.demand > 5
      ? `<span class="badge badge-heat">🔥 ${room.demand.toFixed(0)}%</span>`
      : `<span class="badge badge-ok">✓</span>`;

    // Temperature display
    const curTemp = room.current_temp !== null ? room.current_temp.toFixed(1) : "—";
    const tgtTemp = room.target_temp !== null ? room.target_temp.toFixed(1) : "—";

    // Demand bar
    const barColor = this._demandColor(room.demand);
    const barWidth = Math.min(100, room.demand || 0);

    // Mode chips
    const modes = ["auto", "comfort", "eco", "sleep", "away", "off"];
    const currentMode = room.room_mode || "auto";
    const modeChips = modes.map(m => {
      const active = currentMode === m ? " active" : "";
      return `<button class="chip${active}" data-mode="${m}" data-room-id="${room.room_id}">${_MODE_ICONS[m]} ${_MODE_LABELS[m]}</button>`;
    }).join("");
    const boostChip = room.boost_remaining > 0
      ? `<button class="chip boost active" data-action="boost-cancel" data-room-id="${room.room_id}">⚡ ${room.boost_remaining}min</button>`
      : `<button class="chip boost" data-action="boost" data-room-id="${room.room_id}">⚡ Boost</button>`;

    // Sparkline
    const sparkHtml = (this._config.show_sparkline && room.temp_history && room.temp_history.length >= 2)
      ? `<div class="sparkline-row">${this._sparkline(room.temp_history)}</div>` : "";

    // Schedule hint
    let schedHtml = "";
    if (this._config.show_schedule && room.next_period) {
      const np = room.next_period;
      schedHtml = `<div class="schedule-row">📅 Nächste Schaltzeit: <b>${np.mode || ""}</b> um ${np.time || ""}</div>`;
    }

    card.innerHTML = `
      <div class="room-header">
        <div class="room-name">🚪 ${room.name}</div>
        <div class="badges">${heatingBadge}${badgeParts.join("")}</div>
      </div>

      <div class="temp-row">
        <div class="temp-block">
          <div class="temp-main">${curTemp}°</div>
          <div class="temp-label">Ist</div>
        </div>
        <div class="temp-sep">→</div>
        <div class="temp-block">
          <div class="temp-target">${tgtTemp}°</div>
          <div class="temp-label">Soll</div>
        </div>
        <div style="flex:1;text-align:right;font-size:11px;color:var(--secondary-text-color)">
          <div>${room.runtime_today_minutes.toFixed(0)} min</div>
          <div>heute</div>
        </div>
      </div>

      ${sparkHtml}

      <div class="demand-bg">
        <div class="demand-bar" style="width:${barWidth}%;background:${barColor}"></div>
      </div>
      <div class="demand-label">Ventil ${this._fmt(room.demand, "%")} · ${room.source || "—"}</div>

      <div class="mode-chips">${modeChips}${boostChip}</div>

      ${schedHtml}
    `;

    // Event listeners for chips
    card.querySelectorAll("[data-mode]").forEach(btn => {
      btn.addEventListener("click", () => {
        const roomId = btn.dataset.roomId;
        const mode = btn.dataset.mode;
        this._hass.callService(_IHC_ROOM_DOMAIN, "set_room_mode", { room_id: roomId, mode });
      });
    });
    card.querySelectorAll("[data-action='boost']").forEach(btn => {
      btn.addEventListener("click", () => {
        this._hass.callService(_IHC_ROOM_DOMAIN, "boost_room", { room_id: btn.dataset.roomId, minutes: 30 });
      });
    });
    card.querySelectorAll("[data-action='boost-cancel']").forEach(btn => {
      btn.addEventListener("click", () => {
        this._hass.callService(_IHC_ROOM_DOMAIN, "set_room_mode", { room_id: btn.dataset.roomId, mode: "auto" });
      });
    });
  }

  // Lovelace card editor support (static config info)
  static getConfigElement() {
    return document.createElement("ihc-room-card-editor");
  }

  static getStubConfig() {
    return { room_id: "beispiel_zimmer" };
  }

  getCardSize() {
    return 4;
  }
}

// Minimal card editor so the visual editor shows a config form
class IhcRoomCardEditor extends HTMLElement {
  setConfig(config) { this._config = config; }

  set hass(hass) {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
      this.shadowRoot.innerHTML = `
        <style>
          label { display:block; margin-bottom:4px; font-size:12px; font-weight:600; color:var(--secondary-text-color); }
          input { width:100%; padding:6px 8px; border:1px solid var(--divider-color); border-radius:6px;
                  background:var(--card-background-color); color:var(--primary-text-color); font-size:14px; }
          .row { margin-bottom:12px; }
        </style>
        <div class="row">
          <label>room_id</label>
          <input id="room-id" placeholder="z.B. wohnzimmer">
        </div>
      `;
      this.shadowRoot.querySelector("#room-id").addEventListener("change", e => {
        this.dispatchEvent(new CustomEvent("config-changed", {
          detail: { config: { ...this._config, room_id: e.target.value } },
          bubbles: true, composed: true,
        }));
      });
    }
    if (this._config) {
      this.shadowRoot.querySelector("#room-id").value = this._config.room_id || "";
    }
  }
}

customElements.define("ihc-room-card", IhcRoomCard);
customElements.define("ihc-room-card-editor", IhcRoomCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "ihc-room-card",
  name: "IHC Zimmer-Karte",
  description: "Zeigt Status, Temperatur und Steuerung für ein einzelnes IHC-Zimmer.",
  preview: false,
  documentationURL: "https://github.com/Jedrimos/intelligent-heatingcontrol",
});
