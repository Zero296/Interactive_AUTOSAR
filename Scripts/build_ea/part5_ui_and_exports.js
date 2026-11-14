// ================= PART 5: UI CONTROLLER, RENDERERS, TOOLTIPS & EXPORTS =================

const uiState = {
  view: "sim",
  scenId: "S1",
  stepIdx: -1,
  autoPlayTimer: null,
  autoClockTimer: null,
  activeCfgTab: 0,
  activeInspTab: 0,
  selectedModuleId: "MOD_EA",
  exportTab: 0,
  stepSnapshots: []
};

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getToneBadgeClass(tone, prefix) {
  const p = prefix || "sb-";
  if (tone === "ok") return p + "ok";
  if (tone === "warn") return p + "warn";
  if (tone === "err") return p + "err";
  if (tone === "pur") return p + "pur";
  if (tone === "cyan") return p + "cyan";
  if (tone === "pri") return p + "pri";
  return p + "idle";
}

function getSlotStatusTone(status) {
  if (status === "VALID") return "ok";
  if (status === "INCONSISTENT") return "err";
  if (status === "INVALID") return "warn";
  if (status === "PRE_ERASED") return "pur";
  return "idle";
}

// -------------------- SCENARIO & STEPPER CONTROLS --------------------

function getCurrentScenario() {
  return SCENARIOS.find((s) => s.id === uiState.scenId) || SCENARIOS[0];
}

function loadScenario(id) {
  if (uiState.autoPlayTimer) {
    clearInterval(uiState.autoPlayTimer);
    uiState.autoPlayTimer = null;
    const ab = document.getElementById("btnAutoPlay");
    if (ab) ab.textContent = "▶ Auto";
  }

  const sc = SCENARIOS.find((s) => s.id === id) || SCENARIOS[0];
  uiState.scenId = sc.id;
  uiState.stepIdx = -1;
  uiState.stepSnapshots = [];

  const sel = document.getElementById("scenSelect");
  if (sel && sel.value !== sc.id) sel.value = sc.id;

  window.__suppressEngineRender = true;
  try {
    sc.setup();
    const curEntry = getSelectedEntry();
    if (curEntry) syncQaInputsForEntry(curEntry);
  } finally {
    window.__suppressEngineRender = false;
  }

  syncConfigToDOM();
  renderAll();
}

function onScenarioSelectChange() {
  const sel = document.getElementById("scenSelect");
  if (sel) loadScenario(sel.value);
}

function resetCurrentScenario() {
  loadScenario(uiState.scenId);
}

function nextScenarioStep() {
  const sc = getCurrentScenario();
  if (!sc || !sc.steps) return;
  if (uiState.stepIdx >= sc.steps.length - 1) {
    if (uiState.autoPlayTimer) toggleScenarioAutoPlay();
    return;
  }

  const qaOff = document.getElementById("qaOffsetInput");
  const qaLen = document.getElementById("qaLengthInput");
  const qaHex = document.getElementById("qaHexInput");
  uiState.stepSnapshots.push({
    stepIdx: uiState.stepIdx,
    simState: cloneObj(simState),
    ecucConfig: cloneObj(ecucConfig),
    qaOff: qaOff ? qaOff.value : "0",
    qaLen: qaLen ? qaLen.value : "12",
    qaHex: qaHex ? qaHex.value : "55 AA 12 34 00 FF"
  });

  uiState.stepIdx++;
  const step = sc.steps[uiState.stepIdx];

  window.__suppressEngineRender = true;
  try {
    step.exec();
  } finally {
    window.__suppressEngineRender = false;
  }

  syncConfigToDOM();
  renderAll();
}

function prevScenarioStep() {
  if (uiState.stepSnapshots.length === 0) return;
  const snap = uiState.stepSnapshots.pop();
  uiState.stepIdx = snap.stepIdx;
  simState = cloneObj(snap.simState);
  ecucConfig = cloneObj(snap.ecucConfig);

  const qaOff = document.getElementById("qaOffsetInput");
  const qaLen = document.getElementById("qaLengthInput");
  const qaHex = document.getElementById("qaHexInput");
  if (qaOff) qaOff.value = snap.qaOff;
  if (qaLen) qaLen.value = snap.qaLen;
  if (qaHex) qaHex.value = snap.qaHex;

  syncConfigToDOM();
  renderAll();
}

function toggleScenarioAutoPlay() {
  const btn = document.getElementById("btnAutoPlay");
  if (uiState.autoPlayTimer) {
    clearInterval(uiState.autoPlayTimer);
    uiState.autoPlayTimer = null;
    if (btn) btn.textContent = "▶ Auto";
    return;
  }
  if (btn) btn.textContent = "⏸ Dừng";
  const sc = getCurrentScenario();
  if (uiState.stepIdx >= sc.steps.length - 1) {
    loadScenario(sc.id);
  }
  uiState.autoPlayTimer = setInterval(() => {
    const cur = getCurrentScenario();
    if (uiState.stepIdx >= cur.steps.length - 1) {
      toggleScenarioAutoPlay();
    } else {
      nextScenarioStep();
    }
  }, 1350);
}

function runWhatIf(idx) {
  const sc = getCurrentScenario();
  if (!sc || !sc.whatIfs || !sc.whatIfs[idx]) return;

  window.__suppressEngineRender = true;
  try {
    sc.whatIfs[idx].run();
  } finally {
    window.__suppressEngineRender = false;
  }

  syncConfigToDOM();
  renderAll();
}

function toggleAutoClock() {
  const btn = document.getElementById("btnAutoClock");
  if (uiState.autoClockTimer) {
    clearInterval(uiState.autoClockTimer);
    uiState.autoClockTimer = null;
    if (btn) {
      btn.textContent = "Auto Clock";
      btn.classList.remove("active-pri");
    }
    return;
  }
  if (btn) {
    btn.textContent = "⏸ Dừng Clock";
    btn.classList.add("active-pri");
  }
  uiState.autoClockTimer = setInterval(() => {
    stepClockTick();
  }, 850);
}

// -------------------- QUICK ACTION BAR HANDLERS --------------------

function syncQaInputsForEntry(entry) {
  if (!entry) return;
  const qaSel = document.getElementById("qaBlockSelect");
  const qaOff = document.getElementById("qaOffsetInput");
  const qaLen = document.getElementById("qaLengthInput");
  const qaHex = document.getElementById("qaHexInput");
  if (qaSel && qaSel.value !== entry.id) qaSel.value = entry.id;
  if (qaOff) qaOff.value = "0";
  if (qaLen) qaLen.value = String(entry.size);
  if (qaHex) {
    const samples = [];
    for (let i = 0; i < Math.min(entry.size, 8); i++) {
      samples.push(fmtByte((entry.blockNumber * 13 + i * 0x17 + 0xA1) & 0xFF));
    }
    qaHex.value = samples.join(" ");
  }
}

function onQaBlockSelectChange() {
  const qaSel = document.getElementById("qaBlockSelect");
  if (!qaSel) return;
  simState.selectedEntryId = qaSel.value;
  const entry = getSelectedEntry();
  if (entry) {
    syncQaInputsForEntry(entry);
    simState.stepExplain = "Đã chọn " + entry.name + " (BlockNumber=" + entry.blockNumber + " · Size=" + entry.size + "B → Aligned Slot=" + entry.slotSize + "B).";
  }
  updateDerivedRegisters();
  renderAll();
}

function selectEntryRow(entryId) {
  simState.selectedEntryId = entryId;
  const entry = getSelectedEntry();
  if (entry) {
    syncQaInputsForEntry(entry);
    simState.stepExplain = "Đang inspect " + entry.name + " (Block #" + entry.blockNumber + " · Physical Slot #" + (simState.activeSlotByEntry[entry.id] || 0) + ").";
  }
  updateDerivedRegisters();
  renderAll();
}

function qaEaWrite() {
  const entry = getSelectedEntry();
  if (!entry) return;
  const qaHex = document.getElementById("qaHexInput");
  const hexVal = qaHex ? qaHex.value : "AA BB CC DD";
  api_Ea_Write(entry.blockNumber, hexVal, ecucConfig.TestInvalidParamMode === "NULL_PTR");
  syncConfigToDOM();
  renderAll();
}

