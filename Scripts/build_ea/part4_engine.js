// ================= PART 4A: EA ADDRESS TRANSLATION, WEAR-LEVELING, STATE MACHINE & DET ENGINE =================

let ecucConfig = JSON.parse(JSON.stringify(defaultConfig));
let simState = {};

function cloneObj(o) {
  return JSON.parse(JSON.stringify(o));
}

function clampInt(v, minV, maxV, fallback) {
  const n = parseInt(v, 10);
  if (isNaN(n)) return fallback;
  return Math.max(minV, Math.min(maxV, n));
}

function parseHexAddr(str) {
  if (typeof str !== "string") return 0;
  const clean = str.trim();
  const n = parseInt(clean, clean.toLowerCase().startsWith("0x") ? 16 : 10);
  return isNaN(n) || n < 0 ? 0 : (n & 0xFFFF);
}

function fmtHex16(v) {
  return "0x" + (v & 0xFFFF).toString(16).toUpperCase().padStart(4, "0");
}

function fmtByte(v) {
  return (v & 0xFF).toString(16).toUpperCase().padStart(2, "0");
}

function parseHexBytes(hexStr, targetLen) {
  const tokens = String(hexStr || "")
    .replace(/0x/gi, "")
    .trim()
    .split(/[\s,;:-]+/)
    .filter(Boolean);
  const out = [];
  for (let i = 0; i < targetLen; i++) {
    if (i < tokens.length) {
      const b = parseInt(tokens[i], 16);
      out.push(isNaN(b) ? (0x10 + i) & 0xFF : (b & 0xFF));
    } else {
      out.push((0x11 + i) & 0xFF);
    }
  }
  return out;
}

function formatBytesHex(arr) {
  return (arr || []).map((b) => fmtByte(b)).join(" ");
}

function getEepChunkSize() {
  const parts = String(ecucConfig.EepChunkSizeMode || "8_32").split("_");
  const slow = clampInt(parts[0], 1, 64, 8);
  const fast = clampInt(parts[1], 4, 128, 32);
  return simState.memIfMode === "MEMIF_MODE_FAST" ? fast : slow;
}

function getSelectedEntry() {
  const layouts = simState.blockLayouts || [];
  return layouts.find((b) => b.id === simState.selectedEntryId) || layouts[0];
}

function getEntryByBlockNumber(blkNo) {
  const layouts = simState.blockLayouts || [];
  return layouts.find((b) => b.blockNumber === Number(blkNo)) || null;
}

function evalSlotStatus(entry, slot) {
  if (!entry || !slot) return "INCONSISTENT";
  const h0 = slot.hdrBytes[0];
  const h1 = slot.hdrBytes[1];
  const f0 = slot.ftrBytes[0];
  const f1 = slot.ftrBytes[1];
  if (h0 === 0x00 && h1 === 0x00) return "INVALID";
  if (h0 === 0xFF && h1 === 0xFF && f0 === 0xFF && f1 === 0xFF) {
    return entry.immediate ? "PRE_ERASED" : "ERASED";
  }
  if (h0 === 0xA5 && f0 === 0x5A && h1 === f1) return "VALID";
  if (
    simState.activeJob &&
    simState.activeJob.entryId === entry.id &&
    simState.activeJob.targetSlotIdx === slot.slotIdx &&
    h0 === 0xA5
  ) {
    return "WRITING";
  }
  return "INCONSISTENT";
}

function findLatestValidSlotIdx(entry, slots) {
  if (!slots || !slots.length) return 0;
  let bestIdx = -1;
  let bestCnt = -1;
  for (let i = 0; i < slots.length; i++) {
    const st = evalSlotStatus(entry, slots[i]);
    if (st === "VALID") {
      const cnt = slots[i].hdrBytes[1];
      if (bestIdx === -1) {
        bestIdx = i;
        bestCnt = cnt;
      } else {
        // Wrap-around safe 8-bit counter comparison (1..254)
        const diff = (cnt - bestCnt + 254) % 254;
        if (diff > 0 && diff < 127) {
          bestIdx = i;
          bestCnt = cnt;
        }
      }
    }
  }
  if (bestIdx >= 0) return bestIdx;
  // Fallback if none valid: prefer INCONSISTENT or INVALID over ERASED, else 0
  const nonErased = slots.findIndex((s) => evalSlotStatus(entry, s) !== "ERASED");
  return nonErased >= 0 ? nonErased : 0;
}

function recomputeMemoryLayout(preserveExisting) {
  const baseAddr = parseHexAddr(ecucConfig.EepBaseAddress);
  const vp = Math.max(1, clampInt(ecucConfig.EaVirtualPageSize, 1, 64, 8));
  const blkOvr = clampInt(ecucConfig.EaBlockOverhead, 4, 8, 4);
  const pgOvr = clampInt(ecucConfig.EaPageOverhead, 0, 4, 0);
  const effPagePayload = Math.max(1, vp - Math.min(vp - 1, pgOvr));
  const allowedCycles = Math.max(1000, clampInt(ecucConfig.EepAllowedWriteCycles, 1000, 1000000, 100000));

  const blk1No = clampInt(ecucConfig.Blk1_BlockNumber, 0, 65535, 1);
  const blk1Sz = clampInt(ecucConfig.Blk1_BlockSize, 2, 32, 12);
  const blk2Base = clampInt(ecucConfig.Blk2_BaseBlockNumber, 0, 65535, 2);
  const blk2Sz = clampInt(ecucConfig.Blk2_BlockSize, 2, 24, 8);
  const blk3No = clampInt(ecucConfig.Blk3_BlockNumber, 0, 65535, 4);
  const blk3Sz = clampInt(ecucConfig.Blk3_BlockSize, 2, 16, 4);
  const blk3Cycles = clampInt(ecucConfig.Blk3_NumberOfWriteCycles, 1000, 2000000, 400000);
  const blk4No = clampInt(ecucConfig.Blk4_BlockNumber, 0, 65535, 5);
  const blk4Sz = clampInt(ecucConfig.Blk4_BlockSize, 2, 24, 10);

  const specs = [
    { id: "BLK1", name: "Blk_Calibration", blockNumber: blk1No, size: blk1Sz, immediate: !!ecucConfig.Blk1_ImmediateData, writeCycles: 100000, isDataset: false, datasetIdx: null },
    { id: "BLK2_0", name: "Blk_Dataset[0]", blockNumber: blk2Base, size: blk2Sz, immediate: false, writeCycles: 100000, isDataset: true, datasetIdx: 0 },
    { id: "BLK2_1", name: "Blk_Dataset[1]", blockNumber: (blk2Base + 1) & 0xFFFF, size: blk2Sz, immediate: false, writeCycles: 100000, isDataset: true, datasetIdx: 1 },
    { id: "BLK3", name: "Blk_Odometer_Wear", blockNumber: blk3No, size: blk3Sz, immediate: false, writeCycles: blk3Cycles, isDataset: false, datasetIdx: null },
    { id: "BLK4", name: "Blk_Crash_ImmData", blockNumber: blk4No, size: blk4Sz, immediate: !!ecucConfig.Blk4_ImmediateData, writeCycles: 100000, isDataset: false, datasetIdx: null }
  ];

  let cursor = baseAddr;
  const layouts = [];
  if (!simState.eepromSlots) simState.eepromSlots = {};
  if (!simState.activeSlotByEntry) simState.activeSlotByEntry = {};

  specs.forEach((sp) => {
    const rawSize = sp.size + blkOvr;
    const pagesPerSlot = Math.max(1, Math.ceil(rawSize / effPagePayload));
    const slotSize = pagesPerSlot * vp;
    const paddingBytes = Math.max(0, slotSize - rawSize);
    const numSlots = Math.max(1, Math.min(8, Math.ceil(sp.writeCycles / allowedCycles)));
    const totalPhysBytes = slotSize * numSlots;
    const physStart = cursor;
    const physEnd = cursor + totalPhysBytes - 1;
    cursor += totalPhysBytes;

    const entry = {
      id: sp.id,
      name: sp.name,
      blockNumber: sp.blockNumber,
      size: sp.size,
      overhead: blkOvr,
      rawSize,
      pagesPerSlot,
      slotSize,
      paddingBytes,
      numSlots,
      writeCycles: sp.writeCycles,
      immediate: sp.immediate,
      isDataset: sp.isDataset,
      datasetIdx: sp.datasetIdx,
      physStart,
      physEnd
    };
    layouts.push(entry);

    const existing = preserveExisting ? (simState.eepromSlots[sp.id] || []) : [];
    const newSlots = [];
    for (let s = 0; s < numSlots; s++) {
      if (s < existing.length) {
        const old = existing[s];
        const resizedData = [];
        for (let b = 0; b < sp.size; b++) {
          resizedData.push(b < old.dataBytes.length ? old.dataBytes[b] : 0xFF);
        }
        newSlots.push({
          slotIdx: s,
          physStart: physStart + s * slotSize,
          hdrBytes: old.hdrBytes.slice(0, 2),
          dataBytes: resizedData,
          ftrBytes: old.ftrBytes.slice(0, 2),
          counter: old.counter
        });
      } else {
        newSlots.push({
          slotIdx: s,
          physStart: physStart + s * slotSize,
          hdrBytes: [0xFF, 0xFF],
          dataBytes: new Array(sp.size).fill(0xFF),
          ftrBytes: [0xFF, 0xFF],
          counter: 0
        });
      }
    }
    simState.eepromSlots[sp.id] = newSlots;
    const curIdx = simState.activeSlotByEntry[sp.id] || 0;
    simState.activeSlotByEntry[sp.id] = Math.min(curIdx, numSlots - 1);
  });

  simState.blockLayouts = layouts;
}

