// ================= PART 4: AUTOSAR CANIF SIMULATION ENGINE & CODE GENERATORS =================

const defaultConfig = {
  // Tab 0: CanIfPublicCfg & CanIfPrivateCfg (6)
  CanIfDevErrorDetect: true,
  CanIfPublicTxBuffering: true,
  CanIfPrivateDlcCheck: true,
  CanIfPrivateSoftwareFilterType: "MASK",
  CanIfSetDynamicTxIdApi: true,
  CanIfTriggerTransmitSupport: true,

  // Tab 1: Controller, PduMode & PN (6)
  SelectedControllerId: "0",
  ActiveControllerMode: "CAN_CS_STARTED",
  ActivePduMode: "CANIF_ONLINE",
  CanIfCtrlWakeupSupport: true,
  CanIfPnFilterEnabled: false,
  ActiveBaudRateConfigID: 0,

  // Tab 2: TxPdu & CanIfTxBuffer (6)
  SelectedTxPduId: "1",
  CanIfTxPduCanIdType: "STANDARD_CAN",
  CustomDynamicCanIdHex: "0x18FEF100",
  CanIfTxBufferSize: 4,
  CanIfTxPduPnFilterPdu: false,
  CanIfTxPduTruncation: true,

  // Tab 3: RxPdu & Software Filter (6)
  SelectedRxPduProfile: "FRAME_A",
  CanIfRxPduCanIdMaskHex: "0x7FF",
  CanIfRxPduDataLength: 16,
  InjectedRxDlcLength: 32,
  CanIfRxPduUserRxIndicationUL: "PDUR",
  CanIfRxPduReadDataAndNotif: false,

  // Tab 4: HOH (HTH/HRH) & CAN FD (6)
  CanIfHthHandleType: "BASIC",
  SimulateHthMailboxBusy: false,
  CanIfHrhHandleType: "BASIC",
  CanIfHrhSoftwareFilter: true,
  TxRxPayloadPreviewHex: "11 22 33 44 55 66 77 88",
  CanFdBitRateSwitchBrs: true,

  // Tab 5: Transceiver, Wakeup & DET/IdsM (6)
  ActiveTransceiverMode: "CANTRCV_TRCVMODE_NORMAL",
  CanIfPublicPnSupport: true,
  CanIfPublicWakeupCheckValidSupport: true,
  CanIfWakeupCheckValidByNM: false,
  PassInvalidPduOrCanIdTest: false,
  EnableIdsMSecurityEvents: false
};

let cfg = Object.assign({}, defaultConfig);
let sim = null;

function parseHexNum(str, fallback) {
  if (typeof str === "number" && !Number.isNaN(str)) return str >>> 0;
  const cleaned = String(str || "").trim().replace(/^0x/i, "");
  const parsed = parseInt(cleaned, 16);
  return Number.isNaN(parsed) ? (fallback >>> 0) : (parsed >>> 0);
}

function fmtHex(num, pad) {
  const n = (Number(num) || 0) >>> 0;
  return "0x" + n.toString(16).toUpperCase().padStart(pad || 3, "0");
}

function encodeCanIdType(rawId, idType) {
  const isExt = idType === "EXTENDED_CAN" || idType === "EXTENDED_FD_CAN";
  const isFd = idType === "STANDARD_FD_CAN" || idType === "EXTENDED_FD_CAN";
  const maskedId = (rawId >>> 0) & (isExt ? 0x1FFFFFFF : 0x7FF);
  let val = maskedId >>> 0;
  if (isExt) val = (val | 0x80000000) >>> 0;
  if (isFd) val = (val | 0x40000000) >>> 0;
  return val >>> 0;
}

function decodeCanIdType(encoded32) {
  const v = (encoded32 >>> 0);
  const extBit = (v & 0x80000000) !== 0 ? 1 : 0;
  const fdBit = (v & 0x40000000) !== 0 ? 1 : 0;
  const rsvdBit = (v & 0x20000000) !== 0 ? 1 : 0;
  const rawId = extBit ? (v & 0x1FFFFFFF) : (v & 0x7FF);
  const idType = extBit ? (fdBit ? "EXTENDED_FD_CAN" : "EXTENDED_CAN") : (fdBit ? "STANDARD_FD_CAN" : "STANDARD_CAN");
  return {
    val32: v,
    extBit,
    fdBit,
    rsvdBit,
    rawId,
    idType,
    hex32: fmtHex(v, 8),
    hexId: fmtHex(rawId, extBit ? 8 : 3)
  };
}

function getEffectiveTxPdu(txPduId) {
  const key = String(txPduId !== undefined ? txPduId : cfg.SelectedTxPduId);
  const base = TX_PDUS[key] || TX_PDUS["1"];
  const isSelected = String(base.txPduId) === String(cfg.SelectedTxPduId);
  let idType = base.idType;
  let rawCanId = base.baseCanId;
  let pnFilterPdu = base.pnFilterPdu;
  let hthType = base.hthType;

  if (base.isDynamic && sim && sim.dynamicCanId !== undefined) {
    rawCanId = sim.dynamicCanId;
  }
  if (isSelected) {
    idType = cfg.CanIfTxPduCanIdType || base.idType;
    if (base.isDynamic && cfg.CustomDynamicCanIdHex) {
      rawCanId = parseHexNum(cfg.CustomDynamicCanIdHex, rawCanId);
    }
    pnFilterPdu = Boolean(cfg.CanIfTxPduPnFilterPdu) || base.pnFilterPdu;
    hthType = cfg.CanIfHthHandleType || base.hthType;
  }
  const encodedCanId = encodeCanIdType(rawCanId, idType);
  return Object.assign({}, base, {
    idType,
    rawCanId,
    encodedCanId,
    pnFilterPdu,
    hthType,
    hthId: hthType === "FULL" ? "HTH_0" : "HTH_1",
    payload: isSelected ? (cfg.TxRxPayloadPreviewHex || base.defaultPayload) : base.defaultPayload
  });
}

function createInitialSimState() {
  const dynId = parseHexNum(cfg.CustomDynamicCanIdHex, 0x18FEF100);
  const initPdu = TX_PDUS[String(cfg.SelectedTxPduId)] || TX_PDUS["1"];
  const initEncoded = encodeCanIdType(initPdu.baseCanId, cfg.CanIfTxPduCanIdType || initPdu.idType);
  const s = {
    simTimeMs: 0,
    ctrlMode: cfg.ActiveControllerMode || "CAN_CS_STARTED",
    pduMode: cfg.ActivePduMode || "CANIF_ONLINE",
    trcvMode: cfg.ActiveTransceiverMode || "CANTRCV_TRCVMODE_NORMAL",
    trcvWufFlag: false,
    pnFilterActive: Boolean(cfg.CanIfPnFilterEnabled),
    pnAvailableConfirmed: false,
    txConfirmationState: "CANIF_NO_NOTIFICATION",
    wakeupDetected: false,
    firstValidRxReceived: false,
    wakeupValidated: false,
    dynamicCanId: dynId,
    hth0InFlight: null,
    hth1InFlight: null,
    txBuffer: [],
    lastDecodedCanId32: initEncoded,
    lastTxSummary: null,
    lastRxSummary: null,
    rxReadBuffer: {
      rxPduId: 0,
      available: false,
      notifStatus: "CANIF_NO_NOTIFICATION",
      dlc: 0,
      payload: ""
    },
    lastFrameFlags: {
      isExt: (initEncoded & 0x80000000) !== 0,
      isFd: (initEncoded & 0x40000000) !== 0,
      isBasicHoh: (cfg.CanIfHthHandleType || initPdu.hthType) === "BASIC",
      swFilterOk: false,
      dlcOk: false,
      ulInd: false,
      detErr: false
    },
    counters: {
      txOk: 0,
      txBuffered: 0,
      txDropped: 0,
      txPassiveCbk: 0,
      rxOk: 0,
      rxDroppedFilter: 0,
      rxErrDlc: 0,
      busOffEvents: 0,
      wakeupEvents: 0,
      detErrors: 0,
      runtimeErrors: 0,
      idsmEvents: 0,
      triggerTxCalls: 0
    },
    regA: 0,
    regB: 0,
    prevRegA: 0,
    prevRegB: 0,
    baudrateConfigId: Number(cfg.ActiveBaudRateConfigID) || 0,
    activeArrows: {},
    stepNarrative: {
      title: "Khởi tạo CanIf Stack (SWS_CanIf)",
      inputOrigin: "CanIf_Init(&CanIf_Config) nạp bảng ánh xạ TxPdu / RxPdu / HOH từ Post-Build config.",
      processDetail: "Ctrl0 ở CAN_CS_STARTED, PduMode = CANIF_ONLINE, CanIfTxBuffer rỗng, các HTH_0/HTH_1 sẵn sàng.",
      outputDest: "Sẵn sàng phục vụ PduR/CanTp/CanNm/CanTSyn (Tx) và ngắt CanDrv/CanTrcv (Rx/Wakeup).",
      bitChange: "Thanh A & B giữ giá trị khởi tạo tương ứng cấu hình ECUC hiện tại.",
      apiSignature: "void CanIf_Init(const CanIf_ConfigType* ConfigPtr);",
      resultBadge: "INITIALIZED",
      tone: "ok"
    },
    cCodeSnippet: [
      "/* AUTOSAR Classic R23-11 CanIf Startup */",
      "CanIf_Init(&CanIf_Config);",
      "CanIf_SetControllerMode(0u, CAN_CS_STARTED);",
      "CanIf_SetPduMode(0u, CANIF_ONLINE);"
    ].join("\n"),
    apiTrace: []
  };
  s.regA = computeCtrlPduStatusByte(s);
  s.prevRegA = s.regA;
  s.regB = computeFrameBufferByte(s);
  s.prevRegB = s.regB;
  return s;
}

function computeCtrlPduStatusByte(targetSim) {
  const s = targetSim || sim;
  let b = 0;
  if (s.ctrlMode === "CAN_CS_STARTED") b |= 0x80;
  if (s.ctrlMode === "CAN_CS_SLEEP") b |= 0x40;
  if (s.pduMode === "CANIF_ONLINE") b |= 0x20;
  if (s.pduMode === "CANIF_TX_OFFLINE_ACTIVE") b |= 0x10;
  if (s.pduMode === "CANIF_TX_OFFLINE" || s.pduMode === "CANIF_OFFLINE") b |= 0x08;
  if (s.pnFilterActive) b |= 0x04;
  if (s.txConfirmationState === "CANIF_TX_RX_NOTIFICATION") b |= 0x02;
  if (s.firstValidRxReceived || s.wakeupValidated) b |= 0x01;
  return b & 0xFF;
}

function computeFrameBufferByte(targetSim) {
  const s = targetSim || sim;
  const f = s.lastFrameFlags || {};
  let b = 0;
  if (f.isExt) b |= 0x80;
  if (f.isFd) b |= 0x40;
  if (f.isBasicHoh) b |= 0x20;
  if (s.txBuffer && s.txBuffer.length > 0) b |= 0x10;
  if (f.swFilterOk) b |= 0x08;
  if (f.dlcOk) b |= 0x04;
  if (f.ulInd) b |= 0x02;
  if (f.detErr) b |= 0x01;
  return b & 0xFF;
}

function snapshotRegBefore() {
  sim.prevRegA = sim.regA;
  sim.prevRegB = sim.regB;
}

function updateRegistersAfter() {
  sim.regA = computeCtrlPduStatusByte(sim);
  sim.regB = computeFrameBufferByte(sim);
}

function advanceClock(ms) {
  sim.simTimeMs += (ms || 5);
}

function addTrace(api, summary, tone) {
  sim.apiTrace.unshift({
    ts: sim.simTimeMs + "ms",
    api: api,
    summary: summary,
    tone: tone || "info"
  });
  if (sim.apiTrace.length > 45) sim.apiTrace.length = 45;
}

function sortTxBufferByPriority() {
  // CAN Arbitration: smaller arbitration ID (ignoring bit 31/30 flags, or raw Std before Ext in same numeric prio) wins first
  sim.txBuffer.sort((a, b) => {
    const aPri = a.rawCanId >>> 0;
    const bPri = b.rawCanId >>> 0;
    if (aPri !== bPri) return aPri - bPri;
    return a.seq - b.seq;
  });
}

function reportDetError(apiId, errorCode, apiName, msg) {
  sim.counters.detErrors += 1;
  sim.lastFrameFlags.detErr = true;
  sim.lastFrameFlags.ulInd = false;
  sim.activeArrows = { arr_canif_det: "active-err" };
  addTrace("Det_ReportError(60, " + errorCode + ")", apiName + ": " + msg, "err");
  if (cfg.EnableIdsMSecurityEvents) {
    sim.counters.idsmEvents += 1;
    addTrace("IdsM_SetSecurityEvent()", "CANIF_SEV báo cáo bất thường tới IdsM", "warn");
  }
}

function reportRuntimeError(apiId, errorCode, apiName, msg) {
  sim.counters.runtimeErrors += 1;
  sim.lastFrameFlags.detErr = true;
  sim.activeArrows = { arr_canif_det: "active-err" };
  addTrace("Det_ReportRuntimeError(60, " + errorCode + ")", apiName + ": " + msg, "err");
  if (cfg.EnableIdsMSecurityEvents) {
    sim.counters.idsmEvents += 1;
    addTrace("IdsM_SetSecurityEvent()", "CANIF_SEV_RX_INVALID_LENGTH / ANOMALY", "warn");
  }
}

