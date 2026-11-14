// ================= PART 5: UI RENDERERS, SCENARIO STEPPER, TOOLTIP (>1S) & EXPORTS =================

let currentScenarioIdx = 0;
let currentStepIdx = 0;
let scenarioSnapshots = [];
let autoPlayTimer = null;
let autoClockTimer = null;
let currentInspTab = 0;
let currentCfgTab = 0;
let currentExportTab = 0;
let tooltipHoverTimer = null;

function escapeHtmlSafe(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// -------------------- SCENARIO STEPPER & SNAPSHOTS --------------------

function captureScenarioSnapshot() {
  return {
    ecucConfig: JSON.parse(JSON.stringify(ecucConfig)),
    simState: JSON.parse(JSON.stringify(simState))
  };
}

function restoreScenarioSnapshot(snap) {
  if (!snap) return;
  ecucConfig = JSON.parse(JSON.stringify(snap.ecucConfig));
  simState = JSON.parse(JSON.stringify(snap.simState));
  syncConfigToDOM();
}

function loadScenario(scenIdx) {
  stopAutoPlay();
  currentScenarioIdx = Math.max(0, Math.min(SCENARIOS.length - 1, scenIdx));
  const sc = SCENARIOS[currentScenarioIdx];
  document.getElementById("scenSelect").value = sc.id;
  sc.setup();
  currentStepIdx = 0;
  scenarioSnapshots = [captureScenarioSnapshot()];
  simState.stepExplain = sc.summary + " (" + simState.stepExplain + ")";
  renderAll();
}

function onScenarioSelectChange() {
  const id = document.getElementById("scenSelect").value;
  const idx = SCENARIOS.findIndex((s) => s.id === id);
  if (idx >= 0) loadScenario(idx);
}

function resetCurrentScenario() {
  loadScenario(currentScenarioIdx);
}

function nextScenarioStep() {
  const sc = SCENARIOS[currentScenarioIdx];
  if (!sc || currentStepIdx >= sc.steps.length) {
    stopAutoPlay();
    return;
  }
  const stepObj = sc.steps[currentStepIdx];
  simState.activeArrows = [];
  stepObj.exec();
  currentStepIdx += 1;
  simState.stepExplain = "Bước " + currentStepIdx + "/" + sc.steps.length + " — " + stepObj.title + ": " + stepObj.desc;
  scenarioSnapshots[currentStepIdx] = captureScenarioSnapshot();
  renderAll();
}

function prevScenarioStep() {
  stopAutoPlay();
  if (currentStepIdx <= 0) return;
  currentStepIdx -= 1;
  if (scenarioSnapshots[currentStepIdx]) {
    restoreScenarioSnapshot(scenarioSnapshots[currentStepIdx]);
  }
  renderAll();
}

function stopAutoPlay() {
  if (autoPlayTimer) {
    clearInterval(autoPlayTimer);
    autoPlayTimer = null;
  }
  const btn = document.getElementById("btnAutoPlay");
  if (btn) btn.textContent = "▶ Tự Động Kịch Bản";
}

function toggleScenarioAutoPlay() {
  if (autoPlayTimer) {
    stopAutoPlay();
    return;
  }
  const btn = document.getElementById("btnAutoPlay");
  if (btn) btn.textContent = "⏸ Dừng Tự Động";
  autoPlayTimer = setInterval(() => {
    const sc = SCENARIOS[currentScenarioIdx];
    if (currentStepIdx >= sc.steps.length) {
      stopAutoPlay();
    } else {
      nextScenarioStep();
    }
  }, 1500);
}

function toggleAutoClock() {
  const btn = document.getElementById("btnAutoClock");
  if (autoClockTimer) {
    clearInterval(autoClockTimer);
    autoClockTimer = null;
    if (btn) btn.textContent = "⏱ Auto Clock";
    return;
  }
  if (btn) btn.textContent = "⏹ Stop Clock";
  autoClockTimer = setInterval(() => {
    stepClockTick(Number(ecucConfig.EcuMMainFunctionPeriod) || 10);
  }, 450);
}

function runWhatIf(idx) {
  const sc = SCENARIOS[currentScenarioIdx];
  const wf = sc && sc.whatIfs && sc.whatIfs[idx];
  if (!wf) return;
  simState.activeArrows = [];
  wf.run();
  simState.stepExplain = "🧪 Thử Nghiệm Nhanh (" + wf.label + ") — Hãy quan sát sự thay đổi nguồn wakeup, thanh ghi bit và pha EcuM!";
  renderAll();
}

// -------------------- QUICK ACTIONS --------------------

function qaTriggerWakeup() {
  const mask = parseInt(document.getElementById("qaWakeupSrcSelect").value || "0x20", 16);
  simState.activeArrows = [];
  api_EcuM_SetWakeupEvent(mask);
  syncConfigToDOM();
  simState.stepExplain = "Quick Action: Gọi EcuM_SetWakeupEvent(" + fmtHex2(mask) + ").";
  renderAll();
}

function qaValidatePending() {
  simState.activeArrows = [];
  const mask = simState.pendingMask || parseInt(document.getElementById("qaWakeupSrcSelect").value || "0x20", 16);
  api_EcuM_ValidateWakeupEvent(mask);
  syncConfigToDOM();
  simState.stepExplain = "Quick Action: Gọi EcuM_ValidateWakeupEvent(" + fmtHex2(mask) + ").";
  renderAll();
}

function qaToggleUserRun() {
  simState.activeArrows = [];
  if (simState.user0RunReq) api_EcuM_ReleaseRUN(0);
  else api_EcuM_RequestRUN(0);
  syncConfigToDOM();
  simState.stepExplain = "Quick Action: SWC User 0 gọi " + (simState.user0RunReq ? "EcuM_RequestRUN(0)" : "EcuM_ReleaseRUN(0)") + ".";
  renderAll();
}

function qaTogglePostRun() {
  simState.activeArrows = [];
  if (simState.user1PostRunReq) api_EcuM_ReleasePOST_RUN(1);
  else api_EcuM_RequestPOST_RUN(1);
  syncConfigToDOM();
  simState.stepExplain = "Quick Action: User 1 gọi " + (simState.user1PostRunReq ? "EcuM_RequestPOST_RUN(1)" : "EcuM_ReleasePOST_RUN(1)") + ".";
  renderAll();
}

function qaCallGoDown() {
  simState.activeArrows = [];
  api_EcuM_GoDownHaltPoll(0);
  syncConfigToDOM();
  simState.stepExplain = "Quick Action: Gọi EcuM_GoDownHaltPoll(0) theo Target = " + simState.shutdownTarget + ".";
  renderAll();
}

function qaEnterSleepDirect() {
  simState.activeArrows = [];
  api_EcuM_ClearWakeupEvent(0xFF);
  api_EcuM_SelectShutdownTarget("ECUM_STATE_SLEEP", Number(ecucConfig.EcuMSleepModeId));
  api_EcuM_GoDownHaltPoll(0);
  syncConfigToDOM();
  simState.stepExplain = "Quick Action: Đưa ECU vào chế độ ngủ " + (ecucConfig.EcuMSleepModeSuspend ? "GoHalt" : "GoPoll") + ".";
  renderAll();
}

function qaSetAlarmClock() {
  simState.activeArrows = [];
  if (simState.alarmClockActive) {
    api_EcuM_AbortWakeupAlarm(0);
    simState.stepExplain = "Quick Action: Hủy hẹn giờ EcuM_AbortWakeupAlarm(0).";
  } else {
    api_EcuM_SetRelAlarmClock(0, ecucConfig.EcuMAlarmClockTimeOut);
    simState.stepExplain = "Quick Action: Đặt EcuM_SetRelAlarmClock(0, " + ecucConfig.EcuMAlarmClockTimeOut + "ms).";
  }
  syncConfigToDOM();
  renderAll();
}

function qaColdReset() {
  simState.activeArrows = [];
  api_EcuM_StartPreOS(true);
  syncConfigToDOM();
  simState.stepExplain = "Quick Action: Thực thi lại Cold Reset (EcuM_Init -> StartOS -> EcuM_StartupTwo).";
  renderAll();
}

// -------------------- INTERACTIVE BIT CLICKS --------------------

function toggleWakeupSourceCell(rowKind, mask) {
  simState.activeArrows = [];
  if (rowKind === "PENDING") {
    if ((simState.pendingMask & mask) !== 0) api_EcuM_ValidateWakeupEvent(mask);
    else api_EcuM_SetWakeupEvent(mask);
  } else if (rowKind === "VALIDATED") {
    if ((simState.validatedMask & mask) !== 0) api_EcuM_ClearWakeupEvent(mask);
    else {
      if ((simState.pendingMask & mask) !== 0) api_EcuM_ValidateWakeupEvent(mask);
      else {
        api_EcuM_SetWakeupEvent(mask);
        api_EcuM_ValidateWakeupEvent(mask);
      }
    }
  } else if (rowKind === "EXPIRED") {
    api_EcuM_ClearWakeupEvent(mask);
  } else if (rowKind === "MASK") {
    const nextMask = simState.enabledSleepMask ^ mask;
    simState.enabledSleepMask = nextMask;
    ecucConfig.EcuMSleepModeWakeupSourceMask = fmtHex2(nextMask);
    syncConfigToDOM();
  }
  renderAll();
}

function toggleRegisterBit(regType, mask) {
  simState.activeArrows = [];
  if (regType === "A") {
    if (mask === 0x80) {
      ecucConfig.EcuMInitialized = !simState.initialized;
      simState.initialized = ecucConfig.EcuMInitialized;
      syncConfigToDOM();
      recomputeRegisters();
    } else if (mask === 0x10) {
      qaToggleUserRun();
      return;
    } else if (mask === 0x08) {
      qaTogglePostRun();
      return;
    } else if (mask === 0x04) {
      qaCallGoDown();
      return;
    } else if (mask === 0x02) {
      if (simState.majorPhase === "SLEEP") api_EcuM_SetWakeupEvent(0x80);
      else qaEnterSleepDirect();
      return;
    }
  } else if (regType === "B") {
    if (mask === 0x80) {
      api_EcuM_SetWakeupEvent(0x20);
    } else if (mask === 0x20) {
      if (simState.pendingMask !== 0) api_EcuM_ValidateWakeupEvent(simState.pendingMask);
      else api_EcuM_ClearWakeupEvent(0xFF);
    } else if (mask === 0x10) {
      api_EcuM_ClearWakeupEvent(simState.expiredMask || 0xFF);
    } else if (mask === 0x04) {
      qaSetAlarmClock();
      return;
    } else if (mask === 0x02 && ecucConfig.EcuMMultiCoreSupport) {
      ecucConfig.SlaveCore1ReadyForSleep = !ecucConfig.SlaveCore1ReadyForSleep;
      syncConfigToDOM();
      onConfigInputChanged("SlaveCore1ReadyForSleep");
      return;
    }
  }
  renderAll();
}

// -------------------- RENDER SUB-COMPONENTS --------------------

function renderHeaderAndQuickActions() {
  const sc = SCENARIOS[currentScenarioIdx];
  document.getElementById("stepIndicator").textContent = "Bước " + currentStepIdx + " / " + sc.steps.length;
  document.getElementById("btnPrevStep").disabled = (currentStepIdx <= 0);
  document.getElementById("btnNextStep").disabled = (currentStepIdx >= sc.steps.length);
  document.getElementById("clockVal").textContent = simState.clockMs + " ms";

  const bPhase = document.getElementById("hdrBadgePhase");
  bPhase.textContent = "Phase: " + simState.subState;
  let phaseCls = "sb-run";
  if (simState.majorPhase === "STARTUP") phaseCls = "sb-start";
  else if (simState.majorPhase === "SLEEP") phaseCls = "sb-sleep";
  else if (simState.majorPhase === "SHUTDOWN") phaseCls = "sb-post";
  else if (simState.majorPhase === "ERROR") phaseCls = "sb-err";
  else if (simState.subState === "ECUM_STATE_APP_POST_RUN" || simState.subState === "ECUM_STATE_PREP_SHUTDOWN") phaseCls = "sb-post";
  bPhase.className = "state-badge " + phaseCls;

  const bTgt = document.getElementById("hdrBadgeTarget");
  const tgtShort = simState.shutdownTarget.replace("ECUM_STATE_", "");
  bTgt.textContent = "Target: " + tgtShort + (tgtShort === "SLEEP" ? (ecucConfig.EcuMSleepModeSuspend ? " (Halt)" : " (Poll)") : "");
  bTgt.className = "state-badge " + (tgtShort === "SLEEP" ? "sb-sleep" : (tgtShort === "RESET" ? "sb-post" : "sb-off"));

  const bBoot = document.getElementById("hdrBadgeBoot");
  bBoot.textContent = "Boot: " + simState.bootTarget.replace("ECUM_BOOT_TARGET_", "");
  bBoot.className = "state-badge " + (simState.bootTarget === "ECUM_BOOT_TARGET_APP" ? "sb-off" : "sb-post");

  const bFault = document.getElementById("hdrBadgeFault");
  const hasErr = simState.detFaults.length > 0 || !simState.ramHashValid || simState.configHashMismatch;
  bFault.classList.toggle("hidden", !hasErr);
  if (hasErr) {
    bFault.textContent = simState.configHashMismatch ? "HASH MISMATCH" : (!simState.ramHashValid ? "RAM HASH FAIL" : "DET FAULT (" + simState.detFaults.length + ")");
  }

  // Quick Action Visuals
  document.getElementById("qaTxtPending").textContent = fmtHex2(simState.pendingMask);
  document.getElementById("qaBtnValidate").classList.toggle("qa-active", simState.pendingMask !== 0);
  document.getElementById("qaTxtRunReq").textContent = simState.user0RunReq ? "HELD" : "OFF";
  document.getElementById("qaBtnRunReq").classList.toggle("qa-active", simState.user0RunReq);
  document.getElementById("qaTxtPostRun").textContent = simState.user1PostRunReq ? "HELD" : "OFF";
  document.getElementById("qaBtnPostRun").classList.toggle("qa-active", simState.user1PostRunReq);
  document.getElementById("qaTxtTarget").textContent = tgtShort;
  document.getElementById("qaBtnGoDown").classList.toggle("qa-active", simState.goDownActive);
  document.getElementById("qaTxtSleepMode").textContent = ecucConfig.EcuMSleepModeSuspend ? "HALT" : "POLL";
  document.getElementById("qaBtnSleepNow").classList.toggle("qa-active", simState.majorPhase === "SLEEP");
  document.getElementById("qaTxtAlarm").textContent = simState.alarmClockActive ? (simState.alarmClockLeftMs + "ms") : "OFF";
  document.getElementById("qaBtnAlarm").classList.toggle("qa-active", simState.alarmClockActive);

  // Scenario Summary & What-If
  document.getElementById("scenIdBadge").textContent = sc.id + " (" + sc.group + ")";
  document.getElementById("scenSummaryBox").textContent = sc.summary;
  document.getElementById("whatIfContainer").innerHTML = sc.whatIfs.map((w, i) =>
    "<button class=\"whatif-btn\" onclick=\"runWhatIf(" + i + ")\">" + escapeHtmlSafe(w.label) + "</button>"
  ).join("");

  // Validation Box
  const alerts = validateConfigRules();
  document.getElementById("cfgValidationBox").innerHTML = alerts.map((a) =>
    "<div class=\"cfg-alert " + (a.err ? "err" : "") + "\">" + (a.err ? "❌ " : "⚠️ ") + escapeHtmlSafe(a.msg) + "</div>"
  ).join("");
}

function renderWakeupAndTargetMatrix() {
  const tgtShort = simState.shutdownTarget.replace("ECUM_STATE_", "");
  const modeStr = tgtShort === "SLEEP" ? (ecucConfig.EcuMSleepModeSuspend ? "Mode 0: Halt" : "Mode 1: Poll") : (tgtShort === "RESET" ? simState.resetModeId : "SwitchOff");

  const cards = [
    "<div class=\"target-card " + (tgtShort === "SLEEP" ? "active-pur" : "active-warn") + "\">" +
      "<div class=\"target-top\"><span>🎯 SHUTDOWN TARGET</span><span class=\"mono\">" + tgtShort + "</span></div>" +
      "<div class=\"target-sub\">Mode: <b class=\"mono\">" + escapeHtmlSafe(modeStr) + "</b><br/>Cause: <span class=\"mono\">" + simState.shutdownCause.replace("ECUM_CAUSE_", "") + "</span></div>" +
    "</div>",
    "<div class=\"target-card " + (simState.bootTarget !== "ECUM_BOOT_TARGET_APP" ? "active-warn" : "") + "\">" +
      "<div class=\"target-top\"><span>🚀 BOOT TARGET</span><span class=\"mono\">No-Init RAM</span></div>" +
      "<div class=\"target-sub\">Next Boot: <b class=\"mono\">" + simState.bootTarget.replace("ECUM_BOOT_TARGET_", "") + "</b><br/>Last Shut: <span class=\"mono\">" + simState.lastShutdownTarget.replace("ECUM_STATE_", "") + "</span></div>" +
    "</div>",
    "<div class=\"target-card " + (simState.user0RunReq ? "active-run" : (simState.user1PostRunReq ? "active-warn" : "")) + "\">" +
      "<div class=\"target-top\"><span>🏃 RUN / POST_RUN</span><span class=\"mono\">Users</span></div>" +
      "<div class=\"target-sub\">U0 RUN: <b>" + (simState.user0RunReq ? "HELD" : "IDLE") + "</b> · U1 POST: <b>" + (simState.user1PostRunReq ? "HELD" : "IDLE") + "</b><br/>RunMin: <span class=\"mono\">" + simState.runMinLeftMs + " ms</span></div>" +
    "</div>",
    "<div class=\"target-card active-pri\">" +
      "<div class=\"target-top\"><span>🏛️ ACTIVE PHASE</span><span class=\"mono\">" + simState.majorPhase + "</span></div>" +
      "<div class=\"target-sub\">State: <b class=\"mono\" style=\"color:var(--pri)\">" + simState.subState + "</b><br/>MCU: <span class=\"mono\">" + simState.mcuMode + "</span></div>" +
    "</div>"
  ];
  document.getElementById("targetMatrixBox").innerHTML = cards.join("");

  document.getElementById("wkVectorSummary").textContent =
    "Pending: " + fmtHex2(simState.pendingMask) +
    " | Validated: " + fmtHex2(simState.validatedMask) +
    " | Expired: " + fmtHex2(simState.expiredMask);

  let html = "<div class=\"wk-ghdr\" style=\"text-align:left\">Wakeup Register</div>";
  for (let i = 7; i >= 0; i--) {
    const src = WAKEUP_SOURCES[i];
    const tmo = getSourceValidationTimeout(src.mask);
    html += "<div class=\"wk-ghdr\" title=\"" + escapeHtmlSafe(src.fullName + " (" + tmo + "ms): " + src.desc) + "\">b" + src.bit + "<br>" + src.shortLbl + "</div>";
  }
  html += "<div class=\"wk-ghdr\" style=\"text-align:right\">Hex</div>";

  const rows = [
    { key: "PENDING",   label: "PendingWakeupEvents",   val: simState.pendingMask,      cls: "pend-on", click: true },
    { key: "VALIDATED", label: "ValidatedWakeupEvents", val: simState.validatedMask,    cls: "val-on",  click: true },
    { key: "EXPIRED",   label: "ExpiredWakeupEvents",   val: simState.expiredMask,      cls: "exp-on",  click: true },
    { key: "MASK",      label: "SleepWakeupMask",       val: simState.enabledSleepMask, cls: "mask-on", click: true }
  ];

  rows.forEach((r) => {
    html += "<div class=\"wk-rlbl\">" + r.label + "</div>";
    for (let i = 7; i >= 0; i--) {
      const src = WAKEUP_SOURCES[i];
      const bitOn = (r.val & src.mask) !== 0;
      const cls = "wk-cell" + (bitOn ? " " + r.cls : "") + (r.click ? "" : " locked");
      const onclickAttr = r.click ? " onclick=\"toggleWakeupSourceCell('" + r.key + "', " + src.mask + ")\"" : "";
      html += "<div class=\"" + cls + "\" title=\"Click để thao tác " + src.fullName + "\"" + onclickAttr + ">" + (bitOn ? "1" : "0") + "</div>";
    }
    html += "<div class=\"wk-hex mono\">" + fmtHex2(r.val) + "</div>";
  });

  document.getElementById("wkVectorGrid").innerHTML = html;
}

function render8BitRegisters() {
  const renderReg = (hexElId, bitsElId, byteVal, prevVal, defs, regType) => {
    document.getElementById(hexElId).textContent = fmtHex2(byteVal);
    document.getElementById(bitsElId).innerHTML = defs.map((d) => {
      const on = (byteVal & d.mask) !== 0;
      const chg = ((byteVal ^ prevVal) & d.mask) !== 0;
      const cls = "bit-box" + (on ? " on" : "") + (d.tone ? " " + d.tone + "-bit" : "") + (chg ? " chg" : "");
      return "<div class=\"" + cls + "\" title=\"" + escapeHtmlSafe(d.name + ": " + d.desc) + "\" onclick=\"toggleRegisterBit('" + regType + "', " + d.mask + ")\">" +
        "<div class=\"bit-pos\">b" + d.bit + "</div>" +
        "<div class=\"bit-val mono\">" + (on ? "1" : "0") + "</div>" +
        "<div class=\"bit-tag\">" + d.tag + "</div>" +
      "</div>";
    }).join("");
  };

  renderReg("regAHex", "regABits", simState.regAByte, simState.prevRegAByte, ECUM_PHASE_BITS, "A");
  renderReg("regBHex", "regBBits", simState.regBByte, simState.prevRegBByte, ECUM_WKUP_BITS, "B");
}

function renderTimers() {
  const activeValTimers = Object.values(simState.validationTimers);
  const valObj = activeValTimers.length ? activeValTimers[0] : { leftMs: 0, maxMs: Math.max(1, Number(ecucConfig.Can0WakeupValidationTimeout) || 500), id: "Idle" };
  const runMinMax = Math.max(1, Number(ecucConfig.EcuMRunMinimumDuration) || 300);
  const alarmMax = Math.max(1, Number(ecucConfig.EcuMAlarmClockTimeOut) || 400);

  const timers = [
    { name: "ValidationTimeout", left: valObj.leftMs, max: valObj.maxMs, sub: activeValTimers.length ? valObj.id : "Không có Pending" },
    { name: "RunMinimumDuration", left: simState.runMinLeftMs, max: runMinMax, sub: "Giữ RUN tối thiểu" },
    { name: "EcuMMasterAlarm", left: simState.alarmClockLeftMs, max: alarmMax, sub: simState.alarmClockActive ? "Đang hẹn giờ" : "Alarm OFF" },
    { name: "RAM Hash & NvM", left: simState.nvmWritePendingMs, max: 40, sub: "Hash: " + simState.ramHashValue + (simState.ramHashValid ? " (OK)" : " (FAIL!)") }
  ];

  document.getElementById("timersGrid").innerHTML = timers.map((t) => {
    const pct = t.left > 0 ? Math.min(100, Math.round((t.left / t.max) * 100)) : 0;
    return "<div class=\"timer-card " + (t.left > 0 ? "active" : "") + "\">" +
      "<div class=\"timer-top\"><span>" + t.name + "</span><span class=\"mono\" style=\"color:var(--cyan)\">" + t.left + " ms</span></div>" +
      "<div class=\"timer-bar\"><div class=\"timer-fill\" style=\"width:" + pct + "%\"></div></div>" +
      "<div style=\"font-size:9.5px;color:var(--mut);margin-top:3px\">" + t.sub + "</div>" +
    "</div>";
  }).join("");
}

function renderStateMachines() {
  const archShort = ecucConfig.EcuMArchitectureVariant === "ECUM_FLEXIBLE_WITH_BSWM" ? "Flexible + BswM" : "Fixed Classic";
  const coreStr = ecucConfig.EcuMMultiCoreSupport ? ("Multi-Core (Core1: " + (ecucConfig.SlaveCore1ReadyForSleep ? "Synced" : "Busy") + ")") : "Single-Core (Core0)";
  document.getElementById("archVariantBadge").textContent = archShort + " | " + coreStr;
  document.getElementById("smLifecycleLbl").textContent = simState.subState;

  const smHtml =
    "<div class=\"sm-node " + (simState.majorPhase === "STARTUP" ? "active-start" : "") + "\">" +
      "<div class=\"sm-node-hdr\"><span>1. STARTUP PHASE</span><span class=\"mono\">" + (simState.majorPhase === "STARTUP" ? "ACTIVE" : "-") + "</span></div>" +
      "<div class=\"sm-subs\">" +
        "<span class=\"sm-subnode " + (simState.subState === "STARTUP_PRE_OS" ? "sub-active" : "") + "\">StartPreOS</span>" +
        "<span class=\"sm-subnode " + (simState.subState === "STARTUP_POST_OS" ? "sub-active" : "") + "\">StartPostOS</span>" +
      "</div>" +
    "</div>" +
    "<div class=\"sm-node " + (simState.majorPhase === "UP" ? "active-up" : "") + "\">" +
      "<div class=\"sm-node-hdr\"><span>2. UP PHASE (OPERATIONAL)</span><span class=\"mono\">" + (simState.majorPhase === "UP" ? "ACTIVE" : "-") + "</span></div>" +
      "<div class=\"sm-subs\">" +
        "<span class=\"sm-subnode " + ((simState.subState === "ECUM_STATE_RUN" || simState.subState === "ECUM_STATE_APP_RUN") ? "sub-active" : "") + "\">RUN / APP_RUN</span>" +
        "<span class=\"sm-subnode " + (simState.subState === "ECUM_STATE_APP_POST_RUN" ? "sub-active" : "") + "\">POST_RUN</span>" +
        "<span class=\"sm-subnode " + (simState.subState === "ECUM_STATE_PREP_SHUTDOWN" ? "sub-active" : "") + "\">PREP_SHUT</span>" +
      "</div>" +
    "</div>" +
    "<div class=\"sm-node " + (simState.majorPhase === "SLEEP" ? "active-sleep" : "") + "\">" +
      "<div class=\"sm-node-hdr\"><span>3. SLEEP PHASE</span><span class=\"mono\">" + (simState.majorPhase === "SLEEP" ? "ACTIVE" : "-") + "</span></div>" +
      "<div class=\"sm-subs\">" +
        "<span class=\"sm-subnode " + (simState.subState === "SLEEP_GO_HALT" ? "sub-active" : "") + "\">GoHalt</span>" +
        "<span class=\"sm-subnode " + (simState.subState === "SLEEP_GO_POLL" ? "sub-active" : "") + "\">GoPoll</span>" +
      "</div>" +
    "</div>" +
    "<div class=\"sm-node " + (simState.majorPhase === "SHUTDOWN" || simState.majorPhase === "ERROR" ? "active-shut" : "") + "\">" +
      "<div class=\"sm-node-hdr\"><span>4. SHUTDOWN / ERROR</span><span class=\"mono\">" + ((simState.majorPhase === "SHUTDOWN" || simState.majorPhase === "ERROR") ? "ACTIVE" : "-") + "</span></div>" +
      "<div class=\"sm-subs\">" +
        "<span class=\"sm-subnode " + (simState.subState === "ECUM_STATE_OFF" ? "sub-active" : "") + "\">OFF</span>" +
        "<span class=\"sm-subnode " + (simState.subState === "ECUM_STATE_RESET" ? "sub-active" : "") + "\">RESET</span>" +
        "<span class=\"sm-subnode " + (simState.subState === "ERROR_HOOK_HALT" ? "sub-active" : "") + "\">ErrorHook</span>" +
      "</div>" +
    "</div>";
  document.getElementById("lifecycleSmDiagram").innerHTML = smHtml;

  let wkState = "NONE";
  if (simState.pendingMask !== 0) wkState = "PENDING";
  else if (simState.validatedMask !== 0) wkState = "VALIDATED";
  else if (simState.expiredMask !== 0) wkState = "EXPIRED";
  document.getElementById("smWkupLbl").textContent = wkState;

  const wkNodes = [
    { key: "NONE",      cls: "active-none", title: "WKSTATUS_NONE",      sub: "Pending=0, Val=0" },
    { key: "PENDING",   cls: "active-pend", title: "WKSTATUS_PENDING",   sub: "Chờ CanIf / LinIf" },
    { key: "VALIDATED", cls: "active-val",  title: "WKSTATUS_VALIDATED", sub: "Báo BswM & ComM" },
    { key: "EXPIRED",   cls: "active-exp",  title: "WKSTATUS_EXPIRED",   sub: "Hết Timeout (Glitch)" }
  ];
  document.getElementById("wkupSmDiagram").innerHTML = wkNodes.map((n) => {
    const isAct = (n.key === "NONE" && wkState === "NONE") ||
                  (n.key === "PENDING" && simState.pendingMask !== 0) ||
                  (n.key === "VALIDATED" && simState.validatedMask !== 0) ||
                  (n.key === "EXPIRED" && simState.expiredMask !== 0);
    return "<div class=\"wk-sm-node " + (isAct ? n.cls : "") + "\">" +
      "<div style=\"display:flex;justify-content:space-between\"><span>" + n.title.replace("WKSTATUS_", "") + "</span><span class=\"mono\">" + (isAct ? "ON" : "-") + "</span></div>" +
      "<div style=\"font-size:9.5px;color:var(--mut);font-weight:500\">" + n.sub + "</div>" +
    "</div>";
  }).join("");

  document.getElementById("coreSummaryMini").innerHTML =
    "<strong>ComM Wakeup Ind:</strong> Ch0=" + (simState.commWakeupIndicatedCh0 ? "<span style=\"color:var(--ok)\">TRUE</span>" : "FALSE") +
    " · PNC16=" + (simState.commPncIndicated16 ? "<span style=\"color:var(--cyan)\">TRUE</span>" : "FALSE") +
    " · <strong>Multi-Core:</strong> " + (ecucConfig.EcuMMultiCoreSupport ? (simState.waitingMultiCoreSync ? "<span style=\"color:var(--warn)\">WAIT CORE1</span>" : "SYNCED") : "Single");
}

function renderSvgArchitecture() {
  document.getElementById("svgSub_MOD_BOOT").textContent = "BootTarget: " + simState.bootTarget.replace("ECUM_BOOT_TARGET_", "");
  document.getElementById("svgSub_MOD_SWC").textContent = "RUN: " + (simState.user0RunReq ? "1" : "0") + " | POST_RUN: " + (simState.user1PostRunReq ? "1" : "0");
  document.getElementById("svgSub_MOD_BSWM").textContent = "Handover: " + (simState.bswmHandover ? "YES" : "NO") + " | " + simState.subState.replace("ECUM_STATE_", "");
  document.getElementById("svgSub_MOD_OS").textContent = "OS: " + (simState.osStarted ? "RUNNING" : "STOPPED") + " | " + ecucConfig.EcuMMainFunctionPeriod + "ms";
  document.getElementById("svgSub_MOD_ECUM1").textContent = "Phase: " + simState.subState;
  document.getElementById("svgSub_MOD_ECUM2").textContent = "Target: " + simState.shutdownTarget.replace("ECUM_STATE_", "") + " | RAM: " + (simState.ramHashValid ? "OK" : "FAIL");
  document.getElementById("svgSub_MOD_NVM").textContent = "ReadAll: " + (simState.nvmReadDone ? "OK" : "-") + " | WriteAll: " + (simState.nvmWritePendingMs > 0 ? "BUSY" : "IDLE");
  document.getElementById("svgSub_MOD_DET").textContent = "Faults: " + simState.detFaults.length + " | Hash: " + simState.ramHashValue;
  document.getElementById("svgSub_MOD_COMM").textContent = "WakeCh0: " + (simState.commWakeupIndicatedCh0 ? "YES" : "NO") + " | PNC16: " + (simState.commPncIndicated16 ? "YES" : "NO");
  document.getElementById("svgSub_MOD_CANIF").textContent = "Pend: " + fmtHex2(simState.pendingMask) + " | Val: " + fmtHex2(simState.validatedMask);
  document.getElementById("svgSub_MOD_MCU").textContent = "Mode: " + simState.mcuMode.replace("MCU_", "") + " | Rst: " + ecucConfig.SimulatedMcuResetReason.replace("MCU_", "").replace("_RESET", "");

  Object.keys(MODULES_INFO).forEach((m) => {
    const g = document.getElementById("node_" + m);
    if (!g) return;
    g.classList.toggle("selected", simState.activeModId === m);
  });

  document.querySelectorAll(".flow-arrow").forEach((el) => {
    el.classList.toggle("active", simState.activeArrows.includes(el.id));
  });
}

function selectModule(modId) {
  simState.activeModId = modId;
  currentInspTab = 1;
  renderSvgArchitecture();
  renderInspector();
}

function switchInspTab(idx) {
  currentInspTab = idx;
  renderInspector();
}

function renderInspector() {
  for (let i = 0; i < 4; i++) {
    const b = document.getElementById("inspTabBtn" + i);
    if (b) b.classList.toggle("active", currentInspTab === i);
  }
  const body = document.getElementById("inspBody");

  if (currentInspTab === 0) {
    const diffA = ECUM_PHASE_BITS.filter((d) => ((simState.regAByte ^ simState.prevRegAByte) & d.mask) !== 0)
      .map((d) => "b" + d.bit + " " + d.name + " -> " + (((simState.regAByte & d.mask) !== 0) ? "1" : "0"));
    const diffB = ECUM_WKUP_BITS.filter((d) => ((simState.regBByte ^ simState.prevRegBByte) & d.mask) !== 0)
      .map((d) => "b" + d.bit + " " + d.name + " -> " + (((simState.regBByte & d.mask) !== 0) ? "1" : "0"));

    body.innerHTML =
      "<div class=\"insp-card\"><div class=\"insp-h\">🎯 Giải Thích Chi Tiết Bước Hiện Tại</div><p style=\"font-size:12px;color:var(--txt-soft)\">" + escapeHtmlSafe(simState.stepExplain) + "</p></div>" +
      "<div class=\"insp-card\"><div class=\"insp-h\">📊 Ảnh Hưởng Trạng Thái EcuM &amp; Wakeup</div>" +
        "<div style=\"font-size:11.5px\"><strong>Phase / SubState:</strong> <span class=\"mono\">" + simState.majorPhase + " / " + simState.subState + "</span><br/>" +
        "<strong>Shutdown Target:</strong> <span class=\"mono\">" + simState.shutdownTarget + " (" + simState.resetModeId + ")</span><br/>" +
        "<strong>Boot Target:</strong> <span class=\"mono\">" + simState.bootTarget + "</span><br/>" +
        "<strong>Wakeup Vectors:</strong> <span class=\"mono\">Pend=" + fmtHex2(simState.pendingMask) + " Val=" + fmtHex2(simState.validatedMask) + " Exp=" + fmtHex2(simState.expiredMask) + "</span></div>" +
      "</div>" +
      "<div class=\"insp-card\"><div class=\"insp-h\">⚡ Bit Thay Đổi Mới Nhất (Bit Deltas)</div>" +
        "<div style=\"font-size:11px\"><strong>Thanh A:</strong> " + (diffA.length ? diffA.join(", ") : "Không thay đổi ở bước vừa rồi") + "<br/>" +
        "<strong>Thanh B:</strong> " + (diffB.length ? diffB.join(", ") : "Không thay đổi ở bước vừa rồi") + "</div>" +
      "</div>" +
      (simState.detFaults.length ? "<div class=\"insp-card\" style=\"border-color:var(--err)\"><div class=\"insp-h\" style=\"color:var(--err)\">🚨 DET Errors Gần Nhất</div>" + simState.detFaults.slice(0, 3).map((f) => "<div class=\"mono\" style=\"font-size:10.5px\">[" + f.t + "ms] " + escapeHtmlSafe(f.code) + ": " + escapeHtmlSafe(f.detail) + "</div>").join("") + "</div>" : "");
  } else if (currentInspTab === 1) {
    const m = MODULES_INFO[simState.activeModId] || MODULES_INFO.MOD_ECUM;
    const pills = Object.values(MODULES_INFO).map((mod) =>
      "<button class=\"mod-pill " + (mod.id === m.id ? "active" : "") + "\" onclick=\"selectModule('" + mod.id + "')\">" + mod.id.replace("MOD_", "") + "</button>"
    ).join("");
    body.innerHTML =
      "<div class=\"mod-list\">" + pills + "</div>" +
      "<div class=\"insp-card\"><div class=\"insp-h\">🧩 " + escapeHtmlSafe(m.name) + "</div><div style=\"font-size:11px;color:var(--cyan);margin-bottom:4px\">Layer: " + escapeHtmlSafe(m.layer) + "</div><p style=\"font-size:11.5px\">" + escapeHtmlSafe(m.role) + "</p></div>" +
      "<div class=\"insp-card\"><div class=\"insp-h\">📥 Input (Lấy Từ Đâu)</div><p style=\"font-size:11.5px\">" + escapeHtmlSafe(m.inputs) + "</p></div>" +
      "<div class=\"insp-card\"><div class=\"insp-h\">⚙️ Cách Xử Lý</div><p style=\"font-size:11.5px\">" + escapeHtmlSafe(m.processing) + "</p></div>" +
      "<div class=\"insp-card\"><div class=\"insp-h\">📤 Output (Route Tới Đâu)</div><p style=\"font-size:11.5px\">" + escapeHtmlSafe(m.outputs) + "</p></div>" +
      "<div class=\"insp-card\"><div class=\"insp-h\">🔌 AUTOSAR Standard APIs / Callouts</div><pre class=\"code-block\">" + m.apis.join("\n") + "</pre></div>";
  } else if (currentInspTab === 2) {
    const codeText =
`/* Live EcuM Runtime C Inspection (AUTOSAR Classic R23-11) */
void EcuM_MainFunction(void)
{
  /* 1. Current Lifecycle & Target Snapshot */
  EcuM_StateType currentPhase   = ${simState.subState};
  EcuM_ShutdownTargetType tgt   = ${simState.shutdownTarget};
  EcuM_BootTargetType bootTgt   = ${simState.bootTarget};
  Mcu_ModeType mcuMode          = ${simState.mcuMode};

  /* 2. Wakeup Validation Masks (EcuM_WakeupSourceType) */
  uint32 pendingEvents          = ${fmtHex2(simState.pendingMask)}u;
  uint32 validatedEvents        = ${fmtHex2(simState.validatedMask)}u;
  uint32 expiredEvents          = ${fmtHex2(simState.expiredMask)}u;

  /* 3. Timers, RAM Hash & Multi-Core Barrier */
  uint32 runMinDurationLeftMs   = ${simState.runMinLeftMs}u;
  uint32 alarmClockLeftMs       = ${simState.alarmClockLeftMs}u;
  uint16 ramHash                = ${simState.ramHashValue}u; /* ${simState.ramHashValid ? "VALID" : "CORRUPT!"} */
  boolean multiCoreSynced       = ${(!ecucConfig.EcuMMultiCoreSupport || ecucConfig.SlaveCore1ReadyForSleep) ? "TRUE" : "FALSE"};
}`;
    body.innerHTML = "<div class=\"insp-card\"><div class=\"insp-h\">📄 Live Runtime C Inspection</div><pre class=\"code-block\">" + escapeHtmlSafe(codeText) + "</pre></div>";
  } else {
    body.innerHTML = simState.traceLogs.length
      ? simState.traceLogs.map((l) =>
          "<div class=\"trace-item " + l.level + "\">" +
            "<div><strong class=\"mono\">[" + l.t + " ms] " + escapeHtmlSafe(l.api) + "</strong></div>" +
            "<div style=\"color:var(--txt-soft);margin-top:2px\">" + escapeHtmlSafe(l.detail) + "</div>" +
          "</div>"
        ).join("")
      : "<div class=\"insp-card\">Chưa có sự kiện API / Callout nào được ghi nhận.</div>";
  }
}

function renderAll() {
  renderHeaderAndQuickActions();
  renderWakeupAndTargetMatrix();
  render8BitRegisters();
  renderTimers();
  renderStateMachines();
  renderSvgArchitecture();
  renderInspector();
}

// -------------------- TABS, THEME & HOVER TOOLTIP (>1S) --------------------

function switchCfgTab(idx) {
  currentCfgTab = idx;
  for (let i = 0; i < 6; i++) {
    const b = document.getElementById("cfgTabBtn" + i);
    const p = document.getElementById("cfgPane" + i);
    if (b) b.classList.toggle("active", i === idx);
    if (p) p.classList.toggle("hidden", i !== idx);
  }
}

function switchMainView(v) {
  const isSim = (v === "sim");
  document.getElementById("viewSim").classList.toggle("hidden", !isSim);
  document.getElementById("viewHb").classList.toggle("hidden", isSim);
  document.getElementById("btnViewSim").classList.toggle("active", isSim);
  document.getElementById("btnViewHb").classList.toggle("active", !isSim);
  if (!isSim && typeof renderCurrentHandbookView === "function") {
    renderCurrentHandbookView();
  }
}

function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.getAttribute("data-theme") === "dark";
  html.setAttribute("data-theme", isDark ? "light" : "dark");
  document.getElementById("btnTheme").textContent = isDark ? "🌙 Dark Mode" : "☀️ Light Mode";
}

