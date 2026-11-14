// ==================== PART 5: UI RENDERERS, STEPPER, QUICK ACTIONS, TOOLTIP & EXPORTS ====================

let tooltipTimer = null;
let currentExportTab = 0;

function getCurrentScenario() {
  return SCENARIOS.find((s) => s.id === simState.currentScenarioId) || SCENARIOS[0];
}

function captureSnapshot() {
  return JSON.stringify({
    cfg: simState.cfg,
    clockMs: simState.clockMs,
    initPhase: simState.initPhase,
    mcalInitMask: simState.mcalInitMask,
    diagMuxPhase: simState.diagMuxPhase,
    adcPinMv: simState.adcPinMv,
    adcFilteredPct: simState.adcFilteredPct,
    adcLastValidPct: simState.adcLastValidPct,
    adcGroupBusy: simState.adcGroupBusy,
    dioPinLevel: simState.dioPinLevel,
    dioLogicalState: simState.dioLogicalState,
    dioDebounceElapsedMs: simState.dioDebounceElapsedMs,
    dioRelayExpected: simState.dioRelayExpected,
    dioRelayReadback: simState.dioRelayReadback,
    swcTargetDutyPct: simState.swcTargetDutyPct,
    swcTargetDir: simState.swcTargetDir,
    actuatorCurrentMa: simState.actuatorCurrentMa,
    faultOpenLoad: simState.faultOpenLoad,
    icuFreqHz: simState.icuFreqHz,
    icuDutyPct: simState.icuDutyPct,
    icuSilentMs: simState.icuSilentMs,
    diagDebounceCount: simState.diagDebounceCount,
    fimPermission: simState.fimPermission,
    dcmControlParam: simState.dcmControlParam,
    dcmOverridePct: simState.dcmOverridePct,
    dcmFreezePct: simState.dcmFreezePct,
    activeModules: simState.activeModules,
    activeArrows: simState.activeArrows,
    apiTrace: simState.apiTrace,
    detLogs: simState.detLogs,
    lastCStatement: simState.lastCStatement,
    selectedChannel: simState.selectedChannel
  });
}

function restoreSnapshot(snapJson) {
  const s = JSON.parse(snapJson);
  Object.assign(simState, s);
  syncConfigToDOM();
  recomputeIoHwAbEngine({ stepFilter: false, preserveDebounce: true });
}

// -------------------- MAIN VIEW & THEME --------------------

function switchMainView(v) {
  const viewSim = document.getElementById("viewSim");
  const viewHb = document.getElementById("viewHb");
  const btnSim = document.getElementById("btnViewSim");
  const btnHb = document.getElementById("btnViewHb");
  if (!viewSim || !viewHb) return;

  if (v === "hb") {
    viewSim.classList.add("hidden");
    viewHb.classList.remove("hidden");
    btnSim?.classList.remove("btn-pri");
    btnHb?.classList.add("btn-pri");
    if (typeof renderHandbook === "function") renderHandbook();
  } else {
    viewHb.classList.add("hidden");
    viewSim.classList.remove("hidden");
    btnHb?.classList.remove("btn-pri");
    btnSim?.classList.add("btn-pri");
  }
}

function toggleTheme() {
  const html = document.documentElement;
  const cur = html.getAttribute("data-theme") || "dark";
  const next = cur === "dark" ? "light" : "dark";
  html.setAttribute("data-theme", next);
  const btn = document.getElementById("btnTheme");
  if (btn) btn.textContent = next === "dark" ? "🌙 Tối" : "☀️ Sáng";
}

function switchCfgTab(idx) {
  simState.activeCfgTab = idx;
  for (let i = 0; i < 6; i++) {
    document.getElementById("cfgTabBtn" + i)?.classList.toggle("active", i === idx);
    document.getElementById("cfgPane" + i)?.classList.toggle("hidden", i !== idx);
  }
}

function switchInspTab(idx) {
  simState.activeInspTab = idx;
  for (let i = 0; i < 4; i++) {
    document.getElementById("inspTabBtn" + i)?.classList.toggle("active", i === idx);
  }
  renderInspector();
}

function selectModule(modId) {
  simState.activeModule = modId;
  simState.activeInspTab = 1;
  switchInspTab(1);
  renderSvgArchitecture();
}

// -------------------- SCENARIO STEPPER --------------------

function loadScenario(scenId) {
  stopScenarioAutoPlay();
  const scen = SCENARIOS.find((s) => s.id === scenId) || SCENARIOS[0];
  simState.currentScenarioId = scen.id;
  const sel = document.getElementById("scenSelect");
  if (sel) sel.value = scen.id;

  scen.setup();
  syncConfigToDOM();
  recomputeIoHwAbEngine({ stepFilter: false, preserveDebounce: true });
  simState.currentStepIdx = 0;
  simState.stepSnapshots = [captureSnapshot()];
  renderAll();
}

function onScenarioSelectChange(scenId) {
  loadScenario(scenId);
}

function resetCurrentScenario() {
  loadScenario(simState.currentScenarioId);
}

function nextScenarioStep() {
  const scen = getCurrentScenario();
  if (simState.currentStepIdx >= scen.steps.length) {
    stopScenarioAutoPlay();
    return;
  }
  const stepObj = scen.steps[simState.currentStepIdx];
  stepObj.apply();
  syncConfigToDOM();
  recomputeIoHwAbEngine({ stepFilter: false, preserveDebounce: true });
  simState.currentStepIdx += 1;
  simState.stepSnapshots[simState.currentStepIdx] = captureSnapshot();
  renderAll();
}

function prevScenarioStep() {
  stopScenarioAutoPlay();
  if (simState.currentStepIdx <= 0) return;
  simState.currentStepIdx -= 1;
  const snap = simState.stepSnapshots[simState.currentStepIdx];
  if (snap) restoreSnapshot(snap);
  renderAll();
}

function stopScenarioAutoPlay() {
  if (simState.scenAutoPlayTimer) {
    clearInterval(simState.scenAutoPlayTimer);
    simState.scenAutoPlayTimer = null;
  }
  const btn = document.getElementById("btnAutoPlay");
  if (btn) btn.textContent = "⏵ Auto";
}

function toggleScenarioAutoPlay() {
  if (simState.scenAutoPlayTimer) {
    stopScenarioAutoPlay();
    return;
  }
  const scen = getCurrentScenario();
  if (simState.currentStepIdx >= scen.steps.length) {
    loadScenario(scen.id);
  }
  const btn = document.getElementById("btnAutoPlay");
  if (btn) btn.textContent = "⏸ Pause";
  simState.scenAutoPlayTimer = setInterval(() => {
    const curScen = getCurrentScenario();
    if (simState.currentStepIdx >= curScen.steps.length) {
      stopScenarioAutoPlay();
      return;
    }
    nextScenarioStep();
  }, 1500);
}

function runWhatIf(idx) {
  const scen = getCurrentScenario();
  const wi = scen.whatIfs && scen.whatIfs[idx];
  if (!wi) return;
  wi.run();
  syncConfigToDOM();
  recomputeIoHwAbEngine({ stepFilter: false, preserveDebounce: true });
  logApiTrace("WHATIF", "User", scen.id, wi.label);
  renderAll();
}

// -------------------- QUICK ACTIONS --------------------

