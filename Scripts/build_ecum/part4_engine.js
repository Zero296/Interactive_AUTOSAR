// ================= PART 4A: SIMULATION ENGINE, ECUC SYNC & AUTOSAR ECUM API HANDLERS =================

const defaultConfig = {
  // Tab 0: General
  EcuMInitialized: true,
  EcuMArchitectureVariant: "ECUM_FLEXIBLE_WITH_BSWM",
  EcuMDevErrorDetect: true,
  EcuMVersionInfoApi: false,
  EcuMMainFunctionPeriod: 10,
  EcuMLoopDetectionEnabled: false,
  // Tab 1: Startup & Post-Build
  EcuMDefaultAppMode: "OSDEFAULTAPPMODE",
  EcuMConfigConsistencyHash: "0x5A3C9F01",
  InjectedPbConfigHash: "0x5A3C9F01",
  SimulatedMcuResetReason: "MCU_POWER_ON_RESET",
  EcuMDriverInitZeroEnabled: true,
  EcuMDriverInitOneEnabled: true,
  // Tab 2: Shutdown & Sleep
  EcuMDefaultShutdownTarget: "ECUM_STATE_SLEEP",
  EcuMSleepModeId: "0",
  EcuMSleepModeSuspend: true,
  EcuMResetModeId: "ECUM_RESET_MCU",
  EcuMShutdownCauseId: "ECUM_CAUSE_ECU_STATE",
  CurrentBootTarget: "ECUM_BOOT_TARGET_APP",
  // Tab 3: Wakeup Sources
  Can0WakeupValidationTimeout: 500,
  Lin1WakeupValidationTimeout: 300,
  Kl15WakeupValidationTimeout: 0,
  Can0ComMChannelRefEnabled: true,
  Can0ComMPNCRefEnabled: false,
  EcuMSleepModeWakeupSourceMask: "0xE0",
  // Tab 4: RUN & AlarmClock
  EcuMRunMinimumDuration: 300,
  User0_RunRequestActive: false,
  User1_PostRunRequestActive: false,
  EcuMAlarmClockPresent: true,
  EcuMAlarmClockTimeOut: 400,
  EcuMGoDownAllowedForUser0: true,
  // Tab 5: Multi-Core & Faults
  EcuMMultiCoreSupport: false,
  SlaveCore1ReadyForSleep: true,
  SimulateRamHashCorruption: false,
  NvMWriteAllPendingDelay: false
};

let ecucConfig = JSON.parse(JSON.stringify(defaultConfig));

function createInitialSimState() {
  return {
    clockMs: 0,
    initialized: true,
    osStarted: true,
    bswmHandover: true,
    majorPhase: "UP",
    subState: "ECUM_STATE_RUN",
    mcuMode: "MCU_NORMAL",
    shutdownTarget: "ECUM_STATE_SLEEP",
    sleepModeId: 0,
    resetModeId: "ECUM_RESET_MCU",
    shutdownCause: "ECUM_CAUSE_ECU_STATE",
    bootTarget: "ECUM_BOOT_TARGET_APP",
    lastShutdownTarget: "ECUM_STATE_OFF",
    user0RunReq: false,
    user1PostRunReq: false,
    runMinLeftMs: 0,
    goDownActive: false,
    waitingMultiCoreSync: false,
    core1Started: false,
    ramHashValue: "0xA55A",
    ramHashValid: true,
    configHashMismatch: false,
    pendingMask: 0x00,
    validatedMask: 0x01,
    expiredMask: 0x00,
    enabledSleepMask: 0xE0,
    validationTimers: {},
    alarmClockActive: false,
    alarmClockLeftMs: 0,
    nvmReadDone: true,
    nvmWritePendingMs: 0,
    commWakeupIndicatedCh0: false,
    commPncIndicated16: false,
    detFaults: [],
    regAByte: 0xE1,
    regBByte: 0x22,
    prevRegAByte: 0xE1,
    prevRegBByte: 0x22,
    activeModId: "MOD_ECUM",
    activeArrows: [],
    stepExplain: "Hệ thống EcuM đang hoạt động ở pha UP (ECUM_STATE_RUN). Chọn kịch bản hoặc dùng Thao Tác Nhanh.",
    traceLogs: []
  };
}

let simState = createInitialSimState();

function parseMaskHex(str, fallback = 0xE0) {
  const clean = String(str || "").trim().replace(/^0x/i, "");
  const val = parseInt(clean, 16);
  return Number.isFinite(val) ? (val & 0xFF) : fallback;
}

function fmtHex2(val) {
  return "0x" + (val & 0xFF).toString(16).toUpperCase().padStart(2, "0");
}

function getWakeupSourceByMask(mask) {
  return WAKEUP_SOURCES.find((w) => w.mask === mask) || null;
}

function getSourceValidationTimeout(mask) {
  if (mask === 0x20) return Math.max(0, Number(ecucConfig.Can0WakeupValidationTimeout) || 0);
  if (mask === 0x40) return Math.max(0, Number(ecucConfig.Lin1WakeupValidationTimeout) || 0);
  if (mask === 0x80) return Math.max(0, Number(ecucConfig.Kl15WakeupValidationTimeout) || 0);
  return 0; // Bit 0..4 standard sources have immediate validation (0 ms)
}

function logApi(api, detail, level = "info", arrows = []) {
  simState.traceLogs.unshift({ t: simState.clockMs, api, detail, level });
  if (simState.traceLogs.length > 70) simState.traceLogs.length = 70;
  if (arrows && arrows.length) {
    simState.activeArrows = Array.from(new Set([...simState.activeArrows, ...arrows]));
  }
}

function reportDetError(serviceIdHex, errorCode, detail) {
  if (!ecucConfig.EcuMDevErrorDetect) return;
  simState.detFaults.unshift({ t: simState.clockMs, serviceId: serviceIdHex, code: errorCode, detail });
  if (simState.detFaults.length > 20) simState.detFaults.length = 20;
  logApi("Det_ReportError(10, 0, " + serviceIdHex + ", " + errorCode + ")", detail, "err", ["arr_ecum_det"]);
}

