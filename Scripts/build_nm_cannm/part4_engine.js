// ================= PART 4A: CO-SIMULATION ENGINE (NM INTERFACE + COORDINATOR + CANNM CH0/CH1) =================

const defaultConfig = {
  // Tab 0: Nm Interface / State Report
  NmCanNmInitialized: true,
  NmDevErrorDetect: true,
  NmBusType: "NM_BUSNM_CANNM",
  NmPassiveModeEnabled: false,
  NmStateChangeIndEnabled: true,
  NmStateReportEnabled: true,
  NmStateReportSignalRef: "ComSig_NMS_B4",
  // Tab 1: Nm Coordinator
  NmCoordinatorSupportEnabled: true,
  NmCycletimeMainFunction: 100,
  NmGlobalCoordinatorTime: 1500,
  NmActiveCoordinator: true,
  NmChannelSleepMaster: true,
  NmSynchronizingNetwork: false,
  // Tab 2: CanNm Timers
  CanNmMainFunctionPeriod: 100,
  CanNmMsgCycleTime: 1000,
  CanNmMsgCycleOffset: 100,
  CanNmRepeatMessageTime: 1500,
  CanNmTimeoutTime: 2000,
  CanNmWaitBusSleepTime: 1500,
  CanNmMsgTimeoutTime: 500,
  // Tab 3: CanNm PDU / CBV / NID
  CanNmNodeId: "0x1A",
  CanNmBaseCanId: "0x500",
  CanNmPduNidPosition: "CANNM_PDU_BYTE_0",
  CanNmPduCbvPosition: "CANNM_PDU_BYTE_1",
  CanNmActiveWakeupBitEnabled: true,
  NmNodeIdEnabled: true,
  NmNodeDetectionEnabled: true,
  // Tab 4: Remote Sleep / Burst / Bus Load
  NmRemoteSleepIndEnabled: true,
  CanNmRemoteSleepIndTime: 1500,
  NmRepeatMsgIndEnabled: true,
  NmPduRxIndicationEnabled: false,
  CanNmImmediateNmTransmissions: 3,
  CanNmImmediateNmCycleTime: 100,
  CanNmImmediateRestartEnabled: true,
  NmBusLoadReductionEnabled: false,
  CanNmMsgReducedTime: 600,
  // Tab 5: Partial Net / Sync PNC / User Data / CWU / Diag
  CanNmPnEnabled: false,
  CanNmPnFilterMaskHex: "05 00",
  CanNmPnResetTime: 1500,
  NmSynchronizedPncShutdownEnabled: false,
  NmComUserDataSupport: true,
  UserDataBytesHex: "11 22 33 44 55 66",
  NmCarWakeUpRxEnabled: true,
  CanNmCarWakeUpFilterEnabled: true,
  CanNmCarWakeUpFilterNodeId: "0x2B",
  NmComControlEnabled: true
};

let ecucConfig = JSON.parse(JSON.stringify(defaultConfig));

function createChannelState(id, name) {
  return {
    id: id,
    name: name,
    commRequested: false,
    nmCoordHold: false,
    canNmMode: "NM_MODE_BUS_SLEEP",
    canNmState: "NM_STATE_BUS_SLEEP",
    remoteSleepInd: false,
    remoteSleepTimerMs: 0,
    sleepReadyBit: false,
    coordPassiveReadyToSleep: false,
    repeatMsgLeftMs: 0,
    timeoutLeftMs: 0,
    waitBusSleepLeftMs: 0,
    msgCycleLeftMs: 0,
    burstLeft: 0,
    cbv: { rmr: false, cwuOrSrb: false, awb: false, pnsr: false, pni: false }
  };
}

function createInitialSimState() {
  return {
    clockMs: 0,
    coordState: "NM_COORD_CLUSTER_SLEEP",
    coordShutdownDelayLeftMs: 0,
    syncPointDone: false,
    nmsSignalVal: 0x00,
    nmsSignalDesc: "NONE (0x00)",
    commDisabled: false,
    pnAvailConfirmed: true,
    eiraMask: 0x0000,
    eraCh0Mask: 0x0000,
    pnResetLeftMs: 0,
    msgTimeoutLeftMs: 0,
    txConfirmBlocked: false,
    txFrameCount: 0,
    lastPduBytes: [0x1A, 0x00, 0x11, 0x22, 0x00, 0x44, 0x55, 0x66],
    lastRxPdu: { nodeId: 0x2B, cbv: 0x10, pniMask: 0x0000, bytes: [0x2B, 0x10, 0xAA, 0xBB, 0xCC, 0xDD, 0xEE, 0xFF] },
    channels: [
      createChannelState(0, "Ch0: CAN_Body"),
      createChannelState(1, "Ch1: CAN_SubNet")
    ],
    regAByte: 0x00,
    prevRegAByte: 0x00,
    regBByte: 0x01,
    prevRegBByte: 0x01,
    activeModId: "MOD_NM",
    activeArrows: [],
    stepExplain: "Hệ thống Nm & CanNm đã khởi tạo ở BUS-SLEEP. Chọn kịch bản hoặc dùng Thao Tác Nhanh để bắt đầu.",
    detFaults: [],
    traceLogs: []
  };
}

let simState = createInitialSimState();

function parseHexByte(str, fallback) {
  const cleaned = String(str || "").trim().replace(/^0x/i, "");
  const val = parseInt(cleaned, 16);
  return Number.isFinite(val) ? (val & 0xFF) : fallback;
}

function parseHexWordId(str, fallback) {
  const cleaned = String(str || "").trim().replace(/^0x/i, "");
  const val = parseInt(cleaned, 16);
  return Number.isFinite(val) ? (val & 0x7FF) : fallback;
}

function parseHexBytesArray(str, len) {
  const parts = String(str || "").trim().replace(/0x/gi, "").split(/[\s,;]+/).filter(Boolean);
  const out = [];
  for (let i = 0; i < len; i++) {
    const v = parseInt(parts[i] || "00", 16);
    out.push(Number.isFinite(v) ? (v & 0xFF) : 0);
  }
  return out;
}

function parsePnMask16(str) {
  const arr = parseHexBytesArray(str, 2);
  return (arr[0] & 0xFF) | ((arr[1] & 0xFF) << 8);
}

function getCbvByteValue(ch) {
  let v = 0;
  if (ch.cbv.rmr) v |= 0x01;
  if (ch.cbv.cwuOrSrb || ch.sleepReadyBit) v |= 0x08;
  if (ch.cbv.awb) v |= 0x10;
  if (ch.cbv.pnsr) v |= 0x20;
  if (ch.cbv.pni || ecucConfig.CanNmPnEnabled) v |= 0x40;
  return v;
}

function getPduFrameBytes() {
  const ch0 = simState.channels[0];
  const nodeId = parseHexByte(ecucConfig.CanNmNodeId, 0x1A);
  const cbvVal = getCbvByteValue(ch0);
  const userBytes = parseHexBytesArray(ecucConfig.UserDataBytesHex, 6);
  const pniArr = parseHexBytesArray(ecucConfig.CanNmPnFilterMaskHex, 2);

  const bytes = [0, 0, 0, 0, 0, 0, 0, 0];
  let uIdx = 0;
  for (let i = 0; i < 8; i++) {
    if ((i === 0 && ecucConfig.CanNmPduNidPosition === "CANNM_PDU_BYTE_0") ||
        (i === 1 && ecucConfig.CanNmPduNidPosition === "CANNM_PDU_BYTE_1")) {
      bytes[i] = nodeId;
    } else if ((i === 1 && ecucConfig.CanNmPduCbvPosition === "CANNM_PDU_BYTE_1") ||
               (i === 0 && ecucConfig.CanNmPduCbvPosition === "CANNM_PDU_BYTE_0")) {
      bytes[i] = cbvVal;
    } else if (ecucConfig.CanNmPnEnabled && (i === 2 || i === 3)) {
      bytes[i] = (i === 2) ? (simState.eiraMask & 0xFF || pniArr[0]) : ((simState.eiraMask >> 8) & 0xFF || pniArr[1]);
    } else if (ecucConfig.NmStateReportEnabled && i === 4) {
      bytes[i] = simState.nmsSignalVal & 0x3F;
    } else {
      bytes[i] = userBytes[uIdx % userBytes.length] || 0x00;
      uIdx++;
    }
  }
  simState.lastPduBytes = bytes;
  return bytes;
}

