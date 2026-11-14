// ================= PART 5: UI RENDERERS, SCENARIO STEPPER, TOOLTIP (>1S) & EXPORTS =================

let currentScenarioIdx = 0;
let currentStepIdx = 0;
let scenarioSnapshots = [];
let autoPlayTimer = null;
let autoClockTimer = null;
let currentInspTab = 0;
let currentCfgTab = 0;
let currentExportTab = 0;
let tooltipHoverTimer = null;

function escapeHtmlSafe(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\x22/g, "&quot;");
}

// -------------------- SCENARIO STEPPER & SNAPSHOTS --------------------

function captureScenarioSnapshot() {
  return {
    ecucConfig: JSON.parse(JSON.stringify(ecucConfig)),
    simState: JSON.parse(JSON.stringify(simState))
  };
}

function restoreScenarioSnapshot(snap) {
  if (!snap) return;
  ecucConfig = JSON.parse(JSON.stringify(snap.ecucConfig));
  simState = JSON.parse(JSON.stringify(snap.simState));
  syncConfigToDOM();
}

function loadScenario(scenIdx) {
  stopAutoPlay();
  currentScenarioIdx = Math.max(0, Math.min(SCENARIOS.length - 1, scenIdx));
  const sc = SCENARIOS[currentScenarioIdx];
  document.getElementById("scenSelect").value = sc.id;
  sc.setup();
  syncConfigToDOM();
  currentStepIdx = 0;
  scenarioSnapshots = [captureScenarioSnapshot()];
  simState.stepExplain = sc.summary;
  renderAll();
}

function onScenarioSelectChange() {
  const id = document.getElementById("scenSelect").value;
  const idx = SCENARIOS.findIndex((s) => s.id === id);
  if (idx >= 0) loadScenario(idx);
}

function resetCurrentScenario() {
  loadScenario(currentScenarioIdx);
}

function nextScenarioStep() {
  const sc = SCENARIOS[currentScenarioIdx];
  if (!sc || currentStepIdx >= sc.steps.length) {
    stopAutoPlay();
    return;
  }
  const stepObj = sc.steps[currentStepIdx];
  simState.activeArrows = [];
  stepObj.exec();
  syncConfigToDOM();
  currentStepIdx += 1;
  simState.stepExplain = "Bước " + currentStepIdx + "/" + sc.steps.length + " — " + stepObj.title + ": " + stepObj.desc;
  scenarioSnapshots[currentStepIdx] = captureScenarioSnapshot();
  renderAll();
}

function prevScenarioStep() {
  stopAutoPlay();
  if (currentStepIdx <= 0) return;
  currentStepIdx -= 1;
  if (scenarioSnapshots[currentStepIdx]) {
    restoreScenarioSnapshot(scenarioSnapshots[currentStepIdx]);
  }
  renderAll();
}

function stopAutoPlay() {
  if (autoPlayTimer) {
    clearInterval(autoPlayTimer);
    autoPlayTimer = null;
  }
  const btn = document.getElementById("btnAutoPlay");
  if (btn) btn.textContent = "▶ Tự Chạy";
}

function toggleScenarioAutoPlay() {
  if (autoPlayTimer) {
    stopAutoPlay();
    return;
  }
  const btn = document.getElementById("btnAutoPlay");
  if (btn) btn.textContent = "⏸ Dừng";
  autoPlayTimer = setInterval(() => {
    const sc = SCENARIOS[currentScenarioIdx];
    if (currentStepIdx >= sc.steps.length) {
      stopAutoPlay();
    } else {
      nextScenarioStep();
    }
  }, 1500);
}

function toggleAutoClock() {
  const btn = document.getElementById("btnAutoClock");
  if (autoClockTimer) {
    clearInterval(autoClockTimer);
    autoClockTimer = null;
    if (btn) btn.textContent = "⏱ Auto";
    return;
  }
  if (btn) btn.textContent = "⏹ Stop";
  autoClockTimer = setInterval(() => {
    stepMainFunctionTick();
  }, 500);
}

function runWhatIf(idx) {
  const sc = SCENARIOS[currentScenarioIdx];
  const wf = sc && sc.whatIfs && sc.whatIfs[idx];
  if (!wf) return;
  simState.activeArrows = [];
  wf.run();
  syncConfigToDOM();
  simState.stepExplain = "🧪 Thử Nghiệm Nhanh (" + wf.label + ") — Quan sát thay đổi tại Bảng 3 Thuật Toán, Thanh Ghi 8-Bit & State Machines!";
  renderAll();
}

// -------------------- QUICK ACTIONS --------------------

function onQaSeSelectChange() {
  const sid = Number(document.getElementById("qaSeSelect").value || 0);
  simState.selectedSeId = sid;
  renderAll();
}

function selectSeEntity(seId) {
  simState.selectedSeId = seId;
  const sel = document.getElementById("qaSeSelect");
  if (sel) sel.value = String(seId);
  renderAll();
}

function qaReachCheckpoint(cpId) {
  const sid = Number(document.getElementById("qaSeSelect").value || 0);
  simState.activeArrows = [];
  api_WdgM_CheckpointReached(sid, cpId);
  simState.stepExplain = "Quick Action: Gọi WdgM_CheckpointReached(SE_" + sid + ", CP_" + cpId + ") tại t = " + simState.clockMs + " ms.";
  renderAll();
}

function qaRunHealthyCycle() {
  const sid = Number(document.getElementById("qaSeSelect").value || 0);
  simState.activeArrows = [];
  simState.clockMs += 1;
  api_WdgM_CheckpointReached(sid, 0);
  simState.clockMs += 4;
  api_WdgM_CheckpointReached(sid, 1);
  simState.clockMs += 2;
  api_WdgM_CheckpointReached(sid, 2);
  simState.stepExplain = "Quick Action: Chạy trọn vẹn 1 vòng chuẩn CP_0 → (+4ms) CP_1 → (+2ms) CP_2 cho SE_" + sid + ".";
  renderAll();
}

