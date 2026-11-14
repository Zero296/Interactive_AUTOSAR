// ================= PART 4A: SIMULATION ENGINE, ECUC CONFIG, DET/DEM, 8 MCAL DRIVERS & LIVE C CODE =================

const defaultConfig = {
  // Tab 0: Mcu (6)
  McuDriverInitialized: true,
  McuDevErrorDetect: true,
  McuNoPll: false,
  McuPerformResetApi: true,
  McuClockReferencePointFrequencyMhz: 160,
  McuPowerModeSetting: "MCU_MODE_RUN",

  // Tab 1: Port (6)
  PortDriverInitialized: true,
  PortPinDirectionChangeable: true,
  PortPinModeChangeable: true,
  PortPinDirection: "PORT_PIN_IN",
  PortPinInitialMode: "PORT_PIN_MODE_DIO",
  PortPinInternalResistor: "PORT_PIN_IN_PULL_UP",

  // Tab 2: Dio (6)
  DioDevErrorDetect: true,
  DioFlipChannelApi: true,
  DioMaskedWritePortApi: true,
  DioChannelIdSelected: "1",
  DioPortMaskHex: "0xF0",
  DioPortWriteValueHex: "0xA5",

  // Tab 3: Adc (6)
  AdcDriverInitialized: true,
  AdcGrpNotifCapability: true,
  AdcGroupTriggSrc: "ADC_TRIGG_SRC_SW",
  AdcGroupAccessMode: "ADC_ACCESS_MODE_SINGLE",
  AdcStreamingNumSamples: 3,
  AdcSimInputVoltageMv: 2500,

  // Tab 4: Pwm (6)
  PwmDriverInitialized: true,
  PwmChannelClass: "PWM_FIXED_PERIOD",
  PwmDutycycleDefaultHex: "0x6000",
  PwmPeriodDefaultUs: 50,
  PwmIdleState: "PWM_LOW",
  PwmDutycycleUpdatedEndperiod: true,

  // Tab 5: Spi (6)
  SpiDriverInitialized: true,
  SpiLevelDelivered: "2",
  SpiChannelBuffersAllowed: "2",
  SpiInterruptibleSequence: true,
  SpiAsyncMode: "SPI_INTERRUPT_MODE",
  SpiTxDataHex: "A5 01 55 FF",

  // Tab 6: Can (6)
  CanDriverInitialized: true,
  CanMultiplexedTransmission: true,
  CanFdBaudrateConfig: true,
  CanTxRxProcessingMode: "INTERRUPT",
  CanHwFilterCodeHex: "0x100",
  CanTxFrameIdHex: "0x40000201",

  // Tab 7: Fls (6)
  FlsDriverInitialized: true,
  FlsDefaultMode: "MEMIF_MODE_SLOW",
  FlsPageSize: 8,
  FlsWriteVerificationEnabled: true,
  FlsTargetAddressHex: "0x0000",
  FlsWriteDataHex: "5A A5 01 02 10 27 DE AD C0 FF EE 00 11 22 33 44"
};

let ecucConfig = { ...defaultConfig };

function makeDefaultPins() {
  return [
    { id: 0, name: "PA0", role: "IgnSw",    mode: "PORT_PIN_MODE_DIO", dir: "PORT_PIN_IN",  dirChangeable: true,  pull: "PORT_PIN_IN_PULL_UP",  level: 1, alt: "ALT0 GPIO" },
    { id: 1, name: "PA1", role: "WarnLed",  mode: "PORT_PIN_MODE_DIO", dir: "PORT_PIN_OUT", dirChangeable: false, pull: "PORT_PIN_IN_NO_PULL", level: 0, alt: "ALT0 GPIO" },
    { id: 2, name: "PA2", role: "TempAN0",  mode: "PORT_PIN_MODE_ADC", dir: "PORT_PIN_IN",  dirChangeable: false, pull: "PORT_PIN_IN_NO_PULL", level: 0, alt: "ALT1 ADC0" },
    { id: 3, name: "PA3", role: "FanPwm0",  mode: "PORT_PIN_MODE_PWM", dir: "PORT_PIN_OUT", dirChangeable: false, pull: "PORT_PIN_IN_NO_PULL", level: 1, alt: "ALT2 FTM0" },
    { id: 4, name: "PB0", role: "SpiSclk",  mode: "PORT_PIN_MODE_SPI", dir: "PORT_PIN_OUT", dirChangeable: false, pull: "PORT_PIN_IN_NO_PULL", level: 0, alt: "ALT3 QSPI" },
    { id: 5, name: "PB1", role: "SpiCs0",   mode: "PORT_PIN_MODE_SPI", dir: "PORT_PIN_OUT", dirChangeable: false, pull: "PORT_PIN_IN_PULL_UP", level: 1, alt: "ALT3 QSPI_CS" },
    { id: 6, name: "PB2", role: "Can0Tx",   mode: "PORT_PIN_MODE_CAN", dir: "PORT_PIN_OUT", dirChangeable: false, pull: "PORT_PIN_IN_NO_PULL", level: 1, alt: "ALT4 CAN_TX" },
    { id: 7, name: "PB3", role: "Can0Rx",   mode: "PORT_PIN_MODE_CAN", dir: "PORT_PIN_IN",  dirChangeable: false, pull: "PORT_PIN_IN_PULL_UP", level: 1, alt: "ALT4 CAN_RX" }
  ];
}

function createInitialSimState() {
  return {
    activeWorkspace: "Mcu",
    activeHwView: "MCU",
    selectedMod: "MOD_MCU",
    activeCfgTab: 0,
    activeInspTab: 0,
    clockMs: 0,
    mainFnTicks: 0,
    detCount: 0,
    demCount: 0,
    lastDetError: null,
    lastDemFault: null,
    hwIrqPending: false,
    lastIrqSource: "None",

    // Mcu
    mcuInit: true,
    pllEnabled: true,
    pllLocked: true,
    pllDistributed: true,
    fOscMhz: 16,
    fCpuMhz: 160,
    fBusMhz: 80,
    fCanMhz: 80,
    fAdcMhz: 40,
    resetReason: "MCU_POWER_ON_RESET",
    resetRaw: "0x00000001",
    ramInitDone: true,
    clockFailure: false,
    powerMode: "MCU_MODE_RUN",

    // Port & Dio
    portInit: true,
    pins: makeDefaultPins(),
    dioPortVal: 0xA5,
    dioGroupMask: 0xF0,
    dioGroupOffset: 4,
    emcGlitchInjected: false,

    // Adc
    adcInit: true,
    adcGroupStatus: "ADC_IDLE",
    adcBufferReady: true,
    adcNotifEnabled: true,
    adcHwTrigArmed: false,
    adcStreamingCircular: false,
    adcSamplesDone: 0,
    adcStreamTarget: 3,
    adcRawAn0: 2048,
    adcRawAn1: 3276,
    adcResultBuf: [2048, 3276, 2048],
    adcTempDegC: 65.0,
    adcSensorFault: false,
    adcNotifCount: 0,

    // Pwm
    pwmInit: true,
    pwmDutyHex: 0x6000,
    pwmPeriodUs: 50,
    pwmOutputActive: true,
    pwmIdleForced: false,
    pwmNotifEnabled: false,
    pwmEdge: "PWM_RISING_EDGE",
    pwmNotifCount: 0,

    // Spi
    spiInit: true,
    spiStatus: "SPI_IDLE",
    spiSeqResult: "SPI_SEQ_OK",
    spiJobResult: "SPI_JOB_OK",
    spiIbReady: true,
    spiEbReady: false,
    spiTxBytes: ["A5", "01", "55", "FF"],
    spiRxBytes: ["5A", "00", "AA", "01"],
    spiCsLow: false,
    spiActiveSeq: "SpiSeq_SbcControl",
    spiActiveJob: "None",
    spiPendingJobs: [],
    spiPausedJob: null,
    spiHwError: false,

    // Can
    canInit: true,
    canControllerMode: "CAN_CS_STARTED",
    canErrorState: "CAN_ERRORSTATE_ACTIVE",
    canTec: 0,
    canRec: 0,
    canIrqEnabled: true,
    canTxMailboxes: [null, null, null],
    canIfTxQueue: [],
    canLastTx: { id: "0x40000201", dlc: 16, fd: true, brs: true, data: "11 22 33 44 55 66 77 88 ..." },
    canLastRx: { id: "0x105", dlc: 8, data: "42 01 9A FF 00 10 20 30", accepted: true },
    canWakeupDetected: false,
    canTxConfirmCount: 0,
    canRxIndCount: 0,

    // Fls
    flsInit: true,
    flsStatus: "MEMIF_IDLE",
    flsJobResult: "MEMIF_JOB_OK",
    flsActiveJob: "NONE",
    flsJobAddr: 0x0000,
    flsJobLen: 0,
    flsJobDoneBytes: 0,
    flsWriteBytes: [],
    flsCompareBytes: [],
    flsSectorErased: true,
    flsHwFault: false,
    flsMemory: new Array(32).fill(0xFF),

    // SWC Thermal Loop
    swcThermal: {
      tempC: 65.0,
      fanPct: 75,
      warnLed: false,
      runCount: 0
    },

    // Dual 8-Bit Registers
    regA: 0x94,
    regB: 0xB8,

    // Visualization Metadata
    activeArrows: [],
    highlightedMods: ["MOD_MCU"],
    stepMeta: {
      moduleTag: "Mcu / All MCAL",
      title: "Hệ thống sẵn sàng mô phỏng 8 module MCAL chuẩn AUTOSAR R23-11",
      inputFrom: "EcuM / SWC via RTE ➔ IoHwAb / CanIf / Fee",
      processing: "Khởi tạo Clock Tree PLL 160 MHz, Pin Mux, Peripheral Status & Registers",
      outputTo: "Silicon Hardware Peripherals & Return Callbacks",
      swsRef: "SWS_Mcu · SWS_Port · SWS_Dio · SWS_Adc · SWS_Pwm · SWS_Spi · SWS_Can · SWS_Fls"
    },
    apiTraces: [],
    traceSeq: 0
  };
}

let simState = createInitialSimState();

