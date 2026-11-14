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
    .replace(/"/g, "&quot;");
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
  currentStepIdx = 0;
  scenarioSnapshots = [captureScenarioSnapshot()];
  simState.stepExplain = sc.summary + " (" + simState.stepExplain + ")";
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
  const beforeA = simState.regAByte;
  const beforeB = simState.regBByte;
  simState.activeArrows = [];
  stepObj.exec();
  simState.prevRegAByte = beforeA;
  simState.prevRegBByte = beforeB;
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
  if (btn) btn.textContent = "▶ Tự Động Kịch Bản";
}

function toggleScenarioAutoPlay() {
  if (autoPlayTimer) {
    stopAutoPlay();
    return;
  }
  const btn = document.getElementById("btnAutoPlay");
  if (btn) btn.textContent = "⏸ Dừng Tự Động";
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
    if (btn) btn.textContent = "⏱ Auto Clock";
    return;
  }
  if (btn) btn.textContent = "⏹ Stop Clock";
  autoClockTimer = setInterval(() => {
    stepClockTick(Number(ecucConfig.FiMMainFunctionPeriod) || 20);
  }, 500);
}

function runWhatIf(idx) {
  const sc = SCENARIOS[currentScenarioIdx];
  const wf = sc && sc.whatIfs && sc.whatIfs[idx];
  if (!wf) return;
  const beforeA = simState.regAByte;
  const beforeB = simState.regBByte;
  simState.activeArrows = [];
  wf.run();
  simState.prevRegAByte = beforeA;
  simState.prevRegBByte = beforeB;
  simState.stepExplain = "🧪 Thử Nghiệm Nhanh (" + wf.label + ") — Hãy quan sát Ma trận Ức chế, công thức Bitwise & 2 Thanh ghi 8-Bit!";
  renderAll();
}

// -------------------- QUICK ACTIONS --------------------

function onQaSelectorChange() {
  const evtIdx = Number(document.getElementById("qaEventSelect").value || 0);
  const fidIdx = Number(document.getElementById("qaFidSelect").value || 0);
  simState.selectedEventIdx = evtIdx;
  simState.selectedFidIdx = fidIdx;
  recomputeFimState(true);
  renderAll();
}

function qaReportEventFailed() {
  const evtIdx = Number(document.getElementById("qaEventSelect").value || 0);
  const cur = simState.demEvents[evtIdx].statusByte;
  const next = (cur | 0x2F) & ~0x40; // TF=1, TFTOC=1, PDTC=1, CDTC=1, TFSLC=1, TNCTOC=0 -> 0x2F
  simState.activeArrows = [];
  const beforeA = simState.regAByte;
  const beforeB = simState.regBByte;
  const ok = api_Dem_SetEventStatus(evtIdx, next, "DEM_EVENT_STATUS_FAILED");
  simState.prevRegAByte = beforeA;
  simState.prevRegBByte = beforeB;
  syncConfigToDOM();
  simState.stepExplain = ok
    ? "Quick Action: " + simState.demEvents[evtIdx].shortName + " báo FAILED (" + fmtHexByte(next) + ", TF=1, TNCTOC=0)."
    : "Quick Action: Lỗi Evt_01 đã bị CHẶN bởi cổng CascadingFaultSuppression (FID_2 = FALSE)!";
  renderAll();
}

function qaReportEventPassed() {
  const evtIdx = Number(document.getElementById("qaEventSelect").value || 0);
  const cur = simState.demEvents[evtIdx].statusByte;
  const next = cur & ~0x41; // Clear Bit 0 (TF=0) & Bit 6 (TNCTOC=0)
  simState.activeArrows = [];
  const beforeA = simState.regAByte;
  const beforeB = simState.regBByte;
  api_Dem_SetEventStatus(evtIdx, next, "DEM_EVENT_STATUS_PASSED");
  simState.prevRegAByte = beforeA;
  simState.prevRegBByte = beforeB;
  syncConfigToDOM();
  simState.stepExplain = "Quick Action: " + simState.demEvents[evtIdx].shortName + " báo PASSED (" + fmtHexByte(next) + ", TF=0, TNCTOC=0).";
  renderAll();
}

function qaStartNewOpCycle() {
  simState.activeArrows = [];
  const beforeA = simState.regAByte;
  const beforeB = simState.regBByte;
  api_Dem_SetOperationCycleStart(false);
  simState.prevRegAByte = beforeA;
  simState.prevRegBByte = beforeB;
  syncConfigToDOM();
  simState.stepExplain = "Quick Action: Dem_SetOperationCycleState(START) -> Đặt Bit 6 (TNCTOC = 1) cho các Events.";
  renderAll();
}

function qaClearDtc() {
  simState.activeArrows = [];
  const beforeA = simState.regAByte;
  const beforeB = simState.regBByte;
  api_Dem_ClearDTC();
  simState.prevRegAByte = beforeA;
  simState.prevRegBByte = beforeB;
  syncConfigToDOM();
  simState.stepExplain = "Quick Action: UDS 0x14 Dem_ClearDTC() -> Mọi Event về 0x50 (TF=0, TNCTOC=1) & chạy FiM_DemInit().";
  renderAll();
}

function qaToggleCompFailed() {
  simState.activeArrows = [];
  const beforeA = simState.regAByte;
  const beforeB = simState.regBByte;
  if (!ecucConfig.ComponentInhibition_Enabled) {
    ecucConfig.ComponentInhibition_Enabled = true;
  }
  api_FiM_DemTriggerOnComponentStatus(!simState.demCompFailed);
  simState.prevRegAByte = beforeA;
  simState.prevRegBByte = beforeB;
  syncConfigToDOM();
  simState.stepExplain = "Quick Action: FiM_DemTriggerOnComponentStatus(Comp_01, " + (simState.demCompFailed ? "TRUE" : "FALSE") + ").";
  renderAll();
}

function qaToggleFidAvailable() {
  const fidIdx = Number(document.getElementById("qaFidSelect").value || 0);
  simState.activeArrows = [];
  const beforeA = simState.regAByte;
  const beforeB = simState.regBByte;
  const nextAvail = !Boolean(ecucConfig["FID" + fidIdx + "_Available"]);
  api_FiM_SetFunctionAvailable(fidIdx, nextAvail);
  simState.prevRegAByte = beforeA;
  simState.prevRegBByte = beforeB;
  syncConfigToDOM();
  simState.stepExplain = "Quick Action: FiM_SetFunctionAvailable(FID_" + fidIdx + ", " + (nextAvail ? "TRUE" : "FALSE") + ").";
  renderAll();
}

