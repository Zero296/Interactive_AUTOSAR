// ============================================================================
// PART 5: UI CONTROLLERS, PANEL RENDERERS, SVG ARROWS, TOOLTIPS & EXPORTS
// ============================================================================

let uiState = {
  currentView: 'sim',
  currentScenarioIdx: 0,
  currentStepIdx: 0,
  stepSnapshots: [],
  autoPlayTimer: null,
  autoClockTimer: null,
  activeCfgTab: 0,
  activeInspTab: 0,
  activeExportTab: 0,
  prevModuleRegByte: 0x00,
  prevHeaderRegByte: 0x00,
  qaCancelMode: false
};

let _suppressUiRender = false;
const _coreStepMainFunctionTick = stepMainFunctionTick;
const _coreStepCompleteAsyncJob = stepCompleteAsyncJob;

stepMainFunctionTick = function () {
  _coreStepMainFunctionTick();
  if (!_suppressUiRender && typeof document !== 'undefined') {
    renderAll();
  }
};

stepCompleteAsyncJob = function () {
  _suppressUiRender = true;
  try {
    _coreStepCompleteAsyncJob();
  } finally {
    _suppressUiRender = false;
  }
  if (typeof document !== 'undefined') {
    renderAll();
  }
};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getEl(id) {
  return typeof document !== 'undefined' ? document.getElementById(id) : null;
}

// ============================================================================
// SCENARIO STEPPER & SNAPSHOT ENGINE
// ============================================================================
function cloneSimSnapshot() {
  return {
    ecucConfig: JSON.parse(JSON.stringify(ecucConfig)),
    runtimeBlockCatalog: JSON.parse(JSON.stringify(runtimeBlockCatalog)),
    simState: JSON.parse(JSON.stringify(simState))
  };
}

function restoreSimSnapshot(snap) {
  if (!snap) return;
  ecucConfig = JSON.parse(JSON.stringify(snap.ecucConfig));
  runtimeBlockCatalog = JSON.parse(JSON.stringify(snap.runtimeBlockCatalog));
  simState = JSON.parse(JSON.stringify(snap.simState));
  syncBitRegistersFromState();
}

function loadScenarioByIndex(scenIdx, targetStepIdx = 0) {
  stopAutoPlay();
  const sIdx = Math.max(0, Math.min(SCENARIOS.length - 1, scenIdx));
  const scen = SCENARIOS[sIdx];
  uiState.currentScenarioIdx = sIdx;
  uiState.currentStepIdx = 0;

  _suppressUiRender = true;
  try {
    scen.setup();
    uiState.stepSnapshots = [cloneSimSnapshot()];
    const clampedStep = Math.max(0, Math.min(scen.steps.length, targetStepIdx));
    for (let i = 0; i < clampedStep; i++) {
      scen.steps[i].action();
      uiState.stepSnapshots[i + 1] = cloneSimSnapshot();
    }
    restoreSimSnapshot(uiState.stepSnapshots[clampedStep]);
    uiState.currentStepIdx = clampedStep;
  } finally {
    _suppressUiRender = false;
  }

  if (typeof document !== 'undefined') {
    const sel = getEl('scenSelect');
    if (sel) sel.value = scen.id;
    renderAll();
  }
}

function goToScenarioStep(stepIdx) {
  const scen = SCENARIOS[uiState.currentScenarioIdx];
  if (!scen) return;
  const clamped = Math.max(0, Math.min(scen.steps.length, stepIdx));
  if (uiState.stepSnapshots[clamped]) {
    restoreSimSnapshot(uiState.stepSnapshots[clamped]);
    uiState.currentStepIdx = clamped;
  } else if (clamped > uiState.currentStepIdx) {
    _suppressUiRender = true;
    try {
      for (let i = uiState.currentStepIdx; i < clamped; i++) {
        scen.steps[i].action();
        uiState.stepSnapshots[i + 1] = cloneSimSnapshot();
      }
      uiState.currentStepIdx = clamped;
    } finally {
      _suppressUiRender = false;
    }
  } else {
    loadScenarioByIndex(uiState.currentScenarioIdx, clamped);
    return;
  }
  if (typeof document !== 'undefined') renderAll();
}

function onScenarioSelectChange() {
  const sel = getEl('scenSelect');
  if (!sel) return;
  const idx = SCENARIOS.findIndex((s) => s.id === sel.value);
  loadScenarioByIndex(idx >= 0 ? idx : 0, 0);
}

function resetCurrentScenario() {
  loadScenarioByIndex(uiState.currentScenarioIdx, 0);
}

function prevScenarioStep() {
  stopAutoPlay();
  if (uiState.currentStepIdx > 0) {
    goToScenarioStep(uiState.currentStepIdx - 1);
  }
}

function nextScenarioStep() {
  const scen = SCENARIOS[uiState.currentScenarioIdx];
  if (!scen) return;
  if (uiState.currentStepIdx < scen.steps.length) {
    // Discard stale forward cache so live ECUC tweaks apply to next step
    uiState.stepSnapshots.length = uiState.currentStepIdx + 1;
    goToScenarioStep(uiState.currentStepIdx + 1);
  } else {
    stopAutoPlay();
  }
}

function stopAutoPlay() {
  if (uiState.autoPlayTimer) {
    clearInterval(uiState.autoPlayTimer);
    uiState.autoPlayTimer = null;
  }
  const btn = getEl('btnAutoPlay');
  if (btn) btn.textContent = '▶ Tự Chạy';
}

function toggleScenarioAutoPlay() {
  const btn = getEl('btnAutoPlay');
  if (uiState.autoPlayTimer) {
    stopAutoPlay();
    return;
  }
  const scen = SCENARIOS[uiState.currentScenarioIdx];
  if (uiState.currentStepIdx >= scen.steps.length) {
    goToScenarioStep(0);
  }
  if (btn) btn.textContent = '⏸ Dừng Chạy';
  uiState.autoPlayTimer = setInterval(() => {
    if (uiState.currentStepIdx < scen.steps.length) {
      nextScenarioStep();
    } else {
      stopAutoPlay();
    }
  }, 1500);
}

function toggleAutoClock() {
  const btn = getEl('btnAutoClock');
  if (uiState.autoClockTimer) {
    clearInterval(uiState.autoClockTimer);
    uiState.autoClockTimer = null;
    if (btn) btn.textContent = '⏱ Auto';
    return;
  }
  if (btn) btn.textContent = '⏸ Stop Clock';
  uiState.autoClockTimer = setInterval(() => {
    stepMainFunctionTick();
  }, 850);
}

function runWhatIf(idx) {
  stopAutoPlay();
  const scen = SCENARIOS[uiState.currentScenarioIdx];
  if (!scen || !scen.whatIfs || !scen.whatIfs[idx]) return;
  _suppressUiRender = true;
  try {
    scen.whatIfs[idx].run();
  } finally {
    _suppressUiRender = false;
  }
  if (typeof document !== 'undefined') renderAll();
}

// ============================================================================
// QUICK ACTIONS BAR HANDLERS (CARD 1)
// ============================================================================
function getSelectedQaBlockId() {
  const qaSel = getEl('qaBlkSelect');
  return (qaSel && qaSel.value) || ecucConfig.SelectedFeeBlock || '0x0010';
}

