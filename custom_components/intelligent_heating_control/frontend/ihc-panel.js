// === 00_constants.js ===
/**
 * 00_constants.js
 * IHC Frontend – Shared Constants
 * Contains: DOMAIN, DAYS, DAY_KEYS, MODE_LABELS, MODE_ICONS, SYSTEM_MODE_LABELS, WEATHER_CONDITIONS
 */

const DOMAIN = "intelligent_heating_control";
const DAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

const MODE_LABELS = {
  auto: "Auto", comfort: "Komfort", eco: "Eco",
  sleep: "Schlafen", away: "Abwesend", off: "Aus", manual: "Manuell",
  vacation: "Urlaub", guest: "Gäste", boost: "Boost"
};
const MODE_ICONS = {
  auto: "⚙️", comfort: "☀️", eco: "🌿", sleep: "🌙",
  away: "🚶", off: "⛔", manual: "✏️",
  vacation: "🏖️", guest: "👥", boost: "⚡"
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

// === 01_styles.css.js ===
/**
 * 01_styles.css.js
 * IHC Frontend – Complete CSS Design System (v4)
 * Contains: STYLES template literal with all component styles
 */

const STYLES = `
  :host { font-family: var(--paper-font-body1_-_font-family, Roboto, sans-serif); display: block; }
  * { box-sizing: border-box; }

  /* ── HA Top Bar ───────────────────────────────────────────────────────────── */
  .ha-topbar {
    position: sticky; top: 0; z-index: 200;
    display: flex; align-items: center; gap: 4px;
    height: 56px; padding: 0 4px 0 0;
    background: var(--app-header-background-color, var(--primary-color));
    color: var(--app-header-text-color, #fff);
    box-shadow: 0 2px 6px rgba(0,0,0,.25);
  }
  .ha-topbar .menu-btn {
    display: flex; align-items: center; justify-content: center;
    width: 48px; height: 48px; flex-shrink: 0;
    background: none; border: none; cursor: pointer;
    color: inherit; border-radius: 50%;
    transition: background 0.15s;
  }
  .ha-topbar .menu-btn:hover { background: rgba(255,255,255,.12); }
  .ha-topbar .menu-btn svg { width: 24px; height: 24px; fill: currentColor; }
  .ha-topbar .topbar-title {
    flex: 1; font-size: 20px; font-weight: 400; letter-spacing: 0.005em;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .ha-topbar .topbar-version {
    font-size: 10px; opacity: .7; font-weight: 600;
    border: 1px solid rgba(255,255,255,.4); padding: 2px 7px;
    border-radius: 10px; flex-shrink: 0; margin-right: 8px;
  }

  /* ── Layout ─────────────────────────────────────────────────────────────── */
  .panel { max-width: 1100px; margin: 0 auto; padding: 16px 16px 32px; }

  /* ── Tabs ─────────────────────────────────────────────────────────────────── */
  .tabs {
    display: flex; gap: 2px; margin-bottom: 20px; padding: 3px;
    background: var(--secondary-background-color, #f5f5f5);
    border-radius: 10px; overflow-x: auto; scrollbar-width: none;
  }
  .tabs::-webkit-scrollbar { display: none; }
  .tab {
    padding: 7px 14px; cursor: pointer; border-radius: 7px;
    color: var(--secondary-text-color); font-size: 12px; font-weight: 600;
    transition: all 0.15s; white-space: nowrap; user-select: none;
    background: transparent; border: none; flex-shrink: 0;
  }
  .tab.active {
    background: var(--card-background-color, #fff);
    color: var(--primary-color);
    box-shadow: 0 1px 4px rgba(0,0,0,.10);
  }
  .tab:hover:not(.active) { color: var(--primary-text-color); background: rgba(0,0,0,0.04); }

  /* ── Cards ─────────────────────────────────────────────────────────────────── */
  .card {
    background: var(--card-background-color, #fff); border-radius: 12px; padding: 18px 20px;
    margin-bottom: 14px; border: 1px solid var(--divider-color, #e5e5e5);
    box-shadow: 0 1px 3px rgba(0,0,0,.06);
  }
  .card-title {
    font-size: 14px; font-weight: 700; color: var(--primary-text-color);
    margin-bottom: 14px; display: flex; align-items: center; gap: 8px;
  }
  .card-subtitle { font-size: 12px; color: var(--secondary-text-color); margin-bottom: 14px; }

  /* ── Dashboard Hero ─────────────────────────────────────────────────────────── */
  .overview-hero {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 12px;
  }
  @media (max-width: 700px) { .overview-hero { grid-template-columns: 1fr 1fr; } }
  @media (max-width: 480px) { .overview-hero { grid-template-columns: 1fr; } }
  .hero-card {
    background: var(--card-background-color, #fff); border-radius: 12px; padding: 14px 16px;
    border: 1px solid var(--divider-color, #e5e5e5);
    box-shadow: 0 1px 3px rgba(0,0,0,.06);
    display: flex; flex-direction: column; gap: 3px;
  }
  .hero-label {
    font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px;
    color: var(--secondary-text-color); margin-bottom: 1px;
  }
  .hero-value { font-size: 24px; font-weight: 700; color: var(--primary-text-color); line-height: 1.15; }
  .hero-value.heating { color: #ef5350; }
  .hero-value.ok { color: #66bb6a; }
  .hero-sub { font-size: 11px; color: var(--secondary-text-color); }

  /* System mode quick-select pills */
  .system-mode-row {
    display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 14px; align-items: center;
  }
  .system-mode-label {
    font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.7px;
    color: var(--secondary-text-color); margin-right: 2px; flex-shrink: 0;
  }
  .sysmode-pill {
    padding: 5px 11px; border-radius: 16px; font-size: 11px; font-weight: 600;
    border: 1.5px solid var(--divider-color, #e5e5e5); cursor: pointer;
    transition: all 0.15s; color: var(--secondary-text-color); background: transparent;
    display: inline-flex; align-items: center; gap: 3px; white-space: nowrap;
  }
  .sysmode-pill:hover { border-color: var(--primary-color); color: var(--primary-color); }
  .sysmode-pill.active-auto     { background: var(--primary-color); color: #fff; border-color: var(--primary-color); }
  .sysmode-pill.active-heat     { background: #ef5350; color: #fff; border-color: #ef5350; }
  .sysmode-pill.active-cool     { background: #42a5f5; color: #fff; border-color: #42a5f5; }
  .sysmode-pill.active-away     { background: #ffa726; color: #fff; border-color: #ffa726; }
  .sysmode-pill.active-vacation { background: #66bb6a; color: #fff; border-color: #66bb6a; }
  .sysmode-pill.active-off      { background: #9e9e9e; color: #fff; border-color: #9e9e9e; }
  .sysmode-pill.active-guest    { background: #ab47bc; color: #fff; border-color: #ab47bc; }

  /* ── Status strip ────────────────────────────────────────────────────────────── */
  .status-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 12px; margin-bottom: 16px;
  }
  .status-item {
    background: var(--card-background-color, #fff); border-radius: 10px; padding: 10px 12px;
    border: 1px solid var(--divider-color, #e5e5e5);
    box-shadow: 0 1px 2px rgba(0,0,0,.05); text-align: center;
  }
  .status-label {
    font-size: 10px; color: var(--secondary-text-color); text-transform: uppercase;
    letter-spacing: 0.6px; margin-bottom: 4px;
  }
  .status-value { font-size: 16px; font-weight: 700; color: var(--primary-text-color); }
  .status-value.on  { color: #ef5350; }
  .status-value.ok  { color: #66bb6a; }
  .status-value.warn { color: #ffa726; }

  /* ── Room cards ──────────────────────────────────────────────────────────────── */
  .rooms-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(275px, 1fr)); gap: 12px; }
  .room-card {
    background: var(--card-background-color, #fff); border-radius: 12px;
    border: 1px solid var(--divider-color, #e5e5e5);
    border-left: 4px solid var(--divider-color, #e0e0e0);
    box-shadow: 0 1px 4px rgba(0,0,0,.06);
    transition: box-shadow 0.2s, border-left-color 0.25s;
    overflow: hidden;
  }
  .room-card:hover { box-shadow: 0 4px 14px rgba(0,0,0,.11); }
  .room-card.heating     { border-left-color: #ef5350; }
  .room-card.satisfied   { border-left-color: #66bb6a; }
  .room-card.window-open { border-left-color: #42a5f5; }
  .room-card.off         { border-left-color: #bdbdbd; }
  .room-card.eco         { border-left-color: #26a69a; }
  .room-card.away        { border-left-color: #ffa726; }
  .room-card.sleep       { border-left-color: #5c6bc0; }

  /* Card inner padding */
  .room-card-inner { padding: 14px 16px 12px; }

  /* Room header row */
  .room-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    gap: 8px; margin-bottom: 10px;
  }
  .room-name { font-size: 14px; font-weight: 700; color: var(--primary-text-color); line-height: 1.2; }
  .room-status-chips { display: flex; gap: 4px; flex-wrap: wrap; flex-shrink: 0; }

  /* Temperature hero */
  .room-temp-row {
    display: flex; align-items: flex-end; gap: 10px; margin-bottom: 10px;
  }
  .room-temp-current {
    display: flex; flex-direction: column;
  }
  .room-temp-big {
    font-size: 38px; font-weight: 300; color: var(--primary-text-color); line-height: 1;
    letter-spacing: -1px;
  }
  .room-temp-unit-big { font-size: 18px; font-weight: 400; color: var(--secondary-text-color); }
  .room-temp-lbl {
    font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.7px;
    color: var(--secondary-text-color); margin-top: 2px;
  }
  .room-temp-target {
    display: flex; flex-direction: column; align-items: flex-start;
    margin-bottom: 4px; min-width: 0;
  }
  .room-temp-target-val {
    font-size: 20px; font-weight: 700; color: var(--primary-color); line-height: 1.1;
  }
  .room-temp-target-lbl {
    font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px;
    color: var(--secondary-text-color);
  }
  .room-temp-diff {
    font-size: 11px; margin-left: 4px; line-height: 1.1;
  }

  /* Demand bar */
  .demand-wrap { margin-bottom: 6px; }
  .demand-bar-bg {
    background: var(--secondary-background-color, #f0f0f0); border-radius: 4px;
    height: 5px; overflow: hidden;
  }
  .demand-bar { height: 100%; border-radius: 4px; transition: width 0.6s ease, background 0.4s; }
  .demand-meta {
    font-size: 10px; color: var(--secondary-text-color); margin-top: 4px;
    display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  }

  /* Alert strips within room card */
  .room-alerts { display: flex; flex-direction: column; gap: 3px; margin-bottom: 8px; }
  .room-alert {
    display: flex; align-items: center; gap: 5px; padding: 3px 8px;
    border-radius: 5px; font-size: 10px; font-weight: 600; line-height: 1.3;
  }
  .room-alert.alert-warn { background: #fff3e0; color: #e65100; }
  .room-alert.alert-info { background: #e3f2fd; color: #1565c0; }
  .room-alert.alert-danger { background: #fce4ec; color: #c62828; }
  .room-alert.alert-eco { background: #e8f5e9; color: #2e7d32; }
  .room-alert.alert-override { background: #fff8e1; color: #f57f17; }

  /* TRV chips */
  .trv-chips { display: flex; gap: 4px; flex-wrap: wrap; margin: 4px 0 6px; }
  .trv-chip {
    font-size: 10px; padding: 2px 7px; border-radius: 8px;
    display: inline-flex; align-items: center; gap: 3px;
  }

  /* Mode + boost action row */
  .room-action-row { display: flex; gap: 6px; align-items: center; padding-top: 8px;
                     border-top: 1px solid var(--divider-color, #e5e5e5); }
  .mode-select {
    flex: 1; padding: 5px 8px; border-radius: 8px; font-size: 11px; font-weight: 600;
    border: 1.5px solid var(--divider-color, #e0e0e0);
    background: var(--secondary-background-color, #f5f5f5);
    color: var(--primary-text-color); cursor: pointer; appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23888'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right 8px center;
    padding-right: 22px; min-height: 32px;
  }
  .mode-select.active-auto     { border-color: var(--primary-color);  background: color-mix(in srgb, var(--primary-color) 12%, transparent); }
  .mode-select.active-comfort  { border-color: #fb8c00; background: color-mix(in srgb, #fb8c00 15%, transparent); }
  .mode-select.active-eco      { border-color: #43a047; background: color-mix(in srgb, #43a047 15%, transparent); }
  .mode-select.active-sleep    { border-color: #5c6bc0; background: color-mix(in srgb, #5c6bc0 15%, transparent); }
  .mode-select.active-away     { border-color: #e65100; background: color-mix(in srgb, #e65100 15%, transparent); }
  .mode-select.active-off      { border-color: #9e9e9e; background: color-mix(in srgb, #9e9e9e 15%, transparent); }
  .mode-select.active-manual   { border-color: #8d6e63; background: color-mix(in srgb, #8d6e63 15%, transparent); }
  .btn-boost {
    padding: 5px 10px; border-radius: 8px; border: 1.5px solid #ff7043;
    background: transparent; color: #ff7043; font-size: 11px; font-weight: 700;
    cursor: pointer; white-space: nowrap; transition: all 0.15s; flex-shrink: 0; min-height: 32px;
  }
  .btn-boost:hover { background: #ff7043; color: white; }

  /* Room footer info */
  .room-footer {
    display: flex; align-items: center; justify-content: space-between;
    margin-top: 6px; min-height: 18px;
  }
  .room-footer-meta { font-size: 10px; color: var(--secondary-text-color); }

  /* ── Badge / chips ────────────────────────────────────────────────────────── */
  .badge {
    display: inline-flex; align-items: center; gap: 3px; padding: 2px 7px;
    border-radius: 9px; font-size: 10px; font-weight: 700; line-height: 1.4;
  }
  .badge-heat   { background: #fce4ec; color: #c62828; }
  .badge-ok     { background: #e8f5e9; color: #2e7d32; }
  .badge-off    { background: #f0f0f0; color: #757575; }
  .badge-window { background: #e3f2fd; color: #1565c0; }
  .badge-eco    { background: #e0f2f1; color: #00695c; }
  .badge-away   { background: #fff3e0; color: #e65100; }
  .badge-boost  { background: #fbe9e7; color: #bf360c; }
  .badge-summer { background: #fffde7; color: #f57f17; }
  .badge-sleep  { background: #ede7f6; color: #4527a0; }

  /* ── System banners ─────────────────────────────────────────────────────── */
  .system-banner {
    display: flex; align-items: center; gap: 8px; padding: 9px 14px;
    border-radius: 8px; margin-bottom: 10px; font-size: 12px; font-weight: 600;
    border-left: 3px solid currentColor;
  }
  .system-banner.summer   { background: #fffde7; color: #f57f17; }
  .system-banner.night    { background: #e8eaf6; color: #3949ab; }
  .system-banner.away     { background: #fff8e1; color: #f57f17; }
  .system-banner.solar    { background: #fffde7; color: #f9a825; }
  .system-banner.cold     { background: #e8eaf6; color: #283593; }
  .system-banner.price    { background: #fce4ec; color: #c62828; }
  .system-banner.vacation { background: #e8f5e9; color: #2e7d32; }
  .system-banner.preheat  { background: #e3f2fd; color: #1565c0; }
  .system-banner.guest    { background: #fce4ec; color: #880e4f; }
  .system-banner.eta      { background: #e8f5e9; color: #2e7d32; }

  /* ── Room list (Zimmer-Tab) ─────────────────────────────────────────────── */
  .room-list-item {
    display: flex; align-items: center; gap: 12px; padding: 12px 16px;
    border-bottom: 1px solid var(--divider-color, #e5e5e5); cursor: default;
    transition: background 0.1s;
  }
  .room-list-item:hover { background: var(--secondary-background-color, #f9f9f9); }
  .room-list-item:last-child { border-bottom: none; }
  .room-list-indicator {
    width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;
    background: var(--divider-color, #e0e0e0);
  }
  .room-list-indicator.heating { background: #ef5350; }
  .room-list-indicator.ok { background: #66bb6a; }
  .room-list-indicator.window { background: #42a5f5; }
  .room-list-indicator.off { background: #bdbdbd; }
  .room-list-left { flex: 1; min-width: 0; }
  .room-list-name { font-weight: 600; font-size: 14px; color: var(--primary-text-color); }
  .room-list-meta { font-size: 11px; color: var(--secondary-text-color); margin-top: 2px; }
  .room-list-actions { display: flex; gap: 5px; flex-shrink: 0; }

  /* ── Forms ──────────────────────────────────────────────────────────────── */
  .form-group { margin-bottom: 14px; }
  .form-label {
    font-size: 12px; font-weight: 600; color: var(--primary-text-color);
    margin-bottom: 5px; display: block;
  }
  .form-hint  { font-size: 11px; color: var(--secondary-text-color); margin-top: 4px; line-height: 1.45; }
  .form-row   { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .form-input {
    flex: 1; min-width: 90px; padding: 7px 10px; border-radius: 6px;
    border: 1.5px solid var(--divider-color, #e0e0e0);
    background: var(--card-background-color, #fff);
    color: var(--primary-text-color); font-size: 13px;
    transition: border-color 0.15s; line-height: 1.4;
  }
  .form-input:focus { outline: none; border-color: var(--primary-color);
                      box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary-color) 15%, transparent); }
  .form-input.full { width: 100%; flex: none; }
  .form-select {
    flex: 1; min-width: 120px; padding: 7px 10px; border-radius: 6px;
    border: 1.5px solid var(--divider-color, #e0e0e0);
    background: var(--card-background-color, #fff);
    color: var(--primary-text-color); font-size: 13px; cursor: pointer;
  }
  .form-select:focus { outline: none; border-color: var(--primary-color);
                       box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary-color) 15%, transparent); }

  /* Entity list */
  .entity-list { display: flex; flex-direction: column; gap: 5px; }
  .entity-row { display: flex; gap: 5px; align-items: center; }
  .entity-row .form-input { flex: 1; }

  /* ── Buttons ────────────────────────────────────────────────────────────── */
  .btn {
    display: inline-flex; align-items: center; gap: 5px; padding: 7px 14px;
    border-radius: 7px; border: none; cursor: pointer; font-size: 12px; font-weight: 600;
    transition: all 0.15s; line-height: 1.4; white-space: nowrap;
  }
  .btn:disabled { opacity: 0.45; cursor: not-allowed; }
  .btn-primary   { background: var(--primary-color); color: #fff; }
  .btn-primary:hover:not(:disabled) { filter: brightness(1.08); }
  .btn-danger    { background: #ef5350; color: #fff; }
  .btn-danger:hover:not(:disabled)  { background: #e53935; }
  .btn-secondary {
    background: var(--secondary-background-color, #f5f5f5);
    color: var(--primary-text-color); border: 1.5px solid var(--divider-color, #e0e0e0);
  }
  .btn-secondary:hover:not(:disabled) { background: var(--divider-color, #e0e0e0); }
  .btn-icon { padding: 6px 8px; font-size: 15px; }
  .btn-row { display: flex; gap: 7px; flex-wrap: wrap; margin-top: 14px; }

  /* ── Settings sections ──────────────────────────────────────────────────── */
  .settings-section { margin-bottom: 20px; }
  .settings-section-title {
    font-size: 10px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.9px; color: var(--secondary-text-color); margin-bottom: 10px;
  }
  .settings-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
  .settings-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .settings-item { display: flex; flex-direction: column; gap: 4px; }
  .settings-item label { font-size: 11px; font-weight: 600; color: var(--secondary-text-color); }

  /* Collapsible cards */
  details.ihc-card {
    background: var(--card-background-color,#fff); border-radius: 12px;
    margin-bottom: 12px; border: 1px solid var(--divider-color, #e5e5e5);
    box-shadow: 0 1px 3px rgba(0,0,0,.05); overflow: hidden;
  }
  details.ihc-card > summary {
    list-style: none; cursor: pointer; padding: 14px 18px;
    display: flex; align-items: center; justify-content: space-between;
    user-select: none; gap: 8px;
  }
  details.ihc-card > summary::-webkit-details-marker { display: none; }
  details.ihc-card > summary::after {
    content: "›"; font-size: 18px; color: var(--secondary-text-color);
    transition: transform 0.2s; flex-shrink: 0; line-height: 1;
  }
  details.ihc-card[open] > summary::after { transform: rotate(90deg); }
  details.ihc-card > summary:hover { background: var(--secondary-background-color, #f9f9f9); }
  .ihc-card-body { padding: 0 18px 18px; }
  .ihc-card-title {
    font-size: 14px; font-weight: 700; color: var(--primary-text-color);
    display: flex; align-items: center; gap: 7px; flex: 1;
  }
  .ihc-card-badge {
    font-size: 10px; padding: 2px 7px; border-radius: 8px; font-weight: 700;
    background: #66bb6a; color: white; margin-left: 4px;
  }
  .ihc-card-badge.warn { background: #ffa726; }
  .ihc-card-badge.info { background: var(--primary-color); }

  /* ── Schedule editor ────────────────────────────────────────────────────── */
  .day-chips { display: flex; gap: 4px; flex-wrap: wrap; }
  .day-chip {
    width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center;
    justify-content: center; cursor: pointer; font-size: 10px; font-weight: 700;
    border: 2px solid var(--divider-color, #e0e0e0); transition: all 0.15s;
    color: var(--secondary-text-color);
  }
  .day-chip.selected { background: var(--primary-color); color: #fff; border-color: var(--primary-color); }
  .period-row { display: grid; grid-template-columns: 90px 90px 70px 60px 34px;
                gap: 5px; align-items: center; margin-bottom: 5px; }
  .period-header { display: grid; grid-template-columns: 90px 90px 70px 60px 34px;
                   gap: 5px; font-size: 10px; font-weight: 700; color: var(--secondary-text-color);
                   margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.4px; }
  .sched-block {
    border: 1px solid var(--divider-color, #e0e0e0); border-radius: 8px;
    padding: 12px; margin-bottom: 8px; background: var(--secondary-background-color, #fafafa);
  }

  /* ── Heating curve ──────────────────────────────────────────────────────── */
  .curve-table { width: 100%; border-collapse: collapse; }
  .curve-table th, .curve-table td {
    padding: 8px 10px; text-align: left;
    border-bottom: 1px solid var(--divider-color, #e0e0e0);
  }
  .curve-table th { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--secondary-text-color); }
  .curve-table input {
    width: 80px; padding: 5px 8px; border-radius: 5px;
    border: 1.5px solid var(--divider-color, #e0e0e0);
    background: var(--card-background-color, #fff);
    color: var(--primary-text-color); font-size: 13px;
  }
  .curve-table input:focus { outline: none; border-color: var(--primary-color); }

  /* ── Modal ──────────────────────────────────────────────────────────────── */
  .modal-backdrop {
    position: fixed; inset: 0; background: rgba(0,0,0,0.40);
    backdrop-filter: blur(5px); z-index: 999;
    display: flex; align-items: center; justify-content: center; padding: 16px;
  }
  .modal {
    background: var(--card-background-color, #fff); border-radius: 14px;
    padding: 22px 24px; max-width: 600px; width: 100%; max-height: 90vh;
    overflow-y: auto; position: relative;
    box-shadow: 0 10px 50px rgba(0,0,0,.22);
    animation: modal-in 0.18s ease;
    border: 1px solid var(--divider-color, #e5e5e5);
  }
  @keyframes modal-in { from { transform: scale(0.96) translateY(8px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
  .modal-title {
    font-size: 17px; font-weight: 700; margin-bottom: 18px;
    padding-right: 32px; color: var(--primary-text-color);
  }
  .modal-close {
    position: absolute; top: 16px; right: 16px; cursor: pointer;
    font-size: 16px; line-height: 1; background: var(--secondary-background-color, #f5f5f5);
    border: none; border-radius: 50%; width: 28px; height: 28px;
    display: flex; align-items: center; justify-content: center;
    color: var(--secondary-text-color); transition: background 0.15s;
  }
  .modal-close:hover { background: var(--divider-color, #e0e0e0); }
  .modal-section { border-top: 1px solid var(--divider-color, #e0e0e0); margin-top: 14px; padding-top: 14px; }
  .modal-section-title {
    font-size: 10px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.8px; color: var(--secondary-text-color); margin-bottom: 10px;
  }
  .modal .settings-grid { grid-template-columns: 1fr; }
  .modal-collapsible { border-top: 1px solid var(--divider-color, #e0e0e0); margin-top: 14px; }
  .modal-collapsible > summary {
    padding: 12px 0; cursor: pointer; list-style: none;
    font-size: 11px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.7px; color: var(--secondary-text-color);
    display: flex; align-items: center; gap: 6px; user-select: none;
  }
  .modal-collapsible > summary::before { content: "▸"; font-size: 10px; transition: transform 0.15s; }
  .modal-collapsible[open] > summary::before { content: "▾"; }
  .modal-collapsible > summary:hover { color: var(--primary-color); }
  .modal-collapsible .modal-collapsible-body { padding-bottom: 4px; }

  /* ── Toast ──────────────────────────────────────────────────────────────── */
  .toast {
    position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
    background: #1e1e1e; color: #fff; padding: 10px 20px; border-radius: 8px;
    z-index: 2000; font-size: 13px; font-weight: 500;
    box-shadow: 0 4px 20px rgba(0,0,0,.3);
    animation: toast-in 0.18s ease; pointer-events: none; white-space: nowrap;
  }
  @keyframes toast-in { from { opacity: 0; transform: translateX(-50%) translateY(6px); }
                        to   { opacity: 1; transform: translateX(-50%) translateY(0); } }

  /* ── Info / hint boxes ──────────────────────────────────────────────────── */
  .info-box {
    background: color-mix(in srgb, var(--primary-color) 8%, transparent);
    border-left: 3px solid var(--primary-color);
    padding: 9px 13px; border-radius: 6px; font-size: 12px; margin-bottom: 14px;
    line-height: 1.5; color: var(--primary-text-color);
  }

  /* ── Spinner ────────────────────────────────────────────────────────────── */
  .spinner {
    display: inline-block; width: 16px; height: 16px;
    border: 2px solid var(--divider-color, #e0e0e0);
    border-top-color: var(--primary-color); border-radius: 50%;
    animation: spin 0.7s linear infinite; vertical-align: middle;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  hr.divider { border: none; border-top: 1px solid var(--divider-color, #e0e0e0); margin: 14px 0; }

  /* Quick mode chips (legacy, kept for compat) */
  .mode-chips { display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 8px; }
  .mode-chip {
    padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: 600;
    border: 1.5px solid var(--divider-color); cursor: pointer; transition: all 0.15s;
    color: var(--secondary-text-color); background: transparent;
    display: inline-flex; align-items: center; gap: 3px;
  }
  .mode-chip:hover { border-color: var(--primary-color); color: var(--primary-color); }
  .mode-chip.active { background: var(--primary-color); color: white; border-color: var(--primary-color); }
  .mode-chip.boost { border-color: #ff7043; color: #ff7043; }
  .mode-chip.boost:hover, .mode-chip.boost.active { background: #ff7043; color: white; }

  /* ── Entity picker ──────────────────────────────────────────────────────── */
  .ep-wrap { position: relative; }
  .ep-dropdown {
    position: fixed; z-index: 99999;
    background: var(--card-background-color, #fff);
    border: 1.5px solid var(--primary-color);
    border-radius: 9px; box-shadow: 0 6px 24px rgba(0,0,0,.18);
    max-height: 280px; overflow-y: auto; min-width: 420px;
  }
  .ep-item {
    display: flex; align-items: center; gap: 8px; padding: 7px 10px; cursor: pointer;
    border-bottom: 1px solid var(--divider-color, #e0e0e0); transition: background 0.08s;
  }
  .ep-item:last-child { border-bottom: none; }
  .ep-item:hover, .ep-item.ep-focused { background: var(--secondary-background-color, #f5f5f5); }
  .ep-badge {
    font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 9px;
    white-space: nowrap; text-transform: lowercase; flex-shrink: 0;
  }
  .ep-d-sensor        { background: #e3f2fd; color: #1565c0; }
  .ep-d-climate       { background: #e0f2f1; color: #00695c; }
  .ep-d-switch        { background: #fff3e0; color: #e65100; }
  .ep-d-binary_sensor { background: #f3e5f5; color: #6a1b9a; }
  .ep-d-weather       { background: #e8f5e9; color: #2e7d32; }
  .ep-d-number        { background: #fce4ec; color: #880e4f; }
  .ep-d-input_boolean { background: #fff8e1; color: #f57f17; }
  .ep-d-person        { background: #e8eaf6; color: #283593; }
  .ep-d-device_tracker{ background: #e8eaf6; color: #283593; }
  .ep-d-other         { background: #f5f5f5; color: #616161; }
  .ep-info { flex: 1; min-width: 0; }
  .ep-name { font-size: 13px; font-weight: 600; color: var(--primary-text-color);
             overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ep-id   { font-size: 11px; color: var(--secondary-text-color);
             overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ep-state { font-size: 11px; font-weight: 600; color: var(--secondary-text-color);
              flex-shrink: 0; white-space: nowrap; margin-left: auto; }
  .ep-empty { padding: 12px; text-align: center; color: var(--secondary-text-color);
              font-size: 12px; font-style: italic; }

  /* ── Responsive ─────────────────────────────────────────────────────────── */
  @media (max-width: 600px) {
    .panel { padding: 10px 10px 28px; }
    .tabs { gap: 1px; }
    .tab { padding: 7px 10px; font-size: 11px; }
    .rooms-grid { grid-template-columns: 1fr; }
    .status-grid { grid-template-columns: repeat(2, 1fr); }
    .settings-grid, .settings-grid-2 { grid-template-columns: 1fr; }
    .period-row, .period-header { grid-template-columns: 80px 80px 65px 55px 30px; gap: 4px; }
    .btn { min-height: 42px; }
    .form-input, .form-select { min-height: 42px; font-size: 16px; }
    .card { padding: 12px 14px; }
    .overview-hero { grid-template-columns: 1fr 1fr; }
    .room-temp-big { font-size: 32px; }
  }
  @media (max-width: 400px) {
    .tab { padding: 6px 8px; font-size: 10px; }
    .overview-hero { grid-template-columns: 1fr; }
  }
`;

// === 09_main.js (Part A: class open + lifecycle) ===
/**
 * 09_main.js
 * IHC Frontend – Web Component Class
 * Contains:
 *   PART A: class IHCPanel declaration, constructor, lifecycle methods,
 *           set hass(), _startAutoRefresh(), _render(), _updateActiveTab(), _renderTabContent()
 *   PART B (after all method files): class closing brace + customElements.define()
 *
 * Build note: build.py splits this file at the marker comment and inserts
 * method files (02-08) between Part A and Part B.
 */

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
    this._selectedRoom = null;        // entity_id of room shown in detail view
    this._selectedRoomTab = "schedule"; // "schedule" | "calendar"
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

    // Safety net: if the content area is empty (e.g. after HA reconnect / panel
    // remount), schedule a re-render for the next animation frame so the user
    // doesn't see a permanent black screen.
    if (!this._pendingRender) {
      const content = this.shadowRoot?.querySelector("#tab-content");
      if (content && content.childElementCount === 0) {
        this._pendingRender = true;
        requestAnimationFrame(() => {
          this._pendingRender = false;
          if (this._hass) {
            try { this._renderTabContent(); } catch(e) { console.error("IHC recovery render error:", e); }
          }
        });
      }
    }
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
    // Track pointer interactions so we never rebuild DOM during a click.
    // On mobile, browsers delay the click event up to 300ms after pointerup
    // (double-tap prevention). We clear the flag after a 400ms grace period
    // so the 5s timer never re-renders the DOM in that window.
    const sr = this.shadowRoot;
    if (!this._interactionTracked) {
      this._interactionTracked = true;
      sr.addEventListener("pointerdown", () => {
        this._userInteracting = true;
        if (this._interactionTimer) clearTimeout(this._interactionTimer);
      }, true);
      const _clearInteraction = () => {
        if (this._interactionTimer) clearTimeout(this._interactionTimer);
        this._interactionTimer = setTimeout(() => { this._userInteracting = false; }, 400);
      };
      sr.addEventListener("pointerup",     _clearInteraction, true);
      sr.addEventListener("pointercancel", _clearInteraction, true);
    }
    this._refreshTimer = setInterval(() => {
      if (!this._hass || this._modalOpen || this._userInteracting) return;
      const content = this.shadowRoot?.querySelector("#tab-content");
      // Always re-render if the content area is empty (recovery from blank screen)
      const isEmpty = content && content.childElementCount === 0;
      if (isEmpty || this._activeTab === "overview" || this._activeTab === "diagnose") {
        try { this._renderTabContent(); } catch(e) { console.error("IHC refresh error:", e); }
      }
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

    // ── HA Standard Top Bar (sticky, opens sidebar on click) ──────────────
    if (!shadow.querySelector(".ha-topbar")) {
      const topbar = document.createElement("div");
      topbar.className = "ha-topbar";
      topbar.innerHTML = `
        <button class="menu-btn" id="ihc-menu-btn" title="Menü öffnen" aria-label="Menü öffnen">
          <svg viewBox="0 0 24 24"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>
        </button>
        <span class="topbar-title">Intelligent Heating Control</span>
        <span class="topbar-version">v1.4</span>
      `;
      shadow.appendChild(topbar);
      // Toggle HA sidebar – single event only (dispatching multiple events causes double-toggle)
      topbar.querySelector("#ihc-menu-btn").addEventListener("click", () => {
        // Primary: modern HA 2023+ event (home-assistant-main listens on window)
        window.dispatchEvent(new CustomEvent("hass-toggle-menu"));
        // Fallback: if hass-toggle-menu had no effect (desktop wide-mode),
        // try direct drawer manipulation.
        try {
          const haEl = document.querySelector("home-assistant");
          const haMain = haEl?.shadowRoot?.querySelector("home-assistant-main");
          if (haMain) {
            const drawer = haMain.shadowRoot?.querySelector("ha-drawer");
            if (drawer && typeof drawer.open !== "undefined") {
              drawer.open = !drawer.open;
            }
          }
        } catch (_) { /* ignore */ }
      });
    }

    if (!shadow.querySelector(".panel")) {
      const div = document.createElement("div");
      div.className = "panel";
      shadow.appendChild(div);
    }

    const panel = shadow.querySelector(".panel");

    // Build permanent structure (only once)
    panel.innerHTML = `
      <div class="tabs">
        <div class="tab" data-tab="overview">🏠 Dashboard</div>
        <div class="tab" data-tab="rooms">🚪 Zimmer</div>
        <div class="tab" data-tab="diagnose">📊 Übersicht</div>
        <div class="tab" data-tab="settings">⚙️ Einstellungen</div>
        <div class="tab" data-tab="curve">📈 Heizkurve</div>
      </div>
      <div id="tab-content"></div>
    `;

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
    // Clean up any entity picker dropdowns from the previous render before replacing content
    this._cleanupEntityPickers(content);
    try {
      switch (this._activeTab) {
        case "overview":   this._renderOverview(content); break;
        case "rooms":      this._renderRooms(content); break;
        case "diagnose":   this._renderDiagnose(content); break;
        case "settings":   this._renderSettings(content); break;
        case "curve":      this._renderCurve(content); break;
      }
    } catch(e) {
      console.error("IHC render error:", e);
      // Show recoverable error state instead of blank/black screen
      content.innerHTML = `<div class="info-box" style="color:var(--error-color,#ef5350)">
        ⚠️ Darstellungsfehler (${this._activeTab}): ${e.message || "Unbekannt"}<br>
        <small style="opacity:.7">Bitte Tab wechseln oder die Seite neu laden. Details in der Browser-Konsole.</small>
      </div>`;
    }
  }

  // ── Data Helpers ───────────────────────────────────────────────────────────



// === 02_utils.js ===
/**
 * 02_utils.js
 * IHC Frontend – Utility / Helper Methods
 * Contains: _st, _getRoomData, _getGlobal, _fmt, _demandColor, _sparkline,
 *           _callService, _kwh, _costStr, _toast,
 *           _entityOptions, _attachEntityPickers, _cleanupEntityPickers,
 *           _renderPresenceCheckboxes,
 *           _bindEntityListAdders, _makeHaSchedRow, _bindHaSchedAdder, _collectHaScheduleRows
 * These are all non-tab helper methods that belong to IHCPanel.
 */

// NOTE: These methods are defined on IHCPanel.prototype below the class body
// to keep this file self-contained as a logical fragment.
// When build.py concatenates the files, they are inserted INSIDE the class
// via the 09_main.js class body that uses Object.assign or prototype extension.
//
// ACTUALLY: build.py simply concatenates all files.  The class declaration in
// 09_main.js OPENS the class brace, and all method files (02-08) are placed
// BETWEEN the opening brace (in 09_main.js) and the closing brace + registration
// (also in 09_main.js).  This file is a raw JS fragment – NOT a standalone module.

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
        target_history: [],
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
        // Energy
        radiator_kw: state.attributes.radiator_kw ?? 1.0,
        hkv_sensor: state.attributes.hkv_sensor || "",
        hkv_factor: state.attributes.hkv_factor ?? 0.083,
        energy_today_kwh: state.attributes.energy_today_kwh ?? 0,
        // Presence (per-room)
        room_presence_entities: state.attributes.room_presence_entities || [],
        // Humidity & mold
        humidity_sensor: state.attributes.humidity_sensor || "",
        mold_protection_enabled: state.attributes.mold_protection_enabled !== false,
        // Boost config
        boost_default_duration: state.attributes.boost_default_duration ?? 60,
        // HA schedule blocks (from schedule.* entity config entries)
        ha_schedule_blocks: state.attributes.ha_schedule_blocks || {},
        // Per-room advanced settings
        absolute_min_temp: state.attributes.absolute_min_temp ?? 15,
        room_qm: state.attributes.room_qm ?? 0,
        room_preheat_minutes: state.attributes.room_preheat_minutes ?? -1,
        window_reaction_time: state.attributes.window_reaction_time ?? 30,
        window_close_delay: state.attributes.window_close_delay ?? 0,
        effective_weight: state.attributes.effective_weight ?? state.attributes.weight ?? 1.0,
        // TRV sensor data integration
        trv_temp_weight:  state.attributes.trv_temp_weight ?? 0,
        trv_temp_offset:  state.attributes.trv_temp_offset ?? -2,
        trv_valve_demand: state.attributes.trv_valve_demand === true,
        trv_raw_temp:     state.attributes.trv_raw_temp ?? null,
        trv_humidity:     state.attributes.trv_humidity ?? null,
        trv_avg_valve:    state.attributes.trv_avg_valve ?? null,
        trv_any_heating:  state.attributes.trv_any_heating === true,
        trv_min_battery:  state.attributes.trv_min_battery ?? null,
        trv_low_battery:  state.attributes.trv_low_battery === true,
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
        if (state.attributes.target_history !== undefined)
          rooms[climateId].target_history = state.attributes.target_history;
        if (state.attributes.avg_warmup_minutes !== undefined)
          rooms[climateId].avg_warmup_minutes = state.attributes.avg_warmup_minutes;
        if (state.attributes.room_presence_active !== undefined)
          rooms[climateId].room_presence_active = state.attributes.room_presence_active;
        if (state.attributes.mold !== undefined)
          rooms[climateId].mold = state.attributes.mold;
        if (state.attributes.ventilation !== undefined)
          rooms[climateId].ventilation = state.attributes.ventilation;
        if (state.attributes.co2_ppm !== undefined)
          rooms[climateId].co2_ppm = state.attributes.co2_ppm;
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
      system_mode:               a.system_mode || (sel ? sel.state : "—"),
      curve_target:              ct  ? parseFloat(ct.state) : null,
      outdoor_temp:              ot  ? parseFloat(ot.state) : null,
      rooms_demanding:           a.rooms_demanding || 0,
      summer_mode:               a.summer_mode || false,
      forecast_coldnight_active: a.forecast_coldnight_active || false,
      forecast_advance_hours:    a.forecast_advance_hours ?? 3,
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
      eta_preheat_minutes:       ea.eta_preheat_minutes != null ? parseFloat(ea.eta_preheat_minutes) : null,
      adaptive_curve_delta:      ea.adaptive_curve_delta != null ? parseFloat(ea.adaptive_curve_delta) : 0,
      outdoor_humidity:          a.outdoor_humidity != null ? parseFloat(a.outdoor_humidity) : null,
      static_energy_price:       a.static_energy_price != null ? parseFloat(a.static_energy_price) : null,
      boiler_kw:                 a.boiler_kw != null ? parseFloat(a.boiler_kw) : null,
      groups:                    a.groups || [],
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

  // ── Energy correction factor ────────────────────────────────────────────────
  // Applies the user-set calibration factor (stored in localStorage) to kWh values.
  _kwh(raw) {
    const factor = parseFloat(localStorage.getItem("ihc_energy_factor") || "1") || 1;
    return Math.round(raw * factor * 10) / 10;
  }

  // Returns the "costs" display string: "X kWh" or "X kWh · Y €" if static price configured.
  // price = optional override (from room radiator_kw etc), falls back to global static_energy_price.
  _costStr(rawKwh, staticPrice) {
    const kwh = this._kwh(rawKwh);
    const parts = [`~${kwh} kWh`];
    const price = staticPrice ?? (parseFloat(localStorage.getItem("ihc_static_price") || "") || null);
    if (price && kwh > 0) parts.push(`≈ ${(kwh * price).toFixed(2)} €`);
    return parts.join(" · ");
  }

  // ── Toast ──────────────────────────────────────────────────────────────────

  _toast(msg, ms = 3000) {
    const root = this.shadowRoot.querySelector("#toast-root");
    if (!root) return;
    if (this._toastTimeout) clearTimeout(this._toastTimeout);
    root.innerHTML = `<div class="toast">${msg}</div>`;
    this._toastTimeout = setTimeout(() => { root.innerHTML = ""; }, ms);
  }

  // ── Helper: legacy datalist options (kept for fallback) ─────────────────────
  _entityOptions(domains) {
    if (!this._hass) return "";
    return Object.keys(this._hass.states)
      .filter(id => !domains.length || domains.some(d => id.startsWith(d + ".")))
      .sort()
      .map(id => {
        const state = this._hass.states[id];
        const name  = state?.attributes?.friendly_name;
        const label = name && name !== id ? `${name} – ${id}` : id;
        return `<option value="${id}" label="${label}">`;
      })
      .join("");
  }

  // ── HA-style entity picker (attaches to inputs with data-ep-domains) ─────────
  _attachEntityPickers(root) {
    if (!this._hass) return;
    root.querySelectorAll("input[data-ep-domains]").forEach(input => {
      // Wrap input in .ep-wrap if not already done
      if (input.parentElement.classList.contains("ep-wrap")) return;
      const domains = (input.dataset.epDomains || "").split(",").map(d => d.trim()).filter(Boolean);

      const wrap = document.createElement("div");
      wrap.className = "ep-wrap";
      input.parentNode.insertBefore(wrap, input);
      wrap.appendChild(input);

      // Append dropdown to shadow root so it isn't clipped by modal overflow
      const dropdown = document.createElement("div");
      dropdown.className = "ep-dropdown";
      dropdown.style.display = "none";
      this.shadowRoot.appendChild(dropdown);

      // Tag dropdown with a unique key so it can be cleaned up when the section is re-rendered
      const _cleanup = () => { dropdown.remove(); };
      input._epCleanup = _cleanup;

      let focusedIdx = -1;

      const domainBadge = (id) => {
        const d = id.split(".")[0];
        const cls = ["sensor","climate","switch","binary_sensor","weather","number","input_boolean","person","device_tracker"].includes(d)
          ? `ep-d-${d}` : "ep-d-other";
        return `<span class="ep-badge ${cls}">${d}</span>`;
      };

      const stateLabel = (state) => {
        const s = state.state;
        if (!s || s === "unavailable" || s === "unknown") return "";
        const u = state.attributes?.unit_of_measurement || "";
        return `<span class="ep-state">${s}${u ? " " + u : ""}</span>`;
      };

      const positionDropdown = () => {
        const rect = input.getBoundingClientRect();
        const dropW = Math.max(rect.width, 420);
        const maxLeft = window.innerWidth - dropW - 8;
        dropdown.style.top   = (rect.bottom + 2) + "px";
        dropdown.style.left  = Math.min(rect.left, maxLeft) + "px";
        dropdown.style.width = dropW + "px";
      };

      const renderDropdown = () => {
        const q = input.value.toLowerCase();
        const entries = Object.entries(this._hass.states)
          .filter(([id]) => !domains.length || domains.some(d => id.startsWith(d + ".")))
          .filter(([id, s]) => {
            if (!q) return true;
            return id.toLowerCase().includes(q) || (s.attributes?.friendly_name || "").toLowerCase().includes(q);
          })
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(0, 60);

        focusedIdx = -1;
        if (!entries.length) {
          dropdown.innerHTML = `<div class="ep-empty">Keine Entitäten gefunden</div>`;
        } else {
          dropdown.innerHTML = entries.map(([id, state]) => {
            const name = state.attributes?.friendly_name;
            return `<div class="ep-item" data-value="${id}">
              ${domainBadge(id)}
              <div class="ep-info">
                <div class="ep-name">${name || id}</div>
                <div class="ep-id">${id}</div>
              </div>
              ${stateLabel(state)}
            </div>`;
          }).join("");

          dropdown.querySelectorAll(".ep-item").forEach(item => {
            item.addEventListener("mousedown", e => {
              e.preventDefault();
              input.value = item.dataset.value;
              dropdown.style.display = "none";
              input.dispatchEvent(new Event("change", { bubbles: true }));
            });
          });
        }
        positionDropdown();
        dropdown.style.display = "";
      };

      const hideDropdown = () => { dropdown.style.display = "none"; focusedIdx = -1; };

      input.addEventListener("focus", renderDropdown);
      input.addEventListener("blur",  () => setTimeout(hideDropdown, 200));
      input.addEventListener("input", renderDropdown);

      input.addEventListener("keydown", e => {
        const items = dropdown.querySelectorAll(".ep-item");
        if (!items.length) return;
        if (e.key === "ArrowDown") {
          e.preventDefault();
          focusedIdx = Math.min(focusedIdx + 1, items.length - 1);
          items.forEach((it, i) => it.classList.toggle("ep-focused", i === focusedIdx));
          items[focusedIdx]?.scrollIntoView({ block: "nearest" });
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          focusedIdx = Math.max(focusedIdx - 1, 0);
          items.forEach((it, i) => it.classList.toggle("ep-focused", i === focusedIdx));
        } else if (e.key === "Enter" && focusedIdx >= 0) {
          e.preventDefault();
          input.value = items[focusedIdx].dataset.value;
          hideDropdown();
          input.dispatchEvent(new Event("change", { bubbles: true }));
        } else if (e.key === "Escape") {
          hideDropdown();
        }
      });
    });
  }

  _cleanupEntityPickers(container) {
    container?.querySelectorAll("input[data-ep-domains]").forEach(inp => inp._epCleanup?.());
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

  // ── v1.6 Anforderungs-Heatmap helper ──────────────────────────────────────

  /**
   * Renders a 7×24 demand heatmap grid.
   * @param {Array} heatmap  7×24 float grid (weekday × hour, 0-100)
   * @param {string} title   optional heading
   * @returns {string} HTML string
   */
  _renderDemandHeatmapGrid(heatmap, title = "") {
    if (!heatmap || heatmap.length !== 7) return "";
    const WDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
    const demColor = v => {
      if (!v || v < 1) return "var(--secondary-background-color,#f5f5f5)";
      const t = Math.min(1, v / 100);
      const r = Math.round(30  + t * 200);
      const g = Math.round(100 - t * 60);
      const b = Math.round(200 - t * 180);
      return `rgb(${r},${g},${b})`;
    };
    const hourHeaders = Array.from({length: 24}, (_, h) =>
      `<div style="font-size:8px;text-align:center;color:var(--secondary-text-color);flex:1;min-width:0">${h % 3 === 0 ? h + "" : ""}</div>`
    ).join("");
    const rows = heatmap.map((day, di) => {
      const cells = day.map((v, h) =>
        `<div title="${WDAYS[di]} ${h}:00 – ${Math.round(v)}%" style="flex:1;height:18px;background:${demColor(v)};border-radius:2px;margin:1px;min-width:0"></div>`
      ).join("");
      return `<div style="display:flex;align-items:center;gap:0;margin-bottom:1px">
        <div style="width:22px;font-size:9px;color:var(--secondary-text-color);flex-shrink:0">${WDAYS[di]}</div>
        <div style="display:flex;flex:1;gap:0">${cells}</div>
      </div>`;
    }).join("");
    return `
      ${title ? `<div style="font-size:11px;font-weight:700;margin-bottom:6px;color:var(--secondary-text-color)">${title}</div>` : ""}
      <div style="display:flex;margin-left:22px;margin-bottom:2px">${hourHeaders}</div>
      ${rows}
      <div style="margin-top:4px;display:flex;gap:6px;align-items:center;font-size:10px;color:var(--secondary-text-color)">
        <span>0%</span>
        <div style="flex:1;height:5px;border-radius:3px;background:linear-gradient(to right,rgb(30,100,200),rgb(200,80,20),rgb(230,40,20))"></div>
        <span>100%</span>
      </div>`;
  }

  // ── HA Schedule row helpers ─────────────────────────────────────────────
  // NOTE: _makeHaSchedRow, _bindHaSchedAdder, _collectHaScheduleRows are
  // defined in 08_modals.js (authoritative versions). Do not duplicate here.


// === 03_tab_dashboard.js ===
/**
 * 03_tab_dashboard.js
 * IHC Frontend – Dashboard / Übersicht Tab
 * Contains: _renderOverview()
 */

  // ── Übersicht Tab ──────────────────────────────────────────────────────────

  _renderOverview(content) {
    const g = this._getGlobal();
    const rooms = this._getRoomData();
    const isTrv = (g.controller_mode || 'switch') === 'trv';

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
      // In TRV mode g.heating_active reflects the (optional) boiler switch and is
      // usually false → use trv_any_heating as the "room is actively heating" signal.
      const isHeating  = isTrv
        ? (room.trv_any_heating === true)
        : (room.demand > 0 && g.heating_active);
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
    const _demA = (this._st("sensor.ihc_gesamtanforderung") || { attributes: {} }).attributes;
    const banners = [
      _demA.startup_grace_active ? `<div class="system-banner warn">⏳ <strong>Startup-Gnadenfrist aktiv</strong> – Heizung gesperrt bis alle Sensoren geladen sind</div>` : "",
      g.summer_mode           ? `<div class="system-banner summer" style="display:flex;align-items:center;justify-content:space-between;gap:8px"><span>☀️ <strong>Sommerautomatik aktiv</strong> – Heizung gesperrt</span><button id="btn-disable-summer" style="flex-shrink:0;padding:4px 10px;border:none;border-radius:6px;background:rgba(0,0,0,0.15);color:inherit;cursor:pointer;font-size:12px;font-weight:600">❄️ Jetzt heizen</button></div>` : "",
      g.forecast_coldnight_active ? `<div class="system-banner cold">❄️ <strong>Kälte heute Nacht</strong> – Heizung startet ${g.forecast_advance_hours ?? 3}h früher (${g.weather_forecast?.forecast_today_min}°C erwartet)</div>` : "",
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
    // In TRV mode there is no central boiler, so g.heating_active is always false
    // (unless a boiler switch is also configured). Use rooms_demanding as indicator.
    let heatingState, heatingCls;
    if (isTrv) {
      const trvActive = (g.rooms_demanding || 0) > 0;
      heatingState = trvActive ? "🌡️ TRVs aktiv" : "✓ Bereit";
      heatingCls   = trvActive ? "heating" : "ok";
    } else {
      heatingState = g.heating_active ? "🔥 Heizt" : "✓ Bereit";
      heatingCls   = g.heating_active ? "heating" : "ok";
    }
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
          <div class="hero-label">${isTrv ? "TRV-Modus" : "Heizung"}</div>
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
          <div class="hero-label">${isTrv ? "Außen" : "Außen / Vorlauf"}</div>
          <div class="hero-value" style="font-size:20px">
            ${g.outdoor_temp != null ? g.outdoor_temp + " °C" : "—"}
            ${g.curve_target != null ? `<span style="font-size:13px;font-weight:400;color:var(--secondary-text-color);margin-left:4px" title="${isTrv ? 'Heizkurven-Sollwert (→ TRV-Setpoint)' : 'Heizkurven-Vorlauf-Soll'}">→ ${g.curve_target.toFixed(1)} °C</span>` : ""}
          </div>
          ${!isTrv && g.flow_temp != null ? `<div class="hero-sub">Vorlauf: ${g.flow_temp.toFixed(1)} °C</div>` : ""}
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

    // Summer mode quick-disable button
    const btnDisableSummer = content.querySelector("#btn-disable-summer");
    if (btnDisableSummer) {
      btnDisableSummer.addEventListener("click", () => {
        this._callService("update_global_settings", { summer_mode_enabled: false });
        this._toast("☀️ Sommerautomatik deaktiviert – Heizung freigegeben");
        setTimeout(() => { if (this._activeTab === "overview" && !this._modalOpen) this._renderTabContent(); }, 400);
      });
    }

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
          this._toast(`⚡ Boost aktiviert (${dur} min)`);
        }
      });
    });
  }


