// ==================== PART 4: DET ENGINE, STATE MACHINE, 8-BIT REGISTERS & CODE GENERATORS ====================

const defaultConfig = {
  // Tab 0: General & Lifecycle
  DetInitialized: true,
  DetStarted: true,
  DetVersionInfoApi: true,
  DetReportRuntimeErrorCalloutEnabled: true,
  DetReportTransientFaultCalloutEnabled: true,
  EcuBuildProfile: "DEV_DEBUG_BUILD",

  // Tab 1: Dev Error & Halt
  CallerDevErrorDetect: true,
  DetEndlessLoopInDevError: false,
  TriggerHardwareBkptInstruction: false,
  ProtectReentrancyWithSchM: true,
  PreventRecursiveHookCall: true,
  MaxHookExecutionTimeUs: 50,

  // Tab 2: Runtime & Transient
  LogRuntimeErrorsToBuffer: true,
  LogTransientFaultsToBuffer: true,
  TransientFaultRecoveryPolicy: "AUTO_CORRECT_AND_RETURN_E_OK",
  MaxTransientFaultRetries: 3,
  EnableSideBySideDemComparison: true,
  SaveCrashCrumbToNoInitRam: true,

  // Tab 3: Hooks & DLT
  DetForwardToDlt: true,
  DltAppIdAndContextId: "DET / ERRS",
  DetErrorHook_0_Enabled: true,
  DetErrorHook_1_Enabled: true,
  DetRuntimeErrorCallout_0_Enabled: true,
  DetTransientFaultCallout_0_Enabled: true,

  // Tab 4: RAM Buffer & Filters
  DetErrorBufferSize: 8,
  DetBufferOverflowMode: "FIFO_OVERWRITE_OLDEST",
  DetGlobalFilterEnabled: false,
  DetGlobalFilterRule: "60:0x05",
  DetBreakpointFilterEnabled: false,
  DetBreakpointFilterRule: "20:0x15",

  // Tab 5: SWC RTE Service Ports
  SwcBrake_DetPortEnabled: true,
  SwcBrake_DetModuleId: 2048,
  SwcBrake_DefaultInstanceId: 0,
  SwcDiag_DetPortEnabled: true,
  SwcDiag_DetModuleId: 2049,
  CustomInject4Tuple: "60,0,0x05,0x11"
};

let cfg = Object.assign({}, defaultConfig);
let simState = null;

function createEmptyBuffer() {
  const arr = [];
  for (let i = 0; i < 8; i++) {
    arr.push({
      slot: i,
      valid: false,
      seq: 0,
      stream: "-",
      modId: 0,
      instId: 0,
      apiId: 0,
      errId: 0,
      modName: "-",
      apiName: "-",
      errName: "-",
      ctx: "-",
      corrupted: false,
      note: ""
    });
  }
  return arr;
}

function createInitialSimState() {
  return {
    lifecycleState: cfg.DetStarted ? "DET_STARTED" : (cfg.DetInitialized ? "DET_INIT" : "DET_UNINIT"),
    loopHaltState: "NORMAL_EXEC",
    execContext: "Task_10ms",
    selectedModule: "MOD_DET",
    selectedBufferSlot: -1,
    lastPacket: {
      stream: "IDLE",
      modId: 0,
      instId: 0,
      apiId: 0,
      errId: 0,
      modName: "None",
      apiName: "None",
      errName: "None",
      caller: "-",
      retVal: "E_OK",
      viaRte: false,
      isr: false,
      globalFiltered: false,
      bkptMatched: false,
      selfErr: false,
      demHint: ""
    },
    counts: {
      dev: 0,
      runtm: 0,
      trans: 0,
      dlt: 0,
      ovf: 0,
      droppedByFilter: 0,
      droppedPreInit: 0,
      skippedCallerOff: 0,
      demEscalations: 0
    },
    buffer: createEmptyBuffer(),
    bufWriteIdx: 0,
    bufUsed: 0,
    bufLocked: false,
    pipeline: {
      guard: { st: "IDLE", cls: "" },
      filter: { st: "IDLE", cls: "" },
      hook: { st: "IDLE", cls: "" },
      dlt: { st: "IDLE", cls: "" },
      buf: { st: "IDLE", cls: "" },
      exit: { st: "IDLE", cls: "" }
    },
    activeArrows: {},
    activeModules: { MOD_DET: true },
    lastFlags: {
      hookExec: false,
      glbFilter: false,
      brkFilter: false,
      fltReject: false,
      selfErr: false,
      dltFwd: false,
      isrPreempt: false,
      viaRte: false
    },
    manualCoreMask: 0,
    manualCoreXor: 0,
    manualPipeMask: 0,
    manualPipeXor: 0,
    demEvents: [],
    traceLog: [],
    traceSeq: 0
  };
}

function parseIntAny(val) {
  if (typeof val === "number") return isNaN(val) ? 0 : Math.floor(val);
  const s = String(val || "").trim();
  if (!s) return 0;
  if (s.toLowerCase().startsWith("0x")) return parseInt(s, 16) || 0;
  return parseInt(s, 10) || 0;
}

function fmtHex(n, digits) {
  const d = digits || 2;
  return "0x" + ((Number(n) >>> 0).toString(16).toUpperCase().padStart(d, "0"));
}

function decode4Tuple(modId, instId, apiId, errId) {
  const m = MODULE_DICT[modId];
  const modName = m ? m.name : ("Mod_" + modId);
  const apiName = API_DICT[modId + ":" + apiId] || ("Api_" + fmtHex(apiId, 2));
  const errName = ERROR_DICT[modId + ":" + errId] || ("Err_" + fmtHex(errId, 2));
  return { modName, apiName, errName };
}

