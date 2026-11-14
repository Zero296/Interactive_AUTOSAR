// ================= PART 5: STEPPER, QUICK ACTIONS, LIVE UI RENDERERS, TOOLTIPS & ARXML/C EXPORTS =================

let currentScenId = "S1";
let currentStepIdx = 0;
let stepSnapshots = [];
let activeInspTab = 0;
let currentExportTab = 0;
let autoPlayTimer = null;
let autoClockTimer = null;
let tooltipHoverTimer = null;
let lastTooltipKey = null;

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtHex8(val) {
  return "0x" + (val & 0xFF).toString(16).toUpperCase().padStart(2, "0");
}

function fmtBin8(val) {
  const b = (val & 0xFF).toString(2).padStart(8, "0");
  return b.slice(0, 4) + " " + b.slice(4);
}

function cloneSimAndCfg() {
  return {
    sim: JSON.parse(JSON.stringify(simState)),
    cfg: JSON.parse(JSON.stringify(ecucConfig))
  };
}

function restoreSimAndCfg(snap) {
  if (!snap) return;
  simState = JSON.parse(JSON.stringify(snap.sim));
  ecucConfig = JSON.parse(JSON.stringify(snap.cfg));
  syncConfigToDOM();
}

// -------------------- SCENARIO STEPPER & HISTORY --------------------

function getCurrentScenario() {
  return SCENARIOS.find((s) => s.id === currentScenId) || SCENARIOS[0];
}

function stopScenarioAutoPlay() {
  if (autoPlayTimer) {
    clearInterval(autoPlayTimer);
    autoPlayTimer = null;
  }
  const btn = document.getElementById("btnAutoPlay");
  if (btn) btn.textContent = "▶ Tự Động Kịch Bản";
}

function loadScenario(scenId) {
  stopScenarioAutoPlay();
  currentScenId = scenId || "S1";
  const scen = getCurrentScenario();
  if (scen && typeof scen.setup === "function") scen.setup();
  currentStepIdx = 0;
  stepSnapshots = [cloneSimAndCfg()];

  const sel = document.getElementById("scenSelect");
  if (sel) sel.value = currentScenId;
  const badge = document.getElementById("scenIdBadge");
  if (badge) badge.textContent = currentScenId;

  renderScenarioCard();
  renderAll();
}

function onScenarioSelectChange() {
  const sel = document.getElementById("scenSelect");
  if (sel) loadScenario(sel.value);
}

function resetCurrentScenario() {
  loadScenario(currentScenId);
}

function nextScenarioStep() {
  const scen = getCurrentScenario();
  if (!scen || currentStepIdx >= scen.steps.length) {
    stopScenarioAutoPlay();
    return;
  }
  const stepObj = scen.steps[currentStepIdx];
  if (stepObj && typeof stepObj.exec === "function") stepObj.exec();
  currentStepIdx++;
  stepSnapshots = stepSnapshots.slice(0, currentStepIdx);
  stepSnapshots.push(cloneSimAndCfg());
  if (stepObj && stepObj.desc) {
    simState.stepExplain = "Bước " + currentStepIdx + "/" + scen.steps.length + " — " + stepObj.title + ": " + stepObj.desc;
  }
  renderAll();
}

function prevScenarioStep() {
  stopScenarioAutoPlay();
  if (currentStepIdx <= 0) return;
  currentStepIdx--;
  restoreSimAndCfg(stepSnapshots[currentStepIdx]);
  renderAll();
}

function toggleScenarioAutoPlay() {
  const btn = document.getElementById("btnAutoPlay");
  if (autoPlayTimer) {
    stopScenarioAutoPlay();
    return;
  }
  const scen = getCurrentScenario();
  if (scen && currentStepIdx >= scen.steps.length) loadScenario(currentScenId);
  if (btn) btn.textContent = "⏸ Dừng Kịch Bản";
  autoPlayTimer = setInterval(() => {
    const sc = getCurrentScenario();
    if (!sc || currentStepIdx >= sc.steps.length) {
      stopScenarioAutoPlay();
      return;
    }
    nextScenarioStep();
  }, 1450);
}

function toggleAutoClock() {
  const btn = document.getElementById("btnAutoClock");
  if (autoClockTimer) {
    clearInterval(autoClockTimer);
    autoClockTimer = null;
    if (btn) {
      btn.textContent = "⏱ Auto Clock";
      btn.classList.remove("btn-ok");
    }
    return;
  }
  if (btn) {
    btn.textContent = "⏸ Dừng Clock";
    btn.classList.add("btn-ok");
  }
  autoClockTimer = setInterval(() => {
    stepClockTick(Number(ecucConfig.BswMMainFunctionPeriod) || 10);
  }, 950);
}

function runWhatIf(idx) {
  stopScenarioAutoPlay();
  const scen = getCurrentScenario();
  if (!scen || !scen.whatIfs || !scen.whatIfs[idx]) return;
  const wf = scen.whatIfs[idx];
  if (typeof wf.run === "function") wf.run();
  syncConfigToDOM();
  updateDerivedRegisters();
  simState.stepExplain = "🧪 What-If (" + scen.id + "): " + wf.label + " đã thực thi tức thì.";
  renderAll();
}

// -------------------- QUICK ACTION BAR HANDLERS --------------------

function qaSetComMMode() {
  const sel = document.getElementById("qaComMSelect");
  const mode = sel ? sel.value : "COMM_FULL_COMMUNICATION";
  if (!simState.commAllowedCh0 && mode === "COMM_FULL_COMMUNICATION") {
    simState.commAllowedCh0 = true;
    simState.mrp.ecum = "ECUM_STATE_RUN";
    simState.rteStarted = true;
    simState.lifeState = "RUN_READY";
  }
  api_BswM_ComM_CurrentMode(0, mode);
  if (mode === "COMM_FULL_COMMUNICATION" && simState.mrp.cansm === "CANSM_BSWM_NO_COMMUNICATION") {
    api_BswM_CanSM_CurrentState(0, "CANSM_BSWM_FULL_COMMUNICATION");
  } else if (mode === "COMM_NO_COMMUNICATION") {
    api_BswM_CanSM_CurrentState(0, "CANSM_BSWM_NO_COMMUNICATION");
  } else if (mode === "COMM_SILENT_COMMUNICATION") {
    api_BswM_CanSM_CurrentState(0, "CANSM_BSWM_SILENT_COMMUNICATION");
  }
  renderAll();
}

function qaToggleCanSmBusOff() {
  const next = simState.mrp.cansm === "CANSM_BSWM_BUS_OFF"
    ? (simState.mrp.comm === "COMM_FULL_COMMUNICATION" ? "CANSM_BSWM_FULL_COMMUNICATION" : "CANSM_BSWM_NO_COMMUNICATION")
    : "CANSM_BSWM_BUS_OFF";
  api_BswM_CanSM_CurrentState(0, next);
  renderAll();
}

