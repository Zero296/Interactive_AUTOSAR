// ============================================================================
// PART 4: FEE SIMULATION ENGINE, 2-BANK DFLASH, GC, LUT, FAULTS & EXPORTS
// ============================================================================

const defaultConfig = {
  // Tab 0: 1. General
  FeeInitialized: true,
  FeeDevErrorDetect: true,
  FeeVersionInfoApi: false,
  FeePollingMode: false,
  FeeSetModeSupported: true,
  FeeMainFunctionPeriod: 5,

  // Tab 1: 2. Page/Hdr
  FeeVirtualPageSize: '8',
  FeeMinimumReadPageSize: 1,
  FeeBlockHeaderSize: 8,
  FeeEnableHeaderCrc: true,
  FeeValidTrailerPattern: '0xA5A5',
  FeeErasedValue: '0xFF',

  // Tab 2: 3. Blocks
  SelectedFeeBlock: '0x0010',
  FeeBlockNumber: '0x0010',
  FeeBlockSize: 14,
  FeeImmediateData: false,
  FeeNumberOfWriteCycles: 100000,
  FeeDatasetSelectionBits: 2,

  // Tab 3: 4. Banks/GC
  FeeBank0SizeBytes: 256,
  FeeBank1SizeBytes: 256,
  FeeGcTriggerThresholdPct: 75,
  FeeReservedImmediateSpaceBytes: 64,
  FeeEnableBackgroundGc: true,
  FeeMaxEraseCyclesPerSector: 100000,

  // Tab 4: 5. Fls/MemAcc
  FeeLowerLayerArchitecture: 'CLASSIC_FLS',
  ActiveMemIfMode: 'MEMIF_MODE_SLOW',
  FlsBytesPerCycleSlow: 8,
  FlsBytesPerCycleFast: 64,
  FlsSectorEraseDurationTicks: 3,
  FeeNvmJobNotificationsEnabled: true,

  // Tab 5: 6. Faults/Rec
  FeeEnableRamLutCache: true,
  SimulatePowerLossDuringWrite: false,
  FeeAutoFallbackPreviousInstance: true,
  SimulateFlsWriteVerifyError: false,
  SimulateFlsEraseError: false,
  SimulateFlashEccBitFlip: false
};

let ecucConfig = { ...defaultConfig };

// Mutable block properties table synchronized when user edits Tab 2 fields
let runtimeBlockCatalog = {};
function resetRuntimeBlockCatalog() {
  runtimeBlockCatalog = {};
  Object.keys(BLOCK_CATALOG).forEach((k) => {
    runtimeBlockCatalog[k] = { ...BLOCK_CATALOG[k] };
  });
}
resetRuntimeBlockCatalog();

function alignUp(val, align) {
  const a = Math.max(1, Number(align) || 1);
  return Math.ceil(Math.max(1, Number(val) || 1) / a) * a;
}

function getErasedByteLabel(cfg = ecucConfig) {
  return (cfg.FeeErasedValue || '0xFF').trim();
}

function getTrailerPatternLabel(cfg = ecucConfig) {
  return (cfg.FeeValidTrailerPattern || '0xA5A5').trim();
}

function getBlockMeta(blockId, cfg = ecucConfig) {
  const base = runtimeBlockCatalog[blockId] || BLOCK_CATALOG[blockId];
  if (base) {
    return base;
  }
  return {
    id: blockId || '0x0010',
    name: 'Blk_Custom_' + (blockId || '0010'),
    size: Number(cfg.FeeBlockSize) || 14,
    immediate: Boolean(cfg.FeeImmediateData),
    writeCycles: Number(cfg.FeeNumberOfWriteCycles) || 100000,
    datasetBits: Number(cfg.FeeDatasetSelectionBits) || 2,
    description: 'Custom Fee Block'
  };
}

function calcSlotGeometry(rawSize, cfg = ecucConfig) {
  const vp = Math.max(4, Number(cfg.FeeVirtualPageSize) || 8);
  const hdrRaw = Math.max(4, Number(cfg.FeeBlockHeaderSize) || 8);
  const hdrSize = alignUp(hdrRaw, vp);
  const cleanRaw = Math.max(1, Number(rawSize) || 1);
  const alignedPayload = alignUp(cleanRaw, vp);
  const paddingBytes = alignedPayload - cleanRaw;
  const totalBytes = hdrSize + alignedPayload;
  return { vp, hdrSize, rawSize: cleanRaw, alignedPayload, paddingBytes, totalBytes };
}

function getLowerApiNames(cfg = ecucConfig) {
  const isR23 = cfg.FeeLowerLayerArchitecture === 'R23_MEMACC';
  return {
    isR23,
    modName: isR23 ? 'MemAcc' : 'Fls',
    subLabel: isR23 ? 'MemAcc_Write / Read / Erase (R23)' : 'Fls_Write / Read / Erase',
    write: isR23 ? 'MemAcc_Write' : 'Fls_Write',
    read: isR23 ? 'MemAcc_Read' : 'Fls_Read',
    erase: isR23 ? 'MemAcc_Erase' : 'Fls_Erase',
    cancel: isR23 ? 'MemAcc_Cancel' : 'Fls_Cancel',
    getJobResult: isR23 ? 'MemAcc_GetJobResult' : 'Fls_GetJobResult',
    mainFn: isR23 ? 'MemAcc_MainFunction' : 'Fls_MainFunction'
  };
}

let simState = null;

function makeSlotRecord({
  bankId,
  offset,
  blockId,
  blockName,
  seq,
  rawSize,
  geom,
  immediate,
  status,
  dataPreview,
  hdrWritten = true,
  dataAligned = true,
  validTrailer = true,
  invalidated = false,
  inconsistent = false,
  lutCached = false
}) {
  return {
    uid: `B${bankId}_0x${offset.toString(16).toUpperCase().padStart(2, '0')}_${blockId}_S${seq}`,
    bankId,
    offset,
    blockId,
    blockName,
    seq,
    rawSize,
    hdrSize: geom.hdrSize,
    alignedPayload: geom.alignedPayload,
    paddingBytes: geom.paddingBytes,
    totalBytes: geom.totalBytes,
    vpSize: geom.vp,
    immediate: Boolean(immediate),
    status, // VALID | SUPERSEDED | INVALIDATED | INCONSISTENT | WRITING_HDR | WRITING_DATA
    dataPreview: dataPreview || '0x11 0x22 0x33 ...',
    hdrWritten,
    dataAligned,
    validTrailer,
    invalidated,
    inconsistent,
    lutCached
  };
}

function getBankCapacity(bankId, cfg = ecucConfig) {
  return bankId === 0
    ? Math.max(64, Number(cfg.FeeBank0SizeBytes) || 256)
    : Math.max(64, Number(cfg.FeeBank1SizeBytes) || 256);
}

function getBankStats(bankId, cfg = ecucConfig) {
  const bank = simState.banks[bankId];
  const capacity = getBankCapacity(bankId, cfg);
  bank.size = capacity;

  let usedBytes = 0;
  let validBytes = 0;
  let garbageBytes = 0;
  let validCount = 0;

  for (const s of bank.slots) {
    const end = s.offset + s.totalBytes;
    if (end > usedBytes) usedBytes = end;
    if (s.status === 'VALID' || s.status === 'WRITING_HDR' || s.status === 'WRITING_DATA') {
      validBytes += s.totalBytes;
      if (s.status === 'VALID') validCount += 1;
    } else {
      garbageBytes += s.totalBytes;
    }
  }

  const thrPct = Math.min(98, Math.max(40, Number(cfg.FeeGcTriggerThresholdPct) || 75));
  const reservedImmBytes = Math.min(capacity, Math.max(16, Number(cfg.FeeReservedImmediateSpaceBytes) || 64));
  const thresholdBytes = Math.floor(capacity * (thrPct / 100));
  const standardLimitBytes = Math.max(32, Math.min(thresholdBytes, capacity - reservedImmBytes));
  const freeStdBytes = Math.max(0, standardLimitBytes - usedBytes);
  const freeTotalBytes = Math.max(0, capacity - usedBytes);
  const usedPct = Math.min(100, Math.round((usedBytes / capacity) * 100));

  return {
    capacity,
    usedBytes,
    validBytes,
    garbageBytes,
    validCount,
    reservedImmBytes,
    thresholdBytes,
    standardLimitBytes,
    freeStdBytes,
    freeTotalBytes,
    usedPct
  };
}

function rebuildRamLutFromFlash() {
  if (!ecucConfig.FeeEnableRamLutCache) {
    simState.lut = {};
    return;
  }
  const nextLut = {};
  for (const bank of simState.banks) {
    for (const s of bank.slots) {
      s.lutCached = false;
      if (s.status === 'VALID' || s.status === 'INVALIDATED') {
        const prev = nextLut[s.blockId];
        if (!prev || s.seq >= prev.seq) {
          nextLut[s.blockId] = {
            blockId: s.blockId,
            blockName: s.blockName,
            bankId: bank.id,
            offset: s.offset,
            seq: s.seq,
            size: s.rawSize,
            totalBytes: s.totalBytes,
            immediate: s.immediate,
            status: s.status === 'INVALIDATED' ? 'INVALIDATED' : 'VALID'
          };
        }
      }
    }
  }
  Object.values(nextLut).forEach((entry) => {
    const bank = simState.banks[entry.bankId];
    const matched = bank.slots.find((x) => x.offset === entry.offset && x.blockId === entry.blockId && x.seq === entry.seq);
    if (matched) matched.lutCached = true;
  });
  simState.lut = nextLut;
}

