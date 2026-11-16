/*************************************************************************
 * PART 4: SIMULATION ENGINE, TIMERS, PDU PACKER & 14 SCENARIOS (S1..S14)
 * Standard: AUTOSAR Classic R25-11 (SWS_CanNm, SWS_Nm, SWS_ComM)
 *************************************************************************/

// 1. ECUC CONFIGURATION STATE & DEFAULTS
const defaultConfig = {
  CanNmInitialized: true,
  CanNmDevErrorDetect: true,
  CanNmPassiveModeEnabled: false,
  CanNmActiveWakeupBitEnabled: true,
  CanNmStateChangeIndEnabled: true,
  CanNmComControlEnabled: true,
  CanNmImmediateTxconfEnabled: false,
  CanNmCoordinatorSyncSupport: false,
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
  CanNmImmediateRestartEnabled: false,
  CanNmBusLoadReductionEnabled: false,
  CanNmMsgReducedTime: 500,
  CanNmPnEnabled: false,
  CanNmAllNmMessagesKeepAwake: false,
  CanNmPnInfoOffset: 2,
  CanNmPnInfoLength: 2,
  CanNmPnFilterMaskHex: "05 00",
  CanNmTxPnRequestHex: "01 00",
  CanNmPnEiraCalcEnabled: true,
  CanNmPnEraCalcEnabled: false,
  CanNmPnResetTime: 1500,
  CanNmPnHandleMultipleNetworkRequests: false,
  PnAvailabilityConfirmed: true,
  CanNmSynchronizedPncShutdownEnabled: false,
  CanNmUserDataEnabled: true,
  CanNmComUserDataSupport: false,
  UserDataBytesHex: "11 22 33 44 55 66",
  CanNmCarWakeUpRxEnabled: true,
  CanNmCarWakeUpBytePosition: 2,
  CanNmCarWakeUpBitPosition: 0,
  CanNmCarWakeUpFilterEnabled: false,
  CanNmCarWakeUpFilterNodeId: 0x2B,
  CanNmRemoteSleepIndEnabled: false,
  CanNmRemoteSleepIndTime: 1500
};

let ecucConfig = JSON.parse(JSON.stringify(defaultConfig));

// 2. LIVE SIMULATION RUNTIME STATE
let simState = {
  mode: "NM_MODE_BUS_SLEEP", // NM_MODE_BUS_SLEEP | NM_MODE_PREPARE_BUS_SLEEP | NM_MODE_NETWORK
  subState: "NM_STATE_REPEAT_MESSAGE", // NM_STATE_REPEAT_MESSAGE | NM_STATE_NORMAL_OPERATION | NM_STATE_READY_SLEEP
  cbv: { rmr: false, pnsr: false, csr: false, awb: false, pnl: false, pni: false },
  engine: {
    netRequest: false,
    immBurstActive: false,
    burstLeft: 0,
    msgTxEnabled: true,
    busLoadReductionActive: false,
    remoteSleepDetected: false,
    pnShutdownMsgActive: false,
    txPending: false,
    simTxConfirmFail: false
  },
  timers: {
    repeatMsg: 0,
    timeout: 0,
    waitBusSleep: 0,
    msgCycle: 0,
    msgTimeout: 0,
    pnReset: 0,
    remoteSleep: 0
  },
  pnc: { eira: 0x0000, era: 0x0000, eiraTimers: {}, eraTimers: {} },
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
  ecucConfig.CanNmImmediateTxconfEnabled = getChecked("cfg_CanNmImmediateTxconfEnabled", false);
  ecucConfig.CanNmCoordinatorSyncSupport = getChecked("cfg_CanNmCoordinatorSyncSupport", false);

  ecucConfig.CanNmMainFunctionPeriod = getIntVal("cfg_CanNmMainFunctionPeriod", 100, 10);
  ecucConfig.CanNmMsgCycleTime = getIntVal("cfg_CanNmMsgCycleTime", 1000, 50);
  ecucConfig.CanNmMsgCycleOffset = getIntVal("cfg_CanNmMsgCycleOffset", 100, 0);
  ecucConfig.CanNmRepeatMessageTime = getIntVal("cfg_CanNmRepeatMessageTime", 1500, 0);
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
  ecucConfig.CanNmImmediateRestartEnabled = getChecked("cfg_CanNmImmediateRestartEnabled", false);
  ecucConfig.CanNmBusLoadReductionEnabled = getChecked("cfg_CanNmBusLoadReductionEnabled", false);
  ecucConfig.CanNmMsgReducedTime = getIntVal("cfg_CanNmMsgReducedTime", 500, 50);

  ecucConfig.CanNmPnEnabled = getChecked("cfg_CanNmPnEnabled", false);
  ecucConfig.CanNmAllNmMessagesKeepAwake = getChecked("cfg_CanNmAllNmMessagesKeepAwake", false);
  ecucConfig.CanNmPnInfoOffset = Math.min(7, getIntVal("cfg_CanNmPnInfoOffset", 2, 0));
  ecucConfig.CanNmPnInfoLength = Math.min(8, getIntVal("cfg_CanNmPnInfoLength", 2, 1));
  ecucConfig.CanNmPnFilterMaskHex = getVal("cfg_CanNmPnFilterMaskByte", "05 00").trim();
  ecucConfig.CanNmTxPnRequestHex = getVal("cfg_CanNmTxPnRequestHex", "01 00").trim();
  ecucConfig.CanNmPnEiraCalcEnabled = getChecked("cfg_CanNmPnEiraCalcEnabled", true);
  ecucConfig.CanNmPnEraCalcEnabled = getChecked("cfg_CanNmPnEraCalcEnabled", false);
  ecucConfig.CanNmPnResetTime = getIntVal("cfg_CanNmPnResetTime", 1500, 100);
  ecucConfig.CanNmPnHandleMultipleNetworkRequests = getChecked("cfg_CanNmPnHandleMultipleNetworkRequests", false);
  ecucConfig.PnAvailabilityConfirmed = getChecked("cfg_PnAvailabilityConfirmed", true);
  ecucConfig.CanNmSynchronizedPncShutdownEnabled = getChecked("cfg_CanNmSynchronizedPncShutdownEnabled", false);

  ecucConfig.CanNmUserDataEnabled = getChecked("cfg_CanNmUserDataEnabled", true);
  ecucConfig.CanNmComUserDataSupport = getChecked("cfg_CanNmComUserDataSupport", false);
  ecucConfig.UserDataBytesHex = getVal("cfg_UserDataBytesHex", "11 22 33 44 55 66").trim();

  ecucConfig.CanNmCarWakeUpRxEnabled = getChecked("cfg_CanNmCarWakeUpRxEnabled", true);
  ecucConfig.CanNmCarWakeUpBytePosition = Math.min(7, getIntVal("cfg_CanNmCarWakeUpBytePosition", 2, 0));
  ecucConfig.CanNmCarWakeUpBitPosition = Math.min(7, getIntVal("cfg_CanNmCarWakeUpBitPosition", 0, 0));
  ecucConfig.CanNmCarWakeUpFilterEnabled = getChecked("cfg_CanNmCarWakeUpFilterEnabled", false);
  const rawCwuNode = getVal("cfg_CanNmCarWakeUpFilterNodeId", "0x2B").trim();
  const parsedCwu = parseInt(rawCwuNode.replace(/^0x/i, ""), 16);
  ecucConfig.CanNmCarWakeUpFilterNodeId = isNaN(parsedCwu) ? 0x2B : (parsedCwu & 0xFF);

  ecucConfig.CanNmRemoteSleepIndEnabled = getChecked("cfg_CanNmRemoteSleepIndEnabled", false);
  ecucConfig.CanNmRemoteSleepIndTime = getIntVal("cfg_CanNmRemoteSleepIndTime", 1500, 100);

  const txFailChk = document.getElementById("simTxConfirmFail");
  if (txFailChk) simState.engine.simTxConfirmFail = !!txFailChk.checked;

  validateTimingRules();
}

