// ================= PART 4A: DEFAULT ECUC CONFIG & MEMIF SIMULATION ENGINE =================

const defaultConfig = {
  // Tab 0: MemIf General (6)
  MemIfNumberOfDevices: "2",
  MemIfDevErrorDetect: true,
  MemIfVersionInfoApi: true,
  ActiveMemIfMode: "MEMIF_MODE_SLOW",
  FeeDev0Initialized: true,
  EaDev1Initialized: true,

  // Tab 1: Device Routing & Blocks (6)
  SelectedDeviceIndex: "0",
  SelectedLogicalBlock: "0x0004",
  MemIfReadBlockOffset: 0,
  MemIfReadLength: 32,
  WritePayloadHex: "DE AD BE EF 20 26 AA 55",
  PassNullPointerTest: false,

  // Tab 2: Fee & Fls (Dev 0) (6)
  FeeDevErrorDetect: true,
  FeePollingMode: false,
  FeeSetModeSupported: true,
  FeeVirtualPageSize: 8,
  FeeImmediateData: false,
  FeeActiveSectorUsagePct: 75,

  // Tab 3: Ea & Eep (Dev 1) (6)
  EaDevErrorDetect: true,
  EaPollingMode: false,
  EaSetModeSupported: true,
  EaVirtualPageSize: 4,
  FlsEepBytesPerCycleSlow: 8,
  FlsEepBytesPerCycleFast: 32,

  // Tab 4: NvM & Callbacks (6)
  NvMPollingMode: false,
  NvMSetRamBlockStatusApi: true,
  NvMDynamicConfiguration: false,
  NvMBlockManagementType: "NVM_BLOCK_NATIVE",
  NvMDataSelectionBits: 2,
  NvMBswMMultiBlockJobStatusInformation: true,

  // Tab 5: Faults & R23-11 MemAcc (6)
  InjectBlockInconsistent: false,
  InjectBlockInvalid: false,
  InjectHardwareWriteEraseFail: false,
  ForceFeeGarbageCollection: false,
  EnableR2311MemAccLayer: false,
  MemIfDemEventReporting: true
};

let ecucConfig = JSON.parse(JSON.stringify(defaultConfig));
let simState = null;

function createDeviceState(idx, name, shortName) {
  return {
    idx: idx,
    name: name,
    shortName: shortName,
    status: "MEMIF_IDLE",
    jobResult: "MEMIF_JOB_OK",
    mode: "MEMIF_MODE_SLOW",
    activeOp: "NONE",
    activeBlockHex: idx === 0 ? "0x0004" : "0x0010",
    bytesTotal: 32,
    bytesDone: 0,
    gcProgress: 0,
    pendingInvalidation: false,
    pendingImmediate: false,
    lastPayload: idx === 0 ? "DE AD BE EF 20 26 AA 55" : "00 01 4E 20 4B 4D 00 01"
  };
}

function createInitialSimState() {
  return {
    clockMs: 0,
    selectedDeviceCard: 0,
    selectedModuleId: "MOD_MEMIF",
    activeArrows: [],
    activeArrowTypes: {},
    stepExplain: "Hệ thống Memory Stack đã khởi tạo xong (Fee_Init & Ea_Init). MemIf sẵn sàng định tuyến lệnh từ NvM.",
    lastCodeSnippet: buildMemIfRoutingCodeSnippet("MemIf_Read", 0, "0x0004"),
    prevRegA: 0x80,
    prevRegB: 0x08,
    detFlagActive: false,
    lastBroadcastQuery: false,
    immediateActive: false,
    broadcastStatus: "MEMIF_IDLE",
    lastDispatch: {
      api: "Idle (Sẵn sàng)",
      deviceIdx: 0,
      blockHex: "0x0004",
      routeTarget: "Fee (Device 0)",
      detCheck: "PASS",
      expr: "MemIf_ReadFctPtr[0](0x0004, 0, DstPtr, 32)"
    },
    devices: [
      createDeviceState(0, "Device 0: Fee (Flash Emulation)", "Fee0"),
      createDeviceState(1, "Device 1: Ea (EEPROM Abstraction)", "Ea1")
    ],
    feeFlashLayout: {
      activeSector: 0,
      sector0UsagePct: 75,
      sector1UsagePct: 0,
      pages: [
        { vp: "VP#01..03", blk: "0x0004", state: "SUPERSEDED", note: "Old Calib v1" },
        { vp: "VP#04..07", blk: "0x0004", state: "VALID", note: "Calib v2 (32B)" },
        { vp: "VP#08..09", blk: "0x0008", state: "VALID", note: "VIN Copy 1 (16B)" },
        { vp: "VP#10..11", blk: "0x0009", state: "VALID", note: "VIN Copy 2 (16B)" },
        { vp: "VP#12..15", blk: "0x000F", state: "IMMEDIATE", note: "Reserved Crash DTC" },
        { vp: "VP#16..20", blk: "FREE", state: "FREE", note: "Erased 0xFF" }
      ]
    },
    eaEepromLayout: {
      slots: [
        { blk: "0x0010", offset: "0x0180", size: 16, state: "VALID", data: "00 01 4E 20 4B 4D 00 01" },
        { blk: "0x0020", offset: "0x0240", size: 32, state: "VALID", data: "A1 B2 C3 D4 E5 F6 07 18" }
      ]
    },
    nvmState: {
      lastNotification: "NONE",
      pendingBlock: "0x0004",
      pendingOp: "NONE",
      ramBufferHex: "DE AD BE EF 20 26 AA 55",
      redundantRecoveryCount: 0,
      readAllStage: 0,
      writeAllStage: 0
    },
    versionInfo: {
      vendorID: 43,
      moduleID: 22,
      swMajor: 4,
      swMinor: 2,
      swPatch: 0
    },
    dem: {
      flsWriteFail: false,
      eepWriteFail: false,
      nvmIntegrityFail: false
    },
    detErrors: [],
    apiTrace: []
  };
}

function addTrace(api, detail, level) {
  simState.apiTrace.unshift({
    t: simState.clockMs,
    api: api,
    detail: detail,
    level: level || "info"
  });
  if (simState.apiTrace.length > 50) simState.apiTrace.pop();
}

function snapshotRegBefore() {
  simState.prevRegA = computeCoreStatusByte();
  simState.prevRegB = computeDeviceJobByte();
}

function setArrowFlow(arrows, typeMap) {
  simState.activeArrows = arrows || [];
  simState.activeArrowTypes = typeMap || {};
}

function getMacroOrFctMode() {
  return Number(ecucConfig.MemIfNumberOfDevices) <= 1 ? "MACRO" : "FCTPTR";
}

function computeBroadcastStatus() {
  const numDev = Number(ecucConfig.MemIfNumberOfDevices);
  const d0 = simState.devices[0];
  const d1 = simState.devices[1];
  const activeDevs = numDev <= 1 ? [d0] : [d0, d1];

  // SWS_MemIf_00035..00037 priority: UNINIT > BUSY > BUSY_INTERNAL > IDLE
  if (activeDevs.some((d) => d.status === "MEMIF_UNINIT")) return "MEMIF_UNINIT";
  if (activeDevs.some((d) => d.status === "MEMIF_BUSY")) return "MEMIF_BUSY";
  if (activeDevs.some((d) => d.status === "MEMIF_BUSY_INTERNAL")) return "MEMIF_BUSY_INTERNAL";
  return "MEMIF_IDLE";
}

function syncInitFlagsToDevices() {
  const d0 = simState.devices[0];
  const d1 = simState.devices[1];
  if (!ecucConfig.FeeDev0Initialized) {
    d0.status = "MEMIF_UNINIT";
    d0.activeOp = "NONE";
  } else if (d0.status === "MEMIF_UNINIT") {
    d0.status = ecucConfig.ForceFeeGarbageCollection ? "MEMIF_BUSY_INTERNAL" : "MEMIF_IDLE";
  }
  if (!ecucConfig.EaDev1Initialized) {
    d1.status = "MEMIF_UNINIT";
    d1.activeOp = "NONE";
  } else if (d1.status === "MEMIF_UNINIT") {
    d1.status = "MEMIF_IDLE";
  }
  simState.broadcastStatus = computeBroadcastStatus();
}