function qaCycleSwcMode() {
  const modes = ["APP_MODE_NORMAL", "APP_MODE_SPORT", "APP_MODE_ECO"];
  const idx = modes.indexOf(simState.mrp.swc);
  const next = modes[(idx + 1) % modes.length];
  if (!simState.rteStarted) {
    simState.rteStarted = true;
    simState.commAllowedCh0 = true;
  }
  api_Swc_ModeRequest(next);
  renderAll();
}

function qaCyclePnc16Mode() {
  const modes = ["COMM_PNC_NO_COMMUNICATION", "COMM_PNC_REQUESTED", "COMM_PNC_READY_SLEEP", "COMM_PNC_PREPARE_SLEEP"];
  const idx = modes.indexOf(simState.mrp.pnc16);
  const next = modes[(idx + 1) % modes.length];
  api_BswM_ComM_CurrentPNCMode(16, next);
  renderAll();
}

function qaToggleDcm0x28() {
  const next = simState.mrp.dcm === "DCM_ENABLE_RX_TX_NORM_NM"
    ? "DCM_DISABLE_RX_TX_NORM_NM"
    : "DCM_ENABLE_RX_TX_NORM_NM";
  ecucConfig.DcmCommunicationControlMode = next;
  syncConfigToDOM();
  api_BswM_Dcm_CommunicationMode_CurrentState(0, next);
  renderAll();
}

function qaStepEcuLifecycle() {
  if (!simState.initialized) {
    api_BswM_Init(true);
    syncConfigToDOM();
  } else if (simState.mrp.ecum === "ECUM_STATE_STARTUP_ONE") {
    api_BswM_EcuM_CurrentState("ECUM_STATE_STARTUP_TWO");
  } else if (simState.lifeState === "STARTUP_TWO_NVM" || simState.nvmJobType === "NVM_READ_ALL") {
    api_BswM_NvM_CurrentJobMode("NVM_READ_ALL", "NVM_REQ_OK");
  } else if (simState.mrp.ecum === "ECUM_STATE_PREP_SHUTDOWN") {
    api_BswM_NvM_CurrentJobMode("NVM_WRITE_ALL", "NVM_REQ_OK");
  } else if (simState.mrp.ecum === "ECUM_STATE_STARTUP_TWO" || simState.mrp.ecum === "ECUM_STATE_RUN") {
    api_BswM_EcuM_CurrentState("ECUM_STATE_PREP_SHUTDOWN");
  } else {
    api_BswM_Init(true);
    syncConfigToDOM();
  }
  renderAll();
}

function qaStartStopTimer() {
  api_BswM_TimerControl(!simState.timerRunning, Number(ecucConfig.BswMTimerValue) || 300);
  renderAll();
}

// -------------------- VIEW / THEME / TAB CONTROLS --------------------

function switchMainView(viewName) {
  const isSim = viewName === "sim";
  const vSim = document.getElementById("viewSim");
  const vHb = document.getElementById("viewHb");
  const bSim = document.getElementById("btnViewSim");
  const bHb = document.getElementById("btnViewHb");
  if (vSim) vSim.classList.toggle("hidden", !isSim);
  if (vHb) vHb.classList.toggle("hidden", isSim);
  if (bSim) bSim.classList.toggle("active", isSim);
  if (bHb) bHb.classList.toggle("active", !isSim);
  if (!isSim && typeof renderCurrentHandbookView === "function") {
    renderCurrentHandbookView();
  }
}

function toggleTheme() {
  const html = document.documentElement;
  const cur = html.getAttribute("data-theme") || "dark";
  const next = cur === "dark" ? "light" : "dark";
  html.setAttribute("data-theme", next);
  const btn = document.getElementById("btnTheme");
  if (btn) btn.textContent = next === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode";
}

function switchCfgTab(idx) {
  for (let i = 0; i < 6; i++) {
    const btn = document.getElementById("cfgTabBtn" + i);
    const pane = document.getElementById("cfgPane" + i);
    if (btn) btn.classList.toggle("active", i === idx);
    if (pane) pane.classList.toggle("hidden", i !== idx);
  }
}

function switchInspTab(idx) {
  activeInspTab = idx;
  for (let i = 0; i < 4; i++) {
    const btn = document.getElementById("inspTabBtn" + i);
    if (btn) btn.classList.toggle("active", i === idx);
  }
  renderInspector();
}

function selectModule(modId) {
  simState.activeModId = modId;
  activeInspTab = 1;
  for (let i = 0; i < 4; i++) {
    const btn = document.getElementById("inspTabBtn" + i);
    if (btn) btn.classList.toggle("active", i === 1);
  }
  renderSvgArchitecture();
  renderInspector();
}

// -------------------- LIVE RENDERERS --------------------

function renderScenarioCard() {
  const scen = getCurrentScenario();
  const sumBox = document.getElementById("scenSummaryBox");
  const wfBox = document.getElementById("whatIfContainer");
  if (sumBox && scen) sumBox.textContent = scen.summary;
  if (wfBox && scen) {
    wfBox.innerHTML = (scen.whatIfs || []).map((w, idx) =>
      `<button class="whatif-btn" onclick="runWhatIf(${idx})">${escapeHtml(w.label)}</button>`
    ).join("");
  }
}