function seedDefaultEepromContents() {
  const b1 = simState.blockLayouts.find((x) => x.id === "BLK1");
  const b2a = simState.blockLayouts.find((x) => x.id === "BLK2_0");
  const b2b = simState.blockLayouts.find((x) => x.id === "BLK2_1");
  const b3 = simState.blockLayouts.find((x) => x.id === "BLK3");
  const b4 = simState.blockLayouts.find((x) => x.id === "BLK4");

  if (b1 && simState.eepromSlots.BLK1[0]) {
    const seed1 = [0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE, 0xF0, 0x11, 0x22, 0x33, 0x44];
    simState.eepromSlots.BLK1[0].hdrBytes = [0xA5, 0x01];
    simState.eepromSlots.BLK1[0].dataBytes = Array.from({ length: b1.size }, (_, i) => seed1[i % seed1.length]);
    simState.eepromSlots.BLK1[0].ftrBytes = [0x5A, 0x01];
    simState.eepromSlots.BLK1[0].counter = 1;
    simState.activeSlotByEntry.BLK1 = 0;
  }
  if (b2a && simState.eepromSlots.BLK2_0[0]) {
    const seed2 = [0xAA, 0xBB, 0xCC, 0xDD, 0x55, 0x66, 0x77, 0x88];
    simState.eepromSlots.BLK2_0[0].hdrBytes = [0xA5, 0x01];
    simState.eepromSlots.BLK2_0[0].dataBytes = Array.from({ length: b2a.size }, (_, i) => seed2[i % seed2.length]);
    simState.eepromSlots.BLK2_0[0].ftrBytes = [0x5A, 0x01];
    simState.eepromSlots.BLK2_0[0].counter = 1;
    simState.activeSlotByEntry.BLK2_0 = 0;
  }
  if (b2b && simState.eepromSlots.BLK2_1[0]) {
    const seed2b = [0xAA, 0xBB, 0xCC, 0xDD, 0x55, 0x66, 0x77, 0x88];
    simState.eepromSlots.BLK2_1[0].hdrBytes = [0x00, 0x00];
    simState.eepromSlots.BLK2_1[0].dataBytes = Array.from({ length: b2b.size }, (_, i) => seed2b[i % seed2b.length]);
    simState.eepromSlots.BLK2_1[0].ftrBytes = [0x00, 0x00];
    simState.eepromSlots.BLK2_1[0].counter = 0;
    simState.activeSlotByEntry.BLK2_1 = 0;
  }
  if (b3) {
    const odoSeeds = [
      [0x00, 0x05, 0x43, 0x1F],
      [0x00, 0x05, 0x43, 0x20],
      [0x00, 0x05, 0x43, 0x21]
    ];
    for (let s = 0; s < b3.numSlots; s++) {
      const sl = simState.eepromSlots.BLK3[s];
      if (s < 3) {
        const cnt = s + 1;
        sl.hdrBytes = [0xA5, cnt];
        sl.dataBytes = Array.from({ length: b3.size }, (_, i) => odoSeeds[s][i % 4]);
        sl.ftrBytes = [0x5A, cnt];
        sl.counter = cnt;
      } else {
        sl.hdrBytes = [0xFF, 0xFF];
        sl.dataBytes = new Array(b3.size).fill(0xFF);
        sl.ftrBytes = [0xFF, 0xFF];
        sl.counter = 0;
      }
    }
    simState.activeSlotByEntry.BLK3 = Math.min(2, b3.numSlots - 1);
  }
  if (b4 && simState.eepromSlots.BLK4[0]) {
    simState.eepromSlots.BLK4[0].hdrBytes = [0xFF, 0xFF];
    simState.eepromSlots.BLK4[0].dataBytes = new Array(b4.size).fill(0xFF);
    simState.eepromSlots.BLK4[0].ftrBytes = [0xFF, 0xFF];
    simState.eepromSlots.BLK4[0].counter = 0;
    simState.activeSlotByEntry.BLK4 = 0;
  }
}

function addTrace(api, detail, level) {
  simState.traceLogs.unshift({ t: simState.clockMs, api, detail, level: level || "info" });
  if (simState.traceLogs.length > 65) simState.traceLogs.length = 65;
}

function pushDetError(serviceId, errCode, detail, isRuntime) {
  if (!isRuntime && !ecucConfig.EaDevErrorDetect) return;
  const apiName = isRuntime ? "Det_ReportRuntimeError" : "Det_ReportError";
  simState.detFaults.unshift({ t: simState.clockMs, code: errCode, serviceId, isRuntime: !!isRuntime, detail });
  if (simState.detFaults.length > 25) simState.detFaults.length = 25;
  simState.lastErrorOrCancelFlag = true;
  simState.activeArrows = ["arr_ea_det"];
  addTrace(apiName + "(40, 0, " + serviceId + ", " + errCode + ")", detail, "err");
}

function pushDemError(eventId, detail) {
  simState.demHwFaults.unshift({ t: simState.clockMs, eventId, detail });
  if (simState.demHwFaults.length > 20) simState.demHwFaults.length = 20;
  simState.activeArrows = ["arr_eep_dem", "arr_eep_ea_cbk"];
  addTrace("Dem_SetEventStatus(" + eventId + ", DEM_EVENT_STATUS_FAILED)", detail, "err");
}

