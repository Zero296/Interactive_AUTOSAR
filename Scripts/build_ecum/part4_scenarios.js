// ================= PART 4B: 14 INTERACTIVE ECUM SCENARIOS & 42 WHAT-IFS =================

function resetScenarioBase(cfgOverrides = {}) {
  ecucConfig = Object.assign(JSON.parse(JSON.stringify(defaultConfig)), cfgOverrides);
  simState = createInitialSimState();
  simState.shutdownTarget = ecucConfig.EcuMDefaultShutdownTarget;
  simState.sleepModeId = Number(ecucConfig.EcuMSleepModeId) || 0;
  simState.resetModeId = ecucConfig.EcuMResetModeId;
  simState.shutdownCause = ecucConfig.EcuMShutdownCauseId;
  simState.bootTarget = ecucConfig.CurrentBootTarget;
  simState.enabledSleepMask = parseMaskHex(ecucConfig.EcuMSleepModeWakeupSourceMask, 0xE0);
  simState.core1Started = Boolean(ecucConfig.EcuMMultiCoreSupport);
  syncConfigToDOM();
  recomputeRegisters();
}

const SCENARIOS = [
  {
    id: "S1",
    group: "Nhóm 1: Startup & RUN",
    title: "S1: Cold Start Đa Pha (StartPreOS → StartOS → StartPostOS → BswM_Init)",
    summary: "Mô phỏng quá trình khởi động lạnh từ lúc cấp nguồn KL30: main() -> EcuM_Init() chạy DriverInitZero, kiểm tra PB Config Hash, chạy DriverInitOne, đọc Mcu_GetResetReason() ánh xạ vào ValidatedWakeupEvents, gọi StartOS() -> EcuM_StartupTwo() -> SchM_Init() & BswM_Init().",
    setup: () => {
      resetScenarioBase({ EcuMLoopDetectionEnabled: false });
      simState.initialized = false;
      simState.osStarted = false;
      simState.bswmHandover = false;
      simState.majorPhase = "STARTUP";
      simState.subState = "STARTUP_PRE_OS";
      simState.validatedMask = 0x00;
      simState.stepExplain = "ECU vừa cấp nguồn KL30. Sẵn sàng chạy StartPreOS bên trong EcuM_Init().";
      recomputeRegisters();
    },
    steps: [
      {
        title: "Chạy EcuM_AL_DriverInitZero() & Xác định PB Config",
        desc: "Hàm EcuM_Init() chạy ở ngữ cảnh trước OS: khởi tạo module Pre-Compile (Det), gọi EcuM_DeterminePbConfiguration() và kiểm tra ConfigConsistencyHash (0x5A3C9F01) -> Bật Bit 7 Thanh A.",
        exec: () => {
          simState.initialized = true;
          logApi("EcuM_AL_DriverInitZero()", "SWS_EcuM_02411: Khởi tạo Det trước khi nạp Post-Build Config.", "info", ["arr_boot_ecum"]);
          logApi("EcuM_DeterminePbConfiguration()", "SWS_EcuM_02795: Nạp EcuM_PBcfg & xác nhận Hash = " + ecucConfig.EcuMConfigConsistencyHash + " hợp lệ.", "ok", ["arr_boot_ecum"]);
          recomputeRegisters();
        }
      },
      {
        title: "Chạy DriverInitOne, đọc Mcu_GetResetReason() & nạp Default Target",
        desc: "Khởi tạo MCAL (Mcu, Port, Dio, Gpt, CanTrcv), đọc nguyên nhân Reset ánh xạ vào ValidatedWakeupEvents (Bit 5 Thanh B = 1) và gọi EcuM_SelectShutdownTarget(SLEEP).",
        exec: () => {
          if (ecucConfig.EcuMDriverInitOneEnabled) {
            logApi("EcuM_AL_DriverInitOne(PbCfg)", "SWS_EcuM_02416: Khởi tạo Mcu, Port, Gpt, CanTrcv.", "info", ["arr_ecum_mcu"]);
          }
          const rst = ecucConfig.SimulatedMcuResetReason;
          const m = rst === "MCU_WATCHDOG_RESET" ? 0x08 : (rst === "MCU_SW_RESET" ? 0x04 : (rst === "MCU_EXT_RESET" ? 0x02 : 0x01));
          simState.validatedMask |= m;
          logApi("Mcu_GetResetReason() -> " + rst, "SWS_EcuM_02623: Đánh dấu ValidatedWakeupEvents = " + fmtHex2(simState.validatedMask) + ".", "ok", ["arr_mcu_ecum"]);
          logApi("EcuM_SelectShutdownTarget(ECUM_STATE_SLEEP, 0)", "Nạp mục tiêu tắt mặc định.", "info");
          recomputeRegisters();
        }
      },
      {
        title: "Gọi StartOS(EcuMDefaultAppMode) kết thúc StartPreOS",
        desc: "Nếu bật Multi-Core, gọi StartCore(Core 1). Cuối EcuM_Init(), gọi StartOS() (Bit 6 Thanh A OS_STARTED = 1) để chuyển giao CPU cho AUTOSAR OS.",
        exec: () => {
          if (ecucConfig.EcuMMultiCoreSupport) {
            simState.core1Started = true;
            logApi("StartCore(OS_CORE_ID_1, &Status)", "SWS_EcuM_04018: Khởi động nhân phụ Slave Core 1.", "ok", ["arr_ecum_os"]);
          }
          simState.osStarted = true;
          simState.subState = "STARTUP_POST_OS";
          logApi("StartOS(" + ecucConfig.EcuMDefaultAppMode + ")", "SWS_EcuM_02603: OS bắt đầu lập lịch & kích hoạt OsTask_Init.", "ok", ["arr_ecum_os"]);
          recomputeRegisters();
        }
      },
      {
        title: "EcuM_StartupTwo() -> SchM_Init() & Bàn giao BswM_Init()",
        desc: "Bên trong OsTask_Init, EcuM_StartupTwo() khởi tạo SchM_Init() và BswM_Init() (Bit 5 Thanh A BSWM_HANDVR = 1), kích hoạt NvM_ReadAll/Rte_Start và đưa ECU vào pha UP (ECUM_STATE_RUN).",
        exec: () => {
          api_EcuM_StartupTwo();
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Đổi Mcu_GetResetReason() sang MCU_WATCHDOG_RESET & chạy StartPreOS",
        run: () => {
          ecucConfig.SimulatedMcuResetReason = "MCU_WATCHDOG_RESET";
          syncConfigToDOM();
          api_EcuM_StartPreOS(true);
        }
      },
      {
        label: "🧪 Tắt EcuMDriverInitOneEnabled = FALSE để xem trình tự rút gọn",
        run: () => {
          ecucConfig.EcuMDriverInitOneEnabled = false;
          syncConfigToDOM();
          api_EcuM_StartPreOS(true);
        }
      },
      {
        label: "🧪 Bật EcuMMultiCoreSupport = TRUE và chạy Cold Start đa nhân",
        run: () => {
          ecucConfig.EcuMMultiCoreSupport = true;
          syncConfigToDOM();
          api_EcuM_StartPreOS(true);
        }
      }
    ]
  },
  {
    id: "S2",
    group: "Nhóm 1: Startup & RUN",
    title: "S2: Giao Thức RUN / POST_RUN Request, RunMinimumDuration & NvM_WriteAll",
    summary: "SWC giữ ECU thức bằng EcuM_RequestRUN(0) và EcuM_RequestPOST_RUN(1). Kiểm chứng timer EcuMRunMinimumDuration (300ms) bảo vệ chống tắt đột ngột và cơ chế đợi NvM_WriteAll() trong pha PREP_SHUTDOWN.",
    setup: () => {
      resetScenarioBase({ EcuMRunMinimumDuration: 300 });
      simState.runMinLeftMs = 300;
      simState.stepExplain = "ECU vừa vào pha UP với EcuMRunMinimumDuration = 300ms. Chưa có SWC nào gọi RequestRUN.";
      recomputeRegisters();
    },
    steps: [
      {
        title: "SWC_Powertrain gọi EcuM_RequestRUN(0) & SWC_DiagLogger giữ POST_RUN(1)",
        desc: "Cả Bit 4 (RUN_REQ) và Bit 3 (POSTRUN) trên Thanh A được bật lên 1; ECU chuyển sang ECUM_STATE_APP_RUN.",
        exec: () => {
          api_EcuM_RequestRUN(0);
          api_EcuM_RequestPOST_RUN(1);
        }
      },
      {
        title: "SWC_Powertrain nhả EcuM_ReleaseRUN(0) sớm khi RunMinimumDuration còn 250ms",
        desc: "Dù User 0 đã nhả RUN, bộ đếm EcuMRunMinimumDuration vẫn còn hiệu lực -> ECU tiếp tục giữ ECUM_STATE_APP_RUN cho đến khi timer chạm 0 ms.",
        exec: () => {
          stepClockTick(50);
          api_EcuM_ReleaseRUN(0);
        }
      },
      {
        title: "Hết EcuMRunMinimumDuration (t = 300ms) -> Chuyển sang APP_POST_RUN",
        desc: "Timer về 0 ms -> Bit 4 (RUN_REQ) hạ về 0. Vì User 1 vẫn giữ RequestPOST_RUN, ECU dừng ở ECUM_STATE_APP_POST_RUN để ghi dữ liệu NvM.",
        exec: () => {
          stepClockTick(250);
        }
      },
      {
        title: "Nhả EcuM_ReleasePOST_RUN(1) -> Chuyển PREP_SHUTDOWN & NvM_WriteAll()",
        desc: "Khi mọi User nhả hoàn toàn, Bit 3 hạ về 0, ECU vào ECUM_STATE_PREP_SHUTDOWN và BswM gọi NvM_WriteAll() trước khi ra lệnh GoDownHaltPoll().",
        exec: () => {
          api_EcuM_ReleasePOST_RUN(1);
          logApi("NvM_WriteAll() -> NVM_REQ_OK", "Ghi log DTC & Odometer hoàn tất, sẵn sàng ngủ/tắt nguồn.", "ok", ["arr_ecum_nvm"]);
          recomputeRegisters();
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Gọi lại EcuM_RequestRUN(0) khi đang ở APP_POST_RUN (Quay ngược lên APP_RUN)",
        run: () => {
          api_EcuM_ReleaseRUN(0);
          simState.runMinLeftMs = 0;
          api_EcuM_RequestPOST_RUN(1);
          api_EcuM_RequestRUN(0);
        }
      },
      {
        label: "🧪 Bật NvMWriteAllPendingDelay = TRUE rồi thử gọi EcuM_GoDownHaltPoll(0)",
        run: () => {
          ecucConfig.NvMWriteAllPendingDelay = true;
          syncConfigToDOM();
          api_EcuM_ReleaseRUN(0);
          api_EcuM_ReleasePOST_RUN(1);
          simState.runMinLeftMs = 0;
          api_EcuM_GoDownHaltPoll(0);
        }
      },
      {
        label: "🧪 Bấm +100ms Tick để xả hết EcuMRunMinimumDuration",
        run: () => {
          stepClockTick(100);
        }
      }
    ]
  },
  {
    id: "S3",
    group: "Nhóm 1: Startup & RUN",
    title: "S3: Lỗi Nhất Quán Config Hash (PB Config Mismatch) & Loop Detection",
    summary: "Kiểm chứng lớp bảo vệ an toàn trong StartPreOS: phát hiện mã băm giữa Pre-Compile (0x5A3C9F01) và Post-Build (0xDEAD0000) bị lệch để kích hoạt EcuM_ErrorHook trước khi StartOS(), đồng thời kiểm tra EcuM_LoopDetection().",
    setup: () => {
      resetScenarioBase({ InjectedPbConfigHash: "0xDEAD0000", EcuMLoopDetectionEnabled: true });
      simState.initialized = false;
      simState.osStarted = false;
      simState.bswmHandover = false;
      simState.majorPhase = "STARTUP";
      simState.subState = "STARTUP_PRE_OS";
      simState.stepExplain = "Cấu hình bị tiêm sai InjectedPbConfigHash = 0xDEAD0000 so với 0x5A3C9F01.";
      recomputeRegisters();
    },
    steps: [
      {
        title: "Chạy EcuM_AL_DriverInitZero() & EcuM_DeterminePbConfiguration()",
        desc: "EcuM nạp con trỏ bảng cấu hình Post-Build từ Flash và chuẩn bị đối chiếu mã băm ConfigConsistencyHash.",
        exec: () => {
          logApi("EcuM_AL_DriverInitZero()", "Khởi tạo Det để sẵn sàng ghi nhận lỗi nếu có.", "info", ["arr_boot_ecum"]);
          logApi("EcuM_DeterminePbConfiguration()", "Đọc InjectedPbConfigHash = " + ecucConfig.InjectedPbConfigHash + " từ Flash.", "warn", ["arr_boot_ecum"]);
          recomputeRegisters();
        }
      },
      {
        title: "So khớp ConfigConsistencyHash thất bại -> EcuM_ErrorHook!",
        desc: "0xDEAD0000 != 0x5A3C9F01! EcuM bật Bit 0 (SYS_FAULT = 1) trên Thanh B, dừng ở ErrorHook(ECUM_E_CONFIGURATION_DATA_INCONSISTENT) và KHÔNG gọi StartOS().",
        exec: () => {
          api_EcuM_StartPreOS(false);
        }
      },
      {
        title: "Khắc phục Hash = 0x5A3C9F01 & chạy EcuM_LoopDetection() thành công",
        desc: "Khi flash đúng bản Post-Build tương thích (0x5A3C9F01), EcuM vượt qua kiểm tra Hash, chạy EcuM_LoopDetection() và StartOS() bình thường.",
        exec: () => {
          ecucConfig.InjectedPbConfigHash = ecucConfig.EcuMConfigConsistencyHash;
          syncConfigToDOM();
          api_EcuM_StartPreOS(true);
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Tiêm lỗi sai PB Hash (0xBEEF1234) và chạy lại EcuM_Init()",
        run: () => {
          ecucConfig.InjectedPbConfigHash = "0xBEEF1234";
          syncConfigToDOM();
          api_EcuM_StartPreOS(true);
        }
      },
      {
        label: "🧪 Khôi phục PB Hash chuẩn (0x5A3C9F01) và khởi động hoàn chỉnh",
        run: () => {
          ecucConfig.InjectedPbConfigHash = ecucConfig.EcuMConfigConsistencyHash;
          syncConfigToDOM();
          api_EcuM_StartPreOS(true);
        }
      },
      {
        label: "🧪 Tắt EcuMInitialized = FALSE để mô phỏng DET ECUM_E_UNINIT",
        run: () => {
          ecucConfig.EcuMInitialized = false;
          simState.initialized = false;
          syncConfigToDOM();
          api_EcuM_SelectShutdownTarget("ECUM_STATE_SLEEP", 0);
        }
      }
    ]
  },
  {
    id: "S4",
    group: "Nhóm 2: SLEEP Phase",
    title: "S4: Ngủ Sâu GoHalt (Mcu_SetMode HALT + Generate/CheckRamHash)",
    summary: "Luồng tiết kiệm điện sâu nhất: BswM gọi EcuM_GoDownHaltPoll() với SleepMode_Halt (Suspend=TRUE) -> EnableWakeupSources(0xE0) -> GenerateRamHash(0xA55A) -> Mcu_SetMode(HALT) -> Thức dậy qua CheckRamHash() & DriverRestart().",
    setup: () => {
      resetScenarioBase({ EcuMSleepModeId: "0", EcuMSleepModeSuspend: true });
      simState.stepExplain = "ECU ở pha UP (RUN) đã chọn ShutdownTarget = ECUM_STATE_SLEEP (Mode 0: Halt).";
      recomputeRegisters();
    },
    steps: [
      {
        title: "Xóa cờ Wakeup cũ & Chọn mục tiêu SLEEP (Mode 0: Halt)",
        desc: "BswM gọi EcuM_ClearWakeupEvent(0xFF) dọn sạch cờ Reset ban đầu và xác nhận ShutdownTarget = ECUM_STATE_SLEEP (0: Halt).",
        exec: () => {
          api_EcuM_ClearWakeupEvent(0xFF);
          api_EcuM_SelectShutdownTarget("ECUM_STATE_SLEEP", 0);
        }
      },
      {
        title: "Gọi EcuM_GoDownHaltPoll(0) -> EnableWakeup, GenerateRamHash & Mcu_SetMode(HALT)",
        desc: "Bật mặt nạ 0xE0, tạo chữ ký RAM 0xA55A (Bit 0 Thanh A = 1), dừng xung nhịp CPU vào SLEEP_GO_HALT (Bit 1 Thanh A = 1, Bit 2 GO_DOWN = 1).",
        exec: () => {
          api_EcuM_GoDownHaltPoll(0);
        }
      },
      {
        title: "Ngắt phần cứng KL15 đánh thức CPU -> WakeupRestart & CheckRamHash()",
        desc: "EcuM_SetWakeupEvent(KL15) đánh thức CPU: đưa MCU về NORMAL, kiểm tra EcuM_CheckRamHash() == 1 (OK), chạy EcuM_AL_DriverRestart() quay về pha UP!",
        exec: () => {
          api_EcuM_SetWakeupEvent(0x80);
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Bật SimulateRamHashCorruption = TRUE trước khi đánh thức từ GoHalt!",
        run: () => {
          ecucConfig.SimulateRamHashCorruption = true;
          syncConfigToDOM();
          if (simState.majorPhase !== "SLEEP") {
            api_EcuM_SelectShutdownTarget("ECUM_STATE_SLEEP", 0);
            api_EcuM_GoDownHaltPoll(0);
          }
          api_EcuM_SetWakeupEvent(0x80);
        }
      },
      {
        label: "🧪 Đổi WakeupMask = 0x80 (Chỉ cho phép KL15) rồi thử đánh thức bằng CAN0",
        run: () => {
          ecucConfig.EcuMSleepModeWakeupSourceMask = "0x80";
          syncConfigToDOM();
          api_EcuM_SelectShutdownTarget("ECUM_STATE_SLEEP", 0);
          api_EcuM_GoDownHaltPoll(0);
          api_EcuM_SetWakeupEvent(0x20);
        }
      },
      {
        label: "🧪 Tắt EcuMGoDownAllowedForUser0 = FALSE và thử gọi GoDownHaltPoll(0)",
        run: () => {
          ecucConfig.EcuMGoDownAllowedForUser0 = false;
          syncConfigToDOM();
          api_EcuM_GoDownHaltPoll(0);
        }
      }
    ]
  },
  {
    id: "S5",
    group: "Nhóm 2: SLEEP Phase",
    title: "S5: Ngủ Thăm Dò GoPoll (Mcu_SetMode POLL + SleepActivity & CheckWakeup)",
    summary: "Dùng cho phần cứng có nguồn đánh thức không hỗ trợ ngắt (EcuMSleepModeSuspend = FALSE): ECU vào Mcu_SetMode(MCU_POLL), liên tục chạy EcuM_SleepActivity() và EcuM_CheckWakeup() cho tới khi phát hiện LIN_CH1_RX.",
    setup: () => {
      resetScenarioBase({ EcuMSleepModeId: "1", EcuMSleepModeSuspend: false });
      simState.stepExplain = "Cấu hình SleepModeId = 1 (GoPoll, Suspend = FALSE).";
      recomputeRegisters();
    },
    steps: [
      {
        title: "Chọn mục tiêu SLEEP (Mode 1: Poll) & Gọi EcuM_GoDownHaltPoll(0)",
        desc: "EcuM đặt MCU vào MCU_POLL_MODE, chuyển pha SLEEP_GO_POLL và bật Bit 3 (POLL_SLEEP) trên Thanh B (không tạo RamHash như Halt).",
        exec: () => {
          api_EcuM_ClearWakeupEvent(0xFF);
          api_EcuM_SelectShutdownTarget("ECUM_STATE_SLEEP", 1);
          api_EcuM_GoDownHaltPoll(0);
        }
      },
      {
        title: "Chạy vòng lặp EcuM_SleepActivity() & EcuM_CheckWakeup() (+20ms)",
        desc: "Mỗi nhịp đồng hồ trong chế độ Poll, CPU thức nhẹ để thăm dò trạng thái đường truyền LIN1 / các chân I/O.",
        exec: () => {
          stepClockTick(20);
        }
      },
      {
        title: "EcuM_CheckWakeup() phát hiện LIN_CH1_RX -> Thoát Poll vào PENDING",
        desc: "Phát hiện xung trên LIN1 (Bit 6 = 0x40), gọi EcuM_SetWakeupEvent(0x40), thoát GoPoll chạy DriverRestart() và mở timer 300ms xác thực LIN.",
        exec: () => {
          api_EcuM_SetWakeupEvent(0x40);
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Bấm +10ms Tick để quan sát vòng lặp EcuM_SleepActivity() khi đang GoPoll",
        run: () => {
          if (simState.subState !== "SLEEP_GO_POLL") {
            api_EcuM_SelectShutdownTarget("ECUM_STATE_SLEEP", 1);
            api_EcuM_GoDownHaltPoll(0);
          }
          stepClockTick(10);
        }
      },
      {
        label: "🧪 Đánh thức ngay từ GoPoll bằng LIN_CH1_RX (0x40) rồi Validate",
        run: () => {
          api_EcuM_SetWakeupEvent(0x40);
          api_EcuM_ValidateWakeupEvent(0x40);
        }
      },
      {
        label: "🧪 Chuyển sang GoHalt (Mode 0) để so sánh sự khác biệt RamHash",
        run: () => {
          api_EcuM_SelectShutdownTarget("ECUM_STATE_SLEEP", 0);
          api_EcuM_GoDownHaltPoll(0);
        }
      }
    ]
  },
  {
    id: "S6",
    group: "Nhóm 2: SLEEP Phase",
    title: "S6: Hẹn Giờ Thức Dậy Nội Bộ Với EcuM Alarm Clock (Rel / Abs)",
    summary: "Trước khi xe ngủ, SWC_BMS đặt đồng hồ hẹn giờ EcuM_SetRelAlarmClock(0, 400ms). Trong lúc ECU ngủ sâu GoHalt, GPT tiếp tục đếm; khi chạm 0ms tự động kích hoạt EcuM_SetWakeupEvent đánh thức toàn ECU.",
    setup: () => {
      resetScenarioBase({ EcuMAlarmClockPresent: true, EcuMAlarmClockTimeOut: 400 });
      simState.stepExplain = "Tính năng EcuM Alarm Clock đã bật (Timeout = 400 ms).";
      recomputeRegisters();
    },
    steps: [
      {
        title: "SWC_BMS gọi EcuM_SetRelAlarmClock(0, 400ms) trước khi đi ngủ",
        desc: "EcuM nạp bộ đếm EcuMMasterAlarm = 400ms và bật Bit 2 (ALARM_CLK_RUN = 1) trên Thanh B.",
        exec: () => {
          api_EcuM_ClearWakeupEvent(0xFF);
          api_EcuM_SetRelAlarmClock(0, ecucConfig.EcuMAlarmClockTimeOut);
        }
      },
      {
        title: "ECU đi vào ngủ sâu GoHalt trong lúc Alarm Clock tiếp tục đếm",
        desc: "Gpt_EnableWakeup() giữ bộ đếm hoạt động ở chế độ ngủ; MCU tắt CPU Clock để tiết kiệm điện.",
        exec: () => {
          api_EcuM_SelectShutdownTarget("ECUM_STATE_SLEEP", 0);
          api_EcuM_GoDownHaltPoll(0);
        }
      },
      {
        title: "Đồng hồ trôi qua 200ms (EcuMMasterAlarm còn 200ms)",
        desc: "ECU vẫn ngủ yên (HALT_SLEEP_ACT = 1) chờ mốc hẹn giờ.",
        exec: () => {
          stepClockTick(200);
        }
      },
      {
        title: "Chạm mốc 400ms -> Alarm Clock tự động đánh thức ECU!",
        desc: "EcuMMasterAlarm về 0ms -> Tự kích hoạt EcuM_SetWakeupEvent(INT_WDG/GPT = 0x08) -> WakeupRestart() đưa ECU lên lại UP (RUN)!",
        exec: () => {
          stepClockTick(200);
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Gọi EcuM_AbortWakeupAlarm(0) hủy hẹn giờ trước khi ngủ",
        run: () => {
          api_EcuM_AbortWakeupAlarm(0);
        }
      },
      {
        label: "🧪 Đặt thêm Alarm của User 1 ngắn hơn (150ms) -> EcuMMasterAlarm tự rút còn 150ms!",
        run: () => {
          api_EcuM_SetRelAlarmClock(1, 150);
        }
      },
      {
        label: "🧪 Tắt EcuMAlarmClockPresent = FALSE rồi thử đặt Alarm (Bẫy DET)",
        run: () => {
          ecucConfig.EcuMAlarmClockPresent = false;
          syncConfigToDOM();
          api_EcuM_SetRelAlarmClock(0, 400);
        }
      }
    ]
  },
  {
    id: "S7",
    group: "Nhóm 3: Wakeup Validation",
    title: "S7: Nguồn Tức Thì Không Cần Xác Thực (KL15_IGNITION ValidationTimeout = 0)",
    summary: "Phân biệt nguồn tin cậy có ValidationTimeout = 0ms (POWER, RESET, KL15_IGNITION): hễ EcuM_SetWakeupEvent() được gọi sẽ bỏ qua bước PENDING và đặt thẳng vào ValidatedWakeupEvents!",
    setup: () => {
      resetScenarioBase({ Kl15WakeupValidationTimeout: 0 });
      api_EcuM_ClearWakeupEvent(0xFF);
      simState.stepExplain = "Cấu hình Kl15WakeupValidationTimeout = 0 ms (Immediate Validation).";
      recomputeRegisters();
    },
    steps: [
      {
        title: "ECU đang ngủ ở chế độ GoHalt (SLEEP)",
        desc: "Chờ sự kiện bật chìa khóa điện KL15 từ chân Icu.",
        exec: () => {
          api_EcuM_SelectShutdownTarget("ECUM_STATE_SLEEP", 0);
          api_EcuM_GoDownHaltPoll(0);
        }
      },
      {
        title: "Người lái bật khóa điện -> EcuM_SetWakeupEvent(KL15_IGNITION = 0x80)",
        desc: "Vì Kl15ValidationTimeout == 0ms, Bit 7 (KL15) bỏ qua PENDING và nhảy thẳng vào ValidatedWakeupEvents = 0x80 (Bit 5 Thanh B = 1), báo ngay BswM!",
        exec: () => {
          api_EcuM_SetWakeupEvent(0x80);
        }
      },
      {
        title: "BswM nhận VALIDATED & Dọn cờ bằng EcuM_ClearWakeupEvent(0x80)",
        desc: "Sau khi xử lý khởi động ứng dụng xong, BswM có thể gọi ClearWakeupEvent(0x80) đưa trạng thái nguồn về NONE.",
        exec: () => {
          api_EcuM_ClearWakeupEvent(0x80);
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Tăng Kl15WakeupValidationTimeout lên 100ms (Chống dội công tắc) rồi Trigger KL15",
        run: () => {
          ecucConfig.Kl15WakeupValidationTimeout = 100;
          syncConfigToDOM();
          api_EcuM_SetWakeupEvent(0x80);
        }
      },
      {
        label: "🧪 Kích hoạt đồng thời cả POWER (0x01) và KL15 (0x80)",
        run: () => {
          api_EcuM_SetWakeupEvent(0x81);
        }
      },
      {
        label: "🧪 Xóa sạch mọi cờ Wakeup (ClearWakeupEvent 0xFF)",
        run: () => {
          api_EcuM_ClearWakeupEvent(0xFF);
        }
      }
    ]
  },
  {
    id: "S8",
    group: "Nhóm 3: Wakeup Validation",
    title: "S8: Xác Thực Đánh Thức CAN_CH0_RX Thành Công (PENDING → VALIDATED → ComM)",
    summary: "Kịch bản chuẩn AUTOSAR lọc nhiễu CAN: CanTrcv gọi SetWakeupEvent(CAN0) -> vào PENDING (Timeout 500ms) -> EcuM_StartWakeupSources() -> CanIf nhận frame hợp lệ gọi EcuM_ValidateWakeupEvent(CAN0) -> VALIDATED -> ComM_EcuM_WakeUpIndication(0)!",
    setup: () => {
      resetScenarioBase({ Can0WakeupValidationTimeout: 500, Can0ComMChannelRefEnabled: true });
      api_EcuM_ClearWakeupEvent(0xFF);
      api_EcuM_SelectShutdownTarget("ECUM_STATE_SLEEP", 0);
      api_EcuM_GoDownHaltPoll(0);
      simState.stepExplain = "ECU đang ngủ sâu GoHalt. Chuẩn bị nhận xung đánh thức từ CanTrcv trên CAN_CH0_RX.";
      recomputeRegisters();
    },
    steps: [
      {
        title: "CanTrcv phát hiện xung CAN -> EcuM_SetWakeupEvent(CAN_CH0_RX = 0x20)",
        desc: "CPU thức dậy (WakeupRestart). Vì ValidationTimeout = 500ms > 0, Bit 5 (0x20) vào PendingWakeupEvents (Bit 7 & Bit 6 Thanh B = 1), chạy EcuM_StartWakeupSources(0x20).",
        exec: () => {
          api_EcuM_SetWakeupEvent(0x20);
        }
      },
      {
        title: "Bộ đếm EcuMValidationTimeout đếm ngược 120ms trong lúc CanIf lắng nghe",
        desc: "EcuM_MainFunction() liên tục kiểm tra ValidationTimeout (500ms -> 380ms). Lúc này ComM vẫn chưa bị đánh thức.",
        exec: () => {
          stepClockTick(120);
        }
      },
      {
        title: "CanIf nhận khung CAN hợp lệ -> EcuM_ValidateWakeupEvent(CAN_CH0_RX)",
        desc: "Bit 5 chuyển từ Pending sang Validated (0x20), dừng timer (Bit 6 = 0), báo BswM_EcuM_CurrentWakeup(VALIDATED) và gọi ComM_EcuM_WakeUpIndication(ComMChannel_0)!",
        exec: () => {
          api_EcuM_ValidateWakeupEvent(0x20);
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Tắt Can0ComMChannelRefEnabled = FALSE rồi Validate (Không gọi ComM_WakeUpInd)",
        run: () => {
          ecucConfig.Can0ComMChannelRefEnabled = false;
          syncConfigToDOM();
          api_EcuM_ClearWakeupEvent(0x20);
          api_EcuM_SetWakeupEvent(0x20);
          api_EcuM_ValidateWakeupEvent(0x20);
        }
      },
      {
        label: "🧪 Đặt Can0WakeupValidationTimeout = 0ms (Bỏ qua PENDING)",
        run: () => {
          ecucConfig.Can0WakeupValidationTimeout = 0;
          syncConfigToDOM();
          api_EcuM_ClearWakeupEvent(0x20);
          api_EcuM_SetWakeupEvent(0x20);
        }
      },
      {
        label: "🧪 Validate thủ công ngay bây giờ",
        run: () => {
          api_EcuM_ValidateWakeupEvent(0x20);
        }
      }
    ]
  },
  {
    id: "S9",
    group: "Nhóm 3: Wakeup Validation",
    title: "S9: Lọc Nhiễu Glitch / False Wakeup (PENDING → Timeout → EXPIRED → Re-Sleep)",
    summary: "Chống cạn bình ắc-quy khi có nhiễu điện từ trên dây CAN: xung nhiễu đưa CAN_CH0_RX vào PENDING, chạy hết 500ms mà không có frame hợp lệ -> chuyển EXPIRED -> EcuM_StopWakeupSources() -> ngủ trở lại!",
    setup: () => {
      resetScenarioBase({ Can0WakeupValidationTimeout: 500 });
      api_EcuM_ClearWakeupEvent(0xFF);
      api_EcuM_SelectShutdownTarget("ECUM_STATE_SLEEP", 0);
      api_EcuM_GoDownHaltPoll(0);
      simState.stepExplain = "ECU đang ngủ sâu GoHalt; giả lập một tia nhiễu (Glitch) xuất hiện trên dây CAN.";
      recomputeRegisters();
    },
    steps: [
      {
        title: "Xung nhiễu Glitch kích hoạt EcuM_SetWakeupEvent(CAN_CH0_RX = 0x20)",
        desc: "Bit 5 vào PendingWakeupEvents = 0x20 và khởi chạy EcuMValidationTimeout = 500ms.",
        exec: () => {
          api_EcuM_SetWakeupEvent(0x20);
        }
      },
      {
        title: "Trôi qua 500ms không có CAN Frame hợp lệ -> EXPIRED!",
        desc: "EcuMValidationTimeout chạm 0ms: xóa Pending (0x00), bật ExpiredWakeupEvents = 0x20 (Bit 4 Thanh B = 1), gọi EcuM_StopWakeupSources(0x20) & báo BswM(EXPIRED) — tuyệt đối KHÔNG đánh thức ComM!",
        exec: () => {
          stepClockTick(500);
        }
      },
      {
        title: "BswM dọn cờ Expired & Đưa ECU ngủ lại GoHalt",
        desc: "Sau khi xử lý nguồn hết hạn, BswM gọi ClearWakeupEvent(0x20) và EcuM_GoDownHaltPoll(0) đưa ECU về ngủ sâu bảo vệ ắc-quy.",
        exec: () => {
          api_EcuM_ClearWakeupEvent(0x20);
          api_EcuM_GoDownHaltPoll(0);
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Bấm Validate ở t = 400ms (Cứu nguồn đánh thức trước khi Timeout hết hạn!)",
        run: () => {
          if (simState.pendingMask === 0) {
            api_EcuM_ClearWakeupEvent(0xFF);
            api_EcuM_SetWakeupEvent(0x20);
            stepClockTick(400);
          }
          api_EcuM_ValidateWakeupEvent(0x20);
        }
      },
      {
        label: "🧪 Giảm Can0WakeupValidationTimeout xuống 100ms để phát hiện nhiễu nhanh hơn",
        run: () => {
          ecucConfig.Can0WakeupValidationTimeout = 100;
          syncConfigToDOM();
          api_EcuM_ClearWakeupEvent(0xFF);
          api_EcuM_SetWakeupEvent(0x20);
          stepClockTick(100);
        }
      },
      {
        label: "🧪 Xóa cờ EXPIRED (EcuM_ClearWakeupEvent 0x20)",
        run: () => {
          api_EcuM_ClearWakeupEvent(0x20);
        }
      }
    ]
  },
  {
    id: "S10",
    group: "Nhóm 3: Wakeup Validation",
    title: "S10: Đánh Thức Cụm Mạng Con PNC (ComM_EcuM_PNCWakeUpIndication)",
    summary: "Phối hợp Partial Networking giữa CanTrcv Selective Wakeup, EcuM và ComM: khi khung WUF đánh thức CAN_CH0_RX được xác thực và bật EcuMComMPNCRef, EcuM gọi ComM_EcuM_PNCWakeUpIndication(PNC_16).",
    setup: () => {
      resetScenarioBase({ Can0ComMPNCRefEnabled: true, Can0ComMChannelRefEnabled: true, Can0WakeupValidationTimeout: 300 });
      api_EcuM_ClearWakeupEvent(0xFF);
      api_EcuM_SelectShutdownTarget("ECUM_STATE_SLEEP", 0);
      api_EcuM_GoDownHaltPoll(0);
      simState.stepExplain = "ECU đang ngủ với bộ lọc phần cứng WUF trên CanTrcv cho PNC #16.";
      recomputeRegisters();
    },
    steps: [
      {
        title: "CanTrcv giải mã khung WUF -> EcuM_SetWakeupEvent(CAN_CH0_RX = 0x20)",
        desc: "Khung đánh thức mạng con kích hoạt nguồn CAN_CH0_RX vào trạng thái PENDING (300ms).",
        exec: () => {
          api_EcuM_SetWakeupEvent(0x20);
        }
      },
      {
        title: "Xác thực WUF hợp lệ -> Gọi ComM_EcuM_PNCWakeUpIndication(PNC_16)",
        desc: "Khi EcuM_ValidateWakeupEvent(0x20) thành công, EcuM gọi đồng thời ComM_EcuM_WakeUpIndication(0) và ComM_EcuM_PNCWakeUpIndication(16)!",
        exec: () => {
          api_EcuM_ValidateWakeupEvent(0x20);
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Tắt Can0ComMPNCRefEnabled = FALSE rồi thử lại (Chỉ gọi WakeUpIndication Ch0)",
        run: () => {
          ecucConfig.Can0ComMPNCRefEnabled = false;
          syncConfigToDOM();
          api_EcuM_ClearWakeupEvent(0x20);
          api_EcuM_SetWakeupEvent(0x20);
          api_EcuM_ValidateWakeupEvent(0x20);
        }
      },
      {
        label: "🧪 Để nguồn WUF bị EXPIRED (Chứng minh không gọi oan ComM_EcuM_PNCWakeUpIndication)",
        run: () => {
          api_EcuM_ClearWakeupEvent(0x20);
          api_EcuM_SetWakeupEvent(0x20);
          stepClockTick(350);
        }
      },
      {
        label: "🧪 Bật lại PNC Wakeup & Validate thành công",
        run: () => {
          ecucConfig.Can0ComMPNCRefEnabled = true;
          syncConfigToDOM();
          api_EcuM_ClearWakeupEvent(0x20);
          api_EcuM_SetWakeupEvent(0x20);
          api_EcuM_ValidateWakeupEvent(0x20);
        }
      }
    ]
  },
  {
    id: "S11",
    group: "Nhóm 4: Shutdown, Bootloader & Multi-Core",
    title: "S11: Tắt Nguồn Hoàn Toàn OFF (PreOS → ShutdownOS → OffPreOS / SwitchOff)",
    summary: "Luồng tắt nguồn toàn phần khi khóa điện tắt và không cần giữ ngủ RAM: EcuM_SelectShutdownTarget(OFF) -> GoDownHaltPoll -> BswM_Deinit() -> ShutdownOS() -> ShutdownHook (OnGoOffOne -> DriverDeInit -> OnGoOffTwo -> EcuM_AL_SwitchOff).",
    setup: () => {
      resetScenarioBase({ EcuMDefaultShutdownTarget: "ECUM_STATE_OFF" });
      simState.stepExplain = "ECU đang ở pha UP (RUN), chuẩn bị thực thi tắt nguồn toàn phần OFF.";
      recomputeRegisters();
    },
    steps: [
      {
        title: "Chọn nguyên nhân & mục tiêu tắt nguồn: ECUM_STATE_OFF",
        desc: "BswM gọi EcuM_SelectShutdownCause(ECU_STATE) và EcuM_SelectShutdownTarget(ECUM_STATE_OFF, 0).",
        exec: () => {
          api_EcuM_ClearWakeupEvent(0xFF);
          api_EcuM_SelectShutdownCause("ECUM_CAUSE_ECU_STATE");
          api_EcuM_SelectShutdownTarget("ECUM_STATE_OFF", 0);
        }
      },
      {
        title: "Chạy EcuM_GoDownHaltPoll(0) -> PreOS Shutdown & OffPreOS -> SwitchOff()",
        desc: "Thực thi BswM_Deinit(), ShutdownOS(E_OK) (Bit 6 OS_STARTED = 0), EcuM_OnGoOffOne(), DriverDeInit(), EcuM_OnGoOffTwo() và ngắt nguồn qua EcuM_AL_SwitchOff() (Bit 7 = 0).",
        exec: () => {
          api_EcuM_GoDownHaltPoll(0);
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Bắn Wakeup KL15 phút chót trước khi tắt (Cứu hộ chuyển OFF sang Emergency Reset!)",
        run: () => {
          api_EcuM_StartPreOS(true);
          api_EcuM_ClearWakeupEvent(0xFF);
          api_EcuM_SelectShutdownTarget("ECUM_STATE_OFF", 0);
          simState.pendingMask = 0x80; // Inject pending wakeup right at PreOS Shutdown boundary
          api_EcuM_GoDownHaltPoll(0);
        }
      },
      {
        label: "🧪 Khởi động lại ECU từ trạng thái OFF (Cold Power-On Reset)",
        run: () => {
          api_EcuM_StartPreOS(true);
        }
      },
      {
        label: "🧪 Tắt quyền GoDown của User 0 (EcuMGoDownAllowedForUser0 = FALSE)",
        run: () => {
          api_EcuM_StartPreOS(true);
          ecucConfig.EcuMGoDownAllowedForUser0 = false;
          syncConfigToDOM();
          api_EcuM_GoDownHaltPoll(0);
        }
      }
    ]
  },
  {
    id: "S12",
    group: "Nhóm 4: Shutdown, Bootloader & Multi-Core",
    title: "S12: Khởi Động Lại Vào OEM Flash Bootloader (SelectBootTarget + RESET)",
    summary: "Luồng chẩn đoán UDS 0x10 02 / 0x11: DCM gọi EcuM_SelectBootTarget(OEM_BOOTLOADER), chọn ShutdownCause(DCM) & ShutdownTarget(RESET, MCU_RESET), thực thi ShutdownOS -> OffPreOS -> EcuM_AL_Reset() -> Mcu_PerformReset().",
    setup: () => {
      resetScenarioBase({ EcuMDefaultShutdownTarget: "ECUM_STATE_RESET", EcuMShutdownCauseId: "ECUM_CAUSE_DCM" });
      simState.stepExplain = "ECU nhận yêu cầu UDS Programming Session / HardReset từ máy chẩn đoán.";
      recomputeRegisters();
    },
    steps: [
      {
        title: "DCM gọi EcuM_SelectBootTarget(OEM_BOOTLOADER) & SelectShutdownTarget(RESET)",
        desc: "Ghi cờ nhảy Bootloader vào vùng No-Init RAM, lưu ShutdownCause = ECUM_CAUSE_DCM và đặt Target = ECUM_STATE_RESET (ECUM_RESET_MCU).",
        exec: () => {
          api_EcuM_ClearWakeupEvent(0xFF);
          api_EcuM_SelectBootTarget("ECUM_BOOT_TARGET_OEM_BOOTLOADER");
          api_EcuM_SelectShutdownCause("ECUM_CAUSE_DCM");
          api_EcuM_SelectShutdownTarget("ECUM_STATE_RESET", "ECUM_RESET_MCU");
        }
      },
      {
        title: "Chạy GoDownHaltPoll(0) -> ShutdownOS -> EcuM_AL_Reset(ECUM_RESET_MCU)",
        desc: "EcuM dọn dẹp OS & Driver trong OffPreOS rồi gọi EcuM_AL_Reset() -> Mcu_PerformReset() đưa CPU về Bootloader!",
        exec: () => {
          api_EcuM_GoDownHaltPoll(0);
        }
      },
      {
        title: "Khi Bootloader xong trả về App -> Mcu_GetResetReason() = MCU_SW_RESET (0x04)",
        desc: "Sau khi nạp xong, ECU khởi động lại vào Application và nhận diện INTERNAL_RESET (Bit 2 = 0x04) trong ValidatedWakeupEvents.",
        exec: () => {
          ecucConfig.CurrentBootTarget = "ECUM_BOOT_TARGET_APP";
          ecucConfig.SimulatedMcuResetReason = "MCU_SW_RESET";
          syncConfigToDOM();
          api_EcuM_StartPreOS(true);
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Đổi kiểu Reset sang ECUM_RESET_WDG và thực hiện Reset ngay",
        run: () => {
          api_EcuM_StartPreOS(true);
          api_EcuM_SelectBootTarget("ECUM_BOOT_TARGET_OEM_BOOTLOADER");
          api_EcuM_SelectShutdownTarget("ECUM_STATE_RESET", "ECUM_RESET_WDG");
          api_EcuM_GoDownHaltPoll(0);
        }
      },
      {
        label: "🧪 Chọn BootTarget = ECUM_BOOT_TARGET_SYS_BOOTLOADER",
        run: () => {
          api_EcuM_StartPreOS(true);
          api_EcuM_SelectBootTarget("ECUM_BOOT_TARGET_SYS_BOOTLOADER");
          api_EcuM_SelectShutdownTarget("ECUM_STATE_RESET", "ECUM_RESET_MCU");
          api_EcuM_GoDownHaltPoll(0);
        }
      },
      {
        label: "🧪 Đưa BootTarget về APP & Reset lại",
        run: () => {
          ecucConfig.CurrentBootTarget = "ECUM_BOOT_TARGET_APP";
          ecucConfig.SimulatedMcuResetReason = "MCU_SW_RESET";
          syncConfigToDOM();
          api_EcuM_StartPreOS(true);
        }
      }
    ]
  },
  {
    id: "S13",
    group: "Nhóm 4: Shutdown, Bootloader & Multi-Core",
    title: "S13: Đồng Bộ Đa Nhân Multi-Core (Master Core 0 ↔ Slave Core 1)",
    summary: "Điều phối vi điều khiển đa nhân: Master Core 0 gọi StartCore(OS_CORE_ID_1) trong EcuM_Init(). Trước khi Halt hoặc Off, Core 0 bắt buộc phải đợi Core 1 tại điểm hẹn đồng bộ CoordinateShutdown!",
    setup: () => {
      resetScenarioBase({ EcuMMultiCoreSupport: true, SlaveCore1ReadyForSleep: false });
      simState.stepExplain = "Hệ thống Multi-Core (Core 0 Master + Core 1 Slave). Hiện Slave Core 1 đang bận tác vụ (SlaveCore1ReadyForSleep = FALSE).";
      recomputeRegisters();
    },
    steps: [
      {
        title: "Khởi động Đa nhân: Core 0 gọi StartCore(Core 1) & Đồng bộ StartupTwo",
        desc: "Cả hai nhân khởi động OS và chạy EcuM_StartupTwo() song song.",
        exec: () => {
          api_EcuM_StartPreOS(true);
        }
      },
      {
        title: "Core 0 gọi GoDownHaltPoll(0) nhưng Slave Core 1 chưa sẵn sàng -> Chờ!",
        desc: "Do SlaveCore1ReadyForSleep == FALSE (Bit 1 CORE_SYNC Thanh B = 0), Master Core 0 DỪNG tại rào chắn CoordinateShutdown chứ chưa gọi Mcu_SetMode(HALT)!",
        exec: () => {
          api_EcuM_ClearWakeupEvent(0xFF);
          api_EcuM_SelectShutdownTarget("ECUM_STATE_SLEEP", 0);
          api_EcuM_GoDownHaltPoll(0);
        }
      },
      {
        title: "Slave Core 1 báo Ready -> Core 0 lập tức hoàn tất GoHalt!",
        desc: "Khi SlaveCore1ReadyForSleep chuyển TRUE (Bit 1 Thanh B = 1), Core 0 hoàn tất GenerateRamHash và đưa toàn bộ chip vào HALT.",
        exec: () => {
          ecucConfig.SlaveCore1ReadyForSleep = true;
          syncConfigToDOM();
          stepClockTick(10);
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Giữ SlaveCore1ReadyForSleep = FALSE và gọi GoDownHaltPoll (Quan sát Rào Chắn)",
        run: () => {
          api_EcuM_StartPreOS(true);
          ecucConfig.SlaveCore1ReadyForSleep = false;
          syncConfigToDOM();
          api_EcuM_SelectShutdownTarget("ECUM_STATE_SLEEP", 0);
          api_EcuM_GoDownHaltPoll(0);
        }
      },
      {
        label: "🧪 Mở khóa SlaveCore1ReadyForSleep = TRUE để Core 0 tiếp tục ngủ ngay",
        run: () => {
          ecucConfig.SlaveCore1ReadyForSleep = true;
          syncConfigToDOM();
          stepClockTick(10);
        }
      },
      {
        label: "🧪 Chuyển sang Multi-Core Shutdown OFF (Cắt nguồn đồng bộ cả 2 nhân)",
        run: () => {
          api_EcuM_StartPreOS(true);
          ecucConfig.SlaveCore1ReadyForSleep = true;
          syncConfigToDOM();
          api_EcuM_SelectShutdownTarget("ECUM_STATE_OFF", 0);
          api_EcuM_GoDownHaltPoll(0);
        }
      }
    ]
  },
  {
    id: "S14",
    group: "Nhóm 4: Shutdown, Bootloader & Multi-Core",
    title: "S14: Kiểm Thử Phòng Vệ DET & RAM Check Failed ErrorHook",
    summary: "Kiểm chứng các mã lỗi chuẩn EcuM (ModuleId = 10): ECUM_E_UNINIT (0x10), ECUM_E_UNKNOWN_WAKEUP_SOURCE (0x17), ECUM_E_INVALID_PAR (0x13), ECUM_E_STATE_PAR_OUT_OF_RANGE (0x16) và EcuM_ErrorHook(ECUM_RAM_CHECK_FAILED).",
    setup: () => {
      resetScenarioBase({ EcuMDevErrorDetect: true });
      simState.stepExplain = "Sẵn sàng kiểm thử 4 mã lỗi DET chuẩn AUTOSAR EcuM & lỗi CheckRamHash.";
      recomputeRegisters();
    },
    steps: [
      {
        title: "Bẫy ECUM_E_UNKNOWN_WAKEUP_SOURCE (0x17) với bitmask 0xFF00",
        desc: "Truyền bitmask không có trong cấu hình EcuMWakeupSource vào EcuM_SetWakeupEvent() -> DET ghi nhận mã 0x17 và bật Bit 0 Thanh B (SYS_FAULT).",
        exec: () => {
          api_EcuM_SetWakeupEvent(0xFF00);
        }
      },
      {
        title: "Bẫy ECUM_E_STATE_PAR_OUT_OF_RANGE (0x16) & ECUM_E_INVALID_PAR (0x13)",
        desc: "Truyền ShutdownTarget = ECUM_STATE_INVALID và UserId = 99 vào RequestRUN -> DET ghi nhận đầy đủ cả 2 lỗi.",
        exec: () => {
          api_EcuM_SelectShutdownTarget("ECUM_STATE_INVALID", 0);
          api_EcuM_RequestRUN(99);
        }
      },
      {
        title: "Bẫy ECUM_E_UNINIT (0x10) khi EcuM chưa khởi tạo (ECUM_UNINIT)",
        desc: "Đặt EcuMInitialized = FALSE (Bit 7 Thanh A = 0) rồi gọi EcuM_RequestRUN(0) -> DET báo ECUM_E_UNINIT (0x10).",
        exec: () => {
          ecucConfig.EcuMInitialized = false;
          simState.initialized = false;
          syncConfigToDOM();
          api_EcuM_RequestRUN(0);
        }
      },
      {
        title: "Khôi phục Init & Tiêm lỗi RAM Hash Fail (ECUM_RAM_CHECK_FAILED)",
        desc: "Khi thức dậy từ GoHalt với dữ liệu RAM hỏng (0xDEAD), EcuM_CheckRamHash() == 0 gọi thẳng EcuM_ErrorHook(ECUM_RAM_CHECK_FAILED)!",
        exec: () => {
          ecucConfig.SimulateRamHashCorruption = true;
          syncConfigToDOM();
          api_EcuM_StartPreOS(true);
          api_EcuM_SelectShutdownTarget("ECUM_STATE_SLEEP", 0);
          api_EcuM_GoDownHaltPoll(0);
          api_EcuM_SetWakeupEvent(0x80);
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Bắn lỗi ECUM_E_UNKNOWN_WAKEUP_SOURCE (0x17) ngay",
        run: () => {
          api_EcuM_SetWakeupEvent(0xFF00);
        }
      },
      {
        label: "🧪 Tắt EcuMInitialized = FALSE rồi gọi API để kích hoạt ECUM_E_UNINIT",
        run: () => {
          ecucConfig.EcuMInitialized = false;
          simState.initialized = false;
          syncConfigToDOM();
          api_EcuM_RequestRUN(0);
        }
      },
      {
        label: "🧪 Xóa sạch lỗi & Khởi động lại ECU bình thường (Cold Reset)",
        run: () => {
          ecucConfig.SimulateRamHashCorruption = false;
          ecucConfig.InjectedPbConfigHash = ecucConfig.EcuMConfigConsistencyHash;
          simState.detFaults = [];
          syncConfigToDOM();
          api_EcuM_StartPreOS(true);
        }
      }
    ]
  }
];