function qaSetAdcVoltage() {
  const sel = document.getElementById("qaAdcVoltSelect");
  if (!sel) return;
  const mv = parseInt(sel.value, 10);
  if (!Number.isFinite(mv)) return;
  simState.adcPinMv = mv;
  simState.selectedChannel = "CH0_ADC_PedalPos";
  if (mv >= Number(simState.cfg.IoHwAbAdcShortToGndThrMv) && mv <= Number(simState.cfg.IoHwAbAdcShortToBatThrMv)) {
    simState.diagDebounceCount = 0;
  } else {
    simState.diagDebounceCount = parseInt(simState.cfg.IoHwAbDiagDebounceTicks, 10) || 3;
  }
  logApiTrace("HW", "Pin_P02.3", "Adc_ReadGroup", `Set Pin = ${mv} mV`);
  recomputeIoHwAbEngine({ stepFilter: false, preserveDebounce: true });
  renderAll();
}

function qaToggleDioBrake() {
  simState.selectedChannel = "CH1_DIO_BrakeSw";
  simState.dioPinLevel = simState.dioPinLevel === "STD_HIGH" ? "STD_LOW" : "STD_HIGH";
  simState.dioDebounceElapsedMs = 0;
  logApiTrace("HW", "Pin_P00.7", "Dio_ReadChannel", `Switch Pin -> ${simState.dioPinLevel}`);
  recomputeIoHwAbEngine({ stepFilter: false, preserveDebounce: true });
  renderAll();
}

function qaCyclePwmCmd() {
  simState.selectedChannel = "CH2_PWM_Throttle";
  const seq = [0.0, 2.0, 50.0, 80.0, 99.0];
  const curIdx = seq.findIndex((x) => Math.abs(x - simState.swcTargetDutyPct) < 0.5);
  simState.swcTargetDutyPct = seq[(curIdx + 1) % seq.length];
  logApiTrace("RTE", "SWC_App", "IoHwAb_ThrottleAct_SetDuty", `Req = ${simState.swcTargetDutyPct.toFixed(1)}%`);
  recomputeIoHwAbEngine({ stepFilter: false, preserveDebounce: true });
  renderAll();
}

function qaCycleIcuFreq() {
  simState.selectedChannel = "CH3_ICU_WheelSpeed";
  const seq = [500, 1200, 2500, 0];
  const curIdx = seq.indexOf(simState.icuFreqHz);
  simState.icuFreqHz = seq[(curIdx + 1) % seq.length];
  simState.icuSilentMs = simState.icuFreqHz === 0 ? 55 : 0;
  logApiTrace("HW", "Pin_P01.4", "Icu_Capture", simState.icuFreqHz === 0 ? "Signal Lost (0 Hz)" : `${simState.icuFreqHz} Hz`);
  recomputeIoHwAbEngine({ stepFilter: false, preserveDebounce: true });
  renderAll();
}

function qaCycleFaultInjection() {
  const maxD = parseInt(simState.cfg.IoHwAbDiagDebounceTicks, 10) || 3;
  if (!simState.faultShortGnd && !simState.faultShortBat && !simState.faultOpenLoad && !simState.faultOverCurrent) {
    simState.adcPinMv = 120;
    simState.diagDebounceCount = maxD;
    logApiTrace("INJECT", "FaultGen", "Pin_P02.3", "Short-to-GND (120mV)");
  } else if (simState.faultShortGnd) {
    simState.adcPinMv = 4880;
    simState.diagDebounceCount = maxD;
    logApiTrace("INJECT", "FaultGen", "Pin_P02.3", "Short-to-Bat (4880mV)");
  } else if (simState.faultShortBat) {
    simState.adcPinMv = 2500;
    simState.faultOpenLoad = true;
    simState.actuatorCurrentMa = 0;
    simState.diagDebounceCount = maxD;
    logApiTrace("INJECT", "FaultGen", "SmartFET", "Open-Load (0 mA)");
  } else if (simState.faultOpenLoad) {
    simState.faultOpenLoad = false;
    simState.actuatorCurrentMa = 9600;
    simState.diagDebounceCount = maxD;
    logApiTrace("INJECT", "FaultGen", "SmartFET", "Over-Current (9600 mA)");
  } else {
    simState.adcPinMv = 2500;
    simState.faultOpenLoad = false;
    simState.actuatorCurrentMa = 2400;
    simState.diagDebounceCount = 0;
    logApiTrace("INJECT", "FaultGen", "Clear", "All Electrical Faults Cleared");
  }
  recomputeIoHwAbEngine({ stepFilter: false, preserveDebounce: true });
  renderAll();
}

function qaCycleDcm0x2F() {
  simState.cfg.IoHwAbEnableDcm0x2FControl = true;
  syncConfigToDOM();
  const seq = ["RETURN_TO_ECU", "SHORT_TERM_ADJUSTMENT", "FREEZE_CURRENT_STATE", "RESET_TO_DEFAULT"];
  const idx = seq.indexOf(simState.dcmControlParam);
  simState.dcmControlParam = seq[(idx + 1) % seq.length];
  if (simState.dcmControlParam === "FREEZE_CURRENT_STATE") {
    simState.dcmFreezePct = (simState.pwmDutyHex / 0x8000) * 100.0;
  }
  logApiTrace("UDS", "DCM", "Service_0x2F", simState.dcmControlParam);
  recomputeIoHwAbEngine({ stepFilter: false, preserveDebounce: true });
  renderAll();
}

function qaToggleFiMPerm() {
  simState.fimPermission = !simState.fimPermission;
  logApiTrace("FIM", "FiM", "FID_THROTTLE", simState.fimPermission ? "ALLOWED (TRUE)" : "INHIBITED (FALSE -> Safe-State)");
  recomputeIoHwAbEngine({ stepFilter: false, preserveDebounce: true });
  renderAll();
}

// -------------------- RENDERERS --------------------

function renderAll() {
  renderHeaderAndQuickActions();
  renderScenarioAndConfigValidation();
  renderSignalChainAndFormulas();
  render8BitRegisters();
  renderMetersAndStateMachines();
  renderSvgArchitecture();
  renderInspector();
}

