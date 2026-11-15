// ==================== UI CONTROLLER, TOOLTIP (>1s), SVG RENDERER & EXPORTS ====================

let uiState = {
  view: "sim",
  theme: "dark",
  scenarioId: "S1",
  stepIndex: 0,
  autoTimer: null,
  cfgTab: 0,
  selectedModule: "MOD_DOIP",
  inspTab: 0,
  exportTab: "arxml",
  ttTimer: null,
  ttKey: null
};

function escHtml(s) {
  return String(s === undefined || s === null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getCurrentScenario() {
  return SCENARIOS.find(s => s.id === uiState.scenarioId) || SCENARIOS[0];
}

function populateScenarioSelect() {
  const sel = document.getElementById("scenarioSelect");
  if (!sel) return;
  const groups = [];
  SCENARIOS.forEach(sc => {
    if (!groups.includes(sc.group)) groups.push(sc.group);
  });
  sel.innerHTML = groups.map(grp => {
    const opts = SCENARIOS.filter(s => s.group === grp)
      .map(s => '<option value="' + s.id + '">' + escHtml(s.title) + "</option>")
      .join("");
    return '<optgroup label="' + escHtml(grp) + '">' + opts + "</optgroup>";
  }).join("");
  sel.value = uiState.scenarioId;
}

function stopAutoPlay() {
  if (uiState.autoTimer) {
    clearInterval(uiState.autoTimer);
    uiState.autoTimer = null;
  }
  const btn = document.getElementById("btnAutoPlay");
  if (btn) {
    btn.textContent = "▶️ Tự chạy";
    btn.className = "step-btn play";
  }
}

function loadScenario(id) {
  stopAutoPlay();
  uiState.scenarioId = id || "S1";
  uiState.stepIndex = 0;
  const sc = getCurrentScenario();
  const sel = document.getElementById("scenarioSelect");
  if (sel) sel.value = sc.id;
  if (typeof sc.setup === "function") sc.setup();
  syncInputsFromConfig();
  renderAll();
}

function resetCurrentScenario() {
  loadScenario(uiState.scenarioId);
}

function nextScenarioStep() {
  const sc = getCurrentScenario();
  if (uiState.stepIndex >= sc.steps.length) return;
  const step = sc.steps[uiState.stepIndex];
  uiState.stepIndex += 1;
  if (step && typeof step.exec === "function") step.exec();
  syncInputsFromConfig();
  renderAll();
}

function prevScenarioStep() {
  const sc = getCurrentScenario();
  if (uiState.stepIndex <= 0) return;
  const targetIdx = uiState.stepIndex - 1;
  if (typeof sc.setup === "function") sc.setup();
  uiState.stepIndex = 0;
  for (let i = 0; i < targetIdx; i++) {
    sc.steps[i].exec();
    uiState.stepIndex += 1;
  }
  syncInputsFromConfig();
  renderAll();
}

function toggleScenarioAutoPlay() {
  if (uiState.autoTimer) {
    stopAutoPlay();
    return;
  }
  const sc = getCurrentScenario();
  if (uiState.stepIndex >= sc.steps.length) {
    loadScenario(sc.id);
  }
  const btn = document.getElementById("btnAutoPlay");
  if (btn) {
    btn.textContent = "⏸ Dừng";
    btn.className = "step-btn playing";
  }
  uiState.autoTimer = setInterval(() => {
    const cur = getCurrentScenario();
    if (uiState.stepIndex < cur.steps.length) {
      nextScenarioStep();
    } else {
      stopAutoPlay();
    }
  }, 1500);
}

function runWhatIf(idx) {
  stopAutoPlay();
  const sc = getCurrentScenario();
  const wi = sc.whatIfs && sc.whatIfs[idx];
  if (!wi || typeof wi.run !== "function") return;
  wi.run();
  syncInputsFromConfig();
  renderAll();
}

// ==================== VIEW & THEME SWITCHING ====================

function switchMainView(v) {
  uiState.view = v;
  const vSim = document.getElementById("viewSim");
  const vHb = document.getElementById("viewHb");
  const bSim = document.getElementById("btnViewSim");
  const bHb = document.getElementById("btnViewHb");
  if (v === "handbook") {
    if (vSim) vSim.classList.add("hidden");
    if (vHb) vHb.classList.remove("hidden");
    if (bSim) bSim.classList.remove("active");
    if (bHb) bHb.classList.add("active");
    if (typeof renderCurrentHandbookView === "function") renderCurrentHandbookView();
  } else {
    if (vSim) vSim.classList.remove("hidden");
    if (vHb) vHb.classList.add("hidden");
    if (bSim) bSim.classList.add("active");
    if (bHb) bHb.classList.remove("active");
  }
}

function toggleTheme() {
  uiState.theme = uiState.theme === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", uiState.theme);
  const btn = document.getElementById("themeToggleBtn");
  if (btn) btn.textContent = uiState.theme === "dark" ? "☀️ Light" : "🌙 Dark";
}

// ==================== CONFIG SYNC & VALIDATION ====================

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

  if (key === "DoIPActivationLinePinMode") {
    api_DoIP_ActivationLineSwitch(cfg.DoIPActivationLinePinMode === "ACTIVE");
    return;
  }
  if (key === "DoIPMaxTesterConnections") {
    resizeTcpConnPoolIfNeeded();
  }
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

function onQaSelectorChange() {
  const u = document.getElementById("qaUdpSelect");
  const t = document.getElementById("qaTcpModeSelect");
  const d = document.getElementById("qaDiagTargetSelect");
  const lblU = document.getElementById("qaTxtUdpType");
  const lblT = document.getElementById("qaTxtTcpAct");
  const lblD = document.getElementById("qaTxtDiagTgt");
  if (u && lblU) lblU.textContent = u.value;
  if (t && lblT) lblT.textContent = t.value === "TLS" ? "TLS:3496" : ("0x0005 " + t.value);
  if (d && lblD) {
    const mapD = { DCM: "0x1001", CANTP: "0x2001", BAD_TA: "0x9999", BAD_XOR: "BadXOR", TP_4KB: "4KB TP" };
    lblD.textContent = mapD[d.value] || "0x1001";
  }
}

// ==================== QUICK ACTION BAR (8 BUTTONS) ====================

function qaToggleActLine() {
  api_DoIP_ActivationLineSwitch();
  syncInputsFromConfig();
  renderAll();
}

function qaToggleIpAssign() {
  api_DoIP_LocalIpAddrAssignmentChg();
  syncInputsFromConfig();
  renderAll();
}

function qaSendUdpRequest() {
  const sel = document.getElementById("qaUdpSelect");
  const pType = sel ? sel.value : "0x0001";
  const isVid = ["0x0001", "0x0002", "0x0003"].includes(pType);
  api_DoIP_UdpRxIndication(pType, {
    protoVer: isVid ? "0xFF" : cfg.InjectedProtoVerHex,
    invVer: isVid ? "0x00" : cfg.InjectedInvVerHex
  });
  syncInputsFromConfig();
  renderAll();
}

function qaTcpRoutingAct() {
  const sel = document.getElementById("qaTcpModeSelect");
  const mode = sel ? sel.value : "0x00";
  const useTls = (mode === "TLS") || Boolean(cfg.DoIPEnableTlsPort3496);
  const actType = mode === "TLS" ? (cfg.DoIPRoutingActivationNumHex || "0xE0") : mode;
  api_DoIP_TcpRoutingActivation(cfg.DoIPSourceAddressTester1Hex, actType, useTls, { skipPending: false });
  syncInputsFromConfig();
  renderAll();
}

function qaAliveCheckRsp() {
  if (!sim || !sim.alivePending) {
    api_DoIP_AliveCheckTrigger("0x0E03");
  } else {
    api_DoIP_SendAliveCheckResp(cfg.DoIPSourceAddressTester1Hex, "0x0E03");
  }
  syncInputsFromConfig();
  renderAll();
}

function qaInjectDiag0x8001() {
  const sel = document.getElementById("qaDiagTargetSelect");
  const mode = sel ? sel.value : "DCM";
  if (mode === "DCM") {
    api_DoIP_DiagRequest0x8001(cfg.DoIPLocalDcmTargetHex);
  } else if (mode === "CANTP") {
    api_DoIP_DiagRequest0x8001(cfg.DoIPGwCanTpTargetHex);
  } else if (mode === "BAD_TA") {
    api_DoIP_DiagRequest0x8001("0x9999");
  } else if (mode === "BAD_XOR") {
    api_DoIP_DiagRequest0x8001(cfg.DoIPLocalDcmTargetHex, { forceBadXor: true, protoVer: "0x02", invVer: "0xFE" });
  } else if (mode === "TP_4KB") {
    api_DoIP_TpStreamingStep("START_AND_CHUNK1", cfg.DoIPLocalDcmTargetHex);
  }
  syncInputsFromConfig();
  renderAll();
}

function qaStepMainFunction() {
  api_DoIP_MainFunction(cfg.DoIPMainFunctionPeriodMs || 10);
  syncInputsFromConfig();
  renderAll();
}

function qaDetOrClear() {
  if (!sim || (sim.detEvents === 0 && sim.idsmEvents === 0)) {
    api_DoIP_TestDetError("0x03");
  } else {
    api_DoIP_GetVersionInfo();
  }
  syncInputsFromConfig();
  renderAll();
}

function api_DoIP_HeaderNackTest(kind) {
  if (kind === "BAD_XOR") {
    api_DoIP_DiagRequest0x8001(cfg.DoIPLocalDcmTargetHex, { protoVer: "0x02", invVer: "0xFE", forceBadXor: true });
  } else {
    api_DoIP_DiagRequest0x8001(cfg.DoIPLocalDcmTargetHex, { forceUnknownType: true });
  }
}

function onClickRegBit(regName, bit) {
  if (!sim) api_DoIP_Init();
  if (regName === "A") {
    if (bit === 7) qaToggleActLine();
    else if (bit === 6) qaToggleIpAssign();
    else if (bit === 5) api_DoIP_SendVehicleAnnouncement();
    else if (bit === 4) api_DoIP_SoConModeChg(sim.selectedSlotIdx, true, cfg.DoIPEnableTlsPort3496 ? 3496 : 13400);
    else if (bit === 3) api_DoIP_TcpRoutingActivation(cfg.DoIPSourceAddressTester1Hex, cfg.DoIPRoutingActivationNumHex, cfg.DoIPEnableTlsPort3496, { skipPending: true });
    else if (bit === 1) qaAliveCheckRsp();
    else if (bit === 0) api_DoIP_DiagRequest0x8001(cfg.DoIPGwCanTpTargetHex);
  } else {
    if (bit === 7 || bit === 1) api_DoIP_HeaderNackTest("BAD_XOR");
    else if (bit === 3 || bit === 5) api_DoIP_DiagRequest0x8001(cfg.DoIPLocalDcmTargetHex);
    else if (bit === 2) api_DoIP_DiagRequest0x8001("0x9999");
    else if (bit === 4) api_DoIP_TpStreamingStep("START_AND_CHUNK1", cfg.DoIPLocalDcmTargetHex);
    else if (bit === 0) api_DoIP_TestDetError("0x03");
  }
  syncInputsFromConfig();
  renderAll();
}

function selectConnSlot(idx) {
  if (!sim) return;
  sim.selectedSlotIdx = Number(idx) || 0;
  updateRegistersAfter();
  renderAll();
}

// ==================== CORE RENDER PIPELINE ====================

function renderAll() {
  renderHeaderAndStepper();
  renderScenarioCardAndWhatIf();
  renderValidationBanner();
  renderDoipFrameAndConnTable();
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
  if (clk) clk.textContent = (sim ? sim.simTimeMs : 0) + " ms";

  const hbAct = document.getElementById("hdrBadgeActLine");
  if (hbAct) {
    hbAct.textContent = "ActLine: " + (sim && sim.actLineActive ? "ACTIVE" : "OFF");
    hbAct.className = "state-badge " + (sim && sim.actLineActive ? "sb-ok" : "sb-err");
  }
  const hbIp = document.getElementById("hdrBadgeIp");
  if (hbIp) {
    hbIp.textContent = "IP: " + (sim && sim.ipAssigned ? "ASSIGNED" : "UNASSIGNED");
    hbIp.className = "state-badge " + (sim && sim.ipAssigned ? "sb-ok" : "sb-err");
  }
  const hbTcp = document.getElementById("hdrBadgeTcp");
  if (hbTcp && sim) {
    const openCnt = sim.tcpConns.filter(c => c.sockState === "ONLINE").length;
    hbTcp.textContent = "TCP: " + openCnt + "/" + sim.tcpConns.length;
    hbTcp.className = "state-badge " + (openCnt >= sim.tcpConns.length ? "sb-warn" : openCnt > 0 ? "sb-cyan" : "sb-muted");
  }
  const hbRt = document.getElementById("hdrBadgeRouting");
  if (hbRt && sim) {
    const activeCnt = sim.tcpConns.filter(c => c.routingState === "ROUTING_ACTIVE").length;
    hbRt.textContent = "Routing: " + (activeCnt > 0 ? ("ACTIVE (" + activeCnt + ")") : sim.tcpState);
    hbRt.className = "state-badge " + (activeCnt > 0 ? "sb-ok" : sim.tcpState === "AUTH_PENDING" || sim.tcpState === "ALIVE_CHECK_WAIT" ? "sb-warn" : "sb-muted");
  }
  const hbDet = document.getElementById("hdrBadgeDet");
  if (hbDet && sim) {
    const tot = sim.detEvents + sim.idsmEvents;
    hbDet.textContent = "DET/IdsM: " + tot;
    hbDet.className = "state-badge " + (tot > 0 ? "sb-err" : "sb-ok");
  }
}

function renderScenarioCardAndWhatIf() {
  const sc = getCurrentScenario();
  const gEl = document.getElementById("scGroupBadge");
  const tEl = document.getElementById("scTitle");
  const sEl = document.getElementById("scSummary");
  const wEl = document.getElementById("whatIfBtns");
  if (gEl) gEl.textContent = sc.group;
  if (tEl) tEl.textContent = sc.title;
  if (sEl) sEl.textContent = sc.summary;
  if (wEl) {
    wEl.innerHTML = (sc.whatIfs || []).map((wi, idx) =>
      '<button class="whatif-btn" onclick="runWhatIf(' + idx + ')">' + escHtml(wi.label) + "</button>"
    ).join("");
  }
}

function renderValidationBanner() {
  const el = document.getElementById("cfgValidationBanner");
  if (!el) return;
  const issues = validateConfig();
  if (issues.length === 0) {
    el.innerHTML = "";
    return;
  }
  el.innerHTML = issues.map(is =>
    '<div class="val-banner ' + (is.tone === "err" ? "err" : "") + '">' + escHtml(is.msg) + "</div>"
  ).join("");
}

function renderDoipFrameAndConnTable() {
  if (!sim) return;
  const f = sim.lastFrame;
  const dirEl = document.getElementById("frameDirBadge");
  if (dirEl) dirEl.textContent = f.dir || "IDLE";

  const cVer = document.getElementById("hdrCellVer");
  const cInv = document.getElementById("hdrCellInv");
  const cType = document.getElementById("hdrCellType");
  const cLen = document.getElementById("hdrCellLen");
  const ptInfo = DOIP_PAYLOAD_TYPES[f.payloadType] || { name: "Unknown Payload Type", transport: "TCP/UDP" };

  if (cVer) {
    cVer.className = "hdr-byte-cell " + (f.xorOk ? "ok" : "err");
    cVer.innerHTML = '<div class="hdr-byte-lbl">Byte 0: ProtoVer</div><div class="hdr-byte-val">' + escHtml(f.protoVer) + '</div><div class="hdr-byte-sub">' + (f.protoVer === "0x03" ? "ISO 13400-2:2019" : f.protoVer === "0xFF" ? "Default VID" : "ISO 13400-2:2012") + "</div>";
  }
  if (cInv) {
    cInv.className = "hdr-byte-cell " + (f.xorOk ? "ok" : "err");
    cInv.innerHTML = '<div class="hdr-byte-lbl">Byte 1: InvVer</div><div class="hdr-byte-val">' + escHtml(f.invVer) + '</div><div class="hdr-byte-sub">~Ver Expected</div>';
  }
  if (cType) {
    cType.className = "hdr-byte-cell " + (DOIP_PAYLOAD_TYPES[f.payloadType] ? "ok" : "err");
    cType.innerHTML = '<div class="hdr-byte-lbl">Bytes 2..3: Type</div><div class="hdr-byte-val">' + escHtml(f.payloadType) + '</div><div class="hdr-byte-sub">' + escHtml(ptInfo.name) + "</div>";
  }
  if (cLen) {
    cLen.className = "hdr-byte-cell " + (f.lenOk ? "ok" : "err");
    cLen.innerHTML = '<div class="hdr-byte-lbl">Bytes 4..7: Length</div><div class="hdr-byte-val">' + f.payloadLen + ' B</div><div class="hdr-byte-sub">' + fmtHex(f.payloadLen, 8) + "</div>";
  }

  const pPrev = document.getElementById("doipPayloadPreview");
  const xorEl = document.getElementById("doipXorBadge");
  if (pPrev) pPrev.textContent = "Payload: " + f.payloadSummary;
  if (xorEl) {
    const xVal = (parseHexNum(f.protoVer, 2) ^ parseHexNum(f.invVer, 0xFD)) & 0xFF;
    xorEl.className = "xor-pill " + (f.xorOk ? "ok" : "err");
    xorEl.textContent = "XOR: " + f.protoVer + " ^ " + f.invVer + " = " + fmtHex(xVal, 2) + (f.xorOk ? " (VALID)" : " (ERR 0x0000!)");
  }

  const tbody = document.getElementById("doipTcpConnTbody");
  if (tbody) {
    tbody.innerHTML = sim.tcpConns.map((c, idx) => {
      const selCls = idx === sim.selectedSlotIdx ? "row-sel" : "";
      const deadCls = c.sockState === "CLOSED" ? "row-dead" : "";
      const stCls = c.routingState === "ROUTING_ACTIVE" ? "sb-ok" : (c.routingState === "AUTH_PENDING" || c.routingState === "ALIVE_CHECK_WAIT") ? "sb-warn" : c.sockState === "ONLINE" ? "sb-cyan" : "sb-muted";
      return '<tr class="' + selCls + " " + deadCls + '" onclick="selectConnSlot(' + idx + ')" style="cursor:pointer;">' +
        "<td><b>#" + c.soConId + "</b> (" + c.sockState + ")</td>" +
        "<td>:" + c.port + "</td>" +
        "<td>" + escHtml(c.testerSa) + "</td>" +
        '<td><span class="conn-state-pill ' + stCls + '">' + escHtml(c.routingState) + "</span></td>" +
        "<td>" + c.initTimerMs + "ms</td>" +
        "<td>" + Math.round(c.genTimerMs / 1000) + "s</td>" +
        "<td>" + c.aliveTimerMs + "ms</td>" +
        "<td>" + (c.tpBufLocked ? '<span style="color:var(--warn);">LOCKED</span>' : "FREE") + "</td>" +
        "</tr>";
    }).join("");
  }
}

function renderRegBox(containerId, hexId, bitDefs, val, prevVal, regName) {
  const cont = document.getElementById(containerId);
  const hx = document.getElementById(hexId);
  if (hx) hx.textContent = fmtHex(val, 2) + " (" + val.toString(2).padStart(8, "0") + "b)";
  if (!cont) return;
  cont.innerHTML = bitDefs.map(b => {
    const isOn = ((val >> b.bit) & 1) === 1;
    const changed = (((val ^ prevVal) >> b.bit) & 1) === 1;
    const cls = "bit-cell" + (isOn ? (" on " + (b.tone || "ok")) : "") + (changed ? " changed" : "");
    return '<div class="' + cls + '" title="' + escHtml(b.desc) + '" onclick="onClickRegBit(\'' + regName + "'," + b.bit + ')">' +
      '<div class="bit-num">B' + b.bit + "</div>" +
      '<div class="bit-val">' + (isOn ? "1" : "0") + "</div>" +
      '<div class="bit-lbl">' + escHtml(b.short) + "</div>" +
      "</div>";
  }).join("");
}

function renderDualRegisters() {
  if (!sim) return;
  renderRegBox("regABits", "regAHex", DOIP_NODE_ROUTING_BITS, sim.regA, sim.prevRegA, "A");
  renderRegBox("regBBits", "regBHex", DOIP_HEADER_DIAG_BITS, sim.regB, sim.prevRegB, "B");
}

function renderTimersAndStateMachines() {
  if (!sim) return;
  const nodeStates = ["UNINIT", "INACTIVE", "WAIT_IP_ASSIGN", "ANNOUNCE_WAIT", "ONLINE_READY", "SHUTDOWN"];
  const tcpStates = ["SOCKET_CLOSED", "WAIT_ROUTING_ACT", "AUTH_PENDING", "CONF_PENDING", "ROUTING_ACTIVE", "ALIVE_CHECK_WAIT"];

  const sm1Lbl = document.getElementById("smNodeLabel");
  const sm1Pills = document.getElementById("smNodePills");
  if (sm1Lbl) sm1Lbl.textContent = sim.nodeState;
  if (sm1Pills) {
    sm1Pills.innerHTML = nodeStates.map((st, idx) => {
      const act = st === sim.nodeState;
      const cls = act ? (st === "ONLINE_READY" ? "active-ok" : st === "SHUTDOWN" ? "active-err" : "active") : "";
      return (idx > 0 ? '<span class="sm-arr">➔</span>' : "") + '<span class="sm-pill ' + cls + '">' + st + "</span>";
    }).join("");
  }

  const sm2Lbl = document.getElementById("smTcpLabel");
  const sm2Pills = document.getElementById("smTcpPills");
  if (sm2Lbl) sm2Lbl.textContent = sim.tcpState;
  if (sm2Pills) {
    sm2Pills.innerHTML = tcpStates.map((st, idx) => {
      const act = st === sim.tcpState;
      const cls = act ? (st === "ROUTING_ACTIVE" ? "active-ok" : (st === "AUTH_PENDING" || st === "ALIVE_CHECK_WAIT") ? "active-warn" : "active") : "";
      return (idx > 0 ? '<span class="sm-arr">➔</span>' : "") + '<span class="sm-pill ' + cls + '">' + st + "</span>";
    }).join("");
  }

  const sel = sim.tcpConns[sim.selectedSlotIdx] || sim.tcpConns[0];
  const elAnn = document.getElementById("tmrValAnn");
  const bxAnn = document.getElementById("tmrBoxAnn");
  if (elAnn) elAnn.textContent = sim.announceDoneCount + "/" + (Number(cfg.DoIPVehicleAnnounceCount) || 3) + " (" + sim.announceWaitRemainMs + "ms)";
  if (bxAnn) bxAnn.classList.toggle("hot", sim.announceWaitRemainMs > 0);

  const elInit = document.getElementById("tmrValInit");
  const bxInit = document.getElementById("tmrBoxInit");
  if (elInit && sel) elInit.textContent = sel.initTimerMs > 0 ? (sel.initTimerMs + " ms left") : "STOPPED";
  if (bxInit && sel) bxInit.classList.toggle("hot", sel.initTimerMs > 0);

  const elGen = document.getElementById("tmrValGen");
  const bxGen = document.getElementById("tmrBoxGen");
  if (elGen && sel) elGen.textContent = sel.genTimerMs > 0 ? (Math.round(sel.genTimerMs / 1000) + " s left") : "STOPPED";
  if (bxGen && sel) bxGen.classList.toggle("hot", sel.genTimerMs > 0);

  const elAlv = document.getElementById("tmrValAlive");
  const bxAlv = document.getElementById("tmrBoxAlive");
  if (elAlv && sel) elAlv.textContent = sel.aliveTimerMs > 0 ? (sel.aliveTimerMs + " ms WAIT") : "STOPPED";
  if (bxAlv && sel) bxAlv.classList.toggle("hot", sel.aliveTimerMs > 0);
}

function renderSvgArchitecture() {
  if (!sim) return;
  const allMods = ["MOD_SWC", "MOD_RTE", "MOD_DCM", "MOD_PDUR", "MOD_CANTP_GW", "MOD_BSWM", "MOD_DOIP", "MOD_SOAD", "MOD_LOWER_DET"];
  allMods.forEach(m => {
    const el = document.getElementById("node_" + m);
    if (el) el.classList.toggle("selected", m === uiState.selectedModule);
  });
  const selLbl = document.getElementById("svgSelectedBadge");
  if (selLbl) selLbl.textContent = "Selected: " + uiState.selectedModule;

  const arrows = ["arr_bswm_doip", "arr_doip_det", "arr_tester_soad", "arr_soad_doip_rx", "arr_doip_soad_tx", "arr_doip_rte", "arr_rte_swc", "arr_doip_pdur", "arr_pdur_dcm", "arr_dcm_rte", "arr_pdur_cantp"];
  arrows.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const mode = (sim.activeArrows && sim.activeArrows[id]) || "";
    el.setAttribute("class", "svg-arrow" + (mode ? (" " + mode) : ""));
    const marker = mode === "active-cbk" ? "url(#arrOk)" : mode === "active-err" ? "url(#arrErr)" : mode === "active-pur" ? "url(#arrPur)" : mode === "active" ? "url(#arrPri)" : "url(#arrMuted)";
    el.setAttribute("marker-end", marker);
  });

  // Live SVG text badges (sized cleanly inside rects!)
  const bSwc = document.getElementById("svgSwcAuthBadge");
  if (bSwc) {
    const shortAuth = { RTE_SYNC_OK: "SYNC_OK", RTE_ASYNC_PENDING: "PENDING", RTE_DENIED: "DENIED", NONE: "NONE" };
    bSwc.textContent = shortAuth[cfg.DoIPAuthCallbackMode] || "SYNC_OK";
  }
  const bBswm = document.getElementById("svgBswmBadge");
  if (bBswm) bBswm.textContent = "ActLine: " + (sim.actLineActive ? "ACTIVE" : "OFF");
  const bHero = document.getElementById("svgDoipHeroBadge");
  if (bHero) bHero.textContent = "STATE: " + sim.nodeState;
  const bDet = document.getElementById("svgDetBadge");
  if (bDet) bDet.textContent = "DET:" + sim.detEvents + " IdsM:" + sim.idsmEvents;
  const bSoad = document.getElementById("svgSoadBadge");
  if (bSoad) {
    const openCnt = sim.tcpConns.filter(c => c.sockState === "ONLINE").length;
    bSoad.textContent = "IP: " + (sim.ipAssigned ? "ASSIGNED" : "UNASSIGNED") + " | Open SoCon: " + openCnt;
  }
  const bTst = document.getElementById("svgTesterBadge");
  if (bTst) bTst.textContent = "SA=" + cfg.DoIPSourceAddressTester1Hex + (cfg.DoIPEnableTlsPort3496 ? " (TLS:3496)" : " (:13400)");
  const bDcm = document.getElementById("svgDcmBadge");
  if (bDcm) bDcm.textContent = "TA=" + cfg.DoIPLocalDcmTargetHex + (sim.activeArrows.arr_pdur_dcm ? " ACTIVE" : " Idle");
  const bGw = document.getElementById("svgGwBadge");
  if (bGw) bGw.textContent = "TA=" + cfg.DoIPGwCanTpTargetHex + (sim.gwCanTpActive ? " CAN-FD!" : " Ready");
}

