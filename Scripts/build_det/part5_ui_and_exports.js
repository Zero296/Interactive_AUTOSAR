// ==================== PART 5: UI CONTROLLERS, SCENARIO STEPPER, DEM TOOLTIPS & EXPORTS ====================

let curScenarioIdx = 0;
let curStepIdx = 0;
let scenarioSnapshots = [];
let curInspTab = "trace";
let curExportTab = "arxml";

// Wrap pure engine functions that are also bound directly to header/quick-action HTML buttons
const _engineBreakEndlessLoop = api_BreakEndlessLoop;
api_BreakEndlessLoop = function () {
  _engineBreakEndlessLoop();
  renderAll();
};

const _engineClearRamBuffer = api_ClearRamBuffer;
api_ClearRamBuffer = function () {
  _engineClearRamBuffer();
  renderAll();
};

function populateScenarioSelect() {
  const sel = document.getElementById("scenarioSelect");
  if (!sel) return;
  sel.innerHTML = SCENARIOS.map((sc, i) => `<option value="${i}">${escapeHtml(sc.title)}</option>`).join("");
}

function captureScenarioSnapshot() {
  return JSON.stringify({
    cfg: cfg,
    simState: simState,
    curStepIdx: curStepIdx
  });
}

function restoreScenarioSnapshot(jsonStr) {
  const snap = JSON.parse(jsonStr);
  cfg = Object.assign({}, defaultConfig, snap.cfg);
  simState = snap.simState;
  curStepIdx = snap.curStepIdx;
  syncConfigToUI();
  renderAll();
}

function loadScenario(idx) {
  curScenarioIdx = Math.max(0, Math.min(SCENARIOS.length - 1, idx));
  const sc = SCENARIOS[curScenarioIdx];
  const sel = document.getElementById("scenarioSelect");
  if (sel) sel.value = String(curScenarioIdx);
  sc.setup();
  curStepIdx = 0;
  scenarioSnapshots = [captureScenarioSnapshot()];
  syncConfigToUI();
  renderAll();
}

function onScenarioChange() {
  const sel = document.getElementById("scenarioSelect");
  loadScenario(parseInt(sel.value, 10) || 0);
}

function stepNext() {
  const sc = SCENARIOS[curScenarioIdx];
  if (curStepIdx >= sc.steps.length) return;
  sc.steps[curStepIdx].exec();
  curStepIdx += 1;
  scenarioSnapshots[curStepIdx] = captureScenarioSnapshot();
  syncConfigToUI();
  renderAll();
}

function stepPrev() {
  if (curStepIdx <= 0) return;
  const targetIdx = curStepIdx - 1;
  if (scenarioSnapshots[targetIdx]) {
    restoreScenarioSnapshot(scenarioSnapshots[targetIdx]);
  }
}

function stepReset() {
  loadScenario(curScenarioIdx);
}

function runAllSteps() {
  const sc = SCENARIOS[curScenarioIdx];
  while (curStepIdx < sc.steps.length) {
    stepNext();
  }
}

function runWhatIf(wIdx) {
  const sc = SCENARIOS[curScenarioIdx];
  if (!sc.whatIfs || !sc.whatIfs[wIdx]) return;
  sc.whatIfs[wIdx].run();
  syncConfigToUI();
  renderAll();
}

function onContextChange() {
  const el = document.getElementById("ctxSelector");
  if (!el) return;
  simState.execContext = el.value;
  addTrace("INFO", "CPU Execution Context Switched -> " + simState.execContext,
    simState.execContext === "ISR_CanRx"
      ? "Mô phỏng ngữ cảnh Cat-2 Interrupt (ISR_CanRx): kiểm tra SchM_Enter_Det_DET_EXCLUSIVE_AREA_0()."
      : "Trở về OS Task thông thường (Task_10ms).",
    "SWS_Det_00039");
  renderAll();
}

// ==================== QUICK ACTIONS ====================

function qaTriggerDevError() {
  api_Det_ReportError(20, 0, 0x07, 0x15, "QuickAction_NvM");
  renderAll();
}

function qaTriggerRuntimeError() {
  api_Det_ReportRuntimeError(20, 0, 0x07, 0x1A, "QuickAction_NvM_Runtime");
  renderAll();
}

function qaTriggerTransientFault() {
  api_Det_ReportTransientFault(92, 0, 0x07, 0x11, "QuickAction_Fls_ECC");
  renderAll();
}

function qaTriggerSwcRte() {
  api_Rte_Call_Det("SWC_BrakeCtrl", cfg.SwcBrake_DefaultInstanceId, 0x01, 0x02, "DEV");
  renderAll();
}

function qaInitAndStart() {
  api_Det_Init("NULL_PTR");
  api_Det_Start();
  syncConfigToUI();
  renderAll();
}

function qaInjectSpecial() {
  const kind = document.getElementById("qaSpecialKind").value;
  api_InjectSpecialEvent(kind);
  syncConfigToUI();
  renderAll();
}