function clampNum(v, min, max, fallback) {
  const n = Number(v);
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function parseHexInt(str, fallback = 0) {
  if (typeof str !== "string") return fallback;
  const clean = str.trim().replace(/^0x/i, "");
  if (!/^[0-9a-fA-F]+$/.test(clean)) return fallback;
  return parseInt(clean, 16) >>> 0;
}

function parseHexBytes(str, maxLen = 16) {
  if (typeof str !== "string") return [];
  const tokens = str.trim().split(/[\s,]+/).filter(Boolean);
  const out = [];
  for (let i = 0; i < Math.min(tokens.length, maxLen); i++) {
    const val = parseHexInt(tokens[i], -1);
    if (val >= 0 && val <= 0xFF) out.push(val);
  }
  return out;
}

function fmtHex2(n) {
  return (n & 0xFF).toString(16).toUpperCase().padStart(2, "0");
}

function fmtHex4(n) {
  return "0x" + (n & 0xFFFF).toString(16).toUpperCase().padStart(4, "0");
}

function dutyHexToPct(dutyHex) {
  const clamped = Math.max(0, Math.min(0x8000, dutyHex | 0));
  return Math.round((clamped / 0x8000) * 1000) / 10;
}

function mvToAdcRaw12(mv) {
  const clamped = Math.max(0, Math.min(5000, Number(mv) || 0));
  return Math.round((clamped / 5000) * 4095);
}

function mvToTempC(mv) {
  // 0 mV = -15°C, 2500 mV = 65°C, 4000 mV = 105°C, linear automotive NTC curve approximation
  return Math.round((((Number(mv) || 0) - 500) / 35 + 7.85) * 10) / 10;
}

function addApiTrace(mod, badge, fn, info, sws, type = "ok") {
  simState.traceSeq += 1;
  simState.apiTraces.unshift({
    seq: simState.traceSeq,
    clockMs: simState.clockMs,
    mod,
    badge,
    fn,
    info,
    sws: sws || "AUTOSAR R23-11",
    type
  });
  if (simState.apiTraces.length > 60) simState.apiTraces.pop();
}

function detReport(modName, modId, apiId, errCode, detail, sws) {
  if (!ecucConfig.McuDevErrorDetect && !(modName === "Dio" && ecucConfig.DioDevErrorDetect)) {
    addApiTrace(modName, "BYPASS DET", `Det_ReportError(${errCode}) [Disabled]`, detail, sws, "warn");
    return false;
  }
  simState.detCount += 1;
  simState.lastDetError = `${modName}(${modId}): ${errCode} [Api:${apiId}]`;
  addApiTrace(modName, "DET ERROR", `Det_ReportError(Mod=${modId}, Api=${apiId}, Err=${errCode})`, detail, sws, "err");
  recomputeRegisters();
  return true;
}

function demReport(modName, eventName, failed, detail, sws) {
  const statusStr = failed ? "DEM_EVENT_STATUS_FAILED" : "DEM_EVENT_STATUS_PASSED";
  if (failed) {
    simState.demCount += 1;
    simState.lastDemFault = `${modName}: ${eventName}`;
  }
  addApiTrace(modName, failed ? "DEM FAILED" : "DEM PASSED", `Dem_SetEventStatus(${eventName}, ${statusStr})`, detail, sws, failed ? "err" : "ok");
  recomputeRegisters();
}

function getWorkspaceInitFlag(ws) {
  switch (ws) {
    case "Mcu":  return simState.mcuInit && ecucConfig.McuDriverInitialized;
    case "Port": return simState.portInit && ecucConfig.PortDriverInitialized;
    case "Dio":  return ecucConfig.PortDriverInitialized;
    case "Adc":  return simState.adcInit && ecucConfig.AdcDriverInitialized;
    case "Pwm":  return simState.pwmInit && ecucConfig.PwmDriverInitialized;
    case "Spi":  return simState.spiInit && ecucConfig.SpiDriverInitialized;
    case "Can":  return simState.canInit && ecucConfig.CanDriverInitialized;
    case "Fls":  return simState.flsInit && ecucConfig.FlsDriverInitialized;
    default:
      return simState.mcuInit && simState.portInit && simState.adcInit &&
             simState.pwmInit && simState.spiInit && simState.canInit && simState.flsInit;
  }
}

function getWorkspaceJobPending(ws) {
  const adcP = simState.adcGroupStatus === "ADC_BUSY";
  const spiP = simState.spiStatus === "SPI_BUSY" || simState.spiSeqResult === "SPI_SEQ_PENDING";
  const canP = simState.canTxMailboxes.some(m => m !== null);
  const flsP = simState.flsStatus === "MEMIF_BUSY";
  if (ws === "Adc") return adcP;
  if (ws === "Spi") return spiP;
  if (ws === "Can") return canP;
  if (ws === "Fls") return flsP;
  return adcP || spiP || canP || flsP;
}

function getWorkspaceBufferReady(ws) {
  if (ws === "Adc") return simState.adcBufferReady;
  if (ws === "Spi") return simState.spiIbReady || simState.spiEbReady;
  if (ws === "Fls") return simState.flsWriteBytes.length > 0 || ecucConfig.FlsWriteDataHex.trim().length > 0;
  return simState.adcBufferReady || simState.spiIbReady;
}

function getWorkspaceNotifEnabled(ws) {
  if (ws === "Adc") return simState.adcNotifEnabled && ecucConfig.AdcGrpNotifCapability;
  if (ws === "Pwm") return simState.pwmNotifEnabled;
  if (ws === "Spi") return true;
  if (ws === "Can") return simState.canIrqEnabled;
  if (ws === "Fls") return true;
  return simState.adcNotifEnabled;
}

function getWorkspaceAsyncMode(ws) {
  if (ws === "Spi") return ecucConfig.SpiAsyncMode === "SPI_INTERRUPT_MODE";
  if (ws === "Can") return ecucConfig.CanTxRxProcessingMode === "INTERRUPT";
  if (ws === "Adc") return true;
  if (ws === "Fls") return false;
  return ecucConfig.SpiAsyncMode === "SPI_INTERRUPT_MODE" || ecucConfig.CanTxRxProcessingMode === "INTERRUPT";
}

function recomputeRegisters() {
  const pa1 = simState.pins[1];
  let a = 0;
  if (simState.pllLocked && !ecucConfig.McuNoPll && !simState.clockFailure && simState.powerMode !== "MCU_MODE_STOP") a |= 0x80;
  if (pa1 && pa1.level === 1) a |= 0x40;
  if (simState.adcGroupStatus === "ADC_COMPLETED" || simState.adcGroupStatus === "ADC_STREAM_COMPLETED") a |= 0x20;
  if (simState.pwmOutputActive && simState.pwmDutyHex > 0 && !simState.pwmIdleForced && simState.pwmInit) a |= 0x10;
  if (simState.spiStatus === "SPI_BUSY" || simState.spiCsLow) a |= 0x08;
  if (simState.canInit && simState.canControllerMode === "CAN_CS_STARTED" && simState.canErrorState !== "CAN_ERRORSTATE_BUSOFF") a |= 0x04;
  if (simState.flsStatus === "MEMIF_BUSY") a |= 0x02;
  if (simState.hwIrqPending) a |= 0x01;
  simState.regA = a & 0xFF;

  const ws = simState.activeWorkspace;
  let b = 0;
  if (getWorkspaceInitFlag(ws)) b |= 0x80;
  if (getWorkspaceJobPending(ws)) b |= 0x40;
  if (getWorkspaceAsyncMode(ws)) b |= 0x20;
  if (getWorkspaceNotifEnabled(ws)) b |= 0x10;
  if (getWorkspaceBufferReady(ws)) b |= 0x08;
  if (simState.canWakeupDetected) b |= 0x04;
  if (simState.demCount > 0 || simState.clockFailure || simState.spiHwError || simState.flsHwFault) b |= 0x02;
  if (simState.detCount > 0) b |= 0x01;
  simState.regB = b & 0xFF;
}

function syncHardwareClocks() {
  if (simState.powerMode === "MCU_MODE_STOP") {
    simState.pllLocked = false;
    simState.pllDistributed = false;
    simState.fCpuMhz = 0;
    simState.fBusMhz = 0;
    simState.fCanMhz = 0;
    simState.fAdcMhz = 0;
    return;
  }
  const target = clampNum(ecucConfig.McuClockReferencePointFrequencyMhz, 40, 320, 160);
  if (ecucConfig.McuNoPll || !simState.pllEnabled || !simState.pllLocked || !simState.pllDistributed || simState.clockFailure) {
    simState.fCpuMhz = simState.fOscMhz;
    simState.fBusMhz = 8;
    simState.fCanMhz = 8;
    simState.fAdcMhz = 8;
  } else {
    simState.fCpuMhz = target;
    simState.fBusMhz = Math.round(target / 2);
    simState.fCanMhz = Math.round(target / 2);
    simState.fAdcMhz = Math.round(target / 4);
  }
}

function applyConfigToState() {
  simState.mcuInit = !!ecucConfig.McuDriverInitialized;
  simState.portInit = !!ecucConfig.PortDriverInitialized;
  simState.adcInit = !!ecucConfig.AdcDriverInitialized;
  simState.pwmInit = !!ecucConfig.PwmDriverInitialized;
  simState.spiInit = !!ecucConfig.SpiDriverInitialized;
  simState.canInit = !!ecucConfig.CanDriverInitialized;
  simState.flsInit = !!ecucConfig.FlsDriverInitialized;

  simState.powerMode = ecucConfig.McuPowerModeSetting;
  if (ecucConfig.McuNoPll) {
    simState.pllLocked = false;
    simState.pllDistributed = false;
  }
  syncHardwareClocks();

  // Port PA0 mirrors editable config controls
  const pa0 = simState.pins[0];
  pa0.dirChangeable = !!ecucConfig.PortPinDirectionChangeable;
  pa0.dir = ecucConfig.PortPinDirection;
  pa0.mode = ecucConfig.PortPinInitialMode;
  pa0.pull = ecucConfig.PortPinInternalResistor;
  pa0.alt = pa0.mode.replace("PORT_PIN_MODE_", "ALT ");

  // Dio
  simState.dioGroupMask = parseHexInt(ecucConfig.DioPortMaskHex, 0xF0) & 0xFF;

  // Adc
  simState.adcStreamTarget = clampNum(ecucConfig.AdcStreamingNumSamples, 1, 16, 3);
  const mv = clampNum(ecucConfig.AdcSimInputVoltageMv, 0, 5000, 2500);
  simState.adcRawAn0 = mvToAdcRaw12(mv);
  simState.adcTempDegC = mvToTempC(mv);
  simState.adcSensorFault = mv > 4600 || mv < 200;

  // Pwm
  const dHex = parseHexInt(ecucConfig.PwmDutycycleDefaultHex, 0x6000);
  simState.pwmDutyHex = Math.max(0, Math.min(0x8000, dHex));
  simState.pwmPeriodUs = clampNum(ecucConfig.PwmPeriodDefaultUs, 10, 1000, 50);

  // Spi
  const spiArr = parseHexBytes(ecucConfig.SpiTxDataHex, 8);
  if (spiArr.length > 0) simState.spiTxBytes = spiArr.map(fmtHex2);

  // Fls
  if (!simState.flsInit) simState.flsStatus = "MEMIF_UNINIT";
  else if (simState.flsStatus === "MEMIF_UNINIT") simState.flsStatus = "MEMIF_IDLE";

  if (!simState.canInit) simState.canControllerMode = "CAN_CS_UNINIT";
  else if (simState.canControllerMode === "CAN_CS_UNINIT") simState.canControllerMode = "CAN_CS_STOPPED";

  if (!simState.spiInit) simState.spiStatus = "SPI_UNINIT";
  else if (simState.spiStatus === "SPI_UNINIT") simState.spiStatus = "SPI_IDLE";

  if (!simState.adcInit) simState.adcGroupStatus = "ADC_IDLE";

  recomputeRegisters();
}

function validateConfigRules() {
  const issues = [];
  if (!ecucConfig.McuDriverInitialized || !ecucConfig.PortDriverInitialized) {
    issues.push({ lv: "warn", msg: "⚠️ McuDriverInitialized hoặc PortDriverInitialized đang FALSE: các API phụ thuộc sẽ bị DET *_E_UNINIT chặn." });
  }
  if (ecucConfig.McuNoPll) {
    issues.push({ lv: "warn", msg: "ℹ️ McuNoPll = TRUE: PLL bị bỏ qua, MCU chạy ở 16 MHz fOSC (SWS_Mcu_00180)." });
  }
  if (ecucConfig.AdcGroupTriggSrc === "ADC_TRIGG_SRC_HW" && ecucConfig.AdcGroupAccessMode === "ADC_ACCESS_MODE_SINGLE") {
    issues.push({ lv: "ok", msg: "💡 Mẹo: Đặt AdcGroupAccessMode = STREAMING khi dùng HW Trigger để thu đủ N mẫu liên tiếp (S7)." });
  }
  const flsAddr = parseHexInt(ecucConfig.FlsTargetAddressHex, 0);
  const flsPg = clampNum(ecucConfig.FlsPageSize, 4, 64, 8);
  if (flsAddr % flsPg !== 0) {
    issues.push({ lv: "err", msg: `❌ FLS Alignment Fault: FlsTargetAddress (${ecucConfig.FlsTargetAddressHex}) không chia hết cho FlsPageSize (${flsPg}B) → Fls_Write sẽ báo FLS_E_PARAM_ADDRESS!` });
  }
  const canId = parseHexInt(ecucConfig.CanTxFrameIdHex, 0x201);
  if ((canId & 0x40000000) !== 0 && !ecucConfig.CanFdBaudrateConfig) {
    issues.push({ lv: "err", msg: "❌ CAN FD Flag (0x40000000) bật nhưng CanFdBaudrateConfig = FALSE → Can_Write(>8B) sẽ báo CAN_E_PARAM_DATA_LENGTH!" });
  }
  return issues;
}

// ==================== 8 CORE MCAL DRIVER API HANDLERS ====================

function mcalMcuInit() {
  simState.mcuInit = true;
  ecucConfig.McuDriverInitialized = true;
  simState.pllEnabled = false;
  simState.pllLocked = false;
  simState.pllDistributed = false;
  simState.clockFailure = false;
  simState.powerMode = "MCU_MODE_RUN";
  ecucConfig.McuPowerModeSetting = "MCU_MODE_RUN";
  syncHardwareClocks();
  addApiTrace("Mcu", "API INIT", "Mcu_Init(&Mcu_Config)", "Nạp bảng cấu hình Clock, RAM, PowerMode cho ECU", "SWS_Mcu_00026", "ok");
  recomputeRegisters();
}

function mcalMcuInitClock() {
  if (!simState.mcuInit) return detReport("Mcu", 101, "0x02", "MCU_E_UNINIT", "Gọi Mcu_InitClock() trước Mcu_Init()", "SWS_Mcu_00125");
  if (ecucConfig.McuNoPll) {
    simState.pllEnabled = false;
    simState.pllLocked = false;
    addApiTrace("Mcu", "NO PLL", "Mcu_InitClock(IRC_16MHz)", "McuNoPll=TRUE → chạy trực tiếp thạch anh fOSC=16MHz", "SWS_Mcu_00180", "warn");
  } else {
    simState.pllEnabled = true;
    simState.pllLocked = false;
    simState.pllDistributed = false;
    addApiTrace("Mcu", "PLL START", `Mcu_InitClock(PLL_${ecucConfig.McuClockReferencePointFrequencyMhz}MHz)`, "Kích hoạt VCO bộ nhân tần PLL (Bit 7 PLL_LOCK_OK=0, đang chờ khóa pha)", "SWS_Mcu_00137", "tx");
  }
  syncHardwareClocks();
  recomputeRegisters();
}

function mcalMcuLockAndGetPll() {
  if (!simState.mcuInit) return detReport("Mcu", 101, "0x04", "MCU_E_UNINIT", "Gọi Mcu_GetPllStatus() khi UNINIT", "SWS_Mcu_00125");
  if (ecucConfig.McuNoPll) {
    addApiTrace("Mcu", "PLL UNDEF", "Mcu_GetPllStatus() -> MCU_PLL_STATUS_UNDEFINED", "McuNoPll=TRUE nên không có mạch PLL hoạt động", "SWS_Mcu_00206", "warn");
    return "MCU_PLL_STATUS_UNDEFINED";
  }
  if (simState.clockFailure) {
    simState.pllLocked = false;
    addApiTrace("Mcu", "PLL UNLOCK", "Mcu_GetPllStatus() -> MCU_PLL_UNLOCKED", "Thạch anh mất dao động! Clock Failure đang active", "SWS_Mcu_00008", "err");
    return "MCU_PLL_UNLOCKED";
  }
  simState.pllLocked = true;
  addApiTrace("Mcu", "PLL LOCKED", "Mcu_GetPllStatus() -> MCU_PLL_LOCKED", "Bit PLL_SR[LOCK] = 1 (Bit 7 Thanh A = 1). Đã đủ điều kiện DistributePllClock()", "SWS_Mcu_00008", "ok");
  recomputeRegisters();
  return "MCU_PLL_LOCKED";
}

function mcalMcuDistributePllClock() {
  if (!simState.mcuInit) return detReport("Mcu", 101, "0x03", "MCU_E_UNINIT", "Chưa gọi Mcu_Init()", "SWS_Mcu_00125");
  if (ecucConfig.McuNoPll) {
    addApiTrace("Mcu", "IGNORED", "Mcu_DistributePllClock() [No-Op]", "McuNoPll=TRUE → API không phân phối PLL", "SWS_Mcu_00180", "warn");
    return;
  }
  if (!simState.pllLocked) {
    return detReport("Mcu", 101, "0x03", "MCU_E_PLL_NOT_LOCKED", "Cấm gọi Mcu_DistributePllClock() khi Bit 7 PLL_LOCK_OK == 0!", "SWS_Mcu_00142");
  }
  simState.pllDistributed = true;
  syncHardwareClocks();
  addApiTrace("Mcu", "CLOCK DIST", `Mcu_DistributePllClock()`, `Cấp xung hệ thống: fCPU=${simState.fCpuMhz}MHz, fBUS=${simState.fBusMhz}MHz, fCAN=${simState.fCanMhz}MHz, fADC=${simState.fAdcMhz}MHz`, "SWS_Mcu_00140", "ok");
  recomputeRegisters();
}

function mcalMcuSetMode(mode) {
  if (!simState.mcuInit) return detReport("Mcu", 101, "0x08", "MCU_E_UNINIT", "Chưa gọi Mcu_Init()", "SWS_Mcu_00125");
  simState.powerMode = mode;
  ecucConfig.McuPowerModeSetting = mode;
  syncHardwareClocks();
  addApiTrace("Mcu", "PWR MODE", `Mcu_SetMode(${mode})`, mode === "MCU_MODE_RUN" ? "CPU chạy full speed, cấp xung toàn ngoại vi" : mode === "MCU_MODE_HALT" ? "WFI: Ngắt CPU Clock, giữ RAM & Wakeup IRQ" : "Deep Sleep: Ngắt PLL (Bit 7=0), chỉ giữ mạch Wakeup", "SWS_Mcu_00147", mode === "MCU_MODE_RUN" ? "ok" : "warn");
  recomputeRegisters();
}

function mcalMcuPerformReset() {
  if (!simState.mcuInit) return detReport("Mcu", 101, "0x07", "MCU_E_UNINIT", "Chưa gọi Mcu_Init()", "SWS_Mcu_00125");
  if (!ecucConfig.McuPerformResetApi) {
    addApiTrace("Mcu", "API LOCKED", "Mcu_PerformReset() [BLOCKED]", "McuPerformResetApi = FALSE trong ECUC nên không biên dịch dịch vụ Reset", "SWS_Mcu_00145", "warn");
    return false;
  }
  simState.resetReason = "MCU_SW_RESET";
  simState.resetRaw = "0x00000004";
  addApiTrace("Mcu", "SW RESET", "Mcu_PerformReset() -> RGM_FES = MCU_SW_RESET", "Khởi động lại vi điều khiển bằng phần mềm (UDS 0x11 / Bootloader Entry)", "SWS_Mcu_00143", "tx");
  recomputeRegisters();
  return true;
}

function mcalPortInit() {
  simState.portInit = true;
  ecucConfig.PortDriverInitialized = true;
  simState.pins = makeDefaultPins();
  simState.pins[0].dirChangeable = !!ecucConfig.PortPinDirectionChangeable;
  simState.emcGlitchInjected = false;
  addApiTrace("Port", "API INIT", "Port_Init(&Port_Config)", "Nạp PortPinLevelValue trước direction → ghi PCR[0..7] chống glitch bật nguồn", "SWS_Port_00041", "ok");
  recomputeRegisters();
}

function mcalPortSetPinDirection(pinId, newDir) {
  if (!simState.portInit) return detReport("Port", 124, "0x01", "PORT_E_UNINIT", "Gọi Port_SetPinDirection() trước Port_Init()", "SWS_Port_00087");
  const pin = simState.pins[pinId];
  if (!pin) return detReport("Port", 124, "0x01", "PORT_E_PARAM_PIN", `PinId=${pinId} không tồn tại`, "SWS_Port_00077");
  if (!pin.dirChangeable) {
    return detReport("Port", 124, "0x01", "PORT_E_DIRECTION_UNCHANGEABLE", `Chân ${pin.name} có PortPinDirectionChangeable=FALSE, cấm đổi hướng runtime!`, "SWS_Port_00077");
  }
  pin.dir = newDir;
  if (pinId === 0) ecucConfig.PortPinDirection = newDir;
  addApiTrace("Port", "PIN DIR", `Port_SetPinDirection(${pin.name}, ${newDir})`, `Đổi hướng PCR[${pinId}].OBE = ${newDir === "PORT_PIN_OUT" ? 1 : 0}`, "SWS_Port_00063", "tx");
  recomputeRegisters();
}

function mcalPortSetPinMode(pinId, newMode) {
  if (!simState.portInit) return detReport("Port", 124, "0x04", "PORT_E_UNINIT", "Gọi Port_SetPinMode() trước Port_Init()", "SWS_Port_00087");
  const pin = simState.pins[pinId];
  if (!pin) return detReport("Port", 124, "0x04", "PORT_E_PARAM_PIN", `PinId=${pinId} không tồn tại`, "SWS_Port_00077");
  if (!ecucConfig.PortPinModeChangeable) {
    return detReport("Port", 124, "0x04", "PORT_E_MODE_UNCHANGEABLE", `PortPinModeChangeable=FALSE → Không được phép đổi mux chân ${pin.name}`, "SWS_Port_00125");
  }
  pin.mode = newMode;
  pin.alt = newMode.replace("PORT_PIN_MODE_", "ALT ");
  if (pinId === 0) ecucConfig.PortPinInitialMode = newMode;
  addApiTrace("Port", "PIN MUX", `Port_SetPinMode(${pin.name}, ${newMode})`, `Chuyển mạch Multiplexer PCR[${pinId}].MUX → ${pin.alt}`, "SWS_Port_00125", "tx");
  recomputeRegisters();
}

function mcalPortRefreshDirection() {
  if (!simState.portInit) return detReport("Port", 124, "0x02", "PORT_E_UNINIT", "Chưa gọi Port_Init()", "SWS_Port_00087");
  const defaults = makeDefaultPins();
  let fixedRestored = 0;
  simState.pins.forEach((p, idx) => {
    if (!p.dirChangeable) {
      p.dir = defaults[idx].dir;
      fixedRestored += 1;
    }
  });
  simState.emcGlitchInjected = false;
  addApiTrace("Port", "EMC GUARD", "Port_RefreshPortDirection()", `Làm tươi hướng chuẩn cho ${fixedRestored} chân cố định; giữ nguyên PA0 changeable`, "SWS_Port_00060", "ok");
  recomputeRegisters();
}

function mcalDioWriteChannel(chId, level) {
  if (chId < 0 || chId >= 8 || Number.isNaN(chId)) {
    return detReport("Dio", 120, "0x01", "DIO_E_PARAM_INVALID_CHANNEL_ID", `ChannelId=${chId} nằm ngoài dải hợp lệ (0..7)`, "SWS_Dio_00074");
  }
  const pin = simState.pins[chId];
  if (pin.dir === "PORT_PIN_IN") {
    addApiTrace("Dio", "SAFE IGNORE", `Dio_WriteChannel(${pin.name}, ${level ? "STD_HIGH" : "STD_LOW"}) [IGNORED]`, `Chân ${pin.name} là PORT_PIN_IN → Dio bỏ qua ghi thanh ghi theo SWS_Dio_00028`, "SWS_Dio_00028", "warn");
    return;
  }
  pin.level = level ? 1 : 0;
  if (pin.level) simState.dioPortVal |= (1 << chId);
  else simState.dioPortVal &= ~(1 << chId);
  addApiTrace("Dio", "DIO WRITE", `Dio_WriteChannel(${pin.name}, ${pin.level ? "STD_HIGH" : "STD_LOW"})`, `Ghi nguyên tử GPIO_PDOR[${chId}]=${pin.level} (Port0=0x${fmtHex2(simState.dioPortVal)})`, "SWS_Dio_00028", "tx");
  recomputeRegisters();
}

function mcalDioFlipChannel(chId) {
  if (chId < 0 || chId >= 8 || Number.isNaN(chId)) {
    return detReport("Dio", 120, "0x11", "DIO_E_PARAM_INVALID_CHANNEL_ID", `ChannelId=${chId} không hợp lệ`, "SWS_Dio_00074");
  }
  if (!ecucConfig.DioFlipChannelApi) {
    addApiTrace("Dio", "API DISABLED", "Dio_FlipChannel() [Disabled]", "DioFlipChannelApi = FALSE", "SWS_Dio_00190", "warn");
    return simState.pins[chId].level;
  }
  const pin = simState.pins[chId];
  if (pin.dir === "PORT_PIN_OUT") {
    pin.level = pin.level ? 0 : 1;
    if (pin.level) simState.dioPortVal |= (1 << chId);
    else simState.dioPortVal &= ~(1 << chId);
  }
  addApiTrace("Dio", "DIO FLIP", `Dio_FlipChannel(${pin.name}) -> ${pin.level ? "STD_HIGH" : "STD_LOW"}`, `Đảo Bit ${chId} (PA1=Bit6 Thanh A = ${pin.level}) | Port0=0x${fmtHex2(simState.dioPortVal)}`, "SWS_Dio_00190", "ok");
  recomputeRegisters();
  return pin.level;
}

function mcalDioWriteChannelGroup(val, maskHexStr, offset = 4) {
  const mask = parseHexInt(maskHexStr, 0xF0) & 0xFF;
  if (mask === 0) return detReport("Dio", 120, "0x05", "DIO_E_PARAM_INVALID_GROUP", "ChannelGroup Mask không được bằng 0", "SWS_Dio_00114");
  // Derive lowest set bit offset automatically if custom mask is passed
  let effOffset = offset;
  let tmp = mask;
  let calc = 0;
  while (tmp && (tmp & 1) === 0) { tmp >>= 1; calc++; }
  effOffset = calc;
  const oldVal = simState.dioPortVal;
  simState.dioPortVal = (oldVal & ~mask) | ((val << effOffset) & mask);
  simState.dioGroupMask = mask;
  simState.dioGroupOffset = effOffset;
  addApiTrace("Dio", "GRP WRITE", `Dio_WriteChannelGroup(Mask=0x${fmtHex2(mask)}, Off=${effOffset}, Val=0x${fmtHex2(val)})`, `Port0: 0x${fmtHex2(oldVal)} → 0x${fmtHex2(simState.dioPortVal)} (bảo toàn các chân ngoài Mask)`, "SWS_Dio_00039", "tx");
  recomputeRegisters();
}

function mcalDioMaskedWritePort(level, mask) {
  if (!ecucConfig.DioMaskedWritePortApi) {
    addApiTrace("Dio", "DISABLED", "Dio_MaskedWritePort() [Disabled]", "DioMaskedWritePortApi = FALSE", "SWS_Dio_00300", "warn");
    return;
  }
  const m = mask & 0xFF;
  const oldVal = simState.dioPortVal;
  simState.dioPortVal = (oldVal & ~m) | (level & m);
  addApiTrace("Dio", "MASK PORT", `Dio_MaskedWritePort(Port0, Val=0x${fmtHex2(level)}, Mask=0x${fmtHex2(m)})`, `Port0: 0x${fmtHex2(oldVal)} → 0x${fmtHex2(simState.dioPortVal)}`, "SWS_Dio_00300", "tx");
  recomputeRegisters();
}

function mcalAdcSetupResultBuffer(enable = true) {
  if (!simState.adcInit) return detReport("Adc", 123, "0x0C", "ADC_E_UNINIT", "Gọi Adc_SetupResultBuffer() trước Adc_Init()", "SWS_Adc_00434");
  simState.adcBufferReady = !!enable;
  addApiTrace("Adc", "BUF SETUP", `Adc_SetupResultBuffer(AdcGroup_0, ${enable ? "&AdcRawBuf[0]" : "NULL"})`, enable ? "Cấp phát Result Buffer thành công (Bit 3 BUFF_LOCK_RDY = 1)" : "Hủy Result Buffer để kiểm thử ADC_E_BUFFER_UNINIT", "SWS_Adc_00419", enable ? "ok" : "warn");
  recomputeRegisters();
}

function mcalAdcStartGroupConversion(isTriggerFromApi = true) {
  if (!simState.adcInit) return detReport("Adc", 123, "0x02", "ADC_E_UNINIT", "Gọi Adc_StartGroupConversion() trước Adc_Init()", "SWS_Adc_00259");
  if (!simState.adcBufferReady) return detReport("Adc", 123, "0x02", "ADC_E_BUFFER_UNINIT", "Chưa gọi Adc_SetupResultBuffer() (Bit 3 = 0)!", "SWS_Adc_00424");
  if (isTriggerFromApi && ecucConfig.AdcGroupTriggSrc === "ADC_TRIGG_SRC_HW") {
    return detReport("Adc", 123, "0x02", "ADC_E_WRONG_TRIGG_SRC", "Nhóm cấu hình ADC_TRIGG_SRC_HW không cho phép gọi StartGroupConversion (SW Trigger)!", "SWS_Adc_00133");
  }
  if (simState.adcGroupStatus === "ADC_BUSY") {
    return detReport("Adc", 123, "0x02", "ADC_E_BUSY", "AdcGroup_0 đang bận chuyển đổi (ADC_BUSY)!", "SWS_Adc_00346");
  }
  simState.adcGroupStatus = "ADC_BUSY";
  simState.adcSamplesDone = 0;
  simState.hwIrqPending = false;
  addApiTrace("Adc", "START CONV", isTriggerFromApi ? "Adc_StartGroupConversion(AdcGroup_0)" : "HW Timer Trigger Edge -> SAR Start", `Chuyển sang ADC_BUSY (fADC=${simState.fAdcMhz}MHz, Bit 6 JOB_SEQ_PEND=1)`, "SWS_Adc_00061", "tx");
  recomputeRegisters();
}

function mcalAdcCompleteSampleStep() {
  if (!simState.adcInit) return;
  const mv = clampNum(ecucConfig.AdcSimInputVoltageMv, 0, 5000, 2500);
  simState.adcRawAn0 = mvToAdcRaw12(mv);
  simState.adcTempDegC = mvToTempC(mv);
  simState.adcSamplesDone += 1;
  const target = ecucConfig.AdcGroupAccessMode === "ADC_ACCESS_MODE_STREAMING" ? clampNum(ecucConfig.AdcStreamingNumSamples, 1, 16, 3) : 1;
  simState.adcStreamTarget = target;
  simState.adcResultBuf.unshift(simState.adcRawAn0);
  if (simState.adcResultBuf.length > target) simState.adcResultBuf.length = target;

  if (simState.adcSamplesDone >= target) {
    simState.adcGroupStatus = "ADC_STREAM_COMPLETED";
    simState.hwIrqPending = true;
    simState.lastIrqSource = "ADC_EOC_ISR";
    if (simState.adcNotifEnabled && ecucConfig.AdcGrpNotifCapability) {
      simState.adcNotifCount += 1;
      addApiTrace("Adc", "CALLBACK ↑", "ADC_EOC_ISR -> IoHwAb_AdcNotification_0()", `Đủ ${target}/${target} mẫu! AN0=${mv}mV (Raw=${simState.adcRawAn0}/0x${simState.adcRawAn0.toString(16).toUpperCase()})`, "SWS_Adc_00060", "cbk");
    } else {
      addApiTrace("Adc", "EOC READY", "SAR ADC Conversion Complete", `Hoàn tất ${target} mẫu (Notification đang tắt)`, "SWS_Adc_00307", "ok");
    }
  } else {
    simState.adcGroupStatus = "ADC_COMPLETED";
    addApiTrace("Adc", "STREAM STEP", `SAR Sample ${simState.adcSamplesDone}/${target} -> ADC_COMPLETED`, `Ghi Raw=${simState.adcRawAn0} vào Stream Buffer [${simState.adcSamplesDone - 1}]`, "SWS_Adc_00307", "rx");
  }
  recomputeRegisters();
}

function mcalAdcReadGroup() {
  if (!simState.adcInit) return detReport("Adc", 123, "0x04", "ADC_E_UNINIT", "Chưa gọi Adc_Init()", "SWS_Adc_00259");
  if (simState.adcGroupStatus === "ADC_IDLE") return detReport("Adc", 123, "0x04", "ADC_E_IDLE", "Không có dữ liệu hợp lệ để đọc vì nhóm đang ở ADC_IDLE!", "SWS_Adc_00388");
  const raw = simState.adcRawAn0;
  const mv = clampNum(ecucConfig.AdcSimInputVoltageMv, 0, 5000, 2500);
  const temp = mvToTempC(mv);
  simState.adcTempDegC = temp;
  simState.hwIrqPending = false;
  if (ecucConfig.AdcGroupAccessMode === "ADC_ACCESS_MODE_SINGLE" || !simState.adcStreamingCircular) {
    simState.adcGroupStatus = "ADC_IDLE";
    simState.adcSamplesDone = 0;
  } else {
    simState.adcGroupStatus = "ADC_BUSY";
  }
  addApiTrace("Adc", "READ GROUP", `Adc_ReadGroup(AdcGroup_0, &RawBuf) = ${raw} (${mv}mV ≈ ${temp}°C)`, `IoHwAb đọc kết quả; One-Shot trả trạng thái về ${simState.adcGroupStatus}`, "SWS_Adc_00329", "rx");
  recomputeRegisters();
  return raw;
}

function mcalPwmSetDutyCycle(dutyHex) {
  if (!simState.pwmInit) return detReport("Pwm", 121, "0x02", "PWM_E_UNINIT", "Gọi Pwm_SetDutyCycle() trước Pwm_Init()", "SWS_Pwm_00117");
  simState.pwmDutyHex = Math.max(0, Math.min(0x8000, dutyHex | 0));
  ecucConfig.PwmDutycycleDefaultHex = fmtHex4(simState.pwmDutyHex);
  simState.pwmIdleForced = false;
  simState.pwmOutputActive = simState.pwmDutyHex > 0;
  const pct = dutyHexToPct(simState.pwmDutyHex);
  addApiTrace("Pwm", "SET DUTY", `Pwm_SetDutyCycle(PwmCh_0, ${fmtHex4(simState.pwmDutyHex)}) [${pct}%]`, `${ecucConfig.PwmDutycycleUpdatedEndperiod ? "Shadow Update cuối chu kỳ (No Glitch)" : "Immediate Update"} · Bit 4 PWM_OUT_ACT=${simState.pwmOutputActive ? 1 : 0}`, "SWS_Pwm_00013", "tx");
  recomputeRegisters();
}

function mcalPwmSetPeriodAndDuty(periodUs, dutyHex) {
  if (!simState.pwmInit) return detReport("Pwm", 121, "0x03", "PWM_E_UNINIT", "Chưa gọi Pwm_Init()", "SWS_Pwm_00117");
  if (ecucConfig.PwmChannelClass !== "PWM_VARIABLE_PERIOD") {
    return detReport("Pwm", 121, "0x03", "PWM_E_PERIOD_UNCHANGEABLE", "Kênh đang cấu hình PWM_FIXED_PERIOD, cấm đổi chu kỳ bằng Pwm_SetPeriodAndDuty()!", "SWS_Pwm_00045");
  }
  simState.pwmPeriodUs = clampNum(periodUs, 10, 1000, 50);
  simState.pwmDutyHex = Math.max(0, Math.min(0x8000, dutyHex | 0));
  ecucConfig.PwmPeriodDefaultUs = simState.pwmPeriodUs;
  ecucConfig.PwmDutycycleDefaultHex = fmtHex4(simState.pwmDutyHex);
  simState.pwmIdleForced = false;
  simState.pwmOutputActive = simState.pwmDutyHex > 0;
  addApiTrace("Pwm", "VAR PERIOD", `Pwm_SetPeriodAndDuty(PwmCh_0, ${simState.pwmPeriodUs}us, ${fmtHex4(simState.pwmDutyHex)})`, `Tần số mới = ${Math.round(1000 / simState.pwmPeriodUs * 10) / 10} kHz | Duty=${dutyHexToPct(simState.pwmDutyHex)}%`, "SWS_Pwm_00019", "tx");
  recomputeRegisters();
}

function mcalPwmSetOutputToIdle() {
  if (!simState.pwmInit) return detReport("Pwm", 121, "0x04", "PWM_E_UNINIT", "Chưa gọi Pwm_Init()", "SWS_Pwm_00117");
  simState.pwmIdleForced = true;
  simState.pwmOutputActive = false;
  addApiTrace("Pwm", "IDLE SAFE", "Pwm_SetOutputToIdle(PwmCh_0)", `Ngắt xung tức thời → đưa chân PA3 về ${ecucConfig.PwmIdleState} (Bit 4 PWM_OUT_ACT = 0)`, "SWS_Pwm_00021", "warn");
  recomputeRegisters();
}

function mcalSpiWriteIbOrEb(useEb = false) {
  if (!simState.spiInit) return detReport("Spi", 83, "0x02", "SPI_E_UNINIT", "Chưa gọi Spi_Init()", "SWS_Spi_00046");
  const bytes = parseHexBytes(ecucConfig.SpiTxDataHex, 8);
  simState.spiTxBytes = (bytes.length > 0 ? bytes : [0xA5, 0x01, 0x55, 0xFF]).map(fmtHex2);
  if (useEb) {
    simState.spiEbReady = true;
    addApiTrace("Spi", "SETUP EB", `Spi_SetupEB(SpiCh_Eeprom, SrcPtr, DesPtr, Len=${simState.spiTxBytes.length})`, `Zero-Copy External Buffer: [${simState.spiTxBytes.join(" ")}]`, "SWS_Spi_00053", "tx");
  } else {
    simState.spiIbReady = true;
    addApiTrace("Spi", "WRITE IB", `Spi_WriteIB(SpiCh_Sbc, [${simState.spiTxBytes.join(" ")}])`, `Nạp ${simState.spiTxBytes.length} bytes vào Internal Buffer (Bit 3 BUFF_LOCK_RDY = 1)`, "SWS_Spi_00018", "tx");
  }
  recomputeRegisters();
}

function mcalSpiAsyncTransmit(seqName = "SpiSeq_SbcControl", jobs = null) {
  if (!simState.spiInit) return detReport("Spi", 83, "0x03", "SPI_E_UNINIT", "Chưa gọi Spi_Init()", "SWS_Spi_00046");
  if (ecucConfig.SpiLevelDelivered === "0") {
    return detReport("Spi", 83, "0x03", "SPI_E_PARAM_SEQ", "SpiLevelDelivered=0 (SYNC only) không hỗ trợ Spi_AsyncTransmit()!", "SWS_Spi_00133");
  }
  if (simState.spiStatus === "SPI_BUSY" && seqName === simState.spiActiveSeq) {
    return detReport("Spi", 83, "0x03", "SPI_E_SEQ_PENDING", `${seqName} đang SPI_SEQ_PENDING, cấm gọi lồng cùng Sequence!`, "SWS_Spi_00081");
  }
  const jobList = jobs || [{ name: "Job_SbcWdg", prio: 2, cs: "CS_SBC", bytes: [...simState.spiTxBytes] }];

  // Preemption check for SpiInterruptibleSequence + higher priority job
  if (simState.spiStatus === "SPI_BUSY" && ecucConfig.SpiInterruptibleSequence && jobList[0].prio >= 3) {
    simState.spiPausedJob = simState.spiPendingJobs.shift() || { name: "Job_Eeprom_B", prio: 1, cs: "CS_EEP" };
    simState.spiPendingJobs.unshift(simState.spiPausedJob);
    simState.spiPendingJobs.unshift(jobList[0]);
    simState.spiActiveJob = jobList[0].name;
    addApiTrace("Spi", "PREEMPT ⚡", `Spi_AsyncTransmit(${seqName}, Prio=${jobList[0].prio}) [Chèn Ngang]`, `SpiInterruptibleSequence=TRUE → tạm hoãn Job prio thấp, chạy ngay ${jobList[0].name}!`, "SWS_Spi_00008", "cbk");
    recomputeRegisters();
    return;
  }

  simState.spiStatus = "SPI_BUSY";
  simState.spiSeqResult = "SPI_SEQ_PENDING";
  simState.spiJobResult = "SPI_JOB_PENDING";
  simState.spiCsLow = true;
  simState.spiActiveSeq = seqName;
  simState.spiActiveJob = jobList[0].name;
  simState.spiPendingJobs = [...jobList];
  addApiTrace("Spi", "ASYNC TX", `Spi_AsyncTransmit(${seqName}) -> SPI_SEQ_PENDING`, `Kéo chân ${jobList[0].cs}=LOW, dịch MOSI [${simState.spiTxBytes.join(" ")}] (${ecucConfig.SpiAsyncMode})`, "SWS_Spi_00177", "tx");
  recomputeRegisters();
}

function mcalSpiStepComplete() {
  if (simState.spiStatus !== "SPI_BUSY") return;
  if (simState.spiHwError) {
    simState.spiJobResult = "SPI_JOB_FAILED";
    simState.spiSeqResult = "SPI_SEQ_FAILED";
    simState.spiStatus = "SPI_IDLE";
    simState.spiCsLow = false;
    simState.spiPendingJobs = [];
    demReport("Spi", "SPI_E_HARDWARE_ERROR", true, "Timeout dịch bit QSPI phần cứng → SPI_JOB_FAILED & SPI_SEQ_FAILED", "SWS_Spi_00068");
    recomputeRegisters();
    return;
  }
  const doneJob = simState.spiPendingJobs.shift() || { name: simState.spiActiveJob, prio: 2 };
  const rxSim = simState.spiTxBytes.map(h => fmtHex2((parseHexInt(h, 0x55) ^ 0xFF)));
  simState.spiRxBytes = rxSim;
  simState.hwIrqPending = true;
  simState.lastIrqSource = "SPI_QEND_ISR";
  addApiTrace("Spi", "CALLBACK ↑", `Spi_JobEndNotification(${doneJob.name}) -> SPI_JOB_OK`, `Nhả chân CS=HIGH | MISO Rx=[${rxSim.join(" ")}]`, "SWS_Spi_00259", "cbk");

  if (simState.spiPendingJobs.length === 0) {
    simState.spiJobResult = "SPI_JOB_OK";
    simState.spiSeqResult = "SPI_SEQ_OK";
    simState.spiStatus = "SPI_IDLE";
    simState.spiCsLow = false;
    simState.spiActiveJob = "None";
    addApiTrace("Spi", "SEQ END ↑", `Spi_SeqEndNotification(${simState.spiActiveSeq}) -> SPI_SEQ_OK`, "Hoàn tất mọi Job trong Sequence (Bit 6 JOB_SEQ_PEND=0, Bit 3 SPI_SHF_BSY=0)", "SWS_Spi_00264", "ok");
  } else {
    simState.spiActiveJob = simState.spiPendingJobs[0].name;
    addApiTrace("Spi", "NEXT JOB", `Chạy tiếp Job kế trong hàng đợi: ${simState.spiActiveJob} (Prio=${simState.spiPendingJobs[0].prio})`, "Kéo lại CS=LOW cho Job tiếp theo", "SWS_Spi_00008", "tx");
  }
  recomputeRegisters();
}

function mcalCanSetControllerMode(newMode) {
  if (!simState.canInit) return detReport("Can", 80, "0x03", "CAN_E_UNINIT", "Gọi Can_SetControllerMode() trước Can_Init()", "SWS_Can_00198");
  const cur = simState.canControllerMode;
  if (cur === "CAN_CS_STARTED" && newMode === "CAN_CS_SLEEP") {
    return detReport("Can", 80, "0x03", "CAN_E_TRANSITION", "Sai máy trạng thái SWS_Can_00414: Phải chuyển STARTED → STOPPED rồi mới sang SLEEP!", "SWS_Can_00409");
  }
  simState.canControllerMode = newMode;
  if (newMode === "CAN_CS_STARTED") {
    simState.canErrorState = "CAN_ERRORSTATE_ACTIVE";
    simState.canTec = 0;
    simState.canWakeupDetected = false;
  }
  addApiTrace("Can", "MODE IND ↑", `Can_SetControllerMode(0, ${newMode}) -> CanIf_ControllerModeIndication`, `Controller chuyển ${cur} → ${newMode} (Bit 2 CAN_TXRX_OK=${newMode === "CAN_CS_STARTED" ? 1 : 0})`, "SWS_Can_00260", newMode === "CAN_CS_STARTED" ? "ok" : "warn");
  recomputeRegisters();
}

function mcalCanWrite(canIdHex, dlc = 16, payload = "11 22 33 44 55 66 77 88 99 AA BB CC DD EE FF 00") {
  if (!simState.canInit) return detReport("Can", 80, "0x06", "CAN_E_UNINIT", "Chưa gọi Can_Init()", "SWS_Can_00216");
  if (simState.canControllerMode !== "CAN_CS_STARTED") {
    addApiTrace("Can", "TX BLOCKED", "Can_Write(HTH_0) -> E_NOT_OK", `Controller đang ${simState.canControllerMode}, chưa ở CAN_CS_STARTED!`, "SWS_Can_00212", "warn");
    return "E_NOT_OK";
  }
  const canId = parseHexInt(canIdHex, 0x40000201);
  const isFd = (canId & 0x40000000) !== 0;
  if ((dlc > 8 && (!isFd || !ecucConfig.CanFdBaudrateConfig))) {
    return detReport("Can", 80, "0x06", "CAN_E_PARAM_DATA_LENGTH", `DLC=${dlc} > 8 bytes nhưng CAN FD chưa bật (CanFdBaudrateConfig=${ecucConfig.CanFdBaudrateConfig})!`, "SWS_Can_00218");
  }
  const maxSlots = ecucConfig.CanMultiplexedTransmission ? 3 : 1;
  let slotIdx = -1;
  for (let i = 0; i < maxSlots; i++) {
    if (!simState.canTxMailboxes[i]) { slotIdx = i; break; }
  }
  const cleanId = "0x" + (canId & 0x1FFFFFFF).toString(16).toUpperCase();
  if (slotIdx < 0) {
    simState.canIfTxQueue.push({ id: canIdHex, cleanId, dlc, isFd, payload });
    addApiTrace("Can", "CAN_BUSY", `Can_Write(HTH_0, ID=${cleanId}) -> CAN_BUSY`, `Cả ${maxSlots} Tx Mailboxes đều đầy → CanIf xếp khung vào TxQueue phần mềm!`, "SWS_Can_00214", "warn");
    recomputeRegisters();
    return "CAN_BUSY";
  }
  simState.canTxMailboxes[slotIdx] = { id: canIdHex, cleanId, dlc, isFd, payload };
  simState.canLastTx = { id: canIdHex, dlc, fd: isFd, brs: isFd, data: payload };
  addApiTrace("Can", "CAN WRITE", `Can_Write(HTH_0, ID=${cleanId}, ${isFd ? "CAN-FD " + dlc + "B" : "CAN2.0 " + dlc + "B"})`, `Nạp vào Hardware Tx Mailbox #${slotIdx} (Multiplexed=${ecucConfig.CanMultiplexedTransmission})`, "SWS_Can_00276", "tx");
  recomputeRegisters();
  return "E_OK";
}

function mcalCanCompleteTxAndRx(injectRxId = null) {
  let txDone = 0;
  for (let i = 0; i < simState.canTxMailboxes.length; i++) {
    if (simState.canTxMailboxes[i]) {
      const m = simState.canTxMailboxes[i];
      simState.canTxMailboxes[i] = null;
      simState.canTxConfirmCount += 1;
      simState.hwIrqPending = true;
      simState.lastIrqSource = "CAN_TX_ISR";
      txDone += 1;
      addApiTrace("Can", "TX CONF ↑", `CanIf_TxConfirmation(PduId_${simState.canTxConfirmCount}) [ID=${m.cleanId}]`, `Khung từ Tx Mailbox #${i} phát xong lên CAN Bus → CanIf báo lên PduR/COM/SWC`, "SWS_Can_00016", "cbk");
    }
  }
  if (simState.canIfTxQueue.length > 0 && txDone > 0) {
    const nxt = simState.canIfTxQueue.shift();
    simState.canTxMailboxes[0] = nxt;
    addApiTrace("CanIf", "RE-QUEUE", `CanIf rút khung ID=${nxt.cleanId} từ TxQueue nạp xuống Can_Write()`, "Xả hàng đợi CanIf ngay sau TxConfirmation", "SWS_CanIf_00162", "tx");
  }
  if (injectRxId) {
    const rxVal = parseHexInt(injectRxId, 0x105);
    const code = parseHexInt(ecucConfig.CanHwFilterCodeHex, 0x100);
    const mask = 0x7F0;
    const match = (rxVal & mask) === (code & mask);
    simState.canLastRx = { id: "0x" + rxVal.toString(16).toUpperCase(), dlc: 8, data: "42 01 9A FF 00 10 20 30", accepted: match };
    if (!match) {
      addApiTrace("Can", "HW FILTER", `CAN Bus Frame ID=0x${rxVal.toString(16).toUpperCase()} [DROPPED BY HRH_0]`, `Không khớp Filter (Code=0x${code.toString(16).toUpperCase()}, Mask=0x7F0) → phần cứng lọc bỏ, 0 tốn ngắt CPU!`, "SWS_Can_00279", "warn");
    } else if (simState.canControllerMode === "CAN_CS_STARTED") {
      simState.canRxIndCount += 1;
      simState.hwIrqPending = true;
      simState.lastIrqSource = "CAN_RX_ISR";
      addApiTrace("Can", "RX IND ↑", `CanIf_RxIndication(HRH_0, ID=0x${rxVal.toString(16).toUpperCase()}, 8B)`, "Khớp bộ lọc HRH_0 → ngắt Rx đẩy PDU lên CanIf → PduR → COM → RTE → SWC", "SWS_Can_00279", "rx");
    }
  }
  recomputeRegisters();
}

function mcalCanTriggerBusOff() {
  if (!simState.canInit) return detReport("Can", 80, "0x03", "CAN_E_UNINIT", "Chưa gọi Can_Init()", "SWS_Can_00198");
  simState.canTec = 256;
  simState.canErrorState = "CAN_ERRORSTATE_BUSOFF";
  simState.canControllerMode = "CAN_CS_STOPPED";
  simState.canTxMailboxes = [null, null, null];
  simState.hwIrqPending = true;
  simState.lastIrqSource = "CAN_BUSOFF_ISR";
  addApiTrace("Can", "BUS-OFF ↑", "CanIf_ControllerBusOff(Ctrl_0) -> CanSM_ControllerBusOff", "TEC đạt 256 (CAN_ERRORSTATE_BUSOFF) → tự động ngắt bus & chuyển CAN_CS_STOPPED (Bit 2 = 0)!", "SWS_Can_00020", "err");
  recomputeRegisters();
}

function mcalFlsStartJob(jobType, addrHexStr, lenBytes = 16) {
  if (!simState.flsInit) return detReport("Fls", 92, "0x01", "FLS_E_UNINIT", "Gọi Fls API trước Fls_Init()", "SWS_Fls_00014");
  if (simState.flsStatus === "MEMIF_BUSY") {
    return detReport("Fls", 92, "0x02", "FLS_E_BUSY", `Flash đang MEMIF_BUSY (${simState.flsActiveJob}), không thể nhận thêm lệnh ${jobType}!`, "SWS_Fls_00023");
  }
  const addr = parseHexInt(addrHexStr !== undefined ? addrHexStr : ecucConfig.FlsTargetAddressHex, 0);
  const pgSize = clampNum(ecucConfig.FlsPageSize, 4, 64, 8);
  if (jobType === "WRITE" && (addr % pgSize !== 0 || addr + lenBytes > 32)) {
    return detReport("Fls", 92, "0x02", "FLS_E_PARAM_ADDRESS", `Địa chỉ 0x${addr.toString(16).toUpperCase()} chưa căn chỉnh theo FlsPageSize=${pgSize}B hoặc vượt Sector!`, "SWS_Fls_00026");
  }
  const writeBytes = parseHexBytes(ecucConfig.FlsWriteDataHex, 16);
  while (writeBytes.length < 16) writeBytes.push(0xAA);

  simState.flsStatus = "MEMIF_BUSY";
  simState.flsJobResult = "MEMIF_JOB_PENDING";
  simState.flsActiveJob = jobType;
  simState.flsJobAddr = addr;
  simState.flsJobLen = jobType === "ERASE" ? 32 : lenBytes;
  simState.flsJobDoneBytes = 0;
  simState.flsWriteBytes = writeBytes.slice(0, Math.max(8, lenBytes));
  addApiTrace("Fls", `FLS ${jobType}`, `Fee -> Fls_${jobType === "ERASE" ? "Erase" : jobType === "WRITE" ? "Write" : jobType === "READ" ? "Read" : jobType === "COMPARE" ? "Compare" : "BlankCheck"}(0x${addr.toString(16).toUpperCase().padStart(4, "0")}, ${simState.flsJobLen}B)`, "Đặt MEMIF_BUSY + MEMIF_JOB_PENDING (Bit 1 FLS_HV_BUSY=1). Bấm +1 Tick để chạy Fls_MainFunction()", "SWS_Fls_00218", "tx");
  recomputeRegisters();
}

function mcalFlsMainFunctionStep() {
  if (simState.flsStatus !== "MEMIF_BUSY") return false;
  const isFast = ecucConfig.FlsDefaultMode === "MEMIF_MODE_FAST";
  const stepChunk = simState.flsActiveJob === "ERASE" ? 32 : (isFast ? 32 : 8);

  if (simState.flsHwFault) {
    simState.flsStatus = "MEMIF_IDLE";
    simState.flsJobResult = "MEMIF_JOB_FAILED";
    const job = simState.flsActiveJob;
    simState.flsActiveJob = "NONE";
    demReport("Fls", job === "ERASE" ? "FLS_E_ERASE_FAILED" : "FLS_E_WRITE_FAILED", true, "Lỗi bơm điện áp cao Flash silicon!", "SWS_Fls_00260");
    addApiTrace("Fls", "JOB ERR ↑", "Fee_JobErrorNotification()", "Báo lỗi Flash thất bại lên Fee → NvM", "SWS_Fls_00349", "err");
    recomputeRegisters();
    return true;
  }

  const end = Math.min(simState.flsJobLen, simState.flsJobDoneBytes + stepChunk);
  if (simState.flsActiveJob === "ERASE") {
    for (let i = 0; i < 32; i++) simState.flsMemory[i] = 0xFF;
    simState.flsSectorErased = true;
  } else if (simState.flsActiveJob === "WRITE") {
    for (let i = simState.flsJobDoneBytes; i < end; i++) {
      const targetIdx = (simState.flsJobAddr + i) % 32;
      if (ecucConfig.FlsWriteVerificationEnabled && simState.flsMemory[targetIdx] !== 0xFF) {
        simState.flsStatus = "MEMIF_IDLE";
        simState.flsJobResult = "MEMIF_JOB_FAILED";
        simState.flsActiveJob = "NONE";
        detReport("Fls", 92, "0x0B", "FLS_E_VERIFY_WRITE_FAILED", `Ô nhớ [0x${targetIdx.toString(16).padStart(4,"0")}]=0x${fmtHex2(simState.flsMemory[targetIdx])} chưa Erase về 0xFF!`, "SWS_Fls_00056");
        demReport("Fls", "FLS_E_WRITE_FAILED", true, "Write Verification Fail do ghi đè lên ô Flash chưa xóa", "SWS_Fls_00316");
        addApiTrace("Fls", "JOB ERR ↑", "Fee_JobErrorNotification()", "Hủy Job ghi và báo lỗi lên Fee → NvM", "SWS_Fls_00349", "err");
        recomputeRegisters();
        return true;
      }
      simState.flsMemory[targetIdx] = simState.flsWriteBytes[i % simState.flsWriteBytes.length];
    }
    simState.flsSectorErased = false;
  } else if (simState.flsActiveJob === "BLANK_CHECK") {
    const notBlank = simState.flsMemory.slice(simState.flsJobAddr, simState.flsJobAddr + end).some(b => b !== 0xFF);
    if (notBlank) {
      simState.flsStatus = "MEMIF_IDLE";
      simState.flsJobResult = "MEMIF_BLOCK_INCONSISTENT";
      simState.flsActiveJob = "NONE";
      addApiTrace("Fls", "NOT BLANK ↑", "Fls_BlankCheck -> MEMIF_BLOCK_INCONSISTENT", "Phát hiện byte != 0xFF trong vùng kiểm tra → Fee_JobErrorNotification()", "SWS_Fls_00371", "warn");
      recomputeRegisters();
      return true;
    }
  } else if (simState.flsActiveJob === "COMPARE") {
    const exp = simState.flsCompareBytes.length > 0 ? simState.flsCompareBytes : simState.flsWriteBytes;
    const mismatch = simState.flsMemory.slice(simState.flsJobAddr, simState.flsJobAddr + end).some((b, idx) => b !== exp[idx % exp.length]);
    if (mismatch) {
      simState.flsStatus = "MEMIF_IDLE";
      simState.flsJobResult = "MEMIF_BLOCK_INCONSISTENT";
      simState.flsActiveJob = "NONE";
      addApiTrace("Fls", "CMP FAIL ↑", "Fls_Compare -> MEMIF_BLOCK_INCONSISTENT", "Dữ liệu Flash sai khác với RAM Buffer → Fee_JobErrorNotification()", "SWS_Fls_00200", "err");
      recomputeRegisters();
      return true;
    }
  }

  simState.flsJobDoneBytes = end;
  if (simState.flsJobDoneBytes >= simState.flsJobLen) {
    const finished = simState.flsActiveJob;
    simState.flsStatus = "MEMIF_IDLE";
    simState.flsJobResult = "MEMIF_JOB_OK";
    simState.flsActiveJob = "NONE";
    simState.hwIrqPending = true;
    simState.lastIrqSource = "FLS_DONE_ISR";
    addApiTrace("Fls", "JOB OK ↑", `Fls_MainFunction() -> MEMIF_JOB_OK (${finished})`, `Hoàn tất ${end}/${simState.flsJobLen}B → gọi Fee_JobEndNotification() lên Fee → NvM`, "SWS_Fls_00347", "ok");
  } else {
    addApiTrace("Fls", "MAIN STEP", `Fls_MainFunction() [${simState.flsActiveJob}]: ${end}/${simState.flsJobLen}B`, `Chế độ ${ecucConfig.FlsDefaultMode} xử lý tối đa ${stepChunk}B mỗi nhịp OS Task`, "SWS_Fls_00037", "rx");
  }
  recomputeRegisters();
  return true;
}

function mcalFlsCancel() {
  if (!simState.flsInit) return detReport("Fls", 92, "0x03", "FLS_E_UNINIT", "Chưa gọi Fls_Init()", "SWS_Fls_00183");
  if (simState.flsStatus !== "MEMIF_BUSY") {
    addApiTrace("Fls", "NO JOB", "Fls_Cancel() [No Active Job]", "Flash đang MEMIF_IDLE", "SWS_Fls_00229", "warn");
    return;
  }
  simState.flsStatus = "MEMIF_IDLE";
  simState.flsJobResult = "MEMIF_JOB_CANCELED";
  simState.flsActiveJob = "NONE";
  addApiTrace("Fls", "CANCELED ↑", "Fls_Cancel() -> MEMIF_JOB_CANCELED", "Ngắt bơm HV khẩn cấp (Bit 1 FLS_HV_BUSY=0) & gọi Fee_JobErrorNotification()", "SWS_Fls_00229", "warn");
  recomputeRegisters();
}

function stepClockTick(ms = 1) {
  simState.clockMs += ms;
  simState.mainFnTicks += 1;
  simState.hwIrqPending = false;

  // Progress pending async jobs cleanly
  if (simState.adcGroupStatus === "ADC_BUSY") {
    mcalAdcCompleteSampleStep();
  } else if (simState.adcGroupStatus === "ADC_COMPLETED" && ecucConfig.AdcGroupAccessMode === "ADC_ACCESS_MODE_STREAMING") {
    mcalAdcCompleteSampleStep();
  }
  if (simState.spiStatus === "SPI_BUSY") {
    mcalSpiStepComplete();
  }
  if (simState.canTxMailboxes.some(m => m !== null)) {
    mcalCanCompleteTxAndRx(null);
  }
  mcalFlsMainFunctionStep();

  if (simState.apiTraces.length === 0 || (simState.clockMs % 1 === 0 && !simState.hwIrqPending && simState.flsStatus === "MEMIF_IDLE")) {
    // Keep trace focused; log idle tick only if nothing async fired
    const latest = simState.apiTraces[0];
    if (!latest || latest.clockMs !== simState.clockMs) {
      addApiTrace("SchM", "OS TICK", `SchM_MainFunction Tick @ ${simState.clockMs}ms`, "Quét chu kỳ Fls_MainFunction / Spi_MainFunction / Can_MainFunction (All Idle)", "SWS_SchM", "ok");
    }
  }
  recomputeRegisters();
  if (typeof renderAll === "function") renderAll();
}

// ==================== LIVE C CODE GENERATOR FOR INSPECTOR TAB 2 ====================

function getLiveModuleCCode(modId) {
  const dutyHex = fmtHex4(simState.pwmDutyHex);
  const flsAddrHex = fmtHex4(simState.flsJobAddr || parseHexInt(ecucConfig.FlsTargetAddressHex, 0));
  const flsPg = clampNum(ecucConfig.FlsPageSize, 4, 64, 8);
  const canIdHex = ecucConfig.CanTxFrameIdHex || "0x40000201";

  const snippets = {
    MOD_MCU: `/* Mcu.c & EcuM_Callout_Stubs.c (AUTOSAR R23-11 · ModId 101) */
Mcu_Init(&Mcu_Config);                         /* SWS_Mcu_00026 */
Mcu_InitClock(McuConf_McuClockSetting_${ecucConfig.McuClockReferencePointFrequencyMhz}MHz); /* ${ecucConfig.McuNoPll ? "McuNoPll=TRUE (16MHz)" : "Start PLL VCO"} */
while (Mcu_GetPllStatus() != MCU_PLL_LOCKED) { /* Wait PLL_SR[LOCK] */ }
Mcu_DistributePllClock();                      /* fCPU=${simState.fCpuMhz}MHz, fCAN=${simState.fCanMhz}MHz */
Mcu_ResetType rst = Mcu_GetResetReason();      /* Currently: ${simState.resetReason} */
Mcu_SetMode(${simState.powerMode});            /* Power Mode Control */`,

    MOD_PORT: `/* Port.c — Pin Mux & Direction Config (AUTOSAR R23-11 · ModId 124) */
Port_Init(&Port_Config);                       /* Init Level -> PCR[0..7] */
/* PA0 DirectionChangeable=${ecucConfig.PortPinDirectionChangeable ? "TRUE" : "FALSE"}, ModeChangeable=${ecucConfig.PortPinModeChangeable ? "TRUE" : "FALSE"} */
Port_SetPinDirection(PortConf_PA0, ${ecucConfig.PortPinDirection});
Port_SetPinMode(PortConf_PA0, ${ecucConfig.PortPinInitialMode});
Port_RefreshPortDirection();                   /* Anti-EMC refresh fixed pins */`,

    MOD_DIO: `/* Dio.c — Stateless Atomic I/O (AUTOSAR R23-11 · ModId 120) */
/* Notice: No Dio_Init() in AUTOSAR R20-11/R23-11 (Handled by Port_Init) */
Dio_LevelType ign = Dio_ReadChannel(DioConf_IgnSw_PA0); /* = ${simState.pins[0].level ? "STD_HIGH" : "STD_LOW"} */
Dio_WriteChannel(DioConf_WarnLed_PA1, ${simState.pins[1].level ? "STD_HIGH" : "STD_LOW"});
Dio_FlipChannel(DioConf_WarnLed_PA1);
static const Dio_ChannelGroupType LedGroup = { .mask = ${ecucConfig.DioPortMaskHex}, .offset = ${simState.dioGroupOffset}, .port = DIO_PORT_0 };
Dio_WriteChannelGroup(&LedGroup, 0x0A);        /* Port0 = 0x${fmtHex2(simState.dioPortVal)} */`,

    MOD_ADC: `/* Adc.c — SAR Group & Streaming Buffer (AUTOSAR R23-11 · ModId 123) */
Adc_Init(&Adc_Config);                         /* SWS_Adc_00054 */
Adc_SetupResultBuffer(AdcGroup_0, AdcRawBuf);  /* BuffReady=${simState.adcBufferReady} */
Adc_EnableGroupNotification(AdcGroup_0);       /* Notif=${simState.adcNotifEnabled} */
/* Trigger=${ecucConfig.AdcGroupTriggSrc}, Access=${ecucConfig.AdcGroupAccessMode} */
${ecucConfig.AdcGroupTriggSrc === "ADC_TRIGG_SRC_HW" ? "Adc_EnableHardwareTrigger(AdcGroup_0);" : "Adc_StartGroupConversion(AdcGroup_0);"}
/* Status=${simState.adcGroupStatus}, AN0 Raw=${simState.adcRawAn0} (${ecucConfig.AdcSimInputVoltageMv}mV) */
Adc_ReadGroup(AdcGroup_0, &AppValues[0]);`,

    MOD_PWM: `/* Pwm.c — 16-bit Standardized Duty 0..0x8000 (ModId 121) */
Pwm_Init(&Pwm_Config);                         /* Class=${ecucConfig.PwmChannelClass} */
/* CompareTicks = (PeriodTicks * ${dutyHex}) >> 15 */
Pwm_SetDutyCycle(PwmConf_Fan_Ch0, ${dutyHex}); /* ${dutyHexToPct(simState.pwmDutyHex)}% · Period=${simState.pwmPeriodUs}us */
${ecucConfig.PwmChannelClass === "PWM_VARIABLE_PERIOD" ? `Pwm_SetPeriodAndDuty(PwmConf_Fan_Ch0, ${simState.pwmPeriodUs}, ${dutyHex});` : "/* FIXED_PERIOD: Pwm_SetPeriodAndDuty triggers PWM_E_PERIOD_UNCHANGEABLE */"}
${simState.pwmIdleForced ? "Pwm_SetOutputToIdle(PwmConf_Fan_Ch0); /* Active Safe Idle */" : "/* Output Running Active */"}`,

    MOD_SPI: `/* Spi.c — Hierarchical Sequence -> Job -> Channel (ModId 83) */
Spi_Init(&Spi_Config);                         /* Level=${ecucConfig.SpiLevelDelivered}, Buffers=${ecucConfig.SpiChannelBuffersAllowed} */
Spi_SetAsyncMode(${ecucConfig.SpiAsyncMode});
Spi_WriteIB(SpiConf_Ch_Sbc, (const Spi_DataBufferType[]){ ${simState.spiTxBytes.map(b => "0x" + b).join(", ")} });
Spi_AsyncTransmit(SpiConf_Seq_SbcControl);     /* Seq=${simState.spiSeqResult} */
/* Callback: Spi_JobEndNotification() -> Spi_SeqEndNotification() */
Spi_ReadIB(SpiConf_Ch_Sbc, RxBuf);             /* MISO=[${simState.spiRxBytes.join(" ")}] */`,

    MOD_CAN: `/* Can.c & CanIf.c — FlexCAN / CAN FD HOH Routing (ModId 80) */
Can_Init(&Can_Config);
Can_SetControllerMode(CAN_CTRL_0, ${simState.canControllerMode});
Can_PduType pdu = { .swPduHandle = 1U, .id = ${canIdHex}U, .length = ${simState.canLastTx.dlc}U, .sdu = TxData };
Std_ReturnType ret = Can_Write(CanConf_HTH_0, &pdu); /* Multiplexed=${ecucConfig.CanMultiplexedTransmission} */
/* Rx HW Filter HRH_0: Code=${ecucConfig.CanHwFilterCodeHex}, Mask=0x7F0 -> CanIf_RxIndication() */
/* TEC=${simState.canTec}, ErrorState=${simState.canErrorState} */`,

    MOD_FLS: `/* Fls.c & Fee.c — Async Sector Erase / Page Write (ModId 92) */
Fls_Init(&Fls_Config);                         /* Mode=${ecucConfig.FlsDefaultMode}, PageSize=${flsPg}B */
Fls_Erase(${flsAddrHex}U, 32U);                /* Sector Reset -> 0xFF */
Fls_Write(${flsAddrHex}U, TxDataPtr, 16U);     /* Verify=${ecucConfig.FlsWriteVerificationEnabled ? "TRUE" : "FALSE"} */
/* Periodic OS Task (SchM): Status=${simState.flsStatus}, Job=${simState.flsJobResult} */
Fls_MainFunction();                            /* Calls Fee_JobEndNotification() when done */`,

    MOD_SWC: `/* SWC_ThermalCtrl.c — Application Layer (Isolated from MCAL!) */
void RE_ThermalMain_10ms(void) {
  float32 tempC = 0.0f;
  Rte_Call_RP_TempSens_Read(&tempC);           /* -> IoHwAb -> Adc_ReadGroup() (${simState.swcThermal.tempC}°C) */
  uint8 fanPct = (tempC >= 95.0f) ? 90U : (tempC >= 75.0f ? 60U : 25U);
  boolean ledOn = (tempC >= 95.0f) ? TRUE : FALSE;
  Rte_Call_RP_CoolingFan_SetSpeed(fanPct);     /* -> IoHwAb -> Pwm_SetDutyCycle(${simState.swcThermal.fanPct}%) */
  Rte_Call_RP_OverTempLed_Write(ledOn);        /* -> IoHwAb -> Dio_WriteChannel(PA1) */
}`
  };

  return snippets[modId] || snippets.MOD_MCU;
}