// ==================== RIGHT COLUMN 4-TAB INSPECTOR ====================

function selectModule(modId) {
  uiState.selectedModule = modId || "MOD_DOIP";
  if (uiState.inspTab === 0) uiState.inspTab = 1;
  renderSvgArchitecture();
  renderInspector();
}

function switchInspTab(idx) {
  uiState.inspTab = idx;
  renderInspector();
}

function renderInspector() {
  for (let i = 0; i < 4; i++) {
    const b = document.getElementById("inspTab" + i);
    if (b) b.classList.toggle("active", i === uiState.inspTab);
  }
  const body = document.getElementById("inspBody");
  if (!body || !sim) return;

  if (uiState.inspTab === 0) {
    const n = sim.stepNarrative;
    const toneCls = n.tone === "err" ? "sb-err" : n.tone === "warn" ? "sb-warn" : "sb-ok";
    body.innerHTML =
      '<div class="nar-card">' +
      '  <div class="nar-hdr"><div class="nar-title">' + escHtml(n.title) + '</div><span class="nar-badge ' + toneCls + '">' + escHtml(n.resultBadge) + "</span></div>" +
      '  <div class="nar-row"><b>📥 Input Từ Đâu:</b> ' + escHtml(n.inputOrigin) + "</div>" +
      '  <div class="nar-row"><b>⚙️ Cách Xử Lý Của DoIP:</b> ' + escHtml(n.processDetail) + "</div>" +
      '  <div class="nar-row"><b>📤 Output Route Tới:</b> ' + escHtml(n.outputDest) + "</div>" +
      '  <div class="nar-row"><b>🧩 Bit &amp; Trạng Thái Thay Đổi:</b> <span class="mono" style="color:var(--warn);">' + escHtml(n.bitChange) + "</span></div>" +
      '  <div class="nar-api">' + escHtml(n.apiSignature) + "</div>" +
      "</div>" +
      '<div class="nar-card" style="margin-top:8px;">' +
      '  <div style="font-weight:700;font-size:11.5px;margin-bottom:4px;color:var(--pri);">📡 Khung Dữ Liệu DoIP Vừa Xử Lý</div>' +
      '  <div class="mono" style="font-size:10.5px;color:var(--txt2);">' +
      "Dir: " + escHtml(sim.lastFrame.dir) + "<br>" +
      "Hdr: [" + escHtml(sim.lastFrame.protoVer) + " " + escHtml(sim.lastFrame.invVer) + " " + escHtml(sim.lastFrame.payloadType) + " | Len=" + sim.lastFrame.payloadLen + "B]<br>" +
      "Pay: " + escHtml(sim.lastFrame.payloadSummary) + "</div></div>";
  } else if (uiState.inspTab === 1) {
    const m = MODULES_INFO[uiState.selectedModule] || MODULES_INFO.MOD_DOIP;
    body.innerHTML =
      '<div class="nar-card">' +
      '  <div class="nar-hdr"><div class="nar-title">' + escHtml(m.title) + '</div><span class="nar-badge sb-cyan">' + escHtml(m.sws) + "</span></div>" +
      '  <div class="nar-row"><b>Tầng kiến trúc:</b> ' + escHtml(m.layer) + "</div>" +
      '  <div class="nar-row"><b>Vai trò:</b> ' + escHtml(m.role) + "</div>" +
      '  <div class="nar-row"><b>📥 Input Đầu Vào:</b><ul style="padding-left:16px;margin-top:3px;">' + m.inputs.map(x => "<li>" + escHtml(x) + "</li>").join("") + "</ul></div>" +
      '  <div class="nar-row"><b>⚙️ Cơ Chế Xử Lý:</b> ' + escHtml(m.processing) + "</div>" +
      '  <div class="nar-row"><b>📤 Output Đầu Ra:</b><ul style="padding-left:16px;margin-top:3px;">' + m.outputs.map(x => "<li>" + escHtml(x) + "</li>").join("") + "</ul></div>" +
      '  <div class="nar-row"><b>🔌 API Chuẩn AUTOSAR:</b><div style="margin-top:3px;display:flex;flex-wrap:wrap;gap:4px;">' + m.apis.map(a => '<code style="background:var(--bg);border:1px solid var(--bd);padding:2px 5px;border-radius:4px;font-size:10px;color:var(--teal);">' + escHtml(a) + "</code>").join("") + "</div></div>" +
      '  <div class="nar-row" style="margin-top:7px;padding:6px 8px;border-radius:5px;background:rgba(56,189,248,0.08);border-left:3px solid var(--pri);"><b>💡 Lưu ý thực chiến:</b> ' + escHtml(m.notes) + "</div>" +
      "</div>";
  } else if (uiState.inspTab === 2) {
    body.innerHTML =
      '<div class="nar-card">' +
      '  <div style="font-weight:700;font-size:12px;color:var(--pri);margin-bottom:6px;">💻 AUTOSAR C Execution Snippet (SWS_DoIP R23-11)</div>' +
      '  <pre class="code-box">' + escHtml(sim.cCodeSnippet || "/* DoIP Ready */") + "</pre>" +
      "</div>";
  } else {
    if (!sim.trace || sim.trace.length === 0) {
      body.innerHTML = '<div class="nar-card" style="color:var(--txt3);">Chưa có API trace nào. Hãy nhấn [Bước tiếp ▶] hoặc một nút trong Thao Tác Nhanh.</div>';
      return;
    }
    body.innerHTML = '<div class="trace-list">' + sim.trace.map(tr =>
      '<div class="trace-item ' + escHtml(tr.level) + '">' +
      '  <div class="trace-top"><span>t = ' + tr.t + ' ms</span><span style="text-transform:uppercase;">' + escHtml(tr.level) + "</span></div>" +
      '  <div class="trace-api">' + escHtml(tr.api) + "</div>" +
      '  <div style="color:var(--txt2);margin-top:1px;">' + escHtml(tr.detail) + "</div>" +
      "</div>"
    ).join("") + "</div>";
  }
}