function qaQueryPermission() {
  const fidIdx = Number(document.getElementById("qaFidSelect").value || 0);
  simState.activeArrows = [];
  const res = api_FiM_GetFunctionPermission(fidIdx, false);
  simState.stepExplain = "Quick Action: SWC_Controller gọi FiM_GetFunctionPermission(FID_" + fidIdx + ", &Perm) -> Trả " + res.retVal + ", Permission = " + (res.permission ? "TRUE" : "FALSE") + ".";
  renderAll();
}

// -------------------- INTERACTIVE MATRIX & BIT CLICKS --------------------

function selectRuleRow(ruleId, evtIdx, fidIdx) {
  simState.selectedRuleId = ruleId;
  simState.selectedEventIdx = evtIdx;
  simState.selectedFidIdx = fidIdx;
  recomputeFimState(true);
  renderAll();
}

function selectFidCard(fidIdx) {
  simState.selectedFidIdx = fidIdx;
  recomputeFimState(true);
  renderAll();
}

function applyMaskToActiveRule(maskName) {
  if (simState.selectedRuleId === "InhCfg0") ecucConfig.InhCfg0_Mask = maskName;
  else if (simState.selectedRuleId === "InhCfg1") ecucConfig.InhCfg1_Mask = maskName;
  else if (simState.selectedRuleId === "InhCfg2") ecucConfig.InhCfg2_Mask = maskName;
  else ecucConfig.InhCfg0_Mask = maskName;
  recomputeFimState();
  syncConfigToDOM();
  addTraceLog("info", "Mask Updated -> " + maskName, "Áp dụng mặt nạ " + maskName + " cho quy tắc " + simState.selectedRuleId + ".");
  renderAll();
}

function toggleRegisterBit(regType, mask) {
  simState.activeArrows = [];
  const beforeA = simState.regAByte;
  const beforeB = simState.regBByte;
  if (regType === "A") {
    const evtIdx = simState.selectedEventIdx;
    const cur = simState.demEvents[evtIdx].statusByte;
    const next = cur ^ mask;
    api_Dem_SetEventStatus(evtIdx, next, "BitFlip(" + fmtHexByte(next) + ")");
  } else if (regType === "B") {
    const fidIdx = simState.selectedFidIdx;
    if (mask === 0x80) {
      if (isFimReady()) {
        simState.lifecycleState = "FIM_UNINITIALIZED";
        ecucConfig.FiMInitialized = false;
        recomputeFimState();
      } else {
        api_FiM_Init(false);
        api_FiM_DemInit();
      }
    } else if (mask === 0x40) {
      ecucConfig.FiMEventUpdateTriggeredByDem = !ecucConfig.FiMEventUpdateTriggeredByDem;
      if (ecucConfig.FiMEventUpdateTriggeredByDem) {
        api_FiM_DemInit();
      } else {
        recomputeFimState();
      }
    } else if (mask === 0x20) {
      ecucConfig.FiMAvailabilitySupport = !ecucConfig.FiMAvailabilitySupport;
      recomputeFimState();
    } else if (mask === 0x10) {
      if (!ecucConfig.ComponentInhibition_Enabled) ecucConfig.ComponentInhibition_Enabled = true;
      api_FiM_DemTriggerOnComponentStatus(!simState.demCompFailed);
    } else if (mask === 0x02) {
      api_FiM_SetFunctionAvailable(fidIdx, !Boolean(ecucConfig["FID" + fidIdx + "_Available"]));
    } else if (mask === 0x01) {
      api_FiM_GetFunctionPermission(fidIdx, false);
    }
  }
  simState.prevRegAByte = beforeA;
  simState.prevRegBByte = beforeB;
  syncConfigToDOM();
  renderAll();
}

// -------------------- RENDER SUB-COMPONENTS --------------------

function renderHeaderAndQuickActions() {
  const sc = SCENARIOS[currentScenarioIdx];
  document.getElementById("stepIndicator").textContent = "Bước " + currentStepIdx + " / " + sc.steps.length;
  document.getElementById("btnPrevStep").disabled = (currentStepIdx <= 0);
  document.getElementById("btnNextStep").disabled = (currentStepIdx >= sc.steps.length);
  document.getElementById("clockVal").textContent = simState.clockMs + " ms";

  const bFim = document.getElementById("hdrBadgeFim");
  if (simState.lifecycleState === "FIM_INITIALIZED_READY") {
    bFim.textContent = "FiM: INITIALIZED";
    bFim.className = "state-badge sb-init";
  } else if (simState.lifecycleState === "FIM_PRE_INITIALIZED") {
    bFim.textContent = "FiM: PRE_INIT";
    bFim.className = "state-badge sb-warn";
  } else {
    bFim.textContent = "FiM: UNINIT";
    bFim.className = "state-badge sb-inhib";
  }

  const f0 = simState.fids[0], f1 = simState.fids[1], f2 = simState.fids[2];
  const bf0 = document.getElementById("hdrBadgeFid0");
  bf0.textContent = "FID_0 ACC: " + (f0.permission ? "TRUE" : "FALSE");
  bf0.className = "state-badge " + (f0.permission ? "sb-perm" : "sb-inhib");

  const bf1 = document.getElementById("hdrBadgeFid1");
  bf1.textContent = "FID_1 AEB: " + (f1.permission ? "TRUE" : "FALSE");
  bf1.className = "state-badge " + (f1.permission ? "sb-perm" : "sb-inhib");

  const bf2 = document.getElementById("hdrBadgeFid2");
  bf2.textContent = "FID_2 DiagMon: " + (f2.permission ? "TRUE" : "FALSE");
  bf2.className = "state-badge " + (f2.permission ? "sb-perm" : "sb-inhib");

  // Sync Quick Action selectors & statuses
  const qaEvtSel = document.getElementById("qaEventSelect");
  const qaFidSel = document.getElementById("qaFidSelect");
  if (qaEvtSel) qaEvtSel.value = String(simState.selectedEventIdx);
  if (qaFidSel) qaFidSel.value = String(simState.selectedFidIdx);

  const selFid = simState.fids[simState.selectedFidIdx];
  document.getElementById("qaTxtCompFail").textContent = simState.demCompFailed ? "TRUE" : "FALSE";
  document.getElementById("qaBtnCompFail").classList.toggle("qa-active", simState.demCompFailed);

  document.getElementById("qaTxtFidAvail").textContent = selFid.available ? "TRUE" : "FALSE";
  document.getElementById("qaBtnFidAvail").classList.toggle("qa-active", !selFid.available);

  document.getElementById("qaTxtPermRes").textContent = selFid.permission ? "TRUE" : "FALSE";
  document.getElementById("qaBtnGetPerm").classList.toggle("qa-active", selFid.permission);

  // Scenario Summary & What-If
  document.getElementById("scenIdBadge").textContent = sc.id + " (" + sc.group + ")";
  document.getElementById("scenSummaryBox").textContent = sc.summary;
  document.getElementById("whatIfContainer").innerHTML = sc.whatIfs.map((w, i) =>
    "<button class=\"whatif-btn\" onclick=\"runWhatIf(" + i + ")\">" + escapeHtmlSafe(w.label) + "</button>"
  ).join("");

  // Config Validation Alerts
  const alerts = validateConfigRules();
  document.getElementById("cfgValidationBox").innerHTML = alerts.map((a) =>
    "<div class=\"cfg-alert " + (a.err ? "err" : "") + "\">" + (a.err ? "❌ " : "⚠️ ") + escapeHtmlSafe(a.msg) + "</div>"
  ).join("");
}