function checkEcuMInitialized(serviceIdHex, apiName) {
  if (!simState.initialized) {
    reportDetError(serviceIdHex, "ECUM_E_UNINIT (0x10)", apiName + " bị từ chối vì EcuM chưa khởi tạo (ECUM_UNINIT).");
    return false;
  }
  return true;
}

function recomputeRegisters() {
  simState.prevRegAByte = simState.regAByte;
  simState.prevRegBByte = simState.regBByte;

  let a = 0;
  if (simState.initialized) a |= 0x80;
  if (simState.osStarted) a |= 0x40;
  if (simState.bswmHandover) a |= 0x20;
  if (simState.user0RunReq || simState.runMinLeftMs > 0) a |= 0x10;
  if (simState.subState === "ECUM_STATE_APP_POST_RUN" || simState.user1PostRunReq) a |= 0x08;
  if (simState.goDownActive) a |= 0x04;
  if (simState.subState === "SLEEP_GO_HALT") a |= 0x02;
  if (simState.ramHashValid) a |= 0x01;

  let b = 0;
  if (simState.pendingMask !== 0) b |= 0x80;
  if (Object.keys(simState.validationTimers).some((k) => simState.validationTimers[k] && simState.validationTimers[k].leftMs > 0)) b |= 0x40;
  if (simState.validatedMask !== 0) b |= 0x20;
  if (simState.expiredMask !== 0) b |= 0x10;
  if (simState.subState === "SLEEP_GO_POLL") b |= 0x08;
  if (simState.alarmClockActive && simState.alarmClockLeftMs > 0) b |= 0x04;
  if (!ecucConfig.EcuMMultiCoreSupport || (simState.core1Started && ecucConfig.SlaveCore1ReadyForSleep)) b |= 0x02;
  if (simState.detFaults.length > 0 || !simState.ramHashValid || simState.configHashMismatch) b |= 0x01;

  simState.regAByte = a & 0xFF;
  simState.regBByte = b & 0xFF;
}

function evaluateUpPhaseSubState() {
  if (simState.majorPhase !== "UP") return;
  if (simState.user0RunReq || simState.runMinLeftMs > 0) {
    simState.subState = "ECUM_STATE_APP_RUN";
  } else if (simState.user1PostRunReq) {
    simState.subState = "ECUM_STATE_APP_POST_RUN";
  } else if (simState.nvmWritePendingMs > 0) {
    simState.subState = "ECUM_STATE_PREP_SHUTDOWN";
  } else if (simState.subState !== "ECUM_STATE_RUN") {
    simState.subState = "ECUM_STATE_PREP_SHUTDOWN";
  }
}

// -------------------- AUTOSAR ECUM API & CALLOUT HANDLERS --------------------

function api_EcuM_StartPreOS(runToCompletion = false) {
  simState.activeArrows = [];
  simState.majorPhase = "STARTUP";
  simState.subState = "STARTUP_PRE_OS";
  simState.osStarted = false;
  simState.bswmHandover = false;
  simState.goDownActive = false;
  simState.waitingMultiCoreSync = false;
  simState.mcuMode = "MCU_NORMAL";
  simState.pendingMask = 0;
  simState.validatedMask = 0;
  simState.expiredMask = 0;
  simState.validationTimers = {};
  simState.configHashMismatch = false;
  simState.ramHashValid = true;
  simState.ramHashValue = "0xA55A";

  if (ecucConfig.EcuMDriverInitZeroEnabled) {
    logApi("EcuM_AL_DriverInitZero()", "SWS_EcuM_02411: Khởi tạo các module không dùng Post-Build (Det_Init).", "info", ["arr_boot_ecum"]);
  }

  logApi("EcuM_DeterminePbConfiguration()", "SWS_EcuM_02795: Nạp con trỏ cấu hình Post-Build EcuM_PBcfg.", "info", ["arr_boot_ecum"]);
  const expHash = String(ecucConfig.EcuMConfigConsistencyHash || "").trim().toUpperCase();
  const actHash = String(ecucConfig.InjectedPbConfigHash || "").trim().toUpperCase();
  if (expHash !== actHash) {
    simState.initialized = false;
    simState.configHashMismatch = true;
    simState.majorPhase = "ERROR";
    simState.subState = "ERROR_HOOK_HALT";
    logApi("EcuM_ErrorHook(ECUM_E_CONFIGURATION_DATA_INCONSISTENT)", "SWS_EcuM_02796: Hash mismatch (" + actHash + " != " + expHash + ")! Dừng trước StartOS().", "err", ["arr_ecum_det"]);
    recomputeRegisters();
    return false;
  }

  simState.initialized = true;
  ecucConfig.EcuMInitialized = true;

  if (ecucConfig.EcuMLoopDetectionEnabled) {
    logApi("EcuM_LoopDetection()", "SWS_EcuM_02927: Kiểm tra bộ đếm Reset lặp bất thường ở pha StartPreOS -> OK.", "info", ["arr_boot_ecum"]);
  }

  if (ecucConfig.EcuMDriverInitOneEnabled) {
    logApi("EcuM_AL_DriverInitOne(PbCfg)", "SWS_EcuM_02416: Khởi tạo MCAL (Mcu, Port, Dio, Gpt, CanTrcv) trước StartOS.", "info", ["arr_ecum_mcu"]);
  }

  // Reset reason mapping
  const rst = ecucConfig.SimulatedMcuResetReason;
  let rstMask = 0x01;
  if (rst === "MCU_EXT_RESET") rstMask = 0x02;
  else if (rst === "MCU_SW_RESET") rstMask = 0x04;
  else if (rst === "MCU_WATCHDOG_RESET") rstMask = 0x08;
  simState.validatedMask |= rstMask;
  const srcObj = getWakeupSourceByMask(rstMask);
  logApi("Mcu_GetResetReason() -> " + rst, "SWS_EcuM_02623: Ánh xạ thành " + (srcObj ? srcObj.fullName : rstMask) + " vào ValidatedWakeupEvents.", "ok", ["arr_mcu_ecum"]);

  simState.shutdownTarget = ecucConfig.EcuMDefaultShutdownTarget;
  simState.sleepModeId = Number(ecucConfig.EcuMSleepModeId) || 0;
  simState.resetModeId = ecucConfig.EcuMResetModeId;
  simState.bootTarget = ecucConfig.CurrentBootTarget;
  logApi("EcuM_SelectShutdownTarget(" + simState.shutdownTarget + ", " + simState.sleepModeId + ")", "SWS_EcuM_02185: Nạp ShutdownTarget mặc định trong EcuM_Init().", "info");

  if (ecucConfig.EcuMMultiCoreSupport) {
    simState.core1Started = true;
    logApi("StartCore(OS_CORE_ID_1, &Status)", "SWS_EcuM_04018: Master Core 0 kích hoạt Slave Core 1 trước khi gọi StartOS().", "ok", ["arr_ecum_os"]);
  } else {
    simState.core1Started = false;
  }

  simState.osStarted = true;
  logApi("StartOS(" + ecucConfig.EcuMDefaultAppMode + ")", "SWS_EcuM_02603: Kết thúc StartPreOS, bàn giao CPU cho AUTOSAR OS.", "ok", ["arr_ecum_os"]);

  if (runToCompletion) {
    api_EcuM_StartupTwo();
  } else {
    recomputeRegisters();
  }
  return true;
}

