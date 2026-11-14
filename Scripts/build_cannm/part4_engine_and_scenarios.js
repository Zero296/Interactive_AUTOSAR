/*************************************************************************
 * PART 4: SIMULATION ENGINE, TIMERS, PDU PACKER & 14 SCENARIOS (S1..S14)
 * Standard: AUTOSAR Classic R22-11 / R23-11 (SWS_CanNm, SWS_Nm, SWS_ComM)
 *************************************************************************/

// 1. ECUC CONFIGURATION STATE & DEFAULTS
const defaultConfig = {
  CanNmInitialized: true,
  CanNmDevErrorDetect: true,
  CanNmPassiveModeEnabled: false,
  CanNmActiveWakeupBitEnabled: true,
  CanNmStateChangeIndEnabled: true,
  CanNmComControlEnabled: true,
  CanNmMainFunctionPeriod: 100,
  CanNmMsgCycleTime: 1000,
  CanNmMsgCycleOffset: 100,
  CanNmRepeatMessageTime: 1500,
  CanNmTimeoutTime: 2000,
  CanNmWaitBusSleepTime: 1500,
  CanNmMsgTimeoutTime: 500,
  CanNmNodeId: 0x1A,
  CanNmBaseCanId: 0x500,
  CanNmPduNidPosition: "BYTE_0",
  CanNmPduCbvPosition: "BYTE_1",
  CanNmNodeIdEnabled: true,
  CanNmNodeDetectionEnabled: true,
  CanNmRepeatMsgIndEnabled: true,
  CanNmImmediateNmTransmissions: 3,
  CanNmImmediateNmCycleTime: 100,
  CanNmImmediateRestartEnabled: true,
  CanNmBusLoadReductionEnabled: false,
  CanNmMsgReducedTime: 500,
  CanNmPnEnabled: false,
  CanNmAllNmMessagesKeepAwake: false,
  CanNmPnInfoOffset: 2,
  CanNmPnInfoLength: 2,
  CanNmPnFilterMaskHex: "05 00",
  CanNmPnEiraCalcEnabled: true,
  CanNmPnEraCalcEnabled: false,
  CanNmPnResetTime: 1500,
  CanNmSynchronizedPncShutdownEnabled: false,
  CanNmUserDataEnabled: true,
  CanNmComUserDataSupport: false,
  UserDataBytesHex: "11 22 33 44 55 66",
  CanNmCarWakeUpRxEnabled: true,
  CanNmCarWakeUpFilterEnabled: false,
  CanNmCarWakeUpFilterNodeId: 0x2B,
  CanNmRemoteSleepIndEnabled: false,
  CanNmRemoteSleepIndTime: 1500
};

let ecucConfig = JSON.parse(JSON.stringify(defaultConfig));

// 2. LIVE SIMULATION RUNTIME STATE
let simState = {
  mode: "NM_MODE_BUS_SLEEP", // NM_MODE_BUS_SLEEP | NM_MODE_PREPARE_BUS_SLEEP | NM_MODE_NETWORK
  subState: "NM_STATE_REPEAT_MESSAGE", // NM_STATE_REPEAT_MESSAGE | NM_STATE_NORMAL_OPERATION | NM_STATE_READY_SLEEP | NM_STATE_SYNCHRONIZE
  cbv: { rmr: false, csr: false, awb: false, pni: false },
  engine: { netRequest: false, immBurstActive: false, burstLeft: 0, msgTxEnabled: true },
  timers: {
    repeatMsg: 0,
    timeout: 0,
    waitBusSleep: 0,
    msgCycle: 0,
    pnReset: 0,
    remoteSleep: 0
  },
  pnc: { eira: 0x0000, era: 0x0000 },
  clockMs: 0,
  lastBusActivity: "Chưa có",
  wakeupSource: "None",
  activeDirection: "None",
  traceLogs: [],
  currentScenario: 1,
  currentStep: 0,
  autoScenarioTimer: null,
  autoClockTimer: null
};

// 3. CONFIGURATION MANAGEMENT & VALIDATION
function updateConfigFromUI() {
  const getChecked = (id, fallback) => {
    const el = document.getElementById(id);
    return el ? el.checked : fallback;
  };
  const getVal = (id, fallback) => {
    const el = document.getElementById(id);
    return el ? el.value : fallback;
  };
  const getIntVal = (id, fallback, minVal) => {
    const raw = parseInt(getVal(id, fallback), 10);
    return Math.max(minVal, isNaN(raw) ? fallback : raw);
  };

  ecucConfig.CanNmInitialized = getChecked("cfg_CanNmInitialized", true);
  ecucConfig.CanNmDevErrorDetect = getChecked("cfg_CanNmDevErrorDetect", true);
  ecucConfig.CanNmPassiveModeEnabled = getChecked("cfg_CanNmPassiveModeEnabled", false);
  ecucConfig.CanNmActiveWakeupBitEnabled = getChecked("cfg_CanNmActiveWakeupBitEnabled", true);
  ecucConfig.CanNmStateChangeIndEnabled = getChecked("cfg_CanNmStateChangeIndEnabled", true);
  ecucConfig.CanNmComControlEnabled = getChecked("cfg_CanNmComControlEnabled", true);

  ecucConfig.CanNmMainFunctionPeriod = getIntVal("cfg_CanNmMainFunctionPeriod", 100, 10);
  ecucConfig.CanNmMsgCycleTime = getIntVal("cfg_CanNmMsgCycleTime", 1000, 50);
  ecucConfig.CanNmMsgCycleOffset = getIntVal("cfg_CanNmMsgCycleOffset", 100, 0);
  ecucConfig.CanNmRepeatMessageTime = getIntVal("cfg_CanNmRepeatMessageTime", 1500, 100);
  ecucConfig.CanNmTimeoutTime = getIntVal("cfg_CanNmTimeoutTime", 2000, 100);
  ecucConfig.CanNmWaitBusSleepTime = getIntVal("cfg_CanNmWaitBusSleepTime", 1500, 100);
  ecucConfig.CanNmMsgTimeoutTime = getIntVal("cfg_CanNmMsgTimeoutTime", 500, 50);

  // Parse Node ID & Base ID
  const rawNode = getVal("cfg_CanNmNodeId", "0x1A").trim();
  const parsedNode = parseInt(rawNode.replace(/^0x/i, ""), 16);
  ecucConfig.CanNmNodeId = isNaN(parsedNode) ? 0x1A : (parsedNode & 0xFF);

  const rawBase = getVal("cfg_CanNmBaseCanId", "0x500").trim();
  const parsedBase = parseInt(rawBase.replace(/^0x/i, ""), 16);
  ecucConfig.CanNmBaseCanId = isNaN(parsedBase) ? 0x500 : parsedBase;

  ecucConfig.CanNmPduNidPosition = getVal("cfg_CanNmPduNidPosition", "BYTE_0");
  ecucConfig.CanNmPduCbvPosition = getVal("cfg_CanNmPduCbvPosition", "BYTE_1");
  ecucConfig.CanNmNodeIdEnabled = getChecked("cfg_CanNmNodeIdEnabled", true);
  ecucConfig.CanNmNodeDetectionEnabled = getChecked("cfg_CanNmNodeDetectionEnabled", true);
  ecucConfig.CanNmRepeatMsgIndEnabled = getChecked("cfg_CanNmRepeatMsgIndEnabled", true);

  ecucConfig.CanNmImmediateNmTransmissions = getIntVal("cfg_CanNmImmediateNmTransmissions", 3, 0);
  ecucConfig.CanNmImmediateNmCycleTime = getIntVal("cfg_CanNmImmediateNmCycleTime", 100, 20);
  ecucConfig.CanNmImmediateRestartEnabled = getChecked("cfg_CanNmImmediateRestartEnabled", true);
  ecucConfig.CanNmBusLoadReductionEnabled = getChecked("cfg_CanNmBusLoadReductionEnabled", false);
  ecucConfig.CanNmMsgReducedTime = getIntVal("cfg_CanNmMsgReducedTime", 500, 50);

  ecucConfig.CanNmPnEnabled = getChecked("cfg_CanNmPnEnabled", false);
  ecucConfig.CanNmAllNmMessagesKeepAwake = getChecked("cfg_CanNmAllNmMessagesKeepAwake", false);
  ecucConfig.CanNmPnInfoOffset = getIntVal("cfg_CanNmPnInfoOffset", 2, 1);
  ecucConfig.CanNmPnInfoLength = getIntVal("cfg_CanNmPnInfoLength", 2, 1);
  ecucConfig.CanNmPnFilterMaskHex = getVal("cfg_CanNmPnFilterMaskByte", "05 00").trim();
  ecucConfig.CanNmPnEiraCalcEnabled = getChecked("cfg_CanNmPnEiraCalcEnabled", true);
  ecucConfig.CanNmPnEraCalcEnabled = getChecked("cfg_CanNmPnEraCalcEnabled", false);
  ecucConfig.CanNmPnResetTime = getIntVal("cfg_CanNmPnResetTime", 1500, 100);
  ecucConfig.CanNmSynchronizedPncShutdownEnabled = getChecked("cfg_CanNmSynchronizedPncShutdownEnabled", false);

  ecucConfig.CanNmUserDataEnabled = getChecked("cfg_CanNmUserDataEnabled", true);
  ecucConfig.CanNmComUserDataSupport = getChecked("cfg_CanNmComUserDataSupport", false);
  ecucConfig.UserDataBytesHex = getVal("cfg_UserDataBytesHex", "11 22 33 44 55 66").trim();

  ecucConfig.CanNmCarWakeUpRxEnabled = getChecked("cfg_CanNmCarWakeUpRxEnabled", true);
  ecucConfig.CanNmCarWakeUpFilterEnabled = getChecked("cfg_CanNmCarWakeUpFilterEnabled", false);
  const rawCwuNode = getVal("cfg_CanNmCarWakeUpFilterNodeId", "0x2B").trim();
  const parsedCwu = parseInt(rawCwuNode.replace(/^0x/i, ""), 16);
  ecucConfig.CanNmCarWakeUpFilterNodeId = isNaN(parsedCwu) ? 0x2B : (parsedCwu & 0xFF);

  ecucConfig.CanNmRemoteSleepIndEnabled = getChecked("cfg_CanNmRemoteSleepIndEnabled", false);
  ecucConfig.CanNmRemoteSleepIndTime = getIntVal("cfg_CanNmRemoteSleepIndTime", 1500, 100);

  validateTimingRules();
}

function validateTimingRules() {
  const alertBox = document.getElementById("cfgAlertBox");
  const alertText = document.getElementById("cfgAlertText");
  if (!alertBox || !alertText) return;

  const warnings = [];
  if (ecucConfig.CanNmTimeoutTime <= ecucConfig.CanNmMsgCycleTime) {
    warnings.push(`CanNmTimeoutTime (${ecucConfig.CanNmTimeoutTime}ms) phải LỚN HƠN CanNmMsgCycleTime (${ecucConfig.CanNmMsgCycleTime}ms) theo SWS_CanNm_00246 để tránh mạng bị rơi vào trạng thái ngủ lỡ dở.`);
  }
  if (ecucConfig.CanNmMsgCycleOffset >= ecucConfig.CanNmMsgCycleTime) {
    warnings.push(`CanNmMsgCycleOffset (${ecucConfig.CanNmMsgCycleOffset}ms) nên nhỏ hơn CanNmMsgCycleTime (${ecucConfig.CanNmMsgCycleTime}ms).`);
  }
  if (ecucConfig.CanNmPnEnabled && ecucConfig.CanNmPnInfoOffset + ecucConfig.CanNmPnInfoLength > 8) {
    warnings.push(`Vùng Partial Network (Offset=${ecucConfig.CanNmPnInfoOffset} + Length=${ecucConfig.CanNmPnInfoLength}) vượt quá kích thước 8 Bytes của CAN Frame.`);
  }

  if (warnings.length > 0) {
    alertText.innerHTML = warnings.join("<br/>");
    alertBox.classList.remove("hidden");
  } else {
    alertBox.classList.add("hidden");
  }
}