function renderInhibitionMatrixAndFids() {
  const pushTxt = ecucConfig.FiMEventUpdateTriggeredByDem ? "Push Mode (DEM Trigger)" : "Polling Mode (MainFn)";
  document.getElementById("panel1SummaryMeta").textContent = pushTxt + " · AvailSupp: " + (ecucConfig.FiMAvailabilitySupport ? "TRUE" : "FALSE");
  const activeCount = simState.rules.filter((r) => r.enabled).length;
  document.getElementById("matrixRuleCountBadge").textContent = activeCount + " / 4 Rules Active";

  document.getElementById("inhRulesBody").innerHTML = simState.rules.map((r) => {
    const isSel = simState.selectedRuleId === r.id;
    const rowCls = "matrix-row" + (isSel ? " selected-row" : "") + (!r.enabled ? " disabled-row" : "");
    const statusPill = !r.enabled
      ? "<span class=\"pill-off\">OFF</span>"
      : (r.matched ? "<span class=\"pill-match\">🔴 MATCH=1</span>" : "<span class=\"pill-clear\">🟢 CLEAR=0</span>");
    return "<tr class=\"" + rowCls + "\" onclick=\"selectRuleRow('" + r.id + "', " + r.eventIdx + ", " + r.targetFids[0] + ")\">" +
      "<td class=\"mono\" style=\"font-weight:700\">" + r.id + "</td>" +
      "<td>" + escapeHtmlSafe(r.sourceLabel) + "</td>" +
      "<td class=\"mono\" style=\"color:var(--cyan)\">" + escapeHtmlSafe(r.statusDisplay) + "</td>" +
      "<td class=\"mono\" style=\"font-size:10px\">" + escapeHtmlSafe(r.maskName) + "</td>" +
      "<td class=\"mono\" style=\"font-size:10px\">" + escapeHtmlSafe(r.formula) + "</td>" +
      "<td class=\"mono\">" + escapeHtmlSafe(r.targetLabel) + "</td>" +
      "<td>" + statusPill + "</td>" +
    "</tr>";
  }).join("");

  const linkedLabels = [
    "InhCfg0" + (ecucConfig.SummaryEvent_Sum01_Enabled ? ", Sum01" : "") + (ecucConfig.ComponentInhibition_Enabled ? ", Comp1" : ""),
    "InhCfg0" + (ecucConfig.ComponentInhibition_Enabled ? ", Comp1" : ""),
    "InhCfg1 (5V Sup)"
  ];

  document.getElementById("fidCardsBox").innerHTML = simState.fids.map((f) => {
    const fidName = ecucConfig["FID" + f.id + "_Name"] || ("FID_" + f.id);
    const isSel = simState.selectedFidIdx === f.id;
    const cls = "fid-card " + (f.permission ? "fid-ok" : "fid-lock") + (isSel ? " selected-fid" : "");
    const permBadge = f.permission
      ? "<span class=\"pill-clear\">✅ TRUE</span>"
      : "<span class=\"pill-match\">🚫 FALSE</span>";
    const iumprTag = ecucConfig.ObdIumprInhibitionSupport
      ? " · IUMPR: " + (f.iumprLocked ? "LOCKED" : "OPEN")
      : "";
    return "<div class=\"" + cls + "\" onclick=\"selectFidCard(" + f.id + ")\">" +
      "<div class=\"fid-card-top\"><span class=\"mono\">" + escapeHtmlSafe(fidName) + "</span>" + permBadge + "</div>" +
      "<div class=\"fid-card-meta\">" +
        "<span>Links: <b>" + linkedLabels[f.id] + "</b></span>" +
        "<span class=\"mono\">InhCnt: <b>" + f.inhibitCount + "</b> · Avl: <b>" + (f.available ? "1" : "0") + "</b>" + iumprTag + "</span>" +
      "</div>" +
    "</div>";
  }).join("");
}