// ==================== CANIF CORE API SIMULATION FUNCTIONS ====================

function api_CanIf_Transmit(pduIdOverride, opts) {
  snapshotRegBefore();
  advanceClock(5);
  opts = opts || {};
  sim.lastFrameFlags.detErr = false;
  sim.lastFrameFlags.swFilterOk = false;
  sim.lastFrameFlags.dlcOk = false;
  sim.lastFrameFlags.ulInd = false;

  const reqId = (pduIdOverride !== undefined && pduIdOverride !== null)
    ? String(pduIdOverride)
    : (cfg.PassInvalidPduOrCanIdTest && opts.allowInvalidTest ? "999" : String(cfg.SelectedTxPduId));

  // DET Guard: UNINIT / Invalid TxPduId
  if (sim.ctrlMode === "CAN_CS_UNINIT") {
    if (cfg.CanIfDevErrorDetect) reportDetError("0x49", "CANIF_E_UNINIT (0x1E)", "CanIf_Transmit", "CanIf chưa init / Controller ở CAN_CS_UNINIT");
    sim.counters.txDropped += 1;
    sim.stepNarrative = {
      title: "CanIf_Transmit() bị chặn: Controller UNINIT",
      inputOrigin: "Upper Layer (" + cfg.SelectedTxPduId + ") gọi CanIf_Transmit().",
      processDetail: "Kiểm tra trạng thái phát hiện CAN_CS_UNINIT -> DET 0x1E, trả về E_NOT_OK.",
      outputDest: "Không gọi Can_Write(). Tầng trên nhận E_NOT_OK.",
      bitChange: "Bit 0 Thanh B (DET_ERR) bật lên 1.",
      apiSignature: "Std_ReturnType CanIf_Transmit(PduIdType TxPduId, const PduInfoType* PduInfoPtr);",
      resultBadge: "E_NOT_OK (UNINIT)",
      tone: "err"
    };
    updateRegistersAfter();
    return "E_NOT_OK";
  }

  if (!TX_PDUS[reqId]) {
    if (cfg.CanIfDevErrorDetect) reportDetError("0x49", "CANIF_E_INVALID_TXPDUID (0x32)", "CanIf_Transmit", "TxPduId=" + reqId + " không tồn tại trong CanIfTxPduCfg");
    sim.counters.txDropped += 1;
    sim.stepNarrative = {
      title: "Lỗi DET: CANIF_E_INVALID_TXPDUID (0x32)",
      inputOrigin: "Upper Layer truyền TxPduId=" + reqId + " vượt giới hạn cấu hình.",
      processDetail: "CanIfDevErrorDetect=TRUE bắt sai số ngay đầu CanIf_Transmit() và báo Det_ReportError(Module=60).",
      outputDest: "Det_ReportError() & thoát ngay với E_NOT_OK, không đụng vào HTH/CanDrv.",
      bitChange: "Bit 0 Thanh B (DET_ERR = 1).",
      apiSignature: "Det_ReportError(CANIF_MODULE_ID /*60*/, 0, CANIF_TRANSMIT_SID /*0x49*/, CANIF_E_INVALID_TXPDUID);",
      resultBadge: "DET 0x32 -> E_NOT_OK",
      tone: "err"
    };
    sim.cCodeSnippet = "if (TxPduId >= CANIF_NUM_TX_PDUS) {\n  Det_ReportError(60u, 0u, 0x49u, CANIF_E_INVALID_TXPDUID);\n  return E_NOT_OK;\n}";
    updateRegistersAfter();
    return "E_NOT_OK";
  }

  const pdu = getEffectiveTxPdu(reqId);
  const isExt = pdu.idType.indexOf("EXTENDED") === 0;
  const isFd = pdu.idType.indexOf("FD") >= 0;
  const isBasic = pdu.hthType === "BASIC";
  sim.lastDecodedCanId32 = pdu.encodedCanId;
  sim.lastFrameFlags.isExt = isExt;
  sim.lastFrameFlags.isFd = isFd;
  sim.lastFrameFlags.isBasicHoh = isBasic;

  // Check ControllerMode == CAN_CS_STARTED
  if (sim.ctrlMode !== "CAN_CS_STARTED") {
    sim.counters.txDropped += 1;
    sim.activeArrows = { arr_ul_canif: "active-err" };
    if (cfg.CanIfDevErrorDetect) reportDetError("0x49", "CANIF_E_STOPPED (0x46)", "CanIf_Transmit", "Controller0 đang ở " + sim.ctrlMode + ", không phải CAN_CS_STARTED");
    sim.stepNarrative = {
      title: "CanIf_Transmit() từ chối: Controller đang " + sim.ctrlMode,
      inputOrigin: pdu.ul + " gọi CanIf_Transmit(" + pdu.name + ", CAN ID " + fmtHex(pdu.rawCanId, 3) + ").",
      processDetail: "SWS_CanIf_00382 yêu cầu Controller ở CAN_CS_STARTED mới được truyền. Hiện tại là " + sim.ctrlMode + ".",
      outputDest: "Trả về E_NOT_OK cho " + pdu.ul + ", không gọi Can_Write().",
      bitChange: "Bit 7 Thanh A (CS_STARTED) = 0; Bit 0 Thanh B (DET_ERR) = 1.",
      apiSignature: "CanIf_Transmit(" + pdu.txPduId + ", &PduInfo) /* returns E_NOT_OK */",
      resultBadge: "E_NOT_OK (" + sim.ctrlMode + ")",
      tone: "err"
    };
    addTrace("CanIf_Transmit(" + pdu.name + ")", "Từ chối vì CtrlMode=" + sim.ctrlMode + " -> E_NOT_OK", "err");
    updateRegistersAfter();
    return "E_NOT_OK";
  }

  // Check PduMode Gate (SWS_CanIf_00072 / SWS_CanIf_00382)
  if (sim.pduMode === "CANIF_OFFLINE" || sim.pduMode === "CANIF_TX_OFFLINE") {
    sim.counters.txDropped += 1;
    sim.activeArrows = { arr_ul_canif: "active-err" };
    sim.stepNarrative = {
      title: "Cổng PduMode Khóa Chiều Tx (" + sim.pduMode + ")",
      inputOrigin: pdu.ul + " yêu cầu truyền " + pdu.name + " (" + fmtHex(pdu.rawCanId, 3) + ").",
      processDetail: "Cổng truyền bị khóa bởi " + sim.pduMode + ". Mọi bản tin Tx đi xuống đều bị chặn trước Can_Write().",
      outputDest: "Trả về E_NOT_OK lên " + pdu.ul + ". Bus CAN hoàn toàn im lặng ở chiều Tx.",
      bitChange: "Bit 3 Thanh A (TX_OFFLINE = 1).",
      apiSignature: "CanIf_Transmit(" + pdu.txPduId + ", &PduInfo) == E_NOT_OK /* Tx Blocked */",
      resultBadge: "TX BLOCKED (" + sim.pduMode + ")",
      tone: "err"
    };
    sim.cCodeSnippet = "if ((PduMode == CANIF_OFFLINE) || (PduMode == CANIF_TX_OFFLINE)) {\n  return E_NOT_OK; /* SWS_CanIf_00382 */\n}";
    addTrace("CanIf_Transmit(" + pdu.name + ")", "Bị khóa bởi PduMode=" + sim.pduMode + " -> E_NOT_OK", "err");
    updateRegistersAfter();
    return "E_NOT_OK";
  }

  // Special AUTOSAR Mode: CANIF_TX_OFFLINE_ACTIVE (ECU Passive Simulation Mode - SWS_CanIf_00072)
  if (sim.pduMode === "CANIF_TX_OFFLINE_ACTIVE") {
    sim.counters.txPassiveCbk += 1;
    sim.lastFrameFlags.ulInd = true;
    sim.txConfirmationState = "CANIF_TX_RX_NOTIFICATION";
    sim.activeArrows = { arr_ul_canif: "active-warn", arr_canif_passive_cbk: "active-warn" };
    sim.lastTxSummary = {
      txPduId: pdu.txPduId, name: pdu.name, rawCanId: pdu.rawCanId, encodedCanId: pdu.encodedCanId,
      idType: pdu.idType, hthId: pdu.hthId, hthType: pdu.hthType, dlc: pdu.dlc,
      payload: pdu.payload, result: "PASSIVE_VIRTUAL_CONFIRM",
      note: "TX_OFFLINE_ACTIVE: Bỏ qua Can_Write(), bắn ảo TxConfirmation(E_OK)!"
    };
    sim.stepNarrative = {
      title: "CANIF_TX_OFFLINE_ACTIVE: Giả Lập TxConfirmation Ảo (SWS_CanIf_00072)",
      inputOrigin: pdu.ul + " gọi CanIf_Transmit(" + pdu.name + ").",
      processDetail: "ECU đang ở CANIF_TX_OFFLINE_ACTIVE (ECU Passive Mode): CanIf KHÔNG gọi Can_Write() xuống CanDrv để không làm nhiễu bus, nhưng giả lập thành công để Com/PduR không bị timeout.",
      outputDest: "Bắn ngay callback ảo " + pdu.ulCbk + "(" + pdu.txPduId + ", E_OK) lên tầng trên & trả về E_OK.",
      bitChange: "Bit 4 Thanh A (TX_OFF_ACTV=1), Bit 1 (TX_NOTF=1), Bit 1 Thanh B (UL_IND=1).",
      apiSignature: "CanIf_Transmit(" + pdu.txPduId + ") /* skip Can_Write() */ -> " + pdu.ulCbk + "(" + pdu.txPduId + ", E_OK);",
      resultBadge: "VIRTUAL TX_CONFIRM",
      tone: "warn"
    };
    sim.cCodeSnippet = "if (CtrlState.PduMode == CANIF_TX_OFFLINE_ACTIVE) {\n  /* SWS_CanIf_00072: Do NOT call Can_Write() */\n  " + pdu.ulCbk + "(" + pdu.txPduId + "u, E_OK);\n  return E_OK;\n}";
    addTrace("CanIf_Transmit(" + pdu.name + ")", "TX_OFFLINE_ACTIVE -> Bắn ảo " + pdu.ulCbk + "(E_OK)", "warn");
    updateRegistersAfter();
    return "E_OK";
  }

  // Partial Networking Tx Filter Gate (SWS_CanIf_00750)
  if (sim.pnFilterActive && !pdu.pnFilterPdu) {
    sim.counters.txDropped += 1;
    sim.activeArrows = { arr_ul_canif: "active-err" };
    sim.stepNarrative = {
      title: "Bị Chặn Bởi Bộ Lọc Truyền Partial Networking (PN Tx Filter)",
      inputOrigin: pdu.ul + " gọi CanIf_Transmit(" + pdu.name + ") với CanIfTxPduPnFilterPdu = FALSE.",
      processDetail: "Controller0 đang khóa CanIfPnFilterEnabled=TRUE: Chỉ L-PDU nào đánh dấu CanIfTxPduPnFilterPdu=TRUE (như CanNm TxPdu_0) mới được phép truyền khi chưa có xác nhận PN.",
      outputDest: "Chặn bản tin ứng dụng " + pdu.name + ", trả về E_NOT_OK.",
      bitChange: "Bit 2 Thanh A (PN_TX_FILT = 1). Cần gọi CanIf_ConfirmPnAvailability() hoặc TxPdu_0.",
      apiSignature: "if (PnTxFilterActive && !TxPduCfg.PnFilterPdu) return E_NOT_OK; /* SWS_CanIf_00750 */",
      resultBadge: "BLOCKED BY PN FILTER",
      tone: "err"
    };
    sim.cCodeSnippet = "/* SWS_CanIf_00750 */\nif (CanIf_PnTxFilter[CtrlId] && !TxPduCfg->CanIfTxPduPnFilterPdu) {\n  return E_NOT_OK;\n}";
    addTrace("CanIf_Transmit(" + pdu.name + ")", "Bị PN Tx Filter chặn (PnFilterPdu=FALSE) -> E_NOT_OK", "err");
    updateRegistersAfter();
    return "E_NOT_OK";
  }

  // Length Check & Truncation (SWS_CanIf_00893 / Runtime Error 0x33 CANIF_E_TXPDU_LENGTH_EXCEEDED)
  let effectiveDlc = opts.forceLen !== undefined ? opts.forceLen : pdu.dlc;
  let truncNote = "";
  if (effectiveDlc > pdu.maxLen) {
    reportRuntimeError("0x49", "CANIF_E_TXPDU_LENGTH_EXCEEDED (0x33)", "CanIf_Transmit",
      pdu.name + " dài " + effectiveDlc + "B > maxLen " + pdu.maxLen + "B");
    if (cfg.CanIfTxPduTruncation) {
      effectiveDlc = pdu.maxLen;
      truncNote = " (Đã cắt ngắn về " + effectiveDlc + "B theo CanIfTxPduTruncation=TRUE)";
    } else {
      sim.counters.txDropped += 1;
      sim.stepNarrative = {
        title: "Lỗi Độ Dài Tx: CANIF_E_TXPDU_LENGTH_EXCEEDED (0x33)",
        inputOrigin: pdu.ul + " gửi PduInfo->SduLength = " + opts.forceLen + "B (> maxLen=" + pdu.maxLen + "B).",
        processDetail: "CanIfTxPduTruncation=FALSE nên CanIf không cắt bớt mà báo Runtime Error 0x33 và từ chối.",
        outputDest: "Det_ReportRuntimeError(0x33) & trả về E_NOT_OK.",
        bitChange: "Bit 0 Thanh B (DET_ERR = 1).",
        apiSignature: "Det_ReportRuntimeError(60, 0, 0x49, CANIF_E_TXPDU_LENGTH_EXCEEDED);",
        resultBadge: "ERR 0x33 -> E_NOT_OK",
        tone: "err"
      };
      updateRegistersAfter();
      return "E_NOT_OK";
    }
  }

  // TriggerTransmit Pull Data if configured on this TxPdu (SWS_CanIf_00883)
  let payloadOut = pdu.payload;
  let trigUsed = false;
  if (pdu.isTriggerTransmit && cfg.CanIfTriggerTransmitSupport) {
    sim.counters.triggerTxCalls += 1;
    trigUsed = true;
    payloadOut = "TRG_" + fmtHex(sim.simTimeMs & 0xFF, 2) + " " + pdu.payload.slice(0, 14);
    addTrace("CanIf_TriggerTransmit(" + pdu.txPduId + ")", "Gọi PduR_CanIfTriggerTransmit() lấy payload mới sát giờ phát", "ok");
  }

  // Route to HTH_0 (FullCAN) or HTH_1 (BasicCAN)
  const frameObj = {
    seq: sim.simTimeMs,
    txPduId: pdu.txPduId,
    name: pdu.name,
    rawCanId: pdu.rawCanId,
    encodedCanId: pdu.encodedCanId,
    idType: pdu.idType,
    hthId: pdu.hthId,
    hthType: pdu.hthType,
    dlc: effectiveDlc,
    brs: isFd && Boolean(cfg.CanFdBitRateSwitchBrs),
    payload: payloadOut,
    ul: pdu.ul,
    ulCbk: pdu.ulCbk
  };

  const isHthBusy = (pdu.hthId === "HTH_1")
    ? (Boolean(cfg.SimulateHthMailboxBusy) || sim.hth1InFlight !== null)
    : (sim.hth0InFlight !== null);

  if (!isHthBusy) {
    if (pdu.hthId === "HTH_0") sim.hth0InFlight = frameObj;
    else sim.hth1InFlight = frameObj;
    sim.counters.txOk += 1;
    sim.activeArrows = { arr_rte_ul: "active", arr_ul_canif: "active", arr_canif_candrv: "active", arr_drv_bus: "active" };
    if (trigUsed) sim.activeArrows.arr_canif_ul = "active-cbk";
    sim.lastTxSummary = Object.assign({}, frameObj, {
      result: "CAN_OK",
      note: "Can_Write(" + pdu.hthId + ") trả về CAN_OK" + truncNote
    });
    sim.stepNarrative = {
      title: "CanIf_Transmit() ➔ Can_Write(" + pdu.hthId + " " + pdu.hthType + "CAN) = CAN_OK",
      inputOrigin: pdu.ul + " cung cấp " + pdu.name + " (ID " + fmtHex(pdu.rawCanId, isExt ? 8 : 3) + ", " + effectiveDlc + "B" + (frameObj.brs ? " FD+BRS" : "") + ").",
      processDetail: "CanIf mã hóa Can_IdType 32-bit = " + fmtHex(pdu.encodedCanId, 8) + " (B31=" + (isExt ? 1 : 0) + ", B30=" + (isFd ? 1 : 0) + "), ánh xạ sang " + pdu.hthId + " (" + pdu.hthType + ") và gọi MCAL Can_Write()." + truncNote,
      outputDest: "Khung CAN đang chiếm " + pdu.hthId + " để phát lên bus. Chờ ngắt CanIf_TxConfirmation(" + pdu.txPduId + ").",
      bitChange: "B7(EXT)=" + (isExt ? 1 : 0) + ", B6(FD)=" + (isFd ? 1 : 0) + ", B5(BASIC)=" + (isBasic ? 1 : 0) + ".",
      apiSignature: "Can_Write(" + pdu.hthId + ", &(Can_PduType){swPduHandle=" + pdu.txPduId + ", id=" + fmtHex(pdu.encodedCanId, 8) + ", length=" + effectiveDlc + "});",
      resultBadge: "CAN_OK (" + pdu.hthId + ")",
      tone: "ok"
    };
    sim.cCodeSnippet = [
      "/* CanIf_Transmit() -> Can_Write() */",
      "Can_PduType canPdu = {",
      "  .swPduHandle = " + pdu.txPduId + "u,",
      "  .id          = " + fmtHex(pdu.encodedCanId, 8) + "u, /* B31=" + (isExt ? 1 : 0) + " EXT, B30=" + (isFd ? 1 : 0) + " FD */",
      "  .length      = " + effectiveDlc + "u,",
      "  .sdu         = PduInfoPtr->SduDataPtr",
      "};",
      "if (Can_Write(" + pdu.hthId + ", &canPdu) == CAN_OK) return E_OK;"
    ].join("\n");
    addTrace("CanIf_Transmit(" + pdu.name + ")", "Can_Write(" + pdu.hthId + ", " + fmtHex(pdu.encodedCanId, 8) + ", " + effectiveDlc + "B) = CAN_OK" + truncNote, "ok");
    updateRegistersAfter();
    return "E_OK";
  }

  // Mailbox is BUSY -> Try CanIfTxBuffer (BasicCAN only when CanIfPublicTxBuffering is ON)
  const bufCap = Number(cfg.CanIfTxBufferSize) || 0;
  if (isBasic && cfg.CanIfPublicTxBuffering && bufCap > 0) {
    const existingIdx = sim.txBuffer.findIndex(item => item.txPduId === frameObj.txPduId);
    let actionNote = "";
    if (existingIdx >= 0) {
      // SWS_CanIf_00068: Same TxPduId overwrites latest data in CanIfTxBuffer
      sim.txBuffer[existingIdx] = frameObj;
      actionNote = "Ghi đè dữ liệu mới nhất cho TxPduId=" + frameObj.txPduId + " (SWS_CanIf_00068).";
    } else if (sim.txBuffer.length < bufCap) {
      sim.txBuffer.push(frameObj);
      sim.counters.txBuffered += 1;
      sortTxBufferByPriority();
      actionNote = "Đưa vào CanIfTxBuffer (" + sim.txBuffer.length + "/" + bufCap + "), sắp xếp ưu tiên CAN ID!";
    } else {
      // Buffer full: only evict lower priority (higher rawCanId) if this frame has higher priority
      sortTxBufferByPriority();
      const worst = sim.txBuffer[sim.txBuffer.length - 1];
      if (frameObj.rawCanId < worst.rawCanId) {
        sim.txBuffer[sim.txBuffer.length - 1] = frameObj;
        sortTxBufferByPriority();
        sim.counters.txDropped += 1;
        actionNote = "Buffer đầy: thay thế " + worst.name + " (" + fmtHex(worst.rawCanId, 3) + ") bằng ID ưu tiên cao hơn " + fmtHex(frameObj.rawCanId, 3) + ".";
      } else {
        sim.counters.txDropped += 1;
        sim.activeArrows = { arr_ul_canif: "active-err" };
        sim.stepNarrative = {
          title: "CanIfTxBuffer Đầy (" + sim.txBuffer.length + "/" + bufCap + ") -> Trả Về E_NOT_OK",
          inputOrigin: pdu.ul + " gửi " + pdu.name + " khi " + pdu.hthId + " đang BUSY và hàng đợi đầy.",
          processDetail: "Ưu tiên " + fmtHex(frameObj.rawCanId, 3) + " không cao hơn các phần tử đang chờ trong CanIfTxBuffer.",
          outputDest: "Hủy yêu cầu và trả về E_NOT_OK cho " + pdu.ul + ".",
          bitChange: "Bit 4 Thanh B (TX_BUFFERED = 1).",
          apiSignature: "CanIf_Transmit(" + pdu.txPduId + ") == E_NOT_OK /* Buffer Full */",
          resultBadge: "BUFFER FULL",
          tone: "err"
        };
        addTrace("CanIf_Transmit(" + pdu.name + ")", "HTH BUSY + CanIfTxBuffer đầy -> E_NOT_OK", "err");
        updateRegistersAfter();
        return "E_NOT_OK";
      }
    }

    sim.activeArrows = { arr_ul_canif: "active-warn", arr_rte_ul: "active-warn", arr_canif_candrv: "active-warn" };
    sim.lastTxSummary = Object.assign({}, frameObj, {
      result: "BUFFERED_IN_CANIF",
      note: actionNote
    });
    sim.stepNarrative = {
      title: "Can_Write(" + pdu.hthId + ") = CAN_BUSY ➔ Xếp Hàng Ưu Tiên CanIfTxBuffer",
      inputOrigin: pdu.ul + " gọi CanIf_Transmit(" + pdu.name + ", ID " + fmtHex(pdu.rawCanId, isExt ? 8 : 3) + ").",
      processDetail: "Mailbox HTH_1 đang bận (CAN_BUSY). Nhờ CanIfPublicTxBuffering=TRUE + SchM ExclusiveArea, CanIf lưu bản tin vào CanIfTxBuffer (" + sim.txBuffer.length + "/" + bufCap + ") và sắp xếp ID nhỏ đứng đầu chống Inner Priority Inversion.",
      outputDest: "Vẫn trả về E_OK cho " + pdu.ul + ". Sẽ tự động xả khi có ngắt CanIf_TxConfirmation().",
      bitChange: "Bit 4 Thanh B (TX_BUFFERED = 1), Bit 5 (BASIC_HOH = 1).",
      apiSignature: "SchM_Enter_CanIf_EA_0(); /* Queue TxBuf sorted by CanId */ SchM_Exit_CanIf_EA_0();",
      resultBadge: "BUFFERED (" + sim.txBuffer.length + "/" + bufCap + ")",
      tone: "warn"
    };
    sim.cCodeSnippet = [
      "if (Can_Write(HTH_1, &canPdu) == CAN_BUSY) {",
      "  SchM_Enter_CanIf_EXCLUSIVE_AREA_0();",
      "  CanIf_TxBuffer_EnqueueSorted(HTH_1, &canPdu); /* Pri by CAN ID */",
      "  SchM_Exit_CanIf_EXCLUSIVE_AREA_0();",
      "  return E_OK;",
      "}"
    ].join("\n");
    addTrace("CanIf_Transmit(" + pdu.name + ")", "CAN_BUSY -> Xếp hàng CanIfTxBuffer [" + sim.txBuffer.map(x => fmtHex(x.rawCanId, 3)).join(", ") + "]", "warn");
    updateRegistersAfter();
    return "E_OK";
  }

  // Buffering disabled or FullCAN busy -> drop
  sim.counters.txDropped += 1;
  sim.activeArrows = { arr_ul_canif: "active-err", arr_canif_candrv: "active-err" };
  sim.stepNarrative = {
    title: "Can_Write(" + pdu.hthId + ") = CAN_BUSY & Không Có CanIfTxBuffer ➔ E_NOT_OK",
    inputOrigin: pdu.ul + " gửi " + pdu.name + " khi " + pdu.hthId + " đang bận.",
    processDetail: isBasic ? "CanIfPublicTxBuffering=FALSE (hoặc BufferSize=0) nên CanIf không giữ bản tin." : "FullCAN HTH_0 là hộp thư 1:1 không dùng CanIfTxBuffer.",
    outputDest: "Trả ngay E_NOT_OK lên " + pdu.ul + ".",
    bitChange: "Thanh B giữ nguyên trạng thái.",
    apiSignature: "CanIf_Transmit(" + pdu.txPduId + ") == E_NOT_OK /* CAN_BUSY without buffer */",
    resultBadge: "CAN_BUSY -> E_NOT_OK",
    tone: "err"
  };
  addTrace("CanIf_Transmit(" + pdu.name + ")", "CAN_BUSY & Buffering tắt -> E_NOT_OK", "err");
  updateRegistersAfter();
  return "E_NOT_OK";
}

