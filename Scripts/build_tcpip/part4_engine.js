// ================= PART 4A: DEFAULT CONFIG, ENGINE STATE & CORE AUTOSAR TCPIP APIs =================

const defaultConfig = {
  TcpIpDevErrorDetect: true,
  TcpIpMainFunctionPeriod: 5,
  TcpIpBufferMemoryPoolZeroCopy: true,
  ActiveCtrlState: "TCPIP_STATE_ONLINE",
  TcpIpCtrlMtu: 1500,
  TcpIpCtrlFramePrioDefault: 4,
  SelectedLocalAddrId: "0",
  TcpIpAssignmentMethod: "TCPIP_IPADDR_ASSIGNMENT_STATIC",
  TcpIpAssignmentTrigger: "TCPIP_AUTOMATIC",
  TcpIpStaticIpAddress: "192.168.10.50/24",
  TcpIpAutoIpInitTimeoutMs: 1000,
  PersistAutoIpArpToNvM: true,
  TcpIpTcpEnabled: true,
  TcpIpTcpMaxRtx: 3,
  TcpIpTcpRetransmissionTimeoutMs: 200,
  TcpIpTcpNagleEnabled: false,
  TcpIpTcpKeepAliveEnabled: true,
  TcpIpTcpReceiveWindowMax: 4096,
  SelectedSocketProfile: "0",
  RemoteIpAndPortEndpoint: "192.168.10.100:13400",
  TxPayloadByteLength: 64,
  ForceCopyTxDataViaSoAd: true,
  TcpCloseAbortWithRst: false,
  TxRxPayloadPreviewHex: "02 FD 80 01 00 00 00 08",
  TcpIpArpTableEntryTimeoutSec: 60,
  SimulateArpCacheMiss: false,
  TcpIpIpReassemblyAndFragEnabled: true,
  SetIpDontFragmentFlagDf: true,
  TcpIpIcmpEchoReplyEnabled: true,
  HwChecksumOffloadEnabled: true,
  TcpIpTlsConnectionEnabled: false,
  ChangeParamIdSelector: "TCPIP_PARAMID_FRAMEPRIO",
  TcpIpSynCookiesEnabled: true,
  EnableIdsMSecurityReporting: true,
  SimulateNetworkFaultForDem: false,
  PassInvalidSocketOrNullForDet: false
};

let cfg = Object.assign({}, defaultConfig);
let sim = null;

function cloneObj(o) {
  return JSON.parse(JSON.stringify(o));
}

function parseIpFromCidr(cidr) {
  const s = String(cidr || "192.168.10.50/24").trim();
  return s.split("/")[0] || "192.168.10.50";
}

function parseRemoteEndpoint(epStr, fallbackIp, fallbackPort) {
  const raw = String(epStr || "").trim();
  const lastColon = raw.lastIndexOf(":");
  if (lastColon > 0 && raw.indexOf("[") === -1) {
    const ip = raw.slice(0, lastColon).trim();
    const port = parseInt(raw.slice(lastColon + 1), 10);
    return { ip: ip || fallbackIp, port: isNaN(port) ? fallbackPort : port };
  }
  return { ip: fallbackIp, port: fallbackPort };
}

function hexWord(n) {
  return "0x" + ((Number(n) >>> 0) & 0xFFFF).toString(16).toUpperCase().padStart(4, "0");
}

function hex32(n) {
  return "0x" + ((Number(n) >>> 0)).toString(16).toUpperCase().padStart(8, "0");
}

function hexByte(n) {
  return "0x" + ((Number(n) & 0xFF)).toString(16).toUpperCase().padStart(2, "0");
}

function getMssFromMtu() {
  const mtu = Math.max(256, Math.min(9000, Number(cfg.TcpIpCtrlMtu) || 1500));
  return Math.max(128, mtu - 40);
}

function createInitialSimState() {
  const localAddrs = LOCAL_ADDRS_PRESET.map(function (a) {
    return Object.assign({}, a, {
      assignedMethod: a.method,
      leaseSec: 0,
      probeStage: "IDLE"
    });
  });
  const sockets = [0, 1, 2, 3].map(function (idx) {
    const p = SOCKETS_PRESET[String(idx)];
    return Object.assign({}, p, {
      state: idx === 1 || idx === 2 ? "BOUND" : "CLOSED",
      tlsHandshakeDone: false,
      nagle: cfg.TcpIpTcpNagleEnabled,
      keepAlive: cfg.TcpIpTcpKeepAliveEnabled,
      framePrio: p.framePrio,
      ttl: p.ttl,
      seqNum: 0x1000 + idx * 0x100,
      ackNum: 0x2000 + idx * 0x100,
      rxWindow: Number(cfg.TcpIpTcpReceiveWindowMax) || 4096,
      txPendingAckBytes: 0,
      unackedSeq: 0,
      unackedLen: 0,
      rtxCount: 0,
      rtoRemainingMs: 0,
      timeWaitRemainingMs: 0,
      keepAliveIdleTicks: 0,
      dupAckCount: 0
    });
  });

  return {
    clockMs: 0,
    ctrlState: cfg.ActiveCtrlState || "TCPIP_STATE_ONLINE",
    phyLinkUp: true,
    regA: 0x00,
    regB: 0x00,
    ipAssigned: false,
    dhcpAutoIp: false,
    arpHit: !cfg.SimulateArpCacheMiss,
    zeroCopyUsed: false,
    tlsActive: false,
    errFlag: false,
    flagDf: cfg.SetIpDontFragmentFlagDf ? 1 : 0,
    flagMf: 0,
    tcpFlags: { urg: 0, ack: 0, psh: 0, rst: 0, syn: 0, fin: 0 },
    localAddrs: localAddrs,
    sockets: sockets,
    arpCache: [
      { ip: "192.168.10.100", mac: "00:11:22:33:44:64", state: "REACHABLE", ttlSec: 60, conflict: false },
      { ip: "192.168.10.200", mac: "00:11:22:33:44:C8", state: "REACHABLE", ttlSec: 60, conflict: false },
      { ip: "192.168.10.1",   mac: "00:AA:BB:CC:00:01", state: "STATIC",    ttlSec: 999, conflict: false }
    ],
    arpPendingQueue: [],
    reassemblyBuf: {
      active: false, id: 0, srcIp: "", totalExpected: 0, receivedBytes: 0, frags: []
    },
    lastHeader: {
      dir: "IDLE",
      vlanId: 10,
      pcp: Number(cfg.TcpIpCtrlFramePrioDefault) || 4,
      etherType: "0x0800",
      ipSrc: parseIpFromCidr(cfg.TcpIpStaticIpAddress),
      ipDst: "192.168.10.100",
      ttl: 64,
      df: cfg.SetIpDontFragmentFlagDf ? 1 : 0,
      mf: 0,
      fragOff: 0,
      fragId: "0x4A12",
      ipLen: 64,
      proto: "TCP",
      srcPort: 49152,
      dstPort: 13400,
      flagsStr: "NONE",
      seq: hex32(0x1000),
      ack: hex32(0x2000),
      win: Number(cfg.TcpIpTcpReceiveWindowMax) || 4096,
      mss: getMssFromMtu(),
      csum: cfg.HwChecksumOffloadEnabled ? "HW Offload" : "0x9C42 (SW)",
      payloadBytes: 0,
      payloadHex: cfg.TxRxPayloadPreviewHex,
      note: "Hệ thống TcpIp khởi tạo — sẵn sàng nhận lệnh từ EthSM / SoAd / EthIf."
    },
    lastFragList: [],
    counters: {
      txOk: 0,
      rxOk: 0,
      arpMisses: 0,
      retransmissions: 0,
      fragmentsSent: 0,
      fragmentsReassembled: 0,
      detErrors: 0,
      demEvents: 0,
      idsmEvents: 0,
      tlsSessions: 0
    },
    activeArrows: [],
    activeModules: ["MOD_TCPIP"],
    selectedModule: "MOD_TCPIP",
    apiTrace: [],
    stepNarrative: "Khởi tạo ngăn xếp AUTOSAR TcpIp (ModuleId 170). Chọn kịch bản hoặc dùng Quick Actions để mô phỏng.",
    cCodeSnippet: "// SWS_TcpIp_00002: TcpIp_Init(&TcpIp_ConfigSet);\nTcpIp_Init(NULL_PTR);",
    lastDet: { moduleId: 170, apiId: "0x00", errId: "NONE", msg: "Không có lỗi DET" },
    lastDem: { event: "NONE", status: "PASSED", detail: "Chưa phát sinh sự kiện DEM" },
    lastIdsm: { sev: "NONE", count: 0, detail: "Chưa phát hiện bất thường an ninh" },
    nagleBufferBytes: 0,
    dropNextTxForRtxTest: false
  };
}

function updateRegistersAfter() {
  if (!sim) return;
  let a = 0;
  if (sim.ctrlState === "TCPIP_STATE_ONLINE") a |= 0x80;
  if (sim.ctrlState === "TCPIP_STATE_ONHOLD") a |= 0x40;
  if (sim.ipAssigned) a |= 0x20;
  if (sim.dhcpAutoIp) a |= 0x10;
  if (sim.arpHit) a |= 0x08;
  if (sim.zeroCopyUsed) a |= 0x04;
  if (sim.tlsActive) a |= 0x02;
  if (sim.errFlag) a |= 0x01;
  sim.regA = a & 0xFF;

  let b = 0;
  if (sim.flagDf) b |= 0x80;
  if (sim.flagMf) b |= 0x40;
  if (sim.tcpFlags.urg) b |= 0x20;
  if (sim.tcpFlags.ack) b |= 0x10;
  if (sim.tcpFlags.psh) b |= 0x08;
  if (sim.tcpFlags.rst) b |= 0x04;
  if (sim.tcpFlags.syn) b |= 0x02;
  if (sim.tcpFlags.fin) b |= 0x01;
  sim.regB = b & 0xFF;
}

function addApiTrace(dir, api, detail, status) {
  if (!sim) return;
  sim.apiTrace.unshift({
    id: sim.apiTrace.length + 1,
    tickMs: sim.clockMs,
    dir: dir,
    api: api,
    detail: detail,
    status: status || "OK"
  });
  if (sim.apiTrace.length > 36) {
    sim.apiTrace.length = 36;
  }
}

function setTcpFlags(fObj) {
  sim.tcpFlags = {
    urg: fObj && fObj.urg ? 1 : 0,
    ack: fObj && fObj.ack ? 1 : 0,
    psh: fObj && fObj.psh ? 1 : 0,
    rst: fObj && fObj.rst ? 1 : 0,
    syn: fObj && fObj.syn ? 1 : 0,
    fin: fObj && fObj.fin ? 1 : 0
  };
}

function formatTcpFlagsStr() {
  const names = [];
  if (sim.tcpFlags.syn) names.push("SYN");
  if (sim.tcpFlags.ack) names.push("ACK");
  if (sim.tcpFlags.psh) names.push("PSH");
  if (sim.tcpFlags.fin) names.push("FIN");
  if (sim.tcpFlags.rst) names.push("RST");
  if (sim.tcpFlags.urg) names.push("URG");
  return names.length ? names.join("+") : "NONE";
}

function getSock(sockId) {
  const id = Math.max(0, Math.min(3, Number(sockId) || 0));
  return sim.sockets[id];
}

function reportDetError(apiIdHex, errCode, msg) {
  sim.counters.detErrors++;
  sim.errFlag = true;
  sim.lastDet = { moduleId: 170, apiId: apiIdHex, errId: errCode, msg: msg };
  sim.activeArrows = ["arr_tcpip_diag"];
  sim.activeModules = ["MOD_TCPIP", "MOD_DIAG"];
  addApiTrace("TCPIP->DET", "Det_ReportError(170, 0, " + apiIdHex + ", " + errCode + ")", msg, "ERR");
  updateRegistersAfter();
}

function reportDemEvent(evName, status, detail) {
  if (status === "FAILED") {
    sim.counters.demEvents++;
    sim.errFlag = true;
  }
  sim.lastDem = { event: evName, status: status, detail: detail };
  addApiTrace("TCPIP->DEM", "Dem_SetEventStatus(" + evName + ", " + status + ")", detail, status === "FAILED" ? "ERR" : "OK");
  updateRegistersAfter();
}

function reportIdsmEvent(sevName, detail) {
  if (!cfg.EnableIdsMSecurityReporting) {
    addApiTrace("TCPIP", "Security Anomaly Detected (" + sevName + ")", "IdsM reporting đang tắt (EnableIdsMSecurityReporting=FALSE)", "WARN");
    return;
  }
  sim.counters.idsmEvents++;
  sim.errFlag = true;
  sim.lastIdsm = { sev: sevName, count: sim.counters.idsmEvents, detail: detail };
  addApiTrace("TCPIP->IdsM", "IdsM_SetSecurityEvent(" + sevName + ")", detail, "ERR");
  updateRegistersAfter();
}

function isIpAssignedForSocket(sock) {
  const la = sim.localAddrs[sock.localAddrId] || sim.localAddrs[0];
  return la && la.state === "TCPIP_IPADDR_STATE_ASSIGNED";
}

function updateSocketIpsForLocalAddr(localAddrId, newIp) {
  sim.sockets.forEach(function (s) {
    if (s.localAddrId === localAddrId && !s.isMulticast) {
      s.localIp = newIp;
    }
  });
}

function resolveArpOrQueue(sock, len, framePrio, payloadHex) {
  if (sock.isMulticast || sock.remoteIp.startsWith("224.") || sock.domain === "AF_INET6") {
    sim.arpHit = true;
    return true;
  }
  const forceMiss = Boolean(cfg.SimulateArpCacheMiss);
  const entry = sim.arpCache.find(function (e) { return e.ip === sock.remoteIp && !forceMiss && e.state !== "MISS"; });
  if (entry) {
    sim.arpHit = true;
    return true;
  }

  sim.arpHit = false;
  sim.counters.arpMisses++;
  sim.arpPendingQueue.push({
    sockId: sock.socketId,
    dstIp: sock.remoteIp,
    proto: sock.proto,
    len: len,
    framePrio: framePrio,
    vlanId: 10,
    payloadHex: payloadHex || cfg.TxRxPayloadPreviewHex,
    reason: "ARP Cache Miss for " + sock.remoteIp
  });

  sim.activeArrows = ["arr_soad_tcpip", "arr_tcpip_ethif", "arr_ethif_eth", "arr_eth_bus"];
  sim.activeModules = ["MOD_SOAD", "MOD_TCPIP", "MOD_ETHIF", "MOD_ETH"];
  addApiTrace("TCPIP->ETHIF", "EthIf_ProvideTxBuffer(0, 0x0806, PCP=4, Len=28)", "ARP Request Broadcast FF:FF:FF:FF:FF:FF hỏi MAC của " + sock.remoteIp, "WARN");
  addApiTrace("ETHIF->ETH", "EthIf_Transmit(0, BufIdx, 0x0806, Broadcast)", "Who has " + sock.remoteIp + "? Tell " + sock.localIp + " (Gói dữ liệu nằm chờ tại ArpPendingQueue)", "WARN");

  sim.lastHeader = Object.assign({}, sim.lastHeader, {
    dir: "TX (ARP)",
    etherType: "0x0806",
    proto: "ARP",
    ipSrc: sock.localIp,
    ipDst: sock.remoteIp,
    srcPort: "-",
    dstPort: "-",
    flagsStr: "ARP_REQ",
    payloadBytes: 28,
    payloadHex: "00 01 08 00 06 04 00 01 [Who has " + sock.remoteIp + "]",
    note: "ARP Cache Miss! Gói " + sock.proto + " (" + len + "B) được giữ tại ArpPendingQueue; đã gửi Broadcast ARP Request."
  });
  updateRegistersAfter();
  return false;
}

// ---------- 1. EthSM Mode & IP Assignment APIs ----------

