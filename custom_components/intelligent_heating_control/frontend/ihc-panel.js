/**
 * Intelligent Heating Control – Frontend Panel v3
 *
 * Tabs: Übersicht | Zimmer | Einstellungen | Zeitpläne | Heizkurve | Kalender
 *
 * Fixes vs v1:
 *  - Modal bleibt offen (set hass() zerstört es nicht mehr)
 *  - room_id wird korrekt an Services übergeben
 *  - Einstellungen und Übersicht sind getrennte Tabs
 *  - Abwesenheits-Einstellungen im Einstellungen-Tab
 *  - Mehrere Fenster & Thermostate pro Zimmer (window_sensors / valve_entities)
 *  - Boost-Button direkt in Zimmer-Karten
 *  - Echte Werte in Einstellungs-Formularen
 */

const DOMAIN = "intelligent_heating_control";
const DAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

const MODE_LABELS = {
  auto: "Auto", comfort: "Komfort", eco: "Eco",
  sleep: "Schlafen", away: "Abwesend", off: "Aus", manual: "Manuell"
};
const MODE_ICONS = {
  auto: "⚙️", comfort: "☀️", eco: "🌿", sleep: "🌙",
  away: "🚶", off: "⛔", manual: "✏️"
};
const SYSTEM_MODE_LABELS = {
  auto: "Automatisch", heat: "Heizen", cool: "Kühlen",
  off: "Aus", away: "Abwesend", vacation: "Urlaub", guest: "Gäste-Modus"
};

