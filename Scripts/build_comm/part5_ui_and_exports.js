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
  simState.activeArrows = [];
  stepObj.exec();
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
    stepClockTick(Number(ecucConfig.ComMMainFunctionPeriod) || 20);
  }, 450);
}

function runWhatIf(idx) {
  const sc = SCENARIOS[currentScenarioIdx];
  const wf = sc && sc.whatIfs && sc.whatIfs[idx];
  if (!wf) return;
  simState.activeArrows = [];
  wf.run();
  simState.stepExplain = "🧪 Thử Nghiệm Nhanh (" + wf.label + ") — Hãy quan sát sự thay đổi thanh ghi bit, timers và trạng thái!";
  renderAll();
}

// -------------------- QUICK ACTIONS --------------------

function qaRequestUser(isFull) {
  const uid = Number(document.getElementById("qaUserSelect").value || 0);
  api_ComM_RequestComMode(uid, isFull ? "FULL_COM" : "NO_COM");
  syncConfigToDOM();
  simState.stepExplain = "Quick Action: " + simState.users[uid].name + " gọi ComM_RequestComMode(" + uid + ", " + (isFull ? "FULL_COM" : "NO_COM") + ").";
  renderAll();
}

function qaToggleCommAllowed() {
  const next = !simState.channels[0].commAllowed;
  api_ComM_CommunicationAllowed(0, next);
  api_ComM_CommunicationAllowed(1, next);
  syncConfigToDOM();
  simState.stepExplain = "Quick Action: Chuyển Gatekeeper CommunicationAllowed = " + (next ? "TRUE" : "FALSE") + ".";
  renderAll();
}

function qaTriggerEcuMWakeup() {
  api_ComM_EcuM_WakeUpIndication(0);
  syncConfigToDOM();
  simState.stepExplain = "Quick Action: EcuM phát ComM_EcuM_WakeUpIndication(0) (Passive Wakeup).";
  renderAll();
}

function qaToggleDcmActive() {
  const next = !simState.channels[0].dcmActive;
  api_ComM_DCM_ActiveDiagnostic(0, next);
  syncConfigToDOM();
  simState.stepExplain = "Quick Action: Chuyển DCM ActiveDiagnostic = " + (next ? "ACTIVE (Override Inhibition)" : "INACTIVE") + ".";
  renderAll();
}

function qaToggleNoWakeup() {
  const next = !simState.channels[0].noWakeup;
  api_ComM_PreventWakeUp(0, next);
  syncConfigToDOM();
  simState.stepExplain = "Quick Action: ComM_PreventWakeUp(0, " + (next ? "TRUE" : "FALSE") + ").";
  renderAll();
}

function qaToggleLimitChannel() {
  const next = !simState.channels[0].limitToNoCom;
  api_ComM_LimitChannelToNoComMode(0, next);
  syncConfigToDOM();
  simState.stepExplain = "Quick Action: ComM_LimitChannelToNoComMode(0, " + (next ? "TRUE" : "FALSE") + ").";
  renderAll();
}

function qaPulseRxEiraPnc16() {
  const nextB2 = (simState.rxEiraByte2 & 0x01) ? (simState.rxEiraByte2 & ~0x01) : (simState.rxEiraByte2 | 0x01);
  api_ComM_COMCbk_RxEira(nextB2, simState.rxEiraByte3);
  syncConfigToDOM();
  simState.stepExplain = "Quick Action: Đảo Bit PNC #16 trong Rx EIRA -> 0x" + nextB2.toString(16).toUpperCase().padStart(2, "0") + ".";
  renderAll();
}

// -------------------- INTERACTIVE BIT CLICKS --------------------

function togglePncVectorBit(rowKind, mask) {
  if (rowKind === "INTERNAL") {
    if (mask === 0x01) {
      const next = simState.users[2].requested === "FULL_COM" ? "NO_COM" : "FULL_COM";
      api_ComM_RequestComMode(2, next);
      syncConfigToDOM();
    }
  } else if (rowKind === "EIRA") {
    api_ComM_COMCbk_RxEira(simState.rxEiraByte2 ^ mask, simState.rxEiraByte3);
    syncConfigToDOM();
  } else if (rowKind === "ERA0") {
    api_ComM_COMCbk_RxEra(0, simState.rxEraCh0Byte2 ^ mask, simState.rxEraCh0Byte3);
    syncConfigToDOM();
  }
  renderAll();
}