function renderHeaderAndQuickActions() {
  const scen = getCurrentScenario();
  const ind = document.getElementById("stepIndicator");
  if (ind) ind.textContent = `Bước ${simState.currentStepIdx} / ${scen.steps.length}`;
  const prevBtn = document.getElementById("btnPrevStep");
  if (prevBtn) prevBtn.disabled = simState.currentStepIdx <= 0;
  const nextBtn = document.getElementById("btnNextStep");
  if (nextBtn) nextBtn.disabled = simState.currentStepIdx >= scen.steps.length;

  const clk = document.getElementById("clockVal");
  if (clk) clk.textContent = `${simState.clockMs} ms`;
  const autoClk = document.getElementById("btnAutoClock");
  if (autoClk) {
    autoClk.textContent = simState.autoClockTimer ? "⏸ Stop Clock" : "⏱ Auto Clock";
    autoClk.classList.toggle("btn-ok", !!simState.autoClockTimer);
  }

  const bSup = document.getElementById("hdrBadgeSupply");
  if (bSup) {
    bSup.textContent = `5V_Ref: ${simState.cfg.IoHwAbSensorSupplyMeasuredMv}mV`;
    bSup.className = "state-badge " + (simState.faultSupply5v ? "sb-err" : "sb-ok");
  }
  const bQual = document.getElementById("hdrBadgeQual");
  if (bQual) {
    bQual.textContent = `Qual: ${simState.signalQual}`;
    bQual.className = "state-badge " + (simState.signalQual === "GOOD" ? "sb-ok" : simState.signalQual === "DEGRADED" ? "sb-warn" : "sb-err");
  }
  const bPwm = document.getElementById("hdrBadgePwm");
  if (bPwm) {
    const pct = ((simState.pwmDutyHex / 0x8000) * 100).toFixed(0);
    bPwm.textContent = `PWM: ${toHex15(simState.pwmDutyHex)} (${pct}%)`;
    bPwm.className = "state-badge " + (simState.pwmOutToIdle ? "sb-err" : simState.pwmClamped ? "sb-warn" : "sb-pri");
  }
  const bOvr = document.getElementById("hdrBadgeOverride");
  if (bOvr) {
    const shortMap = {
      RETURN_TO_ECU: "0x2F: ECU",
      SHORT_TERM_ADJUSTMENT: "0x2F: ADJ 80%",
      FREEZE_CURRENT_STATE: "0x2F: FREEZE",
      RESET_TO_DEFAULT: "0x2F: RESET"
    };
    bOvr.textContent = shortMap[simState.dcmControlParam] || "0x2F: ECU";
    bOvr.className = "state-badge " + (simState.dcmControlParam !== "RETURN_TO_ECU" ? "sb-warn" : "sb-idle");
  }

  // Quick Action labels
  const tDio = document.getElementById("qaTxtDio");
  if (tDio) {
    tDio.textContent = simState.dioDebouncing
      ? `DBNC (${simState.dioDebounceElapsedMs}ms)`
      : `${simState.dioPinLevel === "STD_LOW" ? "LOW" : "HIGH"} (${simState.dioLogicalState ? 1 : 0})`;
  }
  document.getElementById("qaBtnDioBrake")?.classList.toggle("qa-active", simState.dioLogicalState);

  const tPwm = document.getElementById("qaTxtPwm");
  if (tPwm) tPwm.textContent = `${simState.swcTargetDutyPct.toFixed(1)}%`;

  const tIcu = document.getElementById("qaTxtIcu");
  if (tIcu) tIcu.textContent = simState.icuFreqHz > 0 ? `${simState.icuFreqHz}Hz` : "STALL";

  const tFlt = document.getElementById("qaTxtFault");
  if (tFlt) {
    tFlt.textContent = simState.faultShortGnd ? "SC_GND" : simState.faultShortBat ? "SC_BAT" : simState.faultOpenLoad ? "OPEN_L" : simState.faultOverCurrent ? "OVER_I" : "OK";
  }
  document.getElementById("qaBtnFaultInj")?.classList.toggle("qa-active", simState.faultShortGnd || simState.faultShortBat || simState.faultOpenLoad || simState.faultOverCurrent);

  const tDcm = document.getElementById("qaTxtDcm2F");
  if (tDcm) tDcm.textContent = simState.dcmControlParam === "RETURN_TO_ECU" ? "ECU" : simState.dcmControlParam.slice(0, 6);
  document.getElementById("qaBtnDcm2F")?.classList.toggle("qa-active", simState.dcmControlParam !== "RETURN_TO_ECU");

  const tFim = document.getElementById("qaTxtFiM");
  if (tFim) tFim.textContent = simState.fimPermission ? "ALLOW" : "INHIBIT";
  document.getElementById("qaBtnFiM")?.classList.toggle("qa-active", !simState.fimPermission);
}

function renderScenarioAndConfigValidation() {
  const scen = getCurrentScenario();
  const idBadge = document.getElementById("scenIdBadge");
  if (idBadge) idBadge.textContent = scen.id;

  const sumBox = document.getElementById("scenSummaryBox");
  if (sumBox) {
    const curStep = simState.currentStepIdx > 0 ? scen.steps[simState.currentStepIdx - 1] : null;
    sumBox.innerHTML = curStep
      ? `<b>${curStep.title}</b><div style="margin-top:3px">${curStep.desc}</div>`
      : `<b>${scen.title}</b><div style="margin-top:3px">${scen.summary}</div>`;
  }

  const wiBox = document.getElementById("whatIfContainer");
  if (wiBox && scen.whatIfs) {
    wiBox.innerHTML = scen.whatIfs.map((w, idx) =>
      `<button class="whatif-btn" onclick="runWhatIf(${idx})" title="${w.desc}">🧪 ${w.label}</button>`
    ).join("");
  }

  // Config cross-validation box
  const valBox = document.getElementById("cfgValidationBox");
  if (valBox) {
    const warns = [];
    if (!simState.cfg.IoHwAbInitialized) {
      warns.push({ err: true, msg: "IoHwAbInitialized = FALSE: Toàn bộ ngõ ra khóa IDLE, DET báo 0x01." });
    }
    if (simState.cfg.IoHwAbPortPinPullMode === "PORT_PIN_IN_PULL_UP" && simState.cfg.IoHwAbDioActivePolarity === "ACTIVE_HIGH") {
      warns.push({ err: false, msg: "Cảnh báo Pull-Up đi cùng ACTIVE_HIGH có thể khiến logic mặc định bị Đảo thành TRUE lúc hở mạch." });
    }
    if (simState.cfg.IoHwAbPortPinPullMode === "PORT_PIN_IN_PULL_DOWN" && simState.cfg.IoHwAbDioActivePolarity === "ACTIVE_LOW") {
      warns.push({ err: false, msg: "Cảnh báo Pull-Down đi cùng ACTIVE_LOW có thể gây kích hoạt giả liên tục." });
    }
    const [lo, hi] = parseRangeStr(simState.cfg.IoHwAbPwmDutyClampRangePct, 5, 95);
    if (lo >= hi) {
      warns.push({ err: true, msg: "PwmDutyClampRangePct không hợp lệ (Min phải nhỏ hơn Max)." });
    }
    valBox.innerHTML = warns.map((w) => `<div class="cfg-alert ${w.err ? "err" : ""}">⚠ ${w.msg}</div>`).join("");
  }
}