function qaEaRead() {
  const entry = getSelectedEntry();
  if (!entry) return;
  const qaOff = document.getElementById("qaOffsetInput");
  const qaLen = document.getElementById("qaLengthInput");
  const off = Math.max(0, Number(qaOff ? qaOff.value : 0) || 0);
  const len = Math.max(0, Number(qaLen ? qaLen.value : entry.size));
  api_Ea_Read(entry.blockNumber, off, len, ecucConfig.TestInvalidParamMode === "NULL_PTR");
  syncConfigToDOM();
  renderAll();
}

function qaEaInvalidate() {
  const entry = getSelectedEntry();
  if (!entry) return;
  api_Ea_InvalidateBlock(entry.blockNumber);
  syncConfigToDOM();
  renderAll();
}

function qaEaEraseImmediate() {
  const entry = getSelectedEntry();
  if (!entry) return;
  api_Ea_EraseImmediateBlock(entry.blockNumber);
  syncConfigToDOM();
  renderAll();
}

function qaTogglePowerLoss() {
  ecucConfig.SimulatePowerLossMidWrite = !ecucConfig.SimulatePowerLossMidWrite;
  addTrace(
    "Fault Toggle: SimulatePowerLossMidWrite = " + (ecucConfig.SimulatePowerLossMidWrite ? "TRUE" : "FALSE"),
    ecucConfig.SimulatePowerLossMidWrite
      ? "Chế độ mất nguồn giữa chừng ĐÃ BẬT — lần Ea_Write() tiếp theo sẽ bỏ dở Footer!"
      : "Đã tắt mô phỏng mất nguồn giữa chừng.",
    ecucConfig.SimulatePowerLossMidWrite ? "err" : "ok"
  );
  simState.stepExplain = ecucConfig.SimulatePowerLossMidWrite
    ? "Power-Loss Mid-Write ĐANG BẬT: Ea_Write() kế tiếp sẽ ngắt giữa WRITE_DATA và để Footer = 0xFFFF!"
    : "Đã tắt giả lập mất nguồn giữa chừng.";
  updateDerivedRegisters();
  syncConfigToDOM();
  renderAll();
}

function qaCancelOrSetMode() {
  if (simState.moduleStatus === "MEMIF_BUSY" && simState.activeJob) {
    api_Ea_Cancel();
  } else {
    const nextMode = simState.memIfMode === "MEMIF_MODE_FAST" ? "MEMIF_MODE_SLOW" : "MEMIF_MODE_FAST";
    api_Ea_SetMode(nextMode);
  }
  syncConfigToDOM();
  renderAll();
}

function qaResetEaInit() {
  api_Ea_Init(true);
  syncConfigToDOM();
  renderAll();
}

function onEepromCellClick(entryId, slotIdx, part) {
  corruptOrToggleSlotByte(entryId, slotIdx, part);
  syncConfigToDOM();
  renderAll();
}

// -------------------- VIEW, THEME & ECUC CONFIG SYNC --------------------

function switchMainView(v) {
  uiState.view = v;
  const vSim = document.getElementById("viewSim");
  const vHb = document.getElementById("viewHb");
  const bSim = document.getElementById("btnViewSim");
  const bHb = document.getElementById("btnViewHb");
  if (v === "sim") {
    if (vSim) vSim.classList.remove("hidden");
    if (vHb) vHb.classList.add("hidden");
    if (bSim) bSim.classList.add("active");
    if (bHb) bHb.classList.remove("active");
  } else {
    if (vSim) vSim.classList.add("hidden");
    if (vHb) vHb.classList.remove("hidden");
    if (bSim) bSim.classList.remove("active");
    if (bHb) bHb.classList.add("active");
    if (typeof renderCurrentHandbookView === "function") renderCurrentHandbookView();
  }
}

function toggleTheme() {
  const html = document.documentElement;
  const cur = html.getAttribute("data-theme") || "dark";
  const next = cur === "dark" ? "light" : "dark";
  html.setAttribute("data-theme", next);
  const btn = document.getElementById("btnTheme");
  if (btn) btn.textContent = next === "dark" ? "☀️ Sáng" : "🌙 Tối";
}

function switchCfgTab(idx) {
  uiState.activeCfgTab = idx;
  for (let i = 0; i < 6; i++) {
    const b = document.getElementById("cfgTabBtn" + i);
    const p = document.getElementById("cfgPane" + i);
    if (b) b.classList.toggle("active", i === idx);
    if (p) p.classList.toggle("active", i === idx);
  }
}

function switchInspTab(idx) {
  uiState.activeInspTab = idx;
  for (let i = 0; i < 4; i++) {
    const b = document.getElementById("inspTabBtn" + i);
    if (b) b.classList.toggle("active", i === idx);
  }
  renderInspector();
}

function selectModule(modId) {
  uiState.selectedModuleId = modId;
  uiState.activeInspTab = 1; // Jump to Module I/O tab on click
  for (let i = 0; i < 4; i++) {
    const b = document.getElementById("inspTabBtn" + i);
    if (b) b.classList.toggle("active", i === 1);
  }
  renderSvgArchitecture();
  renderInspector();
}

function syncConfigToDOM() {
  Object.keys(ecucConfig).forEach((key) => {
    const el = document.getElementById("cfg_" + key);
    if (!el) return;
    if (el.type === "checkbox") {
      el.checked = Boolean(ecucConfig[key]);
    } else {
      el.value = String(ecucConfig[key]);
    }
  });

  // Keep Quick Action block dropdown synchronized with configured block numbers & sizes
  const qaSel = document.getElementById("qaBlockSelect");
  if (qaSel && simState.blockLayouts) {
    const opts = qaSel.options;
    const mapById = {};
    simState.blockLayouts.forEach((b) => { mapById[b.id] = b; });
    for (let i = 0; i < opts.length; i++) {
      const b = mapById[opts[i].value];
      if (b) {
        let extra = "";
        if (b.id === "BLK1" || b.id === "BLK4") extra = b.immediate ? " · IMM" : "";
        if (b.id === "BLK2_0" || b.id === "BLK2_1") extra = " · Dataset[" + b.datasetIdx + "]";
        if (b.id === "BLK3") extra = " · Wear " + b.numSlots + "x";
        opts[i].textContent = "Blk #" + b.blockNumber + " · " + b.name + " (" + b.size + "B" + extra + ")";
      }
    }
    if (qaSel.value !== simState.selectedEntryId) qaSel.value = simState.selectedEntryId;
  }

  // Update Quick Action toggle labels
  const btnFault = document.getElementById("qaBtnFaultToggle");
  const txtFault = document.getElementById("qaTxtFault");
  if (btnFault && txtFault) {
    txtFault.textContent = ecucConfig.SimulatePowerLossMidWrite ? "BẬT" : "Tắt";
    btnFault.classList.toggle("qa-active", Boolean(ecucConfig.SimulatePowerLossMidWrite));
  }

  const txtMode = document.getElementById("qaTxtMode");
  const txtCancelLbl = document.getElementById("qaTxtCancelLbl");
  if (txtCancelLbl && txtMode) {
    if (simState.moduleStatus === "MEMIF_BUSY" && simState.activeJob) {
      txtCancelLbl.textContent = "Ea_Cancel()";
      txtMode.textContent = "Hủy Job";
    } else {
      txtCancelLbl.textContent = "SetMode";
      txtMode.textContent = simState.memIfMode === "MEMIF_MODE_FAST" ? "FAST" : "SLOW";
    }
  }
}

function onConfigInputChanged(key) {
  const el = document.getElementById("cfg_" + key);
  if (!el) return;

  let val;
  if (el.type === "checkbox") {
    val = el.checked;
  } else if (el.type === "number") {
    val = Number(el.value);
  } else {
    val = el.value;
  }
  ecucConfig[key] = val;

  if (key === "EaInitialized") {
    simState.initialized = Boolean(val);
    simState.moduleStatus = simState.initialized ? "MEMIF_IDLE" : "MEMIF_UNINIT";
  } else if (key === "CurrentMemIfMode") {
    simState.memIfMode = String(val);
  } else if (key === "Blk2_SelectedDatasetIndex") {
    simState.selectedEntryId = Number(val) === 1 ? "BLK2_1" : "BLK2_0";
  }

  const layoutKeys = [
    "EaVirtualPageSize", "EaBlockOverhead", "EaPageOverhead",
    "EepAllowedWriteCycles", "EepBaseAddress",
    "Blk1_BlockNumber", "Blk1_BlockSize", "Blk1_ImmediateData",
    "Blk2_BaseBlockNumber", "Blk2_BlockSize",
    "Blk3_BlockNumber", "Blk3_BlockSize", "Blk3_NumberOfWriteCycles",
    "Blk4_BlockNumber", "Blk4_BlockSize", "Blk4_ImmediateData"
  ];
  if (layoutKeys.indexOf(key) !== -1) {
    recomputeMemoryLayout(true);
    const cur = getSelectedEntry();
    if (cur) syncQaInputsForEntry(cur);
  }

  addTrace("ECUC Config Changed: " + key + " = " + String(val), "Cập nhật tham số ECUC theo thời gian thực.", "info");
  simState.stepExplain = "Đã thay đổi tham số ECUC [" + key + "] = " + String(val) + " và cập nhật lại Memory Map / Thanh ghi.";
  updateDerivedRegisters();
  syncConfigToDOM();
  renderAll();
}