function render8BitRegisters() {
  const evt = simState.demEvents[simState.selectedEventIdx] || simState.demEvents[0];
  const cachedByte = simState.fimCacheEvents[simState.selectedEventIdx] & 0xFF;
  const stale = cachedByte !== (evt.statusByte & 0xFF);

  document.getElementById("regATitle").textContent = "Thanh A: UDS Status (" + evt.shortName + ")";
  document.getElementById("regAHex").textContent = fmtHexByte(simState.regAByte);

  const activeMask = simState.selectedEventIdx === 1 ? ecucConfig.InhCfg1_Mask : (simState.selectedEventIdx === 2 ? ecucConfig.InhCfg2_Mask : ecucConfig.InhCfg0_Mask);
  const evalObj = evaluateMask(cachedByte, activeMask);
  document.getElementById("regABitwiseSub").innerHTML =
    "<span>" + fmtBinByte(simState.regAByte) + " · Mask <b>" + activeMask + "</b></span>" +
    "<span style=\"color:" + (stale ? "var(--warn)" : (evalObj.matched ? "var(--err)" : "var(--ok)")) + "\">" +
      (stale ? ("⏳ Stale FiM Cache: " + fmtHexByte(cachedByte)) : (evalObj.matched ? "🔴 MATCH" : "🟢 CLEAR")) +
    "</span>";

  document.getElementById("regABits").innerHTML = UDS_STATUS_BITS.map((d) => {
    const on = (simState.regAByte & d.mask) !== 0;
    const chg = ((simState.regAByte ^ simState.prevRegAByte) & d.mask) !== 0;
    const cls = "bit-box" + (on ? " on" : "") + (d.tone ? " " + d.tone + "-bit" : "") + (d.keyBit ? " key-bit" : "") + (chg ? " chg" : "");
    return "<div class=\"" + cls + "\" title=\"" + escapeHtmlSafe(d.name + ": " + d.desc) + "\" onclick=\"toggleRegisterBit('A', " + d.mask + ")\">" +
      "<div class=\"bit-pos\">b" + d.bit + (d.keyBit ? "★" : "") + "</div>" +
      "<div class=\"bit-val mono\">" + (on ? "1" : "0") + "</div>" +
      "<div class=\"bit-tag\">" + d.tag + "</div>" +
    "</div>";
  }).join("");

  const fid = simState.fids[simState.selectedFidIdx] || simState.fids[0];
  document.getElementById("regBTitle").textContent = "Thanh B: FiM Engine (FID_" + fid.id + ")";
  document.getElementById("regBHex").textContent = fmtHexByte(simState.regBByte);
  document.getElementById("regBSubbar").innerHTML =
    "<span>" + fmtBinByte(simState.regBByte) + " · InhCnt=" + fid.inhibitCount + "</span>" +
    "<span style=\"color:" + (fid.permission ? "var(--ok)" : "var(--err)") + ";font-weight:800\">" +
      (fid.permission ? "✅ PERM = TRUE" : "🚫 PERM = FALSE") +
    "</span>";

  document.getElementById("regBBits").innerHTML = FIM_ENGINE_BITS.map((d) => {
    const on = (simState.regBByte & d.mask) !== 0;
    const chg = ((simState.regBByte ^ simState.prevRegBByte) & d.mask) !== 0;
    const cls = "bit-box" + (on ? " on" : "") + (d.tone ? " " + d.tone + "-bit" : "") + (chg ? " chg" : "");
    return "<div class=\"" + cls + "\" title=\"" + escapeHtmlSafe(d.name + ": " + d.desc) + "\" onclick=\"toggleRegisterBit('B', " + d.mask + ")\">" +
      "<div class=\"bit-pos\">b" + d.bit + "</div>" +
      "<div class=\"bit-val mono\">" + (on ? "1" : "0") + "</div>" +
      "<div class=\"bit-tag\">" + d.tag + "</div>" +
    "</div>";
  }).join("");
}

function renderBitwiseEvaluatorAndStateMachines() {
  const evtIdx = simState.selectedEventIdx;
  const cachedByte = simState.fimCacheEvents[evtIdx] & 0xFF;
  const activeMask = evtIdx === 1 ? ecucConfig.InhCfg1_Mask : (evtIdx === 2 ? ecucConfig.InhCfg2_Mask : ecucConfig.InhCfg0_Mask);

  document.getElementById("panel2EvalBadge").textContent =
    "FiM Cache [" + simState.demEvents[evtIdx].shortName + "] = " + fmtHexByte(cachedByte) + " · Selected: FID_" + simState.selectedFidIdx;

  document.getElementById("maskEvalGrid").innerHTML = Object.values(FIM_MASKS_DEF).map((m) => {
    const ev = evaluateMask(cachedByte, m.id);
    const isCurRuleMask = (m.id === activeMask);
    const cls = "mask-card " + (ev.matched ? "is-match" : "is-clear") + (isCurRuleMask ? " active-rule" : "");
    return "<div class=\"" + cls + "\" style=\"cursor:pointer\" onclick=\"applyMaskToActiveRule('" + m.id + "')\" title=\"Click để gán mặt nạ " + m.id + " cho quy tắc đang chọn\">" +
      "<div class=\"mask-card-top\"><span>" + m.id + "</span><span>" + (ev.matched ? "🔴 1" : "🟢 0") + "</span></div>" +
      "<div class=\"mono\" style=\"font-size:10px;color:var(--txt-soft)\">" + escapeHtmlSafe(ev.formulaStr) + "</div>" +
      "<div style=\"font-size:9.5px;color:var(--mut);margin-top:2px\">" + m.shortDesc + (isCurRuleMask ? " · <b>(Đang dùng)</b>" : "") + "</div>" +
    "</div>";
  }).join("");

  // State Machine 1: FiM Lifecycle & Update Mode
  const lc = simState.lifecycleState;
  const isPush = Boolean(ecucConfig.FiMEventUpdateTriggeredByDem);
  document.getElementById("smLifecycleLbl").textContent = lc.replace("FIM_", "");
  document.getElementById("fimLifecycleSm").innerHTML =
    "<div class=\"sm-node " + (lc === "FIM_UNINITIALIZED" ? "active-err" : "") + "\">" +
      "<div class=\"sm-node-hdr\"><span>1. FIM_UNINITIALIZED (Reset)</span><span class=\"mono\">" + (lc === "FIM_UNINITIALIZED" ? "ACTIVE" : "-") + "</span></div>" +
      "<div style=\"font-size:9.5px;color:var(--mut)\">GetFunctionPermission() -> E_NOT_OK, Perm=FALSE (DET 0x01)</div>" +
    "</div>" +
    "<div class=\"sm-node " + (lc === "FIM_PRE_INITIALIZED" ? "active-warn" : "") + "\">" +
      "<div class=\"sm-node-hdr\"><span>2. FIM_PRE_INITIALIZED (Sau FiM_Init)</span><span class=\"mono\">" + (lc === "FIM_PRE_INITIALIZED" ? "ACTIVE" : "-") + "</span></div>" +
      "<div style=\"font-size:9.5px;color:var(--mut)\">Đã nạp config tĩnh; chờ DEM chạy xong NvM &amp; gọi FiM_DemInit()</div>" +
    "</div>" +
    "<div class=\"sm-node " + (lc === "FIM_INITIALIZED_READY" ? "active-ok" : "") + "\">" +
      "<div class=\"sm-node-hdr\"><span>3. FIM_INITIALIZED_READY (Sau FiM_DemInit)</span><span class=\"mono\">" + (lc === "FIM_INITIALIZED_READY" ? "ACTIVE" : "-") + "</span></div>" +
      "<div class=\"sm-subs\">" +
        "<span class=\"sm-subnode " + (lc === "FIM_INITIALIZED_READY" && isPush ? "sub-active" : "") + "\">EVENT_DRIVEN_PUSH_MODE</span>" +
        "<span class=\"sm-subnode " + (lc === "FIM_INITIALIZED_READY" && !isPush ? "sub-active" : "") + "\">CYCLIC_POLLING_MODE</span>" +
      "</div>" +
    "</div>";

  // State Machine 2: FID Permission
  const fid = simState.fids[simState.selectedFidIdx] || simState.fids[0];
  let fidStateKey = "PERMITTED";
  if (!isFimReady() || !fid.available) fidStateKey = "NOT_AVAILABLE";
  else if (fid.compMatch) fidStateKey = "INH_COMP";
  else if (fid.inhibitCount > 0) fidStateKey = "INH_MASK";

  document.getElementById("smFidSelLbl").textContent = "FID_" + fid.id + " -> " + (fid.permission ? "PERMITTED" : "INHIBITED");
  const fidNodes = [
    { k: "PERMITTED",     t: "FID_PERMITTED_ACTIVE",      s: "Perm = TRUE (Normal Mode)",    cls: "active-perm" },
    { k: "INH_MASK",      t: "FID_INHIBITED_BY_MASK",     s: "Event / Summary khớp Mask",    cls: "active-lock" },
    { k: "INH_COMP",      t: "FID_INHIBITED_BY_COMP",     s: "DemComponent Failed == TRUE",  cls: "active-lock" },
    { k: "NOT_AVAILABLE", t: "FID_DISABLED_UNAVAILABLE",  s: "Availability=0 hoặc UNINIT",   cls: "active-warn" }
  ];
  document.getElementById("fidPermissionSm").innerHTML = fidNodes.map((n) =>
    "<div class=\"fid-sm-node " + (fidStateKey === n.k ? n.cls : "") + "\">" +
      "<div style=\"display:flex;justify-content:space-between\"><span>" + n.t + "</span><span class=\"mono\">" + (fidStateKey === n.k ? "ACTIVE" : "-") + "</span></div>" +
      "<div style=\"font-size:9.5px;color:var(--mut);font-weight:500\">" + n.s + "</div>" +
    "</div>"
  ).join("");

  const fidName = ecucConfig["FID" + fid.id + "_Name"] || ("FID_" + fid.id);
  document.getElementById("fidSummaryMini").innerHTML =
    "<strong>" + escapeHtmlSafe(fidName) + ":</strong> " +
    "InhibitCounter = <b class=\"mono\" style=\"color:var(--cyan)\">" + fid.inhibitCount + "</b> · " +
    "Availability = <b class=\"mono\">" + (fid.available ? "TRUE" : "FALSE") + "</b> · " +
    "Mode = <b style=\"color:" + (fid.permission ? "var(--ok)" : "var(--err)") + "\">" + (fid.permission ? "NORMAL EXECUTION" : "DEGRADED / FAIL-SAFE") + "</b>";
}