// === 04_tab_rooms.js ===
/**
 * 04_tab_rooms.js
 * IHC Frontend – Rooms Tab
 * Contains: _renderRooms, _renderRoomDetail, _renderRoomScheduleInline, _renderRoomCalendarInline
 */
  _renderRooms(content) {
    const rooms = this._getRoomData();
    const roomList = Object.values(rooms);

    // If a room is selected → show detail view
    if (this._selectedRoom && rooms[this._selectedRoom]) {
      this._renderRoomDetail(rooms[this._selectedRoom], content);
      return;
    }
    this._selectedRoom = null;

    const list = roomList.map(room => {
      const schedCount = room.schedules?.length || 0;
      const haSchedCount = room.ha_schedules?.length || 0;
      const schedBadge = schedCount > 0
        ? `<span style="font-size:10px;background:#e8f5e9;color:#2e7d32;padding:1px 6px;border-radius:8px;font-weight:600">IHC ${schedCount}</span>`
        : haSchedCount > 0
        ? `<span style="font-size:10px;background:#e3f2fd;color:#1565c0;padding:1px 6px;border-radius:8px;font-weight:600">HA ${haSchedCount}</span>`
        : "";
      const demandBar = room.demand > 0
        ? `<span style="font-size:10px;background:color-mix(in srgb,#ef5350 15%,transparent);color:var(--primary-text-color);padding:1px 6px;border-radius:8px;font-weight:600">🔥 ${Math.round(room.demand)}%</span>`
        : "";
      return `
      <div class="room-list-item" data-action="open" data-id="${room.entity_id}" style="cursor:pointer"
           title="Klicken für Zeitplan, Verlauf &amp; Details">
        <div class="room-list-left" style="pointer-events:none">
          <div class="room-list-name" style="display:flex;align-items:center;gap:8px">
            ${room.name} ${schedBadge} ${demandBar}
          </div>
          <div class="room-list-meta">
            ${MODE_ICONS[room.room_mode] || "⚙️"} ${MODE_LABELS[room.room_mode] || room.room_mode}
            · ${room.current_temp !== null ? room.current_temp + " °C → " + (room.target_temp ?? "—") + " °C" : "kein Sensor"}
            ${room.window_open ? " · 🪟 Fenster offen" : ""}
          </div>
        </div>
      </div>`;
    }).join("");

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

    // Clicking the room row opens the detail view
    content.querySelectorAll("[data-action='open']").forEach(row => {
      row.addEventListener("click", e => {
        this._selectedRoom = row.dataset.id;
        this._selectedRoomTab = this._selectedRoomTab || "schedule";
        this._renderRooms(content);
      });
    });

  }

  _renderRoomDetail(room, content) {
    const tab = this._selectedRoomTab || "schedule";
    content.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap">
        <button class="btn btn-secondary" id="back-to-rooms" style="padding:6px 12px;font-size:12px">← Zurück</button>
        <span style="font-size:18px;font-weight:700">${room.name}</span>
        <span style="font-size:13px;color:var(--secondary-text-color)">
          ${room.current_temp != null ? room.current_temp + " °C" : "—"}
          → ${room.source === "system_off" ? "Aus" : (room.target_temp != null ? room.target_temp + " °C" : "—")}
          · ${MODE_ICONS[room.room_mode] || ""} ${MODE_LABELS[room.room_mode] || room.room_mode}
        </span>
        ${room.trv_raw_temp != null ? `<span style="font-size:11px;padding:2px 7px;border-radius:8px;background:color-mix(in srgb,#fb8c00 15%,transparent);color:var(--primary-text-color)" title="TRV-Eigentemperatur (am Heizkörper gemessen, vor Korrektur)">🌡️ TRV ${room.trv_raw_temp} °C</span>` : ""}
        ${room.trv_avg_valve != null ? `<span style="font-size:11px;padding:2px 7px;border-radius:8px;background:color-mix(in srgb,#42a5f5 15%,transparent);color:var(--primary-text-color)" title="Durchschnittliche TRV-Ventilöffnung">🔧 Ventil ${room.trv_avg_valve} %</span>` : ""}
        ${room.trv_any_heating ? `<span style="font-size:11px;padding:2px 7px;border-radius:8px;background:color-mix(in srgb,#ef5350 15%,transparent);color:var(--primary-text-color)" title="Mindestens ein TRV meldet aktives Heizen">🔥 TRV heizt</span>` : ""}
        ${room.trv_min_battery != null ? (() => { const lw = room.trv_min_battery < 20; const med = room.trv_min_battery < 40; const bg = lw ? "color-mix(in srgb,#ef5350 15%,transparent)" : med ? "color-mix(in srgb,#fb8c00 15%,transparent)" : "color-mix(in srgb,#66bb6a 15%,transparent)"; const ico = lw ? "🪫" : "🔋"; return `<span style="font-size:11px;padding:2px 7px;border-radius:8px;background:${bg};color:var(--primary-text-color)" title="TRV-Batterie (niedrigster Wert aller TRVs)">${ico} ${room.trv_min_battery}%</span>`; })() : ""}
        ${room.room_mode === "manual" && room.next_period ? `<span style="font-size:11px;padding:2px 7px;border-radius:8px;background:color-mix(in srgb,#9c27b0 15%,transparent);color:var(--primary-text-color)" title="Automatischer Reset beim nächsten Zeitplan-Eintrag">↩ Reset ${room.next_period.start} Uhr</span>` : ""}
        ${(room.room_temp_threshold > 0) ? `<span style="font-size:11px;padding:2px 7px;border-radius:8px;background:color-mix(in srgb,#29b6f6 15%,transparent);color:var(--primary-text-color)" title="Mindesttemperatur-Schwelle aktiv: heizt immer wenn Raumtemp darunter fällt">🌡 Min ${room.room_temp_threshold}°C</span>` : ""}
        ${room.source === "temp_threshold_override" ? `<span style="font-size:11px;padding:2px 7px;border-radius:8px;background:color-mix(in srgb,#29b6f6 25%,transparent);color:var(--primary-text-color)" title="Heizung aktiv wegen Mindesttemperatur-Schwelle">🌡 Schwelle aktiv</span>` : ""}
        ${room.presence_sensor ? `<span style="font-size:11px;padding:2px 7px;border-radius:8px;background:${room.pir_presence === false ? "color-mix(in srgb,#ef5350 15%,transparent)" : room.pir_presence === true ? "color-mix(in srgb,#66bb6a 15%,transparent)" : "color-mix(in srgb,#78909c 15%,transparent)"};color:var(--primary-text-color)" title="PIR: ${room.presence_sensor}">${room.pir_presence === false ? "🚶 Niemand da" : room.pir_presence === true ? "🏃 Bewegung" : "👁 PIR konfiguriert"}</span>` : ""}
        ${room.source === "pir_absence" ? `<span style="font-size:11px;padding:2px 7px;border-radius:8px;background:color-mix(in srgb,#ef5350 25%,transparent);color:var(--primary-text-color)" title="Abwesend-Temperatur wegen PIR-Abwesenheit aktiv">🚶 PIR abwesend</span>` : ""}
      </div>
      <div class="tabs" style="margin-bottom:16px">
        <div class="tab ${tab === "schedule" ? "active" : ""}" data-subtab="schedule">📅 Zeitplan</div>
        <div class="tab ${tab === "calendar" ? "active" : ""}" data-subtab="calendar">🗓️ Wochenansicht</div>
        <div class="tab ${tab === "history" ? "active" : ""}" data-subtab="history">📈 Verlauf</div>
        <div class="tab ${tab === "settings" ? "active" : ""}" data-subtab="settings">⚙️ Einstellungen</div>
      </div>
      <div id="room-detail-content"></div>`;

    content.querySelector("#back-to-rooms").addEventListener("click", () => {
      this._selectedRoom = null;
      this._renderRooms(content);
    });
    content.querySelectorAll("[data-subtab]").forEach(t => {
      t.addEventListener("click", () => {
        this._selectedRoomTab = t.dataset.subtab;
        this._renderRoomDetail(room, content);
      });
    });

    const detailContent = content.querySelector("#room-detail-content");
    if (tab === "schedule") this._renderRoomScheduleInline(room, detailContent);
    else if (tab === "history") this._renderRoomHistory(room, detailContent);
    else if (tab === "settings") this._renderRoomDetailSettings(room, detailContent, content);
    else this._renderRoomCalendarInline(room, detailContent);
  }

  _renderRoomDetailSettings(room, container, fullContent) {
    const isTrv = (this._getGlobal()?.controller_mode || 'switch') === 'trv';
    const valveRows = room.valve_entities && room.valve_entities.length > 0
      ? room.valve_entities.map((e, i) => `
          <div class="entity-row">
            <input type="text" class="form-input" value="${e}"
              data-ep-domains="climate" autocomplete="off" placeholder="climate.entity">
            ${i === 0
              ? `<button class="btn btn-secondary btn-icon add-entity" data-list="rs-valve-list" data-ep-domains="climate">+</button>`
              : `<button class="btn btn-danger btn-icon remove-entity">✕</button>`}
          </div>`).join("")
      : `<div class="entity-row">
           <input type="text" class="form-input" placeholder="climate.entity (optional)"
             data-ep-domains="climate" autocomplete="off">
           <button class="btn btn-secondary btn-icon add-entity" data-list="rs-valve-list" data-ep-domains="climate">+</button>
         </div>`;

    const windowRows = room.window_sensors && room.window_sensors.length > 0
      ? room.window_sensors.map((e, i) => `
          <div class="entity-row">
            <input type="text" class="form-input" value="${e}"
              data-ep-domains="binary_sensor" autocomplete="off" placeholder="binary_sensor.fenster">
            ${i === 0
              ? `<button class="btn btn-secondary btn-icon add-entity" data-list="rs-window-list" data-ep-domains="binary_sensor">+</button>`
              : `<button class="btn btn-danger btn-icon remove-entity">✕</button>`}
          </div>`).join("")
      : `<div class="entity-row">
           <input type="text" class="form-input" placeholder="binary_sensor.fenster (optional)"
             data-ep-domains="binary_sensor" autocomplete="off">
           <button class="btn btn-secondary btn-icon add-entity" data-list="rs-window-list" data-ep-domains="binary_sensor">+</button>
         </div>`;

    const ROOM_MODES_SELECT = ["auto","comfort","eco","sleep","away","off","manual"].map(m =>
      `<option value="${m}" ${room.room_mode === m ? "selected" : ""}>${MODE_ICONS[m] || ""} ${MODE_LABELS[m] || m}</option>`
    ).join("");

    container.innerHTML = `
      <div class="card" style="margin-bottom:12px">
        <div class="card-title">⚙️ Einstellungen – ${room.name}</div>

        <div class="form-group">
          <label class="form-label">Zimmer-Modus</label>
          <select class="form-select" id="rs-mode">${ROOM_MODES_SELECT}</select>
        </div>

        <div class="form-group">
          <label class="form-label">Temperatursensor</label>
          <input type="text" class="form-input full" id="rs-sensor"
            value="${room.temp_sensor || ''}" placeholder="sensor.temp"
            data-ep-domains="sensor" autocomplete="off">
        </div>

        <details class="modal-collapsible" open>
          <summary class="modal-section-title">🔥 Thermostate / TRVs</summary>
          <div class="entity-list" id="rs-valve-list">${valveRows}</div>
        </details>

        <details class="modal-collapsible">
          <summary class="modal-section-title">🪟 Fenstersensoren</summary>
          <div class="entity-list" id="rs-window-list">${windowRows}</div>
          <div class="settings-grid" style="margin-top:8px">
            <div class="settings-item">
              <label>Reaktionszeit (s)</label>
              <input type="number" class="form-input" id="rs-window-reaction-time"
                value="${room.window_reaction_time ?? 30}" step="5" min="0" max="300">
            </div>
            <div class="settings-item">
              <label>Wiederaufnahme nach Schließen (s)</label>
              <input type="number" class="form-input" id="rs-window-close-delay"
                value="${room.window_close_delay ?? 0}" step="5" min="0" max="600">
            </div>
          </div>
        </details>

        <details class="modal-collapsible" open>
          <summary class="modal-section-title">🌡️ Temperatur-Presets</summary>
          <div class="settings-grid">
            <div class="settings-item">
              <label>Komfort Fallback (°C)</label>
              <input type="number" class="form-input" id="rs-comfort"
                value="${room.comfort_temp ?? 21}" step="0.5" min="15" max="30">
            </div>
            <div class="settings-item">
              <label>Abwesend-Temperatur (°C)</label>
              <input type="number" class="form-input" id="rs-away-temp-room"
                value="${room.away_temp_room ?? 16}" step="0.5" min="10" max="22">
            </div>
            <div class="settings-item">
              <label>Eco Abzug (°C)</label>
              <input type="number" class="form-input" id="rs-eco-offset"
                value="${room.eco_offset ?? 3}" step="0.5" min="0" max="10">
            </div>
            <div class="settings-item">
              <label>Eco Maximum (°C)</label>
              <input type="number" class="form-input" id="rs-eco-max"
                value="${room.eco_max_temp ?? 21}" step="0.5" min="10" max="28">
            </div>
            <div class="settings-item">
              <label>Schlaf Abzug (°C)</label>
              <input type="number" class="form-input" id="rs-sleep-offset"
                value="${room.sleep_offset ?? 4}" step="0.5" min="0" max="10">
            </div>
            <div class="settings-item">
              <label>Schlaf Maximum (°C)</label>
              <input type="number" class="form-input" id="rs-sleep-max"
                value="${room.sleep_max_temp ?? 19}" step="0.5" min="10" max="25">
            </div>
            <div class="settings-item">
              <label>Abwesend Abzug (°C)</label>
              <input type="number" class="form-input" id="rs-away-offset"
                value="${room.away_offset ?? 6}" step="0.5" min="0" max="15">
            </div>
            <div class="settings-item">
              <label>Abwesend Maximum (°C)</label>
              <input type="number" class="form-input" id="rs-away-max"
                value="${room.away_max_temp ?? 18}" step="0.5" min="5" max="22">
            </div>
          </div>
        </details>

        <details class="modal-collapsible">
          <summary class="modal-section-title">📐 Erweitert & Grenzen</summary>
          <div class="settings-grid">
            <div class="settings-item">
              <label>Zimmer-Offset (°C)</label>
              <input type="number" class="form-input" id="rs-offset"
                value="${room.room_offset ?? 0}" step="0.5" min="-5" max="5">
            </div>
            <div class="settings-item">
              <label>Totband (°C)</label>
              <input type="number" class="form-input" id="rs-deadband"
                value="${room.deadband ?? 0.5}" step="0.1" min="0.1" max="2">
            </div>
            <div class="settings-item" style="${isTrv ? 'display:none' : ''}">
              <label>Gewichtung</label>
              <input type="number" class="form-input" id="rs-weight"
                value="${room.weight ?? 1.0}" step="0.1" min="0.1" max="5">
              <span class="form-hint">Nur im Heizungsschalter-Modus: wie stark dieses Zimmer die Kessel-Anforderung beeinflusst</span>
            </div>
            <div class="settings-item">
              <label>Absolute Mindesttemperatur (°C)</label>
              <input type="number" class="form-input" id="rs-absolute-min-temp"
                value="${room.absolute_min_temp ?? 15}" step="0.5" min="5" max="25">
            </div>
            <div class="settings-item">
              <label>Zimmergröße (m²)</label>
              <input type="number" class="form-input" id="rs-room-qm"
                value="${room.room_qm ?? 0}" step="1" min="0" max="200">
            </div>
            <div class="settings-item">
              <label>Vorheizzeit (min, -1 = global)</label>
              <input type="number" class="form-input" id="rs-room-preheat"
                value="${room.room_preheat_minutes ?? -1}" step="1" min="-1" max="120">
            </div>
          </div>
        </details>

        <details class="modal-collapsible" ${room.humidity_sensor || room.co2_sensor ? "open" : ""}>
          <summary class="modal-section-title">🌬️ Lüftung &amp; Schimmelschutz</summary>
          <div class="settings-grid">
            <div class="settings-item">
              <label>Feuchtigkeitssensor</label>
              <input type="text" class="form-input" id="rs-humidity-sensor"
                value="${room.humidity_sensor || ''}" placeholder="sensor.feuchte"
                data-ep-domains="sensor" autocomplete="off">
            </div>
            <div class="settings-item">
              <label>Schimmelschutz</label>
              <select class="form-select" id="rs-mold-protection">
                <option value="true" ${room.mold_protection_enabled !== false ? "selected" : ""}>Aktiviert</option>
                <option value="false" ${room.mold_protection_enabled === false ? "selected" : ""}>Deaktiviert</option>
              </select>
            </div>
            <div class="settings-item">
              <label>Schimmelschutz-Schwelle (%)</label>
              <input type="number" class="form-input" id="rs-mold-humidity-threshold"
                value="${room.mold_humidity_threshold ?? 70}" step="1" min="50" max="95">
            </div>
            <div class="settings-item">
              <label>CO₂-Sensor</label>
              <input type="text" class="form-input" id="rs-co2-sensor"
                value="${room.co2_sensor || ''}" placeholder="sensor.co2"
                data-ep-domains="sensor" autocomplete="off">
            </div>
            <div class="settings-item">
              <label>CO₂ Gut-Schwelle (ppm)</label>
              <input type="number" class="form-input" id="rs-co2-threshold-good"
                value="${room.co2_threshold_good ?? 800}" step="50" min="400" max="1000">
            </div>
            <div class="settings-item">
              <label>CO₂ Lüften-Schwelle (ppm)</label>
              <input type="number" class="form-input" id="rs-co2-threshold-bad"
                value="${room.co2_threshold_bad ?? 1200}" step="50" min="800" max="2000">
            </div>
          </div>
        </details>

        <details class="modal-collapsible" ${room.hkv_sensor || (room.radiator_kw && room.radiator_kw !== 1.0) ? "open" : ""}>
          <summary class="modal-section-title">⚡ Energieerfassung</summary>
          <div class="settings-grid">
            <div class="settings-item">
              <label>Heizleistung (kW)</label>
              <input type="number" class="form-input" id="rs-radiator-kw"
                value="${room.radiator_kw ?? 1.0}" step="0.1" min="0.1" max="5.0">
            </div>
            <div class="settings-item">
              <label>HKV-Sensor</label>
              <input type="text" class="form-input" id="rs-hkv-sensor"
                value="${room.hkv_sensor || ''}" placeholder="sensor.hkv"
                data-ep-domains="sensor" autocomplete="off">
            </div>
            <div class="settings-item">
              <label>HKV-Faktor (kWh/Einheit)</label>
              <input type="number" class="form-input" id="rs-hkv-factor"
                value="${room.hkv_factor ?? 0.083}" step="0.001" min="0.001" max="1.0">
            </div>
          </div>
        </details>

        <details class="modal-collapsible" ${room.room_presence_entities?.length ? "open" : ""}>
          <summary class="modal-section-title">👤 Anwesenheit</summary>
          <div class="settings-item">
            <input type="text" class="form-input full" id="rs-presence-entities"
              value="${(room.room_presence_entities || []).join(', ')}"
              placeholder="person.max, device_tracker.handy"
              data-ep-domains="person,device_tracker,input_boolean,binary_sensor" autocomplete="off">
            <span class="form-hint">Leer = immer anwesend</span>
          </div>
        </details>

        <details class="modal-collapsible" ${room.boost_default_duration !== 60 ? "open" : ""}>
          <summary class="modal-section-title">⚡ Boost</summary>
          <p style="margin:0 0 8px;font-size:0.85em;color:var(--secondary-text-color)">
            Aktiviert den nativen HA-Boost-Modus auf den TRVs des Zimmers für die gewünschte Dauer.
            Ohne native Boost-Unterstützung des TRVs wird stattdessen die Komforttemperatur genutzt.
          </p>
          <div class="settings-grid">
            <div class="settings-item">
              <label>Boost-Dauer (min)</label>
              <input type="number" class="form-input" id="rs-boost-dur"
                value="${room.boost_default_duration ?? 60}" min="5" max="480" step="5">
            </div>
          </div>
          <div class="form-row" style="gap:8px;margin-top:8px">
            <button class="btn btn-secondary" id="rs-boost-btn">⚡ Boost starten</button>
            ${room.boost_remaining > 0 ? `<button class="btn btn-danger" id="rs-boost-cancel-btn">✕ Boost beenden (${room.boost_remaining} min)</button>` : ""}
          </div>
        </details>

        <details class="modal-collapsible" ${(room.trv_temp_weight > 0 || room.trv_valve_demand || room.trv_min_send_interval > 0) ? "open" : ""}>
          <summary class="modal-section-title">🌡️ TRV-Sensor &amp; Kalibrierung</summary>
          <div class="settings-grid">
            <div class="settings-item">
              <label>TRV-Temperaturanteil (0–0.5)</label>
              <input type="number" class="form-input" id="rs-trv-temp-weight"
                value="${room.trv_temp_weight ?? 0}" min="0" max="0.5" step="0.05">
            </div>
            <div class="settings-item">
              <label>TRV-Temperaturkorrektur (°C)</label>
              <input type="number" class="form-input" id="rs-trv-temp-offset"
                value="${room.trv_temp_offset ?? -2}" min="-10" max="5" step="0.5">
            </div>
            <div class="settings-item" style="grid-column:1/-1">
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
                <input type="checkbox" id="rs-trv-valve-demand" ${room.trv_valve_demand ? "checked" : ""}>
                Ventilstellung für Anforderungsberechnung nutzen
              </label>
            </div>
            <div class="settings-item">
              <label>🔋 Min. Sendeintervall (s)</label>
              <input type="number" class="form-input" id="rs-trv-min-send-interval"
                value="${room.trv_min_send_interval ?? 0}" min="0" max="1800" step="60">
            </div>
            <div class="settings-item" style="grid-column:1/-1">
              <label>Per-TRV-Kalibrierung (JSON)</label>
              <textarea class="form-input" id="rs-trv-calibrations" rows="3"
                placeholder='{"climate.trv_name": -2.0}'
                style="font-family:monospace;font-size:11px">${room.trv_calibrations ? JSON.stringify(room.trv_calibrations, null, 0) : ""}</textarea>
            </div>
          </div>
        </details>

        <details class="modal-collapsible" ${room.aggressive_mode_enabled ? "open" : ""}>
          <summary class="modal-section-title">⚡ Aggressiver Modus</summary>
          <div class="settings-grid">
            <div class="settings-item" style="grid-column:1/-1">
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
                <input type="checkbox" id="rs-aggressive-mode" ${room.aggressive_mode_enabled ? "checked" : ""}>
                Aggressiver Modus aktivieren (für träge TRVs)
              </label>
            </div>
            <div class="settings-item">
              <label>Aktivierungsbereich (°C unter Soll)</label>
              <input type="number" class="form-input" id="rs-aggressive-range"
                value="${room.aggressive_mode_range ?? 2}" step="0.5" min="0.5" max="5">
            </div>
            <div class="settings-item">
              <label>Überhöhung (°C über Soll)</label>
              <input type="number" class="form-input" id="rs-aggressive-offset"
                value="${room.aggressive_mode_offset ?? 3}" step="0.5" min="0.5" max="8">
            </div>
          </div>
        </details>

        <details class="modal-collapsible" ${(room.window_open_temp > 0 || room.room_temp_threshold > 0) ? "open" : ""}>
          <summary class="modal-section-title">🌡️ Temperaturschwellen</summary>
          <div class="settings-grid">
            <div class="settings-item">
              <label>Mindesttemperatur-Schwelle (°C)</label>
              <input type="number" class="form-input" id="rs-room-temp-threshold"
                value="${room.room_temp_threshold ?? 0}" step="0.5" min="0" max="25" placeholder="0 = deaktiviert">
              <span class="form-hint">Heizt immer wenn Raumtemp darunter fällt (0 = deaktiviert)</span>
            </div>
            <div class="settings-item">
              <label>Fenster-Mindesttemperatur (°C)</label>
              <input type="number" class="form-input" id="rs-window-open-temp"
                value="${room.window_open_temp ?? 0}" step="0.5" min="0" max="22" placeholder="0 = Frostschutz">
              <span class="form-hint">Temperatur bei offenem Fenster (0 = Frostschutz 7°C)</span>
            </div>
          </div>
        </details>

        <details class="modal-collapsible" ${room.presence_sensor ? "open" : ""}>
          <summary class="modal-section-title">👁 PIR-Sensor (Zimmerpräsenz)</summary>
          <div class="settings-grid">
            <div class="settings-item" style="grid-column:1/-1">
              <label>PIR-Sensor Entity</label>
              <input type="text" class="form-input full" id="rs-presence-sensor"
                value="${room.presence_sensor || ''}" placeholder="binary_sensor.bewegung"
                data-ep-domains="binary_sensor" autocomplete="off">
              <span class="form-hint">Bewegungsmelder für Zimmer-Anwesenheit (optional)</span>
            </div>
            <div class="settings-item">
              <label>Einschaltverzögerung (s)</label>
              <input type="number" class="form-input" id="rs-presence-sensor-on-delay"
                value="${room.presence_sensor_on_delay ?? 300}" step="30" min="0" max="3600">
            </div>
            <div class="settings-item">
              <label>Ausschaltverzögerung (s)</label>
              <input type="number" class="form-input" id="rs-presence-sensor-off-delay"
                value="${room.presence_sensor_off_delay ?? 300}" step="30" min="0" max="3600">
            </div>
          </div>
        </details>

        <details class="modal-collapsible" ${(room.comfort_temp_entity || room.eco_temp_entity) ? "open" : ""}>
          <summary class="modal-section-title">🔗 Dynamische Sollwert-Entitäten</summary>
          <div class="settings-grid">
            <div class="settings-item" style="grid-column:1/-1">
              <label>Komfort-Sollwert Entity</label>
              <input type="text" class="form-input full" id="rs-comfort-temp-entity"
                value="${room.comfort_temp_entity || ''}" placeholder="input_number.komfort_soll"
                data-ep-domains="input_number,sensor" autocomplete="off">
              <span class="form-hint">input_number.* oder sensor.* für dynamischen Komfort-Sollwert</span>
            </div>
            <div class="settings-item" style="grid-column:1/-1">
              <label>Eco-Sollwert Entity</label>
              <input type="text" class="form-input full" id="rs-eco-temp-entity"
                value="${room.eco_temp_entity || ''}" placeholder="input_number.eco_soll"
                data-ep-domains="input_number,sensor" autocomplete="off">
              <span class="form-hint">input_number.* oder sensor.* für dynamischen Eco-Sollwert</span>
            </div>
          </div>
        </details>

        <details class="modal-collapsible" ${room.comfort_extend_entity ? "open" : ""}>
          <summary class="modal-section-title">⏱️ Komfort-Verlängerung${room.comfort_extend_active ? ' <span style="color:#43a047;font-size:11px">● aktiv</span>' : ''}</summary>
          <div class="settings-grid">
            <div class="settings-item" style="grid-column:1/-1">
              <label>Verlängerungs-Entity</label>
              <input type="text" class="form-input full" id="rs-comfort-extend-entity"
                value="${room.comfort_extend_entity || ''}"
                placeholder="media_player.tv · switch.tv · binary_sensor.bewegung"
                data-ep-domains="media_player,switch,binary_sensor,input_boolean,person,device_tracker" autocomplete="off">
              <span class="form-hint">Wenn aktiv → Zeitplan-Downgrade (Komfort→Eco/Schlaf) wird blockiert</span>
            </div>
            <div class="settings-item">
              <label>Auslöse-Zustand</label>
              <input type="text" class="form-input" id="rs-comfort-extend-state"
                value="${room.comfort_extend_state || 'on'}" placeholder="on / playing / home">
              <span class="form-hint">Zustand der die Verlängerung aktiviert</span>
            </div>
          </div>
        </details>

        <div class="btn-row" style="margin-top:16px">
          <button class="btn btn-primary" id="rs-save-btn">💾 Einstellungen speichern</button>
        </div>

        <details style="margin-top:24px;border:1px solid var(--error-color,#b00020);border-radius:8px;padding:0">
          <summary style="padding:12px 16px;cursor:pointer;font-weight:600;color:var(--error-color,#b00020);list-style:none;display:flex;align-items:center;gap:8px">
            🗑 Zimmer löschen
          </summary>
          <div style="padding:0 16px 16px">
            <p style="font-size:13px;color:var(--secondary-text-color);margin:12px 0 8px">
              Diese Aktion entfernt das Zimmer und alle zugehörigen Entitäten dauerhaft.<br>
              Gib zur Bestätigung den Zimmernamen ein:
              <strong>${room.name}</strong>
            </p>
            <input type="text" class="form-input" id="rs-delete-confirm-name"
              placeholder="Zimmernamen eingeben…" autocomplete="off"
              style="margin-bottom:10px">
            <button class="btn btn-danger" id="rs-delete-btn" disabled>Zimmer endgültig löschen</button>
          </div>
        </details>
      </div>`;

    // Bind entity list adders (re-uses the existing helper)
    container.querySelectorAll(".add-entity").forEach(btn => {
      btn.addEventListener("click", () => {
        const listId = btn.dataset.list;
        const list = container.querySelector(`#${listId}`);
        if (!list) return;
        const domains = btn.dataset.epDomains || "";
        const row = document.createElement("div");
        row.className = "entity-row";
        row.innerHTML = `
          <input type="text" class="form-input" placeholder="${domains.split(",")[0]}.entity"
            data-ep-domains="${domains}" autocomplete="off">
          <button class="btn btn-danger btn-icon remove-entity">✕</button>`;
        list.appendChild(row);
        row.querySelector(".remove-entity").addEventListener("click", () => row.remove());
      });
    });
    container.querySelectorAll(".remove-entity").forEach(btn => {
      btn.addEventListener("click", () => btn.closest(".entity-row")?.remove());
    });

    // Boost buttons
    const boostBtn = container.querySelector("#rs-boost-btn");
    if (boostBtn) {
      boostBtn.addEventListener("click", () => {
        const dur = parseInt(container.querySelector("#rs-boost-dur")?.value, 10) || 60;
        this._callService("boost_room", { id: room.room_id, duration_minutes: dur });
        this._toast(`⚡ Boost ${dur} min für ${room.name}`);
      });
    }
    const boostCancelBtn = container.querySelector("#rs-boost-cancel-btn");
    if (boostCancelBtn) {
      boostCancelBtn.addEventListener("click", () => {
        this._callService("boost_room", { id: room.room_id, cancel: true });
        this._toast(`✓ Boost beendet`);
      });
    }

    // Save button
    container.querySelector("#rs-save-btn").addEventListener("click", async () => {
      const mode   = container.querySelector("#rs-mode").value;
      const valves  = [...container.querySelectorAll("#rs-valve-list input")].map(i => i.value.trim()).filter(Boolean);
      const windows = [...container.querySelectorAll("#rs-window-list input")].map(i => i.value.trim()).filter(Boolean);
      await this._callService("set_room_mode", { id: room.room_id, mode });
      await this._callService("update_room", {
        id: room.room_id,
        temp_sensor:              container.querySelector("#rs-sensor")?.value.trim() || "",
        valve_entity:             valves[0] || "",
        valve_entities:           valves,
        window_sensor:            windows[0] || "",
        window_sensors:           windows,
        comfort_temp:             parseFloat(container.querySelector("#rs-comfort").value),
        away_temp_room:           parseFloat(container.querySelector("#rs-away-temp-room").value) || 16.0,
        eco_offset:               parseFloat(container.querySelector("#rs-eco-offset").value),
        eco_max_temp:             parseFloat(container.querySelector("#rs-eco-max").value),
        sleep_offset:             parseFloat(container.querySelector("#rs-sleep-offset").value),
        sleep_max_temp:           parseFloat(container.querySelector("#rs-sleep-max").value),
        away_offset:              parseFloat(container.querySelector("#rs-away-offset").value),
        away_max_temp:            parseFloat(container.querySelector("#rs-away-max").value),
        room_offset:              parseFloat(container.querySelector("#rs-offset").value),
        deadband:                 parseFloat(container.querySelector("#rs-deadband").value),
        weight:                   parseFloat(container.querySelector("#rs-weight").value),
        absolute_min_temp:        parseFloat(container.querySelector("#rs-absolute-min-temp").value) || 15,
        room_qm:                  parseFloat(container.querySelector("#rs-room-qm").value) || 0,
        room_preheat_minutes:     parseInt(container.querySelector("#rs-room-preheat").value ?? "-1", 10),
        window_reaction_time:     parseInt(container.querySelector("#rs-window-reaction-time").value, 10) || 30,
        window_close_delay:       parseInt(container.querySelector("#rs-window-close-delay").value, 10) || 0,
        humidity_sensor:          container.querySelector("#rs-humidity-sensor")?.value.trim() || "",
        mold_protection_enabled:  container.querySelector("#rs-mold-protection")?.value === "true",
        mold_humidity_threshold:  parseFloat(container.querySelector("#rs-mold-humidity-threshold")?.value) || 70,
        co2_sensor:               container.querySelector("#rs-co2-sensor")?.value.trim() || "",
        co2_threshold_good:       parseInt(container.querySelector("#rs-co2-threshold-good")?.value, 10) || 800,
        co2_threshold_bad:        parseInt(container.querySelector("#rs-co2-threshold-bad")?.value, 10) || 1200,
        radiator_kw:              parseFloat(container.querySelector("#rs-radiator-kw").value) || 1.0,
        hkv_sensor:               container.querySelector("#rs-hkv-sensor")?.value.trim() || "",
        hkv_factor:               parseFloat(container.querySelector("#rs-hkv-factor").value) || 0.083,
        room_presence_entities:   (container.querySelector("#rs-presence-entities")?.value || "")
                                    .split(",").map(s => s.trim()).filter(Boolean),
        boost_default_duration:   parseInt(container.querySelector("#rs-boost-dur")?.value, 10) || 60,
        trv_temp_weight:          parseFloat(container.querySelector("#rs-trv-temp-weight")?.value) || 0,
        trv_temp_offset:          parseFloat(container.querySelector("#rs-trv-temp-offset")?.value ?? "-2"),
        trv_valve_demand:         container.querySelector("#rs-trv-valve-demand")?.checked === true,
        trv_min_send_interval:    parseInt(container.querySelector("#rs-trv-min-send-interval")?.value, 10) || 0,
        trv_calibrations:         (() => { try { const v = container.querySelector("#rs-trv-calibrations")?.value.trim(); return v ? JSON.parse(v) : {}; } catch { return {}; } })(),
        presence_sensor:          container.querySelector("#rs-presence-sensor")?.value.trim() || "",
        presence_sensor_on_delay: parseInt(container.querySelector("#rs-presence-sensor-on-delay")?.value, 10) || 0,
        presence_sensor_off_delay: parseInt(container.querySelector("#rs-presence-sensor-off-delay")?.value, 10) || 0,
        window_open_temp:         parseFloat(container.querySelector("#rs-window-open-temp")?.value) || 0,
        room_temp_threshold:      parseFloat(container.querySelector("#rs-room-temp-threshold")?.value) || 0,
        comfort_temp_entity:      container.querySelector("#rs-comfort-temp-entity")?.value.trim() || "",
        eco_temp_entity:          container.querySelector("#rs-eco-temp-entity")?.value.trim() || "",
        comfort_extend_entity:    container.querySelector("#rs-comfort-extend-entity")?.value.trim() || "",
        comfort_extend_state:     container.querySelector("#rs-comfort-extend-state")?.value.trim() || "on",
        aggressive_mode_enabled:  container.querySelector("#rs-aggressive-mode")?.checked === true,
        aggressive_mode_range:    parseFloat(container.querySelector("#rs-aggressive-range")?.value ?? "2") || 2.0,
        aggressive_mode_offset:   parseFloat(container.querySelector("#rs-aggressive-offset")?.value ?? "3") || 3.0,
      });
      this._toast(`✓ ${room.name} gespeichert`);
    });

    // Delete confirmation: enable button only when name matches exactly
    const deleteNameInput = container.querySelector("#rs-delete-confirm-name");
    const deleteBtn = container.querySelector("#rs-delete-btn");
    if (deleteNameInput && deleteBtn) {
      deleteNameInput.addEventListener("input", () => {
        deleteBtn.disabled = deleteNameInput.value.trim() !== room.name;
      });
      deleteBtn.addEventListener("click", async () => {
        if (deleteNameInput.value.trim() !== room.name) return;
        await this._callService("remove_room", { id: room.room_id });
        this._selectedRoom = null;
        this._toast(`✓ Zimmer „${room.name}" gelöscht`);
        this._renderRooms(fullContent);
      });
    }
  }

  _renderRoomScheduleInline(room, container) {
    const selId = room.entity_id;
    if (!this._editingSchedules[selId]) {
      const existing = room.schedules;
      if (Array.isArray(existing)) {
        // Respect whatever is saved – empty array means user cleared all schedules
        this._editingSchedules[selId] = JSON.parse(JSON.stringify(existing));
      } else {
        // Truly new room (schedules field absent) – add helpful defaults
        this._editingSchedules[selId] = [
          { days: ["mon","tue","wed","thu","fri"],
            periods: [{ start:"06:30", end:"08:00", mode:"comfort", temperature:22.0, offset:0.0 },
                      { start:"17:00", end:"22:00", mode:"comfort", temperature:22.0, offset:0.0 }] },
          { days: ["sat","sun"],
            periods: [{ start:"08:00", end:"23:00", mode:"comfort", temperature:22.0, offset:0.0 }] },
        ];
      }
    }
    const schedules = this._editingSchedules[selId];

    const schedBlocks = schedules.map((sched, si) => {
      const condEntity = sched.condition_entity || "";
      const condState  = sched.condition_state  || "on";
      const schedName  = sched.name || "";
      const dayChips = DAY_KEYS.map((key, i) =>
        `<span class="day-chip ${sched.days.includes(key) ? "selected" : ""}"
              data-sched="${si}" data-day="${key}">${DAYS[i]}</span>`
      ).join("");
      const PERIOD_MODES = [
        { value: "comfort", label: "☀️ Komfort" },
        { value: "eco",     label: "🌿 Eco" },
        { value: "sleep",   label: "🌙 Schlaf" },
        { value: "away",    label: "🚶 Abwesend" },
        { value: "manual",  label: "✏️ Manuell" },
      ];
      const periodRows = sched.periods.map((p, pi) => {
        const pMode = p.mode || "manual";
        const isManual = pMode === "manual";
        const modeOpts = PERIOD_MODES.map(m =>
          `<option value="${m.value}" ${pMode === m.value ? "selected" : ""}>${m.label}</option>`
        ).join("");
        return `
        <div class="period-row" style="grid-template-columns:80px 80px 1fr auto auto 30px">
          <input type="time" class="form-input" value="${p.start}"
            data-sched="${si}" data-period="${pi}" data-field="start">
          <input type="time" class="form-input" value="${p.end}"
            data-sched="${si}" data-period="${pi}" data-field="end">
          <div style="display:flex;gap:4px;align-items:center">
            <select class="form-select" style="flex:1"
              data-sched="${si}" data-period="${pi}" data-field="mode">${modeOpts}</select>
            <input type="number" class="form-input period-temp-input" value="${p.temperature ?? 21}"
              step="0.5" min="10" max="30" placeholder="°C" style="width:60px;display:${isManual ? "block" : "none"}"
              data-sched="${si}" data-period="${pi}" data-field="temperature">
          </div>
          <input type="number" class="form-input" value="${p.offset ?? 0}"
            step="0.5" min="-3" max="3"
            data-sched="${si}" data-period="${pi}" data-field="offset" placeholder="±°C" style="width:55px">
          <button class="btn btn-danger btn-icon"
            data-action="del-period" data-sched="${si}" data-period="${pi}">✕</button>
        </div>`;
      }).join("");
      return `
        <div class="sched-block">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <strong style="font-size:14px">Gruppe ${si + 1}</strong>
            <button class="btn btn-danger" style="font-size:12px;padding:4px 10px"
              data-action="del-sched" data-sched="${si}">Gruppe löschen</button>
          </div>
          <div style="margin-bottom:8px">
            <div class="form-label" style="margin-bottom:4px">Name (optional)</div>
            <input type="text" class="form-input" style="width:100%"
              placeholder="z.B. Winter, Gäste, Sommer…"
              data-sched="${si}" data-sched-field="name" value="${schedName}">
          </div>
          <div style="margin-bottom:10px;padding:8px 10px;background:var(--secondary-background-color);border-radius:6px;border:1px solid var(--divider-color)">
            <div class="form-label" style="margin-bottom:6px">🔀 Bedingung (optional) — Gruppe nur aktiv wenn:</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
              <input type="text" class="form-input" style="flex:2;min-width:180px"
                placeholder="input_boolean.winter_modus (leer = immer aktiv)"
                data-sched="${si}" data-sched-field="condition_entity" value="${condEntity}"
                data-ep-domains="input_boolean,binary_sensor,person,device_tracker,switch,sensor" autocomplete="off">
              <span style="font-size:12px;color:var(--secondary-text-color);flex-shrink:0">Zustand =</span>
              <input type="text" class="form-input" style="width:60px"
                placeholder="on"
                data-sched="${si}" data-sched-field="condition_state" value="${condState}">
            </div>
          </div>
          <div style="margin-bottom:12px">
            <div class="form-label" style="margin-bottom:6px">Aktive Tage:</div>
            <div class="day-chips">${dayChips}</div>
          </div>
          <div class="period-header" style="grid-template-columns:80px 80px 1fr auto auto 30px">
            <span>Von</span><span>Bis</span><span>Modus / Temp</span><span>Offset</span><span></span>
          </div>
          ${periodRows}
          <button class="btn btn-secondary" style="font-size:12px;margin-top:6px"
            data-action="add-period" data-sched="${si}">+ Zeitraum</button>
        </div>`;
    }).join("");

    container.innerHTML = `
      <div class="card">
        <div class="info-box">
          Modus wählt die Zimmer-Preset-Temperatur (Komfort / Eco / Schlaf / Abwesend).<br>
          <strong>Manuell</strong> = eigene Temperatur eingeben.<br>
          Außerhalb des Zeitplans: <strong>Heizkurven-Temp + Zimmer-Offset</strong>
        </div>
        <div id="sched-editor">${schedBlocks || '<div style="color:var(--secondary-text-color);padding:8px">Noch keine Gruppen. Unten auf + Gruppe klicken.</div>'}</div>
        <div class="btn-row">
          <button class="btn btn-secondary" id="add-sched-btn">+ Gruppe hinzufügen</button>
          <button class="btn btn-primary" id="save-sched-btn">💾 Zeitpläne speichern</button>
        </div>
      </div>`;

    container.querySelectorAll(".day-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        const si = parseInt(chip.dataset.sched, 10);
        const day = chip.dataset.day;
        const sched = this._editingSchedules[selId][si];
        if (sched.days.includes(day)) sched.days = sched.days.filter(d => d !== day);
        else sched.days.push(day);
        chip.classList.toggle("selected", sched.days.includes(day));
      });
    });

    container.querySelectorAll("[data-field]").forEach(inp => {
      inp.addEventListener("change", () => {
        const si = parseInt(inp.dataset.sched, 10);
        const pi = parseInt(inp.dataset.period, 10);
        const field = inp.dataset.field;
        let val;
        if (field === "start" || field === "end" || field === "mode") {
          val = inp.value;
        } else {
          val = parseFloat(inp.value);
        }
        this._editingSchedules[selId][si].periods[pi][field] = val;

        // When mode changes: show/hide the manual temperature input
        if (field === "mode") {
          const row = inp.closest(".period-row");
          const tempInp = row?.querySelector(".period-temp-input");
          if (tempInp) tempInp.style.display = val === "manual" ? "block" : "none";
        }
      });
    });

    // Schedule-level fields (name, condition_entity, condition_state)
    container.querySelectorAll("[data-sched-field]").forEach(inp => {
      inp.addEventListener("input", () => {
        const si = parseInt(inp.dataset.sched, 10);
        const field = inp.dataset.schedField;
        this._editingSchedules[selId][si][field] = inp.value.trim();
      });
    });
    // Attach entity pickers for condition_entity fields
    container.querySelectorAll("[data-sched-field='condition_entity']").forEach(inp => {
      this._attachEntityPickers(inp.closest(".sched-block") || container);
    });

    container.querySelectorAll("[data-action='del-period']").forEach(btn => {
      btn.addEventListener("click", () => {
        const si = parseInt(btn.dataset.sched, 10);
        const pi = parseInt(btn.dataset.period, 10);
        this._editingSchedules[selId][si].periods.splice(pi, 1);
        this._renderRoomScheduleInline(room, container);
      });
    });

    container.querySelectorAll("[data-action='del-sched']").forEach(btn => {
      btn.addEventListener("click", () => {
        this._editingSchedules[selId].splice(parseInt(btn.dataset.sched, 10), 1);
        this._renderRoomScheduleInline(room, container);
      });
    });

    container.querySelectorAll("[data-action='add-period']").forEach(btn => {
      btn.addEventListener("click", () => {
        const si = parseInt(btn.dataset.sched, 10);
        this._editingSchedules[selId][si].periods.push(
          { start: "07:00", end: "09:00", mode: "comfort", temperature: 21.0, offset: 0.0 }
        );
        this._renderRoomScheduleInline(room, container);
      });
    });

    container.querySelector("#add-sched-btn").addEventListener("click", () => {
      this._editingSchedules[selId].push({ days: ["mon"], periods: [
        { start: "07:00", end: "09:00", mode: "comfort", temperature: 21.0, offset: 0.0 }
      ]});
      this._renderRoomScheduleInline(room, container);
    });

    container.querySelector("#save-sched-btn").addEventListener("click", async () => {
      const roomId = room.room_id;
      if (!roomId) { this._toast("Fehler: room_id fehlt"); return; }
      await this._callService("update_room", {
        id: roomId,
        schedules: this._editingSchedules[selId],
      });
      // Clear buffer so next open re-reads from saved HA state
      delete this._editingSchedules[selId];
      this._toast(`✓ Zeitpläne für „${room.name}" gespeichert`);
    });

    // ── HA Schedules (schedule.* entities) ────────────────────────────────
    // Build live status HTML for configured HA schedules
    const haSchedsConfig = room.ha_schedules || [];
    const MODE_LABELS = { comfort: "☀️ Komfort", eco: "🌿 Eco", sleep: "🌙 Schlaf", away: "🚶 Abwesend" };
    const activeSchedEntity = room.ha_schedule_entity || "";  // currently winning schedule entity
    const currentSource = room.source || "";

    const haStatusRows = haSchedsConfig.map(s => {
      const schedState = this._hass?.states[s.entity];
      const schedOn = schedState?.state === "on";
      const condEntity = s.condition_entity || "";
      const condExpected = s.condition_state || "on";
      const condMet = !condEntity || (this._hass?.states[condEntity]?.state === condExpected);
      const isWinning = schedOn && condMet && s.entity === activeSchedEntity;
      const condState = condEntity ? this._hass?.states[condEntity]?.state : null;

      const schedDot = schedOn
        ? `<span style="color:#66bb6a;font-weight:700">● AN</span>`
        : `<span style="color:#9e9e9e">● AUS</span>`;
      const condBadge = condEntity
        ? `<span style="font-size:11px;color:${condMet ? "#66bb6a" : "#ef5350"}">${condMet ? "✅" : "❌"} ${condEntity.split(".")[1]} = ${condExpected} <span style="opacity:.6">(ist: ${condState ?? "?"})</span></span>`
        : `<span style="font-size:11px;color:var(--secondary-text-color)">Immer aktiv</span>`;
      const winBadge = isWinning
        ? `<span style="background:#1b5e20;color:#a5d6a7;font-size:10px;padding:2px 6px;border-radius:10px;font-weight:700;margin-left:6px">▶ AKTIV</span>`
        : "";

      return `
        <div style="padding:8px 10px;border-radius:8px;margin-bottom:6px;
          background:${isWinning ? "rgba(27,94,32,0.15)" : "var(--secondary-background-color)"};
          border:1px solid ${isWinning ? "#388e3c" : "var(--divider-color)"}">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            ${schedDot}
            <span style="font-size:12px;font-weight:600;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s.entity}</span>
            <span style="font-size:11px;color:var(--secondary-text-color);flex-shrink:0">${MODE_LABELS[s.mode] || s.mode}</span>
            ${winBadge}
          </div>
          <div style="margin-top:4px">${condBadge}</div>
        </div>`;
    }).join("");

    const haStatusSection = haSchedsConfig.length > 0 ? `
      <div style="margin-bottom:14px">
        <div style="font-size:12px;font-weight:600;margin-bottom:8px">📡 Aktueller Status</div>
        ${haStatusRows}
        ${currentSource.startsWith("ha_schedule_") ? `
          <div style="font-size:11px;color:var(--secondary-text-color);padding:6px 10px;background:var(--secondary-background-color);border-radius:6px;margin-top:4px">
            ⏸ Kein Zeitplan aktiv → Fallback: <strong>${MODE_LABELS[room.ha_schedule_off_mode] || room.ha_schedule_off_mode}</strong>
          </div>` : ""}
      </div>` : "";

    const haSchedCard = document.createElement("div");
    haSchedCard.className = "card";
    haSchedCard.style.marginTop = "16px";
    haSchedCard.innerHTML = `
      <div class="card-title">🏠 HA Zeitpläne (schedule.*)</div>
      <p style="font-size:12px;color:var(--secondary-text-color);margin:0 0 12px">
        Verbindet <strong>schedule.*</strong>-Helfer mit diesem Zimmer. Wenn aktiv, übernimmt IHC den
        gewählten Temperaturmodus. Erstellen: HA → Einstellungen → Helfer → Zeitplan.
      </p>
      ${haStatusSection}
      <div class="settings-item" style="margin-bottom:14px">
        <label style="font-weight:600">Fallback wenn kein HA-Zeitplan aktiv</label>
        <select class="form-select" id="rs-ha-sched-off-mode" style="margin-top:4px">
          <option value="eco"   ${(room.ha_schedule_off_mode || 'eco') === 'eco'   ? 'selected' : ''}>🌿 Eco-Temperatur</option>
          <option value="sleep" ${(room.ha_schedule_off_mode || 'eco') === 'sleep' ? 'selected' : ''}>🌙 Schlaf-Temperatur</option>
          <option value="away"  ${(room.ha_schedule_off_mode || 'eco') === 'away'  ? 'selected' : ''}>🚶 Abwesend-Temperatur</option>
        </select>
        <span class="form-hint">Modus wenn kein schedule.* gerade eingeschaltet ist</span>
      </div>
      <details style="margin-bottom:10px">
        <summary style="font-size:12px;font-weight:600;cursor:pointer;color:var(--secondary-text-color);padding:4px 0">
          ⚙️ Zeitpläne bearbeiten (${haSchedsConfig.length} konfiguriert)
        </summary>
        <div style="margin-top:10px">
          <div style="font-size:11px;color:var(--secondary-text-color);margin-bottom:6px">
            Entität (schedule.*) + Modus · Zeile 2: Bedingung + Zustand (optional)
          </div>
          <div id="rs-ha-sched-list"></div>
          <div class="btn-row" style="margin-top:10px;flex-wrap:wrap;gap:6px">
            <button class="btn btn-secondary" id="rs-add-ha-sched">+ Zeitplan hinzufügen</button>
            <button class="btn btn-primary"   id="rs-save-ha-sched">💾 HA Zeitpläne speichern</button>
          </div>
        </div>
      </details>`;
    container.appendChild(haSchedCard);

    // Pre-populate existing HA schedule rows
    const haSchedList = haSchedCard.querySelector("#rs-ha-sched-list");
    (room.ha_schedules || []).forEach(entry => haSchedList.appendChild(this._makeHaSchedRow(entry)));

    haSchedCard.querySelector("#rs-add-ha-sched").addEventListener("click", () =>
      haSchedList.appendChild(this._makeHaSchedRow()));

    haSchedCard.querySelector("#rs-save-ha-sched").addEventListener("click", async () => {
      const ha_schedules = this._collectHaScheduleRows(haSchedCard);
      const ha_schedule_off_mode = haSchedCard.querySelector("#rs-ha-sched-off-mode").value;
      await this._callService("update_room", {
        id: room.room_id,
        ha_schedules,
        ha_schedule_off_mode,
      });
      this._toast(`✓ HA Zeitpläne für „${room.name}" gespeichert`);
    });
  }

  _renderRoomCalendarInline(room, container) {
    const HOURS = Array.from({ length: 24 }, (_, h) => h);
    const tempToColor = (temp) => {
      if (temp === null) return "var(--secondary-background-color, #f5f5f5)";
      const lo = 14, hi = 24;
      const t = Math.max(0, Math.min(1, (temp - lo) / (hi - lo)));
      return `rgb(${Math.round(30 + t * 200)},${Math.round(100 - t * 60)},${Math.round(200 - t * 180)})`;
    };
    const buildGrid = (scheds, def = null) => DAY_KEYS.map(dayKey =>
      HOURS.map(hour => {
        const timeMin = hour * 60;
        for (const s of scheds) {
          if (!s.days?.includes(dayKey)) continue;
          for (const p of (s.periods || [])) {
            const [sh, sm] = (p.start || "0:0").split(":").map(Number);
            const [eh, em] = (p.end   || "0:0").split(":").map(Number);
            const sMin = sh * 60 + sm, eMin = eh * 60 + em;
            const in_ = sMin <= eMin ? (timeMin >= sMin && timeMin < eMin) : (timeMin >= sMin || timeMin < eMin);
            if (in_) return p.temperature ?? def;
          }
        }
        return null;
      })
    );
    // Check if a schedule group's condition is currently met (client-side)
    const isGroupActive = (sched) => {
      const condEntity = sched.condition_entity || "";
      if (!condEntity) return true;
      const state = this._hass?.states[condEntity];
      const expected = sched.condition_state || "on";
      return state && state.state === expected;
    };

    const allScheds = room.schedules || [];
    // Active groups (condition met or no condition) → shown with temperature color
    const activeScheds = allScheds.filter(s => isGroupActive(s));
    // Inactive conditional groups → shown muted
    const inactiveScheds = allScheds.filter(s => !isGroupActive(s));

    const ihcGrid        = buildGrid(activeScheds);
    const ihcGridInactive = buildGrid(inactiveScheds);

    const cols = HOURS.map((_, h) =>
      `<div style="font-size:9px;text-align:center;color:var(--secondary-text-color);width:${100/24}%;min-width:0">${h % 3 === 0 ? h + "h" : ""}</div>`
    ).join("");

    // ── HA schedule grids must be defined BEFORE rows so they can be referenced inside the map ──
    const HA_MODE_STYLE = {
      comfort: { label: "Komfort", color: "rgba(255,152,0,0.35)" },
      eco:     { label: "Eco",     color: "rgba(76,175,80,0.35)"  },
      sleep:   { label: "Schlaf",  color: "rgba(33,150,243,0.35)" },
      away:    { label: "Abwesend",color: "rgba(158,158,158,0.35)"},
    };
    const haBlocks    = room.ha_schedule_blocks || {};
    const haSchedsCfg = room.ha_schedules || [];
    const yamlEntityIds = new Set(
      Object.entries(haBlocks)
        .filter(([, blocks]) => Array.isArray(blocks) && blocks.some(b => b._yaml_defined))
        .map(([eid]) => eid)
    );
    const haGrids = Object.entries(haBlocks)
      .filter(([eid]) => !yamlEntityIds.has(eid))
      .map(([eid, blocks]) => {
        const cfg = haSchedsCfg.find(s => s.entity === eid) || {};
        return { entityId: eid, mode: cfg.mode || "comfort", grid: buildGrid(blocks, true) };
      });

    const rows = DAY_KEYS.map((dayKey, di) => {
      const cells = HOURS.map((_, h) => {
        const val         = ihcGrid[di][h];
        const valInactive = ihcGridInactive[di][h];
        const haActive    = haGrids.find(hg => hg.grid[di][h] != null);
        let bg, label = "", opacity = "1";
        if (val != null) {
          bg = tempToColor(val); label = val;
        } else if (valInactive != null) {
          bg = "rgba(128,128,128,0.2)"; label = ""; opacity = "0.6";
        } else if (haActive) {
          const s = HA_MODE_STYLE[haActive.mode] || HA_MODE_STYLE.comfort;
          bg = s.color; label = s.label[0];
        } else {
          bg = "var(--secondary-background-color, #f5f5f5)";
        }
        const title = val != null ? `${val} °C` : valInactive != null ? `${valInactive} °C (Bedingung nicht erfüllt)` : haActive ? `HA: ${haActive.entityId} → ${haActive.mode}` : "—";
        return `<div title="${title}" style="flex:1;height:22px;background:${bg};opacity:${opacity};border-radius:2px;margin:1px;display:flex;align-items:center;justify-content:center;font-size:8px;color:rgba(0,0,0,0.55);font-weight:600">${label}</div>`;
      }).join("");
      return `<div style="display:flex;align-items:center;gap:0;margin-bottom:1px">
        <div style="width:24px;font-size:10px;color:var(--secondary-text-color);flex-shrink:0">${DAYS[di]}</div>
        <div style="display:flex;flex:1;gap:0">${cells}</div>
      </div>`;
    }).join("");

    // IHC schedule group legend (shows name + condition status)
    const schedLegend = allScheds.length > 0 ? `
      <div style="margin-top:10px;padding-top:8px;border-top:1px solid var(--divider-color)">
        <div style="font-size:11px;font-weight:700;margin-bottom:6px;color:var(--secondary-text-color)">IHC Zeitplan-Gruppen</div>
        ${allScheds.map((s, i) => {
          const active = isGroupActive(s);
          const name = s.name || `Gruppe ${i + 1}`;
          const cond = s.condition_entity
            ? `<span style="font-size:10px;color:${active ? "#66bb6a" : "#9e9e9e"}">${active ? "✓" : "✗"} ${s.condition_entity} = ${s.condition_state || "on"}</span>`
            : `<span style="font-size:10px;color:#66bb6a">Immer aktiv</span>`;
          return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:3px;opacity:${active ? "1" : "0.55"}">
            <span style="font-size:11px;font-weight:600">${name}</span>
            ${cond}
          </div>`;
        }).join("")}
      </div>` : "";

    const haLegend = haGrids.length > 0 ? `
      <div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--divider-color)">
        <div style="font-size:11px;font-weight:700;margin-bottom:6px;color:var(--secondary-text-color)">🏠 Verknüpfte HA-Zeitpläne</div>
        ${haGrids.map(hg => {
          const s = HA_MODE_STYLE[hg.mode] || HA_MODE_STYLE.comfort;
          const cnt = haBlocks[hg.entityId]?.filter(b => !b._yaml_defined).length ?? 0;
          return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap">
            <div style="width:14px;height:14px;border-radius:3px;background:${s.color};border:1px solid rgba(0,0,0,0.15)"></div>
            <span style="font-size:11px;font-weight:600">${hg.entityId}</span>
            <span style="font-size:10px;color:var(--secondary-text-color)">${s.label} · ${cnt} Blöcke</span>
            ${cnt > 0 ? `<button class="btn btn-secondary" style="font-size:10px;padding:2px 8px"
              data-action="import-ha-sched" data-room-id="${room.room_id}"
              data-entity="${hg.entityId}" data-blocks='${JSON.stringify(haBlocks[hg.entityId])}'>📥 Als IHC-Zeitplan importieren</button>`
              : `<span style="font-size:10px;color:#e53935">⚠️ Keine Blöcke gelesen</span>`}
          </div>`;
        }).join("")}
      </div>` : "";

    const yamlBanner = yamlEntityIds.size > 0 ? `
      <div style="margin-top:8px;padding:8px 12px;background:#fff8e1;border:1px solid #f9a825;border-radius:8px;font-size:11px;line-height:1.5">
        <strong>ℹ️ YAML-Zeitpläne erkannt:</strong>
        ${[...yamlEntityIds].map(eid => `<code>${eid}</code>`).join(", ")}<br>
        Diese Zeitpläne wurden via <strong>YAML</strong> angelegt. Die Wochenansicht ist nur für Zeitpläne verfügbar die
        im HA-UI erstellt wurden (Einstellungen → Helfer → Zeitplan).
        Die <strong>Heizfunktion</strong> arbeitet trotzdem korrekt – nur die visuelle Übersicht fehlt.<br>
        <em>Lösung: Zeitplan im HA-UI neu erstellen und den YAML-Eintrag entfernen.</em>
      </div>` : "";

    const haSchedsConfigured = haSchedsCfg.length > 0;
    const haBlocksEmpty = haGrids.length === 0 && yamlEntityIds.size === 0;
    const haNoBlocksHint = haSchedsConfigured && haBlocksEmpty
      ? `<div style="font-size:11px;color:#e65100;margin-top:6px;padding:6px 8px;background:color-mix(in srgb,#e65100 10%,transparent);border-radius:6px">
          ⚠️ HA-Zeitpläne konfiguriert, aber keine Blöcke lesbar.
          Stelle sicher, dass die Entitäten existieren und als UI-Helfer (nicht YAML) im HA angelegt wurden.
         </div>` : "";

    const noHint = allScheds.length === 0 && haGrids.length === 0 && yamlEntityIds.size === 0 && !haSchedsConfigured
      ? `<div style="font-size:11px;color:var(--secondary-text-color);margin-top:8px">
          Kein Zeitplan — wechsle zum Tab <strong>📅 Zeitplan</strong> um einen zu erstellen.
         </div>` : "";

    container.innerHTML = `
      <div class="card">
        <div class="info-box" style="margin-bottom:12px">
          IHC-Zeitpläne farbig nach Temperatur (blau=kalt → rot=warm). Grau = Bedingung nicht erfüllt. HA-Zeitpläne blass nach Modus.
        </div>
        <div style="display:flex;margin-left:24px;margin-bottom:2px">${cols}</div>
        ${rows}
        <div style="margin-top:6px;display:flex;gap:6px;align-items:center;font-size:10px;color:var(--secondary-text-color)">
          <span>Kalt</span>
          <div style="flex:1;height:6px;border-radius:3px;background:linear-gradient(to right,rgb(30,100,200),rgb(200,80,20),rgb(230,40,20))"></div>
          <span>Warm</span>
        </div>
        ${schedLegend}
        ${haLegend}
        ${yamlBanner}
        ${haNoBlocksHint}
        ${noHint}
      </div>`;

    container.querySelectorAll("[data-action='import-ha-sched']").forEach(btn => {
      btn.addEventListener("click", async () => {
        const roomId = btn.dataset.roomId;
        let blocks;
        try { blocks = JSON.parse(btn.dataset.blocks); } catch { return; }
        if (!blocks.length) return;
        const tempStr = prompt(`Temperatur für importierte Blöcke (°C)?\nLeer = 21°C`, "21");
        const temperature = parseFloat(tempStr) || 21;
        const schedules = blocks.map(b => ({
          days: b.days,
          periods: (b.periods || []).map(p => ({ start: p.start, end: p.end, temperature, offset: 0 })),
        }));
        await this._callService("update_room", { id: roomId, schedules });
        this._toast(`✓ Importiert – prüfe Tab Zeitplan`);
        delete this._editingSchedules[room.entity_id];
        setTimeout(() => {
          const tc = this.shadowRoot.querySelector("#tab-content");
          if (tc) this._renderRoomDetail(room, tc);
        }, 1200);
      });
    });
  }

  _renderRoomHistory(room, container) {
    const history = room.temp_history || [];

    if (history.length < 2) {
      container.innerHTML = `<div class="card"><div style="padding:24px;color:var(--secondary-text-color);text-align:center">
        Noch zu wenig Daten – Verlauf wird stündlich aufgezeichnet (max. 7 Tage).
      </div></div>`;
      return;
    }

    const vals  = history.map(p => p.v);
    const times = history.map(p => p.t);

    // Target history – align timestamps with actual history for x-positioning
    const targetHistory = room.target_history || [];
    const tgtMap = {};
    targetHistory.forEach(p => { tgtMap[p.t] = p.v; });
    // Build parallel array: for each actual reading, find closest target value
    const tgtVals = times.map(t => tgtMap[t] ?? null);
    const hasTgtHistory = tgtVals.some(v => v !== null);

    // Combined min/max across both series for a shared Y scale
    const allVals = [...vals, ...tgtVals.filter(v => v !== null)];
    const minV = Math.min(...allVals) - 0.5;
    const maxV = Math.max(...allVals) + 0.5;
    const range = maxV - minV || 1;

    // Chart dimensions
    const W = 560, H = 200, padL = 38, padR = 12, padT = 14, padB = 36;
    const cW = W - padL - padR;
    const cH = H - padT - padB;

    const xOf = i => padL + (i / (vals.length - 1)) * cW;
    const yOf = v => padT + cH - ((v - minV) / range) * cH;

    // Ist-Verlauf (blau)
    const pts = vals.map((v, i) => `${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`).join(" ");

    // Soll-Verlauf (orange) – als Stufenlinie (Zeitplan ändert sich abrupt)
    let tgtPolyline = "";
    if (hasTgtHistory) {
      const segments = [];
      let seg = [];
      tgtVals.forEach((v, i) => {
        if (v !== null) {
          seg.push(`${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`);
        } else if (seg.length) {
          segments.push(seg.join(" "));
          seg = [];
        }
      });
      if (seg.length) segments.push(seg.join(" "));
      tgtPolyline = segments.map(s =>
        `<polyline points="${s}" fill="none" stroke="#fb8c00" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" opacity="0.85"/>`
      ).join("");
    }

    // Y-axis labels (4 ticks)
    const yTicks = [0, 0.33, 0.67, 1].map(f => {
      const v = minV + f * range;
      const y = yOf(v).toFixed(1);
      return `<line x1="${padL - 3}" y1="${y}" x2="${padL}" y2="${y}" stroke="var(--divider-color)" stroke-width="1"/>
              <text x="${padL - 5}" y="${parseFloat(y) + 4}" text-anchor="end" font-size="9" fill="var(--secondary-text-color)">${v.toFixed(1)}</text>`;
    }).join("");

    // X-axis labels
    const xLabels = [];
    const step = Math.max(1, Math.floor(vals.length / 7));
    for (let i = 0; i < vals.length; i += step) {
      const t = times[i] || "";
      let label = t;
      try {
        const d = new Date(t);
        const dayNames = ["So","Mo","Di","Mi","Do","Fr","Sa"];
        label = `${dayNames[d.getDay()]} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
      } catch(_) { /* keep raw */ }
      xLabels.push(`<text x="${xOf(i).toFixed(1)}" y="${H - padB + 14}" text-anchor="middle" font-size="9" fill="var(--secondary-text-color)">${label}</text>`);
    }

    // Current value dot + label
    const lastVal = vals[vals.length - 1];
    const lastX   = xOf(vals.length - 1).toFixed(1);
    const lastY   = yOf(lastVal).toFixed(1);
    // Current target dot
    const lastTgt = tgtVals.slice().reverse().find(v => v !== null);
    const lastTgtDot = (hasTgtHistory && lastTgt != null) ? (() => {
      const lastTgtIdx = tgtVals.length - 1 - [...tgtVals].reverse().findIndex(v => v !== null);
      const tx = xOf(lastTgtIdx).toFixed(1);
      const ty = yOf(lastTgt).toFixed(1);
      return `<circle cx="${tx}" cy="${ty}" r="3.5" fill="#fb8c00" stroke="white" stroke-width="1.5"/>
              <text x="${parseFloat(tx) + 6}" y="${parseFloat(ty) + 4}" font-size="10" font-weight="600" fill="#fb8c00">${lastTgt.toFixed(1)} °C</text>`;
    })() : "";

    const svg = `
      <svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:${W}px;height:${H}px;display:block;overflow:visible" aria-label="Temperaturverlauf ${room.name}">
        <rect x="${padL}" y="${padT}" width="${cW}" height="${cH}" fill="var(--card-background-color,#fafafa)" rx="4" opacity="0.5"/>
        ${[0, 0.33, 0.67, 1].map(f => {
          const y = yOf(minV + f * range).toFixed(1);
          return `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="var(--divider-color)" stroke-width="0.5" opacity="0.6"/>`;
        }).join("")}
        <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + cH}" stroke="var(--divider-color)" stroke-width="1"/>
        ${yTicks}
        <line x1="${padL}" y1="${padT + cH}" x2="${W - padR}" y2="${padT + cH}" stroke="var(--divider-color)" stroke-width="1"/>
        ${xLabels.join("")}
        <!-- Soll-Verlauf (orange) -->
        ${tgtPolyline}
        <!-- Ist-Verlauf (blau) -->
        <polyline points="${pts}" fill="none" stroke="var(--primary-color)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
        <!-- Endpunkte -->
        <circle cx="${lastX}" cy="${lastY}" r="4" fill="var(--primary-color)" stroke="white" stroke-width="1.5"/>
        <text x="${parseFloat(lastX) + 7}" y="${parseFloat(lastY) + 4}" font-size="10" font-weight="600" fill="var(--primary-color)">${lastVal.toFixed(1)} °C</text>
        ${lastTgtDot}
      </svg>`;

    const minStr = Math.min(...vals).toFixed(1);
    const maxStr = Math.max(...vals).toFixed(1);
    const avgStr = (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);

    container.innerHTML = `
      <div class="card">
        <div class="card-title">📈 Temperaturverlauf – ${room.name}</div>
        <div style="padding:4px 0 12px;overflow-x:auto">${svg}</div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px">
          <span style="font-size:11px;display:flex;align-items:center;gap:4px">
            <svg width="20" height="4"><line x1="0" y1="2" x2="20" y2="2" stroke="var(--primary-color)" stroke-width="2"/></svg>
            Ist-Temperatur
          </span>
          ${hasTgtHistory ? `<span style="font-size:11px;display:flex;align-items:center;gap:4px">
            <svg width="20" height="4"><line x1="0" y1="2" x2="20" y2="2" stroke="#fb8c00" stroke-width="2"/></svg>
            Soll-Temperatur
          </span>` : ""}
        </div>
        <div style="display:flex;gap:24px;padding:4px 0 8px;flex-wrap:wrap">
          <div style="font-size:12px;color:var(--secondary-text-color)"><span style="font-weight:600;color:var(--primary-text-color)">Min:</span> ${minStr} °C</div>
          <div style="font-size:12px;color:var(--secondary-text-color)"><span style="font-weight:600;color:var(--primary-text-color)">Max:</span> ${maxStr} °C</div>
          <div style="font-size:12px;color:var(--secondary-text-color)"><span style="font-weight:600;color:var(--primary-text-color)">Ø:</span> ${avgStr} °C</div>
          <div style="font-size:12px;color:var(--secondary-text-color)"><span style="font-weight:600;color:var(--primary-text-color)">Messpunkte:</span> ${vals.length}</div>
          ${lastTgt != null ? `<div style="font-size:12px;color:#fb8c00"><span style="font-weight:600">Soll aktuell:</span> ${lastTgt.toFixed(1)} °C</div>` : ""}
        </div>
        <div style="font-size:11px;color:var(--secondary-text-color);padding-top:4px">Stündliche Messung · max. 7 Tage Verlauf</div>
      </div>`;

    // v1.6 – Anforderungs-Heatmap pro Zimmer
    if (room.demand_heatmap && room.demand_heatmap.length === 7) {
      const heatmapCard = document.createElement("div");
      heatmapCard.className = "card";
      heatmapCard.style.marginTop = "16px";
      heatmapCard.innerHTML = `
        <div class="card-title">🔥 Anforderungs-Heatmap</div>
        <div style="font-size:12px;color:var(--secondary-text-color);margin-bottom:12px">
          Gleitender Durchschnitt der Heizanforderung nach Wochentag und Uhrzeit (EMA, lernt über mehrere Wochen).
        </div>
        <div id="hm-${room.room_id}"></div>`;
      container.appendChild(heatmapCard);
      const gridContainer = heatmapCard.querySelector(`#hm-${room.room_id}`);
      gridContainer.innerHTML = this._renderDemandHeatmapGrid(room.demand_heatmap);
    }

    // Optimum Start – Lernkurve + Thermische Masse
    const warmupCurve = room.warmup_curve || [];
    const learnedMin = room.learned_preheat_minutes;
    const coolingRate = room.avg_cooling_rate;
    if (warmupCurve.length > 0 || coolingRate != null) {
      const learnCard = document.createElement("div");
      learnCard.className = "card";
      learnCard.style.marginTop = "16px";

      // Build warmup curve table rows
      let warmupRows = "";
      if (warmupCurve.length > 0) {
        warmupRows = warmupCurve.map(pt => `
          <tr>
            <td style="padding:3px 8px;text-align:right">${pt.outdoor_temp > 0 ? "+" : ""}${pt.outdoor_temp} °C</td>
            <td style="padding:3px 8px;text-align:right">${pt.avg_minutes.toFixed(0)} min</td>
            <td style="padding:3px 8px;text-align:right;color:var(--secondary-text-color)">${pt.samples}×</td>
          </tr>`).join("");
      }

      learnCard.innerHTML = `
        <div class="card-title">🧠 Lernkurve – Optimum Start & Thermische Masse</div>
        <div style="font-size:12px;color:var(--secondary-text-color);margin-bottom:12px">
          IHC misst wie lange der Raum benötigt um den Sollwert zu erreichen (Aufheizrate) und wie schnell er abkühlt.
          Die Daten werden pro Außentemperatur gespeichert und für die automatische Vorheizzeit genutzt.
        </div>
        ${learnedMin != null ? `
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
            <span style="font-size:13px">📐 Aktuelle Vorheizzeit (gelernt):</span>
            <span style="font-size:15px;font-weight:700;color:var(--primary-color)">${learnedMin.toFixed(0)} min</span>
          </div>` : ""}
        ${coolingRate != null ? `
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
            <span style="font-size:13px">❄️ Abkühlrate:</span>
            <span style="font-size:15px;font-weight:700;color:#42a5f5">${coolingRate.toFixed(3)} °C/h je °C Δ (innen/außen)</span>
          </div>` : ""}
        ${warmupCurve.length > 0 ? `
          <div style="font-size:12px;font-weight:600;margin-bottom:6px">Aufheizkurve nach Außentemperatur</div>
          <div style="overflow-x:auto">
            <table style="width:100%;border-collapse:collapse;font-size:12px">
              <thead>
                <tr style="border-bottom:1px solid var(--divider-color)">
                  <th style="padding:3px 8px;text-align:right;color:var(--secondary-text-color)">Außen</th>
                  <th style="padding:3px 8px;text-align:right;color:var(--secondary-text-color)">Ø Aufheizzeit</th>
                  <th style="padding:3px 8px;text-align:right;color:var(--secondary-text-color)">Messungen</th>
                </tr>
              </thead>
              <tbody>${warmupRows}</tbody>
            </table>
          </div>` : `
          <div style="padding:16px;text-align:center;color:var(--secondary-text-color);font-size:12px">
            Noch keine Lernkurven-Daten – IHC sammelt beim nächsten Aufheizzyklus erste Messungen.
          </div>`}`;
      container.appendChild(learnCard);
    }
  }