function updateDerivedRegisters() {
  simState.prevRegAByte = simState.regAByte;
  simState.prevRegBByte = simState.regBByte;

  // Register A: Ea_ModuleJobStatusByte
  let a = 0;
  if (simState.initialized) a |= 0x80;
  if (simState.moduleStatus === "MEMIF_BUSY") a |= 0x40;
  if (simState.moduleStatus === "MEMIF_BUSY_INTERNAL") a |= 0x20;
  if (simState.jobResult === "MEMIF_JOB_PENDING") a |= 0x10;
  if (simState.jobResult === "MEMIF_JOB_OK") a |= 0x08;
  if (simState.activeJob && simState.activeJob.eepSubActive) a |= 0x04;
  if (simState.memIfMode === "MEMIF_MODE_FAST") a |= 0x02;
  if (ecucConfig.EaPollingMode) a |= 0x01;
  simState.regAByte = a;

  // Register B: Ea_BlockHeaderControlByte
  const targetId = simState.activeJob ? simState.activeJob.entryId : simState.selectedEntryId;
  const entry = (simState.blockLayouts || []).find((x) => x.id === targetId) || (simState.blockLayouts || [])[0];
  let b = 0;
  if (entry) {
    const slots = simState.eepromSlots[entry.id] || [];
    const sIdx = simState.activeJob ? simState.activeJob.targetSlotIdx : (simState.activeSlotByEntry[entry.id] || 0);
    const slot = slots[sIdx] || slots[0];
    const st = evalSlotStatus(entry, slot);
    if (slot && slot.hdrBytes[0] === 0xA5) b |= 0x80;
    if (slot && slot.hdrBytes[0] === 0xA5 && slot.ftrBytes[0] === 0x5A && slot.hdrBytes[1] === slot.ftrBytes[1]) b |= 0x40;
    if (st === "INCONSISTENT" || st === "ERASED" || simState.jobResult === "MEMIF_BLOCK_INCONSISTENT") b |= 0x20;
    if (st === "INVALID" || simState.jobResult === "MEMIF_BLOCK_INVALID") b |= 0x10;
    if (entry.immediate) b |= 0x08;
    if (entry.immediate && st === "PRE_ERASED") b |= 0x04;
    if (entry.numSlots > 1) b |= 0x02;
    simState.blkIntegState =
      st === "VALID" ? "BLK_VALID_CONSISTENT" :
      st === "WRITING" ? "BLK_WRITING_IN_PROGRESS" :
      st === "INVALID" ? "BLK_INVALIDATED" :
      st === "PRE_ERASED" ? "BLK_IMM_PRE_ERASED" :
      st === "ERASED" ? "BLK_VIRGIN_ERASED" : "BLK_CORRUPTED_INCONSISTENT";
  }
  if (simState.lastErrorOrCancelFlag || simState.jobResult === "MEMIF_JOB_FAILED" || simState.jobResult === "MEMIF_JOB_CANCELED") {
    b |= 0x01;
  }
  simState.regBByte = b;
}

function resetEaToInit(opts) {
  const o = opts || {};
  ecucConfig = Object.assign(cloneObj(defaultConfig), o.cfgOverrides || {});
  simState = {
    clockMs: 0,
    initialized: !!ecucConfig.EaInitialized,
    moduleStatus: ecucConfig.EaInitialized ? "MEMIF_IDLE" : "MEMIF_UNINIT",
    jobResult: "MEMIF_JOB_OK",
    memIfMode: ecucConfig.CurrentMemIfMode || "MEMIF_MODE_SLOW",
    selectedEntryId: o.selectedEntryId || "BLK1",
    blockLayouts: [],
    eepromSlots: {},
    activeSlotByEntry: { BLK1: 0, BLK2_0: 0, BLK2_1: 0, BLK3: 2, BLK4: 0 },
    activeJob: null,
    blkIntegState: "BLK_VALID_CONSISTENT",
    ramBufferHex: "12 34 56 78 9A BC DE F0 11 22 33 44",
    regAByte: 0x88,
    prevRegAByte: 0x88,
    regBByte: 0xC0,
    prevRegBByte: 0xC0,
    activeModId: "MOD_EA",
    activeArrows: [],
    detFaults: [],
    demHwFaults: [],
    traceLogs: [],
    lastErrorOrCancelFlag: false,
    versionInfoRead: null,
    stepExplain: o.stepExplain || "Hệ thống sau Ea_Init(NULL_PTR): Ea đang ở MEMIF_IDLE, 4 Logical Blocks đã được ánh xạ theo EaVirtualPageSize = " + ecucConfig.EaVirtualPageSize + "B."
  };
  recomputeMemoryLayout(false);
  seedDefaultEepromContents();
  updateDerivedRegisters();
  addTrace("Ea_Init(NULL_PTR) [SWS_Ea_00084]", "Khởi tạo Ea & ánh xạ 4 Logical Blocks (" + (simState.initialized ? "MEMIF_IDLE" : "MEMIF_UNINIT") + ").", "ok");
}

// -------------------- AUTOSAR EA STANDARD APIS --------------------

function api_Ea_Init(validCfg) {
  const ok = validCfg !== false;
  if (!ok) {
    ecucConfig.EaInitialized = false;
    simState.initialized = false;
    simState.moduleStatus = "MEMIF_UNINIT";
    pushDetError("0x00 (Ea_Init)", "EA_E_INIT_FAILED (0x09)", "Ea_Init() thất bại do cấu hình không hợp lệ hoặc phần cứng Eep chưa sẵn sàng.", false);
    updateDerivedRegisters();
    return false;
  }
  ecucConfig.EaInitialized = true;
  simState.initialized = true;
  simState.moduleStatus = "MEMIF_BUSY_INTERNAL";
  simState.jobResult = "MEMIF_JOB_OK";
  simState.activeJob = null;
  simState.lastErrorOrCancelFlag = false;
  recomputeMemoryLayout(true);
  // Scan Wear-Leveling slots during Init
  simState.blockLayouts.forEach((entry) => {
    if (entry.numSlots > 1) {
      simState.activeSlotByEntry[entry.id] = findLatestValidSlotIdx(entry, simState.eepromSlots[entry.id]);
    }
  });
  simState.activeArrows = ["arr_ecum_ea"];
  addTrace("Ea_Init(NULL_PTR) [0x00 · SWS_Ea_00084]", "Chuyển MEMIF_UNINIT → MEMIF_BUSY_INTERNAL: quét lại bảng Slot Wear-Leveling & ánh xạ địa chỉ vật lý.", "ok");
  // Complete internal init synchronously or keep BUSY_INTERNAL until tick if requested
  simState.moduleStatus = "MEMIF_IDLE";
  simState.stepExplain = "EcuM gọi Ea_Init(NULL_PTR) hoàn tất: Ea quét bảng Slot Wear-Leveling và sẵn sàng tại MEMIF_IDLE.";
  updateDerivedRegisters();
  return true;
}

function api_Ea_SetMode(mode) {
  if (!simState.initialized) {
    pushDetError("0x01 (Ea_SetMode)", "EA_E_UNINIT (0x01)", "Gọi Ea_SetMode() khi Ea chưa được khởi tạo!", false);
    updateDerivedRegisters();
    return false;
  }
  if (!ecucConfig.EaSetModeSupported) {
    addTrace("Ea_SetMode(" + mode + ") [DISABLED]", "Bị vô hiệu hóa vì EaSetModeSupported = FALSE (SWS_Ea_00085).", "warn");
    simState.stepExplain = "EaSetModeSupported = FALSE: API Ea_SetMode() không được biên dịch/kích hoạt.";
    updateDerivedRegisters();
    return false;
  }
  if (simState.moduleStatus === "MEMIF_BUSY" || simState.moduleStatus === "MEMIF_BUSY_INTERNAL") {
    pushDetError("0x01 (Ea_SetMode)", "EA_E_BUSY (0x06)", "Từ chối Ea_SetMode() vì Ea đang bận xử lý Job (" + simState.moduleStatus + ").", true);
    updateDerivedRegisters();
    return false;
  }
  simState.memIfMode = mode;
  ecucConfig.CurrentMemIfMode = mode;
  simState.lastErrorOrCancelFlag = false;
  simState.activeArrows = ["arr_ecum_nvm", "arr_nvm_memif", "arr_memif_ea", "arr_ea_eep"];
  addTrace("Ea_SetMode(" + mode + ") [0x01 · SWS_Ea_00085]", "Chuyển tiếp xuống Eep_SetMode(" + mode + ") -> Chunk = " + getEepChunkSize() + " bytes/tick.", "ok");
  simState.stepExplain = "Ea_SetMode(" + mode + ") cập nhật tốc độ Eep Driver thành " + getEepChunkSize() + " bytes/tick.";
  updateDerivedRegisters();
  return true;
}