// ==================== FLOATING HOVER TOOLTIP (>1020ms LIKE DEM) ====================

function positionTooltip(popup, anchorEl) {
  const rect = anchorEl.getBoundingClientRect();
  const pw = 350;
  let left = rect.right + 10;
  if (left + pw > window.innerWidth - 10) {
    left = Math.max(10, rect.left - pw - 10);
  }
  let top = Math.min(window.innerHeight - 230, Math.max(10, rect.top - 10));
  popup.style.left = left + "px";
  popup.style.top = top + "px";
}

function renderTooltipContent(key) {
  const info = configTooltipData[key];
  const popup = document.getElementById("cfgTooltipPopup");
  if (!info || !popup) return;
  popup.innerHTML =
    '<div class="tt-hdr"><span class="tt-title">' + escHtml(info.title) + '</span><span class="tt-sws">' + escHtml(info.sws) + "</span></div>" +
    '<div class="tt-meta">' + escHtml(info.ecucPath) + "</div>" +
    '<div class="tt-sec"><b>Miền giá trị:</b> <span class="mono">' + escHtml(info.range) + '</span> (Thường: <span class="mono">' + escHtml(info.typical) + "</span>)</div>" +
    '<div class="tt-sec"><b>Vai trò:</b> ' + escHtml(info.role) + "</div>" +
    '<div class="tt-sec"><b>Cơ chế bên trong DoIP:</b> ' + escHtml(info.mechanism) + "</div>" +
    '<div class="tt-sec"><b>Tác động kịch bản:</b> ' + escHtml(info.scenarioImpact) + "</div>";
}