// -------------------- FLOATING CONFIG TOOLTIP (>1050ms HOVER) --------------------

let tooltipHoverTimer = null;
let tooltipActiveEl = null;

function showConfigTooltip(key, targetEl) {
  const popup = document.getElementById("cfgTooltipPopup");
  const data = configTooltipData[key];
  if (!popup || !data || !targetEl) return;

  popup.innerHTML =
    `<div class="tt-hdr"><div class="tt-title">${escapeHtml(data.title)}</div><div class="tt-meta">${escapeHtml(data.sws)} · ${escapeHtml(data.type)}</div></div>` +
    `<div class="tt-sec"><b>Là gì:</b> ${escapeHtml(data.what)}</div>` +
    `<div class="tt-sec"><b>Tại sao cần:</b> ${escapeHtml(data.why)}</div>` +
    `<div class="tt-sec"><b>Tác động trực tiếp trong Simulator:</b> ${escapeHtml(data.impact)}</div>`;

  popup.classList.add("show");

  const rect = targetEl.getBoundingClientRect();
  const pw = popup.offsetWidth || 350;
  const ph = popup.offsetHeight || 220;
  let left = rect.right + 10;
  if (left + pw > window.innerWidth - 12) {
    left = Math.max(12, rect.left - pw - 10);
  }
  if (left + pw > window.innerWidth - 12) {
    left = Math.max(12, Math.min(rect.left, window.innerWidth - pw - 12));
  }
  let top = rect.top - 8;
  if (top + ph > window.innerHeight - 12) {
    top = Math.max(12, window.innerHeight - ph - 12);
  }
  popup.style.left = left + "px";
  popup.style.top = top + "px";
}

function hideConfigTooltip() {
  if (tooltipHoverTimer) {
    clearTimeout(tooltipHoverTimer);
    tooltipHoverTimer = null;
  }
  tooltipActiveEl = null;
  const popup = document.getElementById("cfgTooltipPopup");
  if (popup) popup.classList.remove("show");
}

function initTooltipHandlers() {
  document.addEventListener("mouseover", (e) => {
    const row = e.target.closest ? e.target.closest(".cfg-row[data-cfg-key]") : null;
    if (!row) return;
    if (tooltipActiveEl === row) return;
    hideConfigTooltip();
    tooltipActiveEl = row;
    const key = row.getAttribute("data-cfg-key");
    tooltipHoverTimer = setTimeout(() => {
      if (tooltipActiveEl === row) showConfigTooltip(key, row);
    }, 1050);
  });

  document.addEventListener("mouseout", (e) => {
    if (!tooltipActiveEl) return;
    const related = e.relatedTarget;
    if (!related || !tooltipActiveEl.contains(related)) {
      hideConfigTooltip();
    }
  });

  document.addEventListener("scroll", hideConfigTooltip, true);
}

// -------------------- MASTER RENDER PIPELINE --------------------

function renderAll() {
  renderHeaderAndStepper();
  renderScenarioBox();
  renderConfigValidation();
  renderLogicalBlocksAndEepMap();
  render8BitRegisters();
  renderSubJobAndStateMachines();
  renderSvgArchitecture();
  renderInspector();
}

function renderHeaderAndStepper() {
  const sc = getCurrentScenario();
  const total = sc && sc.steps ? sc.steps.length : 0;
  const stepInd = document.getElementById("stepIndicator");
  if (stepInd) {
    stepInd.textContent = "Step " + (uiState.stepIdx + 1) + "/" + total;
  }
  const btnPrev = document.getElementById("btnPrevStep");
  const btnNext = document.getElementById("btnNextStep");
  if (btnPrev) btnPrev.disabled = uiState.stepSnapshots.length === 0;
  if (btnNext) btnNext.disabled = uiState.stepIdx >= total - 1;

  const clk = document.getElementById("clockVal");
  if (clk) clk.textContent = simState.clockMs + " ms";

  const stBadge = document.getElementById("hdrBadgeStatus");
  if (stBadge) {
    stBadge.textContent = simState.moduleStatus;
    const cls = simState.moduleStatus === "MEMIF_IDLE" ? "sb-ok" :
                simState.moduleStatus === "MEMIF_BUSY" ? "sb-warn" :
                simState.moduleStatus === "MEMIF_BUSY_INTERNAL" ? "sb-pur" : "sb-err";
    stBadge.className = "state-badge " + cls;
  }

  const resBadge = document.getElementById("hdrBadgeResult");
  if (resBadge) {
    resBadge.textContent = simState.jobResult;
    const cls = simState.jobResult === "MEMIF_JOB_OK" ? "sb-ok" :
                simState.jobResult === "MEMIF_JOB_PENDING" ? "sb-warn" :
                (simState.jobResult === "MEMIF_BLOCK_INVALID" || simState.jobResult === "MEMIF_JOB_CANCELED") ? "sb-pur" :
                simState.jobResult === "MEMIF_JOB_FAILED" || simState.jobResult === "MEMIF_BLOCK_INCONSISTENT" ? "sb-err" : "sb-idle";
    resBadge.className = "state-badge " + cls;
  }

  const modeBadge = document.getElementById("hdrBadgeMode");
  if (modeBadge) {
    modeBadge.textContent = simState.memIfMode === "MEMIF_MODE_FAST" ? "FAST" : "SLOW";
    modeBadge.className = "state-badge " + (simState.memIfMode === "MEMIF_MODE_FAST" ? "sb-cyan" : "sb-idle");
  }

  const blkBadge = document.getElementById("hdrBadgeBlk");
  const cur = getSelectedEntry();
  if (blkBadge && cur) {
    const sIdx = simState.activeSlotByEntry[cur.id] || 0;
    blkBadge.textContent = "Blk #" + cur.blockNumber + " (Slot#" + sIdx + ")";
  }
}

function renderScenarioBox() {
  const sc = getCurrentScenario();
  if (!sc) return;
  const badge = document.getElementById("scenIdBadge");
  if (badge) badge.textContent = sc.id;

  const box = document.getElementById("scenSummaryBox");
  if (box) {
    let curStepHtml = "";
    if (uiState.stepIdx >= 0 && sc.steps[uiState.stepIdx]) {
      const st = sc.steps[uiState.stepIdx];
      curStepHtml = `<div style="margin-top:6px;padding-top:6px;border-top:1px dashed var(--bd)"><b>Bước ${uiState.stepIdx + 1}/${sc.steps.length}: ${escapeHtml(st.title)}</b><br>${escapeHtml(st.desc)}</div>`;
    }
    box.innerHTML = `<div>${escapeHtml(sc.summary)}</div>${curStepHtml}`;
  }

  const wiBox = document.getElementById("whatIfContainer");
  if (wiBox && sc.whatIfs) {
    wiBox.innerHTML = sc.whatIfs.map((w, idx) =>
      `<button class="whatif-btn" onclick="runWhatIf(${idx})">⚡ ${escapeHtml(w.label)}</button>`
    ).join("");
  }
}