function api_EcuM_StartupTwo() {
  if (!checkEcuMInitialized("0x1A", "EcuM_StartupTwo")) return false;
  simState.majorPhase = "STARTUP";
  simState.subState = "STARTUP_POST_OS";
  simState.osStarted = true;
  logApi("SchM_Init(&SchM_Config)", "SWS_EcuM_02838: Khởi tạo BSW Scheduler (bên trong OsTask_Init).", "info", ["arr_os_ecum"]);
  simState.bswmHandover = true;
  if (ecucConfig.EcuMArchitectureVariant === "ECUM_FLEXIBLE_WITH_BSWM") {
    logApi("BswM_Init(&BswM_Config)", "SWS_EcuM_04004: Bàn giao quyền điều phối chế độ & khởi tạo BSW dùng OS (NvM_ReadAll, ComM_Init, Rte_Start) sang BswM.", "ok", ["arr_ecum_bswm"]);
  } else {
    logApi("EcuM_DriverInitTwo/Three()", "SWS_EcuM_02310: EcuM Fixed tự khởi tạo NvM/Com/RTE theo danh sách cố định.", "info", ["arr_ecum_nvm"]);
  }
  simState.nvmReadDone = true;
  simState.majorPhase = "UP";
  simState.subState = "ECUM_STATE_RUN";
  simState.runMinLeftMs = Math.max(0, Number(ecucConfig.EcuMRunMinimumDuration) || 0);
  simState.user0RunReq = Boolean(ecucConfig.User0_RunRequestActive);
  simState.user1PostRunReq = Boolean(ecucConfig.User1_PostRunRequestActive);
  evaluateUpPhaseSubState();
  logApi("BswM_EcuM_CurrentState(ECUM_STATE_RUN)", "SWS_EcuM_04005: EcuM chuyển sang pha UP (RUN), bắt đầu đếm EcuMRunMinimumDuration (" + simState.runMinLeftMs + " ms).", "ok", ["arr_ecum_bswm"]);
  recomputeRegisters();
  return true;
}

function api_EcuM_RequestRUN(userId) {
  if (!checkEcuMInitialized("0x03", "EcuM_RequestRUN")) return false;
  if (userId < 0 || userId > 3) {
    reportDetError("0x03", "ECUM_E_INVALID_PAR (0x13)", "UserId = " + userId + " không hợp lệ.");
    recomputeRegisters();
    return false;
  }
  simState.user0RunReq = true;
  ecucConfig.User0_RunRequestActive = true;
  if (simState.majorPhase === "UP") {
    simState.subState = "ECUM_STATE_APP_RUN";
  }
  logApi("EcuM_RequestRUN(" + userId + ")", "SWS_EcuM_01144: SWC giữ trạng thái ECUM_STATE_APP_RUN (Bit 4 Thanh A = 1).", "ok", ["arr_swc_ecum", "arr_ecum_bswm"]);
  recomputeRegisters();
  return true;
}

function api_EcuM_ReleaseRUN(userId) {
  if (!checkEcuMInitialized("0x04", "EcuM_ReleaseRUN")) return false;
  simState.user0RunReq = false;
  ecucConfig.User0_RunRequestActive = false;
  evaluateUpPhaseSubState();
  logApi("EcuM_ReleaseRUN(" + userId + ")", "SWS_EcuM_01145: User " + userId + " nhả RUN. " + (simState.runMinLeftMs > 0 ? "Vẫn giữ RUN do EcuMRunMinimumDuration còn " + simState.runMinLeftMs + " ms." : "Chuyển sang " + simState.subState + "."), "info", ["arr_swc_ecum"]);
  recomputeRegisters();
  return true;
}

function api_EcuM_RequestPOST_RUN(userId) {
  if (!checkEcuMInitialized("0x0A", "EcuM_RequestPOST_RUN")) return false;
  simState.user1PostRunReq = true;
  ecucConfig.User1_PostRunRequestActive = true;
  evaluateUpPhaseSubState();
  logApi("EcuM_RequestPOST_RUN(" + userId + ")", "SWS_EcuM_01146: Giữ trạng thái hậu kỳ APP_POST_RUN (Bit 3 Thanh A = 1) để hoàn tất NvM/Diag.", "warn", ["arr_swc_ecum"]);
  recomputeRegisters();
  return true;
}