function api_Ea_GetVersionInfo(isNullPtr) {
  if (!ecucConfig.EaVersionInfoApi) {
    addTrace("Ea_GetVersionInfo() [DISABLED]", "EaVersionInfoApi = FALSE nên API không được kích hoạt.", "warn");
    return null;
  }
  if (isNullPtr || ecucConfig.TestInvalidParamMode === "NULL_PTR") {
    pushDetError("0x08 (Ea_GetVersionInfo)", "EA_E_INVALID_DATA_PTR (0x04)", "Truyền NULL_PTR vào Ea_GetVersionInfo(VersionInfoPtr).", false);
    updateDerivedRegisters();
    return null;
  }
  const info = { vendorID: 42, moduleID: 40, sw_major_version: 23, sw_minor_version: 11, sw_patch_version: 0 };
  simState.versionInfoRead = info;
  simState.lastErrorOrCancelFlag = false;
  addTrace("Ea_GetVersionInfo(&VerInfo) [0x08 · SWS_Ea_00092]", "Trả về ModuleId=40 (0x0028), AUTOSAR R23-11 (23.11.0).", "ok");
  simState.stepExplain = "Ea_GetVersionInfo() trả về ModuleId=40, phiên bản AUTOSAR Classic R23.11.0.";
  updateDerivedRegisters();
  return info;
}

function checkPreconditionsAndEntry(serviceId, blockNumber, opts) {
  const o = opts || {};
  if (!simState.initialized) {
    pushDetError(serviceId, "EA_E_UNINIT (0x01)", "Gọi " + serviceId + " khi Ea đang ở trạng thái MEMIF_UNINIT!", false);
    updateDerivedRegisters();
    return null;
  }
  const testMode = ecucConfig.TestInvalidParamMode;
  const actualBlkNo = testMode === "INVALID_BLOCK_NO" ? 0xFFFF : blockNumber;
  const entry = getEntryByBlockNumber(actualBlkNo);
  if (!entry || actualBlkNo === 0 || actualBlkNo === 0xFFFF) {
    pushDetError(serviceId, "EA_E_INVALID_BLOCK_NO (0x02)", "BlockNumber = " + fmtHex16(actualBlkNo) + " không hợp lệ hoặc không tồn tại trong EaBlockConfiguration.", false);
    updateDerivedRegisters();
    return null;
  }
  if (o.requireImmediate && !entry.immediate) {
    pushDetError(serviceId, "EA_E_INVALID_BLOCK_NO (0x02)", "Block #" + entry.blockNumber + " (" + entry.name + ") có EaImmediateData=FALSE nên bị cấm gọi Ea_EraseImmediateBlock (SWS_Ea_00066)!", false);
    updateDerivedRegisters();
    return null;
  }
  if (o.checkDataPtr) {
    if (o.isNullPtr || testMode === "NULL_PTR") {
      pushDetError(serviceId, "EA_E_INVALID_DATA_PTR (0x04)", "Con trỏ DataBufferPtr == NULL_PTR truyền vào " + serviceId + "!", false);
      updateDerivedRegisters();
      return null;
    }
  }
  if (o.checkOffsetLen) {
    const ofs = testMode === "INVALID_OFFSET" ? entry.size : (o.offset || 0);
    const len = testMode === "INVALID_LEN" ? (entry.size + 4) : (o.length || 0);
    if (ofs < 0 || ofs >= entry.size) {
      pushDetError(serviceId, "EA_E_INVALID_BLOCK_OFS (0x03)", "BlockOffset=" + ofs + " vượt quá giới hạn EaBlockSize=" + entry.size + "!", false);
      updateDerivedRegisters();
      return null;
    }
    if (len <= 0 || ofs + len > entry.size) {
      pushDetError(serviceId, "EA_E_INVALID_BLOCK_LEN (0x05)", "Length=" + len + " (Offset+Len=" + (ofs + len) + ") không hợp lệ với EaBlockSize=" + entry.size + "!", false);
      updateDerivedRegisters();
      return null;
    }
  }
  if (simState.moduleStatus === "MEMIF_BUSY" || simState.moduleStatus === "MEMIF_BUSY_INTERNAL") {
    pushDetError(serviceId, "EA_E_BUSY (0x06)", "Runtime Error: Ea đang MEMIF_BUSY xử lý Job khác, từ chối lệnh mới (SWS_Ea_00049).", true);
    updateDerivedRegisters();
    return null;
  }
  return entry;
}

function api_Ea_Write(blockNumber, hexPayloadStr, isNullPtr) {
  const entry = checkPreconditionsAndEntry("0x03 (Ea_Write)", blockNumber, { checkDataPtr: true, isNullPtr: !!isNullPtr });
  if (!entry) return false;

  simState.selectedEntryId = entry.id;
  const slots = simState.eepromSlots[entry.id];
  let curIdx = simState.activeSlotByEntry[entry.id] || 0;
  let targetSlotIdx = curIdx;
  let nextCounter = (slots[curIdx].counter || 0) + 1;

  if (entry.numSlots > 1) {
    // Rotate to next wear-leveling slot
    const latestValid = findLatestValidSlotIdx(entry, slots);
    const latestSt = evalSlotStatus(entry, slots[latestValid]);
    if (latestSt === "VALID") {
      targetSlotIdx = (latestValid + 1) % entry.numSlots;
      nextCounter = slots[latestValid].hdrBytes[1] + 1;
    } else {
      targetSlotIdx = (curIdx + 1) % entry.numSlots;
      nextCounter = (slots[curIdx].counter || 0) + 1;
    }
  }
  if (nextCounter <= 0 || nextCounter >= 255) nextCounter = 1;

  const targetSlot = slots[targetSlotIdx];
  const curSt = evalSlotStatus(entry, targetSlot);
  if (entry.immediate && ecucConfig.StrictImmediateEraseCheck && curSt !== "PRE_ERASED") {
    addTrace("Ea_Write(" + entry.blockNumber + ") [WARNING: NOT PRE-ERASED]", "StrictImmediateEraseCheck=TRUE: Khối khẩn cấp " + entry.name + " chưa gọi Ea_EraseImmediateBlock() trước khi ghi!", "warn");
  }

  const payload = parseHexBytes(hexPayloadStr, entry.size);
  simState.ramBufferHex = formatBytesHex(payload);
  simState.moduleStatus = "MEMIF_BUSY";
  simState.jobResult = "MEMIF_JOB_PENDING";
  simState.lastErrorOrCancelFlag = false;
  simState.activeJob = {
    type: "WRITE",
    entryId: entry.id,
    blockNumber: entry.blockNumber,
    offset: 0,
    length: entry.size,
    payload: payload,
    targetSlotIdx: targetSlotIdx,
    slotPhysAddr: targetSlot.physStart,
    subPhase: "QUEUED_WRITE",
    eepSubActive: false,
    bytesDone: 0,
    bytesTotal: entry.size + 4,
    newCounter: nextCounter,
    chunkRemaining: 0
  };
  simState.activeArrows = ["arr_swc_rte", "arr_rte_nvm", "arr_nvm_memif", "arr_memif_ea"];
  addTrace(
    "Ea_Write(Blk=" + entry.blockNumber + ", Data=[" + formatBytesHex(payload.slice(0, 4)) + "...]) [0x03 · SWS_Ea_00087]",
    "Tiếp nhận bất đồng bộ (MEMIF_BUSY / JOB_PENDING) → Target Slot #" + targetSlotIdx + " @ " + fmtHex16(targetSlot.physStart) + " (Cnt=0x" + fmtByte(nextCounter) + ").",
    "info"
  );
  simState.stepExplain = "Ea_Write(" + entry.blockNumber + ") được chấp nhận! Ea chuyển MEMIF_BUSY và chuẩn bị ghi tuần tự 3 bước tại Slot #" + targetSlotIdx + " (" + fmtHex16(targetSlot.physStart) + ").";
  updateDerivedRegisters();
  return true;
}