// === 06_tab_diagnose.js ===
/**
 * 06_tab_diagnose.js
 * IHC Frontend – Diagnose / Übersicht Tab
 * Contains: _renderDiagnose
 */
  // ── Übersicht (Diagnose) Tab ────────────────────────────────────────────────

  _renderDiagnose(content) {
    const g   = this._getGlobal();
    const dem = this._st("sensor.ihc_gesamtanforderung") || { attributes: {} };
    const a   = dem.attributes;
    const systemSel = this._st("select.ihc_systemmodus");
    const curMode   = systemSel ? systemSel.state : "auto";
    const rooms = this._getRoomData();
    const roomList = Object.values(rooms);

    const activeBadge = (label, cls = "") => `<span class="ihc-card-badge ${cls}">${label}</span>`;
    const fmt = (v, unit = "—") => (v !== null && v !== undefined && !isNaN(v)) ? `${v}${unit}` : "—";

    // Active flags
    const flags = [
      a.startup_grace_active    ? {icon:"⏳", label:`Startup-Gnadenfrist · Sensoren werden geladen`, cls:"warn"} : null,
      g.heating_active          ? {icon:"🔥", label:"Heizung aktiv",    cls:"warn"} : null,
      g.night_setback_active    ? {icon:"🌙", label:"Nachtabsenkung",    cls:""} : null,
      g.summer_mode             ? {icon:"☀️", label:"Sommer-Modus",      cls:"warn"} : null,
      g.presence_away_active    ? {icon:"🚶", label:"Anwesenheit: Abwesend", cls:"warn"} : null,
      g.guest_mode_active       ? {icon:"🎉", label:`Gäste-Modus${g.guest_remaining_minutes != null ? " · " + g.guest_remaining_minutes + "min" : ""}`, cls:"info"} : null,
      g.vacation_auto_active    ? {icon:"✈️", label:"Urlaubs-Modus",      cls:"info"} : null,
      g.return_preheat_active   ? {icon:"🏠", label:"Rückkehr-Vorheizen", cls:"info"} : null,
      g.solar_boost > 0         ? {icon:"⚡", label:`Solar-Boost +${g.solar_boost}°`, cls:"info"} : null,
      g.energy_price_eco_active ? {icon:"💶", label:"Preis-Eco aktiv",   cls:"warn"} : null,
      g.cold_boost > 0          ? {icon:"❄️", label:`Kälte-Boost +${g.cold_boost}°`, cls:""} : null,
      (g.eta_preheat_minutes != null && g.eta_preheat_minutes <= 90) ? {icon:"🕒", label:`ETA ${Math.round(g.eta_preheat_minutes)} min`, cls:"info"} : null,
      (g.adaptive_curve_delta && Math.abs(g.adaptive_curve_delta) >= 0.1) ? {icon:"📈", label:`Kurve ${g.adaptive_curve_delta > 0 ? "+" : ""}${g.adaptive_curve_delta.toFixed(1)}°`, cls:""} : null,
    ].filter(Boolean);

    const flagsHtml = flags.length
      ? flags.map(f => `<span class="ihc-card-badge ${f.cls}" style="font-size:13px;padding:5px 12px">${f.icon} ${f.label}</span>`).join("")
      : `<span style="color:var(--secondary-text-color);font-size:13px">Keine aktiven Übersteuerungen</span>`;

    // Room status table
    const fmtT = v => (v != null && !isNaN(v)) ? parseFloat(v).toFixed(1) + " °C" : "—";
    // Check if any room has TRV or humidity data → show extra columns
    const hasTrvData = roomList.some(r => r.trv_raw_temp != null || (r.trv_avg_valve != null && r.trv_avg_valve > 0));
    const hasHumidity = roomList.some(r => r.trv_humidity != null || (r.mold && r.mold.humidity != null));
    const hasCo2 = roomList.some(r => r.co2_ppm > 0);
    const hasRuntime = roomList.some(r => r.runtime_today_minutes > 0);

    // ETA preheat section (only when enabled)
    const etaSection = (() => {
      if (!a.eta_preheat_enabled) return "";
      const presEntities = a.presence_entities || [];
      const isActive = g.eta_preheat_minutes != null && g.eta_preheat_minutes <= 90;

      // Read ETA from presence entity attributes directly
      const etaRows = presEntities.map(eid => {
        const st = this._hass?.states[eid];
        const name = st?.attributes?.friendly_name || eid;
        const arrStr = st?.attributes?.estimated_arrival_time;
        if (!arrStr) return { name, eid, mins: null, time: null };
        const arrival = new Date(arrStr);
        const mins = Math.round((arrival - new Date()) / 60000);
        if (mins < 0 || mins > 120) return { name, eid, mins: null, time: null };
        const time = arrival.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
        return { name, eid, mins, time };
      });

      const preheatingRooms = roomList.filter(r => r.source === "preheat");

      const rowsHtml = etaRows.map(r => `
        <tr>
          <td style="padding:5px 8px;border-bottom:1px solid var(--divider-color);font-weight:500">${r.name}</td>
          <td style="padding:5px 8px;border-bottom:1px solid var(--divider-color)">
            ${r.time ? r.time + " Uhr" : `<span style="color:var(--secondary-text-color)">keine ETA</span>`}
          </td>
          <td style="padding:5px 8px;border-bottom:1px solid var(--divider-color)">
            ${r.mins != null
              ? `<span style="font-weight:700;color:${r.mins <= 30 ? "#e53935" : r.mins <= 60 ? "#fb8c00" : "#43a047"}">~${r.mins} min</span>`
              : `<span style="color:var(--secondary-text-color);font-size:11px">außerhalb Fenster (0–120 min)</span>`}
          </td>
        </tr>`).join("");

      return `
      <details class="ihc-card" ${isActive ? "open" : ""}>
        <summary>
          <span class="ihc-card-title">🕒 ETA-Vorheizen
            ${isActive
              ? activeBadge(`Ankunft ~${Math.round(g.eta_preheat_minutes)} min`, "info")
              : ""}
          </span>
        </summary>
        <div class="ihc-card-body">
          <p style="font-size:12px;color:var(--secondary-text-color);margin:0 0 10px">
            Liest <code>estimated_arrival_time</code> aus den konfigurierten Anwesenheits-Entitäten.
            Benötigt <em>Google Maps Travel Time</em> oder <em>Waze Travel Time</em> in HA.
            IHC startet das Vorheizen wenn eine Ankunft ≤ 90 min bevorsteht.
          </p>
          ${etaRows.length ? `
          <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:14px">
            <thead>
              <tr style="color:var(--secondary-text-color);font-size:11px;text-transform:uppercase">
                <th style="text-align:left;padding:5px 8px;border-bottom:2px solid var(--divider-color)">Person</th>
                <th style="text-align:left;padding:5px 8px;border-bottom:2px solid var(--divider-color)">Ankunft</th>
                <th style="text-align:left;padding:5px 8px;border-bottom:2px solid var(--divider-color)">In Minuten</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>` : `
          <div style="color:var(--secondary-text-color);font-size:13px;margin-bottom:12px">
            Keine Person-Entitäten konfiguriert (→ Einstellungen → Anwesenheitserkennung).
          </div>`}
          ${preheatingRooms.length ? `
          <div style="font-size:12px;font-weight:600;margin-bottom:6px">🔥 Zimmer werden vorgeheizt:</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px">
            ${preheatingRooms.map(r =>
              `<span style="background:color-mix(in srgb,#ef5350 15%,transparent);padding:3px 10px;border-radius:12px;font-size:12px">
                ⏱ ${r.name} → ${r.target_temp != null ? r.target_temp + " °C" : "—"}
              </span>`).join("")}
          </div>` : `
          <div style="font-size:12px;color:var(--secondary-text-color)">
            ℹ️ Kein Zimmer wird aktuell vorgeheizt.
            ${!isActive ? " Vorheizen startet sobald eine Ankunft ≤ 90 min erkannt wird." : ""}
          </div>`}
        </div>
      </details>`;
    })();

    const roomRows = roomList.map(r => {
      const demColor = this._demandColor(r.demand);
      const modeLabel = MODE_ICONS[r.room_mode] + " " + (MODE_LABELS[r.room_mode] || r.room_mode);
      // Show effective target temp for current mode
      let effTemp = null;
      if (r.room_mode === "comfort") effTemp = r.comfort_temp_eff;
      else if (r.room_mode === "eco")     effTemp = r.eco_temp_eff;
      else if (r.room_mode === "sleep")   effTemp = r.sleep_temp_eff;
      else if (r.room_mode === "away")    effTemp = r.away_temp_eff;
      const effHtml = effTemp != null ? `<span style="font-size:10px;color:var(--secondary-text-color);margin-left:2px">(→${parseFloat(effTemp).toFixed(1)})</span>` : "";

      // Humidity from TRV or mold data
      const humidity = r.trv_humidity != null ? r.trv_humidity : (r.mold?.humidity ?? null);
      const moldRisk = r.mold && r.mold.risk;

      // Status cell: window, boost, anomaly, mold, CO2
      const statusParts = [];
      if (r.window_open)        statusParts.push("🪟 Fenster");
      if (r.boost_remaining > 0) statusParts.push(`⚡ Boost ${r.boost_remaining}min`);
      if (r.anomaly === "sensor_stuck") statusParts.push("⚠️ Sensor hängt");
      if (r.anomaly === "temp_drop")    statusParts.push("⚠️ Temp-Abfall");
      if (moldRisk)             statusParts.push(`💧 Schimmel!`);
      if (r.ventilation?.level === "urgent") statusParts.push("🪟❗ Lüften");

      return `<tr>
        <td style="font-weight:500;padding:6px 8px;border-bottom:1px solid var(--divider-color)">${r.name}</td>
        <td style="padding:6px 8px;border-bottom:1px solid var(--divider-color)">
          <div style="font-size:13px">${r.current_temp != null ? r.current_temp + " °C" : "—"}</div>
          ${r.trv_raw_temp != null && hasTrvData ? `<div style="font-size:10px;color:#e65100;margin-top:1px" title="TRV-Rohtemperatur">TRV: ${parseFloat(r.trv_raw_temp).toFixed(1)}°</div>` : ""}
        </td>
        <td style="padding:6px 8px;border-bottom:1px solid var(--divider-color)">${r.source === "system_off" ? "Aus" : (r.target_temp != null ? r.target_temp + " °C" : "—")}${effHtml}</td>
        <td style="padding:6px 8px;border-bottom:1px solid var(--divider-color)">
          <div style="display:flex;align-items:center;gap:6px">
            <div style="width:40px;height:7px;border-radius:4px;background:var(--divider-color)">
              <div style="width:${Math.min(r.demand,100)}%;height:100%;border-radius:4px;background:${demColor}"></div>
            </div>
            <span style="font-size:12px;color:${demColor};font-weight:600">${r.demand}%</span>
          </div>
          ${r.trv_avg_valve > 0 && hasTrvData ? `<div style="font-size:10px;color:#1565c0;margin-top:2px" title="Durchschn. Ventilöffnung">Ventil: ${Math.round(r.trv_avg_valve)}%</div>` : ""}
        </td>
        ${hasHumidity ? `<td style="padding:6px 8px;border-bottom:1px solid var(--divider-color);font-size:12px">
          ${humidity != null ? `<span style="${moldRisk ? "color:#c62828;font-weight:600" : "color:var(--secondary-text-color)"}" title="${moldRisk ? "⚠️ Schimmelrisiko!" : "Luftfeuchtigkeit"}">💧 ${Math.round(humidity)}%</span>` : "—"}
        </td>` : ""}
        ${hasCo2 ? `<td style="padding:6px 8px;border-bottom:1px solid var(--divider-color);font-size:12px">
          ${r.co2_ppm > 0 ? `<span style="color:${r.co2_ppm > (r.co2_threshold_bad || 1200) ? "#c62828" : r.co2_ppm > (r.co2_threshold_good || 800) ? "#fb8c00" : "#43a047"}" title="CO₂-Konzentration">🌬️ ${r.co2_ppm}</span>` : "—"}
        </td>` : ""}
        <td style="font-size:12px;padding:6px 8px;border-bottom:1px solid var(--divider-color)">${modeLabel}</td>
        <td style="font-size:12px;padding:6px 8px;border-bottom:1px solid var(--divider-color);color:var(--secondary-text-color)">${statusParts.length ? statusParts.join(" · ") : ""}</td>
        ${hasRuntime ? `<td style="font-size:11px;padding:6px 8px;border-bottom:1px solid var(--divider-color);color:var(--secondary-text-color)">${r.runtime_today_minutes > 0 ? `⏱ ${r.runtime_today_minutes} min` : ""}</td>` : ""}
      </tr>`;
    }).join("");

    content.innerHTML = `
      <!-- ── Systemmodus & Schnellsteuerung ────────────────── -->
      <details class="ihc-card" open>
        <summary>
          <span class="ihc-card-title">🏠 Betriebsmodus</span>
        </summary>
        <div class="ihc-card-body">
          <div class="form-group">
            <label class="form-label">System-Modus manuell setzen</label>
            <div class="form-row">
              <select class="form-select" id="diag-system-mode-select">
                ${Object.entries(SYSTEM_MODE_LABELS)
                  .filter(([k]) => k !== "cool" || a.enable_cooling)
                  .map(([k, v]) => `<option value="${k}" ${curMode === k || curMode === v ? "selected" : ""}>${v}</option>`)
                  .join("")}
              </select>
              <button class="btn btn-primary" id="diag-set-system-mode">Setzen</button>
            </div>
          </div>
        </div>
      </details>

      <!-- ── Aktive Zustände ─────────────────────────────────── -->
      <details class="ihc-card" open>
        <summary>
          <span class="ihc-card-title">🔔 Aktive Zustände &amp; Overrides</span>
        </summary>
        <div class="ihc-card-body">
          <div style="display:flex;flex-wrap:wrap;gap:8px;padding:4px 0">
            ${flagsHtml}
          </div>
          ${g.guest_mode_active ? `
          <div style="margin-top:10px">
            <button class="btn btn-secondary" id="diag-deactivate-guest">✕ Gäste-Modus beenden</button>
          </div>` : ""}
        </div>
      </details>

      ${etaSection}

      <!-- ── Messwerte ───────────────────────────────────────── -->
      <details class="ihc-card" open>
        <summary>
          <span class="ihc-card-title">📡 Aktuelle Messwerte</span>
        </summary>
        <div class="ihc-card-body">
          <div class="settings-grid">
            <div class="settings-item">
              <label>Außentemperatur</label>
              <div style="font-size:22px;font-weight:700;color:var(--primary-color)">${fmt(g.outdoor_temp, " °C")}</div>
            </div>
            <div class="settings-item">
              <label>Gesamtanforderung</label>
              <div style="font-size:22px;font-weight:700;color:${this._demandColor(g.total_demand ?? 0)}">${fmt(g.total_demand, " %")}</div>
            </div>
            <div class="settings-item">
              <label>Zimmer mit Anforderung</label>
              <div style="font-size:22px;font-weight:700;color:var(--primary-color)">${g.rooms_demanding}</div>
            </div>
            ${g.curve_target != null ? `
            <div class="settings-item">
              <label>Heizkurve Zieltemperatur</label>
              <div style="font-size:22px;font-weight:700;color:var(--primary-color)">${g.curve_target.toFixed(1)} °C</div>
            </div>` : ""}
            ${g.solar_power != null ? `
            <div class="settings-item">
              <label>Solarleistung</label>
              <div style="font-size:22px;font-weight:700;color:#f9a825">${g.solar_power} W</div>
            </div>` : ""}
            ${g.energy_price != null ? `
            <div class="settings-item">
              <label>Aktueller Energiepreis</label>
              <div style="font-size:22px;font-weight:700;color:${g.energy_price_eco_active ? "#c62828" : "#43a047"}">${g.energy_price.toFixed(3)} €/kWh</div>
            </div>` : ""}
            ${g.flow_temp != null ? `
            <div class="settings-item">
              <label>Vorlauftemperatur</label>
              <div style="font-size:22px;font-weight:700;color:var(--primary-color)">${g.flow_temp.toFixed(1)} °C</div>
            </div>` : ""}
            ${g.outdoor_humidity != null ? `
            <div class="settings-item">
              <label>Außenluftfeuchtigkeit</label>
              <div style="font-size:22px;font-weight:700;color:var(--primary-color)">${g.outdoor_humidity.toFixed(0)} %</div>
            </div>` : ""}
          </div>
        </div>
      </details>

      <!-- ── Heute & Gestern ────────────────────────────────── -->
      <details class="ihc-card" open>
        <summary>
          <span class="ihc-card-title">📊 Energie &amp; Laufzeit</span>
        </summary>
        <div class="ihc-card-body">
          <div class="settings-grid">
            <div class="settings-item">
              <label>Heizlaufzeit heute</label>
              <div style="font-size:22px;font-weight:700;color:var(--primary-color)">${g.heating_runtime_today} min</div>
            </div>
            <div class="settings-item">
              <label>Energie heute</label>
              <div style="font-size:22px;font-weight:700;color:var(--primary-color)">${this._kwh(g.energy_today_kwh)} kWh</div>
            </div>
            ${g.heating_runtime_yesterday > 0 ? `
            <div class="settings-item">
              <label>Laufzeit gestern</label>
              <div style="font-size:18px;font-weight:600;color:var(--secondary-text-color)">${g.heating_runtime_yesterday} min</div>
            </div>` : ""}
            ${g.energy_yesterday_kwh > 0 ? `
            <div class="settings-item">
              <label>Energie gestern</label>
              <div style="font-size:18px;font-weight:600;color:var(--secondary-text-color)">${this._kwh(g.energy_yesterday_kwh)} kWh</div>
            </div>` : ""}
            ${g.efficiency_score != null ? `
            <div class="settings-item">
              <label>Effizienz-Score</label>
              <div style="font-size:22px;font-weight:700;color:${g.efficiency_score >= 80 ? "#43a047" : g.efficiency_score >= 60 ? "#fb8c00" : "#e53935"}">${g.efficiency_score.toFixed(0)} / 100</div>
            </div>` : ""}
          </div>
          <div class="btn-row" style="margin-top:12px">
            <button class="btn btn-secondary" id="diag-reset-stats">🗑 Statistik zurücksetzen</button>
          </div>
        </div>
      </details>

      <!-- ── Zimmer-Status Tabelle ───────────────────────────── -->
      ${roomList.length ? `
      <details class="ihc-card" open>
        <summary>
          <span class="ihc-card-title">🚪 Zimmer-Status</span>
        </summary>
        <div class="ihc-card-body" style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead>
              <tr style="color:var(--secondary-text-color);font-size:11px;text-transform:uppercase">
                <th style="text-align:left;padding:6px 8px;border-bottom:2px solid var(--divider-color)">Zimmer</th>
                <th style="text-align:left;padding:6px 8px;border-bottom:2px solid var(--divider-color)">Ist °C</th>
                <th style="text-align:left;padding:6px 8px;border-bottom:2px solid var(--divider-color)">Soll °C</th>
                <th style="text-align:left;padding:6px 8px;border-bottom:2px solid var(--divider-color)">Anforderung</th>
                ${hasHumidity ? `<th style="text-align:left;padding:6px 8px;border-bottom:2px solid var(--divider-color)">Feuchte</th>` : ""}
                ${hasCo2 ? `<th style="text-align:left;padding:6px 8px;border-bottom:2px solid var(--divider-color)">CO₂ ppm</th>` : ""}
                <th style="text-align:left;padding:6px 8px;border-bottom:2px solid var(--divider-color)">Modus</th>
                <th style="text-align:left;padding:6px 8px;border-bottom:2px solid var(--divider-color)">Status</th>
                ${hasRuntime ? `<th style="text-align:left;padding:6px 8px;border-bottom:2px solid var(--divider-color)">Laufzeit</th>` : ""}
              </tr>
            </thead>
            <tbody>
              ${roomRows}
            </tbody>
          </table>
        </div>
      </details>` : ""}
    `;

    // ── v1.6 Anforderungs-Heatmap (alle Zimmer) ────────────────────────────
    const roomsWithHeatmap = roomList.filter(r => r.demand_heatmap && r.demand_heatmap.length === 7);
    if (roomsWithHeatmap.length > 0) {
      const heatmapCard = document.createElement("details");
      heatmapCard.className = "ihc-card";
      heatmapCard.innerHTML = `
        <summary><span class="ihc-card-title">🔥 Anforderungs-Heatmap</span></summary>
        <div class="ihc-card-body">
          <p style="font-size:12px;color:var(--secondary-text-color);margin:0 0 12px">
            Zeitbasiertes Heizprofil pro Zimmer – gleitender Durchschnitt (EMA) über mehrere Wochen.
            Blau = niedrige, Rot = hohe Anforderung.
          </p>
          ${roomsWithHeatmap.map(r =>
            `<div style="margin-bottom:16px">
              ${this._renderDemandHeatmapGrid(r.demand_heatmap, r.name)}
            </div>`
          ).join("")}
        </div>`;
      content.appendChild(heatmapCard);
    }

    const setSystemModeBtn = content.querySelector("#diag-set-system-mode");
    if (setSystemModeBtn) {
      setSystemModeBtn.addEventListener("click", () => {
        const mode = content.querySelector("#diag-system-mode-select").value;
        this._callService("set_system_mode", { mode });
        this._toast(`✓ Modus: ${SYSTEM_MODE_LABELS[mode] || mode}`);
      });
    }

    const deactivateGuest = content.querySelector("#diag-deactivate-guest");
    if (deactivateGuest) {
      deactivateGuest.addEventListener("click", () => {
        this._callService("deactivate_guest_mode", {});
        this._toast("✓ Gäste-Modus beendet");
      });
    }

    const resetStatsBtn = content.querySelector("#diag-reset-stats");
    if (resetStatsBtn) {
      resetStatsBtn.addEventListener("click", () => {
        this._showConfirmModal(
          "Statistik zurücksetzen?",
          "Laufzeit und Energiedaten für heute werden auf 0 gesetzt.",
          async () => {
            await this._callService("reset_stats", {});
            this._toast("✓ Statistik zurückgesetzt");
            setTimeout(() => this._renderTabContent(), 800);
          }
        );
      });
    }
  }

  // ── Einstellungen Tab ──────────────────────────────────────────────────────


// === 05_tab_settings.js ===
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
    const hasEnergy = !!(a.solar_entity || a.energy_price_entity || a.flow_temp_entity || a.smart_meter_entity);

    content.innerHTML = `
      <!-- ── TRV-Modus Info-Banner ─────────────────────────── -->
      <div id="sec-trv-info" class="info-box" style="${(g.controller_mode || 'switch') === 'trv' ? '' : 'display:none'};background:#e3f2fd;border-color:#1565c0;margin-bottom:12px">
        ℹ️ <strong>TRV-Modus aktiv:</strong> IHC steuert die Thermostatventile direkt.
        Einstellungen für zentrale Heizungsregelung (Kesselschalter, Schwelle, Hysterese, Solar, Vorlauf-PID) sind ausgeblendet.<br>
        Falls du einen zentralen Kessel hast (Hybrid-Setup: Brenner + TRVs), trage den Kessel-Schalter unter
        <em>Hardware &amp; Steuerung → Heizungsschalter</em> ein.
      </div>

      <!-- ── System-Hardware ─────────────────────────────── -->
      <details class="ihc-card" open>
        <summary>
          <span class="ihc-card-title">🔧 Hardware &amp; Steuerung</span>
        </summary>
        <div class="ihc-card-body">
          <div class="settings-grid">
            <div class="settings-item">
              <label>Steuerungsmodus</label>
              <select class="form-select" id="controller-mode">
                <option value="switch" ${(a.controller_mode || "switch") === "switch" ? "selected" : ""}>🔌 Heizungsschalter (Kessel EIN/AUS)</option>
                <option value="trv" ${(a.controller_mode || "switch") === "trv" ? "selected" : ""}>🌡️ TRV-Modus (Thermostate direkt steuern)</option>
                <option value="hg" ${(a.controller_mode || "switch") === "hg" ? "selected" : ""}>🏭 Wärmeerzeuger-Modus ⚠️ Work in Progress</option>
              </select>
              <span class="form-hint">
                <strong>🔌 Heizungsschalter:</strong> IHC schaltet einen zentralen Kessel-Schalter (z.B. <code>switch.heizung</code>). Geeignet für Gas/Öl-Heizungen mit einem Hauptschalter.<br>
                <strong>🌡️ TRV-Modus:</strong> IHC öffnet/schließt smarte Thermostatventile (z.B. Homematic, Zigbee TRVs) direkt – kein separater Kesselschalter nötig.
              </span>
            </div>
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
              <span class="form-hint">Gleitender Mittelwert über die letzten N Minuten (0 = aus). Verhindert dass schnelle Sonne/Wolken-Wechsel die Heizkurve und den Kessel oszillieren lassen. Empfohlen: 20–30 Minuten.</span>
            </div>
            <div id="heating-switch-item" class="settings-item">
              <label>Heizungsschalter</label>
              <input type="text" class="form-input" id="heating-switch"
                placeholder="switch.heizung (leer = deaktiviert)"
                value="${a.heating_switch ?? ''}" data-ep-domains="switch,input_boolean" autocomplete="off">
              <span class="form-hint">Nur im <strong>Heizungsschalter-Modus</strong> nötig. IHC schaltet diesen EIN/AUS sobald Heizleistung benötigt wird.</span>
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
            <div id="cooling-section">
            <div class="settings-item">
              <label>Kühlung aktivieren</label>
              <select class="form-select" id="enable-cooling">
                <option value="false" ${!a.enable_cooling ? "selected" : ""}>Deaktiviert</option>
                <option value="true" ${a.enable_cooling ? "selected" : ""}>Aktiviert</option>
              </select>
              <span class="form-hint">Aktiviert Kühl-Modus im System. Erfordert einen separaten Kühlschalter (z.B. Klimaanlage).</span>
            </div>
            <div class="settings-item" id="cooling-switch-item" style="${a.enable_cooling ? "" : "opacity:0.5"}">
              <label>Kühlschalter</label>
              <input type="text" class="form-input" id="cooling-switch"
                placeholder="switch.klimaanlage"
                value="${a.cooling_switch ?? ''}" data-ep-domains="switch,input_boolean" autocomplete="off">
              <span class="form-hint">Wird eingeschaltet wenn Kühlung aktiv ist.</span>
            </div>
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

      <!-- ── Regelung ──────────────────────────────────── -->

      <!-- ── Wärmeerzeuger WIP ──────────────────────────────── -->
      <details id="sec-hg" class="ihc-card" style="${(g.controller_mode || 'switch') !== 'hg' ? 'display:none' : ''}">
        <summary>
          <span class="ihc-card-title">🏭 Wärmeerzeuger-Einstellungen
            <span style="background:#ff6f00;color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;margin-left:8px">⚠️ Work in Progress</span>
          </span>
        </summary>
        <div class="ihc-card-body">
          <div class="info-box" style="background:#fff3cd;border-color:#ffc107">
            ⚠️ Der <strong>Wärmeerzeuger-Modus</strong> ist noch in Entwicklung (Roadmap 3.0). Diese Felder sind noch nicht aktiv – der Modus verhält sich derzeit wie der Heizungsschalter-Modus.
          </div>
          <div class="settings-grid">
            <div class="settings-item">
              <label>Vorlauftemperatur-Entity (Heizkreis)</label>
              <input type="text" class="form-input" disabled placeholder="Kommt in Version 3.0" value="">
              <span class="form-hint">Mischventil / Heizkreis-Vorlauf – kommt in Version 3.0</span>
            </div>
            <div class="settings-item">
              <label>Pufferspeicher oben (Sensor)</label>
              <input type="text" class="form-input" disabled placeholder="Kommt in Version 3.0" value="">
              <span class="form-hint">Pufferspeicher-Überwachung – kommt in Version 3.0</span>
            </div>
            <div class="settings-item">
              <label>Wärmepumpe-Entity</label>
              <input type="text" class="form-input" disabled placeholder="Kommt in Version 3.0" value="">
              <span class="form-hint">WP-Integration und COP-Optimierung – kommt in Version 3.0</span>
            </div>
          </div>
        </div>
      </details>

      <details id="sec-boiler-demand" class="ihc-card" ${g.controller_mode === "switch" || g.controller_mode === "hg" ? "open" : ""} style="${(g.controller_mode || 'switch') === 'trv' ? 'display:none' : ''}">
        <summary><span class="ihc-card-title">⚙️ Heizungsregelung &amp; Hysterese</span></summary>
        <div class="ihc-card-body">
          <div class="info-box">
            Die <strong>Anforderung</strong> ist ein Prozentwert der angibt wie dringend ein Zimmer Wärme braucht (0–100 %).
            Alle Zimmer zusammen ergeben die <strong>Gesamtanforderung</strong>. Die Heizung schaltet ein wenn diese die Schwelle überschreitet
            – und erst aus wenn sie wieder deutlich darunter fällt (Hysterese verhindert ständiges An/Aus).
          </div>
          <div class="settings-grid">
            <div class="settings-item">
              <label>Einschaltschwelle (%)</label>
              <input type="number" class="form-input" id="demand-threshold" min="1" max="100" step="1" value="${a.demand_threshold ?? 15}">
              <span class="form-hint">Heizung startet wenn die Gesamtanforderung diesen Wert erreicht. Typisch: 10–20 %.</span>
            </div>
            <div class="settings-item">
              <label>Hysterese (%)</label>
              <input type="number" class="form-input" id="demand-hysteresis" min="1" max="30" step="1" value="${a.demand_hysteresis ?? 5}">
              <span class="form-hint">Heizung stoppt erst wenn Anforderung auf <em>Schwelle − Hysterese</em> fällt. Höherer Wert = weniger Taktung, aber etwas träger. Typisch: 3–8 %.</span>
            </div>
            <div class="settings-item">
              <label>Mindest-Einschaltzeit (min)</label>
              <input type="number" class="form-input" id="min-on-time" min="1" max="60" step="1" value="${a.min_on_time_minutes ?? 5}">
              <span class="form-hint">Sobald die Heizung startet, läuft sie mindestens so lange – schützt Brenner und Pumpe vor Kurztaktung.</span>
            </div>
            <div class="settings-item">
              <label>Mindest-Ausschaltzeit (min)</label>
              <input type="number" class="form-input" id="min-off-time" min="1" max="60" step="1" value="${a.min_off_time_minutes ?? 5}">
              <span class="form-hint">Pause zwischen zwei Heizzyklen – verhindert, dass der Brenner sofort wieder startet.</span>
            </div>
            <div class="settings-item">
              <label>Min. Zimmer für Heizstart</label>
              <input type="number" class="form-input" id="min-rooms" min="1" max="20" step="1" value="${a.min_rooms_demand ?? 1}">
              <span class="form-hint">Die Heizung startet nur wenn mindestens so viele Zimmer gleichzeitig Bedarf anmelden. Verhindert Aufheizen wegen eines einzelnen Ausreißers.</span>
            </div>
          </div>
          <div class="btn-row">
            <button class="btn btn-primary" id="save-global-settings">💾 Regelung speichern</button>
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

      <!-- ── Kalibrierungs-Assistent ──────────────────────── -->
      <details id="sec-calibration" class="ihc-card">
        <summary>
          <span class="ihc-card-title">📋 Kalibrierungs-Assistent
            <span class="badge-neutral" style="margin-left:6px;font-size:10px;padding:2px 7px;border-radius:10px;background:#e3f2fd;color:#1565c0;font-weight:700">Für Mieter</span>
          </span>
        </summary>
        <div class="ihc-card-body">
          <p style="font-size:12px;color:var(--secondary-text-color);margin:0 0 12px">
            Kein Zugang zu Kesselleistung oder Gasverbrauch? Trage deine Heizkostenabrechnung ein —
            IHC berechnet daraus automatisch <strong>virtuelle Kesselleistung</strong> und <strong>Energiepreis</strong>.
          </p>
          <div class="settings-grid">
            <div class="settings-item">
              <label>Heizungsart</label>
              <select class="form-select" id="cal-heating-type">
                <option value="gas">Gas-Zentralheizung</option>
                <option value="district">Fernwärme</option>
                <option value="oil">Ölheizung</option>
                <option value="hp">Wärmepumpe</option>
              </select>
            </div>
            <div class="settings-item">
              <label>Gebäudetyp</label>
              <select class="form-select" id="cal-building-type">
                <option value="old">Altbau (vor 1980)</option>
                <option value="mid" selected>Bestand (1980–2010)</option>
                <option value="new">Neubau / saniert (nach 2010)</option>
              </select>
            </div>
            <div class="settings-item">
              <label>Jahresheizkosten (€)</label>
              <input type="number" class="form-input" id="cal-annual-cost" min="100" max="20000" step="10" placeholder="z.B. 1667">
              <span class="form-hint">Gesamtbetrag laut Heizkostenabrechnung</span>
            </div>
            <div class="settings-item">
              <label>Heizanteil (%)</label>
              <input type="number" class="form-input" id="cal-heating-share" min="40" max="90" step="5" value="65">
              <span class="form-hint">Typisch 60–70 % (Rest = Warmwasser, Verwaltung)</span>
            </div>
            <div class="settings-item">
              <label>Energiepreis (€/kWh) <span style="font-size:10px;color:var(--secondary-text-color)">(optional, überschreibt Schätzwert)</span></label>
              <input type="number" class="form-input" id="cal-manual-price" min="0.01" max="2" step="0.01" placeholder="leer = automatisch aus Heizungsart">
              <span class="form-hint">Falls du den Preis aus deiner Nebenkostenabrechnung kennst</span>
            </div>
            <div class="settings-item">
              <label>Heizbetriebsstunden/Jahr <span style="font-size:10px;color:var(--secondary-text-color)">(optional)</span></label>
              <input type="number" class="form-input" id="cal-manual-hours" min="500" max="5000" step="100" placeholder="leer = automatisch aus Gebäudetyp">
              <span class="form-hint">Altbau ≈ 2400 h · Bestand ≈ 2000 h · Neubau ≈ 1600 h</span>
            </div>
          </div>
          <div id="cal-result" style="display:none;margin:12px 0;padding:14px;border-radius:10px;background:var(--secondary-background-color);border:1.5px solid var(--primary-color)">
            <div style="font-size:12px;font-weight:700;text-transform:uppercase;color:var(--secondary-text-color);margin-bottom:10px">Berechneter Schätzwert</div>
            <div style="display:flex;gap:24px;flex-wrap:wrap;margin-bottom:12px">
              <div>
                <div style="font-size:11px;color:var(--secondary-text-color)">Virtuelle Kesselleistung</div>
                <div id="cal-result-kw" style="font-size:26px;font-weight:800;color:var(--primary-color)">–</div>
              </div>
              <div>
                <div style="font-size:11px;color:var(--secondary-text-color)">Energiepreis</div>
                <div id="cal-result-price" style="font-size:26px;font-weight:800;color:var(--primary-color)">–</div>
              </div>
              <div>
                <div style="font-size:11px;color:var(--secondary-text-color)">Geschätzte Jahresenergie</div>
                <div id="cal-result-kwh" style="font-size:26px;font-weight:800;color:#757575">–</div>
              </div>
            </div>
            <div style="font-size:11px;color:var(--secondary-text-color);margin-bottom:10px" id="cal-result-hint"></div>
            <button class="btn btn-primary" id="cal-apply-btn">📥 Werte in Einstellungen übernehmen</button>
          </div>
          <div class="btn-row">
            <button class="btn btn-secondary" id="cal-calc-btn">🧮 Berechnen</button>
          </div>
          <hr class="divider" style="margin-top:16px">
          <div style="font-size:12px;font-weight:700;margin:8px 0 6px">📊 Kalibrierung nach echter Abrechnung</div>
          <p style="font-size:11px;color:var(--secondary-text-color);margin:0 0 10px">
            IHC hat im letzten Jahr <strong id="cal-ihc-kwh-display">–</strong> kWh geschätzt.
            Wenn du deinen echten Verbrauch kennst, kannst du den Korrekturfaktor anpassen:
          </p>
          <div class="settings-grid">
            <div class="settings-item">
              <label>Echter Jahresverbrauch (kWh) <span style="font-size:10px;color:var(--secondary-text-color)">(optional)</span></label>
              <input type="number" class="form-input" id="cal-actual-kwh" min="500" max="50000" step="100" placeholder="leer lassen wenn unbekannt">
              <span class="form-hint">Aus Gasrechnung oder Energieausweis</span>
            </div>
            <div class="settings-item">
              <label>Korrekturfaktor</label>
              <div id="cal-factor-display" style="font-size:20px;font-weight:700;color:var(--primary-color);padding:8px 0">–</div>
              <span class="form-hint">IHC passt Verbrauchsanzeige damit an</span>
            </div>
          </div>
          <div class="btn-row">
            <button class="btn btn-secondary" id="cal-factor-apply-btn">📐 Korrekturfaktor speichern</button>
          </div>
        </div>
      </details>

      <!-- ── Energie & Solar ────────────────────────────── -->
      <details class="ihc-card" id="energie-details" ${hasEnergy ? "open" : ""} style="${(g.controller_mode || 'switch') === 'trv' ? 'display:none' : ''}">
        <summary>
          <span class="ihc-card-title">⚡ Energie, Solar &amp; Vorlauftemperatur
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
            ${g.controller_mode !== "trv" ? `
            <div class="settings-item">
              <label>Kesselleistung (kW)</label>
              <input type="number" class="form-input" id="boiler-kw" min="1" max="100" step="1" value="${a.boiler_kw ?? 20}">
              <span class="form-hint">Nennleistung deines Kessels. IHC rechnet: <em>Laufzeit × kW = kWh</em>. Unbekannt? Nutze den Kalibrierungs-Assistenten darunter.</span>
            </div>
            ` : ""}
            <div class="settings-item">
              <label>Fester Energiepreis (€/kWh) <span style="font-size:10px;color:var(--secondary-text-color)">(optional)</span></label>
              <input type="number" class="form-input" id="static-energy-price" min="0.01" max="2" step="0.01" value="${a.static_energy_price ?? ''}" placeholder="z.B. 0.09 (leer = nur kWh)">
              <span class="form-hint">Wenn kein dynamischer Preis-Sensor vorhanden: fester Preis für die Kostenanzeige (Gas ≈ 0,09 €/kWh, Fernwärme ≈ 0,11 €/kWh).</span>
            </div>
            <div class="settings-item">
              <label>Smart-Meter-Sensor (kWh)</label>
              <input type="text" class="form-input" id="smart-meter-entity"
                placeholder="sensor.strom_zaehler (leer = deaktiviert)"
                value="${a.smart_meter_entity ?? ''}" data-ep-domains="sensor" autocomplete="off">
              <span class="form-hint">Echter Zähler-Sensor (Typ <em>total_increasing</em>) für genaue Verbrauchsmessung – ersetzt die Schätzung über Laufzeit.</span>
            </div>
            <div class="settings-item">
              <label>Kühl-Zieltemperatur (°C)</label>
              <input type="number" class="form-input" id="cooling-target-temp" min="18" max="30" step="0.5" value="${a.cooling_target_temp ?? 24}">
              <span class="form-hint">Zimmer werden auf diese Temperatur heruntergekühlt wenn Kühlung aktiv ist.</span>
            </div>
          </div>
          ${g.controller_mode !== "trv" ? `<div id="sec-flow-pid" style="margin-top:8px">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;font-weight:600;padding:6px 0;user-select:none">
              <input type="checkbox" id="flow-temp-enabled" ${a.flow_temp_entity ? "checked" : ""}>
              🌡️ Vorlauftemperatur-Regelung
              ${a.flow_temp_entity ? `<span class="ihc-card-badge info" style="font-size:10px">aktiv</span>` : ""}
            </label>
            <div id="flow-temp-section" style="display:${a.flow_temp_entity ? '' : 'none'};margin-top:4px">
              <div class="settings-grid">
                <div class="settings-item">
                  <label>Vorlauftemperatur-Entität (Stellgröße)</label>
                  <input type="text" class="form-input" id="flow-temp-entity"
                    placeholder="number.boiler_flow_temp"
                    value="${a.flow_temp_entity ?? ''}" data-ep-domains="number" autocomplete="off">
                  <span class="form-hint">HA-Entität vom Typ <code>number</code> mit der IHC den Vorlauf-Sollwert am Kessel setzen kann.</span>
                </div>
                <div class="settings-item">
                  <label>Vorlauftemperatur-Sensor (Ist-Messung)</label>
                  <input type="text" class="form-input" id="flow-temp-sensor"
                    placeholder="sensor.boiler_flow_temp (leer = kein PID)"
                    value="${a.flow_temp_sensor ?? ''}" data-ep-domains="sensor" autocomplete="off">
                  <span class="form-hint">Optional: Sensor der die tatsächliche Vorlauftemperatur misst. Aktiviert einen PID-Regler für präzisere Vorlaufsteuerung.</span>
                </div>
                <div class="settings-item">
                  <label>PID Proportionalanteil (Kp)</label>
                  <input type="number" class="form-input" id="pid-kp" min="0" max="20" step="0.1" value="${a.pid_kp ?? 2.0}">
                  <span class="form-hint">Stärke der proportionalen Reaktion. Höher = aggressiver. Typisch: 1.0–5.0</span>
                </div>
                <div class="settings-item">
                  <label>PID Integrationsanteil (Ki)</label>
                  <input type="number" class="form-input" id="pid-ki" min="0" max="5" step="0.01" value="${a.pid_ki ?? 0.1}">
                  <span class="form-hint">Beseitigt bleibende Regelabweichungen. Typisch: 0.05–0.5</span>
                </div>
                <div class="settings-item">
                  <label>PID Differentialanteil (Kd)</label>
                  <input type="number" class="form-input" id="pid-kd" min="0" max="10" step="0.1" value="${a.pid_kd ?? 0.5}">
                  <span class="form-hint">Dämpft Überschwingen. Typisch: 0.1–2.0</span>
                </div>
              </div>
              <div class="btn-row">
                <button class="btn btn-primary" id="save-flow-settings">💾 Vorlauf &amp; PID speichern</button>
              </div>
            </div>
          </div>` : ""}
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
      <details class="ihc-card" ${a.adaptive_curve_enabled || a.eta_preheat_enabled || a.vacation_calendar ? "open" : ""}>
        <summary>
          <span class="ihc-card-title">🧠 Intelligente Regelung
            ${g.adaptive_curve_delta && Math.abs(g.adaptive_curve_delta) >= 0.1 ? activeBadge(`Kurve ${g.adaptive_curve_delta > 0 ? "+" : ""}${g.adaptive_curve_delta.toFixed(1)}°`) : ""}
            ${g.eta_preheat_minutes != null && g.eta_preheat_minutes <= 90 ? activeBadge(`ETA ${Math.round(g.eta_preheat_minutes)}min`, "info") : ""}
          </span>
        </summary>
        <div class="ihc-card-body">
          <div class="settings-grid">
            ${g.controller_mode !== "trv" ? `
            <div class="settings-item">
              <label>Adaptive Heizkurve</label>
              <select class="form-select" id="adaptive-curve-enabled">
                <option value="false" ${!(a.adaptive_curve_enabled ?? a.curve_adaptation_enabled) ? "selected" : ""}>Deaktiviert</option>
                <option value="true"  ${(a.adaptive_curve_enabled ?? a.curve_adaptation_enabled) ? "selected" : ""}>Aktiviert (lernt automatisch)</option>
              </select>
              <span class="form-hint">
                IHC beobachtet wie lang das Haus braucht um warm zu werden und verschiebt die Heizkurve automatisch um ±0,5°C pro Tag (max. ±3°C).<br>
                Im Dashboard erscheint dann z.B. <em>„Kurve –0,5°"</em> wenn die Kurve nach unten korrigiert wurde, weil die Zimmer schnell warm wurden.
                ${g.adaptive_curve_delta && Math.abs(g.adaptive_curve_delta) >= 0.1
                  ? `<br><strong>Aktueller Offset: ${g.adaptive_curve_delta > 0 ? "+" : ""}${g.adaptive_curve_delta.toFixed(1)} °C</strong>`
                  : ""}
              </span>
            </div>
            <div id="adaptive-curve-max-delta-item" class="settings-item">
              <label>Max. Kurvenkorrektur (°C)</label>
              <input type="number" class="form-input" id="adaptive-curve-max-delta" min="0.5" max="10" step="0.5" value="${a.adaptive_curve_max_delta ?? 3.0}">
              <span class="form-hint">Maximale kumulative Verschiebung der Heizkurve durch adaptives Lernen (±). Typisch: 2–5 °C</span>
            </div>
            ` : ""}
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
          </div>
          <div class="btn-row">
            <button class="btn btn-primary" id="save-intelligent-settings">💾 Intelligente Regelung speichern</button>
            ${g.controller_mode !== "trv" && g.adaptive_curve_delta && Math.abs(g.adaptive_curve_delta) >= 0.1
              ? `<button class="btn btn-secondary" id="reset-curve-btn" title="Kurvenkorrektur auf 0 zurücksetzen">🔄 Kurvenkorrektur zurücksetzen</button>`
              : ""}
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
          </div>
          <div class="btn-row">
            <button class="btn btn-primary" id="save-limescale-settings">💾 Kalkschutz speichern</button>
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

    // Toggle cooling-switch opacity based on enable-cooling select
    content.querySelector("#enable-cooling")?.addEventListener("change", e => {
      const item = content.querySelector("#cooling-switch-item");
      if (item) item.style.opacity = e.target.value === "true" ? "1" : "0.5";
    });

    content.querySelector("#save-hardware-settings").addEventListener("click", () => {
      this._callService("update_global_settings", {
        outdoor_temp_sensor:          content.querySelector("#outdoor-sensor").value.trim(),
        outdoor_temp_smoothing_minutes: parseInt(content.querySelector("#outdoor-smoothing").value, 10) || 0,
        heating_switch:               content.querySelector("#heating-switch").value.trim(),
        enable_cooling:           content.querySelector("#enable-cooling").value === "true",
        cooling_switch:           content.querySelector("#cooling-switch").value.trim(),
        weather_entity:           content.querySelector("#weather-entity").value.trim(),
        weather_cold_threshold:   parseFloat(content.querySelector("#weather-cold-threshold").value) || 0,
        weather_cold_boost:       parseFloat(content.querySelector("#weather-cold-boost").value) || 0,
        controller_mode:          content.querySelector("#controller-mode").value,
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

    content.querySelector("#save-global-settings")?.addEventListener("click", () => {
      const threshEl = content.querySelector("#demand-threshold");
      if (!threshEl) return; // not rendered in TRV mode without heating_switch
      const thresh  = parseFloat(threshEl.value);
      const hyst    = parseFloat(content.querySelector("#demand-hysteresis").value);
      const minOn   = parseInt(content.querySelector("#min-on-time").value, 10);
      const minOff  = parseInt(content.querySelector("#min-off-time").value, 10);
      const minRooms = parseInt(content.querySelector("#min-rooms").value, 10);
      if ([thresh, hyst, minOn, minOff, minRooms].some(isNaN)) { this._toast("⚠️ Ungültiger Wert"); return; }
      this._callService("update_global_settings", {
        demand_threshold:   thresh,
        demand_hysteresis:  hyst,
        min_on_time:        minOn,
        min_off_time:       minOff,
        min_rooms_demand:   minRooms,
      });
      this._toast("✓ Heizungsregelung gespeichert");
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
      content.querySelector("#s-presence-away-delay-val").textContent = e.target.value + " min";
    });

    content.querySelector("#s-presence-arrive-delay")?.addEventListener("input", e => {
      content.querySelector("#s-presence-arrive-delay-val").textContent = e.target.value + " min";
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

    // ── Kalibrierungs-Assistent ─────────────────────────────────────
    {
      // Energy price defaults per heating type (€/kWh)
      const ENERGY_PRICES = { gas: 0.09, district: 0.11, oil: 0.10, hp: 0.05 };
      // Typical annual heating hours per building type
      const HEATING_HOURS = { old: 2400, mid: 2000, new: 1600 };
      const BUILDING_LABELS = { old: "Altbau", mid: "Bestand", new: "Neubau/saniert" };

      const _calcBtn       = content.querySelector("#cal-calc-btn");
      const _resultBox     = content.querySelector("#cal-result");
      const _resultKw      = content.querySelector("#cal-result-kw");
      const _resultPrice   = content.querySelector("#cal-result-price");
      const _resultKwh     = content.querySelector("#cal-result-kwh");
      const _resultHint    = content.querySelector("#cal-result-hint");
      const _applyBtn      = content.querySelector("#cal-apply-btn");
      const _factorApply   = content.querySelector("#cal-factor-apply-btn");
      const _ihcKwhDisplay = content.querySelector("#cal-ihc-kwh-display");

      // Show IHC's own annual estimate (from current data)
      const g = this._getGlobal();
      if (g && g.energy_today_kwh != null) {
        // Rough extrapolation: today × 365 / heating_season_fraction (assume 60% of year is heating)
        const estAnnual = Math.round(g.energy_today_kwh * 200);  // rough 200 heating days
        _ihcKwhDisplay.textContent = `≈ ${estAnnual.toLocaleString("de-DE")}`;
      }

      let _lastCalcKw = null;
      let _lastCalcPrice = null;

      _calcBtn.addEventListener("click", () => {
        const annualCost  = parseFloat(content.querySelector("#cal-annual-cost").value);
        const shareRaw    = parseFloat(content.querySelector("#cal-heating-share").value);
        const heatType    = content.querySelector("#cal-heating-type").value;
        const buildType   = content.querySelector("#cal-building-type").value;
        const manualPrice = parseFloat(content.querySelector("#cal-manual-price").value);
        const manualHours = parseFloat(content.querySelector("#cal-manual-hours").value);

        if (isNaN(annualCost) || annualCost <= 0) {
          this._toast("⚠️ Bitte Jahresheizkosten eingeben"); return;
        }
        const share = (isNaN(shareRaw) ? 65 : Math.min(90, Math.max(40, shareRaw))) / 100;
        const energyPrice = (!isNaN(manualPrice) && manualPrice > 0) ? manualPrice : (ENERGY_PRICES[heatType] ?? 0.10);
        const hours       = (!isNaN(manualHours) && manualHours > 0) ? manualHours : (HEATING_HOURS[buildType] ?? 2000);

        const heatingCost = annualCost * share;
        const annualKwh   = heatingCost / energyPrice;
        const virtualKw   = annualKwh / hours;

        _lastCalcKw    = Math.round(virtualKw * 10) / 10;
        _lastCalcPrice = energyPrice;

        _resultKw.textContent    = `${_lastCalcKw} kW`;
        _resultPrice.textContent = `${energyPrice.toFixed(2)} €/kWh`;
        _resultKwh.textContent   = `${Math.round(annualKwh).toLocaleString("de-DE")} kWh`;
        _resultHint.textContent  = `Basis: ${Math.round(heatingCost)}€ Heizanteil ÷ ${energyPrice.toFixed(2)} €/kWh ÷ ${hours} Stunden (${BUILDING_LABELS[buildType]}) · Werte können nach echter Abrechnung korrigiert werden.`;
        _resultBox.style.display = "block";
      });

      _applyBtn.addEventListener("click", () => {
        if (_lastCalcKw == null) return;
        const boilerInput = content.querySelector("#boiler-kw");
        if (boilerInput) { boilerInput.value = _lastCalcKw; boilerInput.style.background = "color-mix(in srgb, var(--primary-color) 10%, transparent)"; setTimeout(() => { boilerInput.style.background = ""; }, 2000); }
        // Open the Energie section so user can see the applied value
        const energieCard = content.querySelector("#energie-details");
        if (energieCard) energieCard.open = true;
        this._toast(`✓ Kesselleistung auf ${_lastCalcKw} kW gesetzt – bitte Energie/Solar speichern`);
      });

      // Correction factor calculation
      content.querySelector("#cal-actual-kwh").addEventListener("input", () => {
        const actual  = parseFloat(content.querySelector("#cal-actual-kwh").value);
        const g2 = this._getGlobal();
        if (isNaN(actual) || actual <= 0 || !g2) { content.querySelector("#cal-factor-display").textContent = "–"; return; }
        // IHC annual estimate: use boiler_kw × estimated runtime hours
        const boilerKw = parseFloat(g2.boiler_kw ?? content.querySelector("#boiler-kw")?.value ?? 5);
        const runtimeH = (g2.heating_runtime_today ?? 0) / 60 * 200; // rough 200 heating days
        const ihcEst = boilerKw * runtimeH;
        if (ihcEst <= 0) { content.querySelector("#cal-factor-display").textContent = "–"; return; }
        const factor = Math.round((actual / ihcEst) * 100) / 100;
        content.querySelector("#cal-factor-display").textContent = `${factor}×`;
        content.querySelector("#cal-factor-apply-btn").dataset.factor = factor;
      });

      _factorApply.addEventListener("click", () => {
        const factor = parseFloat(_factorApply.dataset.factor);
        if (isNaN(factor) || factor <= 0) { this._toast("⚠️ Zuerst echten Verbrauch eingeben"); return; }
        localStorage.setItem("ihc_energy_factor", factor.toString());
        this._toast(`✓ Korrekturfaktor ${factor}× gespeichert – Verbrauchsanzeige wird angepasst`);
      });
    }

    // Toggle flow-temp section visibility (only in switch mode)
    content.querySelector("#flow-temp-enabled")?.addEventListener("change", e => {
      content.querySelector("#flow-temp-section").style.display = e.target.checked ? "" : "none";
    });

    // Save flow temp + PID settings
    content.querySelector("#save-flow-settings")?.addEventListener("click", () => {
      const kp = parseFloat(content.querySelector("#pid-kp")?.value);
      const ki = parseFloat(content.querySelector("#pid-ki")?.value);
      const kd = parseFloat(content.querySelector("#pid-kd")?.value);
      const flowEnabledEl = content.querySelector("#flow-temp-enabled");
      const flowEnabled = flowEnabledEl ? flowEnabledEl.checked : false;
      this._callService("update_global_settings", {
        flow_temp_entity:  flowEnabled ? (content.querySelector("#flow-temp-entity")?.value.trim() ?? "") : "",
        flow_temp_sensor:  flowEnabled ? (content.querySelector("#flow-temp-sensor")?.value.trim() ?? "") : "",
        ...(isNaN(kp) ? {} : { pid_kp: kp }),
        ...(isNaN(ki) ? {} : { pid_ki: ki }),
        ...(isNaN(kd) ? {} : { pid_kd: kd }),
      });
      this._toast("✓ Vorlauf & PID gespeichert");
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
      const boilerKwEl   = content.querySelector("#boiler-kw");
      const boilerKw     = boilerKwEl ? parseFloat(boilerKwEl.value) : null;
      const solarSurplus = parseFloat(content.querySelector("#solar-surplus-threshold").value);
      const solarBoost   = parseFloat(content.querySelector("#solar-boost-temp").value);
      const priceThresh  = parseFloat(content.querySelector("#energy-price-threshold").value);
      const priceEco     = parseFloat(content.querySelector("#energy-price-eco-offset").value);
      const chk = [solarSurplus, solarBoost, priceThresh, priceEco];
      if (boilerKw !== null) chk.push(boilerKw);
      if (chk.some(isNaN)) { this._toast("⚠️ Ungültiger Wert"); return; }
      const staticPrice = parseFloat(content.querySelector("#static-energy-price").value);
      this._callService("update_global_settings", {
        ...(boilerKw !== null ? { boiler_kw: boilerKw } : {}),
        solar_entity:            content.querySelector("#solar-entity").value.trim(),
        solar_surplus_threshold: solarSurplus,
        solar_boost_temp:        solarBoost,
        energy_price_entity:     content.querySelector("#energy-price-entity").value.trim(),
        energy_price_threshold:  priceThresh,
        energy_price_eco_offset: priceEco,
        smart_meter_entity:      content.querySelector("#smart-meter-entity").value.trim(),
        cooling_target_temp:     parseFloat(content.querySelector("#cooling-target-temp").value) || 24,
        ...((!isNaN(staticPrice) && staticPrice > 0) ? { static_energy_price: staticPrice } : {}),
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
      const curveSel = content.querySelector("#adaptive-curve-enabled");
      this._callService("update_global_settings", {
        ...(curveSel ? { adaptive_curve_enabled: curveSel.value === "true" } : {}),
        adaptive_preheat_enabled: content.querySelector("#adaptive-preheat-enabled")?.value === "true",
        optimum_start_enabled:    content.querySelector("#optimum-start-enabled")?.value === "true",
        eta_preheat_enabled:      content.querySelector("#eta-preheat-enabled")?.value === "true",
        vacation_calendar:        content.querySelector("#vacation-calendar")?.value.trim() ?? "",
        adaptive_curve_max_delta: parseFloat(content.querySelector("#adaptive-curve-max-delta")?.value) || 3.0,
      });
      this._toast("✓ Intelligente Regelung gespeichert");
    });

    content.querySelector("#save-limescale-settings")?.addEventListener("click", () => {
      this._callService("update_global_settings", {
        limescale_protection_enabled: content.querySelector("#limescale-enabled")?.value === "true",
        limescale_interval_days:      parseInt(content.querySelector("#limescale-interval")?.value, 10) || 14,
        limescale_time:               content.querySelector("#limescale-time")?.value.trim() || "10:00",
        limescale_duration_minutes:   parseInt(content.querySelector("#limescale-duration")?.value, 10) || 5,
        stuck_valve_timeout:          parseInt(content.querySelector("#stuck-valve-timeout")?.value, 10) || 1800,
      });
      this._toast("✓ Kalkschutz gespeichert");
    });

    content.querySelector("#reset-curve-btn")?.addEventListener("click", () => {
      if (!confirm("Kurvenkorrektur zurücksetzen?\n\n• Adaptive Heizkurven-Offset → 0 °C\n\nDie Vorheizzeiten-Historie bleibt erhalten.")) return;
      this._callService("reset_stats", { reset_curve: true }).then(() => {
        setTimeout(() => { if (this._activeTab === "settings") this._renderTabContent(); }, 400);
      });
      this._toast("🔄 Kurvenkorrektur zurückgesetzt");
    });

    content.querySelector("#reset-learned-btn")?.addEventListener("click", () => {
      if (!confirm("Kurvenkorrektur zurücksetzen?\n\n• Adaptive Heizkurven-Offset → 0 °C\n\nDie Vorheizzeiten-Historie bleibt erhalten.")) return;
      this._callService("reset_stats", { reset_curve: true }).then(() => {
        setTimeout(() => { if (this._activeTab === "settings") this._renderTabContent(); }, 400);
      });
      this._toast("🔄 Kurvenkorrektur zurückgesetzt");
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

    // ── Mode visibility ──────────────────────────────────────────────
    const _updateModeVisibility = (newMode) => {
      const isTrv    = newMode === "trv";
      const isHg     = newMode === "hg";
      const isBoiler = !isTrv && !isHg;
      const isSwitch = newMode === "switch" || !newMode;
      // TRV-Modus info banner (top)
      const sti = content.querySelector("#sec-trv-info");
      if (sti) sti.style.display = isTrv ? "" : "none";
      // Heizungsschalter + Kühlung: nur in Heizungsschalter- und HG-Modus
      const hs = content.querySelector("#heating-switch-item");
      if (hs) hs.style.display = !isTrv ? "" : "none";
      const cs = content.querySelector("#cooling-section");
      if (cs) cs.style.display = !isTrv ? "" : "none";
      // Wärmeerzeuger-WIP-Karte
      const shg = content.querySelector("#sec-hg");
      if (shg) shg.style.display = isHg ? "" : "none";
      // Heizungsregelung & Hysterese: nur in Switch/HG-Modus sichtbar
      const sbd = content.querySelector("#sec-boiler-demand");
      if (sbd) sbd.style.display = isTrv ? "none" : "";
      // Energie, Solar & Vorlauf: nur in Switch/HG-Modus
      const ed = content.querySelector("#energie-details");
      if (ed) ed.style.display = isTrv ? "none" : "";
      // Flow/PID: nur in Switch/HG-Modus
      const sfl = content.querySelector("#sec-flow-pid");
      if (sfl) sfl.style.display = isTrv ? "none" : "";
      // Kalibrierungs-Assistent: nicht im TRV-Modus
      const scal = content.querySelector("#sec-calibration");
      if (scal) scal.style.display = isTrv ? "none" : "";
      // Adaptive Heizkurve: nicht im TRV-Modus
      const acd = content.querySelector("#adaptive-curve-max-delta-item");
      if (acd) acd.style.display = isTrv ? "none" : "";
      const ace = content.querySelector("#adaptive-curve-enabled")?.closest(".settings-item");
      if (ace) ace.style.display = isTrv ? "none" : "";
    };
    _updateModeVisibility(g.controller_mode || "switch");
    content.querySelector("#controller-mode")?.addEventListener("change", e => {
      _updateModeVisibility(e.target.value);
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



// === 07_tab_curve.js ===
/**
 * 07_tab_curve.js
 * IHC Frontend – Heating Curve Tab
 * Contains: _renderCurve, _collectCurvePoints, _drawCurve
 */
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

    // ── v1.7 Heizkurven-Simulation ─────────────────────────────────────────
    const simCard = document.createElement("div");
    simCard.className = "card";
    simCard.style.marginTop = "16px";
    simCard.innerHTML = `
      <div class="card-title">🔬 Simulation – Was-Wenn?</div>
      <p style="font-size:12px;color:var(--secondary-text-color);margin:0 0 12px">
        Schieberegler für Außentemperatur → zeigt die berechnete Ziel-Temperatur laut aktueller Heizkurve.
      </p>
      <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:12px">
        <label style="font-size:13px;font-weight:600;min-width:120px">Außentemp:</label>
        <input type="range" id="sim-outdoor" min="-20" max="25" step="0.5" value="0"
          style="flex:1;min-width:160px;accent-color:var(--primary-color)">
        <span id="sim-outdoor-val" style="font-size:15px;font-weight:700;min-width:50px;text-align:right">0 °C</span>
      </div>
      <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:8px">
        <label style="font-size:13px;color:var(--secondary-text-color);min-width:120px">Ziel-Temperatur:</label>
        <span id="sim-target-val" style="font-size:26px;font-weight:700;color:var(--primary-color)">—</span>
      </div>
      <div id="sim-room-offsets" style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap"></div>`;
    content.appendChild(simCard);

    const rooms = this._getRoomData();
    const roomList = Object.values(rooms);

    const calcCurveTemp = (outdoorTemp) => {
      const pts = this._collectCurvePoints(content);
      if (pts.length < 2) return null;
      // Clamp to range
      if (outdoorTemp <= pts[0].outdoor_temp) return pts[0].target_temp;
      if (outdoorTemp >= pts[pts.length - 1].outdoor_temp) return pts[pts.length - 1].target_temp;
      for (let i = 0; i < pts.length - 1; i++) {
        const lo = pts[i], hi = pts[i + 1];
        if (outdoorTemp >= lo.outdoor_temp && outdoorTemp <= hi.outdoor_temp) {
          const t = (outdoorTemp - lo.outdoor_temp) / (hi.outdoor_temp - lo.outdoor_temp);
          return lo.target_temp + t * (hi.target_temp - lo.target_temp);
        }
      }
      return null;
    };

    const updateSim = () => {
      const outdoorVal = parseFloat(simCard.querySelector("#sim-outdoor").value);
      simCard.querySelector("#sim-outdoor-val").textContent = outdoorVal.toFixed(1) + " °C";
      const base = calcCurveTemp(outdoorVal);
      if (base == null) { simCard.querySelector("#sim-target-val").textContent = "—"; return; }
      simCard.querySelector("#sim-target-val").textContent = base.toFixed(1) + " °C";
      // Show per-room effective target
      const offsets = simCard.querySelector("#sim-room-offsets");
      offsets.innerHTML = roomList.map(r => {
        const offset = parseFloat(r.room_offset ?? 0);
        const eff = (base + offset).toFixed(1);
        return `<span style="font-size:11px;padding:3px 8px;border-radius:8px;background:var(--secondary-background-color);border:1px solid var(--divider-color)">
          ${r.name}: <strong>${eff} °C</strong>${offset !== 0 ? ` <span style="color:var(--secondary-text-color)">(${offset > 0 ? "+" : ""}${offset})</span>` : ""}
        </span>`;
      }).join("");
    };

    simCard.querySelector("#sim-outdoor").addEventListener("input", updateSim);
    // Recompute when curve points change
    content.querySelectorAll(".curve-outdoor,.curve-target").forEach(inp =>
      inp.addEventListener("input", updateSim)
    );
    updateSim();
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



// === 08_modals.js ===
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
        <div class="settings-grid">
          <div class="settings-item" style="grid-column:1/-1">
            <label>Verlängerungs-Entity</label>
            <input type="text" class="form-input full" id="m-comfort-extend-entity"
              placeholder="media_player.tv oder switch.tv"
              data-ep-domains="media_player,switch,binary_sensor,input_boolean,person,device_tracker" autocomplete="off">
            <span class="form-hint">Wenn diese Entity aktiv ist, bleibt die Komforttemperatur trotz Zeitplan erhalten (z.B. TV läuft → kein Eco um 22 Uhr)</span>
          </div>
          <div class="settings-item">
            <label>Auslöse-Zustand</label>
            <input type="text" class="form-input" id="m-comfort-extend-state" value="on"
              placeholder="on / playing / home">
            <span class="form-hint">Zustand der die Verlängerung aktiviert</span>
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
        comfort_temp_entity:      modal.querySelector("#m-comfort-temp-entity")?.value.trim() || "",
        eco_temp_entity:          modal.querySelector("#m-eco-temp-entity")?.value.trim() || "",
        comfort_extend_entity:    modal.querySelector("#m-comfort-extend-entity")?.value.trim() || "",
        comfort_extend_state:     modal.querySelector("#m-comfort-extend-state")?.value.trim() || "on",
        ha_schedules,
      });
      this._closeModal();
      this._toast("✓ Zimmer hinzugefügt – HA lädt Entitäten neu");
    });
    this._bindEntityListAdders();
    this._bindHaSchedAdder([], "m-ha-sched-list", "m-add-ha-sched");
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
        <div class="modal-section-title">⏱️ Komfort-Verlängerung <span style="font-weight:400;font-size:10px">(optional)</span></div>
        <div class="settings-grid">
          <div class="settings-item" style="grid-column:1/-1">
            <label>Verlängerungs-Entity</label>
            <input type="text" class="form-input full" id="m-comfort-extend-entity"
              value="${room.comfort_extend_entity || ''}"
              placeholder="media_player.tv oder switch.tv"
              data-ep-domains="media_player,switch,binary_sensor,input_boolean,person,device_tracker" autocomplete="off">
            <span class="form-hint">Wenn diese Entity aktiv ist, bleibt die Komforttemperatur trotz Zeitplan erhalten (z.B. TV läuft → kein Eco um 22 Uhr)</span>
          </div>
          <div class="settings-item">
            <label>Auslöse-Zustand</label>
            <input type="text" class="form-input" id="m-comfort-extend-state"
              value="${room.comfort_extend_state || 'on'}"
              placeholder="on / playing / home">
            <span class="form-hint">Zustand der die Verlängerung aktiviert</span>
          </div>
        </div>
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

      <details class="modal-collapsible" ${(room.room_qm > 0 || room.absolute_min_temp !== 15 || room.room_temp_threshold > 0) ? "open" : ""}>
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
        comfort_temp_entity:      modal.querySelector("#m-comfort-temp-entity")?.value.trim() || "",
        eco_temp_entity:          modal.querySelector("#m-eco-temp-entity")?.value.trim() || "",
        comfort_extend_entity:    modal.querySelector("#m-comfort-extend-entity")?.value.trim() || "",
        comfort_extend_state:     modal.querySelector("#m-comfort-extend-state")?.value.trim() || "on",
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


// === 09_main.js (Part B: class close + registration) ===
}

customElements.define("ihc-panel", IHCPanel);
