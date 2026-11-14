// ================= PART 4A: CORE AUTOSAR EEP ENGINE, API LOGIC, CHUNKING, HW & VERIFICATION =================

let ecucConfig = JSON.parse(JSON.stringify(defaultConfig));

const EEP_API_IDS = {
  Eep_Init: 0x00,
  Eep_SetMode: 0x01,
  Eep_Read: 0x02,
  Eep_Write: 0x03,
  Eep_Erase: 0x04,
  Eep_Compare: 0x05,
  Eep_Cancel: 0x06,
  Eep_GetStatus: 0x07,
  Eep_GetJobResult: 0x08,
  Eep_MainFunction: 0x09,
  Eep_GetVersionInfo: 0x0A
};

const EEP_DET_ERROR_NAMES = {
  0x00: "EEP_E_UNINIT",
  0x01: "EEP_E_INVALID_ADDRESS",
  0x02: "EEP_E_INVALID_DATA",
  0x03: "EEP_E_INVALID_LENGTH",
  0x04: "EEP_E_BUSY",
  0x05: "EEP_E_TIMEOUT",
  0x09: "EEP_E_INIT_FAILED",
  0x0A: "EEP_E_PARAM_POINTER"
};

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function fmtHex8(val) {
  const n = Number(val) & 0xFF;
  return "0x" + n.toString(16).toUpperCase().padStart(2, "0");
}

function fmtHex16(val) {
  const n = Number(val) & 0xFFFF;
  return "0x" + n.toString(16).toUpperCase().padStart(4, "0");
}

function parseHexOrNum(val, fallback) {
  if (typeof val === "number" && !Number.isNaN(val)) return Math.floor(val);
  if (typeof val === "string") {
    const t = val.trim();
    if (/^0x[0-9a-fA-F]+$/i.test(t)) return parseInt(t, 16);
    if (/^\d+$/.test(t)) return parseInt(t, 10);
  }
  return fallback;
}

function getEraseByte() {
  return parseHexOrNum(ecucConfig.EepEraseValue, 0xFF) & 0xFF;
}

function getBaseAddressNum() {
  return parseHexOrNum(ecucConfig.EepBaseAddress, 0) & 0xFFFF;
}

function getEepSize() {
  return Math.max(16, Math.min(256, parseHexOrNum(ecucConfig.EepSize, 256)));
}

function parseHexBytesString(str, targetLen, fillVal) {
  const tokens = String(str || "").trim().split(/[\s,;]+/).filter(Boolean);
  const bytes = [];
  for (let i = 0; i < tokens.length; i++) {
    const clean = tokens[i].replace(/^0x/i, "");
    const parsed = parseInt(clean, 16);
    if (!Number.isNaN(parsed)) bytes.push(parsed & 0xFF);
  }
  const len = targetLen > 0 ? targetLen : Math.max(1, bytes.length);
  const out = new Array(len);
  const fallback = typeof fillVal === "number" ? (fillVal & 0xFF) : 0xA5;
  for (let i = 0; i < len; i++) {
    if (bytes.length > 0) {
      out[i] = bytes[i % bytes.length];
    } else {
      out[i] = (fallback + i) & 0xFF;
    }
  }
  return out;
}

function createInitialEepromArray() {
  const eraseB = getEraseByte();
  return new Array(256).fill(eraseB);
}

const simState = {
  timeMs: 0,
  driverStatus: "MEMIF_IDLE",
  jobResult: "MEMIF_JOB_OK",
  currentMode: "MEMIF_MODE_SLOW",
  eepromMemory: createInitialEepromArray(),
  writeCounts: new Array(256).fill(0),
  stuckBits: {},
  lastModifiedRange: { start: -1, end: -1, kind: "" },
  activeChunkRange: { start: -1, end: -1, kind: "" },
  mismatchAddrs: [],
  ramBuffer: new Array(64).fill(0xFF),
  expectedBuffer: new Array(64).fill(0xFF),
  activeJob: null,
  nextJobId: 1,
  regAByte: 0x90,
  regBByte: 0x80,
  driverSmState: "IDLE",
  hwSmState: "HW_READY",
  eaSubJobState: "EA_IDLE",
  hwBusyTimerMs: 0,
  hwBusyTargetMs: 0,
  detFaults: [],
  demFaults: {
    EEP_E_WRITE_FAILED: "NONE",
    EEP_E_READ_FAILED: "NONE",
    EEP_E_ERASE_FAILED: "NONE",
    EEP_E_COMPARE_FAILED: "NONE"
  },
  demFaultLog: [],
  traceLogs: [],
  activeArrows: [],
  selectedModuleId: "MOD_EEP",
  inspTabIdx: 0,
  cellClickMode: "TOGGLE_BYTE",
  lastApiCodeKey: "Eep_Init",
  lastCallbackCalled: null,
  hwInterruptCount: 0,
  lastSpiFrames: [],
  versionInfoResult: {
    vendorID: 43,
    moduleID: 90,
    sw_major_version: 23,
    sw_minor_version: 11,
    sw_patch_version: 0
  }
};

function resetSimState(keepConfig) {
  if (!keepConfig) {
    ecucConfig = deepClone(defaultConfig);
  }
  const eraseB = getEraseByte();
  simState.timeMs = 0;
  simState.driverStatus = ecucConfig.EepInitialized ? "MEMIF_IDLE" : "MEMIF_UNINIT";
  simState.jobResult = "MEMIF_JOB_OK";
  simState.currentMode = ecucConfig.CurrentMemIfMode || ecucConfig.EepDefaultMode || "MEMIF_MODE_SLOW";
  ecucConfig.CurrentMemIfMode = simState.currentMode;
  simState.eepromMemory = new Array(256).fill(eraseB);
  simState.writeCounts = new Array(256).fill(0);
  simState.stuckBits = {};
  simState.lastModifiedRange = { start: -1, end: -1, kind: "" };
  simState.activeChunkRange = { start: -1, end: -1, kind: "" };
  simState.mismatchAddrs = [];
  simState.ramBuffer = new Array(64).fill(eraseB);
  simState.expectedBuffer = new Array(64).fill(eraseB);
  simState.activeJob = null;
  simState.nextJobId = 1;
  simState.driverSmState = ecucConfig.EepInitialized ? "IDLE" : "UNINIT";
  simState.hwSmState = "HW_READY";
  simState.eaSubJobState = "EA_IDLE";
  simState.hwBusyTimerMs = 0;
  simState.hwBusyTargetMs = 0;
  simState.detFaults = [];
  simState.demFaults = {
    EEP_E_WRITE_FAILED: "NONE",
    EEP_E_READ_FAILED: "NONE",
    EEP_E_ERASE_FAILED: "NONE",
    EEP_E_COMPARE_FAILED: "NONE"
  };
  simState.demFaultLog = [];
  simState.traceLogs = [];
  simState.activeArrows = [];
  simState.lastApiCodeKey = "Eep_Init";
  simState.lastCallbackCalled = null;
  simState.hwInterruptCount = 0;
  simState.lastSpiFrames = [];
  updateDerivedRegisters();
}

function addTrace(entry) {
  simState.traceLogs.push({
    timeMs: simState.timeMs,
    layer: entry.layer || "MCAL",
    caller: entry.caller || "Ea",
    callee: entry.callee || "Eep",
    api: entry.api || "",
    params: entry.params || "",
    ret: entry.ret || "E_OK",
    result: entry.result || simState.jobResult,
    tone: entry.tone || "ok",
    note: entry.note || ""
  });
  if (simState.traceLogs.length > 120) {
    simState.traceLogs.shift();
  }
}