function renderSignalChainAndFormulas() {
  const tbody = document.getElementById("signalChainTableBody");
  if (!tbody) return;

  const ch0Fault = simState.faultShortGnd || simState.faultShortBat || simState.adcGroupBusy;
  const ch0QualCls = ch0Fault ? (simState.demStatus === "FAILED" ? "qp-fault" : "qp-deb") : simState.faultSupply5v ? "qp-ovr" : "qp-good";
  const ch0QualTxt = simState.adcGroupBusy ? "BUSY" : (simState.demStatus === "FAILED" && (simState.faultShortGnd || simState.faultShortBat)) ? "FAULT (SUB)" : simState.faultSupply5v ? "DEGRADED" : "GOOD";

  const ch1QualCls = simState.dioReadbackMismatch ? "qp-fault" : simState.dioDebouncing ? "qp-deb" : "qp-good";
  const ch1QualTxt = simState.dioReadbackMismatch ? "RDBK_ERR" : simState.dioDebouncing ? "DEBOUNCING" : "GOOD";

  const ch2Fault = simState.pwmOutToIdle || simState.faultOpenLoad;
  const ch2QualCls = ch2Fault ? "qp-fault" : (simState.dcmControlParam !== "RETURN_TO_ECU" || simState.pwmClamped) ? "qp-ovr" : "qp-good";
  const ch2QualTxt = !simState.fimPermission && simState.cfg.IoHwAbEnableFiMSafeStateCheck ? "FIM_SAFE" : simState.faultOverCurrent ? "OCP_TRIP" : simState.faultOpenLoad ? "OPEN_LOAD" : simState.dcmControlParam !== "RETURN_TO_ECU" ? "0x2F_OVR" : simState.pwmClamped ? "CLAMPED" : "GOOD";

  const ch3QualCls = simState.icuCaptureActive ? "qp-good" : "qp-ovr";
  const ch3QualTxt = simState.icuCaptureActive ? "CAP_OK" : "TIMEOUT/0";

  const rows = [
    {
      id: "CH0_ADC_PedalPos",
      cls: (simState.selectedChannel === "CH0_ADC_PedalPos" ? "sig-sel " : "") + (ch0Fault ? "sig-fault" : ""),
      name: "CH0 · PedalPos (ADC)",
      mcal: "P02.3 · Adc_ReadGroup()",
      raw: `${simState.adcRawCount} / ${simState.adcMaxCount} (${simState.adcPinMv}mV)`,
      proc: `${simState.cfg.IoHwAbEnableRatiometricCompensation && !simState.faultSupply5v ? "Ratio+" : ""}${simState.cfg.IoHwAbAdcIirFilterEnable ? "IIR(α=" + simState.cfg.IoHwAbAdcIirAlphaCoeff + ")" : "Linear"}`,
      phys: `${simState.adcOutPct.toFixed(1)} %`,
      qCls: ch0QualCls,
      qTxt: ch0QualTxt
    },
    {
      id: "CH1_DIO_BrakeSw",
      cls: (simState.selectedChannel === "CH1_DIO_BrakeSw" ? "sig-sel " : "") + (simState.dioReadbackMismatch ? "sig-fault" : ""),
      name: "CH1 · BrakeSw (DIO)",
      mcal: "P00.7 · Dio_ReadChannel()",
      raw: `${simState.dioPinLevel} (Rdbk:${simState.dioRelayReadback})`,
      proc: `${simState.cfg.IoHwAbDioActivePolarity} + Dbnc(${simState.cfg.IoHwAbDioDebounceEnable ? simState.cfg.IoHwAbDioDebounceTimeMs + "ms" : "OFF"})`,
      phys: simState.dioLogicalState ? "TRUE (Pressed)" : "FALSE (Rel)",
      qCls: ch1QualCls,
      qTxt: ch1QualTxt
    },
    {
      id: "CH2_PWM_Throttle",
      cls: (simState.selectedChannel === "CH2_PWM_Throttle" ? "sig-sel " : "") + (ch2Fault ? "sig-fault" : simState.dcmControlParam !== "RETURN_TO_ECU" ? "sig-override" : ""),
      name: "CH2 · Throttle (PWM)",
      mcal: "P10.1 · Pwm_SetDutyCycle()",
      raw: `${toHex15(simState.pwmDutyHex)} (${simState.pwmDutyHex})`,
      proc: `${simState.pwmSourceOwner} · ${simState.actuatorCurrentMa}mA`,
      phys: `${((simState.pwmDutyHex / 0x8000) * 100).toFixed(1)} % ${simState.swcTargetDir.slice(0, 3)}`,
      qCls: ch2QualCls,
      qTxt: ch2QualTxt
    },
    {
      id: "CH3_ICU_WheelSpeed",
      cls: (simState.selectedChannel === "CH3_ICU_WheelSpeed" ? "sig-sel " : ""),
      name: "CH3 · WheelSpd (ICU)",
      mcal: "P01.4 · Icu_GetDutyCycle()",
      raw: `${simState.icuFreqHz}Hz (${simState.icuPeriodTicks}µs)`,
      proc: `${simState.cfg.IoHwAbSpeedSensorTeethCount} teeth (${simState.cfg.IcuMeasurementMode.includes("EDGE") ? "Edge" : "Sig"})`,
      phys: `${simState.icuRpm} RPM`,
      qCls: ch3QualCls,
      qTxt: ch3QualTxt
    }
  ];

  tbody.innerHTML = rows.map((r) => `
    <tr class="${r.cls.trim()}" onclick="selectSignalChannel('${r.id}')">
      <td><b>${r.name}</b></td>
      <td class="mono">${r.mcal}</td>
      <td class="mono">${r.raw}</td>
      <td>${r.proc}</td>
      <td class="mono"><b>${r.phys}</b></td>
      <td><span class="qual-pill ${r.qCls}">${r.qTxt}</span></td>
    </tr>
  `).join("");

  const fBox = document.getElementById("formulaAnatomyBox");
  if (fBox) {
    const ratioRatio = (5000 / Math.max(100, Number(simState.cfg.IoHwAbSensorSupplyMeasuredMv))).toFixed(3);
    const adcErrCls = simState.faultShortGnd || simState.faultShortBat ? "err" : simState.faultSupply5v ? "warn" : "hi";
    const pwmCls = simState.pwmOutToIdle ? "err" : simState.pwmClamped || simState.dcmControlParam !== "RETURN_TO_ECU" ? "warn" : "hi";
    fBox.innerHTML = `
      <div class="formula-line">
        <span class="f-tag">ADC Scaling</span>
        <span class="mono f-node">Raw=${simState.adcRawCount}/${simState.adcMaxCount} (${simState.adcPinMv}mV)</span>
        <span>→</span>
        <span class="mono f-node">${simState.cfg.IoHwAbEnableRatiometricCompensation && !simState.faultSupply5v ? "×" + ratioRatio + " = " + simState.adcCompMv.toFixed(0) + "mV" : "No RatioComp"}</span>
        <span>→</span>
        <span class="mono f-node">Inst=${simState.adcInstPct.toFixed(1)}%</span>
        <span>→</span>
        <span class="mono f-node ${adcErrCls}">IIR/Sub=${simState.adcOutPct.toFixed(1)}% (${ch0QualTxt})</span>
      </div>
      <div class="formula-line">
        <span class="f-tag pwm">Actuator Mux</span>
        <span class="mono f-node">SWC=${simState.swcTargetDutyPct.toFixed(1)}%</span>
        <span>|</span>
        <span class="mono f-node">Owner: ${simState.pwmSourceOwner}</span>
        <span>→</span>
        <span class="mono f-node ${pwmCls}">Duty=${toHex15(simState.pwmDutyHex)} (${((simState.pwmDutyHex / 0x8000) * 100).toFixed(1)}%)</span>
        <span class="f-tag icu" style="margin-left:auto">ICU</span>
        <span class="mono f-node">${simState.icuFreqHz}Hz×60/${simState.cfg.IoHwAbSpeedSensorTeethCount} = ${simState.icuRpm} RPM</span>
      </div>
    `;
  }
}

