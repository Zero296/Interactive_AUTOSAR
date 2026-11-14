// ================= PART 4A: SIMULATION ENGINE, ECUC SYNC & AUTOSAR API HANDLERS =================

const defaultConfig = {
  // Tab 0: General
  ComMInitialized: true,
  ComMDevErrorDetect: true,
  ComMVersionInfoApi: false,
  ComMModeLimitationEnabled: true,
  ComMWakeupInhibitionEnabled: true,
  ComMSynchronousWakeUp: true,
  ComMTMinFullComModeDuration: 500,
  // Tab 1: Channel & NM
  ComMChannelId: "0 - CanNetwork_Ch0",
  ComMBusType: "COMM_BUS_TYPE_CAN",
  ComMMainFunctionPeriod: 20,
  ComMNmVariant: "FULL",
  ComMNmLightTimeout: 1000,
  ComMPncNmRequest: false,
  ComMFullCommRequestNotificationEnabled: true,
  // Tab 2: Users & Arbitrate
  User0_RequestMode: "COMM_NO_COMMUNICATION",
  User1_RequestMode: "COMM_NO_COMMUNICATION",
  User2_Pnc16RequestMode: "COMM_NO_COMMUNICATION",
  ComMCommunicationAllowedFlag: true,
  ComMDcmDiagnosticActiveFlag: false,
  SimulateBusSmIndicationDelay: 20,
  // Tab 3: Inhibition & NvM
  ComMNoWakeup: false,
  ComMNoCom: false,
  GlobalLimitEcuToNoCom: false,
  ComMEcuGroupClassification: "0x03",
  ComMInhibitCounterValue: 0,
  ComMNoWakeupNvMStorage: true,
  // Tab 4: Partial Net (PNC)
  ComMPncSupport: true,
  ComMPncPrepareSleepTimer: 400,
  Pnc16_Enabled_And_Mask: true,
  Pnc18_Enabled_And_Mask: true,
  RxEiraSignalHex: "00 00",
  ComMPncWakeupSleepRequestEnabled: false,
  // Tab 5: PNC GW & Fault
  ComMPncGatewayEnabled: false,
  Ch0_GatewayType: "COMM_GATEWAY_TYPE_ACTIVE",
  Ch1_GatewayType: "COMM_GATEWAY_TYPE_PASSIVE",
  RxEraCh0Hex: "00 00",
  RxEraCh1Hex: "00 00",
  ComMSynchronizedPncShutdownEnabled: false
};

let ecucConfig = JSON.parse(JSON.stringify(defaultConfig));

function createInitialSimState() {
  return {
    clockMs: 0,
    initialized: true,
    globalLimitEcu: false,
    inhibitCounter: 0,
    nvmDirty: false,
    syncWakeupTriggered: false,
    syncShutdownSent: false,
    detFaults: [],
    users: [
      { id: 0, name: "User 0 (SWC_DiagApp)", chId: 0, pncId: null, requested: "NO_COM", current: "NO_COM" },
      { id: 1, name: "User 1 (SWC_BodyCtrl)", chId: 0, pncId: null, requested: "NO_COM", current: "NO_COM" },
      { id: 2, name: "User 2 (SWC_PncPower)", chId: 0, pncId: 16, requested: "NO_COM", current: "NO_COM" }
    ],
    channels: [
      {
        id: 0,
        mode: "COMM_NO_COMMUNICATION",
        subState: "COMM_NO_COM_NO_PENDING_REQUEST",
        actualBusSmMode: "COMM_NO_COMMUNICATION",
        pendingBusSmMode: null,
        busSmDelayLeftMs: 0,
        nmState: "NM_STATE_BUS_SLEEP",
        commAllowed: true,
        wakeupPending: false,
        dcmActive: false,
        noWakeup: false,
        limitToNoCom: false,
        tMinFullLeftMs: 0,
        nmLightLeftMs: 0,
        fullComReqActive: false
      },
      {
        id: 1,
        mode: "COMM_NO_COMMUNICATION",
        subState: "COMM_NO_COM_NO_PENDING_REQUEST",
        actualBusSmMode: "COMM_NO_COMMUNICATION",
        pendingBusSmMode: null,
        busSmDelayLeftMs: 0,
        nmState: "NM_STATE_BUS_SLEEP",
        commAllowed: true,
        wakeupPending: false,
        dcmActive: false,
        noWakeup: false,
        limitToNoCom: false,
        tMinFullLeftMs: 0,
        nmLightLeftMs: 0,
        fullComReqActive: false
      }
    ],
    pncs: {
      16: { id: 16, mask: 0x01, state: "COMM_PNC_NO_COMMUNICATION", prepSleepLeftMs: 0, channels: [0, 1], userIds: [2] },
      18: { id: 18, mask: 0x04, state: "COMM_PNC_NO_COMMUNICATION", prepSleepLeftMs: 0, channels: [0, 1], userIds: [] }
    },
    rxEiraByte2: 0x00,
    rxEiraByte3: 0x00,
    rxEraCh0Byte2: 0x00,
    rxEraCh0Byte3: 0x00,
    rxEraCh1Byte2: 0x00,
    rxEraCh1Byte3: 0x00,
    txPncByte2: 0x00,
    txPncByte3: 0x00,
    txPncCh0Byte2: 0x00,
    txPncCh1Byte2: 0x00,
    regAByte: 0x10,
    regBByte: 0x80,
    prevRegAByte: 0x10,
    prevRegBByte: 0x80,
    activeModId: "MOD_COMM",
    activeArrows: [],
    stepExplain: "Hệ thống ComM sẵn sàng. Chọn kịch bản hoặc dùng Thao Tác Nhanh để chạy thử.",
    traceLogs: []
  };
}

let simState = createInitialSimState();

function parseHexPair(str) {
  const cleaned = String(str || "00 00").trim().replace(/0x/gi, "").split(/[\s,;]+/);
  const b2 = parseInt(cleaned[0] || "0", 16);
  const b3 = parseInt(cleaned[1] || "0", 16);
  return {
    b2: Number.isFinite(b2) ? (b2 & 0xFF) : 0,
    b3: Number.isFinite(b3) ? (b3 & 0xFF) : 0
  };
}