function onQaBlockSelectChange() {
  const bid = getSelectedQaBlockId();
  ecucConfig.SelectedFeeBlock = bid;
  const meta = getBlockMeta(bid);
  ecucConfig.FeeBlockNumber = meta.id;
  ecucConfig.FeeBlockSize = meta.size;
  ecucConfig.FeeImmediateData = Boolean(meta.immediate);
  ecucConfig.FeeNumberOfWriteCycles = meta.writeCycles;
  ecucConfig.FeeDatasetSelectionBits = meta.datasetBits;
  onQaReadSliceChange();
  renderAll();
}

function onQaReadSliceChange() {
  const sliceSel = getEl('qaReadSlice');
  if (!sliceSel) return;
  const val = sliceSel.value;
  if (val === 'FULL') simState.lastReadSliceText = 'Full Block';
  else if (val === 'PARTIAL') simState.lastReadSliceText = 'Offset=4, Len=8B';
  else simState.lastReadSliceText = 'Full Block (Re-Init Nút 8)';
}

function qaFeeWrite() {
  const bid = getSelectedQaBlockId();
  const meta = getBlockMeta(bid);
  apiFeeWrite(bid, `0x5A 0xC3 [${meta.name} QA]`);
  renderAll();
}

function qaFeeRead() {
  const bid = getSelectedQaBlockId();
  const meta = getBlockMeta(bid);
  const sliceSel = getEl('qaReadSlice');
  const mode = sliceSel ? sliceSel.value : 'FULL';
  let opts = { offset: 0, length: meta.size };
  if (mode === 'PARTIAL') {
    const ofs = Math.min(4, Math.max(0, meta.size - 1));
    opts = { offset: ofs, length: Math.min(8, Math.max(1, meta.size - ofs)) };
  }
  apiFeeRead(bid, opts);
  renderAll();
}

function qaFeeInvalidate() {
  const bid = getSelectedQaBlockId();
  apiFeeInvalidate(bid);
  renderAll();
}

function qaEraseAndWriteImmediate() {
  const bid = '0x0030';
  ecucConfig.SelectedFeeBlock = bid;
  apiFeeEraseImmediateBlock(bid);
  apiFeeWrite(bid, '0xFF 0xE1 [Crash Preempt QA]', { immediate: true });
  renderAll();
}

function qaTriggerGarbageCollection() {
  if (!ecucConfig.FeeInitialized || simState.moduleState === 'MEMIF_UNINIT') {
    apiFeeInit('Auto-Init before GC');
  }
  if (!simState.gcState.active) {
    startGarbageCollectionInternal(null);
  } else {
    stepMainFunctionTick();
  }
  renderAll();
}

function qaInjectTornWrite() {
  const bid = getSelectedQaBlockId();
  injectTornWritePowerLoss(bid);
  renderAll();
}

function qaToggleSpeedMode() {
  const next = ecucConfig.ActiveMemIfMode === 'MEMIF_MODE_FAST' ? 'MEMIF_MODE_SLOW' : 'MEMIF_MODE_FAST';
  apiFeeSetMode(next);
  renderAll();
}

function qaCancelOrReset() {
  const sliceSel = getEl('qaReadSlice');
  const mode = sliceSel ? sliceSel.value : 'FULL';
  if (mode === 'REINIT' || simState.moduleState === 'MEMIF_UNINIT' || simState.powerLossOccurred) {
    apiFeeInit('Re-Init Recovery');
  } else if (simState.activeJob) {
    apiFeeCancel();
  } else {
    resetCurrentScenario();
  }
  renderAll();
}

// ============================================================================
// CONFIG TABS & INPUT SYNCHRONIZATION (36 ECUC PARAMETERS)
// ============================================================================
function switchCfgTab(idx) {
  uiState.activeCfgTab = idx;
  for (let i = 0; i < 6; i++) {
    const btn = getEl(`cfgTabBtn${i}`);
    const pane = getEl(`cfgPane${i}`);
    if (btn) btn.classList.toggle('active', i === idx);
    if (pane) pane.classList.toggle('hidden', i !== idx);
  }
}

function syncConfigToDOM() {
  if (typeof document === 'undefined') return;
  Object.keys(defaultConfig).forEach((key) => {
    const el = getEl(`cfg_${key}`);
    if (!el) return;
    const val = ecucConfig[key];
    if (el.type === 'checkbox') {
      el.checked = Boolean(val);
    } else {
      el.value = String(val);
    }
  });
  const qaBlk = getEl('qaBlkSelect');
  if (qaBlk && ecucConfig.SelectedFeeBlock) {
    qaBlk.value = ecucConfig.SelectedFeeBlock;
  }
  renderConfigWarnings();
}

function onConfigInputChanged(key) {
  const el = getEl(`cfg_${key}`);
  if (!el) return;
  let val;
  if (el.type === 'checkbox') {
    val = el.checked;
  } else if (el.type === 'number') {
    val = Number(el.value);
  } else {
    val = el.value;
  }
  ecucConfig[key] = val;

  // Linked domain reactions
  if (key === 'SelectedFeeBlock') {
    const meta = getBlockMeta(val);
    ecucConfig.FeeBlockNumber = meta.id;
    ecucConfig.FeeBlockSize = meta.size;
    ecucConfig.FeeImmediateData = Boolean(meta.immediate);
    ecucConfig.FeeNumberOfWriteCycles = meta.writeCycles;
    ecucConfig.FeeDatasetSelectionBits = meta.datasetBits;
  } else if (['FeeBlockSize', 'FeeImmediateData', 'FeeNumberOfWriteCycles', 'FeeDatasetSelectionBits'].includes(key)) {
    const cur = ecucConfig.SelectedFeeBlock || '0x0010';
    if (runtimeBlockCatalog[cur]) {
      if (key === 'FeeBlockSize') runtimeBlockCatalog[cur].size = Math.max(1, Number(val) || 1);
      if (key === 'FeeImmediateData') runtimeBlockCatalog[cur].immediate = Boolean(val);
      if (key === 'FeeNumberOfWriteCycles') runtimeBlockCatalog[cur].writeCycles = Math.max(100, Number(val) || 10000);
      if (key === 'FeeDatasetSelectionBits') runtimeBlockCatalog[cur].datasetBits = Math.max(0, Number(val) || 0);
    }
  } else if (key === 'FeeInitialized') {
    if (val) {
      apiFeeInit('Manual FeeInitialized=TRUE');
    } else {
      simState.moduleState = 'MEMIF_UNINIT';
      simState.moduleSmState = 'UNINIT';
    }
  } else if (key === 'ActiveMemIfMode') {
    if (simState.moduleState !== 'MEMIF_UNINIT') {
      apiFeeSetMode(val);
    }
  } else if (key === 'FeeEnableRamLutCache') {
    rebuildRamLutFromFlash();
  } else if (key === 'FlsSectorEraseDurationTicks' && simState.gcState) {
    simState.gcState.eraseTicksTotal = Math.max(1, Number(val) || 3);
  }

  syncBitRegistersFromState();
  renderAll();
}