function renderSvgArchitecture() {
  const f0 = simState.fids[0], f1 = simState.fids[1], f2 = simState.fids[2];
  const e0 = simState.demEvents[0], e1 = simState.demEvents[1], e2 = simState.demEvents[2];

  document.getElementById("svgSub_MOD_SWC_MON").textContent = "Gate FID_2: " + (f2.permission ? "PERMITTED" : "BLOCKED") + (e0.suppressedCount > 0 ? " (Suppressed:" + e0.suppressedCount + ")" : "");
  document.getElementById("svgSub_MOD_SWC_CTRL").textContent = "ACC: " + (f0.permission ? "NORMAL" : "FAIL-SAFE") + " | AEB: " + (f1.permission ? "NORMAL" : "FAIL-SAFE");
  document.getElementById("svgSub_MOD_ECUM").textContent = "State: " + simState.lifecycleState.replace("FIM_", "") + " | " + (ecucConfig.ConfigVariantType === "PRE_COMPILE" ? "PC" : "PB");
  document.getElementById("svgSub_MOD_DCM").textContent = "0x14 ClearDTC | IUMPR: " + (ecucConfig.ObdIumprInhibitionSupport ? ((!f0.permission || !f2.permission) ? "LOCKED" : "OPEN") : "OFF");
  document.getElementById("svgSub_MOD_RTE").textContent = "MainFn: " + ecucConfig.FiMMainFunctionPeriod + "ms | MaxLinks: " + ecucConfig.FiMMaxHandledFidEventLinksPerSchedulableStep;
  document.getElementById("svgSub_MOD_FIM1").textContent = "State: " + simState.lifecycleState.replace("FIM_", "") + " | Mode: " + (ecucConfig.FiMEventUpdateTriggeredByDem ? "PUSH" : "POLL");
  document.getElementById("svgSub_MOD_FIM2").textContent = "FID0:" + (f0.permission ? "TRUE" : "FALSE") + " | FID1:" + (f1.permission ? "TRUE" : "FALSE") + " | FID2:" + (f2.permission ? "TRUE" : "FALSE");
  document.getElementById("svgSub_MOD_FIM3").textContent = "Sum01:" + (ecucConfig.SummaryEvent_Sum01_Enabled ? "ON" : "OFF") + " · Comp01:" + (ecucConfig.ComponentInhibition_Enabled ? (simState.fimCacheCompFailed ? "FAIL" : "OK") : "OFF") + " · Avail:" + (ecucConfig.FiMAvailabilitySupport ? "ON" : "OFF");
  document.getElementById("svgSub_MOD_DET").textContent = "Faults Logged: " + simState.detFaults.length + (simState.detFaults.length ? " (!)" : " (OK)");
  document.getElementById("svgSub_MOD_DEM1").textContent = "E1:" + fmtHexByte(e0.statusByte) + " | E2:" + fmtHexByte(e1.statusByte) + " | E3:" + fmtHexByte(e2.statusByte) + " | C1:" + (simState.demCompFailed ? "FAIL" : "OK");

  Object.keys(MODULES_INFO).forEach((m) => {
    const g = document.getElementById("node_" + m);
    if (g) g.classList.toggle("selected", simState.activeModId === m);
  });

  document.querySelectorAll(".flow-arrow").forEach((el) => {
    el.classList.toggle("active", simState.activeArrows.includes(el.id));
  });
}

function selectModule(modId) {
  simState.activeModId = modId;
  currentInspTab = 1;
  renderSvgArchitecture();
  renderInspector();
}

function switchInspTab(idx) {
  currentInspTab = idx;
  renderInspector();
}