function api_CanIf_TxConfirmation(canTxPduIdOverride) {
  snapshotRegBefore();
  advanceClock(3);
  sim.lastFrameFlags.detErr = false;

  if (sim.ctrlMode === "CAN_CS_UNINIT") {
    if (cfg.CanIfDevErrorDetect) reportDetError("0x13", "CANIF_E_UNINIT (0x1E)", "CanIf_TxConfirmation", "Bỏ qua TxConfirmation khi UNINIT");
    updateRegistersAfter();
    return;
  }

  let finishedFrame = null;
  if (canTxPduIdOverride !== undefined && canTxPduIdOverride !== null) {
    const idStr = String(canTxPduIdOverride);
    if (sim.hth0InFlight && String(sim.hth0InFlight.txPduId) === idStr) {
      finishedFrame = sim.hth0InFlight;
      sim.hth0InFlight = null;
    } else if (sim.hth1InFlight && String(sim.hth1InFlight.txPduId) === idStr) {
      finishedFrame = sim.hth1InFlight;
      sim.hth1InFlight = null;
    }
  }
  if (!finishedFrame) {
    if (sim.hth1InFlight) {
      finishedFrame = sim.hth1InFlight;
      sim.hth1InFlight = null;
    } else if (sim.hth0InFlight) {
      finishedFrame = sim.hth0InFlight;
      sim.hth0InFlight = null;
    }
  }

  // If user pressed HW TxConfirm with nothing in flight, confirm selected PDU & still attempt buffer drain
  if (!finishedFrame) {
    if (sim.txBuffer.length > 0 && !cfg.SimulateHthMailboxBusy) {
      finishedFrame = { txPduId: sim.txBuffer[0].txPduId, name: "Mailbox_Idle_Drain", ul: sim.txBuffer[0].ul, ulCbk: sim.txBuffer[0].ulCbk, hthId: "HTH_1", rawCanId: sim.txBuffer[0].rawCanId };
    } else {
      const pdu = getEffectiveTxPdu(cfg.SelectedTxPduId);
      finishedFrame = { txPduId: pdu.txPduId, name: pdu.name, ul: pdu.ul, ulCbk: pdu.ulCbk, hthId: pdu.hthId, rawCanId: pdu.rawCanId };
    }
  }

  // Update TxConfirmationState & PN check (SWS_CanIf_00734 / 00751)
  sim.txConfirmationState = "CANIF_TX_RX_NOTIFICATION";
  if (sim.pnFilterActive && finishedFrame.txPduId === 0) {
    sim.pnFilterActive = false;
    cfg.CanIfPnFilterEnabled = false;
    sim.pnAvailableConfirmed = true;
  }

  sim.lastFrameFlags.ulInd = true;
  sim.activeArrows = { arr_candrv_canif: "active-cbk", arr_canif_ul: "active-cbk" };

  // Auto-drain CanIfTxBuffer if HTH_1 is now free and SimulateHthMailboxBusy is turned off
  let drainedFrame = null;
  if (finishedFrame.hthId === "HTH_1" && sim.txBuffer.length > 0) {
    // Clearing manual busy flag allows drain to succeed smoothly when user tests TxConfirm drain
    if (cfg.SimulateHthMailboxBusy) {
      cfg.SimulateHthMailboxBusy = false;
    }
    sortTxBufferByPriority();
    drainedFrame = sim.txBuffer.shift();
    sim.hth1InFlight = drainedFrame;
    sim.counters.txOk += 1;
    sim.activeArrows.arr_canif_candrv = "active";
    sim.activeArrows.arr_drv_bus = "active";
  } else if (sim.hth1InFlight === null && sim.txBuffer.length > 0 && !cfg.SimulateHthMailboxBusy) {
    sortTxBufferByPriority();
    drainedFrame = sim.txBuffer.shift();
    sim.hth1InFlight = drainedFrame;
    sim.counters.txOk += 1;
    sim.activeArrows.arr_canif_candrv = "active";
  }

  const drainTxt = drainedFrame
    ? " Đồng thời tự động xả phần tử ưu tiên cao nhất " + drainedFrame.name + " (" + fmtHex(drainedFrame.rawCanId, 3) + ") từ CanIfTxBuffer sang Can_Write(HTH_1)!"
    : " CanIfTxBuffer rỗng hoặc chưa xả thêm.";

  sim.stepNarrative = {
    title: "CanIf_TxConfirmation(" + finishedFrame.txPduId + ") + Xả CanIfTxBuffer",
    inputOrigin: "CanDrv ISR báo khung swPduHandle=" + finishedFrame.txPduId + " (" + finishedFrame.name + ") đã ACK thành công trên bus CAN.",
    processDetail: "CanIf cập nhật CanIf_GetTxConfirmationState() = CANIF_TX_RX_NOTIFICATION và gọi " + finishedFrame.ulCbk + "(" + finishedFrame.txPduId + ", E_OK)." + drainTxt,
    outputDest: finishedFrame.ulCbk + "() lên " + finishedFrame.ul + (drainedFrame ? " & Can_Write(HTH_1) cho " + drainedFrame.name : ""),
    bitChange: "Bit 1 Thanh A (TX_NOTF=1), Bit 1 Thanh B (UL_IND=1)" + (drainedFrame ? ", Bit 4 Thanh B phản ánh số slot còn lại." : "."),
    apiSignature: "CanIf_TxConfirmation(" + finishedFrame.txPduId + "); -> " + finishedFrame.ulCbk + "(" + finishedFrame.txPduId + ", E_OK);",
    resultBadge: drainedFrame ? "CONFIRMED & DRAINED" : "TX CONFIRMED",
    tone: "ok"
  };

  sim.cCodeSnippet = [
    "void CanIf_TxConfirmation(PduIdType CanTxPduId) {",
    "  CanIf_CtrlTxConfState[CtrlId] = CANIF_TX_RX_NOTIFICATION;",
    "  " + finishedFrame.ulCbk + "(CanTxPduId, E_OK);",
    drainedFrame
      ? "  /* Auto-drain highest priority queued frame: " + drainedFrame.name + " */\n  Can_Write(HTH_1, &nextPduFromTxBuffer);"
      : "  /* TxBuffer empty -> HTH_1 stays FREE */",
    "}"
  ].join("\n");

  addTrace("CanIf_TxConfirmation(" + finishedFrame.txPduId + ")",
    "Báo " + finishedFrame.ulCbk + "(E_OK)" + (drainedFrame ? " + Xả " + drainedFrame.name + " (" + fmtHex(drainedFrame.rawCanId, 3) + ")" : ""),
    "ok");
  updateRegistersAfter();
}

