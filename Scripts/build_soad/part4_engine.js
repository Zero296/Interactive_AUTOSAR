// ============================================================================
// PART 4A: DEFAULT 36-FIELD ECUC CONFIG, SIMULATION ENGINE & AUTOSAR SOAD APIS
// ============================================================================

const defaultConfig = {
  // Tab 0: 1. General/Buf (6)
  SoAdDevErrorDetect: true,
  SoAdMainFunctionPeriodMs: 10,
  SoAdGetAndResetMeasurementDataApi: true,
  SoAdVersionInfoApi: true,
  SoAdSoConMax: 16,
  SoAdEnableSecurityEventReporting: true,

  // Tab 1: 2. SoConGrp/Proto (6)
  SelectedSoConId: "0",
  SoAdPduHeaderEnable: true,
  SoAdSocketAutomaticSoConSetup: false,
  SoAdSocketProtocolChoice: "UDP",
  SoAdSocketTcpInitiate: false,
  SoAdSocketTcpNoDelayAndKeepAlive: true,

  // Tab 2: 3. SoCon/RemAddr (6)
  ActiveLocalIpAddrState: "TCPIP_IPADDR_STATE_ASSIGNED",
  SoAdSocketLocalAddressAndPort: "192.168.10.20:30490",
  SoAdSocketRemoteAddressAndPort: "192.168.10.100:30490",
  SoAdSocketMsgAcceptanceFilterEnabled: true,
  SoAdSocketUdpAliveSupervisionTimeoutEn: true,
  SoAdSocketFramePriorityVlanPcp: 3,

  // Tab 3: 4. PduRoute/nPdu (6)
  SelectedTxPduRouteId: "PduRoute_0",
  SoAdTxPduHeaderIdHex: "0x01010001",
  SoAdTxUpperLayerType: "IF",
  SoAdTxUdpTriggerMode: "SOAD_TRIGGER_ALWAYS",
  SoAdTxUdpTriggerTimeoutMs: 25,
  SoAdSocketTcpImmediateTpTxConfirmation: false,

  // Tab 4: 5. SockRoute/Rx (6)
  SelectedRxPacketProfile: "PKT_A",
  SoAdRxPduHeaderIdExpectedHex: "0x01010002",
  SoAdRxUpperLayerTarget: "PDUR",
  InjectedRxPayloadLengthBytes: 32,
  SoAdRxBufferMaxCapacityBytes: 2048,
  SoAdSocketUdpStrictHeaderLenCheck: true,

  // Tab 5: 6. RG / SD / DET (6)
  SelectedRoutingGroupId: "RG_0",
  SoAdRoutingGroupIsEnabledAfterInit: true,
  SoAdRoutingGroupTxTriggerable: true,
  SimulateTcpIpBufferBusyOrNoBufs: false,
  PassInvalidArgOrUninitForDetTest: false,
  InjectedTcpIpEventType: "TCPIP_TCP_RESET"
};

let cfg = JSON.parse(JSON.stringify(defaultConfig));
let sim = null;

function createInitialSimState() {
  const soCons = SOCON_DEFS.map(d => ({
    id: d.id,
    name: d.name,
    groupName: d.groupName,
    proto: d.proto,
    autoSetup: d.autoSetup,
    tcpInitiate: d.tcpInitiate,
    headerEnable: d.headerEnable,
    localAddr: d.localAddr,
    remoteAddr: d.remoteAddr,
    rgId: d.rgId,
    mode: "OFFLINE",
    openRefCount: 0,
    tcpEstablished: false,
    tcpSocketId: null,
    matchedLast: false
  }));

  const rgInit = Boolean(cfg.SoAdRoutingGroupIsEnabledAfterInit);
  const routingGroups = {
    RG_0: { id: "RG_0", name: ROUTING_GROUPS.RG_0.name, enabled: rgInit, pendingTx: false, triggerable: Boolean(cfg.SoAdRoutingGroupTxTriggerable) },
    RG_1: { id: "RG_1", name: ROUTING_GROUPS.RG_1.name, enabled: rgInit, pendingTx: false, triggerable: false },
    RG_2: { id: "RG_2", name: ROUTING_GROUPS.RG_2.name, enabled: true, pendingTx: false, triggerable: true }
  };

  return {
    initialized: true,
    clockMs: 0,
    selectedModuleId: "MOD_SOAD",
    localIpState: cfg.ActiveLocalIpAddrState,
    soCons,
    routingGroups,
    nPdu: {
      soConId: 0,
      chunks: [],
      totalBytes: 0,
      timerRemainingMs: 0,
      bundledFramesCount: 0
    },
    rxStream: {
      bufferedBytes: 0,
      expectedTotalBytes: 0,
      pendingHeaderId: null,
      state: "IDLE",
      detail: "IDLE — Không có mảnh PDU dở dang"
    },
    tpSession: {
      active: false,
      direction: null,
      pduRouteId: null,
      soConId: 3,
      totalBytes: 0,
      sentBytes: 0,
      ackedBytes: 0,
      state: "IDLE"
    },
    counters: {
      txPdus: 0,
      rxPdus: 0,
      ifCount: 0,
      tpCount: 0,
      dropTcp: 0,
      dropUdp: 0,
      detCount: 0,
      idsmSecEvents: 0
    },
    lastHeader: {
      enabled: Boolean(cfg.SoAdPduHeaderEnable),
      headerIdHex: cfg.SoAdTxPduHeaderIdHex,
      pduLength: 32,
      payloadDesc: "Chưa có khung truyền/nhận — hãy chạy Step hoặc Quick Action",
      direction: "INIT"
    },
    lastOpFlags: {
      ulModeChg: false,
      npduBundled: false,
      tpStream: false,
      bestMatch: false,
      ulDispatch: false,
      txConfOk: false,
      detErr: false
    },
    activeArrows: [],
    regAByte: 0x00,
    regBByte: 0x00,
    prevRegAByte: 0x00,
    prevRegBByte: 0x00,
    traceLog: [],
    detLog: [],
    lastBestMatchNote: "Sẵn sàng kiểm tra Best-Match",
    lastFlowCaption: "Sẵn sàng (SoAd_Init hoàn tất)"
  };
}

function getActiveSoConId() {
  const id = parseInt(cfg.SelectedSoConId, 10);
  return Number.isNaN(id) || id < 0 || id >= sim.soCons.length ? 0 : id;
}

function getActiveSoCon() {
  return sim.soCons[getActiveSoConId()];
}

function snapshotRegBefore() {
  sim.prevRegAByte = sim.regAByte;
  sim.prevRegBByte = sim.regBByte;
}

function computeRegistersAfter() {
  const sc = getActiveSoCon();
  const rg = sim.routingGroups[sc.rgId] || sim.routingGroups[cfg.SelectedRoutingGroupId];
  let regA = 0;
  if (sim.localIpState === "TCPIP_IPADDR_STATE_ASSIGNED") regA |= 0x80; // B7 IP_ASSIGNED
  if (sc.mode === "ONLINE") regA |= 0x40;                             // B6 SOCON_ONLINE
  if (sc.mode === "RECONNECT") regA |= 0x20;                          // B5 SOCON_RECONN
  if (sc.tcpEstablished) regA |= 0x10;                                // B4 TCP_ESTAB
  if (sc.remoteAddr && !sc.remoteAddr.includes("ANY")) regA |= 0x08;  // B3 REM_ADDR_SET
  if (rg && rg.enabled) regA |= 0x04;                                 // B2 RT_GRP_EN
  if (sc.autoSetup) regA |= 0x02;                                     // B1 AUTO_SOCON
  if (sim.lastOpFlags.ulModeChg) regA |= 0x01;                        // B0 UL_MODE_CHG

  let regB = 0;
  if (sc.headerEnable) regB |= 0x80;                                  // B7 PDU_HDR_EN
  if (sc.proto === "TCP") regB |= 0x40;                               // B6 PROTO_TCP
  if (sim.nPdu.chunks.length > 0 || sim.lastOpFlags.npduBundled) regB |= 0x20; // B5 NPDU_BUNDLED
  if (sim.tpSession.active || sim.rxStream.bufferedBytes > 0 || sim.lastOpFlags.tpStream) regB |= 0x10; // B4 TP_STREAM
  if (sim.lastOpFlags.bestMatch) regB |= 0x08;                        // B3 BEST_MATCH
  if (sim.lastOpFlags.ulDispatch) regB |= 0x04;                       // B2 UL_DISPATCH
  if (sim.lastOpFlags.txConfOk) regB |= 0x02;                         // B1 TX_CONF_OK
  if (sim.lastOpFlags.detErr) regB |= 0x01;                           // B0 DET_ERR

  sim.regAByte = regA;
  sim.regBByte = regB;
}

function advanceClock(deltaMs) {
  const d = typeof deltaMs === "number" ? deltaMs : (parseInt(cfg.SoAdMainFunctionPeriodMs, 10) || 10);
  sim.clockMs += d;
}

function addTrace(kind, api, detail) {
  sim.traceLog.unshift({
    seq: sim.traceLog.length + 1,
    timeMs: sim.clockMs,
    kind,
    api,
    detail
  });
  if (sim.traceLog.length > 60) sim.traceLog.pop();
}