function reportDetError(kind, apiId, apiName, errorId, errorName, detail) {
  const errObj = {
    timeMs: simState.timeMs,
    kind: kind,
    apiId: fmtHex8(apiId),
    apiName: apiName,
    errorId: fmtHex8(errorId),
    errorName: errorName,
    detail: detail
  };
  simState.detFaults.push(errObj);
  if (simState.detFaults.length > 40) simState.detFaults.shift();
  const reportFn = kind === "RUNTIME" ? "Det_ReportRuntimeError" : "Det_ReportError";
  addTrace({
    layer: "ERR",
    caller: "Eep",
    callee: "Det",
    api: `${reportFn}(90, 0, ${fmtHex8(apiId)}, ${errorName})`,
    params: `Api=${apiName}, Err=${fmtHex8(errorId)}`,
    ret: "E_NOT_OK",
    result: simState.jobResult,
    tone: "err",
    note: detail
  });
  if (!simState.activeArrows.includes("arr_eep_det")) {
    simState.activeArrows.push("arr_eep_det");
  }
}

function reportDemEvent(eventName, status, detail) {
  if (!ecucConfig.EepDemErrorReportingEnabled && status === "FAILED") {
    addTrace({
      layer: "DIAG",
      caller: "Eep",
      callee: "Dem (Disabled)",
      api: `Dem reporting suppressed (${eventName})`,
      params: "EepDemErrorReportingEnabled = FALSE",
      ret: "SKIP",
      result: simState.jobResult,
      tone: "warn",
      note: "Dem bi tat trong ECUC; Eep van tra MEMIF_JOB_FAILED len Ea."
    });
    return;
  }
  const prev = simState.demFaults[eventName];
  if (status === "PASSED" && prev === "NONE") return;
  simState.demFaults[eventName] = status;
  simState.demFaultLog.push({
    timeMs: simState.timeMs,
    eventName: eventName,
    status: status,
    detail: detail || ""
  });
  if (simState.demFaultLog.length > 40) simState.demFaultLog.shift();
  addTrace({
    layer: "DEM",
    caller: "Eep",
    callee: "Dem",
    api: `Dem_SetEventStatus(${eventName}, DEM_EVENT_STATUS_${status})`,
    params: detail || "",
    ret: status === "FAILED" ? "FAILED" : "PASSED",
    result: simState.jobResult,
    tone: status === "FAILED" ? "err" : "ok",
    note: detail || ""
  });
  if (!simState.activeArrows.includes("arr_eep_det")) {
    simState.activeArrows.push("arr_eep_det");
  }
}

function updateDerivedRegisters() {
  let regA = 0;
  if (ecucConfig.EepInitialized && simState.driverStatus !== "MEMIF_UNINIT") regA |= 0x80;
  if (simState.driverStatus === "MEMIF_BUSY") regA |= 0x40;
  if (simState.jobResult === "MEMIF_JOB_PENDING") regA |= 0x20;
  if (simState.jobResult === "MEMIF_JOB_OK") regA |= 0x10;
  if (simState.jobResult === "MEMIF_JOB_FAILED" || simState.jobResult === "MEMIF_BLOCK_INCONSISTENT") regA |= 0x08;
  if (simState.jobResult === "MEMIF_JOB_CANCELED") regA |= 0x04;
  if (simState.currentMode === "MEMIF_MODE_FAST") regA |= 0x02;
  if (ecucConfig.EepUseInterrupts) regA |= 0x01;
  simState.regAByte = regA & 0xFF;

  let regB = 0;
  if (simState.hwSmState === "HW_READY") regB |= 0x80;
  if (simState.hwSmState === "SPI_WREN" || (simState.activeJob && (simState.activeJob.type === "WRITE" || simState.activeJob.type === "ERASE"))) regB |= 0x40;
  if (simState.hwSmState === "WIP_BUSY" || (simState.hwBusyTargetMs > 0 && simState.activeJob)) regB |= 0x20;
  if (simState.lastModifiedRange.kind === "ERASE" && simState.jobResult === "MEMIF_JOB_OK") regB |= 0x10;
  if ((simState.lastModifiedRange.kind === "WRITE" || simState.lastModifiedRange.kind === "SKIP") && simState.jobResult === "MEMIF_JOB_OK") regB |= 0x08;
  if (simState.jobResult === "MEMIF_BLOCK_INCONSISTENT") regB |= 0x04;
  const anyDemFail = Object.values(simState.demFaults).some((v) => v === "FAILED") || ecucConfig.InjectHwWriteOrEraseVerifyFail;
  if (anyDemFail) regB |= 0x02;
  const hasTimeout = simState.detFaults.some((d) => d.errorName === "EEP_E_TIMEOUT") && simState.jobResult === "MEMIF_JOB_FAILED";
  if (hasTimeout) regB |= 0x01;
  simState.regBByte = regB & 0xFF;
}

function toggleRegisterBit(regType, mask) {
  if (regType === "A") {
    if (mask === 0x80) {
      ecucConfig.EepInitialized = !ecucConfig.EepInitialized;
      if (!ecucConfig.EepInitialized) {
        simState.driverStatus = "MEMIF_UNINIT";
        simState.driverSmState = "UNINIT";
        simState.activeJob = null;
        simState.hwSmState = "HW_READY";
      } else {
        simState.driverStatus = "MEMIF_IDLE";
        simState.driverSmState = "IDLE";
      }
      updateDerivedRegisters();
      return;
    }
    if (mask === 0x02) {
      const nextMode = simState.currentMode === "MEMIF_MODE_FAST" ? "MEMIF_MODE_SLOW" : "MEMIF_MODE_FAST";
      if (simState.driverStatus === "MEMIF_IDLE") {
        api_Eep_SetMode(nextMode, "ManualBitToggle");
      } else {
        simState.currentMode = nextMode;
        ecucConfig.CurrentMemIfMode = nextMode;
        updateDerivedRegisters();
      }
      return;
    }
    if (mask === 0x01) {
      ecucConfig.EepUseInterrupts = !ecucConfig.EepUseInterrupts;
      updateDerivedRegisters();
      return;
    }
    simState.regAByte = (simState.regAByte ^ mask) & 0xFF;
  } else {
    if (mask === 0x02) {
      ecucConfig.InjectHwWriteOrEraseVerifyFail = !ecucConfig.InjectHwWriteOrEraseVerifyFail;
      updateDerivedRegisters();
      return;
    }
    if (mask === 0x20) {
      ecucConfig.InjectHwTimeoutStuckBusy = !ecucConfig.InjectHwTimeoutStuckBusy;
      simState.regBByte = (simState.regBByte ^ mask) & 0xFF;
      return;
    }
    simState.regBByte = (simState.regBByte ^ mask) & 0xFF;
  }
}

function toggleEepromCell(addr, modeOverride) {
  const idx = Number(addr);
  if (idx < 0 || idx >= 256) return;
  const mode = modeOverride || simState.cellClickMode || "TOGGLE_BYTE";
  if (mode === "STUCK_BIT") {
    if (simState.stuckBits[idx]) {
      delete simState.stuckBits[idx];
      addTrace({
        layer: "HW",
        caller: "User/HW",
        callee: "EEPROM Cell",
        api: `Clear Stuck Bit @ ${fmtHex16(idx)}`,
        params: "Cell restored healthy",
        ret: "OK",
        result: simState.jobResult,
        tone: "ok",
        note: `Da xoa loi ket bit tai o nho ${fmtHex16(idx)}.`
      });
    } else {
      const stuckVal = (simState.eepromMemory[idx] ^ 0xFF) & 0xFF;
      simState.stuckBits[idx] = { forcedVal: stuckVal, reason: "Cell gate oxide stuck" };
      simState.eepromMemory[idx] = stuckVal;
      addTrace({
        layer: "HW",
        caller: "FaultInject",
        callee: "EEPROM Cell",
        api: `Inject Stuck Bit @ ${fmtHex16(idx)}`,
        params: `Forced = ${fmtHex8(stuckVal)}`,
        ret: "FAULT",
        result: simState.jobResult,
        tone: "err",
        note: `O nho ${fmtHex16(idx)} bi ket cung gia tri ${fmtHex8(stuckVal)} — se gay loi Verify khi Write/Erase!`
      });
    }
  } else {
    const cur = simState.eepromMemory[idx];
    const next = cur === 0xFF ? 0x00 : (cur === 0x00 ? 0xA5 : 0xFF);
    simState.eepromMemory[idx] = next;
    simState.lastModifiedRange = { start: idx, end: idx, kind: "MANUAL" };
  }
}

