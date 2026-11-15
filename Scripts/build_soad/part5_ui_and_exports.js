// ============================================================================
// PART 5: UI CONTROLLERS, TOOLTIP (>1000ms), EXPORTS & REAL-TIME RENDERERS
// ============================================================================

let uiState = {
  mainView: "sim",
  theme: "dark",
  activeCfgTab: 0,
  activeInspTab: 0,
  activeScenarioIdx: 0,
  currentStepIdx: 0,
  autoPlayTimer: null,
  currentExportKind: "arxml",
  currentExportContent: ""
};

// ---------------- VIEW & THEME SWITCHING ----------------
function switchMainView(viewName) {
  uiState.mainView = viewName;
  const viewSimEl = document.getElementById("viewSim");
  const viewHbEl = document.getElementById("viewHb");
  const btnSim = document.getElementById("btnViewSim");
  const btnHb = document.getElementById("btnViewHb");
  const hdrRow2 = document.getElementById("hdrRow2");

  if (viewName === "hb") {
    viewSimEl.style.display = "none";
    if (hdrRow2) hdrRow2.style.display = "none";
    viewHbEl.classList.add("active");
    btnSim.classList.remove("active");
    btnHb.classList.add("active");
    if (typeof renderCurrentHandbookView === "function") renderCurrentHandbookView();
  } else {
    viewSimEl.style.display = "grid";
    if (hdrRow2) hdrRow2.style.display = "flex";
    viewHbEl.classList.remove("active");
    btnSim.classList.add("active");
    btnHb.classList.remove("active");
  }
}

function toggleTheme() {
  uiState.theme = uiState.theme === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", uiState.theme);
  const btn = document.getElementById("btnThemeToggle");
  btn.textContent = uiState.theme === "dark" ? "☀ Light" : "🌙 Dark";
}

function switchCfgTab(idx) {
  uiState.activeCfgTab = idx;
  for (let i = 0; i < 6; i++) {
    const tab = document.getElementById(`cfgTab${i}`);
    const pane = document.getElementById(`cfgPane${i}`);
    if (tab) tab.classList.toggle("active", i === idx);
    if (pane) pane.classList.toggle("active", i === idx);
  }
}

function switchInspTab(idx) {
  uiState.activeInspTab = idx;
  for (let i = 0; i < 4; i++) {
    const tab = document.getElementById(`inspTab${i}`);
    const pane = document.getElementById(`inspPane${i}`);
    if (tab) tab.classList.toggle("active", i === idx);
    if (pane) pane.classList.toggle("active", i === idx);
  }
}

// ---------------- CONFIG SYNC & INPUT HANDLERS ----------------
function syncInputsFromConfig() {
  Object.keys(defaultConfig).forEach(key => {
    const el = document.getElementById(`cfg_${key}`);
    if (!el) return;
    if (el.type === "checkbox") {
      el.checked = Boolean(cfg[key]);
    } else {
      el.value = String(cfg[key]);
    }
  });
}

function onConfigInputChanged(key) {
  const el = document.getElementById(`cfg_${key}`);
  if (!el) return;
  if (el.type === "checkbox") {
    cfg[key] = el.checked;
  } else if (el.type === "number") {
    const minVal = el.min !== "" ? parseInt(el.min, 10) : -999999;
    const maxVal = el.max !== "" ? parseInt(el.max, 10) : 999999;
    let v = parseInt(el.value, 10);
    if (Number.isNaN(v)) v = defaultConfig[key];
    v = Math.max(minVal, Math.min(maxVal, v));
    cfg[key] = v;
    el.value = String(v);
  } else {
    cfg[key] = el.value;
  }

  snapshotRegBefore();
  if (key === "SelectedSoConId") {
    pushActiveSoConFieldsToCfg();
    syncInputsFromConfig();
  } else if (key === "ActiveLocalIpAddrState") {
    SoAd_LocalIpAddrAssignmentChg(cfg.ActiveLocalIpAddrState);
  } else if (key === "SelectedRoutingGroupId") {
    const rg = sim.routingGroups[cfg.SelectedRoutingGroupId];
    if (rg) cfg.SoAdRoutingGroupTxTriggerable = rg.triggerable;
    syncInputsFromConfig();
  } else if (key === "SoAdRoutingGroupTxTriggerable") {
    const rg = sim.routingGroups[cfg.SelectedRoutingGroupId];
    if (rg) rg.triggerable = cfg.SoAdRoutingGroupTxTriggerable;
  } else if (key === "SoAdPduHeaderEnable" || key === "SoAdSocketProtocolChoice" ||
             key === "SoAdSocketAutomaticSoConSetup" || key === "SoAdSocketTcpInitiate" ||
             key === "SoAdSocketLocalAddressAndPort" || key === "SoAdSocketRemoteAddressAndPort") {
    syncActiveSoConFieldsFromCfg();
  } else if (key === "SelectedTxPduRouteId") {
    const r = TX_PDU_ROUTES[cfg.SelectedTxPduRouteId];
    if (r) {
      cfg.SoAdTxPduHeaderIdHex = r.headerIdHex;
      cfg.SoAdTxUpperLayerType = r.ulType;
      cfg.SoAdTxUdpTriggerMode = r.triggerMode;
      syncInputsFromConfig();
    }
  } else if (key === "SelectedRxPacketProfile") {
    const p = RX_PKT_PROFILES[cfg.SelectedRxPacketProfile];
    if (p) {
      cfg.SoAdRxPduHeaderIdExpectedHex = p.headerIdHex;
      cfg.SoAdRxUpperLayerTarget = p.ulTarget;
      cfg.InjectedRxPayloadLengthBytes = p.payloadBytes;
      syncInputsFromConfig();
    }
  }
  computeRegistersAfter();
  renderAll();
}