function reportDetError(errKey, apiName, extraDetail, isSecurityEvent) {
  const item = DET_ERROR_CATALOG[errKey] || { code: "0xFF", type: "DEV", desc: "Unknown error" };
  if (item.type === "DEV" && !cfg.SoAdDevErrorDetect) {
    addTrace("info", apiName, `Lỗi ${errKey} bị bỏ qua do SoAdDevErrorDetect=FALSE`);
    return false;
  }
  sim.counters.detCount += 1;
  sim.lastOpFlags.detErr = true;
  sim.activeArrows = ["arrowSoadDet"];
  let secMsg = "";
  if (isSecurityEvent && cfg.SoAdEnableSecurityEventReporting) {
    sim.counters.idsmSecEvents += 1;
    secMsg = " + IdsM_SetSecurityEvent(SOAD_SEV_REJECTED_PDU)";
  }
  sim.detLog.unshift({
    timeMs: sim.clockMs,
    api: apiName,
    errName: errKey,
    code: item.code,
    type: item.type,
    desc: extraDetail || item.desc,
    secEvent: Boolean(isSecurityEvent && cfg.SoAdEnableSecurityEventReporting)
  });
  if (sim.detLog.length > 30) sim.detLog.pop();
  const detFn = item.type === "RUNTIME" ? "Det_ReportRuntimeError" : "Det_ReportError";
  addTrace("det", `${detFn}(56, ${errKey}[${item.code}])`, `${apiName}: ${extraDetail || item.desc}${secMsg}`);
  return true;
}

function syncActiveSoConFieldsFromCfg() {
  const sc = getActiveSoCon();
  sc.proto = cfg.SoAdSocketProtocolChoice;
  sc.headerEnable = Boolean(cfg.SoAdPduHeaderEnable);
  sc.autoSetup = Boolean(cfg.SoAdSocketAutomaticSoConSetup);
  sc.tcpInitiate = Boolean(cfg.SoAdSocketTcpInitiate);
  sc.localAddr = cfg.SoAdSocketLocalAddressAndPort;
  sc.remoteAddr = cfg.SoAdSocketRemoteAddressAndPort;
  sim.localIpState = cfg.ActiveLocalIpAddrState;
}

function pushActiveSoConFieldsToCfg() {
  const sc = getActiveSoCon();
  cfg.SoAdSocketProtocolChoice = sc.proto;
  cfg.SoAdPduHeaderEnable = sc.headerEnable;
  cfg.SoAdSocketAutomaticSoConSetup = sc.autoSetup;
  cfg.SoAdSocketTcpInitiate = sc.tcpInitiate;
  cfg.SoAdSocketLocalAddressAndPort = sc.localAddr;
  cfg.SoAdSocketRemoteAddressAndPort = sc.remoteAddr;
  cfg.SelectedRoutingGroupId = sc.rgId;
}

function applySoAdInit(clearLogs = false) {
  const prevTrace = clearLogs ? [] : (sim ? sim.traceLog : []);
  sim = createInitialSimState();
  sim.traceLog = prevTrace;
  syncActiveSoConFieldsFromCfg();

  // Apply AutoSetup rules per SWS_SoAd_00588 when IP is ASSIGNED
  sim.soCons.forEach(sc => {
    if (sc.autoSetup && sim.localIpState === "TCPIP_IPADDR_STATE_ASSIGNED") {
      sc.openRefCount = 1;
      sc.tcpSocketId = 10 + sc.id;
      if (sc.proto === "UDP") {
        sc.mode = "ONLINE";
        sc.tcpEstablished = false;
      } else {
        sc.mode = "RECONNECT";
        sc.tcpEstablished = false;
      }
    } else {
      sc.mode = "OFFLINE";
      sc.openRefCount = 0;
      sc.tcpEstablished = false;
      sc.tcpSocketId = null;
    }
  });

  sim.lastOpFlags.ulModeChg = true;
  sim.activeArrows = ["arrowSoadEthSM", "arrowSoadTcpIpTx"];
  sim.lastFlowCaption = "SoAd_Init(): Khởi tạo SoConGroup, RoutingGroup và AutoSetup";
  addTrace("socon", "SoAd_Init(ConfigPtr)", `Init ${sim.soCons.length} SoCons; AutoSetup mở những SoCon=TRUE khi IP=ASSIGNED.`);
  computeRegistersAfter();
}

// ============================================================================
// STANDARD AUTOSAR SOAD APIS
// ============================================================================

function SoAd_OpenSoCon(soConIdParam) {
  snapshotRegBefore();
  advanceClock(2);
  sim.lastOpFlags = { ulModeChg: false, npduBundled: false, tpStream: false, bestMatch: false, ulDispatch: false, txConfOk: false, detErr: false };

  if (!sim.initialized || cfg.PassInvalidArgOrUninitForDetTest) {
    reportDetError(sim.initialized ? "SOAD_E_INV_ARG" : "SOAD_E_NOTINIT", "SoAd_OpenSoCon", "DET giả lập được kích hoạt cho SoAd_OpenSoCon.");
    computeRegistersAfter();
    return "E_NOT_OK";
  }
  const id = typeof soConIdParam === "number" ? soConIdParam : getActiveSoConId();
  if (id >= parseInt(cfg.SoAdSoConMax, 10) || !sim.soCons[id]) {
    reportDetError("SOAD_E_INV_ARG", "SoAd_OpenSoCon", `SoConId=${id} vượt SoAdSoConMax=${cfg.SoAdSoConMax}.`);
    computeRegistersAfter();
    return "E_NOT_OK";
  }

  const sc = sim.soCons[id];
  sc.openRefCount += 1;
  sim.activeArrows = ["arrowSdSoad", "arrowSoadTcpIpTx", "arrowSoadEthSM"];

  if (sim.localIpState !== "TCPIP_IPADDR_STATE_ASSIGNED") {
    sc.mode = "RECONNECT";
    sim.lastOpFlags.ulModeChg = true;
    sim.lastFlowCaption = `SoAd_OpenSoCon(${sc.name}): IP chưa ASSIGNED -> RECONNECT`;
    addTrace("socon", `SoAd_OpenSoCon(${sc.name}) -> E_OK`, `OpenRef=${sc.openRefCount}, LocalIp=${sim.localIpState} nên giữ RECONNECT.`);
    computeRegistersAfter();
    return "E_OK";
  }

  sc.tcpSocketId = 10 + sc.id;
  if (sc.proto === "UDP") {
    sc.mode = "ONLINE";
    sc.tcpEstablished = false;
    sim.lastOpFlags.ulModeChg = true;
    sim.lastFlowCaption = `${sc.name} (UDP): TcpIp_GetSocket + Bind(${sc.localAddr}) -> SOAD_SOCON_ONLINE`;
    addTrace("socon", `SoAd_OpenSoCon(${sc.name}) -> TcpIp_Bind(${sc.localAddr})`, `UDP chuyển ngay sang SOAD_SOCON_ONLINE & báo SoConModeChg(ONLINE).`);
  } else {
    sc.mode = "RECONNECT";
    sc.tcpEstablished = false;
    sim.lastOpFlags.ulModeChg = true;
    const tcpCall = sc.tcpInitiate ? `TcpIp_TcpConnect(${sc.remoteAddr})` : `TcpIp_TcpListen(${sc.localAddr})`;
    sim.lastFlowCaption = `${sc.name} (TCP): ${tcpCall} -> Đang chờ Handshake (RECONNECT)`;
    addTrace("socon", `SoAd_OpenSoCon(${sc.name}) -> ${tcpCall}`, `TCP vào SOAD_SOCON_RECONNECT, đợi TcpIp_TcpConnected / TcpAccepted.`);
  }
  computeRegistersAfter();
  return "E_OK";
}

function SoAd_CloseSoCon(soConIdParam, abortFlag = true) {
  snapshotRegBefore();
  advanceClock(2);
  sim.lastOpFlags = { ulModeChg: false, npduBundled: false, tpStream: false, bestMatch: false, ulDispatch: false, txConfOk: false, detErr: false };

  const id = typeof soConIdParam === "number" ? soConIdParam : getActiveSoConId();
  const sc = sim.soCons[id];
  if (!sc) return "E_NOT_OK";

  sc.openRefCount = abortFlag ? 0 : Math.max(0, sc.openRefCount - 1);
  if (sc.openRefCount === 0 || abortFlag) {
    sc.mode = "OFFLINE";
    sc.tcpEstablished = false;
    sc.tcpSocketId = null;
    if (sim.nPdu.soConId === id) {
      sim.nPdu.chunks = [];
      sim.nPdu.totalBytes = 0;
      sim.nPdu.timerRemainingMs = 0;
    }
    if (sim.tpSession.active && sim.tpSession.soConId === id) {
      sim.tpSession.active = false;
      sim.tpSession.state = "ABORTED";
    }
    sim.lastOpFlags.ulModeChg = true;
    sim.activeArrows = ["arrowSdSoad", "arrowSoadTcpIpTx", "arrowSoadEthSM"];
    sim.lastFlowCaption = `SoAd_CloseSoCon(${sc.name}, abort=${abortFlag}) -> SOAD_SOCON_OFFLINE`;
    addTrace("socon", `SoAd_CloseSoCon(${sc.name}, ${abortFlag}) -> TcpIp_Close()`, `Đóng socket; báo SoConModeChg(OFFLINE).`);
  } else {
    addTrace("socon", `SoAd_CloseSoCon(${sc.name}, false)`, `Giảm OpenRef=${sc.openRefCount} (>0) nên vẫn giữ kết nối.`);
  }
  computeRegistersAfter();
  return "E_OK";
}

function flushNpduBuffer(reasonText) {
  if (sim.nPdu.chunks.length === 0) return false;
  const sc = sim.soCons[sim.nPdu.soConId];
  const count = sim.nPdu.chunks.length;
  const totalB = sim.nPdu.totalBytes;
  const hdrList = sim.nPdu.chunks.map(c => `${c.headerIdHex}(${c.len}B)`).join(" + ");

  sim.nPdu.bundledFramesCount += 1;
  sim.counters.txPdus += count;
  sim.nPdu.chunks = [];
  sim.nPdu.totalBytes = 0;
  sim.nPdu.timerRemainingMs = 0;
  sim.lastOpFlags.npduBundled = true;
  sim.lastOpFlags.txConfOk = true;
  sim.activeArrows = ["arrowPduRSoadTx", "arrowSoadTcpIpTx", "arrowTcpIpEthBus"];
  sim.lastHeader = {
    enabled: true,
    headerIdHex: "MULTI-PDU",
    pduLength: totalB,
    payloadDesc: `nPdu Flush (${count} PDUs / ${totalB}B): ${hdrList}`,
    direction: "TX"
  };
  sim.lastFlowCaption = `TcpIp_UdpTransmit(${sc.name}, ${totalB}B) — Gom ${count} PDU (${reasonText})`;
  addTrace("tx", `TcpIp_UdpTransmit(${sc.name}, len=${totalB}B)`, `Xả nPdu (${reasonText}): gom ${hdrList} vào 1 UDP Datagram.`);
  return true;
}

