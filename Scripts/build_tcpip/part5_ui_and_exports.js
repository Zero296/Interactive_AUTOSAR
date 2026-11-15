// ================= PART 5: UI RENDERING, TOOLTIPS, STEPPER & EXPORT ENGINE =================

const uiState = {
  mainView: "sim",
  theme: "dark",
  scenIdx: 0,
  stepIdx: 0,
  snapshots: [],
  autoPlayTimer: null,
  cfgTab: 0,
  inspTab: 0,
  exportTab: 0,
  lastActionNote: "Sẵn sàng mô phỏng",
  validationErrors: []
};

function escHtml(s) {
  return String(s === undefined || s === null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function populateScenarioDropdown() {
  const sel = document.getElementById("scenSelect");
  if (!sel || !Array.isArray(SCENARIOS)) return;
  const groups = {};
  SCENARIOS.forEach(function (sc, i) {
    if (!groups[sc.group]) groups[sc.group] = [];
    groups[sc.group].push({ sc: sc, idx: i });
  });
  let html = "";
  Object.keys(groups).forEach(function (gName) {
    html += '<optgroup label="' + escHtml(gName) + '">';
    groups[gName].forEach(function (item) {
      html += '<option value="' + item.idx + '">' + escHtml(item.sc.title) + "</option>";
    });
    html += "</optgroup>";
  });
  sel.innerHTML = html;
  sel.value = String(uiState.scenIdx);
}

function pushSnapshot(idx) {
  uiState.snapshots[idx] = cloneObj({ cfg: cfg, sim: sim });
}

function restoreSnapshot(idx) {
  const snap = uiState.snapshots[idx];
  if (!snap) return false;
  cfg = cloneObj(snap.cfg);
  sim = cloneObj(snap.sim);
  return true;
}

function loadScenario(idx, runFirstStep) {
  stopAutoPlay();
  uiState.scenIdx = Math.max(0, Math.min(SCENARIOS.length - 1, Number(idx) || 0));
  const sc = SCENARIOS[uiState.scenIdx];
  uiState.snapshots = [];
  sc.setup();
  uiState.stepIdx = 0;
  if (sim) {
    sim.stepNarrative = "<b>Bước 0 (Init State — Trạng thái khởi tạo " + escHtml(sc.id) + "):</b> " + escHtml(sc.summary) +
      '<br><span style="color:var(--cyan)">Nhấn <b>Tiếp ▶</b> (hoặc <b>▶ Tự Chạy</b>) để bắt đầu Bước 1.</span>';
  }
  pushSnapshot(0);
  const sel = document.getElementById("scenSelect");
  if (sel) sel.value = String(uiState.scenIdx);

  if (runFirstStep === true && sc.steps && sc.steps.length > 0) {
    nextScenarioStep();
  } else {
    syncInputsFromConfig();
    renderAll();
  }
}

function onScenarioSelectChange() {
  const sel = document.getElementById("scenSelect");
  if (!sel) return;
  loadScenario(parseInt(sel.value, 10) || 0, false);
}

function resetCurrentScenario() {
  loadScenario(uiState.scenIdx, false);
}

function nextScenarioStep() {
  const sc = SCENARIOS[uiState.scenIdx];
  if (!sc || !sc.steps) return;
  if (uiState.stepIdx >= sc.steps.length) {
    stopAutoPlay();
    return;
  }
  const next = uiState.stepIdx + 1;
  if (restoreSnapshot(next)) {
    uiState.stepIdx = next;
  } else {
    const stepObj = sc.steps[next - 1];
    if (stepObj && typeof stepObj.run === "function") {
      stepObj.run();
    }
    uiState.stepIdx = next;
    pushSnapshot(next);
  }
  syncInputsFromConfig();
  renderAll();
}

function prevScenarioStep() {
  stopAutoPlay();
  if (uiState.stepIdx <= 0) return;
  const prev = uiState.stepIdx - 1;
  if (restoreSnapshot(prev)) {
    uiState.stepIdx = prev;
    syncInputsFromConfig();
    renderAll();
  }
}

function stopAutoPlay() {
  if (uiState.autoPlayTimer) {
    clearInterval(uiState.autoPlayTimer);
    uiState.autoPlayTimer = null;
  }
  const btn = document.getElementById("btnAutoPlay");
  if (btn) btn.textContent = "▶ Auto";
}

function toggleScenarioAutoPlay() {
  const btn = document.getElementById("btnAutoPlay");
  if (uiState.autoPlayTimer) {
    stopAutoPlay();
    return;
  }
  const sc = SCENARIOS[uiState.scenIdx];
  if (sc && uiState.stepIdx >= sc.steps.length) {
    loadScenario(uiState.scenIdx, false);
  }
  if (btn) btn.textContent = "⏸ Pause";
  uiState.autoPlayTimer = setInterval(function () {
    const cur = SCENARIOS[uiState.scenIdx];
    if (!cur || uiState.stepIdx >= cur.steps.length) {
      stopAutoPlay();
      return;
    }
    nextScenarioStep();
  }, 1500);
}

// ---------- View, Theme & Tabs ----------

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
  if (uiState.mainView === "hb" && typeof renderCurrentHandbookView === "function") {
    renderCurrentHandbookView();
  }
}

function toggleTheme() {
  const html = document.documentElement;
  const isLight = html.getAttribute("data-theme") === "light";
  const next = isLight ? "dark" : "light";
  html.setAttribute("data-theme", next);
  uiState.theme = next;
  const btn = document.getElementById("btnTheme");
  if (btn) btn.textContent = next === "light" ? "☀️ Light" : "🌙 Dark";
}

function switchCfgTab(idx) {
  uiState.cfgTab = Number(idx) || 0;
  for (let i = 0; i < 6; i++) {
    const btn = document.getElementById("cfgTabBtn" + i);
    const pane = document.getElementById("cfgPane" + i);
    if (btn) btn.classList.toggle("active", i === uiState.cfgTab);
    if (pane) pane.classList.toggle("hidden", i !== uiState.cfgTab);
  }
}

function switchInspTab(idx) {
  uiState.inspTab = Number(idx) || 0;
  for (let i = 0; i < 4; i++) {
    const btn = document.getElementById("inspTabBtn" + i);
    if (btn) btn.classList.toggle("active", i === uiState.inspTab);
  }
  renderInspector();
}

// ---------- ECUC Inputs 2-Way Sync & Validation ----------

function syncInputsFromConfig() {
  Object.keys(defaultConfig).forEach(function (k) {
    const el = document.getElementById("cfg_" + k);
    if (!el) return;
    const val = cfg[k];
    if (el.type === "checkbox") {
      el.checked = Boolean(val);
    } else {
      el.value = String(val !== undefined && val !== null ? val : "");
    }
  });
  const qaSock = document.getElementById("qaSocketSelect");
  if (qaSock && cfg.SelectedSocketProfile !== undefined) {
    qaSock.value = String(cfg.SelectedSocketProfile);
  }
  validateConfigRules();
}

function validateConfigRules() {
  const errs = [];
  if (Number(cfg.TcpIpCtrlMtu) < 256 || Number(cfg.TcpIpCtrlMtu) > 9000) {
    errs.push("TcpIpCtrlMtu phải nằm trong [256..9000] bytes (khuyến nghị 576 hoặc 1500).");
  }
  if (Number(cfg.TcpIpCtrlFramePrioDefault) < 0 || Number(cfg.TcpIpCtrlFramePrioDefault) > 7) {
    errs.push("VLAN Priority PCP chỉ hợp lệ từ 0..7 theo chuẩn IEEE 802.1Q.");
  }
  if (Number(cfg.TxPayloadByteLength) > Number(cfg.TcpIpCtrlMtu) - 28 && cfg.SetIpDontFragmentFlagDf) {
    errs.push("Chú ý: TxPayload (" + cfg.TxPayloadByteLength + "B) > MTU (" + cfg.TcpIpCtrlMtu + "B) khi DF=1 sẽ chặn truyền UDP (chỉ cắt đoạn trên TCP)!");
  }
  uiState.validationErrors = errs;
  const box = document.getElementById("cfgValidationBox");
  if (box) {
    if (errs.length) {
      box.classList.remove("hidden");
      box.innerHTML = errs.map(function (e) { return "• " + escHtml(e); }).join("<br>");
    } else {
      box.classList.add("hidden");
      box.innerHTML = "";
    }
  }
}

function onConfigInputChanged(key) {
  const el = document.getElementById("cfg_" + key);
  if (!el || !sim) return;
  let newVal;
  if (el.type === "checkbox") {
    newVal = el.checked;
  } else if (el.type === "number") {
    newVal = parseFloat(el.value);
    if (isNaN(newVal)) newVal = defaultConfig[key];
  } else {
    newVal = el.value;
  }
  cfg[key] = newVal;

  if (key === "ActiveCtrlState") {
    api_TcpIp_RequestComMode(0, String(newVal));
  } else if (key === "SimulateArpCacheMiss") {
    sim.arpHit = !Boolean(newVal);
    updateRegistersAfter();
  } else if (key === "SetIpDontFragmentFlagDf") {
    sim.flagDf = newVal ? 1 : 0;
    updateRegistersAfter();
  } else if (key === "TcpIpCtrlMtu") {
    sim.lastHeader.mss = getMssFromMtu();
  } else if (key === "TcpIpCtrlFramePrioDefault") {
    sim.sockets.forEach(function (s) { s.framePrio = Number(newVal) || 4; });
    sim.lastHeader.pcp = Number(newVal) || 4;
  } else if (key === "TcpIpAssignmentMethod") {
    api_TcpIp_RequestIpAddrAssignment(Number(cfg.SelectedLocalAddrId) || 0, String(newVal));
  } else if (key === "SelectedSocketProfile") {
    const qaSock = document.getElementById("qaSocketSelect");
    if (qaSock) qaSock.value = String(newVal);
  } else if (key === "TcpIpTlsConnectionEnabled") {
    sim.sockets[3].tlsAssigned = Boolean(newVal);
  }

  validateConfigRules();
  renderAll();
}

// ---------- Header & Quick Actions ----------

function onQaTargetChanged(which) {
  if (which === "sock") {
    const sel = document.getElementById("qaSocketSelect");
    if (sel) {
      cfg.SelectedSocketProfile = sel.value;
      const cfgSel = document.getElementById("cfg_SelectedSocketProfile");
      if (cfgSel) cfgSel.value = sel.value;
      const p = SOCKETS_PRESET[sel.value];
      if (p) {
        cfg.RemoteIpAndPortEndpoint = p.remoteIp + ":" + p.remotePort;
      }
    }
    syncInputsFromConfig();
    renderAll();
  }
}

function getActiveQaSockId() {
  const sel = document.getElementById("qaSocketSelect");
  return sel ? parseInt(sel.value, 10) || 0 : (parseInt(cfg.SelectedSocketProfile, 10) || 0);
}

function qaGetSocketAndBind() {
  const id = getActiveQaSockId();
  api_TcpIp_SoAdGetSocket(id);
  api_TcpIp_Bind(id);
  renderAll();
}

function qaTcpConnectOrListen() {
  const id = getActiveQaSockId();
  const s = getSock(id);
  if (s.proto !== "TCP") {
    api_TcpIp_Bind(id);
  } else if (id === 3 && s.state === "CLOSED" && !cfg.TcpIpTlsConnectionEnabled) {
    api_TcpIp_TcpListen(id, 2);
  } else if (s.state === "LISTEN") {
    api_ServerAcceptIncomingSyn(id, 0, false);
  } else {
    api_TcpIp_TcpConnect(id, cfg.RemoteIpAndPortEndpoint);
  }
  renderAll();
}

function qaTcpTransmit() {
  let id = getActiveQaSockId();
  if (getSock(id).proto !== "TCP") id = 0;
  if (getSock(id).state !== "ESTABLISHED") {
    getSock(id).state = "ESTABLISHED";
  }
  api_TcpIp_TcpTransmit(id, cfg.TxPayloadByteLength);
  renderAll();
}

function qaUdpTransmit() {
  let id = getActiveQaSockId();
  if (getSock(id).proto !== "UDP") id = 1;
  api_TcpIp_UdpTransmit(id, cfg.TxPayloadByteLength);
  renderAll();
}

function qaRxIndication() {
  const sel = document.getElementById("qaRxFrameSelect");
  const key = sel ? sel.value : "TCP_SYN_ACK";
  api_TcpIp_RxIndication(key, { sockId: getActiveQaSockId() });
  renderAll();
}

function qaTcpReceivedOrChangeParam() {
  const id = getActiveQaSockId();
  const s = getSock(id);
  if (s.proto === "TCP" && s.rxWindow < Number(cfg.TcpIpTcpReceiveWindowMax)) {
    api_TcpIp_TcpReceived(id, 1024);
  } else {
    api_TcpIp_ChangeParameter(id, cfg.ChangeParamIdSelector);
  }
  renderAll();
}

function qaCloseSocket() {
  const id = getActiveQaSockId();
  api_TcpIp_Close(id, cfg.TcpCloseAbortWithRst);
  renderAll();
}

function onActionModeChange() {
  const sel = document.getElementById("qaActionMode");
  const lbl = document.getElementById("qaTxtFaultKind");
  if (!sel || !lbl) return;
  const map = {
    CYCLE_COM_MODE: "MODE",
    TOGGLE_ARP_MISS: "ARP",
    MAIN_FUNCTION_TICK: "TICK",
    SYN_FLOOD_IDSM: "IDSM",
    DET_FAULT_TEST: "DET",
    VER_INFO: "VER"
  };
  lbl.textContent = map[sel.value] || "ACT";
}

function qaInjectAction() {
  const sel = document.getElementById("qaActionMode");
  const mode = sel ? sel.value : "CYCLE_COM_MODE";
  if (mode === "CYCLE_COM_MODE") {
    const order = ["TCPIP_STATE_ONLINE", "TCPIP_STATE_ONHOLD", "TCPIP_STATE_OFFLINE"];
    const next = order[(order.indexOf(sim.ctrlState) + 1) % order.length];
    sim.phyLinkUp = next !== "TCPIP_STATE_ONHOLD";
    api_TcpIp_RequestComMode(0, next);
  } else if (mode === "TOGGLE_ARP_MISS") {
    toggleArpMissQuick();
    return;
  } else if (mode === "MAIN_FUNCTION_TICK") {
    api_TcpIp_MainFunction();
  } else if (mode === "SYN_FLOOD_IDSM") {
    api_InjectSynFlood();
  } else if (mode === "DET_FAULT_TEST") {
    api_InjectDetFault();
  } else if (mode === "VER_INFO") {
    api_TcpIp_GetVersionInfo();
  }
  syncInputsFromConfig();
  renderAll();
}

function hdrInjectEthRx() {
  qaRxIndication();
}

function hdrTickMainFunction() {
  api_TcpIp_MainFunction();
  renderAll();
}

function hdrTogglePhyLink() {
  togglePhyLinkQuick();
}

function hdrInjectSynFlood() {
  api_InjectSynFlood();
  renderAll();
}

function togglePhyLinkQuick() {
  if (!sim) return;
  sim.phyLinkUp = !sim.phyLinkUp;
  api_TcpIp_RequestComMode(0, sim.phyLinkUp ? "TCPIP_STATE_ONLINE" : "TCPIP_STATE_ONHOLD");
  syncInputsFromConfig();
  renderAll();
}

function toggleArpMissQuick() {
  cfg.SimulateArpCacheMiss = !cfg.SimulateArpCacheMiss;
  if (sim) {
    sim.arpHit = !cfg.SimulateArpCacheMiss;
    updateRegistersAfter();
  }
  syncInputsFromConfig();
  renderAll();
}

// ---------- Center Renderers ----------

function renderHeaderAndLeftCard2() {
  const sc = SCENARIOS[uiState.scenIdx];
  const stepInd = document.getElementById("stepIndicator");
  if (stepInd && sc) {
    stepInd.textContent = "Bước " + uiState.stepIdx + " / " + sc.steps.length;
  }
  const btnPrev = document.getElementById("btnPrevStep");
  const btnNext = document.getElementById("btnNextStep");
  if (btnPrev) btnPrev.disabled = uiState.stepIdx <= 0;
  if (btnNext && sc) btnNext.disabled = uiState.stepIdx >= sc.steps.length;
  const clk = document.getElementById("clockVal");
  if (clk && sim) clk.textContent = sim.clockMs + " ms";

  const bCtrl = document.getElementById("hdrBadgeCtrl");
  if (bCtrl && sim) {
    const shortSt = sim.ctrlState.replace("TCPIP_STATE_", "");
    bCtrl.textContent = "Ctrl: " + shortSt;
    bCtrl.className = "state-badge mono " + (sim.ctrlState === "TCPIP_STATE_ONLINE" ? "sb-ok" : (sim.ctrlState === "TCPIP_STATE_ONHOLD" ? "sb-warn" : "sb-err"));
  }
  const bIp = document.getElementById("hdrBadgeIp");
  if (bIp && sim) {
    const la = sim.localAddrs[0];
    bIp.textContent = "IP: " + (la ? la.ip : "0.0.0.0") + (la && la.state === "TCPIP_IPADDR_STATE_ASSIGNED" ? " (ASSGN)" : (la && la.state === "TCPIP_IPADDR_STATE_ONHOLD" ? " (HOLD)" : " (NONE)"));
    bIp.className = "state-badge mono " + (sim.ipAssigned ? "sb-cyan" : "sb-warn");
  }
  const bTcp = document.getElementById("hdrBadgeTcp");
  if (bTcp && sim) {
    const s = getSock(getActiveQaSockId());
    bTcp.textContent = "Sock" + s.socketId + ": " + s.state + (s.tlsHandshakeDone ? "🔒" : "");
    bTcp.className = "state-badge mono " + (s.state === "ESTABLISHED" || s.state === "BOUND" ? "sb-pur" : (s.state === "CLOSED" ? "sb-warn" : "sb-cyan"));
  }
  const bArp = document.getElementById("hdrBadgeArp");
  if (bArp && sim) {
    bArp.textContent = "ARP: " + (sim.arpHit ? "HIT" : "MISS(" + sim.arpPendingQueue.length + ")");
    bArp.className = "state-badge mono " + (sim.arpHit ? "sb-ok" : "sb-err");
  }

  const scenBadge = document.getElementById("scenIdBadge");
  if (scenBadge && sc) scenBadge.textContent = sc.id;
  const scenBox = document.getElementById("scenSummaryBox");
  if (scenBox && sc) {
    const curStepObj = uiState.stepIdx > 0 ? sc.steps[uiState.stepIdx - 1] : null;
    scenBox.innerHTML = '<div><b>' + escHtml(sc.title) + '</b></div>' +
      '<div style="margin-top:3px">' + escHtml(sc.summary) + '</div>' +
      (curStepObj
        ? '<div style="margin-top:4px;color:var(--cyan);font-weight:700">▶ ' + escHtml(curStepObj.label) + '</div>'
        : '<div style="margin-top:4px;color:var(--ok);font-weight:700">⏸ Bước 0 (Init State): Sẵn sàng — bấm «Tiếp ▶» để chạy Bước 1</div>');
  }
  const wiBox = document.getElementById("whatIfContainer");
  if (wiBox && sc && sc.whatIfs) {
    wiBox.innerHTML = sc.whatIfs.map(function (w, idx) {
      return '<button class="whatif-btn" onclick="runScenarioWhatIf(' + idx + ')">' + escHtml(w.label) + '</button>';
    }).join("");
  }
}

function runScenarioWhatIf(wIdx) {
  const sc = SCENARIOS[uiState.scenIdx];
  if (!sc || !sc.whatIfs || !sc.whatIfs[wIdx]) return;
  sc.whatIfs[wIdx].run();
  syncInputsFromConfig();
  renderAll();
}

function renderPktHeaderAndTables() {
  if (!sim) return;
  const btnPhy = document.getElementById("btnTogglePhyLink");
  if (btnPhy) {
    btnPhy.textContent = sim.phyLinkUp ? "🔌 PHY: UP" : "🔌 PHY: DOWN (ONHOLD)";
  }
  const btnArp = document.getElementById("btnToggleArpMiss");
  if (btnArp) {
    btnArp.textContent = cfg.SimulateArpCacheMiss ? "🧭 ARP: MISS" : "🧭 ARP: HIT";
  }

  const h = sim.lastHeader;
  const pktBox = document.getElementById("pktAnatomyBox");
  if (pktBox) {
    pktBox.innerHTML =
      '<div class="pkt-top">' +
        '<span class="mono" style="font-size:11px;font-weight:800;color:var(--pri)">📦 PACKET DECODER [' + escHtml(h.dir) + '] — ' + escHtml(h.proto) + '</span>' +
        '<span class="pill ' + (sim.tlsActive ? "pill-pur" : "pill-cyan") + ' mono">' + escHtml(h.flagsStr) + (sim.tlsActive ? " · TLS🔒" : "") + '</span>' +
      '</div>' +
      '<div class="pkt-fields">' +
        '<div class="pkt-cell"><div class="pkt-cell-lbl">L2 ETH + 802.1Q VLAN</div><div class="pkt-cell-val mono">' + escHtml(h.etherType) + ' · VID=' + h.vlanId + ' PCP=' + h.pcp + '</div></div>' +
        '<div class="pkt-cell"><div class="pkt-cell-lbl">L3 IPv4 (' + escHtml(h.ipSrc) + ' ➔ ' + escHtml(h.ipDst) + ')</div><div class="pkt-cell-val mono">TTL=' + h.ttl + ' DF=' + h.df + ' MF=' + h.mf + ' Off=' + h.fragOff + ' ID=' + escHtml(h.fragId) + '</div></div>' +
        '<div class="pkt-cell"><div class="pkt-cell-lbl">L4 ' + escHtml(h.proto) + ' (Port ' + escHtml(h.srcPort) + ' ➔ ' + escHtml(h.dstPort) + ')</div><div class="pkt-cell-val mono">Seq=' + escHtml(h.seq) + ' Win=' + h.win + ' MSS=' + h.mss + '</div></div>' +
        '<div class="pkt-cell"><div class="pkt-cell-lbl">PAYLOAD (' + h.payloadBytes + 'B) &amp; CSUM</div><div class="pkt-cell-val mono">' + escHtml(h.payloadHex) + '</div></div>' +
      '</div>' +
      (sim.lastFragList && sim.lastFragList.length > 0
        ? '<div style="margin-top:5px;font-size:10px;color:var(--warn)" class="mono"><b>Phân mảnh IPv4:</b> ' +
          sim.lastFragList.map(function (f) { return "Frag#" + f.idx + "(" + f.ipTotalLen + "B,MF=" + f.mf + ",Off=" + f.fragOffset + ")"; }).join(" | ") + '</div>'
        : '') +
      '<div style="margin-top:4px;font-size:10.5px;color:var(--txt-soft)">' + escHtml(h.note) + '</div>';
  }

  const sockBox = document.getElementById("socketTableBox");
  if (sockBox) {
    const activeId = getActiveQaSockId();
    sockBox.innerHTML = '<div class="net-hdr"><span>🧦 TcpIp_SocketTable[0..3] (Static Zero-Heap)</span><span class="mono" style="color:var(--mut)">MSS=' + getMssFromMtu() + 'B</span></div>' +
      sim.sockets.map(function (s) {
        const pillCls = (s.state === "ESTABLISHED" || s.state === "BOUND") ? "pill-ok" : (s.state === "CLOSED" ? "pill-mut" : (s.state === "LISTEN" ? "pill-pur" : "pill-warn"));
        return '<div class="sock-row ' + (s.socketId === activeId ? "selected " : "") + (s.tlsAssigned ? "tls" : "") + '" onclick="selectSocketFromTable(' + s.socketId + ')">' +
          '<div><b class="mono">Sock_' + s.socketId + '</b> <span style="color:var(--mut)">' + escHtml(s.proto) + (s.tlsHandshakeDone ? "🔒" : "") + '</span><br>' +
          '<span class="mono" style="font-size:9.5px;color:var(--mut)">' + escHtml(s.localIp) + ':' + s.localPort + ' ↔ ' + escHtml(s.remoteIp) + ':' + s.remotePort + '</span></div>' +
          '<div style="text-align:right"><span class="pill ' + pillCls + ' mono">' + escHtml(s.state) + '</span><br>' +
          '<span class="mono" style="font-size:9px;color:var(--mut)">Win=' + s.rxWindow + ' · PCP=' + s.framePrio + '</span></div>' +
        '</div>';
      }).join("");
  }

  const arpBox = document.getElementById("arpIpBox");
  if (arpBox) {
    const laHtml = sim.localAddrs.map(function (a) {
      const stCls = a.state === "TCPIP_IPADDR_STATE_ASSIGNED" ? "pill-ok" : (a.state === "TCPIP_IPADDR_STATE_ONHOLD" ? "pill-warn" : "pill-mut");
      return '<div class="arp-row hit"><b class="mono">LA_' + a.localAddrId + '</b> ' + escHtml(a.ip) +
        ' <span class="pill ' + stCls + ' mono">' + escHtml(a.state.replace("TCPIP_IPADDR_STATE_", "")) + '</span></div>';
    }).join("");
    const arpHtml = sim.arpCache.map(function (e) {
      const missCls = (cfg.SimulateArpCacheMiss && e.ip === "192.168.10.200") ? "miss" : "hit";
      return '<div class="arp-row ' + missCls + ' mono">' + escHtml(e.ip) + ' ➔ ' + escHtml(e.mac) + ' [' + (missCls === "miss" ? "FORCED MISS" : e.state) + ']</div>';
    }).join("");
    const qHtml = '<div style="font-size:10px;color:' + (sim.arpPendingQueue.length ? "var(--warn)" : "var(--mut)") + '" class="mono">' +
      'ArpPendingQueue: <b>' + sim.arpPendingQueue.length + ' pkt(s)</b>' +
      (sim.arpPendingQueue.length ? ' (chờ ARP ' + escHtml(sim.arpPendingQueue[0].dstIp) + ')' : '') + '</div>';
    arpBox.innerHTML = '<div class="net-hdr"><span>🧭 LocalAddr &amp; ARP/NDP Cache</span><span class="mono" style="color:var(--cyan)">ID=0x4A12</span></div>' +
      laHtml + arpHtml + qHtml;
  }
}

function selectSocketFromTable(sockId) {
  const qa = document.getElementById("qaSocketSelect");
  if (qa) qa.value = String(sockId);
  cfg.SelectedSocketProfile = String(sockId);
  syncInputsFromConfig();
  renderAll();
}

function renderDualRegisters() {
  if (!sim) return;
  const hA = document.getElementById("regAHex");
  if (hA) hA.textContent = hexByte(sim.regA);
  const bA = document.getElementById("regABits");
  if (bA) {
    bA.innerHTML = TCPIP_CTRL_IP_BITS.map(function (b) {
      const isOn = Boolean(sim.regA & b.mask);
      const cls = isOn ? (b.tone === "warn" ? "on-warn" : (b.tone === "err" ? "on-err" : (b.tone === "cyan" ? "on-cyan" : (b.tone === "pur" ? "on-pur" : "on")))) : "";
      return '<div class="bit-box ' + cls + '" title="' + escHtml(b.desc) + '" onclick="onClickRegBit(\'A\',' + b.bit + ')">' +
        '<div class="bit-idx mono">b' + b.bit + '</div>' +
        '<div class="bit-val mono">' + (isOn ? "1" : "0") + '</div>' +
        '<div class="bit-tag mono">' + escHtml(b.tag) + '</div>' +
      '</div>';
    }).join("");
  }

  const hB = document.getElementById("regBHex");
  if (hB) hB.textContent = hexByte(sim.regB);
  const bB = document.getElementById("regBBits");
  if (bB) {
    bB.innerHTML = TCPIP_TCP_IP_FLAGS_BITS.map(function (b) {
      const isOn = Boolean(sim.regB & b.mask);
      const cls = isOn ? (b.tone === "warn" ? "on-warn" : (b.tone === "err" ? "on-err" : (b.tone === "cyan" ? "on-cyan" : (b.tone === "pur" ? "on-pur" : "on")))) : "";
      return '<div class="bit-box ' + cls + '" title="' + escHtml(b.desc) + '" onclick="onClickRegBit(\'B\',' + b.bit + ')">' +
        '<div class="bit-idx mono">b' + b.bit + '</div>' +
        '<div class="bit-val mono">' + (isOn ? "1" : "0") + '</div>' +
        '<div class="bit-tag mono">' + escHtml(b.tag) + '</div>' +
      '</div>';
    }).join("");
  }
}

function renderTimersAndStateMachines() {
  if (!sim) return;
  const s = getSock(getActiveQaSockId());
  const maxWin = Math.max(1, Number(cfg.TcpIpTcpReceiveWindowMax) || 4096);
  const winPct = Math.round((s.rxWindow / maxWin) * 100);
  const maxRto = Math.max(1, Number(cfg.TcpIpTcpRetransmissionTimeoutMs) || 200);
  const rtoPct = s.unackedLen > 0 ? Math.min(100, Math.round((s.rtoRemainingMs / maxRto) * 100)) : 0;

  const badge2 = document.getElementById("tcpipPanel2Badge");
  if (badge2) {
    badge2.textContent = "Tx:" + sim.counters.txOk + " Rx:" + sim.counters.rxOk + " Frag:" + sim.counters.fragmentsSent + " DET:" + sim.counters.detErrors + " IdsM:" + sim.counters.idsmEvents;
  }

  const tg = document.getElementById("timersGrid");
  if (tg) {
    tg.innerHTML =
      '<div class="timer-card"><div class="timer-top"><span>🪟 TCP Rx Window</span><span class="mono">' + s.rxWindow + '/' + maxWin + 'B</span></div>' +
      '<div class="timer-bar"><div class="timer-fill ' + (s.rxWindow === 0 ? "err" : "ok") + '" style="width:' + winPct + '%"></div></div></div>' +
      '<div class="timer-card"><div class="timer-top"><span>⏱️ TCP RTO Timer</span><span class="mono">' + s.rtoRemainingMs + 'ms (Rtx ' + s.rtxCount + '/' + cfg.TcpIpTcpMaxRtx + ')</span></div>' +
      '<div class="timer-bar"><div class="timer-fill warn" style="width:' + rtoPct + '%"></div></div></div>' +
      '<div class="timer-card"><div class="timer-top"><span>🧩 IP Frags / Reasm</span><span class="mono">Sent ' + sim.counters.fragmentsSent + ' / Ok ' + sim.counters.fragmentsReassembled + '</span></div>' +
      '<div class="timer-bar"><div class="timer-fill cyan" style="width:' + Math.min(100, (sim.counters.fragmentsSent + sim.counters.fragmentsReassembled) * 20) + '%"></div></div></div>' +
      '<div class="timer-card"><div class="timer-top"><span>🛡️ IdsM / DEM / DET</span><span class="mono">' + sim.counters.idsmEvents + ' / ' + sim.counters.demEvents + ' / ' + sim.counters.detErrors + '</span></div>' +
      '<div class="timer-bar"><div class="timer-fill ' + ((sim.counters.idsmEvents + sim.counters.detErrors + sim.counters.demEvents) > 0 ? "err" : "pur") + '" style="width:' + ((sim.counters.idsmEvents + sim.counters.detErrors + sim.counters.demEvents) > 0 ? "100" : "15") + '%"></div></div></div>';
  }

  const smCtrlLbl = document.getElementById("smCtrlLbl");
  if (smCtrlLbl) smCtrlLbl.textContent = sim.ctrlState;
  const ctrlBox = document.getElementById("ctrlSmDiagram");
  if (ctrlBox) {
    const cStates = [
      { st: "TCPIP_STATE_OFFLINE",  name: "OFFLINE",  sub: "IP Unassigned · All Sockets Closed", cls: "active-deact" },
      { st: "TCPIP_STATE_STARTUP",  name: "STARTUP",  sub: "AutoIP Probe / DHCP DORA Discovery", cls: "active-cyan" },
      { st: "TCPIP_STATE_ONLINE",   name: "ONLINE",   sub: "Tx/Rx Socket Hoạt Động Đầy Đủ (Bit 7=1)", cls: "active-ok" },
      { st: "TCPIP_STATE_ONHOLD",   name: "ONHOLD",   sub: "Mất Link Tạm — Giữ IP & TCP Sock (Bit 6=1)", cls: "active-warn" },
      { st: "TCPIP_STATE_SHUTDOWN", name: "SHUTDOWN", sub: "Đóng Socket & Giải Phóng Bộ Đệm", cls: "active-err" }
    ];
    ctrlBox.innerHTML = '<div class="sm-states">' + cStates.map(function (c) {
      const act = sim.ctrlState === c.st ? c.cls : "";
      const clickTarget = (c.st === "TCPIP_STATE_STARTUP" || c.st === "TCPIP_STATE_SHUTDOWN") ? "TCPIP_STATE_ONLINE" : c.st;
      return '<div class="sm-node ' + act + '" onclick="api_TcpIp_RequestComMode(0,\'' + clickTarget + '\');syncInputsFromConfig();renderAll();">' +
        '<div class="sm-node-hdr"><span class="mono">' + c.name + '</span><span class="mono">' + (sim.ctrlState === c.st ? "● ACTIVE" : "") + '</span></div>' +
        '<div class="sm-node-sub">' + c.sub + '</div></div>';
    }).join("") + '</div>';
  }

  const smTcpLbl = document.getElementById("smTcpLbl");
  if (smTcpLbl) smTcpLbl.textContent = "Sock_" + s.socketId + ": " + s.state;
  const tcpBox = document.getElementById("tcpSmDiagram");
  if (tcpBox) {
    const tStates = [
      "CLOSED", "LISTEN", "SYN_SENT",
      "SYN_RCVD", "ESTABLISHED", "FIN_WAIT_1",
      "FIN_WAIT_2", "TIME_WAIT", "CLOSE_WAIT",
      "LAST_ACK", "CLOSING", "BOUND"
    ];
    tcpBox.innerHTML = '<div class="sm-states-grid3">' + tStates.map(function (ts) {
      const isAct = s.state === ts;
      const actCls = isAct ? (ts === "ESTABLISHED" || ts === "BOUND" ? "active-ok" : (ts === "CLOSED" ? "active-deact" : (ts === "LISTEN" ? "active-pur" : "active-warn"))) : "";
      return '<div class="sm-node ' + actCls + '"><div class="sm-node-hdr"><span class="mono" style="font-size:9px">' + ts + '</span></div></div>';
    }).join("") + '</div>';
  }
}

function renderSvgArchitecture() {
  if (!sim) return;
  const allArrows = [
    "arr_swc_rte", "arr_rte_ethsm", "arr_rte_upper", "arr_upper_soad",
    "arr_soad_tcpip", "arr_tcpip_soad", "arr_ethsm_tcpip",
    "arr_tcpip_sec", "arr_tcpip_diag", "arr_tcpip_ethif",
    "arr_ethif_tcpip", "arr_ethif_eth", "arr_eth_bus"
  ];
  allArrows.forEach(function (id) {
    const el = document.getElementById(id);
    if (!el) return;
    const isAct = sim.activeArrows.indexOf(id) !== -1;
    el.setAttribute("class", "flow-arrow" + (isAct ? (id.indexOf("diag") !== -1 && sim.errFlag ? " active-err" : (id.indexOf("tcpip_soad") !== -1 || id.indexOf("ethif_tcpip") !== -1 ? " active-cbk" : " active")) : ""));
  });

  const allMods = ["MOD_SWC", "MOD_RTE", "MOD_ETHSM", "MOD_UPPER", "MOD_SOAD", "MOD_SEC", "MOD_TCPIP", "MOD_DIAG", "MOD_ETHIF", "MOD_ETH"];
  allMods.forEach(function (m) {
    const el = document.getElementById("node_" + m);
    if (!el) return;
    el.classList.toggle("selected", sim.selectedModule === m);
  });

  const t1 = document.getElementById("svgSub_MOD_TCPIP1");
  if (t1) t1.textContent = "Ctrl:" + sim.ctrlState.replace("TCPIP_STATE_", "") + " · IP:" + (sim.localAddrs[0] ? sim.localAddrs[0].ip : "-");
  const t2 = document.getElementById("svgSub_MOD_TCPIP2");
  if (t2) {
    const s = getSock(getActiveQaSockId());
    t2.textContent = "Sock" + s.socketId + ":" + s.state + " | ARP:" + (sim.arpHit ? "HIT" : "MISS(" + sim.arpPendingQueue.length + ")") + " | RegA=" + hexByte(sim.regA);
  }
  const busTxt = document.getElementById("svgBusLineTxt");
  if (busTxt) {
    busTxt.textContent = "Automotive Ethernet Bus — " + sim.lastHeader.dir + ": " + sim.lastHeader.proto + " (" + sim.lastHeader.flagsStr + ") | Link: " + (sim.phyLinkUp ? "UP" : "DOWN");
  }
  const secTxt = document.getElementById("svgSub_MOD_SEC");
  if (secTxt) secTxt.textContent = sim.tlsActive ? "TLS 1.3 ACTIVE 🔒" : "KeyM / Csm Ready";
  const diagTxt = document.getElementById("svgSub_MOD_DIAG");
  if (diagTxt) diagTxt.textContent = "DET:" + sim.counters.detErrors + " DEM:" + sim.counters.demEvents + " IdsM:" + sim.counters.idsmEvents;
}

function selectModule(modId) {
  if (!sim) return;
  sim.selectedModule = modId;
  uiState.inspTab = 1;
  switchInspTab(1);
  renderSvgArchitecture();
}

function renderInspector() {
  const box = document.getElementById("inspBody");
  if (!box || !sim) return;
  const tab = uiState.inspTab;

  if (tab === 0) {
    const sc = SCENARIOS[uiState.scenIdx];
    const stepObj = uiState.stepIdx > 0 && sc ? sc.steps[uiState.stepIdx - 1] : null;
    const stepHdr = uiState.stepIdx === 0
      ? "📍 Bước 0 (Init State) — " + (sc ? sc.id : "")
      : "📍 Phân Tích Bước " + uiState.stepIdx + " / " + (sc ? sc.steps.length : 0) + " — " + (sc ? sc.id : "");
    box.innerHTML =
      '<div class="insp-card"><div class="insp-h">' + escHtml(stepHdr) + '</div>' +
      (stepObj ? '<div style="font-weight:700;color:var(--cyan);margin-bottom:4px">' + escHtml(stepObj.label) + '</div>' : '') +
      '<div style="font-size:12px;line-height:1.55">' + sim.stepNarrative + '</div></div>' +
      '<div class="insp-card"><div class="insp-h">🔢 Giải Mã 2 Thanh Ghi 8-Bit</div>' +
      '<div class="mono" style="font-size:11px;line-height:1.5">RegA (Ctrl/IP/Sec) = <b>' + hexByte(sim.regA) + '</b><br>' +
      'RegB (IP/TCP Flags) = <b>' + hexByte(sim.regB) + '</b></div></div>' +
      '<div class="insp-card"><div class="insp-h">🛡️ Trạng Thái DET / DEM / IdsM</div>' +
      '<div style="font-size:11px;line-height:1.5"><b>DET (170):</b> ' + escHtml(sim.lastDet.errId) + ' — ' + escHtml(sim.lastDet.msg) + '<br>' +
      '<b>DEM:</b> ' + escHtml(sim.lastDem.event) + ' (' + escHtml(sim.lastDem.status) + ')<br>' +
      '<b>IdsM:</b> ' + escHtml(sim.lastIdsm.sev) + ' (Count: ' + sim.lastIdsm.count + ')</div></div>';
  } else if (tab === 1) {
    const modKeys = Object.keys(MODULES_INFO);
    const curKey = MODULES_INFO[sim.selectedModule] ? sim.selectedModule : "MOD_TCPIP";
    const m = MODULES_INFO[curKey];
    box.innerHTML =
      '<div class="mod-list">' + modKeys.map(function (k) {
        return '<button class="mod-pill ' + (k === curKey ? "active" : "") + '" onclick="selectModule(\'' + k + '\')">' + escHtml(k.replace("MOD_", "")) + '</button>';
      }).join("") + '</div>' +
      '<div class="insp-card"><div class="insp-h">' + escHtml(m.title) + '</div>' +
      '<div style="font-size:11px;color:var(--mut);margin-bottom:5px">' + escHtml(m.layer) + '</div>' +
      '<div style="font-size:11.5px;margin-bottom:6px"><b>Vai trò:</b> ' + escHtml(m.role) + '</div>' +
      '<div style="font-size:11px;margin-bottom:4px"><b>Inputs:</b><ul>' + m.inputs.map(function (x) { return '<li>' + escHtml(x) + '</li>'; }).join("") + '</ul></div>' +
      '<div style="font-size:11px;margin-bottom:4px"><b>Outputs:</b><ul>' + m.outputs.map(function (x) { return '<li>' + escHtml(x) + '</li>'; }).join("") + '</ul></div>' +
      '<div style="font-size:11px;margin-bottom:4px"><b>APIs:</b><ul>' + m.apis.map(function (x) { return '<li class="mono">' + escHtml(x) + '</li>'; }).join("") + '</ul></div>' +
      '<div style="font-size:11px;color:var(--cyan)"><b>Lưu ý:</b> ' + escHtml(m.notes) + '</div></div>';
  } else if (tab === 2) {
    box.innerHTML =
      '<div class="insp-card"><div class="insp-h">💻 AUTOSAR C Code &amp; Cấu Hình Hiện Tại</div>' +
      '<pre class="code-block mono">' + escHtml(sim.cCodeSnippet) + '</pre></div>' +
      '<div class="insp-card"><div class="insp-h">📐 Tham Số Đang Áp Dụng</div>' +
      '<div class="mono" style="font-size:11px;line-height:1.5">MTU=' + cfg.TcpIpCtrlMtu + 'B | MSS=' + getMssFromMtu() + 'B | Nagle=' + cfg.TcpIpTcpNagleEnabled +
      '<br>MaxRtx=' + cfg.TcpIpTcpMaxRtx + ' | RTO=' + cfg.TcpIpTcpRetransmissionTimeoutMs + 'ms | ZeroCopy=' + cfg.TcpIpBufferMemoryPoolZeroCopy + '</div></div>';
  } else {
    box.innerHTML =
      '<div class="insp-card"><div class="insp-h">📡 API Call Trace L2–L7 (' + sim.apiTrace.length + ')</div>' +
      (sim.apiTrace.length === 0 ? '<div style="font-size:11px;color:var(--mut)">Chưa có lệnh API.</div>' :
        sim.apiTrace.map(function (t) {
          const cls = t.status === "ERR" ? "err" : (t.status === "WARN" ? "warn" : "ok");
          return '<div class="trace-item ' + cls + '"><div class="mono" style="font-size:10px;color:var(--mut)">[' + t.tickMs + 'ms · ' + escHtml(t.dir) + ']</div>' +
            '<div class="mono" style="font-weight:700;font-size:10.5px">' + escHtml(t.api) + '</div>' +
            '<div style="font-size:10.5px">' + escHtml(t.detail) + '</div></div>';
        }).join("")) + '</div>';
  }
}

function renderAll() {
  renderHeaderAndLeftCard2();
  renderPktHeaderAndTables();
  renderDualRegisters();
  renderTimersAndStateMachines();
  renderSvgArchitecture();
  renderInspector();
}

// ---------- Floating Config Hover Tooltip (> 1000ms Delay & ⓘ Click Toggle) ----------

let cfgTooltipTimer = null;
let cfgTooltipPinnedKey = null;

function showCfgTooltip(key, anchorEl) {
  const popup = document.getElementById("cfgTooltipPopup");
  const data = configTooltipData[key];
  if (!popup || !data) return;

  popup.innerHTML =
    '<div class="tt-hdr">' +
      '<div><div class="tt-title">📘 ' + escHtml(data.title) + '</div>' +
      '<div class="tt-path mono">' + escHtml(data.ecucPath) + '</div></div>' +
      '<span class="tt-meta mono">' + escHtml(data.sws) + '</span>' +
    '</div>' +
    '<div class="tt-sec">' + escHtml(data.role) + '</div>' +
    '<div class="tt-grid">' +
      '<div class="tt-box"><b>Dải giá trị (Range):</b><br>' + escHtml(data.range) + '</div>' +
      '<div class="tt-box"><b>Giá trị thường dùng:</b><br>' + escHtml(data.typical) + '</div>' +
    '</div>' +
    '<div class="tt-sec"><b>⚙️ Cơ chế xử lý:</b> ' + escHtml(data.mechanism) + '</div>' +
    '<div class="tt-sec" style="color:var(--cyan)"><b>💡 Tác động mô phỏng:</b> ' + escHtml(data.scenarioImpact) + '</div>';

  popup.classList.add("show");

  const rect = anchorEl ? anchorEl.getBoundingClientRect() : { right: 320, top: 140, left: 40, bottom: 170 };
  const pw = 420;
  const ph = Math.min(340, popup.scrollHeight || 260);
  let x = rect.right + 12;
  if (x + pw > window.innerWidth - 12) {
    x = Math.max(12, rect.left - pw - 12);
    if (x < 12) x = Math.min(window.innerWidth - pw - 12, 340);
  }
  let y = Math.max(12, Math.min(window.innerHeight - ph - 12, rect.top - 10));
  popup.style.left = x + "px";
  popup.style.top = y + "px";
}

function hideCfgTooltip() {
  if (cfgTooltipTimer) {
    clearTimeout(cfgTooltipTimer);
    cfgTooltipTimer = null;
  }
  cfgTooltipPinnedKey = null;
  const popup = document.getElementById("cfgTooltipPopup");
  if (popup) popup.classList.remove("show");
}

function initTooltipHandlers() {
  const rows = document.querySelectorAll(".cfg-row[data-cfg-key]");
  rows.forEach(function (row) {
    const key = row.getAttribute("data-cfg-key");
    row.addEventListener("mouseenter", function () {
      if (cfgTooltipTimer) clearTimeout(cfgTooltipTimer);
      cfgTooltipTimer = setTimeout(function () {
        showCfgTooltip(key, row);
      }, 1020);
    });
    row.addEventListener("mouseleave", function () {
      if (cfgTooltipTimer) {
        clearTimeout(cfgTooltipTimer);
        cfgTooltipTimer = null;
      }
      if (cfgTooltipPinnedKey !== key) {
        const popup = document.getElementById("cfgTooltipPopup");
        if (popup) popup.classList.remove("show");
      }
    });
    const icon = row.querySelector(".cfg-i");
    if (icon) {
      icon.addEventListener("click", function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        if (cfgTooltipPinnedKey === key) {
          hideCfgTooltip();
        } else {
          cfgTooltipPinnedKey = key;
          showCfgTooltip(key, row);
        }
      });
    }
  });

  document.addEventListener("click", function (ev) {
    if (!ev.target.closest || (!ev.target.closest(".cfg-i") && !ev.target.closest("#cfgTooltipPopup"))) {
      hideCfgTooltip();
    }
  });
}