function buildSeedBankSlots(seedPreset) {
  const bank0 = {
    id: 0,
    name: 'Bank 0',
    baseAddr: 0x08000000,
    size: getBankCapacity(0),
    eraseCount: 1,
    state: 'BANK_ACTIVE',
    slots: []
  };
  const bank1 = {
    id: 1,
    name: 'Bank 1',
    baseAddr: 0x08001000,
    size: getBankCapacity(1),
    eraseCount: 1,
    state: 'BANK_ERASED_STANDBY',
    slots: []
  };

  if (seedPreset === 'EMPTY') {
    return [bank0, bank1];
  }

  let cursor = 0;
  const appendToB0 = (blockId, seq, status, preview) => {
    const m = getBlockMeta(blockId);
    const geom = calcSlotGeometry(m.size);
    const rec = makeSlotRecord({
      bankId: 0,
      offset: cursor,
      blockId,
      blockName: m.name,
      seq,
      rawSize: m.size,
      geom,
      immediate: m.immediate,
      status,
      dataPreview: preview,
      hdrWritten: true,
      dataAligned: status !== 'INCONSISTENT',
      validTrailer: status === 'VALID' || status === 'SUPERSEDED',
      invalidated: status === 'INVALIDATED',
      inconsistent: status === 'INCONSISTENT',
      lutCached: status === 'VALID' || status === 'INVALIDATED'
    });
    bank0.slots.push(rec);
    cursor += geom.totalBytes;
  };

  if (seedPreset === 'DEFAULT_LIGHT') {
    appendToB0('0x0010', 1, 'VALID', '0x00 0x01 0x8A [ODO=101,000km]');
    appendToB0('0x0020', 1, 'VALID', '0x12 0xA8 0x04 [EngCalib_DS0=+2%]');
  } else if (seedPreset === 'NEAR_THRESHOLD') {
    appendToB0('0x0010', 1, 'SUPERSEDED', '0x00 0x01 0x70 [ODO=94,000km Old]');
    appendToB0('0x0020', 1, 'SUPERSEDED', '0x10 0x90 [EngCalib Old #1]');
    appendToB0('0x0040', 1, 'VALID', '57 56 57 ... [VIN Coding 17B]');
    appendToB0('0x0010', 2, 'SUPERSEDED', '0x00 0x01 0x80 [ODO=98,200km Old]');
    appendToB0('0x0021', 1, 'VALID', '0x11 0xA0 [EngCalib_DS1]');
    appendToB0('0x0010', 3, 'VALID', '0x00 0x01 0x92 [ODO=102,400km]');
    appendToB0('0x0020', 2, 'VALID', '0x12 0xA8 [EngCalib_DS0 Latest]');
  } else if (seedPreset === 'GC_READY_MIXED') {
    appendToB0('0x0010', 1, 'SUPERSEDED', '0x00 0x01 0x10 [ODO #1]');
    appendToB0('0x0020', 1, 'SUPERSEDED', '0x08 0x11 [EngCalib #1]');
    appendToB0('0x0010', 2, 'SUPERSEDED', '0x00 0x01 0x55 [ODO #2]');
    appendToB0('0x0020', 2, 'SUPERSEDED', '0x09 0x22 [EngCalib #2]');
    appendToB0('0x0040', 1, 'VALID', '56 49 4E [VIN=17B Valid]');
    appendToB0('0x0010', 3, 'VALID', '0x00 0x01 0x95 [Latest ODO]');
    appendToB0('0x0030', 1, 'VALID', '0xC4 0x01 [Crash Flag=0]');
  }

  return [bank0, bank1];
}

function createInitialSimState(seedPreset = 'DEFAULT_LIGHT', opts = {}) {
  const isUninit = Boolean(opts.uninit);
  const banks = buildSeedBankSlots(seedPreset);
  const state = {
    clockMs: 0,
    activeBank: 0,
    banks,
    lut: {},
    nextSeqByBlock: {
      '0x0010': 10,
      '0x0020': 10,
      '0x0021': 10,
      '0x0030': 10,
      '0x0040': 10
    },
    moduleState: isUninit ? 'MEMIF_UNINIT' : 'MEMIF_IDLE',
    jobResult: 'MEMIF_JOB_OK',
    moduleSmState: isUninit ? 'UNINIT' : 'IDLE',
    sectorSmState: 'ACTIVE_NORMAL',
    activeJob: null,
    pendingUserJob: null,
    gcState: {
      active: false,
      phase: 'NONE', // NONE | GC_COPY_VALID | GC_SWITCH_BANK | GC_ERASE_OLD
      pausedByImmediate: false,
      srcBank: 0,
      dstBank: 1,
      itemsToCopy: [],
      copiedCount: 0,
      eraseTicksDone: 0,
      eraseTicksTotal: 3
    },
    immediatePreemptActive: false,
    powerLossOccurred: false,
    lastReadBuffer: '--',
    lastReadSliceText: 'Full Block',
    lastErrorDet: null,
    lastErrorDem: null,
    selectedSlotUid: null,
    selectedModule: 'MOD_FEE',
    activeArrows: ['arr_ecum_fee'],
    activeModules: ['MOD_ECUM', 'MOD_FEE'],
    moduleRegByte: isUninit ? 0x00 : 0x81,
    headerRegByte: 0xE8,
    stepLog: [],
    trace: [],
    codeSnippets: [
      {
        title: 'Fee_Init & Startup Scan',
        code: `Fee_Init(&Fee_Config);\n/* Scan Bank 0 / Bank 1 & rebuild RAM LUT */\nwhile (Fee_GetStatus() != MEMIF_IDLE) {\n  Fee_MainFunction();\n  Fls_MainFunction();\n}`
      }
    ],
    stats: {
      totalWrites: 0,
      totalReads: 0,
      totalGcRuns: 0,
      detCount: 0,
      demCount: 0,
      lastLatencyMs: 0
    }
  };

  simState = state;
  recomputeNextSeqCounters();
  if (!isUninit) {
    rebuildRamLutFromFlash();
    const firstValid = state.banks[state.activeBank].slots.find((x) => x.status === 'VALID');
    if (firstValid) state.selectedSlotUid = firstValid.uid;
  } else {
    state.lut = {};
    for (const b of state.banks) {
      for (const s of b.slots) s.lutCached = false;
    }
    const firstValid = state.banks[state.activeBank].slots.find((x) => x.status === 'VALID');
    if (firstValid) state.selectedSlotUid = firstValid.uid;
  }
  syncBitRegistersFromState();
  return state;
}

function recomputeNextSeqCounters() {
  if (!simState) return;
  const maxByBlk = { '0x0010': 0, '0x0020': 0, '0x0021': 0, '0x0030': 0, '0x0040': 0 };
  for (const bank of simState.banks) {
    for (const s of bank.slots) {
      if ((maxByBlk[s.blockId] || 0) < s.seq) {
        maxByBlk[s.blockId] = s.seq;
      }
    }
  }
  Object.keys(maxByBlk).forEach((k) => {
    simState.nextSeqByBlock[k] = maxByBlk[k] + 1;
  });
}

function getInspectedSlot() {
  if (!simState) return null;
  for (const b of simState.banks) {
    const found = b.slots.find((s) => s.uid === simState.selectedSlotUid);
    if (found) return found;
  }
  const activeSlots = simState.banks[simState.activeBank].slots;
  if (activeSlots.length > 0) return activeSlots[activeSlots.length - 1];
  const otherSlots = simState.banks[1 - simState.activeBank].slots;
  if (otherSlots.length > 0) return otherSlots[otherSlots.length - 1];
  return null;
}

function syncBitRegistersFromState() {
  if (!simState) return;

  // Thanh A: Fee_ModuleControlByte
  let regA = 0;
  if (ecucConfig.FeeInitialized && simState.moduleState !== 'MEMIF_UNINIT') regA |= 0x80; // B7 FEE_INIT
  if (simState.moduleState === 'MEMIF_BUSY' || (simState.activeJob && !simState.gcState.active)) regA |= 0x40; // B6 FEE_BUSY
  if (simState.moduleState === 'MEMIF_BUSY_INTERNAL' || (simState.gcState && simState.gcState.active)) regA |= 0x20; // B5 FEE_BUSY_INT
  if (ecucConfig.ActiveMemIfMode === 'MEMIF_MODE_FAST') regA |= 0x10; // B4 FAST_MODE
  if (simState.gcState && simState.gcState.active) regA |= 0x08; // B3 GC_ACTIVE
  if (simState.immediatePreemptActive || (simState.activeJob && simState.activeJob.immediate)) regA |= 0x04; // B2 IMM_PREEMPT
  if (['MEMIF_JOB_FAILED', 'MEMIF_BLOCK_INCONSISTENT', 'MEMIF_BLOCK_INVALID', 'MEMIF_JOB_CANCELED'].includes(simState.jobResult)) regA |= 0x02; // B1 JOB_ERR_PEND
  if (simState.jobResult === 'MEMIF_JOB_OK' && simState.moduleState === 'MEMIF_IDLE') regA |= 0x01; // B0 JOB_OK_DONE
  simState.moduleRegByte = regA;

  // Thanh B: Fee_BlockHeaderStatusByte
  const slot = getInspectedSlot();
  let regB = 0;
  if (slot) {
    if (slot.hdrWritten) regB |= 0x80; // B7 HDR_WRITTEN
    if (slot.dataAligned) regB |= 0x40; // B6 DATA_ALIGNED
    if (slot.validTrailer) regB |= 0x20; // B5 VALID_TRAILR
    if (slot.immediate) regB |= 0x10; // B4 IMM_BLOCK
    if (slot.lutCached && ecucConfig.FeeEnableRamLutCache && simState.moduleState !== 'MEMIF_UNINIT') regB |= 0x08; // B3 LUT_CACHED
    if (slot.status === 'SUPERSEDED') regB |= 0x04; // B2 SUPERSEDED
    if (slot.status === 'INVALIDATED' || slot.invalidated) regB |= 0x02; // B1 INVALIDATED
    if (slot.status === 'INCONSISTENT' || slot.inconsistent) regB |= 0x01; // B0 INCONSISTENT
  }
  simState.headerRegByte = regB;
}

function addTrace(module, api, detail, tag = 'INFO') {
  if (!simState) return;
  simState.trace.unshift({
    timeMs: simState.clockMs,
    module,
    api,
    detail,
    tag
  });
  if (simState.trace.length > 80) simState.trace.pop();
}

function pushStepLog(text) {
  if (!simState) return;
  simState.stepLog.push(`[${simState.clockMs}ms] ${text}`);
  if (simState.stepLog.length > 30) simState.stepLog.shift();
}

function setCodeSnippet(title, code) {
  if (!simState) return;
  simState.codeSnippets = [{ title, code }];
}

