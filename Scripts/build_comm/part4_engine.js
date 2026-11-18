// ================= PART 4A: SIMULATION ENGINE, ECUC SYNC & AUTOSAR R25-11 API HANDLERS =================

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
  ComMCommunicationAllowedFlag: false, // SWS_ComM_00884: mặc định FALSE sau ComM_Init()
  ComMDcmDiagnosticActiveFlag: false,
  SimulateBusSmIndicationDelay: 20,
  // Tab 3: Inhibition & NvM
  ComMNoWakeup: false,
  ComMNoCom: false,
  GlobalLimitEcuToNoCom: false,
  ComMEcuGroupClassification: "0x03",
  ComMInhibitCounterValue: 0,
  ComMNoWakeUpInhibitionNvmStorage: true, // ECUC_ComM_00789
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
        dcmNotifiedMode: "COMM_NO_COMMUNICATION",
        nmState: "NM_STATE_BUS_SLEEP",
        commAllowed: false, // SWS_ComM_00884
        wakeupPending: false,
        passiveWakeupSource: false,
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
        dcmNotifiedMode: "COMM_NO_COMMUNICATION",
        nmState: "NM_STATE_BUS_SLEEP",
        commAllowed: false, // SWS_ComM_00884
        wakeupPending: false,
        passiveWakeupSource: false,
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
    regAByte: 0x00,
    regBByte: 0x80,
    prevRegAByte: 0x00,
    prevRegBByte: 0x80,
    activeModId: "MOD_COMM",
    activeArrows: [],
    stepExplain: "Hệ thống ComM đã ComM_Init() (CommunicationAllowed = FALSE theo SWS_ComM_00884). Chọn kịch bản hoặc dùng Thao Tác Nhanh để chạy thử.",
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

function getBusSmPrefix(chId) {
  const bus = chId === 0 ? ecucConfig.ComMBusType : "COMM_BUS_TYPE_CAN";
  if (bus === "COMM_BUS_TYPE_INTERNAL") return null; // SWS_ComM_00664
  if (bus === "COMM_BUS_TYPE_ETH") return "EthSM";
  if (bus === "COMM_BUS_TYPE_FR") return "FrSM";
  if (bus === "COMM_BUS_TYPE_LIN") return "LinSM";
  return "CanSM";
}

function isInternalBus(chId) {
  return chId === 0 && ecucConfig.ComMBusType === "COMM_BUS_TYPE_INTERNAL";
}

function getEcuClassMask() {
  return parseInt(ecucConfig.ComMEcuGroupClassification || "0x03", 16) & 0x03;
}

function isNoWakeupEffective(ch) {
  return Boolean(ecucConfig.ComMWakeupInhibitionEnabled && ch.noWakeup);
}

function isLimitNoComEffective(ch) {
  return Boolean(ecucConfig.ComMModeLimitationEnabled && (ch.limitToNoCom || simState.globalLimitEcu));
}