function updateUIFromConfig() {
  const setChecked = (id, val) => { const el = document.getElementById(id); if (el) el.checked = !!val; };
  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };

  setChecked("cfg_CanNmInitialized", ecucConfig.CanNmInitialized);
  setChecked("cfg_CanNmDevErrorDetect", ecucConfig.CanNmDevErrorDetect);
  setChecked("cfg_CanNmPassiveModeEnabled", ecucConfig.CanNmPassiveModeEnabled);
  setChecked("cfg_CanNmActiveWakeupBitEnabled", ecucConfig.CanNmActiveWakeupBitEnabled);
  setChecked("cfg_CanNmStateChangeIndEnabled", ecucConfig.CanNmStateChangeIndEnabled);
  setChecked("cfg_CanNmComControlEnabled", ecucConfig.CanNmComControlEnabled);

  setVal("cfg_CanNmMainFunctionPeriod", ecucConfig.CanNmMainFunctionPeriod);
  setVal("cfg_CanNmMsgCycleTime", ecucConfig.CanNmMsgCycleTime);
  setVal("cfg_CanNmMsgCycleOffset", ecucConfig.CanNmMsgCycleOffset);
  setVal("cfg_CanNmRepeatMessageTime", ecucConfig.CanNmRepeatMessageTime);
  setVal("cfg_CanNmTimeoutTime", ecucConfig.CanNmTimeoutTime);
  setVal("cfg_CanNmWaitBusSleepTime", ecucConfig.CanNmWaitBusSleepTime);
  setVal("cfg_CanNmMsgTimeoutTime", ecucConfig.CanNmMsgTimeoutTime);

  setVal("cfg_CanNmNodeId", "0x" + (ecucConfig.CanNmNodeId & 0xFF).toString(16).toUpperCase().padStart(2, "0"));
  setVal("cfg_CanNmBaseCanId", "0x" + ecucConfig.CanNmBaseCanId.toString(16).toUpperCase());
  setVal("cfg_CanNmPduNidPosition", ecucConfig.CanNmPduNidPosition);
  setVal("cfg_CanNmPduCbvPosition", ecucConfig.CanNmPduCbvPosition);
  setChecked("cfg_CanNmNodeIdEnabled", ecucConfig.CanNmNodeIdEnabled);
  setChecked("cfg_CanNmNodeDetectionEnabled", ecucConfig.CanNmNodeDetectionEnabled);
  setChecked("cfg_CanNmRepeatMsgIndEnabled", ecucConfig.CanNmRepeatMsgIndEnabled);

  setVal("cfg_CanNmImmediateNmTransmissions", ecucConfig.CanNmImmediateNmTransmissions);
  setVal("cfg_CanNmImmediateNmCycleTime", ecucConfig.CanNmImmediateNmCycleTime);
  setChecked("cfg_CanNmImmediateRestartEnabled", ecucConfig.CanNmImmediateRestartEnabled);
  setChecked("cfg_CanNmBusLoadReductionEnabled", ecucConfig.CanNmBusLoadReductionEnabled);
  setVal("cfg_CanNmMsgReducedTime", ecucConfig.CanNmMsgReducedTime);

  setChecked("cfg_CanNmPnEnabled", ecucConfig.CanNmPnEnabled);
  setChecked("cfg_CanNmAllNmMessagesKeepAwake", ecucConfig.CanNmAllNmMessagesKeepAwake);
  setVal("cfg_CanNmPnInfoOffset", ecucConfig.CanNmPnInfoOffset);
  setVal("cfg_CanNmPnInfoLength", ecucConfig.CanNmPnInfoLength);
  setVal("cfg_CanNmPnFilterMaskByte", ecucConfig.CanNmPnFilterMaskHex);
  setChecked("cfg_CanNmPnEiraCalcEnabled", ecucConfig.CanNmPnEiraCalcEnabled);
  setChecked("cfg_CanNmPnEraCalcEnabled", ecucConfig.CanNmPnEraCalcEnabled);
  setVal("cfg_CanNmPnResetTime", ecucConfig.CanNmPnResetTime);
  setChecked("cfg_CanNmSynchronizedPncShutdownEnabled", ecucConfig.CanNmSynchronizedPncShutdownEnabled);

  setChecked("cfg_CanNmUserDataEnabled", ecucConfig.CanNmUserDataEnabled);
  setChecked("cfg_CanNmComUserDataSupport", ecucConfig.CanNmComUserDataSupport);
  setVal("cfg_UserDataBytesHex", ecucConfig.UserDataBytesHex);
  setChecked("cfg_CanNmCarWakeUpRxEnabled", ecucConfig.CanNmCarWakeUpRxEnabled);
  setChecked("cfg_CanNmCarWakeUpFilterEnabled", ecucConfig.CanNmCarWakeUpFilterEnabled);
  setVal("cfg_CanNmCarWakeUpFilterNodeId", "0x" + (ecucConfig.CanNmCarWakeUpFilterNodeId & 0xFF).toString(16).toUpperCase().padStart(2, "0"));
  setChecked("cfg_CanNmRemoteSleepIndEnabled", ecucConfig.CanNmRemoteSleepIndEnabled);
  setVal("cfg_CanNmRemoteSleepIndTime", ecucConfig.CanNmRemoteSleepIndTime);

  validateTimingRules();
}

function onConfigChange(paramName, fromProgrammatic = false) {
  if (fromProgrammatic) {
    updateUIFromConfig();
  } else {
    updateConfigFromUI();
  }
  addTraceLog("API", "User -> ECUC", `Cập nhật cấu hình: ${paramName}`, "Áp dụng tham số cấu hình trực tiếp vào mô phỏng CanNM.");
  renderAll();
}

function resetDefaultConfig() {
  ecucConfig = JSON.parse(JSON.stringify(defaultConfig));
  updateUIFromConfig();
  addTraceLog("API", "User -> System", "Khôi phục cấu hình mặc định (Reset Default)", "Toàn bộ tham số ECUC được đưa về giá trị chuẩn AUTOSAR.");
  renderAll();
}

// 4. CORE ENGINE CALCULATION & PDU FRAME BUILDER
function getCbvByteValue() {
  let val = 0;
  if (simState.cbv.rmr) val |= 0x01; // Bit 0
  if (simState.cbv.csr) val |= 0x08; // Bit 3
  if (simState.cbv.awb) val |= 0x10; // Bit 4
  if (simState.cbv.pni || ecucConfig.CanNmPnEnabled) val |= 0x40; // Bit 6
  return val & 0xFF;
}

function getEngineByteValue() {
  let val = 0;
  if (ecucConfig.CanNmInitialized) val |= 0x01; // Bit 0: INIT
  if (simState.engine.msgTxEnabled && !ecucConfig.CanNmPassiveModeEnabled) val |= 0x02; // Bit 1: TX_EN
  if (simState.timers.pnReset > 0) val |= 0x04; // Bit 2: PN_REL
  if (simState.mode === "NM_MODE_PREPARE_BUS_SLEEP") val |= 0x08; // Bit 3: WAIT_TMR
  if (simState.mode === "NM_MODE_NETWORK") val |= 0x10; // Bit 4: TO_TMR
  if (simState.subState === "NM_STATE_REPEAT_MESSAGE" && simState.timers.repeatMsg > 0) val |= 0x20; // Bit 5: RPT_TMR
  if (simState.engine.immBurstActive && simState.engine.burstLeft > 0) val |= 0x40; // Bit 6: BURST
  if (simState.engine.netRequest) val |= 0x80; // Bit 7: NET_REQ
  return val & 0xFF;
}

function getPduFrameBytes() {
  const bytes = [0, 0, 0, 0, 0, 0, 0, 0];
  const nid = ecucConfig.CanNmNodeId & 0xFF;
  const cbv = getCbvByteValue();

  let assigned = [false, false, false, false, false, false, false, false];

  if (ecucConfig.CanNmPduNidPosition === "BYTE_0") {
    bytes[0] = nid; assigned[0] = true;
  } else if (ecucConfig.CanNmPduNidPosition === "BYTE_1") {
    bytes[1] = nid; assigned[1] = true;
  }

  if (ecucConfig.CanNmPduCbvPosition === "BYTE_0") {
    bytes[0] = cbv; assigned[0] = true;
  } else if (ecucConfig.CanNmPduCbvPosition === "BYTE_1") {
    bytes[1] = cbv; assigned[1] = true;
  }

  // Handle PN bytes if enabled
  if (ecucConfig.CanNmPnEnabled) {
    const maskParts = ecucConfig.CanNmPnFilterMaskHex.split(/[\s,]+/).map(h => parseInt(h, 16) || 0);
    for (let i = 0; i < ecucConfig.CanNmPnInfoLength; i++) {
      const idx = ecucConfig.CanNmPnInfoOffset + i;
      if (idx < 8) {
        bytes[idx] = (i < maskParts.length) ? maskParts[i] : 0x00;
        assigned[idx] = true;
      }
    }
  }

  // Fill remaining bytes with User Data
  const userHexArr = ecucConfig.UserDataBytesHex.split(/[\s,]+/).map(h => parseInt(h, 16) || 0);
  let uIdx = 0;
  for (let i = 0; i < 8; i++) {
    if (!assigned[i]) {
      bytes[i] = (uIdx < userHexArr.length) ? userHexArr[uIdx] : 0x00;
      uIdx++;
    }
  }
  return bytes;
}

function triggerCanNmTransmit(reasonLabel) {
  if (!ecucConfig.CanNmInitialized) {
    addTraceLog("DET", "CanNm", "CANNM_E_UNINIT (0x01)", "Từ chối phát bản tin vì module CanNM chưa khởi tạo.");
    return;
  }
  if (ecucConfig.CanNmPassiveModeEnabled) {
    addTraceLog("API", "CanNm (Passive)", "Bỏ qua phát bản tin (PassiveMode = TRUE)", "Node ở chế độ thụ động chỉ nghe bus, không gọi CanIf_Transmit().");
    return;
  }
  if (!simState.engine.msgTxEnabled) {
    addTraceLog("API", "CanNm (TxDisabled)", "Bản tin NM bị chặn (UDS 0x28 DisableCommunication)", "Đường truyền NM đang bị khóa bởi dịch vụ chẩn đoán.");
    return;
  }

  // Check COM User Data TriggerTransmit
  if (ecucConfig.CanNmComUserDataSupport) {
    addTraceLog("API", "CanNm -> PduR", "PduR_CanNmTriggerTransmit(TxUserDataPduId, &PduInfo)", "[SWS_CanNm_00328] CanNM tự động gọi PduR -> Com_TriggerTransmit() để lấy 4..6 bytes User Data mới nhất từ COM.");
  }

  const canIdHex = "0x" + (ecucConfig.CanNmBaseCanId + ecucConfig.CanNmNodeId).toString(16).toUpperCase();
  const bytes = getPduFrameBytes();
  const byteStr = bytes.map(b => b.toString(16).toUpperCase().padStart(2, "0")).join(" ");

  simState.lastBusActivity = `Tx ${canIdHex} [${byteStr}]`;
  simState.activeDirection = "Downward Request ↓";

  addTraceLog("BUS", "CanNm -> CanIf", `CanIf_Transmit(CanNmTxPduId=${canIdHex}, Data=[${byteStr}])`, `${reasonLabel} | SNI=0x${(ecucConfig.CanNmNodeId).toString(16).toUpperCase()}, CBV=0x${getCbvByteValue().toString(16).toUpperCase()} (AWB=${simState.cbv.awb ? 1 : 0}, RMR=${simState.cbv.rmr ? 1 : 0}, PNI=${simState.cbv.pni || ecucConfig.CanNmPnEnabled ? 1 : 0})`);

  // Simulate immediate successful TxConfirmation
  simState.timers.timeout = ecucConfig.CanNmTimeoutTime; // Reload NM-Timeout Timer
  addTraceLog("API", "CanIf -> CanNm", "CanNm_TxConfirmation(TxPduId, E_OK)", `[SWS_CanNm_00099] Gói NM phát thành công lên bus -> Nạp lại NM-Timeout Timer đầy = ${ecucConfig.CanNmTimeoutTime}ms.`);
}