function formatHexPair(b2, b3) {
  const h2 = (b2 & 0xFF).toString(16).toUpperCase().padStart(2, "0");
  const h3 = (b3 & 0xFF).toString(16).toUpperCase().padStart(2, "0");
  return h2 + " " + h3;
}

function getSelectedChannelId() {
  return String(ecucConfig.ComMChannelId || "").startsWith("1") ? 1 : 0;
}

function getEcuClassMask() {
  return parseInt(ecucConfig.ComMEcuGroupClassification || "0x03", 16) & 0x03;
}

function isNoWakeupEffective(ch) {
  return Boolean(ecucConfig.ComMWakeupInhibitionEnabled && ch.noWakeup && ((getEcuClassMask() & 0x01) !== 0));
}

function isLimitNoComEffective(ch) {
  return Boolean(ecucConfig.ComMModeLimitationEnabled && (ch.limitToNoCom || simState.globalLimitEcu) && ((getEcuClassMask() & 0x02) !== 0));
}

function addTraceLog(level, apiName, detail) {
  simState.traceLogs.unshift({
    t: simState.clockMs,
    level: level || "info",
    api: apiName,
    detail: detail
  });
  if (simState.traceLogs.length > 60) {
    simState.traceLogs.length = 60;
  }
}

function recordDetError(apiName, errorCode, detail) {
  if (!ecucConfig.ComMDevErrorDetect) return;
  simState.detFaults.unshift({ t: simState.clockMs, api: apiName, code: errorCode, detail: detail });
  if (simState.detFaults.length > 20) simState.detFaults.length = 20;
  simState.activeModId = "MOD_DET";
  if (!simState.activeArrows.includes("arr_comm_det")) simState.activeArrows.push("arr_comm_det");
  addTraceLog("err", "Det_ReportError(12, 0, " + apiName + ", " + errorCode + ")", detail);
}

function syncConfigToDOM() {
  Object.keys(ecucConfig).forEach((k) => {
    const el = document.getElementById("cfg_" + k);
    if (!el) return;
    if (el.type === "checkbox") {
      el.checked = Boolean(ecucConfig[k]);
    } else {
      el.value = String(ecucConfig[k]);
    }
  });
}

function validateConfigRules() {
  const alerts = [];
  if (!ecucConfig.ComMInitialized) {
    alerts.push({ err: true, msg: "ComMInitialized = FALSE (COMM_UNINIT): Mọi API gọi vào sẽ báo DET COMM_E_UNINIT!" });
  }
  if (ecucConfig.ComMPncGatewayEnabled && !ecucConfig.ComMPncSupport) {
    alerts.push({ err: true, msg: "Cấu hình không hợp lệ: ComMPncGatewayEnabled = TRUE yêu cầu ComMPncSupport = TRUE!" });
  }
  if ((ecucConfig.ComMNoCom || ecucConfig.GlobalLimitEcuToNoCom) && ((getEcuClassMask() & 0x02) === 0)) {
    alerts.push({ err: false, msg: "Cảnh báo: LimitToNoCom đang bật nhưng EcuGroupClassification Bit 1 = 0 nên lệnh Limit bị vô hiệu!" });
  }
  if (ecucConfig.ComMNoWakeup && ((getEcuClassMask() & 0x01) === 0)) {
    alerts.push({ err: false, msg: "Cảnh báo: ComMNoWakeup = TRUE nhưng EcuGroupClassification Bit 0 = 0 nên NoWakeup không tác dụng!" });
  }
  if (ecucConfig.Ch0_GatewayType === "COMM_GATEWAY_TYPE_PASSIVE" && ecucConfig.Ch1_GatewayType === "COMM_GATEWAY_TYPE_PASSIVE" && ecucConfig.ComMPncGatewayEnabled) {
    alerts.push({ err: false, msg: "Quy tắc Gateway: Cả Ch0 & Ch1 đều PASSIVE sẽ không định tuyến ERA sang nhau để tránh routing loop." });
  }
  return alerts;
}

function computePncGatewayRouting() {
  let gwOutCh0 = 0;
  let gwOutCh1 = 0;
  let gwActiveFlag = false;
  if (ecucConfig.ComMPncSupport && ecucConfig.ComMPncGatewayEnabled) {
    const ch0Type = ecucConfig.Ch0_GatewayType;
    const ch1Type = ecucConfig.Ch1_GatewayType;
    if (simState.rxEraCh0Byte2 !== 0 && ch0Type !== "COMM_GATEWAY_TYPE_NONE" && ch1Type !== "COMM_GATEWAY_TYPE_NONE") {
      if (ch0Type === "COMM_GATEWAY_TYPE_ACTIVE" || ch1Type === "COMM_GATEWAY_TYPE_ACTIVE") {
        gwOutCh1 |= simState.rxEraCh0Byte2;
        gwActiveFlag = true;
      }
    }
    if (simState.rxEraCh1Byte2 !== 0 && ch1Type !== "COMM_GATEWAY_TYPE_NONE" && ch0Type !== "COMM_GATEWAY_TYPE_NONE") {
      if (ch1Type === "COMM_GATEWAY_TYPE_ACTIVE" || ch0Type === "COMM_GATEWAY_TYPE_ACTIVE") {
        gwOutCh0 |= simState.rxEraCh1Byte2;
        gwActiveFlag = true;
      }
    }
  }
  return { gwOutCh0, gwOutCh1, gwActiveFlag };
}