function showTooltipForElement(rowEl, evt) {
  const key = rowEl.getAttribute("data-cfg-key");
  const info = configTooltipData[key];
  const popup = document.getElementById("cfgTooltipPopup");
  if (!info || !popup) return;

  popup.innerHTML =
    "<div class=\"tt-hdr\"><span class=\"tt-title\">" + escapeHtmlSafe(info.title) + "</span><span class=\"tt-meta\">" + escapeHtmlSafe(info.sws) + "</span></div>" +
    "<div class=\"tt-sec\"><b>ECUC Path:</b> <span class=\"mono\">" + escapeHtmlSafe(info.ecucPath) + "</span></div>" +
    "<div class=\"tt-sec\"><b>Miền giá trị:</b> <span class=\"mono\" style=\"color:var(--cyan)\">" + escapeHtmlSafe(info.range) + "</span></div>" +
    "<div class=\"tt-sec\"><b>Vai trò &amp; Ý nghĩa:</b> " + escapeHtmlSafe(info.role) + "</div>" +
    "<div class=\"tt-sec\"><b>Cơ chế hoạt động:</b> " + escapeHtmlSafe(info.mechanism) + "</div>" +
    "<div class=\"tt-sec\"><b>Ảnh hưởng kịch bản:</b> " + escapeHtmlSafe(info.scenarioImpact) + "</div>";

  const rect = rowEl.getBoundingClientRect();
  const px = Math.min(window.innerWidth - 405, Math.max(12, (evt ? evt.clientX + 16 : rect.right + 10)));
  const py = Math.min(window.innerHeight - 230, Math.max(12, rect.top - 10));
  popup.style.left = px + "px";
  popup.style.top = py + "px";
  popup.classList.add("show");
}