function renderConfigWarnings() {
  const box = getEl('cfgValidationBox');
  if (!box) return;
  const warnings = [];

  if (Number(ecucConfig.FeeBlockHeaderSize) % Number(ecucConfig.FeeVirtualPageSize) !== 0) {
    warnings.push(`Header (${ecucConfig.FeeBlockHeaderSize}B) sẽ được căn tròn lên ${alignUp(ecucConfig.FeeBlockHeaderSize, ecucConfig.FeeVirtualPageSize)}B theo bội số VirtualPage=${ecucConfig.FeeVirtualPageSize}B.`);
  }
  const b0 = Number(ecucConfig.FeeBank0SizeBytes);
  const b1 = Number(ecucConfig.FeeBank1SizeBytes);
  if (b0 !== b1) {
    warnings.push(`Bank 0 (${b0}B) != Bank 1 (${b1}B): Khi Garbage Collection copy sang bank nhỏ hơn có thể thiếu chỗ!`);
  }
  const bn = String(ecucConfig.FeeBlockNumber || '').toUpperCase();
  if (bn === '0X0000' || bn === '0XFFFF') {
    warnings.push(`FeeBlockNumber=${bn} là mã dự phòng bị cấm theo SWS_Fee_00006 -> DET FEE_E_INVALID_BLOCK_NO!`);
  }
  if (Number(ecucConfig.FeeGcTriggerThresholdPct) > 85) {
    warnings.push(`Ngưỡng GC=${ecucConfig.FeeGcTriggerThresholdPct}% khá cao -> cẩn thận thu hẹp vùng Reserved Immediate Zone!`);
  }
  if (warnings.length === 0) {
    box.classList.add('hidden');
    box.innerHTML = '';
  } else {
    box.classList.remove('hidden');
    box.innerHTML = `<div class="cfg-warn-banner">⚠️ ${warnings.map(escapeHtml).join('<br>⚠️ ')}</div>`;
  }
}

// ============================================================================
// INTERACTIVE SLOTS & BITS
// ============================================================================
function selectFlashSlot(uid) {
  simState.selectedSlotUid = uid;
  syncBitRegistersFromState();
  renderAll();
}

function selectLutBlock(blockId) {
  ecucConfig.SelectedFeeBlock = blockId;
  const entry = simState.lut[blockId];
  if (entry) {
    const s = simState.banks[entry.bankId].slots.find((x) => x.offset === entry.offset && x.blockId === blockId);
    if (s) simState.selectedSlotUid = s.uid;
  }
  syncBitRegistersFromState();
  renderAll();
}

function toggleBitInteractive(regType, bitIdx) {
  if (regType === 'A') {
    if (bitIdx === 7) {
      ecucConfig.FeeInitialized = !ecucConfig.FeeInitialized;
      if (ecucConfig.FeeInitialized) apiFeeInit('Interactive Bit 7 Toggle');
      else {
        simState.moduleState = 'MEMIF_UNINIT';
        simState.moduleSmState = 'UNINIT';
      }
    } else if (bitIdx === 4) {
      qaToggleSpeedMode();
      return;
    } else if (bitIdx === 3) {
      if (!simState.gcState.active) qaTriggerGarbageCollection();
      return;
    } else {
      simState.moduleRegByte ^= 1 << bitIdx;
      renderAll();
      return;
    }
  } else {
    const slot = getInspectedSlot();
    if (slot) {
      if (bitIdx === 4) slot.immediate = !slot.immediate;
      else if (bitIdx === 2) slot.status = slot.status === 'SUPERSEDED' ? 'VALID' : 'SUPERSEDED';
      else if (bitIdx === 1) {
        slot.invalidated = !slot.invalidated;
        slot.status = slot.invalidated ? 'INVALIDATED' : 'VALID';
      } else if (bitIdx === 0) {
        slot.inconsistent = !slot.inconsistent;
        slot.status = slot.inconsistent ? 'INCONSISTENT' : 'VALID';
      }
      rebuildRamLutFromFlash();
    }
    syncBitRegistersFromState();
  }
  renderAll();
}

// ============================================================================
// MAIN RENDERERS (HEADER, LEFT SCENARIO, CENTER 3 PANELS, RIGHT INSPECTOR)
// ============================================================================
function renderHeaderAndLeft() {
  const scen = SCENARIOS[uiState.currentScenarioIdx];
  const stepCount = scen.steps.length;

  const stepInd = getEl('stepIndicator');
  if (stepInd) stepInd.textContent = `Bước ${uiState.currentStepIdx}/${stepCount}`;
  const btnPrev = getEl('btnPrevStep');
  const btnNext = getEl('btnNextStep');
  if (btnPrev) btnPrev.disabled = uiState.currentStepIdx <= 0;
  if (btnNext) btnNext.disabled = uiState.currentStepIdx >= stepCount;

  const clk = getEl('clockVal');
  if (clk) clk.textContent = `${simState.clockMs} ms`;

  // Header Badges
  const bStatus = getEl('hdrBadgeStatus');
  if (bStatus) {
    bStatus.textContent = simState.moduleState;
    bStatus.className = 'state-badge ' + (
      simState.moduleState === 'MEMIF_IDLE' ? 'sb-ok' :
      simState.moduleState === 'MEMIF_BUSY_INTERNAL' ? 'sb-warn' :
      simState.moduleState === 'MEMIF_BUSY' ? 'sb-cyan' : 'sb-err'
    );
  }
  const bJob = getEl('hdrBadgeJob');
  if (bJob) {
    bJob.textContent = simState.jobResult;
    bJob.className = 'state-badge ' + (
      simState.jobResult === 'MEMIF_JOB_OK' ? 'sb-ok' :
      simState.jobResult === 'MEMIF_JOB_PENDING' ? 'sb-cyan' :
      simState.jobResult === 'MEMIF_BLOCK_INVALID' || simState.jobResult === 'MEMIF_JOB_CANCELED' ? 'sb-warn' : 'sb-err'
    );
  }
  const bBank = getEl('hdrBadgeBank');
  if (bBank) {
    const b0s = getBankStats(0);
    const b1s = getBankStats(1);
    const actPct = simState.activeBank === 0 ? b0s.usedPct : b1s.usedPct;
    bBank.textContent = `Bank ${simState.activeBank} (${actPct}%)`;
    bBank.className = 'state-badge ' + (actPct >= Number(ecucConfig.FeeGcTriggerThresholdPct) ? 'sb-warn' : 'sb-cyan');
  }
  const bMode = getEl('hdrBadgeMode');
  if (bMode) {
    const isFast = ecucConfig.ActiveMemIfMode === 'MEMIF_MODE_FAST';
    const isR23 = ecucConfig.FeeLowerLayerArchitecture === 'R23_MEMACC';
    bMode.textContent = `${isFast ? 'FAST' : 'SLOW'} | ${isR23 ? 'MemAcc' : 'Fls'}`;
    bMode.className = 'state-badge ' + (isFast ? 'sb-pur' : 'sb-cyan');
  }

  // Quick Action Bar dynamic labels
  const qaMode = getEl('qaTxtMode');
  if (qaMode) qaMode.textContent = ecucConfig.ActiveMemIfMode === 'MEMIF_MODE_FAST' ? 'FAST 64B' : 'SLOW 8B';
  const qaCancel = getEl('qaTxtCancel');
  if (qaCancel) {
    const sliceSel = getEl('qaReadSlice');
    const sliceMode = sliceSel ? sliceSel.value : 'FULL';
    qaCancel.textContent = (sliceMode === 'REINIT' || simState.moduleState === 'MEMIF_UNINIT' || simState.powerLossOccurred)
      ? 'Fee_Init'
      : (simState.activeJob ? 'Cancel' : 'Reset');
  }

  // Card 2 Scenario Summary & What-If Buttons
  const sBadge = getEl('scenIdBadge');
  if (sBadge) {
    sBadge.textContent = uiState.currentStepIdx === 0
      ? `${scen.id} · Bước 0: Khởi tạo (Setup)`
      : `${scen.id} · ${scen.steps[uiState.currentStepIdx - 1]?.label || ''}`;
  }
  const sSum = getEl('scenSummaryBox');
  if (sSum) sSum.textContent = scen.summary;

  const wCont = getEl('whatIfContainer');
  if (wCont) {
    wCont.innerHTML = (scen.whatIfs || [])
      .map((w, idx) => `<button class="whatif-btn" onclick="runWhatIf(${idx})">💡 ${escapeHtml(w.label)}</button>`)
      .join('');
  }
}