function showCfgTooltipNow(key, anchorEl) {
  const popup = document.getElementById("cfgTooltipPopup");
  if (!popup || !configTooltipData[key]) return;
  renderTooltipContent(key);
  positionTooltip(popup, anchorEl.closest(".cfg-row") || anchorEl);
  popup.classList.add("visible");
  uiState.ttKey = key;
}

function hideCfgTooltip() {
  if (uiState.ttTimer) {
    clearTimeout(uiState.ttTimer);
    uiState.ttTimer = null;
  }
  const popup = document.getElementById("cfgTooltipPopup");
  if (popup) popup.classList.remove("visible");
  uiState.ttKey = null;
}

function initTooltipHandlers() {
  const rows = document.querySelectorAll(".cfg-row[data-cfg-key]");
  rows.forEach(row => {
    const key = row.getAttribute("data-cfg-key");
    row.addEventListener("mouseenter", () => {
      if (uiState.ttTimer) clearTimeout(uiState.ttTimer);
      uiState.ttTimer = setTimeout(() => {
        showCfgTooltipNow(key, row);
      }, 1020);
    });
    row.addEventListener("mouseleave", () => {
      if (uiState.ttTimer) {
        clearTimeout(uiState.ttTimer);
        uiState.ttTimer = null;
      }
      setTimeout(() => {
        const popup = document.getElementById("cfgTooltipPopup");
        if (popup && !popup.matches(":hover") && !row.matches(":hover")) {
          popup.classList.remove("visible");
        }
      }, 140);
    });
  });
  const popup = document.getElementById("cfgTooltipPopup");
  if (popup) {
    popup.addEventListener("mouseleave", hideCfgTooltip);
  }
}