function toggleRegisterBit(regType, mask) {
  const ch = simState.channels[getSelectedChannelId()];
  if (regType === "A") {
    if (mask === 0x40) api_ComM_DCM_ActiveDiagnostic(ch.id, !ch.dcmActive);
    else if (mask === 0x10) api_ComM_CommunicationAllowed(ch.id, !ch.commAllowed);
    else if (mask === 0x80) {
      const next = simState.users[0].requested === "FULL_COM" ? "NO_COM" : "FULL_COM";
      api_ComM_RequestComMode(0, next);
    } else if (mask === 0x20) {
      api_ComM_EcuM_WakeUpIndication(ch.id);
    }
  } else if (regType === "B") {
    if (mask === 0x80) api_ComM_Init(!simState.initialized);
    else if (mask === 0x08) api_ComM_LimitECUToNoComMode(!simState.globalLimitEcu);
    else if (mask === 0x02) api_ComM_LimitChannelToNoComMode(ch.id, !ch.limitToNoCom);
    else if (mask === 0x01) api_ComM_PreventWakeUp(ch.id, !ch.noWakeup);
    else if (mask === 0x40) api_ComM_ResetInhibitCounter();
  }
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

  const ch0 = simState.channels[0];
  const bCh = document.getElementById("hdrBadgeCh0");
  bCh.textContent = "Ch0: " + ch0.mode;
  bCh.className = "state-badge " + (ch0.mode === "COMM_FULL_COMMUNICATION" ? "sb-full" : (ch0.mode === "COMM_SILENT_COMMUNICATION" ? "sb-silent" : "sb-nocom"));

  const bSub = document.getElementById("hdrBadgeSub");
  bSub.textContent = ch0.subState.replace("COMM_", "");
  bSub.className = "state-badge " + (ch0.subState === "COMM_NO_COM_REQUEST_PENDING" ? "sb-pend" : (ch0.mode === "COMM_FULL_COMMUNICATION" ? "sb-full" : "sb-nocom"));

  const p16 = simState.pncs[16];
  const bPnc = document.getElementById("hdrBadgePnc");
  bPnc.textContent = "PNC16: " + p16.state.replace("COMM_PNC_", "");
  bPnc.className = "state-badge " + (p16.state === "COMM_PNC_REQUESTED" ? "sb-full" : (p16.state === "COMM_PNC_PREPARE_SLEEP" ? "sb-pend" : "sb-nocom"));

  const bInh = document.getElementById("hdrBadgeInhib");
  const isInh = isNoWakeupEffective(ch0) || isLimitNoComEffective(ch0);
  bInh.classList.toggle("hidden", !isInh);
  if (isInh) {
    bInh.className = "state-badge sb-inhib";
    bInh.textContent = isLimitNoComEffective(ch0) ? "INHIB: LIMIT_NO_COM" : "INHIB: NO_WAKEUP";
  }

  // Quick Action Visuals
  document.getElementById("qaTxtCommAllow").textContent = ch0.commAllowed ? "TRUE" : "FALSE";
  document.getElementById("qaBtnCommAllow").classList.toggle("qa-active", ch0.commAllowed);
  document.getElementById("qaTxtDcm").textContent = ch0.dcmActive ? "ACTIVE" : "OFF";
  document.getElementById("qaBtnDcm").classList.toggle("qa-active", ch0.dcmActive);
  document.getElementById("qaTxtNoWakeup").textContent = ch0.noWakeup ? "TRUE" : "FALSE";
  document.getElementById("qaBtnNoWakeup").classList.toggle("qa-active", ch0.noWakeup);
  document.getElementById("qaTxtLimitCh").textContent = (ch0.limitToNoCom || simState.globalLimitEcu) ? "TRUE" : "FALSE";
  document.getElementById("qaBtnLimitCh").classList.toggle("qa-active", (ch0.limitToNoCom || simState.globalLimitEcu));
  document.getElementById("qaTxtRxEira").textContent = "0x" + (simState.rxEiraByte2).toString(16).toUpperCase().padStart(2, "0");
  document.getElementById("qaBtnRxEira").classList.toggle("qa-active", (simState.rxEiraByte2 & 0x01) !== 0);

  // Scenario Summary & What-If
  document.getElementById("scenIdBadge").textContent = sc.id + " (" + sc.group + ")";
  document.getElementById("scenSummaryBox").textContent = sc.summary;
  const wfBox = document.getElementById("whatIfContainer");
  wfBox.innerHTML = sc.whatIfs.map((w, i) =>
    "<button class=\"whatif-btn\" onclick=\"runWhatIf(" + i + ")\">" + escapeHtmlSafe(w.label) + "</button>"
  ).join("");

  // Validation Box
  const alerts = validateConfigRules();
  const vBox = document.getElementById("cfgValidationBox");
  vBox.innerHTML = alerts.map((a) =>
    "<div class=\"cfg-alert " + (a.err ? "err" : "") + "\">" + (a.err ? "❌ " : "⚠️ ") + escapeHtmlSafe(a.msg) + "</div>"
  ).join("");
}

