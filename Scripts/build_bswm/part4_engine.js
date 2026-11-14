// ================= PART 4A: BSWM SIMULATION ENGINE, ARBITRATION, ACTION LISTS & AUTOSAR APIS =================

const defaultConfig = {
  // Tab 0: General (6)
  BswMInitialized: true,
  BswMDevErrorDetect: true,
  BswMVersionInfoApi: false,
  BswMMainFunctionPeriod: 10,
  BswMComMEnabled: true,
  BswMDcmEnabled: true,
  // Tab 1: Mode Req Ports (6)
  MRP_ComM_Ch0_Processing: "BSWM_IMMEDIATE",
  MRP_CanSM_Ch0_Processing: "BSWM_IMMEDIATE",
  MRP_Dcm_ComCtrl_Processing: "BSWM_IMMEDIATE",
  MRP_EcuM_State_Processing: "BSWM_DEFERRED",
  MRP_NvM_Job_Processing: "BSWM_DEFERRED",
  MRP_Swc_AppMode_Processing: "BSWM_DEFERRED",
  // Tab 2: Rules & Expr (6)
  Rule02_ComMFull_InitState: "BSWM_FALSE",
  Rule02_LogicalOperator: "BSWM_AND",
  Rule02_EnableFalseActionList: true,
  Rule06_SwcSport_InitState: "BSWM_FALSE",
  EnableIndependentRuleEvaluation: true,
  GenericReq_UserId_And_MaxMode: "1 / 3",
  // Tab 3: ActionLists (6)
  AL_EnableTxRxDM_Execution: "BSWM_TRIGGER",
  AL_SwcSportMode_Execution: "BSWM_CONDITION",
  BswMActionListPriority: 0,
  BswMAbortOnFail: true,
  InjectActionItemFailure: false,
  EnableCascadedActionList: true,
  // Tab 4: PDU / PduR / Timer (6)
  BswMPduGroupSwitchReinit: true,
  EnableReceptionDmControl: true,
  EnableTriggerIpduSendAction: false,
  EnablePduRouterControl: true,
  BswMComMPncEnabled: true,
  BswMTimerValue: 300,
  // Tab 5: Lifecycle & DCM (6)
  EcuMShutdownTarget: "ECUM_STATE_OFF",
  RequireNvMReadAllBeforeRteStart: true,
  RequireNvMWriteAllBeforeGoOff: true,
  DcmCommunicationControlMode: "DCM_ENABLE_RX_TX_NORM_NM",
  EnableNmControlOnDcm0x28: true,
  EnableWdgMPartitionResetRule: true
};

let ecucConfig = JSON.parse(JSON.stringify(defaultConfig));

function createRuleStateObj(id, name, exprText, deps, execType, initState) {
  return {
    id,
    name,
    exprText,
    deps,
    execType,
    prevResult: initState || "BSWM_FALSE",
    currResult: initState || "BSWM_FALSE",
    lastChanged: false,
    lastStatus: "INIT"
  };
}

function createInitialSimState() {
  return {
    clockMs: 0,
    initialized: true,
    reentrancyBusy: false,
    nvmJobType: "IDLE",
    rteStarted: false,
    commAllowedCh0: false,
    nmEnabledCh0: true,
    swcActiveMode: "APP_MODE_NORMAL",
    bswScheduleMode: "SCHM_MODE_NORMAL_10MS",
    wdgmFault: false,
    timerLeftMs: 0,
    timerRunning: false,
    mrp: {
      ecum: "ECUM_STATE_STARTUP_ONE",
      nvm: "NVM_REQ_OK",
      comm: "COMM_NO_COMMUNICATION",
      cansm: "CANSM_BSWM_NO_COMMUNICATION",
      dcm: "DCM_ENABLE_RX_TX_NORM_NM",
      swc: "APP_MODE_NORMAL",
      pnc16: "COMM_PNC_NO_COMMUNICATION",
      timer: "BSWM_TIMER_STOPPED"
    },
    changedMrp: null,
    deferredQueue: [],
    rules: [
      createRuleStateObj("Rule_01a", "Rule_01a_StartNvMRead", "EcuM == STARTUP_TWO", ["ecum"], "BSWM_TRIGGER", "BSWM_FALSE"),
      createRuleStateObj("Rule_01b", "Rule_01b_RunReady", "(EcuM == STARTUP_TWO) && (NvM_Read == OK || Timer == EXPIRED)", ["ecum", "nvm", "timer"], "BSWM_TRIGGER", "BSWM_FALSE"),
      createRuleStateObj("Rule_02",  "Rule_02_ComMFullCom", "(ComM == FULL_COM) && (CanSM == FULL_COM)", ["comm", "cansm"], ecucConfig.AL_EnableTxRxDM_Execution, ecucConfig.Rule02_ComMFull_InitState),
      createRuleStateObj("Rule_03",  "Rule_03_SilentOrBusOff", "(ComM == SILENT_COM) || (CanSM == BUS_OFF)", ["comm", "cansm"], "BSWM_TRIGGER", "BSWM_FALSE"),
      createRuleStateObj("Rule_04",  "Rule_04_Dcm0x28ComCtrl", "Dcm_ComCtrl != DCM_ENABLE_RX_TX_NORM_NM", ["dcm"], "BSWM_TRIGGER", "BSWM_FALSE"),
      createRuleStateObj("Rule_05",  "Rule_05_Pnc16Active", "Pnc16 == REQUESTED || Pnc16 == READY_SLEEP", ["pnc16"], "BSWM_TRIGGER", "BSWM_FALSE"),
      createRuleStateObj("Rule_06",  "Rule_06_SwcSportMode", "(Swc == APP_MODE_SPORT) && (ComM == FULL_COM)", ["swc", "comm"], ecucConfig.AL_SwcSportMode_Execution, ecucConfig.Rule06_SwcSport_InitState),
      createRuleStateObj("Rule_06b", "Rule_06b_TimerExpired", "Timer0 == BSWM_TIMER_EXPIRED", ["timer"], "BSWM_TRIGGER", "BSWM_FALSE"),
      createRuleStateObj("Rule_07",  "Rule_07_PrepShutdown", "EcuM == ECUM_STATE_PREP_SHUTDOWN", ["ecum"], "BSWM_TRIGGER", "BSWM_FALSE"),
      createRuleStateObj("Rule_08",  "Rule_08_GoOffDeinit", "(EcuM == PREP_SHUTDOWN) && (NvM_Write == OK)", ["ecum", "nvm"], "BSWM_TRIGGER", "BSWM_FALSE")
    ],
    ipduVecByte: 0x00,      // Mọi I-PDU Group = STOPPED sau BswM_Init()
    prevIpduVecByte: 0x00,
    regAByte: 0x80,         // BSWM_INIT = 1
    prevRegAByte: 0x80,
    regBByte: 0x00,
    prevRegBByte: 0x00,
    immProcActive: false,
    ruleExprTrueFlag: false,
    ruleChangedFlag: false,
    actCondFlag: false,
    abortOnFailTriggered: false,
    shutdownActive: false,
    pipeState: "BSWM_IDLE_INITIALIZED",
    lifeState: "STARTUP_ONE",
    lastEvaluatedRuleId: "NONE",
    lastExecutedActionList: "NONE",
    detFaults: [],
    activeModId: "MOD_BSWM",
    activeArrows: [],
    stepExplain: "BswM đã khởi tạo qua BswM_Init(&BswM_Config). Chọn kịch bản hoặc dùng Thao Tác Nhanh để chạy thử.",
    traceLogs: []
  };
}