function matchesFilterRule(modId, errId, ruleStr) {
  const parts = String(ruleStr || "").split(":");
  if (parts.length !== 2) return false;
  const rMod = parts[0].trim();
  const rErr = parts[1].trim();
  const modMatch = (rMod === "*") || (parseIntAny(rMod) === Number(modId));
  const errMatch = (rErr === "*") || (parseIntAny(rErr) === Number(errId));
  return modMatch && errMatch;
}

function addTrace(tag, title, detail, swsRef) {
  simState.traceSeq += 1;
  simState.traceLog.unshift({
    seq: simState.traceSeq,
    tag: tag,
    title: title,
    detail: detail,
    sws: swsRef || "SWS_Det",
    ctx: simState.execContext
  });
  if (simState.traceLog.length > 80) simState.traceLog.pop();
}

function clearFlowHighlights() {
  simState.activeArrows = {};
  simState.activeModules = {};
}

function resetPipeline() {
  simState.pipeline = {
    guard: { st: "IDLE", cls: "" },
    filter: { st: "IDLE", cls: "" },
    hook: { st: "IDLE", cls: "" },
    dlt: { st: "IDLE", cls: "" },
    buf: { st: "IDLE", cls: "" },
    exit: { st: "IDLE", cls: "" }
  };
}

function applyBuildProfile(profile) {
  cfg.EcuBuildProfile = profile;
  if (profile === "DEV_DEBUG_BUILD") {
    cfg.CallerDevErrorDetect = true;
    cfg.DetEndlessLoopInDevError = true;
    cfg.DetForwardToDlt = true;
    cfg.LogRuntimeErrorsToBuffer = true;
    cfg.LogTransientFaultsToBuffer = true;
  } else if (profile === "INTEGRATION_TEST_BUILD") {
    cfg.CallerDevErrorDetect = true;
    cfg.DetEndlessLoopInDevError = false;
    cfg.DetForwardToDlt = true;
    cfg.LogRuntimeErrorsToBuffer = true;
    cfg.LogTransientFaultsToBuffer = true;
  } else if (profile === "PRODUCTION_SERIES_BUILD") {
    cfg.CallerDevErrorDetect = false;
    cfg.DetEndlessLoopInDevError = false;
    cfg.TriggerHardwareBkptInstruction = false;
    cfg.DetForwardToDlt = false;
    cfg.LogRuntimeErrorsToBuffer = true;
    cfg.LogTransientFaultsToBuffer = true;
  }
}

// ==================== DET LIFECYCLE & DIAGNOSTIC APIS ====================

function api_Det_Init(configPtrLabel) {
  const ptrLbl = configPtrLabel || "NULL_PTR";
  cfg.DetInitialized = true;
  simState.lifecycleState = cfg.DetStarted ? "DET_STARTED" : "DET_INIT";
  simState.loopHaltState = "NORMAL_EXEC";
  simState.buffer = createEmptyBuffer();
  simState.bufWriteIdx = 0;
  simState.bufUsed = 0;
  simState.bufLocked = false;
  simState.counts.ovf = 0;
  simState.selectedBufferSlot = -1;
  clearFlowHighlights();
  resetPipeline();
  simState.pipeline.guard = { st: "Det_Init OK", cls: "pass" };
  simState.pipeline.buf = { st: "RAM Zeroed", cls: "pass" };
  simState.activeArrows = { arr_ecum_det: "active-ok" };
  simState.activeModules = { MOD_ECUM: true, MOD_DET: true };
  addTrace("OK", "Det_Init(" + ptrLbl + ") [SID 0x00]",
    "EcuM_AL_DriverInitZero() khởi tạo Det, reset toàn bộ Det_ErrorBuffer[] về 0. Trạng thái: DET_INIT.",
    "SWS_Det_00019 / SWS_Det_00204");
}

function api_Det_Start() {
  if (!cfg.DetInitialized) {
    simState.pipeline.guard = { st: "ERR: UNINIT", cls: "halt" };
    addTrace("DEV", "Det_Start() called before Det_Init()",
      "Lỗi trình tự khởi tạo! Det_Init() chưa chạy nên Det_Start() không hợp lệ.",
      "SWS_Det_00025");
    return "E_NOT_OK";
  }
  cfg.DetStarted = true;
  simState.lifecycleState = "DET_STARTED";
  clearFlowHighlights();
  resetPipeline();
  simState.pipeline.guard = { st: "DET_STARTED", cls: "pass" };
  simState.pipeline.dlt = { st: cfg.DetForwardToDlt ? "DLT Ready" : "DLT Off", cls: cfg.DetForwardToDlt ? "pass" : "skip" };
  simState.activeArrows = { arr_ecum_det: "active-ok" };
  simState.activeModules = { MOD_ECUM: true, MOD_DET: true };
  addTrace("OK", "Det_Start() [SID 0x02]",
    "EcuM_StartupTwo() kích hoạt Det_Start(). Kênh DLT & Callout sẵn sàng phục vụ Runtime.",
    "SWS_Det_00025");
  return "E_OK";
}