function renderArbitrationAndPncVector() {
  const ch0 = simState.channels[0];
  const anyUserFull = simState.users.some((u) => u.requested === "FULL_COM");
  let winnerTxt = "NO_COM";
  if (ch0.dcmActive) winnerTxt = "FULL_COM (DCM Override!)";
  else if (isLimitNoComEffective(ch0)) winnerTxt = "NO_COM (Limit Inhibited!)";
  else if (ch0.mode !== "COMM_FULL_COMMUNICATION" && isNoWakeupEffective(ch0) && anyUserFull && !ch0.wakeupPending) winnerTxt = "NO_COM (Wakeup Blocked!)";
  else if (ecucConfig.ComMNmVariant === "PASSIVE" && !ch0.wakeupPending && ch0.mode !== "COMM_FULL_COMMUNICATION") winnerTxt = "NO_COM (PASSIVE Wait Bus)";
  else if (anyUserFull || simState.pncs[16].state !== "COMM_PNC_NO_COMMUNICATION" || ch0.wakeupPending) winnerTxt = ch0.commAllowed ? "FULL_COM" : "PENDING (Allowed=0)";

  const arbCards = simState.users.map((u) => {
    const active = u.requested === "FULL_COM";
    return "<div class=\"arb-card " + (active ? "req-full" : "") + "\">" +
      "<div class=\"arb-top\"><span>" + escapeHtmlSafe(u.name.split(" ")[0] + " " + u.name.split(" ")[1]) + "</span><span class=\"mono\">" + (active ? "FULL" : "NO_COM") + "</span></div>" +
      "<div class=\"arb-sub\">" + (u.pncId ? "Map: PNC #" + u.pncId : "Map: Ch0") + " · Hiện tại: <b class=\"mono\">" + u.current + "</b></div>" +
      "</div>";
  });

  arbCards.push(
    "<div class=\"arb-card req-winner " + (ch0.dcmActive ? "req-dcm" : "") + "\">" +
      "<div class=\"arb-top\"><span>🏆 ARBITRATION</span><span class=\"mono\">" + escapeHtmlSafe(ecucConfig.ComMNmVariant) + "</span></div>" +
      "<div class=\"arb-sub\">Ch0 Winner: <b class=\"mono\" style=\"color:var(--pri)\">" + escapeHtmlSafe(winnerTxt) + "</b></div>" +
    "</div>"
  );
  document.getElementById("arbMatrixBox").innerHTML = arbCards.join("");

  // PNC Bit Vector Grid
  const internalByte2 = (simState.users[2].requested === "FULL_COM" && ecucConfig.ComMPncSupport) ? 0x01 : 0x00;
  document.getElementById("pncVectorSummary").textContent =
    "TxSignal: 0x" + simState.txPncByte2.toString(16).toUpperCase().padStart(2, "0") +
    " | RxEIRA: 0x" + simState.rxEiraByte2.toString(16).toUpperCase().padStart(2, "0") +
    " | ERA_Ch0: 0x" + simState.rxEraCh0Byte2.toString(16).toUpperCase().padStart(2, "0");

  let html = "<div class=\"pnc-ghdr\" style=\"text-align:left\">PNC Signal Vector</div>";
  for (let i = 7; i >= 0; i--) {
    const slot = PNC_BIT_SLOTS[i];
    html += "<div class=\"pnc-ghdr\">b" + slot.bit + "<br>" + slot.label + "</div>";
  }
  html += "<div class=\"pnc-ghdr\" style=\"text-align:right\">Hex B2</div>";

  const rows = [
    { key: "INTERNAL", label: "Internal User Req", val: internalByte2, cls: "on", click: true },
    { key: "EIRA",     label: "Rx EIRA (COM Cbk)", val: simState.rxEiraByte2, cls: "on", click: true },
    { key: "ERA0",     label: "Rx ERA (Ch0 GW)",   val: simState.rxEraCh0Byte2, cls: "era-on", click: true },
    { key: "TX",       label: "Tx PNC Signal",     val: simState.txPncByte2, cls: "tx-on", click: false }
  ];

  rows.forEach((r) => {
    html += "<div class=\"pnc-rlbl\">" + r.label + "</div>";
    for (let i = 7; i >= 0; i--) {
      const slot = PNC_BIT_SLOTS[i];
      const bitOn = (r.val & slot.mask) !== 0;
      const cls = "pnc-cell" + (bitOn ? " " + r.cls : "") + (r.click ? "" : " locked");
      const onclickAttr = r.click ? " onclick=\"togglePncVectorBit('" + r.key + "', " + slot.mask + ")\"" : "";
      html += "<div class=\"" + cls + "\"" + onclickAttr + ">" + (bitOn ? "1" : "0") + "</div>";
    }
    html += "<div class=\"pnc-hex mono\">0x" + r.val.toString(16).toUpperCase().padStart(2, "0") + "</div>";
  });

  document.getElementById("pncVectorGrid").innerHTML = html;
}

function render8BitRegisters() {
  const renderReg = (hexElId, bitsElId, byteVal, prevVal, defs, regType) => {
    document.getElementById(hexElId).textContent = "0x" + (byteVal & 0xFF).toString(16).toUpperCase().padStart(2, "0");
    document.getElementById(bitsElId).innerHTML = defs.map((d) => {
      const on = (byteVal & d.mask) !== 0;
      const chg = ((byteVal ^ prevVal) & d.mask) !== 0;
      const cls = "bit-box" + (on ? " on" : "") + (d.tone ? " " + d.tone + "-bit" : "") + (chg ? " chg" : "");
      return "<div class=\"" + cls + "\" title=\"" + escapeHtmlSafe(d.name + ": " + d.desc) + "\" onclick=\"toggleRegisterBit('" + regType + "', " + d.mask + ")\">" +
        "<div class=\"bit-pos\">b" + d.bit + "</div>" +
        "<div class=\"bit-val mono\">" + (on ? "1" : "0") + "</div>" +
        "<div class=\"bit-tag\">" + d.tag + "</div>" +
      "</div>";
    }).join("");
  };

  renderReg("regAHex", "regABits", simState.regAByte, simState.prevRegAByte, COMM_CH_BITS, "A");
  renderReg("regBHex", "regBBits", simState.regBByte, simState.prevRegBByte, COMM_INHIB_BITS, "B");
}

