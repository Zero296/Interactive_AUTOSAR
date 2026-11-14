// ==================== PART 4B: 12 PRE-BUILT SCENARIOS & 36 WHAT-IF SANDBOX ACTIONS ====================

const SCENARIOS = [
  {
    id: "S1",
    title: "S1: Chuỗi khởi tạo EcuM -> Det_Init() -> Pre-Init Guard -> Det_Start()",
    summary: "Minh họa vòng đời Det: bắt buộc gọi Det_Init(NULL_PTR) sớm nhất tại EcuM_AL_DriverInitZero(), bảo vệ RAM khi có module gọi lỗi trước lúc Init (SWS_Det_00204), và kích hoạt DLT/Runtime bằng Det_Start() tại StartupTwo.",
    setup() {
      cfg = Object.assign({}, defaultConfig, { DetInitialized: false, DetStarted: false });
      simState = createInitialSimState();
      simState.lifecycleState = "DET_UNINIT";
    },
    steps: [
      {
        title: "Bước 1: Trạng thái DET_UNINIT & Lỗi gọi trước Det_Init (SWS_Det_00204)",
        desc: "CanIf (Module 60) gọi Det_ReportError(60, 0, 0x01, CANIF_E_UNINIT=0x1E) khi Det chưa Init. Det phải tự bảo vệ không ghi rác RAM.",
        exec() {
          api_Det_ReportError(60, 0, 0x01, 0x1E, "Early_CanIf_PreInit", { bypassCallerDetect: true });
        }
      },
      {
        title: "Bước 2: EcuM_AL_DriverInitZero() gọi Det_Init(NULL_PTR) [SID 0x00]",
        desc: "EcuM khởi tạo Det sớm nhất, xóa sạch Det_ErrorBuffer[8], bật Bit 7 (DET_INIT) và chuyển sang trạng thái DET_INIT.",
        exec() {
          api_Det_Init("NULL_PTR");
        }
      },
      {
        title: "Bước 3: Sau Det_Init, ghi lỗi khởi tạo CanIf vào RAM Buffer",
        desc: "Lúc này Det_Init đã xong nên lỗi cấu hình CanIf được ghi nhận vào Slot 0 (nhưng chưa đẩy ra DLT vì chưa Det_Start).",
        exec() {
          api_Det_ReportError(60, 0, 0x01, 0x05, "CanIf_InitCheck");
        }
      },
      {
        title: "Bước 4: EcuM_StartupTwo() gọi Det_Start() [SID 0x02]",
        desc: "Sau khi OS và DLT sẵn sàng, Det_Start() bật Bit 6 (DET_STARTED) để mở khóa xuất log đầy đủ.",
        exec() {
          api_Det_Start();
        }
      }
    ],
    whatIfs: [
      { label: "What-If 1: Bỏ qua Det_Init(), gọi luôn Det_Start()", run() { cfg.DetInitialized = false; simState.lifecycleState = "DET_UNINIT"; api_Det_Start(); } },
      { label: "What-If 2: Kích hoạt lỗi Dev sau khi đã DET_STARTED", run() { api_Det_Init("NULL_PTR"); api_Det_Start(); api_Det_ReportError(20, 0, 0x07, 0x15, "NvM_WriteBlock"); } },
      { label: "What-If 3: Thử Reset vòng đời về DET_UNINIT hoàn toàn", run() { cfg.DetInitialized = false; cfg.DetStarted = false; simState.lifecycleState = "DET_UNINIT"; addTrace("INFO", "Manual Reset to DET_UNINIT", "Cờ DetInitialized=FALSE, DetStarted=FALSE.", "SWS_Det_00204"); } }
    ]
  },

  {
    id: "S2",
    title: "S2: BSW Dev Error (NvM_WriteBlock) -> Hooks -> DLT -> Endless Loop Halt",
    summary: "Luồng điển hình trên bàn Lab: NvM (Module 20) phát hiện NVM_E_PARAM_BLOCK_ID (0x15), đi xuyên suốt Hooks -> Dlt_DetForwardErrorTrace -> RAM Buffer -> dừng CPU ở while(det_halt) để JTAG bắt Call Stack.",
    setup() {
      cfg = Object.assign({}, defaultConfig, {
        EcuBuildProfile: "DEV_DEBUG_BUILD",
        DetInitialized: true,
        DetStarted: true,
        CallerDevErrorDetect: true,
        DetEndlessLoopInDevError: true,
        TriggerHardwareBkptInstruction: true,
        DetForwardToDlt: true
      });
      simState = createInitialSimState();
    },
    steps: [
      {
        title: "Bước 1: NvM_WriteBlock(99, SrcPtr) phát hiện BlockId sai -> gọi Det_ReportError()",
        desc: "Bật DEV_ENA + ACTV_DEV + HOOK_OK + DLT_FWD + HALT_LP. CPU lập tức treo ở while(det_halt) + __BKPT(0) để kỹ sư Debug.",
        exec() {
          api_Det_ReportError(20, 0, 0x07, 0x15, "NvM_WriteBlock(99)");
        }
      },
      {
        title: "Bước 2: Kỹ sư dùng Trace32 đọc 4-Tuple & gỡ Break Endless Loop",
        desc: "Sau khi đọc Call Stack và gói (20, 0, 0x07, 0x15) trên DLT/Buffer, kỹ sư bẻ cờ det_halt = 0 để trả E_OK về NvM.",
        exec() {
          api_BreakEndlessLoop();
        }
      }
    ],
    whatIfs: [
      { label: "What-If 1: Chuyển sang Production Build (tắt CallerDevErrorDetect)", run() { applyBuildProfile("PRODUCTION_SERIES_BUILD"); api_Det_ReportError(20, 0, 0x07, 0x15, "NvM_WriteBlock(99)"); } },
      { label: "What-If 2: Tắt DetEndlessLoop (Integration Test Mode)", run() { cfg.DetEndlessLoopInDevError = false; cfg.TriggerHardwareBkptInstruction = false; api_Det_ReportError(20, 0, 0x07, 0x15, "NvM_WriteBlock(99)"); } },
      { label: "What-If 3: Tắt DLT Forwarding để giữ log nội bộ NoInit RAM", run() { cfg.DetForwardToDlt = false; cfg.SaveCrashCrumbToNoInitRam = true; api_Det_ReportError(20, 0, 0x07, 0x15, "NvM_WriteBlock(99)"); } }
    ]
  },

  {
    id: "S3",
    title: "S3: Bộ 4 BSW Dev Errors kinh điển (CanIf, WdgM, ComM, BswM)",
    summary: "So sánh 4 mã lỗi Dev Error phổ biến nhất khi tích hợp BSW stack mới: CANIF_E_UNINIT, WDGM_E_INV_POINTER, COMM_E_PARAM_CHANNEL và BSWM_E_PARAM_CONFIG.",
    setup() {
      cfg = Object.assign({}, defaultConfig, { DetEndlessLoopInDevError: false });
      simState = createInitialSimState();
    },
    steps: [
      {
        title: "Bước 1: CanIf (#60) báo CANIF_E_UNINIT (0x1E)",
        desc: "CanIf_Transmit() bị gọi trước khi CanIf_Init() hoàn tất.",
        exec() { api_Det_ReportError(60, 0, 0x05, 0x1E, "CanIf_Transmit"); }
      },
      {
        title: "Bước 2: WdgM (#13) báo WDGM_E_INV_POINTER (0x12)",
        desc: "WdgM_CheckpointReached() hoặc WdgM_Init() nhận tham số con trỏ NULL.",
        exec() { api_Det_ReportError(13, 0, 0x07, 0x12, "WdgM_CheckpointReached"); }
      },
      {
        title: "Bước 3: ComM (#12) báo COMM_E_PARAM_CHANNEL (0x11)",
        desc: "ComM_RequestComMode() nhận ChannelId không tồn tại trong cấu hình ECUC.",
        exec() { api_Det_ReportError(12, 1, 0x03, 0x11, "ComM_RequestComMode"); }
      },
      {
        title: "Bước 4: BswM (#42) báo BSWM_E_PARAM_CONFIG (0x01)",
        desc: "BswM_Init(ConfigPtr) nhận con trỏ cấu hình Post-Build sai CRC.",
        exec() { api_Det_ReportError(42, 0, 0x00, 0x01, "BswM_Init"); }
      }
    ],
    whatIfs: [
      { label: "What-If 1: Bật Breakpoint Filter chỉ bắt riêng WdgM (13:0x12)", run() { cfg.DetBreakpointFilterEnabled = true; cfg.DetBreakpointFilterRule = "13:0x12"; api_Det_ReportError(60, 0, 0x05, 0x1E, "CanIf"); api_Det_ReportError(13, 0, 0x07, 0x12, "WdgM"); } },
      { label: "What-If 2: Đổi Buffer Overflow sang STOP_ON_FULL_KEEP_FIRST", run() { cfg.DetErrorBufferSize = 3; cfg.DetBufferOverflowMode = "STOP_ON_FULL_KEEP_FIRST"; addTrace("INFO", "Overflow Mode Updated", "BufferSize=3 + STOP_ON_FULL -> Giữ 3 lỗi đầu tiên.", "ECUC"); } },
      { label: "What-If 3: Gọi cùng lỗi nhưng ở InstanceId = 2 (Kênh CAN #2)", run() { api_Det_ReportError(60, 2, 0x05, 0x1E, "CanIf_Ctrl2"); } }
    ]
  },

  {
    id: "S4",
    title: "S4: SWC gọi Det qua RTE DETService Port (PDAV Auto-ModuleId)",
    summary: "SWC tầng Application không được tự điền ModuleId. RTE Service Port dùng Port-Defined Argument Value (PDAV) tự động chèn ModuleId 2048/2049 khi truyền qua DETService.",
    setup() {
      cfg = Object.assign({}, defaultConfig, { SwcBrake_DetPortEnabled: true, SwcDiag_DetPortEnabled: true, SwcBrake_DetModuleId: 2048, SwcDiag_DetModuleId: 2049 });
      simState = createInitialSimState();
    },
    steps: [
      {
        title: "Bước 1: SWC_BrakeCtrl gọi Rte_Call_DETService_ReportError(0, 0x01, 0x02)",
        desc: "SWC chỉ truyền 3 tham số. RTE tự chèn PDAV ModuleId = 2048 (0x0800), bật Bit 7 (VIA_RTE) trên Thanh B.",
        exec() { api_Rte_Call_Det("SWC_BrakeCtrl", cfg.SwcBrake_DefaultInstanceId, 0x01, 0x02, "DEV"); }
      },
      {
        title: "Bước 2: SWC_DiagApp báo Runtime Error qua RTE (PDAV 2049)",
        desc: "SWC_DiagApp gọi Rte_Call_DETService_ReportRuntimeError(0, 0x00, 0x05). Luồng này vẫn hoạt động ở Production!",
        exec() { api_Rte_Call_Det("SWC_DiagApp", 0, 0x00, 0x05, "RUNTM"); }
      }
    ],
    whatIfs: [
      { label: "What-If 1: Vô hiệu hóa SwcBrake_DetPortEnabled trên RTE", run() { cfg.SwcBrake_DetPortEnabled = false; api_Rte_Call_Det("SWC_BrakeCtrl", 0, 0x01, 0x02, "DEV"); } },
      { label: "What-If 2: Đổi PDAV ModuleId của SWC_BrakeCtrl sang 3000 & Instance 1", run() { cfg.SwcBrake_DetPortEnabled = true; cfg.SwcBrake_DetModuleId = 3000; cfg.SwcBrake_DefaultInstanceId = 1; api_Rte_Call_Det("SWC_BrakeCtrl", 1, 0x01, 0x01, "DEV"); } },
      { label: "What-If 3: Tắt CallerDevErrorDetect -> SWC Runtime vẫn chạy!", run() { cfg.CallerDevErrorDetect = false; api_Rte_Call_Det("SWC_DiagApp", 0, 0x00, 0x05, "RUNTM"); } }
    ]
  },

  {
    id: "S5",
    title: "S5: Production Runtime Error — Det_ReportRuntimeError() [SID 0x04]",
    summary: "Trên xe thương mại (Production), CallerDevErrorDetect=FALSE nên nhánh Dev 0x01 bị biên dịch bỏ hoàn toàn. Tuy nhiên Det_ReportRuntimeError(0x04) vẫn sống để bắt nghẽn queue, không bao giờ treo CPU.",
    setup() {
      cfg = Object.assign({}, defaultConfig, { EcuBuildProfile: "PRODUCTION_SERIES_BUILD" });
      applyBuildProfile("PRODUCTION_SERIES_BUILD");
      cfg.DetForwardToDlt = true;
      simState = createInitialSimState();
    },
    steps: [
      {
        title: "Bước 1: Thử gọi Dev Error trong bản Production -> Bị lược bỏ tại Caller",
        desc: "Do #if (NVM_DEV_ERROR_DETECT == STD_ON) là FALSE, NvM không gọi được Det_ReportError(0x01).",
        exec() { api_Det_ReportError(20, 0, 0x07, 0x15, "NvM_Prod_DevSkipped"); }
      },
      {
        title: "Bước 2: NvM đầy hàng đợi -> gọi Det_ReportRuntimeError(20, 0, 0x07, NVM_E_QUEUE_FULL=0x1A)",
        desc: "Det xử lý Runtime Error: chạy RuntimeCallout_0, đẩy DLT, ghi RAM Buffer và LUÔN trả E_OK (không treo CPU!).",
        exec() { api_Det_ReportRuntimeError(20, 0, 0x07, 0x1A, "NvM_WriteBlock"); }
      }
    ],
    whatIfs: [
      { label: "What-If 1: Bật nhầm DetEndlessLoopInDevError=TRUE rồi gọi Runtime Error", run() { cfg.DetEndlessLoopInDevError = true; api_Det_ReportRuntimeError(20, 0, 0x07, 0x1A, "NvM_QueueFull"); } },
      { label: "What-If 2: Tắt LogRuntimeErrorsToBuffer -> chỉ báo Callout, không tốn RAM", run() { cfg.LogRuntimeErrorsToBuffer = false; api_Det_ReportRuntimeError(60, 0, 0x05, 0x05, "CanIf_Busy"); } },
      { label: "What-If 3: Tắt DetReportRuntimeErrorCalloutEnabled", run() { cfg.DetReportRuntimeErrorCalloutEnabled = false; api_Det_ReportRuntimeError(20, 0, 0x07, 0x1A, "NvM_QueueFull"); } }
    ]
  },

  {
    id: "S6",
    title: "S6: Đối chiếu 3 luồng trên cùng 1 Module — MCAL Fls (#92)",
    summary: "Cùng một MCAL Flash Driver (ModuleId 92) nhưng gọi 3 API khác nhau tùy bản chất sự cố: Dev (0x01) cho tham số sai, Runtime (0x04) cho Flash đang bận, Transient (0x05) cho lỗi ECC tạm thời.",
    setup() {
      cfg = Object.assign({}, defaultConfig, { DetEndlessLoopInDevError: false, DetForwardToDlt: true });
      simState = createInitialSimState();
    },
    steps: [
      {
        title: "Bước 1: Fls_Erase() sai độ dài -> Det_ReportError(92, 0, 0x01, FLS_E_PARAM_LENGTH=0x03)",
        desc: "Lỗi lập trình: chạy DetErrorHook + DLT + RAM Buffer.",
        exec() { api_Det_ReportError(92, 0, 0x01, 0x03, "Fls_Erase"); }
      },
      {
        title: "Bước 2: Fls_Write() khi Flash đang bận -> Det_ReportRuntimeError(92, 0, 0x02, FLS_E_BUSY=0x0A)",
        desc: "Lỗi vận hành xung đột tài nguyên: chạy RuntimeCallout + DLT + RAM Buffer.",
        exec() { api_Det_ReportRuntimeError(92, 0, 0x02, 0x0A, "Fls_Write"); }
      },
      {
        title: "Bước 3: Fls_Read() gặp lỗi ECC mềm -> Det_ReportTransientFault(92, 0, 0x07, 0x11)",
        desc: "Lưu ý SWS_Det_00211: KHÔNG đẩy DLT! Chỉ chạy TransientFaultCallout và trả Std_ReturnType về Fls.",
        exec() { api_Det_ReportTransientFault(92, 0, 0x07, 0x11, "Fls_Read_ECC"); }
      }
    ],
    whatIfs: [
      { label: "What-If 1: Bật EndlessLoop rồi chạy lại Fls ECC Transient Fault", run() { cfg.DetEndlessLoopInDevError = true; api_Det_ReportTransientFault(92, 0, 0x07, 0x11, "Fls_Read_ECC"); } },
      { label: "What-If 2: Đổi Transient Recovery sang E_NOT_OK (ECC không sửa được)", run() { cfg.TransientFaultRecoveryPolicy = "FAIL_UNCORRECTABLE_RETURN_E_NOT_OK"; api_Det_ReportTransientFault(92, 0, 0x07, 0x11, "Fls_Read_ECC"); } },
      { label: "What-If 3: Thử tắt CallerDevErrorDetect -> xem luồng 1 bị mất, luồng 2&3 vẫn chạy", run() { cfg.CallerDevErrorDetect = false; api_Det_ReportError(92, 0, 0x01, 0x03, "Fls_DevOff"); api_Det_ReportTransientFault(92, 0, 0x07, 0x11, "Fls_Trans"); } }
    ]
  },

  {
    id: "S7",
    title: "S7: MCAL Transient Fault [SID 0x05] — Recovery E_OK vs Leo thang DEM (E_NOT_OK)",
    summary: "Khác với Dev/Runtime luôn trả E_OK, Det_ReportTransientFault() lấy giá trị trả về từ TransientFaultCallout. Nếu trả E_NOT_OK, MCAL ngưng retry và báo DEM ghi nhận DTC hỏng cứng.",
    setup() {
      cfg = Object.assign({}, defaultConfig, { TransientFaultRecoveryPolicy: "AUTO_CORRECT_AND_RETURN_E_OK" });
      simState = createInitialSimState();
    },
    steps: [
      {
        title: "Bước 1: Spi_SyncTransmit() gặp nhiễu bus -> Tự phục hồi trả E_OK",
        desc: "Callout kích hoạt retry phần cứng thành công -> Det trả E_OK về cho Spi, KHÔNG đẩy DLT (SWS_Det_00211).",
        exec() { api_Det_ReportTransientFault(83, 0, 0x02, 0x0A, "Spi_SyncTransmit"); }
      },
      {
        title: "Bước 2: Fls_Erase() gặp lỗi Erase Fail cứng -> Callout trả E_NOT_OK!",
        desc: "Bật Bit 1 Thanh B (FLT_REJ) và tô sáng mũi tên leo thang DEM (Dem_SetEventStatus FAILED).",
        exec() {
          cfg.TransientFaultRecoveryPolicy = "FAIL_UNCORRECTABLE_RETURN_E_NOT_OK";
          api_Det_ReportTransientFault(92, 0, 0x01, 0x18, "Fls_Erase_HardFail");
        }
      }
    ],
    whatIfs: [
      { label: "What-If 1: Thử chính sách CUSTOM_VENDOR_RETURN_CODE (0x02)", run() { cfg.TransientFaultRecoveryPolicy = "CUSTOM_VENDOR_RETURN_CODE"; api_Det_ReportTransientFault(83, 0, 0x02, 0x0A, "Spi_VendorRetry"); } },
      { label: "What-If 2: Tắt hoàn toàn DetReportTransientFaultCalloutEnabled -> Default E_OK", run() { cfg.DetReportTransientFaultCalloutEnabled = false; api_Det_ReportTransientFault(92, 0, 0x01, 0x18, "Fls_NoCallout"); } },
      { label: "What-If 3: Tắt LogTransientFaultsToBuffer -> Callout chạy nhưng Buffer trống", run() { cfg.LogTransientFaultsToBuffer = false; api_Det_ReportTransientFault(92, 0, 0x01, 0x18, "Fls_NoBuf"); } }
    ]
  },

  {
    id: "S8",
    title: "S8: Multi-Hook Chain, DLT Forward & Bảo vệ chống đệ quy (Anti-Recursion)",
    summary: "Kiểm tra thứ tự chạy tuần tự DetErrorHook_0 -> DetErrorHook_1 -> Dlt_DetForwardErrorTrace -> RAM Buffer và cơ chế chặn stack overflow nếu bản thân Hook gọi ngược vào Det (SWS_Det_00180).",
    setup() {
      cfg = Object.assign({}, defaultConfig, {
        DetErrorHook_0_Enabled: true,
        DetErrorHook_1_Enabled: true,
        DetForwardToDlt: true,
        PreventRecursiveHookCall: true,
        DetEndlessLoopInDevError: false
      });
      simState = createInitialSimState();
    },
    steps: [
      {
        title: "Bước 1: CanIf phát sinh lỗi -> Hook[0] & Hook[1] chạy tuần tự trước DLT",
        desc: "Quan sát Pipeline Stage 3 (Hook[0,1]) và Stage 4 (DLT Sent) đều sáng xanh.",
        exec() { api_Det_ReportError(60, 0, 0x05, 0x05, "CanIf_Transmit"); }
      },
      {
        title: "Bước 2: Hook_0 vô tình gọi hàm BSW bị lỗi -> kích hoạt Anti-Recursion (SWS_Det_00180)",
        desc: "Det phát hiện cờ đệ quy đang bận nên chặn cuộc gọi vòng lặp, ngăn chặn tràn Stack ECU.",
        exec() { api_Det_ReportError(20, 0, 0x07, 0x15, "Hook0_Nested_NvM", { simulateHookRecursion: true }); }
      }
    ],
    whatIfs: [
      { label: "What-If 1: Tắt PreventRecursiveHookCall (Nguy hiểm Stack Overflow!)", run() { cfg.PreventRecursiveHookCall = false; api_Det_ReportError(20, 0, 0x07, 0x15, "Hook0_Nested_Danger", { simulateHookRecursion: true }); } },
      { label: "What-If 2: Tắt DetErrorHook_0, chỉ chạy SafetyLogger Hook_1", run() { cfg.DetErrorHook_0_Enabled = false; cfg.DetErrorHook_1_Enabled = true; api_Det_ReportError(60, 0, 0x05, 0x05, "CanIf_Hook1Only"); } },
      { label: "What-If 3: Đổi DLT AppId/CtxId sang 'DIAG / ER01'", run() { cfg.DltAppIdAndContextId = "DIAG / ER01"; api_Det_ReportError(60, 0, 0x05, 0x05, "CanIf_NewDltId"); } }
    ]
  },

  {
    id: "S9",
    title: "S9: Bão lỗi (10x Error Storm), Ring Buffer Overflow & Bộ lọc Filter",
    summary: "Phân biệt FIFO_OVERWRITE_OLDEST (giữ lỗi mới nhất) vs STOP_ON_FULL_KEEP_FIRST (giữ nguyên lỗi gốc đầu tiên không bị bão đè mất) và cách dùng Global Filter + Breakpoint Filter.",
    setup() {
      cfg = Object.assign({}, defaultConfig, {
        DetErrorBufferSize: 4,
        DetBufferOverflowMode: "FIFO_OVERWRITE_OLDEST",
        DetEndlessLoopInDevError: false,
        DetGlobalFilterEnabled: false
      });
      simState = createInitialSimState();
    },
    steps: [
      {
        title: "Bước 1: Ghi Root-Cause đầu tiên (WdgM 0x12) vào Slot 0",
        desc: "Giả lập nguyên nhân gốc đầu tiên xuất hiện trước khi kéo theo bão lỗi CanIf.",
        exec() { api_Det_ReportError(13, 0, 0x07, 0x12, "RootCause_WdgM"); }
      },
      {
        title: "Bước 2: Bão 10 lỗi CanIf tràn vào Buffer Size=4 (FIFO Overwrite ghi đè Slot 0!)",
        desc: "Chế độ FIFO ghi vòng khiến Root-Cause WdgM ở Slot 0 bị ghi đè mất. Bit 1 (BUF_OVF) bật sáng.",
        exec() { api_InjectSpecialEvent("STORM_10X"); }
      },
      {
        title: "Bước 3: Reset Buffer, chuyển sang STOP_ON_FULL_KEEP_FIRST + Bật Global Filter 60:0x05",
        desc: "Lỗi nhiễu 60:0x05 bị chặn bởi Global Filter (Bit 3 GLB_FLT). Khi buffer đầy 4 slot, nó khóa lại giữ nguyên Root-Cause!",
        exec() {
          api_ClearRamBuffer();
          cfg.DetBufferOverflowMode = "STOP_ON_FULL_KEEP_FIRST";
          cfg.DetGlobalFilterEnabled = true;
          cfg.DetGlobalFilterRule = "60:0x05";
          api_Det_ReportError(13, 0, 0x07, 0x12, "RootCause_Protected");
          api_InjectSpecialEvent("STORM_10X");
        }
      }
    ],
    whatIfs: [
      { label: "What-If 1: Bật Breakpoint Filter bắt riêng '60:0x11' giữa cơn bão", run() { cfg.DetGlobalFilterEnabled = true; cfg.DetBreakpointFilterEnabled = true; cfg.DetBreakpointFilterRule = "60:0x11"; api_InjectSpecialEvent("STORM_10X"); } },
      { label: "What-If 2: Mở rộng Buffer lên tối đa 8 slots & xóa bộ lọc", run() { cfg.DetErrorBufferSize = 8; cfg.DetGlobalFilterEnabled = false; api_ClearRamBuffer(); api_InjectSpecialEvent("STORM_10X"); } },
      { label: "What-If 3: Thử Global Filter wildcard '60:*' chặn toàn bộ nhiễu CanIf", run() { cfg.DetGlobalFilterEnabled = true; cfg.DetGlobalFilterRule = "60:*"; api_Det_ReportError(60, 0, 0x05, 0x11, "CanIf_WildcardSuppressed"); } }
    ]
  },

  {
    id: "S10",
    title: "S10: Đa nhiệm & Ngắt (Task_10ms vs ISR_CanRx) — SchM Exclusive Area",
    summary: "Khi Task_10ms đang ghi Det_ErrorBuffer thì ngắt cứng ISR_CanRx xen ngang. Nếu bật ProtectReentrancyWithSchM (SWS_Det_00039) -> an toàn tuyệt đối; nếu tắt -> Race Condition xé đôi dữ liệu RAM!",
    setup() {
      cfg = Object.assign({}, defaultConfig, { ProtectReentrancyWithSchM: true, DetEndlessLoopInDevError: false });
      simState = createInitialSimState();
    },
    steps: [
      {
        title: "Bước 1: Chế độ An toàn (ProtectReentrancyWithSchM = TRUE)",
        desc: "SchM_Enter_Det_DET_EXCLUSIVE_AREA_0() khóa ngắt ngắn. Task_10ms ghi xong Slot N thì ISR_CanRx mới được ghi Slot N+1.",
        exec() { api_InjectSpecialEvent("ISR_PREEMPT_TASK"); }
      },
      {
        title: "Bước 2: Tắt SchM Exclusive Area -> Mô phỏng Race Condition!",
        desc: "ISR_CanRx xen ngang giữa lúc con trỏ WriteIdx chưa cập nhật xong, làm hỏng (CORRUPTED) ô nhớ trên Ring Buffer.",
        exec() {
          cfg.ProtectReentrancyWithSchM = false;
          api_InjectSpecialEvent("ISR_PREEMPT_TASK");
        }
      }
    ],
    whatIfs: [
      { label: "What-If 1: Bật lại SchM Exclusive Area để khôi phục an toàn", run() { cfg.ProtectReentrancyWithSchM = true; api_InjectSpecialEvent("ISR_PREEMPT_TASK"); } },
      { label: "What-If 2: Chuyển CPU Context sang ISR_CanRx và bắn SWC Runtime", run() { simState.execContext = "ISR_CanRx"; api_Rte_Call_Det("SWC_DiagApp", 0, 0x00, 0x05, "RUNTM"); } },
      { label: "What-If 3: Kiểm tra HookExecutionTimeUs vượt ngưỡng trong Exclusive Area", run() { cfg.MaxHookExecutionTimeUs = 5; addTrace("HOOK", "Timing Warning: Hook 42us > Max 5us!", "Thời gian chạy Hook trong Exclusive Area làm trễ ngắt ISR_CanRx.", "ISO 26262 Timing"); } }
    ]
  },

  {
    id: "S11",
    title: "S11: Self-Reporting — Det_GetVersionInfo(NULL_PTR) [SID 0x03]",
    summary: "Ngay cả bản thân module Det cũng tuân thủ chuẩn kiểm tra tham số AUTOSAR: gọi Det_GetVersionInfo(NULL_PTR) sẽ khiến Det tự báo lỗi DET_E_PARAM_POINTER (0x01) với chính ModuleId = 15 của mình.",
    setup() {
      cfg = Object.assign({}, defaultConfig, { DetVersionInfoApi: true, DetEndlessLoopInDevError: false });
      simState = createInitialSimState();
    },
    steps: [
      {
        title: "Bước 1: Gọi hợp lệ Det_GetVersionInfo(&verInfo)",
        desc: "Con trỏ hợp lệ -> trả về ModuleId=15, VendorId=0x001E, SW=22.11.0.",
        exec() { api_Det_GetVersionInfo(false); }
      },
      {
        title: "Bước 2: Truyền NULL_PTR vào Det_GetVersionInfo(NULL_PTR)",
        desc: "Det tự gọi Det_ReportError(15, 0, 0x03, 0x01)! Bật Bit 0 Thanh B (SELF_ERR).",
        exec() { api_Det_GetVersionInfo(true); }
      }
    ],
    whatIfs: [
      { label: "What-If 1: Tắt DetVersionInfoApi trong ECUC", run() { cfg.DetVersionInfoApi = false; api_Det_GetVersionInfo(true); } },
      { label: "What-If 2: Bật EndlessLoop để bắt lỗi chính Det gọi NULL_PTR", run() { cfg.DetVersionInfoApi = true; cfg.DetEndlessLoopInDevError = true; api_Det_GetVersionInfo(true); } },
      { label: "What-If 3: Bật Breakpoint Filter bắt '15:0x01'", run() { cfg.DetVersionInfoApi = true; cfg.DetBreakpointFilterEnabled = true; cfg.DetBreakpointFilterRule = "15:0x01"; api_Det_GetVersionInfo(true); } }
    ]
  },

  {
    id: "S12",
    title: "S12: Ranh giới DET vs DEM qua 4 sự kiện nối tiếp trên ECU",
    summary: "Phân biệt dứt khoát module nào đi vào DET và module nào đi vào DEM: (1) Lỗi code -> DET 0x01, (2) Nghẽn Runtime -> DET 0x04, (3) Nhiễu ECC -> DET 0x05, (4) Đứt dây/chập cảm biến thật -> DEM DTC + NvM + UDS 0x19!",
    setup() {
      cfg = Object.assign({}, defaultConfig, { EnableSideBySideDemComparison: true, DetEndlessLoopInDevError: false });
      simState = createInitialSimState();
    },
    steps: [
      {
        title: "Sự kiện 1: Bug code NvM BlockId sai -> Vào DET (0x01), KHÔNG lưu NvM/UDS",
        desc: "Chỉ phục vụ Dev trên bàn lab; không tạo DTC.",
        exec() { api_Det_ReportError(20, 0, 0x07, 0x15, "Event1_CodeBug"); }
      },
      {
        title: "Sự kiện 2: Queue NvM đầy lúc cao tải -> Vào DET Runtime (0x04), trả E_OK",
        desc: "Cảnh báo hiệu năng runtime; không ghi DTC.",
        exec() { api_Det_ReportRuntimeError(20, 0, 0x07, 0x1A, "Event2_RuntimeLoad"); }
      },
      {
        title: "Sự kiện 3: Nhiễu ECC Flash phục hồi được -> Vào DET Transient (0x05), trả E_OK",
        desc: "SWS_Det_00211: KHÔNG qua DLT; Driver tự phục hồi.",
        exec() {
          cfg.TransientFaultRecoveryPolicy = "AUTO_CORRECT_AND_RETURN_E_OK";
          api_Det_ReportTransientFault(92, 0, 0x07, 0x11, "Event3_EccSoft");
        }
      },
      {
        title: "Sự kiện 4: Hỏng Flash/Đứt dây cảm biến vĩnh viễn -> Leo thang sang DEM!",
        desc: "Callout trả E_NOT_OK -> gọi Dem_SetEventStatus(FAILED), DEM Debounce -> Confirmed DTC -> lưu NvM -> đọc bằng UDS 0x19!",
        exec() {
          cfg.TransientFaultRecoveryPolicy = "FAIL_UNCORRECTABLE_RETURN_E_NOT_OK";
          api_Det_ReportTransientFault(92, 0, 0x01, 0x18, "Event4_HardFault_DEM");
        }
      }
    ],
    whatIfs: [
      { label: "What-If 1: Mở Module I/O Inspector xem bảng đối xứng DET vs DEM", run() { simState.selectedModule = "MOD_DEBUG_DEM"; switchInspTab("io"); } },
      { label: "What-If 2: Chuyển ECU sang Production Build -> Sự kiện 1 biến mất!", run() { applyBuildProfile("PRODUCTION_SERIES_BUILD"); api_Det_ReportError(20, 0, 0x07, 0x15, "Event1_ProdBuild"); } },
      { label: "What-If 3: Đặt lại ECC thành E_OK -> Không leo thang DEM", run() { cfg.TransientFaultRecoveryPolicy = "AUTO_CORRECT_AND_RETURN_E_OK"; api_Det_ReportTransientFault(92, 0, 0x01, 0x18, "Event4_RetriedOK"); } }
    ]
  }
];