// 5. CORE API TRIGGER IMPLEMENTATIONS
function apiNetworkRequest() {
  if (!ecucConfig.CanNmInitialized) {
    addTraceLog("DET", "CanNm", "CANNM_E_UNINIT (0x01)", "CanNm_NetworkRequest() gọi khi module chưa khởi tạo.");
    return;
  }
  if (ecucConfig.CanNmPassiveModeEnabled) {
    addTraceLog("API", "CanNm", "CanNm_NetworkRequest() -> E_NOT_OK", "[SWS_CanNm_00130] Từ chối yêu cầu mạng vì CanNmPassiveModeEnabled = TRUE.");
    return;
  }

  simState.engine.netRequest = true;
  simState.wakeupSource = "Active SWC Request";
  addTraceLog("API", "ComM -> Nm -> CanNm", "CanNm_NetworkRequest(nmChannelHandle=0)", "[SWS_CanNm_00104] Ứng dụng yêu cầu giữ mạng CAN (COMM_FULL_COMMUNICATION).");

  if (simState.mode === "NM_MODE_BUS_SLEEP") {
    // Active Wakeup from Bus-Sleep
    simState.mode = "NM_MODE_NETWORK";
    simState.subState = "NM_STATE_REPEAT_MESSAGE";
    if (ecucConfig.CanNmActiveWakeupBitEnabled) {
      simState.cbv.awb = true; // SWS_CanNm_00401
    }
    simState.timers.repeatMsg = ecucConfig.CanNmRepeatMessageTime;
    simState.timers.timeout = ecucConfig.CanNmTimeoutTime;

    addTraceLog("STATE", "CanNm State Machine", "BUS_SLEEP -> NETWORK_MODE (REPEAT_MESSAGE)", `[SWS_CanNm_00129] Active Wakeup! Bật Bit 4 (AWB=1) trong CBV, khởi động RepeatMessageTimer=${ecucConfig.CanNmRepeatMessageTime}ms và NM-TimeoutTimer=${ecucConfig.CanNmTimeoutTime}ms.`);

    if (ecucConfig.CanNmImmediateNmTransmissions > 0) {
      simState.engine.immBurstActive = true;
      simState.engine.burstLeft = ecucConfig.CanNmImmediateNmTransmissions;
      simState.timers.msgCycle = 0; // Transmit immediately!
      addTraceLog("API", "CanNm Engine", `Bắt đầu bắn chùm Immediate Burst Tx (${ecucConfig.CanNmImmediateNmTransmissions} gói, chu kỳ ${ecucConfig.CanNmImmediateNmCycleTime}ms)`, "[SWS_CanNm_00334] Đánh thức nhanh toàn bộ các ECU khác trên bus.");
      triggerCanNmTransmit("Gói chùm Burst Tx #1");
      simState.engine.burstLeft--;
      simState.timers.msgCycle = ecucConfig.CanNmImmediateNmCycleTime;
    } else {
      simState.timers.msgCycle = ecucConfig.CanNmMsgCycleOffset;
    }

  } else if (simState.mode === "NM_MODE_PREPARE_BUS_SLEEP") {
    // Wakeup from Prepare Bus-Sleep
    simState.mode = "NM_MODE_NETWORK";
    simState.subState = "NM_STATE_REPEAT_MESSAGE";
    if (ecucConfig.CanNmActiveWakeupBitEnabled) simState.cbv.awb = true;
    simState.timers.waitBusSleep = 0;
    simState.timers.repeatMsg = ecucConfig.CanNmRepeatMessageTime;
    simState.timers.timeout = ecucConfig.CanNmTimeoutTime;

    addTraceLog("STATE", "CanNm State Machine", "PREPARE_BUS_SLEEP -> REPEAT_MESSAGE", "[SWS_CanNm_00123] Đánh thức lại tại Prepare Bus-Sleep! Hủy WaitBusSleepTimer.");

    if (ecucConfig.CanNmImmediateRestartEnabled) {
      addTraceLog("API", "CanNm Engine", "Immediate Restart Enabled -> Phát ngay gói NM PDU tại t=0ms", "[SWS_CanNm_00122] Ngăn toàn mạng rơi vào trạng thái ngủ lỡ dở.");
      triggerCanNmTransmit("Đánh thức khẩn cấp tại Prepare Bus-Sleep");
      simState.timers.msgCycle = ecucConfig.CanNmMsgCycleTime;
    } else {
      simState.timers.msgCycle = ecucConfig.CanNmMsgCycleTime;
    }

  } else if (simState.mode === "NM_MODE_NETWORK") {
    if (simState.subState === "NM_STATE_READY_SLEEP") {
      simState.subState = "NM_STATE_NORMAL_OPERATION";
      simState.timers.msgCycle = ecucConfig.CanNmMsgCycleTime;
      addTraceLog("STATE", "CanNm State Machine", "READY_SLEEP -> NORMAL_OPERATION", "[SWS_CanNm_00110] Ứng dụng yêu cầu mạng lại -> Mở lại phát bản tin định kỳ MsgCycleTime.");
    }
  }

  renderAll();
}

function apiNetworkRelease() {
  if (!ecucConfig.CanNmInitialized) return;
  simState.engine.netRequest = false;
  addTraceLog("API", "ComM -> Nm -> CanNm", "CanNm_NetworkRelease(nmChannelHandle=0)", "[SWS_CanNm_00105] Ứng dụng nhả mạng (COMM_NO_COMMUNICATION).");

  if (simState.mode === "NM_MODE_NETWORK") {
    if (simState.subState === "NM_STATE_NORMAL_OPERATION") {
      simState.subState = "NM_STATE_READY_SLEEP";
      addTraceLog("STATE", "CanNm State Machine", "NORMAL_OPERATION -> READY_SLEEP", "[SWS_CanNm_00118] Chuyển sang Ready Sleep State: NGƯNG PHÁT bản tin NM định kỳ, chỉ lắng nghe bus và chờ NM-Timeout Timer hết hạn.");
    }
  }
  renderAll();
}

function apiPassiveStartUp() {
  if (!ecucConfig.CanNmInitialized) return;
  simState.wakeupSource = "Passive Bus Wakeup";
  addTraceLog("API", "EcuM / ComM -> CanNm", "CanNm_PassiveStartUp(nmChannelHandle=0)", "[SWS_CanNm_00128] Đánh thức thụ động từ bus CAN.");

  if (simState.mode === "NM_MODE_BUS_SLEEP" || simState.mode === "NM_MODE_PREPARE_BUS_SLEEP") {
    simState.mode = "NM_MODE_NETWORK";
    simState.subState = "NM_STATE_REPEAT_MESSAGE";
    simState.cbv.awb = false; // Passive startup: AWB must be 0!
    simState.engine.netRequest = false;
    simState.timers.repeatMsg = ecucConfig.CanNmRepeatMessageTime;
    simState.timers.timeout = ecucConfig.CanNmTimeoutTime;
    simState.timers.waitBusSleep = 0;
    simState.timers.msgCycle = ecucConfig.CanNmMsgCycleOffset; // Delay first Tx by offset!

    addTraceLog("STATE", "CanNm State Machine", "BUS_SLEEP -> NETWORK_MODE (REPEAT_MESSAGE)", `[SWS_CanNm_00128] Passive Wakeup! Giữ Bit 4 AWB=0 trong CBV (0x00), phát gói đầu tiên trễ sau CanNmMsgCycleOffset=${ecucConfig.CanNmMsgCycleOffset}ms để tránh đụng độ.`);
  }
  renderAll();
}

function apiRepeatMessageRequest() {
  if (!ecucConfig.CanNmInitialized) return;
  if (!ecucConfig.CanNmNodeDetectionEnabled) {
    addTraceLog("API", "CanNm", "CanNm_RepeatMessageRequest() -> E_NOT_OK", "[SWS_CanNm_00113] Bị từ chối vì CanNmNodeDetectionEnabled = FALSE.");
    return;
  }

  addTraceLog("API", "SWC/Diag -> Nm -> CanNm", "CanNm_RepeatMessageRequest(nmChannelHandle=0)", "[SWS_CanNm_00113] Yêu cầu toàn mạng điểm danh.");

  if (simState.mode === "NM_MODE_NETWORK") {
    simState.subState = "NM_STATE_REPEAT_MESSAGE";
    simState.cbv.rmr = true; // Set Bit 0 RMR = 1
    simState.timers.repeatMsg = ecucConfig.CanNmRepeatMessageTime;
    simState.timers.timeout = ecucConfig.CanNmTimeoutTime;

    addTraceLog("STATE", "CanNm State Machine", "-> REPEAT_MESSAGE (RMR = 1)", `[SWS_CanNm_00121] Bật Bit 0 (RMR=1) trong byte CBV (0x${getCbvByteValue().toString(16).toUpperCase()}), khởi chạy lại RepeatMessageTimer=${ecucConfig.CanNmRepeatMessageTime}ms và phát ngay bản tin để ép các ECU khác điểm danh.`);
    triggerCanNmTransmit("Yêu cầu điểm danh (Bit RMR = 1)");
  }
  renderAll();
}