function api_Det_GetVersionInfo(isNullPtr) {
  if (!cfg.DetVersionInfoApi) {
    addTrace("INFO", "Det_GetVersionInfo() Disabled",
      "DetVersionInfoApi = FALSE trong ECUC -> API không được biên dịch.",
      "ECUC_Det_00003");
    return;
  }
  if (isNullPtr) {
    addTrace("SELF", "Det_GetVersionInfo(NULL_PTR) [SID 0x03]",
      "Tham số Std_VersionInfoType* là NULL_PTR -> Det tự gọi Det_ReportError(15, 0, 0x03, DET_E_PARAM_POINTER=0x01)!",
      "SWS_Det_00028 / SWS_Det_00301");
    return _executeDetCore("DEV", 15, 0, 0x03, 0x01, "Det_SelfCheck", { bypassCallerDetect: true, selfErr: true });
  }
  clearFlowHighlights();
  simState.activeModules = { MOD_DET: true };
  addTrace("OK", "Det_GetVersionInfo(&verInfo) [SID 0x03]",
    "Trả về vendorID=0x001E, moduleID=15 (0x000F), sw_version=22.11.0.",
    "SWS_Det_00028");
}

function api_BreakEndlessLoop() {
  if (simState.loopHaltState === "NORMAL_EXEC") {
    addTrace("INFO", "Break Endless Loop: CPU đang chạy bình thường",
      "Không có Dev Error halt nào đang giữ CPU.",
      "SWS_Det_00039");
    return;
  }
  simState.loopHaltState = "NORMAL_EXEC";
  simState.pipeline.exit = { st: "Resumed E_OK", cls: "pass" };
  simState.lastPacket.retVal = "E_OK (Resumed by JTAG)";
  clearFlowHighlights();
  simState.activeModules = { MOD_DET: true, MOD_DEBUG_DEM: true };
  addTrace("OK", "Debugger Break Endless Loop -> Resume E_OK",
    "Kỹ sư ghi biến det_halt = 0 qua Trace32/JTAG. CPU thoát while(det_halt) và trả E_OK về cho Caller.",
    "Debugger Recovery");
}

function api_ClearRamBuffer() {
  simState.buffer = createEmptyBuffer();
  simState.bufWriteIdx = 0;
  simState.bufUsed = 0;
  simState.bufLocked = false;
  simState.counts.ovf = 0;
  simState.selectedBufferSlot = -1;
  addTrace("INFO", "RAM Ring Buffer Cleared",
    "Đã xóa sạch 8 slot của Det_ErrorBuffer[] và đặt lại WriteIdx = 0, Overflow = 0.",
    "Buffer Maintenance");
}

function api_Rte_Call_Det(swcKey, instId, apiId, errId, stream) {
  const isDiag = swcKey === "SWC_DiagApp";
  const enabled = isDiag ? cfg.SwcDiag_DetPortEnabled : cfg.SwcBrake_DetPortEnabled;
  const pdavModId = isDiag ? Number(cfg.SwcDiag_DetModuleId) : Number(cfg.SwcBrake_DetModuleId);
  const usedStream = stream || "DEV";

  if (!enabled) {
    clearFlowHighlights();
    simState.activeArrows = { arr_swc_rte: "active-runtm" };
    simState.activeModules = { MOD_SWC: true, MOD_RTE: true };
    addTrace("HOOK", "RTE Blocked: " + swcKey + " DETService Port Disabled",
      "Cổng DETService chưa được bật trong ECUC cho " + swcKey + ". Cuộc gọi Rte_Call bị chặn tại RTE.",
      "SWS_Det_00210");
    return "E_NOT_OK";
  }

  addTrace("INFO", "RTE DETService PDAV Injection (" + swcKey + ")",
    "SWC gọi Rte_Call_DETService(Inst=" + instId + ", Api=" + fmtHex(apiId, 2) + ", Err=" + fmtHex(errId, 2) +
    "). RTE tự động chèn PDAV ModuleId=" + pdavModId + " trước khi gọi Det.",
    "SWS_Det_00210");

  return _executeDetCore(usedStream, pdavModId, instId, apiId, errId, swcKey + " (via RTE)", {
    viaRte: true,
    bypassCallerDetect: usedStream !== "DEV"
  });
}

function api_Det_ReportError(modId, instId, apiId, errId, callerLabel, opts) {
  return _executeDetCore("DEV", modId, instId, apiId, errId, callerLabel || "BSW Caller", opts || {});
}

function api_Det_ReportRuntimeError(modId, instId, apiId, errId, callerLabel, opts) {
  return _executeDetCore("RUNTM", modId, instId, apiId, errId, callerLabel || "BSW Runtime", opts || {});
}

function api_Det_ReportTransientFault(modId, instId, apiId, faultId, callerLabel, opts) {
  return _executeDetCore("TRANS", modId, instId, apiId, faultId, callerLabel || "MCAL Driver", opts || {});
}

