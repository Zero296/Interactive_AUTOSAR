// ================= PART 5: UI CONTROLLERS, TOOLTIPS, RENDERERS & EXPORT =================

const uiState = {
  mainView: "sim",
  theme: "dark",
  scenIdx: 0,
  scenStep: 0,
  autoPlayTimer: null,
  autoClockTimer: null,
  activeCfgTab: 0,
  exportTabIdx: 0,
  prevRegA: 0x90,
  prevRegB: 0x80,
  tooltipTimer: null,
  tooltipLocked: false
};

function escHtml(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stopScenarioAutoPlay() {
  if (uiState.autoPlayTimer) {
    clearInterval(uiState.autoPlayTimer);
    uiState.autoPlayTimer = null;
  }
  const btn = document.getElementById("btnAutoPlay");
  if (btn) btn.textContent = "▶ Tự Động";
}

function toggleScenarioAutoPlay() {
  if (uiState.autoPlayTimer) {
    stopScenarioAutoPlay();
    return;
  }
  const btn = document.getElementById("btnAutoPlay");
  if (btn) btn.textContent = "⏸ Dừng";
  uiState.autoPlayTimer = setInterval(() => {
    const scen = SCENARIOS[uiState.scenIdx];
    if (!scen || uiState.scenStep >= scen.steps.length) {
      stopScenarioAutoPlay();
      return;
    }
    nextScenarioStep(true);
  }, 1450);
}

function toggleAutoClock() {
  const btn = document.getElementById("btnAutoClock");
  if (uiState.autoClockTimer) {
    clearInterval(uiState.autoClockTimer);
    uiState.autoClockTimer = null;
    if (btn) {
      btn.textContent = "⏱ Auto Clock";
      btn.classList.remove("btn-ok");
    }
    return;
  }
  if (btn) {
    btn.textContent = "⏹ Stop Clock";
    btn.classList.add("btn-ok");
  }
  uiState.autoClockTimer = setInterval(() => {
    stepClockTick();
    renderAll();
  }, 800);
}

function switchMainView(v) {
  uiState.mainView = v === "hb" ? "hb" : "sim";
  hideConfigTooltip();
  const simEl = document.getElementById("viewSim");
  const hbEl = document.getElementById("viewHb");
  const bSim = document.getElementById("btnViewSim");
  const bHb = document.getElementById("btnViewHb");
  if (uiState.mainView === "hb") {
    simEl.classList.add("hidden");
    hbEl.classList.remove("hidden");
    bSim.classList.remove("active");
    bHb.classList.add("active");
    if (typeof renderHandbook === "function") renderHandbook();
  } else {
    hbEl.classList.add("hidden");
    simEl.classList.remove("hidden");
    bHb.classList.remove("active");
    bSim.classList.add("active");
  }
}

function toggleTheme() {
  const root = document.documentElement;
  const btn = document.getElementById("btnTheme");
  if (uiState.theme === "dark") {
    uiState.theme = "light";
    root.setAttribute("data-theme", "light");
    if (btn) btn.textContent = "🌙 Dark Mode";
  } else {
    uiState.theme = "dark";
    root.removeAttribute("data-theme");
    if (btn) btn.textContent = "☀️ Light Mode";
  }
}

function loadScenario(idOrIdx) {
  stopScenarioAutoPlay();
  let idx = 0;
  if (typeof idOrIdx === "number") {
    idx = Math.max(0, Math.min(SCENARIOS.length - 1, idOrIdx));
  } else {
    const found = SCENARIOS.findIndex((s) => s.id === idOrIdx);
    idx = found >= 0 ? found : 0;
  }
  uiState.scenIdx = idx;
  uiState.scenStep = 0;
  const scen = SCENARIOS[idx];
  if (scen && typeof scen.setup === "function") scen.setup();
  const sel = document.getElementById("scenSelect");
  if (sel && scen) sel.value = scen.id;
  syncConfigToDOM();
  validateConfigPanel();
  renderAll();
}

function onScenarioSelectChange() {
  const sel = document.getElementById("scenSelect");
  if (sel) loadScenario(sel.value);
}

function resetCurrentScenario() {
  loadScenario(uiState.scenIdx);
}

function applyScenarioToStep(targetStep, keepAuto) {
  if (!keepAuto) stopScenarioAutoPlay();
  const scen = SCENARIOS[uiState.scenIdx];
  if (!scen) return;
  const maxStep = scen.steps.length;
  const clamped = Math.max(0, Math.min(maxStep, targetStep));
  scen.setup();
  for (let i = 0; i < clamped; i++) {
    scen.steps[i].apply();
  }
  uiState.scenStep = clamped;
  syncConfigToDOM();
  validateConfigPanel();
  renderAll();
}

function prevScenarioStep() {
  if (uiState.scenStep > 0) applyScenarioToStep(uiState.scenStep - 1, false);
}

function nextScenarioStep(keepAuto) {
  const scen = SCENARIOS[uiState.scenIdx];
  if (scen && uiState.scenStep < scen.steps.length) {
    applyScenarioToStep(uiState.scenStep + 1, Boolean(keepAuto));
  }
}

function runWhatIf(idx) {
  stopScenarioAutoPlay();
  const scen = SCENARIOS[uiState.scenIdx];
  if (!scen || !scen.whatIfs || !scen.whatIfs[idx]) return;
  scen.whatIfs[idx].run();
  syncConfigToDOM();
  validateConfigPanel();
  renderAll();
}

// -------------------- QUICK ACTION BAR HANDLERS --------------------
function getQaInputs() {
  const addrStr = (document.getElementById("qaAddrInput") || {}).value || "0x0060";
  const lenVal = parseHexOrNum((document.getElementById("qaLenInput") || {}).value, 16);
  const hexStr = (document.getElementById("qaHexInput") || {}).value || "DE AD BE EF CA FE BA BE";
  return {
    addr: parseHexOrNum(addrStr, 0),
    len: lenVal,
    bytes: parseHexBytesString(hexStr, Math.max(1, lenVal), 0xA5)
  };
}

function onQaPresetChange() {
  const sel = document.getElementById("qaPresetAddr");
  if (!sel) return;
  const parts = String(sel.value).split(":");
  if (parts.length === 2) {
    const aEl = document.getElementById("qaAddrInput");
    const lEl = document.getElementById("qaLenInput");
    if (aEl) aEl.value = parts[0];
    if (lEl) lEl.value = parts[1];
  }
}

function qaEepRead() {
  const q = getQaInputs();
  api_Eep_Read(q.addr, q.len, "Ea");
  syncConfigToDOM();
  renderAll();
}

function qaEepWrite() {
  const q = getQaInputs();
  api_Eep_Write(q.addr, q.len <= 0 ? [] : q.bytes, "Ea", { length: q.len });
  syncConfigToDOM();
  renderAll();
}

function qaEepErase() {
  const q = getQaInputs();
  api_Eep_Erase(q.addr, q.len, "Ea");
  syncConfigToDOM();
  renderAll();
}

function qaEepCompare() {
  const q = getQaInputs();
  api_Eep_Compare(q.addr, q.len <= 0 ? [] : q.bytes, "Ea", { length: q.len });
  syncConfigToDOM();
  renderAll();
}

function qaToggleSetMode() {
  const target = simState.currentMode === "MEMIF_MODE_FAST" ? "MEMIF_MODE_SLOW" : "MEMIF_MODE_FAST";
  api_Eep_SetMode(target, "Ea");
  syncConfigToDOM();
  validateConfigPanel();
  renderAll();
}

function qaCancelOrToggleHwFault() {
  if (simState.driverStatus === "MEMIF_BUSY") {
    api_Eep_Cancel("Ea");
  } else {
    ecucConfig.InjectHwWriteOrEraseVerifyFail = !ecucConfig.InjectHwWriteOrEraseVerifyFail;
    updateDerivedRegisters();
  }
  syncConfigToDOM();
  validateConfigPanel();
  renderAll();
}

function qaResetEepInit() {
  api_Eep_Init(true);
  syncConfigToDOM();
  validateConfigPanel();
  renderAll();
}

// -------------------- 6-TAB ECUC CONFIG PANEL & VALIDATION --------------------
function switchCfgTab(idx) {
  uiState.activeCfgTab = idx;
  for (let i = 0; i < 6; i++) {
    const btn = document.getElementById("cfgTabBtn" + i);
    const pane = document.getElementById("cfgPane" + i);
    if (btn) btn.classList.toggle("active", i === idx);
    if (pane) pane.classList.toggle("hidden", i !== idx);
  }
}

function syncConfigToDOM() {
  Object.keys(defaultConfig).forEach((key) => {
    const el = document.getElementById("cfg_" + key);
    if (!el) return;
    if (el.type === "checkbox") {
      el.checked = Boolean(ecucConfig[key]);
    } else {
      el.value = ecucConfig[key];
    }
  });
}

function onConfigInputChanged(key) {
  const el = document.getElementById("cfg_" + key);
  if (!el) return;
  if (el.type === "checkbox") {
    ecucConfig[key] = el.checked;
  } else if (el.type === "number") {
    ecucConfig[key] = Number(el.value);
  } else {
    ecucConfig[key] = el.value;
  }

  if (key === "EepInitialized") {
    if (!ecucConfig.EepInitialized) {
      simState.driverStatus = "MEMIF_UNINIT";
      simState.driverSmState = "UNINIT";
      simState.activeJob = null;
      simState.hwSmState = "HW_READY";
      simState.activeChunkRange = { start: -1, end: -1, kind: "" };
    } else if (simState.driverStatus === "MEMIF_UNINIT") {
      api_Eep_Init(true);
    }
  } else if (key === "CurrentMemIfMode") {
    if (simState.driverStatus === "MEMIF_IDLE") {
      api_Eep_SetMode(ecucConfig.CurrentMemIfMode, "Config");
    } else {
      simState.currentMode = ecucConfig.CurrentMemIfMode;
    }
  } else if (key === "EepDefaultMode" && simState.driverStatus === "MEMIF_IDLE" && !simState.activeJob) {
    simState.currentMode = ecucConfig.EepDefaultMode;
    ecucConfig.CurrentMemIfMode = ecucConfig.EepDefaultMode;
    syncConfigToDOM();
  }

  updateDerivedRegisters();
  validateConfigPanel();
  renderAll();
}

function validateConfigPanel() {
  const box = document.getElementById("cfgValidationBox");
  if (!box) return;
  const msgs = [];
  const eepSize = parseHexOrNum(ecucConfig.EepSize, 256);
  const totSize = parseHexOrNum(ecucConfig.EepTotalSize, 256);

  if (!ecucConfig.EepInitialized) {
    msgs.push({ tone: "warn", text: "Driver đang MEMIF_UNINIT: Mọi lệnh Read/Write/Erase sẽ báo DET EEP_E_UNINIT (0x00)." });
  }
  if (eepSize > totSize) {
    msgs.push({ tone: "err", text: `Lỗi Layout: EepSize (${eepSize}B) không được lớn hơn EepTotalSize (${totSize}B)!` });
  }
  if (Number(ecucConfig.EepFastWriteBlockSize) < Number(ecucConfig.EepNormalWriteBlockSize)) {
    msgs.push({ tone: "warn", text: "Cảnh báo: EepFastWriteBlockSize đang nhỏ hơn EepNormalWriteBlockSize." });
  }
  if (ecucConfig.EepWriteCycleReduction && !ecucConfig.EnableWriteVerification) {
    msgs.push({ tone: "warn", text: "Khuyến nghị Safety: Bật EnableWriteVerification khi dùng chung với WriteCycleReduction." });
  }
  if (!ecucConfig.EepDemErrorReportingEnabled) {
    msgs.push({ tone: "warn", text: "Dem Reporting đang TẮT: Eep vẫn trả MEMIF_JOB_FAILED nhưng sẽ không gọi Dem_SetEventStatus()." });
  }
  if (ecucConfig.InjectHwTimeoutStuckBusy) {
    msgs.push({ tone: "err", text: "Fault Injection ON: WIP_HW_BUSY bị gài treo (Timeout Runtime 0x05 sau 3 ticks)." });
  }
  if (ecucConfig.InjectHwWriteOrEraseVerifyFail) {
    msgs.push({ tone: "err", text: "Fault Injection ON: Bơm lỗi Read/Verify thất bại (DEM FAILED)." });
  }
  if (ecucConfig.TestInvalidParamMode && ecucConfig.TestInvalidParamMode !== "NONE") {
    msgs.push({ tone: "warn", text: `DET Injector đang gài: ${ecucConfig.TestInvalidParamMode}.` });
  }

  if (msgs.length === 0) {
    box.innerHTML = `<div style="font-size:10.5px;color:var(--ok);background:var(--ok-bg);border:1px solid var(--ok);border-radius:6px;padding:4px 8px">✔ Cấu hình 36 ECUC hợp lệ (AUTOSAR R23-11 Eep_Cfg).</div>`;
  } else {
    box.innerHTML = msgs.map((m) => {
      const col = m.tone === "err" ? "var(--err)" : "var(--warn)";
      const bg = m.tone === "err" ? "var(--err-bg)" : "var(--warn-bg)";
      return `<div style="font-size:10.5px;color:${col};background:${bg};border:1px solid ${col};border-radius:6px;padding:4px 8px;margin-top:4px">${escHtml(m.text)}</div>`;
    }).join("");
  }
}

// -------------------- FLOATING HOVER TOOLTIP (>1000MS) --------------------
function showConfigTooltip(key, anchorEl) {
  const popup = document.getElementById("cfgTooltipPopup");
  const data = configTooltipData[key];
  if (!popup || !data || !anchorEl) return;

  popup.innerHTML = `
    <div class="tt-hdr">
      <div class="tt-title">${escHtml(data.title)}</div>
      <div class="tt-meta">${escHtml(data.sws)}</div>
    </div>
    <div class="tt-path mono">${escHtml(data.ecucPath)}</div>
    <div class="tt-sec"><b>Giải thích:</b> ${escHtml(data.desc)}</div>
    <div class="tt-sec"><b>Lưu ý AUTOSAR:</b> ${escHtml(data.note)}</div>
    <div class="tt-sec" style="color:var(--ok)"><b>Tác động Simulator:</b> ${escHtml(data.impact)}</div>
    <div class="tt-grid">
      <div><span style="color:var(--mut)">Kiểu:</span> <span class="mono">${escHtml(data.type)}</span></div>
      <div><span style="color:var(--mut)">Khuyến nghị:</span> <span class="mono">${escHtml(data.typical)}</span></div>
      <div style="grid-column:1/-1"><span style="color:var(--mut)">Miền giá trị:</span> <span class="mono">${escHtml(data.range)}</span></div>
    </div>
  `;

  const rect = anchorEl.getBoundingClientRect();
  popup.classList.add("show");
  const popRect = popup.getBoundingClientRect();
  const pw = popRect.width || 410;
  const ph = popRect.height || 230;

  let left = rect.right + 12;
  if (left + pw > window.innerWidth - 12) {
    left = Math.max(12, rect.left - pw - 12);
  }
  let top = rect.top - 12;
  if (top + ph > window.innerHeight - 12) {
    top = Math.max(12, window.innerHeight - ph - 12);
  }
  popup.style.left = Math.round(left) + "px";
  popup.style.top = Math.round(top) + "px";
}

function hideConfigTooltip() {
  if (uiState.tooltipTimer) {
    clearTimeout(uiState.tooltipTimer);
    uiState.tooltipTimer = null;
  }
  uiState.tooltipLocked = false;
  const popup = document.getElementById("cfgTooltipPopup");
  if (popup) popup.classList.remove("show");
}

function setupConfigTooltips() {
  const rows = document.querySelectorAll(".cfg-row[data-cfg-key]");
  rows.forEach((row) => {
    const key = row.getAttribute("data-cfg-key");
    row.addEventListener("mouseenter", () => {
      if (uiState.tooltipTimer) clearTimeout(uiState.tooltipTimer);
      uiState.tooltipTimer = setTimeout(() => {
        showConfigTooltip(key, row);
      }, 1050);
    });
    row.addEventListener("mouseleave", () => {
      if (!uiState.tooltipLocked) hideConfigTooltip();
    });
    const icon = row.querySelector(".cfg-i");
    if (icon) {
      icon.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const popup = document.getElementById("cfgTooltipPopup");
        if (uiState.tooltipLocked && popup && popup.classList.contains("show")) {
          hideConfigTooltip();
        } else {
          uiState.tooltipLocked = true;
          showConfigTooltip(key, row);
        }
      });
    }
  });
  document.addEventListener("click", (ev) => {
    if (uiState.tooltipLocked && !ev.target.closest(".cfg-i")) {
      hideConfigTooltip();
    }
  });
}