function togglePduHeaderInline() {
  cfg.SoAdPduHeaderEnable = !cfg.SoAdPduHeaderEnable;
  syncActiveSoConFieldsFromCfg();
  syncInputsFromConfig();
  snapshotRegBefore();
  computeRegistersAfter();
  renderAll();
}

function selectSoConRow(soConId) {
  cfg.SelectedSoConId = String(soConId);
  pushActiveSoConFieldsToCfg();
  syncInputsFromConfig();
  snapshotRegBefore();
  computeRegistersAfter();
  renderAll();
}

function toggleRegisterBit(regType, bitIdx) {
  const sc = getActiveSoCon();
  snapshotRegBefore();
  if (regType === "A") {
    if (bitIdx === 7) {
      const nextIp = sim.localIpState === "TCPIP_IPADDR_STATE_ASSIGNED"
        ? "TCPIP_IPADDR_STATE_UNASSIGNED"
        : "TCPIP_IPADDR_STATE_ASSIGNED";
      SoAd_LocalIpAddrAssignmentChg(nextIp);
    } else if (bitIdx === 6) {
      if (sc.mode === "ONLINE") SoAd_CloseSoCon(sc.id, true);
      else {
        SoAd_OpenSoCon(sc.id);
        if (sc.proto === "TCP" && sim.localIpState === "TCPIP_IPADDR_STATE_ASSIGNED") SoAd_TcpConnected(sc.id);
      }
    } else if (bitIdx === 5) {
      sc.mode = sc.mode === "RECONNECT" ? "OFFLINE" : "RECONNECT";
    } else if (bitIdx === 4) {
      if (sc.proto === "TCP") {
        sc.tcpEstablished = !sc.tcpEstablished;
        sc.mode = sc.tcpEstablished ? "ONLINE" : "RECONNECT";
      }
    } else if (bitIdx === 3) {
      sc.remoteAddr = sc.remoteAddr.includes("ANY") ? "192.168.10.100:30490" : "ANY:ANY";
      cfg.SoAdSocketRemoteAddressAndPort = sc.remoteAddr;
    } else if (bitIdx === 2) {
      const rg = sim.routingGroups[sc.rgId];
      if (rg) rg.enabled ? SoAd_DisableRouting(rg.id) : SoAd_EnableRouting(rg.id);
    } else if (bitIdx === 1) {
      cfg.SoAdSocketAutomaticSoConSetup = !cfg.SoAdSocketAutomaticSoConSetup;
      syncActiveSoConFieldsFromCfg();
    } else if (bitIdx === 0) {
      sim.lastOpFlags.ulModeChg = !sim.lastOpFlags.ulModeChg;
    }
  } else {
    if (bitIdx === 7) {
      cfg.SoAdPduHeaderEnable = !cfg.SoAdPduHeaderEnable;
      syncActiveSoConFieldsFromCfg();
    } else if (bitIdx === 6) {
      cfg.SoAdSocketProtocolChoice = cfg.SoAdSocketProtocolChoice === "UDP" ? "TCP" : "UDP";
      syncActiveSoConFieldsFromCfg();
    } else if (bitIdx === 5) {
      sim.lastOpFlags.npduBundled = !sim.lastOpFlags.npduBundled;
    } else if (bitIdx === 4) {
      sim.lastOpFlags.tpStream = !sim.lastOpFlags.tpStream;
    } else if (bitIdx === 3) {
      sim.lastOpFlags.bestMatch = !sim.lastOpFlags.bestMatch;
    } else if (bitIdx === 2) {
      sim.lastOpFlags.ulDispatch = !sim.lastOpFlags.ulDispatch;
    } else if (bitIdx === 1) {
      sim.lastOpFlags.txConfOk = !sim.lastOpFlags.txConfOk;
    } else if (bitIdx === 0) {
      sim.lastOpFlags.detErr = !sim.lastOpFlags.detErr;
    }
  }
  syncInputsFromConfig();
  computeRegistersAfter();
  renderAll();
}