function renderHeaderAndQuickActions() {
  const scen = getCurrentScenario();
  const total = scen ? scen.steps.length : 0;
  const stepPill = document.getElementById("stepIndicator");
  if (stepPill) stepPill.textContent = "Bước " + currentStepIdx + " / " + total;
  const prevBtn = document.getElementById("btnPrevStep");
  const nextBtn = document.getElementById("btnNextStep");
  if (prevBtn) prevBtn.disabled = currentStepIdx <= 0;
  if (nextBtn) nextBtn.disabled = currentStepIdx >= total;

  const clk = document.getElementById("clockVal");
  if (clk) clk.textContent = simState.clockMs + " ms";

  const bEcu = document.getElementById("hdrBadgeEcu");
  if (bEcu) {
    bEcu.textContent = "ECU: " + simState.lifeState;
    bEcu.className = "state-badge " + (!simState.initialized ? "sb-err" : (simState.lifeState === "FULL_COM_ONLINE" ? "sb-ok" : (simState.shutdownActive ? "sb-warn" : "sb-pri")));
  }

  const bRule = document.getElementById("hdrBadgeRule");
  if (bRule) {
    bRule.textContent = "Rule: " + simState.lastEvaluatedRuleId + " | " + (simState.lastExecutedActionList || "IDLE");
    bRule.className = "state-badge " + (simState.abortOnFailTriggered ? "sb-err" : (simState.ruleExprTrueFlag ? "sb-ok" : "sb-idle"));
  }

  const bIpdu = document.getElementById("hdrBadgeIpdu");
  if (bIpdu) {
    bIpdu.textContent = "IPduVec: " + fmtHex8(simState.ipduVecByte);
    bIpdu.className = "state-badge " + (simState.ipduVecByte > 0 ? "sb-pur" : "sb-idle");
  }

  const bDef = document.getElementById("hdrBadgeDef");
  if (bDef) {
    bDef.textContent = "Deferred: " + simState.deferredQueue.length;
    bDef.classList.toggle("hidden", simState.deferredQueue.length === 0);
  }

  // Quick Action Button states
  const qaCanSm = document.getElementById("qaBtnCanSmBusOff");
  const txtCanSm = document.getElementById("qaTxtCanSm");
  if (qaCanSm && txtCanSm) {
    const isBo = simState.mrp.cansm === "CANSM_BSWM_BUS_OFF";
    qaCanSm.classList.toggle("qa-active", isBo);
    txtCanSm.textContent = simState.mrp.cansm.replace("CANSM_BSWM_", "").replace("_COMMUNICATION", "_COM");
  }
  const qaSwc = document.getElementById("qaBtnSwcMode");
  const txtSwc = document.getElementById("qaTxtSwc");
  if (qaSwc && txtSwc) {
    qaSwc.classList.toggle("qa-active", simState.mrp.swc === "APP_MODE_SPORT");
    txtSwc.textContent = simState.mrp.swc.replace("APP_MODE_", "");
  }
  const qaPnc = document.getElementById("qaBtnPnc16");
  const txtPnc = document.getElementById("qaTxtPnc16");
  if (qaPnc && txtPnc) {
    const pActive = simState.mrp.pnc16 === "COMM_PNC_REQUESTED" || simState.mrp.pnc16 === "COMM_PNC_READY_SLEEP";
    qaPnc.classList.toggle("qa-active", pActive);
    txtPnc.textContent = simState.mrp.pnc16.replace("COMM_PNC_", "").replace("_COMMUNICATION", "_COM");
  }
  const qaDcm = document.getElementById("qaBtnDcm0x28");
  const txtDcm = document.getElementById("qaTxtDcm28");
  if (qaDcm && txtDcm) {
    const dis = simState.mrp.dcm !== "DCM_ENABLE_RX_TX_NORM_NM";
    qaDcm.classList.toggle("qa-active", dis);
    txtDcm.textContent = simState.mrp.dcm.replace("DCM_", "").replace("_NORM_NM", "");
  }
  const txtLife = document.getElementById("qaTxtLife");
  if (txtLife) txtLife.textContent = simState.lifeState.replace("ECUM_STATE_", "");
  const qaTmr = document.getElementById("qaBtnTimer0");
  const txtTmr = document.getElementById("qaTxtTimer");
  if (qaTmr && txtTmr) {
    qaTmr.classList.toggle("qa-active", simState.timerRunning);
    txtTmr.textContent = simState.timerRunning ? (simState.timerLeftMs + "ms") : simState.mrp.timer.replace("BSWM_TIMER_", "");
  }
  const qaComMSel = document.getElementById("qaComMSelect");
  if (qaComMSel && MRP_DEFS[2].cycles.includes(simState.mrp.comm)) {
    qaComMSel.value = simState.mrp.comm;
  }
}

function renderRuleMatrixAndIpduVector() {
  // Tier 1A-1: 8 Mode Request Ports
  const mrpBox = document.getElementById("mrpPortsBox");
  if (mrpBox) {
    mrpBox.innerHTML = MRP_DEFS.map((d) => {
      const proc = ecucConfig[d.procKey] || "BSWM_DEFERRED";
      const isImm = proc === "BSWM_IMMEDIATE";
      const isChg = simState.changedMrp === d.id;
      const val = simState.mrp[d.id] || "";
      const shortVal = val
        .replace("ECUM_STATE_", "")
        .replace("CANSM_BSWM_", "")
        .replace("COMM_PNC_", "PNC_")
        .replace("COMM_", "")
        .replace("DCM_", "")
        .replace("BSWM_TIMER_", "")
        .replace("_COMMUNICATION", "_COM");
      return `<div class="mrp-card ${isImm ? "mrp-immediate" : "mrp-deferred"}${isChg ? " mrp-changed" : ""}" onclick="cycleMrpPort('${d.id}')" title="Click để đổi giá trị ${escapeHtml(d.label)} (${escapeHtml(val)})">
        <div class="mrp-top">
          <span>${escapeHtml(d.label)}</span>
          <span class="mrp-badge ${isImm ? "imm" : "def"}">${isImm ? "IMM" : "DEF"}</span>
        </div>
        <div class="mrp-val mono">${escapeHtml(shortVal)}</div>
      </div>`;
    }).join("");
  }

  // Tier 1A-2: BswMRule Evaluation Matrix Table
  const tbody = document.getElementById("ruleTableBody");
  if (tbody) {
    tbody.innerHTML = simState.rules.map((r) => {
      const prevShort = r.prevResult.replace("BSWM_", "");
      const currShort = r.currResult.replace("BSWM_", "");
      const currCls = r.currResult === "BSWM_TRUE" ? "rp-true" : (r.currResult === "BSWM_UNDEFINED" ? "rp-undef" : "rp-false");
      const execCls = r.execType === "BSWM_CONDITION" ? "rp-cond" : "rp-trig";
      const execTxt = r.execType === "BSWM_CONDITION" ? "CONDITION" : "TRIGGER";
      let trCls = "";
      if (r.lastStatus && r.lastStatus.indexOf("ABORTED") >= 0) trCls = "rule-abort";
      else if (r.lastChanged && r.currResult === "BSWM_TRUE") trCls = "rule-fired";
      else if (r.lastChanged && r.currResult === "BSWM_FALSE") trCls = "rule-false-fired";
      return `<tr class="${trCls}">
        <td class="mono" style="font-weight:700">${escapeHtml(r.name)}</td>
        <td class="mono" style="color:var(--txt-soft)">${escapeHtml(r.exprText)}</td>
        <td><span class="mono" style="color:var(--mut)">${prevShort}</span> → <span class="rule-pill ${currCls}">${currShort}</span></td>
        <td><span class="rule-pill ${execCls}">${execTxt}</span></td>
        <td class="mono" style="font-size:10px">${escapeHtml(r.lastStatus || "IDLE")}</td>
      </tr>`;
    }).join("");
  }

  // Tier 1A-3: 8-bit Com_IpduGroupVector & PduR RPG
  const ipduSum = document.getElementById("ipduVectorSummary");
  if (ipduSum) {
    ipduSum.textContent = "Vector: " + fmtHex8(simState.ipduVecByte) + " | Bin: " + fmtBin8(simState.ipduVecByte);
  }
  const ipduGrid = document.getElementById("ipduVectorGrid");
  if (ipduGrid) {
    ipduGrid.innerHTML = IPDU_GROUP_SLOTS.map((s) => {
      const on = (simState.ipduVecByte & s.mask) !== 0;
      const chg = ((simState.ipduVecByte ^ simState.prevIpduVecByte) & s.mask) !== 0;
      const cls = "ipdu-cell" + (on ? (" on " + s.tone) : "") + (chg ? " chg" : "");
      return `<div class="${cls}" onclick="toggleIpduBit(${s.mask})" title="${escapeHtml(s.id)}: ${escapeHtml(s.desc)}">
        <div class="ipdu-name mono">${escapeHtml(s.shortName)}</div>
        <div class="ipdu-state mono">${on ? "ON(1)" : "OFF(0)"}</div>
      </div>`;
    }).join("");
  }
}