let simState = createInitialSimState();

function pushTrace(api, detail, level) {
  simState.traceLogs.unshift({
    t: simState.clockMs,
    api,
    detail,
    level: level || "info"
  });
  if (simState.traceLogs.length > 70) simState.traceLogs.pop();
}

function reportDetError(serviceId, errCode, errHex, detail, isRuntime) {
  if (!ecucConfig.BswMDevErrorDetect && !isRuntime) return;
  const fn = isRuntime ? "Det_ReportRuntimeError" : "Det_ReportError";
  const msg = fn + "(BSWM_MODULE_ID=42, 0, " + serviceId + ", " + errCode + " [" + errHex + "])";
  simState.detFaults.unshift({ t: simState.clockMs, code: errCode + " (" + errHex + ")", detail });
  if (simState.detFaults.length > 15) simState.detFaults.pop();
  simState.activeArrows.push("arr_bswm_det");
  pushTrace(msg, detail, "err");
}

function beginStepSnapshot(isImmediate) {
  simState.prevIpduVecByte = simState.ipduVecByte;
  simState.prevRegAByte = simState.regAByte;
  simState.prevRegBByte = simState.regBByte;
  simState.immProcActive = !!isImmediate;
  simState.ruleChangedFlag = false;
  simState.actCondFlag = false;
  simState.abortOnFailTriggered = false;
  simState.changedMrp = null;
}

function parseGenericConfig() {
  const parts = String(ecucConfig.GenericReq_UserId_And_MaxMode || "1 / 3").split(/[\/,;\s]+/).filter(Boolean);
  const maxUser = Math.max(0, parseInt(parts[0], 10) || 1);
  const maxMode = Math.max(0, parseInt(parts[1], 10) || 3);
  return { maxUser, maxMode };
}

function refreshRuleMetadataFromConfig() {
  const r2 = simState.rules.find((r) => r.id === "Rule_02");
  if (r2) {
    r2.execType = ecucConfig.AL_EnableTxRxDM_Execution;
    const op = ecucConfig.Rule02_LogicalOperator.replace("BSWM_", "");
    const sym = op === "AND" ? "&&" : (op === "OR" ? "||" : (op === "XOR" ? "^" : "!&"));
    r2.exprText = "(ComM == FULL) " + sym + " (CanSM == FULL)";
  }
  const r6 = simState.rules.find((r) => r.id === "Rule_06");
  if (r6) r6.execType = ecucConfig.AL_SwcSportMode_Execution;
}

function computeRuleBoolean(ruleId) {
  const m = simState.mrp;
  switch (ruleId) {
    case "Rule_01a":
      return m.ecum === "ECUM_STATE_STARTUP_TWO" && simState.nvmJobType === "IDLE" && !simState.rteStarted;
    case "Rule_01b": {
      const nvmReady = !ecucConfig.RequireNvMReadAllBeforeRteStart ||
        (simState.nvmJobType === "NVM_READ_ALL" && m.nvm === "NVM_REQ_OK") ||
        m.timer === "BSWM_TIMER_EXPIRED";
      return m.ecum === "ECUM_STATE_STARTUP_TWO" && nvmReady;
    }
    case "Rule_02": {
      const a = ecucConfig.BswMComMEnabled && m.comm === "COMM_FULL_COMMUNICATION";
      const b = m.cansm === "CANSM_BSWM_FULL_COMMUNICATION";
      const op = ecucConfig.Rule02_LogicalOperator;
      if (op === "BSWM_OR") return a || b;
      if (op === "BSWM_XOR") return Boolean(a ^ b);
      if (op === "BSWM_NAND") return !(a && b);
      return a && b;
    }
    case "Rule_03":
      return (m.comm === "COMM_SILENT_COMMUNICATION" || m.cansm === "CANSM_BSWM_BUS_OFF" || m.cansm === "CANSM_BSWM_CHANGE_BAUDRATE") && m.comm !== "COMM_NO_COMMUNICATION";
    case "Rule_04":
      return ecucConfig.BswMDcmEnabled && m.dcm !== "DCM_ENABLE_RX_TX_NORM_NM";
    case "Rule_05":
      return ecucConfig.BswMComMPncEnabled && (m.pnc16 === "COMM_PNC_REQUESTED" || m.pnc16 === "COMM_PNC_READY_SLEEP");
    case "Rule_06":
      return m.swc === "APP_MODE_SPORT" && m.comm === "COMM_FULL_COMMUNICATION";
    case "Rule_06b":
      return m.timer === "BSWM_TIMER_EXPIRED";
    case "Rule_07":
      return m.ecum === "ECUM_STATE_PREP_SHUTDOWN";
    case "Rule_08": {
      const writeOk = !ecucConfig.RequireNvMWriteAllBeforeGoOff ||
        (simState.nvmJobType === "NVM_WRITE_ALL" && m.nvm === "NVM_REQ_OK");
      return m.ecum === "ECUM_STATE_PREP_SHUTDOWN" && writeOk;
    }
    default:
      return false;
  }
}

function setIpduMask(mask, enable) {
  if (enable) simState.ipduVecByte |= mask;
  else simState.ipduVecByte &= (~mask & 0xFF);
}