function api_CanIf_RxIndication(profileKeyOverride, opts) {
  snapshotRegBefore();
  advanceClock(4);
  opts = opts || {};
  const profKey = profileKeyOverride || cfg.SelectedRxPduProfile || "FRAME_A";
  const prof = RX_PROFILES[profKey] || RX_PROFILES.FRAME_A;

  // Read live overridden values when inspecting current UI selection
  const useLiveCfg = (!profileKeyOverride || profileKeyOverride === cfg.SelectedRxPduProfile);
  const actualDlc = opts.forceDlc !== undefined ? opts.forceDlc : (useLiveCfg ? Number(cfg.InjectedRxDlcLength) : prof.dlc);
  const minDlc = useLiveCfg ? Number(cfg.CanIfRxPduDataLength) : prof.minDlc;
  const maskHexStr = useLiveCfg ? cfg.CanIfRxPduCanIdMaskHex : prof.mask;
  const maskVal = parseHexNum(maskHexStr, 0x7FF);
  const hrhType = useLiveCfg ? (cfg.CanIfHrhHandleType || prof.hrhType) : prof.hrhType;
  const swFilterOn = (hrhType === "BASIC") && Boolean(cfg.CanIfHrhSoftwareFilter);
  const isExt = prof.idType.indexOf("EXTENDED") === 0;
  const isFd = prof.idType.indexOf("FD") >= 0;
  const encodedId = encodeCanIdType(prof.canId, prof.idType);

  sim.lastDecodedCanId32 = encodedId;
  sim.lastFrameFlags.isExt = isExt;
  sim.lastFrameFlags.isFd = isFd;
  sim.lastFrameFlags.isBasicHoh = (hrhType === "BASIC");
  sim.lastFrameFlags.detErr = false;
  sim.lastFrameFlags.swFilterOk = false;
  sim.lastFrameFlags.dlcOk = false;
  sim.lastFrameFlags.ulInd = false;

  // Check ControllerMode == CAN_CS_STARTED
  if (sim.ctrlMode !== "CAN_CS_STARTED") {
    sim.counters.rxDroppedFilter += 1;
    sim.activeArrows = { arr_candrv_canif: "active-err" };
    sim.lastRxSummary = {
      profileKey: profKey, rxPduId: null, name: "Dropped (Ctrl=" + sim.ctrlMode + ")",
      rawCanId: prof.canId, encodedCanId: encodedId, idType: prof.idType, hrhId: prof.hrhId, hrhType,
      dlc: actualDlc, minDlc, mask: fmtHex(maskVal, 3), swFilterPassed: false, dlcCheckPassed: false,
      ul: prof.ul, ulCbk: "-", payload: prof.payload, dropReason: "ControllerMode=" + sim.ctrlMode
    };
    sim.stepNarrative = {
      title: "CanIf_RxIndication() bỏ qua: Controller đang " + sim.ctrlMode,
      inputOrigin: "CanDrv ISR nhận khung CAN ID " + fmtHex(prof.canId, 3) + ".",
      processDetail: "Controller chưa ở CAN_CS_STARTED nên CanIf bỏ qua bản tin nhận.",
      outputDest: "Drop khung, không chuyển lên tầng trên.",
      bitChange: "Bit 7 Thanh A (CS_STARTED) = 0.",
      apiSignature: "CanIf_RxIndication(&Mailbox, &PduInfo) /* Ignored: !CAN_CS_STARTED */",
      resultBadge: "RX DROPPED (" + sim.ctrlMode + ")",
      tone: "err"
    };
    addTrace("CanIf_RxIndication(" + fmtHex(prof.canId, 3) + ")", "Bị bỏ qua do CtrlMode=" + sim.ctrlMode, "err");
    updateRegistersAfter();
    return;
  }

  // Check PduMode != CANIF_OFFLINE (Note: TX_OFFLINE & TX_OFFLINE_ACTIVE still ALLOW RX!)
  if (sim.pduMode === "CANIF_OFFLINE") {
    sim.counters.rxDroppedFilter += 1;
    sim.activeArrows = { arr_candrv_canif: "active-err" };
    sim.lastRxSummary = {
      profileKey: profKey, rxPduId: null, name: "Dropped (PduMode=CANIF_OFFLINE)",
      rawCanId: prof.canId, encodedCanId: encodedId, idType: prof.idType, hrhId: prof.hrhId, hrhType,
      dlc: actualDlc, minDlc, mask: fmtHex(maskVal, 3), swFilterPassed: false, dlcCheckPassed: false,
      ul: prof.ul, ulCbk: "-", payload: prof.payload, dropReason: "PduMode = CANIF_OFFLINE khóa cả Rx & Tx"
    };
    sim.stepNarrative = {
      title: "Cổng PduMode CANIF_OFFLINE Khóa Chiều Nhận Rx",
      inputOrigin: "Bus CAN nhận khung " + fmtHex(prof.canId, 3) + " vào " + prof.hrhId + ".",
      processDetail: "Khác với CANIF_TX_OFFLINE (vẫn cho phép nhận Rx để duy trì NM/Chẩn đoán), CANIF_OFFLINE đóng cả chiều nhận lẫn phát (SWS_CanIf_00073).",
      outputDest: "Hủy bản tin ngay tại cổng PduMode. Không đưa lên tầng trên.",
      bitChange: "Bit 3 Thanh A (TX_OFFLINE=1), PduMode=CANIF_OFFLINE.",
      apiSignature: "if (PduMode == CANIF_OFFLINE) { /* Discard Rx SWS_CanIf_00073 */ return; }",
      resultBadge: "RX BLOCKED (OFFLINE)",
      tone: "err"
    };
    addTrace("CanIf_RxIndication(" + fmtHex(prof.canId, 3) + ")", "Chặn Rx bởi PduMode=CANIF_OFFLINE", "err");
    updateRegistersAfter();
    return;
  }

  // Step 1: Software Acceptance Filter (HRH -> RxPduId)
  let matchedRx = null;
  if (swFilterOn || profKey === "FRAME_E") {
    for (let i = 0; i < RX_PDUS.length; i++) {
      const rp = RX_PDUS[i];
      // Use configured mask if matching currently focused profile target, else rp.mask
      const effMask = (rp.canId === prof.canId && useLiveCfg) ? maskVal : rp.mask;
      if (((prof.canId & effMask) >>> 0) === ((rp.canId & effMask) >>> 0)) {
        matchedRx = rp;
        break;
      }
    }
  } else {
    // FullCAN or SwFilter disabled: find exact or closest RxPdu
    matchedRx = RX_PDUS.find(r => (prof.canId & r.mask) === (r.canId & r.mask)) || null;
  }

  if (!matchedRx) {
    sim.counters.rxDroppedFilter += 1;
    sim.activeArrows = { arr_drv_bus: "active-warn", arr_candrv_canif: "active-warn" };
    sim.lastRxSummary = {
      profileKey: profKey, rxPduId: null, name: "Không Khớp SwFilter",
      rawCanId: prof.canId, encodedCanId: encodedId, idType: prof.idType, hrhId: prof.hrhId, hrhType,
      dlc: actualDlc, minDlc, mask: fmtHex(maskVal, 3), swFilterPassed: false, dlcCheckPassed: false,
      ul: "-", ulCbk: "DROPPED", payload: prof.payload,
      dropReason: "Software Filter (" + cfg.CanIfPrivateSoftwareFilterType + ") loại bỏ ID " + fmtHex(prof.canId, 3) + " (không có trong bảng CanIfRxPduCfg)"
    };
    sim.stepNarrative = {
      title: "Software Filter Loại Bỏ Khung Lạ " + fmtHex(prof.canId, 3),
      inputOrigin: "BasicCAN " + prof.hrhId + " đón tất cả khung trên bus và đưa CAN ID " + fmtHex(prof.canId, 3) + " vào CanIf_RxIndication().",
      processDetail: "Thuật toán " + cfg.CanIfPrivateSoftwareFilterType + " so khớp (RxCanId & Mask) với toàn bộ CanIfRxPduCfg [0x120, 0x7E0, 0x500/0x700, 0x190] ➔ KHÔNG KHỚP!",
      outputDest: "Hủy im lặng tại CanIf (không gọi DET, không làm phiền CPU tầng PduR/COM).",
      bitChange: "Bit 3 Thanh B (SW_FLT_PASS = 0).",
      apiSignature: "CanIf_SwFilter_" + cfg.CanIfPrivateSoftwareFilterType + "(" + fmtHex(prof.canId, 3) + ") == NOT_FOUND;",
      resultBadge: "FILTER DROPPED",
      tone: "warn"
    };
    sim.cCodeSnippet = [
      "/* CanIf_RxIndication() - Step 1: Software Acceptance Filter */",
      "/* Algo: " + cfg.CanIfPrivateSoftwareFilterType + " | RxCanId = " + fmtHex(prof.canId, 3) + " */",
      "if (CanIf_FindRxPduByCanId(Mailbox->Hoh, " + fmtHex(prof.canId, 3) + "u, &rxPduCfg) == E_NOT_OK) {",
      "  return; /* Khung không dành cho ECU này -> drop nhẹ nhàng */",
      "}"
    ].join("\n");
    addTrace("CanIf_RxIndication(" + fmtHex(prof.canId, 3) + ")", "Software Filter (" + cfg.CanIfPrivateSoftwareFilterType + ") loại bỏ khung lạ", "warn");
    updateRegistersAfter();
    return;
  }

  sim.lastFrameFlags.swFilterOk = true;
  const effMinDlc = useLiveCfg ? minDlc : matchedRx.minDlc;
  const effUl = (useLiveCfg && profKey === "FRAME_A" && cfg.CanIfRxPduUserRxIndicationUL)
    ? cfg.CanIfRxPduUserRxIndicationUL : matchedRx.ul;
  const ulCbkMap = {
    PDUR: "PduR_CanIfRxIndication",
    CANTP: "CanTp_RxIndication",
    CANNM: "CanNm_RxIndication",
    CAN_TSYN: "CanTSyn_RxIndication",
    CDD: "CddCan_RxIndication"
  };
  const effUlCbk = ulCbkMap[effUl] || matchedRx.ulCbk;

  // Step 2: DLC Check (SWS_CanIf_00026)
  if (cfg.CanIfPrivateDlcCheck && actualDlc < effMinDlc) {
    sim.counters.rxErrDlc += 1;
    reportRuntimeError("0x14", "CANIF_E_INVALID_DATA_LENGTH (0x32)", "CanIf_RxIndication",
      matchedRx.name + ": CanDlc=" + actualDlc + "B < CanIfRxPduDataLength=" + effMinDlc + "B");
    sim.activeArrows = { arr_drv_bus: "active-err", arr_candrv_canif: "active-err", arr_canif_det: "active-err" };
    sim.lastRxSummary = {
      profileKey: profKey, rxPduId: matchedRx.rxPduId, name: matchedRx.name,
      rawCanId: prof.canId, encodedCanId: encodedId, idType: prof.idType, hrhId: prof.hrhId, hrhType,
      dlc: actualDlc, minDlc: effMinDlc, mask: fmtHex(maskVal, 3), swFilterPassed: true, dlcCheckPassed: false,
      ul: effUl, ulCbk: "ABORTED (0x32)", payload: prof.payload,
      dropReason: "CanDlc (" + actualDlc + "B) < CanIfRxPduDataLength (" + effMinDlc + "B)"
    };
    sim.stepNarrative = {
      title: "Lỗi DLC Check (0x32): Ngăn Tầng Trên Đọc Vùng Nhớ Rác!",
      inputOrigin: "Khung " + fmtHex(prof.canId, 3) + " vượt qua SwFilter tới " + matchedRx.name + ", nhưng CanDlc thực tế = " + actualDlc + "B < Min = " + effMinDlc + "B.",
      processDetail: "CanIfPrivateDlcCheck=TRUE phát hiện thiếu dữ liệu! Hủy khung ngay lập tức, gọi Det_ReportRuntimeError(CANIF_E_INVALID_DATA_LENGTH 0x32)" + (cfg.EnableIdsMSecurityEvents ? " + báo an ninh IdsM." : "."),
      outputDest: "CHẶN đứng không gọi " + effUlCbk + "(), bảo vệ COM/PduR khỏi out-of-bounds read.",
      bitChange: "Bit 3 (SW_FLT_PASS=1), Bit 2 (DLC_CHK_OK=0), Bit 0 (DET_ERR=1).",
      apiSignature: "Det_ReportRuntimeError(60, 0, 0x14, CANIF_E_INVALID_DATA_LENGTH /*0x32*/);",
      resultBadge: "DLC ERROR 0x32",
      tone: "err"
    };
    sim.cCodeSnippet = [
      "/* SWS_CanIf_00026: DLC Check before Upper Layer Indication */",
      "if (PduInfoPtr->SduLength < " + effMinDlc + "u) { /* Actual: " + actualDlc + "B */",
      "  Det_ReportRuntimeError(60u, 0u, 0x14u, CANIF_E_INVALID_DATA_LENGTH);",
      "  return; /* Drop to protect " + effUl + " */",
      "}"
    ].join("\n");
    updateRegistersAfter();
    return;
  }

  // Step 3: Passed SwFilter & DLC Check -> Upper Layer Dispatch + Wakeup Validation + ReadRxBuffer
  sim.lastFrameFlags.dlcOk = true;
  sim.lastFrameFlags.ulInd = true;
  sim.counters.rxOk += 1;

  // Wakeup validation rule (SWS_CanIf_00286 / 00830)
  if (sim.wakeupDetected) {
    if (!cfg.CanIfWakeupCheckValidByNM || effUl === "CANNM") {
      sim.firstValidRxReceived = true;
    }
  }
  // Confirm PN if valid Rx received on PN-capable ECU
  if (sim.pnFilterActive && (effUl === "CANNM" || sim.pnAvailableConfirmed)) {
    sim.pnAvailableConfirmed = true;
  }

  // Polling Rx Buffer if enabled (SWS_CanIf_00194)
  if (cfg.CanIfRxPduReadDataAndNotif) {
    sim.rxReadBuffer = {
      rxPduId: matchedRx.rxPduId,
      available: true,
      notifStatus: "CANIF_TX_RX_NOTIFICATION",
      dlc: actualDlc,
      payload: prof.payload
    };
  }

  sim.activeArrows = { arr_drv_bus: "active", arr_candrv_canif: "active", arr_canif_ul: "active-cbk" };
  sim.lastRxSummary = {
    profileKey: profKey, rxPduId: matchedRx.rxPduId, name: matchedRx.name,
    rawCanId: prof.canId, encodedCanId: encodedId, idType: prof.idType, hrhId: prof.hrhId, hrhType,
    dlc: actualDlc, minDlc: effMinDlc, mask: fmtHex(maskVal, 3), swFilterPassed: true, dlcCheckPassed: true,
    ul: effUl, ulCbk: effUlCbk, payload: prof.payload, dropReason: null
  };

  sim.stepNarrative = {
    title: "CanIf_RxIndication() ➔ Định Tuyến Thành Công Lên " + effUlCbk + "()",
    inputOrigin: prof.hrhId + " (" + hrhType + ") nhận khung " + fmtHex(prof.canId, 3) + " (Can_IdType=" + fmtHex(encodedId, 8) + ", DLC=" + actualDlc + "B).",
    processDetail: "1) SwFilter (" + cfg.CanIfPrivateSoftwareFilterType + ") khớp " + matchedRx.name + " (RxPduId=" + matchedRx.rxPduId + "). 2) DLC Check (" + actualDlc + "B >= " + effMinDlc + "B) ĐẠT." + (cfg.CanIfRxPduReadDataAndNotif ? " 3) Lưu vào RxBuffer cho ReadRxPduData()." : ""),
    outputDest: "Gọi " + effUlCbk + "(" + matchedRx.rxPduId + ", &PduInfo) lên " + effUl + (sim.firstValidRxReceived ? " & đánh dấu hợp lệ cho Wakeup CheckValidation." : "."),
    bitChange: "Bit 3 (SW_FLT=1), Bit 2 (DLC_OK=1), Bit 1 (UL_IND=1)" + (sim.firstValidRxReceived ? ", Bit 0 Thanh A (WKUP_VALID=1)." : "."),
    apiSignature: effUlCbk + "(" + matchedRx.rxPduId + "u, &(PduInfoType){SduLength=" + actualDlc + "});",
    resultBadge: "RX -> " + effUl,
    tone: "ok"
  };

  sim.cCodeSnippet = [
    "void CanIf_RxIndication(const Can_HwType* Mailbox, const PduInfoType* PduInfoPtr) {",
    "  /* 1. SwFilter Matched RxPduId = " + matchedRx.rxPduId + " (" + matchedRx.name + ") */",
    "  /* 2. DLC Check PASSED: " + actualDlc + "B >= " + effMinDlc + "B */",
    sim.wakeupDetected ? "  CanIf_CtrlFirstRxAfterWakeup[CtrlId] = TRUE;" : "",
    cfg.CanIfRxPduReadDataAndNotif ? "  CanIf_CopyToRxReadBuffer(RxPduId, PduInfoPtr); /* Polling mode */" : "",
    "  " + effUlCbk + "(" + matchedRx.rxPduId + "u, PduInfoPtr);",
    "}"
  ].filter(Boolean).join("\n");

  addTrace("CanIf_RxIndication(" + fmtHex(prof.canId, 3) + ")",
    "SwFilter+DLC OK -> " + effUlCbk + "(RxPduId=" + matchedRx.rxPduId + ", " + actualDlc + "B)",
    "ok");
  updateRegistersAfter();
}