function SoAd_IfTransmit(pduRouteKeyParam) {
  snapshotRegBefore();
  advanceClock(3);
  sim.lastOpFlags = { ulModeChg: false, npduBundled: false, tpStream: false, bestMatch: false, ulDispatch: false, txConfOk: false, detErr: false };

  if (!sim.initialized || cfg.PassInvalidArgOrUninitForDetTest) {
    reportDetError(sim.initialized ? "SOAD_E_INV_PDUID" : "SOAD_E_NOTINIT", "SoAd_IfTransmit", "Truyền TxPduId không hợp lệ hoặc module chưa Init.");
    computeRegistersAfter();
    return "E_NOT_OK";
  }

  const routeKey = pduRouteKeyParam || cfg.SelectedTxPduRouteId;
  const route = TX_PDU_ROUTES[routeKey] || TX_PDU_ROUTES.PduRoute_0;
  const sc = sim.soCons[route.soConId];
  const hdrEnabled = sc.id === getActiveSoConId() ? Boolean(cfg.SoAdPduHeaderEnable) : sc.headerEnable;
  const hdrIdHex = routeKey === cfg.SelectedTxPduRouteId ? cfg.SoAdTxPduHeaderIdHex : route.headerIdHex;
  const trigMode = routeKey === cfg.SelectedTxPduRouteId ? cfg.SoAdTxUdpTriggerMode : route.triggerMode;
  const rg = sim.routingGroups[route.rgId];

  if (sc.mode !== "ONLINE") {
    sim.counters.dropUdp += sc.proto === "UDP" ? 1 : 0;
    sim.counters.dropTcp += sc.proto === "TCP" ? 1 : 0;
    sim.activeArrows = ["arrowPduRSoadTx", "arrowSoadDet"];
    sim.lastFlowCaption = `SoAd_IfTransmit(${route.id}) -> E_NOT_OK: ${sc.name} đang ở ${sc.mode}`;
    addTrace("det", `SoAd_IfTransmit(${route.id}) -> E_NOT_OK`, `Từ chối vì ${sc.name} chưa ONLINE (${sc.mode}).`);
    computeRegistersAfter();
    return "E_NOT_OK";
  }

  if (rg && !rg.enabled) {
    sim.activeArrows = ["arrowPduRSoadTx"];
    sim.lastFlowCaption = `SoAd_IfTransmit(${route.id}): bị chặn bởi RoutingGroup ${rg.id}=DISABLED`;
    addTrace("info", `SoAd_IfTransmit(${route.id}) -> Gated (Skip)`, `RoutingGroup ${rg.id} đang DISABLED nên không chuyển xuống TcpIp.`);
    computeRegistersAfter();
    return "E_OK";
  }

  if (cfg.SimulateTcpIpBufferBusyOrNoBufs) {
    if (sc.proto === "UDP") sim.counters.dropUdp += 1;
    else sim.counters.dropTcp += 1;
    reportDetError("SOAD_E_NOBUFS", "SoAd_IfTransmit", "TcpIp hết buffer Tx (SimulateTcpIpBufferBusyOrNoBufs=TRUE).");
    computeRegistersAfter();
    return "E_NOT_OK";
  }

  const headerSize = hdrEnabled ? 8 : 0;
  const totalFrameBytes = headerSize + route.payloadBytes;
  sim.counters.ifCount += 1;

  sim.lastHeader = {
    enabled: hdrEnabled,
    headerIdHex: hdrEnabled ? hdrIdHex : "DISABLED",
    pduLength: route.payloadBytes,
    payloadDesc: `${route.label} (${route.payloadBytes}B)`,
    direction: "TX"
  };

  // nPdu UDP Bundling check: only for UDP + HeaderEnable=TRUE + TRIGGER_NEVER
  if (sc.proto === "UDP" && hdrEnabled && trigMode === "SOAD_TRIGGER_NEVER") {
    if (sim.nPdu.soConId !== sc.id && sim.nPdu.chunks.length > 0) {
      flushNpduBuffer("Switch SoCon");
    }
    sim.nPdu.soConId = sc.id;
    sim.nPdu.chunks.push({ routeId: route.id, headerIdHex: hdrIdHex, len: totalFrameBytes });
    sim.nPdu.totalBytes += totalFrameBytes;
    const timeoutVal = parseInt(cfg.SoAdTxUdpTriggerTimeoutMs, 10) || 25;
    if (sim.nPdu.timerRemainingMs <= 0) sim.nPdu.timerRemainingMs = timeoutVal;
    sim.lastOpFlags.npduBundled = true;
    sim.activeArrows = ["arrowSwcRte", "arrowRtePduR", "arrowPduRSoadTx"];
    sim.lastFlowCaption = `nPdu Queued: ${route.id} (${totalFrameBytes}B) giữ trong nPdu Buffer (Timeout ${sim.nPdu.timerRemainingMs}ms)`;
    addTrace("tx", `SoAd_IfTransmit(${route.id}) [TRIGGER_NEVER]`, `Nạp ${totalFrameBytes}B (8B Hdr ${hdrIdHex} + ${route.payloadBytes}B) vào nPdu Buffer. Chờ TRIGGER_ALWAYS hoặc ${sim.nPdu.timerRemainingMs}ms.`);
    computeRegistersAfter();
    return "E_OK";
  }

  // If TRIGGER_ALWAYS and there are queued nPdu chunks on same SoCon -> bundle & flush all
  if (sc.proto === "UDP" && hdrEnabled && sim.nPdu.chunks.length > 0 && sim.nPdu.soConId === sc.id) {
    sim.nPdu.chunks.push({ routeId: route.id, headerIdHex: hdrIdHex, len: totalFrameBytes });
    sim.nPdu.totalBytes += totalFrameBytes;
    flushNpduBuffer("TRIGGER_ALWAYS");
    computeRegistersAfter();
    return "E_OK";
  }

  // Direct transmission
  sim.counters.txPdus += 1;
  sim.lastOpFlags.txConfOk = true;
  sim.activeArrows = route.ulModule === "Sd"
    ? ["arrowSdSoad", "arrowSoadTcpIpTx", "arrowTcpIpEthBus"]
    : ["arrowSwcRte", "arrowRtePduR", "arrowPduRSoadTx", "arrowSoadTcpIpTx", "arrowTcpIpEthBus"];

  const tcpIpApi = sc.proto === "TCP" ? "TcpIp_TcpTransmit" : "TcpIp_UdpTransmit";
  sim.lastFlowCaption = `${tcpIpApi}(${sc.name}, ${totalFrameBytes}B) · ${hdrEnabled ? "8B Hdr=" + hdrIdHex : "Raw No-Header"}`;
  addTrace("tx", `SoAd_IfTransmit(${route.id}) -> ${tcpIpApi}(${totalFrameBytes}B)`, `Gửi qua ${sc.name} -> ${sc.remoteAddr} (${hdrEnabled ? "Header " + hdrIdHex : "Raw"} -> VLAN PCP=${cfg.SoAdSocketFramePriorityVlanPcp}).`);
  computeRegistersAfter();
  return "E_OK";
}

function SoAd_TpTransmit(pduRouteKeyParam) {
  snapshotRegBefore();
  advanceClock(3);
  sim.lastOpFlags = { ulModeChg: false, npduBundled: false, tpStream: false, bestMatch: false, ulDispatch: false, txConfOk: false, detErr: false };

  if (!sim.initialized || cfg.PassInvalidArgOrUninitForDetTest) {
    reportDetError(sim.initialized ? "SOAD_E_INV_PDUID" : "SOAD_E_NOTINIT", "SoAd_TpTransmit", "Lỗi DET khi gọi SoAd_TpTransmit().");
    computeRegistersAfter();
    return "E_NOT_OK";
  }

  const routeKey = pduRouteKeyParam || (TX_PDU_ROUTES[cfg.SelectedTxPduRouteId] ? cfg.SelectedTxPduRouteId : "PduRoute_1");
  const route = TX_PDU_ROUTES[routeKey] || TX_PDU_ROUTES.PduRoute_1;
  const sc = sim.soCons[route.soConId];

  if (sc.mode !== "ONLINE") {
    sim.counters.dropTcp += 1;
    sim.activeArrows = ["arrowPduRSoadTx", "arrowSoadDet"];
    sim.lastFlowCaption = `SoAd_TpTransmit(${route.id}) -> E_NOT_OK: ${sc.name} đang ở ${sc.mode}`;
    addTrace("det", `SoAd_TpTransmit(${route.id}) -> E_NOT_OK`, `${sc.name} chưa ONLINE (${sc.mode}).`);
    computeRegistersAfter();
    return "E_NOT_OK";
  }

  if (cfg.SimulateTcpIpBufferBusyOrNoBufs) {
    reportDetError("SOAD_E_NOBUFS", "SoAd_TpTransmit", "TcpIp từ chối cấp phát phiên TP Tx.");
    computeRegistersAfter();
    return "E_NOT_OK";
  }

  const totalBytes = route.payloadBytes;
  const hdrEn = sc.id === getActiveSoConId() ? Boolean(cfg.SoAdPduHeaderEnable) : sc.headerEnable;
  sim.tpSession = {
    active: true,
    direction: "TX",
    pduRouteId: route.id,
    soConId: sc.id,
    totalBytes,
    sentBytes: 0,
    ackedBytes: 0,
    state: "TP_COPY_PENDING"
  };
  sim.counters.tpCount += 1;
  sim.lastOpFlags.tpStream = true;
  sim.lastHeader = {
    enabled: hdrEn,
    headerIdHex: route.headerIdHex,
    pduLength: totalBytes,
    payloadDesc: `TP Stream Init: ${route.label} (${totalBytes}B)`,
    direction: "TX_TP"
  };
  sim.activeArrows = ["arrowPduRSoadTx", "arrowSoadTcpIpTx"];
  sim.lastFlowCaption = `SoAd_TpTransmit(${route.id}, ${totalBytes}B): Khởi tạo phiên TP -> gọi TcpIp_TcpTransmit()`;
  addTrace("tx", `SoAd_TpTransmit(${route.id}, ${totalBytes}B)`, `Lưu trạng thái TP session; chờ TcpIp gọi SoAd_CopyTxData() để rút từng chunk.`);
  computeRegistersAfter();
  return "E_OK";
}