function renderConfigValidation() {
  const box = document.getElementById("cfgValidationBox");
  if (!box) return;
  const alerts = [];

  if (!ecucConfig.EaInitialized) {
    alerts.push("EaInitialized=FALSE → Mọi lệnh Read/Write/Invalidate/Erase sẽ kích hoạt DET EA_E_UNINIT (0x01).");
  }
  if (Number(ecucConfig.EaBlockOverhead) < 4) {
    alerts.push("Cảnh báo SWS_Ea: EaBlockOverhead (" + ecucConfig.EaBlockOverhead + "B) < 4B không đủ 2B Header + 2B Footer!");
  }
  if (ecucConfig.SimulatePowerLossMidWrite) {
    alerts.push("Fault Injection ĐANG BẬT: SimulatePowerLossMidWrite=TRUE sẽ cắt ngang quá trình ghi trước bước Footer 0x5A.");
  }
  if (ecucConfig.InjectEepHardwareError) {
    alerts.push("Fault Injection ĐANG BẬT: InjectEepHardwareError=TRUE sẽ khiến Eep Driver báo lỗi phần cứng (DEM).");
  }
  if (ecucConfig.TestInvalidParamMode && ecucConfig.TestInvalidParamMode !== "NONE") {
    alerts.push("Fault Injection ĐANG BẬT: TestInvalidParamMode=" + ecucConfig.TestInvalidParamMode + " kích hoạt test lỗi DET.");
  }
  if (simState.blockLayouts) {
    const seen = {};
    simState.blockLayouts.forEach((b) => {
      if (seen[b.blockNumber]) {
        alerts.push("Xung đột cấu hình: BlockNumber #" + b.blockNumber + " bị trùng giữa [" + seen[b.blockNumber] + "] và [" + b.name + "]!");
      }
      seen[b.blockNumber] = b.name;
    });
  }

  if (alerts.length === 0) {
    box.innerHTML = "";
    return;
  }
  box.innerHTML = alerts.slice(0, 3).map((msg) => `<div class="cfg-alert">⚠️ ${escapeHtml(msg)}</div>`).join("");
}

function renderLogicalBlocksAndEepMap() {
  const layouts = simState.blockLayouts || [];
  const vp = Number(ecucConfig.EaVirtualPageSize) || 8;
  const oh = Number(ecucConfig.EaBlockOverhead) || 4;
  const baseAddr = parseHexAddr(ecucConfig.EepBaseAddress);
  const totalUsedBytes = layouts.length ? (layouts[layouts.length - 1].physEnd + 1 - baseAddr) : 0;

  const badge = document.getElementById("eaMapBadge");
  if (badge) {
    badge.textContent = "VP=" + vp + "B · OH=" + oh + "B · Total " + totalUsedBytes + "B";
  }

  const sumBar = document.getElementById("eaMapSummaryBar");
  const cur = getSelectedEntry();
  if (sumBar) {
    const curSlotIdx = cur ? (simState.activeSlotByEntry[cur.id] || 0) : 0;
    const chunk = getEepChunkSize();
    sumBar.innerHTML =
      `<span>Base: <b>${fmtHex16(baseAddr)}</b></span>` +
      `<span>VirtualPage: <b>${vp} B</b></span>` +
      `<span>Overhead: <b>${oh} B</b> (Hdr 2B + Ftr 2B)</span>` +
      `<span>EepCycleLimit: <b>${Number(ecucConfig.EepAllowedWriteCycles || 100000).toLocaleString()}</b></span>` +
      `<span>Chunk(${simState.memIfMode === "MEMIF_MODE_FAST" ? "FAST" : "SLOW"}): <b>${chunk} B/tick</b></span>` +
      (cur ? `<span>Đang chọn: <b>Blk #${cur.blockNumber} (Slot #${curSlotIdx})</b></span>` : "");
  }

  // Table 1A-left: Logical Blocks table
  const tbody = document.getElementById("logicalBlocksBody");
  if (tbody) {
    tbody.innerHTML = layouts.map((entry) => {
      const slots = simState.eepromSlots[entry.id] || [];
      const aIdx = simState.activeSlotByEntry[entry.id] || 0;
      const aSlot = slots[aIdx] || slots[0];
      const st = aSlot ? evalSlotStatus(entry, aSlot) : "ERASED";
      const stTone = getSlotStatusTone(st);
      const isSel = entry.id === simState.selectedEntryId;
      const flags = [];
      if (entry.immediate) flags.push(`<span class="blk-pill bp-pur">IMM</span>`);
      if (entry.isDataset) flags.push(`<span class="blk-pill bp-cyan">DS[${entry.datasetIdx}]</span>`);
      if (entry.numSlots > 1) flags.push(`<span class="blk-pill bp-ok">${entry.numSlots} Slots</span>`);
      if (flags.length === 0) flags.push(`<span class="blk-pill bp-idle">STD</span>`);

      return `<tr class="${isSel ? "blk-selected" : ""}" onclick="selectEntryRow('${entry.id}')" style="cursor:pointer" title="Click để chọn ${escapeHtml(entry.name)}">
        <td><b>${escapeHtml(entry.name)}</b><div style="font-size:9px;color:var(--mut)">${entry.id} · ${flags.join(" ")}</div></td>
        <td class="mono"><b>#${entry.blockNumber}</b><div style="font-size:9px;color:var(--mut)">0x${entry.blockNumber.toString(16).toUpperCase().padStart(4, "0")}</div></td>
        <td class="mono">${entry.size}B → <b>${entry.slotSize}B</b><div style="font-size:9px;color:var(--mut)">+${entry.paddingBytes}B pad</div></td>
        <td class="mono">Slot#${aIdx} @ <b>${aSlot ? fmtHex16(aSlot.physStart) : "—"}</b><div style="font-size:9px;color:var(--mut)">Cnt: 0x${fmtByte(aSlot ? aSlot.counter : 0)}</div></td>
        <td><span class="blk-pill ${getToneBadgeClass(stTone, "bp-")}">${st}</span></td>
      </tr>`;
    }).join("");
  }

  // Visual 1A-right: Physical EEPROM Memory Map
  const mapEl = document.getElementById("eepMemoryMap");
  if (!mapEl) return;

  const legendHtml = `<div class="eep-map-hdr">
      <span>Physical EEPROM Layout (EepBase=${fmtHex16(baseAddr)} → ${fmtHex16(baseAddr + totalUsedBytes)})</span>
      <span style="color:var(--warn)">💡 Click Footer [5A xx] để tiêm/gỡ lỗi mất nguồn!</span>
    </div>
    <div class="eep-legend">
      <div class="eep-leg-item"><span class="eep-dot" style="background:var(--pri)"></span>Hdr [A5 Cnt]</div>
      <div class="eep-leg-item"><span class="eep-dot" style="background:var(--cyan)"></span>Data Payload</div>
      <div class="eep-leg-item"><span class="eep-dot" style="background:var(--ok)"></span>Ftr [5A Cnt]</div>
      <div class="eep-leg-item"><span class="eep-dot" style="background:var(--mut)"></span>VP Pad [FF]</div>
      <div class="eep-leg-item"><span class="eep-dot" style="background:var(--warn)"></span>Invalid [00]</div>
      <div class="eep-leg-item"><span class="eep-dot" style="background:var(--err)"></span>Inconsistent</div>
      <div class="eep-leg-item"><span class="eep-dot" style="background:var(--pur)"></span>Pre-Erased</div>
    </div>`;

  const rowsHtml = layouts.map((entry) => {
    const slots = simState.eepromSlots[entry.id] || [];
    const aIdx = simState.activeSlotByEntry[entry.id] || 0;
    const isSel = entry.id === simState.selectedEntryId;
    const aSlot = slots[aIdx] || slots[0];
    if (!aSlot) return "";

    const st = evalSlotStatus(entry, aSlot);
    const hdrClass = aSlot.hdrBytes[0] === 0x00 ? "seg-inv" : (aSlot.hdrBytes[0] === 0xFF ? "seg-ers" : "seg-hdr");
    const ftrClass = st === "VALID" ? "seg-ftr" : (st === "INCONSISTENT" ? "seg-inc" : (st === "INVALID" ? "seg-inv" : "seg-ers"));
    const dataClass = st === "PRE_ERASED" || st === "ERASED" ? "seg-ers" : (st === "INVALID" ? "seg-inv" : "seg-data");
    const hdrHex = fmtByte(aSlot.hdrBytes[0]) + " " + fmtByte(aSlot.hdrBytes[1]);
    const ftrHex = fmtByte(aSlot.ftrBytes[0]) + " " + fmtByte(aSlot.ftrBytes[1]);
    const dataPreview = aSlot.dataBytes.slice(0, 4).map(fmtByte).join(" ") + (aSlot.dataBytes.length > 4 ? "…" : "");
    const aSlotEnd = aSlot.physStart + entry.slotSize - 1;

    let wearStripHtml = "";
    if (slots.length > 1) {
      wearStripHtml = `<div class="eep-wear-slots">` + slots.map((sl, si) => {
        const sSt = evalSlotStatus(entry, sl);
        let boxCls = "";
        if (si === aIdx) boxCls = "ws-active";
        else if (sSt === "INCONSISTENT") boxCls = "ws-inc";
        else if (sSt === "ERASED" || sSt === "PRE_ERASED") boxCls = "ws-ers";
        return `<div class="wear-slot-box ${boxCls}" onclick="event.stopPropagation();onEepromCellClick('${entry.id}',${si},'select')" title="Slot #${si} @ ${fmtHex16(sl.physStart)} (${sSt}, Cnt=0x${fmtByte(sl.counter)})">
          <div><b>Slot #${si}</b> ${si === aIdx ? "★" : ""}</div>
          <div style="font-size:8.5px">${fmtHex16(sl.physStart)} · ${sSt.slice(0, 5)} · C:${fmtByte(sl.counter)}</div>
        </div>`;
      }).join("") + `</div>`;
    }

    return `<div class="eep-row ${isSel ? "eep-row-active" : ""}" onclick="selectEntryRow('${entry.id}')">
      <div style="display:flex;align-items:center;justify-content:space-between;font-size:10px;margin-bottom:4px">
        <span class="eep-addr-tag">${fmtHex16(aSlot.physStart)}..${fmtHex16(aSlotEnd)} · <b>${escapeHtml(entry.name)}</b> (Blk#${entry.blockNumber})</span>
        <span class="blk-pill ${getToneBadgeClass(getSlotStatusTone(st), "bp-")}">${st}${slots.length > 1 ? " [Slot#" + aIdx + "]" : ""}</span>
      </div>
      <div class="eep-segs">
        <div class="eep-seg ${hdrClass}" style="flex:1.1" onclick="event.stopPropagation();onEepromCellClick('${entry.id}',${aIdx},'hdr')" title="Header (2B): [${hdrHex}]">Hdr [${hdrHex}]</div>
        <div class="eep-seg ${dataClass}" style="flex:${Math.max(2, Math.min(5, entry.size / 4))}" onclick="event.stopPropagation();onEepromCellClick('${entry.id}',${aIdx},'data')" title="Data Payload (${entry.size}B)">Data(${entry.size}B): ${dataPreview}</div>
        <div class="eep-seg ${ftrClass}" style="flex:1.1" onclick="event.stopPropagation();onEepromCellClick('${entry.id}',${aIdx},'ftr')" title="Click để tiêm/gỡ lỗi Footer [${ftrHex}]">Ftr [${ftrHex}]</div>
        ${entry.paddingBytes > 0 ? `<div class="eep-seg seg-pad" style="flex:0.8" title="Virtual Page Padding (${entry.paddingBytes}B = 0xFF)">Pad ${entry.paddingBytes}B</div>` : ""}
      </div>
      ${wearStripHtml}
    </div>`;
  }).join("");

  mapEl.innerHTML = legendHtml + `<div class="eep-rows">${rowsHtml}</div>`;
}

