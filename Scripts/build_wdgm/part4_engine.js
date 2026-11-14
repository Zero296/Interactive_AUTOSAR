// ================= PART 4A: DEFAULT ECUC CONFIG & WDGM SIMULATION ENGINE =================

const defaultConfig = {
  // Tab 0: General & Modes (6)
  WdgMInitialized: true,
  WdgMDevErrorDetect: true,
  WdgMVersionInfoApi: false,
  WdgMDefensiveBehavior: true,
  ActiveWdgMMode: "FAST_MODE",
  WdgMSupervisionCycle: 10,

  // Tab 1: Alive Supervision (7)
  SE0_AliveEnabled: true,
  WdgMExpectedAliveIndications: 2,
  WdgMSupervisionReferenceCycle: 2,
  WdgMMinMargin: 1,
  WdgMMaxMargin: 1,
  SE1_AliveEnabled: true,
  SE1_ExpectedAlive: 1,

  // Tab 2: Deadline Supervision (6)
  SE0_DeadlineEnabled: true,
  WdgMDeadlineStartRef: "0",
  WdgMDeadlineStopRef: "1",
  WdgMDeadlineMin: 2,
  WdgMDeadlineMax: 8,
  WdgMEnableDeadlineTimeoutDetection: true,

  // Tab 3: Logical Graph (6)
  SE0_InternalGraphEnabled: true,
  WdgMInitialCheckpoint: "0",
  WdgMFinalCheckpoint: "2",
  ValidInternalTransitions: "CP0->CP1, CP1->CP2",
  ExternalGraphEnabled: false,
  ValidExternalTransitions: "SE0_CP0->SE0_CP1, SE0_CP1->SE1_CP0, SE1_CP0->SE1_CP1",

  // Tab 4: Tolerance & Reset (6)
  WdgMFailedAliveSupervisionRefCycleTol: 1,
  SE1_FailedAliveTol: 0,
  WdgMExpiredSupervisionCycleTol: 2,
  WdgMImmediateReset: false,
  WdgMPartitionResetEnabled: false,
  WdgMDemEventParameterRefs: true,

  // Tab 5: WdgIf & HW Watchdog (6)
  WdgMTriggerMode_IntWdg: "WDGIF_FAST_MODE",
  WdgMTriggerConditionValue_Int: 20,
  ExternalWindowWdgEnabled: false,
  WdgMTriggerConditionValue_Ext: 20,
  WindowWdgClosedWindowMs: 5,
  SimulateWdgIfSetModeFail: false
};

let ecucConfig = JSON.parse(JSON.stringify(defaultConfig));
let simState = null;

function createSeObj(id, name, shortName, osApp, activeFast) {
  return {
    id: id,
    name: name,
    shortName: shortName,
    osApp: osApp,
    activeInMode: activeFast,
    localStatus: activeFast ? "OK" : "DEACTIVATED",
    alive: { ac: 0, sc: 0, res: activeFast ? "OK" : "NA", failedCnt: 0, lastFormula: "0 <= 0 <= 0" },
    deadline: { pending: false, tStart: 0, lastDt: null, res: activeFast ? "OK" : "NA", timedOut: false },
    logical: { activityFlag: false, lastCp: null, lastEdge: "Idle", res: activeFast ? "OK" : "NA" }
  };
}

function createInitialSimState() {
  return {
    clockMs: 0,
    initialized: true,
    selectedSeId: 0,
    selectedModuleId: "MOD_WDGM",
    activeArrows: [],
    stepExplain: "Hệ thống ở trạng thái sau WdgM_Init() trong FAST_MODE (10ms cycle).",
    lastCodeSnippet: "// Hệ thống sẵn sàng. Gọi WdgM_CheckpointReached() hoặc WdgM_MainFunction().",
    prevRegA: 0xF0,
    prevRegB: 0xC0,
    globalStatus: "OK",
    expiredCycleCnt: 0,
    firstExpired: {
      latched: false,
      seId: null,
      invSeId: 0xFF,
      ramValid: true
    },
    externalGraph: {
      activityFlag: false,
      lastNode: null,
      lastEdge: "Idle",
      res: "NA"
    },
    wdgIf: {
      intMode: "WDGIF_FAST_MODE",
      intTimeoutMs: 20,
      intRemainingMs: 20,
      extMode: "WDGIF_FAST_MODE",
      extTimeoutMs: 20,
      extRemainingMs: 20,
      lastTriggerMs: 0,
      hwResetTriggered: false,
      windowViolation: false,
      lastTriggerDeltaMs: 10
    },
    resetState: {
      partResetCount: 0,
      lastPartResetApp: "NONE",
      mcuResetTriggered: false
    },
    dem: {
      monitoringFailed: false,
      setModeFailed: false
    },
    detErrors: [],
    apiTrace: [],
    entities: [
      createSeObj(0, "SE_0: SWC_BrakeCtrl", "BrakeCtrl", "OsApp_ASILD_Brake", true),
      createSeObj(1, "SE_1: SWC_EngineTrq", "EngineTrq", "OsApp_ASILC_Powertrain", true),
      createSeObj(2, "SE_2: BSW_CanDiag", "CanDiag", "OsApp_BSW_Sys", false)
    ]
  };
}

function addTrace(apiName, detail, level) {
  simState.apiTrace.unshift({
    t: simState.clockMs,
    api: apiName,
    detail: detail,
    level: level || "info"
  });
  if (simState.apiTrace.length > 60) simState.apiTrace.pop();
}

function pushArrows(arr) {
  arr.forEach((a) => {
    if (!simState.activeArrows.includes(a)) simState.activeArrows.push(a);
  });
}

function reportDet(serviceIdHex, errCodeName, errCodeHex, detail) {
  if (!ecucConfig.WdgMDevErrorDetect) return;
  const entry = {
    t: simState.clockMs,
    moduleId: "13 (WDGM)",
    serviceId: serviceIdHex,
    errorId: errCodeName + " (" + errCodeHex + ")",
    detail: detail
  };
  simState.detErrors.unshift(entry);
  if (simState.detErrors.length > 20) simState.detErrors.pop();
  pushArrows(["arr_wdgm_det"]);
  addTrace("Det_ReportError(13, 0, " + serviceIdHex + ", " + errCodeHex + ")", errCodeName + " — " + detail, "err");
}

function localStatusCode(st) {
  if (st === "OK") return 0x00;
  if (st === "FAILED") return 0x01;
  if (st === "EXPIRED") return 0x02;
  return 0x04; // DEACTIVATED
}