// -------------------- RENDERERS --------------------
function renderHeaderAndStepper() {
  const scen = SCENARIOS[uiState.scenIdx] || SCENARIOS[0];
  const stepInd = document.getElementById("stepIndicator");
  const prevBtn = document.getElementById("btnPrevStep");
  const nextBtn = document.getElementById("btnNextStep");
  if (stepInd) stepInd.textContent = `Bước ${uiState.scenStep} / ${scen.steps.length}`;
  if (prevBtn) prevBtn.disabled = uiState.scenStep <= 0;
  if (nextBtn) nextBtn.disabled = uiState.scenStep >= scen.steps.length;

  const clk = document.getElementById("clockVal");
  if (clk) clk.textContent = `${simState.timeMs} ms`;

  const stBadge = document.getElementById("hdrBadgeStatus");
  if (stBadge) {
    stBadge.textContent = simState.driverStatus;
    stBadge.className = "state-badge " + (
      simState.driverStatus === "MEMIF_BUSY" ? "sb-warn" :
      (simState.driverStatus === "MEMIF_UNINIT" ? "sb-err" : "sb-ok")
    );
  }

  const resBadge = document.getElementById("hdrBadgeResult");
  if (resBadge) {
    resBadge.textContent = simState.jobResult;
    resBadge.className = "state-badge " + (
      simState.jobResult === "MEMIF_JOB_OK" ? "sb-ok" :
      (simState.jobResult === "MEMIF_JOB_PENDING" ? "sb-warn" :
      (simState.jobResult === "MEMIF_JOB_CANCELED" ? "sb-pur" : "sb-err"))
    );
  }

  const mdBadge = document.getElementById("hdrBadgeMode");
  const isFast = simState.currentMode === "MEMIF_MODE_FAST";
  if (mdBadge) {
    const rdB = isFast ? ecucConfig.EepFastReadBlockSize : ecucConfig.EepNormalReadBlockSize;
    const wrB = isFast ? ecucConfig.EepFastWriteBlockSize : ecucConfig.EepNormalWriteBlockSize;
    mdBadge.textContent = `${isFast ? "FAST" : "SLOW"} (${rdB}/${wrB}B)`;
    mdBadge.className = "state-badge " + (isFast ? "sb-pri" : "sb-cyan");
  }

  const hwBadge = document.getElementById("hdrBadgeHwBus");
  if (hwBadge) {
    const isSpi = ecucConfig.EepHardwareInterfaceType === "EXTERNAL_SPI_EEPROM";
    hwBadge.textContent = isSpi ? `EXT SPI (Seq${ecucConfig.EepSpiSequenceId})` : "INT ON-CHIP";
    hwBadge.className = "state-badge " + (isSpi ? "sb-pri" : "sb-pur");
  }

  const qaTxtMode = document.getElementById("qaTxtMode");
  if (qaTxtMode) qaTxtMode.textContent = isFast ? "FAST" : "SLOW";

  const qaCancelLbl = document.getElementById("qaTxtCancelLbl");
  const qaFaultTxt = document.getElementById("qaTxtFault");
  const qaBtnCF = document.getElementById("qaBtnCancelOrFault");
  if (simState.driverStatus === "MEMIF_BUSY") {
    if (qaCancelLbl) qaCancelLbl.textContent = "🛑 6. Eep_Cancel()";
    if (qaFaultTxt) qaFaultTxt.textContent = "ABORT";
    if (qaBtnCF) qaBtnCF.classList.add("qa-active");
  } else {
    if (qaCancelLbl) qaCancelLbl.textContent = "🔥 6. Tiêm Lỗi HW";
    if (qaFaultTxt) qaFaultTxt.textContent = ecucConfig.InjectHwWriteOrEraseVerifyFail ? "FAIL_ON" : "OFF";
    if (qaBtnCF) qaBtnCF.classList.toggle("qa-active", Boolean(ecucConfig.InjectHwWriteOrEraseVerifyFail));
  }
}