function qaCycleWdgMode() {
  const modes = ["FAST_MODE", "SLOW_MODE", "OFF_MODE"];
  const idx = modes.indexOf(ecucConfig.ActiveWdgMMode);
  const next = modes[(idx + 1) % modes.length];
  simState.activeArrows = [];
  const ok = api_WdgM_SetMode(next);
  syncConfigToDOM();
  simState.stepExplain = "Quick Action: WdgM_SetMode(" + next + ") → " + (ok ? "Thành công" : "Bị chặn / Lỗi!") + ".";
  renderAll();
}

function onFaultKindChange() {
  const kind = document.getElementById("qaFaultKind").value;
  const map = {
    MISS_ALIVE: "AC=0",
    BABBLING: "AC=5",
    DEADLINE_LATE: "Δt=12ms",
    DEADLINE_EARLY: "Δt=1ms",
    LOGICAL_SKIP: "CP0→CP2"
  };
  document.getElementById("qaTxtFaultKind").textContent = map[kind] || "Fault";
}

function qaInjectSelectedFault() {
  const sid = Number(document.getElementById("qaSeSelect").value || 0);
  const kind = document.getElementById("qaFaultKind").value;
  simState.activeArrows = [];
  if (kind === "MISS_ALIVE") {
    simState.entities[sid].alive.ac = 0;
    simState.entities[sid].alive.sc = Math.max(0, Number(ecucConfig.WdgMSupervisionReferenceCycle) - 1);
    api_WdgM_MainFunction();
    simState.stepExplain = "Fault Injection: Bỏ qua xung Alive của SE_" + sid + " (AC=0) và gọi WdgM_MainFunction().";
  } else if (kind === "BABBLING") {
    for (let i = 0; i < 5; i++) api_WdgM_CheckpointReached(sid, 0);
    simState.entities[sid].alive.sc = Math.max(0, Number(ecucConfig.WdgMSupervisionReferenceCycle) - 1);
    api_WdgM_MainFunction();
    simState.stepExplain = "Fault Injection: Babbling Task bắn 5 xung CP_0 liên tiếp rồi gọi WdgM_MainFunction().";
  } else if (kind === "DEADLINE_LATE") {
    api_WdgM_CheckpointReached(0, 0);
    simState.clockMs += Number(ecucConfig.WdgMDeadlineMax) + 4;
    api_WdgM_CheckpointReached(0, 1);
    simState.stepExplain = "Fault Injection: Trễ Deadline (Δt > Tmax) tại CP_1_Run!";
  } else if (kind === "DEADLINE_EARLY") {
    api_WdgM_CheckpointReached(0, 0);
    simState.clockMs += Math.max(0, Number(ecucConfig.WdgMDeadlineMin) - 1);
    api_WdgM_CheckpointReached(0, 1);
    simState.stepExplain = "Fault Injection: Hoàn thành quá sớm (Δt < Tmin) tại CP_1_Run!";
  } else if (kind === "LOGICAL_SKIP") {
    simState.entities[0].logical.activityFlag = false;
    api_WdgM_CheckpointReached(0, 0);
    api_WdgM_CheckpointReached(0, 2);
    simState.stepExplain = "Fault Injection: Nhảy cóc Logical CP_0 → CP_2 (bỏ qua CP_1)!";
  }
  renderAll();
}

function qaPerformReset() {
  simState.activeArrows = [];
  api_WdgM_PerformReset();
  simState.stepExplain = "Quick Action: Gọi khẩn cấp WdgM_PerformReset() → GLOBAL_STATUS_STOPPED & cắt xung WdgIf(0)!";
  renderAll();
}

function qaResetAllOk() {
  api_ClearFirstExpiredRAM();
  api_WdgM_Init(true, "FAST_MODE");
  syncConfigToDOM();
  simState.stepExplain = "Quick Action: Khởi tạo lại WdgM_Init() và xóa RAM FirstExpiredSEID về trạng thái OK mặc định.";
  renderAll();
}

// -------------------- INTERACTIVE BIT CLICKS --------------------

function toggleRegisterBit(regType, mask) {
  const se = simState.entities[simState.selectedSeId];
  simState.activeArrows = [];
  if (regType === "A") {
    if (mask === 0x40) {
      se.alive.res = (se.alive.res === "ERR") ? "OK" : "ERR";
    } else if (mask === 0x20) {
      se.deadline.res = (se.deadline.res === "ERR") ? "OK" : "ERR";
    } else if (mask === 0x10) {
      se.logical.res = (se.logical.res === "ERR") ? "OK" : "ERR";
    } else if (mask === 0x08) {
      se.logical.activityFlag = !se.logical.activityFlag;
    } else if (mask === 0x02) {
      api_WdgM_CheckpointReached(0, 0);
      api_WdgM_CheckpointReached(0, 2);
      api_WdgM_MainFunction();
    }
  } else if (regType === "B") {
    if (mask === 0x80) {
      api_WdgM_Init(!simState.initialized);
    } else if (mask === 0x20) {
      api_ClearFirstExpiredRAM();
    } else if (mask === 0x08) {
      api_WdgM_PerformReset();
    } else if (mask === 0x40) {
      api_WdgM_MainFunction();
    }
  }
  syncConfigToDOM();
  renderAll();
}

// -------------------- CONFIG SYNC & VALIDATION --------------------

function switchCfgTab(idx) {
  currentCfgTab = idx;
  for (let i = 0; i < 6; i++) {
    const btn = document.getElementById("cfgTabBtn" + i);
    const pane = document.getElementById("cfgPane" + i);
    if (btn) btn.classList.toggle("active", i === idx);
    if (pane) pane.classList.toggle("hidden", i !== idx);
  }
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
}

function onConfigInputChanged(key) {
  const el = document.getElementById("cfg_" + key);
  if (!el) return;
  let val;
  if (el.type === "checkbox") val = el.checked;
  else if (el.type === "number") val = Number(el.value);
  else val = el.value;

  ecucConfig[key] = val;

  if (key === "WdgMInitialized") {
    api_WdgM_Init(Boolean(val), ecucConfig.ActiveWdgMMode);
  } else if (key === "ActiveWdgMMode") {
    api_WdgM_SetMode(String(val));
  } else if (key === "ExternalGraphEnabled") {
    simState.externalGraph.res = val ? "OK" : "NA";
  }

  simState.stepExplain = "Cấu hình ECUC [" + key + "] đã cập nhật thành: " + String(val) + ".";
  syncConfigToDOM();
  renderAll();
}