function globalStatusCode(st) {
  if (st === "OK") return 0x00;
  if (st === "FAILED") return 0x01;
  if (st === "EXPIRED") return 0x02;
  if (st === "STOPPED") return 0x03;
  return 0x04; // DEACTIVATED
}

function computeLocalStatusByte(seId) {
  const se = simState.entities[seId !== undefined ? seId : simState.selectedSeId];
  if (!se) return 0x00;
  let b = 0;
  if (se.activeInMode && simState.initialized) b |= 0x80;
  if (se.alive.res !== "ERR" && se.activeInMode) b |= 0x40;
  if (se.deadline.res !== "ERR" && se.activeInMode) b |= 0x20;
  if (se.logical.res !== "ERR" && se.activeInMode) b |= 0x10;
  if (se.logical.activityFlag || (ecucConfig.ExternalGraphEnabled && simState.externalGraph.activityFlag)) b |= 0x08;
  b |= localStatusCode(se.localStatus);
  return b & 0xFF;
}

function computeGlobalControlByte() {
  let b = 0;
  if (simState.initialized) b |= 0x80;
  const trigActive = simState.initialized && simState.globalStatus !== "STOPPED" && simState.globalStatus !== "DEACTIVATED" && simState.wdgIf.intTimeoutMs > 0;
  if (trigActive) b |= 0x40;
  if (simState.firstExpired.latched) b |= 0x20;
  if (simState.resetState.partResetCount > 0) b |= 0x10;
  if (simState.resetState.mcuResetTriggered) b |= 0x08;
  b |= globalStatusCode(simState.globalStatus);
  return b & 0xFF;
}

function snapshotPrevRegs() {
  simState.prevRegA = computeLocalStatusByte(simState.selectedSeId);
  simState.prevRegB = computeGlobalControlByte();
}

function parseTransitionSet(text) {
  return String(text || "")
    .split(/[\s,;]+/)
    .map((s) => s.trim().toUpperCase().replace(/CP_/g, "CP"))
    .filter(Boolean);
}

function applyModeToEntities(modeStr) {
  const isOff = (modeStr === "OFF_MODE") || !simState.initialized;
  const isSlow = (modeStr === "SLOW_MODE");
  simState.entities.forEach((se) => {
    let active = false;
    if (!isOff) {
      if (se.id === 0 || se.id === 1) active = true;
      else if (se.id === 2) active = isSlow;
    }
    se.activeInMode = active;
    if (!active) {
      se.localStatus = "DEACTIVATED";
      se.alive.res = "NA";
      se.alive.ac = 0;
      se.alive.sc = 0;
      se.alive.failedCnt = 0;
      se.deadline.res = "NA";
      se.deadline.pending = false;
      se.logical.res = "NA";
      se.logical.activityFlag = false;
    } else if (se.localStatus === "DEACTIVATED") {
      se.localStatus = "OK";
      se.alive.res = "OK";
      se.deadline.res = "OK";
      se.logical.res = "OK";
    }
  });
}

// -------------------- AUTOSAR WDGM APIS --------------------

function api_WdgM_Init(initFlag, modeOverride) {
  snapshotPrevRegs();
  if (initFlag === false) {
    simState.initialized = false;
    ecucConfig.WdgMInitialized = false;
    simState.globalStatus = "DEACTIVATED";
    applyModeToEntities("OFF_MODE");
    addTrace("WdgM_DeInit / Uninit", "WdgM chuyển về trạng thái chưa khởi tạo (WDGM_UNINIT).", "warn");
    return;
  }
  const mode = modeOverride || ecucConfig.ActiveWdgMMode || "FAST_MODE";
  ecucConfig.ActiveWdgMMode = mode;
  ecucConfig.WdgMInitialized = true;
  simState.initialized = true;
  simState.globalStatus = "OK";
  simState.expiredCycleCnt = 0;
  simState.dem.monitoringFailed = false;
  simState.dem.setModeFailed = false;
  simState.resetState.mcuResetTriggered = false;
  simState.wdgIf.hwResetTriggered = false;
  simState.wdgIf.windowViolation = false;
  simState.externalGraph = { activityFlag: false, lastNode: null, lastEdge: "Idle", res: ecucConfig.ExternalGraphEnabled ? "OK" : "NA" };

  const trigMs = mode === "SLOW_MODE" ? 50 : (mode === "OFF_MODE" ? 0 : (Number(ecucConfig.WdgMTriggerConditionValue_Int) || 20));
  const wdgMode = mode === "SLOW_MODE" ? "WDGIF_SLOW_MODE" : (mode === "OFF_MODE" ? "WDGIF_OFF_MODE" : "WDGIF_FAST_MODE");
  ecucConfig.WdgMTriggerMode_IntWdg = wdgMode;
  ecucConfig.WdgMTriggerConditionValue_Int = trigMs || 20;
  simState.wdgIf.intMode = wdgMode;
  simState.wdgIf.intTimeoutMs = trigMs;
  simState.wdgIf.intRemainingMs = trigMs;
  simState.wdgIf.extMode = wdgMode;
  simState.wdgIf.extTimeoutMs = trigMs;
  simState.wdgIf.extRemainingMs = trigMs;
  simState.wdgIf.lastTriggerMs = simState.clockMs;

  simState.entities.forEach((se) => {
    se.localStatus = "DEACTIVATED";
    se.alive = { ac: 0, sc: 0, res: "OK", failedCnt: 0, lastFormula: "Init" };
    se.deadline = { pending: false, tStart: 0, lastDt: null, res: "OK", timedOut: false };
    se.logical = { activityFlag: false, lastCp: null, lastEdge: "Idle", res: "OK" };
  });
  applyModeToEntities(mode);

  pushArrows(["arr_bswm_wdgm", "arr_wdgm_wdgif", "arr_wdgif_int"]);
  if (ecucConfig.ExternalWindowWdgEnabled) pushArrows(["arr_wdgif_ext"]);
  addTrace("WdgM_Init(&WdgM_Config)", "Khởi tạo ở " + mode + ", gọi WdgIf_SetMode(" + wdgMode + ") & WdgIf_SetTriggerCondition(" + trigMs + "ms) [SWS_WdgM_00135].", "ok");
  simState.lastCodeSnippet =
`/* SWS_WdgM_00135: EcuM/BswM gọi WdgM_Init(&WdgM_Config) */
WdgM_Init(&WdgM_Config);
  -> Set GlobalStatus = WDGM_GLOBAL_STATUS_OK;
  -> Activate SEs configured in ${mode};
  -> WdgIf_SetMode(0, ${wdgMode});
  -> WdgIf_SetTriggerCondition(0, ${trigMs}u);`;
}

