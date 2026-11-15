// ==================== DOIP SIMULATION ENGINE & SWS_DOIP R23-11 APIS ====================

const defaultConfig = {
  // Tab 0: General & Identification (6)
  DoIPDevErrorDetect: true,
  DoIPVersionInfoApi: true,
  DoIPActivationLinePinMode: "ACTIVE",
  DoIPLogicalAddressHex: "0x1001",
  DoIPEidMacHex: "00:1A:2B:3C:4D:5E",
  DoIPVinString: "WBA1234567890DOIP",

  // Tab 1: UDP Vehicle Announcement (6)
  DoIPVehicleAnnounceCount: 3,
  DoIPVehicleAnnounceIntervalMs: 500,
  DoIPInitialVehicleAnnounceDelayMs: 250,
  DoIPFurtherActionByteHex: "0x00",
  DoIPVinGidSyncStatus: true,
  DoIPUseMacForGid: true,

  // Tab 2: TCP Sockets & Timers (7)
  DoIPMaxTesterConnections: 3,
  DoIPInitialInactivityTimeMs: 2000,
  DoIPGeneralInactivityTimeMs: 300000,
  DoIPAliveCheckResponseTimeoutMs: 500,
  DoIPMainFunctionPeriodMs: 10,
  DoIPHostNameSizeMax: 32,
  DoIPEnableTlsPort3496: false,

  // Tab 3: Routing Activation & SWC (6)
  DoIPMaxByteArrayLength: 4096,
  DoIPAuthCallbackMode: "RTE_SYNC_OK",
  DoIPConfCallbackRequired: true,
  DoIPRoutingActivationNumHex: "0x00",
  DoIPSourceAddressTester1Hex: "0x0E00",
  DoIPSourceAddressTester2Hex: "0x0E01",

  // Tab 4: Target Channels & Gateway (6)
  DoIPLocalDcmTargetHex: "0x1001",
  DoIPGwCanTpTargetHex: "0x2001",
  DoIPFuncGroupTargetHex: "0xE400",
  DoIPUseHeaderNackOnInvalidLen: true,
  DoIPEnableDiagAck0x8002: true,
  DoIPMaxTpChunkBytes: 1460,

  // Tab 5: Runtime Injection & Security (5)
  InjectedProtoVerHex: "0x02",
  InjectedInvVerHex: "0xFD",
  InjectedDiagPayloadLen: 7,
  InjectedDiagDataHex: "22 F1 90",
  DoIPEnableIdsMSecurityEvents: true
};

let cfg = Object.assign({}, defaultConfig);
let sim = null;

function fmtHex(num, width) {
  const n = (Number(num) >>> 0);
  return "0x" + n.toString(16).toUpperCase().padStart(width || 2, "0");
}

function parseHexNum(str, fallback) {
  if (typeof str === "number" && !Number.isNaN(str)) return str;
  const s = String(str || "").trim();
  const v = s.toLowerCase().startsWith("0x") ? parseInt(s, 16) : parseInt(s, 10);
  return Number.isNaN(v) ? (fallback || 0) : v;
}

function buildEmptyConnPool(maxConns) {
  const n = Math.max(1, Math.min(5, Number(maxConns) || 3));
  const arr = [];
  for (let i = 0; i < n; i++) {
    arr.push({
      soConId: i,
      port: cfg.DoIPEnableTlsPort3496 ? 3496 : 13400,
      sockState: "CLOSED",       // CLOSED | ONLINE
      testerSa: "---",
      routingState: "NONE",      // NONE | WAIT_ROUTING_ACT | AUTH_PENDING | CONF_PENDING | ROUTING_ACTIVE | ALIVE_CHECK_WAIT
      initTimerMs: 0,
      genTimerMs: 0,
      aliveTimerMs: 0,
      tpBufLocked: false,
      authPendingTicks: 0
    });
  }
  return arr;
}

function createInitialSimState() {
  return {
    simTimeMs: 0,
    initialized: false,
    nodeState: "UNINIT",         // UNINIT | INACTIVE | WAIT_IP_ASSIGN | ANNOUNCE_WAIT | ONLINE_READY | SHUTDOWN
    tcpState: "SOCKET_CLOSED",   // SOCKET_CLOSED | WAIT_ROUTING_ACT | AUTH_PENDING | CONF_PENDING | ROUTING_ACTIVE | ALIVE_CHECK_WAIT
    actLineActive: false,
    ipAssigned: false,
    announceDoneCount: 0,
    announceTargetCount: Number(cfg.DoIPVehicleAnnounceCount) || 3,
    announceWaitRemainMs: 0,
    announceIntervalRemainMs: 0,
    swcAuthGranted: false,
    alivePending: false,
    gwCanTpActive: false,
    lastHeaderOk: true,
    lastLenOk: true,
    lastSaTaOk: true,
    tpBufferLocked: false,
    lastDiagAck: false,
    lastDiagNack: false,
    lastHeaderNack: false,
    detEvents: 0,
    idsmEvents: 0,
    selectedSlotIdx: 0,
    tcpConns: buildEmptyConnPool(cfg.DoIPMaxTesterConnections),
    regA: 0x00,
    regB: 0xC0,
    prevRegA: 0x00,
    prevRegB: 0xC0,
    lastFrame: {
      dir: "IDLE",
      protoVer: "0x02",
      invVer: "0xFD",
      payloadType: "0x0004",
      payloadLen: 33,
      payloadSummary: "VIN=" + cfg.DoIPVinString + " | LA=" + cfg.DoIPLogicalAddressHex + " | EID=" + cfg.DoIPEidMacHex,
      xorOk: true,
      lenOk: true
    },
    activeArrows: {},
    stepNarrative: {
      title: "Chờ Khởi Tạo DoIP Stack (UNINIT)",
      inputOrigin: "ECU đang Reset hoặc chưa thực thi EcuM -> BswM -> DoIP_Init(&DoIP_Config).",
      processDetail: "Mọi socket UDP/TCP 13400 đều đóng. Sau khi DoIP_Init() chạy xong, ECU cần cả Activation Line ACTIVE và Local IP ASSIGNED để kích hoạt khám phá UDP 0x0004.",
      outputDest: "Chuyển sang kịch bản S1 và bấm [Bước tiếp ▶] hoặc nút [🔌 ActLine] để bắt đầu.",
      bitChange: "RegA=0x00, RegB=0xC0",
      apiSignature: "/* Pending DoIP_Init(&DoIP_Config); ModuleId = 173 (0x00AD) */",
      resultBadge: "UNINIT",
      tone: "warn"
    },
    cCodeSnippet: [
      "/* AUTOSAR Classic R23-11 DoIP Startup Sequence */",
      "DoIP_Init(&DoIP_Config);                   /* ModuleId = 173 */",
      "DoIP_ActivationLineSwitchActive();          /* Pin / BswM ON */",
      "DoIP_LocalIpAddrAssignmentChg(0u, TCPIP_IPADDR_STATE_ASSIGNED);"
    ].join("\n"),
    trace: []
  };
}

function resizeTcpConnPoolIfNeeded() {
  if (!sim) return;
  const target = Math.max(1, Math.min(5, Number(cfg.DoIPMaxTesterConnections) || 3));
  while (sim.tcpConns.length < target) {
    sim.tcpConns.push({
      soConId: sim.tcpConns.length,
      port: cfg.DoIPEnableTlsPort3496 ? 3496 : 13400,
      sockState: "CLOSED",
      testerSa: "---",
      routingState: "NONE",
      initTimerMs: 0,
      genTimerMs: 0,
      aliveTimerMs: 0,
      tpBufLocked: false,
      authPendingTicks: 0
    });
  }
  if (sim.tcpConns.length > target) {
    sim.tcpConns.length = target;
    if (sim.selectedSlotIdx >= target) sim.selectedSlotIdx = 0;
  }
}

function computeNodeRoutingByte() {
  if (!sim) return 0;
  const hasTcpOnline = sim.tcpConns.some(c => c.sockState === "ONLINE");
  const hasRoutingActive = sim.tcpConns.some(c => c.routingState === "ROUTING_ACTIVE");
  const hasAliveWait = sim.tcpConns.some(c => c.routingState === "ALIVE_CHECK_WAIT") || sim.alivePending;
  const hasUdpSent = sim.announceDoneCount > 0 || (sim.lastFrame && ["0x0001","0x0002","0x0003","0x0004","0x4001","0x4002","0x4003","0x4004"].includes(sim.lastFrame.payloadType));
  let b = 0;
  if (sim.actLineActive) b |= (1 << 7);
  if (sim.ipAssigned) b |= (1 << 6);
  if (hasUdpSent) b |= (1 << 5);
  if (hasTcpOnline) b |= (1 << 4);
  if (hasRoutingActive) b |= (1 << 3);
  if (sim.swcAuthGranted) b |= (1 << 2);
  if (hasAliveWait) b |= (1 << 1);
  if (sim.gwCanTpActive) b |= (1 << 0);
  return b;
}

function computeHeaderDiagByte() {
  if (!sim) return 0;
  const tpLock = sim.tpBufferLocked || sim.tcpConns.some(c => c.tpBufLocked);
  let b = 0;
  if (sim.lastHeaderOk) b |= (1 << 7);
  if (sim.lastLenOk) b |= (1 << 6);
  if (sim.lastSaTaOk) b |= (1 << 5);
  if (tpLock) b |= (1 << 4);
  if (sim.lastDiagAck) b |= (1 << 3);
  if (sim.lastDiagNack) b |= (1 << 2);
  if (sim.lastHeaderNack) b |= (1 << 1);
  if ((sim.detEvents + sim.idsmEvents) > 0) b |= (1 << 0);
  return b;
}

function snapshotRegBefore() {
  if (!sim) return;
  sim.prevRegA = sim.regA;
  sim.prevRegB = sim.regB;
}

function updateRegistersAfter() {
  if (!sim) return;
  sim.regA = computeNodeRoutingByte();
  sim.regB = computeHeaderDiagByte();
  const sel = sim.tcpConns[sim.selectedSlotIdx] || sim.tcpConns[0];
  if (sim.nodeState !== "UNINIT" && sel && sel.sockState === "ONLINE") {
    sim.tcpState = sel.routingState === "NONE" ? "WAIT_ROUTING_ACT" : sel.routingState;
  } else if (!sim.tcpConns.some(c => c.sockState === "ONLINE")) {
    sim.tcpState = "SOCKET_CLOSED";
  }
}

function addTrace(api, detail, level) {
  if (!sim) return;
  sim.trace.unshift({
    t: sim.simTimeMs,
    api: api,
    detail: detail,
    level: level || "info"
  });
  if (sim.trace.length > 45) sim.trace.length = 45;
}

function reportDetAndIdsm(apiIdHex, errName, severityLabel, reason, raiseIdsm) {
  if (!sim) return;
  if (cfg.DoIPDevErrorDetect) {
    sim.detEvents += 1;
    addTrace("Det_ReportError(173, 0, " + apiIdHex + ", " + errName + ")", reason, "err");
  } else {
    addTrace("DET Disabled Guard Bypass!", reason + " (DoIPDevErrorDetect=FALSE!)", "warn");
  }
  if (raiseIdsm && cfg.DoIPEnableIdsMSecurityEvents) {
    sim.idsmEvents += 1;
    addTrace("IdsM_SetSecurityEvent(" + severityLabel + ")", reason, "err");
  }
}

function advanceClock(deltaMs) {
  if (!sim) return;
  sim.simTimeMs += Math.max(0, Number(deltaMs) || 0);
}

function setLastFrame(dir, pVer, invVer, pType, pLen, summary) {
  const v = parseHexNum(pVer, 0x02) & 0xFF;
  const iv = parseHexNum(invVer, 0xFD) & 0xFF;
  const xorOk = ((v ^ iv) & 0xFF) === 0xFF;
  const lenOk = Number(pLen) <= Number(cfg.DoIPMaxByteArrayLength);
  sim.lastHeaderOk = xorOk;
  sim.lastLenOk = lenOk;
  sim.lastFrame = {
    dir: dir,
    protoVer: fmtHex(v, 2),
    invVer: fmtHex(iv, 2),
    payloadType: pType,
    payloadLen: Number(pLen) || 0,
    payloadSummary: summary || "",
    xorOk: xorOk,
    lenOk: lenOk
  };
}

// ==================== CORE SWS_DOIP API FUNCTIONS ====================

function api_DoIP_Init() {
  const prevTrace = sim ? sim.trace : [];
  sim = createInitialSimState();
  sim.trace = prevTrace;
  snapshotRegBefore();
  sim.initialized = true;
  sim.nodeState = "INACTIVE";
  sim.tcpState = "SOCKET_CLOSED";
  sim.activeArrows = { arr_bswm_doip: "active" };
  sim.stepNarrative = {
    title: "DoIP_Init(&DoIP_Config) — Khởi Tạo ModuleId 173 (0x00AD)",
    inputOrigin: "EcuM / BswM thực thi chuỗi Init BSW sau Reset.",
    processDetail: "Xóa sạch bảng DoIP_TcpConnTable (" + cfg.DoIPMaxTesterConnections + " slots), đặt Node State = INACTIVE, vô hiệu hóa mọi bộ đếm T_Initial/T_General/T_Alive và chờ Activation Line + IP Assignment.",
    outputDest: "DoIP sẵn sàng nhận DoIP_ActivationLineSwitchActive() từ BswM và LocalIpAddrAssignmentChg() từ SoAd.",
    bitChange: "RegA=0x00, RegB=0xC0 (Header/Len guard sẵn sàng).",
    apiSignature: "void DoIP_Init(const DoIP_ConfigType* DoIPConfigPtr);",
    resultBadge: "INACTIVE (INIT OK)",
    tone: "ok"
  };
  sim.cCodeSnippet = [
    "/* SWS_DoIP_00001: Initialize DoIP (ModuleId 173) */",
    "DoIP_Init(&DoIP_Config_PB);",
    "/* NodeState = DOIP_STATE_INACTIVE, TcpConnTable[" + cfg.DoIPMaxTesterConnections + "] cleared */"
  ].join("\n");
  addTrace("DoIP_Init(&DoIP_Config)", "Khởi tạo thành công " + cfg.DoIPMaxTesterConnections + " TCP slots -> INACTIVE", "ok");
  updateRegistersAfter();
}