// ---------------- SCENARIO ENGINE ----------------
function populateScenarioDropdown() {
  const sel = document.getElementById("scenarioSelect");
  sel.innerHTML = "";
  SCENARIOS.forEach((sc, idx) => {
    const opt = document.createElement("option");
    opt.value = sc.id;
    opt.textContent = sc.title;
    if (idx === uiState.activeScenarioIdx) opt.selected = true;
    sel.appendChild(opt);
  });
}

function selectScenarioById(scenId) {
  stopAutoPlay();
  const idx = SCENARIOS.findIndex(s => s.id === scenId);
  uiState.activeScenarioIdx = idx >= 0 ? idx : 0;
  uiState.currentStepIdx = 0;
  SCENARIOS[uiState.activeScenarioIdx].setup();
  syncInputsFromConfig();
  renderAll();
}

function resetSimulationState() {
  stopAutoPlay();
  uiState.currentStepIdx = 0;
  SCENARIOS[uiState.activeScenarioIdx].setup();
  syncInputsFromConfig();
  renderAll();
}

function nextScenarioStep() {
  const sc = SCENARIOS[uiState.activeScenarioIdx];
  if (uiState.currentStepIdx >= sc.steps.length) {
    stopAutoPlay();
    return;
  }
  const stepObj = sc.steps[uiState.currentStepIdx];
  stepObj.exec();
  uiState.currentStepIdx += 1;
  syncInputsFromConfig();
  renderAll();
}

function prevScenarioStep() {
  stopAutoPlay();
  const sc = SCENARIOS[uiState.activeScenarioIdx];
  const targetStep = Math.max(0, uiState.currentStepIdx - 1);
  sc.setup();
  uiState.currentStepIdx = 0;
  for (let i = 0; i < targetStep; i++) {
    sc.steps[i].exec();
    uiState.currentStepIdx += 1;
  }
  syncInputsFromConfig();
  renderAll();
}

function toggleAutoPlay() {
  if (uiState.autoPlayTimer) {
    stopAutoPlay();
    return;
  }
  const sc = SCENARIOS[uiState.activeScenarioIdx];
  if (uiState.currentStepIdx >= sc.steps.length) {
    resetSimulationState();
  }
  const btn = document.getElementById("btnAutoPlay");
  btn.textContent = "⏸ Pause";
  uiState.autoPlayTimer = setInterval(() => {
    const cur = SCENARIOS[uiState.activeScenarioIdx];
    if (uiState.currentStepIdx >= cur.steps.length) {
      stopAutoPlay();
      return;
    }
    nextScenarioStep();
  }, 1150);
}

function stopAutoPlay() {
  if (uiState.autoPlayTimer) {
    clearInterval(uiState.autoPlayTimer);
    uiState.autoPlayTimer = null;
  }
  const btn = document.getElementById("btnAutoPlay");
  if (btn) btn.textContent = "⏯ Auto";
}

function runWhatIf(idx) {
  stopAutoPlay();
  const sc = SCENARIOS[uiState.activeScenarioIdx];
  if (sc && sc.whatIfs && sc.whatIfs[idx]) {
    sc.whatIfs[idx].run();
    syncInputsFromConfig();
    renderAll();
  }
}

// ---------------- HEADER TCPIP EVENTS & 8 QUICK ACTIONS ----------------
function triggerHeaderTcpIpRx() {
  SoAd_RxIndication(cfg.SelectedRxPacketProfile);
  syncInputsFromConfig();
  renderAll();
}

function triggerHeaderTcpConn() {
  const active = getActiveSoCon();
  if (active.id === 1 || (!active.tcpInitiate && active.proto === "TCP")) {
    SoAd_TcpAccepted(active.id, "192.168.10.220:51000");
  } else {
    const target = active.proto === "TCP" ? active.id : 3;
    SoAd_TcpConnected(target);
  }
  syncInputsFromConfig();
  renderAll();
}

function triggerHeaderTcpIpTxConf() {
  SoAd_TxConfirmation();
  syncInputsFromConfig();
  renderAll();
}

function triggerHeaderTcpRstFin() {
  SoAd_TcpIpEvent(getActiveSoConId(), cfg.InjectedTcpIpEventType);
  syncInputsFromConfig();
  renderAll();
}

function triggerHeaderLocalIpToggle() {
  const next = sim.localIpState === "TCPIP_IPADDR_STATE_ASSIGNED"
    ? "TCPIP_IPADDR_STATE_UNASSIGNED"
    : "TCPIP_IPADDR_STATE_ASSIGNED";
  SoAd_LocalIpAddrAssignmentChg(next);
  syncInputsFromConfig();
  renderAll();
}

function qaIfTransmit() {
  SoAd_IfTransmit(cfg.SelectedTxPduRouteId);
  syncInputsFromConfig();
  renderAll();
}

function qaTpTransmit() {
  SoAd_TpTransmit(cfg.SelectedTxPduRouteId === "PduRoute_0" ? "PduRoute_1" : cfg.SelectedTxPduRouteId);
  syncInputsFromConfig();
  renderAll();
}