function api_Ea_Read(blockNumber, blockOffset, length, isNullPtr) {
  const entry = checkPreconditionsAndEntry("0x02 (Ea_Read)", blockNumber, {
    checkDataPtr: true,
    isNullPtr: !!isNullPtr,
    checkOffsetLen: true,
    offset: blockOffset,
    length: length
  });
  if (!entry) return false;

  simState.selectedEntryId = entry.id;
  const slots = simState.eepromSlots[entry.id];
  const readSlotIdx = entry.numSlots > 1
    ? findLatestValidSlotIdx(entry, slots)
    : (simState.activeSlotByEntry[entry.id] || 0);
  simState.activeSlotByEntry[entry.id] = readSlotIdx;
  const targetSlot = slots[readSlotIdx];

  simState.moduleStatus = "MEMIF_BUSY";
  simState.jobResult = "MEMIF_JOB_PENDING";
  simState.lastErrorOrCancelFlag = false;
  simState.activeJob = {
    type: "READ",
    entryId: entry.id,
    blockNumber: entry.blockNumber,
    offset: blockOffset,
    length: length,
    payload: [],
    targetSlotIdx: readSlotIdx,
    slotPhysAddr: targetSlot.physStart,
    subPhase: "QUEUED_READ",
    eepSubActive: false,
    bytesDone: 0,
    bytesTotal: length + 4,
    newCounter: targetSlot.counter,
    chunkRemaining: 0
  };
  simState.activeArrows = ["arr_swc_rte", "arr_rte_nvm", "arr_nvm_memif", "arr_memif_ea"];
  addTrace(
    "Ea_Read(Blk=" + entry.blockNumber + ", Ofs=" + blockOffset + ", Len=" + length + ") [0x02 · SWS_Ea_00086]",
    "Tiếp nhận bất đồng bộ → Sẽ kiểm tra Header/Footer tại " + fmtHex16(targetSlot.physStart) + " trước khi đọc tại " + fmtHex16(targetSlot.physStart + 2 + blockOffset) + ".",
    "info"
  );
  simState.stepExplain = "Ea_Read(Blk=" + entry.blockNumber + ", Ofs=" + blockOffset + ", Len=" + length + ") chuyển MEMIF_BUSY; bước tiếp theo Ea_MainFunction() sẽ đọc Header & Footer để kiểm tra tính toàn vẹn.";
  updateDerivedRegisters();
  return true;
}

function api_Ea_InvalidateBlock(blockNumber) {
  const entry = checkPreconditionsAndEntry("0x07 (Ea_InvalidateBlock)", blockNumber, {});
  if (!entry) return false;

  simState.selectedEntryId = entry.id;
  const slots = simState.eepromSlots[entry.id];
  const targetSlotIdx = entry.numSlots > 1
    ? findLatestValidSlotIdx(entry, slots)
    : (simState.activeSlotByEntry[entry.id] || 0);
  const targetSlot = slots[targetSlotIdx];

  simState.moduleStatus = "MEMIF_BUSY";
  simState.jobResult = "MEMIF_JOB_PENDING";
  simState.lastErrorOrCancelFlag = false;
  simState.activeJob = {
    type: "INVALIDATE",
    entryId: entry.id,
    blockNumber: entry.blockNumber,
    offset: 0,
    length: 2,
    payload: [0x00, 0x00],
    targetSlotIdx: targetSlotIdx,
    slotPhysAddr: targetSlot.physStart,
    subPhase: "QUEUED_INVALIDATE",
    eepSubActive: false,
    bytesDone: 0,
    bytesTotal: 2,
    newCounter: 0,
    chunkRemaining: 0
  };
  simState.activeArrows = ["arr_nvm_memif", "arr_memif_ea"];
  addTrace(
    "Ea_InvalidateBlock(Blk=" + entry.blockNumber + ") [0x07 · SWS_Ea_00091]",
    "Đặt lệnh ghi INVALID_MARKER (0x0000) vào Header của " + entry.name + " @ " + fmtHex16(targetSlot.physStart) + ".",
    "warn"
  );
  simState.stepExplain = "Ea_InvalidateBlock(" + entry.blockNumber + ") đang chờ Ea_MainFunction() ghi dấu 0x0000 vô hiệu hóa khối.";
  updateDerivedRegisters();
  return true;
}

function api_Ea_EraseImmediateBlock(blockNumber) {
  const entry = checkPreconditionsAndEntry("0x09 (Ea_EraseImmediateBlock)", blockNumber, { requireImmediate: true });
  if (!entry) return false;

  simState.selectedEntryId = entry.id;
  const targetSlotIdx = simState.activeSlotByEntry[entry.id] || 0;
  const targetSlot = simState.eepromSlots[entry.id][targetSlotIdx];

  simState.moduleStatus = "MEMIF_BUSY";
  simState.jobResult = "MEMIF_JOB_PENDING";
  simState.lastErrorOrCancelFlag = false;
  simState.activeJob = {
    type: "ERASE_IMMEDIATE",
    entryId: entry.id,
    blockNumber: entry.blockNumber,
    offset: 0,
    length: entry.slotSize,
    payload: [],
    targetSlotIdx: targetSlotIdx,
    slotPhysAddr: targetSlot.physStart,
    subPhase: "QUEUED_ERASE",
    eepSubActive: false,
    bytesDone: 0,
    bytesTotal: entry.slotSize,
    newCounter: 0,
    chunkRemaining: 0
  };
  simState.activeArrows = ["arr_nvm_memif", "arr_memif_ea"];
  addTrace(
    "Ea_EraseImmediateBlock(Blk=" + entry.blockNumber + ") [0x09 · SWS_Ea_00093]",
    "Xóa sẵn " + entry.slotSize + "B vùng EEPROM @ " + fmtHex16(targetSlot.physStart) + " về 0xFF để ghi khẩn cấp tức thì.",
    "info"
  );
  simState.stepExplain = "Ea_EraseImmediateBlock(" + entry.blockNumber + ") được chấp nhận (EaImmediateData=TRUE), sẵn sàng gọi Eep_Erase().";
  updateDerivedRegisters();
  return true;
}