function api_DoIP_ActivationLineSwitch(turnActive) {
  if (!sim) api_DoIP_Init();
  if (!sim.initialized) {
    reportDetAndIdsm("0x0F", "DOIP_E_UNINIT (0x01)", "DOIP_SEV_UNINIT", "Gọi DoIP_ActivationLineSwitch trước DoIP_Init()", false);
    updateRegistersAfter();
    return;
  }
  snapshotRegBefore();
  advanceClock(5);
  const next = turnActive !== undefined ? Boolean(turnActive) : !sim.actLineActive;
  sim.actLineActive = next;
  cfg.DoIPActivationLinePinMode = next ? "ACTIVE" : "INACTIVE";

  if (next) {
    sim.activeArrows = { arr_bswm_doip: "active" };
    if (sim.ipAssigned) {
      sim.nodeState = "ANNOUNCE_WAIT";
      sim.announceWaitRemainMs = Number(cfg.DoIPInitialVehicleAnnounceDelayMs) || 250;
      sim.announceTargetCount = Number(cfg.DoIPVehicleAnnounceCount) || 3;
    } else {
      sim.nodeState = "WAIT_IP_ASSIGN";
    }
    sim.stepNarrative = {
      title: "DoIP_ActivationLineSwitchActive() — Bật Đường Kích Hoạt DoIP",
      inputOrigin: "BswM phát hiện OBD Pin 8 HIGH / Ethernet Diagnostic Mode được yêu cầu.",
      processDetail: sim.ipAssigned
        ? "Activation Line = ON và Local IP đã có! DoIP mở UDP/TCP Listen port 13400" + (cfg.DoIPEnableTlsPort3496 ? " + TLS 3496" : "") + ", khởi động T_InitialDelay (" + cfg.DoIPInitialVehicleAnnounceDelayMs + "ms)."
        : "Activation Line = ON nhưng TcpIp chưa cấp IP cục bộ -> DoIP chuyển trạng thái WAIT_IP_ASSIGN.",
      outputDest: sim.ipAssigned ? "Sẵn sàng phát 0x0004 qua SoAd_IfTransmit() sau backoff." : "Chờ callback DoIP_LocalIpAddrAssignmentChg(ASSIGNED).",
      bitChange: "Bit 7 Thanh A (ACT_LN = 1).",
      apiSignature: "void DoIP_ActivationLineSwitchActive(void);",
      resultBadge: sim.nodeState,
      tone: "ok"
    };
    sim.cCodeSnippet = "/* BswM enables DoIP stack */\nDoIP_ActivationLineSwitchActive();\n/* If IP assigned -> start A_DoIP_Announce_Wait (" + cfg.DoIPInitialVehicleAnnounceDelayMs + "ms) */";
    addTrace("DoIP_ActivationLineSwitchActive()", "Activation Line ON -> " + sim.nodeState, "ok");
  } else {
    // Graceful Shutdown: close all sockets and clear announce
    sim.nodeState = "SHUTDOWN";
    sim.tcpConns.forEach(c => {
      c.sockState = "CLOSED";
      c.testerSa = "---";
      c.routingState = "NONE";
      c.initTimerMs = 0;
      c.genTimerMs = 0;
      c.aliveTimerMs = 0;
      c.tpBufLocked = false;
    });
    sim.tcpState = "SOCKET_CLOSED";
    sim.swcAuthGranted = false;
    sim.alivePending = false;
    sim.tpBufferLocked = false;
    sim.gwCanTpActive = false;
    sim.activeArrows = { arr_bswm_doip: "active-err", arr_doip_soad_tx: "active-err" };
    sim.stepNarrative = {
      title: "DoIP_ActivationLineSwitchInactive() — Thu Hồi & Đóng Toàn Bộ Kết Nối",
      inputOrigin: "BswM / EcuM yêu cầu tắt kênh DoIP (chìa khóa OFF hoặc OBD Pin 8 LOW).",
      processDetail: "DoIP dừng mọi UDP Announcement, hủy các phiên Routing Active, gọi SoAd_CloseSoCon() đóng sạch TCP sockets đang mở và giải phóng TP buffer.",
      outputDest: "SoAd gửi TCP FIN ra mạng; Node chuyển SHUTDOWN / INACTIVE.",
      bitChange: "Bit 7 Thanh A (ACT_LN = 0), TCP_OP/RT_ACT/SWC_AU về 0.",
      apiSignature: "void DoIP_ActivationLineSwitchInactive(void); /* Close all active SoConId */",
      resultBadge: "SHUTDOWN",
      tone: "warn"
    };
    sim.cCodeSnippet = [
      "/* SWS_DoIP_00280: Graceful Deactivation */",
      "DoIP_ActivationLineSwitchInactive();",
      "for (soCon = 0; soCon < DOIP_MAX_TESTER_CONNECTIONS; soCon++) {",
      "  SoAd_CloseSoCon(DoIP_TcpSoCon[soCon], TRUE);",
      "}"
    ].join("\n");
    addTrace("DoIP_ActivationLineSwitchInactive()", "Đóng toàn bộ TCP Sockets -> SHUTDOWN", "warn");
  }
  updateRegistersAfter();
}

function api_DoIP_LocalIpAddrAssignmentChg(isAssigned) {
  if (!sim) api_DoIP_Init();
  if (!sim.initialized) {
    reportDetAndIdsm("0x0C", "DOIP_E_UNINIT (0x01)", "DOIP_SEV_UNINIT", "Callback IP khi DoIP chưa Init", false);
    updateRegistersAfter();
    return;
  }
  snapshotRegBefore();
  advanceClock(8);
  const next = isAssigned !== undefined ? Boolean(isAssigned) : !sim.ipAssigned;
  sim.ipAssigned = next;

  if (next) {
    sim.activeArrows = { arr_soad_doip_rx: "active-cbk" };
    if (sim.actLineActive) {
      sim.nodeState = "ANNOUNCE_WAIT";
      sim.announceDoneCount = 0;
      sim.announceTargetCount = Number(cfg.DoIPVehicleAnnounceCount) || 3;
      sim.announceWaitRemainMs = Number(cfg.DoIPInitialVehicleAnnounceDelayMs) || 250;
      sim.announceIntervalRemainMs = Number(cfg.DoIPVehicleAnnounceIntervalMs) || 500;
    } else {
      sim.nodeState = "INACTIVE";
    }
    sim.stepNarrative = {
      title: "DoIP_LocalIpAddrAssignmentChg(ASSIGNED) — Có Địa Chỉ IPv4/IPv6 Hợp Lệ",
      inputOrigin: "TcpIp hoàn tất DHCP / AutoIP và báo qua SoAd_LocalIpAddrAssignmentChg().",
      processDetail: sim.actLineActive
        ? "Cả IP lẫn Activation Line đều SẴN SÀNG! DoIP mở cổng UDP 13400 & TCP 13400" + (cfg.DoIPEnableTlsPort3496 ? " (kèm TLS 3496)" : "") + ", đợi hết T_InitialAnnounce = " + cfg.DoIPInitialVehicleAnnounceDelayMs + "ms rồi phát 0x0004."
        : "IP đã có nhưng Activation Line chưa bật nên DoIP vẫn giữ yên ở INACTIVE (bảo mật tránh tự mở cổng trên bus).",
      outputDest: sim.actLineActive ? "Vào ANNOUNCE_WAIT -> chuẩn bị phát " + cfg.DoIPVehicleAnnounceCount + "× UDP 0x0004." : "Chờ BswM gọi DoIP_ActivationLineSwitchActive().",
      bitChange: "Bit 6 Thanh A (IP_RDY = 1).",
      apiSignature: "void DoIP_LocalIpAddrAssignmentChg(SoAd_SoConIdType SoConId, TcpIp_IpAddrStateType State);",
      resultBadge: sim.actLineActive ? "ANNOUNCE_WAIT" : "WAIT ACTLINE",
      tone: "ok"
    };
    sim.cCodeSnippet = "/* SoAd notifies DoIP when DHCP/AutoIP finishes */\nDoIP_LocalIpAddrAssignmentChg(DOIP_UDP_SOCON, TCPIP_IPADDR_STATE_ASSIGNED);";
    addTrace("DoIP_LocalIpAddrAssignmentChg(ASSIGNED)", "Local IP sẵn sàng -> " + sim.nodeState, "ok");
  } else {
    sim.activeArrows = { arr_soad_doip_rx: "active-err", arr_doip_soad_tx: "active-err" };
    sim.tcpConns.forEach(c => {
      c.sockState = "CLOSED"; c.testerSa = "---"; c.routingState = "NONE";
      c.initTimerMs = 0; c.genTimerMs = 0; c.aliveTimerMs = 0; c.tpBufLocked = false;
    });
    sim.tcpState = "SOCKET_CLOSED";
    sim.swcAuthGranted = false;
    sim.nodeState = sim.actLineActive ? "WAIT_IP_ASSIGN" : "INACTIVE";
    sim.stepNarrative = {
      title: "DoIP_LocalIpAddrAssignmentChg(UNASSIGNED) — Mất Địa Chỉ IP / Đứt Mạng ETH",
      inputOrigin: "Link Ethernet mất kết nối (EthIf Link Down) hoặc DHCP Lease hết hạn.",
      processDetail: "DoIP lập tức hủy mọi phiên TCP chẩn đoán, dừng phát Announcement 0x0004 và giải phóng toàn bộ bộ đệm TP đang dở dang.",
      outputDest: "Quay về " + sim.nodeState + " chờ TcpIp cấp lại IP.",
      bitChange: "Bit 6 Thanh A (IP_RDY = 0), TCP_OP/RT_ACT = 0.",
      apiSignature: "DoIP_LocalIpAddrAssignmentChg(DOIP_UDP_SOCON, TCPIP_IPADDR_STATE_UNASSIGNED);",
      resultBadge: "IP LOST",
      tone: "err"
    };
    sim.cCodeSnippet = "/* Link Down or IP Lease Expired */\nDoIP_LocalIpAddrAssignmentChg(0u, TCPIP_IPADDR_STATE_UNASSIGNED);\n/* Abort active TCP routing & reset timers */";
    addTrace("DoIP_LocalIpAddrAssignmentChg(UNASSIGNED)", "Mất IP cục bộ -> đóng toàn bộ socket TCP", "err");
  }
  updateRegistersAfter();
}

function api_DoIP_SendVehicleAnnouncement() {
  if (!sim || !sim.initialized) { api_DoIP_Init(); }
  if (!sim.actLineActive || !sim.ipAssigned) {
    reportDetAndIdsm("0x05", "DOIP_E_PARAM (0x02)", "DOIP_SEV_INACTIVE", "Không thể phát 0x0004 khi chưa đủ Activation Line & IP", false);
    sim.stepNarrative = {
      title: "Chặn Phát UDP 0x0004: Thiếu Activation Line hoặc Local IP!",
      inputOrigin: "Yêu cầu phát Vehicle Announcement 0x0004.",
      processDetail: "Điều kiện tiên quyết SWS_DoIP: ActLine=" + sim.actLineActive + ", IP=" + sim.ipAssigned + ". Nếu thiếu 1 trong 2, DoIP cấm phát gói lên UDP 13400.",
      outputDest: "Hãy bật Activation Line và Assign IP trước.",
      bitChange: "Không đổi.",
      apiSignature: "/* Guarded: DoIP requires ActivationLine=ACTIVE && IP=ASSIGNED */",
      resultBadge: "BLOCKED",
      tone: "warn"
    };
    updateRegistersAfter();
    return;
  }
  snapshotRegBefore();
  const useInterval = sim.announceDoneCount > 0 ? (Number(cfg.DoIPVehicleAnnounceIntervalMs) || 500) : (Number(cfg.DoIPInitialVehicleAnnounceDelayMs) || 250);
  advanceClock(useInterval);
  sim.announceWaitRemainMs = 0;
  sim.announceDoneCount += 1;
  sim.nodeState = "ONLINE_READY";
  const arrowMap = { arr_doip_soad_tx: "active-cbk", arr_tester_soad: "active" };
  if (!cfg.DoIPUseMacForGid) {
    arrowMap.arr_doip_rte = "active-pur";
    arrowMap.arr_rte_swc = "active-pur";
  }
  sim.activeArrows = arrowMap;

  const syncByte = cfg.DoIPVinGidSyncStatus ? "0x00 (Synced)" : "0x10 (Not Synced)";
  const gidInfo = cfg.DoIPUseMacForGid ? cfg.DoIPEidMacHex + " (MAC)" : "RTE SWC_DoIPAuth GID";
  const payDesc = "VIN=" + cfg.DoIPVinString + " | LA=" + cfg.DoIPLogicalAddressHex + " | EID=" + cfg.DoIPEidMacHex + " | GID=" + gidInfo + " | FA=" + cfg.DoIPFurtherActionByteHex + " | Sync=" + syncByte;
  setLastFrame("ECU ➔ Tester (UDP Broadcast :13400)", "0x02", "0xFD", "0x0004", 33, payDesc);

  sim.stepNarrative = {
    title: "Phát UDP Vehicle Announcement 0x0004 (Lần #" + sim.announceDoneCount + " / " + (Number(cfg.DoIPVehicleAnnounceCount) || 3) + ")",
    inputOrigin: "Hết timer " + useInterval + "ms trong DoIP_MainFunction()" + (!cfg.DoIPUseMacForGid ? " + lấy GID từ SWC qua RTE." : "."),
    processDetail: "DoIP đóng gói Generic Header [02 FD 00 04 00 00 00 21] dài 33 byte payload (17B VIN + 2B LA + 6B EID + 6B GID + 1B FurtherAction + 1B SyncStatus) và đẩy UDP Broadcast 255.255.255.255:13400.",
    outputDest: "SoAd_IfTransmit(UDP_ANNOUNCE_PDU) -> Ethernet PHY -> Tất cả Tester trong mạng biết ECU tại IP và LA=" + cfg.DoIPLogicalAddressHex + ".",
    bitChange: "Bit 5 Thanh A (UDP_AN = 1), Node State = ONLINE_READY.",
    apiSignature: "SoAd_IfTransmit(DOIP_UDP_ANNOUNCE_TX_PDU, &PduInfo /* Len=41B = 8B Hdr + 33B Payload */);",
    resultBadge: "0x0004 SENT #" + sim.announceDoneCount,
    tone: "ok"
  };
  sim.cCodeSnippet = [
    "/* Build ISO 13400-2 Vehicle Announcement (0x0004, 8B Hdr + 33B Payload) */",
    "uint8 txBuf[41] = { 0x02u, 0xFDu, 0x00u, 0x04u, 0x00u, 0x00u, 0x00u, 0x21u /* , VIN, LA, EID, GID, FA, Sync */ };",
    (cfg.DoIPUseMacForGid ? "/* GID sourced from EthIf MAC */" : "Rte_Call_DoIP_GetGid(txBuf + 33u);"),
    "SoAd_IfTransmit(SOAD_DOIP_UDP_TX_ID, &pduInfo); /* Count #" + sim.announceDoneCount + " */"
  ].join("\n");
  addTrace("SoAd_IfTransmit(0x0004)", "Phát UDP Vehicle Announcement #" + sim.announceDoneCount + " (" + cfg.DoIPVinString + ")", "ok");
  updateRegistersAfter();
}