function render8BitRegisters() {
  const regAHex = document.getElementById("regAHex");
  const regBHex = document.getElementById("regBHex");
  if (regAHex) regAHex.textContent = toHex8(simState.regAByte);
  if (regBHex) regBHex.textContent = toHex8(simState.regBByte);

  const aCont = document.getElementById("regABits");
  if (aCont) {
    aCont.innerHTML = IOHWAB_SIG_BITS.map((b) => {
      const on = (simState.regAByte & (1 << b.bit)) !== 0;
      const cls = b.bit === 2 && on ? "on warn-bit" : b.bit === 0 && !on ? "" : on ? "on" : "";
      return `
        <div class="bit-box ${cls}" onclick="toggleRegisterBit('A', ${b.bit})" title="${b.full} (${b.hex}): ${b.desc}">
          <div class="bit-pos mono">b${b.bit}</div>
          <div class="bit-val mono">${on ? 1 : 0}</div>
          <div class="bit-tag">${b.label}</div>
        </div>`;
    }).join("");
  }

  const bCont = document.getElementById("regBBits");
  if (bCont) {
    bCont.innerHTML = IOHWAB_DIAG_BITS.map((b) => {
      const on = (simState.regBByte & (1 << b.bit)) !== 0;
      const cls = on ? (b.bit === 0 ? "on warn-bit" : "on err-bit") : "";
      return `
        <div class="bit-box ${cls}" onclick="toggleRegisterBit('B', ${b.bit})" title="${b.full} (${b.hex}): ${b.desc}">
          <div class="bit-pos mono">b${b.bit}</div>
          <div class="bit-val mono">${on ? 1 : 0}</div>
          <div class="bit-tag">${b.label}</div>
        </div>`;
    }).join("");
  }
}

function renderMetersAndStateMachines() {
  const badge = document.getElementById("iohwabExecBadge");
  if (badge) {
    badge.textContent = `MainFn: ${simState.cfg.IoHwAbMainFunctionPeriodMs}ms | 5V_Ref: ${simState.cfg.IoHwAbSensorSupplyMeasuredMv}mV | DEM: ${simState.diagDebounceCount}/${simState.cfg.IoHwAbDiagDebounceTicks}`;
  }

  const meters = document.getElementById("metersGrid");
  if (meters) {
    const scgPct = clampVal(((Number(simState.cfg.IoHwAbAdcShortToGndThrMv) || 250) / 5000) * 100, 2, 20);
    const scbThr = Number(simState.cfg.IoHwAbAdcShortToBatThrMv) || 4750;
    const scbPct = clampVal(((5000 - scbThr) / 5000) * 100, 2, 20);
    const okPct = Math.max(10, 100 - scgPct - scbPct);
    const needlePct = clampVal((simState.adcPinMv / 5000) * 100, 0, 100);
    const pwmPct = clampVal((simState.pwmDutyHex / 0x8000) * 100, 0, 100);

    meters.innerHTML = `
      <div class="meter-card">
        <div class="meter-top">
          <span>🔌 ADC Diag Window (0..5000 mV)</span>
          <span class="mono">${simState.adcPinMv} mV</span>
        </div>
        <div class="win-bar">
          <div class="win-seg-gnd" style="width:${scgPct}%"></div>
          <div class="win-seg-ok" style="width:${okPct}%"></div>
          <div class="win-seg-bat" style="width:${scbPct}%"></div>
          <div class="win-needle" style="left:${needlePct}%"></div>
        </div>
        <div class="meter-sub mono">
          <span>SCG &lt;${simState.cfg.IoHwAbAdcShortToGndThrMv}mV</span>
          <span>Valid Range (500..4500mV)</span>
          <span>SCB &gt;${scbThr}mV</span>
        </div>
      </div>
      <div class="meter-card">
        <div class="meter-top">
          <span>⚙️ PWM 15-bit Duty (${simState.cfg.IoHwAbPwmDefaultPeriodHz}Hz)</span>
          <span class="mono">${toHex15(simState.pwmDutyHex)} (${pwmPct.toFixed(1)}%)</span>
        </div>
        <div class="win-bar">
          <div class="pwm-bar-fill" style="width:${pwmPct}%"></div>
        </div>
        <div class="meter-sub mono">
          <span>0x0000 (0%)</span>
          <span>Clamp: ${simState.cfg.IoHwAbPwmDutyClampEnable ? simState.cfg.IoHwAbPwmDutyClampRangePct : "OFF"}</span>
          <span>0x8000 (100%)</span>
        </div>
      </div>
    `;
  }

  const pipeLbl = document.getElementById("smPipeLbl");
  if (pipeLbl) pipeLbl.textContent = simState.initPhase;
  const pipeEl = document.getElementById("pipeSmDiagram");
  if (pipeEl) {
    const pStates = [
      { id: "UNINIT", title: "UNINIT", sub: "Bit7 INIT=0 / IDLE", cls: "active-err" },
      { id: "MCAL_READY", title: "MCAL_READY", sub: "Port/Adc/Pwm Init OK", cls: "active-warn" },
      { id: "RUNNING", title: "RUNNING", sub: "5ms Cyclic + RTE", cls: "active-ok" },
      { id: "DEINIT", title: "DEINIT", sub: "Shutdown Safe Idle", cls: "active-pur" }
    ];
    pipeEl.innerHTML = pStates.map((st) => `
      <div class="sm-node ${simState.initPhase === st.id ? st.cls : ""}">
        <div class="sm-node-hdr"><span>${st.title}</span><span>${simState.initPhase === st.id ? "●" : ""}</span></div>
        <div style="color:var(--mut);margin-top:2px">${st.sub}</div>
      </div>
    `).join("");
  }

  const diagLbl = document.getElementById("smDiagLbl");
  if (diagLbl) diagLbl.textContent = simState.diagMuxPhase;
  const diagEl = document.getElementById("diagSmDiagram");
  if (diagEl) {
    const dStates = [
      { id: "NORMAL_SWC", title: "NORMAL_SWC", sub: "SWC Controls Output", cls: "active-ok" },
      { id: "DCM_0x2F_OVERRIDE", title: "DCM_0x2F_OVR", sub: "UDS Tester Priority", cls: "active-warn" },
      { id: "DEM_DEBOUNCING", title: "DEM_FAULT", sub: "PreFail/Sub Val", cls: "active-pur" },
      { id: "FIM_SAFE_IDLE", title: "FIM_SAFE_IDLE", sub: "Highest ASIL Cutoff", cls: "active-err" }
    ];
    diagEl.innerHTML = dStates.map((st) => `
      <div class="sm-node ${simState.diagMuxPhase === st.id ? st.cls : ""}">
        <div class="sm-node-hdr"><span>${st.title}</span><span>${simState.diagMuxPhase === st.id ? "●" : ""}</span></div>
        <div style="color:var(--mut);margin-top:2px">${st.sub}</div>
      </div>
    `).join("");
  }
}