function api_TcpIp_RequestComMode(ctrlIdx, reqState) {
  cfg.ActiveCtrlState = reqState;
  const la0 = sim.localAddrs[0];
  const la1 = sim.localAddrs[1];

  if (reqState === "TCPIP_STATE_ONLINE") {
    if (!sim.phyLinkUp) {
      sim.ctrlState = "TCPIP_STATE_ONHOLD";
      cfg.ActiveCtrlState = "TCPIP_STATE_ONHOLD";
      addApiTrace("ETHSM->TCPIP", "TcpIp_RequestComMode(0, ONLINE)", "Bị giữ tại ONHOLD vì PHY Link vẫn đang DOWN!", "WARN");
      sim.stepNarrative = "PHY Link vẫn mất — TcpIp giữ nguyên trạng thái <b>TCPIP_STATE_ONHOLD</b> chờ Link hồi phục.";
      updateRegistersAfter();
      return "E_NOT_OK";
    }
    const prev = sim.ctrlState;
    if (prev === "TCPIP_STATE_OFFLINE") {
      sim.ctrlState = "TCPIP_STATE_STARTUP";
      addApiTrace("ETHSM->TCPIP", "TcpIp_RequestComMode(0, TCPIP_STATE_ONLINE)", "SWS_TcpIp_00070: Chuyển OFFLINE ➔ STARTUP", "OK");
    } else if (prev === "TCPIP_STATE_ONHOLD") {
      addApiTrace("ETHSM->TCPIP", "TcpIp_RequestComMode(0, TCPIP_STATE_ONLINE)", "Hồi phục từ ONHOLD ➔ ONLINE (bảo toàn IP & Socket đang mở)", "OK");
    } else {
      addApiTrace("ETHSM->TCPIP", "TcpIp_RequestComMode(0, TCPIP_STATE_ONLINE)", "Kích hoạt chế độ ONLINE", "OK");
    }

    sim.ctrlState = "TCPIP_STATE_ONLINE";
    if (prev === "TCPIP_STATE_ONHOLD" && la0.state === "TCPIP_IPADDR_STATE_ONHOLD") {
      la0.state = "TCPIP_IPADDR_STATE_ASSIGNED";
      sim.ipAssigned = true;
      addApiTrace("TCPIP->SOAD", "SoAd_LocalIpAddrAssignmentChg(0, ASSIGNED)", "Phục hồi ngay IP " + la0.ip + " & Socket ESTABLISHED", "OK");
    } else if (cfg.TcpIpAssignmentTrigger === "TCPIP_AUTOMATIC") {
      api_TcpIp_RequestIpAddrAssignment(0, cfg.TcpIpAssignmentMethod, { silentStep: true });
    }
    if (la1) {
      la1.state = "TCPIP_IPADDR_STATE_ASSIGNED";
      la1.igmpJoined = true;
    }
    addApiTrace("TCPIP->ETHSM", "EthSM_TcpIpModeIndication(0, TCPIP_STATE_ONLINE)", "SWS_TcpIp_00072: Báo EthSM kênh đã vào ONLINE", "OK");
    sim.activeArrows = ["arr_swc_rte", "arr_rte_ethsm", "arr_ethsm_tcpip", "arr_tcpip_soad"];
    sim.activeModules = ["MOD_SWC", "MOD_RTE", "MOD_ETHSM", "MOD_TCPIP", "MOD_SOAD"];
    sim.stepNarrative = "<b>TcpIp_RequestComMode(0, TCPIP_STATE_ONLINE)</b>: Bộ điều khiển chuyển sang <code>TCPIP_STATE_ONLINE</code> (Bit 7 = 1). " +
      (cfg.TcpIpAssignmentTrigger === "TCPIP_MANUAL"
        ? "Trigger đang đặt <code>TCPIP_MANUAL</code> nên IP giữ <code>UNASSIGNED</code> chờ ứng dụng gọi <code>TcpIp_RequestIpAddrAssignment()</code>."
        : "Tự động cấp phát IP theo <code>" + cfg.TcpIpAssignmentMethod + "</code> và báo <code>SoAd_LocalIpAddrAssignmentChg()</code>.");
  } else if (reqState === "TCPIP_STATE_ONHOLD") {
    sim.ctrlState = "TCPIP_STATE_ONHOLD";
    sim.localAddrs.forEach(function (la) {
      if (la.state === "TCPIP_IPADDR_STATE_ASSIGNED") {
        la.state = "TCPIP_IPADDR_STATE_ONHOLD";
      }
    });
    sim.ipAssigned = false;
    addApiTrace("ETHSM->TCPIP", "TcpIp_RequestComMode(0, TCPIP_STATE_ONHOLD)", "SWS_TcpIp_00076: Mất Link tạm — chuyển ONHOLD (giữ nguyên IP & TCP Socket)", "WARN");
    addApiTrace("TCPIP->SOAD", "SoAd_LocalIpAddrAssignmentChg(0, TCPIP_IPADDR_STATE_ONHOLD)", "Thông báo SoAd tạm dừng TX nhưng không hủy kết nối TCP", "WARN");
    addApiTrace("TCPIP->ETHSM", "EthSM_TcpIpModeIndication(0, TCPIP_STATE_ONHOLD)", "Xác nhận chế độ ONHOLD (Bit 6 = 1)", "WARN");
    sim.activeArrows = ["arr_ethsm_tcpip", "arr_tcpip_soad"];
    sim.activeModules = ["MOD_ETHSM", "MOD_TCPIP", "MOD_SOAD"];
    sim.stepNarrative = "<b>TCPIP_STATE_ONHOLD</b> (Bit 6 = 1, Bit 7 = 0): Đáp ứng mất PHY Link thoáng qua bằng cách <b>bảo toàn nguyên địa chỉ IP và các Socket TCP ESTABLISHED</b> thay vì reset!";
  } else if (reqState === "TCPIP_STATE_OFFLINE" || reqState === "TCPIP_STATE_SHUTDOWN") {
    sim.ctrlState = "TCPIP_STATE_SHUTDOWN";
    addApiTrace("ETHSM->TCPIP", "TcpIp_RequestComMode(0, TCPIP_STATE_OFFLINE)", "Đi qua SHUTDOWN: Đóng toàn bộ Socket & Thu hồi IP!", "WARN");
    sim.sockets.forEach(function (s) {
      if (s.state !== "CLOSED") {
        s.state = "CLOSED";
        s.tlsHandshakeDone = false;
        s.unackedLen = 0;
        addApiTrace("TCPIP->SOAD", "SoAd_TcpIpEvent(" + s.socketId + ", TCPIP_TCP_CLOSED)", "Đóng cưỡng bức do kênh chuyển OFFLINE", "WARN");
      }
    });
    sim.localAddrs.forEach(function (la) {
      la.state = "TCPIP_IPADDR_STATE_UNASSIGNED";
      la.igmpJoined = false;
      la.leaseSec = 0;
    });
    sim.arpPendingQueue = [];
    sim.ipAssigned = false;
    sim.dhcpAutoIp = false;
    sim.tlsActive = false;
    sim.ctrlState = "TCPIP_STATE_OFFLINE";
    cfg.ActiveCtrlState = "TCPIP_STATE_OFFLINE";
    addApiTrace("TCPIP->SOAD", "SoAd_LocalIpAddrAssignmentChg(0, UNASSIGNED)", "Thu hồi IP cục bộ về 0.0.0.0", "WARN");
    addApiTrace("TCPIP->ETHSM", "EthSM_TcpIpModeIndication(0, TCPIP_STATE_OFFLINE)", "Hoàn tất tắt ngăn xếp TcpIp", "OK");
    sim.activeArrows = ["arr_ethsm_tcpip", "arr_tcpip_soad"];
    sim.activeModules = ["MOD_ETHSM", "MOD_TCPIP", "MOD_SOAD"];
    sim.stepNarrative = "<b>TCPIP_STATE_OFFLINE</b>: Ngăn xếp đi qua <code>SHUTDOWN</code>, hủy toàn bộ Socket về <code>CLOSED</code>, xóa hàng đợi ARP và thu hồi IP về <code>UNASSIGNED</code>.";
  } else {
    sim.ctrlState = reqState;
  }

  sim.cCodeSnippet = "/* EthSM -> TcpIp Mode Transition */\nStd_ReturnType ret = TcpIp_RequestComMode(0u, " + reqState + ");\n/* Callback: EthSM_TcpIpModeIndication(0u, " + sim.ctrlState + "); */";
  updateRegistersAfter();
  return "E_OK";
}

function api_TcpIp_RequestIpAddrAssignment(localAddrId, method, opts) {
  const id = Math.max(0, Math.min(2, Number(localAddrId) || 0));
  const la = sim.localAddrs[id];
  const m = method || cfg.TcpIpAssignmentMethod;
  la.assignedMethod = m;

  if (m === "TCPIP_IPADDR_ASSIGNMENT_STATIC") {
    la.ip = id === 0 ? parseIpFromCidr(cfg.TcpIpStaticIpAddress) : la.ip;
    la.state = "TCPIP_IPADDR_STATE_ASSIGNED";
    la.probeStage = "STATIC_BOUND";
    sim.ipAssigned = true;
    sim.dhcpAutoIp = false;
    addApiTrace("TCPIP->SOAD", "SoAd_LocalIpAddrAssignmentChg(" + id + ", ASSIGNED)", "Static IP " + la.ip + " gán tức thời", "OK");
  } else if (m === "TCPIP_IPADDR_ASSIGNMENT_LINKLOCAL_DOIP") {
    la.ip = "169.254.10.50";
    la.state = "TCPIP_IPADDR_STATE_ASSIGNED";
    la.probeStage = "PROBE_ANNOUNCE_OK";
    sim.ipAssigned = true;
    sim.dhcpAutoIp = true;
    addApiTrace("TCPIP->ETHIF", "EthIf_Transmit(ARP Probe & Announce 169.254.10.50)", "RFC 3927 AutoIP (Timeout " + cfg.TcpIpAutoIpInitTimeoutMs + "ms) không xung đột", "OK");
    if (cfg.PersistAutoIpArpToNvM) {
      addApiTrace("TCPIP->NVM", "NvM_WriteBlock(NvM_AutoIpBlock, 169.254.10.50)", "Lưu IP AutoIP vào NvM để khởi động nhanh lần sau", "OK");
    }
    addApiTrace("TCPIP->SOAD", "SoAd_LocalIpAddrAssignmentChg(" + id + ", ASSIGNED)", "AutoIP Link-Local 169.254.10.50 sẵn sàng cho DoIP", "OK");
  } else if (m === "TCPIP_IPADDR_ASSIGNMENT_DHCP") {
    la.ip = "10.0.0.25";
    la.state = "TCPIP_IPADDR_STATE_ASSIGNED";
    la.leaseSec = 3600;
    la.probeStage = "DORA_BOUND";
    sim.ipAssigned = true;
    sim.dhcpAutoIp = true;
    addApiTrace("TCPIP->ETHIF", "DHCP DORA: Discover -> Offer -> Request -> Ack", "Cấp IP động 10.0.0.25/24 (Lease 3600s)", "OK");
    addApiTrace("TCPIP->SOAD", "SoAd_LocalIpAddrAssignmentChg(" + id + ", ASSIGNED)", "DHCP Lease BOUND 10.0.0.25", "OK");
  } else {
    la.ip = "fe80::02aa:bbff:fe00:0050";
    la.state = "TCPIP_IPADDR_STATE_ASSIGNED";
    la.probeStage = "SLAAC_ND";
    sim.ipAssigned = true;
    sim.dhcpAutoIp = true;
    addApiTrace("TCPIP->SOAD", "SoAd_LocalIpAddrAssignmentChg(" + id + ", ASSIGNED)", "IPv6 SLAAC/NDP gán fe80::02aa:bbff:fe00:0050", "OK");
  }

  updateSocketIpsForLocalAddr(id, la.ip);
  sim.lastHeader.ipSrc = la.ip;
  sim.activeArrows = ["arr_soad_tcpip", "arr_tcpip_soad", "arr_tcpip_ethif", "arr_ethif_eth", "arr_eth_bus"];
  sim.activeModules = ["MOD_SOAD", "MOD_TCPIP", "MOD_ETHIF", "MOD_ETH"];
  if (!opts || !opts.silentStep) {
    sim.stepNarrative = "<b>TcpIp_RequestIpAddrAssignment(" + id + ", " + m + ")</b>: Địa chỉ <code>" + la.ip + "</code> đã chuyển sang <code>TCPIP_IPADDR_STATE_ASSIGNED</code> (Bit 5 = 1).";
    sim.cCodeSnippet = "TcpIp_RequestIpAddrAssignment(" + id + "u, " + m + ", NULL_PTR, 0u, NULL_PTR);";
  }
  updateRegistersAfter();
  return "E_OK";
}

function api_TcpIp_ReleaseIpAddrAssignment(localAddrId) {
  const id = Math.max(0, Math.min(2, Number(localAddrId) || 0));
  const la = sim.localAddrs[id];
  la.state = "TCPIP_IPADDR_STATE_UNASSIGNED";
  la.leaseSec = 0;
  la.probeStage = "RELEASED";
  if (id === 0) {
    sim.ipAssigned = false;
    sim.dhcpAutoIp = false;
  }
  addApiTrace("SOAD->TCPIP", "TcpIp_ReleaseIpAddrAssignment(" + id + ")", "SWS_TcpIp_00079: Giải phóng địa chỉ IP " + la.ip, "WARN");
  addApiTrace("TCPIP->SOAD", "SoAd_LocalIpAddrAssignmentChg(" + id + ", TCPIP_IPADDR_STATE_UNASSIGNED)", "Thông báo SoAd địa chỉ đã bị thu hồi", "WARN");
  sim.activeArrows = ["arr_soad_tcpip", "arr_tcpip_soad"];
  sim.activeModules = ["MOD_SOAD", "MOD_TCPIP"];
  sim.stepNarrative = "<b>TcpIp_ReleaseIpAddrAssignment(" + id + ")</b>: Địa chỉ <code>" + la.ip + "</code> bị thu hồi về <code>UNASSIGNED</code> (Bit 5 = 0).";
  sim.cCodeSnippet = "TcpIp_ReleaseIpAddrAssignment(" + id + "u);";
  updateRegistersAfter();
  return "E_OK";
}

// ---------- 2. Socket & TCP FSM APIs ----------

function api_TcpIp_SoAdGetSocket(sockId, protoOverride) {
  if (cfg.PassInvalidSocketOrNullForDet) {
    reportDetError("0x03", "TCPIP_E_INV_ARG", "PassInvalidSocketOrNullForDet=TRUE trong TcpIp_SoAdGetSocket");
    return "E_NOT_OK";
  }
  const s = getSock(sockId);
  const proto = protoOverride || s.proto;
  if (proto === "TCP" && !cfg.TcpIpTcpEnabled) {
    reportDetError("0x03", "TCPIP_E_PROTONOSUPPORT", "TcpIpTcpEnabled == FALSE nên không thể cấp TCP Socket!");
    return "E_NOT_OK";
  }
  s.proto = proto;
  s.state = proto === "UDP" ? "BOUND" : "CLOSED";
  s.rxWindow = Number(cfg.TcpIpTcpReceiveWindowMax) || 4096;
  addApiTrace("SOAD->TCPIP", "TcpIp_SoAdGetSocket(" + s.domain + ", IPPROTO_" + proto + ", &Sock_" + s.socketId + ")", "SWS_TcpIp_00018: Cấp phát tĩnh Sock_" + s.socketId + " cho " + s.owner, "OK");
  sim.activeArrows = ["arr_upper_soad", "arr_soad_tcpip"];
  sim.activeModules = ["MOD_UPPER", "MOD_SOAD", "MOD_TCPIP"];
  sim.stepNarrative = "<b>TcpIp_SoAdGetSocket()</b>: Cấp phát tĩnh <code>Sock_" + s.socketId + " (" + proto + ")</code> cho " + s.owner + " (không dùng malloc/heap).";
  sim.cCodeSnippet = "TcpIp_SocketIdType sockId;\nTcpIp_SoAdGetSocket(" + s.domain + ", TCPIP_IPPROTO_" + proto + ", &sockId); /* Sock_" + s.socketId + " */";
  updateRegistersAfter();
  return "E_OK";
}