function render8BitRegisters() {
  const renderOne = (hexElId, bitsElId, regType, val, prevVal, bitDefs) => {
    const hexEl = document.getElementById(hexElId);
    const bitsEl = document.getElementById(bitsElId);
    if (hexEl) hexEl.textContent = "0x" + fmtByte(val);
    if (!bitsEl) return;

    bitsEl.innerHTML = bitDefs.map((b) => {
      const isOn = (val & b.mask) !== 0;
      const changed = ((val ^ prevVal) & b.mask) !== 0;
      let cls = "bit-box";
      if (isOn) {
        cls += " on";
        if (b.tone === "err") cls += " err-bit";
        else if (b.tone === "warn") cls += " warn-bit";
        else if (b.tone === "pur") cls += " pur-bit";
      }
      if (changed) cls += " chg";
      return `<div class="${cls}" onclick="toggleRegisterBit('${regType}',${b.mask})" title="Bit ${b.bit} (${b.name}): ${escapeHtml(b.desc)} [Click để toggle]">
        <span class="bit-pos">b${b.bit}</span>
        <span class="bit-val">${isOn ? "1" : "0"}</span>
        <span class="bit-tag">${b.tag}</span>
      </div>`;
    }).join("");
  };

  renderOne("regAHex", "regABits", "A", simState.regAByte, simState.prevRegAByte, EA_STATUS_BITS);
  renderOne("regBHex", "regBBits", "B", simState.regBByte, simState.prevRegBByte, EA_BLOCK_HDR_BITS);
}

function renderSubJobAndStateMachines() {
  const execBadge = document.getElementById("eaExecBadge");
  const job = simState.activeJob;
  if (execBadge) {
    execBadge.textContent = job
      ? job.type + " · " + job.subPhase + " (t=" + simState.clockMs + "ms)"
      : simState.moduleStatus + " (t=" + simState.clockMs + "ms)";
    execBadge.className = "state-badge " + (job ? "sb-warn" : (simState.moduleStatus === "MEMIF_IDLE" ? "sb-ok" : "sb-idle"));
  }

  const tg = document.getElementById("timersGrid");
  if (tg) {
    const cur = getSelectedEntry();
    const sIdx = cur ? (simState.activeSlotByEntry[cur.id] || 0) : 0;
    const slot = cur && simState.eepromSlots[cur.id] ? simState.eepromSlots[cur.id][sIdx] : null;
    const maxCycles = Number(ecucConfig.EepAllowedWriteCycles) || 100000;
    const reqCycles = cur ? Number(cur.writeCycles || 100000) : 100000;
    const seqCnt = slot ? slot.counter : 0;
    const wearRatioPct = Math.min(100, Math.round((reqCycles / Math.max(1, maxCycles * (cur ? cur.numSlots : 1))) * 100));

    const jobPct = job
      ? Math.min(100, Math.round(((job.bytesDone || 0) / Math.max(1, job.bytesTotal || 1)) * 100))
      : (simState.jobResult === "MEMIF_JOB_OK" ? 100 : 0);
    const subTicksMax = Math.max(1, Math.ceil((cur ? cur.size : 8) / getEepChunkSize()));
    const subPct = job && job.eepSubActive ? Math.max(25, 100 - ((job.chunkRemaining || 0) / Math.max(1, cur ? cur.slotSize : 8)) * 80) : 0;
    const modeChunk = getEepChunkSize();

    tg.innerHTML =
      `<div class="timer-card">
        <div class="timer-top"><span>Job Pipeline (${job ? job.type : "Idle"})</span><span class="mono">${job ? job.subPhase : simState.jobResult}</span></div>
        <div class="timer-bar"><div class="timer-fill" style="width:${jobPct}%;background:${simState.jobResult === "MEMIF_JOB_FAILED" ? "var(--err)" : "var(--pri)"}"></div></div>
      </div>` +
      `<div class="timer-card">
        <div class="timer-top"><span>Eep Driver Sub-Job (Eep_MainFn)</span><span class="mono">${job && job.eepSubActive ? "BUSY (" + (job.chunkRemaining || 0) + "B left)" : "IDLE"}</span></div>
        <div class="timer-bar"><div class="timer-fill" style="width:${subPct}%;background:var(--pur)"></div></div>
      </div>` +
      `<div class="timer-card">
        <div class="timer-top"><span>Slot #${sIdx} SeqCnt &amp; Wear (${cur ? cur.numSlots : 1} Slots)</span><span class="mono">0x${fmtByte(seqCnt)} · ${(reqCycles / 1000).toFixed(0)}k cyc</span></div>
        <div class="timer-bar"><div class="timer-fill" style="width:${Math.max(12, wearRatioPct)}%;background:var(--ok)"></div></div>
      </div>` +
      `<div class="timer-card">
        <div class="timer-top"><span>Mode &amp; Notification Path</span><span class="mono">${ecucConfig.EaPollingMode ? "Polling" : "Callback"} · ${modeChunk}B/t (~${subTicksMax}t)</span></div>
        <div class="timer-bar"><div class="timer-fill" style="width:${simState.memIfMode === "MEMIF_MODE_FAST" ? 100 : 40}%;background:var(--cyan)"></div></div>
      </div>`;
  }

  // State Machine 1: Ea_ModuleStatus
  const smEaLbl = document.getElementById("smEaStatusLbl");
  const smEaEl = document.getElementById("eaStatusSmDiagram");
  if (smEaLbl) smEaLbl.textContent = simState.moduleStatus;
  if (smEaEl) {
    const states = [
      { id: "MEMIF_UNINIT", label: "MEMIF_UNINIT (Trước Init)" },
      { id: "MEMIF_BUSY_INTERNAL", label: "MEMIF_BUSY_INTERNAL (Quét)" },
      { id: "MEMIF_IDLE", label: "MEMIF_IDLE (Sẵn sàng)" },
      { id: "MEMIF_BUSY", label: "MEMIF_BUSY (Đang chạy Job)" }
    ];
    smEaEl.innerHTML = states.map((s) =>
      `<div class="sm-node ${simState.moduleStatus === s.id ? "active" : ""}">${s.label}</div>`
    ).join("");
  }

  // State Machine 2: Selected Block Integrity
  const smBlkLbl = document.getElementById("smBlkIntegLbl");
  const smBlkEl = document.getElementById("blkIntegSmDiagram");
  if (smBlkLbl) smBlkLbl.textContent = simState.blkIntegState;
  if (smBlkEl) {
    const bStates = [
      { id: "VALID", label: "VALID (Hdr 0xA5 + Ftr 0x5A)" },
      { id: "INCONSISTENT", label: "INCONSISTENT (Lệch / 0xFF)" },
      { id: "INVALID", label: "INVALID (0x0000 Invalidate)" },
      { id: "ERASED", label: "ERASED / PRE_ERASED (0xFF)" }
    ];
    smBlkEl.innerHTML = bStates.map((s) => {
      const active = simState.blkIntegState === s.id || (s.id === "ERASED" && simState.blkIntegState === "PRE_ERASED");
      return `<div class="sm-node ${active ? "active" : ""}">${s.label}</div>`;
    }).join("");
  }
}