function jobResultCode(resStr) {
  if (resStr === "MEMIF_JOB_OK") return 0;
  if (resStr === "MEMIF_JOB_PENDING") return 1;
  if (resStr === "MEMIF_JOB_CANCELED") return 2;
  if (resStr === "MEMIF_JOB_FAILED") return 3;
  if (resStr === "MEMIF_BLOCK_INCONSISTENT") return 4;
  if (resStr === "MEMIF_BLOCK_INVALID") return 5;
  return 0;
}

function computeCoreStatusByte() {
  const bcast = computeBroadcastStatus();
  let b = 0;
  if (Number(ecucConfig.MemIfNumberOfDevices) > 1) b |= 0x80;
  if (simState.lastDispatch && simState.lastDispatch.deviceIdx === 1) b |= 0x40;
  if (ecucConfig.ActiveMemIfMode === "MEMIF_MODE_FAST") b |= 0x20;
  if (simState.lastBroadcastQuery) b |= 0x10;
  if (simState.detFlagActive) b |= 0x08;
  if (bcast === "MEMIF_UNINIT") b |= 0x04;
  else if (bcast === "MEMIF_BUSY_INTERNAL") b |= 0x02;
  else if (bcast === "MEMIF_BUSY") b |= 0x01;
  return b;
}

function computeDeviceJobByte() {
  const d0 = simState.devices[0];
  const d1 = simState.devices[1];
  const focusIdx = simState.selectedDeviceCard === 1 ? 1 : 0;
  const focusDev = simState.devices[focusIdx];
  let b = 0;
  if (d0.status === "MEMIF_BUSY") b |= 0x80;
  if (d0.status === "MEMIF_BUSY_INTERNAL") b |= 0x40;
  if (d1.status === "MEMIF_BUSY") b |= 0x20;
  if (simState.immediateActive) b |= 0x10;
  if (!ecucConfig.NvMPollingMode) b |= 0x08;
  b |= (jobResultCode(focusDev.jobResult) & 0x07);
  return b;
}

function reportDetError(moduleId, apiId, errorId, errName, detail) {
  simState.detFlagActive = true;
  simState.detErrors.unshift({
    t: simState.clockMs,
    moduleId: moduleId,
    apiId: apiId,
    errorId: errName + " (" + errorId + ")",
    detail: detail
  });
  if (simState.detErrors.length > 20) simState.detErrors.pop();
  addTrace("Det_ReportError(" + moduleId + ", 0, " + apiId + ", " + errName + ")", detail, "err");
}

function buildMemIfRoutingCodeSnippet(apiName, devIdx, blkHex) {
  const isMacro = Number(ecucConfig.MemIfNumberOfDevices) <= 1;
  const lowLayer = ecucConfig.EnableR2311MemAccLayer ? "MemAcc_Write() -> Mem_Write()" : (devIdx === 1 ? "Eep_Write() -> Spi_AsyncTransmit()" : "Fls_Write() -> DFlash");
  if (isMacro) {
    return [
      "/* === CHẾ ĐỘ 1 DEVICE: MACRO EXPANSION (SWS_MemIf_00019) === */",
      "/* MemIf_Cfg.h — DeviceIndex bị loại bỏ lúc Pre-compile (0 CPU Overhead) */",
      "#define MEMIF_NUMBER_OF_DEVICES   (1U)",
      "#define MemIf_Read(DeviceIndex, BlockNumber, BlockOffset, DataBufferPtr, Length) \\",
      "        Fee_Read((BlockNumber), (BlockOffset), (DataBufferPtr), (Length))",
      "#define MemIf_Write(DeviceIndex, BlockNumber, DataBufferPtr) \\",
      "        Fee_Write((BlockNumber), (DataBufferPtr))",
      "#define MemIf_GetStatus(DeviceIndex)       Fee_GetStatus()",
      "#define MemIf_GetJobResult(DeviceIndex)    Fee_GetJobResult()",
      "",
      "/* Lời gọi thực tế từ NvM sau khi tiền xử lý: */",
      "// NvM gọi " + apiName + "(" + devIdx + ", " + blkHex + ", ...) -> biên dịch thành:",
      "Fee_" + apiName.replace("MemIf_", "") + "(" + blkHex + ", ...); /* Tầng dưới: " + lowLayer + " */"
    ].join("\n");
  }
  return [
    "/* === CHẾ ĐỘ ĐA THIẾT BỊ: FUNCTION POINTER ARRAY (SWS_MemIf_00020) === */",
    "/* MemIf_Cfg.c — Bảng con trỏ hàm hằng số định tuyến theo DeviceIndex */",
    "#define MEMIF_NUMBER_OF_DEVICES   (2U)",
    "static const MemIf_ReadFctPtrType MemIf_ReadFctPtr[MEMIF_NUMBER_OF_DEVICES] = {",
    "    &Fee_Read,  /* DeviceIndex = 0: Flash EEPROM Emulation */",
    "    &Ea_Read    /* DeviceIndex = 1: EEPROM Abstraction */",
    "};",
    "static const MemIf_WriteFctPtrType MemIf_WriteFctPtr[MEMIF_NUMBER_OF_DEVICES] = {",
    "    &Fee_Write, /* DeviceIndex = 0 */",
    "    &Ea_Write   /* DeviceIndex = 1 */",
    "};",
    "",
    "/* Hàm thực thi trong MemIf.c: */",
    "Std_ReturnType " + apiName + "(uint8 DeviceIndex, uint16 BlockNumber, ...) {",
    "#if (MEMIF_DEV_ERROR_DETECT == STD_ON)",
    "    if (DeviceIndex >= MEMIF_NUMBER_OF_DEVICES) {",
    "        Det_ReportError(MEMIF_MODULE_ID, 0U, API_ID, MEMIF_E_PARAM_DEVICE);",
    "        return E_NOT_OK;",
    "    }",
    "#endif",
    "    return MemIf_" + apiName.replace("MemIf_", "") + "FctPtr[" + devIdx + "](" + blkHex + ", ...); /* " + lowLayer + " */",
    "}"
  ].join("\n");
}

function validateMemIfCall(apiName, apiIdHex, devIdx, requiresValidPtr, passNull, allowBroadcast) {
  const numDev = Number(ecucConfig.MemIfNumberOfDevices);
  const isMacro = numDev <= 1;

  // In Macro 1-Device mode (SWS_MemIf_00019), DeviceIndex is ignored by MemIf preprocessor macros
  // except if the user explicitly tests pointer null at Fee or MemIf_GetVersionInfo.
  if (!isMacro) {
    const devOk = (devIdx >= 0 && devIdx < numDev) || (allowBroadcast && devIdx === 255);
    if (!devOk) {
      if (ecucConfig.MemIfDevErrorDetect) {
        reportDetError(22, apiIdHex, "0x01", "MEMIF_E_PARAM_DEVICE",
          apiName + "(DeviceIndex=" + devIdx + ") vượt quá MEMIF_NUMBER_OF_DEVICES (" + numDev + ")" +
          (devIdx === 255 ? " — Mã 0xFF CHỈ hợp lệ cho MemIf_GetStatus()!" : " — SWS_MemIf_00022."));
        simState.lastDispatch = {
          api: apiName, deviceIdx: devIdx, blockHex: ecucConfig.SelectedLogicalBlock,
          routeTarget: "BLOCKED BY DET", detCheck: "FAIL (MEMIF_E_PARAM_DEVICE = 0x01)",
          expr: "Det_ReportError(22, 0, " + apiIdHex + ", MEMIF_E_PARAM_DEVICE)"
        };
        setArrowFlow(["arr_nvm_memif", "arr_memif_det"], { arr_nvm_memif: "active", arr_memif_det: "active-err" });
        return { ok: false, targetIdx: 0 };
      }
    }
  }

  if (requiresValidPtr && passNull && ecucConfig.MemIfDevErrorDetect) {
    reportDetError(22, apiIdHex, "0x02", "MEMIF_E_PARAM_POINTER",
      apiName + "() nhận con trỏ NULL_PTR — Vi phạm SWS_MemIf_00023.");
    simState.lastDispatch = {
      api: apiName, deviceIdx: devIdx, blockHex: ecucConfig.SelectedLogicalBlock,
      routeTarget: "BLOCKED BY DET", detCheck: "FAIL (MEMIF_E_PARAM_POINTER = 0x02)",
      expr: "Det_ReportError(22, 0, " + apiIdHex + ", MEMIF_E_PARAM_POINTER)"
    };
    setArrowFlow(["arr_nvm_memif", "arr_memif_det"], { arr_nvm_memif: "active", arr_memif_det: "active-err" });
    return { ok: false, targetIdx: 0 };
  }

  const targetIdx = isMacro ? 0 : (devIdx === 1 ? 1 : 0);
  simState.detFlagActive = false;
  return { ok: true, targetIdx: targetIdx };
}