function api_TcpIp_Bind(sockId, localAddrId, port) {
  if (cfg.PassInvalidSocketOrNullForDet) {
    reportDetError("0x05", "TCPIP_E_ADDRINUSE", "Giả lập Bind() sai SocketId hoặc trùng Port 13400/30490 (DET 170)");
    return "E_NOT_OK";
  }
  const s = getSock(sockId);
  const laId = localAddrId !== undefined ? Number(localAddrId) : s.localAddrId;
  const la = sim.localAddrs[laId] || sim.localAddrs[0];
  s.localAddrId = laId;
  s.localIp = la.ip;
  if (port !== undefined && port !== null) s.localPort = Number(port);
  if (s.proto === "UDP") s.state = "BOUND";

  addApiTrace("SOAD->TCPIP", "TcpIp_Bind(Sock_" + s.socketId + ", LocalAddr_" + laId + ", &Port=" + s.localPort + ")", "SWS_TcpIp_00015: Gắn IP " + s.localIp + ":" + s.localPort, "OK");
  if (la.addrType === "MULTICAST" || s.isMulticast) {
    la.igmpJoined = true;
    addApiTrace("TCPIP->ETHIF", "EthIf_UpdatePhysAddrFilter(0, 01:00:5E:60:E0:F5, ETH_ADD_TO_FILTER)", "Mở bộ lọc MAC Multicast & gửi IGMPv2 Membership Report (224.224.224.245)", "OK");
    sim.activeArrows = ["arr_soad_tcpip", "arr_tcpip_ethif", "arr_ethif_eth", "arr_eth_bus"];
    sim.activeModules = ["MOD_SOAD", "MOD_TCPIP", "MOD_ETHIF", "MOD_ETH"];
  } else {
    sim.activeArrows = ["arr_soad_tcpip"];
    sim.activeModules = ["MOD_SOAD", "MOD_TCPIP"];
  }
  sim.stepNarrative = "<b>TcpIp_Bind(Sock_" + s.socketId + ")</b>: Gắn Socket vào <code>" + s.localIp + ":" + s.localPort + "</code>" + (s.isMulticast ? " kèm <code>IGMPv2 Join + EthIf_UpdatePhysAddrFilter()</code>." : ".");
  sim.cCodeSnippet = "uint16 port = " + s.localPort + "u;\nTcpIp_Bind(" + s.socketId + "u, " + laId + "u, &port);";
  updateRegistersAfter();
  return "E_OK";
}

function api_TcpIp_TcpConnect(sockId, remoteEndpointStr) {
  const s = getSock(sockId);
  if (cfg.PassInvalidSocketOrNullForDet) {
    reportDetError("0x06", "TCPIP_E_INV_SOCK_ID", "SocketId = 99 không tồn tại trong TcpIp_SocketTable (DET 170)");
    return "E_NOT_OK";
  }
  if (!cfg.TcpIpTcpEnabled) {
    reportDetError("0x06", "TCPIP_E_PROTONOSUPPORT", "TcpIpTcpEnabled đang tắt");
    return "E_NOT_OK";
  }
  if (sim.ctrlState !== "TCPIP_STATE_ONLINE" || !isIpAssignedForSocket(s)) {
    addApiTrace("SOAD->TCPIP", "TcpIp_TcpConnect(Sock_" + s.socketId + ")", "Từ chối vì kênh không ở ONLINE hoặc IP chưa ASSIGNED", "ERR");
    return "E_NOT_OK";
  }
  const ep = parseRemoteEndpoint(remoteEndpointStr || cfg.RemoteIpAndPortEndpoint, s.remoteIp, s.remotePort);
  s.remoteIp = ep.ip;
  s.remotePort = ep.port;
  const mss = getMssFromMtu();

  if (cfg.SimulateNetworkFaultForDem) {
    s.state = "CLOSED";
    setTcpFlags({ rst: 1, ack: 1 });
    sim.lastHeader = Object.assign({}, sim.lastHeader, {
      dir: "RX (FAULT)", etherType: "0x0800", proto: "TCP", ipSrc: s.remoteIp, ipDst: s.localIp,
      srcPort: s.remotePort, dstPort: s.localPort, flagsStr: "RST+ACK", mss: mss,
      note: "Đối tác trả RST+ACK từ chối kết nối -> Báo DEM TCPIP_E_CONNREFUSED!"
    });
    addApiTrace("SOAD->TCPIP", "TcpIp_TcpConnect(Sock_" + s.socketId + ", " + ep.ip + ":" + ep.port + ")", "Gửi SYN -> Nhận RST+ACK từ đối tác!", "ERR");
    addApiTrace("TCPIP->SOAD", "SoAd_TcpIpEvent(Sock_" + s.socketId + ", TCPIP_TCP_RESET)", "Thông báo kết nối bị từ chối", "ERR");
    reportDemEvent("TCPIP_E_CONNREFUSED", "FAILED", "Đối tác " + ep.ip + ":" + ep.port + " trả cờ RST+ACK (SimulateNetworkFaultForDem=TRUE)");
    sim.activeArrows = ["arr_soad_tcpip", "arr_tcpip_diag", "arr_tcpip_soad"];
    sim.activeModules = ["MOD_SOAD", "MOD_TCPIP", "MOD_DIAG"];
    sim.stepNarrative = "<b>Lỗi kết nối TCP (DEM TCPIP_E_CONNREFUSED)</b>: Đối tác trả về cờ <code>RST+ACK</code> (Bit 2 = 1). <code>TcpIp</code> gọi <code>SoAd_TcpIpEvent(TCPIP_TCP_RESET)</code> và <code>Dem_SetEventStatus()</code>.";
    updateRegistersAfter();
    return "E_NOT_OK";
  }

  s.state = "SYN_SENT";
  s.seqNum = 0x1000;
  setTcpFlags({ syn: 1 });
  sim.zeroCopyUsed = Boolean(cfg.TcpIpBufferMemoryPoolZeroCopy);
  sim.counters.txOk++;
  sim.lastHeader = Object.assign({}, sim.lastHeader, {
    dir: "TX", vlanId: 10, pcp: s.framePrio, etherType: "0x0800", proto: "TCP",
    ipSrc: s.localIp, ipDst: s.remoteIp, ttl: s.ttl, df: 1, mf: 0, fragOff: 0,
    srcPort: s.localPort, dstPort: s.remotePort, flagsStr: "SYN",
    seq: hex32(s.seqNum), ack: hex32(0), win: s.rxWindow, mss: mss, payloadBytes: 0,
    payloadHex: "Option: MSS=" + mss + "B",
    note: "TCP 3-Way Step 1: Gửi SYN (ISN=0x1000, MSS=" + mss + ") tới " + s.remoteIp + ":" + s.remotePort
  });
  sim.flagDf = 1;
  sim.flagMf = 0;
  addApiTrace("SOAD->TCPIP", "TcpIp_TcpConnect(Sock_" + s.socketId + ", " + ep.ip + ":" + ep.port + ")", "SWS_TcpIp_00022: CLOSED -> SYN_SENT (MSS=" + mss + ")", "OK");
  addApiTrace("TCPIP->ETHIF", "EthIf_Transmit(TCP SYN Seq=0x1000, MSS=" + mss + ")", "Truyền SYN bước 1 bắt tay 3 bước", "OK");
  sim.activeArrows = ["arr_soad_tcpip", "arr_tcpip_ethif", "arr_ethif_eth", "arr_eth_bus"];
  sim.activeModules = ["MOD_SOAD", "MOD_TCPIP", "MOD_ETHIF", "MOD_ETH"];
  sim.stepNarrative = "<b>TcpIp_TcpConnect(Sock_" + s.socketId + ")</b>: Socket chuyển <code>CLOSED ➔ SYN_SENT</code>, bật cờ <b>SYN (Bit 1 = 1)</b>, quảng bá <code>MSS = " + mss + "B</code> (từ MTU " + cfg.TcpIpCtrlMtu + "B). Hãy bơm <code>TCP SYN+ACK</code> để hoàn tất!";
  sim.cCodeSnippet = "TcpIp_SockAddrInetType rem = { TCPIP_AF_INET, " + ep.port + "u, { IP(" + ep.ip + ") } };\nTcpIp_TcpConnect(" + s.socketId + "u, (TcpIp_SockAddrType*)&rem);";
  updateRegistersAfter();
  return "E_OK";
}

function api_TcpIp_TcpListen(sockId, maxChannels) {
  const s = getSock(sockId);
  s.state = "LISTEN";
  s.tlsAssigned = s.tlsAssigned || Boolean(cfg.TcpIpTlsConnectionEnabled);
  setTcpFlags({});
  addApiTrace("SOAD->TCPIP", "TcpIp_TcpListen(Sock_" + s.socketId + ", MaxCh=" + (maxChannels || 2) + ")", "SWS_TcpIp_00023: Mở cổng thụ động LISTEN tại Port " + s.localPort, "OK");
  sim.activeArrows = ["arr_soad_tcpip"];
  sim.activeModules = ["MOD_SOAD", "MOD_TCPIP"];
  sim.stepNarrative = "<b>TcpIp_TcpListen(Sock_" + s.socketId + ")</b>: ECU mở cổng Server tại <code>" + s.localIp + ":" + s.localPort + "</code> ở trạng thái <code>LISTEN</code> chờ gói <code>SYN</code> từ Tester.";
  sim.cCodeSnippet = "TcpIp_TcpListen(" + s.socketId + "u, " + (maxChannels || 2) + "u);";
  updateRegistersAfter();
  return "E_OK";
}

function api_ServerAcceptIncomingSyn(listenSockId, childSockId, badCert) {
  const ls = getSock(listenSockId);
  const cs = getSock(childSockId !== undefined ? childSockId : 0);
  ls.state = "LISTEN";
  cs.state = "ESTABLISHED";
  cs.remoteIp = "192.168.10.100";
  cs.remotePort = 51234;
  cs.seqNum = 0x5001;
  cs.ackNum = 0x1001;
  setTcpFlags({ ack: 1 });
  sim.counters.rxOk++;
  sim.counters.txOk++;
  addApiTrace("ETHIF->TCPIP", "TcpIp_RxIndication(SYN -> Port " + ls.localPort + ")", "Nhận SYN tạo kết nối con Sock_" + cs.socketId + " (LISTEN -> SYN_RCVD)", "OK");
  addApiTrace("TCPIP->ETHIF", "EthIf_Transmit(SYN+ACK)", "Trả SYN+ACK & nhận ACK bước 3 -> ESTABLISHED", "OK");
  if ((cs.tlsAssigned || cfg.TcpIpTlsConnectionEnabled) && !badCert) {
    cs.tlsHandshakeDone = true;
    sim.tlsActive = true;
    sim.counters.tlsSessions++;
    addApiTrace("TCPIP->SEC", "KeyM_VerifyCertificate() & Csm_KeyExchangeCalcSecret()", "Hoàn tất AUTOSAR TLS 1.3 trên Socket con Sock_" + cs.socketId, "OK");
    sim.activeArrows = ["arr_eth_bus", "arr_ethif_tcpip", "arr_tcpip_sec", "arr_tcpip_soad"];
    sim.activeModules = ["MOD_ETH", "MOD_ETHIF", "MOD_TCPIP", "MOD_SEC", "MOD_SOAD"];
  } else {
    sim.activeArrows = ["arr_eth_bus", "arr_ethif_tcpip", "arr_tcpip_soad"];
    sim.activeModules = ["MOD_ETH", "MOD_ETHIF", "MOD_TCPIP", "MOD_SOAD"];
  }
  addApiTrace("TCPIP->SOAD", "SoAd_TcpAccepted(Listen=Sock_" + ls.socketId + ", Connected=Sock_" + cs.socketId + ")", "SWS_TcpIp_00034: Giao Socket kết nối mới cho SoAd/DoIP!", "OK");
  sim.lastHeader = Object.assign({}, sim.lastHeader, {
    dir: "RX/TX (ACCEPT)", etherType: "0x0800", proto: "TCP", ipSrc: cs.remoteIp, ipDst: cs.localIp,
    srcPort: cs.remotePort, dstPort: ls.localPort, flagsStr: "SYN -> SYN+ACK -> ACK",
    seq: hex32(cs.seqNum), ack: hex32(cs.ackNum), win: cs.rxWindow, mss: getMssFromMtu(),
    note: "Server Sock_" + ls.socketId + " chấp nhận kết nối mới -> Cấp Sock_" + cs.socketId + " qua SoAd_TcpAccepted()"
  });
  sim.stepNarrative = "<b>Server Accept (SoAd_TcpAccepted)</b>: Server <code>Sock_" + ls.socketId + "</code> nhận <code>SYN</code>, phản hồi <code>SYN+ACK</code> và giao kết nối con <code>Sock_" + cs.socketId + " (ESTABLISHED)</code> cho <code>SoAd</code>.";
  sim.cCodeSnippet = "Std_ReturnType SoAd_TcpAccepted(TcpIp_SocketIdType SocketId /* " + ls.socketId + " */, TcpIp_SocketIdType SocketIdConnected /* " + cs.socketId + " */, const TcpIp_SockAddrType* RemoteAddrPtr);";
  updateRegistersAfter();
  return "E_OK";
}

function api_RunTlsHandshake(sockId, badCert) {
  const s = getSock(sockId);
  if (badCert) {
    s.tlsHandshakeDone = false;
    s.state = "CLOSED";
    sim.tlsActive = false;
    sim.errFlag = true;
    setTcpFlags({ rst: 1, ack: 1 });
    addApiTrace("TCPIP->SEC", "KeyM_VerifyCertificate(X.509)", "LỖI: Chứng chỉ X.509 hết hạn / sai chữ ký CA!", "ERR");
    addApiTrace("TCPIP->ETHIF", "EthIf_Transmit(TLS Alert: Bad Certificate + TCP RST)", "Ngắt tức thời kênh không an toàn (UN R155)", "ERR");
    addApiTrace("TCPIP->SOAD", "SoAd_TcpIpEvent(Sock_" + s.socketId + ", TCPIP_TLS_HANDSHAKE_FAILED)", "Cấm không cho DoIP truyền dữ liệu!", "ERR");
    reportIdsmEvent("TCPIP_IDSM_SEV_TLS_CERT_INVALID", "Chứng chỉ TLS X.509 không hợp lệ trên Socket " + s.socketId);
    sim.activeArrows = ["arr_tcpip_sec", "arr_tcpip_ethif", "arr_tcpip_diag", "arr_tcpip_soad"];
    sim.activeModules = ["MOD_TCPIP", "MOD_SEC", "MOD_ETHIF", "MOD_DIAG", "MOD_SOAD"];
    sim.lastHeader = Object.assign({}, sim.lastHeader, {
      dir: "TX (TLS ALERT)", proto: "TCP/TLS", flagsStr: "RST+ACK",
      payloadHex: "15 03 03 00 02 02 2A (TLS Alert Bad Cert)",
      note: "KeyM từ chối X.509 Certificate -> Gửi TLS Alert + RST, kích hoạt IdsM!"
    });
    sim.stepNarrative = "<b>Xác thực Chứng chỉ TLS Thất Bại!</b> <code>KeyM_VerifyCertificate()</code> trả lỗi ➔ gửi <code>TLS Alert (Bad Certificate)</code> + <code>TCP RST</code>, không bao giờ chuyển lên <code>DoIP</code>.";
    updateRegistersAfter();
    return "E_NOT_OK";
  }
  s.tlsAssigned = true;
  s.tlsHandshakeDone = true;
  s.state = "ESTABLISHED";
  sim.tlsActive = true;
  sim.counters.tlsSessions++;
  setTcpFlags({ psh: 1, ack: 1 });
  addApiTrace("TCPIP->ETHIF", "TLS 1.3 ClientHello <-> ServerHello + Cert", "Trao đổi thông số mật mã TLS_AES_128_GCM_SHA256", "OK");
  addApiTrace("TCPIP->SEC", "KeyM_VerifyCertificate() -> E_OK", "Xác thực chuỗi chứng chỉ X.509 ECU/Tester hợp lệ", "OK");
  addApiTrace("TCPIP->SEC", "Csm_KeyExchangeCalcSecret(ECDHE P-256)", "Sinh khóa phiên AEAD thành công", "OK");
  addApiTrace("TCPIP->SOAD", "SoAd_TcpConnected(Sock_" + s.socketId + ") + TCPIP_TLS_HANDSHAKE_SUCCEEDED", "Kênh TLS sẵn sàng mã hóa DoIP Port 3496 (Bit 1 = 1)", "OK");
  sim.activeArrows = ["arr_tcpip_sec", "arr_tcpip_ethif", "arr_eth_bus", "arr_tcpip_soad"];
  sim.activeModules = ["MOD_TCPIP", "MOD_SEC", "MOD_ETHIF", "MOD_SOAD"];
  sim.lastHeader = Object.assign({}, sim.lastHeader, {
    dir: "TLS HANDSHAKE", proto: "TCP/TLS", srcPort: s.localPort, dstPort: s.remotePort, flagsStr: "PSH+ACK (TLS)",
    payloadHex: "16 03 03 ... (TLS 1.3 Finished)",
    note: "AUTOSAR TLS 1.3 Handshake hoàn tất qua KeyM & Csm — Bit 1 (TLS_ACTV) = 1!"
  });
  sim.stepNarrative = "<b>AUTOSAR TLS 1.3 Handshake Thành Công!</b> Đã xác thực X.509 via <code>KeyM</code> & tính khóa phiên via <code>Csm</code>. <b>Bit 1 (TLS_SEC_ACTV) = 1</b>!";
  sim.cCodeSnippet = "KeyM_VerifyCertificate(CertId, &verifyRes);\nCsm_KeyExchangeCalcSecret(JobId, PartnerPubPtr, PubLen);\n/* SoAd_TcpConnected(" + s.socketId + "u); */";
  updateRegistersAfter();
  return "E_OK";
}