function api_CanIf_TriggerTransmit(txPduIdOverride) {
  snapshotRegBefore();
  advanceClock(2);
  const id = txPduIdOverride !== undefined ? String(txPduIdOverride) : "5";
  const pdu = getEffectiveTxPdu(id);
  sim.counters.triggerTxCalls += 1;
  sim.lastFrameFlags.ulInd = true;
  sim.activeArrows = { arr_canif_ul: "active-cbk", arr_canif_candrv: "active" };
  sim.stepNarrative = {
    title: "CanIf_TriggerTransmit(" + id + ") Kéo Payload Tươi Mới Từ Upper Layer",
    inputOrigin: "CanDrv/Hardware sát thời điểm phát trên bus cần dữ liệu mới nhất (chống stale data hoặc chứa Rolling Counter).",
    processDetail: "CanIf gọi PduR_CanIfTriggerTransmit(" + id + ", PduInfoPtr) để PduR/COM chép dữ liệu tức thời trực tiếp vào buffer phát.",
    outputDest: "Payload tươi mới được trao ngay cho CanDrv phát ra bus CAN.",
    bitChange: "Bit 1 Thanh B (UL_IND = 1).",
    apiSignature: "Std_ReturnType CanIf_TriggerTransmit(PduIdType TxPduId, PduInfoType* PduInfoPtr);",
    resultBadge: "TRIGGER TX OK",
    tone: "ok"
  };
  sim.cCodeSnippet = [
    "Std_ReturnType CanIf_TriggerTransmit(PduIdType TxPduId, PduInfoType* PduInfoPtr) {",
    "  return PduR_CanIfTriggerTransmit(TxPduId, PduInfoPtr); /* SWS_CanIf_00883 */",
    "}"
  ].join("\n");
  addTrace("CanIf_TriggerTransmit(" + pdu.name + ")", "Kéo payload mới từ PduR_CanIfTriggerTransmit()", "ok");
  updateRegistersAfter();
  return "E_OK";
}