function reportDet(errorKey, apiName) {
  const err = FEE_DET_CATALOG[errorKey] || { id: '0xFF', name: errorKey, desc: 'Development Error' };
  simState.stats.detCount += 1;
  simState.lastErrorDet = { ...err, apiName, timeMs: simState.clockMs };
  if (ecucConfig.FeeDevErrorDetect) {
    addTrace('DET', `Det_ReportError(21, 0, ${apiName}, ${err.name})`, `[${err.id}] ${err.desc}`, 'ERR');
    pushStepLog(`DET Error ${err.name} (${err.id}) khi gọi ${apiName}`);
    simState.activeArrows = ['arr_fee_det'];
    simState.activeModules = ['MOD_FEE', 'MOD_DET'];
  } else {
    addTrace('Fee', `${apiName}()`, `Bỏ qua DET ${err.name} vì FeeDevErrorDetect=FALSE`, 'WARN');
  }
}

function reportDem(eventId, status) {
  simState.stats.demCount += 1;
  simState.lastErrorDem = { eventId, status, timeMs: simState.clockMs };
  addTrace('DEM', `Dem_SetEventStatus(${eventId}, DEM_EVENT_STATUS_${status})`, `Báo cáo lỗi phần cứng Flash lên Diagnostic Event Manager`, 'ERR');
  pushStepLog(`DEM Reported: ${eventId} = ${status}`);
  simState.activeArrows = ['arr_fee_dem', 'arr_fee_fls'];
  simState.activeModules = ['MOD_FEE', 'MOD_DEM', 'MOD_FLS'];
}

function apiFeeInit(reason = 'Cold/Warm Startup') {
  ecucConfig.FeeInitialized = true;
  simState.powerLossOccurred = false;
  simState.activeJob = null;
  simState.pendingUserJob = null;
  simState.immediatePreemptActive = false;
  simState.gcState = {
    active: false,
    phase: 'NONE',
    pausedByImmediate: false,
    srcBank: simState.activeBank,
    dstBank: 1 - simState.activeBank,
    itemsToCopy: [],
    copiedCount: 0,
    eraseTicksDone: 0,
    eraseTicksTotal: Number(ecucConfig.FlsSectorEraseDurationTicks) || 3
  };

  // Detect active bank cleanly (whichever is BANK_ACTIVE, fallback bank 0)
  const b0Active = simState.banks[0].state === 'BANK_ACTIVE';
  const b1Active = simState.banks[1].state === 'BANK_ACTIVE';
  if (b1Active && !b0Active) simState.activeBank = 1;
  else simState.activeBank = 0;

  // Startup Scan: scan active bank for any INCONSISTENT torn writes and report recovery
  const activeSlots = simState.banks[simState.activeBank].slots;
  let tornCount = 0;
  let recoveredCount = 0;
  for (const s of activeSlots) {
    if (s.status === 'INCONSISTENT') {
      tornCount += 1;
      if (ecucConfig.FeeAutoFallbackPreviousInstance) {
        const olderValid = [...activeSlots].reverse().find(
          (x) => x.blockId === s.blockId && x.seq < s.seq && (x.status === 'VALID' || x.status === 'SUPERSEDED')
        );
        if (olderValid) {
          olderValid.status = 'VALID';
          recoveredCount += 1;
        }
      }
    }
  }

  recomputeNextSeqCounters();
  rebuildRamLutFromFlash();

  simState.moduleState = 'MEMIF_IDLE';
  simState.jobResult = 'MEMIF_JOB_OK';
  simState.moduleSmState = 'IDLE';
  simState.sectorSmState = 'ACTIVE_NORMAL';
  simState.activeArrows = ['arr_ecum_fee', 'arr_fee_fls', 'arr_fls_dflash'];
  simState.activeModules = ['MOD_ECUM', 'MOD_FEE', 'MOD_FLS', 'MOD_DFLASH'];

  const lutEntries = Object.keys(simState.lut).length;
  addTrace(
    'Fee',
    'Fee_Init(&Fee_Config)',
    `${reason}: Scan Bank ${simState.activeBank}, ${lutEntries} entries trong RAM LUT${tornCount > 0 ? `, phát hiện ${tornCount} Torn Write -> Fallback ${recoveredCount} block` : ''}`,
    tornCount > 0 ? 'WARN' : 'OK'
  );
  pushStepLog(`Fee_Init() hoàn tất: Active=Bank ${simState.activeBank}, RAM LUT=${lutEntries} blocks.`);
  setCodeSnippet(
    'Fee_Init(&Fee_Config) — Startup Scan & LUT Build',
    `EcuM_StartupTwo() -> Fee_Init(&Fee_Config);\n/* Scan Active Bank ${simState.activeBank}, kiem tra Trailer ${getTrailerPatternLabel()} */\n/* Ton tai ${lutEntries} valid block trong Fee_BlockLutCache[] */\n${tornCount > 0 ? `/* Fallback thanh cong ${recoveredCount} block truoc do sau Torn Write! */` : '/* Flash sach se, khong co Torn Write */'}`
  );
  syncBitRegistersFromState();
  return 'E_OK';
}

function apiFeeSetMode(newMode) {
  if (!ecucConfig.FeeInitialized || simState.moduleState === 'MEMIF_UNINIT') {
    reportDet('FEE_E_UNINIT', 'Fee_SetMode');
    return 'E_NOT_OK';
  }
  if (!ecucConfig.FeeSetModeSupported) {
    addTrace('Fee', `Fee_SetMode(${newMode})`, 'Bị từ chối vì FeeSetModeSupported = FALSE', 'WARN');
    return 'E_NOT_OK';
  }
  if (simState.moduleState === 'MEMIF_BUSY') {
    reportDet('FEE_E_BUSY', 'Fee_SetMode');
    return 'E_NOT_OK';
  }
  ecucConfig.ActiveMemIfMode = newMode;
  const lowApi = getLowerApiNames();
  const throughput = newMode === 'MEMIF_MODE_FAST' ? ecucConfig.FlsBytesPerCycleFast : ecucConfig.FlsBytesPerCycleSlow;
  simState.activeArrows = ['arr_ecum_fee', 'arr_nvm_memif', 'arr_memif_fee', 'arr_fee_fls'];
  simState.activeModules = ['MOD_ECUM', 'MOD_NVM', 'MOD_MEMIF', 'MOD_FEE', 'MOD_FLS'];
  addTrace('Fee', `Fee_SetMode(${newMode})`, `Chuyển tốc độ ${lowApi.modName} sang ${throughput} B/tick`, 'OK');
  pushStepLog(`Fee_SetMode -> ${newMode} (${throughput} B/tick)`);
  setCodeSnippet(
    `Fee_SetMode(${newMode})`,
    `MemIf_SetMode(${newMode});\n  -> Fee_SetMode(${newMode});\n  -> ${lowApi.modName}_SetMode(${newMode}); /* ${throughput} bytes/tick */`
  );
  syncBitRegistersFromState();
  return 'E_OK';
}

function apiFeeWrite(blockId, dataPayloadStr, opts = {}) {
  if (!ecucConfig.FeeInitialized || simState.moduleState === 'MEMIF_UNINIT') {
    reportDet('FEE_E_UNINIT', 'Fee_Write');
    return 'E_NOT_OK';
  }

  const blockNumCheck = String(opts.explicitBlockNumber || ecucConfig.FeeBlockNumber || blockId).toUpperCase();
  if (blockNumCheck === '0X0000' || blockNumCheck === '0XFFFF' || !blockId) {
    reportDet('FEE_E_INVALID_BLOCK_NO', 'Fee_Write');
    return 'E_NOT_OK';
  }
  if (opts.nullPtr) {
    reportDet('FEE_E_PARAM_POINTER', 'Fee_Write');
    return 'E_NOT_OK';
  }

  const meta = getBlockMeta(blockId);
  const isImmediate = Boolean(opts.immediate !== undefined ? opts.immediate : meta.immediate);

  // If currently BUSY with a user job -> DET FEE_E_BUSY
  if (simState.activeJob && !isImmediate) {
    reportDet('FEE_E_BUSY', 'Fee_Write');
    return 'E_NOT_OK';
  }
  if (simState.moduleState === 'MEMIF_BUSY' && !isImmediate) {
    reportDet('FEE_E_BUSY', 'Fee_Write');
    return 'E_NOT_OK';
  }

  const rawSize = Number(opts.overrideSize || meta.size) || 14;
  const geom = calcSlotGeometry(rawSize);
  const activeId = simState.activeBank;
  const bStats = getBankStats(activeId);

  const lowApi = getLowerApiNames();
  const jobSpec = {
    type: 'WRITE',
    blockId,
    blockName: meta.name,
    rawSize,
    geom,
    immediate: isImmediate,
    dataPreview: dataPayloadStr || `0xA1 0xB2 [${meta.name} New]`,
    phase: 'WRITE_HEADER', // WRITE_HEADER -> WRITE_PAYLOAD -> WRITE_TRAILER
    startClockMs: simState.clockMs,
    bytesWritten: 0,
    totalBytes: geom.totalBytes,
    targetSlotUid: null,
    simulateTornWrite: Boolean(opts.forceTornWrite || ecucConfig.SimulatePowerLossDuringWrite)
  };

  // Immediate Block preempting active GC!
  if (isImmediate && simState.gcState && simState.gcState.active) {
    simState.gcState.pausedByImmediate = true;
    simState.immediatePreemptActive = true;
    simState.sectorSmState = 'IMMEDIATE_PREEMPT_ZONE';
    if (bStats.usedBytes + geom.totalBytes <= bStats.capacity) {
      startWriteJobIntoActiveBank(jobSpec);
      addTrace(
        'Fee',
        `Fee_Write(${blockId}, IMM_PREEMPT)`,
        `[SWS_Fee_00060] Immediate Block xen ngang GC! Ghi khẩn ${geom.totalBytes}B vào Reserved Zone Bank ${activeId}.`,
        'WARN'
      );
      pushStepLog(`Immediate Preemption: Tạm dừng GC để ghi ${meta.name} (${blockId}) vào Reserved Zone!`);
      syncBitRegistersFromState();
      return 'E_OK';
    }
  }

  // Check if fits within threshold (standard) or full capacity (immediate)
  const limitBytes = isImmediate ? bStats.capacity : bStats.standardLimitBytes;
  if (bStats.usedBytes + geom.totalBytes > limitBytes) {
    if (!simState.gcState.active) {
      startGarbageCollectionInternal(jobSpec);
      addTrace(
        'Fee',
        `Fee_Write(${blockId}) -> Trigger GC`,
        `Bank ${activeId} đã dùng ${bStats.usedBytes}B / Ngưỡng Standard ${bStats.standardLimitBytes}B. Khởi chạy Garbage Collection trước khi ghi ${geom.totalBytes}B!`,
        'WARN'
      );
      pushStepLog(`Vượt ngưỡng ${ecucConfig.FeeGcTriggerThresholdPct}% -> Bật GC thu hồi rác trước khi ghi ${blockId}`);
      syncBitRegistersFromState();
      return 'E_OK';
    }
    reportDet('FEE_E_BUSY', 'Fee_Write');
    return 'E_NOT_OK';
  }

  startWriteJobIntoActiveBank(jobSpec);
  addTrace(
    'MemIf->Fee',
    `Fee_Write(${blockId}, &SrcBuf)`,
    `Chấp nhận Async Write: Raw=${rawSize}B + Pad=${geom.paddingBytes}B + Hdr=${geom.hdrSize}B => Slot ${geom.totalBytes}B (Mode: ${ecucConfig.ActiveMemIfMode})`,
    'INFO'
  );
  pushStepLog(`Bắt đầu Fee_Write(${blockId}): Slot ${geom.totalBytes}B (VP=${geom.vp}B) trên Bank ${activeId}.`);
  setCodeSnippet(
    `Fee_Write(${blockId}) — Async 3-Phase Pipeline`,
    `NvM_WriteBlock(NvM_${meta.name}, &RamMirror);\n  -> MemIf_Write(0, ${blockId}, DataPtr);\n  -> Fee_Write(${blockId}, DataPtr); /* ${geom.totalBytes}B */\n/* Phase 1: ${lowApi.write}(Hdr) -> Phase 2: ${lowApi.write}(Data+Pad) -> Phase 3: Trailer ${getTrailerPatternLabel()} */`
  );
  syncBitRegistersFromState();
  return 'E_OK';
}