function renderTimers() {
  const ch0 = simState.channels[0];
  const p16 = simState.pncs[16];
  const tMinMax = Math.max(1, Number(ecucConfig.ComMTMinFullComModeDuration) || 500);
  const nmLightMax = Math.max(1, Number(ecucConfig.ComMNmLightTimeout) || 1000);
  const pncPrepMax = Math.max(1, Number(ecucConfig.ComMPncPrepareSleepTimer) || 400);
  const busDelayMax = Math.max(1, Number(ecucConfig.SimulateBusSmIndicationDelay) || 20);

  const timers = [
    { name: "TMinFullComMode", left: ch0.tMinFullLeftMs, max: tMinMax, sub: "LIGHT/NONE hold" },
    { name: "NmLightTimeout", left: ch0.nmLightLeftMs, max: nmLightMax, sub: "LIGHT ReadySleep" },
    { name: "PncPrepareSleep", left: p16.prepSleepLeftMs, max: pncPrepMax, sub: "PNC #16 delay" },
    { name: "BusSM Confirm Delay", left: ch0.busSmDelayLeftMs, max: busDelayMax, sub: "InhibitCnt: " + simState.inhibitCounter }
  ];

  document.getElementById("timersGrid").innerHTML = timers.map((t) => {
    const pct = t.left > 0 ? Math.min(100, Math.round((t.left / t.max) * 100)) : 0;
    return "<div class=\"timer-card " + (t.left > 0 ? "active" : "") + "\">" +
      "<div class=\"timer-top\"><span>" + t.name + "</span><span class=\"mono\" style=\"color:var(--cyan)\">" + t.left + " ms</span></div>" +
      "<div class=\"timer-bar\"><div class=\"timer-fill\" style=\"width:" + pct + "%\"></div></div>" +
      "<div style=\"font-size:9.5px;color:var(--mut);margin-top:3px\">" + t.sub + "</div>" +
    "</div>";
  }).join("");
}

function renderStateMachines() {
  const ch0 = simState.channels[0];
  const ch1 = simState.channels[1];
  document.getElementById("nmVariantBadge").textContent = "Variant: " + ecucConfig.ComMNmVariant + " | Ch0 & Ch1";
  document.getElementById("smChVariantLbl").textContent = "Ch0 (" + ecucConfig.ComMNmVariant + ")";

  const chHtml =
    "<div class=\"sm-node " + (ch0.mode === "COMM_NO_COMMUNICATION" ? "active-nocom" : "") + "\">" +
      "<div class=\"sm-node-hdr\"><span>1. COMM_NO_COMMUNICATION</span><span class=\"mono\">" + (ch0.mode === "COMM_NO_COMMUNICATION" ? "ACTIVE" : "-") + "</span></div>" +
      "<div class=\"sm-subs\">" +
        "<span class=\"sm-subnode " + (ch0.subState === "COMM_NO_COM_NO_PENDING_REQUEST" ? "sub-active" : "") + "\">NO_COM_NO_PENDING_REQUEST</span>" +
        "<span class=\"sm-subnode " + (ch0.subState === "COMM_NO_COM_REQUEST_PENDING" ? "sub-active" : "") + "\">NO_COM_REQUEST_PENDING</span>" +
      "</div>" +
    "</div>" +
    "<div class=\"sm-node " + (ch0.mode === "COMM_SILENT_COMMUNICATION" ? "active-silent" : "") + "\">" +
      "<div class=\"sm-node-hdr\"><span>2. COMM_SILENT_COMMUNICATION (Chỉ Rx)</span><span class=\"mono\">" + (ch0.mode === "COMM_SILENT_COMMUNICATION" ? "ACTIVE" : (ecucConfig.ComMNmVariant === "LIGHT" || ecucConfig.ComMNmVariant === "NONE" ? "N/A" : "-")) + "</span></div>" +
      "<div class=\"sm-subs\"><span class=\"sm-subnode " + (ch0.subState === "COMM_SILENT_COM" ? "sub-active" : "") + "\">COMM_SILENT_COM</span></div>" +
    "</div>" +
    "<div class=\"sm-node " + (ch0.mode === "COMM_FULL_COMMUNICATION" ? "active-state" : "") + "\">" +
      "<div class=\"sm-node-hdr\"><span>3. COMM_FULL_COMMUNICATION (Tx &amp; Rx)</span><span class=\"mono\">" + (ch0.mode === "COMM_FULL_COMMUNICATION" ? "ACTIVE" : "-") + "</span></div>" +
      "<div class=\"sm-subs\">" +
        "<span class=\"sm-subnode " + (ch0.subState === "COMM_FULL_COM_NETWORK_REQUESTED" ? "sub-active" : "") + "\">FULL_COM_NETWORK_REQUESTED</span>" +
        "<span class=\"sm-subnode " + (ch0.subState === "COMM_FULL_COM_READY_SLEEP" ? "sub-active" : "") + "\">FULL_COM_READY_SLEEP</span>" +
      "</div>" +
    "</div>";
  document.getElementById("channelSmDiagram").innerHTML = chHtml;

  const p16 = simState.pncs[16];
  const p18 = simState.pncs[18];
  document.getElementById("smPncStateLbl").textContent = "PNC16: " + p16.state.replace("COMM_PNC_", "");
  const pncNodes = [
    { key: "COMM_PNC_NO_COMMUNICATION", title: "PNC_NO_COM", sub: "Tắt cụm PNC" },
    { key: "COMM_PNC_REQUESTED", title: "PNC_REQUESTED", sub: "Internal / GW Tx=1" },
    { key: "COMM_PNC_READY_SLEEP", title: "PNC_READY_SLEEP", sub: "Rx EIRA=1 giữ mạng" },
    { key: "COMM_PNC_PREPARE_SLEEP", title: "PNC_PREPARE_SLEEP", sub: "Chạy PrepSleepTimer" }
  ];
  document.getElementById("pncSmDiagram").innerHTML = pncNodes.map((n) => {
    const cls = "pnc-sm-node" + (p16.state === n.key ? " active-pnc16" : "") + (p18.state === n.key ? " active-pnc18" : "");
    const badges = [p16.state === n.key ? "PNC16" : "", p18.state === n.key ? "PNC18" : ""].filter(Boolean).join(" · ");
    return "<div class=\"" + cls + "\">" +
      "<div style=\"display:flex;justify-content:space-between\"><span>" + n.title + "</span><span class=\"mono\">" + (badges || "-") + "</span></div>" +
      "<div style=\"font-size:9.5px;color:var(--mut);font-weight:500\">" + n.sub + "</div>" +
    "</div>";
  }).join("");

  document.getElementById("ch1SummaryMini").innerHTML =
    "<strong>Ch1 (" + ecucConfig.Ch1_GatewayType.replace("COMM_GATEWAY_TYPE_", "") + "):</strong> " +
    "<span class=\"mono\" style=\"color:var(--pri)\">" + ch1.mode.replace("COMM_", "") + "</span> (" + ch1.subState.replace("COMM_", "") + ") · " +
    "<strong>PNC18:</strong> <span class=\"mono\" style=\"color:var(--pur)\">" + p18.state.replace("COMM_PNC_", "") + "</span>";
}