function api_DoIP_UdpRxIndication(reqType, opts) {
  const options = opts || {};
  if (!sim || !sim.initialized || !sim.actLineActive || !sim.ipAssigned) {
    if (!sim) api_DoIP_Init();
    api_DoIP_ActivationLineSwitch(true);
    api_DoIP_LocalIpAddrAssignmentChg(true);
    sim.nodeState = "ONLINE_READY";
  }
  snapshotRegBefore();
  advanceClock(12);

  const pType = reqType || "0x0001";
  const ver = options.protoVer || cfg.InjectedProtoVerHex || "0xFF";
  const inv = options.invVer || cfg.InjectedInvVerHex || "0x00";
  const vNum = parseHexNum(ver, 0xFF) & 0xFF;
  const ivNum = parseHexNum(inv, 0x00) & 0xFF;
  const xorValid = ((vNum ^ ivNum) & 0xFF) === 0xFF;

  if (!xorValid || options.forceBadXor) {
    setLastFrame("Tester ➔ ECU (UDP :13400)", ver, inv, pType, 0, "Header XOR Mismatch (" + ver + " ^ " + inv + " != 0xFF)");
    sim.lastHeaderNack = true;
    sim.lastDiagNack = false;
    sim.activeArrows = { arr_tester_soad: "active-err", arr_soad_doip_rx: "active-err", arr_doip_soad_tx: "active-err", arr_doip_det: "active-err" };
    reportDetAndIdsm("0x14", "DOIP_E_HEADER_FORMAT", "DOIP_SEV_HEADER_NACK", "UDP Generic Header sai XOR -> Trả 0x0000 Code 0x00", true);
    sim.stepNarrative = {
      title: "UDP Header NACK 0x0000 (Code 0x00): Lỗi Định Dạng Ver ^ InvVer != 0xFF",
      inputOrigin: "Tester gửi gói UDP có Byte0=" + ver + ", Byte1=" + inv + " (" + fmtHex(vNum ^ ivNum, 2) + " != 0xFF).",
      processDetail: "Bộ kiểm tra Generic Header 8B phát hiện vi phạm luật bù bitwise. DoIP hủy gói và gửi phản hồi NACK 0x0000 Code 0x00.",
      outputDest: "SoAd_IfTransmit(0x0000, Code=0x00) về Tester + IdsM cảnh báo.",
      bitChange: "Bit 7 Thanh B (HDR_OK=0), Bit 1 Thanh B (HD_NCK=1), Bit 0 Thanh B (DET_SC=1).",
      apiSignature: "DoIP_SoAdIfRxIndication() -> SoAd_IfTransmit(0x0000, NACK=0x00);",
      resultBadge: "NACK 0x0000 (0x00)",
      tone: "err"
    };
    sim.cCodeSnippet = "if ((rxBuf[0] ^ rxBuf[1]) != 0xFFu) {\n  DoIP_SendHeaderNack(soCon, 0x00u); /* Incorrect pattern format */\n}";
    updateRegistersAfter();
    return;
  }

  sim.lastHeaderNack = false;
  sim.lastDiagNack = false;

  if (pType === "0x0001") {
    sim.activeArrows = { arr_tester_soad: "active", arr_soad_doip_rx: "active", arr_doip_soad_tx: "active-cbk" };
    setLastFrame("Tester ➔ ECU ➔ Tester (UDP 0x0001 ➔ 0x0004)", ver, inv, "0x0004", 33, "VID Req (All) -> Resp VIN=" + cfg.DoIPVinString + " LA=" + cfg.DoIPLogicalAddressHex);
    sim.stepNarrative = {
      title: "UDP Discovery 0x0001 (Broadcast) ➔ Phản Hồi 0x0004",
      inputOrigin: "Tester gửi UDP 0x0001 (PayloadLength=0) tìm tất cả xe/ECU trong mạng.",
      processDetail: "DoIP xác nhận header 8B hợp lệ, lấy VIN, Logical Address, EID và GID hiện tại để đóng gói Vehicle Identification Response (0x0004).",
      outputDest: "SoAd_IfTransmit(0x0004) gửi Unicast về cổng UDP nguồn của Tester.",
      bitChange: "Bit 5 Thanh A (UDP_AN=1), Bit 7/6 Thanh B = 1.",
      apiSignature: "DoIP_SoAdIfRxIndication(0x0001) -> SoAd_IfTransmit(0x0004, 33B);",
      resultBadge: "VID 0x0004 OK",
      tone: "ok"
    };
    sim.cCodeSnippet = "/* 0x0001 requires exact PayloadLength == 0 */\nDoIP_SoAdIfRxIndication(RxPdu, 0x0001u);\nSoAd_IfTransmit(UDP_TX, VehicleIdResponse_0x0004);";
    addTrace("DoIP_SoAdIfRxIndication(0x0001)", "Trả lời Unicast 0x0004 (VIN=" + cfg.DoIPVinString + ")", "ok");
  } else if (pType === "0x0002") {
    const reqEid = options.eid || cfg.DoIPEidMacHex;
    const match = reqEid.toUpperCase() === cfg.DoIPEidMacHex.toUpperCase();
    setLastFrame("Tester ➔ ECU (UDP 0x0002 EID)", ver, inv, match ? "0x0004" : "0x0002", match ? 33 : 6, "Filter EID=" + reqEid + (match ? " [MATCHED -> 0x0004]" : " [MISMATCH -> Silent Ignore]"));
    sim.activeArrows = match ? { arr_tester_soad: "active", arr_soad_doip_rx: "active", arr_doip_soad_tx: "active-cbk" } : { arr_tester_soad: "active", arr_soad_doip_rx: "active" };
    sim.stepNarrative = {
      title: match ? "UDP Discovery 0x0002 (Lọc EID Khớp) ➔ Trả 0x0004" : "UDP 0x0002 (Lệch EID) ➔ ECU Im Lặng Theo ISO 13400-2",
      inputOrigin: "Tester gửi 0x0002 kèm 6 byte EID=" + reqEid + " so với cấu hình " + cfg.DoIPEidMacHex + ".",
      processDetail: match ? "6 byte EID khớp hoàn toàn! DoIP trả về bản tin 0x0004." : "EID không khớp ECU này. Theo ISO 13400-2, DoIP KHÔNG gửi NACK mà im lặng bỏ qua để tránh làm nghẽn mạng broadcast.",
      outputDest: match ? "SoAd_IfTransmit(0x0004)." : "Drop gói UDP lặng lẽ.",
      bitChange: match ? "Bit 5 Thanh A = 1." : "Không đổi.",
      apiSignature: "DoIP_SoAdIfRxIndication(0x0002, EID=" + reqEid + ");",
      resultBadge: match ? "EID MATCH -> 0x0004" : "EID MISMATCH DROP",
      tone: match ? "ok" : "warn"
    };
    sim.cCodeSnippet = "if (memcmp(rxEid, DoIP_Cfg.Eid, 6u) == 0) { SoAd_IfTransmit(0x0004u); } else { /* Silent ignore */ }";
    addTrace("DoIP_SoAdIfRxIndication(0x0002)", match ? "Khớp EID -> gửi 0x0004" : "Sai EID (" + reqEid + ") -> bỏ qua", match ? "ok" : "warn");
  } else if (pType === "0x0003") {
    const reqVin = options.vin || cfg.DoIPVinString;
    const match = reqVin === cfg.DoIPVinString;
    setLastFrame("Tester ➔ ECU (UDP 0x0003 VIN)", ver, inv, match ? "0x0004" : "0x0003", match ? 33 : 17, "Filter VIN=" + reqVin + (match ? " [MATCHED -> 0x0004]" : " [MISMATCH -> Silent Ignore]"));
    sim.activeArrows = match ? { arr_tester_soad: "active", arr_soad_doip_rx: "active", arr_doip_soad_tx: "active-cbk" } : { arr_tester_soad: "active", arr_soad_doip_rx: "active" };
    sim.stepNarrative = {
      title: match ? "UDP Discovery 0x0003 (Lọc VIN 17B Khớp) ➔ Trả 0x0004" : "UDP 0x0003 (Sai VIN: " + reqVin + ") ➔ Bỏ Qua Im Lặng",
      inputOrigin: "Tester gửi 0x0003 (Payload 17B VIN=" + reqVin + ").",
      processDetail: match ? "Chuỗi VIN trùng khớp với ECU (" + cfg.DoIPVinString + "). DoIP phát đáp án 0x0004." : "VIN không trùng khớp; DoIP bỏ qua để chỉ chiếc xe có đúng VIN trên đáp lời.",
      outputDest: match ? "SoAd_IfTransmit(0x0004)." : "Không phát đáp án.",
      bitChange: "Bit 5 Thanh A = " + (match ? "1" : " giữ nguyên") + ".",
      apiSignature: "DoIP_SoAdIfRxIndication(0x0003, VIN=\"" + reqVin + "\");",
      resultBadge: match ? "VIN MATCH -> 0x0004" : "VIN MISMATCH DROP",
      tone: match ? "ok" : "warn"
    };
    sim.cCodeSnippet = "if (memcmp(rxVin, DoIP_Vin, 17u) == 0) { SoAd_IfTransmit(0x0004u); }";
    addTrace("DoIP_SoAdIfRxIndication(0x0003)", match ? "Khớp VIN -> gửi 0x0004" : "Sai VIN -> im lặng", match ? "ok" : "warn");
  } else if (pType === "0x4001") {
    const openCnt = sim.tcpConns.filter(c => c.sockState === "ONLINE").length;
    sim.activeArrows = { arr_tester_soad: "active", arr_soad_doip_rx: "active", arr_doip_soad_tx: "active-cbk" };
    const msg = "NodeType=0x00(ECU) | MaxTCP=" + cfg.DoIPMaxTesterConnections + " | OpenTCP=" + openCnt + " | MaxData=" + cfg.DoIPMaxByteArrayLength + "B";
    setLastFrame("Tester ➔ ECU ➔ Tester (0x4001 ➔ 0x4002)", ver, inv, "0x4002", 7, msg);
    sim.stepNarrative = {
      title: "Entity Status Request (0x4001) ➔ Telemetry Response (0x4002)",
      inputOrigin: "Tester hỏi tình trạng tài nguyên kết nối của ECU qua UDP 13400.",
      processDetail: "DoIP đọc số TCP slot tối đa (" + cfg.DoIPMaxTesterConnections + "), số slot đang mở (" + openCnt + ") và kích thước gói tối đa (" + cfg.DoIPMaxByteArrayLength + "B).",
      outputDest: "Trả gói 0x4002 dài 7 byte về Tester.",
      bitChange: "Bit 5 Thanh A (UDP_AN=1).",
      apiSignature: "DoIP_SoAdIfRxIndication(0x4001) -> SoAd_IfTransmit(0x4002, 7B);",
      resultBadge: "0x4002 TELEMETRY",
      tone: "ok"
    };
    sim.cCodeSnippet = "uint8 entityStatus[7] = { 0x00u /*Gateway/Node*/, " + cfg.DoIPMaxTesterConnections + "u, " + openCnt + "u /*, MaxDataSize 4B */ };\nSoAd_IfTransmit(UDP_TX, entityStatus);";
    addTrace("DoIP_SoAdIfRxIndication(0x4001)", "Trả 0x4002: OpenTCP=" + openCnt + "/" + cfg.DoIPMaxTesterConnections + ", MaxLen=" + cfg.DoIPMaxByteArrayLength, "ok");
  } else if (pType === "0x4003") {
    sim.activeArrows = { arr_tester_soad: "active", arr_soad_doip_rx: "active", arr_doip_rte: "active-pur", arr_rte_swc: "active-pur", arr_doip_soad_tx: "active-cbk" };
    const pwrVal = options.powerNotReady ? "0x00 (Not Ready)" : "0x01 (Ready)";
    setLastFrame("Tester ➔ DoIP ➔ SWC ➔ Tester (0x4003 ➔ 0x4004)", ver, inv, "0x4004", 1, "DiagPowerMode=" + pwrVal + " (via Rte_Call_DoIP_GetPowerModeStatus)");
    sim.stepNarrative = {
      title: "Diagnostic Power Mode Request (0x4003) ➔ SWC via RTE ➔ Response (0x4004)",
      inputOrigin: "Tester hỏi qua UDP 0x4003 xem xe đã sẵn sàng nguồn chẩn đoán chưa.",
      processDetail: "DoIP gọi TRỰC TIẾP lên SWC_DoIPAuth thông qua RTE bằng Rte_Call_DoIP_GetPowerModeStatus() rồi đóng gói kết quả (1 byte) vào bản tin 0x4004.",
      outputDest: "SoAd_IfTransmit(0x4004, PowerMode=" + pwrVal + ").",
      bitChange: "Luồng trực tiếp DoIP ↔ RTE ↔ SWC sáng màu tím.",
      apiSignature: "Rte_Call_DoIP_GetPowerModeStatus(&pwrMode); -> SoAd_IfTransmit(0x4004);",
      resultBadge: "0x4004 PWR=" + (options.powerNotReady ? "0x00" : "0x01"),
      tone: options.powerNotReady ? "warn" : "ok"
    };
    sim.cCodeSnippet = "uint8 powerMode = 0x01u;\n(void)Rte_Call_DoIP_GetPowerModeStatus_GetPowerMode(&powerMode);\n/* Send UDP 0x4004 (1B Payload = powerMode) */";
    addTrace("Rte_Call_DoIP_GetPowerModeStatus()", "0x4003 -> 0x4004 trả PowerMode=" + pwrVal, "ok");
  }
  updateRegistersAfter();
}

function api_DoIP_SoConModeChg(slotIdx, isOnline, customPort) {
  if (!sim || !sim.initialized) api_DoIP_Init();
  if (!sim.actLineActive || !sim.ipAssigned) {
    api_DoIP_ActivationLineSwitch(true);
    api_DoIP_LocalIpAddrAssignmentChg(true);
  }
  snapshotRegBefore();
  advanceClock(5);
  resizeTcpConnPoolIfNeeded();
  const idx = Math.max(0, Math.min(sim.tcpConns.length - 1, Number(slotIdx) || 0));
  sim.selectedSlotIdx = idx;
  const conn = sim.tcpConns[idx];
  const port = customPort || (cfg.DoIPEnableTlsPort3496 ? 3496 : 13400);

  if (isOnline) {
    conn.port = port;
    conn.sockState = "ONLINE";
    conn.routingState = "WAIT_ROUTING_ACT";
    conn.initTimerMs = Number(cfg.DoIPInitialInactivityTimeMs) || 2000;
    conn.genTimerMs = 0;
    conn.aliveTimerMs = 0;
    sim.nodeState = "ONLINE_READY";
    sim.tcpState = "WAIT_ROUTING_ACT";
    sim.activeArrows = { arr_tester_soad: "active", arr_soad_doip_rx: "active-cbk" };
    sim.stepNarrative = {
      title: "TCP Handshake Thành Công ➔ DoIP_SoConModeChg(SoConId=" + idx + ", ONLINE)",
      inputOrigin: "Tester hoàn tất TCP 3-way handshake" + (port === 3496 ? " + TLS 1.3 Handshake trên cổng 3496." : " trên cổng 13400."),
      processDetail: "DoIP gán SoConId=" + idx + ", đặt RoutingState=WAIT_ROUTING_ACT và BẮT ĐẦU đếm ngược T_Initial_Inactivity (" + conn.initTimerMs + "ms).",
      outputDest: "Chờ Tester gửi gói Routing Activation 0x0005 trước khi hết 2000ms.",
      bitChange: "Bit 4 Thanh A (TCP_OP = 1).",
      apiSignature: "void DoIP_SoConModeChg(SoAd_SoConIdType SoConId=" + idx + ", SOAD_SOCON_ONLINE);",
      resultBadge: "TCP SLOT " + idx + " ONLINE",
      tone: "ok"
    };
    sim.cCodeSnippet = "/* Start T_TCP_Initial_Inactivity = " + conn.initTimerMs + "ms */\nDoIP_TcpConnTable[" + idx + "].SockState = DOIP_SOCK_ONLINE;\nDoIP_TcpConnTable[" + idx + "].InitTimerMs = " + conn.initTimerMs + "u;";
    addTrace("DoIP_SoConModeChg(" + idx + ", ONLINE)", "Mở TCP port " + port + ", chạy T_Initial=" + conn.initTimerMs + "ms", "ok");
  } else {
    conn.sockState = "CLOSED";
    conn.testerSa = "---";
    conn.routingState = "NONE";
    conn.initTimerMs = 0;
    conn.genTimerMs = 0;
    conn.aliveTimerMs = 0;
    conn.tpBufLocked = false;
    sim.activeArrows = { arr_doip_soad_tx: "active-err" };
    addTrace("SoAd_CloseSoCon(" + idx + ")", "Đóng TCP Socket slot " + idx, "warn");
  }
  updateRegistersAfter();
}