function api_EcuM_ReleasePOST_RUN(userId) {
  if (!checkEcuMInitialized("0x0B", "EcuM_ReleasePOST_RUN")) return false;
  simState.user1PostRunReq = false;
  ecucConfig.User1_PostRunRequestActive = false;
  evaluateUpPhaseSubState();
  logApi("EcuM_ReleasePOST_RUN(" + userId + ")", "SWS_EcuM_01147: Nhả POST_RUN -> " + simState.subState + ".", "info", ["arr_swc_ecum"]);
  recomputeRegisters();
  return true;
}

function api_EcuM_SelectShutdownTarget(target, mode) {
  if (!checkEcuMInitialized("0x06", "EcuM_SelectShutdownTarget")) return false;
  const validTargets = ["ECUM_STATE_SLEEP", "ECUM_STATE_RESET", "ECUM_STATE_OFF"];
  if (!validTargets.includes(target)) {
    reportDetError("0x06", "ECUM_E_STATE_PAR_OUT_OF_RANGE (0x16)", "ShutdownTarget '" + target + "' ngoài dải cho phép.");
    recomputeRegisters();
    return false;
  }
  simState.shutdownTarget = target;
  ecucConfig.EcuMDefaultShutdownTarget = target;
  if (target === "ECUM_STATE_SLEEP" && mode !== undefined) {
    simState.sleepModeId = Number(mode) || 0;
    ecucConfig.EcuMSleepModeId = String(simState.sleepModeId);
    ecucConfig.EcuMSleepModeSuspend = (simState.sleepModeId === 0);
  }
  if (target === "ECUM_STATE_RESET" && mode) {
    simState.resetModeId = mode;
    ecucConfig.EcuMResetModeId = mode;
  }
  logApi("EcuM_SelectShutdownTarget(" + target + ", " + (mode !== undefined ? mode : 0) + ")", "SWS_EcuM_02585: Đặt mục tiêu tắt/ngủ mới = " + target + ".", "info", ["arr_bswm_ecum"]);
  recomputeRegisters();
  return true;
}

function api_EcuM_SelectShutdownCause(cause) {
  if (!checkEcuMInitialized("0x1B", "EcuM_SelectShutdownCause")) return false;
  simState.shutdownCause = cause;
  ecucConfig.EcuMShutdownCauseId = cause;
  logApi("EcuM_SelectShutdownCause(" + cause + ")", "SWS_EcuM_04050: Ghi nhận nguyên nhân tắt nguồn = " + cause + ".", "info", ["arr_swc_ecum"]);
  recomputeRegisters();
  return true;
}

function api_EcuM_SelectBootTarget(bootTarget) {
  if (!checkEcuMInitialized("0x12", "EcuM_SelectBootTarget")) return false;
  simState.bootTarget = bootTarget;
  ecucConfig.CurrentBootTarget = bootTarget;
  logApi("EcuM_SelectBootTarget(" + bootTarget + ")", "SWS_EcuM_02247: Ghi BootTarget vào No-Init RAM để chuẩn bị cho lần Reset tiếp theo.", "warn", ["arr_swc_ecum", "arr_boot_ecum"]);
  recomputeRegisters();
  return true;
}

function api_EcuM_SetWakeupEvent(sourcesMask) {
  if (!checkEcuMInitialized("0x0C", "EcuM_SetWakeupEvent")) return false;
  if ((sourcesMask & ~0xFF) !== 0 || sourcesMask === 0) {
    reportDetError("0x0C", "ECUM_E_UNKNOWN_WAKEUP_SOURCE (0x17)", "Bitmask " + fmtHex2(sourcesMask) + " (0x" + sourcesMask.toString(16).toUpperCase() + ") không nằm trong danh sách EcuMWakeupSource hợp lệ!");
    recomputeRegisters();
    return false;
  }

  // If currently in SLEEP, check SleepWakeupSourceMask and execute WakeupRestart
  const wasSleeping = (simState.majorPhase === "SLEEP");
  if (wasSleeping) {
    const enabledMask = parseMaskHex(ecucConfig.EcuMSleepModeWakeupSourceMask, 0xE0);
    if ((sourcesMask & enabledMask & 0xE0) === 0 && (sourcesMask & 0xE0) !== 0 && !simState.alarmClockActive) {
      logApi("Wakeup Blocked (" + fmtHex2(sourcesMask) + ")", "Nguồn đánh thức không nằm trong EcuMSleepModeWakeupSourceMask (" + fmtHex2(enabledMask) + ") khi đang ngủ!", "warn");
      recomputeRegisters();
      return false;
    }
    executeWakeupRestart(sourcesMask);
  }

  for (let i = 0; i < WAKEUP_SOURCES.length; i++) {
    const src = WAKEUP_SOURCES[i];
    if ((sourcesMask & src.mask) === 0) continue;
    const tmo = getSourceValidationTimeout(src.mask);
    if (tmo === 0) {
      simState.pendingMask &= ~src.mask;
      simState.expiredMask &= ~src.mask;
      simState.validatedMask |= src.mask;
      delete simState.validationTimers[src.mask];
      logApi("EcuM_SetWakeupEvent(" + src.fullName + ")", "SWS_EcuM_02566: ValidationTimeout = 0 ms -> vào thẳng ECUM_WKSTATUS_VALIDATED!", "ok", ["arr_canif_ecum", "arr_ecum_bswm"]);
      notifyValidatedSourceTargets(src);
    } else {
      simState.pendingMask |= src.mask;
      simState.expiredMask &= ~src.mask;
      simState.validationTimers[src.mask] = { leftMs: tmo, maxMs: tmo, id: src.id };
      logApi("EcuM_SetWakeupEvent(" + src.fullName + ")", "SWS_EcuM_01117: ValidationTimeout = " + tmo + " ms -> PENDING; gọi EcuM_StartWakeupSources(" + fmtHex2(src.mask) + ") & BswM_EcuM_CurrentWakeup(PENDING).", "warn", ["arr_canif_ecum", "arr_ecum_canif", "arr_ecum_bswm"]);
    }
  }

  if (simState.majorPhase === "UP" && simState.subState === "ECUM_STATE_APP_POST_RUN") {
    simState.subState = "ECUM_STATE_RUN";
  }
  recomputeRegisters();
  return true;
}