function _executeDetCore(stream, modId, instId, apiId, errId, callerLabel, opts) {
  const dec = decode4Tuple(modId, instId, apiId, errId);
  const isrFlag = !!(opts.isrContext || simState.execContext === "ISR_CanRx");
  const viaRte = !!opts.viaRte;
  const selfErr = !!opts.selfErr;
  const arrowTone = stream === "DEV" ? "active-dev" : (stream === "RUNTM" ? "active-runtm" : "active-trans");

  clearFlowHighlights();
  resetPipeline();

  simState.lastFlags = {
    hookExec: false,
    glbFilter: false,
    brkFilter: false,
    fltReject: false,
    selfErr: selfErr,
    dltFwd: false,
    isrPreempt: isrFlag,
    viaRte: viaRte
  };

  // Source layer arrow highlight
  if (viaRte) {
    simState.activeArrows.arr_swc_rte = "active-info";
    simState.activeArrows.arr_rte_det = arrowTone;
    simState.activeModules.MOD_SWC = true;
    simState.activeModules.MOD_RTE = true;
  } else if (Number(modId) === 92 || Number(modId) === 83 || Number(modId) === 120 || Number(modId) === 123) {
    simState.activeArrows.arr_mcal_det = arrowTone;
    simState.activeModules.MOD_MCAL = true;
  } else {
    simState.activeArrows.arr_bsw_det = arrowTone;
    simState.activeModules.MOD_BSW = true;
  }
  simState.activeModules.MOD_DET = true;

  // Stage 0: Caller-side #if (DEV_ERROR_DETECT == STD_ON) compile switch check
  if (stream === "DEV" && !opts.bypassCallerDetect && !cfg.CallerDevErrorDetect) {
    simState.counts.skippedCallerOff += 1;
    simState.pipeline.guard = { st: "CALLER STD_OFF", cls: "skip" };
    simState.pipeline.exit = { st: "No-Op (Prod)", cls: "pass" };
    simState.lastPacket = {
      stream: "SKIPPED_PROD",
      modId, instId, apiId, errId,
      modName: dec.modName, apiName: dec.apiName, errName: dec.errName,
      caller: callerLabel, retVal: "E_OK (Compiled Out)",
      viaRte, isr: isrFlag, globalFiltered: false, bkptMatched: false, selfErr: false,
      demHint: "CallerDevErrorDetect = FALSE (Production Build) -> macro Det_ReportError bị tiền xử lý lược bỏ ở Caller!"
    };
    addTrace("DEV", "[Compiled Out] " + dec.modName + " DevErrorDetect == STD_OFF",
      "Do CallerDevErrorDetect=FALSE (" + cfg.EcuBuildProfile + "), nhánh báo lỗi phát triển 0x01 không tồn tại trong binary Production.",
      "SWS_BSW_00049");
    return "E_OK";
  }

  // Stage 1: DetInitialized Guard (SWS_Det_00204)
  if (!cfg.DetInitialized) {
    simState.counts.droppedPreInit += 1;
    simState.lifecycleState = "DET_UNINIT";
    simState.pipeline.guard = { st: "FAIL: UNINIT", cls: "halt" };
    simState.pipeline.exit = { st: "Safe Drop E_OK", cls: "skip" };
    simState.lastPacket = {
      stream: "PRE_INIT_DROP",
      modId, instId, apiId, errId,
      modName: dec.modName, apiName: dec.apiName, errName: dec.errName,
      caller: callerLabel, retVal: "E_OK (Pre-Init Guard)",
      viaRte, isr: isrFlag, globalFiltered: false, bkptMatched: false, selfErr: false,
      demHint: "Det_Init() chưa chạy! SWS_Det_00204 bảo vệ RAM không bị ghi rác trước EcuM_AL_DriverInitZero."
    };
    addTrace("DEV", "[Pre-Init Guard] Gọi Det khi DET_UNINIT!",
      dec.modName + " gọi " + dec.errName + " trước Det_Init(). Bảo vệ an toàn bỏ qua ghi RAM (SWS_Det_00204).",
      "SWS_Det_00204");
    return "E_OK";
  }

  // Stage 1b: SchM Exclusive Area Guard
  const raceDetected = opts.raceCorrupt && !cfg.ProtectReentrancyWithSchM;
  simState.pipeline.guard = raceDetected
    ? { st: "RACE HAZARD!", cls: "halt" }
    : { st: cfg.ProtectReentrancyWithSchM ? "SchM Locked" : "Unprotected", cls: cfg.ProtectReentrancyWithSchM ? "pass" : "skip" };

  // Increment stream counters
  if (stream === "DEV") simState.counts.dev += 1;
  else if (stream === "RUNTM") simState.counts.runtm += 1;
  else if (stream === "TRANS") simState.counts.trans += 1;

  // Stage 2: Global Filter Check
  const glbFiltered = cfg.DetGlobalFilterEnabled && matchesFilterRule(modId, errId, cfg.DetGlobalFilterRule);
  simState.lastFlags.glbFilter = glbFiltered;
  if (glbFiltered) {
    simState.counts.droppedByFilter += 1;
    simState.pipeline.filter = { st: "SUPPRESSED", cls: "skip" };
  } else {
    simState.pipeline.filter = { st: "PASS", cls: "pass" };
  }

  // Stage 3: Hooks / Callouts
  let retVal = "E_OK";
  let demHint = "";
  if (glbFiltered) {
    simState.pipeline.hook = { st: "Filtered Out", cls: "skip" };
  } else if (stream === "DEV") {
    const h0 = cfg.DetErrorHook_0_Enabled;
    const h1 = cfg.DetErrorHook_1_Enabled;
    if (h0 || h1) {
      simState.lastFlags.hookExec = true;
      simState.activeArrows.arr_det_hooks = "active-info";
      simState.activeModules.MOD_HOOKS = true;
      if (opts.simulateHookRecursion) {
        if (cfg.PreventRecursiveHookCall) {
          simState.pipeline.hook = { st: "Anti-Recurs OK", cls: "pass" };
          addTrace("HOOK", "Anti-Recursion Guard Triggered",
            "DetErrorHook_0 gọi API BSW lại gọi ngược Det_ReportError(). Cờ bảo vệ phát hiện và chặn vòng đệ quy (SWS_Det_00180)!",
            "SWS_Det_00180");
        } else {
          simState.pipeline.hook = { st: "STACK OVERFLOW!", cls: "halt" };
          addTrace("HALT", "CRITICAL: Hook Recursion Stack Overflow!",
            "PreventRecursiveHookCall = FALSE làm Hook đệ quy vô tận gây tràn Stack!",
            "SWS_Det_00180");
        }
      } else {
        const list = (h0 && h1) ? "Hook[0,1]" : (h0 ? "Hook[0]" : "Hook[1]");
        simState.pipeline.hook = { st: list + " OK", cls: "pass" };
        addTrace("HOOK", "Executed " + list + (cfg.SaveCrashCrumbToNoInitRam ? " + NoInit Crumb" : ""),
          "Đồng bộ gọi " + list + " cho 4-Tuple (" + modId + ", " + instId + ", " + fmtHex(apiId, 2) + ", " + fmtHex(errId, 2) + ").",
          "SWS_Det_00014");
      }
    } else {
      simState.pipeline.hook = { st: "Hooks Disabled", cls: "skip" };
    }
  } else if (stream === "RUNTM") {
    if (cfg.DetReportRuntimeErrorCalloutEnabled && cfg.DetRuntimeErrorCallout_0_Enabled) {
      simState.lastFlags.hookExec = true;
      simState.activeArrows.arr_det_hooks = "active-runtm";
      simState.activeModules.MOD_HOOKS = true;
      simState.pipeline.hook = { st: "RuntmCallout OK", cls: "pass" };
      addTrace("HOOK", "Executed DetReportRuntimeErrorCallout_0()",
        "Xử lýRuntime Error của " + dec.modName + ": ghi nhận nghẽn tài nguyên/timeout và luôn trả E_OK.",
        "SWS_Det_00501");
    } else {
      simState.pipeline.hook = { st: "Callout Off", cls: "skip" };
    }
  } else if (stream === "TRANS") {
    if (cfg.DetReportTransientFaultCalloutEnabled && cfg.DetTransientFaultCallout_0_Enabled) {
      simState.lastFlags.hookExec = true;
      simState.activeArrows.arr_det_hooks = "active-trans";
      simState.activeModules.MOD_HOOKS = true;
      if (cfg.TransientFaultRecoveryPolicy === "FAIL_UNCORRECTABLE_RETURN_E_NOT_OK") {
        retVal = "E_NOT_OK (0x01)";
        simState.lastFlags.fltReject = true;
        simState.counts.demEscalations += 1;
        simState.activeArrows.arr_det_dem = "active-dev";
        simState.activeModules.MOD_DEBUG_DEM = true;
        simState.pipeline.hook = { st: "Ret E_NOT_OK!", cls: "halt" };
        demHint = "TransientFaultCallout trả E_NOT_OK -> Driver dừng retry & leo thang báo DEM (Dem_SetEventStatus FAILED)!";
        simState.demEvents.unshift({ seq: simState.traceSeq + 1, mod: dec.modName, fault: dec.errName, action: "DEM_EVENT_STATUS_FAILED" });
        addTrace("DEM", "Transient Fault Uncorrectable -> Escalate to DEM!",
          "DetReportTransientFaultCallout trả E_NOT_OK -> " + dec.modName + " ngừng retry và gọi Dem_SetEventStatus(FAILED) để lưu DTC vào NvM.",
          "SWS_Det_00503");
      } else if (cfg.TransientFaultRecoveryPolicy === "CUSTOM_VENDOR_RETURN_CODE") {
        retVal = "0x02 (VENDOR_RETRY)";
        simState.lastFlags.fltReject = true;
        simState.pipeline.hook = { st: "Ret 0x02 Retry", cls: "skip" };
      } else {
        retVal = "E_OK (Recovered)";
        simState.pipeline.hook = { st: "Ret E_OK", cls: "pass" };
      }
    } else {
      retVal = "E_OK (Default)";
      simState.pipeline.hook = { st: "Callout Off", cls: "skip" };
    }
  }

  // Stage 4: DLT Forwarding (SWS_Det_00211: NEVER forward Transient Fault!)
  if (glbFiltered) {
    simState.pipeline.dlt = { st: "Filtered", cls: "skip" };
  } else if (stream === "TRANS") {
    simState.pipeline.dlt = { st: "SKIP (0x05)", cls: "skip" };
  } else if (cfg.DetForwardToDlt && cfg.DetStarted) {
    simState.counts.dlt += 1;
    simState.lastFlags.dltFwd = true;
    simState.activeArrows.arr_det_dlt = "active-info";
    simState.activeModules.MOD_DLT = true;
    simState.pipeline.dlt = { st: "DLT Sent", cls: "pass" };
    addTrace("DLT", "Dlt_DetForwardErrorTrace(" + cfg.DltAppIdAndContextId + ")",
      "Gửi gói (" + modId + ", " + instId + ", " + fmtHex(apiId, 2) + ", " + fmtHex(errId, 2) + ") qua bus tới PC DLT Viewer.",
      "SWS_Det_00211");
  } else {
    simState.pipeline.dlt = { st: cfg.DetForwardToDlt ? "Wait Det_Start" : "DLT Off", cls: "skip" };
  }

  // Stage 5: RAM Ring Buffer Write
  const allowBuf = !glbFiltered && (
    stream === "DEV" ||
    (stream === "RUNTM" && cfg.LogRuntimeErrorsToBuffer) ||
    (stream === "TRANS" && cfg.LogTransientFaultsToBuffer)
  );
  const cap = Math.max(1, Math.min(8, Number(cfg.DetErrorBufferSize) || 8));

  if (!allowBuf) {
    simState.pipeline.buf = { st: glbFiltered ? "Filtered" : "Log Off", cls: "skip" };
  } else if (simState.bufUsed >= cap && cfg.DetBufferOverflowMode === "STOP_ON_FULL_KEEP_FIRST") {
    simState.counts.ovf += 1;
    simState.bufLocked = true;
    simState.pipeline.buf = { st: "LOCKED (RootKeep)", cls: "skip" };
    simState.activeModules.MOD_BUFFER = true;
    addTrace("INFO", "RAM Buffer STOP_ON_FULL (Bảo toàn lỗi gốc)",
      "Buffer đạt " + cap + "/" + cap + " slot. Chế độ STOP_ON_FULL_KEEP_FIRST từ chối ghi đè để bảo toàn Root-Cause ban đầu.",
      "Buffer Policy");
  } else {
    if (simState.bufUsed >= cap) {
      simState.counts.ovf += 1;
    } else {
      simState.bufUsed += 1;
    }
    const idx = simState.bufWriteIdx % cap;
    simState.buffer[idx] = {
      slot: idx,
      valid: true,
      seq: simState.traceSeq + 1,
      stream: stream,
      modId: modId,
      instId: instId,
      apiId: apiId,
      errId: errId,
      modName: dec.modName,
      apiName: dec.apiName,
      errName: raceDetected ? ("CORRUPTED! " + dec.errName) : dec.errName,
      ctx: simState.execContext,
      corrupted: !!raceDetected,
      note: raceDetected ? "Torn write do tắt SchM_Enter_Det!" : ("Caller: " + callerLabel)
    };
    simState.selectedBufferSlot = idx;
    simState.bufWriteIdx = (idx + 1) % cap;
    simState.activeArrows.arr_det_buf = arrowTone;
    simState.activeModules.MOD_BUFFER = true;
    simState.pipeline.buf = { st: raceDetected ? "CORRUPTED!" : ("Slot[" + idx + "] OK"), cls: raceDetected ? "halt" : "pass" };
  }

  // Stage 6: Breakpoint Filter & Endless Loop (DEV ONLY!)
  const bkptMatched = cfg.DetBreakpointFilterEnabled && matchesFilterRule(modId, errId, cfg.DetBreakpointFilterRule);
  simState.lastFlags.brkFilter = bkptMatched;

  if (stream === "DEV" && (cfg.DetEndlessLoopInDevError || bkptMatched) && !glbFiltered) {
    simState.loopHaltState = "ENDLESS_HALT_BKPT";
    simState.activeArrows.arr_det_halt = "active-dev";
    simState.activeModules.MOD_DEBUG_DEM = true;
    simState.pipeline.exit = { st: cfg.TriggerHardwareBkptInstruction ? "__BKPT(0)+HALT" : "while(1) HALT", cls: "halt" };
    retVal = "HALTED (while(1))";
    addTrace("HALT", "CPU HALTED: Endless Loop / Breakpoint Triggered!",
      (bkptMatched ? "Khớp DetBreakpointFilter (" + cfg.DetBreakpointFilterRule + "). " : "DetEndlessLoopInDevError=TRUE. ") +
      "CPU dừng để JTAG/Trace32 đọc Call Stack. Nhấn 'Break Endless Loop' trên Header để tiếp tục!",
      "SWS_Det_00039");
  } else {
    simState.pipeline.exit = { st: "Ret " + retVal.split(" ")[0], cls: (retVal.startsWith("E_NOT_OK") ? "halt" : "pass") };
  }

  simState.lastPacket = {
    stream, modId, instId, apiId, errId,
    modName: dec.modName, apiName: dec.apiName, errName: dec.errName,
    caller: callerLabel, retVal, viaRte, isr: isrFlag,
    globalFiltered: glbFiltered, bkptMatched, selfErr, demHint
  };

  addTrace(stream, dec.modName + " -> " + dec.errName + " [" + stream + "]",
    "4-Tuple=(" + modId + ", " + instId + ", " + fmtHex(apiId, 2) + ", " + fmtHex(errId, 2) + ") từ " + callerLabel + " -> Return: " + retVal,
    stream === "DEV" ? "SWS_Det_00039" : (stream === "RUNTM" ? "SWS_Det_00501" : "SWS_Det_00502"));

  return retVal;
}