function runActionList(alName, ruleObj) {
  simState.lastExecutedActionList = alName;
  simState.pipeState = "BSWM_EXECUTING_ACTION_LIST";
  const reinit = ecucConfig.BswMPduGroupSwitchReinit ? "TRUE" : "FALSE";

  if (alName === "AL_StartNvMReadAll") {
    simState.nvmJobType = "NVM_READ_ALL";
    simState.mrp.nvm = "NVM_REQ_PENDING";
    simState.lifeState = "STARTUP_TWO_NVM";
    simState.activeArrows.push("arr_bswm_nvm");
    pushTrace("BswM_Callout -> NvM_ReadAll()", "Rule_01a kích hoạt đọc đa khối bộ nhớ Flash/EEPROM & bật BswMTimer cứu hộ.", "ok");
    api_BswM_TimerControl(true, Number(ecucConfig.BswMTimerValue) || 300, true);
    return;
  }

  if (alName === "AL_EnterRunMode") {
    simState.timerRunning = false;
    simState.timerLeftMs = 0;
    if (simState.mrp.timer === "BSWM_TIMER_STARTED") simState.mrp.timer = "BSWM_TIMER_STOPPED";
    simState.rteStarted = true;
    simState.commAllowedCh0 = true;
    simState.mrp.ecum = "ECUM_STATE_RUN";
    simState.lifeState = "RUN_READY";
    simState.activeArrows.push("arr_bswm_rte", "arr_bswm_comm", "arr_bswm_ecum");
    pushTrace("Rte_Start()", "BswMRteStart: Khởi động RTE cho phép SWC chạy Runnable & gửi ModeRequest.", "ok");
    pushTrace("ComM_CommunicationAllowed(Ch0, TRUE)", "BswMComMAllowCom [SWS_BswM_00120]: Mở chốt cho phép kênh ComM Ch0 vào FULL_COM.", "ok");
    pushTrace("EcuM_SetState(ECUM_STATE_RUN)", "Chuyển trạng thái ECU sang pha RUN chính thức.", "ok");
    return;
  }

  if (alName === "AL_EnableTxRxDM") {
    // Item 1: Com_IpduGroupStart (Tx/Rx App, Diag, NM)
    setIpduMask(0x01 | 0x02 | 0x20 | 0x40, true);
    simState.activeArrows.push("arr_bswm_com");
    pushTrace("Com_IpduGroupStart(IG_0_Tx_App & IG_1_Rx_App, " + reinit + ")", "BswMPduGroupSwitch [SWS_BswM_00119]: Mở truyền nhận bản tin ứng dụng.", "ok");

    // Item 2: Simulated Power/Safety Check (Fault Injection for S8)
    if (ecucConfig.InjectActionItemFailure) {
      pushTrace("BswM_UserCallout_CheckPower() -> E_NOT_OK", "Item #2 trong ActionList trả về mã lỗi E_NOT_OK!", "err");
      if (ecucConfig.BswMAbortOnFail) {
        simState.abortOnFailTriggered = true;
        ruleObj.lastStatus = "ABORTED (Item#2)";
        reportDetError("0x00", "BSWM_E_ACTION_FAILED", "0x80", "BswMAbortOnFail = TRUE -> Hủy bỏ Item #3 (PduR/DM) & Item #4 (Sub-Rule PNC)!", true);
        return;
      } else {
        pushTrace("BswMAbortOnFail == FALSE", "Bỏ qua lỗi E_NOT_OK ở Item #2 và tiếp tục thực thi Item #3, Item #4.", "warn");
      }
    }

    // Item 3: Nested Cascaded ActionList (DM + PduR + TriggerIPduSend)
    if (ecucConfig.EnableCascadedActionList) {
      if (ecucConfig.EnableReceptionDmControl) {
        setIpduMask(0x04, true);
        pushTrace("Com_EnableReceptionDM(IG_2_Rx_DM)", "AL_Sub [SWS_BswM_00122]: Bật giám sát timeout bản tin Rx trên AUTOSAR COM.", "ok");
      }
      if (ecucConfig.EnablePduRouterControl) {
        setIpduMask(0x80, true);
        simState.activeArrows.push("arr_bswm_pdur");
        pushTrace("PduR_EnableRouting(RPG_0_Gateway)", "AL_Sub [SWS_BswM_00105]: Mở đường định tuyến Gateway trên PduR.", "ok");
      }
      if (ecucConfig.EnableTriggerIpduSendAction) {
        pushTrace("Com_TriggerIPDUSend(PduId_StatusBroadcast)", "AL_Sub [SWS_BswM_00121]: Kích phát ngay lập tức I-PDU báo trạng thái lên bus CAN.", "ok");
      }
      // Item 4: Sub-Rule PNC Check
      if (ecucConfig.BswMComMPncEnabled && (simState.mrp.pnc16 === "COMM_PNC_REQUESTED" || simState.mrp.pnc16 === "COMM_PNC_READY_SLEEP")) {
        setIpduMask(0x08 | 0x10, true);
        pushTrace("SubRule_PncCheck -> Com_IpduGroupStart(IG_3_PNC16_Tx/Rx)", "Sub-Rule: Đồng bộ nhóm PDU riêng cho PNC #16 đang hoạt động.", "ok");
      }
    }
    simState.lifeState = "FULL_COM_ONLINE";
    return;
  }

  if (alName === "AL_DisableTxRxDM") {
    if (simState.mrp.comm === "COMM_NO_COMMUNICATION") {
      setIpduMask(0xFF, false);
      simState.activeArrows.push("arr_bswm_com", "arr_bswm_pdur");
      pushTrace("Com_IpduGroupStop(ALL) + PduR_DisableRouting()", "FalseActionList: ComM về NO_COM -> Tắt toàn bộ I-PDU Group (Vector = 0x00) & PduR Routing.", "warn");
      if (simState.lifeState !== "PREP_SHUTDOWN" && simState.lifeState !== "GO_OFF_DEINIT") simState.lifeState = "RUN_READY";
    } else {
      setIpduMask(0x01 | 0x04, false);
      simState.activeArrows.push("arr_bswm_com");
      pushTrace("Com_IpduGroupStop(IG_0_Tx_App) + Com_DisableReceptionDM()", "FalseActionList: Rule_02 về FALSE -> Ngắt Tx I-PDU Group và tắt Rx DM tức thời.", "warn");
    }
    return;
  }

  if (alName === "AL_SilentOrBusOff") {
    setIpduMask(0x01 | 0x04, false);
    setIpduMask(0x02 | 0x20, true); // Keep Rx & Diag active
    simState.activeArrows.push("arr_bswm_com");
    if (simState.mrp.cansm === "CANSM_BSWM_BUS_OFF" || simState.mrp.cansm === "CANSM_BSWM_CHANGE_BAUDRATE") {
      simState.lifeState = "BUS_OFF_RECOVERY";
      simState.activeArrows.push("arr_bswm_rte");
      pushTrace("Com_IpduGroupStop(IG_0_Tx) + Com_DisableReceptionDM()", "SỰ CỐ BUS-OFF/BAUDRATE: Ngắt khẩn cấp Tx I-PDU Group & Rx DM ngay trong BswM_CanSM_CurrentState()!", "err");
      pushTrace("Rte_Switch_BusOffState(BUS_OFF_ACTIVE)", "Thông báo sự cố CAN Bus-Off lên tầng Application SWC.", "warn");
    } else {
      simState.lifeState = "SILENT_COM_RX";
      pushTrace("Com_IpduGroupStop(IG_0_Tx) + Giữ IG_1_Rx = ON", "Vào SILENT_COM: Cấm truyền Tx & tắt Rx DM, nhưng VẪN GIỮ mở IG_1_Rx để lắng nghe gói NM.", "warn");
    }
    return;
  }

  if (alName === "AL_SilentFalseCheck") {
    if (simState.mrp.comm === "COMM_NO_COMMUNICATION") {
      setIpduMask(0xFF, false);
      simState.activeArrows.push("arr_bswm_com", "arr_bswm_pdur");
      if (simState.lifeState !== "PREP_SHUTDOWN" && simState.lifeState !== "GO_OFF_DEINIT") simState.lifeState = "RUN_READY";
      pushTrace("Com_IpduGroupStop(IG_1_Rx, IG_5_Diag, IG_6_NM) + PduR_DisableRouting()", "ComM về NO_COMMUNICATION -> Ngắt nốt nhóm Rx, NM & PduR (Com_IpduGroupVector = 0x00).", "warn");
    }
    return;
  }

  if (alName === "AL_DcmDisableNormNm") {
    const mode = simState.mrp.dcm;
    const isFullCom = simState.mrp.comm === "COMM_FULL_COMMUNICATION" && simState.mrp.cansm === "CANSM_BSWM_FULL_COMMUNICATION";
    const disTxNorm = mode === "DCM_ENABLE_RX_DISABLE_TX_NORM" || mode === "DCM_DISABLE_RX_TX_NORM" || mode === "DCM_DISABLE_RX_TX_NORM_NM";
    const disRxNorm = mode === "DCM_DISABLE_RX_TX_NORM" || mode === "DCM_DISABLE_RX_TX_NORM_NM";
    const disNm = mode === "DCM_DISABLE_RX_TX_NM" || mode === "DCM_DISABLE_RX_TX_NORM_NM";

    setIpduMask(0x20, true); // Luôn giữ IG_5_Diag_Pdu mở cho máy chẩn đoán UDS!

    if (disTxNorm) {
      setIpduMask(0x01 | 0x04, false);
      pushTrace("Com_IpduGroupStop(IG_0_Tx_App) + DisableReceptionDM()", "UDS 0x28: Khóa phát bản tin ứng dụng Normal (vẫn giữ mở IG_5_Diag_Pdu).", "warn");
    } else if (isFullCom) {
      setIpduMask(0x01 | 0x04, true);
    }
    if (disRxNorm) {
      setIpduMask(0x02, false);
      pushTrace("Com_IpduGroupStop(IG_1_Rx_App)", "UDS 0x28: Khóa nhận bản tin ứng dụng Normal.", "warn");
    } else if (simState.mrp.comm !== "COMM_NO_COMMUNICATION") {
      setIpduMask(0x02, true);
    }
    if (disNm && ecucConfig.EnableNmControlOnDcm0x28) {
      setIpduMask(0x40, false);
      simState.nmEnabledCh0 = false;
      simState.activeArrows.push("arr_bswm_comm");
      pushTrace("Nm_DisableCommunication(Ch0) [SWS_BswM_00104]", "BswMNmControl: Tắt phát & nhận bản tin CanNm phục vụ quá trình Flashing / UDS 0x28.", "warn");
    } else if (!disNm && simState.mrp.comm !== "COMM_NO_COMMUNICATION") {
      setIpduMask(0x40, true);
      simState.nmEnabledCh0 = true;
    }
    simState.activeArrows.push("arr_bswm_com");
    simState.lifeState = "DCM_0x28_DISABLED";
    return;
  }

  if (alName === "AL_DcmRestoreAll") {
    simState.nmEnabledCh0 = true;
    if (simState.mrp.comm === "COMM_FULL_COMMUNICATION" && simState.mrp.cansm === "CANSM_BSWM_FULL_COMMUNICATION") {
      setIpduMask(0x01 | 0x02 | 0x04 | 0x40, true);
      simState.lifeState = "FULL_COM_ONLINE";
    } else {
      setIpduMask(0x40, true);
    }
    simState.activeArrows.push("arr_bswm_com", "arr_bswm_comm");
    pushTrace("Nm_EnableCommunication(Ch0) + Com_IpduGroupStart(IG_0_Tx, IG_1_Rx)", "UDS 0x28 Restore: Mở lại toàn bộ bản tin ứng dụng Normal và Network Management.", "ok");
    return;
  }

  if (alName === "AL_EnablePnc16Pdu") {
    setIpduMask(0x08 | 0x10, true);
    simState.activeArrows.push("arr_bswm_com");
    pushTrace("Com_IpduGroupStart(IG_3_PNC16_Tx & IG_4_PNC16_Rx, " + reinit + ")", "PNC #16 Active (" + simState.mrp.pnc16 + "): Mở nhóm Tx & Rx I-PDU riêng cho cụm PNC #16.", "ok");
    return;
  }

  if (alName === "AL_DisablePnc16Pdu") {
    if (simState.mrp.pnc16 === "COMM_PNC_PREPARE_SLEEP") {
      setIpduMask(0x08, false);
      setIpduMask(0x10, true);
      pushTrace("Com_IpduGroupStop(IG_3_PNC16_Tx)", "PNC #16 PrepareSleep: Ngắt ngay Tx I-PDU PNC #16 để cụm PNC ngủ êm, vẫn giữ Rx lắng nghe.", "warn");
    } else {
      setIpduMask(0x08 | 0x10, false);
      pushTrace("Com_IpduGroupStop(IG_3_PNC16_Tx & IG_4_PNC16_Rx)", "PNC #16 NO_COM: Tắt hoàn toàn các nhóm I-PDU của cụm PNC #16.", "warn");
    }
    simState.activeArrows.push("arr_bswm_com");
    return;
  }

  if (alName === "AL_SwcSportMode") {
    simState.swcActiveMode = "APP_MODE_SPORT";
    simState.bswScheduleMode = "SCHM_MODE_FAST_5MS";
    simState.activeArrows.push("arr_bswm_rte");
    pushTrace("Rte_Switch_BswM_AppMode(RTE_MODE_AppMode_SPORT)", "BswMRteSwitch [SWS_BswM_00106]: Kích hoạt Runnable_OnEntry_SportMode() trong SWC_App.", "ok");
    pushTrace("SchM_Switch_BswSchedule(SCHM_MODE_FAST_5MS)", "BswMSchMSwitch [SWS_BswM_00138]: Tăng tốc chu kỳ lập lịch BSW sang 5ms.", "ok");
    if (ecucConfig.EnableTriggerIpduSendAction) {
      simState.activeArrows.push("arr_bswm_com");
      pushTrace("Com_TriggerIPDUSend(PduId_SportStatus)", "BswMTriggerIPduSend: Gửi ngay khung CAN báo chế độ SPORT mới.", "ok");
    }
    return;
  }

  if (alName === "AL_SwcNormalMode") {
    simState.swcActiveMode = "APP_MODE_NORMAL";
    simState.bswScheduleMode = "SCHM_MODE_NORMAL_10MS";
    simState.activeArrows.push("arr_bswm_rte");
    pushTrace("Rte_Switch_BswM_AppMode(RTE_MODE_AppMode_NORMAL)", "FalseActionList Rule_06: Chuyển chế độ ứng dụng về APP_MODE_NORMAL an toàn.", "info");
    return;
  }

  if (alName === "AL_OnTimerExpired") {
    if (ecucConfig.EnablePduRouterControl) {
      setIpduMask(0x80, false);
      simState.activeArrows.push("arr_bswm_pdur");
      pushTrace("PduR_DisableRouting(RPG_0_Gateway, TRUE)", "BswMTimer_0 EXPIRED: Hết thời gian giữ cổng -> Ngắt định tuyến PduR Gateway.", "warn");
    }
    simState.activeArrows.push("arr_bswm_comm");
    pushTrace("ComM_RequestComMode(BswM_User, COMM_NO_COMMUNICATION)", "BswMTimer_0 EXPIRED: BswM chủ động nhả yêu cầu truyền thông xuống ComM.", "warn");
    return;
  }

  if (alName === "AL_PrepShutdown") {
    simState.shutdownActive = true;
    simState.rteStarted = false;
    simState.commAllowedCh0 = false;
    simState.nvmJobType = "NVM_WRITE_ALL";
    simState.mrp.nvm = "NVM_REQ_PENDING";
    simState.lifeState = "PREP_SHUTDOWN";
    setIpduMask(0xFF, false);
    simState.activeArrows.push("arr_bswm_rte", "arr_bswm_comm", "arr_bswm_nvm", "arr_bswm_com");
    pushTrace("ComM_CommunicationAllowed(Ch0, FALSE)", "Khóa cửa truyền thông: cấm đánh thức lại mạng trong pha tắt máy.", "warn");
    pushTrace("Rte_Stop()", "BswMRteStop: Dừng tầng RTE và các SWC Runnable trước khi ghi Flash.", "warn");
    pushTrace("NvM_WriteAll()", "Bắt đầu lưu toàn bộ dữ liệu bền vững (DTC, Odometer, Config) xuống Flash.", "ok");
    return;
  }

  if (alName === "AL_GoOffDeinit") {
    simState.lifeState = "GO_OFF_DEINIT";
    simState.mrp.ecum = "ECUM_STATE_GO_OFF_ONE";
    simState.activeArrows.push("arr_bswm_ecum");
    pushTrace("EcuM_SelectShutdownTarget(" + ecucConfig.EcuMShutdownTarget + ", 0)", "Định tuyến đích tắt/khởi động lại nguồn cho EcuM.", "ok");
    pushTrace("EcuM_GoDownHaltPoll(42) -> BswM_Deinit()", "NvM_WriteAll OK: Đưa ECU vào trạng thái " + ecucConfig.EcuMShutdownTarget + " và giải phóng BswM [SWS_BswM_00043].", "ok");
    simState.initialized = false;
    ecucConfig.BswMInitialized = false;
    simState.pipeState = "BSWM_UNINIT";
  }
}