function updateFeeVirtualPagesOnWrite(blkHex, payload, isImmediate) {
  const layout = simState.feeFlashLayout;
  const pages = layout.pages;
  // Supersede previous VALID page for same block
  pages.forEach((p) => {
    if (p.blk === blkHex && (p.state === "VALID" || p.state === "INVALID" || p.state === "INCONSISTENT")) {
      p.state = "SUPERSEDED";
      p.note = "Old version (Superseded)";
    }
  });
  const freeSlot = pages.find((p) => p.state === "FREE");
  if (freeSlot) {
    freeSlot.blk = blkHex;
    freeSlot.state = isImmediate ? "IMMEDIATE" : "VALID";
    freeSlot.note = (isImmediate ? "Crash Data: " : "Data: ") + payload.slice(0, 14);
  } else {
    // Rotate last slot or update existing immediate slot
    const existingImm = pages.find((p) => p.blk === blkHex && p.state === "IMMEDIATE");
    if (existingImm) {
      existingImm.note = "Updated Crash: " + payload.slice(0, 14);
    } else {
      pages[pages.length - 1] = { vp: "VP#21..24", blk: blkHex, state: isImmediate ? "IMMEDIATE" : "VALID", note: payload.slice(0, 14) };
    }
  }
  const inc = isImmediate ? 5 : 15;
  ecucConfig.FeeActiveSectorUsagePct = Math.min(100, Number(ecucConfig.FeeActiveSectorUsagePct) + inc);
  if (layout.activeSector === 0) layout.sector0UsagePct = ecucConfig.FeeActiveSectorUsagePct;
  else layout.sector1UsagePct = ecucConfig.FeeActiveSectorUsagePct;
}

function updateFeeVirtualPagesOnInvalidate(blkHex) {
  const pages = simState.feeFlashLayout.pages;
  let updated = false;
  pages.forEach((p) => {
    if (p.blk === blkHex && (p.state === "VALID" || p.state === "IMMEDIATE")) {
      p.state = "INVALID";
      p.note = "Invalidated Header (0xAA)";
      updated = true;
    }
  });
  if (!updated) {
    const freeSlot = pages.find((p) => p.state === "FREE");
    if (freeSlot) {
      freeSlot.blk = blkHex;
      freeSlot.state = "INVALID";
      freeSlot.note = "Invalid Marker Written";
    }
  }
}

// -------------------- 9 STANDARD MEMIF APIS --------------------

function api_MemIf_Read(devIdx, blkHex, offset, len, passNull) {
  snapshotRegBefore();
  syncInitFlagsToDevices();
  simState.lastBroadcastQuery = false;
  simState.immediateActive = false;

  const chk = validateMemIfCall("MemIf_Read", "0x02", devIdx, true, Boolean(passNull), false);
  if (!chk.ok) {
    simState.lastCodeSnippet = buildMemIfRoutingCodeSnippet("MemIf_Read", devIdx, blkHex);
    return false;
  }

  const tIdx = chk.targetIdx;
  const dev = simState.devices[tIdx];
  const blkInfo = LOGICAL_BLOCKS[blkHex] || { size: len || 32, immediate: false, name: "CustomBlock" };
  const isMacro = Number(ecucConfig.MemIfNumberOfDevices) <= 1;

  if (dev.status === "MEMIF_UNINIT") {
    addTrace("MemIf_Read(" + devIdx + ", " + blkHex + ")", "Thất bại: " + dev.shortName + " đang ở MEMIF_UNINIT!", "err");
    return false;
  }

  dev.status = "MEMIF_BUSY";
  dev.jobResult = "MEMIF_JOB_PENDING";
  dev.activeOp = "READ";
  dev.activeBlockHex = blkHex;
  dev.bytesTotal = Math.max(1, Number(len || blkInfo.size));
  dev.bytesDone = 0;
  simState.selectedDeviceCard = tIdx;
  simState.nvmState.pendingBlock = blkHex;
  simState.nvmState.pendingOp = "READ";

  const callee = (tIdx === 0 ? "Fee_Read" : "Ea_Read") + "(" + blkHex + ", " + offset + ", DstPtr, " + dev.bytesTotal + ")";
  simState.lastDispatch = {
    api: "MemIf_Read (0x02)",
    deviceIdx: tIdx,
    blockHex: blkHex,
    routeTarget: tIdx === 0 ? "Device 0: Fee ➔ Fls" : "Device 1: Ea ➔ Eep",
    detCheck: isMacro ? "Bypassed (Macro 1-Dev)" : "PASS (DevIdx < 2 & Ptr != NULL)",
    expr: isMacro ? ("#define -> " + callee) : ("MemIf_ReadFctPtr[" + tIdx + "] ➔ " + callee)
  };
  simState.broadcastStatus = computeBroadcastStatus();
  simState.lastCodeSnippet = buildMemIfRoutingCodeSnippet("MemIf_Read", tIdx, blkHex);

  const arrows = ["arr_swc_rte", "arr_rte_nvm", "arr_nvm_memif", tIdx === 0 ? "arr_memif_fee" : "arr_memif_ea", tIdx === 0 ? "arr_fee_fls" : "arr_ea_eep"];
  const map = {};
  arrows.forEach((a) => { map[a] = "active"; });
  setArrowFlow(arrows, map);

  addTrace("MemIf_Read(" + devIdx + ", " + blkHex + ", Off=" + offset + ", Len=" + dev.bytesTotal + ")",
    "Định tuyến qua " + (isMacro ? "Macro" : "FctPtr[" + tIdx + "]") + " xuống " + callee + " → Status=MEMIF_BUSY, JobResult=MEMIF_JOB_PENDING.", "info");
  return true;
}

function api_MemIf_Write(devIdx, blkHex, payloadHex, passNull) {
  snapshotRegBefore();
  syncInitFlagsToDevices();
  simState.lastBroadcastQuery = false;

  const chk = validateMemIfCall("MemIf_Write", "0x03", devIdx, true, Boolean(passNull), false);
  if (!chk.ok) {
    simState.lastCodeSnippet = buildMemIfRoutingCodeSnippet("MemIf_Write", devIdx, blkHex);
    return false;
  }

  const tIdx = chk.targetIdx;
  const dev = simState.devices[tIdx];
  const blkInfo = LOGICAL_BLOCKS[blkHex] || { size: 32, immediate: false, name: "CustomBlock" };
  const isImm = Boolean(blkInfo.immediate || ecucConfig.FeeImmediateData);
  simState.immediateActive = isImm;
  const isMacro = Number(ecucConfig.MemIfNumberOfDevices) <= 1;

  if (dev.status === "MEMIF_UNINIT") {
    addTrace("MemIf_Write(" + devIdx + ", " + blkHex + ")", "Thất bại: " + dev.shortName + " chưa Init (MEMIF_UNINIT).", "err");
    return false;
  }

  // If Fee was BUSY_INTERNAL (GC) and Immediate Block arrives, Immediate preempts GC!
  dev.status = "MEMIF_BUSY";
  dev.jobResult = "MEMIF_JOB_PENDING";
  dev.activeOp = "WRITE";
  dev.activeBlockHex = blkHex;
  dev.bytesTotal = blkInfo.size;
  dev.bytesDone = 0;
  dev.pendingImmediate = isImm;
  dev.lastPayload = payloadHex || ecucConfig.WritePayloadHex;
  simState.selectedDeviceCard = tIdx;
  simState.nvmState.pendingBlock = blkHex;
  simState.nvmState.pendingOp = "WRITE";

  const callee = (tIdx === 0 ? "Fee_Write" : "Ea_Write") + "(" + blkHex + ", SrcPtr)";
  simState.lastDispatch = {
    api: "MemIf_Write (0x03)" + (isImm ? " [IMMEDIATE]" : ""),
    deviceIdx: tIdx,
    blockHex: blkHex,
    routeTarget: tIdx === 0 ? "Device 0: Fee ➔ Fls" : "Device 1: Ea ➔ Eep",
    detCheck: isMacro ? "Bypassed (Macro 1-Dev)" : "PASS (DevIdx < 2 & Ptr != NULL)",
    expr: isMacro ? ("#define -> " + callee) : ("MemIf_WriteFctPtr[" + tIdx + "] ➔ " + callee)
  };
  simState.broadcastStatus = computeBroadcastStatus();
  simState.lastCodeSnippet = buildMemIfRoutingCodeSnippet("MemIf_Write", tIdx, blkHex);

  const arrows = ["arr_swc_rte", "arr_rte_nvm", "arr_nvm_memif", tIdx === 0 ? "arr_memif_fee" : "arr_memif_ea", tIdx === 0 ? "arr_fee_fls" : "arr_ea_eep"];
  const map = {};
  arrows.forEach((a) => { map[a] = "active"; });
  setArrowFlow(arrows, map);

  addTrace("MemIf_Write(" + devIdx + ", " + blkHex + ")",
    "Định tuyến xuống " + callee + (isImm ? " (Immediate Crash Priority!)" : "") + " → MEMIF_BUSY / JOB_PENDING.", "info");
  return true;
}