function SoAd_CopyTxData(chunkSize = 600) {
  snapshotRegBefore();
  advanceClock(4);
  sim.lastOpFlags.tpStream = true;
  sim.lastOpFlags.detErr = false;

  if (!sim.tpSession.active) {
    addTrace("info", "SoAd_CopyTxData()", "Không có phiên TP Tx nào đang active.");
    computeRegistersAfter();
    return "BUFREQ_E_NOT_OK";
  }

  if (cfg.SimulateTcpIpBufferBusyOrNoBufs) {
    reportDetError("SOAD_E_NOBUFS", "SoAd_CopyTxData", "Upper Layer trả BUFREQ_E_BUSY trong quá trình copy chunk TP.");
    computeRegistersAfter();
    return "BUFREQ_E_BUSY";
  }

  const remaining = sim.tpSession.totalBytes - sim.tpSession.sentBytes;
  const copied = Math.min(chunkSize, remaining);
  sim.tpSession.sentBytes += copied;
  sim.activeArrows = ["arrowPduRSoadTx", "arrowSoadTcpIpTx", "arrowTcpIpEthBus"];

  const doneCopy = sim.tpSession.sentBytes >= sim.tpSession.totalBytes;
  if (doneCopy) {
    if (cfg.SoAdSocketTcpImmediateTpTxConfirmation) {
      sim.tpSession.active = false;
      sim.tpSession.state = "CONFIRMED_EARLY";
      sim.counters.txPdus += 1;
      sim.lastOpFlags.txConfOk = true;
      sim.lastFlowCaption = `SoAd_CopyTxData(${copied}B) -> Đủ ${sim.tpSession.totalBytes}B -> Immediate TpTxConfirmation(E_OK)`;
      addTrace("tx", `SoAd_CopyTxData() -> PduR_SoAdTpCopyTxData(${copied}B)`, `Copy xong byte cuối (${sim.tpSession.sentBytes}/${sim.tpSession.totalBytes}B). ImmediateTpTxConfirmation=TRUE -> Báo PduR_SoAdTpTxConfirmation(E_OK) ngay.`);
    } else {
      sim.tpSession.state = "WAIT_TCP_ACK";
      sim.lastFlowCaption = `SoAd_CopyTxData(${copied}B) -> Đã gửi ${sim.tpSession.sentBytes}/${sim.tpSession.totalBytes}B, chờ TcpIp_TxConfirmation`;
      addTrace("tx", `SoAd_CopyTxData() -> PduR_SoAdTpCopyTxData(${copied}B)`, `Đã nạp ${sim.tpSession.sentBytes}/${sim.tpSession.totalBytes}B vào TcpIp. Đang đợi TCP ACK qua SoAd_TxConfirmation().`);
    }
  } else {
    sim.lastFlowCaption = `SoAd_CopyTxData(${copied}B) -> Đã copy ${sim.tpSession.sentBytes}/${sim.tpSession.totalBytes}B`;
    addTrace("tx", `SoAd_CopyTxData() -> PduR_SoAdTpCopyTxData(${copied}B)`, `Tiến độ TP: ${sim.tpSession.sentBytes}/${sim.tpSession.totalBytes}B.`);
  }
  computeRegistersAfter();
  return "BUFREQ_OK";
}

function SoAd_TxConfirmation(soConIdParam) {
  snapshotRegBefore();
  advanceClock(2);
  sim.lastOpFlags.txConfOk = true;
  sim.lastOpFlags.detErr = false;

  const id = typeof soConIdParam === "number" ? soConIdParam : (sim.tpSession.active ? sim.tpSession.soConId : getActiveSoConId());
  const sc = sim.soCons[id];

  if (sim.tpSession.active && sim.tpSession.soConId === id && sim.tpSession.sentBytes >= sim.tpSession.totalBytes) {
    sim.tpSession.active = false;
    sim.tpSession.ackedBytes = sim.tpSession.totalBytes;
    sim.tpSession.state = "DONE";
    sim.counters.txPdus += 1;
    sim.lastOpFlags.tpStream = false;
    sim.activeArrows = ["arrowTcpIpSoadRx", "arrowSoadPduRRx"];
    sim.lastFlowCaption = `SoAd_TxConfirmation(${sc.name}) -> PduR_SoAdTpTxConfirmation(E_OK)`;
    addTrace("tx", `SoAd_TxConfirmation(${sc.name}, ${sim.tpSession.totalBytes}B)`, `TCP ACK hoàn tất toàn bộ TP PDU -> Báo PduR_SoAdTpTxConfirmation(E_OK) giải phóng Dcm/DoIP buffer.`);
  } else {
    sim.activeArrows = ["arrowTcpIpSoadRx", "arrowSoadPduRRx"];
    sim.lastFlowCaption = `SoAd_TxConfirmation(${sc.name}) -> UpperLayer_SoAdIfTxConfirmation()`;
    addTrace("tx", `SoAd_TxConfirmation(${sc.name})`, `Xác nhận hoàn tất truyền từ TcpIp lên Upper Layer.`);
  }
  computeRegistersAfter();
}

function matchBestSoCon(proto, remoteIpPort) {
  sim.soCons.forEach(s => { s.matchedLast = false; });
  const parts = (remoteIpPort || "0.0.0.0:0").split(":");
  const remIp = parts[0] || "0.0.0.0";
  const remPort = parts[1] || "0";

  let best = null;
  let bestScore = 0;
  let bestLabel = "";

  sim.soCons.forEach(sc => {
    if (sc.proto !== proto || sc.mode !== "ONLINE") return;
    const scParts = (sc.remoteAddr || "ANY:ANY").split(":");
    const scIp = scParts[0] || "ANY";
    const scPort = scParts[1] || "ANY";

    const ipExact = scIp === remIp;
    const ipAny = scIp === "ANY";
    const portExact = scPort === remPort;
    const portAny = scPort === "ANY";

    let score = 0;
    let label = "";
    if (ipExact && portExact) { score = 4; label = "Exact IP:Port (Score 4)"; }
    else if (ipExact && portAny) { score = 3; label = "Exact IP + ANY Port (Score 3)"; }
    else if (ipAny && portExact) { score = 2; label = "ANY IP + Exact Port (Score 2)"; }
    else if (ipAny && portAny) { score = 1; label = "Wildcard ANY:ANY (Score 1)"; }

    if (score > bestScore) {
      bestScore = score;
      best = sc;
      bestLabel = label;
    }
  });

  if (!best && !cfg.SoAdSocketMsgAcceptanceFilterEnabled) {
    best = sim.soCons.find(s => s.proto === proto && s.mode === "ONLINE") || getActiveSoCon();
    bestScore = 1;
    bestLabel = "Filter OFF Fallback";
  }

  if (best) best.matchedLast = true;
  return { matchedSoCon: best, score: bestScore, label: bestLabel };
}

function dispatchUpperRxCallback(ulTarget, pduName, lenBytes, isTp) {
  const map = {
    PDUR: isTp ? `PduR_SoAdTpStartOfReception/CopyRxData(${pduName}, ${lenBytes}B)` : `PduR_SoAdIfRxIndication(${pduName}, ${lenBytes}B)`,
    SD: `Sd_SoAdIfRxIndication(${pduName}, ${lenBytes}B)`,
    DOIP: isTp ? `DoIP_SoAdTpStartOfReception(${pduName}, ${lenBytes}B)` : `DoIP_SoAdIfRxIndication(${pduName}, ${lenBytes}B)`,
    UDPNM: `UdpNm_SoAdIfRxIndication(${pduName}, ${lenBytes}B)`,
    XCP: `Xcp_SoAdIfRxIndication(${pduName}, ${lenBytes}B)`,
    CDD: `Cdd_SoAdIfRxIndication(${pduName}, ${lenBytes}B)`
  };
  return map[ulTarget] || map.PDUR;
}