// HA weather condition → German label + emoji icon
const WEATHER_CONDITIONS = {
  "clear-night":      { label: "Klare Nacht",           icon: "🌙" },
  "cloudy":           { label: "Bewölkt",                icon: "☁️" },
  "exceptional":      { label: "Außergewöhnlich",        icon: "⚠️" },
  "fog":              { label: "Nebel",                  icon: "🌫️" },
  "hail":             { label: "Hagel",                  icon: "🌨️" },
  "lightning":        { label: "Gewitter",               icon: "⛈️" },
  "lightning-rainy":  { label: "Gewitter m. Regen",      icon: "⛈️" },
  "partlycloudy":     { label: "Teils bewölkt",          icon: "⛅" },
  "pouring":          { label: "Starkregen",             icon: "🌧️" },
  "rainy":            { label: "Regen",                  icon: "🌦️" },
  "snowy":            { label: "Schnee",                 icon: "❄️" },
  "snowy-rainy":      { label: "Schneeregen",            icon: "🌨️" },
  "sunny":            { label: "Sonnig",                 icon: "☀️" },
  "windy":            { label: "Windig",                 icon: "🌬️" },
  "windy-variant":    { label: "Stürmisch",              icon: "💨" },
};

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const STYLES = `
  :host { font-family: var(--paper-font-body1_-_font-family, Roboto, sans-serif); display: block; }
  * { box-sizing: border-box; }

  .panel { max-width: 1100px; margin: 0 auto; padding: 16px; }

  /* Header */
  .header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
  .header h1 { margin: 0; font-size: 22px; font-weight: 700; color: var(--primary-text-color); flex: 1; }
  .header-icon { font-size: 28px; }

  /* Tabs */
  .tabs { display: flex; border-bottom: 2px solid var(--divider-color, #e0e0e0); margin-bottom: 24px;
          gap: 0; overflow-x: auto; scrollbar-width: none; }
  .tabs::-webkit-scrollbar { display: none; }
  .tab { padding: 10px 18px; cursor: pointer; color: var(--secondary-text-color);
         border-bottom: 3px solid transparent; margin-bottom: -2px; font-size: 13px; font-weight: 600;
         transition: all 0.2s; white-space: nowrap; user-select: none; }
  .tab.active { color: var(--primary-color); border-bottom-color: var(--primary-color); }
  .tab:hover:not(.active) { color: var(--primary-text-color); background: var(--secondary-background-color); }

  /* Cards */
  .card { background: var(--card-background-color, #fff); border-radius: 12px; padding: 20px;
          margin-bottom: 16px; box-shadow: 0 1px 6px rgba(0,0,0,.08); }
  .card-title { font-size: 15px; font-weight: 700; color: var(--primary-text-color);
                margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
  .card-subtitle { font-size: 12px; color: var(--secondary-text-color); margin-bottom: 16px; }

  /* Overview hero */
  .overview-hero { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 16px; }
  @media (max-width: 700px) { .overview-hero { grid-template-columns: 1fr; } }
  .hero-card { background: var(--card-background-color,#fff); border-radius: 12px; padding: 16px 18px;
               box-shadow: 0 1px 6px rgba(0,0,0,.08); display: flex; flex-direction: column; gap: 4px; }
  .hero-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.7px;
                color: var(--secondary-text-color); margin-bottom: 2px; }
  .hero-value { font-size: 26px; font-weight: 700; color: var(--primary-text-color); line-height: 1.1; }
  .hero-value.heating { color: var(--error-color, #e53935); }
  .hero-value.ok { color: var(--success-color, #43a047); }
  .hero-sub { font-size: 12px; color: var(--secondary-text-color); }

  /* Status bar */
  .status-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
                 gap: 8px; margin-bottom: 16px; }
  .status-item { background: var(--card-background-color, #fff); border-radius: 10px; padding: 12px 10px;
                 box-shadow: 0 1px 4px rgba(0,0,0,.08); text-align: center; }
  .status-label { font-size: 10px; color: var(--secondary-text-color); text-transform: uppercase;
                  letter-spacing: 0.6px; margin-bottom: 4px; }
  .status-value { font-size: 18px; font-weight: 700; color: var(--primary-text-color); }
  .status-value.on { color: var(--error-color, #e53935); }
  .status-value.ok { color: var(--success-color, #43a047); }
  .status-value.warn { color: #fb8c00; }

  /* Room cards – Übersicht */
  .rooms-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(270px, 1fr)); gap: 14px; }
  .room-card {
    background: var(--card-background-color, #fff);
    border-radius: 12px; padding: 16px;
    box-shadow: 0 1px 6px rgba(0,0,0,.08);
    border-top: 3px solid var(--divider-color, #e0e0e0);
    transition: border-color 0.3s, box-shadow 0.3s;
  }
  .room-card:hover { box-shadow: 0 3px 12px rgba(0,0,0,.14); }
  .room-card.heating { border-top-color: var(--error-color, #e53935); }
  .room-card.satisfied { border-top-color: var(--success-color, #43a047); }
  .room-card.window-open { border-top-color: #1e88e5; }
  .room-card.off { border-top-color: #9e9e9e; }

  .room-name { font-size: 14px; font-weight: 700; margin-bottom: 10px;
               display: flex; align-items: center; justify-content: space-between; }

  /* Temp display */
  .temp-display { display: flex; align-items: center; gap: 0; margin-bottom: 10px; }
  .temp-block { display: flex; flex-direction: column; align-items: center; flex: 1; }
  .temp-main { font-size: 30px; font-weight: 300; color: var(--primary-text-color); line-height: 1.1; }
  .temp-label { font-size: 10px; color: var(--secondary-text-color); text-transform: uppercase;
                letter-spacing: 0.5px; }
  .temp-sep { font-size: 18px; color: var(--divider-color, #e0e0e0); padding: 0 6px; }
  .temp-target-block { display: flex; flex-direction: column; align-items: center; flex: 1; }
  .temp-target-val { font-size: 24px; font-weight: 600; color: var(--primary-color); line-height: 1.1; }
  /* keep for compat */
  .temp-current { font-size: 28px; font-weight: 300; color: var(--primary-text-color); }
  .temp-arrow { font-size: 16px; color: var(--secondary-text-color); }
  .temp-target { font-size: 18px; font-weight: 600; color: var(--primary-color); }
  .temp-unit { font-size: 13px; color: var(--secondary-text-color); }

  /* Demand bar */
  .demand-bar-bg { background: var(--secondary-background-color, #f5f5f5); border-radius: 6px;
                   height: 6px; margin: 8px 0 4px; overflow: hidden; }
  .demand-bar { height: 100%; border-radius: 6px; transition: width 0.6s ease, background 0.4s; }
  .demand-label { font-size: 11px; color: var(--secondary-text-color); margin-bottom: 10px; }

  /* Quick-mode chips */
  .mode-chips { display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 8px; }
  .mode-chip { padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: 600;
               border: 1.5px solid var(--divider-color); cursor: pointer;
               transition: all 0.15s; color: var(--secondary-text-color);
               background: transparent; display: inline-flex; align-items: center; gap: 3px; }
  .mode-chip:hover { border-color: var(--primary-color); color: var(--primary-color); background: var(--secondary-background-color); }
  .mode-chip.active { background: var(--primary-color); color: white; border-color: var(--primary-color); }
  .mode-chip.boost { border-color: #fb8c00; color: #fb8c00; }
  .mode-chip.boost:hover, .mode-chip.boost.active { background: #fb8c00; color: white; }

  /* Badge */
  .badge { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px;
           border-radius: 10px; font-size: 11px; font-weight: 600; }
  .badge-heat { background: #fce4ec; color: #c62828; }
  .badge-ok   { background: #e8f5e9; color: #2e7d32; }
  .badge-off  { background: #f5f5f5; color: #757575; }
  .badge-window { background: #e3f2fd; color: #1565c0; }
  .badge-eco  { background: #e0f2f1; color: #00695c; }
  .badge-away { background: #fff3e0; color: #e65100; }
  .badge-boost { background: #fff3e0; color: #e65100; }
  .badge-summer { background: #fffde7; color: #f57f17; }

  /* Summer banner */
  .summer-banner { background: linear-gradient(135deg, #fff9c4, #fffde7);
                   border: 1px solid #f9a825; border-radius: 8px; padding: 10px 14px;
                   margin-bottom: 16px; font-size: 13px; display: flex; align-items: center; gap: 8px; }

  /* Room list – Zimmer tab */
  .room-list-item { display: flex; align-items: center; gap: 12px; padding: 14px;
                    border-bottom: 1px solid var(--divider-color, #e0e0e0); }
  .room-list-item:last-child { border-bottom: none; }
  .room-list-left { flex: 1; min-width: 0; }
  .room-list-name { font-weight: 600; font-size: 14px; }
  .room-list-meta { font-size: 12px; color: var(--secondary-text-color); margin-top: 2px; }
  .room-list-actions { display: flex; gap: 6px; flex-shrink: 0; }

  /* Form rows */
  .form-group { margin-bottom: 16px; }
  .form-label { font-size: 13px; font-weight: 600; color: var(--primary-text-color);
                margin-bottom: 4px; display: block; }
  .form-hint  { font-size: 11px; color: var(--secondary-text-color); margin-top: 3px; }
  .form-row   { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
  .form-input { flex: 1; min-width: 100px; padding: 8px 10px; border-radius: 6px;
                border: 1.5px solid var(--divider-color, #e0e0e0);
                background: var(--card-background-color, #fff);
                color: var(--primary-text-color); font-size: 14px;
                transition: border-color 0.2s; }
  .form-input:focus { outline: none; border-color: var(--primary-color); }
  .form-input.full { width: 100%; flex: none; }
  .form-select { flex: 1; min-width: 120px; padding: 8px 10px; border-radius: 6px;
                 border: 1.5px solid var(--divider-color, #e0e0e0);
                 background: var(--card-background-color, #fff);
                 color: var(--primary-text-color); font-size: 14px; }
  .form-select:focus { outline: none; border-color: var(--primary-color); }

  /* Entity list (multi-sensors) */
  .entity-list { display: flex; flex-direction: column; gap: 6px; }
  .entity-row { display: flex; gap: 6px; align-items: center; }
  .entity-row .form-input { flex: 1; }

  /* Buttons */
  .btn { display: inline-flex; align-items: center; gap: 5px; padding: 8px 14px;
         border-radius: 6px; border: none; cursor: pointer; font-size: 13px; font-weight: 600;
         transition: all 0.15s; }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-primary   { background: var(--primary-color); color: #fff; }
  .btn-primary:hover:not(:disabled) { filter: brightness(1.1); }
  .btn-danger    { background: var(--error-color, #e53935); color: #fff; }
  .btn-danger:hover:not(:disabled)  { filter: brightness(1.1); }
  .btn-secondary { background: var(--secondary-background-color, #f5f5f5);
                   color: var(--primary-text-color); border: 1.5px solid var(--divider-color, #e0e0e0); }
  .btn-secondary:hover:not(:disabled) { background: var(--divider-color, #e0e0e0); }
  .btn-icon { padding: 6px 8px; font-size: 16px; }
  .btn-row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 16px; }

  /* Settings sections */
  .settings-section { margin-bottom: 24px; }
  .settings-section-title { font-size: 11px; font-weight: 700; text-transform: uppercase;
                             letter-spacing: 0.8px; color: var(--secondary-text-color);
                             margin-bottom: 10px; }
  .settings-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
  .settings-item { display: flex; flex-direction: column; gap: 4px; }
  .settings-item label { font-size: 12px; color: var(--secondary-text-color); }

  /* Schedule */
  .day-chips { display: flex; gap: 5px; flex-wrap: wrap; }
  .day-chip { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center;
              justify-content: center; cursor: pointer; font-size: 11px; font-weight: 700;
              border: 2px solid var(--divider-color, #e0e0e0); transition: all 0.15s;
              color: var(--secondary-text-color); }
  .day-chip.selected { background: var(--primary-color); color: #fff; border-color: var(--primary-color); }
  .period-row { display: grid; grid-template-columns: 90px 90px 70px 60px 36px;
                gap: 6px; align-items: center; margin-bottom: 6px; }
  .period-header { display: grid; grid-template-columns: 90px 90px 70px 60px 36px;
                   gap: 6px; font-size: 11px; font-weight: 600; color: var(--secondary-text-color);
                   margin-bottom: 6px; }
  .sched-block { border: 1px solid var(--divider-color, #e0e0e0); border-radius: 8px;
                 padding: 14px; margin-bottom: 10px; }

  /* Heating curve table */
  .curve-table { width: 100%; border-collapse: collapse; }
  .curve-table th, .curve-table td { padding: 8px 10px; text-align: left;
                                     border-bottom: 1px solid var(--divider-color, #e0e0e0); }
  .curve-table th { font-size: 11px; text-transform: uppercase; color: var(--secondary-text-color); }
  .curve-table input { width: 80px; padding: 5px 8px; border-radius: 5px;
                       border: 1.5px solid var(--divider-color, #e0e0e0);
                       background: var(--card-background-color, #fff);
                       color: var(--primary-text-color); font-size: 13px; }
  .curve-table input:focus { outline: none; border-color: var(--primary-color); }

  /* Modal */
  .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.45);
                    backdrop-filter: blur(4px); z-index: 999;
                    display: flex; align-items: center; justify-content: center; padding: 16px; }
  .modal { background: var(--card-background-color, #fff); border-radius: 14px;
           padding: 24px; max-width: 560px; width: 100%; max-height: 90vh;
           overflow-y: auto; position: relative;
           box-shadow: 0 8px 40px rgba(0,0,0,.25);
           animation: modal-in 0.2s ease; }
  @keyframes modal-in { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  .modal-title { font-size: 18px; font-weight: 700; margin-bottom: 20px;
                 padding-right: 32px; color: var(--primary-text-color); }
  .modal-close { position: absolute; top: 18px; right: 18px; cursor: pointer;
                 font-size: 18px; line-height: 1; background: var(--secondary-background-color, #f5f5f5);
                 border: none; border-radius: 50%; width: 28px; height: 28px;
                 display: flex; align-items: center; justify-content: center;
                 color: var(--secondary-text-color); }
  .modal-close:hover { background: var(--divider-color, #e0e0e0); }
  .modal-section { border-top: 1px solid var(--divider-color, #e0e0e0); margin-top: 16px; padding-top: 16px; }
  .modal-section-title { font-size: 12px; font-weight: 700; text-transform: uppercase;
                          letter-spacing: 0.6px; color: var(--secondary-text-color); margin-bottom: 10px; }

  /* Toast */
  .toast { position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%);
           background: #212121; color: #fff; padding: 11px 22px; border-radius: 6px;
           z-index: 2000; font-size: 13px; box-shadow: 0 4px 16px rgba(0,0,0,0.3);
           animation: toast-in 0.2s ease; pointer-events: none; white-space: nowrap; }
  @keyframes toast-in { from { opacity: 0; transform: translateX(-50%) translateY(8px); }
                        to   { opacity: 1; transform: translateX(-50%) translateY(0); } }

  /* Info box */
  .info-box { background: var(--info-color, #e3f2fd); border-left: 3px solid var(--primary-color);
              padding: 10px 14px; border-radius: 6px; font-size: 13px; margin-bottom: 16px;
              line-height: 1.5; }

  /* Spinner */
  .spinner { display: inline-block; width: 18px; height: 18px;
             border: 2.5px solid var(--divider-color, #e0e0e0);
             border-top-color: var(--primary-color); border-radius: 50%;
             animation: spin 0.7s linear infinite; vertical-align: middle; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* Divider */
  hr.divider { border: none; border-top: 1px solid var(--divider-color, #e0e0e0); margin: 16px 0; }

  /* Responsive – mobile optimised (Roadmap 1.5) */
  @media (max-width: 600px) {
    .panel { padding: 10px; }
    .tab { padding: 10px 10px; font-size: 12px; min-width: 60px; text-align: center; }
    .rooms-grid { grid-template-columns: 1fr; }
    .status-grid { grid-template-columns: repeat(2, 1fr); }
    .settings-grid { grid-template-columns: 1fr; }
    .period-row, .period-header { grid-template-columns: 80px 80px 65px 55px 30px; gap: 4px; }
    .btn { min-height: 44px; }  /* larger touch targets */
    .form-input, .form-select { min-height: 44px; font-size: 16px; } /* prevent iOS zoom */
    .mode-chip { min-width: 32px; min-height: 32px; line-height: 32px; }
    .card { padding: 14px 12px; }
    .header h1 { font-size: 18px; }
  }
  @media (max-width: 400px) {
    .tabs { gap: 0; }
    .tab { padding: 8px 6px; font-size: 11px; }
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// Panel Component
// ─────────────────────────────────────────────────────────────────────────────
class IHCPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._hass = null;
    this._activeTab = "overview";
    this._initialized = false;
    this._modalOpen = false;
    this._scheduleRoom = null;
    this._toastTimeout = null;
    this._refreshTimer = null;
    this._userInteracting = false;   // true while pointer/touch is held down
    // Local schedule data for editing (not yet saved)
    this._editingSchedules = {};
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  set hass(hass) {
    this._hass = hass;
    if (!this._initialized) {
      this._render();
      return;
    }
    // NEVER re-render tabs on HA state pushes.
    // HA can fire state updates many times per second which would replace DOM
    // elements mid-click and prevent any button from working.
    // The _startAutoRefresh timer handles overview updates every 5 seconds.
    // All other tabs are only rendered when the user switches to them.
  }

  connectedCallback() {
    if (!this._initialized) this._render();
    this._startAutoRefresh();
  }

  disconnectedCallback() {
    if (this._refreshTimer) clearInterval(this._refreshTimer);
  }

  _startAutoRefresh() {
    if (this._refreshTimer) clearInterval(this._refreshTimer);
    // Track pointer interactions so we never rebuild DOM during a click
    const sr = this.shadowRoot;
    if (!this._interactionTracked) {
      this._interactionTracked = true;
      sr.addEventListener("pointerdown", () => { this._userInteracting = true; }, true);
      sr.addEventListener("pointerup",   () => { this._userInteracting = false; }, true);
      sr.addEventListener("pointercancel", () => { this._userInteracting = false; }, true);
    }
    this._refreshTimer = setInterval(() => {
      if (!this._hass || this._modalOpen || this._userInteracting) return;
      if (this._activeTab === "overview") this._renderTabContent();
    }, 5000);
  }

  // ── One-time structure render ──────────────────────────────────────────────

  _render() {
    const shadow = this.shadowRoot;
    if (!shadow.querySelector("style")) {
      const style = document.createElement("style");
      style.textContent = STYLES;
      shadow.appendChild(style);
    }
    if (!shadow.querySelector(".panel")) {
      const div = document.createElement("div");
      div.className = "panel";
      shadow.appendChild(div);
    }

    const panel = shadow.querySelector(".panel");

    // Build permanent structure (only once)
    panel.innerHTML = `
      <div class="header">
        <button class="btn btn-secondary" id="btn-back" style="padding:6px 12px;font-size:12px">← Dashboard</button>
        <span class="header-icon">🌡️</span>
        <h1>Intelligent Heating Control</h1>
      </div>
      <div class="tabs">
        <div class="tab" data-tab="overview">📊 Übersicht</div>
        <div class="tab" data-tab="rooms">🚪 Zimmer</div>
        <div class="tab" data-tab="settings">⚙️ Einstellungen</div>
        <div class="tab" data-tab="schedules">📅 Zeitpläne</div>
        <div class="tab" data-tab="curve">📈 Heizkurve</div>
        <div class="tab" data-tab="calendar">🗓️ Kalender</div>
      </div>
      <div id="tab-content"></div>
    `;

    // Back button
    panel.querySelector("#btn-back").addEventListener("click", () => {
      if (this._hass && this._hass.navigate) this._hass.navigate("/");
      else history.back();
    });

    // Tab switching – NO full re-render, only update active class + content
    panel.querySelectorAll(".tab").forEach(tab => {
      tab.addEventListener("click", () => {
        this._activeTab = tab.dataset.tab;
        this._updateActiveTab();
        this._renderTabContent();
      });
    });

    // Modal and toast containers live directly on shadow root (survive panel re-renders)
    if (!shadow.querySelector("#modal-root")) {
      const modalRoot = document.createElement("div");
      modalRoot.id = "modal-root";
      shadow.appendChild(modalRoot);
    }
    if (!shadow.querySelector("#toast-root")) {
      const toastRoot = document.createElement("div");
      toastRoot.id = "toast-root";
      shadow.appendChild(toastRoot);
    }

    this._initialized = true;
    this._updateActiveTab();
    this._renderTabContent();
  }

  _updateActiveTab() {
    this.shadowRoot.querySelectorAll(".tab").forEach(t =>
      t.classList.toggle("active", t.dataset.tab === this._activeTab)
    );
  }

  _renderTabContent() {
    const content = this.shadowRoot.querySelector("#tab-content");
    if (!content) return;
    switch (this._activeTab) {
      case "overview":   this._renderOverview(content); break;
      case "rooms":      this._renderRooms(content); break;
      case "settings":   this._renderSettings(content); break;
      case "schedules":  this._renderSchedules(content); break;
      case "curve":      this._renderCurve(content); break;
      case "calendar":   this._renderCalendar(content); break;
    }
  }

  // ── Data Helpers ───────────────────────────────────────────────────────────

  _st(entityId) {
    return this._hass ? this._hass.states[entityId] : null;
  }

  _getRoomData() {
    if (!this._hass) return {};
    const rooms = {};
    Object.entries(this._hass.states).forEach(([entityId, state]) => {
      if (!entityId.startsWith("climate.ihc_")) return;
      const name = (state.attributes.friendly_name || entityId).replace(/^IHC\s*/i, "");
      rooms[entityId] = {
        entity_id: entityId,
        room_id: state.attributes.room_id || "",
        name,
        current_temp: state.attributes.current_temperature ?? null,
        target_temp: state.attributes.temperature ?? null,
        hvac_action: state.attributes.hvac_action || "",
        preset: state.attributes.preset_mode || "auto",
        demand: state.attributes.demand || 0,
        window_open: state.attributes.window_open || false,
        room_mode: state.attributes.room_mode || "auto",
        schedule_active: state.attributes.schedule_active || false,
        source: state.attributes.source || "",
        boost_remaining: state.attributes.boost_remaining || 0,
        night_setback: state.attributes.night_setback || 0,
        runtime_today_minutes: 0,
        temp_history: [],
        avg_warmup_minutes: null,
        // Room config (from climate entity extra_state_attributes)
        temp_sensor: state.attributes.temp_sensor || "",
        valve_entities: state.attributes.valve_entities || [],
        window_sensors: state.attributes.window_sensors || [],
        comfort_temp: state.attributes.comfort_temp ?? 21,
        away_temp_room: state.attributes.away_temp_room ?? 16,
        eco_offset: state.attributes.eco_offset ?? 3,
        sleep_offset: state.attributes.sleep_offset ?? 4,
        away_offset: state.attributes.away_offset ?? 6,
        eco_max_temp: state.attributes.eco_max_temp ?? 21,
        sleep_max_temp: state.attributes.sleep_max_temp ?? 19,
        away_max_temp: state.attributes.away_max_temp ?? 18,
        ha_schedule_off_mode: state.attributes.ha_schedule_off_mode ?? "eco",
        comfort_temp_eff: state.attributes.comfort_temp_eff ?? null,
        eco_temp_eff: state.attributes.eco_temp_eff ?? null,
        sleep_temp_eff: state.attributes.sleep_temp_eff ?? null,
        away_temp_eff: state.attributes.away_temp_eff ?? null,
        room_offset: state.attributes.room_offset ?? 0,
        deadband: state.attributes.deadband ?? 0.5,
        weight: state.attributes.weight ?? 1.0,
        schedules: state.attributes.schedules || [],
        ha_schedules: state.attributes.ha_schedules || [],
        next_period: state.attributes.next_period || null,
        anomaly: state.attributes.anomaly || null,
      };
    });
    // Enrich from demand sensors
    Object.entries(this._hass.states).forEach(([entityId, state]) => {
      if (!entityId.startsWith("sensor.ihc_") || !entityId.endsWith("_anforderung")) return;
      const baseName = entityId.replace("sensor.ihc_", "").replace("_anforderung", "");
      const climateId = `climate.ihc_${baseName}`;
      if (rooms[climateId]) {
        rooms[climateId].demand = parseFloat(state.state) || 0;
        if (state.attributes.current_temp !== undefined)
          rooms[climateId].current_temp = state.attributes.current_temp;
        if (state.attributes.room_mode !== undefined)
          rooms[climateId].room_mode = state.attributes.room_mode;
        if (state.attributes.window_open !== undefined)
          rooms[climateId].window_open = state.attributes.window_open;
        if (state.attributes.source !== undefined)
          rooms[climateId].source = state.attributes.source;
        if (state.attributes.night_setback !== undefined)
          rooms[climateId].night_setback = state.attributes.night_setback;
        if (state.attributes.temp_history !== undefined)
          rooms[climateId].temp_history = state.attributes.temp_history;
        if (state.attributes.avg_warmup_minutes !== undefined)
          rooms[climateId].avg_warmup_minutes = state.attributes.avg_warmup_minutes;
        if (state.attributes.room_presence_active !== undefined)
          rooms[climateId].room_presence_active = state.attributes.room_presence_active;
        if (state.attributes.mold !== undefined)
          rooms[climateId].mold = state.attributes.mold;
      }
    });
    // Enrich runtime from runtime sensors
    Object.entries(this._hass.states).forEach(([entityId, state]) => {
      if (!entityId.startsWith("sensor.ihc_") || !entityId.endsWith("_laufzeit_heute")) return;
      const baseName = entityId.replace("sensor.ihc_", "").replace("_laufzeit_heute", "");
      const climateId = `climate.ihc_${baseName}`;
      if (rooms[climateId]) {
        rooms[climateId].runtime_today_minutes = parseFloat(state.state) || 0;
      }
    });
    return rooms;
  }

  _getGlobal() {
    const dem  = this._st("sensor.ihc_gesamtanforderung");
    const sw   = this._st("switch.ihc_heizung_aktiv");
    const sel  = this._st("select.ihc_systemmodus");
    const ct   = this._st("sensor.ihc_heizkurven_zieltemperatur");
    const ot   = this._st("sensor.ihc_aussentemperatur");
    const rt   = this._st("sensor.ihc_heizlaufzeit_heute");
    const egy  = this._st("sensor.ihc_energie_heute");
    const a    = dem ? (dem.attributes || {}) : {};
    const ea   = egy ? (egy.attributes || {}) : {};
    return {
      total_demand:              dem ? parseFloat(dem.state) || 0 : null,
      heating_active:            sw  ? sw.state === "on" : (a.heating_active || false),
      no_switch:                 !sw,
      system_mode:               sel ? sel.state : "—",
      curve_target:              ct  ? parseFloat(ct.state) : null,
      outdoor_temp:              ot  ? parseFloat(ot.state) : null,
      rooms_demanding:           a.rooms_demanding || 0,
      summer_mode:               a.summer_mode || false,
      night_setback_active:      a.night_setback_active || false,
      presence_away_active:      a.presence_away_active || false,
      heating_runtime_today:     rt  ? parseFloat(rt.state) || 0 : (a.heating_runtime_today || 0),
      heating_runtime_yesterday: a.heating_runtime_yesterday || 0,
      energy_today_kwh:          egy ? parseFloat(egy.state) || 0 : 0,
      energy_yesterday_kwh:      ea.energy_yesterday_kwh || 0,
      solar_boost:               ea.solar_boost || 0,
      solar_power:               ea.solar_power != null ? parseFloat(ea.solar_power) : null,
      energy_price:              ea.energy_price != null ? parseFloat(ea.energy_price) : null,
      energy_price_eco_active:   ea.energy_price_eco_active || false,
      flow_temp:                 ea.flow_temp != null ? parseFloat(ea.flow_temp) : null,
      vacation_auto_active:      a.vacation_auto_active || false,
      return_preheat_active:     a.return_preheat_active || false,
      efficiency_score:          a.efficiency_score != null ? parseFloat(a.efficiency_score) : null,
      controller_mode:           a.controller_mode || "switch",
      guest_mode_active:         a.guest_mode_active || false,
      guest_remaining_minutes:   a.guest_remaining_minutes != null ? a.guest_remaining_minutes : null,
      weather_forecast:          a.weather_forecast || null,
      cold_boost:                ea.cold_boost != null ? parseFloat(ea.cold_boost) : 0,
    };
  }

  _fmt(v, unit = "") {
    return v !== null && v !== undefined && !isNaN(v) ? `${v}${unit}` : "—";
  }

  _demandColor(d) {
    if (d >= 80) return "#e53935";
    if (d >= 60) return "#fb8c00";
    if (d >= 30) return "#fdd835";
    return "#43a047";
  }

  // Roadmap 1.1 – mini SVG sparkline for temperature history
  _sparkline(history, w = 80, h = 24) {
    if (!history || history.length < 2) return "";
    const vals = history.map(p => p.v);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = max - min || 1;
    const pts = vals.map((v, i) => {
      const x = (i / (vals.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block;overflow:visible">
      <polyline points="${pts}" fill="none" stroke="var(--primary-color)" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
    </svg>`;
  }

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
      "frost_protection": "❄ Frostschutz",
      "guest_mode": "🎉 Gäste",
      "room_presence_eco": "🚶 Eco (leer)",   // legacy – kept for old stored states
      "room_presence_away": "🚶 Abwesend",
      "ha_schedule": "📅 HA Zeitplan",
      "ha_schedule_eco": "📅 HA Zeitplan (Eco)",
      "ha_schedule_sleep": "📅 HA Zeitplan (Schlaf)",
      "room_presence_away": "🚶 Abwesend",
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
      let cls = "room-card";
      if (isWindow) cls += " window-open";
      else if (isOff) cls += " off";
      else if (isHeating) cls += " heating";
      else if (isSat) cls += " satisfied";

      const statusBadge = (() => {
        if (isWindow) return `<span class="badge badge-window">🪟 Fenster offen</span>`;
        if (isOff)    return `<span class="badge badge-off">⛔ Aus</span>`;
        if (room.room_mode === "eco")   return `<span class="badge badge-eco">🌿 Eco</span>`;
        if (room.room_mode === "away")  return `<span class="badge badge-away">🚶 Abwesend</span>`;
        if (room.room_mode === "sleep") return `<span class="badge badge-eco">🌙 Schlafen</span>`;
        if (room.boost_remaining > 0)  return `<span class="badge badge-boost">⚡ Boost ${room.boost_remaining}min</span>`;
        if (isHeating) return `<span class="badge badge-heat">🔥 Heizt</span>`;
        if (isSat)     return `<span class="badge badge-ok">✓ OK</span>`;
        return "";
      })();

      const src = srcMap[room.source] || room.source;

      // Calculate temp difference for visual cue
      const tempDiff = (room.current_temp !== null && room.target_temp !== null)
        ? room.target_temp - room.current_temp : null;
      const tempDiffStr = tempDiff !== null
        ? (tempDiff > 0.2 ? `<span style="color:var(--error-color,#e53935);font-size:11px">↑ ${tempDiff.toFixed(1)}°</span>`
           : tempDiff < -0.2 ? `<span style="color:var(--success-color,#43a047);font-size:11px">↓ ${Math.abs(tempDiff).toFixed(1)}°</span>`
           : `<span style="color:var(--success-color,#43a047);font-size:11px">≈</span>`)
        : "";

      const modeChips = ["auto","comfort","eco","sleep","away","off"].map(m => {
        const isActive = room.room_mode === m;
        return `<span class="mode-chip ${isActive ? "active" : ""}"
          data-room-id="${room.room_id}" data-mode="${m}"
          title="${MODE_LABELS[m]}">${MODE_ICONS[m]} <span style="font-size:10px">${MODE_LABELS[m]}</span></span>`;
      }).join("");

      const anomalyBanner = room.anomaly === "sensor_stuck"
        ? `<div style="font-size:10px;color:#c62828;background:#fce4ec;border-radius:6px;padding:3px 7px;margin-bottom:6px">⚠️ Sensor liefert konstanten Wert – bitte prüfen</div>`
        : room.anomaly === "temp_drop"
        ? `<div style="font-size:10px;color:#e65100;background:#fff3e0;border-radius:6px;padding:3px 7px;margin-bottom:6px">⚠️ Starker Temperaturabfall erkannt</div>`
        : "";

      const moldBanner = room.mold && room.mold.risk
        ? `<div style="font-size:10px;color:#1a237e;background:#e8eaf6;border-radius:6px;padding:3px 7px;margin-bottom:6px">💧 Schimmelrisiko – Feuchte ${room.mold.humidity}%${room.mold.dew_point != null ? `, Taupunkt ${room.mold.dew_point}°C` : ""}</div>`
        : "";

      // Override banner: shown when system mode silently ignores the room mode
      const overrideBanner = systemOverrides
        ? `<div style="font-size:10px;color:#e65100;background:#fff3e0;border-radius:6px;padding:3px 8px;margin-bottom:6px;display:flex;align-items:center;gap:4px">${overrideLabel} <span style="opacity:.7">– Zimmermodus übersteuert</span></div>`
        : "";

      return `
        <div class="${cls}">
          ${overrideBanner}${anomalyBanner}${moldBanner}
          <div class="room-name">
            <span>${room.name}</span>
            ${statusBadge}
          </div>
          <div class="temp-display">
            <div class="temp-block">
              <div class="temp-main">${room.current_temp !== null ? room.current_temp : "—"}<span style="font-size:14px;font-weight:400">°C</span></div>
              <div class="temp-label">Ist</div>
            </div>
            <div class="temp-sep">|</div>
            <div class="temp-target-block">
              <div class="temp-target-val">${room.target_temp !== null ? room.target_temp : "—"}<span style="font-size:13px;font-weight:400">°C</span></div>
              <div class="temp-label" style="display:flex;align-items:center;gap:4px">Soll ${tempDiffStr}</div>
            </div>
          </div>
          <div class="demand-bar-bg">
            <div class="demand-bar" style="width:${room.demand}%;background:${this._demandColor(room.demand)}"></div>
          </div>
          <div class="demand-label">${room.demand} % · ${src}${room.night_setback > 0 ? ` · 🌙-${room.night_setback}°` : ""}${room.room_presence_active === false ? ` · 🚶 niemand da` : ""}</div>
          <div class="mode-chips">${modeChips}
            <span class="mode-chip boost" data-room-id="${room.room_id}" data-action="boost"
              title="60min Boost">⚡ <span style="font-size:10px">Boost</span></span>
          </div>
          ${room.next_period && !room.schedule_active ? `<div style="font-size:10px;color:var(--secondary-text-color);margin-top:4px">📅 Nächster Zeitplan: ${room.next_period.start}–${room.next_period.end} · ${room.next_period.temperature}°C</div>` : ""}
          <div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px">
            ${room.runtime_today_minutes > 0 ? `<span style="font-size:10px;color:var(--secondary-text-color)">⏱ ${room.runtime_today_minutes} min heute</span>` : "<span></span>"}
            ${room.avg_warmup_minutes ? `<span style="font-size:10px;color:var(--secondary-text-color)" title="Ø Aufheizzeit">🌡️ Ø ${room.avg_warmup_minutes} min</span>` : ""}
            ${this._sparkline(room.temp_history)}
          </div>
        </div>`;
    }).join("");

    // Build system banners
    const banners = [
      g.summer_mode           ? `<div class="summer-banner">☀️ <strong>Sommerautomatik aktiv</strong> – Heizung gesperrt</div>` : "",
      g.night_setback_active  ? `<div class="summer-banner" style="background:linear-gradient(135deg,#e3f2fd,#bbdefb);border-color:#1565c0;">🌙 <strong>Nachtabsenkung aktiv</strong> – Temperaturen reduziert</div>` : "",
      g.presence_away_active  ? `<div class="summer-banner" style="background:linear-gradient(135deg,#fff3e0,#ffe0b2);border-color:#e65100;">🚶 <strong>Anwesenheits-Abwesend</strong> – niemand zuhause</div>` : "",
      g.solar_boost > 0       ? `<div class="summer-banner" style="background:linear-gradient(135deg,#fffde7,#fff9c4);border-color:#f9a825;">🌞 <strong>Solarüberschuss</strong> – ${g.solar_power != null ? g.solar_power + " W · " : ""}+${g.solar_boost}°C angehoben</div>` : "",
      g.cold_boost > 0        ? `<div class="summer-banner" style="background:linear-gradient(135deg,#e8eaf6,#c5cae9);border-color:#1a237e;">🥶 <strong>Kälteboost aktiv</strong> – alle Zimmer +${g.cold_boost}°C angehoben</div>` : "",
      g.energy_price_eco_active ? `<div class="summer-banner" style="background:linear-gradient(135deg,#fce4ec,#f8bbd0);border-color:#c62828;">💶 <strong>Hoher Strompreis</strong> – ${g.energy_price != null ? g.energy_price.toFixed(3) + " €/kWh · " : ""}Eco-Modus aktiv</div>` : "",
      g.vacation_auto_active  ? `<div class="summer-banner" style="background:linear-gradient(135deg,#e8f5e9,#c8e6c9);border-color:#2e7d32;">✈️ <strong>Urlaubs-Modus aktiv</strong></div>` : "",
      g.return_preheat_active ? `<div class="summer-banner" style="background:linear-gradient(135deg,#e3f2fd,#bbdefb);border-color:#1565c0;">🏠 <strong>Rückkehr-Vorheizung aktiv</strong> – Haus wird aufgeheizt</div>` : "",
      g.guest_mode_active     ? `<div class="summer-banner" style="background:linear-gradient(135deg,#fce4ec,#f8bbd0);border-color:#880e4f;">🎉 <strong>Gäste-Modus aktiv</strong>${g.guest_remaining_minutes != null ? ` – noch ${g.guest_remaining_minutes} min` : ""}</div>` : "",
      g.weather_forecast && g.weather_forecast.cold_warning ? `<div class="summer-banner" style="background:linear-gradient(135deg,#e8eaf6,#c5cae9);border-color:#1a237e;">🥶 <strong>Kältewarnung</strong> – Tiefsttemperatur heute: <strong>${g.weather_forecast.forecast_today_min}°C</strong>${g.weather_forecast.forecast_today_max != null ? ` / max. ${g.weather_forecast.forecast_today_max}°C` : ""}</div>` : "",
    ].filter(Boolean).join("");

    // Hero section
    const heatingState = g.heating_active ? "🔥 Heizt" : g.no_switch ? "— kein Schalter" : "✓ Bereit";
    const heatingCls   = g.heating_active ? "heating" : "ok";
    const demandNum    = g.total_demand != null ? `${g.total_demand} %` : "—";
    const demandCls    = (g.total_demand || 0) > 0 ? "warn" : "ok";

    // System-mode badge color
    const modeBadgeStyle = {
      auto:     "background:#e8f5e9;color:#2e7d32",
      heat:     "background:#fce4ec;color:#c62828",
      cool:     "background:#e3f2fd;color:#1565c0",
      away:     "background:#fff3e0;color:#e65100",
      vacation: "background:#e8f5e9;color:#2e7d32",
      off:      "background:#f5f5f5;color:#757575",
      guest:    "background:#fce4ec;color:#880e4f",
    }[g.system_mode] || "background:#f5f5f5;color:#616161";

    const modeDisplay = SYSTEM_MODE_LABELS[g.system_mode] || g.system_mode;
    const modeOptions = Object.entries(SYSTEM_MODE_LABELS)
      .map(([k, v]) => `<option value="${k}" ${g.system_mode === k ? "selected" : ""}>${v}</option>`)
      .join("");

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
          <div class="hero-sub">⏱ ${g.heating_runtime_today} min · ${g.energy_today_kwh} kWh</div>
        </div>
        <div class="hero-card" style="justify-content:space-between">
          <div class="hero-label">Systemmodus</div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <span style="font-size:18px;font-weight:700;padding:4px 12px;border-radius:20px;${modeBadgeStyle}">${modeDisplay}</span>
          </div>
          <div style="display:flex;gap:6px;align-items:center">
            <select id="hero-system-mode" style="flex:1;padding:6px 8px;border-radius:6px;border:1.5px solid var(--divider-color);background:var(--card-background-color);color:var(--primary-text-color);font-size:13px">
              ${modeOptions}
            </select>
            <button id="hero-set-mode" style="padding:6px 10px;border-radius:6px;border:none;background:var(--primary-color);color:#fff;font-size:13px;font-weight:600;cursor:pointer">Setzen</button>
          </div>
        </div>
      </div>`;

    // Secondary stats grid (compact)
    const statsGrid = `
      <div class="status-grid">
        <div class="status-item">
          <div class="status-label">Außentemp.</div>
          <div class="status-value">${this._fmt(g.outdoor_temp, " °C")}</div>
        </div>
        <div class="status-item">
          <div class="status-label">Kurven-Ziel</div>
          <div class="status-value">${this._fmt(g.curve_target, " °C")}</div>
        </div>
        ${g.flow_temp != null ? `<div class="status-item">
          <div class="status-label">Vorlauf</div>
          <div class="status-value">${g.flow_temp} °C</div>
        </div>` : ""}
        ${g.efficiency_score != null ? `<div class="status-item" title="Verhältnis Soll-Heizzeit zu Ist-Laufzeit">
          <div class="status-label">Effizienz</div>
          <div class="status-value ${g.efficiency_score >= 80 ? "ok" : g.efficiency_score >= 50 ? "warn" : "on"}">${g.efficiency_score} %</div>
        </div>` : ""}
        ${g.heating_runtime_yesterday > 0 ? `<div class="status-item" title="Gestriger Verbrauch">
          <div class="status-label">Gestern</div>
          <div class="status-value ${g.energy_today_kwh > g.energy_yesterday_kwh ? "on" : "ok"}" style="font-size:15px">${g.energy_yesterday_kwh} kWh</div>
        </div>` : ""}
        ${g.weather_forecast ? (() => {
          const wc = WEATHER_CONDITIONS[g.weather_forecast.condition] || { label: g.weather_forecast.condition || "—", icon: "🌡️" };
          const range = g.weather_forecast.forecast_today_min != null
            ? `${g.weather_forecast.forecast_today_min}–${g.weather_forecast.forecast_today_max}°C`
            : "";
          return `<div class="status-item" title="Wettervorhersage">
            <div class="status-label">Wetter heute</div>
            <div class="status-value" style="font-size:18px">${wc.icon}</div>
            <div style="font-size:11px;color:var(--secondary-text-color);margin-top:2px">${wc.label}</div>
            ${range ? `<div style="font-size:11px;font-weight:600;color:var(--primary-text-color)">${range}</div>` : ""}
          </div>`;
        })() : ""}
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

    // Hero system-mode button
    const heroModeBtn = content.querySelector("#hero-set-mode");
    if (heroModeBtn) {
      heroModeBtn.addEventListener("click", () => {
        const mode = content.querySelector("#hero-system-mode").value;
        this._callService("set_system_mode", { mode });
        this._toast(`✓ Systemmodus: ${SYSTEM_MODE_LABELS[mode] || mode}`);
      });
    }

    // Mode chip clicks
    content.querySelectorAll(".mode-chip[data-room-id]").forEach(chip => {
      chip.addEventListener("click", () => {
        const roomId = chip.dataset.roomId;
        if (!roomId) { this._toast("Fehler: room_id nicht gefunden"); return; }
        if (chip.dataset.action === "boost") {
          this._callService("boost_room", { id: roomId, duration_minutes: 60 });
          this._toast("⚡ Boost aktiviert (60 min)");
        } else {
          this._callService("set_room_mode", { id: roomId, mode: chip.dataset.mode });
        }
      });
    });
  }

  // ── Zimmer Tab ─────────────────────────────────────────────────────────────

  _renderRooms(content) {
    const rooms = this._getRoomData();

    const list = Object.values(rooms).map(room => `
      <div class="room-list-item">
        <div class="room-list-left">
          <div class="room-list-name">${room.name}</div>
          <div class="room-list-meta">
            ${MODE_ICONS[room.room_mode] || "⚙️"} ${MODE_LABELS[room.room_mode] || room.room_mode}
            · ${room.current_temp !== null ? room.current_temp + " °C" : "kein Sensor"}
            ${room.window_open ? " · 🪟 Fenster" : ""}
          </div>
        </div>
        <div class="room-list-actions">
          <button class="btn btn-secondary" data-action="edit" data-id="${room.entity_id}">Bearbeiten</button>
          <button class="btn btn-danger btn-icon" data-action="delete"
            data-id="${room.room_id}" data-name="${room.name}" title="Zimmer löschen">🗑</button>
        </div>
      </div>`).join("");

    content.innerHTML = `
      <div class="card">
        <div class="card-title">🚪 Zimmer verwalten</div>
        <div id="room-list">
          ${list || '<div style="color:var(--secondary-text-color);padding:8px">Noch keine Zimmer.</div>'}
        </div>
        <div class="btn-row">
          <button class="btn btn-primary" id="add-room-btn">+ Zimmer hinzufügen</button>
        </div>
      </div>`;

    content.querySelector("#add-room-btn").addEventListener("click", () => this._showAddRoomModal());

    content.querySelectorAll("[data-action='edit']").forEach(btn => {
      btn.addEventListener("click", () => this._showEditRoomModal(btn.dataset.id));
    });

    content.querySelectorAll("[data-action='delete']").forEach(btn => {
      btn.addEventListener("click", () => {
        const name = btn.dataset.name;
        const id   = btn.dataset.id;
        if (!id) { this._toast("Fehler: Zimmer-ID fehlt"); return; }
        this._showConfirmModal(
          `Zimmer „${name}" wirklich löschen?`,
          "Diese Aktion entfernt alle Entitäten dieses Zimmers.",
          async () => {
            await this._callService("remove_room", { id });
            this._closeModal();
            this._toast(`✓ Zimmer „${name}" gelöscht`);
          }
        );
      });
    });
  }

  // ── Einstellungen Tab ──────────────────────────────────────────────────────

  _renderSettings(content) {
    const systemSel = this._st("select.ihc_systemmodus");
    const curMode   = systemSel ? systemSel.state : "auto";
    const dem = this._st("sensor.ihc_gesamtanforderung") || { attributes: {} };
    const a   = dem.attributes;
    const g   = this._getGlobal();

    // Note: settings tab is never auto-refreshed by set hass() so values won't reset while typing.
    content.innerHTML = `
      <!-- System-Hardware -->
      <div class="card">
        <div class="card-title">🔧 System-Hardware</div>
        <div class="info-box">
          Grundlegende Hardware-Konfiguration. Alle Felder sind optional –
          leer lassen wenn nicht vorhanden.
        </div>
        <div class="settings-grid">
          <div class="settings-item">
            <label>Außentemperatur-Sensor</label>
            <input type="text" class="form-input" id="outdoor-sensor"
              placeholder="sensor.aussensensor"
              value="${a.outdoor_temp_sensor ?? ''}" list="outdoor-sensor-list" autocomplete="off">
            <datalist id="outdoor-sensor-list">${this._entityOptions(["sensor"])}</datalist>
            <span class="form-hint">Wird für Heizkurve und Sommerautomatik benötigt</span>
          </div>
          <div class="settings-item">
            <label>Heizungsschalter aktivieren</label>
            <select class="form-select" id="enable-heating-switch">
              <option value="false" ${!a.heating_switch ? "selected" : ""}>Deaktiviert</option>
              <option value="true" ${a.heating_switch ? "selected" : ""}>Aktiviert</option>
            </select>
            <span class="form-hint">Aktiviert Heizschalter-Steuerung (z.B. Kesselrelais)</span>
          </div>
          <div class="settings-item" id="heating-switch-item" style="${a.heating_switch ? "" : "opacity:0.5"}">
            <label>Heizungsschalter <em style="font-weight:400">(optional)</em></label>
            <input type="text" class="form-input" id="heating-switch"
              placeholder="switch.heizung (nur bei Heizschalter aktiviert)"
              value="${a.heating_switch ?? ''}" list="heating-switch-list" autocomplete="off">
            <datalist id="heating-switch-list">${this._entityOptions(["switch", "input_boolean"])}</datalist>
            <span class="form-hint">Schaltet physisch den Heizkessel ein/aus</span>
          </div>
          <div class="settings-item">
            <label>Wettervorhersage-Entität</label>
            <input type="text" class="form-input" id="weather-entity"
              placeholder="weather.home (leer = deaktiviert)"
              value="${a.weather_entity ?? ''}" list="weather-entity-list" autocomplete="off">
            <datalist id="weather-entity-list">${this._entityOptions(["weather"])}</datalist>
            <span class="form-hint">Zeigt Wettervorhersage und Kältewarnung</span>
          </div>
          <div class="settings-item">
            <label>Kälteschwelle (°C)</label>
            <input type="number" class="form-input" id="weather-cold-threshold"
              step="0.5" value="${a.weather_cold_threshold ?? 0}">
            <span class="form-hint">Kältewarnung ab dieser Tiefsttemperatur (Standard: 0°C)</span>
          </div>
          <div class="settings-item">
            <label>Kälteboost (°C)</label>
            <input type="number" class="form-input" id="weather-cold-boost"
              step="0.5" min="0" max="5" value="${a.weather_cold_boost ?? 0}">
            <span class="form-hint">Zieltemperatur aller Zimmer anheben wenn Kältewarnung aktiv (0 = aus)</span>
          </div>
          <div class="settings-item">
            <label>Kühlung aktivieren</label>
            <select class="form-select" id="enable-cooling">
              <option value="false" ${!a.enable_cooling ? "selected" : ""}>Deaktiviert</option>
              <option value="true" ${a.enable_cooling ? "selected" : ""}>Aktiviert</option>
            </select>
            <span class="form-hint">Aktiviert Kühlfunktion und Kühlschalter-Steuerung</span>
          </div>
          <div class="settings-item" id="cooling-switch-item" style="${a.enable_cooling ? "" : "opacity:0.5"}">
            <label>Kühlschalter <em style="font-weight:400">(optional)</em></label>
            <input type="text" class="form-input" id="cooling-switch"
              placeholder="switch.klimaanlage (nur bei Kühlung aktiv)"
              value="${a.cooling_switch ?? ''}" list="cooling-switch-list" autocomplete="off">
            <datalist id="cooling-switch-list">${this._entityOptions(["switch", "input_boolean"])}</datalist>
            <span class="form-hint">Schaltet Kühlaggregat/Klimaanlage</span>
          </div>
          <div class="settings-item">
            <label>Steuerungsmodus</label>
            <select class="form-select" id="controller-mode">
              <option value="switch" ${(a.controller_mode || "switch") === "switch" ? "selected" : ""}>🔌 Heizungsschalter</option>
              <option value="trv" ${(a.controller_mode || "switch") === "trv" ? "selected" : ""}>🌡️ TRV-Modus</option>
            </select>
            <span class="form-hint">TRV: bei zu wenig Anforderung werden alle Thermostate auf Frostschutz geschlossen</span>
          </div>
        </div>
        <div class="btn-row">
          <button class="btn btn-primary" id="save-hardware-settings">💾 Hardware speichern</button>
        </div>
      </div>

      <!-- System mode -->
      <div class="card">
        <div class="card-title">🏠 Betriebsmodus</div>
        ${g.presence_away_active ? `<div class="info-box">🚶 Automatisch auf <strong>Abwesend</strong> gesetzt (niemand zuhause). Kehrt automatisch zurück wenn jemand heimkommt.</div>` : ""}
        <div class="form-group">
          <label class="form-label">System-Modus manuell setzen</label>
          <div class="form-row">
            <select class="form-select" id="system-mode-select">
              ${Object.entries(SYSTEM_MODE_LABELS)
                .filter(([k]) => k !== "cool" || a.enable_cooling)
                .map(([k, v]) =>
                  `<option value="${k}" ${curMode === k || curMode === v ? "selected" : ""}>${v}</option>`
                ).join("")}
            </select>
            <button class="btn btn-primary" id="set-system-mode">Setzen</button>
          </div>
          ${!a.enable_cooling ? `<span class="form-hint">„Kühlen"-Modus erst verfügbar wenn Kühlung unter System-Hardware aktiviert</span>` : ""}
        </div>
      </div>

      <!-- Temperaturen & Sommerautomatik -->
      <div class="card">
        <div class="card-title">🌡️ Temperaturen &amp; Sommerautomatik</div>
        <div class="settings-grid">
          <div class="settings-item">
            <label>Abwesend-Temperatur (°C)</label>
            <input type="number" class="form-input" id="away-temp"
              min="5" max="25" step="0.5" value="${a.away_temp ?? 16}">
            <span class="form-hint">Alle Zimmer bei System „Abwesend"</span>
          </div>
          <div class="settings-item">
            <label>Urlaubs-Temperatur (°C)</label>
            <input type="number" class="form-input" id="vacation-temp"
              min="5" max="20" step="0.5" value="${a.vacation_temp ?? 14}">
            <span class="form-hint">Nur Frostschutz, alle Zimmer</span>
          </div>
          <div class="settings-item">
            <label>Frostschutz-Temperatur (°C)</label>
            <input type="number" class="form-input" id="frost-temp"
              min="4" max="15" step="0.5" value="${a.frost_protection_temp ?? 7}">
            <span class="form-hint">Niemals unter diesen Wert (auch bei OFF)</span>
          </div>
        </div>
        <div class="settings-grid" style="margin-top:12px">
          <div class="settings-item">
            <label>Sommerautomatik</label>
            <select class="form-select" id="summer-enabled">
              <option value="false" ${!a.summer_mode_enabled ? "selected" : ""}>Deaktiviert</option>
              <option value="true" ${a.summer_mode_enabled ? "selected" : ""}>Aktiviert</option>
            </select>
          </div>
          <div class="settings-item">
            <label>Sommer-Schwelle (°C)</label>
            <input type="number" class="form-input" id="summer-threshold"
              min="10" max="30" step="0.5" value="${a.summer_threshold ?? 18}">
            <span class="form-hint">Heizung gesperrt ab dieser Außentemp.</span>
          </div>
        </div>
        <div class="btn-row">
          <button class="btn btn-primary" id="save-temp-settings">💾 Temperaturen speichern</button>
        </div>
      </div>

      <!-- Nachtabsenkung & Vorheizen -->
      <div class="card">
        <div class="card-title">🌙 Nachtabsenkung &amp; Vorheizen</div>
        ${g.night_setback_active ? `<div class="info-box" style="background:#e3f2fd;border-color:#1565c0;">🌙 Nachtabsenkung ist gerade <strong>aktiv</strong></div>` : ""}
        <div class="settings-grid">
          <div class="settings-item">
            <label>Nachtabsenkung</label>
            <select class="form-select" id="night-setback-enabled">
              <option value="false" ${!a.night_setback_enabled ? "selected" : ""}>Deaktiviert</option>
              <option value="true" ${a.night_setback_enabled ? "selected" : ""}>Aktiviert</option>
            </select>
            <span class="form-hint">Temperaturen nachts automatisch absenken</span>
          </div>
          <div class="settings-item">
            <label>Absenkung (°C)</label>
            <input type="number" class="form-input" id="night-setback-offset"
              min="0.5" max="6" step="0.5" value="${a.night_setback_offset ?? 2}">
            <span class="form-hint">Um wieviel °C nachts abgesenkt wird</span>
          </div>
          <div class="settings-item">
            <label>Vorheiz-Vorlaufzeit (min)</label>
            <input type="number" class="form-input" id="preheat-minutes"
              min="0" max="120" step="5" value="${a.preheat_minutes ?? 0}">
            <span class="form-hint">Wie früh vor Zeitplan-Start wird vorgeheizt (0 = aus)</span>
          </div>
          <div class="settings-item">
            <label>Sonnen-Entität</label>
            <input type="text" class="form-input" id="sun-entity"
              placeholder="sun.sun" value="${a.sun_entity ?? 'sun.sun'}">
            <span class="form-hint">Entität zur Tag/Nacht-Erkennung (Standard: sun.sun)</span>
          </div>
        </div>
        <div class="btn-row">
          <button class="btn btn-primary" id="save-night-settings">💾 Nacht/Vorheizen speichern</button>
        </div>
      </div>

      <!-- Klimabaustein -->
      <div class="card">
        <div class="card-title">⚙️ Klimabaustein</div>
        <div class="info-box">
          Aggregiert alle Zimmeranforderungen (gewichteter Durchschnitt) und
          entscheidet zentral ob die Heizung läuft.
        </div>
        <div class="settings-grid">
          <div class="settings-item">
            <label>Einschaltschwelle (%)</label>
            <input type="number" class="form-input" id="demand-threshold"
              min="1" max="100" step="1" value="${a.demand_threshold ?? 15}">
            <span class="form-hint">Heizung EIN wenn Anforderung ≥ Schwelle</span>
          </div>
          <div class="settings-item">
            <label>Hysterese (%)</label>
            <input type="number" class="form-input" id="demand-hysteresis"
              min="1" max="30" step="1" value="${a.demand_hysteresis ?? 5}">
            <span class="form-hint">Heizung AUS bei Schwelle − Hysterese</span>
          </div>
          <div class="settings-item">
            <label>Min. Einschaltzeit (min)</label>
            <input type="number" class="form-input" id="min-on-time"
              min="1" max="60" step="1" value="${a.min_on_time_minutes ?? 5}">
          </div>
          <div class="settings-item">
            <label>Min. Ausschaltzeit (min)</label>
            <input type="number" class="form-input" id="min-off-time"
              min="1" max="60" step="1" value="${a.min_off_time_minutes ?? 5}">
          </div>
          <div class="settings-item">
            <label>Min. Zimmer mit Anforderung</label>
            <input type="number" class="form-input" id="min-rooms"
              min="1" max="20" step="1" value="${a.min_rooms_demand ?? 1}">
          </div>
        </div>
        <div class="btn-row">
          <button class="btn btn-primary" id="save-global-settings">💾 Klimabaustein speichern</button>
        </div>
      </div>

      <!-- Gäste-Modus -->
      <div class="card">
        <div class="card-title">🎉 Gäste-Modus</div>
        ${g.guest_mode_active ? `<div class="info-box" style="background:#fce4ec;border-color:#880e4f;">🎉 Gäste-Modus ist <strong>aktiv</strong>${g.guest_remaining_minutes != null ? ` – noch ${g.guest_remaining_minutes} min` : ""}</div>` : ""}
        <div class="info-box">Im Gäste-Modus heizen alle Zimmer auf Komfort-Temperatur. Optional wird nach einer bestimmten Zeit automatisch zurückgeschaltet.</div>
        <div class="settings-grid">
          <div class="settings-item">
            <label>Dauer (Stunden, 0 = unbegrenzt)</label>
            <input type="number" class="form-input" id="guest-duration"
              min="0" max="168" step="1" value="${a.guest_duration_hours ?? 24}">
            <span class="form-hint">Nach dieser Zeit wird automatisch auf Auto zurückgeschaltet</span>
          </div>
        </div>
        <div class="btn-row">
          ${g.guest_mode_active
            ? `<button class="btn btn-secondary" id="deactivate-guest-mode">✕ Gäste-Modus beenden</button>`
            : `<button class="btn btn-primary" id="activate-guest-mode">🎉 Gäste-Modus aktivieren</button>`}
          <button class="btn btn-secondary" id="save-guest-duration">💾 Standarddauer speichern</button>
        </div>
      </div>

      <!-- Anwesenheitserkennung -->
      <div class="card">
        <div class="card-title">🚶 Anwesenheitserkennung</div>
        <div class="info-box">
          Wenn <strong>niemand</strong> der konfigurierten Personen zuhause ist, schaltet das System automatisch auf <em>Abwesend</em>.<br>
          Wähle eine oder mehrere <code>person.*</code> oder <code>device_tracker.*</code> Entitäten.
        </div>
        <div class="form-group">
          <label class="form-label">Anwesenheits-Entitäten</label>
          <div id="presence-entity-list" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px">
            ${this._renderPresenceCheckboxes(a.presence_entities || [])}
          </div>
          <span class="form-hint">Aktuell ${g.presence_away_active ? "🚶 niemand zuhause" : "✓ jemand zuhause"}</span>
        </div>
        <div class="btn-row">
          <button class="btn btn-primary" id="save-presence-settings">💾 Anwesenheit speichern</button>
        </div>
      </div>

      <!-- Energie & Solar -->
      <div class="card">
        <div class="card-title">⚡ Energie &amp; Solar</div>
        <div class="settings-grid">
          <div class="settings-item">
            <label>Kesselleistung (kW)</label>
            <input type="number" class="form-input" id="boiler-kw"
              min="1" max="100" step="1" value="${a.boiler_kw ?? 20}">
            <span class="form-hint">Für Energieberechnung (kWh = Laufzeit × kW)</span>
          </div>
          <div class="settings-item">
            <label>Vorlauftemperatur-Entität</label>
            <input type="text" class="form-input" id="flow-temp-entity"
              placeholder="number.boiler_flow_temp (leer = deaktiviert)"
              value="${a.flow_temp_entity ?? ''}" list="flow-temp-list">
            <datalist id="flow-temp-list">${this._entityOptions(["number"])}</datalist>
            <span class="form-hint">Setzt die Vorlauftemperatur automatisch</span>
          </div>
        </div>
        <hr class="divider">
        <div class="card-title" style="font-size:13px;margin-top:0">☀️ Solarüberschuss-Heizung</div>
        <div class="settings-grid">
          <div class="settings-item">
            <label>Solar-Sensor</label>
            <input type="text" class="form-input" id="solar-entity"
              placeholder="sensor.solar_power (leer = deaktiviert)"
              value="${a.solar_entity ?? ''}" list="solar-entity-list">
            <datalist id="solar-entity-list">${this._entityOptions(["sensor"])}</datalist>
          </div>
          <div class="settings-item">
            <label>Überschuss-Schwelle (W)</label>
            <input type="number" class="form-input" id="solar-surplus-threshold"
              min="100" max="10000" step="100" value="${a.solar_surplus_threshold ?? 1000}">
            <span class="form-hint">Überschuss ab dem Boost aktiv wird</span>
          </div>
          <div class="settings-item">
            <label>Temperatur-Boost (°C)</label>
            <input type="number" class="form-input" id="solar-boost-temp"
              min="0.5" max="5" step="0.5" value="${a.solar_boost_temp ?? 1}">
            <span class="form-hint">Um wieviel °C Zieltemp. angehoben wird</span>
          </div>
        </div>
        <hr class="divider">
        <div class="card-title" style="font-size:13px;margin-top:0">💶 Dynamischer Strompreis</div>
        <div class="settings-grid">
          <div class="settings-item">
            <label>Preis-Sensor</label>
            <input type="text" class="form-input" id="energy-price-entity"
              placeholder="sensor.strompreis (leer = deaktiviert)"
              value="${a.energy_price_entity ?? ''}" list="price-entity-list">
            <datalist id="price-entity-list">${this._entityOptions(["sensor"])}</datalist>
          </div>
          <div class="settings-item">
            <label>Preis-Schwelle (€/kWh)</label>
            <input type="number" class="form-input" id="energy-price-threshold"
              min="0.05" max="2" step="0.01" value="${a.energy_price_threshold ?? 0.30}">
            <span class="form-hint">Über diesem Preis wird Eco-Modus aktiviert</span>
          </div>
          <div class="settings-item">
            <label>Eco-Absenkung (°C)</label>
            <input type="number" class="form-input" id="energy-price-eco-offset"
              min="0.5" max="6" step="0.5" value="${a.energy_price_eco_offset ?? 2}">
            <span class="form-hint">Absenkung bei hohem Preis</span>
          </div>
        </div>
        <div class="btn-row">
          <button class="btn btn-primary" id="save-energy-settings">💾 Energie / Solar speichern</button>
        </div>
      </div>

      <!-- Energie-Statistik heute -->
      <div class="card">
        <div class="card-title">📊 Energie-Statistik heute</div>
        <div class="settings-grid">
          <div class="settings-item">
            <label>Heizlaufzeit</label>
            <div style="font-size:24px;font-weight:700;color:var(--primary-color)">${g.heating_runtime_today} min</div>
          </div>
          <div class="settings-item">
            <label>Geschätzter Verbrauch</label>
            <div style="font-size:24px;font-weight:700;color:var(--primary-color)">${g.energy_today_kwh} kWh</div>
          </div>
          ${g.solar_power != null ? `<div class="settings-item">
            <label>Solar aktuell</label>
            <div style="font-size:20px;font-weight:700;color:#f9a825">${g.solar_power} W</div>
          </div>` : ""}
          ${g.energy_price != null ? `<div class="settings-item">
            <label>Strompreis aktuell</label>
            <div style="font-size:20px;font-weight:700;color:${g.energy_price_eco_active ? "#c62828" : "#43a047"}">${g.energy_price.toFixed(3)} €/kWh</div>
          </div>` : ""}
        </div>
      </div>

      <!-- Urlaubs-Assistent -->
      <div class="card">
        <div class="card-title">✈️ Urlaubs-Assistent</div>
        <div class="info-box">Schaltet automatisch auf den Modus „Urlaub" wenn das heutige Datum im angegebenen Zeitraum liegt. Urlaubs-Temperatur wird unter <em>Temperaturen</em> oben eingestellt.</div>
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
            <input type="number" class="form-input" id="vacation-return-preheat"
              min="0" max="14" step="1" value="${a.vacation_return_preheat_days ?? 0}">
            <span class="form-hint">N Tage vor Urlaubsende wird auf Auto geschaltet (0 = aus)</span>
          </div>
        </div>
        <div class="btn-row">
          <button class="btn btn-primary" id="save-vacation-range">💾 Urlaub speichern</button>
          <button class="btn btn-secondary" id="clear-vacation-range">✕ Urlaub löschen</button>
        </div>
      </div>

      <!-- Backup -->
      <div class="card">
        <div class="card-title">💾 Backup &amp; Restore</div>
        <div class="info-box">Exportiert die gesamte Konfiguration als HA-Benachrichtigung (JSON). Diese kann gespeichert und zum Wiederherstellen verwendet werden.</div>
        <div class="btn-row">
          <button class="btn btn-secondary" id="export-config-btn">📤 Konfiguration exportieren</button>
        </div>
      </div>
    `;

    // Toggle heating-switch opacity based on enable-heating-switch select
    content.querySelector("#enable-heating-switch").addEventListener("change", e => {
      const item = content.querySelector("#heating-switch-item");
      if (item) item.style.opacity = e.target.value === "true" ? "1" : "0.5";
    });

    // Toggle cooling-switch opacity based on enable-cooling select
    content.querySelector("#enable-cooling").addEventListener("change", e => {
      const item = content.querySelector("#cooling-switch-item");
      if (item) item.style.opacity = e.target.value === "true" ? "1" : "0.5";
    });

    content.querySelector("#save-hardware-settings").addEventListener("click", () => {
      const heatingEnabled = content.querySelector("#enable-heating-switch").value === "true";
      this._callService("update_global_settings", {
        outdoor_temp_sensor: content.querySelector("#outdoor-sensor").value.trim(),
        heating_switch:      heatingEnabled ? content.querySelector("#heating-switch").value.trim() : "",
        enable_cooling:      content.querySelector("#enable-cooling").value === "true",
        cooling_switch:      content.querySelector("#cooling-switch").value.trim(),
        weather_entity:           content.querySelector("#weather-entity").value.trim(),
        weather_cold_threshold:   parseFloat(content.querySelector("#weather-cold-threshold").value) || 0,
        weather_cold_boost:       parseFloat(content.querySelector("#weather-cold-boost").value) || 0,
        controller_mode:          content.querySelector("#controller-mode").value,
      });
      this._toast("✓ Hardware-Einstellungen gespeichert");
    });

    content.querySelector("#set-system-mode").addEventListener("click", () => {
      const mode = content.querySelector("#system-mode-select").value;
      this._callService("set_system_mode", { mode });
      this._toast(`✓ Modus: ${SYSTEM_MODE_LABELS[mode] || mode}`);
    });

    content.querySelector("#save-temp-settings").addEventListener("click", () => {
      const awayT  = parseFloat(content.querySelector("#away-temp").value);
      const vacT   = parseFloat(content.querySelector("#vacation-temp").value);
      const frostT = parseFloat(content.querySelector("#frost-temp").value);
      const sumT   = parseFloat(content.querySelector("#summer-threshold").value);
      if ([awayT, vacT, frostT, sumT].some(isNaN)) { this._toast("⚠️ Ungültiger Temperaturwert"); return; }
      this._callService("update_global_settings", {
        away_temp:              awayT,
        vacation_temp:          vacT,
        frost_protection_temp:  frostT,
        summer_mode_enabled:    content.querySelector("#summer-enabled").value === "true",
        summer_threshold:       sumT,
      });
      this._toast("✓ Temperatur-Einstellungen gespeichert");
    });

    content.querySelector("#save-night-settings").addEventListener("click", () => {
      const offset = parseFloat(content.querySelector("#night-setback-offset").value);
      const preheat = parseInt(content.querySelector("#preheat-minutes").value);
      if (isNaN(offset) || isNaN(preheat)) { this._toast("⚠️ Ungültiger Wert"); return; }
      this._callService("update_global_settings", {
        night_setback_enabled:  content.querySelector("#night-setback-enabled").value === "true",
        night_setback_offset:   offset,
        preheat_minutes:        preheat,
        sun_entity:             content.querySelector("#sun-entity").value.trim() || "sun.sun",
      });
      this._toast("✓ Nachtabsenkung/Vorheizen gespeichert");
    });

    content.querySelector("#save-global-settings").addEventListener("click", () => {
      const thresh  = parseFloat(content.querySelector("#demand-threshold").value);
      const hyst    = parseFloat(content.querySelector("#demand-hysteresis").value);
      const minOn   = parseInt(content.querySelector("#min-on-time").value);
      const minOff  = parseInt(content.querySelector("#min-off-time").value);
      const minRooms = parseInt(content.querySelector("#min-rooms").value);
      if ([thresh, hyst, minOn, minOff, minRooms].some(isNaN)) { this._toast("⚠️ Ungültiger Wert"); return; }
      this._callService("update_global_settings", {
        demand_threshold:   thresh,
        demand_hysteresis:  hyst,
        min_on_time:        minOn,
        min_off_time:       minOff,
        min_rooms_demand:   minRooms,
      });
      this._toast("✓ Klimabaustein-Einstellungen gespeichert");
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

    content.querySelector("#save-presence-settings").addEventListener("click", () => {
      const checked = [...content.querySelectorAll(".presence-cb:checked")].map(cb => cb.value);
      this._callService("update_global_settings", { presence_entities: checked });
      this._toast("✓ Anwesenheitserkennung gespeichert");
    });

    content.querySelector("#save-energy-settings").addEventListener("click", () => {
      const boilerKw     = parseFloat(content.querySelector("#boiler-kw").value);
      const solarSurplus = parseFloat(content.querySelector("#solar-surplus-threshold").value);
      const solarBoost   = parseFloat(content.querySelector("#solar-boost-temp").value);
      const priceThresh  = parseFloat(content.querySelector("#energy-price-threshold").value);
      const priceEco     = parseFloat(content.querySelector("#energy-price-eco-offset").value);
      if ([boilerKw, solarSurplus, solarBoost, priceThresh, priceEco].some(isNaN)) { this._toast("⚠️ Ungültiger Wert"); return; }
      this._callService("update_global_settings", {
        boiler_kw:                  boilerKw,
        flow_temp_entity:           content.querySelector("#flow-temp-entity").value.trim(),
        solar_entity:               content.querySelector("#solar-entity").value.trim(),
        solar_surplus_threshold:    solarSurplus,
        solar_boost_temp:           solarBoost,
        energy_price_entity:        content.querySelector("#energy-price-entity").value.trim(),
        energy_price_threshold:     priceThresh,
        energy_price_eco_offset:    priceEco,
      });
      this._toast("✓ Energie/Solar-Einstellungen gespeichert");
    });

    content.querySelector("#export-config-btn").addEventListener("click", () => {
      this._callService("export_config", {});
      this._toast("✓ Konfiguration wird als Benachrichtigung erstellt...");
    });

    content.querySelector("#save-vacation-range").addEventListener("click", () => {
      const start = content.querySelector("#vacation-start").value;
      const end   = content.querySelector("#vacation-end").value;
      const preheatDays = parseInt(content.querySelector("#vacation-return-preheat").value) || 0;
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
        const dur = parseInt(content.querySelector("#guest-duration").value) || 24;
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
      const dur = parseInt(content.querySelector("#guest-duration").value);
      if (isNaN(dur)) { this._toast("⚠️ Ungültiger Wert"); return; }
      this._callService("update_global_settings", { guest_duration_hours: dur });
      this._toast("✓ Standarddauer gespeichert");
    });
  }

  // ── Helper: Presence checkboxes from HA states ──────────────────────────────
  _renderPresenceCheckboxes(currentEntities) {
    if (!this._hass) return "";

    const homeStates = new Set(["home", "on"]);
    const mkChip = id => {
      const state = this._hass.states[id];
      const label = state?.attributes?.friendly_name || id;
      const isHome = homeStates.has((state?.state || "").toLowerCase());
      const checked = currentEntities.includes(id) ? "checked" : "";
      const dot = isHome
        ? `<span style="width:7px;height:7px;border-radius:50%;background:#43a047;flex-shrink:0"></span>`
        : `<span style="width:7px;height:7px;border-radius:50%;background:#bdbdbd;flex-shrink:0"></span>`;
      return `<label style="display:flex;align-items:center;gap:7px;font-size:13px;cursor:pointer;
          padding:6px 10px;border:1px solid var(--divider-color);border-radius:8px;
          background:${checked ? "var(--primary-color,#03a9f4)1a" : "transparent"}">
        <input type="checkbox" class="presence-cb" value="${id}" ${checked} style="margin:0">
        ${dot}
        <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${label}</span>
        <span style="font-size:10px;color:var(--secondary-text-color);flex-shrink:0">${isHome ? "zuhause" : "weg"}</span>
      </label>`;
    };

    const persons  = Object.keys(this._hass.states).filter(id => id.startsWith("person.")).sort();
    const trackers = Object.keys(this._hass.states).filter(id => id.startsWith("device_tracker.")).sort();
    const booleans = Object.keys(this._hass.states).filter(id => id.startsWith("input_boolean.")).sort();

    if (!persons.length && !trackers.length && !booleans.length)
      return "<em style='color:var(--secondary-text-color);font-size:12px'>Keine person.* / device_tracker.* Entitäten gefunden</em>";

    const section = (title, ids) => ids.length === 0 ? "" : `
      <div style="font-size:11px;font-weight:600;color:var(--secondary-text-color);
          text-transform:uppercase;letter-spacing:.5px;margin:10px 0 5px">${title}</div>
      <div style="display:flex;flex-direction:column;gap:4px">${ids.map(mkChip).join("")}</div>`;

    // Device-trackers get a collapse toggle if more than 5
    let trackerBlock = "";
    if (trackers.length > 0) {
      const shown  = trackers.slice(0, 5);
      const hidden = trackers.slice(5);
      trackerBlock = `
        <div style="font-size:11px;font-weight:600;color:var(--secondary-text-color);
            text-transform:uppercase;letter-spacing:.5px;margin:10px 0 5px">Geräte (device_tracker)</div>
        <div style="display:flex;flex-direction:column;gap:4px">${shown.map(mkChip).join("")}</div>
        ${hidden.length ? `
          <div id="tracker-overflow" style="display:none;flex-direction:column;gap:4px">${hidden.map(mkChip).join("")}</div>
          <button type="button" id="tracker-toggle"
            style="margin-top:6px;font-size:12px;color:var(--primary-color);background:none;border:none;cursor:pointer;padding:2px 0;text-align:left">
            ▸ ${hidden.length} weitere Geräte anzeigen
          </button>` : ""}`;
    }

    return section("Personen", persons) + trackerBlock + section("Schalter (input_boolean)", booleans);
  }

  // ── Helper: datalist options for entity pickers ─────────────────────────────
  _entityOptions(domains) {
    if (!this._hass) return "";
    return Object.keys(this._hass.states)
      .filter(id => !domains.length || domains.some(d => id.startsWith(d + ".")))
      .sort()
      .map(id => {
        const state = this._hass.states[id];
        const name  = state?.attributes?.friendly_name;
        // Show "Friendly Name – entity.id" so users can search by name OR id
        const label = name && name !== id ? `${name} – ${id}` : id;
        return `<option value="${id}" label="${label}">`;
      })
      .join("");
  }

  // ── Zeitpläne Tab ──────────────────────────────────────────────────────────

  _renderSchedules(content) {
    const rooms = this._getRoomData();
    if (!Object.keys(rooms).length) {
      content.innerHTML = `<div class="info-box">Keine Zimmer. Füge zuerst Zimmer hinzu.</div>`;
      return;
    }

    const roomList = Object.values(rooms);
    // Clear stale reference if the previously selected room was deleted
    if (this._scheduleRoom && !rooms[this._scheduleRoom]) this._scheduleRoom = null;
    const selId  = this._scheduleRoom || roomList[0].entity_id;
    const selRoom = rooms[selId] || roomList[0];

    const roomTabs = roomList.map(r =>
      `<div class="tab ${r.entity_id === selId ? "active" : ""}"
            data-room="${r.entity_id}" style="font-size:13px">${r.name}</div>`
    ).join("");

    // Get or init schedule data for this room (load from room config if not yet editing)
    if (!this._editingSchedules[selId]) {
      const existing = selRoom.schedules;
      if (existing && existing.length > 0) {
        // Deep-copy so edits don't mutate the source
        this._editingSchedules[selId] = JSON.parse(JSON.stringify(existing));
      } else {
        // Default template for new rooms without schedules
        this._editingSchedules[selId] = [
          { days: ["mon","tue","wed","thu","fri"],
            periods: [{ start:"06:30", end:"08:00", temperature:22.0, offset:0.0 },
                      { start:"17:00", end:"22:00", temperature:21.5, offset:0.0 }] },
          { days: ["sat","sun"],
            periods: [{ start:"08:00", end:"23:00", temperature:21.0, offset:0.5 }] },
        ];
      }
    }
    const schedules = this._editingSchedules[selId];

    const schedBlocks = schedules.map((sched, si) => {
      const dayChips = DAY_KEYS.map((key, i) =>
        `<span class="day-chip ${sched.days.includes(key) ? "selected" : ""}"
              data-sched="${si}" data-day="${key}">${DAYS[i]}</span>`
      ).join("");

      const periodRows = sched.periods.map((p, pi) => `
        <div class="period-row">
          <input type="time" class="form-input" value="${p.start}"
            data-sched="${si}" data-period="${pi}" data-field="start">
          <input type="time" class="form-input" value="${p.end}"
            data-sched="${si}" data-period="${pi}" data-field="end">
          <input type="number" class="form-input" value="${p.temperature}"
            step="0.5" min="10" max="30"
            data-sched="${si}" data-period="${pi}" data-field="temperature"
            placeholder="°C">
          <input type="number" class="form-input" value="${p.offset}"
            step="0.5" min="-3" max="3"
            data-sched="${si}" data-period="${pi}" data-field="offset"
            placeholder="±°C">
          <button class="btn btn-danger btn-icon"
            data-action="del-period" data-sched="${si}" data-period="${pi}">✕</button>
        </div>`).join("");

      return `
        <div class="sched-block">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <strong style="font-size:14px">Gruppe ${si + 1}</strong>
            <button class="btn btn-danger" style="font-size:12px;padding:4px 10px"
              data-action="del-sched" data-sched="${si}">Gruppe löschen</button>
          </div>
          <div style="margin-bottom:12px">
            <div class="form-label" style="margin-bottom:6px">Aktive Tage:</div>
            <div class="day-chips">${dayChips}</div>
          </div>
          <div class="period-header">
            <span>Von</span><span>Bis</span><span>Temp °C</span><span>Offset</span><span></span>
          </div>
          ${periodRows}
          <button class="btn btn-secondary" style="font-size:12px;margin-top:6px"
            data-action="add-period" data-sched="${si}">+ Zeitraum</button>
        </div>`;
    }).join("");

    content.innerHTML = `
      <div class="card">
        <div class="card-title">📅 Zeitpläne</div>
        <div class="info-box">
          Während eines aktiven Zeitplans gilt: <strong>Zeitplan-Temp + Zeitplan-Offset + Zimmer-Offset</strong><br>
          Außerhalb: <strong>Heizkurven-Temp + Zimmer-Offset</strong>
        </div>
        <div class="tabs" style="margin-bottom:16px">${roomTabs}</div>
        <div id="sched-editor">${schedBlocks}</div>
        <div class="btn-row">
          <button class="btn btn-secondary" id="add-sched-btn">+ Gruppe hinzufügen</button>
          <button class="btn btn-primary" id="save-sched-btn">💾 Zeitpläne speichern</button>
        </div>
      </div>`;

    // Room tab switching
    content.querySelectorAll("[data-room]").forEach(tab => {
      tab.addEventListener("click", () => {
        this._scheduleRoom = tab.dataset.room;
        this._renderSchedules(content);
      });
    });

    // Day chip toggle
    content.querySelectorAll(".day-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        const si = parseInt(chip.dataset.sched);
        const day = chip.dataset.day;
        const sched = this._editingSchedules[selId][si];
        if (sched.days.includes(day)) sched.days = sched.days.filter(d => d !== day);
        else sched.days.push(day);
        chip.classList.toggle("selected", sched.days.includes(day));
      });
    });

    // Input changes
    content.querySelectorAll("[data-field]").forEach(inp => {
      inp.addEventListener("change", () => {
        const si = parseInt(inp.dataset.sched);
        const pi = parseInt(inp.dataset.period);
        const field = inp.dataset.field;
        const val = field === "start" || field === "end" ? inp.value : parseFloat(inp.value);
        this._editingSchedules[selId][si].periods[pi][field] = val;
      });
    });

    // Delete period
    content.querySelectorAll("[data-action='del-period']").forEach(btn => {
      btn.addEventListener("click", () => {
        const si = parseInt(btn.dataset.sched);
        const pi = parseInt(btn.dataset.period);
        this._editingSchedules[selId][si].periods.splice(pi, 1);
        this._renderSchedules(content);
      });
    });

    // Delete schedule
    content.querySelectorAll("[data-action='del-sched']").forEach(btn => {
      btn.addEventListener("click", () => {
        const si = parseInt(btn.dataset.sched);
        this._editingSchedules[selId].splice(si, 1);
        this._renderSchedules(content);
      });
    });

    // Add period
    content.querySelectorAll("[data-action='add-period']").forEach(btn => {
      btn.addEventListener("click", () => {
        const si = parseInt(btn.dataset.sched);
        this._editingSchedules[selId][si].periods.push(
          { start: "07:00", end: "09:00", temperature: 21.0, offset: 0.0 }
        );
        this._renderSchedules(content);
      });
    });

    // Add schedule group
    content.querySelector("#add-sched-btn").addEventListener("click", () => {
      this._editingSchedules[selId].push({ days: ["mon"], periods: [
        { start: "07:00", end: "09:00", temperature: 21.0, offset: 0.0 }
      ]});
      this._renderSchedules(content);
    });

    // Save
    content.querySelector("#save-sched-btn").addEventListener("click", async () => {
      const roomId = selRoom.room_id;
      if (!roomId) { this._toast("Fehler: room_id fehlt"); return; }
      await this._callService("update_room", {
        id: roomId,
        schedules: this._editingSchedules[selId],
      });
      this._toast(`✓ Zeitpläne für „${selRoom.name}" gespeichert`);
    });
  }

  // ── Kalender Tab (Wochenübersicht) ─────────────────────────────────────────

  _renderCalendar(content) {
    const rooms = Object.values(this._getRoomData());
    if (!rooms.length) {
      content.innerHTML = `<div class="info-box">Keine Zimmer konfiguriert. Füge zuerst Zimmer hinzu.</div>`;
      return;
    }

    // Build a 7-day × 24-hour heatmap for each room
    // For each room, for each day×hour cell, find what temperature would be active
    const HOURS = Array.from({ length: 24 }, (_, h) => h);
    const tempToColor = (temp) => {
      if (temp === null) return "var(--secondary-background-color, #f5f5f5)";
      // Range roughly 14–24°C → blue to red
      const lo = 14, hi = 24;
      const t = Math.max(0, Math.min(1, (temp - lo) / (hi - lo)));
      // Blue (cold) → orange (warm) → red (hot)
      const r = Math.round(30  + t * 200);
      const g = Math.round(100 - t * 60);
      const b = Math.round(200 - t * 180);
      return `rgb(${r},${g},${b})`;
    };

    const roomHeatmaps = rooms.map(room => {
      const schedules = room.schedules || [];
      // Build 7×24 grid
      const grid = DAY_KEYS.map(dayKey => {
        return HOURS.map(hour => {
          const timeMin = hour * 60;
          let activeTemp = null;
          for (const sched of schedules) {
            if (!sched.days || !sched.days.includes(dayKey)) continue;
            for (const period of (sched.periods || [])) {
              const [sh, sm] = (period.start || "0:0").split(":").map(Number);
              const [eh, em] = (period.end   || "0:0").split(":").map(Number);
              const startMin = sh * 60 + sm;
              const endMin   = eh * 60 + em;
              const inPeriod = startMin <= endMin
                ? (timeMin >= startMin && timeMin < endMin)
                : (timeMin >= startMin || timeMin < endMin);
              if (inPeriod) { activeTemp = period.temperature ?? null; break; }
            }
            if (activeTemp !== null) break;
          }
          return activeTemp;
        });
      });

      const cols = HOURS.map((_, h) =>
        `<div style="font-size:9px;text-align:center;color:var(--secondary-text-color);width:${100/24}%;min-width:0">${h % 3 === 0 ? h + "h" : ""}</div>`
      ).join("");

      const rows = DAY_KEYS.map((dayKey, di) => {
        const cells = grid[di].map(temp =>
          `<div title="${temp != null ? temp + " °C" : "—"}" style="
            flex:1;height:22px;background:${tempToColor(temp)};
            border-radius:2px;margin:1px;
            display:flex;align-items:center;justify-content:center;
            font-size:8px;color:rgba(255,255,255,0.8);font-weight:600">
            ${temp != null ? temp : ""}
          </div>`
        ).join("");
        return `<div style="display:flex;align-items:center;gap:0;margin-bottom:1px">
          <div style="width:24px;font-size:10px;color:var(--secondary-text-color);flex-shrink:0">${DAYS[di]}</div>
          <div style="display:flex;flex:1;gap:0">${cells}</div>
        </div>`;
      }).join("");

      return `
        <div class="card" style="padding:12px">
          <div style="font-size:13px;font-weight:700;margin-bottom:10px">🚪 ${room.name}</div>
          <div style="display:flex;margin-left:24px;margin-bottom:2px">${cols}</div>
          ${rows}
          <div style="margin-top:6px;display:flex;gap:6px;align-items:center;font-size:10px;color:var(--secondary-text-color)">
            <span>Kalt</span>
            <div style="flex:1;height:6px;border-radius:3px;background:linear-gradient(to right,rgb(30,100,200),rgb(200,80,20),rgb(230,40,20))"></div>
            <span>Warm</span>
          </div>
        </div>`;
    }).join("");

    content.innerHTML = `
      <div class="card">
        <div class="card-title">🗓️ Wochenübersicht – Zeitpläne</div>
        <div class="info-box">
          Zeigt für jedes Zimmer welche Temperatur laut Zeitplan zu jeder Stunde aktiv ist.<br>
          Graue Zellen = außerhalb Zeitplan (Heizkurve aktiv).
        </div>
      </div>
      ${roomHeatmaps || '<div class="info-box">Keine Zeitpläne konfiguriert. Gehe zum Tab <strong>Zeitpläne</strong>.</div>'}
    `;
  }

  // ── Heizkurve Tab ──────────────────────────────────────────────────────────

  _renderCurve(content) {
    const defaultCurve = [
      { outdoor_temp: -20, target_temp: 24.0 }, { outdoor_temp: -10, target_temp: 23.0 },
      { outdoor_temp:   0, target_temp: 22.0 }, { outdoor_temp:  10, target_temp: 20.5 },
      { outdoor_temp:  15, target_temp: 19.5 }, { outdoor_temp:  20, target_temp: 18.0 },
      { outdoor_temp:  25, target_temp: 16.0 },
    ];
    const ot = this._st("sensor.ihc_aussentemperatur");
    const ct = this._st("sensor.ihc_heizkurven_zieltemperatur");

    // Load actual curve from sensor attributes (set by backend)
    const savedPoints = ct?.attributes?.curve_points;
    const curve = (savedPoints && savedPoints.length >= 2) ? savedPoints : defaultCurve;

    const rows = curve.map((pt, i) => `
      <tr>
        <td><input type="number" class="curve-outdoor" value="${pt.outdoor_temp}" step="1" min="-30" max="40"> °C</td>
        <td><input type="number" class="curve-target"  value="${pt.target_temp}"  step="0.5" min="10" max="35"> °C</td>
        <td><button class="btn btn-danger btn-icon" data-action="del-row">✕</button></td>
      </tr>`).join("");

    content.innerHTML = `
      <div class="card">
        <div class="card-title">📈 Heizkurve</div>
        <div class="info-box">
          Basis-Solltemperatur in Abhängigkeit der Außentemperatur.
          Jetzt: Außen <strong>${ot ? ot.state + " °C" : "—"}</strong>
          → Ziel <strong>${ct ? ct.state + " °C" : "—"}</strong>
        </div>
        <table class="curve-table">
          <thead><tr>
            <th>Außentemperatur</th><th>Ziel-Temperatur</th><th></th>
          </tr></thead>
          <tbody id="curve-rows">${rows}</tbody>
        </table>
        <div class="btn-row">
          <button class="btn btn-secondary" id="add-curve-row">+ Punkt</button>
          <button class="btn btn-primary" id="save-curve">💾 Heizkurve speichern</button>
        </div>
      </div>
      <div class="card">
        <div class="card-title">Vorschau</div>
        <canvas id="curve-canvas" width="700" height="260"
          style="max-width:100%;border:1px solid var(--divider-color,#e0e0e0);border-radius:8px"></canvas>
      </div>`;

    content.querySelectorAll("[data-action='del-row']").forEach(btn =>
      btn.addEventListener("click", () => { btn.closest("tr").remove(); this._drawCurve(content); })
    );

    content.querySelector("#add-curve-row").addEventListener("click", () => {
      const tbody = content.querySelector("#curve-rows");
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><input type="number" class="curve-outdoor" value="5" step="1" min="-30" max="40"> °C</td>
        <td><input type="number" class="curve-target"  value="21" step="0.5" min="10" max="35"> °C</td>
        <td><button class="btn btn-danger btn-icon" data-action="del-row">✕</button></td>`;
      tbody.appendChild(tr);
      tr.querySelector("[data-action='del-row']").addEventListener("click", () => { tr.remove(); this._drawCurve(content); });
      this._drawCurve(content);
    });

    content.querySelectorAll(".curve-outdoor,.curve-target").forEach(inp =>
      inp.addEventListener("input", () => this._drawCurve(content))
    );

    content.querySelector("#save-curve").addEventListener("click", () => {
      const pts = this._collectCurvePoints(content);
      if (pts.length < 2) { this._toast("❌ Mindestens 2 Punkte erforderlich"); return; }
      this._callService("update_global_settings", { heating_curve: { points: pts } });
      this._toast("✓ Heizkurve gespeichert");
    });

    this._drawCurve(content);
  }

  _collectCurvePoints(content) {
    const outs = [...content.querySelectorAll(".curve-outdoor")].map(i => parseFloat(i.value));
    const tgts = [...content.querySelectorAll(".curve-target")].map(i => parseFloat(i.value));
    return outs
      .map((o, i) => ({ outdoor_temp: o, target_temp: tgts[i] }))
      .filter(p => !isNaN(p.outdoor_temp) && !isNaN(p.target_temp))
      .sort((a, b) => a.outdoor_temp - b.outdoor_temp);
  }

  _drawCurve(content) {
    const canvas = content.querySelector("#curve-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const pts = this._collectCurvePoints(content);
    if (pts.length < 2) return;
    const W = canvas.width, H = canvas.height, PAD = 44;
    ctx.clearRect(0, 0, W, H);
    const minX = Math.min(...pts.map(p => p.outdoor_temp)) - 3;
    const maxX = Math.max(...pts.map(p => p.outdoor_temp)) + 3;
    const minY = Math.min(...pts.map(p => p.target_temp)) - 1;
    const maxY = Math.max(...pts.map(p => p.target_temp)) + 1;
    const tx = v => PAD + ((v - minX) / (maxX - minX)) * (W - 2 * PAD);
    const ty = v => H - PAD - ((v - minY) / (maxY - minY)) * (H - 2 * PAD);
    ctx.strokeStyle = "#e0e0e0"; ctx.lineWidth = 1;
    for (let t = Math.ceil(minX); t <= maxX; t += 5) {
      ctx.beginPath(); ctx.moveTo(tx(t), PAD); ctx.lineTo(tx(t), H - PAD); ctx.stroke();
      ctx.fillStyle = "#9e9e9e"; ctx.font = "11px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(t + "°", tx(t), H - 6);
    }
    for (let t = Math.ceil(minY); t <= maxY; t += 1) {
      ctx.beginPath(); ctx.moveTo(PAD, ty(t)); ctx.lineTo(W - PAD, ty(t)); ctx.stroke();
      ctx.fillStyle = "#9e9e9e"; ctx.textAlign = "right";
      ctx.fillText(t + "°", PAD - 5, ty(t) + 4);
    }
    // Curve
    const grad = ctx.createLinearGradient(0, PAD, 0, H - PAD);
    grad.addColorStop(0, "#e53935"); grad.addColorStop(1, "#43a047");
    ctx.strokeStyle = grad; ctx.lineWidth = 2.5; ctx.beginPath();
    pts.forEach((p, i) => i === 0 ? ctx.moveTo(tx(p.outdoor_temp), ty(p.target_temp))
                                   : ctx.lineTo(tx(p.outdoor_temp), ty(p.target_temp)));
    ctx.stroke();
    pts.forEach(p => {
      ctx.fillStyle = "#e53935"; ctx.beginPath();
      ctx.arc(tx(p.outdoor_temp), ty(p.target_temp), 5, 0, Math.PI * 2); ctx.fill();
    });
    // Current marker
    const ot = this._st("sensor.ihc_aussentemperatur");
    if (ot && !isNaN(parseFloat(ot.state))) {
      const v = parseFloat(ot.state);
      if (v >= minX && v <= maxX) {
        ctx.strokeStyle = "#1e88e5"; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
        ctx.beginPath(); ctx.moveTo(tx(v), PAD); ctx.lineTo(tx(v), H - PAD); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "#1e88e5"; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("Jetzt", tx(v), PAD - 5);
      }
    }
  }

  // ── Modals ─────────────────────────────────────────────────────────────────

  _showAddRoomModal() {
    this._showModal(`
      <div class="modal-title">+ Zimmer hinzufügen</div>

      <!-- Shared datalists for entity autocomplete -->
      <datalist id="m-sensor-list">${this._entityOptions(["sensor"])}</datalist>
      <datalist id="m-climate-list">${this._entityOptions(["climate"])}</datalist>
      <datalist id="m-binary-sensor-list">${this._entityOptions(["binary_sensor"])}</datalist>

      <div class="form-group">
        <label class="form-label">Zimmername *</label>
        <input type="text" class="form-input full" id="m-name" placeholder="z.B. Wohnzimmer">
      </div>

      <div class="form-group">
        <label class="form-label">Temperatursensor</label>
        <input type="text" class="form-input full" id="m-sensor"
          placeholder="sensor.wohnzimmer_temp" list="m-sensor-list" autocomplete="off">
        <span class="form-hint">Entity-ID des Temperatursensors</span>
      </div>

      <div class="modal-section">
        <div class="modal-section-title">Thermostate / TRVs (mehrere möglich)</div>
        <div class="entity-list" id="valve-list">
          <div class="entity-row">
            <input type="text" class="form-input" placeholder="climate.wohnzimmer (optional)"
              list="m-climate-list" autocomplete="off">
            <button class="btn btn-secondary btn-icon add-entity" data-list="valve-list" data-datalist="m-climate-list">+</button>
          </div>
        </div>
      </div>

      <div class="modal-section">
        <div class="modal-section-title">Fenstersensoren (mehrere möglich)</div>
        <div class="entity-list" id="window-list">
          <div class="entity-row">
            <input type="text" class="form-input" placeholder="binary_sensor.fenster_wz (optional)"
              list="m-binary-sensor-list" autocomplete="off">
            <button class="btn btn-secondary btn-icon add-entity" data-list="window-list" data-datalist="m-binary-sensor-list">+</button>
          </div>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Luftfeuchtigkeitssensor (optional)</label>
        <input type="text" class="form-input full" id="m-humidity-sensor"
          placeholder="sensor.wohnzimmer_humidity" list="m-sensor-list" autocomplete="off">
        <span class="form-hint">Für Schimmelschutz-Erkennung</span>
      </div>

      <div class="form-group">
        <label class="form-label">Schimmelschutz</label>
        <select class="form-input full" id="m-mold-enabled">
          <option value="true">Aktiviert</option>
          <option value="false">Deaktiviert</option>
        </select>
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
          <div class="settings-item">
            <label>Gewichtung</label>
            <input type="number" class="form-input" id="m-weight" value="1.0" step="0.1" min="0.1" max="5">
          </div>
        </div>
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
            <option value="eco"   ${(typeof room !== 'undefined' ? room.ha_schedule_off_mode : 'eco') === 'eco'   ? 'selected' : ''}>Eco-Temperatur</option>
            <option value="sleep" ${(typeof room !== 'undefined' ? room.ha_schedule_off_mode : 'eco') === 'sleep' ? 'selected' : ''}>Schlaf-Temperatur</option>
          </select>
        </div>
        <datalist id="m-schedule-list">${this._entityOptions(["schedule"])}</datalist>
        <datalist id="m-cond-list">${this._entityOptions(["input_boolean","binary_sensor","person","device_tracker"])}</datalist>
        <div id="m-ha-sched-list"></div>
        <button class="btn btn-secondary" id="m-add-ha-sched" style="font-size:12px;margin-top:6px">+ Zeitplan hinzufügen</button>
      </div>

      <div class="btn-row">
        <button class="btn btn-primary" id="modal-confirm">Zimmer hinzufügen</button>
        <button class="btn btn-secondary modal-close-btn">Abbrechen</button>
      </div>
    `, async () => {
      const modal = this.shadowRoot.querySelector("#modal-root .modal");
      const name = modal.querySelector("#m-name").value.trim();
      if (!name) { this._toast("❌ Bitte Zimmername eingeben"); return; }

      const valves  = [...modal.querySelectorAll("#valve-list input")].map(i => i.value.trim()).filter(Boolean);
      const windows = [...modal.querySelectorAll("#window-list input")].map(i => i.value.trim()).filter(Boolean);
      const ha_schedules = this._collectHaScheduleRows(modal);

      await this._callService("add_room", {
        name,
        temp_sensor:            modal.querySelector("#m-sensor").value.trim(),
        valve_entity:           valves[0] || "",
        valve_entities:         valves,
        window_sensor:          windows[0] || "",
        window_sensors:         windows,
        room_offset:            parseFloat(modal.querySelector("#m-offset").value),
        comfort_temp:           parseFloat(modal.querySelector("#m-comfort").value),
        eco_offset:             parseFloat(modal.querySelector("#m-eco-offset").value),
        eco_max_temp:           parseFloat(modal.querySelector("#m-eco-max").value),
        sleep_offset:           parseFloat(modal.querySelector("#m-sleep-offset").value),
        sleep_max_temp:         parseFloat(modal.querySelector("#m-sleep-max").value),
        away_offset:            parseFloat(modal.querySelector("#m-away-offset").value),
        away_max_temp:          parseFloat(modal.querySelector("#m-away-max").value),
        ha_schedule_off_mode:   modal.querySelector("#m-sched-off-mode")?.value || "eco",
        deadband:               parseFloat(modal.querySelector("#m-deadband").value),
        weight:                 parseFloat(modal.querySelector("#m-weight").value),
        humidity_sensor:        modal.querySelector("#m-humidity-sensor").value.trim(),
        mold_protection_enabled: modal.querySelector("#m-mold-enabled").value === "true",
        ha_schedules,
      });
      this._closeModal();
      this._toast("✓ Zimmer hinzugefügt – HA lädt Entitäten neu");
    });
    this._bindEntityListAdders();
    this._bindHaSchedAdder([], "m-ha-sched-list", "m-add-ha-sched");
  }

  _showEditRoomModal(entityId) {
    const rooms = this._getRoomData();
    const room  = rooms[entityId];
    if (!room) return;

    // Pre-fill existing valve entities
    const valveRows = room.valve_entities.length > 0
      ? room.valve_entities.map((e, i) => `
          <div class="entity-row">
            <input type="text" class="form-input" value="${e}"
              list="m-climate-list" autocomplete="off" placeholder="climate.entity">
            ${i === 0
              ? `<button class="btn btn-secondary btn-icon add-entity" data-list="valve-list" data-datalist="m-climate-list">+</button>`
              : `<button class="btn btn-danger btn-icon remove-entity">✕</button>`}
          </div>`).join("")
      : `<div class="entity-row">
           <input type="text" class="form-input" placeholder="climate.entity (optional)"
             list="m-climate-list" autocomplete="off">
           <button class="btn btn-secondary btn-icon add-entity" data-list="valve-list" data-datalist="m-climate-list">+</button>
         </div>`;

    // Pre-fill existing window sensors
    const windowRows = room.window_sensors.length > 0
      ? room.window_sensors.map((e, i) => `
          <div class="entity-row">
            <input type="text" class="form-input" value="${e}"
              list="m-binary-sensor-list" autocomplete="off" placeholder="binary_sensor.fenster">
            ${i === 0
              ? `<button class="btn btn-secondary btn-icon add-entity" data-list="window-list" data-datalist="m-binary-sensor-list">+</button>`
              : `<button class="btn btn-danger btn-icon remove-entity">✕</button>`}
          </div>`).join("")
      : `<div class="entity-row">
           <input type="text" class="form-input" placeholder="binary_sensor.fenster (optional)"
             list="m-binary-sensor-list" autocomplete="off">
           <button class="btn btn-secondary btn-icon add-entity" data-list="window-list" data-datalist="m-binary-sensor-list">+</button>
         </div>`;

    this._showModal(`
      <div class="modal-title">✏️ ${room.name} bearbeiten</div>

      <!-- Shared datalists for entity autocomplete -->
      <datalist id="m-climate-list">${this._entityOptions(["climate"])}</datalist>
      <datalist id="m-binary-sensor-list">${this._entityOptions(["binary_sensor"])}</datalist>
      <datalist id="m-sensor-list">${this._entityOptions(["sensor"])}</datalist>

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
          list="m-sensor-list" autocomplete="off">
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
        <div class="modal-section-title">Erweitert</div>
        <div class="settings-grid">
          <div class="settings-item">
            <label>Zimmer-Offset (°C)</label>
            <input type="number" class="form-input" id="m-offset" value="${room.room_offset}" step="0.5" min="-5" max="5">
          </div>
          <div class="settings-item">
            <label>Totband (°C)</label>
            <input type="number" class="form-input" id="m-deadband" value="${room.deadband}" step="0.1" min="0.1" max="2">
          </div>
          <div class="settings-item">
            <label>Gewichtung</label>
            <input type="number" class="form-input" id="m-weight" value="${room.weight}" step="0.1" min="0.1" max="5">
          </div>
        </div>
      </div>

      <div class="modal-section">
        <div class="modal-section-title">Schimmelschutz</div>
        <div class="settings-grid">
          <div class="settings-item">
            <label>Feuchtigkeitssensor</label>
            <input type="text" class="form-input" id="m-humidity-sensor"
              value="${room.humidity_sensor || ''}" placeholder="sensor.feuchte (optional)"
              list="m-sensor-list" autocomplete="off">
            <span class="form-hint">Schimmelrisiko-Erkennung</span>
          </div>
          <div class="settings-item">
            <label>Schimmelschutz</label>
            <select class="form-select" id="m-mold-protection">
              <option value="true" ${room.mold_protection_enabled !== false ? "selected" : ""}>Aktiviert</option>
              <option value="false" ${room.mold_protection_enabled === false ? "selected" : ""}>Deaktiviert</option>
            </select>
          </div>
        </div>
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
            <option value="eco"   ${(typeof room !== 'undefined' ? room.ha_schedule_off_mode : 'eco') === 'eco'   ? 'selected' : ''}>Eco-Temperatur</option>
            <option value="sleep" ${(typeof room !== 'undefined' ? room.ha_schedule_off_mode : 'eco') === 'sleep' ? 'selected' : ''}>Schlaf-Temperatur</option>
          </select>
        </div>
        <datalist id="m-schedule-list">${this._entityOptions(["schedule"])}</datalist>
        <datalist id="m-cond-list">${this._entityOptions(["input_boolean","binary_sensor","person","device_tracker"])}</datalist>
        <div id="m-ha-sched-list"></div>
        <button class="btn btn-secondary" id="m-add-ha-sched" style="font-size:12px;margin-top:6px">+ Zeitplan hinzufügen</button>
      </div>

      <div class="modal-section">
        <div class="modal-section-title">Schnell-Boost</div>
        <div class="form-row">
          <input type="number" class="form-input" id="m-boost-dur" value="60" min="5" max="480" step="5"> min
          <button class="btn btn-secondary" id="m-boost-btn">⚡ Boost starten</button>
        </div>
      </div>

      <div class="btn-row">
        <button class="btn btn-primary" id="modal-confirm">💾 Speichern</button>
        <button class="btn btn-secondary modal-close-btn">Abbrechen</button>
      </div>
    `, async () => {
      const modal  = this.shadowRoot.querySelector("#modal-root .modal");
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
        humidity_sensor:          modal.querySelector("#m-humidity-sensor")?.value.trim() || "",
        mold_protection_enabled:  modal.querySelector("#m-mold-protection")?.value === "true",
        ha_schedules,
      });
      this._closeModal();
      this._toast(`✓ ${room.name} gespeichert`);
    });

    // Boost button inside modal (doesn't close modal)
    setTimeout(() => {
      const boostBtn = this.shadowRoot.querySelector("#m-boost-btn");
      if (boostBtn) {
        boostBtn.addEventListener("click", () => {
          const dur = parseInt(this.shadowRoot.querySelector("#m-boost-dur").value) || 60;
          this._callService("boost_room", { id: room.room_id, duration_minutes: dur });
          this._toast(`⚡ Boost ${dur} min für ${room.name}`);
          this._closeModal();
        });
      }
    }, 50);

    this._bindEntityListAdders();
    this._bindHaSchedAdder(room.ha_schedules || [], "m-ha-sched-list", "m-add-ha-sched");
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
  }

  _closeModal() {
    const root = this.shadowRoot.querySelector("#modal-root");
    if (root) root.innerHTML = "";
    this._modalOpen = false;
  }

  /** Binds "+"-buttons that add entity rows to entity-list containers. */
  _bindEntityListAdders() {
    setTimeout(() => {
      this.shadowRoot.querySelectorAll(".add-entity").forEach(btn => {
        btn.addEventListener("click", () => {
          const listId    = btn.dataset.list;
          const datalistId = btn.dataset.datalist || "";
          const list      = this.shadowRoot.querySelector(`#${listId}`);
          if (!list) return;
          const placeholder = btn.closest(".entity-row").querySelector("input").placeholder;
          const row = document.createElement("div");
          row.className = "entity-row";
          row.innerHTML = `
            <input type="text" class="form-input" placeholder="${placeholder}"
              ${datalistId ? `list="${datalistId}"` : ""} autocomplete="off">
            <button class="btn btn-danger btn-icon remove-entity">✕</button>`;
          list.appendChild(row);
          row.querySelector(".remove-entity").addEventListener("click", () => row.remove());
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
        list="m-schedule-list" autocomplete="off" value="${entry.entity || ''}">
      <select class="form-select hs-mode" style="min-width:90px">
        <option value="comfort" ${(entry.mode||'comfort')==='comfort'?'selected':''}>Komfort</option>
        <option value="eco"     ${entry.mode==='eco'    ?'selected':''}>Eco</option>
        <option value="sleep"   ${entry.mode==='sleep'  ?'selected':''}>Schlaf</option>
        <option value="away"    ${entry.mode==='away'   ?'selected':''}>Abwesend</option>
      </select>
      <input type="text" class="form-input hs-cond" placeholder="Bedingung (optional)"
        list="m-cond-list" autocomplete="off" value="${entry.condition_entity || ''}">
      <input type="text" class="form-input hs-cond-state" placeholder="Zustand"
        style="width:70px" value="${entry.condition_state || 'on'}">
      <button class="btn btn-danger btn-icon hs-remove" title="Entfernen">✕</button>`;
    row.querySelector(".hs-remove").addEventListener("click", () => row.remove());
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

  async _callService(service, data) {
    if (!this._hass) return;
    try {
      await this._hass.callService(DOMAIN, service, data);
    } catch (e) {
      console.error("IHC service error:", service, e);
      this._toast("❌ Fehler: " + (e.message || "Unbekannt"));
    }
  }

  // ── Toast ──────────────────────────────────────────────────────────────────

  _toast(msg, ms = 3000) {
    const root = this.shadowRoot.querySelector("#toast-root");
    if (!root) return;
    if (this._toastTimeout) clearTimeout(this._toastTimeout);
    root.innerHTML = `<div class="toast">${msg}</div>`;
    this._toastTimeout = setTimeout(() => { root.innerHTML = ""; }, ms);
  }
}

customElements.define("ihc-panel", IHCPanel);