function api_MemIf_EraseImmediateBlock(devIdx, blkHex) {
  snapshotRegBefore();
  syncInitFlagsToDevices();
  simState.lastBroadcastQuery = false;

  const chk = validateMemIfCall("MemIf_EraseImmediateBlock", "0x09", devIdx, false, false, false);
  if (!chk.ok) return false;

  const tIdx = chk.targetIdx;
  const dev = simState.devices[tIdx];
  const blkInfo = LOGICAL_BLOCKS[blkHex] || { immediate: false };
  const isImmCfg = Boolean(blkInfo.immediate || ecucConfig.FeeImmediateData);

  if (!isImmCfg && ecucConfig.FeeDevErrorDetect) {
    reportDetError(21, "0x09", "0x02", "FEE_E_INVALID_BLOCK_NO",
      "Block " + blkHex + " không bật FeeImmediateData = TRUE! Không thể gọi MemIf_EraseImmediateBlock().");
    setArrowFlow(["arr_nvm_memif", "arr_memif_fee", "arr_memif_det"], { arr_nvm_memif: "active", arr_memif_fee: "active", arr_memif_det: "active-err" });
    return false;
  }

  simState.immediateActive = true;
  dev.status = "MEMIF_BUSY";
  dev.jobResult = "MEMIF_JOB_PENDING";
  dev.activeOp = "ERASE_IMMEDIATE";
  dev.activeBlockHex = blkHex;
  dev.bytesTotal = 16;
  dev.bytesDone = 0;
  dev.pendingImmediate = true;
  simState.selectedDeviceCard = tIdx;

  const callee = (tIdx === 0 ? "Fee_EraseImmediateBlock" : "Ea_EraseImmediateBlock") + "(" + blkHex + ")";
  simState.lastDispatch = {
    api: "MemIf_EraseImmediateBlock (0x09)",
    deviceIdx: tIdx,
    blockHex: blkHex,
    routeTarget: tIdx === 0 ? "Device 0: Fee ➔ Fls_Erase" : "Device 1: Ea ➔ Eep_Erase",
    detCheck: "PASS (FeeImmediateData = TRUE)",
    expr: callee
  };
  simState.broadcastStatus = computeBroadcastStatus();
  simState.lastCodeSnippet = buildMemIfRoutingCodeSnippet("MemIf_EraseImmediateBlock", tIdx, blkHex);
  setArrowFlow(["arr_nvm_memif", tIdx === 0 ? "arr_memif_fee" : "arr_memif_ea", tIdx === 0 ? "arr_fee_fls" : "arr_ea_eep"],
    { arr_nvm_memif: "active", [tIdx === 0 ? "arr_memif_fee" : "arr_memif_ea"]: "active", [tIdx === 0 ? "arr_fee_fls" : "arr_ea_eep"]: "active" });

  addTrace("MemIf_EraseImmediateBlock(" + devIdx + ", " + blkHex + ")",
    "Xóa sẵn vùng dự trữ cho Immediate Crash Block (" + callee + ") — SWS_MemIf_00045.", "warn");
  return true;
}

function api_MemIf_InvalidateBlock(devIdx, blkHex) {
  snapshotRegBefore();
  syncInitFlagsToDevices();
  simState.lastBroadcastQuery = false;
  simState.immediateActive = false;

  const chk = validateMemIfCall("MemIf_InvalidateBlock", "0x07", devIdx, false, false, false);
  if (!chk.ok) return false;

  const tIdx = chk.targetIdx;
  const dev = simState.devices[tIdx];
  dev.status = "MEMIF_BUSY";
  dev.jobResult = "MEMIF_JOB_PENDING";
  dev.activeOp = "INVALIDATE";
  dev.activeBlockHex = blkHex;
  dev.bytesTotal = 8;
  dev.bytesDone = 0;
  simState.selectedDeviceCard = tIdx;

  const callee = (tIdx === 0 ? "Fee_InvalidateBlock" : "Ea_InvalidateBlock") + "(" + blkHex + ")";
  simState.lastDispatch = {
    api: "MemIf_InvalidateBlock (0x07)",
    deviceIdx: tIdx,
    blockHex: blkHex,
    routeTarget: tIdx === 0 ? "Device 0: Fee ➔ Fls" : "Device 1: Ea ➔ Eep",
    detCheck: "PASS",
    expr: callee
  };
  simState.broadcastStatus = computeBroadcastStatus();
  simState.lastCodeSnippet = buildMemIfRoutingCodeSnippet("MemIf_InvalidateBlock", tIdx, blkHex);
  setArrowFlow(["arr_nvm_memif", tIdx === 0 ? "arr_memif_fee" : "arr_memif_ea"],
    { arr_nvm_memif: "active", [tIdx === 0 ? "arr_memif_fee" : "arr_memif_ea"]: "active" });

  addTrace("MemIf_InvalidateBlock(" + devIdx + ", " + blkHex + ")",
    "Đánh dấu Block " + blkHex + " là INVALID qua " + callee + " — SWS_MemIf_00043.", "warn");
  return true;
}

function api_MemIf_Cancel(devIdx) {
  snapshotRegBefore();
  syncInitFlagsToDevices();
  simState.lastBroadcastQuery = false;

  const chk = validateMemIfCall("MemIf_Cancel", "0x04", devIdx, false, false, false);
  if (!chk.ok) return false;

  const tIdx = chk.targetIdx;
  const dev = simState.devices[tIdx];
  const wasBusy = (dev.status === "MEMIF_BUSY");

  dev.status = "MEMIF_IDLE";
  dev.jobResult = "MEMIF_JOB_CANCELED";
  dev.activeOp = "NONE";
  dev.bytesDone = 0;
  simState.selectedDeviceCard = tIdx;

  if (!ecucConfig.NvMPollingMode && wasBusy) {
    simState.nvmState.lastNotification = "NvM_JobErrorNotification() [CANCELED]";
  }

  const callee = (tIdx === 0 ? "Fee_Cancel()" : "Ea_Cancel()");
  simState.lastDispatch = {
    api: "MemIf_Cancel (0x04)",
    deviceIdx: tIdx,
    blockHex: dev.activeBlockHex,
    routeTarget: tIdx === 0 ? "Fee_Cancel() ➔ Fls_Cancel()" : "Ea_Cancel() ➔ Eep_Cancel()",
    detCheck: "PASS",
    expr: callee + " ➔ MEMIF_JOB_CANCELED (0x02)"
  };
  simState.broadcastStatus = computeBroadcastStatus();
  simState.lastCodeSnippet = buildMemIfRoutingCodeSnippet("MemIf_Cancel", tIdx, dev.activeBlockHex);

  const cbkArr = tIdx === 0 ? "arr_fee_nvm_cbk" : "arr_ea_nvm_cbk";
  setArrowFlow(["arr_nvm_memif", tIdx === 0 ? "arr_memif_fee" : "arr_memif_ea", cbkArr],
    { arr_nvm_memif: "active", [tIdx === 0 ? "arr_memif_fee" : "arr_memif_ea"]: "active", [cbkArr]: "active-err" });

  addTrace("MemIf_Cancel(" + devIdx + ")",
    "Hủy ngay lệnh đang chạy trên " + dev.shortName + " → Status=MEMIF_IDLE, JobResult=MEMIF_JOB_CANCELED (0x02) — SWS_MemIf_00041.", "warn");
  return true;
}