function getChunkSizeForType(jobType) {
  const fast = simState.currentMode === "MEMIF_MODE_FAST";
  if (jobType === "READ" || jobType === "COMPARE") {
    return Math.max(1, parseHexOrNum(fast ? ecucConfig.EepFastReadBlockSize : ecucConfig.EepNormalReadBlockSize, fast ? 64 : 16));
  }
  const wrChunk = Math.max(1, parseHexOrNum(fast ? ecucConfig.EepFastWriteBlockSize : ecucConfig.EepNormalWriteBlockSize, fast ? 32 : 8));
  if (jobType === "ERASE") {
    const unit = Math.max(1, parseHexOrNum(ecucConfig.EepEraseUnitSize, 8));
    return Math.max(unit, wrChunk);
  }
  return wrChunk;
}

function validateEepCall(apiId, apiName, addr, len, ptrProvided, unitSize) {
  let effAddr = parseHexOrNum(addr, 0);
  let effLen = parseHexOrNum(len, 0);
  let effPtr = ptrProvided;
  const eepSize = getEepSize();

  if (ecucConfig.TestInvalidParamMode === "INVALID_ADDRESS") {
    effAddr = eepSize + 16;
  } else if (ecucConfig.TestInvalidParamMode === "INVALID_LENGTH") {
    effLen = 0;
  } else if (ecucConfig.TestInvalidParamMode === "INVALID_DATA") {
    effPtr = false;
  }

  if (!ecucConfig.EepInitialized || simState.driverStatus === "MEMIF_UNINIT") {
    if (ecucConfig.EepDevErrorDetect) {
      reportDetError("DET", apiId, apiName, 0x00, "EEP_E_UNINIT", "Driver dang o trang thai MEMIF_UNINIT, chua goi Eep_Init().");
    }
    return { ok: false, effAddr, effLen };
  }

  // Runtime Error EEP_E_BUSY (0x04) is always checked in AUTOSAR R20-11+
  if (simState.driverStatus === "MEMIF_BUSY") {
    reportDetError("RUNTIME", apiId, apiName, 0x04, "EEP_E_BUSY", "Eep dang xu ly Job khac (MEMIF_BUSY). Khong the chen ngang!");
    return { ok: false, effAddr, effLen };
  }

  if (effPtr === false) {
    if (ecucConfig.EepDevErrorDetect) {
      reportDetError("DET", apiId, apiName, 0x02, "EEP_E_INVALID_DATA", "Con tro DataBufferPtr la NULL_PTR.");
    }
    return { ok: false, effAddr, effLen };
  }

  const unit = Math.max(1, parseHexOrNum(unitSize, 1));
  if (effAddr < 0 || effAddr >= eepSize || (effAddr % unit !== 0)) {
    if (ecucConfig.EepDevErrorDetect) {
      reportDetError("DET", apiId, apiName, 0x01, "EEP_E_INVALID_ADDRESS", `Dia chi ${fmtHex16(effAddr)} khong hop le (EepSize=${eepSize}, Unit=${unit}B).`);
    }
    return { ok: false, effAddr, effLen };
  }

  if (effLen <= 0 || (effAddr + effLen) > eepSize || (effLen % unit !== 0)) {
    if (ecucConfig.EepDevErrorDetect) {
      reportDetError("DET", apiId, apiName, 0x03, "EEP_E_INVALID_LENGTH", `Do dai Length=${effLen} khong hop le (Addr+Len=${effAddr + effLen} > EepSize=${eepSize} hoac sai boi so ${unit}B).`);
    }
    return { ok: false, effAddr, effLen };
  }

  return { ok: true, effAddr, effLen };
}

function setArrowsForCaller(caller, isHwWrite) {
  const arrows = [];
  if (caller === "ECUM") {
    arrows.push("arr_ecum_eep");
  } else if (caller === "STACK" || caller === "SWC") {
    arrows.push("arr_swc_rte", "arr_rte_nvm", "arr_nvm_memif", "arr_memif_ea", "arr_ea_eep");
  } else if (caller === "NVM") {
    arrows.push("arr_nvm_memif", "arr_memif_ea", "arr_ea_eep");
  } else {
    arrows.push("arr_ea_eep");
  }
  arrows.push("arr_eep_hw");
  if (!isHwWrite) arrows.push("arr_hw_eep");
  simState.activeArrows = arrows;
}

function api_Eep_Init(configPtrValid) {
  simState.lastApiCodeKey = "Eep_Init";
  simState.lastCallbackCalled = null;
  let validPtr = configPtrValid !== false;
  if (ecucConfig.TestInvalidParamMode === "INIT_NULL_PTR") validPtr = false;

  if (simState.driverStatus === "MEMIF_BUSY") {
    reportDetError("RUNTIME", EEP_API_IDS.Eep_Init, "Eep_Init", 0x04, "EEP_E_BUSY", "Khong duoc goi Eep_Init khi Driver dang MEMIF_BUSY.");
    simState.activeArrows = ["arr_ecum_eep", "arr_eep_det"];
    return "E_NOT_OK";
  }

  if (!validPtr) {
    ecucConfig.EepInitialized = false;
    simState.driverStatus = "MEMIF_UNINIT";
    simState.driverSmState = "UNINIT";
    if (ecucConfig.EepDevErrorDetect) {
      reportDetError("DET", EEP_API_IDS.Eep_Init, "Eep_Init", 0x09, "EEP_E_INIT_FAILED", "ConfigPtr la NULL_PTR trong Eep_Init(NULL_PTR)!");
    }
    simState.activeArrows = ["arr_ecum_eep", "arr_eep_det"];
    updateDerivedRegisters();
    return "E_NOT_OK";
  }

  ecucConfig.EepInitialized = true;
  simState.driverStatus = "MEMIF_IDLE";
  simState.jobResult = "MEMIF_JOB_OK";
  simState.currentMode = ecucConfig.EepDefaultMode || "MEMIF_MODE_SLOW";
  ecucConfig.CurrentMemIfMode = simState.currentMode;
  simState.activeJob = null;
  simState.driverSmState = "IDLE";
  simState.hwSmState = "HW_READY";
  simState.activeChunkRange = { start: -1, end: -1, kind: "" };
  simState.mismatchAddrs = [];
  simState.activeArrows = ["arr_ecum_eep", "arr_eep_hw"];
  addTrace({
    layer: "SYS",
    caller: "EcuM",
    callee: "Eep",
    api: "Eep_Init(&Eep_Config)",
    params: `Mode=${simState.currentMode}, Base=${fmtHex16(getBaseAddressNum())}, Size=${getEepSize()}B`,
    ret: "void",
    result: "MEMIF_JOB_OK",
    tone: "ok",
    note: "Khoi tao MCAL Eep thanh cong -> chuyen tu MEMIF_UNINIT sang MEMIF_IDLE [SWS_Eep_00010]."
  });
  updateDerivedRegisters();
  return "E_OK";
}