function api_DoIP_TcpRoutingActivation(testerSaHex, actTypeHex, onTlsPort, opts) {
  const options = opts || {};
  if (!sim || !sim.initialized) api_DoIP_Init();
  if (!sim.actLineActive) api_DoIP_ActivationLineSwitch(true);
  if (!sim.ipAssigned) api_DoIP_LocalIpAddrAssignmentChg(true);
  snapshotRegBefore();
  advanceClock(15);
  resizeTcpConnPoolIfNeeded();

  const sa = testerSaHex || cfg.DoIPSourceAddressTester1Hex || "0x0E00";
  const aType = actTypeHex || cfg.DoIPRoutingActivationNumHex || "0x00";
  const port = onTlsPort ? 3496 : 13400;
  const pVer = options.protoVer || (onTlsPort ? "0x03" : "0x02");
  const invVer = options.invVer || (onTlsPort ? "0xFC" : "0xFD");

  // Check if SA already open on an existing slot, or find a free/WAIT slot
  let slot = sim.tcpConns.find(c => c.sockState === "ONLINE" && c.testerSa.toUpperCase() === sa.toUpperCase());
  if (!slot) slot = sim.tcpConns.find(c => c.sockState === "ONLINE" && c.routingState === "WAIT_ROUTING_ACT");
  if (!slot) slot = sim.tcpConns.find(c => c.sockState === "CLOSED");

  if (!slot) {
    // Pool is completely full -> Trigger Alive Check 0x0007!
    api_DoIP_AliveCheckTrigger(sa, options);
    return;
  }

  slot.sockState = "ONLINE";
  slot.port = port;
  sim.selectedSlotIdx = slot.soConId;
  sim.nodeState = "ONLINE_READY";
  setLastFrame("Tester (" + sa + ") ➔ ECU (TCP :" + port + ")", pVer, invVer, "0x0005", 7, "TesterSA=" + sa + " | ActType=" + aType + " | Reserved=0x00000000");

  // 1) Check Unknown Tester SA
  const allowedSas = [cfg.DoIPSourceAddressTester1Hex.toUpperCase(), cfg.DoIPSourceAddressTester2Hex.toUpperCase(), "0X0E02", "0X0E03"];
  if (options.forceUnknownSa || !allowedSas.includes(sa.toUpperCase())) {
    slot.testerSa = sa;
    slot.routingState = "NONE";
    slot.sockState = "CLOSED";
    sim.lastSaTaOk = false;
    sim.activeArrows = { arr_tester_soad: "active-err", arr_soad_doip_rx: "active-err", arr_doip_soad_tx: "active-err", arr_doip_det: "active-err" };
    setLastFrame("ECU ➔ Tester (0x0006 NACK 0x00)", pVer, invVer, "0x0006", 9, "SA=" + sa + " | LA=" + cfg.DoIPLogicalAddressHex + " | Code=0x00 (Unknown SA)");
    reportDetAndIdsm("0x18", "DOIP_E_UNKNOWN_SA", "DOIP_SEV_UNAUTHORIZED_SA", "Từ chối Routing Activation do SA=" + sa + " không thuộc bảng DoIPTester", true);
    sim.stepNarrative = {
      title: "Routing Activation NACK 0x0006 (Code 0x00): Unknown Source Address " + sa,
      inputOrigin: "Tester lạ (" + sa + ") gửi 0x0005 trên SoConId=" + slot.soConId + ".",
      processDetail: "DoIP tra bảng DoIPTester không thấy SA=" + sa + ". Gửi 0x0006 Response Code = 0x00 và đóng ngay socket TCP.",
      outputDest: "SoAd_TpTransmit(0x0006, 0x00) -> SoAd_CloseSoCon(" + slot.soConId + ").",
      bitChange: "Bit 5 Thanh B (SATA_OK=0), Bit 0 Thanh B (DET_SC=1).",
      apiSignature: "SoAd_TpTransmit(0x0006 /* Code=0x00 Unknown SA */); SoAd_CloseSoCon();",
      resultBadge: "NACK 0x00 (Unknown SA)",
      tone: "err"
    };
    updateRegistersAfter();
    return;
  }
  sim.lastSaTaOk = true;

  // 2) Check Unsupported Activation Type
  if (!["0X00", "0X01", "0XE0"].includes(aType.toUpperCase())) {
    setLastFrame("ECU ➔ Tester (0x0006 NACK 0x06)", pVer, invVer, "0x0006", 9, "SA=" + sa + " | Code=0x06 (Unsupported Activation Type " + aType + ")");
    sim.activeArrows = { arr_tester_soad: "active-err", arr_soad_doip_rx: "active-err", arr_doip_soad_tx: "active-err" };
    sim.stepNarrative = {
      title: "Routing Activation NACK 0x0006 (Code 0x06): Unsupported Activation Type",
      inputOrigin: "Tester gửi 0x0005 với Activation Type=" + aType + ".",
      processDetail: "Type " + aType + " không được hỗ trợ trong cấu hình ECU.",
      outputDest: "Trả 0x0006 Code 0x06 và đóng socket.",
      bitChange: "Không cấp RT_ACT.",
      apiSignature: "SoAd_TpTransmit(0x0006 /* ResponseCode = 0x06 */);",
      resultBadge: "NACK 0x06 (Type)",
      tone: "err"
    };
    slot.sockState = "CLOSED"; slot.routingState = "NONE";
    addTrace("DoIP_RoutingActivation(" + sa + ")", "Từ chối ActType=" + aType + " (Code 0x06)", "err");
    updateRegistersAfter();
    return;
  }

  // 3) Check TLS 3496 Requirement (ISO 13400-2:2019 Code 0x07)
  if (cfg.DoIPEnableTlsPort3496 && !onTlsPort) {
    setLastFrame("ECU ➔ Tester (0x0006 NACK 0x07)", "0x03", "0xFC", "0x0006", 9, "SA=" + sa + " | Code=0x07 (Requires TLS on TCP Port 3496!)");
    slot.testerSa = sa;
    slot.routingState = "NONE";
    slot.sockState = "CLOSED";
    sim.activeArrows = { arr_tester_soad: "active-err", arr_soad_doip_rx: "active-err", arr_doip_soad_tx: "active-err", arr_doip_det: "active-err" };
    reportDetAndIdsm("0x19", "DOIP_E_TLS_REQUIRED", "DOIP_SEV_TLS_DOWNGRADE", "Từ chối Routing trên port 13400 không mã hóa -> yêu cầu TLS port 3496 (0x07)", true);
    sim.stepNarrative = {
      title: "TLS Guard Triggered! 0x0006 Code 0x07: Bắt Buộc Kết Nối TLS Cổng 3496",
      inputOrigin: "DoIPEnableTlsPort3496=TRUE nhưng Tester gửi 0x0005 qua cổng TCP thường 13400.",
      processDetail: "Theo ISO 13400-2:2019, DoIP từ chối kích hoạt không mã hóa, trả Routing Response Code = 0x07, đóng socket 13400 và báo IdsM sự kiện hạ cấp TLS.",
      outputDest: "SoAd_TpTransmit(0x0006, 0x07) -> SoAd_CloseSoCon(). Tester phải kết nối lại qua Port 3496.",
      bitChange: "Bit 0 Thanh B (DET_SC=1), TCP_OP về 0.",
      apiSignature: "SoAd_TpTransmit(0x0006 /* Code=0x07 TLS Required */); SoAd_CloseSoCon();",
      resultBadge: "NACK 0x07 (NEED TLS)",
      tone: "err"
    };
    sim.cCodeSnippet = "if (DoIP_Cfg.RequireTls && (soConPort != 3496u)) {\n  DoIP_SendRoutingResp(soCon, sa, 0x07u); /* Requires TLS */\n  IdsM_SetSecurityEvent(DOIP_SEV_TLS_DOWNGRADE);\n}";
    updateRegistersAfter();
    return;
  }

  slot.testerSa = sa;
  slot.initTimerMs = 0;

  // 4) SWC Authentication via RTE
  const authMode = options.forceAuthMode || cfg.DoIPAuthCallbackMode;
  if (authMode === "RTE_DENIED") {
    slot.routingState = "NONE";
    slot.sockState = "CLOSED";
    sim.swcAuthGranted = false;
    sim.activeArrows = { arr_tester_soad: "active-err", arr_soad_doip_rx: "active-err", arr_doip_rte: "active-err", arr_rte_swc: "active-err", arr_doip_soad_tx: "active-err" };
    setLastFrame("ECU ➔ Tester (0x0006 NACK 0x04)", pVer, invVer, "0x0006", 9, "SA=" + sa + " | Code=0x04 (Denied: Missing Authentication by SWC)");
    reportDetAndIdsm("0x1A", "DOIP_E_AUTH_FAILED", "DOIP_SEV_AUTH_DENIED", "SWC_DoIPAuth từ chối xác thực Routing Activation -> Code 0x04", true);
    sim.stepNarrative = {
      title: "SWC_DoIPAuth Từ Chối Xác Thực ➔ 0x0006 NACK Code 0x04",
      inputOrigin: "DoIP gọi Rte_Call_DoIP_Auth(" + sa + ", " + aType + ") sang SWC_DoIPAuth.",
      processDetail: "SWC phát hiện thiếu chứng chỉ/token xác thực hợp lệ -> trả AuthentificationResult=FALSE. DoIP gửi ngay 0x0006 Code 0x04 và đóng kết nối TCP.",
      outputDest: "SoAd_TpTransmit(0x0006, 0x04) + IdsM cảnh báo.",
      bitChange: "Bit 2 Thanh A (SWC_AU=0), Bit 0 Thanh B (DET_SC=1).",
      apiSignature: "Rte_Call_DoIP_Auth(&ok /* FALSE */) -> SoAd_TpTransmit(0x0006, 0x04);",
      resultBadge: "NACK 0x04 (NO AUTH)",
      tone: "err"
    };
    updateRegistersAfter();
    return;
  }

  if (authMode === "RTE_ASYNC_PENDING" && !options.skipPending) {
    slot.routingState = "AUTH_PENDING";
    slot.authPendingTicks = 1;
    sim.tcpState = "AUTH_PENDING";
    sim.swcAuthGranted = false;
    sim.activeArrows = { arr_tester_soad: "active", arr_soad_doip_rx: "active", arr_doip_rte: "active-pur", arr_rte_swc: "active-pur" };
    sim.stepNarrative = {
      title: "SWC_DoIPAuth Đang Xác Thực HSM Bất Đồng Bộ (DOIP_E_PENDING)",
      inputOrigin: "DoIP gọi trực tiếp Rte_Call_DoIP_Auth(" + sa + ") qua RTE sang SWC_DoIPAuth.",
      processDetail: "SWC chưa trả kết quả ngay mà trả mã DOIP_E_PENDING. DoIP giữ SoConId=" + slot.soConId + " ở trạng thái AUTH_PENDING (tạm dừng gửi 0x0006) và sẽ poll lại tự động mỗi nhịp DoIP_MainFunction().",
      outputDest: "Chờ nhấn [+1 Tick] hoặc [Bước tiếp ▶] để hoàn tất Auth + Confirmation.",
      bitChange: "TCP State = AUTH_PENDING, mũi tên DoIP ↔ RTE ↔ SWC hoạt động.",
      apiSignature: "Std_ReturnType ret = Rte_Call_DoIP_Auth(...) /* == DOIP_E_PENDING */;",
      resultBadge: "DOIP_E_PENDING",
      tone: "warn"
    };
    sim.cCodeSnippet = "ret = Rte_Call_DoIP_RoutingActivationAuthentication_Authentication(&authRes, sa, reqData);\nif (ret == DOIP_E_PENDING) {\n  conn->RoutingState = DOIP_ROUTING_AUTH_PENDING; /* Poll in MainFunction */\n}";
    addTrace("Rte_Call_DoIP_Auth(" + sa + ")", "SWC trả DOIP_E_PENDING -> giữ socket AUTH_PENDING", "warn");
    updateRegistersAfter();
    return;
  }

  if (options.rejectConfirmation) {
    slot.routingState = "NONE";
    slot.sockState = "CLOSED";
    sim.swcAuthGranted = false;
    sim.activeArrows = { arr_doip_rte: "active-err", arr_rte_swc: "active-err", arr_doip_soad_tx: "active-err" };
    setLastFrame("ECU ➔ Tester (0x0006 NACK 0x05)", pVer, invVer, "0x0006", 9, "SA=" + sa + " | Code=0x05 (Rejected Confirmation: Xe đang chạy!)");
    sim.stepNarrative = {
      title: "SWC Confirmation Từ Chối (Code 0x05): Điều Kiện An Toàn Xe Không Đạt",
      inputOrigin: "DoIP gọi Rte_Call_DoIP_RoutingActivationConfirmation().",
      processDetail: "Dù xác thực đúng khóa, SWC kiểm tra tốc độ xe > 0 km/h nên từ chối kích hoạt chẩn đoán. DoIP trả 0x0006 Code 0x05 (Rejected confirmation).",
      outputDest: "SoAd_TpTransmit(0x0006, 0x05) -> Đóng kết nối TCP.",
      bitChange: "Bit 2 Thanh A = 0.",
      apiSignature: "Rte_Call_DoIP_Confirmation(&conf /* FALSE */) -> 0x0006 Code 0x05;",
      resultBadge: "NACK 0x05 (DENIED)",
      tone: "err"
    };
    addTrace("Rte_Call_DoIP_Confirmation()", "Từ chối điều kiện an toàn -> 0x0006 Code 0x05", "err");
    updateRegistersAfter();
    return;
  }

  // Success path!
  slot.routingState = "ROUTING_ACTIVE";
  slot.genTimerMs = Number(cfg.DoIPGeneralInactivityTimeMs) || 300000;
  slot.authPendingTicks = 0;
  sim.tcpState = "ROUTING_ACTIVE";
  sim.swcAuthGranted = (authMode !== "NONE");
  sim.activeArrows = {
    arr_tester_soad: "active-cbk",
    arr_soad_doip_rx: "active",
    arr_doip_soad_tx: "active-cbk",
    arr_doip_rte: (authMode !== "NONE" || cfg.DoIPConfCallbackRequired) ? "active-pur" : "",
    arr_rte_swc: (authMode !== "NONE" || cfg.DoIPConfCallbackRequired) ? "active-pur" : ""
  };
  setLastFrame("ECU ➔ Tester (TCP :" + port + ")", pVer, invVer, "0x0006", 9, "TesterSA=" + sa + " | EntityLA=" + cfg.DoIPLogicalAddressHex + " | Code=0x10 (Routing Successfully Activated)");
  sim.stepNarrative = {
    title: "Routing Activation Thành Công! 0x0006 Code 0x10 (SoConId=" + slot.soConId + ", SA=" + sa + ")",
    inputOrigin: "Tester (" + sa + ") trên Port " + port + " vượt qua kiểm tra SA" + (authMode !== "NONE" ? ", SWC Auth" : "") + (cfg.DoIPConfCallbackRequired ? " & Confirmation" : "") + ".",
    processDetail: "Tắt T_Initial_Inactivity, chuyển SoConId=" + slot.soConId + " sang ROUTING_ACTIVE và bắt đầu bộ đếm T_General_Inactivity (" + (slot.genTimerMs / 1000) + "s).",
    outputDest: "SoAd_TpTransmit(0x0006, Code=0x10) về Tester. Kênh sẵn sàng nhận bản tin UDS 0x8001!",
    bitChange: "Bit 4 (TCP_OP=1), Bit 3 (RT_ACT=1)" + (sim.swcAuthGranted ? ", Bit 2 (SWC_AU=1)." : "."),
    apiSignature: "SoAd_TpTransmit(TCP_" + slot.soConId + ", 0x0006 /* LA=" + cfg.DoIPLogicalAddressHex + ", Code=0x10 */);",
    resultBadge: "ROUTING ACTIVE (0x10)",
    tone: "ok"
  };
  sim.cCodeSnippet = [
    "/* Routing successfully activated on SoConId " + slot.soConId + " */",
    "conn->RoutingState = DOIP_ROUTING_ACTIVE;",
    "conn->InitTimerMs  = 0u;",
    "conn->GenTimerMs   = " + slot.genTimerMs + "u; /* 300s General Inactivity */",
    "SoAd_TpTransmit(soConTxPdu, &routingActRsp_0x0006_0x10);"
  ].join("\n");
  addTrace("0x0006 Routing Response (Code 0x10)", "SA=" + sa + " Active trên SoConId=" + slot.soConId + " (Port " + port + ")", "ok");
  updateRegistersAfter();
}

