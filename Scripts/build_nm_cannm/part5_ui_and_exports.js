// ================= PART 5: UI RENDERERS, TOOLTIP (>1S), INSPECTOR (CODE C) & ARXML/C/HTML EXPORTS =================

let currentScenarioIdx = 0;
let currentStepIdx = 0;
let scenarioSnapshots = [];
let autoPlayTimer = null;
let autoClockTimer = null;
let selectedModuleId = "MOD_NM";
let currentInspTab = 0;
let currentExportTab = 0;
let tooltipShowTimer = null;
let tooltipHideTimer = null;

function escapeHtmlSafe(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getSelectedChannelId() {
  const sel = document.getElementById("qaTargetCh");
  const v = sel ? parseInt(sel.value, 10) : 0;
  return (v === 1) ? 1 : 0;
}

// -------------------- SCENARIO STEPPER & SNAPSHOTS --------------------

function captureScenarioSnapshot() {
  return {
    cfg: JSON.parse(JSON.stringify(ecucConfig)),
    sim: JSON.parse(JSON.stringify(simState))
  };
}

function restoreScenarioSnapshot(snap) {
  if (!snap) return;
  ecucConfig = JSON.parse(JSON.stringify(snap.cfg));
  simState = JSON.parse(JSON.stringify(snap.sim));
  syncConfigToDOM();
  recomputeRegisters();
}

function stopAutoPlay() {
  if (autoPlayTimer) {
    clearInterval(autoPlayTimer);
    autoPlayTimer = null;
  }
  const btn = document.getElementById("btnAutoPlay");
  if (btn) btn.textContent = "▶ Tự Chạy";
}

function loadScenario(idx) {
  stopAutoPlay();
  const safeIdx = Math.max(0, Math.min(SCENARIOS.length - 1, idx));
  currentScenarioIdx = safeIdx;
  currentStepIdx = 0;
  const sc = SCENARIOS[safeIdx];
  const sel = document.getElementById("scenSelect");
  if (sel) sel.value = sc.id;
  sc.setup();
  scenarioSnapshots = [captureScenarioSnapshot()];
  renderAll();
}

function onScenarioSelectChange() {
  const sel = document.getElementById("scenSelect");
  if (!sel) return;
  const idx = SCENARIOS.findIndex((s) => s.id === sel.value);
  loadScenario(idx >= 0 ? idx : 0);
}

function resetCurrentScenario() {
  loadScenario(currentScenarioIdx);
}

function nextScenarioStep() {
  const sc = SCENARIOS[currentScenarioIdx];
  if (!sc || currentStepIdx >= sc.steps.length) return;
  const stepObj = sc.steps[currentStepIdx];
  stepObj.exec();
  currentStepIdx++;
  simState.stepExplain = "Bước " + currentStepIdx + " / " + sc.steps.length + " — " + stepObj.title + ": " + stepObj.desc;
  scenarioSnapshots[currentStepIdx] = captureScenarioSnapshot();
  syncConfigToDOM();
  recomputeRegisters();
  renderAll();
}

function prevScenarioStep() {
  if (currentStepIdx <= 0) return;
  stopAutoPlay();
  currentStepIdx--;
  restoreScenarioSnapshot(scenarioSnapshots[currentStepIdx]);
  renderAll();
}

function toggleScenarioAutoPlay() {
  if (autoPlayTimer) {
    stopAutoPlay();
    return;
  }
  const sc = SCENARIOS[currentScenarioIdx];
  if (currentStepIdx >= sc.steps.length) {
    loadScenario(currentScenarioIdx);
  }
  const btn = document.getElementById("btnAutoPlay");
  if (btn) btn.textContent = "⏸ Dừng";
  autoPlayTimer = setInterval(() => {
    const curSc = SCENARIOS[currentScenarioIdx];
    if (currentStepIdx >= curSc.steps.length) {
      stopAutoPlay();
      return;
    }
    nextScenarioStep();
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
  if (btn) btn.textContent = "⏸ Stop Clock";
  autoClockTimer = setInterval(() => {
    stepClockTick(100);
  }, 850);
}

function runWhatIf(wiIdx) {
  stopAutoPlay();
  const sc = SCENARIOS[currentScenarioIdx];
  if (!sc || !sc.whatIfs[wiIdx]) return;
  sc.whatIfs[wiIdx].run();
  syncConfigToDOM();
  recomputeRegisters();
  renderAll();
}

// -------------------- QUICK ACTION BAR HANDLERS --------------------

function qaToggleDisableComm() {
  const chId = getSelectedChannelId();
  api_Nm_DisableOrEnableComm(chId, !simState.commDisabled);
  simState.stepExplain = "Quick Action (UDS 0x28): Gọi " + (simState.commDisabled ? "Nm_DisableCommunication(" + chId + ")" : "Nm_EnableCommunication(" + chId + ")") + " xuống CanNm.";
  renderAll();
}

function qaNetworkRequest() {
  const chId = getSelectedChannelId();
  api_Nm_NetworkRequest(chId);
  simState.stepExplain = "Quick Action: ComM gọi Nm_NetworkRequest(" + chId + ") ➔ Nm định tuyến sang CanNm_NetworkRequest(" + chId + ").";
  renderAll();
}

function qaNetworkRelease() {
  const chId = getSelectedChannelId();
  api_Nm_NetworkRelease(chId);
  simState.stepExplain = "Quick Action: ComM gọi Nm_NetworkRelease(" + chId + ") ➔ Kiểm tra NM Coordinator / chuyển sang Ready Sleep.";
  renderAll();
}

function qaPassiveStartUp() {
  const chId = getSelectedChannelId();
  api_Nm_PassiveStartUp(chId);
  simState.stepExplain = "Quick Action: ComM gọi Nm_PassiveStartUp(" + chId + ") ➔ CanNm vào Repeat Message với AWB=0.";
  renderAll();
}

function qaRepeatMessageRequest() {
  const chId = getSelectedChannelId();
  api_Nm_RepeatMessageRequest(chId);
  simState.stepExplain = "Quick Action: Gọi Nm_RepeatMessageRequest(" + chId + ") ➔ Bật CBV Bit 0 (RMR=1) điểm danh toàn bus.";
  renderAll();
}

function qaTriggerRemoteSleepAll() {
  api_TriggerRemoteSleepQuiet(0);
  api_TriggerRemoteSleepQuiet(1);
  if (ecucConfig.NmCoordinatorSupportEnabled) {
    evaluateNmCoordinator();
  }
  recomputeRegisters();
  simState.stepExplain = "Quick Action: Kích hoạt RemoteSleep (im lặng đủ CanNmRemoteSleepIndTime) trên Ch0 & Ch1 để đánh thức Nm Coordinator Shutdown.";
  renderAll();
}

function qaSyncPncShutdown() {
  const chId = getSelectedChannelId();
  if (!ecucConfig.CanNmPnEnabled || !ecucConfig.NmSynchronizedPncShutdownEnabled) {
    ecucConfig.CanNmPnEnabled = true;
    ecucConfig.NmSynchronizedPncShutdownEnabled = true;
    syncConfigToDOM();
  }
  api_Nm_RequestSynchronizedPncShutdown(chId, 16);
  simState.stepExplain = "Quick Action (R22-11+): Bật PN/SyncPnc & gọi Nm_RequestSynchronizedPncShutdown(" + chId + ", PNC #16) -> CBV Bit 5 (PNSR=1).";
  renderAll();
}

function qaResetToBusSleep() {
  applyPresetBase({
    NmCoordinatorSupportEnabled: ecucConfig.NmCoordinatorSupportEnabled,
    CanNmPnEnabled: ecucConfig.CanNmPnEnabled,
    NmSynchronizedPncShutdownEnabled: ecucConfig.NmSynchronizedPncShutdownEnabled
  });
  currentStepIdx = 0;
  scenarioSnapshots = [captureScenarioSnapshot()];
  simState.stepExplain = "Quick Action: Đã gọi Nm_Init() & CanNm_Init() — toàn bộ Ch0, Ch1 và NM Coordinator đã về Bus-Sleep.";
  addTraceLog("info", "Reset", "Nm & CanNm", "Nm_Init() + CanNm_Init()", "Đưa hệ thống về BUS_SLEEP mặc định.");
  renderAll();
}

function qaSimulatedRxIndication() {
  const chId = getSelectedChannelId();
  const rmr = Boolean(document.getElementById("qaRxRmr")?.checked);
  const awb = Boolean(document.getElementById("qaRxAwb")?.checked);
  const srb = Boolean(document.getElementById("qaRxSrb")?.checked);
  const pni = Boolean(document.getElementById("qaRxPni")?.checked);
  const pnsr = Boolean(document.getElementById("qaRxPnsr")?.checked);
  const maskStr = document.getElementById("qaRxPniHex")?.value || "05 00";
  const pniMask = parsePnMask16(maskStr);

  api_CanNm_RxIndication(chId, {
    nodeId: 0x2B,
    rmr: rmr,
    awb: awb,
    srb: srb,
    pni: pni,
    pnsr: pnsr,
    pniMask: pniMask
  });
  simState.stepExplain = "Quick Action (Rx Node 0x2B trên Ch" + chId + "): Bắn CanNm_RxIndication() [RMR=" + (rmr ? 1 : 0) + ", SRB/CWU=" + (srb ? 1 : 0) + ", AWB=" + (awb ? 1 : 0) + ", PNSR=" + (pnsr ? 1 : 0) + ", PNI=" + (pni ? 1 : 0) + "].";
  renderAll();
}

function qaChQuickAction(chId, action) {
  if (action === "req") api_Nm_NetworkRequest(chId);
  else if (action === "rel") api_Nm_NetworkRelease(chId);
  else if (action === "rsi") {
    api_TriggerRemoteSleepQuiet(chId);
    if (ecucConfig.NmCoordinatorSupportEnabled) evaluateNmCoordinator();
    recomputeRegisters();
  }
  simState.stepExplain = "Cluster Card Ch" + chId + ": Thực thi " + action.toUpperCase() + ".";
  renderAll();
}

// -------------------- INTERACTIVE BIT CLICKS (REG A = CBV, REG B = ENGINE) --------------------

function toggleRegisterBit(regType, mask) {
  const chId = getSelectedChannelId();
  const ch = simState.channels[chId];
  if (regType === "A") {
    if (mask === 0x01) {
      if (!ch.cbv.rmr) api_Nm_RepeatMessageRequest(chId);
      else { ch.cbv.rmr = false; recomputeRegisters(); }
    } else if (mask === 0x08) {
      if (ecucConfig.NmCoordinatorSupportEnabled) {
        api_CanNm_SetSleepReadyBit(chId, !ch.sleepReadyBit);
      } else {
        ch.cbv.cwuOrSrb = !ch.cbv.cwuOrSrb;
        recomputeRegisters();
      }
    } else if (mask === 0x10) {
      ch.cbv.awb = !ch.cbv.awb;
      recomputeRegisters();
    } else if (mask === 0x20) {
      if (!ch.cbv.pnsr) qaSyncPncShutdown();
      else { ch.cbv.pnsr = false; recomputeRegisters(); }
    } else if (mask === 0x40) {
      ecucConfig.CanNmPnEnabled = !ecucConfig.CanNmPnEnabled;
      ch.cbv.pni = ecucConfig.CanNmPnEnabled;
      syncConfigToDOM();
      recomputeRegisters();
    }
  } else if (regType === "B") {
    if (mask === 0x01) {
      ecucConfig.NmCanNmInitialized = !ecucConfig.NmCanNmInitialized;
      syncConfigToDOM();
      recomputeRegisters();
    } else if (mask === 0x02) {
      api_Nm_DisableOrEnableComm(chId, !simState.commDisabled);
    } else if (mask === 0x04) {
      if (ch.nmCoordHold) api_Nm_NetworkRelease(chId);
      else api_Nm_NetworkRequest(chId);
    } else if (mask === 0x08) {
      ecucConfig.NmStateReportEnabled = !ecucConfig.NmStateReportEnabled;
      syncConfigToDOM();
      recomputeRegisters();
    } else if (mask === 0x10) {
      api_CanNm_SetSleepReadyBit(0, !simState.channels[0].sleepReadyBit);
    } else if (mask === 0x20) {
      if (!simState.channels[1].remoteSleepInd) api_TriggerRemoteSleepQuiet(1);
      else simState.channels[1].remoteSleepInd = false;
      if (ecucConfig.NmCoordinatorSupportEnabled) evaluateNmCoordinator();
      recomputeRegisters();
    } else if (mask === 0x40) {
      if (!simState.channels[0].remoteSleepInd) api_TriggerRemoteSleepQuiet(0);
      else simState.channels[0].remoteSleepInd = false;
      if (ecucConfig.NmCoordinatorSupportEnabled) evaluateNmCoordinator();
      recomputeRegisters();
    } else if (mask === 0x80) {
      if (ecucConfig.NmCoordinatorSupportEnabled) evaluateNmCoordinator();
      recomputeRegisters();
    }
  }
  renderAll();
}

// -------------------- CORE VIEW RENDERERS --------------------

function mapCoordBadgeClass(coordState) {
  if (coordState === "NM_COORD_SHUTDOWN_INITIATED") return "sb-shdn";
  if (coordState === "NM_COORD_WAIT_REMOTE_SLEEP") return "sb-wait";
  if (coordState === "NM_COORD_CLUSTER_AWAKE_ACTIVE") return "sb-net";
  return "sb-sleep";
}

function mapChBadgeClass(ch) {
  if (!ecucConfig.NmCanNmInitialized) return "sb-err";
  if (ch.canNmMode === "NM_MODE_PREPARE_BUS_SLEEP") return "sb-prep";
  if (ch.canNmMode === "NM_MODE_NETWORK") {
    return ch.canNmState === "NM_STATE_READY_SLEEP" ? "sb-wait" : "sb-net";
  }
  return "sb-sleep";
}

function renderHeaderAndQuickActions() {
  const sc = SCENARIOS[currentScenarioIdx];
  document.getElementById("stepIndicator").textContent = "Bước " + currentStepIdx + " / " + sc.steps.length;
  document.getElementById("btnPrevStep").disabled = (currentStepIdx <= 0);
  document.getElementById("btnNextStep").disabled = (currentStepIdx >= sc.steps.length);
  document.getElementById("clockVal").textContent = simState.clockMs + " ms";

  const bCoord = document.getElementById("hdrBadgeCoord");
  bCoord.textContent = "Coord: " + (ecucConfig.NmCoordinatorSupportEnabled ? simState.coordState.replace("NM_COORD_", "") : "BYPASS(1:1)");
  bCoord.className = "state-badge " + (ecucConfig.NmCoordinatorSupportEnabled ? mapCoordBadgeClass(simState.coordState) : "sb-prep");

  const ch0 = simState.channels[0];
  const ch1 = simState.channels[1];
  const bCh0 = document.getElementById("hdrBadgeCh0");
  bCh0.textContent = "Ch0: " + ch0.canNmState.replace("NM_STATE_", "");
  bCh0.className = "state-badge " + mapChBadgeClass(ch0);

  const bCh1 = document.getElementById("hdrBadgeCh1");
  bCh1.textContent = "Ch1: " + ch1.canNmState.replace("NM_STATE_", "");
  bCh1.className = "state-badge " + mapChBadgeClass(ch1);

  const bCbv = document.getElementById("hdrBadgeCbv");
  bCbv.textContent = "CBV: 0x" + simState.regAByte.toString(16).toUpperCase().padStart(2, "0");
  bCbv.className = "state-badge " + (simState.regAByte ? "sb-wait" : "sb-sleep");

  const commBtn = document.getElementById("qaBtnCommCtrl");
  if (commBtn) {
    commBtn.textContent = simState.commDisabled ? "🔊 EnableComm" : "🔇 DisableComm";
    commBtn.className = simState.commDisabled ? "btn btn-sm btn-warn" : "btn btn-sm btn-err";
  }

  document.getElementById("scenIdBadge").textContent = sc.id + " · " + sc.group.split(":")[0];
  document.getElementById("scenSummaryBox").textContent = sc.summary;

  const wfBox = document.getElementById("whatIfContainer");
  wfBox.innerHTML = sc.whatIfs.map((w, i) =>
    "<button class=\"whatif-btn\" onclick=\"runWhatIf(" + i + ")\">" + escapeHtmlSafe(w.label) + "</button>"
  ).join("");

  const alerts = validateConfigRules();
  const vBox = document.getElementById("cfgValidationBox");
  vBox.innerHTML = alerts.map((a) =>
    "<div class=\"cfg-alert " + (a.cls || "") + "\">" + escapeHtmlSafe(a.msg) + "</div>"
  ).join("");
}

function renderClusterAndPdu() {
  const pill = document.getElementById("coordSummaryPill");
  pill.textContent =
    (ecucConfig.NmCoordinatorSupportEnabled ? ("Coord: " + simState.coordState.replace("NM_COORD_", "")) : "Coord: DISABLED (1:1)") +
    " | ShdnTmr: " + simState.coordShutdownDelayLeftMs + "ms" +
    " | NMS: 0x" + simState.nmsSignalVal.toString(16).toUpperCase().padStart(2, "0") +
    " | SyncPt: " + (simState.syncPointDone ? "DONE" : "WAIT");

  const cardsHtml = simState.channels.map((ch) => {
    const modeCls = ch.canNmMode === "NM_MODE_PREPARE_BUS_SLEEP"
      ? "ch-prep"
      : (simState.coordState === "NM_COORD_SHUTDOWN_INITIATED" ? "ch-shdn" : (ch.canNmMode === "NM_MODE_NETWORK" ? "ch-net" : ""));
    const roleTag = (ch.id === 0)
      ? (ecucConfig.NmActiveCoordinator ? "Active Coord" : "Passive Coord")
      : (ecucConfig.NmChannelSleepMaster ? "SleepMaster=1" : "RemoteSlpReq");

    return "<div class=\"ch-card " + modeCls + "\">" +
      "<div class=\"ch-card-top\">" +
        "<span>" + escapeHtmlSafe(ch.name) + "</span>" +
        "<span class=\"ch-pill " + (ch.id === 0 ? "cyan" : "pur") + "\">" + roleTag + "</span>" +
      "</div>" +
      "<div class=\"ch-kv\">" +
        "<div>ComM Req: <b class=\"mono\" style=\"color:" + (ch.commRequested ? "var(--ok)" : "var(--mut)") + "\">" + (ch.commRequested ? "FULL_COM" : "NO_COM") + "</b></div>" +
        "<div>Nm Hold: <b class=\"mono\" style=\"color:" + (ch.nmCoordHold ? "var(--pri)" : "var(--mut)") + "\">" + (ch.nmCoordHold ? "HOLD(1)" : "REL(0)") + "</b></div>" +
        "<div>CanNm: <b class=\"mono\">" + ch.canNmState.replace("NM_STATE_", "") + "</b></div>" +
        "<div>RemoteSlp: <b class=\"mono\" style=\"color:" + (ch.remoteSleepInd ? "var(--cyan)" : "var(--mut)") + "\">" + (ch.remoteSleepInd ? "TRUE(1)" : "FALSE(0)") + "</b></div>" +
      "</div>" +
      "<div style=\"display:flex;gap:4px;margin-top:5px\">" +
        "<button class=\"btn btn-sm btn-ok\" style=\"flex:1;justify-content:center\" onclick=\"qaChQuickAction(" + ch.id + ",'req')\">Req</button>" +
        "<button class=\"btn btn-sm btn-warn\" style=\"flex:1;justify-content:center\" onclick=\"qaChQuickAction(" + ch.id + ",'rel')\">Rel</button>" +
        "<button class=\"btn btn-sm btn-cyan\" style=\"flex:1;justify-content:center\" onclick=\"qaChQuickAction(" + ch.id + ",'rsi')\">RSI</button>" +
      "</div>" +
    "</div>";
  }).join("");
  document.getElementById("clusterGrid").innerHTML = cardsHtml;

  // 8-Byte PDU Slicer
  const bytes = getPduFrameBytes();
  const canId = (parseHexWordId(ecucConfig.CanNmBaseCanId, 0x500) + parseHexByte(ecucConfig.CanNmNodeId, 0x1A)) & 0x7FF;
  document.getElementById("pduCanIdLbl").textContent = "CAN ID: 0x" + canId.toString(16).toUpperCase().padStart(3, "0") + " (Tx #" + simState.txFrameCount + ")";
  document.getElementById("pduLayoutNote").textContent =
    "Nid:" + ecucConfig.CanNmPduNidPosition.replace("CANNM_PDU_", "") +
    " | Cbv:" + ecucConfig.CanNmPduCbvPosition.replace("CANNM_PDU_", "") +
    " | LastRx(0x" + simState.lastRxPdu.nodeId.toString(16).toUpperCase() + ") CBV=0x" + simState.lastRxPdu.cbv.toString(16).toUpperCase().padStart(2, "0");

  let pduHtml = "";
  for (let i = 0; i < 8; i++) {
    let cls = "pdu-usr";
    let lbl = "User Data";
    if ((i === 0 && ecucConfig.CanNmPduNidPosition === "CANNM_PDU_BYTE_0") ||
        (i === 1 && ecucConfig.CanNmPduNidPosition === "CANNM_PDU_BYTE_1")) {
      cls = "pdu-sni";
      lbl = "SNI (NodeId)";
    } else if ((i === 1 && ecucConfig.CanNmPduCbvPosition === "CANNM_PDU_BYTE_1") ||
               (i === 0 && ecucConfig.CanNmPduCbvPosition === "CANNM_PDU_BYTE_0")) {
      cls = "pdu-cbv";
      lbl = "CBV Byte";
    } else if (ecucConfig.CanNmPnEnabled && (i === 2 || i === 3)) {
      cls = "pdu-pni";
      lbl = (i === 2) ? "PNI B2(P16..23)" : "PNI B3(P24..31)";
    } else if (ecucConfig.NmStateReportEnabled && i === 4) {
      cls = "pdu-nms";
      lbl = "NMS (" + ecucConfig.NmStateReportSignalRef.slice(0, 10) + ")";
    }
    pduHtml += "<div class=\"pdu-byte-card " + cls + "\">" +
      "<div class=\"pdu-byte-idx\">Byte " + i + "</div>" +
      "<div class=\"pdu-byte-val mono\">0x" + (bytes[i] & 0xFF).toString(16).toUpperCase().padStart(2, "0") + "</div>" +
      "<div class=\"pdu-byte-lbl\" title=\"" + lbl + "\">" + lbl + "</div>" +
    "</div>";
  }
  document.getElementById("pduFrameGrid").innerHTML = pduHtml;
}

function render8BitRegisters() {
  const renderReg = (hexElId, bitsElId, byteVal, prevVal, defs, regType) => {
    document.getElementById(hexElId).textContent = "0x" + (byteVal & 0xFF).toString(16).toUpperCase().padStart(2, "0");
    document.getElementById(bitsElId).innerHTML = defs.map((d) => {
      const on = (byteVal & d.mask) !== 0;
      const chg = ((byteVal ^ prevVal) & d.mask) !== 0;
      const cls = "bit-box" + (on ? " on" : "") + (d.tone ? " " + d.tone + "-bit" : "") + (chg ? " chg" : "");
      return "<div class=\"" + cls + "\" title=\"Bit " + d.bit + " (" + d.name + "): " + escapeHtmlSafe(d.desc) + "\" onclick=\"toggleRegisterBit('" + regType + "', " + d.mask + ")\">" +
        "<div class=\"bit-pos mono\">b" + d.bit + "</div>" +
        "<div class=\"bit-val mono\">" + (on ? "1" : "0") + "</div>" +
        "<div class=\"bit-tag\">" + escapeHtmlSafe(d.tag) + "</div>" +
      "</div>";
    }).join("");
  };
  renderReg("regAHex", "regABits", simState.regAByte, simState.prevRegAByte, CANNM_CBV_BITS, "A");
  renderReg("regBHex", "regBBits", simState.regBByte, simState.prevRegBByte, NM_CANNM_ENGINE_BITS, "B");
}

function renderTimers() {
  document.getElementById("panel2SubLbl").textContent =
    "BusType: " + ecucConfig.NmBusType +
    " | EIRA: 0x" + simState.eiraMask.toString(16).toUpperCase().padStart(4, "0") +
    (ecucConfig.CanNmPnEnabled ? (" | PnReset: " + simState.pnResetLeftMs + "ms") : "");

  const ch0 = simState.channels[0];
  const timers = [
    {
      lbl: "NmShutdownDelayTimer",
      cur: simState.coordShutdownDelayLeftMs,
      max: Number(ecucConfig.NmGlobalCoordinatorTime) || 1500,
      tone: "pur"
    },
    {
      lbl: "CanNmRemoteSleepIndTime",
      cur: ch0.remoteSleepTimerMs,
      max: Number(ecucConfig.CanNmRemoteSleepIndTime) || 1500,
      tone: "warn"
    },
    {
      lbl: "CanNmRepeatMessageTime",
      cur: ch0.repeatMsgLeftMs,
      max: Number(ecucConfig.CanNmRepeatMessageTime) || 1500,
      tone: ""
    },
    {
      lbl: "CanNmTimeoutTime (NM-Tmo)",
      cur: ch0.timeoutLeftMs,
      max: Number(ecucConfig.CanNmTimeoutTime) || 2000,
      tone: "warn"
    },
    {
      lbl: "CanNmWaitBusSleepTime",
      cur: ch0.waitBusSleepLeftMs,
      max: Number(ecucConfig.CanNmWaitBusSleepTime) || 1500,
      tone: ""
    },
    {
      lbl: ch0.burstLeft > 0 ? "ImmediateBurstTimer" : "CanNmMsgCycleTime",
      cur: ch0.msgCycleLeftMs,
      max: Number(ch0.burstLeft > 0 ? ecucConfig.CanNmImmediateNmCycleTime : ecucConfig.CanNmMsgCycleTime) || 1000,
      tone: "pur"
    }
  ];

  document.getElementById("timersGrid").innerHTML = timers.map((t) => {
    const pct = t.max > 0 ? Math.min(100, Math.round((t.cur / t.max) * 100)) : 0;
    const cardCls = "timer-card" + (t.cur > 0 ? (t.tone === "warn" ? " warn-active" : " active") : "");
    return "<div class=\"" + cardCls + "\">" +
      "<div class=\"timer-top\"><span>" + escapeHtmlSafe(t.lbl) + "</span><span class=\"mono\">" + t.cur + " / " + t.max + " ms</span></div>" +
      "<div class=\"timer-bar\"><div class=\"timer-fill " + t.tone + "\" style=\"width:" + pct + "%\"></div></div>" +
    "</div>";
  }).join("");
}

function renderStateMachines() {
  const cs = simState.coordState;
  document.getElementById("smCoordLbl").textContent = ecucConfig.NmCoordinatorSupportEnabled ? cs.replace("NM_COORD_", "") : "BYPASS";

  const coordStates = [
    { key: "NM_COORD_CLUSTER_SLEEP", lbl: "NM_COORD_CLUSTER_SLEEP", sub: "Cả Ch0 & Ch1 ở Bus-Sleep", actCls: "active-sleep" },
    { key: "NM_COORD_CLUSTER_AWAKE_ACTIVE", lbl: "NM_COORD_CLUSTER_AWAKE_ACTIVE", sub: "Ít nhất 1 kênh ComM Request = TRUE", actCls: "active-state" },
    { key: "NM_COORD_WAIT_REMOTE_SLEEP", lbl: "NM_COORD_WAIT_REMOTE_SLEEP", sub: "Đã Release hết; giữ HOLD chờ RemoteSleep + SyncPt", actCls: "active-warn" },
    { key: "NM_COORD_SHUTDOWN_INITIATED", lbl: "NM_COORD_SHUTDOWN_INITIATED", sub: "SRB=1 & Đếm NmShutdownDelayTimer -> Release All", actCls: "active-pur" }
  ];

  document.getElementById("coordSmDiagram").innerHTML = coordStates.map((s) => {
    const active = ecucConfig.NmCoordinatorSupportEnabled && (cs === s.key);
    return "<div class=\"sm-node " + (active ? s.actCls : "") + "\">" +
      "<div class=\"sm-node-hdr\"><span class=\"mono\">" + s.lbl + "</span><span>" + (active ? "● ACTIVE" : "") + "</span></div>" +
      "<div style=\"font-size:10px;color:var(--mut);margin-top:2px\">" + s.sub + "</div>" +
    "</div>";
  }).join("");

  const ch0 = simState.channels[0];
  const ch1 = simState.channels[1];
  document.getElementById("smCanNmLbl").textContent = "Ch0:" + ch0.canNmState.replace("NM_STATE_", "") + " | Ch1:" + ch1.canNmState.replace("NM_STATE_", "");

  const inNet = (ch0.canNmMode === "NM_MODE_NETWORK");
  const isPrep = (ch0.canNmMode === "NM_MODE_PREPARE_BUS_SLEEP");
  const isSleep = (ch0.canNmMode === "NM_MODE_BUS_SLEEP");

  const subStates = [
    { key: "NM_STATE_REPEAT_MESSAGE", lbl: "Repeat Message (RMS)" },
    { key: "NM_STATE_NORMAL_OPERATION", lbl: "Normal Operation (NOS)" },
    { key: "NM_STATE_READY_SLEEP", lbl: "Ready Sleep (RSS)" }
  ];

  const netSubHtml = subStates.map((sb) => {
    const active0 = (ch0.canNmState === sb.key);
    const active1 = (ch1.canNmState === sb.key);
    const badge1 = active1 ? " [Ch1]" : "";
    return "<span class=\"sm-subnode " + (active0 ? "sub-active" : "") + "\">" + sb.lbl + badge1 + "</span>";
  }).join("");

  document.getElementById("cannmSmDiagram").innerHTML =
    "<div class=\"sm-node " + (inNet ? "active-state" : "") + "\">" +
      "<div class=\"sm-node-hdr\"><span class=\"mono\">NM_MODE_NETWORK</span><span>" + (inNet ? "● ACTIVE" : "") + "</span></div>" +
      "<div class=\"sm-subs\">" + netSubHtml + "</div>" +
    "</div>" +
    "<div class=\"sm-node " + (isPrep ? "active-prep" : "") + "\">" +
      "<div class=\"sm-node-hdr\"><span class=\"mono\">NM_MODE_PREPARE_BUS_SLEEP</span><span>" + (isPrep ? "● ACTIVE (" + ch0.waitBusSleepLeftMs + "ms)" : "") + "</span></div>" +
      "<div style=\"font-size:10px;color:var(--mut);margin-top:2px\">Xóa AWB=0, báo Nm_PrepareBusSleepMode() ➔ SILENT_COM</div>" +
    "</div>" +
    "<div class=\"sm-node " + (isSleep ? "active-sleep" : "") + "\">" +
      "<div class=\"sm-node-hdr\"><span class=\"mono\">NM_MODE_BUS_SLEEP</span><span>" + (isSleep ? "● ACTIVE" : "") + "</span></div>" +
      "<div style=\"font-size:10px;color:var(--mut);margin-top:2px\">Ngủ hoàn toàn, báo Nm_BusSleepMode() ➔ tắt CanSM</div>" +
    "</div>";
}

function renderSvgArchitecture() {
  const ch0 = simState.channels[0];
  const ch1 = simState.channels[1];
  const setTxt = (id, t) => { const el = document.getElementById(id); if (el) el.textContent = t; };

  setTxt("svgSub_MOD_SWC", "Ch0 Req: " + (ch0.commRequested ? "FULL" : "NO_COM") + " | Ch1: " + (ch1.commRequested ? "FULL" : "NO_COM"));
  setTxt("svgSub_MOD_COMM", "Ch0:" + (ch0.canNmMode === "NM_MODE_BUS_SLEEP" ? "NO_COM" : (ch0.canNmMode === "NM_MODE_PREPARE_BUS_SLEEP" ? "SILENT" : "FULL")) + " | CommCtrl:" + (simState.commDisabled ? "OFF(0x28)" : "ON"));
  setTxt("svgSub_MOD_RTE", "Nm: " + ecucConfig.NmCycletimeMainFunction + "ms | CanNm: " + ecucConfig.CanNmMainFunctionPeriod + "ms");
  setTxt("svgSub_MOD_NM1", "Coord: " + (ecucConfig.NmCoordinatorSupportEnabled ? simState.coordState.replace("NM_COORD_", "") : "BYPASS") + " | ShdnTmr: " + simState.coordShutdownDelayLeftMs + " ms");
  setTxt("svgSub_MOD_NM2", "Dispatcher: " + ecucConfig.NmBusType + " | NMS: 0x" + simState.nmsSignalVal.toString(16).toUpperCase().padStart(2, "0"));
  setTxt("svgSub_MOD_DET", "Faults: " + simState.detFaults.length + (simState.detFaults.length ? " (" + simState.detFaults[0].code.split(" ")[0] + ")" : " (OK)"));
  setTxt("svgSub_MOD_COM", "NMS: 0x" + simState.nmsSignalVal.toString(16).toUpperCase().padStart(2, "0") + " | EIRA: 0x" + simState.eiraMask.toString(16).toUpperCase().padStart(4, "0"));
  setTxt("svgSub_MOD_CANNM1", "Ch0: " + ch0.canNmState.replace("NM_STATE_", "") + " | Ch1: " + ch1.canNmState.replace("NM_STATE_", ""));
  setTxt("svgSub_MOD_CANNM2", "CBV: 0x" + simState.regAByte.toString(16).toUpperCase().padStart(2, "0") + " | RemoteSlp(0/1): " + (ch0.remoteSleepInd ? "YES" : "NO") + "/" + (ch1.remoteSleepInd ? "YES" : "NO"));
  setTxt("svgSub_MOD_CANSM", "Mode: " + (ch0.canNmMode === "NM_MODE_BUS_SLEEP" ? "NO_COM" : "FULL_COM") + " | PnAvail: " + (simState.pnAvailConfirmed ? "CONFIRMED" : "OFF"));
  const canId = (parseHexWordId(ecucConfig.CanNmBaseCanId, 0x500) + parseHexByte(ecucConfig.CanNmNodeId, 0x1A)) & 0x7FF;
  setTxt("svgSub_MOD_CANIF", "TxId: 0x" + canId.toString(16).toUpperCase() + " | PduMode: " + (simState.commDisabled ? "TX_OFFLINE" : (ch0.canNmMode === "NM_MODE_BUS_SLEEP" ? "OFFLINE" : "ONLINE")));
  setTxt("svgSub_MOD_HW", "Remote 0x" + simState.lastRxPdu.nodeId.toString(16).toUpperCase() + " (Last CBV: 0x" + simState.lastRxPdu.cbv.toString(16).toUpperCase().padStart(2, "0") + ")");

  const svg = document.getElementById("nmCanNmArchSvg");
  if (!svg) return;
  svg.querySelectorAll(".flow-arrow").forEach((p) => {
    p.classList.toggle("active", simState.activeArrows.includes(p.id));
  });
  svg.querySelectorAll(".mod-node").forEach((n) => {
    const mid = n.id.replace("node_", "");
    n.classList.toggle("selected", mid === selectedModuleId);
    const activeMod = (mid === "MOD_NM" && (simState.activeArrows.includes("arr_comm_nm") || simState.activeArrows.includes("arr_cannm_nm"))) ||
                      (mid === "MOD_CANNM" && (simState.activeArrows.includes("arr_nm_cannm") || simState.activeArrows.includes("arr_canif_cannm")));
    n.classList.toggle("active-mod", activeMod);
  });
}

// -------------------- RIGHT STICKY 4-TAB INSPECTOR --------------------

function selectModule(modId) {
  selectedModuleId = modId;
  if (currentInspTab !== 1) switchInspTab(1);
  else renderInspector();
  renderSvgArchitecture();
}

function switchInspTab(idx) {
  currentInspTab = idx;
  for (let i = 0; i < 4; i++) {
    const btn = document.getElementById("inspTabBtn" + i);
    if (btn) btn.classList.toggle("active", i === idx);
  }
  renderInspector();
}

function generateLiveCodeSnippetC() {
  const ch0 = simState.channels[0];
  const cbvHex = "0x" + simState.regAByte.toString(16).toUpperCase().padStart(2, "0");
  const nmsHex = "0x" + simState.nmsSignalVal.toString(16).toUpperCase().padStart(2, "0");
  return (
`/* ===== Nm.c (AUTOSAR R22-11/R23-11 Generic NM Interface & Coordinator) ===== */
void Nm_MainFunction(void) { /* Cycle = ${ecucConfig.NmCycletimeMainFunction} ms | ModId = 29 */
  if (!${ecucConfig.NmCanNmInitialized ? "TRUE" : "FALSE"}) { ${ecucConfig.NmDevErrorDetect ? "Det_ReportError(29, 0, NM_SID_MAINFUNCTION, NM_E_UNINIT);" : ""} return; }
  /* CoordinatorState = ${simState.coordState} */
  if (${ecucConfig.NmCoordinatorSupportEnabled ? "TRUE /* NmCoordClusterIndex=0 */" : "FALSE /* Bypass 1:1 */"}) {
    if (Ch0_Released && Ch1_Released && Ch0_RemoteSlp==${ch0.remoteSleepInd ? 1 : 0}) {
      ${ecucConfig.NmSynchronizingNetwork ? "if (!SyncPointDone) return; /* Wait Nm_SynchronizationPoint */" : ""}
      ${ecucConfig.NmActiveCoordinator ? `CanNm_SetSleepReadyBit(0, ${ch0.sleepReadyBit ? "TRUE" : "FALSE"}); /* CBV Bit3 SRB=${ch0.sleepReadyBit ? 1 : 0} */` : "/* Passive Coord: Wait Nm_CoordReadyToSleepIndication() */"}
      NmShutdownDelayTimer = ${simState.coordShutdownDelayLeftMs}U; /* Base=${ecucConfig.NmGlobalCoordinatorTime}ms */
      if (NmShutdownDelayTimer == 0U) { CanNm_NetworkRelease(0); CanNm_NetworkRelease(1); }
    }
  }
}

void Nm_StateChangeNotification(NetworkHandleType nmHandle, Nm_StateType prev, Nm_StateType curr) {
  ${ecucConfig.NmStateReportEnabled ? `uint8 nms = ${nmsHex}; /* ${simState.nmsSignalDesc} */
  Com_SendSignal(${ecucConfig.NmStateReportSignalRef}, &nms); /* SWS_Nm_00154 */` : "/* NmStateReportEnabled = FALSE */"}
  BswM_Nm_StateChangeNotification(nmHandle, curr);
}

/* ===== CanNm.c (CAN Network Management Engine) ===== */
void CanNm_MainFunction(void) { /* Cycle = ${ecucConfig.CanNmMainFunctionPeriod} ms | ModId = 31 */
  /* State=${ch0.canNmState}, Mode=${ch0.canNmMode}, CBV=${cbvHex}, CommDisabled=${simState.commDisabled ? "TRUE" : "FALSE"} */
  if (ch0.RepeatMsgTimer == 0U && ${ch0.nmCoordHold ? "HOLD == TRUE" : "HOLD == FALSE"}) {
    ${ch0.nmCoordHold ? "Transition(NM_STATE_NORMAL_OPERATION);" : "Transition(NM_STATE_READY_SLEEP);"}
  }
  if (!CommDisabled && CanNmMsgCycleTimer == 0U) {
    ${ecucConfig.NmComUserDataSupport ? "PduR_CanNmTriggerTransmit(TxUserDataPduId, &PduInfo); /* Pull COM/NMS */" : "/* Use Nm_SetUserData buffer */"}
    CanIf_Transmit(CanNmTxPduId, &CanPdu); /* NodeId=${ecucConfig.CanNmNodeId}, CBV=${cbvHex} */
  }
}`);
}

function renderInspector() {
  const body = document.getElementById("inspBody");
  if (!body) return;

  if (currentInspTab === 0) {
    const sc = SCENARIOS[currentScenarioIdx];
    const ch0 = simState.channels[0];
    const ch1 = simState.channels[1];
    const detHtml = simState.detFaults.length
      ? "<div class=\"insp-card\" style=\"border-color:var(--err);background:var(--err-bg)\"><div class=\"insp-h\" style=\"color:var(--err)\">🚨 Lỗi DET / Runtime Gần Nhất</div>" +
        simState.detFaults.slice(0, 3).map((d) =>
          "<div style=\"font-size:11px;margin-bottom:3px\"><b class=\"mono\">[" + d.t + "ms] " + escapeHtmlSafe(d.mod) + " (" + d.id + "): " + escapeHtmlSafe(d.code) + "</b> — " + escapeHtmlSafe(d.detail) + "</div>"
        ).join("") + "</div>"
      : "";

    body.innerHTML =
      "<div class=\"insp-card\">" +
        "<div class=\"insp-h\">🔎 Diễn Giải Bước Đang Chạy (" + sc.id + " · Bước " + currentStepIdx + "/" + sc.steps.length + ")</div>" +
        "<p style=\"font-size:11.5px;line-height:1.5;color:var(--txt)\">" + escapeHtmlSafe(simState.stepExplain || sc.summary) + "</p>" +
      "</div>" +
      "<div class=\"insp-card\">" +
        "<div class=\"insp-h\">⚖️ So Sánh Nhanh Trạng Thái Nm &amp; CanNm</div>" +
        "<div style=\"font-size:11px;line-height:1.55;color:var(--txt-soft)\">" +
          "<div>• <b>Nm Coordinator</b>: <span class=\"mono\" style=\"color:var(--pri)\">" + simState.coordState + "</span> (Timer: " + simState.coordShutdownDelayLeftMs + " ms)</div>" +
          "<div>• <b>CanNm Ch0</b>: <span class=\"mono\" style=\"color:var(--ok)\">" + ch0.canNmState + "</span> | CBV=<b class=\"mono\">0x" + simState.regAByte.toString(16).toUpperCase().padStart(2, "0") + "</b></div>" +
          "<div>• <b>CanNm Ch1</b>: <span class=\"mono\">" + ch1.canNmState + "</span> | RemoteSlp=" + (ch1.remoteSleepInd ? "TRUE" : "FALSE") + "</div>" +
          "<div>• <b>NmStateReport (COM Byte 4)</b>: <span class=\"mono\" style=\"color:var(--cyan)\">" + simState.nmsSignalDesc + "</span></div>" +
        "</div>" +
      "</div>" +
      detHtml;
  } else if (currentInspTab === 1) {
    const keys = Object.keys(MODULES_INFO);
    const pills = "<div class=\"mod-list\">" + keys.map((k) =>
      "<button class=\"mod-pill " + (k === selectedModuleId ? "active" : "") + "\" onclick=\"selectModule('" + k + "')\">" + k.replace("MOD_", "") + "</button>"
    ).join("") + "</div>";
    const info = MODULES_INFO[selectedModuleId] || MODULES_INFO.MOD_NM;
    body.innerHTML = pills +
      "<div class=\"insp-card\">" +
        "<div class=\"insp-h\">🧩 " + escapeHtmlSafe(info.name) + "</div>" +
        "<div style=\"font-size:10.5px;color:var(--cyan);font-weight:700;margin-bottom:6px\">" + escapeHtmlSafe(info.layer) + "</div>" +
        "<div style=\"font-size:11.5px;margin-bottom:5px\"><b>Vai trò:</b> " + escapeHtmlSafe(info.role) + "</div>" +
        "<div style=\"font-size:11.5px;margin-bottom:5px\"><b>📥 Input:</b> " + escapeHtmlSafe(info.inputs) + "</div>" +
        "<div style=\"font-size:11.5px;margin-bottom:5px;white-space:pre-line\"><b>⚙️ Xử lý:</b> " + escapeHtmlSafe(info.processing) + "</div>" +
        "<div style=\"font-size:11.5px;margin-bottom:5px\"><b>📤 Output:</b> " + escapeHtmlSafe(info.outputs) + "</div>" +
      "</div>" +
      "<div class=\"insp-card\"><div class=\"insp-h\">📌 API AUTOSAR Chuẩn</div><ul style=\"padding-left:16px;font-size:11px\">" +
        info.apis.map((a) => "<li class=\"mono\" style=\"margin-bottom:3px\">" + escapeHtmlSafe(a) + "</li>").join("") +
      "</ul></div>";
  } else if (currentInspTab === 2) {
    body.innerHTML =
      "<div class=\"insp-card\"><div class=\"insp-h\">📄 Live Embedded Code C (`Nm.c` &amp; `CanNm.c`)</div>" +
      "<pre class=\"code-block mono\">" + escapeHtmlSafe(generateLiveCodeSnippetC()) + "</pre></div>";
  } else {
    body.innerHTML = simState.traceLogs.map((l) =>
      "<div class=\"trace-item " + escapeHtmlSafe(l.level) + "\">" +
        "<div style=\"display:flex;justify-content:space-between;gap:6px;margin-bottom:2px\">" +
          "<strong class=\"mono\" style=\"font-size:10.5px;color:var(--pri)\">" + escapeHtmlSafe(l.api) + "</strong>" +
          "<span class=\"mono\" style=\"font-size:10px;color:var(--mut)\">" + l.t + " ms</span>" +
        "</div>" +
        "<div style=\"font-size:11px;color:var(--txt-soft)\">" + escapeHtmlSafe(l.detail) + "</div>" +
      "</div>"
    ).join("");
  }
}

function renderAll() {
  renderHeaderAndQuickActions();
  renderClusterAndPdu();
  render8BitRegisters();
  renderTimers();
  renderStateMachines();
  renderSvgArchitecture();
  renderInspector();
}

// -------------------- TABS, VIEW SWITCH, THEME & TOOLTIP (>1S HOVER) --------------------

function switchCfgTab(idx) {
  for (let i = 0; i < 6; i++) {
    const btn = document.getElementById("cfgTabBtn" + i);
    const pane = document.getElementById("cfgPane" + i);
    if (btn) btn.classList.toggle("active", i === idx);
    if (pane) pane.classList.toggle("hidden", i !== idx);
  }
}

function switchMainView(v) {
  const isHb = (v === "hb");
  document.getElementById("viewSim").classList.toggle("hidden", isHb);
  document.getElementById("viewHb").classList.toggle("hidden", !isHb);
  document.getElementById("btnViewSim").classList.toggle("active", !isHb);
  document.getElementById("btnViewHb").classList.toggle("active", isHb);
  if (isHb && typeof renderHandbook === "function") {
    renderHandbook();
  }
}

function toggleTheme() {
  const root = document.documentElement;
  const cur = root.getAttribute("data-theme") || "dark";
  const next = (cur === "dark") ? "light" : "dark";
  root.setAttribute("data-theme", next);
  const btn = document.getElementById("btnTheme");
  if (btn) btn.textContent = (next === "dark") ? "☀️ Light Mode" : "🌙 Dark Mode";
}

function showTooltipForElement(rowEl, key) {
  const data = configTooltipData[key];
  const popup = document.getElementById("cfgTooltipPopup");
  if (!data || !popup) return;

  popup.innerHTML =
    "<div class=\"tt-hdr\">" +
      "<div class=\"tt-title\">📘 " + escapeHtmlSafe(data.title) + "</div>" +
      "<div class=\"tt-meta mono\">" + escapeHtmlSafe(data.sws) + "</div>" +
    "</div>" +
    "<div class=\"tt-sec mono\" style=\"font-size:10px;color:var(--mut)\">" + escapeHtmlSafe(data.ecucPath) + "</div>" +
    "<div class=\"tt-sec\"><b>Vai trò &amp; Phối hợp:</b> " + escapeHtmlSafe(data.role) + "</div>" +
    "<div class=\"tt-sec\"><b>Cơ chế hoạt động:</b> " + escapeHtmlSafe(data.mechanism) + "</div>" +
    "<div class=\"tt-sec\"><b>Dải giá trị:</b> <span class=\"mono\">" + escapeHtmlSafe(data.range) + "</span></div>" +
    "<div class=\"tt-sec\" style=\"color:var(--cyan)\"><b>💡 Ảnh hưởng mô phỏng:</b> " + escapeHtmlSafe(data.scenarioImpact) + "</div>";

  const rect = rowEl.getBoundingClientRect();
  popup.classList.add("show");
  const popW = popup.offsetWidth || 395;
  const popH = popup.offsetHeight || 220;
  let left = rect.right + 10;
  if (left + popW > window.innerWidth - 12) {
    left = Math.max(12, rect.left - popW - 10);
  }
  let top = Math.min(window.innerHeight - popH - 12, Math.max(12, rect.top));
  popup.style.left = left + "px";
  popup.style.top = top + "px";
}

function hideTooltipPopup() {
  clearTimeout(tooltipShowTimer);
  const popup = document.getElementById("cfgTooltipPopup");
  if (popup) popup.classList.remove("show");
}

function initTooltipHandlers() {
  document.querySelectorAll(".cfg-row[data-cfg-key]").forEach((row) => {
    const key = row.getAttribute("data-cfg-key");
    row.addEventListener("mouseenter", () => {
      clearTimeout(tooltipHideTimer);
      clearTimeout(tooltipShowTimer);
      tooltipShowTimer = setTimeout(() => showTooltipForElement(row, key), 1000);
    });
    row.addEventListener("mouseleave", () => {
      clearTimeout(tooltipShowTimer);
      tooltipHideTimer = setTimeout(hideTooltipPopup, 140);
    });
    const icon = row.querySelector(".cfg-i");
    if (icon) {
      icon.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        clearTimeout(tooltipShowTimer);
        showTooltipForElement(row, key);
      });
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { hideTooltipPopup(); closeExportModal(); }
  });
}

// -------------------- EXPORT ARXML / NM_CFG.H / CANNM_CFG.H / LCFG.C / JSON / HTML --------------------

function generateArxmlContent() {
  const b = (v) => (v ? "true" : "false");
  return `<?xml version="1.0" encoding="UTF-8"?>
<AUTOSAR xmlns="http://autosar.org/schema/r4.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://autosar.org/schema/r4.0 AUTOSAR_00051.xsd">
  <AR-PACKAGES>
    <AR-PACKAGE>
      <SHORT-NAME>EcucConfig_Nm_CanNm</SHORT-NAME>
      <ELEMENTS>
        <ECUC-MODULE-CONFIGURATION-VALUES>
          <SHORT-NAME>Nm</SHORT-NAME>
          <DEFINITION-REF DEST="ECUC-MODULE-DEF">/AUTOSAR/EcucDefs/Nm</DEFINITION-REF>
          <CONTAINERS>
            <ECUC-CONTAINER-VALUE>
              <SHORT-NAME>NmGlobalConfig</SHORT-NAME>
              <PARAMETER-VALUES>
                <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-BOOLEAN-PARAM-DEF">/AUTOSAR/EcucDefs/Nm/NmGlobalConfig/NmGlobalFeatures/NmCoordinatorSupportEnabled</DEFINITION-REF><VALUE>${b(ecucConfig.NmCoordinatorSupportEnabled)}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
                <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-FLOAT-PARAM-DEF">/AUTOSAR/EcucDefs/Nm/NmGlobalConfig/NmGlobalProperties/NmCycletimeMainFunction</DEFINITION-REF><VALUE>${(ecucConfig.NmCycletimeMainFunction / 1000).toFixed(3)}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
                <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-FLOAT-PARAM-DEF">/AUTOSAR/EcucDefs/Nm/NmGlobalConfig/NmGlobalFeatures/NmGlobalCoordinatorTime</DEFINITION-REF><VALUE>${(ecucConfig.NmGlobalCoordinatorTime / 1000).toFixed(3)}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
                <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-BOOLEAN-PARAM-DEF">/AUTOSAR/EcucDefs/Nm/NmGlobalConfig/NmGlobalFeatures/NmStateChangeIndEnabled</DEFINITION-REF><VALUE>${b(ecucConfig.NmStateChangeIndEnabled)}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
                <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-BOOLEAN-PARAM-DEF">/AUTOSAR/EcucDefs/Nm/NmGlobalConfig/NmGlobalFeatures/NmRemoteSleepIndEnabled</DEFINITION-REF><VALUE>${b(ecucConfig.NmRemoteSleepIndEnabled)}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
                <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-BOOLEAN-PARAM-DEF">/AUTOSAR/EcucDefs/Nm/NmGlobalConfig/NmGlobalFeatures/NmSynchronizedPncShutdownEnabled</DEFINITION-REF><VALUE>${b(ecucConfig.NmSynchronizedPncShutdownEnabled)}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
              </PARAMETER-VALUES>
            </ECUC-CONTAINER-VALUE>
            <ECUC-CONTAINER-VALUE>
              <SHORT-NAME>NmChannel_Ch0_CAN_Body</SHORT-NAME>
              <PARAMETER-VALUES>
                <ECUC-TEXTUAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-ENUMERATION-PARAM-DEF">/AUTOSAR/EcucDefs/Nm/NmChannelConfig/NmBusType</DEFINITION-REF><VALUE>${ecucConfig.NmBusType}</VALUE></ECUC-TEXTUAL-PARAM-VALUE>
                <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-BOOLEAN-PARAM-DEF">/AUTOSAR/EcucDefs/Nm/NmChannelConfig/NmActiveCoordinator</DEFINITION-REF><VALUE>${b(ecucConfig.NmActiveCoordinator)}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
                <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-BOOLEAN-PARAM-DEF">/AUTOSAR/EcucDefs/Nm/NmChannelConfig/NmSynchronizingNetwork</DEFINITION-REF><VALUE>${b(ecucConfig.NmSynchronizingNetwork)}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
                <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-BOOLEAN-PARAM-DEF">/AUTOSAR/EcucDefs/Nm/NmChannelConfig/NmStateReportEnabled</DEFINITION-REF><VALUE>${b(ecucConfig.NmStateReportEnabled)}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
                <ECUC-TEXTUAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-STRING-PARAM-DEF">/AUTOSAR/EcucDefs/Nm/NmChannelConfig/NmStateReportSignalRef</DEFINITION-REF><VALUE>${ecucConfig.NmStateReportSignalRef}</VALUE></ECUC-TEXTUAL-PARAM-VALUE>
              </PARAMETER-VALUES>
            </ECUC-CONTAINER-VALUE>
          </CONTAINERS>
        </ECUC-MODULE-CONFIGURATION-VALUES>
        <ECUC-MODULE-CONFIGURATION-VALUES>
          <SHORT-NAME>CanNm</SHORT-NAME>
          <DEFINITION-REF DEST="ECUC-MODULE-DEF">/AUTOSAR/EcucDefs/CanNm</DEFINITION-REF>
          <CONTAINERS>
            <ECUC-CONTAINER-VALUE>
              <SHORT-NAME>CanNmChannelConfig_Ch0</SHORT-NAME>
              <PARAMETER-VALUES>
                <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-FLOAT-PARAM-DEF">/AUTOSAR/EcucDefs/CanNm/CanNmGlobalConfig/CanNmChannelConfig/CanNmMsgCycleTime</DEFINITION-REF><VALUE>${(ecucConfig.CanNmMsgCycleTime / 1000).toFixed(3)}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
                <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-FLOAT-PARAM-DEF">/AUTOSAR/EcucDefs/CanNm/CanNmGlobalConfig/CanNmChannelConfig/CanNmTimeoutTime</DEFINITION-REF><VALUE>${(ecucConfig.CanNmTimeoutTime / 1000).toFixed(3)}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
                <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-FLOAT-PARAM-DEF">/AUTOSAR/EcucDefs/CanNm/CanNmGlobalConfig/CanNmChannelConfig/CanNmRepeatMessageTime</DEFINITION-REF><VALUE>${(ecucConfig.CanNmRepeatMessageTime / 1000).toFixed(3)}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
                <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-FLOAT-PARAM-DEF">/AUTOSAR/EcucDefs/CanNm/CanNmGlobalConfig/CanNmChannelConfig/CanNmWaitBusSleepTime</DEFINITION-REF><VALUE>${(ecucConfig.CanNmWaitBusSleepTime / 1000).toFixed(3)}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
                <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-FLOAT-PARAM-DEF">/AUTOSAR/EcucDefs/CanNm/CanNmGlobalConfig/CanNmChannelConfig/CanNmRemoteSleepIndTime</DEFINITION-REF><VALUE>${(ecucConfig.CanNmRemoteSleepIndTime / 1000).toFixed(3)}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
                <ECUC-TEXTUAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-ENUMERATION-PARAM-DEF">/AUTOSAR/EcucDefs/CanNm/CanNmGlobalConfig/CanNmChannelConfig/CanNmPduNidPosition</DEFINITION-REF><VALUE>${ecucConfig.CanNmPduNidPosition}</VALUE></ECUC-TEXTUAL-PARAM-VALUE>
                <ECUC-TEXTUAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-ENUMERATION-PARAM-DEF">/AUTOSAR/EcucDefs/CanNm/CanNmGlobalConfig/CanNmChannelConfig/CanNmPduCbvPosition</DEFINITION-REF><VALUE>${ecucConfig.CanNmPduCbvPosition}</VALUE></ECUC-TEXTUAL-PARAM-VALUE>
                <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-BOOLEAN-PARAM-DEF">/AUTOSAR/EcucDefs/CanNm/CanNmGlobalConfig/CanNmChannelConfig/CanNmPnEnabled</DEFINITION-REF><VALUE>${b(ecucConfig.CanNmPnEnabled)}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
              </PARAMETER-VALUES>
            </ECUC-CONTAINER-VALUE>
          </CONTAINERS>
        </ECUC-MODULE-CONFIGURATION-VALUES>
      </ELEMENTS>
    </AR-PACKAGE>
  </AR-PACKAGES>
</AUTOSAR>`;
}

function generateNmCfgH() {
  const sw = (v) => (v ? "STD_ON" : "STD_OFF");
  return `/* AUTOSAR Classic R22-11/R23-11 Nm_Cfg.h — Auto-Generated */
#ifndef NM_CFG_H
#define NM_CFG_H

#define NM_DEV_ERROR_DETECT                  ${sw(ecucConfig.NmDevErrorDetect)}
#define NM_PASSIVE_MODE_ENABLED              ${sw(ecucConfig.NmPassiveModeEnabled)}
#define NM_STATE_CHANGE_IND_ENABLED          ${sw(ecucConfig.NmStateChangeIndEnabled)}
#define NM_STATE_REPORT_ENABLED              ${sw(ecucConfig.NmStateReportEnabled)}
#define NM_COORDINATOR_SUPPORT_ENABLED       ${sw(ecucConfig.NmCoordinatorSupportEnabled)}
#define NM_REMOTE_SLEEP_IND_ENABLED          ${sw(ecucConfig.NmRemoteSleepIndEnabled)}
#define NM_NODE_ID_ENABLED                   ${sw(ecucConfig.NmNodeIdEnabled)}
#define NM_NODE_DETECTION_ENABLED            ${sw(ecucConfig.NmNodeDetectionEnabled)}
#define NM_REPEAT_MSG_IND_ENABLED            ${sw(ecucConfig.NmRepeatMsgIndEnabled)}
#define NM_PDU_RX_INDICATION_ENABLED         ${sw(ecucConfig.NmPduRxIndicationEnabled)}
#define NM_BUS_LOAD_REDUCTION_ENABLED        ${sw(ecucConfig.NmBusLoadReductionEnabled)}
#define NM_COM_USER_DATA_SUPPORT             ${sw(ecucConfig.NmComUserDataSupport)}
#define NM_COM_CONTROL_ENABLED               ${sw(ecucConfig.NmComControlEnabled)}
#define NM_CAR_WAKE_UP_RX_ENABLED            ${sw(ecucConfig.NmCarWakeUpRxEnabled)}
#define NM_SYNCHRONIZED_PNC_SHUTDOWN_ENABLED ${sw(ecucConfig.NmSynchronizedPncShutdownEnabled)}

#define NM_CYCLETIME_MAINFUNCTION_MS         (${ecucConfig.NmCycletimeMainFunction}U)
#define NM_GLOBAL_COORDINATOR_TIME_MS        (${ecucConfig.NmGlobalCoordinatorTime}U)
#define NM_NUMBER_OF_CHANNELS                (2U)

#endif /* NM_CFG_H */`;
}

function generateCanNmCfgH() {
  const sw = (v) => (v ? "STD_ON" : "STD_OFF");
  return `/* AUTOSAR Classic R22-11/R23-11 CanNm_Cfg.h — Auto-Generated */
#ifndef CANNM_CFG_H
#define CANNM_CFG_H

#define CANNM_DEV_ERROR_DETECT                  ${sw(ecucConfig.NmDevErrorDetect)}
#define CANNM_PASSIVE_MODE_ENABLED              ${sw(ecucConfig.NmPassiveModeEnabled)}
#define CANNM_STATE_CHANGE_IND_ENABLED          ${sw(ecucConfig.NmStateChangeIndEnabled)}
#define CANNM_REMOTE_SLEEP_IND_ENABLED          ${sw(ecucConfig.NmRemoteSleepIndEnabled)}
#define CANNM_NODE_ID_ENABLED                   ${sw(ecucConfig.NmNodeIdEnabled)}
#define CANNM_NODE_DETECTION_ENABLED            ${sw(ecucConfig.NmNodeDetectionEnabled)}
#define CANNM_IMMEDIATE_RESTART_ENABLED         ${sw(ecucConfig.CanNmImmediateRestartEnabled)}
#define CANNM_BUS_LOAD_REDUCTION_ENABLED        ${sw(ecucConfig.NmBusLoadReductionEnabled)}
#define CANNM_COM_USER_DATA_SUPPORT             ${sw(ecucConfig.NmComUserDataSupport)}
#define CANNM_COM_CONTROL_ENABLED               ${sw(ecucConfig.NmComControlEnabled)}
#define CANNM_PN_ENABLED                        ${sw(ecucConfig.CanNmPnEnabled)}
#define CANNM_CAR_WAKEUP_RX_ENABLED             ${sw(ecucConfig.NmCarWakeUpRxEnabled)}
#define CANNM_CAR_WAKEUP_FILTER_ENABLED         ${sw(ecucConfig.CanNmCarWakeUpFilterEnabled)}
#define CANNM_SYNCHRONIZED_PNC_SHUTDOWN_ENABLED ${sw(ecucConfig.NmSynchronizedPncShutdownEnabled)}

#define CANNM_MAIN_FUNCTION_PERIOD_MS           (${ecucConfig.CanNmMainFunctionPeriod}U)
#define CANNM_PN_RESET_TIME_MS                  (${ecucConfig.CanNmPnResetTime}U)
#define CANNM_NUMBER_OF_CHANNELS                (2U)

#endif /* CANNM_CFG_H */`;
}

function generateLcfgC() {
  return `/* Nm_CanNm_Lcfg.c — Combined Link-Time Configuration */
#include "Nm.h"
#include "CanNm.h"

const Nm_ConfigType Nm_Config = {
  .CoordinatorCluster0Channels = { 0U, 1U },
  .ActiveCoordinatorCh0        = ${ecucConfig.NmActiveCoordinator ? "TRUE" : "FALSE"},
  .ChannelSleepMasterCh1       = ${ecucConfig.NmChannelSleepMaster ? "TRUE" : "FALSE"},
  .SynchronizingNetworkCh0     = ${ecucConfig.NmSynchronizingNetwork ? "TRUE" : "FALSE"},
  .StateReportSignalId         = ${ecucConfig.NmStateReportSignalRef},
  .BusTypeCh0                  = ${ecucConfig.NmBusType}
};

const CanNm_ChannelConfigType CanNm_ChannelConfig[CANNM_NUMBER_OF_CHANNELS] = {
  { /* Ch0: CAN_Body */
    .NodeId                = ${ecucConfig.CanNmNodeId},
    .BaseCanId             = ${ecucConfig.CanNmBaseCanId},
    .MsgCycleTimeMs        = ${ecucConfig.CanNmMsgCycleTime}U,
    .MsgCycleOffsetMs      = ${ecucConfig.CanNmMsgCycleOffset}U,
    .RepeatMessageTimeMs   = ${ecucConfig.CanNmRepeatMessageTime}U,
    .TimeoutTimeMs         = ${ecucConfig.CanNmTimeoutTime}U,
    .WaitBusSleepTimeMs    = ${ecucConfig.CanNmWaitBusSleepTime}U,
    .RemoteSleepIndTimeMs  = ${ecucConfig.CanNmRemoteSleepIndTime}U,
    .MsgTimeoutTimeMs      = ${ecucConfig.CanNmMsgTimeoutTime}U,
    .ImmediateNmTxCount    = ${ecucConfig.CanNmImmediateNmTransmissions}U,
    .ImmediateNmCycleMs    = ${ecucConfig.CanNmImmediateNmCycleTime}U,
    .PduNidPosition        = ${ecucConfig.CanNmPduNidPosition},
    .PduCbvPosition        = ${ecucConfig.CanNmPduCbvPosition},
    .ActiveWakeupBit       = ${ecucConfig.CanNmActiveWakeupBitEnabled ? "TRUE" : "FALSE"},
    .CarWakeUpFilterNodeId = ${ecucConfig.CanNmCarWakeUpFilterNodeId}
  }
};`;
}

function getExportContent(tabIdx) {
  if (tabIdx === 0) return generateArxmlContent();
  if (tabIdx === 1) return generateNmCfgH();
  if (tabIdx === 2) return generateCanNmCfgH();
  if (tabIdx === 3) return generateLcfgC();
  return JSON.stringify(ecucConfig, null, 2);
}

function getExportFileName(tabIdx) {
  return ["Nm_CanNm.arxml", "Nm_Cfg.h", "CanNm_Cfg.h", "Nm_CanNm_Lcfg.c", "Nm_CanNm_Config.json"][tabIdx] || "export.txt";
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
  for (let i = 0; i < 5; i++) {
    const b = document.getElementById("expTab" + i);
    if (b) b.className = (i === idx) ? "btn btn-sm btn-pri" : "btn btn-sm";
  }
  document.getElementById("exportCodeArea").textContent = getExportContent(idx);
}

function copyExportCode() {
  const txt = document.getElementById("exportCodeArea").textContent;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(txt).catch(() => {});
  }
}

function triggerFileDownload(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType || "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 200);
}

function downloadExportCode() {
  triggerFileDownload(getExportFileName(currentExportTab), getExportContent(currentExportTab), "text/plain;charset=utf-8");
}

function downloadStandaloneHTML() {
  const htmlDoc = "<!DOCTYPE html>\n" + document.documentElement.outerHTML;
  triggerFileDownload("AUTOSAR_Nm_CanNm.html", htmlDoc, "text/html;charset=utf-8");
}