function validateTimingRules() {
  const alertBox = document.getElementById("cfgAlertBox");
  const alertText = document.getElementById("cfgAlertText");
  if (!alertBox || !alertText) return;

  const warnings = [];
  if (ecucConfig.CanNmTimeoutTime <= ecucConfig.CanNmMsgCycleTime) {
    warnings.push(`[ECUC_CanNm_00020] CanNmTimeoutTime (${ecucConfig.CanNmTimeoutTime}ms) phải LỚN HƠN CanNmMsgCycleTime (${ecucConfig.CanNmMsgCycleTime}ms).`);
  }
  if (ecucConfig.CanNmMsgCycleOffset >= ecucConfig.CanNmMsgCycleTime) {
    warnings.push(`[ECUC_CanNm_00029] CanNmMsgCycleOffset (${ecucConfig.CanNmMsgCycleOffset}ms) phải nhỏ hơn CanNmMsgCycleTime (${ecucConfig.CanNmMsgCycleTime}ms).`);
  }
  if (ecucConfig.CanNmBusLoadReductionEnabled && (ecucConfig.CanNmPassiveModeEnabled || ecucConfig.CanNmPnEnabled)) {
    warnings.push(`[ECUC_CanNm_00040] CanNmBusLoadReductionEnabled phải = FALSE khi CanNmPassiveModeEnabled = TRUE hoặc CanNmGlobalPnSupport (PN) = TRUE.`);
  }
  if (ecucConfig.CanNmBusLoadReductionEnabled && (ecucConfig.CanNmMsgReducedTime < 0.5 * ecucConfig.CanNmMsgCycleTime || ecucConfig.CanNmMsgReducedTime >= ecucConfig.CanNmMsgCycleTime)) {
    warnings.push(`[ECUC_CanNm_00043] Cần 0.5 × MsgCycleTime (${0.5 * ecucConfig.CanNmMsgCycleTime}ms) <= CanNmMsgReducedTime (${ecucConfig.CanNmMsgReducedTime}ms) < MsgCycleTime (${ecucConfig.CanNmMsgCycleTime}ms).`);
  }
  if (ecucConfig.CanNmImmediateRestartEnabled && ecucConfig.CanNmImmediateNmTransmissions > 0) {
    warnings.push(`[ECUC_CanNm_00056] Khi CanNmImmediateRestartEnabled = TRUE thì CanNmImmediateNmTransmissions phải = 0.`);
  }
  if (ecucConfig.CanNmImmediateNmTransmissions > 0 && ecucConfig.CanNmRepeatMessageTime > 0 && ecucConfig.CanNmRepeatMessageTime <= ecucConfig.CanNmImmediateNmTransmissions * ecucConfig.CanNmImmediateNmCycleTime) {
    warnings.push(`[ECUC_CanNm_00022] CanNmRepeatMessageTime (${ecucConfig.CanNmRepeatMessageTime}ms) phải > ImmediateNmTransmissions × ImmediateNmCycleTime.`);
  }
  if (ecucConfig.CanNmPduNidPosition !== "OFF" && ecucConfig.CanNmPduCbvPosition !== "OFF" && ecucConfig.CanNmPduNidPosition === ecucConfig.CanNmPduCbvPosition) {
    warnings.push(`[ECUC_CanNm_00025 / 00026] CanNmPduNidPosition và CanNmPduCbvPosition đang trùng nhau tại ${ecucConfig.CanNmPduNidPosition}!`);
  }
  if (ecucConfig.CanNmNodeIdEnabled && ecucConfig.CanNmPduNidPosition === "OFF") {
    warnings.push(`[ECUC_CanNm_00025] Khi CanNmNodeIdEnabled = TRUE thì CanNmPduNidPosition không được đặt CANNM_PDU_OFF.`);
  }
  if ((ecucConfig.CanNmNodeDetectionEnabled || ecucConfig.CanNmPnEnabled) && ecucConfig.CanNmPduCbvPosition === "OFF") {
    warnings.push(`[ECUC_CanNm_00026 / SWS_CanNm_00413] Bắt buộc phải cấu hình CBV (BYTE_0 / BYTE_1) khi bật NodeDetection hoặc Partial Networking.`);
  }
  if (ecucConfig.CanNmPassiveModeEnabled && ecucConfig.CanNmNodeDetectionEnabled) {
    warnings.push(`[ECUC_CanNm_00088] Khi CanNmPassiveModeEnabled = TRUE thì CanNmNodeDetectionEnabled phải = FALSE.`);
  }
  const sysByteCount = ((ecucConfig.CanNmNodeIdEnabled && ecucConfig.CanNmPduNidPosition !== "OFF") || ecucConfig.CanNmPduCbvPosition !== "OFF")
    ? ((ecucConfig.CanNmPduNidPosition !== "OFF" && ecucConfig.CanNmPduCbvPosition !== "OFF" && ecucConfig.CanNmPduNidPosition !== ecucConfig.CanNmPduCbvPosition && ecucConfig.CanNmNodeIdEnabled) ? 2 : 1)
    : 0;
  if (ecucConfig.CanNmPnEnabled) {
    if (ecucConfig.CanNmPnInfoOffset + ecucConfig.CanNmPnInfoLength > 8) {
      warnings.push(`Vùng Partial Network (Offset=${ecucConfig.CanNmPnInfoOffset} + Length=${ecucConfig.CanNmPnInfoLength}) vượt quá kích thước 8 Bytes của CAN Frame.`);
    }
    if (ecucConfig.CanNmPnInfoOffset < sysByteCount || (ecucConfig.CanNmNodeIdEnabled && ecucConfig.CanNmPduNidPosition === "BYTE_1" && ecucConfig.CanNmPnInfoOffset === 1) || (ecucConfig.CanNmPduCbvPosition === "BYTE_1" && ecucConfig.CanNmPnInfoOffset === 1)) {
      warnings.push(`[SWS_CanNm_00501] Vùng PNC Bit Vector (Offset=${ecucConfig.CanNmPnInfoOffset}) không được chồng lấn lên System Bytes (SNI/CBV).`);
    }
  }
  if (ecucConfig.CanNmCarWakeUpRxEnabled && ecucConfig.CanNmCarWakeUpBytePosition < sysByteCount) {
    warnings.push(`[ECUC_CanNm_00076] CanNmCarWakeUpBytePosition (${ecucConfig.CanNmCarWakeUpBytePosition}) phải >= số System Bytes (${sysByteCount}).`);
  }
  if (ecucConfig.CanNmRemoteSleepIndEnabled && ecucConfig.CanNmRemoteSleepIndTime < ecucConfig.CanNmMsgCycleTime) {
    warnings.push(`[ECUC_CanNm_00023] CanNmRemoteSleepIndTime (${ecucConfig.CanNmRemoteSleepIndTime}ms) phải >= CanNmMsgCycleTime (${ecucConfig.CanNmMsgCycleTime}ms).`);
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
  setChecked("cfg_CanNmImmediateTxconfEnabled", ecucConfig.CanNmImmediateTxconfEnabled);
  setChecked("cfg_CanNmCoordinatorSyncSupport", ecucConfig.CanNmCoordinatorSyncSupport);

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
  setVal("cfg_CanNmTxPnRequestHex", ecucConfig.CanNmTxPnRequestHex);
  setChecked("cfg_CanNmPnEiraCalcEnabled", ecucConfig.CanNmPnEiraCalcEnabled);
  setChecked("cfg_CanNmPnEraCalcEnabled", ecucConfig.CanNmPnEraCalcEnabled);
  setVal("cfg_CanNmPnResetTime", ecucConfig.CanNmPnResetTime);
  setChecked("cfg_CanNmPnHandleMultipleNetworkRequests", ecucConfig.CanNmPnHandleMultipleNetworkRequests);
  setChecked("cfg_PnAvailabilityConfirmed", ecucConfig.PnAvailabilityConfirmed);
  setChecked("cfg_CanNmSynchronizedPncShutdownEnabled", ecucConfig.CanNmSynchronizedPncShutdownEnabled);

  setChecked("cfg_CanNmUserDataEnabled", ecucConfig.CanNmUserDataEnabled);
  setChecked("cfg_CanNmComUserDataSupport", ecucConfig.CanNmComUserDataSupport);
  setVal("cfg_UserDataBytesHex", ecucConfig.UserDataBytesHex);
  setChecked("cfg_CanNmCarWakeUpRxEnabled", ecucConfig.CanNmCarWakeUpRxEnabled);
  setVal("cfg_CanNmCarWakeUpBytePosition", ecucConfig.CanNmCarWakeUpBytePosition);
  setVal("cfg_CanNmCarWakeUpBitPosition", ecucConfig.CanNmCarWakeUpBitPosition);
  setChecked("cfg_CanNmCarWakeUpFilterEnabled", ecucConfig.CanNmCarWakeUpFilterEnabled);
  setVal("cfg_CanNmCarWakeUpFilterNodeId", "0x" + (ecucConfig.CanNmCarWakeUpFilterNodeId & 0xFF).toString(16).toUpperCase().padStart(2, "0"));
  setChecked("cfg_CanNmRemoteSleepIndEnabled", ecucConfig.CanNmRemoteSleepIndEnabled);
  setVal("cfg_CanNmRemoteSleepIndTime", ecucConfig.CanNmRemoteSleepIndTime);

  setChecked("simTxConfirmFail", simState.engine.simTxConfirmFail);

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
  simState.engine.simTxConfirmFail = false;
  updateUIFromConfig();
  addTraceLog("API", "User -> System", "Khôi phục cấu hình mặc định (Reset Default)", "Toàn bộ tham số ECUC được đưa về giá trị chuẩn AUTOSAR CP R25-11.");
  renderAll();
}

function onSimTxFailToggle(checked) {
  simState.engine.simTxConfirmFail = !!checked;
  renderAll();
}

function stepMainFunctionTick() {
  stepClockTick(ecucConfig.CanNmMainFunctionPeriod);
}

// 4. CORE ENGINE CALCULATION, STATE HELPERS & PDU FRAME BUILDER
function getNmFullStateName(mode, subState) {
  if (mode === "NM_MODE_BUS_SLEEP") return "NM_STATE_BUS_SLEEP";
  if (mode === "NM_MODE_PREPARE_BUS_SLEEP") return "NM_STATE_PREPARE_BUS_SLEEP";
  return subState;
}

function reportStateChange(prevFullState, nextFullState) {
  if (ecucConfig.CanNmStateChangeIndEnabled && prevFullState !== nextFullState) {
    addTraceLog("API", "CanNm -> Nm", `Nm_StateChangeNotification(0, ${prevFullState}, ${nextFullState})`, "[SWS_CanNm_00166] Thông báo chuyển trạng thái lên lớp trên (Nm / BswM / ComM).");
  }
}

function requireInitialized(apiName) {
  if (!ecucConfig.CanNmInitialized) {
    if (ecucConfig.CanNmDevErrorDetect) {
      addTraceLog("DET", "CanNm", `CANNM_E_UNINIT (0x01) — ${apiName} -> E_NOT_OK`, "[SWS_CanNm_00316 / SWS_CanNm_00189] Module chưa khởi tạo và CanNmDevErrorDetect=TRUE -> Det_ReportError(0x01), hủy thực thi & trả E_NOT_OK.");
    }
    return false;
  }
  return true;
}

function getCbvByteValue() {
  let val = 0;
  if (simState.cbv.rmr) val |= 0x01; // Bit 0: RMR
  if (simState.cbv.pnsr && ecucConfig.CanNmSynchronizedPncShutdownEnabled) val |= 0x02; // Bit 1: PNSR
  else if (simState.cbv.pnsr) val |= 0x02;
  if (simState.cbv.csr) val |= 0x08; // Bit 3: CSR (NM Coordinator Sleep Ready)
  if (simState.cbv.awb) val |= 0x10; // Bit 4: AWB
  if (simState.cbv.pnl) val |= 0x20; // Bit 5: PNL (Partial Network Learning)
  if (ecucConfig.CanNmPnEnabled || simState.cbv.pni) val |= 0x40; // Bit 6: PNI
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

function parseHexBytes(hexStr) {
  return String(hexStr || "")
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(h => {
      const parsed = parseInt(h, 16);
      return isNaN(parsed) ? 0 : (parsed & 0xFF);
    });
}

function formatHexBytes(arr) {
  return (arr || []).map(b => (b & 0xFF).toString(16).toUpperCase().padStart(2, "0")).join(" ");
}

function getPduLayoutDescriptor() {
  const roles = new Array(8).fill("UNUSED");
  let nidIdx = -1;
  let cbvIdx = -1;

  if (ecucConfig.CanNmNodeIdEnabled) {
    if (ecucConfig.CanNmPduNidPosition === "BYTE_0") nidIdx = 0;
    else if (ecucConfig.CanNmPduNidPosition === "BYTE_1") nidIdx = 1;
  }
  if (ecucConfig.CanNmPduCbvPosition === "BYTE_0") cbvIdx = 0;
  else if (ecucConfig.CanNmPduCbvPosition === "BYTE_1") cbvIdx = 1;

  if (nidIdx >= 0) roles[nidIdx] = "SNI";
  if (cbvIdx >= 0) roles[cbvIdx] = "CBV"; // If overlapping, CBV overwrites SNI (warned by validateTimingRules)

  const pnIndices = [];
  if (ecucConfig.CanNmPnEnabled) {
    for (let i = 0; i < ecucConfig.CanNmPnInfoLength; i++) {
      const idx = ecucConfig.CanNmPnInfoOffset + i;
      if (idx >= 0 && idx < 8 && roles[idx] === "UNUSED") {
        roles[idx] = "PN";
        pnIndices.push(idx);
      }
    }
  }

  // SWS_CanNm_00501: When CanNmPnEnabled is TRUE, User Data resides EXCLUSIVELY in ONE contiguous block
  // either between System Bytes and PNC bit vector OR between PNC bit vector and end of NM-PDU.
  const userIndices = [];
  if (ecucConfig.CanNmUserDataEnabled) {
    if (!ecucConfig.CanNmPnEnabled) {
      for (let i = 0; i < 8; i++) {
        if (roles[i] === "UNUSED") {
          roles[i] = "USER";
          userIndices.push(i);
        }
      }
    } else {
      let maxSysIdx = -1;
      for (let i = 0; i < 8; i++) {
        if (roles[i] === "SNI" || roles[i] === "CBV") maxSysIdx = i;
      }
      const pnStart = pnIndices.length ? pnIndices[0] : ecucConfig.CanNmPnInfoOffset;
      const pnEnd = pnIndices.length ? pnIndices[pnIndices.length - 1] + 1 : ecucConfig.CanNmPnInfoOffset;
      const regionA = [];
      for (let i = maxSysIdx + 1; i < pnStart; i++) {
        if (i >= 0 && i < 8 && roles[i] === "UNUSED") regionA.push(i);
      }
      const regionB = [];
      for (let i = pnEnd; i < 8; i++) {
        if (i >= 0 && i < 8 && roles[i] === "UNUSED") regionB.push(i);
      }
      const chosen = regionB.length > 0 ? regionB : regionA;
      chosen.forEach(idx => {
        roles[idx] = "USER";
        userIndices.push(idx);
      });
    }
  }

  return { roles, nidIdx, cbvIdx, pnIndices, userIndices };
}

function getPduFrameBytes() {
  // SWS_CanNm_00025: User data bytes initialized/padded with 0xFF
  const bytes = [0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF];
  const layout = getPduLayoutDescriptor();
  const nid = ecucConfig.CanNmNodeId & 0xFF;
  const cbv = getCbvByteValue();

  if (layout.nidIdx >= 0 && layout.roles[layout.nidIdx] === "SNI") {
    bytes[layout.nidIdx] = nid;
  }
  if (layout.cbvIdx >= 0 && layout.roles[layout.cbvIdx] === "CBV") {
    bytes[layout.cbvIdx] = cbv;
  }

  // SWS_CanNm_00500 / SWS_CanNm_00518: Tx PNC vector comes from Nm_PncBitVectorTxIndication (IRA), NOT Rx FilterMask
  if (ecucConfig.CanNmPnEnabled) {
    const hasTxReq = simState.engine.netRequest || simState.engine.pnShutdownMsgActive;
    const txPnArr = hasTxReq ? parseHexBytes(ecucConfig.CanNmTxPnRequestHex) : [];
    layout.pnIndices.forEach((idx, k) => {
      bytes[idx] = (k < txPnArr.length) ? txPnArr[k] : 0x00;
    });
  }

  if (ecucConfig.CanNmUserDataEnabled) {
    const userHexArr = parseHexBytes(ecucConfig.UserDataBytesHex);
    layout.userIndices.forEach((idx, uIdx) => {
      bytes[idx] = (uIdx < userHexArr.length) ? userHexArr[uIdx] : 0xFF;
    });
  }

  return bytes;
}

function evaluatePnFilter(rxPni, rxPniBytes) {
  if (!ecucConfig.CanNmPnEnabled) {
    return { active: false, accepted: true, matched: true, reason: "PN_DISABLED" };
  }

  const len = Math.max(1, Number(ecucConfig.CanNmPnInfoLength) || 1);
  const localMask = parseHexBytes(ecucConfig.CanNmPnFilterMaskHex);
  const rxPncMask = [];
  const filterMask = [];
  const andResult = [];
  let matched = false;

  for (let i = 0; i < len; i++) {
    const rxB = (i < rxPniBytes.length) ? (rxPniBytes[i] & 0xFF) : 0;
    const mB = (i < localMask.length) ? (localMask[i] & 0xFF) : 0;
    const andB = rxB & mB;
    rxPncMask.push(rxB);
    filterMask.push(mB);
    andResult.push(andB);
    if (andB !== 0) matched = true;
  }

  const inBusSleep = (simState.mode === "NM_MODE_BUS_SLEEP");
  // SWS_CanNm_00411 / SWS_CanNm_00410
  if (!rxPni) {
    const keepAwake = !inBusSleep && !!ecucConfig.CanNmAllNmMessagesKeepAwake;
    return {
      active: true,
      accepted: keepAwake,
      matched: false,
      pniZero: true,
      inBusSleep,
      rxPncMask,
      filterMask,
      andResult,
      reason: keepAwake ? "KEEP_AWAKE_PNI_ZERO" : "IGNORED_PNI_ZERO"
    };
  }

  // SWS_CanNm_00503: Confirmed PN requires match (unless AllNmMessagesKeepAwake in active mode); unconfirmed PN passes all PNI=1
  if (!ecucConfig.PnAvailabilityConfirmed) {
    return {
      active: true,
      accepted: true,
      matched: matched,
      unconfirmed: true,
      pniZero: false,
      inBusSleep,
      rxPncMask,
      filterMask,
      andResult,
      reason: "UNCONFIRMED_PN"
    };
  }

  if (matched) {
    return {
      active: true,
      accepted: true,
      matched: true,
      pniZero: false,
      inBusSleep,
      rxPncMask,
      filterMask,
      andResult,
      reason: "MATCHED"
    };
  }

  const keepAwake = !inBusSleep && !!ecucConfig.CanNmAllNmMessagesKeepAwake;
  return {
    active: true,
    accepted: keepAwake,
    matched: false,
    pniZero: false,
    inBusSleep,
    rxPncMask,
    filterMask,
    andResult,
    reason: keepAwake ? "KEEP_AWAKE_UNMATCHED" : "IGNORED_UNMATCHED"
  };
}

function updatePncArrayWithBytes(targetField, timerMapField, pnBytes, resetMs) {
  let mask16 = simState.pnc[targetField] || 0;
  const timers = simState.pnc[timerMapField] || {};
  const b0 = pnBytes[0] || 0;
  const b1 = pnBytes[1] || 0;
  const word = (b0 | (b1 << 8)) & 0xFFFF;
  for (let bit = 0; bit < 16; bit++) {
    if (word & (1 << bit)) {
      mask16 |= (1 << bit);
      timers[bit] = resetMs;
    }
  }
  simState.pnc[targetField] = mask16 & 0xFFFF;
  simState.pnc[timerMapField] = timers;
  refreshPnResetDisplayTimer();
}

function refreshPnResetDisplayTimer() {
  let maxT = 0;
  Object.values(simState.pnc.eiraTimers || {}).forEach(v => { if (v > maxT) maxT = v; });
  Object.values(simState.pnc.eraTimers || {}).forEach(v => { if (v > maxT) maxT = v; });
  simState.timers.pnReset = maxT;
}

function tickPncTimers(deltaMs) {
  const tickMap = (targetField, timerMapField, label) => {
    const timers = simState.pnc[timerMapField] || {};
    let changed = false;
    let clearedBits = [];
    Object.keys(timers).forEach(bitKey => {
      timers[bitKey] = Math.max(0, timers[bitKey] - deltaMs);
      if (timers[bitKey] === 0) {
        const bit = parseInt(bitKey, 10);
        simState.pnc[targetField] &= ~(1 << bit);
        delete timers[bitKey];
        changed = true;
        clearedBits.push(`PNC #${16 + bit}`);
      }
    });
    if (changed) {
      addTraceLog("PN", "Nm / CanNm Engine", `${label} PnResetTimer Hết Hạn -> Xóa [${clearedBits.join(", ")}]`, `[SWS_CanNm_00502] ${label} mới = 0x${simState.pnc[targetField].toString(16).toUpperCase().padStart(4, "0")}.`);
    }
  };
  tickMap("eira", "eiraTimers", "EIRA");
  tickMap("era", "eraTimers", "ERA");
  refreshPnResetDisplayTimer();
}

function triggerCanNmTransmit(reasonLabel, isPnShutdown = false) {
  if (!requireInitialized("CanNm_Transmit()")) return false;
  if (ecucConfig.CanNmPassiveModeEnabled) {
    addTraceLog("API", "CanNm (Passive)", "Bỏ qua phát bản tin (PassiveMode = TRUE)", "Node ở chế độ thụ động chỉ nghe bus, không gọi CanIf_Transmit().");
    return false;
  }
  if (!simState.engine.msgTxEnabled) {
    addTraceLog("API", "CanNm (TxDisabled)", "Bản tin NM bị chặn (UDS 0x28 DisableCommunication)", "Đường truyền NM đang bị khóa bởi dịch vụ chẩn đoán.");
    return false;
  }

  // SWS_CanNm_00518: Fetch IRA PNC bit vector via Nm_PncBitVectorTxIndication before Tx
  if (ecucConfig.CanNmPnEnabled) {
    addTraceLog("API", "CanNm -> Nm", "Nm_PncBitVectorTxIndication(0, &TxPncBitVector)", "[SWS_CanNm_00518 / SWS_CanNm_00515] Lấy vector PNC nội bộ (IRA) mới nhất từ Nm trước khi gửi NM PDU.");
    if (ecucConfig.CanNmPnEiraCalcEnabled) {
      const hasTxReq = simState.engine.netRequest || simState.engine.pnShutdownMsgActive;
      const txPnArr = hasTxReq ? parseHexBytes(ecucConfig.CanNmTxPnRequestHex) : [];
      if ((txPnArr[0] || 0) || (txPnArr[1] || 0)) {
        updatePncArrayWithBytes("eira", "eiraTimers", txPnArr, ecucConfig.CanNmPnResetTime);
      }
    }
  }

  if (ecucConfig.CanNmComUserDataSupport) {
    addTraceLog("API", "CanNm -> PduR", "PduR_CanNmTriggerTransmit(TxUserDataPduId, &PduInfo)", "[SWS_CanNm_00328] CanNM tự động gọi PduR -> Com_TriggerTransmit() để lấy User Data mới nhất từ COM.");
  }

  const canIdHex = "0x" + (ecucConfig.CanNmBaseCanId + ecucConfig.CanNmNodeId).toString(16).toUpperCase();
  const bytes = getPduFrameBytes();
  const byteStr = bytes.map(b => b.toString(16).toUpperCase().padStart(2, "0")).join(" ");
  const cbvVal = getCbvByteValue();

  simState.lastBusActivity = `Tx ${canIdHex} [${byteStr}]`;
  simState.activeDirection = "Downward Request ↓";

  addTraceLog("BUS", "CanNm -> CanIf", `LSduR/CanIf_Transmit(ID=${canIdHex}, Data=[${byteStr}])`, `${reasonLabel} | SNI=0x${(ecucConfig.CanNmNodeId).toString(16).toUpperCase()}, CBV=0x${cbvVal.toString(16).toUpperCase().padStart(2, "0")} (AWB=${simState.cbv.awb ? 1 : 0}, RMR=${simState.cbv.rmr ? 1 : 0}, PNSR=${(cbvVal & 0x02) ? 1 : 0}, PNI=${(cbvVal & 0x40) ? 1 : 0})`);

  // SWS_CanNm_00071 / SWS_CanNm_00073 / SWS_CanNm_00064 / SWS_CanNm_00065
  if (!ecucConfig.CanNmImmediateTxconfEnabled && simState.engine.simTxConfirmFail) {
    if (!simState.engine.txPending || simState.timers.msgTimeout <= 0) {
      simState.timers.msgTimeout = ecucConfig.CanNmMsgTimeoutTime;
      addTraceLog("WARN", "CanNm Engine", `Chờ CanNm_TxConfirmation() -> Bật MsgTimeoutTimer = ${ecucConfig.CanNmMsgTimeoutTime}ms`, "[SWS_CanNm_00064] Đang giả lập mất TxConfirmation từ CanIf.");
    }
    simState.engine.txPending = true;
  } else {
    simState.engine.txPending = false;
    simState.timers.msgTimeout = 0;
    simState.timers.timeout = ecucConfig.CanNmTimeoutTime;
    if (ecucConfig.CanNmPnEnabled) {
      addTraceLog("API", "CanNm -> Nm", "Nm_PncBitVectorTxConfirmation(0, E_OK)", "[SWS_CanNm_00516] Chuyển tiếp xác nhận Tx PNC thành công lên Nm.");
    }
    if (isPnShutdown) {
      simState.engine.pnShutdownMsgActive = false;
      simState.cbv.pnsr = false;
    }
    addTraceLog("API", "CanIf -> CanNm", "CanNm_TxConfirmation(TxPduId, E_OK)", `[SWS_CanNm_00099 / SWS_CanNm_00065] Xác nhận phát thành công -> Dừng MsgTimeoutTimer & Nạp lại NM-Timeout Timer = ${ecucConfig.CanNmTimeoutTime}ms.`);
  }
  return true;
}

function apiTxConfirmationResult(isOk = true) {
  if (!requireInitialized("CanNm_TxConfirmation()")) return;
  simState.timers.msgTimeout = 0;
  simState.engine.txPending = false;
  if (isOk) {
    simState.timers.timeout = ecucConfig.CanNmTimeoutTime;
    if (simState.engine.pnShutdownMsgActive) {
      simState.engine.pnShutdownMsgActive = false;
      simState.cbv.pnsr = false;
    }
    addTraceLog("API", "CanIf -> CanNm", "CanNm_TxConfirmation(TxPduId, E_OK)", `[SWS_CanNm_00065 / SWS_CanNm_00099] Đã nhận TxConfirmation(E_OK) -> Dừng MsgTimeoutTimer, nạp lại NM-Timeout = ${ecucConfig.CanNmTimeoutTime}ms.`);
    if (ecucConfig.CanNmPnEnabled) {
      addTraceLog("API", "CanNm -> Nm", "Nm_PncBitVectorTxConfirmation(0, E_OK)", "[SWS_CanNm_00516]");
    }
  } else {
    addTraceLog("WARN", "CanIf -> CanNm", "CanNm_TxConfirmation(TxPduId, E_NOT_OK)", "[SWS_CanNm_00066] Truyền thất bại (E_NOT_OK) -> Báo Nm_TxTimeoutException()!");
    addTraceLog("API", "CanNm -> Nm", "Nm_TxTimeoutException(nmChannelHandle=0)", "[SWS_CanNm_00066]");
    if (ecucConfig.CanNmPnEnabled) {
      addTraceLog("API", "CanNm -> Nm", "Nm_PncBitVectorTxConfirmation(0, E_NOT_OK)", "[SWS_CanNm_00517] Báo Nm biết PN Tx không được xác nhận.");
    }
  }
  renderAll();
}

// 5. CORE API TRIGGER IMPLEMENTATIONS
function apiNetworkRequest() {
  if (!requireInitialized("CanNm_NetworkRequest()")) return;
  if (ecucConfig.CanNmPassiveModeEnabled) {
    addTraceLog("API", "CanNm", "CanNm_NetworkRequest() -> E_NOT_OK", "[SWS_CanNm_00257 / SWS_CanNm_00189] Từ chối yêu cầu mạng vì CanNmPassiveModeEnabled = TRUE.");
    return;
  }

  const prevFull = getNmFullStateName(simState.mode, simState.subState);
  simState.engine.netRequest = true;
  simState.wakeupSource = "Active SWC Request";
  addTraceLog("API", "ComM -> Nm -> CanNm", "CanNm_NetworkRequest(nmChannelHandle=0)", "[SWS_CanNm_00104 / SWS_CanNm_00255] Ứng dụng yêu cầu giữ mạng CAN (Network State = requested).");

  const scheduleRepeatEntryTx = (useImmediateRestart = false) => {
    if (useImmediateRestart) {
      addTraceLog("API", "CanNm Engine", "Immediate Restart Enabled -> Phát ngay gói NM PDU tại t=0ms", "[SWS_CanNm_00122] Khởi động lại mạng ngay tại Prepare Bus-Sleep.");
      triggerCanNmTransmit("Đánh thức khẩn cấp tại Prepare Bus-Sleep");
      simState.engine.immBurstActive = false;
      simState.engine.burstLeft = 0;
      simState.timers.msgCycle = ecucConfig.CanNmMsgCycleTime;
    } else if (ecucConfig.CanNmImmediateNmTransmissions > 0) {
      const totalBurst = ecucConfig.CanNmImmediateNmTransmissions;
      addTraceLog("API", "CanNm Engine", `Immediate Burst Tx (${totalBurst} gói, chu kỳ ${ecucConfig.CanNmImmediateNmCycleTime}ms)`, "[PRS_Nm_00005 / SWS_CanNm_00335] Phát ngay gói đầu tiên để đánh thức nhanh toàn mạng.");
      triggerCanNmTransmit("Gói chùm Burst Tx #1");
      const left = totalBurst - 1;
      if (left > 0) {
        simState.engine.immBurstActive = true;
        simState.engine.burstLeft = left;
        simState.timers.msgCycle = ecucConfig.CanNmImmediateNmCycleTime;
      } else {
        // SWS_CanNm_00335: Only 1 immediate Tx -> afterwards continue with CanNmMsgCycleTime
        simState.engine.immBurstActive = false;
        simState.engine.burstLeft = 0;
        simState.timers.msgCycle = ecucConfig.CanNmMsgCycleTime;
      }
    } else {
      simState.engine.immBurstActive = false;
      simState.engine.burstLeft = 0;
      simState.timers.msgCycle = ecucConfig.CanNmMsgCycleOffset;
    }
  };

  if (simState.mode === "NM_MODE_BUS_SLEEP") {
    simState.mode = "NM_MODE_NETWORK";
    simState.subState = "NM_STATE_REPEAT_MESSAGE";
    simState.engine.busLoadReductionActive = false; // SWS_CanNm_00156
    if (ecucConfig.CanNmActiveWakeupBitEnabled) {
      simState.cbv.awb = true; // SWS_CanNm_00401
    }
    simState.timers.repeatMsg = ecucConfig.CanNmRepeatMessageTime;
    simState.timers.timeout = ecucConfig.CanNmTimeoutTime;

    addTraceLog("STATE", "CanNm State Machine", "BUS_SLEEP -> NETWORK_MODE (REPEAT_MESSAGE)", `[SWS_CanNm_00129 / SWS_CanNm_00314] Active Wakeup! Nm_NetworkMode() [SWS_CanNm_00097], RepeatMsgTimer=${ecucConfig.CanNmRepeatMessageTime}ms, TimeoutTimer=${ecucConfig.CanNmTimeoutTime}ms.`);
    reportStateChange(prevFull, getNmFullStateName(simState.mode, simState.subState));
    scheduleRepeatEntryTx(false);

    if (ecucConfig.CanNmRepeatMessageTime === 0) {
      const p = getNmFullStateName(simState.mode, simState.subState);
      simState.subState = "NM_STATE_NORMAL_OPERATION";
      simState.cbv.rmr = false;
      simState.engine.immBurstActive = false;
      simState.engine.burstLeft = 0;
      simState.engine.busLoadReductionActive = !!ecucConfig.CanNmBusLoadReductionEnabled;
      reportStateChange(p, "NM_STATE_NORMAL_OPERATION");
    }

  } else if (simState.mode === "NM_MODE_PREPARE_BUS_SLEEP") {
    simState.mode = "NM_MODE_NETWORK";
    simState.subState = "NM_STATE_REPEAT_MESSAGE";
    simState.engine.busLoadReductionActive = false; // SWS_CanNm_00156
    if (ecucConfig.CanNmActiveWakeupBitEnabled) simState.cbv.awb = true; // SWS_CanNm_00401
    simState.timers.waitBusSleep = 0;
    simState.timers.repeatMsg = ecucConfig.CanNmRepeatMessageTime;
    simState.timers.timeout = ecucConfig.CanNmTimeoutTime;

    addTraceLog("STATE", "CanNm State Machine", "PREPARE_BUS_SLEEP -> REPEAT_MESSAGE", "[SWS_CanNm_00123 / SWS_CanNm_00315] Đánh thức lại từ Prepare Bus-Sleep! Hủy WaitBusSleepTimer & báo Nm_NetworkMode() [SWS_CanNm_00097].");
    reportStateChange(prevFull, getNmFullStateName(simState.mode, simState.subState));
    scheduleRepeatEntryTx(!!ecucConfig.CanNmImmediateRestartEnabled);

    if (ecucConfig.CanNmRepeatMessageTime === 0) {
      const p = getNmFullStateName(simState.mode, simState.subState);
      simState.subState = "NM_STATE_NORMAL_OPERATION";
      simState.cbv.rmr = false;
      simState.engine.immBurstActive = false;
      simState.engine.burstLeft = 0;
      simState.engine.busLoadReductionActive = !!ecucConfig.CanNmBusLoadReductionEnabled;
      reportStateChange(p, "NM_STATE_NORMAL_OPERATION");
    }

  } else if (simState.mode === "NM_MODE_NETWORK") {
    if (simState.subState === "NM_STATE_READY_SLEEP") {
      simState.subState = "NM_STATE_NORMAL_OPERATION";
      simState.engine.busLoadReductionActive = !!ecucConfig.CanNmBusLoadReductionEnabled; // SWS_CanNm_00157
      if (ecucConfig.CanNmRemoteSleepIndEnabled && simState.engine.msgTxEnabled) {
        simState.timers.remoteSleep = ecucConfig.CanNmRemoteSleepIndTime;
      }
      addTraceLog("STATE", "CanNm State Machine", "READY_SLEEP -> NORMAL_OPERATION", "[SWS_CanNm_00110 / SWS_CanNm_00116] Vào Normal Operation -> Phát ngay NM PDU [SWS_CanNm_00006] & chạy chu kỳ MsgCycleTime.");
      reportStateChange(prevFull, "NM_STATE_NORMAL_OPERATION");
      if (simState.engine.msgTxEnabled) {
        triggerCanNmTransmit("Immediate Tx khi vào Normal Operation (SWS_CanNm_00006)");
        simState.timers.msgCycle = ecucConfig.CanNmMsgCycleTime;
      }
    } else if (ecucConfig.CanNmPnHandleMultipleNetworkRequests) {
      // Section 7.11.4 / State Chart 7.18: Re-enter Repeat Message on additional NetworkRequest
      simState.subState = "NM_STATE_REPEAT_MESSAGE";
      simState.engine.busLoadReductionActive = false; // SWS_CanNm_00156
      if (simState.engine.remoteSleepDetected) {
        simState.engine.remoteSleepDetected = false;
        addTraceLog("API", "CanNm -> Nm", "Nm_RemoteSleepCancellation(0)", "[SWS_CanNm_00152] Hủy Remote Sleep khi vào lại Repeat Message.");
      }
      simState.timers.remoteSleep = 0;
      simState.timers.repeatMsg = ecucConfig.CanNmRepeatMessageTime;
      addTraceLog("STATE", "CanNm State Machine", `${prevFull.replace("NM_STATE_", "")} -> REPEAT_MESSAGE (MultiNetReq)`, "[ECUC_CanNm_00073 / State Chart 7.18] CanNmPnHandleMultipleNetworkRequests=TRUE -> Chuyển/restart Repeat Message State & bắn Immediate Tx.");
      reportStateChange(prevFull, "NM_STATE_REPEAT_MESSAGE");
      scheduleRepeatEntryTx(false);
    }
  }

  renderAll();
}

function apiNetworkRelease() {
  if (!requireInitialized("CanNm_NetworkRelease()")) return;
  if (ecucConfig.CanNmPassiveModeEnabled) {
    addTraceLog("API", "CanNm", "CanNm_NetworkRelease() -> E_NOT_OK", "[SWS_CanNm_00260 / SWS_CanNm_00189] Từ chối vì CanNmPassiveModeEnabled = TRUE.");
    return;
  }

  const prevFull = getNmFullStateName(simState.mode, simState.subState);
  simState.engine.netRequest = false;
  addTraceLog("API", "ComM -> Nm -> CanNm", "CanNm_NetworkRelease(nmChannelHandle=0)", "[SWS_CanNm_00105] Ứng dụng nhả mạng (Network State = released).");

  if (simState.mode === "NM_MODE_NETWORK" && simState.subState === "NM_STATE_NORMAL_OPERATION") {
    simState.subState = "NM_STATE_READY_SLEEP";
    simState.timers.msgCycle = 0; // SWS_CanNm_00108 / SWS_CanNm_00051: Cancel Message Cycle Timer
    simState.engine.immBurstActive = false;
    simState.engine.burstLeft = 0;
    simState.engine.busLoadReductionActive = false;
    simState.timers.remoteSleep = 0;
    simState.engine.remoteSleepDetected = false;
    addTraceLog("STATE", "CanNm State Machine", "NORMAL_OPERATION -> READY_SLEEP", "[SWS_CanNm_00118 / SWS_CanNm_00108 / SWS_CanNm_00051] Chuyển sang Ready Sleep: Dừng phát NM PDU, hủy MsgCycleTimer = 0ms và chờ NM-Timeout Timer.");
    reportStateChange(prevFull, "NM_STATE_READY_SLEEP");
  }
  renderAll();
}

function apiPassiveStartUp() {
  if (!requireInitialized("CanNm_PassiveStartUp()")) return;
  if (simState.mode === "NM_MODE_NETWORK") {
    addTraceLog("API", "CanNm", "CanNm_PassiveStartUp(0) -> E_NOT_OK", "[SWS_CanNm_00147] Không thực thi và trả E_NOT_OK vì CanNm đang ở Network Mode.");
    renderAll();
    return;
  }

  const prevFull = getNmFullStateName(simState.mode, simState.subState);
  const fromLbl = simState.mode === "NM_MODE_PREPARE_BUS_SLEEP" ? "PREPARE_BUS_SLEEP" : "BUS_SLEEP";
  simState.wakeupSource = "Passive Bus Wakeup";
  addTraceLog("API", "EcuM / ComM -> CanNm", "CanNm_PassiveStartUp(nmChannelHandle=0)", "[SWS_CanNm_00128] Đánh thức thụ động.");

  simState.mode = "NM_MODE_NETWORK";
  simState.subState = "NM_STATE_REPEAT_MESSAGE";
  simState.cbv.awb = false; // Passive startup: AWB must be 0
  simState.engine.netRequest = false;
  simState.engine.busLoadReductionActive = false; // SWS_CanNm_00156
  simState.engine.immBurstActive = false;
  simState.engine.burstLeft = 0;
  simState.timers.repeatMsg = ecucConfig.CanNmRepeatMessageTime;
  simState.timers.timeout = ecucConfig.CanNmTimeoutTime;
  simState.timers.waitBusSleep = 0;
  simState.timers.msgCycle = ecucConfig.CanNmPassiveModeEnabled ? 0 : ecucConfig.CanNmMsgCycleOffset;

  addTraceLog("STATE", "CanNm State Machine", `${fromLbl} -> NETWORK_MODE (REPEAT_MESSAGE)`, `[SWS_CanNm_00128 / SWS_CanNm_00097] Passive Wakeup! Giữ AWB=0, gọi Nm_NetworkMode()${ecucConfig.CanNmPassiveModeEnabled ? "" : `, phát gói đầu sau MsgCycleOffset=${ecucConfig.CanNmMsgCycleOffset}ms [PRS_Nm_00334]`}.`);
  reportStateChange(prevFull, "NM_STATE_REPEAT_MESSAGE");

  if (ecucConfig.CanNmRepeatMessageTime === 0) {
    simState.subState = "NM_STATE_READY_SLEEP";
    simState.timers.msgCycle = 0;
    reportStateChange("NM_STATE_REPEAT_MESSAGE", "NM_STATE_READY_SLEEP");
  }
  renderAll();
}

function apiRepeatMessageRequest() {
  if (!requireInitialized("CanNm_RepeatMessageRequest()")) return;
  if (!ecucConfig.CanNmNodeDetectionEnabled || ecucConfig.CanNmPassiveModeEnabled) {
    addTraceLog("API", "CanNm", "CanNm_RepeatMessageRequest() -> E_NOT_OK", "[ECUC_CanNm_00088 / SWS_CanNm_00221] Bị từ chối vì CanNmNodeDetectionEnabled = FALSE hoặc CanNmPassiveModeEnabled = TRUE.");
    renderAll();
    return;
  }
  if (simState.mode !== "NM_MODE_NETWORK" || simState.subState === "NM_STATE_REPEAT_MESSAGE") {
    addTraceLog("WARN", "CanNm", "CanNm_RepeatMessageRequest() -> E_NOT_OK", `[SWS_CanNm_00137] Không thực thi và trả E_NOT_OK khi gọi trong ${getNmFullStateName(simState.mode, simState.subState)}.`);
    renderAll();
    return;
  }

  const prevSub = simState.subState;
  const isFromReadySleep = (prevSub === "NM_STATE_READY_SLEEP");
  const swsRef = isFromReadySleep ? "SWS_CanNm_00112 / SWS_CanNm_00113" : "SWS_CanNm_00120 / SWS_CanNm_00121";

  addTraceLog("API", "SWC/Diag -> Nm -> CanNm", "CanNm_RepeatMessageRequest(nmChannelHandle=0)", `[${swsRef}] Yêu cầu toàn mạng điểm danh.`);
  if (simState.engine.remoteSleepDetected) {
    simState.engine.remoteSleepDetected = false;
    addTraceLog("API", "CanNm -> Nm", "Nm_RemoteSleepCancellation(0)", "[SWS_CanNm_00152] Hủy trạng thái Remote Sleep khi chuyển về Repeat Message.");
  }
  simState.timers.remoteSleep = 0;
  simState.engine.busLoadReductionActive = false; // SWS_CanNm_00156
  simState.subState = "NM_STATE_REPEAT_MESSAGE";
  simState.cbv.rmr = true; // Bit 0 RMR = 1
  simState.timers.repeatMsg = ecucConfig.CanNmRepeatMessageTime;
  if (simState.engine.msgTxEnabled && !ecucConfig.CanNmPassiveModeEnabled) {
    // SWS_CanNm_00100 & SWS_CanNm_00221: (Re-)start PDU Tx with RMR=1 for next transmitted PDUs
    if (isFromReadySleep || simState.timers.msgCycle <= 0) {
      simState.timers.msgCycle = ecucConfig.CanNmMsgCycleOffset;
    }
  }

  addTraceLog("STATE", "CanNm State Machine", `${prevSub.replace("NM_STATE_", "")} -> REPEAT_MESSAGE (RMR = 1)`, `[${swsRef} / SWS_CanNm_00100] Bật Bit 0 RMR=1 cho các bản tin kế tiếp, chạy RepeatMsgTimer=${ecucConfig.CanNmRepeatMessageTime}ms.`);
  reportStateChange(prevSub, "NM_STATE_REPEAT_MESSAGE");
  renderAll();
}

function apiSimulatedRxIndication() {
  if (!requireInitialized("CanNm_RxIndication()")) return;

  const rxRmr = document.getElementById("simRxRmr")?.checked || false;
  const rxPnsr = document.getElementById("simRxPnsr")?.checked || false;
  const rxCsr = document.getElementById("simRxCsr")?.checked || false;
  const rxAwb = document.getElementById("simRxAwb")?.checked || false;
  const rxPnl = document.getElementById("simRxPnl")?.checked || false;
  const rxPni = document.getElementById("simRxPni")?.checked || false;
  const rxCwu = document.getElementById("simRxCwu")?.checked || false;
  const autoPassive = document.getElementById("simAutoPassiveOnRx")?.checked || false;
  const rxPniHexStr = (document.getElementById("simRxPniHex")?.value || "05 00").trim();
  const rxPniBytes = parseHexBytes(rxPniHexStr);

  let rxCbv = 0;
  if (rxRmr) rxCbv |= 0x01;
  if (rxPnsr) rxCbv |= 0x02;
  if (rxCsr) rxCbv |= 0x08;
  if (rxAwb) rxCbv |= 0x10;
  if (rxPnl) rxCbv |= 0x20;
  if (rxPni) rxCbv |= 0x40;

  const remoteNodeId = 0x2B;
  const rxCanId = "0x" + (ecucConfig.CanNmBaseCanId + remoteNodeId).toString(16).toUpperCase();
  const rxPduStr = `CanNm_RxIndication(ID=${rxCanId}, CBV=0x${rxCbv.toString(16).toUpperCase().padStart(2, "0")}, PNI=[${rxPniHexStr}])`;

  simState.lastBusActivity = `Rx ${rxCanId} [2B ${rxCbv.toString(16).toUpperCase().padStart(2, "0")} ${rxPniHexStr} ...]`;
  simState.activeDirection = "Upward Indication ↑";

  addTraceLog("BUS", "CanIf -> CanNm", rxPduStr, `Nhận NM từ Node 0x2B (RMR=${rxRmr ? 1 : 0}, PNSR=${rxPnsr ? 1 : 0}, CSR=${rxCsr ? 1 : 0}, AWB=${rxAwb ? 1 : 0}, PNL=${rxPnl ? 1 : 0}, PNI=${rxPni ? 1 : 0}, CWU=${rxCwu ? 1 : 0})`);

  // Evaluate Partial Networking Filter (SWS_CanNm_00409 / 00410 / 00411 / 00502 / 00503 / 00504)
  const pnEval = evaluatePnFilter(rxPni, rxPniBytes);
  if (pnEval.active) {
    const rxHex = formatHexBytes(pnEval.rxPncMask);
    const maskHex = formatHexBytes(pnEval.filterMask);
    const andHex = formatHexBytes(pnEval.andResult);

    if (rxPni && rxPnsr && ecucConfig.CanNmSynchronizedPncShutdownEnabled) {
      addTraceLog("PN", "CanNm -> Nm", "Nm_ForwardSynchronizedPncShutdown(0, &PncBitVector)", `[SWS_CanNm_00504] PNI=1 & PNSR=1 -> Chuyển tiếp PNC Shutdown [${rxHex}] lên Nm.`);
    } else if (rxPni) {
      addTraceLog("API", "CanNm -> Nm", "Nm_PncBitVectorRxIndication(0, &PncBitVector, &Relevant)", `[SWS_CanNm_00502] Chuyển tiếp PNC vector [${rxHex}] sang Nm để lọc theo Mask [${maskHex}] -> Relevant=${pnEval.matched}.`);
    }

    if (pnEval.matched) {
      const relevantBits = pnEval.andResult;
      if (ecucConfig.CanNmPnEiraCalcEnabled) {
        updatePncArrayWithBytes("eira", "eiraTimers", relevantBits, ecucConfig.CanNmPnResetTime);
      }
      if (ecucConfig.CanNmPnEraCalcEnabled) {
        updatePncArrayWithBytes("era", "eraTimers", relevantBits, ecucConfig.CanNmPnResetTime);
      }
      addTraceLog("PN", "CanNm / Nm Engine", "PN Filter: MATCHED! (Khớp PNC Filter Mask)", `[SWS_CanNm_00503] ([${rxHex}] & [${maskHex}] = [${andHex}] != 0) -> EIRA=0x${simState.pnc.eira.toString(16).toUpperCase().padStart(4, "0")}, ERA=0x${simState.pnc.era.toString(16).toUpperCase().padStart(4, "0")}.`);
    } else if (!pnEval.accepted) {
      const reasonTitle = pnEval.pniZero
        ? "PN Filter: IGNORED! (CBV PNI = 0)"
        : "PN Filter: IGNORED! (Không khớp PNC Filter Mask)";
      const reasonDesc = pnEval.pniZero
        ? `[SWS_CanNm_00411] CanNmPnEnabled = TRUE nhưng PNI=0 và AllNmMessagesKeepAwake=FALSE -> Bỏ qua bản tin${pnEval.inBusSleep ? " (Giữ nguyên Bus-Sleep Mode)" : ""}.`
        : `[SWS_CanNm_00503] ([${rxHex}] & [${maskHex}] = [${andHex}] == 0) -> Bỏ qua bản tin${pnEval.inBusSleep ? " (Không đánh thức Bus-Sleep Mode)" : ""}!`;
      addTraceLog("PN", "CanNm Engine", reasonTitle, reasonDesc);
      renderAll();
      return;
    } else {
      addTraceLog("PN", "CanNm Engine", pnEval.unconfirmed ? "PN Availability Unconfirmed -> Chấp nhận gói (SWS_CanNm_00503)" : "PN Override: CanNmAllNmMessagesKeepAwake = TRUE", `[SWS_CanNm_00410 / SWS_CanNm_00503] Gói tin (${pnEval.pniZero ? "PNI=0" : `[${rxHex}] & [${maskHex}] == 0`}) vẫn được xử lý.`);
    }
  }

  // SWS_CanNm_00405 / 00406 / 00408: Car Wakeup (CWU) is in User Data at CanNmCarWakeUpBytePosition/BitPosition
  if (rxCwu && ecucConfig.CanNmCarWakeUpRxEnabled) {
    if (ecucConfig.CanNmCarWakeUpFilterEnabled && remoteNodeId !== ecucConfig.CanNmCarWakeUpFilterNodeId) {
      addTraceLog("API", "CanNm Engine", "Bỏ qua Car Wakeup CWU=1 (Sai Filter Node ID)", `[SWS_CanNm_00408] CWU=1 tại Byte ${ecucConfig.CanNmCarWakeUpBytePosition} Bit ${ecucConfig.CanNmCarWakeUpBitPosition} từ Node 0x${remoteNodeId.toString(16).toUpperCase()} không khớp FilterNodeId=0x${ecucConfig.CanNmCarWakeUpFilterNodeId.toString(16).toUpperCase()}.`);
    } else {
      addTraceLog("API", "CanNm -> Nm -> ComM", "Nm_CarWakeUpIndication(nmChannelHandle=0)", `[SWS_CanNm_00405 / SWS_CanNm_00406] Phát hiện bit CWU=1 tại Byte ${ecucConfig.CanNmCarWakeUpBytePosition} Bit ${ecucConfig.CanNmCarWakeUpBitPosition} trong User Data -> Đánh thức toàn xe!`);
    }
  }

  // SWS_CanNm_00341: Coordinator Sleep Ready (CBV Bit 3 CSR)
  if (rxCsr && ecucConfig.CanNmCoordinatorSyncSupport && simState.mode === "NM_MODE_NETWORK") {
    addTraceLog("API", "CanNm -> Nm", "Nm_CoordReadyToSleepIndication(nmChannelHandle=0)", "[SWS_CanNm_00341] Nhận Bit 3 CBV (CSR=1) từ Coordinator.");
  }

  // SWS_CanNm_00127 / SWS_CanNm_00336: RxIndication in Bus-Sleep reports CANNM_E_NET_START_IND + Nm_NetworkStartIndication() WITHOUT auto-entering Network Mode
  if (simState.mode === "NM_MODE_BUS_SLEEP") {
    addTraceLog("DET", "CanNm", "CANNM_E_NET_START_IND (0x04)", "[SWS_CanNm_00336 / SWS_CanNm_00317] Nhận NM PDU khi đang ở Bus-Sleep Mode -> Báo runtime error CANNM_E_NET_START_IND.");
    addTraceLog("API", "CanNm -> Nm -> ComM", "Nm_NetworkStartIndication(nmChannelHandle=0)", "[SWS_CanNm_00127] CanNm KHÔNG tự chuyển sang Network Mode mà chỉ báo lớp trên (ComM/EcuM tự quyết định gọi CanNm_PassiveStartUp).");
    if (autoPassive) {
      apiPassiveStartUp();
    } else {
      renderAll();
    }
    return;
  }

  // SWS_CanNm_00124: RxIndication in Prepare Bus-Sleep enters Network Mode (Repeat Message State)
  if (simState.mode === "NM_MODE_PREPARE_BUS_SLEEP") {
    const prevFull = "NM_STATE_PREPARE_BUS_SLEEP";
    simState.mode = "NM_MODE_NETWORK";
    simState.subState = "NM_STATE_REPEAT_MESSAGE";
    simState.cbv.awb = false;
    simState.engine.busLoadReductionActive = false; // SWS_CanNm_00156
    simState.timers.waitBusSleep = 0;
    simState.timers.repeatMsg = ecucConfig.CanNmRepeatMessageTime;
    simState.timers.timeout = ecucConfig.CanNmTimeoutTime;
    simState.timers.msgCycle = ecucConfig.CanNmPassiveModeEnabled ? 0 : ecucConfig.CanNmMsgCycleOffset;
    addTraceLog("STATE", "CanNm State Machine", "PREPARE_BUS_SLEEP -> REPEAT_MESSAGE", "[SWS_CanNm_00124 / SWS_CanNm_00315] Nhận NM PDU khi ở Prepare Bus-Sleep -> Vào Repeat Message (AWB=0) & gọi Nm_NetworkMode() [SWS_CanNm_00097].");
    reportStateChange(prevFull, "NM_STATE_REPEAT_MESSAGE");
    if (ecucConfig.CanNmRepeatMessageTime === 0) {
      simState.subState = "NM_STATE_READY_SLEEP";
      simState.timers.msgCycle = 0;
      reportStateChange("NM_STATE_REPEAT_MESSAGE", "NM_STATE_READY_SLEEP");
    }
    renderAll();
    return;
  }

  // Network Mode Rx handling
  if (simState.mode === "NM_MODE_NETWORK") {
    // SWS_CanNm_00098: Restart NM-Timeout Timer ONLY if PDU transmission ability is enabled
    if (simState.engine.msgTxEnabled) {
      simState.timers.timeout = ecucConfig.CanNmTimeoutTime;
      addTraceLog("API", "CanNm Engine", `Nạp lại NM-Timeout Timer = ${ecucConfig.CanNmTimeoutTime}ms`, "[SWS_CanNm_00098] Nhận NM PDU khi PDU Tx đang bật -> Nạp lại NM-Timeout Timer.");
    } else {
      addTraceLog("API", "CanNm Engine", "KHÔNG nạp lại NM-Timeout Timer (Tx đang bị khóa UDS 0x28)", "[SWS_CanNm_00098] PDU transmission ability đang tắt -> Không restart NM-Timeout Timer.");
    }

    // SWS_CanNm_00151: Remote Sleep Cancellation on Rx in Normal Operation / Ready Sleep
    if (simState.subState === "NM_STATE_NORMAL_OPERATION" || simState.subState === "NM_STATE_READY_SLEEP") {
      if (simState.engine.remoteSleepDetected) {
        simState.engine.remoteSleepDetected = false;
        addTraceLog("API", "CanNm -> Nm", "Nm_RemoteSleepCancellation(nmChannelHandle=0)", "[SWS_CanNm_00151] Nhận gói NM từ bus -> Hủy trạng thái Remote Sleep!");
      }
      if (simState.subState === "NM_STATE_NORMAL_OPERATION" && ecucConfig.CanNmRemoteSleepIndEnabled && simState.engine.msgTxEnabled && !ecucConfig.CanNmPassiveModeEnabled) {
        simState.timers.remoteSleep = ecucConfig.CanNmRemoteSleepIndTime;
      }
    }

    // SWS_CanNm_00119 (Normal Operation) / SWS_CanNm_00111 (Ready Sleep): Remote Repeat Message Request RMR=1
    if (rxRmr && ecucConfig.CanNmNodeDetectionEnabled) {
      if (simState.subState === "NM_STATE_NORMAL_OPERATION" || simState.subState === "NM_STATE_READY_SLEEP") {
        const prevSub = simState.subState;
        const rmrSws = prevSub === "NM_STATE_READY_SLEEP" ? "SWS_CanNm_00111" : "SWS_CanNm_00119";
        if (simState.engine.remoteSleepDetected) {
          simState.engine.remoteSleepDetected = false;
          addTraceLog("API", "CanNm -> Nm", "Nm_RemoteSleepCancellation(0)", "[SWS_CanNm_00152] Hủy Remote Sleep khi vào Repeat Message.");
        }
        simState.timers.remoteSleep = 0;
        simState.engine.busLoadReductionActive = false; // SWS_CanNm_00156
        simState.subState = "NM_STATE_REPEAT_MESSAGE";
        simState.timers.repeatMsg = ecucConfig.CanNmRepeatMessageTime;
        if (simState.engine.msgTxEnabled && !ecucConfig.CanNmPassiveModeEnabled) {
          simState.timers.msgCycle = ecucConfig.CanNmMsgCycleOffset;
        }
        addTraceLog("STATE", "CanNm State Machine", `${prevSub.replace("NM_STATE_", "")} -> REPEAT_MESSAGE (Nhận RMR=1)`, `[${rmrSws}] Remote Node yêu cầu điểm danh -> Vào Repeat Message State.`);
        if (ecucConfig.CanNmRepeatMsgIndEnabled) {
          addTraceLog("API", "CanNm -> Nm", "Nm_RepeatMessageIndication(nmChannelHandle=0)", "[SWS_CanNm_00014] Báo lên Nm.");
        }
        reportStateChange(prevSub, "NM_STATE_REPEAT_MESSAGE");
      }
    } else if (ecucConfig.CanNmBusLoadReductionEnabled && simState.subState === "NM_STATE_NORMAL_OPERATION" && simState.engine.msgTxEnabled && !ecucConfig.CanNmPassiveModeEnabled) {
      // SWS_CanNm_00069: Restart Message Cycle Timer with CanNmMsgReducedTime
      simState.timers.msgCycle = ecucConfig.CanNmMsgReducedTime;
      addTraceLog("API", "CanNm Engine", `Bus Load Reduction: Nạp MsgCycleTimer = CanNmMsgReducedTime (${ecucConfig.CanNmMsgReducedTime}ms)`, "[SWS_CanNm_00069] Nhường đường truyền bằng CanNmMsgReducedTime khi nhận Rx ở Normal Operation.");
    }
  }

  renderAll();
}

function apiToggleCommunication() {
  if (!requireInitialized("CanNm_DisableCommunication / EnableCommunication")) return;
  if (!ecucConfig.CanNmComControlEnabled) {
    addTraceLog("WARN", "CanNm", "CanNm_Disable/EnableCommunication() -> E_NOT_OK", "[SWS_CanNm_00262 / SWS_CanNm_00264] API bị vô hiệu do CanNmComControlEnabled = FALSE.");
    return;
  }
  if (simState.mode !== "NM_MODE_NETWORK") {
    const fnName = simState.engine.msgTxEnabled ? "CanNm_DisableCommunication(0)" : "CanNm_EnableCommunication(0)";
    const swsId = simState.engine.msgTxEnabled ? "SWS_CanNm_00172" : "SWS_CanNm_00295";
    addTraceLog("WARN", "CanNm", `${fnName} -> E_NOT_OK`, `[${swsId}] Không thực thi và trả E_NOT_OK vì hiện tại không ở Network Mode (${simState.mode}).`);
    return;
  }

  if (simState.engine.msgTxEnabled) {
    simState.engine.msgTxEnabled = false;
    simState.timers.msgCycle = 0; // SWS_CanNm_00173: Stop Message Cycle Timer
    simState.timers.timeout = 0; // SWS_CanNm_00174: Stop NM-Timeout Timer
    simState.timers.remoteSleep = 0; // SWS_CanNm_00175: Stop Remote Sleep Indication Detection
    simState.engine.remoteSleepDetected = false;
    simState.engine.immBurstActive = false;
    simState.engine.burstLeft = 0;
    addTraceLog("API", "Dcm -> BswM -> Nm -> CanNm", "CanNm_DisableCommunication(nmChannelHandle=0) -> E_OK", "[SWS_CanNm_00170 / 00173 / 00174 / 00175] Khóa Tx, DỪNG MsgCycleTimer, NM-Timeout Timer và Remote Sleep Detection.");
  } else {
    simState.engine.msgTxEnabled = true;
    simState.timers.timeout = ecucConfig.CanNmTimeoutTime; // SWS_CanNm_00179: Restart NM-Timeout Timer
    if (simState.subState === "NM_STATE_REPEAT_MESSAGE" || simState.subState === "NM_STATE_NORMAL_OPERATION") {
      simState.timers.msgCycle = ecucConfig.CanNmMainFunctionPeriod; // SWS_CanNm_00178: Start Tx within next MainFunction
    }
    if (simState.subState === "NM_STATE_NORMAL_OPERATION" && ecucConfig.CanNmRemoteSleepIndEnabled && !ecucConfig.CanNmPassiveModeEnabled) {
      simState.timers.remoteSleep = ecucConfig.CanNmRemoteSleepIndTime; // SWS_CanNm_00180
    }
    addTraceLog("API", "Dcm -> BswM -> Nm -> CanNm", "CanNm_EnableCommunication(nmChannelHandle=0) -> E_OK", `[SWS_CanNm_00176 / 00178 / 00179 / 00180] Mở lại Tx, khởi động lại NM-Timeout Timer = ${ecucConfig.CanNmTimeoutTime}ms & phát trong MainFunction kế tiếp.`);
  }
  renderAll();
}

function apiCheckRemoteSleepIndication() {
  if (!requireInitialized("CanNm_CheckRemoteSleepIndication()")) return;
  if (!ecucConfig.CanNmRemoteSleepIndEnabled || simState.mode !== "NM_MODE_NETWORK" || simState.subState === "NM_STATE_REPEAT_MESSAGE") {
    addTraceLog("WARN", "SWC -> CanNm", "CanNm_CheckRemoteSleepIndication(0) -> E_NOT_OK", `[SWS_CanNm_00154] Trả E_NOT_OK trong Bus-Sleep, Prepare Bus-Sleep, Repeat Message hoặc khi RemoteSleepIndEnabled=FALSE.`);
  } else {
    addTraceLog("API", "SWC -> CanNm", `CanNm_CheckRemoteSleepIndication(0, *detected=${simState.engine.remoteSleepDetected}) -> E_OK`, "[SWS_CanNm_00154 / SWS_CanNm_00227] Đọc trạng thái Remote Sleep hợp lệ.");
  }
  renderAll();
}

function apiActivateTxPnShutdownMsg() {
  if (!requireInitialized("CanNm_ActivateTxPnShutdownMsg()")) return;
  if (!ecucConfig.CanNmSynchronizedPncShutdownEnabled) {
    addTraceLog("WARN", "Nm -> CanNm", "CanNm_ActivateTxPnShutdownMsg(0) -> E_NOT_OK", "[SWS_CanNm_00520] Chỉ khả dụng khi CanNmSynchronizedPncShutdownEnabled = TRUE.");
    renderAll();
    return;
  }
  simState.engine.pnShutdownMsgActive = true;
  simState.cbv.pnsr = true;
  addTraceLog("PN", "Nm -> CanNm", "CanNm_ActivateTxPnShutdownMsg(0) -> E_OK", "[SWS_CanNm_00521 / SWS_CanNm_00519] Bật PNSR=1 (CBV Bit 1); ưu tiên gửi PN Shutdown Message ở MainFunction kế tiếp (SWS_CanNm_00513).");
  renderAll();
}

// 6. SCHM MAINFUNCTION CLOCK TICK & STATE TRANSITIONS
function stepSingleMainFunctionTick(deltaMs) {
  simState.clockMs += deltaMs;

  // 1. Tick MsgTimeoutTimer (SWS_CanNm_00064 / 00066 / 00446)
  if (simState.engine.txPending && simState.timers.msgTimeout > 0) {
    simState.timers.msgTimeout = Math.max(0, simState.timers.msgTimeout - deltaMs);
    if (simState.timers.msgTimeout === 0) {
      simState.engine.txPending = false;
      addTraceLog("WARN", "CanNm Engine", "CanNmMsgTimeoutTime Hết Hạn (0ms)!", "[SWS_CanNm_00066 / SWS_CanNm_00446] Không nhận được CanNm_TxConfirmation() đúng hạn -> Gọi Nm_TxTimeoutException() & CanSM_TxTimeoutException().");
      addTraceLog("API", "CanNm -> Nm / CanSM", "Nm_TxTimeoutException(0) & CanSM_TxTimeoutException(0)", "[SWS_CanNm_00066 / SWS_CanNm_00446] Báo lỗi nghẽn truyền CAN.");
    }
  }

  // 2. Tick NM-Timeout Timer (SWS_CanNm_00101 / 00193 / 00117 / 00194 / 00109)
  if (simState.mode === "NM_MODE_NETWORK" && simState.engine.msgTxEnabled && simState.timers.timeout > 0) {
    simState.timers.timeout = Math.max(0, simState.timers.timeout - deltaMs);
    if (simState.timers.timeout === 0) {
      if (simState.subState === "NM_STATE_READY_SLEEP") {
        const prevFull = "NM_STATE_READY_SLEEP";
        simState.mode = "NM_MODE_PREPARE_BUS_SLEEP";
        simState.cbv.awb = false; // SWS_CanNm_00402
        simState.timers.msgCycle = 0;
        simState.timers.remoteSleep = 0;
        simState.engine.remoteSleepDetected = false;
        simState.engine.immBurstActive = false;
        simState.engine.burstLeft = 0;
        simState.engine.busLoadReductionActive = false;
        simState.timers.waitBusSleep = ecucConfig.CanNmWaitBusSleepTime;
        addTraceLog("STATE", "CanNm State Machine", "READY_SLEEP -> PREPARE_BUS_SLEEP", `[SWS_CanNm_00109 / SWS_CanNm_00402] NM-Timeout hết hạn -> Xóa AWB=0, chạy WaitBusSleepTimer=${ecucConfig.CanNmWaitBusSleepTime}ms.`);
        addTraceLog("API", "CanNm -> Nm -> ComM", "Nm_PrepareBusSleepMode(0)", "[SWS_CanNm_00114] Báo tầng trên chuẩn bị tắt nguồn.");
        reportStateChange(prevFull, "NM_STATE_PREPARE_BUS_SLEEP");
      } else if (simState.subState === "NM_STATE_REPEAT_MESSAGE") {
        simState.timers.timeout = ecucConfig.CanNmTimeoutTime; // SWS_CanNm_00101
        addTraceLog("DET", "CanNm", "CANNM_E_NETWORK_TIMEOUT (0x11) -> Restart TimeoutTimer", `[SWS_CanNm_00101 / SWS_CanNm_00193] NM-Timeout hết hạn trong Repeat Message -> Nạp lại = ${ecucConfig.CanNmTimeoutTime}ms & báo Runtime Error 0x11.`);
      } else if (simState.subState === "NM_STATE_NORMAL_OPERATION") {
        simState.timers.timeout = ecucConfig.CanNmTimeoutTime; // SWS_CanNm_00117
        addTraceLog("DET", "CanNm", "CANNM_E_NETWORK_TIMEOUT (0x11) -> Restart TimeoutTimer", `[SWS_CanNm_00117 / SWS_CanNm_00194] NM-Timeout hết hạn trong Normal Operation -> Nạp lại = ${ecucConfig.CanNmTimeoutTime}ms & báo Runtime Error 0x11.`);
      }
    }
  }

  // 3. Tick RepeatMessageTimer (SWS_CanNm_00102 / 00103 / 00106 / 00107)
  if (simState.mode === "NM_MODE_NETWORK" && simState.subState === "NM_STATE_REPEAT_MESSAGE" && simState.timers.repeatMsg > 0) {
    simState.timers.repeatMsg = Math.max(0, simState.timers.repeatMsg - deltaMs);
    if (simState.timers.repeatMsg === 0) {
      simState.cbv.rmr = false; // SWS_CanNm_00107
      simState.cbv.pnl = false; // SWS_CanNm_00382
      simState.engine.immBurstActive = false;
      simState.engine.burstLeft = 0;
      if (simState.engine.netRequest) {
        simState.subState = "NM_STATE_NORMAL_OPERATION";
        simState.engine.busLoadReductionActive = !!ecucConfig.CanNmBusLoadReductionEnabled; // SWS_CanNm_00157
        if (ecucConfig.CanNmRemoteSleepIndEnabled && simState.engine.msgTxEnabled && !ecucConfig.CanNmPassiveModeEnabled) {
          simState.timers.remoteSleep = ecucConfig.CanNmRemoteSleepIndTime;
        }
        // Keep running msgCycle uninterrupted if already counting; only init if <= 0
        if (simState.timers.msgCycle <= 0 && simState.engine.msgTxEnabled && !ecucConfig.CanNmPassiveModeEnabled) {
          simState.timers.msgCycle = ecucConfig.CanNmMsgCycleTime;
        }
        addTraceLog("STATE", "CanNm State Machine", "REPEAT_MESSAGE -> NORMAL_OPERATION", "[SWS_CanNm_00103 / SWS_CanNm_00107] Hết RepeatMessageTime & NetReq=1 -> Normal Operation (Xóa RMR=0).");
        reportStateChange("NM_STATE_REPEAT_MESSAGE", "NM_STATE_NORMAL_OPERATION");
      } else {
        simState.subState = "NM_STATE_READY_SLEEP";
        simState.timers.msgCycle = 0; // SWS_CanNm_00108 / SWS_CanNm_00051
        simState.engine.busLoadReductionActive = false;
        addTraceLog("STATE", "CanNm State Machine", "REPEAT_MESSAGE -> READY_SLEEP", "[SWS_CanNm_00106 / SWS_CanNm_00108 / SWS_CanNm_00051] Hết RepeatMessageTime & NetReq=0 -> Ready Sleep (Xóa RMR=0, hủy MsgCycleTimer).");
        reportStateChange("NM_STATE_REPEAT_MESSAGE", "NM_STATE_READY_SLEEP");
      }
    }
  }

  // 4. Tick RemoteSleepTimer in NORMAL_OPERATION (SWS_CanNm_00150)
  if (
    simState.mode === "NM_MODE_NETWORK" &&
    simState.subState === "NM_STATE_NORMAL_OPERATION" &&
    ecucConfig.CanNmRemoteSleepIndEnabled &&
    simState.engine.msgTxEnabled &&
    !ecucConfig.CanNmPassiveModeEnabled &&
    !simState.engine.remoteSleepDetected &&
    simState.timers.remoteSleep > 0
  ) {
    simState.timers.remoteSleep = Math.max(0, simState.timers.remoteSleep - deltaMs);
    if (simState.timers.remoteSleep === 0) {
      simState.engine.remoteSleepDetected = true;
      addTraceLog("API", "CanNm -> Nm", "Nm_RemoteSleepIndication(nmChannelHandle=0)", `[SWS_CanNm_00150] Suốt ${ecucConfig.CanNmRemoteSleepIndTime}ms không nhận gói NM từ bus -> Toàn bộ node con đã sẵn sàng ngủ!`);
    }
  }

  // 5. Tick WaitBusSleepTimer (SWS_CanNm_00248 / SWS_CanNm_00088 / SWS_CanNm_00126)
  if (simState.mode === "NM_MODE_PREPARE_BUS_SLEEP" && simState.timers.waitBusSleep > 0) {
    simState.timers.waitBusSleep = Math.max(0, simState.timers.waitBusSleep - deltaMs);
    if (simState.timers.waitBusSleep === 0) {
      simState.mode = "NM_MODE_BUS_SLEEP";
      simState.wakeupSource = "None";
      addTraceLog("STATE", "CanNm State Machine", "PREPARE_BUS_SLEEP -> BUS_SLEEP", "[SWS_CanNm_00248 / SWS_CanNm_00088] Hết WaitBusSleepTime (0ms) -> Bus-Sleep Mode.");
      addTraceLog("API", "CanNm -> Nm -> ComM", "Nm_BusSleepMode(0) -> CanSM(NO_COM)", "[SWS_CanNm_00126] Báo lớp trên tắt Controller và Transceiver.");
      reportStateChange("NM_STATE_PREPARE_BUS_SLEEP", "NM_STATE_BUS_SLEEP");
    }
  }

  // 6. Synchronized PNC Shutdown priority Tx (SWS_CanNm_00513 / SWS_CanNm_00519) OR Periodic / Burst Tx (SWS_CanNm_00040 / SWS_CanNm_00335 / SWS_CanNm_00512)
  if (simState.mode === "NM_MODE_NETWORK" && simState.engine.msgTxEnabled && !ecucConfig.CanNmPassiveModeEnabled) {
    if (ecucConfig.CanNmSynchronizedPncShutdownEnabled && simState.engine.pnShutdownMsgActive) {
      triggerCanNmTransmit("PN Shutdown Message (PNSR=1, ưu tiên SWS_CanNm_00513/00519)", true);
    } else if (simState.subState === "NM_STATE_REPEAT_MESSAGE" || simState.subState === "NM_STATE_NORMAL_OPERATION") {
      if (simState.timers.msgCycle > 0) {
        simState.timers.msgCycle = Math.max(0, simState.timers.msgCycle - deltaMs);
        if (simState.timers.msgCycle === 0) {
          if (simState.engine.immBurstActive && simState.engine.burstLeft > 0) {
            const idxFrame = ecucConfig.CanNmImmediateNmTransmissions - simState.engine.burstLeft + 1;
            triggerCanNmTransmit(`Gói chùm Burst Tx #${idxFrame}`);
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
            simState.timers.msgCycle = ecucConfig.CanNmMsgCycleTime; // SWS_CanNm_00040
          }
        }
      }
    }
  }

  // 7. Tick independent per-PNC timers (EIRA & ERA)
  tickPncTimers(deltaMs);
}

function stepClockTick(deltaMs) {
  if (!ecucConfig.CanNmInitialized) return;
  const period = Math.max(10, ecucConfig.CanNmMainFunctionPeriod || 100);
  let remaining = Math.max(0, Number(deltaMs) || 0);
  if (remaining === 0) {
    renderAll();
    return;
  }
  while (remaining > 0) {
    const step = Math.min(remaining, period);
    stepSingleMainFunctionTick(step);
    remaining -= step;
  }
  renderAll();
}

function resetSimulation() {
  simState.mode = "NM_MODE_BUS_SLEEP";
  simState.subState = "NM_STATE_REPEAT_MESSAGE";
  simState.cbv = { rmr: false, pnsr: false, csr: false, awb: false, pnl: false, pni: false };
  simState.engine = {
    netRequest: false,
    immBurstActive: false,
    burstLeft: 0,
    msgTxEnabled: true,
    busLoadReductionActive: false,
    remoteSleepDetected: false,
    pnShutdownMsgActive: false,
    txPending: false,
    simTxConfirmFail: false
  };
  simState.timers = { repeatMsg: 0, timeout: 0, waitBusSleep: 0, msgCycle: 0, msgTimeout: 0, pnReset: 0, remoteSleep: 0 };
  simState.pnc = { eira: 0x0000, era: 0x0000, eiraTimers: {}, eraTimers: {} };
  simState.clockMs = 0;
  simState.lastBusActivity = "Chưa có";
  simState.wakeupSource = "None";
  simState.activeDirection = "None";

  const chkFail = document.getElementById("simTxConfirmFail");
  if (chkFail) chkFail.checked = false;

  addTraceLog("API", "System", "Khởi tạo lại trạng thái CanNM (CanNm_Init)", "[SWS_CanNm_00141 / 00143 / 00025 / 00085] NM_MODE_BUS_SLEEP, Released, Timers=OFF, CBV=0x00, UserData=0xFF.");
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
          stepClockTick(2200); // Into Normal Operation right after Periodic Tx -> Timeout=2000ms
          addTraceLog("INIT", "Precondition", "S3 Sẵn Sàng: ECU đang ở Normal Operation State", "SWC đang giữ mạng, truyền phát bản tin định kỳ. Sẵn sàng theo dõi chu trình đi ngủ 4 pha.");
        }
      },
      {
        api: "Bước 1: SWC nhả mạng -> CanNm_NetworkRelease()",
        io: "Input: SWC -> ComM -> Nm -> CanNm -> Ready Sleep State",
        desc: "ECU đang ở Normal Operation State. Ứng dụng đã hoàn tất nhiệm vụ và gọi CanNm_NetworkRelease(). CanNM chuyển ngay sang Ready Sleep State và hủy MsgCycleTimer = 0ms.",
        action: () => {
          apiNetworkRelease(); // Into Ready Sleep
        }
      },
      {
        api: "Bước 2: Đếm ngược NM-Timeout Timer (CanNmTimeoutTime = 2000ms)",
        io: "Input: SchM Clock -> Giảm Timeout Timer từ 2000ms xuống 1000ms",
        desc: "Trên bus không có bất kỳ ECU nào phát bản tin NM. NM-Timeout Timer đếm lùi. Nếu có node nào phát trong thời gian này, timer sẽ lập tức nạp lại đầy 2000ms để giữ mạng thức.",
        action: () => {
          stepClockTick(1000);
        }
      },
      {
        api: "Bước 3: Hết NM-Timeout -> Chuyển sang Prepare Bus-Sleep Mode",
        io: "Input: CanNm_MainFunction() -> CanNm -> Prepare Bus-Sleep Mode (SWS_CanNm_00109)",
        desc: "NM-Timeout Timer chạm 0ms! Toàn mạng đồng ý đi ngủ. CanNM xóa cờ AWB về 0, chuyển sang Prepare Bus-Sleep Mode, báo Nm_PrepareBusSleepMode() và chạy WaitBusSleepTimer (1500ms).",
        action: () => {
          stepClockTick(1000);
        }
      },
      {
        api: "Bước 4: Hết WaitBusSleepTime (1500ms) -> Vào Bus-Sleep Mode & Tắt Phần Cứng",
        io: "Input: CanNm_MainFunction() -> CanNm -> Bus-Sleep Mode (SWS_CanNm_00248)",
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
          ecucConfig.CanNmImmediateRestartEnabled = true;
          ecucConfig.CanNmImmediateNmTransmissions = 0; // ECUC_CanNm_00056
          apiNetworkRequest();
          stepClockTick(2200);
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
          stepClockTick(2200);
          apiNetworkRelease();
          addTraceLog("INIT", "Precondition", "S5 Sẵn Sàng: ECU đang ở Ready Sleep State (im lặng)", "Sẵn sàng nhận yêu cầu điểm danh toàn mạng CanNm_RepeatMessageRequest() từ máy chẩn đoán Tester.");
        }
      },
      {
        api: "Bước 1: Gọi CanNm_RepeatMessageRequest() -> Bật Bit 0 (RMR = 1)",
        io: "Input: Diag SWC -> CanNm_RepeatMessageRequest()",
        desc: "CanNM chuyển về Repeat Message State, bật Bit 0 (RMR = 1) cho các bản tin phát kế tiếp (SWS_CanNm_00112 / 00113 / 00221) và lên lịch phát sau CanNmMsgCycleOffset.",
        action: () => {
          apiRepeatMessageRequest();
        }
      },
      {
        api: "Bước 2: Hết RepeatMessageTime (1500ms) -> Tự động xóa Bit RMR về 0",
        io: "Input: CanNm_MainFunction() -> CanNm -> Ready Sleep (RMR = 0)",
        desc: "Trong 1500ms ECU phát các bản tin mang RMR=1; ngay khi hết CanNmRepeatMessageTime (SWS_CanNm_00107), CanNM tự hạ Bit 0 (RMR: 1 -> 0) và hủy MsgCycleTimer.",
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
        io: "Trạng thái sẵn sàng: NM_STATE_NORMAL_OPERATION | BusLoadReduction = TRUE | MsgReducedTime = 500ms",
        desc: "ECU đang ở Normal Operation State với Bus Load Reduction được kích hoạt (CanNmMsgReducedTime = 500ms). Bấm 'Tiếp Theo ▶' để xem cách CanNM nạp lại timer khi Remote Node #2 phát bản tin.",
        action: () => {
          resetSimulation();
          ecucConfig.CanNmBusLoadReductionEnabled = true;
          ecucConfig.CanNmMsgReducedTime = 500;
          onConfigChange("CanNmBusLoadReductionEnabled", true);
          apiNetworkRequest();
          stepClockTick(2200); // In Normal Operation
          addTraceLog("INIT", "Precondition", "S6 Sẵn Sàng: ECU ở Normal Operation, Bus Load Reduction = TRUE, MsgReducedTime=500ms", "Sẵn sàng nhận bản tin NM từ Remote Node #2 để kiểm tra SWS_CanNm_00069.");
        }
      },
      {
        api: "Bước 1: Remote Node #2 phát bản tin NM -> Nạp CanNmMsgReducedTime (500ms)",
        io: "Input: CanNm_RxIndication() -> CanNm -> Nạp lại MsgCycleTimer = 500ms (SWS_CanNm_00069)",
        desc: "Khi nhận bản tin từ Node #2 trong Normal Operation State, CanNM nạp lại bộ đếm phát MsgCycleTimer bằng CanNmMsgReducedTime (500ms theo SWS_CanNm_00069) để nhường đường truyền!",
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
          resetSimulation();
          ecucConfig.CanNmPnEnabled = true;
          ecucConfig.CanNmTxPnRequestHex = "00 00"; // Keep Tx IRA 0 so Rx PNC #16 isolation is clear
          onConfigChange("CanNmPnEnabled", true);
          apiNetworkRequest();
          addTraceLog("INIT", "Precondition", "S9 Sẵn Sàng: Bật Partial Networking, ECU ở Network Mode", "Sẵn sàng kích hoạt cụm PNC để theo dõi tính toán vector EIRA/ERA và bộ đếm PnResetTimer.");
        }
      },
      {
        api: "Bước 1: Kích hoạt PNC #16 -> Cập nhật mảng EIRA = 0x0001",
        io: "Input: CanNm -> Nm_PncBitVectorRxIndication(0, &PncBitVector, &Relevant)",
        desc: "Khi PNC #16 được yêu cầu, CanNm chuyển tiếp lên Nm và cập nhật vector EIRA = 0x0001 (SWS_CanNm_00502). Bộ đếm PnResetTimer (1500ms) cho PNC #16 được kích hoạt.",
        action: () => {
          document.getElementById("simRxPni").checked = true;
          document.getElementById("simRxPniHex").value = "01 00";
          apiSimulatedRxIndication();
        }
      },
      {
        api: "Bước 2: Hết thời gian PnResetTime (1500ms) -> Xóa bit PNC #16 trong EIRA",
        io: "Input: CanNm_MainFunction() -> EIRA = 0x0000",
        desc: "Suốt 1500ms không có thêm gói tin hay yêu cầu nội bộ nào giữ PNC #16. PnResetTimer hết hạn, bit PNC #16 tự động xóa về 0 trong EIRA.",
        action: () => {
          stepClockTick(1500);
        }
      }
    ],
    whatIf: [
      { label: "Bật SyncPNCShutdown & Gửi PNSR=1 (ActivateTxPnShutdownMsg)", action: () => { ecucConfig.CanNmSynchronizedPncShutdownEnabled = true; onConfigChange("CanNmSynchronizedPncShutdownEnabled", true); apiActivateTxPnShutdownMsg(); } },
      { label: "Nhận thêm PNC #18 (0x04 00) -> EIRA |= thành 0x0005", action: () => { document.getElementById("simRxPni").checked = true; document.getElementById("simRxPniHex").value = "04 00"; apiSimulatedRxIndication(); } },
      { label: "Thay đổi PnResetTime = 3000ms", action: () => { ecucConfig.CanNmPnResetTime = 3000; onConfigChange("CanNmPnResetTime", true); } }
    ]
  },

  10: {
    title: "S10: Đánh Thức Toàn Xe Qua Car Wakeup Bit (CWU = 1)",
    steps: [
      {
        api: "Bước 0: Chuẩn bị kịch bản & Thiết lập điều kiện ban đầu (Precondition)",
        io: "Trạng thái sẵn sàng: CWU Byte 2 Bit 0 | FilterNodeId = 0x2B | ECU ở Bus-Sleep Mode",
        desc: "Bộ lọc Car Wakeup kiểm tra bit CWU trong User Data tại Byte 2 Bit 0 (SWS_CanNm_00405), chỉ chấp nhận từ Node 0x2B. ECU đang ở Bus-Sleep Mode. Bấm 'Tiếp Theo ▶' để gửi bản tin có CWU=1.",
        action: () => {
          resetSimulation();
          ecucConfig.CanNmCarWakeUpRxEnabled = true;
          ecucConfig.CanNmCarWakeUpFilterEnabled = true;
          ecucConfig.CanNmCarWakeUpFilterNodeId = 0x2B;
          ecucConfig.CanNmCarWakeUpBytePosition = 2;
          ecucConfig.CanNmCarWakeUpBitPosition = 0;
          onConfigChange("CanNmCarWakeUpFilterEnabled", true);
          addTraceLog("INIT", "Precondition", "S10 Chuẩn Bị: Car Wakeup (Byte 2, Bit 0), Filter = Node 0x2B, ECU ở Bus-Sleep", "Sẵn sàng nhận bản tin có bit CWU=1 (KHÔNG phải Bit 3 CSR trong CBV).");
        }
      },
      {
        api: "Bước 1: Remote ECU 0x2B gửi gói NM có CWU=1 -> Kích hoạt Car Wakeup!",
        io: "Input: CanNm_RxIndication(CWU=1 @ Byte 2 Bit 0, NodeId=0x2B) -> Nm_CarWakeUpIndication()",
        desc: "Đúng vị trí Byte/Bit và Node ID hợp lệ! CanNM gọi Nm_CarWakeUpIndication() đánh thức toàn hệ thống và báo Nm_NetworkStartIndication() theo SWS_CanNm_00127.",
        action: () => {
          document.getElementById("simRxCwu").checked = true;
          apiSimulatedRxIndication();
        }
      }
    ],
    whatIf: [
      { label: "Tắt bộ lọc Car Wakeup Filter (Chấp nhận CWU từ mọi Node)", action: () => { ecucConfig.CanNmCarWakeUpFilterEnabled = false; onConfigChange("CanNmCarWakeUpFilterEnabled", true); } },
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
          resetSimulation();
          ecucConfig.CanNmComUserDataSupport = true;
          ecucConfig.UserDataBytesHex = "DE AD BE EF CA FE";
          onConfigChange("CanNmComUserDataSupport", true);
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
          stepClockTick(2200);
          addTraceLog("INIT", "Precondition", "S12 Chuẩn Bị: ECU đang ở Normal Operation State", "Sẵn sàng nhận lệnh UDS 0x28 CanNm_DisableCommunication() từ máy chẩn đoán Dcm.");
        }
      },
      {
        api: "Bước 1: Dcm gọi CanNm_DisableCommunication() (UDS 0x28)",
        io: "Input: UDS 0x28 -> Dcm -> BswM -> Nm -> CanNm_DisableCommunication()",
        desc: "Dịch vụ UDS 0x28 khóa truyền thông: CanNM hạ Bit 1 (TX_EN: 1 -> 0), DỪNG MsgCycleTimer (SWS_CanNm_00173) và DỪNG NM-Timeout Timer (SWS_CanNm_00174).",
        action: () => {
          apiToggleCommunication();
        }
      },
      {
        api: "Bước 2: Tiến đồng hồ +1000ms -> Không có gói tin nào phát ra",
        io: "Input: SchM MainFunction +1000ms -> Tx bị chặn & Timeout không chạy",
        desc: "Trong suốt quá trình nạp phần mềm, bus CAN được giải phóng hoàn toàn khỏi các bản tin NM và các bộ đếm đều dừng.",
        action: () => {
          stepClockTick(1000);
        }
      },
      {
        api: "Bước 3: Dcm gọi CanNm_EnableCommunication() khôi phục mạng",
        io: "Input: Dcm -> CanNm_EnableCommunication() -> Khởi động lại Timeout & Tx",
        desc: "Quá trình Flash hoàn tất. CanNM bật lại Bit 1 (TX_EN = 1), khởi động lại NM-Timeout Timer = 2000ms (SWS_CanNm_00179) và mở phát lại trong MainFunction kế tiếp (SWS_CanNm_00178).",
        action: () => {
          apiToggleCommunication();
        }
      }
    ],
    whatIf: [
      { label: "Thử gọi DisableCommunication ở Bus-Sleep (Trả E_NOT_OK SWS_CanNm_00172)", action: () => { resetSimulation(); apiToggleCommunication(); } },
      { label: "Bắn gói Rx từ Node #2 khi đang DisableComm (Không nạp Timeout SWS_CanNm_00098)", action: () => apiSimulatedRxIndication() },
      { label: "Tắt tính năng ComControl (CanNmComControlEnabled = FALSE)", action: () => { ecucConfig.CanNmComControlEnabled = false; onConfigChange("CanNmComControlEnabled", true); } }
    ]
  },

  13: {
    title: "S13: Giám Sát Ngủ Từ Xa Cho Gateway (Remote Sleep Indication)",
    steps: [
      {
        api: "Bước 0: Chuẩn bị kịch bản & Thiết lập điều kiện ban đầu (Precondition)",
        io: "Trạng thái sẵn sàng: NM_STATE_NORMAL_OPERATION | RemoteSleepIndEnabled = TRUE | RemoteSleepTime = 1500ms",
        desc: "ECU Gateway đang ở Normal Operation State. Bộ đếm Remote Sleep Indication (1500ms) đang đếm ngược. Bấm 'Tiếp Theo ▶' để hết thời gian yên ắng.",
        action: () => {
          resetSimulation();
          ecucConfig.CanNmRemoteSleepIndEnabled = true;
          ecucConfig.CanNmRemoteSleepIndTime = 1500;
          onConfigChange("CanNmRemoteSleepIndEnabled", true);
          apiNetworkRequest();
          stepClockTick(2200); // Normal Operation (entered at 1500ms -> 800ms left)
          addTraceLog("INIT", "Precondition", "S13 Chuẩn Bị: Remote Sleep Indication = TRUE, ECU ở Normal Operation", "Bộ đếm RemoteSleep đang chạy thực tế; sẵn sàng chờ hết hạn để kích hoạt Nm_RemoteSleepIndication().");
        }
      },
      {
        api: "Bước 1: Không có gói Rx nào từ các node con -> Hết RemoteSleepIndTime",
        io: "Input: CanNm_MainFunction() -> Nm_RemoteSleepIndication() (SWS_CanNm_00150)",
        desc: "Suốt CanNmRemoteSleepIndTime không nhận được Rx từ các node con, engine thực sự đếm về 0 và tự gọi Nm_RemoteSleepIndication()!",
        action: () => {
          stepClockTick(1500);
        }
      },
      {
        api: "Bước 2: Node con bất ngờ thức dậy -> Báo Nm_RemoteSleepCancellation()",
        io: "Input: CanNm_RxIndication() -> Nm_RemoteSleepCancellation() (SWS_CanNm_00151)",
        desc: "Nhận gói Rx từ Remote Node, engine tự động hủy cờ Remote Sleep và gọi Nm_RemoteSleepCancellation()!",
        action: () => {
          apiSimulatedRxIndication();
        }
      }
    ],
    whatIf: [
      { label: "Gọi CanNm_CheckRemoteSleepIndication()", action: () => apiCheckRemoteSleepIndication() },
      { label: "Đổi RemoteSleepIndTime = 2500ms", action: () => { ecucConfig.CanNmRemoteSleepIndTime = 2500; onConfigChange("CanNmRemoteSleepIndTime", true); } },
      { label: "Tắt tính năng Remote Sleep", action: () => { ecucConfig.CanNmRemoteSleepIndEnabled = false; onConfigChange("CanNmRemoteSleepIndEnabled", true); } }
    ]
  },

  14: {
    title: "S14: Xử Lý Lỗi TxTimeoutException & Rx Tại Bus-Sleep (CANNM_E_NET_START_IND)",
    steps: [
      {
        api: "Bước 0: Chuẩn bị kịch bản & Giả lập đường truyền mất TxConfirmation",
        io: "Trạng thái sẵn sàng: NM_STATE_REPEAT_MESSAGE | MsgTimeoutTime = 500ms | Chờ TxConfirmation",
        desc: "Bật giả lập mất TxConfirmation và gọi NetworkRequest(). CanNM gửi lệnh Tx và bắt đầu chạy bộ đếm thực CanNmMsgTimeoutTime (500ms). Bấm 'Tiếp Theo ▶' để đợi hết timeout.",
        action: () => {
          resetSimulation();
          ecucConfig.CanNmPnEnabled = true;
          onConfigChange("CanNmPnEnabled", true);
          onSimTxFailToggle(true);
          apiNetworkRequest();
          addTraceLog("INIT", "Precondition", "S14 Chuẩn Bị: ECU ở Repeat Message đang chờ TxConfirmation (MsgTimeout=500ms)", "Sẵn sàng để đồng hồ đếm hết CanNmMsgTimeoutTime và tự gọi Nm_TxTimeoutException().");
        }
      },
      {
        api: "Bước 1: Đợi hết CanNmMsgTimeoutTime (500ms) -> Nm_TxTimeoutException()",
        io: "Input: stepClockTick(500) -> MsgTimeoutTimer = 0 -> TxTimeoutException (SWS_CanNm_00066/00446)",
        desc: "Sau 500ms gọi CanIf_Transmit() mà không có TxConfirmation, bộ đếm CanNmMsgTimeoutTime về 0 và tự động gọi Nm_TxTimeoutException() + CanSM_TxTimeoutException().",
        action: () => {
          stepClockTick(500);
        }
      },
      {
        api: "Bước 2: Nhận gói NM ở Bus-Sleep -> Báo CANNM_E_NET_START_IND & Nm_NetworkStartIndication()",
        io: "Input: CanNm_RxIndication() tại Bus-Sleep -> Giữ nguyên BUS_SLEEP & báo Upper Layer",
        desc: "Theo SWS_CanNm_00336 và SWS_CanNm_00127: khi nhận NM PDU ở Bus-Sleep, CanNm báo runtime error CANNM_E_NET_START_IND (0x04) và gọi Nm_NetworkStartIndication(), KHÔNG tự nhảy sang Network Mode!",
        action: () => {
          resetSimulation();
          ecucConfig.CanNmPnEnabled = false;
          onConfigChange("CanNmPnEnabled", true);
          const chkAuto = document.getElementById("simAutoPassiveOnRx");
          if (chkAuto) chkAuto.checked = false;
          apiSimulatedRxIndication();
        }
      }
    ],
    whatIf: [
      { label: "Tắt CanNmInitialized = FALSE rồi gọi API (Test CANNM_E_UNINIT)", action: () => { ecucConfig.CanNmInitialized = false; onConfigChange("CanNmInitialized", true); apiNetworkRequest(); } },
      { label: "Gửi TxConfirmation(E_OK) để giải phóng Tx Pending", action: () => apiTxConfirmationResult(true) },
      { label: "Bật lại CanNmInitialized = TRUE", action: () => { ecucConfig.CanNmInitialized = true; onConfigChange("CanNmInitialized", true); } }
    ]
  }
};