function startWriteJobIntoActiveBank(jobSpec) {
  const bank = simState.banks[simState.activeBank];
  const stats = getBankStats(simState.activeBank);
  const offset = stats.usedBytes;
  const seq = simState.nextSeqByBlock[jobSpec.blockId] || 1;
  simState.nextSeqByBlock[jobSpec.blockId] = seq + 1;

  const newSlot = makeSlotRecord({
    bankId: bank.id,
    offset,
    blockId: jobSpec.blockId,
    blockName: jobSpec.blockName,
    seq,
    rawSize: jobSpec.rawSize,
    geom: jobSpec.geom,
    immediate: jobSpec.immediate,
    status: 'WRITING_HDR',
    dataPreview: jobSpec.dataPreview,
    hdrWritten: false,
    dataAligned: false,
    validTrailer: false,
    invalidated: false,
    inconsistent: false,
    lutCached: false
  });

  bank.slots.push(newSlot);
  jobSpec.targetSlotUid = newSlot.uid;
  simState.activeJob = jobSpec;
  simState.selectedSlotUid = newSlot.uid;
  simState.moduleState = 'MEMIF_BUSY';
  simState.jobResult = 'MEMIF_JOB_PENDING';
  simState.moduleSmState = 'BUSY_USER_JOB';
  simState.stats.totalWrites += 1;

  if (jobSpec.immediate && offset >= stats.standardLimitBytes) {
    simState.sectorSmState = 'IMMEDIATE_PREEMPT_ZONE';
  }
  simState.activeArrows = ['arr_swc_rte', 'arr_rte_nvm', 'arr_nvm_memif', 'arr_memif_fee', 'arr_fee_fls', 'arr_fls_dflash'];
  simState.activeModules = ['MOD_SWC', 'MOD_RTE', 'MOD_NVM', 'MOD_MEMIF', 'MOD_FEE', 'MOD_FLS', 'MOD_DFLASH'];
}

function apiFeeRead(blockId, sliceOpts = { offset: 0, length: null, partialLabel: 'FULL' }) {
  if (!ecucConfig.FeeInitialized || simState.moduleState === 'MEMIF_UNINIT') {
    reportDet('FEE_E_UNINIT', 'Fee_Read');
    return 'E_NOT_OK';
  }
  const blockNumCheck = String(sliceOpts.explicitBlockNumber || blockId).toUpperCase();
  if (blockNumCheck === '0X0000' || blockNumCheck === '0XFFFF' || !blockId) {
    reportDet('FEE_E_INVALID_BLOCK_NO', 'Fee_Read');
    return 'E_NOT_OK';
  }
  if (sliceOpts.nullPtr) {
    reportDet('FEE_E_PARAM_POINTER', 'Fee_Read');
    return 'E_NOT_OK';
  }
  if (simState.moduleState === 'MEMIF_BUSY') {
    reportDet('FEE_E_BUSY', 'Fee_Read');
    return 'E_NOT_OK';
  }

  const meta = getBlockMeta(blockId);
  const readOfs = Number(sliceOpts.offset || 0);
  const readLen = sliceOpts.length !== null && sliceOpts.length !== undefined ? Number(sliceOpts.length) : meta.size;

  if (readOfs < 0 || readOfs >= meta.size) {
    reportDet('FEE_E_INVALID_BLOCK_OFS', 'Fee_Read');
    return 'E_NOT_OK';
  }
  if (readLen <= 0 || readOfs + readLen > meta.size) {
    reportDet('FEE_E_INVALID_BLOCK_LEN', 'Fee_Read');
    return 'E_NOT_OK';
  }

  const activeSlots = simState.banks[simState.activeBank].slots;
  const lutEntry = ecucConfig.FeeEnableRamLutCache ? simState.lut[blockId] : null;
  let targetSlot = null;

  if (lutEntry) {
    targetSlot = simState.banks[lutEntry.bankId].slots.find((s) => s.offset === lutEntry.offset && s.blockId === blockId);
  } else {
    // Linear Flash Scan from latest to oldest
    const latestValidOrInv = [...activeSlots].reverse().find(
      (s) => s.blockId === blockId && (s.status === 'VALID' || s.status === 'INVALIDATED' || s.status === 'INCONSISTENT')
    );
    targetSlot = latestValidOrInv || null;
  }

  const scanTicks = ecucConfig.FeeEnableRamLutCache ? 1 : 2;
  simState.stats.totalReads += 1;
  simState.lastReadSliceText = `Ofs=${readOfs}, Len=${readLen}/${meta.size}B`;

  simState.activeJob = {
    type: 'READ',
    blockId,
    blockName: meta.name,
    rawSize: readLen,
    offsetInBlock: readOfs,
    fullBlockSize: meta.size,
    phase: 'READ_DATA',
    startClockMs: simState.clockMs,
    ticksRemaining: scanTicks,
    totalTicks: scanTicks,
    targetSlotUid: targetSlot ? targetSlot.uid : null,
    usedLut: Boolean(lutEntry),
    bytesWritten: 0,
    totalBytes: readLen
  };

  if (targetSlot) simState.selectedSlotUid = targetSlot.uid;
  simState.moduleState = 'MEMIF_BUSY';
  simState.jobResult = 'MEMIF_JOB_PENDING';
  simState.moduleSmState = 'BUSY_USER_JOB';
  simState.activeArrows = ['arr_nvm_memif', 'arr_memif_fee', 'arr_fee_fls', 'arr_fls_fee', 'arr_fls_dflash'];
  simState.activeModules = ['MOD_NVM', 'MOD_MEMIF', 'MOD_FEE', 'MOD_FLS', 'MOD_DFLASH'];

  const lowApi = getLowerApiNames();
  const lookupMode = ecucConfig.FeeEnableRamLutCache ? 'O(1) RAM LUT Hit' : 'O(N) Linear Scan (LUT OFF)';
  addTrace('MemIf->Fee', `Fee_Read(${blockId}, ${readOfs}, Buf, ${readLen})`, `${lookupMode}, chuẩn bị ${lowApi.read}()`, 'INFO');
  pushStepLog(`Bắt đầu Fee_Read(${blockId}, Ofs=${readOfs}, Len=${readLen}B) qua ${lookupMode}.`);
  setCodeSnippet(
    `Fee_Read(${blockId}, Ofset=${readOfs}, Len=${readLen}B)`,
    `Fee_Read(${blockId}, ${readOfs}U, AppRxBuf, ${readLen}U);\n/* Lookup: ${lookupMode} */\n${lowApi.read}(${targetSlot ? `Bank${targetSlot.bankId} + 0x${(targetSlot.offset + targetSlot.hdrSize + readOfs).toString(16).toUpperCase()}` : '0xFFFF'}, AppRxBuf, ${readLen}U);`
  );
  syncBitRegistersFromState();
  return 'E_OK';
}