function api_TcpIp_TcpTransmit(sockId, payloadLen, opts) {
  const s = getSock(sockId);
  if (cfg.PassInvalidSocketOrNullForDet) {
    reportDetError("0x13", "TCPIP_E_PARAM_POINTER", "Truyền DataPtr=NULL nhưng ForceRetrieve=FALSE (DET Module 170)");
    return "E_NOT_OK";
  }
  if (sim.ctrlState !== "TCPIP_STATE_ONLINE") {
    addApiTrace("SOAD->TCPIP", "TcpIp_TcpTransmit(Sock_" + s.socketId + ")", "Bị chặn vì Controller đang ở " + sim.ctrlState, "WARN");
    return "E_NOT_OK";
  }
  if (s.state !== "ESTABLISHED") {
    reportDetError("0x13", "TCPIP_E_NOTCONN", "Socket Sock_" + s.socketId + " chưa ở ESTABLISHED (hiện tại: " + s.state + ")");
    return "E_NOT_OK";
  }

  const len = Math.max(1, Number(payloadLen || cfg.TxPayloadByteLength) || 64);
  const mss = getMssFromMtu();

  if (cfg.TcpIpTcpNagleEnabled && len < mss && s.txPendingAckBytes > 0 && !(opts && opts.flush)) {
    sim.nagleBufferBytes += len;
    setTcpFlags({ ack: 1 });
    addApiTrace("SOAD->TCPIP", "TcpIp_TcpTransmit(Sock_" + s.socketId + ", Len=" + len + ")", "NAGLE HOLD: Chưa có ACK gói trước nên gom " + len + "B vào Tx Buffer (Tổng gom=" + sim.nagleBufferBytes + "B, PSH=0)", "WARN");
    sim.activeArrows = ["arr_soad_tcpip"];
    sim.activeModules = ["MOD_SOAD", "MOD_TCPIP"];
    sim.lastHeader = Object.assign({}, sim.lastHeader, {
      dir: "BUFFERED (NAGLE)", proto: "TCP", flagsStr: "HOLD (Nagle)", payloadBytes: sim.nagleBufferBytes,
      note: "Thuật toán Nagle (TcpIpTcpNagleEnabled=TRUE) đang giữ gói nhỏ chờ đủ MSS hoặc nhận ACK trước!"
    });
    sim.stepNarrative = "<b>Nagle Algorithm đang gom gói!</b> Gói nhỏ <code>" + len + "B &lt; MSS (" + mss + "B)</code> được giữ lại chờ <code>ACK</code> gói trước để tránh Tinygram.";
    updateRegistersAfter();
    return "E_OK";
  }

  const totalSend = len + sim.nagleBufferBytes;
  sim.nagleBufferBytes = 0;
  const segCount = Math.ceil(totalSend / mss);
  const copyCall = cfg.ForceCopyTxDataViaSoAd;
  const zeroCopy = Boolean(cfg.TcpIpBufferMemoryPoolZeroCopy);
  sim.zeroCopyUsed = zeroCopy;
  sim.arpHit = true;

  let wireHex = cfg.TxRxPayloadPreviewHex;
  if (s.tlsHandshakeDone || (cfg.TcpIpTlsConnectionEnabled && s.tlsAssigned)) {
    sim.tlsActive = true;
    wireHex = "17 03 03 " + hexByte(totalSend >> 8).slice(2) + " " + hexByte(totalSend & 0xFF).slice(2) + " [Csm_AEAD_Ciphertext]";
    addApiTrace("TCPIP->SEC", "Csm_AEADEncrypt(JobId, Plain=" + totalSend + "B -> TLS Record)", "Mã hóa AES-128-GCM trước khi xuống DMA", "OK");
  }

  if (zeroCopy) {
    addApiTrace("TCPIP->ETHIF", "EthIf_ProvideTxBuffer(0, 0x0800, PCP=" + s.framePrio + ", Len=" + (totalSend + 40) + ")", "Cấp phát Zero-Copy DMA RAM (Bit 2 = 1)", "OK");
  }
  if (copyCall) {
    addApiTrace("TCPIP->SOAD", "SoAd_CopyTxData(Sock_" + s.socketId + ", DmaBufPtr, " + totalSend + ")", "ForceRetrieve=TRUE: SoAd chép thẳng Payload vào DMA Buffer", "OK");
  }

  s.unackedSeq = s.seqNum;
  s.unackedLen = totalSend;
  s.txPendingAckBytes += totalSend;
  s.rtxCount = 0;
  s.rtoRemainingMs = Number(cfg.TcpIpTcpRetransmissionTimeoutMs) || 200;
  s.seqNum += totalSend;
  setTcpFlags({ psh: 1, ack: 1 });
  sim.flagDf = 1;
  sim.flagMf = 0;

  if (sim.dropNextTxForRtxTest) {
    sim.dropNextTxForRtxTest = false;
    addApiTrace("BUS", "Gói TCP Seq=" + hex32(s.unackedSeq) + " (" + totalSend + "B) BỊ RƠI TRÊN DÂY MẠNG!", "RTO=" + s.rtoRemainingMs + "ms bắt đầu đếm lùi!", "ERR");
    sim.activeArrows = ["arr_soad_tcpip", "arr_tcpip_ethif", "arr_ethif_eth"];
  } else {
    sim.counters.txOk += segCount;
    addApiTrace("ETHIF->ETH", "EthIf_Transmit(TCP PSH+ACK, Segs=" + segCount + ", MSS=" + mss + ", Len=" + totalSend + "B)", "Đã phát " + segCount + " đoạn TCP ra Ethernet Bus", "OK");
    sim.activeArrows = ["arr_upper_soad", "arr_soad_tcpip", "arr_tcpip_ethif", "arr_ethif_eth", "arr_eth_bus"];
    if (sim.tlsActive) sim.activeArrows.push("arr_tcpip_sec");
  }

  sim.activeModules = sim.tlsActive ? ["MOD_UPPER", "MOD_SOAD", "MOD_TCPIP", "MOD_SEC", "MOD_ETHIF", "MOD_ETH"] : ["MOD_UPPER", "MOD_SOAD", "MOD_TCPIP", "MOD_ETHIF", "MOD_ETH"];
  sim.lastHeader = Object.assign({}, sim.lastHeader, {
    dir: "TX", vlanId: 10, pcp: s.framePrio, etherType: "0x0800", proto: sim.tlsActive ? "TCP/TLS" : "TCP",
    ipSrc: s.localIp, ipDst: s.remoteIp, ttl: s.ttl, df: 1, mf: 0, fragOff: 0, ipLen: Math.min(totalSend, mss) + 40,
    srcPort: s.localPort, dstPort: s.remotePort, flagsStr: "PSH+ACK",
    seq: hex32(s.unackedSeq), ack: hex32(s.ackNum), win: s.rxWindow, mss: mss,
    payloadBytes: totalSend, payloadHex: wireHex,
    note: "TCP Transmit " + totalSend + "B chia thành " + segCount + " phân đoạn (MSS=" + mss + "B)" + (copyCall ? " qua SoAd_CopyTxData()" : "")
  });
  sim.stepNarrative = "<b>TcpIp_TcpTransmit(" + totalSend + "B)</b>: Đã phân đoạn theo <code>MSS = " + mss + "B</code> (" + segCount + " đoạn), bật <b>PSH+ACK</b>" + (zeroCopy ? " & <b>Zero-Copy DMA</b>" : "") + ".";
  sim.cCodeSnippet = "TcpIp_TcpTransmit(" + s.socketId + "u, " + (copyCall ? "NULL_PTR" : "TxDataBuf") + ", " + len + "u, " + (copyCall ? "TRUE" : "FALSE") + "); /* RTO=" + cfg.TcpIpTcpRetransmissionTimeoutMs + "ms */";
  updateRegistersAfter();
  return "E_OK";
}

// ---------- 3. UDP, ARP Queue & IPv4 Fragmentation ----------

function api_TcpIp_UdpTransmit(sockId, payloadLen, remoteEndpointStr, opts) {
  const s = getSock(sockId !== undefined ? sockId : 1);
  if (cfg.PassInvalidSocketOrNullForDet) {
    reportDetError("0x12", "TCPIP_E_PARAM_POINTER", "DataPtr == NULL_PTR sai ngữ cảnh trong TcpIp_UdpTransmit (DET 170)");
    return "E_NOT_OK";
  }
  if (sim.ctrlState !== "TCPIP_STATE_ONLINE") {
    sim.errFlag = true;
    addApiTrace("SOAD->TCPIP", "TcpIp_UdpTransmit(Sock_" + s.socketId + ")", "BỊ CHẶN vì kênh đang ở " + sim.ctrlState + " (tránh nghẽn DMA Buffer)!", "ERR");
    sim.activeArrows = ["arr_soad_tcpip"];
    sim.activeModules = ["MOD_SOAD", "MOD_TCPIP"];
    sim.stepNarrative = "<b>Truyền UDP Bị Chặn!</b> Ngăn xếp đang ở <code>" + sim.ctrlState + "</code> — không được phép phát khung xuống DMA khi chưa <code>ONLINE</code>.";
    updateRegistersAfter();
    return "E_NOT_OK";
  }

  const ep = parseRemoteEndpoint(remoteEndpointStr || (s.socketId === 2 ? "224.224.224.245:30490" : cfg.RemoteIpAndPortEndpoint), s.remoteIp, s.remotePort);
  s.remoteIp = ep.ip;
  s.remotePort = ep.port;
  const len = Math.max(1, Number(payloadLen || cfg.TxPayloadByteLength) || 64);

  if (!resolveArpOrQueue(s, len, s.framePrio, cfg.TxRxPayloadPreviewHex)) {
    sim.stepNarrative = "<b>ARP Cache Miss cho " + s.remoteIp + "!</b> Bit 3 (ARP_HIT) = 0. Gói UDP (" + len + "B) được giữ tại <code>ArpPendingQueue</code> và đã phát Broadcast <code>ARP Request (0x0806)</code>. Hãy bơm <code>ARP Reply</code> để xả hàng đợi!";
    sim.cCodeSnippet = "/* ARP Miss -> ArpPendingQueue holds UDP(" + len + "B) */\nTcpIp_UdpTransmit(" + s.socketId + "u, NULL_PTR, &RemoteAddr, " + len + "u);";
    return "TCPIP_OK";
  }

  const mtu = Math.max(256, Number(cfg.TcpIpCtrlMtu) || 1500);
  const ipTotalLen = len + 8 + 20;
  setTcpFlags({});
  sim.flagDf = cfg.SetIpDontFragmentFlagDf ? 1 : 0;
  sim.lastFragList = [];

  if (ipTotalLen > mtu) {
    if (cfg.SetIpDontFragmentFlagDf) {
      sim.flagMf = 0;
      sim.errFlag = true;
      addApiTrace("TCPIP", "IPv4 Fragment Check FAILED: Len=" + ipTotalLen + "B > MTU=" + mtu + "B với cờ DF=1!", "Bit 7 IP_DF_FLAG = 1 cấm cắt mảnh -> Khóa truyền gói UDP!", "ERR");
      reportDetError("0x12", "TCPIP_E_MSGSIZE", "Gói UDP " + ipTotalLen + "B vượt MTU " + mtu + "B trong khi SetIpDontFragmentFlagDf = TRUE");
      sim.lastHeader = Object.assign({}, sim.lastHeader, {
        dir: "BLOCKED (DF=1)", proto: "UDP", ipSrc: s.localIp, ipDst: s.remoteIp, df: 1, mf: 0, ipLen: ipTotalLen,
        note: "BỊ CHẶN vì IP_DF=1 & " + ipTotalLen + "B > MTU " + mtu + "B! Tắt DF để cho phép phân mảnh."
      });
      sim.stepNarrative = "<b>Truyền UDP Bị Khóa Do Cờ DF=1!</b> Tổng dài IP = <code>" + ipTotalLen + "B &gt; MTU (" + mtu + "B)</code> mà cờ <b>Don't Fragment (Bit 7)</b> đang bật. Tắt <code>SetIpDontFragmentFlagDf</code> để cho phép cắt mảnh!";
      updateRegistersAfter();
      return "E_NOT_OK";
    }
    if (!cfg.TcpIpIpReassemblyAndFragEnabled) {
      sim.errFlag = true;
      addApiTrace("TCPIP", "IPv4 Fragmentation Disabled (TcpIpIpReassemblyAndFragEnabled=FALSE)", "Không thể truyền gói > MTU", "ERR");
      updateRegistersAfter();
      return "E_NOT_OK";
    }

    const maxFragPayload = Math.floor((mtu - 20) / 8) * 8;
    const totalIpPayload = len + 8;
    let offsetBytes = 0;
    let idx = 1;
    while (offsetBytes < totalIpPayload) {
      const chunk = Math.min(maxFragPayload, totalIpPayload - offsetBytes);
      const isLast = (offsetBytes + chunk) >= totalIpPayload;
      sim.lastFragList.push({
        idx: idx++,
        id: "0x4A12",
        ipTotalLen: chunk + 20,
        payloadLen: chunk,
        mf: isLast ? 0 : 1,
        fragOffset: Math.floor(offsetBytes / 8),
        offsetBytes: offsetBytes
      });
      offsetBytes += chunk;
    }
    sim.flagMf = 1;
    sim.counters.fragmentsSent += sim.lastFragList.length;
    sim.counters.txOk += sim.lastFragList.length;
    sim.zeroCopyUsed = Boolean(cfg.TcpIpBufferMemoryPoolZeroCopy);

    sim.lastFragList.forEach(function (f) {
      addApiTrace("TCPIP->ETHIF", "EthIf_Transmit(IPv4 Frag#" + f.idx + ": " + f.ipTotalLen + "B, MF=" + f.mf + ", Off=" + f.fragOffset + "×8=" + f.offsetBytes + "B)", "Cắt mảnh IPv4 ID=" + f.id + " qua MTU " + mtu + "B", "OK");
    });

    const f0 = sim.lastFragList[0];
    sim.lastHeader = Object.assign({}, sim.lastHeader, {
      dir: "TX (FRAG ×" + sim.lastFragList.length + ")", vlanId: 10, pcp: s.framePrio, etherType: "0x0800", proto: "UDP",
      ipSrc: s.localIp, ipDst: s.remoteIp, ttl: s.ttl, df: 0, mf: 1, fragOff: f0.fragOffset, fragId: f0.id, ipLen: ipTotalLen,
      srcPort: s.localPort, dstPort: s.remotePort, flagsStr: "IP_FRAG_MF=1", payloadBytes: len,
      payloadHex: cfg.TxRxPayloadPreviewHex,
      note: "IPv4 Fragmentation: Cắt " + ipTotalLen + "B thành " + sim.lastFragList.length + " mảnh (MTU=" + mtu + "B, ID=" + f0.id + ")"
    });
    sim.activeArrows = ["arr_upper_soad", "arr_soad_tcpip", "arr_tcpip_ethif", "arr_ethif_eth", "arr_eth_bus"];
    sim.activeModules = ["MOD_UPPER", "MOD_SOAD", "MOD_TCPIP", "MOD_ETHIF", "MOD_ETH"];
    sim.stepNarrative = "<b>IPv4 Fragmentation Thành Công!</b> Gói UDP <code>" + len + "B</code> vượt MTU <code>" + mtu + "B</code> đã được cắt thành <b>" + sim.lastFragList.length + " mảnh</b> (Mảnh 1: <code>MF=1, Off=0</code>; Mảnh cuối: <code>MF=0</code>).";
    sim.cCodeSnippet = "/* DF=0: IPv4 cuts " + ipTotalLen + "B into " + sim.lastFragList.length + " fragments (MTU=" + mtu + ") */\nTcpIp_UdpTransmit(" + s.socketId + "u, NULL_PTR, &RemoteAddr, " + len + "u);";
    updateRegistersAfter();
    return "E_OK";
  }

  // Normal single UDP transmission
  sim.flagMf = 0;
  sim.zeroCopyUsed = Boolean(cfg.TcpIpBufferMemoryPoolZeroCopy);
  sim.counters.txOk++;
  if (sim.zeroCopyUsed) {
    addApiTrace("TCPIP->ETHIF", "EthIf_ProvideTxBuffer(0, 0x0800, PCP=" + s.framePrio + ", Len=" + ipTotalLen + ")", "Zero-Copy DMA Buffer cấp phát thành công", "OK");
  }
  if (cfg.ForceCopyTxDataViaSoAd) {
    addApiTrace("TCPIP->SOAD", "SoAd_CopyTxData(Sock_" + s.socketId + ", BufPtr, " + len + ")", "SoAd ghi thẳng Payload vào DMA Buffer", "OK");
  }
  addApiTrace("ETHIF->ETH", "EthIf_Transmit(UDP " + s.localIp + ":" + s.localPort + " -> " + s.remoteIp + ":" + s.remotePort + ", Len=" + len + "B)", "Truyền UDP thành công", "OK");

  sim.lastHeader = Object.assign({}, sim.lastHeader, {
    dir: "TX", vlanId: 10, pcp: s.framePrio, etherType: "0x0800", proto: "UDP",
    ipSrc: s.localIp, ipDst: s.remoteIp, ttl: s.ttl, df: sim.flagDf, mf: 0, fragOff: 0, ipLen: ipTotalLen,
    srcPort: s.localPort, dstPort: s.remotePort, flagsStr: s.isMulticast ? "UDP_MCAST" : "UDP_UCAST",
    payloadBytes: len, payloadHex: cfg.TxRxPayloadPreviewHex,
    note: "Truyền UDP (" + len + "B) tới " + s.remoteIp + ":" + s.remotePort + " qua Zero-Copy"
  });
  sim.activeArrows = ["arr_upper_soad", "arr_soad_tcpip", "arr_tcpip_ethif", "arr_ethif_eth", "arr_eth_bus"];
  sim.activeModules = ["MOD_UPPER", "MOD_SOAD", "MOD_TCPIP", "MOD_ETHIF", "MOD_ETH"];
  sim.stepNarrative = "<b>TcpIp_UdpTransmit(Sock_" + s.socketId + ", " + len + "B)</b>: Tra <code>ARP Cache HIT</code> (Bit 3 = 1), cấp Buffer <code>Zero-Copy</code> (Bit 2 = 1) và phát qua VLAN PCP = " + s.framePrio + ".";
  sim.cCodeSnippet = "TcpIp_UdpTransmit(" + s.socketId + "u, " + (cfg.ForceCopyTxDataViaSoAd ? "NULL_PTR" : "UdpBuf") + ", &RemoteAddr, " + len + "u);";
  updateRegistersAfter();
  return "E_OK";
}