function evaluateRules(changedPortId) {
  refreshRuleMetadataFromConfig();
  let anyChanged = false;
  let anyExecuted = false;
  let anyCond = false;

  const actionPlan = [
    { ruleId: "Rule_01a", trueAL: "AL_StartNvMReadAll", falseAL: null },
    { ruleId: "Rule_01b", trueAL: "AL_EnterRunMode",    falseAL: null },
    { ruleId: "Rule_02",  trueAL: "AL_EnableTxRxDM",    falseAL: ecucConfig.Rule02_EnableFalseActionList ? "AL_DisableTxRxDM" : null },
    { ruleId: "Rule_03",  trueAL: "AL_SilentOrBusOff",  falseAL: "AL_SilentFalseCheck" },
    { ruleId: "Rule_04",  trueAL: "AL_DcmDisableNormNm",falseAL: "AL_DcmRestoreAll" },
    { ruleId: "Rule_05",  trueAL: "AL_EnablePnc16Pdu",  falseAL: "AL_DisablePnc16Pdu" },
    { ruleId: "Rule_06",  trueAL: "AL_SwcSportMode",    falseAL: "AL_SwcNormalMode" },
    { ruleId: "Rule_06b", trueAL: "AL_OnTimerExpired",  falseAL: null },
    { ruleId: "Rule_07",  trueAL: "AL_PrepShutdown",    falseAL: null },
    { ruleId: "Rule_08",  trueAL: "AL_GoOffDeinit",     falseAL: null }
  ];

  simState.pipeState = "BSWM_ARBITRATING_RULES";

  actionPlan.forEach((p) => {
    const r = simState.rules.find((x) => x.id === p.ruleId);
    if (!r) return;
    if (changedPortId && ecucConfig.EnableIndependentRuleEvaluation && !r.deps.includes(changedPortId)) {
      return;
    }
    const prev = r.currResult;
    const valBool = computeRuleBoolean(r.id);
    const curr = valBool ? "BSWM_TRUE" : "BSWM_FALSE";
    r.prevResult = prev;
    r.currResult = curr;
    let subModeChanged = false;
    if (r.id === "Rule_04" && simState._lastDcmRuleMode !== simState.mrp.dcm) {
      subModeChanged = valBool && (simState._lastDcmRuleMode !== undefined);
      simState._lastDcmRuleMode = simState.mrp.dcm;
    } else if (r.id === "Rule_05" && simState._lastPncRuleMode !== simState.mrp.pnc16) {
      subModeChanged = !valBool && (simState._lastPncRuleMode !== undefined);
      simState._lastPncRuleMode = simState.mrp.pnc16;
    }
    r.lastChanged = (prev !== curr) || subModeChanged;
    simState.lastEvaluatedRuleId = r.id;
    simState.ruleExprTrueFlag = valBool;

    if (r.lastChanged) anyChanged = true;
    const isCond = (r.execType === "BSWM_CONDITION");
    if (isCond) anyCond = true;

    const targetAL = valBool ? p.trueAL : p.falseAL;
    if (targetAL && (r.lastChanged || isCond)) {
      anyExecuted = true;
      r.lastStatus = (isCond ? "COND ▶ " : "TRIG ▶ ") + targetAL;
      runActionList(targetAL, r);
    } else if (!targetAL && r.lastChanged) {
      r.lastStatus = "Changed (No FalseAL)";
    } else {
      r.lastStatus = "SKIP (Unchanged)";
    }
  });

  simState.ruleChangedFlag = anyChanged;
  simState.actCondFlag = anyCond;
  if (!anyExecuted) {
    simState.pipeState = simState.deferredQueue.length ? "BSWM_DEFERRED_QUEUED" : (simState.initialized ? "BSWM_SKIP_ACTION_LIST" : "BSWM_UNINIT");
  } else if (simState.initialized) {
    simState.pipeState = simState.deferredQueue.length ? "BSWM_DEFERRED_QUEUED" : "BSWM_IDLE_INITIALIZED";
  }
}