function qaRxIndication() {
  SoAd_RxIndication(cfg.SelectedRxPacketProfile);
  syncInputsFromConfig();
  renderAll();
}

function qaToggleOpenCloseSoCon() {
  const sc = getActiveSoCon();
  if (sc.mode === "OFFLINE") SoAd_OpenSoCon(sc.id);
  else SoAd_CloseSoCon(sc.id, true);
  syncInputsFromConfig();
  renderAll();
}

function qaEnableAndTriggerRg() {
  const rgId = cfg.SelectedRoutingGroupId;
  const rg = sim.routingGroups[rgId];
  if (rg && !rg.enabled) {
    SoAd_EnableRouting(rgId);
  } else {
    SoAd_IfRoutingGroupTransmit(rgId);
  }
  syncInputsFromConfig();
  renderAll();
}

function qaSetRemoteAddr() {
  const sc = getActiveSoCon();
  if (sc.remoteAddr.includes("ANY")) {
    SoAd_SetUniqueRemoteAddr(sc.id, "192.168.10.201:55123");
  } else {
    SoAd_SetRemoteAddr(sc.id, cfg.SoAdSocketRemoteAddressAndPort);
  }
  syncInputsFromConfig();
  renderAll();
}

function qaMainFunction() {
  SoAd_MainFunction();
  syncInputsFromConfig();
  renderAll();
}

function toggleFaultMenu() {
  const menu = document.getElementById("faultMenuWrap");
  menu.classList.toggle("open");
}

function qaFaultAction(kind) {
  if (kind === "TCP_RESET") SoAd_TcpIpEvent(getActiveSoConId(), "TCPIP_TCP_RESET");
  else if (kind === "LOCAL_IP_TOGGLE") triggerHeaderLocalIpToggle();
  else if (kind === "DET_UNKNOWN_HDR") SoAd_RxIndication("PKT_E");
  else if (kind === "MEAS_DATA") SoAd_GetAndResetMeasurementData();
  else if (kind === "VER_INFO") SoAd_GetVersionInfo(Boolean(cfg.PassInvalidArgOrUninitForDetTest));
  else if (kind === "CHANGE_PARAM") SoAd_ChangeParameter(getActiveSoConId());
  syncInputsFromConfig();
  renderAll();
}

function selectArchModule(modId) {
  sim.selectedModuleId = modId;
  switchInspTab(0);
  renderSvgArchitecture();
  renderInspector();
}

function clearApiTrace() {
  sim.traceLog = [];
  sim.detLog = [];
  renderInspector();
}

// ---------------- RENDERING PIPELINE ----------------
function renderAll() {
  renderHeaderBadges();
  renderScenarioBox();
  renderValidationBanner();
  renderSoAdHeaderAndBuffers();
  renderDualRegisters();
  renderTimersAndStateMachines();
  renderSvgArchitecture();
  renderInspector();
}

function renderHeaderBadges() {
  const sc = getActiveSoCon();
  const scB = document.getElementById("hdrSoConBadge");
  scB.textContent = `${sc.name}: ${sc.mode}`;
  scB.className = `pill-badge ${sc.mode === "ONLINE" ? "ok" : sc.mode === "RECONNECT" ? "warn" : "err"}`;

  const ipB = document.getElementById("hdrIpBadge");
  const shortIp = sim.localIpState.replace("TCPIP_IPADDR_STATE_", "");
  ipB.textContent = `IpAddr: ${shortIp}`;
  ipB.className = `pill-badge ${shortIp === "ASSIGNED" ? "ok" : shortIp === "ONHOLD" ? "warn" : "err"}`;

  const npduB = document.getElementById("hdrNpduBadge");
  npduB.textContent = `nPdu: ${sim.nPdu.chunks.length} (${sim.nPdu.totalBytes}B)`;
  npduB.className = `pill-badge ${sim.nPdu.chunks.length > 0 ? "warn" : "info"}`;

  const rg = sim.routingGroups[cfg.SelectedRoutingGroupId];
  const rgB = document.getElementById("hdrRgBadge");
  rgB.textContent = `${cfg.SelectedRoutingGroupId}: ${rg && rg.enabled ? "EN" : "DIS"}`;
  rgB.className = `pill-badge ${rg && rg.enabled ? "purple" : "err"}`;
}

