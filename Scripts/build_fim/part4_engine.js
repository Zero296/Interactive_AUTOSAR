// ================= PART 4A: FIM SIMULATION ENGINE, ECUC SYNC & AUTOSAR API HANDLERS =================

const defaultConfig = {
  // Tab 0: General (7)
  FiMInitialized: true,
  FiMDevErrorDetect: true,
  FiMVersionInfoApi: false,
  FiMEventUpdateTriggeredByDem: true,
  FiMAvailabilitySupport: true,
  FiMMainFunctionPeriod: 20,
  FiMMaxHandledFidEventLinksPerSchedulableStep: 64,
  // Tab 1: FID & Availability (6)
  FID0_Name: "FID_0_AdaptiveCruiseControl",
  FID0_Available: true,
  FID1_Name: "FID_1_AutoEmergencyBraking",
  FID1_Available: true,
  FID2_Name: "FID_2_RadarDiagMonitor",
  FID2_Available: true,
  // Tab 2: Inhibit Config & Masks (6)
  InhCfg0_Mask: "FIM_LAST_FAILED",
  Evt01_UdsStatusHex: "0x00",
  InhCfg1_Mask: "FIM_NOT_TESTED",
  Evt02_UdsStatusHex: "0x50",
  InhCfg2_Mask: "FIM_TESTED_AND_FAILED",
  Evt03_UdsStatusHex: "0x00",
  // Tab 3: Summary & Component (5)
  SummaryEvent_Sum01_Enabled: false,
  ComponentInhibition_Enabled: false,
  Comp01_FailedStatus: false,
  FiMMaxSummaryEvents: 16,
  FiMMaxEventsPerFidInhibitionConfiguration: 16,
  // Tab 4: DEM Sync & DET (5)
  CascadingFaultSuppressionEnabled: false,
  ConfigVariantType: "POST_BUILD_LOADABLE",
  FiMDataFixed: true,
  ObdIumprInhibitionSupport: false,
  SimulateDetFaultType: "NONE"
};

let ecucConfig = JSON.parse(JSON.stringify(defaultConfig));

function createInitialSimState() {
  return {
    clockMs: 0,
    lifecycleState: "FIM_INITIALIZED_READY",
    selectedEventIdx: 0,
    selectedFidIdx: 0,
    selectedRuleId: "InhCfg0",
    pollingCursor: 0,
    demEvents: [
      { id: 1, sym: "Evt_01_RadarSignalErr",       shortName: "RadarSignalErr",  statusByte: 0x00, suppressedCount: 0 },
      { id: 2, sym: "Evt_02_SensorSupply5V_UnderV", shortName: "SensorSupply5V",  statusByte: 0x50, suppressedCount: 0 },
      { id: 3, sym: "Evt_03_BatteryOverVoltage",    shortName: "BatteryOverVolt", statusByte: 0x00, suppressedCount: 0 }
    ],
    fimCacheEvents: [0x00, 0x50, 0x00],
    demCompFailed: false,
    fimCacheCompFailed: false,
    fids: [
      { id: 0, available: true, inhibitCount: 0, maskMatch: false, sumMatch: false, compMatch: false, permission: true, lastQueriedPerm: true, iumprLocked: false },
      { id: 1, available: true, inhibitCount: 0, maskMatch: false, sumMatch: false, compMatch: false, permission: true, lastQueriedPerm: true, iumprLocked: false },
      { id: 2, available: true, inhibitCount: 1, maskMatch: true,  sumMatch: false, compMatch: false, permission: false, lastQueriedPerm: false, iumprLocked: false }
    ],
    rules: [],
    detFaults: [],
    regAByte: 0x00,
    prevRegAByte: 0x00,
    regBByte: 0xE3,
    prevRegBByte: 0xE3,
    activeModId: "MOD_FIM",
    activeArrows: [],
    stepExplain: "Hệ thống FiM sẵn sàng. Chọn kịch bản hoặc dùng Thao Tác Nhanh để chạy thử.",
    traceLogs: []
  };
}

let simState = createInitialSimState();