function renderScenarioPanel() {
  const scen = SCENARIOS[uiState.scenIdx];
  if (!scen) return;
  const badge = document.getElementById("scenIdBadge");
  const box = document.getElementById("scenSummaryBox");
  const wif = document.getElementById("whatIfContainer");
  if (badge) badge.textContent = `${scen.id} · ${scen.group.split(":")[0]}`;
  if (box) box.innerHTML = `<strong style="color:var(--txt)">${escHtml(scen.title)}</strong><div style="margin-top:3px">${escHtml(scen.shortDesc)}</div>`;
  if (wif) {
    wif.innerHTML = (scen.whatIfs || []).map((w, idx) =>
      `<button class="whatif-btn" onclick="runWhatIf(${idx})">⚡ ${escHtml(w.label)}</button>`
    ).join("");
  }
}

function renderChunkBanner() {
  const mapBadge = document.getElementById("eepMapBadge");
  if (mapBadge) {
    mapBadge.textContent = `Base: ${fmtHex16(getBaseAddressNum())} | Size: ${getEepSize()}B | EraseVal: ${fmtHex8(getEraseByte())}`;
  }
  const banner = document.getElementById("eepChunkBanner");
  if (!banner) return;

  const job = simState.activeJob;
  const isSpi = ecucConfig.EepHardwareInterfaceType === "EXTERNAL_SPI_EEPROM";
  const lastSpi = simState.lastSpiFrames.length > 0 ? simState.lastSpiFrames[simState.lastSpiFrames.length - 1] : null;
  let pct = 0;
  let statusLine = "";

  if (job) {
    pct = job.totalLen > 0 ? Math.min(100, Math.round((job.completedBytes / job.totalLen) * 100)) : 0;
    statusLine = `⚡ Active Job #${job.id}: ${job.type} @ ${fmtHex16(job.startAddr)}..${fmtHex16(job.startAddr + job.totalLen - 1)} | Done ${job.completedBytes}/${job.totalLen}B (Chunk=${job.chunkSize}B · ${job.chunkIndex + 1}/${job.totalChunks})`;
  } else {
    pct = simState.jobResult === "MEMIF_JOB_OK" ? 100 : 0;
    const mod = simState.lastModifiedRange;
    if (mod.start >= 0) {
      statusLine = `✔ Last Job (${mod.kind}): ${fmtHex16(mod.start)}..${fmtHex16(mod.end)} | Result = ${simState.jobResult}`;
    } else {
      statusLine = `✔ Sẵn sàng (${simState.driverStatus}) · Chế độ ${simState.currentMode}`;
    }
  }

  const busSummary = isSpi
    ? (lastSpi ? `SPI Seq=${lastSpi.seq}: ${lastSpi.cmd} @ ${lastSpi.addr} (${lastSpi.len}B) — ${lastSpi.note}` : `External SPI Bus (Seq=${ecucConfig.EepSpiSequenceId}): Idle`)
    : `Internal On-Chip EEPROM Controller (EECTRL/EEDATA Direct Reg)`;

  banner.innerHTML = `
    <div class="eep-chunk-top">
      <span class="mono" style="font-weight:700;color:var(--txt)">${escHtml(statusLine)}</span>
      <div class="eep-chunk-bar"><div class="eep-chunk-fill" style="width:${pct}%"></div></div>
      <span class="mono" style="font-weight:800;color:var(--cyan)">${pct}%</span>
    </div>
    <div class="eep-bus-trace">
      <span class="mono">${escHtml(busSummary)}</span>
      <span class="mono" style="color:${ecucConfig.EepWriteCycleReduction ? "var(--ok)" : "var(--mut)"}">CycleReduction: ${ecucConfig.EepWriteCycleReduction ? "ON" : "OFF"} | Verify: ${ecucConfig.EnableWriteVerification ? "ON" : "OFF"}</span>
    </div>
  `;
}