function renderConfigWarnings() {
  const warns = [];
  if (Number(ecucConfig.WdgMDeadlineMin) > Number(ecucConfig.WdgMDeadlineMax)) {
    warns.push("⚠ WdgMDeadlineMin (" + ecucConfig.WdgMDeadlineMin + "ms) > WdgMDeadlineMax (" + ecucConfig.WdgMDeadlineMax + "ms)!");
  }
  if (Number(ecucConfig.WdgMTriggerConditionValue_Int) <= Number(ecucConfig.WdgMSupervisionCycle)) {
    warns.push("⚠ TriggerCondition_Int (" + ecucConfig.WdgMTriggerConditionValue_Int + "ms) ≤ SupervisionCycle (" + ecucConfig.WdgMSupervisionCycle + "ms) dễ gây quá hạn phần cứng!");
  }
  if (ecucConfig.ExternalWindowWdgEnabled && Number(ecucConfig.WindowWdgClosedWindowMs) >= Number(ecucConfig.WdgMTriggerConditionValue_Ext)) {
    warns.push("⚠ WindowWdgClosedWindowMs ≥ TriggerCondition_Ext sẽ chặn hết cửa sổ mở!");
  }
  if (Number(ecucConfig.WdgMExpectedAliveIndications) < Number(ecucConfig.WdgMMinMargin)) {
    warns.push("ℹ EAI < MinMargin: Giới hạn dưới bị kẹp về 0 xung.");
  }
  const box = document.getElementById("cfgValidationBox");
  box.innerHTML = warns.map((w) => '<div class="cfg-warn-banner">' + escapeHtmlSafe(w) + '</div>').join("");
}

// -------------------- RENDER HEADER & SUMMARY --------------------

function badgeClassForStatus(st) {
  if (st === "OK") return "sb-ok";
  if (st === "FAILED") return "sb-warn";
  if (st === "EXPIRED" || st === "STOPPED") return "sb-err";
  return "sb-deact";
}

function renderHeaderAndQuickActions() {
  const sc = SCENARIOS[currentScenarioIdx];
  document.getElementById("stepIndicator").textContent = "Bước " + currentStepIdx + " / " + sc.steps.length;
  document.getElementById("btnPrevStep").disabled = (currentStepIdx <= 0);
  document.getElementById("btnNextStep").disabled = (currentStepIdx >= sc.steps.length);
  document.getElementById("clockVal").textContent = simState.clockMs + " ms";

  const bGlb = document.getElementById("hdrBadgeGlobal");
  bGlb.textContent = "Global: " + simState.globalStatus;
  bGlb.className = "state-badge " + badgeClassForStatus(simState.globalStatus);

  const se0 = simState.entities[0];
  const bSe0 = document.getElementById("hdrBadgeSe0");
  bSe0.textContent = "SE0: " + se0.localStatus;
  bSe0.className = "state-badge " + badgeClassForStatus(se0.localStatus);

  const bWdg = document.getElementById("hdrBadgeWdgIf");
  bWdg.textContent = simState.wdgIf.hwResetTriggered ? "HW RESET!" : ("WdgIf: " + simState.wdgIf.intTimeoutMs + "ms");
  bWdg.className = "state-badge " + (simState.wdgIf.intTimeoutMs === 0 || simState.wdgIf.hwResetTriggered ? "sb-err" : "sb-cyan");

  const bFe = document.getElementById("hdrBadgeFirstExp");
  const fe = simState.firstExpired;
  bFe.textContent = fe.latched ? ("1stExp: SE_" + fe.seId) : "1stExp: NONE";
  bFe.className = "state-badge " + (fe.latched ? "sb-err" : "sb-deact");

  const modeShort = ecucConfig.ActiveWdgMMode.replace("_MODE", "");
  document.getElementById("qaTxtMode").textContent = modeShort;
  document.getElementById("qaSeSelect").value = String(simState.selectedSeId);

  document.getElementById("scenIdBadge").textContent = sc.id;
  document.getElementById("scenSummaryBox").innerHTML = "<b>" + escapeHtmlSafe(sc.title) + "</b><br/>" + escapeHtmlSafe(sc.summary);

  const wfBox = document.getElementById("whatIfContainer");
  wfBox.innerHTML = sc.whatIfs.map((w, idx) =>
    '<button class="whatif-btn" onclick="runWhatIf(' + idx + ')">' + escapeHtmlSafe(w.label) + '</button>'
  ).join("");
}

// -------------------- RENDER PANEL 1: 3 ALGORITHMS + DUAL 8-BIT --------------------

function pillForStatus(st) {
  if (st === "OK") return '<span class="pill pill-ok">OK</span>';
  if (st === "FAILED") return '<span class="pill pill-warn">FAILED</span>';
  if (st === "EXPIRED") return '<span class="pill pill-err">EXPIRED</span>';
  return '<span class="pill pill-mut">DEACT</span>';
}