function renderPanel1FlashLutAndBits() {
  const b0s = getBankStats(0);
  const b1s = getBankStats(1);
  const actStats = simState.activeBank === 0 ? b0s : b1s;
  const erasedHex = getErasedByteLabel();
  const sumBar = getEl('flashSummaryBar');
  if (sumBar) {
    sumBar.innerHTML = `
      <div>
        <b>Active Bank ${simState.activeBank}:</b>
        <span class="mono">${actStats.usedBytes}/${actStats.capacity}B</span> (${actStats.usedPct}%) |
        Valid: <span style="color:var(--ok)">${actStats.validBytes}B</span> |
        Garbage: <span style="color:var(--mut)">${actStats.garbageBytes}B</span> |
        Ngưỡng GC: <span class="mono">${ecucConfig.FeeGcTriggerThresholdPct}% (${actStats.standardLimitBytes}B)</span> |
        Erase B0/B1: <span class="mono">${simState.banks[0].eraseCount}/${simState.banks[1].eraseCount}</span>
      </div>
      <div class="flash-legend">
        <span class="leg-dot"><span class="leg-sw" style="background:var(--ok-bg);border-color:var(--ok)"></span>VALID</span>
        <span class="leg-dot"><span class="leg-sw" style="background:var(--old-bg);border-color:var(--old-bdr)"></span>SUPERSEDED</span>
        <span class="leg-dot"><span class="leg-sw" style="background:var(--pur-bg);border-color:var(--pur)"></span>INVALIDATED</span>
        <span class="leg-dot"><span class="leg-sw" style="background:var(--err-bg);border-color:var(--err)"></span>TORN/INCONSISTENT</span>
        <span class="leg-dot"><span class="leg-sw" style="background:var(--warn-bg);border-color:var(--warn)"></span>RESERVED IMM</span>
      </div>`;
  }

  const bankBox = getEl('bankMapBox');
  if (bankBox) {
    bankBox.innerHTML = simState.banks
      .map((bank) => {
        const st = getBankStats(bank.id);
        const isActive = bank.id === simState.activeBank;
        const isGcDst = simState.gcState.active && simState.gcState.dstBank === bank.id;
        const boxCls = isActive ? 'bank-active' : isGcDst ? 'bank-gc' : '';
        const rolePill = isActive
          ? '<span class="pill pill-ok">ACTIVE BANK</span>'
          : (bank.state === 'BANK_CORRUPT_DEM'
              ? '<span class="pill pill-err">CORRUPT (DEM)</span>'
              : (simState.gcState.active && simState.gcState.srcBank === bank.id
                  ? '<span class="pill pill-warn">GC SOURCE / ERASING</span>'
                  : (isGcDst ? '<span class="pill pill-cyan">GC COPY TARGET</span>' : '<span class="pill pill-mut">STANDBY ERASED</span>')));

        const slotHtml = bank.slots
          .map((slot) => {
            let cls = 'slot-valid';
            if (slot.status === 'SUPERSEDED') cls = 'slot-superseded';
            else if (slot.status === 'INVALIDATED') cls = 'slot-invalid';
            else if (slot.status === 'INCONSISTENT') cls = 'slot-torn';
            else if (slot.status === 'WRITING_HDR' || slot.status === 'WRITING_DATA') cls = 'slot-writing';
            const selCls = slot.uid === simState.selectedSlotUid ? 'selected-slot' : '';
            const immTag = slot.immediate ? ' ⚡IMM' : '';
            return `
              <div class="flash-slot ${cls} ${selCls}" onclick="selectFlashSlot('${escapeHtml(slot.uid)}')" title="Click để xem Anatomy & Bit Thanh B">
                <div class="slot-top">
                  <span>${escapeHtml(slot.blockId)} #${slot.seq}${immTag}</span>
                  <span>${slot.totalBytes}B</span>
                </div>
                <div class="slot-sub mono">0x${slot.offset.toString(16).toUpperCase().padStart(2, '0')} · ${slot.status}</div>
              </div>`;
          })
          .join('');

        const freeStd = Math.max(0, st.standardLimitBytes - st.usedBytes);
        const freeTotal = Math.max(0, st.capacity - st.usedBytes);
        const freeImmOnly = Math.max(0, freeTotal - freeStd);

        const freeStdHtml = freeStd > 0
          ? `<div class="flash-slot slot-free"><div class="slot-top"><span>Standard Free (${erasedHex})</span><span>${freeStd}B</span></div><div class="slot-sub">Tới ngưỡng GC ${ecucConfig.FeeGcTriggerThresholdPct}%</div></div>`
          : '';
        const immResHtml = freeImmOnly > 0
          ? `<div class="flash-slot slot-imm-res"><div class="slot-top"><span>Reserved Imm Zone</span><span>${freeImmOnly}B</span></div><div class="slot-sub">Chỉ cho Immediate Block</div></div>`
          : '';

        return `
          <div class="bank-box ${boxCls}">
            <div class="bank-hdr">
              <span>${bank.name} (<span class="mono">0x${bank.baseAddr.toString(16).toUpperCase()}</span>) · Used ${st.usedBytes}/${st.capacity}B · Erase=${bank.eraseCount}</span>
              ${rolePill}
            </div>
            <div class="bank-slots">
              ${slotHtml || `<div class="flash-slot slot-free"><div class="slot-top"><span>Erased Flash (${erasedHex})</span><span>${st.capacity}B</span></div><div class="slot-sub">Sạch 100%, sẵn sàng ghi hoặc nhận GC Copy</div></div>`}
              ${bank.slots.length > 0 ? freeStdHtml + immResHtml : ''}
            </div>
          </div>`;
      })
      .join('');
  }

  // RAM LUT Table
  const lutBadge = getEl('lutStatusBadge');
  const lutCount = Object.keys(simState.lut).length;
  if (lutBadge) {
    if (!ecucConfig.FeeEnableRamLutCache) {
      lutBadge.textContent = 'LUT: DISABLED O(N)';
      lutBadge.className = 'pill pill-warn';
    } else if (simState.moduleState === 'MEMIF_UNINIT') {
      lutBadge.textContent = 'LUT: UNINIT (EMPTY)';
      lutBadge.className = 'pill pill-err';
    } else {
      lutBadge.textContent = `LUT: VALID (${lutCount})`;
      lutBadge.className = 'pill pill-ok';
    }
  }
  const lutBox = getEl('ramLutBox');
  if (lutBox) {
    const entries = Object.values(simState.lut);
    if (!ecucConfig.FeeEnableRamLutCache) {
      lutBox.innerHTML = '<div style="font-size:11px;color:var(--warn)">RAM LUT Cache đang TẮT — Fee_Read() buộc phải quét tuần tự từ đầu tới cuối Active Bank!</div>';
    } else if (entries.length === 0) {
      lutBox.innerHTML = '<div style="font-size:11px;color:var(--mut)">Chưa có entry hợp lệ nào trong bảng tra nhanh RAM. Hãy chạy Fee_Init() hoặc ghi Block mới.</div>';
    } else {
      lutBox.innerHTML = `
        <table class="lut-tbl">
          <thead><tr><th>Block</th><th>Bank</th><th>Offset</th><th>Seq</th><th>Trạng thái</th></tr></thead>
          <tbody>
            ${entries
              .map((e) => {
                const isSel = ecucConfig.SelectedFeeBlock === e.blockId ? 'lut-sel' : '';
                const stPill = e.status === 'VALID' ? 'pill-ok' : 'pill-pur';
                return `<tr class="${isSel}" onclick="selectLutBlock('${escapeHtml(e.blockId)}')">
                  <td class="mono"><b>${escapeHtml(e.blockId)}</b></td>
                  <td>B${e.bankId}</td>
                  <td class="mono">+0x${e.offset.toString(16).toUpperCase().padStart(2, '0')}</td>
                  <td>#${e.seq}</td>
                  <td><span class="pill ${stPill}">${e.status}</span></td>
                </tr>`;
              })
              .join('')}
          </tbody>
        </table>`;
    }
  }

  // Virtual Page Frame Anatomy
  const vpBox = getEl('vpAnatomyBox');
  const vpSizeBadge = getEl('vpSizeBadge');
  const selSlot = getInspectedSlot();
  const selGeom = selSlot
    ? { vp: selSlot.vpSize, hdrSize: selSlot.hdrSize, rawSize: selSlot.rawSize, alignedPayload: selSlot.alignedPayload, paddingBytes: selSlot.paddingBytes, totalBytes: selSlot.totalBytes }
    : calcSlotGeometry(getBlockMeta(getSelectedQaBlockId()).size);

  if (vpSizeBadge) vpSizeBadge.textContent = `VP = ${selGeom.vp}B · Slot = ${selGeom.totalBytes}B`;
  if (vpBox) {
    const hdrLabel = selSlot ? `${selSlot.blockId} (Seq #${selSlot.seq})` : getSelectedQaBlockId();
    const trlCls = selSlot && selSlot.status === 'INCONSISTENT' ? 'vp-err' : (selSlot && selSlot.status === 'INVALIDATED' ? 'vp-inv' : 'vp-pad');
    const trlStateText = selSlot && selSlot.status === 'INCONSISTENT'
      ? `THIẾU TRAILER (TORN WRITE!)`
      : (selSlot && selSlot.status === 'INVALIDATED'
          ? `INVALIDATION MARKER`
          : `Valid Trailer ${getTrailerPatternLabel()} Committed`);

    vpBox.innerHTML = `
      <div style="font-size:10.5px;margin-bottom:4px;color:var(--txt-soft)">
        Đang soi: <b class="mono">${escapeHtml(hdrLabel)}</b> (${selSlot ? selSlot.status : 'Preview Geometry'})
      </div>
      <div class="vp-pages">
        <div class="vp-page-row vp-hdr">
          <b>[VP 0] Block Header (${selGeom.hdrSize}B)</b> — Id=${escapeHtml(hdrLabel)}, Len=${selGeom.rawSize}B, HdrCRC=${ecucConfig.FeeEnableHeaderCrc ? 'ON' : 'OFF'}
        </div>
        <div class="vp-page-row vp-data">
          <b>[VP 1..N] Payload Data (${selGeom.rawSize}B)</b> — Preview: <span class="mono">${selSlot ? escapeHtml(selSlot.dataPreview) : '0x...'}</span>
        </div>
        <div class="vp-page-row ${trlCls}">
          <b>[Cuối Slot] Padding (${selGeom.paddingBytes}B ${erasedHex}) + Trailer</b> — ${trlStateText}
        </div>
      </div>`;
  }

  // Dual 8-Bit Registers
  renderBitRegister('A', simState.moduleRegByte, uiState.prevModuleRegByte, FEE_MODULE_BITS, 'regAHex', 'regABits');
  renderBitRegister('B', simState.headerRegByte, uiState.prevHeaderRegByte, FEE_HEADER_BITS, 'regBHex', 'regBBits');
  uiState.prevModuleRegByte = simState.moduleRegByte;
  uiState.prevHeaderRegByte = simState.headerRegByte;
}