function setEepCellClickMode(mode) {
  simState.cellClickMode = mode === "STUCK_BIT" ? "STUCK_BIT" : "TOGGLE_BYTE";
  const b1 = document.getElementById("btnCellClickToggleByte");
  const b2 = document.getElementById("btnCellClickStuckBit");
  if (b1) b1.classList.toggle("active", simState.cellClickMode === "TOGGLE_BYTE");
  if (b2) b2.classList.toggle("active", simState.cellClickMode === "STUCK_BIT");
}

function getRegionLabel(rowStart) {
  const reg = EEPROM_REGIONS.find((r) => rowStart >= r.start && rowStart <= r.end);
  return reg ? reg.label : "EEPROM Region";
}

function renderEepHexMap() {
  const container = document.getElementById("eepMemoryMap");
  if (!container) return;
  const basePhys = getBaseAddressNum();
  const eraseB = getEraseByte();
  const eepSize = getEepSize();

  let html = `<table class="eep-hex-table"><thead><tr><th>Phys Addr</th><th style="text-align:center">00..07 (Page A) | 08..0F (Page B)</th><th>Vùng Nhớ / Ea Block</th></tr></thead><tbody>`;
  for (let row = 0; row < 16; row++) {
    const rowStart = row * 16;
    const regionLabel = getRegionLabel(rowStart);
    html += `<tr><td class="eep-hex-addr mono">${fmtHex16(basePhys + rowStart)}</td><td><div class="eep-byte-strip">`;
    for (let col = 0; col < 16; col++) {
      const addr = rowStart + col;
      const val = simState.eepromMemory[addr] & 0xFF;
      const hex = val.toString(16).toUpperCase().padStart(2, "0");
      const outOfBounds = addr >= eepSize;

      let cls = "eep-cell mono";
      if (col === 7) cls += " c-page-split";
      if (simState.stuckBits[addr] || simState.mismatchAddrs.includes(addr)) {
        cls += " c-stuck";
      } else if (simState.activeChunkRange.start >= 0 && addr === simState.activeChunkRange.start) {
        cls += " c-cursor";
      } else if (simState.activeChunkRange.start >= 0 && addr >= simState.activeChunkRange.start && addr <= simState.activeChunkRange.end) {
        cls += " c-active-chunk";
      } else if (simState.lastModifiedRange.start >= 0 && addr >= simState.lastModifiedRange.start && addr <= simState.lastModifiedRange.end) {
        cls += " c-done-chunk";
      } else if (addr >= 0x50 && addr <= 0x53 && val === 0xA5) {
        cls += " c-hdr";
      } else if (addr >= 0x5C && addr <= 0x5F && val === 0x5A) {
        cls += " c-ftr";
      } else if (val === 0x00 && eraseB !== 0x00) {
        cls += " c-inv";
      } else if (val === eraseB) {
        cls += " c-erased";
      } else {
        cls += " c-data";
      }

      const opacityStyle = outOfBounds ? ' style="opacity:0.35"' : "";
      const tip = `Phys ${fmtHex16(basePhys + addr)} | Val=${fmtHex8(val)} | Writes=${simState.writeCounts[addr]}${simState.stuckBits[addr] ? " | STUCK FAULT!" : ""}${outOfBounds ? " | Out of EepSize" : ""}`;
      html += `<span class="${cls}"${opacityStyle} title="${escHtml(tip)}" onclick="toggleEepromCell(${addr});renderAll();">${hex}</span>`;
    }
    html += `</div></td><td class="eep-region-tag">${escHtml(regionLabel)}</td></tr>`;
  }
  html += `</tbody></table>`;
  container.innerHTML = html;
}

function renderSingle8BitReg(containerId, hexId, regByte, prevByte, bitsMeta, regType) {
  const box = document.getElementById(containerId);
  const hexEl = document.getElementById(hexId);
  if (hexEl) hexEl.textContent = fmtHex8(regByte);
  if (!box) return;

  box.innerHTML = bitsMeta.map((b) => {
    const isOn = (regByte & b.mask) !== 0;
    const changed = ((regByte ^ prevByte) & b.mask) !== 0;
    const toneCls = b.tone === "warn" ? "warn-bit" : (b.tone === "err" ? "err-bit" : (b.tone === "pur" ? "pur-bit" : (b.tone === "cyan" ? "cyan-bit" : "")));
    const cls = `bit-box${isOn ? " on " + toneCls : ""}${changed ? " chg" : ""}`;
    return `<div class="${cls}" title="Bit ${b.bit} (${b.name}): ${escHtml(b.desc)} (Click để đảo)" onclick="toggleRegisterBit('${regType}', ${b.mask}); renderAll();">
      <span class="bit-pos">b${b.bit}</span>
      <span class="bit-val mono">${isOn ? 1 : 0}</span>
      <span class="bit-tag">${escHtml(b.tag)}</span>
    </div>`;
  }).join("");
}

function render8BitRegisters() {
  renderSingle8BitReg("regABits", "regAHex", simState.regAByte, uiState.prevRegA, EEP_DRIVER_STATUS_BITS, "A");
  renderSingle8BitReg("regBBits", "regBHex", simState.regBByte, uiState.prevRegB, EEP_HW_CTRL_BITS, "B");
  uiState.prevRegA = simState.regAByte;
  uiState.prevRegB = simState.regBByte;
}