function api_CanIf_SetControllerMode(targetMode) {
  snapshotRegBefore();
  advanceClock(3);
  const prev = sim.ctrlMode;

  if (targetMode === "CAN_CS_UNINIT") {
    sim.ctrlMode = "CAN_CS_UNINIT";
    sim.pduMode = "CANIF_OFFLINE";
    sim.txBuffer = [];
    sim.hth0InFlight = null;
    sim.hth1InFlight = null;
    cfg.ActiveControllerMode = sim.ctrlMode;
    cfg.ActivePduMode = sim.pduMode;
    addTrace("CanIf_SetControllerMode(UNINIT)", "Reset về UNINIT", "warn");
    updateRegistersAfter();
    return "E_OK";
  }

  // Illegal AUTOSAR transition check: CAN_CS_STARTED -> CAN_CS_SLEEP directly without STOPPED!
  if (prev === "CAN_CS_STARTED" && targetMode === "CAN_CS_SLEEP") {
    if (cfg.CanIfDevErrorDetect) {
      reportDetError("0x03", "CANIF_E_PARAM_CTRLMODE (0x0D)", "CanIf_SetControllerMode", "Cấm chuyển thẳng CAN_CS_STARTED -> CAN_CS_SLEEP (phải qua STOPPED trước)");
    }
    sim.stepNarrative = {
      title: "Từ Chối Chuyển Thẳng STARTED ➔ SLEEP (SWS_CanIf_00308)",
      inputOrigin: "CanSM yêu cầu CanIf_SetControllerMode(0, CAN_CS_SLEEP) trong khi Ctrl0 đang STARTED.",
      processDetail: "Máy trạng thái Can_ControllerStateType bắt buộc dừng qua CAN_CS_STOPPED trước khi vào SLEEP!",
      outputDest: "Trả về E_NOT_OK. Giữ nguyên trạng thái CAN_CS_STARTED.",
      bitChange: "Bit 0 Thanh B (DET_ERR = 1).",
      apiSignature: "CanIf_SetControllerMode(0, CAN_CS_SLEEP) == E_NOT_OK /* Must stop first */",
      resultBadge: "ILLEGAL TRANSITION",
      tone: "err"
    };
    updateRegistersAfter();
    return "E_NOT_OK";
  }

  sim.ctrlMode = targetMode;
  cfg.ActiveControllerMode = targetMode;
  sim.activeArrows = { arr_cansm_canif: "active", arr_canif_candrv: "active" };

  if (targetMode === "CAN_CS_STOPPED" || targetMode === "CAN_CS_SLEEP") {
    const flushedCount = sim.txBuffer.length;
    sim.txBuffer = [];
    sim.hth0InFlight = null;
    sim.hth1InFlight = null;
    sim.txConfirmationState = "CANIF_NO_NOTIFICATION";
    if (targetMode === "CAN_CS_STOPPED" && sim.pduMode !== "CANIF_OFFLINE") {
      sim.pduMode = "CANIF_OFFLINE";
      cfg.ActivePduMode = "CANIF_OFFLINE";
    }
    if (targetMode === "CAN_CS_SLEEP") {
      sim.wakeupDetected = false;
      sim.firstValidRxReceived = false;
      sim.wakeupValidated = false;
    }
    sim.stepNarrative = {
      title: "CanIf_SetControllerMode(0, " + targetMode + ") Thành Công",
      inputOrigin: "CanSM gọi CanIf_SetControllerMode(0, " + targetMode + ") từ trạng thái " + prev + ".",
      processDetail: "CanIf chuyển Can_SetControllerMode() và XÓA SẠCH CanIfTxBuffer (" + flushedCount + " frame bị hủy), reset TxConfirmationState về NO_NOTIFICATION.",
      outputDest: "Báo CanSM_ControllerModeIndication(0, " + targetMode + ").",
      bitChange: "Cập nhật Bit 7/6 Thanh A (CtrlState), Bit 1 (TX_NOTF=0).",
      apiSignature: "CanIf_SetControllerMode(0u, " + targetMode + "); -> Can_SetControllerMode();",
      resultBadge: targetMode,
      tone: targetMode === "CAN_CS_SLEEP" ? "pur" : "warn"
    };
    addTrace("CanIf_SetControllerMode(0, " + targetMode + ")", prev + " -> " + targetMode + " (Xóa " + flushedCount + " TxBuf)", "warn");
  } else {
    sim.stepNarrative = {
      title: "CanIf_SetControllerMode(0, CAN_CS_STARTED) Kích Hoạt Giao Tiếp",
      inputOrigin: "CanSM gọi CanIf_SetControllerMode(0, CAN_CS_STARTED) từ " + prev + ".",
      processDetail: "CanIf chuyển MCAL Can_SetControllerMode(0, CAN_CS_STARTED) để hòa đồng bộ vào bus CAN.",
      outputDest: "CanDrv sẵn sàng; CanIf báo CanSM_ControllerModeIndication(0, CAN_CS_STARTED).",
      bitChange: "Bit 7 Thanh A (CS_STARTED = 1), Bit 6 (CS_SLEEP = 0).",
      apiSignature: "CanIf_SetControllerMode(0u, CAN_CS_STARTED); /* return E_OK */",
      resultBadge: "CAN_CS_STARTED",
      tone: "ok"
    };
    addTrace("CanIf_SetControllerMode(0, CAN_CS_STARTED)", prev + " -> CAN_CS_STARTED", "ok");
  }
  sim.cCodeSnippet = "CanSM -> CanIf_SetControllerMode(0u, " + targetMode + ");\nCan_SetControllerMode(0u, " + targetMode + ");\nCanIf_ControllerModeIndication(0u, " + targetMode + ");";
  updateRegistersAfter();
  return "E_OK";
}

function api_CanIf_SetPduMode(targetPduMode) {
  snapshotRegBefore();
  advanceClock(2);
  if (sim.ctrlMode !== "CAN_CS_STARTED" && targetPduMode !== "CANIF_OFFLINE") {
    if (cfg.CanIfDevErrorDetect) {
      reportDetError("0x09", "CANIF_E_STOPPED", "CanIf_SetPduMode", "Không thể mở " + targetPduMode + " khi Ctrl0 đang " + sim.ctrlMode);
    }
    sim.stepNarrative = {
      title: "CanIf_SetPduMode(" + targetPduMode + ") Bị Chặn Vì Ctrl Đang " + sim.ctrlMode,
      inputOrigin: "CanSM yêu cầu mở cổng " + targetPduMode + ".",
      processDetail: "SWS_CanIf_00874 yêu cầu Controller phải ở CAN_CS_STARTED trước khi chuyển PduMode khỏi OFFLINE.",
      outputDest: "Trả về E_NOT_OK.",
      bitChange: "Thanh A giữ CANIF_OFFLINE.",
      apiSignature: "CanIf_SetPduMode(0u, " + targetPduMode + ") == E_NOT_OK;",
      resultBadge: "E_NOT_OK",
      tone: "err"
    };
    updateRegistersAfter();
    return "E_NOT_OK";
  }

  const prev = sim.pduMode;
  sim.pduMode = targetPduMode;
  cfg.ActivePduMode = targetPduMode;
  if (targetPduMode === "CANIF_OFFLINE" || targetPduMode === "CANIF_TX_OFFLINE") {
    sim.txBuffer = [];
  }
  sim.activeArrows = { arr_cansm_canif: "active" };
  const tone = targetPduMode === "CANIF_ONLINE" ? "ok" : (targetPduMode === "CANIF_TX_OFFLINE_ACTIVE" ? "warn" : "err");
  sim.stepNarrative = {
    title: "Chuyển Cổng Logic PduMode: " + prev + " ➔ " + targetPduMode,
    inputOrigin: "CanSM gọi CanIf_SetPduMode(0, " + targetPduMode + ").",
    processDetail: targetPduMode === "CANIF_ONLINE"
      ? "Mở thông suốt cả Tx (Can_Write) lẫn Rx (RxIndication)."
      : targetPduMode === "CANIF_TX_OFFLINE"
        ? "Khóa chiều Tx (SilentCom / Listen-Only), chiều Rx vẫn thông để đón bản tin đánh thức NM!"
        : targetPduMode === "CANIF_TX_OFFLINE_ACTIVE"
          ? "Chế độ ECU Passive: Khóa Can_Write() xuống bus nhưng tự bắn TxConfirmation(E_OK) ảo lên PduR/COM!"
          : "Đóng hoàn toàn cả chiều Tx và chiều Rx.",
    outputDest: "Cập nhật cổng logic trong CanIf ngay lập tức.",
    bitChange: "Cập nhật Bit 5 (PDU_ONLINE), Bit 4 (TX_OFF_ACTV), Bit 3 (TX_OFFLINE).",
    apiSignature: "Std_ReturnType CanIf_SetPduMode(uint8 ControllerId, CanIf_PduModeType " + targetPduMode + ");",
    resultBadge: targetPduMode,
    tone: tone
  };
  sim.cCodeSnippet = "CanIf_SetPduMode(0u, " + targetPduMode + "); /* SWS_CanIf_00008 */";
  addTrace("CanIf_SetPduMode(0, " + targetPduMode + ")", prev + " -> " + targetPduMode, tone === "ok" ? "ok" : "warn");
  updateRegistersAfter();
  return "E_OK";
}

function api_CanIf_SetDynamicTxId(newCanIdOverride) {
  snapshotRegBefore();
  advanceClock(2);
  if (!cfg.CanIfSetDynamicTxIdApi) {
    sim.stepNarrative = {
      title: "API CanIf_SetDynamicTxId() Đang Tắt (Pre-compile OFF)",
      inputOrigin: "Upper Layer gọi CanIf_SetDynamicTxId(4, ...).",
      processDetail: "CanIfSetDynamicTxIdApi = FALSE nên không hỗ trợ đổi CAN ID lúc runtime.",
      outputDest: "Không cập nhật bảng Dynamic Tx CAN ID.",
      bitChange: "Không đổi.",
      apiSignature: "/* Disabled: CanIfSetDynamicTxIdApi == STD_OFF */",
      resultBadge: "API DISABLED",
      tone: "warn"
    };
    updateRegistersAfter();
    return "E_NOT_OK";
  }

  const targetPdu = TX_PDUS[String(cfg.SelectedTxPduId)] || TX_PDUS["4"];
  const rawNew = newCanIdOverride !== undefined
    ? (newCanIdOverride >>> 0)
    : parseHexNum(cfg.CustomDynamicCanIdHex, 0x18FEF100);

  if (!targetPdu.isDynamic && String(cfg.SelectedTxPduId) !== "4") {
    // Allow automatic selection or warn DET if strict
    sim.dynamicCanId = rawNew;
    cfg.SelectedTxPduId = "4";
  } else {
    sim.dynamicCanId = rawNew;
  }
  cfg.CustomDynamicCanIdHex = fmtHex(rawNew, 8);
  cfg.CanIfTxPduCanIdType = "EXTENDED_CAN";
  sim.lastDecodedCanId32 = encodeCanIdType(rawNew, "EXTENDED_CAN");
  sim.lastFrameFlags.isExt = true;
  sim.activeArrows = { arr_ul_canif: "active" };

  sim.stepNarrative = {
    title: "CanIf_SetDynamicTxId(TxPdu_4, " + fmtHex(rawNew, 8) + ") Đổi CAN ID Nóng Trong RAM",
    inputOrigin: "J1939Nm / DoCAN CDD gọi CanIf_SetDynamicTxId() gán Source Address động lúc runtime.",
    processDetail: "CanIf ghi CAN ID mới (" + fmtHex(rawNew, 8) + ") vào mảng RAM CanIf_DynamicTxId[TxPdu_4] được bảo vệ bởi SchM ExclusiveArea.",
    outputDest: "Các lần gọi CanIf_Transmit(TxPdu_4) tiếp theo sẽ mang CAN ID 29-bit mới " + fmtHex(sim.lastDecodedCanId32, 8) + ".",
    bitChange: "Bit 7 Thanh B (EXT_B31 = 1); giải mã Can_IdType = " + fmtHex(sim.lastDecodedCanId32, 8) + ".",
    apiSignature: "CanIf_SetDynamicTxId(4u /*TxPdu_4*/, " + fmtHex(sim.lastDecodedCanId32, 8) + "u);",
    resultBadge: "DYN ID -> " + fmtHex(rawNew, 8),
    tone: "ok"
  };
  sim.cCodeSnippet = "CanIf_SetDynamicTxId(4u, " + fmtHex(sim.lastDecodedCanId32, 8) + "u); /* J1939 / DoCAN Dynamic ID */";
  addTrace("CanIf_SetDynamicTxId(4, " + fmtHex(rawNew, 8) + ")", "Cập nhật RAM CanId 29-bit -> " + fmtHex(sim.lastDecodedCanId32, 8), "ok");
  updateRegistersAfter();
  return "E_OK";
}

function api_CanIf_SetTrcvMode(mode) {
  snapshotRegBefore();
  advanceClock(2);
  sim.trcvMode = mode;
  cfg.ActiveTransceiverMode = mode;
  sim.activeArrows = { arr_cansm_canif: "active", arr_canif_cantrcv: "active" };
  sim.stepNarrative = {
    title: "CanIf_SetTrcvMode(0, " + mode + ")",
    inputOrigin: "CanSM yêu cầu chuyển chế độ phần cứng CAN Transceiver (TJA1145/TJA1043).",
    processDetail: "CanIf chuyển tiếp xuống CanTrcv_SetOpMode(0, " + mode + "). Nếu là STANDBY/SLEEP, ECU giảm dòng tiêu thụ chờ WUF.",
    outputDest: "CanTrcv báo callback CanIf_TrcvModeIndication(0, " + mode + ") lên CanSM.",
    bitChange: "Trạng thái Transceiver cập nhật trên SVG.",
    apiSignature: "CanIf_SetTrcvMode(0u, " + mode + "); -> CanTrcv_SetOpMode();",
    resultBadge: mode.replace("CANTRCV_TRCVMODE_", "TRCV "),
    tone: mode === "CANTRCV_TRCVMODE_NORMAL" ? "ok" : "pur"
  };
  addTrace("CanIf_SetTrcvMode(0, " + mode + ")", "Chuyển Transceiver sang " + mode, "ok");
  updateRegistersAfter();
  return "E_OK";
}

function api_CanIf_ClearTrcvWufFlag() {
  snapshotRegBefore();
  advanceClock(1);
  sim.trcvWufFlag = false;
  sim.activeArrows = { arr_canif_cantrcv: "active" };
  addTrace("CanIf_ClearTrcvWufFlag(0)", "Xóa cờ Wake-Up Flag (WUF) trong Transceiver SPI", "ok");
  updateRegistersAfter();
  return "E_OK";
}

function api_CanIf_ConfirmPnAvailability() {
  snapshotRegBefore();
  advanceClock(2);
  sim.pnFilterActive = false;
  cfg.CanIfPnFilterEnabled = false;
  sim.pnAvailableConfirmed = true;
  sim.activeArrows = { arr_cansm_canif: "active", arr_canif_ul: "active-cbk" };
  sim.stepNarrative = {
    title: "CanIf_ConfirmPnAvailability(0) Mở Khóa Toàn Bộ TxPdu",
    inputOrigin: "CanSM/CanTrcv xác nhận mạng Partial Networking đã sẵn sàng sau WUF hợp lệ.",
    processDetail: "CanIf gỡ bỏ khóa CanIfPnFilterEnabled trên Ctrl0 và báo CanSM_ConfirmPnAvailability(0).",
    outputDest: "Tất cả TxPdu ứng dụng (COM/CanTp) được phép truyền bình thường trở lại!",
    bitChange: "Bit 2 Thanh A (PN_TX_FILT) chuyển 1 ➔ 0.",
    apiSignature: "CanIf_ConfirmPnAvailability(0u); /* Clear PN Tx Filter */",
    resultBadge: "PN UNLOCKED",
    tone: "ok"
  };
  sim.cCodeSnippet = "void CanIf_ConfirmPnAvailability(uint8 TransceiverId) {\n  CanIf_PnTxFilter[CtrlId] = FALSE;\n  CanSM_ConfirmPnAvailability(TransceiverId);\n}";
  addTrace("CanIf_ConfirmPnAvailability(0)", "Mở khóa PN Tx Filter -> Cho phép mọi TxPdu truyền", "ok");
  updateRegistersAfter();
}