function renderBitGrid(containerId, bitsMeta, currByte, prevByte, regType) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = bitsMeta.map((b) => {
    const on = (currByte & b.mask) !== 0;
    const chg = ((currByte ^ prevByte) & b.mask) !== 0;
    const toneCls = on && b.tone === "warn" ? " warn-bit" : (on && b.tone === "err" ? " err-bit" : "");
    const cls = "bit-box" + (on ? " on" : "") + toneCls + (chg ? " chg" : "");
    return `<div class="${cls}" onclick="toggleRegisterBit('${regType}', ${b.mask})" title="Bit ${b.bit} (${escapeHtml(b.name)}): ${escapeHtml(b.desc)}">
      <div class="bit-pos mono">b${b.bit}</div>
      <div class="bit-val mono">${on ? 1 : 0}</div>
      <div class="bit-tag mono">${escapeHtml(b.tag)}</div>
    </div>`;
  }).join("");
}

function render8BitRegisters() {
  const hexA = document.getElementById("regAHex");
  const hexB = document.getElementById("regBHex");
  if (hexA) hexA.textContent = fmtHex8(simState.regAByte) + " (" + fmtBin8(simState.regAByte) + ")";
  if (hexB) hexB.textContent = fmtHex8(simState.regBByte) + " (" + fmtBin8(simState.regBByte) + ")";
  renderBitGrid("regABits", BSWM_ARB_BITS, simState.regAByte, simState.prevRegAByte, "A");
  renderBitGrid("regBBits", BSWM_ACT_BITS, simState.regBByte, simState.prevRegBByte, "B");
}

function renderTimersAndQueue() {
  const execBadge = document.getElementById("bswmExecBadge");
  if (execBadge) {
    execBadge.textContent = "MainFn: " + (ecucConfig.BswMMainFunctionPeriod || 10) + "ms | Pending: " + simState.deferredQueue.length;
  }
  const grid = document.getElementById("timersGrid");
  if (!grid) return;

  const tTotal = Math.max(10, Number(ecucConfig.BswMTimerValue) || 300);
  const tPct = simState.timerRunning ? Math.min(100, Math.round((simState.timerLeftMs / tTotal) * 100)) : (simState.mrp.timer === "BSWM_TIMER_EXPIRED" ? 0 : 0);
  const qCount = simState.deferredQueue.length;
  const qPct = Math.min(100, qCount * 25);
  const rxDmOn = (simState.ipduVecByte & 0x04) !== 0;

  grid.innerHTML = [
    `<div class="timer-card ${qCount > 0 ? "active" : ""}">
      <div class="timer-top"><span>📥 Deferred Queue</span><span class="mono">${qCount} items</span></div>
      <div class="timer-bar"><div class="timer-fill" style="width:${qPct}%"></div></div>
    </div>`,
    `<div class="timer-card ${simState.timerRunning ? "active" : ""}">
      <div class="timer-top"><span>⏱ BswMTimer_0</span><span class="mono">${simState.timerRunning ? (simState.timerLeftMs + "ms") : simState.mrp.timer.replace("BSWM_TIMER_", "")}</span></div>
      <div class="timer-bar"><div class="timer-fill" style="width:${tPct}%"></div></div>
    </div>`,
    `<div class="timer-card ${rxDmOn ? "active" : ""}">
      <div class="timer-top"><span>📡 Rx Deadline Mon</span><span class="mono">${rxDmOn ? "ENABLED" : "DISABLED"}</span></div>
      <div class="timer-bar"><div class="timer-fill" style="width:${rxDmOn ? 100 : 0}%"></div></div>
    </div>`,
    `<div class="timer-card ${ecucConfig.EnableIndependentRuleEvaluation ? "active" : ""}">
      <div class="timer-top"><span>⚡ SchM Schedule</span><span class="mono">${simState.bswScheduleMode.replace("SCHM_MODE_", "")}</span></div>
      <div class="timer-bar"><div class="timer-fill" style="width:${simState.rteStarted ? 100 : 15}%"></div></div>
    </div>`
  ].join("");
}

function renderStateMachines() {
  const pipeLbl = document.getElementById("smPipeLbl");
  const pipeEl = document.getElementById("pipeSmDiagram");
  if (pipeLbl) pipeLbl.textContent = simState.pipeState.replace("BSWM_", "");
  if (pipeEl) {
    const pipeNodes = [
      { key: "BSWM_UNINIT", cls: "active-err", title: "BSWM_UNINIT", sub: "Chưa Init / Sau Deinit" },
      { key: "BSWM_IDLE_INITIALIZED", cls: "active-ok", title: "INITIALIZED / IDLE", sub: "Sẵn sàng nhận MRP" },
      { key: "BSWM_DEFERRED_QUEUED", cls: "active-warn", title: "DEFERRED QUEUED", sub: "Đợi BswM_MainFunction()" },
      { key: "BSWM_ARBITRATING_RULES", cls: "active-pri", title: "ARBITRATING RULES", sub: "MRP → Expr → Rule" },
      { key: "BSWM_EXECUTING_ACTION_LIST", cls: "active-pur", title: "EXECUTING ACTIONS", sub: "True / False ActionList" },
      { key: "BSWM_SKIP_ACTION_LIST", cls: "active-pri", title: "SKIP (UNCHANGED)", sub: "TRIGGER giữ nguyên" }
    ];
    pipeEl.innerHTML = pipeNodes.map((n) => {
      const act = simState.pipeState === n.key ? (" " + n.cls) : "";
      return `<div class="sm-node${act}">
        <div class="sm-node-hdr"><span>${n.title}</span><span>${act ? "●" : ""}</span></div>
        <div style="color:var(--mut)">${n.sub}</div>
      </div>`;
    }).join("");
  }

  const lifeLbl = document.getElementById("smLifeLbl");
  const lifeEl = document.getElementById("lifeSmDiagram");
  if (lifeLbl) lifeLbl.textContent = simState.lifeState;
  if (lifeEl) {
    const lifeNodes = [
      { key: "STARTUP_ONE", cls: "active-pri", title: "1. STARTUP_ONE", sub: "EcuM Init -> BswM_Init" },
      { key: "STARTUP_TWO_NVM", cls: "active-warn", title: "2. STARTUP_TWO", sub: "NvM_ReadAll() Pending" },
      { key: "RUN_READY", cls: "active-pri", title: "3. RUN READY", sub: "Rte_Start + AllowCom" },
      { key: "FULL_COM_ONLINE", cls: "active-ok", title: "4. FULL_COM ONLINE", sub: "Tx/Rx/DM/PduR Active" },
      { key: "SILENT_OR_BUSOFF", cls: "active-err", title: "5. SILENT / BUS_OFF", sub: "Tx OFF / Rx Hold" },
      { key: "PREP_SHUTDOWN", cls: "active-warn", title: "6. PREP_SHUTDOWN", sub: "Rte_Stop + NvM_WriteAll" }
    ];
    lifeEl.innerHTML = lifeNodes.map((n) => {
      const match = simState.lifeState === n.key || (n.key === "PREP_SHUTDOWN" && simState.lifeState === "GO_OFF_DEINIT");
      const act = match ? (" " + n.cls) : "";
      return `<div class="sm-node${act}">
        <div class="sm-node-hdr"><span>${n.title}</span><span>${act ? "●" : ""}</span></div>
        <div style="color:var(--mut)">${n.sub}</div>
      </div>`;
    }).join("");
  }
}