function renderSvgArchitecture() {
  const allMods = Object.keys(MODULES_INFO);
  allMods.forEach((m) => {
    const node = document.getElementById("node_" + m);
    if (!node) return;
    node.classList.toggle("selected", simState.activeModule === m);
    node.style.opacity = (!simState.activeModules.length || simState.activeModules.includes(m) || simState.activeModule === m) ? "1" : "0.62";
  });

  document.querySelectorAll("#iohwabArchSvg .flow-arrow").forEach((arr) => {
    arr.classList.toggle("active", simState.activeArrows.includes(arr.id));
  });

  const sApp = document.getElementById("svgSub_MOD_SWC_APP");
  if (sApp) sApp.textContent = `Target: ${simState.swcTargetDutyPct.toFixed(1)}% ${simState.swcTargetDir.slice(0, 3)}`;
  const sSa = document.getElementById("svgSub_MOD_SWC_SA");
  if (sSa) sSa.textContent = `Pedal: ${simState.adcOutPct.toFixed(1)}% | Brake: ${simState.dioLogicalState ? 1 : 0}`;
  const sDem = document.getElementById("svgSub_MOD_DEM_FIM");
  if (sDem) sDem.textContent = `DEM: ${simState.demStatus} | FiM: ${simState.fimPermission ? "ALLOW" : "INHIBIT"}`;
  const sDcm = document.getElementById("svgSub_MOD_DCM");
  if (sDcm) sDcm.textContent = `Mode: ${simState.dcmControlParam}`;
  const sRte = document.getElementById("svgSub_MOD_RTE");
  if (sRte) sRte.textContent = `C/S Ports | MainFn: ${simState.cfg.IoHwAbMainFunctionPeriodMs}ms`;
  const sIo1 = document.getElementById("svgSub_MOD_IOHWAB1");
  if (sIo1) sIo1.textContent = `Init: ${simState.initPhase} | 5V_Ref: ${simState.cfg.IoHwAbSensorSupplyMeasuredMv}mV | Qual: ${simState.signalQual}`;
  const sIo2 = document.getElementById("svgSub_MOD_IOHWAB2");
  if (sIo2) sIo2.textContent = `SigReg: ${toHex8(simState.regAByte)} | DiagReg: ${toHex8(simState.regBByte)} | PWM: ${toHex15(simState.pwmDutyHex)}`;
  const sBsw = document.getElementById("svgSub_MOD_BSWM_ECUM");
  if (sBsw) sBsw.textContent = `State: ${simState.initPhase} | SafeReq: ${simState.fimPermission ? "OFF" : "ON"}`;
  const sDet = document.getElementById("svgSub_MOD_DET");
  if (sDet) sDet.textContent = `Faults Logged: ${simState.detLogs.length} (${simState.detLogs.length ? "ALERT" : "OK"})`;
  const sDio = document.getElementById("svgSub_MOD_PORT_DIO");
  if (sDio) sDio.textContent = `P00.7: ${simState.dioPinLevel === "STD_LOW" ? "LOW" : "HIGH"} | ${simState.cfg.IoHwAbPortPinPullMode.replace("PORT_PIN_IN_", "")}`;
  const sAdc = document.getElementById("svgSub_MOD_ADC");
  if (sAdc) sAdc.textContent = `Raw: ${simState.adcRawCount}/${simState.adcMaxCount} (${simState.adcPinMv}mV)`;
  const sPwm = document.getElementById("svgSub_MOD_PWM");
  if (sPwm) sPwm.textContent = `${toHex15(simState.pwmDutyHex)} (${((simState.pwmDutyHex / 0x8000) * 100).toFixed(1)}% @ ${(simState.cfg.IoHwAbPwmDefaultPeriodHz / 1000).toFixed(1)}kHz)`;
  const sIcu = document.getElementById("svgSub_MOD_ICU");
  if (sIcu) sIcu.textContent = `${simState.icuFreqHz}Hz (${simState.icuRpm} RPM) | ${simState.actuatorCurrentMa}mA`;
}

function renderInspector() {
  const body = document.getElementById("inspBody");
  if (!body) return;
  const tab = simState.activeInspTab;

  if (tab === 0) {
    const scen = getCurrentScenario();
    const curStep = simState.currentStepIdx > 0 ? scen.steps[simState.currentStepIdx - 1] : null;
    body.innerHTML = `
      <div class="insp-card">
        <div class="insp-h">🎬 Trạng Thái Bước Hiện Tại (${simState.currentStepIdx}/${scen.steps.length})</div>
        <div style="font-size:12px;font-weight:700;margin-bottom:4px">${curStep ? curStep.title : scen.title}</div>
        <div style="font-size:11.5px;color:var(--txt-soft)">${curStep ? curStep.desc : scen.summary}</div>
      </div>
      <div class="insp-card">
        <div class="insp-h">📡 Snapshot 4 Kênh &amp; Thanh Ghi</div>
        <div class="mono" style="font-size:11px;line-height:1.55">
          SigReg (A): <b>${toHex8(simState.regAByte)}</b> | DiagReg (B): <b>${toHex8(simState.regBByte)}</b><br/>
          CH0 Pedal : <b>${simState.adcOutPct.toFixed(1)}%</b> (Raw ${simState.adcRawCount}, ${simState.adcPinMv}mV)<br/>
          CH1 Brake : <b>${simState.dioLogicalState ? "TRUE" : "FALSE"}</b> (${simState.dioPinLevel})<br/>
          CH2 PWM   : <b>${toHex15(simState.pwmDutyHex)}</b> (${simState.pwmSourceOwner})<br/>
          CH3 ICU   : <b>${simState.icuRpm} RPM</b> (${simState.icuFreqHz} Hz)<br/>
          DEM/FiM   : <b>${simState.demStatus}</b> (${simState.diagDebounceCount}/${simState.cfg.IoHwAbDiagDebounceTicks}) | FiM=<b>${simState.fimPermission ? "ALLOW" : "INHIBIT"}</b>
        </div>
      </div>
      ${simState.detLogs.length ? `<div class="insp-card" style="border-color:var(--err)"><div class="insp-h" style="color:var(--err)">🚨 Lỗi DET Mới Nhất</div><div class="mono" style="font-size:11px">${simState.detLogs[0].errCode}: ${simState.detLogs[0].desc}</div></div>` : ""}
    `;
  } else if (tab === 1) {
    const m = MODULES_INFO[simState.activeModule] || MODULES_INFO.MOD_IOHWAB;
    const pills = Object.keys(MODULES_INFO).map((k) =>
      `<button class="mod-pill ${simState.activeModule === k ? "active" : ""}" onclick="selectModule('${k}')">${k.replace("MOD_", "")}</button>`
    ).join("");
    body.innerHTML = `
      <div class="mod-list">${pills}</div>
      <div class="insp-card">
        <div class="insp-h">${m.name}</div>
        <div style="font-size:10.5px;color:var(--cyan);font-weight:700;margin-bottom:6px">${m.layer} · ${m.sws}</div>
        <p style="font-size:11.5px;margin-bottom:6px"><b>Vai trò:</b> ${m.role}</p>
        <p style="font-size:11.5px;margin-bottom:6px"><b>📥 Input nhận vào:</b> ${m.inputs}</p>
        <p style="font-size:11.5px"><b>📤 Output xuất ra:</b> ${m.outputs}</p>
      </div>
    `;
  } else if (tab === 2) {
    const liveC = `/* === IoHwAb Live C Execution (${simState.currentScenarioId}) === */
${simState.lastCStatement}

/* --- Cyclic IoHwAb_MainFunction (${simState.cfg.IoHwAbMainFunctionPeriodMs}ms) --- */
void IoHwAb_MainFunction(void) {
  /* 1. Analog CH0 (Res=${simState.cfg.AdcResolutionBits}-bit, Ratio=${simState.cfg.IoHwAbEnableRatiometricCompensation}) */
  Adc_ReadGroup(ADC_GRP_PEDAL, &AdcRaw); // Raw=${simState.adcRawCount} (${simState.adcPinMv}mV)
  V_comp = ${simState.adcCompMv.toFixed(1)}f; // V5V=${simState.cfg.IoHwAbSensorSupplyMeasuredMv}mV
  PedalPct = ${simState.adcOutPct.toFixed(1)}f; // Qual=${simState.signalQual}

  /* 2. Actuator Multiplexer Priority Chain */
  if (${simState.cfg.IoHwAbEnableFiMSafeStateCheck} && !FiM_GetFunctionPermission(FID_THROTTLE)) {
    Pwm_SetOutputToIdle(PWM_CH_THROTTLE); /* Safety Idle */
  } else if (ISENSE_mA > ${simState.cfg.IoHwAbActuatorOverCurrentLimitMa}) {
    Pwm_SetOutputToIdle(PWM_CH_THROTTLE); /* OverCurrent=${simState.actuatorCurrentMa}mA */
  } else {
    Pwm_SetDutyCycle(PWM_CH_THROTTLE, ${toHex15(simState.pwmDutyHex)}); /* ${simState.pwmSourceOwner} */
  }
}`;
    body.innerHTML = `<div class="insp-card"><div class="insp-h">📄 Mã Nguồn C AUTOSAR Chuẩn Thực Thi Trực Tiếp</div><pre class="code-block mono">${liveC}</pre></div>`;
  } else {
    const items = simState.apiTrace.length
      ? simState.apiTrace.map((tr) => {
          const cls = tr.dir === "DET" || tr.dir === "SAFE" ? "err" : tr.dir === "DIAG" || tr.dir === "UDS" ? "warn" : "ok";
          return `<div class="trace-item ${cls}"><div class="mono" style="font-size:10px;color:var(--mut)">[${tr.t}ms] ${tr.dir} · ${tr.caller} → <b>${tr.callee}</b></div><div>${tr.msg}</div></div>`;
        }).join("")
      : `<div class="insp-card">Chưa có trace mới. Hãy bấm Bước Tiếp, +5ms hoặc các nút Thao Tác Nhanh!</div>`;
    body.innerHTML = items;
  }
}