function addTraceLog(level, caller, callee, api, detail) {
  simState.traceLogs.unshift({
    t: simState.clockMs,
    level: level || "info",
    api: caller + " ➔ " + callee + " : " + api,
    detail: detail
  });
  if (simState.traceLogs.length > 60) simState.traceLogs.length = 60;
}

function reportDetError(moduleName, moduleId, apiName, errCode, detail) {
  simState.detFaults.unshift({ t: simState.clockMs, mod: moduleName, id: moduleId, code: errCode, detail: detail });
  if (simState.detFaults.length > 20) simState.detFaults.length = 20;
  simState.activeArrows.push(moduleName === "Nm" ? "arr_nm_det" : "arr_cannm_det");
  addTraceLog("err", moduleName, "Det", "Det_ReportError(" + moduleId + ", " + apiName + ", " + errCode + ")", detail);
}

function snapshotRegBytes() {
  simState.prevRegAByte = simState.regAByte;
  simState.prevRegBByte = simState.regBByte;
}

function recomputeRegisters() {
  const ch0 = simState.channels[0];
  const ch1 = simState.channels[1];

  const regA = getCbvByteValue(ch0);
  let regB = 0;
  if (simState.coordState === "NM_COORD_SHUTDOWN_INITIATED") regB |= 0x80;
  if (ch0.remoteSleepInd) regB |= 0x40;
  if (ch1.remoteSleepInd || (ecucConfig.NmCoordinatorSupportEnabled && ecucConfig.NmChannelSleepMaster && !ch1.commRequested && ch1.canNmMode !== "NM_MODE_BUS_SLEEP")) regB |= 0x20;
  if (ch0.sleepReadyBit || ch0.coordPassiveReadyToSleep) regB |= 0x10;
  if (ecucConfig.NmStateChangeIndEnabled && ecucConfig.NmStateReportEnabled && simState.nmsSignalVal !== 0) regB |= 0x08;
  if (ch0.nmCoordHold) regB |= 0x04;
  if (ch0.canNmMode === "NM_MODE_NETWORK" && !simState.commDisabled && ch0.timeoutLeftMs > 0) regB |= 0x02;
  if (ecucConfig.NmCanNmInitialized) regB |= 0x01;

  simState.regAByte = regA;
  simState.regBByte = regB;
  getPduFrameBytes();
}

// -------------------- NMS STATE REPORT (SWS_Nm_00154) --------------------

function mapNmsReportCode(prevState, currState) {
  const key = prevState + "->" + currState;
  const table = {
    "NM_STATE_BUS_SLEEP->NM_STATE_REPEAT_MESSAGE":         { val: 0x01, desc: "NMS_RM_BSM (0x01)" },
    "NM_STATE_PREPARE_BUS_SLEEP->NM_STATE_REPEAT_MESSAGE": { val: 0x02, desc: "NMS_RM_PBSM (0x02)" },
    "NM_STATE_REPEAT_MESSAGE->NM_STATE_NORMAL_OPERATION":  { val: 0x04, desc: "NMS_NO_RM (0x04)" },
    "NM_STATE_READY_SLEEP->NM_STATE_NORMAL_OPERATION":     { val: 0x08, desc: "NMS_NO_RS (0x08)" },
    "NM_STATE_READY_SLEEP->NM_STATE_REPEAT_MESSAGE":       { val: 0x10, desc: "NMS_RM_RS (0x10)" },
    "NM_STATE_NORMAL_OPERATION->NM_STATE_REPEAT_MESSAGE":  { val: 0x20, desc: "NMS_RM_NO (0x20)" }
  };
  return table[key] || null;
}

function fireNmStateChangeNotification(chId, prevState, currState) {
  if (prevState === currState || !ecucConfig.NmStateChangeIndEnabled) return;
  simState.activeArrows.push("arr_cannm_nm");
  addTraceLog("info", "CanNm(Ch" + chId + ")", "Nm", "Nm_StateChangeNotification(" + chId + ", " + prevState.replace("NM_STATE_", "") + " ➔ " + currState.replace("NM_STATE_", "") + ")", "[SWS_CanNm_00166] Thông báo chuyển trạng thái lên Nm.");

  if (chId === 0 && ecucConfig.NmStateReportEnabled) {
    const mapped = mapNmsReportCode(prevState, currState);
    if (mapped) {
      simState.nmsSignalVal = mapped.val;
      simState.nmsSignalDesc = mapped.desc;
      simState.activeArrows.push("arr_nm_com");
      addTraceLog("ok", "Nm", "COM", "Com_SendSignal(" + ecucConfig.NmStateReportSignalRef + ", " + mapped.desc + ")", "[SWS_Nm_00154] Tự động ghi mã chuyển trạng thái 6-bit NMS vào COM I-PDU (Byte 4).");
    }
  }
  simState.activeArrows.push("arr_nm_comm");
  addTraceLog("info", "Nm", "BswM", "BswM_Nm_StateChangeNotification(" + chId + ", " + currState.replace("NM_STATE_", "") + ")", "[SWS_Nm_00249] Thông báo mode cho BswM.");
}

// -------------------- CANNM TRANSMIT & TRIGGER TRANSMIT --------------------

function api_CanNm_TransmitFrame(chId, reason) {
  const ch = simState.channels[chId];
  if (!ch || ch.canNmMode !== "NM_MODE_NETWORK" || simState.commDisabled) return;

  if (chId === 0 && ecucConfig.NmComUserDataSupport) {
    simState.activeArrows.push("arr_com_cannm");
    addTraceLog("info", "CanNm(Ch0)", "PduR/COM", "PduR_CanNmTriggerTransmit(TxUserDataPduId)", "[SWS_CanNm_00328] Kéo User Data & NMS (0x" + simState.nmsSignalVal.toString(16).toUpperCase().padStart(2, "0") + ") vào khung 8-Byte PDU.");
  }

  const bytes = getPduFrameBytes();
  const canId = (parseHexWordId(ecucConfig.CanNmBaseCanId, 0x500) + parseHexByte(ecucConfig.CanNmNodeId, 0x1A)) & 0x7FF;
  simState.txFrameCount += 1;
  simState.activeArrows.push("arr_cannm_canif", "arr_canif_hw");

  addTraceLog("ok", "CanNm(Ch" + chId + ")", "CanIf", "CanIf_Transmit(0x" + canId.toString(16).toUpperCase() + ", CBV=0x" + getCbvByteValue(ch).toString(16).toUpperCase().padStart(2, "0") + ")", reason + " · Payload=[" + bytes.map((b) => b.toString(16).toUpperCase().padStart(2, "0")).join(" ") + "]");

  if (simState.txConfirmBlocked) {
    simState.msgTimeoutLeftMs = Number(ecucConfig.CanNmMsgTimeoutTime) || 500;
    addTraceLog("warn", "CanIf", "CanNm", "TxConfirmation Pending (Bus-Off / Blocked)", "Chờ CanNmMsgTimeoutTime (" + simState.msgTimeoutLeftMs + " ms).");
  } else {
    ch.timeoutLeftMs = Number(ecucConfig.CanNmTimeoutTime) || 2000;
    simState.activeArrows.push("arr_canif_cannm");
    if (chId === 0 && ecucConfig.NmSynchronizingNetwork && !simState.syncPointDone) {
      simState.syncPointDone = true;
      simState.activeArrows.push("arr_cannm_nm");
      addTraceLog("info", "CanNm(Ch0)", "Nm", "Nm_SynchronizationPoint(0)", "[SWS_Nm_00226] Đánh dấu điểm đồng bộ chu kỳ phát NM PDU cho Coordinator.");
    }
  }
}

