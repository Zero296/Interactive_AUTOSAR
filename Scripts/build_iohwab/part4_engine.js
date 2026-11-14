// ==================== PART 4: CONFIGURATION DEFAULTS, STATE MODEL & IOHWAB COMPUTATION ENGINE ====================

const defaultConfig = {
  // Tab 0: 1. General
  IoHwAbInitialized: true,
  IoHwAbDevErrorDetect: true,
  IoHwAbVersionInfoApi: false,
  IoHwAbMainFunctionPeriodMs: 5,
  IoHwAbSensorSupplyMeasuredMv: 5000,
  IoHwAbSupplyValidWindowMv: "4750 .. 5250",

  // Tab 1: 2. Digital DIO
  IoHwAbDioActivePolarity: "ACTIVE_LOW",
  IoHwAbDioDebounceEnable: true,
  IoHwAbDioDebounceTimeMs: 15,
  IoHwAbPortPinPullMode: "PORT_PIN_IN_PULL_UP",
  IoHwAbDioOutputReadbackVerify: true,
  PortPinDirectionChangeable: false,

  // Tab 2: 3. Analog ADC
  AdcGroupTriggSrc: "ADC_TRIGG_SRC_SW",
  AdcResolutionBits: "12",
  IoHwAbEnableRatiometricCompensation: true,
  IoHwAbPcbVoltageDividerGainOffset: "0.025 / -12.5",
  IoHwAbAdcIirFilterEnable: true,
  IoHwAbAdcIirAlphaCoeff: 0.4,

  // Tab 3: 4. PWM Bridge
  IoHwAbPwmDefaultPeriodHz: 2000,
  IoHwAbPwmDutyClampEnable: true,
  IoHwAbPwmDutyClampRangePct: "5.0 .. 95.0",
  PwmPolarityAndIdleState: "PWM_HIGH / IDLE_LOW",
  PwmDutycycleUpdatedEndperiod: true,
  IoHwAbHBridgeDriveMode: "PWM_PLUS_DIR_AND_EN",

  // Tab 4: 5. ICU Capture
  IcuMeasurementMode: "ICU_MODE_SIGNAL_MEASUREMENT",
  IcuDefaultStartEdge: "ICU_RISING_EDGE",
  IoHwAbSpeedSensorTeethCount: 20,
  IoHwAbIcuTimeoutMs: 50,

  // Tab 5: 6. Diag & 0x2F
  IoHwAbAdcShortToGndThrMv: 250,
  IoHwAbAdcShortToBatThrMv: 4750,
  IoHwAbActuatorOverCurrentLimitMa: 8000,
  IoHwAbFaultSubstStrategy: "USE_REPLACEMENT_VALUE",
  IoHwAbSensorReplacementValuePct: 10,
  IoHwAbDiagDebounceTicks: 3,
  IoHwAbEnableFiMSafeStateCheck: true,
  IoHwAbEnableDcm0x2FControl: true
};