function renderSvgArchitecture() {
  const allModIds = Object.keys(MODULES_INFO);
  const job = simState.activeJob;
  const activeArrowSet = new Set(simState.activeArrows || []);

  // Determine active module highlight set from active arrows
  const highlightedMods = new Set(["MOD_EA"]);
  if (activeArrowSet.has("arr_swc_rte") || activeArrowSet.has("arr_rte_nvm")) {
    highlightedMods.add("MOD_SWC");
    highlightedMods.add("MOD_RTE");
    highlightedMods.add("MOD_NVM");
  }
  if (activeArrowSet.has("arr_nvm_memif") || activeArrowSet.has("arr_memif_ea") || activeArrowSet.has("arr_ea_nvm_cbk")) {
    highlightedMods.add("MOD_NVM");
    highlightedMods.add("MOD_MEMIF");
  }
  if (activeArrowSet.has("arr_ecum_ea") || activeArrowSet.has("arr_ecum_nvm")) highlightedMods.add("MOD_ECUM");
  if (activeArrowSet.has("arr_schm_ea")) highlightedMods.add("MOD_SCHM");
  if (activeArrowSet.has("arr_ea_det")) highlightedMods.add("MOD_DET");
  if (activeArrowSet.has("arr_ea_eep") || activeArrowSet.has("arr_eep_ea_cbk")) highlightedMods.add("MOD_EEP");
  if (activeArrowSet.has("arr_eep_hw")) highlightedMods.add("MOD_SPI_HW");
  if (activeArrowSet.has("arr_eep_dem")) highlightedMods.add("MOD_DET");

  allModIds.forEach((mId) => {
    const g = document.getElementById("node_" + mId);
    if (!g) return;
    g.classList.toggle("active", highlightedMods.has(mId));
    g.classList.toggle("selected", uiState.selectedModuleId === mId);
  });

  // Reset and light up SVG arrows
  const allArrows = [
    "arr_swc_rte", "arr_rte_nvm", "arr_ecum_nvm", "arr_ecum_ea",
    "arr_schm_ea", "arr_nvm_memif", "arr_memif_ea", "arr_ea_nvm_cbk",
    "arr_ea_det", "arr_ea_eep", "arr_eep_ea_cbk", "arr_eep_hw", "arr_eep_dem"
  ];
  allArrows.forEach((aId) => {
    const el = document.getElementById(aId);
    if (!el) return;
    el.classList.remove("active-ok", "active-err", "active-warn", "active-pri", "active-pur");
    if (activeArrowSet.has(aId)) {
      if (aId === "arr_ea_det" || aId === "arr_eep_dem" || simState.jobResult === "MEMIF_JOB_FAILED" || simState.jobResult === "MEMIF_BLOCK_INCONSISTENT") {
        el.classList.add("active-err");
      } else if (aId === "arr_eep_ea_cbk" || aId === "arr_ea_nvm_cbk" || aId === "arr_eep_hw") {
        el.classList.add("active-ok");
      } else if (aId === "arr_schm_ea" || aId === "arr_ea_eep") {
        el.classList.add("active-pur");
      } else if (aId === "arr_nvm_memif" || aId === "arr_memif_ea") {
        el.classList.add("active-warn");
      } else {
        el.classList.add("active-pri");
      }
    }
  });

  // Update dynamic SVG node subtitles
  const setSvgTxt = (id, txt) => {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
  };
  const cur = getSelectedEntry();
  setSvgTxt("svgSub_MOD_SWC", cur ? "Req Blk #" + cur.blockNumber : "NvM Service Port");
  setSvgTxt("svgSub_MOD_ECUM", simState.initialized ? "Ea_Init() DONE" : "Chờ Ea_Init()");
  setSvgTxt("svgSub_MOD_SCHM", "Tick " + (Number(ecucConfig.EaMainFunctionPeriod) || 5) + "ms (" + simState.clockMs + "ms)");
  setSvgTxt("svgSub_MOD_RTE", "Client-Server Map");
  setSvgTxt("svgSub_MOD_NVM", simState.jobResult === "MEMIF_JOB_OK" ? "Cbk: JOB_OK" : simState.jobResult.replace("MEMIF_", ""));
  setSvgTxt("svgSub_MOD_DET", "DET:" + simState.detFaults.length + " · DEM:" + simState.demHwFaults.length);
  setSvgTxt("svgSub_MOD_MEMIF", "Dev=" + (ecucConfig.EaIndex || 0) + " · " + (simState.memIfMode === "MEMIF_MODE_FAST" ? "FAST" : "SLOW"));
  setSvgTxt("svgSub_MOD_EA1", "Status: " + simState.moduleStatus);
  setSvgTxt("svgSub_MOD_EA2", job ? job.type + " [" + job.subPhase + "]" : "VP=" + ecucConfig.EaVirtualPageSize + "B · OH=" + ecucConfig.EaBlockOverhead + "B");
  setSvgTxt("svgSub_MOD_EEP", job && job.eepSubActive ? "Eep BUSY (" + getEepChunkSize() + "B/t)" : (ecucConfig.EaPollingMode ? "Polling Mode" : "Callback Mode"));
  setSvgTxt("svgSub_MOD_SPI", "CyclesLimit: " + Number(ecucConfig.EepAllowedWriteCycles || 100000).toLocaleString());
}