function renderBitRegister(regCode, byteVal, prevVal, bitDefs, hexId, containerId) {
  const hexEl = getEl(hexId);
  if (hexEl) {
    hexEl.textContent = `0x${byteVal.toString(16).toUpperCase().padStart(2, '0')} (${byteVal.toString(2).padStart(8, '0')})`;
  }
  const cont = getEl(containerId);
  if (!cont) return;
  cont.innerHTML = bitDefs
    .map((b) => {
      const isOn = (byteVal & (1 << b.bit)) !== 0;
      const changed = ((byteVal ^ prevVal) & (1 << b.bit)) !== 0;
      let onCls = '';
      if (isOn) {
        if ((regCode === 'A' && (b.bit === 1)) || (regCode === 'B' && b.bit === 0)) onCls = 'on-err';
        else if ((regCode === 'A' && (b.bit === 3 || b.bit === 2 || b.bit === 5)) || (regCode === 'B' && b.bit === 4)) onCls = 'on-warn';
        else if ((regCode === 'A' && b.bit === 4) || (regCode === 'B' && b.bit === 1)) onCls = 'on-pur';
        else if ((regCode === 'A' && b.bit === 6) || (regCode === 'B' && b.bit === 3)) onCls = 'on-cyan';
        else onCls = 'on';
      }
      const chCls = changed ? 'bit-changed' : '';
      return `
        <div class="bit-box ${onCls} ${chCls}" onclick="toggleBitInteractive('${regCode}', ${b.bit})" title="B${b.bit} ${b.name} (${b.hex}): ${escapeHtml(b.desc)}">
          <div class="bit-idx">B${b.bit}</div>
          <div class="bit-val">${isOn ? 1 : 0}</div>
          <div class="bit-tag">${b.name}</div>
        </div>`;
    })
    .join('');
}