function drainArpPendingQueue(resolvedIp) {
  if (!sim.arpPendingQueue.length) return 0;
  const remaining = [];
  let flushed = 0;
  sim.arpPendingQueue.forEach(function (pkt) {
    if (pkt.dstIp === resolvedIp) {
      flushed++;
      const s = getSock(pkt.sockId);
      sim.zeroCopyUsed = Boolean(cfg.TcpIpBufferMemoryPoolZeroCopy);
      sim.counters.txOk++;
      addApiTrace("TCPIP->ETHIF", "EthIf_ProvideTxBuffer(0, 0x0800, PCP=" + pkt.framePrio + ", Len=" + (pkt.len + 28) + ")", "Xả ArpPendingQueue cho " + pkt.dstIp + "!", "OK");
      if (cfg.ForceCopyTxDataViaSoAd) {
        addApiTrace("TCPIP->SOAD", "SoAd_CopyTxData(Sock_" + s.socketId + ", DmaPtr, " + pkt.len + ")", "Chép dữ liệu UDP nằm chờ vào DMA Buffer", "OK");
      }
      addApiTrace("ETHIF->ETH", "EthIf_Transmit(UDP -> " + pkt.dstIp + ", Len=" + pkt.len + "B)", "Gói UDP đã thoát hàng đợi và phát ra Ethernet Bus!", "OK");
      sim.lastHeader = Object.assign({}, sim.lastHeader, {
        dir: "TX (ARP DRAINED)", proto: pkt.proto, ipSrc: s.localIp, ipDst: pkt.dstIp,
        srcPort: s.localPort, dstPort: s.remotePort, payloadBytes: pkt.len, payloadHex: pkt.payloadHex,
        note: "Đã nhận ARP Reply! Xả " + flushed + " gói từ ArpPendingQueue & truyền Zero-Copy thành công."
      });
    } else {
      remaining.push(pkt);
    }
  });
  sim.arpPendingQueue = remaining;
  return flushed;
}

// ---------- 4. RxIndication, TcpReceived, ChangeParam, Close, ICMP & MainFunction ----------

