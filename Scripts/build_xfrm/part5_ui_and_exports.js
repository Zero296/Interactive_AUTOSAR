// ==================== XFRM UI RENDERERS, TOOLTIP (>1s), EXPORTS & QUICK ACTIONS ====================

let activeConfig = Object.assign({}, defaultConfig);
let simState = createInitialSimState(activeConfig);

const uiState = {
  mainView: 'sim',
  theme: 'dark',
  activeScenarioId: 'S1',
  currentStepNum: 0,
  stepSnapshots: [],
  autoPlayTimer: null,
  activeCfgTab: 0,
  activeInspTab: 'current',
  selectedModule: 'RTE',
  activeExportTab: 'arxml',
  hbMainTab: 0,
  hbSubTab: 0,
  abbrSearch: '',
  abbrCat: 'ALL'
};

// -------------------- Clone & Snapshot Helpers --------------------
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function getActiveScenario() {
  return SCENARIOS.find(s => s.id === uiState.activeScenarioId) || SCENARIOS[0];
}

function stopAutoPlay() {
  if (uiState.autoPlayTimer) {
    clearInterval(uiState.autoPlayTimer);
    uiState.autoPlayTimer = null;
  }
  const btn = document.getElementById('btnAutoPlay');
  if (btn) btn.textContent = '▶ Auto';
}

function loadScenario(id) {
  stopAutoPlay();
  uiState.activeScenarioId = id;
  uiState.currentStepNum = 0;
  uiState.stepSnapshots = [];

  const scn = getActiveScenario();
  activeConfig = deepClone(defaultConfig);
  scn.setup(activeConfig);

  const prevHistory = activeConfig.E2ESmWindowClearOnReset ? null : simState;
  simState = createInitialSimState(activeConfig);
  if (prevHistory && !activeConfig.E2ESmWindowClearOnReset) {
    simState.e2eSmState = prevHistory.e2eSmState;
    simState.e2eSmStateNibble = prevHistory.e2eSmStateNibble;
    simState.e2eWindowHistory = prevHistory.e2eWindowHistory.slice();
    simState.e2eOkCount = prevHistory.e2eOkCount;
    simState.e2eErrCount = prevHistory.e2eErrCount;
    syncRegistersFromState(simState, activeConfig);
  }

  const someIp = isSomeIpPreset(activeConfig);
  const e2eProf = getEffectiveE2eProfile(activeConfig);
  simState.stepExplanation = {
    title: `Bước 0 (Init State) — ${scn.title}`,
    summary: `${scn.summary} Đang ở trạng thái khởi tạo (Init State). Bấm "Tiếp ▶" hoặc "▶ Auto" để chạy Bước 1/${scn.steps.length}.`,
    inputSrc: `Cấu hình ECUC ${scn.id} đã nạp: ${someIp ? 'SomeIpXf (#174)' : 'ComXf (#175)'}${e2eProf !== 'NONE' ? ' + E2EXf ' + e2eProf : ''}`,
    processDesc: `Các module ở trạng thái khởi tạo (${activeConfig.XfrmInitializedState ? 'XFRM_INIT = 1' : 'XFRM_INIT = 0'}). Chưa thực thi biến đổi Tx/Rx.`,
    outputDst: `Sẵn sàng Bước 1/${scn.steps.length}: ${scn.steps[0] ? scn.steps[0].title : ''}`,
    bitDiff: `Reg A = 0x${toHex2(simState.regAReturnErrByte)} | Reg B = 0x${toHex2(simState.regBChainPipeByte)}`,
    alert: ''
  };

  // Sync dropdown selector
  const sel = document.getElementById('scnSelect');
  if (sel && sel.value !== id) sel.value = id;

  // Save Step 0 Init State snapshot
  uiState.stepSnapshots[0] = {
    config: deepClone(activeConfig),
    sim: deepClone(simState)
  };

  syncInputsFromConfig();
  renderAll();
}

function executeStepNum(stepNum) {
  const scn = getActiveScenario();
  const idx = stepNum - 1;
  if (!scn || !scn.steps || !scn.steps[idx]) return;
  scn.steps[idx].exec(simState, activeConfig);
  uiState.currentStepNum = stepNum;
  uiState.stepSnapshots[stepNum] = {
    config: deepClone(activeConfig),
    sim: deepClone(simState)
  };
  syncInputsFromConfig();
}

function nextStep() {
  const scn = getActiveScenario();
  if (uiState.currentStepNum < scn.steps.length) {
    executeStepNum(uiState.currentStepNum + 1);
    renderAll();
  } else {
    stopAutoPlay();
  }
}

function prevStep() {
  stopAutoPlay();
  if (uiState.currentStepNum > 0) {
    const targetNum = uiState.currentStepNum - 1;
    const snap = uiState.stepSnapshots[targetNum];
    if (snap) {
      activeConfig = deepClone(snap.config);
      simState = deepClone(snap.sim);
    }
    uiState.currentStepNum = targetNum;
    syncInputsFromConfig();
    renderAll();
  }
}

function resetCurrentScenario() {
  loadScenario(uiState.activeScenarioId);
}

function toggleAutoPlay() {
  if (uiState.autoPlayTimer) {
    stopAutoPlay();
    return;
  }
  const btn = document.getElementById('btnAutoPlay');
  if (btn) btn.textContent = '⏸ Dừng';
  uiState.autoPlayTimer = setInterval(() => {
    const scn = getActiveScenario();
    if (uiState.currentStepNum < scn.steps.length) {
      nextStep();
    } else {
      stopAutoPlay();
    }
  }, 1500);
}

function runWhatIf(idx) {
  stopAutoPlay();
  const scn = getActiveScenario();
  if (scn && scn.whatIfs && scn.whatIfs[idx]) {
    scn.whatIfs[idx].run(simState, activeConfig);
    syncInputsFromConfig();
    renderAll();
  }
}