function api_InjectSpecialEvent(kind) {
  if (kind === "STORM_10X") {
    addTrace("INFO", "Burst Storm: Bắt đầu bơm 10 lỗi CanIf liên tiếp...",
      "Mô phỏng bão lỗi từ CanIf_Transmit() nhằm kiểm tra Ring Buffer Overflow & Global Filter.",
      "Stress Test");
    for (let i = 0; i < 10; i++) {
      _executeDetCore("DEV", 60, 0, 0x05, (i % 2 === 0 ? 0x05 : 0x11), "CanIf_Burst#" + (i + 1), {});
      if (simState.loopHaltState === "ENDLESS_HALT_BKPT") break;
    }
  } else if (kind === "ISR_PREEMPT_TASK") {
    const prevCtx = simState.execContext;
    simState.execContext = "Task_10ms";
    _executeDetCore("DEV", 20, 0, 0x07, 0x15, "Task_10ms (NvM)", {});
    simState.execContext = "ISR_CanRx";
    _executeDetCore("RUNTM", 60, 0, 0x14, 0x05, "ISR_CanRx (Preempt!)", {
      isrContext: true,
      raceCorrupt: !cfg.ProtectReentrancyWithSchM
    });
    simState.execContext = prevCtx;
  } else if (kind === "SELF_NULL_PTR") {
    api_Det_GetVersionInfo(true);
  } else if (kind === "PRE_INIT_CALL") {
    const prevInit = cfg.DetInitialized;
    const prevStarted = cfg.DetStarted;
    cfg.DetInitialized = false;
    cfg.DetStarted = false;
    simState.lifecycleState = "DET_UNINIT";
    _executeDetCore("DEV", 60, 0, 0x01, 0x1E, "Early_CanIf_Before_DetInit", { bypassCallerDetect: true });
    if (prevInit) {
      cfg.DetInitialized = prevInit;
      cfg.DetStarted = prevStarted;
    }
  }
}

