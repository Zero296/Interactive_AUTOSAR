// ================= PART 5: UI RENDERERS, TOOLTIPS (>1S), SVG ANIMATION & EXPORTS =================

const uiState = {
  mainView: "sim",
  theme: "dark",
  cfgTab: 0,
  inspTab: 0,
  exportTab: 0,
  selectedMod: "MOD_CANIF",
  scenarioId: "S1",
  stepIndex: 0,
  snapshots: [],
  autoPlayTimer: null,
  tooltipTimer: null,
  activeTooltipKey: null
};

function escHtml(str) {
  return String(str === undefined || str === null ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getCurrentScenario() {
  return SCENARIOS.find(s => s.id === uiState.scenarioId) || SCENARIOS[0];
}

function cloneSnapshot() {
  return {
    cfg: Object.assign({}, cfg),
    sim: JSON.parse(JSON.stringify(sim)),
    selectedMod: uiState.selectedMod
  };
}

function restoreSnapshot(snap) {
  if (!snap) return;
  cfg = Object.assign({}, snap.cfg);
  sim = JSON.parse(JSON.stringify(snap.sim));
  uiState.selectedMod = snap.selectedMod || "MOD_CANIF";
  syncInputsFromConfig();
}

function loadScenario(scenId) {
  stopAutoPlay();
  uiState.scenarioId = scenId || "S1";
  const sc = getCurrentScenario();
  cfg = Object.assign({}, defaultConfig);
  if (typeof sc.setup === "function") sc.setup();
  sim = createInitialSimState();
  uiState.stepIndex = 0;
  uiState.selectedMod = "MOD_CANIF";
  uiState.snapshots = [cloneSnapshot()];
  const sel = document.getElementById("scenSelect");
  if (sel) sel.value = uiState.scenarioId;
  syncInputsFromConfig();
  renderAll();
}

function resetCurrentScenario() {
  loadScenario(uiState.scenarioId);
}

function onScenarioSelectChange() {
  const sel = document.getElementById("scenSelect");
  if (sel) loadScenario(sel.value);
}

function nextScenarioStep() {
  const sc = getCurrentScenario();
  if (uiState.stepIndex >= sc.steps.length) {
    stopAutoPlay();
    return;
  }
  const stepObj = sc.steps[uiState.stepIndex];
  if (stepObj && typeof stepObj.exec === "function") {
    stepObj.exec();
  }
  uiState.stepIndex += 1;
  uiState.snapshots[uiState.stepIndex] = cloneSnapshot();
  syncInputsFromConfig();
  renderAll();
  if (uiState.stepIndex >= sc.steps.length) stopAutoPlay();
}

function prevScenarioStep() {
  stopAutoPlay();
  if (uiState.stepIndex <= 0) return;
  uiState.stepIndex -= 1;
  restoreSnapshot(uiState.snapshots[uiState.stepIndex]);
  renderAll();
}

function stopAutoPlay() {
  if (uiState.autoPlayTimer) {
    clearInterval(uiState.autoPlayTimer);
    uiState.autoPlayTimer = null;
  }
  const btn = document.getElementById("btnAutoPlay");
  if (btn) btn.textContent = "▶ Tự Chạy";
}

function toggleScenarioAutoPlay() {
  if (uiState.autoPlayTimer) {
    stopAutoPlay();
    return;
  }
  const sc = getCurrentScenario();
  if (uiState.stepIndex >= sc.steps.length) loadScenario(uiState.scenarioId);
  const btn = document.getElementById("btnAutoPlay");
  if (btn) btn.textContent = "⏸ Tạm Dừng";
  uiState.autoPlayTimer = setInterval(() => {
    const cur = getCurrentScenario();
    if (uiState.stepIndex >= cur.steps.length) {
      stopAutoPlay();
      return;
    }
    nextScenarioStep();
  }, 1500);
}

// ==================== VIEW & THEME SWITCHING ====================

function switchMainView(v) {
  uiState.mainView = v === "hb" ? "hb" : "sim";
  const viewSim = document.getElementById("viewSim");
  const viewHb = document.getElementById("viewHb");
  const bSim = document.getElementById("btnViewSim");
  const bHb = document.getElementById("btnViewHb");
  if (viewSim) viewSim.classList.toggle("hidden", uiState.mainView !== "sim");
  if (viewHb) viewHb.classList.toggle("hidden", uiState.mainView !== "hb");
  if (bSim) bSim.classList.toggle("active", uiState.mainView === "sim");
  if (bHb) bHb.classList.toggle("active", uiState.mainView === "hb");
  hideCfgTooltip();
  if (uiState.mainView === "hb" && typeof renderCurrentHandbookView === "function") {
    renderCurrentHandbookView();
  }
}

function toggleTheme() {
  uiState.theme = uiState.theme === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", uiState.theme === "light" ? "light" : "");
  const btn = document.getElementById("btnTheme");
  if (btn) btn.textContent = uiState.theme === "light" ? "🌙 Dark Mode" : "☀️ Light Mode";
}

// ==================== ECUC INPUT SYNC & VALIDATION ====================

function syncInputsFromConfig() {
  Object.keys(defaultConfig).forEach(key => {
    const el = document.getElementById("cfg_" + key);
    if (!el) return;
    if (el.type === "checkbox") {
      el.checked = Boolean(cfg[key]);
    } else {
      el.value = String(cfg[key] !== undefined ? cfg[key] : defaultConfig[key]);
    }
  });
  const qaTx = document.getElementById("qaTxPduSelect");
  if (qaTx) qaTx.value = String(cfg.SelectedTxPduId);
  const qaRx = document.getElementById("qaRxProfileSelect");
  if (qaRx) qaRx.value = String(cfg.SelectedRxPduProfile);
}

function onConfigInputChanged(key) {
  const el = document.getElementById("cfg_" + key);
  if (!el) return;
  if (el.type === "checkbox") {
    cfg[key] = Boolean(el.checked);
  } else if (el.type === "number") {
    cfg[key] = Number(el.value);
  } else {
    cfg[key] = el.value;
  }

  // Synchronize runtime sim mirrors when user directly tweaks state-mirror ECUC fields
  if (key === "ActiveControllerMode") sim.ctrlMode = cfg[key];
  else if (key === "ActivePduMode") sim.pduMode = cfg[key];
  else if (key === "ActiveTransceiverMode") sim.trcvMode = cfg[key];
  else if (key === "CanIfPnFilterEnabled") sim.pnFilterActive = Boolean(cfg[key]);
  else if (key === "ActiveBaudRateConfigID") sim.baudrateConfigId = Number(cfg[key]) || 0;
  else if (key === "SelectedTxPduId") {
    const base = TX_PDUS[String(cfg.SelectedTxPduId)];
    if (base) {
      cfg.CanIfTxPduCanIdType = base.idType;
      cfg.CanIfHthHandleType = base.hthType;
      cfg.CanIfTxPduPnFilterPdu = base.pnFilterPdu;
      cfg.TxRxPayloadPreviewHex = base.defaultPayload;
      syncInputsFromConfig();
    }
  } else if (key === "SelectedRxPduProfile") {
    const prof = RX_PROFILES[cfg.SelectedRxPduProfile];
    if (prof) {
      cfg.CanIfRxPduCanIdMaskHex = prof.mask;
      cfg.CanIfRxPduDataLength = prof.minDlc;
      cfg.InjectedRxDlcLength = prof.dlc;
      cfg.CanIfRxPduUserRxIndicationUL = prof.ul;
      cfg.CanIfHrhHandleType = prof.hrhType;
      syncInputsFromConfig();
    }
  } else if (key === "CustomDynamicCanIdHex") {
    sim.dynamicCanId = parseHexNum(cfg.CustomDynamicCanIdHex, 0x18FEF100);
  }

  const pdu = getEffectiveTxPdu(cfg.SelectedTxPduId);
  sim.lastDecodedCanId32 = pdu.encodedCanId;
  sim.lastFrameFlags.isExt = pdu.idType.indexOf("EXTENDED") === 0;
  sim.lastFrameFlags.isFd = pdu.idType.indexOf("FD") >= 0;
  sim.lastFrameFlags.isBasicHoh = (cfg.CanIfHthHandleType || pdu.hthType) === "BASIC";
  updateRegistersAfter();
  renderAll();
}

function switchCfgTab(idx) {
  uiState.cfgTab = idx;
  for (let i = 0; i < 6; i++) {
    const b = document.getElementById("cfgTabBtn" + i);
    const p = document.getElementById("cfgPane" + i);
    if (b) b.classList.toggle("active", i === idx);
    if (p) p.classList.toggle("hidden", i !== idx);
  }
}

function onQaTargetChanged(which) {
  if (which === "tx") {
    const sel = document.getElementById("qaTxPduSelect");
    if (sel) {
      cfg.SelectedTxPduId = sel.value;
      const base = TX_PDUS[sel.value];
      if (base) {
        cfg.CanIfTxPduCanIdType = base.idType;
        cfg.CanIfHthHandleType = base.hthType;
        cfg.CanIfTxPduPnFilterPdu = base.pnFilterPdu;
        cfg.TxRxPayloadPreviewHex = base.defaultPayload;
      }
      syncInputsFromConfig();
      const pdu = getEffectiveTxPdu(sel.value);
      sim.lastDecodedCanId32 = pdu.encodedCanId;
      sim.lastFrameFlags.isExt = pdu.idType.indexOf("EXTENDED") === 0;
      sim.lastFrameFlags.isFd = pdu.idType.indexOf("FD") >= 0;
      sim.lastFrameFlags.isBasicHoh = pdu.hthType === "BASIC";
      updateRegistersAfter();
      renderAll();
    }
  } else if (which === "rx") {
    const sel = document.getElementById("qaRxProfileSelect");
    if (sel) {
      cfg.SelectedRxPduProfile = sel.value;
      const prof = RX_PROFILES[sel.value];
      if (prof) {
        cfg.CanIfRxPduCanIdMaskHex = prof.mask;
        cfg.CanIfRxPduDataLength = prof.minDlc;
        cfg.InjectedRxDlcLength = prof.dlc;
        cfg.CanIfRxPduUserRxIndicationUL = prof.ul;
        cfg.CanIfHrhHandleType = prof.hrhType;
      }
      syncInputsFromConfig();
      renderAll();
    }
  }
}

// ==================== QUICK ACTIONS & HW ISR TRIGGERS ====================

function qaCanIfTransmit() {
  api_CanIf_Transmit(null, { allowInvalidTest: true });
  syncInputsFromConfig();
  renderAll();
}

function qaCanIfTxConfirmation() {
  api_CanIf_TxConfirmation();
  syncInputsFromConfig();
  renderAll();
}

function qaCanIfRxIndication() {
  api_CanIf_RxIndication();
  syncInputsFromConfig();
  renderAll();
}

function qaCycleControllerMode() {
  const m = sim.ctrlMode;
  if (m === "CAN_CS_STARTED") api_CanIf_SetControllerMode("CAN_CS_STOPPED");
  else if (m === "CAN_CS_STOPPED") api_CanIf_SetControllerMode("CAN_CS_SLEEP");
  else if (m === "CAN_CS_SLEEP") api_CanIf_SetControllerMode("CAN_CS_STOPPED");
  else api_CanIf_SetControllerMode("CAN_CS_STARTED");
  syncInputsFromConfig();
  renderAll();
}

function qaCyclePduMode() {
  const order = ["CANIF_ONLINE", "CANIF_TX_OFFLINE", "CANIF_TX_OFFLINE_ACTIVE", "CANIF_OFFLINE"];
  const idx = order.indexOf(sim.pduMode);
  const next = order[(idx + 1) % order.length];
  if (sim.ctrlMode !== "CAN_CS_STARTED" && next === "CANIF_ONLINE") {
    api_CanIf_SetControllerMode("CAN_CS_STARTED");
  }
  api_CanIf_SetPduMode(next);
  syncInputsFromConfig();
  renderAll();
}

function qaSetDynamicTxId() {
  const cur = parseHexNum(cfg.CustomDynamicCanIdHex, 0x18FEF100);
  const next = cur === 0x18FEF100 ? 0x18DAFA10 : (cur === 0x18DAFA10 ? 0x18FEF233 : 0x18FEF100);
  api_CanIf_SetDynamicTxId(next);
  syncInputsFromConfig();
  renderAll();
}

function qaWakeupAndValidate() {
  if (!sim.wakeupDetected) {
    api_CanIf_CheckWakeup();
  } else if (!sim.firstValidRxReceived) {
    if (sim.ctrlMode !== "CAN_CS_STARTED") {
      if (sim.ctrlMode === "CAN_CS_SLEEP") api_CanIf_SetControllerMode("CAN_CS_STOPPED");
      api_CanIf_SetControllerMode("CAN_CS_STARTED");
    }
    if (sim.pduMode === "CANIF_OFFLINE") api_CanIf_SetPduMode("CANIF_ONLINE");
    api_CanIf_RxIndication("FRAME_C", { forceDlc: 8 });
    api_CanIf_CheckValidation();
  } else {
    api_CanIf_ClearTrcvWufFlag();
    sim.wakeupDetected = false;
    sim.firstValidRxReceived = false;
    sim.wakeupValidated = false;
    api_CanIf_CheckWakeup();
  }
  syncInputsFromConfig();
  renderAll();
}

function onFaultKindChange() {
  const sel = document.getElementById("qaFaultKind");
  const lbl = document.getElementById("qaTxtFaultKind");
  if (!sel || !lbl) return;
  const map = {
    TOGGLE_HTH_BUSY: "BUSY",
    BUS_OFF: "BUSOFF",
    SHORT_DLC: "DLC 0x32",
    TOGGLE_PN_FILT: "PN FILT",
    DET_TEST: "DET 0x32",
    VER_INFO: "MOD 60"
  };
  lbl.textContent = map[sel.value] || "RUN";
}

function qaInjectFaultAction() {
  const sel = document.getElementById("qaFaultKind");
  const mode = sel ? sel.value : "TOGGLE_HTH_BUSY";
  if (mode === "TOGGLE_HTH_BUSY") {
    toggleHthMailboxBusyQuick();
    return;
  } else if (mode === "BUS_OFF") {
    api_CanIf_ControllerBusOff();
  } else if (mode === "SHORT_DLC") {
    cfg.CanIfPrivateDlcCheck = true;
    cfg.SelectedRxPduProfile = "FRAME_F";
    cfg.CanIfRxPduDataLength = 16;
    cfg.InjectedRxDlcLength = 4;
    api_CanIf_RxIndication("FRAME_F", { forceDlc: 4 });
  } else if (mode === "TOGGLE_PN_FILT") {
    if (sim.pnFilterActive) api_CanIf_ConfirmPnAvailability();
    else {
      snapshotRegBefore();
      sim.pnFilterActive = true;
      cfg.CanIfPnFilterEnabled = true;
      addTrace("CanIfPnFilterEnabled = TRUE", "Khóa bộ lọc truyền PN (chỉ CanNm TxPdu_0 đi qua)", "warn");
      updateRegistersAfter();
    }
  } else if (mode === "DET_TEST") {
    api_CanIf_TestDetError();
  } else if (mode === "VER_INFO") {
    api_CanIf_GetVersionInfo();
  }
  syncInputsFromConfig();
  renderAll();
}

function hwTriggerTxConfirm() { qaCanIfTxConfirmation(); }
function hwTriggerRxIndication() { qaCanIfRxIndication(); }
function hwTriggerBusOff() { api_CanIf_ControllerBusOff(); syncInputsFromConfig(); renderAll(); }
function hwTriggerWakeup() { qaWakeupAndValidate(); }

function toggleHthMailboxBusyQuick() {
  cfg.SimulateHthMailboxBusy = !Boolean(cfg.SimulateHthMailboxBusy);
  if (!cfg.SimulateHthMailboxBusy) sim.hth1InFlight = null;
  snapshotRegBefore();
  addTrace("HTH_1 Mailbox Status", "Đặt HTH_1 = " + (cfg.SimulateHthMailboxBusy ? "BUSY (bật xếp hàng CanIfTxBuffer)" : "FREE"), "info");
  updateRegistersAfter();
  syncInputsFromConfig();
  renderAll();
}

function toggleCanIdExtBit() {
  const cur = cfg.CanIfTxPduCanIdType || "STANDARD_CAN";
  const isFd = cur.indexOf("FD") >= 0;
  const isExt = cur.indexOf("EXTENDED") === 0;
  cfg.CanIfTxPduCanIdType = isExt ? (isFd ? "STANDARD_FD_CAN" : "STANDARD_CAN") : (isFd ? "EXTENDED_FD_CAN" : "EXTENDED_CAN");
  const pdu = getEffectiveTxPdu(cfg.SelectedTxPduId);
  snapshotRegBefore();
  sim.lastDecodedCanId32 = pdu.encodedCanId;
  sim.lastFrameFlags.isExt = !isExt;
  updateRegistersAfter();
  syncInputsFromConfig();
  renderAll();
}

function toggleCanIdFdBit() {
  const cur = cfg.CanIfTxPduCanIdType || "STANDARD_CAN";
  const isFd = cur.indexOf("FD") >= 0;
  const isExt = cur.indexOf("EXTENDED") === 0;
  cfg.CanIfTxPduCanIdType = isFd ? (isExt ? "EXTENDED_CAN" : "STANDARD_CAN") : (isExt ? "EXTENDED_FD_CAN" : "STANDARD_FD_CAN");
  const pdu = getEffectiveTxPdu(cfg.SelectedTxPduId);
  snapshotRegBefore();
  sim.lastDecodedCanId32 = pdu.encodedCanId;
  sim.lastFrameFlags.isFd = !isFd;
  updateRegistersAfter();
  syncInputsFromConfig();
  renderAll();
}

function onClickRegBit(regName, bit) {
  snapshotRegBefore();
  if (regName === "A") {
    if (bit === 7) api_CanIf_SetControllerMode(sim.ctrlMode === "CAN_CS_STARTED" ? "CAN_CS_STOPPED" : "CAN_CS_STARTED");
    else if (bit === 6) {
      if (sim.ctrlMode === "CAN_CS_SLEEP") api_CanIf_SetControllerMode("CAN_CS_STOPPED");
      else if (sim.ctrlMode === "CAN_CS_STOPPED") api_CanIf_SetControllerMode("CAN_CS_SLEEP");
      else api_CanIf_SetControllerMode("CAN_CS_SLEEP"); // will demonstrate illegal guard
    } else if (bit === 5) api_CanIf_SetPduMode("CANIF_ONLINE");
    else if (bit === 4) api_CanIf_SetPduMode("CANIF_TX_OFFLINE_ACTIVE");
    else if (bit === 3) api_CanIf_SetPduMode("CANIF_TX_OFFLINE");
    else if (bit === 2) {
      if (sim.pnFilterActive) api_CanIf_ConfirmPnAvailability();
      else { sim.pnFilterActive = true; cfg.CanIfPnFilterEnabled = true; }
    } else if (bit === 0) qaWakeupAndValidate();
  } else {
    if (bit === 7) { toggleCanIdExtBit(); return; }
    if (bit === 6) { toggleCanIdFdBit(); return; }
    if (bit === 5) {
      cfg.CanIfHthHandleType = cfg.CanIfHthHandleType === "BASIC" ? "FULL" : "BASIC";
      sim.lastFrameFlags.isBasicHoh = cfg.CanIfHthHandleType === "BASIC";
    }
  }
  updateRegistersAfter();
  syncInputsFromConfig();
  renderAll();
}

// ==================== CORE RENDER PIPELINE ====================

function renderAll() {
  renderHeaderAndStepper();
  renderScenarioCardAndWhatIf();
  renderValidationBanner();
  renderCanIdAndHohPanels();
  renderDualRegisters();
  renderTimersAndStateMachines();
  renderSvgArchitecture();
  renderInspector();
}

function renderHeaderAndStepper() {
  const sc = getCurrentScenario();
  const ind = document.getElementById("stepIndicator");
  if (ind) ind.textContent = "Bước " + uiState.stepIndex + " / " + sc.steps.length;
  const bPrev = document.getElementById("btnPrevStep");
  const bNext = document.getElementById("btnNextStep");
  if (bPrev) bPrev.disabled = uiState.stepIndex <= 0;
  if (bNext) bNext.disabled = uiState.stepIndex >= sc.steps.length;

  const clk = document.getElementById("clockVal");
  if (clk) clk.textContent = sim.simTimeMs + " ms";

  const hbCtrl = document.getElementById("hdrBadgeCtrl");
  if (hbCtrl) {
    const shortCtrl = sim.ctrlMode.replace("CAN_CS_", "");
    hbCtrl.textContent = "Ctrl0: " + shortCtrl;
    hbCtrl.className = "state-badge " + (shortCtrl === "STARTED" ? "sb-ok" : shortCtrl === "SLEEP" ? "sb-pur" : "sb-err");
  }
  const hbPdu = document.getElementById("hdrBadgePduMode");
  if (hbPdu) {
    const shortPdu = sim.pduMode.replace("CANIF_", "");
    hbPdu.textContent = "PduMode: " + shortPdu;
    hbPdu.className = "state-badge " + (sim.pduMode === "CANIF_ONLINE" ? "sb-ok" : sim.pduMode === "CANIF_TX_OFFLINE_ACTIVE" ? "sb-warn" : "sb-err");
  }
  const hbBuf = document.getElementById("hdrBadgeTxBuf");
  if (hbBuf) {
    const cap = Number(cfg.CanIfTxBufferSize) || 0;
    hbBuf.textContent = "TxBuf: " + sim.txBuffer.length + "/" + cap;
    hbBuf.className = "state-badge " + (sim.txBuffer.length > 0 ? "sb-warn" : "sb-cyan");
  }
  const hbPn = document.getElementById("hdrBadgePn");
  if (hbPn) {
    hbPn.textContent = sim.pnFilterActive ? "PN Filter: LOCKED" : "PN Filter: OFF";
    hbPn.className = "state-badge " + (sim.pnFilterActive ? "sb-pur" : "sb-deact");
  }

  const qaCtrl = document.getElementById("qaTxtCtrlMode");
  if (qaCtrl) qaCtrl.textContent = sim.ctrlMode.replace("CAN_CS_", "");
  const qaPdu = document.getElementById("qaTxtPduMode");
  if (qaPdu) qaPdu.textContent = sim.pduMode.replace("CANIF_", "");

  const hthBtn = document.getElementById("btnToggleHthBusy");
  if (hthBtn) {
    const busy = Boolean(cfg.SimulateHthMailboxBusy) || sim.hth1InFlight !== null;
    hthBtn.textContent = "HTH_1: " + (busy ? "BUSY (Queue Active)" : "FREE");
    hthBtn.className = "btn btn-sm " + (busy ? "btn-warn" : "btn-cyan");
  }
}

function renderScenarioCardAndWhatIf() {
  const sc = getCurrentScenario();
  const badge = document.getElementById("scenIdBadge");
  if (badge) badge.textContent = sc.id + " (" + sc.steps.length + " bước)";

  const box = document.getElementById("scenSummaryBox");
  if (box) {
    const nextStep = sc.steps[uiState.stepIndex];
    box.innerHTML =
      "<div><strong>" + escHtml(sc.title) + "</strong></div>" +
      "<div style='margin-top:3px'>" + escHtml(sc.summary) + "</div>" +
      "<div style='margin-top:5px;color:var(--pri);font-weight:700'>" +
      (nextStep ? "▶ Kế tiếp: " + escHtml(nextStep.title) : "✔ Đã hoàn tất toàn bộ " + sc.steps.length + " bước!") +
      "</div>";
  }

  const wif = document.getElementById("whatIfContainer");
  if (wif) {
    wif.innerHTML = "";
    sc.whatIfs.forEach(w => {
      const b = document.createElement("button");
      b.className = "whatif-btn";
      b.textContent = w.label;
      b.onclick = () => {
        w.run();
        syncInputsFromConfig();
        renderAll();
      };
      wif.appendChild(b);
    });
  }
}

function renderValidationBanner() {
  const box = document.getElementById("cfgValidationBox");
  if (!box) return;
  const issues = validateConfig();
  if (!issues.length) {
    box.innerHTML = "";
    return;
  }
  box.innerHTML = issues.map(i => "<div class='cfg-warn-banner'>" + escHtml(i.msg) + "</div>").join("");
}

function renderCanIdAndHohPanels() {
  // 1) Can_IdType 32-bit Strip
  const canIdBox = document.getElementById("canIdAnatomyBox");
  if (canIdBox) {
    const pdu = getEffectiveTxPdu(cfg.SelectedTxPduId);
    const dec = decodeCanIdType(sim.lastDecodedCanId32 || pdu.encodedCanId);
    canIdBox.innerHTML =
      "<div class='canid-top'>" +
      "  <span style='font-size:11px;font-weight:800;color:var(--pri)'>🧬 Giải Phẫu 32-bit Can_IdType (SWS_Can_00416) — Click Bit 31/30 Để Đổi Trực Tiếp</span>" +
      "  <span class='pill pill-cyan mono'>" + escHtml(dec.hex32) + " (" + escHtml(dec.idType) + ")</span>" +
      "</div>" +
      "<div class='canid-fields'>" +
      "  <div class='canid-cell clickable " + (dec.extBit ? "active-pur" : "") + "' onclick='toggleCanIdExtBit()' title='Click để bật/tắt Bit 31 (Standard 11b ↔ Extended 29b)'>" +
      "    <div class='canid-cell-lbl'>Bit 31 · EXT_ID (Click)</div>" +
      "    <div class='canid-cell-val mono'>" + dec.extBit + " (" + (dec.extBit ? "29-bit EXT" : "11-bit STD") + ")</div>" +
      "  </div>" +
      "  <div class='canid-cell clickable " + (dec.fdBit ? "active-cyan" : "") + "' onclick='toggleCanIdFdBit()' title='Click để bật/tắt Bit 30 (Classical CAN ↔ CAN FD)'>" +
      "    <div class='canid-cell-lbl'>Bit 30 · FD_MODE (Click)</div>" +
      "    <div class='canid-cell-val mono'>" + dec.fdBit + " (" + (dec.fdBit ? "CAN FD 64B" : "CAN 2.0 8B") + ")</div>" +
      "  </div>" +
      "  <div class='canid-cell'>" +
      "    <div class='canid-cell-lbl'>Bit 29 · RSVD</div>" +
      "    <div class='canid-cell-val mono'>0 (Reserved)</div>" +
      "  </div>" +
      "  <div class='canid-cell'>" +
      "    <div class='canid-cell-lbl'>Bits 28..0 · Raw CAN ID</div>" +
      "    <div class='canid-cell-val mono'>" + escHtml(dec.hexId) + "</div>" +
      "  </div>" +
      "</div>";
  }

  // 2) Left HOH Card: FullCAN HTH_0 vs BasicCAN HTH_1 + CanIfTxBuffer Priority Queue
  const txBox = document.getElementById("txHthBufferBox");
  if (txBox) {
    const cap = Number(cfg.CanIfTxBufferSize) || 0;
    const hth0Html = sim.hth0InFlight
      ? "<div class='hth-row busy'><span><strong>HTH_0 (FullCAN 1:1):</strong> " + escHtml(sim.hth0InFlight.name) + " (" + escHtml(fmtHex(sim.hth0InFlight.rawCanId, 3)) + ")</span><span class='pill pill-warn'>IN-FLIGHT</span></div>"
      : "<div class='hth-row empty'><span>HTH_0 (FullCAN 1:1 · TxPdu_0 CanNm)</span><span>FREE</span></div>";

    const hth1BusyReason = sim.hth1InFlight
      ? escHtml(sim.hth1InFlight.name) + " (" + escHtml(fmtHex(sim.hth1InFlight.rawCanId, 3)) + ")"
      : (cfg.SimulateHthMailboxBusy ? "Manual Simulated BUSY" : "FREE");
    const hth1Html = (sim.hth1InFlight || cfg.SimulateHthMailboxBusy)
      ? "<div class='hth-row busy'><span><strong>HTH_1 (BasicCAN M:1):</strong> " + hth1BusyReason + "</span><span class='pill pill-warn'>CAN_BUSY</span></div>"
      : "<div class='hth-row empty'><span>HTH_1 (BasicCAN M:1 · COM/TP/Dyn/Trig)</span><span>FREE</span></div>";

    let bufHtml = "";
    if (!cfg.CanIfPublicTxBuffering || cap === 0) {
      bufHtml = "<div class='hth-row empty'><span>CanIfTxBuffer: OFF (Buffering tắt hoặc Size=0)</span><span>DISABLED</span></div>";
    } else if (sim.txBuffer.length === 0) {
      bufHtml = "<div class='hth-row empty'><span>CanIfTxBuffer [0/" + cap + "] (Sorted by CAN ID)</span><span>EMPTY</span></div>";
    } else {
      bufHtml = sim.txBuffer.map((item, idx) =>
        "<div class='hth-row queued'>" +
        "  <span><strong>#" + (idx + 1) + " [Prio " + escHtml(fmtHex(item.rawCanId, 3)) + "]</strong> " + escHtml(item.name) + " (" + item.dlc + "B)</span>" +
        "  <span class='pill pill-cyan'>QUEUED</span>" +
        "</div>"
      ).join("");
    }

    txBox.innerHTML =
      "<div class='hoh-hdr'>" +
      "  <span>📤 HTH Mailboxes &amp; CanIfTxBuffer Priority Queue</span>" +
      "  <span class='pill " + (sim.txBuffer.length > 0 ? "pill-cyan" : "pill-ok") + "'>" + sim.txBuffer.length + "/" + cap + " Slot</span>" +
      "</div>" +
      hth0Html + hth1Html + bufHtml;
  }

  // 3) Right HOH Card: Rx HRH, Software Acceptance Filter & DLC Check
  const rxBox = document.getElementById("rxFilterBox");
  if (rxBox) {
    const lr = sim.lastRxSummary;
    if (!lr) {
      const prof = RX_PROFILES[cfg.SelectedRxPduProfile] || RX_PROFILES.FRAME_A;
      rxBox.innerHTML =
        "<div class='hoh-hdr'>" +
        "  <span>📥 Rx HRH, Software Filter (" + escHtml(cfg.CanIfPrivateSoftwareFilterType) + ") &amp; DLC</span>" +
        "  <span class='pill pill-mut'>SẴN SÀNG</span>" +
        "</div>" +
        "<div class='rx-filter-step'><strong>1. HRH Target:</strong> " + escHtml(prof.hrhId) + " (" + escHtml(cfg.CanIfHrhHandleType) + ") | <strong>RxID:</strong> <span class='mono'>" + escHtml(fmtHex(prof.canId, 3)) + "</span></div>" +
        "<div class='rx-filter-step'><strong>2. SwFilter Rule:</strong> (RxId &amp; " + escHtml(cfg.CanIfRxPduCanIdMaskHex) + ") vs CfgId | Algo: " + escHtml(cfg.CanIfPrivateSoftwareFilterType) + "</div>" +
        "<div class='rx-filter-step'><strong>3. DLC Guard:</strong> Actual " + Number(cfg.InjectedRxDlcLength) + "B &ge; Min " + Number(cfg.CanIfRxPduDataLength) + "B (" + (cfg.CanIfPrivateDlcCheck ? "ON" : "OFF") + ") ➔ " + escHtml(cfg.CanIfRxPduUserRxIndicationUL) + "</div>";
    } else {
      const fClass = lr.swFilterPassed ? "pass" : "fail";
      const dClass = lr.dlcCheckPassed ? "pass" : "fail";
      rxBox.innerHTML =
        "<div class='hoh-hdr'>" +
        "  <span>📥 Kết Quả Lọc Rx &amp; Điều Phối Upper Layer</span>" +
        "  <span class='pill " + (lr.dropReason ? "pill-err" : "pill-ok") + "'>" + (lr.dropReason ? "DROPPED" : escHtml(lr.ul)) + "</span>" +
        "</div>" +
        "<div class='rx-filter-step " + fClass + "'><strong>1. SwFilter (" + escHtml(cfg.CanIfPrivateSoftwareFilterType) + "):</strong> " +
        escHtml(fmtHex(lr.rawCanId, 3)) + " &amp; " + escHtml(lr.mask) + " ➔ " + (lr.swFilterPassed ? "MATCH " + escHtml(lr.name) : "NO MATCH (Drop)") + "</div>" +
        "<div class='rx-filter-step " + dClass + "'><strong>2. DLC Check (" + (cfg.CanIfPrivateDlcCheck ? "ON" : "OFF") + "):</strong> " +
        lr.dlc + "B &ge; Min " + lr.minDlc + "B ➔ " + (lr.dlcCheckPassed ? "PASS" : "FAIL (Runtime Error 0x32)") + "</div>" +
        "<div class='rx-filter-step " + (lr.dropReason ? "fail" : "pass") + "'><strong>3. Route Callback:</strong> " + escHtml(lr.ulCbk) + "</div>";
    }
  }
}

function renderDualRegisters() {
  const renderReg = (prefix, bitsDef, val, prevVal, hexElId, bitsElId) => {
    const hexEl = document.getElementById(hexElId);
    if (hexEl) hexEl.textContent = "0x" + (val & 0xFF).toString(16).toUpperCase().padStart(2, "0");
    const row = document.getElementById(bitsElId);
    if (!row) return;
    row.innerHTML = "";
    bitsDef.forEach(b => {
      const isOn = (val & b.mask) !== 0;
      const changed = ((val ^ prevVal) & b.mask) !== 0;
      const toneCls = isOn
        ? (b.tone === "warn" ? "on-warn" : b.tone === "err" ? "on-err" : b.tone === "cyan" ? "on-cyan" : b.tone === "pur" ? "on-pur" : "on")
        : "";
      const div = document.createElement("div");
      div.className = "bit-box " + toneCls + (changed ? " bit-changed" : "");
      div.title = "Bit " + b.bit + " (" + b.name + "): " + b.desc;
      div.onclick = () => onClickRegBit(prefix, b.bit);
      div.innerHTML =
        "<span class='bit-idx'>B" + b.bit + "</span>" +
        "<span class='bit-val mono'>" + (isOn ? "1" : "0") + "</span>" +
        "<span class='bit-tag'>" + escHtml(b.tag) + "</span>";
      row.appendChild(div);
    });
  };

  renderReg("A", CANIF_CTRL_PDU_BITS, sim.regA, sim.prevRegA, "regAHex", "regABits");
  renderReg("B", CANIF_FRAME_BUF_BITS, sim.regB, sim.prevRegB, "regBHex", "regBBits");
}

function renderTimersAndStateMachines() {
  const badge = document.getElementById("canifPanel2Badge");
  if (badge) badge.textContent = "Ctrl0: " + sim.ctrlMode + " | PduMode: " + sim.pduMode;

  const tg = document.getElementById("timersGrid");
  if (tg) {
    const cap = Math.max(1, Number(cfg.CanIfTxBufferSize) || 1);
    const cards = [
      { lbl: "Tx OK / Passive", val: sim.counters.txOk + " / " + sim.counters.txPassiveCbk, pct: Math.min(100, sim.counters.txOk * 15), cls: "ok" },
      { lbl: "CanIfTxBuffer Queue", val: sim.txBuffer.length + " / " + Number(cfg.CanIfTxBufferSize), pct: Math.min(100, Math.round((sim.txBuffer.length / cap) * 100)), cls: "cyan" },
      { lbl: "Rx Valid / Filter Drop", val: sim.counters.rxOk + " / " + sim.counters.rxDroppedFilter, pct: Math.min(100, sim.counters.rxOk * 15), cls: "pur" },
      { lbl: "Err (DLC 0x32 / DET / BO)", val: sim.counters.rxErrDlc + " / " + sim.counters.detErrors + " / " + sim.counters.busOffEvents, pct: Math.min(100, (sim.counters.rxErrDlc + sim.counters.detErrors + sim.counters.busOffEvents) * 25), cls: "err" }
    ];
    tg.innerHTML = cards.map(c =>
      "<div class='timer-card'>" +
      "  <div class='timer-top'><span>" + escHtml(c.lbl) + "</span><span class='mono' style='font-weight:800'>" + escHtml(c.val) + "</span></div>" +
      "  <div class='timer-bar'><div class='timer-fill " + c.cls + "' style='width:" + c.pct + "%'></div></div>" +
      "</div>"
    ).join("");
  }

  const smCtrlLbl = document.getElementById("smCtrlLbl");
  if (smCtrlLbl) smCtrlLbl.textContent = sim.ctrlMode;
  const ctrlBox = document.getElementById("ctrlSmDiagram");
  if (ctrlBox) {
    const ctrlStates = [
      { id: "CAN_CS_UNINIT", sub: "Chưa Init", act: "active-deact" },
      { id: "CAN_CS_STOPPED", sub: "Xóa TxBuf", act: "active-warn" },
      { id: "CAN_CS_STARTED", sub: "Truyền/Nhận", act: "active-ok" },
      { id: "CAN_CS_SLEEP", sub: "Ngủ Tiết Kiệm", act: "active-pur" }
    ];
    ctrlBox.innerHTML = ctrlStates.map(st =>
      "<div class='sm-node " + (sim.ctrlMode === st.id ? st.act : "") + "' onclick=\"api_CanIf_SetControllerMode('" + st.id + "');syncInputsFromConfig();renderAll();\">" +
      "  <div class='sm-node-hdr mono'>" + st.id.replace("CAN_CS_", "") + "</div>" +
      "  <div class='sm-node-sub'>" + st.sub + "</div>" +
      "</div>"
    ).join("");
  }

  const smPduLbl = document.getElementById("smPduLbl");
  if (smPduLbl) smPduLbl.textContent = sim.pduMode;
  const pduBox = document.getElementById("pduSmDiagram");
  if (pduBox) {
    const pduStates = [
      { id: "CANIF_OFFLINE", sub: "Khóa Tx + Rx", act: "active-err" },
      { id: "CANIF_TX_OFFLINE", sub: "Khóa Tx, Mở Rx", act: "active-err" },
      { id: "CANIF_TX_OFFLINE_ACTIVE", sub: "TxConfirm Ảo", act: "active-warn" },
      { id: "CANIF_ONLINE", sub: "Tx + Rx Thông", act: "active-ok" }
    ];
    pduBox.innerHTML = pduStates.map(st =>
      "<div class='sm-node " + (sim.pduMode === st.id ? st.act : "") + "' onclick=\"api_CanIf_SetPduMode('" + st.id + "');syncInputsFromConfig();renderAll();\">" +
      "  <div class='sm-node-hdr mono'>" + st.id.replace("CANIF_", "") + "</div>" +
      "  <div class='sm-node-sub'>" + st.sub + "</div>" +
      "</div>"
    ).join("");
  }
}

function renderSvgArchitecture() {
  const allArrowIds = [
    "arr_swc_rte", "arr_rte_ul", "arr_rte_cansm", "arr_ecum_canif",
    "arr_cansm_canif", "arr_ul_canif", "arr_canif_ul", "arr_canif_passive_cbk",
    "arr_canif_det", "arr_canif_candrv", "arr_candrv_canif", "arr_canif_cantrcv", "arr_drv_bus"
  ];
  allArrowIds.forEach(aid => {
    const el = document.getElementById(aid);
    if (!el) return;
    const act = sim.activeArrows[aid];
    el.setAttribute("class", act ? ("flow-arrow " + act) : "flow-arrow");
  });

  Object.keys(MODULES_INFO).forEach(mid => {
    const g = document.getElementById("node_" + mid);
    if (g) g.classList.toggle("selected", uiState.selectedMod === mid);
  });

  const setText = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };
  setText("svgSub_MOD_ECUM", "Wakeup: " + (sim.wakeupValidated ? "VALIDATED" : sim.wakeupDetected ? "PENDING Rx" : "Idle"));
  setText("svgSub_MOD_CANSM", "Ctrl0: " + sim.ctrlMode.replace("CAN_CS_", "") + " | " + sim.pduMode.replace("CANIF_", ""));
  setText("svgSub_MOD_DET", "DET: " + sim.counters.detErrors + " | DLC 0x32: " + sim.counters.rxErrDlc + " | IdsM: " + sim.counters.idsmEvents);
  setText("svgSub_MOD_CANIF1", "TxBuf: " + sim.txBuffer.length + "/" + Number(cfg.CanIfTxBufferSize) + " | Filter: " + cfg.CanIfPrivateSoftwareFilterType + " | DLC: " + (cfg.CanIfPrivateDlcCheck ? "ON" : "OFF"));
  setText("svgSub_MOD_CANDRV1", "HTH_0 Full: " + (sim.hth0InFlight ? "TX" : "FREE") + " | HTH_1 Basic: " + ((sim.hth1InFlight || cfg.SimulateHthMailboxBusy) ? "BUSY" : "FREE"));
  setText("svgSub_MOD_CANTRCV1", "Mode: " + sim.trcvMode.replace("CANTRCV_TRCVMODE_", "") + " | WUF: " + (sim.trcvWufFlag ? "SET" : "Clear") + " | PN: " + (sim.pnFilterActive ? "Filtered" : "Ready"));
  setText("svgBusLineTxt", "CAN / CAN-FD Physical Bus (BaudCfg #" + sim.baudrateConfigId + (cfg.CanFdBitRateSwitchBrs ? " · BRS ON" : " · BRS OFF") + ")");
}

function selectModule(modId) {
  uiState.selectedMod = modId;
  uiState.inspTab = 1;
  renderSvgArchitecture();
  renderInspector();
}

function switchInspTab(idx) {
  uiState.inspTab = idx;
  renderInspector();
}

function renderInspector() {
  for (let i = 0; i < 4; i++) {
    const b = document.getElementById("inspTabBtn" + i);
    if (b) b.classList.toggle("active", i === uiState.inspTab);
  }
  const body = document.getElementById("inspBody");
  if (!body) return;

  if (uiState.inspTab === 0) {
    const n = sim.stepNarrative;
    const tonePill = n.tone === "err" ? "pill-err" : n.tone === "warn" ? "pill-warn" : n.tone === "pur" ? "pill-pur" : "pill-ok";
    body.innerHTML =
      "<div class='insp-card'>" +
      "  <div style='display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:6px'>" +
      "    <span class='insp-h' style='margin:0'>" + escHtml(n.title) + "</span>" +
      "    <span class='pill " + tonePill + "'>" + escHtml(n.resultBadge) + "</span>" +
      "  </div>" +
      "  <p style='margin:5px 0;font-size:11.5px'><strong>1. Input từ đâu:</strong> " + escHtml(n.inputOrigin) + "</p>" +
      "  <p style='margin:5px 0;font-size:11.5px'><strong>2. CanIf xử lý gì:</strong> " + escHtml(n.processDetail) + "</p>" +
      "  <p style='margin:5px 0;font-size:11.5px'><strong>3. Output đi đâu:</strong> " + escHtml(n.outputDest) + "</p>" +
      "  <p style='margin:5px 0;font-size:11.5px;color:var(--cyan)'><strong>4. Thanh ghi / Bit đổi:</strong> " + escHtml(n.bitChange) + "</p>" +
      "</div>" +
      "<div class='insp-card'>" +
      "  <div class='insp-h'>📌 Chữ Ký API AUTOSAR Chuẩn</div>" +
      "  <pre class='code-block'>" + escHtml(n.apiSignature) + "</pre>" +
      "</div>";
  } else if (uiState.inspTab === 1) {
    const m = MODULES_INFO[uiState.selectedMod] || MODULES_INFO.MOD_CANIF;
    const pills = Object.keys(MODULES_INFO).map(k =>
      "<button class='mod-pill " + (k === uiState.selectedMod ? "active" : "") + "' onclick=\"selectModule('" + k + "')\">" + escHtml(MODULES_INFO[k].title.split(" ")[0]) + "</button>"
    ).join("");
    body.innerHTML =
      "<div class='mod-list'>" + pills + "</div>" +
      "<div class='insp-card'>" +
      "  <div class='insp-h'>" + escHtml(m.title) + " <span class='pill pill-cyan'>" + escHtml(m.layer) + "</span></div>" +
      "  <p style='font-size:11.5px;margin:4px 0'><strong>Vai trò:</strong> " + escHtml(m.role) + "</p>" +
      "  <p style='font-size:11.5px;margin:4px 0'><strong>📥 Input lấy từ:</strong> " + escHtml(m.inputs) + "</p>" +
      "  <p style='font-size:11.5px;margin:4px 0'><strong>📤 Output định tuyến tới:</strong> " + escHtml(m.outputs) + "</p>" +
      "  <div style='margin-top:6px;font-size:11px'><strong>🔑 API chính:</strong><ul style='margin:4px 0 0 16px'>" +
      m.apis.map(a => "<li class='mono' style='margin-bottom:2px'>" + escHtml(a) + "</li>").join("") +
      "  </ul></div>" +
      "  <p style='margin-top:6px;font-size:11px;color:var(--warn)'><strong>💡 Lưu ý tích hợp:</strong> " + escHtml(m.notes) + "</p>" +
      "</div>";
  } else if (uiState.inspTab === 2) {
    body.innerHTML =
      "<div class='insp-card'>" +
      "  <div class='insp-h'>📄 Mã C Tương Đương (SWS_CanIf R23-11)</div>" +
      "  <pre class='code-block'>" + escHtml(sim.cCodeSnippet || "/* Ready */") + "</pre>" +
      "</div>" +
      "<div class='insp-card'>" +
      "  <div class='insp-h'>⚙ Snippet CanIf_Lcfg.c Hiện Tại</div>" +
      "  <pre class='code-block'>" + escHtml(generateCanIfLcfgC()) + "</pre>" +
      "</div>";
  } else {
    if (!sim.apiTrace.length) {
      body.innerHTML = "<div class='insp-card'>Chưa có sự kiện API nào. Bấm <b>Tiếp ▶</b> hoặc các nút <b>Quick Actions</b> để theo dõi log.</div>";
      return;
    }
    body.innerHTML = sim.apiTrace.map(t =>
      "<div class='trace-item " + escHtml(t.tone) + "'>" +
      "  <div style='display:flex;justify-content:space-between;font-weight:800'><span>" + escHtml(t.api) + "</span><span class='mono' style='color:var(--mut)'>" + escHtml(t.ts) + "</span></div>" +
      "  <div style='color:var(--txt-soft);margin-top:2px'>" + escHtml(t.summary) + "</div>" +
      "</div>"
    ).join("");
  }
}

// ==================== >1000MS FLOATING HOVER TOOLTIPS ====================

function showCfgTooltip(rowEl, key) {
  const data = configTooltipData[key];
  const popup = document.getElementById("cfgTooltipPopup");
  if (!data || !popup || !rowEl) return;
  popup.innerHTML =
    "<div class='tt-hdr'>" +
    "  <span class='tt-title'>" + escHtml(data.title) + "</span>" +
    "  <span class='tt-meta mono'>" + escHtml(data.sws) + "</span>" +
    "</div>" +
    "<div class='tt-path mono'>" + escHtml(data.ecucPath) + "</div>" +
    "<div class='tt-grid'>" +
    "  <div class='tt-box'><b>Kiểu / Miền giá trị:</b><br/><span class='mono'>" + escHtml(data.range) + "</span></div>" +
    "  <div class='tt-box'><b>Khuyến nghị:</b><br/>" + escHtml(data.typical) + "</div>" +
    "</div>" +
    "<div class='tt-sec'><b>Vai trò trong CanIf:</b> " + escHtml(data.role) + "</div>" +
    "<div class='tt-sec'><b>Cơ chế hoạt động:</b> " + escHtml(data.mechanism) + "</div>" +
    "<div class='tt-sec'><b>Thử trên Simulator:</b> " + escHtml(data.scenarioImpact) + "</div>";

  const rect = rowEl.getBoundingClientRect();
  popup.style.visibility = "hidden";
  popup.classList.add("show");
  const pw = popup.offsetWidth || 380;
  const ph = popup.offsetHeight || 220;
  let left = rect.right + 10;
  if (left + pw > window.innerWidth - 12) left = Math.max(12, rect.left - pw - 10);
  let top = Math.min(rect.top, window.innerHeight - ph - 12);
  top = Math.max(12, top);
  popup.style.left = left + "px";
  popup.style.top = top + "px";
  popup.style.visibility = "visible";
}

function hideCfgTooltip() {
  if (uiState.tooltipTimer) {
    clearTimeout(uiState.tooltipTimer);
    uiState.tooltipTimer = null;
  }
  uiState.activeTooltipKey = null;
  const popup = document.getElementById("cfgTooltipPopup");
  if (popup) {
    popup.classList.remove("show");
    popup.style.visibility = "";
  }
}

function initTooltipHandlers() {
  const rows = document.querySelectorAll(".cfg-row[data-cfg-key]");
  rows.forEach(row => {
    const key = row.getAttribute("data-cfg-key");
    row.addEventListener("mouseenter", () => {
      hideCfgTooltip();
      uiState.activeTooltipKey = key;
      uiState.tooltipTimer = setTimeout(() => {
        showCfgTooltip(row, key);
      }, 1020);
    });
    row.addEventListener("mouseleave", hideCfgTooltip);
    row.addEventListener("mousedown", hideCfgTooltip);
  });
  window.addEventListener("scroll", hideCfgTooltip, true);
}

// ==================== EXPORT MODAL & STANDALONE HTML DOWNLOAD ====================

function getExportContentByTab(idx) {
  if (idx === 0) return { name: "CanIf.arxml", content: generateCanIfArxml() };
  if (idx === 1) return { name: "CanIf_Cfg.h", content: generateCanIfCfgH() };
  if (idx === 2) return { name: "CanIf_Lcfg.c", content: generateCanIfLcfgC() };
  return { name: "CanIf_Config.json", content: generateCanIfJson() };
}

function openExportModal() {
  const modal = document.getElementById("exportModal");
  if (modal) modal.classList.remove("hidden");
  switchExportTab(uiState.exportTab);
}

function closeExportModal() {
  const modal = document.getElementById("exportModal");
  if (modal) modal.classList.add("hidden");
}

function onExportModalBackdrop(evt) {
  if (evt && evt.target && evt.target.id === "exportModal") closeExportModal();
}

function switchExportTab(idx) {
  uiState.exportTab = idx;
  for (let i = 0; i < 4; i++) {
    const t = document.getElementById("expTab" + i);
    if (t) t.className = i === idx ? "btn btn-sm btn-pri" : "btn btn-sm";
  }
  const area = document.getElementById("exportCodeArea");
  if (area) area.textContent = getExportContentByTab(idx).content;
}

function copyExportCode() {
  const txt = getExportContentByTab(uiState.exportTab).content;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(txt).catch(() => {});
  }
}

function downloadExportCode() {
  const item = getExportContentByTab(uiState.exportTab);
  const blob = new Blob([item.content], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = item.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}

function downloadStandaloneHTML() {
  hideCfgTooltip();
  closeExportModal();
  const docHtml = "<!DOCTYPE html>\n" + document.documentElement.outerHTML;
  const blob = new Blob([docHtml], { type: "text/html;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "AUTOSAR_CanIf.html";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