// -------------------- View, Theme & Tabs --------------------
function switchMainView(viewName) {
  uiState.mainView = viewName;
  document.documentElement.setAttribute('data-view', viewName);
  const vSim = document.getElementById('viewSim');
  const vHb = document.getElementById('viewHb');
  const bSim = document.getElementById('btnViewSim');
  const bHb = document.getElementById('btnViewHb');
  if (vSim) vSim.classList.toggle('active', viewName === 'sim');
  if (vHb) vHb.classList.toggle('active', viewName === 'hb');
  if (bSim) bSim.classList.toggle('active', viewName === 'sim');
  if (bHb) bHb.classList.toggle('active', viewName === 'hb');
  if (viewName === 'hb' && typeof renderCurrentHandbookView === 'function') {
    renderCurrentHandbookView();
  }
}

function toggleTheme() {
  uiState.theme = uiState.theme === 'dark' ? 'light' : 'dark';
  if (uiState.theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  const btn = document.getElementById('btnThemeToggle');
  if (btn) btn.textContent = uiState.theme === 'dark' ? '☀️ Sáng' : '🌙 Tối';
}

function switchCfgTab(idx) {
  uiState.activeCfgTab = idx;
  for (let i = 0; i < 6; i++) {
    const btn = document.getElementById('cfgTabBtn_' + i);
    const pane = document.getElementById('cfgPane_' + i);
    if (btn) btn.classList.toggle('active', i === idx);
    if (pane) pane.classList.toggle('active', i === idx);
  }
}

function switchInspTab(tabKey) {
  uiState.activeInspTab = tabKey;
  ['current', 'module', 'code', 'trace'].forEach(k => {
    const btn = document.getElementById('inspTabBtn_' + k);
    const pane = document.getElementById('inspPane_' + k);
    if (btn) btn.classList.toggle('active', k === tabKey);
    if (pane) pane.classList.toggle('active', k === tabKey);
  });
}

function selectModule(modKey) {
  uiState.selectedModule = modKey;
  document.querySelectorAll('.mod-box').forEach(el => el.classList.remove('selected'));
  const target = document.getElementById('svgMod_' + modKey);
  if (target) target.classList.add('selected');
  switchInspTab('module');
  renderInspectorModule();
}

// -------------------- 36 ECUC Config Sync & Live Change --------------------
function syncInputsFromConfig() {
  Object.keys(defaultConfig).forEach(key => {
    const el = document.getElementById('cfg_' + key);
    if (!el) return;
    if (el.type === 'checkbox') {
      el.checked = !!activeConfig[key];
    } else {
      el.value = String(activeConfig[key]);
    }
  });
}

function onConfigInputChanged(key) {
  const el = document.getElementById('cfg_' + key);
  if (!el) return;
  if (el.type === 'checkbox') {
    activeConfig[key] = !!el.checked;
  } else if (el.type === 'number') {
    activeConfig[key] = Number(el.value);
  } else {
    activeConfig[key] = el.value;
  }

  // Keep preset <-> profile synchronized intuitively
  if (key === 'ActiveTransformerChainPreset') {
    const mapProf = {
      COMXF_ONLY: 'NONE',
      COMXF_E2E_P05: 'PROFILE_05',
      COMXF_E2E_P01: 'PROFILE_01',
      SOMEIPXF_ONLY: 'NONE',
      SOMEIPXF_E2E_P04: 'PROFILE_04',
      SOMEIPXF_E2E_P07: 'PROFILE_07'
    };
    activeConfig.E2EXfActiveProfile = mapProf[activeConfig.ActiveTransformerChainPreset] || 'NONE';
    syncInputsFromConfig();
  } else if (key === 'E2EXfActiveProfile') {
    const someIp = isSomeIpPreset(activeConfig);
    if (activeConfig.E2EXfActiveProfile === 'NONE') {
      activeConfig.ActiveTransformerChainPreset = someIp ? 'SOMEIPXF_ONLY' : 'COMXF_ONLY';
    } else if (activeConfig.E2EXfActiveProfile === 'PROFILE_01') {
      activeConfig.ActiveTransformerChainPreset = 'COMXF_E2E_P01';
    } else if (activeConfig.E2EXfActiveProfile === 'PROFILE_05') {
      activeConfig.ActiveTransformerChainPreset = 'COMXF_E2E_P05';
    } else if (activeConfig.E2EXfActiveProfile === 'PROFILE_04') {
      activeConfig.ActiveTransformerChainPreset = 'SOMEIPXF_E2E_P04';
    } else if (activeConfig.E2EXfActiveProfile === 'PROFILE_07') {
      activeConfig.ActiveTransformerChainPreset = 'SOMEIPXF_E2E_P07';
    }
    syncInputsFromConfig();
  }

  // Re-run appropriate direction cleanly so Byte Map updates live
  if (simState.lastChainDir === 'RX' && (key.indexOf('Inject') === 0 || key === 'RteForwardSoftErrorToSwc')) {
    executeRxInverse(simState, activeConfig);
  } else {
    executeTxForward(simState, activeConfig, { keepCounter: true });
  }
  renderAll();
}

// -------------------- Quick Actions API Handlers --------------------
function api_runTxChain() {
  stopAutoPlay();
  executeTxForward(simState, activeConfig);
  renderAll();
}

function api_runRxInvChain() {
  stopAutoPlay();
  executeRxInverse(simState, activeConfig);
  renderAll();
}

function api_toggleTransformerFamily() {
  stopAutoPlay();
  if (isSomeIpPreset(activeConfig)) {
    activeConfig.ActiveTransformerChainPreset = 'COMXF_E2E_P05';
    activeConfig.E2EXfActiveProfile = 'PROFILE_05';
  } else {
    activeConfig.ActiveTransformerChainPreset = 'SOMEIPXF_E2E_P04';
    activeConfig.E2EXfActiveProfile = 'PROFILE_04';
  }
  syncInputsFromConfig();
  executeTxForward(simState, activeConfig);
  renderAll();
}

function api_extractProtocolHeader() {
  stopAutoPlay();
  if (!isSomeIpPreset(activeConfig)) {
    activeConfig.ActiveTransformerChainPreset = 'SOMEIPXF_ONLY';
    activeConfig.E2EXfActiveProfile = 'NONE';
    syncInputsFromConfig();
    executeTxForward(simState, activeConfig, { keepCounter: true });
  }
  executeExtractProtocolHeader(simState, activeConfig);
  renderAll();
}

function api_toggleBufferAndEndian() {
  stopAutoPlay();
  if (isSomeIpPreset(activeConfig)) {
    activeConfig.XfrmBufferComputationMode = activeConfig.XfrmBufferComputationMode === 'IN_PLACE' ? 'OUT_OF_PLACE' : 'IN_PLACE';
  } else {
    activeConfig.ComXfSignalEndianness = activeConfig.ComXfSignalEndianness === 'BIG_ENDIAN' ? 'LITTLE_ENDIAN' : 'BIG_ENDIAN';
    if (getEffectiveE2eProfile(activeConfig) !== 'NONE') {
      activeConfig.XfrmBufferComputationMode = activeConfig.XfrmBufferComputationMode === 'IN_PLACE' ? 'OUT_OF_PLACE' : 'IN_PLACE';
    }
  }
  syncInputsFromConfig();
  executeTxForward(simState, activeConfig, { keepCounter: true });
  renderAll();
}

function api_toggleTlvAndIncDyn() {
  stopAutoPlay();
  if (!isSomeIpPreset(activeConfig)) {
    activeConfig.ActiveTransformerChainPreset = 'SOMEIPXF_ONLY';
    activeConfig.E2EXfActiveProfile = 'NONE';
  }
  if (!activeConfig.SomeIpXfEnableTlvEncoding) {
    activeConfig.SomeIpXfEnableTlvEncoding = true;
  } else {
    activeConfig.SomeIpXfEnableTlvEncoding = false;
    activeConfig.SomeIpXfDynamicArrayElementCount = (Number(activeConfig.SomeIpXfDynamicArrayElementCount) % 6) + 1;
  }
  syncInputsFromConfig();
  executeTxForward(simState, activeConfig, { keepCounter: true });
  renderAll();
}

function api_injectE2eFaultMenu() {
  stopAutoPlay();
  if (getEffectiveE2eProfile(activeConfig) === 'NONE') {
    activeConfig.ActiveTransformerChainPreset = 'COMXF_E2E_P05';
    activeConfig.E2EXfActiveProfile = 'PROFILE_05';
  }
  activeConfig.InjectE2ECounterFaultMode = 'JUMP_SEQ_PLUS_5';
  syncInputsFromConfig();
  executeTxForward(simState, activeConfig);
  executeRxInverse(simState, activeConfig);
  renderAll();
}

function api_injectSomeIpOrDet() {
  stopAutoPlay();
  if (!isSomeIpPreset(activeConfig)) {
    activeConfig.ActiveTransformerChainPreset = 'SOMEIPXF_ONLY';
    activeConfig.E2EXfActiveProfile = 'NONE';
  }
  activeConfig.InjectSomeIpHeaderFault = activeConfig.InjectSomeIpHeaderFault === 'WRONG_PROTOCOL_VER' ? 'NONE' : 'WRONG_PROTOCOL_VER';
  if (activeConfig.InjectSomeIpHeaderFault === 'NONE') {
    activeConfig.InjectTruncatedBufferBytes = true;
  }
  syncInputsFromConfig();
  executeTxForward(simState, activeConfig, { keepCounter: true });
  executeRxInverse(simState, activeConfig);
  renderAll();
}

function api_quickFaultCycle() {
  api_injectE2eFaultMenu();
}

function api_injectE2ECrcToggle() {
  stopAutoPlay();
  if (getEffectiveE2eProfile(activeConfig) === 'NONE') {
    activeConfig.ActiveTransformerChainPreset = 'COMXF_E2E_P05';
    activeConfig.E2EXfActiveProfile = 'PROFILE_05';
  }
  activeConfig.InjectE2ECrcCorruption = !activeConfig.InjectE2ECrcCorruption;
  syncInputsFromConfig();
  executeTxForward(simState, activeConfig, { keepCounter: true });
  executeRxInverse(simState, activeConfig);
  renderAll();
}

function api_injectRepeatCounter() {
  stopAutoPlay();
  if (getEffectiveE2eProfile(activeConfig) === 'NONE') {
    activeConfig.ActiveTransformerChainPreset = 'COMXF_E2E_P05';
    activeConfig.E2EXfActiveProfile = 'PROFILE_05';
  }
  activeConfig.InjectE2ECrcCorruption = false;
  activeConfig.InjectE2ECounterFaultMode = 'REPEATED_DELTA_0';
  syncInputsFromConfig();
  executeRxInverse(simState, activeConfig);
  renderAll();
}

function api_injectJumpSeq() {
  api_injectE2eFaultMenu();
}

function api_resetE2eSm() {
  stopAutoPlay();
  activeConfig.InjectE2ECrcCorruption = false;
  activeConfig.InjectE2ECounterFaultMode = 'NORMAL_INC_PLUS_1';
  activeConfig.InjectSomeIpHeaderFault = 'NONE';
  activeConfig.InjectTruncatedBufferBytes = false;
  activeConfig.PassNullPtrOrUninitForDetTest = false;
  activeConfig.XfrmInitializedState = true;
  simState.e2eSmState = 'E2E_SM_VALID';
  simState.e2eSmStateNibble = 0x00;
  simState.e2eCheckStatus = 0x00;
  simState.e2eRawReturnByte = 0x00;
  simState.e2eOkCount = 2;
  simState.e2eErrCount = 0;
  simState.e2eWindowHistory = ['OK', 'OK'];
  simState.detFlagLatched = false;
  simState.corruptedOffsets = [];
  syncInputsFromConfig();
  executeTxForward(simState, activeConfig);
  renderAll();
}

function api_callGetVersionInfo() {
  advanceClock(simState, 2);
  if (activeConfig.PassNullPtrOrUninitForDetTest) {
    reportDetError(simState, activeConfig, false, 'SomeIpXf', 174, 0x02, 'XFRM_E_PARAM_POINTER', 0x04);
  } else {
    addTrace(simState, 'SomeIpXf', 174, 'SomeIpXf_GetVersionInfo(&ver)', 'Vendor=0x002B, ModId=174, R23-11', 'E_OK', 'ok', 'Truy vấn phiên bản SomeIpXf');
    addTrace(simState, 'ComXf', 175, 'ComXf_GetVersionInfo(&ver)', 'Vendor=0x002B, ModId=175, R23-11', 'E_OK', 'ok', 'Truy vấn phiên bản ComXf');
    addTrace(simState, 'E2EXf', 176, 'E2EXf_GetVersionInfo(&ver)', 'Vendor=0x002B, ModId=176, R23-11', 'E_OK', 'ok', 'Truy vấn phiên bản E2EXf');
  }
  simState.stepExplanation = {
    title: 'Gọi <Mip>_GetVersionInfo() Cho Cả 3 Module Transformer',
    summary: 'Kiểm tra phiên bản phần mềm SW & VendorID của SomeIpXf (#174), ComXf (#175) và E2EXf (#176). Nếu versioninfo == NULL_PTR sẽ báo DET 0x04.',
    inputSrc: 'Std_VersionInfoType* versioninfo',
    processDesc: activeConfig.PassNullPtrOrUninitForDetTest ? 'Phát hiện NULL_PTR -> DET 0x04' : 'Ghi vendorID, moduleID (174/175/176), sw_major_version=23, sw_minor_version=11',
    outputDst: 'Hiển thị trên API Call Trace',
    bitDiff: `DET_ERR_FLG = ${simState.detFlagLatched ? 1 : 0}`,
    alert: ''
  };
  syncRegistersFromState(simState, activeConfig);
  if (document.getElementById('byteStreamGrid')) renderAll();
}

// Interactive byte click in Memory Map
function toggleByteCorruption(offset) {
  const b = simState.bufferBytes[offset];
  if (!b) return;
  b.corrupt = !b.corrupt;
  b.byte = b.corrupt ? (b.origByte ^ 0xFF) : b.origByte;
  b.hexVal = toHex2(b.byte);
  executeRxInverse(simState, activeConfig);
  renderAll();
}

// Interactive Register Bit Click
function inspectRegisterBit(regName, bitIdx) {
  const list = regName === 'A' ? XFRM_RETURN_ERR_BITS : XFRM_PIPELINE_BITS;
  const info = list.find(x => x.bit === bitIdx);
  if (!info) return;
  simState.stepExplanation = {
    title: `Thanh Ghi ${regName === 'A' ? 'Xfrm_ReturnErrorByte' : 'Xfrm_ChainPipelineByte'} — Bit ${info.bit} (${info.key})`,
    summary: info.desc,
    inputSrc: `Bit ${info.bit} [${info.label}]`,
    processDesc: `Giá trị hiện tại: ${regName === 'A' ? ((simState.regAReturnErrByte >> info.bit) & 1) : ((simState.regBChainPipeByte >> info.bit) & 1)}`,
    outputDst: 'Quyết định nhánh xử lý tại RTE / E2EXf / Deserializer',
    bitDiff: `Reg A = 0x${toHex2(simState.regAReturnErrByte)} | Reg B = 0x${toHex2(simState.regBChainPipeByte)}`,
    alert: ''
  };
  switchInspTab('current');
  renderInspectorCurrent();
}

// -------------------- Master Renderers --------------------
function renderAll() {
  renderHeaderAndScenario();
  renderPipelineAndByteMap();
  renderDualRegisters();
  renderMetricsAndStateMachines();
  renderInteractiveSvg();
  renderAllInspectorTabs();
}

function renderHeaderAndScenario() {
  const scn = getActiveScenario();
  const sel = document.getElementById('scnSelect');
  if (sel && sel.value !== scn.id) sel.value = scn.id;

  const ind = document.getElementById('stepIndicator');
  if (ind) {
    ind.textContent = uiState.currentStepNum === 0
      ? `Bước 0/${scn.steps.length} (Init)`
      : `Bước ${uiState.currentStepNum}/${scn.steps.length}`;
  }
  const bPrev = document.getElementById('btnStepPrev');
  const bNext = document.getElementById('btnStepNext');
  if (bPrev) bPrev.disabled = uiState.currentStepNum <= 0;
  if (bNext) bNext.disabled = uiState.currentStepNum >= scn.steps.length;

  const badge = document.getElementById('scnBadgeId');
  const titleEl = document.getElementById('scnTitleText');
  const sumEl = document.getElementById('scnSummaryText');
  if (badge) badge.textContent = scn.id;
  if (titleEl) titleEl.textContent = scn.title;
  if (sumEl) sumEl.textContent = scn.summary;

  const wif = document.getElementById('whatIfContainer');
  if (wif) {
    wif.innerHTML = (scn.whatIfs || []).map((w, i) =>
      `<button class="whatif-btn" onclick="runWhatIf(${i})"><span>⚡</span><span>${escapeHtml(w.label)}</span></button>`
    ).join('');
  }

  // Status Pills
  const chainPill = document.getElementById('hdrChainPill');
  const rtePill = document.getElementById('hdrRteRetPill');
  const e2ePill = document.getElementById('hdrE2eRetPill');
  const bufPill = document.getElementById('hdrBufPill');
  const someIp = isSomeIpPreset(activeConfig);
  const e2eProf = getEffectiveE2eProfile(activeConfig);

  if (chainPill) {
    chainPill.textContent = `CHAIN: ${someIp ? 'SOMEIP' : 'COMXF'}${e2eProf !== 'NONE' ? '+' + e2eProf : ''}`;
  }
  if (rtePill) {
    rtePill.textContent = `RTE: ${simState.rteReturnLabel}`;
    rtePill.className = 'st-pill ' + (simState.rteReturnCode === 0x00 ? 'ok' : (simState.rteReturnCode === 0x8A ? 'warn' : 'err'));
  }
  if (e2ePill) {
    e2ePill.textContent = e2eProf === 'NONE' ? 'E2E: BYPASS' : `E2E: 0x${toHex2(simState.e2eRawReturnByte)} ${simState.e2eSmState.replace('E2E_SM_', '')}`;
    e2ePill.className = 'st-pill ' + ((simState.e2eRawReturnByte & 0x80) ? 'err' : (simState.e2eRawReturnByte ? 'warn' : 'ok'));
  }
  if (bufPill) {
    bufPill.textContent = `${activeConfig.XfrmBufferComputationMode} | ${simState.headerShiftBytes}B Shift`;
  }
}

function renderPipelineAndByteMap() {
  const dirTag = document.getElementById('p1ChainDirTag');
  if (dirTag) dirTag.textContent = `${simState.lastChainDir} (${simState.chainFsmState})`;

  const pipeEl = document.getElementById('chainPipelineGrid');
  if (pipeEl) {
    const stages = simState.pipelineStages || [];
    const arrowChar = simState.lastChainDir === 'RX' ? '➔' : '➔';
    pipeEl.innerHTML = stages.map((st, idx) => {
      const card = `<div class="pipe-stage ${st.state || ''}">
        <div class="pipe-stage-title">${escapeHtml(st.title)}</div>
        <div class="pipe-stage-sub">${escapeHtml(st.sub)}</div>
        <div class="pipe-stage-meta">${escapeHtml(st.meta)}</div>
      </div>`;
      return idx < stages.length - 1 ? `${card}<div class="pipe-arrow">${arrowChar}</div>` : card;
    }).join('');
  }

  const bufBar = document.getElementById('bufAllocBar');
  if (bufBar) {
    const regions = simState.bufferRegions || [];
    bufBar.innerHTML = `
      <div class="buf-alloc-hdr">
        <span><strong>Buffer Mode:</strong> <code style="color:var(--accent)">${activeConfig.XfrmBufferComputationMode}</code> | <strong>HeaderShift:</strong> ${simState.headerShiftBytes}B | <strong>memcpy:</strong> ${simState.memcpyBytes}B</span>
        <span>Required: <strong>${simState.requiredBufSize}B</strong> / Allocated: <strong>${activeConfig.XfrmAllocatedRteBufferSize}B</strong></span>
      </div>
      <div class="buf-regions-row">
        ${regions.map(r => `<div class="buf-region ${r.role}">
          <span>[${r.offsetStart}..${r.offsetEnd}] ${escapeHtml(r.title)}</span>
          <span style="font-size:9px;opacity:0.85;">${escapeHtml(r.desc)}</span>
        </div>`).join('')}
      </div>
    `;
  }

  const bsGrid = document.getElementById('byteStreamGrid');
  if (bsGrid) {
    if (!simState.bufferBytes.length) {
      const emptyMsg = uiState.currentStepNum === 0
        ? '<strong>Bước 0 (Init State):</strong> Buffer PDU chưa được khởi tạo — bấm <strong>Tiếp ▶</strong> để bắt đầu Bước 1 hoặc bấm <strong>📤 Tx Chain</strong>.'
        : '<strong>Chưa cấp phát Byte-Stream:</strong> Bước hiện tại chưa tạo PDU truyền — bấm <strong>Tiếp ▶</strong> sang bước Transformer kế tiếp hoặc bấm <strong>📤 Tx Chain</strong>.';
      bsGrid.innerHTML = `<div class="byte-grid-empty">${emptyMsg}</div>`;
    } else {
      bsGrid.innerHTML = simState.bufferBytes.map(b => `
        <div class="byte-cell byte-${b.role} ${b.corrupt ? 'byte-corrupt' : ''}" onclick="toggleByteCorruption(${b.offset})" title="${escapeHtml(b.detail)} (Click để đảo bit lỗi!)">
          <span class="bc-off">[${String(b.offset).padStart(2, '0')}]</span>
          <span class="bc-hex">${b.hexVal}</span>
          <span class="bc-lbl">${escapeHtml(b.label)}</span>
        </div>
      `).join('');
    }
  }
}

function renderDualRegisters() {
  const hexA = document.getElementById('regAHex');
  const hexB = document.getElementById('regBHex');
  if (hexA) hexA.textContent = '0x' + toHex2(simState.regAReturnErrByte);
  if (hexB) hexB.textContent = '0x' + toHex2(simState.regBChainPipeByte);

  const elA = document.getElementById('regABits');
  if (elA) {
    elA.innerHTML = XFRM_RETURN_ERR_BITS.map(b => {
      const val = (simState.regAReturnErrByte >> b.bit) & 1;
      const cls = val ? `on ${b.severity}` : '';
      return `<div class="bit-box ${cls}" onclick="inspectRegisterBit('A', ${b.bit})" title="${escapeHtml(b.desc)}">
        <span class="bit-idx">B${b.bit}</span>
        <span class="bit-val">${val}</span>
        <span class="bit-lbl">${escapeHtml(b.label)}</span>
      </div>`;
    }).join('');
  }

  const elB = document.getElementById('regBBits');
  if (elB) {
    elB.innerHTML = XFRM_PIPELINE_BITS.map(b => {
      const val = (simState.regBChainPipeByte >> b.bit) & 1;
      const cls = val ? `on ${b.severity}` : '';
      return `<div class="bit-box ${cls}" onclick="inspectRegisterBit('B', ${b.bit})" title="${escapeHtml(b.desc)}">
        <span class="bit-idx">B${b.bit}</span>
        <span class="bit-val">${val}</span>
        <span class="bit-lbl">${escapeHtml(b.label)}</span>
      </div>`;
    }).join('');
  }

  const chkName = (E2E_CHECK_STATUS_MAP[simState.e2eCheckStatus] || {}).name || 'E2E_P_OK';
  const fAL = document.getElementById('regAFootLeft');
  const fAR = document.getElementById('regAFootRight');
  if (fAL) fAL.textContent = `RTE: ${simState.rteReturnLabel}`;
  if (fAR) fAR.textContent = `2-Nibble: 0x${toHex2(simState.e2eRawReturnByte)} (${chkName.replace('E2E_P_', '')} | ${simState.e2eSmState.replace('E2E_SM_', '')})`;

  const fBL = document.getElementById('regBFootLeft');
  const fBR = document.getElementById('regBFootRight');
  if (fBL) fBL.textContent = `Mode: ${isSomeIpPreset(activeConfig) ? 'SomeIpXf' : 'ComXf'} + ${activeConfig.XfrmBufferComputationMode}`;
  if (fBR) fBR.textContent = `Endian: ${isSomeIpPreset(activeConfig) ? 'BIG(Net)' : activeConfig.ComXfSignalEndianness} | DET: ${simState.detErrors.length}`;
}

function renderMetricsAndStateMachines() {
  const clk = document.getElementById('simClockBadge');
  if (clk) clk.textContent = `t = ${simState.clockMs} ms`;

  const mBufVal = document.getElementById('mBufVal');
  const mBufSub = document.getElementById('mBufSub');
  if (mBufVal) mBufVal.textContent = `${simState.bufferBytes.length}B / ${simState.headerShiftBytes}B Shift`;
  if (mBufSub) mBufSub.textContent = `Allocated: ${activeConfig.XfrmAllocatedRteBufferSize}B`;

  const mCntVal = document.getElementById('mCntVal');
  const mCntSub = document.getElementById('mCntSub');
  if (mCntVal) mCntVal.textContent = `Cnt=${simState.txCounter} / Δ${simState.e2eDeltaCounter}`;
  if (mCntSub) mCntSub.textContent = `Profile: ${getEffectiveE2eProfile(activeConfig)}`;

  const mSmVal = document.getElementById('mSmVal');
  const mSmSub = document.getElementById('mSmSub');
  if (mSmVal) mSmVal.textContent = `${simState.e2eOkCount} OK / ${simState.e2eErrCount} Err`;
  if (mSmSub) mSmSub.textContent = `MinOK:${activeConfig.E2EXfMinOkStateValid} | MaxErr:${activeConfig.E2EXfMaxErrorStateValid}`;

  const mCopyVal = document.getElementById('mCopyVal');
  const mCopySub = document.getElementById('mCopySub');
  if (mCopyVal) mCopyVal.textContent = `${simState.memcpyBytes}B memcpy`;
  if (mCopySub) mCopySub.textContent = activeConfig.XfrmBufferComputationMode === 'IN_PLACE' ? 'Zero-Copy Tiết Kiệm RAM' : 'Out-of-Place Copy Overhead';

  // State Machine 1: RTE Chain FSM
  const smChainLabel = document.getElementById('smChainLabel');
  if (smChainLabel) smChainLabel.textContent = simState.chainFsmState;
  const smChainEl = document.getElementById('smChainStates');
  if (smChainEl) {
    const chainStates = ['IDLE', 'TX_FORWARD', 'RX_E2E_CHECK', 'RX_DESERIALIZE', 'DONE', 'SOFT_0x8A', 'APP_ERR_0x81', 'ABORTED_0x88'];
    smChainEl.innerHTML = chainStates.map(st => {
      let cls = '';
      if (simState.chainFsmState === st) {
        if (st === 'DONE') cls = 'active-ok';
        else if (st === 'ABORTED_0x88') cls = 'active-err';
        else if (st === 'SOFT_0x8A' || st === 'APP_ERR_0x81') cls = 'active-warn';
        else cls = 'active-info';
      }
      return `<span class="sm-pill ${cls}">${st}</span>`;
    }).join('');
  }

  // State Machine 2: E2E_SMCheck FSM
  const smE2eLabel = document.getElementById('smE2eLabel');
  if (smE2eLabel) smE2eLabel.textContent = simState.e2eSmState;
  const smE2eEl = document.getElementById('smE2eStates');
  if (smE2eEl) {
    const e2eStates = ['E2E_SM_DEINIT', 'E2E_SM_NODATA', 'E2E_SM_INIT', 'E2E_SM_VALID', 'E2E_SM_INVALID'];
    smE2eEl.innerHTML = e2eStates.map(st => {
      let cls = '';
      if (simState.e2eSmState === st) {
        if (st === 'E2E_SM_VALID') cls = 'active-ok';
        else if (st === 'E2E_SM_INVALID') cls = 'active-err';
        else cls = 'active-warn';
      }
      return `<span class="sm-pill ${cls}">${st.replace('E2E_SM_', '')}</span>`;
    }).join('');
  }

  const winStrip = document.getElementById('e2eWindowStrip');
  if (winStrip) {
    const hist = simState.e2eWindowHistory || [];
    winStrip.innerHTML = `<span>Window:</span>` + (hist.length ? hist.map(h =>
      `<span class="win-slot ${h === 'OK' ? 'ok' : 'err'}">${h === 'OK' ? '✓' : '✗'}</span>`
    ).join('') : '<span>(Chưa có mẫu)</span>');
  }
}

function renderInteractiveSvg() {
  const someIp = isSomeIpPreset(activeConfig);
  const e2eProf = getEffectiveE2eProfile(activeConfig);

  const subUpdates = {
    svgSub_SWC: someIp ? `RPC/Radar N=${activeConfig.SomeIpXfDynamicArrayElementCount}` : `Spd=${activeConfig.SwcInputVehicleSpeedKmh} Gear=${activeConfig.SwcInputGearPosition}`,
    svgSub_RTE: `${simState.lastChainDir} | Ret: 0x${toHex2(simState.rteReturnCode)}`,
    svgSub_Det: simState.detErrors.length ? `LỖI: ${simState.detErrors.length} (0x${toHex2(simState.detErrors[simState.detErrors.length - 1].errCode)})` : 'Errors: 0 (Clean)',
    svgSub_ComXf: someIp ? 'Standby' : `${activeConfig.ComXfSignalEndianness === 'BIG_ENDIAN' ? 'BigEnd' : 'LitEnd'} Fill=${activeConfig.ComXfUnusedBitFillPatternHex}`,
    svgSub_SomeIpXf: someIp ? `Msg=0x${toHex2(getMsgTypeByte(activeConfig))} ${activeConfig.SomeIpXfEnableTlvEncoding ? 'TLV' : 'Dyn'}` : 'Standby',
    svgSub_E2EXf: e2eProf === 'NONE' ? 'Profile: NONE (Bypass)' : `${e2eProf} | 2-Nib=0x${toHex2(simState.e2eRawReturnByte)}`,
    svgSub_Com: activeConfig.ComSendSignalGroupArrayEnable ? 'SendSignalGroupArray' : 'Per-Signal Mode',
    svgSub_LdCom: someIp ? `Pass-Thru ${simState.bufferBytes.length}B` : 'Standby',
    svgSub_BusIf: someIp ? `${activeConfig.SomeIpXfServiceAndMethodIdHex} (+8B SoAd)` : 'CAN-FD Frame Ready'
  };
  Object.keys(subUpdates).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = subUpdates[id];
  });

  const banner = document.getElementById('svgFlowBanner');
  if (banner) {
    banner.textContent = `${simState.lastChainDir} ➔ ${simState.rteReturnLabel}`;
  }

  // Highlight active boxes & arrows
  document.querySelectorAll('.mod-box').forEach(el => {
    el.classList.remove('active-flow', 'error-flow');
  });
  (simState.activeSvgModules || []).forEach(m => {
    const box = document.getElementById('svgMod_' + m);
    if (box) {
      if (m === simState.lastErrorModule || m === 'Det') box.classList.add('error-flow');
      else box.classList.add('active-flow');
    }
  });

  const dirCls = simState.rteReturnCode >= 0x87 && simState.rteReturnCode !== 0x8A ? 'active-err' : (simState.lastChainDir === 'RX' || simState.lastChainDir === 'EXTRACT' ? 'active-rx' : 'active-tx');
  const markUrl = dirCls === 'active-err' ? 'url(#arr-red)' : (dirCls === 'active-rx' ? 'url(#arr-accent)' : 'url(#arr-green)');
  document.querySelectorAll('.flow-path').forEach(p => {
    p.classList.remove('active-tx', 'active-rx', 'active-err');
    p.setAttribute('marker-end', 'url(#arr-muted)');
  });
  (simState.activeSvgPaths || []).forEach(pid => {
    const p = document.getElementById(pid);
    if (p) {
      p.classList.add(dirCls);
      p.setAttribute('marker-end', markUrl);
    }
  });
}