function renderSvgArchitecture() {
  const swcTxt = document.getElementById("svgSub_MOD_SWC");
  if (swcTxt) swcTxt.textContent = "Req: " + simState.mrp.swc.replace("APP_MODE_", "") + " | Active: " + simState.swcActiveMode.replace("APP_MODE_", "");
  const dcmTxt = document.getElementById("svgSub_MOD_DCM");
  if (dcmTxt) dcmTxt.textContent = simState.mrp.dcm.replace("DCM_", "");
  const ecumTxt = document.getElementById("svgSub_MOD_ECUM");
  if (ecumTxt) ecumTxt.textContent = "State: " + simState.mrp.ecum.replace("ECUM_STATE_", "");
  const rteTxt = document.getElementById("svgSub_MOD_RTE");
  if (rteTxt) rteTxt.textContent = "RTE: " + (simState.rteStarted ? "STARTED" : "STOPPED") + " | SchM: " + (ecucConfig.BswMMainFunctionPeriod || 10) + "ms";
  const bswm1 = document.getElementById("svgSub_MOD_BSWM1");
  if (bswm1) bswm1.textContent = "Init: " + (simState.initialized ? "BSWM_INIT" : "BSWM_UNINIT") + " | Queue: " + simState.deferredQueue.length;
  const bswm2 = document.getElementById("svgSub_MOD_BSWM2");
  if (bswm2) bswm2.textContent = "Rule: " + simState.lastEvaluatedRuleId + " | IPduVec: " + fmtHex8(simState.ipduVecByte);
  const nvmTxt = document.getElementById("svgSub_MOD_NVM");
  if (nvmTxt) nvmTxt.textContent = "Job: " + simState.nvmJobType + " (" + simState.mrp.nvm.replace("NVM_REQ_", "") + ")";
  const detTxt = document.getElementById("svgSub_MOD_DET");
  if (detTxt) detTxt.textContent = "Faults Logged: " + simState.detFaults.length + (simState.detFaults.length ? " (" + simState.detFaults[0].code.split(" ")[0] + ")" : " (OK)");
  const comTxt = document.getElementById("svgSub_MOD_COM");
  if (comTxt) {
    const tx = (simState.ipduVecByte & 0x01) ? "ON" : "OFF";
    const rx = (simState.ipduVecByte & 0x02) ? "ON" : "OFF";
    const dm = (simState.ipduVecByte & 0x04) ? "ON" : "OFF";
    comTxt.textContent = "Tx:" + tx + " | Rx:" + rx + " | DM:" + dm + " | Diag:" + ((simState.ipduVecByte & 0x20) ? "ON" : "OFF");
  }
  const pdurTxt = document.getElementById("svgSub_MOD_PDUR");
  if (pdurTxt) pdurTxt.textContent = "RPG_0_GW: " + ((simState.ipduVecByte & 0x80) ? "ENABLED" : "DISABLED");
  const commTxt = document.getElementById("svgSub_MOD_COMM");
  if (commTxt) commTxt.textContent = "Ch0:" + simState.mrp.comm.replace("COMM_", "").replace("_COMMUNICATION", "") + " | PNC16:" + simState.mrp.pnc16.replace("COMM_PNC_", "").replace("_COMMUNICATION", "");
  const cansmTxt = document.getElementById("svgSub_MOD_CANSM");
  if (cansmTxt) cansmTxt.textContent = "State: " + simState.mrp.cansm.replace("CANSM_BSWM_", "").replace("_COMMUNICATION", "");

  Object.keys(MODULES_INFO).forEach((k) => {
    const g = document.getElementById("node_" + k);
    if (g) g.classList.toggle("selected", simState.activeModId === k);
  });

  document.querySelectorAll("#bswmArchSvg .flow-arrow").forEach((el) => {
    el.classList.toggle("active", (simState.activeArrows || []).includes(el.id));
  });
}

function renderConfigValidation() {
  const box = document.getElementById("cfgValidationBox");
  if (!box) return;
  const msgs = [];
  if (!ecucConfig.BswMInitialized) {
    msgs.push({ err: true, txt: "⚠️ BswMInitialized = FALSE: Mọi API gọi vào BswM đang bị từ chối & phát lỗi DET BSWM_E_NO_INIT (0x01)." });
  }
  if (ecucConfig.InjectActionItemFailure && ecucConfig.BswMAbortOnFail) {
    msgs.push({ err: true, txt: "⛔ InjectActionItemFailure = TRUE + BswMAbortOnFail = TRUE: Item #2 sẽ thất bại và hủy toàn bộ bước con trong AL_EnableTxRxDM." });
  }
  if (ecucConfig.MRP_CanSM_Ch0_Processing === "BSWM_DEFERRED") {
    msgs.push({ err: false, txt: "⚠️ Khuyến nghị AUTOSAR: MRP_CanSM_Ch0 nên đặt BSWM_IMMEDIATE để ngắt Tx I-PDU ngay lập tức khi Bus-Off." });
  }
  if (!ecucConfig.BswMComMEnabled) {
    msgs.push({ err: false, txt: "⚠️ BswMComMEnabled = FALSE: Rule_02 kiểm tra ComM FULL_COM sẽ luôn đánh giá FALSE." });
  }
  box.innerHTML = msgs.map((m) => `<div class="cfg-alert${m.err ? " err" : ""}">${escapeHtml(m.txt)}</div>`).join("");
}

