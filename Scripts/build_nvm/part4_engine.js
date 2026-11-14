// ================= PART 4A: NVM SIMULATION ENGINE, CRC, QUEUES & AUTOSAR API =================

const defaultConfig = {
  // Tab 0: Common
  NvMInitialized: true,
  NvMApiConfigClass: "NVM_API_CONFIG_CLASS_3",
  NvMDevErrorDetect: true,
  NvMJobPrioritization: true,
  NvMQueueSizes: "8 / 3",
  NvMMainFnAndCrcBytes: "10 / 64",
  // Tab 1: Block & Dataset
  SelectedBlockId: "3",
  NvMBlockManagementType: "NVM_BLOCK_REDUNDANT",
  NvMBlockJobPriority: 2,
  NvMNvBlockLength: 8,
  NvMBlockCounts: "2 / 1",
  CurrentDataIndex: 0,
  // Tab 2: RAM & Explicit Sync
  UsePermanentRamBlock: true,
  NvMBlockUseSyncMechanism: false,
  NvMRepeatMirrorOperations: 3,
  InjectMirrorBusyConflict: false,
  NvMResistantToChangedSw: true,
  NvMBlockUseSetRamBlockStatus: true,
  // Tab 3: CRC & Verification
  NvMBlockUseCrc: true,
  NvMBlockCrcType: "NVM_CRC16",
  NvMBlockUseCrcCompMechanism: true,
  NvMStaticBlockIDCheck: true,
  NvMWriteVerification: true,
  NvMBlockUseAutoValidation: false,
  // Tab 4: Protection, Retry & Fault Injection
  NvMBlockWriteProt: false,
  NvMWriteBlockOnce: false,
  NvMMaxRetries: "3 / 1",
  InjectNvCrcCorruption: false,
  InjectMemIfWriteError: false,
  ProvideRomBlockDefault: true,
  // Tab 5: Multi-Block & Stack
  NvMSelectForReadAndWriteAll: "BOTH_READ_WRITE",
  NvMConfigIdComparison: "0xA55A / 0xA55A",
  NvMDynamicConfiguration: true,
  NvMBswMJobStatusInfo: true,
  NvMDrvModeSwitch: true,
  NvMNvramDeviceId: "0"
};

let ecucConfig = Object.assign({}, defaultConfig);
let simState = null;

// ---------------- HELPERS: PARSERS, CRC-8/16/32 & FORMATTING ----------------
function parsePairNumbers(str, defA, defB, isHex) {
  const parts = String(str || "").split(/[\/,;]+/).map(s => s.trim()).filter(Boolean);
  const parseOne = (val, fallback) => {
    if (val === undefined) return fallback;
    if (isHex) {
      const cleaned = val.replace(/[^0-9a-fA-Fx]/g, "");
      const num = parseInt(cleaned, 16);
      return Number.isFinite(num) ? (num & 0xFFFF) : fallback;
    }
    const num = parseInt(val, 10);
    return Number.isFinite(num) ? num : fallback;
  };
  return [parseOne(parts[0], defA), parseOne(parts[1], defB)];
}

function getQueueLimits() {
  const [stdCap, immCap] = parsePairNumbers(ecucConfig.NvMQueueSizes, 8, 3, false);
  return {
    stdCap: Math.max(1, Math.min(32, stdCap)),
    immCap: Math.max(1, Math.min(16, immCap))
  };
}

function getMainFnAndCrcBudget() {
  const [period, crcBytes] = parsePairNumbers(ecucConfig.NvMMainFnAndCrcBytes, 10, 64, false);
  return {
    periodMs: Math.max(1, Math.min(100, period)),
    crcBytesPerStep: Math.max(1, Math.min(2048, crcBytes))
  };
}

function getMaxRetriesConfig() {
  const [wr, rd] = parsePairNumbers(ecucConfig.NvMMaxRetries, 3, 1, false);
  return {
    maxWriteRetries: Math.max(0, Math.min(7, wr)),
    maxReadRetries: Math.max(0, Math.min(7, rd))
  };
}

function getConfigIdPair() {
  const [compiled, stored] = parsePairNumbers(ecucConfig.NvMConfigIdComparison, 0xA55A, 0xA55A, true);
  return { compiled, stored };
}

function formatHex16(v) {
  return "0x" + ((v >>> 0) & 0xFFFF).toString(16).toUpperCase().padStart(4, "0");
}

function bytesToHex(bytes, maxLen) {
  const arr = (bytes || []).slice(0, maxLen || bytes.length);
  return arr.map(b => (b & 0xFF).toString(16).toUpperCase().padStart(2, "0")).join(" ");
}

function makeFixedLengthBytes(arr, len) {
  const out = [];
  for (let i = 0; i < len; i++) {
    out.push(arr && i < arr.length ? (arr[i] & 0xFF) : ((i * 17 + 0x11) & 0xFF));
  }
  return out;
}

function computeAutosarCrc(bytesArr, crcType, useStaticId, blockId) {
  const buf = [];
  if (useStaticId) {
    buf.push((blockId >>> 8) & 0xFF, blockId & 0xFF);
  }
  for (let i = 0; i < bytesArr.length; i++) {
    buf.push(bytesArr[i] & 0xFF);
  }
  if (crcType === "NVM_CRC8") {
    let crc = 0xFF;
    for (let i = 0; i < buf.length; i++) {
      crc ^= buf[i];
      for (let b = 0; b < 8; b++) {
        crc = (crc & 0x80) ? (((crc << 1) ^ 0x1D) & 0xFF) : ((crc << 1) & 0xFF);
      }
    }
    crc ^= 0xFF;
    return "0x" + crc.toString(16).toUpperCase().padStart(2, "0");
  }
  if (crcType === "NVM_CRC32") {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) {
      crc ^= buf[i];
      for (let b = 0; b < 8; b++) {
        crc = (crc & 1) ? ((crc >>> 1) ^ 0xEDB88320) : (crc >>> 1);
      }
    }
    crc = (crc ^ 0xFFFFFFFF) >>> 0;
    return "0x" + crc.toString(16).toUpperCase().padStart(8, "0");
  }
  // Default NVM_CRC16 (CCITT-FALSE poly 0x1021, init 0xFFFF)
  let crc = 0xFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= (buf[i] << 8);
    for (let b = 0; b < 8; b++) {
      crc = (crc & 0x8000) ? (((crc << 1) ^ 0x1021) & 0xFFFF) : ((crc << 1) & 0xFFFF);
    }
  }
  return "0x" + crc.toString(16).toUpperCase().padStart(4, "0");
}

function makeNvCopy(blockId, dataArr, crcType, useCrc, useStaticId, overrides) {
  const data = (dataArr || []).slice();
  const baseCrc = useCrc ? computeAutosarCrc(data, crcType, useStaticId, blockId) : "N/A";
  return Object.assign({
    present: true,
    data: data,
    storedCrc: baseCrc,
    calcCrc: baseCrc,
    staticIdTag: useStaticId ? blockId : null,
    corruptedCrc: false,
    wrongStaticId: false,
    invalidated: false,
    erased: false,
    writeCount: 1
  }, overrides || {});
}

function recomputeBlockMetadata(blk) {
  if (!blk || blk.id === 0) return;
  if (blk.blockType === "NVM_BLOCK_DATASET" && blk.datasetSlots && blk.datasetSlots.length) {
    blk.datasetSlots.forEach(slot => {
      if (!slot.isRom && !slot.corruptedCrc && !slot.erased && !slot.invalidated) {
        slot.calcCrc = blk.useCrc ? computeAutosarCrc(slot.data, blk.crcType, blk.staticBlockIdCheck, blk.id) : "N/A";
        slot.storedCrc = slot.calcCrc;
      }
    });
  }
  const activeCopy0 = blk.nvCopies && blk.nvCopies[0];
  if (activeCopy0 && activeCopy0.present && !activeCopy0.corruptedCrc && !activeCopy0.erased && !activeCopy0.invalidated) {
    activeCopy0.calcCrc = blk.useCrc ? computeAutosarCrc(activeCopy0.data, blk.crcType, blk.staticBlockIdCheck, blk.id) : "N/A";
  }
  const activeCopy1 = blk.nvCopies && blk.nvCopies[1];
  if (activeCopy1 && activeCopy1.present && !activeCopy1.corruptedCrc && !activeCopy1.erased && !activeCopy1.invalidated) {
    activeCopy1.calcCrc = blk.useCrc ? computeAutosarCrc(activeCopy1.data, blk.crcType, blk.staticBlockIdCheck, blk.id) : "N/A";
  }
  blk.ramCrc = blk.useCrc ? computeAutosarCrc(blk.ramData, blk.crcType, blk.staticBlockIdCheck, blk.id) : "N/A";
}