function apiSimulatedRxIndication() {
  if (!ecucConfig.CanNmInitialized) return;

  const rxRmr = document.getElementById("simRxRmr")?.checked || false;
  const rxAwb = document.getElementById("simRxAwb")?.checked || false;
  const rxPni = document.getElementById("simRxPni")?.checked || false;
  const rxCsr = document.getElementById("simRxCsr")?.checked || false;
  const rxPniHexStr = (document.getElementById("simRxPniHex")?.value || "05 00").trim();
  const rxPniBytes = rxPniHexStr.split(/[\s,]+/).map(h => parseInt(h, 16) || 0);

  let rxCbv = 0;
  if (rxRmr) rxCbv |= 0x01;
  if (rxCsr) rxCbv |= 0x08;
  if (rxAwb) rxAwb ? (rxCbv |= 0x10) : 0;
  if (rxPni) rxCbv |= 0x40;

  const remoteNodeId = 0x2B; // ECU #2
  const rxCanId = "0x" + (ecucConfig.CanNmBaseCanId + remoteNodeId).toString(16).toUpperCase();
  const rxPduStr = `CanNm_RxIndication(ID=${rxCanId}, CBV=0x${rxCbv.toString(16).toUpperCase().padStart(2, "0")}, PNI=[${rxPniHexStr}])`;

  simState.lastBusActivity = `Rx ${rxCanId} [2B ${rxCbv.toString(16).toUpperCase()} ${rxPniHexStr} ...]`;
  simState.activeDirection = "Upward Indication ↑";

  addTraceLog("BUS", "CanIf -> CanNm", rxPduStr, `Nhận khung NM từ Remote Node 0x2B (RMR=${rxRmr ? 1 : 0}, AWB=${rxAwb ? 1 : 0}, PNI=${rxPni ? 1 : 0}, CSR=${rxCsr ? 1 : 0})`);

  // Check if ECU is in BUS-SLEEP: Runtime error CANNM_E_NET_START_IND
  if (simState.mode === "NM_MODE_BUS_SLEEP") {
    addTraceLog("DET", "CanNm", "CANNM_E_NET_START_IND (0x04)", "[SWS_CanNm_00336] Nhận gói tin NM bất ngờ khi đang ở Bus-Sleep Mode -> Báo Nm_NetworkStartIndication().");
    addTraceLog("API", "CanNm -> Nm -> ComM", "ComM_Nm_NetworkStartIndication()", "ComM gọi Nm_PassiveStartUp() để đánh thức ECU.");
    apiPassiveStartUp();
    return;
  }

  // Check Partial Networking Filter Algorithm (SWS_CanNm_00409)
  if (ecucConfig.CanNmPnEnabled && rxPni) {
    const localMask = ecucConfig.CanNmPnFilterMaskHex.split(/[\s,]+/).map(h => parseInt(h, 16) || 0);
    let matched = false;
    for (let i = 0; i < ecucConfig.CanNmPnInfoLength; i++) {
      const rxByte = (i < rxPniBytes.length) ? rxPniBytes[i] : 0;
      const maskByte = (i < localMask.length) ? localMask[i] : 0;
      if ((rxByte & maskByte) !== 0) {
        matched = true;
        break;
      }
    }

    if (matched) {
      simState.timers.pnReset = ecucConfig.CanNmPnResetTime;
      simState.pnc.eira = (rxPniBytes[0] || 0) | ((rxPniBytes[1] || 0) << 8);
      addTraceLog("PN", "CanNm Engine", "PN Filter Algorithm: MATCHED! (Khớp PNC Filter Mask)", `[SWS_CanNm_00409] Gói tin yêu cầu PNC có liên quan tới ECU này -> Reset PnResetTimer = ${ecucConfig.CanNmPnResetTime}ms và cập nhật EIRA = 0x${simState.pnc.eira.toString(16).toUpperCase().padStart(4, "0")}.`);
      if (ecucConfig.CanNmPnEiraCalcEnabled) {
        addTraceLog("API", "CanNm -> PduR -> ComM", "PduR_CanNmRxIndication(PnEiraRxPduId, &EiraData)", "[SWS_CanNm_00431] Báo mảng EIRA cập nhật lên ComM.");
      }
    } else {
      addTraceLog("PN", "CanNm Engine", "PN Filter Algorithm: IGNORED! (Không khớp PNC Filter Mask)", `Gói tin yêu cầu PNC=[${rxPniHexStr}] không thuộc mặt nạ [${ecucConfig.CanNmPnFilterMaskHex}] của ECU này -> BỘ LỌC PN BỎ QUA GÓI TIN NÀY!`);
      if (!ecucConfig.CanNmAllNmMessagesKeepAwake) {
        renderAll();
        return; // Gói tin bị lọc bỏ hoàn toàn, không reset Timeout timer!
      }
    }
  }

  // Check Car Wakeup Bit (CSR=1)
  if (rxCsr && ecucConfig.CanNmCarWakeUpRxEnabled) {
    if (ecucConfig.CanNmCarWakeUpFilterEnabled && remoteNodeId !== ecucConfig.CanNmCarWakeUpFilterNodeId) {
      addTraceLog("API", "CanNm Engine", "Bỏ qua Car Wakeup (Sai Filter Node ID)", `Gói tin có CSR=1 từ Node 0x${remoteNodeId.toString(16).toUpperCase()} không khớp CanNmCarWakeUpFilterNodeId=0x${ecucConfig.CanNmCarWakeUpFilterNodeId.toString(16).toUpperCase()}.`);
    } else {
      addTraceLog("API", "CanNm -> Nm -> ComM", "Nm_CarWakeUpIndication(nmChannelHandle=0)", "[SWS_CanNm_00406] Phát hiện cờ CSR=1 -> Kích hoạt đánh thức toàn bộ kiến trúc điện trên xe!");
    }
  }

  // If in PREPARE_BUS_SLEEP: Wakeup to REPEAT_MESSAGE
  if (simState.mode === "NM_MODE_PREPARE_BUS_SLEEP") {
    simState.mode = "NM_MODE_NETWORK";
    simState.subState = "NM_STATE_REPEAT_MESSAGE";
    simState.cbv.awb = false;
    simState.timers.waitBusSleep = 0;
    simState.timers.repeatMsg = ecucConfig.CanNmRepeatMessageTime;
    simState.timers.timeout = ecucConfig.CanNmTimeoutTime;
    simState.timers.msgCycle = ecucConfig.CanNmMsgCycleOffset;
    addTraceLog("STATE", "CanNm State Machine", "PREPARE_BUS_SLEEP -> REPEAT_MESSAGE", "[SWS_CanNm_00124] Nhận gói NM khi đang ở Prepare Sleep -> Quay lại Repeat Message State (AWB=0).");
    renderAll();
    return;
  }

  // Reload NM-Timeout Timer
  if (simState.mode === "NM_MODE_NETWORK") {
    simState.timers.timeout = ecucConfig.CanNmTimeoutTime; // Reload Timeout Timer!
    addTraceLog("API", "CanNm Engine", `Nạp lại NM-Timeout Timer = ${ecucConfig.CanNmTimeoutTime}ms`, "[SWS_CanNm_00098] Nhận gói NM từ bus giữ cho toàn mạng không bị ngủ.");

    // Handle Repeat Message Request from remote node (Bit RMR = 1)
    if (rxRmr && ecucConfig.CanNmNodeDetectionEnabled) {
      if (simState.subState === "NM_STATE_NORMAL_OPERATION" || simState.subState === "NM_STATE_READY_SLEEP") {
        simState.subState = "NM_STATE_REPEAT_MESSAGE";
        simState.timers.repeatMsg = ecucConfig.CanNmRepeatMessageTime;
        simState.timers.msgCycle = ecucConfig.CanNmMsgCycleOffset;
        addTraceLog("STATE", "CanNm State Machine", "-> REPEAT_MESSAGE (Do nhận Bit RMR=1 từ Node #2)", "[SWS_CanNm_00119] Remote Node yêu cầu điểm danh -> Chuyển về Repeat Message và phát bản tin điểm danh.");
        if (ecucConfig.CanNmRepeatMsgIndEnabled) {
          addTraceLog("API", "CanNm -> Nm", "Nm_RepeatMessageIndication(nmChannelHandle=0)", "[SWS_CanNm_00014] Báo lên Nm.");
        }
      }
    }

    // Bus Load Reduction: reset Tx timer to MsgCycleTime
    if (ecucConfig.CanNmBusLoadReductionEnabled && simState.subState === "NM_STATE_NORMAL_OPERATION") {
      simState.timers.msgCycle = ecucConfig.CanNmMsgCycleTime;
      addTraceLog("API", "CanNm Engine", `Bus Load Reduction: Hoãn lượt phát (Reload MsgCycleTimer = ${ecucConfig.CanNmMsgCycleTime}ms)`, "[SWS_CanNm_00052] Nhường đường truyền khi có node khác vừa phát.");
    }
  }

  renderAll();
}

function apiToggleCommunication() {
  if (!ecucConfig.CanNmInitialized) return;
  if (!ecucConfig.CanNmComControlEnabled) {
    addTraceLog("DET", "CanNm", "CANNM_E_UNINIT", "Tính năng CanNmComControlEnabled không được bật.");
    return;
  }

  simState.engine.msgTxEnabled = !simState.engine.msgTxEnabled;
  const btn = document.getElementById("btnToggleComm");

  if (!simState.engine.msgTxEnabled) {
    addTraceLog("API", "Dcm -> BswM -> Nm -> CanNm", "CanNm_DisableCommunication(nmChannelHandle=0)", "[SWS_CanNm_00170] Dịch vụ UDS 0x28 CommunicationControl: KHÓA PHÁT BẢN TIN NM và tạm dừng NM-Timeout Timer.");
    if (btn) { btn.innerText = "🔊 Enable Comm"; btn.classList.add("amber"); }
  } else {
    addTraceLog("API", "Dcm -> BswM -> Nm -> CanNm", "CanNm_EnableCommunication(nmChannelHandle=0)", "[SWS_CanNm_00176] Dịch vụ UDS 0x28: MỞ LẠI TRUYỀN THÔNG NM và chạy lại các bộ đếm thời gian.");
    simState.timers.msgCycle = ecucConfig.CanNmMsgCycleOffset;
    if (btn) { btn.innerText = "🔇 Toggle Comm"; btn.classList.remove("amber"); }
  }
  renderAll();
}

// 6. SCHM MAINFUNCTION CLOCK TICK & STATE TRANSITIONS
function stepClockTick(deltaMs) {
  if (!ecucConfig.CanNmInitialized) return;
  simState.clockMs += deltaMs;

  // 1. Tick NM-Timeout Timer
  if (simState.mode === "NM_MODE_NETWORK" && simState.engine.msgTxEnabled) {
    if (simState.timers.timeout > 0) {
      simState.timers.timeout = Math.max(0, simState.timers.timeout - deltaMs);
      if (simState.timers.timeout === 0) {
        if (simState.subState === "NM_STATE_READY_SLEEP") {
          // NM-Timeout expired in Ready Sleep -> Transition to Prepare Bus-Sleep!
          simState.mode = "NM_MODE_PREPARE_BUS_SLEEP";
          simState.cbv.awb = false; // SWS_CanNm_00402: Clear AWB on exit from Network Mode!
          simState.timers.waitBusSleep = ecucConfig.CanNmWaitBusSleepTime;
          addTraceLog("STATE", "CanNm State Machine", "READY_SLEEP -> PREPARE_BUS_SLEEP", `[SWS_CanNm_00115] NM-Timeout Timer hết hạn (0ms) -> Xóa cờ Bit 4 AWB=0 và chuyển sang Prepare Bus-Sleep Mode (WaitBusSleepTimer = ${ecucConfig.CanNmWaitBusSleepTime}ms).`);
          addTraceLog("API", "CanNm -> Nm -> ComM", "ComM_Nm_PrepareBusSleepMode()", "[SWS_CanNm_00114] Báo ComM chuẩn bị tắt nguồn.");
        }
      }
    }
  }

  // 2. Tick RepeatMessageTimer
  if (simState.mode === "NM_MODE_NETWORK" && simState.subState === "NM_STATE_REPEAT_MESSAGE") {
    if (simState.timers.repeatMsg > 0) {
      simState.timers.repeatMsg = Math.max(0, simState.timers.repeatMsg - deltaMs);
      if (simState.timers.repeatMsg === 0) {
        simState.cbv.rmr = false; // SWS_CanNm_00107: Clear RMR on exit from Repeat Message!
        if (simState.engine.netRequest) {
          simState.subState = "NM_STATE_NORMAL_OPERATION";
          simState.timers.msgCycle = ecucConfig.CanNmMsgCycleTime;
          addTraceLog("STATE", "CanNm State Machine", "REPEAT_MESSAGE -> NORMAL_OPERATION", "[SWS_CanNm_00103] Hết CanNmRepeatMessageTime và Network Requested -> Chuyển sang Normal Operation State.");
        } else {
          simState.subState = "NM_STATE_READY_SLEEP";
          addTraceLog("STATE", "CanNm State Machine", "REPEAT_MESSAGE -> READY_SLEEP", "[SWS_CanNm_00106] Hết CanNmRepeatMessageTime và Network Released -> Chuyển sang Ready Sleep State (Ngưng phát Tx).");
        }
      }
    }
  }

  // 3. Tick WaitBusSleepTimer
  if (simState.mode === "NM_MODE_PREPARE_BUS_SLEEP") {
    if (simState.timers.waitBusSleep > 0) {
      simState.timers.waitBusSleep = Math.max(0, simState.timers.waitBusSleep - deltaMs);
      if (simState.timers.waitBusSleep === 0) {
        // WaitBusSleep expired -> Enter Bus-Sleep Mode!
        simState.mode = "NM_MODE_BUS_SLEEP";
        addTraceLog("STATE", "CanNm State Machine", "PREPARE_BUS_SLEEP -> BUS_SLEEP", "[SWS_CanNm_00117] Hết WaitBusSleepTime (0ms) -> Chuyển sang Bus-Sleep Mode.");
        addTraceLog("API", "CanNm -> Nm -> ComM", "ComM_Nm_BusSleepMode()", "[SWS_CanNm_00126] Báo ComM tắt hoàn toàn Controller và Transceiver (CanSM_RequestComMode(NO_COM)).");
      }
    }
  }

  // 4. Tick Periodic MsgCycleTimer & Immediate Burst Tx
  if (simState.mode === "NM_MODE_NETWORK" && simState.engine.msgTxEnabled && !ecucConfig.CanNmPassiveModeEnabled) {
    if (simState.subState === "NM_STATE_REPEAT_MESSAGE" || simState.subState === "NM_STATE_NORMAL_OPERATION") {
      if (simState.timers.msgCycle > 0) {
        simState.timers.msgCycle = Math.max(0, simState.timers.msgCycle - deltaMs);
        if (simState.timers.msgCycle === 0) {
          // Time to transmit NM PDU!
          if (simState.engine.immBurstActive && simState.engine.burstLeft > 0) {
            triggerCanNmTransmit(`Gói chùm Burst Tx #${ecucConfig.CanNmImmediateNmTransmissions - simState.engine.burstLeft + 1}`);
            simState.engine.burstLeft--;
            if (simState.engine.burstLeft > 0) {
              simState.timers.msgCycle = ecucConfig.CanNmImmediateNmCycleTime;
            } else {
              simState.engine.immBurstActive = false;
              simState.timers.msgCycle = ecucConfig.CanNmMsgCycleTime;
              addTraceLog("API", "CanNm Engine", "Hoàn tất chùm Burst Tx -> Chuyển về chu kỳ chuẩn CanNmMsgCycleTime", "[SWS_CanNm_00335]");
            }
          } else {
            triggerCanNmTransmit("Bản tin NM định kỳ (Periodic Tx)");
            simState.timers.msgCycle = ecucConfig.CanNmMsgCycleTime;
          }
        }
      }
    }
  }

  // 5. Tick PN Reset Timer (ERA/EIRA)
  if (simState.timers.pnReset > 0) {
    simState.timers.pnReset = Math.max(0, simState.timers.pnReset - deltaMs);
    if (simState.timers.pnReset === 0) {
      simState.pnc.eira = 0x0000;
      addTraceLog("PN", "CanNm Engine", "PnResetTimer Hết Hạn (0ms) -> Xóa cờ PNC trong EIRA", "[SWS_CanNm_00431] Không còn node nào trên bus yêu cầu PNC -> Báo ComM tắt cụm mạng con.");
    }
  }

  renderAll();
}