function renderPanel1AlgorithmsAndRegs() {
  // 1. SE Matrix
  const matrixHtml = simState.entities.map((se) => {
    const sel = se.id === simState.selectedSeId ? " selected-se" : "";
    const tol = se.id === 0 ? ecucConfig.WdgMFailedAliveSupervisionRefCycleTol : (se.id === 1 ? ecucConfig.SE1_FailedAliveTol : 0);
    return '<div class="se-card' + sel + '" onclick="selectSeEntity(' + se.id + ')">' +
      '<div class="se-card-top"><span>' + (se.id === simState.selectedSeId ? "▶ " : "") + 'SE_' + se.id + ': ' + escapeHtmlSafe(se.shortName) + '</span>' + pillForStatus(se.localStatus) + '</div>' +
      '<div class="se-card-meta"><span>Alv:' + se.alive.res + ' · Dl:' + se.deadline.res + ' · Lg:' + se.logical.res + '</span><span class="mono">Tol:' + se.alive.failedCnt + '/' + tol + '</span></div>' +
    '</div>';
  }).join("");
  document.getElementById("seMatrixBox").innerHTML = matrixHtml;

  // 2. 3 Algorithms Anatomy for selected SE
  const se = simState.entities[simState.selectedSeId];
  document.getElementById("algoTitleLbl").textContent = "🧮 Giải Phẫu 3 Thuật Toán Thực Thể: " + se.name;
  document.getElementById("algoSummaryLbl").textContent = "Mode: " + ecucConfig.ActiveWdgMMode + " | Cycle: " + ecucConfig.WdgMSupervisionCycle + "ms";

  const eai = se.id === 0 ? Number(ecucConfig.WdgMExpectedAliveIndications) : (se.id === 1 ? Number(ecucConfig.SE1_ExpectedAlive) : 1);
  const src = se.id === 0 ? Number(ecucConfig.WdgMSupervisionReferenceCycle) : 1;
  const minM = se.id === 0 ? Number(ecucConfig.WdgMMinMargin) : 0;
  const maxM = se.id === 0 ? Number(ecucConfig.WdgMMaxMargin) : 0;
  const lo = Math.max(0, eai - minM);
  const hi = eai + maxM;
  const tol = se.id === 0 ? ecucConfig.WdgMFailedAliveSupervisionRefCycleTol : (se.id === 1 ? ecucConfig.SE1_FailedAliveTol : 0);
  const alvEnabled = (se.id === 0 && ecucConfig.SE0_AliveEnabled) || (se.id === 1 && ecucConfig.SE1_AliveEnabled) || se.id === 2;

  const alvClass = !se.activeInMode || !alvEnabled ? "res-off" : (se.alive.res === "ERR" ? "res-err" : "res-ok");
  const alvCard = '<div class="algo-card ' + alvClass + '">' +
    '<div class="algo-top"><span>🔄 Alive Supervision</span>' + (alvEnabled && se.activeInMode ? pillForStatus(se.alive.res === "ERR" ? "FAILED" : "OK") : '<span class="pill pill-mut">OFF</span>') + '</div>' +
    '<div class="algo-formula mono">SC: ' + se.alive.sc + '/' + src + ' | AC: <b>' + se.alive.ac + '</b><br/>Check: ' + lo + ' ≤ AC ≤ ' + hi + '</div>' +
    '<div class="algo-sub">EAI=' + eai + ' (-' + minM + '/+' + maxM + ') · FailCnt: <b>' + se.alive.failedCnt + '/' + tol + '</b></div>' +
  '</div>';

  const dlEnabled = se.id === 0 && ecucConfig.SE0_DeadlineEnabled && se.activeInMode;
  const dlClass = !dlEnabled ? "res-off" : (se.deadline.res === "ERR" ? "res-err" : "res-ok");
  const curDt = se.deadline.pending ? (simState.clockMs - se.deadline.tStart) : (se.deadline.lastDt !== null ? se.deadline.lastDt : "--");
  const dlStatusStr = se.deadline.pending ? ("Đang đo (" + curDt + "ms)") : (se.deadline.timedOut ? "TIMEOUT!" : (se.deadline.res === "ERR" ? "VIOLATION" : "CORRECT"));
  const dlCard = '<div class="algo-card ' + dlClass + '">' +
    '<div class="algo-top"><span>⏱️ Deadline Supervision</span>' + (dlEnabled ? (se.deadline.res === "ERR" ? '<span class="pill pill-err">ERR</span>' : '<span class="pill pill-ok">OK</span>') : '<span class="pill pill-mut">OFF</span>') + '</div>' +
    '<div class="algo-formula mono">CP_' + ecucConfig.WdgMDeadlineStartRef + ' → CP_' + ecucConfig.WdgMDeadlineStopRef + ': Δt = <b>' + curDt + ' ms</b><br/>Ngưỡng: [' + ecucConfig.WdgMDeadlineMin + ' .. ' + ecucConfig.WdgMDeadlineMax + '] ms</div>' +
    '<div class="algo-sub">' + dlStatusStr + ' · TimeoutDet: ' + (ecucConfig.WdgMEnableDeadlineTimeoutDetection ? "ON" : "OFF") + ' · Tol=0!</div>' +
  '</div>';

  const lgEnabled = ((se.id === 0 && ecucConfig.SE0_InternalGraphEnabled) || ecucConfig.ExternalGraphEnabled) && se.activeInMode;
  const lgClass = !lgEnabled ? "res-off" : (se.logical.res === "ERR" ? "res-err" : "res-ok");
  const cpBtn = (cp) => {
    const active = se.logical.lastCp === cp;
    const cls = (se.logical.res === "ERR" && active) ? " cp-err" : (active ? " cp-active" : "");
    return '<button class="cp-node-btn' + cls + '" onclick="api_WdgM_CheckpointReached(' + se.id + ',' + cp + ');renderAll();">CP_' + cp + '</button>';
  };
  const lgCard = '<div class="algo-card ' + lgClass + '">' +
    '<div class="algo-top"><span>🕸️ Logical Graph</span>' + (lgEnabled ? (se.logical.res === "ERR" ? '<span class="pill pill-err">ERR</span>' : '<span class="pill pill-ok">OK</span>') : '<span class="pill pill-mut">OFF</span>') + '</div>' +
    '<div class="cp-graph-bar">' + cpBtn(0) + '<span class="cp-edge">→</span>' + cpBtn(1) + '<span class="cp-edge">→</span>' + cpBtn(2) + '</div>' +
    '<div class="algo-sub" style="margin-top:4px">Actv: <b>' + (se.logical.activityFlag ? "TRUE" : "FALSE") + '</b> · Edge: <span class="mono">' + escapeHtmlSafe(se.logical.lastEdge) + '</span>' +
      (ecucConfig.ExternalGraphEnabled ? ('<br/>ExtGraph: <b class="mono">' + escapeHtmlSafe(simState.externalGraph.lastEdge) + '</b>') : '') + '</div>' +
  '</div>';

  document.getElementById("algoCardsBox").innerHTML = alvCard + dlCard + lgCard;

  // 3. FirstExpiredSEID RAM Bar
  const fe = simState.firstExpired;
  const feBar = document.getElementById("firstExpBar");
  feBar.className = "first-exp-bar" + (fe.latched ? " latched" : "");
  feBar.innerHTML = '<div><b>🔒 WdgM_FirstExpiredSEID (NO_INIT_RAM):</b> ' +
    (fe.latched
      ? ('<span class="mono" style="color:var(--err);font-weight:800">SE_' + fe.seId + ' (' + simState.entities[fe.seId].shortName + ')</span> | ~SEID: <span class="mono">0x' + fe.invSeId.toString(16).toUpperCase().padStart(2, "0") + '</span> | RAM: ' + (fe.ramValid ? '<b style="color:var(--ok)">VALID</b>' : '<b style="color:var(--err)">CORRUPTED!</b>'))
      : '<span class="mono" style="color:var(--mut)">NONE (InvRAM = 0xFF)</span>') +
    '</div>' +
    '<div style="display:flex;gap:5px"><button class="btn btn-sm" onclick="api_WdgM_GetFirstExpiredSEID();renderAll()">🔍 Đọc SEID</button><button class="btn btn-sm" onclick="api_ClearFirstExpiredRAM();renderAll()">🧹 Xóa RAM</button></div>';

  // 4. Dual 8-bit Registers
  const byteA = computeLocalStatusByte(simState.selectedSeId);
  const byteB = computeGlobalControlByte();
  document.getElementById("regATitle").textContent = "Thanh A: WdgM_LocalStatusByte (SE_" + se.id + " · 0x0" + localStatusCode(se.localStatus) + " " + se.localStatus + ")";
  document.getElementById("regAHex").textContent = "0x" + byteA.toString(16).toUpperCase().padStart(2, "0") + " (" + byteA.toString(2).padStart(8, "0") + "b)";
  document.getElementById("regBHex").textContent = "0x" + byteB.toString(16).toUpperCase().padStart(2, "0") + " (" + byteB.toString(2).padStart(8, "0") + "b)";

  document.getElementById("regABits").innerHTML = WDGM_LOCAL_BITS.map((b) => {
    const on = (byteA & b.mask) !== 0;
    const changed = ((byteA ^ simState.prevRegA) & b.mask) !== 0;
    const onCls = on ? (b.tone === "err" ? " on-err" : (b.tone === "warn" ? " on-warn" : " on")) : "";
    return '<div class="bit-box' + onCls + (changed ? " bit-changed" : "") + '" title="' + escapeHtmlSafe(b.name + ": " + b.desc) + '" onclick="toggleRegisterBit(\'A\',' + b.mask + ')">' +
      '<div class="bit-idx">B' + b.bit + '</div>' +
      '<div class="bit-val mono">' + (on ? "1" : "0") + '</div>' +
      '<div class="bit-tag">' + b.tag + '</div>' +
    '</div>';
  }).join("");

  document.getElementById("regBBits").innerHTML = WDGM_GLOBAL_BITS.map((b) => {
    const on = (byteB & b.mask) !== 0;
    const changed = ((byteB ^ simState.prevRegB) & b.mask) !== 0;
    const onCls = on ? (b.tone === "err" ? " on-err" : (b.tone === "warn" ? " on-warn" : " on")) : "";
    return '<div class="bit-box' + onCls + (changed ? " bit-changed" : "") + '" title="' + escapeHtmlSafe(b.name + ": " + b.desc) + '" onclick="toggleRegisterBit(\'B\',' + b.mask + ')">' +
      '<div class="bit-idx">B' + b.bit + '</div>' +
      '<div class="bit-val mono">' + (on ? "1" : "0") + '</div>' +
      '<div class="bit-tag">' + b.tag + '</div>' +
    '</div>';
  }).join("");
}