function renderScenarioBox() {
  const sc = SCENARIOS[uiState.activeScenarioIdx];
  document.getElementById("scenGroupTag").textContent = sc.group;
  document.getElementById("scenSummary").textContent = sc.summary;

  const total = sc.steps.length;
  const cur = uiState.currentStepIdx;
  document.getElementById("stepBadge").textContent = `Step ${cur}/${total}`;
  document.getElementById("btnPrevStep").disabled = cur === 0;
  document.getElementById("btnNextStep").disabled = cur >= total;

  const stepTitleEl = document.getElementById("scenStepTitle");
  if (cur === 0) stepTitleEl.textContent = "Trạng thái: Setup ban đầu — Bấm ▶ Step để chạy Bước 1";
  else stepTitleEl.textContent = sc.steps[cur - 1].title;

  const wifRow = document.getElementById("whatIfRow");
  wifRow.innerHTML = sc.whatIfs.map((w, i) =>
    `<button class="whatif-btn" onclick="runWhatIf(${i})">🔬 ${w.label}</button>`
  ).join("");

  const prog = document.getElementById("stepProgress");
  prog.innerHTML = sc.steps.map((_, i) =>
    `<div class="step-pip ${i < cur - 1 ? "done" : i === cur - 1 ? "active" : ""}"></div>`
  ).join("");
}

function renderValidationBanner() {
  const warns = validateSoAdConfig();
  const el = document.getElementById("cfgWarnBanner");
  if (warns.length === 0) {
    el.classList.remove("show");
    el.textContent = "";
  } else {
    el.classList.add("show");
    el.innerHTML = warns.join("<br/>");
  }
}

function renderSoAdHeaderAndBuffers() {
  const hdrEn = Boolean(cfg.SoAdPduHeaderEnable);
  document.getElementById("btnToggleHdr").textContent = `Header: ${hdrEn ? "ON (8B)" : "OFF (Raw)"}`;

  const strip = document.getElementById("pduHeaderStrip");
  const lh = sim.lastHeader;
  const segClass = lh.enabled && hdrEn ? "" : "disabled";
  strip.innerHTML = `
    <div class="hdr-pdu-seg hdr-seg-id ${segClass}">
      <div class="seg-tag">HeaderId (4B BE)</div>
      <div class="seg-val">${hdrEn ? lh.headerIdHex : "BYPASSED"}</div>
      <div class="seg-sub">Mux / Demux ID</div>
    </div>
    <div class="hdr-pdu-seg hdr-seg-len ${segClass}">
      <div class="seg-tag">PduLength (4B BE)</div>
      <div class="seg-val">${hdrEn ? `${lh.pduLength} Bytes` : "RAW LEN"}</div>
      <div class="seg-sub">${lh.direction} Frame Len</div>
    </div>
    <div class="hdr-pdu-seg hdr-seg-pay">
      <div class="seg-tag">AUTOSAR SDU Payload (${lh.enabled && hdrEn ? "8B + N" : "N Bytes Raw"})</div>
      <div class="seg-val" style="font-size:11.5px">${lh.payloadDesc}</div>
      <div class="seg-sub">Protocol=${getActiveSoCon().proto} · VLAN PCP=${cfg.SoAdSocketFramePriorityVlanPcp}</div>
    </div>
  `;

  // SoCon Best-Match table
  document.getElementById("bestMatchNote").textContent = sim.lastBestMatchNote;
  const tbody = document.getElementById("soConTableBody");
  const activeId = getActiveSoConId();
  tbody.innerHTML = sim.soCons.map(s => {
    const rg = sim.routingGroups[s.rgId];
    const rowCls = [s.id === activeId ? "active-row" : "", s.matchedLast ? "matched-row" : ""].filter(Boolean).join(" ");
    return `
      <tr class="${rowCls}" onclick="selectSoConRow(${s.id})">
        <td class="mono" style="font-weight:700">${s.name}${s.autoSetup ? "*" : ""}</td>
        <td class="mono">${s.proto}</td>
        <td class="mono">${s.remoteAddr}</td>
        <td><span class="socon-pill st-${s.mode}">${s.mode}</span></td>
        <td class="mono">${s.rgId}:${rg && rg.enabled ? "EN" : "DIS"}</td>
      </tr>
    `;
  }).join("");

  // nPdu & SoAdRxBuffer
  document.getElementById("npduTimerLabel").textContent =
    sim.nPdu.chunks.length > 0 ? `Timeout: ${sim.nPdu.timerRemainingMs}ms` : "Timeout: IDLE";
  document.getElementById("npduCountText").textContent =
    `${sim.nPdu.chunks.length} PDUs / ${sim.nPdu.totalBytes} B`;
  const npduPct = Math.min(100, Math.round((sim.nPdu.totalBytes / 1400) * 100));
  const npduBar = document.getElementById("npduBarFill");
  npduBar.style.width = `${npduPct}%`;
  npduBar.className = `buf-bar-fill ${npduPct > 75 ? "warn" : ""}`;

  const chunksEl = document.getElementById("npduChunks");
  chunksEl.innerHTML = sim.nPdu.chunks.length === 0
    ? `<span style="font-size:10px;color:var(--text-muted)">Hàng đợi nPdu trống</span>`
    : sim.nPdu.chunks.map(c => `<span class="chunk-pill">${c.routeId} [${c.headerIdHex} · ${c.len}B]</span>`).join("");

  const maxCap = parseInt(cfg.SoAdRxBufferMaxCapacityBytes, 10) || 2048;
  document.getElementById("rxBufText").textContent = `${sim.rxStream.bufferedBytes} / ${maxCap} B`;
  const rxPct = Math.min(100, Math.round((sim.rxStream.bufferedBytes / maxCap) * 100));
  const rxBar = document.getElementById("rxBufFill");
  rxBar.style.width = `${sim.rxStream.state === "OVERFLOW" ? 100 : rxPct}%`;
  rxBar.className = `buf-bar-fill ${sim.rxStream.state === "OVERFLOW" ? "full" : rxPct > 60 ? "warn" : ""}`;
  document.getElementById("rxStreamStatus").textContent = sim.rxStream.detail;
}