function renderInspector() {
  for (let i = 0; i < 4; i++) {
    const b = document.getElementById("inspTabBtn" + i);
    if (b) b.classList.toggle("active", currentInspTab === i);
  }
  const body = document.getElementById("inspBody");
  const evt = simState.demEvents[simState.selectedEventIdx] || simState.demEvents[0];
  const fid = simState.fids[simState.selectedFidIdx] || simState.fids[0];
  const activeMask = simState.selectedEventIdx === 1 ? ecucConfig.InhCfg1_Mask : (simState.selectedEventIdx === 2 ? ecucConfig.InhCfg2_Mask : ecucConfig.InhCfg0_Mask);
  const evMask = evaluateMask(simState.fimCacheEvents[simState.selectedEventIdx], activeMask);

  if (currentInspTab === 0) {
    const diffA = UDS_STATUS_BITS.filter((d) => ((simState.regAByte ^ simState.prevRegAByte) & d.mask) !== 0)
      .map((d) => "b" + d.bit + " " + d.tag + " -> " + (((simState.regAByte & d.mask) !== 0) ? "1" : "0"));
    const diffB = FIM_ENGINE_BITS.filter((d) => ((simState.regBByte ^ simState.prevRegBByte) & d.mask) !== 0)
      .map((d) => "b" + d.bit + " " + d.tag + " -> " + (((simState.regBByte & d.mask) !== 0) ? "1" : "0"));

    body.innerHTML =
      "<div class=\"insp-card\"><div class=\"insp-h\">🎯 Giải Thích Chi Tiết Bước Hiện Tại</div><p style=\"font-size:12px;color:var(--txt-soft)\">" + escapeHtmlSafe(simState.stepExplain) + "</p></div>" +
      "<div class=\"insp-card\"><div class=\"insp-h\">📊 Đánh Giá Mặt Nạ &amp; Quyền Thực Thi FID</div>" +
        "<div style=\"font-size:11.5px\">" +
          "<strong>Event đang soi:</strong> <span class=\"mono\">" + evt.sym + " = " + fmtHexByte(evt.statusByte) + "</span> (FiM Cache: <span class=\"mono\">" + fmtHexByte(simState.fimCacheEvents[simState.selectedEventIdx]) + "</span>)<br/>" +
          "<strong>Mặt nạ áp dụng:</strong> <span class=\"mono\">" + activeMask + " -> " + evMask.formulaStr + " (" + (evMask.matched ? "MATCH" : "CLEAR") + ")</span><br/>" +
          "<strong>FID đang chọn:</strong> <span class=\"mono\">" + escapeHtmlSafe(ecucConfig["FID" + fid.id + "_Name"]) + "</span><br/>" +
          "<strong>InhibitCounter[FID]:</strong> <span class=\"mono\">" + fid.inhibitCount + "</span> | <strong>Permission:</strong> <b class=\"mono\" style=\"color:" + (fid.permission ? "var(--ok)" : "var(--err)") + "\">" + (fid.permission ? "TRUE (PERMITTED)" : "FALSE (INHIBITED)") + "</b>" +
        "</div>" +
      "</div>" +
      "<div class=\"insp-card\"><div class=\"insp-h\">⚡ Bit Thay Đổi Mới Nhất (Bit Deltas)</div>" +
        "<div style=\"font-size:11px\"><strong>Thanh A (UDS):</strong> " + (diffA.length ? diffA.join(", ") : "Không thay đổi ở bước vừa rồi") + "<br/>" +
        "<strong>Thanh B (FiM):</strong> " + (diffB.length ? diffB.join(", ") : "Không thay đổi ở bước vừa rồi") + "</div>" +
      "</div>" +
      (simState.detFaults.length ? "<div class=\"insp-card\" style=\"border-color:var(--err)\"><div class=\"insp-h\" style=\"color:var(--err)\">🚨 DET Errors Gần Nhất (ModuleId = 11)</div>" + simState.detFaults.slice(0, 4).map((f) => "<div class=\"mono\" style=\"font-size:10.5px;margin-bottom:2px\">[" + f.t + "ms] " + escapeHtmlSafe(f.code) + ": " + escapeHtmlSafe(f.detail) + "</div>").join("") + "</div>" : "");
  } else if (currentInspTab === 1) {
    const m = MODULES_INFO[simState.activeModId] || MODULES_INFO.MOD_FIM;
    const pills = Object.values(MODULES_INFO).map((mod) =>
      "<button class=\"mod-pill " + (mod.id === m.id ? "active" : "") + "\" onclick=\"selectModule('" + mod.id + "')\">" + mod.id.replace("MOD_", "") + "</button>"
    ).join("");
    body.innerHTML =
      "<div class=\"mod-list\">" + pills + "</div>" +
      "<div class=\"insp-card\"><div class=\"insp-h\">🧩 " + escapeHtmlSafe(m.name) + "</div><div style=\"font-size:11px;color:var(--cyan);margin-bottom:4px\">Layer: " + escapeHtmlSafe(m.layer) + "</div><p style=\"font-size:11.5px\">" + escapeHtmlSafe(m.role) + "</p></div>" +
      "<div class=\"insp-card\"><div class=\"insp-h\">📥 Input (Lấy Từ Đâu)</div><p style=\"font-size:11.5px\">" + escapeHtmlSafe(m.inputs) + "</p></div>" +
      "<div class=\"insp-card\"><div class=\"insp-h\">⚙️ Cách Xử Lý</div><p style=\"font-size:11.5px\">" + escapeHtmlSafe(m.processing) + "</p></div>" +
      "<div class=\"insp-card\"><div class=\"insp-h\">📤 Output (Route Tới Đâu)</div><p style=\"font-size:11.5px\">" + escapeHtmlSafe(m.outputs) + "</p></div>" +
      "<div class=\"insp-card\"><div class=\"insp-h\">🔌 AUTOSAR Standard APIs (R22-11 / R23-11)</div><pre class=\"code-block\">" + escapeHtmlSafe(m.apis.join("\n")) + "</pre></div>";
  } else if (currentInspTab === 2) {
    const maskDef = FIM_MASKS_DEF[activeMask];
    const codeText =
`/* Live FiM Runtime C Logic (AUTOSAR Classic R23-11) */
Std_ReturnType FiM_GetFunctionPermission(
    FiM_FunctionIdType FID, boolean* Permission)
{
  /* 1. DET Guards (SWS_FiM_00076) */
  if (FiM_State != FIM_INITIALIZED_READY) { /* Current: ${simState.lifecycleState} */
    Det_ReportError(11u, 0u, 0x01u, FIM_E_UNINIT);
    if (Permission != NULL_PTR) { *Permission = FALSE; }
    return E_NOT_OK;
  }

  /* 2. Mask Evaluation on Cached UDS Status Byte */
  Dem_UdsStatusByteType evtStatus = ${fmtHexByte(simState.fimCacheEvents[simState.selectedEventIdx])}u; /* ${evt.shortName} */
  boolean maskMatched = ((evtStatus & ${fmtHexByte(maskDef.maskByte)}u) == ${fmtHexByte(maskDef.patternByte)}u); /* ${activeMask} -> ${evMask.matched ? "TRUE" : "FALSE"} */

  /* 3. O(1) Lookup for FID_${fid.id} (${ecucConfig["FID" + fid.id + "_Name"]}) */
  uint16 inhibitCnt = FiM_InhibitCounter[${fid.id}]; /* Current = ${fid.inhibitCount}u */
  boolean availFlag = ${fid.available ? "TRUE" : "FALSE"}; /* FiM_SetFunctionAvailable */

  *Permission = ((inhibitCnt == 0u) && (availFlag == TRUE)) ? TRUE : FALSE; /* -> ${fid.permission ? "TRUE" : "FALSE"} */
  return E_OK;
}`;
    body.innerHTML = "<div class=\"insp-card\"><div class=\"insp-h\">📄 Live Runtime C Inspection</div><pre class=\"code-block\">" + escapeHtmlSafe(codeText) + "</pre></div>";
  } else {
    body.innerHTML = simState.traceLogs.length
      ? simState.traceLogs.map((l) =>
          "<div class=\"trace-item " + l.level + "\">" +
            "<div><strong class=\"mono\">[" + l.t + " ms] " + escapeHtmlSafe(l.api) + "</strong></div>" +
            "<div style=\"color:var(--txt-soft);margin-top:2px\">" + escapeHtmlSafe(l.detail) + "</div>" +
          "</div>"
        ).join("")
      : "<div class=\"insp-card\">Chưa có sự kiện API nào được ghi nhận.</div>";
  }
}