function api_MemIf_SetMode(modeStr) {
  snapshotRegBefore();
  syncInitFlagsToDevices();
  ecucConfig.ActiveMemIfMode = modeStr;
  simState.lastBroadcastQuery = true;

  const d0 = simState.devices[0];
  const d1 = simState.devices[1];
  const changed = [];
  if (ecucConfig.FeeSetModeSupported && d0.status !== "MEMIF_UNINIT") {
    d0.mode = modeStr;
    changed.push("Fee_SetMode(" + modeStr + ")");
  }
  if (Number(ecucConfig.MemIfNumberOfDevices) > 1 && ecucConfig.EaSetModeSupported && d1.status !== "MEMIF_UNINIT") {
    d1.mode = modeStr;
    changed.push("Ea_SetMode(" + modeStr + ")");
  }

  simState.lastDispatch = {
    api: "MemIf_SetMode (0x01) [BROADCAST]",
    deviceIdx: 255,
    blockHex: "--",
    routeTarget: changed.join(" & ") || "No SetModeSupported",
    detCheck: "N/A (Hàm quảng bá không nhận DeviceIndex)",
    expr: "for(i=0; i<MEMIF_NUMBER_OF_DEVICES; i++) SetModeFctPtr[i](" + modeStr + ");"
  };
  simState.lastCodeSnippet = [
    "/* === MEMIF_SETMODE QUẢNG BÁ TOÀN HỆ THỐNG (SWS_MemIf_00038) === */",
    "void MemIf_SetMode(MemIf_ModeType Mode) {",
    "    /* Hàm duy nhất KHÔNG có DeviceIndex: lặp qua mọi thiết bị bên dưới */",
    "    for (uint8 idx = 0U; idx < MEMIF_NUMBER_OF_DEVICES; idx++) {",
    "        MemIf_SetModeFctPtr[idx](" + modeStr + ");",
    "    }",
    "}",
    "/* Đã phát quảng bá tới: " + (changed.join(", ") || "None") + " */"
  ].join("\n");

  const arrs = ["arr_nvm_memif", "arr_memif_fee", "arr_fee_fls"];
  if (Number(ecucConfig.MemIfNumberOfDevices) > 1) {
    arrs.push("arr_memif_ea", "arr_ea_eep");
  }
  const map = {};
  arrs.forEach((a) => { map[a] = "active"; });
  setArrowFlow(arrs, map);

  addTrace("MemIf_SetMode(" + modeStr + ")",
    "Phát quảng bá đổi tốc độ xuống: " + (changed.join(" + ") || "Không có thiết bị hỗ trợ") + " — SWS_MemIf_00038.", "info");
  return true;
}

function api_MemIf_GetStatus(devIdx) {
  snapshotRegBefore();
  syncInitFlagsToDevices();
  const isBroadcast = (devIdx === 255);
  simState.lastBroadcastQuery = isBroadcast;

  const chk = validateMemIfCall("MemIf_GetStatus", "0x05", devIdx, false, false, true);
  if (!chk.ok) return "MEMIF_UNINIT";

  let result;
  if (isBroadcast) {
    result = computeBroadcastStatus();
    simState.selectedDeviceCard = 255;
  } else {
    const tIdx = Number(ecucConfig.MemIfNumberOfDevices) <= 1 ? 0 : devIdx;
    result = simState.devices[tIdx].status;
    simState.selectedDeviceCard = tIdx;
  }
  simState.broadcastStatus = computeBroadcastStatus();

  simState.lastDispatch = {
    api: "MemIf_GetStatus(" + (isBroadcast ? "MEMIF_BROADCAST_ID = 0xFF" : devIdx) + ")",
    deviceIdx: isBroadcast ? 0 : chk.targetIdx,
    blockHex: "--",
    routeTarget: isBroadcast ? "Hợp nhất Dev0 (" + simState.devices[0].status + ") & Dev1 (" + simState.devices[1].status + ")" : simState.devices[chk.targetIdx].shortName,
    detCheck: "PASS (" + (isBroadcast ? "0xFF hợp lệ cho GetStatus" : "DevIdx valid") + ")",
    expr: "Return: " + result + " (UNINIT > BUSY > BUSY_INTERNAL > IDLE)"
  };
  simState.lastCodeSnippet = [
    "/* === MEMIF_GETSTATUS & HỢP NHẤT MEMIF_BROADCAST_ID (SWS_MemIf_00035..00037) === */",
    "MemIf_StatusType MemIf_GetStatus(uint8 DeviceIndex) {",
    "    if (DeviceIndex == MEMIF_BROADCAST_ID /* 0xFF */) {",
    "        /* Quét ưu tiên: UNINIT > BUSY > BUSY_INTERNAL > IDLE */",
    "        /* Dev 0 (Fee): " + simState.devices[0].status + " | Dev 1 (Ea): " + simState.devices[1].status + " */",
    "        return " + result + ";",
    "    }",
    "    return MemIf_GetStatusFctPtr[DeviceIndex]();",
    "}"
  ].join("\n");

  setArrowFlow(["arr_nvm_memif", "arr_memif_polling"], { arr_nvm_memif: "active", arr_memif_polling: "active-cbk" });
  addTrace("MemIf_GetStatus(" + (isBroadcast ? "0xFF" : devIdx) + ")",
    "Kết quả trả về: " + result + (isBroadcast ? " [Fee=" + simState.devices[0].status + ", Ea=" + simState.devices[1].status + "]" : ""), "ok");
  return result;
}

function api_MemIf_GetJobResult(devIdx) {
  snapshotRegBefore();
  syncInitFlagsToDevices();
  simState.lastBroadcastQuery = false;

  // CRITICAL: MEMIF_BROADCAST_ID (0xFF) is NOT allowed in MemIf_GetJobResult!
  const chk = validateMemIfCall("MemIf_GetJobResult", "0x06", devIdx, false, false, false);
  if (!chk.ok) return "MEMIF_JOB_FAILED";

  const tIdx = chk.targetIdx;
  const res = simState.devices[tIdx].jobResult;
  simState.selectedDeviceCard = tIdx;

  simState.lastDispatch = {
    api: "MemIf_GetJobResult (0x06)",
    deviceIdx: tIdx,
    blockHex: simState.devices[tIdx].activeBlockHex,
    routeTarget: (tIdx === 0 ? "Fee_GetJobResult()" : "Ea_GetJobResult()"),
    detCheck: "PASS (0xFF bị cấm tuyệt đối ở API này)",
    expr: "Return: " + res
  };
  setArrowFlow(["arr_nvm_memif", "arr_memif_polling"], { arr_nvm_memif: "active", arr_memif_polling: "active-cbk" });
  addTrace("MemIf_GetJobResult(" + devIdx + ")", "Kết quả công việc: " + res + " — SWS_MemIf_00042.", res === "MEMIF_JOB_OK" ? "ok" : "warn");
  return res;
}

function api_MemIf_GetVersionInfo(passNull) {
  snapshotRegBefore();
  if (!ecucConfig.MemIfVersionInfoApi) {
    addTrace("MemIf_GetVersionInfo()", "API đang bị tắt (MemIfVersionInfoApi = FALSE).", "warn");
    return false;
  }
  if (passNull && ecucConfig.MemIfDevErrorDetect) {
    reportDetError(22, "0x08", "0x02", "MEMIF_E_PARAM_POINTER",
      "MemIf_GetVersionInfo(NULL_PTR) -> Báo lỗi MEMIF_E_PARAM_POINTER (0x02) theo SWS_MemIf_00023.");
    setArrowFlow(["arr_nvm_memif", "arr_memif_det"], { arr_nvm_memif: "active", arr_memif_det: "active-err" });
    return false;
  }
  simState.detFlagActive = false;
  const v = simState.versionInfo;
  simState.lastDispatch = {
    api: "MemIf_GetVersionInfo (0x08)",
    deviceIdx: 0,
    blockHex: "--",
    routeTarget: "Std_VersionInfoType*",
    detCheck: "PASS (VersionInfoPtr != NULL_PTR)",
    expr: "moduleID=" + v.moduleID + ", vendorID=" + v.vendorID + ", sw=" + v.swMajor + "." + v.swMinor + "." + v.swPatch
  };
  addTrace("MemIf_GetVersionInfo(&VerInfo)",
    "ModuleId=22 (0x0016), VendorId=" + v.vendorID + ", SW=" + v.swMajor + "." + v.swMinor + "." + v.swPatch + " — SWS_MemIf_00046.", "ok");
  return true;
}