function evaluatePncStateMachine(dtMs) {
  const p16 = simState.pncs[16];
  const p18 = simState.pncs[18];

  if (!ecucConfig.ComMPncSupport) {
    p16.state = "COMM_PNC_NO_COMMUNICATION";
    p16.prepSleepLeftMs = 0;
    p18.state = "COMM_PNC_NO_COMMUNICATION";
    p18.prepSleepLeftMs = 0;
    simState.txPncByte2 = 0;
    simState.txPncCh0Byte2 = 0;
    simState.txPncCh1Byte2 = 0;
    return { pncReqCh0: false, pncReqCh1: false, gwActiveFlag: false };
  }

  const gw = computePncGatewayRouting();
  const prevTx = simState.txPncByte2;
  let nextTxCh0 = 0;
  let nextTxCh1 = 0;

  [16, 18].forEach((pId) => {
    const pnc = simState.pncs[pId];
    const isEnabled = (pId === 16) ? ecucConfig.Pnc16_Enabled_And_Mask : ecucConfig.Pnc18_Enabled_And_Mask;
    if (!isEnabled) {
      pnc.state = "COMM_PNC_NO_COMMUNICATION";
      pnc.prepSleepLeftMs = 0;
      return;
    }

    const ch0 = simState.channels[0];
    const internalReq = pnc.userIds.some((uid) => {
      const u = simState.users[uid];
      return u && u.requested === "FULL_COM" && (!isLimitNoComEffective(ch0) || ch0.dcmActive) && !(ch0.mode !== "COMM_FULL_COMMUNICATION" && isNoWakeupEffective(ch0) && !ch0.dcmActive);
    });
    const gwRoutedReq = ((gw.gwOutCh0 & pnc.mask) !== 0) || ((gw.gwOutCh1 & pnc.mask) !== 0);
    const eiraOn = ((simState.rxEiraByte2 & pnc.mask) !== 0);

    if (internalReq || gwRoutedReq) {
      if (pnc.state !== "COMM_PNC_REQUESTED") {
        pnc.state = "COMM_PNC_REQUESTED";
        addTraceLog("ok", "BswM_ComM_CurrentPNCMode(" + pId + ", COMM_PNC_REQUESTED)", internalReq ? "Internal User yêu cầu PNC #" + pId : "PNC Gateway định tuyến ERA sang kênh đích");
      }
      pnc.prepSleepLeftMs = 0;
      if (internalReq) {
        nextTxCh0 |= pnc.mask;
        nextTxCh1 |= pnc.mask;
      }
      if ((gw.gwOutCh0 & pnc.mask) !== 0) nextTxCh0 |= pnc.mask;
      if ((gw.gwOutCh1 & pnc.mask) !== 0) nextTxCh1 |= pnc.mask;
    } else if (eiraOn) {
      if (pnc.state !== "COMM_PNC_READY_SLEEP") {
        pnc.state = "COMM_PNC_READY_SLEEP";
        addTraceLog("info", "BswM_ComM_CurrentPNCMode(" + pId + ", COMM_PNC_READY_SLEEP)", "Rx EIRA bit PNC #" + pId + " = 1 giữ PNC sẵn sàng nhận");
      }
      pnc.prepSleepLeftMs = 0;
    } else {
      if (pnc.state === "COMM_PNC_REQUESTED" || pnc.state === "COMM_PNC_READY_SLEEP") {
        pnc.state = "COMM_PNC_PREPARE_SLEEP";
        pnc.prepSleepLeftMs = Math.max(0, Number(ecucConfig.ComMPncPrepareSleepTimer) || 0);
        addTraceLog("warn", "PncPrepareSleepTimer Start (" + pnc.prepSleepLeftMs + " ms)", "PNC #" + pId + " vào COMM_PNC_PREPARE_SLEEP");
      } else if (pnc.state === "COMM_PNC_PREPARE_SLEEP") {
        pnc.prepSleepLeftMs = Math.max(0, pnc.prepSleepLeftMs - dtMs);
        if (pnc.prepSleepLeftMs === 0) {
          pnc.state = "COMM_PNC_NO_COMMUNICATION";
          addTraceLog("info", "BswM_ComM_CurrentPNCMode(" + pId + ", COMM_PNC_NO_COMMUNICATION)", "PncPrepareSleepTimer hết hạn cho PNC #" + pId);
          if (ecucConfig.ComMSynchronizedPncShutdownEnabled && ecucConfig.ComMPncGatewayEnabled && !simState.syncShutdownSent) {
            simState.syncShutdownSent = true;
            addTraceLog("ok", "Nm_RequestSynchronizedPncShutdown(Ch0, PNC_" + pId + ")", "Đồng bộ tắt PNC #" + pId + " xuống mạng con");
          }
        }
      }
    }
  });

  simState.txPncCh0Byte2 = nextTxCh0;
  simState.txPncCh1Byte2 = nextTxCh1;
  simState.txPncByte2 = nextTxCh0 | nextTxCh1;

  if (simState.txPncByte2 !== prevTx) {
    addTraceLog("info", "Com_SendSignal(ComMPncTxSignal, 0x" + simState.txPncByte2.toString(16).toUpperCase().padStart(2, "0") + ")", "Cập nhật PNC Bit Vector truyền ra CanNm User Data");
    if (!simState.activeArrows.includes("arr_comm_com")) simState.activeArrows.push("arr_comm_com");
  }

  const pncActiveCh0 = [16, 18].some((id) => simState.pncs[id].state !== "COMM_PNC_NO_COMMUNICATION" && (id === 16 || ((gw.gwOutCh0 & 0x04) !== 0) || simState.txPncCh0Byte2 !== 0 || ((simState.rxEiraByte2 & 0x04) !== 0)));
  const pncActiveCh1 = (p16.state !== "COMM_PNC_NO_COMMUNICATION") || ((gw.gwOutCh1 & 0x04) !== 0) || (p18.state !== "COMM_PNC_NO_COMMUNICATION" && ecucConfig.ComMPncGatewayEnabled);

  return { pncReqCh0: pncActiveCh0, pncReqCh1: pncActiveCh1, gwActiveFlag: gw.gwActiveFlag };
}