function renderAll() {
  renderHeaderAndQuickActions();
  renderInhibitionMatrixAndFids();
  render8BitRegisters();
  renderBitwiseEvaluatorAndStateMachines();
  renderSvgArchitecture();
  renderInspector();
}

// -------------------- TABS, THEME & HOVER TOOLTIP (>1S) --------------------

function switchCfgTab(idx) {
  currentCfgTab = idx;
  for (let i = 0; i < 5; i++) {
    const b = document.getElementById("cfgTabBtn" + i);
    const p = document.getElementById("cfgPane" + i);
    if (b) b.classList.toggle("active", i === idx);
    if (p) p.classList.toggle("hidden", i !== idx);
  }
}

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
    "<div class=\"tt-hdr\"><span class=\"tt-title\">" + escapeHtmlSafe(info.title) + "</span><span class=\"tt-meta\">" + escapeHtmlSafe(info.sws) + "</span></div>" +
    "<div class=\"tt-sec\"><b>ECUC Path:</b> <span class=\"mono\">" + escapeHtmlSafe(info.ecucPath) + "</span></div>" +
    "<div class=\"tt-sec\"><b>Miền giá trị:</b> <span class=\"mono\" style=\"color:var(--cyan)\">" + escapeHtmlSafe(info.range) + "</span></div>" +
    "<div class=\"tt-sec\"><b>Vai trò &amp; Ý nghĩa:</b> " + escapeHtmlSafe(info.role) + "</div>" +
    "<div class=\"tt-sec\"><b>Cơ chế hoạt động:</b> " + escapeHtmlSafe(info.mechanism) + "</div>" +
    "<div class=\"tt-sec\"><b>Ảnh hưởng kịch bản:</b> " + escapeHtmlSafe(info.scenarioImpact) + "</div>";

  const rect = rowEl.getBoundingClientRect();
  const px = Math.min(window.innerWidth - 415, Math.max(12, (evt ? evt.clientX + 16 : rect.right + 10)));
  const py = Math.min(window.innerHeight - 240, Math.max(12, rect.top - 10));
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

// -------------------- ARXML / C / JSON / HTML EXPORTERS --------------------

function generateArxmlContent() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<AUTOSAR xmlns="http://autosar.org/schema/r4.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <AR-PACKAGES>
    <AR-PACKAGE>
      <SHORT-NAME>FiM_EcucConfig</SHORT-NAME>
      <ELEMENTS>
        <ECUC-MODULE-CONFIGURATION-VALUES>
          <SHORT-NAME>FiM</SHORT-NAME>
          <DEFINITION-REF DEST="ECUC-MODULE-DEF">/AUTOSAR/EcucDefs/FiM</DEFINITION-REF>
          <CONTAINERS>
            <ECUC-CONTAINER-VALUE>
              <SHORT-NAME>FiMGeneral</SHORT-NAME>
              <PARAMETER-VALUES>
                <ECUC-BOOLEAN-PARAM-VALUE><DEFINITION-REF DEST="ECUC-BOOLEAN-PARAM-DEF">/AUTOSAR/EcucDefs/FiM/FiMGeneral/FiMDevErrorDetect</DEFINITION-REF><VALUE>${ecucConfig.FiMDevErrorDetect}</VALUE></ECUC-BOOLEAN-PARAM-VALUE>
                <ECUC-BOOLEAN-PARAM-VALUE><DEFINITION-REF DEST="ECUC-BOOLEAN-PARAM-DEF">/AUTOSAR/EcucDefs/FiM/FiMGeneral/FiMVersionInfoApi</DEFINITION-REF><VALUE>${ecucConfig.FiMVersionInfoApi}</VALUE></ECUC-BOOLEAN-PARAM-VALUE>
                <ECUC-BOOLEAN-PARAM-VALUE><DEFINITION-REF DEST="ECUC-BOOLEAN-PARAM-DEF">/AUTOSAR/EcucDefs/FiM/FiMGeneral/FiMEventUpdateTriggeredByDem</DEFINITION-REF><VALUE>${ecucConfig.FiMEventUpdateTriggeredByDem}</VALUE></ECUC-BOOLEAN-PARAM-VALUE>
                <ECUC-BOOLEAN-PARAM-VALUE><DEFINITION-REF DEST="ECUC-BOOLEAN-PARAM-DEF">/AUTOSAR/EcucDefs/FiM/FiMGeneral/FiMAvailabilitySupport</DEFINITION-REF><VALUE>${ecucConfig.FiMAvailabilitySupport}</VALUE></ECUC-BOOLEAN-PARAM-VALUE>
                <ECUC-BOOLEAN-PARAM-VALUE><DEFINITION-REF DEST="ECUC-BOOLEAN-PARAM-DEF">/AUTOSAR/EcucDefs/FiM/FiMGeneral/FiMDataFixed</DEFINITION-REF><VALUE>${ecucConfig.FiMDataFixed}</VALUE></ECUC-BOOLEAN-PARAM-VALUE>
                <ECUC-FLOAT-PARAM-VALUE><DEFINITION-REF DEST="ECUC-FLOAT-PARAM-DEF">/AUTOSAR/EcucDefs/FiM/FiMGeneral/FiMMainFunctionPeriod</DEFINITION-REF><VALUE>${(ecucConfig.FiMMainFunctionPeriod / 1000).toFixed(3)}</VALUE></ECUC-FLOAT-PARAM-VALUE>
                <ECUC-INTEGER-PARAM-VALUE><DEFINITION-REF DEST="ECUC-INTEGER-PARAM-DEF">/AUTOSAR/EcucDefs/FiM/FiMGeneral/FiMMaxHandledFidEventLinksPerSchedulableStep</DEFINITION-REF><VALUE>${ecucConfig.FiMMaxHandledFidEventLinksPerSchedulableStep}</VALUE></ECUC-INTEGER-PARAM-VALUE>
                <ECUC-INTEGER-PARAM-VALUE><DEFINITION-REF DEST="ECUC-INTEGER-PARAM-DEF">/AUTOSAR/EcucDefs/FiM/FiMGeneral/FiMMaxSummaryEvents</DEFINITION-REF><VALUE>${ecucConfig.FiMMaxSummaryEvents}</VALUE></ECUC-INTEGER-PARAM-VALUE>
              </PARAMETER-VALUES>
            </ECUC-CONTAINER-VALUE>
            <ECUC-CONTAINER-VALUE>
              <SHORT-NAME>FiMInhibitionConfiguration_0</SHORT-NAME>
              <PARAMETER-VALUES>
                <ECUC-TEXTUAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-ENUMERATION-PARAM-DEF">/AUTOSAR/EcucDefs/FiM/FiMConfigSet/FiMInhibitionConfiguration/FiMInhInhibitionMask</DEFINITION-REF><VALUE>${ecucConfig.InhCfg0_Mask}</VALUE></ECUC-TEXTUAL-PARAM-VALUE>
              </PARAMETER-VALUES>
            </ECUC-CONTAINER-VALUE>
            <ECUC-CONTAINER-VALUE>
              <SHORT-NAME>FiMInhibitionConfiguration_1</SHORT-NAME>
              <PARAMETER-VALUES>
                <ECUC-TEXTUAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-ENUMERATION-PARAM-DEF">/AUTOSAR/EcucDefs/FiM/FiMConfigSet/FiMInhibitionConfiguration/FiMInhInhibitionMask</DEFINITION-REF><VALUE>${ecucConfig.InhCfg1_Mask}</VALUE></ECUC-TEXTUAL-PARAM-VALUE>
              </PARAMETER-VALUES>
            </ECUC-CONTAINER-VALUE>
          </CONTAINERS>
        </ECUC-MODULE-CONFIGURATION-VALUES>
      </ELEMENTS>
    </AR-PACKAGE>
  </AR-PACKAGES>