function renderAllInspectorTabs() {
  renderInspectorCurrent();
  renderInspectorModule();
  renderInspectorCode();
  renderInspectorTrace();
}

function renderInspectorCurrent() {
  const el = document.getElementById('inspPane_current');
  if (!el) return;
  const e = simState.stepExplanation || {};
  el.innerHTML = `
    <div class="insp-card">
      <div class="insp-card-title"><span>${escapeHtml(e.title || '')}</span></div>
      <p style="font-size:12px;color:var(--text-dim);margin-bottom:8px;">${escapeHtml(e.summary || '')}</p>
      <div class="io-grid">
        <div class="io-row"><span class="io-tag in">INPUT</span><div style="color:var(--text);">${escapeHtml(e.inputSrc || '')}</div></div>
        <div class="io-row"><span class="io-tag proc">PROCESSING</span><div style="color:var(--text);">${escapeHtml(e.processDesc || '')}</div></div>
        <div class="io-row"><span class="io-tag out">OUTPUT</span><div style="color:var(--text);">${escapeHtml(e.outputDst || '')}</div></div>
        ${e.bitDiff ? `<div class="io-row"><span class="io-tag proc">BIT / BYTE</span><div style="font-family:var(--mono);color:var(--accent);">${escapeHtml(e.bitDiff)}</div></div>` : ''}
        ${e.alert ? `<div class="io-row"><span class="io-tag err">CẢNH BÁO</span><div style="color:var(--red);">${escapeHtml(e.alert)}</div></div>` : ''}
      </div>
    </div>
    ${simState.someIpExtractResult ? `
      <div class="insp-card">
        <div class="insp-card-title"><span>🔍 SomeIpXf_ExtractProtocolHeaderFields()</span></div>
        <div style="font-family:var(--mono);font-size:11px;color:var(--text-dim);">
          <div>MsgType: <strong style="color:var(--accent);">${escapeHtml(simState.someIpExtractResult.msgTypeHex || 'N/A')}</strong> (${escapeHtml(simState.someIpExtractResult.msgTypeName || '')})</div>
          <div>ReturnCode: <strong style="color:var(--green);">${escapeHtml(simState.someIpExtractResult.retCodeHex || 'N/A')}</strong></div>
          <div>Rẽ nhánh RTE: <strong style="color:var(--amber);">${escapeHtml(simState.someIpExtractResult.branch || '')}</strong></div>
        </div>
      </div>
    ` : ''}
  `;
}