function renderInspector() {
  const body = document.getElementById("inspBody");
  if (!body) return;

  if (activeInspTab === 0) {
    const detHtml = simState.detFaults.length
      ? `<div class="insp-card" style="border-color:var(--err)">
          <div class="insp-h" style="color:var(--err)">🚨 Cảnh Báo DET Mới Nhất (${simState.detFaults.length})</div>
          ${simState.detFaults.slice(0, 4).map((f) => `<div class="mono" style="font-size:10.5px;margin-bottom:3px">[t=${f.t}ms] <b>${escapeHtml(f.code)}</b>: ${escapeHtml(f.detail)}</div>`).join("")}
        </div>` : "";
    const queueHtml = simState.deferredQueue.length
      ? `<div class="insp-card" style="border-color:var(--warn)">
          <div class="insp-h" style="color:var(--warn)">📥 Hàng Đợi DEFERRED Chờ BswM_MainFunction()</div>
          ${simState.deferredQueue.map((q, i) => `<div class="mono" style="font-size:10.5px">#${i + 1}: ${escapeHtml(q.portId)} = ${escapeHtml(q.value)} (t=${q.t}ms)</div>`).join("")}
        </div>`
      : `<div class="insp-card"><div class="insp-h">📥 Hàng Đợi DEFERRED</div><div style="font-size:11px;color:var(--mut)">Hàng đợi rỗng (0 cổng đang chờ).</div></div>`;

    body.innerHTML = `
      <div class="insp-card">
        <div class="insp-h">🔍 Giải Thích Bước Hiện Tại (${escapeHtml(currentScenId)})</div>
        <div style="font-size:12px;line-height:1.5;color:var(--txt)">${escapeHtml(simState.stepExplain)}</div>
      </div>
      ${detHtml}
      <div class="insp-card">
        <div class="insp-h">⚡ Trạng Thái Phân Xử &amp; ActionList Vừa Chạy</div>
        <div style="font-size:11.5px;line-height:1.6">
          <div><b>Rule trọng tâm:</b> <span class="mono" style="color:var(--pri)">${escapeHtml(simState.lastEvaluatedRuleId)}</span></div>
          <div><b>ActionList vừa chạy:</b> <span class="mono" style="color:var(--ok)">${escapeHtml(simState.lastExecutedActionList)}</span></div>
          <div><b>Vector I-PDU / PduR:</b> <span class="mono">${fmtHex8(simState.ipduVecByte)} (${fmtBin8(simState.ipduVecByte)})</span></div>
          <div><b>Thanh A (Arbitration):</b> <span class="mono">${fmtHex8(simState.regAByte)}</span> · <b>Thanh B (Control):</b> <span class="mono">${fmtHex8(simState.regBByte)}</span></div>
        </div>
      </div>
      ${queueHtml}`;
    return;
  }

  if (activeInspTab === 1) {
    const info = MODULES_INFO[simState.activeModId] || MODULES_INFO.MOD_BSWM;
    const pills = Object.keys(MODULES_INFO).map((k) =>
      `<button class="mod-pill${k === info.id ? " active" : ""}" onclick="selectModule('${k}')">${escapeHtml(k.replace("MOD_", ""))}</button>`
    ).join("");
    body.innerHTML = `
      <div class="mod-list">${pills}</div>
      <div class="insp-card">
        <div class="insp-h">🧩 ${escapeHtml(info.name)}</div>
        <div style="font-size:11px;color:var(--cyan);font-weight:700;margin-bottom:6px">${escapeHtml(info.layer)}</div>
        <p style="font-size:11.5px;margin-bottom:6px"><b>Vai trò:</b> ${escapeHtml(info.role)}</p>
        <p style="font-size:11.5px;margin-bottom:6px"><b>Input (Đầu vào):</b> ${escapeHtml(info.inputs)}</p>
        <p style="font-size:11.5px;margin-bottom:6px"><b>Xử lý nội bộ:</b> ${escapeHtml(info.processing)}</p>
        <p style="font-size:11.5px"><b>Output (Đầu ra):</b> ${escapeHtml(info.outputs)}</p>
      </div>
      <div class="insp-card">
        <div class="insp-h">📘 API Chuẩn AUTOSAR Liên Quan</div>
        ${(info.apis || []).map((a) => `<div class="code-block" style="margin-bottom:4px;padding:5px 7px">${escapeHtml(a)}</div>`).join("")}
      </div>`;
    return;
  }

  if (activeInspTab === 2) {
    const op = ecucConfig.Rule02_LogicalOperator;
    const reinit = ecucConfig.BswMPduGroupSwitchReinit ? "TRUE" : "FALSE";
    const cCode = `/* LIVE AUTOSAR Classic BswM Code (R23-11 · SWS_BswM) */
#include "BswM.h"
#include "Com.h"
#include "PduR.h"

void BswM_Init_And_Runtime_Example(void) {
  /* 1. Khởi tạo BswM từ EcuM_AL_DriverInitTwo */
  BswM_Init(&BswM_Config); /* INIT = ${ecucConfig.BswMInitialized ? "TRUE" : "FALSE"} */

  /* 2. Đánh giá biểu thức Logic Rule_02 (${op}) */
  /* Prev = ${simState.rules[2] ? simState.rules[2].prevResult : "BSWM_FALSE"}, Curr = ${simState.rules[2] ? simState.rules[2].currResult : "BSWM_FALSE"} */
  if ((MRP_ComM_Ch0 == ${simState.mrp.comm}) ${op === "BSWM_OR" ? "||" : "&&"}
      (MRP_CanSM_Ch0 == ${simState.mrp.cansm})) {
    /* TrueActionList: AL_EnableTxRxDM (${ecucConfig.AL_EnableTxRxDM_Execution}) */
    Com_IpduGroupStart(ComConf_ComIPduGroup_IG_0_Tx_App, ${reinit});
    Com_IpduGroupStart(ComConf_ComIPduGroup_IG_1_Rx_App, ${reinit});
    ${ecucConfig.EnableReceptionDmControl ? "Com_EnableReceptionDM(ComConf_ComIPduGroup_IG_2_Rx_DM);" : "/* Reception DM Disabled */"}
    ${ecucConfig.EnablePduRouterControl ? "PduR_EnableRouting(PduRConf_PduRRoutingPathGroup_RPG_0_Gateway);" : "/* PduR Control Disabled */"}
  } else {
    /* FalseActionList (${ecucConfig.Rule02_EnableFalseActionList ? "ENABLED" : "DISABLED"}) */
    Com_IpduGroupStop(ComConf_ComIPduGroup_IG_0_Tx_App);
    Com_DisableReceptionDM(ComConf_ComIPduGroup_IG_2_Rx_DM);
  }
}

void BswM_MainFunction(void) { /* Period = ${ecucConfig.BswMMainFunctionPeriod} ms */
  /* Xả ${simState.deferredQueue.length} cổng BSWM_DEFERRED & đếm ngược BswMTimer (${simState.timerLeftMs} ms) */
}`;
    body.innerHTML = `
      <div class="insp-card">
        <div class="insp-h">📄 Mã C Tương Đương Theo Cấu Hình ECUC Hiện Tại</div>
        <pre class="code-block">${escapeHtml(cCode)}</pre>
      </div>`;
    return;
  }

  // Tab 3: API Trace Log
  body.innerHTML = `
    <div class="insp-card" style="padding:6px 8px">
      <div class="insp-h">📜 Nhật Ký Gọi Hàm AUTOSAR BswM (${simState.traceLogs.length} mục)</div>
      <div style="font-size:10.5px;color:var(--mut)">Hiển thị theo thứ tự mới nhất lên trên (tính bằng ms từ lúc khởi động).</div>
    </div>
    ${simState.traceLogs.map((tr) => `
      <div class="trace-item ${escapeHtml(tr.level || "info")}">
        <div class="mono" style="font-weight:700;color:var(--txt)">[t=${tr.t}ms] ${escapeHtml(tr.api)}</div>
        <div style="color:var(--txt-soft);margin-top:2px">${escapeHtml(tr.detail)}</div>
      </div>`).join("")}`;
}

function renderAll() {
  renderHeaderAndQuickActions();
  renderRuleMatrixAndIpduVector();
  render8BitRegisters();
  renderTimersAndQueue();
  renderStateMachines();
  renderSvgArchitecture();
  renderConfigValidation();
  renderInspector();
}

// -------------------- FLOATING TOOLTIP (>1S DELAY) --------------------

function positionTooltipNear(targetEl, popupEl) {
  const rect = targetEl.getBoundingClientRect();
  const pw = 400;
  const ph = popupEl.offsetHeight || 220;
  let left = rect.right + 12;
  if (left + pw > window.innerWidth - 10) left = Math.max(10, rect.left - pw - 12);
  let top = rect.top - 10;
  if (top + ph > window.innerHeight - 10) top = Math.max(10, window.innerHeight - ph - 12);
  popupEl.style.left = left + "px";
  popupEl.style.top = top + "px";
}

function showConfigTooltip(cfgKey, targetEl) {
  const data = configTooltipData[cfgKey];
  const popup = document.getElementById("cfgTooltipPopup");
  if (!data || !popup) return;
  popup.innerHTML = `
    <div class="tt-hdr">
      <span class="tt-title">${escapeHtml(data.title)}</span>
      <span class="tt-meta mono">${escapeHtml(data.sws)}</span>
    </div>
    <div class="tt-sec"><b>ECUC Path:</b> <span class="mono">${escapeHtml(data.ecucPath)}</span></div>
    <div class="tt-sec"><b>Range / Type:</b> <span class="mono">${escapeHtml(data.range)}</span></div>
    <div class="tt-sec"><b>Vai trò:</b> ${escapeHtml(data.role)}</div>
    <div class="tt-sec"><b>Cơ chế bên trong:</b> ${escapeHtml(data.mechanism)}</div>
    <div class="tt-sec" style="margin-bottom:0"><b>Ảnh hưởng mô phỏng:</b> ${escapeHtml(data.scenarioImpact)}</div>`;
  positionTooltipNear(targetEl, popup);
  popup.classList.add("show");
}

function hideConfigTooltip() {
  if (tooltipHoverTimer) {
    clearTimeout(tooltipHoverTimer);
    tooltipHoverTimer = null;
  }
  lastTooltipKey = null;
  const popup = document.getElementById("cfgTooltipPopup");
  if (popup) popup.classList.remove("show");
}

function initTooltipHandlers() {
  document.querySelectorAll(".cfg-row[data-cfg-key]").forEach((row) => {
    const key = row.getAttribute("data-cfg-key");
    row.addEventListener("mouseenter", () => {
      if (tooltipHoverTimer) clearTimeout(tooltipHoverTimer);
      lastTooltipKey = key;
      tooltipHoverTimer = setTimeout(() => {
        if (lastTooltipKey === key) showConfigTooltip(key, row);
      }, 1050);
    });
    row.addEventListener("mouseleave", hideConfigTooltip);
  });
}

// -------------------- EXPORT MODAL & STANDALONE HTML DOWNLOAD --------------------

function buildBswMArxml() {
  const c = ecucConfig;
  return `<?xml version="1.0" encoding="UTF-8"?>
<AUTOSAR xmlns="http://autosar.org/schema/r4.0">
  <AR-PACKAGES><AR-PACKAGE><SHORT-NAME>BswM_Ecuc</SHORT-NAME><ELEMENTS>
    <ECUC-MODULE-CONFIGURATION-VALUES><SHORT-NAME>BswM</SHORT-NAME>
      <CONTAINERS>
        <ECUC-CONTAINER-VALUE><SHORT-NAME>BswMGeneral</SHORT-NAME>
          <PARAMETER-VALUES>
            <ECUC-NUMERICAL-PARAM-VALUE><SHORT-NAME>BswMDevErrorDetect</SHORT-NAME><VALUE>${c.BswMDevErrorDetect}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
            <ECUC-NUMERICAL-PARAM-VALUE><SHORT-NAME>BswMVersionInfoApi</SHORT-NAME><VALUE>${c.BswMVersionInfoApi}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
            <ECUC-NUMERICAL-PARAM-VALUE><SHORT-NAME>BswMMainFunctionPeriod</SHORT-NAME><VALUE>${(Number(c.BswMMainFunctionPeriod) / 1000).toFixed(3)}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
            <ECUC-NUMERICAL-PARAM-VALUE><SHORT-NAME>BswMComMEnabled</SHORT-NAME><VALUE>${c.BswMComMEnabled}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
            <ECUC-NUMERICAL-PARAM-VALUE><SHORT-NAME>BswMComMPncEnabled</SHORT-NAME><VALUE>${c.BswMComMPncEnabled}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
            <ECUC-NUMERICAL-PARAM-VALUE><SHORT-NAME>BswMDcmEnabled</SHORT-NAME><VALUE>${c.BswMDcmEnabled}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
          </PARAMETER-VALUES>
        </ECUC-CONTAINER-VALUE>
        <ECUC-CONTAINER-VALUE><SHORT-NAME>BswMArbitration</SHORT-NAME>
          <PARAMETER-VALUES>
            <ECUC-TEXTUAL-PARAM-VALUE><SHORT-NAME>MRP_ComM_Ch0_Processing</SHORT-NAME><VALUE>${c.MRP_ComM_Ch0_Processing}</VALUE></ECUC-TEXTUAL-PARAM-VALUE>
            <ECUC-TEXTUAL-PARAM-VALUE><SHORT-NAME>MRP_CanSM_Ch0_Processing</SHORT-NAME><VALUE>${c.MRP_CanSM_Ch0_Processing}</VALUE></ECUC-TEXTUAL-PARAM-VALUE>
            <ECUC-TEXTUAL-PARAM-VALUE><SHORT-NAME>MRP_Dcm_ComCtrl_Processing</SHORT-NAME><VALUE>${c.MRP_Dcm_ComCtrl_Processing}</VALUE></ECUC-TEXTUAL-PARAM-VALUE>
            <ECUC-TEXTUAL-PARAM-VALUE><SHORT-NAME>MRP_EcuM_State_Processing</SHORT-NAME><VALUE>${c.MRP_EcuM_State_Processing}</VALUE></ECUC-TEXTUAL-PARAM-VALUE>
            <ECUC-TEXTUAL-PARAM-VALUE><SHORT-NAME>Rule02_ComMFull_InitState</SHORT-NAME><VALUE>${c.Rule02_ComMFull_InitState}</VALUE></ECUC-TEXTUAL-PARAM-VALUE>
            <ECUC-TEXTUAL-PARAM-VALUE><SHORT-NAME>Rule02_LogicalOperator</SHORT-NAME><VALUE>${c.Rule02_LogicalOperator}</VALUE></ECUC-TEXTUAL-PARAM-VALUE>
          </PARAMETER-VALUES>
        </ECUC-CONTAINER-VALUE>
        <ECUC-CONTAINER-VALUE><SHORT-NAME>BswMModeControl</SHORT-NAME>
          <PARAMETER-VALUES>
            <ECUC-TEXTUAL-PARAM-VALUE><SHORT-NAME>AL_EnableTxRxDM_Execution</SHORT-NAME><VALUE>${c.AL_EnableTxRxDM_Execution}</VALUE></ECUC-TEXTUAL-PARAM-VALUE>
            <ECUC-NUMERICAL-PARAM-VALUE><SHORT-NAME>BswMAbortOnFail</SHORT-NAME><VALUE>${c.BswMAbortOnFail}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
            <ECUC-NUMERICAL-PARAM-VALUE><SHORT-NAME>BswMPduGroupSwitchReinit</SHORT-NAME><VALUE>${c.BswMPduGroupSwitchReinit}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
            <ECUC-NUMERICAL-PARAM-VALUE><SHORT-NAME>BswMTimerValue</SHORT-NAME><VALUE>${c.BswMTimerValue}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
          </PARAMETER-VALUES>
        </ECUC-CONTAINER-VALUE>
      </CONTAINERS>
    </ECUC-MODULE-CONFIGURATION-VALUES>
  </ELEMENTS></AR-PACKAGE></AR-PACKAGES>
</AUTOSAR>`;
}

function buildBswMCfgH() {
  const c = ecucConfig;
  const yn = (b) => (b ? "STD_ON" : "STD_OFF");
  return `/* BswM_Cfg.h — Generated from AUTOSAR Classic BswM Simulator (R23-11) */
#ifndef BSWM_CFG_H
#define BSWM_CFG_H

#define BSWM_MODULE_ID                      (42U)
#define BSWM_DEV_ERROR_DETECT               ${yn(c.BswMDevErrorDetect)}
#define BSWM_VERSION_INFO_API               ${yn(c.BswMVersionInfoApi)}
#define BSWM_MAIN_FUNCTION_PERIOD_MS        (${c.BswMMainFunctionPeriod}U)
#define BSWM_COMM_ENABLED                   ${yn(c.BswMComMEnabled)}
#define BSWM_COMM_PNC_ENABLED               ${yn(c.BswMComMPncEnabled)}
#define BSWM_DCM_ENABLED                    ${yn(c.BswMDcmEnabled)}
#define BSWM_INDEPENDENT_RULE_EVAL          ${yn(c.EnableIndependentRuleEvaluation)}
#define BSWM_PDU_GROUP_SWITCH_REINIT        ${c.BswMPduGroupSwitchReinit ? "TRUE" : "FALSE"}
#define BSWM_ABORT_ON_FAIL                  ${c.BswMAbortOnFail ? "TRUE" : "FALSE"}
#define BSWM_TIMER0_DEFAULT_MS              (${c.BswMTimerValue}U)
#define BSWM_ECUM_SHUTDOWN_TARGET           ${c.EcuMShutdownTarget}

#endif /* BSWM_CFG_H */`;
}

function buildBswMLcfgC() {
  const c = ecucConfig;
  return `/* BswM_Lcfg.c — Link-Time Mode Arbitration & ActionLists Configuration */
#include "BswM.h"

const BswM_ModeRequestPortCfgType BswM_MrpCfg[] = {
  { "MRP_ComM_Ch0",    ${c.MRP_ComM_Ch0_Processing} },
  { "MRP_CanSM_Ch0",   ${c.MRP_CanSM_Ch0_Processing} },
  { "MRP_Dcm_ComCtrl", ${c.MRP_Dcm_ComCtrl_Processing} },
  { "MRP_EcuM_State",  ${c.MRP_EcuM_State_Processing} },
  { "MRP_NvM_Job",     ${c.MRP_NvM_Job_Processing} },
  { "MRP_Swc_AppMode", ${c.MRP_Swc_AppMode_Processing} }
};

const BswM_RuleCfgType BswM_RuleCfg[] = {
  { "Rule_02_ComMFullCom",  ${c.Rule02_ComMFull_InitState}, ${c.Rule02_LogicalOperator}, ${c.AL_EnableTxRxDM_Execution}, ${c.Rule02_EnableFalseActionList ? "&AL_DisableTxRxDM" : "NULL_PTR"} },
  { "Rule_06_SwcSportMode", ${c.Rule06_SwcSport_InitState}, BSWM_AND, ${c.AL_SwcSportMode_Execution}, &AL_SwcNormalMode }
};

const BswM_ConfigType BswM_Config = {
  .NumMrpPorts = 6U,
  .NumRules = 10U,
  .DefaultActionPriority = ${c.BswMActionListPriority}U
};`;
}

function getExportContentAndName(tabIdx) {
  if (tabIdx === 0) return { name: "BswM.arxml", content: buildBswMArxml() };
  if (tabIdx === 1) return { name: "BswM_Cfg.h", content: buildBswMCfgH() };
  if (tabIdx === 2) return { name: "BswM_Lcfg.c", content: buildBswMLcfgC() };
  return { name: "BswM_Config.json", content: JSON.stringify({ scenario: currentScenId, ecucConfig, simStateSummary: { ipduVec: fmtHex8(simState.ipduVecByte), regA: fmtHex8(simState.regAByte), regB: fmtHex8(simState.regBByte), mrp: simState.mrp } }, null, 2) };
}

function openExportModal() {
  const modal = document.getElementById("exportModal");
  if (modal) modal.classList.remove("hidden");
  switchExportTab(currentExportTab);
}

function closeExportModal() {
  const modal = document.getElementById("exportModal");
  if (modal) modal.classList.add("hidden");
}

function switchExportTab(tabIdx) {
  currentExportTab = tabIdx;
  for (let i = 0; i < 4; i++) {
    const btn = document.getElementById("expTab" + i);
    if (btn) btn.classList.toggle("btn-pri", i === tabIdx);
  }
  const area = document.getElementById("exportCodeArea");
  if (area) area.textContent = getExportContentAndName(tabIdx).content;
}

function copyExportCode() {
  const text = getExportContentAndName(currentExportTab).content;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text);
  }
}

function downloadExportCode() {
  const obj = getExportContentAndName(currentExportTab);
  const blob = new Blob([obj.content], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = obj.name;
  a.click();
}

function downloadStandaloneHTML() {
  const htmlContent = "<!DOCTYPE html>\n" + document.documentElement.outerHTML;
  const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "AUTOSAR_BswM_Simulator.html";
  a.click();
}