function api_WdgM_DeInit() {
  snapshotPrevRegs();
  if (!simState.initialized) {
    reportDet("0x02", "WDGM_E_UNINIT", "0x10", "Gọi WdgM_DeInit() khi WdgM chưa được Init.");
    return false;
  }
  if (ecucConfig.WdgMDefensiveBehavior) {
    reportDet("0x02", "WDGM_E_DISABLE_NOT_ALLOWED", "0x15", "WdgMDefensiveBehavior=TRUE cấm tắt Watchdog qua WdgM_DeInit() [SWS_WdgM_00031].");
    return false;
  }
  if (simState.globalStatus !== "OK" && simState.globalStatus !== "FAILED") {
    addTrace("WdgM_DeInit() REJECTED", "Từ chối WdgM_DeInit() vì GlobalStatus = " + simState.globalStatus + " (có SE EXPIRED/STOPPED) [SWS_WdgM_00286].", "err");
    return false;
  }
  simState.initialized = false;
  ecucConfig.WdgMInitialized = false;
  simState.globalStatus = "DEACTIVATED";
  simState.wdgIf.intMode = "WDGIF_OFF_MODE";
  simState.wdgIf.intTimeoutMs = 0;
  simState.wdgIf.extMode = "WDGIF_OFF_MODE";
  simState.wdgIf.extTimeoutMs = 0;
  applyModeToEntities("OFF_MODE");
  pushArrows(["arr_bswm_wdgm", "arr_wdgm_wdgif", "arr_wdgif_int"]);
  addTrace("WdgM_DeInit()", "Tắt an toàn WdgM -> GLOBAL_STATUS_DEACTIVATED & WdgIf_SetMode(WDGIF_OFF_MODE) [SWS_WdgM_00261].", "warn");
  simState.lastCodeSnippet =
`/* SWS_WdgM_00261 & SWS_WdgM_00286 */
if ((WdgM_GlobalStatus == WDGM_GLOBAL_STATUS_OK) || (WdgM_GlobalStatus == WDGM_GLOBAL_STATUS_FAILED)) {
  WdgIf_SetMode(0, WDGIF_OFF_MODE);
  WdgM_GlobalStatus = WDGM_GLOBAL_STATUS_DEACTIVATED;
}`;
  return true;
}

function api_WdgM_SetMode(modeStr) {
  snapshotPrevRegs();
  if (!simState.initialized) {
    reportDet("0x03", "WDGM_E_UNINIT", "0x10", "Gọi WdgM_SetMode() khi chưa Init.");
    return false;
  }
  if (!["SLOW_MODE", "FAST_MODE", "OFF_MODE"].includes(modeStr)) {
    reportDet("0x03", "WDGM_E_PARAM_MODE", "0x12", "Mode '" + modeStr + "' không tồn tại.");
    return false;
  }
  if (modeStr === "OFF_MODE" && ecucConfig.WdgMDefensiveBehavior) {
    reportDet("0x03", "WDGM_E_DISABLE_NOT_ALLOWED", "0x15", "WdgMDefensiveBehavior=TRUE chặn chuyển sang WDGIF_OFF_MODE [SWS_WdgM_00031].");
    simState.lastCodeSnippet =
`/* SWS_WdgM_00031: Phòng vệ ASIL chống tắt Watchdog */
if ((Mode == WDGM_OFF_MODE) && (WdgMDefensiveBehavior == TRUE)) {
  Det_ReportError(WDGM_MODULE_ID, 0, 0x03, WDGM_E_DISABLE_NOT_ALLOWED);
  return E_NOT_OK;
}`;
    return false;
  }
  if (ecucConfig.SimulateWdgIfSetModeFail) {
    simState.globalStatus = "STOPPED";
    simState.wdgIf.intTimeoutMs = 0;
    simState.wdgIf.extTimeoutMs = 0;
    if (ecucConfig.WdgMDemEventParameterRefs) {
      simState.dem.setModeFailed = true;
      pushArrows(["arr_wdgm_dem"]);
    }
    pushArrows(["arr_bswm_wdgm", "arr_wdgm_wdgif"]);
    addTrace("WdgM_SetMode(" + modeStr + ") FAILED", "WdgIf_SetMode() trả E_NOT_OK -> GlobalStatus = STOPPED & báo Dem_SetEventStatus(WDGM_E_SET_MODE, FAILED) [SWS_WdgM_00142]!", "err");
    simState.lastCodeSnippet =
`/* SWS_WdgM_00142: Lỗi chuyển đổi chế độ phần cứng WdgIf */
if (WdgIf_SetMode(0, NewWdgMode) != E_OK) {
  Dem_SetEventStatus(WDGM_E_SET_MODE, DEM_EVENT_STATUS_FAILED);
  WdgM_GlobalStatus = WDGM_GLOBAL_STATUS_STOPPED;
  return E_NOT_OK;
}`;
    return false;
  }

  ecucConfig.ActiveWdgMMode = modeStr;
  const wdgMode = modeStr === "SLOW_MODE" ? "WDGIF_SLOW_MODE" : (modeStr === "OFF_MODE" ? "WDGIF_OFF_MODE" : "WDGIF_FAST_MODE");
  const tmo = modeStr === "SLOW_MODE" ? 50 : (modeStr === "OFF_MODE" ? 0 : 20);
  ecucConfig.WdgMTriggerMode_IntWdg = wdgMode;
  ecucConfig.WdgMTriggerConditionValue_Int = tmo || 20;
  ecucConfig.WdgMTriggerConditionValue_Ext = tmo || 20;
  simState.wdgIf.intMode = wdgMode;
  simState.wdgIf.intTimeoutMs = tmo;
  simState.wdgIf.intRemainingMs = tmo;
  simState.wdgIf.extMode = wdgMode;
  simState.wdgIf.extTimeoutMs = tmo;
  simState.wdgIf.extRemainingMs = tmo;
  applyModeToEntities(modeStr);

  pushArrows(["arr_bswm_wdgm", "arr_wdgm_wdgif", "arr_wdgif_int"]);
  if (ecucConfig.ExternalWindowWdgEnabled) pushArrows(["arr_wdgif_ext"]);
  addTrace("WdgM_SetMode(" + modeStr + ")", "Chuyển đổi thành công sang " + wdgMode + " (" + tmo + "ms). SE_2 = " + simState.entities[2].localStatus + " [SWS_WdgM_00154].", "ok");
  simState.lastCodeSnippet =
`/* SWS_WdgM_00154 & SWS_WdgM_00207 */
WdgM_SetMode(${modeStr});
  -> WdgIf_SetMode(0, ${wdgMode});
  -> WdgIf_SetTriggerCondition(0, ${tmo}u);
  -> SE_2 (BSW_CanDiag) = WDGM_LOCAL_STATUS_${simState.entities[2].localStatus};`;
  return true;
}