// ==================== DUAL 8-BIT STATUS REGISTER COMPUTATION ====================

function computeCoreStatusByte() {
  let val = 0;
  if (cfg.DetInitialized) val |= 0x80;
  if (cfg.DetStarted) val |= 0x40;
  if (simState.lastPacket.stream === "DEV" || simState.counts.dev > 0) {
    if (simState.lastPacket.stream === "DEV") val |= 0x20;
  }
  if (simState.lastPacket.stream === "RUNTM") val |= 0x10;
  if (simState.lastPacket.stream === "TRANS") val |= 0x08;
  if (simState.lastFlags.dltFwd) val |= 0x04;
  if (simState.counts.ovf > 0 || simState.bufLocked) val |= 0x02;
  if (simState.loopHaltState === "ENDLESS_HALT_BKPT") val |= 0x01;
  return (val ^ (simState.manualCoreXor & 0xFF)) & 0xFF;
}

function computePipelineFilterByte() {
  let val = 0;
  if (simState.lastFlags.viaRte) val |= 0x80;
  if (simState.lastFlags.isrPreempt || simState.execContext === "ISR_CanRx") val |= 0x40;
  if (cfg.CallerDevErrorDetect) val |= 0x20;
  if (simState.lastFlags.hookExec) val |= 0x10;
  if (simState.lastFlags.glbFilter) val |= 0x08;
  if (simState.lastFlags.brkFilter) val |= 0x04;
  if (simState.lastFlags.fltReject) val |= 0x02;
  if (simState.lastFlags.selfErr) val |= 0x01;
  return (val ^ (simState.manualPipeXor & 0xFF)) & 0xFF;
}