function renderHwBarsAndStateMachines() {
  const execBadge = document.getElementById("eepExecBadge");
  if (execBadge) {
    execBadge.textContent = `${simState.driverStatus} (t=${simState.timeMs}ms)`;
    execBadge.className = "state-badge " + (
      simState.driverStatus === "MEMIF_BUSY" ? "sb-warn" :
      (simState.driverStatus === "MEMIF_UNINIT" ? "sb-err" : "sb-ok")
    );
  }

  const timersGrid = document.getElementById("timersGrid");
  if (timersGrid) {
    const job = simState.activeJob;
    const jobPct = job ? Math.min(100, Math.round((job.completedBytes / Math.max(1, job.totalLen)) * 100)) : (simState.jobResult === "MEMIF_JOB_OK" ? 100 : 0);
    const hwPct = (job && simState.hwBusyTargetMs > 0) ? Math.min(100, Math.round((simState.hwBusyTimerMs / simState.hwBusyTargetMs) * 100)) : (simState.hwSmState === "WIP_BUSY" ? 50 : 0);
    const tmoTicks = job ? job.timeoutTicks : (simState.detFaults.some((d) => d.errorName === "EEP_E_TIMEOUT") ? 3 : 0);
    const tmoPct = Math.min(100, Math.round((tmoTicks / 3) * 100));
    const isIsr = ecucConfig.EepUseInterrupts;

    timersGrid.innerHTML = `
      <div class="timer-card${job ? " active" : ""}">
        <div class="timer-top"><span>📦 Job Bytes</span><span class="mono">${job ? `${job.completedBytes}/${job.totalLen}B` : (simState.lastModifiedRange.start >= 0 ? "Done" : "0B")}</span></div>
        <div class="timer-bar"><div class="timer-fill" style="width:${jobPct}%"></div></div>
      </div>
      <div class="timer-card${simState.hwSmState === "WIP_BUSY" ? " active" : ""}">
        <div class="timer-top"><span>⚡ HW WIP Timer</span><span class="mono">${simState.hwBusyTimerMs}/${ecucConfig.EepWriteTimeMs}ms</span></div>
        <div class="timer-bar"><div class="timer-fill" style="width:${hwPct}%"></div></div>
      </div>
      <div class="timer-card${tmoTicks > 0 ? " active" : ""}">
        <div class="timer-top"><span>🛡️ WIP Timeout</span><span class="mono">${tmoTicks}/3 ticks</span></div>
        <div class="timer-bar"><div class="timer-fill" style="width:${tmoPct}%;background:var(--err)"></div></div>
      </div>
      <div class="timer-card${isIsr ? " active" : ""}">
        <div class="timer-top"><span>⏱ ${isIsr ? "ISR Accelerated" : "MainFn Cycle"}</span><span class="mono">${ecucConfig.EepJobCallCycle}ms ${isIsr ? "(x2)" : "(x1)"}</span></div>
        <div class="timer-bar"><div class="timer-fill" style="width:${isIsr ? 100 : 50}%"></div></div>
      </div>
    `;
  }

  const drvLbl = document.getElementById("smEepDriverLbl");
  if (drvLbl) drvLbl.textContent = simState.driverStatus;
  const drvBox = document.getElementById("eepDriverSmDiagram");
  if (drvBox) {
    const drvNodes = [
      { id: "UNINIT", label: "MEMIF_UNINIT", sub: "Chưa Eep_Init", tone: "active-err" },
      { id: "IDLE", label: "MEMIF_IDLE", sub: "Sẵn sàng lệnh mới", tone: "active-ok" },
      { id: "BUSY_READ", label: "BUSY · READ", sub: "Đọc Chunk -> RAM", tone: "active-pri" },
      { id: "BUSY_WRITE", label: "BUSY · WRITE", sub: "Write + Verify", tone: "active-warn" },
      { id: "BUSY_ERASE", label: "BUSY · ERASE/CMP", sub: "Erase/Compare", tone: "active-pur" },
      { id: "JOB_ERR", label: "JOB_FAILED / INC", sub: "CBK Error / Dem", tone: "active-err" }
    ];
    drvBox.innerHTML = drvNodes.map((n) => {
      const isCur = simState.driverSmState === n.id || (n.id === "BUSY_ERASE" && (simState.driverSmState === "BUSY_ERASE" || simState.driverSmState === "BUSY_COMPARE"));
      return `<div class="sm-node${isCur ? " " + n.tone : ""}">
        <div>${escHtml(n.label)}</div>
        <div style="font-size:9px;opacity:0.85">${escHtml(n.sub)}</div>
      </div>`;
    }).join("");
  }

  const hwLbl = document.getElementById("smEepHwLbl");
  if (hwLbl) hwLbl.textContent = simState.hwSmState + (simState.eaSubJobState !== "EA_IDLE" ? ` | Ea:${simState.eaSubJobState}` : "");
  const hwBox = document.getElementById("eepHwSmDiagram");
  if (hwBox) {
    const hwNodes = [
      { id: "HW_READY", label: "HW_IDLE_READY", sub: "Sẵn sàng SPI/Reg", tone: "active-ok" },
      { id: "SPI_WREN", label: "SPI_WREN (0x06)", sub: "Mở khóa Write Enable", tone: "active-pri" },
      { id: "WIP_BUSY", label: "WIP_HW_BUSY = 1", sub: "Đang lập trình ô nhớ", tone: "active-warn" },
      { id: "VERIFYING", label: "READBACK_VERIFY", sub: "So sánh RAM vs Cell", tone: "active-pur" },
      { id: "HW_FAULT", label: "HW_FAULT / TMO", sub: "Stuck / Timeout Err", tone: "active-err" }
    ];
    hwBox.innerHTML = hwNodes.map((n) => {
      const isCur = simState.hwSmState === n.id;
      return `<div class="sm-node${isCur ? " " + n.tone : ""}">
        <div>${escHtml(n.label)}</div>
        <div style="font-size:9px;opacity:0.85">${escHtml(n.sub)}</div>
      </div>`;
    }).join("");
  }
}