function parseHexByte(str) {
  const cleaned = String(str || "0").trim().replace(/^0x/i, "");
  const val = parseInt(cleaned, 16);
  return Number.isFinite(val) ? (val & 0xFF) : 0;
}

function fmtHexByte(val) {
  return "0x" + ((val & 0xFF).toString(16).toUpperCase().padStart(2, "0"));
}

function fmtBinByte(val) {
  const b = (val & 0xFF).toString(2).padStart(8, "0");
  return b.slice(0, 4) + " " + b.slice(4) + "b";
}

function evaluateMask(statusByte, maskName) {
  const def = FIM_MASKS_DEF[maskName] || FIM_MASKS_DEF.FIM_LAST_FAILED;
  const s = statusByte & 0xFF;
  const andVal = s & def.maskByte;
  const matched = (andVal === def.patternByte);
  const formulaStr = "(" + fmtHexByte(s) + " & " + fmtHexByte(def.maskByte) + ")=" + fmtHexByte(andVal) + (matched ? " == " : " != ") + fmtHexByte(def.patternByte);
  return {
    maskName: def.id,
    maskByte: def.maskByte,
    patternByte: def.patternByte,
    andVal: andVal,
    matched: matched,
    formulaStr: formulaStr
  };
}

function isFimReady() {
  return simState.lifecycleState === "FIM_INITIALIZED_READY";
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

function pushArrow(arrId) {
  if (!simState.activeArrows.includes(arrId)) {
    simState.activeArrows.push(arrId);
  }
}

function recordDetError(apiIdHex, apiName, errorCode, detail) {
  if (!ecucConfig.FiMDevErrorDetect) {
    addTraceLog("warn", apiName + " (DET Disabled)", "FiMDevErrorDetect=FALSE nên bỏ qua báo cáo lỗi " + errorCode + ".");
    return;
  }
  simState.detFaults.unshift({ t: simState.clockMs, api: apiName, code: errorCode, detail: detail });
  if (simState.detFaults.length > 25) simState.detFaults.length = 25;
  simState.activeModId = "MOD_DET";
  pushArrow("arr_fim_det");
  addTraceLog("err", "Det_ReportError(11, 0, " + apiIdHex + " [" + apiName + "], " + errorCode + ")", detail);
}

function recomputeFimState(preservePrevBits) {
  if (!preservePrevBits) {
    simState.prevRegAByte = simState.regAByte;
    simState.prevRegBByte = simState.regBByte;
  }

  const ready = isFimReady();
  const c0 = simState.fimCacheEvents[0] & 0xFF;
  const c1 = simState.fimCacheEvents[1] & 0xFF;
  const c2 = simState.fimCacheEvents[2] & 0xFF;

  const eval0 = evaluateMask(c0, ecucConfig.InhCfg0_Mask);
  const eval1 = evaluateMask(c1, ecucConfig.InhCfg1_Mask);
  const sumEvalE2 = evaluateMask(c1, ecucConfig.InhCfg2_Mask);
  const sumEvalE3 = evaluateMask(c2, ecucConfig.InhCfg2_Mask);
  const sumActive = Boolean(ecucConfig.SummaryEvent_Sum01_Enabled);
  const sumMatched = sumActive && (sumEvalE2.matched || sumEvalE3.matched);
  const compActive = Boolean(ecucConfig.ComponentInhibition_Enabled);
  const compMatched = compActive && Boolean(simState.fimCacheCompFailed);

  simState.rules = [
    {
      id: "InhCfg0",
      eventIdx: 0,
      kind: "EVENT",
      enabled: true,
      sourceLabel: "Evt_01: RadarSignalErr",
      statusDisplay: fmtHexByte(c0),
      maskName: ecucConfig.InhCfg0_Mask,
      formula: eval0.formulaStr,
      targetFids: [0, 1],
      targetLabel: "FID_0, FID_1",
      matched: ready && eval0.matched
    },
    {
      id: "InhCfg1",
      eventIdx: 1,
      kind: "EVENT",
      enabled: true,
      sourceLabel: "Evt_02: SensorSupply5V",
      statusDisplay: fmtHexByte(c1),
      maskName: ecucConfig.InhCfg1_Mask,
      formula: eval1.formulaStr,
      targetFids: [2],
      targetLabel: "FID_2",
      matched: ready && eval1.matched
    },
    {
      id: "InhCfg2",
      eventIdx: 2,
      kind: "SUMMARY",
      enabled: sumActive,
      sourceLabel: "Sum_01 (Evt_02 | Evt_03)",
      statusDisplay: "E2:" + fmtHexByte(c1) + " E3:" + fmtHexByte(c2),
      maskName: ecucConfig.InhCfg2_Mask,
      formula: sumActive ? ("OR(" + (sumEvalE2.matched ? "1" : "0") + "," + (sumEvalE3.matched ? "1" : "0") + ")") : "DISABLED",
      targetFids: [0],
      targetLabel: "FID_0",
      matched: ready && sumMatched
    },
    {
      id: "InhCfg3",
      eventIdx: 0,
      kind: "COMPONENT",
      enabled: compActive,
      sourceLabel: "Comp_01: RadarHwCluster",
      statusDisplay: simState.fimCacheCompFailed ? "Failed=1" : "Failed=0",
      maskName: "DEM_COMP_FAILED",
      formula: compActive ? ("Failed==" + (simState.fimCacheCompFailed ? "TRUE" : "FALSE")) : "DISABLED",
      targetFids: [0, 1],
      targetLabel: "FID_0, FID_1",
      matched: ready && compMatched
    }
  ];

  // Compute FID 0, 1, 2
  const availFlags = [
    Boolean(ecucConfig.FID0_Available),
    Boolean(ecucConfig.FID1_Available),
    Boolean(ecucConfig.FID2_Available)
  ];

  for (let fidId = 0; fidId < 3; fidId++) {
    const f = simState.fids[fidId];
    f.available = ecucConfig.FiMAvailabilitySupport ? availFlags[fidId] : true;

    let inhCnt = 0;
    let maskMatch = false;
    let sumMatch = false;
    let compMatch = false;

    if (ready) {
      simState.rules.forEach((r) => {
        if (!r.enabled || !r.targetFids.includes(fidId)) return;
        if (r.matched) {
          inhCnt += 1;
          if (r.kind === "EVENT") maskMatch = true;
          if (r.kind === "SUMMARY") {
            sumMatch = true;
            maskMatch = true;
          }
          if (r.kind === "COMPONENT") compMatch = true;
        }
      });
    }

    f.inhibitCount = inhCnt;
    f.maskMatch = maskMatch;
    f.sumMatch = sumMatch;
    f.compMatch = compMatch;
    f.permission = Boolean(ready && f.available && inhCnt === 0);
    f.iumprLocked = Boolean(ecucConfig.ObdIumprInhibitionSupport && !f.permission);
  }

  // Update Register A (selected Event's DEM status byte) and Register B (selected FID's Engine Status Byte)
  const selEvt = simState.demEvents[simState.selectedEventIdx] || simState.demEvents[0];
  simState.regAByte = selEvt.statusByte & 0xFF;

  const selFid = simState.fids[simState.selectedFidIdx] || simState.fids[0];
  let b = 0x00;
  if (ready) b |= 0x80;
  if (ecucConfig.FiMEventUpdateTriggeredByDem) b |= 0x40;
  if (ecucConfig.FiMAvailabilitySupport) b |= 0x20;
  if (selFid.compMatch) b |= 0x10;
  if (selFid.sumMatch) b |= 0x08;
  if (selFid.maskMatch) b |= 0x04;
  if (selFid.available) b |= 0x02;
  if (selFid.permission) b |= 0x01;
  simState.regBByte = b & 0xFF;

  // Keep config strings aligned with DEM bytes
  ecucConfig.Evt01_UdsStatusHex = fmtHexByte(simState.demEvents[0].statusByte);
  ecucConfig.Evt02_UdsStatusHex = fmtHexByte(simState.demEvents[1].statusByte);
  ecucConfig.Evt03_UdsStatusHex = fmtHexByte(simState.demEvents[2].statusByte);
  ecucConfig.FiMInitialized = ready;
  ecucConfig.Comp01_FailedStatus = simState.demCompFailed;
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
  if (!isFimReady()) {
    const msg = simState.lifecycleState === "FIM_PRE_INITIALIZED"
      ? "FIM_PRE_INITIALIZED: Đã chạy FiM_Init() nhưng chưa chạy FiM_DemInit(). Mọi GetFunctionPermission() đều trả FALSE!"
      : "FIM_UNINITIALIZED: FiM chưa khởi tạo! Mọi API gọi vào sẽ trả E_NOT_OK và báo DET FIM_E_UNINIT (0x01).";
    alerts.push({ err: true, msg: msg });
  }
  if (!ecucConfig.FiMEventUpdateTriggeredByDem) {
    const stale = simState.demEvents.some((e, i) => e.statusByte !== simState.fimCacheEvents[i]) || (simState.demCompFailed !== simState.fimCacheCompFailed);
    if (stale) {
      alerts.push({ err: false, msg: "Polling Mode: DEM đã đổi status nhưng FiM chưa quét. Hãy bấm '+20ms MainFn' để FiM_MainFunction() cập nhật!" });
    }
  }
  if (ecucConfig.CascadingFaultSuppressionEnabled && !simState.fids[2].permission) {
    alerts.push({ err: false, msg: "Cascading Gate Active: FID_2 đang FALSE nên mọi lỗi Evt_01 (Radar) sẽ bị chặn không cho ghi xuống DEM." });
  }
  return alerts;
}

// -------------------- AUTOSAR STANDARD API HANDLERS --------------------

function api_FiM_Init(useNullConfig) {
  simState.activeModId = "MOD_ECUM";
  pushArrow("arr_ecum_fim");
  if (useNullConfig && ecucConfig.ConfigVariantType === "POST_BUILD_LOADABLE") {
    simState.lifecycleState = "FIM_UNINITIALIZED";
    ecucConfig.FiMInitialized = false;
    recomputeFimState();
    recordDetError("0x00", "FiM_Init(NULL_PTR)", "FIM_E_INIT_FAILED (0x05)", "ConfigVariantType = POST_BUILD_LOADABLE nhưng ConfigPtr == NULL_PTR.");
    return false;
  }
  simState.lifecycleState = "FIM_PRE_INITIALIZED";
  ecucConfig.FiMInitialized = false;
  simState.pollingCursor = 0;
  recomputeFimState();
  addTraceLog("info", "FiM_Init(" + (useNullConfig ? "NULL_PTR" : "&FiM_Config") + ")", "Khởi tạo cấu trúc tĩnh FiM (PRE_INITIALIZED). Đang chờ DEM gọi FiM_DemInit() [SWS_FiM_00059].");
  return true;
}

function api_FiM_DemInit() {
  if (simState.lifecycleState === "FIM_UNINITIALIZED") {
    recordDetError("0x03", "FiM_DemInit()", "FIM_E_UNINIT (0x01)", "Gọi FiM_DemInit() trước khi EcuM gọi FiM_Init()!");
    return false;
  }
  simState.lifecycleState = "FIM_INITIALIZED_READY";
  ecucConfig.FiMInitialized = true;
  for (let i = 0; i < 3; i++) {
    simState.fimCacheEvents[i] = simState.demEvents[i].statusByte;
  }
  simState.fimCacheCompFailed = simState.demCompFailed;
  pushArrow("arr_dem_fim_push");
  pushArrow("arr_fim_dem_poll");
  simState.activeModId = "MOD_FIM";
  recomputeFimState();
  addTraceLog("ok", "FiM_DemInit()", "DEM gọi FiM_DemInit(): Quét Dem_GetEventUdsStatus() & Dem_GetComponentFailed() cho toàn bộ Events/Comp -> FiM READY [SWS_FiM_00006].");
  return true;
}

function api_FiM_DemTriggerOnEventStatus(evtIdx, oldStatus, newStatus) {
  pushArrow("arr_dem_fim_push");
  if (!isFimReady()) {
    recordDetError("0x02", "FiM_DemTriggerOnEventStatus(" + evtIdx + ")", "FIM_E_UNINIT (0x01)", "FiM chưa ở trạng thái INITIALIZED khi DEM gọi callback.");
    return false;
  }
  if (evtIdx < 0 || evtIdx >= simState.demEvents.length) {
    recordDetError("0x02", "FiM_DemTriggerOnEventStatus(" + evtIdx + ")", "FIM_E_EVENTID_OUT_OF_RANGE (0x03)", "EventId = " + evtIdx + " vượt ngoài dải cấu hình FiM!");
    return false;
  }
  simState.fimCacheEvents[evtIdx] = newStatus & 0xFF;
  simState.activeModId = "MOD_FIM";
  recomputeFimState();
  addTraceLog("ok", "FiM_DemTriggerOnEventStatus(" + simState.demEvents[evtIdx].sym + ", " + fmtHexByte(oldStatus) + " -> " + fmtHexByte(newStatus) + ")", "Push Mode: Cập nhật tức thì InhibitCounter[] và bảng Permission [SWS_FiM_00021].");
  return true;
}

function api_FiM_DemTriggerOnComponentStatus(compFailed) {
  simState.demCompFailed = Boolean(compFailed);
  ecucConfig.Comp01_FailedStatus = simState.demCompFailed;
  simState.activeModId = "MOD_DEM";
  if (!isFimReady()) {
    recordDetError("0x06", "FiM_DemTriggerOnComponentStatus(Comp_01)", "FIM_E_UNINIT (0x01)", "FiM chưa khởi tạo hoàn chỉnh.");
    return false;
  }
  if (ecucConfig.FiMEventUpdateTriggeredByDem) {
    simState.fimCacheCompFailed = simState.demCompFailed;
    pushArrow("arr_dem_fim_push");
    recomputeFimState();
    addTraceLog(compFailed ? "err" : "ok", "FiM_DemTriggerOnComponentStatus(Comp_01, " + (compFailed ? "TRUE" : "FALSE") + ")", "Push Mode: Cập nhật trạng thái hỏng DemComponent Comp_01 sang FiM [SWS_FiM_00099].");
  } else {
    recomputeFimState();
    addTraceLog("warn", "DemComponent[Comp_01].Failed = " + (compFailed ? "TRUE" : "FALSE") + " (Chờ Polling)", "Polling Mode: Đợi FiM_MainFunction() gọi Dem_GetComponentFailed().");
  }
  return true;
}

function api_Dem_SetEventStatus(evtIdx, newStatusByte, reasonTag) {
  const ev = simState.demEvents[evtIdx];
  if (!ev) return false;
  simState.selectedEventIdx = evtIdx;

  // Cascading Fault Suppression Gate (SWC_DiagMonitor checks FID_2 before reporting Evt_01 FAILED)
  const isFailureReport = (newStatusByte & 0x01) !== 0;
  if (evtIdx === 0 && isFailureReport && ecucConfig.CascadingFaultSuppressionEnabled) {
    pushArrow("arr_swc_mon_fim");
    const gatePerm = simState.fids[2].permission;
    addTraceLog(gatePerm ? "info" : "warn", "FiM_GetFunctionPermission(FID_2_RadarDiagMonitor, &Perm)", "SWC_DiagMonitor hỏi cổng tiền đề trước khi báo lỗi Evt_01 -> Perm = " + (gatePerm ? "TRUE" : "FALSE"));
    if (!gatePerm) {
      ev.suppressedCount += 1;
      simState.activeModId = "MOD_SWC_MON";
      recomputeFimState();
      addTraceLog("ok", "Cascading Fault Suppressed! (Không gọi Dem_SetEventStatus)", "Vì FID_2 = FALSE (nguồn 5V lỗi/chưa test), SWC_DiagMonitor CHẶN báo lỗi giả Evt_01 để tránh Secondary DTC!");
      return false;
    }
  }

  const oldStatus = ev.statusByte;
  ev.statusByte = newStatusByte & 0xFF;
  pushArrow("arr_swc_mon_dem");
  simState.activeModId = "MOD_DEM";
  addTraceLog(isFailureReport ? "err" : "info", "Dem_SetEventStatus(" + ev.sym + ", " + (reasonTag || fmtHexByte(newStatusByte)) + ")", "DEM cập nhật UdsStatusByte: " + fmtHexByte(oldStatus) + " -> " + fmtHexByte(ev.statusByte) + ".");

  if (ecucConfig.FiMEventUpdateTriggeredByDem && oldStatus !== ev.statusByte) {
    api_FiM_DemTriggerOnEventStatus(evtIdx, oldStatus, ev.statusByte);
  } else {
    recomputeFimState();
    if (!ecucConfig.FiMEventUpdateTriggeredByDem && oldStatus !== ev.statusByte) {
      addTraceLog("warn", "Polling Mode (Chưa cập nhật FiM Cache)", "FiMEventUpdateTriggeredByDem=FALSE: FiM vẫn giữ giá trị cũ " + fmtHexByte(simState.fimCacheEvents[evtIdx]) + " cho đến tick FiM_MainFunction()!");
    }
  }
  return true;
}

function api_Dem_SetOperationCycleStart(preservePreviousTf) {
  pushArrow("arr_ecum_dem");
  simState.activeModId = "MOD_DEM";
  for (let i = 0; i < 3; i++) {
    const oldS = simState.demEvents[i].statusByte;
    let newS = (oldS | 0x40) & ~0x02; // Bit 6 TNCTOC = 1, Bit 1 TFTOC = 0
    if (!preservePreviousTf) {
      newS = newS & ~0x01; // Clear Bit 0 TF if fresh cycle
    }
    simState.demEvents[i].statusByte = newS;
    if (ecucConfig.FiMEventUpdateTriggeredByDem && oldS !== newS) {
      simState.fimCacheEvents[i] = newS;
      pushArrow("arr_dem_fim_push");
    }
  }
  recomputeFimState();
  addTraceLog("warn", "Dem_SetOperationCycleState(IGNITION_CYCLE, START)", "Đặt Bit 6 (TNCTOC = 1) cho các Events" + (preservePreviousTf ? " (giữ lại cờ TF cũ nếu có -> 0x6D)" : "") + (ecucConfig.FiMEventUpdateTriggeredByDem ? " và đẩy Push sang FiM." : "."));
}

function api_Dem_ClearDTC() {
  pushArrow("arr_dcm_dem");
  simState.activeModId = "MOD_DCM";
  for (let i = 0; i < 3; i++) {
    simState.demEvents[i].statusByte = 0x50; // Bit 6 TNCTOC=1, Bit 4 TNCSLC=1, TF=0
    simState.demEvents[i].suppressedCount = 0;
  }
  simState.demCompFailed = false;
  ecucConfig.Comp01_FailedStatus = false;
  addTraceLog("info", "Dem_ClearDTC(0xFFFFFF) [UDS 0x14]", "DCM xóa sạch bộ nhớ lỗi DEM -> Mọi Event về 0x50 (TF=0, TNCTOC=1) và gọi FiM_DemInit().");
  api_FiM_DemInit();
}

function api_FiM_GetFunctionPermission(fidIdx, isNullPtr) {
  pushArrow("arr_swc_ctrl_rte");
  pushArrow("arr_rte_fim");
  if (!isFimReady()) {
    recordDetError("0x01", "FiM_GetFunctionPermission(" + fidIdx + ")", "FIM_E_UNINIT (0x01)", "Trả về E_NOT_OK và ép *Permission = FALSE để bảo vệ an toàn.");
    return { retVal: "E_NOT_OK", permission: false };
  }
  if (fidIdx < 0 || fidIdx >= simState.fids.length) {
    recordDetError("0x01", "FiM_GetFunctionPermission(" + fidIdx + ")", "FIM_E_FID_OUT_OF_RANGE (0x02)", "FID = " + fidIdx + " vượt quá số lượng FID cấu hình (0..2)!");
    return { retVal: "E_NOT_OK", permission: false };
  }
  if (isNullPtr) {
    recordDetError("0x01", "FiM_GetFunctionPermission(" + fidIdx + ", NULL_PTR)", "FIM_E_PARAM_POINTER (0x04)", "Con trỏ *Permission truyền vào là NULL_PTR!");
    return { retVal: "E_NOT_OK", permission: false };
  }
  simState.selectedFidIdx = fidIdx;
  const f = simState.fids[fidIdx];
  f.lastQueriedPerm = f.permission;
  if (ecucConfig.ObdIumprInhibitionSupport) {
    pushArrow("arr_fim_obd");
  }
  simState.activeModId = "MOD_FIM";
  recomputeFimState(true);
  const fidName = ecucConfig["FID" + fidIdx + "_Name"] || ("FID_" + fidIdx);
  addTraceLog(f.permission ? "ok" : "warn", "FiM_GetFunctionPermission(" + fidName + ", &Perm)", "Kết quả O(1): *Permission = " + (f.permission ? "TRUE (NORMAL)" : "FALSE (FAIL-SAFE / INHIBITED)") + " | InhibitCnt=" + f.inhibitCount + " [SWS_FiM_00011].");
  return { retVal: "E_OK", permission: f.permission };
}

function api_FiM_SetFunctionAvailable(fidIdx, avail) {
  pushArrow("arr_ecum_fim");
  if (!isFimReady()) {
    recordDetError("0x07", "FiM_SetFunctionAvailable(" + fidIdx + ")", "FIM_E_UNINIT (0x01)", "FiM chưa sẵn sàng khi gọi FiM_SetFunctionAvailable.");
    return false;
  }
  if (fidIdx < 0 || fidIdx >= simState.fids.length) {
    recordDetError("0x07", "FiM_SetFunctionAvailable(" + fidIdx + ")", "FIM_E_FID_OUT_OF_RANGE (0x02)", "FID = " + fidIdx + " không tồn tại trong cấu hình.");
    return false;
  }
  if (!ecucConfig.FiMAvailabilitySupport) {
    addTraceLog("warn", "FiM_SetFunctionAvailable(" + fidIdx + ", " + (avail ? "TRUE" : "FALSE") + ")", "Bị bỏ qua (E_NOT_OK) vì FiMAvailabilitySupport = FALSE!");
    return false;
  }
  ecucConfig["FID" + fidIdx + "_Available"] = Boolean(avail);
  simState.selectedFidIdx = fidIdx;
  simState.activeModId = "MOD_FIM";
  recomputeFimState();
  const fidName = ecucConfig["FID" + fidIdx + "_Name"] || ("FID_" + fidIdx);
  addTraceLog(avail ? "ok" : "warn", "FiM_SetFunctionAvailable(" + fidName + ", " + (avail ? "TRUE" : "FALSE") + ")", "Đặt Availability[" + fidIdx + "] = " + (avail ? "TRUE" : "FALSE") + " -> Permission = " + (simState.fids[fidIdx].permission ? "TRUE" : "FALSE") + " [SWS_FiM_00106].");
  return true;
}

function stepClockTick(dtMs) {
  const stepPeriod = Number(ecucConfig.FiMMainFunctionPeriod) || 20;
  const delta = Number(dtMs) || stepPeriod;
  simState.clockMs += delta;
  pushArrow("arr_rte_fim");

  if (!isFimReady()) {
    addTraceLog("warn", "FiM_MainFunction() [t=" + simState.clockMs + "ms]", "FiM chưa ở trạng thái INITIALIZED_READY -> Bỏ qua quét DEM.");
    renderAll();
    return;
  }

  if (!ecucConfig.FiMEventUpdateTriggeredByDem) {
    const budget = Math.max(1, Number(ecucConfig.FiMMaxHandledFidEventLinksPerSchedulableStep) || 64);
    let handled = 0;
    const updatedNames = [];
    for (let k = 0; k < 3 && handled < budget; k++) {
      const idx = (simState.pollingCursor + k) % 3;
      const demVal = simState.demEvents[idx].statusByte;
      if (simState.fimCacheEvents[idx] !== demVal) {
        simState.fimCacheEvents[idx] = demVal;
        updatedNames.push(simState.demEvents[idx].shortName + "=" + fmtHexByte(demVal));
      }
      handled += 1;
    }
    simState.pollingCursor = (simState.pollingCursor + handled) % 3;
    if (handled <= budget && simState.fimCacheCompFailed !== simState.demCompFailed) {
      simState.fimCacheCompFailed = simState.demCompFailed;
      updatedNames.push("Comp_01=" + (simState.fimCacheCompFailed ? "FAIL" : "OK"));
    }
    pushArrow("arr_fim_dem_poll");
    simState.activeModId = "MOD_FIM";
    recomputeFimState();
    addTraceLog("info", "FiM_MainFunction() [Polling, MaxLinks=" + budget + "]", updatedNames.length ? ("Gọi Dem_GetEventUdsStatus(): Cập nhật " + updatedNames.join(", ") + " [SWS_FiM_00065].") : "Quét chu kỳ DEM: Không có sai khác trạng thái mới.");
  } else {
    recomputeFimState(true);
    addTraceLog("info", "FiM_MainFunction() [Push Mode Active]", "FiMEventUpdateTriggeredByDem=TRUE nên bảng Permission đã được cập nhật tức thời bởi DEM.");
  }
  renderAll();
}

function onConfigInputChanged(key) {
  const el = document.getElementById("cfg_" + key);
  if (!el) return;
  if (el.type === "checkbox") {
    ecucConfig[key] = el.checked;
  } else if (el.type === "number") {
    ecucConfig[key] = Math.max(1, Number(el.value) || 1);
  } else {
    ecucConfig[key] = el.value;
  }

  let alreadyRecomputed = false;
  if (key === "FiMInitialized") {
    simState.lifecycleState = ecucConfig.FiMInitialized ? "FIM_INITIALIZED_READY" : "FIM_UNINITIALIZED";
    addTraceLog(ecucConfig.FiMInitialized ? "ok" : "err", ecucConfig.FiMInitialized ? "FiM_Init() + FiM_DemInit()" : "Set FiM = UNINIT", "Người dùng chuyển trạng thái FiMInitialized = " + ecucConfig.FiMInitialized);
  } else if (key === "Evt01_UdsStatusHex") {
    const val = parseHexByte(ecucConfig.Evt01_UdsStatusHex);
    api_Dem_SetEventStatus(0, val, "ManualHex");
    alreadyRecomputed = true;
  } else if (key === "Evt02_UdsStatusHex") {
    const val = parseHexByte(ecucConfig.Evt02_UdsStatusHex);
    api_Dem_SetEventStatus(1, val, "ManualHex");
    alreadyRecomputed = true;
  } else if (key === "Evt03_UdsStatusHex") {
    const val = parseHexByte(ecucConfig.Evt03_UdsStatusHex);
    api_Dem_SetEventStatus(2, val, "ManualHex");
    alreadyRecomputed = true;
  } else if (key === "Comp01_FailedStatus") {
    api_FiM_DemTriggerOnComponentStatus(ecucConfig.Comp01_FailedStatus);
    alreadyRecomputed = true;
  } else if (key === "SimulateDetFaultType" && ecucConfig.SimulateDetFaultType !== "NONE") {
    const f = ecucConfig.SimulateDetFaultType;
    if (f === "UNINIT") {
      simState.lifecycleState = "FIM_UNINITIALIZED";
      api_FiM_GetFunctionPermission(0, false);
    } else if (f === "FID_OUT_OF_RANGE") {
      api_FiM_GetFunctionPermission(99, false);
    } else if (f === "EVENTID_OUT_OF_RANGE") {
      api_FiM_DemTriggerOnEventStatus(999, 0x00, 0x01);
    } else if (f === "PARAM_POINTER") {
      api_FiM_GetFunctionPermission(0, true);
    } else if (f === "INIT_FAILED") {
      ecucConfig.ConfigVariantType = "POST_BUILD_LOADABLE";
      api_FiM_Init(true);
    }
    alreadyRecomputed = true;
  } else if (key === "FID0_Available" || key === "FID1_Available" || key === "FID2_Available") {
    const idx = key === "FID0_Available" ? 0 : (key === "FID1_Available" ? 1 : 2);
    api_FiM_SetFunctionAvailable(idx, ecucConfig[key]);
    alreadyRecomputed = true;
  }

  recomputeFimState(alreadyRecomputed);
  syncConfigToDOM();
  simState.stepExplain = "Cấu hình ECUC [" + key + "] đã được cập nhật -> Ma trận Ức chế và 2 Thanh ghi đã tính toán lại.";
  renderAll();
}