function renderInspector() {
  const body = document.getElementById("inspBody");
  if (!body) return;
  const sc = getCurrentScenario();
  const cur = getSelectedEntry();
  const sIdx = cur ? (simState.activeSlotByEntry[cur.id] || 0) : 0;
  const aSlot = cur && simState.eepromSlots[cur.id] ? simState.eepromSlots[cur.id][sIdx] : null;
  const tab = uiState.activeInspTab;

  if (tab === 0) {
    // Tab 0: Current Step + RAM Buffer + Active Slot Breakdown + Alerts
    const detHtml = simState.detFaults.length > 0
      ? simState.detFaults.slice(0, 2).map((d) => `<div class="cfg-alert" style="margin-top:4px">🚨 <b>${escapeHtml(d.errCode)}</b> (SID ${d.serviceId}): ${escapeHtml(d.detail)}</div>`).join("")
      : "";
    const demHtml = simState.demHwFaults.length > 0
      ? simState.demHwFaults.slice(0, 2).map((d) => `<div class="cfg-alert" style="margin-top:4px">💥 <b>${escapeHtml(d.eventId)}</b>: ${escapeHtml(d.detail)}</div>`).join("")
      : "";

    body.innerHTML =
      `<div class="insp-card">
        <div class="insp-h">📌 Trạng Thái Kịch Bản (${escapeHtml(sc ? sc.id : "")} · Step ${uiState.stepIdx + 1}/${sc && sc.steps ? sc.steps.length : 0})</div>
        <div style="line-height:1.5">${escapeHtml(simState.stepExplain)}</div>
        ${detHtml}${demHtml}
      </div>` +
      `<div class="insp-card">
        <div class="insp-h">🧾 Block &amp; Slot Đang Chọn</div>
        ${cur && aSlot ? `
          <div class="mono" style="font-size:10.5px;line-height:1.6">
            <div><b>Block:</b> ${escapeHtml(cur.name)} (BlockNumber=${cur.blockNumber})</div>
            <div><b>Active Slot:</b> #${sIdx}/${cur.numSlots - 1} @ <b>${fmtHex16(aSlot.physStart)}..${fmtHex16(aSlot.physStart + cur.slotSize - 1)}</b></div>
            <div><b>Status:</b> ${evalSlotStatus(cur, aSlot)} · <b>SeqCounter:</b> 0x${fmtByte(aSlot.counter)}</div>
            <div><b>Header:</b> [${fmtByte(aSlot.hdrBytes[0])}, ${fmtByte(aSlot.hdrBytes[1])}] · <b>Footer:</b> [${fmtByte(aSlot.ftrBytes[0])}, ${fmtByte(aSlot.ftrBytes[1])}]</div>
          </div>` : "<div>Chưa chọn Block.</div>"}
      </div>` +
      `<div class="insp-card">
        <div class="insp-h">💾 Bộ Đệm RAM Ứng Dụng / NvM (RamMirror)</div>
        <div class="code-block" style="font-size:10px">${escapeHtml(simState.ramBufferHex || "(Trống)")}</div>
      </div>`;
  } else if (tab === 1) {
    // Tab 1: Selected Module Input / Process / Output + clickable selector pills
    const mod = MODULES_INFO[uiState.selectedModuleId] || MODULES_INFO.MOD_EA;
    const pillsHtml = Object.keys(MODULES_INFO).map((mId) => {
      const short = mId.replace("MOD_", "");
      return `<button class="mod-pill ${mId === mod.id ? "active" : ""}" onclick="selectModule('${mId}')">${short}</button>`;
    }).join("");

    body.innerHTML =
      `<div class="mod-list">${pillsHtml}</div>` +
      `<div class="insp-card">
        <div class="insp-h">🧩 ${escapeHtml(mod.name)}</div>
        <div style="font-size:10px;color:var(--cyan);margin-bottom:6px">${escapeHtml(mod.layer)}</div>
        <div style="margin-bottom:6px"><b>Vai trò:</b> ${escapeHtml(mod.role)}</div>
        <div style="margin-bottom:6px"><b>📥 Input:</b> ${escapeHtml(mod.inputs)}</div>
        <div style="margin-bottom:6px"><b>⚙️ Xử lý:</b> ${escapeHtml(mod.processing)}</div>
        <div style="margin-bottom:6px"><b>📤 Output:</b> ${escapeHtml(mod.outputs)}</div>
        <div class="insp-h" style="margin-top:8px">📜 API Chuẩn AUTOSAR</div>
        <div class="code-block">${escapeHtml((mod.apis || []).join("\n"))}</div>
      </div>`;
  } else if (tab === 2) {
    // Tab 2: Live AUTOSAR C Execution Snippet
    const cCode = buildLiveCCodeSnippet(cur, sIdx, aSlot);
    body.innerHTML =
      `<div class="insp-card">
        <div class="insp-h">💻 Luồng C Thực Thi Thời Gian Thực (SWS_Ea)</div>
        <div class="code-block">${escapeHtml(cCode)}</div>
      </div>`;
  } else {
    // Tab 3: API Trace + DET/DEM Log
    const tracesHtml = (simState.traceLogs || []).slice(0, 14).map((t) =>
      `<div class="trace-item ${t.level}">
        <div><b>[${t.t}ms] ${escapeHtml(t.api)}</b></div>
        <div style="color:var(--mut);margin-top:2px">${escapeHtml(t.detail)}</div>
      </div>`
    ).join("");

    const faultsHtml = [].concat(
      (simState.detFaults || []).map((f) =>
        `<div class="trace-item err"><b>DET ${escapeHtml(f.errCode)}</b> (SID ${escapeHtml(f.serviceId)})<br>${escapeHtml(f.detail)}</div>`
      ),
      (simState.demHwFaults || []).map((f) =>
        `<div class="trace-item warn"><b>DEM ${escapeHtml(f.eventId)}</b> (${f.t}ms)<br>${escapeHtml(f.detail)}</div>`
      )
    ).join("");

    body.innerHTML =
      `<div class="insp-card">
        <div class="insp-h">📡 Nhật Ký API Trace (${(simState.traceLogs || []).length})</div>
        ${tracesHtml || "<div style='color:var(--mut)'>Chưa có sự kiện trace.</div>"}
      </div>` +
      `<div class="insp-card">
        <div class="insp-h">🚨 DET &amp; DEM Fault Log (${(simState.detFaults || []).length + (simState.demHwFaults || []).length})</div>
        ${faultsHtml || "<div style='color:var(--ok)'>Không có lỗi DET hoặc DEM đang hoạt động.</div>"}
      </div>`;
  }
}

function buildLiveCCodeSnippet(cur, sIdx, aSlot) {
  const job = simState.activeJob;
  const blkNo = cur ? cur.blockNumber : 1;
  const blkSz = cur ? cur.size : 12;
  const addrHex = aSlot ? fmtHex16(aSlot.physStart) : "0x0000";
  const cback = ecucConfig.EaNvmJobEndNotification || "NvM_JobEndNotification";

  if (!simState.initialized) {
    return `/* Ea Module đang ở MEMIF_UNINIT */\n` +
      `void EcuM_AL_DriverInitTwo(const EcuM_ConfigType* ConfigPtr) {\n` +
      `  Eep_Init(&EepConfig);\n` +
      `  Ea_Init(NULL_PTR); /* ModuleId = 40 (SWS_Ea_00084) */\n` +
      `}`;
  }
  if (job) {
    return `/* Job đang chạy: ${job.type} @ Blk #${blkNo} (Slot #${sIdx} -> ${addrHex}) */\n` +
      `void Ea_MainFunction(void) {\n` +
      `  /* Sub-phase hiện tại: ${job.subPhase} (${simState.memIfMode}) */\n` +
      (ecucConfig.EaPollingMode
        ? `  if (Eep_GetJobResult() == MEMIF_JOB_PENDING) return;\n`
        : `  /* Đợi Eep gọi Ea_JobEndNotification() hoặc xử lý bước tiếp */\n`) +
      `  Eep_${job.type === "READ" ? "Read" : (job.type === "ERASE_IMMEDIATE" ? "Erase" : "Write")}(${addrHex}, Ea_WorkBuf, ${cur ? cur.slotSize : 16}U);\n` +
      `  /* Khi xong -> gọi ${cback}(); */\n` +
      `}`;
  }
  return `/* Trạng thái ${simState.moduleStatus} · Result: ${simState.jobResult} */\n` +
    `Std_ReturnType ret = Ea_Write(\n` +
    `  ${blkNo}U,                 /* EaBlockNumber (${cur ? cur.name : "Blk"}) */\n` +
    `  NvM_RamMirrorPtr      /* ${blkSz} bytes payload -> aligned ${cur ? cur.slotSize : 16}B @ ${addrHex} */\n` +
    `);\n` +
    `/* Thông báo kết quả: ${ecucConfig.EaPollingMode ? "EaPollingMode = STD_ON (Polling)" : cback + "()"} */`;
}

// -------------------- EXPORT MODAL & STANDALONE HTML DOWNLOAD --------------------

function openExportModal() {
  const modal = document.getElementById("exportModal");
  if (!modal) return;
  modal.classList.add("show");
  switchExportTab(uiState.exportTab || 0);
}

function closeExportModal() {
  const modal = document.getElementById("exportModal");
  if (modal) modal.classList.remove("show");
}

function onExportModalBackdrop(e) {
  if (e && e.target && e.target.id === "exportModal") {
    closeExportModal();
  }
}

function switchExportTab(idx) {
  uiState.exportTab = idx;
  for (let i = 0; i < 4; i++) {
    const t = document.getElementById("expTab" + i);
    if (t) t.classList.toggle("active", i === idx);
  }
  const area = document.getElementById("exportCodeArea");
  if (!area) return;
  if (idx === 0) area.value = generateEaArxml();
  else if (idx === 1) area.value = generateEaCfgH();
  else if (idx === 2) area.value = generateEaLcfgC();
  else area.value = generateEaJson();
}