function api_WdgM_CheckpointReached(seId, cpId) {
  snapshotPrevRegs();
  if (!simState.initialized) {
    reportDet("0x0E", "WDGM_E_UNINIT", "0x10", "Gọi WdgM_CheckpointReached(" + seId + ", CP_" + cpId + ") khi chưa Init.");
    return false;
  }
  if (seId < 0 || seId >= simState.entities.length) {
    reportDet("0x0E", "WDGM_E_PARAM_SEID", "0x13", "SEID=" + seId + " không tồn tại trong cấu hình.");
    return false;
  }
  if (cpId < 0 || cpId > 2) {
    reportDet("0x0E", "WDGM_E_CPID", "0x16", "CheckpointID=" + cpId + " không hợp lệ đối với SE_" + seId + " [SWS_WdgM_00284].");
    return false;
  }
  const se = simState.entities[seId];
  if (!se.activeInMode || se.localStatus === "DEACTIVATED") {
    reportDet("0x0E", "WDGM_E_SEDEACTIVATED", "0x1F", "SE_" + seId + " (" + se.shortName + ") đang DEACTIVATED trong Mode " + ecucConfig.ActiveWdgMMode + " [SWS_WdgM_00319].");
    return false;
  }

  pushArrows([seId === 2 ? "arr_bsw_wdgm" : "arr_swc_rte", seId === 2 ? "arr_bsw_wdgm" : "arr_rte_wdgm"]);

  let notes = [];

  // 1. Alive Supervision counter increment (at CP_0)
  if ((seId === 0 && ecucConfig.SE0_AliveEnabled && cpId === 0) ||
      (seId === 1 && ecucConfig.SE1_AliveEnabled && cpId === 0) ||
      (seId === 2 && cpId === 0)) {
    se.alive.ac += 1;
    notes.push("Alive AC=" + se.alive.ac);
  }

  // 2. Deadline Supervision (SE_0)
  if (seId === 0 && ecucConfig.SE0_DeadlineEnabled) {
    const startCp = Number(ecucConfig.WdgMDeadlineStartRef);
    const stopCp = Number(ecucConfig.WdgMDeadlineStopRef);
    const tMin = Number(ecucConfig.WdgMDeadlineMin);
    const tMax = Number(ecucConfig.WdgMDeadlineMax);

    if (cpId === startCp) {
      se.deadline.tStart = simState.clockMs;
      se.deadline.pending = true;
      se.deadline.timedOut = false;
      pushArrows(["arr_os_wdgm"]);
      notes.push("Deadline Start t=" + simState.clockMs + "ms");
    } else if (cpId === stopCp) {
      pushArrows(["arr_os_wdgm"]);
      if (se.deadline.pending) {
        const dt = simState.clockMs - se.deadline.tStart;
        se.deadline.lastDt = dt;
        se.deadline.pending = false;
        if (dt >= tMin && dt <= tMax) {
          if (se.deadline.res !== "ERR") se.deadline.res = "OK";
          notes.push("Deadline Δt=" + dt + "ms ∈ [" + tMin + "," + tMax + "] OK");
        } else {
          se.deadline.res = "ERR";
          notes.push("DEADLINE VIOLATION Δt=" + dt + "ms ∉ [" + tMin + "," + tMax + "]!");
        }
      } else {
        notes.push("Deadline Stop (No active start)");
      }
    }
  }

  // 3. Internal Logical Graph Supervision (SE_0)
  if (seId === 0 && ecucConfig.SE0_InternalGraphEnabled) {
    const initCp = Number(ecucConfig.WdgMInitialCheckpoint);
    const finalCp = Number(ecucConfig.WdgMFinalCheckpoint);
    const validEdges = parseTransitionSet(ecucConfig.ValidInternalTransitions);

    if (!se.logical.activityFlag) {
      if (cpId === initCp) {
        se.logical.activityFlag = true;
        se.logical.lastCp = cpId;
        se.logical.lastEdge = "Init CP_" + cpId;
        if (se.logical.res !== "ERR") se.logical.res = "OK";
        notes.push("Logical Init CP_" + cpId + " OK");
      } else {
        se.logical.res = "ERR";
        se.logical.lastEdge = "ERR: Init!=" + "CP" + cpId;
        notes.push("LOGICAL VIOLATION (Expected Init CP_" + initCp + ")");
      }
    } else {
      const edge = "CP" + se.logical.lastCp + "->CP" + cpId;
      if (validEdges.includes(edge)) {
        se.logical.lastEdge = edge;
        se.logical.lastCp = cpId;
        if (cpId === finalCp) {
          se.logical.activityFlag = false;
          notes.push("Logical " + edge + " (Final) OK");
        } else {
          notes.push("Logical " + edge + " OK");
        }
      } else {
        se.logical.res = "ERR";
        se.logical.lastEdge = "BAD: " + edge;
        notes.push("LOGICAL VIOLATION (" + edge + " invalid!)");
      }
    }
  }

  // 4. External Logical Graph Supervision (SE_0 <-> SE_1)
  if (ecucConfig.ExternalGraphEnabled && (seId === 0 || seId === 1)) {
    const node = "SE" + seId + "_CP" + cpId;
    const validExt = parseTransitionSet(ecucConfig.ValidExternalTransitions);
    const ext = simState.externalGraph;
    if (!ext.activityFlag) {
      if (node === "SE0_CP0") {
        ext.activityFlag = true;
        ext.lastNode = node;
        ext.lastEdge = "Ext Init " + node;
        if (ext.res !== "ERR") ext.res = "OK";
        notes.push("ExtGraph Init " + node);
      } else {
        ext.res = "ERR";
        se.logical.res = "ERR";
        ext.lastEdge = "BAD EXT INIT: " + node;
        notes.push("EXT GRAPH VIOLATION (Expected SE0_CP0)");
      }
    } else {
      const edge = ext.lastNode + "->" + node;
      if (validExt.includes(edge)) {
        ext.lastEdge = edge;
        ext.lastNode = node;
        if (node === "SE1_CP1") {
          ext.activityFlag = false;
          notes.push("ExtGraph " + edge + " (Final) OK");
        } else {
          notes.push("ExtGraph " + edge + " OK");
        }
      } else {
        ext.res = "ERR";
        se.logical.res = "ERR";
        ext.lastEdge = "BAD EXT: " + edge;
        notes.push("EXT GRAPH VIOLATION (" + edge + ")");
      }
    }
  }

  const hasErr = (se.deadline.res === "ERR" || se.logical.res === "ERR");
  addTrace("WdgM_CheckpointReached(SE_" + seId + ", CP_" + cpId + ")", notes.join(" | ") || ("SE_" + seId + " CP_" + cpId + " reached"), hasErr ? "err" : "ok");
  simState.lastCodeSnippet =
`/* SWS_WdgM_00263: SWC/BSW báo Checkpoint tại t = ${simState.clockMs} ms */
WdgM_CheckpointReached(${seId}u /* ${se.shortName} */, ${cpId}u /* CP_${cpId} */);
  /* Kết quả: ${notes.join(" | ")} */`;
  return true;
}