// ---------- Export Modal & Download Standalone HTML ----------

function getExportContentByTab(idx) {
  if (idx === 0) return { name: "TcpIp.arxml", content: generateTcpIpArxml() };
  if (idx === 1) return { name: "TcpIp_Cfg.h", content: generateTcpIpCfgH() };
  if (idx === 2) return { name: "TcpIp_Lcfg.c", content: generateTcpIpLcfgC() };
  return { name: "TcpIp_Config.json", content: generateTcpIpJson() };
}

function openExportModal() {
  const modal = document.getElementById("exportModal");
  if (!modal) return;
  modal.classList.remove("hidden");
  switchExportTab(uiState.exportTab);
}

function closeExportModal() {
  const modal = document.getElementById("exportModal");
  if (modal) modal.classList.add("hidden");
}

function onExportModalBackdrop(evt) {
  if (evt && evt.target && evt.target.id === "exportModal") {
    closeExportModal();
  }
}

function switchExportTab(idx) {
  uiState.exportTab = Number(idx) || 0;
  for (let i = 0; i < 4; i++) {
    const b = document.getElementById("expTab" + i);
    if (b) b.classList.toggle("active", i === uiState.exportTab);
  }
  const area = document.getElementById("exportCodeArea");
  if (area) {
    area.textContent = getExportContentByTab(uiState.exportTab).content;
  }
}

function copyExportCode() {
  const txt = getExportContentByTab(uiState.exportTab).content;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(txt).catch(function () {});
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
  setTimeout(function () {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 150);
}

function downloadStandaloneHTML() {
  const docHtml = "<!DOCTYPE html>\n" + document.documentElement.outerHTML;
  const blob = new Blob([docHtml], { type: "text/html;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "AUTOSAR_TcpIp.html";
  document.body.appendChild(a);
  a.click();
  setTimeout(function () {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 150);
}