function renderRegGrid(containerId, hexElId, bitsSpec, byteVal, prevByteVal, regType) {
  document.getElementById(hexElId).textContent = `0x${byteVal.toString(16).toUpperCase().padStart(2, "0")}`;
  const grid = document.getElementById(containerId);
  grid.innerHTML = bitsSpec.map(b => {
    const isOn = (byteVal & b.mask) !== 0;
    const isChanged = ((byteVal ^ prevByteVal) & b.mask) !== 0;
    const errCls = (regType === "B" && b.bit === 0 && isOn) ? "bit-err" : "";
    return `
      <div class="bit-box ${isOn ? "on" : ""} ${errCls} ${isChanged ? "changed" : ""}"
           onclick="toggleRegisterBit('${regType}', ${b.bit})"
           title="Bit ${b.bit} ${b.name}: ${b.desc} (Click để toggle)">
        <span class="bit-idx">B${b.bit}</span>
        <span class="bit-val">${isOn ? "1" : "0"}</span>
        <span class="bit-lbl">${b.short}</span>
      </div>
    `;
  }).join("");
}

function renderDualRegisters() {
  renderRegGrid("regAGrid", "regAHex", SOAD_SOCON_STATE_BITS, sim.regAByte, sim.prevRegAByte, "A");
  renderRegGrid("regBGrid", "regBHex", SOAD_PDU_ROUTING_BITS, sim.regBByte, sim.prevRegBByte, "B");
}

function renderTimersAndStateMachines() {
  document.getElementById("simClockBadge").textContent = `t = ${sim.clockMs} ms`;
  document.getElementById("cntTxRx").textContent = `${sim.counters.txPdus} / ${sim.counters.rxPdus}`;
  document.getElementById("cntTxRxSub").textContent = `IF: ${sim.counters.ifCount} · TP: ${sim.counters.tpCount}`;

  document.getElementById("cntNpduTimer").textContent =
    sim.nPdu.chunks.length > 0 ? `${sim.nPdu.timerRemainingMs} ms` : "IDLE";
  document.getElementById("cntNpduSub").textContent = `Bundled: ${sim.nPdu.bundledFramesCount} frames`;

  const drops = sim.counters.dropTcp + sim.counters.dropUdp;
  document.getElementById("cntDrops").textContent = `${drops} drops`;
  document.getElementById("cntDropsSub").textContent = `TCP:${sim.counters.dropTcp} · UDP:${sim.counters.dropUdp}`;

  document.getElementById("cntDet").textContent = `${sim.counters.detCount} DET`;
  document.getElementById("cntDetSub").textContent = `IdsM Sev: ${sim.counters.idsmSecEvents}`;

  // SM1: SoCon Mode
  const sc = getActiveSoCon();
  document.getElementById("smSoConOwner").textContent = `${sc.name} · OpenCnt:${sc.openRefCount}`;
  document.getElementById("smNodeOffline").className = `sm-node ${sc.mode === "OFFLINE" ? "active-err" : ""}`;
  document.getElementById("smNodeReconnect").className = `sm-node ${sc.mode === "RECONNECT" ? "active-warn" : ""}`;
  document.getElementById("smNodeOnline").className = `sm-node ${sc.mode === "ONLINE" ? "active" : ""}`;

  // SM2: Pipeline State
  document.getElementById("smPipeProto").textContent = `${sc.proto} · ${sim.tpSession.active ? "TP ACTIVE" : "IF/RX"}`;
  const isNpduWait = sim.nPdu.chunks.length > 0;
  const isTp = sim.tpSession.active;
  const isReasm = sim.rxStream.bufferedBytes > 0;
  const isIdle = !isNpduWait && !isTp && !isReasm;

  document.getElementById("smPipeIdle").className = `sm-node ${isIdle ? "active" : ""}`;
  document.getElementById("smPipeNpdu").className = `sm-node ${isNpduWait ? "active-warn" : ""}`;
  document.getElementById("smPipeTp").className = `sm-node ${isTp ? "active" : ""}`;
  document.getElementById("smPipeReasm").className = `sm-node ${isReasm ? "active-warn" : ""}`;
}