function api_WdgM_MainFunction() {
  snapshotPrevRegs();
  if (!simState.initialized) {
    reportDet("0x08", "WDGM_E_UNINIT", "0x10", "Gọi WdgM_MainFunction() khi chưa Init.");
    return;
  }

  const cycleMs = Number(ecucConfig.WdgMSupervisionCycle) || 10;
  simState.clockMs += cycleMs;

  if (simState.globalStatus === "STOPPED" || simState.globalStatus === "DEACTIVATED") {
    if (simState.globalStatus === "STOPPED") {
      simState.wdgIf.intRemainingMs = Math.max(0, simState.wdgIf.intRemainingMs - cycleMs);
      simState.wdgIf.extRemainingMs = Math.max(0, simState.wdgIf.extRemainingMs - cycleMs);
      if (simState.wdgIf.intRemainingMs === 0) {
        simState.wdgIf.hwResetTriggered = true;
      }
    }
    addTrace("WdgM_MainFunction()", "GlobalStatus=" + simState.globalStatus + " — KHÔNG nuôi WdgIf! HW Timer=" + simState.wdgIf.intRemainingMs + "ms.", "err");
    return;
  }

  let anyExpiredNow = false;
  let anyFailedNow = false;
  let partResetApps = [];

  simState.entities.forEach((se) => {
    if (!se.activeInMode || se.localStatus === "DEACTIVATED") return;

    // 1) Alive Supervision Evaluation
    const aliveOn = (se.id === 0 && ecucConfig.SE0_AliveEnabled) || (se.id === 1 && ecucConfig.SE1_AliveEnabled) || (se.id === 2);
    const eai = se.id === 0 ? Number(ecucConfig.WdgMExpectedAliveIndications) : (se.id === 1 ? Number(ecucConfig.SE1_ExpectedAlive) : 1);
    const src = se.id === 0 ? Math.max(1, Number(ecucConfig.WdgMSupervisionReferenceCycle)) : 1;
    const minM = se.id === 0 ? Number(ecucConfig.WdgMMinMargin) : 0;
    const maxM = se.id === 0 ? Number(ecucConfig.WdgMMaxMargin) : 0;
    const aliveTol = se.id === 0 ? Number(ecucConfig.WdgMFailedAliveSupervisionRefCycleTol) : (se.id === 1 ? Number(ecucConfig.SE1_FailedAliveTol) : 0);

    if (aliveOn) {
      se.alive.sc += 1;
      if (se.alive.sc >= src) {
        const lo = Math.max(0, eai - minM);
        const hi = eai + maxM;
        const ok = (se.alive.ac >= lo && se.alive.ac <= hi);
        se.alive.lastFormula = lo + " ≤ AC(" + se.alive.ac + ") ≤ " + hi;
        if (ok) {
          se.alive.res = "OK";
          if (se.alive.failedCnt > 0) se.alive.failedCnt -= 1;
        } else {
          se.alive.res = "ERR";
          se.alive.failedCnt += 1;
        }
        se.alive.ac = 0;
        se.alive.sc = 0;
      }
    } else {
      se.alive.res = "OK";
      se.alive.failedCnt = 0;
    }

    // 2) Deadline Timeout Detection
    if (se.id === 0 && ecucConfig.SE0_DeadlineEnabled && ecucConfig.WdgMEnableDeadlineTimeoutDetection && se.deadline.pending) {
      const elapsed = simState.clockMs - se.deadline.tStart;
      const tMax = Number(ecucConfig.WdgMDeadlineMax);
      if (elapsed > tMax) {
        se.deadline.res = "ERR";
        se.deadline.timedOut = true;
        se.deadline.lastDt = elapsed;
        se.deadline.pending = false;
      }
    }

    // 3) Local Status State Machine
    if (se.localStatus === "EXPIRED") {
      // Stays EXPIRED unless Partition Reset
    } else if (se.deadline.res === "ERR" || se.logical.res === "ERR") {
      // Zero tolerance for Deadline & Logical -> straight to EXPIRED
      se.localStatus = "EXPIRED";
    } else if (se.alive.res === "ERR" || se.alive.failedCnt > 0) {
      if (se.alive.failedCnt > aliveTol) {
        se.localStatus = "EXPIRED";
      } else {
        se.localStatus = "FAILED";
      }
    } else {
      se.localStatus = "OK";
    }

    // 4) FirstExpiredSEID Latch & Partition Reset
    if (se.localStatus === "EXPIRED") {
      if (!simState.firstExpired.latched) {
        simState.firstExpired.latched = true;
        simState.firstExpired.seId = se.id;
        simState.firstExpired.invSeId = (~se.id) & 0xFF;
        simState.firstExpired.ramValid = true;
      }
      if (ecucConfig.WdgMPartitionResetEnabled) {
        partResetApps.push(se);
      } else {
        anyExpiredNow = true;
      }
    } else if (se.localStatus === "FAILED") {
      anyFailedNow = true;
    }
  });

  // Handle Partition Reset if enabled
  if (partResetApps.length > 0) {
    partResetApps.forEach((se) => {
      simState.resetState.partResetCount += 1;
      simState.resetState.lastPartResetApp = se.osApp;
      se.localStatus = "OK";
      se.alive.ac = 0;
      se.alive.sc = 0;
      se.alive.res = "OK";
      se.alive.failedCnt = 0;
      se.deadline = { pending: false, tStart: 0, lastDt: null, res: "OK", timedOut: false };
      se.logical = { activityFlag: false, lastCp: null, lastEdge: "PartitionRestarted", res: "OK" };
      pushArrows(["arr_wdgm_bswm", "arr_os_wdgm"]);
      addTrace("BswM_WdgM_RequestPartitionReset(" + se.osApp + ")", "Khởi động lại phân vùng OS cho SE_" + se.id + " -> Khôi phục SE_" + se.id + " về OK mà không Reset toàn ECU [SWS_WdgM_00233]!", "warn");
    });
  }

  // 5) Global Status State Machine
  const globalTol = Number(ecucConfig.WdgMExpiredSupervisionCycleTol);
  if (anyExpiredNow) {
    if (simState.globalStatus !== "EXPIRED") {
      if (globalTol > 0) {
        simState.globalStatus = "EXPIRED";
        simState.expiredCycleCnt = 0;
      } else {
        simState.globalStatus = "STOPPED";
      }
    } else {
      simState.expiredCycleCnt += 1;
      if (simState.expiredCycleCnt > globalTol) {
        simState.globalStatus = "STOPPED";
      }
    }
  } else if (anyFailedNow) {
    simState.globalStatus = "FAILED";
    simState.expiredCycleCnt = 0;
  } else {
    simState.globalStatus = "OK";
    simState.expiredCycleCnt = 0;
  }

  // 6) WdgIf Triggering, DEM & Immediate Reset
  if (simState.globalStatus === "STOPPED") {
    simState.wdgIf.intTimeoutMs = 0;
    simState.wdgIf.extTimeoutMs = 0;
    simState.wdgIf.intRemainingMs = Math.max(0, simState.wdgIf.intRemainingMs - cycleMs);
    simState.wdgIf.extRemainingMs = Math.max(0, simState.wdgIf.extRemainingMs - cycleMs);
    pushArrows(["arr_wdgm_wdgif", "arr_wdgif_int"]);
    if (ecucConfig.ExternalWindowWdgEnabled) pushArrows(["arr_wdgif_ext"]);
    if (ecucConfig.WdgMDemEventParameterRefs) {
      simState.dem.monitoringFailed = true;
      pushArrows(["arr_wdgm_dem"]);
    }
    if (ecucConfig.WdgMImmediateReset) {
      simState.resetState.mcuResetTriggered = true;
      pushArrows(["arr_wdgm_bswm"]);
      addTrace("WdgM_MainFunction() → STOPPED & Mcu_PerformReset()", "Hết ân hạn -> WdgIf_SetTriggerCondition(0), báo DEM WDGM_E_MONITORING & gọi ngay Mcu_PerformReset() [SWS_WdgM_00134]!", "err");
    } else {
      addTrace("WdgM_MainFunction() → STOPPED", "Hết ân hạn -> Gọi WdgIf_SetTriggerCondition(0) cắt xung Watchdog & báo DEM [SWS_WdgM_00220/00223]!", "err");
    }
  } else {
    const tmoInt = ecucConfig.ActiveWdgMMode === "OFF_MODE" ? 0 : (Number(ecucConfig.WdgMTriggerConditionValue_Int) || 20);
    const tmoExt = ecucConfig.ActiveWdgMMode === "OFF_MODE" ? 0 : (Number(ecucConfig.WdgMTriggerConditionValue_Ext) || 20);
    const deltaTrig = simState.clockMs - simState.wdgIf.lastTriggerMs;
    simState.wdgIf.lastTriggerDeltaMs = deltaTrig;
    simState.wdgIf.intTimeoutMs = tmoInt;
    simState.wdgIf.intRemainingMs = tmoInt;
    simState.wdgIf.extTimeoutMs = tmoExt;
    simState.wdgIf.extRemainingMs = tmoExt;
    simState.wdgIf.lastTriggerMs = simState.clockMs;

    if (ecucConfig.ExternalWindowWdgEnabled && deltaTrig < Number(ecucConfig.WindowWdgClosedWindowMs) && tmoExt > 0) {
      simState.wdgIf.windowViolation = true;
      simState.wdgIf.hwResetTriggered = true;
      addTrace("Window Wdg Closed-Window Fault!", "Kích xung sớm (" + deltaTrig + "ms < ClosedWindow " + ecucConfig.WindowWdgClosedWindowMs + "ms) -> SBC kéo NRES Reset!", "err");
    } else {
      simState.wdgIf.windowViolation = false;
    }

    pushArrows(["arr_wdgm_wdgif", "arr_wdgif_int"]);
    if (ecucConfig.ExternalWindowWdgEnabled) pushArrows(["arr_wdgif_ext"]);

    const lvl = simState.globalStatus === "OK" ? "ok" : (simState.globalStatus === "FAILED" ? "warn" : "err");
    addTrace("WdgM_MainFunction() [" + simState.globalStatus + "]", "SE0=" + simState.entities[0].localStatus + " | ExpCnt=" + simState.expiredCycleCnt + "/" + globalTol + " | WdgIf_Trigger(" + tmoInt + "ms).", lvl);
  }

  simState.lastCodeSnippet =
`/* SWS_WdgM_00159: WdgM_MainFunction() tại t = ${simState.clockMs} ms */
void WdgM_MainFunction(void) {
  /* 1. Đánh giá Alive (SRC=${ecucConfig.WdgMSupervisionReferenceCycle}) & Deadline Timeout */
  /* 2. LocalStatus[SE_0] = WDGM_LOCAL_STATUS_${simState.entities[0].localStatus}; */
  /* 3. GlobalStatus = WDGM_GLOBAL_STATUS_${simState.globalStatus}; (ExpCnt=${simState.expiredCycleCnt}/${globalTol}) */
  WdgIf_SetTriggerCondition(0, ${simState.wdgIf.intTimeoutMs}u);
}`;
}