function createDefaultBlocks() {
  const b0 = {
    id: 0,
    name: "NvM_MultiBlock",
    shortName: "MultiBlock",
    blockType: "NVM_BLOCK_NATIVE",
    jobPriority: 255,
    length: 0,
    nvBlockNum: 0,
    romBlockNum: 0,
    dataIndex: 0,
    usePermanentRam: false,
    useSyncMechanism: false,
    repeatMirrorOps: 0,
    resistantToChangedSw: true,
    useSetRamBlockStatus: false,
    useCrc: false,
    crcType: "NVM_CRC16",
    crcCompMechanism: false,
    staticBlockIdCheck: false,
    writeVerification: false,
    autoValidation: false,
    writeProtected: false,
    writeOnce: false,
    writeOnceLocked: false,
    selectForReadAll: true,
    selectForWriteAll: true,
    provideRomDefault: false,
    deviceId: "0",
    ramValid: true,
    ramChanged: false,
    restoredFromRom: false,
    redundancyLoss: false,
    lastCrcSkipped: false,
    explicitSyncOk: false,
    mirrorBusyRemain: 0,
    lastResult: "NVM_REQ_OK",
    lastMultiOp: "IDLE",
    ramData: [],
    mirrorData: [],
    romData: [],
    ramCrc: "N/A",
    nvCopies: []
  };

  const b1 = {
    id: 1,
    name: "ConfigId_CompiledSw",
    shortName: "ConfigId",
    blockType: "NVM_BLOCK_REDUNDANT",
    jobPriority: 1,
    length: 2,
    nvBlockNum: 2,
    romBlockNum: 1,
    dataIndex: 0,
    usePermanentRam: true,
    useSyncMechanism: false,
    repeatMirrorOps: 0,
    resistantToChangedSw: true,
    useSetRamBlockStatus: true,
    useCrc: true,
    crcType: "NVM_CRC16",
    crcCompMechanism: false,
    staticBlockIdCheck: true,
    writeVerification: true,
    autoValidation: false,
    writeProtected: false,
    writeOnce: false,
    writeOnceLocked: false,
    selectForReadAll: true,
    selectForWriteAll: true,
    provideRomDefault: true,
    deviceId: "0",
    ramValid: true,
    ramChanged: false,
    restoredFromRom: false,
    redundancyLoss: false,
    lastCrcSkipped: false,
    explicitSyncOk: false,
    mirrorBusyRemain: 0,
    lastResult: "NVM_REQ_OK",
    ramData: [0xA5, 0x5A],
    mirrorData: [0xA5, 0x5A],
    romData: [0xA5, 0x5A],
    ramCrc: "0x0000",
    nvCopies: []
  };
  b1.nvCopies = [
    makeNvCopy(1, [0xA5, 0x5A], "NVM_CRC16", true, true),
    makeNvCopy(1, [0xA5, 0x5A], "NVM_CRC16", true, true)
  ];

  const b2 = {
    id: 2,
    name: "Calib_EngineMap",
    shortName: "CalibEngine",
    blockType: "NVM_BLOCK_NATIVE",
    jobPriority: 4,
    length: 8,
    nvBlockNum: 1,
    romBlockNum: 1,
    dataIndex: 0,
    usePermanentRam: true,
    useSyncMechanism: false,
    repeatMirrorOps: 3,
    resistantToChangedSw: true,
    useSetRamBlockStatus: true,
    useCrc: true,
    crcType: "NVM_CRC32",
    crcCompMechanism: true,
    staticBlockIdCheck: true,
    writeVerification: true,
    autoValidation: false,
    writeProtected: false,
    writeOnce: false,
    writeOnceLocked: false,
    selectForReadAll: true,
    selectForWriteAll: true,
    provideRomDefault: true,
    deviceId: "0",
    ramValid: true,
    ramChanged: false,
    restoredFromRom: false,
    redundancyLoss: false,
    lastCrcSkipped: false,
    explicitSyncOk: false,
    mirrorBusyRemain: 0,
    lastResult: "NVM_REQ_OK",
    ramData: [0x14, 0x20, 0x35, 0x48, 0x50, 0x62, 0x7A, 0x80],
    mirrorData: [0x14, 0x20, 0x35, 0x48, 0x50, 0x62, 0x7A, 0x80],
    romData: [0x10, 0x20, 0x30, 0x40, 0x50, 0x60, 0x70, 0x80],
    ramCrc: "0x00000000",
    nvCopies: []
  };
  b2.nvCopies = [
    makeNvCopy(2, [0x14, 0x20, 0x35, 0x48, 0x50, 0x62, 0x7A, 0x80], "NVM_CRC32", true, true),
    makeNvCopy(2, [0x14, 0x20, 0x35, 0x48, 0x50, 0x62, 0x7A, 0x80], "NVM_CRC32", true, true, { present: false })
  ];

  const b3 = {
    id: 3,
    name: "Odometer_Redundant",
    shortName: "Odometer",
    blockType: "NVM_BLOCK_REDUNDANT",
    jobPriority: 2,
    length: 8,
    nvBlockNum: 2,
    romBlockNum: 1,
    dataIndex: 0,
    usePermanentRam: true,
    useSyncMechanism: false,
    repeatMirrorOps: 3,
    resistantToChangedSw: true,
    useSetRamBlockStatus: true,
    useCrc: true,
    crcType: "NVM_CRC16",
    crcCompMechanism: true,
    staticBlockIdCheck: true,
    writeVerification: true,
    autoValidation: false,
    writeProtected: false,
    writeOnce: false,
    writeOnceLocked: false,
    selectForReadAll: true,
    selectForWriteAll: true,
    provideRomDefault: true,
    deviceId: "0",
    ramValid: true,
    ramChanged: false,
    restoredFromRom: false,
    redundancyLoss: false,
    lastCrcSkipped: false,
    explicitSyncOk: false,
    mirrorBusyRemain: 0,
    lastResult: "NVM_REQ_OK",
    ramData: [0x00, 0x01, 0xE2, 0x40, 0x05, 0xA1, 0x00, 0x00],
    mirrorData: [0x00, 0x01, 0xE2, 0x40, 0x05, 0xA1, 0x00, 0x00],
    romData: [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
    ramCrc: "0x0000",
    nvCopies: []
  };
  b3.nvCopies = [
    makeNvCopy(3, [0x00, 0x01, 0xE2, 0x40, 0x05, 0xA1, 0x00, 0x00], "NVM_CRC16", true, true),
    makeNvCopy(3, [0x00, 0x01, 0xE2, 0x40, 0x05, 0xA1, 0x00, 0x00], "NVM_CRC16", true, true)
  ];

  const b4Ds0 = [0x45, 0x55, 0x01, 0x10, 0x20, 0x30]; // EU
  const b4Ds1 = [0x55, 0x53, 0x02, 0x18, 0x28, 0x38]; // US
  const b4Ds2 = [0x4A, 0x50, 0x03, 0x22, 0x32, 0x42]; // JP
  const b4Rom3 = [0xDE, 0xFA, 0x00, 0x01, 0x01, 0x01];
  const b4Rom4 = [0xDE, 0xFB, 0x00, 0x02, 0x02, 0x02];
  const b4 = {
    id: 4,
    name: "Variant_Coding",
    shortName: "VariantDS",
    blockType: "NVM_BLOCK_DATASET",
    jobPriority: 3,
    length: 6,
    nvBlockNum: 3,
    romBlockNum: 2,
    dataIndex: 0,
    usePermanentRam: true,
    useSyncMechanism: false,
    repeatMirrorOps: 2,
    resistantToChangedSw: true,
    useSetRamBlockStatus: true,
    useCrc: true,
    crcType: "NVM_CRC16",
    crcCompMechanism: false,
    staticBlockIdCheck: true,
    writeVerification: false,
    autoValidation: false,
    writeProtected: false,
    writeOnce: false,
    writeOnceLocked: false,
    selectForReadAll: true,
    selectForWriteAll: false,
    provideRomDefault: true,
    deviceId: "1",
    ramValid: true,
    ramChanged: false,
    restoredFromRom: false,
    redundancyLoss: false,
    lastCrcSkipped: false,
    explicitSyncOk: false,
    mirrorBusyRemain: 0,
    lastResult: "NVM_REQ_OK",
    ramData: b4Ds0.slice(),
    mirrorData: b4Ds0.slice(),
    romData: b4Rom3.slice(),
    ramCrc: "0x0000",
    nvCopies: [
      makeNvCopy(4, b4Ds0, "NVM_CRC16", true, true),
      makeNvCopy(4, b4Ds1, "NVM_CRC16", true, true, { present: false })
    ],
    datasetSlots: [
      Object.assign(makeNvCopy(4, b4Ds0, "NVM_CRC16", true, true), { idx: 0, label: "NV Slot #0 (EU_Gasoline)", isRom: false }),
      Object.assign(makeNvCopy(4, b4Ds1, "NVM_CRC16", true, true), { idx: 1, label: "NV Slot #1 (US_Hybrid)", isRom: false }),
      Object.assign(makeNvCopy(4, b4Ds2, "NVM_CRC16", true, true), { idx: 2, label: "NV Slot #2 (JP_EV)", isRom: false }),
      Object.assign(makeNvCopy(4, b4Rom3, "NVM_CRC16", false, false), { idx: 3, label: "ROM Slot #3 (Def_Base)", isRom: true }),
      Object.assign(makeNvCopy(4, b4Rom4, "NVM_CRC16", false, false), { idx: 4, label: "ROM Slot #4 (Def_Safe)", isRom: true })
    ]
  };

  const b5 = {
    id: 5,
    name: "Crash_EventRecord",
    shortName: "CrashImm",
    blockType: "NVM_BLOCK_NATIVE",
    jobPriority: 0,
    length: 8,
    nvBlockNum: 1,
    romBlockNum: 1,
    dataIndex: 0,
    usePermanentRam: true,
    useSyncMechanism: false,
    repeatMirrorOps: 2,
    resistantToChangedSw: true,
    useSetRamBlockStatus: true,
    useCrc: true,
    crcType: "NVM_CRC16",
    crcCompMechanism: false,
    staticBlockIdCheck: true,
    writeVerification: true,
    autoValidation: false,
    writeProtected: false,
    writeOnce: false,
    writeOnceLocked: false,
    selectForReadAll: false,
    selectForWriteAll: true,
    provideRomDefault: true,
    deviceId: "0",
    ramValid: true,
    ramChanged: false,
    restoredFromRom: false,
    redundancyLoss: false,
    lastCrcSkipped: false,
    explicitSyncOk: false,
    mirrorBusyRemain: 0,
    lastResult: "NVM_REQ_OK",
    ramData: [0xC5, 0xA5, 0x01, 0xFF, 0x10, 0x22, 0x00, 0x99],
    mirrorData: [0xC5, 0xA5, 0x01, 0xFF, 0x10, 0x22, 0x00, 0x99],
    romData: [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
    ramCrc: "0x0000",
    nvCopies: []
  };
  b5.nvCopies = [
    makeNvCopy(5, [0xC5, 0xA5, 0x01, 0xFF, 0x10, 0x22, 0x00, 0x99], "NVM_CRC16", true, true),
    makeNvCopy(5, [0xC5, 0xA5, 0x01, 0xFF, 0x10, 0x22, 0x00, 0x99], "NVM_CRC16", true, true, { present: false })
  ];

  const blocks = [b0, b1, b2, b3, b4, b5];
  blocks.forEach(recomputeBlockMetadata);
  return blocks;
}

function createInitialSimState() {
  const blocks = createDefaultBlocks();
  return {
    clockMs: 0,
    selectedBlockId: 3,
    blocks: blocks,
    immediateQueue: [],
    standardQueue: [],
    activeJob: null,
    suspendedJob: null,
    multiBlockQueue: [],
    multiBlockJob: null,
    bswmJobMode: "NVM_REQ_OK",
    jobState: "NVM_IDLE",
    stackState: "STACK_IDLE",
    memIfMode: "MEMIF_MODE_SLOW",
    memIfState: "MEMIF_IDLE",
    feeState: "FEE_IDLE",
    flsState: "FLS_IDLE",
    retryCount: 0,
    immPreemptCount: 0,
    immPreemptFlag: false,
    lastCrcOk: true,
    lastWriteVerifyOk: true,
    errorFlag: false,
    regAByte: 0x80,
    regBByte: 0x88,
    prevRegAByte: 0x80,
    prevRegBByte: 0x88,
    demFaults: [],
    detFaults: [],
    traceLogs: [],
    activeArrows: [],
    lastApiCall: "NvM_Init(NULL_PTR)",
    lastCaller: "EcuM_AL_DriverInitTwo()",
    lastRoutingSummary: "NvM đã sẵn sàng phục vụ hàng đợi Immediate (Prio=0) và Standard (Prio=1..255)."
  };
}

function getSelectedBlock() {
  if (!simState) return null;
  const id = Math.max(0, Math.min(5, Number(simState.selectedBlockId) || 3));
  return simState.blocks[id] || simState.blocks[3];
}

function getBlockById(blockId) {
  if (!simState) return null;
  const id = Number(blockId);
  if (!Number.isInteger(id) || id < 0 || id >= simState.blocks.length) return null;
  return simState.blocks[id];
}

// ---------------- REGISTER DERIVATION & TRACE/ERROR LOGGING ----------------
function updateDerivedRegisters() {
  if (!simState) return;
  simState.prevRegAByte = simState.regAByte;
  simState.prevRegBByte = simState.regBByte;

  const blk = getSelectedBlock();
  let a = 0;
  if (blk) {
    if (blk.ramValid) a |= 0x80;
    if (blk.ramChanged) a |= 0x40;
    if (blk.writeProtected) a |= 0x20;
    if (blk.writeOnceLocked) a |= 0x10;
    if (blk.lastCrcSkipped) a |= 0x08;
    if (blk.redundancyLoss) a |= 0x04;
    if (blk.restoredFromRom) a |= 0x02;
    if (blk.explicitSyncOk) a |= 0x01;
  }

  let b = 0;
  if (ecucConfig.NvMInitialized) b |= 0x80;
  if (simState.multiBlockJob) b |= 0x40;
  if (simState.immPreemptFlag || (simState.activeJob && simState.activeJob.isImmediate && simState.suspendedJob)) b |= 0x20;
  if (simState.memIfState !== "MEMIF_IDLE") b |= 0x10;
  if (simState.lastCrcOk) b |= 0x08;
  if (simState.lastWriteVerifyOk) b |= 0x04;
  if (simState.retryCount > 0) b |= 0x02;
  if (simState.errorFlag || simState.demFaults.length > 0 || simState.detFaults.length > 0) b |= 0x01;

  simState.regAByte = a & 0xFF;
  simState.regBByte = b & 0xFF;
}

function pushTrace(level, src, dst, apiCall, detail) {
  if (!simState) return;
  simState.traceLogs.unshift({
    timeMs: simState.clockMs,
    level: level || "info",
    src: src,
    dst: dst,
    api: apiCall,
    detail: detail
  });
  if (simState.traceLogs.length > 60) simState.traceLogs.length = 60;
}

function reportDetError(apiIdName, errCode, errName, detail) {
  if (!simState) return;
  simState.errorFlag = true;
  if (!ecucConfig.NvMDevErrorDetect) {
    pushTrace("warn", "NvM", "DET (DISABLED)", apiIdName + " -> " + errName, "NvMDevErrorDetect=FALSE: lỗi " + errName + " (" + errCode + ") bị bỏ qua không báo Det_ReportError().");
    updateDerivedRegisters();
    return;
  }
  const entry = {
    timeMs: simState.clockMs,
    moduleId: 20,
    instanceId: 0,
    api: apiIdName,
    code: errCode,
    name: errName,
    detail: detail
  };
  simState.detFaults.unshift(entry);
  if (simState.detFaults.length > 16) simState.detFaults.length = 16;
  simState.activeArrows = ["arr_nvm_det"];
  pushTrace("err", "NvM Core", "DET (Mod 20)", "Det_ReportError(20, 0, " + apiIdName + ", " + errName + ")", errCode + ": " + detail);
  updateDerivedRegisters();
}

function reportDemEvent(eventId, status, detail) {
  if (!simState) return;
  if (status === "DEM_EVENT_STATUS_FAILED") {
    simState.errorFlag = true;
    simState.demFaults.unshift({
      timeMs: simState.clockMs,
      eventId: eventId,
      status: status,
      detail: detail
    });
    if (simState.demFaults.length > 16) simState.demFaults.length = 16;
    if (simState.activeArrows.indexOf("arr_nvm_dem") === -1) simState.activeArrows.push("arr_nvm_dem");
    pushTrace("err", "NvM Core", "DEM", "Dem_SetEventStatus(" + eventId + ", FAILED)", detail);
  } else {
    pushTrace("ok", "NvM Core", "DEM", "Dem_SetEventStatus(" + eventId + ", PASSED)", detail);
  }
  updateDerivedRegisters();
}

function setBswMJobStatus(serviceName, reqResult) {
  if (!simState) return;
  simState.bswmJobMode = reqResult;
  if (ecucConfig.NvMBswMJobStatusInfo) {
    if (simState.activeArrows.indexOf("arr_nvm_bswm") === -1) simState.activeArrows.push("arr_nvm_bswm");
    pushTrace("info", "NvM Core", "BswM", "BswM_NvM_CurrentJobMode(" + serviceName + ", " + reqResult + ")", "Thông báo trạng thái Multi-Block tới BswM để chuyển ECU Mode.");
  }
}

// ---------------- BIDIRECTIONAL SYNC: BLOCK <-> ECUC CONFIG ----------------
function syncBlockToEcuc(blockId) {
  const blk = getBlockById(blockId);
  if (!blk || blk.id === 0) return;
  simState.selectedBlockId = blk.id;
  ecucConfig.SelectedBlockId = String(blk.id);
  ecucConfig.NvMBlockManagementType = blk.blockType;
  ecucConfig.NvMBlockJobPriority = blk.jobPriority;
  ecucConfig.NvMNvBlockLength = blk.length;
  ecucConfig.NvMBlockCounts = blk.nvBlockNum + " / " + blk.romBlockNum;
  ecucConfig.CurrentDataIndex = blk.dataIndex;
  ecucConfig.UsePermanentRamBlock = !!blk.usePermanentRam;
  ecucConfig.NvMBlockUseSyncMechanism = !!blk.useSyncMechanism;
  ecucConfig.NvMRepeatMirrorOperations = blk.repeatMirrorOps;
  ecucConfig.NvMResistantToChangedSw = !!blk.resistantToChangedSw;
  ecucConfig.NvMBlockUseSetRamBlockStatus = !!blk.useSetRamBlockStatus;
  ecucConfig.NvMBlockUseCrc = !!blk.useCrc;
  ecucConfig.NvMBlockCrcType = blk.crcType;
  ecucConfig.NvMBlockUseCrcCompMechanism = !!blk.crcCompMechanism;
  ecucConfig.NvMStaticBlockIDCheck = !!blk.staticBlockIdCheck;
  ecucConfig.NvMWriteVerification = !!blk.writeVerification;
  ecucConfig.NvMBlockUseAutoValidation = !!blk.autoValidation;
  ecucConfig.NvMBlockWriteProt = !!blk.writeProtected;
  ecucConfig.NvMWriteBlockOnce = !!blk.writeOnce;
  ecucConfig.ProvideRomBlockDefault = !!blk.provideRomDefault;
  ecucConfig.NvMNvramDeviceId = blk.deviceId || "0";

  if (blk.selectForReadAll && blk.selectForWriteAll) ecucConfig.NvMSelectForReadAndWriteAll = "BOTH_READ_WRITE";
  else if (blk.selectForReadAll) ecucConfig.NvMSelectForReadAndWriteAll = "READ_ALL_ONLY";
  else if (blk.selectForWriteAll) ecucConfig.NvMSelectForReadAndWriteAll = "WRITE_ALL_ONLY";
  else ecucConfig.NvMSelectForReadAndWriteAll = "NONE";

  const copy0 = getActiveNvCopy(blk, 0);
  ecucConfig.InjectNvCrcCorruption = !!(copy0 && copy0.corruptedCrc);
  updateDerivedRegisters();
}

function getActiveNvCopy(blk, copyIdx) {
  if (!blk) return null;
  if (blk.blockType === "NVM_BLOCK_DATASET" && blk.datasetSlots) {
    const idx = Math.max(0, Math.min(blk.datasetSlots.length - 1, blk.dataIndex));
    return blk.datasetSlots[idx] || null;
  }
  return blk.nvCopies ? blk.nvCopies[copyIdx || 0] : null;
}

function applyEcucToBlock(key) {
  if (!simState) return;
  if (key === "SelectedBlockId") {
    const targetId = Math.max(1, Math.min(5, parseInt(ecucConfig.SelectedBlockId, 10) || 3));
    syncBlockToEcuc(targetId);
    return;
  }

  const blk = getSelectedBlock();
  if (!blk || blk.id === 0) return;

  if (key === "NvMBlockManagementType") {
    blk.blockType = ecucConfig.NvMBlockManagementType;
    if (blk.blockType === "NVM_BLOCK_REDUNDANT") {
      blk.nvBlockNum = 2;
      if (!blk.nvCopies[1]) blk.nvCopies[1] = makeNvCopy(blk.id, blk.nvCopies[0] ? blk.nvCopies[0].data : blk.ramData, blk.crcType, blk.useCrc, blk.staticBlockIdCheck);
      blk.nvCopies[1].present = true;
    } else if (blk.blockType === "NVM_BLOCK_NATIVE") {
      blk.nvBlockNum = 1;
      if (blk.nvCopies[1]) blk.nvCopies[1].present = false;
    } else if (blk.blockType === "NVM_BLOCK_DATASET") {
      const [nvCnt, romCnt] = parsePairNumbers(ecucConfig.NvMBlockCounts, 3, 2, false);
      blk.nvBlockNum = Math.max(1, nvCnt);
      blk.romBlockNum = Math.max(0, romCnt);
      if (!blk.datasetSlots) {
        blk.datasetSlots = [];
        for (let i = 0; i < blk.nvBlockNum; i++) {
          blk.datasetSlots.push(Object.assign(makeNvCopy(blk.id, blk.ramData, blk.crcType, blk.useCrc, blk.staticBlockIdCheck), { idx: i, label: "NV Slot #" + i, isRom: false }));
        }
        for (let r = 0; r < blk.romBlockNum; r++) {
          const ri = blk.nvBlockNum + r;
          blk.datasetSlots.push(Object.assign(makeNvCopy(blk.id, blk.romData, blk.crcType, false, false), { idx: ri, label: "ROM Slot #" + ri, isRom: true }));
        }
      }
    }
    ecucConfig.NvMBlockCounts = blk.nvBlockNum + " / " + blk.romBlockNum;
  }
  else if (key === "NvMBlockJobPriority") blk.jobPriority = Math.max(0, Math.min(255, Number(ecucConfig.NvMBlockJobPriority) || 0));
  else if (key === "NvMNvBlockLength") {
    const newLen = Math.max(1, Math.min(4096, Number(ecucConfig.NvMNvBlockLength) || 8));
    blk.length = newLen;
    blk.ramData = makeFixedLengthBytes(blk.ramData, newLen);
    blk.mirrorData = makeFixedLengthBytes(blk.mirrorData, newLen);
    blk.romData = makeFixedLengthBytes(blk.romData, newLen);
    blk.nvCopies.forEach(c => { if (c) c.data = makeFixedLengthBytes(c.data, newLen); });
    if (blk.datasetSlots) blk.datasetSlots.forEach(s => { s.data = makeFixedLengthBytes(s.data, newLen); });
  }
  else if (key === "NvMBlockCounts") {
    const [nvC, romC] = parsePairNumbers(ecucConfig.NvMBlockCounts, blk.nvBlockNum, blk.romBlockNum, false);
    blk.nvBlockNum = Math.max(1, nvC);
    blk.romBlockNum = Math.max(0, romC);
  }
  else if (key === "CurrentDataIndex") {
    blk.dataIndex = Math.max(0, Math.min(15, Number(ecucConfig.CurrentDataIndex) || 0));
  }
  else if (key === "UsePermanentRamBlock") blk.usePermanentRam = !!ecucConfig.UsePermanentRamBlock;
  else if (key === "NvMBlockUseSyncMechanism") blk.useSyncMechanism = !!ecucConfig.NvMBlockUseSyncMechanism;
  else if (key === "NvMRepeatMirrorOperations") blk.repeatMirrorOps = Math.max(0, Math.min(10, Number(ecucConfig.NvMRepeatMirrorOperations) || 0));
  else if (key === "NvMResistantToChangedSw") blk.resistantToChangedSw = !!ecucConfig.NvMResistantToChangedSw;
  else if (key === "NvMBlockUseSetRamBlockStatus") blk.useSetRamBlockStatus = !!ecucConfig.NvMBlockUseSetRamBlockStatus;
  else if (key === "NvMBlockUseCrc") blk.useCrc = !!ecucConfig.NvMBlockUseCrc;
  else if (key === "NvMBlockCrcType") blk.crcType = ecucConfig.NvMBlockCrcType;
  else if (key === "NvMBlockUseCrcCompMechanism") blk.crcCompMechanism = !!ecucConfig.NvMBlockUseCrcCompMechanism;
  else if (key === "NvMStaticBlockIDCheck") blk.staticBlockIdCheck = !!ecucConfig.NvMStaticBlockIDCheck;
  else if (key === "NvMWriteVerification") blk.writeVerification = !!ecucConfig.NvMWriteVerification;
  else if (key === "NvMBlockUseAutoValidation") blk.autoValidation = !!ecucConfig.NvMBlockUseAutoValidation;
  else if (key === "NvMBlockWriteProt") {
    if (!blk.writeOnceLocked || ecucConfig.NvMBlockWriteProt) {
      blk.writeProtected = !!ecucConfig.NvMBlockWriteProt;
    } else {
      ecucConfig.NvMBlockWriteProt = true;
    }
  }
  else if (key === "NvMWriteBlockOnce") blk.writeOnce = !!ecucConfig.NvMWriteBlockOnce;
  else if (key === "ProvideRomBlockDefault") blk.provideRomDefault = !!ecucConfig.ProvideRomBlockDefault;
  else if (key === "NvMNvramDeviceId") blk.deviceId = ecucConfig.NvMNvramDeviceId;
  else if (key === "NvMSelectForReadAndWriteAll") {
    const v = ecucConfig.NvMSelectForReadAndWriteAll;
    blk.selectForReadAll = (v === "BOTH_READ_WRITE" || v === "READ_ALL_ONLY");
    blk.selectForWriteAll = (v === "BOTH_READ_WRITE" || v === "WRITE_ALL_ONLY");
  }
  else if (key === "InjectNvCrcCorruption") {
    const c0 = getActiveNvCopy(blk, 0);
    if (c0 && !c0.isRom) {
      c0.corruptedCrc = !!ecucConfig.InjectNvCrcCorruption;
      c0.storedCrc = c0.corruptedCrc ? "0xDEAD" : computeAutosarCrc(c0.data, blk.crcType, blk.staticBlockIdCheck, blk.id);
    }
  }

  recomputeBlockMetadata(blk);
  updateDerivedRegisters();
}

function syncConfigToDOM() {
  Object.keys(defaultConfig).forEach(k => {
    const el = document.getElementById("cfg_" + k);
    if (!el) return;
    if (el.type === "checkbox") el.checked = !!ecucConfig[k];
    else el.value = ecucConfig[k];
  });
  const qaSel = document.getElementById("qaBlockSelect");
  if (qaSel && simState) qaSel.value = String(simState.selectedBlockId || 3);
}

function onConfigInputChanged(key) {
  const el = document.getElementById("cfg_" + key);
  if (!el) return;
  if (el.type === "checkbox") ecucConfig[key] = el.checked;
  else if (el.type === "number") ecucConfig[key] = Number(el.value);
  else ecucConfig[key] = el.value;

  applyEcucToBlock(key);

  if (key === "NvMInitialized" && !ecucConfig.NvMInitialized) {
    simState.jobState = "NVM_UNINIT";
    simState.stackState = "STACK_IDLE";
    simState.activeJob = null;
    simState.suspendedJob = null;
    simState.immediateQueue = [];
    simState.standardQueue = [];
  } else if (key === "NvMInitialized" && ecucConfig.NvMInitialized && simState.jobState === "NVM_UNINIT") {
    simState.jobState = "NVM_IDLE";
  }

  pushTrace("info", "ECUC Config", "NvM", "Config Update: " + key + " = " + ecucConfig[key], "Cập nhật cấu hình động ECUC trong trình mô phỏng.");
  syncConfigToDOM();
  updateDerivedRegisters();
  if (typeof renderAll === "function") renderAll();
}

function toggleRegisterBit(regType, mask) {
  if (!simState) return;
  const blk = getSelectedBlock();
  if (!blk || blk.id === 0) return;

  if (regType === "A") {
    if (mask === 0x80) blk.ramValid = !blk.ramValid;
    else if (mask === 0x40) blk.ramChanged = !blk.ramChanged;
    else if (mask === 0x20) {
      if (blk.writeOnceLocked && blk.writeProtected) {
        reportDetError("NvM_SetBlockProtection", "0x15", "NVM_E_BLOCK_LOCKED", "Không thể mở khóa WRITE_PROT khi WR_ONCE_LOCKED=1 (SWS_NvM_00326).");
        if (typeof renderAll === "function") renderAll();
        return;
      }
      blk.writeProtected = !blk.writeProtected;
      ecucConfig.NvMBlockWriteProt = blk.writeProtected;
    }
    else if (mask === 0x10) {
      blk.writeOnceLocked = !blk.writeOnceLocked;
      if (blk.writeOnceLocked) { blk.writeOnce = true; blk.writeProtected = true; ecucConfig.NvMWriteBlockOnce = true; ecucConfig.NvMBlockWriteProt = true; }
    }
    else if (mask === 0x08) blk.lastCrcSkipped = !blk.lastCrcSkipped;
    else if (mask === 0x04) blk.redundancyLoss = !blk.redundancyLoss;
    else if (mask === 0x02) blk.restoredFromRom = !blk.restoredFromRom;
    else if (mask === 0x01) blk.explicitSyncOk = !blk.explicitSyncOk;
    pushTrace("info", "User Interactive", "Thanh A (Block #" + blk.id + ")", "Toggle Bit 0x" + mask.toString(16).toUpperCase(), "Tương tác trực tiếp Administrative Status Byte trên Block #" + blk.id);
  } else {
    if (mask === 0x80) {
      ecucConfig.NvMInitialized = !ecucConfig.NvMInitialized;
      simState.jobState = ecucConfig.NvMInitialized ? "NVM_IDLE" : "NVM_UNINIT";
    } else if (mask === 0x08) simState.lastCrcOk = !simState.lastCrcOk;
    else if (mask === 0x04) simState.lastWriteVerifyOk = !simState.lastWriteVerifyOk;
    else if (mask === 0x01) {
      simState.errorFlag = !simState.errorFlag;
      if (!simState.errorFlag) { simState.demFaults = []; simState.detFaults = []; }
    }
    syncConfigToDOM();
    pushTrace("info", "User Interactive", "Thanh B (Kernel)", "Toggle Bit 0x" + mask.toString(16).toUpperCase(), "Tương tác trực tiếp NvM_JobControlByte.");
  }
  updateDerivedRegisters();
  if (typeof renderAll === "function") renderAll();
}

// ---------------- QUEUE SCHEDULING ENGINE ----------------
function checkInitGuard(apiName) {
  if (!ecucConfig.NvMInitialized) {
    reportDetError(apiName, "0x14", "NVM_E_UNINIT", "Module NvM chưa được khởi tạo bằng NvM_Init() (SWS_NvM_00447).");
    return false;
  }
  return true;
}

function checkApiClassGuard(apiName, minClass) {
  const rank = ecucConfig.NvMApiConfigClass === "NVM_API_CONFIG_CLASS_3" ? 3 : (ecucConfig.NvMApiConfigClass === "NVM_API_CONFIG_CLASS_2" ? 2 : 1);
  if (rank < minClass) {
    reportDetError(apiName, "0x0B", "NVM_E_API_DISABLED_IN_CLASS" + rank, apiName + " yêu cầu tối thiểu NVM_API_CONFIG_CLASS_" + minClass + " (hiện tại: " + ecucConfig.NvMApiConfigClass + ").");
    return false;
  }
  return true;
}

function isBlockQueuedOrActive(blockId) {
  if (!simState) return false;
  if (simState.activeJob && simState.activeJob.blockId === blockId) return true;
  if (simState.suspendedJob && simState.suspendedJob.blockId === blockId) return true;
  if (simState.immediateQueue.some(j => j.blockId === blockId)) return true;
  if (simState.standardQueue.some(j => j.blockId === blockId)) return true;
  return false;
}

function sortStandardQueue() {
  if (ecucConfig.NvMJobPrioritization) {
    simState.standardQueue.sort((a, b) => a.priority - b.priority || a.seq - b.seq);
  }
}

let jobSeqCounter = 1;

function createJobObject(blockId, service, meta) {
  const blk = getBlockById(blockId);
  const { maxWriteRetries, maxReadRetries } = getMaxRetriesConfig();
  const isWrite = (service === "WRITE" || service === "ERASE" || service === "INVALIDATE");
  const isImm = (ecucConfig.NvMJobPrioritization && blk.jobPriority === 0 && (isWrite || service === "ERASE"));
  return Object.assign({
    seq: jobSeqCounter++,
    blockId: blockId,
    blockName: blk.name,
    service: service,
    priority: blk.jobPriority,
    isImmediate: isImm,
    phase: "QUEUED",
    ticksLeft: 2,
    totalTicks: 2,
    retriesLeft: isWrite ? maxWriteRetries : maxReadRetries,
    mirrorRetriesLeft: blk.repeatMirrorOps || 0,
    copyIndex: 0,
    crcProgressBytes: 0,
    apiLabel: meta && meta.apiLabel ? meta.apiLabel : ("NvM_" + service + "(" + blockId + ")"),
    preemptedStandard: false
  }, meta || {});
}

function enqueueJob(job) {
  const limits = getQueueLimits();
  if (job.isImmediate) {
    if (simState.immediateQueue.length >= limits.immCap) {
      reportDetError(job.apiLabel, "0x15", "NVM_E_QUEUE_OVERFLOW", "Immediate Priority Queue đã đầy (" + limits.immCap + " slots).");
      return false;
    }
    simState.immediateQueue.push(job);
    const blk = getBlockById(job.blockId);
    blk.lastResult = "NVM_REQ_PENDING";
    // Immediate Preemption (SWS_NvM_00381)
    if (simState.activeJob && !simState.activeJob.isImmediate) {
      simState.suspendedJob = Object.assign({}, simState.activeJob, { phase: "SUSPENDED" });
      simState.activeJob = null;
      simState.immPreemptFlag = true;
      simState.immPreemptCount += 1;
      simState.memIfState = "MEMIF_IDLE";
      simState.feeState = "FEE_IDLE";
      simState.flsState = "FLS_IDLE";
      simState.stackState = "STACK_MEMIF_CANCEL";
      simState.jobState = "NVM_JOB_PREEMPTED";
      simState.activeArrows = ["arr_rte_nvm", "arr_nvm_memif", "arr_memif_fee"];
      pushTrace("warn", "NvM Scheduler", "MemIf", "MemIf_Cancel(" + getBlockById(simState.suspendedJob.blockId).deviceId + ")", "IMMEDIATE PREEMPTION: Hủy khẩn cấp Job thường Blk #" + simState.suspendedJob.blockId + " (" + simState.suspendedJob.blockName + ") để nhường đường cho Prio=0 Blk #" + job.blockId + "!");
    }
    dispatchNextJobIfIdle();
    return true;
  }

  if (simState.standardQueue.length >= limits.stdCap) {
    reportDetError(job.apiLabel, "0x15", "NVM_E_QUEUE_OVERFLOW", "Standard Job Queue đã đầy (" + limits.stdCap + " slots).");
    return false;
  }
  simState.standardQueue.push(job);
  sortStandardQueue();
  const blk = getBlockById(job.blockId);
  blk.lastResult = "NVM_REQ_PENDING";
  dispatchNextJobIfIdle();
  return true;
}

function dispatchNextJobIfIdle() {
  if (!simState || simState.activeJob || !ecucConfig.NvMInitialized) return;
  let next = null;
  if (simState.immediateQueue.length > 0) {
    next = simState.immediateQueue.shift();
  } else if (simState.suspendedJob) {
    next = simState.suspendedJob;
    simState.suspendedJob = null;
    next.phase = "RESUMING";
    simState.immPreemptFlag = false;
    pushTrace("info", "NvM Scheduler", "Block #" + next.blockId, "Resume Job (" + next.apiLabel + ")", "Immediate Queue đã trống -> Tự động khôi phục (Resume) Job thường từng bị cắt ngang.");
  } else if (simState.standardQueue.length > 0) {
    next = simState.standardQueue.shift();
  }

  if (!next) {
    if (!simState.multiBlockJob) {
      simState.jobState = "NVM_IDLE";
      simState.stackState = "STACK_IDLE";
      simState.memIfState = "MEMIF_IDLE";
      simState.feeState = "FEE_IDLE";
      simState.flsState = "FLS_IDLE";
    }
    return;
  }

  simState.activeJob = next;
  const blk = getBlockById(next.blockId);
  if (next.phase === "QUEUED" || next.phase === "RESUMING") {
    if (next.service === "READ") {
      next.phase = "MEMIF_READ";
      next.ticksLeft = 2;
      simState.jobState = "NVM_READ_BLOCK";
      simState.stackState = "STACK_FEE_READ";
      simState.memIfState = "MEMIF_BUSY";
      simState.feeState = "FEE_READ";
      simState.flsState = "FLS_READ";
      simState.activeArrows = ["arr_nvm_memif", "arr_memif_fee", "arr_fee_fls"];
      pushTrace("info", "NvM Core", "MemIf->Fee->Fls", "MemIf_Read(Dev=" + blk.deviceId + ", Blk=" + blk.id + ", Len=" + blk.length + ")", "Đang đọc dữ liệu từ bộ nhớ không bay hơi (NV Copy #" + next.copyIndex + ").");
    } else if (next.service === "WRITE") {
      if (blk.useSyncMechanism) {
        next.phase = "MIRROR_WRITE_SYNC";
        next.ticksLeft = 1;
        simState.jobState = "NVM_MIRROR_SYNC";
        simState.stackState = "STACK_IDLE";
        simState.activeArrows = ["arr_nvm_rte", "arr_swc_rte"];
        pushTrace("info", "NvM Core", "SWC (Rte)", "NvM_WriteRamBlockToNvMCbk(Blk #" + blk.id + ")", "Explicit Sync: Yêu cầu SWC sao chép nguyên tử dữ liệu vào NvM Mirror Buffer.");
      } else if (blk.useCrc) {
        next.phase = "CALC_CRC_BEFORE_WRITE";
        next.ticksLeft = 1;
        simState.jobState = "NVM_CALC_CRC";
        simState.stackState = "STACK_CRC_CALC";
        simState.activeArrows = ["arr_nvm_crc"];
        pushTrace("info", "NvM Core", "Crc Module", "Crc_CalculateCRC(" + blk.crcType + ", Len=" + blk.length + ")", "Đang tính CRC và chuẩn bị kiểm tra CRC Compare Skip.");
      } else {
        startPhysicalMemIfWrite(next, blk);
      }
    } else if (next.service === "RESTORE") {
      next.phase = "RESTORE_ROM";
      next.ticksLeft = 1;
      simState.jobState = "NVM_RESTORE_ROM";
      simState.stackState = "STACK_IDLE";
      simState.activeArrows = ["arr_nvm_rte"];
      pushTrace("info", "NvM Core", "RAM / ROM", "RestoreDefaults(Blk #" + blk.id + ")", "Đọc giá trị mặc định từ NvMRomBlockDataAddress hoặc NvMInitBlockCallback().");
    } else if (next.service === "INVALIDATE") {
      next.phase = "MEMIF_INVALIDATE";
      next.ticksLeft = 1;
      simState.jobState = "NVM_WRITE_BLOCK";
      simState.stackState = "STACK_FEE_WRITE";
      simState.memIfState = "MEMIF_BUSY";
      simState.feeState = "FEE_INVALIDATE";
      simState.flsState = "FLS_WRITE";
      simState.activeArrows = ["arr_nvm_memif", "arr_memif_fee"];
      pushTrace("warn", "NvM Core", "MemIf->Fee", "MemIf_InvalidateBlock(Dev=" + blk.deviceId + ", Blk=" + blk.id + ")", "Đánh dấu Block Header thành INVALIDATED trên Flash (không cần Erase ngay).");
    } else if (next.service === "ERASE") {
      next.phase = "MEMIF_ERASE";
      next.ticksLeft = 2;
      simState.jobState = "NVM_WRITE_BLOCK";
      simState.stackState = "STACK_FEE_ERASE";
      simState.memIfState = "MEMIF_BUSY";
      simState.feeState = "FEE_ERASE";
      simState.flsState = "FLS_ERASE";
      simState.activeArrows = ["arr_nvm_memif", "arr_memif_fee", "arr_fee_fls"];
      pushTrace("warn", "NvM Core", "MemIf->Fee->Fls", "MemIf_EraseImmediateBlock(Dev=" + blk.deviceId + ", Blk=" + blk.id + ")", "Xóa vật lý Immediate Block (Prio=0) thành 0xFF/ERASED để sẵn sàng ghi khẩn cấp.");
    }
  }
}

function startPhysicalMemIfWrite(job, blk) {
  job.phase = "MEMIF_WRITE";
  job.ticksLeft = 2;
  simState.jobState = "NVM_WRITE_BLOCK";
  simState.stackState = "STACK_FEE_WRITE";
  simState.memIfState = "MEMIF_BUSY";
  simState.feeState = "FEE_WRITE";
  simState.flsState = "FLS_WRITE";
  simState.activeArrows = ["arr_nvm_memif", "arr_memif_fee", "arr_fee_fls"];
  const copyTxt = blk.blockType === "NVM_BLOCK_REDUNDANT" ? ("Copy #" + job.copyIndex + " -> Dual NV") : (blk.blockType === "NVM_BLOCK_DATASET" ? ("DS Index=" + blk.dataIndex) : "NV #0");
  pushTrace("info", "NvM Core", "MemIf->Fee->Fls", "MemIf_Write(Dev=" + blk.deviceId + ", Blk=" + blk.id + " [" + copyTxt + "])", "Bắt đầu ghi xuống Flash/EEPROM (" + (job.isImmediate ? "IMMEDIATE PRIO=0" : "Standard Prio=" + blk.jobPriority) + ").");
}

// ---------------- AUTOSAR NvM PUBLIC API IMPLEMENTATIONS ----------------
function api_NvM_Init() {
  ecucConfig.NvMInitialized = true;
  simState.blocks.forEach(b => {
    if (b.id > 0) {
      b.dataIndex = 0;
      b.lastResult = "NVM_REQ_OK";
      b.ramValid = false;
      b.ramChanged = false;
      b.restoredFromRom = false;
      b.redundancyLoss = false;
      b.lastCrcSkipped = false;
      b.explicitSyncOk = false;
    }
  });
  simState.immediateQueue = [];
  simState.standardQueue = [];
  simState.activeJob = null;
  simState.suspendedJob = null;
  simState.multiBlockJob = null;
  simState.jobState = "NVM_IDLE";
  simState.stackState = "STACK_IDLE";
  simState.memIfState = "MEMIF_IDLE";
  simState.feeState = "FEE_IDLE";
  simState.flsState = "FLS_IDLE";
  simState.demFaults = [];
  simState.detFaults = [];
  simState.errorFlag = false;
  simState.lastApiCall = "NvM_Init(NULL_PTR)";
  simState.lastCaller = "EcuM_AL_DriverInitTwo()";
  simState.lastRoutingSummary = "EcuM gọi NvM_Init() -> khởi tạo bảng Admin Block (#0..#5), hàng đợi Imm/Std = 0, DataIndex = 0.";
  simState.activeArrows = ["arr_bswm_nvm"];
  pushTrace("ok", "EcuM", "NvM Core", "NvM_Init(NULL_PTR)", "Khởi tạo thành công Admin Blocks, Queue và DataIndex = 0 (SWS_NvM_00447).");
  syncBlockToEcuc(simState.selectedBlockId);
  syncConfigToDOM();
  updateDerivedRegisters();
  return true;
}

function api_NvM_ReadBlock(blockId, isPram) {
  const apiName = isPram ? "NvM_ReadPRAMBlock" : "NvM_ReadBlock";
  if (!checkInitGuard(apiName)) return false;
  if (!checkApiClassGuard(apiName, 2)) return false;
  const blk = getBlockById(blockId);
  if (!blk || blk.id === 0) {
    reportDetError(apiName, "0x0A", "NVM_E_PARAM_BLOCK_ID", "BlockId=" + blockId + " không hợp lệ (Block 0 chỉ dành cho Multi-Block).");
    return false;
  }
  if (isBlockQueuedOrActive(blk.id)) {
    reportDetError(apiName, "0x15", "NVM_E_BLOCK_PENDING", "Block #" + blk.id + " đang Pending trong hàng đợi hoặc đang xử lý (SWS_NvM_00632).");
    return false;
  }
  if (blk.blockType === "NVM_BLOCK_DATASET" && blk.dataIndex >= blk.nvBlockNum + blk.romBlockNum) {
    reportDetError(apiName, "0x0C", "NVM_E_PARAM_BLOCK_DATA_IDX", "DataIndex=" + blk.dataIndex + " vượt quá số lượng Dataset (NV+ROM).");
    return false;
  }
  // If Dataset points to ROM slot -> load ROM directly!
  if (blk.blockType === "NVM_BLOCK_DATASET" && blk.dataIndex >= blk.nvBlockNum) {
    return api_NvM_RestoreBlockDefaults(blk.id, false);
  }
  blk.lastCrcSkipped = false;
  blk.redundancyLoss = false;
  blk.restoredFromRom = false;
  simState.selectedBlockId = blk.id;
  syncBlockToEcuc(blk.id);
  const job = createJobObject(blk.id, "READ", { apiLabel: apiName + "(" + blk.id + (isPram ? "" : ", NvM_DstPtr") + ")" });
  simState.lastApiCall = job.apiLabel;
  simState.lastCaller = "SWC_App via Rte";
  simState.lastRoutingSummary = "SWC -> RTE -> " + apiName + "(" + blk.id + ") xếp hàng đợi Standard -> MemIf_Read -> Fee_Read -> Fls -> NvM_JobEndNotification.";
  simState.activeArrows = ["arr_swc_rte", "arr_rte_nvm"];
  pushTrace("info", "SWC (Rte)", "NvM Queue", job.apiLabel, "Đẩy yêu cầu đọc khối #" + blk.id + " (" + blk.name + ") vào hàng đợi ưu tiên Prio=" + blk.jobPriority + ".");
  return enqueueJob(job);
}

function api_NvM_WriteBlock(blockId, isPram) {
  const apiName = isPram ? "NvM_WritePRAMBlock" : "NvM_WriteBlock";
  if (!checkInitGuard(apiName)) return false;
  if (!checkApiClassGuard(apiName, 2)) return false;
  const blk = getBlockById(blockId);
  if (!blk || blk.id === 0) {
    reportDetError(apiName, "0x0A", "NVM_E_PARAM_BLOCK_ID", "BlockId=" + blockId + " không hợp lệ.");
    return false;
  }
  if (isBlockQueuedOrActive(blk.id)) {
    reportDetError(apiName, "0x15", "NVM_E_BLOCK_PENDING", "Block #" + blk.id + " đang xử lý job trước đó.");
    return false;
  }
  if (blk.writeProtected || blk.writeOnceLocked) {
    blk.lastResult = "NVM_REQ_NOT_OK";
    reportDetError(apiName, "0x15", "NVM_E_WRITE_PROTECTED", "Block #" + blk.id + " đang bị WRITE_PROT=1" + (blk.writeOnceLocked ? " (WriteBlockOnce đã khóa vĩnh viễn)" : "") + ". Từ chối ghi!");
    return false;
  }
  if (blk.blockType === "NVM_BLOCK_DATASET" && blk.dataIndex >= blk.nvBlockNum) {
    reportDetError(apiName, "0x0C", "NVM_E_PARAM_BLOCK_DATA_IDX", "DataIndex=" + blk.dataIndex + " trỏ vào vùng ROM (chỉ đọc), không thể NvM_WriteBlock()!");
    return false;
  }
  blk.ramValid = true;
  blk.lastCrcSkipped = false;
  simState.selectedBlockId = blk.id;
  syncBlockToEcuc(blk.id);
  const job = createJobObject(blk.id, "WRITE", { apiLabel: apiName + "(" + blk.id + (isPram ? "" : ", NvM_SrcPtr") + ")" });
  simState.lastApiCall = job.apiLabel;
  simState.lastCaller = job.isImmediate ? "Safety / Crash SWC (Prio=0)" : "SWC_App via Rte";
  simState.lastRoutingSummary = job.isImmediate
    ? ("IMMEDIATE QUEUE (Prio=0): " + job.apiLabel + " đẩy vào Immediate Queue -> cắt ngang MemIf nếu cần!")
    : ("Standard Queue (Prio=" + blk.jobPriority + "): " + job.apiLabel + " -> " + (blk.useSyncMechanism ? "Mirror Sync -> " : "") + (blk.crcCompMechanism ? "CRC Compare Check -> " : "") + "MemIf_Write -> WriteVerify.");
  simState.activeArrows = ["arr_swc_rte", "arr_rte_nvm"];
  pushTrace(job.isImmediate ? "warn" : "info", simState.lastCaller, job.isImmediate ? "Immediate Queue" : "Standard Queue", job.apiLabel, "Đưa yêu cầu ghi Block #" + blk.id + " vào hàng đợi.");
  return enqueueJob(job);
}

function api_NvM_SetRamBlockStatus(blockId, blockChanged) {
  if (!checkInitGuard("NvM_SetRamBlockStatus")) return false;
  const blk = getBlockById(blockId);
  if (!blk || blk.id === 0) {
    reportDetError("NvM_SetRamBlockStatus", "0x0A", "NVM_E_PARAM_BLOCK_ID", "BlockId=" + blockId + " không hợp lệ.");
    return false;
  }
  if (!blk.useSetRamBlockStatus) {
    reportDetError("NvM_SetRamBlockStatus", "0x11", "NVM_E_BLOCK_WITHOUT_STATUS", "NvMBlockUseSetRamBlockStatus=FALSE cho Block #" + blk.id + ".");
    return false;
  }
  blk.ramValid = !!blockChanged;
  blk.ramChanged = !!blockChanged;
  if (blockChanged) {
    // Modify first byte slightly if unchanged so user visually sees RAM != NV
    blk.ramData[0] = (blk.ramData[0] + 1) & 0xFF;
    recomputeBlockMetadata(blk);
  }
  simState.selectedBlockId = blk.id;
  syncBlockToEcuc(blk.id);
  simState.lastApiCall = "NvM_SetRamBlockStatus(" + blk.id + ", " + (blockChanged ? "TRUE" : "FALSE") + ")";
  simState.lastCaller = "SWC_App via Rte";
  simState.lastRoutingSummary = "Đặt bit VALID_RAM=" + (blockChanged ? 1 : 0) + " và CHANGED_SW=" + (blockChanged ? 1 : 0) + " trong Thanh A -> Block #" + blk.id + (blockChanged ? " SẼ được NvM_WriteAll() ghi khi tắt máy." : " sẽ BỎ QUA khi WriteAll().");
  simState.activeArrows = ["arr_swc_rte", "arr_rte_nvm"];
  pushTrace("ok", "SWC (Rte)", "NvM Admin", simState.lastApiCall, "Đánh dấu RAM Block #" + blk.id + (blockChanged ? " VALID & DIRTY (sẵn sàng cho NvM_WriteAll)." : " UNCHANGED."));
  updateDerivedRegisters();
  return true;
}

function api_NvM_RestoreBlockDefaults(blockId, isPram) {
  const apiName = isPram ? "NvM_RestorePRAMBlockDefaults" : "NvM_RestoreBlockDefaults";
  if (!checkInitGuard(apiName)) return false;
  if (!checkApiClassGuard(apiName, 2)) return false;
  const blk = getBlockById(blockId);
  if (!blk || blk.id === 0) {
    reportDetError(apiName, "0x0A", "NVM_E_PARAM_BLOCK_ID", "BlockId=" + blockId + " không hợp lệ.");
    return false;
  }
  if (!blk.provideRomDefault && !(blk.blockType === "NVM_BLOCK_DATASET" && blk.dataIndex >= blk.nvBlockNum)) {
    reportDetError(apiName, "0x12", "NVM_E_BLOCK_CONFIG", "Block #" + blk.id + " không cấu hình NvMRomBlockDataAddress hay NvMInitBlockCallback.");
    return false;
  }
  simState.selectedBlockId = blk.id;
  syncBlockToEcuc(blk.id);
  const job = createJobObject(blk.id, "RESTORE", { apiLabel: apiName + "(" + blk.id + ")" });
  simState.lastApiCall = job.apiLabel;
  simState.lastCaller = "Dcm / SWC";
  simState.lastRoutingSummary = "Khôi phục dữ liệu mặc định từ ROM Default / NvMInitBlockCallback vào RAM Block #" + blk.id + " -> trả về NVM_REQ_RESTORED_FROM_ROM.";
  simState.activeArrows = ["arr_dcmdem_nvm"];
  pushTrace("info", "Dcm / SWC", "NvM Queue", job.apiLabel, "Xếp lịch khôi phục ROM Default cho Block #" + blk.id + ".");
  return enqueueJob(job);
}

function api_NvM_InvalidateNvBlock(blockId) {
  if (!checkInitGuard("NvM_InvalidateNvBlock")) return false;
  if (!checkApiClassGuard("NvM_InvalidateNvBlock", 3)) return false;
  const blk = getBlockById(blockId);
  if (!blk || blk.id === 0) {
    reportDetError("NvM_InvalidateNvBlock", "0x0A", "NVM_E_PARAM_BLOCK_ID", "BlockId=" + blockId + " không hợp lệ.");
    return false;
  }
  if (blk.writeProtected || blk.writeOnceLocked) {
    reportDetError("NvM_InvalidateNvBlock", "0x15", "NVM_E_WRITE_PROTECTED", "Block #" + blk.id + " đang khóa chống ghi -> từ chối InvalidateNvBlock (SWS_NvM_00424).");
    return false;
  }
  if (blk.blockType === "NVM_BLOCK_DATASET" && blk.dataIndex >= blk.nvBlockNum) {
    reportDetError("NvM_InvalidateNvBlock", "0x0C", "NVM_E_PARAM_BLOCK_DATA_IDX", "Không thể Invalidate vị trí ROM trong Dataset.");
    return false;
  }
  simState.selectedBlockId = blk.id;
  syncBlockToEcuc(blk.id);
  const job = createJobObject(blk.id, "INVALIDATE", { apiLabel: "NvM_InvalidateNvBlock(" + blk.id + ")" });
  simState.lastApiCall = job.apiLabel;
  simState.lastCaller = "Dcm / EOL Diag";
  simState.lastRoutingSummary = "Gọi MemIf_InvalidateBlock(): đánh dấu logic Block trên Flash/Fee là INVALIDATED (lần Read sau trả về NVM_REQ_NV_INVALIDATED).";
  simState.activeArrows = ["arr_dcmdem_nvm", "arr_nvm_memif"];
  pushTrace("warn", "Dcm", "NvM Queue", job.apiLabel, "Xếp lịch Invalidate logic Block #" + blk.id + " trên Fee/Ea.");
  return enqueueJob(job);
}

function api_NvM_EraseNvBlock(blockId) {
  if (!checkInitGuard("NvM_EraseNvBlock")) return false;
  if (!checkApiClassGuard("NvM_EraseNvBlock", 3)) return false;
  const blk = getBlockById(blockId);
  if (!blk || blk.id === 0) {
    reportDetError("NvM_EraseNvBlock", "0x0A", "NVM_E_PARAM_BLOCK_ID", "BlockId=" + blockId + " không hợp lệ.");
    return false;
  }
  if (blk.jobPriority !== 0) {
    reportDetError("NvM_EraseNvBlock", "0x13", "NVM_E_BLOCK_CONFIG", "SWS_NvM_00270: NvM_EraseNvBlock CHỈ chấp nhận khối có Immediate Priority (NvMBlockJobPriority == 0), hiện tại Prio=" + blk.jobPriority + "!");
    return false;
  }
  if (blk.writeProtected || blk.writeOnceLocked) {
    reportDetError("NvM_EraseNvBlock", "0x15", "NVM_E_WRITE_PROTECTED", "Block #" + blk.id + " đang khóa chống ghi -> từ chối EraseNvBlock.");
    return false;
  }
  simState.selectedBlockId = blk.id;
  syncBlockToEcuc(blk.id);
  const job = createJobObject(blk.id, "ERASE", { apiLabel: "NvM_EraseNvBlock(" + blk.id + ")" });
  simState.lastApiCall = job.apiLabel;
  simState.lastCaller = "Safety / Dcm";
  simState.lastRoutingSummary = "Gọi MemIf_EraseImmediateBlock() xóa vật lý Flash về 0xFF (chỉ dùng cho khối Priority=0).";
  simState.activeArrows = ["arr_dcmdem_nvm", "arr_nvm_memif"];
  pushTrace("warn", "Safety / Dcm", "Immediate Queue", job.apiLabel, "Xếp lịch xóa vật lý Block #" + blk.id + " (Prio=0).");
  return enqueueJob(job);
}

function api_NvM_SetDataIndex(blockId, dataIndex) {
  if (!checkInitGuard("NvM_SetDataIndex")) return false;
  if (!checkApiClassGuard("NvM_SetDataIndex", 2)) return false;
  const blk = getBlockById(blockId);
  if (!blk || blk.id === 0) {
    reportDetError("NvM_SetDataIndex", "0x0A", "NVM_E_PARAM_BLOCK_ID", "BlockId=" + blockId + " không hợp lệ.");
    return false;
  }
  if (blk.blockType !== "NVM_BLOCK_DATASET") {
    reportDetError("NvM_SetDataIndex", "0x12", "NVM_E_PARAM_BLOCK_TYPE", "NvM_SetDataIndex() chỉ áp dụng cho NVM_BLOCK_DATASET (Block #" + blk.id + " là " + blk.blockType + ").");
    return false;
  }
  const totalSlots = blk.nvBlockNum + blk.romBlockNum;
  if (dataIndex < 0 || dataIndex >= totalSlots) {
    reportDetError("NvM_SetDataIndex", "0x0C", "NVM_E_PARAM_BLOCK_DATA_IDX", "DataIndex=" + dataIndex + " nằm ngoài phạm vi [0.." + (totalSlots - 1) + "].");
    return false;
  }
  blk.dataIndex = dataIndex;
  simState.selectedBlockId = blk.id;
  syncBlockToEcuc(blk.id);
  syncConfigToDOM();
  simState.lastApiCall = "NvM_SetDataIndex(" + blk.id + ", " + dataIndex + ")";
  simState.lastCaller = "SWC_App / Dcm";
  const targetType = dataIndex < blk.nvBlockNum ? ("NV Slot #" + dataIndex) : ("ROM Slot #" + dataIndex + " (Read-Only)");
  simState.lastRoutingSummary = "Chuyển con trỏ Dataset Block #" + blk.id + " sang DataIndex=" + dataIndex + " (" + targetType + ").";
  simState.activeArrows = ["arr_swc_rte", "arr_rte_nvm"];
  pushTrace("ok", "SWC / Dcm", "NvM Admin", simState.lastApiCall, "DataIndex của Block #" + blk.id + " = " + dataIndex + " -> " + targetType);
  updateDerivedRegisters();
  return true;
}

function api_NvM_SetBlockProtection(blockId, protEnabled) {
  if (!checkInitGuard("NvM_SetBlockProtection")) return false;
  if (!checkApiClassGuard("NvM_SetBlockProtection", 3)) return false;
  const blk = getBlockById(blockId);
  if (!blk || blk.id === 0) {
    reportDetError("NvM_SetBlockProtection", "0x0A", "NVM_E_PARAM_BLOCK_ID", "BlockId=" + blockId + " không hợp lệ.");
    return false;
  }
  if (blk.writeOnceLocked && !protEnabled) {
    reportDetError("NvM_SetBlockProtection", "0x15", "NVM_E_BLOCK_LOCKED", "SWS_NvM_00326: Block #" + blk.id + " cấu hình NvMWriteBlockOnce=TRUE đã khóa vĩnh viễn -> KHÔNG THỂ mở khóa WRITE_PROT!");
    return false;
  }
  blk.writeProtected = !!protEnabled;
  simState.selectedBlockId = blk.id;
  syncBlockToEcuc(blk.id);
  syncConfigToDOM();
  simState.lastApiCall = "NvM_SetBlockProtection(" + blk.id + ", " + (protEnabled ? "TRUE" : "FALSE") + ")";
  simState.lastCaller = "Dcm / SWC";
  simState.lastRoutingSummary = "Đặt bit WRITE_PROT=" + (protEnabled ? "1 (Khóa)" : "0 (Mở)") + " cho Block #" + blk.id + ".";
  simState.activeArrows = ["arr_dcmdem_nvm"];
  pushTrace("warn", "Dcm / SWC", "NvM Admin", simState.lastApiCall, "Block #" + blk.id + (protEnabled ? " đã BẬT khóa chống ghi." : " đã TẮT khóa chống ghi."));
  updateDerivedRegisters();
  return true;
}

function api_NvM_ReadAll() {
  if (!checkInitGuard("NvM_ReadAll")) return false;
  if (ecucConfig.NvMDrvModeSwitch) simState.memIfMode = "MEMIF_MODE_FAST";
  simState.blocks[0].lastMultiOp = "NvM_ReadAll";
  simState.blocks[0].lastResult = "NVM_REQ_PENDING";
  const selectedIds = [];
  for (let i = 1; i < simState.blocks.length; i++) {
    if (simState.blocks[i].selectForReadAll && simState.blocks[i].blockType !== "NVM_BLOCK_DATASET") {
      selectedIds.push(i);
    }
  }
  simState.multiBlockJob = {
    type: "READ_ALL",
    remainingIds: selectedIds.slice(),
    processed: [],
    hasErrors: false,
    configMismatch: false
  };
  simState.jobState = "NVM_READ_ALL";
  simState.stackState = "STACK_MEMIF_FAST";
  setBswMJobStatus("NVM_READ_ALL", "NVM_REQ_PENDING");
  simState.lastApiCall = "NvM_ReadAll()";
  simState.lastCaller = "BswM / EcuM_StartupTwo";
  simState.lastRoutingSummary = "BswM/EcuM gọi NvM_ReadAll() -> chuyển MemIf_SetMode(FAST) -> đọc Block #1 ConfigId trước rồi tới các khối selectForReadAll (" + selectedIds.join(",") + ").";
  simState.activeArrows = ["arr_bswm_nvm", "arr_nvm_memif"];
  pushTrace("info", "BswM / EcuM", "NvM Multi-Block", "NvM_ReadAll()", "Bắt đầu ReadAll: chuyển MemIf_SetMode(" + simState.memIfMode + "). Danh sách khối: #" + selectedIds.join(", #"));
  updateDerivedRegisters();
  return true;
}

function api_NvM_WriteAll() {
  if (!checkInitGuard("NvM_WriteAll")) return false;
  if (ecucConfig.NvMDrvModeSwitch) simState.memIfMode = "MEMIF_MODE_FAST";
  simState.blocks[0].lastMultiOp = "NvM_WriteAll";
  simState.blocks[0].lastResult = "NVM_REQ_PENDING";
  const dirtyIds = [];
  for (let i = 1; i < simState.blocks.length; i++) {
    const b = simState.blocks[i];
    if (b.selectForWriteAll && b.ramValid && b.ramChanged && !b.writeProtected && !b.writeOnceLocked) {
      dirtyIds.push(i);
    }
  }
  simState.multiBlockJob = {
    type: "WRITE_ALL",
    remainingIds: dirtyIds.slice(),
    processed: [],
    hasErrors: false
  };
  simState.jobState = "NVM_WRITE_ALL";
  simState.stackState = "STACK_MEMIF_FAST";
  setBswMJobStatus("NVM_WRITE_ALL", "NVM_REQ_PENDING");
  simState.lastApiCall = "NvM_WriteAll()";
  simState.lastCaller = "BswM_OnGoOffOne (Shutdown)";
  simState.lastRoutingSummary = "BswM gọi NvM_WriteAll() -> lọc những khối có selectForWriteAll=1 && VALID_RAM=1 && CHANGED_SW=1: [" + (dirtyIds.length ? ("#" + dirtyIds.join(", #")) : "Không có khối Dirty") + "].";
  simState.activeArrows = ["arr_bswm_nvm", "arr_nvm_memif"];
  pushTrace("info", "BswM", "NvM Multi-Block", "NvM_WriteAll()", "Quét ghi Shutdown cho các khối Dirty hợp lệ: " + (dirtyIds.length ? ("#" + dirtyIds.join(", #")) : "0 khối (bỏ qua toàn bộ khối Clean!)."));
  updateDerivedRegisters();
  return true;
}

function api_NvM_CancelWriteAll() {
  if (!checkInitGuard("NvM_CancelWriteAll")) return false;
  if (!simState.multiBlockJob || simState.multiBlockJob.type !== "WRITE_ALL") {
    pushTrace("warn", "BswM", "NvM Multi-Block", "NvM_CancelWriteAll()", "Không có tiến trình WriteAll nào đang chạy để hủy.");
    return false;
  }
  const cancelledIds = simState.multiBlockJob.remainingIds.slice();
  simState.multiBlockJob = null;
  simState.blocks[0].lastMultiOp = "NvM_CancelWriteAll";
  simState.blocks[0].lastResult = "NVM_REQ_CANCELED";
  if (ecucConfig.NvMDrvModeSwitch) simState.memIfMode = "MEMIF_MODE_SLOW";
  simState.jobState = "NVM_IDLE";
  simState.stackState = "STACK_IDLE";
  setBswMJobStatus("NVM_WRITE_ALL", "NVM_REQ_CANCELED");
  simState.lastApiCall = "NvM_CancelWriteAll()";
  simState.lastCaller = "BswM (Wakeup Interrupt / IGN_ON)";
  simState.lastRoutingSummary = "BswM hủy ngang WriteAll() do tài xế bật lại IGN_ON! Khối đang ghi kết thúc trọn vẹn, các khối chưa ghi [" + cancelledIds.join(",") + "] bị bỏ qua, trả về NVM_REQ_CANCELED.";
  simState.activeArrows = ["arr_bswm_nvm", "arr_nvm_bswm"];
  pushTrace("warn", "BswM", "NvM Multi-Block", "NvM_CancelWriteAll()", "IGN_ON đánh thức ECU -> Hủy các khối WriteAll còn lại [" + cancelledIds.join(",") + "], thông báo NVM_REQ_CANCELED.");
  updateDerivedRegisters();
  return true;
}

function api_NvM_ValidateAll() {
  if (!checkInitGuard("NvM_ValidateAll")) return false;
  let validated = 0;
  for (let i = 1; i < simState.blocks.length; i++) {
    const b = simState.blocks[i];
    if (b.useCrc && b.useAutoValidation && b.ramValid) {
      b.ramCrc = computeAutosarCrc(b.ramData, b.crcType, b.staticBlockIdCheck, b.id);
      b.ramChanged = true;
      validated++;
    }
  }
  simState.blocks[0].lastMultiOp = "NvM_ValidateAll";
  simState.blocks[0].lastResult = "NVM_REQ_OK";
  setBswMJobStatus("NVM_VALIDATE_ALL", "NVM_REQ_OK");
  simState.lastApiCall = "NvM_ValidateAll()";
  simState.lastCaller = "BswM";
  simState.lastRoutingSummary = "NvM_ValidateAll() tính lại CRC cho " + validated + " khối có NvMBlockUseAutoValidation=TRUE để chuẩn bị trước WriteAll().";
  simState.activeArrows = ["arr_bswm_nvm", "arr_nvm_crc", "arr_nvm_bswm"];
  pushTrace("ok", "BswM", "NvM Core", "NvM_ValidateAll()", "Đã tính & đồng bộ CRC RAM cho " + validated + " khối AutoValidation.");
  updateDerivedRegisters();
  return true;
}

function api_CorruptNvCopy(blockId, copyIdx, mode) {
  const blk = getBlockById(blockId);
  if (!blk || blk.id === 0) return false;
  const copy = (blk.blockType === "NVM_BLOCK_DATASET" && blk.datasetSlots)
    ? blk.datasetSlots[Math.max(0, Math.min(blk.nvBlockNum - 1, blk.dataIndex))]
    : blk.nvCopies[copyIdx || 0];
  if (!copy || !copy.present) return false;

  if (mode === "CLEAR") {
    copy.corruptedCrc = false;
    copy.wrongStaticId = false;
    copy.invalidated = false;
    copy.erased = false;
    copy.staticIdTag = blk.staticBlockIdCheck ? blk.id : null;
    copy.storedCrc = blk.useCrc ? computeAutosarCrc(copy.data, blk.crcType, blk.staticBlockIdCheck, blk.id) : "N/A";
    copy.calcCrc = copy.storedCrc;
    blk.redundancyLoss = false;
    if (blk.id === simState.selectedBlockId) ecucConfig.InjectNvCrcCorruption = false;
    pushTrace("ok", "Fault Injector", "NV Copy #" + (copyIdx || 0), "Restore Healthy NV CRC", "Đã khôi phục toàn vẹn NV Copy #" + (copyIdx || 0) + " của Block #" + blk.id + ".");
  } else if (mode === "STATIC_ID") {
    copy.wrongStaticId = true;
    copy.staticIdTag = (blk.id === 3 ? 2 : 3);
    pushTrace("err", "Fault Injector", "NV Copy #" + (copyIdx || 0), "Inject WRONG_STATIC_ID", "Tiêm lỗi Header Static ID trên NV Copy #" + (copyIdx || 0) + ": ghi ID=" + copy.staticIdTag + " thay vì Block #" + blk.id + ".");
  } else if (mode === "INVALIDATED") {
    copy.invalidated = true;
    pushTrace("warn", "Fault Injector", "NV Copy #" + (copyIdx || 0), "Set Fee Header = INVALIDATED", "Đánh dấu NV Copy #" + (copyIdx || 0) + " của Block #" + blk.id + " ở trạng thái NVM_REQ_NV_INVALIDATED.");
  } else if (mode === "ERASED") {
    copy.erased = true;
    copy.data = copy.data.map(() => 0xFF);
    copy.storedCrc = "0xFFFF";
    pushTrace("warn", "Fault Injector", "NV Copy #" + (copyIdx || 0), "Physical Erase NV Copy (0xFF)", "NV Copy #" + (copyIdx || 0) + " của Block #" + blk.id + " trống (0xFF ERASED).");
  } else {
    // Toggle or set CRC corruption
    const nextCorrupt = (mode === "TOGGLE") ? !copy.corruptedCrc : true;
    copy.corruptedCrc = nextCorrupt;
    copy.storedCrc = nextCorrupt ? "0xDEAD" : computeAutosarCrc(copy.data, blk.crcType, blk.staticBlockIdCheck, blk.id);
    if (blk.id === simState.selectedBlockId && (copyIdx || 0) === 0) ecucConfig.InjectNvCrcCorruption = nextCorrupt;
    pushTrace(nextCorrupt ? "err" : "ok", "Fault Injector", "NV Copy #" + (copyIdx || 0), nextCorrupt ? "Corrupt CRC = 0xDEAD" : "Repair CRC", "NV Copy #" + (copyIdx || 0) + " của Block #" + blk.id + (nextCorrupt ? " đã bị tiêm lỗi CRC (0xDEAD)." : " đã sửa CRC hợp lệ."));
  }
  syncConfigToDOM();
  updateDerivedRegisters();
  return true;
}

// ---------------- MAINFUNCTION / CLOCK TICK STEPPER ----------------
function finishActiveJob(blk, result, traceMsg) {
  const job = simState.activeJob;
  blk.lastResult = result;
  simState.activeJob = null;
  simState.memIfState = "MEMIF_IDLE";
  simState.feeState = "FEE_IDLE";
  simState.flsState = "FLS_IDLE";
  simState.retryCount = 0;
  if (result === "NVM_REQ_OK" || result === "NVM_REQ_RESTORED_FROM_ROM" || result === "NVM_REQ_OK_SKIPPED") {
    if (result === "NVM_REQ_OK_SKIPPED") blk.lastResult = "NVM_REQ_OK";
    pushTrace("ok", "NvM Core", "SWC (Rte)", "NvM_JobEndNotification / SingleBlockCbk(#" + blk.id + ", " + blk.lastResult + ")", traceMsg);
  } else {
    pushTrace("err", "NvM Core", "SWC (Rte)", "NvM_JobErrorNotification / SingleBlockCbk(#" + blk.id + ", " + blk.lastResult + ")", traceMsg);
  }
  simState.activeArrows = ["arr_nvm_rte"];
  dispatchNextJobIfIdle();
  updateDerivedRegisters();
}

function stepSingleReadAllBlock() {
  const mb = simState.multiBlockJob;
  if (!mb || mb.type !== "READ_ALL") return;
  if (mb.remainingIds.length === 0) {
    simState.multiBlockJob = null;
    simState.blocks[0].lastResult = mb.hasErrors ? "NVM_REQ_NOT_OK" : "NVM_REQ_OK";
    if (ecucConfig.NvMDrvModeSwitch) simState.memIfMode = "MEMIF_MODE_SLOW";
    simState.jobState = "NVM_IDLE";
    simState.stackState = "STACK_IDLE";
    setBswMJobStatus("NVM_READ_ALL", simState.blocks[0].lastResult);
    pushTrace(mb.hasErrors ? "warn" : "ok", "NvM Multi-Block", "BswM / EcuM", "MultiBlockCallback(NVM_READ_ALL, " + simState.blocks[0].lastResult + ")", "ReadAll hoàn tất! Khôi phục MemIf_SetMode(SLOW). Đã nạp " + mb.processed.length + " khối.");
    updateDerivedRegisters();
    return;
  }

  const nextId = mb.remainingIds.shift();
  const blk = getBlockById(nextId);
  mb.processed.push(nextId);
  simState.selectedBlockId = nextId;
  syncBlockToEcuc(nextId);

  if (nextId === 1) {
    // Check Dynamic Configuration ConfigId comparison
    const { compiled, stored } = getConfigIdPair();
    if (ecucConfig.NvMDynamicConfiguration && compiled !== stored) {
      mb.configMismatch = true;
      blk.ramData = [(compiled >>> 8) & 0xFF, compiled & 0xFF];
      blk.ramValid = true;
      blk.ramChanged = true;
      blk.lastResult = "NVM_REQ_NOT_OK";
      pushTrace("warn", "NvM ReadAll", "Block #1 ConfigId", "ConfigId Mismatch: Compiled=" + formatHex16(compiled) + " != Stored=" + formatHex16(stored), "NvMDynamicConfiguration=TRUE -> Phát hiện thay đổi phần mềm! Các khối ResistantToChangedSw=FALSE sẽ bị reset về ROM Default!");
      // Any block with resistantToChangedSw == false resets to ROM!
      for (let i = 2; i < simState.blocks.length; i++) {
        const b = simState.blocks[i];
        if (!b.resistantToChangedSw && b.provideRomDefault) {
          b.ramData = b.romData.slice();
          b.ramValid = true;
          b.ramChanged = true;
          b.restoredFromRom = true;
          b.lastResult = "NVM_REQ_RESTORED_FROM_ROM";
          recomputeBlockMetadata(b);
          mb.remainingIds = mb.remainingIds.filter(id => id !== i);
          mb.processed.push(i);
          pushTrace("warn", "NvM DynamicCfg", "Block #" + i, "Reset To ROM (Resistant=FALSE)", "Block #" + i + " không chịu được thay đổi SW -> nạp ROM Default và đánh dấu CHANGED_SW=1 để ghi lại.");
        }
      }
      updateDerivedRegisters();
      return;
    }
  }

  // Normal ReadAll single block step
  const c0 = blk.nvCopies[0];
  const c1 = blk.nvCopies[1];
  const c0Valid = c0 && !c0.corruptedCrc && !c0.wrongStaticId && !c0.invalidated && !c0.erased;
  const c1Valid = blk.blockType === "NVM_BLOCK_REDUNDANT" && c1 && c1.present && !c1.corruptedCrc && !c1.wrongStaticId && !c1.invalidated && !c1.erased;

  if (c0Valid) {
    blk.ramData = c0.data.slice();
    blk.ramValid = true;
    blk.ramChanged = false;
    blk.restoredFromRom = false;
    blk.redundancyLoss = false;
    blk.lastResult = "NVM_REQ_OK";
    if (blk.writeOnce) { blk.writeOnceLocked = true; blk.writeProtected = true; }
    recomputeBlockMetadata(blk);
    simState.lastCrcOk = true;
    pushTrace("ok", "MemIf (FAST)", "RAM Block #" + blk.id, "ReadAll -> Block #" + blk.id + " (" + blk.name + ")", "Đọc NV #0 thành công (CRC " + c0.storedCrc + " khớp).");
  } else if (c1Valid) {
    blk.ramData = c1.data.slice();
    blk.ramValid = true;
    blk.ramChanged = false;
    blk.redundancyLoss = true;
    blk.lastResult = "NVM_REQ_OK";
    recomputeBlockMetadata(blk);
    reportDemEvent("NVM_E_LOSS_OF_REDUNDANCY", "DEM_EVENT_STATUS_FAILED", "ReadAll Block #" + blk.id + ": NV #0 lỗi -> cứu hộ từ bản sao NV #1 thành công.");
  } else if (blk.provideRomDefault) {
    blk.ramData = blk.romData.slice();
    blk.ramValid = true;
    blk.ramChanged = false;
    blk.restoredFromRom = true;
    blk.lastResult = "NVM_REQ_RESTORED_FROM_ROM";
    mb.hasErrors = true;
    recomputeBlockMetadata(blk);
    reportDemEvent("NVM_E_INTEGRITY_FAILED", "DEM_EVENT_STATUS_FAILED", "ReadAll Block #" + blk.id + ": Flash hỏng toàn bộ -> Nạp ROM Default (NVM_REQ_RESTORED_FROM_ROM).");
  } else {
    blk.ramValid = false;
    blk.lastResult = "NVM_REQ_INTEGRITY_FAILED";
    mb.hasErrors = true;
    reportDemEvent("NVM_E_INTEGRITY_FAILED", "DEM_EVENT_STATUS_FAILED", "ReadAll Block #" + blk.id + " thất bại hoàn toàn.");
  }
  simState.activeArrows = ["arr_fls_nvm", "arr_nvm_crc", "arr_nvm_memif", "arr_memif_fee", "arr_fee_fls"];
  updateDerivedRegisters();
}

function stepSingleWriteAllBlock() {
  const mb = simState.multiBlockJob;
  if (!mb || mb.type !== "WRITE_ALL") return;
  if (mb.remainingIds.length === 0) {
    simState.multiBlockJob = null;
    simState.blocks[0].lastResult = mb.hasErrors ? "NVM_REQ_NOT_OK" : "NVM_REQ_OK";
    if (ecucConfig.NvMDrvModeSwitch) simState.memIfMode = "MEMIF_MODE_SLOW";
    simState.jobState = "NVM_IDLE";
    simState.stackState = "STACK_IDLE";
    setBswMJobStatus("NVM_WRITE_ALL", simState.blocks[0].lastResult);
    pushTrace(mb.hasErrors ? "err" : "ok", "NvM Multi-Block", "BswM / EcuM", "MultiBlockCallback(NVM_WRITE_ALL, " + simState.blocks[0].lastResult + ")", "WriteAll hoàn tất ghi " + mb.processed.length + " khối Dirty! Chuyển MemIf_SetMode(SLOW).");
    updateDerivedRegisters();
    return;
  }

  const nextId = mb.remainingIds.shift();
  const blk = getBlockById(nextId);
  mb.processed.push(nextId);
  simState.selectedBlockId = nextId;
  syncBlockToEcuc(nextId);

  if (ecucConfig.InjectMemIfWriteError) {
    blk.lastResult = "NVM_REQ_NOT_OK";
    mb.hasErrors = true;
    reportDemEvent("NVM_E_REQ_FAILED", "DEM_EVENT_STATUS_FAILED", "WriteAll Block #" + nextId + " gặp lỗi ghi MemIf!");
    return;
  }

  if (blk.blockType === "NVM_BLOCK_REDUNDANT") {
    blk.nvCopies[0] = makeNvCopy(blk.id, blk.ramData, blk.crcType, blk.useCrc, blk.staticBlockIdCheck);
    blk.nvCopies[1] = makeNvCopy(blk.id, blk.ramData, blk.crcType, blk.useCrc, blk.staticBlockIdCheck);
  } else {
    blk.nvCopies[0] = makeNvCopy(blk.id, blk.ramData, blk.crcType, blk.useCrc, blk.staticBlockIdCheck);
  }
  blk.ramChanged = false;
  blk.ramValid = true;
  blk.redundancyLoss = false;
  blk.restoredFromRom = false;
  blk.lastResult = "NVM_REQ_OK";
  if (blk.writeOnce) { blk.writeOnceLocked = true; blk.writeProtected = true; }
  recomputeBlockMetadata(blk);
  simState.activeArrows = ["arr_nvm_crc", "arr_nvm_memif", "arr_memif_fee", "arr_fee_fls"];
  pushTrace("ok", "NvM WriteAll (FAST)", "Flash NV", "WriteAll -> Block #" + blk.id + " (" + blk.name + ")", "Ghi thành công xuống Flash, clear CHANGED_SW=0.");
  updateDerivedRegisters();
}

function stepClockTick(dtMs) {
  if (!simState) return;
  const { periodMs, crcBytesPerStep } = getMainFnAndCrcBudget();
  simState.clockMs += (dtMs || periodMs);

  if (!ecucConfig.NvMInitialized) {
    simState.jobState = "NVM_UNINIT";
    updateDerivedRegisters();
    if (typeof renderAll === "function") renderAll();
    return;
  }

  if (simState.activeJob) {
    const job = simState.activeJob;
    const blk = getBlockById(job.blockId);

    if (job.phase === "MIRROR_WRITE_SYNC") {
      if (ecucConfig.InjectMirrorBusyConflict && job.mirrorRetriesLeft > 0) {
        job.mirrorRetriesLeft -= 1;
        blk.mirrorBusyRemain = job.mirrorRetriesLeft;
        blk.explicitSyncOk = false;
        pushTrace("warn", "SWC Mirror Cbk", "NvM Core", "WriteRamBlockToNvM -> E_NOT_OK (Retry còn " + job.mirrorRetriesLeft + ")", "SWC đang bận cập nhật RAM! NvM giữ NvM Mirror và sẽ thử lại ở MainFunction() sau (SWS_NvM_00516).");
        updateDerivedRegisters();
        if (typeof renderAll === "function") renderAll();
        return;
      }
      if (ecucConfig.InjectMirrorBusyConflict && job.mirrorRetriesLeft <= 0) {
        blk.explicitSyncOk = false;
        blk.mirrorBusyRemain = 0;
        simState.lastCrcOk = false;
        reportDemEvent("NVM_E_REQ_FAILED", "DEM_EVENT_STATUS_FAILED", "Explicit Sync vượt quá NvMRepeatMirrorOperations=" + blk.repeatMirrorOps + " lần thử lại.");
        finishActiveJob(blk, "NVM_REQ_NOT_OK", "Mirror Sync thất bại sau khi hết lượt NvMRepeatMirrorOperations.");
        if (typeof renderAll === "function") renderAll();
        return;
      }
      blk.mirrorData = blk.ramData.slice();
      blk.mirrorBusyRemain = 0;
      blk.explicitSyncOk = true;
      pushTrace("ok", "SWC Mirror Cbk", "NvM Mirror", "WriteRamBlockToNvM -> E_OK (" + blk.mirrorData.length + "B)", "Sao chép nguyên tử thành công RAM -> NvM Mirror (" + bytesToHex(blk.mirrorData) + ").");
      if (blk.useCrc) {
        job.phase = "CALC_CRC_BEFORE_WRITE";
        simState.jobState = "NVM_CALC_CRC";
        simState.stackState = "STACK_CRC_CALC";
        simState.activeArrows = ["arr_nvm_crc"];
      } else {
        startPhysicalMemIfWrite(job, blk);
      }
      updateDerivedRegisters();
      if (typeof renderAll === "function") renderAll();
      return;
    }

    if (job.phase === "CALC_CRC_BEFORE_WRITE") {
      const payload = blk.useSyncMechanism ? blk.mirrorData : blk.ramData;
      const newCrc = computeAutosarCrc(payload, blk.crcType, blk.staticBlockIdCheck, blk.id);
      blk.ramCrc = newCrc;
      simState.lastCrcOk = true;
      const nv0 = getActiveNvCopy(blk, 0);
      if (blk.crcCompMechanism && nv0 && nv0.present && !nv0.corruptedCrc && !nv0.invalidated && !nv0.erased && nv0.storedCrc === newCrc) {
        blk.lastCrcSkipped = true;
        blk.ramChanged = false;
        pushTrace("ok", "Crc Engine", "NvM Core", "CRC Compare Match (" + newCrc + " == NV) -> SKIP MemIf_Write!", "CHỐNG MÒN FLASH (SWS_NvM_00852): CRC dữ liệu mới trùng khớp hoàn toàn NV hiện tại -> kết thúc NVM_REQ_OK mà không mòn chu kỳ xóa Flash!");
        finishActiveJob(blk, "NVM_REQ_OK_SKIPPED", "Ghi logic hoàn tất nhanh nhờ CRC Compare Mechanism (bỏ qua ghi Flash vật lý).");
        if (typeof renderAll === "function") renderAll();
        return;
      }
      pushTrace("info", "Crc Engine", "NvM Core", "Crc_Calculate -> " + newCrc + " (khác NV: " + (nv0 ? nv0.storedCrc : "N/A") + ")", "CRC khác dữ liệu NV (" + crcBytesPerStep + " B/cycle) -> tiến hành MemIf_Write().");
      startPhysicalMemIfWrite(job, blk);
      updateDerivedRegisters();
      if (typeof renderAll === "function") renderAll();
      return;
    }

    if (job.phase === "MEMIF_READ") {
      job.ticksLeft -= 1;
      if (job.ticksLeft > 0) {
        pushTrace("info", "Fee / Fls", "NvM Core", "Fls_MainFunction() + Fee_MainFunction() [MEMIF_BUSY]", "Đang truyền trang Flash + kiểm tra Fee Cluster...");
        updateDerivedRegisters();
        if (typeof renderAll === "function") renderAll();
        return;
      }
      const copy = getActiveNvCopy(blk, job.copyIndex);
      if (!copy || !copy.present || copy.erased) {
        simState.lastCrcOk = false;
        if (blk.blockType === "NVM_BLOCK_REDUNDANT" && job.copyIndex === 0) {
          job.copyIndex = 1;
          job.ticksLeft = 1;
          blk.redundancyLoss = true;
          reportDemEvent("NVM_E_LOSS_OF_REDUNDANCY", "DEM_EVENT_STATUS_FAILED", "NV #0 trống/Erased -> tự động chuyển sang đọc bản sao NV #1.");
          updateDerivedRegisters();
          if (typeof renderAll === "function") renderAll();
          return;
        }
        if (blk.provideRomDefault) {
          blk.ramData = blk.romData.slice();
          blk.ramValid = true;
          blk.ramChanged = false;
          blk.restoredFromRom = true;
          recomputeBlockMetadata(blk);
          finishActiveJob(blk, "NVM_REQ_RESTORED_FROM_ROM", "NV chưa có dữ liệu hợp lệ -> tự động nạp ROM Default (NVM_REQ_RESTORED_FROM_ROM).");
        } else {
          finishActiveJob(blk, "NVM_REQ_NV_INVALIDATED", "Không có bản sao NV hợp lệ và không có ROM Default.");
        }
        if (typeof renderAll === "function") renderAll();
        return;
      }
      if (copy.invalidated) {
        simState.lastCrcOk = false;
        blk.ramValid = false;
        finishActiveJob(blk, "NVM_REQ_NV_INVALIDATED", "Block Header trên Fee đang là INVALIDATED (NVM_REQ_NV_INVALIDATED).");
        if (typeof renderAll === "function") renderAll();
        return;
      }
      if (copy.wrongStaticId && blk.staticBlockIdCheck) {
        simState.lastCrcOk = false;
        simState.errorFlag = true;
        reportDemEvent("NVM_E_WRONG_BLOCK_ID", "DEM_EVENT_STATUS_FAILED", "Static Block ID Check phát hiện Header ID=" + copy.staticIdTag + " != Block #" + blk.id + " (SWS_NvM_00201).");
        finishActiveJob(blk, "NVM_REQ_NOT_OK", "Đọc thất bại do sai Static Block ID!");
        if (typeof renderAll === "function") renderAll();
        return;
      }
      if (copy.corruptedCrc && blk.useCrc) {
        simState.lastCrcOk = false;
        if (job.retriesLeft > 0) {
          job.retriesLeft -= 1;
          simState.retryCount += 1;
          job.ticksLeft = 1;
          pushTrace("warn", "Crc Engine", "NvM Retry", "CRC Mismatch (Stored=" + copy.storedCrc + ") -> ReadRetry còn " + job.retriesLeft, "Lỗi CRC trên NV Copy #" + job.copyIndex + ", đang thử đọc lại.");
          updateDerivedRegisters();
          if (typeof renderAll === "function") renderAll();
          return;
        }
        if (blk.blockType === "NVM_BLOCK_REDUNDANT" && job.copyIndex === 0) {
          job.copyIndex = 1;
          job.retriesLeft = getMaxRetriesConfig().maxReadRetries;
          job.ticksLeft = 1;
          blk.redundancyLoss = true;
          reportDemEvent("NVM_E_LOSS_OF_REDUNDANCY", "DEM_EVENT_STATUS_FAILED", "NV #0 hỏng CRC (" + copy.storedCrc + ") -> Cứu hộ tự động từ bản sao NV #1!");
          updateDerivedRegisters();
          if (typeof renderAll === "function") renderAll();
          return;
        }
        if (blk.provideRomDefault) {
          blk.ramData = blk.romData.slice();
          blk.ramValid = true;
          blk.ramChanged = false;
          blk.restoredFromRom = true;
          recomputeBlockMetadata(blk);
          reportDemEvent("NVM_E_INTEGRITY_FAILED", "DEM_EVENT_STATUS_FAILED", "Cả hai bản sao NV đều lỗi CRC -> Khôi phục từ ROM Default!");
          finishActiveJob(blk, "NVM_REQ_RESTORED_FROM_ROM", "Lỗi toàn vẹn NV -> Khôi phục ROM Default thành công.");
        } else {
          reportDemEvent("NVM_E_INTEGRITY_FAILED", "DEM_EVENT_STATUS_FAILED", "Lỗi CRC, không có ROM Default dự phòng.");
          finishActiveJob(blk, "NVM_REQ_INTEGRITY_FAILED", "NVM_REQ_INTEGRITY_FAILED.");
        }
        if (typeof renderAll === "function") renderAll();
        return;
      }
      // Valid NV Read!
      simState.lastCrcOk = true;
      simState.retryCount = 0;
      if (blk.useSyncMechanism) {
        blk.mirrorData = copy.data.slice();
        blk.ramData = copy.data.slice();
        blk.explicitSyncOk = true;
        pushTrace("ok", "NvM Mirror", "SWC (Rte)", "NvM_ReadRamBlockFromNvMCbk(Blk #" + blk.id + ")", "Explicit Sync: Copy từ NvM Mirror vào RAM SWC an toàn.");
      } else {
        blk.ramData = copy.data.slice();
      }
      blk.ramValid = true;
      blk.ramChanged = false;
      blk.restoredFromRom = false;
      if (blk.writeOnce) { blk.writeOnceLocked = true; blk.writeProtected = true; }
      recomputeBlockMetadata(blk);
      finishActiveJob(blk, "NVM_REQ_OK", "Đọc & giải mã thành công NV Copy #" + job.copyIndex + " -> RAM (" + bytesToHex(blk.ramData) + ", CRC=" + blk.ramCrc + ").");
      if (typeof renderAll === "function") renderAll();
      return;
    }

    if (job.phase === "MEMIF_WRITE") {
      job.ticksLeft -= 1;
      if (job.ticksLeft > 0) {
        pushTrace("info", "Fee / Fls", "NvM Core", "Fls_MainFunction() [Programming Flash]", "Đang nạp trang dữ liệu vào DFlash...");
        updateDerivedRegisters();
        if (typeof renderAll === "function") renderAll();
        return;
      }
      if (ecucConfig.InjectMemIfWriteError) {
        simState.lastWriteVerifyOk = false;
        if (job.retriesLeft > 0) {
          job.retriesLeft -= 1;
          simState.retryCount += 1;
          job.ticksLeft = 1;
          pushTrace("warn", "Fls Driver", "NvM Retry", "NvM_JobErrorNotification() -> WriteRetry còn " + job.retriesLeft, "Lỗi phần cứng Flash -> NvM tự động thử ghi lại (SWS_NvM_00263).");
          updateDerivedRegisters();
          if (typeof renderAll === "function") renderAll();
          return;
        }
        reportDemEvent("NVM_E_REQ_FAILED", "DEM_EVENT_STATUS_FAILED", "Hết " + getMaxRetriesConfig().maxWriteRetries + " lần thử lại WriteRetry -> MemIf Write thất bại!");
        finishActiveJob(blk, "NVM_REQ_NOT_OK", "Ghi thất bại sau khi vượt quá NvMMaxNumOfWriteRetries.");
        if (typeof renderAll === "function") renderAll();
        return;
      }

      // Commit NV Copy write
      const payloadToWrite = blk.useSyncMechanism ? blk.mirrorData : blk.ramData;
      const newCopy = makeNvCopy(blk.id, payloadToWrite, blk.crcType, blk.useCrc, blk.staticBlockIdCheck, { writeCount: ((blk.nvCopies[job.copyIndex] && blk.nvCopies[job.copyIndex].writeCount) || 1) + 1 });
      if (blk.blockType === "NVM_BLOCK_DATASET" && blk.datasetSlots && blk.dataIndex < blk.nvBlockNum) {
        blk.datasetSlots[blk.dataIndex] = Object.assign(newCopy, { idx: blk.dataIndex, label: blk.datasetSlots[blk.dataIndex].label, isRom: false });
        blk.nvCopies[0] = Object.assign({}, newCopy);
      } else {
        blk.nvCopies[job.copyIndex] = newCopy;
      }

      if (blk.blockType === "NVM_BLOCK_REDUNDANT" && job.copyIndex === 0) {
        job.copyIndex = 1;
        job.ticksLeft = 1;
        blk.redundancyLoss = false;
        pushTrace("ok", "NvM_JobEndNotification", "NvM Core", "Ghi xong NV #0 -> Tiếp tục ghi bản sao NV #1 (REDUNDANT)", "Khối REDUNDANT tự động ghi đồng bộ tiếp bản sao NV #1.");
        updateDerivedRegisters();
        if (typeof renderAll === "function") renderAll();
        return;
      }

      if (blk.writeVerification) {
        job.phase = "WRITE_VERIFY";
        job.ticksLeft = 1;
        simState.jobState = "NVM_WRITE_VERIFY";
        simState.stackState = "STACK_VERIFY_READ";
        simState.activeArrows = ["arr_fls_nvm", "arr_nvm_memif"];
        pushTrace("info", "NvM Core", "MemIf Readback", "WriteVerification: MemIf_Read() đối chiếu lại từng byte", "Bật NvMWriteVerification=TRUE -> Đọc ngược dữ liệu vừa ghi từ Flash để xác minh toàn vẹn (SWS_NvM_00842).");
        updateDerivedRegisters();
        if (typeof renderAll === "function") renderAll();
        return;
      }

      blk.ramChanged = false;
      blk.ramValid = true;
      if (blk.writeOnce) { blk.writeOnceLocked = true; blk.writeProtected = true; ecucConfig.NvMBlockWriteProt = true; }
      recomputeBlockMetadata(blk);
      finishActiveJob(blk, "NVM_REQ_OK", "Ghi NV hoàn tất thành công (" + (job.isImmediate ? "Immediate Prio=0" : "Standard") + ").");
      if (typeof renderAll === "function") renderAll();
      return;
    }

    if (job.phase === "WRITE_VERIFY") {
      simState.lastWriteVerifyOk = true;
      blk.ramChanged = false;
      blk.ramValid = true;
      blk.redundancyLoss = false;
      if (blk.writeOnce) { blk.writeOnceLocked = true; blk.writeProtected = true; ecucConfig.NvMBlockWriteProt = true; }
      recomputeBlockMetadata(blk);
      syncConfigToDOM();
      finishActiveJob(blk, "NVM_REQ_OK", "WRITE VERIFICATION PASSED: Dữ liệu đọc ngược từ Flash khớp 100% RAM/Mirror!" + (blk.writeOnce ? " Đã kích hoạt khóa vĩnh viễn WR_ONCE_LOCKED=1." : ""));
      if (typeof renderAll === "function") renderAll();
      return;
    }

    if (job.phase === "RESTORE_ROM") {
      const romSrc = (blk.blockType === "NVM_BLOCK_DATASET" && blk.datasetSlots && blk.dataIndex >= blk.nvBlockNum && blk.datasetSlots[blk.dataIndex])
        ? blk.datasetSlots[blk.dataIndex].data
        : blk.romData;
      blk.ramData = romSrc.slice();
      blk.mirrorData = romSrc.slice();
      blk.ramValid = true;
      blk.ramChanged = true;
      blk.restoredFromRom = true;
      recomputeBlockMetadata(blk);
      finishActiveJob(blk, "NVM_REQ_RESTORED_FROM_ROM", "Khôi phục mặc định ROM/InitCallback -> RAM (" + bytesToHex(blk.ramData) + "). Đánh dấu CHANGED_SW=1.");
      if (typeof renderAll === "function") renderAll();
      return;
    }

    if (job.phase === "MEMIF_INVALIDATE") {
      const c0 = getActiveNvCopy(blk, 0);
      if (c0) c0.invalidated = true;
      if (blk.blockType === "NVM_BLOCK_REDUNDANT" && blk.nvCopies[1]) blk.nvCopies[1].invalidated = true;
      finishActiveJob(blk, "NVM_REQ_OK", "Đã Invalidate khối #" + blk.id + " (Metadata Fee = INVALID, RAM không bị xóa).");
      if (typeof renderAll === "function") renderAll();
      return;
    }

    if (job.phase === "MEMIF_ERASE") {
      job.ticksLeft -= 1;
      if (job.ticksLeft > 0) {
        pushTrace("warn", "Fls Driver", "NvM Core", "Fls_Erase() đang xóa sector vật lý...", "Đang thực thi Erase Immediate Block.");
        updateDerivedRegisters();
        if (typeof renderAll === "function") renderAll();
        return;
      }
      const c0 = getActiveNvCopy(blk, 0);
      if (c0) { c0.erased = true; c0.data = c0.data.map(() => 0xFF); c0.storedCrc = "0xFFFF"; }
      finishActiveJob(blk, "NVM_REQ_OK", "Đã xóa vật lý NV Block #" + blk.id + " (Dữ liệu Flash = 0xFF ERASED).");
      if (typeof renderAll === "function") renderAll();
      return;
    }
  }

  if (simState.multiBlockJob) {
    if (simState.multiBlockJob.type === "READ_ALL") stepSingleReadAllBlock();
    else if (simState.multiBlockJob.type === "WRITE_ALL") stepSingleWriteAllBlock();
  }

  updateDerivedRegisters();
  if (typeof renderAll === "function") renderAll();
}