function notifyValidatedSourceTargets(src) {
  logApi("BswM_EcuM_CurrentWakeup(" + src.fullName + ", VALIDATED)", "SWS_EcuM_02546: Báo BswM nguồn đánh thức hợp lệ.", "ok", ["arr_ecum_bswm"]);
  if (src.mask === 0x20) {
    if (ecucConfig.Can0ComMChannelRefEnabled) {
      simState.commWakeupIndicatedCh0 = true;
      logApi("ComM_EcuM_WakeUpIndication(ComMChannel_0)", "SWS_EcuM_02562: Đánh thức kênh ComM_0 sau khi xác thực CAN_CH0_RX thành công.", "ok", ["arr_ecum_comm"]);
    }
    if (ecucConfig.Can0ComMPNCRefEnabled) {
      simState.commPncIndicated16 = true;
      logApi("ComM_EcuM_PNCWakeUpIndication(PNC_16)", "SWS_EcuM_04016: Đánh thức cụm mạng con PNC #16 từ WUF đã xác thực.", "ok", ["arr_ecum_comm"]);
    }
  } else if (src.mask === 0x40) {
    logApi("ComM_EcuM_WakeUpIndication(ComMChannel_1)", "SWS_EcuM_02562: Đánh thức kênh ComM_1 (LIN1_RX).", "ok", ["arr_ecum_comm"]);
  }
}

function api_EcuM_ValidateWakeupEvent(sourcesMask) {
  if (!checkEcuMInitialized("0x14", "EcuM_ValidateWakeupEvent")) return false;
  if ((sourcesMask & ~0xFF) !== 0 || sourcesMask === 0) {
    reportDetError("0x14", "ECUM_E_UNKNOWN_WAKEUP_SOURCE (0x17)", "Bitmask validate không hợp lệ.");
    recomputeRegisters();
    return false;
  }
  let validatedAny = false;
  for (let i = 0; i < WAKEUP_SOURCES.length; i++) {
    const src = WAKEUP_SOURCES[i];
    if ((sourcesMask & src.mask) === 0) continue;
    if ((simState.pendingMask & src.mask) !== 0) {
      simState.pendingMask &= ~src.mask;
      simState.expiredMask &= ~src.mask;
      simState.validatedMask |= src.mask;
      delete simState.validationTimers[src.mask];
      validatedAny = true;
      logApi("EcuM_ValidateWakeupEvent(" + src.fullName + ")", "SWS_EcuM_02546: CanIf/Driver xác nhận khung truyền hợp lệ trong timeout -> VALIDATED!", "ok", ["arr_canif_ecum"]);
      notifyValidatedSourceTargets(src);
    }
  }
  if (!validatedAny) {
    logApi("EcuM_ValidateWakeupEvent(" + fmtHex2(sourcesMask) + ")", "Không có nguồn PENDING tương ứng để Validate.", "info");
  }
  recomputeRegisters();
  return true;
}

function api_EcuM_ClearWakeupEvent(sourcesMask) {
  if (!checkEcuMInitialized("0x16", "EcuM_ClearWakeupEvent")) return false;
  simState.pendingMask &= ~sourcesMask;
  simState.validatedMask &= ~sourcesMask;
  simState.expiredMask &= ~sourcesMask;
  for (let i = 0; i < WAKEUP_SOURCES.length; i++) {
    if ((sourcesMask & WAKEUP_SOURCES[i].mask) !== 0) {
      delete simState.validationTimers[WAKEUP_SOURCES[i].mask];
    }
  }
  if ((sourcesMask & 0x20) !== 0) {
    simState.commWakeupIndicatedCh0 = false;
    simState.commPncIndicated16 = false;
  }
  logApi("EcuM_ClearWakeupEvent(" + fmtHex2(sourcesMask) + ")", "SWS_EcuM_02683: Xóa cờ Pending/Validated/Expired cho mặt nạ " + fmtHex2(sourcesMask) + ".", "info");
  recomputeRegisters();
  return true;
}

function api_EcuM_SetRelAlarmClock(userId, durationMs) {
  if (!checkEcuMInitialized("0x22", "EcuM_SetRelAlarmClock")) return false;
  if (!ecucConfig.EcuMAlarmClockPresent) {
    reportDetError("0x22", "ECUM_E_SERVICE_DISABLED (0x11)", "EcuMAlarmClockPresent = FALSE, không thể đặt hẹn giờ.");
    recomputeRegisters();
    return false;
  }
  const t = Math.max(10, Number(durationMs) || 400);
  if (!simState.alarmClockActive || t < simState.alarmClockLeftMs) {
    simState.alarmClockLeftMs = t;
  }
  simState.alarmClockActive = true;
  logApi("EcuM_SetRelAlarmClock(User=" + userId + ", " + t + "ms)", "SWS_EcuM_04054: Nạp đồng hồ báo thức EcuMMasterAlarm = " + simState.alarmClockLeftMs + " ms (Bit 2 Thanh B = 1).", "warn", ["arr_swc_ecum", "arr_ecum_mcu"]);
  recomputeRegisters();
  return true;
}

function api_EcuM_AbortWakeupAlarm(userId) {
  if (!checkEcuMInitialized("0x24", "EcuM_AbortWakeupAlarm")) return false;
  simState.alarmClockActive = false;
  simState.alarmClockLeftMs = 0;
  logApi("EcuM_AbortWakeupAlarm(User=" + userId + ")", "SWS_EcuM_04056: Hủy đồng hồ hẹn giờ đánh thức.", "info", ["arr_swc_ecum"]);
  recomputeRegisters();
  return true;
}