function api_Eep_SetMode(mode, caller) {
  simState.lastApiCodeKey = "Eep_SetMode";
  simState.lastCallbackCalled = null;
  if (!ecucConfig.EepInitialized || simState.driverStatus === "MEMIF_UNINIT") {
    if (ecucConfig.EepDevErrorDetect) {
      reportDetError("DET", EEP_API_IDS.Eep_SetMode, "Eep_SetMode", 0x00, "EEP_E_UNINIT", "Eep_SetMode bi chan vi driver chua Init.");
    }
    simState.activeArrows = ["arr_ea_eep", "arr_eep_det"];
    return "E_NOT_OK";
  }
  if (simState.driverStatus === "MEMIF_BUSY") {
    reportDetError("RUNTIME", EEP_API_IDS.Eep_SetMode, "Eep_SetMode", 0x04, "EEP_E_BUSY", "Khong the doi Mode khi dang MEMIF_BUSY!");
    simState.activeArrows = ["arr_ea_eep", "arr_eep_det"];
    return "E_NOT_OK";
  }
  const targetMode = mode === "MEMIF_MODE_FAST" ? "MEMIF_MODE_FAST" : "MEMIF_MODE_SLOW";
  simState.currentMode = targetMode;
  ecucConfig.CurrentMemIfMode = targetMode;
  simState.activeArrows = [caller === "STACK" ? "arr_nvm_memif" : "arr_ea_eep", "arr_memif_ea", "arr_ea_eep"];
  addTrace({
    layer: "MCAL",
    caller: caller || "MemIf/Ea",
    callee: "Eep",
    api: `Eep_SetMode(${targetMode})`,
    params: targetMode === "MEMIF_MODE_FAST"
      ? `Chunk Rd=${ecucConfig.EepFastReadBlockSize}B / Wr=${ecucConfig.EepFastWriteBlockSize}B`
      : `Chunk Rd=${ecucConfig.EepNormalReadBlockSize}B / Wr=${ecucConfig.EepNormalWriteBlockSize}B`,
    ret: "void",
    result: simState.jobResult,
    tone: "cyan",
    note: `Chuyen che do Chunking sang ${targetMode} [SWS_Eep_00011].`
  });
  updateDerivedRegisters();
  return "E_OK";
}

function api_Eep_GetVersionInfo(ptrValid) {
  simState.lastApiCodeKey = "Eep_GetVersionInfo";
  if (!ecucConfig.EepVersionInfoApi) {
    addTrace({
      layer: "MCAL",
      caller: "Diagnostic/Bsw",
      callee: "Eep",
      api: "Eep_GetVersionInfo(&verInfo)",
      params: "EepVersionInfoApi = FALSE",
      ret: "DISABLED",
      result: simState.jobResult,
      tone: "warn",
      note: "API Eep_GetVersionInfo() da bi tat compile-time trong ECUC."
    });
    return "E_NOT_OK";
  }
  const useNull = ptrValid === false || ecucConfig.TestInvalidParamMode === "VERSION_NULL_PTR";
  if (useNull) {
    if (ecucConfig.EepDevErrorDetect) {
      reportDetError("DET", EEP_API_IDS.Eep_GetVersionInfo, "Eep_GetVersionInfo", 0x0A, "EEP_E_PARAM_POINTER", "versioninfo pointer == NULL_PTR.");
    }
    simState.activeArrows = ["arr_eep_det"];
    return "E_NOT_OK";
  }
  simState.activeArrows = ["arr_ea_eep"];
  addTrace({
    layer: "MCAL",
    caller: "Bsw/Ea",
    callee: "Eep",
    api: "Eep_GetVersionInfo(&verInfo)",
    params: `Vendor=${simState.versionInfoResult.vendorID}, Module=${simState.versionInfoResult.moduleID}, SW=${simState.versionInfoResult.sw_major_version}.${simState.versionInfoResult.sw_minor_version}`,
    ret: "void",
    result: simState.jobResult,
    tone: "ok",
    note: "Doc thong tin phien ban MCAL Eep (ModuleId = 90)."
  });
  return "E_OK";
}

function enqueueEepJob(type, addr, length, dataBytes, caller, opts) {
  const chunkSize = getChunkSizeForType(type);
  const totalChunks = Math.max(1, Math.ceil(length / chunkSize));
  const targetMs = type === "WRITE"
    ? Math.max(5, parseHexOrNum(ecucConfig.EepWriteTimeMs, 5))
    : (type === "ERASE" ? Math.max(5, parseHexOrNum(ecucConfig.EepEraseTimeMs, 5)) : 0);

  if (Array.isArray(dataBytes)) {
    for (let i = 0; i < length; i++) {
      simState.expectedBuffer[i] = dataBytes[i] !== undefined ? (dataBytes[i] & 0xFF) : 0xA5;
    }
  }
  if (type === "READ") {
    for (let i = 0; i < length; i++) simState.ramBuffer[i] = 0x00;
  }

  simState.driverStatus = "MEMIF_BUSY";
  simState.jobResult = "MEMIF_JOB_PENDING";
  simState.lastCallbackCalled = null;
  simState.mismatchAddrs = [];
  simState.hwBusyTimerMs = 0;
  simState.hwBusyTargetMs = targetMs;
  simState.driverSmState = "BUSY_" + type;
  const isSpi = ecucConfig.EepHardwareInterfaceType === "EXTERNAL_SPI_EEPROM";
  if (type === "WRITE" || type === "ERASE") {
    simState.hwSmState = isSpi ? "SPI_WREN" : "WIP_BUSY";
  } else {
    simState.hwSmState = "HW_READY";
  }

  if (opts && opts.eaSubPhase) {
    simState.eaSubJobState = opts.eaSubPhase;
  }

  simState.activeChunkRange = {
    start: addr,
    end: addr + Math.min(chunkSize, length) - 1,
    kind: type
  };

  simState.activeJob = {
    id: simState.nextJobId++,
    type: type,
    caller: caller || "Ea",
    startAddr: addr,
    currentAddr: addr,
    remainingLen: length,
    totalLen: length,
    chunkSize: chunkSize,
    completedBytes: 0,
    skippedBytes: 0,
    chunkIndex: 0,
    totalChunks: totalChunks,
    bufOffset: 0,
    timeoutTicks: 0,
    eaSubPhase: (opts && opts.eaSubPhase) || null,
    eaBlockNum: (opts && opts.eaBlockNum) || null,
    spiSeqTrace: []
  };

  updateDerivedRegisters();
}

function api_Eep_Read(addr, length, caller, opts) {
  simState.lastApiCodeKey = "Eep_Read";
  const ptrOk = !(opts && opts.ptrValid === false);
  const v = validateEepCall(EEP_API_IDS.Eep_Read, "Eep_Read", addr, length, ptrOk, ecucConfig.EepReadUnitSize);
  if (!v.ok) {
    simState.activeArrows = ["arr_ea_eep", "arr_eep_det"];
    return "E_NOT_OK";
  }
  enqueueEepJob("READ", v.effAddr, v.effLen, null, caller, opts);
  setArrowsForCaller(caller, false);
  addTrace({
    layer: caller === "STACK" ? "STACK->MCAL" : "MCAL",
    caller: caller === "STACK" ? "NvM/MemIf/Ea" : (caller || "Ea"),
    callee: "Eep",
    api: `Eep_Read(${fmtHex16(v.effAddr)}, DstPtr, ${v.effLen})`,
    params: `Chunk=${simState.activeJob.chunkSize}B (${simState.activeJob.totalChunks} chunks), Mode=${simState.currentMode}`,
    ret: "E_OK",
    result: "MEMIF_JOB_PENDING",
    tone: "cyan",
    note: "Da xac thuc tham so & xep hang lenh doc bat dong bo. Cho Eep_MainFunction() thuc thi tung Chunk [SWS_Eep_00018]."
  });
  return "E_OK";
}

function api_Eep_Write(addr, dataBytes, caller, opts) {
  simState.lastApiCodeKey = "Eep_Write";
  const ptrOk = dataBytes !== null && !(opts && opts.ptrValid === false);
  const len = Array.isArray(dataBytes) ? dataBytes.length : ((opts && opts.length) || 8);
  const v = validateEepCall(EEP_API_IDS.Eep_Write, "Eep_Write", addr, len, ptrOk, ecucConfig.EepWriteUnitSize);
  if (!v.ok) {
    simState.activeArrows = ["arr_ea_eep", "arr_eep_det"];
    return "E_NOT_OK";
  }
  const payload = Array.isArray(dataBytes) ? dataBytes : parseHexBytesString("A5 5A 11 22 33 44 55 66", v.effLen, 0xA5);
  enqueueEepJob("WRITE", v.effAddr, v.effLen, payload, caller, opts);
  setArrowsForCaller(caller, true);
  addTrace({
    layer: caller === "STACK" ? "STACK->MCAL" : "MCAL",
    caller: caller === "STACK" ? "NvM/MemIf/Ea" : (caller || "Ea"),
    callee: "Eep",
    api: `Eep_Write(${fmtHex16(v.effAddr)}, SrcPtr, ${v.effLen})`,
    params: `Chunk=${simState.activeJob.chunkSize}B (${simState.activeJob.totalChunks} chunks), CycleRed=${ecucConfig.EepWriteCycleReduction ? "ON" : "OFF"}`,
    ret: "E_OK",
    result: "MEMIF_JOB_PENDING",
    tone: "warn",
    note: `Bat dau Job ghi ${v.effLen}B tu ${fmtHex16(v.effAddr)}. HW=${ecucConfig.EepHardwareInterfaceType}.`
  });
  return "E_OK";
}