function api_DoIP_AliveCheckTrigger(newTesterSaHex) {
  if (!sim || !sim.initialized) api_DoIP_Init();
  snapshotRegBefore();
  advanceClock(10);
  const newSa = newTesterSaHex || "0x0E03";
  sim.alivePending = true;
  sim.tcpConns.forEach(c => {
    if (c.sockState === "ONLINE") {
      c.routingState = "ALIVE_CHECK_WAIT";
      c.aliveTimerMs = Number(cfg.DoIPAliveCheckResponseTimeoutMs) || 500;
    }
  });
  sim.tcpState = "ALIVE_CHECK_WAIT";
  sim.activeArrows = { arr_doip_soad_tx: "active", arr_tester_soad: "active" };
  setLastFrame("ECU ➔ All Active Testers (TCP 0x0007)", "0x02", "0xFD", "0x0007", 0, "Pool FULL (" + sim.tcpConns.length + "/" + cfg.DoIPMaxTesterConnections + ") -> New Tester " + newSa + " triggers Alive Check Request!");
  sim.stepNarrative = {
    title: "Socket Pool Đầy (" + sim.tcpConns.length + "/" + cfg.DoIPMaxTesterConnections + ") ➔ Phát Alive Check Request (0x0007)",
    inputOrigin: "Tester mới (" + newSa + ") xin kết nối nhưng toàn bộ SoConId đang bị chiếm giữ.",
    processDetail: "DoIP phát quảng bá 0x0007 (PayloadLength=0) tới các TCP socket đang mở và bật timer T_Alive_Check = " + (cfg.DoIPAliveCheckResponseTimeoutMs || 500) + "ms.",
    outputDest: "Ai trả lời 0x0008 kịp sẽ sống; socket nào câm lặng quá 500ms sẽ bị đuổi để nhường chỗ cho " + newSa + "!",
    bitChange: "Bit 1 Thanh A (ALV_WT = 1), TCP State = ALIVE_CHECK_WAIT.",
    apiSignature: "DoIP_SendAliveCheckSingle/All() -> SoAd_TpTransmit(0x0007); /* Timer=500ms */",
    resultBadge: "ALIVE CHECK 0x0007",
    tone: "warn"
  };
  sim.cCodeSnippet = "/* All MaxTesterConnections active -> Ping existing sockets */\nfor (i = 0; i < MAX_CONNS; i++) {\n  SoAd_TpTransmit(i, &aliveCheckReq_0x0007);\n  conn[i].AliveTimerMs = " + (cfg.DoIPAliveCheckResponseTimeoutMs || 500) + "u;\n}";
  addTrace("SoAd_TpTransmit(0x0007)", "Pool đầy vì " + newSa + " -> Phát Alive Check (500ms)", "warn");
  updateRegistersAfter();
}

function api_DoIP_SendAliveCheckResp(aliveSaHex, newTesterSaHex) {
  if (!sim || !sim.initialized) return;
  snapshotRegBefore();
  advanceClock(cfg.DoIPAliveCheckResponseTimeoutMs || 500);
  const keepSa = (aliveSaHex || cfg.DoIPSourceAddressTester1Hex || "0x0E00").toUpperCase();
  const newSa = newTesterSaHex || "0x0E03";
  let evictedIdx = -1;
  let keptIdx = -1;

  sim.tcpConns.forEach(c => {
    if (c.sockState === "ONLINE") {
      if (c.testerSa.toUpperCase() === keepSa) {
        c.routingState = "ROUTING_ACTIVE";
        c.aliveTimerMs = 0;
        c.genTimerMs = Number(cfg.DoIPGeneralInactivityTimeMs) || 300000;
        keptIdx = c.soConId;
      } else if (evictedIdx === -1) {
        c.sockState = "CLOSED";
        c.testerSa = "---";
        c.routingState = "NONE";
        c.aliveTimerMs = 0;
        c.genTimerMs = 0;
        evictedIdx = c.soConId;
      } else {
        c.routingState = "ROUTING_ACTIVE";
        c.aliveTimerMs = 0;
      }
    }
  });

  if (evictedIdx === -1) {
    // Nobody died, return Code 0x01 All Sockets Registered!
    sim.alivePending = false;
    setLastFrame("Tester (" + keepSa + ") ➔ ECU (0x0008)", "0x02", "0xFD", "0x0008", 2, "All testers replied 0x0008 -> Reject " + newSa + " with 0x0006 Code 0x01");
    sim.activeArrows = { arr_tester_soad: "active-err", arr_soad_doip_rx: "active-err", arr_doip_soad_tx: "active-err" };
    sim.stepNarrative = {
      title: "Mọi Tester Đều Trả Lời 0x0008 ➔ Từ Chối " + newSa + " (0x0006 Code 0x01)",
      inputOrigin: "Toàn bộ socket đều phản hồi 0x0008 kịp trước 500ms.",
      processDetail: "Không có slot rảnh để thu hồi. DoIP trả về Tester mới (" + newSa + ") mã 0x0006 Code 0x01 (All sockets active).",
      outputDest: "Giữ nguyên các Tester cũ, đóng kết nối chờ của " + newSa + ".",
      bitChange: "Bit 1 Thanh A (ALV_WT = 0).",
      apiSignature: "SoAd_TpTransmit(0x0006 /* Code=0x01 All sockets active */);",
      resultBadge: "NACK 0x01 (POOL FULL)",
      tone: "warn"
    };
    addTrace("0x0008 Alive Check Resp", "Không có socket chết -> trả 0x0006 Code 0x01 cho " + newSa, "warn");
    updateRegistersAfter();
    return;
  }

  sim.alivePending = false;
  sim.selectedSlotIdx = evictedIdx;
  sim.activeArrows = { arr_tester_soad: "active-cbk", arr_soad_doip_rx: "active-cbk", arr_doip_soad_tx: "active-cbk" };
  setLastFrame("Tester (" + keepSa + ") ➔ ECU (0x0008)", "0x02", "0xFD", "0x0008", 2, keepSa + " Alive (Slot " + keptIdx + ") | Slot " + evictedIdx + " Evicted -> Slot freed for " + newSa);
  sim.stepNarrative = {
    title: "0x0008 Phản Hồi: Giữ " + keepSa + " (Slot " + keptIdx + ") & Thu Hồi Slot " + evictedIdx + " Cho " + newSa,
    inputOrigin: keepSa + " gửi 0x0008 [SA=" + keepSa + "] hợp lệ; Slot " + evictedIdx + " im lặng quá " + cfg.DoIPAliveCheckResponseTimeoutMs + "ms.",
    processDetail: "DoIP giữ lại Slot " + keptIdx + ", gọi SoAd_CloseSoCon(" + evictedIdx + ") đuổi Tester chết, đồng thời cấp Slot " + evictedIdx + " cho Tester mới " + newSa + ".",
    outputDest: "Slot " + evictedIdx + " được giải phóng; sẵn sàng nhận 0x0005 từ " + newSa + ".",
    bitChange: "Bit 1 Thanh A (ALV_WT = 0).",
    apiSignature: "DoIP_SoAdTpRxIndication(0x0008); SoAd_CloseSoCon(" + evictedIdx + ");",
    resultBadge: "SLOT " + evictedIdx + " EVICTED",
    tone: "ok"
  };
  addTrace("0x0008 & Timeout", keepSa + " sống (Slot " + keptIdx + "); Slot " + evictedIdx + " bị thu hồi nhường cho " + newSa, "ok");
  updateRegistersAfter();
}