function api_TcpIp_RxIndication(frameKey, opts) {
  const o = opts || {};
  const profileId = Number(cfg.SelectedSocketProfile) || 0;
  const s0 = getSock(o.sockId !== undefined ? o.sockId : profileId);
  sim.counters.rxOk++;

  if (frameKey === "TCP_SYN_ACK") {
    const cs = getSock(o.sockId !== undefined ? o.sockId : 0);
    if (cs.state !== "SYN_SENT") cs.state = "SYN_SENT";
    cs.ackNum = 0x9001;
    setTcpFlags({ ack: 1 });
    sim.lastHeader = Object.assign({}, sim.lastHeader, {
      dir: "RX -> TX ACK", proto: "TCP", ipSrc: cs.remoteIp, ipDst: cs.localIp,
      srcPort: cs.remotePort, dstPort: cs.localPort, flagsStr: "SYN+ACK -> ACK",
      seq: hex32(cs.seqNum), ack: hex32(cs.ackNum), win: cs.rxWindow,
      note: "Hoàn tất TCP 3-Way Handshake! Chuyển SYN_SENT ➔ ESTABLISHED."
    });
    if ((cs.tlsAssigned || cfg.TcpIpTlsConnectionEnabled) && !o.skipTls) {
      addApiTrace("ETHIF->TCPIP", "TcpIp_RxIndication(TCP SYN+ACK)", "Bước 2 TCP xong -> Gửi ACK & Bắt đầu pha AUTOSAR TLS Handshake trước khi báo SoAd!", "OK");
      return api_RunTlsHandshake(cs.socketId, Boolean(o.badCert));
    }
    cs.state = "ESTABLISHED";
    addApiTrace("ETHIF->TCPIP", "TcpIp_RxIndication(TCP SYN+ACK)", "Nhận SYN+ACK từ " + cs.remoteIp + ":" + cs.remotePort, "OK");
    addApiTrace("TCPIP->ETHIF", "EthIf_Transmit(TCP ACK Bước 3)", "SYN_SENT -> ESTABLISHED", "OK");
    addApiTrace("TCPIP->SOAD", "SoAd_TcpConnected(Sock_" + cs.socketId + ")", "SWS_TcpIp_00035: Báo SoAd/DoIP kết nối TCP đã thông!", "OK");
    sim.activeArrows = ["arr_eth_bus", "arr_ethif_tcpip", "arr_tcpip_ethif", "arr_tcpip_soad"];
    sim.activeModules = ["MOD_ETH", "MOD_ETHIF", "MOD_TCPIP", "MOD_SOAD"];
    sim.stepNarrative = "<b>TCP 3-Way Handshake Hoàn Tất!</b> <code>Sock_" + cs.socketId + "</code> chuyển sang <code>ESTABLISHED</code> và gọi <code>SoAd_TcpConnected()</code>.";
  } else if (frameKey === "TCP_DATA") {
    const cs = getSock(o.sockId !== undefined ? o.sockId : 0);
    const rxLen = Number(o.len || 1024);
    if (cs.state !== "ESTABLISHED") cs.state = "ESTABLISHED";
    cs.rxWindow = Math.max(0, cs.rxWindow - rxLen);
    cs.ackNum += rxLen;
    setTcpFlags({ psh: 1, ack: 1 });
    addApiTrace("ETHIF->TCPIP", "TcpIp_RxIndication(TCP PSH+ACK, Len=" + rxLen + "B)", "Cửa sổ nhận thu hẹp còn Window=" + cs.rxWindow + (cs.rxWindow === 0 ? " [TCP ZeroWindow!]" : "B"), cs.rxWindow === 0 ? "WARN" : "OK");
    addApiTrace("TCPIP->SOAD", "SoAd_RxIndication(Sock_" + cs.socketId + ", Len=" + rxLen + "B)", "Đẩy dữ liệu lên tầng trên (cần gọi TcpIp_TcpReceived để mở lại Window!)", "OK");
    sim.lastHeader = Object.assign({}, sim.lastHeader, {
      dir: "RX", proto: "TCP", ipSrc: cs.remoteIp, ipDst: cs.localIp, srcPort: cs.remotePort, dstPort: cs.localPort,
      flagsStr: "PSH+ACK", seq: hex32(0x9001), ack: hex32(cs.seqNum), win: cs.rxWindow, payloadBytes: rxLen,
      payloadHex: cfg.TxRxPayloadPreviewHex,
      note: "Nhận " + rxLen + "B TCP Data -> Window thu hẹp còn " + cs.rxWindow + "B" + (cs.rxWindow === 0 ? " (ZERO WINDOW!)" : "")
    });
    sim.activeArrows = ["arr_eth_bus", "arr_ethif_tcpip", "arr_tcpip_soad", "arr_soad_tcpip"];
    sim.activeModules = ["MOD_ETH", "MOD_ETHIF", "MOD_TCPIP", "MOD_SOAD", "MOD_UPPER"];
    sim.stepNarrative = "<b>Nhận TCP Stream (" + rxLen + "B)</b>: <code>WindowSize</code> giảm còn <b>" + cs.rxWindow + "B</b>. " +
      (cs.rxWindow === 0 ? "Cảnh báo: <b>TCP ZeroWindow</b> — đối tác phải ngừng gửi cho tới khi gọi <code>TcpIp_TcpReceived()</code>!" : "Gọi <code>TcpIp_TcpReceived()</code> sau khi xử lý xong để mở lại cửa sổ.");
  } else if (frameKey === "TCP_ACK" || frameKey === "TCP_DUP_ACK") {
    const cs = getSock(o.sockId !== undefined ? o.sockId : 0);
    if (frameKey === "TCP_DUP_ACK") {
      cs.dupAckCount += Number(o.count || 1);
      setTcpFlags({ ack: 1 });
      addApiTrace("ETHIF->TCPIP", "TcpIp_RxIndication(Duplicate ACK #" + cs.dupAckCount + ", Ack=" + hex32(cs.unackedSeq || cs.seqNum) + ")", "Bên nhận thiếu phân đoạn -> Gửi Dup-ACK", "WARN");
      if (cs.dupAckCount >= 3) {
        cs.dupAckCount = 0;
        sim.counters.retransmissions++;
        addApiTrace("TCPIP->ETHIF", "FAST RETRANSMIT: EthIf_Transmit(Seq=" + hex32(cs.unackedSeq || cs.seqNum) + ")", "Đủ 3x Duplicate ACK -> Truyền lại NGAY không cần đợi RTO!", "OK");
        sim.activeArrows = ["arr_eth_bus", "arr_ethif_tcpip", "arr_tcpip_ethif", "arr_ethif_eth"];
        sim.stepNarrative = "<b>Fast Retransmit (3x Dup-ACK)!</b> Nhận đủ 3 ACK trùng lặp ➔ <code>TcpIp</code> truyền lại ngay phân đoạn bị mất trước khi bộ đếm <code>RTO</code> hết hạn!";
      } else {
        sim.stepNarrative = "Đã nhận <code>" + cs.dupAckCount + "/3 Duplicate ACK</code>. Khi đủ 3 gói sẽ kích hoạt Fast Retransmit.";
      }
    } else {
      const acked = cs.unackedLen || cs.txPendingAckBytes || 64;
      cs.unackedLen = 0;
      cs.txPendingAckBytes = 0;
      cs.rtoRemainingMs = 0;
      cs.rtxCount = 0;
      setTcpFlags({ ack: 1 });
      addApiTrace("ETHIF->TCPIP", "TcpIp_RxIndication(TCP ACK, AckNum=" + hex32(cs.seqNum) + ")", "Giải phóng buffer tái truyền", "OK");
      addApiTrace("TCPIP->SOAD", "SoAd_TxConfirmation(Sock_" + cs.socketId + ", " + acked + "B)", "SWS_TcpIp_00031: Xác nhận bên nhận đã nhận đủ " + acked + "B", "OK");
      sim.activeArrows = ["arr_eth_bus", "arr_ethif_tcpip", "arr_tcpip_soad"];
      sim.activeModules = ["MOD_ETH", "MOD_ETHIF", "MOD_TCPIP", "MOD_SOAD"];
      sim.stepNarrative = "<b>SoAd_TxConfirmation(" + acked + "B)</b>: Nhận được <code>ACK</code> từ đối tác, giải phóng bộ đệm tái truyền.";
    }
  } else if (frameKey === "TCP_FIN") {
    const cs = getSock(o.sockId !== undefined ? o.sockId : 0);
    setTcpFlags({ fin: 1, ack: 1 });
    if (cs.state === "ESTABLISHED") {
      cs.state = "CLOSE_WAIT";
      addApiTrace("ETHIF->TCPIP", "TcpIp_RxIndication(TCP FIN+ACK)", "Passive Close: ESTABLISHED -> CLOSE_WAIT", "WARN");
      addApiTrace("TCPIP->SOAD", "SoAd_TcpIpEvent(Sock_" + cs.socketId + ", TCPIP_TCP_FIN_RECEIVED)", "Báo SoAd đối tác đã đóng chiều ghi (chờ SoAd gọi TcpIp_Close)", "WARN");
      sim.stepNarrative = "<b>Nhận FIN (Passive Close)</b>: <code>Sock_" + cs.socketId + "</code> chuyển <code>ESTABLISHED ➔ CLOSE_WAIT</code> và báo <code>TCPIP_TCP_FIN_RECEIVED</code>.";
    } else {
      cs.state = "TIME_WAIT";
      cs.timeWaitRemainingMs = 20;
      addApiTrace("ETHIF->TCPIP", "TcpIp_RxIndication(TCP FIN+ACK)", "Active Close Bước 3: Chuyển sang TIME_WAIT (2×MSL)", "OK");
      addApiTrace("TCPIP->ETHIF", "EthIf_Transmit(TCP ACK cuối)", "Xác nhận FIN của đối tác; chờ hết TIME_WAIT sẽ về CLOSED", "OK");
      sim.stepNarrative = "<b>4-Way FIN Teardown — TIME_WAIT!</b> Đã gửi <code>ACK</code> cuối và vào <code>TIME_WAIT</code> (" + cs.timeWaitRemainingMs + "ms giả lập) để tránh gói trễ mạng.";
    }
    sim.activeArrows = ["arr_eth_bus", "arr_ethif_tcpip", "arr_tcpip_ethif", "arr_tcpip_soad"];
    sim.activeModules = ["MOD_ETH", "MOD_ETHIF", "MOD_TCPIP", "MOD_SOAD"];
  } else if (frameKey === "TCP_RST") {
    const cs = getSock(o.sockId !== undefined ? o.sockId : 0);
    cs.state = "CLOSED";
    cs.tlsHandshakeDone = false;
    sim.tlsActive = false;
    setTcpFlags({ rst: 1, ack: 1 });
    addApiTrace("ETHIF->TCPIP", "TcpIp_RxIndication(TCP RST)", "Nhận cờ RST từ đối tác!", "ERR");
    addApiTrace("TCPIP->SOAD", "SoAd_TcpIpEvent(Sock_" + cs.socketId + ", TCPIP_TCP_RESET)", "Hủy tức thời Socket về CLOSED", "ERR");
    if (cfg.SimulateNetworkFaultForDem) {
      reportDemEvent("TCPIP_E_CONNREFUSED", "FAILED", "Đối tác gửi RST từ chối kết nối");
    }
    sim.activeArrows = ["arr_eth_bus", "arr_ethif_tcpip", "arr_tcpip_soad", "arr_tcpip_diag"];
    sim.activeModules = ["MOD_ETH", "MOD_ETHIF", "MOD_TCPIP", "MOD_SOAD", "MOD_DIAG"];
    sim.stepNarrative = "<b>Nhận TCP RST (Bit 2 = 1)!</b> Hủy kết nối ngay về <code>CLOSED</code>, gọi <code>SoAd_TcpIpEvent(TCPIP_TCP_RESET)</code>.";
  } else if (frameKey === "UDP_SOMEIP_SD") {
    const s2 = getSock(2);
    if (!cfg.HwChecksumOffloadEnabled && o.badChecksum) {
      sim.errFlag = true;
      addApiTrace("ETHIF->TCPIP", "TcpIp_RxIndication(UDP Bad Checksum)", "SW Checksum Verification FAILED -> Hủy gói tin tại L4!", "ERR");
      sim.activeArrows = ["arr_eth_bus", "arr_ethif_tcpip"];
      sim.activeModules = ["MOD_ETH", "MOD_ETHIF", "MOD_TCPIP"];
      sim.stepNarrative = "<b>Lỗi Checksum UDP (SW Offload = FALSE)!</b> Gói UDP có Checksum sai đã bị loại bỏ ngay tại tầng L4 của <code>TcpIp</code>.";
      updateRegistersAfter();
      return "E_NOT_OK";
    }
    setTcpFlags({});
    addApiTrace("ETHIF->TCPIP", "TcpIp_RxIndication(0, 0x0800, Mcast 224.224.224.245:30490)", "Lọc khớp IGMP Group & Sock_2", "OK");
    addApiTrace("TCPIP->SOAD", "SoAd_RxIndication(Sock_2, 192.168.10.200:30490, 48B)", "SWS_TcpIp_00030: Chuyển SOME/IP-SD OfferService lên SoAd -> Sd_RxIndication()", "OK");
    sim.lastHeader = Object.assign({}, sim.lastHeader, {
      dir: "RX (MCAST)", etherType: "0x0800", proto: "UDP", ipSrc: "192.168.10.200", ipDst: "224.224.224.245",
      srcPort: 30490, dstPort: 30490, flagsStr: "SOME/IP-SD", payloadBytes: 48, payloadHex: "FF FF 81 00 00 00 00 28 (OfferService)",
      note: "Nhận Multicast SOME/IP-SD hợp lệ nhờ EthIf_UpdatePhysAddrFilter() -> Đẩy lên Sd!"
    });
    sim.activeArrows = ["arr_eth_bus", "arr_ethif_tcpip", "arr_tcpip_soad", "arr_upper_soad"];
    sim.activeModules = ["MOD_ETH", "MOD_ETHIF", "MOD_TCPIP", "MOD_SOAD", "MOD_UPPER"];
    sim.stepNarrative = "<b>Nhận UDP Multicast SOME/IP-SD</b>: Gói tới <code>224.224.224.245:30490</code> được chuyển qua <code>SoAd_RxIndication(Sock_2)</code> tới module <code>Sd</code>.";
  } else if (frameKey === "UDP_PORT_9999") {
    addApiTrace("ETHIF->TCPIP", "TcpIp_RxIndication(UDP DstPort=9999)", "Không tìm thấy Socket nào Bind Port 9999!", "WARN");
    if (cfg.TcpIpIcmpEchoReplyEnabled) {
      addApiTrace("TCPIP->ETHIF", "EthIf_Transmit(ICMP Type 3 Code 3: Destination Port Unreachable)", "Phản hồi ICMP Port Unreachable về nút gửi", "WARN");
      sim.activeArrows = ["arr_eth_bus", "arr_ethif_tcpip", "arr_tcpip_ethif"];
    } else {
      addApiTrace("TCPIP", "Silent Drop (ICMP disabled)", "Loại bỏ gói tin", "WARN");
      sim.activeArrows = ["arr_eth_bus", "arr_ethif_tcpip"];
    }
    sim.lastHeader = Object.assign({}, sim.lastHeader, {
      dir: "RX -> TX ICMP", proto: "ICMP", dstPort: 9999, flagsStr: "PORT_UNREACH",
      note: "Port 9999 chưa Bind -> Tự động phản hồi ICMP Type 3 Code 3 (Destination Port Unreachable)."
    });
    sim.stepNarrative = "<b>Port 9999 Chưa Mở!</b> <code>TcpIp</code> không tìm thấy Socket khớp Port 9999 và tự động gửi trả <b>ICMP Destination Port Unreachable (Type 3, Code 3)</b>.";
  } else if (frameKey === "ARP_REPLY" || frameKey === "ARP_SPOOF") {
    if (frameKey === "ARP_SPOOF") {
      sim.errFlag = true;
      addApiTrace("ETHIF->TCPIP", "TcpIp_RxIndication(0x0806 ARP: 192.168.10.1 claimed by DE:AD:BE:EF:00:99)", "PHÁT HIỆN XUNG ĐỘT MAC CỦA GATEWAY STATIC (ARP SPOOFING)!", "ERR");
      reportIdsmEvent("TCPIP_IDSM_SEV_ARP_CONFLICT", "ARP Spoofing: MAC giả mạo tranh chấp IP Gateway 192.168.10.1");
      sim.activeArrows = ["arr_eth_bus", "arr_ethif_tcpip", "arr_tcpip_diag"];
      sim.activeModules = ["MOD_ETH", "MOD_ETHIF", "MOD_TCPIP", "MOD_DIAG"];
      sim.stepNarrative = "<b>Phát Hiện ARP Spoofing!</b> Khung <code>ARP Reply</code> giả mạo trùng IP Gateway bị chặn và báo ngay lên <code>IdsM_SetSecurityEvent(TCPIP_IDSM_SEV_ARP_CONFLICT)</code>!";
      updateRegistersAfter();
      return "E_NOT_OK";
    }
    const targetIp = o.targetIp || "192.168.10.200";
    const resolvedMac = o.mac || "00:11:22:33:44:C8";
    const existing = sim.arpCache.find(function (e) { return e.ip === targetIp; });
    if (existing) {
      existing.mac = resolvedMac;
      existing.state = "REACHABLE";
      existing.ttlSec = Number(cfg.TcpIpArpTableEntryTimeoutSec) || 60;
    } else {
      sim.arpCache.push({ ip: targetIp, mac: resolvedMac, state: "REACHABLE", ttlSec: Number(cfg.TcpIpArpTableEntryTimeoutSec) || 60, conflict: false });
    }
    sim.arpHit = true;
    cfg.SimulateArpCacheMiss = false;
    addApiTrace("ETHIF->TCPIP", "TcpIp_RxIndication(0, 0x0806 ARP Reply: " + targetIp + " is at " + resolvedMac + ")", "Cập nhật ARP Cache REACHABLE (Bit 3 ARP_HIT = 1)", "OK");
    const drained = drainArpPendingQueue(targetIp);
    sim.lastHeader = Object.assign({}, sim.lastHeader, {
      dir: "RX (ARP REPLY)", etherType: "0x0806", proto: "ARP", ipSrc: targetIp, ipDst: sim.localAddrs[0].ip,
      flagsStr: "ARP_REPLY", payloadBytes: 28,
      note: "ARP Cache cập nhật " + targetIp + " -> " + resolvedMac + (drained ? " | Đã xả " + drained + " gói từ ArpPendingQueue!" : "")
    });
    sim.activeArrows = ["arr_eth_bus", "arr_ethif_tcpip", "arr_tcpip_ethif", "arr_ethif_eth"];
    sim.activeModules = ["MOD_ETH", "MOD_ETHIF", "MOD_TCPIP", "MOD_ETHIF", "MOD_ETH"];
    sim.stepNarrative = "<b>Nhận ARP Reply (" + targetIp + " ➔ " + resolvedMac + ")!</b> Bit 3 (ARP_HIT) bật lên 1" + (drained ? " và đã tự động xả <b>" + drained + "</b> gói tin nằm chờ trong <code>ArpPendingQueue</code>!" : ".");
  } else if (frameKey === "ICMP_ECHO_REQ" || frameKey === "ICMP_PING") {
    addApiTrace("ETHIF->TCPIP", "TcpIp_RxIndication(ICMP Type 8 Code 0 Echo Request Ping)", "Từ 192.168.10.100 -> " + sim.localAddrs[0].ip, "OK");
    if (cfg.TcpIpIcmpEchoReplyEnabled) {
      sim.counters.txOk++;
      addApiTrace("TCPIP->ETHIF", "EthIf_Transmit(ICMP Type 0 Code 0 Echo Reply)", "TcpIp tự động trả lời Ping ngay tại L3 (không làm phiền SoAd)", "OK");
      sim.activeArrows = ["arr_eth_bus", "arr_ethif_tcpip", "arr_tcpip_ethif", "arr_ethif_eth"];
      sim.lastHeader = Object.assign({}, sim.lastHeader, {
        dir: "RX -> TX ICMP", proto: "ICMP", ipSrc: sim.localAddrs[0].ip, ipDst: "192.168.10.100",
        flagsStr: "ECHO_REPLY", payloadBytes: 32, note: "Auto ICMPv4 Echo Reply (Type 0, Code 0) tới 192.168.10.100"
      });
      sim.stepNarrative = "<b>ICMP Echo Reply (Ping)!</b> Vì <code>TcpIpIcmpEchoReplyEnabled = TRUE</code>, ngăn xếp tự phát trả <code>Echo Reply (Type 0)</code> ngay tại L3.";
    } else {
      addApiTrace("TCPIP", "Ping Dropped (TcpIpIcmpEchoReplyEnabled=FALSE)", "ECU im lặng trước yêu cầu Ping", "WARN");
      sim.stepNarrative = "<b>Ping Bị Bỏ Qua!</b> <code>TcpIpIcmpEchoReplyEnabled = FALSE</code> nên ECU không trả lời Ping.";
    }
  } else if (frameKey === "UDP_FRAG_PAIR") {
    if (!cfg.TcpIpIpReassemblyAndFragEnabled) {
      sim.errFlag = true;
      addApiTrace("ETHIF->TCPIP", "TcpIp_RxIndication(IPv4 Fragment MF=1)", "LOẠI BỎ MẢNH vì TcpIpIpReassemblyAndFragEnabled = FALSE!", "ERR");
      sim.stepNarrative = "<b>Hủy Mảnh Phân Mảnh!</b> Tùy chọn tái hợp đang tắt nên không thể lắp ghép gói > MTU.";
      updateRegistersAfter();
      return "E_NOT_OK";
    }
    sim.flagMf = 0;
    sim.counters.fragmentsReassembled++;
    addApiTrace("ETHIF->TCPIP", "TcpIp_RxIndication(Frag#1 1480B MF=1 Off=0)", "Giữ vào ReassemblyBuffer (Bit 6 IP_MF=1)", "OK");
    addApiTrace("ETHIF->TCPIP", "TcpIp_RxIndication(Frag#2 1328B MF=0 Off=185)", "Khép kín 2808B! Giải phóng ReassemblyBuffer (Bit 6=0)", "OK");
    addApiTrace("TCPIP->SOAD", "SoAd_RxIndication(Sock_1, Reassembled Len=2800B)", "Đẩy trọn gói 2800B hoàn chỉnh lên SoAd một lần duy nhất!", "OK");
    sim.lastHeader = Object.assign({}, sim.lastHeader, {
      dir: "RX (REASSEMBLED)", proto: "UDP", ipSrc: "192.168.10.200", ipDst: sim.localAddrs[0].ip,
      df: 0, mf: 0, fragId: "0x4A12", ipLen: 2828, payloadBytes: 2800, flagsStr: "REASSEMBLED_2800B",
      note: "IPv4 Reassembly hoàn tất 2 mảnh -> Đẩy 2800B lên SoAd_RxIndication()"
    });
    sim.activeArrows = ["arr_eth_bus", "arr_ethif_tcpip", "arr_tcpip_soad"];
    sim.activeModules = ["MOD_ETH", "MOD_ETHIF", "MOD_TCPIP", "MOD_SOAD"];
    sim.stepNarrative = "<b>IPv4 Reassembly Hoàn Tất!</b> Ghép đủ Mảnh 1 (<code>MF=1, Off=0</code>) + Mảnh 2 (<code>MF=0, Off=185</code>) ➔ Đẩy trọn <code>2800B</code> lên <code>SoAd_RxIndication()</code>.";
  }

  updateRegistersAfter();
  return "E_OK";
}

function api_TcpIp_TcpReceived(sockId, datalen) {
  const s = getSock(sockId !== undefined ? sockId : 0);
  const addBytes = Number(datalen || 1024);
  const maxWin = Number(cfg.TcpIpTcpReceiveWindowMax) || 4096;
  const oldWin = s.rxWindow;
  s.rxWindow = Math.min(maxWin, s.rxWindow + addBytes);
  setTcpFlags({ ack: 1 });
  addApiTrace("SOAD->TCPIP", "TcpIp_TcpReceived(Sock_" + s.socketId + ", " + addBytes + "B)", "SWS_TcpIp_00024: Mở lại cửa sổ nhận " + oldWin + "B -> " + s.rxWindow + "B", "OK");
  addApiTrace("TCPIP->ETHIF", "EthIf_Transmit(TCP ACK Window Update=" + s.rxWindow + ")", "Báo đối tác tiếp tục gửi dữ liệu", "OK");
  sim.lastHeader = Object.assign({}, sim.lastHeader, {
    dir: "TX (WIN UPDATE)", proto: "TCP", srcPort: s.localPort, dstPort: s.remotePort, flagsStr: "ACK (WIN)",
    win: s.rxWindow, note: "TcpIp_TcpReceived() mở lại TCP Window từ " + oldWin + "B lên " + s.rxWindow + "B!"
  });
  sim.activeArrows = ["arr_soad_tcpip", "arr_tcpip_ethif", "arr_eth_bus"];
  sim.activeModules = ["MOD_SOAD", "MOD_TCPIP", "MOD_ETHIF", "MOD_ETH"];
  sim.stepNarrative = "<b>TcpIp_TcpReceived(Sock_" + s.socketId + ", " + addBytes + "B)</b>: Cửa sổ trượt mở rộng từ <code>" + oldWin + "B ➔ " + s.rxWindow + "B</code> và gửi <code>ACK Window Update</code>!";
  sim.cCodeSnippet = "/* SWS_TcpIp_00024: Notify TcpIp that SoAd consumed received bytes */\nTcpIp_TcpReceived(" + s.socketId + "u, " + addBytes + "u);";
  updateRegistersAfter();
  return "E_OK";
}