function qaInjectCustom4Tuple() {
  const modId = parseIntAny(document.getElementById("custModId").value);
  const instId = parseIntAny(document.getElementById("custInstId").value);
  const apiId = parseIntAny(document.getElementById("custApiId").value);
  const errId = parseIntAny(document.getElementById("custErrId").value);
  const stream = document.getElementById("custStream").value;
  cfg.CustomInject4Tuple = `${modId},${instId},${fmtHex(apiId, 2)},${fmtHex(errId, 2)}`;
  syncConfigToUI();
  if (stream === "DEV") api_Det_ReportError(modId, instId, apiId, errId, "Custom_Injector");
  else if (stream === "RUNTM") api_Det_ReportRuntimeError(modId, instId, apiId, errId, "Custom_Injector");
  else api_Det_ReportTransientFault(modId, instId, apiId, errId, "Custom_Injector");
  renderAll();
}

// ==================== INTERACTIVE REGISTER BITS & BUFFER SLOTS ====================

function toggleRegisterBit(regName, bitIdx) {
  const mask = (1 << bitIdx) & 0xFF;
  if (regName === "core") {
    if (bitIdx === 7) {
      cfg.DetInitialized = !cfg.DetInitialized;
      simState.lifecycleState = cfg.DetInitialized ? (cfg.DetStarted ? "DET_STARTED" : "DET_INIT") : "DET_UNINIT";
    } else if (bitIdx === 6) {
      cfg.DetStarted = !cfg.DetStarted;
      if (cfg.DetStarted) cfg.DetInitialized = true;
      simState.lifecycleState = cfg.DetStarted ? "DET_STARTED" : (cfg.DetInitialized ? "DET_INIT" : "DET_UNINIT");
    } else if (bitIdx === 0 && simState.loopHaltState === "ENDLESS_HALT_BKPT") {
      api_BreakEndlessLoop();
      syncConfigToUI();
      return;
    } else {
      simState.manualCoreXor ^= mask;
    }
    const def = DET_CORE_BITS.find(b => b.bit === bitIdx);
    if (def) addTrace("INFO", "Bit Inspect [Core Bit " + bitIdx + ": " + def.name + "]", def.desc, "Det_CoreStatusByte");
  } else {
    if (bitIdx === 5) {
      cfg.CallerDevErrorDetect = !cfg.CallerDevErrorDetect;
    } else {
      simState.manualPipeXor ^= mask;
    }
    const def = DET_PIPELINE_BITS.find(b => b.bit === bitIdx);
    if (def) addTrace("INFO", "Bit Inspect [Pipeline Bit " + bitIdx + ": " + def.name + "]", def.desc, "Det_PipelineFilterByte");
  }
  syncConfigToUI();
  renderAll();
}

function selectBufferSlot(idx) {
  simState.selectedBufferSlot = idx;
  simState.selectedModule = "MOD_BUFFER";
  renderPanel1Diagnostics();
  renderModuleIo();
}

function selectModule(modId) {
  simState.selectedModule = modId;
  switchInspTab("io");
  renderPanel3Svg();
  renderModuleIo();
}

// ==================== 6-TAB ECUC CONFIG SYNC & VALIDATION ====================

function switchCfgTab(tabIdx) {
  for (let i = 0; i < 6; i++) {
    const b = document.getElementById("cfgTabBtn_" + i);
    const p = document.getElementById("cfgPane_" + i);
    if (b) b.classList.toggle("active", i === tabIdx);
    if (p) p.classList.toggle("active", i === tabIdx);
  }
}

function syncConfigToUI() {
  Object.keys(defaultConfig).forEach(key => {
    const el = document.getElementById("cfg_" + key);
    if (!el) return;
    if (el.type === "checkbox") {
      el.checked = !!cfg[key];
    } else {
      el.value = String(cfg[key]);
    }
  });
  const ctxEl = document.getElementById("ctxSelector");
  if (ctxEl && simState) ctxEl.value = simState.execContext;
  updateConfigWarnings();
}

function onConfigChange(key) {
  const el = document.getElementById("cfg_" + key);
  if (!el) return;
  if (el.type === "checkbox") {
    cfg[key] = !!el.checked;
  } else if (el.type === "number") {
    cfg[key] = parseInt(el.value, 10) || 0;
  } else {
    cfg[key] = el.value;
  }

  if (key === "EcuBuildProfile") {
    applyBuildProfile(cfg.EcuBuildProfile);
    syncConfigToUI();
    addTrace("INFO", "ECU Build Profile -> " + cfg.EcuBuildProfile,
      "Đã đồng bộ bộ tham số CallerDevErrorDetect / DetEndlessLoop / DLT theo profile.",
      "ECUC Profile");
  } else if (key === "DetInitialized" || key === "DetStarted") {
    if (cfg.DetStarted && !cfg.DetInitialized) cfg.DetInitialized = true;
    simState.lifecycleState = cfg.DetStarted ? "DET_STARTED" : (cfg.DetInitialized ? "DET_INIT" : "DET_UNINIT");
  } else if (key === "CustomInject4Tuple") {
    const parts = String(cfg.CustomInject4Tuple).split(",");
    if (parts.length === 4) {
      document.getElementById("custModId").value = parts[0].trim();
      document.getElementById("custInstId").value = parts[1].trim();
      document.getElementById("custApiId").value = parts[2].trim();
      document.getElementById("custErrId").value = parts[3].trim();
    }
  }
  syncConfigToUI();
  renderAll();
}