function renderSvgArchitecture() {
  const sc = getActiveSoCon();
  const rg = sim.routingGroups[sc.rgId];
  document.getElementById("svgFlowCaption").textContent = sim.lastFlowCaption;
  document.getElementById("svgSoadLiveLine").textContent =
    `Active: ${sc.name} (${sc.proto}) | Hdr=${sc.headerEnable ? "ON" : "OFF"} | ${sc.rgId}=${rg && rg.enabled ? "EN" : "DIS"} | ${sc.mode}`;

  Object.keys(MODULES_INFO).forEach(modKey => {
    const g = document.getElementById(`svgMod_${modKey}`);
    if (g) g.classList.toggle("selected", modKey === sim.selectedModuleId);
  });

  const allArrows = [
    "arrowSwcRte", "arrowRtePduR", "arrowPduRSoadTx", "arrowSoadPduRRx",
    "arrowSdSoad", "arrowUlSoad", "arrowSoadEthSM", "arrowSoadTcpIpTx",
    "arrowTcpIpSoadRx", "arrowTcpIpEthBus", "arrowSoadDet"
  ];
  allArrows.forEach(aId => {
    const el = document.getElementById(aId);
    if (el) el.classList.toggle("active", sim.activeArrows.includes(aId));
  });
}

function renderInspector() {
  // Pane 0: Module Inspector
  const info = MODULES_INFO[sim.selectedModuleId] || MODULES_INFO.MOD_SOAD;
  document.getElementById("moduleInspectorContent").innerHTML = `
    <div style="font-size:14px;font-weight:800;color:var(--accent)">${info.title}</div>
    <div class="mod-tag-row">
      <span class="pill-badge info">${info.layer}</span>
      <span class="pill-badge purple">${info.sws}</span>
    </div>
    <div class="mod-sec-lbl">📥 Đầu vào (Inputs)</div>
    <ul class="mod-list">${info.inputs.map(x => `<li>${x}</li>`).join("")}</ul>
    <div class="mod-sec-lbl">⚙ Xử lý nội bộ (Processing)</div>
    <ul class="mod-list">${info.processing.map(x => `<li>${x}</li>`).join("")}</ul>
    <div class="mod-sec-lbl">📤 Đầu ra (Outputs)</div>
    <ul class="mod-list">${info.outputs.map(x => `<li>${x}</li>`).join("")}</ul>
  `;

  // Pane 1: API Call Sequence Trace
  const traceEl = document.getElementById("traceList");
  traceEl.innerHTML = sim.traceLog.length === 0
    ? `<div style="color:var(--text-muted);font-size:11.5px">Chưa có log API. Hãy bấm Step hoặc Quick Actions.</div>`
    : sim.traceLog.map(t => `
      <div class="trace-item ${t.kind}">
        <div class="trace-top">
          <span class="trace-api">${t.api}</span>
          <span class="mono" style="color:var(--text-muted);font-size:10px">${t.timeMs} ms</span>
        </div>
        <div class="trace-detail">${t.detail}</div>
      </div>
    `).join("");

  // Pane 2: Measurement Data & DET Log
  document.getElementById("measDataCards").innerHTML = `
    <div class="meas-box">
      <div style="font-size:10px;color:var(--text-dim)">SOAD_MEAS_DROP_TCP (0x01)</div>
      <div class="mono" style="font-size:16px;font-weight:800;color:var(--red)">${sim.counters.dropTcp}</div>
    </div>
    <div class="meas-box">
      <div style="font-size:10px;color:var(--text-dim)">SOAD_MEAS_DROP_UDP (0x02)</div>
      <div class="mono" style="font-size:16px;font-weight:800;color:var(--amber)">${sim.counters.dropUdp}</div>
    </div>
  `;
  const detEl = document.getElementById("detLogList");
  detEl.innerHTML = sim.detLog.length === 0
    ? `<div style="color:var(--green);font-size:11.5px">✔ Không có lỗi DET / Runtime Error nào được ghi nhận.</div>`
    : sim.detLog.map(d => `
      <div class="det-item">
        <div style="display:flex;justify-content:space-between;font-weight:700">
          <span class="mono">${d.errName} (${d.code}) · ${d.type}</span>
          <span class="mono">${d.timeMs} ms</span>
        </div>
        <div style="margin-top:2px">${d.api}: ${d.desc}</div>
        ${d.secEvent ? `<div style="margin-top:2px;color:var(--amber);font-weight:700">🛡 IdsM_SetSecurityEvent Triggered</div>` : ""}
      </div>
    `).join("");

  // Pane 3: Bit & Active ECUC Diff
  const diffA = SOAD_SOCON_STATE_BITS.filter(b => (sim.regAByte & b.mask) !== 0).map(b => b.name).join(", ") || "NONE";
  const diffB = SOAD_PDU_ROUTING_BITS.filter(b => (sim.regBByte & b.mask) !== 0).map(b => b.name).join(", ") || "NONE";
  document.getElementById("bitDiffSummary").innerHTML = `
    <div class="mod-sec-lbl">Thanh A (0x${sim.regAByte.toString(16).toUpperCase().padStart(2, "0")}) Active Bits</div>
    <div class="mono" style="font-size:11px">${diffA}</div>
    <div class="mod-sec-lbl">Thanh B (0x${sim.regBByte.toString(16).toUpperCase().padStart(2, "0")}) Active Bits</div>
    <div class="mono" style="font-size:11px">${diffB}</div>
  `;
  const sc = getActiveSoCon();
  document.getElementById("activePduSnapshot").innerHTML = `
    <div class="mod-sec-lbl">Active SoCon &amp; PduRoute Snapshot</div>
    <div class="mono" style="font-size:11px">
      SoCon: ${sc.name} (${sc.proto}, ${sc.mode})<br/>
      Local: ${sc.localAddr}<br/>
      Remote: ${sc.remoteAddr}<br/>
      Tx Route: ${cfg.SelectedTxPduRouteId} (Hdr=${cfg.SoAdTxPduHeaderIdHex})<br/>
      TP State: ${sim.tpSession.state} (${sim.tpSession.sentBytes}/${sim.tpSession.totalBytes} B)<br/>
      Rx Stream: ${sim.rxStream.detail}
    </div>
  `;
}