// -------------------- HOVER TOOLTIP (> 1.05s) FOR ECUC PARAMETERS --------------------

function showConfigTooltip(key, rect) {
  const info = configTooltipData[key];
  const popup = document.getElementById("cfgTooltipPopup");
  if (!info || !popup) return;

  popup.innerHTML = `
    <div class="tt-hdr">
      <span class="tt-title">${info.title}</span>
      <span class="tt-meta">${info.badge}</span>
    </div>
    <div class="tt-sec"><b>Thuộc tính:</b> <span class="mono">${info.type}</span> · Mặc định: <span class="mono">${info.defaultVal}</span> · SWS: <span class="mono">${info.swsId}</span></div>
    <div class="tt-sec"><b>Ý nghĩa:</b> ${info.meaning}</div>
    <div class="tt-sec"><b>Tác động mô phỏng:</b> ${info.effect}</div>
    <div class="tt-sec"><b>Liên kết &amp; Phụ thuộc:</b> ${info.dependency}</div>
  `;
  popup.classList.add("show");

  const top = Math.min(window.innerHeight - 230, Math.max(12, rect.top));
  const left = Math.min(window.innerWidth - 420, rect.right + 10);
  popup.style.top = top + "px";
  popup.style.left = left + "px";
}

function hideConfigTooltip() {
  if (tooltipTimer) {
    clearTimeout(tooltipTimer);
    tooltipTimer = null;
  }
  document.getElementById("cfgTooltipPopup")?.classList.remove("show");
}

function initConfigTooltips() {
  document.querySelectorAll(".cfg-row[data-cfg-key]").forEach((row) => {
    const key = row.getAttribute("data-cfg-key");
    row.addEventListener("mouseenter", () => {
      hideConfigTooltip();
      tooltipTimer = setTimeout(() => {
        showConfigTooltip(key, row.getBoundingClientRect());
      }, 1050);
    });
    row.addEventListener("mouseleave", hideConfigTooltip);
    row.querySelector(".cfg-i")?.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      showConfigTooltip(key, row.getBoundingClientRect());
    });
  });
}

// -------------------- EXPORT ARXML / C / JSON & STANDALONE HTML --------------------