function renderPanel2TimersAndStateMachines() {
  const actStats = getBankStats(simState.activeBank);
  const lowApi = getLowerApiNames();
  const bps = ecucConfig.ActiveMemIfMode === 'MEMIF_MODE_FAST' ? ecucConfig.FlsBytesPerCycleFast : ecucConfig.FlsBytesPerCycleSlow;

  const pipeBadge = getEl('feePipeBadge');
  if (pipeBadge) {
    pipeBadge.textContent = `${bps} B/tick · ${ecucConfig.FeePollingMode ? 'Polling' : 'IRQ Callback'}`;
    pipeBadge.className = 'pill ' + (ecucConfig.ActiveMemIfMode === 'MEMIF_MODE_FAST' ? 'pill-pur' : 'pill-cyan');
  }

  // 4 Progress Cards
  const job = simState.activeJob;
  const jobPct = job ? Math.min(100, Math.round((job.bytesWritten / Math.max(1, job.totalBytes)) * 100)) : 0;
  const gc = simState.gcState;
  const gcPct = gc.active
    ? (gc.phase === 'GC_COPY_VALID'
        ? Math.round((gc.copiedCount / Math.max(1, gc.itemsToCopy.length)) * 55)
        : gc.phase === 'GC_SWITCH_BANK'
          ? 65
          : Math.round(70 + (gc.eraseTicksDone / Math.max(1, gc.eraseTicksTotal)) * 30))
    : 0;
  const wearPct = Math.min(100, Math.round((Math.max(simState.banks[0].eraseCount, simState.banks[1].eraseCount) / Math.max(1, Number(ecucConfig.FeeMaxEraseCyclesPerSector))) * 100));

  const tGrid = getEl('timersGrid');
  if (tGrid) {
    tGrid.innerHTML = `
      <div class="timer-card">
        <div class="timer-top"><span>Bank ${simState.activeBank} Fill vs GC (${ecucConfig.FeeGcTriggerThresholdPct}%)</span><span>${actStats.usedPct}%</span></div>
        <div class="timer-bar"><div class="timer-fill ${actStats.usedPct >= Number(ecucConfig.FeeGcTriggerThresholdPct) ? 'warn' : 'ok'}" style="width:${actStats.usedPct}%"></div></div>
      </div>
      <div class="timer-card">
        <div class="timer-top"><span>Active Job (${job ? job.type : 'IDLE'})</span><span>${job ? `${job.bytesWritten}/${job.totalBytes}B` : '0%'}</span></div>
        <div class="timer-bar"><div class="timer-fill ${job ? '' : 'ok'}" style="width:${jobPct}%"></div></div>
      </div>
      <div class="timer-card">
        <div class="timer-top"><span>GC Pipeline (${gc.active ? gc.phase : 'STANDBY'})</span><span>${gcPct}%</span></div>
        <div class="timer-bar"><div class="timer-fill pur" style="width:${gcPct}%"></div></div>
      </div>
      <div class="timer-card">
        <div class="timer-top"><span>Độ Mòn Sector (Max ${ecucConfig.FeeMaxEraseCyclesPerSector})</span><span>${Math.max(simState.banks[0].eraseCount, simState.banks[1].eraseCount)} PEC</span></div>
        <div class="timer-bar"><div class="timer-fill ${wearPct > 70 ? 'err' : 'ok'}" style="width:${Math.max(2, wearPct)}%"></div></div>
      </div>`;
  }

  // Async 3-Phase Pipeline Bar
  const pipeBox = getEl('jobPipeBox');
  if (pipeBox) {
    let p1 = '', p2 = '', p3 = '', p4 = '';
    if (job && job.type === 'WRITE') {
      p1 = job.phase === 'WRITE_HEADER' ? 'pipe-active' : 'pipe-done';
      p2 = job.phase === 'WRITE_PAYLOAD' ? 'pipe-active' : (job.phase === 'WRITE_TRAILER' ? 'pipe-done' : '');
      p3 = job.phase === 'WRITE_TRAILER' ? 'pipe-done' : '';
      p4 = job.phase === 'WRITE_TRAILER' ? 'pipe-done' : '';
    } else if (simState.powerLossOccurred) {
      p1 = 'pipe-done'; p2 = 'pipe-err'; p3 = 'pipe-err';
    } else if (simState.jobResult === 'MEMIF_JOB_OK' && simState.moduleState === 'MEMIF_IDLE' && simState.stats.totalWrites > 0) {
      p1 = p2 = p3 = p4 = 'pipe-done';
    }
    pipeBox.innerHTML = `
      <div style="display:flex;justify-content:space-between;font-size:10.5px;font-weight:800">
        <span>3-Phase Async Write Pipeline (${lowApi.write} + Trailer ${getTrailerPatternLabel()})</span>
        <span style="color:var(--mut)">${job ? `${job.blockId} (${job.phase})` : (simState.powerLossOccurred ? 'TORN WRITE INTERRUPTED!' : 'Sẵn sàng / Idle')}</span>
      </div>
      <div class="pipe-steps">
        <div class="pipe-step ${p1}">Phase 1: Ghi Header</div>
        <div class="pipe-step ${p2}">Phase 2: Payload + Pad (${bps}B/tick)</div>
        <div class="pipe-step ${p3}">Phase 3: Trailer ${getTrailerPatternLabel()}</div>
        <div class="pipe-step ${p4}">LUT + JobEndCallback</div>
      </div>`;
  }

  // Dual State Machines
  const modLbl = getEl('smModuleLbl');
  if (modLbl) modLbl.textContent = simState.moduleState;
  const modSmEl = getEl('moduleSmDiagram');
  if (modSmEl) {
    const modNodes = [
      { id: 'UNINIT', title: 'MEMIF_UNINIT', sub: 'Chưa gọi Fee_Init() (B7=0)', cls: 'active-err' },
      { id: 'IDLE', title: 'MEMIF_IDLE', sub: 'RAM LUT sẵn sàng, chờ Read/Write', cls: 'active-ok' },
      { id: 'BUSY_USER_JOB', title: 'MEMIF_BUSY (User Job)', sub: 'Đang chạy Write / Read / Invalidate', cls: 'active-pri' },
      { id: 'BUSY_INTERNAL_GC', title: 'MEMIF_BUSY_INTERNAL', sub: 'Garbage Collection nền / Sector Switch', cls: 'active-warn' },
      { id: 'JOB_ERROR', title: 'ERROR / RECOVERY', sub: 'INCONSISTENT / INVALID / JOB_FAILED', cls: 'active-pur' }
    ];
    modSmEl.innerHTML = modNodes
      .map((n) => {
        const active = simState.moduleSmState === n.id;
        return `<div class="sm-node ${active ? n.cls : ''}">
          <div class="sm-node-hdr"><span>${n.title}</span><span>${active ? '● ACTIVE' : ''}</span></div>
          <div class="sm-node-sub">${n.sub}</div>
        </div>`;
      })
      .join('');
  }

  const secLbl = getEl('smSectorLbl');
  if (secLbl) secLbl.textContent = simState.sectorSmState;
  const secSmEl = getEl('sectorSmDiagram');
  if (secSmEl) {
    const secNodes = [
      { id: 'ACTIVE_NORMAL', title: 'BANK ACTIVE (Append-Only)', sub: 'Ghi nối tiếp tới Standard Limit', cls: 'active-ok' },
      { id: 'GC_COPYING_TO_STANDBY', title: 'GC COPY VALID -> STANDBY', sub: 'Chỉ chép bản mới nhất, bỏ rác cũ', cls: 'active-warn' },
      { id: 'GC_ERASING_OLD_BANK', title: `SECTOR SWITCH & ${lowApi.erase.toUpperCase()}`, sub: 'Đảo Active Bank & xóa sạch Old Bank', cls: 'active-pri' },
      { id: 'IMMEDIATE_PREEMPT_ZONE', title: 'IMMEDIATE PREEMPTION ZONE', sub: 'Tạm hoãn GC ghi khẩn Crash Data', cls: 'active-pur' },
      { id: 'SECTOR_CORRUPT_DEM', title: 'SECTOR CORRUPT (DEM DTC)', sub: 'Lỗi phần cứng Erase / ECC Flash', cls: 'active-err' }
    ];
    secSmEl.innerHTML = secNodes
      .map((n) => {
        const active = simState.sectorSmState === n.id;
        return `<div class="sm-node ${active ? n.cls : ''}">
          <div class="sm-node-hdr"><span>${n.title}</span><span>${active ? '● ACTIVE' : ''}</span></div>
          <div class="sm-node-sub">${n.sub}</div>
        </div>`;
      })
      .join('');
  }
}

