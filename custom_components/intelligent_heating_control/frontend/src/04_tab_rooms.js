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
      return `
      <div class="room-list-item">
        <div class="room-list-left">
          <div class="room-list-name" style="display:flex;align-items:center;gap:8px">
            ${room.name} ${schedBadge}
          </div>
          <div class="room-list-meta">
            ${MODE_ICONS[room.room_mode] || "⚙️"} ${MODE_LABELS[room.room_mode] || room.room_mode}
            · ${room.current_temp !== null ? room.current_temp + " °C" : "kein Sensor"}
            ${room.window_open ? " · 🪟 Fenster" : ""}
          </div>
        </div>
        <div class="room-list-actions">
          <button class="btn btn-secondary" data-action="schedule" data-id="${room.entity_id}" title="Zeitplan & Kalender">📅 Zeitplan</button>
          <button class="btn btn-secondary" data-action="edit" data-id="${room.entity_id}">✏️</button>
          <button class="btn btn-danger btn-icon" data-action="delete"
            data-id="${room.room_id}" data-name="${room.name}" title="Zimmer löschen">🗑</button>
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

    content.querySelectorAll("[data-action='edit']").forEach(btn => {
      btn.addEventListener("click", () => this._showEditRoomModal(btn.dataset.id));
    });

    content.querySelectorAll("[data-action='schedule']").forEach(btn => {
      btn.addEventListener("click", () => {
        this._selectedRoom = btn.dataset.id;
        this._selectedRoomTab = "schedule";
        this._renderRooms(content);
      });
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
        <button class="btn btn-secondary" id="edit-room-btn" style="margin-left:auto">✏️ Einstellungen</button>
      </div>
      <div class="tabs" style="margin-bottom:16px">
        <div class="tab ${tab === "schedule" ? "active" : ""}" data-subtab="schedule">📅 Zeitplan</div>
        <div class="tab ${tab === "calendar" ? "active" : ""}" data-subtab="calendar">🗓️ Wochenansicht</div>
        <div class="tab ${tab === "history" ? "active" : ""}" data-subtab="history">📈 Verlauf</div>
      </div>
      <div id="room-detail-content"></div>`;

    content.querySelector("#back-to-rooms").addEventListener("click", () => {
      this._selectedRoom = null;
      this._renderRooms(content);
    });
    content.querySelector("#edit-room-btn").addEventListener("click", () => {
      this._showEditRoomModal(room.entity_id);
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
    else this._renderRoomCalendarInline(room, detailContent);
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
        const si = parseInt(chip.dataset.sched);
        const day = chip.dataset.day;
        const sched = this._editingSchedules[selId][si];
        if (sched.days.includes(day)) sched.days = sched.days.filter(d => d !== day);
        else sched.days.push(day);
        chip.classList.toggle("selected", sched.days.includes(day));
      });
    });

    container.querySelectorAll("[data-field]").forEach(inp => {
      inp.addEventListener("change", () => {
        const si = parseInt(inp.dataset.sched);
        const pi = parseInt(inp.dataset.period);
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
        const si = parseInt(inp.dataset.sched);
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
        const si = parseInt(btn.dataset.sched);
        const pi = parseInt(btn.dataset.period);
        this._editingSchedules[selId][si].periods.splice(pi, 1);
        this._renderRoomScheduleInline(room, container);
      });
    });

    container.querySelectorAll("[data-action='del-sched']").forEach(btn => {
      btn.addEventListener("click", () => {
        this._editingSchedules[selId].splice(parseInt(btn.dataset.sched), 1);
        this._renderRoomScheduleInline(room, container);
      });
    });

    container.querySelectorAll("[data-action='add-period']").forEach(btn => {
      btn.addEventListener("click", () => {
        const si = parseInt(btn.dataset.sched);
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
      const state = this.hass.states[condEntity];
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

    const vals   = history.map(p => p.v);
    const times  = history.map(p => p.t);
    const minV   = Math.min(...vals);
    const maxV   = Math.max(...vals);
    const range  = maxV - minV || 1;

    // Chart dimensions
    const W = 560, H = 180, padL = 38, padR = 12, padT = 14, padB = 36;
    const cW = W - padL - padR;
    const cH = H - padT - padB;

    const xOf = i => padL + (i / (vals.length - 1)) * cW;
    const yOf = v => padT + cH - ((v - minV) / range) * cH;

    // Polyline
    const pts = vals.map((v, i) => `${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`).join(" ");

    // Target temp reference line
    const tgt = room.target_temp;
    const tgtLine = (tgt != null && tgt >= minV - 1 && tgt <= maxV + 1) ? (() => {
      const y = yOf(tgt).toFixed(1);
      return `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#fb8c00" stroke-width="1" stroke-dasharray="4,3" opacity="0.7"/>
              <text x="${padL - 4}" y="${parseFloat(y) + 4}" text-anchor="end" font-size="9" fill="#fb8c00">${parseFloat(tgt).toFixed(1)}</text>`;
    })() : "";

    // Y-axis labels (4 ticks)
    const yTicks = [0, 0.33, 0.67, 1].map(f => {
      const v = minV + f * range;
      const y = yOf(v).toFixed(1);
      return `<line x1="${padL - 3}" y1="${y}" x2="${padL}" y2="${y}" stroke="var(--divider-color)" stroke-width="1"/>
              <text x="${padL - 5}" y="${parseFloat(y) + 4}" text-anchor="end" font-size="9" fill="var(--secondary-text-color)">${v.toFixed(1)}</text>`;
    }).join("");

    // X-axis labels: show every ~24 entries (daily) or first/last
    const xLabels = [];
    const step = Math.max(1, Math.floor(vals.length / 7));
    for (let i = 0; i < vals.length; i += step) {
      const t = times[i] || "";
      // Parse ISO datetime: "2026-03-22T14:00" → "Mo 14:00"
      let label = t;
      try {
        const d = new Date(t);
        const dayNames = ["So","Mo","Di","Mi","Do","Fr","Sa"];
        label = `${dayNames[d.getDay()]} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
      } catch(_) { /* keep raw */ }
      const x = xOf(i).toFixed(1);
      xLabels.push(`<text x="${x}" y="${H - padB + 14}" text-anchor="middle" font-size="9" fill="var(--secondary-text-color)">${label}</text>`);
    }

    // Last known temp + min/max annotation
    const lastVal = vals[vals.length - 1];
    const lastX   = xOf(vals.length - 1).toFixed(1);
    const lastY   = yOf(lastVal).toFixed(1);

    const svg = `
      <svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:${W}px;height:${H}px;display:block;overflow:visible" aria-label="Temperaturverlauf ${room.name}">
        <!-- Grid -->
        <rect x="${padL}" y="${padT}" width="${cW}" height="${cH}" fill="var(--card-background-color,#fafafa)" rx="4" opacity="0.5"/>
        ${[0, 0.33, 0.67, 1].map(f => {
          const y = yOf(minV + f * range).toFixed(1);
          return `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="var(--divider-color)" stroke-width="0.5" opacity="0.6"/>`;
        }).join("")}
        <!-- Target reference -->
        ${tgtLine}
        <!-- Y axis -->
        <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + cH}" stroke="var(--divider-color)" stroke-width="1"/>
        ${yTicks}
        <!-- X axis -->
        <line x1="${padL}" y1="${padT + cH}" x2="${W - padR}" y2="${padT + cH}" stroke="var(--divider-color)" stroke-width="1"/>
        ${xLabels.join("")}
        <!-- Curve -->
        <polyline points="${pts}" fill="none" stroke="var(--primary-color)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
        <!-- Current value dot -->
        <circle cx="${lastX}" cy="${lastY}" r="4" fill="var(--primary-color)" stroke="white" stroke-width="1.5"/>
        <text x="${parseFloat(lastX) + 7}" y="${parseFloat(lastY) + 4}" font-size="10" font-weight="600" fill="var(--primary-color)">${lastVal.toFixed(1)} °C</text>
      </svg>`;

    const minStr = minV.toFixed(1);
    const maxStr = maxV.toFixed(1);
    const avgStr = (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);

    container.innerHTML = `
      <div class="card">
        <div class="card-title">📈 Temperaturverlauf – ${room.name}</div>
        <div style="padding:4px 0 12px;overflow-x:auto">${svg}</div>
        <div style="display:flex;gap:24px;padding:4px 0 8px;flex-wrap:wrap">
          <div style="font-size:12px;color:var(--secondary-text-color)">
            <span style="font-weight:600;color:var(--primary-text-color)">Min:</span> ${minStr} °C
          </div>
          <div style="font-size:12px;color:var(--secondary-text-color)">
            <span style="font-weight:600;color:var(--primary-text-color)">Max:</span> ${maxStr} °C
          </div>
          <div style="font-size:12px;color:var(--secondary-text-color)">
            <span style="font-weight:600;color:var(--primary-text-color)">Ø:</span> ${avgStr} °C
          </div>
          <div style="font-size:12px;color:var(--secondary-text-color)">
            <span style="font-weight:600;color:var(--primary-text-color)">Messpunkte:</span> ${vals.length}
          </div>
          ${tgt != null ? `<div style="font-size:12px;color:#fb8c00"><span style="font-weight:600">Soll:</span> ${parseFloat(tgt).toFixed(1)} °C</div>` : ""}
        </div>
        <div style="font-size:11px;color:var(--secondary-text-color);padding-top:4px">Stündliche Messung · max. 7 Tage Verlauf · Ziel-Linie orange gestrichelt</div>
      </div>`;
  }