function apiFeeInvalidate(blockId) {
  if (!ecucConfig.FeeInitialized || simState.moduleState === 'MEMIF_UNINIT') {
    reportDet('FEE_E_UNINIT', 'Fee_InvalidateBlock');
    return 'E_NOT_OK';
  }
  if (!blockId || blockId === '0x0000' || blockId === '0xFFFF') {
    reportDet('FEE_E_INVALID_BLOCK_NO', 'Fee_InvalidateBlock');
    return 'E_NOT_OK';
  }
  if (simState.moduleState === 'MEMIF_BUSY') {
    reportDet('FEE_E_BUSY', 'Fee_InvalidateBlock');
    return 'E_NOT_OK';
  }

  const meta = getBlockMeta(blockId);
  const geom = calcSlotGeometry(4); // Invalidation header + minimal marker
  const bank = simState.banks[simState.activeBank];
  const stats = getBankStats(simState.activeBank);

  if (stats.usedBytes + geom.totalBytes > stats.capacity) {
    startGarbageCollectionInternal(null);
    return 'E_OK';
  }

  const seq = simState.nextSeqByBlock[blockId] || 1;
  simState.nextSeqByBlock[blockId] = seq + 1;
  const invSlot = makeSlotRecord({
    bankId: bank.id,
    offset: stats.usedBytes,
    blockId,
    blockName: meta.name,
    seq,
    rawSize: 0,
    geom,
    immediate: meta.immediate,
    status: 'WRITING_HDR',
    dataPreview: 'INVALID_MARKER (0x00)',
    hdrWritten: true,
    dataAligned: false,
    validTrailer: false,
    invalidated: true,
    inconsistent: false,
    lutCached: false
  });
  bank.slots.push(invSlot);
  simState.selectedSlotUid = invSlot.uid;

  simState.activeJob = {
    type: 'INVALIDATE',
    blockId,
    blockName: meta.name,
    phase: 'WRITE_INV_MARKER',
    startClockMs: simState.clockMs,
    ticksRemaining: 1,
    totalTicks: 1,
    targetSlotUid: invSlot.uid,
    bytesWritten: 0,
    totalBytes: geom.totalBytes
  };

  simState.moduleState = 'MEMIF_BUSY';
  simState.jobResult = 'MEMIF_JOB_PENDING';
  simState.moduleSmState = 'BUSY_USER_JOB';
  simState.activeArrows = ['arr_nvm_memif', 'arr_memif_fee', 'arr_fee_fls', 'arr_fls_dflash'];
  simState.activeModules = ['MOD_NVM', 'MOD_MEMIF', 'MOD_FEE', 'MOD_FLS', 'MOD_DFLASH'];

  addTrace('Fee', `Fee_InvalidateBlock(${blockId})`, 'Đang ghi Invalidation Marker lên DFlash (không xóa block cũ ngay)', 'WARN');
  pushStepLog(`Fee_InvalidateBlock(${blockId}): Xóa mềm logic -> Read sau sẽ trả MEMIF_BLOCK_INVALID.`);
  syncBitRegistersFromState();
  return 'E_OK';
}

function apiFeeEraseImmediateBlock(blockId) {
  if (!ecucConfig.FeeInitialized || simState.moduleState === 'MEMIF_UNINIT') {
    reportDet('FEE_E_UNINIT', 'Fee_EraseImmediateBlock');
    return 'E_NOT_OK';
  }
  const meta = getBlockMeta(blockId);
  if (!meta.immediate && !ecucConfig.FeeImmediateData) {
    addTrace('Fee', `Fee_EraseImmediateBlock(${blockId})`, 'Cảnh báo: Block không phải Immediate Data (FeeImmediateData=FALSE)', 'WARN');
  }

  const bank = simState.banks[simState.activeBank];
  // Remove superseded/old instances of this immediate block or prep reserved slot
  bank.slots.forEach((s) => {
    if (s.blockId === blockId && s.status === 'VALID') {
      s.status = 'SUPERSEDED';
      s.lutCached = false;
    }
  });
  rebuildRamLutFromFlash();
  simState.sectorSmState = 'IMMEDIATE_PREEMPT_ZONE';
  simState.jobResult = 'MEMIF_JOB_OK';
  simState.moduleState = 'MEMIF_IDLE';
  simState.moduleSmState = 'IDLE';

  addTrace('Fee', `Fee_EraseImmediateBlock(${blockId})`, 'Sẵn sàng vùng Reserved Immediate Zone cho ghi khẩn cấp (< 1ms)', 'OK');
  pushStepLog(`Fee_EraseImmediateBlock(${blockId}): Chuẩn bị sẵn không gian Crash Immediate.`);
  syncBitRegistersFromState();
  return 'E_OK';
}

function apiFeeCancel() {
  if (!ecucConfig.FeeInitialized || simState.moduleState === 'MEMIF_UNINIT') {
    reportDet('FEE_E_UNINIT', 'Fee_Cancel');
    return;
  }
  if (!simState.activeJob && simState.moduleState === 'MEMIF_IDLE') {
    reportDet('FEE_E_INVALID_CANCEL', 'Fee_Cancel');
    return;
  }

  // If writing slot wasn't committed yet -> mark INCONSISTENT (canceled mid-flight)
  if (simState.activeJob && simState.activeJob.targetSlotUid && simState.activeJob.type === 'WRITE') {
    const bank = simState.banks[simState.activeBank];
    const s = bank.slots.find((x) => x.uid === simState.activeJob.targetSlotUid);
    if (s && s.status !== 'VALID') {
      s.status = 'INCONSISTENT';
      s.inconsistent = true;
      s.validTrailer = false;
    }
  }

  const lowApi = getLowerApiNames();
  simState.activeJob = null;
  simState.immediatePreemptActive = false;
  simState.moduleState = simState.gcState && simState.gcState.active ? 'MEMIF_BUSY_INTERNAL' : 'MEMIF_IDLE';
  simState.moduleSmState = simState.gcState && simState.gcState.active ? 'BUSY_INTERNAL_GC' : 'IDLE';
  simState.jobResult = 'MEMIF_JOB_CANCELED';

  simState.activeArrows = ['arr_nvm_memif', 'arr_memif_fee', 'arr_fee_fls', 'arr_fee_nvm'];
  simState.activeModules = ['MOD_NVM', 'MOD_MEMIF', 'MOD_FEE', 'MOD_FLS'];
  addTrace('Fee', 'Fee_Cancel()', `Hủy job đang chạy, gọi ${lowApi.cancel}() -> JobResult = MEMIF_JOB_CANCELED`, 'WARN');
  pushStepLog('Fee_Cancel(): Job hiện tại bị hủy ngang -> MEMIF_JOB_CANCELED.');
  syncBitRegistersFromState();
}

function startGarbageCollectionInternal(pendingJobAfterGc = null) {
  const srcBank = simState.activeBank;
  const dstBank = 1 - srcBank;

  if (simState.banks[dstBank].slots.length > 0 && simState.banks[dstBank].state !== 'BANK_ERASED_STANDBY') {
    // Clean dstBank defensively if needed
    simState.banks[dstBank].slots = [];
    simState.banks[dstBank].state = 'BANK_ERASED_STANDBY';
  }

  // Collect latest VALID (and optionally VALIDATED/INVALIDATED) unique blocks from srcBank
  const latestMap = {};
  for (const s of simState.banks[srcBank].slots) {
    if (s.status === 'VALID') {
      if (!latestMap[s.blockId] || s.seq > latestMap[s.blockId].seq) {
        latestMap[s.blockId] = s;
      }
    }
  }
  const itemsToCopy = Object.values(latestMap);

  simState.banks[dstBank].state = 'BANK_GC_TARGET';
  simState.gcState = {
    active: true,
    phase: itemsToCopy.length > 0 ? 'GC_COPY_VALID' : 'GC_SWITCH_BANK',
    pausedByImmediate: false,
    srcBank,
    dstBank,
    itemsToCopy,
    copiedCount: 0,
    eraseTicksDone: 0,
    eraseTicksTotal: Math.max(1, Number(ecucConfig.FlsSectorEraseDurationTicks) || 3)
  };
  if (pendingJobAfterGc) {
    simState.pendingUserJob = pendingJobAfterGc;
  }
  simState.moduleState = 'MEMIF_BUSY_INTERNAL';
  simState.moduleSmState = 'BUSY_INTERNAL_GC';
  simState.sectorSmState = 'GC_COPYING_TO_STANDBY';
  simState.stats.totalGcRuns += 1;
  simState.activeArrows = ['arr_fee_fls', 'arr_fls_dflash', 'arr_fls_fee'];
  simState.activeModules = ['MOD_FEE', 'MOD_FLS', 'MOD_DFLASH'];

  pushStepLog(`Bắt đầu GC: Copy ${itemsToCopy.length} VALID block từ Bank ${srcBank} -> Bank ${dstBank}.`);
  syncBitRegistersFromState();
}

function injectTornWritePowerLoss(blockId = '0x0010') {
  if (!ecucConfig.FeeInitialized || simState.moduleState === 'MEMIF_UNINIT') {
    apiFeeInit('Auto-Init trước Inject Torn Write');
  }
  const meta = getBlockMeta(blockId);
  const geom = calcSlotGeometry(meta.size);
  const bank = simState.banks[simState.activeBank];
  const stats = getBankStats(simState.activeBank);

  if (stats.usedBytes + geom.totalBytes > stats.capacity) {
    bank.slots = bank.slots.slice(0, Math.max(1, bank.slots.length - 1));
  }
  const offset = getBankStats(simState.activeBank).usedBytes;
  const seq = simState.nextSeqByBlock[blockId] || 1;
  simState.nextSeqByBlock[blockId] = seq + 1;

  const tornSlot = makeSlotRecord({
    bankId: bank.id,
    offset,
    blockId,
    blockName: meta.name,
    seq,
    rawSize: meta.size,
    geom,
    immediate: meta.immediate,
    status: 'INCONSISTENT',
    dataPreview: '0xDE 0xAD [MẤT ĐIỆN GIỮA CHỪNG]',
    hdrWritten: true,
    dataAligned: false,
    validTrailer: false,
    invalidated: false,
    inconsistent: true,
    lutCached: false
  });
  bank.slots.push(tornSlot);
  simState.selectedSlotUid = tornSlot.uid;
  simState.activeJob = null;
  simState.powerLossOccurred = true;
  simState.moduleState = 'MEMIF_UNINIT';
  ecucConfig.FeeInitialized = false;
  simState.moduleSmState = 'UNINIT';
  simState.jobResult = 'MEMIF_BLOCK_INCONSISTENT';
  simState.activeArrows = ['arr_fee_fls', 'arr_fls_dflash'];
  simState.activeModules = ['MOD_FEE', 'MOD_FLS', 'MOD_DFLASH'];

  addTrace('HW PowerCut', `Torn Write @ Bank ${bank.id} +0x${offset.toString(16).toUpperCase()}`, `Mất điện trước khi ghi Trailer ${getTrailerPatternLabel()}! Slot #${seq} bị INCONSISTENT.`, 'ERR');
  pushStepLog(`SỰ CỐ MẤT ĐIỆN! Block ${blockId} Seq#${seq} bị Torn Write (thiếu Trailer). Nhấn Reset/Init ECU để phục hồi!`);
  setCodeSnippet(
    'Torn Write Event (Battery Cut-off Before Phase 3 Trailer)',
    `/* Power Lost during Fee_Write(${blockId})! */\nHeader: WRITTEN | Payload: PARTIAL | ValidTrailer(${getTrailerPatternLabel()}): MISSING!\n-> Flash Slot = MEMIF_BLOCK_INCONSISTENT\n/* Nhấn 'Fee_Init' để kiểm chứng Fallback về Seq #${Math.max(1, seq - 1)}! */`
  );
  syncBitRegistersFromState();
}