// -------------------- CANNM LOW-LEVEL APIS (CALLED BY NM) --------------------

function transitionCanNmState(ch, newMode, newState) {
  const prevState = ch.canNmState;
  const prevMode = ch.canNmMode;
  ch.canNmMode = newMode;
  ch.canNmState = newState;

  if (newMode === "NM_MODE_NETWORK" && prevMode !== "NM_MODE_NETWORK") {
    simState.activeArrows.push("arr_cannm_nm", "arr_nm_comm");
    addTraceLog("ok", "CanNm(Ch" + ch.id + ")", "Nm ➔ ComM", "Nm_NetworkMode(" + ch.id + ") ➔ ComM_Nm_NetworkMode(" + ch.id + ")", "[SWS_CanNm_00097] Kênh vào NM_MODE_NETWORK.");
  } else if (newMode === "NM_MODE_PREPARE_BUS_SLEEP" && prevMode !== "NM_MODE_PREPARE_BUS_SLEEP") {
    ch.cbv.awb = false; // SWS_CanNm_00402
    ch.cbv.rmr = false;
    ch.remoteSleepInd = false;
    ch.remoteSleepTimerMs = 0;
    simState.activeArrows.push("arr_cannm_nm", "arr_nm_comm");
    addTraceLog("warn", "CanNm(Ch" + ch.id + ")", "Nm ➔ ComM", "Nm_PrepareBusSleepMode(" + ch.id + ") ➔ ComM_Nm_PrepareBusSleepMode(" + ch.id + ")", "[SWS_CanNm_00115/00402] Xóa AWB=0, ComM chuyển SILENT_COM.");
  } else if (newMode === "NM_MODE_BUS_SLEEP" && prevMode !== "NM_MODE_BUS_SLEEP") {
    ch.cbv.awb = false;
    ch.cbv.rmr = false;
    ch.sleepReadyBit = false;
    ch.cbv.cwuOrSrb = false;
    ch.remoteSleepInd = false;
    simState.activeArrows.push("arr_cannm_nm", "arr_nm_comm");
    addTraceLog("ok", "CanNm(Ch" + ch.id + ")", "Nm ➔ ComM", "Nm_BusSleepMode(" + ch.id + ") ➔ ComM_Nm_BusSleepMode(" + ch.id + ")", "[SWS_CanNm_00117] Kênh ngủ hoàn toàn; ComM tắt CanSM (NO_COM).");
  }

  fireNmStateChangeNotification(ch.id, prevState, newState);
}

function api_CanNm_NetworkRequest(chId) {
  if (!ecucConfig.NmCanNmInitialized) {
    if (ecucConfig.NmDevErrorDetect) reportDetError("CanNm", 31, "CanNm_NetworkRequest", "CANNM_E_UNINIT (0x01)", "Chưa gọi CanNm_Init().");
    return false;
  }
  const ch = simState.channels[chId];
  ch.nmCoordHold = true;
  simState.activeArrows.push("arr_nm_cannm");

  if (ch.canNmMode === "NM_MODE_BUS_SLEEP" || ch.canNmMode === "NM_MODE_PREPARE_BUS_SLEEP") {
    const wasPrep = (ch.canNmMode === "NM_MODE_PREPARE_BUS_SLEEP");
    ch.waitBusSleepLeftMs = 0;
    ch.cbv.awb = Boolean(ecucConfig.CanNmActiveWakeupBitEnabled);
    ch.cbv.pni = Boolean(ecucConfig.CanNmPnEnabled);
    ch.repeatMsgLeftMs = Number(ecucConfig.CanNmRepeatMessageTime) || 1500;
    ch.timeoutLeftMs = Number(ecucConfig.CanNmTimeoutTime) || 2000;
    transitionCanNmState(ch, "NM_MODE_NETWORK", "NM_STATE_REPEAT_MESSAGE");

    const burstCnt = Number(ecucConfig.CanNmImmediateNmTransmissions) || 0;
    if (burstCnt > 0 && (!wasPrep || ecucConfig.CanNmImmediateRestartEnabled)) {
      ch.burstLeft = Math.max(0, burstCnt - 1);
      ch.msgCycleLeftMs = ch.burstLeft > 0 ? (Number(ecucConfig.CanNmImmediateNmCycleTime) || 100) : (Number(ecucConfig.CanNmMsgCycleTime) || 1000);
      api_CanNm_TransmitFrame(chId, wasPrep ? "Immediate Restart Tx (SWS_CanNm_00122)" : "Immediate Burst #1 (Active Wakeup)");
    } else if (wasPrep && ecucConfig.CanNmImmediateRestartEnabled) {
      ch.msgCycleLeftMs = Number(ecucConfig.CanNmMsgCycleTime) || 1000;
      api_CanNm_TransmitFrame(chId, "Immediate Restart Tx (SWS_CanNm_00122)");
    } else {
      ch.msgCycleLeftMs = Number(ecucConfig.CanNmMsgCycleOffset) || 100;
    }
  } else if (ch.canNmState === "NM_STATE_READY_SLEEP") {
    ch.remoteSleepInd = false;
    ch.remoteSleepTimerMs = ecucConfig.NmRemoteSleepIndEnabled ? (Number(ecucConfig.CanNmRemoteSleepIndTime) || 1500) : 0;
    ch.msgCycleLeftMs = Number(ecucConfig.CanNmMsgCycleOffset) || 100;
    transitionCanNmState(ch, "NM_MODE_NETWORK", "NM_STATE_NORMAL_OPERATION");
    api_CanNm_TransmitFrame(chId, "Resume Normal Operation Tx");
  }
  recomputeRegisters();
  return true;
}

function api_CanNm_NetworkRelease(chId) {
  if (!ecucConfig.NmCanNmInitialized) {
    if (ecucConfig.NmDevErrorDetect) reportDetError("CanNm", 31, "CanNm_NetworkRelease", "CANNM_E_UNINIT (0x01)", "Chưa gọi CanNm_Init().");
    return false;
  }
  const ch = simState.channels[chId];
  ch.nmCoordHold = false;
  ch.remoteSleepTimerMs = 0;
  simState.activeArrows.push("arr_nm_cannm");
  addTraceLog("info", "Nm", "CanNm(Ch" + chId + ")", "CanNm_NetworkRelease(" + chId + ")", "[SWS_CanNm_00105] Giải phóng yêu cầu giữ mạng từ Nm.");

  if (ch.canNmState === "NM_STATE_NORMAL_OPERATION") {
    ch.msgCycleLeftMs = 0;
    transitionCanNmState(ch, "NM_MODE_NETWORK", "NM_STATE_READY_SLEEP");
  }
  recomputeRegisters();
  return true;
}

function api_CanNm_PassiveStartUp(chId) {
  if (!ecucConfig.NmCanNmInitialized) {
    if (ecucConfig.NmDevErrorDetect) reportDetError("CanNm", 31, "CanNm_PassiveStartUp", "CANNM_E_UNINIT (0x01)", "Chưa gọi CanNm_Init().");
    return false;
  }
  const ch = simState.channels[chId];
  simState.activeArrows.push("arr_nm_cannm");
  if (ch.canNmMode === "NM_MODE_BUS_SLEEP" || ch.canNmMode === "NM_MODE_PREPARE_BUS_SLEEP") {
    ch.nmCoordHold = false;
    ch.waitBusSleepLeftMs = 0;
    ch.cbv.awb = false; // Passive wakeup keeps AWB=0
    ch.cbv.pni = Boolean(ecucConfig.CanNmPnEnabled);
    ch.repeatMsgLeftMs = Number(ecucConfig.CanNmRepeatMessageTime) || 1500;
    ch.timeoutLeftMs = Number(ecucConfig.CanNmTimeoutTime) || 2000;
    ch.msgCycleLeftMs = Number(ecucConfig.CanNmMsgCycleOffset) || 100;
    transitionCanNmState(ch, "NM_MODE_NETWORK", "NM_STATE_REPEAT_MESSAGE");
    addTraceLog("ok", "Nm", "CanNm(Ch" + chId + ")", "CanNm_PassiveStartUp(" + chId + ")", "[SWS_CanNm_00128] Thức dậy thụ động (AWB=0), chờ MsgCycleOffset=" + ch.msgCycleLeftMs + "ms.");
  }
  recomputeRegisters();
  return true;
}