function SoAd_RxIndication(profileKeyParam, stageFlag) {
  snapshotRegBefore();
  advanceClock(3);
  sim.lastOpFlags = { ulModeChg: false, npduBundled: false, tpStream: false, bestMatch: false, ulDispatch: false, txConfOk: false, detErr: false };

  if (!sim.initialized || cfg.PassInvalidArgOrUninitForDetTest) {
    reportDetError(sim.initialized ? "SOAD_E_INV_SOCKETID" : "SOAD_E_NOTINIT", "SoAd_RxIndication", "DET lỗi SocketId / Chưa Init trong SoAd_RxIndication().");
    computeRegistersAfter();
    return "E_NOT_OK";
  }

  const profKey = profileKeyParam || cfg.SelectedRxPacketProfile;
  const prof = RX_PKT_PROFILES[profKey] || RX_PKT_PROFILES.PKT_A;
  const payloadLen = parseInt(cfg.InjectedRxPayloadLengthBytes, 10) || prof.payloadBytes;
  const ulTarget = cfg.SoAdRxUpperLayerTarget || prof.ulTarget;
  const hdrEn = Boolean(cfg.SoAdPduHeaderEnable);

  // Best-Match Check
  const bm = matchBestSoCon(prof.proto, prof.remoteIpPort);
  if (!bm.matchedSoCon) {
    if (prof.proto === "UDP") sim.counters.dropUdp += 1;
    else sim.counters.dropTcp += 1;
    sim.lastBestMatchNote = `REJECTED (${prof.remoteIpPort}) — Không khớp SoCon ONLINE`;
    sim.activeArrows = ["arrowTcpIpSoadRx", "arrowSoadDet"];
    sim.lastFlowCaption = `SoAd_RxIndication(${prof.remoteIpPort}) -> Dropped bởi Message Acceptance Filter`;
    reportDetError("SOAD_E_INV_SOCKETID", "SoAd_RxIndication", `Gói ${prof.proto} từ ${prof.remoteIpPort} bị Best-Match Filter loại bỏ.`, true);
    computeRegistersAfter();
    return "E_NOT_OK";
  }

  const sc = bm.matchedSoCon;
  sim.lastOpFlags.bestMatch = true;
  sim.lastBestMatchNote = `${sc.name}: ${bm.label}`;

  const rg = sim.routingGroups[sc.rgId];
  if (rg && !rg.enabled && prof.ulTarget !== "SD") {
    sim.activeArrows = ["arrowTcpIpSoadRx"];
    sim.lastFlowCaption = `SoAd_RxIndication(${sc.name}): RoutingGroup ${rg.id} DISABLED -> Drop Rx`;
    addTrace("rx", `SoAd_RxIndication(${sc.name}) -> Ignored`, `RoutingGroup ${rg.id} đang DISABLED nên không chuyển lên ${ulTarget}.`);
    computeRegistersAfter();
    return "E_OK";
  }

  // Handle PKT_E: Unknown HeaderId
  if (prof.kind === "UNKNOWN_HDR") {
    if (prof.proto === "UDP") sim.counters.dropUdp += 1;
    else sim.counters.dropTcp += 1;
    sim.lastHeader = { enabled: true, headerIdHex: "0xDEADBEEF", pduLength: payloadLen, payloadDesc: "Unknown HeaderId -> Drop + IdsM", direction: "RX_ERR" };
    sim.activeArrows = ["arrowTcpIpSoadRx", "arrowSoadDet"];
    sim.lastFlowCaption = `HeaderId 0xDEADBEEF không tồn tại -> SOAD_E_INV_PDUHEADER_ID + DROP`;
    reportDetError("SOAD_E_INV_PDUHEADER_ID", "SoAd_RxIndication", `Không tìm thấy SocketRoute khớp HeaderId=0xDEADBEEF trên ${sc.name}.`, true);
    computeRegistersAfter();
    return "E_NOT_OK";
  }

  // Handle PKT_C: Fragmented TCP Stream (2-stage or full)
  if (prof.kind === "TCP_FRAG") {
    const cap = parseInt(cfg.SoAdRxBufferMaxCapacityBytes, 10) || 2048;
    if (payloadLen + 8 > cap) {
      sim.counters.dropTcp += 1;
      sim.rxStream = { bufferedBytes: 0, expectedTotalBytes: 0, pendingHeaderId: null, state: "OVERFLOW", detail: `Tràn SoAdRxBuffer (${payloadLen + 8}B > ${cap}B)!` };
      reportDetError("SOAD_E_NOBUFS", "SoAd_RxIndication", `Gói TCP (${payloadLen + 8}B) vượt dung lượng SoAdRxBuffer=${cap}B.`, true);
      computeRegistersAfter();
      return "E_NOT_OK";
    }

    sim.lastOpFlags.tpStream = true;
    if (stageFlag === "PART1" || (stageFlag !== "PART2" && sim.rxStream.state === "IDLE")) {
      const part1Bytes = Math.min(48, Math.floor((payloadLen + 8) / 2));
      sim.rxStream = {
        bufferedBytes: part1Bytes,
        expectedTotalBytes: payloadLen + 8,
        pendingHeaderId: prof.headerIdHex,
        state: "WAIT_MORE",
        detail: `Đang tích lũy mảnh 1: ${part1Bytes} / ${payloadLen + 8} B (chờ mảnh 2)`
      };
      sim.lastHeader = { enabled: true, headerIdHex: prof.headerIdHex, pduLength: payloadLen, payloadDesc: `TCP Fragment 1 (${part1Bytes}/${payloadLen + 8}B)`, direction: "RX_FRAG" };
      sim.activeArrows = ["arrowTcpIpEthBus", "arrowTcpIpSoadRx"];
      sim.lastFlowCaption = `TCP Frag Part 1: Lưu ${part1Bytes}B vào SoAdRxBuffer, chờ đủ ${payloadLen + 8}B`;
      addTrace("rx", `SoAd_RxIndication(${sc.name}, ${part1Bytes}B) [Frag 1]`, `Phân tích Header PduLength=${payloadLen}B, mới nhận ${part1Bytes}B -> Giữ trong SoAdRxBuffer.`);
      computeRegistersAfter();
      return "E_OK";
    } else {
      sim.rxStream = { bufferedBytes: 0, expectedTotalBytes: 0, pendingHeaderId: null, state: "IDLE", detail: `IDLE — Ghép xong ${payloadLen + 8}B & đã đẩy Upper Layer` };
      sim.counters.rxPdus += 1;
      sim.lastOpFlags.ulDispatch = true;
      const ulCall = dispatchUpperRxCallback(ulTarget, "RxPdu_TcpBigData", payloadLen, true);
      sim.lastHeader = { enabled: true, headerIdHex: prof.headerIdHex, pduLength: payloadLen, payloadDesc: `TCP Reassembled Complete (${payloadLen}B -> ${ulTarget})`, direction: "RX" };
      sim.activeArrows = ["arrowTcpIpEthBus", "arrowTcpIpSoadRx", ulTarget === "PDUR" ? "arrowSoadPduRRx" : "arrowUlSoad"];
      sim.lastFlowCaption = `TCP Frag Part 2: Đủ ${payloadLen + 8}B -> ${ulCall}`;
      addTrace("rx", `SoAd_RxIndication(${sc.name}) [Frag 2 Complete] -> ${ulCall}`, `Hoàn tất ghép mảnh TCP trong SoAdRxBuffer và giải phóng buffer.`);
      computeRegistersAfter();
      return "E_OK";
    }
  }

  // Handle PKT_B (Multi-PDU UDP) & PKT_D (Sticky TCP)
  if (prof.kind === "MULTI_UDP" || prof.kind === "TCP_STICKY") {
    const subs = prof.subPdus;
    if (prof.kind === "MULTI_UDP" && cfg.SoAdSocketUdpStrictHeaderLenCheck && payloadLen < 20) {
      sim.counters.dropUdp += 1;
      sim.lastOpFlags.detErr = true;
      sim.lastFlowCaption = `UDP StrictHeaderLenCheck phát hiện gói cụt (${payloadLen}B) -> Drop`;
      addTrace("det", `SoAd_RxIndication(${sc.name}) [StrictLenCheck]`, `PduLength trong 8B Header vượt quá số byte còn lại của UDP datagram -> Rớt gói.`);
      computeRegistersAfter();
      return "E_NOT_OK";
    }

    sim.counters.rxPdus += subs.length;
    sim.lastOpFlags.ulDispatch = true;
    if (prof.kind === "MULTI_UDP") sim.lastOpFlags.npduBundled = true;
    else sim.lastOpFlags.tpStream = true;

    const ulCall1 = dispatchUpperRxCallback(ulTarget, subs[0].name, subs[0].len, false);
    const ulCall2 = dispatchUpperRxCallback(ulTarget, subs[1].name, subs[1].len, false);
    sim.lastHeader = {
      enabled: true,
      headerIdHex: `${subs[0].hdrId} | ${subs[1].hdrId}`,
      pduLength: subs[0].len + subs[1].len,
      payloadDesc: `${prof.kind === "MULTI_UDP" ? "Demux UDP" : "Sticky TCP"} tách 2 PDUs (${subs[0].len}B + ${subs[1].len}B)`,
      direction: "RX"
    };
    sim.activeArrows = ["arrowTcpIpEthBus", "arrowTcpIpSoadRx", "arrowSoadPduRRx"];
    sim.lastFlowCaption = `Vòng lặp Demux tách ${subs.length} PDU -> ${ulCall1} & ${subs[1].name}`;
    addTrace("rx", `SoAd_RxIndication(${sc.name}) [${prof.kind}]`, `Tách Header #1 ${subs[0].hdrId}(${subs[0].len}B) -> ${ulCall1}; Tách Header #2 ${subs[1].hdrId}(${subs[1].len}B) -> ${ulCall2}.`);
    computeRegistersAfter();
    return "E_OK";
  }

  // Standard Single PDU (PKT_A) or Raw No-Header (PKT_F)
  const useHdr = prof.kind === "RAW_NO_HDR" ? false : hdrEn;
  const effHdrId = useHdr ? (cfg.SoAdRxPduHeaderIdExpectedHex || prof.headerIdHex) : "RAW_NO_HDR";
  const ulFinal = prof.kind === "RAW_NO_HDR" ? prof.ulTarget : ulTarget;
  const ulCall = dispatchUpperRxCallback(ulFinal, `RxPdu_${ulFinal}`, payloadLen, false);

  sim.counters.rxPdus += 1;
  sim.lastOpFlags.ulDispatch = true;
  sim.lastHeader = {
    enabled: useHdr,
    headerIdHex: effHdrId,
    pduLength: payloadLen,
    payloadDesc: `${prof.title} (${payloadLen}B -> ${ulFinal})`,
    direction: "RX"
  };

  let upArrow = "arrowSoadPduRRx";
  if (ulFinal === "SD") upArrow = "arrowSdSoad";
  else if (ulFinal === "DOIP" || ulFinal === "UDPNM" || ulFinal === "XCP" || ulFinal === "CDD") upArrow = "arrowUlSoad";

  sim.activeArrows = ["arrowTcpIpEthBus", "arrowTcpIpSoadRx", upArrow];
  sim.lastFlowCaption = `Best-Match=${sc.name} -> ${ulCall}`;
  addTrace("rx", `SoAd_RxIndication(${sc.name}) -> ${ulCall}`, `Khớp ${bm.label}; ${useHdr ? "Tách 8B Header " + effHdrId : "Raw SocketRoute"} đẩy lên ${ulFinal}.`);
  computeRegistersAfter();
  return "E_OK";
}