function api_CanIf_ControllerBusOff() {
  snapshotRegBefore();
  advanceClock(2);
  const dropped = sim.txBuffer.length;
  sim.ctrlMode = "CAN_CS_STOPPED";
  sim.pduMode = "CANIF_TX_OFFLINE";
  cfg.ActiveControllerMode = "CAN_CS_STOPPED";
  cfg.ActivePduMode = "CANIF_TX_OFFLINE";
  sim.txBuffer = [];
  sim.hth0InFlight = null;
  sim.hth1InFlight = null;
  sim.txConfirmationState = "CANIF_NO_NOTIFICATION";
  sim.counters.busOffEvents += 1;
  sim.lastFrameFlags.detErr = true;
  sim.activeArrows = { arr_drv_bus: "active-err", arr_candrv_canif: "active-err", arr_cansm_canif: "active-err" };

  sim.stepNarrative = {
    title: "NGẮT BUS-OFF: CanIf_ControllerBusOff(0) (SWS_CanIf_00218)",
    inputOrigin: "Bộ đếm TEC > 255 trên CAN Controller -> CanDrv gọi CanIf_ControllerBusOff(0) từ ISR.",
    processDetail: "CanIf lập tức: 1) Đặt Ctrl0 = CAN_CS_STOPPED, 2) Khóa PduMode = CANIF_TX_OFFLINE, 3) Xóa sạch " + dropped + " bản tin tồn trong CanIfTxBuffer, 4) Reset TxConfirmationState = CANIF_NO_NOTIFICATION.",
    outputDest: "Thông báo CanSM_ControllerBusOff(0) để CanSM chạy quy trình phục hồi Bus-Off (BOR Fast/Slow L1/L2).",
    bitChange: "Bit 7(CS_STARTED)=0, Bit 5(PDU_ONLN)=0, Bit 3(TX_OFFLINE)=1, Bit 1(TX_NOTF)=0.",
    apiSignature: "CanIf_ControllerBusOff(0u); -> CanSM_ControllerBusOff(0u);",
    resultBadge: "BUS-OFF -> STOPPED",
    tone: "err"
  };
  sim.cCodeSnippet = [
    "void CanIf_ControllerBusOff(uint8 ControllerId) {",
    "  CanIf_CtrlMode[ControllerId] = CAN_CS_STOPPED;",
    "  CanIf_PduMode[ControllerId]  = CANIF_TX_OFFLINE;",
    "  CanIf_ClearTxBuffer(ControllerId); /* Dropped " + dropped + " queued frames */",
    "  CanIf_TxConfState[ControllerId] = CANIF_NO_NOTIFICATION;",
    "  CanSM_ControllerBusOff(ControllerId);",
    "}"
  ].join("\n");
  addTrace("CanIf_ControllerBusOff(0)", "Bus-Off! Ctrl=STOPPED, PduMode=TX_OFFLINE, Xóa " + dropped + " TxBuf -> CanSM", "err");
  updateRegistersAfter();
}

function api_CanIf_CheckWakeup() {
  snapshotRegBefore();
  advanceClock(3);
  if (!cfg.CanIfCtrlWakeupSupport) {
    addTrace("CanIf_CheckWakeup()", "CtrlWakeupSupport=FALSE -> E_NOT_OK", "warn");
    updateRegistersAfter();
    return "E_NOT_OK";
  }
  sim.wakeupDetected = true;
  sim.firstValidRxReceived = false;
  sim.wakeupValidated = false;
  sim.trcvWufFlag = true;
  sim.counters.wakeupEvents += 1;
  sim.activeArrows = { arr_canif_cantrcv: "active", arr_ecum_canif: "active" };

  sim.stepNarrative = {
    title: "CanIf_CheckWakeup() Phát Hiện Xung Đánh Thức (Chờ Xác Thực)",
    inputOrigin: "EcuM gọi CanIf_CheckWakeup(ECUM_WKSOURCE_CAN) sau ngắt chân INH/RX từ CanTrcv hoặc CAN Controller.",
    processDetail: "CanIf kiểm tra cờ WUF trong CanTrcv/CanDrv -> CÓ WAKEUP! Báo EcuM_SetWakeupEvent(), nhưng KHÔNG xác thực ngay nếu chưa thấy khung CAN hợp lệ (tránh nhiễu glitch).",
    outputDest: "EcuM bật Timer chờ. Bước tiếp theo: EcuM đánh thức Ctrl0 & chờ nhận 1 khung Rx hợp lệ rồi gọi CanIf_CheckValidation().",
    bitChange: "Cờ WakeupPending=TRUE, WKUP_VALID (Bit 0 Thanh A) vẫn = 0 tới khi nhận Rx hợp lệ.",
    apiSignature: "CanIf_CheckWakeup(ECUM_WKSOURCE_CAN) -> EcuM_SetWakeupEvent();",
    resultBadge: "WAKEUP PENDING",
    tone: "pur"
  };
  sim.cCodeSnippet = [
    "/* Step 1: EcuM polls CanIf_CheckWakeup() */",
    "if (CanTrcv_CheckWakeup(0u) == E_OK) {",
    "  EcuM_SetWakeupEvent(ECUM_WKSOURCE_CAN);",
    "  /* Wakeup NOT validated yet until 1st valid RxIndication */",
    "}"
  ].join("\n");
  addTrace("CanIf_CheckWakeup()", "Phát hiện WUF -> Báo EcuM_SetWakeupEvent() (chưa validate)", "ok");
  updateRegistersAfter();
  return "E_OK";
}

function api_CanIf_CheckValidation() {
  snapshotRegBefore();
  advanceClock(3);
  sim.activeArrows = { arr_ecum_canif: "active-cbk" };
  if (!cfg.CanIfPublicWakeupCheckValidSupport || sim.firstValidRxReceived) {
    sim.wakeupValidated = true;
    sim.trcvWufFlag = false;
    sim.stepNarrative = {
      title: "CanIf_CheckValidation() ➔ EcuM_ValidateWakeupEvent() THÀNH CÔNG!",
      inputOrigin: "EcuM gọi CanIf_CheckValidation(ECUM_WKSOURCE_CAN).",
      processDetail: "Vì đã nhận >= 1 khung RxIndication() hợp lệ" + (cfg.CanIfWakeupCheckValidByNM ? " từ CanNm" : "") + " sau Wakeup, CanIf xác nhận đây là đánh thức thật (không phải nhiễu bus).",
      outputDest: "Gọi EcuM_ValidateWakeupEvent(ECUM_WKSOURCE_CAN) để giữ ECU thức và chạy FullCom!",
      bitChange: "Bit 0 Thanh A (WKUP_VALID = 1).",
      apiSignature: "CanIf_CheckValidation(ECUM_WKSOURCE_CAN) -> EcuM_ValidateWakeupEvent();",
      resultBadge: "WAKEUP VALIDATED",
      tone: "ok"
    };
    sim.cCodeSnippet = "/* Valid Rx frame seen after wakeup */\nif (CanIf_CtrlFirstRxAfterWakeup[0]) {\n  EcuM_ValidateWakeupEvent(ECUM_WKSOURCE_CAN);\n}";
    addTrace("CanIf_CheckValidation()", "Đã thấy Rx hợp lệ -> EcuM_ValidateWakeupEvent()", "ok");
    updateRegistersAfter();
    return "E_OK";
  }

  sim.stepNarrative = {
    title: "CanIf_CheckValidation() Từ Chối: Chưa Có Khung Rx Hợp Lệ (Nghi Nhiễu Glitch!)",
    inputOrigin: "EcuM gọi CanIf_CheckValidation() khi chưa có bản tin RxIndication nào vượt qua SwFilter+DLC Check.",
    processDetail: "Chức năng Wakeup Validation (SWS_CanIf_00178) chặn đánh thức giả do xung nhiễu ESD hoặc khung rác. Trả về E_NOT_OK (hoặc không gọi ValidateWakeupEvent).",
    outputDest: "ECU có thể tự đi ngủ lại (GoSleep) tiết kiệm ắc quy.",
    bitChange: "Bit 0 Thanh A (WKUP_VALID) giữ = 0.",
    apiSignature: "CanIf_CheckValidation() /* No valid Rx yet -> Do NOT call EcuM_ValidateWakeupEvent */",
    resultBadge: "GLITCH FILTERED",
    tone: "warn"
  };
  addTrace("CanIf_CheckValidation()", "Chưa thấy Rx hợp lệ (Glitch Filter) -> Không validate!", "warn");
  updateRegistersAfter();
  return "E_NOT_OK";
}

function api_CanIf_SetBaudrate(baudId) {
  snapshotRegBefore();
  advanceClock(2);
  const nextId = baudId !== undefined ? Number(baudId) : ((sim.baudrateConfigId + 1) % 3);
  sim.baudrateConfigId = nextId;
  cfg.ActiveBaudRateConfigID = nextId;
  sim.activeArrows = { arr_cansm_canif: "active", arr_canif_candrv: "active" };
  const labelMap = { 0: "500 kbps / 2 Mbps FD", 1: "500 kbps / 5 Mbps FD", 2: "250 kbps Classical" };
  const lbl = labelMap[nextId] || ("ConfigID #" + nextId);
  sim.stepNarrative = {
    title: "CanIf_SetBaudrate(0, BaudRateConfigID=" + nextId + ")",
    inputOrigin: "ComM/CanSM/BswM yêu cầu chuyển hồ sơ tốc độ baud (" + lbl + ").",
    processDetail: "CanIf chuyển tiếp xuống Can_SetBaudrate(0, " + nextId + ") của MCAL CanDrv (đồng bộ thanh ghi bit-timing).",
    outputDest: "Cập nhật tốc độ truyền bus CAN thành " + lbl + ".",
    bitChange: "Trường BaudRateConfigID = " + nextId + ".",
    apiSignature: "Std_ReturnType CanIf_SetBaudrate(uint8 ControllerId, uint16 " + nextId + ");",
    resultBadge: "BAUD ID=" + nextId,
    tone: "ok"
  };
  sim.cCodeSnippet = "CanIf_SetBaudrate(0u, " + nextId + "u); /* -> Can_SetBaudrate(0u, " + nextId + "u) */";
  addTrace("CanIf_SetBaudrate(0, " + nextId + ")", "Đổi baudrate sang " + lbl, "ok");
  updateRegistersAfter();
  return "E_OK";
}

function api_CanIf_ReadRxPduData() {
  snapshotRegBefore();
  advanceClock(1);
  if (!cfg.CanIfRxPduReadDataAndNotif) {
    sim.stepNarrative = {
      title: "CanIf_ReadRxPduData() Chưa Bật (RxReadData & Notif = FALSE)",
      inputOrigin: "CDD / Polling SWC thử gọi CanIf_ReadRxPduData(0, &PduInfo).",
      processDetail: "Cấu hình CanIfRxPduReadDataAndNotif đang tắt nên CanIf không lưu bản sao đệm RAM.",
      outputDest: "Trả về E_NOT_OK.",
      bitChange: "Không đổi.",
      apiSignature: "CanIf_ReadRxPduData(0u, &PduInfo) == E_NOT_OK;",
      resultBadge: "POLLING OFF",
      tone: "warn"
    };
    addTrace("CanIf_ReadRxPduData(0)", "Polling RxReadData=FALSE -> E_NOT_OK", "warn");
    updateRegistersAfter();
    return "E_NOT_OK";
  }

  sim.activeArrows = { arr_canif_ul: "active-cbk" };
  if (sim.rxReadBuffer.available) {
    const d = sim.rxReadBuffer.dlc;
    const p = sim.rxReadBuffer.payload;
    sim.rxReadBuffer.notifStatus = "CANIF_NO_NOTIFICATION";
    sim.stepNarrative = {
      title: "CanIf_ReadRxPduData(0) Đọc Thành Công (" + d + "B) & Clear Notif",
      inputOrigin: "Tác vụ Polling (CDD/OS Task) gọi CanIf_ReadRxPduData(0, &PduInfo) và CanIf_ReadRxNotifStatus(0).",
      processDetail: "CanIf chép payload từ đệm Rx nội bộ trong SchM ExclusiveArea và đặt lại NotifStatus = CANIF_NO_NOTIFICATION.",
      outputDest: "Trả về E_OK cùng dữ liệu: " + p,
      bitChange: "Bit 1 Thanh B (UL_IND = 1).",
      apiSignature: "CanIf_ReadRxPduData(0u, &PduInfo); /* DLC=" + d + ", clear notif flag */",
      resultBadge: "READ OK (" + d + "B)",
      tone: "ok"
    };
    addTrace("CanIf_ReadRxPduData(0)", "Đọc dữ liệu polling " + d + "B -> E_OK", "ok");
    updateRegistersAfter();
    return "E_OK";
  }
  addTrace("CanIf_ReadRxPduData(0)", "Chưa có khung mới trong Rx Read Buffer", "warn");
  updateRegistersAfter();
  return "E_NOT_OK";
}