function renderInspectorModule() {
  const el = document.getElementById('inspPane_module');
  if (!el) return;
  const m = MODULES_INFO[uiState.selectedModule] || MODULES_INFO.RTE;
  el.innerHTML = `
    <div class="insp-card">
      <div class="insp-card-title">
        <span>${escapeHtml(m.id)}</span>
        <span class="st-pill info">${escapeHtml(m.moduleId)}</span>
      </div>
      <div style="font-size:11px;font-family:var(--mono);color:var(--purple);margin-bottom:6px;">${escapeHtml(m.sws)}</div>
      <p style="font-size:12px;color:var(--text);margin-bottom:8px;"><strong>Vai trò:</strong> ${escapeHtml(m.role)}</p>
      <div class="io-grid">
        <div class="io-row"><span class="io-tag in">INPUT TỪ ĐÂU</span><div style="color:var(--text-dim);">${escapeHtml(m.input)}</div></div>
        <div class="io-row"><span class="io-tag proc">XỬ LÝ NỘI TẠI</span><div style="color:var(--text-dim);">${escapeHtml(m.processing)}</div></div>
        <div class="io-row"><span class="io-tag out">OUTPUT ĐI ĐÂU</span><div style="color:var(--text-dim);">${escapeHtml(m.output)}</div></div>
      </div>
      <div style="margin-top:8px;">
        <div style="font-size:11px;font-weight:700;color:var(--text);margin-bottom:4px;">API Chuẩn AUTOSAR:</div>
        <div class="code-block">${m.apis.map(a => escapeHtml(a)).join('\n')}</div>
      </div>
    </div>
  `;
}