function updateConfigWarnings() {
  const warnBox = document.getElementById("cfgWarnBox");
  if (!warnBox) return;
  const msgs = [];
  if (cfg.EcuBuildProfile === "PRODUCTION_SERIES_BUILD" && cfg.DetEndlessLoopInDevError) {
    msgs.push("Cảnh báo: Không nên bật DetEndlessLoopInDevError trong bản PRODUCTION_SERIES_BUILD!");
  }
  if (!cfg.ProtectReentrancyWithSchM) {
    msgs.push("Rủi ro Concurrency: ProtectReentrancyWithSchM = FALSE -> ISR có thể ghi đè hỏng Ring Buffer!");
  }
  if (!cfg.PreventRecursiveHookCall) {
    msgs.push("Rủi ro Stack: PreventRecursiveHookCall = FALSE -> Hook gọi ngược Det sẽ gây Stack Overflow!");
  }
  if (msgs.length > 0) {
    warnBox.innerHTML = msgs.map(m => "&bull; " + escapeHtml(m)).join("<br>");
    warnBox.classList.add("show");
  } else {
    warnBox.classList.remove("show");
    warnBox.textContent = "";
  }
}

// ==================== RENDERERS ====================

function renderAll() {
  renderHeader();
  renderScenarioCard();
  renderPanel1Diagnostics();
  renderPanel2PipelineAndSM();
  renderPanel3Svg();
  renderTraceList();
  renderModuleIo();
  renderCallerMatrix();
  renderLiveCode();
}

function renderHeader() {
  const pillLife = document.getElementById("pillLifecycle");
  pillLife.textContent = simState.lifecycleState;
  pillLife.className = "st-pill " + (
    simState.lifecycleState === "DET_STARTED" ? "ok" :
    (simState.lifecycleState === "DET_INIT" ? "info" : "warn")
  );

  const pillCnt = document.getElementById("pillStreamCounts");
  pillCnt.textContent = `D:${simState.counts.dev} R:${simState.counts.runtm} T:${simState.counts.trans}`;

  const pillLoop = document.getElementById("pillLoopState");
  const btnBreak = document.getElementById("btnBreakLoop");
  if (simState.loopHaltState === "ENDLESS_HALT_BKPT") {
    pillLoop.textContent = "HALTED!";
    pillLoop.className = "st-pill halt-blink";
    btnBreak.classList.add("active-halt");
  } else {
    pillLoop.textContent = "CPU: " + simState.execContext;
    pillLoop.className = "st-pill ok";
    btnBreak.classList.remove("active-halt");
  }

  const sc = SCENARIOS[curScenarioIdx];
  document.getElementById("stepCounterPill").textContent = `${curStepIdx} / ${sc.steps.length}`;
  document.getElementById("btnStepPrev").disabled = curStepIdx <= 0;
  document.getElementById("btnStepNext").disabled = curStepIdx >= sc.steps.length;
}

function renderScenarioCard() {
  const sc = SCENARIOS[curScenarioIdx];
  document.getElementById("scenTitle").textContent = sc.id + " — Simulation Guide";
  document.getElementById("scenSummary").textContent = sc.summary;

  const stTitleEl = document.getElementById("scenStepTitle");
  const stDescEl = document.getElementById("scenStepDesc");
  if (curStepIdx === 0) {
    stTitleEl.textContent = "Sẵn sàng (Step 0 / " + sc.steps.length + ")";
    stDescEl.textContent = "Nhấn 'Next ▶' để chạy bước đầu tiên hoặc dùng Quick Action Bar / What-If bên dưới.";
  } else {
    const st = sc.steps[curStepIdx - 1];
    stTitleEl.textContent = st.title;
    stDescEl.textContent = st.desc;
  }

  const wiEl = document.getElementById("whatIfList");
  wiEl.innerHTML = sc.whatIfs.map((w, idx) =>
    `<button type="button" class="whatif-btn" onclick="runWhatIf(${idx})">&#9889; ${escapeHtml(w.label)}</button>`
  ).join("");
}