// -------------------- RENDER PANEL 2: TIMERS, WINDOW WDG & DUAL STATE MACHINES --------------------

function renderPanel2TimersAndStates() {
  const se0 = simState.entities[0];
  const src = Math.max(1, Number(ecucConfig.WdgMSupervisionReferenceCycle));
  const aliveTol = Math.max(1, Number(ecucConfig.WdgMFailedAliveSupervisionRefCycleTol));
  const globTol = Math.max(1, Number(ecucConfig.WdgMExpiredSupervisionCycleTol));
  const intMax = Math.max(1, Number(ecucConfig.WdgMTriggerConditionValue_Int));

  document.getElementById("wdgModeBadge").textContent = ecucConfig.ActiveWdgMMode + " | WdgIf: " + simState.wdgIf.intTimeoutMs + "ms" + (ecucConfig.ExternalWindowWdgEnabled ? " + SBC WinWdg" : "");

  const timerCard = (lbl, valTxt, pct, fillCls) =>
    '<div class="timer-card"><div class="timer-top"><span>' + lbl + '</span><span class="mono">' + valTxt + '</span></div>' +
    '<div class="timer-bar"><div class="timer-fill ' + fillCls + '" style="width:' + Math.min(100, Math.max(0, pct)) + '%"></div></div></div>';

  document.getElementById("timersGrid").innerHTML =
    timerCard("Alive Ref Cycle", se0.alive.sc + " / " + src, (se0.alive.sc / src) * 100, "") +
    timerCard("SE0 FailAliveTol", se0.alive.failedCnt + " / " + ecucConfig.WdgMFailedAliveSupervisionRefCycleTol, (se0.alive.failedCnt / aliveTol) * 100, se0.alive.failedCnt > 0 ? "warn" : "ok") +
    timerCard("Global ExpTol", simState.expiredCycleCnt + " / " + ecucConfig.WdgMExpiredSupervisionCycleTol, (simState.expiredCycleCnt / globTol) * 100, simState.globalStatus === "STOPPED" ? "err" : (simState.expiredCycleCnt > 0 ? "warn" : "ok")) +
    timerCard("HW Wdg Rem", simState.wdgIf.intRemainingMs + " / " + intMax + "ms", (simState.wdgIf.intRemainingMs / intMax) * 100, simState.wdgIf.intRemainingMs <= 5 ? "err" : "ok");

  // Window Watchdog Visualization
  const closedMs = Number(ecucConfig.WindowWdgClosedWindowMs);
  const extTmo = Math.max(1, Number(ecucConfig.WdgMTriggerConditionValue_Ext));
  const closedPct = Math.min(90, (closedMs / extTmo) * 100);
  const trigPosPct = Math.min(98, Math.max(2, (simState.wdgIf.lastTriggerDeltaMs / extTmo) * 100));
  document.getElementById("wdgWindowBox").innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:center;font-size:10.5px;font-weight:700">' +
    '<span>🪟 Cửa Sổ Nuôi Watchdog (WdgIf Dev 0: MCU | Dev 1: ' + (ecucConfig.ExternalWindowWdgEnabled ? 'SBC Window Wdg ON' : 'SBC Disabled') + ')</span>' +
    '<span class="mono" style="color:' + (simState.wdgIf.windowViolation || simState.wdgIf.hwResetTriggered ? 'var(--err)' : 'var(--ok)') + '">' +
    (simState.wdgIf.hwResetTriggered ? "🚨 HARDWARE RESET TRIGGERED!" : ("Closed: [0.." + closedMs + "ms] | Open: [" + closedMs + ".." + extTmo + "ms] | Last Trig Δ: " + simState.wdgIf.lastTriggerDeltaMs + "ms")) +
    '</span></div>' +
    '<div class="win-track">' +
      '<div class="win-closed" style="width:' + closedPct + '%" title="Closed Window (Cấm kích sớm)"></div>' +
      '<div class="win-open" title="Open Window (Vùng kích hợp lệ)"></div>' +
      '<div class="win-marker" style="left:' + trigPosPct + '%" title="Lần kích xung gần nhất: ' + simState.wdgIf.lastTriggerDeltaMs + 'ms"></div>' +
    '</div>';

  // Local State Machine
  const se = simState.entities[simState.selectedSeId];
  document.getElementById("smLocalLbl").textContent = "SE_" + se.id + ": " + se.localStatus;
  const localNodes = [
    { id: "OK", title: "WDGM_LOCAL_STATUS_OK (0x00)", sub: "Alive, Deadline & Logical đạt chuẩn", cls: "active-ok" },
    { id: "FAILED", title: "WDGM_LOCAL_STATUS_FAILED (0x01)", sub: "CHỈ dành cho lỗi Alive ≤ Tolerance (có thể tự hồi phục)", cls: "active-warn" },
    { id: "EXPIRED", title: "WDGM_LOCAL_STATUS_EXPIRED (0x02)", sub: "Vượt Alive Tol hoặc sai Deadline/Logical (Không tự hồi!)", cls: "active-err" },
    { id: "DEACTIVATED", title: "WDGM_LOCAL_STATUS_DEACTIVATED (0x04)", sub: "Tắt trong WdgMMode hiện tại hoặc chưa Init", cls: "active-deact" }
  ];
  document.getElementById("localSmDiagram").innerHTML = localNodes.map((n) =>
    '<div class="sm-node ' + (se.localStatus === n.id ? n.cls : "") + '">' +
      '<div class="sm-node-hdr"><span>' + n.title + '</span>' + (se.localStatus === n.id ? '<span>● ACTIVE</span>' : '') + '</div>' +
      '<div class="sm-node-sub">' + n.sub + '</div>' +
    '</div>'
  ).join("");

  // Global State Machine
  document.getElementById("smGlobalLbl").textContent = "GLOBAL_" + simState.globalStatus;
  const globalNodes = [
    { id: "OK", title: "WDGM_GLOBAL_STATUS_OK (0x00)", sub: "Mọi SE đạt OK/DEACTIVATED · Nuôi WdgIf đầy đủ", cls: "active-ok" },
    { id: "FAILED", title: "WDGM_GLOBAL_STATUS_FAILED (0x01)", sub: "Có ít nhất 1 SE FAILED · Vẫn nuôi WdgIf", cls: "active-warn" },
    { id: "EXPIRED", title: "WDGM_GLOBAL_STATUS_EXPIRED (0x02)", sub: "Có SE EXPIRED · Chờ ân hạn ExpTol (" + simState.expiredCycleCnt + "/" + ecucConfig.WdgMExpiredSupervisionCycleTol + ") ghi NvM", cls: "active-pur" },
    { id: "STOPPED", title: "WDGM_GLOBAL_STATUS_STOPPED (0x03)", sub: "Cắt WdgIf(0) + Báo DEM + Mcu_PerformReset (nếu bật)", cls: "active-err" },
    { id: "DEACTIVATED", title: "WDGM_GLOBAL_STATUS_DEACTIVATED (0x04)", sub: "Chưa WdgM_Init() hoặc đã WdgM_DeInit()", cls: "active-deact" }
  ];
  document.getElementById("globalSmDiagram").innerHTML = globalNodes.map((n) =>
    '<div class="sm-node ' + (simState.globalStatus === n.id ? n.cls : "") + '">' +
      '<div class="sm-node-hdr"><span>' + n.title + '</span>' + (simState.globalStatus === n.id ? '<span>● ACTIVE</span>' : '') + '</div>' +
      '<div class="sm-node-sub">' + n.sub + '</div>' +
    '</div>'
  ).join("");
}