function executeWakeupRestart(srcMask) {
  simState.mcuMode = "MCU_NORMAL";
  logApi("Mcu_SetMode(MCU_NORMAL)", "Thoát chế độ tiết kiệm điện, khôi phục PLL/Clock CPU.", "ok", ["arr_mcu_ecum"]);
  if (simState.subState === "SLEEP_GO_HALT") {
    const hashOk = !ecucConfig.SimulateRamHashCorruption;
    simState.ramHashValid = hashOk;
    if (!hashOk) {
      simState.ramHashValue = "0xDEAD";
      simState.majorPhase = "ERROR";
      simState.subState = "ERROR_HOOK_HALT";
      logApi("EcuM_CheckRamHash() == 0 -> EcuM_ErrorHook(ECUM_RAM_CHECK_FAILED)", "SWS_EcuM_02926: Lỗi hỏng dữ liệu RAM trong khi Halt! Hệ thống dừng an toàn tại ErrorHook.", "err", ["arr_ecum_det"]);
      recomputeRegisters();
      return;
    }
    logApi("EcuM_CheckRamHash() == 1 (" + simState.ramHashValue + " OK)", "SWS_EcuM_02926: Chữ ký RAM khớp toàn vẹn sau khi tỉnh dậy từ Halt.", "ok");
  }
  logApi("EcuM_DisableWakeupSources(" + fmtHex2(simState.enabledSleepMask) + ")", "Tắt lại cờ ngắt wakeup khi ngủ.", "info");
  logApi("EcuM_AL_DriverRestart(PbCfg)", "SWS_EcuM_02961: Khởi tạo lại các driver ngoại vi sau WakeupRestart.", "ok", ["arr_ecum_mcu"]);
  simState.goDownActive = false;
  simState.majorPhase = "UP";
  simState.subState = "ECUM_STATE_RUN";
  simState.runMinLeftMs = Math.max(0, Number(ecucConfig.EcuMRunMinimumDuration) || 0);
  logApi("BswM_EcuM_CurrentState(ECUM_STATE_RUN)", "Hoàn tất WakeupRestart -> chuyển lại pha UP để chạy Wakeup Validation.", "ok", ["arr_ecum_bswm"]);
}

function api_EcuM_GoDownHaltPoll(userId) {
  if (!checkEcuMInitialized("0x2C", "EcuM_GoDownHaltPoll")) return false;
  if (userId === 0 && !ecucConfig.EcuMGoDownAllowedForUser0) {
    reportDetError("0x2C", "ECUM_E_INVALID_PAR (0x13)", "User 0 không có quyền trong EcuMGoDownAllowedUsers! Từ chối lệnh tắt/ngủ.");
    recomputeRegisters();
    return false;
  }
  if (ecucConfig.NvMWriteAllPendingDelay || simState.nvmWritePendingMs > 0) {
    if (simState.nvmWritePendingMs <= 0) simState.nvmWritePendingMs = 40;
    simState.subState = "ECUM_STATE_PREP_SHUTDOWN";
    logApi("NvM_WriteAll() Pending...", "SWS_EcuM_02920: BswM chờ NvM ghi xong Flash trước khi EcuM thực thi GoDownHaltPoll.", "warn", ["arr_ecum_nvm"]);
    recomputeRegisters();
    return false;
  }

  simState.goDownActive = true;

  // Multi-Core Synchronization Barrier
  if (ecucConfig.EcuMMultiCoreSupport && !ecucConfig.SlaveCore1ReadyForSleep) {
    simState.waitingMultiCoreSync = true;
    logApi("CoordinateShutdown() Waiting Core 1...", "SWS_EcuM_04025: Master Core 0 chờ Slave Core 1 sẵn sàng tại rào chắn đồng bộ!", "warn", ["arr_ecum_os"]);
    recomputeRegisters();
    return false;
  }
  simState.waitingMultiCoreSync = false;

  if (simState.shutdownTarget === "ECUM_STATE_SLEEP") {
    simState.enabledSleepMask = parseMaskHex(ecucConfig.EcuMSleepModeWakeupSourceMask, 0xE0);
    logApi("EcuM_EnableWakeupSources(" + fmtHex2(simState.enabledSleepMask) + ")", "SWS_EcuM_02549: Bật mặt nạ nguồn đánh thức trước khi ngủ.", "info", ["arr_ecum_canif"]);
    logApi("BswM_EcuM_CurrentState(ECUM_STATE_SLEEP)", "Thông báo BswM ECU đi vào trạng thái SLEEP.", "pur", ["arr_ecum_bswm"]);
    simState.majorPhase = "SLEEP";
    const useHalt = (Number(ecucConfig.EcuMSleepModeId) === 0 && ecucConfig.EcuMSleepModeSuspend);
    if (useHalt) {
      simState.subState = "SLEEP_GO_HALT";
      simState.ramHashValue = "0xA55A";
      simState.ramHashValid = true;
      simState.mcuMode = "MCU_HALT";
      logApi("EcuM_GenerateRamHash() -> 0xA55A", "SWS_EcuM_02960: Tính toán chữ ký bảo vệ RAM trước khi dừng CPU.", "pur");
      logApi("Mcu_SetMode(MCU_HALT_MODE)", "SWS_EcuM_02960: CPU đi vào giấc ngủ sâu GoHalt (Bit 1 Thanh A = 1). Đang chờ IRQ/Alarm.", "pur", ["arr_ecum_mcu"]);
    } else {
      simState.subState = "SLEEP_GO_POLL";
      simState.mcuMode = "MCU_POLL";
      logApi("Mcu_SetMode(MCU_POLL_MODE)", "SWS_EcuM_02962: CPU vào chế độ ngủ thăm dò GoPoll (Bit 3 Thanh B = 1); chạy EcuM_SleepActivity().", "pur", ["arr_ecum_mcu"]);
    }
    recomputeRegisters();
    return true;
  }

  // SHUTDOWN Phase (OFF or RESET)
  return executeShutdownSequence();
}