function api_CanNm_SetSleepReadyBit(chId, sleepReadyBit) {
  const ch = simState.channels[chId];
  ch.sleepReadyBit = Boolean(sleepReadyBit);
  ch.cbv.cwuOrSrb = ch.sleepReadyBit;
  simState.activeArrows.push("arr_nm_cannm");
  addTraceLog(sleepReadyBit ? "warn" : "ok", "Nm Coordinator", "CanNm(Ch" + chId + ")", "CanNm_SetSleepReadyBit(" + chId + ", " + (sleepReadyBit ? "TRUE" : "FALSE") + ")", sleepReadyBit ? "[SWS_Nm_00238 / SWS_CanNm_00342] Bật CBV Bit 3 (SRB=1) báo toàn cụm sắp ngủ." : "[SWS_Nm_00180] Xóa CBV Bit 3 (SRB=0) hủy lệnh ngủ đồng bộ!");
  if (ch.canNmMode === "NM_MODE_NETWORK") {
    api_CanNm_TransmitFrame(chId, sleepReadyBit ? "Coordinator SleepReady=1 Tx" : "Coordinator Abort SleepReady=0 Tx");
  }
  recomputeRegisters();
}

function api_CanNm_RepeatMessageRequest(chId) {
  if (!ecucConfig.NmCanNmInitialized) {
    if (ecucConfig.NmDevErrorDetect) reportDetError("CanNm", 31, "CanNm_RepeatMessageRequest", "CANNM_E_UNINIT (0x01)", "Chưa gọi CanNm_Init().");
    return false;
  }
  if (!ecucConfig.NmNodeDetectionEnabled) {
    addTraceLog("warn", "CanNm", "Nm", "CanNm_RepeatMessageRequest() -> E_NOT_OK", "Bị từ chối vì Nm/CanNmNodeDetectionEnabled = FALSE.");
    return false;
  }
  const ch = simState.channels[chId];
  if (ch.canNmState === "NM_STATE_NORMAL_OPERATION" || ch.canNmState === "NM_STATE_READY_SLEEP") {
    ch.cbv.rmr = true;
    ch.remoteSleepInd = false;
    ch.remoteSleepTimerMs = 0;
    ch.repeatMsgLeftMs = Number(ecucConfig.CanNmRepeatMessageTime) || 1500;
    transitionCanNmState(ch, "NM_MODE_NETWORK", "NM_STATE_REPEAT_MESSAGE");
    api_CanNm_TransmitFrame(chId, "Repeat Message Request (CBV Bit 0 RMR=1)");
  }
  recomputeRegisters();
  return true;
}

// -------------------- NM INTERFACE & COORDINATOR LOGIC --------------------

function isChannelReadyForCoordSleep(ch) {
  if (ch.commRequested) return false;
  if (ch.id === 1 && ecucConfig.NmChannelSleepMaster) return true;
  if (!ecucConfig.NmRemoteSleepIndEnabled) return true;
  return ch.remoteSleepInd || ch.canNmMode === "NM_MODE_BUS_SLEEP";
}

function evaluateNmCoordinator() {
  if (!ecucConfig.NmCoordinatorSupportEnabled) return;
  const ch0 = simState.channels[0];
  const ch1 = simState.channels[1];

  const anyAwake = (ch0.canNmMode !== "NM_MODE_BUS_SLEEP") || (ch1.canNmMode !== "NM_MODE_BUS_SLEEP") || ch0.commRequested || ch1.commRequested;
  if (!anyAwake) {
    simState.coordState = "NM_COORD_CLUSTER_SLEEP";
    simState.coordShutdownDelayLeftMs = 0;
    simState.syncPointDone = false;
    return;
  }

  if (ch0.commRequested || ch1.commRequested) {
    if (simState.coordState === "NM_COORD_SHUTDOWN_INITIATED") {
      simState.coordShutdownDelayLeftMs = 0;
      api_CanNm_SetSleepReadyBit(0, false);
    }
    simState.coordState = "NM_COORD_CLUSTER_AWAKE_ACTIVE";
    return;
  }

  // Both channels released by ComM -> check RemoteSleep
  if (isChannelReadyForCoordSleep(ch0) && isChannelReadyForCoordSleep(ch1)) {
    if (simState.coordState !== "NM_COORD_SHUTDOWN_INITIATED") {
      if (ecucConfig.NmSynchronizingNetwork && !simState.syncPointDone) {
        simState.coordState = "NM_COORD_WAIT_REMOTE_SLEEP";
        addTraceLog("info", "Nm Coordinator", "Nm", "Waiting Nm_SynchronizationPoint(Ch0)", "[SWS_Nm_00226] Đủ RemoteSleep, chờ CanNm phát gói NM kế tiếp để đồng bộ.");
        return;
      }
      simState.coordState = "NM_COORD_SHUTDOWN_INITIATED";
      simState.coordShutdownDelayLeftMs = Number(ecucConfig.NmGlobalCoordinatorTime) || 1500;
      if (ecucConfig.NmActiveCoordinator) {
        api_CanNm_SetSleepReadyBit(0, true);
      }
      addTraceLog("warn", "Nm Coordinator", "Cluster", "Coordinated Shutdown Initiated (" + simState.coordShutdownDelayLeftMs + " ms)", "[SWS_Nm_00232] Cả Ch0 & Ch1 đều sẵn sàng ngủ -> chạy NmShutdownDelayTimer.");
    }
  } else {
    if (simState.coordState === "NM_COORD_SHUTDOWN_INITIATED") {
      // Abort Shutdown!
      simState.coordShutdownDelayLeftMs = 0;
      api_CanNm_SetSleepReadyBit(0, false);
      if (!ch0.nmCoordHold) api_CanNm_NetworkRequest(0);
      if (!ch1.nmCoordHold) api_CanNm_NetworkRequest(1);
      addTraceLog("err", "Nm Coordinator", "Cluster", "ABORT COORDINATED SHUTDOWN [SWS_Nm_00180]", "Hủy tắt cụm, xóa CBV Bit 3 SRB=0 và giữ lại cả Ch0 & Ch1!");
    }
    simState.coordState = "NM_COORD_WAIT_REMOTE_SLEEP";
  }
}

function api_Nm_NetworkRequest(chId) {
  snapshotRegBytes();
  simState.activeArrows = ["arr_swc_comm", "arr_comm_nm"];
  if (!ecucConfig.NmCanNmInitialized) {
    if (ecucConfig.NmDevErrorDetect) reportDetError("Nm", 29, "Nm_NetworkRequest", "NM_E_UNINIT (0x00)", "Chưa gọi Nm_Init() trước khi gọi Nm_NetworkRequest(" + chId + ").");
    recomputeRegisters();
    return false;
  }
  if (ecucConfig.NmPassiveModeEnabled) {
    addTraceLog("err", "ComM", "Nm", "Nm_NetworkRequest(" + chId + ") -> E_NOT_OK", "[SWS_Nm_00196] NmPassiveModeEnabled=TRUE: lớp Nm chặn yêu cầu chủ động ngay trước khi xuống CanNm.");
    recomputeRegisters();
    return false;
  }

  simState.channels[chId].commRequested = true;
  addTraceLog("ok", "ComM", "Nm", "Nm_NetworkRequest(" + chId + ")", "[SWS_Nm_00031] BusType=" + ecucConfig.NmBusType + " -> chuyển tiếp xuống CanNm.");

  if (ecucConfig.NmCoordinatorSupportEnabled) {
    if (simState.coordState === "NM_COORD_SHUTDOWN_INITIATED") {
      simState.coordShutdownDelayLeftMs = 0;
      api_CanNm_SetSleepReadyBit(0, false);
      addTraceLog("err", "Nm Coordinator", "Cluster", "Abort Shutdown do ComM NetworkRequest(" + chId + ")", "[SWS_Nm_00180] Hủy tắt cụm khẩn cấp.");
    }
    simState.coordState = "NM_COORD_CLUSTER_AWAKE_ACTIVE";
    api_CanNm_NetworkRequest(0);
    api_CanNm_NetworkRequest(1);
  } else {
    api_CanNm_NetworkRequest(chId);
  }
  recomputeRegisters();
  return true;
}