function transitionChannelToFull(ch, variant, nmRequestedByFull) {
  const prevMode = ch.mode;
  ch.mode = "COMM_FULL_COMMUNICATION";
  if (variant === "PASSIVE") {
    ch.subState = "COMM_FULL_COM_READY_SLEEP";
    ch.fullComReqActive = false;
  } else if (nmRequestedByFull) {
    ch.subState = "COMM_FULL_COM_NETWORK_REQUESTED";
    ch.fullComReqActive = true;
    if ((variant === "LIGHT" || variant === "NONE") && prevMode !== "COMM_FULL_COMMUNICATION") {
      ch.tMinFullLeftMs = Number(ecucConfig.ComMTMinFullComModeDuration) || 0;
    }
    ch.nmLightLeftMs = 0;
  } else {
    ch.subState = "COMM_FULL_COM_READY_SLEEP";
    ch.fullComReqActive = false;
    if (variant === "LIGHT" && prevMode !== "COMM_FULL_COMMUNICATION") {
      ch.nmLightLeftMs = Number(ecucConfig.ComMNmLightTimeout) || 0;
    }
  }

  if (prevMode !== "COMM_FULL_COMMUNICATION") {
    const busDelay = ch.id === 0 ? Math.max(0, Number(ecucConfig.SimulateBusSmIndicationDelay) || 0) : 0;
    ch.pendingBusSmMode = "COMM_FULL_COMMUNICATION";
    ch.busSmDelayLeftMs = busDelay;
    addTraceLog("info", "BusSM_RequestComMode(" + ch.id + ", COMM_FULL_COMMUNICATION)", "ComM ra lệnh cho CanSM mở Transceiver/Controller");
    if (!simState.activeArrows.includes("arr_comm_sm")) simState.activeArrows.push("arr_comm_sm");

    if (busDelay === 0) {
      ch.actualBusSmMode = "COMM_FULL_COMMUNICATION";
      ch.pendingBusSmMode = null;
      addTraceLog("ok", "ComM_BusSM_ModeIndication(" + ch.id + ", COMM_FULL_COMMUNICATION)", "CanSM xác nhận xong tức thì -> Cập nhật User & BswM");
    }

    if (variant === "FULL") {
      if (nmRequestedByFull) {
        ch.nmState = "NM_STATE_REPEAT_MESSAGE";
        addTraceLog("info", "Nm_NetworkRequest(" + ch.id + ")", "CanNm bắt đầu phát khung NM giữ mạng chủ động");
      } else {
        ch.nmState = "NM_STATE_READY_SLEEP";
        addTraceLog("info", "Nm_PassiveStartUp(" + ch.id + ")", "CanNm khởi động thụ động từ Passive Wakeup");
      }
      if (!simState.activeArrows.includes("arr_comm_nm")) simState.activeArrows.push("arr_comm_nm");
    } else if (variant === "PASSIVE") {
      ch.nmState = "NM_STATE_READY_SLEEP";
      addTraceLog("info", "Nm_PassiveStartUp(" + ch.id + ")", "Kênh PASSIVE chỉ khởi động thụ động, không phát NM frame");
    } else {
      ch.nmState = "NM_DISABLED (" + variant + ")";
    }
  }
}

function transitionChannelToSilent(ch, variant) {
  ch.mode = "COMM_SILENT_COMMUNICATION";
  ch.subState = "COMM_SILENT_COM";
  ch.fullComReqActive = false;
  ch.pendingBusSmMode = "COMM_SILENT_COMMUNICATION";
  ch.actualBusSmMode = "COMM_SILENT_COMMUNICATION";
  ch.busSmDelayLeftMs = 0;
  ch.nmState = "NM_STATE_PREPARE_BUS_SLEEP";
  addTraceLog("warn", "BusSM_RequestComMode(" + ch.id + ", COMM_SILENT_COMMUNICATION)", "CanNm vào PrepareBusSleepMode -> ComM chuyển SILENT_COM (chỉ Rx)");
  addTraceLog("info", "BswM_ComM_CurrentMode(" + ch.id + ", COMM_SILENT_COMMUNICATION)", "BswM tắt Tx I-PDU Group, giữ Rx");
}

function transitionChannelToNoCom(ch) {
  const prevMode = ch.mode;
  ch.mode = "COMM_NO_COMMUNICATION";
  ch.subState = "COMM_NO_COM_NO_PENDING_REQUEST";
  ch.fullComReqActive = false;
  ch.tMinFullLeftMs = 0;
  ch.nmLightLeftMs = 0;
  ch.wakeupPending = false;
  ch.nmState = "NM_STATE_BUS_SLEEP";
  if (prevMode !== "COMM_NO_COMMUNICATION") {
    ch.pendingBusSmMode = "COMM_NO_COMMUNICATION";
    ch.actualBusSmMode = "COMM_NO_COMMUNICATION";
    ch.busSmDelayLeftMs = 0;
    addTraceLog("info", "BusSM_RequestComMode(" + ch.id + ", COMM_NO_COMMUNICATION)", "ComM tắt CanIf Controller & CanTrcv về Standby/Sleep");
    addTraceLog("info", "BswM_ComM_CurrentMode(" + ch.id + ", COMM_NO_COMMUNICATION)", "BswM tắt toàn bộ Tx/Rx I-PDU Group kênh " + ch.id);
    if (!simState.activeArrows.includes("arr_comm_sm")) simState.activeArrows.push("arr_comm_sm");
  }
}