function api_Ea_Cancel() {
  if (!simState.initialized) {
    pushDetError("0x04 (Ea_Cancel)", "EA_E_UNINIT (0x01)", "Gọi Ea_Cancel() khi Ea chưa khởi tạo!", false);
    updateDerivedRegisters();
    return false;
  }
  if (simState.moduleStatus !== "MEMIF_BUSY") {
    pushDetError("0x04 (Ea_Cancel)", "EA_E_INVALID_CANCEL (0x08)", "Runtime Error: Gọi Ea_Cancel() khi Ea đang ở trạng thái " + simState.moduleStatus + " (SWS_Ea_00078).", true);
    updateDerivedRegisters();
    return false;
  }
  const job = simState.activeJob;
  simState.activeJob = null;
  simState.moduleStatus = "MEMIF_IDLE";
  simState.jobResult = "MEMIF_JOB_CANCELED";
  simState.lastErrorOrCancelFlag = true;
  simState.activeArrows = ["arr_nvm_memif", "arr_memif_ea", "arr_ea_eep", "arr_ea_nvm_cbk"];
  addTrace(
    "Ea_Cancel() [0x04 · SWS_Ea_00088] → Eep_Cancel()",
    "Hủy ngay Job " + (job ? job.type + " Blk#" + job.blockNumber : "") + " → Status=MEMIF_IDLE, JobResult=MEMIF_JOB_CANCELED.",
    "warn"
  );
  if (ecucConfig.EaNvmJobErrorNotificationEnabled) {
    addTrace(ecucConfig.EaNvmJobErrorNotification + "() [SWS_Ea_00056]", "Báo về NvM công việc đã bị hủy (MEMIF_JOB_CANCELED).", "warn");
  }
  simState.stepExplain = "Ea_Cancel() đã gọi Eep_Cancel(), đưa Ea về MEMIF_IDLE với kết quả MEMIF_JOB_CANCELED (dữ liệu ghi dở không có Footer 0x5A sẽ mang trạng thái INCONSISTENT).";
  updateDerivedRegisters();
  return true;
}

function finishEaJob(result, notifyDetail) {
  const job = simState.activeJob;
  simState.activeJob = null;
  simState.moduleStatus = "MEMIF_IDLE";
  simState.jobResult = result;
  const isOk = result === "MEMIF_JOB_OK";
  simState.lastErrorOrCancelFlag = !isOk && (result === "MEMIF_JOB_FAILED" || result === "MEMIF_JOB_CANCELED");
  simState.activeArrows = isOk ? ["arr_eep_ea_cbk", "arr_ea_nvm_cbk", "arr_rte_nvm", "arr_swc_rte"] : ["arr_ea_nvm_cbk"];
  if (isOk) {
    if (ecucConfig.EaNvmJobEndNotificationEnabled) {
      addTrace(ecucConfig.EaNvmJobEndNotification + "() [SWS_Ea_00054]", notifyDetail + " → JobResult = MEMIF_JOB_OK.", "ok");
    }
  } else {
    if (ecucConfig.EaNvmJobErrorNotificationEnabled) {
      addTrace(ecucConfig.EaNvmJobErrorNotification + "() [SWS_Ea_00056]", notifyDetail + " → JobResult = " + result + ".", result === "MEMIF_JOB_FAILED" ? "err" : "warn");
    }
  }
  if (job) {
    simState.stepExplain = "Hoàn tất " + job.type + " (Block #" + job.blockNumber + "): " + result + " — " + notifyDetail;
  }
}

function stepClockTick(customPeriod) {
  const res = _stepClockTickCore(customPeriod);
  if (typeof renderAll === "function" && !window.__suppressEngineRender) renderAll();
  return res;
}