function api_Nm_NetworkRelease(chId) {
  snapshotRegBytes();
  simState.activeArrows = ["arr_swc_comm", "arr_comm_nm"];
  if (!ecucConfig.NmCanNmInitialized) {
    if (ecucConfig.NmDevErrorDetect) reportDetError("Nm", 29, "Nm_NetworkRelease", "NM_E_UNINIT (0x00)", "Chưa gọi Nm_Init().");
    recomputeRegisters();
    return false;
  }
  if (ecucConfig.NmPassiveModeEnabled) {
    addTraceLog("warn", "ComM", "Nm", "Nm_NetworkRelease(" + chId + ") -> Ignored", "NmPassiveModeEnabled=TRUE.");
    recomputeRegisters();
    return false;
  }

  simState.channels[chId].commRequested = false;
  addTraceLog("info", "ComM", "Nm", "Nm_NetworkRelease(" + chId + ")", "[SWS_Nm_00032] ComM giải phóng kênh Ch" + chId + ".");

  if (ecucConfig.NmCoordinatorSupportEnabled) {
    const ch0 = simState.channels[0];
    const ch1 = simState.channels[1];
    if (ch0.canNmState === "NM_STATE_NORMAL_OPERATION" && ecucConfig.NmRemoteSleepIndEnabled && ch0.remoteSleepTimerMs === 0 && !ch0.remoteSleepInd) {
      ch0.remoteSleepTimerMs = Number(ecucConfig.CanNmRemoteSleepIndTime) || 1500;
    }
    if (ch1.canNmState === "NM_STATE_NORMAL_OPERATION" && !ecucConfig.NmChannelSleepMaster && ecucConfig.NmRemoteSleepIndEnabled && ch1.remoteSleepTimerMs === 0 && !ch1.remoteSleepInd) {
      ch1.remoteSleepTimerMs = Number(ecucConfig.CanNmRemoteSleepIndTime) || 1500;
    }
    if (ch1.id === 1 && ecucConfig.NmChannelSleepMaster && !ch1.commRequested) {
      ch1.remoteSleepInd = true;
    }
    evaluateNmCoordinator();
    if (simState.coordState === "NM_COORD_WAIT_REMOTE_SLEEP") {
      addTraceLog("warn", "Nm Coordinator", "CanNm", "HOLD CanNm_NetworkRequest (Chờ đủ RemoteSleep)", "[SWS_Nm_00232] Nm Coordinator tạm giữ CanNm ở Normal Operation để đợi nhánh còn lại sẵn sàng ngủ.");
    }
  } else {
    api_CanNm_NetworkRelease(chId);
  }
  recomputeRegisters();
  return true;
}

function api_Nm_PassiveStartUp(chId) {
  snapshotRegBytes();
  simState.activeArrows = ["arr_comm_nm", "arr_nm_cannm"];
  if (!ecucConfig.NmCanNmInitialized) {
    if (ecucConfig.NmDevErrorDetect) reportDetError("Nm", 29, "Nm_PassiveStartUp", "NM_E_UNINIT (0x00)", "Chưa gọi Nm_Init().");
    recomputeRegisters();
    return false;
  }
  addTraceLog("info", "ComM", "Nm", "Nm_PassiveStartUp(" + chId + ")", "[SWS_Nm_00030] Gọi xuống CanNm_PassiveStartUp(" + chId + ").");
  if (ecucConfig.NmCoordinatorSupportEnabled) {
    simState.coordState = "NM_COORD_WAIT_REMOTE_SLEEP";
  }
  api_CanNm_PassiveStartUp(chId);
  recomputeRegisters();
  return true;
}

function api_Nm_RepeatMessageRequest(chId) {
  snapshotRegBytes();
  simState.activeArrows = ["arr_swc_rte", "arr_rte_nm", "arr_nm_cannm"];
  if (!ecucConfig.NmCanNmInitialized) {
    if (ecucConfig.NmDevErrorDetect) reportDetError("Nm", 29, "Nm_RepeatMessageRequest", "NM_E_UNINIT (0x00)", "Chưa gọi Nm_Init().");
    recomputeRegisters();
    return false;
  }
  if (ecucConfig.NmPassiveModeEnabled || !ecucConfig.NmNodeDetectionEnabled) {
    addTraceLog("warn", "SWC/ComM", "Nm", "Nm_RepeatMessageRequest(" + chId + ") -> E_NOT_OK", "Bị từ chối do PassiveMode hoặc NodeDetection=FALSE.");
    recomputeRegisters();
    return false;
  }
  addTraceLog("info", "SWC_Diag", "Nm", "Nm_RepeatMessageRequest(" + chId + ")", "[SWS_Nm_00035] Yêu cầu điểm danh toàn mạng qua CanNm_RepeatMessageRequest().");
  api_CanNm_RepeatMessageRequest(chId);
  recomputeRegisters();
  return true;
}

function api_Nm_DisableOrEnableComm(chId, disable) {
  snapshotRegBytes();
  simState.activeArrows = ["arr_comm_nm", "arr_nm_cannm"];
  if (!ecucConfig.NmCanNmInitialized) {
    if (ecucConfig.NmDevErrorDetect) reportDetError("Nm", 29, disable ? "Nm_DisableCommunication" : "Nm_EnableCommunication", "NM_E_UNINIT (0x00)", "Chưa Init.");
    recomputeRegisters();
    return false;
  }
  if (!ecucConfig.NmComControlEnabled) {
    addTraceLog("warn", "Dcm/BswM", "Nm", (disable ? "Nm_DisableCommunication" : "Nm_EnableCommunication") + " -> E_NOT_OK", "NmComControlEnabled = FALSE.");
    recomputeRegisters();
    return false;
  }
  const ch = simState.channels[chId];
  if (ch.canNmMode !== "NM_MODE_NETWORK") {
    addTraceLog("err", "Nm", "CanNm", (disable ? "CanNm_DisableCommunication" : "CanNm_EnableCommunication") + " -> E_NOT_OK", "[SWS_CanNm_00172] Chỉ khả dụng khi đang ở NM_MODE_NETWORK!");
    recomputeRegisters();
    return false;
  }
  simState.commDisabled = Boolean(disable);
  addTraceLog(disable ? "warn" : "ok", "Dcm ➔ Nm", "CanNm(Ch" + chId + ")", disable ? "Nm_DisableCommunication() ➔ CanNm_DisableCommunication()" : "Nm_EnableCommunication() ➔ CanNm_EnableCommunication()", disable ? "[SWS_CanNm_00173/174] Khóa phát NM PDU & đóng băng NM-Timeout Timer (UDS 0x28)." : "[SWS_CanNm_00176/178] Mở lại phát NM PDU & chạy lại NM-Timeout Timer.");
  if (!disable) {
    ch.msgCycleLeftMs = Number(ecucConfig.CanNmMsgCycleOffset) || 100;
    ch.timeoutLeftMs = Number(ecucConfig.CanNmTimeoutTime) || 2000;
  }
  recomputeRegisters();
  return true;
}