const simState = {
  cfg: { ...defaultConfig },
  clockMs: 0,
  autoClockTimer: null,
  scenAutoPlayTimer: null,
  currentScenarioId: "S4",
  currentStepIdx: 0,
  stepSnapshots: [],
  activeInspTab: 0,
  activeCfgTab: 0,
  activeModule: "MOD_IOHWAB",
  selectedChannel: "CH0_ADC_PedalPos",

  // Module lifecycle & diagnostic phase
  initPhase: "RUNNING",        // UNINIT | MCAL_READY | RUNNING | DEINIT
  mcalInitMask: { PORT: true, ADC: true, PWM: true, ICU: true },
  diagMuxPhase: "NORMAL_SWC",  // NORMAL_SWC | DCM_0x2F_OVERRIDE | DEM_DEBOUNCING | FIM_SAFE_IDLE

  // CH0 ADC Pedal Sensor physics
  adcPinMv: 2500,
  adcMaxCount: 4095,
  adcRawCount: 2048,
  adcCompMv: 2500,
  adcInstPct: 50.0,
  adcFilteredPct: 50.0,
  adcLastValidPct: 50.0,
  adcOutPct: 50.0,
  adcGroupBusy: false,
  iirSettled: true,

  // CH1 DIO Brake Switch physics & Relay Output Readback
  dioPinLevel: "STD_HIGH",     // STD_HIGH | STD_LOW
  dioRawActive: false,
  dioLogicalState: false,
  dioDebounceElapsedMs: 15,
  dioDebouncing: false,
  dioRelayExpected: "STD_LOW",
  dioRelayReadback: "STD_LOW",
  dioReadbackMismatch: false,

  // CH2 PWM Throttle H-Bridge physics
  swcTargetDutyPct: 50.0,
  swcTargetDir: "FORWARD",
  pwmRequestedPct: 50.0,
  pwmClamped: false,
  pwmSourceOwner: "SWC_App",
  pwmDutyHex: 0x4000,
  pwmPeriodUs: 500,
  pwmOutToIdle: false,
  actuatorCurrentMa: 2400,
  faultOpenLoad: false,

  // CH3 ICU Wheel Speed physics (1 MHz timer tick)
  icuFreqHz: 500,
  icuDutyPct: 40.0,
  icuPeriodTicks: 2000,
  icuActiveTicks: 800,
  icuRpm: 1500,
  icuSilentMs: 0,
  icuCaptureActive: true,

  // Diag / DEM / FiM / DCM 0x2F
  faultShortGnd: false,
  faultShortBat: false,
  faultOverCurrent: false,
  faultSupply5v: false,
  diagDebounceCount: 0,
  demStatus: "PASSED",         // PASSED | PREFAILED | FAILED
  fimPermission: true,
  dcmControlParam: "RETURN_TO_ECU", // RETURN_TO_ECU | RESET_TO_DEFAULT | FREEZE_CURRENT_STATE | SHORT_TERM_ADJUSTMENT
  dcmOverridePct: 80.0,
  dcmFreezePct: 50.0,
  dcmSessionIdleMs: 0,

  // Overall Signal Quality & Registers
  signalQual: "GOOD",          // GOOD | DEGRADED | FAULT
  regAByte: 0xFB,
  regBByte: 0x00,

  // Active highlights & traces
  activeModules: ["MOD_SWC_SA", "MOD_RTE", "MOD_IOHWAB", "MOD_ADC", "MOD_PWM"],
  activeArrows: ["arr_sa_rte", "arr_rte_iohwab", "arr_adc_iohwab", "arr_iohwab_pwm"],
  apiTrace: [],
  detLogs: [],
  lastCStatement: "IoHwAb_PedalSensor_GetPhysVal(&PedalPct, &Qual); // -> 50.0% GOOD\nIoHwAb_ThrottleAct_SetDuty(50.0f, DIR_FWD); // -> Pwm_SetDutyCycle(CH_THROTTLE, 0x4000);"
};

// -------------------- PARSING & MATH HELPERS --------------------

function clampVal(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function parseRangeStr(str, defLo, defHi) {
  if (typeof str !== "string") return [defLo, defHi];
  const nums = str.match(/-?\d+(\.\d+)?/g);
  if (!nums || nums.length < 2) return [defLo, defHi];
  const a = parseFloat(nums[0]);
  const b = parseFloat(nums[1]);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a > b) return [defLo, defHi];
  return [a, b];
}

function parseGainOffsetStr(str, defGain, defOffset) {
  if (typeof str !== "string") return [defGain, defOffset];
  const nums = str.match(/-?\d+(\.\d+)?/g);
  if (!nums || nums.length < 2) return [defGain, defOffset];
  const g = parseFloat(nums[0]);
  const o = parseFloat(nums[1]);
  if (!Number.isFinite(g) || !Number.isFinite(o)) return [defGain, defOffset];
  return [g, o];
}

function toHex8(b) {
  return "0x" + ((b & 0xFF).toString(16).toUpperCase().padStart(2, "0"));
}

function toHex15(val) {
  return "0x" + (clampVal(Math.round(val), 0, 0x8000).toString(16).toUpperCase().padStart(4, "0"));
}

