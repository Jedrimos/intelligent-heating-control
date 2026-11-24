/**
 * 08_modals.js
 * IHC Frontend – Modals
 * Contains: _showAddRoomModal (Schnellstart), _showDiscoverRoomsModal, _showConfirmModal,
 *           _showModal, _closeModal, _cleanupEntityPickers,
 *           _bindEntityListAdders, _makeHaSchedRow, _bindHaSchedAdder, _collectHaScheduleRows
 */

  // ── Zimmer hinzufügen – Schnellstart (v2.6) ────────────────────────────────
  // Deliberately minimal: name, thermostat(s), optional sensors, comfort temp.
  // Every other setting has a sensible default and lives in the room's
  // ⚙️ Einstellungen tab afterwards - the old 130-field dialog scared beginners off.
  // Optional "Bereich übernehmen" pre-fills everything from a Home Assistant area.
  _showAddRoomModal(prefill = null) {
    const found = this._discoverRooms().filter(r => !r.exists);
    const p = prefill || {};
    const entityRow = (listId, domain, value, placeholder, first) => `
      <div class="entity-row">
        <input type="text" class="form-input" placeholder="${placeholder}" value="${this._esc(value || "")}"
          data-ep-domains="${domain}" autocomplete="off">
        ${first
          ? `<button class="btn btn-secondary btn-icon add-entity" data-list="${listId}" data-ep-domains="${domain}" title="Weiteres hinzufügen">+</button>`
          : `<button class="btn btn-danger btn-icon remove-entity">✕</button>`}
      </div>`;
    const rows = (listId, domain, values, placeholder) => {
      const v = values && values.length ? values : [""];
      return v.map((val, i) => entityRow(listId, domain, val, placeholder, i === 0)).join("");
    };
    this._showModal(`
      <div class="modal-title">+ Zimmer hinzufügen</div>
      <p class="modal-lead">Nur ein Name und ein Thermostat sind nötig – alles andere ist optional und kann später im Zimmer unter ⚙️ Einstellungen ergänzt werden.</p>

      ${found.length ? `
      <div class="form-group">
        <label class="form-label">🏠 Aus Home-Assistant-Bereich übernehmen</label>
        <select class="form-select" id="m-area">
          <option value="">– manuell eingeben –</option>
          ${found.map(r => `<option value="${this._esc(r.area_id)}" ${p.area_id === r.area_id ? "selected" : ""}>${this._esc(r.name)} (${ihcEsc(r.valves.length)} Thermostat${r.valves.length > 1 ? "e" : ""}${r.temp_sensor ? ", Thermometer" : ""}${r.windows.length ? ", Fenster" : ""})</option>`).join("")}
        </select>
        <span class="form-hint">Füllt die Felder unten mit den Geräten aus diesem Bereich.</span>
      </div>` : ""}

      <div class="form-group">
        <label class="form-label">Zimmername *</label>
        <input type="text" class="form-input full" id="m-name" placeholder="z.B. Wohnzimmer" value="${this._esc(p.name || "")}">
      </div>

      <div class="modal-section">
        <div class="modal-section-title">🔥 Thermostat(e) *</div>
        <div class="entity-list" id="valve-list">${rows("valve-list", "climate", p.valves, "climate.wohnzimmer")}</div>
        <span class="form-hint">Heizkörperthermostate (TRVs) dieses Zimmers. Mehrere möglich.</span>
      </div>

      <div class="form-group">
        <label class="form-label">🌡️ Raumthermometer <span class="opt">optional</span></label>
        <input type="text" class="form-input full" id="m-sensor" value="${this._esc(p.temp_sensor || "")}"
          placeholder="sensor.wohnzimmer_temperatur" data-ep-domains="sensor" autocomplete="off">
        <span class="form-hint">Ohne Thermometer nimmt IHC die Temperatur vom Thermostat.</span>
      </div>

      <div class="modal-section">
        <div class="modal-section-title">🪟 Fensterkontakte <span class="opt">optional</span></div>
        <div class="entity-list" id="window-list">${rows("window-list", "binary_sensor", p.windows, "binary_sensor.fenster_wohnzimmer")}</div>
        <span class="form-hint">Ohne Kontakt erkennt IHC offene Fenster automatisch an einem Temperatursturz.</span>
      </div>

      <div class="form-group">
        <label class="form-label">😊 Wohlfühltemperatur</label>
        <div class="comfort-pick">
          <input type="range" id="m-comfort-range" min="16" max="26" step="0.5" value="${ihcEsc(p.comfort_temp ?? 21)}">
          <span id="m-comfort-val">${(p.comfort_temp ?? 21).toFixed(1)} °C</span>
        </div>
        <span class="form-hint">Sparen, Schlafen und Abwesend werden automatisch daraus abgeleitet (−3 / −4 / −6 °C).</span>
      </div>
      <input type="hidden" id="m-humidity-sensor" value="${this._esc(p.humidity_sensor || "")}">

      <div class="btn-row">
        <button class="btn btn-primary" id="modal-confirm">Zimmer anlegen</button>
        <button class="btn btn-secondary modal-close-btn">Abbrechen</button>
      </div>
    `, async () => {
      const modal = this.shadowRoot.querySelector("#modal-root .modal");
      if (!modal) return;
      const name = modal.querySelector("#m-name")?.value.trim() || "";
      if (!name) { this._toast("❌ Bitte einen Zimmernamen eingeben"); return; }
      const valves  = [...modal.querySelectorAll("#valve-list input")].map(i => i.value.trim()).filter(Boolean);
      if (!valves.length) { this._toast("❌ Bitte mindestens ein Thermostat auswählen"); return; }
      const windows = [...modal.querySelectorAll("#window-list input")].map(i => i.value.trim()).filter(Boolean);
      await this._callService("add_room", {
        name,
        temp_sensor:     modal.querySelector("#m-sensor")?.value.trim() || "",
        valve_entity:    valves[0],
        valve_entities:  valves,
        window_sensor:   windows[0] || "",
        window_sensors:  windows,
        humidity_sensor: modal.querySelector("#m-humidity-sensor")?.value.trim() || "",
        comfort_temp:    parseFloat(modal.querySelector("#m-comfort-range")?.value) || 21.0,
      });
      this._closeModal();
      this._toast(`✓ „${name}“ angelegt – HA lädt die Entitäten neu`);
    });
    const modal = this.shadowRoot.querySelector("#modal-root .modal");
    const range = modal.querySelector("#m-comfort-range");
    range.addEventListener("input", () => {
      modal.querySelector("#m-comfort-val").textContent = `${parseFloat(range.value).toFixed(1)} °C`;
    });
    modal.querySelector("#m-area")?.addEventListener("change", e => {
      const r = found.find(x => x.area_id === e.target.value);
      const name = modal.querySelector("#m-name")?.value || "";
      const comfort = parseFloat(range.value) || 21;
      this._closeModal();
      this._showAddRoomModal(r
        ? { area_id: r.area_id, name: r.name, valves: r.valves, temp_sensor: r.temp_sensor, windows: r.windows, humidity_sensor: r.humidity_sensor, comfort_temp: comfort }
        : { name, comfort_temp: comfort });
    });
    this._bindEntityListAdders();
  }

  // ── Zimmer automatisch finden (v2.6) ────────────────────────────────────────
  _showDiscoverRoomsModal() {
    const all = this._discoverRooms();
    const found = all.filter(r => !r.exists);
    const line = (icon, items) => items.length
      ? `<div class="disc-line">${icon} ${items.map(e => this._esc(this._friendly(e))).join(", ")}</div>` : "";
    const body = found.length ? `
      <p class="modal-lead">IHC hat in deinen Home-Assistant-Bereichen diese Thermostate gefunden. Haken setzen und anlegen – fertig. Feintuning geht später im Zimmer.</p>
      <div class="disc-list">
        ${found.map((r, i) => `
          <label class="disc-item">
            <input type="checkbox" class="disc-check" data-idx="${i}" checked>
            <div class="disc-body">
              <div class="disc-name">${this._esc(r.name)}</div>
              ${line("🔥", r.valves)}
              ${line("🌡️", r.temp_sensor ? [r.temp_sensor] : [])}
              ${line("🪟", r.windows)}
              ${line("💧", r.humidity_sensor ? [r.humidity_sensor] : [])}
              ${!r.temp_sensor ? `<div class="disc-hint">Kein eigenes Thermometer – Temperatur kommt vom Thermostat.</div>` : ""}
              ${!r.windows.length ? `<div class="disc-hint">Kein Fensterkontakt – automatische Fenstererkennung übernimmt.</div>` : ""}
            </div>
          </label>`).join("")}
      </div>
      <div class="btn-row">
        <button class="btn btn-primary" id="modal-confirm">Ausgewählte Zimmer anlegen</button>
        <button class="btn btn-secondary modal-close-btn">Abbrechen</button>
      </div>` : `
      <p class="modal-lead">${all.length
        ? "Alle gefundenen Thermostate sind bereits einem IHC-Zimmer zugeordnet. 🎉"
        : "Keine Thermostate mit Bereich gefunden. Weise deine Thermostate in Home Assistant einem Bereich zu (Einstellungen → Geräte → Gerät → Bereich) oder lege das Zimmer manuell an."}</p>
      <div class="btn-row">
        <button class="btn btn-primary" id="disc-manual">+ Zimmer manuell anlegen</button>
        <button class="btn btn-secondary modal-close-btn">Schließen</button>
      </div>`;
    this._showModal(`<div class="modal-title">🔍 Zimmer automatisch finden</div>${body}`, async () => {
      const modal = this.shadowRoot.querySelector("#modal-root .modal");
      const picked = [...modal.querySelectorAll(".disc-check:checked")].map(cb => found[parseInt(cb.dataset.idx, 10)]);
      if (!picked.length) { this._toast("Nichts ausgewählt"); return; }
      await this._callService("add_rooms", {
        rooms: picked.map(r => ({
          name: r.name,
          valve_entity: r.valves[0],
          valve_entities: r.valves,
          temp_sensor: r.temp_sensor,
          window_sensor: r.windows[0] || "",
          window_sensors: r.windows,
          humidity_sensor: r.humidity_sensor,
        })),
      });
      this._closeModal();
      this._toast(`✓ ${picked.length} Zimmer angelegt – HA lädt die Entitäten neu`);
    });
    this.shadowRoot.querySelector("#disc-manual")?.addEventListener("click", () => {
      this._closeModal();
      this._showAddRoomModal();
    });
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

  // ── HA Schedule row helpers ─────────────────────────────────────────────

  /** Renders a single HA schedule row and returns its element. */
  _makeHaSchedRow(entry = {}) {
    const row = document.createElement("div");
    row.className = "ha-sched-row";
    row.style.cssText = "display:grid;grid-template-columns:1fr auto 1fr auto auto;gap:6px;align-items:center;margin-bottom:6px";
    row.innerHTML = `
      <input type="text" class="form-input hs-entity" placeholder="schedule.zimmer"
        data-ep-domains="schedule" autocomplete="off" value="${ihcEsc(entry.entity || '')}">
      <select class="form-select hs-mode" style="min-width:90px">
        <option value="comfort" ${(entry.mode||'comfort')==='comfort'?'selected':''}>Komfort</option>
        <option value="eco"     ${entry.mode==='eco'    ?'selected':''}>Eco</option>
        <option value="sleep"   ${entry.mode==='sleep'  ?'selected':''}>Schlaf</option>
        <option value="away"    ${entry.mode==='away'   ?'selected':''}>Abwesend</option>
      </select>
      <input type="text" class="form-input hs-cond" placeholder="Bedingung (optional)"
        data-ep-domains="input_boolean,binary_sensor,person,device_tracker" autocomplete="off" value="${ihcEsc(entry.condition_entity || '')}">
      <input type="text" class="form-input hs-cond-state" placeholder="Zustand"
        style="width:70px" value="${ihcEsc(entry.condition_state || 'on')}">
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
          this._attachEntityPickers(row);
        });
      }
    }, 50);
  }

  /** Binds the add/remove buttons for sleep-temperature-profile point rows. */
  _bindSleepProfileAdder(listId, addBtnId) {
    setTimeout(() => {
      const list = this.shadowRoot.querySelector(`#${listId}`);
      if (!list) return;
      list.querySelectorAll(".remove-sp-point").forEach(btn => {
        btn.addEventListener("click", () => btn.closest(".sp-row").remove());
      });
      const addBtn = this.shadowRoot.querySelector(`#${addBtnId}`);
      if (addBtn) {
        addBtn.addEventListener("click", () => {
          const row = document.createElement("div");
          row.className = "entity-row sp-row";
          row.innerHTML = `
            <input type="time" class="form-input" style="max-width:110px" data-sp-field="time" value="">
            <input type="number" class="form-input" style="max-width:90px" data-sp-field="temp" placeholder="°C" step="0.5" min="5" max="30">
            <button class="btn btn-danger btn-icon remove-sp-point">✕</button>`;
          row.querySelector(".remove-sp-point").addEventListener("click", () => row.remove());
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