function renderPanel3ArchitectureSvg() {
  const lowApi = getLowerApiNames();
  const isR23 = lowApi.isR23;

  // Update dynamic Lower-Layer text (Fls vs MemAcc R23-11)
  const titleFls = getEl('svgTitle_MOD_FLS');
  const subFls = getEl('svgSub_MOD_FLS');
  const apiFls = getEl('svgApi_MOD_FLS');
  if (titleFls) titleFls.textContent = isR23 ? 'MemAcc (AUTOSAR R23-11)' : 'Fls Driver (MCAL Classic)';
  if (subFls) subFls.textContent = lowApi.subLabel;
  if (apiFls) apiFls.textContent = isR23 ? 'MemAcc_MainFunction()' : 'Fls_MainFunction()';

  const feeSub1 = getEl('svgSub_MOD_FEE1');
  const feeSub2 = getEl('svgSub_MOD_FEE2');
  const feeSub3 = getEl('svgSub_MOD_FEE3');
  if (feeSub1) feeSub1.textContent = `Bank ${simState.activeBank} Active | VP=${ecucConfig.FeeVirtualPageSize}B | LUT=${Object.keys(simState.lut).length}`;
  if (feeSub2) feeSub2.textContent = `Status: ${simState.moduleState} | ${ecucConfig.ActiveMemIfMode === 'MEMIF_MODE_FAST' ? 'FAST' : 'SLOW'}`;
  if (feeSub3) feeSub3.textContent = `Trailer=${getTrailerPatternLabel()} | GC=${ecucConfig.FeeGcTriggerThresholdPct}%`;

  const dflashSub = getEl('svgSub_MOD_DFLASH');
  if (dflashSub) dflashSub.textContent = `B0 (${getBankStats(0).usedBytes}B) & B1 (${getBankStats(1).usedBytes}B)`;

  // Highlight arrows & modules
  const allArrows = ['arr_swc_rte', 'arr_rte_nvm', 'arr_nvm_memif', 'arr_memif_fee', 'arr_fee_nvm', 'arr_ecum_fee', 'arr_fee_dem', 'arr_fee_det', 'arr_fee_fls', 'arr_fls_fee', 'arr_fls_dflash'];
  allArrows.forEach((aid) => {
    const el = getEl(aid);
    if (el) el.classList.toggle('active', simState.activeArrows.includes(aid));
  });

  Object.keys(MODULES_INFO).forEach((mid) => {
    const node = getEl(`node_${mid}`);
    if (node) {
      node.classList.toggle('selected', simState.selectedModule === mid);
      node.classList.toggle('active-mod', simState.activeModules.includes(mid));
    }
  });
}

// ============================================================================
// RIGHT INSPECTOR (4 TABS)
// ============================================================================
function selectModule(modId) {
  simState.selectedModule = modId;
  uiState.activeInspTab = 1;
  renderAll();
}

function switchInspTab(idx) {
  uiState.activeInspTab = idx;
  for (let i = 0; i < 4; i++) {
    const btn = getEl(`inspTabBtn${i}`);
    if (btn) btn.classList.toggle('active', i === idx);
  }
  renderInspector();
}