function api_Eep_Erase(addr, length, caller, opts) {
  simState.lastApiCodeKey = "Eep_Erase";
  const v = validateEepCall(EEP_API_IDS.Eep_Erase, "Eep_Erase", addr, length, true, ecucConfig.EepEraseUnitSize);
  if (!v.ok) {
    simState.activeArrows = ["arr_ea_eep", "arr_eep_det"];
    return "E_NOT_OK";
  }
  enqueueEepJob("ERASE", v.effAddr, v.effLen, null, caller, opts);
  setArrowsForCaller(caller, true);
  addTrace({
    layer: "MCAL",
    caller: caller || "Ea",
    callee: "Eep",
    api: `Eep_Erase(${fmtHex16(v.effAddr)}, ${v.effLen})`,
    params: `EraseValue=${fmtHex8(getEraseByte())}, Unit=${ecucConfig.EepEraseUnitSize}B`,
    ret: "E_OK",
    result: "MEMIF_JOB_PENDING",
    tone: "warn",
    note: `Xep hang lenh xoa trang ${v.effLen}B ve gia tri ${fmtHex8(getEraseByte())} [SWS_Eep_00025].`
  });
  return "E_OK";
}

function api_Eep_Compare(addr, dataBytes, caller, opts) {
  simState.lastApiCodeKey = "Eep_Compare";
  const ptrOk = dataBytes !== null && !(opts && opts.ptrValid === false);
  const len = Array.isArray(dataBytes) ? dataBytes.length : ((opts && opts.length) || 8);
  const v = validateEepCall(EEP_API_IDS.Eep_Compare, "Eep_Compare", addr, len, ptrOk, ecucConfig.EepReadUnitSize);
  if (!v.ok) {
    simState.activeArrows = ["arr_ea_eep", "arr_eep_det"];
    return "E_NOT_OK";
  }
  const payload = Array.isArray(dataBytes) ? dataBytes : parseHexBytesString("A5 5A 11 22 33 44 55 66", v.effLen, 0xA5);
  enqueueEepJob("COMPARE", v.effAddr, v.effLen, payload, caller, opts);
  setArrowsForCaller(caller, false);
  addTrace({
    layer: "MCAL",
    caller: caller || "Ea",
    callee: "Eep",
    api: `Eep_Compare(${fmtHex16(v.effAddr)}, DataPtr, ${v.effLen})`,
    params: `Chunk=${simState.activeJob.chunkSize}B, Len=${v.effLen}`,
    ret: "E_OK",
    result: "MEMIF_JOB_PENDING",
    tone: "cyan",
    note: "Doi chieu tung byte giua EEPROM va RAM ma khong ghi de EEPROM [SWS_Eep_00027]."
  });
  return "E_OK";
}

function api_Eep_Cancel(caller) {
  simState.lastApiCodeKey = "Eep_Cancel";
  if (!ecucConfig.EepInitialized || simState.driverStatus === "MEMIF_UNINIT") {
    if (ecucConfig.EepDevErrorDetect) {
      reportDetError("DET", EEP_API_IDS.Eep_Cancel, "Eep_Cancel", 0x00, "EEP_E_UNINIT", "Eep_Cancel bi chan khi chua Init.");
    }
    simState.activeArrows = ["arr_ea_eep", "arr_eep_det"];
    return "E_NOT_OK";
  }

  const wasBusy = simState.driverStatus === "MEMIF_BUSY" && simState.activeJob !== null;
  const abortedInfo = wasBusy
    ? `Huy Job ${simState.activeJob.type} tai ${fmtHex16(simState.activeJob.currentAddr)} (con ${simState.activeJob.remainingLen}B chua chay).`
    : "Khong co Job nao dang chay.";

  simState.activeJob = null;
  simState.driverStatus = "MEMIF_IDLE";
  simState.jobResult = "MEMIF_JOB_CANCELED";
  simState.driverSmState = "IDLE";
  simState.hwSmState = "HW_READY";
  simState.hwBusyTimerMs = 0;
  simState.activeChunkRange = { start: -1, end: -1, kind: "" };
  simState.activeArrows = ["arr_ea_eep", "arr_eep_ea_cbk"];

  addTrace({
    layer: "MCAL",
    caller: caller || "Ea",
    callee: "Eep",
    api: "Eep_Cancel()",
    params: wasBusy ? "Abort Active Job" : "Idle State",
    ret: "void",
    result: "MEMIF_JOB_CANCELED",
    tone: "pur",
    note: abortedInfo + " [SWS_Eep_00031]."
  });

  if (wasBusy && ecucConfig.EepJobErrorNotificationEnabled) {
    simState.lastCallbackCalled = ecucConfig.EepJobErrorNotification || "Ea_JobErrorNotification";
    addTrace({
      layer: "CBK",
      caller: "Eep",
      callee: "Ea",
      api: `${simState.lastCallbackCalled}()`,
      params: "Result = MEMIF_JOB_CANCELED",
      ret: "void",
      result: "MEMIF_JOB_CANCELED",
      tone: "pur",
      note: "Thong bao huy lenh khan cap cho lop Ea de giai phong NvM."
    });
  }

  updateDerivedRegisters();
  return "E_OK";
}

function recordSpiExchange(job, opCmd, addr, len, note) {
  const frame = {
    seq: ecucConfig.EepSpiSequenceId || 0,
    cmd: opCmd,
    addr: fmtHex16(addr),
    len: len,
    note: note
  };
  job.spiSeqTrace.push(frame);
  simState.lastSpiFrames.push(frame);
  if (simState.lastSpiFrames.length > 16) simState.lastSpiFrames.shift();
}

function failActiveJob(job, newResult, demEvent, reason) {
  simState.driverStatus = "MEMIF_IDLE";
  simState.jobResult = newResult;
  simState.driverSmState = "JOB_ERR";
  simState.hwSmState = (demEvent || newResult === "MEMIF_JOB_FAILED") ? "HW_FAULT" : "HW_READY";
  simState.hwBusyTimerMs = 0;
  simState.activeChunkRange = { start: -1, end: -1, kind: "" };
  simState.activeJob = null;

  if (demEvent) {
    reportDemEvent(demEvent, "FAILED", reason);
  }
  simState.activeArrows = ["arr_hw_eep", "arr_eep_ea_cbk"];
  if (demEvent) simState.activeArrows.push("arr_eep_det");
  if (job && job.caller === "STACK") simState.activeArrows.push("arr_ea_nvm_cbk");

  if (ecucConfig.EepJobErrorNotificationEnabled) {
    simState.lastCallbackCalled = ecucConfig.EepJobErrorNotification || "Ea_JobErrorNotification";
    addTrace({
      layer: "CBK",
      caller: "Eep",
      callee: "Ea",
      api: `${simState.lastCallbackCalled}()`,
      params: `Job=${job ? job.type : ""}, Result=${newResult}`,
      ret: "void",
      result: newResult,
      tone: "err",
      note: reason
    });
  }
  updateDerivedRegisters();
}