function renderPanel1Diagnostics() {
  const lp = simState.lastPacket;
  document.getElementById("tupModVal").textContent = lp.stream === "IDLE" ? "--" : `${lp.modId} (${fmtHex(lp.modId, 2)})`;
  document.getElementById("tupModName").textContent = lp.modName;
  document.getElementById("tupInstVal").textContent = lp.stream === "IDLE" ? "--" : String(lp.instId);
  document.getElementById("tupInstName").textContent = lp.viaRte ? "RTE Instance" : "BSW/MCAL Inst";
  document.getElementById("tupApiVal").textContent = lp.stream === "IDLE" ? "--" : fmtHex(lp.apiId, 2);
  document.getElementById("tupApiName").textContent = lp.apiName;
  document.getElementById("tupErrVal").textContent = lp.stream === "IDLE" ? "--" : fmtHex(lp.errId, 2);
  document.getElementById("tupErrName").textContent = lp.errName;

  const badge = document.getElementById("tupStreamBadge");
  badge.textContent = lp.stream;
  badge.className = "stream-badge sb-" + (lp.stream === "DEV" || lp.stream === "RUNTM" || lp.stream === "TRANS" ? lp.stream : "EMPTY");
  document.getElementById("tupCallerBadge").textContent = lp.caller;
  document.getElementById("tupReturnVal").textContent = lp.retVal;

  // Funnel
  document.getElementById("cntDev").textContent = simState.counts.dev;
  document.getElementById("cntRuntm").textContent = simState.counts.runtm;
  document.getElementById("cntTrans").textContent = simState.counts.trans;
  document.getElementById("retDev").textContent = simState.loopHaltState === "ENDLESS_HALT_BKPT" ? "HALTED" : "Always E_OK";
  document.getElementById("retRuntm").textContent = "Always E_OK";
  document.getElementById("retTrans").textContent = lp.stream === "TRANS" ? lp.retVal : "E_OK / E_NOT_OK";

  document.getElementById("streamCardDev").classList.toggle("active", lp.stream === "DEV");
  document.getElementById("streamCardRuntm").classList.toggle("active", lp.stream === "RUNTM");
  document.getElementById("streamCardTrans").classList.toggle("active", lp.stream === "TRANS");

  // Quick Action mini stats
  const cap = Math.max(1, Math.min(8, Number(cfg.DetErrorBufferSize) || 8));
  document.getElementById("statBufUsed").textContent = `${simState.bufUsed} / ${cap}`;
  document.getElementById("statOvfCnt").textContent = String(simState.counts.ovf);
  document.getElementById("statDltSent").textContent = String(simState.counts.dlt);

  // Ring Buffer table
  document.getElementById("ringHeadBadge").textContent = `WriteIdx: ${simState.bufWriteIdx % cap} / Size: ${cap}`;
  document.getElementById("ringPolicyBadge").textContent = cfg.DetBufferOverflowMode === "STOP_ON_FULL_KEEP_FIRST"
    ? (simState.bufLocked ? "STOP_ON_FULL [LOCKED]" : "STOP_ON_FULL")
    : "FIFO_OVERWRITE";

  const tbody = document.getElementById("ringBufferBody");
  let rowsHtml = "";
  for (let i = 0; i < 8; i++) {
    const sl = simState.buffer[i];
    const inCap = i < cap;
    const isSel = simState.selectedBufferSlot === i;
    const cls = ["ring-row", isSel ? "selected" : "", (sl.valid && i === ((simState.bufWriteIdx - 1 + cap) % cap)) ? "latest" : ""].join(" ");
    if (!inCap) {
      rowsHtml += `<tr class="${cls}" style="opacity:0.42" onclick="selectBufferSlot(${i})">
        <td class="mono">[${i}]</td><td colspan="7">Disabled by DetErrorBufferSize=${cap}</td></tr>`;
    } else if (!sl.valid) {
      rowsHtml += `<tr class="${cls}" onclick="selectBufferSlot(${i})">
        <td class="mono">[${i}]</td><td><span class="stream-badge sb-EMPTY">EMPTY</span></td>
        <td colspan="5" style="color:var(--text-dim)">-- unused slot --</td><td>OK</td></tr>`;
    } else {
      rowsHtml += `<tr class="${cls}" onclick="selectBufferSlot(${i})">
        <td class="mono">[${i}]</td>
        <td><span class="stream-badge sb-${sl.stream}">${sl.stream}</span></td>
        <td class="mono">${sl.modName} (${sl.modId})</td>
        <td class="mono">${sl.instId}</td>
        <td class="mono">${fmtHex(sl.apiId, 2)}</td>
        <td class="mono">${fmtHex(sl.errId, 2)}</td>
        <td class="mono">${sl.ctx} #${sl.seq}</td>
        <td>${sl.corrupted ? '<span style="color:var(--accent-dev);font-weight:800">CORRUPT</span>' : 'VALID'}</td>
      </tr>`;
    }
  }
  tbody.innerHTML = rowsHtml;

  // Dual 8-Bit Registers
  const coreVal = computeCoreStatusByte();
  const pipeVal = computePipelineFilterByte();
  document.getElementById("regCoreHex").textContent = fmtHex(coreVal, 2);
  document.getElementById("regPipeHex").textContent = fmtHex(pipeVal, 2);

  document.getElementById("regCoreBits").innerHTML = DET_CORE_BITS.map(b => {
    const isOn = (coreVal & b.mask) !== 0;
    return `<div class="bit-box ${isOn ? ("on " + b.tone) : ""}" title="${escapeHtml(b.desc)}" onclick="toggleRegisterBit('core', ${b.bit})">
      <div class="b-idx">B${b.bit}</div>
      <div class="b-val">${isOn ? 1 : 0}</div>
      <div class="b-tag">${b.tag}</div>
    </div>`;
  }).join("");

  document.getElementById("regPipeBits").innerHTML = DET_PIPELINE_BITS.map(b => {
    const isOn = (pipeVal & b.mask) !== 0;
    return `<div class="bit-box ${isOn ? ("on " + b.tone) : ""}" title="${escapeHtml(b.desc)}" onclick="toggleRegisterBit('pipe', ${b.bit})">
      <div class="b-idx">B${b.bit}</div>
      <div class="b-val">${isOn ? 1 : 0}</div>
      <div class="b-tag">${b.tag}</div>
    </div>`;
  }).join("");
}