function buildExportContent(tabIdx) {
  const c = simState.cfg;
  const [g, o] = parseGainOffsetStr(c.IoHwAbPcbVoltageDividerGainOffset, 0.025, -12.5);
  const [cMin, cMax] = parseRangeStr(c.IoHwAbPwmDutyClampRangePct, 5, 95);
  const [sMin, sMax] = parseRangeStr(c.IoHwAbSupplyValidWindowMv, 4750, 5250);

  if (tabIdx === 0) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<AUTOSAR xmlns="http://autosar.org/schema/r4.0">
  <AR-PACKAGES>
    <AR-PACKAGE>
      <SHORT-NAME>IoHwAb_EcucConfig</SHORT-NAME>
      <ELEMENTS>
        <ECUC-MODULE-CONFIGURATION-VALUES>
          <SHORT-NAME>IoHwAb</SHORT-NAME>
          <CONTAINERS>
            <ECUC-CONTAINER-VALUE>
              <SHORT-NAME>IoHwAbGeneral</SHORT-NAME>
              <PARAMETER-VALUES>
                <ECUC-BOOLEAN-PARAM-VALUE><DEFINITION-REF>IoHwAbDevErrorDetect</DEFINITION-REF><VALUE>${c.IoHwAbDevErrorDetect ? 1 : 0}</VALUE></ECUC-BOOLEAN-PARAM-VALUE>
                <ECUC-BOOLEAN-PARAM-VALUE><DEFINITION-REF>IoHwAbVersionInfoApi</DEFINITION-REF><VALUE>${c.IoHwAbVersionInfoApi ? 1 : 0}</VALUE></ECUC-BOOLEAN-PARAM-VALUE>
                <ECUC-FLOAT-PARAM-VALUE><DEFINITION-REF>IoHwAbMainFunctionPeriod</DEFINITION-REF><VALUE>${(c.IoHwAbMainFunctionPeriodMs / 1000).toFixed(3)}</VALUE></ECUC-FLOAT-PARAM-VALUE>
                <ECUC-INTEGER-PARAM-VALUE><DEFINITION-REF>IoHwAbAdcResolutionBits</DEFINITION-REF><VALUE>${c.AdcResolutionBits}</VALUE></ECUC-INTEGER-PARAM-VALUE>
                <ECUC-BOOLEAN-PARAM-VALUE><DEFINITION-REF>IoHwAbEnableRatiometricComp</DEFINITION-REF><VALUE>${c.IoHwAbEnableRatiometricCompensation ? 1 : 0}</VALUE></ECUC-BOOLEAN-PARAM-VALUE>
                <ECUC-FLOAT-PARAM-VALUE><DEFINITION-REF>IoHwAbAdcIirAlpha</DEFINITION-REF><VALUE>${c.IoHwAbAdcIirAlphaCoeff}</VALUE></ECUC-FLOAT-PARAM-VALUE>
                <ECUC-INTEGER-PARAM-VALUE><DEFINITION-REF>IoHwAbPwmDefaultPeriodHz</DEFINITION-REF><VALUE>${c.IoHwAbPwmDefaultPeriodHz}</VALUE></ECUC-INTEGER-PARAM-VALUE>
                <ECUC-BOOLEAN-PARAM-VALUE><DEFINITION-REF>IoHwAbEnableFiMSafeStateCheck</DEFINITION-REF><VALUE>${c.IoHwAbEnableFiMSafeStateCheck ? 1 : 0}</VALUE></ECUC-BOOLEAN-PARAM-VALUE>
                <ECUC-BOOLEAN-PARAM-VALUE><DEFINITION-REF>IoHwAbEnableDcm0x2FControl</DEFINITION-REF><VALUE>${c.IoHwAbEnableDcm0x2FControl ? 1 : 0}</VALUE></ECUC-BOOLEAN-PARAM-VALUE>
              </PARAMETER-VALUES>
            </ECUC-CONTAINER-VALUE>
          </CONTAINERS>
        </ECUC-MODULE-CONFIGURATION-VALUES>
      </ELEMENTS>
    </AR-PACKAGE>
  </AR-PACKAGES>
</AUTOSAR>`;
  }
  if (tabIdx === 1) {
    return `#ifndef IOHWAB_CFG_H
#define IOHWAB_CFG_H

#define IOHWAB_MODULE_ID                     (254U)
#define IOHWAB_DEV_ERROR_DETECT              (${c.IoHwAbDevErrorDetect ? "STD_ON" : "STD_OFF"})
#define IOHWAB_VERSION_INFO_API              (${c.IoHwAbVersionInfoApi ? "STD_ON" : "STD_OFF"})
#define IOHWAB_MAIN_FUNCTION_PERIOD_MS       (${c.IoHwAbMainFunctionPeriodMs}U)
#define IOHWAB_SUPPLY_MIN_MV                 (${sMin}U)
#define IOHWAB_SUPPLY_MAX_MV                 (${sMax}U)
#define IOHWAB_DIO_DEBOUNCE_ENABLE           (${c.IoHwAbDioDebounceEnable ? "STD_ON" : "STD_OFF"})
#define IOHWAB_DIO_DEBOUNCE_TIME_MS          (${c.IoHwAbDioDebounceTimeMs}U)
#define IOHWAB_DIO_READBACK_VERIFY           (${c.IoHwAbDioOutputReadbackVerify ? "STD_ON" : "STD_OFF"})
#define IOHWAB_ADC_MAX_COUNT                 (${c.AdcResolutionBits === "10" ? "1023U" : "4095U"})
#define IOHWAB_RATIOMETRIC_COMP_ENABLE       (${c.IoHwAbEnableRatiometricCompensation ? "STD_ON" : "STD_OFF"})
#define IOHWAB_IIR_FILTER_ENABLE             (${c.IoHwAbAdcIirFilterEnable ? "STD_ON" : "STD_OFF"})
#define IOHWAB_IIR_ALPHA_COEFF               (${c.IoHwAbAdcIirAlphaCoeff}f)
#define IOHWAB_PWM_CLAMP_MIN_PCT             (${cMin}f)
#define IOHWAB_PWM_CLAMP_MAX_PCT             (${cMax}f)
#define IOHWAB_ICU_SPEED_TEETH_COUNT         (${c.IoHwAbSpeedSensorTeethCount}U)
#define IOHWAB_ADC_SHORT_GND_THR_MV          (${c.IoHwAbAdcShortToGndThrMv}U)
#define IOHWAB_ADC_SHORT_BAT_THR_MV          (${c.IoHwAbAdcShortToBatThrMv}U)
#define IOHWAB_OVER_CURRENT_LIMIT_MA         (${c.IoHwAbActuatorOverCurrentLimitMa}U)
#define IOHWAB_FIM_SAFESTATE_CHECK           (${c.IoHwAbEnableFiMSafeStateCheck ? "STD_ON" : "STD_OFF"})
#define IOHWAB_DCM_0X2F_ENABLE               (${c.IoHwAbEnableDcm0x2FControl ? "STD_ON" : "STD_OFF"})

#endif /* IOHWAB_CFG_H */`;
  }
  if (tabIdx === 2) {
    return `#include "IoHwAb.h"

const IoHwAb_ConfigType IoHwAb_Config = {
  .dioPolarity         = ${c.IoHwAbDioActivePolarity},
  .adcTriggerSrc       = ${c.AdcGroupTriggSrc},
  .pedalGain           = ${g}f,
  .pedalOffset         = ${o}f,
  .pwmDefaultPeriodHz  = ${c.IoHwAbPwmDefaultPeriodHz}UL,
  .hBridgeDriveMode    = ${c.IoHwAbHBridgeDriveMode},
  .icuMode             = ${c.IcuMeasurementMode},
  .icuStartEdge        = ${c.IcuDefaultStartEdge},
  .icuTimeoutMs        = ${c.IoHwAbIcuTimeoutMs}U,
  .substStrategy       = ${c.IoHwAbFaultSubstStrategy},
  .replacementPct      = ${c.IoHwAbSensorReplacementValuePct}f,
  .diagDebounceTicks   = ${c.IoHwAbDiagDebounceTicks}U
};`;
  }
  return JSON.stringify({
    module: "IoHwAb",
    ecucParameters: c,
    registers: { regA_SignalStatus: toHex8(simState.regAByte), regB_DiagControl: toHex8(simState.regBByte) },
    runtime: {
      pedalOutPct: Number(simState.adcOutPct.toFixed(2)),
      brakeLogical: simState.dioLogicalState,
      pwmDutyHex: toHex15(simState.pwmDutyHex),
      wheelRpm: simState.icuRpm,
      demStatus: simState.demStatus
    }
  }, null, 2);
}

function openExportModal() {
  document.getElementById("exportModal")?.classList.remove("hidden");
  switchExportTab(currentExportTab);
}

function closeExportModal() {
  document.getElementById("exportModal")?.classList.add("hidden");
}

function switchExportTab(idx) {
  currentExportTab = idx;
  for (let i = 0; i < 4; i++) {
    document.getElementById("expTab" + i)?.classList.toggle("btn-pri", i === idx);
  }
  const area = document.getElementById("exportCodeArea");
  if (area) area.textContent = buildExportContent(idx);
}

function copyExportCode() {
  const txt = document.getElementById("exportCodeArea")?.textContent || "";
  if (navigator.clipboard) navigator.clipboard.writeText(txt).catch(() => {});
}

function downloadExportCode() {
  const names = ["IoHwAb.arxml", "IoHwAb_Cfg.h", "IoHwAb_Lcfg.c", "IoHwAb_Config.json"];
  const txt = document.getElementById("exportCodeArea")?.textContent || "";
  const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = names[currentExportTab] || "IoHwAb_Config.txt";
  a.click();
  URL.revokeObjectURL(a.href);
}

function downloadStandaloneHTML() {
  const docHtml = "<!DOCTYPE html>\n" + document.documentElement.outerHTML;
  const blob = new Blob([docHtml], { type: "text/html;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "AUTOSAR_IoHwAb_Simulator.html";
  a.click();
  URL.revokeObjectURL(a.href);
}