function api_WdgM_PerformReset() {
  snapshotPrevRegs();
  if (!simState.initialized) {
    reportDet("0x0F", "WDGM_E_UNINIT", "0x10", "Gọi WdgM_PerformReset() khi chưa Init.");
    return;
  }
  simState.globalStatus = "STOPPED";
  simState.wdgIf.intTimeoutMs = 0;
  simState.wdgIf.intRemainingMs = 0;
  simState.wdgIf.extTimeoutMs = 0;
  simState.wdgIf.extRemainingMs = 0;
  simState.resetState.mcuResetTriggered = true;
  simState.wdgIf.hwResetTriggered = true;
  pushArrows(["arr_swc_rte", "arr_rte_wdgm", "arr_wdgm_wdgif", "arr_wdgif_int", "arr_wdgm_bswm"]);
  if (ecucConfig.ExternalWindowWdgEnabled) pushArrows(["arr_wdgif_ext"]);
  addTrace("WdgM_PerformReset()", "Yêu cầu Reset khẩn cấp -> GlobalStatus = STOPPED, WdgIf_SetTriggerCondition(0) & kích hoạt Reset tức thì [SWS_WdgM_00133]!", "err");
  simState.lastCodeSnippet =
`/* SWS_WdgM_00133 & SWS_WdgM_00232: Reset khẩn cấp chủ động */
Std_ReturnType WdgM_PerformReset(void) {
  WdgM_GlobalStatus = WDGM_GLOBAL_STATUS_STOPPED;
  WdgIf_SetTriggerCondition(0, 0u);
  Mcu_PerformReset();
  return E_OK;
}`;
}