function renderInspectorCode() {
  const el = document.getElementById('inspPane_code');
  if (!el) return;
  el.innerHTML = `
    <div class="insp-card">
      <div class="insp-card-title">
        <span>💻 Mã C Đồng Bộ Với Cấu Hình Hiện Tại</span>
        <button class="mini-chip" onclick="openExportModal()">📦 Xuất File</button>
      </div>
      <pre class="code-block">${escapeHtml(generateLiveCCode(simState, activeConfig))}</pre>
    </div>
  `;
}

function renderInspectorTrace() {
  const el = document.getElementById('inspPane_trace');
  if (!el) return;
  if (!simState.traces.length) {
    el.innerHTML = '<div style="color:var(--text-muted);padding:12px;">Chưa có lời gọi API nào.</div>';
    return;
  }
  el.innerHTML = simState.traces.map(t => `
    <div class="trace-item ${t.severity}">
      <div class="trace-hdr">
        <span style="color:var(--accent);font-weight:700;">#${t.seq} [${t.timeMs}ms] ${escapeHtml(t.module)} (${t.modId})</span>
        <span class="st-pill ${t.severity === 'ok' ? 'ok' : (t.severity === 'warn' ? 'warn' : 'err')}" style="padding:1px 6px;font-size:9.5px;">${escapeHtml(t.result)}</span>
      </div>
      <div class="trace-api">${escapeHtml(t.api)}</div>
      <div class="trace-detail">${escapeHtml(t.params)}${t.detail ? ' — ' + escapeHtml(t.detail) : ''}</div>
    </div>
  `).join('');
}