function generateEaArxml() {
  const blocks = (simState.blockLayouts || []);
  const blkXml = blocks.map((b) => `            <ECUC-CONTAINER-VALUE>
              <SHORT-NAME>${b.id}_${b.name}</SHORT-NAME>
              <DEFINITION-REF DEST="ECUC-PARAM-CONF-CONTAINER-DEF">/AUTOSAR/EcucDefs/Ea/EaBlockConfiguration</DEFINITION-REF>
              <PARAMETER-VALUES>
                <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-INTEGER-PARAM-DEF">/AUTOSAR/EcucDefs/Ea/EaBlockConfiguration/EaBlockNumber</DEFINITION-REF><VALUE>${b.blockNumber}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
                <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-INTEGER-PARAM-DEF">/AUTOSAR/EcucDefs/Ea/EaBlockConfiguration/EaBlockSize</DEFINITION-REF><VALUE>${b.size}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
                <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-BOOLEAN-PARAM-DEF">/AUTOSAR/EcucDefs/Ea/EaBlockConfiguration/EaImmediateData</DEFINITION-REF><VALUE>${b.immediate ? "true" : "false"}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
                <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-INTEGER-PARAM-DEF">/AUTOSAR/EcucDefs/Ea/EaBlockConfiguration/EaNumberOfWriteCycles</DEFINITION-REF><VALUE>${b.writeCycles}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
              </PARAMETER-VALUES>
            </ECUC-CONTAINER-VALUE>`).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<AUTOSAR xmlns="http://autosar.org/schema/r4.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <AR-PACKAGES>
    <AR-PACKAGE>
      <SHORT-NAME>EcucConfig</SHORT-NAME>
      <ELEMENTS>
        <ECUC-MODULE-CONFIGURATION-VALUES>
          <SHORT-NAME>Ea</SHORT-NAME>
          <DEFINITION-REF DEST="ECUC-MODULE-DEF">/AUTOSAR/EcucDefs/Ea</DEFINITION-REF>
          <CONTAINERS>
            <ECUC-CONTAINER-VALUE>
              <SHORT-NAME>EaGeneral</SHORT-NAME>
              <PARAMETER-VALUES>
                <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-BOOLEAN-PARAM-DEF">/AUTOSAR/EcucDefs/Ea/EaGeneral/EaDevErrorDetect</DEFINITION-REF><VALUE>${ecucConfig.EaDevErrorDetect ? "true" : "false"}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
                <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-BOOLEAN-PARAM-DEF">/AUTOSAR/EcucDefs/Ea/EaGeneral/EaPollingMode</DEFINITION-REF><VALUE>${ecucConfig.EaPollingMode ? "true" : "false"}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
                <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-BOOLEAN-PARAM-DEF">/AUTOSAR/EcucDefs/Ea/EaGeneral/EaSetModeSupported</DEFINITION-REF><VALUE>${ecucConfig.EaSetModeSupported ? "true" : "false"}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
                <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-BOOLEAN-PARAM-DEF">/AUTOSAR/EcucDefs/Ea/EaGeneral/EaVersionInfoApi</DEFINITION-REF><VALUE>${ecucConfig.EaVersionInfoApi ? "true" : "false"}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
                <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-INTEGER-PARAM-DEF">/AUTOSAR/EcucDefs/Ea/EaGeneral/EaVirtualPageSize</DEFINITION-REF><VALUE>${ecucConfig.EaVirtualPageSize}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
                <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-INTEGER-PARAM-DEF">/AUTOSAR/EcucDefs/Ea/EaGeneral/EaIndex</DEFINITION-REF><VALUE>${ecucConfig.EaIndex}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
              </PARAMETER-VALUES>
            </ECUC-CONTAINER-VALUE>
${blkXml}
          </CONTAINERS>
        </ECUC-MODULE-CONFIGURATION-VALUES>
      </ELEMENTS>
    </AR-PACKAGE>
  </AR-PACKAGES>
</AUTOSAR>`;
}

function generateEaCfgH() {
  const blocks = simState.blockLayouts || [];
  const defs = blocks.map((b) =>
    `#define EaConf_EaBlockConfiguration_${b.name}   ((uint16)${b.blockNumber}U)`
  ).join("\n");
  return `/* AUTOSAR Classic Ea_Cfg.h — Generated by AUTOSAR Ea Interactive Simulator (R23-11) */
#ifndef EA_CFG_H
#define EA_CFG_H

#include "Std_Types.h"

#define EA_MODULE_ID                 (40U)
#define EA_VENDOR_ID                 (0U)
#define EA_AR_RELEASE_MAJOR_VERSION  (4U)
#define EA_AR_RELEASE_MINOR_VERSION  (9U)

#define EA_DEV_ERROR_DETECT          (${ecucConfig.EaDevErrorDetect ? "STD_ON" : "STD_OFF"})
#define EA_VERSION_INFO_API          (${ecucConfig.EaVersionInfoApi ? "STD_ON" : "STD_OFF"})
#define EA_POLLING_MODE              (${ecucConfig.EaPollingMode ? "STD_ON" : "STD_OFF"})
#define EA_SET_MODE_SUPPORTED        (${ecucConfig.EaSetModeSupported ? "STD_ON" : "STD_OFF"})
#define EA_VIRTUAL_PAGE_SIZE         (${ecucConfig.EaVirtualPageSize}U)
#define EA_INDEX                     (${ecucConfig.EaIndex}U)
#define EA_BLOCK_OVERHEAD            (${ecucConfig.EaBlockOverhead}U)
#define EA_PAGE_OVERHEAD             (${ecucConfig.EaPageOverhead}U)
#define EA_TOTAL_NUM_BLOCKS          (${blocks.length}U)

/* Symbolic Block Numbers (EaBlockConfiguration) */
${defs}

#endif /* EA_CFG_H */`;
}

function generateEaLcfgC() {
  const blocks = simState.blockLayouts || [];
  const rows = blocks.map((b) => {
    const firstSlot = simState.eepromSlots[b.id] ? simState.eepromSlots[b.id][0] : null;
    const pStart = firstSlot ? fmtHex16(firstSlot.physStart) : "0x0000";
    return `  { /* ${b.name} (${b.id}) */
    .BlockNumber        = ${b.blockNumber}U,
    .BlockSize          = ${b.size}U,
    .AlignedSlotSize    = ${b.slotSize}U,
    .PhysicalStartAddr  = ${pStart}UL,
    .WearSlotsCount     = ${b.numSlots}U,
    .ImmediateData      = ${b.immediate ? "TRUE" : "FALSE"},
    .NumberOfWriteCycles= ${b.writeCycles}UL
  }`;
  }).join(",\n");

  const endFn = ecucConfig.EaNvmJobEndNotificationEnabled ? "&" + (ecucConfig.EaNvmJobEndNotification || "NvM_JobEndNotification") : "NULL_PTR";
  const errFn = ecucConfig.EaNvmJobErrorNotificationEnabled ? "&" + (ecucConfig.EaNvmJobErrorNotification || "NvM_JobErrorNotification") : "NULL_PTR";

  return `/* AUTOSAR Classic Ea_Lcfg.c — Generated by AUTOSAR Ea Interactive Simulator */
#include "Ea.h"
#include "NvM_Cbk.h"

const Ea_BlockConfigType Ea_BlockConfig[${blocks.length}U] = {
${rows}
};

const Ea_ConfigType Ea_Config = {
  .Blocks                = Ea_BlockConfig,
  .NumBlocks             = ${blocks.length}U,
  .VirtualPageSize       = ${ecucConfig.EaVirtualPageSize}U,
  .NvmJobEndNotification = ${endFn},
  .NvmJobErrorNotification = ${errFn}
};`;
}

function generateEaJson() {
  return JSON.stringify({
    module: "Ea (EEPROM Abstraction)",
    moduleId: EA_MODULE_ID,
    autosarRelease: "R23-11",
    ecucConfig: ecucConfig,
    computedBlockLayouts: simState.blockLayouts
  }, null, 2);
}

function copyExportCode() {
  const area = document.getElementById("exportCodeArea");
  if (!area) return;
  area.select();
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(area.value).catch(() => {});
  }
}

function downloadExportCode() {
  const area = document.getElementById("exportCodeArea");
  if (!area) return;
  const names = ["Ea.arxml", "Ea_Cfg.h", "Ea_Lcfg.c", "Ea_Config.json"];
  const fname = names[uiState.exportTab] || "Ea_Export.txt";
  const blob = new Blob([area.value], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = fname;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function downloadStandaloneHTML() {
  const html = "<!DOCTYPE html>\n" + document.documentElement.outerHTML;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "AUTOSAR_Ea.html";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}