function api_WdgM_GetFirstExpiredSEID() {
  if (!simState.initialized) {
    reportDet("0x10", "WDGM_E_UNINIT", "0x10", "Gọi WdgM_GetFirstExpiredSEID() khi chưa Init.");
    return null;
  }
  const fe = simState.firstExpired;
  if (!fe.latched) {
    addTrace("WdgM_GetFirstExpiredSEID(&SEID)", "Chưa có SE nào bị EXPIRED (Return E_NOT_OK).", "info");
    return null;
  }
  const checkInv = ((~fe.seId) & 0xFF) === fe.invSeId;
  fe.ramValid = checkInv;
  addTrace("WdgM_GetFirstExpiredSEID(&SEID)", "Đọc vùng NO_INIT_RAM: SEID=" + fe.seId + " (~SEID=0x" + fe.invSeId.toString(16).toUpperCase() + ", Valid=" + checkInv + ") [SWS_WdgM_00349].", checkInv ? "ok" : "err");
  return fe.seId;
}

function api_ClearFirstExpiredRAM() {
  snapshotPrevRegs();
  simState.firstExpired = { latched: false, seId: null, invSeId: 0xFF, ramValid: true };
  addTrace("Power-On Clear NO_INIT_RAM", "Xóa chốt WdgM_FirstExpiredSEID về NONE.", "info");
}

function stepAdvanceMs(ms) {
  if (!simState) return;
  snapshotPrevRegs();
  simState.clockMs += ms;
  simState.wdgIf.intRemainingMs = Math.max(0, simState.wdgIf.intRemainingMs - ms);
  simState.wdgIf.extRemainingMs = Math.max(0, simState.wdgIf.extRemainingMs - ms);
  if (simState.globalStatus === "STOPPED" && simState.wdgIf.intRemainingMs === 0) {
    simState.wdgIf.hwResetTriggered = true;
  }
  simState.stepExplain = "Đồng hồ OsCounter tiến +" + ms + "ms (t = " + simState.clockMs + "ms). " +
    (simState.entities[0].deadline.pending ? ("Đang đo Deadline Δt = " + (simState.clockMs - simState.entities[0].deadline.tStart) + "ms.") : "Quan sát cửa sổ Watchdog.");
  renderAll();
}

function stepMainFunctionTick() {
  if (!simState) return;
  simState.activeArrows = [];
  api_WdgM_MainFunction();
  simState.stepExplain = "Chạy 1 chu kỳ WdgM_MainFunction() (+10ms) tại t = " + simState.clockMs + "ms -> GlobalStatus = " + simState.globalStatus + ".";
  renderAll();
}

// -------------------- ARXML / C / JSON CODE GENERATORS --------------------

function generateArxmlContent() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<AUTOSAR xmlns="http://autosar.org/schema/r4.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <AR-PACKAGES>
    <AR-PACKAGE>
      <SHORT-NAME>WdgM_EcucConfig</SHORT-NAME>
      <ELEMENTS>
        <ECUC-MODULE-CONFIGURATION-VALUES>
          <SHORT-NAME>WdgM</SHORT-NAME>
          <DEFINITION-REF DEST="ECUC-MODULE-DEF">/AUTOSAR/EcucDefs/WdgM</DEFINITION-REF>
          <CONTAINERS>
            <ECUC-CONTAINER-VALUE>
              <SHORT-NAME>WdgMGeneral</SHORT-NAME>
              <PARAMETER-VALUES>
                <ECUC-BOOLEAN-PARAM-VALUE><DEFINITION-REF DEST="ECUC-BOOLEAN-PARAM-DEF">/AUTOSAR/EcucDefs/WdgM/WdgMGeneral/WdgMDevErrorDetect</DEFINITION-REF><VALUE>${ecucConfig.WdgMDevErrorDetect}</VALUE></ECUC-BOOLEAN-PARAM-VALUE>
                <ECUC-BOOLEAN-PARAM-VALUE><DEFINITION-REF DEST="ECUC-BOOLEAN-PARAM-DEF">/AUTOSAR/EcucDefs/WdgM/WdgMGeneral/WdgMDefensiveBehavior</DEFINITION-REF><VALUE>${ecucConfig.WdgMDefensiveBehavior}</VALUE></ECUC-BOOLEAN-PARAM-VALUE>
                <ECUC-BOOLEAN-PARAM-VALUE><DEFINITION-REF DEST="ECUC-BOOLEAN-PARAM-DEF">/AUTOSAR/EcucDefs/WdgM/WdgMGeneral/WdgMImmediateReset</DEFINITION-REF><VALUE>${ecucConfig.WdgMImmediateReset}</VALUE></ECUC-BOOLEAN-PARAM-VALUE>
                <ECUC-BOOLEAN-PARAM-VALUE><DEFINITION-REF DEST="ECUC-BOOLEAN-PARAM-DEF">/AUTOSAR/EcucDefs/WdgM/WdgMGeneral/WdgMEnableDeadlineTimeoutDetection</DEFINITION-REF><VALUE>${ecucConfig.WdgMEnableDeadlineTimeoutDetection}</VALUE></ECUC-BOOLEAN-PARAM-VALUE>
              </PARAMETER-VALUES>
            </ECUC-CONTAINER-VALUE>
            <ECUC-CONTAINER-VALUE>
              <SHORT-NAME>WdgMMode_${ecucConfig.ActiveWdgMMode}</SHORT-NAME>
              <PARAMETER-VALUES>
                <ECUC-FLOAT-PARAM-VALUE><DEFINITION-REF DEST="ECUC-FLOAT-PARAM-DEF">/AUTOSAR/EcucDefs/WdgM/WdgMConfigSet/WdgMMode/WdgMSupervisionCycle</DEFINITION-REF><VALUE>${(ecucConfig.WdgMSupervisionCycle / 1000).toFixed(3)}</VALUE></ECUC-FLOAT-PARAM-VALUE>
                <ECUC-INTEGER-PARAM-VALUE><DEFINITION-REF DEST="ECUC-INTEGER-PARAM-DEF">/AUTOSAR/EcucDefs/WdgM/WdgMConfigSet/WdgMMode/WdgMExpiredSupervisionCycleTol</DEFINITION-REF><VALUE>${ecucConfig.WdgMExpiredSupervisionCycleTol}</VALUE></ECUC-INTEGER-PARAM-VALUE>
                <ECUC-INTEGER-PARAM-VALUE><DEFINITION-REF DEST="ECUC-INTEGER-PARAM-DEF">/AUTOSAR/EcucDefs/WdgM/WdgMConfigSet/WdgMMode/WdgMAliveSupervision/WdgMExpectedAliveIndications</DEFINITION-REF><VALUE>${ecucConfig.WdgMExpectedAliveIndications}</VALUE></ECUC-INTEGER-PARAM-VALUE>
                <ECUC-INTEGER-PARAM-VALUE><DEFINITION-REF DEST="ECUC-INTEGER-PARAM-DEF">/AUTOSAR/EcucDefs/WdgM/WdgMConfigSet/WdgMMode/WdgMAliveSupervision/WdgMSupervisionReferenceCycle</DEFINITION-REF><VALUE>${ecucConfig.WdgMSupervisionReferenceCycle}</VALUE></ECUC-INTEGER-PARAM-VALUE>
                <ECUC-FLOAT-PARAM-VALUE><DEFINITION-REF DEST="ECUC-FLOAT-PARAM-DEF">/AUTOSAR/EcucDefs/WdgM/WdgMConfigSet/WdgMMode/WdgMDeadlineSupervision/WdgMDeadlineMin</DEFINITION-REF><VALUE>${(ecucConfig.WdgMDeadlineMin / 1000).toFixed(3)}</VALUE></ECUC-FLOAT-PARAM-VALUE>
                <ECUC-FLOAT-PARAM-VALUE><DEFINITION-REF DEST="ECUC-FLOAT-PARAM-DEF">/AUTOSAR/EcucDefs/WdgM/WdgMConfigSet/WdgMMode/WdgMDeadlineSupervision/WdgMDeadlineMax</DEFINITION-REF><VALUE>${(ecucConfig.WdgMDeadlineMax / 1000).toFixed(3)}</VALUE></ECUC-FLOAT-PARAM-VALUE>
                <ECUC-INTEGER-PARAM-VALUE><DEFINITION-REF DEST="ECUC-INTEGER-PARAM-DEF">/AUTOSAR/EcucDefs/WdgM/WdgMConfigSet/WdgMMode/WdgMTrigger/WdgMTriggerConditionValue</DEFINITION-REF><VALUE>${ecucConfig.WdgMTriggerConditionValue_Int}</VALUE></ECUC-INTEGER-PARAM-VALUE>
              </PARAMETER-VALUES>
            </ECUC-CONTAINER-VALUE>
          </CONTAINERS>
        </ECUC-MODULE-CONFIGURATION-VALUES>
      </ELEMENTS>
    </AR-PACKAGE>
  </AR-PACKAGES>