function api_TcpIp_ChangeParameter(sockId, paramId, val) {
  const s = getSock(sockId);
  const pid = paramId || cfg.ChangeParamIdSelector;
  let newValDesc = String(val !== undefined ? val : "");
  if (pid === "TCPIP_PARAMID_FRAMEPRIO") {
    s.framePrio = val !== undefined ? Number(val) : (s.framePrio === 6 ? 4 : 6);
    newValDesc = "VLAN PCP = " + s.framePrio;
    sim.lastHeader.pcp = s.framePrio;
  } else if (pid === "TCPIP_PARAMID_TTL") {
    s.ttl = val !== undefined ? Number(val) : (s.ttl === 1 ? 64 : 1);
    newValDesc = "IP TTL = " + s.ttl;
    sim.lastHeader.ttl = s.ttl;
  } else if (pid === "TCPIP_PARAMID_TCP_NAGLE") {
    cfg.TcpIpTcpNagleEnabled = val !== undefined ? Boolean(val) : !cfg.TcpIpTcpNagleEnabled;
    s.nagle = cfg.TcpIpTcpNagleEnabled;
    newValDesc = "NAGLE = " + (s.nagle ? "TRUE" : "FALSE");
  } else if (pid === "TCPIP_PARAMID_TCP_KEEPALIVE") {
    cfg.TcpIpTcpKeepAliveEnabled = val !== undefined ? Boolean(val) : !cfg.TcpIpTcpKeepAliveEnabled;
    s.keepAlive = cfg.TcpIpTcpKeepAliveEnabled;
    newValDesc = "KEEPALIVE = " + (s.keepAlive ? "TRUE" : "FALSE");
  } else if (pid === "TCPIP_PARAMID_TLS_CONNECTION_ASSIGNMENT") {
    s.tlsAssigned = true;
    cfg.TcpIpTlsConnectionEnabled = true;
    newValDesc = "TlsConnId = 0 (DoIP Port 3496)";
  }
  addApiTrace("SOAD->TCPIP", "TcpIp_ChangeParameter(Sock_" + s.socketId + ", " + pid + ")", "SWS_TcpIp_00016: Đổi nóng -> " + newValDesc, "OK");
  sim.activeArrows = ["arr_soad_tcpip"];
  sim.activeModules = ["MOD_SOAD", "MOD_TCPIP"];
  sim.stepNarrative = "<b>TcpIp_ChangeParameter(Sock_" + s.socketId + ")</b>: Cập nhật tức thì <code>" + pid + "</code> ➔ <b>" + newValDesc + "</b>.";
  sim.cCodeSnippet = "uint8 paramVal = " + (s.framePrio || 6) + "u;\nTcpIp_ChangeParameter(" + s.socketId + "u, " + pid + ", &paramVal);";
  updateRegistersAfter();
  return "E_OK";
}

function api_TcpIp_Close(sockId, abortFlag) {
  const s = getSock(sockId);
  const abort = abortFlag !== undefined ? Boolean(abortFlag) : Boolean(cfg.TcpCloseAbortWithRst);
  if (s.proto === "UDP") {
    s.state = "CLOSED";
    addApiTrace("SOAD->TCPIP", "TcpIp_Close(Sock_" + s.socketId + ", Abort=" + (abort ? "TRUE" : "FALSE") + ")", "Đóng Socket UDP về CLOSED", "OK");
    updateRegistersAfter();
    return "E_OK";
  }

  if (abort) {
    s.state = "CLOSED";
    s.tlsHandshakeDone = false;
    s.unackedLen = 0;
    if (!sim.sockets.some(function (x) { return x.tlsHandshakeDone; })) sim.tlsActive = false;
    setTcpFlags({ rst: 1 });
    sim.counters.txOk++;
    addApiTrace("SOAD->TCPIP", "TcpIp_Close(Sock_" + s.socketId + ", Abort=TRUE)", "SWS_TcpIp_00017: Hủy cưỡng bức tức thì!", "WARN");
    addApiTrace("TCPIP->ETHIF", "EthIf_Transmit(TCP RST, Bit 2 TCP_RST=1)", "Bỏ qua 4-Way FIN, phát RST & xóa ngay Socket", "WARN");
    addApiTrace("TCPIP->SOAD", "SoAd_TcpIpEvent(Sock_" + s.socketId + ", TCPIP_TCP_RESET)", "Đóng hoàn toàn về CLOSED (không qua TIME_WAIT)", "WARN");
    sim.lastHeader = Object.assign({}, sim.lastHeader, {
      dir: "TX (ABORT RST)", proto: "TCP", srcPort: s.localPort, dstPort: s.remotePort, flagsStr: "RST",
      note: "TcpIp_Close(Abort=TRUE) phát cờ RST (Bit 2=1) hủy tức khắc Socket về CLOSED!"
    });
    sim.stepNarrative = "<b>TcpIp_Close(Abort=TRUE)</b>: Phát ngay cờ <b>RST (Bit 2 = 1)</b>, bỏ qua <code>TIME_WAIT</code>, xóa sạch kết nối về <code>CLOSED</code>.";
  } else {
    s.state = s.state === "CLOSE_WAIT" ? "LAST_ACK" : "FIN_WAIT_1";
    setTcpFlags({ fin: 1, ack: 1 });
    sim.counters.txOk++;
    addApiTrace("SOAD->TCPIP", "TcpIp_Close(Sock_" + s.socketId + ", Abort=FALSE)", "Bắt đầu đóng êm dịu 4-Way FIN Teardown", "OK");
    addApiTrace("TCPIP->ETHIF", "EthIf_Transmit(TCP FIN+ACK, Bit 0 TCP_FIN=1)", "Socket chuyển sang " + s.state, "OK");
    sim.lastHeader = Object.assign({}, sim.lastHeader, {
      dir: "TX (FIN)", proto: "TCP", srcPort: s.localPort, dstPort: s.remotePort, flagsStr: "FIN+ACK",
      note: "TcpIp_Close(Abort=FALSE) phát FIN+ACK (Bit 0=1) -> " + s.state
    });
    sim.stepNarrative = "<b>TcpIp_Close(Abort=FALSE)</b>: Phát cờ <b>FIN+ACK (Bit 0 = 1, Bit 4 = 1)</b> chuyển sang <code>" + s.state + "</code>.";
  }
  sim.activeArrows = ["arr_soad_tcpip", "arr_tcpip_ethif", "arr_ethif_eth", "arr_eth_bus", "arr_tcpip_soad"];
  sim.activeModules = ["MOD_SOAD", "MOD_TCPIP", "MOD_ETHIF", "MOD_ETH"];
  sim.cCodeSnippet = "TcpIp_Close(" + s.socketId + "u, " + (abort ? "TRUE" : "FALSE") + ");";
  updateRegistersAfter();
  return "E_OK";
}

function api_TcpIp_IcmpTransmit(ttl, type, code) {
  sim.counters.txOk++;
  addApiTrace("UPPER->TCPIP", "TcpIp_IcmpTransmit(LocalAddr_0, 192.168.10.100, TTL=" + (ttl || 64) + ", Type=" + (type !== undefined ? type : 8) + ", Code=" + (code || 0) + ")", "SWS_TcpIp_00039: Chủ động gửi bản tin ICMP", "OK");
  sim.lastHeader = Object.assign({}, sim.lastHeader, {
    dir: "TX (ICMP)", proto: "ICMP", ttl: ttl || 64, flagsStr: "ICMP_T" + (type !== undefined ? type : 8),
    note: "TcpIp_IcmpTransmit() gửi gói ICMP Type=" + (type !== undefined ? type : 8)
  });
  sim.activeArrows = ["arr_upper_soad", "arr_tcpip_ethif", "arr_eth_bus"];
  sim.activeModules = ["MOD_UPPER", "MOD_TCPIP", "MOD_ETHIF", "MOD_ETH"];
  updateRegistersAfter();
  return "E_OK";
}

function api_TcpIp_MainFunction() {
  const period = Math.max(1, Number(cfg.TcpIpMainFunctionPeriod) || 5);
  sim.clockMs += period;
  let notes = [];

  sim.sockets.forEach(function (s) {
    if (s.proto === "TCP" && s.state === "TIME_WAIT") {
      s.timeWaitRemainingMs -= period;
      if (s.timeWaitRemainingMs <= 0) {
        s.timeWaitRemainingMs = 0;
        s.state = "CLOSED";
        s.tlsHandshakeDone = false;
        setTcpFlags({});
        addApiTrace("TCPIP", "TcpIp_MainFunction() [+" + period + "ms]: TIME_WAIT Hết Hạn", "Sock_" + s.socketId + " đóng sạch TIME_WAIT -> CLOSED", "OK");
        addApiTrace("TCPIP->SOAD", "SoAd_TcpIpEvent(Sock_" + s.socketId + ", TCPIP_TCP_CLOSED)", "Giải phóng hoàn toàn Socket cho kết nối mới", "OK");
        notes.push("Sock_" + s.socketId + " TIME_WAIT -> CLOSED");
      } else {
        notes.push("Sock_" + s.socketId + " TIME_WAIT còn " + s.timeWaitRemainingMs + "ms");
      }
    }

    if (s.proto === "TCP" && s.state === "ESTABLISHED" && s.unackedLen > 0) {
      s.rtoRemainingMs -= period * 10; // accelerate visual demo steps cleanly per click
      if (s.rtoRemainingMs <= 0) {
        if (s.rtxCount < Number(cfg.TcpIpTcpMaxRtx)) {
          s.rtxCount++;
          sim.counters.retransmissions++;
          const nextRto = (Number(cfg.TcpIpTcpRetransmissionTimeoutMs) || 200) * Math.pow(2, s.rtxCount);
          s.rtoRemainingMs = nextRto;
          setTcpFlags({ psh: 1, ack: 1 });
          addApiTrace("TCPIP->ETHIF", "MainFunction RTO Retransmit #" + s.rtxCount + "/" + cfg.TcpIpTcpMaxRtx, "Phát lại Seq=" + hex32(s.unackedSeq) + " (Backoff RTO=" + nextRto + "ms)", "WARN");
          sim.activeArrows = ["arr_tcpip_ethif", "arr_ethif_eth", "arr_eth_bus"];
          sim.activeModules = ["MOD_TCPIP", "MOD_ETHIF", "MOD_ETH"];
          notes.push("Rtx #" + s.rtxCount + "/" + cfg.TcpIpTcpMaxRtx + " (RTO=" + nextRto + "ms)");
        } else {
          s.state = "CLOSED";
          s.unackedLen = 0;
          setTcpFlags({ rst: 1 });
          addApiTrace("TCPIP", "MAX RETRANSMISSIONS EXCEEDED (>" + cfg.TcpIpTcpMaxRtx + ")", "Đóng kết nối Sock_" + s.socketId + "!", "ERR");
          addApiTrace("TCPIP->SOAD", "SoAd_TcpIpEvent(Sock_" + s.socketId + ", TCPIP_TCP_RESET)", "Báo SoAd kết nối đứt hoàn toàn", "ERR");
          reportDemEvent("TCPIP_E_TIMEDOUT", "FAILED", "Sock_" + s.socketId + " vượt quá TcpIpTcpMaxRtx=" + cfg.TcpIpTcpMaxRtx);
          notes.push("DEM TCPIP_E_TIMEDOUT!");
        }
      } else {
        notes.push("RTO còn " + s.rtoRemainingMs + "ms");
      }
    } else if (s.proto === "TCP" && s.state === "ESTABLISHED" && cfg.TcpIpTcpKeepAliveEnabled) {
      s.keepAliveIdleTicks++;
      if (s.keepAliveIdleTicks >= 3) {
        s.keepAliveIdleTicks = 0;
        setTcpFlags({ ack: 1 });
        addApiTrace("TCPIP->ETHIF", "EthIf_Transmit(TCP Keep-Alive Probe, Seq=" + hex32(s.seqNum - 1) + ")", "Thăm dò đối tác khi kênh nhàn rỗi", "OK");
        notes.push("Gửi TCP Keep-Alive Probe");
      }
    }
  });

  if (notes.length === 0) {
    addApiTrace("TCPIP", "TcpIp_MainFunction() [" + sim.clockMs + "ms]", "Quét định kỳ RTO, TIME_WAIT, Keep-Alive, ARP Aging, DHCP Lease", "OK");
    sim.activeModules = ["MOD_TCPIP"];
    sim.activeArrows = [];
  }
  sim.stepNarrative = "<b>TcpIp_MainFunction() [@" + sim.clockMs + "ms]</b>: " + (notes.length ? notes.join(" | ") : "Các bộ định thời hoạt động ổn định.");
  sim.cCodeSnippet = "/* Periodic Task (" + period + "ms) — SWS_TcpIp_00026 */\nTcpIp_MainFunction();";
  updateRegistersAfter();
  return "E_OK";
}

function api_InjectSynFlood() {
  sim.counters.rxOk += 25;
  setTcpFlags({ syn: 1 });
  const synCookies = Boolean(cfg.TcpIpSynCookiesEnabled);
  addApiTrace("ETHIF->TCPIP", "TcpIp_RxIndication(SYN Flood ×25 giả mạo IP nguồn)", "Dồn dập gói SYN tới Port 13400", "ERR");
  if (synCookies) {
    addApiTrace("TCPIP->ETHIF", "SYN COOKIES DEFENSE: Không cấp Socket RAM! Gửi SYN+ACK kèm Hash Cookie ISN", "Bảo toàn toàn vẹn TcpIp_SocketTable[0..3]", "OK");
  } else {
    addApiTrace("TCPIP", "Cảnh báo: TcpIpSynCookiesEnabled=FALSE -> Nguy cơ cạn Socket Table!", "Cân nhắc bật SYN Cookies", "WARN");
  }
  reportIdsmEvent("TCPIP_IDSM_SEV_SYN_FLOOD", "Phát hiện bão kết nối SYN Flood (SYN Cookies=" + (synCookies ? "ON" : "OFF") + ")");
  sim.lastHeader = Object.assign({}, sim.lastHeader, {
    dir: "RX (ATTACK)", proto: "TCP", ipSrc: "203.0.113.x (Spoofed)", ipDst: sim.localAddrs[0].ip,
    srcPort: 65001, dstPort: 13400, flagsStr: "SYN FLOOD",
    note: (synCookies ? "SYN Cookies ĐÃ NGĂN tràn bảng Socket!" : "SYN Cookies TẮT!") + " Đã báo IdsM_SetSecurityEvent()."
  });
  sim.activeArrows = ["arr_eth_bus", "arr_ethif_tcpip", "arr_tcpip_diag"];
  sim.activeModules = ["MOD_ETH", "MOD_ETHIF", "MOD_TCPIP", "MOD_DIAG"];
  sim.stepNarrative = "<b>🛡️ Phòng Thủ Tấn Công SYN Flood!</b> " +
    (synCookies ? "<b>SYN Cookies</b> nhúng Hash vào ISN nên KHÔNG tốn bộ nhớ <code>TcpIp_SocketTable</code>" : "Thiếu SYN Cookies khiến Socket có nguy cơ cạn") +
    " và báo sự kiện an ninh lên <code>IdsM</code> (Bit 0 = 1).";
  sim.cCodeSnippet = "/* ECUC SYN Cookies & IdsM Security Reporting */\nIdsM_SetSecurityEvent(TCPIP_IDSM_SEV_SYN_FLOOD);";
  updateRegistersAfter();
}

function api_InjectDetFault() {
  cfg.PassInvalidSocketOrNullForDet = true;
  reportDetError("0x06", "TCPIP_E_INV_SOCK_ID", "Injected Fault: SocketId = 99 vượt TcpIpMaxSockets (ModuleId 170 / 0x00AA)");
  sim.stepNarrative = "<b>💥 Lỗi DET (ModuleId 170 / 0x00AA)!</b> <code>Det_ReportError(170, 0, 0x06, TCPIP_E_INV_SOCK_ID)</code> đã chặn tham số không hợp lệ.";
  sim.cCodeSnippet = "#if (TCPIP_DEV_ERROR_DETECT == STD_ON)\nDet_ReportError(TCPIP_MODULE_ID /* 170u */, 0u, 0x06u, TCPIP_E_INV_SOCK_ID);\n#endif";
}