function evaluateChannelStateMachine(chId, dtMs, pncSignalReq) {
  const ch = simState.channels[chId];
  const variant = chId === 0 ? ecucConfig.ComMNmVariant : "FULL";

  // 1. Tick BusSM asynchronous confirmation delay
  if (ch.pendingBusSmMode !== null && ch.busSmDelayLeftMs > 0) {
    ch.busSmDelayLeftMs = Math.max(0, ch.busSmDelayLeftMs - dtMs);
    if (ch.busSmDelayLeftMs === 0) {
      ch.actualBusSmMode = ch.pendingBusSmMode;
      const confirmed = ch.pendingBusSmMode;
      ch.pendingBusSmMode = null;
      addTraceLog("ok", "ComM_BusSM_ModeIndication(" + ch.id + ", " + confirmed + ")", "CanSM xác nhận xong -> ComM thông báo BswM & Rte_Switch");
      if (!simState.activeArrows.includes("arr_sm_comm")) simState.activeArrows.push("arr_sm_comm");
      if (!simState.activeArrows.includes("arr_comm_bswm")) simState.activeArrows.push("arr_comm_bswm");
    }
  }

  // 2. Arbitrate channel requestors
  const directUserFull = simState.users.some((u) => u.chId === chId && u.pncId === null && u.requested === "FULL_COM");
  const effectiveLimit = isLimitNoComEffective(ch) && !ch.dcmActive;
  const effectiveNoWakeup = isNoWakeupEffective(ch) && !ch.dcmActive;

  let userWantFull = directUserFull || pncSignalReq;
  if (variant === "PASSIVE") {
    userWantFull = false; // PASSIVE channel never enters FULL_COM via local SWC request (SWS_ComM_00667)
  }
  if (effectiveLimit) {
    userWantFull = false;
  }
  if (ch.mode !== "COMM_FULL_COMMUNICATION" && effectiveNoWakeup) {
    // When PreventWakeUp is active and channel not in FULL_COM, ignore SWC active wakeups; keep passive wakeup only
    const eiraHold = ecucConfig.ComMPncSupport && ((simState.rxEiraByte2 !== 0) || (chId === 1 && simState.txPncCh1Byte2 !== 0));
    userWantFull = eiraHold;
  }

  // 3. Highest priority check: DCM or userWantFull or Passive Wakeup
  const passiveWake = ch.wakeupPending;

  if (ch.mode === "COMM_NO_COMMUNICATION") {
    if (ch.dcmActive || userWantFull || passiveWake) {
      if (!ch.commAllowed) {
        if (ch.subState !== "COMM_NO_COM_REQUEST_PENDING") {
          ch.subState = "COMM_NO_COM_REQUEST_PENDING";
          ch.wakeupPending = true;
          addTraceLog("warn", "State -> COMM_NO_COM_REQUEST_PENDING (Ch" + chId + ")", "CommunicationAllowed == FALSE -> giữ yêu cầu chờ mở khóa từ EcuM/BswM");
        }
      } else {
        ch.wakeupPending = false;
        const needNetReq = ch.dcmActive || userWantFull;
        transitionChannelToFull(ch, variant, needNetReq);
      }
    } else {
      ch.subState = "COMM_NO_COM_NO_PENDING_REQUEST";
    }
  } else if (ch.mode === "COMM_SILENT_COMMUNICATION") {
    if (ch.dcmActive || userWantFull) {
      if (!ch.commAllowed) {
        ch.subState = "COMM_NO_COM_REQUEST_PENDING";
      } else {
        transitionChannelToFull(ch, variant, true);
      }
    } else if (ch.wakeupPending) {
      ch.wakeupPending = false;
      transitionChannelToFull(ch, variant, false);
    }
  } else if (ch.mode === "COMM_FULL_COMMUNICATION") {
    if (ch.tMinFullLeftMs > 0) {
      ch.tMinFullLeftMs = Math.max(0, ch.tMinFullLeftMs - dtMs);
    }

    const mustHoldNetReq = ch.dcmActive || userWantFull || ((variant === "LIGHT" || variant === "NONE") && ch.tMinFullLeftMs > 0);
    if (mustHoldNetReq) {
      if (variant === "PASSIVE") {
        ch.subState = "COMM_FULL_COM_READY_SLEEP";
      } else {
        if (ch.subState !== "COMM_FULL_COM_NETWORK_REQUESTED") {
          ch.subState = "COMM_FULL_COM_NETWORK_REQUESTED";
          ch.nmLightLeftMs = 0;
          if (variant === "FULL") {
            ch.nmState = "NM_STATE_NORMAL_OPERATION";
            addTraceLog("info", "Nm_NetworkRequest(" + chId + ")", "Quay lại FULL_COM_NETWORK_REQUESTED");
          }
        }
        ch.fullComReqActive = true;
      }
    } else {
      // Release to READY_SLEEP or straight to NO_COM (NONE)
      if (ch.subState === "COMM_FULL_COM_NETWORK_REQUESTED") {
        if (variant === "NONE") {
          transitionChannelToNoCom(ch);
          return;
        }
        ch.subState = "COMM_FULL_COM_READY_SLEEP";
        ch.fullComReqActive = false;
        if (variant === "FULL") {
          ch.nmState = "NM_STATE_READY_SLEEP";
          addTraceLog("info", "Nm_NetworkRelease(" + chId + ")", "Hết chủ thể giữ mạng -> CanNm sang READY_SLEEP");
          if (!simState.activeArrows.includes("arr_comm_nm")) simState.activeArrows.push("arr_comm_nm");
        } else if (variant === "LIGHT") {
          ch.nmLightLeftMs = Math.max(0, Number(ecucConfig.ComMNmLightTimeout) || 0);
          addTraceLog("warn", "Start NmLightTimeout (" + ch.nmLightLeftMs + " ms)", "Kênh LIGHT vào FULL_COM_READY_SLEEP chờ hết timeout để ngủ");
        }
      } else if (ch.subState === "COMM_FULL_COM_READY_SLEEP") {
        if (variant === "LIGHT") {
          if (ch.nmLightLeftMs > 0) {
            ch.nmLightLeftMs = Math.max(0, ch.nmLightLeftMs - dtMs);
          }
          if (ch.nmLightLeftMs === 0) {
            addTraceLog("ok", "NmLightTimeout Expired (Ch" + chId + ")", "Biến thể LIGHT tắt thẳng xuống NO_COM (bỏ qua SILENT_COM)");
            transitionChannelToNoCom(ch);
          }
        }
      }
    }
  }
}

function updateUsersCurrentMode() {
  const ch0 = simState.channels[0];
  simState.users.forEach((u) => {
    u.current = (ch0.actualBusSmMode === "COMM_FULL_COMMUNICATION") ? "FULL_COM" : "NO_COM";
  });
}

function recomputeRegisters() {
  simState.prevRegAByte = simState.regAByte;
  simState.prevRegBByte = simState.regBByte;

  const ch = simState.channels[getSelectedChannelId()];
  const userFull = simState.users.some((u) => u.requested === "FULL_COM" && !isLimitNoComEffective(ch));

  let a = 0;
  if (userWantIndicator(ch, userFull)) a |= 0x80;
  if (ch.dcmActive) a |= 0x40;
  if (ch.subState === "COMM_NO_COM_REQUEST_PENDING" || ch.wakeupPending) a |= 0x20;
  if (ch.commAllowed) a |= 0x10;
  if (ch.tMinFullLeftMs > 0) a |= 0x08;
  if (ch.nmLightLeftMs > 0) a |= 0x04;
  if (ch.actualBusSmMode === "COMM_FULL_COMMUNICATION") a |= 0x02;
  if (ch.subState === "COMM_FULL_COM_NETWORK_REQUESTED") a |= 0x01;
  simState.regAByte = a;

  const gw = computePncGatewayRouting();
  const anyPrepSleep = (simState.pncs[16].state === "COMM_PNC_PREPARE_SLEEP" || simState.pncs[18].state === "COMM_PNC_PREPARE_SLEEP");
  let b = 0;
  if (simState.initialized) b |= 0x80;
  if (simState.inhibitCounter > 0) b |= 0x40;
  if (anyPrepSleep) b |= 0x20;
  if (ecucConfig.ComMPncGatewayEnabled && gw.gwActiveFlag) b |= 0x10;
  if (simState.globalLimitEcu) b |= 0x08;
  if (simState.syncWakeupTriggered) b |= 0x04;
  if (isLimitNoComEffective(ch)) b |= 0x02;
  if (isNoWakeupEffective(ch)) b |= 0x01;
  simState.regBByte = b;
}