function renderPanel2PipelineAndSM() {
  const map = [
    ["pipeGuard", "pipeGuardSt", simState.pipeline.guard],
    ["pipeFilter", "pipeFilterSt", simState.pipeline.filter],
    ["pipeHook", "pipeHookSt", simState.pipeline.hook],
    ["pipeDlt", "pipeDltSt", simState.pipeline.dlt],
    ["pipeBuf", "pipeBufSt", simState.pipeline.buf],
    ["pipeExit", "pipeExitSt", simState.pipeline.exit]
  ];
  map.forEach(([boxId, stId, obj]) => {
    const box = document.getElementById(boxId);
    const st = document.getElementById(stId);
    if (box) box.className = "pipe-node " + (obj.cls || "");
    if (st) st.textContent = obj.st || "IDLE";
  });

  // SM 1: Lifecycle
  document.getElementById("smUninit").className = "sm-node" + (simState.lifecycleState === "DET_UNINIT" ? " active-err" : "");
  document.getElementById("smInit").className = "sm-node" + (simState.lifecycleState === "DET_INIT" ? " active-info" : "");
  document.getElementById("smStarted").className = "sm-node" + (simState.lifecycleState === "DET_STARTED" ? " active-ok" : "");

  // SM 2: Loop Halt
  const halted = simState.loopHaltState === "ENDLESS_HALT_BKPT";
  document.getElementById("smRun").className = "sm-node" + (!halted ? " active-ok" : "");
  document.getElementById("smHalt").className = "sm-node" + (halted ? " active-err" : "");
}

function renderPanel3Svg() {
  Object.keys(MODULES_INFO).forEach(modKey => {
    const el = document.getElementById("svg_" + modKey);
    if (!el) return;
    el.classList.toggle("selected", simState.selectedModule === modKey);
    el.classList.toggle("active-flow", !!simState.activeModules[modKey]);
  });

  const arrowIds = [
    "arr_swc_rte", "arr_rte_det", "arr_bsw_det", "arr_mcal_det", "arr_ecum_det",
    "arr_det_hooks", "arr_det_dlt", "arr_det_buf", "arr_det_halt", "arr_det_dem"
  ];
  const markerMap = {
    "active-dev": "url(#arrowDev)",
    "active-runtm": "url(#arrowRuntm)",
    "active-trans": "url(#arrowTrans)",
    "active-ok": "url(#arrowOk)",
    "active-info": "url(#arrowInfo)"
  };
  arrowIds.forEach(aid => {
    const p = document.getElementById(aid);
    if (!p) return;
    const tone = simState.activeArrows[aid] || "";
    p.setAttribute("class", "arr" + (tone ? " " + tone : ""));
    p.setAttribute("marker-end", markerMap[tone] || "url(#arrowNorm)");
  });
}

// ==================== RIGHT STICKY 4-TAB INSPECTOR ====================

function switchInspTab(tabName) {
  curInspTab = tabName;
  ["trace", "io", "callers", "code"].forEach(t => {
    const btn = document.getElementById("inspTabBtn_" + t);
    const pane = document.getElementById("inspPane_" + t);
    if (btn) btn.classList.toggle("active", t === tabName);
    if (pane) pane.classList.toggle("active", t === tabName);
  });
}

function renderTraceList() {
  const filter = document.getElementById("traceFilterSelect").value;
  const listEl = document.getElementById("traceList");
  const items = simState.traceLog.filter(it => filter === "ALL" || it.tag === filter);
  if (items.length === 0) {
    listEl.innerHTML = `<div class="io-blk"><p>Chưa có sự kiện trace nào phù hợp bộ lọc <code>${escapeHtml(filter)}</code>.</p></div>`;
    return;
  }
  listEl.innerHTML = items.map(it => `
    <div class="trace-item t-${escapeHtml(it.tag)}">
      <div class="tr-top">
        <span class="tr-tag">[${escapeHtml(it.tag)}] #${it.seq}</span>
        <span class="tr-meta">${escapeHtml(it.ctx)} &bull; ${escapeHtml(it.sws)}</span>
      </div>
      <div style="font-weight:700;margin-bottom:2px">${escapeHtml(it.title)}</div>
      <div style="color:var(--text-muted);font-size:11px">${escapeHtml(it.detail)}</div>
    </div>
  `).join("");
}

function clearTrace() {
  simState.traceLog = [];
  renderTraceList();
}