function updateDerivedRegisters() {
  // Thanh A: BswM_ArbitrationStatusByte
  let a = 0;
  if (simState.initialized) a |= 0x80;
  if (simState.immProcActive) a |= 0x40;
  if (simState.deferredQueue.length > 0) a |= 0x20;
  if (simState.ruleExprTrueFlag) a |= 0x10;
  if (simState.ruleChangedFlag) a |= 0x08;
  if (simState.actCondFlag) a |= 0x04;
  if (simState.timerRunning) a |= 0x02;
  if (simState.rteStarted) a |= 0x01;
  simState.regAByte = a & 0xFF;

  // Thanh B: BswM_ActionControlByte
  let b = 0;
  if (simState.commAllowedCh0) b |= 0x80;
  if ((simState.ipduVecByte & 0x01) !== 0) b |= 0x40;
  if ((simState.ipduVecByte & 0x02) !== 0) b |= 0x20;
  if ((simState.ipduVecByte & 0x04) !== 0) b |= 0x10;
  if ((simState.ipduVecByte & 0x80) !== 0) b |= 0x08;
  if (simState.mrp.dcm !== "DCM_ENABLE_RX_TX_NORM_NM") b |= 0x04;
  if (simState.abortOnFailTriggered) b |= 0x02;
  if (simState.shutdownActive) b |= 0x01;
  simState.regBByte = b & 0xFF;
}