function executeShutdownSequence() {
  simState.majorPhase = "SHUTDOWN";
  simState.subState = "SHUTDOWN_PRE_OS";
  simState.bswmHandover = false;
  logApi("BswM_Deinit() & SchM_Deinit()", "Shutdown PreOS: Hủy lập lịch BSW & BswM trước khi tắt OS.", "warn", ["arr_ecum_bswm"]);

  // Check if a wakeup arrived right before ShutdownOS
  if (simState.pendingMask !== 0) {
    logApi("Pending Wakeup Detected in PreOS Shutdown!", "Phát hiện nguồn đánh thức phút chót -> chuyển sang Emergency Reset để tránh ECU ngủ chết!", "warn", ["arr_ecum_mcu"]);
  }

  simState.osStarted = false;
  logApi("ShutdownOS(E_OK)", "SWS_EcuM_02920: Dừng AUTOSAR OS, chuyển quyền vào ShutdownHook() -> pha OffPreOS.", "warn", ["arr_ecum_os"]);
  simState.subState = "SHUTDOWN_OFF_PRE_OS";
  logApi("EcuM_OnGoOffOne() -> DriverDeInit() -> EcuM_OnGoOffTwo()", "OffPreOS: Đóng các driver phần cứng an toàn sau khi OS đã ngừng.", "info", ["arr_ecum_mcu"]);

  // Emergency wakeup redirect check
  if (simState.pendingMask !== 0) {
    simState.lastShutdownTarget = "ECUM_STATE_RESET";
    simState.subState = "ECUM_STATE_RESET";
    simState.mcuMode = "MCU_RESET";
    logApi("EcuM_AL_Reset(ECUM_RESET_MCU) [Wakeup Recovery]", "Do có Wakeup phút chót nên bỏ qua SwitchOff() và gọi Reset để khởi động lại!", "warn", ["arr_ecum_mcu", "arr_boot_ecum"]);
  } else if (simState.shutdownTarget === "ECUM_STATE_RESET") {
    simState.lastShutdownTarget = "ECUM_STATE_RESET";
    simState.subState = "ECUM_STATE_RESET";
    simState.mcuMode = "MCU_RESET";
    simState.initialized = false;
    logApi("EcuM_AL_Reset(" + simState.resetModeId + ")", "SWS_EcuM_04045: Reset phần cứng (" + simState.resetModeId + "), BootTarget = " + simState.bootTarget + ".", "warn", ["arr_ecum_mcu", "arr_boot_ecum"]);
  } else {
    simState.lastShutdownTarget = "ECUM_STATE_OFF";
    simState.subState = "ECUM_STATE_OFF";
    simState.mcuMode = "MCU_OFF";
    simState.initialized = false;
    simState.goDownActive = false;
    logApi("EcuM_AL_SwitchOff()", "SWS_EcuM_02920: Ngắt rơ-le giữ nguồn chính (Power Hold Latch) -> ECU Tắt Nguồn Hoàn Toàn (OFF).", "err", ["arr_ecum_mcu"]);
  }

  recomputeRegisters();
  return true;
}

// -------------------- PERIODIC CLOCK TICK (EcuM_MainFunction) --------------------

function stepClockTick(dtMs) {
  const dt = Math.max(1, Number(dtMs) || Number(ecucConfig.EcuMMainFunctionPeriod) || 10);
  simState.clockMs += dt;
  simState.activeArrows = [];

  // 1. NvM_WriteAll pending delay
  if (simState.nvmWritePendingMs > 0) {
    simState.nvmWritePendingMs = Math.max(0, simState.nvmWritePendingMs - dt);
    if (simState.nvmWritePendingMs === 0) {
      ecucConfig.NvMWriteAllPendingDelay = false;
      logApi("NvM_WriteAll() -> NVM_REQ_OK", "NvM đã ghi xong toàn bộ dữ liệu xuống Flash; sẵn sàng cho EcuM_GoDownHaltPoll().", "ok", ["arr_ecum_nvm"]);
    }
  }

  // 2. Alarm Clock countdown (works even during SLEEP)
  if (simState.alarmClockActive && simState.alarmClockLeftMs > 0) {
    simState.alarmClockLeftMs = Math.max(0, simState.alarmClockLeftMs - dt);
    if (simState.alarmClockLeftMs === 0) {
      simState.alarmClockActive = false;
      logApi("EcuM Alarm Clock Expired!", "SWS_EcuM_04057: Đã tới mốc hẹn giờ! Tự động kích hoạt EcuM_SetWakeupEvent(ECUM_WKSOURCE_INTERNAL_WDG).", "ok", ["arr_mcu_ecum"]);
      api_EcuM_SetWakeupEvent(0x08);
    }
  }

  // 3. GoPoll activity
  if (simState.majorPhase === "SLEEP" && simState.subState === "SLEEP_GO_POLL") {
    logApi("EcuM_SleepActivity() + EcuM_CheckWakeup()", "Vòng lặp GoPoll thăm dò các nguồn đánh thức ngoại vi.", "pur", ["arr_ecum_canif"]);
  }

  // 4. Wakeup Validation Timeout countdown (in UP phase)
  let anyExpiredNow = false;
  Object.keys(simState.validationTimers).forEach((maskKey) => {
    const tObj = simState.validationTimers[maskKey];
    if (!tObj || tObj.leftMs <= 0) return;
    tObj.leftMs = Math.max(0, tObj.leftMs - dt);
    if (tObj.leftMs === 0) {
      const m = Number(maskKey);
      const src = getWakeupSourceByMask(m);
      simState.pendingMask &= ~m;
      simState.expiredMask |= m;
      delete simState.validationTimers[maskKey];
      anyExpiredNow = true;
      logApi("EcuM_StopWakeupSources(" + (src ? src.fullName : fmtHex2(m)) + ")", "SWS_EcuM_02561: Hết EcuMValidationTimeout mà không có frame hợp lệ (Glitch!) -> EXPIRED.", "err", ["arr_ecum_canif", "arr_ecum_bswm"]);
      logApi("BswM_EcuM_CurrentWakeup(" + (src ? src.fullName : fmtHex2(m)) + ", EXPIRED)", "Báo BswM nguồn đánh thức giả -> có thể đưa ECU quay lại SLEEP.", "err", ["arr_ecum_bswm"]);
    }
  });

  // 5. RunMinimumDuration countdown
  if (simState.majorPhase === "UP" && simState.runMinLeftMs > 0) {
    simState.runMinLeftMs = Math.max(0, simState.runMinLeftMs - dt);
    if (simState.runMinLeftMs === 0) {
      evaluateUpPhaseSubState();
      logApi("EcuMRunMinimumDuration == 0 ms", "Hết thời gian giữ RUN tối thiểu; ECU chuyển sang kiểm tra RUN/POST_RUN Users -> " + simState.subState + ".", "info");
    }
  }

  // 6. Multi-Core Sync waiting re-check
  if (simState.waitingMultiCoreSync && ecucConfig.SlaveCore1ReadyForSleep) {
    api_EcuM_GoDownHaltPoll(0);
  }

  if (anyExpiredNow && simState.pendingMask === 0 && !simState.user0RunReq && !simState.user1PostRunReq && simState.runMinLeftMs === 0) {
    simState.subState = "ECUM_STATE_PREP_SHUTDOWN";
  }

  recomputeRegisters();
  if (typeof renderAll === "function") renderAll();
}