function SoAd_EnableRouting(rgIdParam) {
  snapshotRegBefore();
  advanceClock(2);
  const rgId = rgIdParam || cfg.SelectedRoutingGroupId;
  const rg = sim.routingGroups[rgId];
  if (!rg) {
    reportDetError("SOAD_E_INV_ARG", "SoAd_EnableRouting", `RoutingGroupId ${rgId} không tồn tại.`);
    computeRegistersAfter();
    return "E_NOT_OK";
  }
  rg.enabled = true;
  sim.lastOpFlags.detErr = false;
  sim.activeArrows = ["arrowSdSoad"];
  sim.lastFlowCaption = `SoAd_EnableRouting(${rgId}) -> Mở thông luồng dịch vụ`;
  addTrace("socon", `SoAd_EnableRouting(${rgId}) -> E_OK`, `SD/BswM đã mở khóa RoutingGroup ${rgId}.`);
  computeRegistersAfter();
  return "E_OK";
}

function SoAd_DisableRouting(rgIdParam) {
  snapshotRegBefore();
  advanceClock(2);
  const rgId = rgIdParam || cfg.SelectedRoutingGroupId;
  const rg = sim.routingGroups[rgId];
  if (!rg) return "E_NOT_OK";
  rg.enabled = false;
  sim.activeArrows = ["arrowSdSoad"];
  sim.lastFlowCaption = `SoAd_DisableRouting(${rgId}) -> Chặn luồng nhưng giữ Socket mở`;
  addTrace("socon", `SoAd_DisableRouting(${rgId}) -> E_OK`, `Đã khóa RoutingGroup ${rgId} (PDU bị chặn dù SoCon vẫn ONLINE).`);
  computeRegistersAfter();
  return "E_OK";
}

function SoAd_IfRoutingGroupTransmit(rgIdParam) {
  snapshotRegBefore();
  advanceClock(2);
  const rgId = rgIdParam || cfg.SelectedRoutingGroupId;
  const rg = sim.routingGroups[rgId];
  if (!rg || !cfg.SoAdRoutingGroupTxTriggerable) {
    reportDetError("SOAD_E_INV_ARG", "SoAd_IfRoutingGroupTransmit", `RoutingGroup ${rgId} không có SoAdRoutingGroupTxTriggerable=TRUE.`);
    computeRegistersAfter();
    return "E_NOT_OK";
  }
  rg.pendingTx = true;
  sim.activeArrows = ["arrowSdSoad", "arrowPduRSoadTx"];
  sim.lastFlowCaption = `SoAd_IfRoutingGroupTransmit(${rgId}) -> Đánh dấu gửi lại Initial Event trong MainFunction`;
  addTrace("tx", `SoAd_IfRoutingGroupTransmit(${rgId}) -> E_OK`, `Đặt cờ pendingTx cho ${rgId}; MainFunction() sẽ kích PduR_SoAdIfTriggerTransmit().`);
  computeRegistersAfter();
  return "E_OK";
}

function SoAd_SetRemoteAddr(soConIdParam, newRemoteAddr) {
  snapshotRegBefore();
  advanceClock(2);
  const id = typeof soConIdParam === "number" ? soConIdParam : getActiveSoConId();
  const sc = sim.soCons[id];
  const addr = newRemoteAddr || cfg.SoAdSocketRemoteAddressAndPort;
  sc.remoteAddr = addr;
  if (id === getActiveSoConId()) cfg.SoAdSocketRemoteAddressAndPort = addr;
  sim.activeArrows = ["arrowSdSoad"];
  sim.lastFlowCaption = `SoAd_SetRemoteAddr(${sc.name}, ${addr})`;
  addTrace("socon", `SoAd_SetRemoteAddr(${sc.name}, "${addr}") -> E_OK`, `Cập nhật Remote IP:Port động cho ${sc.name}.`);
  computeRegistersAfter();
  return "E_OK";
}

function SoAd_SetUniqueRemoteAddr(soConIdParam, peerAddr) {
  snapshotRegBefore();
  advanceClock(2);
  const baseId = typeof soConIdParam === "number" ? soConIdParam : 1;
  const targetId = baseId === 1 ? 3 : baseId;
  const sc = sim.soCons[targetId];
  const addr = peerAddr || "192.168.10.201:55123";
  sc.remoteAddr = addr;
  sc.mode = "ONLINE";
  sc.openRefCount = Math.max(1, sc.openRefCount);
  sim.activeArrows = ["arrowSdSoad", "arrowSoadTcpIpTx"];
  sim.lastFlowCaption = `SoAd_SetUniqueRemoteAddr(Grp=${baseId}, ${addr}) -> Assigned ${sc.name}`;
  addTrace("socon", `SoAd_SetUniqueRemoteAddr(${addr}) -> Assigned ${sc.name}`, `Cấp/khóa một SoCon riêng (${sc.name}) cho peer ${addr} từ nhóm Wildcard.`);
  computeRegistersAfter();
  return targetId;
}

function SoAd_ReleaseRemoteAddr(soConIdParam) {
  snapshotRegBefore();
  advanceClock(2);
  const id = typeof soConIdParam === "number" ? soConIdParam : getActiveSoConId();
  const sc = sim.soCons[id];
  sc.remoteAddr = "ANY:ANY";
  if (id === getActiveSoConId()) cfg.SoAdSocketRemoteAddressAndPort = "ANY:ANY";
  addTrace("socon", `SoAd_ReleaseRemoteAddr(${sc.name})`, `Giải phóng địa chỉ Remote động về Wildcard ANY:ANY.`);
  computeRegistersAfter();
}

function SoAd_TcpConnected(soConIdParam) {
  snapshotRegBefore();
  advanceClock(3);
  const id = typeof soConIdParam === "number" ? soConIdParam : getActiveSoConId();
  const sc = sim.soCons[id];
  if (sc.proto !== "TCP") {
    addTrace("info", `SoAd_TcpConnected(${sc.name})`, `${sc.name} đang là UDP. Đang tìm SoCon TCP RECONNECT...`);
    const tcpSc = sim.soCons.find(s => s.proto === "TCP" && s.mode === "RECONNECT");
    if (tcpSc) return SoAd_TcpConnected(tcpSc.id);
    return;
  }
  sc.tcpEstablished = true;
  sc.mode = "ONLINE";
  sim.lastOpFlags.ulModeChg = true;
  sim.activeArrows = ["arrowTcpIpSoadRx", "arrowSoadEthSM", "arrowSdSoad"];
  sim.lastFlowCaption = `TcpIp -> SoAd_TcpConnected(${sc.name}) -> SOAD_SOCON_ONLINE`;
  addTrace("socon", `SoAd_TcpConnected(${sc.name})`, `TCP 3-way handshake hoàn tất! Chuyển RECONNECT -> ONLINE & báo SoConModeChg(ONLINE).`);
  computeRegistersAfter();
}

function SoAd_TcpAccepted(listenSoConIdParam, peerAddr) {
  snapshotRegBefore();
  advanceClock(3);
  const sc = sim.soCons[typeof listenSoConIdParam === "number" ? listenSoConIdParam : 1];
  sc.remoteAddr = peerAddr || "192.168.10.220:51000";
  sc.tcpEstablished = true;
  sc.mode = "ONLINE";
  sim.lastOpFlags.ulModeChg = true;
  sim.activeArrows = ["arrowTcpIpSoadRx", "arrowSoadEthSM", "arrowUlSoad"];
  sim.lastFlowCaption = `SoAd_TcpAccepted(${sc.name}, ${sc.remoteAddr}) -> SOAD_SOCON_ONLINE`;
  addTrace("socon", `SoAd_TcpAccepted(${sc.name}, "${sc.remoteAddr}") -> E_OK`, `TCP Server chấp nhận Tester/Peer mới, cấp socket kết nối và báo SoConModeChg(ONLINE).`);
  computeRegistersAfter();
  return "E_OK";
}

function SoAd_TcpIpEvent(soConIdParam, eventTypeParam) {
  snapshotRegBefore();
  advanceClock(2);
  const ev = eventTypeParam || cfg.InjectedTcpIpEventType;
  let sc = sim.soCons[typeof soConIdParam === "number" ? soConIdParam : getActiveSoConId()];
  if (sc.proto !== "TCP" && ev.startsWith("TCPIP_TCP")) {
    const tcpSc = sim.soCons.find(s => s.proto === "TCP" && s.mode !== "OFFLINE");
    if (tcpSc) sc = tcpSc;
  }

  sc.tcpEstablished = false;
  if (sim.tpSession.active && sim.tpSession.soConId === sc.id) {
    sim.tpSession.active = false;
    sim.tpSession.state = "ABORTED_BY_RST";
    sim.counters.dropTcp += 1;
    addTrace("det", `PduR_SoAdTpTxConfirmation(E_NOT_OK)`, `Hủy phiên TP đang dở dang trên ${sc.name} do nhận ${ev}.`);
  }
  sim.rxStream = { bufferedBytes: 0, expectedTotalBytes: 0, pendingHeaderId: null, state: "IDLE", detail: "Cleared by TcpIpEvent" };

  if (ev === "TCPIP_TCP_FIN_RECEIVED") {
    sc.mode = sc.openRefCount > 0 ? "RECONNECT" : "OFFLINE";
    addTrace("socon", `SoAd_TcpIpEvent(${sc.name}, ${ev})`, `Peer đóng kết nối lịch sự (FIN); dọn session -> TcpIp_Close() & ${sc.mode}.`);
  } else {
    sc.mode = sc.openRefCount > 0 ? "RECONNECT" : "OFFLINE";
    addTrace("det", `SoAd_TcpIpEvent(${sc.name}, ${ev})`, `Socket lỗi/Reset đột ngột! Hủy Tx/Rx buffer và chuyển ${sc.name} về ${sc.mode}.`);
  }
  sim.lastOpFlags.ulModeChg = true;
  sim.activeArrows = ["arrowTcpIpSoadRx", "arrowSoadEthSM", "arrowSoadDet"];
  sim.lastFlowCaption = `SoAd_TcpIpEvent(${sc.name}, ${ev}) -> ${sc.mode}`;
  computeRegistersAfter();
}