// -------------------- Hover Tooltip >1000ms Handler --------------------
let tooltipTimer = null;
function initTooltipHandlers() {
  const popup = document.getElementById('cfgTooltipPopup');
  if (!popup) return;
  document.querySelectorAll('.cfg-row[data-cfg-key]').forEach(row => {
    const key = row.getAttribute('data-cfg-key');
    row.addEventListener('mouseenter', ev => {
      clearTimeout(tooltipTimer);
      const clientX = ev.clientX;
      const clientY = ev.clientY;
      tooltipTimer = setTimeout(() => showCfgTooltip(key, clientX, clientY), 1020);
    });
    row.addEventListener('mousemove', ev => {
      if (popup.style.display === 'block') {
        positionTooltip(popup, ev.clientX, ev.clientY);
      }
    });
    row.addEventListener('mouseleave', () => {
      clearTimeout(tooltipTimer);
      popup.style.display = 'none';
    });
  });
}

function positionTooltip(popup, x, y) {
  const pad = 14;
  const maxW = window.innerWidth - 410;
  const maxH = window.innerHeight - 220;
  const left = Math.min(Math.max(8, x + pad), Math.max(8, maxW));
  const top = Math.min(Math.max(8, y + pad), Math.max(8, maxH));
  popup.style.left = left + 'px';
  popup.style.top = top + 'px';
}