</AUTOSAR>`;
}

function generateWdgMCfgH() {
  const b = (v) => (v ? "STD_ON" : "STD_OFF");
  return `#ifndef WDGM_CFG_H
#define WDGM_CFG_H

#include "Std_Types.h"

#define WDGM_DEV_ERROR_DETECT                   ${b(ecucConfig.WdgMDevErrorDetect)}
#define WDGM_VERSION_INFO_API                   ${b(ecucConfig.WdgMVersionInfoApi)}
#define WDGM_DEFENSIVE_BEHAVIOR                 ${b(ecucConfig.WdgMDefensiveBehavior)}
#define WDGM_IMMEDIATE_RESET                    ${b(ecucConfig.WdgMImmediateReset)}
#define WDGM_OFF_MODE_ENABLED                   ${b(!ecucConfig.WdgMDefensiveBehavior)}
#define WDGM_DEADLINE_TIMEOUT_DETECTION         ${b(ecucConfig.WdgMEnableDeadlineTimeoutDetection)}
#define WDGM_DEM_SUPERVISION_REPORT             ${b(ecucConfig.WdgMDemEventParameterRefs)}
#define WDGM_PARTITION_RESET_ENABLED            ${b(ecucConfig.WdgMPartitionResetEnabled)}
#define WDGM_EXTERNAL_WINDOW_WDG_ENABLED        ${b(ecucConfig.ExternalWindowWdgEnabled)}

#define WDGM_NR_OF_ENTITIES                     3u
#define WDGM_SUPERVISION_CYCLE_MS               ${ecucConfig.WdgMSupervisionCycle}u
#define WDGM_EXPIRED_SUPERVISION_CYCLE_TOL      ${ecucConfig.WdgMExpiredSupervisionCycleTol}u

#endif /* WDGM_CFG_H */`;
}

function generateWdgMLcfgC() {
  return `#include "WdgM.h"
#include "WdgM_Cfg.h"

const WdgM_AliveSupervisionType WdgM_AliveConfig_Mode = {
  .ExpectedAliveIndications  = ${ecucConfig.WdgMExpectedAliveIndications}u,
  .SupervisionReferenceCycle = ${ecucConfig.WdgMSupervisionReferenceCycle}u,
  .MinMargin                 = ${ecucConfig.WdgMMinMargin}u,
  .MaxMargin                 = ${ecucConfig.WdgMMaxMargin}u
};

const WdgM_DeadlineSupervisionType WdgM_DeadlineConfig_SE0 = {
  .StartCheckpointId = ${ecucConfig.WdgMDeadlineStartRef}u,
  .StopCheckpointId  = ${ecucConfig.WdgMDeadlineStopRef}u,
  .DeadlineMinMs     = ${ecucConfig.WdgMDeadlineMin}u,
  .DeadlineMaxMs     = ${ecucConfig.WdgMDeadlineMax}u
};

const WdgM_TriggerType WdgM_TriggerConfig[2] = {
  { .DeviceIndex = 0u, .WdgMode = ${ecucConfig.WdgMTriggerMode_IntWdg}, .TriggerConditionMs = ${ecucConfig.WdgMTriggerConditionValue_Int}u },
  { .DeviceIndex = 1u, .WdgMode = ${ecucConfig.WdgMTriggerMode_IntWdg}, .TriggerConditionMs = ${ecucConfig.WdgMTriggerConditionValue_Ext}u }
};

const WdgM_ConfigType WdgM_Config = {
  .InitialMode                  = WDGM_${ecucConfig.ActiveWdgMMode},
  .FailedAliveRefCycleTol_SE0   = ${ecucConfig.WdgMFailedAliveSupervisionRefCycleTol}u,
  .ExpiredSupervisionCycleTol   = ${ecucConfig.WdgMExpiredSupervisionCycleTol}u,
  .AliveConfig                  = &WdgM_AliveConfig_Mode,
  .DeadlineConfig               = &WdgM_DeadlineConfig_SE0,
  .TriggerConfigs               = WdgM_TriggerConfig
};`;
}
