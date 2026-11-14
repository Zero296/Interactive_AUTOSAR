// ================= PART 5: UI CONTROLLER, STEPPER, TOOLTIP (>1S), INSPECTOR & EXPORTS =================

let uiState = {
  mainView: "sim",
  cfgTab: 0,
  inspTab: 0,
  exportTab: 0,
  currentScenarioId: "S1",
  currentStepIdx: 0,
  stepSnapshots: [],
  autoPlayTimer: null,
  autoClockTimer: null,
  theme: "dark"
};

function escHtml(s) {
  return String(s === undefined || s === null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fmtHex2(n) {
  return "0x" + (Number(n) & 0xff).toString(16).toUpperCase().padStart(2, "0");
}

function fmtBin8(n) {
  return (Number(n) & 0xff).toString(2).padStart(8, "0");
}

function cloneSnapshot() {
  return {
    ecucConfig: JSON.parse(JSON.stringify(ecucConfig)),
    simState: JSON.parse(JSON.stringify(simState))
  };
}

function restoreSnapshot(snap) {
  if (!snap) return;
  ecucConfig = JSON.parse(JSON.stringify(snap.ecucConfig));
  simState = JSON.parse(JSON.stringify(snap.simState));
}

function getCurrentScenario() {
  return SCENARIOS.find((s) => s.id === uiState.currentScenarioId) || SCENARIOS[0];
}

// -------------------- SCENARIO STEPPER & WHAT-IF ENGINE --------------------

function stopAutoPlay() {
  if (uiState.autoPlayTimer) {
    clearInterval(uiState.autoPlayTimer);
    uiState.autoPlayTimer = null;
  }
  const btn = document.getElementById("btnAutoPlay");
  if (btn) btn.textContent = "▶ Tự Chạy";
}

function stopAutoClock() {
  if (uiState.autoClockTimer) {
    clearInterval(uiState.autoClockTimer);
    uiState.autoClockTimer = null;
  }
  const btn = document.getElementById("btnAutoClock");
  if (btn) btn.textContent = "⏱ Auto";
}

function loadScenario(scenId) {
  stopAutoPlay();
  uiState.currentScenarioId = scenId;
  const sel = document.getElementById("scenSelect");
  if (sel && sel.value !== scenId) sel.value = scenId;

  const scen = getCurrentScenario();
  if (scen && typeof scen.setup === "function") {
    scen.setup();
  }
  uiState.currentStepIdx = 0;
  uiState.stepSnapshots = [cloneSnapshot()];
  if (scen) {
    simState.stepExplain = "Sẵn sàng chạy " + scen.id + ": " + scen.summary + " Nhấn [Tiếp ▶] để thực thi Pha 1.";
  }

  renderWhatIfButtons();
  syncConfigToDOM();
  renderAll();
}

function applyStepIndex(targetIdx) {
  const scen = getCurrentScenario();
  if (!scen) return;
  const maxStep = scen.steps.length;
  const clamped = Math.max(0, Math.min(maxStep, Number(targetIdx) || 0));

  if (clamped < uiState.stepSnapshots.length && clamped <= uiState.currentStepIdx) {
    restoreSnapshot(uiState.stepSnapshots[clamped]);
    uiState.currentStepIdx = clamped;
  } else {
    while (uiState.currentStepIdx < clamped) {
      const nextStepObj = scen.steps[uiState.currentStepIdx];
      if (!nextStepObj) break;
      if (typeof nextStepObj.exec === "function") {
        nextStepObj.exec();
      }
      simState.stepExplain = nextStepObj.title + "\n" + nextStepObj.desc;
      uiState.currentStepIdx += 1;
      uiState.stepSnapshots[uiState.currentStepIdx] = cloneSnapshot();
    }
  }

  syncConfigToDOM();
  renderAll();
}

function nextScenarioStep() {
  const scen = getCurrentScenario();
  if (!scen) return;
  if (uiState.currentStepIdx >= scen.steps.length) {
    stopAutoPlay();
    return;
  }
  applyStepIndex(uiState.currentStepIdx + 1);
}

function prevScenarioStep() {
  stopAutoPlay();
  if (uiState.currentStepIdx <= 0) return;
  applyStepIndex(uiState.currentStepIdx - 1);
}

function resetCurrentScenario() {
  loadScenario(uiState.currentScenarioId);
}

function onScenarioSelectChange() {
  const sel = document.getElementById("scenSelect");
  if (sel) loadScenario(sel.value);
}

function toggleScenarioAutoPlay() {
  if (uiState.autoPlayTimer) {
    stopAutoPlay();
    return;
  }
  const scen = getCurrentScenario();
  if (!scen) return;
  if (uiState.currentStepIdx >= scen.steps.length) {
    loadScenario(scen.id);
  }
  const btn = document.getElementById("btnAutoPlay");
  if (btn) btn.textContent = "⏸ Dừng";
  uiState.autoPlayTimer = setInterval(() => {
    const cur = getCurrentScenario();
    if (!cur || uiState.currentStepIdx >= cur.steps.length) {
      stopAutoPlay();
      return;
    }
    nextScenarioStep();
  }, 1500);
}

function renderWhatIfButtons() {
  const scen = getCurrentScenario();
  const badge = document.getElementById("scenIdBadge");
  const sumBox = document.getElementById("scenSummaryBox");
  const container = document.getElementById("whatIfContainer");
  if (!scen) return;

  if (badge) badge.textContent = scen.id;
  if (sumBox) {
    sumBox.innerHTML = "<strong>" + escHtml(scen.title) + "</strong><br>" + escHtml(scen.summary);
  }
  if (container) {
    container.innerHTML = (scen.whatIfs || [])
      .map((wi, idx) => `<button class="whatif-btn" onclick="runWhatIf(${idx})">${escHtml(wi.label)}</button>`)
      .join("");
  }
}

function runWhatIf(idx) {
  stopAutoPlay();
  const scen = getCurrentScenario();
  if (!scen || !scen.whatIfs || !scen.whatIfs[idx]) return;
  const wi = scen.whatIfs[idx];
  if (typeof wi.run === "function") {
    wi.run();
  }
  const latestTrace = simState.apiTrace && simState.apiTrace[0] ? simState.apiTrace[0].detail : "";
  simState.stepExplain = "Thử nghiệm nhanh — " + wi.label + "\n" + latestTrace;
  syncConfigToDOM();
  renderAll();
}

// -------------------- ASYNCHRONOUS BSW MAIN FUNCTIONS & CLOCK --------------------

function stepNvMTick() {
  api_NvM_MainFunction();
  syncConfigToDOM();
  renderAll();
}

function stepFeeFlsTick() {
  api_FeeFls_MainFunction();
  syncConfigToDOM();
  renderAll();
}

function stepEaEepTick() {
  api_EaEep_MainFunction();
  syncConfigToDOM();
  renderAll();
}

function toggleAutoClock() {
  if (uiState.autoClockTimer) {
    stopAutoClock();
    return;
  }
  const btn = document.getElementById("btnAutoClock");
  if (btn) btn.textContent = "⏸ Stop";
  uiState.autoClockTimer = setInterval(() => {
    const d0 = simState.devices[0];
    const d1 = simState.devices[1];
    let ran = false;
    if (d0.status === "MEMIF_BUSY" || d0.status === "MEMIF_BUSY_INTERNAL") {
      api_FeeFls_MainFunction();
      ran = true;
    }
    if (d1.status === "MEMIF_BUSY") {
      api_EaEep_MainFunction();
      ran = true;
    }
    if (ecucConfig.NvMPollingMode) {
      api_NvM_MainFunction();
      ran = true;
    }
    if (!ran) {
      // Advance NvM idle heartbeat when stack is idle
      api_NvM_MainFunction();
    }
    syncConfigToDOM();
    renderAll();
  }, 750);
}

// -------------------- QUICK ACTION BAR (8 BUTTONS + TARGETS) --------------------

function getQaTargets() {
  const devEl = document.getElementById("qaDevSelect");
  const blkEl = document.getElementById("qaBlkSelect");
  const devIdx = devEl ? Number(devEl.value) : Number(ecucConfig.SelectedDeviceIndex || 0);
  const blkHex = blkEl ? blkEl.value : (ecucConfig.SelectedLogicalBlock || "0x0004");
  return { devIdx, blkHex };
}

function onQaTargetChanged(which) {
  const devEl = document.getElementById("qaDevSelect");
  const blkEl = document.getElementById("qaBlkSelect");
  if (!devEl || !blkEl) return;

  if (which === "blk") {
    const blkHex = blkEl.value;
    const info = LOGICAL_BLOCKS[blkHex];
    ecucConfig.SelectedLogicalBlock = blkHex;
    if (info) {
      ecucConfig.MemIfReadLength = info.size;
      ecucConfig.WritePayloadHex = info.defaultHex;
      ecucConfig.FeeImmediateData = Boolean(info.immediate);
      if (devEl.value === "0" || devEl.value === "1") {
        devEl.value = String(info.devIdx);
        ecucConfig.SelectedDeviceIndex = String(info.devIdx);
        simState.selectedDeviceCard = info.devIdx;
      }
    }
  } else {
    const rawDev = Number(devEl.value);
    if (rawDev === 0 || rawDev === 1) {
      ecucConfig.SelectedDeviceIndex = String(rawDev);
      simState.selectedDeviceCard = rawDev;
      // Align default block if current block belongs to the other device
      const curBlk = LOGICAL_BLOCKS[blkEl.value];
      if (curBlk && curBlk.devIdx !== rawDev) {
        const nextBlk = rawDev === 1 ? "0x0010" : "0x0004";
        blkEl.value = nextBlk;
        ecucConfig.SelectedLogicalBlock = nextBlk;
        ecucConfig.MemIfReadLength = LOGICAL_BLOCKS[nextBlk].size;
        ecucConfig.WritePayloadHex = LOGICAL_BLOCKS[nextBlk].defaultHex;
      }
    } else if (rawDev === 255) {
      simState.selectedDeviceCard = 255;
    }
  }

  syncConfigToDOM();
  renderAll();
}

function qaMemIfRead() {
  const { devIdx, blkHex } = getQaTargets();
  api_MemIf_Read(
    devIdx,
    blkHex,
    Number(ecucConfig.MemIfReadBlockOffset || 0),
    Number(ecucConfig.MemIfReadLength || 32),
    Boolean(ecucConfig.PassNullPointerTest)
  );
  simState.stepExplain = "Manual Quick Action: MemIf_Read(" + devIdx + ", " + blkHex + "). Nhấn [+1 Fee/Fls] hoặc [+1 Ea/Eep] để đẩy tiến trình.";
  syncConfigToDOM();
  renderAll();
}

function qaMemIfWrite() {
  const { devIdx, blkHex } = getQaTargets();
  api_MemIf_Write(devIdx, blkHex, ecucConfig.WritePayloadHex, Boolean(ecucConfig.PassNullPointerTest));
  simState.stepExplain = "Manual Quick Action: MemIf_Write(" + devIdx + ", " + blkHex + ").";
  syncConfigToDOM();
  renderAll();
}

function qaMemIfEraseImmediate() {
  const { devIdx, blkHex } = getQaTargets();
  api_MemIf_EraseImmediateBlock(devIdx, blkHex);
  simState.stepExplain = "Manual Quick Action: MemIf_EraseImmediateBlock(" + devIdx + ", " + blkHex + ").";
  syncConfigToDOM();
  renderAll();
}

function qaMemIfInvalidate() {
  const { devIdx, blkHex } = getQaTargets();
  api_MemIf_InvalidateBlock(devIdx, blkHex);
  simState.stepExplain = "Manual Quick Action: MemIf_InvalidateBlock(" + devIdx + ", " + blkHex + ").";
  syncConfigToDOM();
  renderAll();
}

function qaMemIfCancel() {
  const { devIdx } = getQaTargets();
  api_MemIf_Cancel(devIdx);
  simState.stepExplain = "Manual Quick Action: MemIf_Cancel(" + devIdx + ").";
  syncConfigToDOM();
  renderAll();
}

function qaMemIfBroadcastStatus() {
  const { devIdx } = getQaTargets();
  const qDev = devIdx === 99 ? 99 : 255;
  const st = api_MemIf_GetStatus(qDev);
  simState.stepExplain = "Manual Quick Action: MemIf_GetStatus(MEMIF_BROADCAST_ID=0xFF) ➔ " + st + ".";
  syncConfigToDOM();
  renderAll();
}

function qaToggleMemIfMode() {
  const nextMode = ecucConfig.ActiveMemIfMode === "MEMIF_MODE_FAST" ? "MEMIF_MODE_SLOW" : "MEMIF_MODE_FAST";
  api_MemIf_SetMode(nextMode);
  simState.stepExplain = "Manual Quick Action: MemIf_SetMode(" + nextMode + ") quảng bá xuống Fee & Ea.";
  syncConfigToDOM();
  renderAll();
}

function onFaultKindChange() {
  const sel = document.getElementById("qaFaultKind");
  const tag = document.getElementById("qaTxtFaultKind");
  if (!sel || !tag) return;
  const map = { FEE_GC: "GC", INCONSISTENT: "INC", HW_FAIL: "HW", DET_DEV: "DET", VER_INFO: "VER" };
  tag.textContent = map[sel.value] || "GC";
}

function qaInjectFaultOrGc() {
  const sel = document.getElementById("qaFaultKind");
  const kind = sel ? sel.value : "FEE_GC";
  const { devIdx, blkHex } = getQaTargets();
  const tDev = devIdx === 1 ? 1 : 0;

  if (kind === "FEE_GC") {
    api_TriggerFeeGarbageCollection();
    simState.stepExplain = "Injected Fee Garbage Collection: Fee ở MEMIF_BUSY_INTERNAL (0x03).";
  } else if (kind === "INCONSISTENT") {
    ecucConfig.InjectBlockInconsistent = true;
    api_MemIf_Read(tDev, blkHex, 0, 16, false);
    for (let i = 0; i < 6 && simState.devices[tDev].status === "MEMIF_BUSY"; i++) {
      if (tDev === 0) api_FeeFls_MainFunction();
      else api_EaEep_MainFunction();
    }
    simState.stepExplain = "Injected Page Tear / CRC Fault ➔ MEMIF_BLOCK_INCONSISTENT (0x04).";
  } else if (kind === "HW_FAIL") {
    ecucConfig.InjectHardwareWriteEraseFail = true;
    api_MemIf_Write(tDev, blkHex, ecucConfig.WritePayloadHex, false);
    for (let i = 0; i < 6 && simState.devices[tDev].status === "MEMIF_BUSY"; i++) {
      if (tDev === 0) api_FeeFls_MainFunction();
      else api_EaEep_MainFunction();
    }
    simState.stepExplain = "Injected Hardware Failure ➔ MEMIF_JOB_FAILED (0x03) + DEM Event.";
  } else if (kind === "DET_DEV") {
    api_MemIf_Read(99, blkHex, 0, 16, false);
    simState.stepExplain = "Injected Invalid DeviceIndex=99 ➔ DET MEMIF_E_PARAM_DEVICE (0x01).";
  } else if (kind === "VER_INFO") {
    api_MemIf_GetVersionInfo(Boolean(ecucConfig.PassNullPointerTest));
    simState.stepExplain = "Gọi MemIf_GetVersionInfo() ➔ ModuleId=22, VendorId=43.";
  }

  syncConfigToDOM();
  renderAll();
}

// -------------------- INTERACTIVE PANEL CLICKS & BIT TOGGLES --------------------

function toggleRoutingCompilationMode() {
  ecucConfig.MemIfNumberOfDevices = Number(ecucConfig.MemIfNumberOfDevices) <= 1 ? "2" : "1";
  syncInitFlagsToDevices();
  const focusIdx = simState.selectedDeviceCard === 1 ? 1 : 0;
  simState.lastCodeSnippet = buildMemIfRoutingCodeSnippet("MemIf_Read", focusIdx, ecucConfig.SelectedLogicalBlock || "0x0004");
  const isMacro = Number(ecucConfig.MemIfNumberOfDevices) <= 1;
  addTrace("Compile Mode Switched",
    isMacro ? "Chuyển sang Macro 1-Device (#define trực tiếp xuống Fee — 0 overhead)." : "Chuyển sang Function Pointer Array (MemIf_*FctPtr[2] cho Fee + Ea).",
    "info");
  syncConfigToDOM();
  renderAll();
}

function selectDeviceCard(idx) {
  simState.selectedDeviceCard = idx;
  if (idx === 0 || idx === 1) {
    ecucConfig.SelectedDeviceIndex = String(idx);
  }
  syncConfigToDOM();
  renderAll();
}

function toggleRegisterBit(regType, mask) {
  snapshotRegBefore();
  if (regType === "A") {
    if (mask === 0x80) {
      toggleRoutingCompilationMode();
      return;
    } else if (mask === 0x40) {
      const nextDev = simState.selectedDeviceCard === 1 ? 0 : 1;
      simState.selectedDeviceCard = nextDev;
      simState.lastDispatch.deviceIdx = nextDev;
      ecucConfig.SelectedDeviceIndex = String(nextDev);
      ecucConfig.SelectedLogicalBlock = nextDev === 1 ? "0x0010" : "0x0004";
      addTrace("Bit 6 ACTV_DEV_1 Toggle", "Đổi nhánh mục tiêu định tuyến sang DeviceIndex = " + nextDev + ".", "info");
    } else if (mask === 0x20) {
      qaToggleMemIfMode();
      return;
    } else if (mask === 0x10) {
      api_MemIf_GetStatus(255);
    } else if (mask === 0x08) {
      if (simState.detFlagActive) {
        simState.detFlagActive = false;
        addTrace("Bit 3 DET_ERR Clear", "Xóa cờ DET tạm thời trên Thanh A.", "ok");
      } else {
        api_MemIf_Read(99, ecucConfig.SelectedLogicalBlock || "0x0004", 0, 16, false);
      }
    } else if (mask === 0x04) {
      ecucConfig.EaDev1Initialized = !ecucConfig.EaDev1Initialized;
      syncInitFlagsToDevices();
      addTrace("Bit 2 GLB_UNINIT Toggle", "EaDev1Initialized = " + ecucConfig.EaDev1Initialized + " -> Broadcast = " + computeBroadcastStatus(), "warn");
    } else if (mask === 0x02) {
      if (simState.devices[0].status === "MEMIF_BUSY_INTERNAL") {
        ecucConfig.ForceFeeGarbageCollection = false;
        simState.devices[0].status = "MEMIF_IDLE";
        simState.devices[0].activeOp = "NONE";
        simState.devices[0].gcProgress = 0;
        simState.broadcastStatus = computeBroadcastStatus();
        addTrace("Bit 1 GLB_BUSY_INT Clear", "Hoàn tất/Dừng giả lập Garbage Collection.", "ok");
      } else {
        api_TriggerFeeGarbageCollection();
      }
    } else if (mask === 0x01) {
      const fIdx = simState.selectedDeviceCard === 1 ? 1 : 0;
      if (simState.devices[fIdx].status === "MEMIF_BUSY") {
        api_MemIf_Cancel(fIdx);
      } else {
        api_MemIf_Read(fIdx, fIdx === 1 ? "0x0010" : "0x0004", 0, 16, false);
      }
    }
  } else if (regType === "B") {
    if (mask === 0x80) {
      if (simState.devices[0].status === "MEMIF_BUSY") api_MemIf_Cancel(0);
      else api_MemIf_Read(0, "0x0004", 0, 32, false);
    } else if (mask === 0x40) {
      if (simState.devices[0].status === "MEMIF_BUSY_INTERNAL") {
        simState.devices[0].status = "MEMIF_IDLE";
        simState.devices[0].activeOp = "NONE";
        ecucConfig.ForceFeeGarbageCollection = false;
        simState.broadcastStatus = computeBroadcastStatus();
      } else {
        api_TriggerFeeGarbageCollection();
      }
    } else if (mask === 0x20) {
      if (simState.devices[1].status === "MEMIF_BUSY") api_MemIf_Cancel(1);
      else api_MemIf_Write(1, "0x0010", ecucConfig.WritePayloadHex, false);
    } else if (mask === 0x10) {
      ecucConfig.FeeImmediateData = !ecucConfig.FeeImmediateData;
      simState.immediateActive = ecucConfig.FeeImmediateData;
      addTrace("Bit 4 IMMED_BLOCK Toggle", "FeeImmediateData = " + ecucConfig.FeeImmediateData, "info");
    } else if (mask === 0x08) {
      ecucConfig.NvMPollingMode = !ecucConfig.NvMPollingMode;
      addTrace("Bit 3 NVM_CBK Toggle", "NvMPollingMode = " + ecucConfig.NvMPollingMode + (ecucConfig.NvMPollingMode ? " (Polling qua MemIf)" : " (Callback Fee/Ea -> NvM)"), "info");
    } else if (mask === 0x04 || mask === 0x02 || mask === 0x01) {
      const fIdx = simState.selectedDeviceCard === 1 ? 1 : 0;
      const dev = simState.devices[fIdx];
      const states = [
        "MEMIF_JOB_OK",
        "MEMIF_JOB_PENDING",
        "MEMIF_JOB_CANCELED",
        "MEMIF_JOB_FAILED",
        "MEMIF_BLOCK_INCONSISTENT",
        "MEMIF_BLOCK_INVALID"
      ];
      const nextIdx = (states.indexOf(dev.jobResult) + 1) % states.length;
      dev.jobResult = states[nextIdx];
      addTrace("Bit " + (mask === 4 ? 2 : mask === 2 ? 1 : 0) + " JobResult Cycle", dev.shortName + " JobResult = " + dev.jobResult, "info");
    }
  }
  syncConfigToDOM();
  renderAll();
}

function selectModule(modId) {
  simState.selectedModuleId = modId;
  switchInspTab(1);
}

// -------------------- ECUC CONFIGURATION SYNC & VALIDATION --------------------

function switchCfgTab(idx) {
  uiState.cfgTab = idx;
  for (let i = 0; i < 6; i++) {
    const btn = document.getElementById("cfgTabBtn" + i);
    const pane = document.getElementById("cfgPane" + i);
    if (btn) btn.classList.toggle("active", i === idx);
    if (pane) pane.classList.toggle("hidden", i !== idx);
  }
}

function syncConfigToDOM() {
  Object.keys(defaultConfig).forEach((key) => {
    const el = document.getElementById("cfg_" + key);
    if (!el) return;
    if (el.type === "checkbox") {
      el.checked = Boolean(ecucConfig[key]);
    } else {
      el.value = String(ecucConfig[key]);
    }
  });

  const qaMode = document.getElementById("qaTxtMode");
  if (qaMode) qaMode.textContent = ecucConfig.ActiveMemIfMode === "MEMIF_MODE_FAST" ? "FAST" : "SLOW";

  const qaDev = document.getElementById("qaDevSelect");
  if (qaDev && qaDev.value !== "99" && qaDev.value !== "255") {
    qaDev.value = String(ecucConfig.SelectedDeviceIndex || "0");
  }

  const qaBlk = document.getElementById("qaBlkSelect");
  if (qaBlk && ecucConfig.SelectedLogicalBlock) {
    qaBlk.value = ecucConfig.SelectedLogicalBlock;
  }

  const btnRoute = document.getElementById("btnToggleRoutingMode");
  if (btnRoute) {
    btnRoute.textContent = Number(ecucConfig.MemIfNumberOfDevices) <= 1
      ? "Chuyển sang 2 Devices (FctPtr Array)"
      : "Chuyển sang 1 Device (Macro Mode)";
  }
}

function onConfigInputChanged(key) {
  const el = document.getElementById("cfg_" + key);
  if (!el) return;
  const defVal = defaultConfig[key];
  if (typeof defVal === "boolean") {
    ecucConfig[key] = Boolean(el.checked);
  } else if (typeof defVal === "number") {
    let v = Number(el.value);
    if (Number.isNaN(v)) v = defVal;
    if (key === "FeeActiveSectorUsagePct") v = Math.max(0, Math.min(100, v));
    ecucConfig[key] = v;
  } else {
    ecucConfig[key] = String(el.value);
  }

  if (key === "FeeDev0Initialized" || key === "EaDev1Initialized") {
    syncInitFlagsToDevices();
  } else if (key === "MemIfNumberOfDevices") {
    const focusIdx = simState.selectedDeviceCard === 1 ? 1 : 0;
    simState.lastCodeSnippet = buildMemIfRoutingCodeSnippet("MemIf_Read", focusIdx, ecucConfig.SelectedLogicalBlock || "0x0004");
    syncInitFlagsToDevices();
  } else if (key === "ActiveMemIfMode") {
    api_MemIf_SetMode(ecucConfig.ActiveMemIfMode);
  } else if (key === "ForceFeeGarbageCollection") {
    if (ecucConfig.ForceFeeGarbageCollection) {
      api_TriggerFeeGarbageCollection();
    } else if (simState.devices[0].status === "MEMIF_BUSY_INTERNAL") {
      simState.devices[0].status = "MEMIF_IDLE";
      simState.devices[0].activeOp = "NONE";
      simState.devices[0].gcProgress = 0;
      simState.broadcastStatus = computeBroadcastStatus();
    }
  } else if (key === "FeeActiveSectorUsagePct") {
    const pct = Number(ecucConfig.FeeActiveSectorUsagePct);
    if (simState.feeFlashLayout.activeSector === 0) simState.feeFlashLayout.sector0UsagePct = pct;
    else simState.feeFlashLayout.sector1UsagePct = pct;
    if (pct >= 90 && !ecucConfig.ForceFeeGarbageCollection) {
      api_TriggerFeeGarbageCollection();
    }
  } else if (key === "SelectedDeviceIndex") {
    simState.selectedDeviceCard = Number(ecucConfig.SelectedDeviceIndex);
  } else if (key === "SelectedLogicalBlock") {
    const blk = LOGICAL_BLOCKS[ecucConfig.SelectedLogicalBlock];
    if (blk) {
      ecucConfig.SelectedDeviceIndex = String(blk.devIdx);
      ecucConfig.MemIfReadLength = blk.size;
      ecucConfig.WritePayloadHex = blk.defaultHex;
      simState.selectedDeviceCard = blk.devIdx;
    }
  } else if (key === "EnableR2311MemAccLayer") {
    addTrace("R23-11 MemAcc Layer " + (ecucConfig.EnableR2311MemAccLayer ? "ON" : "OFF"),
      ecucConfig.EnableR2311MemAccLayer
        ? "Fee & Ea chuyển xuống gọi MemAcc + Unified Mem Driver; lớp MemIf giữ nguyên giao tiếp NvM."
        : "Trở về MCAL Fls & Eep truyền thống.",
      "info");
  }

  syncConfigToDOM();
  renderAll();
}

function renderConfigWarnings() {
  const box = document.getElementById("cfgValidationBox");
  if (!box) return;
  const msgs = [];
  if (!ecucConfig.MemIfDevErrorDetect) {
    msgs.push("⚠️ MemIfDevErrorDetect=FALSE: DET tắt -> DeviceIndex ngoài biên hoặc NULL_PTR không bị chặn!");
  }
  const selBlk = LOGICAL_BLOCKS[ecucConfig.SelectedLogicalBlock];
  if (Number(ecucConfig.MemIfNumberOfDevices) <= 1 && (ecucConfig.SelectedDeviceIndex === "1" || (selBlk && selBlk.devIdx === 1))) {
    msgs.push("⚠️ Macro 1-Device Mode: Mọi lệnh bị #define thẳng xuống Fee (Dev0); Ea (Dev1) bị bỏ qua!");
  }
  if (!ecucConfig.FeeDev0Initialized || !ecucConfig.EaDev1Initialized) {
    msgs.push("⚠️ Có thiết bị chưa Init (MEMIF_UNINIT) -> MemIf_GetStatus(0xFF) trả về MEMIF_UNINIT (Ưu tiên #1).");
  }
  if (ecucConfig.NvMPollingMode) {
    msgs.push("ℹ️ NvMPollingMode=TRUE: NvM thăm dò kết quả qua MemIf_GetStatus/GetJobResult thay vì Callback.");
  }
  if (Number(ecucConfig.FeeActiveSectorUsagePct) >= 90) {
    msgs.push("🔥 Active Sector ≥ 90%: Fee kích hoạt Garbage Collection (MEMIF_BUSY_INTERNAL).");
  }
  if (ecucConfig.EnableR2311MemAccLayer) {
    msgs.push("🆕 AUTOSAR R23-11 MemAcc Layer Bật: Fee/Ea chạy qua MemAcc + Mem Driver thống nhất.");
  }

  if (!msgs.length) {
    box.innerHTML = "";
    return;
  }
  box.innerHTML = `<div class="cfg-warn-banner">${msgs.map((m) => escHtml(m)).join("<br>")}</div>`;
}

// -------------------- MAIN RENDERERS --------------------

function badgeClassForStatus(st) {
  if (st === "MEMIF_UNINIT") return "sb-err";
  if (st === "MEMIF_BUSY" || st === "MEMIF_BUSY_INTERNAL") return "sb-warn";
  return "sb-ok";
}

function pillClassForStatus(st) {
  if (st === "MEMIF_UNINIT") return "pill-err";
  if (st === "MEMIF_BUSY" || st === "MEMIF_BUSY_INTERNAL") return "pill-warn";
  return "pill-ok";
}

function pillClassForJob(jr) {
  if (jr === "MEMIF_JOB_OK") return "pill-ok";
  if (jr === "MEMIF_JOB_PENDING") return "pill-cyan";
  if (jr === "MEMIF_JOB_CANCELED" || jr === "MEMIF_BLOCK_INVALID") return "pill-warn";
  return "pill-err";
}

function renderHeaderAndQuickActions() {
  const scen = getCurrentScenario();
  const maxStep = scen ? scen.steps.length : 0;
  const stepInd = document.getElementById("stepIndicator");
  const prevBtn = document.getElementById("btnPrevStep");
  const nextBtn = document.getElementById("btnNextStep");
  const clkVal = document.getElementById("clockVal");

  if (stepInd) stepInd.textContent = "Bước " + uiState.currentStepIdx + " / " + maxStep;
  if (prevBtn) prevBtn.disabled = uiState.currentStepIdx <= 0;
  if (nextBtn) nextBtn.disabled = uiState.currentStepIdx >= maxStep;
  if (clkVal) clkVal.textContent = simState.clockMs + " ms";

  const bcast = computeBroadcastStatus();
  const d0 = simState.devices[0];
  const d1 = simState.devices[1];
  const isMacro = Number(ecucConfig.MemIfNumberOfDevices) <= 1;

  const bcastEl = document.getElementById("hdrBadgeBroadcast");
  if (bcastEl) {
    bcastEl.className = "state-badge " + badgeClassForStatus(bcast);
    bcastEl.textContent = "Broadcast(0xFF): " + bcast.replace("MEMIF_", "");
  }
  const routeEl = document.getElementById("hdrBadgeRoute");
  if (routeEl) {
    routeEl.className = "state-badge " + (isMacro ? "sb-pur" : "sb-cyan");
    routeEl.textContent = isMacro ? "Macro #define (1 Dev)" : "FctPtr[2] Array";
  }
  const feeEl = document.getElementById("hdrBadgeFee");
  if (feeEl) {
    feeEl.className = "state-badge " + badgeClassForStatus(d0.status);
    feeEl.textContent = "Fee0: " + d0.status.replace("MEMIF_", "");
  }
  const eaEl = document.getElementById("hdrBadgeEa");
  if (eaEl) {
    if (isMacro) {
      eaEl.className = "state-badge sb-deact";
      eaEl.textContent = "Ea1: BYPASSED";
    } else {
      eaEl.className = "state-badge " + badgeClassForStatus(d1.status);
      eaEl.textContent = "Ea1: " + d1.status.replace("MEMIF_", "");
    }
  }
}

function renderPanel1RoutingAndRegs() {
  const isMacro = Number(ecucConfig.MemIfNumberOfDevices) <= 1;
  const dispBox = document.getElementById("routingDispatcherBox");
  const matBox = document.getElementById("deviceMatrixBox");
  const physBox = document.getElementById("physLayoutBox");
  const d = simState.lastDispatch || {};

  if (dispBox) {
    const modeTag = isMacro
      ? '<span class="pill pill-pur">Compile Mode: Macro 1-Device (#define SWS_MemIf_00019 · 0 CPU Overhead)</span>'
      : '<span class="pill pill-cyan">Compile Mode: Function Pointer Array (MemIf_*FctPtr[2] · SWS_MemIf_00020)</span>';
    const detTag = String(d.detCheck || "").startsWith("FAIL")
      ? `<span class="pill pill-err">${escHtml(d.detCheck)}</span>`
      : `<span class="pill pill-ok">DET: ${escHtml(d.detCheck || "PASS")}</span>`;
    dispBox.innerHTML =
      `<div class="dispatch-top">${modeTag}${detTag}</div>` +
      `<div class="dispatch-code mono">` +
      `<strong>API:</strong> ${escHtml(d.api || "--")} &nbsp;|&nbsp; <strong>Route:</strong> ${escHtml(d.routeTarget || "--")}<br>` +
      `<strong>Dispatch:</strong> ${escHtml(d.expr || "--")}` +
      `</div>`;
  }

  if (matBox) {
    const d0 = simState.devices[0];
    const d1 = simState.devices[1];
    const bcast = computeBroadcastStatus();
    const selCard = simState.selectedDeviceCard;

    const card0 = `
      <div class="dev-card ${selCard === 0 ? "selected-dev" : ""}" onclick="selectDeviceCard(0)">
        <div class="dev-card-top">
          <span>Device 0: Fee (Flash)</span>
          <span class="pill ${pillClassForStatus(d0.status)}">${escHtml(d0.status.replace("MEMIF_", ""))}</span>
        </div>
        <div class="dev-card-meta">
          JobResult: <span class="pill ${pillClassForJob(d0.jobResult)}">${escHtml(d0.jobResult.replace("MEMIF_", ""))}</span><br>
          Op: <span class="mono">${escHtml(d0.activeOp)} ${escHtml(d0.activeBlockHex)}</span> (${d0.bytesDone}/${d0.bytesTotal}B) · Mode: <b>${d0.mode === "MEMIF_MODE_FAST" ? "FAST" : "SLOW"}</b>
        </div>
      </div>`;

    const card1 = `
      <div class="dev-card ${selCard === 1 ? "selected-dev" : ""}" onclick="selectDeviceCard(1)">
        <div class="dev-card-top">
          <span>Device 1: Ea (EEPROM)</span>
          <span class="pill ${isMacro ? "pill-mut" : pillClassForStatus(d1.status)}">${isMacro ? "MACRO OFF" : escHtml(d1.status.replace("MEMIF_", ""))}</span>
        </div>
        <div class="dev-card-meta">
          JobResult: <span class="pill ${pillClassForJob(d1.jobResult)}">${escHtml(d1.jobResult.replace("MEMIF_", ""))}</span><br>
          Op: <span class="mono">${escHtml(d1.activeOp)} ${escHtml(d1.activeBlockHex)}</span> (${d1.bytesDone}/${d1.bytesTotal}B) · Mode: <b>${d1.mode === "MEMIF_MODE_FAST" ? "FAST" : "SLOW"}</b>
        </div>
      </div>`;

    const cardBcast = `
      <div class="dev-card ${selCard === 255 ? "selected-dev" : ""}" onclick="selectDeviceCard(255)">
        <div class="dev-card-top">
          <span>Broadcast ID (0xFF)</span>
          <span class="pill ${pillClassForStatus(bcast)}">${escHtml(bcast.replace("MEMIF_", ""))}</span>
        </div>
        <div class="dev-card-meta">
          Ưu tiên: <b>UNINIT &gt; BUSY &gt; BUSY_INT &gt; IDLE</b><br>
          MemIf_GetStatus(0xFF) hợp nhất toàn stack (cấm cho GetJobResult!).
        </div>
      </div>`;

    matBox.innerHTML = card0 + card1 + cardBcast;
  }

  if (physBox) {
    const fl = simState.feeFlashLayout;
    const ea = simState.eaEepromLayout;
    const vpCells = fl.pages.map((p) => {
      let cls = "vp-free";
      if (p.state === "VALID") cls = "vp-valid";
      else if (p.state === "SUPERSEDED") cls = "vp-sup";
      else if (p.state === "INVALID") cls = "vp-inv";
      else if (p.state === "INCONSISTENT") cls = "vp-inc";
      else if (p.state === "IMMEDIATE") cls = "vp-imm";
      return `<span class="vp-cell ${cls}" title="${escHtml(p.note)}">${escHtml(p.vp)}:${escHtml(p.blk)} [${escHtml(p.state)}]</span>`;
    }).join("");

    const eaSlots = ea.slots.map((s) => {
      let cls = "vp-valid";
      if (s.state === "INVALID") cls = "vp-inv";
      else if (s.state === "INCONSISTENT") cls = "vp-inc";
      return `<div class="vp-cell ${cls}" style="margin-top:4px;display:flex;justify-content:space-between;gap:6px">` +
        `<span class="mono"><b>${escHtml(s.blk)}</b> @ ${escHtml(s.offset)} (${s.size}B)</span>` +
        `<span>${escHtml(s.state)}</span></div>`;
    }).join("");

    const activeSecPct = fl.activeSector === 0 ? fl.sector0UsagePct : fl.sector1UsagePct;
    physBox.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;font-weight:800">
        <span>💽 Ánh Xạ Vật Lý: Fee Append-Only Virtual Pages vs Ea Fixed EEPROM Offsets</span>
        <span class="mono" style="color:var(--cyan)">Layer: ${ecucConfig.EnableR2311MemAccLayer ? "MemAcc + Mem (R23-11)" : "MCAL Fls / Eep"}</span>
      </div>
      <div class="phys-grid">
        <div class="phys-card">
          <div style="display:flex;justify-content:space-between;font-size:10.5px;font-weight:700">
            <span>Fee DFlash · Active Sector ${fl.activeSector}</span>
            <span class="mono" style="color:${activeSecPct >= 90 ? "var(--err)" : "var(--ok)"}">Usage: ${activeSecPct}%</span>
          </div>
          <div class="vp-strip">${vpCells}</div>
        </div>
        <div class="phys-card">
          <div style="display:flex;justify-content:space-between;font-size:10.5px;font-weight:700">
            <span>Ea External EEPROM Slots</span>
            <span class="mono" style="color:var(--mut)">VP=${ecucConfig.EaVirtualPageSize}B</span>
          </div>
          ${eaSlots}
        </div>
      </div>`;
  }

  // Dual 8-Bit Registers
  const regA = computeCoreStatusByte();
  const regB = computeDeviceJobByte();
  const prevA = simState.prevRegA === undefined ? regA : simState.prevRegA;
  const prevB = simState.prevRegB === undefined ? regB : simState.prevRegB;

  const hexA = document.getElementById("regAHex");
  const bitsA = document.getElementById("regABits");
  if (hexA) hexA.textContent = fmtHex2(regA) + " (" + fmtBin8(regA) + ")";
  if (bitsA) {
    bitsA.innerHTML = MEMIF_CORE_BITS.map((bm) => {
      const val = (regA & bm.mask) ? 1 : 0;
      const changed = ((regA ^ prevA) & bm.mask) !== 0;
      let cls = "bit-box";
      if (val) cls += bm.tone === "warn" ? " on-warn" : bm.tone === "err" ? " on-err" : bm.tone === "cyan" ? " on-cyan" : " on";
      if (changed) cls += " bit-changed";
      return `<div class="${cls}" title="Click để đảo/thử nghiệm ${escHtml(bm.name)} — ${escHtml(bm.desc)}" onclick="toggleRegisterBit('A', ${bm.mask})">
        <div class="bit-idx">B${bm.bit}</div>
        <div class="bit-val">${val}</div>
        <div class="bit-tag">${escHtml(bm.tag)}</div>
      </div>`;
    }).join("");
  }

  const hexB = document.getElementById("regBHex");
  const bitsB = document.getElementById("regBBits");
  if (hexB) hexB.textContent = fmtHex2(regB) + " (" + fmtBin8(regB) + ")";
  if (bitsB) {
    bitsB.innerHTML = MEMIF_DEV_JOB_BITS.map((bm) => {
      const val = (regB & bm.mask) ? 1 : 0;
      const changed = ((regB ^ prevB) & bm.mask) !== 0;
      let cls = "bit-box";
      if (val) cls += bm.tone === "warn" ? " on-warn" : bm.tone === "err" ? " on-err" : bm.tone === "cyan" ? " on-cyan" : " on";
      if (changed) cls += " bit-changed";
      return `<div class="${cls}" title="Click để đảo/thử nghiệm ${escHtml(bm.name)} — ${escHtml(bm.desc)}" onclick="toggleRegisterBit('B', ${bm.mask})">
        <div class="bit-idx">B${bm.bit}</div>
        <div class="bit-val">${val}</div>
        <div class="bit-tag">${escHtml(bm.tag)}</div>
      </div>`;
    }).join("");
  }
}

function renderPanel2TimersAndStates() {
  const timersEl = document.getElementById("timersGrid");
  const badgeEl = document.getElementById("memifPanel2Badge");
  const stLbl = document.getElementById("smStatusLbl");
  const stDiag = document.getElementById("statusSmDiagram");
  const jrLbl = document.getElementById("smJobResultLbl");
  const jrDiag = document.getElementById("jobResultSmDiagram");

  const d0 = simState.devices[0];
  const d1 = simState.devices[1];
  const stepBytes = ecucConfig.ActiveMemIfMode === "MEMIF_MODE_FAST"
    ? Number(ecucConfig.FlsEepBytesPerCycleFast)
    : Number(ecucConfig.FlsEepBytesPerCycleSlow);

  if (badgeEl) {
    badgeEl.textContent = ecucConfig.ActiveMemIfMode + " (" + stepBytes + "B/tick) | " +
      (ecucConfig.NvMPollingMode ? "Polling: GetStatus/GetJobResult" : "Cbk: " + (simState.nvmState.lastNotification || "Ready"));
  }

  if (timersEl) {
    const p0 = d0.bytesTotal > 0 ? Math.round((d0.bytesDone / d0.bytesTotal) * 100) : 0;
    const p1 = d1.bytesTotal > 0 ? Math.round((d1.bytesDone / d1.bytesTotal) * 100) : 0;
    const secPct = Number(ecucConfig.FeeActiveSectorUsagePct || 0);
    const speedPct = Math.min(100, Math.round((stepBytes / Math.max(1, Number(ecucConfig.FlsEepBytesPerCycleFast))) * 100));

    timersEl.innerHTML = `
      <div class="timer-card">
        <div class="timer-top"><span>Dev0 Fee (${escHtml(d0.activeOp)})</span><span class="mono">${d0.bytesDone}/${d0.bytesTotal}B</span></div>
        <div class="timer-bar"><div class="timer-fill ${d0.status === "MEMIF_BUSY" ? "warn" : "ok"}" style="width:${p0}%"></div></div>
      </div>
      <div class="timer-card">
        <div class="timer-top"><span>Fee GC / Sector</span><span class="mono">${d0.status === "MEMIF_BUSY_INTERNAL" ? "GC " + d0.gcProgress + "%" : secPct + "%"}</span></div>
        <div class="timer-bar"><div class="timer-fill ${secPct >= 90 || d0.status === "MEMIF_BUSY_INTERNAL" ? "err" : "pur"}" style="width:${d0.status === "MEMIF_BUSY_INTERNAL" ? d0.gcProgress : secPct}%"></div></div>
      </div>
      <div class="timer-card">
        <div class="timer-top"><span>Dev1 Ea (${escHtml(d1.activeOp)})</span><span class="mono">${d1.bytesDone}/${d1.bytesTotal}B</span></div>
        <div class="timer-bar"><div class="timer-fill ${d1.status === "MEMIF_BUSY" ? "warn" : "ok"}" style="width:${p1}%"></div></div>
      </div>
      <div class="timer-card">
        <div class="timer-top"><span>Throughput / Tick</span><span class="mono">${stepBytes} B/tick</span></div>
        <div class="timer-bar"><div class="timer-fill" style="width:${speedPct}%"></div></div>
      </div>`;
  }

  const focusIdx = simState.selectedDeviceCard === 1 ? 1 : 0;
  const focusDev = simState.devices[focusIdx];
  const displayStatus = simState.selectedDeviceCard === 255 ? computeBroadcastStatus() : focusDev.status;

  if (stLbl) stLbl.textContent = (simState.selectedDeviceCard === 255 ? "Broadcast: " : focusDev.shortName + ": ") + displayStatus;
  if (stDiag) {
    const statusNodes = [
      { id: "MEMIF_UNINIT", code: "0x00", cls: "active-err", sub: "Chưa gọi Fee_Init()/Ea_Init() — Ưu tiên Broadcast #1" },
      { id: "MEMIF_IDLE", code: "0x01", cls: "active-ok", sub: "Rảnh hoàn toàn — Sẵn sàng nhận lệnh Read/Write mới" },
      { id: "MEMIF_BUSY", code: "0x02", cls: "active-warn", sub: "Đang thực thi lệnh từ NvM — Ưu tiên Broadcast #2" },
      { id: "MEMIF_BUSY_INTERNAL", code: "0x03", cls: "active-pur", sub: "Fee đang chạy ngầm Garbage Collection (GC) — Ưu tiên #3" }
    ];
    stDiag.innerHTML = statusNodes.map((n) => {
      const isAct = displayStatus === n.id;
      return `<div class="sm-node ${isAct ? n.cls : ""}">
        <div class="sm-node-hdr"><span>${escHtml(n.id)}</span><span class="mono">${n.code}</span></div>
        <div class="sm-node-sub">${escHtml(n.sub)}</div>
      </div>`;
    }).join("");
  }

  if (jrLbl) jrLbl.textContent = focusDev.shortName + ": " + focusDev.jobResult;
  if (jrDiag) {
    const jobNodes = [
      { id: "MEMIF_JOB_OK", code: "000b", cls: "active-ok", sub: "Hoàn tất thành công (0x00)" },
      { id: "MEMIF_JOB_PENDING", code: "001b", cls: "active-cyan", sub: "Đang chạy bất đồng bộ (0x01)" },
      { id: "MEMIF_JOB_CANCELED", code: "010b", cls: "active-warn", sub: "Đã hủy qua MemIf_Cancel (0x02)" },
      { id: "MEMIF_JOB_FAILED", code: "011b", cls: "active-err", sub: "Lỗi Flash/EEPROM phần cứng (0x03)" },
      { id: "MEMIF_BLOCK_INCONSISTENT", code: "100b", cls: "active-err", sub: "Rách trang / sai checksum (0x04)" },
      { id: "MEMIF_BLOCK_INVALID", code: "101b", cls: "active-pur", sub: "Block bị Invalidate 0x05" }
    ];
    jrDiag.innerHTML = jobNodes.map((n) => {
      const isAct = focusDev.jobResult === n.id;
      return `<div class="sm-node ${isAct ? n.cls : ""}">
        <div class="sm-node-hdr"><span>${escHtml(n.id)}</span><span class="mono">${n.code}</span></div>
        <div class="sm-node-sub">${escHtml(n.sub)}</div>
      </div>`;
    }).join("");
  }
}

function renderSvgArchitecture() {
  const allModules = [
    "MOD_SWC", "MOD_ECUM", "MOD_RTE", "MOD_NVM", "MOD_DEM",
    "MOD_MEMIF", "MOD_DET", "MOD_FEE", "MOD_EA", "MOD_FLS", "MOD_EEP"
  ];
  allModules.forEach((m) => {
    const el = document.getElementById("node_" + m);
    if (el) el.classList.toggle("selected", simState.selectedModuleId === m);
  });

  const allArrows = [
    "arr_swc_rte", "arr_rte_nvm", "arr_ecum_nvm", "arr_nvm_memif",
    "arr_memif_polling", "arr_memif_det", "arr_memif_fee", "arr_memif_ea",
    "arr_fee_nvm_cbk", "arr_ea_nvm_cbk", "arr_fee_fls", "arr_ea_eep", "arr_drv_dem"
  ];
  const actSet = new Set(simState.activeArrows || []);
  const typeMap = simState.activeArrowTypes || {};
  allArrows.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove("active", "active-cbk", "active-err");
    if (actSet.has(id)) {
      el.classList.add(typeMap[id] || "active");
    }
  });

  const d0 = simState.devices[0];
  const d1 = simState.devices[1];
  const isMacro = Number(ecucConfig.MemIfNumberOfDevices) <= 1;
  const bcast = computeBroadcastStatus();
  const modeStr = ecucConfig.ActiveMemIfMode === "MEMIF_MODE_FAST" ? "FAST" : "SLOW";
  const stepBytes = ecucConfig.ActiveMemIfMode === "MEMIF_MODE_FAST"
    ? ecucConfig.FlsEepBytesPerCycleFast
    : ecucConfig.FlsEepBytesPerCycleSlow;

  const setTxt = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  setTxt("svgSub_MOD_SWC", "Blk " + (ecucConfig.SelectedLogicalBlock || "0x0004") + " | Last: " + (simState.nvmState.lastNotification || "Ready"));
  setTxt("svgSub_MOD_NVM", (ecucConfig.NvMPollingMode ? "Mode: Polling" : "Mode: Callback") + " | " + ecucConfig.NvMBlockManagementType.replace("NVM_BLOCK_", ""));
  setTxt("svgSub_MOD_DEM", "FLS/EEP: " + (simState.dem.flsWriteFail || simState.dem.eepWriteFail ? "FAILED" : "OK") + " | INTEG: " + (simState.dem.nvmIntegrityFail ? "FAIL" : "OK"));
  setTxt("svgSub_MOD_MEMIF1", "Route: " + (isMacro ? "Macro #define (1 Dev)" : "FctPtr[2] Array") + " | Broadcast: " + bcast.replace("MEMIF_", ""));
  setTxt("svgSub_MOD_MEMIF2", "Dev0: Fee (" + d0.status.replace("MEMIF_", "") + ") | Dev1: Ea (" + (isMacro ? "OFF" : d1.status.replace("MEMIF_", "")) + ")");
  setTxt("svgSub_MOD_DET", "Module 22 | Faults: " + simState.detErrors.length + (ecucConfig.MemIfDevErrorDetect ? "" : " (DET OFF)"));
  setTxt("svgSub_MOD_FEE", d0.status.replace("MEMIF_", "") + " | " + d0.jobResult.replace("MEMIF_", "") + " | VP: " + ecucConfig.FeeVirtualPageSize + "B | Sec" + simState.feeFlashLayout.activeSector + ": " + ecucConfig.FeeActiveSectorUsagePct + "%");
  setTxt("svgSub_MOD_EA", (isMacro ? "BYPASSED" : d1.status.replace("MEMIF_", "")) + " | " + d1.jobResult.replace("MEMIF_", "") + " | Offset Map | VP: " + ecucConfig.EaVirtualPageSize + "B");

  if (ecucConfig.EnableR2311MemAccLayer) {
    setTxt("svgTitle_MOD_FLS", "MemAcc + Mem Driver (DFlash R23-11)");
    setTxt("svgSub_MOD_FLS", modeStr + " (" + stepBytes + "B/tick) | Unified MemAcc Area 0");
    setTxt("svgTitle_MOD_EEP", "MemAcc + Mem Driver (Ext EEPROM R23-11)");
    setTxt("svgSub_MOD_EEP", modeStr + " (" + stepBytes + "B/tick) | Unified MemAcc Area 1");
  } else {
    setTxt("svgTitle_MOD_FLS", "Fls Driver (MCAL Internal Data Flash)");
    setTxt("svgSub_MOD_FLS", modeStr + " (" + stepBytes + "B/tick) | DFlash Sectors 0 & 1");
    setTxt("svgTitle_MOD_EEP", "Eep & Spi Driver (MCAL External EEPROM)");
    setTxt("svgSub_MOD_EEP", modeStr + " (" + stepBytes + "B/tick) | SPI Ext EEPROM");
  }
}

function switchInspTab(idx) {
  uiState.inspTab = idx;
  for (let i = 0; i < 4; i++) {
    const btn = document.getElementById("inspTabBtn" + i);
    if (btn) btn.classList.toggle("active", i === idx);
  }
  renderInspector();
}

function describeChangedBits(prevVal, curVal, bitsMeta) {
  const diffs = [];
  bitsMeta.forEach((bm) => {
    const before = (prevVal & bm.mask) ? 1 : 0;
    const after = (curVal & bm.mask) ? 1 : 0;
    if (before !== after) {
      diffs.push(`B${bm.bit} ${bm.tag}: ${before} ➔ ${after}`);
    }
  });
  return diffs.length ? diffs.join(" | ") : "Không có bit thay đổi";
}

function renderInspector() {
  const body = document.getElementById("inspBody");
  if (!body) return;

  if (uiState.inspTab === 0) {
    const scen = getCurrentScenario();
    const d = simState.lastDispatch || {};
    const regA = computeCoreStatusByte();
    const regB = computeDeviceJobByte();
    const prevA = simState.prevRegA === undefined ? regA : simState.prevRegA;
    const prevB = simState.prevRegB === undefined ? regB : simState.prevRegB;

    body.innerHTML = `
      <div class="insp-card">
        <div class="insp-h">📍 Diễn Giải Bước Hiện Tại (${escHtml(scen ? scen.id : "")} · Bước ${uiState.currentStepIdx}/${scen ? scen.steps.length : 0})</div>
        <div style="font-size:11.5px;line-height:1.5;color:var(--txt-soft);white-space:pre-line">${escHtml(simState.stepExplain || "")}</div>
      </div>
      <div class="insp-card">
        <div class="insp-h">🔀 Chi Tiết Định Tuyến MemIf Cuối Cùng</div>
        <div style="font-size:11px;line-height:1.55">
          <b>API:</b> <span class="mono">${escHtml(d.api || "--")}</span><br>
          <b>DeviceIndex / Block:</b> <span class="mono">${escHtml(d.deviceIdx)} / ${escHtml(d.blockHex || "--")}</span><br>
          <b>Đích Route:</b> ${escHtml(d.routeTarget || "--")}<br>
          <b>Kiểm tra DET:</b> <span style="color:${String(d.detCheck || "").startsWith("FAIL") ? "var(--err)" : "var(--ok)"};font-weight:700">${escHtml(d.detCheck || "--")}</span><br>
          <b>Biểu thức thực thi:</b> <span class="mono" style="color:var(--cyan)">${escHtml(d.expr || "--")}</span>
        </div>
      </div>
      <div class="insp-card">
        <div class="insp-h">🔄 Bit Diff (Thanh A &amp; Thanh B)</div>
        <div style="font-size:11px;line-height:1.5">
          <b>Thanh A:</b> <span class="mono">${fmtHex2(prevA)} ➔ ${fmtHex2(regA)}</span><br>
          <span style="color:var(--cyan)">${escHtml(describeChangedBits(prevA, regA, MEMIF_CORE_BITS))}</span><br><br>
          <b>Thanh B:</b> <span class="mono">${fmtHex2(prevB)} ➔ ${fmtHex2(regB)}</span><br>
          <span style="color:var(--warn)">${escHtml(describeChangedBits(prevB, regB, MEMIF_DEV_JOB_BITS))}</span>
        </div>
      </div>
      <div class="insp-card">
        <div class="insp-h">🔔 NvM Notification &amp; DEM Event</div>
        <div style="font-size:11px;line-height:1.5">
          <b>NvM Last Notice:</b> <span class="mono">${escHtml(simState.nvmState.lastNotification)}</span><br>
          <b>Redundant Recovery Count:</b> <span class="mono">${simState.nvmState.redundantRecoveryCount}</span><br>
          <b>DEM HW/Integrity Faults:</b> FLS=${simState.dem.flsWriteFail ? "FAIL" : "OK"} · EEP=${simState.dem.eepWriteFail ? "FAIL" : "OK"} · INTEG=${simState.dem.nvmIntegrityFail ? "FAIL" : "OK"}
        </div>
      </div>`;
  } else if (uiState.inspTab === 1) {
    const keys = Object.keys(MODULES_INFO);
    const curId = MODULES_INFO[simState.selectedModuleId] ? simState.selectedModuleId : "MOD_MEMIF";
    const info = MODULES_INFO[curId];
    const pills = keys.map((k) => {
      const lbl = k.replace("MOD_", "");
      return `<button class="mod-pill ${k === curId ? "active" : ""}" onclick="selectModule('${k}')">${escHtml(lbl)}</button>`;
    }).join("");

    body.innerHTML = `
      <div class="mod-list">${pills}</div>
      <div class="insp-card">
        <div class="insp-h">🧩 ${escHtml(info.title)}</div>
        <div style="font-size:10.5px;color:var(--cyan);font-weight:700;margin-bottom:6px">${escHtml(info.layer)} · ${escHtml(info.sws)}</div>
        <div style="font-size:11.5px;line-height:1.55">
          <p><strong>📥 Input lấy từ đâu:</strong><br>${escHtml(info.inputs)}</p>
          <p style="margin-top:6px"><strong>⚙️ Xử lý nội bộ:</strong><br><span style="white-space:pre-line">${escHtml(info.processing)}</span></p>
          <p style="margin-top:6px"><strong>📤 Output route đi đâu:</strong><br>${escHtml(info.outputs)}</p>
        </div>
      </div>`;
  } else if (uiState.inspTab === 2) {
    const isMacro = Number(ecucConfig.MemIfNumberOfDevices) <= 1;
    body.innerHTML = `
      <div class="insp-card">
        <div class="insp-h">📄 Code C Tiền Xử Lý / Thực Thi Đang Chạy</div>
        <pre class="code-block mono">${escHtml(simState.lastCodeSnippet || "")}</pre>
      </div>
      <div class="insp-card">
        <div class="insp-h">📚 Giải Thích Cấu Hình Hiện Tại</div>
        <div style="font-size:11px;line-height:1.5;color:var(--txt-soft)">
          ${isMacro
            ? "<b>MemIfNumberOfDevices == 1:</b> MemIf hoàn toàn biến mất thành Macro tiền xử lý (Zero Overhead). Không có bảng con trỏ hàm nào trong ROM/RAM."
            : "<b>MemIfNumberOfDevices == 2:</b> MemIf biên dịch mảng con trỏ hàm hằng số <code>MemIf_*FctPtr[2]</code> trong <code>MemIf_Cfg.c</code> để định tuyến tại Runtime theo <code>DeviceIndex</code>."}<br><br>
          <i>Mở hộp thoại "📦 Xuất ARXML / Cfg / C" ở thanh trên cùng để tải toàn bộ <code>MemIf_Cfg.h</code>, <code>MemIf_Cfg.c</code> và <code>MemIf.arxml</code>.</i>
        </div>
      </div>`;
  } else {
    const detHtml = simState.detErrors.length
      ? `<div class="insp-card"><div class="insp-h">🚨 Lỗi DET Đã Bắt (${simState.detErrors.length})</div>` +
        simState.detErrors.map((e) => `<div class="trace-item err"><b>[${e.t}ms] ${escHtml(e.errorId)}</b> (Mod ${e.moduleId}, Api ${escHtml(e.apiId)})<br>${escHtml(e.detail)}</div>`).join("") +
        `</div>`
      : "";
    const traceHtml = (simState.apiTrace || []).map((tr) =>
      `<div class="trace-item ${escHtml(tr.level || "info")}">
        <div style="display:flex;justify-content:space-between;font-weight:800">
          <span class="mono">${escHtml(tr.api)}</span>
          <span class="mono" style="color:var(--mut)">${tr.t} ms</span>
        </div>
        <div style="color:var(--txt-soft);margin-top:2px">${escHtml(tr.detail)}</div>
      </div>`
    ).join("");
    body.innerHTML = detHtml + `<div class="insp-card"><div class="insp-h">📜 Lịch Sử Gọi API &amp; Notification Trace</div>${traceHtml || "<div style='color:var(--mut);font-size:11px'>Chưa có sự kiện nào.</div>"}</div>`;
  }
}

function renderAll() {
  renderHeaderAndQuickActions();
  renderConfigWarnings();
  renderPanel1RoutingAndRegs();
  renderPanel2TimersAndStates();
  renderSvgArchitecture();
  renderInspector();
}

// -------------------- VIEW SWITCH, THEME & >1S TOOLTIP --------------------

function switchMainView(v) {
  uiState.mainView = v;
  const viewSim = document.getElementById("viewSim");
  const viewHb = document.getElementById("viewHb");
  const btnSim = document.getElementById("btnViewSim");
  const btnHb = document.getElementById("btnViewHb");
  if (viewSim) viewSim.classList.toggle("hidden", v !== "sim");
  if (viewHb) viewHb.classList.toggle("hidden", v !== "hb");
  if (btnSim) btnSim.classList.toggle("active", v === "sim");
  if (btnHb) btnHb.classList.toggle("active", v === "hb");
  hideCfgTooltip();
  if (v === "hb" && typeof renderCurrentHandbookView === "function") {
    renderCurrentHandbookView();
  }
}

function toggleTheme() {
  uiState.theme = uiState.theme === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", uiState.theme);
  const btn = document.getElementById("btnTheme");
  if (btn) btn.textContent = uiState.theme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode";
}

let cfgTooltipTimer = null;

function hideCfgTooltip() {
  if (cfgTooltipTimer) {
    clearTimeout(cfgTooltipTimer);
    cfgTooltipTimer = null;
  }
  const pop = document.getElementById("cfgTooltipPopup");
  if (pop) pop.classList.remove("show");
}

function showCfgTooltipForRow(rowEl) {
  const key = rowEl ? rowEl.getAttribute("data-cfg-key") : null;
  const pop = document.getElementById("cfgTooltipPopup");
  const meta = key ? configTooltipData[key] : null;
  if (!pop || !meta) return;

  pop.innerHTML = `
    <div class="tt-hdr">
      <div class="tt-title mono">${escHtml(meta.title)}</div>
      <div class="tt-meta mono">${escHtml(meta.sws)}</div>
    </div>
    <div class="tt-path mono">${escHtml(meta.ecucPath)}</div>
    <div class="tt-grid">
      <div class="tt-box"><b>Range / Type:</b><br><span class="mono">${escHtml(meta.range)}</span></div>
      <div class="tt-box"><b>Typical Value:</b><br><span class="mono">${escHtml(meta.typical || "--")}</span></div>
    </div>
    <div class="tt-sec"><b>Vai trò:</b> ${escHtml(meta.role)}</div>
    <div class="tt-sec"><b>Cơ chế MemIf:</b> ${escHtml(meta.mechanism)}</div>
    <div class="tt-sec" style="margin-bottom:0"><b>Tác động mô phỏng:</b> ${escHtml(meta.scenarioImpact)}</div>`;

  pop.classList.add("show");
  const r = rowEl.getBoundingClientRect();
  const popW = pop.offsetWidth || 440;
  const popH = pop.offsetHeight || 240;
  let px = r.right + 12;
  if (px + popW > window.innerWidth - 12) {
    px = Math.max(12, r.left - popW - 12);
  }
  let py = r.top - 10;
  if (py + popH > window.innerHeight - 12) {
    py = Math.max(12, window.innerHeight - popH - 12);
  }
  if (py < 12) py = 12;
  pop.style.left = px + "px";
  pop.style.top = py + "px";
}

function initTooltipHandlers() {
  const rows = document.querySelectorAll(".cfg-row[data-cfg-key]");
  rows.forEach((row) => {
    row.addEventListener("mouseenter", () => {
      if (cfgTooltipTimer) clearTimeout(cfgTooltipTimer);
      cfgTooltipTimer = setTimeout(() => showCfgTooltipForRow(row), 1000);
    });
    row.addEventListener("mouseleave", () => {
      hideCfgTooltip();
    });
    const infoIcon = row.querySelector(".cfg-i");
    if (infoIcon) {
      infoIcon.addEventListener("click", (evt) => {
        evt.preventDefault();
        evt.stopPropagation();
        if (cfgTooltipTimer) clearTimeout(cfgTooltipTimer);
        showCfgTooltipForRow(row);
      });
    }
  });
}

// -------------------- EXPORT MODAL & STANDALONE DOWNLOAD --------------------

function getExportContentByTab(tabIdx) {
  if (tabIdx === 0) return generateMemIfArxml();
  if (tabIdx === 1) return generateMemIfCfgH();
  if (tabIdx === 2) return generateMemIfCfgC();
  return JSON.stringify({
    autosarRelease: "R23-11",
    module: "MemIf",
    ecucConfig: ecucConfig,
    runtimeSnapshot: {
      clockMs: simState.clockMs,
      broadcastStatus: computeBroadcastStatus(),
      coreStatusByte: fmtHex2(computeCoreStatusByte()),
      deviceJobByte: fmtHex2(computeDeviceJobByte()),
      devices: simState.devices
    }
  }, null, 2);
}

function getExportFilenameByTab(tabIdx) {
  if (tabIdx === 0) return "MemIf_EcucValues.arxml";
  if (tabIdx === 1) return "MemIf_Cfg.h";
  if (tabIdx === 2) return "MemIf_Cfg.c";
  return "MemIf_Config.json";
}

function openExportModal() {
  const modal = document.getElementById("exportModal");
  if (!modal) return;
  modal.classList.remove("hidden");
  switchExportTab(uiState.exportTab || 0);
}

function closeExportModal() {
  const modal = document.getElementById("exportModal");
  if (modal) modal.classList.add("hidden");
}

function onExportModalBackdrop(evt) {
  if (evt && evt.target && evt.target.id === "exportModal") {
    closeExportModal();
  }
}

function switchExportTab(idx) {
  uiState.exportTab = idx;
  for (let i = 0; i < 4; i++) {
    const btn = document.getElementById("expTab" + i);
    if (btn) {
      btn.classList.toggle("btn-pri", i === idx);
    }
  }
  const area = document.getElementById("exportCodeArea");
  if (area) area.textContent = getExportContentByTab(idx);
}

function copyExportCode() {
  const text = getExportContentByTab(uiState.exportTab);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => {});
  }
}

function triggerFileDownload(filename, content, mime) {
  const blob = new Blob([content], { type: mime || "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

function downloadExportCode() {
  triggerFileDownload(
    getExportFilenameByTab(uiState.exportTab),
    getExportContentByTab(uiState.exportTab),
    "text/plain;charset=utf-8"
  );
}

function downloadStandaloneHTML() {
  hideCfgTooltip();
  closeExportModal();
  const htmlContent = "<!DOCTYPE html>\n" + document.documentElement.outerHTML;
  triggerFileDownload("AUTOSAR_MemIf.html", htmlContent, "text/html;charset=utf-8");
}