// -------------------- RENDER PANEL 3: SVG ARCHITECTURE --------------------

function renderSvgArchitecture() {
  const se0 = simState.entities[0];
  const se1 = simState.entities[1];
  const se2 = simState.entities[2];

  document.getElementById("svgSub_MOD_SWC").textContent = "SE0: " + se0.localStatus + " | SE1: " + se1.localStatus;
  document.getElementById("svgSub_MOD_BSW").textContent = "State: " + se2.localStatus + " (" + ecucConfig.ActiveWdgMMode.replace("_MODE", "") + ")";
  document.getElementById("svgSub_MOD_BSWM").textContent = "Mode: " + ecucConfig.ActiveWdgMMode.replace("_MODE", "") + " | PartRst: " + simState.resetState.partResetCount + (simState.resetState.mcuResetTriggered ? " | MCU_RST!" : "");
  document.getElementById("svgSub_MOD_RTE").textContent = "Cycle: " + ecucConfig.WdgMSupervisionCycle + " ms | Rte_Switch";
  document.getElementById("svgSub_MOD_OS").textContent = "OsTick: " + simState.clockMs + " ms | App: " + simState.resetState.lastPartResetApp;
  document.getElementById("svgSub_MOD_WDGM1").textContent = "Global: WDGM_GLOBAL_STATUS_" + simState.globalStatus;
  document.getElementById("svgSub_MOD_WDGM2").textContent = "Alv:" + se0.alive.res + " | Dl:" + se0.deadline.res + " | Lg:" + se0.logical.res;
  document.getElementById("svgSub_MOD_WDGM3").textContent = "1stExp: " + (simState.firstExpired.latched ? ("SE_" + simState.firstExpired.seId) : "NONE") + " | ExpCnt: " + simState.expiredCycleCnt + "/" + ecucConfig.WdgMExpiredSupervisionCycleTol;
  document.getElementById("svgSub_MOD_DEM").textContent = "MON:" + (simState.dem.monitoringFailed ? "FAIL" : "OK") + " | MODE:" + (simState.dem.setModeFailed ? "FAIL" : "OK");
  document.getElementById("svgSub_MOD_DET").textContent = "Module 13 | Faults: " + simState.detErrors.length;
  document.getElementById("svgSub_MOD_WDGIF").textContent = "Last Trig: " + simState.wdgIf.intTimeoutMs + " ms | " + simState.wdgIf.intMode.replace("WDGIF_", "");
  document.getElementById("svgSub_MOD_WDG_INT").textContent = "Dev 0 | Rem: " + simState.wdgIf.intRemainingMs + " ms" + (simState.wdgIf.hwResetTriggered ? " (RST!)" : "");
  document.getElementById("svgSub_MOD_WDG_EXT").textContent = ecucConfig.ExternalWindowWdgEnabled ? ("Dev 1 | Win [" + ecucConfig.WindowWdgClosedWindowMs + ".." + simState.wdgIf.extTimeoutMs + "ms]") : "Dev 1 | Disabled";

  document.querySelectorAll(".flow-arrow").forEach((el) => {
    el.classList.toggle("active", simState.activeArrows.includes(el.id));
  });
  document.querySelectorAll(".mod-node").forEach((el) => {
    const id = el.id.replace("node_", "");
    el.classList.toggle("selected", id === simState.selectedModuleId);
  });
}