function advanceOneTickGc() {
  const gc = simState.gcState;
  const lowApi = getLowerApiNames();
  if (!gc || !gc.active) return false;

  if (gc.phase === 'GC_COPY_VALID') {
    if (gc.copiedCount < gc.itemsToCopy.length) {
      const srcSlot = gc.itemsToCopy[gc.copiedCount];
      // Check latest valid in srcBank in case Immediate block updated!
      const fresher = [...simState.banks[gc.srcBank].slots].reverse().find(
        (x) => x.blockId === srcSlot.blockId && x.status === 'VALID'
      ) || srcSlot;

      const dstBankObj = simState.banks[gc.dstBank];
      const dstStats = getBankStats(gc.dstBank);
      const geom = calcSlotGeometry(fresher.rawSize);
      const copied = makeSlotRecord({
        bankId: gc.dstBank,
        offset: dstStats.usedBytes,
        blockId: fresher.blockId,
        blockName: fresher.blockName,
        seq: fresher.seq,
        rawSize: fresher.rawSize,
        geom,
        immediate: fresher.immediate,
        status: 'VALID',
        dataPreview: fresher.dataPreview,
        hdrWritten: true,
        dataAligned: true,
        validTrailer: true,
        lutCached: true
      });
      dstBankObj.slots.push(copied);
      gc.copiedCount += 1;
      simState.selectedSlotUid = copied.uid;

      addTrace(
        'Fee GC',
        `${lowApi.write}(Bank${gc.dstBank} +0x${copied.offset.toString(16).toUpperCase()})`,
        `GC Copy [${gc.copiedCount}/${gc.itemsToCopy.length}]: ${copied.blockId} (${copied.totalBytes}B) -> Standby Bank ${gc.dstBank}`,
        'INFO'
      );
      pushStepLog(`GC Copy ${copied.blockId} sang Bank ${gc.dstBank} (${gc.copiedCount}/${gc.itemsToCopy.length}).`);
      if (gc.copiedCount >= gc.itemsToCopy.length) {
        gc.phase = 'GC_SWITCH_BANK';
      }
      return true;
    } else {
      gc.phase = 'GC_SWITCH_BANK';
    }
  }

  if (gc.phase === 'GC_SWITCH_BANK') {
    // Also copy any Immediate slot written AFTER GC began!
    const dstBankObj = simState.banks[gc.dstBank];
    for (const s of simState.banks[gc.srcBank].slots) {
      if (s.status === 'VALID') {
        const alreadyInDst = dstBankObj.slots.some((d) => d.blockId === s.blockId && d.seq >= s.seq);
        if (!alreadyInDst) {
          const dstStats = getBankStats(gc.dstBank);
          const geom = calcSlotGeometry(s.rawSize);
          dstBankObj.slots.push(
            makeSlotRecord({
              bankId: gc.dstBank,
              offset: dstStats.usedBytes,
              blockId: s.blockId,
              blockName: s.blockName,
              seq: s.seq,
              rawSize: s.rawSize,
              geom,
              immediate: s.immediate,
              status: 'VALID',
              dataPreview: s.dataPreview,
              lutCached: true
            })
          );
        }
      }
    }

    simState.banks[gc.srcBank].state = 'BANK_ERASING';
    simState.banks[gc.dstBank].state = 'BANK_ACTIVE';
    simState.activeBank = gc.dstBank;
    rebuildRamLutFromFlash();

    gc.phase = 'GC_ERASE_OLD';
    gc.eraseTicksDone = 0;
    simState.sectorSmState = 'GC_ERASING_OLD_BANK';
    addTrace(
      'Fee GC',
      `Sector Switch: Bank ${gc.dstBank} = ACTIVE`,
      `Đổi Active Bank -> Bank ${gc.dstBank}, chuẩn bị ${lowApi.erase}(Bank ${gc.srcBank})`,
      'OK'
    );
    pushStepLog(`Sector Switch! Active Bank = Bank ${gc.dstBank}. Chuẩn bị xóa Bank ${gc.srcBank}.`);
    return true;
  }

  if (gc.phase === 'GC_ERASE_OLD') {
    if (ecucConfig.SimulateFlsEraseError) {
      simState.banks[gc.srcBank].state = 'BANK_CORRUPT_DEM';
      gc.active = false;
      gc.phase = 'NONE';
      simState.sectorSmState = 'SECTOR_CORRUPT_DEM';
      simState.moduleState = 'MEMIF_IDLE';
      simState.moduleSmState = 'JOB_ERROR';
      simState.jobResult = 'MEMIF_JOB_FAILED';
      reportDem('FEE_E_GC_ERASE_FAILED', 'FAILED');
      return false;
    }

    gc.eraseTicksDone += 1;
    addTrace(
      'Fls/MemAcc',
      `${lowApi.erase}(Bank${gc.srcBank})`,
      `Đang xóa Sector Bank ${gc.srcBank} về ${getErasedByteLabel()} (${gc.eraseTicksDone}/${gc.eraseTicksTotal} ticks)`,
      'INFO'
    );
    if (gc.eraseTicksDone >= gc.eraseTicksTotal) {
      simState.banks[gc.srcBank].slots = [];
      simState.banks[gc.srcBank].state = 'BANK_ERASED_STANDBY';
      simState.banks[gc.srcBank].eraseCount += 1;

      gc.active = false;
      gc.phase = 'NONE';
      simState.sectorSmState = 'ACTIVE_NORMAL';
      addTrace(
        'Fls/MemAcc',
        `${lowApi.erase}(Bank${gc.srcBank}) DONE`,
        `Bank ${gc.srcBank} sạch 100% (${getErasedByteLabel()}), EraseCount=${simState.banks[gc.srcBank].eraseCount}`,
        'OK'
      );
      pushStepLog(`GC hoàn thành! Bank ${gc.srcBank} về Erased Standby.`);

      if (simState.pendingUserJob) {
        const queued = simState.pendingUserJob;
        simState.pendingUserJob = null;
        startWriteJobIntoActiveBank(queued);
      } else {
        simState.moduleState = 'MEMIF_IDLE';
        simState.moduleSmState = 'IDLE';
        simState.jobResult = 'MEMIF_JOB_OK';
      }
    }
    return true;
  }
  return false;
}