// ---------------- >1000ms HOVER TOOLTIP SYSTEM ----------------
function initConfigTooltipHandlers() {
  const popup = document.getElementById("cfgTooltipPopup");
  let hoverTimer = null;

  function showTooltip(key, anchorEl) {
    const data = configTooltipData[key];
    if (!data) return;
    popup.innerHTML = `
      <div class="tt-title">${data.title}</div>
      <div class="tt-ecuc">${data.ecucPath}<br/>${data.sws}</div>
      <div class="tt-grid">
        <div class="tt-row"><strong>Dải giá trị:</strong> ${data.range}</div>
        <div class="tt-row"><strong>Giá trị điển hình:</strong> ${data.typical}</div>
        <div class="tt-row"><strong>Vai trò:</strong> ${data.role}</div>
        <div class="tt-row"><strong>Cơ chế SoAd:</strong> ${data.mechanism}</div>
        <div class="tt-row"><strong>Tác động kịch bản:</strong> ${data.scenarioImpact}</div>
      </div>
    `;
    const rect = anchorEl.getBoundingClientRect();
    let left = rect.right + 10;
    if (left + 420 > window.innerWidth) left = Math.max(12, rect.left - 420);
    let top = Math.min(window.innerHeight - 280, Math.max(92, rect.top - 10));
    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;
    popup.classList.add("show");
  }

  function hideTooltip() {
    if (hoverTimer) {
      clearTimeout(hoverTimer);
      hoverTimer = null;
    }
    popup.classList.remove("show");
  }

  document.querySelectorAll(".cfg-row[data-cfg-key]").forEach(row => {
    const key = row.getAttribute("data-cfg-key");
    row.addEventListener("mouseenter", () => {
      hideTooltip();
      hoverTimer = setTimeout(() => showTooltip(key, row), 1000);
    });
    row.addEventListener("mouseleave", hideTooltip);
    row.addEventListener("mousedown", hideTooltip);
  });
}

// ---------------- EXPORT MODAL & STANDALONE HTML DOWNLOAD ----------------
function openExportModal(kind) {
  uiState.currentExportKind = kind;
  const titles = {
    arxml: "AUTOSAR SoAd.arxml (ECUC Configuration)",
    cfgh: "SoAd_Cfg.h (Pre-Compile C Header)",
    lcfgc: "SoAd_Lcfg.c (Link-Time C Structures)",
    json: "SoAd_Config.json (Simulator Snapshot)"
  };
  uiState.currentExportContent = generateExportArtifact(kind);
  document.getElementById("exportModalTitle").textContent = titles[kind] || "Export";
  document.getElementById("exportModalPre").textContent = uiState.currentExportContent;
  document.getElementById("exportModal").classList.add("open");
}

function closeExportModal() {
  document.getElementById("exportModal").classList.remove("open");
}

function copyExportContent() {
  if (navigator.clipboard && uiState.currentExportContent) {
    navigator.clipboard.writeText(uiState.currentExportContent);
  }
}

function downloadExportContent() {
  const extMap = { arxml: "SoAd.arxml", cfgh: "SoAd_Cfg.h", lcfgc: "SoAd_Lcfg.c", json: "SoAd_Config.json" };
  const fname = extMap[uiState.currentExportKind] || "SoAd_Export.txt";
  const blob = new Blob([uiState.currentExportContent], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = fname;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function downloadStandaloneHTML() {
  const html = "<!DOCTYPE html>\n" + document.documentElement.outerHTML;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "AUTOSAR_SoAd_Simulator.html";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function initSimulator() {
  populateScenarioDropdown();
  SCENARIOS[0].setup();
  syncInputsFromConfig();
  initConfigTooltipHandlers();
  renderAll();
}