function createInitialSimState() {
  simState.cfg = { ...defaultConfig };
  simState.clockMs = 0;
  simState.initPhase = "RUNNING";
  simState.mcalInitMask = { PORT: true, ADC: true, PWM: true, ICU: true };
  simState.diagMuxPhase = "NORMAL_SWC";

  simState.adcPinMv = 2500;
  simState.adcMaxCount = 4095;
  simState.adcRawCount = 2048;
  simState.adcCompMv = 2500;
  simState.adcInstPct = 50.0;
  simState.adcFilteredPct = 50.0;
  simState.adcLastValidPct = 50.0;
  simState.adcOutPct = 50.0;
  simState.adcGroupBusy = false;
  simState.iirSettled = true;

  simState.dioPinLevel = "STD_HIGH";
  simState.dioRawActive = false;
  simState.dioLogicalState = false;
  simState.dioDebounceElapsedMs = 15;
  simState.dioDebouncing = false;
  simState.dioRelayExpected = "STD_LOW";
  simState.dioRelayReadback = "STD_LOW";
  simState.dioReadbackMismatch = false;

  simState.swcTargetDutyPct = 50.0;
  simState.swcTargetDir = "FORWARD";
  simState.pwmRequestedPct = 50.0;
  simState.pwmClamped = false;
  simState.pwmSourceOwner = "SWC_App";
  simState.pwmDutyHex = 0x4000;
  simState.pwmPeriodUs = 500;
  simState.pwmOutToIdle = false;
  simState.actuatorCurrentMa = 2400;
  simState.faultOpenLoad = false;

  simState.icuFreqHz = 500;
  simState.icuDutyPct = 40.0;
  simState.icuPeriodTicks = 2000;
  simState.icuActiveTicks = 800;
  simState.icuRpm = 1500;
  simState.icuSilentMs = 0;
  simState.icuCaptureActive = true;

  simState.faultShortGnd = false;
  simState.faultShortBat = false;
  simState.faultOverCurrent = false;
  simState.faultSupply5v = false;
  simState.diagDebounceCount = 0;
  simState.demStatus = "PASSED";
  simState.fimPermission = true;
  simState.dcmControlParam = "RETURN_TO_ECU";
  simState.dcmOverridePct = 80.0;
  simState.dcmFreezePct = 50.0;
  simState.dcmSessionIdleMs = 0;

  simState.signalQual = "GOOD";
  simState.activeModules = ["MOD_SWC_SA", "MOD_RTE", "MOD_IOHWAB", "MOD_ADC", "MOD_PWM"];
  simState.activeArrows = ["arr_sa_rte", "arr_rte_iohwab", "arr_adc_iohwab", "arr_iohwab_pwm"];
  simState.apiTrace = [];
  simState.detLogs = [];

  recomputeIoHwAbEngine({ stepFilter: false });
}

// -------------------- LOGGING & DIAGNOSTIC TRACE --------------------

function logApiTrace(dir, caller, callee, msg) {
  const entry = {
    t: simState.clockMs,
    dir,
    caller,
    callee,
    msg
  };
  simState.apiTrace.unshift(entry);
  if (simState.apiTrace.length > 60) simState.apiTrace.pop();
}

function logDetError(apiId, errCode, desc) {
  if (!simState.cfg.IoHwAbDevErrorDetect) return;
  simState.detLogs.unshift({
    t: simState.clockMs,
    modId: 254,
    instId: 0,
    apiId,
    errCode,
    desc
  });
  if (simState.detLogs.length > 30) simState.detLogs.pop();
  logApiTrace("DET", "IoHwAb", "Det_ReportError", `Mod=254 Api=${apiId} Err=${errCode} (${desc})`);
}

// -------------------- CORE COMPUTATION ENGINE --------------------