function renderSvgArchitecture() {
  const detCnt = simState.detFaults.length;
  const demFailCnt = Object.values(simState.demFaults).filter((v) => v === "FAILED").length;
  const detEl = document.getElementById("svgSub_MOD_DET");
  if (detEl) detEl.textContent = `DET: ${detCnt} | DEM Fail: ${demFailCnt}`;

  const eep1 = document.getElementById("svgSub_MOD_EEP1");
  const eep2 = document.getElementById("svgSub_MOD_EEP2");
  if (eep1) eep1.textContent = `Status: ${simState.driverStatus} | Result: ${simState.jobResult}`;
  if (eep2) {
    const isFast = simState.currentMode === "MEMIF_MODE_FAST";
    const rd = isFast ? ecucConfig.EepFastReadBlockSize : ecucConfig.EepNormalReadBlockSize;
    const wr = isFast ? ecucConfig.EepFastWriteBlockSize : ecucConfig.EepNormalWriteBlockSize;
    eep2.textContent = `Mode ${isFast ? "FAST" : "SLOW"}: Rd ${rd}B / Wr ${wr}B | Verify=${ecucConfig.EnableWriteVerification ? "ON" : "OFF"}`;
  }

  const schmEl = document.getElementById("svgSub_MOD_SCHM");
  if (schmEl) {
    schmEl.textContent = `Tick: ${ecucConfig.EepJobCallCycle}ms | ${ecucConfig.EepUseInterrupts ? "ISR: Eep_JobEndIsr" : "Polling MainFn"}`;
  }

  const spiEl = document.getElementById("svgSub_MOD_SPI");
  if (spiEl) {
    const isSpi = ecucConfig.EepHardwareInterfaceType === "EXTERNAL_SPI_EEPROM";
    const lastF = simState.lastSpiFrames.length > 0 ? simState.lastSpiFrames[simState.lastSpiFrames.length - 1] : null;
    spiEl.textContent = isSpi
      ? (lastF ? `EXT SPI (Seq=${lastF.seq}): ${lastF.cmd} @ ${lastF.addr} (${lastF.len}B)` : `EXT SPI (Seq=${ecucConfig.EepSpiSequenceId}): WREN 0x06 -> WRITE 0x02 -> RDSR 0x05`)
      : `INTERNAL ON-CHIP EEPROM: EECTRL / EEDATA (${simState.hwSmState})`;
  }

  Object.keys(MODULES_INFO).forEach((mId) => {
    const g = document.getElementById("node_" + mId);
    if (!g) return;
    g.classList.toggle("selected", simState.selectedModuleId === mId);
  });

  const allArrowIds = [
    "arr_swc_rte", "arr_rte_nvm", "arr_nvm_memif", "arr_memif_ea",
    "arr_ea_nvm_cbk", "arr_ea_eep", "arr_eep_ea_cbk", "arr_ecum_eep",
    "arr_schm_eep", "arr_eep_det", "arr_eep_hw", "arr_hw_eep"
  ];
  allArrowIds.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.setAttribute("class", "flow-arrow");
    if (simState.activeArrows.includes(id)) {
      let cls = "active-pri";
      if (id === "arr_eep_det" || simState.jobResult === "MEMIF_JOB_FAILED") cls = "active-err";
      else if (id.includes("cbk") || simState.jobResult === "MEMIF_JOB_OK") cls = "active-ok";
      else if (simState.jobResult === "MEMIF_JOB_CANCELED") cls = "active-pur";
      else if (simState.driverStatus === "MEMIF_BUSY") cls = "active-warn";
      el.setAttribute("class", "flow-arrow " + cls);
    }
  });
}

function selectModule(modId) {
  if (MODULES_INFO[modId]) {
    simState.selectedModuleId = modId;
    switchInspTab(1);
    renderSvgArchitecture();
  }
}

function switchInspTab(idx) {
  simState.inspTabIdx = idx;
  for (let i = 0; i < 4; i++) {
    const btn = document.getElementById("inspTabBtn" + i);
    if (btn) btn.classList.toggle("active", i === idx);
  }
  renderInspector();
}

function renderInspector() {
  const body = document.getElementById("inspBody");
  if (!body) return;
  const tab = simState.inspTabIdx || 0;

  if (tab === 0) {
    const scen = SCENARIOS[uiState.scenIdx];
    const stepObj = uiState.scenStep > 0 && scen.steps[uiState.scenStep - 1] ? scen.steps[uiState.scenStep - 1] : null;
    const stepTitle = stepObj ? stepObj.title : "Trạng thái khởi đầu (Bước 0 — Trước khi chạy step 1)";
    const stepDesc = stepObj ? stepObj.explain : `Kịch bản <b>${escHtml(scen.title)}</b> đã sẵn sàng. Nhấn <b>Bước Tiếp ▶</b> hoặc thử các nút <b>Quick Actions / What-If</b> bên trái.`;

    const recentDet = simState.detFaults.slice(-3).reverse();
    const demFailedList = Object.entries(simState.demFaults).filter((kv) => kv[1] !== "NONE");

    const job = simState.activeJob;
    const ramSlice = Array.from(simState.ramBuffer.slice(0, 16)).map((b) => b.toString(16).toUpperCase().padStart(2, "0")).join(" ");

    body.innerHTML = `
      <div class="insp-card">
        <div class="insp-h">📍 ${escHtml(stepTitle)}</div>
        <div style="font-size:11.5px;line-height:1.55;color:var(--txt-soft)">${stepDesc}</div>
      </div>

      <div class="insp-card">
        <div class="insp-h">📊 Trạng Thái Eep Hiện Tại</div>
        <div style="font-size:11px;display:grid;grid-template-columns:1fr 1fr;gap:5px">
          <div><b>Status:</b> <span class="mono">${escHtml(simState.driverStatus)}</span></div>
          <div><b>JobResult:</b> <span class="mono">${escHtml(simState.jobResult)}</span></div>
          <div><b>Mode:</b> <span class="mono">${escHtml(simState.currentMode)}</span></div>
          <div><b>Callback:</b> <span class="mono">${escHtml(simState.lastCallbackCalled || "None")}</span></div>
          <div><b>Ea SubJob:</b> <span class="mono">${escHtml(simState.eaSubJobState)}</span></div>
          <div><b>ISR Count:</b> <span class="mono">${simState.hwInterruptCount}</span></div>
        </div>
        ${job ? `<div style="margin-top:6px;padding:5px;border-radius:5px;background:var(--warn-bg);font-size:10.5px" class="mono">Active ${job.type}: CurAddr=${fmtHex16(job.currentAddr)}, Rem=${job.remainingLen}B, Skip=${job.skippedBytes}B</div>` : ""}
      </div>

      <div class="insp-card">
        <div class="insp-h">🛡️ DET / Runtime &amp; DEM Event Monitor</div>
        ${recentDet.length === 0 && demFailedList.length === 0
          ? `<div style="font-size:11px;color:var(--ok)">✔ Chưa phát sinh lỗi DET / Runtime / DEM.</div>`
          : `${recentDet.map((d) => `<div style="font-size:10.5px;color:var(--err);margin-bottom:4px" class="mono">[${d.timeMs}ms] ${d.kind} ${d.errorName} (${d.errorId}) in ${d.apiName} — ${escHtml(d.detail)}</div>`).join("")}
             ${demFailedList.map((kv) => `<div style="font-size:10.5px;color:${kv[1] === "FAILED" ? "var(--err)" : "var(--ok)"}" class="mono">DEM ${kv[0]}: ${kv[1]}</div>`).join("")}`
        }
      </div>

      <div class="insp-card">
        <div class="insp-h">🧠 RAM DataBuffer Snapshot (16B đầu)</div>
        <div class="code-block mono" style="padding:6px;font-size:10.5px">${escHtml(ramSlice)}</div>
      </div>
    `;
  } else if (tab === 1) {
    const mod = MODULES_INFO[simState.selectedModuleId] || MODULES_INFO.MOD_EEP;
    const pills = Object.keys(MODULES_INFO).map((id) => {
      const shortLbl = id.replace("MOD_", "");
      return `<button class="mod-pill${id === mod.id ? " active" : ""}" onclick="selectModule('${id}')">${shortLbl}</button>`;
    }).join("");

    body.innerHTML = `
      <div class="mod-list">${pills}</div>
      <div class="insp-card">
        <div class="insp-h">${escHtml(mod.name)}</div>
        <div style="font-size:10.5px;color:var(--cyan);margin-bottom:5px" class="mono">Layer: ${escHtml(mod.layer)}</div>
        <div style="font-size:11.5px;line-height:1.5;margin-bottom:6px"><b>Vai trò:</b> ${escHtml(mod.role)}</div>
        <div style="font-size:11px;line-height:1.5;margin-bottom:5px;color:var(--ok)"><b>📥 Input từ đâu:</b> ${escHtml(mod.inputs)}</div>
        <div style="font-size:11px;line-height:1.5;margin-bottom:5px;color:var(--txt-soft)"><b>⚙️ Cách xử lý:</b> ${escHtml(mod.processing)}</div>
        <div style="font-size:11px;line-height:1.5;color:var(--warn)"><b>📤 Output đi đâu:</b> ${escHtml(mod.outputs)}</div>
      </div>
      <div class="insp-card">
        <div class="insp-h">🔌 Hàm &amp; Interface Chuẩn AUTOSAR</div>
        <pre class="code-block mono">${escHtml((mod.apis || []).join("\n"))}</pre>
      </div>
    `;
  } else if (tab === 2) {
    const key = simState.lastApiCodeKey || "Eep_Init";
    const snippet = EEP_C_SNIPPETS[key] || EEP_C_SNIPPETS.Eep_Init;
    const apiBtns = Object.keys(EEP_C_SNIPPETS).map((k) =>
      `<button class="mod-pill${k === key ? " active" : ""}" onclick="simState.lastApiCodeKey='${k}';renderInspector();">${k}</button>`
    ).join("");
    body.innerHTML = `
      <div class="mod-list">${apiBtns}</div>
      <div class="insp-card">
        <div class="insp-h">📄 AUTOSAR C API Call: ${escHtml(key)}</div>
        <pre class="code-block mono">${escHtml(snippet)}</pre>
      </div>
      <div class="insp-card">
        <div class="insp-h">⚙️ Live Eep_ConfigType Parameters</div>
        <pre class="code-block mono">${escHtml(`const Eep_ConfigType Eep_Config = {
  .defaultMode = ${ecucConfig.EepDefaultMode},
  .baseAddress = ${fmtHex16(getBaseAddressNum())}u,
  .size        = ${getEepSize()}u,
  .eraseValue  = ${fmtHex8(getEraseByte())}u,
  .normalRd/Wr = ${ecucConfig.EepNormalReadBlockSize}u / ${ecucConfig.EepNormalWriteBlockSize}u,
  .fastRd/Wr   = ${ecucConfig.EepFastReadBlockSize}u / ${ecucConfig.EepFastWriteBlockSize}u,
  .jobEndNotif = ${ecucConfig.EepJobEndNotificationEnabled ? ecucConfig.EepJobEndNotification : "NULL_PTR"},
  .jobErrNotif = ${ecucConfig.EepJobErrorNotificationEnabled ? ecucConfig.EepJobErrorNotification : "NULL_PTR"}
};`)}</pre>
      </div>
    `;
  } else {
    const items = simState.traceLogs.slice().reverse();
    body.innerHTML = items.length === 0
      ? `<div class="insp-card">Chưa có bản ghi API Trace. Hãy nhấn Bước Tiếp hoặc nút Quick Action!</div>`
      : items.map((t) => `<div class="trace-item ${escHtml(t.tone)}">
          <div style="display:flex;justify-content:space-between;font-weight:700;margin-bottom:2px">
            <span class="mono" style="color:var(--pri)">[${t.timeMs}ms] ${escHtml(t.caller)} → ${escHtml(t.callee)}</span>
            <span class="mono">${escHtml(t.ret)} · ${escHtml(t.result)}</span>
          </div>
          <div class="mono" style="font-size:10.5px;color:var(--txt)">${escHtml(t.api)}</div>
          ${t.params ? `<div class="mono" style="font-size:10px;color:var(--cyan)">${escHtml(t.params)}</div>` : ""}
          ${t.note ? `<div style="font-size:10.5px;color:var(--mut);margin-top:2px">${escHtml(t.note)}</div>` : ""}
        </div>`).join("");
  }
}