function userWantIndicator(ch, userFull) {
  return Boolean(userFull || (ecucConfig.ComMPncSupport && simState.pncs[16].state === "COMM_PNC_REQUESTED"));
}

function runArbitrationCycle(dtMs) {
  if (!simState.initialized) {
    recomputeRegisters();
    return;
  }
  const pncRes = evaluatePncStateMachine(dtMs);
  evaluateChannelStateMachine(0, dtMs, pncRes.pncReqCh0);
  evaluateChannelStateMachine(1, dtMs, pncRes.pncReqCh1);
  updateUsersCurrentMode();
  recomputeRegisters();
}

// ================= AUTOSAR PUBLIC & CALLBACK API HANDLERS =================

function ensureInitialized(apiName) {
  if (!simState.initialized) {
    recordDetError(apiName, "COMM_E_UNINIT (0x01)", "Gọi " + apiName + " khi ComM chưa được ComM_Init()");
    return false;
  }
  return true;
}

function api_ComM_Init(initFlag) {
  simState.initialized = Boolean(initFlag);
  ecucConfig.ComMInitialized = simState.initialized;
  if (simState.initialized) {
    simState.activeModId = "MOD_COMM";
    simState.activeArrows = ["arr_ecum_comm"];
    addTraceLog("ok", "ComM_Init(&ComM_Config)", "Khởi tạo toàn bộ kênh về NO_COM_NO_PENDING_REQUEST, đọc cấu hình từ NvM");
  } else {
    addTraceLog("err", "ComM_DeInit / COMM_UNINIT", "Chuyển ComM sang trạng thái chưa khởi tạo (COMM_UNINIT)");
  }
  recomputeRegisters();
}

function api_ComM_CommunicationAllowed(chId, allowed) {
  if (!ensureInitialized("ComM_CommunicationAllowed")) return;
  simState.channels[chId].commAllowed = Boolean(allowed);
  if (chId === 0) ecucConfig.ComMCommunicationAllowedFlag = Boolean(allowed);
  simState.activeModId = "MOD_ECUM";
  simState.activeArrows = ["arr_ecum_comm"];
  addTraceLog(allowed ? "ok" : "warn", "ComM_CommunicationAllowed(" + chId + ", " + (allowed ? "TRUE" : "FALSE") + ")", allowed ? "EcuM/BswM đã mở chốt Gatekeeper cho phép giao tiếp" : "Khóa Gatekeeper CommunicationAllowed = FALSE");
  runArbitrationCycle(0);
}

function api_ComM_RequestComMode(userId, modeStr) {
  if (!ensureInitialized("ComM_RequestComMode")) return;
  if (userId < 0 || userId > 2) {
    recordDetError("ComM_RequestComMode", "COMM_E_WRONG_PARAMETERS (0x02)", "UserId=" + userId + " vượt giới hạn cấu hình!");
    return;
  }
  if (modeStr !== "FULL_COM" && modeStr !== "NO_COM") {
    recordDetError("ComM_RequestComMode", "COMM_E_WRONG_PARAMETERS (0x02)", "ComMode=" + modeStr + " không hợp lệ cho ComM_RequestComMode!");
    return;
  }

  const u = simState.users[userId];
  u.requested = modeStr;
  if (userId === 0) ecucConfig.User0_RequestMode = (modeStr === "FULL_COM" ? "COMM_FULL_COMMUNICATION" : "COMM_NO_COMMUNICATION");
  if (userId === 1) ecucConfig.User1_RequestMode = (modeStr === "FULL_COM" ? "COMM_FULL_COMMUNICATION" : "COMM_NO_COMMUNICATION");
  if (userId === 2) ecucConfig.User2_Pnc16RequestMode = (modeStr === "FULL_COM" ? "COMM_FULL_COMMUNICATION" : "COMM_NO_COMMUNICATION");

  simState.activeModId = "MOD_SWC";
  simState.activeArrows = ["arr_swc_rte", "arr_rte_comm"];

  const ch = simState.channels[u.chId];
  const fullModeStr = modeStr === "FULL_COM" ? "COMM_FULL_COMMUNICATION" : "COMM_NO_COMMUNICATION";

  if (modeStr === "FULL_COM") {
    const blockedByLimit = isLimitNoComEffective(ch) && !ch.dcmActive;
    const blockedByNoWake = (ch.mode !== "COMM_FULL_COMMUNICATION") && isNoWakeupEffective(ch) && !ch.dcmActive;
    if (blockedByLimit || blockedByNoWake) {
      simState.inhibitCounter += 1;
      ecucConfig.ComMInhibitCounterValue = simState.inhibitCounter;
      simState.nvmDirty = true;
      simState.activeArrows.push("arr_comm_nvm");
      addTraceLog("err", "ComM_RequestComMode(" + userId + ", " + fullModeStr + ") -> E_MODE_LIMITATION", (blockedByLimit ? "Bị LimitToNoCom chặn" : "Bị PreventWakeUp chặn") + "! Tăng InhibitCounter=" + simState.inhibitCounter + " & gọi NvM_SetRamBlockStatus(TRUE)");
      runArbitrationCycle(0);
      return;
    }
    if (ecucConfig.ComMNmVariant === "PASSIVE") {
      addTraceLog("warn", "ComM_RequestComMode(" + userId + ", " + fullModeStr + ")", "Kênh cấu hình PASSIVE: User không thể tự bật FULL_COM chủ động (chờ Bus Wakeup)");
    } else {
      addTraceLog("ok", "ComM_RequestComMode(" + userId + ", " + fullModeStr + ")", u.name + " yêu cầu vào FULL_COM");
    }
  } else {
    addTraceLog("info", "ComM_RequestComMode(" + userId + ", " + fullModeStr + ")", u.name + " nhả yêu cầu mạng về NO_COM");
  }

  runArbitrationCycle(0);
}