// ==================== EXPORT ARXML / C HEADER / C SOURCE GENERATORS ====================

function generateDetArxml() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<AUTOSAR xmlns="http://autosar.org/schema/r4.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <AR-PACKAGES>
    <AR-PACKAGE>
      <SHORT-NAME>EcucDefs_Det</SHORT-NAME>
      <ELEMENTS>
        <ECUC-MODULE-CONFIGURATION-VALUES>
          <SHORT-NAME>Det</SHORT-NAME>
          <DEFINITION-REF DEST="ECUC-MODULE-DEF">/AUTOSAR/EcucDefs/Det</DEFINITION-REF>
          <CONTAINERS>
            <ECUC-CONTAINER-VALUE>
              <SHORT-NAME>DetGeneral</SHORT-NAME>
              <PARAMETER-VALUES>
                <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-BOOLEAN-PARAM-DEF">/AUTOSAR/EcucDefs/Det/DetGeneral/DetVersionInfoApi</DEFINITION-REF><VALUE>${cfg.DetVersionInfoApi ? 1 : 0}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
                <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-BOOLEAN-PARAM-DEF">/AUTOSAR/EcucDefs/Det/DetGeneral/DetForwardToDlt</DEFINITION-REF><VALUE>${cfg.DetForwardToDlt ? 1 : 0}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
                <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-INTEGER-PARAM-DEF">/AUTOSAR/EcucDefs/Det/DetGeneral/DetErrorBufferSize</DEFINITION-REF><VALUE>${cfg.DetErrorBufferSize}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
                <ECUC-TEXTUAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-ENUMERATION-PARAM-DEF">/AUTOSAR/EcucDefs/Det/DetGeneral/DetBufferOverflowMode</DEFINITION-REF><VALUE>${cfg.DetBufferOverflowMode}</VALUE></ECUC-TEXTUAL-PARAM-VALUE>
                <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-BOOLEAN-PARAM-DEF">/AUTOSAR/EcucDefs/Det/DetGeneral/DetEndlessLoopInDevError</DEFINITION-REF><VALUE>${cfg.DetEndlessLoopInDevError ? 1 : 0}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
              </PARAMETER-VALUES>
            </ECUC-CONTAINER-VALUE>
            <ECUC-CONTAINER-VALUE>
              <SHORT-NAME>DetNotification</SHORT-NAME>
              <PARAMETER-VALUES>
                <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-BOOLEAN-PARAM-DEF">/AUTOSAR/EcucDefs/Det/DetNotification/DetReportRuntimeErrorCallout</DEFINITION-REF><VALUE>${cfg.DetReportRuntimeErrorCalloutEnabled ? 1 : 0}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
                <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-BOOLEAN-PARAM-DEF">/AUTOSAR/EcucDefs/Det/DetNotification/DetReportTransientFaultCallout</DEFINITION-REF><VALUE>${cfg.DetReportTransientFaultCalloutEnabled ? 1 : 0}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
              </PARAMETER-VALUES>
            </ECUC-CONTAINER-VALUE>
            <ECUC-CONTAINER-VALUE>
              <SHORT-NAME>DetServicePorts</SHORT-NAME>
              <PARAMETER-VALUES>
                <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-INTEGER-PARAM-DEF">/AUTOSAR/EcucDefs/Rte/PDAV/SWC_BrakeCtrl</DEFINITION-REF><VALUE>${cfg.SwcBrake_DetModuleId}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
                <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-INTEGER-PARAM-DEF">/AUTOSAR/EcucDefs/Rte/PDAV/SWC_DiagApp</DEFINITION-REF><VALUE>${cfg.SwcDiag_DetModuleId}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
              </PARAMETER-VALUES>
            </ECUC-CONTAINER-VALUE>
          </CONTAINERS>
        </ECUC-MODULE-CONFIGURATION-VALUES>
      </ELEMENTS>
    </AR-PACKAGE>
  </AR-PACKAGES>