function finishActiveJobSuccess(job) {
  simState.driverStatus = "MEMIF_IDLE";
  simState.jobResult = "MEMIF_JOB_OK";
  simState.driverSmState = "IDLE";
  simState.hwSmState = "HW_READY";
  simState.hwBusyTimerMs = 0;
  simState.activeChunkRange = { start: -1, end: -1, kind: "" };
  simState.lastModifiedRange = {
    start: job.startAddr,
    end: job.startAddr + job.totalLen - 1,
    kind: job.skippedBytes === job.totalLen ? "SKIP" : job.type
  };
  if (job.eaSubPhase === "EA_SUB_FTR") {
    simState.eaSubJobState = "EA_DONE";
  }

  // Heal previously failed Dem event upon successful job
  if (job.type === "WRITE") reportDemEvent("EEP_E_WRITE_FAILED", "PASSED", "Ghi & Verify thanh cong.");
  if (job.type === "READ") reportDemEvent("EEP_E_READ_FAILED", "PASSED", "Doc thanh cong.");
  if (job.type === "ERASE") reportDemEvent("EEP_E_ERASE_FAILED", "PASSED", "Xoa & Verify thanh cong.");
  if (job.type === "COMPARE") reportDemEvent("EEP_E_COMPARE_FAILED", "PASSED", "Compare khop 100%.");

  simState.activeJob = null;
  simState.activeArrows = ["arr_schm_eep", "arr_hw_eep", "arr_eep_ea_cbk"];
  if (job.caller === "STACK") simState.activeArrows.push("arr_ea_nvm_cbk");

  if (ecucConfig.EepJobEndNotificationEnabled) {
    simState.lastCallbackCalled = ecucConfig.EepJobEndNotification || "Ea_JobEndNotification";
    addTrace({
      layer: "CBK",
      caller: "Eep",
      callee: "Ea",
      api: `${simState.lastCallbackCalled}()`,
      params: `Job=${job.type}, Done=${job.totalLen}B (Skipped=${job.skippedBytes}B)`,
      ret: "void",
      result: "MEMIF_JOB_OK",
      tone: "ok",
      note: `Hoan tat toan bo Job ${job.type} -> goi callback thong bao Ea thanh cong [SWS_Eep_00141].`
    });
  }
  updateDerivedRegisters();
}