function api_Nm_RequestSynchronizedPncShutdown(chId, pncId) {
  snapshotRegBytes();
  simState.activeArrows = ["arr_comm_nm", "arr_nm_cannm"];
  if (!ecucConfig.NmSynchronizedPncShutdownEnabled || !ecucConfig.CanNmPnEnabled) {
    addTraceLog("warn", "ComM", "Nm", "Nm_RequestSynchronizedPncShutdown -> E_NOT_OK", "Cần bật cả CanNmPnEnabled và NmSynchronizedPncShutdownEnabled.");
    recomputeRegisters();
    return false;
  }
  const ch = simState.channels[chId];
  const bitMask = (pncId === 18) ? 0x0004 : 0x0001;
  simState.eiraMask |= bitMask;
  ch.cbv.pni = true;
  ch.cbv.pnsr = true;
  addTraceLog("ok", "ComM", "Nm", "Nm_RequestSynchronizedPncShutdown(" + chId + ", PNC #" + pncId + ")", "[SWS_Nm_91009 ➔ SWS_CanNm_91003] Bật CBV Bit 5 (PNSR=1) & phát lệnh tắt đồng bộ PNC #" + pncId + " xuống CanNm.");
  if (ch.canNmMode === "NM_MODE_NETWORK") {
    api_CanNm_TransmitFrame(chId, "Sync PNC #" + pncId + " Shutdown (PNSR=1)");
  }
  recomputeRegisters();
  return true;
}

function api_CanNm_RxIndication(chId, opts) {
  snapshotRegBytes();
  const ch = simState.channels[chId];
  const o = opts || {};
  const rxNodeId = (o.nodeId !== undefined) ? o.nodeId : 0x2B;
  const rxPniMask = (o.pniMask !== undefined) ? o.pniMask : parsePnMask16(ecucConfig.CanNmPnFilterMaskHex);
  const rxCbv = (o.rmr ? 0x01 : 0) | (o.srb ? 0x08 : 0) | (o.awb ? 0x10 : 0) | (o.pnsr ? 0x20 : 0) | (o.pni ? 0x40 : 0);

  simState.lastRxPdu = {
    nodeId: rxNodeId,
    cbv: rxCbv,
    pniMask: rxPniMask,
    bytes: [rxNodeId, rxCbv, rxPniMask & 0xFF, (rxPniMask >> 8) & 0xFF, 0xAA, 0xBB, 0xCC, 0xDD]
  };
  simState.activeArrows = ["arr_canif_cannm"];

  if (!ecucConfig.NmCanNmInitialized) {
    if (ecucConfig.NmDevErrorDetect) reportDetError("CanNm", 31, "CanNm_RxIndication", "CANNM_E_UNINIT (0x01)", "Chưa gọi CanNm_Init().");
    recomputeRegisters();
    return false;
  }

  // Case 1: Rx in BUS_SLEEP -> Runtime Error + Nm_NetworkStartIndication (Figure 7-1)
  if (ch.canNmMode === "NM_MODE_BUS_SLEEP") {
    reportDetError("CanNm", 31, "CanNm_RxIndication", "CANNM_E_NET_START_IND (0x04 - Runtime)", "[SWS_CanNm_00336] Nhận Rx NM PDU bất ngờ từ Node 0x" + rxNodeId.toString(16).toUpperCase() + " khi đang ở Bus-Sleep Mode.");
    simState.activeArrows.push("arr_cannm_nm", "arr_nm_comm");
    addTraceLog("warn", "CanNm(Ch" + chId + ")", "Nm ➔ ComM", "Nm_NetworkStartIndication(" + chId + ") ➔ ComM_Nm_NetworkStartIndication(" + chId + ")", "[SWS_CanNm_00127 / SWS_Nm_00092] Báo lên ComM để gọi Nm_PassiveStartUp().");
    recomputeRegisters();
    return true;
  }

  // Case 2: Partial Networking Filter Check
  if (ecucConfig.CanNmPnEnabled && simState.pnAvailConfirmed) {
    const filterMask = parsePnMask16(ecucConfig.CanNmPnFilterMaskHex);
    if (!o.pni || (rxPniMask & filterMask) === 0) {
      addTraceLog("warn", "CanNm(Ch" + chId + ")", "PN Filter", "Rx NM PDU Dropped (PNI=" + (o.pni ? "1" : "0") + ", Mask=0x" + filterMask.toString(16).toUpperCase().padStart(4, "0") + ")", "[SWS_CanNm_00409] (RxPNI & FilterMask) == 0 -> CanNm bỏ qua gói tin, KHÔNG reset NM-Timeout Timer!");
      recomputeRegisters();
      return false;
    }
    simState.eiraMask |= (rxPniMask & filterMask);
    simState.eraCh0Mask |= (rxPniMask & filterMask);
    simState.pnResetLeftMs = Number(ecucConfig.CanNmPnResetTime) || 1500;
    simState.activeArrows.push("arr_cannm_com");
    addTraceLog("ok", "CanNm(Ch" + chId + ")", "PduR ➔ ComM", "PduR_CanNmRxIndication(EIRA=0x" + simState.eiraMask.toString(16).toUpperCase().padStart(4, "0") + ")", "[SWS_CanNm_00431] Khớp PN Mask -> cập nhật EIRA/ERA & nạp CanNmPnResetTime.");
  }

  // Case 3: Synchronized PNC Shutdown Rx Forwarding (R22-11+)
  if (ecucConfig.NmSynchronizedPncShutdownEnabled && o.pni && o.pnsr) {
    simState.activeArrows.push("arr_cannm_nm", "arr_nm_comm");
    addTraceLog("ok", "CanNm(Ch" + chId + ")", "Nm ➔ ComM", "Nm_ForwardSynchronizedPncShutdown(" + chId + ") ➔ ComM_Nm_ForwardSynchronizedPncShutdown()", "[SWS_CanNm_91007 / SWS_Nm_91010] Nhận CBV Bit 5 (PNSR=1) từ Gateway, chuyển tiếp lệnh tắt đồng bộ PNC lên ComM!");
  }

  // Case 4: Optional Nm_PduRxIndication callback
  if (ecucConfig.NmPduRxIndicationEnabled) {
    simState.activeArrows.push("arr_cannm_nm");
    addTraceLog("info", "CanNm(Ch" + chId + ")", "Nm", "Nm_PduRxIndication(" + chId + ")", "[SWS_CanNm_00037] Thông báo nhận gói NM PDU hợp lệ lên Nm.");
  }

  // Case 5: Rx in PREPARE_BUS_SLEEP -> Jump back to REPEAT_MESSAGE + RestartIndication
  if (ch.canNmMode === "NM_MODE_PREPARE_BUS_SLEEP") {
    ch.waitBusSleepLeftMs = 0;
    ch.cbv.awb = false;
    ch.repeatMsgLeftMs = Number(ecucConfig.CanNmRepeatMessageTime) || 1500;
    ch.timeoutLeftMs = Number(ecucConfig.CanNmTimeoutTime) || 2000;
    ch.msgCycleLeftMs = Number(ecucConfig.CanNmMsgCycleOffset) || 100;
    transitionCanNmState(ch, "NM_MODE_NETWORK", "NM_STATE_REPEAT_MESSAGE");
    addTraceLog("warn", "CanNm ➔ Nm", "ComM", "ComM_Nm_RestartIndication(" + chId + ")", "[SWS_CanNm_00124] Đang Prepare Bus-Sleep nhận Rx từ Node 0x" + rxNodeId.toString(16).toUpperCase() + " -> quay về Repeat Message!");
  }

  // Case 6: RMR=1 -> Pull to REPEAT_MESSAGE + Nm_RepeatMessageIndication
  if (o.rmr && ecucConfig.NmNodeDetectionEnabled) {
    if (ch.canNmState === "NM_STATE_NORMAL_OPERATION" || ch.canNmState === "NM_STATE_READY_SLEEP") {
      ch.repeatMsgLeftMs = Number(ecucConfig.CanNmRepeatMessageTime) || 1500;
      transitionCanNmState(ch, "NM_MODE_NETWORK", "NM_STATE_REPEAT_MESSAGE");
    }
    if (ecucConfig.NmRepeatMsgIndEnabled) {
      simState.activeArrows.push("arr_cannm_nm");
      addTraceLog("ok", "CanNm(Ch" + chId + ")", "Nm", "Nm_RepeatMessageIndication(" + chId + ")", "[SWS_CanNm_00014 / SWS_Nm_00230] Nhận RMR=1 từ bus -> báo Nm_RepeatMessageIndication().");
    }
  }

  // Case 7: Passive Coordinator (SRB Bit 3) & Car WakeUp (CWU Bit 3)
  if (!ecucConfig.NmActiveCoordinator && ecucConfig.NmCoordinatorSupportEnabled) {
    if (o.srb && !ch.coordPassiveReadyToSleep) {
      ch.coordPassiveReadyToSleep = true;
      simState.activeArrows.push("arr_cannm_nm");
      addTraceLog("ok", "CanNm(Ch" + chId + ")", "Nm (Passive Coord)", "Nm_CoordReadyToSleepIndication(" + chId + ")", "[SWS_CanNm_00344] Main Active Coordinator bật CBV Bit 3=1 -> Passive Coordinator chuẩn bị ngủ theo!");
    } else if (!o.srb && ch.coordPassiveReadyToSleep) {
      ch.coordPassiveReadyToSleep = false;
      simState.activeArrows.push("arr_cannm_nm");
      addTraceLog("err", "CanNm(Ch" + chId + ")", "Nm (Passive Coord)", "Nm_CoordReadyToSleepCancellation(" + chId + ")", "[SWS_CanNm_00349] Main Coordinator xóa Bit 3=0 -> Hủy ngủ trên Passive Coordinator!");
    }
  } else if (o.srb && ecucConfig.NmCarWakeUpRxEnabled) {
    const filterId = parseHexByte(ecucConfig.CanNmCarWakeUpFilterNodeId, 0x2B);
    if (!ecucConfig.CanNmCarWakeUpFilterEnabled || rxNodeId === filterId) {
      simState.activeArrows.push("arr_cannm_nm", "arr_nm_comm");
      addTraceLog("ok", "CanNm ➔ Nm", "BswM", "Nm_CarWakeUpIndication(" + chId + ") ➔ BswM_Nm_CarWakeUpIndication(" + chId + ")", "[SWS_CanNm_00406 / SWS_Nm_00250] Hợp lệ Node 0x" + rxNodeId.toString(16).toUpperCase() + " (CWU=1) -> Đánh thức toàn xe!");
    } else {
      addTraceLog("warn", "CanNm(Ch" + chId + ")", "CarWakeUp Filter", "Blocked CarWakeUp from Node 0x" + rxNodeId.toString(16).toUpperCase(), "[SWS_CanNm_00408] Sai Node ID (yêu cầu 0x" + filterId.toString(16).toUpperCase() + ") -> Không gọi Nm_CarWakeUpIndication().");
    }
  }

  // Case 8: Remote Sleep Cancellation -> Abort Coordinated Shutdown!
  if (ch.remoteSleepInd) {
    ch.remoteSleepInd = false;
    simState.activeArrows.push("arr_cannm_nm");
    addTraceLog("err", "CanNm(Ch" + chId + ")", "Nm Coordinator", "Nm_RemoteSleepCancellation(" + chId + ")", "[SWS_CanNm_00151 / SWS_Nm_00178] Có node thức dậy phát NM PDU -> Hủy cờ RemoteSleep!");
    if (ecucConfig.NmCoordinatorSupportEnabled) {
      evaluateNmCoordinator();
    }
  }

  // Reload NM-Timeout, RemoteSleepTimer & BusLoadReduction
  if (ch.canNmMode === "NM_MODE_NETWORK") {
    ch.timeoutLeftMs = Number(ecucConfig.CanNmTimeoutTime) || 2000;
    if (ch.canNmState === "NM_STATE_NORMAL_OPERATION" && ecucConfig.NmRemoteSleepIndEnabled) {
      ch.remoteSleepTimerMs = Number(ecucConfig.CanNmRemoteSleepIndTime) || 1500;
    }
    if (ecucConfig.NmBusLoadReductionEnabled && ch.canNmState === "NM_STATE_NORMAL_OPERATION") {
      ch.msgCycleLeftMs = Number(ecucConfig.CanNmMsgCycleTime) || 1000;
    }
  }

  recomputeRegisters();
  return true;
}