function hideConfigTooltip() {
  if (tooltipHoverTimer) {
    clearTimeout(tooltipHoverTimer);
    tooltipHoverTimer = null;
  }
  const popup = document.getElementById("cfgTooltipPopup");
  if (popup) popup.classList.remove("show");
}

function initTooltipHandlers() {
  document.querySelectorAll("[data-cfg-key]").forEach((row) => {
    row.addEventListener("mouseenter", (evt) => {
      hideConfigTooltip();
      tooltipHoverTimer = setTimeout(() => showTooltipForElement(row, evt), 1000);
    });
    row.addEventListener("mouseleave", hideConfigTooltip);
    const icon = row.querySelector(".cfg-i");
    if (icon) {
      icon.addEventListener("click", (evt) => {
        evt.preventDefault();
        evt.stopPropagation();
        showTooltipForElement(row, evt);
      });
    }
  });
}

// -------------------- ARXML / C / JSON / HTML EXPORTERS --------------------

function generateArxmlContent() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<AUTOSAR xmlns="http://autosar.org/schema/r4.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <AR-PACKAGES>
    <AR-PACKAGE>
      <SHORT-NAME>EcuM_EcucConfig</SHORT-NAME>
      <ELEMENTS>
        <ECUC-MODULE-CONFIGURATION-VALUES>
          <SHORT-NAME>EcuM</SHORT-NAME>
          <DEFINITION-REF DEST="ECUC-MODULE-DEF">/AUTOSAR/EcucDefs/EcuM</DEFINITION-REF>
          <CONTAINERS>
            <ECUC-CONTAINER-VALUE>
              <SHORT-NAME>EcuMGeneral</SHORT-NAME>
              <PARAMETER-VALUES>
                <ECUC-BOOLEAN-PARAM-VALUE><DEFINITION-REF DEST="ECUC-BOOLEAN-PARAM-DEF">/AUTOSAR/EcucDefs/EcuM/EcuMGeneral/EcuMDevErrorDetect</DEFINITION-REF><VALUE>${ecucConfig.EcuMDevErrorDetect}</VALUE></ECUC-BOOLEAN-PARAM-VALUE>
                <ECUC-BOOLEAN-PARAM-VALUE><DEFINITION-REF DEST="ECUC-BOOLEAN-PARAM-DEF">/AUTOSAR/EcucDefs/EcuM/EcuMGeneral/EcuMVersionInfoApi</DEFINITION-REF><VALUE>${ecucConfig.EcuMVersionInfoApi}</VALUE></ECUC-BOOLEAN-PARAM-VALUE>
                <ECUC-FLOAT-PARAM-VALUE><DEFINITION-REF DEST="ECUC-FLOAT-PARAM-DEF">/AUTOSAR/EcucDefs/EcuM/EcuMGeneral/EcuMMainFunctionPeriod</DEFINITION-REF><VALUE>${(ecucConfig.EcuMMainFunctionPeriod / 1000).toFixed(3)}</VALUE></ECUC-FLOAT-PARAM-VALUE>
                <ECUC-BOOLEAN-PARAM-VALUE><DEFINITION-REF DEST="ECUC-BOOLEAN-PARAM-DEF">/AUTOSAR/EcucDefs/EcuM/EcuMGeneral/EcuMLoopDetectionEnabled</DEFINITION-REF><VALUE>${ecucConfig.EcuMLoopDetectionEnabled}</VALUE></ECUC-BOOLEAN-PARAM-VALUE>
                <ECUC-BOOLEAN-PARAM-VALUE><DEFINITION-REF DEST="ECUC-BOOLEAN-PARAM-DEF">/AUTOSAR/EcucDefs/EcuM/EcuMGeneral/EcuMAlarmClockPresent</DEFINITION-REF><VALUE>${ecucConfig.EcuMAlarmClockPresent}</VALUE></ECUC-BOOLEAN-PARAM-VALUE>
              </PARAMETER-VALUES>
            </ECUC-CONTAINER-VALUE>
            <ECUC-CONTAINER-VALUE>
              <SHORT-NAME>EcuMCommonConfiguration</SHORT-NAME>
              <PARAMETER-VALUES>
                <ECUC-TEXTUAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-STRING-PARAM-DEF">/AUTOSAR/EcucDefs/EcuM/EcuMConfiguration/EcuMCommonConfiguration/EcuMConfigConsistencyHash</DEFINITION-REF><VALUE>${ecucConfig.EcuMConfigConsistencyHash}</VALUE></ECUC-TEXTUAL-PARAM-VALUE>
                <ECUC-TEXTUAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-ENUMERATION-PARAM-DEF">/AUTOSAR/EcucDefs/EcuM/EcuMConfiguration/EcuMCommonConfiguration/EcuMDefaultShutdownTarget</DEFINITION-REF><VALUE>${ecucConfig.EcuMDefaultShutdownTarget}</VALUE></ECUC-TEXTUAL-PARAM-VALUE>
                <ECUC-INTEGER-PARAM-VALUE><DEFINITION-REF DEST="ECUC-INTEGER-PARAM-DEF">/AUTOSAR/EcucDefs/EcuM/EcuMConfiguration/EcuMCommonConfiguration/EcuMSleepMode/EcuMSleepModeId</DEFINITION-REF><VALUE>${ecucConfig.EcuMSleepModeId}</VALUE></ECUC-INTEGER-PARAM-VALUE>
                <ECUC-FLOAT-PARAM-VALUE><DEFINITION-REF DEST="ECUC-FLOAT-PARAM-DEF">/AUTOSAR/EcucDefs/EcuM/EcuMConfiguration/EcuMCommonConfiguration/EcuMWakeupSource_CAN0/EcuMValidationTimeout</DEFINITION-REF><VALUE>${(ecucConfig.Can0WakeupValidationTimeout / 1000).toFixed(3)}</VALUE></ECUC-FLOAT-PARAM-VALUE>
              </PARAMETER-VALUES>
            </ECUC-CONTAINER-VALUE>
          </CONTAINERS>
        </ECUC-MODULE-CONFIGURATION-VALUES>
      </ELEMENTS>
    </AR-PACKAGE>
  </AR-PACKAGES>