function showCfgTooltip(key, x, y) {
  const popup = document.getElementById('cfgTooltipPopup');
  const data = configTooltipData[key];
  if (!popup || !data) return;
  popup.innerHTML = `
    <div class="tt-title">${escapeHtml(data.title)}</div>
    <div class="tt-meta">${escapeHtml(data.ecucPath)} | ${escapeHtml(data.sws)}</div>
    <div class="tt-desc">${escapeHtml(data.desc)}</div>
    <div class="tt-vals"><strong>Giá trị:</strong> ${escapeHtml(data.values)}</div>
  `;
  positionTooltip(popup, x, y);
  popup.style.display = 'block';
}

// -------------------- Export Modal & Offline Standalone Download --------------------
function openExportModal() {
  const modal = document.getElementById('exportModal');
  if (modal) modal.classList.add('open');
  switchExportTab(uiState.activeExportTab);
}
function closeExportModal() {
  const modal = document.getElementById('exportModal');
  if (modal) modal.classList.remove('open');
}
function switchExportTab(tab) {
  uiState.activeExportTab = tab;
  ['arxml', 'cfg_h', 'rte_c', 'json'].forEach(t => {
    const el = document.getElementById('expTab_' + t);
    if (el) el.classList.toggle('active', t === tab);
  });
  const pre = document.getElementById('exportCodePre');
  if (pre) pre.textContent = generateExportContent(tab, simState, activeConfig);
}
function copyExportCode() {
  const pre = document.getElementById('exportCodePre');
  if (!pre) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(pre.textContent).catch(() => {});
  }
}
function downloadActiveExportFile() {
  const names = { arxml: 'Xfrm.arxml', cfg_h: 'Xfrm_Cfg.h', rte_c: 'Rte_Xfrm.c', json: 'Xfrm_Config.json' };
  const text = generateExportContent(uiState.activeExportTab, simState, activeConfig);
  triggerTextDownload(names[uiState.activeExportTab] || 'Xfrm_Config.txt', text);
}
function downloadStandaloneHTML() {
  const html = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
  triggerTextDownload('AUTOSAR_Xfrm_Simulator.html', html);
}
function triggerTextDownload(filename, content) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

function escapeHtml(s) {
  return String(s === undefined || s === null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