function _stepClockTickCore(customPeriod) {
  const period = Number(customPeriod) || clampInt(ecucConfig.EaMainFunctionPeriod, 1, 50, 5);
  simState.clockMs += period;

  if (!simState.initialized) {
    addTrace("Ea_MainFunction() [t=" + simState.clockMs + "ms]", "Bỏ qua do Ea đang MEMIF_UNINIT.", "warn");
    updateDerivedRegisters();
    return;
  }

  if (simState.moduleStatus === "MEMIF_BUSY_INTERNAL") {
    simState.moduleStatus = "MEMIF_IDLE";
    simState.jobResult = "MEMIF_JOB_OK";
    addTrace("Ea_MainFunction() [SWS_Ea_00097]", "Hoàn tất khởi tạo nội bộ → MEMIF_IDLE.", "ok");
    updateDerivedRegisters();
    return;
  }

  const job = simState.activeJob;
  if (!job) {
    addTrace("Ea_MainFunction() [t=" + simState.clockMs + "ms]", "MEMIF_IDLE (không có Job bất đồng bộ đang chạy).", "info");
    updateDerivedRegisters();
    return;
  }

  const entry = (simState.blockLayouts || []).find((x) => x.id === job.entryId);
  const slot = entry ? simState.eepromSlots[entry.id][job.targetSlotIdx] : null;
  if (!entry || !slot) {
    finishEaJob("MEMIF_JOB_FAILED", "Không tìm thấy cấu hình Slot.");
    updateDerivedRegisters();
    return;
  }

  // 1. If Eep Sub-Job is currently active, Eep_MainFunction() processes it first
  if (job.eepSubActive) {
    if (ecucConfig.InjectEepHardwareError) {
      job.eepSubActive = false;
      const demEvt = job.type === "READ" ? "EEP_E_READ_FAILED" : (job.type === "ERASE_IMMEDIATE" ? "EEP_E_ERASE_FAILED" : "EEP_E_WRITE_FAILED");
      pushDemError(demEvt, "Lỗi phần cứng EEPROM vật lý trong Eep_MainFunction()!");
      if (ecucConfig.EaPollingMode) {
        addTrace("Ea_MainFunction() → Eep_GetJobResult() == MEMIF_JOB_FAILED", "Phát hiện lỗi Eep qua chế độ Polling Mode.", "err");
      } else {
        addTrace("Ea_JobErrorNotification() [0x11 · SWS_Ea_00096]", "Eep Driver báo lỗi phần cứng ngược lên Ea.", "err");
      }
      finishEaJob("MEMIF_JOB_FAILED", "Lỗi phần cứng từ Eep Driver (" + demEvt + ").");
      updateDerivedRegisters();
      return;
    }

    // Power-loss mid-write injection check
    if (job.type === "WRITE" && job.subPhase === "WRITE_DATA" && ecucConfig.SimulatePowerLossMidWrite) {
      const half = Math.max(1, Math.floor(entry.size / 2));
      for (let i = 0; i < half; i++) slot.dataBytes[i] = job.payload[i];
      slot.ftrBytes = [0xFF, 0xFF]; // Footer never written!
      simState.activeJob = null;
      simState.moduleStatus = "MEMIF_IDLE";
      simState.jobResult = "MEMIF_JOB_FAILED";
      simState.lastErrorOrCancelFlag = true;
      simState.activeArrows = ["arr_eep_hw"];
      addTrace("⚡ POWER-LOSS MID-WRITE @ " + fmtHex16(slot.physStart), "Mất điện đột ngột sau Header 0xA5 + " + half + "B Data — chưa kịp ghi Footer 0x5A!", "err");
      simState.stepExplain = "⚡ SẬP NGUỒN GIỮA LÚC GHI! Header = 0xA5" + fmtByte(job.newCounter) + " đã ghi nhưng Footer vẫn = 0xFFFF. Block #" + entry.blockNumber + " bị hỏng tính toàn vẹn (INCONSISTENT)!";
      updateDerivedRegisters();
      return;
    }

    // Chunked transfer for data payload phase
    const chunk = getEepChunkSize();
    if (job.subPhase === "WRITE_DATA" || job.subPhase === "READ_DATA") {
      const xfer = Math.min(chunk, job.chunkRemaining);
      job.chunkRemaining -= xfer;
      job.bytesDone += xfer;
      if (job.chunkRemaining > 0) {
        simState.activeArrows = ["arr_schm_ea", "arr_ea_eep", "arr_eep_hw"];
        addTrace(
          "Eep_MainFunction() [" + simState.memIfMode.replace("MEMIF_MODE_", "") + ": " + xfer + "B]",
          "Đã truyền " + (entry.size - job.chunkRemaining) + "/" + entry.size + " bytes (còn " + job.chunkRemaining + "B).",
          "info"
        );
        simState.stepExplain = "Eep_MainFunction() truyền tiếp " + xfer + "B (" + simState.memIfMode + "); còn lại " + job.chunkRemaining + "B.";
        updateDerivedRegisters();
        return;
      }
    } else {
      job.bytesDone = Math.min(job.bytesTotal, job.bytesDone + 2);
    }

    // Current Eep Sub-Job finished!
    job.eepSubActive = false;
    if (ecucConfig.EaPollingMode) {
      addTrace("Ea_MainFunction() → Eep_GetJobResult() == MEMIF_JOB_OK [Polling]", "Ea chủ động hỏi vòng Eep thay vì dùng Callback (ECUC_Ea_00039).", "info");
    } else {
      addTrace("Ea_JobEndNotification() [0x10 · SWS_Ea_00095]", "Eep hoàn tất Sub-Job " + job.subPhase + " và gọi callback lên Ea.", "ok");
    }

    // Transition to next sub-phase
    if (job.type === "WRITE") {
      if (job.subPhase === "WRITE_HDR") {
        job.subPhase = "WRITE_DATA";
        job.chunkRemaining = entry.size;
        job.eepSubActive = true;
        simState.activeArrows = ["arr_ea_eep", "arr_eep_hw"];
        addTrace("Eep_Write(" + fmtHex16(slot.physStart + 2) + ", DataPtr, " + entry.size + "B)", "Bước 2/3 Ea_Write: Ghi " + entry.size + " bytes User Data vào EEPROM.", "info");
        simState.stepExplain = "Bước 2/3 Ea_Write: Eep_Write() đang ghi " + entry.size + "B User Payload tại " + fmtHex16(slot.physStart + 2) + " (chưa có Footer 0x5A).";
        updateDerivedRegisters();
        return;
      }
      if (job.subPhase === "WRITE_DATA") {
        for (let i = 0; i < entry.size; i++) slot.dataBytes[i] = job.payload[i];
        job.subPhase = "WRITE_FTR";
        job.eepSubActive = true;
        simState.activeArrows = ["arr_ea_eep", "arr_eep_hw"];
        addTrace("Eep_Write(" + fmtHex16(slot.physStart + 2 + entry.size) + ", [0x5A, 0x" + fmtByte(job.newCounter) + "], 2B)", "Bước 3/3 Ea_Write: Chốt Footer hợp lệ 0x5A để đóng dấu toàn vẹn!", "info");
        simState.stepExplain = "Bước 3/3 Ea_Write: Eep_Write() ghi Valid Footer [0x5A 0x" + fmtByte(job.newCounter) + "] tại " + fmtHex16(slot.physStart + 2 + entry.size) + ".";
        updateDerivedRegisters();
        return;
      }
      if (job.subPhase === "WRITE_FTR") {
        slot.ftrBytes = [0x5A, job.newCounter];
        slot.counter = job.newCounter;
        simState.activeSlotByEntry[entry.id] = job.targetSlotIdx;
        if (ecucConfig.AutoVerifyAfterWrite) {
          job.subPhase = "VERIFY_CMP";
          job.eepSubActive = true;
          simState.activeArrows = ["arr_ea_eep", "arr_eep_hw"];
          addTrace("Eep_Compare(" + fmtHex16(slot.physStart + 2) + ", DataPtr, " + entry.size + "B)", "AutoVerifyAfterWrite=TRUE: Đối chiếu Read-Back từng byte với RAM.", "info");
          simState.stepExplain = "AutoVerifyAfterWrite=TRUE: Đang chạy Eep_Compare() xác thực toàn bộ dữ liệu sau khi ghi xong Footer 0x5A.";
          updateDerivedRegisters();
          return;
        }
        job.bytesDone = job.bytesTotal;
        finishEaJob("MEMIF_JOB_OK", "Đã ghi trọn vẹn Header (0xA5) + Payload (" + entry.size + "B) + Footer (0x5A) tại Slot #" + job.targetSlotIdx + " (" + fmtHex16(slot.physStart) + ").");
        updateDerivedRegisters();
        return;
      }
      if (job.subPhase === "VERIFY_CMP") {
        job.bytesDone = job.bytesTotal;
        finishEaJob("MEMIF_JOB_OK", "Ghi & Eep_Compare() xác thực khớp 100% tại Slot #" + job.targetSlotIdx + ".");
        updateDerivedRegisters();
        return;
      }
    }

    if (job.type === "READ") {
      if (job.subPhase === "READ_HDR_FTR") {
        const st = evalSlotStatus(entry, slot);
        if (st === "INVALID") {
          finishEaJob("MEMIF_BLOCK_INVALID", "Header tại " + fmtHex16(slot.physStart) + " chứa 0x0000 (Đã bị Ea_InvalidateBlock) → SWS_Ea_00075!");
          updateDerivedRegisters();
          return;
        }
        if (st !== "VALID") {
          finishEaJob("MEMIF_BLOCK_INCONSISTENT", "Header=" + fmtByte(slot.hdrBytes[0]) + fmtByte(slot.hdrBytes[1]) + " & Footer=" + fmtByte(slot.ftrBytes[0]) + fmtByte(slot.ftrBytes[1]) + " không hợp lệ/lệch → SWS_Ea_00074!");
          updateDerivedRegisters();
          return;
        }
        job.subPhase = "READ_DATA";
        job.chunkRemaining = job.length;
        job.eepSubActive = true;
        const readAddr = slot.physStart + 2 + job.offset;
        simState.activeArrows = ["arr_ea_eep", "arr_eep_hw"];
        addTrace("Eep_Read(" + fmtHex16(readAddr) + ", DataBufferPtr, " + job.length + "B)", "Header/Footer VALID (0xA5..0x5A) → Đọc " + job.length + "B từ Offset=" + job.offset + ".", "ok");
        simState.stepExplain = "Header & Footer VALID! Ea tính Eep_Address = " + fmtHex16(slot.physStart) + " + 2(Hdr) + " + job.offset + "(Ofs) = " + fmtHex16(readAddr) + " và gọi Eep_Read(" + job.length + "B).";
        updateDerivedRegisters();
        return;
      }
      if (job.subPhase === "READ_DATA") {
        const slice = slot.dataBytes.slice(job.offset, job.offset + job.length);
        simState.ramBufferHex = formatBytesHex(slice);
        job.bytesDone = job.bytesTotal;
        finishEaJob("MEMIF_JOB_OK", "Đọc thành công " + job.length + "B [" + simState.ramBufferHex + "] từ Offset=" + job.offset + " (Slot #" + job.targetSlotIdx + ").");
        updateDerivedRegisters();
        return;
      }
    }

    if (job.type === "INVALIDATE") {
      slot.hdrBytes = [0x00, 0x00];
      slot.ftrBytes = [0x00, 0x00];
      job.bytesDone = job.bytesTotal;
      finishEaJob("MEMIF_JOB_OK", "Đã ghi dấu INVALID_MARKER (0x0000) lên " + entry.name + " @ " + fmtHex16(slot.physStart) + ".");
      updateDerivedRegisters();
      return;
    }

    if (job.type === "ERASE_IMMEDIATE") {
      slot.hdrBytes = [0xFF, 0xFF];
      slot.dataBytes = new Array(entry.size).fill(0xFF);
      slot.ftrBytes = [0xFF, 0xFF];
      slot.counter = 0;
      job.bytesDone = job.bytesTotal;
      finishEaJob("MEMIF_JOB_OK", "Đã xóa sạch " + entry.slotSize + "B (0xFF) cho khối khẩn cấp " + entry.name + " — Sẵn sàng ghi tức thì!");
      updateDerivedRegisters();
      return;
    }
  }

  // 2. Dispatch first Eep Sub-Job when Job was just queued
  if (job.subPhase === "QUEUED_WRITE") {
    job.subPhase = "WRITE_HDR";
    job.eepSubActive = true;
    slot.hdrBytes = [0xA5, job.newCounter];
    slot.ftrBytes = [0xFF, 0xFF];
    simState.activeArrows = ["arr_schm_ea", "arr_ea_eep", "arr_eep_hw"];
    addTrace(
      "Ea_MainFunction() → Eep_Write(" + fmtHex16(slot.physStart) + ", [0xA5, 0x" + fmtByte(job.newCounter) + "], 2B)",
      "Bước 1/3 Ea_Write: Ghi Start Marker 0xA5 + Counter=0x" + fmtByte(job.newCounter) + " (Footer tạm là 0xFF).",
      "info"
    );
    simState.stepExplain = "Bước 1/3 Ea_Write (Ea_MainFunction): Ghi Header Start Marker [0xA5 0x" + fmtByte(job.newCounter) + "] tại " + fmtHex16(slot.physStart) + ".";
  } else if (job.subPhase === "QUEUED_READ") {
    job.subPhase = "READ_HDR_FTR";
    job.eepSubActive = true;
    simState.activeArrows = ["arr_schm_ea", "arr_ea_eep", "arr_eep_hw"];
    addTrace(
      "Ea_MainFunction() → Eep_Read(" + fmtHex16(slot.physStart) + ", HdrFtrBuf, 4B)",
      "Bước 1/2 Ea_Read: Đọc Header (2B) & Footer (2B) kiểm tra tính toàn vẹn trước khi đọc Data.",
      "info"
    );
    simState.stepExplain = "Bước 1/2 Ea_Read (Ea_MainFunction): Gọi Eep_Read() kiểm tra cặp Header/Footer của Block #" + entry.blockNumber + " tại " + fmtHex16(slot.physStart) + ".";
  } else if (job.subPhase === "QUEUED_INVALIDATE") {
    job.subPhase = "INV_WRITE_HDR";
    job.eepSubActive = true;
    simState.activeArrows = ["arr_schm_ea", "arr_ea_eep", "arr_eep_hw"];
    addTrace(
      "Ea_MainFunction() → Eep_Write(" + fmtHex16(slot.physStart) + ", [0x00, 0x00], 2B)",
      "Ghi dấu INVALID_MARKER (0x0000) vào 2 byte Header mà không cần xóa cả vùng dữ liệu.",
      "warn"
    );
    simState.stepExplain = "Ea_MainFunction() gọi Eep_Write(0x0000) vô hiệu hóa Block #" + entry.blockNumber + " tại " + fmtHex16(slot.physStart) + ".";
  } else if (job.subPhase === "QUEUED_ERASE") {
    job.subPhase = "ERASE_BLK";
    job.eepSubActive = true;
    simState.activeArrows = ["arr_schm_ea", "arr_ea_eep", "arr_eep_hw"];
    addTrace(
      "Ea_MainFunction() → Eep_Erase(" + fmtHex16(slot.physStart) + ", " + entry.slotSize + "B)",
      "Xóa sạch trước " + entry.slotSize + " bytes về 0xFF (SWS_Ea_00064).",
      "info"
    );
    simState.stepExplain = "Ea_MainFunction() gọi Eep_Erase(" + fmtHex16(slot.physStart) + ", " + entry.slotSize + "B) dọn sẵn ô nhớ cho khối khẩn cấp.";
  }

  updateDerivedRegisters();
}