</AUTOSAR>`;
}

function generateEcuMCfgH() {
  const b = (v) => (v ? "STD_ON" : "STD_OFF");
  return `#ifndef ECUM_CFG_H
#define ECUM_CFG_H

#include "Std_Types.h"

#define ECUM_DEV_ERROR_DETECT              ${b(ecucConfig.EcuMDevErrorDetect)}
#define ECUM_VERSION_INFO_API              ${b(ecucConfig.EcuMVersionInfoApi)}
#define ECUM_LOOP_DETECTION_ENABLED        ${b(ecucConfig.EcuMLoopDetectionEnabled)}
#define ECUM_ALARM_CLOCK_PRESENT           ${b(ecucConfig.EcuMAlarmClockPresent)}
#define ECUM_MULTI_CORE_SUPPORT            ${b(ecucConfig.EcuMMultiCoreSupport)}
#define ECUM_DRIVER_INIT_ZERO              ${b(ecucConfig.EcuMDriverInitZeroEnabled)}
#define ECUM_DRIVER_INIT_ONE               ${b(ecucConfig.EcuMDriverInitOneEnabled)}

#define ECUM_MAIN_FUNCTION_PERIOD_MS       ${ecucConfig.EcuMMainFunctionPeriod}u
#define ECUM_RUN_MINIMUM_DURATION_MS       ${ecucConfig.EcuMRunMinimumDuration}u
#define ECUM_CONFIG_CONSISTENCY_HASH       ((uint32)${ecucConfig.EcuMConfigConsistencyHash}u)
#define ECUM_DEFAULT_APP_MODE              ${ecucConfig.EcuMDefaultAppMode}
#define ECUM_DEFAULT_SHUTDOWN_TARGET       ${ecucConfig.EcuMDefaultShutdownTarget}
#define ECUM_DEFAULT_SLEEP_MODE_ID         ${ecucConfig.EcuMSleepModeId}u
#define ECUM_SLEEP_WAKEUP_SOURCE_MASK      ((EcuM_WakeupSourceType)${ecucConfig.EcuMSleepModeWakeupSourceMask}u)
#define ECUM_CAN0_VALIDATION_TIMEOUT_MS    ${ecucConfig.Can0WakeupValidationTimeout}u
#define ECUM_LIN1_VALIDATION_TIMEOUT_MS    ${ecucConfig.Lin1WakeupValidationTimeout}u
#define ECUM_KL15_VALIDATION_TIMEOUT_MS    ${ecucConfig.Kl15WakeupValidationTimeout}u