function api_DoIP_DiagRequest0x8001(targetAddrHex, opts) {
  const options = opts || {};
  if (!sim || !sim.initialized) api_DoIP_Init();
  if (!sim.actLineActive) api_DoIP_ActivationLineSwitch(true);
  if (!sim.ipAssigned) api_DoIP_LocalIpAddrAssignmentChg(true);
  if (!sim.tcpConns.some(c => c.routingState === "ROUTING_ACTIVE") && !options.allowInactiveSocket) {
    api_DoIP_TcpRoutingActivation(cfg.DoIPSourceAddressTester1Hex, cfg.DoIPRoutingActivationNumHex, cfg.DoIPEnableTlsPort3496, { skipPending: true });
  }
  snapshotRegBefore();
  advanceClock(14);

  const pVer = options.protoVer || cfg.InjectedProtoVerHex || (cfg.DoIPEnableTlsPort3496 ? "0x03" : "0x02");
  const invVer = options.invVer || cfg.InjectedInvVerHex || (cfg.DoIPEnableTlsPort3496 ? "0xFC" : "0xFD");
  const vNum = parseHexNum(pVer, 0x02) & 0xFF;
  const ivNum = parseHexNum(invVer, 0xFD) & 0xFF;
  const declaredLen = options.payloadLen !== undefined ? Number(options.payloadLen) : (Number(cfg.InjectedDiagPayloadLen) || 7);
  const sa = options.sourceSa || cfg.DoIPSourceAddressTester1Hex || "0x0E00";
  const ta = targetAddrHex || cfg.DoIPLocalDcmTargetHex || "0x1001";
  const udsHex = options.udsHex || cfg.InjectedDiagDataHex || "22 F1 90";

  // 1) Header XOR Check -> 0x0000 Code 0x00
  if (options.forceBadXor || ((vNum ^ ivNum) & 0xFF) !== 0xFF) {
    setLastFrame("Tester ➔ ECU (TCP Header Error)", pVer, invVer, "0x8001", declaredLen, "XOR Check FAILED: " + pVer + " ^ " + invVer + " = " + fmtHex(vNum ^ ivNum, 2) + " != 0xFF -> Close TCP Socket");
    sim.lastHeaderNack = true;
    sim.lastDiagNack = false;
    sim.lastDiagAck = false;
    sim.activeArrows = { arr_tester_soad: "active-err", arr_soad_doip_rx: "active-err", arr_doip_soad_tx: "active-err", arr_doip_det: "active-err" };
    reportDetAndIdsm("0x14", "DOIP_E_HEADER_NACK", "DOIP_SEV_HEADER_XOR_FAIL", "TCP Generic Header sai XOR -> Trả 0x0000(0x00) & đóng socket!", true);
    sim.stepNarrative = {
      title: "Generic Header NACK 0x0000 (Code 0x00): Lỗi Đồng Bộ XOR ➔ Đóng TCP Socket",
      inputOrigin: "Luồng TCP chứa Header [" + pVer + " " + invVer + " 80 01 ...].",
      processDetail: "Luật (" + pVer + " ^ " + invVer + ") == 0xFF thất bại! Theo ISO 13400-2, lỗi này đồng nghĩa mất đồng bộ luồng byte TCP nên DoIP bắt buộc gửi 0x0000(0x00) và đóng ngay socket.",
      outputDest: "SoAd_TpTransmit(0x0000, Code=0x00) -> SoAd_CloseSoCon().",
      bitChange: "Bit 7 Thanh B (HDR_OK=0), Bit 1 Thanh B (HD_NCK=1), Bit 0 Thanh B (DET_SC=1).",
      apiSignature: "DoIP_HeaderCheck() FAILED -> SoAd_TpTransmit(0x0000, 0x00); SoAd_CloseSoCon();",
      resultBadge: "HDR NACK 0x0000",
      tone: "err"
    };
    sim.cCodeSnippet = "if ((hdr[0] ^ hdr[1]) != 0xFFu) {\n  DoIP_SendHeaderNack(conn, 0x00u);\n  SoAd_CloseSoCon(conn->SoConId, TRUE);\n  IdsM_SetSecurityEvent(DOIP_SEV_INVALID_HDR);\n}";
    updateRegistersAfter();
    return;
  }

  // 2) Unknown Payload Type -> 0x0000 Code 0x01
  if (options.forceUnknownType) {
    setLastFrame("Tester ➔ ECU (TCP Type 0x9999)", pVer, invVer, "0x9999", declaredLen, "Unknown Payload Type 0x9999 -> Send Header NACK 0x0000 Code 0x01");
    sim.lastHeaderNack = true;
    sim.activeArrows = { arr_tester_soad: "active-err", arr_soad_doip_rx: "active-err", arr_doip_soad_tx: "active-err", arr_doip_det: "active-err" };
    reportDetAndIdsm("0x15", "DOIP_E_UNKNOWN_PAYLOAD", "DOIP_SEV_UNKNOWN_TYPE", "Payload Type 0x9999 không hợp lệ -> Trả 0x0000(0x01)", true);
    sim.stepNarrative = {
      title: "Generic Header NACK 0x0000 (Code 0x01): Unknown Payload Type",
      inputOrigin: "Tester gửi PayloadType = 0x9999 không nằm trong chuẩn ISO 13400-2.",
      processDetail: "DoIP giữ nguyên socket TCP (vì XOR đúng nên stream chưa hỏng) nhưng trả về Header NACK 0x0000 với mã 0x01 và bỏ qua payload.",
      outputDest: "SoAd_TpTransmit(0x0000, Code=0x01).",
      bitChange: "Bit 1 Thanh B (HD_NCK=1), Bit 0 Thanh B (DET_SC=1).",
      apiSignature: "DoIP_SendHeaderNack(conn, 0x01u /* Unknown payload type */);",
      resultBadge: "NACK 0x0000 (0x01)",
      tone: "err"
    };
    updateRegistersAfter();
    return;
  }

  // 3) Payload Length > Max -> 0x0000 Code 0x02
  if (declaredLen > Number(cfg.DoIPMaxByteArrayLength)) {
    setLastFrame("Tester ➔ ECU (TCP Len Overflow)", pVer, invVer, "0x8001", declaredLen, "PayloadLen=" + declaredLen + "B > DoIPMaxByteArrayLength=" + cfg.DoIPMaxByteArrayLength + "B -> Header NACK 0x02");
    sim.lastHeaderNack = true;
    sim.lastLenOk = false;
    sim.activeArrows = { arr_tester_soad: "active-err", arr_soad_doip_rx: "active-err", arr_doip_soad_tx: "active-err", arr_doip_det: "active-err" };
    reportDetAndIdsm("0x16", "DOIP_E_MSG_TOO_LARGE", "DOIP_SEV_LEN_OVERFLOW", "PayloadLength (" + declaredLen + ") vượt ngưỡng DoIPMaxByteArrayLength (" + cfg.DoIPMaxByteArrayLength + ")", true);
    sim.stepNarrative = {
      title: "Generic Header NACK 0x0000 (Code 0x02): Message Too Large (" + declaredLen + "B > " + cfg.DoIPMaxByteArrayLength + "B)",
      inputOrigin: "Tester khai báo PayloadLength = " + declaredLen + " bytes.",
      processDetail: "So sánh với DoIPMaxByteArrayLength = " + cfg.DoIPMaxByteArrayLength + "B bị vượt ngưỡng cấp phát. DoIP từ chối trước khi gọi PduR bằng 0x0000 Code 0x02.",
      outputDest: "SoAd_TpTransmit(0x0000, Code=0x02).",
      bitChange: "Bit 6 Thanh B (LEN_OK=0), Bit 1 Thanh B (HD_NCK=1), Bit 0 Thanh B (DET_SC=1).",
      apiSignature: "if (payLen > DOIP_MAX_BYTE_ARRAY_LEN) DoIP_SendHeaderNack(conn, 0x02u);",
      resultBadge: "NACK 0x0000 (0x02)",
      tone: "err"
    };
    updateRegistersAfter();
    return;
  }

  sim.lastHeaderNack = false;
  sim.lastHeaderOk = true;
  sim.lastLenOk = true;

  // Find active routing connection matching SA
  const activeConn = sim.tcpConns.find(c => c.sockState === "ONLINE" && c.routingState === "ROUTING_ACTIVE");
  if (!activeConn || activeConn.testerSa.toUpperCase() !== sa.toUpperCase() || options.forceInvalidSa) {
    setLastFrame("Tester (" + sa + ") ➔ ECU (0x8001 ➔ 0x8003 NACK 0x02)", pVer, invVer, "0x8003", 5, "SA=" + sa + " mismatched socket SA=" + (activeConn ? activeConn.testerSa : "NONE") + " -> 0x8003 Code 0x02");
    sim.lastSaTaOk = false;
    sim.lastDiagNack = true;
    sim.lastDiagAck = false;
    sim.activeArrows = { arr_tester_soad: "active-err", arr_soad_doip_rx: "active-err", arr_doip_soad_tx: "active-err", arr_doip_det: "active-err" };
    reportDetAndIdsm("0x21", "DOIP_E_INVALID_SA", "DOIP_SEV_SPOOFED_SA", "0x8001 dùng SA=" + sa + " khác với socket đang Active!", true);
    sim.stepNarrative = {
      title: "Diagnostic NACK 0x8003 (Code 0x02): Invalid Source Address (" + sa + ")",
      inputOrigin: "Gói 0x8001 mang Tester SA=" + sa + " trên socket chưa kích hoạt hoặc đã đăng ký SA khác (" + (activeConn ? activeConn.testerSa : "NONE") + ").",
      processDetail: "Bảo vệ chống giả mạo (anti-spoofing): DoIP không chuyển sang PduR mà trả ngay Diagnostic Negative ACK 0x8003 với code 0x02.",
      outputDest: "SoAd_TpTransmit(0x8003, Code=0x02) về Tester + IdsM ghi nhận.",
      bitChange: "Bit 5 Thanh B (SATA_OK=0), Bit 2 Thanh B (DG_NCK=1), Bit 0 Thanh B (DET_SC=1).",
      apiSignature: "SoAd_TpTransmit(0x8003 /* SA=" + ta + ", TA=" + sa + ", NACK=0x02 */);",
      resultBadge: "0x8003 NACK 0x02",
      tone: "err"
    };
    updateRegistersAfter();
    return;
  }

  // Reset General Inactivity Timer on valid activity!
  activeConn.genTimerMs = Number(cfg.DoIPGeneralInactivityTimeMs) || 300000;

  // 4) Check Target Address -> 0x8003 Code 0x03
  const localTa = (cfg.DoIPLocalDcmTargetHex || "0x1001").toUpperCase();
  const gwTa = (cfg.DoIPGwCanTpTargetHex || "0x2001").toUpperCase();
  const funcTa = (cfg.DoIPFuncGroupTargetHex || "0xE400").toUpperCase();
  const reqTaUp = ta.toUpperCase();
  if (![localTa, gwTa, funcTa].includes(reqTaUp)) {
    setLastFrame("ECU ➔ Tester (0x8003 NACK 0x03)", pVer, invVer, "0x8003", 5, "SA=" + sa + " | Unknown TA=" + ta + " -> 0x8003 Code 0x03");
    sim.lastSaTaOk = false;
    sim.lastDiagNack = true;
    sim.lastDiagAck = false;
    sim.activeArrows = { arr_tester_soad: "active-err", arr_soad_doip_rx: "active-err", arr_doip_soad_tx: "active-err", arr_doip_det: "active-err" };
    reportDetAndIdsm("0x22", "DOIP_E_UNKNOWN_TA", "DOIP_SEV_UNKNOWN_TA", "Target Address " + ta + " không có trong bảng DoIPChannel", true);
    sim.stepNarrative = {
      title: "Diagnostic NACK 0x8003 (Code 0x03): Unknown Target Address (" + ta + ")",
      inputOrigin: "Tester (" + sa + ") gửi 0x8001 nhắm tới ECU đích TA=" + ta + ".",
      processDetail: "DoIP tra bảng DoIPChannel (Local=" + localTa + ", CanGW=" + gwTa + ", Func=" + funcTa + ") không tìm thấy " + ta + ". Từ chối với mã 0x03.",
      outputDest: "SoAd_TpTransmit(0x8003, Code=0x03).",
      bitChange: "Bit 5 Thanh B (SATA_OK=0), Bit 2 Thanh B (DG_NCK=1).",
      apiSignature: "SoAd_TpTransmit(0x8003 /* NACK=0x03 Unknown TA " + ta + " */);",
      resultBadge: "0x8003 NACK 0x03",
      tone: "err"
    };
    updateRegistersAfter();
    return;
  }
  sim.lastSaTaOk = true;

  // 5) Check Target Unreachable (0x06) or TP Buffer Busy (0x08)
  if (options.forceUnreachable) {
    setLastFrame("ECU ➔ Tester (0x8003 NACK 0x06)", pVer, invVer, "0x8003", 5, "TA=" + ta + " Unreachable (PduR/CanTp bus offline) -> 0x8003 Code 0x06");
    sim.lastDiagNack = true; sim.lastDiagAck = false;
    sim.activeArrows = { arr_tester_soad: "active", arr_soad_doip_rx: "active", arr_doip_pdur: "active-err", arr_doip_soad_tx: "active-err" };
    sim.stepNarrative = {
      title: "Diagnostic NACK 0x8003 (Code 0x06): Target Unreachable (" + ta + ")",
      inputOrigin: "DoIP chuyển 0x8001 sang PduR nhưng tuyến đích đang OFFLINE / không phản hồi.",
      processDetail: "DoIP nhận báo lỗi đường truyền tới " + ta + " và trả 0x8003 Code 0x06 cho Tester.",
      outputDest: "SoAd_TpTransmit(0x8003, Code=0x06).",
      bitChange: "Bit 2 Thanh B (DG_NCK=1).",
      apiSignature: "SoAd_TpTransmit(0x8003 /* NACK=0x06 Target Unreachable */);",
      resultBadge: "0x8003 NACK 0x06",
      tone: "err"
    };
    addTrace("0x8003 Diag NACK (0x06)", "Target " + ta + " Unreachable", "err");
    updateRegistersAfter();
    return;
  }

  if (options.forceTpBusy) {
    setLastFrame("ECU ➔ Tester (0x8003 NACK 0x08)", pVer, invVer, "0x8003", 5, "PduR_DoIPTpStartOfReception() == BUFREQ_E_NOT_OK -> 0x8003 Code 0x08 (TP Error)");
    sim.lastDiagNack = true; sim.lastDiagAck = false;
    sim.activeArrows = { arr_tester_soad: "active", arr_soad_doip_rx: "active", arr_doip_pdur: "active-err", arr_doip_soad_tx: "active-err", arr_doip_det: "active-err" };
    reportDetAndIdsm("0x23", "DOIP_E_TP_BUFREQ", "DOIP_SEV_TP_OVERFLOW", "PduR_DoIPTpStartOfReception trả BUFREQ_E_NOT_OK -> 0x8003 Code 0x08", false);
    sim.stepNarrative = {
      title: "Diagnostic NACK 0x8003 (Code 0x08): Transport Protocol Error / Buffer Busy",
      inputOrigin: "DoIP gọi PduR_DoIPTpStartOfReception(RxPduId, len) nhưng Dcm/CanTp hết đệm.",
      processDetail: "PduR trả về BUFREQ_E_NOT_OK. DoIP hủy phiên nhận trên SoAd và gửi ngay 0x8003 Code 0x08 (TP Error) về Tester.",
      outputDest: "SoAd_TpTransmit(0x8003, Code=0x08).",
      bitChange: "Bit 2 Thanh B (DG_NCK=1), Bit 0 Thanh B (DET_SC=1).",
      apiSignature: "if (PduR_DoIPTpStartOfReception(...) != BUFREQ_OK) { Send 0x8003 Code 0x08; }",
      resultBadge: "0x8003 NACK 0x08",
      tone: "err"
    };
    updateRegistersAfter();
    return;
  }

  // 6) Valid UDS Routing: Local Dcm (0x1001) vs Edge Gateway CanTp (0x2001)
  const isGateway = (reqTaUp === gwTa);
  sim.gwCanTpActive = isGateway;
  sim.lastDiagNack = false;
  sim.lastDiagAck = Boolean(cfg.DoIPEnableDiagAck0x8002);

  if (isGateway) {
    sim.activeArrows = {
      arr_tester_soad: "active",
      arr_soad_doip_rx: "active",
      arr_doip_soad_tx: "active-cbk",
      arr_doip_pdur: "active-pur",
      arr_pdur_cantp: "active-pur"
    };
    const gwRsp = udsHex.trim().startsWith("22") ? "62 F1 90 43 41 4E 47 57" : "50 03 00 32 01 F4";
    setLastFrame("Tester ➔ DoIP ➔ PduR ➔ CanTp GW ➔ Tester", pVer, invVer, "0x8001", 12,
      (cfg.DoIPEnableDiagAck0x8002 ? "[0x8002 ACK] ➔ " : "") + "GW TA=" + ta + " UDS=[" + udsHex + "] ➔ CAN-FD 64B ➔ Rsp=[" + gwRsp + "]");
    sim.stepNarrative = {
      title: "Edge Gateway UDS 0x8001 ➔ PduR ➔ CanTp ➔ CAN-FD (TA=" + ta + ")",
      inputOrigin: "Tester (" + sa + ") gửi 0x8001 nhắm vào ECU con trên bus CAN (" + ta + ") với UDS [" + udsHex + "].",
      processDetail: (cfg.DoIPEnableDiagAck0x8002 ? "DoIP kiểm tra SA/TA ok -> phát 0x8002 ACK -> " : "DoIP ") + "gọi PduR_DoIPTpStartOfReception/CopyRxData/RxIndication. PduR tra bảng định tuyến thấy TA=" + ta + " nằm ngoài ECU nên chuyển thẳng xuống CanTp_Transmit() ➔ CAN-FD (64B), nhận lại phản hồi rồi đẩy về DoIP_TpTransmit().",
      outputDest: "Phản hồi UDS [" + gwRsp + "] từ ECU CAN-FD đi qua CanTp ➔ PduR ➔ DoIP ➔ SoAd ➔ Tester.",
      bitChange: "Bit 0 Thanh A (GW_CAN=1)" + (sim.lastDiagAck ? ", Bit 3 Thanh B (DG_ACK=1)." : "."),
      apiSignature: "PduR_DoIPTpRxIndication() -> CanTp_Transmit() -> CAN-FD -> DoIP_TpTransmit();",
      resultBadge: "GATEWAY CAN-FD OK",
      tone: "ok"
    };
    sim.cCodeSnippet = [
      "/* Edge Gateway Routing: Ethernet DoIP -> PduR -> CanTp -> CAN-FD */",
      (cfg.DoIPEnableDiagAck0x8002 ? "DoIP_SendDiagAck0x8002(conn, sa, 0x2001u, 0x00u);" : "/* 0x8002 ACK disabled */"),
      "PduR_DoIPTpRxIndication(PDUR_RX_DOIP_CANTP_GW, NTFRSLT_OK);",
      "/* Inside PduR */ CanTp_Transmit(CANTP_TX_GW_ECU_0x2001, &udsSdu);",
      "/* On CAN-FD Response */ DoIP_TpTransmit(DOIP_TX_TCP_0, &canRspPdu);"
    ].join("\n");
    addTrace("Gateway UDS 0x8001 -> CanTp", "TA=" + ta + " [" + udsHex + "] -> CAN-FD -> [" + gwRsp + "]", "ok");
  } else {
    sim.activeArrows = {
      arr_tester_soad: "active",
      arr_soad_doip_rx: "active",
      arr_doip_soad_tx: "active-cbk",
      arr_doip_pdur: "active",
      arr_pdur_dcm: "active",
      arr_dcm_rte: "active-pur"
    };
    const dcmRsp = udsHex.trim().startsWith("22") ? "62 F1 90 (" + cfg.DoIPVinString + ")" : "76 01 (Positive UDS)";
    setLastFrame("Tester ➔ DoIP ➔ PduR ➔ Dcm ➔ SWC ➔ Tester", pVer, invVer, "0x8001", 24,
      (cfg.DoIPEnableDiagAck0x8002 ? "[0x8002 ACK] ➔ " : "") + "Local TA=" + ta + " UDS=[" + udsHex + "] ➔ Dcm ➔ Rsp=[" + dcmRsp + "]");
    sim.stepNarrative = {
      title: "Local UDS 0x8001 ➔ 0x8002 ACK ➔ PduR ➔ Dcm ➔ SWC_Diag (TA=" + ta + ")",
      inputOrigin: "Tester (" + sa + ") gửi 0x8001 với UDS [" + udsHex + "] tới Dcm nội bộ (" + ta + ").",
      processDetail: (cfg.DoIPEnableDiagAck0x8002 ? "1) DoIP trả 0x8002 Positive ACK. " : "1) Bỏ qua 0x8002. ") + "2) PduR_DoIPTpStartOfReception/CopyRxData đẩy UDS lên Dcm. 3) Dcm gọi SWC_Diag qua RTE đọc dữ liệu và gọi PduR_DcmTransmit() -> DoIP_TpTransmit().",
      outputDest: "Gói phản hồi DoIP 0x8001 [" + dcmRsp + "] về Tester.",
      bitChange: "Bit 0 Thanh A (GW_CAN=0)" + (sim.lastDiagAck ? ", Bit 3 Thanh B (DG_ACK=1)." : "."),
      apiSignature: "PduR_DoIPTpRxIndication() -> Dcm_TpRxIndication() -> DoIP_TpTransmit();",
      resultBadge: "LOCAL DCM UDS OK",
      tone: "ok"
    };
    sim.cCodeSnippet = [
      "/* Local Diagnostic Routing: DoIP -> PduR -> Dcm -> SWC_Diag */",
      (cfg.DoIPEnableDiagAck0x8002 ? "DoIP_SendDiagAck0x8002(conn, sa, 0x1001u, 0x00u);" : "/* 0x8002 ACK disabled */"),
      "PduR_DoIPTpStartOfReception(PDUR_RX_DOIP_DCM, &info, ulen, &avail);",
      "PduR_DoIPTpCopyRxData(PDUR_RX_DOIP_DCM, &chunk, &avail);",
      "PduR_DoIPTpRxIndication(PDUR_RX_DOIP_DCM, NTFRSLT_OK);",
      "/* Dcm calls SWC_Diag -> PduR_DcmTransmit -> DoIP_TpTransmit */"
    ].join("\n");
    addTrace("Local UDS 0x8001 -> Dcm", "TA=" + ta + " [" + udsHex + "] -> Dcm/SWC -> [" + dcmRsp + "]", "ok");
  }
  updateRegistersAfter();
}