function resetSimulation() {
  simState.mode = "NM_MODE_BUS_SLEEP";
  simState.subState = "NM_STATE_REPEAT_MESSAGE";
  simState.cbv = { rmr: false, csr: false, awb: false, pni: false };
  simState.engine = { netRequest: false, immBurstActive: false, burstLeft: 0, msgTxEnabled: true };
  simState.timers = { repeatMsg: 0, timeout: 0, waitBusSleep: 0, msgCycle: 0, pnReset: 0, remoteSleep: 0 };
  simState.pnc = { eira: 0x0000, era: 0x0000 };
  simState.clockMs = 0;
  simState.lastBusActivity = "Chưa có";
  simState.wakeupSource = "None";
  simState.activeDirection = "None";

  addTraceLog("API", "System", "Khởi tạo lại trạng thái CanNM (Reset Simulation)", "Module ở trạng thái NM_MODE_BUS_SLEEP, mọi bộ đếm Timer = OFF, CBV = 0x00.");
  renderAll();
}

// 7. 14 SCENARIOS (S1..S14) DEFINITIONS & WHAT-IF ACTIONS
const SCENARIOS = {
  1: {
    title: "S1: Active Wakeup từ App SWC (AWB=1 & Immediate Burst Tx)",
    steps: [
      {
        api: "Bước 0: Chuẩn bị kịch bản & Thiết lập điều kiện ban đầu (Precondition)",
        io: "Trạng thái sẵn sàng: NM_MODE_BUS_SLEEP | Timers = OFF | CBV = 0x00 | Burst Tx = 3",
        desc: "ECU đang ở chế độ Bus-Sleep Mode, mọi bộ đếm thời gian tắt. Cấu hình kiểm thử: CanNmImmediateNmTransmissions = 3, CanNmActiveWakeupBitEnabled = TRUE. Bấm 'Tiếp Theo ▶' để bắt đầu phát lệnh Active Wakeup.",
        action: () => {
          resetSimulation();
          ecucConfig.CanNmImmediateNmTransmissions = 3;
          ecucConfig.CanNmActiveWakeupBitEnabled = true;
          ecucConfig.CanNmPassiveModeEnabled = false;
          addTraceLog("INIT", "Precondition", "S1 Sẵn Sàng: ECU đang ở Bus-Sleep Mode", "Chờ SWC phát lệnh ComM_RequestComMode() để thực hiện Active Wakeup.");
        }
      },
      {
        api: "Bước 1: SWC gọi ComM_RequestComMode(COMM_FULL_COMMUNICATION)",
        io: "Input: SWC_App -> ComM -> Nm -> CanNm_NetworkRequest()",
        desc: "ECU đang ở Bus-Sleep Mode. Người dùng bật khóa điện hoặc mở cửa xe, SWC kích hoạt yêu cầu mạng chủ động. CanNM chuyển sang Repeat Message State và bật Bit 4 (AWB = 1) trong CBV.",
        action: () => {
          apiNetworkRequest();
        }
      },
      {
        api: "Bước 2: Bắn chùm gói tin tốc độ cao (Immediate Burst Tx #2 & #3)",
        io: "Input: SchM Clock +100ms -> CanNm -> CanIf_Transmit()",
        desc: "Vì CanNmImmediateNmTransmissions = 3 và ImmediateNmCycleTime = 100ms, CanNM bắn liên tiếp 3 gói NM PDU tốc độ cao để đánh thức nhanh toàn mạng trước khi quay về chu kỳ chuẩn.",
        action: () => {
          stepClockTick(100);
          stepClockTick(100);
        }
      },
      {
        api: "Bước 3: Hết thời gian RepeatMessageTime (1500ms) -> Chuyển sang Normal Operation",
        io: "Input: CanNm_MainFunction() -> CanNm -> Normal Operation State",
        desc: "Đã trôi qua 1500ms ở Repeat Message State. Vì SWC vẫn đang giữ mạng (Network Requested), CanNM chuyển sang Normal Operation State và duy trì phát định kỳ mỗi CanNmMsgCycleTime (1000ms).",
        action: () => {
          stepClockTick(1300);
        }
      },
      {
        api: "Bước 4: Mạng hoạt động ổn định ở Normal Operation State",
        io: "Input: SchM MainFunction +1000ms -> CanIf_Transmit()",
        desc: "ECU định kỳ phát gói NM PDU mỗi 1000ms. Byte CBV = 0x10 (AWB=1) để báo cho các ECU khác biết node này là Wakeup Master.",
        action: () => {
          stepClockTick(1000);
        }
      }
    ],
    whatIf: [
      { label: "Đặt Immediate Transmissions = 0", action: () => { ecucConfig.CanNmImmediateNmTransmissions = 0; onConfigChange("CanNmImmediateNmTransmissions", true); } },
      { label: "Tắt Bit 4 AWB (CanNmActiveWakeupBitEnabled = FALSE)", action: () => { ecucConfig.CanNmActiveWakeupBitEnabled = false; onConfigChange("CanNmActiveWakeupBitEnabled", true); } },
      { label: "Bật Passive Mode (CanNmPassiveModeEnabled = TRUE)", action: () => { ecucConfig.CanNmPassiveModeEnabled = true; onConfigChange("CanNmPassiveModeEnabled", true); } }
    ]
  },

  2: {
    title: "S2: Passive Startup từ CAN Bus (AWB=0 -> Rơi về Ready Sleep)",
    steps: [
      {
        api: "Bước 0: Chuẩn bị kịch bản & Thiết lập điều kiện ban đầu (Precondition)",
        io: "Trạng thái sẵn sàng: NM_MODE_BUS_SLEEP | Timers = OFF | CBV = 0x00 | App Req = False",
        desc: "ECU đang ở chế độ Bus-Sleep Mode. Ứng dụng nội bộ không có nhu cầu mạng (Network Released). Bấm 'Tiếp Theo ▶' để giả lập nhận bản tin NM từ Remote ECU trên bus.",
        action: () => {
          resetSimulation();
          addTraceLog("INIT", "Precondition", "S2 Sẵn Sàng: ECU đang ở Bus-Sleep Mode", "Chờ bản tin NM từ Remote ECU trên bus đánh thức thụ động (Passive Startup).");
        }
      },
      {
        api: "Bước 1: ECU đang ngủ, nhận được gói tin NM từ Remote ECU Node 0x2B",
        io: "Input: Bus CAN -> CanIf_RxIndication() -> CanNm -> Nm_NetworkStartIndication()",
        desc: "ECU đang ở Bus-Sleep Mode. Một ECU khác trên xe thức dậy và phát bản tin NM. CanIf bắt được và báo lên CanNM. CanNM gọi Nm_NetworkStartIndication() để ComM gọi CanNm_PassiveStartUp().",
        action: () => {
          apiPassiveStartUp();
        }
      },
      {
        api: "Bước 2: Phát gói NM đầu tiên trễ theo CanNmMsgCycleOffset (100ms)",
        io: "Input: SchM Clock +100ms -> CanNm -> CanIf_Transmit()",
        desc: "Khác với Active Wakeup (phát ngay tại t=0ms), khi Passive Startup, CanNM chờ hết MsgCycleOffset để tránh xung đột đường truyền. Byte CBV = 0x00 (AWB = 0 vì thức dậy thụ động!).",
        action: () => {
          stepClockTick(100);
        }
      },
      {
        api: "Bước 3: Hết RepeatMessageTime (1500ms) -> Tự động rẽ sang Ready Sleep State",
        io: "Input: CanNm_MainFunction() -> CanNm -> Ready Sleep State",
        desc: "Vì SWC của bản thân ECU này không yêu cầu mạng (Network Released), sau khi hết thời gian điểm danh ở Repeat Message State, CanNM rẽ sang Ready Sleep State và NGƯNG PHÁT bản tin NM!",
        action: () => {
          stepClockTick(1400);
        }
      }
    ],
    whatIf: [
      { label: "Gọi CanNm_NetworkRequest() khi đang ở Ready Sleep", action: () => apiNetworkRequest() },
      { label: "Bắn thêm gói Rx từ Node #2 để nạp lại Timeout Timer", action: () => apiSimulatedRxIndication() },
      { label: "Tăng MsgCycleOffset lên 300ms", action: () => { ecucConfig.CanNmMsgCycleOffset = 300; onConfigChange("CanNmMsgCycleOffset", true); } }
    ]
  },

  3: {
    title: "S3: Chu Trình Ngủ Mạng Đồng Bộ 4 Pha Chuẩn AUTOSAR",
    steps: [
      {
        api: "Bước 0: Chuẩn bị kịch bản & Thiết lập điều kiện ban đầu (Precondition)",
        io: "Trạng thái sẵn sàng: NM_STATE_NORMAL_OPERATION | TimeoutTimer = 2000ms | MsgCycle = 1000ms",
        desc: "ECU đang hoạt động bình thường ở Normal Operation State, ứng dụng SWC đang giữ mạng và định kỳ phát bản tin NM PDU. Bấm 'Tiếp Theo ▶' để bắt đầu kịch bản SWC nhả mạng đi ngủ.",
        action: () => {
          resetSimulation();
          apiNetworkRequest();
          stepClockTick(1600); // Into Normal Operation
          addTraceLog("INIT", "Precondition", "S3 Sẵn Sàng: ECU đang ở Normal Operation State", "SWC đang giữ mạng, truyền phát bản tin định kỳ. Sẵn sàng theo dõi chu trình đi ngủ 4 pha.");
        }
      },
      {
        api: "Bước 1: SWC nhả mạng -> CanNm_NetworkRelease()",
        io: "Input: SWC -> ComM -> Nm -> CanNm -> Ready Sleep State",
        desc: "ECU đang ở Normal Operation State. Ứng dụng đã hoàn tất nhiệm vụ và gọi CanNm_NetworkRelease(). CanNM chuyển ngay sang Ready Sleep State và dừng phát bản tin NM định kỳ.",
        action: () => {
          apiNetworkRelease(); // Into Ready Sleep
        }
      },
      {
        api: "Bước 2: Đếm ngược NM-Timeout Timer (CanNmTimeoutTime = 2000ms)",
        io: "Input: SchM Clock -> Giảm Timeout Timer từ 2000ms về 0ms",
        desc: "Trên bus không có bất kỳ ECU nào phát bản tin NM. NM-Timeout Timer đếm lùi. Nếu có node nào phát trong thời gian này, timer sẽ lập tức nạp lại đầy 2000ms để giữ mạng thức.",
        action: () => {
          stepClockTick(1000);
        }
      },
      {
        api: "Bước 3: Hết NM-Timeout -> Chuyển sang Prepare Bus-Sleep Mode",
        io: "Input: CanNm_MainFunction() -> CanNm -> Prepare Bus-Sleep Mode",
        desc: "NM-Timeout Timer chạm 0ms! Toàn mạng đồng ý đi ngủ. CanNM xóa cờ AWB về 0, chuyển sang Prepare Bus-Sleep Mode, báo Nm_PrepareBusSleepMode() và chạy WaitBusSleepTimer (1500ms).",
        action: () => {
          stepClockTick(1000);
        }
      },
      {
        api: "Bước 4: Hết WaitBusSleepTime (1500ms) -> Vào Bus-Sleep Mode & Tắt Phần Cứng",
        io: "Input: CanNm_MainFunction() -> CanNm -> Bus-Sleep Mode",
        desc: "Sau 1500ms yên ắng tuyệt đối tại pha đệm, CanNM chuyển sang Bus-Sleep Mode, gọi Nm_BusSleepMode() để ComM ra lệnh CanSM tắt nguồn CAN Controller & Transceiver.",
        action: () => {
          stepClockTick(1500);
        }
      }
    ],
    whatIf: [
      { label: "Bắn gói Rx từ Node #2 khi đang đếm ngược ở Ready Sleep", action: () => apiSimulatedRxIndication() },
      { label: "Đặt CanNmTimeoutTime (800ms) < MsgCycleTime (1000ms)", action: () => { ecucConfig.CanNmTimeoutTime = 800; onConfigChange("CanNmTimeoutTime", true); } },
      { label: "Thay đổi WaitBusSleepTime = 2000ms", action: () => { ecucConfig.CanNmWaitBusSleepTime = 2000; onConfigChange("CanNmWaitBusSleepTime", true); } }
    ]
  },

  4: {
    title: "S4: Đánh Thức Khẩn Cấp Tại Prepare Bus-Sleep (Immediate Restart)",
    steps: [
      {
        api: "Bước 0: Chuẩn bị kịch bản & Thiết lập điều kiện ban đầu (Precondition)",
        io: "Trạng thái sẵn sàng: NM_MODE_PREPARE_BUS_SLEEP | WaitBusSleepTimer = 1000ms còn lại",
        desc: "ECU vừa hết hạn NM-Timeout Timer và đang nằm đếm ngược ở Prepare Bus-Sleep Mode (WaitBusSleepTimer = 1500ms). Còn 1000ms nữa là tắt nguồn. Bấm 'Tiếp Theo ▶' để SWC gọi lệnh khẩn cấp.",
        action: () => {
          resetSimulation();
          apiNetworkRequest();
          stepClockTick(1600);
          apiNetworkRelease();
          stepClockTick(2000);
          stepClockTick(500); // 1000ms left in Prepare Bus-Sleep
          addTraceLog("INIT", "Precondition", "S4 Sẵn Sàng: ECU đang ở Prepare Bus-Sleep Mode", "Còn 1000ms trước khi sập nguồn. Sẵn sàng nhận lệnh khẩn cấp để kiểm tra Immediate Restart.");
        }
      },
      {
        api: "Bước 1: Bất ngờ SWC yêu cầu mạng khẩn cấp: CanNm_NetworkRequest()",
        io: "Input: SWC -> ComM -> CanNm_NetworkRequest() tại Prepare Bus-Sleep",
        desc: "SWC bất ngờ có sự kiện khẩn cấp! Nhờ bật CanNmImmediateRestartEnabled = TRUE, CanNM lập tức hủy WaitBusSleepTimer, quay lại Repeat Message State, bật AWB=1 và BẮN NGAY 1 GÓI NM TẠI t=0ms để cứu mạng CAN!",
        action: () => {
          apiNetworkRequest();
        }
      }
    ],
    whatIf: [
      { label: "Tắt Immediate Restart (CanNmImmediateRestartEnabled = FALSE)", action: () => { ecucConfig.CanNmImmediateRestartEnabled = false; onConfigChange("CanNmImmediateRestartEnabled", true); } },
      { label: "Bắn gói Rx từ Node #2 khi đang ở Prepare Bus-Sleep", action: () => apiSimulatedRxIndication() },
      { label: "Gọi CanNm_PassiveStartUp() tại Prepare Bus-Sleep", action: () => apiPassiveStartUp() }
    ]
  },

  5: {
    title: "S5: Điểm Danh Toàn Mạng (Repeat Message Request RMR = 1)",
    steps: [
      {
        api: "Bước 0: Chuẩn bị kịch bản & Thiết lập điều kiện ban đầu (Precondition)",
        io: "Trạng thái sẵn sàng: NM_STATE_READY_SLEEP | Tx = OFF | TimeoutTimer = 2000ms | CBV RMR = 0",
        desc: "ECU đang ở Ready Sleep State và không phát bản tin NM. Máy chẩn đoán Tester hoặc Gateway chuẩn bị kết nối vào bus. Bấm 'Tiếp Theo ▶' để phát lệnh điểm danh.",
        action: () => {
          resetSimulation();
          apiNetworkRequest();
          stepClockTick(1600);
          apiNetworkRelease();
          addTraceLog("INIT", "Precondition", "S5 Sẵn Sàng: ECU đang ở Ready Sleep State (im lặng)", "Sẵn sàng nhận yêu cầu điểm danh toàn mạng CanNm_RepeatMessageRequest() từ máy chẩn đoán Tester.");
        }
      },
      {
        api: "Bước 1: Gọi CanNm_RepeatMessageRequest() -> Bật Bit 0 (RMR = 1)",
        io: "Input: Diag SWC -> CanNm_RepeatMessageRequest()",
        desc: "CanNM chuyển ngay về Repeat Message State, bật Bit 0 (RMR = 1) trong byte CBV và phát ngay bản tin ra bus để ép tất cả các ECU khác cùng điểm danh.",
        action: () => {
          apiRepeatMessageRequest();
        }
      },
      {
        api: "Bước 2: Hết RepeatMessageTime (1500ms) -> Tự động xóa Bit RMR về 0",
        io: "Input: CanNm_MainFunction() -> CanNm -> Ready Sleep (RMR = 0)",
        desc: "Theo SWS_CanNm_00107, ngay khi hết CanNmRepeatMessageTime, CanNM tự động hạ Bit 0 (RMR: 1 -> 0) để tránh mạng bị lặp điểm danh vô tận.",
        action: () => {
          stepClockTick(1500);
        }
      }
    ],
    whatIf: [
      { label: "Tắt tính năng điểm danh (CanNmNodeDetectionEnabled = FALSE)", action: () => { ecucConfig.CanNmNodeDetectionEnabled = false; onConfigChange("CanNmNodeDetectionEnabled", true); } },
      { label: "Bắn gói Rx có RMR=1 từ Remote Node #2", action: () => { document.getElementById("simRxRmr").checked = true; apiSimulatedRxIndication(); } },
      { label: "Bật callback Nm_RepeatMessageIndication()", action: () => { ecucConfig.CanNmRepeatMsgIndEnabled = true; onConfigChange("CanNmRepeatMsgIndEnabled", true); } }
    ]
  },

  6: {
    title: "S6: Giảm Tải Đường Truyền CAN (CanNmBusLoadReductionEnabled)",
    steps: [
      {
        api: "Bước 0: Chuẩn bị kịch bản & Thiết lập điều kiện ban đầu (Precondition)",
        io: "Trạng thái sẵn sàng: NM_STATE_NORMAL_OPERATION | BusLoadReduction = TRUE | MsgCycle = 1000ms",
        desc: "ECU đang ở Normal Operation State với tính năng Bus Load Reduction được kích hoạt. Bấm 'Tiếp Theo ▶' để xem cách CanNM phản ứng khi Remote Node #2 phát bản tin.",
        action: () => {
          ecucConfig.CanNmBusLoadReductionEnabled = true;
          onConfigChange("CanNmBusLoadReductionEnabled", true);
          resetSimulation();
          apiNetworkRequest();
          stepClockTick(1600); // In Normal Operation
          addTraceLog("INIT", "Precondition", "S6 Sẵn Sàng: ECU ở Normal Operation, Bus Load Reduction = TRUE", "Sẵn sàng nhận bản tin NM từ Remote Node #2 để kiểm tra cơ chế hoãn phát bản tin.");
        }
      },
      {
        api: "Bước 1: Remote Node #2 phát bản tin NM -> CanNM hoãn lượt phát",
        io: "Input: CanNm_RxIndication() -> CanNm -> Nạp lại MsgCycleTimer = 1000ms",
        desc: "Khi nhận bản tin từ Node #2, CanNM nạp lại bộ đếm phát MsgCycleTimer về 1000ms (SWS_CanNm_00052) thay vì tự phát bản tin của mình, giảm 70% tải trên bus!",
        action: () => {
          apiSimulatedRxIndication();
        }
      }
    ],
    whatIf: [
      { label: "Tắt Bus Load Reduction (CanNmBusLoadReductionEnabled = FALSE)", action: () => { ecucConfig.CanNmBusLoadReductionEnabled = false; onConfigChange("CanNmBusLoadReductionEnabled", true); } },
      { label: "Đổi CanNmMsgReducedTime = 300ms", action: () => { ecucConfig.CanNmMsgReducedTime = 300; onConfigChange("CanNmMsgReducedTime", true); } },
      { label: "Chuyển về Repeat Message (Bus Load Reduction tạm ngưng)", action: () => apiRepeatMessageRequest() }
    ]
  },

  7: {
    title: "S7: Linh Hoạt Vị Trí SNI/CBV & Đọc Định Danh Node (GetNodeId)",
    steps: [
      {
        api: "Bước 0: Chuẩn bị kịch bản & Thiết lập điều kiện ban đầu (Precondition)",
        io: "Trạng thái sẵn sàng: PDU chuẩn (Byte 0: SNI, Byte 1: CBV) | NodeId = 0x1A",
        desc: "Khung PDU đang ở cấu hình mặc định: Byte 0 là Source Node ID (0x1A), Byte 1 là CBV. Bấm 'Tiếp Theo ▶' để thực hiện hoán đổi vị trí cấu hình.",
        action: () => {
          ecucConfig.CanNmPduNidPosition = "BYTE_0";
          ecucConfig.CanNmPduCbvPosition = "BYTE_1";
          ecucConfig.CanNmNodeId = 0x1A;
          onConfigChange("CanNmPduNidPosition", true);
          resetSimulation();
          addTraceLog("INIT", "Precondition", "S7 Sẵn Sàng: PDU chuẩn (Byte 0: SNI, Byte 1: CBV), NodeId = 0x1A", "Sẵn sàng kiểm tra hoán đổi vị trí trường và đọc định danh node.");
        }
      },
      {
        api: "Bước 1: Cấu hình đổi chỗ: CBV ở Byte 0, SNI ở Byte 1",
        io: "Input: CanNmPduCbvPosition = BYTE_0, CanNmPduNidPosition = BYTE_1",
        desc: "Tùy theo kiến trúc OEM, vị trí các trường trong khung 8-byte NM PDU có thể linh hoạt. Quan sát Thanh Khung 8-Byte tự động hoán đổi vị trí Byte 0 và Byte 1!",
        action: () => {
          ecucConfig.CanNmPduCbvPosition = "BYTE_0";
          ecucConfig.CanNmPduNidPosition = "BYTE_1";
          onConfigChange("CanNmPduCbvPosition", true);
        }
      },
      {
        api: "Bước 2: Đọc mã Node ID qua CanNm_GetNodeIdentifier()",
        io: "Input: CanNm_GetNodeIdentifier() -> Trả về NodeId = 0x1A",
        desc: "Ứng dụng gọi CanNm_GetLocalNodeIdentifier() lấy về 0x1A (Node 26). Khi nhận gói tin từ Remote Node #2, CanNm_GetNodeIdentifier() trả về 0x2B.",
        action: () => {
          addTraceLog("API", "SWC -> CanNm", "CanNm_GetLocalNodeIdentifier() -> 0x1A", "[SWS_CanNm_00133] Đọc mã Node ID cục bộ.");
          apiSimulatedRxIndication();
          addTraceLog("API", "SWC -> CanNm", "CanNm_GetNodeIdentifier() -> 0x2B", "[SWS_CanNm_00132] Đọc mã Node ID của bản tin vừa nhận.");
        }
      }
    ],
    whatIf: [
      { label: "Cấu hình NidPosition = OFF (dành 7 bytes cho User Data)", action: () => { ecucConfig.CanNmPduNidPosition = "OFF"; onConfigChange("CanNmPduNidPosition", true); } },
      { label: "Khôi phục vị trí chuẩn (SNI Byte 0, CBV Byte 1)", action: () => { ecucConfig.CanNmPduNidPosition = "BYTE_0"; ecucConfig.CanNmPduCbvPosition = "BYTE_1"; onConfigChange("CanNmPduNidPosition", true); } },
      { label: "Đổi Node ID thành 0x3F (Node 63)", action: () => { ecucConfig.CanNmNodeId = 0x3F; onConfigChange("CanNmNodeId", true); } }
    ]
  },

  8: {
    title: "S8: Lọc Cụm Mạng Con Partial Networking (PN Filter Mask)",
    steps: [
      {
        api: "Bước 0: Chuẩn bị kịch bản & Thiết lập điều kiện ban đầu (Precondition)",
        io: "Trạng thái sẵn sàng: CanNmPnEnabled = TRUE | FilterMask = [0x05, 0x00] (PNC #16 & #18) | Network Mode",
        desc: "ECU được kích hoạt tính năng Partial Networking với mặt nạ [0x05, 0x00]. Chỉ chấp nhận PNC #16 và PNC #18. Bấm 'Tiếp Theo ▶' để thử nghiệm gửi gói tin PNI không khớp.",
        action: () => {
          ecucConfig.CanNmPnEnabled = true;
          ecucConfig.CanNmPnFilterMaskHex = "05 00";
          onConfigChange("CanNmPnEnabled", true);
          resetSimulation();
          apiNetworkRequest();
          addTraceLog("INIT", "Precondition", "S8 Sẵn Sàng: Bật Partial Networking với Mặt nạ Mask = [0x05, 0x00]", "ECU chỉ chấp nhận PNC #16 và PNC #18. Sẵn sàng nhận gói tin PNI để kiểm chứng bộ lọc.");
        }
      },
      {
        api: "Bước 1: Remote Node gửi gói NM yêu cầu PNC #17 (0x02) -> BỊ LỌC BỎ!",
        io: "Input: Rx PNI = [0x02, 0x00] & Mask = [0x05, 0x00] -> Không khớp!",
        desc: "Remote Node #2 gửi gói NM yêu cầu PNC #17. Phép AND logic: (0x02 & 0x05) == 0. CanNM BỎ QUA HOÀN TOÀN gói tin này (NM-Timeout Timer KHÔNG được nạp lại!).",
        action: () => {
          document.getElementById("simRxPni").checked = true;
          document.getElementById("simRxPniHex").value = "02 00";
          apiSimulatedRxIndication();
        }
      },
      {
        api: "Bước 2: Remote Node gửi gói NM yêu cầu PNC #16 (0x01) -> CHẤP NHẬN!",
        io: "Input: Rx PNI = [0x01, 0x00] & Mask = [0x05, 0x00] -> Khớp PNC #16!",
        desc: "Phép AND logic: (0x01 & 0x05) == 0x01 != 0. Khớp PNC #16! CanNM bật cờ PN_RELEVANT, nạp lại Timeout Timer = 2000ms và chạy PnResetTimer (1500ms).",
        action: () => {
          document.getElementById("simRxPni").checked = true;
          document.getElementById("simRxPniHex").value = "01 00";
          apiSimulatedRxIndication();
        }
      }
    ],
    whatIf: [
      { label: "Bật CanNmAllNmMessagesKeepAwake = TRUE", action: () => { ecucConfig.CanNmAllNmMessagesKeepAwake = true; onConfigChange("CanNmAllNmMessagesKeepAwake", true); } },
      { label: "Đổi PnFilterMask thành 0x02 (chấp nhận PNC #17)", action: () => { ecucConfig.CanNmPnFilterMaskHex = "02 00"; onConfigChange("CanNmPnFilterMaskByte", true); } },
      { label: "Tắt Partial Networking (CanNmPnEnabled = FALSE)", action: () => { ecucConfig.CanNmPnEnabled = false; onConfigChange("CanNmPnEnabled", true); } }
    ]
  },

  9: {
    title: "S9: Quản Lý ERA / EIRA & Đồng Bộ Tắt PNC (Sync PNC Shutdown)",
    steps: [
      {
        api: "Bước 0: Chuẩn bị kịch bản & Thiết lập điều kiện ban đầu (Precondition)",
        io: "Trạng thái sẵn sàng: CanNmPnEnabled = TRUE | EIRA = 0x0000 | PnResetTimer = OFF | Network Mode",
        desc: "ECU đang ở Network Mode với Partial Networking sẵn sàng. Vector EIRA rỗng. Bấm 'Tiếp Theo ▶' để kích hoạt PNC #16 và quan sát bộ đếm CanNmPnResetTime.",
        action: () => {
          ecucConfig.CanNmPnEnabled = true;
          onConfigChange("CanNmPnEnabled", true);
          resetSimulation();
          apiNetworkRequest();
          addTraceLog("INIT", "Precondition", "S9 Sẵn Sàng: Bật Partial Networking, ECU ở Network Mode", "Sẵn sàng kích hoạt cụm PNC để theo dõi tính toán vector EIRA và PnResetTimer.");
        }
      },
      {
        api: "Bước 1: Kích hoạt PNC #16 -> Cập nhật mảng EIRA = 0x0001",
        io: "Input: CanNm -> PduR_CanNmRxIndication(PnEiraRxPduId, &EiraBytes)",
        desc: "Khi PNC #16 được yêu cầu, CanNM cập nhật vector EIRA và đẩy lên ComM qua PduR. Bộ đếm CanNmPnResetTime (1500ms) được kích hoạt.",
        action: () => {
          document.getElementById("simRxPni").checked = true;
          document.getElementById("simRxPniHex").value = "01 00";
          apiSimulatedRxIndication();
        }
      },
      {
        api: "Bước 2: Hết thời gian CanNmPnResetTime (1500ms) -> Xóa bit PNC trong EIRA",
        io: "Input: CanNm_MainFunction() -> PduR_CanNmRxIndication(EIRA = 0x0000)",
        desc: "Suốt 1500ms không có thêm gói tin nào yêu cầu PNC #16. PnResetTimer hết hạn, CanNM tự động xóa bit PNC #16 về 0 trong EIRA và báo ComM tắt cụm mạng con.",
        action: () => {
          stepClockTick(1500);
        }
      }
    ],
    whatIf: [
      { label: "Bật Synchronized PNC Shutdown", action: () => { ecucConfig.CanNmSynchronizedPncShutdownEnabled = true; onConfigChange("CanNmSynchronizedPncShutdownEnabled", true); } },
      { label: "Yêu cầu đồng thời cả PNC #16 và PNC #18 (Mask 0x05)", action: () => { document.getElementById("simRxPniHex").value = "05 00"; apiSimulatedRxIndication(); } },
      { label: "Thay đổi PnResetTime = 3000ms", action: () => { ecucConfig.CanNmPnResetTime = 3000; onConfigChange("CanNmPnResetTime", true); } }
    ]
  },

  10: {
    title: "S10: Đánh Thức Toàn Xe Qua Car Wakeup Bit (CSR = 1)",
    steps: [
      {
        api: "Bước 0: Chuẩn bị kịch bản & Thiết lập điều kiện ban đầu (Precondition)",
        io: "Trạng thái sẵn sàng: CanNmCarWakeUpFilterNodeId = 0x2B | ECU ở Bus-Sleep Mode",
        desc: "Bộ lọc Car Wakeup được cài đặt chỉ chấp nhận cờ CSR từ SmartKey ECU Node 0x2B. ECU đang ngủ ở Bus-Sleep Mode. Bấm 'Tiếp Theo ▶' để phát bản tin đánh thức toàn xe.",
        action: () => {
          ecucConfig.CanNmCarWakeUpRxEnabled = true;
          ecucConfig.CanNmCarWakeUpFilterEnabled = true;
          ecucConfig.CanNmCarWakeUpFilterNodeId = 0x2B;
          onConfigChange("CanNmCarWakeUpFilterEnabled", true);
          resetSimulation();
          addTraceLog("INIT", "Precondition", "S10 Chuẩn Bị: Car Wakeup Filter = Node 0x2B, ECU ở Bus-Sleep", "Sẵn sàng nhận bản tin Car Wakeup từ SmartKey ECU 0x2B.");
        }
      },
      {
        api: "Bước 1: Remote ECU 0x2B gửi gói NM có Bit 3 (CSR = 1) -> Kích hoạt Car Wakeup!",
        io: "Input: CanNm_RxIndication(CSR=1, NodeId=0x2B) -> Nm_CarWakeUpIndication()",
        desc: "Khớp đúng Node ID được cấp phép! CanNM gọi ngay Nm_CarWakeUpIndication() để ComM và BswM đánh thức toàn bộ hệ thống điện trên xe.",
        action: () => {
          document.getElementById("simRxCsr").checked = true;
          apiSimulatedRxIndication();
        }
      }
    ],
    whatIf: [
      { label: "Tắt bộ lọc Car Wakeup Filter (Chấp nhận CSR từ mọi Node)", action: () => { ecucConfig.CanNmCarWakeUpFilterEnabled = false; onConfigChange("CanNmCarWakeUpFilterEnabled", true); } },
      { label: "Đổi Filter Node ID thành 0x99 (làm lệch NodeId để xem lệnh bị chặn)", action: () => { ecucConfig.CanNmCarWakeUpFilterNodeId = 0x99; onConfigChange("CanNmCarWakeUpFilterNodeId", true); } },
      { label: "Tắt tính năng Car Wakeup (CanNmCarWakeUpRxEnabled = FALSE)", action: () => { ecucConfig.CanNmCarWakeUpRxEnabled = false; onConfigChange("CanNmCarWakeUpRxEnabled", true); } }
    ]
  },

  11: {
    title: "S11: Kéo User Data Tự Động Qua COM (TriggerTransmit)",
    steps: [
      {
        api: "Bước 0: Chuẩn bị kịch bản & Thiết lập điều kiện ban đầu (Precondition)",
        io: "Trạng thái sẵn sàng: CanNmComUserDataSupport = TRUE | UserData = 'DE AD BE EF CA FE' | Bus-Sleep",
        desc: "Module COM đã nạp sẵn chuỗi dữ liệu 'DE AD BE EF CA FE' vào buffer PduR. CanNM đang ở Bus-Sleep Mode. Bấm 'Tiếp Theo ▶' để khởi động mạng và quan sát TriggerTransmit.",
        action: () => {
          ecucConfig.CanNmComUserDataSupport = true;
          ecucConfig.UserDataBytesHex = "DE AD BE EF CA FE";
          onConfigChange("CanNmComUserDataSupport", true);
          resetSimulation();
          addTraceLog("INIT", "Precondition", "S11 Chuẩn Bị: COM User Data Support = TRUE, Data = 'DE AD BE EF CA FE'", "Sẵn sàng thực hiện Active Wakeup và quan sát TriggerTransmit.");
        }
      },
      {
        api: "Bước 1: Kích hoạt Active Wakeup -> CanNM gọi PduR_CanNmTriggerTransmit()",
        io: "Input: SWC_App -> CanNm_NetworkRequest() -> PduR copy User Data",
        desc: "Thay vì ứng dụng phải gọi API thủ công CanNm_SetUserData(), CanNM tự động gọi PduR -> Com_TriggerTransmit() để lấy dữ liệu mới nhất đính kèm vào khung 8-byte NM PDU.",
        action: () => {
          apiNetworkRequest();
        }
      },
      {
        api: "Bước 2: Phát bản tin định kỳ mang dữ liệu mới từ COM",
        io: "Input: CanNm_MainFunction() -> CanIf_Transmit(Data=[1A 10 DE AD BE EF CA FE])",
        desc: "Quan sát Thanh Khung 8-Byte: Các byte từ Byte 2 đến Byte 7 mang trọn vẹn chuỗi dữ liệu 'DE AD BE EF CA FE' được kéo từ COM!",
        action: () => {
          stepClockTick(100);
        }
      }
    ],
    whatIf: [
      { label: "Đổi dữ liệu User Data thành 'AA BB CC DD EE FF'", action: () => { ecucConfig.UserDataBytesHex = "AA BB CC DD EE FF"; onConfigChange("UserDataBytesHex", true); } },
      { label: "Tắt User Data (CanNmUserDataEnabled = FALSE)", action: () => { ecucConfig.CanNmUserDataEnabled = false; onConfigChange("CanNmUserDataEnabled", true); } },
      { label: "Chuyển về gọi API thủ công CanNm_SetUserData()", action: () => { ecucConfig.CanNmComUserDataSupport = false; onConfigChange("CanNmComUserDataSupport", true); } }
    ]
  },

  12: {
    title: "S12: Dịch Vụ Chẩn Đoán UDS 0x28 (Disable/Enable Comm)",
    steps: [
      {
        api: "Bước 0: Chuẩn bị kịch bản & Thiết lập điều kiện ban đầu (Precondition)",
        io: "Trạng thái sẵn sàng: NM_STATE_NORMAL_OPERATION | TX_EN = 1 (Truyền thông bình thường)",
        desc: "ECU đang ở Normal Operation State, định kỳ phát bản tin NM. Chuẩn bị tiếp nhận dịch vụ UDS 0x28 Communication Control từ kỹ thuật viên chẩn đoán. Bấm 'Tiếp Theo ▶' để khóa truyền thông.",
        action: () => {
          resetSimulation();
          apiNetworkRequest();
          stepClockTick(1600);
          addTraceLog("INIT", "Precondition", "S12 Chuẩn Bị: ECU đang ở Normal Operation State", "Sẵn sàng nhận lệnh UDS 0x28 CanNm_DisableCommunication() từ máy chẩn đoán Dcm.");
        }
      },
      {
        api: "Bước 1: Dcm gọi CanNm_DisableCommunication() (UDS 0x28)",
        io: "Input: UDS 0x28 -> Dcm -> BswM -> Nm -> CanNm_DisableCommunication()",
        desc: "Kỹ thuật viên nạp phần mềm Flash Bootloader. Dịch vụ UDS 0x28 khóa truyền thông: CanNM hạ Bit 1 (TX_EN: 1 -> 0), ngưng phát bản tin NM và tạm dừng NM-Timeout Timer.",
        action: () => {
          apiToggleCommunication();
        }
      },
      {
        api: "Bước 2: Tiến đồng hồ +1000ms -> Không có gói tin nào phát ra",
        io: "Input: SchM MainFunction +1000ms -> Tx bị chặn hoàn toàn",
        desc: "Trong suốt quá trình nạp phần mềm, bus CAN được giải phóng hoàn toàn khỏi các bản tin NM.",
        action: () => {
          stepClockTick(1000);
        }
      },
      {
        api: "Bước 3: Dcm gọi CanNm_EnableCommunication() khôi phục mạng",
        io: "Input: Dcm -> CanNm_EnableCommunication() -> Mở lại phát bản tin NM",
        desc: "Quá trình Flash hoàn tất. CanNM bật lại Bit 1 (TX_EN = 1), chạy lại NM-Timeout Timer và tiếp tục phát bản tin NM định kỳ.",
        action: () => {
          apiToggleCommunication();
        }
      }
    ],
    whatIf: [
      { label: "Thử gọi DisableCommunication khi đang ở Bus-Sleep", action: () => { resetSimulation(); apiToggleCommunication(); } },
      { label: "Bắn gói Rx từ Node #2 trong khi đang DisableComm", action: () => apiSimulatedRxIndication() },
      { label: "Tắt tính năng ComControl (CanNmComControlEnabled = FALSE)", action: () => { ecucConfig.CanNmComControlEnabled = false; onConfigChange("CanNmComControlEnabled", true); } }
    ]
  },

  13: {
    title: "S13: Giám Sát Ngủ Từ Xa Cho Gateway (Remote Sleep Indication)",
    steps: [
      {
        api: "Bước 0: Chuẩn bị kịch bản & Thiết lập điều kiện ban đầu (Precondition)",
        io: "Trạng thái sẵn sàng: NM_STATE_NORMAL_OPERATION | RemoteSleepIndEnabled = TRUE | RemoteSleepTime = 1500ms",
        desc: "ECU Gateway đang ở Normal Operation State. Bộ đếm Remote Sleep Indication (1500ms) sẵn sàng theo dõi các node con. Bấm 'Tiếp Theo ▶' để bắt đầu giám sát bus yên ắng.",
        action: () => {
          ecucConfig.CanNmRemoteSleepIndEnabled = true;
          ecucConfig.CanNmRemoteSleepIndTime = 1500;
          onConfigChange("CanNmRemoteSleepIndEnabled", true);
          resetSimulation();
          apiNetworkRequest();
          stepClockTick(1600); // Normal Operation
          addTraceLog("INIT", "Precondition", "S13 Chuẩn Bị: Remote Sleep Indication = TRUE, ECU ở Normal Operation", "Sẵn sàng theo dõi bus yên ắng 1500ms để kích hoạt Nm_RemoteSleepIndication().");
        }
      },
      {
        api: "Bước 1: Không có gói Rx nào từ các node con suốt 1500ms",
        io: "Input: CanNm_MainFunction() -> Nm_RemoteSleepIndication()",
        desc: "Suốt 1500ms yên ắng từ các node con, CanNM phát hiện tất cả các node đều đã ở Ready Sleep và gọi Nm_RemoteSleepIndication() báo cho Gateway!",
        action: () => {
          stepClockTick(1500);
          addTraceLog("API", "CanNm -> Nm", "Nm_RemoteSleepIndication(nmChannelHandle=0)", "[SWS_CanNm_00150] Báo cho Gateway: Toàn bộ node con trên nhánh CAN này đã sẵn sàng ngủ!");
        }
      },
      {
        api: "Bước 2: Node con bất ngờ thức dậy -> Báo Nm_RemoteSleepCancellation()",
        io: "Input: CanNm_RxIndication() -> Nm_RemoteSleepCancellation()",
        desc: "Một node con bất ngờ thức lại phát bản tin NM. CanNM lập tức hủy trạng thái ngủ từ xa và gọi Nm_RemoteSleepCancellation()!",
        action: () => {
          apiSimulatedRxIndication();
          addTraceLog("API", "CanNm -> Nm", "Nm_RemoteSleepCancellation(nmChannelHandle=0)", "[SWS_CanNm_00151] Hủy trạng thái Remote Sleep vì có node con vừa thức dậy!");
        }
      }
    ],
    whatIf: [
      { label: "Gọi CanNm_CheckRemoteSleepIndication()", action: () => addTraceLog("API", "SWC -> CanNm", "CanNm_CheckRemoteSleepIndication() -> E_OK", "[SWS_CanNm_00152] Đọc trạng thái Remote Sleep.") },
      { label: "Đổi RemoteSleepIndTime = 2500ms", action: () => { ecucConfig.CanNmRemoteSleepIndTime = 2500; onConfigChange("CanNmRemoteSleepIndTime", true); } },
      { label: "Tắt tính năng Remote Sleep", action: () => { ecucConfig.CanNmRemoteSleepIndEnabled = false; onConfigChange("CanNmRemoteSleepIndEnabled", true); } }
    ]
  },

  14: {
    title: "S14: Xử Lý Lỗi TxTimeoutException & Phối Hợp CanSM Bus-Off",
    steps: [
      {
        api: "Bước 0: Chuẩn bị kịch bản & Thiết lập điều kiện ban đầu (Precondition)",
        io: "Trạng thái sẵn sàng: NM_STATE_REPEAT_MESSAGE | MsgTimeoutTime = 500ms | Chờ TxConfirmation",
        desc: "ECU vừa chuyển vào Network Mode và phát lệnh gửi bản tin NM. Bộ đếm CanNmMsgTimeoutTime (500ms) bắt đầu đếm. Bấm 'Tiếp Theo ▶' để kiểm tra tình huống mất TxConfirmation.",
        action: () => {
          resetSimulation();
          apiNetworkRequest();
          addTraceLog("INIT", "Precondition", "S14 Chuẩn Bị: ECU ở Network Mode (Repeat Message)", "Sẵn sàng kiểm tra tình huống timeout mất TxConfirmation từ phần cứng.");
        }
      },
      {
        api: "Bước 1: CanNM phát bản tin nhưng không nhận được TxConfirmation (Timeout)",
        io: "Input: CanNmMsgTimeoutTime (500ms) hết hạn -> Nm_TxTimeoutException()",
        desc: "Do đường truyền bị ngắt hoặc phần cứng CAN Controller bị kẹt, sau 500ms gọi CanIf_Transmit() mà không có TxConfirmation. CanNM gọi Nm_TxTimeoutException() và CanSM_TxTimeoutException().",
        action: () => {
          addTraceLog("WARN", "CanNm Engine", "CanNmMsgTimeoutTime (500ms) Hết Hạn!", "[SWS_CanNm_00066] Không nhận được CanIf_TxConfirmation().");
          addTraceLog("API", "CanNm -> Nm", "Nm_TxTimeoutException(nmChannelHandle=0)", "Báo lỗi timeout truyền bản tin NM.");
          addTraceLog("API", "CanNm -> CanSM", "CanSM_TxTimeoutException(nmChannelHandle=0)", "Yêu cầu CanSM kiểm tra và khởi động lại CAN Controller.");
        }
      },
      {
        api: "Bước 2: Nhận gói NM bất ngờ tại Bus-Sleep Mode -> Báo lỗi DET CANNM_E_NET_START_IND",
        io: "Input: CanNm_RxIndication() tại Bus-Sleep -> Det_ReportRuntimeError(0x04)",
        desc: "Khi ECU đang ở Bus-Sleep Mode mà nhận được gói NM trên bus, CanNM vừa chuyển vào Network Mode vừa ghi nhận lỗi Runtime CANNM_E_NET_START_IND lên bảng DET.",
        action: () => {
          resetSimulation();
          apiSimulatedRxIndication();
        }
      }
    ],
    whatIf: [
      { label: "Tắt CanNmInitialized = FALSE rồi gọi API (Test CANNM_E_UNINIT)", action: () => { ecucConfig.CanNmInitialized = false; onConfigChange("CanNmInitialized", true); apiNetworkRequest(); } },
      { label: "Giả lập CanSM phục hồi và gọi CanNm_ConfirmPnAvailability()", action: () => addTraceLog("API", "CanSM -> CanNm", "CanNm_ConfirmPnAvailability(nmChannelHandle=0)", "CanSM phục hồi phần cứng thành công.") },
      { label: "Bật lại CanNmInitialized = TRUE", action: () => { ecucConfig.CanNmInitialized = true; onConfigChange("CanNmInitialized", true); } }
    ]
  }
};