function stepMainFunctionTick() {
  if (!simState) return;
  const period = Math.max(1, Number(ecucConfig.FeeMainFunctionPeriod) || 5);
  simState.clockMs += period;

  if (!ecucConfig.FeeInitialized || simState.moduleState === 'MEMIF_UNINIT') {
    addTrace('SchM', 'Fee_MainFunction()', 'Bị bỏ qua vì MEMIF_UNINIT (chưa chạy Fee_Init)', 'WARN');
    syncBitRegistersFromState();
    return;
  }

  const lowApi = getLowerApiNames();
  const isFast = ecucConfig.ActiveMemIfMode === 'MEMIF_MODE_FAST';
  const bps = Math.max(4, Number(isFast ? ecucConfig.FlsBytesPerCycleFast : ecucConfig.FlsBytesPerCycleSlow) || 8);

  // 1. User Active Job takes priority (including Immediate Preemption!)
  const job = simState.activeJob;
  if (job) {
    if (job.type === 'WRITE') {
      const bank = simState.banks[simState.activeBank];
      const slot = bank.slots.find((s) => s.uid === job.targetSlotUid);

      if (ecucConfig.SimulateFlsWriteVerifyError) {
        if (slot) {
          slot.status = 'INCONSISTENT';
          slot.inconsistent = true;
          slot.validTrailer = false;
        }
        simState.activeJob = null;
        simState.immediatePreemptActive = false;
        simState.moduleState = 'MEMIF_IDLE';
        simState.moduleSmState = 'JOB_ERROR';
        simState.jobResult = 'MEMIF_JOB_FAILED';
        reportDem('FEE_E_FLS_WRITE_FAILED', 'FAILED');
        if (ecucConfig.FeeNvmJobNotificationsEnabled) {
          addTrace('Fee->NvM', 'Fee_JobErrorNotification()', 'Báo lỗi ghi Verify Flash lên NvM', 'ERR');
          simState.activeArrows.push('arr_fee_nvm');
        }
        syncBitRegistersFromState();
        return;
      }

      if (job.simulateTornWrite && job.bytesWritten >= job.geom.hdrSize) {
        // Trigger power loss mid-write!
        if (slot) {
          slot.status = 'INCONSISTENT';
          slot.hdrWritten = true;
          slot.dataAligned = false;
          slot.validTrailer = false;
          slot.inconsistent = true;
          slot.dataPreview = '0xFF 0x?? [TORN WRITE POWER CUT]';
        }
        simState.activeJob = null;
        simState.powerLossOccurred = true;
        ecucConfig.FeeInitialized = false;
        simState.moduleState = 'MEMIF_UNINIT';
        simState.moduleSmState = 'UNINIT';
        simState.jobResult = 'MEMIF_BLOCK_INCONSISTENT';
        addTrace('HW PowerCut', `Torn Write @ ${job.blockId}`, `Mất nguồn giữa Phase 2 trước khi ghi Valid Trailer ${getTrailerPatternLabel()}!`, 'ERR');
        pushStepLog(`Torn Write tại ${job.blockId}! Block thiếu Trailer ${getTrailerPatternLabel()} -> INCONSISTENT.`);
        syncBitRegistersFromState();
        return;
      }

      job.bytesWritten = Math.min(job.totalBytes, job.bytesWritten + bps);

      if (slot) {
        if (job.bytesWritten >= job.geom.hdrSize) {
          slot.hdrWritten = true;
          slot.status = 'WRITING_DATA';
          job.phase = 'WRITE_PAYLOAD';
        }
        if (job.bytesWritten >= job.totalBytes) {
          slot.hdrWritten = true;
          slot.dataAligned = true;
          slot.validTrailer = true;
          slot.status = 'VALID';
          job.phase = 'WRITE_TRAILER';

          // Mark older instances in all banks as SUPERSEDED
          for (const b of simState.banks) {
            for (const older of b.slots) {
              if (older.blockId === slot.blockId && older.uid !== slot.uid && older.status === 'VALID') {
                older.status = 'SUPERSEDED';
                older.lutCached = false;
              }
            }
          }
          rebuildRamLutFromFlash();
          const elapsed = simState.clockMs - job.startClockMs;
          simState.stats.lastLatencyMs = elapsed;
          simState.activeJob = null;
          simState.immediatePreemptActive = false;

          addTrace(
            lowApi.modName,
            `${lowApi.write} -> Trailer ${getTrailerPatternLabel()}`,
            `Hoàn tất ghi ${slot.blockId} (${slot.totalBytes}B) trong ${elapsed}ms. RAM LUT cập nhật!`,
            'OK'
          );
          if (ecucConfig.FeeNvmJobNotificationsEnabled) {
            addTrace('Fee->NvM', 'Fee_JobEndNotification()', `MEMIF_JOB_OK gửi lên NvM cho ${slot.blockId}`, 'OK');
          }

          if (simState.gcState && simState.gcState.active) {
            simState.gcState.pausedByImmediate = false;
            simState.moduleState = 'MEMIF_BUSY_INTERNAL';
            simState.moduleSmState = 'BUSY_INTERNAL_GC';
            simState.sectorSmState = 'GC_COPYING_TO_STANDBY';
          } else {
            simState.moduleState = 'MEMIF_IDLE';
            simState.moduleSmState = 'IDLE';
            simState.sectorSmState = 'ACTIVE_NORMAL';
          }
          simState.jobResult = 'MEMIF_JOB_OK';
          simState.activeArrows = ['arr_fee_nvm', 'arr_nvm_memif', 'arr_fls_fee'];
          simState.activeModules = ['MOD_NVM', 'MOD_MEMIF', 'MOD_FEE', 'MOD_FLS'];
          pushStepLog(`Fee_Write(${slot.blockId}) xong trong ${elapsed}ms -> MEMIF_JOB_OK.`);
        } else {
          const pct = Math.round((job.bytesWritten / job.totalBytes) * 100);
          addTrace(
            lowApi.modName,
            `${lowApi.write}(Chunk ${bps}B)`,
            `Đang ghi ${job.blockId}: ${job.bytesWritten}/${job.totalBytes}B (${pct}%) [Phase: ${job.phase}]`,
            'INFO'
          );
          pushStepLog(`Tick +${period}ms: Đã ghi ${job.bytesWritten}/${job.totalBytes}B của ${job.blockId}.`);
        }
      }
      syncBitRegistersFromState();
      return;
    }

    if (job.type === 'READ') {
      job.ticksRemaining -= 1;
      job.bytesWritten = Math.round(((job.totalTicks - job.ticksRemaining) / job.totalTicks) * job.totalBytes);
      if (job.ticksRemaining > 0) {
        addTrace(lowApi.modName, `${lowApi.read}() Scanning...`, `Đang quét Flash tuyến tính vì RAM LUT OFF (${job.ticksRemaining} tick còn lại)`, 'INFO');
        syncBitRegistersFromState();
        return;
      }

      const bankSlot = (() => {
        for (const b of simState.banks) {
          const f = b.slots.find((s) => s.uid === job.targetSlotUid);
          if (f) return f;
        }
        return null;
      })();

      if (ecucConfig.SimulateFlashEccBitFlip) {
        simState.activeJob = null;
        simState.moduleState = 'MEMIF_IDLE';
        simState.moduleSmState = 'JOB_ERROR';
        simState.jobResult = 'MEMIF_BLOCK_INCONSISTENT';
        simState.lastReadBuffer = 'ECC ERROR (Uncorrectable Double-Bit Flip)';
        if (bankSlot) {
          bankSlot.inconsistent = true;
          bankSlot.status = 'INCONSISTENT';
        }
        reportDem('FEE_E_READ_ECC_FAILED', 'FAILED');
        addTrace('Fee->NvM', 'Fee_JobErrorNotification()', 'Trả về MEMIF_BLOCK_INCONSISTENT do lỗi ECC DFlash!', 'ERR');
        pushStepLog(`Lỗi ECC Bit-Flip khi đọc ${job.blockId} -> MEMIF_BLOCK_INCONSISTENT.`);
        syncBitRegistersFromState();
        return;
      }

      if (!bankSlot || bankSlot.status === 'INVALIDATED') {
        simState.activeJob = null;
        simState.moduleState = 'MEMIF_IDLE';
        simState.moduleSmState = 'JOB_ERROR';
        simState.jobResult = 'MEMIF_BLOCK_INVALID';
        simState.lastReadBuffer = bankSlot ? 'INVALIDATED (MEMIF_BLOCK_INVALID)' : 'NEVER WRITTEN (MEMIF_BLOCK_INVALID)';
        addTrace('Fee->NvM', 'Fee_JobErrorNotification()', `Block ${job.blockId} bị Invalidated/chưa tồn tại -> MEMIF_BLOCK_INVALID`, 'WARN');
        pushStepLog(`Fee_Read(${job.blockId}) -> MEMIF_BLOCK_INVALID (NvM sẽ nạp ROM Default).`);
        syncBitRegistersFromState();
        return;
      }

      if (bankSlot.status === 'INCONSISTENT') {
        if (ecucConfig.FeeAutoFallbackPreviousInstance) {
          const fallback = [...simState.banks[bankSlot.bankId].slots]
            .reverse()
            .find((x) => x.blockId === bankSlot.blockId && x.seq < bankSlot.seq && (x.status === 'VALID' || x.status === 'SUPERSEDED'));
          if (fallback) {
            fallback.status = 'VALID';
            rebuildRamLutFromFlash();
            simState.selectedSlotUid = fallback.uid;
            simState.lastReadBuffer = `${fallback.dataPreview} [Fallback Seq#${fallback.seq}]`;
            simState.activeJob = null;
            simState.moduleState = 'MEMIF_IDLE';
            simState.moduleSmState = 'IDLE';
            simState.jobResult = 'MEMIF_JOB_OK';
            addTrace('Fee->NvM', 'Fee_JobEndNotification()', `Fallback phục hồi từ Seq#${fallback.seq} thành công -> MEMIF_JOB_OK`, 'OK');
            pushStepLog(`Phục hồi thành công từ Seq#${fallback.seq} -> MEMIF_JOB_OK.`);
            syncBitRegistersFromState();
            return;
          }
        }
        simState.activeJob = null;
        simState.moduleState = 'MEMIF_IDLE';
        simState.moduleSmState = 'JOB_ERROR';
        simState.jobResult = 'MEMIF_BLOCK_INCONSISTENT';
        simState.lastReadBuffer = 'INCONSISTENT (NO VALID FALLBACK)';
        addTrace('Fee->NvM', 'Fee_JobErrorNotification()', 'MEMIF_BLOCK_INCONSISTENT (không có fallback hợp lệ)', 'ERR');
        syncBitRegistersFromState();
        return;
      }

      // Clean VALID Read!
      const elapsed = simState.clockMs - job.startClockMs;
      simState.stats.lastLatencyMs = elapsed;
      simState.lastReadBuffer = `${bankSlot.dataPreview} (${simState.lastReadSliceText})`;
      simState.activeJob = null;
      simState.moduleState = 'MEMIF_IDLE';
      simState.moduleSmState = 'IDLE';
      simState.jobResult = 'MEMIF_JOB_OK';
      simState.activeArrows = ['arr_fls_fee', 'arr_fee_nvm', 'arr_nvm_memif', 'arr_rte_nvm', 'arr_swc_rte'];
      simState.activeModules = ['MOD_DFLASH', 'MOD_FLS', 'MOD_FEE', 'MOD_MEMIF', 'MOD_NVM', 'MOD_RTE', 'MOD_SWC'];

      addTrace(
        'Fee->NvM',
        'Fee_JobEndNotification()',
        `Đọc xong ${job.blockId} (${simState.lastReadSliceText}) qua ${job.usedLut ? 'RAM LUT O(1)' : 'Flash Scan'} -> MEMIF_JOB_OK`,
        'OK'
      );
      pushStepLog(`Fee_Read(${job.blockId}) -> MEMIF_JOB_OK (${simState.lastReadSliceText}).`);
      syncBitRegistersFromState();
      return;
    }

    if (job.type === 'INVALIDATE') {
      const bank = simState.banks[simState.activeBank];
      const invSlot = bank.slots.find((s) => s.uid === job.targetSlotUid);
      if (invSlot) {
        invSlot.status = 'INVALIDATED';
        invSlot.validTrailer = false;
        invSlot.invalidated = true;
        for (const b of simState.banks) {
          for (const older of b.slots) {
            if (older.blockId === invSlot.blockId && older.uid !== invSlot.uid && older.status === 'VALID') {
              older.status = 'SUPERSEDED';
              older.lutCached = false;
            }
          }
        }
        rebuildRamLutFromFlash();
      }
      simState.activeJob = null;
      simState.moduleState = 'MEMIF_IDLE';
      simState.moduleSmState = 'IDLE';
      simState.jobResult = 'MEMIF_JOB_OK';
      simState.activeArrows = ['arr_fee_nvm', 'arr_fls_fee'];
      addTrace('Fee->NvM', 'Fee_JobEndNotification()', `Block ${job.blockId} đã đánh dấu INVALIDATED trên Flash & RAM LUT`, 'OK');
      pushStepLog(`Fee_InvalidateBlock(${job.blockId}) xong -> MEMIF_JOB_OK.`);
      syncBitRegistersFromState();
      return;
    }
  }

  // 2. Otherwise advance Background / Foreground Garbage Collection
  if (simState.gcState && simState.gcState.active) {
    advanceOneTickGc();
    syncBitRegistersFromState();
    return;
  }

  addTrace('SchM', 'Fee_MainFunction()', 'MEMIF_IDLE — Không có user job hoặc GC đang chờ', 'INFO');
  syncBitRegistersFromState();
}