function api_CanIf_GetVersionInfo() {
  snapshotRegBefore();
  advanceClock(1);
  sim.stepNarrative = {
    title: "CanIf_GetVersionInfo(&VerInfo) — ModuleId = 60 (0x3C)",
    inputOrigin: "BswM / Diag gọi CanIf_GetVersionInfo(&ver).",
    processDetail: "Trả về VendorId=0x001E, ModuleId=60 (CANIF), SW Version R23-11 (23.11.0).",
    outputDest: "Ghi vào cấu trúc Std_VersionInfoType* VersionInfoPtr.",
    bitChange: "Không đổi thanh ghi vận hành.",
    apiSignature: "void CanIf_GetVersionInfo(Std_VersionInfoType* VersionInfo);",
    resultBadge: "MOD 60 R23-11",
    tone: "ok"
  };
  sim.cCodeSnippet = "Std_VersionInfoType ver;\nCanIf_GetVersionInfo(&ver); /* moduleID=60, sw=23.11.0 */";
  addTrace("CanIf_GetVersionInfo()", "moduleID=60 (CANIF), AUTOSAR R23-11", "ok");
  updateRegistersAfter();
}

function api_CanIf_TestDetError() {
  snapshotRegBefore();
  advanceClock(2);
  reportDetError("0x49", "CANIF_E_INVALID_TXPDUID (0x32) & PARAM_CTRL (0x0F)", "DET Self-Test", "Truyền TxPduId=999 / CtrlId=99");
  sim.stepNarrative = {
    title: "Kiểm Thử Hàng Rào Lỗi DET (ModuleId = 60) & IdsM",
    inputOrigin: "Kích hoạt gọi API với TxPduId=999 và ControllerId=99 vượt ngưỡng ECUC.",
    processDetail: cfg.CanIfDevErrorDetect
      ? "CanIfDevErrorDetect=TRUE chặn đứng tại đầu hàm và bắn Det_ReportError(60, 0, 0x49, 0x32)."
      : "CanIfDevErrorDetect đang TẮT! Trong thực tế Production không check DET dễ dẫn đến truy cập mảng ngoài biên!",
    outputDest: "DET Module 60 ghi nhận lỗi" + (cfg.EnableIdsMSecurityEvents ? " + IdsM báo sự kiện an ninh." : "."),
    bitChange: "Bit 0 Thanh B (DET_ERR = 1).",
    apiSignature: "Det_ReportError(60u, 0u, 0x49u, CANIF_E_INVALID_TXPDUID /* 0x32 */);",
    resultBadge: cfg.CanIfDevErrorDetect ? "DET CAUGHT (60)" : "DET OFF WARNING",
    tone: "err"
  };
  sim.cCodeSnippet = "/* Module 60 DET Guard */\n#if (CANIF_DEV_ERROR_DETECT == STD_ON)\n  if (TxPduId >= CANIF_MAX_TXPDU) {\n    Det_ReportError(60u, 0u, 0x49u, 0x32u);\n    return E_NOT_OK;\n  }\n#endif";
  updateRegistersAfter();
}

// ==================== CONFIG VALIDATION & CODE GENERATORS ====================

function validateConfig() {
  const issues = [];
  if (cfg.CanIfHthHandleType === "BASIC" && !cfg.CanIfPublicTxBuffering) {
    issues.push({ tone: "warn", msg: "⚠️ Đang dùng BasicCAN HTH nhưng tắt CanIfPublicTxBuffering: Khi gặp CAN_BUSY bản tin sẽ bị rớt thay vì xếp hàng!" });
  }
  if (!cfg.CanIfPrivateDlcCheck) {
    issues.push({ tone: "warn", msg: "⚠️ CanIfPrivateDlcCheck đang FALSE: Tầng trên PduR/COM có thể đọc phải byte rác nếu nhận khung ngắn bất thường." });
  }
  if (cfg.CanIfWakeupCheckValidByNM && !cfg.CanIfPublicWakeupCheckValidSupport) {
    issues.push({ tone: "err", msg: "❌ CanIfWakeupCheckValidByNM=TRUE yêu cầu CanIfPublicWakeupCheckValidSupport=TRUE mới có hiệu lực." });
  }
  if (Number(cfg.InjectedRxDlcLength) < Number(cfg.CanIfRxPduDataLength)) {
    issues.push({ tone: "cyan", msg: "ℹ️ InjectedRxDlcLength (" + cfg.InjectedRxDlcLength + "B) < CanIfRxPduDataLength (" + cfg.CanIfRxPduDataLength + "B): Khi bấm RxIndication sẽ kích hoạt lỗi DLC 0x32." });
  }
  return issues;
}

function generateCanIfArxml() {
  const b = v => (v ? "true" : "false");
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<AUTOSAR xmlns="http://autosar.org/schema/r4.0">',
    '  <AR-PACKAGES><AR-PACKAGE><SHORT-NAME>CanIf_Ecuc</SHORT-NAME><ELEMENTS>',
    '    <ECUC-MODULE-CONFIGURATION-VALUES>',
    '      <SHORT-NAME>CanIf</SHORT-NAME>',
    '      <DEFINITION-REF DEST="ECUC-MODULE-DEF">/AUTOSAR/EcucDefs/CanIf</DEFINITION-REF>',
    '      <CONTAINERS>',
    '        <ECUC-CONTAINER-VALUE><SHORT-NAME>CanIfPublicCfg</SHORT-NAME><PARAMETER-VALUES>',
    '          <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF>/AUTOSAR/EcucDefs/CanIf/CanIfPublicCfg/CanIfDevErrorDetect</DEFINITION-REF><VALUE>' + b(cfg.CanIfDevErrorDetect) + '</VALUE></ECUC-NUMERICAL-PARAM-VALUE>',
    '          <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF>/AUTOSAR/EcucDefs/CanIf/CanIfPublicCfg/CanIfPublicTxBuffering</DEFINITION-REF><VALUE>' + b(cfg.CanIfPublicTxBuffering) + '</VALUE></ECUC-NUMERICAL-PARAM-VALUE>',
    '          <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF>/AUTOSAR/EcucDefs/CanIf/CanIfPublicCfg/CanIfSetDynamicTxIdApi</DEFINITION-REF><VALUE>' + b(cfg.CanIfSetDynamicTxIdApi) + '</VALUE></ECUC-NUMERICAL-PARAM-VALUE>',
    '          <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF>/AUTOSAR/EcucDefs/CanIf/CanIfPublicCfg/CanIfTriggerTransmitSupport</DEFINITION-REF><VALUE>' + b(cfg.CanIfTriggerTransmitSupport) + '</VALUE></ECUC-NUMERICAL-PARAM-VALUE>',
    '          <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF>/AUTOSAR/EcucDefs/CanIf/CanIfPublicCfg/CanIfPublicPnSupport</DEFINITION-REF><VALUE>' + b(cfg.CanIfPublicPnSupport) + '</VALUE></ECUC-NUMERICAL-PARAM-VALUE>',
    '          <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF>/AUTOSAR/EcucDefs/CanIf/CanIfPublicCfg/CanIfPublicWakeupCheckValidSupport</DEFINITION-REF><VALUE>' + b(cfg.CanIfPublicWakeupCheckValidSupport) + '</VALUE></ECUC-NUMERICAL-PARAM-VALUE>',
    '        </PARAMETER-VALUES></ECUC-CONTAINER-VALUE>',
    '        <ECUC-CONTAINER-VALUE><SHORT-NAME>CanIfPrivateCfg</SHORT-NAME><PARAMETER-VALUES>',
    '          <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF>/AUTOSAR/EcucDefs/CanIf/CanIfPrivateCfg/CanIfPrivateDlcCheck</DEFINITION-REF><VALUE>' + b(cfg.CanIfPrivateDlcCheck) + '</VALUE></ECUC-NUMERICAL-PARAM-VALUE>',
    '          <ECUC-TEXTUAL-PARAM-VALUE><DEFINITION-REF>/AUTOSAR/EcucDefs/CanIf/CanIfPrivateCfg/CanIfPrivateSoftwareFilterType</DEFINITION-REF><VALUE>' + cfg.CanIfPrivateSoftwareFilterType + '</VALUE></ECUC-TEXTUAL-PARAM-VALUE>',
    '        </PARAMETER-VALUES></ECUC-CONTAINER-VALUE>',
    '      </CONTAINERS>',
    '    </ECUC-MODULE-CONFIGURATION-VALUES>',
    '  </ELEMENTS></AR-PACKAGE></AR-PACKAGES>',
    '</AUTOSAR>'
  ].join("\n");
}

function generateCanIfCfgH() {
  const onOff = v => (v ? "STD_ON" : "STD_OFF");
  return [
    "/* Generated by AUTOSAR Classic R23-11 CanIf Interactive Simulator */",
    "#ifndef CANIF_CFG_H",
    "#define CANIF_CFG_H",
    "",
    "#define CANIF_DEV_ERROR_DETECT                 " + onOff(cfg.CanIfDevErrorDetect),
    "#define CANIF_PUBLIC_TX_BUFFERING              " + onOff(cfg.CanIfPublicTxBuffering),
    "#define CANIF_PRIVATE_DLC_CHECK                " + onOff(cfg.CanIfPrivateDlcCheck),
    "#define CANIF_PRIVATE_SOFTWARE_FILTER_TYPE     CANIF_SF_" + cfg.CanIfPrivateSoftwareFilterType,
    "#define CANIF_SETDYNAMICTXID_API               " + onOff(cfg.CanIfSetDynamicTxIdApi),
    "#define CANIF_TRIGGER_TRANSMIT_SUPPORT         " + onOff(cfg.CanIfTriggerTransmitSupport),
    "#define CANIF_PUBLIC_PN_SUPPORT                " + onOff(cfg.CanIfPublicPnSupport),
    "#define CANIF_PUBLIC_WAKEUP_CHECK_VALID_SUPP   " + onOff(cfg.CanIfPublicWakeupCheckValidSupport),
    "#define CANIF_WAKEUP_CHECK_VALID_BY_NM         " + onOff(cfg.CanIfWakeupCheckValidByNM),
    "#define CANIF_TX_BUFFER_SIZE                   " + Number(cfg.CanIfTxBufferSize) + "u",
    "#define CANIF_NUM_TX_PDUS                      6u",
    "#define CANIF_NUM_RX_PDUS                      4u",
    "#define CANIF_ACTIVE_BAUDRATE_CFG_ID           " + Number(cfg.ActiveBaudRateConfigID) + "u",
    "",
    "#endif /* CANIF_CFG_H */"
  ].join("\n");
}

function generateCanIfLcfgC() {
  const pdu = getEffectiveTxPdu(cfg.SelectedTxPduId);
  return [
    "/* CanIf Link-Time / Post-Build Configuration (CanIf_Lcfg.c) */",
    '#include "CanIf.h"',
    '#include "PduR_CanIf.h"',
    '#include "CanTp_Cbk.h"',
    '#include "CanNm_Cbk.h"',
    "",
    "const CanIf_TxPduConfigType CanIf_TxPduConfig[CANIF_NUM_TX_PDUS] = {",
    "  { /* Selected TxPduId=" + pdu.txPduId + " */",
    "    .CanIfTxPduId          = " + pdu.txPduId + "u,",
    "    .CanIfTxPduCanId       = " + fmtHex(pdu.encodedCanId, 8) + "u, /* Raw=" + fmtHex(pdu.rawCanId, 3) + " */",
    "    .CanIfTxPduCanIdType   = " + pdu.idType + ",",
    "    .CanIfTxPduHthId       = " + pdu.hthId + "_HANDLE, /* " + pdu.hthType + "CAN */",
    "    .CanIfTxPduPnFilterPdu = " + (pdu.pnFilterPdu ? "TRUE" : "FALSE") + ",",
    "    .CanIfTxPduTruncation  = " + (cfg.CanIfTxPduTruncation ? "TRUE" : "FALSE") + ",",
    "    .UserTxConfirmation    = " + pdu.ulCbk,
    "  }",
    "};",
    "",
    "const CanIf_RxPduConfigType CanIf_RxPduConfig[CANIF_NUM_RX_PDUS] = {",
    "  { .RxPduId=0u, .CanId=0x40000120u, .Mask=" + cfg.CanIfRxPduCanIdMaskHex + "u, .MinDlc=" + Number(cfg.CanIfRxPduDataLength) + "u, .UserRxInd=PduR_CanIfRxIndication },",
    "  { .RxPduId=1u, .CanId=0x000007E0u, .Mask=0x7FFu, .MinDlc=8u, .UserRxInd=CanTp_RxIndication },",
    "  { .RxPduId=2u, .CanId=0x00000500u, .Mask=0x700u, .MinDlc=8u, .UserRxInd=CanNm_RxIndication },",
    "  { .RxPduId=3u, .CanId=0x00000190u, .Mask=0x7FFu, .MinDlc=8u, .UserRxInd=CanTSyn_RxIndication }",
    "};"
  ].join("\n");
}

function generateCanIfJson() {
  return JSON.stringify({
    autosarRelease: "R23-11",
    module: "CanIf (ModuleId 60)",
    ecucParameters: cfg,
    runtimeSnapshot: sim ? {
      ctrlMode: sim.ctrlMode,
      pduMode: sim.pduMode,
      trcvMode: sim.trcvMode,
      regA: fmtHex(sim.regA, 2),
      regB: fmtHex(sim.regB, 2),
      txBufferCount: sim.txBuffer.length
    } : null
  }, null, 2);
}