</AUTOSAR>`;
}

function generateFiMCfgH() {
  const b = (v) => (v ? "STD_ON" : "STD_OFF");
  return `#ifndef FIM_CFG_H
#define FIM_CFG_H

#include "Std_Types.h"

#define FIM_DEV_ERROR_DETECT                        ${b(ecucConfig.FiMDevErrorDetect)}
#define FIM_VERSION_INFO_API                        ${b(ecucConfig.FiMVersionInfoApi)}
#define FIM_EVENT_UPDATE_TRIGGERED_BY_DEM           ${b(ecucConfig.FiMEventUpdateTriggeredByDem)}
#define FIM_AVAILABILITY_SUPPORT                    ${b(ecucConfig.FiMAvailabilitySupport)}
#define FIM_DATA_FIXED                              ${b(ecucConfig.FiMDataFixed)}
#define FIM_MAIN_FUNCTION_PERIOD_MS                 ${ecucConfig.FiMMainFunctionPeriod}u
#define FIM_MAX_HANDLED_FID_LINKS_PER_STEP          ${ecucConfig.FiMMaxHandledFidEventLinksPerSchedulableStep}u
#define FIM_MAX_SUMMARY_EVENTS                      ${ecucConfig.FiMMaxSummaryEvents}u
#define FIM_MAX_EVENTS_PER_FID_INH_CFG              ${ecucConfig.FiMMaxEventsPerFidInhibitionConfiguration}u

/* Symbolic FID Definitions (ECUC_FiM_00039) */
#define FiMConf_FiMFID_${ecucConfig.FID0_Name}       ((FiM_FunctionIdType)0u)
#define FiMConf_FiMFID_${ecucConfig.FID1_Name}       ((FiM_FunctionIdType)1u)
#define FiMConf_FiMFID_${ecucConfig.FID2_Name}       ((FiM_FunctionIdType)2u)
#define FIM_NUM_FIDS                                3u

#endif /* FIM_CFG_H */`;
}

function generateFiMLcfgC() {
  return `#include "FiM.h"
#include "FiM_Cfg.h"

/* Variant: ${ecucConfig.ConfigVariantType} */
const FiM_InhibitionCfgType FiM_InhibitionConfig[4] = {
  { .EventId = DemConf_Evt_01_RadarSignalErr,    .Mask = ${ecucConfig.InhCfg0_Mask}, .FidMask = 0x03u /* FID_0, FID_1 */ },
  { .EventId = DemConf_Evt_02_SensorSupply5V,    .Mask = ${ecucConfig.InhCfg1_Mask}, .FidMask = 0x04u /* FID_2 */ },
  { .SummaryId = 0u /* Sum_01 */,                 .Mask = ${ecucConfig.InhCfg2_Mask}, .Enabled = ${ecucConfig.SummaryEvent_Sum01_Enabled ? "TRUE" : "FALSE"}, .FidMask = 0x01u /* FID_0 */ },
  { .ComponentId = DemConf_Comp_01_RadarCluster, .Enabled = ${ecucConfig.ComponentInhibition_Enabled ? "TRUE" : "FALSE"}, .FidMask = 0x03u /* FID_0, FID_1 */ }
};

const FiM_ConfigType FiM_Config = {
  .NumFids          = FIM_NUM_FIDS,
  .InhibitionCfgPtr = FiM_InhibitionConfig
};`;
}

function getExportPayload(idx) {
  if (idx === 0) return { filename: "FiM.arxml", text: generateArxmlContent() };
  if (idx === 1) return { filename: "FiM_Cfg.h", text: generateFiMCfgH() };
  if (idx === 2) return { filename: "FiM_Lcfg.c", text: generateFiMLcfgC() };
  return { filename: "FiM_Config.json", text: JSON.stringify(ecucConfig, null, 2) };
}

function openExportModal() {
  document.getElementById("exportModal").classList.remove("hidden");
  switchExportTab(currentExportTab);
}

function closeExportModal() {
  document.getElementById("exportModal").classList.add("hidden");
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
  a.download = "AUTOSAR_FiM_Simulator.html";
  a.click();
  URL.revokeObjectURL(a.href);
}