function renderModuleIo() {
  const box = document.getElementById("moduleIoContent");
  const info = MODULES_INFO[simState.selectedModule] || MODULES_INFO.MOD_DET;
  let slotHtml = "";
  if (simState.selectedBufferSlot >= 0 && simState.buffer[simState.selectedBufferSlot] && simState.buffer[simState.selectedBufferSlot].valid) {
    const sl = simState.buffer[simState.selectedBufferSlot];
    slotHtml = `<div class="io-blk" style="border-color:var(--accent-ok)">
      <h4>Selected RAM Buffer Slot [${sl.slot}]</h4>
      <p class="mono">Stream: ${sl.stream} | Mod=${sl.modName}(${sl.modId}), Inst=${sl.instId}, Api=${fmtHex(sl.apiId, 2)}, Err=${fmtHex(sl.errId, 2)}</p>
      <p style="font-size:11px;color:var(--text-muted)">${escapeHtml(sl.errName)} — ${escapeHtml(sl.note)}</p>
    </div>`;
  }

  let demCmpHtml = "";
  if (cfg.EnableSideBySideDemComparison) {
    demCmpHtml = `<div class="dem-cmp-card">
      <h4>&#9878; Ranh giới AUTOSAR: DET (Module 15) vs DEM (Module 54)</h4>
      <table class="tbl" style="font-size:11px;margin-bottom:4px">
        <tr><th>Tiêu chí</th><th>DET (Error Tracer)</th><th>DEM (Event Manager)</th></tr>
        <tr><td>Mục đích</td><td>Bắt bug code (0x01), tải runtime (0x04), ECC tạm thời (0x05)</td><td>Chẩn đoán hỏng xe thật (đứt dây, quá áp, cảm biến chết)</td></tr>
        <tr><td>Lưu trữ</td><td>RAM Ring Buffer / DLT / .noinit</td><td>Lưu lâu dài vào NvM (Non-Volatile Memory)</td></tr>
        <tr><td>Debounce &amp; DTC</td><td>KHÔNG có (báo tức thời 4-Tuple)</td><td>Có Debounce Counter, Aging, FreezeFrame &amp; DTC</td></tr>
        <tr><td>UDS Service</td><td>Không qua UDS</td><td>Đọc qua UDS 0x19 ReadDTCInformation</td></tr>
      </table>
      ${simState.lastPacket.demHint ? `<p style="font-size:11px;color:var(--accent-dev);font-weight:700">&#9888; ${escapeHtml(simState.lastPacket.demHint)}</p>` : ""}
    </div>`;
  }

  box.innerHTML = `
    ${slotHtml}
    <div class="io-blk">
      <h4>${escapeHtml(info.name)}</h4>
      <p><strong>ModuleId:</strong> <code>${escapeHtml(info.moduleId)}</code> &bull; <strong>Vai trò:</strong> ${escapeHtml(info.role)}</p>
    </div>
    <div class="io-blk"><h4>Mục đích &amp; Xử lý</h4><p>${escapeHtml(info.purpose)}</p></div>
    <div class="io-blk"><h4>Input lấy từ đâu?</h4><p>${escapeHtml(info.inputs)}</p></div>
    <div class="io-blk"><h4>Internal Logic</h4><p>${escapeHtml(info.internalLogic)}</p></div>
    <div class="io-blk"><h4>Output route đến đâu?</h4><p>${escapeHtml(info.outputs)}</p></div>
    <div class="io-blk">
      <h4>ECUC Config Impact &amp; SWS</h4>
      <p><strong>Params:</strong> <code>${escapeHtml(info.configImpact)}</code></p>
      <p><strong>SWS Refs:</strong> <code>${escapeHtml(info.swsRefs)}</code></p>
    </div>
    ${demCmpHtml}
  `;
}

function renderCallerMatrix() {
  const box = document.getElementById("callerMatrixContent");
  const callers = [
    { layer: "SWC", mod: "SWC_BrakeCtrl", id: cfg.SwcBrake_DetModuleId, api: "Rte_Call_DETService_ReportError", port: cfg.SwcBrake_DetPortEnabled ? "ENABLED" : "DISABLED", mode: "Via RTE PDAV" },
    { layer: "SWC", mod: "SWC_DiagApp", id: cfg.SwcDiag_DetModuleId, api: "Rte_Call_DETService_ReportRuntimeError", port: cfg.SwcDiag_DetPortEnabled ? "ENABLED" : "DISABLED", mode: "Via RTE PDAV" },
    { layer: "BSW", mod: "NvM", id: 20, api: "Det_ReportError / ReportRuntimeError", port: cfg.CallerDevErrorDetect ? "Dev=ON" : "Dev=OFF", mode: "Direct BSW Call" },
    { layer: "BSW", mod: "CanIf", id: 60, api: "Det_ReportError(60, ...)", port: cfg.CallerDevErrorDetect ? "Dev=ON" : "Dev=OFF", mode: "Direct BSW / ISR" },
    { layer: "BSW", mod: "WdgM", id: 13, api: "Det_ReportError(13, ...)", port: cfg.CallerDevErrorDetect ? "Dev=ON" : "Dev=OFF", mode: "Direct BSW Call" },
    { layer: "MCAL", mod: "Fls", id: 92, api: "0x01 Dev | 0x04 Runtm | 0x05 TransFault", port: "Always Trans", mode: "Returns Std_ReturnType" },
    { layer: "MCAL", mod: "Spi", id: 83, api: "Det_ReportTransientFault(83, ...)", port: "Always Trans", mode: "Recovery Retry" },
    { layer: "SELF", mod: "Det", id: 15, api: "Det_GetVersionInfo(NULL_PTR)", port: cfg.DetVersionInfoApi ? "API ON" : "API OFF", mode: "Self DET_E_PARAM_POINTER" }
  ];
  box.innerHTML = `
    <div class="io-blk">
      <h4>SWC &amp; BSW/MCAL Caller Interaction Matrix</h4>
      <p style="font-size:11px;color:var(--text-muted);margin-bottom:6px">Các SWC tầng Application KHÔNG tự truyền ModuleId; RTE sử dụng Port-Defined Argument Value (PDAV) tự động gán ModuleId &ge; 2048 (SWS_Det_00210).</p>
      <table class="tbl" style="font-size:11px">
        <thead><tr><th>Layer</th><th>Caller</th><th>ModId</th><th>Interface / Status</th></tr></thead>
        <tbody>
          ${callers.map(c => `<tr>
            <td><strong>${c.layer}</strong></td>
            <td>${c.mod}</td>
            <td class="mono">${c.id}</td>
            <td><div><code>${c.api}</code></div><div style="color:var(--text-dim);font-size:10px">${c.port} &bull; ${c.mode}</div></td>
          </tr>`).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderLiveCode() {
  const box = document.getElementById("liveCodeContent");
  const lp = simState.lastPacket;
  const callCode = lp.stream === "IDLE"
    ? `/* Trigger bất kỳ luồng lỗi nào để xem mã C AUTOSAR chuẩn */
Det_Init(NULL_PTR);
Det_Start();`
    : (lp.viaRte
      ? `/* SWC Application Code (KHÔNG #include "Det.h") */
(void)Rte_Call_DETService_Report${lp.stream === "RUNTM" ? "RuntimeError" : "Error"}(
  ${lp.instId}U,        /* InstanceId */
  ${fmtHex(lp.apiId, 2)}U,      /* ApiId */
  ${fmtHex(lp.errId, 2)}U       /* ${lp.errName} */
);
/* -> RTE Generated Stub tự chèn PDAV ModuleId = ${lp.modId}U: */
Det_Report${lp.stream === "RUNTM" ? "RuntimeError" : "Error"}(${lp.modId}U, ${lp.instId}U, ${fmtHex(lp.apiId, 2)}U, ${fmtHex(lp.errId, 2)}U);`
      : (lp.stream === "TRANS"
        ? `/* MCAL Driver Transient Fault Call (SWS_Det_00502) */
Std_ReturnType ret = Det_ReportTransientFault(
  ${lp.modId}U,        /* ${lp.modName} ModuleId */
  ${lp.instId}U,         /* InstanceId */
  ${fmtHex(lp.apiId, 2)}U,       /* ${lp.apiName} */
  ${fmtHex(lp.errId, 2)}U        /* ${lp.errName} */
);
if (ret != E_OK) {
  (void)Dem_SetEventStatus(DEM_EVENT_HARD_FAULT, DEM_EVENT_STATUS_FAILED);
}`
        : `/* ${lp.modName} (${lp.stream === "RUNTM" ? "Always active" : "#if DEV_ERROR_DETECT == STD_ON"}) */
(void)Det_Report${lp.stream === "RUNTM" ? "RuntimeError" : "Error"}(
  ${lp.modId}U,        /* ${lp.modName} */
  ${lp.instId}U,         /* InstanceId */
  ${fmtHex(lp.apiId, 2)}U,       /* ${lp.apiName} */
  ${fmtHex(lp.errId, 2)}U        /* ${lp.errName} */
);`));

  const cap = Math.max(1, Math.min(8, Number(cfg.DetErrorBufferSize) || 8));
  const ramLines = simState.buffer.slice(0, cap).map((s, idx) =>
    `  [${idx}] = { .Valid=${s.valid ? 1 : 0}, .Mod=${s.modId}, .Inst=${s.instId}, .Api=${fmtHex(s.apiId, 2)}, .Err=${fmtHex(s.errId, 2)} }, /* ${s.valid ? s.stream : "EMPTY"} */`
  ).join("\n");

  box.innerHTML = `
    <div class="io-blk">
      <h4>1. AUTOSAR Standard C Call Snippet</h4>
      <pre class="code-blk">${escapeHtml(callCode)}</pre>
    </div>
    <div class="io-blk">
      <h4>2. Live RAM Struct: Det_ErrorBuffer[${cap}]</h4>
      <pre class="code-blk">typedef struct { uint8 Valid; uint16 Mod; uint8 Inst; uint8 Api; uint8 Err; } Det_BufSlotType;
Det_BufSlotType Det_ErrorBuffer[${cap}] = {
${escapeHtml(ramLines)}
};</pre>
    </div>
  `;
}

// ==================== DEM-STYLE RICH FLOATING TOOLTIP (1050ms HOVER + CLICK PIN) ====================

let ttHoverTimer = null;
let ttPinnedKey = null;

function buildTooltipHtml(key) {
  const t = configTooltipData[key];
  if (!t) return "";
  return `
    <div class="tt-hdr">
      <div class="tt-title">${escapeHtml(t.title)}</div>
      <span class="tt-sws-badge">${escapeHtml(t.sws)}</span>
    </div>
    <div class="tt-path">${escapeHtml(t.ecucPath)}</div>
    <div class="tt-desc">${escapeHtml(t.desc)}</div>
    <div class="tt-grid">
      <div class="tt-box"><div class="tt-box-lbl">Dải giá trị / Kiểu</div><div class="tt-box-val">${escapeHtml(t.range)}</div></div>
      <div class="tt-box"><div class="tt-box-lbl">Giá trị khuyến nghị</div><div class="tt-box-val">${escapeHtml(t.typical)}</div></div>
    </div>
    <div class="tt-note"><strong>Lưu ý:</strong> ${escapeHtml(t.notes)}</div>
    <div class="tt-pin-hint">&#128204; Đã ghim tooltip — click ra ngoài hoặc nhấn ⓘ để đóng</div>
  `;
}

function showConfigTooltip(key, anchorEl, isPinned) {
  const pop = document.getElementById("cfgTooltipPopup");
  if (!pop || !configTooltipData[key]) return;
  pop.innerHTML = buildTooltipHtml(key);
  pop.classList.toggle("pinned", !!isPinned);
  pop.style.display = "block";

  const rect = anchorEl.getBoundingClientRect();
  const popW = Math.min(390, window.innerWidth - 24);
  const popH = pop.offsetHeight || 220;
  let left = rect.right + 10;
  if (left + popW > window.innerWidth - 12) {
    left = Math.max(12, rect.left - popW - 10);
  }
  let top = rect.top - 8;
  if (top + popH > window.innerHeight - 12) {
    top = Math.max(12, window.innerHeight - popH - 12);
  }
  pop.style.left = left + "px";
  pop.style.top = top + "px";
}

function hideConfigTooltip(force) {
  if (ttHoverTimer) {
    clearTimeout(ttHoverTimer);
    ttHoverTimer = null;
  }
  if (ttPinnedKey && !force) return;
  ttPinnedKey = null;
  document.querySelectorAll(".cfg-i.pinned").forEach(el => el.classList.remove("pinned"));
  const pop = document.getElementById("cfgTooltipPopup");
  if (pop) {
    pop.style.display = "none";
    pop.classList.remove("pinned");
  }
}

function initConfigTooltips() {
  document.querySelectorAll(".cfg-row[data-cfg-key]").forEach(row => {
    const key = row.getAttribute("data-cfg-key");
    row.addEventListener("mouseenter", () => {
      if (ttPinnedKey) return;
      if (ttHoverTimer) clearTimeout(ttHoverTimer);
      ttHoverTimer = setTimeout(() => {
        showConfigTooltip(key, row, false);
      }, 1050);
    });
    row.addEventListener("mouseleave", () => {
      if (ttHoverTimer) { clearTimeout(ttHoverTimer); ttHoverTimer = null; }
      if (!ttPinnedKey) hideConfigTooltip(true);
    });
  });

  document.querySelectorAll(".cfg-i[data-cfg-key]").forEach(btn => {
    btn.addEventListener("click", ev => {
      ev.stopPropagation();
      const key = btn.getAttribute("data-cfg-key");
      if (ttPinnedKey === key) {
        hideConfigTooltip(true);
      } else {
        hideConfigTooltip(true);
        ttPinnedKey = key;
        btn.classList.add("pinned");
        showConfigTooltip(key, btn, true);
      }
    });
  });

  document.addEventListener("click", ev => {
    if (!ttPinnedKey) return;
    const pop = document.getElementById("cfgTooltipPopup");
    if (pop && pop.contains(ev.target)) return;
    if (ev.target && ev.target.classList && ev.target.classList.contains("cfg-i")) return;
    hideConfigTooltip(true);
  });
}

// ==================== VIEW SWITCH, THEME TOGGLE & EXPORT MODAL ====================

function switchView(view) {
  const sim = document.getElementById("viewSim");
  const hb = document.getElementById("viewHb");
  const bSim = document.getElementById("btnViewSim");
  const bHb = document.getElementById("btnViewHb");
  const isHb = view === "hb";
  sim.style.display = isHb ? "none" : "block";
  hb.style.display = isHb ? "block" : "none";
  bSim.classList.toggle("active", !isHb);
  bHb.classList.toggle("active", isHb);
  if (isHb && typeof renderCurrentHandbookView === "function") {
    renderCurrentHandbookView();
  }
}

function toggleTheme() {
  const html = document.documentElement;
  const cur = html.getAttribute("data-theme") || "dark";
  const next = cur === "dark" ? "light" : "dark";
  html.setAttribute("data-theme", next);
  const btn = document.getElementById("btnThemeToggle");
  if (btn) btn.innerHTML = next === "dark" ? "&#9728; Light" : "&#127769; Dark";
}

function openExportModal() {
  document.getElementById("exportModal").classList.add("open");
  switchExportTab(curExportTab || "arxml");
}

function closeExportModal() {
  document.getElementById("exportModal").classList.remove("open");
}

function switchExportTab(tab) {
  curExportTab = tab;
  ["arxml", "h", "c", "json"].forEach(t => {
    const b = document.getElementById("expTab_" + t);
    if (b) b.classList.toggle("active", t === tab);
  });
  const area = document.getElementById("exportCodeArea");
  if (tab === "arxml") area.value = generateDetArxml();
  else if (tab === "h") area.value = generateDetCfgH();
  else if (tab === "c") area.value = generateDetCfgC();
  else area.value = JSON.stringify({ config: cfg, simState: simState }, null, 2);
}

function copyExportCode() {
  const area = document.getElementById("exportCodeArea");
  area.select();
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(area.value);
    } else {
      document.execCommand("copy");
    }
  } catch (e) {}
}

function downloadExportFile() {
  const extMap = { arxml: "Det_ecuc.arxml", h: "Det_Cfg.h", c: "Det_Cfg.c", json: "Det_SimState.json" };
  const text = document.getElementById("exportCodeArea").value;
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = extMap[curExportTab] || "det_export.txt";
  a.click();
}

function downloadStandaloneHTML() {
  const htmlContent = "<!DOCTYPE html>\n" + document.documentElement.outerHTML;
  const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "AUTOSAR_Det_Simulator.html";
  a.click();
}

function escapeHtml(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