function renderSvgArchitecture() {
  const ch0 = simState.channels[0];
  document.getElementById("svgSub_MOD_SWC").textContent = "U0:" + simState.users[0].current + " | U1:" + simState.users[1].current + " | U2:" + simState.users[2].current;
  document.getElementById("svgSub_MOD_DCM").textContent = "ActiveDiag: " + (ch0.dcmActive ? "ACTIVE (OVERRIDE)" : "OFF");
  document.getElementById("svgSub_MOD_ECUM").textContent = "CommAllow:" + (ch0.commAllowed ? "TRUE" : "FALSE") + " | BswM:" + ch0.actualBusSmMode.replace("COMM_", "");
  document.getElementById("svgSub_MOD_RTE").textContent = "MainFn Period: " + ecucConfig.ComMMainFunctionPeriod + " ms";
  document.getElementById("svgSub_MOD_COMM1").textContent = "Ch0: " + ch0.subState.replace("COMM_", "");
  document.getElementById("svgSub_MOD_COMM2").textContent = "PNC16:" + simState.pncs[16].state.replace("COMM_PNC_", "") + " | PNC18:" + simState.pncs[18].state.replace("COMM_PNC_", "");
  document.getElementById("svgSub_MOD_NVM").textContent = "InhibitCnt:" + simState.inhibitCounter + " | NoWake:" + (ch0.noWakeup ? "1" : "0");
  document.getElementById("svgSub_MOD_DET").textContent = "Faults Logged: " + simState.detFaults.length + (simState.detFaults.length ? " (!)" : " (OK)");
  document.getElementById("svgSub_MOD_COM").textContent = "TxPNC:0x" + simState.txPncByte2.toString(16).toUpperCase().padStart(2, "0") + " | RxEIRA:0x" + simState.rxEiraByte2.toString(16).toUpperCase().padStart(2, "0");
  document.getElementById("svgSub_MOD_NM").textContent = ch0.nmState.replace("NM_STATE_", "") + " (" + ecucConfig.ComMNmVariant + ")";
  document.getElementById("svgSub_MOD_SM").textContent = "ActualBusMode: " + ch0.actualBusSmMode.replace("COMM_", "");

  Object.keys(MODULES_INFO).forEach((m) => {
    const g = document.getElementById("node_" + m);
    if (!g) return;
    g.classList.toggle("selected", simState.activeModId === m);
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
  const ch0 = simState.channels[0];

  if (currentInspTab === 0) {
    const diffA = COMM_CH_BITS.filter((d) => ((simState.regAByte ^ simState.prevRegAByte) & d.mask) !== 0)
      .map((d) => "b" + d.bit + " " + d.name + " -> " + (((simState.regAByte & d.mask) !== 0) ? "1" : "0"));
    const diffB = COMM_INHIB_BITS.filter((d) => ((simState.regBByte ^ simState.prevRegBByte) & d.mask) !== 0)
      .map((d) => "b" + d.bit + " " + d.name + " -> " + (((simState.regBByte & d.mask) !== 0) ? "1" : "0"));

    body.innerHTML =
      "<div class=\"insp-card\"><div class=\"insp-h\">🎯 Giải Thích Chi Tiết Bước Hiện Tại</div><p style=\"font-size:12px;color:var(--txt-soft)\">" + escapeHtmlSafe(simState.stepExplain) + "</p></div>" +
      "<div class=\"insp-card\"><div class=\"insp-h\">📊 Ảnh Hưởng Trạng Thái Kênh &amp; PNC</div>" +
        "<div style=\"font-size:11.5px\"><strong>Ch0 State:</strong> <span class=\"mono\">" + ch0.subState + "</span><br/>" +
        "<strong>BusSM Confirm:</strong> <span class=\"mono\">" + ch0.actualBusSmMode + (ch0.pendingBusSmMode ? " (Đang đợi: " + ch0.busSmDelayLeftMs + "ms)" : "") + "</span><br/>" +
        "<strong>CanNm State:</strong> <span class=\"mono\">" + ch0.nmState + "</span><br/>" +
        "<strong>PNC #16 / #18:</strong> <span class=\"mono\">" + simState.pncs[16].state.replace("COMM_PNC_", "") + " / " + simState.pncs[18].state.replace("COMM_PNC_", "") + "</span></div>" +
      "</div>" +
      "<div class=\"insp-card\"><div class=\"insp-h\">⚡ Bit Thay Đổi Mới Nhất (Bit Deltas)</div>" +
        "<div style=\"font-size:11px\"><strong>Thanh A:</strong> " + (diffA.length ? diffA.join(", ") : "Không thay đổi ở bước vừa rồi") + "<br/>" +
        "<strong>Thanh B:</strong> " + (diffB.length ? diffB.join(", ") : "Không thay đổi ở bước vừa rồi") + "</div>" +
      "</div>" +
      (simState.detFaults.length ? "<div class=\"insp-card\" style=\"border-color:var(--err)\"><div class=\"insp-h\" style=\"color:var(--err)\">🚨 DET Errors Gần Nhất</div>" + simState.detFaults.slice(0, 3).map((f) => "<div class=\"mono\" style=\"font-size:10.5px\">[" + f.t + "ms] " + escapeHtmlSafe(f.code) + ": " + escapeHtmlSafe(f.detail) + "</div>").join("") + "</div>" : "");
  } else if (currentInspTab === 1) {
    const m = MODULES_INFO[simState.activeModId] || MODULES_INFO.MOD_COMM;
    const pills = Object.values(MODULES_INFO).map((mod) =>
      "<button class=\"mod-pill " + (mod.id === m.id ? "active" : "") + "\" onclick=\"selectModule('" + mod.id + "')\">" + mod.id.replace("MOD_", "") + "</button>"
    ).join("");
    body.innerHTML =
      "<div class=\"mod-list\">" + pills + "</div>" +
      "<div class=\"insp-card\"><div class=\"insp-h\">🧩 " + escapeHtmlSafe(m.name) + "</div><div style=\"font-size:11px;color:var(--cyan);margin-bottom:4px\">Layer: " + escapeHtmlSafe(m.layer) + "</div><p style=\"font-size:11.5px\">" + escapeHtmlSafe(m.role) + "</p></div>" +
      "<div class=\"insp-card\"><div class=\"insp-h\">📥 Input (Lấy Từ Đâu)</div><p style=\"font-size:11.5px\">" + escapeHtmlSafe(m.inputs) + "</p></div>" +
      "<div class=\"insp-card\"><div class=\"insp-h\">⚙️ Cách Xử Lý</div><p style=\"font-size:11.5px\">" + escapeHtmlSafe(m.processing) + "</p></div>" +
      "<div class=\"insp-card\"><div class=\"insp-h\">📤 Output (Route Tới Đâu)</div><p style=\"font-size:11.5px\">" + escapeHtmlSafe(m.outputs) + "</p></div>" +
      "<div class=\"insp-card\"><div class=\"insp-h\">🔌 AUTOSAR Standard APIs</div><pre class=\"code-block\">" + m.apis.join("\n") + "</pre></div>";
  } else if (currentInspTab === 2) {
    const codeText =
`/* Live ComM Runtime C Pseudocode (AUTOSAR Classic R23-11) */
void ComM_MainFunction_${getSelectedChannelId()}(void)
{
  /* 1. Arbitrate Channel ${getSelectedChannelId()} (${ecucConfig.ComMNmVariant}) */
  boolean dcmOverride = ${ch0.dcmActive ? "TRUE" : "FALSE"}; /* ComM_DCM_ActiveDiagnostic */
  boolean commAllowed = ${ch0.commAllowed ? "TRUE" : "FALSE"}; /* Gatekeeper */
  boolean noWakeup    = ${isNoWakeupEffective(ch0) ? "TRUE" : "FALSE"}; /* ClassMask & 0x01 */
  boolean limitNoCom  = ${isLimitNoComEffective(ch0) ? "TRUE" : "FALSE"}; /* ClassMask & 0x02 */

  /* 2. PNC Vector (Offset=2, Len=2) */
  uint8 txPncByte2 = 0x${simState.txPncByte2.toString(16).toUpperCase().padStart(2, "0")}u; /* PNC16: ${simState.pncs[16].state} */
  uint8 rxEiraB2   = 0x${simState.rxEiraByte2.toString(16).toUpperCase().padStart(2, "0")}u;
  /* PrepareSleepTimer = ${simState.pncs[16].prepSleepLeftMs} ms */

  /* 3. Current State Snapshot */
  ComM_ModeType chMode     = ${ch0.mode};
  ComM_StateType subState  = ${ch0.subState};
  uint32 tMinFullLeftMs    = ${ch0.tMinFullLeftMs}u;
  uint32 nmLightLeftMs     = ${ch0.nmLightLeftMs}u;
  uint16 inhibitCounter    = ${simState.inhibitCounter}u;
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
  renderArbitrationAndPncVector();
  render8BitRegisters();
  renderTimers();
  renderStateMachines();
  renderSvgArchitecture();
  renderInspector();
}

// -------------------- TABS, THEME & HOVER TOOLTIP (>1S) --------------------

function switchCfgTab(idx) {
  currentCfgTab = idx;
  for (let i = 0; i < 6; i++) {
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
  const px = Math.min(window.innerWidth - 405, Math.max(12, (evt ? evt.clientX + 16 : rect.right + 10)));
  const py = Math.min(window.innerHeight - 230, Math.max(12, rect.top - 10));
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
      <SHORT-NAME>ComM_EcucConfig</SHORT-NAME>
      <ELEMENTS>
        <ECUC-MODULE-CONFIGURATION-VALUES>
          <SHORT-NAME>ComM</SHORT-NAME>
          <DEFINITION-REF DEST="ECUC-MODULE-DEF">/AUTOSAR/EcucDefs/ComM</DEFINITION-REF>
          <CONTAINERS>
            <ECUC-CONTAINER-VALUE>
              <SHORT-NAME>ComMGeneral</SHORT-NAME>
              <PARAMETER-VALUES>
                <ECUC-BOOLEAN-PARAM-VALUE><DEFINITION-REF DEST="ECUC-BOOLEAN-PARAM-DEF">/AUTOSAR/EcucDefs/ComM/ComMGeneral/ComMDevErrorDetect</DEFINITION-REF><VALUE>${ecucConfig.ComMDevErrorDetect}</VALUE></ECUC-BOOLEAN-PARAM-VALUE>
                <ECUC-BOOLEAN-PARAM-VALUE><DEFINITION-REF DEST="ECUC-BOOLEAN-PARAM-DEF">/AUTOSAR/EcucDefs/ComM/ComMGeneral/ComMModeLimitationEnabled</DEFINITION-REF><VALUE>${ecucConfig.ComMModeLimitationEnabled}</VALUE></ECUC-BOOLEAN-PARAM-VALUE>
                <ECUC-BOOLEAN-PARAM-VALUE><DEFINITION-REF DEST="ECUC-BOOLEAN-PARAM-DEF">/AUTOSAR/EcucDefs/ComM/ComMGeneral/ComMWakeupInhibitionEnabled</DEFINITION-REF><VALUE>${ecucConfig.ComMWakeupInhibitionEnabled}</VALUE></ECUC-BOOLEAN-PARAM-VALUE>
                <ECUC-BOOLEAN-PARAM-VALUE><DEFINITION-REF DEST="ECUC-BOOLEAN-PARAM-DEF">/AUTOSAR/EcucDefs/ComM/ComMGeneral/ComMSynchronousWakeUp</DEFINITION-REF><VALUE>${ecucConfig.ComMSynchronousWakeUp}</VALUE></ECUC-BOOLEAN-PARAM-VALUE>
                <ECUC-FLOAT-PARAM-VALUE><DEFINITION-REF DEST="ECUC-FLOAT-PARAM-DEF">/AUTOSAR/EcucDefs/ComM/ComMGeneral/ComMTMinFullComModeDuration</DEFINITION-REF><VALUE>${(ecucConfig.ComMTMinFullComModeDuration / 1000).toFixed(3)}</VALUE></ECUC-FLOAT-PARAM-VALUE>
                <ECUC-BOOLEAN-PARAM-VALUE><DEFINITION-REF DEST="ECUC-BOOLEAN-PARAM-DEF">/AUTOSAR/EcucDefs/ComM/ComMGeneral/ComMPncSupport</DEFINITION-REF><VALUE>${ecucConfig.ComMPncSupport}</VALUE></ECUC-BOOLEAN-PARAM-VALUE>
                <ECUC-BOOLEAN-PARAM-VALUE><DEFINITION-REF DEST="ECUC-BOOLEAN-PARAM-DEF">/AUTOSAR/EcucDefs/ComM/ComMGeneral/ComMPncGatewayEnabled</DEFINITION-REF><VALUE>${ecucConfig.ComMPncGatewayEnabled}</VALUE></ECUC-BOOLEAN-PARAM-VALUE>
                <ECUC-INTEGER-PARAM-VALUE><DEFINITION-REF DEST="ECUC-INTEGER-PARAM-DEF">/AUTOSAR/EcucDefs/ComM/ComMGeneral/ComMEcuGroupClassification</DEFINITION-REF><VALUE>${getEcuClassMask()}</VALUE></ECUC-INTEGER-PARAM-VALUE>
              </PARAMETER-VALUES>
            </ECUC-CONTAINER-VALUE>
            <ECUC-CONTAINER-VALUE>
              <SHORT-NAME>ComMChannel_0</SHORT-NAME>
              <PARAMETER-VALUES>
                <ECUC-TEXTUAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-ENUMERATION-PARAM-DEF">/AUTOSAR/EcucDefs/ComM/ComMConfigSet/ComMChannel/ComMBusType</DEFINITION-REF><VALUE>${ecucConfig.ComMBusType}</VALUE></ECUC-TEXTUAL-PARAM-VALUE>
                <ECUC-TEXTUAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-ENUMERATION-PARAM-DEF">/AUTOSAR/EcucDefs/ComM/ComMConfigSet/ComMChannel/ComMNetworkManagement/ComMNmVariant</DEFINITION-REF><VALUE>${ecucConfig.ComMNmVariant}</VALUE></ECUC-TEXTUAL-PARAM-VALUE>
                <ECUC-FLOAT-PARAM-VALUE><DEFINITION-REF DEST="ECUC-FLOAT-PARAM-DEF">/AUTOSAR/EcucDefs/ComM/ComMConfigSet/ComMChannel/ComMNetworkManagement/ComMNmLightTimeout</DEFINITION-REF><VALUE>${(ecucConfig.ComMNmLightTimeout / 1000).toFixed(3)}</VALUE></ECUC-FLOAT-PARAM-VALUE>
                <ECUC-TEXTUAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-ENUMERATION-PARAM-DEF">/AUTOSAR/EcucDefs/ComM/ComMConfigSet/ComMChannel/ComMPncGatewayType</DEFINITION-REF><VALUE>${ecucConfig.Ch0_GatewayType}</VALUE></ECUC-TEXTUAL-PARAM-VALUE>
              </PARAMETER-VALUES>
            </ECUC-CONTAINER-VALUE>
          </CONTAINERS>
        </ECUC-MODULE-CONFIGURATION-VALUES>
      </ELEMENTS>
    </AR-PACKAGE>
  </AR-PACKAGES>
</AUTOSAR>`;
}

function generateComMCfgH() {
  const b = (v) => (v ? "STD_ON" : "STD_OFF");
  return `#ifndef COMM_CFG_H
#define COMM_CFG_H

#include "Std_Types.h"

#define COMM_DEV_ERROR_DETECT                   ${b(ecucConfig.ComMDevErrorDetect)}
#define COMM_VERSION_INFO_API                   ${b(ecucConfig.ComMVersionInfoApi)}
#define COMM_MODE_LIMITATION_ENABLED            ${b(ecucConfig.ComMModeLimitationEnabled)}
#define COMM_WAKEUP_INHIBITION_ENABLED          ${b(ecucConfig.ComMWakeupInhibitionEnabled)}
#define COMM_SYNCHRONOUS_WAKE_UP                ${b(ecucConfig.ComMSynchronousWakeUp)}
#define COMM_PNC_SUPPORT                        ${b(ecucConfig.ComMPncSupport)}
#define COMM_PNC_GATEWAY_ENABLED                ${b(ecucConfig.ComMPncGatewayEnabled)}
#define COMM_SYNCHRONIZED_PNC_SHUTDOWN_ENABLED  ${b(ecucConfig.ComMSynchronizedPncShutdownEnabled)}
#define COMM_FULL_COMM_REQ_NOTIFICATION_ENABLED ${b(ecucConfig.ComMFullCommRequestNotificationEnabled)}

#define COMM_NUM_CHANNELS                       2u
#define COMM_NUM_USERS                          3u
#define COMM_NUM_PNC                            2u
#define COMM_MAIN_FUNCTION_PERIOD_MS            ${ecucConfig.ComMMainFunctionPeriod}u
#define COMM_T_MIN_FULL_COM_MODE_DURATION_MS    ${ecucConfig.ComMTMinFullComModeDuration}u
#define COMM_NM_LIGHT_TIMEOUT_MS                ${ecucConfig.ComMNmLightTimeout}u
#define COMM_PNC_PREPARE_SLEEP_TIMER_MS         ${ecucConfig.ComMPncPrepareSleepTimer}u
#define COMM_ECU_GROUP_CLASSIFICATION           ((ComM_InhibitionStatusType)${ecucConfig.ComMEcuGroupClassification}u)

#endif /* COMM_CFG_H */`;
}

function generateComMLcfgC() {
  return `#include "ComM.h"
#include "ComM_Cfg.h"

const ComM_ChannelConfigType ComM_ChannelConfig[COMM_NUM_CHANNELS] = {
  {
    .ChannelId         = 0u,
    .BusType           = ${ecucConfig.ComMBusType},
    .NmVariant         = COMM_NM_VARIANT_${ecucConfig.ComMNmVariant},
    .NmLightTimeoutMs  = ${ecucConfig.ComMNmLightTimeout}u,
    .PncGatewayType    = ${ecucConfig.Ch0_GatewayType},
    .NoWakeupNvM       = ${ecucConfig.ComMNoWakeupNvMStorage ? "TRUE" : "FALSE"},
    .PncNmRequest      = ${ecucConfig.ComMPncNmRequest ? "TRUE" : "FALSE"}
  },
  {
    .ChannelId         = 1u,
    .BusType           = COMM_BUS_TYPE_CAN,
    .NmVariant         = COMM_NM_VARIANT_FULL,
    .NmLightTimeoutMs  = 0u,
    .PncGatewayType    = ${ecucConfig.Ch1_GatewayType},
    .NoWakeupNvM       = ${ecucConfig.ComMNoWakeupNvMStorage ? "TRUE" : "FALSE"},
    .PncNmRequest      = FALSE
  }
};

const ComM_PncConfigType ComM_PncConfig[COMM_NUM_PNC] = {
  { .PncId = 16u, .ByteIdx = 2u, .BitMask = 0x01u, .Enabled = ${ecucConfig.Pnc16_Enabled_And_Mask ? "TRUE" : "FALSE"} },
  { .PncId = 18u, .ByteIdx = 2u, .BitMask = 0x04u, .Enabled = ${ecucConfig.Pnc18_Enabled_And_Mask ? "TRUE" : "FALSE"} }
};

const ComM_ConfigType ComM_Config = {
  .Channels = ComM_ChannelConfig,
  .Pncs     = ComM_PncConfig
};`;
}

function getExportPayload(idx) {
  if (idx === 0) return { filename: "ComM.arxml", text: generateArxmlContent() };
  if (idx === 1) return { filename: "ComM_Cfg.h", text: generateComMCfgH() };
  if (idx === 2) return { filename: "ComM_Lcfg.c", text: generateComMLcfgC() };
  return { filename: "ComM_Config.json", text: JSON.stringify(ecucConfig, null, 2) };
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
  a.download = "AUTOSAR_ComM_Simulator.html";
  a.click();
  URL.revokeObjectURL(a.href);
}