function api_TriggerRemoteSleepQuiet(chId) {
  const ch = simState.channels[chId];
  if (ch.canNmState === "NM_STATE_NORMAL_OPERATION" && ecucConfig.NmRemoteSleepIndEnabled) {
    ch.remoteSleepTimerMs = 0;
    ch.remoteSleepInd = true;
    simState.activeArrows.push("arr_cannm_nm");
    addTraceLog("ok", "CanNm(Ch" + chId + ")", "Nm Coordinator", "Nm_RemoteSleepIndication(" + chId + ")", "[SWS_CanNm_00150] Hết CanNmRemoteSleepIndTime (" + ecucConfig.CanNmRemoteSleepIndTime + "ms) -> Ch" + chId + " sẵn sàng ngủ!");
  } else if (chId === 1 && ecucConfig.NmChannelSleepMaster) {
    ch.remoteSleepInd = true;
    addTraceLog("info", "Nm(Ch1)", "Nm Coordinator", "Ch1 SleepMaster Ready", "[SWS_Nm_00228] Ch1 có NmChannelSleepMaster=TRUE nên sẵn sàng ngủ ngay.");
  }
}

// -------------------- STEP CLOCK (NM_MAINFUNCTION + CANNM_MAINFUNCTION) --------------------

function stepClockTick(dtMs) {
  snapshotRegBytes();
  simState.clockMs += dtMs;
  simState.activeArrows = ["arr_rte_nm"];

  // 1. TxConfirmation Timeout Watchdog
  if (simState.msgTimeoutLeftMs > 0) {
    simState.msgTimeoutLeftMs = Math.max(0, simState.msgTimeoutLeftMs - dtMs);
    if (simState.msgTimeoutLeftMs === 0 && simState.txConfirmBlocked) {
      simState.activeArrows.push("arr_cannm_nm", "arr_cansm_cannm");
      addTraceLog("err", "CanNm(Ch0)", "Nm & CanSM", "Nm_TxTimeoutException(0) & CanSM_TxTimeoutException(0)", "[SWS_CanNm_00066] Hết CanNmMsgTimeoutTime (" + ecucConfig.CanNmMsgTimeoutTime + "ms) mà không có TxConfirmation!");
    }
  }

  // 2. PN Reset Timer (ERA/EIRA)
  if (ecucConfig.CanNmPnEnabled && simState.pnResetLeftMs > 0) {
    simState.pnResetLeftMs = Math.max(0, simState.pnResetLeftMs - dtMs);
    if (simState.pnResetLeftMs === 0) {
      simState.eiraMask = 0x0000;
      simState.eraCh0Mask = 0x0000;
      simState.activeArrows.push("arr_cannm_com");
      addTraceLog("info", "CanNm", "PduR ➔ ComM", "PduR_CanNmRxIndication(EIRA=0x0000)", "[SWS_CanNm_00431] CanNmPnResetTime hết hạn -> Xóa bit PNC trong EIRA/ERA.");
    }
  }

  // 3. CanNm_MainFunction for Ch0 & Ch1
  for (let i = 0; i < 2; i++) {
    const ch = simState.channels[i];
    if (ch.canNmMode === "NM_MODE_NETWORK") {
      // RepeatMessageTimer
      if (ch.canNmState === "NM_STATE_REPEAT_MESSAGE" && ch.repeatMsgLeftMs > 0) {
        ch.repeatMsgLeftMs = Math.max(0, ch.repeatMsgLeftMs - dtMs);
        if (ch.repeatMsgLeftMs === 0) {
          ch.cbv.rmr = false;
          if (ch.nmCoordHold) {
            transitionCanNmState(ch, "NM_MODE_NETWORK", "NM_STATE_NORMAL_OPERATION");
            if (ecucConfig.NmRemoteSleepIndEnabled) {
              ch.remoteSleepTimerMs = Number(ecucConfig.CanNmRemoteSleepIndTime) || 1500;
            }
          } else {
            ch.msgCycleLeftMs = 0;
            transitionCanNmState(ch, "NM_MODE_NETWORK", "NM_STATE_READY_SLEEP");
          }
        }
      }

      // RemoteSleepIndTimer in Normal Operation
      if (ch.canNmState === "NM_STATE_NORMAL_OPERATION" && ecucConfig.NmRemoteSleepIndEnabled && !ch.remoteSleepInd && ch.remoteSleepTimerMs > 0) {
        ch.remoteSleepTimerMs = Math.max(0, ch.remoteSleepTimerMs - dtMs);
        if (ch.remoteSleepTimerMs === 0) {
          api_TriggerRemoteSleepQuiet(ch.id);
        }
      }

      // MsgCycleTimer / Burst Tx
      if (!simState.commDisabled && (ch.canNmState === "NM_STATE_REPEAT_MESSAGE" || ch.canNmState === "NM_STATE_NORMAL_OPERATION")) {
        if (ch.msgCycleLeftMs > 0) {
          ch.msgCycleLeftMs = Math.max(0, ch.msgCycleLeftMs - dtMs);
          if (ch.msgCycleLeftMs === 0) {
            if (ch.burstLeft > 0) {
              ch.burstLeft -= 1;
              ch.msgCycleLeftMs = ch.burstLeft > 0 ? (Number(ecucConfig.CanNmImmediateNmCycleTime) || 100) : (Number(ecucConfig.CanNmMsgCycleTime) || 1000);
              if (ch.id === 0) api_CanNm_TransmitFrame(0, "Immediate Burst Tx");
            } else {
              const reduced = (ecucConfig.NmBusLoadReductionEnabled && ch.canNmState === "NM_STATE_NORMAL_OPERATION");
              ch.msgCycleLeftMs = reduced ? (Number(ecucConfig.CanNmMsgReducedTime) || 600) : (Number(ecucConfig.CanNmMsgCycleTime) || 1000);
              if (ch.id === 0) api_CanNm_TransmitFrame(0, reduced ? "Periodic Tx (BusLoad Reduced)" : "Periodic NM PDU Tx");
            }
          }
        }
      }

      // NM-Timeout Timer
      if (!simState.commDisabled && ch.timeoutLeftMs > 0) {
        ch.timeoutLeftMs = Math.max(0, ch.timeoutLeftMs - dtMs);
        if (ch.timeoutLeftMs === 0) {
          if (ch.canNmState === "NM_STATE_READY_SLEEP") {
            ch.waitBusSleepLeftMs = Number(ecucConfig.CanNmWaitBusSleepTime) || 1500;
            transitionCanNmState(ch, "NM_MODE_PREPARE_BUS_SLEEP", "NM_STATE_PREPARE_BUS_SLEEP");
          } else {
            ch.timeoutLeftMs = Number(ecucConfig.CanNmTimeoutTime) || 2000;
          }
        }
      }
    } else if (ch.canNmMode === "NM_MODE_PREPARE_BUS_SLEEP") {
      if (ch.waitBusSleepLeftMs > 0) {
        ch.waitBusSleepLeftMs = Math.max(0, ch.waitBusSleepLeftMs - dtMs);
        if (ch.waitBusSleepLeftMs === 0) {
          transitionCanNmState(ch, "NM_MODE_BUS_SLEEP", "NM_STATE_BUS_SLEEP");
        }
      }
    }
  }

  // 4. Nm_MainFunction() Coordinator Timer
  if (ecucConfig.NmCoordinatorSupportEnabled) {
    if (simState.coordState === "NM_COORD_WAIT_REMOTE_SLEEP") {
      evaluateNmCoordinator();
    } else if (simState.coordState === "NM_COORD_SHUTDOWN_INITIATED" && simState.coordShutdownDelayLeftMs > 0) {
      simState.coordShutdownDelayLeftMs = Math.max(0, simState.coordShutdownDelayLeftMs - dtMs);
      if (simState.coordShutdownDelayLeftMs === 0) {
        api_CanNm_NetworkRelease(0);
        api_CanNm_NetworkRelease(1);
        addTraceLog("ok", "Nm Coordinator", "CanNm (Ch0 & Ch1)", "NmShutdownDelayTimer = 0 ➔ CanNm_NetworkRelease(All)", "[SWS_Nm_00236] Hết trễ phối hợp -> giải phóng đồng bộ tất cả kênh CanNm sang Ready Sleep!");
      }
    } else if (simState.channels[0].canNmMode === "NM_MODE_BUS_SLEEP" && simState.channels[1].canNmMode === "NM_MODE_BUS_SLEEP") {
      simState.coordState = "NM_COORD_CLUSTER_SLEEP";
    }
  }

  recomputeRegisters();
  if (typeof renderAll === "function") renderAll();
}