function processModePortUpdate(portId, newVal, apiName, callerModId, arrowId, forcedImmediate) {
  if (!simState.initialized) {
    beginStepSnapshot(false);
    reportDetError("0x10", "BSWM_E_NO_INIT", "0x01", "Gọi " + apiName + " khi BswM đang ở BSWM_UNINIT!", false);
    updateDerivedRegisters();
    return false;
  }

  const def = MRP_DEFS.find((d) => d.id === portId);
  const procMode = forcedImmediate ? "BSWM_IMMEDIATE" : (def ? ecucConfig[def.procKey] : "BSWM_DEFERRED");
  const isImmediate = (procMode === "BSWM_IMMEDIATE") && !simState.reentrancyBusy;

  beginStepSnapshot(isImmediate);
  if (arrowId) simState.activeArrows.push(arrowId);
  simState.changedMrp = portId;
  simState.mrp[portId] = newVal;

  if (simState.reentrancyBusy) {
    simState.deferredQueue.push({ portId, value: newVal, sourceApi: apiName, callerModId, enqueuedMs: simState.clockMs });
    simState.pipeState = "BSWM_DEFERRED_QUEUED";
    pushTrace(apiName, "[RE-ENTRANCY GUARD SWS_BswM_00143] BswM đang bận xử lý vùng găng -> Hoãn vào Deferred Queue chờ MainFunction!", "warn");
  } else if (isImmediate) {
    simState.reentrancyBusy = true;
    pushTrace(apiName, "[BSWM_IMMEDIATE SWS_BswM_00051] Cập nhật " + def.label + " = " + newVal + " và đánh giá Rule ngay trong ngữ cảnh Caller.", "info");
    evaluateRules(portId);
    simState.reentrancyBusy = false;
  } else {
    simState.deferredQueue.push({ portId, value: newVal, sourceApi: apiName, callerModId, enqueuedMs: simState.clockMs });
    simState.pipeState = "BSWM_DEFERRED_QUEUED";
    pushTrace(apiName, "[BSWM_DEFERRED SWS_BswM_00052] Ghi nhận " + def.label + " = " + newVal + " vào Deferred Queue (Chờ BswM_MainFunction).", "info");
  }

  updateDerivedRegisters();
  return true;
}

// -------------------- STANDARD AUTOSAR R22-11 / R23-11 APIS --------------------

function api_BswM_Init(configPtrValid) {
  beginStepSnapshot(false);
  if (configPtrValid === false) {
    reportDetError("0x00", "BSWM_E_PARAM_CONFIG", "0x06", "Gọi BswM_Init(NULL_PTR) với con trỏ cấu hình không hợp lệ!", false);
    updateDerivedRegisters();
    return;
  }
  const t = simState.clockMs;
  simState = createInitialSimState();
  simState.clockMs = t;
  ecucConfig.BswMInitialized = true;
  simState.initialized = true;
  simState.activeArrows.push("arr_ecum_bswm");
  pushTrace("BswM_Init(&BswM_Config) [SWS_BswM_00002]", "Khởi tạo mọi MRP về InitValue, Rule InitState (R2=" + ecucConfig.Rule02_ComMFull_InitState + "), IPduVec = 0x20 (chỉ giữ Diag).", "ok");
  updateDerivedRegisters();
}

function api_BswM_Deinit() {
  beginStepSnapshot(false);
  simState.initialized = false;
  ecucConfig.BswMInitialized = false;
  simState.pipeState = "BSWM_UNINIT";
  simState.activeArrows.push("arr_bswm_ecum");
  pushTrace("BswM_Deinit() [SWS_BswM_00043]", "Giải phóng BswM về trạng thái BSWM_UNINIT.", "warn");
  updateDerivedRegisters();
}

function api_BswM_EcuM_CurrentState(stateVal) {
  return processModePortUpdate("ecum", stateVal, "BswM_EcuM_CurrentState(" + stateVal + ")", "MOD_ECUM", "arr_ecum_bswm");
}

function api_BswM_NvM_CurrentJobMode(serviceId, jobMode) {
  simState.nvmJobType = serviceId;
  return processModePortUpdate("nvm", jobMode, "BswM_NvM_CurrentJobMode(" + serviceId + ", " + jobMode + ")", "MOD_NVM", "arr_nvm_bswm");
}

function api_BswM_ComM_CurrentMode(channelId, modeVal) {
  if (!simState.initialized) {
    beginStepSnapshot(false);
    reportDetError("0x0E", "BSWM_E_NO_INIT", "0x01", "Gọi BswM_ComM_CurrentMode() khi BswM chưa Init!", false);
    updateDerivedRegisters();
    return false;
  }
  if (channelId > 3) {
    beginStepSnapshot(false);
    reportDetError("0x0E", "BSWM_E_REQ_USER_OUT_OF_RANGE", "0x04", "Network channelId=" + channelId + " vượt quá cấu hình!", false);
    updateDerivedRegisters();
    return false;
  }
  return processModePortUpdate("comm", modeVal, "BswM_ComM_CurrentMode(" + channelId + ", " + modeVal + ")", "MOD_COMM", "arr_comm_bswm");
}

function api_BswM_ComM_CurrentPNCMode(pncId, pncMode) {
  return processModePortUpdate("pnc16", pncMode, "BswM_ComM_CurrentPNCMode(" + pncId + ", " + pncMode + ")", "MOD_COMM", "arr_comm_bswm");
}

function api_BswM_CanSM_CurrentState(channelId, stateVal) {
  return processModePortUpdate("cansm", stateVal, "BswM_CanSM_CurrentState(" + channelId + ", " + stateVal + ")", "MOD_CANSM", "arr_cansm_bswm");
}

function api_BswM_Dcm_CommunicationMode_CurrentState(channelId, dcmMode) {
  ecucConfig.DcmCommunicationControlMode = dcmMode;
  return processModePortUpdate("dcm", dcmMode, "BswM_Dcm_CommunicationMode_CurrentState(" + channelId + ", " + dcmMode + ")", "MOD_DCM", "arr_dcm_bswm");
}

function api_Swc_ModeRequest(appMode) {
  return processModePortUpdate("swc", appMode, "Rte_Write_MRP_SwcModeReq_requestedMode(" + appMode + ")", "MOD_RTE", "arr_rte_bswm");
}