function runActiveJobToCompletion(maxTicks) {
  let guard = maxTicks || 12;
  const prevSuppress = window.__suppressEngineRender;
  window.__suppressEngineRender = true;
  try {
    while (simState.activeJob && guard-- > 0) {
      stepClockTick();
    }
  } finally {
    window.__suppressEngineRender = prevSuppress;
  }
  if (typeof renderAll === "function" && !window.__suppressEngineRender) renderAll();
}

function corruptOrToggleSlotByte(entryId, slotIdx, part) {
  const entry = (simState.blockLayouts || []).find((x) => x.id === entryId);
  if (!entry) return;
  const slot = simState.eepromSlots[entryId][slotIdx];
  if (!slot) return;
  simState.selectedEntryId = entryId;
  simState.activeSlotByEntry[entryId] = slotIdx;

  if (part === "ftr") {
    if (slot.ftrBytes[0] === 0x5A) {
      slot.ftrBytes = [0xFF, 0xFF];
      addTrace("Inject Fault @ " + fmtHex16(slot.physStart) + " Slot#" + slotIdx, "Xóa hỏng Footer (0x5A → 0xFF) mô phỏng mất nguồn giữa chừng!", "err");
      simState.stepExplain = "Đã làm hỏng Footer của " + entry.name + " (Slot #" + slotIdx + ") thành 0xFFFF. Hãy bấm Ea_Read để xem Ea phát hiện MEMIF_BLOCK_INCONSISTENT!";
    } else if (slot.hdrBytes[0] === 0xA5) {
      slot.ftrBytes = [0x5A, slot.hdrBytes[1]];
      addTrace("Restore Footer @ " + fmtHex16(slot.physStart) + " Slot#" + slotIdx, "Khôi phục Footer [0x5A, 0x" + fmtByte(slot.hdrBytes[1]) + "].", "ok");
      simState.stepExplain = "Đã khôi phục Footer hợp lệ cho " + entry.name + " (Slot #" + slotIdx + ").";
    }
  } else {
    simState.stepExplain = "Đang chọn " + entry.name + " (BlockNumber=" + entry.blockNumber + ", Slot #" + slotIdx + " @ " + fmtHex16(slot.physStart) + ", Trạng thái=" + evalSlotStatus(entry, slot) + ").";
  }
  updateDerivedRegisters();
  if (typeof renderAll === "function" && !window.__suppressEngineRender) renderAll();
}

function toggleRegisterBit(regType, mask) {
  if (regType === "A") {
    if (mask === 0x80) {
      ecucConfig.EaInitialized = !ecucConfig.EaInitialized;
      simState.initialized = ecucConfig.EaInitialized;
      simState.moduleStatus = simState.initialized ? "MEMIF_IDLE" : "MEMIF_UNINIT";
    } else if (mask === 0x02) {
      api_Ea_SetMode(simState.memIfMode === "MEMIF_MODE_FAST" ? "MEMIF_MODE_SLOW" : "MEMIF_MODE_FAST");
      return;
    } else if (mask === 0x01) {
      ecucConfig.EaPollingMode = !ecucConfig.EaPollingMode;
    } else {
      simState.regAByte ^= mask;
      if (typeof renderAll === "function") renderAll();
      return;
    }
  } else {
    const entry = getSelectedEntry();
    if (mask === 0x08 && entry) {
      if (entry.id === "BLK1") ecucConfig.Blk1_ImmediateData = !ecucConfig.Blk1_ImmediateData;
      if (entry.id === "BLK4") ecucConfig.Blk4_ImmediateData = !ecucConfig.Blk4_ImmediateData;
      recomputeMemoryLayout(true);
    } else if (mask === 0x20 && entry) {
      const sIdx = simState.activeSlotByEntry[entry.id] || 0;
      corruptOrToggleSlotByte(entry.id, sIdx, "ftr");
    } else if (mask === 0x10 && entry) {
      const sIdx = simState.activeSlotByEntry[entry.id] || 0;
      const sl = simState.eepromSlots[entry.id][sIdx];
      sl.hdrBytes = [0x00, 0x00];
      sl.ftrBytes = [0x00, 0x00];
    } else {
      simState.regBByte ^= mask;
      if (typeof renderAll === "function") renderAll();
      return;
    }
  }
  if (typeof syncConfigToDOM === "function") syncConfigToDOM();
  updateDerivedRegisters();
  if (typeof renderAll === "function") renderAll();
}