// -------------------- ASYNCHRONOUS BSW MAINFUNCTIONS & GC --------------------

function finalizeDeviceJob(tIdx) {
  const dev = simState.devices[tIdx];
  const isRead = (dev.activeOp === "READ");
  const isWrite = (dev.activeOp === "WRITE");
  const isInval = (dev.activeOp === "INVALIDATE");
  const isEraseImm = (dev.activeOp === "ERASE_IMMEDIATE");
  const blkHex = dev.activeBlockHex;

  if (ecucConfig.InjectHardwareWriteEraseFail) {
    dev.status = "MEMIF_IDLE";
    dev.jobResult = "MEMIF_JOB_FAILED";
    dev.activeOp = "NONE";
    if (ecucConfig.MemIfDemEventReporting) {
      if (tIdx === 0) simState.dem.flsWriteFail = true;
      else simState.dem.eepWriteFail = true;
      addTrace("Dem_SetEventStatus(" + (tIdx === 0 ? "FLS_E_WRITE_FAILED" : "EEP_E_WRITE_FAILED") + ", FAILED)",
        "Lỗi phần cứng vật lý " + (tIdx === 0 ? "Data Flash" : "SPI EEPROM") + "!", "err");
    }
    if (!ecucConfig.NvMPollingMode) {
      simState.nvmState.lastNotification = "NvM_JobErrorNotification() [MEMIF_JOB_FAILED]";
      const cbkArr = tIdx === 0 ? "arr_fee_nvm_cbk" : "arr_ea_nvm_cbk";
      setArrowFlow([cbkArr, "arr_drv_dem"], { [cbkArr]: "active-err", arr_drv_dem: "active-err" });
    }
    addTrace((tIdx === 0 ? "Fee" : "Ea") + "_MainFunction()", "Công việc thất bại: MEMIF_JOB_FAILED (0x03).", "err");
    simState.broadcastStatus = computeBroadcastStatus();
    return;
  }

  if (isRead) {
    const blkMarkedInvalid = (tIdx === 0 && simState.feeFlashLayout.pages.some((p) => p.blk === blkHex && p.state === "INVALID")) ||
                             (tIdx === 1 && simState.eaEepromLayout.slots.some((s) => s.blk === blkHex && s.state === "INVALID")) ||
                             ecucConfig.InjectBlockInvalid;
    const blkMarkedInconsistent = (tIdx === 0 && simState.feeFlashLayout.pages.some((p) => p.blk === blkHex && p.state === "INCONSISTENT")) ||
                                  ecucConfig.InjectBlockInconsistent;

    dev.status = "MEMIF_IDLE";
    dev.activeOp = "NONE";

    if (blkMarkedInconsistent) {
      dev.jobResult = "MEMIF_BLOCK_INCONSISTENT";
      if (!ecucConfig.NvMPollingMode) {
        simState.nvmState.lastNotification = "NvM_JobErrorNotification() [INCONSISTENT]";
      }
      addTrace((tIdx === 0 ? "Fee" : "Ea") + "_MainFunction()",
        "Phát hiện rách dữ liệu / trang trắng trên " + blkHex + " → MEMIF_BLOCK_INCONSISTENT (0x04)!", "err");
    } else if (blkMarkedInvalid) {
      dev.jobResult = "MEMIF_BLOCK_INVALID";
      if (!ecucConfig.NvMPollingMode) {
        simState.nvmState.lastNotification = "NvM_JobErrorNotification() [INVALID]";
      }
      addTrace((tIdx === 0 ? "Fee" : "Ea") + "_MainFunction()",
        "Block " + blkHex + " mang cờ INVALID → MEMIF_BLOCK_INVALID (0x05) (NvM nạp ROM Default).", "warn");
    } else {
      dev.jobResult = "MEMIF_JOB_OK";
      simState.nvmState.ramBufferHex = dev.lastPayload;
      if (!ecucConfig.NvMPollingMode) {
        simState.nvmState.lastNotification = "NvM_JobEndNotification() [JOB_OK]";
        const cbkArr = tIdx === 0 ? "arr_fee_nvm_cbk" : "arr_ea_nvm_cbk";
        setArrowFlow([cbkArr], { [cbkArr]: "active-cbk" });
      }
      addTrace((tIdx === 0 ? "Fee" : "Ea") + "_MainFunction()",
        "Đọc xong " + blkHex + " → MEMIF_JOB_OK" + (!ecucConfig.NvMPollingMode ? " & gọi thẳng NvM_JobEndNotification()!" : " (Chờ NvM Poll)."), "ok");
    }
  } else if (isWrite) {
    if (tIdx === 0) {
      updateFeeVirtualPagesOnWrite(blkHex, dev.lastPayload, dev.pendingImmediate);
    } else {
      const slot = simState.eaEepromLayout.slots.find((s) => s.blk === blkHex);
      if (slot) {
        slot.state = "VALID";
        slot.data = dev.lastPayload.slice(0, 23);
      }
    }
    dev.jobResult = "MEMIF_JOB_OK";
    dev.activeOp = "NONE";
    // Check if Fee Sector >= 90% triggers Garbage Collection
    if (tIdx === 0 && (Number(ecucConfig.FeeActiveSectorUsagePct) >= 90 || ecucConfig.ForceFeeGarbageCollection)) {
      dev.status = "MEMIF_BUSY_INTERNAL";
      dev.activeOp = "GC";
      dev.gcProgress = 25;
      addTrace("Fee_MainFunction()",
        "Ghi xong " + blkHex + " (JOB_OK), nhưng Sector đầy (" + ecucConfig.FeeActiveSectorUsagePct + "%) → Fee tự động chuyển MEMIF_BUSY_INTERNAL (Garbage Collection)!", "warn");
    } else {
      dev.status = "MEMIF_IDLE";
      addTrace((tIdx === 0 ? "Fee" : "Ea") + "_MainFunction()",
        "Ghi xong " + blkHex + " → MEMIF_JOB_OK" + (!ecucConfig.NvMPollingMode ? " & gọi thẳng NvM_JobEndNotification()!" : "."), "ok");
    }
    if (!ecucConfig.NvMPollingMode) {
      simState.nvmState.lastNotification = "NvM_JobEndNotification() [JOB_OK]";
      const cbkArr = tIdx === 0 ? "arr_fee_nvm_cbk" : "arr_ea_nvm_cbk";
      setArrowFlow([cbkArr], { [cbkArr]: "active-cbk" });
    }
  } else if (isInval) {
    if (tIdx === 0) updateFeeVirtualPagesOnInvalidate(blkHex);
    else {
      const slot = simState.eaEepromLayout.slots.find((s) => s.blk === blkHex);
      if (slot) slot.state = "INVALID";
    }
    dev.status = "MEMIF_IDLE";
    dev.jobResult = "MEMIF_JOB_OK";
    dev.activeOp = "NONE";
    if (!ecucConfig.NvMPollingMode) {
      simState.nvmState.lastNotification = "NvM_JobEndNotification() [INVALIDATED OK]";
      const cbkArr = tIdx === 0 ? "arr_fee_nvm_cbk" : "arr_ea_nvm_cbk";
      setArrowFlow([cbkArr], { [cbkArr]: "active-cbk" });
    }
    addTrace((tIdx === 0 ? "Fee" : "Ea") + "_MainFunction()",
      "Đã ghi Header INVALID cho Block " + blkHex + " → MEMIF_JOB_OK.", "ok");
  } else if (isEraseImm) {
    dev.status = "MEMIF_IDLE";
    dev.jobResult = "MEMIF_JOB_OK";
    dev.activeOp = "NONE";
    if (!ecucConfig.NvMPollingMode) {
      simState.nvmState.lastNotification = "NvM_JobEndNotification() [ERASE IMM OK]";
      const cbkArr = tIdx === 0 ? "arr_fee_nvm_cbk" : "arr_ea_nvm_cbk";
      setArrowFlow([cbkArr], { [cbkArr]: "active-cbk" });
    }
    addTrace("Fee_MainFunction()", "Vùng dự trữ Immediate Block " + blkHex + " đã xóa trắng sẵn sàng → MEMIF_JOB_OK.", "ok");
  }

  simState.broadcastStatus = computeBroadcastStatus();
}