function api_DoIP_TpStreamingStep(phase, targetAddrHex) {
  if (!sim || !sim.initialized) api_DoIP_Init();
  if (!sim.tcpConns.some(c => c.routingState === "ROUTING_ACTIVE")) {
    api_DoIP_TcpRoutingActivation(cfg.DoIPSourceAddressTester1Hex, "0x00", cfg.DoIPEnableTlsPort3496, { skipPending: true });
  }
  snapshotRegBefore();
  advanceClock(10);
  const ta = targetAddrHex || cfg.DoIPLocalDcmTargetHex || "0x1001";
  const totalBytes = 4096;
  const mss = Math.max(256, Number(cfg.DoIPMaxTpChunkBytes) || 1460);
  const conn = sim.tcpConns[sim.selectedSlotIdx] || sim.tcpConns[0];
  conn.genTimerMs = Number(cfg.DoIPGeneralInactivityTimeMs) || 300000;

  if (totalBytes > Number(cfg.DoIPMaxByteArrayLength)) {
    api_DoIP_DiagRequest0x8001(ta, { payloadLen: totalBytes + 4 });
    return;
  }

  const pType = "0x8001";
  if (phase === "START_AND_CHUNK1") {
    sim.tpBufferLocked = true;
    conn.tpBufLocked = true;
    sim.lastDiagAck = Boolean(cfg.DoIPEnableDiagAck0x8002);
    sim.lastDiagNack = false;
    sim.activeArrows = { arr_tester_soad: "active", arr_soad_doip_rx: "active", arr_doip_pdur: "active", arr_pdur_dcm: "active" };
    setLastFrame("Tester ➔ ECU (TCP Segment #1)", "0x02", "0xFD", pType, totalBytes + 4, "TP StartOfReception (" + totalBytes + "B UDS 0x36 Flash) | Chunk #1 = " + Math.min(mss, totalBytes) + "B");
    sim.stepNarrative = {
      title: "TP Streaming Pha 1: StartOfReception(4096B) + CopyRxData Chunk #1 (" + Math.min(mss, totalBytes) + "B)",
      inputOrigin: "SoAd nhận TCP segment đầu tiên của bản tin DoIP Flash 0x36 tổng dài 4100B (4B SA/TA + 4096B UDS).",
      processDetail: "DoIP khóa bộ đệm TP của SoConId=" + conn.soConId + ", gọi PduR_DoIPTpStartOfReception(4096B) xin bộ đệm Dcm/Flash và chép lát đầu tiên bằng DoIP_SoAdTpCopyRxData().",
      outputDest: "Bit 4 Thanh B (TP_LCK = 1) bật sáng bảo vệ slot trong suốt quá trình stream.",
      bitChange: "Bit 4 Thanh B (TP_LCK = 1).",
      apiSignature: "DoIP_SoAdTpStartOfReception(4100B) -> PduR_DoIPTpStartOfReception(4096B) -> CopyRxData(" + Math.min(mss, totalBytes) + "B);",
      resultBadge: "TP RX CHUNK #1",
      tone: "warn"
    };
    addTrace("DoIP_SoAdTpStartOfReception(4100B)", "Khóa TP Buffer, nhận Chunk #1 (" + Math.min(mss, totalBytes) + "B)", "info");
  } else if (phase === "CHUNK2") {
    sim.tpBufferLocked = true;
    conn.tpBufLocked = true;
    const chunk2 = Math.min(mss, Math.max(0, totalBytes - mss));
    sim.activeArrows = { arr_tester_soad: "active", arr_soad_doip_rx: "active", arr_doip_pdur: "active", arr_pdur_dcm: "active" };
    setLastFrame("Tester ➔ ECU (TCP Segment #2)", "0x02", "0xFD", pType, totalBytes + 4, "Streaming DoIP_SoAdTpCopyRxData() Chunk #2 = " + chunk2 + "B (Total=" + (mss + chunk2) + "/" + totalBytes + "B)");
    sim.stepNarrative = {
      title: "TP Streaming Pha 2: CopyRxData Chunk #2 (" + chunk2 + "B / " + totalBytes + "B)",
      inputOrigin: "TcpIp/SoAd đẩy tiếp TCP segment thứ 2 chứa dữ liệu thô UDS 0x36 (không có lại 8B header DoIP!).",
      processDetail: "DoIP bỏ qua bước giải mã header, chuyển thẳng lát dữ liệu sang PduR_DoIPTpCopyRxData() giúp tiết kiệm RAM đệm trùng lặp.",
      outputDest: "Đã nạp " + (mss + chunk2) + " / " + totalBytes + " bytes xuống Dcm Flash Buffer.",
      bitChange: "Bit 4 Thanh B (TP_LCK = 1) tiếp tục khóa.",
      apiSignature: "DoIP_SoAdTpCopyRxData(chunkLen=" + chunk2 + "B) -> PduR_DoIPTpCopyRxData();",
      resultBadge: "TP RX CHUNK #2",
      tone: "warn"
    };
    addTrace("DoIP_SoAdTpCopyRxData(#2)", "Đẩy tiếp " + chunk2 + "B xuống PduR/Dcm", "info");
  } else {
    sim.tpBufferLocked = false;
    conn.tpBufLocked = false;
    const rem = Math.max(0, totalBytes - 2 * mss);
    sim.activeArrows = { arr_soad_doip_rx: "active", arr_doip_pdur: "active", arr_pdur_dcm: "active", arr_doip_soad_tx: "active-cbk" };
    setLastFrame("ECU ➔ Tester (TCP TP Complete + 0x76 01)", "0x02", "0xFD", pType, 6, "Rx Chunk #3 (" + rem + "B) -> RxIndication(OK) -> 0x8002 ACK -> DoIP_TpTransmit(76 01) + CopyTxData");
    sim.stepNarrative = {
      title: "TP Streaming Pha 3: Hoàn Tất 4096B ➔ Mở Khóa TP Buffer & Trả 0x76 Positive!",
      inputOrigin: "Segment cuối cùng (" + rem + "B) hoàn tất 4096/4096B -> SoAd gọi DoIP_SoAdTpRxIndication(E_OK).",
      processDetail: "DoIP kết thúc phiên nhận, giải phóng TP_LCK=0, báo PduR_DoIPTpRxIndication(NTFRSLT_OK). Sau khi Dcm nạp Flash xong, DoIP gửi 0x8001 (76 01) thông qua DoIP_TpTransmit() + DoIP_SoAdTpCopyTxData() + TxConfirmation().",
      outputDest: "Tester nhận hoàn chỉnh UDS TransferData Positive Response (0x76 01).",
      bitChange: "Bit 4 Thanh B (TP_LCK = 0), Bit 3 Thanh B (DG_ACK = 1).",
      apiSignature: "DoIP_SoAdTpRxIndication(E_OK) -> DoIP_TpTransmit(76 01) -> DoIP_SoAdTpCopyTxData();",
      resultBadge: "TP 4KB COMPLETE",
      tone: "ok"
    };
    addTrace("DoIP_SoAdTpRxIndication(OK)", "Hoàn tất 4096B TP & phát 0x76 01 qua CopyTxData", "ok");
  }
  updateRegistersAfter();
}

function api_DoIP_MainFunction(stepMsOverride) {
  if (!sim || !sim.initialized) {
    api_DoIP_Init();
    return;
  }
  snapshotRegBefore();
  const dt = Number(stepMsOverride) || Number(cfg.DoIPMainFunctionPeriodMs) || 10;
  advanceClock(dt);
  const events = [];

  // 1) Process UDP Announcement Countdown
  if (sim.actLineActive && sim.ipAssigned && sim.announceDoneCount < (Number(cfg.DoIPVehicleAnnounceCount) || 3)) {
    if (sim.announceWaitRemainMs > 0) {
      sim.announceWaitRemainMs = Math.max(0, sim.announceWaitRemainMs - dt);
      if (sim.announceWaitRemainMs === 0) {
        api_DoIP_SendVehicleAnnouncement();
        events.push("T_Announce fired 0x0004");
      } else {
        events.push("T_AnnounceWait còn " + sim.announceWaitRemainMs + "ms");
      }
    }
  }

  // 2) Poll Async SWC Authentication & Timers across TcpConnTable
  let completedPending = false;
  sim.tcpConns.forEach(c => {
    if (c.sockState !== "ONLINE") return;
    if (c.routingState === "AUTH_PENDING") {
      c.authPendingTicks = Math.max(0, c.authPendingTicks - 1);
      if (c.authPendingTicks === 0 || dt >= 50) {
        if (cfg.DoIPConfCallbackRequired) {
          c.routingState = "CONF_PENDING";
          events.push("Slot " + c.soConId + ": Auth OK -> CONF_PENDING");
        } else {
          c.routingState = "ROUTING_ACTIVE";
          c.genTimerMs = Number(cfg.DoIPGeneralInactivityTimeMs) || 300000;
          sim.swcAuthGranted = true;
          completedPending = true;
          events.push("Slot " + c.soConId + ": Auth OK -> ROUTING_ACTIVE (0x0006 0x10)");
        }
      } else {
        events.push("Slot " + c.soConId + ": Poll SWC -> DOIP_E_PENDING");
      }
    } else if (c.routingState === "CONF_PENDING") {
      c.routingState = "ROUTING_ACTIVE";
      c.genTimerMs = Number(cfg.DoIPGeneralInactivityTimeMs) || 300000;
      sim.swcAuthGranted = true;
      completedPending = true;
      events.push("Slot " + c.soConId + ": Confirmation OK -> ROUTING_ACTIVE (0x0006 0x10)");
    } else if (c.routingState === "WAIT_ROUTING_ACT" && c.initTimerMs > 0) {
      c.initTimerMs = Math.max(0, c.initTimerMs - dt);
      if (c.initTimerMs === 0) {
        c.sockState = "CLOSED"; c.testerSa = "---"; c.routingState = "NONE";
        sim.activeArrows = { arr_doip_soad_tx: "active-err" };
        events.push("Slot " + c.soConId + ": T_Initial_Inactivity TIMEOUT -> CloseSoCon!");
      }
    } else if (c.routingState === "ROUTING_ACTIVE" && c.genTimerMs > 0) {
      c.genTimerMs = Math.max(0, c.genTimerMs - dt);
      if (c.genTimerMs === 0) {
        c.sockState = "CLOSED"; c.testerSa = "---"; c.routingState = "NONE";
        sim.swcAuthGranted = false;
        sim.activeArrows = { arr_doip_soad_tx: "active-err" };
        events.push("Slot " + c.soConId + ": T_General_Inactivity (300s) TIMEOUT -> CloseSoCon!");
      }
    } else if (c.routingState === "ALIVE_CHECK_WAIT" && c.aliveTimerMs > 0) {
      c.aliveTimerMs = Math.max(0, c.aliveTimerMs - dt);
      if (c.aliveTimerMs === 0) {
        c.sockState = "CLOSED"; c.testerSa = "---"; c.routingState = "NONE";
        sim.alivePending = false;
        events.push("Slot " + c.soConId + ": T_Alive_Check (500ms) TIMEOUT -> Evicted!");
      }
    }
  });

  if (completedPending) {
    const actC = sim.tcpConns.find(c => c.routingState === "ROUTING_ACTIVE");
    setLastFrame("ECU ➔ Tester (" + (actC ? actC.testerSa : "0x0E00") + ")", cfg.DoIPEnableTlsPort3496 ? "0x03" : "0x02", cfg.DoIPEnableTlsPort3496 ? "0xFC" : "0xFD", "0x0006", 9, "Async SWC Auth/Conf Completed -> Routing Code 0x10 ACTIVE");
    sim.activeArrows = { arr_doip_rte: "active-pur", arr_rte_swc: "active-pur", arr_doip_soad_tx: "active-cbk" };
  }

  const summaryMsg = events.length > 0 ? events.join(" | ") : ("Tick +" + dt + "ms (Timers OK)");
  sim.stepNarrative = {
    title: "DoIP_MainFunction(+" + dt + "ms) — Điều Phối Timer & Poll SWC Async",
    inputOrigin: "OS Task định kỳ gọi DoIP_MainFunction() mỗi " + cfg.DoIPMainFunctionPeriodMs + "ms.",
    processDetail: summaryMsg,
    outputDest: "Cập nhật đồng loạt trạng thái các Timer ISO 13400-2 và các kết nối trong DoIP_TcpConnTable.",
    bitChange: "RegA=" + fmtHex(computeNodeRoutingByte(), 2) + ", RegB=" + fmtHex(computeHeaderDiagByte(), 2),
    apiSignature: "void DoIP_MainFunction(void); /* Elapsed +" + dt + "ms */",
    resultBadge: "MAINFN +" + dt + "ms",
    tone: events.some(e => e.includes("TIMEOUT")) ? "warn" : "ok"
  };
  addTrace("DoIP_MainFunction(+" + dt + "ms)", summaryMsg, events.some(e => e.includes("TIMEOUT")) ? "warn" : "info");
  updateRegistersAfter();
}

function api_DoIP_GetVersionInfo() {
  if (!sim) api_DoIP_Init();
  snapshotRegBefore();
  advanceClock(1);
  if (!cfg.DoIPVersionInfoApi) {
    sim.stepNarrative = {
      title: "DoIP_GetVersionInfo() Đang Tắt (DoIPVersionInfoApi = FALSE)",
      inputOrigin: "Module ngoài gọi DoIP_GetVersionInfo().",
      processDetail: "Hàm không được biên dịch vào mã C vì DoIPVersionInfoApi=FALSE trong DoIPGeneral.",
      outputDest: "Bật lại DoIPVersionInfoApi=TRUE ở Tab General để đọc ModuleId 173.",
      bitChange: "Không đổi.",
      apiSignature: "/* #if (DOIP_VERSION_INFO_API == STD_ON) */",
      resultBadge: "API DISABLED",
      tone: "warn"
    };
    addTrace("DoIP_GetVersionInfo()", "DoIPVersionInfoApi=FALSE (Disabled)", "warn");
    updateRegistersAfter();
    return;
  }
  sim.stepNarrative = {
    title: "DoIP_GetVersionInfo(&ver) — ModuleId = 173 (0x00AD) | R23-11",
    inputOrigin: "BswM / Diagnostic Integration Check gọi DoIP_GetVersionInfo(&StdVersion).",
    processDetail: "Ghi VendorId=0x001E, ModuleId=173 (0x00AD), SwMajor=23, SwMinor=11, SwPatch=0.",
    outputDest: "Trả cấu trúc Std_VersionInfoType về caller.",
    bitChange: "Không đổi thanh ghi vận hành.",
    apiSignature: "void DoIP_GetVersionInfo(Std_VersionInfoType* versioninfo); /* moduleID=173 */",
    resultBadge: "MOD 173 (0x00AD)",
    tone: "ok"
  };
  sim.cCodeSnippet = "Std_VersionInfoType ver;\nDoIP_GetVersionInfo(&ver); /* vendorID=0x001E, moduleID=173 (0x00AD), sw=23.11.0 */";
  addTrace("DoIP_GetVersionInfo()", "ModuleId=173 (0x00AD), AUTOSAR R23-11 (23.11.0)", "ok");
  updateRegistersAfter();
}