function api_ComM_EcuM_WakeUpIndication(chId) {
  if (!ensureInitialized("ComM_EcuM_WakeUpIndication")) return;
  simState.channels[chId].wakeupPending = true;
  simState.activeModId = "MOD_ECUM";
  simState.activeArrows = ["arr_ecum_comm"];
  addTraceLog("ok", "ComM_EcuM_WakeUpIndication(" + chId + ")", "Passive Wakeup từ phần cứng bus trên Ch" + chId + " (bỏ qua PreventWakeUp)");

  if (ecucConfig.ComMSynchronousWakeUp) {
    simState.syncWakeupTriggered = true;
    simState.channels.forEach((c) => {
      if (c.id !== chId) c.wakeupPending = true;
    });
    addTraceLog("info", "ComMSynchronousWakeUp Active", "Đánh thức đồng loạt Ch1 theo sự kiện Wakeup của Ch" + chId);
  }
  runArbitrationCycle(0);
}

function api_ComM_DCM_ActiveDiagnostic(chId, active) {
  if (!ensureInitialized("ComM_DCM_ActiveDiagnostic")) return;
  simState.channels[chId].dcmActive = Boolean(active);
  if (chId === 0) ecucConfig.ComMDcmDiagnosticActiveFlag = Boolean(active);
  simState.activeModId = "MOD_DCM";
  simState.activeArrows = ["arr_dcm_comm"];
  addTraceLog(active ? "warn" : "info", active ? "ComM_DCM_ActiveDiagnostic(" + chId + ")" : "ComM_DCM_InactiveDiagnostic(" + chId + ")", active ? "Quyền tối cao DCM bật: Vượt qua tất cả Mode Inhibition!" : "Phiên chẩn đoán DCM kết thúc -> nhả quyền ưu tiên");
  runArbitrationCycle(0);
}

function api_ComM_PreventWakeUp(chId, status) {
  if (!ensureInitialized("ComM_PreventWakeUp")) return;
  simState.channels[chId].noWakeup = Boolean(status);
  if (chId === 0) ecucConfig.ComMNoWakeup = Boolean(status);
  simState.activeModId = "MOD_COMM";
  if (ecucConfig.ComMNoWakeupNvMStorage) {
    simState.nvmDirty = true;
    simState.activeArrows = ["arr_comm_nvm"];
  }
  addTraceLog(status ? "warn" : "ok", "ComM_PreventWakeUp(" + chId + ", " + (status ? "TRUE" : "FALSE") + ")", status ? "Bật cờ NoWakeup (Bit 0) chặn User đánh thức từ NO_COM/SILENT_COM" : "Tắt cờ NoWakeup");
  runArbitrationCycle(0);
}

function api_ComM_LimitChannelToNoComMode(chId, status) {
  if (!ensureInitialized("ComM_LimitChannelToNoComMode")) return;
  simState.channels[chId].limitToNoCom = Boolean(status);
  if (chId === 0) ecucConfig.ComMNoCom = Boolean(status);
  simState.activeModId = "MOD_COMM";
  addTraceLog(status ? "err" : "ok", "ComM_LimitChannelToNoComMode(" + chId + ", " + (status ? "TRUE" : "FALSE") + ")", status ? "Cưỡng bức kênh Ch" + chId + " tắt về NO_COM (trừ khi có DCM)" : "Gỡ bỏ LimitChannelToNoComMode trên Ch" + chId);
  runArbitrationCycle(0);
}

function api_ComM_LimitECUToNoComMode(status) {
  if (!ensureInitialized("ComM_LimitECUToNoComMode")) return;
  simState.globalLimitEcu = Boolean(status);
  ecucConfig.GlobalLimitEcuToNoCom = Boolean(status);
  simState.activeModId = "MOD_COMM";
  addTraceLog(status ? "err" : "ok", "ComM_LimitECUToNoComMode(" + (status ? "TRUE" : "FALSE") + ")", status ? "Cưỡng bức tắt toàn bộ các kênh trên ECU về NO_COM" : "Gỡ bỏ LimitECUToNoComMode toàn cục");
  runArbitrationCycle(0);
}

function api_ComM_SetECUGroupClassification(maskStr) {
  ecucConfig.ComMEcuGroupClassification = maskStr;
  addTraceLog("info", "ComM_SetECUGroupClassification(" + maskStr + ")", "Cập nhật mặt nạ cho phép Bit 0 (NoWakeup) & Bit 1 (LimitToNoCom)");
  runArbitrationCycle(0);
}

function api_ComM_ResetInhibitCounter() {
  if (!ensureInitialized("ComM_ResetInhibitCounter")) return;
  simState.inhibitCounter = 0;
  ecucConfig.ComMInhibitCounterValue = 0;
  simState.nvmDirty = true;
  simState.activeModId = "MOD_NVM";
  simState.activeArrows = ["arr_comm_nvm"];
  addTraceLog("ok", "ComM_ResetInhibitCounter()", "Reset ComMInhibitCounter = 0 và cập nhật RAM mirror NvM");
  recomputeRegisters();
}

function api_ComM_COMCbk_RxEira(b2, b3) {
  if (!ensureInitialized("ComM_COMCbk_EIRA")) return;
  simState.rxEiraByte2 = b2 & 0xFF;
  simState.rxEiraByte3 = b3 & 0xFF;
  ecucConfig.RxEiraSignalHex = formatHexPair(simState.rxEiraByte2, simState.rxEiraByte3);
  simState.activeModId = "MOD_COM";
  simState.activeArrows = ["arr_com_comm"];
  addTraceLog("info", "ComM_COMCbk_EIRA(0x" + ecucConfig.RxEiraSignalHex + ")", "AUTOSAR COM nhận bit PNC từ mạng báo lên ComM");
  runArbitrationCycle(0);
}