function api_FeeFls_MainFunction() {
  snapshotRegBefore();
  syncInitFlagsToDevices();
  simState.clockMs += 5;
  const d0 = simState.devices[0];
  if (d0.status === "MEMIF_UNINIT") {
    addTrace("Fee_MainFunction()", "Fee chưa khởi tạo (MEMIF_UNINIT).", "warn");
    return;
  }

  const stepBytes = ecucConfig.ActiveMemIfMode === "MEMIF_MODE_FAST"
    ? Number(ecucConfig.FlsEepBytesPerCycleFast)
    : Number(ecucConfig.FlsEepBytesPerCycleSlow);

  if (d0.status === "MEMIF_BUSY") {
    d0.bytesDone = Math.min(d0.bytesTotal, d0.bytesDone + stepBytes);
    const lowApi = ecucConfig.EnableR2311MemAccLayer ? "MemAcc/Mem_MainFunction" : "Fls_MainFunction";
    if (d0.bytesDone >= d0.bytesTotal) {
      finalizeDeviceJob(0);
    } else {
      setArrowFlow(["arr_fee_fls"], { arr_fee_fls: "active" });
      addTrace("Fee_MainFunction() + " + lowApi + "()",
        "Đang xử lý " + d0.activeOp + " " + d0.activeBlockHex + ": " + d0.bytesDone + "/" + d0.bytesTotal + " bytes (" + ecucConfig.ActiveMemIfMode + ").", "info");
    }
  } else if (d0.status === "MEMIF_BUSY_INTERNAL") {
    d0.gcProgress = Math.min(100, d0.gcProgress + 50);
    if (d0.gcProgress >= 100) {
      // Complete Garbage Collection (Sector Switch)
      const layout = simState.feeFlashLayout;
      layout.activeSector = layout.activeSector === 0 ? 1 : 0;
      layout.pages = layout.pages.filter((p) => p.state === "VALID" || p.state === "IMMEDIATE");
      while (layout.pages.length < 6) {
        layout.pages.push({ vp: "VP#Free", blk: "FREE", state: "FREE", note: "Erased 0xFF" });
      }
      ecucConfig.FeeActiveSectorUsagePct = 35;
      ecucConfig.ForceFeeGarbageCollection = false;
      layout.sector0UsagePct = layout.activeSector === 0 ? 35 : 0;
      layout.sector1UsagePct = layout.activeSector === 1 ? 35 : 0;
      d0.status = "MEMIF_IDLE";
      d0.activeOp = "NONE";
      d0.gcProgress = 0;
      addTrace("Fee_MainFunction() [Garbage Collection Done]",
        "Sector Switch hoàn tất sang Sector " + layout.activeSector + "! Đã dọn sạch trang Superseded & Fls_Erase() Sector cũ → MEMIF_IDLE.", "ok");
    } else {
      setArrowFlow(["arr_fee_fls"], { arr_fee_fls: "active" });
      addTrace("Fee_MainFunction() [GC Progress " + d0.gcProgress + "%]",
        "Đang copy các Virtual Page hợp lệ sang Sector dự phòng (MEMIF_BUSY_INTERNAL)...", "warn");
    }
  } else {
    addTrace("Fee_MainFunction()", "Fee đang rảnh (MEMIF_IDLE).", "info");
  }
  simState.broadcastStatus = computeBroadcastStatus();
}

function api_EaEep_MainFunction() {
  snapshotRegBefore();
  syncInitFlagsToDevices();
  simState.clockMs += 5;
  const d1 = simState.devices[1];
  if (d1.status === "MEMIF_UNINIT") {
    addTrace("Ea_MainFunction()", "Ea chưa khởi tạo (MEMIF_UNINIT).", "warn");
    return;
  }
  const stepBytes = ecucConfig.ActiveMemIfMode === "MEMIF_MODE_FAST"
    ? Number(ecucConfig.FlsEepBytesPerCycleFast)
    : Number(ecucConfig.FlsEepBytesPerCycleSlow);

  if (d1.status === "MEMIF_BUSY") {
    d1.bytesDone = Math.min(d1.bytesTotal, d1.bytesDone + stepBytes);
    const lowApi = ecucConfig.EnableR2311MemAccLayer ? "MemAcc/Mem_MainFunction" : "Eep_MainFunction + Spi";
    if (d1.bytesDone >= d1.bytesTotal) {
      finalizeDeviceJob(1);
    } else {
      setArrowFlow(["arr_ea_eep"], { arr_ea_eep: "active" });
      addTrace("Ea_MainFunction() + " + lowApi + "()",
        "Truyền SPI EEPROM " + d1.activeOp + " " + d1.activeBlockHex + ": " + d1.bytesDone + "/" + d1.bytesTotal + " bytes.", "info");
    }
  } else {
    addTrace("Ea_MainFunction()", "Ea đang rảnh (MEMIF_IDLE).", "info");
  }
  simState.broadcastStatus = computeBroadcastStatus();
}

function api_NvM_MainFunction() {
  snapshotRegBefore();
  syncInitFlagsToDevices();
  simState.clockMs += 5;

  const devIdx = simState.selectedDeviceCard === 1 ? 1 : 0;
  if (ecucConfig.NvMPollingMode) {
    const st = api_MemIf_GetStatus(devIdx);
    if (st === "MEMIF_IDLE") {
      const jr = api_MemIf_GetJobResult(devIdx);
      simState.nvmState.lastNotification = "Polling Result: " + jr;
      if (jr === "MEMIF_BLOCK_INCONSISTENT" && ecucConfig.NvMBlockManagementType === "NVM_BLOCK_REDUNDANT") {
        api_RedundantBlockRecovery();
      }
    } else {
      addTrace("NvM_MainFunction() [Polling]", "NvM thăm dò MemIf_GetStatus(" + devIdx + ") = " + st + " (chờ hoàn tất).", "info");
    }
  } else {
    addTrace("NvM_MainFunction() [Callback Mode]",
      "Callback gần nhất: " + simState.nvmState.lastNotification + " (Không cần poll MemIf).", "info");
  }
  simState.broadcastStatus = computeBroadcastStatus();
}

function api_TriggerFeeGarbageCollection() {
  snapshotRegBefore();
  syncInitFlagsToDevices();
  ecucConfig.FeeActiveSectorUsagePct = 95;
  ecucConfig.ForceFeeGarbageCollection = true;
  const d0 = simState.devices[0];
  if (d0.status !== "MEMIF_UNINIT") {
    d0.status = "MEMIF_BUSY_INTERNAL";
    d0.activeOp = "GC";
    d0.gcProgress = 25;
  }
  simState.selectedDeviceCard = 0;
  simState.broadcastStatus = computeBroadcastStatus();
  setArrowFlow(["arr_fee_fls"], { arr_fee_fls: "active" });
  addTrace("Fee Garbage Collection Started",
    "Sector 0 đạt 95% → Fee chuyển sang MEMIF_BUSY_INTERNAL (0x03) để sao chép trang VALID & xóa Sector cũ!", "warn");
}

function api_RedundantBlockRecovery() {
  snapshotRegBefore();
  ecucConfig.NvMBlockManagementType = "NVM_BLOCK_REDUNDANT";
  ecucConfig.InjectBlockInconsistent = false;
  simState.nvmState.redundantRecoveryCount += 1;
  addTrace("NvM Redundant Recovery",
    "Copy 1 (0x0008) bị INCONSISTENT → NvM tự động gọi MemIf_Read(0, 0x0009, ...) đọc Copy 2 dự phòng!", "warn");
  api_MemIf_Read(0, "0x0009", 0, 16, false);
}