function recomputeIoHwAbEngine(opts = {}) {
  const stepFilter = opts.stepFilter !== false;
  const cfg = simState.cfg;

  // 1. Initialization guard
  const isInit = !!cfg.IoHwAbInitialized && simState.initPhase === "RUNNING";
  if (!cfg.IoHwAbInitialized && simState.initPhase === "RUNNING") {
    simState.initPhase = "UNINIT";
  } else if (cfg.IoHwAbInitialized && simState.initPhase === "UNINIT") {
    simState.initPhase = "RUNNING";
  }

  // 2. 5V Ratiometric supply check
  const [supMin, supMax] = parseRangeStr(cfg.IoHwAbSupplyValidWindowMv, 4750, 5250);
  const v5v = clampVal(Number(cfg.IoHwAbSensorSupplyMeasuredMv) || 5000, 1000, 6500);
  simState.faultSupply5v = (v5v < supMin || v5v > supMax);

  // 3. ADC quantization & Ratiometric scaling
  const resBits = parseInt(cfg.AdcResolutionBits, 10) || 12;
  const maxCnt = resBits === 10 ? 1023 : 4095;
  simState.adcMaxCount = maxCnt;

  const pinMv = clampVal(Number(simState.adcPinMv) || 0, 0, 5000);
  simState.adcRawCount = Math.round((pinMv / 5000) * maxCnt);

  const ratiometricActive = !!cfg.IoHwAbEnableRatiometricCompensation && !simState.faultSupply5v && v5v > 100;
  simState.adcCompMv = ratiometricActive ? (pinMv * (5000 / v5v)) : pinMv;

  const [gain, offset] = parseGainOffsetStr(cfg.IoHwAbPcbVoltageDividerGainOffset, 0.025, -12.5);
  simState.adcInstPct = clampVal(simState.adcCompMv * gain + offset, 0.0, 100.0);

  // 4. ADC Electrical Fault Detection & DEM Debounce
  const scgThr = Number(cfg.IoHwAbAdcShortToGndThrMv) || 250;
  const scbThr = Number(cfg.IoHwAbAdcShortToBatThrMv) || 4750;
  simState.faultShortGnd = (pinMv < scgThr);
  simState.faultShortBat = (pinMv > scbThr);

  const ocLimit = Number(cfg.IoHwAbActuatorOverCurrentLimitMa) || 8000;
  simState.faultOverCurrent = (Number(simState.actuatorCurrentMa) > ocLimit);
  if (cfg.IoHwAbDioOutputReadbackVerify && simState.dioRelayExpected !== simState.dioRelayReadback) {
    simState.dioReadbackMismatch = true;
  } else {
    simState.dioReadbackMismatch = false;
  }

  const anyElectricalFault = simState.faultShortGnd || simState.faultShortBat || simState.faultOverCurrent || simState.faultOpenLoad || simState.dioReadbackMismatch;
  const maxDebounce = Math.max(1, parseInt(cfg.IoHwAbDiagDebounceTicks, 10) || 3);

  if (!opts.preserveDebounce) {
    if (anyElectricalFault) {
      if (stepFilter) {
        simState.diagDebounceCount = Math.min(maxDebounce, simState.diagDebounceCount + 1);
      }
    } else if (stepFilter && simState.diagDebounceCount > 0) {
      simState.diagDebounceCount = Math.max(0, simState.diagDebounceCount - 1);
    }
  }

  if (anyElectricalFault) {
    simState.demStatus = simState.diagDebounceCount >= maxDebounce ? "FAILED" : "PREFAILED";
  } else if (simState.diagDebounceCount > 0) {
    simState.demStatus = "PREPASSED";
  } else {
    simState.demStatus = "PASSED";
  }

  // 5. ADC IIR EMA Filtering & Substitution
  const alpha = clampVal(parseFloat(cfg.IoHwAbAdcIirAlphaCoeff) || 0.4, 0.05, 1.0);
  if (!cfg.IoHwAbAdcIirFilterEnable || alpha >= 0.999) {
    simState.adcFilteredPct = simState.adcInstPct;
    simState.iirSettled = true;
  } else {
    if (stepFilter && !simState.adcGroupBusy && !simState.faultShortGnd && !simState.faultShortBat) {
      simState.adcFilteredPct = alpha * simState.adcInstPct + (1 - alpha) * simState.adcFilteredPct;
    }
    simState.iirSettled = Math.abs(simState.adcInstPct - simState.adcFilteredPct) < 0.5;
  }

  const sensorFaultConfirmed = (simState.faultShortGnd || simState.faultShortBat) && simState.demStatus === "FAILED";
  if (!simState.faultShortGnd && !simState.faultShortBat && !simState.faultSupply5v && !simState.adcGroupBusy) {
    simState.adcLastValidPct = simState.adcFilteredPct;
  }

  if (sensorFaultConfirmed) {
    if (cfg.IoHwAbFaultSubstStrategy === "USE_REPLACEMENT_VALUE") {
      simState.adcOutPct = clampVal(parseFloat(cfg.IoHwAbSensorReplacementValuePct) || 10.0, 0, 100);
    } else if (cfg.IoHwAbFaultSubstStrategy === "HOLD_LAST_VALID_VALUE") {
      simState.adcOutPct = simState.adcLastValidPct;
    } else {
      simState.adcOutPct = simState.adcInstPct;
    }
  } else {
    simState.adcOutPct = simState.adcFilteredPct;
  }

  // 6. DIO Polarity Inversion & Contact Debounce
  const rawActive = cfg.IoHwAbDioActivePolarity === "ACTIVE_LOW"
    ? (simState.dioPinLevel === "STD_LOW")
    : (simState.dioPinLevel === "STD_HIGH");
  simState.dioRawActive = rawActive;

  const dbncTarget = Math.max(0, parseInt(cfg.IoHwAbDioDebounceTimeMs, 10) || 15);
  const periodMs = Math.max(1, parseInt(cfg.IoHwAbMainFunctionPeriodMs, 10) || 5);
  if (!cfg.IoHwAbDioDebounceEnable || dbncTarget === 0) {
    simState.dioLogicalState = rawActive;
    simState.dioDebounceElapsedMs = dbncTarget;
    simState.dioDebouncing = false;
  } else {
    if (rawActive !== simState.dioLogicalState) {
      if (stepFilter) {
        simState.dioDebounceElapsedMs += periodMs;
      }
      if (simState.dioDebounceElapsedMs >= dbncTarget) {
        simState.dioLogicalState = rawActive;
        simState.dioDebouncing = false;
      } else {
        simState.dioDebouncing = true;
      }
    } else {
      simState.dioDebounceElapsedMs = dbncTarget;
      simState.dioDebouncing = false;
    }
  }

  // 7. Actuator / PWM Multiplexer (Strict ISO 26262 Safety Priority)
  const [clampMin, clampMax] = parseRangeStr(cfg.IoHwAbPwmDutyClampRangePct, 5.0, 95.0);
  const freqHz = Math.max(100, parseInt(cfg.IoHwAbPwmDefaultPeriodHz, 10) || 2000);
  simState.pwmPeriodUs = Math.round(1000000 / freqHz);

  const fimBlocked = !!cfg.IoHwAbEnableFiMSafeStateCheck && !simState.fimPermission;
  const dcmActive = !!cfg.IoHwAbEnableDcm0x2FControl && (simState.dcmControlParam === "SHORT_TERM_ADJUSTMENT" || simState.dcmControlParam === "FREEZE_CURRENT_STATE" || simState.dcmControlParam === "RESET_TO_DEFAULT");

  if (!isInit) {
    simState.pwmSourceOwner = "UNINIT (IDLE)";
    simState.pwmRequestedPct = 0;
    simState.pwmClamped = false;
    simState.pwmOutToIdle = true;
    simState.pwmDutyHex = 0x0000;
  } else if (fimBlocked) {
    simState.pwmSourceOwner = "FiM Safe-State (IDLE)";
    simState.pwmRequestedPct = 0;
    simState.pwmClamped = false;
    simState.pwmOutToIdle = true;
    simState.pwmDutyHex = 0x0000;
  } else if (simState.faultOverCurrent) {
    simState.pwmSourceOwner = "Over-Current Trip (IDLE)";
    simState.pwmRequestedPct = 0;
    simState.pwmClamped = false;
    simState.pwmOutToIdle = true;
    simState.pwmDutyHex = 0x0000;
  } else {
    simState.pwmOutToIdle = false;
    let rawCmd = simState.swcTargetDutyPct;
    if (dcmActive) {
      if (simState.dcmControlParam === "SHORT_TERM_ADJUSTMENT") {
        simState.pwmSourceOwner = "DCM 0x2F (Adj)";
        rawCmd = simState.dcmOverridePct;
      } else if (simState.dcmControlParam === "FREEZE_CURRENT_STATE") {
        simState.pwmSourceOwner = "DCM 0x2F (Freeze)";
        rawCmd = simState.dcmFreezePct;
      } else {
        simState.pwmSourceOwner = "DCM 0x2F (Reset)";
        rawCmd = 0.0;
      }
    } else {
      simState.pwmSourceOwner = "SWC_App";
    }
    simState.pwmRequestedPct = rawCmd;

    let finalPct = rawCmd;
    if (cfg.IoHwAbPwmDutyClampEnable && finalPct > 0.0) {
      if (finalPct < clampMin || finalPct > clampMax) {
        finalPct = clampVal(finalPct, clampMin, clampMax);
        simState.pwmClamped = true;
      } else {
        simState.pwmClamped = false;
      }
    } else {
      finalPct = clampVal(finalPct, 0, 100);
      simState.pwmClamped = false;
    }
    simState.pwmDutyHex = Math.round((finalPct / 100.0) * 0x8000);
  }

  // 8. ICU 1 MHz Signal Capture & Wheel Speed RPM
  const teeth = Math.max(1, parseInt(cfg.IoHwAbSpeedSensorTeethCount, 10) || 20);
  const icuTimeout = Math.max(5, parseInt(cfg.IoHwAbIcuTimeoutMs, 10) || 50);
  if (simState.icuFreqHz > 0 && simState.icuSilentMs < icuTimeout && isInit) {
    simState.icuCaptureActive = true;
    simState.icuPeriodTicks = Math.round(1000000 / simState.icuFreqHz);
    simState.icuActiveTicks = Math.round(simState.icuPeriodTicks * (clampVal(simState.icuDutyPct, 1, 99) / 100.0));
    simState.icuRpm = Math.round((simState.icuFreqHz * 60) / teeth);
  } else {
    simState.icuCaptureActive = false;
    simState.icuPeriodTicks = 0;
    simState.icuActiveTicks = 0;
    simState.icuRpm = 0;
  }

  // 9. Overall Signal Qualifier & Diag Mux State
  if (!isInit || simState.demStatus === "FAILED" || fimBlocked) {
    simState.signalQual = "FAULT";
  } else if (simState.faultSupply5v || simState.demStatus === "PREFAILED" || simState.adcGroupBusy || !simState.icuCaptureActive) {
    simState.signalQual = "DEGRADED";
  } else {
    simState.signalQual = "GOOD";
  }

  if (fimBlocked || simState.faultOverCurrent) {
    simState.diagMuxPhase = "FIM_SAFE_IDLE";
  } else if (dcmActive) {
    simState.diagMuxPhase = "DCM_0x2F_OVERRIDE";
  } else if (simState.demStatus === "PREFAILED" || simState.demStatus === "FAILED") {
    simState.diagMuxPhase = "DEM_DEBOUNCING";
  } else {
    simState.diagMuxPhase = "NORMAL_SWC";
  }

  // 10. Recompute 2x8-bit Status & Diagnostic Control Registers
  let a = 0;
  if (isInit) a |= 0x80;
  if (isInit && !simState.adcGroupBusy) a |= 0x40;
  if (ratiometricActive) a |= 0x20;
  if (simState.iirSettled) a |= 0x10;
  if (!simState.dioDebouncing) a |= 0x08;
  if (simState.pwmClamped) a |= 0x04;
  if (simState.icuCaptureActive) a |= 0x02;
  if (simState.signalQual === "GOOD") a |= 0x01;
  simState.regAByte = a & 0xFF;

  let b = 0;
  if (simState.faultShortGnd) b |= 0x80;
  if (simState.faultShortBat) b |= 0x40;
  if (simState.faultOpenLoad) b |= 0x20;
  if (simState.faultOverCurrent) b |= 0x10;
  if (simState.faultSupply5v) b |= 0x08;
  if (simState.demStatus === "FAILED") b |= 0x04;
  if (fimBlocked) b |= 0x02;
  if (dcmActive) b |= 0x01;
  simState.regBByte = b & 0xFF;
}