function api_BswM_RequestMode(userId, reqMode) {
  beginStepSnapshot(false);
  if (!simState.initialized) {
    reportDetError("0x02", "BSWM_E_NO_INIT", "0x01", "Gọi BswM_RequestMode(" + userId + ", " + reqMode + ") khi chưa Init!", false);
    updateDerivedRegisters();
    return "E_NOT_OK";
  }
  const { maxUser, maxMode } = parseGenericConfig();
  if (userId > maxUser || userId < 0) {
    reportDetError("0x02", "BSWM_E_REQ_USER_OUT_OF_RANGE", "0x04", "requesting_user=" + userId + " > MaxUser=" + maxUser + "!", false);
    updateDerivedRegisters();
    return "E_NOT_OK";
  }
  if (reqMode > maxMode || reqMode < 0) {
    reportDetError("0x02", "BSWM_E_REQ_MODE_OUT_OF_RANGE", "0x05", "requested_mode=" + reqMode + " > MaxMode=" + maxMode + "!", false);
    updateDerivedRegisters();
    return "E_NOT_OK";
  }
  const mappedMode = reqMode === 2 ? "APP_MODE_SPORT" : (reqMode === 1 ? "APP_MODE_ECO" : "APP_MODE_NORMAL");
  return processModePortUpdate("swc", mappedMode, "BswM_RequestMode(User=" + userId + ", Mode=" + reqMode + " -> " + mappedMode + ")", "MOD_SWC", "arr_rte_bswm");
}

function api_BswM_GetVersionInfo(isNullPtr) {
  beginStepSnapshot(false);
  if (isNullPtr) {
    reportDetError("0x01", "BSWM_E_NULL_POINTER", "0x02", "Truyền NULL_PTR vào BswM_GetVersionInfo(NULL_PTR)!", false);
  } else {
    pushTrace("BswM_GetVersionInfo(&verInfo)", "Trả về VendorID=0x001E, ModuleID=42, AUTOSAR R23-11.", "ok");
  }
  updateDerivedRegisters();
}

function api_BswM_TimerControl(startFlag, durationMs, silentSub) {
  if (!silentSub) beginStepSnapshot(false);
  if (startFlag) {
    simState.timerRunning = true;
    simState.timerLeftMs = Math.max(10, durationMs || Number(ecucConfig.BswMTimerValue) || 300);
    simState.mrp.timer = "BSWM_TIMER_STARTED";
    pushTrace("BswMTimerControl(Timer_0, START, " + simState.timerLeftMs + "ms)", "Khởi chạy bộ đếm nội bộ BswMTimer_0 [SWS_BswM_00205].", "info");
  } else {
    simState.timerRunning = false;
    simState.timerLeftMs = 0;
    simState.mrp.timer = "BSWM_TIMER_STOPPED";
    pushTrace("BswMTimerControl(Timer_0, STOP)", "Dừng bộ đếm BswMTimer_0 trước khi hết hạn.", "warn");
  }
  if (!silentSub) updateDerivedRegisters();
}

function api_BswM_WdgM_RequestPartitionReset() {
  beginStepSnapshot(true);
  simState.wdgmFault = true;
  simState.activeArrows.push("arr_nvm_bswm", "arr_bswm_com", "arr_bswm_ecum");
  if (ecucConfig.EnableWdgMPartitionResetRule) {
    setIpduMask(0x01 | 0x04 | 0x80, false);
    simState.lifeState = "PREP_SHUTDOWN";
    pushTrace("BswM_WdgM_RequestPartitionReset(App_0) [SWS_BswM_00156]", "WdgM phát hiện lỗi giám sát -> BswM lập tức ngắt Tx PDU & kích hoạt Reset phân vùng/ECU!", "err");
  } else {
    pushTrace("BswM_WdgM_RequestPartitionReset(App_0)", "EnableWdgMPartitionResetRule đang TẮT nên bỏ qua.", "warn");
  }
  updateDerivedRegisters();
}

function stepClockTick(dtMs) {
  const step = Math.max(1, Number(dtMs) || Number(ecucConfig.BswMMainFunctionPeriod) || 10);
  beginStepSnapshot(false);
  simState.clockMs += step;

  if (!simState.initialized) {
    reportDetError("0x03", "BSWM_E_NO_INIT", "0x01", "BswM_MainFunction() được gọi khi chưa BswM_Init()!", false);
    updateDerivedRegisters();
    if (typeof renderAll === "function") renderAll();
    return;
  }

  // 1. Update BswMTimer
  let timerJustExpired = false;
  if (simState.timerRunning && simState.timerLeftMs > 0) {
    simState.timerLeftMs = Math.max(0, simState.timerLeftMs - step);
    if (simState.timerLeftMs === 0) {
      simState.timerRunning = false;
      simState.mrp.timer = "BSWM_TIMER_EXPIRED";
      timerJustExpired = true;
      pushTrace("BswMTimer_0 EXPIRED (0 ms)", "Bộ đếm nội bộ chạm 0ms -> MRP_Timer0_State = BSWM_TIMER_EXPIRED!", "warn");
    }
  }

  // 2. Drain Deferred Request Queue
  const queued = simState.deferredQueue.slice();
  simState.deferredQueue = [];

  if (queued.length > 0 || timerJustExpired) {
    const names = queued.map((q) => q.portId + "=" + q.value).join(", ");
    pushTrace("BswM_MainFunction() [+" + step + "ms]", "Xả hàng đợi DEFERRED (" + queued.length + " mục: " + (names || "TimerExpired") + ") và đánh giá lại BswMRule.", "info");
    if (queued.length > 0 && ecucConfig.EnableIndependentRuleEvaluation) {
      queued.forEach((q) => evaluateRules(q.portId));
      if (timerJustExpired) evaluateRules("timer");
    } else {
      evaluateRules(null);
    }
  } else {
    // Re-evaluate all rules (especially BSWM_CONDITION ActionLists!)
    evaluateRules(null);
    const hasCond = simState.rules.some((r) => r.execType === "BSWM_CONDITION" && r.currResult === "BSWM_TRUE");
    if (hasCond) {
      pushTrace("BswM_MainFunction() [+" + step + "ms]", "Chu kỳ MainFunction thực thi lặp lại ActionList kiểu BSWM_CONDITION.", "info");
    } else {
      pushTrace("BswM_MainFunction() [+" + step + "ms]", "Chu kỳ MainFunction hoàn tất (Queue trống, các Rule BSWM_TRIGGER không đổi trạng thái -> Skip).", "info");
    }
  }

  updateDerivedRegisters();
  if (typeof renderAll === "function") {
    simState.stepExplain = "⏱ Tick BswM_MainFunction() (+" + step + "ms → t = " + simState.clockMs + "ms). Queue còn " + simState.deferredQueue.length + " mục.";
    renderAll();
  }
}

function testReentrancyConflict() {
  simState.reentrancyBusy = true;
  api_BswM_ComM_CurrentMode(0, "COMM_FULL_COMMUNICATION");
  simState.reentrancyBusy = false;
}

// -------------------- INTERACTIVE BIT / PORT / CONFIG HANDLERS --------------------