function api_ResetMemoryStackToIdle() {
  ecucConfig = Object.assign(ecucConfig, {
    FeeDev0Initialized: true,
    EaDev1Initialized: true,
    PassNullPointerTest: false,
    InjectBlockInconsistent: false,
    InjectBlockInvalid: false,
    InjectHardwareWriteEraseFail: false,
    ForceFeeGarbageCollection: false,
    FeeActiveSectorUsagePct: 75
  });
  simState = createInitialSimState();
  addTrace("Memory Stack Reset", "Đã khởi tạo lại Fee_Init(), Ea_Init(), MemIf và NvM về trạng thái MEMIF_IDLE.", "ok");
}

// -------------------- EXPORT GENERATORS (ARXML, MEMIF_CFG.H, MEMIF_CFG.C) --------------------

function generateMemIfArxml() {
  const numDev = Number(ecucConfig.MemIfNumberOfDevices);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<AUTOSAR xmlns="http://autosar.org/schema/r4.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">',
    '  <AR-PACKAGES>',
    '    <AR-PACKAGE>',
    '      <SHORT-NAME>MemIf_Config</SHORT-NAME>',
    '      <ELEMENTS>',
    '        <ECUC-MODULE-CONFIGURATION-VALUES>',
    '          <SHORT-NAME>MemIf</SHORT-NAME>',
    '          <DEFINITION-REF DEST="ECUC-MODULE-DEF">/AUTOSAR/EcucDefs/MemIf</DEFINITION-REF>',
    '          <CONTAINERS>',
    '            <ECUC-CONTAINER-VALUE>',
    '              <SHORT-NAME>MemIfGeneral</SHORT-NAME>',
    '              <PARAMETER-VALUES>',
    '                <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-INTEGER-PARAM-DEF">/AUTOSAR/EcucDefs/MemIf/MemIfGeneral/MemIfNumberOfDevices</DEFINITION-REF><VALUE>' + numDev + '</VALUE></ECUC-NUMERICAL-PARAM-VALUE>',
    '                <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-BOOLEAN-PARAM-DEF">/AUTOSAR/EcucDefs/MemIf/MemIfGeneral/MemIfDevErrorDetect</DEFINITION-REF><VALUE>' + (ecucConfig.MemIfDevErrorDetect ? 1 : 0) + '</VALUE></ECUC-NUMERICAL-PARAM-VALUE>',
    '                <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-BOOLEAN-PARAM-DEF">/AUTOSAR/EcucDefs/MemIf/MemIfGeneral/MemIfVersionInfoApi</DEFINITION-REF><VALUE>' + (ecucConfig.MemIfVersionInfoApi ? 1 : 0) + '</VALUE></ECUC-NUMERICAL-PARAM-VALUE>',
    '              </PARAMETER-VALUES>',
    '            </ECUC-CONTAINER-VALUE>',
    '          </CONTAINERS>',
    '        </ECUC-MODULE-CONFIGURATION-VALUES>',
    '      </ELEMENTS>',
    '    </AR-PACKAGE>',
    '  </AR-PACKAGES>',
    '</AUTOSAR>'
  ].join("\n");
}

function generateMemIfCfgH() {
  const numDev = Number(ecucConfig.MemIfNumberOfDevices);
  const lines = [
    '#ifndef MEMIF_CFG_H',
    '#define MEMIF_CFG_H',
    '',
    '/* Generated by AUTOSAR R23-11 MemIf Interactive Simulator */',
    '#define MEMIF_MODULE_ID                   (22U)',
    '#define MEMIF_VENDOR_ID                   (43U)',
    '#define MEMIF_NUMBER_OF_DEVICES           (' + numDev + 'U)',
    '#define MEMIF_DEV_ERROR_DETECT            (' + (ecucConfig.MemIfDevErrorDetect ? 'STD_ON' : 'STD_OFF') + ')',
    '#define MEMIF_VERSION_INFO_API            (' + (ecucConfig.MemIfVersionInfoApi ? 'STD_ON' : 'STD_OFF') + ')',
    '#define MEMIF_BROADCAST_ID                (0xFFU)',
    ''
  ];
  if (numDev <= 1) {
    lines.push(
      '/* SWS_MemIf_00019: Direct Macro Expansion Mode (Zero CPU Overhead) */',
      '#include "Fee.h"',
      '#define MemIf_Read(DeviceIndex, BlockNumber, BlockOffset, DataBufferPtr, Length) \\',
      '        Fee_Read((BlockNumber), (BlockOffset), (DataBufferPtr), (Length))',
      '#define MemIf_Write(DeviceIndex, BlockNumber, DataBufferPtr) \\',
      '        Fee_Write((BlockNumber), (DataBufferPtr))',
      '#define MemIf_Cancel(DeviceIndex)              Fee_Cancel()',
      '#define MemIf_GetStatus(DeviceIndex)           Fee_GetStatus()',
      '#define MemIf_GetJobResult(DeviceIndex)        Fee_GetJobResult()',
      '#define MemIf_InvalidateBlock(DeviceIndex, BlockNumber) \\',
      '        Fee_InvalidateBlock((BlockNumber))',
      '#define MemIf_EraseImmediateBlock(DeviceIndex, BlockNumber) \\',
      '        Fee_EraseImmediateBlock((BlockNumber))',
      '#define MemIf_SetMode(Mode)                    Fee_SetMode((Mode))'
    );
  } else {
    lines.push(
      '/* SWS_MemIf_00020: Multi-Device Function Pointer Array Mode */',
      '#include "Fee.h"',
      '#include "Ea.h"',
      '/* Functions declared in MemIf.h and dispatched via MemIf_Cfg.c tables */'
    );
  }
  lines.push('', '#endif /* MEMIF_CFG_H */');
  return lines.join("\n");
}

function generateMemIfCfgC() {
  const numDev = Number(ecucConfig.MemIfNumberOfDevices);
  if (numDev <= 1) {
    return [
      '/* MemIf_Cfg.c */',
      '/* MemIfNumberOfDevices == 1: All APIs mapped directly via Pre-compile Macros in MemIf_Cfg.h */',
      '/* No Function Pointer Tables generated (0 bytes ROM overhead). */'
    ].join("\n");
  }
  return [
    '#include "MemIf.h"',
    '#include "Fee.h"',
    '#include "Ea.h"',
    '',
    '/* Constant Function Pointer Dispatch Tables (SWS_MemIf_00020) */',
    'const MemIf_ReadFctPtrType MemIf_ReadFctPtr[MEMIF_NUMBER_OF_DEVICES] = {',
    '    &Fee_Read,  /* DeviceIndex = 0 */',
    '    &Ea_Read    /* DeviceIndex = 1 */',
    '};',
    '',
    'const MemIf_WriteFctPtrType MemIf_WriteFctPtr[MEMIF_NUMBER_OF_DEVICES] = {',
    '    &Fee_Write, /* DeviceIndex = 0 */',
    '    &Ea_Write   /* DeviceIndex = 1 */',
    '};',
    '',
    'const MemIf_CancelFctPtrType MemIf_CancelFctPtr[MEMIF_NUMBER_OF_DEVICES] = {',
    '    &Fee_Cancel,',
    '    &Ea_Cancel',
    '};',
    '',
    'const MemIf_GetStatusFctPtrType MemIf_GetStatusFctPtr[MEMIF_NUMBER_OF_DEVICES] = {',
    '    &Fee_GetStatus,',
    '    &Ea_GetStatus',
    '};',
    '',
    'const MemIf_GetJobResultFctPtrType MemIf_GetJobResultFctPtr[MEMIF_NUMBER_OF_DEVICES] = {',
    '    &Fee_GetJobResult,',
    '    &Ea_GetJobResult',
    '};',
    '',
    'const MemIf_InvalidateFctPtrType MemIf_InvalidateBlockFctPtr[MEMIF_NUMBER_OF_DEVICES] = {',
    '    &Fee_InvalidateBlock,',
    '    &Ea_InvalidateBlock',
    '};',
    '',
    'const MemIf_EraseImmFctPtrType MemIf_EraseImmediateBlockFctPtr[MEMIF_NUMBER_OF_DEVICES] = {',
    '    &Fee_EraseImmediateBlock,',
    '    &Ea_EraseImmediateBlock',
    '};',
    '',
    'const MemIf_SetModeFctPtrType MemIf_SetModeFctPtr[MEMIF_NUMBER_OF_DEVICES] = {',
    '    &Fee_SetMode,',
    '    &Ea_SetMode',
    '};'
  ].join("\n");
}