function addTraceLog(level, apiName, detail) {
  simState.traceLogs.unshift({
    t: simState.clockMs,
    level: level || "info",
    api: apiName,
    detail: detail
  });
  if (simState.traceLogs.length > 70) {
    simState.traceLogs.length = 70;
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
    alerts.push({ err: true, msg: "ComMInitialized = FALSE (COMM_UNINIT): Mọi API gọi vào sẽ báo DET COMM_E_UNINIT (0x01)!" });
  }
  if (ecucConfig.ComMPncGatewayEnabled && !ecucConfig.ComMPncSupport) {
    alerts.push({ err: true, msg: "Cấu hình không hợp lệ: ComMPncGatewayEnabled = TRUE yêu cầu ComMPncSupport = TRUE!" });
  }
  if ((getEcuClassMask() & 0x02) === 0) {
    alerts.push({ err: false, msg: "Classification Bit 1 = 0: Lệnh gọi mới ComM_LimitChannel/ECUToNoComMode sẽ trả E_NOT_OK (SWS_ComM_01103), nhưng cờ đã bật trước đó vẫn giữ hiệu lực." });
  }
  if ((getEcuClassMask() & 0x01) === 0) {
    alerts.push({ err: false, msg: "Classification Bit 0 = 0: Lệnh gọi mới ComM_PreventWakeUp() sẽ trả E_NOT_OK (SWS_ComM_01102), nhưng cờ đã bật trước đó vẫn giữ hiệu lực." });
  }
  if (ecucConfig.Ch0_GatewayType === "COMM_GATEWAY_TYPE_PASSIVE" && ecucConfig.Ch1_GatewayType === "COMM_GATEWAY_TYPE_PASSIVE" && ecucConfig.ComMPncGatewayEnabled) {
    alerts.push({ err: false, msg: "Quy tắc Gateway (SWS_ComM_01079): Cả Ch0 & Ch1 đều PASSIVE sẽ không định tuyến ERA sang nhau để tránh routing loop." });
  }
  if (isInternalBus(0) && ecucConfig.ComMNmVariant !== "NONE") {
    alerts.push({ err: false, msg: "SWS_ComM_00664: COMM_BUS_TYPE_INTERNAL không có <Bus>SM bên dưới; thường đi cùng ComMNmVariant = NONE." });
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

function notifyDcmMode(ch, newMode) {
  if (ch.dcmNotifiedMode === newMode) return;
  ch.dcmNotifiedMode = newMode;
  if (!simState.activeArrows.includes("arr_comm_dcm")) simState.activeArrows.push("arr_comm_dcm");
  if (newMode === "COMM_FULL_COMMUNICATION") {
    addTraceLog("info", "Dcm_ComM_FullComModeEntered(" + ch.id + ")", "Báo DCM kênh Ch" + ch.id + " đã đạt FULL_COM hoàn tất (SWS_ComM_00266)");
  } else if (newMode === "COMM_SILENT_COMMUNICATION") {
    addTraceLog("info", "Dcm_ComM_SilentComModeEntered(" + ch.id + ")", "Báo DCM kênh Ch" + ch.id + " đang ở SILENT_COM");
  } else {
    addTraceLog("info", "Dcm_ComM_NoComModeEntered(" + ch.id + ")", "Báo DCM kênh Ch" + ch.id + " đã tắt về NO_COM");
  }
}

function evaluatePncStateMachine(dtMs, runPncTransitions) {
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
  const prevTxCh0 = simState.txPncCh0Byte2;
  const prevTxCh1 = simState.txPncCh1Byte2;
  let nextTxCh0 = 0;
  let nextTxCh1 = 0;
  const ch0 = simState.channels[0];
  let pncEnteredRequestedOnCh0 = false;

  [16, 18].forEach((pId) => {
    const pnc = simState.pncs[pId];
    const isEnabled = (pId === 16) ? ecucConfig.Pnc16_Enabled_And_Mask : ecucConfig.Pnc18_Enabled_And_Mask;
    if (!isEnabled) {
      pnc.state = "COMM_PNC_NO_COMMUNICATION";
      pnc.prepSleepLeftMs = 0;
      return;
    }

    const internalReq = pnc.userIds.some((uid) => {
      const u = simState.users[uid];
      return u && u.requested === "FULL_COM" && (!isLimitNoComEffective(ch0) || ch0.dcmActive) && !(ch0.mode !== "COMM_FULL_COMMUNICATION" && isNoWakeupEffective(ch0) && !ch0.dcmActive);
    });
    const gwRoutedReq = ((gw.gwOutCh0 & pnc.mask) !== 0) || ((gw.gwOutCh1 & pnc.mask) !== 0);
    const eiraOn = ((simState.rxEiraByte2 & pnc.mask) !== 0);

    // SWS_ComM_00978: transitions caused by ComM_RequestComMode() execute only inside ComM_MainFunction()
    if (runPncTransitions) {
      if (internalReq || gwRoutedReq) {
        if (pnc.state !== "COMM_PNC_REQUESTED") {
          pnc.state = "COMM_PNC_REQUESTED";
          pncEnteredRequestedOnCh0 = true;
          const bswmMode = ecucConfig.ComMPncWakeupSleepRequestEnabled ? "COMM_PNC_REQUESTED_WAKEUP" : "COMM_PNC_REQUESTED";
          addTraceLog("ok", "BswM_ComM_CurrentPNCMode(" + pId + ", " + bswmMode + ")", (internalReq ? "Internal User" : "PNC Gateway ERA") + " kích hoạt PNC #" + pId + " (SWS_ComM_00932/00978)");
          if (!simState.activeArrows.includes("arr_comm_bswm")) simState.activeArrows.push("arr_comm_bswm");
        }
        pnc.prepSleepLeftMs = 0;
      } else {
        // SWS_ComM_00938: rời COMM_PNC_REQUESTED PHẢI chuyển sang COMM_PNC_READY_SLEEP trước khi xét PREPARE_SLEEP!
        if (pnc.state === "COMM_PNC_REQUESTED") {
          pnc.state = "COMM_PNC_READY_SLEEP";
          addTraceLog("info", "BswM_ComM_CurrentPNCMode(" + pId + ", COMM_PNC_READY_SLEEP)", "Rời PNC_REQUESTED -> vào PNC_READY_SLEEP trước, xóa IRA bit=0 & nhả kênh (SWS_ComM_00938)");
          if (!simState.activeArrows.includes("arr_comm_bswm")) simState.activeArrows.push("arr_comm_bswm");
          if (ecucConfig.ComMSynchronizedPncShutdownEnabled && ecucConfig.ComMPncGatewayEnabled && !simState.syncShutdownSent) {
            simState.syncShutdownSent = true;
            addTraceLog("ok", "Nm_RequestSynchronizedPncShutdown(Ch0/Ch1, PNC_" + pId + ")", "Top-Level Coordinator phát Synchronized PNC Shutdown khi release PNC #" + pId + " (SWS_ComM_01083)");
            if (!simState.activeArrows.includes("arr_comm_nm")) simState.activeArrows.push("arr_comm_nm");
          }
        }

        if (eiraOn) {
          if (pnc.state !== "COMM_PNC_READY_SLEEP") {
            pnc.state = "COMM_PNC_READY_SLEEP";
            const bswmWakeMode = ecucConfig.ComMPncWakeupSleepRequestEnabled ? "COMM_PNC_READY_SLEEP (WakeupSleepReq)" : "COMM_PNC_READY_SLEEP";
            addTraceLog("info", "BswM_ComM_CurrentPNCMode(" + pId + ", " + bswmWakeMode + ")", "Rx EIRA bit PNC #" + pId + " = 1 từ NmIf giữ PNC ở READY_SLEEP (SWS_ComM_00940)");
            if (!simState.activeArrows.includes("arr_comm_bswm")) simState.activeArrows.push("arr_comm_bswm");
          }
          pnc.prepSleepLeftMs = 0;
        } else {
          if (pnc.state === "COMM_PNC_READY_SLEEP") {
            pnc.state = "COMM_PNC_PREPARE_SLEEP";
            pnc.prepSleepLeftMs = Math.max(0, Number(ecucConfig.ComMPncPrepareSleepTimer) || 0);
            addTraceLog("warn", "PncPrepareSleepTimer Start (" + pnc.prepSleepLeftMs + " ms)", "EIRA = 0 -> PNC #" + pId + " từ READY_SLEEP sang COMM_PNC_PREPARE_SLEEP (SWS_ComM_00952)");
            addTraceLog("info", "BswM_ComM_CurrentPNCMode(" + pId + ", COMM_PNC_PREPARE_SLEEP)", "Thông báo BswM chuyển pha chuẩn bị ngủ PNC #" + pId);
            if (!simState.activeArrows.includes("arr_comm_bswm")) simState.activeArrows.push("arr_comm_bswm");
          } else if (pnc.state === "COMM_PNC_PREPARE_SLEEP") {
            pnc.prepSleepLeftMs = Math.max(0, pnc.prepSleepLeftMs - dtMs);
            if (pnc.prepSleepLeftMs === 0) {
              pnc.state = "COMM_PNC_NO_COMMUNICATION";
              addTraceLog("info", "BswM_ComM_CurrentPNCMode(" + pId + ", COMM_PNC_NO_COMMUNICATION)", "PncPrepareSleepTimer hết hạn cho PNC #" + pId + " -> BswM tắt I-PDU Group (SWS_ComM_00947)");
              if (!simState.activeArrows.includes("arr_comm_bswm")) simState.activeArrows.push("arr_comm_bswm");
            }
          }
        }
      }
    }

    if (pnc.state === "COMM_PNC_REQUESTED") {
      if (internalReq) {
        nextTxCh0 |= pnc.mask;
        nextTxCh1 |= pnc.mask;
      }
      if ((gw.gwOutCh0 & pnc.mask) !== 0) nextTxCh0 |= pnc.mask;
      if ((gw.gwOutCh1 & pnc.mask) !== 0) nextTxCh1 |= pnc.mask;
    }
  });

  simState.txPncCh0Byte2 = nextTxCh0;
  simState.txPncCh1Byte2 = nextTxCh1;
  simState.txPncByte2 = nextTxCh0 | nextTxCh1;

  // SWS_ComM_01062: ComM trao đổi IRA trực tiếp với NmIf qua Nm_UpdateIRA()
  if (nextTxCh0 !== prevTxCh0) {
    addTraceLog("info", "Nm_UpdateIRA(Ch0, 0x" + nextTxCh0.toString(16).toUpperCase().padStart(2, "0") + ")", "Cập nhật Internal Request Array (IRA) kênh Ch0 trực tiếp xuống NmIf (SWS_ComM_01062)");
    if (!simState.activeArrows.includes("arr_comm_nm")) simState.activeArrows.push("arr_comm_nm");
  }
  if (nextTxCh1 !== prevTxCh1) {
    addTraceLog("info", "Nm_UpdateIRA(Ch1, 0x" + nextTxCh1.toString(16).toUpperCase().padStart(2, "0") + ")", "Cập nhật Internal Request Array (IRA) kênh Ch1 trực tiếp xuống NmIf (SWS_ComM_01062)");
    if (!simState.activeArrows.includes("arr_comm_nm")) simState.activeArrows.push("arr_comm_nm");
  }

  // SWS_ComM_00980: ComMPncNmRequest = TRUE -> gọi Nm_NetworkRequest() ngay cả khi kênh đã ở FULL_COM
  if (ecucConfig.ComMPncNmRequest && pncEnteredRequestedOnCh0 && ch0.mode === "COMM_FULL_COMMUNICATION" && ecucConfig.ComMNmVariant === "FULL") {
    addTraceLog("ok", "Nm_NetworkRequest(0) [ComMPncNmRequest]", "PNC mới vào COMM_PNC_REQUESTED trên kênh đang FULL_COM -> ép NM phát ngay PNC vector (SWS_ComM_00980)");
    if (!simState.activeArrows.includes("arr_comm_nm")) simState.activeArrows.push("arr_comm_nm");
  }

  // SWS_ComM_01069 / SWS_ComM_01086: PNC CHỈ xin FULL_COM trên các kênh khi đang ở COMM_PNC_REQUESTED!
  const pncActiveCh0 = (p16.state === "COMM_PNC_REQUESTED") || ((nextTxCh0 & 0x04) !== 0);
  const pncActiveCh1 = (p16.state === "COMM_PNC_REQUESTED") || ((nextTxCh1 & 0x04) !== 0);

  return { pncReqCh0: pncActiveCh0, pncReqCh1: pncActiveCh1, gwActiveFlag: gw.gwActiveFlag };
}

function transitionChannelToFull(ch, variant, activeRequestor, isPassiveWakeup) {
  const prevMode = ch.mode;
  const smPrefix = getBusSmPrefix(ch.id);
  const effectiveActive = activeRequestor && variant !== "PASSIVE" && variant !== "SLAVE_PASSIVE";

  ch.mode = "COMM_FULL_COMMUNICATION";
  // SWS_ComM_00880 / 00888 / 00915 / 01017: Tất cả các đường thức từ NO_COM (kể cả Passive Wakeup) đều qua COMM_FULL_COM_NETWORK_REQUESTED trước
  ch.subState = "COMM_FULL_COM_NETWORK_REQUESTED";
  ch.fullComReqActive = effectiveActive;

  if (prevMode !== "COMM_FULL_COMMUNICATION") {
    if (smPrefix === null) {
      // SWS_ComM_00664: COMM_BUS_TYPE_INTERNAL không gọi <Bus>SM_RequestComMode
      ch.pendingBusSmMode = null;
      ch.busSmDelayLeftMs = 0;
      ch.actualBusSmMode = "COMM_FULL_COMMUNICATION";
      addTraceLog("ok", "INTERNAL Bus -> FULL_COM (No <Bus>SM)", "SWS_ComM_00664: Kênh COMM_BUS_TYPE_INTERNAL không có <Bus>SM bên dưới -> xác nhận mode tức thì");
      addTraceLog("info", "BswM_ComM_CurrentMode(" + ch.id + ", COMM_FULL_COMMUNICATION)", "Thông báo BswM bật I-PDU nội bộ & Rte_Switch(FULL_COM)");
      notifyDcmMode(ch, "COMM_FULL_COMMUNICATION");
      if (!simState.activeArrows.includes("arr_comm_bswm")) simState.activeArrows.push("arr_comm_bswm");
    } else {
      const busDelay = ch.id === 0 ? Math.max(0, Number(ecucConfig.SimulateBusSmIndicationDelay) || 0) : 0;
      ch.pendingBusSmMode = "COMM_FULL_COMMUNICATION";
      ch.busSmDelayLeftMs = busDelay;
      addTraceLog("info", smPrefix + "_RequestComMode(" + ch.id + ", COMM_FULL_COMMUNICATION)", "ComM yêu cầu " + smPrefix + " bật Transceiver/Controller");
      if (!simState.activeArrows.includes("arr_comm_sm")) simState.activeArrows.push("arr_comm_sm");

      if (busDelay === 0) {
        ch.actualBusSmMode = "COMM_FULL_COMMUNICATION";
        ch.pendingBusSmMode = null;
        addTraceLog("ok", "ComM_" + smPrefix + "_ModeIndication(" + ch.id + ", COMM_FULL_COMMUNICATION)", smPrefix + " truyền mode by-value (SWS_ComM_00675) -> Cập nhật BswM, DCM & Rte_Switch");
        addTraceLog("info", "BswM_ComM_CurrentMode(" + ch.id + ", COMM_FULL_COMMUNICATION)", "BswM bật nhóm Tx/Rx I-PDU cho Ch" + ch.id);
        notifyDcmMode(ch, "COMM_FULL_COMMUNICATION");
        if (!simState.activeArrows.includes("arr_comm_bswm")) simState.activeArrows.push("arr_comm_bswm");
      }
    }

    if (variant === "FULL") {
      if (effectiveActive && !isPassiveWakeup) {
        ch.nmState = "NM_STATE_REPEAT_MESSAGE";
        addTraceLog("info", "Nm_NetworkRequest(" + ch.id + ")", "CanNm bắt đầu phát khung NM giữ mạng chủ động (SWS_ComM_00869)");
      } else {
        ch.nmState = "NM_STATE_READY_SLEEP";
        addTraceLog("info", "Nm_PassiveStartUp(" + ch.id + ")", "Passive Wakeup qua FULL_COM_NETWORK_REQUESTED -> gọi Nm_PassiveStartUp (SWS_ComM_00665/00902)");
      }
      if (!simState.activeArrows.includes("arr_comm_nm")) simState.activeArrows.push("arr_comm_nm");
    } else if (variant === "PASSIVE") {
      ch.nmState = "NM_STATE_READY_SLEEP";
      addTraceLog("info", "Nm_PassiveStartUp(" + ch.id + ")", "Biến thể PASSIVE gọi Nm_PassiveStartUp khi qua NETWORK_REQUESTED (SWS_ComM_00915)");
      if (!simState.activeArrows.includes("arr_comm_nm")) simState.activeArrows.push("arr_comm_nm");
    } else {
      ch.nmState = "NM_DISABLED (" + variant + ")";
    }
  }

  // Khởi động TMinFull nếu là LIGHT hoặc NONE (trừ PASSIVE/SLAVE không chạy timer hay khi vừa LimitToNoCom)
  if ((variant === "LIGHT" || variant === "NONE") && effectiveActive && prevMode !== "COMM_FULL_COMMUNICATION") {
    ch.tMinFullLeftMs = Math.max(0, Number(ecucConfig.ComMTMinFullComModeDuration) || 0);
  }
  ch.nmLightLeftMs = 0;

  // Nếu không có chủ thể giữ chủ động (tức Passive Wakeup thuần túy hoặc biến thể PASSIVE / SLAVE_PASSIVE) -> chuyển sang FULL_COM_READY_SLEEP (SWS_ComM_00888 / 00915)
  if (!effectiveActive || isPassiveWakeup) {
    ch.subState = "COMM_FULL_COM_READY_SLEEP";
    ch.fullComReqActive = false;
    addTraceLog("info", "State -> COMM_FULL_COM_READY_SLEEP (Ch" + ch.id + ")", "Không có User/DCM giữ chủ động -> chuyển từ NETWORK_REQUESTED sang READY_SLEEP (SWS_ComM_00888/00915)");
    if (variant === "LIGHT") {
      ch.nmLightLeftMs = Math.max(0, Number(ecucConfig.ComMNmLightTimeout) || 0);
    }
  }
}

function transitionChannelToSilent(ch) {
  const smPrefix = getBusSmPrefix(ch.id);
  ch.mode = "COMM_SILENT_COMMUNICATION";
  ch.subState = "COMM_SILENT_COM";
  ch.fullComReqActive = false;
  ch.nmState = "NM_STATE_PREPARE_BUS_SLEEP";
  ch.pendingBusSmMode = null;
  ch.actualBusSmMode = "COMM_SILENT_COMMUNICATION";
  ch.busSmDelayLeftMs = 0;
  if (smPrefix) {
    addTraceLog("warn", smPrefix + "_RequestComMode(" + ch.id + ", COMM_SILENT_COMMUNICATION)", "CanNm vào PrepareBusSleepMode -> ComM chuyển SILENT_COM (chỉ Rx)");
  }
  addTraceLog("info", "BswM_ComM_CurrentMode(" + ch.id + ", COMM_SILENT_COMMUNICATION)", "BswM tắt Tx I-PDU Group, giữ Rx");
  notifyDcmMode(ch, "COMM_SILENT_COMMUNICATION");
  if (!simState.activeArrows.includes("arr_comm_bswm")) simState.activeArrows.push("arr_comm_bswm");
}

function transitionChannelToNoCom(ch) {
  const prevMode = ch.mode;
  const smPrefix = getBusSmPrefix(ch.id);
  ch.mode = "COMM_NO_COMMUNICATION";
  ch.subState = "COMM_NO_COM_NO_PENDING_REQUEST";
  ch.fullComReqActive = false;
  ch.tMinFullLeftMs = 0;
  ch.nmLightLeftMs = 0;
  ch.wakeupPending = false;
  ch.passiveWakeupSource = false;
  ch.nmState = "NM_STATE_BUS_SLEEP";
  if (prevMode !== "COMM_NO_COMMUNICATION") {
    ch.pendingBusSmMode = null;
    ch.actualBusSmMode = "COMM_NO_COMMUNICATION";
    ch.busSmDelayLeftMs = 0;
    if (smPrefix) {
      addTraceLog("info", smPrefix + "_RequestComMode(" + ch.id + ", COMM_NO_COMMUNICATION)", "ComM tắt " + smPrefix + " Controller & Transceiver về Standby/Sleep");
      if (!simState.activeArrows.includes("arr_comm_sm")) simState.activeArrows.push("arr_comm_sm");
    }
    addTraceLog("info", "BswM_ComM_CurrentMode(" + ch.id + ", COMM_NO_COMMUNICATION)", "BswM tắt toàn bộ Tx/Rx I-PDU Group kênh " + ch.id);
    notifyDcmMode(ch, "COMM_NO_COMMUNICATION");
    if (!simState.activeArrows.includes("arr_comm_bswm")) simState.activeArrows.push("arr_comm_bswm");
  }
}

function evaluateChannelStateMachine(chId, dtMs, pncSignalReq) {
  const ch = simState.channels[chId];
  const variant = chId === 0 ? ecucConfig.ComMNmVariant : "FULL";
  const smPrefix = getBusSmPrefix(chId);

  // 1. Tick BusSM asynchronous confirmation delay
  if (ch.pendingBusSmMode !== null && ch.busSmDelayLeftMs > 0) {
    ch.busSmDelayLeftMs = Math.max(0, ch.busSmDelayLeftMs - dtMs);
    if (ch.busSmDelayLeftMs === 0) {
      ch.actualBusSmMode = ch.pendingBusSmMode;
      const confirmed = ch.pendingBusSmMode;
      ch.pendingBusSmMode = null;
      if (smPrefix) {
        addTraceLog("ok", "ComM_" + smPrefix + "_ModeIndication(" + ch.id + ", " + confirmed + ")", smPrefix + " xác nhận by-value (SWS_ComM_00675) -> cập nhật BswM, DCM & Rte_Switch");
        if (!simState.activeArrows.includes("arr_sm_comm")) simState.activeArrows.push("arr_sm_comm");
      }
      addTraceLog("info", "BswM_ComM_CurrentMode(" + ch.id + ", " + confirmed + ")", "BswM kích hoạt Tx/Rx I-PDU cho Ch" + ch.id);
      notifyDcmMode(ch, confirmed);
      if (!simState.activeArrows.includes("arr_comm_bswm")) simState.activeArrows.push("arr_comm_bswm");
    }
  }

  // 2. Arbitrate channel requestors
  const directUserFull = simState.users.some((u) => u.chId === chId && u.pncId === null && u.requested === "FULL_COM");
  const effectiveLimit = isLimitNoComEffective(ch) && !ch.dcmActive;
  const effectiveNoWakeup = isNoWakeupEffective(ch) && !ch.dcmActive;

  // SWS_ComM_00667 / 01017: PASSIVE & SLAVE_PASSIVE không nhận request chủ động từ User hay DCM
  const isPassiveVariant = (variant === "PASSIVE" || variant === "SLAVE_PASSIVE");
  const dcmActiveAllowed = ch.dcmActive && !isPassiveVariant;

  let userWantFull = directUserFull || pncSignalReq;
  if (isPassiveVariant || effectiveLimit) {
    userWantFull = false;
  }
  if (ch.mode !== "COMM_FULL_COMMUNICATION" && effectiveNoWakeup) {
    // SWS_ComM_00218 / 00839: PreventWakeUp giữ user request nhưng chặn kích hoạt từ NO_COM / SILENT_COM (chỉ cho phép Passive Wakeup)
    userWantFull = false;
  }

  // SWS_ComM_00890: Nếu Limit to NO_COM có hiệu lực (và không có DCM), hủy TMinFullComModeDuration ngay lập tức
  if (effectiveLimit && ch.tMinFullLeftMs > 0) {
    ch.tMinFullLeftMs = 0;
    addTraceLog("warn", "TMinFullCom Cancelled (SWS_ComM_00890)", "Limit to NO_COM hủy ngay Timer TMinFullComModeDuration trên Ch" + chId);
  }

  const passiveWake = ch.wakeupPending;

  if (ch.mode === "COMM_NO_COMMUNICATION") {
    if (dcmActiveAllowed || userWantFull || passiveWake) {
      if (!ch.commAllowed) {
        if (ch.subState !== "COMM_NO_COM_REQUEST_PENDING") {
          ch.subState = "COMM_NO_COM_REQUEST_PENDING";
          addTraceLog("warn", "State -> COMM_NO_COM_REQUEST_PENDING (Ch" + chId + ")", "CommunicationAllowed == FALSE (SWS_ComM_00895) -> đợi mở khóa từ EcuM/BswM");
        }
      } else {
        const activeReq = dcmActiveAllowed || userWantFull;
        const onlyPassive = !activeReq && passiveWake;
        ch.wakeupPending = false;
        ch.passiveWakeupSource = false;
        transitionChannelToFull(ch, variant, activeReq, onlyPassive);
      }
    } else {
      ch.subState = "COMM_NO_COM_NO_PENDING_REQUEST";
    }
  } else if (ch.mode === "COMM_SILENT_COMMUNICATION") {
    // SWS_ComM_00896: Khi đang ở SILENT_COM, ComM BỎ QUA trạng thái CommunicationAllowed!
    if (dcmActiveAllowed || userWantFull) {
      ch.wakeupPending = false;
      ch.passiveWakeupSource = false;
      transitionChannelToFull(ch, variant, true, false);
    } else if (ch.wakeupPending) {
      ch.wakeupPending = false;
      ch.passiveWakeupSource = false;
      transitionChannelToFull(ch, variant, false, true);
    }
  } else if (ch.mode === "COMM_FULL_COMMUNICATION") {
    if (ch.tMinFullLeftMs > 0) {
      ch.tMinFullLeftMs = Math.max(0, ch.tMinFullLeftMs - dtMs);
    }

    const holdTMin = (variant === "LIGHT" || variant === "NONE") && !effectiveLimit && ch.tMinFullLeftMs > 0;
    const mustHoldNetReq = dcmActiveAllowed || userWantFull || holdTMin;

    if (mustHoldNetReq) {
      if (ch.subState !== "COMM_FULL_COM_NETWORK_REQUESTED") {
        ch.subState = "COMM_FULL_COM_NETWORK_REQUESTED";
        ch.nmLightLeftMs = 0;
        if (variant === "FULL") {
          ch.nmState = "NM_STATE_NORMAL_OPERATION";
          addTraceLog("info", "Nm_NetworkRequest(" + chId + ")", "Quay lại FULL_COM_NETWORK_REQUESTED từ READY_SLEEP");
          if (!simState.activeArrows.includes("arr_comm_nm")) simState.activeArrows.push("arr_comm_nm");
        }
      }
      ch.fullComReqActive = true;
    } else {
      if (ch.subState === "COMM_FULL_COM_NETWORK_REQUESTED") {
        ch.subState = "COMM_FULL_COM_READY_SLEEP";
        ch.fullComReqActive = false;
        if (variant === "FULL") {
          ch.nmState = "NM_STATE_READY_SLEEP";
          addTraceLog("info", "Nm_NetworkRelease(" + chId + ")", "Hết chủ thể giữ mạng -> CanNm sang READY_SLEEP");
          if (!simState.activeArrows.includes("arr_comm_nm")) simState.activeArrows.push("arr_comm_nm");
        } else if (variant === "LIGHT") {
          ch.nmLightLeftMs = Math.max(0, Number(ecucConfig.ComMNmLightTimeout) || 0);
          addTraceLog("warn", "Start NmLightTimeout (" + ch.nmLightLeftMs + " ms)", "Kênh LIGHT vào FULL_COM_READY_SLEEP chờ hết timeout để ngủ (SWS_ComM_00891)");
        } else if (variant === "NONE") {
          if (isInternalBus(chId) || effectiveLimit) {
            addTraceLog("ok", "NONE + " + (isInternalBus(chId) ? "INTERNAL" : "Limit") + " -> NO_COM", "Kênh NONE nội bộ / Limit tắt thẳng xuống NO_COM (SWS_ComM_00664)");
            transitionChannelToNoCom(ch);
            return;
          } else {
            addTraceLog("info", "State -> COMM_FULL_COM_READY_SLEEP (NONE)", "SWS_ComM_00889: Biến thể NONE (bus vật lý) dừng tại READY_SLEEP, không tự tắt nếu không phải INTERNAL");
          }
        } else if (variant === "SLAVE_ACTIVE" || variant === "SLAVE_PASSIVE") {
          addTraceLog("info", "State -> COMM_FULL_COM_READY_SLEEP (" + variant + ")", "SWS_ComM_01017: Kênh SLAVE đợi ComM_<Bus>SM_BusSleepMode() từ Master/BusSM");
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
        } else if (variant === "NONE" && (isInternalBus(chId) || effectiveLimit)) {
          transitionChannelToNoCom(ch);
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

function userWantIndicator(ch, userFull) {
  return Boolean(userFull || (ecucConfig.ComMPncSupport && simState.pncs[16].state === "COMM_PNC_REQUESTED"));
}

function recomputeRegisters() {
  simState.prevRegAByte = simState.regAByte;
  simState.prevRegBByte = simState.regBByte;

  const ch = simState.channels[getSelectedChannelId()];
  const userFull = simState.users.some((u) => u.chId === ch.id && u.pncId === null && u.requested === "FULL_COM" && (!isLimitNoComEffective(ch) || ch.dcmActive));

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

function runArbitrationCycle(dtMs, runPncTransitions = true) {
  if (!simState.initialized) {
    recomputeRegisters();
    return;
  }
  const pncRes = evaluatePncStateMachine(dtMs, runPncTransitions);
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

function forceUninitPrecondition(reasonText) {
  simState.initialized = false;
  ecucConfig.ComMInitialized = false;
  simState.channels.forEach((c) => {
    c.commAllowed = false;
    c.mode = "COMM_NO_COMMUNICATION";
    c.subState = "COMM_NO_COM_NO_PENDING_REQUEST";
    c.actualBusSmMode = "COMM_NO_COMMUNICATION";
    c.dcmNotifiedMode = "COMM_NO_COMMUNICATION";
    c.nmState = "NM_STATE_BUS_SLEEP";
  });
  ecucConfig.ComMCommunicationAllowedFlag = false;
  if (reasonText) addTraceLog("warn", "ECU Power-On Reset (COMM_UNINIT)", reasonText);
  recomputeRegisters();
}

function api_ComM_DeInit() {
  if (!ensureInitialized("ComM_DeInit")) return false;
  // SWS_ComM_00794: ComM_DeInit chỉ thực thi khi TẤT CẢ kênh đang ở COMM_NO_COM_NO_PENDING_REQUEST
  const notAllNoCom = simState.channels.some((c) => c.subState !== "COMM_NO_COM_NO_PENDING_REQUEST");
  if (notAllNoCom) {
    ecucConfig.ComMInitialized = true;
    addTraceLog("err", "ComM_DeInit() Ignored [SWS_ComM_00794]", "Từ chối DeInit vì vẫn còn kênh chưa ở trạng thái COMM_NO_COM_NO_PENDING_REQUEST!");
    recomputeRegisters();
    return false;
  }
  simState.initialized = false;
  ecucConfig.ComMInitialized = false;
  simState.nvmDirty = false;
  simState.activeModId = "MOD_NVM";
  simState.activeArrows = ["arr_comm_nvm"];
  addTraceLog("info", "ComM_DeInit() -> NvM_WriteBlock()", "Tất cả kênh đã ngủ ổn định -> ghi NvM & chuyển COMM_UNINIT (SWS_ComM_00794, 00865)");
  recomputeRegisters();
  return true;
}

function api_ComM_Init(initFlag) {
  if (!initFlag) {
    return api_ComM_DeInit();
  }
  simState.initialized = true;
  ecucConfig.ComMInitialized = true;
  simState.channels.forEach((c) => {
    c.mode = "COMM_NO_COMMUNICATION";
    c.subState = "COMM_NO_COM_NO_PENDING_REQUEST";
    c.actualBusSmMode = "COMM_NO_COMMUNICATION";
    c.pendingBusSmMode = null;
    c.busSmDelayLeftMs = 0;
    c.dcmNotifiedMode = "COMM_NO_COMMUNICATION";
    c.nmState = "NM_STATE_BUS_SLEEP";
    c.commAllowed = false; // SWS_ComM_00884
    c.wakeupPending = false;
    c.limitToNoCom = false; // SWS_ComM_01107
    c.tMinFullLeftMs = 0;
    c.nmLightLeftMs = 0;
  });
  ecucConfig.ComMCommunicationAllowedFlag = false;
  simState.activeModId = "MOD_COMM";
  simState.activeArrows = ["arr_ecum_comm", "arr_comm_nvm"];
  addTraceLog("ok", "ComM_Init(&ComM_Config)", "Khởi tạo mọi kênh về NO_COM_NO_PENDING_REQUEST, CommunicationAllowed=FALSE (SWS_ComM_00884) & đọc NvM (SWS_ComM_00864)");
  recomputeRegisters();
  return true;
}

function api_ComM_CommunicationAllowed(chId, allowed) {
  if (!ensureInitialized("ComM_CommunicationAllowed")) return;
  simState.channels[chId].commAllowed = Boolean(allowed);
  if (chId === 0) ecucConfig.ComMCommunicationAllowedFlag = Boolean(allowed);
  simState.activeModId = "MOD_ECUM";
  simState.activeArrows = ["arr_ecum_comm"];
  addTraceLog(allowed ? "ok" : "warn", "ComM_CommunicationAllowed(" + chId + ", " + (allowed ? "TRUE" : "FALSE") + ")", allowed ? "EcuM/BswM mở chốt Gatekeeper cho phép giao tiếp (SWS_ComM_00895)" : "Khóa Gatekeeper CommunicationAllowed = FALSE (chỉ chặn từ NO_COM, SWS_ComM_00896)");
  runArbitrationCycle(0, true);
}

function incrementInhibitCounterSafely() {
  if (simState.inhibitCounter < 65535) {
    simState.inhibitCounter += 1; // SWS_ComM_00142: saturate at 65535
  }
  ecucConfig.ComMInhibitCounterValue = simState.inhibitCounter;
  simState.nvmDirty = true;
  if (!simState.activeArrows.includes("arr_comm_nvm")) simState.activeArrows.push("arr_comm_nvm");
}

function api_ComM_RequestComMode(userId, modeStr) {
  if (!ensureInitialized("ComM_RequestComMode")) return "E_NOT_OK";
  if (userId < 0 || userId > 2) {
    recordDetError("ComM_RequestComMode", "COMM_E_WRONG_PARAMETERS (0x02)", "UserId=" + userId + " vượt giới hạn cấu hình!");
    return "E_NOT_OK";
  }
  if (modeStr !== "FULL_COM" && modeStr !== "NO_COM") {
    recordDetError("ComM_RequestComMode", "COMM_E_WRONG_PARAMETERS (0x02)", "ComMode=" + modeStr + " không hợp lệ cho ComM_RequestComMode!");
    return "E_NOT_OK";
  }

  const u = simState.users[userId];
  const ch = simState.channels[u.chId];
  const fullModeStr = modeStr === "FULL_COM" ? "COMM_FULL_COMMUNICATION" : "COMM_NO_COMMUNICATION";

  simState.activeModId = "MOD_SWC";
  simState.activeArrows = ["arr_swc_rte", "arr_rte_comm"];

  if (modeStr === "FULL_COM") {
    const blockedByLimit = isLimitNoComEffective(ch) && !ch.dcmActive;
    // SWS_ComM_00219: Nếu kênh ĐÃ ở FULL_COM, PreventWakeUp không chặn yêu cầu của User!
    const blockedByNoWake = (ch.mode !== "COMM_FULL_COMMUNICATION") && isNoWakeupEffective(ch) && !ch.dcmActive;

    if (blockedByLimit) {
      // SWS_ComM_00582 / 00215 / 91027: LimitToNoCom KHÔNG lưu yêu cầu, giữ u.requested = NO_COM và trả COMM_E_MODE_LIMITATION
      u.requested = "NO_COM";
      if (userId === 0) ecucConfig.User0_RequestMode = "COMM_NO_COMMUNICATION";
      if (userId === 1) ecucConfig.User1_RequestMode = "COMM_NO_COMMUNICATION";
      if (userId === 2) ecucConfig.User2_Pnc16RequestMode = "COMM_NO_COMMUNICATION";
      incrementInhibitCounterSafely();
      addTraceLog("err", "ComM_RequestComMode(" + userId + ", " + fullModeStr + ") -> COMM_E_MODE_LIMITATION", "Bị LimitToNoCom chặn: KHÔNG lưu yêu cầu (SWS_ComM_00582), tăng InhibitCounter=" + simState.inhibitCounter);
      runArbitrationCycle(0, u.pncId === null);
      return "COMM_E_MODE_LIMITATION";
    }

    // Lưu yêu cầu User (bao gồm cả khi đang PreventWakeUp theo SWS_ComM_00839!)
    u.requested = "FULL_COM";
    if (userId === 0) ecucConfig.User0_RequestMode = "COMM_FULL_COMMUNICATION";
    if (userId === 1) ecucConfig.User1_RequestMode = "COMM_FULL_COMMUNICATION";
    if (userId === 2) ecucConfig.User2_Pnc16RequestMode = "COMM_FULL_COMMUNICATION";

    if (blockedByNoWake) {
      incrementInhibitCounterSafely();
      addTraceLog("err", "ComM_RequestComMode(" + userId + ", " + fullModeStr + ") -> COMM_E_MODE_LIMITATION", "Bị PreventWakeUp chặn nhưng VẪN LƯU yêu cầu (SWS_ComM_00839), tăng InhibitCounter=" + simState.inhibitCounter);
      runArbitrationCycle(0, u.pncId === null);
      return "COMM_E_MODE_LIMITATION";
    }

    if (u.chId === 0 && (ecucConfig.ComMNmVariant === "PASSIVE" || ecucConfig.ComMNmVariant === "SLAVE_PASSIVE")) {
      addTraceLog("warn", "ComM_RequestComMode(" + userId + ", " + fullModeStr + ")", "Biến thể " + ecucConfig.ComMNmVariant + ": User không thể tự kích FULL_COM (chờ Passive Wakeup, SWS_ComM_00667)");
    } else if (u.pncId !== null) {
      // SWS_ComM_00978: Chuyển pha PNC từ RequestComMode sẽ chạy trong ComM_MainFunction kế tiếp
      addTraceLog("ok", "ComM_RequestComMode(" + userId + ", " + fullModeStr + ")", u.name + " ghi nhận yêu cầu PNC #" + u.pncId + " — chờ ComM_MainFunction() xử lý PNC SM (SWS_ComM_00978)");
    } else {
      addTraceLog("ok", "ComM_RequestComMode(" + userId + ", " + fullModeStr + ")", u.name + " yêu cầu vào FULL_COM");
    }
  } else {
    u.requested = "NO_COM";
    if (userId === 0) ecucConfig.User0_RequestMode = "COMM_NO_COMMUNICATION";
    if (userId === 1) ecucConfig.User1_RequestMode = "COMM_NO_COMMUNICATION";
    if (userId === 2) ecucConfig.User2_Pnc16RequestMode = "COMM_NO_COMMUNICATION";
    if (u.pncId !== null) {
      addTraceLog("info", "ComM_RequestComMode(" + userId + ", " + fullModeStr + ")", u.name + " nhả yêu cầu PNC #" + u.pncId + " — chờ ComM_MainFunction() xử lý (SWS_ComM_00978)");
    } else {
      addTraceLog("info", "ComM_RequestComMode(" + userId + ", " + fullModeStr + ")", u.name + " nhả yêu cầu mạng về NO_COM");
    }
  }

  runArbitrationCycle(0, u.pncId === null);
  return "E_OK";
}

function api_ComM_EcuM_WakeUpIndication(chId) {
  if (!ensureInitialized("ComM_EcuM_WakeUpIndication")) return;
  simState.channels[chId].wakeupPending = true;
  simState.channels[chId].passiveWakeupSource = true;
  simState.activeModId = "MOD_ECUM";
  simState.activeArrows = ["arr_ecum_comm"];
  addTraceLog("ok", "ComM_EcuM_WakeUpIndication(" + chId + ")", "Passive Wakeup từ phần cứng trên Ch" + chId + " (đưa vào NO_COM_REQUEST_PENDING trước khi tới FULL_COM, SWS_ComM_00893)");

  if (ecucConfig.ComMSynchronousWakeUp) {
    simState.syncWakeupTriggered = true;
    simState.channels.forEach((c) => {
      if (c.id !== chId) {
        c.wakeupPending = true;
        c.passiveWakeupSource = true;
      }
    });
    addTraceLog("info", "ComMSynchronousWakeUp Active (SWS_ComM_00694/01063)", "Đánh thức đồng loạt các kênh còn lại sang NO_COM_REQUEST_PENDING");
  }
  runArbitrationCycle(0, true);
}

function api_ComM_EcuM_PNCWakeUpIndication(pncId) {
  if (!ensureInitialized("ComM_EcuM_PNCWakeUpIndication")) return;
  const pnc = simState.pncs[pncId];
  simState.activeModId = "MOD_ECUM";
  simState.activeArrows = ["arr_ecum_comm"];
  if (!pnc || !ecucConfig.ComMPncSupport) {
    addTraceLog("warn", "ComM_EcuM_PNCWakeUpIndication(" + pncId + ")", "PNC Support tắt hoặc PNC chưa map");
    return;
  }
  pnc.channels.forEach((cid) => {
    simState.channels[cid].wakeupPending = true;
    simState.channels[cid].passiveWakeupSource = true;
  });
  if (ecucConfig.ComMSynchronousWakeUp) {
    simState.syncWakeupTriggered = true;
    simState.channels.forEach((c) => {
      c.wakeupPending = true;
      c.passiveWakeupSource = true;
    });
  }
  if (pnc.state === "COMM_PNC_NO_COMMUNICATION" || pnc.state === "COMM_PNC_PREPARE_SLEEP") {
    pnc.state = "COMM_PNC_READY_SLEEP";
    pnc.prepSleepLeftMs = 0;
  }
  addTraceLog("ok", "ComM_EcuM_PNCWakeUpIndication(" + pncId + ")", "SWS_ComM_01064: EcuM báo wakeup riêng cho PNC #" + pncId + " -> đánh thức các kênh map");
  runArbitrationCycle(0, true);
}

function api_ComM_DCM_ActiveDiagnostic(chId, active) {
  if (!ensureInitialized("ComM_DCM_ActiveDiagnostic")) return;
  simState.channels[chId].dcmActive = Boolean(active);
  if (chId === 0) ecucConfig.ComMDcmDiagnosticActiveFlag = Boolean(active);
  simState.activeModId = "MOD_DCM";
  simState.activeArrows = ["arr_dcm_comm"];
  addTraceLog(active ? "warn" : "info", active ? "ComM_DCM_ActiveDiagnostic(" + chId + ")" : "ComM_DCM_InactiveDiagnostic(" + chId + ")", active ? "Quyền tối cao DCM bật (SWS_ComM_00873): Vượt mọi Mode Inhibition (trừ PASSIVE)!" : "Phiên chẩn đoán DCM kết thúc (SWS_ComM_00874) -> nhả quyền ưu tiên");
  runArbitrationCycle(0, true);
}

function api_ComM_PreventWakeUp(chId, status) {
  if (!ensureInitialized("ComM_PreventWakeUp")) return "E_NOT_OK";
  // SWS_ComM_01102: Kiểm tra ComMWakeupInhibitionEnabled & ECUGroupClassification Bit 0
  if (!ecucConfig.ComMWakeupInhibitionEnabled || (getEcuClassMask() & 0x01) === 0) {
    if (chId === 0) ecucConfig.ComMNoWakeup = simState.channels[0].noWakeup;
    addTraceLog("err", "ComM_PreventWakeUp(" + chId + ", " + (status ? "TRUE" : "FALSE") + ") -> E_NOT_OK", "Từ chối vì Classification Bit 0 = 0 hoặc ComMWakeupInhibitionEnabled = FALSE (SWS_ComM_01102)");
    recomputeRegisters();
    return "E_NOT_OK";
  }
  simState.channels[chId].noWakeup = Boolean(status);
  if (chId === 0) ecucConfig.ComMNoWakeup = Boolean(status);
  simState.activeModId = "MOD_COMM";
  if (ecucConfig.ComMNoWakeUpInhibitionNvmStorage) {
    simState.nvmDirty = true;
    simState.activeArrows = ["arr_comm_nvm"];
  }
  addTraceLog(status ? "warn" : "ok", "ComM_PreventWakeUp(" + chId + ", " + (status ? "TRUE" : "FALSE") + ")", status ? "Bật cờ NoWakeup (Bit 0) chặn User mới từ NO_COM/SILENT_COM (SWS_ComM_00218)" : "Tắt cờ NoWakeup — User request lưu trước đó tự kích hoạt (SWS_ComM_00839)");
  runArbitrationCycle(0, true);
  return "E_OK";
}

function clearChannelUserRequestsOnLimit(chId) {
  let cleared = false;
  simState.users.forEach((u) => {
    if (u.chId === chId && u.requested === "FULL_COM") {
      u.requested = "NO_COM";
      cleared = true;
      if (u.id === 0) ecucConfig.User0_RequestMode = "COMM_NO_COMMUNICATION";
      if (u.id === 1) ecucConfig.User1_RequestMode = "COMM_NO_COMMUNICATION";
      if (u.id === 2) ecucConfig.User2_Pnc16RequestMode = "COMM_NO_COMMUNICATION";
    }
  });
  if (cleared) {
    addTraceLog("warn", "Cleared Stored User Requests (Ch" + chId + ")", "SWS_ComM_00582 / 00215: Limit to NO_COM XÓA sạch mọi yêu cầu User về NO_COM!");
  }
}

function api_ComM_LimitChannelToNoComMode(chId, status) {
  if (!ensureInitialized("ComM_LimitChannelToNoComMode")) return "E_NOT_OK";
  // SWS_ComM_01103: Kiểm tra ComMModeLimitationEnabled & ECUGroupClassification Bit 1
  if (!ecucConfig.ComMModeLimitationEnabled || (getEcuClassMask() & 0x02) === 0) {
    if (chId === 0) ecucConfig.ComMNoCom = simState.channels[0].limitToNoCom;
    addTraceLog("err", "ComM_LimitChannelToNoComMode(" + chId + ", " + (status ? "TRUE" : "FALSE") + ") -> E_NOT_OK", "Từ chối vì Classification Bit 1 = 0 hoặc ComMModeLimitationEnabled = FALSE (SWS_ComM_01103)");
    recomputeRegisters();
    return "E_NOT_OK";
  }
  const ch = simState.channels[chId];
  ch.limitToNoCom = Boolean(status);
  if (chId === 0) ecucConfig.ComMNoCom = Boolean(status);
  simState.activeModId = "MOD_COMM";
  if (status && !ch.dcmActive) {
    clearChannelUserRequestsOnLimit(chId);
  }
  addTraceLog(status ? "err" : "ok", "ComM_LimitChannelToNoComMode(" + chId + ", " + (status ? "TRUE" : "FALSE") + ")", status ? "Cưỡng bức Ch" + chId + " tắt về NO_COM, hủy TMinFull (SWS_ComM_00890) & xóa User Req (SWS_ComM_00582)" : "Gỡ bỏ LimitChannelToNoComMode trên Ch" + chId + " (SWC phải gọi lại nếu cần mạng)");
  runArbitrationCycle(0, true);
  return "E_OK";
}

function api_ComM_LimitECUToNoComMode(status) {
  if (!ensureInitialized("ComM_LimitECUToNoComMode")) return "E_NOT_OK";
  if (!ecucConfig.ComMModeLimitationEnabled || (getEcuClassMask() & 0x02) === 0) {
    ecucConfig.GlobalLimitEcuToNoCom = simState.globalLimitEcu;
    addTraceLog("err", "ComM_LimitECUToNoComMode(" + (status ? "TRUE" : "FALSE") + ") -> E_NOT_OK", "Từ chối vì Classification Bit 1 = 0 (SWS_ComM_01103)");
    recomputeRegisters();
    return "E_NOT_OK";
  }
  simState.globalLimitEcu = Boolean(status);
  ecucConfig.GlobalLimitEcuToNoCom = Boolean(status);
  simState.activeModId = "MOD_COMM";
  if (status) {
    simState.channels.forEach((c) => {
      if (!c.dcmActive) clearChannelUserRequestsOnLimit(c.id);
    });
  }
  addTraceLog(status ? "err" : "ok", "ComM_LimitECUToNoComMode(" + (status ? "TRUE" : "FALSE") + ")", status ? "Cưỡng bức tắt toàn ECU về NO_COM & xóa User Req (trừ DCM, SWS_ComM_00124)" : "Gỡ bỏ LimitECUToNoComMode toàn cục");
  runArbitrationCycle(0, true);
  return "E_OK";
}

function api_ComM_SetECUGroupClassification(maskStr) {
  if (!ensureInitialized("ComM_SetECUGroupClassification")) return "E_NOT_OK";
  ecucConfig.ComMEcuGroupClassification = maskStr;
  addTraceLog("info", "ComM_SetECUGroupClassification(" + maskStr + ")", "Cập nhật quyền gọi API tương lai (SWS_ComM_01102/01103) — KHÔNG tự động xóa ức chế đang bật!");
  runArbitrationCycle(0, true);
  return "E_OK";
}

function api_ComM_ResetInhibitCounter() {
  if (!ensureInitialized("ComM_ResetInhibitCounter")) return;
  simState.inhibitCounter = 0;
  ecucConfig.ComMInhibitCounterValue = 0;
  simState.nvmDirty = true;
  simState.activeModId = "MOD_NVM";
  simState.activeArrows = ["arr_comm_nvm"];
  addTraceLog("ok", "ComM_ResetInhibitCounter()", "Reset ComMInhibitCounter = 0 và đánh dấu lưu NvM");
  recomputeRegisters();
}

function api_ComM_Nm_UpdateEIRA(b2, b3) {
  if (!ensureInitialized("ComM_Nm_UpdateEIRA")) return;
  simState.rxEiraByte2 = b2 & 0xFF;
  simState.rxEiraByte3 = b3 & 0xFF;
  ecucConfig.RxEiraSignalHex = formatHexPair(simState.rxEiraByte2, simState.rxEiraByte3);
  simState.activeModId = "MOD_NM";
  simState.activeArrows = ["arr_nm_comm"];
  addTraceLog("info", "ComM_Nm_UpdateEIRA(0x" + ecucConfig.RxEiraSignalHex + ")", "NmIf cập nhật trực tiếp vector EIRA vào ComM (SWS_ComM_01060)");
  runArbitrationCycle(0, true);
}

function api_ComM_Nm_UpdateERA(chId, b2, b3) {
  if (!ensureInitialized("ComM_Nm_UpdateERA")) return;
  if (chId === 0) {
    simState.rxEraCh0Byte2 = b2 & 0xFF;
    simState.rxEraCh0Byte3 = b3 & 0xFF;
    ecucConfig.RxEraCh0Hex = formatHexPair(simState.rxEraCh0Byte2, simState.rxEraCh0Byte3);
  } else {
    simState.rxEraCh1Byte2 = b2 & 0xFF;
    simState.rxEraCh1Byte3 = b3 & 0xFF;
    ecucConfig.RxEraCh1Hex = formatHexPair(simState.rxEraCh1Byte2, simState.rxEraCh1Byte3);
  }
  simState.activeModId = "MOD_NM";
  simState.activeArrows = ["arr_nm_comm"];
  addTraceLog("info", "ComM_Nm_UpdateERA(Ch" + chId + ", 0x" + formatHexPair(b2, b3) + ")", "NmIf báo trực tiếp External Request Array (ERA) kênh " + chId + " cho PNC Gateway (SWS_ComM_01061)");
  runArbitrationCycle(0, true);
}

function api_ComM_Nm_NetworkStartIndication(chId) {
  if (!ensureInitialized("ComM_Nm_NetworkStartIndication")) return;
  simState.channels[chId].wakeupPending = true;
  simState.channels[chId].passiveWakeupSource = true;
  simState.activeModId = "MOD_NM";
  simState.activeArrows = ["arr_nm_comm"];
  addTraceLog("ok", "ComM_Nm_NetworkStartIndication(" + chId + ")", "CanNm nhận gói NM từ bus -> NO_COM_REQUEST_PENDING rồi sang FULL_COM (Nm_PassiveStartUp, SWS_ComM_00665)");
  runArbitrationCycle(0, true);
}

function api_ComM_Nm_NetworkMode(chId) {
  if (!ensureInitialized("ComM_Nm_NetworkMode")) return;
  const ch = simState.channels[chId];
  const variant = chId === 0 ? ecucConfig.ComMNmVariant : "FULL";
  simState.activeModId = "MOD_NM";
  simState.activeArrows = ["arr_nm_comm"];
  if (ch.mode === "COMM_SILENT_COMMUNICATION" && (variant === "FULL" || variant === "PASSIVE")) {
    ch.nmState = "NM_STATE_READY_SLEEP";
    transitionChannelToFull(ch, variant, false, true);
    addTraceLog("ok", "ComM_Nm_NetworkMode(" + chId + ")", "SWS_ComM_00296: CanNm từ PrepareBusSleep nhận frame NM quay lại NetworkMode -> ComM chuyển SILENT_COM -> FULL_COM_READY_SLEEP");
    updateUsersCurrentMode();
    recomputeRegisters();
  } else {
    addTraceLog("info", "ComM_Nm_NetworkMode(" + chId + ")", "CanNm xác nhận đang ở NetworkMode");
  }
}

function api_ComM_Nm_RestartIndication(chId) {
  if (!ensureInitialized("ComM_Nm_RestartIndication")) return;
  simState.channels[chId].wakeupPending = true;
  simState.channels[chId].passiveWakeupSource = true;
  simState.activeModId = "MOD_NM";
  simState.activeArrows = ["arr_nm_comm"];
  addTraceLog("ok", "ComM_Nm_RestartIndication(" + chId + ")", "SWS_ComM_00892 / 00903: CanNm báo Network Restart trên Ch" + chId + " (đồng bộ đánh thức nếu bật)");
  if (ecucConfig.ComMSynchronousWakeUp) {
    simState.syncWakeupTriggered = true;
    simState.channels.forEach((c) => {
      c.wakeupPending = true;
      c.passiveWakeupSource = true;
    });
  }
  runArbitrationCycle(0, true);
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
    transitionChannelToSilent(ch);
    updateUsersCurrentMode();
    recomputeRegisters();
  } else {
    addTraceLog("warn", "ComM_Nm_PrepareBusSleepMode(" + chId + ") Ignored", "Kênh phải ở FULL_COM_READY_SLEEP mới xuống được SILENT_COM (SWS_ComM_00881)");
  }
}

function api_ComM_Nm_BusSleepMode(chId) {
  if (!ensureInitialized("ComM_Nm_BusSleepMode")) return;
  const ch = simState.channels[chId];
  const variant = chId === 0 ? ecucConfig.ComMNmVariant : "FULL";
  if (variant !== "FULL" && variant !== "PASSIVE") {
    addTraceLog("warn", "ComM_Nm_BusSleepMode(" + chId + ") Ignored", "Chỉ biến thể FULL / PASSIVE nhận ComM_Nm_BusSleepMode");
    return;
  }
  simState.activeModId = "MOD_NM";
  simState.activeArrows = ["arr_nm_comm"];
  addTraceLog("ok", "ComM_Nm_BusSleepMode(" + chId + ")", "CanNm hết WaitBusSleepTime -> ComM chuyển dứt điểm về NO_COM");
  transitionChannelToNoCom(ch);
  updateUsersCurrentMode();
  recomputeRegisters();
}

function api_ComM_BusSM_BusSleepMode(chId) {
  if (!ensureInitialized("ComM_BusSM_BusSleepMode")) return;
  const ch = simState.channels[chId];
  const variant = chId === 0 ? ecucConfig.ComMNmVariant : "FULL";
  if (variant !== "SLAVE_ACTIVE" && variant !== "SLAVE_PASSIVE") {
    addTraceLog("warn", "ComM_BusSM_BusSleepMode(" + chId + ") Ignored", "Chỉ dùng cho biến thể SLAVE_ACTIVE / SLAVE_PASSIVE (SWS_ComM_01018)");
    return;
  }
  simState.activeModId = "MOD_SM";
  simState.activeArrows = ["arr_sm_comm"];
  addTraceLog("ok", "ComM_" + (getBusSmPrefix(chId) || "BusSM") + "_BusSleepMode(" + chId + ")", "SWS_ComM_01018: BusSM báo slave bus ngủ -> ComM chuyển Ch" + chId + " về NO_COM");
  transitionChannelToNoCom(ch);
  updateUsersCurrentMode();
  recomputeRegisters();
}

function api_ComM_Nm_ForwardSynchronizedPncShutdown(chId, pncId) {
  if (!ensureInitialized("ComM_Nm_ForwardSynchronizedPncShutdown")) return;
  if (!ecucConfig.ComMSynchronizedPncShutdownEnabled || !ecucConfig.ComMPncGatewayEnabled) {
    addTraceLog("warn", "ComM_Nm_ForwardSynchronizedPncShutdown Ignored", "Cần bật ComMSynchronizedPncShutdownEnabled & ComMPncGatewayEnabled");
    return;
  }
  const chType = chId === 0 ? ecucConfig.Ch0_GatewayType : ecucConfig.Ch1_GatewayType;
  const otherChId = chId === 0 ? 1 : 0;
  const otherType = otherChId === 0 ? ecucConfig.Ch0_GatewayType : ecucConfig.Ch1_GatewayType;
  simState.activeModId = "MOD_NM";
  simState.activeArrows = ["arr_nm_comm", "arr_comm_nm"];
  if (chType === "COMM_GATEWAY_TYPE_ACTIVE" && otherType === "COMM_GATEWAY_TYPE_PASSIVE") {
    simState.syncShutdownSent = true;
    addTraceLog("ok", "Nm_RequestSynchronizedPncShutdown(Ch" + otherChId + ", PNC_" + pncId + ")", "Intermediate GW nhận Forward trên kênh ACTIVE Ch" + chId + " -> chuyển tiếp SyncShutdown xuống kênh PASSIVE Ch" + otherChId + " (SWS_ComM_01082 / 91030)");
  } else {
    addTraceLog("info", "ComM_Nm_ForwardSynchronizedPncShutdown(Ch" + chId + ", PNC_" + pncId + ")", "Chỉ forward từ kênh ACTIVE xuống kênh PASSIVE được map PNC (SWS_ComM_01082)");
  }
  recomputeRegisters();
}

function stepClockTick(dtMs) {
  const step = Number(dtMs) || Number(ecucConfig.ComMMainFunctionPeriod) || 20;
  simState.clockMs += step;
  simState.activeArrows = [];
  if (!simState.initialized) {
    recordDetError("ComM_MainFunction_0", "COMM_E_UNINIT (0x01)", "Tick tại " + simState.clockMs + "ms thất bại do ComM chưa Init");
  } else {
    runArbitrationCycle(step, true);
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
    simState.inhibitCounter = Math.min(65535, Math.max(0, Number(val) || 0));
    ecucConfig.ComMInhibitCounterValue = simState.inhibitCounter;
    recomputeRegisters();
  } else if (key === "RxEiraSignalHex") {
    const p = parseHexPair(val);
    api_ComM_Nm_UpdateEIRA(p.b2, p.b3);
  } else if (key === "RxEraCh0Hex") {
    const p = parseHexPair(val);
    api_ComM_Nm_UpdateERA(0, p.b2, p.b3);
  } else if (key === "RxEraCh1Hex") {
    const p = parseHexPair(val);
    api_ComM_Nm_UpdateERA(1, p.b2, p.b3);
  } else {
    runArbitrationCycle(0, true);
  }

  simState.stepExplain = "Đã thay đổi cấu hình ECUC: " + key + " = " + String(ecucConfig[key]);
  if (typeof renderAll === "function") renderAll();
}