function api_DoIP_TestDetError(codeHex) {
  if (!sim) api_DoIP_Init();
  snapshotRegBefore();
  advanceClock(2);
  const code = codeHex || "0x03";
  const map = {
    "0x01": { name: "DOIP_E_UNINIT (0x01)", api: "0x0F", desc: "Gọi DoIP_TpTransmit() trước khi hoàn tất DoIP_Init()." },
    "0x02": { name: "DOIP_E_PARAM (0x02)", api: "0x03", desc: "Tham số SoConId hoặc ActivationState vượt giới hạn hợp lệ." },
    "0x03": { name: "DOIP_E_INVALID_PDU_SDU_ID (0x03)", api: "0x03", desc: "Truyền DoIPTxPduId = 999 không tồn tại trong bảng Lcfg." },
    "0x04": { name: "DOIP_E_PARAM_POINTER (0x04)", api: "0x02", desc: "Truyền con trỏ NULL_PTR vào PduInfoPtr / VersionInfoPtr." }
  };
  const info = map[code] || map["0x03"];
  sim.activeArrows = { arr_doip_det: "active-err" };
  reportDetAndIdsm(info.api, info.name, "DOIP_SEV_API_MISUSE", info.desc, true);
  sim.stepNarrative = {
    title: "Kiểm Thử DET Guard (ModuleId = 173) — " + info.name,
    inputOrigin: "Kịch bản tiêm lỗi gọi API DoIP với tham số bất hợp lệ: " + info.desc,
    processDetail: cfg.DoIPDevErrorDetect
      ? "DoIPDevErrorDetect=TRUE chặn đứng tại đầu hàm, báo Det_ReportError(173, 0, " + info.api + ", " + code + ") và trả E_NOT_OK."
      : "Cảnh báo: DoIPDevErrorDetect đang FALSE nên hàng rào kiểm lỗi bị vô hiệu!",
    outputDest: "Ghi nhận vào Module DET (173)" + (cfg.DoIPEnableIdsMSecurityEvents ? " & IdsM Security Event." : "."),
    bitChange: "Bit 0 Thanh B (DET_SC = 1).",
    apiSignature: "Det_ReportError(173u, 0u, " + info.api + "u, " + code + "u); /* " + info.name + " */",
    resultBadge: cfg.DoIPDevErrorDetect ? "DET 173 CAUGHT" : "DET OFF WARNING",
    tone: "err"
  };
  sim.cCodeSnippet = [
    "/* SWS_DoIP ModuleId = 173 Development Error Guard */",
    "#if (DOIP_DEV_ERROR_DETECT == STD_ON)",
    "  if (invalidCondition) {",
    "    (void)Det_ReportError(173u, 0u, " + info.api + "u, " + info.name + ");",
    "    return E_NOT_OK;",
    "  }",
    "#endif"
  ].join("\n");
  updateRegistersAfter();
}

// ==================== CONFIG VALIDATION & ARXML / H / C / JSON EXPORTS ====================

function validateConfig() {
  const issues = [];
  if (Number(cfg.DoIPMaxByteArrayLength) < 512) {
    issues.push({ tone: "warn", msg: "⚠️ DoIPMaxByteArrayLength (" + cfg.DoIPMaxByteArrayLength + "B) nhỏ hơn 512B: các gói UDS Flash 0x36 lớn sẽ bị từ chối bằng Header NACK 0x02!" });
  }
  if (Number(cfg.DoIPInitialInactivityTimeMs) > 10000) {
    issues.push({ tone: "warn", msg: "⚠️ InitialInactivityTime (" + cfg.DoIPInitialInactivityTimeMs + "ms) lớn hơn chuẩn ISO 13400-2 (2000ms), dễ bị kẹt socket khi Tester treo." });
  }
  if (!cfg.DoIPDevErrorDetect) {
    issues.push({ tone: "warn", msg: "⚠️ DoIPDevErrorDetect=FALSE: lỗi sai PduId/NULL pointer sẽ không báo về Module 173 DET." });
  }
  const v = parseHexNum(cfg.InjectedProtoVerHex, 0x02) & 0xFF;
  const iv = parseHexNum(cfg.InjectedInvVerHex, 0xFD) & 0xFF;
  if (((v ^ iv) & 0xFF) !== 0xFF) {
    issues.push({ tone: "err", msg: "❌ InjectedProtoVer (" + cfg.InjectedProtoVerHex + ") ^ InjectedInvVer (" + cfg.InjectedInvVerHex + ") != 0xFF! Khung tiếp theo sẽ bắn Header NACK 0x0000!" });
  }
  if (cfg.DoIPVinString.length !== 17) {
    issues.push({ tone: "warn", msg: "⚠️ DoIPVin đang dài " + cfg.DoIPVinString.length + " ký tự (chuẩn ISO VIN bắt buộc 17 ký tự)." });
  }
  return issues;
}

function generateDoipArxml() {
  const b = v => (v ? "true" : "false");
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<AUTOSAR xmlns="http://autosar.org/schema/r4.0">',
    '  <AR-PACKAGES><AR-PACKAGE><SHORT-NAME>DoIP_Ecuc</SHORT-NAME><ELEMENTS>',
    '    <ECUC-MODULE-CONFIGURATION-VALUES>',
    '      <SHORT-NAME>DoIP</SHORT-NAME>',
    '      <DEFINITION-REF DEST="ECUC-MODULE-DEF">/AUTOSAR/EcucDefs/DoIP</DEFINITION-REF>',
    '      <CONTAINERS>',
    '        <ECUC-CONTAINER-VALUE><SHORT-NAME>DoIPGeneral</SHORT-NAME><PARAMETER-VALUES>',
    '          <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF>/AUTOSAR/EcucDefs/DoIP/DoIPGeneral/DoIPDevErrorDetect</DEFINITION-REF><VALUE>' + b(cfg.DoIPDevErrorDetect) + '</VALUE></ECUC-NUMERICAL-PARAM-VALUE>',
    '          <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF>/AUTOSAR/EcucDefs/DoIP/DoIPGeneral/DoIPVersionInfoApi</DEFINITION-REF><VALUE>' + b(cfg.DoIPVersionInfoApi) + '</VALUE></ECUC-NUMERICAL-PARAM-VALUE>',
    '          <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF>/AUTOSAR/EcucDefs/DoIP/DoIPGeneral/DoIPLogicalAddress</DEFINITION-REF><VALUE>' + parseHexNum(cfg.DoIPLogicalAddressHex, 0x1001) + '</VALUE></ECUC-NUMERICAL-PARAM-VALUE>',
    '          <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF>/AUTOSAR/EcucDefs/DoIP/DoIPGeneral/DoIPMaxTesterConnections</DEFINITION-REF><VALUE>' + Number(cfg.DoIPMaxTesterConnections) + '</VALUE></ECUC-NUMERICAL-PARAM-VALUE>',
    '          <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF>/AUTOSAR/EcucDefs/DoIP/DoIPGeneral/DoIPInitialInactivityTime</DEFINITION-REF><VALUE>' + (Number(cfg.DoIPInitialInactivityTimeMs) / 1000) + '</VALUE></ECUC-NUMERICAL-PARAM-VALUE>',
    '          <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF>/AUTOSAR/EcucDefs/DoIP/DoIPGeneral/DoIPGeneralInactivityTime</DEFINITION-REF><VALUE>' + (Number(cfg.DoIPGeneralInactivityTimeMs) / 1000) + '</VALUE></ECUC-NUMERICAL-PARAM-VALUE>',
    '          <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF>/AUTOSAR/EcucDefs/DoIP/DoIPGeneral/DoIPAliveCheckResponseTimeout</DEFINITION-REF><VALUE>' + (Number(cfg.DoIPAliveCheckResponseTimeoutMs) / 1000) + '</VALUE></ECUC-NUMERICAL-PARAM-VALUE>',
    '          <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF>/AUTOSAR/EcucDefs/DoIP/DoIPGeneral/DoIPMaxByteArrayLength</DEFINITION-REF><VALUE>' + Number(cfg.DoIPMaxByteArrayLength) + '</VALUE></ECUC-NUMERICAL-PARAM-VALUE>',
    '          <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF>/AUTOSAR/EcucDefs/DoIP/DoIPGeneral/DoIPEnableTlsPort3496</DEFINITION-REF><VALUE>' + b(cfg.DoIPEnableTlsPort3496) + '</VALUE></ECUC-NUMERICAL-PARAM-VALUE>',
    '        </PARAMETER-VALUES></ECUC-CONTAINER-VALUE>',
    '        <ECUC-CONTAINER-VALUE><SHORT-NAME>DoIPUdpVehicleAnnouncement</SHORT-NAME><PARAMETER-VALUES>',
    '          <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF>/AUTOSAR/EcucDefs/DoIP/DoIPUdpVehicleAnnouncement/DoIPVehicleAnnouncementCount</DEFINITION-REF><VALUE>' + Number(cfg.DoIPVehicleAnnounceCount) + '</VALUE></ECUC-NUMERICAL-PARAM-VALUE>',
    '          <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF>/AUTOSAR/EcucDefs/DoIP/DoIPUdpVehicleAnnouncement/DoIPVehicleAnnouncementInterval</DEFINITION-REF><VALUE>' + (Number(cfg.DoIPVehicleAnnounceIntervalMs) / 1000) + '</VALUE></ECUC-NUMERICAL-PARAM-VALUE>',
    '          <ECUC-TEXTUAL-PARAM-VALUE><DEFINITION-REF>/AUTOSAR/EcucDefs/DoIP/DoIPGeneral/DoIPVin</DEFINITION-REF><VALUE>' + cfg.DoIPVinString + '</VALUE></ECUC-TEXTUAL-PARAM-VALUE>',
    '        </PARAMETER-VALUES></ECUC-CONTAINER-VALUE>',
    '      </CONTAINERS>',
    '    </ECUC-MODULE-CONFIGURATION-VALUES>',
    '  </ELEMENTS></AR-PACKAGE></AR-PACKAGES>',
    '</AUTOSAR>'
  ].join("\n");
}

function generateDoipCfgH() {
  const onOff = v => (v ? "STD_ON" : "STD_OFF");
  return [
    "/* Generated by AUTOSAR Classic R23-11 DoIP Interactive Simulator (Module 173) */",
    "#ifndef DOIP_CFG_H",
    "#define DOIP_CFG_H",
    "",
    "#define DOIP_MODULE_ID                         173u /* 0x00AD */",
    "#define DOIP_DEV_ERROR_DETECT                  " + onOff(cfg.DoIPDevErrorDetect),
    "#define DOIP_VERSION_INFO_API                  " + onOff(cfg.DoIPVersionInfoApi),
    "#define DOIP_USE_MAC_ADDRESS_FOR_ID            " + onOff(cfg.DoIPUseMacForGid),
    "#define DOIP_ENABLE_TLS_PORT_3496              " + onOff(cfg.DoIPEnableTlsPort3496),
    "#define DOIP_ENABLE_DIAG_ACK_0X8002            " + onOff(cfg.DoIPEnableDiagAck0x8002),
    "#define DOIP_IDSM_SECURITY_EVENT_REPORTING     " + onOff(cfg.DoIPEnableIdsMSecurityEvents),
    "#define DOIP_LOGICAL_ADDRESS                   " + cfg.DoIPLogicalAddressHex + "u",
    "#define DOIP_MAX_TESTER_CONNECTIONS            " + Number(cfg.DoIPMaxTesterConnections) + "u",
    "#define DOIP_INITIAL_INACTIVITY_TIME_MS        " + Number(cfg.DoIPInitialInactivityTimeMs) + "u",
    "#define DOIP_GENERAL_INACTIVITY_TIME_MS        " + Number(cfg.DoIPGeneralInactivityTimeMs) + "u",
    "#define DOIP_ALIVE_CHECK_TIMEOUT_MS            " + Number(cfg.DoIPAliveCheckResponseTimeoutMs) + "u",
    "#define DOIP_ANNOUNCE_COUNT                    " + Number(cfg.DoIPVehicleAnnounceCount) + "u",
    "#define DOIP_ANNOUNCE_INTERVAL_MS              " + Number(cfg.DoIPVehicleAnnounceIntervalMs) + "u",
    "#define DOIP_MAIN_FUNCTION_PERIOD_MS           " + Number(cfg.DoIPMainFunctionPeriodMs) + "u",
    "#define DOIP_MAX_BYTE_ARRAY_LENGTH             " + Number(cfg.DoIPMaxByteArrayLength) + "u",
    "#define DOIP_HOST_NAME_SIZE_MAX                " + Number(cfg.DoIPHostNameSizeMax) + "u",
    "#define DOIP_MAX_TP_CHUNK_BYTES                " + Number(cfg.DoIPMaxTpChunkBytes) + "u",
    "",
    "#endif /* DOIP_CFG_H */"
  ].join("\n");
}

function generateDoipLcfgC() {
  return [
    "/* DoIP Link-Time Configuration (DoIP_Lcfg.c) */",
    '#include "DoIP.h"',
    '#include "PduR_DoIP.h"',
    '#include "Rte_DoIP.h"',
    "",
    "const DoIP_TesterType DoIP_TesterConfig[2] = {",
    "  { .TesterSA = " + cfg.DoIPSourceAddressTester1Hex + "u, .NumByteConfirmed = 0u, .RoutingActRef = 0u },",
    "  { .TesterSA = " + cfg.DoIPSourceAddressTester2Hex + "u, .NumByteConfirmed = 0u, .RoutingActRef = 0u }",
    "};",
    "",
    "const DoIP_ChannelType DoIP_ChannelConfig[3] = {",
    "  { .TargetAddr = " + cfg.DoIPLocalDcmTargetHex + "u, .PduRRxPduId = 0u /* -> Dcm */, .PduRTxPduId = 0u, .Ack0x8002 = " + (cfg.DoIPEnableDiagAck0x8002 ? "TRUE" : "FALSE") + " },",
    "  { .TargetAddr = " + cfg.DoIPGwCanTpTargetHex + "u, .PduRRxPduId = 1u /* -> CanTp Edge GW */, .PduRTxPduId = 1u, .Ack0x8002 = TRUE },",
    "  { .TargetAddr = " + cfg.DoIPFuncGroupTargetHex + "u, .PduRRxPduId = 2u /* Functional Multicast */, .PduRTxPduId = 2u, .Ack0x8002 = FALSE }",
    "};",
    "",
    "const DoIP_RoutingActivationConfigType DoIP_RoutingActConfig = {",
    "  .RoutingActivationNumber = " + cfg.DoIPRoutingActivationNumHex + "u,",
    "  .AuthCallbackMode        = /* " + cfg.DoIPAuthCallbackMode + " */ Rte_Call_DoIP_Auth,",
    "  .ConfCallbackRequired    = " + (cfg.DoIPConfCallbackRequired ? "TRUE" : "FALSE"),
    "};"
  ].join("\n");
}

function generateDoipJson() {
  return JSON.stringify({
    autosarRelease: "R23-11",
    module: "DoIP (ModuleId 173 / 0x00AD)",
    standard: "ISO 13400-2:2012 & 2019",
    ecucParameters: cfg,
    runtimeSnapshot: sim ? {
      nodeState: sim.nodeState,
      tcpState: sim.tcpState,
      regA: fmtHex(sim.regA, 2),
      regB: fmtHex(sim.regB, 2),
      openTcpSockets: sim.tcpConns.filter(c => c.sockState === "ONLINE").length,
      detEvents: sim.detEvents,
      idsmEvents: sim.idsmEvents
    } : null
  }, null, 2);
}