function selectModule(modId) {
  simState.selectedModuleId = modId;
  switchInspTab(1);
  renderSvgArchitecture();
}

// -------------------- RENDER RIGHT INSPECTOR --------------------

function switchInspTab(idx) {
  currentInspTab = idx;
  for (let i = 0; i < 4; i++) {
    const b = document.getElementById("inspTabBtn" + i);
    if (b) b.classList.toggle("active", i === idx);
  }
  renderInspector();
}

function renderInspector() {
  const body = document.getElementById("inspBody");
  if (!body) return;
  const se = simState.entities[simState.selectedSeId];

  if (currentInspTab === 0) {
    const detBox = simState.detErrors.length > 0
      ? ('<div class="insp-card" style="border-color:var(--err)"><div class="insp-h" style="color:var(--err)">🚨 Cảnh báo DET gần nhất</div>' +
        simState.detErrors.slice(0, 3).map((d) => '<div class="mono" style="font-size:10.5px;margin-bottom:3px">[' + d.t + 'ms] <b>' + escapeHtmlSafe(d.errorId) + '</b>: ' + escapeHtmlSafe(d.detail) + '</div>').join("") + '</div>')
      : "";

    body.innerHTML =
      '<div class="insp-card"><div class="insp-h">🔎 Giải Thích Bước Hiện Tại</div><p style="font-size:12px;color:var(--txt-soft)">' + escapeHtmlSafe(simState.stepExplain) + '</p></div>' +
      '<div class="insp-card"><div class="insp-h">📊 Tóm Tắt Thực Thể Đang Soi (' + escapeHtmlSafe(se.name) + ')</div>' +
      '<div class="mono" style="font-size:11px;line-height:1.6">' +
      'LocalStatus  : <b>WDGM_LOCAL_STATUS_' + se.localStatus + '</b><br/>' +
      'GlobalStatus : <b>WDGM_GLOBAL_STATUS_' + simState.globalStatus + '</b><br/>' +
      'Alive Check  : AC=' + se.alive.ac + ' · SC=' + se.alive.sc + ' · FailCnt=' + se.alive.failedCnt + '<br/>' +
      'Deadline Δt  : ' + (se.deadline.lastDt !== null ? (se.deadline.lastDt + 'ms') : (se.deadline.pending ? 'Running' : 'Idle')) + ' (' + se.deadline.res + ')<br/>' +
      'Logical Flow : ' + escapeHtmlSafe(se.logical.lastEdge) + ' (Actv=' + se.logical.activityFlag + ')<br/>' +
      'WdgIf Dev 0  : ' + simState.wdgIf.intMode + ' (' + simState.wdgIf.intTimeoutMs + 'ms)' +
      '</div></div>' + detBox;
  } else if (currentInspTab === 1) {
    const pills = Object.keys(MODULES_INFO).map((k) =>
      '<button class="mod-pill' + (k === simState.selectedModuleId ? " active" : "") + '" onclick="selectModule(\'' + k + '\')">' + k.replace("MOD_", "") + '</button>'
    ).join("");
    const m = MODULES_INFO[simState.selectedModuleId] || MODULES_INFO.MOD_WDGM;
    body.innerHTML =
      '<div class="mod-list">' + pills + '</div>' +
      '<div class="insp-card"><div class="insp-h">🧩 ' + escapeHtmlSafe(m.title) + '</div>' +
      '<div style="font-size:10.5px;color:var(--cyan);font-weight:700;margin-bottom:6px">' + escapeHtmlSafe(m.layer) + ' · ' + escapeHtmlSafe(m.sws) + '</div>' +
      '<p style="margin-bottom:6px"><b>📥 Input:</b> ' + escapeHtmlSafe(m.inputs) + '</p>' +
      '<p style="margin-bottom:6px"><b>⚙️ Xử lý nội bộ:</b> ' + escapeHtmlSafe(m.processing) + '</p>' +
      '<p><b>📤 Output &amp; API:</b> ' + escapeHtmlSafe(m.outputs) + '</p></div>';
  } else if (currentInspTab === 2) {
    body.innerHTML =
      '<div class="insp-card"><div class="insp-h">📄 Logic Code C Thực Thi Gần Nhất</div>' +
      '<pre class="code-block">' + escapeHtmlSafe(simState.lastCodeSnippet) + '</pre></div>';
  } else {
    if (simState.apiTrace.length === 0) {
      body.innerHTML = '<div class="insp-card"><div class="insp-h">📜 API Call Trace</div><p style="color:var(--mut)">Chưa có lời gọi hàm nào được ghi nhận.</p></div>';
      return;
    }
    body.innerHTML = simState.apiTrace.map((t) =>
      '<div class="trace-item ' + t.level + '">' +
        '<div style="display:flex;justify-content:space-between;font-weight:800"><span class="mono">' + escapeHtmlSafe(t.api) + '</span><span class="mono" style="color:var(--mut)">t=' + t.t + 'ms</span></div>' +
        '<div style="color:var(--txt-soft);margin-top:2px">' + escapeHtmlSafe(t.detail) + '</div>' +
      '</div>'
    ).join("");
  }
}