</AUTOSAR>`;
}

function generateDetCfgH() {
  return `/* Generated by AUTOSAR Classic Det Simulator (Profile: ${cfg.EcuBuildProfile}) */
#ifndef DET_CFG_H
#define DET_CFG_H

#include "Std_Types.h"

#define DET_MODULE_ID                          (15U)
#define DET_INSTANCE_ID                        (0U)
#define DET_SW_MAJOR_VERSION                   (22U)
#define DET_SW_MINOR_VERSION                   (11U)

/* ECUC Compile-Time Switches */
#define DET_VERSION_INFO_API                   (${cfg.DetVersionInfoApi ? "STD_ON" : "STD_OFF"})
#define DET_FORWARD_TO_DLT                     (${cfg.DetForwardToDlt ? "STD_ON" : "STD_OFF"})
#define DET_REPORT_RUNTIME_ERROR_CALLOUT       (${cfg.DetReportRuntimeErrorCalloutEnabled ? "STD_ON" : "STD_OFF"})
#define DET_REPORT_TRANSIENT_FAULT_CALLOUT     (${cfg.DetReportTransientFaultCalloutEnabled ? "STD_ON" : "STD_OFF"})
#define DET_PROTECT_REENTRANCY_WITH_SCHM       (${cfg.ProtectReentrancyWithSchM ? "STD_ON" : "STD_OFF"})
#define DET_PREVENT_RECURSIVE_HOOK_CALL        (${cfg.PreventRecursiveHookCall ? "STD_ON" : "STD_OFF"})
#define DET_ENDLESS_LOOP_IN_DEV_ERROR          (${cfg.DetEndlessLoopInDevError ? "STD_ON" : "STD_OFF"})
#define DET_TRIGGER_BKPT_INSTRUCTION           (${cfg.TriggerHardwareBkptInstruction ? "STD_ON" : "STD_OFF"})
#define DET_ERROR_BUFFER_SIZE                  (${cfg.DetErrorBufferSize}U)
#define DET_STOP_ON_FULL_BUFFER                (${cfg.DetBufferOverflowMode === "STOP_ON_FULL_KEEP_FIRST" ? "STD_ON" : "STD_OFF"})

/* Caller Build Switch Simulation */
#define CALLER_DEV_ERROR_DETECT                (${cfg.CallerDevErrorDetect ? "STD_ON" : "STD_OFF"})

/* RTE DETService Port-Defined Argument Values (PDAV) */
#define RTE_PDAV_SWC_BRAKECTRL_MOD_ID          (${cfg.SwcBrake_DetModuleId}U)
#define RTE_PDAV_SWC_DIAGAPP_MOD_ID            (${cfg.SwcDiag_DetModuleId}U)

#endif /* DET_CFG_H */`;
}

function generateDetCfgC() {
  return `/* Generated by AUTOSAR Classic Det Simulator */
#include "Det.h"
#include "Det_Cfg.h"
${cfg.DetForwardToDlt ? '#include "Dlt.h"' : '/* DLT Forwarding disabled */'}

/* User-Configured Error Hooks (Dev Error 0x01) */
extern Std_ReturnType App_DetDebuggerHook(uint16 ModuleId, uint8 InstanceId, uint8 ApiId, uint8 ErrorId);
extern Std_ReturnType App_DetSafetyLoggerHook(uint16 ModuleId, uint8 InstanceId, uint8 ApiId, uint8 ErrorId);
extern Std_ReturnType App_DetRuntimeCallout(uint16 ModuleId, uint8 InstanceId, uint8 ApiId, uint8 ErrorId);
extern Std_ReturnType App_DetTransientCallout(uint16 ModuleId, uint8 InstanceId, uint8 ApiId, uint8 FaultId);

typedef Std_ReturnType (*Det_ErrorHookFctPtr)(uint16, uint8, uint8, uint8);

const Det_ErrorHookFctPtr Det_ErrorHooks[] = {
  ${cfg.DetErrorHook_0_Enabled ? "&App_DetDebuggerHook," : "/* DetErrorHook_0 disabled */"}
  ${cfg.DetErrorHook_1_Enabled ? "&App_DetSafetyLoggerHook," : "/* DetErrorHook_1 disabled */"}
  NULL_PTR
};

const Det_ErrorHookFctPtr Det_RuntimeCallouts[] = {
  ${cfg.DetRuntimeErrorCallout_0_Enabled ? "&App_DetRuntimeCallout," : "/* RuntimeCallout_0 disabled */"}
  NULL_PTR
};

const Det_ErrorHookFctPtr Det_TransientCallouts[] = {
  ${cfg.DetTransientFaultCallout_0_Enabled ? "&App_DetTransientCallout," : "/* TransientCallout_0 disabled */"}
  NULL_PTR
};`;
}
