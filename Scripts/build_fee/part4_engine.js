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

function normalizeBlockIdKey(blockId) {
  const s = String(blockId || '').trim();
  if (/^0x[0-9a-f]+$/i.test(s)) return '0x' + s.slice(2).toUpperCase().padStart(4, '0');
  return s;
}

function isConfiguredBlockId(blockId) {
  if (!blockId) return false;
  const key = normalizeBlockIdKey(blockId);
  const upper = key.toUpperCase();
  if (upper === '0X0000' || upper === '0XFFFF') return false;
  return Boolean(runtimeBlockCatalog[key] || BLOCK_CATALOG[key]);
}

function getLowerApiNames(cfg = ecucConfig) {
  const isR23 = cfg.FeeLowerLayerArchitecture === 'R23_MEMACC';
  return {
    isR23,
    modName: isR23 ? 'MemAcc' : 'Fls',
    subLabel: isR23 ? 'MemAcc_Write / Read / Erase / BlankCheck (R25-11)' : 'Fls_Write / Read / Erase',
    write: isR23 ? 'MemAcc_Write' : 'Fls_Write',
    read: isR23 ? 'MemAcc_Read' : 'Fls_Read',
    erase: isR23 ? 'MemAcc_Erase' : 'Fls_Erase',
    blankCheck: isR23 ? 'MemAcc_BlankCheck' : 'Fls_BlankCheck',
    compare: isR23 ? 'MemAcc_Compare' : 'Fls_Compare',
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

const MIN_FEE_BANKS = 2;
const MAX_FEE_BANKS = 4;

function getBankCapacity(bankId, cfg = ecucConfig) {
  if (bankId === 0) return Math.max(64, Number(cfg.FeeBank0SizeBytes) || 256);
  if (bankId === 1) return Math.max(64, Number(cfg.FeeBank1SizeBytes) || 256);
  const existing = (typeof simState !== 'undefined' && simState && simState.banks && simState.banks[bankId])
    ? simState.banks[bankId].size
    : 0;
  return Math.max(64, Number(cfg[`FeeBank${bankId}SizeBytes`] || existing || cfg.FeeBank1SizeBytes) || 256);
}

function makeBankRecord(id, capacity, state = 'BANK_ERASED_STANDBY') {
  return {
    id,
    name: `Bank ${id}`,
    baseAddr: 0x08000000 + id * 0x1000,
    size: capacity,
    eraseCount: 1,
    state,
    slots: []
  };
}

function isGcTriggeredOrActive() {
  return Boolean((simState && simState.gcState && simState.gcState.active) || (simState && simState.pendingUserJob));
}

function selectNextGcTargetBank(srcBank) {
  if (!simState || !simState.banks || simState.banks.length < 2) return srcBank === 0 ? 1 : 0;
  const n = simState.banks.length;
  let bestIdx = -1;
  let bestErase = Infinity;
  for (let step = 1; step < n; step++) {
    const idx = (srcBank + step) % n;
    const b = simState.banks[idx];
    if (!b || b.state === 'BANK_CORRUPT_DEM') continue;
    if (b.state === 'BANK_ERASED_STANDBY' && b.eraseCount < bestErase) {
      bestErase = b.eraseCount;
      bestIdx = idx;
    }
  }
  if (bestIdx >= 0) return bestIdx;
  for (let step = 1; step < n; step++) {
    const idx = (srcBank + step) % n;
    if (simState.banks[idx] && simState.banks[idx].state !== 'BANK_CORRUPT_DEM') return idx;
  }
  return (srcBank + 1) % n;
}

function findRemovableBankIndex() {
  if (!simState || !simState.banks || simState.banks.length <= MIN_FEE_BANKS || isGcTriggeredOrActive()) return -1;
  for (let i = simState.banks.length - 1; i >= 0; i--) {
    if (i !== simState.activeBank && simState.banks[i].state !== 'BANK_ACTIVE') {
      return i;
    }
  }
  return -1;
}

function canRemoveFlashBank(bankId = null) {
  if (!simState || !simState.banks) return { allowed: false, reason: 'Simulator chưa khởi tạo' };
  if (simState.banks.length <= MIN_FEE_BANKS) {
    return { allowed: false, reason: `Số lượng Bank tối thiểu mặc định là ${MIN_FEE_BANKS}` };
  }
  if (isGcTriggeredOrActive()) {
    return { allowed: false, reason: 'Không thể bớt Bank khi Garbage Collection đang kích hoạt (GC Triggered)' };
  }
  if (bankId === null || bankId === undefined) {
    const cand = findRemovableBankIndex();
    return cand >= 0
      ? { allowed: true, reason: '' }
      : { allowed: false, reason: 'Không có Bank rảnh (không Active) để bớt' };
  }
  const b = simState.banks[bankId];
  if (!b) return { allowed: false, reason: `Bank ${bankId} không tồn tại` };
  if (b.id === simState.activeBank || b.state === 'BANK_ACTIVE') {
    return { allowed: false, reason: `Không thể bớt ${b.name} vì đang là ACTIVE BANK` };
  }
  if (b.state === 'BANK_GC_TARGET' || b.state === 'BANK_ERASING') {
    return { allowed: false, reason: `Không thể bớt ${b.name} vì đang thực hiện GC` };
  }
  return { allowed: true, reason: '' };
}

function addFlashBank() {
  if (!simState || !simState.banks) return false;
  if (simState.banks.length >= MAX_FEE_BANKS) {
    addTrace('Flash Bank', 'addFlashBank()', `Đã đạt giới hạn tối đa ${MAX_FEE_BANKS} Bank`, 'WARN');
    pushStepLog(`Không thể thêm Bank: Đã đạt tối đa ${MAX_FEE_BANKS} Bank.`);
    setStepExplain(`⚠️ Đã đạt tối đa ${MAX_FEE_BANKS} Flash Banks (mặc định tối thiểu ${MIN_FEE_BANKS}, tối đa ${MAX_FEE_BANKS}).`, {
      mode: 'MANUAL',
      apiFlow: `Bank Config: Đạt giới hạn ${MAX_FEE_BANKS}/${MAX_FEE_BANKS} Banks`,
      bitImpact: `Active Bank = Bank ${simState.activeBank}`,
      memoryImpact: `Tổng số Bank = ${simState.banks.length}`,
      swsRef: 'SWS_Fee_00102 / SWS_Fee_00103'
    });
    if (typeof document !== 'undefined' && typeof renderAll === 'function') renderAll();
    return false;
  }
  const newId = simState.banks.length;
  const cap = getBankCapacity(newId);
  simState.banks.push(makeBankRecord(newId, cap, 'BANK_ERASED_STANDBY'));
  addTrace('Flash Bank', `addFlashBank() -> Bank ${newId}`, `Đã thêm Standby Bank ${newId} (${cap}B @ 0x${(0x08000000 + newId * 0x1000).toString(16).toUpperCase()}). Tổng = ${simState.banks.length}/${MAX_FEE_BANKS}`, 'OK');
  pushStepLog(`Đã thêm Bank ${newId} (${cap}B Erased Standby). Tổng số Bank: ${simState.banks.length}/${MAX_FEE_BANKS}.`);
  setStepExplain(`➕ Đã thêm Flash Bank ${newId} (${cap}B, STANDBY ERASED). Tổng số Bank hiện tại: ${simState.banks.length}/${MAX_FEE_BANKS}.`, {
    mode: 'MANUAL',
    apiFlow: `Thêm Bank ${newId} (Erased Standby @ 0x${(0x08000000 + newId * 0x1000).toString(16).toUpperCase()})`,
    bitImpact: `Active Bank = Bank ${simState.activeBank} | Tổng = ${simState.banks.length} Banks`,
    memoryImpact: `Bank ${newId} sạch 100% (${getErasedByteLabel()}, ${cap}B)`,
    swsRef: 'SWS_Fee_00102 / SWS_Fee_00103'
  });
  if (typeof document !== 'undefined' && typeof renderAll === 'function') renderAll();
  return true;
}

function removeFlashBank(bankId = null) {
  if (!simState || !simState.banks) return false;
  if (isGcTriggeredOrActive()) {
    const msg = 'Từ chối bớt Bank: Garbage Collection đang kích hoạt (GC Triggered)!';
    addTrace('Flash Bank', 'removeFlashBank() REJECTED', msg, 'WARN');
    pushStepLog(msg);
    setStepExplain(`⚠️ Không thể bớt Bank khi Garbage Collection đang kích hoạt (GC Triggered). Vui lòng chờ GC hoàn tất.`, {
      mode: 'MANUAL',
      apiFlow: 'removeFlashBank() → Blocked (GC Triggered)',
      bitImpact: `GC_ACTIVE=1 | Active Bank = Bank ${simState.activeBank}`,
      memoryImpact: `Giữ nguyên ${simState.banks.length} Banks đang thực thi GC`,
      swsRef: 'SWS_Fee_00102'
    });
    if (typeof document !== 'undefined' && typeof renderAll === 'function') renderAll();
    return false;
  }
  if (simState.banks.length <= MIN_FEE_BANKS) {
    const msg = `Từ chối bớt Bank: Số lượng Bank tối thiểu mặc định là ${MIN_FEE_BANKS}.`;
    addTrace('Flash Bank', 'removeFlashBank() REJECTED', msg, 'WARN');
    pushStepLog(msg);
    setStepExplain(`⚠️ Số lượng Bank tối thiểu mặc định là ${MIN_FEE_BANKS} (không thể bớt xuống dưới ${MIN_FEE_BANKS} Bank).`, {
      mode: 'MANUAL',
      apiFlow: `removeFlashBank() → Blocked (Min ${MIN_FEE_BANKS} Banks)`,
      bitImpact: `Tổng số Bank = ${simState.banks.length}`,
      memoryImpact: 'Tối thiểu cần 2 Bank để luân phiên Wear Leveling / GC',
      swsRef: 'SWS_Fee_00102'
    });
    if (typeof document !== 'undefined' && typeof renderAll === 'function') renderAll();
    return false;
  }

  const targetIdx = (bankId !== null && bankId !== undefined) ? Number(bankId) : findRemovableBankIndex();
  const check = canRemoveFlashBank(targetIdx);
  if (!check.allowed || targetIdx < 0) {
    addTrace('Flash Bank', `removeFlashBank(Bank ${targetIdx}) REJECTED`, check.reason, 'WARN');
    pushStepLog(`Không thể bớt Bank ${targetIdx}: ${check.reason}`);
    setStepExplain(`⚠️ ${check.reason}.`, {
      mode: 'MANUAL',
      apiFlow: `removeFlashBank(Bank ${targetIdx}) → Blocked`,
      bitImpact: `Active Bank = Bank ${simState.activeBank}`,
      memoryImpact: `Giữ nguyên ${simState.banks.length} Banks`,
      swsRef: 'SWS_Fee_00102'
    });
    if (typeof document !== 'undefined' && typeof renderAll === 'function') renderAll();
    return false;
  }

  const removedName = simState.banks[targetIdx].name;
  simState.banks.splice(targetIdx, 1);

  const oldToNew = {};
  const uidMap = {};
  simState.banks.forEach((b, newId) => {
    oldToNew[b.id] = newId;
    b.id = newId;
    b.name = `Bank ${newId}`;
    b.baseAddr = 0x08000000 + newId * 0x1000;
    b.slots.forEach((s) => {
      const oldUid = s.uid;
      s.bankId = newId;
      s.uid = `B${newId}_0x${s.offset.toString(16).toUpperCase().padStart(2, '0')}_${s.blockId}_S${s.seq}`;
      uidMap[oldUid] = s.uid;
    });
  });

  simState.activeBank = oldToNew[simState.activeBank] !== undefined ? oldToNew[simState.activeBank] : 0;
  if (simState.selectedSlotUid && uidMap[simState.selectedSlotUid]) {
    simState.selectedSlotUid = uidMap[simState.selectedSlotUid];
  } else {
    const firstValid = simState.banks[simState.activeBank]?.slots.find((s) => s.status === 'VALID');
    simState.selectedSlotUid = firstValid ? firstValid.uid : null;
  }
  if (simState.activeJob && simState.activeJob.targetSlotUid && uidMap[simState.activeJob.targetSlotUid]) {
    simState.activeJob.targetSlotUid = uidMap[simState.activeJob.targetSlotUid];
  }
  rebuildRamLutFromFlash();
  syncBitRegistersFromState();

  addTrace('Flash Bank', `removeFlashBank(${removedName})`, `Đã bớt ${removedName} (còn ${simState.banks.length}/${MAX_FEE_BANKS} Banks). Active Bank = Bank ${simState.activeBank}`, 'OK');
  pushStepLog(`Đã bớt ${removedName}. Còn lại ${simState.banks.length} Bank (Active = Bank ${simState.activeBank}).`);
  setStepExplain(`➖ Đã bớt ${removedName} (không Active, không GC). Hệ thống còn ${simState.banks.length}/${MAX_FEE_BANKS} Bank; dữ liệu trên Bank ${simState.activeBank} & RAM LUT vẫn bảo toàn.`, {
    mode: 'MANUAL',
    apiFlow: `removeFlashBank(${removedName}) → Còn ${simState.banks.length} Banks`,
    bitImpact: `Active Bank = Bank ${simState.activeBank}`,
    memoryImpact: `RAM LUT giữ ${Object.keys(simState.lut).length} entries trên Bank ${simState.activeBank}`,
    swsRef: 'SWS_Fee_00102'
  });
  if (typeof document !== 'undefined' && typeof renderAll === 'function') renderAll();
  return true;
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
    initScanPending: false,
    initReason: '',
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
    stepExplain: isUninit
      ? 'ECU vừa Power-On Reset: Fee chưa khởi tạo (MEMIF_UNINIT, Thanh A Bit 7 = 0), RAM LUT đang trống.'
      : 'Hệ thống sau Fee_Init() & Fee_MainFunction(): Fee ở trạng thái MEMIF_IDLE (Thanh A = 0x81), RAM LUT đã sẵn sàng tra cứu O(1).',
    stepMeta: {
      mode: 'SETUP',
      apiFlow: isUninit ? 'Power-On Reset → Chờ Fee_Init()' : 'Fee_Init(&Fee_Config) → Fee_MainFunction() → MEMIF_IDLE',
      bitImpact: isUninit ? 'Thanh A: 0x00 (B7 FEE_INIT=0)' : 'Thanh A: 0x81 (B7 FEE_INIT=1, B0 JOB_OK_DONE=1)',
      memoryImpact: 'Bank 0 Active | RAM LUT sẵn sàng',
      swsRef: 'SWS_Fee_00085 / SWS_Fee_00120 / SWS_Fee_00197'
    },
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
  for (const b of simState.banks) {
    if (b.slots.length > 0) return b.slots[b.slots.length - 1];
  }
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

function setStepExplain(text, metaPatch = null) {
  if (!simState) return;
  simState.stepExplain = text;
  if (metaPatch) {
    simState.stepMeta = { ...(simState.stepMeta || {}), ...metaPatch };
  }
}

function reportDet(errorKey, apiName) {
  const err = FEE_DET_CATALOG[errorKey] || { id: '0xFF', kind: 'DEV', name: errorKey, desc: 'Development Error' };
  const isRuntime = err.kind === 'RUNTIME';
  simState.stats.detCount += 1;
  simState.lastErrorDet = { ...err, apiName, timeMs: simState.clockMs };
  if (isRuntime) {
    addTrace('DET', `Det_ReportRuntimeError(21, 0, ${apiName}, ${err.name})`, `[${err.id}] ${err.desc}`, 'ERR');
    pushStepLog(`Runtime Error ${err.name} (${err.id}) khi gọi ${apiName}`);
    simState.activeArrows = ['arr_fee_det'];
    simState.activeModules = ['MOD_FEE', 'MOD_DET'];
    setStepExplain(
      `🚨 Bẫy Runtime Error ${err.name} (${err.id}) [SWS_Fee_91002] khi gọi ${apiName}(): ${err.desc} Luôn báo cáo qua Det_ReportRuntimeError() bất kể FeeDevErrorDetect.`,
      {
        mode: 'MANUAL',
        apiFlow: `${apiName}() → Det_ReportRuntimeError(21, 0, ${apiName}, ${err.name})`,
        bitImpact: `Status giữ nguyên ${simState.moduleState} | Không khởi tạo Job mới`,
        memoryImpact: 'Flash & RAM LUT không bị thay đổi',
        swsRef: errorKey === 'FEE_E_INVALID_CANCEL' ? 'SWS_Fee_91002 / SWS_Fee_00184 / SWS_Fee_00164' : 'SWS_Fee_91002 / SWS_Fee_00144..00146'
      }
    );
  } else if (ecucConfig.FeeDevErrorDetect) {
    addTrace('DET', `Det_ReportError(21, 0, ${apiName}, ${err.name})`, `[${err.id}] ${err.desc}`, 'ERR');
    pushStepLog(`DET Error ${err.name} (${err.id}) khi gọi ${apiName}`);
    simState.activeArrows = ['arr_fee_det'];
    simState.activeModules = ['MOD_FEE', 'MOD_DET'];
    setStepExplain(
      `🚨 Bẫy Development Error ${err.name} (${err.id}) [SWS_Fee_00010] khi gọi ${apiName}(): ${err.desc} Lệnh bị từ chối (E_NOT_OK) trước khi chạm vào Data Flash.`,
      {
        mode: 'MANUAL',
        apiFlow: `${apiName}() → Det_ReportError(21, 0, ${apiName}, ${err.name})`,
        bitImpact: `Status giữ nguyên ${simState.moduleState} | Không khởi tạo Job mới`,
        memoryImpact: 'Flash & RAM LUT không bị thay đổi',
        swsRef: 'SWS_Fee_00010 / SWS_Fee_00122..00147'
      }
    );
  } else {
    addTrace('Fee', `${apiName}()`, `Bỏ qua Dev Error ${err.name} vì FeeDevErrorDetect=FALSE`, 'WARN');
    setStepExplain(
      `⚠️ ${apiName}() phát hiện điều kiện ${err.name} (${err.id}), nhưng FeeDevErrorDetect = FALSE nên không gọi Det_ReportError() (Development Error bị tắt).`,
      {
        mode: 'MANUAL',
        apiFlow: `${apiName}() → [Dev Error Disabled]`,
        bitImpact: `Status: ${simState.moduleState}`,
        memoryImpact: 'Flash & RAM LUT không bị thay đổi',
        swsRef: 'ECUC_Fee_00111 / SWS_Fee_00010'
      }
    );
  }
}

function reportDem(eventId, status) {
  const lowApi = getLowerApiNames();
  simState.stats.demCount += 1;
  simState.lastErrorDem = { eventId, status, timeMs: simState.clockMs };
  addTrace(
    'DEM',
    `${lowApi.modName}->Dem_SetEventStatus(${eventId}, DEM_EVENT_STATUS_${status})`,
    `Tầng dưới (${lowApi.modName}) báo cáo lỗi phần cứng Flash lên DEM; Fee không có Production Error riêng (§7.2.3) và trả MEMIF_JOB_FAILED`,
    'ERR'
  );
  pushStepLog(`Lower-Layer DEM Event: ${eventId} = ${status}`);
  simState.activeArrows = ['arr_fee_dem', 'arr_fee_fls'];
  simState.activeModules = ['MOD_FEE', 'MOD_DEM', 'MOD_FLS'];
}

function lookupSlotForRead(blockId) {
  const activeSlots = simState.banks[simState.activeBank].slots;
  const lutEntry = ecucConfig.FeeEnableRamLutCache ? simState.lut[blockId] : null;
  if (lutEntry) {
    return simState.banks[lutEntry.bankId].slots.find((s) => s.offset === lutEntry.offset && s.blockId === blockId) || null;
  }
  return [...activeSlots].reverse().find(
    (s) => s.blockId === blockId && (s.status === 'VALID' || s.status === 'INVALIDATED' || s.status === 'INCONSISTENT')
  ) || null;
}

function emitLowerCompletionAndUpperCallback(ok, jobResult, detail) {
  const lowApi = getLowerApiNames();
  if (ecucConfig.FeePollingMode) {
    addTrace(
      lowApi.modName,
      `${lowApi.getJobResult}()`,
      `Polling Mode [ECUC_Fee_00114]: Fee_MainFunction() hỏi tầng dưới -> ${ok ? 'JOB_OK' : 'JOB_FAILED'} (${detail})`,
      ok ? 'OK' : 'WARN'
    );
  } else if (lowApi.isR23) {
    addTrace(
      'MemAcc->Fee',
      'Fee_JobEndNotification()',
      `Unified R25-11 Callback [SWS_Fee_00095 / SWS_Fee_00194] -> gọi MemAcc_GetJobResult(): ${detail}`,
      ok ? 'OK' : 'WARN'
    );
  }
  if (ecucConfig.FeeNvmJobNotificationsEnabled) {
    if (ok) {
      addTrace('Fee->NvM', 'NvM_JobEndNotification()', `[SWS_Fee_00055] Báo ${jobResult} lên NvM (${detail})`, 'OK');
    } else {
      addTrace('Fee->NvM', 'NvM_JobErrorNotification()', `[SWS_Fee_00056] Báo ${jobResult} lên NvM (${detail})`, 'ERR');
    }
    if (!simState.activeArrows.includes('arr_fee_nvm')) simState.activeArrows.push('arr_fee_nvm');
  }
}

function finishUserJobModuleState(isError = false) {
  simState.activeJob = null;
  simState.immediatePreemptActive = false;
  if (simState.gcState && simState.gcState.active) {
    simState.moduleState = 'MEMIF_BUSY_INTERNAL';
    simState.moduleSmState = 'BUSY_INTERNAL_GC';
    simState.sectorSmState = simState.gcState.phase === 'GC_ERASE_OLD' ? 'GC_ERASING_OLD_BANK' : 'GC_COPYING_TO_STANDBY';
  } else {
    simState.moduleState = 'MEMIF_IDLE';
    simState.moduleSmState = isError ? 'JOB_ERROR' : 'IDLE';
    if (!isError) simState.sectorSmState = 'ACTIVE_NORMAL';
  }
}

function completeStartupScanInternal(reason = 'Startup Scan', emitTrace = true) {
  const activeIdx = simState.banks.findIndex((b) => b.state === 'BANK_ACTIVE');
  simState.activeBank = activeIdx >= 0 ? activeIdx : 0;

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
  simState.initScanPending = false;
  const lutEntries = Object.keys(simState.lut).length;
  const lowApi = getLowerApiNames();

  if (!simState.activeJob && !(simState.gcState && simState.gcState.active)) {
    simState.moduleState = 'MEMIF_IDLE';
    simState.moduleSmState = 'IDLE';
    simState.sectorSmState = 'ACTIVE_NORMAL';
  }

  if (emitTrace) {
    simState.activeArrows = ['arr_fee_fls', 'arr_fls_dflash', 'arr_fls_fee'];
    simState.activeModules = ['MOD_FEE', 'MOD_FLS', 'MOD_DFLASH'];
    addTrace(
      'Fee',
      'Fee_MainFunction() [Startup Scan]',
      `${reason}: Quét xong Bank ${simState.activeBank}, nạp ${lutEntries} entries vào RAM LUT${tornCount > 0 ? `, phát hiện ${tornCount} Torn Write -> Fallback ${recoveredCount} block` : ''} -> MEMIF_IDLE [SWS_Fee_00197]`,
      tornCount > 0 ? 'WARN' : 'OK'
    );
    pushStepLog(`Startup Scan xong (${reason}): Bank ${simState.activeBank}, LUT=${lutEntries} blocks -> MEMIF_IDLE.`);
    setCodeSnippet(
      'Fee_MainFunction() — Startup Scan Complete [SWS_Fee_00197]',
      `/* [SWS_Fee_00197] Fee_MainFunction() hoan tat Startup Cluster Scan */\n/* Scan Bank ${simState.activeBank} bang ${lowApi.read}() -> Kiem tra Trailer ${getTrailerPatternLabel()} */\n/* Ton tai ${lutEntries} valid block trong Fee_BlockLutCache[] */\n${tornCount > 0 ? `/* Fallback thanh cong ${recoveredCount} block truoc do sau Torn Write! */` : '/* Flash sach se, khong co Torn Write */'}\n/* Status: MEMIF_BUSY_INTERNAL -> MEMIF_IDLE */`
    );
    setStepExplain(
      `✅ Startup Scan hoàn tất (${reason}): Fee_MainFunction() [SWS_Fee_00197] đã quét Bank ${simState.activeBank}, nạp ${lutEntries} block hợp lệ vào RAM LUT${tornCount > 0 ? `, phát hiện ${tornCount} Torn Write và tự động Fallback ${recoveredCount} bản cũ` : ''}. Trạng thái chuyển MEMIF_BUSY_INTERNAL → MEMIF_IDLE.`,
      {
        mode: 'MANUAL',
        apiFlow: `Fee_MainFunction() → ${lowApi.read}() Startup Scan → MEMIF_IDLE`,
        bitImpact: 'Thanh A: B7 FEE_INIT=1, B5 FEE_BUSY_INT=0, B0 JOB_OK_DONE=1 | Status: MEMIF_IDLE',
        memoryImpact: `Active Bank ${simState.activeBank} | RAM LUT = ${lutEntries} entries`,
        swsRef: 'SWS_Fee_00097 / SWS_Fee_00197'
      }
    );
  }
  syncBitRegistersFromState();
  return { lutEntries, tornCount, recoveredCount };
}

function apiFeeInit(reasonOrOpts = 'Cold/Warm Startup', maybeOpts = {}) {
  let reason = 'Cold/Warm Startup';
  let opts = maybeOpts || {};
  if (typeof reasonOrOpts === 'object' && reasonOrOpts !== null) {
    opts = reasonOrOpts;
    reason = opts.reason || 'Cold/Warm Startup';
  } else {
    reason = reasonOrOpts || 'Cold/Warm Startup';
  }

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
    dstBank: selectNextGcTargetBank(simState.activeBank),
    itemsToCopy: [],
    copiedCount: 0,
    eraseTicksDone: 0,
    eraseTicksTotal: Math.max(1, Number(ecucConfig.FlsSectorEraseDurationTicks) || 3)
  };

  const activeIdx = simState.banks.findIndex((b) => b.state === 'BANK_ACTIVE');
  simState.activeBank = activeIdx >= 0 ? activeIdx : 0;
  simState.gcState.srcBank = simState.activeBank;
  simState.gcState.dstBank = selectNextGcTargetBank(simState.activeBank);

  simState.lut = {};
  for (const b of simState.banks) {
    for (const s of b.slots) s.lutCached = false;
  }

  simState.initScanPending = true;
  simState.initReason = reason;
  simState.moduleState = 'MEMIF_BUSY_INTERNAL';
  simState.jobResult = 'MEMIF_JOB_OK';
  simState.moduleSmState = 'BUSY_INTERNAL_GC';
  simState.sectorSmState = 'ACTIVE_NORMAL';
  simState.activeArrows = ['arr_ecum_fee', 'arr_fee_fls'];
  simState.activeModules = ['MOD_ECUM', 'MOD_FEE', 'MOD_FLS'];

  if (opts.completeImmediately) {
    completeStartupScanInternal(reason, true);
    return 'E_OK';
  }

  const lowApi = getLowerApiNames();
  addTrace(
    'Fee',
    'Fee_Init(&Fee_Config)',
    `[SWS_Fee_00085 / SWS_Fee_00120] (${reason}): Khởi tạo hoàn tất bước đồng bộ, chuyển MEMIF_UNINIT → MEMIF_BUSY_INTERNAL chờ Fee_MainFunction() quét Bank ${simState.activeBank}`,
    'INFO'
  );
  pushStepLog(`Fee_Init(&Fee_Config): Chuyển MEMIF_BUSY_INTERNAL (${reason}). Chạy Fee_MainFunction() để quét Bank ${simState.activeBank}.`);
  setCodeSnippet(
    'Fee_Init(&Fee_Config) — Sync Init -> MEMIF_BUSY_INTERNAL [SWS_Fee_00120]',
    `EcuM_StartupTwo() -> Fee_Init(&Fee_Config); /* [SWS_Fee_00085] Service ID 0x00 */\n/* [SWS_Fee_00120] Module transition: MEMIF_UNINIT -> MEMIF_BUSY_INTERNAL */\n/* Tiep theo Fee_MainFunction() [SWS_Fee_00197] se dung ${lowApi.read}() quet Bank ${simState.activeBank} & build RAM LUT */`
  );
  setStepExplain(
    `Fee_Init(&Fee_Config) (${reason}) [SWS_Fee_00085]: Khởi tạo biến nội bộ đồng bộ và chuyển trạng thái MEMIF_UNINIT → MEMIF_BUSY_INTERNAL [SWS_Fee_00120] để lên lịch quét Flash trong nền. Lưu ý: Fee_Read/Fee_Write vẫn được chấp nhận ngay ở MEMIF_BUSY_INTERNAL [SWS_Fee_00172 / SWS_Fee_00174]!`,
    {
      mode: 'MANUAL',
      apiFlow: 'EcuM_StartupTwo() → Fee_Init(&Fee_Config) → MEMIF_BUSY_INTERNAL',
      bitImpact: 'Thanh A: B7 FEE_INIT=1, B5 FEE_BUSY_INT=1 | Status: MEMIF_BUSY_INTERNAL',
      memoryImpact: `Đã lên lịch Startup Scan trên Bank ${simState.activeBank} (chờ Fee_MainFunction)`,
      swsRef: 'SWS_Fee_00085 / SWS_Fee_00120'
    }
  );
  syncBitRegistersFromState();
  return 'E_OK';
}

function apiFeeGetStatus(opts = {}) {
  const st = !ecucConfig.FeeInitialized ? 'MEMIF_UNINIT' : simState.moduleState;
  if (opts.trace) {
    addTrace('Fee', 'Fee_GetStatus()', `[SWS_Fee_00090] Trả về trạng thái hiện tại: ${st}`, 'INFO');
  }
  return st;
}

function apiFeeGetJobResult(opts = {}) {
  if (!ecucConfig.FeeInitialized || simState.moduleState === 'MEMIF_UNINIT') {
    reportDet('FEE_E_UNINIT', 'Fee_GetJobResult');
    return 'MEMIF_JOB_FAILED';
  }
  if (opts.trace) {
    addTrace('Fee', 'Fee_GetJobResult()', `[SWS_Fee_00091] Trả về kết quả job: ${simState.jobResult}`, 'INFO');
  }
  return simState.jobResult;
}

function apiFeeGetVersionInfo(opts = {}) {
  if (!ecucConfig.FeeVersionInfoApi) {
    addTrace('Fee', 'Fee_GetVersionInfo()', '[ECUC_Fee_00115] Bị tắt vì FEE_VERSION_INFO_API == STD_OFF', 'WARN');
    return 'E_NOT_OK';
  }
  if (opts.nullPtr) {
    reportDet('FEE_E_PARAM_POINTER', 'Fee_GetVersionInfo');
    return 'E_NOT_OK';
  }
  const info = { vendorID: 43, moduleID: 21, sw_major_version: 25, sw_minor_version: 11, sw_patch_version: 0 };
  addTrace('Fee', 'Fee_GetVersionInfo(&VerInfo)', `[SWS_Fee_00093] Vendor=43, Module=21, Ver=${info.sw_major_version}.${info.sw_minor_version}.${info.sw_patch_version} (R25-11)`, 'OK');
  return info;
}

function apiFeeSetMode(newMode) {
  if (!ecucConfig.FeeInitialized || simState.moduleState === 'MEMIF_UNINIT') {
    reportDet('FEE_E_UNINIT', 'Fee_SetMode');
    return 'E_NOT_OK';
  }
  if (!ecucConfig.FeeSetModeSupported) {
    addTrace('Fee', `Fee_SetMode(${newMode})`, 'Bị từ chối vì FeeSetModeSupported = FALSE (hoặc dùng MemAcc R25-11 không cần SetMode)', 'WARN');
    setStepExplain(
      `Fee_SetMode(${newMode}) bị từ chối do FeeSetModeSupported = FALSE trong cấu hình Pre-Compile (lưu ý: API này chỉ có ở Classic R20-11 Fls, đã được loại bỏ trong kiến trúc MemAcc R21-11..R25-11).`,
      {
        mode: 'MANUAL',
        apiFlow: `Fee_SetMode(${newMode}) → E_NOT_OK`,
        bitImpact: `Giữ nguyên mode ${ecucConfig.ActiveMemIfMode}`,
        memoryImpact: 'Không thay đổi băng thông tầng dưới',
        swsRef: 'Classic R20-11 Legacy (Removed in R25-11 MemAcc)'
      }
    );
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
  addTrace('Fee', `Fee_SetMode(${newMode})`, `Classic R20-11 Legacy: Chuyển tốc độ ${lowApi.modName} sang ${throughput} B/tick`, 'OK');
  pushStepLog(`Fee_SetMode -> ${newMode} (${throughput} B/tick)`);
  setCodeSnippet(
    `Fee_SetMode(${newMode}) — Classic R20-11 Fls Legacy`,
    `/* Classic R20-11 (trong R25-11 MemAcc khong con Fee_SetMode) */\nMemIf_SetMode(${newMode});\n  -> Fee_SetMode(${newMode});\n  -> Fls_SetMode(${newMode}); /* ${throughput} bytes/tick */`
  );
  setStepExplain(
    `Fee_SetMode(${newMode}) thành công (tương thích Classic R20-11 Fls): Điều chỉnh tốc độ truyền thành ${throughput} Bytes/tick (${newMode === 'MEMIF_MODE_FAST' ? 'dùng khi Init/Shutdown WriteAll' : 'dùng khi chạy nền'}). Ghi chú R25-11: Kiến trúc MemAcc dùng Job Priority thay cho SetMode.`,
    {
      mode: 'MANUAL',
      apiFlow: `BswM/NvM → MemIf_SetMode(${newMode}) → Fee_SetMode() → Fls_SetMode()`,
      bitImpact: `Thanh A: B4 FAST_MODE = ${newMode === 'MEMIF_MODE_FAST' ? '1' : '0'}`,
      memoryImpact: `Thông lượng DFlash = ${throughput} Bytes / tick (${ecucConfig.FeeMainFunctionPeriod}ms)`,
      swsRef: 'Classic R20-11 Legacy (Fls_SetMode; Removed in R25-11 MemAcc)'
    }
  );
  syncBitRegistersFromState();
  return 'E_OK';
}

function apiFeeWrite(blockId, dataPayloadStr, opts = {}) {
  if (!ecucConfig.FeeInitialized || simState.moduleState === 'MEMIF_UNINIT') {
    reportDet('FEE_E_UNINIT', 'Fee_Write');
    return 'E_NOT_OK';
  }

  const candidateBlockId = opts.explicitBlockNumber !== undefined ? opts.explicitBlockNumber : blockId;
  if (!isConfiguredBlockId(candidateBlockId)) {
    reportDet('FEE_E_INVALID_BLOCK_NO', 'Fee_Write');
    return 'E_NOT_OK';
  }
  if (opts.nullPtr) {
    reportDet('FEE_E_PARAM_POINTER', 'Fee_Write');
    return 'E_NOT_OK';
  }

  // [SWS_Fee_00144 / SWS_Fee_00009 Note / SWS_Fee_00174]:
  // Always reject MEMIF_BUSY (even Immediate blocks!) with Runtime Error FEE_E_BUSY.
  // Immediate blocks may ONLY preempt MEMIF_BUSY_INTERNAL (e.g. background GC).
  if (simState.activeJob || simState.moduleState === 'MEMIF_BUSY') {
    reportDet('FEE_E_BUSY', 'Fee_Write');
    return 'E_NOT_OK';
  }

  const normBlkId = normalizeBlockIdKey(blockId);
  const meta = getBlockMeta(normBlkId);
  const isImmediate = Boolean(opts.immediate !== undefined ? opts.immediate : meta.immediate);
  const rawSize = Number(opts.overrideSize || meta.size) || 14;
  const geom = calcSlotGeometry(rawSize);
  const activeId = simState.activeBank;
  const bStats = getBankStats(activeId);

  const lowApi = getLowerApiNames();
  const jobSpec = {
    type: 'WRITE',
    blockId: normBlkId,
    blockName: meta.name,
    rawSize,
    geom,
    immediate: isImmediate,
    dataPreview: dataPayloadStr || `0xA1 0xB2 [${meta.name} New]`,
    phase: 'WRITE_HEADER',
    startClockMs: simState.clockMs,
    bytesWritten: 0,
    totalBytes: geom.totalBytes,
    targetSlotUid: null,
    simulateTornWrite: Boolean(opts.forceTornWrite || ecucConfig.SimulatePowerLossDuringWrite)
  };

  // [SWS_Fee_00009] Immediate Block preempting MEMIF_BUSY_INTERNAL GC!
  if (isImmediate && simState.gcState && simState.gcState.active) {
    simState.gcState.pausedByImmediate = true;
    simState.immediatePreemptActive = true;
    simState.sectorSmState = 'IMMEDIATE_PREEMPT_ZONE';
    if (bStats.usedBytes + geom.totalBytes <= bStats.capacity) {
      startWriteJobIntoActiveBank(jobSpec);
      addTrace(
        'Fee',
        `Fee_Write(${normBlkId}, IMM_PREEMPT)`,
        `[SWS_Fee_00009] Immediate Block xen ngang MEMIF_BUSY_INTERNAL GC! Ghi khẩn ${geom.totalBytes}B vào Reserved Zone Bank ${activeId}.`,
        'WARN'
      );
      pushStepLog(`Immediate Preemption: Tạm dừng GC nền để ghi ${meta.name} (${normBlkId}) vào Reserved Zone!`);
      setCodeSnippet(
        `Fee_Write(${normBlkId}, IMM_PREEMPT) — [SWS_Fee_00009]`,
        `/* [SWS_Fee_00009] Immediate Block xen ngang MEMIF_BUSY_INTERNAL (GC nen)! */\n/* Neu module dang MEMIF_BUSY thi van bi tu choi FEE_E_BUSY [SWS_Fee_00144] */\nFee_Write(${normBlkId}, CrashPayloadPtr); /* FeeImmediateData = TRUE */\n/* Tam hoan GC_COPY_VALID -> Ghi thang ${geom.totalBytes}B vao Reserved Immediate Zone! */`
      );
      setStepExplain(
        `🚨 Immediate Preemption [SWS_Fee_00009]: ${meta.name} (${normBlkId}) có FeeImmediateData=TRUE được gọi khi Fee đang MEMIF_BUSY_INTERNAL nên tạm hoãn GC nền, cấp phát ngay slot ${geom.totalBytes}B vào Reserved Immediate Zone của Bank ${activeId}!`,
        {
          mode: 'MANUAL',
          apiFlow: `Fee_Write(${normBlkId}, IMM=TRUE) [during BUSY_INTERNAL] → Tạm hoãn GC → ${lowApi.write}()`,
          bitImpact: 'Thanh A: B6 FEE_BUSY=1, B2 IMM_PREEMPT=1, B3 GC_ACTIVE=1 | Thanh B: B4 IMM_BLOCK=1',
          memoryImpact: `Cấp phát ${geom.totalBytes}B tại Reserved Immediate Zone (Bank ${activeId})`,
          swsRef: 'SWS_Fee_00009 / SWS_Fee_00025 / SWS_Fee_00174'
        }
      );
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
        `Fee_Write(${normBlkId}) -> Trigger Foreground GC`,
        `Bank ${activeId} đã dùng ${bStats.usedBytes}B / Ngưỡng Standard ${bStats.standardLimitBytes}B. Giữ job vào pendingUserJob -> MEMIF_BUSY [SWS_Fee_00025 / SWS_Fee_00129] & MEMIF_JOB_PENDING [SWS_Fee_00156]!`,
        'WARN'
      );
      pushStepLog(`Vượt ngưỡng ${ecucConfig.FeeGcTriggerThresholdPct}% -> Foreground GC (MEMIF_BUSY) trước khi ghi ${normBlkId}`);
      const gcDst = simState.gcState.dstBank;
      setCodeSnippet(
        `Fee_Write(${normBlkId}) -> Trigger Foreground GC`,
        `/* Bank ${activeId} used (${bStats.usedBytes}B) + Slot (${geom.totalBytes}B) > StandardLimit (${bStats.standardLimitBytes}B) */\n/* [SWS_Fee_00025 / 00129 / 00156]: Status = MEMIF_BUSY, JobResult = MEMIF_JOB_PENDING */\n/* Hang doi PendingUserJob = ${normBlkId}; Chay GC Bank ${activeId} -> Bank ${gcDst} truoc khi ghi! */`
      );
      setStepExplain(
        `♻️ Vượt ngưỡng Standard (${bStats.usedBytes}+${geom.totalBytes} > ${bStats.standardLimitBytes}B): Fee giữ lệnh Fee_Write(${normBlkId}) ở pendingUserJob, chuyển ngay Status → MEMIF_BUSY [SWS_Fee_00025 / SWS_Fee_00129] & JobResult → MEMIF_JOB_PENDING [SWS_Fee_00156] và chạy Foreground GC (Bank ${activeId} → Bank ${gcDst})!`,
        {
          mode: 'MANUAL',
          apiFlow: `Fee_Write(${normBlkId}) → MEMIF_BUSY (MEMIF_JOB_PENDING) → Foreground GC`,
          bitImpact: 'Thanh A: B6 FEE_BUSY=1, B3 GC_ACTIVE=1 | Status: MEMIF_BUSY',
          memoryImpact: `Bank ${activeId} chạm ngưỡng ${ecucConfig.FeeGcTriggerThresholdPct}%, đang chép ${simState.gcState.itemsToCopy.length} VALID blocks sang Bank ${gcDst}`,
          swsRef: 'SWS_Fee_00088 / SWS_Fee_00025 / SWS_Fee_00129 / SWS_Fee_00156'
        }
      );
      syncBitRegistersFromState();
      return 'E_OK';
    }
    reportDet('FEE_E_BUSY', 'Fee_Write');
    return 'E_NOT_OK';
  }

  startWriteJobIntoActiveBank(jobSpec);
  addTrace(
    'MemIf->Fee',
    `Fee_Write(${normBlkId}, &SrcBuf)`,
    `Chấp nhận Async Write [SWS_Fee_00088 / SWS_Fee_00025]: Raw=${rawSize}B + Pad=${geom.paddingBytes}B + Hdr=${geom.hdrSize}B => Slot ${geom.totalBytes}B (${ecucConfig.ActiveMemIfMode})`,
    'INFO'
  );
  pushStepLog(`Bắt đầu Fee_Write(${normBlkId}): Slot ${geom.totalBytes}B (VP=${geom.vp}B) trên Bank ${activeId}.`);
  setCodeSnippet(
    `Fee_Write(${normBlkId}) — Async 3-Phase Pipeline [SWS_Fee_00088]`,
    `NvM_WriteBlock(NvM_${meta.name}, &RamMirror);\n  -> MemIf_Write(0, ${normBlkId}, DataPtr);\n  -> Fee_Write(${normBlkId}, DataPtr); /* ${geom.totalBytes}B */\n/* Phase 1: ${lowApi.write}(Hdr) -> Phase 2: ${lowApi.write}(Data+Pad) -> Phase 3: Trailer ${getTrailerPatternLabel()} */`
  );
  setStepExplain(
    `Tiếp nhận Fee_Write(${normBlkId}) cho ${meta.name} [SWS_Fee_00088]: Payload ${rawSize}B được đệm thêm ${geom.paddingBytes}B (${getErasedByteLabel()}) tròn bội số VP=${geom.vp}B thành ${geom.alignedPayload}B + ${geom.hdrSize}B Header = ${geom.totalBytes}B. Trạng thái chuyển MEMIF_BUSY [SWS_Fee_00025], JobResult = MEMIF_JOB_PENDING [SWS_Fee_00156].`,
    {
      mode: 'MANUAL',
      apiFlow: `NvM_WriteBlock → MemIf_Write(0, ${normBlkId}) → Fee_Write(${normBlkId})`,
      bitImpact: 'Thanh A: B6 FEE_BUSY=1, B0 JOB_OK_DONE=0 | JobResult = MEMIF_JOB_PENDING',
      memoryImpact: `Cấp phát nối đuôi ${geom.totalBytes}B tại cuối Bank ${activeId} (Append-Only)`,
      swsRef: 'SWS_Fee_00088 / SWS_Fee_00024 / SWS_Fee_00025 / SWS_Fee_00156'
    }
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
  const candidateBlockId = sliceOpts.explicitBlockNumber !== undefined ? sliceOpts.explicitBlockNumber : blockId;
  if (!isConfiguredBlockId(candidateBlockId)) {
    reportDet('FEE_E_INVALID_BLOCK_NO', 'Fee_Read');
    return 'E_NOT_OK';
  }
  if (sliceOpts.nullPtr) {
    reportDet('FEE_E_PARAM_POINTER', 'Fee_Read');
    return 'E_NOT_OK';
  }
  if (simState.activeJob || simState.moduleState === 'MEMIF_BUSY') {
    reportDet('FEE_E_BUSY', 'Fee_Read');
    return 'E_NOT_OK';
  }

  const normBlkId = normalizeBlockIdKey(blockId);
  const meta = getBlockMeta(normBlkId);
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

  const targetSlot = simState.initScanPending ? null : lookupSlotForRead(normBlkId);
  const usedLut = Boolean(ecucConfig.FeeEnableRamLutCache && !simState.initScanPending && simState.lut[normBlkId]);
  const scanTicks = ecucConfig.FeeEnableRamLutCache ? 1 : 2;
  simState.stats.totalReads += 1;
  simState.lastReadSliceText = `Ofs=${readOfs}, Len=${readLen}/${meta.size}B`;

  simState.activeJob = {
    type: 'READ',
    blockId: normBlkId,
    blockName: meta.name,
    rawSize: readLen,
    offsetInBlock: readOfs,
    fullBlockSize: meta.size,
    phase: 'READ_DATA',
    startClockMs: simState.clockMs,
    ticksRemaining: scanTicks,
    totalTicks: scanTicks,
    targetSlotUid: targetSlot ? targetSlot.uid : null,
    usedLut,
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
  const lookupMode = usedLut ? 'O(1) RAM LUT Hit' : 'O(N) Linear Scan (LUT OFF / Scanning)';
  const blankCheckNote = lowApi.isR23 ? ` + ${lowApi.blankCheck}() [SWS_Fee_00187]` : '';
  addTrace('MemIf->Fee', `Fee_Read(${normBlkId}, ${readOfs}, Buf, ${readLen})`, `[SWS_Fee_00087] ${lookupMode}, chuẩn bị ${lowApi.read}()${blankCheckNote}`, 'INFO');
  pushStepLog(`Bắt đầu Fee_Read(${normBlkId}, Ofs=${readOfs}, Len=${readLen}B) qua ${lookupMode}.`);
  setCodeSnippet(
    `Fee_Read(${normBlkId}, Offset=${readOfs}, Len=${readLen}B) — [SWS_Fee_00087]`,
    `Fee_Read(${normBlkId}, ${readOfs}U, AppRxBuf, ${readLen}U); /* [SWS_Fee_00021 / 00172] */\n/* Lookup: ${lookupMode} | MinReadPageSize = ${ecucConfig.FeeMinimumReadPageSize}B [SWS_Fee_00196] */\n${lowApi.isR23 ? `${lowApi.blankCheck}(TargetAddr, ${ecucConfig.FeeMinimumReadPageSize}U); /* [SWS_Fee_00187] Verify blank before read */\n` : ''}${lowApi.read}(${targetSlot ? `Bank${targetSlot.bankId} + 0x${(targetSlot.offset + targetSlot.hdrSize + readOfs).toString(16).toUpperCase()}` : '0xFFFF'}, AppRxBuf, ${readLen}U);`
  );
  setStepExplain(
    `Tiếp nhận Fee_Read(${normBlkId}, Offset=${readOfs}, Len=${readLen}B) [SWS_Fee_00087]: Tra cứu theo ${lookupMode}${targetSlot ? ` -> tìm thấy Bank ${targetSlot.bankId} +0x${targetSlot.offset.toString(16).toUpperCase()} (địa chỉ đọc vật lý +0x${(targetSlot.offset + targetSlot.hdrSize + readOfs).toString(16).toUpperCase()})` : simState.initScanPending ? ' (chờ Startup Scan hoàn tất ở tick tới)' : ' (chưa có slot trên Flash)'}.`,
    {
      mode: 'MANUAL',
      apiFlow: `MemIf_Read(0, ${normBlkId}, ${readOfs}, Len=${readLen}) → Fee_Read() → ${lowApi.isR23 ? `${lowApi.blankCheck}() + ` : ''}${lowApi.read}()`,
      bitImpact: 'Thanh A: B6 FEE_BUSY=1 | JobResult = MEMIF_JOB_PENDING',
      memoryImpact: `${lookupMode} | MinReadPage=${ecucConfig.FeeMinimumReadPageSize}B [SWS_Fee_00196] | Lát cắt ${readLen}B từ +${readOfs}B`,
      swsRef: lowApi.isR23 ? 'SWS_Fee_00087 / SWS_Fee_00021 / SWS_Fee_00187 / SWS_Fee_00196' : 'SWS_Fee_00087 / SWS_Fee_00021 / SWS_Fee_00172'
    }
  );
  syncBitRegistersFromState();
  return 'E_OK';
}

function startInvalidateJobIntoActiveBank(jobSpec) {
  const bank = simState.banks[simState.activeBank];
  const stats = getBankStats(simState.activeBank);
  const meta = getBlockMeta(jobSpec.blockId);
  const seq = simState.nextSeqByBlock[jobSpec.blockId] || 1;
  simState.nextSeqByBlock[jobSpec.blockId] = seq + 1;
  const invSlot = makeSlotRecord({
    bankId: bank.id,
    offset: stats.usedBytes,
    blockId: jobSpec.blockId,
    blockName: meta.name,
    seq,
    rawSize: 0,
    geom: jobSpec.geom,
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
    blockId: jobSpec.blockId,
    blockName: meta.name,
    phase: 'WRITE_INV_MARKER',
    startClockMs: simState.clockMs,
    ticksRemaining: 1,
    totalTicks: 1,
    targetSlotUid: invSlot.uid,
    bytesWritten: 0,
    totalBytes: jobSpec.geom.totalBytes
  };
  simState.moduleState = 'MEMIF_BUSY';
  simState.jobResult = 'MEMIF_JOB_PENDING';
  simState.moduleSmState = 'BUSY_USER_JOB';
  simState.activeArrows = ['arr_nvm_memif', 'arr_memif_fee', 'arr_fee_fls', 'arr_fls_dflash'];
  simState.activeModules = ['MOD_NVM', 'MOD_MEMIF', 'MOD_FEE', 'MOD_FLS', 'MOD_DFLASH'];
  return invSlot;
}

function apiFeeInvalidate(blockId, opts = {}) {
  if (!ecucConfig.FeeInitialized || simState.moduleState === 'MEMIF_UNINIT') {
    reportDet('FEE_E_UNINIT', 'Fee_InvalidateBlock');
    return 'E_NOT_OK';
  }
  const candidateBlockId = opts.explicitBlockNumber !== undefined ? opts.explicitBlockNumber : blockId;
  if (!isConfiguredBlockId(candidateBlockId)) {
    reportDet('FEE_E_INVALID_BLOCK_NO', 'Fee_InvalidateBlock');
    return 'E_NOT_OK';
  }
  if (simState.activeJob || simState.moduleState === 'MEMIF_BUSY') {
    reportDet('FEE_E_BUSY', 'Fee_InvalidateBlock');
    return 'E_NOT_OK';
  }

  const normBlkId = normalizeBlockIdKey(blockId);
  const meta = getBlockMeta(normBlkId);
  const geom = calcSlotGeometry(4);
  const stats = getBankStats(simState.activeBank);

  if (stats.usedBytes + geom.totalBytes > stats.capacity) {
    startGarbageCollectionInternal({
      type: 'INVALIDATE',
      blockId: normBlkId,
      blockName: meta.name,
      geom
    });
    return 'E_OK';
  }

  const invSlot = startInvalidateJobIntoActiveBank({ blockId: normBlkId, geom });
  const lowApi = getLowerApiNames();
  addTrace('Fee', `Fee_InvalidateBlock(${normBlkId})`, '[SWS_Fee_00092 / SWS_Fee_00036] Ghi Invalidation Marker lên DFlash (xóa mềm không cần Erase)', 'WARN');
  pushStepLog(`Fee_InvalidateBlock(${normBlkId}): Xóa mềm logic -> Read sau sẽ trả MEMIF_BLOCK_INVALID.`);
  setCodeSnippet(
    `Fee_InvalidateBlock(${normBlkId}) — [SWS_Fee_00092]`,
    `NvM_InvalidateNvBlock(NvM_${meta.name});\n  -> MemIf_InvalidateBlock(0, ${normBlkId});\n  -> Fee_InvalidateBlock(${normBlkId}); /* [SWS_Fee_00036 / SWS_Fee_00192] */\n/* Ghi Invalidation Marker bang ${lowApi.write}() tai Bank ${invSlot.bankId} +0x${invSlot.offset.toString(16).toUpperCase()} */`
  );
  setStepExplain(
    `Tiếp nhận Fee_InvalidateBlock(${normBlkId}) [SWS_Fee_00092]: Thay vì xóa cả Sector Flash, Fee cấp phát slot Invalidation Marker (${geom.totalBytes}B) ở cuối Bank ${invSlot.bankId} để vô hiệu hóa logic khối ${meta.name}.`,
    {
      mode: 'MANUAL',
      apiFlow: `NvM_InvalidateNvBlock → Fee_InvalidateBlock(${normBlkId}) → ${lowApi.write}()`,
      bitImpact: 'Thanh A: B6 FEE_BUSY=1 | Thanh B: B1 INVALIDATED=1 | JobResult = MEMIF_JOB_PENDING',
      memoryImpact: `Cấp phát Invalidation Marker tại Bank ${invSlot.bankId} +0x${invSlot.offset.toString(16).toUpperCase()}`,
      swsRef: 'SWS_Fee_00092 / SWS_Fee_00036 / SWS_Fee_00192'
    }
  );
  syncBitRegistersFromState();
  return 'E_OK';
}

function apiFeeEraseImmediateBlock(blockId, opts = {}) {
  if (!ecucConfig.FeeInitialized || simState.moduleState === 'MEMIF_UNINIT') {
    reportDet('FEE_E_UNINIT', 'Fee_EraseImmediateBlock');
    return 'E_NOT_OK';
  }
  const candidateBlockId = opts.explicitBlockNumber !== undefined ? opts.explicitBlockNumber : blockId;
  if (!isConfiguredBlockId(candidateBlockId)) {
    reportDet('FEE_E_INVALID_BLOCK_NO', 'Fee_EraseImmediateBlock');
    return 'E_NOT_OK';
  }
  const normBlkId = normalizeBlockIdKey(blockId);
  const meta = getBlockMeta(normBlkId);
  if (!meta.immediate) {
    reportDet('FEE_E_INVALID_BLOCK_NO', 'Fee_EraseImmediateBlock');
    return 'E_NOT_OK';
  }
  if (simState.activeJob || simState.moduleState === 'MEMIF_BUSY') {
    reportDet('FEE_E_BUSY', 'Fee_EraseImmediateBlock');
    return 'E_NOT_OK';
  }

  const geom = calcSlotGeometry(meta.size);
  const lowApi = getLowerApiNames();
  simState.activeJob = {
    type: 'ERASE_IMM',
    blockId: normBlkId,
    blockName: meta.name,
    phase: 'ERASE_IMM_PREP',
    startClockMs: simState.clockMs,
    ticksRemaining: 1,
    totalTicks: 1,
    bytesWritten: 0,
    totalBytes: geom.totalBytes
  };
  simState.moduleState = 'MEMIF_BUSY';
  simState.jobResult = 'MEMIF_JOB_PENDING';
  simState.moduleSmState = 'BUSY_USER_JOB';
  simState.sectorSmState = 'IMMEDIATE_PREEMPT_ZONE';
  simState.activeArrows = ['arr_nvm_memif', 'arr_memif_fee', 'arr_fee_fls'];
  simState.activeModules = ['MOD_NVM', 'MOD_MEMIF', 'MOD_FEE', 'MOD_FLS'];

  addTrace('Fee', `Fee_EraseImmediateBlock(${normBlkId})`, '[SWS_Fee_00094 / SWS_Fee_00067] Tiếp nhận Async Job chuẩn bị không gian cho Immediate Block -> MEMIF_BUSY', 'OK');
  pushStepLog(`Tiếp nhận Fee_EraseImmediateBlock(${normBlkId}) -> Async JOB_PENDING.`);
  setCodeSnippet(
    `Fee_EraseImmediateBlock(${normBlkId}) — Async [SWS_Fee_00094]`,
    `/* [SWS_Fee_00094 / SWS_Fee_00067] Chuan bi bat dong bo vung nho Immediate Block */\nFee_EraseImmediateBlock(${normBlkId}); /* FeeImmediateData == TRUE [SWS_Fee_00068] */\n/* Status = MEMIF_BUSY, JobResult = MEMIF_JOB_PENDING; Fee_MainFunction() se hoan tat & bao Callback */`
  );
  setStepExplain(
    `Tiếp nhận Fee_EraseImmediateBlock(${normBlkId}) [SWS_Fee_00094]: Kiểm tra FeeImmediateData == TRUE [SWS_Fee_00068], chuyển sang MEMIF_BUSY & MEMIF_JOB_PENDING để Fee_MainFunction() giải phóng/chuẩn bị vùng nhớ (${lowApi.erase} / đánh dấu bản cũ) trước khi ghi khẩn.`,
    {
      mode: 'MANUAL',
      apiFlow: `Fee_EraseImmediateBlock(${normBlkId}) → MEMIF_BUSY → Fee_MainFunction()`,
      bitImpact: 'Thanh A: B6 FEE_BUSY=1 | Thanh B: B4 IMM_BLOCK=1 | Sector SM: IMMEDIATE_PREEMPT_ZONE',
      memoryImpact: `Chuẩn bị bất đồng bộ không gian Reserved Immediate Zone cho ${meta.name}`,
      swsRef: 'SWS_Fee_00094 / SWS_Fee_00066 / SWS_Fee_00067 / SWS_Fee_00068'
    }
  );
  syncBitRegistersFromState();
  return 'E_OK';
}

function apiFeeCancel() {
  if (!ecucConfig.FeeInitialized || simState.moduleState === 'MEMIF_UNINIT') {
    reportDet('FEE_E_UNINIT', 'Fee_Cancel');
    return 'E_NOT_OK';
  }
  // [SWS_Fee_00184 / SWS_Fee_00164]: Only valid when status is MEMIF_BUSY!
  // Calling during MEMIF_IDLE or MEMIF_BUSY_INTERNAL reports Runtime Error FEE_E_INVALID_CANCEL.
  if (simState.moduleState !== 'MEMIF_BUSY') {
    reportDet('FEE_E_INVALID_CANCEL', 'Fee_Cancel');
    return 'E_NOT_OK';
  }

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
  const canceledBlock = simState.activeJob
    ? simState.activeJob.blockId
    : (simState.pendingUserJob ? simState.pendingUserJob.blockId : 'Job');
  simState.activeJob = null;
  simState.pendingUserJob = null;
  simState.immediatePreemptActive = false;
  simState.moduleState = simState.gcState && simState.gcState.active ? 'MEMIF_BUSY_INTERNAL' : 'MEMIF_IDLE';
  simState.moduleSmState = simState.gcState && simState.gcState.active ? 'BUSY_INTERNAL_GC' : 'IDLE';
  simState.jobResult = 'MEMIF_JOB_CANCELED';

  simState.activeArrows = ['arr_nvm_memif', 'arr_memif_fee', 'arr_fee_fls'];
  simState.activeModules = ['MOD_NVM', 'MOD_MEMIF', 'MOD_FEE', 'MOD_FLS'];
  addTrace('Fee', 'Fee_Cancel()', `[SWS_Fee_00089 / SWS_Fee_00080] Hủy job ${canceledBlock}, gọi ${lowApi.cancel}() -> JobResult = MEMIF_JOB_CANCELED [SWS_Fee_00157]`, 'WARN');
  pushStepLog(`Fee_Cancel(): Job ${canceledBlock} bị hủy -> MEMIF_JOB_CANCELED.`);
  setCodeSnippet(
    'Fee_Cancel() — Abort Running Job [SWS_Fee_00089]',
    `NvM_Cancel() -> MemIf_Cancel(0) -> Fee_Cancel(); /* Service ID 0x04 */\n  -> ${lowApi.cancel}(); /* [SWS_Fee_00080] */\n/* [SWS_Fee_00081] Status -> MEMIF_IDLE (hoac BUSY_INTERNAL neu con GC nen) */\n/* [SWS_Fee_00157] JobResult = MEMIF_JOB_CANCELED; RAM LUT giu nguyen ban VALID cu! */`
  );
  setStepExplain(
    `Fee_Cancel() [SWS_Fee_00089] đã hủy ngang job ${canceledBlock} và gọi ${lowApi.cancel}() [SWS_Fee_00080]. Slot ghi dở chuyển INCONSISTENT, RAM LUT giữ nguyên bản VALID cũ và JobResult = MEMIF_JOB_CANCELED [SWS_Fee_00157]!`,
    {
      mode: 'MANUAL',
      apiFlow: `Fee_Cancel() → ${lowApi.cancel}() → JobResult = MEMIF_JOB_CANCELED`,
      bitImpact: `Thanh A: B6 FEE_BUSY=0, B1 JOB_ERR_PEND=1 | Status: ${simState.moduleState}`,
      memoryImpact: 'Slot ghi dở thành INCONSISTENT; RAM LUT giữ bản VALID cũ an toàn',
      swsRef: 'SWS_Fee_00089 / SWS_Fee_00080 / SWS_Fee_00081 / SWS_Fee_00157'
    }
  );
  syncBitRegistersFromState();
  return 'E_OK';
}

function startGarbageCollectionInternal(pendingJobAfterGc = null) {
  if (simState.initScanPending) {
    completeStartupScanInternal('Pre-GC Startup Scan', false);
  }
  const srcBank = simState.activeBank;
  const dstBank = selectNextGcTargetBank(srcBank);

  if (simState.banks[dstBank].slots.length > 0 && simState.banks[dstBank].state !== 'BANK_ERASED_STANDBY') {
    simState.banks[dstBank].slots = [];
    simState.banks[dstBank].state = 'BANK_ERASED_STANDBY';
  }

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
  const isForegroundUserGc = Boolean(pendingJobAfterGc);
  if (isForegroundUserGc) {
    simState.pendingUserJob = pendingJobAfterGc;
    // [SWS_Fee_00025 / SWS_Fee_00129 / SWS_Fee_00156]: Foreground GC stays MEMIF_BUSY
    simState.moduleState = 'MEMIF_BUSY';
    simState.jobResult = 'MEMIF_JOB_PENDING';
    simState.moduleSmState = 'BUSY_USER_JOB';
  } else {
    // [SWS_Fee_00074 / SWS_Fee_00155]: Background internal GC uses MEMIF_BUSY_INTERNAL & preserves JobResult!
    simState.moduleState = 'MEMIF_BUSY_INTERNAL';
    simState.moduleSmState = 'BUSY_INTERNAL_GC';
  }
  simState.sectorSmState = 'GC_COPYING_TO_STANDBY';
  simState.stats.totalGcRuns += 1;
  simState.activeArrows = ['arr_fee_fls', 'arr_fls_dflash', 'arr_fls_fee'];
  simState.activeModules = ['MOD_FEE', 'MOD_FLS', 'MOD_DFLASH'];

  pushStepLog(`Bắt đầu ${isForegroundUserGc ? 'Foreground' : 'Background'} GC: Copy ${itemsToCopy.length} VALID block từ Bank ${srcBank} -> Bank ${dstBank}.`);
  setStepExplain(
    `♻️ Khởi chạy ${isForegroundUserGc ? 'Foreground' : 'Background'} Garbage Collection: Thu thập ${itemsToCopy.length} bản ghi VALID mới nhất từ Bank ${srcBank} chép sang Bank ${dstBank} (bỏ rác SUPERSEDED/INVALIDATED). Trạng thái = ${simState.moduleState}${isForegroundUserGc ? ' [SWS_Fee_00025]' : ' [SWS_Fee_00074] (giữ nguyên JobResult [SWS_Fee_00155])'}.`,
    {
      mode: 'MANUAL',
      apiFlow: `Fee GC Start (${simState.moduleState}) → Copy ${itemsToCopy.length} VALID blocks (Bank ${srcBank} → Bank ${dstBank})`,
      bitImpact: `Thanh A: ${isForegroundUserGc ? 'B6 FEE_BUSY=1' : 'B5 FEE_BUSY_INT=1'}, B3 GC_ACTIVE=1 | Status: ${simState.moduleState}`,
      memoryImpact: `Bank ${dstBank} = GC COPY TARGET`,
      swsRef: isForegroundUserGc ? 'SWS_Fee_00025 / SWS_Fee_00129 / SWS_Fee_00102' : 'SWS_Fee_00074 / SWS_Fee_00155 / SWS_Fee_00102'
    }
  );
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
  setStepExplain(
    `⚡ SỰ CỐ MẤT ĐIỆN (Torn Write) tại ${blockId} Seq#${seq}: Đã ghi Header nhưng mất nguồn trước khi chốt Valid Trailer ${getTrailerPatternLabel()}! Slot thành INCONSISTENT và ECU về MEMIF_UNINIT.`,
    {
      mode: 'MANUAL',
      apiFlow: `HW Power Loss → Torn Write @ Bank ${bank.id} +0x${offset.toString(16).toUpperCase()}`,
      bitImpact: 'Thanh A: B7 FEE_INIT=0 | Thanh B: B5 VALID_TRAILR=0, B0 INCONSISTENT=1',
      memoryImpact: `Slot ${blockId} #${seq} đánh dấu INCONSISTENT (chờ Fee_Init phục hồi)`,
      swsRef: 'SWS_Fee_00014 / SWS_Fee_00023'
    }
  );
  syncBitRegistersFromState();
}

function advanceOneTickGc() {
  const gc = simState.gcState;
  const lowApi = getLowerApiNames();
  if (!gc || !gc.active) return false;
  const isForeground = Boolean(simState.pendingUserJob);
  const busyBitText = isForeground ? 'B6 FEE_BUSY=1' : 'B5 FEE_BUSY_INT=1';

  if (gc.phase === 'GC_COPY_VALID') {
    if (gc.copiedCount < gc.itemsToCopy.length) {
      const srcSlot = gc.itemsToCopy[gc.copiedCount];
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
      setStepExplain(
        `♻️ GC Pha Copy [${gc.copiedCount}/${gc.itemsToCopy.length}]: Đang chép bản ghi VALID ${copied.blockId} (${copied.totalBytes}B) từ Bank ${gc.srcBank} sang Bank ${gc.dstBank} +0x${copied.offset.toString(16).toUpperCase()}, bỏ qua toàn bộ bản cũ SUPERSEDED.`,
        {
          mode: 'MANUAL',
          apiFlow: `Fee_MainFunction() → ${lowApi.read}(Bank ${gc.srcBank}) → ${lowApi.write}(Bank ${gc.dstBank})`,
          bitImpact: `Thanh A: ${busyBitText}, B3 GC_ACTIVE=1 | Sector SM: GC_COPYING_TO_STANDBY`,
          memoryImpact: `Đã chép ${gc.copiedCount}/${gc.itemsToCopy.length} khối VALID sang Bank ${gc.dstBank}`,
          swsRef: isForeground ? 'SWS_Fee_00025 / SWS_Fee_00102' : 'SWS_Fee_00074 / SWS_Fee_00102'
        }
      );
      if (gc.copiedCount >= gc.itemsToCopy.length) {
        gc.phase = 'GC_SWITCH_BANK';
      }
      return true;
    } else {
      gc.phase = 'GC_SWITCH_BANK';
    }
  }

  if (gc.phase === 'GC_SWITCH_BANK') {
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
    setStepExplain(
      `🔄 Sector Switch hoàn tất: Bank ${gc.dstBank} chính thức trở thành ACTIVE BANK; toàn bộ RAM LUT đã cập nhật sang địa chỉ mới bên Bank ${gc.dstBank}. Chuẩn bị gọi ${lowApi.erase}(Bank ${gc.srcBank}).`,
      {
        mode: 'MANUAL',
        apiFlow: `Sector Switch → Active Bank = Bank ${gc.dstBank} → Chuẩn bị ${lowApi.erase}(Bank ${gc.srcBank})`,
        bitImpact: `Thanh A: ${busyBitText}, B3 GC_ACTIVE=1 | Sector SM: GC_ERASING_OLD_BANK`,
        memoryImpact: `RAM LUT trỏ 100% sang Bank ${gc.dstBank}; Bank ${gc.srcBank} chờ xóa`,
        swsRef: 'SWS_Fee_00102 / SWS_Fee_00103'
      }
    );
    return true;
  }

  if (gc.phase === 'GC_ERASE_OLD') {
    if (ecucConfig.SimulateFlsEraseError) {
      const hadPending = Boolean(simState.pendingUserJob);
      simState.pendingUserJob = null;
      simState.banks[gc.srcBank].state = 'BANK_CORRUPT_DEM';
      gc.active = false;
      gc.phase = 'NONE';
      simState.sectorSmState = 'SECTOR_CORRUPT_DEM';
      simState.moduleState = 'MEMIF_IDLE';
      simState.moduleSmState = 'JOB_ERROR';
      simState.jobResult = 'MEMIF_JOB_FAILED';
      reportDem('FEE_E_GC_ERASE_FAILED', 'FAILED');
      if (hadPending) emitLowerCompletionAndUpperCallback(false, 'MEMIF_JOB_FAILED', `${lowApi.erase} Failed`);
      setStepExplain(
        `💥 Lỗi phần cứng ${lowApi.erase}(Bank ${gc.srcBank}) trong Garbage Collection! Tầng dưới (${lowApi.modName}) báo lỗi HW lên DEM, Bank ${gc.srcBank} khóa SECTOR_CORRUPT_DEM và Fee trả MEMIF_JOB_FAILED [SWS_Fee_00158 / SWS_Fee_00056].`,
        {
          mode: 'MANUAL',
          apiFlow: `${lowApi.erase}(Bank ${gc.srcBank}) FAIL → ${lowApi.modName} DEM + Fee MEMIF_JOB_FAILED`,
          bitImpact: 'Thanh A: B1 JOB_ERR_PEND=1 | Sector SM: SECTOR_CORRUPT_DEM',
          memoryImpact: `Bank ${gc.srcBank} hỏng không thể Erase; dữ liệu vẫn an toàn trên Bank ${gc.dstBank}`,
          swsRef: 'SWS_Fee_00158 / SWS_Fee_00056 / §7.2.3'
        }
      );
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
        if (queued.type === 'INVALIDATE') {
          startInvalidateJobIntoActiveBank(queued);
          setStepExplain(
            `✅ ${lowApi.erase}(Bank ${gc.srcBank}) hoàn tất: Tự động thực thi lệnh Fee_InvalidateBlock(${queued.blockId}) đang chờ trên Bank ${simState.activeBank}!`,
            {
              mode: 'MANUAL',
              apiFlow: `${lowApi.erase}(Bank ${gc.srcBank}) DONE → Pending Fee_InvalidateBlock(${queued.blockId})`,
              bitImpact: 'Thanh A: B3 GC_ACTIVE=0, B6 FEE_BUSY=1 | Sector SM: ACTIVE_NORMAL',
              memoryImpact: `Bank ${gc.srcBank} = ERASED STANDBY | Invalidate ${queued.blockId}`,
              swsRef: 'SWS_Fee_00092 / SWS_Fee_00102'
            }
          );
        } else {
          startWriteJobIntoActiveBank(queued);
          setStepExplain(
            `✅ ${lowApi.erase}(Bank ${gc.srcBank}) hoàn tất (EraseCount=${simState.banks[gc.srcBank].eraseCount}): Bank ${gc.srcBank} sạch 100% (${getErasedByteLabel()}). Tự động kích hoạt lệnh Fee_Write(${queued.blockId}) đang chờ lên Bank ${simState.activeBank}!`,
            {
              mode: 'MANUAL',
              apiFlow: `${lowApi.erase}(Bank ${gc.srcBank}) DONE → Bắt đầu Pending Fee_Write(${queued.blockId})`,
              bitImpact: 'Thanh A: B3 GC_ACTIVE=0, B6 FEE_BUSY=1 | Sector SM: ACTIVE_NORMAL',
              memoryImpact: `Bank ${gc.srcBank} = ERASED STANDBY | Bắt đầu ghi ${queued.blockId} lên Bank ${simState.activeBank}`,
              swsRef: 'SWS_Fee_00088 / SWS_Fee_00025 / SWS_Fee_00102'
            }
          );
        }
      } else {
        // [SWS_Fee_00197 / SWS_Fee_00155]: Background internal GC goes to MEMIF_IDLE WITHOUT overwriting jobResult!
        simState.moduleState = 'MEMIF_IDLE';
        simState.moduleSmState = 'IDLE';
        setStepExplain(
          `✅ Background GC hoàn tất [SWS_Fee_00197]: Bank ${gc.srcBank} đã xóa sạch về ${getErasedByteLabel()} (EraseCount=${simState.banks[gc.srcBank].eraseCount}), Active Bank hiện tại là Bank ${simState.activeBank}. Fee chuyển MEMIF_IDLE và bảo toàn nguyên vẹn JobResult (${simState.jobResult}) [SWS_Fee_00155].`,
          {
            mode: 'MANUAL',
            apiFlow: `${lowApi.erase}(Bank ${gc.srcBank}) DONE → MEMIF_IDLE (JobResult=${simState.jobResult})`,
            bitImpact: 'Thanh A: B5 FEE_BUSY_INT=0, B3 GC_ACTIVE=0 | Status: MEMIF_IDLE',
            memoryImpact: `Bank ${gc.srcBank} = ERASED (0xFF), Active = Bank ${simState.activeBank}`,
            swsRef: 'SWS_Fee_00197 / SWS_Fee_00155 / SWS_Fee_00102'
          }
        );
      }
    } else {
      setStepExplain(
        `⏳ Đang xóa Bank ${gc.srcBank} (${gc.eraseTicksDone}/${gc.eraseTicksTotal} ticks) bằng ${lowApi.erase}(): Kéo toàn bộ bit Flash từ 0 về 1 (${getErasedByteLabel()}).`,
        {
          mode: 'MANUAL',
          apiFlow: `${lowApi.mainFn}() → ${lowApi.erase}(Bank ${gc.srcBank}) [${gc.eraseTicksDone}/${gc.eraseTicksTotal}]`,
          bitImpact: `Thanh A: ${busyBitText}, B3 GC_ACTIVE=1`,
          memoryImpact: `Bank ${gc.srcBank} đang được xóa về ${getErasedByteLabel()}`,
          swsRef: isForeground ? 'SWS_Fee_00025 / SWS_Fee_00102' : 'SWS_Fee_00074 / SWS_Fee_00102'
        }
      );
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
    addTrace('SchM', 'Fee_MainFunction()', '[SWS_Fee_00097] Bị bỏ qua vì MEMIF_UNINIT (chưa chạy Fee_Init)', 'WARN');
    syncBitRegistersFromState();
    return;
  }

  // 0. Finish deferred Startup Scan from Fee_Init() [SWS_Fee_00197]
  if (simState.initScanPending) {
    completeStartupScanInternal(simState.initReason || 'Startup Scan', true);
    if (simState.activeJob && simState.activeJob.type === 'READ' && !simState.activeJob.targetSlotUid) {
      const resolved = lookupSlotForRead(simState.activeJob.blockId);
      simState.activeJob.targetSlotUid = resolved ? resolved.uid : null;
      simState.activeJob.usedLut = Boolean(ecucConfig.FeeEnableRamLutCache && simState.lut[simState.activeJob.blockId]);
      if (resolved) simState.selectedSlotUid = resolved.uid;
    }
    if (!simState.activeJob && !(simState.gcState && simState.gcState.active)) {
      syncBitRegistersFromState();
      return;
    }
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
        finishUserJobModuleState(true);
        simState.jobResult = 'MEMIF_JOB_FAILED';
        reportDem('FEE_E_FLS_WRITE_FAILED', 'FAILED');
        emitLowerCompletionAndUpperCallback(false, 'MEMIF_JOB_FAILED', `Verify Fail ${job.blockId}`);
        setStepExplain(
          `💥 Lỗi Flash Write Verify (${lowApi.write}): Phần cứng phát hiện bit không nạp được 1→0 (Stuck Bit)! Fee hủy slot lỗi thành INCONSISTENT, giữ nguyên bản cũ trong RAM LUT, tầng dưới báo DEM và Fee trả MEMIF_JOB_FAILED [SWS_Fee_00158 / SWS_Fee_00056].`,
          {
            mode: 'MANUAL',
            apiFlow: `${lowApi.write}() Verify Fail → ${lowApi.isR23 ? 'Fee_JobEndNotification() → ' : ''}NvM_JobErrorNotification()`,
            bitImpact: 'Thanh A: B6=0, B1 JOB_ERR_PEND=1 | Thanh B: B0 INCONSISTENT=1',
            memoryImpact: 'Slot mới hỏng (INCONSISTENT); RAM LUT giữ bản VALID cũ an toàn',
            swsRef: 'SWS_Fee_00056 / SWS_Fee_00095 / SWS_Fee_00194'
          }
        );
        syncBitRegistersFromState();
        return;
      }

      if (job.simulateTornWrite && job.bytesWritten >= job.geom.hdrSize) {
        if (slot) {
          slot.status = 'INCONSISTENT';
          slot.hdrWritten = true;
          slot.dataAligned = false;
          slot.validTrailer = false;
          slot.inconsistent = true;
          slot.dataPreview = '0xFF 0x?? [TORN WRITE POWER CUT]';
        }
        simState.activeJob = null;
        simState.pendingUserJob = null;
        simState.immediatePreemptActive = false;
        simState.initScanPending = false;
        simState.powerLossOccurred = true;
        ecucConfig.FeeInitialized = false;
        simState.moduleState = 'MEMIF_UNINIT';
        simState.moduleSmState = 'UNINIT';
        simState.jobResult = 'MEMIF_BLOCK_INCONSISTENT';
        addTrace('HW PowerCut', `Torn Write @ ${job.blockId}`, `Mất nguồn giữa Phase 2 trước khi ghi Valid Trailer ${getTrailerPatternLabel()}!`, 'ERR');
        pushStepLog(`Torn Write tại ${job.blockId}! Block thiếu Trailer ${getTrailerPatternLabel()} -> INCONSISTENT.`);
        setStepExplain(
          `⚡ SẬP NGUỒN GIỮA PHASE 2 (${job.blockId}): Header đã ghi (HDR_WRITTEN=1) nhưng chưa kịp chốt Valid Trailer ${getTrailerPatternLabel()}! Slot thành đỏ INCONSISTENT (Torn Write) và ECU mất điện về MEMIF_UNINIT.`,
          {
            mode: 'MANUAL',
            apiFlow: `HW Power Loss giữa ${lowApi.write}() → Torn Write (${job.blockId})`,
            bitImpact: 'Thanh A: B7 FEE_INIT=0 | Thanh B: B7=1, B5 VALID_TRAILR=0, B0 INCONSISTENT=1',
            memoryImpact: `Slot mới bị Torn Write; dữ liệu cũ vẫn nguyên vẹn chờ Fee_Init()`,
            swsRef: 'SWS_Fee_00023 / SWS_Fee_00153 / SWS_Fee_00154'
          }
        );
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
          const hadActiveGc = Boolean(simState.gcState && simState.gcState.active);
          if (hadActiveGc) simState.gcState.pausedByImmediate = false;

          simState.activeArrows = ['arr_fee_nvm', 'arr_nvm_memif', 'arr_fls_fee'];
          simState.activeModules = ['MOD_NVM', 'MOD_MEMIF', 'MOD_FEE', 'MOD_FLS'];
          finishUserJobModuleState(false);
          simState.jobResult = 'MEMIF_JOB_OK';

          addTrace(
            lowApi.modName,
            `${lowApi.write} -> Trailer ${getTrailerPatternLabel()}`,
            `Hoàn tất ghi ${slot.blockId} (${slot.totalBytes}B) trong ${elapsed}ms. RAM LUT cập nhật!`,
            'OK'
          );
          emitLowerCompletionAndUpperCallback(true, 'MEMIF_JOB_OK', `Write ${slot.blockId}`);
          pushStepLog(`Fee_Write(${slot.blockId}) xong trong ${elapsed}ms -> MEMIF_JOB_OK.`);
          setStepExplain(
            `✅ Hoàn tất Phase 3 ghi ${slot.blockId} (${slot.totalBytes}B trong ${elapsed}ms): Chốt Valid Trailer ${getTrailerPatternLabel()}, đánh dấu bản cũ SUPERSEDED, cập nhật RAM LUT và báo MEMIF_JOB_OK [SWS_Fee_00155 / SWS_Fee_00055].`,
            {
              mode: 'MANUAL',
              apiFlow: `${lowApi.write}(Trailer ${getTrailerPatternLabel()}) → ${lowApi.isR23 ? 'Fee_JobEndNotification() → ' : ''}NvM_JobEndNotification()`,
              bitImpact: `Thanh B: B7=1, B6=1, B5 VALID_TRAILR=1, B3 LUT_CACHED=1 | Status = ${simState.moduleState}`,
              memoryImpact: `RAM LUT trỏ Bank ${slot.bankId} +0x${slot.offset.toString(16).toUpperCase()} (#${slot.seq})`,
              swsRef: 'SWS_Fee_00055 / SWS_Fee_00095 / SWS_Fee_00153'
            }
          );
        } else {
          const pct = Math.round((job.bytesWritten / job.totalBytes) * 100);
          addTrace(
            lowApi.modName,
            `${lowApi.write}(Chunk ${bps}B)`,
            `Đang ghi ${job.blockId}: ${job.bytesWritten}/${job.totalBytes}B (${pct}%) [Phase: ${job.phase}]`,
            'INFO'
          );
          pushStepLog(`Tick +${period}ms: Đã ghi ${job.bytesWritten}/${job.totalBytes}B của ${job.blockId}.`);
          setStepExplain(
            `⏳ Tick +${period}ms (${job.phase}): Đã nạp ${job.bytesWritten}/${job.totalBytes}B (${pct}%, tốc độ ${bps}B/tick) cho ${job.blockId}. Trailer ${getTrailerPatternLabel()} chưa được ghi nên slot vẫn ở trạng thái trung gian.`,
            {
              mode: 'MANUAL',
              apiFlow: `Fee_MainFunction() → ${lowApi.write}(${bps}B chunk) [${job.bytesWritten}/${job.totalBytes}B]`,
              bitImpact: 'Thanh A: B6 FEE_BUSY=1 | Thanh B: B7 HDR_WRITTEN=1, B5 VALID_TRAILR=0',
              memoryImpact: `Đang nạp vào Bank ${simState.activeBank} (${pct}%)`,
              swsRef: 'SWS_Fee_00097 / SWS_Fee_00023'
            }
          );
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
        setStepExplain(
          `🔍 RAM LUT đang TẮT: Fee phải dùng ${lowApi.read}() quét tuyến tính qua từng Header trên Bank ${simState.activeBank} (còn ${job.ticksRemaining} tick).`,
          {
            mode: 'MANUAL',
            apiFlow: `Fee_MainFunction() → ${lowApi.read}() Linear Scan`,
            bitImpact: 'Thanh A: B6 FEE_BUSY=1 | RAM LUT OFF',
            memoryImpact: 'Quét tuần tự O(N) trên Active Bank',
            swsRef: 'SWS_Fee_00087 / SWS_Fee_00097'
          }
        );
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

      if (lowApi.isR23) {
        addTrace(
          'MemAcc',
          `${lowApi.blankCheck}(${job.blockId})`,
          bankSlot
            ? `[SWS_Fee_00187] BlankCheck != MEMACC_BLANK (có Header) -> tiếp tục MemAcc_Read()`
            : `[SWS_Fee_00187] Vùng nhớ trống (Blank) -> MEMIF_BLOCK_INVALID [SWS_Fee_00022]`,
          'INFO'
        );
      }

      if (ecucConfig.SimulateFlashEccBitFlip) {
        finishUserJobModuleState(true);
        simState.jobResult = 'MEMIF_BLOCK_INCONSISTENT';
        simState.lastReadBuffer = 'ECC ERROR (Uncorrectable Double-Bit Flip)';
        if (bankSlot) {
          bankSlot.inconsistent = true;
          bankSlot.status = 'INCONSISTENT';
        }
        reportDem('FEE_E_READ_ECC_FAILED', 'FAILED');
        emitLowerCompletionAndUpperCallback(false, 'MEMIF_BLOCK_INCONSISTENT', `ECC Bit-Flip ${job.blockId}`);
        pushStepLog(`Lỗi ECC Bit-Flip khi đọc ${job.blockId} -> MEMIF_BLOCK_INCONSISTENT.`);
        setStepExplain(
          `💥 Lỗi Uncorrectable Double-Bit ECC khi đọc ${job.blockId}! DFlash phát hiện sai lệch dữ liệu không thể sửa, Fee trả về MEMIF_BLOCK_INCONSISTENT [SWS_Fee_00023 / SWS_Fee_00159] và báo NvM_JobErrorNotification() [SWS_Fee_00056].`,
          {
            mode: 'MANUAL',
            apiFlow: `${lowApi.read}() ECC Error → ${lowApi.modName} DEM + NvM_JobErrorNotification()`,
            bitImpact: 'Thanh A: B1 JOB_ERR_PEND=1 | Thanh B: B0 INCONSISTENT=1',
            memoryImpact: 'Slot bị đánh dấu INCONSISTENT do lỗi vật lý DFlash',
            swsRef: 'SWS_Fee_00023 / SWS_Fee_00159 / SWS_Fee_00056'
          }
        );
        syncBitRegistersFromState();
        return;
      }

      if (!bankSlot || bankSlot.status === 'INVALIDATED') {
        finishUserJobModuleState(true);
        simState.jobResult = 'MEMIF_BLOCK_INVALID';
        simState.lastReadBuffer = bankSlot ? 'INVALIDATED (MEMIF_BLOCK_INVALID)' : 'NEVER WRITTEN (MEMIF_BLOCK_INVALID)';
        emitLowerCompletionAndUpperCallback(false, 'MEMIF_BLOCK_INVALID', `${job.blockId} Invalid/Blank`);
        pushStepLog(`Fee_Read(${job.blockId}) -> MEMIF_BLOCK_INVALID (NvM sẽ nạp ROM Default).`);
        setStepExplain(
          `🟣 Kết quả Fee_Read(${job.blockId}): Trả về MEMIF_BLOCK_INVALID [SWS_Fee_00022 / SWS_Fee_00160]! ${bankSlot ? 'Block đã bị vô hiệu hóa chủ đích qua Fee_InvalidateBlock()' : 'Block chưa từng được ghi (BlankCheck trống [SWS_Fee_00187])'}. Fee báo NvM_JobErrorNotification() để NvM nạp ROM Default.`,
          {
            mode: 'MANUAL',
            apiFlow: `Fee_MainFunction() → NvM_JobErrorNotification() [MEMIF_BLOCK_INVALID]`,
            bitImpact: 'Thanh A: B6=0, B1 JOB_ERR_PEND=1 | Thanh B: B1 INVALIDATED=1',
            memoryImpact: 'Không trả payload từ Flash; NvM sẽ fallback sang ROM Default',
            swsRef: 'SWS_Fee_00022 / SWS_Fee_00160 / SWS_Fee_00187'
          }
        );
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
            finishUserJobModuleState(false);
            simState.jobResult = 'MEMIF_JOB_OK';
            emitLowerCompletionAndUpperCallback(true, 'MEMIF_JOB_OK', `Fallback Seq#${fallback.seq}`);
            pushStepLog(`Phục hồi thành công từ Seq#${fallback.seq} -> MEMIF_JOB_OK.`);
            setStepExplain(
              `🛡️ Auto Fallback thành công: Bản mới bị INCONSISTENT nhưng Fee lùi về Seq#${fallback.seq} toàn vẹn trước đó, nạp lại vào RAM LUT và trả MEMIF_JOB_OK!`,
              {
                mode: 'MANUAL',
                apiFlow: `Fallback Seq#${fallback.seq} → NvM_JobEndNotification() [MEMIF_JOB_OK]`,
                bitImpact: 'Thanh A: B0 JOB_OK_DONE=1 | RAM LUT khôi phục bản cũ',
                memoryImpact: `Phục hồi dữ liệu an toàn từ Seq#${fallback.seq}`,
                swsRef: 'SWS_Fee_00023 / SWS_Fee_00055 / Fallback Recovery'
              }
            );
            syncBitRegistersFromState();
            return;
          }
        }
        finishUserJobModuleState(true);
        simState.jobResult = 'MEMIF_BLOCK_INCONSISTENT';
        simState.lastReadBuffer = 'INCONSISTENT (NO VALID FALLBACK)';
        emitLowerCompletionAndUpperCallback(false, 'MEMIF_BLOCK_INCONSISTENT', `${job.blockId} Inconsistent`);
        setStepExplain(
          `🔴 Fee_Read(${job.blockId}) thất bại -> MEMIF_BLOCK_INCONSISTENT [SWS_Fee_00023 / SWS_Fee_00159]: Không có bản sao hợp lệ trước đó (hoặc FeeAutoFallbackPreviousInstance=FALSE). NvM sẽ nạp ROM Default.`,
          {
            mode: 'MANUAL',
            apiFlow: `Fee_MainFunction() → NvM_JobErrorNotification() [MEMIF_BLOCK_INCONSISTENT]`,
            bitImpact: 'Thanh A: B1 JOB_ERR_PEND=1 | Thanh B: B0 INCONSISTENT=1',
            memoryImpact: 'Không có bản VALID khả dụng trong Flash',
            swsRef: 'SWS_Fee_00023 / SWS_Fee_00159 / SWS_Fee_00056'
          }
        );
        syncBitRegistersFromState();
        return;
      }

      // Clean VALID Read!
      const elapsed = simState.clockMs - job.startClockMs;
      simState.stats.lastLatencyMs = elapsed;
      simState.lastReadBuffer = `${bankSlot.dataPreview} (${simState.lastReadSliceText})`;
      simState.activeArrows = ['arr_fls_fee', 'arr_fee_nvm', 'arr_nvm_memif', 'arr_rte_nvm', 'arr_swc_rte'];
      simState.activeModules = ['MOD_DFLASH', 'MOD_FLS', 'MOD_FEE', 'MOD_MEMIF', 'MOD_NVM', 'MOD_RTE', 'MOD_SWC'];
      finishUserJobModuleState(false);
      simState.jobResult = 'MEMIF_JOB_OK';

      emitLowerCompletionAndUpperCallback(true, 'MEMIF_JOB_OK', `Read ${job.blockId} via ${job.usedLut ? 'RAM LUT O(1)' : 'Flash Scan'}`);
      pushStepLog(`Fee_Read(${job.blockId}) -> MEMIF_JOB_OK (${simState.lastReadSliceText}).`);
      setStepExplain(
        `✅ Hoàn tất Fee_Read(${job.blockId}) (${simState.lastReadSliceText}) qua ${job.usedLut ? 'RAM LUT O(1)' : 'Flash Scan'} trong ${elapsed}ms: Dữ liệu hợp lệ, trả MEMIF_JOB_OK [SWS_Fee_00055].`,
        {
          mode: 'MANUAL',
          apiFlow: `${lowApi.isR23 ? `${lowApi.blankCheck}() → ` : ''}${lowApi.read}() → NvM_JobEndNotification()`,
          bitImpact: `Thanh A: B6=0, B0 JOB_OK_DONE=1 | Status: ${simState.moduleState}`,
          memoryImpact: `Đọc thành công ${simState.lastReadSliceText} từ Bank ${bankSlot.bankId} +0x${bankSlot.offset.toString(16).toUpperCase()}`,
          swsRef: 'SWS_Fee_00087 / SWS_Fee_00021 / SWS_Fee_00055'
        }
      );
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
      simState.activeArrows = ['arr_fee_nvm', 'arr_fls_fee'];
      finishUserJobModuleState(false);
      simState.jobResult = 'MEMIF_JOB_OK';
      emitLowerCompletionAndUpperCallback(true, 'MEMIF_JOB_OK', `Invalidate ${job.blockId}`);
      pushStepLog(`Fee_InvalidateBlock(${job.blockId}) xong -> MEMIF_JOB_OK.`);
      setStepExplain(
        `🟣 Hoàn tất Fee_InvalidateBlock(${job.blockId}) [SWS_Fee_00092]: Đã ghi Invalidation Marker lên DFlash (bản cũ chuyển SUPERSEDED), RAM LUT cập nhật INVALIDATED và báo MEMIF_JOB_OK [SWS_Fee_00037].`,
        {
          mode: 'MANUAL',
          apiFlow: `${lowApi.write}(INVALID_MARKER) → NvM_JobEndNotification() [MEMIF_JOB_OK]`,
          bitImpact: `Thanh A: B0 JOB_OK_DONE=1 | Thanh B: B1 INVALIDATED=1 | Status: ${simState.moduleState}`,
          memoryImpact: `RAM LUT[${job.blockId}] = INVALIDATED (không cần ${lowApi.erase})`,
          swsRef: 'SWS_Fee_00092 / SWS_Fee_00037 / SWS_Fee_00055'
        }
      );
      syncBitRegistersFromState();
      return;
    }

    if (job.type === 'ERASE_IMM') {
      job.ticksRemaining -= 1;
      job.bytesWritten = job.totalBytes;
      const bank = simState.banks[simState.activeBank];
      bank.slots.forEach((s) => {
        if (s.blockId === job.blockId && s.status === 'VALID') {
          s.status = 'SUPERSEDED';
          s.lutCached = false;
        }
      });
      rebuildRamLutFromFlash();
      simState.activeArrows = ['arr_fee_nvm', 'arr_fls_fee'];
      finishUserJobModuleState(false);
      if (!(simState.gcState && simState.gcState.active)) {
        simState.sectorSmState = 'IMMEDIATE_PREEMPT_ZONE';
      }
      simState.jobResult = 'MEMIF_JOB_OK';
      emitLowerCompletionAndUpperCallback(true, 'MEMIF_JOB_OK', `EraseImmediate ${job.blockId}`);
      pushStepLog(`Fee_EraseImmediateBlock(${job.blockId}) xong -> MEMIF_JOB_OK.`);
      setCodeSnippet(
        `Fee_EraseImmediateBlock(${job.blockId}) DONE [SWS_Fee_00094]`,
        `/* Fee_MainFunction() hoan tat xoa/chuan bi vung nho Immediate */\n/* Ban cu ${job.blockId} -> SUPERSEDED; JobResult = MEMIF_JOB_OK [SWS_Fee_00055] */\n/* San sang cho Fee_Write(${job.blockId}) tiep theo khong bi tre Erase! */`
      );
      setStepExplain(
        `✅ Hoàn tất Fee_EraseImmediateBlock(${job.blockId}) [SWS_Fee_00094 / SWS_Fee_00067]: Đã giải phóng/chuyển bản cũ sang SUPERSEDED trong Reserved Immediate Zone và trả MEMIF_JOB_OK [SWS_Fee_00055], sẵn sàng ghi Crash Data tức thời.`,
        {
          mode: 'MANUAL',
          apiFlow: `Fee_MainFunction() → NvM_JobEndNotification() [MEMIF_JOB_OK]`,
          bitImpact: `Thanh B: B4 IMM_BLOCK=1 | Sector SM: IMMEDIATE_PREEMPT_ZONE | Status: ${simState.moduleState}`,
          memoryImpact: `Bản cũ ${job.blockId} → SUPERSEDED; sẵn sàng ghi khẩn vào Reserved Zone`,
          swsRef: 'SWS_Fee_00094 / SWS_Fee_00066 / SWS_Fee_00067 / SWS_Fee_00055'
        }
      );
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

  addTrace('SchM', 'Fee_MainFunction()', '[SWS_Fee_00097] MEMIF_IDLE — Không có user job hoặc GC đang chờ', 'INFO');
  setStepExplain(
    'Fee_MainFunction() [SWS_Fee_00097] thực thi chu kỳ nhưng hệ thống đang MEMIF_IDLE (không có User Job hoặc công việc nội bộ chờ xử lý).',
    {
      mode: 'MANUAL',
      apiFlow: 'SchM_Schedule → Fee_MainFunction() [No-Op Idle]',
      bitImpact: 'Status giữ nguyên MEMIF_IDLE',
      memoryImpact: 'Không có thao tác đọc/ghi Flash',
      swsRef: 'SWS_Fee_00097'
    }
  );
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
          <IMPLEMENTATION-CONFIG-VARIANT>VARIANT-PRE-COMPILE</IMPLEMENTATION-CONFIG-VARIANT>
          <CONTAINERS>
            <ECUC-CONTAINER-VALUE>
              <SHORT-NAME>FeeGeneral</SHORT-NAME>
              <PARAMETER-VALUES>
                <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-BOOLEAN-PARAM-DEF">/AUTOSAR/EcucDefs/Fee/FeeGeneral/FeeDevErrorDetect</DEFINITION-REF><VALUE>${ecucConfig.FeeDevErrorDetect}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
                <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-BOOLEAN-PARAM-DEF">/AUTOSAR/EcucDefs/Fee/FeeGeneral/FeePollingMode</DEFINITION-REF><VALUE>${ecucConfig.FeePollingMode}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
                <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-BOOLEAN-PARAM-DEF">/AUTOSAR/EcucDefs/Fee/FeeGeneral/FeeVersionInfoApi</DEFINITION-REF><VALUE>${ecucConfig.FeeVersionInfoApi}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
                <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-BOOLEAN-PARAM-DEF">/AUTOSAR/EcucDefs/Fee/FeeGeneral/FeeSetModeSupported</DEFINITION-REF><VALUE>${ecucConfig.FeeSetModeSupported}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
                <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-INTEGER-PARAM-DEF">/AUTOSAR/EcucDefs/Fee/FeeGeneral/FeeMinimumReadPageSize</DEFINITION-REF><VALUE>${ecucConfig.FeeMinimumReadPageSize}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
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

#define FEE_NUM_FLASH_BANKS             (${simState ? simState.banks.length : 2}U)
#define FEE_BANK0_SIZE_BYTES            (${ecucConfig.FeeBank0SizeBytes}U)
#define FEE_BANK1_SIZE_BYTES            (${ecucConfig.FeeBank1SizeBytes}U)${simState && simState.banks.length > 2 ? simState.banks.slice(2).map((b) => `\n#define FEE_BANK${b.id}_SIZE_BYTES            (${getBankCapacity(b.id)}U)`).join('') : ''}
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
 * @brief AUTOSAR Classic Fee Block & Sector Configuration (ECUC_Fee_00154 VARIANT-PRE-COMPILE)
 */
#include "Fee.h"
#include "${isR23 ? 'MemAcc.h' : 'Fls.h'}"

const Fee_SectorConfigType Fee_SectorConfig[FEE_NUM_FLASH_BANKS] = {
${(simState ? simState.banks : [{ id: 0, baseAddr: 0x08000000 }, { id: 1, baseAddr: 0x08001000 }]).map((b) => `  { .PhysicalSectorId = ${b.id}U, .BaseAddress = 0x${b.baseAddr.toString(16).toUpperCase().padStart(8, '0')}UL, .Length = ${getBankCapacity(b.id)}U }`).join(',\n')}
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