function renderAll() {
  renderHeaderAndQuickActions();
  renderConfigWarnings();
  renderPanel1AlgorithmsAndRegs();
  renderPanel2TimersAndStates();
  renderSvgArchitecture();
  renderInspector();
}

// -------------------- VIEW SWITCH, THEME & TOOLTIP (>1S) --------------------

function switchMainView(v) {
  const isSim = (v === "sim");
  document.getElementById("viewSim").classList.toggle("hidden", !isSim);
  document.getElementById("viewHb").classList.toggle("hidden", isSim);
  document.getElementById("btnViewSim").classList.toggle("active", isSim);
  document.getElementById("btnViewHb").classList.toggle("active", !isSim);
  if (!isSim && typeof renderCurrentHandbookView === "function") {
    renderCurrentHandbookView();
  }
}

function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.getAttribute("data-theme") === "dark";
  html.setAttribute("data-theme", isDark ? "light" : "dark");
  document.getElementById("btnTheme").textContent = isDark ? "🌙 Dark Mode" : "☀️ Light Mode";
}

function showTooltipForElement(rowEl, evt) {
  const key = rowEl.getAttribute("data-cfg-key");
  const info = configTooltipData[key];
  const popup = document.getElementById("cfgTooltipPopup");
  if (!info || !popup) return;

  popup.innerHTML =
    '<div class="tt-hdr"><span class="tt-title">' + escapeHtmlSafe(info.title) + '</span><span class="tt-meta">' + escapeHtmlSafe(info.sws) + '</span></div>' +
    '<div class="tt-sec"><b>ECUC Path:</b> <span class="mono">' + escapeHtmlSafe(info.ecucPath) + '</span></div>' +
    '<div class="tt-sec"><b>Miền giá trị:</b> <span class="mono" style="color:var(--cyan)">' + escapeHtmlSafe(info.range) + '</span></div>' +
    '<div class="tt-sec"><b>Vai trò &amp; Ý nghĩa:</b> ' + escapeHtmlSafe(info.role) + '</div>' +
    '<div class="tt-sec"><b>Cơ chế hoạt động:</b> ' + escapeHtmlSafe(info.mechanism) + '</div>' +
    '<div class="tt-sec"><b>Ảnh hưởng kịch bản:</b> ' + escapeHtmlSafe(info.scenarioImpact) + '</div>';

  const rect = rowEl.getBoundingClientRect();
  const px = Math.min(window.innerWidth - 415, Math.max(12, (evt ? evt.clientX + 16 : rect.right + 10)));
  const py = Math.min(window.innerHeight - 235, Math.max(12, rect.top - 10));
  popup.style.left = px + "px";
  popup.style.top = py + "px";
  popup.classList.add("show");
}

function hideConfigTooltip() {
  if (tooltipHoverTimer) {
    clearTimeout(tooltipHoverTimer);
    tooltipHoverTimer = null;
  }
  const popup = document.getElementById("cfgTooltipPopup");
  if (popup) popup.classList.remove("show");
}

function initTooltipHandlers() {
  document.querySelectorAll("[data-cfg-key]").forEach((row) => {
    row.addEventListener("mouseenter", (evt) => {
      hideConfigTooltip();
      tooltipHoverTimer = setTimeout(() => showTooltipForElement(row, evt), 1000);
    });
    row.addEventListener("mouseleave", hideConfigTooltip);
    const icon = row.querySelector(".cfg-i");
    if (icon) {
      icon.addEventListener("click", (evt) => {
        evt.preventDefault();
        evt.stopPropagation();
        showTooltipForElement(row, evt);
      });
    }
  });
}

// -------------------- EXPORT MODAL & STANDALONE HTML --------------------

function getExportPayload(idx) {
  if (idx === 0) return { filename: "WdgM.arxml", text: generateArxmlContent() };
  if (idx === 1) return { filename: "WdgM_Cfg.h", text: generateWdgMCfgH() };
  if (idx === 2) return { filename: "WdgM_Lcfg.c", text: generateWdgMLcfgC() };
  return { filename: "WdgM_Config.json", text: JSON.stringify(ecucConfig, null, 2) };
}

function openExportModal() {
  document.getElementById("exportModal").classList.remove("hidden");
  switchExportTab(currentExportTab);
}

function closeExportModal() {
  document.getElementById("exportModal").classList.add("hidden");
}

function onExportModalBackdrop(evt) {
  if (evt && evt.target && evt.target.id === "exportModal") {
    closeExportModal();
  }
}

function switchExportTab(idx) {
  currentExportTab = idx;
  for (let i = 0; i < 4; i++) {
    const b = document.getElementById("expTab" + i);
    if (b) b.classList.toggle("btn-pri", i === idx);
  }
  document.getElementById("exportCodeArea").textContent = getExportPayload(idx).text;
}

function copyExportCode() {
  const txt = getExportPayload(currentExportTab).text;
  if (navigator.clipboard) navigator.clipboard.writeText(txt).catch(() => {});
}

function downloadExportCode() {
  const p = getExportPayload(currentExportTab);
  const blob = new Blob([p.text], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = p.filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function downloadStandaloneHTML() {
  const docHtml = "<!DOCTYPE html>\n" + document.documentElement.outerHTML;
  const blob = new Blob([docHtml], { type: "text/html;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "AUTOSAR_WdgM_Simulator.html";
  a.click();
  URL.revokeObjectURL(a.href);
}