function renderAll() {
  renderHeaderAndStepper();
  renderScenarioPanel();
  renderChunkBanner();
  renderEepHexMap();
  render8BitRegisters();
  renderHwBarsAndStateMachines();
  renderSvgArchitecture();
  renderInspector();
}

// -------------------- EXPORT MODAL & STANDALONE HTML DOWNLOAD --------------------
function generateArxmlExport() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<AUTOSAR xmlns="http://autosar.org/schema/r4.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <AR-PACKAGES>
    <AR-PACKAGE>
      <SHORT-NAME>EcuConfig</SHORT-NAME>
      <ELEMENTS>
        <ECUC-MODULE-CONFIGURATION-VALUES>
          <SHORT-NAME>Eep</SHORT-NAME>
          <DEFINITION-REF DEST="ECUC-MODULE-DEF">/AUTOSAR/EcucDefs/Eep</DEFINITION-REF>
          <CONTAINERS>
            <ECUC-CONTAINER-VALUE>
              <SHORT-NAME>EepGeneral</SHORT-NAME>
              <PARAMETER-VALUES>
                <ECUC-BOOLEAN-PARAM-VALUE><DEFINITION-REF DEST="ECUC-BOOLEAN-PARAM-DEF">/AUTOSAR/EcucDefs/Eep/EepGeneral/EepDevErrorDetect</DEFINITION-REF><VALUE>${ecucConfig.EepDevErrorDetect}</VALUE></ECUC-BOOLEAN-PARAM-VALUE>
                <ECUC-BOOLEAN-PARAM-VALUE><DEFINITION-REF DEST="ECUC-BOOLEAN-PARAM-DEF">/AUTOSAR/EcucDefs/Eep/EepGeneral/EepVersionInfoApi</DEFINITION-REF><VALUE>${ecucConfig.EepVersionInfoApi}</VALUE></ECUC-BOOLEAN-PARAM-VALUE>
                <ECUC-BOOLEAN-PARAM-VALUE><DEFINITION-REF DEST="ECUC-BOOLEAN-PARAM-DEF">/AUTOSAR/EcucDefs/Eep/EepGeneral/EepUseInterrupts</DEFINITION-REF><VALUE>${ecucConfig.EepUseInterrupts}</VALUE></ECUC-BOOLEAN-PARAM-VALUE>
                <ECUC-BOOLEAN-PARAM-VALUE><DEFINITION-REF DEST="ECUC-BOOLEAN-PARAM-DEF">/AUTOSAR/EcucDefs/Eep/EepGeneral/EepWriteCycleReduction</DEFINITION-REF><VALUE>${ecucConfig.EepWriteCycleReduction}</VALUE></ECUC-BOOLEAN-PARAM-VALUE>
                <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-INTEGER-PARAM-DEF">/AUTOSAR/EcucDefs/Eep/EepGeneral/EepDriverIndex</DEFINITION-REF><VALUE>${ecucConfig.EepDriverIndex}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
              </PARAMETER-VALUES>
            </ECUC-CONTAINER-VALUE>
            <ECUC-CONTAINER-VALUE>
              <SHORT-NAME>EepInitConfiguration</SHORT-NAME>
              <PARAMETER-VALUES>
                <ECUC-TEXTUAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-ENUMERATION-PARAM-DEF">/AUTOSAR/EcucDefs/Eep/EepInitConfiguration/EepDefaultMode</DEFINITION-REF><VALUE>${ecucConfig.EepDefaultMode}</VALUE></ECUC-TEXTUAL-PARAM-VALUE>
                <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-INTEGER-PARAM-DEF">/AUTOSAR/EcucDefs/Eep/EepInitConfiguration/EepBaseAddress</DEFINITION-REF><VALUE>${getBaseAddressNum()}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
                <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-INTEGER-PARAM-DEF">/AUTOSAR/EcucDefs/Eep/EepInitConfiguration/EepSize</DEFINITION-REF><VALUE>${getEepSize()}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
                <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-INTEGER-PARAM-DEF">/AUTOSAR/EcucDefs/Eep/EepInitConfiguration/EepNormalReadBlockSize</DEFINITION-REF><VALUE>${ecucConfig.EepNormalReadBlockSize}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
                <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-INTEGER-PARAM-DEF">/AUTOSAR/EcucDefs/Eep/EepInitConfiguration/EepNormalWriteBlockSize</DEFINITION-REF><VALUE>${ecucConfig.EepNormalWriteBlockSize}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
                <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-INTEGER-PARAM-DEF">/AUTOSAR/EcucDefs/Eep/EepInitConfiguration/EepFastReadBlockSize</DEFINITION-REF><VALUE>${ecucConfig.EepFastReadBlockSize}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
                <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-INTEGER-PARAM-DEF">/AUTOSAR/EcucDefs/Eep/EepInitConfiguration/EepFastWriteBlockSize</DEFINITION-REF><VALUE>${ecucConfig.EepFastWriteBlockSize}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
              </PARAMETER-VALUES>
            </ECUC-CONTAINER-VALUE>
          </CONTAINERS>
        </ECUC-MODULE-CONFIGURATION-VALUES>
      </ELEMENTS>
    </AR-PACKAGE>
  </AR-PACKAGES>