// -------------------- CONFIG SYNC & VALIDATION --------------------

function syncConfigToDOM() {
  Object.keys(ecucConfig).forEach((k) => {
    const el = document.getElementById("cfg_" + k);
    if (!el) return;
    if (el.type === "checkbox") el.checked = Boolean(ecucConfig[k]);
    else el.value = ecucConfig[k];
  });
}

function onConfigInputChanged(key) {
  const el = document.getElementById("cfg_" + key);
  if (!el) return;
  if (el.type === "checkbox") ecucConfig[key] = el.checked;
  else if (el.type === "number") ecucConfig[key] = Number(el.value) || 0;
  else ecucConfig[key] = el.value;

  if (key === "EcuMInitialized") {
    simState.initialized = Boolean(ecucConfig.EcuMInitialized);
    if (!simState.initialized) logApi("EcuM Status -> ECUM_UNINIT", "Mô phỏng trạng thái chưa gọi EcuM_Init() để kiểm thử DET ECUM_E_UNINIT.", "warn");
  } else if (key === "EcuMDefaultShutdownTarget") {
    api_EcuM_SelectShutdownTarget(ecucConfig.EcuMDefaultShutdownTarget, Number(ecucConfig.EcuMSleepModeId));
  } else if (key === "EcuMSleepModeId") {
    ecucConfig.EcuMSleepModeSuspend = (Number(ecucConfig.EcuMSleepModeId) === 0);
    simState.sleepModeId = Number(ecucConfig.EcuMSleepModeId) || 0;
    syncConfigToDOM();
  } else if (key === "EcuMSleepModeSuspend") {
    ecucConfig.EcuMSleepModeId = ecucConfig.EcuMSleepModeSuspend ? "0" : "1";
    simState.sleepModeId = Number(ecucConfig.EcuMSleepModeId);
    syncConfigToDOM();
  } else if (key === "EcuMResetModeId") {
    simState.resetModeId = ecucConfig.EcuMResetModeId;
  } else if (key === "EcuMShutdownCauseId") {
    simState.shutdownCause = ecucConfig.EcuMShutdownCauseId;
  } else if (key === "CurrentBootTarget") {
    simState.bootTarget = ecucConfig.CurrentBootTarget;
  } else if (key === "EcuMSleepModeWakeupSourceMask") {
    simState.enabledSleepMask = parseMaskHex(ecucConfig.EcuMSleepModeWakeupSourceMask, 0xE0);
  } else if (key === "User0_RunRequestActive") {
    if (ecucConfig.User0_RunRequestActive) api_EcuM_RequestRUN(0);
    else api_EcuM_ReleaseRUN(0);
  } else if (key === "User1_PostRunRequestActive") {
    if (ecucConfig.User1_PostRunRequestActive) api_EcuM_RequestPOST_RUN(1);
    else api_EcuM_ReleasePOST_RUN(1);
  } else if (key === "EcuMMultiCoreSupport") {
    simState.core1Started = Boolean(ecucConfig.EcuMMultiCoreSupport);
  } else if (key === "SlaveCore1ReadyForSleep") {
    if (simState.waitingMultiCoreSync && ecucConfig.SlaveCore1ReadyForSleep) {
      api_EcuM_GoDownHaltPoll(0);
    }
  }

  recomputeRegisters();
  if (typeof renderAll === "function") renderAll();
}

function validateConfigRules() {
  const alerts = [];
  if (!ecucConfig.EcuMInitialized) {
    alerts.push({ err: true, msg: "EcuM đang ở trạng thái ECUM_UNINIT: Mọi API gọi vào sẽ kích hoạt DET ECUM_E_UNINIT (0x10)." });
  }
  if (String(ecucConfig.EcuMConfigConsistencyHash).trim().toUpperCase() !== String(ecucConfig.InjectedPbConfigHash).trim().toUpperCase()) {
    alerts.push({ err: true, msg: "ConfigConsistencyHash (" + ecucConfig.EcuMConfigConsistencyHash + ") != InjectedPbConfigHash (" + ecucConfig.InjectedPbConfigHash + "): EcuM_Init() sẽ gọi EcuM_ErrorHook!" });
  }
  if (ecucConfig.SimulateRamHashCorruption) {
    alerts.push({ err: false, msg: "SimulateRamHashCorruption đang bật: Khi tỉnh dậy từ GoHalt, EcuM_CheckRamHash() sẽ trả về 0 và kích hoạt ErrorHook!" });
  }
  if (ecucConfig.EcuMMultiCoreSupport && !ecucConfig.SlaveCore1ReadyForSleep) {
    alerts.push({ err: false, msg: "Multi-Core: SlaveCore1ReadyForSleep = FALSE -> Master Core 0 sẽ bị giữ chờ tại điểm hẹn CoordinateShutdown." });
  }
  return alerts;
}