// -------------------- PERIODIC CLOCK TICK & API PRIMITIVES --------------------

function stepClockTick(opts = {}) {
  const period = Math.max(1, parseInt(simState.cfg.IoHwAbMainFunctionPeriodMs, 10) || 5);
  simState.clockMs += period;

  if (simState.icuFreqHz <= 0) {
    simState.icuSilentMs += period;
  } else {
    simState.icuSilentMs = 0;
  }

  if (simState.dcmControlParam !== "RETURN_TO_ECU") {
    simState.dcmSessionIdleMs += period;
  } else {
    simState.dcmSessionIdleMs = 0;
  }

  const prevDem = simState.demStatus;
  recomputeIoHwAbEngine({ stepFilter: true });

  if (simState.demStatus !== prevDem && (simState.demStatus === "FAILED" || simState.demStatus === "PASSED")) {
    logApiTrace("TX", "IoHwAb", "Dem_SetEventStatus", `DEM_EVENT_STATUS_${simState.demStatus} (ticks=${simState.diagDebounceCount})`);
  }

  if (!opts.silent) {
    renderAll();
  }
}

function toggleAutoClock() {
  if (simState.autoClockTimer) {
    clearInterval(simState.autoClockTimer);
    simState.autoClockTimer = null;
  } else {
    simState.autoClockTimer = setInterval(() => stepClockTick(), 450);
  }
  renderHeaderAndQuickActions();
}