#endif /* ECUM_CFG_H */`;
}

function generateEcuMCalloutStubsC() {
  return `#include "EcuM.h"
#include "BswM.h"
#include "ComM.h"
#include "Mcu.h"

void EcuM_AL_DriverInitZero(void) {
  /* SWS_EcuM_02411: Pre-Compile Drivers (Det_Init) */
}

const EcuM_ConfigType* EcuM_DeterminePbConfiguration(void) {
  /* SWS_EcuM_02795: Return Post-Build Config (Hash = ${ecucConfig.InjectedPbConfigHash}) */
  return &EcuM_Config;
}

void EcuM_AL_DriverInitOne(const EcuM_ConfigType* ConfigPtr) {
  /* SWS_EcuM_02416: Mcu_Init, Port_Init, Dio_Init, Gpt_Init, CanTrcv_Init */
}

void EcuM_AL_DriverRestart(const EcuM_ConfigType* ConfigPtr) {
  /* SWS_EcuM_02961: Restore peripherals after WakeupRestart */
}

uint8 EcuM_CheckRamHash(void) {
  /* SWS_EcuM_02926: Returns 1 if RAM integrity intact, 0 if corrupted */
  return ${ecucConfig.SimulateRamHashCorruption ? "0u" : "1u"};
}

void EcuM_AL_SwitchOff(void) {
  /* SWS_EcuM_02920: Disable SBC Power Hold Latch -> MCU Power Off */
}

void EcuM_AL_Reset(EcuM_ResetType resetMode) {
  /* SWS_EcuM_04045: ResetMode = ${ecucConfig.EcuMResetModeId}, BootTarget = ${ecucConfig.CurrentBootTarget} */
  Mcu_PerformReset();
}`;
}