function api_TcpIp_GetVersionInfo() {
  addApiTrace("UPPER->TCPIP", "TcpIp_GetVersionInfo(&verInfo)", "SWS_TcpIp_00003: ModuleId=170 (0x00AA), Vendor=0x0001, SW=23.11.0", "OK");
  sim.activeModules = ["MOD_UPPER", "MOD_TCPIP"];
  sim.stepNarrative = "<b>TcpIp_GetVersionInfo()</b>: Trả về <code>moduleID = 170 (0x00AA)</code>, AUTOSAR Classic Release <code>R23-11</code>.";
  sim.cCodeSnippet = "Std_VersionInfoType ver;\nTcpIp_GetVersionInfo(&ver); /* ver.moduleID == 170u */";
  updateRegistersAfter();
}

function onClickRegBit(reg, bit) {
  if (!sim) return;
  if (reg === "A") {
    sim.regA ^= (1 << bit);
    sim.ctrlState = (sim.regA & 0x80) ? "TCPIP_STATE_ONLINE" : ((sim.regA & 0x40) ? "TCPIP_STATE_ONHOLD" : "TCPIP_STATE_OFFLINE");
    cfg.ActiveCtrlState = sim.ctrlState;
    sim.ipAssigned = Boolean(sim.regA & 0x20);
    sim.dhcpAutoIp = Boolean(sim.regA & 0x10);
    sim.arpHit = Boolean(sim.regA & 0x08);
    sim.zeroCopyUsed = Boolean(sim.regA & 0x04);
    sim.tlsActive = Boolean(sim.regA & 0x02);
    sim.errFlag = Boolean(sim.regA & 0x01);
  } else {
    sim.regB ^= (1 << bit);
    sim.flagDf = (sim.regB & 0x80) ? 1 : 0;
    sim.flagMf = (sim.regB & 0x40) ? 1 : 0;
    sim.tcpFlags.urg = (sim.regB & 0x20) ? 1 : 0;
    sim.tcpFlags.ack = (sim.regB & 0x10) ? 1 : 0;
    sim.tcpFlags.psh = (sim.regB & 0x08) ? 1 : 0;
    sim.tcpFlags.rst = (sim.regB & 0x04) ? 1 : 0;
    sim.tcpFlags.syn = (sim.regB & 0x02) ? 1 : 0;
    sim.tcpFlags.fin = (sim.regB & 0x01) ? 1 : 0;
  }
  addApiTrace("REG", "Toggle Thanh " + reg + " Bit " + bit, "RegA=" + hexByte(sim.regA) + ", RegB=" + hexByte(sim.regB), "OK");
  if (typeof renderAll === "function") renderAll();
}

// ---------- 5. Export Generators (ARXML, Cfg.h, Lcfg.c, JSON) ----------

function generateTcpIpArxml() {
  const b = function (v) { return v ? "true" : "false"; };
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<AUTOSAR xmlns="http://autosar.org/schema/r4.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">\n' +
    '  <AR-PACKAGES>\n' +
    '    <AR-PACKAGE>\n' +
    '      <SHORT-NAME>EcucDefs_TcpIp</SHORT-NAME>\n' +
    '      <ELEMENTS>\n' +
    '        <ECUC-MODULE-CONFIGURATION-VALUES>\n' +
    '          <SHORT-NAME>TcpIp</SHORT-NAME>\n' +
    '          <DEFINITION-REF DEST="ECUC-MODULE-DEF">/AUTOSAR/EcucDefs/TcpIp</DEFINITION-REF>\n' +
    '          <CONTAINERS>\n' +
    '            <ECUC-CONTAINER-VALUE>\n' +
    '              <SHORT-NAME>TcpIpGeneral</SHORT-NAME>\n' +
    '              <PARAMETER-VALUES>\n' +
    '                <ECUC-BOOLEAN-PARAM-VALUE><SHORT-NAME>TcpIpDevErrorDetect</SHORT-NAME><VALUE>' + b(cfg.TcpIpDevErrorDetect) + '</VALUE></ECUC-BOOLEAN-PARAM-VALUE>\n' +
    '                <ECUC-FLOAT-PARAM-VALUE><SHORT-NAME>TcpIpMainFunctionPeriod</SHORT-NAME><VALUE>' + (Number(cfg.TcpIpMainFunctionPeriod) / 1000).toFixed(3) + '</VALUE></ECUC-FLOAT-PARAM-VALUE>\n' +
    '                <ECUC-BOOLEAN-PARAM-VALUE><SHORT-NAME>TcpIpBufferMemoryPoolZeroCopy</SHORT-NAME><VALUE>' + b(cfg.TcpIpBufferMemoryPoolZeroCopy) + '</VALUE></ECUC-BOOLEAN-PARAM-VALUE>\n' +
    '                <ECUC-BOOLEAN-PARAM-VALUE><SHORT-NAME>TcpIpTcpEnabled</SHORT-NAME><VALUE>' + b(cfg.TcpIpTcpEnabled) + '</VALUE></ECUC-BOOLEAN-PARAM-VALUE>\n' +
    '                <ECUC-BOOLEAN-PARAM-VALUE><SHORT-NAME>TcpIpTlsConnectionEnabled</SHORT-NAME><VALUE>' + b(cfg.TcpIpTlsConnectionEnabled) + '</VALUE></ECUC-BOOLEAN-PARAM-VALUE>\n' +
    '              </PARAMETER-VALUES>\n' +
    '            </ECUC-CONTAINER-VALUE>\n' +
    '            <ECUC-CONTAINER-VALUE>\n' +
    '              <SHORT-NAME>TcpIpCtrl_0</SHORT-NAME>\n' +
    '              <PARAMETER-VALUES>\n' +
    '                <ECUC-NUMERICAL-PARAM-VALUE><SHORT-NAME>TcpIpCtrlMtu</SHORT-NAME><VALUE>' + cfg.TcpIpCtrlMtu + '</VALUE></ECUC-NUMERICAL-PARAM-VALUE>\n' +
    '                <ECUC-NUMERICAL-PARAM-VALUE><SHORT-NAME>TcpIpCtrlFramePrioDefault</SHORT-NAME><VALUE>' + cfg.TcpIpCtrlFramePrioDefault + '</VALUE></ECUC-NUMERICAL-PARAM-VALUE>\n' +
    '              </PARAMETER-VALUES>\n' +
    '            </ECUC-CONTAINER-VALUE>\n' +
    '            <ECUC-CONTAINER-VALUE>\n' +
    '              <SHORT-NAME>TcpIpLocalAddr_0</SHORT-NAME>\n' +
    '              <PARAMETER-VALUES>\n' +
    '                <ECUC-TEXTUAL-PARAM-VALUE><SHORT-NAME>TcpIpAssignmentMethod</SHORT-NAME><VALUE>' + cfg.TcpIpAssignmentMethod + '</VALUE></ECUC-TEXTUAL-PARAM-VALUE>\n' +
    '                <ECUC-TEXTUAL-PARAM-VALUE><SHORT-NAME>TcpIpAssignmentTrigger</SHORT-NAME><VALUE>' + cfg.TcpIpAssignmentTrigger + '</VALUE></ECUC-TEXTUAL-PARAM-VALUE>\n' +
    '                <ECUC-TEXTUAL-PARAM-VALUE><SHORT-NAME>TcpIpStaticIpAddress</SHORT-NAME><VALUE>' + cfg.TcpIpStaticIpAddress + '</VALUE></ECUC-TEXTUAL-PARAM-VALUE>\n' +
    '              </PARAMETER-VALUES>\n' +
    '            </ECUC-CONTAINER-VALUE>\n' +
    '            <ECUC-CONTAINER-VALUE>\n' +
    '              <SHORT-NAME>TcpIpTcpConfig</SHORT-NAME>\n' +
    '              <PARAMETER-VALUES>\n' +
    '                <ECUC-NUMERICAL-PARAM-VALUE><SHORT-NAME>TcpIpTcpMaxRtx</SHORT-NAME><VALUE>' + cfg.TcpIpTcpMaxRtx + '</VALUE></ECUC-NUMERICAL-PARAM-VALUE>\n' +
    '                <ECUC-FLOAT-PARAM-VALUE><SHORT-NAME>TcpIpTcpRetransmissionTimeout</SHORT-NAME><VALUE>' + (Number(cfg.TcpIpTcpRetransmissionTimeoutMs) / 1000).toFixed(3) + '</VALUE></ECUC-FLOAT-PARAM-VALUE>\n' +
    '                <ECUC-BOOLEAN-PARAM-VALUE><SHORT-NAME>TcpIpTcpNagleEnabled</SHORT-NAME><VALUE>' + b(cfg.TcpIpTcpNagleEnabled) + '</VALUE></ECUC-BOOLEAN-PARAM-VALUE>\n' +
    '                <ECUC-BOOLEAN-PARAM-VALUE><SHORT-NAME>TcpIpTcpKeepAliveEnabled</SHORT-NAME><VALUE>' + b(cfg.TcpIpTcpKeepAliveEnabled) + '</VALUE></ECUC-BOOLEAN-PARAM-VALUE>\n' +
    '                <ECUC-NUMERICAL-PARAM-VALUE><SHORT-NAME>TcpIpTcpReceiveWindowMax</SHORT-NAME><VALUE>' + cfg.TcpIpTcpReceiveWindowMax + '</VALUE></ECUC-NUMERICAL-PARAM-VALUE>\n' +
    '              </PARAMETER-VALUES>\n' +
    '            </ECUC-CONTAINER-VALUE>\n' +
    '          </CONTAINERS>\n' +
    '        </ECUC-MODULE-CONFIGURATION-VALUES>\n' +
    '      </ELEMENTS>\n' +
    '    </AR-PACKAGE>\n' +
    '  </AR-PACKAGES>\n' +
    '</AUTOSAR>';
}

function generateTcpIpCfgH() {
  const std = function (v) { return v ? "STD_ON" : "STD_OFF"; };
  return '/* Generated by AUTOSAR Classic TcpIp Simulator (R23-11) */\n' +
    '#ifndef TCPIP_CFG_H\n' +
    '#define TCPIP_CFG_H\n\n' +
    '#include "Std_Types.h"\n\n' +
    '#define TCPIP_MODULE_ID                     (170u)\n' +
    '#define TCPIP_DEV_ERROR_DETECT              (' + std(cfg.TcpIpDevErrorDetect) + ')\n' +
    '#define TCPIP_MAIN_FUNCTION_PERIOD_MS       (' + cfg.TcpIpMainFunctionPeriod + 'u)\n' +
    '#define TCPIP_ZERO_COPY_TX_ENABLE           (' + std(cfg.TcpIpBufferMemoryPoolZeroCopy) + ')\n' +
    '#define TCPIP_CTRL_DEFAULT_MTU              (' + cfg.TcpIpCtrlMtu + 'u)\n' +
    '#define TCPIP_CTRL_DEFAULT_VLAN_PCP         (' + cfg.TcpIpCtrlFramePrioDefault + 'u)\n' +
    '#define TCPIP_TCP_ENABLED                   (' + std(cfg.TcpIpTcpEnabled) + ')\n' +
    '#define TCPIP_TCP_MAX_RTX                   (' + cfg.TcpIpTcpMaxRtx + 'u)\n' +
    '#define TCPIP_TCP_RTO_MS                    (' + cfg.TcpIpTcpRetransmissionTimeoutMs + 'u)\n' +
    '#define TCPIP_TCP_NAGLE_ENABLED             (' + std(cfg.TcpIpTcpNagleEnabled) + ')\n' +
    '#define TCPIP_TCP_KEEPALIVE_ENABLED         (' + std(cfg.TcpIpTcpKeepAliveEnabled) + ')\n' +
    '#define TCPIP_TCP_RECEIVE_WINDOW_MAX        (' + cfg.TcpIpTcpReceiveWindowMax + 'u)\n' +
    '#define TCPIP_ARP_ENTRY_TIMEOUT_SEC         (' + cfg.TcpIpArpTableEntryTimeoutSec + 'u)\n' +
    '#define TCPIP_IP_FRAGMENTATION_ENABLED      (' + std(cfg.TcpIpIpReassemblyAndFragEnabled) + ')\n' +
    '#define TCPIP_ICMP_ECHO_REPLY_ENABLED       (' + std(cfg.TcpIpIcmpEchoReplyEnabled) + ')\n' +
    '#define TCPIP_HW_CHECKSUM_OFFLOAD           (' + std(cfg.HwChecksumOffloadEnabled) + ')\n' +
    '#define TCPIP_TLS_ENABLED                   (' + std(cfg.TcpIpTlsConnectionEnabled) + ')\n' +
    '#define TCPIP_SYN_COOKIES_ENABLED           (' + std(cfg.TcpIpSynCookiesEnabled) + ')\n' +
    '#define TCPIP_IDSM_REPORTING_ENABLED        (' + std(cfg.EnableIdsMSecurityReporting) + ')\n\n' +
    '#endif /* TCPIP_CFG_H */\n';
}

function generateTcpIpLcfgC() {
  return '/* Generated by AUTOSAR Classic TcpIp Simulator (R23-11) */\n' +
    '#include "TcpIp.h"\n' +
    '#include "TcpIp_Cfg.h"\n\n' +
    'const TcpIp_LocalAddrConfigType TcpIp_LocalAddrCfg[3] = {\n' +
    '  { 0u, TCPIP_AF_INET,  TCPIP_UNICAST,   ' + cfg.TcpIpAssignmentMethod + ', ' + cfg.TcpIpAssignmentTrigger + ' }, /* ' + cfg.TcpIpStaticIpAddress + ' */\n' +
    '  { 1u, TCPIP_AF_INET,  TCPIP_MULTICAST, TCPIP_IPADDR_ASSIGNMENT_STATIC, TCPIP_AUTOMATIC }, /* 224.224.224.245 */\n' +
    '  { 2u, TCPIP_AF_INET6, TCPIP_UNICAST,   TCPIP_IPADDR_ASSIGNMENT_IPV6_ROUTER, TCPIP_AUTOMATIC }  /* fe80::50 */\n' +
    '};\n\n' +
    'const TcpIp_CtrlConfigType TcpIp_CtrlCfg[1] = {\n' +
    '  {\n' +
    '    .CtrlIdx = 0u,\n' +
    '    .EthIfCtrlId = 0u,\n' +
    '    .Mtu = ' + cfg.TcpIpCtrlMtu + 'u,\n' +
    '    .FramePrioDefault = ' + cfg.TcpIpCtrlFramePrioDefault + 'u,\n' +
    '    .ZeroCopyEnabled = ' + (cfg.TcpIpBufferMemoryPoolZeroCopy ? "TRUE" : "FALSE") + '\n' +
    '  }\n' +
    '};\n\n' +
    'const TcpIp_ConfigType TcpIp_ConfigSet = {\n' +
    '  .NumCtrls = 1u,\n' +
    '  .NumLocalAddrs = 3u,\n' +
    '  .TcpMaxRtx = ' + cfg.TcpIpTcpMaxRtx + 'u,\n' +
    '  .TcpRtoMs = ' + cfg.TcpIpTcpRetransmissionTimeoutMs + 'u,\n' +
    '  .TcpNagle = ' + (cfg.TcpIpTcpNagleEnabled ? "TRUE" : "FALSE") + ',\n' +
    '  .TcpRxWindowMax = ' + cfg.TcpIpTcpReceiveWindowMax + 'u,\n' +
    '  .ArpTimeoutSec = ' + cfg.TcpIpArpTableEntryTimeoutSec + 'u\n' +
    '};\n';
}

function generateTcpIpJson() {
  return JSON.stringify({
    module: "TcpIp",
    moduleId: 170,
    autosarRelease: "R23-11",
    ecucParameters: cfg,
    runtimeSnapshot: sim ? {
      ctrlState: sim.ctrlState,
      phyLinkUp: sim.phyLinkUp,
      regA: hexByte(sim.regA),
      regB: hexByte(sim.regB),
      counters: sim.counters
    } : null
  }, null, 2);
}