function api_ComM_COMCbk_RxEra(chId, b2, b3) {
  if (!ensureInitialized("ComM_COMCbk_ERA")) return;
  if (chId === 0) {
    simState.rxEraCh0Byte2 = b2 & 0xFF;
    simState.rxEraCh0Byte3 = b3 & 0xFF;
    ecucConfig.RxEraCh0Hex = formatHexPair(simState.rxEraCh0Byte2, simState.rxEraCh0Byte3);
  } else {
    simState.rxEraCh1Byte2 = b2 & 0xFF;
    simState.rxEraCh1Byte3 = b3 & 0xFF;
    ecucConfig.RxEraCh1Hex = formatHexPair(simState.rxEraCh1Byte2, simState.rxEraCh1Byte3);
  }
  simState.activeModId = "MOD_COM";
  simState.activeArrows = ["arr_com_comm"];
  addTraceLog("info", "ComM_COMCbk_ERA_Ch" + chId + "(0x" + formatHexPair(b2, b3) + ")", "COM báo External Request Array riêng của kênh " + chId + " phục vụ PNC Gateway");
  runArbitrationCycle(0);
}

function api_ComM_Nm_NetworkStartIndication(chId) {
  if (!ensureInitialized("ComM_Nm_NetworkStartIndication")) return;
  simState.channels[chId].wakeupPending = true;
  simState.activeModId = "MOD_NM";
  simState.activeArrows = ["arr_nm_comm"];
  addTraceLog("ok", "ComM_Nm_NetworkStartIndication(" + chId + ")", "CanNm nhận gói NM từ bus đánh thức kênh " + chId + " (Passive Wakeup)");
  runArbitrationCycle(0);
}

function api_ComM_Nm_PrepareBusSleepMode(chId) {
  if (!ensureInitialized("ComM_Nm_PrepareBusSleepMode")) return;
  const ch = simState.channels[chId];
  const variant = chId === 0 ? ecucConfig.ComMNmVariant : "FULL";
  if (variant !== "FULL" && variant !== "PASSIVE") {
    addTraceLog("warn", "ComM_Nm_PrepareBusSleepMode(" + chId + ") Ignored", "Biến thể " + variant + " không hỗ trợ SILENT_COMMUNICATION");
    return;
  }
  if (ch.subState === "COMM_FULL_COM_READY_SLEEP") {
    simState.activeModId = "MOD_NM";
    simState.activeArrows = ["arr_nm_comm"];
    transitionChannelToSilent(ch, variant);
    updateUsersCurrentMode();
    recomputeRegisters();
  } else {
    addTraceLog("warn", "ComM_Nm_PrepareBusSleepMode(" + chId + ") Ignored", "Kênh phải ở FULL_COM_READY_SLEEP mới xuống được SILENT_COM");
  }
}

function api_ComM_Nm_BusSleepMode(chId) {
  if (!ensureInitialized("ComM_Nm_BusSleepMode")) return;
  const ch = simState.channels[chId];
  simState.activeModId = "MOD_NM";
  simState.activeArrows = ["arr_nm_comm"];
  addTraceLog("ok", "ComM_Nm_BusSleepMode(" + chId + ")", "CanNm hết WaitBusSleepTime -> ComM chuyển dứt điểm về NO_COM");
  transitionChannelToNoCom(ch);
  updateUsersCurrentMode();
  recomputeRegisters();
}

function stepClockTick(dtMs) {
  const step = Number(dtMs) || Number(ecucConfig.ComMMainFunctionPeriod) || 20;
  simState.clockMs += step;
  simState.activeArrows = [];
  if (!simState.initialized) {
    recordDetError("ComM_MainFunction_0", "COMM_E_UNINIT (0x01)", "Tick tại " + simState.clockMs + "ms thất bại do ComM chưa Init");
  } else {
    runArbitrationCycle(step);
  }
  if (typeof renderAll === "function") renderAll();
}

function onConfigInputChanged(key) {
  const el = document.getElementById("cfg_" + key);
  if (!el) return;
  const val = el.type === "checkbox" ? el.checked : (el.type === "number" ? Number(el.value) : el.value);
  ecucConfig[key] = val;

  if (key === "ComMInitialized") api_ComM_Init(val);
  else if (key === "User0_RequestMode") api_ComM_RequestComMode(0, val === "COMM_FULL_COMMUNICATION" ? "FULL_COM" : "NO_COM");
  else if (key === "User1_RequestMode") api_ComM_RequestComMode(1, val === "COMM_FULL_COMMUNICATION" ? "FULL_COM" : "NO_COM");
  else if (key === "User2_Pnc16RequestMode") api_ComM_RequestComMode(2, val === "COMM_FULL_COMMUNICATION" ? "FULL_COM" : "NO_COM");
  else if (key === "ComMCommunicationAllowedFlag") api_ComM_CommunicationAllowed(0, val);
  else if (key === "ComMDcmDiagnosticActiveFlag") api_ComM_DCM_ActiveDiagnostic(0, val);
  else if (key === "ComMNoWakeup") api_ComM_PreventWakeUp(0, val);
  else if (key === "ComMNoCom") api_ComM_LimitChannelToNoComMode(0, val);
  else if (key === "GlobalLimitEcuToNoCom") api_ComM_LimitECUToNoComMode(val);
  else if (key === "ComMEcuGroupClassification") api_ComM_SetECUGroupClassification(val);
  else if (key === "ComMInhibitCounterValue") {
    simState.inhibitCounter = Math.max(0, Number(val) || 0);
    recomputeRegisters();
  } else if (key === "RxEiraSignalHex") {
    const p = parseHexPair(val);
    api_ComM_COMCbk_RxEira(p.b2, p.b3);
  } else if (key === "RxEraCh0Hex") {
    const p = parseHexPair(val);
    api_ComM_COMCbk_RxEra(0, p.b2, p.b3);
  } else if (key === "RxEraCh1Hex") {
    const p = parseHexPair(val);
    api_ComM_COMCbk_RxEra(1, p.b2, p.b3);
  } else {
    runArbitrationCycle(0);
  }

  simState.stepExplain = "Đã thay đổi cấu hình ECUC: " + key + " = " + String(val);
  if (typeof renderAll === "function") renderAll();
}