// -------------------- CONFIG SYNC & TIMING VALIDATION --------------------

function syncConfigToDOM() {
  Object.keys(defaultConfig).forEach((k) => {
    const el = document.getElementById("cfg_" + k);
    if (!el) return;
    if (el.type === "checkbox") el.checked = Boolean(ecucConfig[k]);
    else el.value = ecucConfig[k];
  });
}

function onConfigInputChanged(key) {
  const el = document.getElementById("cfg_" + key);
  if (!el) return;
  if (el.type === "checkbox") ecucConfig[key] = el.checked;
  else if (el.type === "number") ecucConfig[key] = Number(el.value);
  else ecucConfig[key] = el.value;

  if (key === "CanNmPnEnabled") {
    simState.channels[0].cbv.pni = Boolean(ecucConfig.CanNmPnEnabled);
  }
  recomputeRegisters();
  if (typeof renderAll === "function") renderAll();
}

function validateConfigRules() {
  const errs = [];
  if (ecucConfig.CanNmPduNidPosition !== "CANNM_PDU_OFF" && ecucConfig.CanNmPduNidPosition === ecucConfig.CanNmPduCbvPosition) {
    errs.push({ cls: "err", msg: "⚠️ Lỗi PDU Layout: CanNmPduNidPosition và CanNmPduCbvPosition không được trùng cùng một Byte!" });
  }
  if (Number(ecucConfig.CanNmTimeoutTime) <= Number(ecucConfig.CanNmMsgCycleTime)) {
    errs.push({ cls: "err", msg: "⚠️ Lỗi Timing (SWS_CanNm_00246): CanNmTimeoutTime (" + ecucConfig.CanNmTimeoutTime + "ms) phải LỚN HƠN CanNmMsgCycleTime (" + ecucConfig.CanNmMsgCycleTime + "ms)!" });
  }
  if (ecucConfig.NmRemoteSleepIndEnabled && Number(ecucConfig.CanNmRemoteSleepIndTime) <= Number(ecucConfig.CanNmMsgCycleTime)) {
    errs.push({ cls: "err", msg: "⚠️ Lỗi Timing Coordinator: CanNmRemoteSleepIndTime (" + ecucConfig.CanNmRemoteSleepIndTime + "ms) phải LỚN HƠN CanNmMsgCycleTime!" });
  }
  if (ecucConfig.NmCoordinatorSupportEnabled && !ecucConfig.NmRemoteSleepIndEnabled) {
    errs.push({ cls: "", msg: "💡 Lưu ý SWS_Nm_00201: Đang bật NmCoordinatorSupportEnabled nhưng tắt NmRemoteSleepIndEnabled — Coordinator sẽ không đợi các node từ xa trên Ch0." });
  }
  return errs;
}