function processSingleChunk(job, cycleMs) {
  const chunkStart = job.currentAddr;
  const lenNow = Math.min(job.chunkSize, job.remainingLen);
  const basePhys = getBaseAddressNum();
  const isSpi = ecucConfig.EepHardwareInterfaceType === "EXTERNAL_SPI_EEPROM";
  const eraseB = getEraseByte();
  const hwFailInjected = Boolean(ecucConfig.InjectHwWriteOrEraseVerifyFail);

  simState.activeChunkRange = { start: chunkStart, end: chunkStart + lenNow - 1, kind: job.type };

  // Timeout Simulation (WIP stuck busy)
  if (ecucConfig.InjectHwTimeoutStuckBusy && (job.type === "WRITE" || job.type === "ERASE")) {
    job.timeoutTicks += 1;
    simState.hwSmState = "WIP_BUSY";
    simState.activeArrows = ["arr_schm_eep", "arr_eep_hw"];
    if (isSpi) {
      recordSpiExchange(job, "RDSR (0x05)", basePhys + chunkStart, 1, `Poll RDSR WIP=1 (Tick ${job.timeoutTicks}/3)`);
    }
    if (job.timeoutTicks >= 3) {
      reportDetError("RUNTIME", EEP_API_IDS.Eep_MainFunction, "Eep_MainFunction", 0x05, "EEP_E_TIMEOUT", "Thanh ghi WIP_HW_BUSY treo o muc 1 qua 3 chu ky Eep_MainFunction!");
      failActiveJob(job, "MEMIF_JOB_FAILED", null, "Timeout HW WIP -> Det_ReportRuntimeError(EEP_E_TIMEOUT) & MEMIF_JOB_FAILED.");
    } else {
      addTrace({
        layer: "HW",
        caller: "SchM->Eep",
        callee: isSpi ? "Spi/EEPROM" : "Internal EEPROM",
        api: `Eep_MainFunction() [Poll WIP=${job.timeoutTicks}/3]`,
        params: `Addr=${fmtHex16(chunkStart)}, WIP_BSY=1 (Stuck!)`,
        ret: "PENDING",
        result: "MEMIF_JOB_PENDING",
        tone: "warn",
        note: `Phan cung dang giu co WIP=1. Cho tick tiep theo truoc khi kich hoat Timeout (3 ticks).`
      });
      updateDerivedRegisters();
    }
    return false;
  }

  if (job.type === "READ") {
    if (isSpi) {
      recordSpiExchange(job, "READ (0x03)", basePhys + chunkStart, lenNow, `Spi_AsyncTransmit Seq=${ecucConfig.EepSpiSequenceId}`);
    }
    if (hwFailInjected) {
      simState.mismatchAddrs.push(chunkStart);
      failActiveJob(job, "MEMIF_JOB_FAILED", "EEP_E_READ_FAILED", `Loi doc EEPROM / mat khung SPI tai ${fmtHex16(chunkStart)} -> Dem EEP_E_READ_FAILED!`);
      return false;
    }
    for (let i = 0; i < lenNow; i++) {
      simState.ramBuffer[job.bufOffset + i] = simState.eepromMemory[chunkStart + i];
    }
    simState.hwSmState = "HW_READY";
    simState.lastModifiedRange = { start: chunkStart, end: chunkStart + lenNow - 1, kind: "READ" };
    addTrace({
      layer: "MCAL",
      caller: ecucConfig.EepUseInterrupts ? "ISR/SchM" : "SchM",
      callee: isSpi ? "Eep->Spi" : "Eep->HW",
      api: `${ecucConfig.EepUseInterrupts ? "Eep_JobEndIsr" : "Eep_MainFunction"}() [Chunk ${job.chunkIndex + 1}/${job.totalChunks}]`,
      params: `READ ${fmtHex16(chunkStart)}..${fmtHex16(chunkStart + lenNow - 1)} (${lenNow}B)`,
      ret: "CHUNK_OK",
      result: "MEMIF_JOB_PENDING",
      tone: "cyan",
      note: isSpi ? `Spi_SetupEB + Spi_AsyncTransmit(CMD 0x03 READ) nap ${lenNow}B vao RAM.` : `Doc thanh ghi EEPROM noi ${lenNow}B vao RAM.`
    });
  } else if (job.type === "WRITE") {
    // Write Cycle Reduction Check (SWS_Eep_00024)
    let allMatch = ecucConfig.EepWriteCycleReduction;
    if (allMatch) {
      for (let i = 0; i < lenNow; i++) {
        if (simState.eepromMemory[chunkStart + i] !== (simState.expectedBuffer[job.bufOffset + i] & 0xFF)) {
          allMatch = false;
          break;
        }
      }
    }

    if (allMatch) {
      job.skippedBytes += lenNow;
      simState.hwSmState = "HW_READY";
      simState.lastModifiedRange = { start: chunkStart, end: chunkStart + lenNow - 1, kind: "SKIP" };
      addTrace({
        layer: "MCAL",
        caller: "SchM",
        callee: "Eep",
        api: `Eep_MainFunction() [CycleReduction Skip]`,
        params: `${fmtHex16(chunkStart)}..${fmtHex16(chunkStart + lenNow - 1)} (${lenNow}B giong het)`,
        ret: "SKIPPED",
        result: "MEMIF_JOB_PENDING",
        tone: "ok",
        note: "EepWriteCycleReduction=TRUE: Du lieu EEPROM da trung RAM 100%, bo qua thao tac Erase/Write vat ly de tang tuoi tho EEPROM!"
      });
    } else {
      simState.hwBusyTimerMs += cycleMs;
      if (simState.hwBusyTimerMs < simState.hwBusyTargetMs) {
        simState.hwSmState = "WIP_BUSY";
        simState.activeArrows = ["arr_schm_eep", "arr_eep_hw"];
        if (isSpi) {
          recordSpiExchange(job, "RDSR (0x05)", basePhys + chunkStart, 1, `WIP=1 (${simState.hwBusyTimerMs}/${simState.hwBusyTargetMs}ms)`);
        }
        addTrace({
          layer: "HW",
          caller: "SchM",
          callee: "Eep->HW",
          api: "Eep_MainFunction() [HW Programming WIP=1]",
          params: `Chunk ${fmtHex16(chunkStart)} (${simState.hwBusyTimerMs}/${simState.hwBusyTargetMs}ms)`,
          ret: "WIP_BUSY",
          result: "MEMIF_JOB_PENDING",
          tone: "warn",
          note: "Chip EEPROM dang nap trang (WIP=1), cho chu ky tiep theo."
        });
        updateDerivedRegisters();
        return false;
      }

      simState.hwBusyTimerMs = 0;
      if (isSpi) {
        recordSpiExchange(job, "WREN+WRITE (0x06/0x02)", basePhys + chunkStart, lenNow, `Program ${lenNow}B @ ${fmtHex16(basePhys + chunkStart)}`);
      }
      for (let i = 0; i < lenNow; i++) {
        const targetAddr = chunkStart + i;
        const targetVal = simState.expectedBuffer[job.bufOffset + i] & 0xFF;
        if (simState.stuckBits[targetAddr]) {
          simState.eepromMemory[targetAddr] = simState.stuckBits[targetAddr].forcedVal;
        } else {
          simState.eepromMemory[targetAddr] = targetVal;
        }
        simState.writeCounts[targetAddr] += 1;
      }

      // Write Verification (SWS_Eep_00054)
      if (ecucConfig.EnableWriteVerification || hwFailInjected) {
        simState.hwSmState = "VERIFYING";
        let mismatchAt = -1;
        for (let i = 0; i < lenNow; i++) {
          const targetAddr = chunkStart + i;
          const expected = simState.expectedBuffer[job.bufOffset + i] & 0xFF;
          if (simState.eepromMemory[targetAddr] !== expected) {
            mismatchAt = targetAddr;
            simState.mismatchAddrs.push(targetAddr);
          }
        }
        if (hwFailInjected && mismatchAt === -1) {
          mismatchAt = chunkStart;
          simState.mismatchAddrs.push(chunkStart);
        }
        if (mismatchAt !== -1) {
          failActiveJob(
            job,
            "MEMIF_JOB_FAILED",
            "EEP_E_WRITE_FAILED",
            `Write Verify that bai tai ${fmtHex16(mismatchAt)} (Stuck Bit / HW Corrupt) -> Dem EEP_E_WRITE_FAILED!`
          );
          return false;
        }
      }

      simState.hwSmState = "HW_READY";
      simState.lastModifiedRange = { start: chunkStart, end: chunkStart + lenNow - 1, kind: "WRITE" };
      addTrace({
        layer: "MCAL",
        caller: ecucConfig.EepUseInterrupts ? "ISR" : "SchM",
        callee: isSpi ? "Eep->Spi" : "Eep->HW",
        api: `${ecucConfig.EepUseInterrupts ? "Eep_JobEndIsr" : "Eep_MainFunction"}() [Chunk ${job.chunkIndex + 1}/${job.totalChunks}]`,
        params: `WRITE ${fmtHex16(chunkStart)}..${fmtHex16(chunkStart + lenNow - 1)} (${lenNow}B)${ecucConfig.EnableWriteVerification ? " + Verify OK" : ""}`,
        ret: "CHUNK_OK",
        result: "MEMIF_JOB_PENDING",
        tone: "ok",
        note: (ecucConfig.AutoEraseBeforeWrite ? "Auto-Erase -> " : "") + (isSpi ? "SPI WREN(0x06) + WRITE(0x02) + Verify khop 100%." : "Ghi thanh ghi EEPROM noi + Verify khop 100%.")
      });
    }
  } else if (job.type === "ERASE") {
    simState.hwBusyTimerMs += cycleMs;
    if (simState.hwBusyTimerMs < simState.hwBusyTargetMs) {
      simState.hwSmState = "WIP_BUSY";
      simState.activeArrows = ["arr_schm_eep", "arr_eep_hw"];
      addTrace({
        layer: "HW",
        caller: "SchM",
        callee: "Eep->HW",
        api: "Eep_MainFunction() [HW Erasing WIP=1]",
        params: `Chunk ${fmtHex16(chunkStart)} (${simState.hwBusyTimerMs}/${simState.hwBusyTargetMs}ms)`,
        ret: "WIP_BUSY",
        result: "MEMIF_JOB_PENDING",
        tone: "warn",
        note: "Dang xoa trang EEPROM (WIP=1)..."
      });
      updateDerivedRegisters();
      return false;
    }
    simState.hwBusyTimerMs = 0;
    if (isSpi) {
      recordSpiExchange(job, "WREN+ERASE_FF (0x06/0x02)", basePhys + chunkStart, lenNow, `Fill ${fmtHex8(eraseB)} x ${lenNow}B`);
    }
    for (let i = 0; i < lenNow; i++) {
      const targetAddr = chunkStart + i;
      if (simState.stuckBits[targetAddr]) {
        simState.eepromMemory[targetAddr] = simState.stuckBits[targetAddr].forcedVal;
      } else {
        simState.eepromMemory[targetAddr] = eraseB;
      }
      simState.writeCounts[targetAddr] += 1;
    }

    if (ecucConfig.EnableEraseVerification || hwFailInjected) {
      simState.hwSmState = "VERIFYING";
      let mismatchAt = -1;
      for (let i = 0; i < lenNow; i++) {
        const targetAddr = chunkStart + i;
        if (simState.eepromMemory[targetAddr] !== eraseB) {
          mismatchAt = targetAddr;
          simState.mismatchAddrs.push(targetAddr);
        }
      }
      if (hwFailInjected && mismatchAt === -1) {
        mismatchAt = chunkStart;
        simState.mismatchAddrs.push(chunkStart);
      }
      if (mismatchAt !== -1) {
        failActiveJob(
          job,
          "MEMIF_JOB_FAILED",
          "EEP_E_ERASE_FAILED",
          `Erase Blank-Check that bai tai ${fmtHex16(mismatchAt)} (khac ${fmtHex8(eraseB)}) -> Dem EEP_E_ERASE_FAILED!`
        );
        return false;
      }
    }

    simState.hwSmState = "HW_READY";
    simState.lastModifiedRange = { start: chunkStart, end: chunkStart + lenNow - 1, kind: "ERASE" };
    addTrace({
      layer: "MCAL",
      caller: "SchM",
      callee: isSpi ? "Eep->Spi" : "Eep->HW",
      api: `Eep_MainFunction() [Erase ${job.chunkIndex + 1}/${job.totalChunks}]`,
      params: `ERASE ${fmtHex16(chunkStart)}..${fmtHex16(chunkStart + lenNow - 1)} -> ${fmtHex8(eraseB)}`,
      ret: "CHUNK_OK",
      result: "MEMIF_JOB_PENDING",
      tone: "ok",
      note: `Da xoa ${lenNow}B ve ${fmtHex8(eraseB)}${ecucConfig.EnableEraseVerification ? " & Blank Check OK." : "."}`
    });
  } else if (job.type === "COMPARE") {
    if (isSpi) {
      recordSpiExchange(job, "READ+CMP (0x03)", basePhys + chunkStart, lenNow, `Read & Compare ${lenNow}B`);
    }
    if (hwFailInjected) {
      simState.mismatchAddrs.push(chunkStart);
      failActiveJob(job, "MEMIF_JOB_FAILED", "EEP_E_COMPARE_FAILED", `Loi doc phần cung khi Compare tai ${fmtHex16(chunkStart)} -> Dem EEP_E_COMPARE_FAILED!`);
      return false;
    }
    let firstMismatch = -1;
    for (let i = 0; i < lenNow; i++) {
      const targetAddr = chunkStart + i;
      const eepVal = simState.eepromMemory[targetAddr];
      const ramVal = simState.expectedBuffer[job.bufOffset + i] & 0xFF;
      if (eepVal !== ramVal) {
        if (firstMismatch === -1) firstMismatch = targetAddr;
        simState.mismatchAddrs.push(targetAddr);
      }
    }
    if (firstMismatch !== -1) {
      failActiveJob(
        job,
        "MEMIF_BLOCK_INCONSISTENT",
        null,
        `Eep_Compare phat hien lech du lieu tai ${fmtHex16(firstMismatch)} (EEPROM=${fmtHex8(simState.eepromMemory[firstMismatch])} != RAM) -> MEMIF_BLOCK_INCONSISTENT [SWS_Eep_00056].`
      );
      return false;
    }
    simState.hwSmState = "HW_READY";
    simState.lastModifiedRange = { start: chunkStart, end: chunkStart + lenNow - 1, kind: "COMPARE" };
    addTrace({
      layer: "MCAL",
      caller: "SchM",
      callee: "Eep",
      api: `Eep_MainFunction() [Compare ${job.chunkIndex + 1}/${job.totalChunks}]`,
      params: `COMPARE ${fmtHex16(chunkStart)}..${fmtHex16(chunkStart + lenNow - 1)} (${lenNow}B Match)`,
      ret: "CHUNK_OK",
      result: "MEMIF_JOB_PENDING",
      tone: "ok",
      note: "Tat ca byte trong Chunk khop 100% voi bo dem RAM."
    });
  }

  // Advance job offsets after chunk success
  job.currentAddr += lenNow;
  job.remainingLen -= lenNow;
  job.completedBytes += lenNow;
  job.bufOffset += lenNow;
  job.chunkIndex += 1;

  if (job.remainingLen <= 0) {
    finishActiveJobSuccess(job);
    return true;
  }

  simState.activeChunkRange = {
    start: job.currentAddr,
    end: job.currentAddr + Math.min(job.chunkSize, job.remainingLen) - 1,
    kind: job.type
  };
  simState.activeArrows = ["arr_schm_eep", "arr_eep_hw"];
  updateDerivedRegisters();
  return true;
}