function getExportPayload(idx) {
  if (idx === 0) return { filename: "EcuM.arxml", text: generateArxmlContent() };
  if (idx === 1) return { filename: "EcuM_Cfg.h", text: generateEcuMCfgH() };
  if (idx === 2) return { filename: "EcuM_Callout_Stubs.c", text: generateEcuMCalloutStubsC() };
  return { filename: "EcuM_Config.json", text: JSON.stringify(ecucConfig, null, 2) };
}

function openExportModal() {
  document.getElementById("exportModal").classList.remove("hidden");
  switchExportTab(currentExportTab);
}

function closeExportModal() {
  document.getElementById("exportModal").classList.add("hidden");
}

function switchExportTab(idx) {
  currentExportTab = idx;
  for (let i = 0; i < 4; i++) {
    const b = document.getElementById("expTab" + i);
    if (b) b.classList.toggle("btn-pri", i === idx);
  }
  document.getElementById("exportCodeArea").textContent = getExportPayload(idx).text;
}

function copyExportCode() {
  const txt = getExportPayload(currentExportTab).text;
  if (navigator.clipboard) navigator.clipboard.writeText(txt).catch(() => {});
}

function downloadExportCode() {
  const p = getExportPayload(currentExportTab);
  const blob = new Blob([p.text], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = p.filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function downloadStandaloneHTML() {
  const docHtml = "<!DOCTYPE html>\n" + document.documentElement.outerHTML;
  const blob = new Blob([docHtml], { type: "text/html;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "AUTOSAR_EcuM_Simulator.html";
  a.click();
  URL.revokeObjectURL(a.href);
}