function renderInspector() {
  for (let i = 0; i < 4; i++) {
    const btn = getEl(`inspTabBtn${i}`);
    if (btn) btn.classList.toggle('active', i === uiState.activeInspTab);
  }
  const body = getEl('inspBody');
  if (!body) return;

  const scen = SCENARIOS[uiState.currentScenarioIdx];
  const stepObj = uiState.currentStepIdx > 0 ? scen.steps[uiState.currentStepIdx - 1] : null;
  const selSlot = getInspectedSlot();

  if (uiState.activeInspTab === 0) {
    // Tab 0: Bước Hiện Tại
    const recentLogs = simState.stepLog.slice(-6).reverse();
    const stepHeadline = uiState.currentStepIdx === 0
      ? `0. Trạng thái khởi tạo (Setup — Chưa chạy Bước 1: ${scen.steps[0]?.label || ''})`
      : (stepObj ? stepObj.label : 'Interactive');
    body.innerHTML = `
      <div class="insp-card">
        <div class="insp-h">📍 Kịch bản & Bước đang xem</div>
        <div style="font-size:12px;font-weight:700;margin-bottom:4px">${escapeHtml(scen.title)}</div>
        <div style="font-size:11.5px;color:var(--cyan);font-weight:700;margin-bottom:6px">${escapeHtml(stepHeadline)}</div>
        <div style="font-size:11px;color:var(--txt-soft)">${escapeHtml(scen.summary)}</div>
      </div>
      <div class="insp-card">
        <div class="insp-h">🔍 Trạng thái Job & Slot đang soi</div>
        <div style="font-size:11px;line-height:1.55">
          • <b>Module Status:</b> <span class="mono">${simState.moduleState}</span> | <b>JobResult:</b> <span class="mono">${simState.jobResult}</span><br>
          • <b>Read Output:</b> <span class="mono">${escapeHtml(simState.lastReadBuffer)}</span><br>
          • <b>Soi Slot:</b> ${selSlot ? `<span class="mono">${selSlot.blockId} #${selSlot.seq} @ Bank${selSlot.bankId}+0x${selSlot.offset.toString(16).toUpperCase()} (${selSlot.status}, ${selSlot.totalBytes}B)</span>` : 'Chưa chọn slot'}
        </div>
      </div>
      <div class="insp-card">
        <div class="insp-h">📝 Nhật ký Sự kiện gần nhất</div>
        ${recentLogs.map((l) => `<div style="font-size:11px;padding:3px 0;border-bottom:1px solid var(--bdr-soft)">${escapeHtml(l)}</div>`).join('') || '<div style="font-size:11px;color:var(--mut)">Chưa có log.</div>'}
      </div>`;
  } else if (uiState.activeInspTab === 1) {
    // Tab 1: Module I/O
    const m = MODULES_INFO[simState.selectedModule] || MODULES_INFO.MOD_FEE;
    const modPills = Object.values(MODULES_INFO)
      .map((x) => `<span class="mod-pill ${x.id === m.id ? 'active' : ''}" onclick="selectModule('${x.id}')">${x.id.replace('MOD_', '')}</span>`)
      .join('');
    body.innerHTML = `
      <div class="mod-list">${modPills}</div>
      <div class="insp-card">
        <div class="insp-h">📦 ${escapeHtml(m.name)}</div>
        <div style="font-size:10.5px;color:var(--cyan);margin-bottom:6px">${escapeHtml(m.layer)} · <span class="mono">${escapeHtml(m.file)}</span></div>
        <div style="font-size:11.5px;line-height:1.55;margin-bottom:6px">${escapeHtml(m.desc)}</div>
        <div style="font-size:11px;margin-bottom:4px"><b>📥 Input:</b> ${escapeHtml(m.inputs)}</div>
        <div style="font-size:11px;margin-bottom:6px"><b>📤 Output Route:</b> ${escapeHtml(m.outputs)}</div>
        <div style="font-size:11px"><b>🔌 AUTOSAR APIs:</b><br><span class="mono">${m.apis.map(escapeHtml).join('<br>')}</span></div>
      </div>`;
  } else if (uiState.activeInspTab === 2) {
    // Tab 2: Code C
    const snip = (simState.codeSnippets && simState.codeSnippets[0]) || { title: 'Fee_MainFunction()', code: 'Fee_MainFunction();' };
    body.innerHTML = `
      <div class="insp-card">
        <div class="insp-h">💻 ${escapeHtml(snip.title)}</div>
        <pre class="code-block">${escapeHtml(snip.code)}</pre>
      </div>
      <div class="insp-card">
        <div class="insp-h">⚙️ Geometry Calculator Snapshot</div>
        <pre class="code-block">VirtualPageSize = ${ecucConfig.FeeVirtualPageSize}U
HeaderSizeRaw   = ${ecucConfig.FeeBlockHeaderSize}U (Aligned ${alignUp(ecucConfig.FeeBlockHeaderSize, ecucConfig.FeeVirtualPageSize)}U)
ErasedPattern   = ${getErasedByteLabel()}
ValidTrailer    = ${getTrailerPatternLabel()}
LowerLayer      = ${ecucConfig.FeeLowerLayerArchitecture}</pre>
      </div>`;
  } else {
    // Tab 3: API Trace (DET/DEM)
    body.innerHTML = (simState.trace || [])
      .map((t) => {
        const cls = t.tag === 'ERR' ? 'err' : (t.tag === 'WARN' ? 'warn' : (t.tag === 'OK' ? 'ok' : ''));
        return `<div class="trace-item ${cls}">
          <div style="display:flex;justify-content:space-between;font-weight:800">
            <span class="mono">[${t.timeMs}ms] ${escapeHtml(t.module)}</span>
            <span class="mono">${escapeHtml(t.tag)}</span>
          </div>
          <div class="mono" style="color:var(--pri);font-weight:700">${escapeHtml(t.api)}</div>
          <div style="color:var(--txt-soft)">${escapeHtml(t.detail)}</div>
        </div>`;
      })
      .join('') || '<div class="insp-card">Chưa có trace API.</div>';
  }
}

function renderAll() {
  if (typeof document === 'undefined' || !simState) return;
  syncConfigToDOM();
  renderHeaderAndLeft();
  renderPanel1FlashLutAndBits();
  renderPanel2TimersAndStateMachines();
  renderPanel3ArchitectureSvg();
  renderInspector();
}

// ============================================================================
// VIEW SWITCHING, THEME TOGGLE & EXPORT MODAL
// ============================================================================
function switchMainView(v) {
  uiState.currentView = v;
  const simEl = getEl('viewSim');
  const hbEl = getEl('viewHb');
  const bSim = getEl('btnViewSim');
  const bHb = getEl('btnViewHb');
  if (simEl) simEl.classList.toggle('hidden', v !== 'sim');
  if (hbEl) hbEl.classList.toggle('hidden', v !== 'hb');
  if (bSim) bSim.classList.toggle('active', v === 'sim');
  if (bHb) bHb.classList.toggle('active', v === 'hb');
  if (v === 'hb' && typeof renderCurrentHandbookView === 'function') {
    renderCurrentHandbookView();
  }
}

function toggleTheme() {
  const html = document.documentElement;
  const next = html.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
  html.setAttribute('data-theme', next);
  const btn = getEl('btnTheme');
  if (btn) btn.textContent = next === 'light' ? '🌙 Tối' : '☀️ Sáng';
}

function getExportContentByTab(idx) {
  if (idx === 0) return generateArxmlContent();
  if (idx === 1) return generateFeeCfgH();
  if (idx === 2) return generateFeeLcfgC();
  return JSON.stringify(ecucConfig, null, 2);
}

function openExportModal() {
  const modal = getEl('exportModal');
  if (modal) modal.classList.remove('hidden');
  switchExportTab(uiState.activeExportTab);
}

function closeExportModal() {
  const modal = getEl('exportModal');
  if (modal) modal.classList.add('hidden');
}

function onExportModalBackdrop(evt) {
  if (evt.target && evt.target.id === 'exportModal') {
    closeExportModal();
  }
}

function switchExportTab(idx) {
  uiState.activeExportTab = idx;
  for (let i = 0; i < 4; i++) {
    const t = getEl(`expTab${i}`);
    if (t) t.classList.toggle('active', i === idx);
  }
  const area = getEl('exportCodeArea');
  if (area) area.textContent = getExportContentByTab(idx);
}

function copyExportCode() {
  const txt = getExportContentByTab(uiState.activeExportTab);
  if (navigator && navigator.clipboard) {
    navigator.clipboard.writeText(txt).catch(() => {});
  }
}

function downloadExportCode() {
  const names = ['Fee_EcucValues.arxml', 'Fee_Cfg.h', 'Fee_Lcfg.c', 'Fee_SimConfig.json'];
  const content = getExportContentByTab(uiState.activeExportTab);
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = names[uiState.activeExportTab] || 'Fee_Export.txt';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}

function downloadStandaloneHTML() {
  const docHtml = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
  const blob = new Blob([docHtml], { type: 'text/html;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'AUTOSAR_Fee_Simulator.html';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}

// ============================================================================
// FLOATING HOVER TOOLTIP (> 1 SECOND DWELL ON ECUC PARAMETERS)
// ============================================================================
let _tooltipTimer = null;

function positionTooltipPopup(popup, clientX, clientY) {
  const vw = window.innerWidth || 1280;
  const vh = window.innerHeight || 720;
  const pw = 410;
  const ph = popup.offsetHeight || 190;
  let left = clientX + 16;
  let top = clientY + 14;
  if (left + pw > vw - 12) left = Math.max(12, clientX - pw - 16);
  if (top + ph > vh - 12) top = Math.max(12, vh - ph - 12);
  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
}

function setupConfigTooltips() {
  if (typeof document === 'undefined') return;
  const popup = getEl('cfgTooltipPopup');
  if (!popup) return;

  const hidePopup = () => {
    if (_tooltipTimer) {
      clearTimeout(_tooltipTimer);
      _tooltipTimer = null;
    }
    popup.classList.remove('show');
    popup.classList.add('hidden');
  };

  document.querySelectorAll('[data-cfg-key]').forEach((row) => {
    const key = row.getAttribute('data-cfg-key');
    const info = configTooltipData[key];
    if (!info) return;

    row.addEventListener('mouseenter', (evt) => {
      if (_tooltipTimer) clearTimeout(_tooltipTimer);
      const mx = evt.clientX;
      const my = evt.clientY;
      _tooltipTimer = setTimeout(() => {
        popup.innerHTML = `
          <div class="tt-hdr">
            <span class="tt-title">${escapeHtml(info.title)}</span>
            <span class="tt-meta">${escapeHtml(info.type)}</span>
          </div>
          <div class="tt-sec"><b>Ý nghĩa:</b> ${escapeHtml(info.desc)}</div>
          <div class="tt-sec"><b>Dải giá trị:</b> <span class="mono">${escapeHtml(info.range)}</span></div>
          <div class="tt-sec"><b>Tác động mô phỏng:</b> ${escapeHtml(info.impact)}</div>
          <div class="tt-sec" style="color:var(--cyan)"><b>AUTOSAR Ref:</b> <span class="mono">${escapeHtml(info.ref)}</span></div>`;
        popup.classList.remove('hidden');
        positionTooltipPopup(popup, mx, my);
        popup.classList.add('show');
      }, 1000); // > 1s hover threshold per spec
    });

    row.addEventListener('mousemove', (evt) => {
      if (popup.classList.contains('show')) {
        positionTooltipPopup(popup, evt.clientX, evt.clientY);
      }
    });

    row.addEventListener('mouseleave', hidePopup);
  });
}