</AUTOSAR>`;
}

function generateCfgHeaderExport() {
  return `#ifndef EEP_CFG_H
#define EEP_CFG_H
/* Generated by AUTOSAR Eep Simulator (AUTOSAR Classic R23-11, ModuleId = 90) */

#define EEP_MODULE_ID                   (90u)
#define EEP_DEV_ERROR_DETECT            (${ecucConfig.EepDevErrorDetect ? "STD_ON" : "STD_OFF"})
#define EEP_VERSION_INFO_API            (${ecucConfig.EepVersionInfoApi ? "STD_ON" : "STD_OFF"})
#define EEP_USE_INTERRUPTS              (${ecucConfig.EepUseInterrupts ? "STD_ON" : "STD_OFF"})
#define EEP_WRITE_CYCLE_REDUCTION       (${ecucConfig.EepWriteCycleReduction ? "STD_ON" : "STD_OFF"})
#define EEP_DRIVER_INDEX                (${ecucConfig.EepDriverIndex}u)
#define EEP_JOB_CALL_CYCLE_MS           (${ecucConfig.EepJobCallCycle}u)

#define EEP_BASE_ADDRESS                (${fmtHex16(getBaseAddressNum())}u)
#define EEP_SIZE                        (${getEepSize()}u)
#define EEP_TOTAL_SIZE                  (${ecucConfig.EepTotalSize}u)
#define EEP_ERASE_VALUE                 (${fmtHex8(getEraseByte())}u)
#define EEP_READ_UNIT_SIZE              (${ecucConfig.EepReadUnitSize}u)
#define EEP_WRITE_UNIT_SIZE             (${ecucConfig.EepWriteUnitSize}u)
#define EEP_ERASE_UNIT_SIZE             (${ecucConfig.EepEraseUnitSize}u)
#define EEP_ALLOWED_WRITE_CYCLES        (${ecucConfig.EepAllowedWriteCycles}uL)
#define EEP_HW_INTERFACE_EXT_SPI        (${ecucConfig.EepHardwareInterfaceType === "EXTERNAL_SPI_EEPROM" ? "STD_ON" : "STD_OFF"})
#define EEP_DEM_ERROR_REPORTING         (${ecucConfig.EepDemErrorReportingEnabled ? "STD_ON" : "STD_OFF"})

#endif /* EEP_CFG_H */`;
}

function generatePBcfgCExport() {
  return `/* Eep_PBcfg.c — AUTOSAR Classic R23-11 Post-Build Configuration */
#include "Eep.h"
#include "Ea_Cbk.h"

const Eep_ConfigType Eep_Config = {
  .jobEndNotification   = ${ecucConfig.EepJobEndNotificationEnabled ? ecucConfig.EepJobEndNotification : "NULL_PTR"},
  .jobErrorNotification = ${ecucConfig.EepJobErrorNotificationEnabled ? ecucConfig.EepJobErrorNotification : "NULL_PTR"},
  .defaultMode          = ${ecucConfig.EepDefaultMode},
  .normalReadBlockSize  = ${ecucConfig.EepNormalReadBlockSize}u,
  .normalWriteBlockSize = ${ecucConfig.EepNormalWriteBlockSize}u,
  .fastReadBlockSize    = ${ecucConfig.EepFastReadBlockSize}u,
  .fastWriteBlockSize   = ${ecucConfig.EepFastWriteBlockSize}u,
  .spiSequenceId        = ${ecucConfig.EepSpiSequenceId}u
};`;
}

function generateJsonConfigExport() {
  return JSON.stringify({
    module: "Eep",
    moduleId: EEP_MODULE_ID,
    autosarRelease: "R23-11",
    ecucParametersCount: Object.keys(ecucConfig).length,
    ecucConfig: ecucConfig,
    runtimeSnapshot: {
      timeMs: simState.timeMs,
      driverStatus: simState.driverStatus,
      jobResult: simState.jobResult,
      currentMode: simState.currentMode,
      regAByte: fmtHex8(simState.regAByte),
      regBByte: fmtHex8(simState.regBByte)
    }
  }, null, 2);
}

const EXPORT_FILES = [
  { name: "Eep.arxml", gen: generateArxmlExport },
  { name: "Eep_Cfg.h", gen: generateCfgHeaderExport },
  { name: "Eep_PBcfg.c", gen: generatePBcfgCExport },
  { name: "Eep_Config.json", gen: generateJsonConfigExport }
];

function openExportModal() {
  const modal = document.getElementById("exportModal");
  if (!modal) return;
  modal.classList.remove("hidden");
  switchExportTab(uiState.exportTabIdx || 0);
}

function closeExportModal() {
  const modal = document.getElementById("exportModal");
  if (modal) modal.classList.add("hidden");
}

function onExportModalBackdrop(ev) {
  if (ev && ev.target && ev.target.id === "exportModal") {
    closeExportModal();
  }
}

function switchExportTab(idx) {
  uiState.exportTabIdx = idx;
  for (let i = 0; i < EXPORT_FILES.length; i++) {
    const b = document.getElementById("expTab" + i);
    if (b) b.className = i === idx ? "btn btn-sm btn-pri" : "btn btn-sm";
  }
  const area = document.getElementById("exportCodeArea");
  if (area && EXPORT_FILES[idx]) {
    area.textContent = EXPORT_FILES[idx].gen();
  }
}

function copyExportCode() {
  const area = document.getElementById("exportCodeArea");
  if (!area) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(area.textContent).catch(() => {});
  }
}

function downloadExportCode() {
  const area = document.getElementById("exportCodeArea");
  const f = EXPORT_FILES[uiState.exportTabIdx || 0];
  if (!area || !f) return;
  const blob = new Blob([area.textContent], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = f.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(a.href), 500);
}

function downloadStandaloneHTML() {
  closeExportModal();
  hideConfigTooltip();
  document.body.setAttribute("data-saved-cfg", JSON.stringify(ecucConfig));
  const fullHtml = "<!DOCTYPE html>\n" + document.documentElement.outerHTML;
  document.body.removeAttribute("data-saved-cfg");

  const blob = new Blob([fullHtml], { type: "text/html;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "AUTOSAR_Eep_Configured.html";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(a.href), 500);
}