function stepClockTick(customStepMs) {
  const cycleMs = Math.max(1, parseHexOrNum(customStepMs || ecucConfig.EepJobCallCycle, 5));
  simState.timeMs += cycleMs;

  if (!ecucConfig.EepInitialized || simState.driverStatus === "MEMIF_UNINIT") {
    updateDerivedRegisters();
    return;
  }

  if (simState.driverStatus !== "MEMIF_BUSY" || !simState.activeJob) {
    simState.activeArrows = ["arr_schm_eep"];
    updateDerivedRegisters();
    return;
  }

  const job = simState.activeJob;
  const maxChunksThisTick = ecucConfig.EepUseInterrupts ? 2 : 1;
  if (ecucConfig.EepUseInterrupts) {
    simState.hwInterruptCount += 1;
  }

  for (let c = 0; c < maxChunksThisTick; c++) {
    if (!simState.activeJob || simState.driverStatus !== "MEMIF_BUSY") break;
    const ok = processSingleChunk(simState.activeJob, cycleMs);
    if (!ok) break;
  }
}

function runActiveJobToCompletion(maxTicks) {
  const limit = maxTicks || 24;
  let count = 0;
  while (simState.driverStatus === "MEMIF_BUSY" && simState.activeJob && count < limit) {
    stepClockTick();
    count++;
  }
  return count;
}

const EEP_C_SNIPPETS = {
  Eep_Init: `/* [SWS_Eep_00146] Khoi tao EEPROM Driver (goi boi EcuM_AL_DriverInitOne) */
#include "Eep.h"

void EcuM_AL_DriverInitOne(const EcuM_ConfigType* ConfigPtr) {
  /* Chuyen Eep tu MEMIF_UNINIT -> MEMIF_IDLE */
  Eep_Init(&Eep_Config);
  if (Eep_GetStatus() == MEMIF_IDLE) {
    Ea_Init(&Ea_Config); /* Khoi tao EEPROM Abstraction sau khi Eep san sang */
  }
}`,
  Eep_SetMode: `/* [SWS_Eep_00147] Doi che do Chunking SLOW <-> FAST khi NvM_ReadAll/WriteAll */
#include "MemIf.h"
#include "Eep.h"

void BswM_EnableFastNvramTransfer(void) {
  if (Eep_GetStatus() == MEMIF_IDLE) {
    MemIf_SetMode(MEMIF_MODE_FAST); /* -> goi Eep_SetMode(MEMIF_MODE_FAST) */
    /* SLOW: Read=16B, Write=8B | FAST: Read=64B, Write=32B */
  }
}`,
  Eep_Read: `/* [SWS_Eep_00148] Doc du lieu bat dong bo tu dia chi vat ly EEPROM */
Std_ReturnType status = Eep_Read(
  0x0000u,          /* Eep_AddressType EepromAddress */
  App_RamReadBuf,   /* uint8* DataBufferPtr */
  32u               /* Eep_LengthType Length */
);
if (status == E_OK) {
  /* JobResult = MEMIF_JOB_PENDING; doi Eep_MainFunction() + Ea_JobEndNotification */
}`,
  Eep_Write: `/* [SWS_Eep_00149] Ghi du lieu bat dong bo & Write Verification */
static const uint8 OdoPayload[16] = { 0x12, 0x34, 0x56, 0x78, /* ... */ };

Std_ReturnType status = Eep_Write(
  0x0000u,          /* Eep_AddressType EepromAddress */
  OdoPayload,       /* const uint8* DataBufferPtr */
  16u               /* Eep_LengthType Length (SLOW: 2 chunks x 8B) */
);`,
  Eep_Erase: `/* [SWS_Eep_00150] Xoa trang vung nho EEPROM ve EepEraseValue (0xFF) */
Std_ReturnType status = Eep_Erase(
  0x0020u,          /* EepromAddress (boi so EepEraseUnitSize = 8B) */
  16u               /* Length */
);
/* Eep_MainFunction() tu dong Verify Blank Check tung byte == 0xFF */`,
  Eep_Compare: `/* [SWS_Eep_00151] So sanh tung byte EEPROM voi RAM (Khong ghi moi) */
Std_ReturnType status = Eep_Compare(
  0x0000u,          /* EepromAddress */
  ExpectedCalibBuf, /* const uint8* DataBufferPtr */
  16u               /* Length */
);
/* Neu khac: Eep_GetJobResult() == MEMIF_BLOCK_INCONSISTENT + Ea_JobErrorNotification */`,
  Eep_Cancel: `/* [SWS_Eep_00152] Huy khan cap Job dang Pending de nhường Immediate Block */
if (Eep_GetStatus() == MEMIF_BUSY) {
  Eep_Cancel();
  /* Driver lap tuc -> MEMIF_IDLE, JobResult -> MEMIF_JOB_CANCELED */
  /* Goi Ea_JobErrorNotification() ngay lap tuc */
}`,
  Eep_MainFunction: `/* [SWS_Eep_00155] Xu ly Chunk bat dong bo moi chu ky 5ms tu SchM */
void Eep_MainFunction(void) {
  if (Eep_InternalJob.State == MEMIF_BUSY) {
    /* 1. Lay ChunkSize theo SLOW/FAST; 2. Kiem tra WriteCycleReduction */
    /* 3. Goi SPI Async (WREN 0x06 -> WRITE 0x02) hoac Internal Register */
    /* 4. Read-Back Verify; 5. Het du lieu -> Ea_JobEndNotification() */
  }
}`,
  Eep_GetVersionInfo: `/* [SWS_Eep_00156] Doc thong tin ModuleId (90) va phien ban AUTOSAR */
Std_VersionInfoType Eep_Ver;
Eep_GetVersionInfo(&Eep_Ver);
/* vendorID=43, moduleID=90 (0x005A), sw_major_version=23, sw_minor_version=11 */`
};