function stepCompleteAsyncJob() {
  if (!simState) return;
  let guard = 0;
  if (!simState.activeJob && !(simState.gcState && simState.gcState.active)) {
    stepMainFunctionTick();
    return;
  }
  while ((simState.activeJob || (simState.gcState && simState.gcState.active)) && guard < 40) {
    stepMainFunctionTick();
    guard += 1;
    if (simState.powerLossOccurred || simState.moduleState === 'MEMIF_UNINIT') break;
  }
}

// ============================================================================
// EXPORT CODE GENERATORS (ARXML, Fee_Cfg.h, Fee_Lcfg.c, JSON)
// ============================================================================
function generateArxmlContent() {
  const isMemAcc = ecucConfig.FeeLowerLayerArchitecture === 'R23_MEMACC';
  const blkRows = Object.values(runtimeBlockCatalog)
    .map(
      (b) => `            <ECUC-CONTAINER-VALUE>
              <SHORT-NAME>${b.name}</SHORT-NAME>
              <DEFINITION-REF DEST="ECUC-PARAM-CONF-CONTAINER-DEF">/AUTOSAR/EcucDefs/Fee/FeeBlockConfiguration</DEFINITION-REF>
              <PARAMETER-VALUES>
                <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-INTEGER-PARAM-DEF">/AUTOSAR/EcucDefs/Fee/FeeBlockConfiguration/FeeBlockNumber</DEFINITION-REF><VALUE>${b.baseNumber}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
                <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-INTEGER-PARAM-DEF">/AUTOSAR/EcucDefs/Fee/FeeBlockConfiguration/FeeBlockSize</DEFINITION-REF><VALUE>${b.size}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
                <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-BOOLEAN-PARAM-DEF">/AUTOSAR/EcucDefs/Fee/FeeBlockConfiguration/FeeImmediateData</DEFINITION-REF><VALUE>${b.immediate ? 'true' : 'false'}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
                <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-INTEGER-PARAM-DEF">/AUTOSAR/EcucDefs/Fee/FeeBlockConfiguration/FeeNumberOfWriteCycles</DEFINITION-REF><VALUE>${b.writeCycles}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
              </PARAMETER-VALUES>
            </ECUC-CONTAINER-VALUE>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<AUTOSAR xmlns="http://autosar.org/schema/r4.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <AR-PACKAGES>
    <AR-PACKAGE>
      <SHORT-NAME>Fee_ConfigPackage</SHORT-NAME>
      <ELEMENTS>
        <ECUC-MODULE-CONFIGURATION-VALUES>
          <SHORT-NAME>Fee</SHORT-NAME>
          <DEFINITION-REF DEST="ECUC-MODULE-DEF">/AUTOSAR/EcucDefs/Fee</DEFINITION-REF>
          <IMPLEMENTATION-CONFIG-VARIANT>VARIANT-LINK-TIME</IMPLEMENTATION-CONFIG-VARIANT>
          <CONTAINERS>
            <ECUC-CONTAINER-VALUE>
              <SHORT-NAME>FeeGeneral</SHORT-NAME>
              <PARAMETER-VALUES>
                <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-BOOLEAN-PARAM-DEF">/AUTOSAR/EcucDefs/Fee/FeeGeneral/FeeDevErrorDetect</DEFINITION-REF><VALUE>${ecucConfig.FeeDevErrorDetect}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
                <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-BOOLEAN-PARAM-DEF">/AUTOSAR/EcucDefs/Fee/FeeGeneral/FeePollingMode</DEFINITION-REF><VALUE>${ecucConfig.FeePollingMode}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
                <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-BOOLEAN-PARAM-DEF">/AUTOSAR/EcucDefs/Fee/FeeGeneral/FeeVersionInfoApi</DEFINITION-REF><VALUE>${ecucConfig.FeeVersionInfoApi}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
                <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-BOOLEAN-PARAM-DEF">/AUTOSAR/EcucDefs/Fee/FeeGeneral/FeeSetModeSupported</DEFINITION-REF><VALUE>${ecucConfig.FeeSetModeSupported}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
                <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-INTEGER-PARAM-DEF">/AUTOSAR/EcucDefs/Fee/FeeGeneral/FeeVirtualPageSize</DEFINITION-REF><VALUE>${ecucConfig.FeeVirtualPageSize}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
                <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-FLOAT-PARAM-DEF">/AUTOSAR/EcucDefs/Fee/FeeGeneral/FeeMainFunctionPeriod</DEFINITION-REF><VALUE>${(Number(ecucConfig.FeeMainFunctionPeriod) / 1000).toFixed(4)}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
                <ECUC-TEXTUAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-STRING-PARAM-DEF">/AUTOSAR/EcucDefs/Fee/FeeGeneral/FeeLowerLayerRef</DEFINITION-REF><VALUE>${isMemAcc ? 'R23_11_MemAcc' : 'Classic_Fls'}</VALUE></ECUC-TEXTUAL-PARAM-VALUE>
              </PARAMETER-VALUES>
            </ECUC-CONTAINER-VALUE>
${blkRows}
          </CONTAINERS>
        </ECUC-MODULE-CONFIGURATION-VALUES>
      </ELEMENTS>
    </AR-PACKAGE>
  </AR-PACKAGES>
</AUTOSAR>`;
}

function generateFeeCfgH() {
  const isR23 = ecucConfig.FeeLowerLayerArchitecture === 'R23_MEMACC';
  const onOff = (b) => (b ? 'STD_ON' : 'STD_OFF');
  return `/**
 * @file Fee_Cfg.h
 * @brief AUTOSAR Classic Fee Pre-Compile Configuration Header
 * @stack ${isR23 ? 'AUTOSAR R23-11 (Fee -> MemAcc)' : 'AUTOSAR R20-11 (Fee -> Fls)'}
 */
#ifndef FEE_CFG_H
#define FEE_CFG_H

#define FEE_VENDOR_ID                   (43U)
#define FEE_MODULE_ID                   (21U)

#define FEE_DEV_ERROR_DETECT            (${onOff(ecucConfig.FeeDevErrorDetect)})
#define FEE_VERSION_INFO_API            (${onOff(ecucConfig.FeeVersionInfoApi)})
#define FEE_POLLING_MODE                (${onOff(ecucConfig.FeePollingMode)})
#define FEE_SET_MODE_SUPPORTED          (${onOff(ecucConfig.FeeSetModeSupported)})
#define FEE_NVM_JOB_END_NOTIFICATION    (${onOff(ecucConfig.FeeNvmJobNotificationsEnabled)})
#define FEE_USE_MEMACC_LOWER_LAYER      (${onOff(isR23)})

#define FEE_VIRTUAL_PAGE_SIZE           (${ecucConfig.FeeVirtualPageSize}U)
#define FEE_MINIMUM_READ_PAGE_SIZE      (${ecucConfig.FeeMinimumReadPageSize}U)
#define FEE_BLOCK_HEADER_SIZE           (${ecucConfig.FeeBlockHeaderSize}U)
#define FEE_VALID_TRAILER_PATTERN       (${ecucConfig.FeeValidTrailerPattern}U)
#define FEE_ERASED_VALUE                (${ecucConfig.FeeErasedValue}U)

#define FEE_BANK0_SIZE_BYTES            (${ecucConfig.FeeBank0SizeBytes}U)
#define FEE_BANK1_SIZE_BYTES            (${ecucConfig.FeeBank1SizeBytes}U)
#define FEE_GC_TRIGGER_THRESHOLD_PCT    (${ecucConfig.FeeGcTriggerThresholdPct}U)
#define FEE_RESERVED_IMMEDIATE_BYTES    (${ecucConfig.FeeReservedImmediateSpaceBytes}U)
#define FEE_BACKGROUND_GC_ENABLED       (${onOff(ecucConfig.FeeEnableBackgroundGc)})
#define FEE_ENABLE_RAM_LUT_CACHE        (${onOff(ecucConfig.FeeEnableRamLutCache)})
#define FEE_NUM_CONFIGURED_BLOCKS       (${Object.keys(runtimeBlockCatalog).length}U)

#endif /* FEE_CFG_H */`;
}

function generateFeeLcfgC() {
  const isR23 = ecucConfig.FeeLowerLayerArchitecture === 'R23_MEMACC';
  const rows = Object.values(runtimeBlockCatalog)
    .map((b) => {
      const g = calcSlotGeometry(b.size);
      return `  { /* ${b.name} */
    .BlockNumber = 0x${b.baseNumber.toString(16).toUpperCase().padStart(4, '0')}U,
    .BlockSize = ${b.size}U, /* Aligned Flash Slot = ${g.totalBytes}U (Hdr ${g.hdrSize}U + Data ${g.alignedPayload}U) */
    .ImmediateData = ${b.immediate ? 'TRUE' : 'FALSE'},
    .NumberOfWriteCycles = ${b.writeCycles}UL,
    .DatasetSelectionBits = ${b.datasetBits}U
  }`;
    })
    .join(',\n');

  return `/**
 * @file Fee_Lcfg.c
 * @brief AUTOSAR Classic Fee Link-Time Configuration
 */
#include "Fee.h"
#include "${isR23 ? 'MemAcc.h' : 'Fls.h'}"

const Fee_SectorConfigType Fee_SectorConfig[2] = {
  { .PhysicalSectorId = 0U, .BaseAddress = 0x08000000UL, .Length = ${ecucConfig.FeeBank0SizeBytes}U },
  { .PhysicalSectorId = 1U, .BaseAddress = 0x08001000UL, .Length = ${ecucConfig.FeeBank1SizeBytes}U }
};

const Fee_BlockConfigType Fee_BlockConfig[FEE_NUM_CONFIGURED_BLOCKS] = {
${rows}
};

const Fee_ConfigType Fee_Config = {
  .SectorConfigPtr = Fee_SectorConfig,
  .BlockConfigPtr  = Fee_BlockConfig,
  .NumBlocks       = FEE_NUM_CONFIGURED_BLOCKS,
  .JobEndCbk       = ${ecucConfig.FeeNvmJobNotificationsEnabled ? 'NvM_JobEndNotification' : 'NULL_PTR'},
  .JobErrCbk       = ${ecucConfig.FeeNvmJobNotificationsEnabled ? 'NvM_JobErrorNotification' : 'NULL_PTR'}
};`;
}