function toggleRegisterBit(regName, bit) {
  const mask = 1 << bit;
  if (regName === "A") {
    const isCurrentlySet = (simState.regAByte & mask) !== 0;
    if (bit === 7) {
      simState.cfg.IoHwAbInitialized = !isCurrentlySet;
      simState.initPhase = simState.cfg.IoHwAbInitialized ? "RUNNING" : "UNINIT";
      syncConfigToDOM();
      logApiTrace("OP", "User", simState.cfg.IoHwAbInitialized ? "IoHwAb_Init" : "IoHwAb_DeInit", `b7 INIT -> ${simState.cfg.IoHwAbInitialized ? 1 : 0}`);
    } else if (bit === 6) {
      simState.adcGroupBusy = isCurrentlySet;
      logApiTrace("MCAL", "Adc", "Adc_GetGroupStatus", isCurrentlySet ? "ADC_BUSY (0xE_BUSY)" : "ADC_STREAM_COMPLETED");
    } else if (bit === 5) {
      simState.cfg.IoHwAbEnableRatiometricCompensation = !isCurrentlySet;
      syncConfigToDOM();
      logApiTrace("CFG", "IoHwAb", "RatiometricComp", simState.cfg.IoHwAbEnableRatiometricCompensation ? "ENABLED" : "DISABLED");
    } else if (bit === 4) {
      simState.adcFilteredPct = isCurrentlySet ? clampVal(simState.adcInstPct - 8.5, 0, 100) : simState.adcInstPct;
      simState.iirSettled = !isCurrentlySet;
      logApiTrace("DSP", "IoHwAb", "IIR_Filter", isCurrentlySet ? "Inject Step Transient" : "Forced Settled");
    } else if (bit === 3) {
      if (isCurrentlySet) {
        simState.dioPinLevel = simState.dioPinLevel === "STD_HIGH" ? "STD_LOW" : "STD_HIGH";
        simState.dioDebounceElapsedMs = 0;
      } else {
        simState.dioDebounceElapsedMs = parseInt(simState.cfg.IoHwAbDioDebounceTimeMs, 10) || 15;
        simState.dioLogicalState = simState.cfg.IoHwAbDioActivePolarity === "ACTIVE_LOW" ? simState.dioPinLevel === "STD_LOW" : simState.dioPinLevel === "STD_HIGH";
      }
      logApiTrace("DIO", "IoHwAb", "Dio_Debounce", isCurrentlySet ? "Started Debounce Transient" : "Settled");
    } else if (bit === 2) {
      simState.cfg.IoHwAbPwmDutyClampEnable = true;
      simState.swcTargetDutyPct = isCurrentlySet ? 50.0 : 99.0;
      syncConfigToDOM();
      logApiTrace("PWM", "SWC_App", "SetDuty", isCurrentlySet ? "50.0% (Unclamped)" : "99.0% -> Clamped to Max");
    } else if (bit === 1) {
      simState.icuFreqHz = isCurrentlySet ? 0 : 500;
      simState.icuSilentMs = isCurrentlySet ? 999 : 0;
      logApiTrace("ICU", "Icu", "SignalCapture", isCurrentlySet ? "Stall (0 Hz)" : "Active (500 Hz / 1500 RPM)");
    } else if (bit === 0) {
      if (isCurrentlySet) {
        simState.adcPinMv = 120;
        simState.diagDebounceCount = parseInt(simState.cfg.IoHwAbDiagDebounceTicks, 10) || 3;
      } else {
        simState.adcPinMv = 2500;
        simState.actuatorCurrentMa = 2400;
        simState.faultOpenLoad = false;
        simState.diagDebounceCount = 0;
        simState.fimPermission = true;
        simState.cfg.IoHwAbSensorSupplyMeasuredMv = 5000;
        simState.cfg.IoHwAbInitialized = true;
        simState.initPhase = "RUNNING";
        syncConfigToDOM();
      }
    }
  } else if (regName === "B") {
    const isCurrentlySet = (simState.regBByte & mask) !== 0;
    if (bit === 7) {
      simState.adcPinMv = isCurrentlySet ? 2500 : 120;
      simState.diagDebounceCount = isCurrentlySet ? 0 : (parseInt(simState.cfg.IoHwAbDiagDebounceTicks, 10) || 3);
      logApiTrace("DIAG", "Hardware", "Pin_Voltage", isCurrentlySet ? "2500mV Normal" : "120mV Short-to-GND");
    } else if (bit === 6) {
      simState.adcPinMv = isCurrentlySet ? 2500 : 4880;
      simState.diagDebounceCount = isCurrentlySet ? 0 : (parseInt(simState.cfg.IoHwAbDiagDebounceTicks, 10) || 3);
      logApiTrace("DIAG", "Hardware", "Pin_Voltage", isCurrentlySet ? "2500mV Normal" : "4880mV Short-to-Bat");
    } else if (bit === 5) {
      simState.faultOpenLoad = !isCurrentlySet;
      simState.actuatorCurrentMa = simState.faultOpenLoad ? 0 : 2400;
      simState.diagDebounceCount = simState.faultOpenLoad ? (parseInt(simState.cfg.IoHwAbDiagDebounceTicks, 10) || 3) : 0;
      logApiTrace("DIAG", "SmartFET", "ISENSE", simState.faultOpenLoad ? "0 mA (Open-Load)" : "2400 mA Normal");
    } else if (bit === 4) {
      simState.actuatorCurrentMa = isCurrentlySet ? 2400 : 9500;
      simState.diagDebounceCount = isCurrentlySet ? 0 : (parseInt(simState.cfg.IoHwAbDiagDebounceTicks, 10) || 3);
      logApiTrace("DIAG", "SmartFET", "OverCurrent", isCurrentlySet ? "Cleared (2400 mA)" : "9500 mA > 8000 mA Trip!");
    } else if (bit === 3) {
      simState.cfg.IoHwAbSensorSupplyMeasuredMv = isCurrentlySet ? 5000 : 4550;
      syncConfigToDOM();
      logApiTrace("DIAG", "PMIC", "V5V_Ref", isCurrentlySet ? "5000mV OK" : "4550mV Out-of-Window");
    } else if (bit === 2) {
      if (isCurrentlySet) {
        simState.adcPinMv = 2500;
        simState.actuatorCurrentMa = 2400;
        simState.faultOpenLoad = false;
        simState.diagDebounceCount = 0;
      } else {
        simState.adcPinMv = 120;
        simState.diagDebounceCount = parseInt(simState.cfg.IoHwAbDiagDebounceTicks, 10) || 3;
      }
      logApiTrace("DEM", "IoHwAb", "Dem_SetEventStatus", isCurrentlySet ? "PASSED" : "FAILED (Confirmed)");
    } else if (bit === 1) {
      simState.fimPermission = isCurrentlySet;
      logApiTrace("FiM", "FiM", "FiM_GetFunctionPermission", isCurrentlySet ? "TRUE (Permitted)" : "FALSE (Safe-State Inhibit!)");
    } else if (bit === 0) {
      simState.cfg.IoHwAbEnableDcm0x2FControl = true;
      simState.dcmControlParam = isCurrentlySet ? "RETURN_TO_ECU" : "SHORT_TERM_ADJUSTMENT";
      syncConfigToDOM();
      logApiTrace("UDS", "DCM", "Service_0x2F", isCurrentlySet ? "0x00 ReturnControlToECU" : "0x03 ShortTermAdjustment (80%)");
    }
  }
  recomputeIoHwAbEngine({ stepFilter: false, preserveDebounce: true });
  renderAll();
}