function cycleMrpPort(portId) {
  const def = MRP_DEFS.find((d) => d.id === portId);
  if (!def) return;
  const idx = def.cycles.indexOf(simState.mrp[portId]);
  const nextVal = def.cycles[(idx + 1) % def.cycles.length];
  if (portId === "ecum") api_BswM_EcuM_CurrentState(nextVal);
  else if (portId === "nvm") api_BswM_NvM_CurrentJobMode(simState.lifeState === "PREP_SHUTDOWN" ? "NVM_WRITE_ALL" : "NVM_READ_ALL", nextVal);
  else if (portId === "comm") api_BswM_ComM_CurrentMode(0, nextVal);
  else if (portId === "cansm") api_BswM_CanSM_CurrentState(0, nextVal);
  else if (portId === "dcm") api_BswM_Dcm_CommunicationMode_CurrentState(0, nextVal);
  else if (portId === "swc") api_Swc_ModeRequest(nextVal);
  else if (portId === "pnc16") api_BswM_ComM_CurrentPNCMode(16, nextVal);
  else if (portId === "timer") {
    if (nextVal === "BSWM_TIMER_STARTED") api_BswM_TimerControl(true, Number(ecucConfig.BswMTimerValue) || 300);
    else if (nextVal === "BSWM_TIMER_EXPIRED") {
      beginStepSnapshot(false);
      simState.timerRunning = false;
      simState.timerLeftMs = 0;
      simState.mrp.timer = "BSWM_TIMER_EXPIRED";
      evaluateRules("timer");
      updateDerivedRegisters();
    } else api_BswM_TimerControl(false);
  }
  syncConfigToDOM();
  simState.stepExplain = "Click trực tiếp MRP: Đổi " + def.label + " → " + nextVal + ".";
  if (typeof renderAll === "function") renderAll();
}

function toggleIpduBit(mask) {
  beginStepSnapshot(false);
  const slot = IPDU_GROUP_SLOTS.find((s) => s.mask === mask);
  const nextOn = (simState.ipduVecByte & mask) === 0;
  setIpduMask(mask, nextOn);
  if (slot) {
    if (mask === 0x80) pushTrace(nextOn ? "PduR_EnableRouting(RPG_0_Gateway)" : "PduR_DisableRouting(RPG_0_Gateway, FALSE)", "Thao tác trực tiếp trên vector PduR RPG.", nextOn ? "ok" : "warn");
    else if (mask === 0x04) pushTrace(nextOn ? "Com_EnableReceptionDM(IG_2_Rx_DM)" : "Com_DisableReceptionDM(IG_2_Rx_DM)", "Thao tác trực tiếp trên vector Reception DM.", nextOn ? "ok" : "warn");
    else pushTrace((nextOn ? "Com_IpduGroupStart(" : "Com_IpduGroupStop(") + slot.id + ")", "Thao tác trực tiếp bit " + slot.shortName + " trên Com_IpduGroupVector.", nextOn ? "ok" : "warn");
    simState.stepExplain = "Toggle trực tiếp I-PDU Vector: " + slot.id + " = " + (nextOn ? "ON (1)" : "OFF (0)") + ".";
  }
  updateDerivedRegisters();
  if (typeof renderAll === "function") renderAll();
}

function toggleRegisterBit(regType, mask) {
  if (regType === "A") {
    if (mask === 0x80) {
      ecucConfig.BswMInitialized = !simState.initialized;
      simState.initialized = ecucConfig.BswMInitialized;
      pushTrace("Toggle Bit 7 (BSWM_INIT)", "Chuyển trạng thái khởi tạo BswM sang " + (simState.initialized ? "BSWM_INIT" : "BSWM_UNINIT"), simState.initialized ? "ok" : "err");
    } else if (mask === 0x20 && simState.deferredQueue.length > 0) {
      stepClockTick(Number(ecucConfig.BswMMainFunctionPeriod) || 10);
      return;
    } else if (mask === 0x02) {
      api_BswM_TimerControl(!simState.timerRunning, Number(ecucConfig.BswMTimerValue) || 300);
    } else if (mask === 0x01) {
      beginStepSnapshot(false);
      simState.rteStarted = !simState.rteStarted;
      pushTrace(simState.rteStarted ? "Rte_Start()" : "Rte_Stop()", "Toggle trực tiếp trạng thái RTE.", "info");
    }
  } else {
    if (mask === 0x80) {
      beginStepSnapshot(false);
      simState.commAllowedCh0 = !simState.commAllowedCh0;
      pushTrace("ComM_CommunicationAllowed(Ch0, " + (simState.commAllowedCh0 ? "TRUE" : "FALSE") + ")", "Toggle trực tiếp cổng cho phép ComM.", "info");
    } else if (mask === 0x40) { toggleIpduBit(0x01); return; }
    else if (mask === 0x20) { toggleIpduBit(0x02); return; }
    else if (mask === 0x10) { toggleIpduBit(0x04); return; }
    else if (mask === 0x08) { toggleIpduBit(0x80); return; }
    else if (mask === 0x04) {
      const nextMode = simState.mrp.dcm === "DCM_ENABLE_RX_TX_NORM_NM" ? "DCM_DISABLE_RX_TX_NORM_NM" : "DCM_ENABLE_RX_TX_NORM_NM";
      api_BswM_Dcm_CommunicationMode_CurrentState(0, nextMode);
    } else if (mask === 0x02) {
      ecucConfig.InjectActionItemFailure = !ecucConfig.InjectActionItemFailure;
    } else if (mask === 0x01) {
      api_BswM_EcuM_CurrentState(simState.shutdownActive ? "ECUM_STATE_RUN" : "ECUM_STATE_PREP_SHUTDOWN");
    }
  }
  syncConfigToDOM();
  updateDerivedRegisters();
  if (typeof renderAll === "function") renderAll();
}

function syncConfigToDOM() {
  Object.keys(defaultConfig).forEach((k) => {
    const el = document.getElementById("cfg_" + k);
    if (!el) return;
    if (el.type === "checkbox") el.checked = Boolean(ecucConfig[k]);
    else el.value = String(ecucConfig[k]);
  });
}

function onConfigInputChanged(key) {
  const el = document.getElementById("cfg_" + key);
  if (!el) return;
  if (el.type === "checkbox") ecucConfig[key] = el.checked;
  else if (el.type === "number") ecucConfig[key] = Math.max(0, Number(el.value) || 0);
  else ecucConfig[key] = el.value;

  if (key === "BswMInitialized") {
    simState.initialized = ecucConfig.BswMInitialized;
    simState.pipeState = simState.initialized ? "BSWM_IDLE_INITIALIZED" : "BSWM_UNINIT";
  } else if (key === "DcmCommunicationControlMode") {
    api_BswM_Dcm_CommunicationMode_CurrentState(0, ecucConfig.DcmCommunicationControlMode);
  } else if (key === "Rule02_LogicalOperator" || key === "AL_EnableTxRxDM_Execution" || key === "AL_SwcSportMode_Execution" || key === "Rule02_EnableFalseActionList") {
    refreshRuleMetadataFromConfig();
    evaluateRules(null);
  } else if (key === "Rule02_ComMFull_InitState") {
    const r2 = simState.rules.find((r) => r.id === "Rule_02");
    if (r2) r2.currResult = ecucConfig.Rule02_ComMFull_InitState;
  }

  updateDerivedRegisters();
  simState.stepExplain = "Cập nhật tham số ECUC: " + key + " = " + ecucConfig[key] + ".";
  if (typeof renderAll === "function") renderAll();
}