function SoAd_LocalIpAddrAssignmentChg(newStateParam) {
  snapshotRegBefore();
  advanceClock(2);
  const st = newStateParam || cfg.ActiveLocalIpAddrState;
  cfg.ActiveLocalIpAddrState = st;
  sim.localIpState = st;
  sim.lastOpFlags.ulModeChg = true;

  if (st !== "TCPIP_IPADDR_STATE_ASSIGNED") {
    sim.soCons.forEach(sc => {
      sc.tcpEstablished = false;
      if (sc.mode === "ONLINE") {
        sc.mode = sc.openRefCount > 0 ? "RECONNECT" : "OFFLINE";
      }
    });
    if (sim.tpSession.active) {
      sim.tpSession.active = false;
      sim.tpSession.state = "ABORTED_NO_IP";
    }
    sim.activeArrows = ["arrowTcpIpSoadRx", "arrowSoadEthSM", "arrowSoadDet"];
    sim.lastFlowCaption = `LocalIpAddrAssignmentChg(${st}) -> Các SoCon rơi khỏi ONLINE`;
    addTrace("det", `SoAd_LocalIpAddrAssignmentChg(${st})`, `Mất IP cục bộ -> đóng/rơi các socket và báo Sd/EthSM_LocalIpAddrAssignmentChg().`);
  } else {
    sim.soCons.forEach(sc => {
      if (sc.autoSetup) sc.openRefCount = Math.max(1, sc.openRefCount);
      if (sc.openRefCount > 0) {
        sc.mode = sc.proto === "UDP" ? "ONLINE" : "RECONNECT";
      }
    });
    sim.activeArrows = ["arrowTcpIpSoadRx", "arrowSoadEthSM"];
    sim.lastFlowCaption = `LocalIpAddrAssignmentChg(ASSIGNED) -> Kích hoạt AutoSetup / Reconnect`;
    addTrace("socon", `SoAd_LocalIpAddrAssignmentChg(TCPIP_IPADDR_STATE_ASSIGNED)`, `IP đã gán! Tự động bind UDP ONLINE hoặc khởi động TCP RECONNECT cho SoCon có OpenRef>0.`);
  }
  computeRegistersAfter();
}

function SoAd_MainFunction() {
  snapshotRegBefore();
  const period = parseInt(cfg.SoAdMainFunctionPeriodMs, 10) || 10;
  advanceClock(period);
  sim.lastOpFlags.detErr = false;

  let didWork = [];

  // 1. nPdu Trigger Timeout Countdown & Auto-Flush
  if (sim.nPdu.chunks.length > 0) {
    sim.nPdu.timerRemainingMs -= period;
    if (sim.nPdu.timerRemainingMs <= 0) {
      flushNpduBuffer("TriggerTimeout Expired");
      didWork.push("nPdu Timeout Flush");
    } else {
      didWork.push(`nPdu Timer=${sim.nPdu.timerRemainingMs}ms`);
    }
  }

  // 2. Pending RoutingGroup TriggerTransmit
  Object.values(sim.routingGroups).forEach(rg => {
    if (rg.pendingTx && rg.enabled) {
      rg.pendingTx = false;
      sim.counters.txPdus += 1;
      sim.lastOpFlags.txConfOk = true;
      sim.activeArrows = ["arrowPduRSoadTx", "arrowSoadTcpIpTx", "arrowTcpIpEthBus"];
      addTrace("tx", `SoAd_MainFunction() -> PduR_SoAdIfTriggerTransmit(${rg.id})`, `Xả Initial Event thuộc RoutingGroup ${rg.id} qua TcpIp_UdpTransmit().`);
      didWork.push(`RG ${rg.id} TriggerTx`);
    }
  });

  // 3. Pending TP CopyTxData chunk polling
  if (sim.tpSession.active && sim.tpSession.state === "TP_COPY_PENDING") {
    SoAd_CopyTxData(600);
    didWork.push("TP CopyTxData Chunk");
  }

  // 4. TCP RECONNECT retry check
  sim.soCons.forEach(sc => {
    if (sc.mode === "RECONNECT" && sim.localIpState === "TCPIP_IPADDR_STATE_ASSIGNED") {
      didWork.push(`${sc.name} polling RECONNECT`);
    }
  });

  if (didWork.length === 0) {
    addTrace("info", `SoAd_MainFunction() [@${sim.clockMs}ms]`, "Tick định kỳ: kiểm tra nPdu timers, RECONNECT & UDP alive supervision.");
  }
  sim.lastFlowCaption = `SoAd_MainFunction(@${sim.clockMs}ms): ${didWork.join(" · ") || "Idle Tick"}`;
  computeRegistersAfter();
}

function SoAd_TpCancelTransmit(pduRouteKeyParam) {
  snapshotRegBefore();
  advanceClock(2);
  if (!sim.tpSession.active) {
    addTrace("info", "SoAd_TpCancelTransmit()", "Không có phiên TP nào đang truyền để hủy.");
    computeRegistersAfter();
    return "E_NOT_OK";
  }
  const routeId = pduRouteKeyParam || sim.tpSession.pduRouteId;
  sim.tpSession.active = false;
  sim.tpSession.state = "CANCELLED";
  sim.lastOpFlags.tpStream = false;
  sim.activeArrows = ["arrowPduRSoadTx", "arrowSoadDet"];
  sim.lastFlowCaption = `SoAd_TpCancelTransmit(${routeId}) -> Hủy phiên TP đang truyền`;
  addTrace("det", `SoAd_TpCancelTransmit(${routeId}) -> E_OK`, `Dừng CopyTxData() và đóng/làm sạch socket stream liên quan.`);
  computeRegistersAfter();
  return "E_OK";
}

function SoAd_ChangeParameter(soConIdParam) {
  snapshotRegBefore();
  advanceClock(2);
  const sc = sim.soCons[typeof soConIdParam === "number" ? soConIdParam : getActiveSoConId()];
  const pcp = cfg.SoAdSocketFramePriorityVlanPcp;
  const noDelay = cfg.SoAdSocketTcpNoDelayAndKeepAlive;
  sim.activeArrows = ["arrowSoadTcpIpTx"];
  sim.lastFlowCaption = `TcpIp_ChangeParameter(${sc.name}): VLAN PCP=${pcp}, NoDelay/KA=${noDelay}`;
  addTrace("socon", `SoAd_ChangeParameter(${sc.name}) -> TcpIp_ChangeParameter()`, `Cập nhật TCPIP_PARAMID_FRAMEPRIO=${pcp}, TCP_NAGLE=${!noDelay}, KEEPALIVE=${noDelay}.`);
  computeRegistersAfter();
  return "E_OK";
}

function SoAd_GetAndResetMeasurementData() {
  snapshotRegBefore();
  advanceClock(1);
  if (!cfg.SoAdGetAndResetMeasurementDataApi) {
    addTrace("det", "SoAd_GetAndResetMeasurementData()", "API đang bị tắt bởi SoAdGetAndResetMeasurementDataApi=FALSE!");
    return null;
  }
  const snap = { dropTcp: sim.counters.dropTcp, dropUdp: sim.counters.dropUdp };
  sim.counters.dropTcp = 0;
  sim.counters.dropUdp = 0;
  sim.activeArrows = ["arrowSoadDet"];
  sim.lastFlowCaption = `GetAndResetMeasurementData(): Đọc TCP=${snap.dropTcp}, UDP=${snap.dropUdp} & Reset=0`;
  addTrace("info", `SoAd_GetAndResetMeasurementData(SOAD_MEAS_ALL)`, `Đọc bộ đếm rớt gói (TCP=${snap.dropTcp}, UDP=${snap.dropUdp}) và xóa về 0.`);
  computeRegistersAfter();
  return snap;
}

function SoAd_GetVersionInfo(testNullPtr = false) {
  snapshotRegBefore();
  advanceClock(1);
  if (!cfg.SoAdVersionInfoApi) {
    addTrace("det", "SoAd_GetVersionInfo()", "API bị vô hiệu hóa do SoAdVersionInfoApi=FALSE.");
    return null;
  }
  if (testNullPtr || cfg.PassInvalidArgOrUninitForDetTest) {
    reportDetError("SOAD_E_PARAM_POINTER", "SoAd_GetVersionInfo", "Truyền NULL_PTR vào SoAd_GetVersionInfo().");
    computeRegistersAfter();
    return null;
  }
  const v = { moduleID: SOAD_MODULE_ID, vendorID: SOAD_VENDOR_ID, ...SOAD_SW_VERSION };
  addTrace("info", "SoAd_GetVersionInfo(&ver)", `Trả về ModuleID=${v.moduleID} (0x0038), SW=${v.major}.${v.minor}.${v.patch}.`);
  computeRegistersAfter();
  return v;
}

// ============================================================================
// ECUC VALIDATION & CODE/ARXML ARTIFACT GENERATORS
// ============================================================================