// ==================== EXPORT MODAL & STANDALONE HTML DOWNLOAD ====================

function openExportModal() {
  const m = document.getElementById("exportModal");
  if (m) m.classList.remove("hidden");
  switchExportTab(uiState.exportTab || "arxml");
}

function closeExportModal() {
  const m = document.getElementById("exportModal");
  if (m) m.classList.add("hidden");
}

function getCurrentExportText() {
  if (uiState.exportTab === "h") return generateDoipCfgH();
  if (uiState.exportTab === "c") return generateDoipLcfgC();
  if (uiState.exportTab === "json") return generateDoipJson();
  return generateDoipArxml();
}

function switchExportTab(tab) {
  uiState.exportTab = tab;
  const order = ["arxml", "h", "c", "json"];
  order.forEach((t, i) => {
    const el = document.getElementById("expTab" + i);
    if (el) el.classList.toggle("active", t === tab);
  });
  const pre = document.getElementById("exportCodePre");
  if (pre) pre.textContent = getCurrentExportText();
}

function copyCurrentExport() {
  const txt = getCurrentExportText();
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(txt).catch(() => {});
  }
}

function triggerFileDownload(filename, content, mime) {
  const blob = new Blob([content], { type: mime || "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 150);
}

function downloadCurrentExportFile() {
  const names = { arxml: "DoIP.arxml", h: "DoIP_Cfg.h", c: "DoIP_Lcfg.c", json: "DoIP_Config.json" };
  triggerFileDownload(names[uiState.exportTab] || "DoIP.arxml", getCurrentExportText(), "text/plain;charset=utf-8");
}

function downloadStandaloneHTML() {
  const htmlContent = "<!DOCTYPE html>\n" + document.documentElement.outerHTML;
  triggerFileDownload("AUTOSAR_DoIP.html", htmlContent, "text/html;charset=utf-8");
}