function selectSignalChannel(chId) {
  simState.selectedChannel = chId;
  renderSignalChainAndFormulas();
}

// -------------------- CONFIG <-> DOM SYNC --------------------

function syncConfigToDOM() {
  Object.keys(defaultConfig).forEach((key) => {
    const el = document.getElementById("cfg_" + key);
    if (!el) return;
    const val = simState.cfg[key];
    if (el.type === "checkbox") {
      el.checked = !!val;
    } else {
      el.value = String(val);
    }
  });
}

function onConfigInputChanged(key, inputEl) {
  inputEl = inputEl || document.getElementById("cfg_" + key);
  if (!(key in defaultConfig) || !inputEl) return;
  let val;
  if (inputEl.type === "checkbox") {
    val = inputEl.checked;
  } else if (inputEl.type === "number") {
    const parsed = parseFloat(inputEl.value);
    val = Number.isFinite(parsed) ? parsed : defaultConfig[key];
  } else {
    val = inputEl.value;
  }

  simState.cfg[key] = val;

  if (key === "IoHwAbInitialized") {
    simState.initPhase = val ? "RUNNING" : "UNINIT";
    if (!val && simState.cfg.IoHwAbDevErrorDetect) {
      logDetError("0x01", "IOHWAB_E_UNINIT", "Module bị DeInit qua Config");
    }
  }

  if (key === "IoHwAbPortPinPullMode") {
    simState.dioPinLevel = (val === "PORT_PIN_IN_PULL_DOWN") ? "STD_LOW" : "STD_HIGH";
  }

  if (key === "IoHwAbEnableDcm0x2FControl" && !val) {
    simState.dcmControlParam = "RETURN_TO_ECU";
  }

  logApiTrace("CFG", "ECUC", key, String(val));
  recomputeIoHwAbEngine({ stepFilter: false });
  renderAll();
}