function validateSoAdConfig() {
  const warns = [];
  const scId = parseInt(cfg.SelectedSoConId, 10) || 0;
  if (scId >= parseInt(cfg.SoAdSoConMax, 10)) {
    warns.push(`⚠ SelectedSoConId (${scId}) >= SoAdSoConMax (${cfg.SoAdSoConMax}): Vượt giới hạn cấu hình!`);
  }
  if (!cfg.SoAdPduHeaderEnable && cfg.SoAdTxUdpTriggerMode === "SOAD_TRIGGER_NEVER") {
    warns.push("⚠ nPdu Bundling (SOAD_TRIGGER_NEVER) yêu cầu SoAdPduHeaderEnable = TRUE để tách ranh giới PDU.");
  }
  if (cfg.SoAdSocketProtocolChoice === "UDP" && cfg.SoAdSocketTcpInitiate) {
    warns.push("ℹ SoAdSocketTcpInitiate chỉ áp dụng khi giao thức là TCP.");
  }
  if (parseInt(cfg.SoAdRxBufferMaxCapacityBytes, 10) < parseInt(cfg.InjectedRxPayloadLengthBytes, 10) + 8) {
    warns.push("⚠ InjectedRxPayloadLengthBytes + 8B Header vượt SoAdRxBufferMaxCapacityBytes -> Sẽ tràn SoAdRxBuffer trên TCP!");
  }
  return warns;
}

function generateExportArtifact(kind) {
  if (kind === "json") {
    return JSON.stringify({ module: "SoAd", moduleId: 56, ecucConfig: cfg, runtimeSoCons: sim.soCons }, null, 2);
  }
  if (kind === "cfgh") {
    return `/* Generated AUTOSAR Classic SoAd_Cfg.h (R22-11 / R23-11) */
#ifndef SOAD_CFG_H
#define SOAD_CFG_H

#define SOAD_MODULE_ID                                 (56U)
#define SOAD_DEV_ERROR_DETECT                          (${cfg.SoAdDevErrorDetect ? "STD_ON" : "STD_OFF"})
#define SOAD_VERSION_INFO_API                          (${cfg.SoAdVersionInfoApi ? "STD_ON" : "STD_OFF"})
#define SOAD_GET_RESET_MEASUREMENT_DATA_API            (${cfg.SoAdGetAndResetMeasurementDataApi ? "STD_ON" : "STD_OFF"})
#define SOAD_ENABLE_SECURITY_EVENT_REPORTING           (${cfg.SoAdEnableSecurityEventReporting ? "STD_ON" : "STD_OFF"})
#define SOAD_MAIN_FUNCTION_PERIOD_MS                   (${cfg.SoAdMainFunctionPeriodMs}U)
#define SOAD_SOCON_MAX                                 (${cfg.SoAdSoConMax}U)
#define SOAD_RX_BUFFER_MAX_BYTES                       (${cfg.SoAdRxBufferMaxCapacityBytes}U)
#define SOAD_UDP_STRICT_HEADER_LEN_CHECK               (${cfg.SoAdSocketUdpStrictHeaderLenCheck ? "STD_ON" : "STD_OFF"})
#define SOAD_TCP_IMMEDIATE_TP_TX_CONFIRMATION          (${cfg.SoAdSocketTcpImmediateTpTxConfirmation ? "STD_ON" : "STD_OFF"})

#endif /* SOAD_CFG_H */
`;
  }
  if (kind === "lcfgc") {
    const activeSc = getActiveSoCon();
    return `/* Generated AUTOSAR Classic SoAd_Lcfg.c */
#include "SoAd.h"

CONST(SoAd_SocketConnectionGroupType, SOAD_CONST) SoAd_SocketConnectionGroupCfg[] = {
  {
    /* Active Group: ${activeSc.groupName} */
    .PduHeaderEnable = ${cfg.SoAdPduHeaderEnable ? "TRUE" : "FALSE"},
    .AutomaticSoConSetup = ${cfg.SoAdSocketAutomaticSoConSetup ? "TRUE" : "FALSE"},
    .Protocol = TCPIP_IPPROTO_${cfg.SoAdSocketProtocolChoice},
    .TcpInitiate = ${cfg.SoAdSocketTcpInitiate ? "TRUE" : "FALSE"},
    .TcpNoDelay = ${cfg.SoAdSocketTcpNoDelayAndKeepAlive ? "TRUE" : "FALSE"},
    .MsgAcceptanceFilter = ${cfg.SoAdSocketMsgAcceptanceFilterEnabled ? "TRUE" : "FALSE"},
    .FramePriorityVlanPcp = ${cfg.SoAdSocketFramePriorityVlanPcp}U,
    .UdpTriggerTimeoutMs = ${cfg.SoAdTxUdpTriggerTimeoutMs}U
  }
};

CONST(SoAd_PduRouteType, SOAD_CONST) SoAd_PduRouteCfg[] = {
  {
    .PduRouteId = 0U, /* ${cfg.SelectedTxPduRouteId} */
    .TxPduHeaderId = ${cfg.SoAdTxPduHeaderIdHex}UL,
    .UpperLayerType = SOAD_UL_${cfg.SoAdTxUpperLayerType},
    .TriggerMode = ${cfg.SoAdTxUdpTriggerMode}
  }
};

CONST(SoAd_RoutingGroupType, SOAD_CONST) SoAd_RoutingGroupCfg[] = {
  {
    .RoutingGroupId = 0U, /* ${cfg.SelectedRoutingGroupId} */
    .IsEnabledAfterInit = ${cfg.SoAdRoutingGroupIsEnabledAfterInit ? "TRUE" : "FALSE"},
    .TxTriggerable = ${cfg.SoAdRoutingGroupTxTriggerable ? "TRUE" : "FALSE"}
  }
};
`;
  }
  // ARXML
  return `<?xml version="1.0" encoding="UTF-8"?>
<AUTOSAR xmlns="http://autosar.org/schema/r4.0">
  <AR-PACKAGES>
    <AR-PACKAGE>
      <SHORT-NAME>SoAd_EcucConfig</SHORT-NAME>
      <ELEMENTS>
        <ECUC-MODULE-CONFIGURATION-VALUES>
          <SHORT-NAME>SoAd</SHORT-NAME>
          <CONTAINERS>
            <ECUC-CONTAINER-VALUE>
              <SHORT-NAME>SoAdGeneral</SHORT-NAME>
              <PARAMETER-VALUES>
                <ECUC-BOOLEAN-VALUE><DEFINITION-REF DEST="ECUC-BOOLEAN-PARAM-DEF">/AUTOSAR/EcucDefs/SoAd/SoAdGeneral/SoAdDevErrorDetect</DEFINITION-REF><VALUE>${cfg.SoAdDevErrorDetect}</VALUE></ECUC-BOOLEAN-VALUE>
                <ECUC-INTEGER-VALUE><DEFINITION-REF DEST="ECUC-INTEGER-PARAM-DEF">/AUTOSAR/EcucDefs/SoAd/SoAdGeneral/SoAdSoConMax</DEFINITION-REF><VALUE>${cfg.SoAdSoConMax}</VALUE></ECUC-INTEGER-VALUE>
                <ECUC-FLOAT-VALUE><DEFINITION-REF DEST="ECUC-FLOAT-PARAM-DEF">/AUTOSAR/EcucDefs/SoAd/SoAdGeneral/SoAdMainFunctionPeriod</DEFINITION-REF><VALUE>${(cfg.SoAdMainFunctionPeriodMs / 1000).toFixed(3)}</VALUE></ECUC-FLOAT-VALUE>
              </PARAMETER-VALUES>
            </ECUC-CONTAINER-VALUE>
            <ECUC-CONTAINER-VALUE>
              <SHORT-NAME>SoAdSocketConnectionGroup_Active</SHORT-NAME>
              <PARAMETER-VALUES>
                <ECUC-BOOLEAN-VALUE><DEFINITION-REF DEST="ECUC-BOOLEAN-PARAM-DEF">/AUTOSAR/EcucDefs/SoAd/SoAdConfig/SoAdSocketConnectionGroup/SoAdPduHeaderEnable</DEFINITION-REF><VALUE>${cfg.SoAdPduHeaderEnable}</VALUE></ECUC-BOOLEAN-VALUE>
                <ECUC-BOOLEAN-VALUE><DEFINITION-REF DEST="ECUC-BOOLEAN-PARAM-DEF">/AUTOSAR/EcucDefs/SoAd/SoAdConfig/SoAdSocketConnectionGroup/SoAdSocketAutomaticSoConSetup</DEFINITION-REF><VALUE>${cfg.SoAdSocketAutomaticSoConSetup}</VALUE></ECUC-BOOLEAN-VALUE>
                <ECUC-TEXTUAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-ENUMERATION-PARAM-DEF">/AUTOSAR/EcucDefs/SoAd/SoAdConfig/SoAdSocketConnectionGroup/SoAdSocketProtocolChoice</DEFINITION-REF><VALUE>${cfg.SoAdSocketProtocolChoice}</VALUE></ECUC-TEXTUAL-PARAM-VALUE>
                <ECUC-INTEGER-VALUE><DEFINITION-REF DEST="ECUC-INTEGER-PARAM-DEF">/AUTOSAR/EcucDefs/SoAd/SoAdConfig/SoAdSocketConnectionGroup/SoAdSocketFramePriority</DEFINITION-REF><VALUE>${cfg.SoAdSocketFramePriorityVlanPcp}</VALUE></ECUC-INTEGER-VALUE>
              </PARAMETER-VALUES>
            </ECUC-CONTAINER-VALUE>
          </CONTAINERS>
        </ECUC-MODULE-CONFIGURATION-VALUES>
      </ELEMENTS>
    </AR-PACKAGE>
  </AR-PACKAGES>
</AUTOSAR>
`;
}
