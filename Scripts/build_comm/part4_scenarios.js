// ================= PART 4B: 14 BUILT-IN SCENARIOS (S1-S14) & 42 1-CLICK WHAT-IF ACTIONS =================

function applyPresetBase(overrides) {
  ecucConfig = Object.assign(JSON.parse(JSON.stringify(defaultConfig)), overrides || {});
  simState = createInitialSimState();
  simState.initialized = ecucConfig.ComMInitialized;
  simState.channels[0].commAllowed = ecucConfig.ComMCommunicationAllowedFlag;
  simState.channels[1].commAllowed = ecucConfig.ComMCommunicationAllowedFlag;
  simState.channels[0].noWakeup = ecucConfig.ComMNoWakeup;
  simState.channels[0].limitToNoCom = ecucConfig.ComMNoCom;
  simState.channels[0].dcmActive = ecucConfig.ComMDcmDiagnosticActiveFlag;
  simState.globalLimitEcu = ecucConfig.GlobalLimitEcuToNoCom;
  simState.inhibitCounter = ecucConfig.ComMInhibitCounterValue;
  const eira = parseHexPair(ecucConfig.RxEiraSignalHex);
  simState.rxEiraByte2 = eira.b2; simState.rxEiraByte3 = eira.b3;
  const era0 = parseHexPair(ecucConfig.RxEraCh0Hex);
  simState.rxEraCh0Byte2 = era0.b2; simState.rxEraCh0Byte3 = era0.b3;
  const era1 = parseHexPair(ecucConfig.RxEraCh1Hex);
  simState.rxEraCh1Byte2 = era1.b2; simState.rxEraCh1Byte3 = era1.b3;
  syncConfigToDOM();
  recomputeRegisters();
}

const SCENARIOS = [
  // -------------------- GROUP 1 --------------------
  {
    id: "S1",
    group: "Nhóm 1: Khởi Động & Phân Xử",
    title: "S1: Boot-Up ECU, ComM_Init() & Gatekeeper CommunicationAllowed",
    summary: "Minh họa chu trình khởi tạo ComM từ COMM_UNINIT (SWS_ComM_00884 đặt CommunicationAllowed=FALSE), SWC xin mạng sớm bị giữ ở NO_COM_REQUEST_PENDING và khoảnh khắc EcuM mở Gatekeeper.",
    setup() {
      applyPresetBase({ ComMInitialized: false, ComMCommunicationAllowedFlag: false });
      forceUninitPrecondition("ECU vừa cấp nguồn, ComM đang ở trạng thái COMM_UNINIT.");
      simState.stepExplain = "Bước 0 (Tiền điều kiện): ECU vừa cấp nguồn. ComM chưa gọi ComM_Init() (COMM_UNINIT, Bit 7 Thanh B = 0) và Gatekeeper CommunicationAllowed = FALSE.";
    },
    steps: [
      {
        title: "EcuM gọi ComM_Init(&ComM_Config)",
        desc: "Khởi tạo toàn bộ cấu trúc nội bộ ComM, đặt mặc định CommunicationAllowed = FALSE (SWS_ComM_00884) và đưa kênh Ch0/Ch1 vào NO_COM_NO_PENDING_REQUEST.",
        exec() { api_ComM_Init(true); }
      },
      {
        title: "SWC User 0 gọi ComM_RequestComMode(0, FULL_COM) sớm",
        desc: "User 0 xin mạng ngay khi ECU đang Startup. Vì CommunicationAllowed = FALSE, ComM giữ yêu cầu ở COMM_NO_COM_REQUEST_PENDING (SWS_ComM_00895, Bit 5 Thanh A = 1).",
        exec() { api_ComM_RequestComMode(0, "FULL_COM"); }
      },
      {
        title: "EcuM/BswM mở Gatekeeper ComM_CommunicationAllowed(0, TRUE)",
        desc: "Transceiver & nguồn đã ổn định. Gatekeeper mở khóa (Bit 4 Thanh A COMM_ALLOW = 1) -> chuyển ngay sang FULL_COM_NETWORK_REQUESTED.",
        exec() { api_ComM_CommunicationAllowed(0, true); }
      },
      {
        title: "Tick +20ms MainFunction — Kênh Ch0 xác nhận BusSM vào FULL_COM",
        desc: "ComM nhận ComM_CanSM_ModeIndication(0, FULL_COM) (pass-by-value, SWS_ComM_00675), báo DCM, BswM và cập nhật User 0 lên FULL_COM.",
        exec() { stepClockTick(20); }
      }
    ],
    whatIfs: [
      { label: "🧪 Khóa lại CommunicationAllowed(FALSE) và gọi User 1", run() { api_ComM_CommunicationAllowed(0, false); api_ComM_RequestComMode(1, "FULL_COM"); } },
      { label: "🧪 Giả lập gọi RequestComMode khi ECU mất Init (COMM_UNINIT)", run() { forceUninitPrecondition("Reset mô phỏng mất ComM_Init"); api_ComM_RequestComMode(0, "FULL_COM"); } },
      { label: "🧪 Đổi ComMBusType = INTERNAL để bỏ qua BusSM (SWS_ComM_00664)", run() { ecucConfig.ComMBusType = "COMM_BUS_TYPE_INTERNAL"; ecucConfig.ComMNmVariant = "NONE"; syncConfigToDOM(); api_ComM_RequestComMode(0, "FULL_COM"); } }
    ]
  },
  {
    id: "S2",
    group: "Nhóm 1: Khởi Động & Phân Xử",
    title: "S2: Single User Request FULL_COM & Bắt Tay <Bus>SM / Nm (FULL)",
    summary: "Theo dõi giao thức bắt tay bất đồng bộ giữa ComM ↔ CanSM (<Bus>SM) ↔ CanNm. Chỉ khi nhận ComM_<Bus>SM_ModeIndication(Ch, Mode) (by-value) thì User/DCM/BswM mới được báo FULL_COM.",
    setup() {
      applyPresetBase({ ComMNmVariant: "FULL", ComMCommunicationAllowedFlag: true, SimulateBusSmIndicationDelay: 40 });
      simState.stepExplain = "Bước 0: Kênh Ch0 ở NO_COM (Variant=FULL, CommunicationAllowed=TRUE). SimulateBusSmIndicationDelay đặt 40ms để quan sát rõ pha chờ CanSM.";
    },
    steps: [
      {
        title: "User 0 gọi ComM_RequestComMode(0, COMM_FULL_COMMUNICATION)",
        desc: "Ch0 vào FULL_COM_NETWORK_REQUESTED (SWS_ComM_00880), gọi CanSM_RequestComMode(0, FULL) và Nm_NetworkRequest(0). Bit 1 BUSSM vẫn bằng 0 và User 0 currentMode vẫn là NO_COM!",
        exec() { api_ComM_RequestComMode(0, "FULL_COM"); }
      },
      {
        title: "Tick +20ms (CanSM đang bật Transceiver / Controller)",
        desc: "Delay còn 20ms; ComM vẫn đợi callback từ CanSM trước khi mở khóa SWC và DCM.",
        exec() { stepClockTick(20); }
      },
      {
        title: "Tick +20ms — CanSM gọi ComM_CanSM_ModeIndication(0, FULL_COM)",
        desc: "Bit 1 BUSSM bật lên 1! ComM phát BswM_ComM_CurrentMode(FULL_COM), Dcm_ComM_FullComModeEntered(0) và Rte_Switch tới SWC User 0.",
        exec() { stepClockTick(20); }
      }
    ],
    whatIfs: [
      { label: "🧪 Cho CanSM xác nhận tức thì (Delay = 0ms)", run() { ecucConfig.SimulateBusSmIndicationDelay = 0; syncConfigToDOM(); api_ComM_RequestComMode(0, "FULL_COM"); } },
      { label: "🧪 User 0 Release ngay tại đây", run() { api_ComM_RequestComMode(0, "NO_COM"); } },
      { label: "🧪 Kéo CanSM Delay lên 200ms để giả lập bus nghẽn", run() { ecucConfig.SimulateBusSmIndicationDelay = 200; syncConfigToDOM(); simState.channels[0].mode = "COMM_NO_COMMUNICATION"; simState.channels[0].actualBusSmMode = "COMM_NO_COMMUNICATION"; api_ComM_RequestComMode(0, "FULL_COM"); } }
    ]
  },
  {
    id: "S3",
    group: "Nhóm 1: Khởi Động & Phân Xử",
    title: "S3: Multi-User Arbitration & Ràng Buộc Thời Gian TMinFullComMode",
    summary: "Phân xử OR logic giữa User 0 và User 1: chỉ cần 1 User còn giữ yêu cầu thì kênh vẫn ở FULL_COM; khi cả 2 nhả sớm, timer TMinFullComModeDuration (500ms) vẫn giữ NETWORK_REQUESTED.",
    setup() {
      applyPresetBase({ ComMNmVariant: "LIGHT", ComMCommunicationAllowedFlag: true, ComMTMinFullComModeDuration: 500, ComMNmLightTimeout: 1000, SimulateBusSmIndicationDelay: 0 });
      simState.stepExplain = "Bước 0: Kênh cấu hình LIGHT với TMinFullComModeDuration = 500ms. Sẵn sàng minh họa phân xử User 0 & User 1.";
    },
    steps: [
      {
        title: "User 0 yêu cầu FULL_COM -> TMinFull (500ms) bắt đầu chạy",
        desc: "Bit 7 USER_FULL = 1, Bit 3 T_MIN_FULL = 1 (500ms), kênh vào COMM_FULL_COM_NETWORK_REQUESTED.",
        exec() { api_ComM_RequestComMode(0, "FULL_COM"); }
      },
      {
        title: "Tại t=40ms: User 1 cũng gọi FULL_COM (Multi-User Overlap)",
        desc: "Cả User 0 và User 1 cùng chia sẻ kênh Ch0. Ma trận phân xử hiển thị WINNER = FULL_COM.",
        exec() { stepClockTick(40); api_ComM_RequestComMode(1, "FULL_COM"); }
      },
      {
        title: "Tại t=60ms: User 0 gọi NO_COM (Nhả mạng)",
        desc: "Dù User 0 đã về NO_COM, User 1 vẫn đang yêu cầu FULL_COM -> Arbitration giữ nguyên FULL_COM_NETWORK_REQUESTED!",
        exec() { stepClockTick(20); api_ComM_RequestComMode(0, "NO_COM"); }
      },
      {
        title: "Tại t=100ms: User 1 cũng nhả NO_COM sớm!",
        desc: "Tất cả User đã về NO_COM, NHƯNG TMinFullComModeDuration vẫn còn ~400ms -> Ch0 KHÔNG ĐƯỢC chuyển sang READY_SLEEP!",
        exec() { stepClockTick(40); api_ComM_RequestComMode(1, "NO_COM"); }
      },
      {
        title: "Tua hết 420ms -> TMinFull kết thúc, Ch0 vào READY_SLEEP",
        desc: "Bit 3 T_MIN_FULL tắt về 0, Ch0 chuyển sang COMM_FULL_COM_READY_SLEEP và kích hoạt NmLightTimeout.",
        exec() { stepClockTick(420); }
      }
    ],
    whatIfs: [
      { label: "🧪 User 0 xin lại FULL_COM khi TMinFull đang chạy", run() { api_ComM_RequestComMode(0, "FULL_COM"); } },
      { label: "🧪 Giảm TMinFull xuống 100ms để thấy tốc độ nhả nhanh", run() { ecucConfig.ComMTMinFullComModeDuration = 100; syncConfigToDOM(); runArbitrationCycle(0); } },
      { label: "🧪 Chuyển Variant sang FULL (không dùng TMinFull)", run() { ecucConfig.ComMNmVariant = "FULL"; syncConfigToDOM(); runArbitrationCycle(0); } }
    ]
  },
  {
    id: "S4",
    group: "Nhóm 1: Khởi Động & Phân Xử",
    title: "S4: Release Toàn Bộ User — Graceful Shutdown (FULL → SILENT → NO_COM)",
    summary: "Quy trình ngủ mạng êm dịu (Graceful Shutdown) chuẩn AUTOSAR biến thể FULL thông qua callback đồng bộ với CanNm và bỏ qua CommunicationAllowed khi tỉnh lại từ SILENT_COM (SWS_ComM_00896).",
    setup() {
      applyPresetBase({ ComMNmVariant: "FULL", ComMCommunicationAllowedFlag: true, SimulateBusSmIndicationDelay: 0 });
      api_ComM_RequestComMode(0, "FULL_COM");
      simState.stepExplain = "Bước 0: Kênh Ch0 đang hoạt động ổn định ở FULL_COM_NETWORK_REQUESTED bởi User 0.";
    },
    steps: [
      {
        title: "User 0 gọi ComM_RequestComMode(0, COMM_NO_COMMUNICATION)",
        desc: "Hết chủ thể giữ mạng -> Ch0 chuyển FULL_COM_READY_SLEEP và gọi Nm_NetworkRelease(0) xuống CanNm.",
        exec() { api_ComM_RequestComMode(0, "NO_COM"); }
      },
      {
        title: "CanNm gọi ComM_Nm_PrepareBusSleepMode(0) -> SILENT_COM",
        desc: "Sau khi hết NmTimeout trên bus, CanNm vào PrepareBusSleep. ComM đưa Ch0 xuống COMM_SILENT_COMMUNICATION (SWS_ComM_00881) và báo Dcm_ComM_SilentComModeEntered.",
        exec() { stepClockTick(200); api_ComM_Nm_PrepareBusSleepMode(0); }
      },
      {
        title: "CanNm hết WaitBusSleepTime -> gọi ComM_Nm_BusSleepMode(0)",
        desc: "ComM gọi CanSM_RequestComMode(0, NO_COM), BswM tắt I-PDU Group và báo Dcm_ComM_NoComModeEntered. Ch0 về dứt điểm COMM_NO_COMMUNICATION.",
        exec() { stepClockTick(500); api_ComM_Nm_BusSleepMode(0); }
      }
    ],
    whatIfs: [
      { label: "🧪 Ở SILENT_COM: khóa CommAllowed=FALSE rồi User 0 xin FULL_COM (SWS_ComM_00896!)", run() { api_ComM_CommunicationAllowed(0, false); api_ComM_RequestComMode(0, "FULL_COM"); } },
      { label: "🧪 Ở SILENT_COM: CanNm báo ComM_Nm_NetworkMode(0) -> READY_SLEEP (SWS_ComM_00296)", run() { api_ComM_Nm_NetworkMode(0); } },
      { label: "🧪 Bật PreventWakeUp rồi thử xin FULL_COM khi đang SILENT_COM", run() { api_ComM_PreventWakeUp(0, true); api_ComM_RequestComMode(0, "FULL_COM"); } }
    ]
  },

  // -------------------- GROUP 2 --------------------
  {
    id: "S5",
    group: "Nhóm 2: NM Variants & Wakeup",
    title: "S5: Biến Thể LIGHT (NmLightTimeout) & Sự Khác Biệt Với Biến Thể NONE",
    summary: "Biến thể LIGHT dùng timer NmLightTimeout trong READY_SLEEP rồi tự tắt về NO_COM. Còn biến thể NONE trên bus vật lý (CAN) giữ ở READY_SLEEP vô hạn (trừ COMM_BUS_TYPE_INTERNAL về NO_COM ngay, SWS_ComM_00889/00664).",
    setup() {
      applyPresetBase({ ComMNmVariant: "LIGHT", ComMCommunicationAllowedFlag: true, ComMTMinFullComModeDuration: 100, ComMNmLightTimeout: 1000, SimulateBusSmIndicationDelay: 0 });
      api_ComM_RequestComMode(0, "FULL_COM");
      simState.stepExplain = "Bước 0: Kênh cấu hình ComMNmVariant = LIGHT (NmLightTimeout = 1000ms), đang ở FULL_COM_NETWORK_REQUESTED.";
    },
    steps: [
      {
        title: "User 0 release NO_COM & chờ hết TMinFull (100ms)",
        desc: "Tua qua TMinFull=100ms để kênh chuyển sang COMM_FULL_COM_READY_SLEEP và kích hoạt timer NmLightTimeout = 1000ms (SWS_ComM_00891).",
        exec() { stepClockTick(100); api_ComM_RequestComMode(0, "NO_COM"); }
      },
      {
        title: "Quan sát READY_SLEEP: Bit 2 NM_LIGHT_TM = 1 (còn 600ms)",
        desc: "Sau 400ms trong READY_SLEEP, không có gọi Nm_NetworkRelease(); ComM tự đếm lùi ComMNmLightTimeout.",
        exec() { stepClockTick(400); }
      },
      {
        title: "Hết 600ms còn lại -> Tắt THẲNG về COMM_NO_COMMUNICATION",
        desc: "NmLightTimeout chạm 0ms: biến thể LIGHT nhảy thẳng về NO_COM, hoàn toàn BỎ QUA trạng thái SILENT_COM!",
        exec() { stepClockTick(600); }
      }
    ],
    whatIfs: [
      { label: "🧪 Gia hạn tức thì bằng cách bấm User 0 FULL_COM trước khi hết Timeout", run() { api_ComM_RequestComMode(0, "FULL_COM"); } },
      { label: "🧪 So sánh NONE + CAN (dừng ở READY_SLEEP theo SWS_ComM_00889)", run() { ecucConfig.ComMNmVariant = "NONE"; ecucConfig.ComMBusType = "COMM_BUS_TYPE_CAN"; syncConfigToDOM(); api_ComM_RequestComMode(0, "FULL_COM"); stepClockTick(100); api_ComM_RequestComMode(0, "NO_COM"); } },
      { label: "🧪 So sánh NONE + INTERNAL (tắt thẳng NO_COM theo SWS_ComM_00664)", run() { ecucConfig.ComMNmVariant = "NONE"; ecucConfig.ComMBusType = "COMM_BUS_TYPE_INTERNAL"; syncConfigToDOM(); api_ComM_RequestComMode(0, "FULL_COM"); stepClockTick(100); api_ComM_RequestComMode(0, "NO_COM"); } }
    ]
  },
  {
    id: "S6",
    group: "Nhóm 2: NM Variants & Wakeup",
    title: "S6: Passive Wakeup (Nm_PassiveStartUp) & ComMSynchronousWakeUp",
    summary: "Khi ECU ngủ sâu, Passive Wakeup đưa kênh qua NO_COM_REQUEST_PENDING -> FULL_COM_NETWORK_REQUESTED (gọi Nm_PassiveStartUp) rồi chuyển vào FULL_COM_READY_SLEEP (SWS_ComM_00665 / 00888 / 00902).",
    setup() {
      applyPresetBase({ ComMSynchronousWakeUp: true, ComMCommunicationAllowedFlag: false, SimulateBusSmIndicationDelay: 0 });
      simState.stepExplain = "Bước 0: Ch0 và Ch1 đều ngủ sâu (NO_COM_NO_PENDING_REQUEST). ComMSynchronousWakeUp = TRUE, CommunicationAllowed đang đợi ECU Startup = FALSE.";
    },
    steps: [
      {
        title: "CanTrcv đánh thức -> EcuM gọi ComM_EcuM_WakeUpIndication(0)",
        desc: "Bit 2 Thanh B SYNC_WAKEUP bật lên 1! Cả Ch0 và Ch1 cùng chuyển sang COMM_NO_COM_REQUEST_PENDING (SWS_ComM_00893, Bit 5 WAKEUP_PEND = 1).",
        exec() { api_ComM_EcuM_WakeUpIndication(0); }
      },
      {
        title: "EcuM mở ComM_CommunicationAllowed(0 & 1, TRUE)",
        desc: "Gatekeeper mở -> Kênh quá cảnh qua FULL_COM_NETWORK_REQUESTED gọi Nm_PassiveStartUp() (SWS_ComM_00665) rồi sang COMM_FULL_COM_READY_SLEEP (SWS_ComM_00888).",
        exec() { api_ComM_CommunicationAllowed(0, true); api_ComM_CommunicationAllowed(1, true); }
      },
      {
        title: "Không có User nội bộ yêu cầu -> CanNm đi ngủ sau timeout",
        desc: "CanNm gọi ComM_Nm_PrepareBusSleepMode(0) -> SILENT_COM -> ComM_Nm_BusSleepMode(0) -> NO_COM.",
        exec() { stepClockTick(100); api_ComM_Nm_PrepareBusSleepMode(0); stepClockTick(200); api_ComM_Nm_BusSleepMode(0); }
      }
    ],
    whatIfs: [
      { label: "🧪 Tắt ComMSynchronousWakeUp = FALSE rồi kích Wakeup Ch0", run() { applyPresetBase({ ComMSynchronousWakeUp: false, ComMCommunicationAllowedFlag: true }); api_ComM_EcuM_WakeUpIndication(0); } },
      { label: "🧪 User 0 nhảy vào giữ mạng từ Passive READY_SLEEP", run() { api_ComM_RequestComMode(0, "FULL_COM"); } },
      { label: "🧪 Kích ComM_EcuM_PNCWakeUpIndication(16) (SWS_ComM_01064)", run() { api_ComM_EcuM_PNCWakeUpIndication(16); } }
    ]
  },
  {
    id: "S7",
    group: "Nhóm 2: NM Variants & Wakeup",
    title: "S7: Passive (PASSIVE) & Slave Variants (SLAVE_ACTIVE / SLAVE_PASSIVE)",
    summary: "Kênh PASSIVE không phát Nm_NetworkRequest(), luôn đi qua NETWORK_REQUESTED (Nm_PassiveStartUp) vào READY_SLEEP (SWS_ComM_00915). Kênh SLAVE_ACTIVE/PASSIVE đợi BusSM_BusSleepMode (SWS_ComM_01018).",
    setup() {
      applyPresetBase({ ComMNmVariant: "PASSIVE", ComMCommunicationAllowedFlag: true, SimulateBusSmIndicationDelay: 0 });
      simState.stepExplain = "Bước 0: Ch0 mang biến thể ComMNmVariant = PASSIVE. Chỉ bus bên ngoài mới đánh thức được kênh sang READY_SLEEP.";
    },
    steps: [
      {
        title: "SWC User 0 thử gọi ComM_RequestComMode(0, FULL_COM)",
        desc: "Vì kênh PASSIVE (SWS_ComM_00667), ComM KHÔNG chuyển lên FULL_COM_NETWORK_REQUESTED và KHÔNG gọi Nm_NetworkRequest()! Bus tiếp tục giữ NO_COM.",
        exec() { api_ComM_RequestComMode(0, "FULL_COM"); }
      },
      {
        title: "Bus có gói NM tới -> ComM_Nm_NetworkStartIndication(0)",
        desc: "Passive Wakeup thành công! Kênh PASSIVE gọi Nm_PassiveStartUp() khi quá cảnh NETWORK_REQUESTED rồi vào COMM_FULL_COM_READY_SLEEP (SWS_ComM_00915).",
        exec() { api_ComM_Nm_NetworkStartIndication(0); }
      },
      {
        title: "ECU Master tắt mạng -> PrepareBusSleep -> BusSleep",
        desc: "CanNm gọi PrepareBusSleep (SILENT_COM) rồi BusSleepMode (NO_COM).",
        exec() { stepClockTick(100); api_ComM_Nm_PrepareBusSleepMode(0); stepClockTick(200); api_ComM_Nm_BusSleepMode(0); }
      }
    ],
    whatIfs: [
      { label: "🧪 Chuyển ComMNmVariant về FULL để User 0 tự đánh thức ngay", run() { ecucConfig.ComMNmVariant = "FULL"; syncConfigToDOM(); runArbitrationCycle(0); } },
      { label: "🧪 Thử gọi DCM ActiveDiagnostic trên kênh PASSIVE (bị bỏ qua theo SWS)", run() { api_ComM_DCM_ActiveDiagnostic(0, true); } },
      { label: "🧪 Thử SLAVE_ACTIVE (LIN): User 0 bật/tắt rồi LinSM gọi BusSleepMode (SWS_ComM_01018)", run() { ecucConfig.ComMNmVariant = "SLAVE_ACTIVE"; ecucConfig.ComMBusType = "COMM_BUS_TYPE_LIN"; syncConfigToDOM(); api_ComM_RequestComMode(0, "FULL_COM"); api_ComM_RequestComMode(0, "NO_COM"); api_ComM_BusSM_BusSleepMode(0); } }
    ]
  },

  // -------------------- GROUP 3 --------------------
  {
    id: "S8",
    group: "Nhóm 3: Mode Inhibition & DCM",
    title: "S8: Wake-Up Inhibition (NoWakeup), Retained Request & InhibitCounter",
    summary: "PreventWakeUp (Bit 0) cấm User đánh thức từ NO_COM/SILENT_COM (trả COMM_E_MODE_LIMITATION), nhưng VẪN LƯU lại User Request (SWS_ComM_00839) để tự bật ngay khi gỡ ức chế (hoặc không chặn khi đã FULL_COM, SWS_ComM_00219).",
    setup() {
      applyPresetBase({ ComMWakeupInhibitionEnabled: true, ComMNoWakeUpInhibitionNvmStorage: true, ComMCommunicationAllowedFlag: true, ComMEcuGroupClassification: "0x03", SimulateBusSmIndicationDelay: 0 });
      simState.stepExplain = "Bước 0: Kênh Ch0 đang ngủ NO_COM, EcuGroupClassification = 0x03 (cho phép NoWakeup & LimitToNoCom).";
    },
    steps: [
      {
        title: "BswM gọi ComM_PreventWakeUp(0, TRUE)",
        desc: "Thanh B Bit 0 (CH_NW) bật lên 1 (0x01 của ComM_InhibitionStatusType). NvM đánh dấu lưu cờ ComMNoWakeup (ECUC_ComM_00789).",
        exec() { api_ComM_PreventWakeUp(0, true); }
      },
      {
        title: "User 0 gọi RequestComMode(0, FULL_COM) -> COMM_E_MODE_LIMITATION",
        desc: "Trả COMM_E_MODE_LIMITATION (SWS_ComM_91027), tăng InhibitCounter = 1, NHƯNG yêu cầu User 0 VẪN ĐƯỢC LƯU LẠI theo SWS_ComM_00839!",
        exec() { api_ComM_RequestComMode(0, "FULL_COM"); }
      },
      {
        title: "Gỡ ComM_PreventWakeUp(0, FALSE) -> User 0 TỰ ĐỘNG ĐÁNH THỨC!",
        desc: "Theo SWS_ComM_00839, vì yêu cầu cũ của User 0 vẫn được lưu, vừa tắt PreventWakeUp là Ch0 bật ngay FULL_COM_NETWORK_REQUESTED!",
        exec() { api_ComM_PreventWakeUp(0, false); }
      },
      {
        title: "Khi đã ở FULL_COM: bật lại PreventWakeUp(TRUE) & User 1 xin mạng (SWS_ComM_00219)",
        desc: "Theo SWS_ComM_00219, PreventWakeUp KHÔNG chặn request mới nếu kênh ĐÃ ở FULL_COM (E_OK, InhibitCounter không tăng thêm)!",
        exec() { api_ComM_PreventWakeUp(0, true); api_ComM_RequestComMode(1, "FULL_COM"); }
      }
    ],
    whatIfs: [
      { label: "🧪 Reset bộ đếm qua ComM_ResetInhibitCounter()", run() { api_ComM_ResetInhibitCounter(); } },
      { label: "🧪 Về NO_COM với PreventWakeUp=TRUE rồi thử Passive Wakeup (vẫn thức!)", run() { api_ComM_RequestComMode(0, "NO_COM"); api_ComM_RequestComMode(1, "NO_COM"); api_ComM_Nm_PrepareBusSleepMode(0); api_ComM_Nm_BusSleepMode(0); api_ComM_EcuM_WakeUpIndication(0); } },
      { label: "🧪 Classification = 0x02 rồi gọi PreventWakeUp(TRUE) -> bị E_NOT_OK (SWS_ComM_01102)", run() { api_ComM_SetECUGroupClassification("0x02"); syncConfigToDOM(); api_ComM_PreventWakeUp(0, true); } }
    ]
  },
  {
    id: "S9",
    group: "Nhóm 3: Mode Inhibition & DCM",
    title: "S9: Limit To NO_COM (Xóa User Req & Hủy TMin) + Classification Guard",
    summary: "LimitToNoCom hủy ngay TMinFull (SWS_ComM_00890), XÓA toàn bộ yêu cầu User về NO_COM (SWS_ComM_00582), trả COMM_E_MODE_LIMITATION cho request mới, và Classification kiểm soát quyền gọi API (SWS_ComM_01103).",
    setup() {
      applyPresetBase({ ComMNmVariant: "FULL", ComMModeLimitationEnabled: true, ComMCommunicationAllowedFlag: true, ComMEcuGroupClassification: "0x03", SimulateBusSmIndicationDelay: 0 });
      api_ComM_RequestComMode(0, "FULL_COM");
      simState.stepExplain = "Bước 0: User 0 đang hoạt động ổn định trong FULL_COM_NETWORK_REQUESTED. Mặt nạ Classification = 0x03.";
    },
    steps: [
      {
        title: "Gọi ComM_LimitChannelToNoComMode(0, TRUE)",
        desc: "Bit 1 (CH_LIM = 0x02) bật! Hủy ngay TMinFull (SWS_ComM_00890), XÓA yêu cầu của User 0 về NO_COM (SWS_ComM_00582) và gọi Nm_NetworkRelease(0)!",
        exec() { api_ComM_LimitChannelToNoComMode(0, true); }
      },
      {
        title: "Ngủ xuống NO_COM & User 0 thử xin lại -> COMM_E_MODE_LIMITATION",
        desc: "CanNm ngủ -> Ch0 về NO_COM. User 0 xin FULL_COM bị từ chối với COMM_E_MODE_LIMITATION, InhibitCounter = 1, KHÔNG lưu yêu cầu (SWS_ComM_00215).",
        exec() { stepClockTick(100); api_ComM_Nm_PrepareBusSleepMode(0); stepClockTick(200); api_ComM_Nm_BusSleepMode(0); api_ComM_RequestComMode(0, "FULL_COM"); }
      },
      {
        title: "Đổi Classification = 0x01 rồi gọi LimitChannel(0, FALSE) -> E_NOT_OK!",
        desc: "Theo SWS_ComM_01103: Tắt Bit 1 trong Classification khiến lời gọi API LimitChannelToNoComMode() trả E_NOT_OK; nhưng cờ ức chế bật trước đó VẪN CÒN HIỆU LỰC!",
        exec() { api_ComM_SetECUGroupClassification("0x01"); syncConfigToDOM(); api_ComM_LimitChannelToNoComMode(0, false); }
      },
      {
        title: "Mở lại Classification = 0x03 -> Gỡ LimitChannel(0, FALSE) thành công",
        desc: "Lệnh gỡ thành công! Lưu ý: Ch0 VẪN Ở NO_COM vì yêu cầu User 0 trước đó đã bị xóa sạch theo SWS_ComM_00582 (SWC phải tự xin lại nếu cần).",
        exec() { api_ComM_SetECUGroupClassification("0x03"); syncConfigToDOM(); api_ComM_LimitChannelToNoComMode(0, false); }
      }
    ],
    whatIfs: [
      { label: "🧪 SWC User 0 gọi lại FULL_COM sau khi gỡ Limit (thành công!)", run() { api_ComM_RequestComMode(0, "FULL_COM"); } },
      { label: "🧪 Kích ComM_LimitECUToNoComMode(TRUE) tắt toàn ECU", run() { api_ComM_LimitECUToNoComMode(true); syncConfigToDOM(); } },
      { label: "🧪 Gọi DCM ActiveDiagnostic đè lên LimitToNoCom", run() { api_ComM_DCM_ActiveDiagnostic(0, true); } }
    ]
  },
  {
    id: "S10",
    group: "Nhóm 3: Mode Inhibition & DCM",
    title: "S10: DCM ActiveDiagnostic Override Bỏ Qua Mọi Mode Inhibition",
    summary: "Quyền ưu tiên tối cao của chẩn đoán UDS: ComM_DCM_ActiveDiagnostic() xuyên thủng cả PreventWakeUp lẫn LimitChannelToNoComMode / LimitECUToNoComMode (SWS_ComM_00873 / 00866).",
    setup() {
      applyPresetBase({
        ComMModeLimitationEnabled: true,
        ComMWakeupInhibitionEnabled: true,
        ComMCommunicationAllowedFlag: true,
        ComMNoWakeup: true,
        ComMNoCom: true,
        GlobalLimitEcuToNoCom: true,
        ComMEcuGroupClassification: "0x03",
        SimulateBusSmIndicationDelay: 0
      });
      simState.stepExplain = "Bước 0: ECU đang bị KHÓA CỨNG bởi cả 3 tầng ức chế (PreventWakeUp + LimitChannel + LimitECUToNoCom). Ch0 bị giam ở NO_COM.";
    },
    steps: [
      {
        title: "User 0 thử xin FULL_COM -> Bị chặn hoàn toàn (InhibitCounter = 1)",
        desc: "Yêu cầu từ SWC bình thường bất lực trước hàng rào Inhibition.",
        exec() { api_ComM_RequestComMode(0, "FULL_COM"); }
      },
      {
        title: "Máy chẩn đoán gửi UDS -> DCM gọi ComM_DCM_ActiveDiagnostic(0)",
        desc: "Bit 6 Thanh A (DCM_DIAG) bật sáng! ComM lập tức bỏ qua mọi Mode Inhibition và bật Ch0 lên COMM_FULL_COM_NETWORK_REQUESTED!",
        exec() { api_ComM_DCM_ActiveDiagnostic(0, true); }
      },
      {
        title: "Tick +20ms — Kênh hoạt động trơn tru phục vụ UDS Flashing/DTC",
        desc: "CanSM và CanNm duy trì truyền thông chẩn đoán ổn định bất chấp Bit 0, Bit 1, Bit 3 Thanh B đều đang đỏ.",
        exec() { stepClockTick(20); }
      },
      {
        title: "Hết phiên S3 -> DCM gọi ComM_DCM_InactiveDiagnostic(0)",
        desc: "Quyền tối cao rút lui -> Lệnh LimitToNoCom lập tức giành lại quyền kiểm soát, cưỡng bức Ch0 nhả mạng về READY_SLEEP để đi ngủ!",
        exec() { api_ComM_DCM_InactiveDiagnostic(0, false); }
      }
    ],
    whatIfs: [
      { label: "🧪 Cho CanNm ngủ ngay sau khi DCM Inactive", run() { api_ComM_Nm_PrepareBusSleepMode(0); api_ComM_Nm_BusSleepMode(0); } },
      { label: "🧪 Bật lại DCM ActiveDiagnostic đột xuất", run() { api_ComM_DCM_ActiveDiagnostic(0, true); } },
      { label: "🧪 Tắt hết Inhibition trong khi DCM đang chạy", run() { api_ComM_PreventWakeUp(0, false); api_ComM_LimitChannelToNoComMode(0, false); api_ComM_LimitECUToNoComMode(false); syncConfigToDOM(); } }
    ]
  },

  // -------------------- GROUP 4 --------------------
  {
    id: "S11",
    group: "Nhóm 4: Partial Networking & DET",
    title: "S11: PNC Request Internal User (MainFunction SWS_ComM_00978) & Nm_UpdateIRA",
    summary: "User 2 map vào PNC #16. Theo SWS_ComM_00978, chuyển pha PNC từ RequestComMode chạy trong ComM_MainFunction, cập nhật trực tiếp Nm_UpdateIRA (SWS_ComM_01062) và khi thoát REQUESTED luôn qua READY_SLEEP trước (SWS_ComM_00938).",
    setup() {
      applyPresetBase({ ComMPncSupport: true, ComMCommunicationAllowedFlag: true, ComMPncPrepareSleepTimer: 400, ComMPncNmRequest: true, SimulateBusSmIndicationDelay: 0 });
      simState.stepExplain = "Bước 0: Partial Networking bật. PNC #16 (Bit 0 = 0x01 tại Byte 2) map tới User 2, Ch0 và Ch1.";
    },
    steps: [
      {
        title: "User 2 gọi ComM_RequestComMode(2, FULL_COM) [Ghi nhận chờ MainFn]",
        desc: "SWS_ComM_00978: ComM_RequestComMode chỉ lưu nhu cầu của User 2 — máy trạng thái PNC CHƯA chuyển ngay cho đến chu kỳ ComM_MainFunction() kế tiếp!",
        exec() { api_ComM_RequestComMode(2, "FULL_COM"); }
      },
      {
        title: "Tick +20ms MainFunction -> PNC #16 vào REQUESTED & gọi Nm_UpdateIRA()",
        desc: "Trong MainFunction: PNC #16 chuyển COMM_PNC_REQUESTED, gọi Nm_UpdateIRA(Ch0/Ch1, 0x01) xuống NmIf, đánh thức cả Ch0 & Ch1 (SWS_ComM_01069)!",
        exec() { stepClockTick(20); }
      },
      {
        title: "User 2 release NO_COM + Tick +20ms -> Qua READY_SLEEP rồi PREPARE_SLEEP",
        desc: "Trong MainFunction: PNC #16 rời REQUESTED -> LUÔN qua PNC_READY_SLEEP trước (Nm_UpdateIRA=0 & nhả kênh, SWS_ComM_00938), và vì Rx EIRA=0 -> sang PREPARE_SLEEP chạy 400ms!",
        exec() { api_ComM_RequestComMode(2, "NO_COM"); stepClockTick(20); }
      },
      {
        title: "Tua hết 400ms PncPrepareSleepTimer -> PNC #16 tắt hẳn",
        desc: "Timer chạm 0 -> PNC #16 về COMM_PNC_NO_COMMUNICATION, báo BswM tắt I-PDU Group của PNC #16.",
        exec() { stepClockTick(400); }
      }
    ],
    whatIfs: [
      { label: "🧪 Trong lúc PREPARE_SLEEP, NmIf báo ComM_Nm_UpdateEIRA(01 00)!", run() { api_ComM_Nm_UpdateEIRA(0x01, 0x00); } },
      { label: "🧪 Tắt ComMPncSupport = FALSE để thấy PNC bị vô hiệu", run() { ecucConfig.ComMPncSupport = false; syncConfigToDOM(); runArbitrationCycle(0); } },
      { label: "🧪 Bật lại User 2 xin PNC #16 (+20ms Tick để kích hoạt)", run() { api_ComM_RequestComMode(2, "FULL_COM"); stepClockTick(20); } }
    ]
  },
  {
    id: "S12",
    group: "Nhóm 4: Partial Networking & DET",
    title: "S12: Nhận Rx EIRA Từ NmIf (ComM_Nm_UpdateEIRA) & PNC Prepare Sleep",
    summary: "Luồng nhận PNC từ mạng ngoài qua NmIf callback ComM_Nm_UpdateEIRA() (SWS_ComM_01060): ECU giữ PNC ở COMM_PNC_READY_SLEEP (Tx IRA = 0x00) và đếm PrepareSleepTimer khi EIRA về 0.",
    setup() {
      applyPresetBase({ ComMPncSupport: true, ComMCommunicationAllowedFlag: true, ComMPncPrepareSleepTimer: 400, SimulateBusSmIndicationDelay: 0 });
      simState.stepExplain = "Bước 0: ECU đang ngủ. Đang chờ gói NM chứa bit PNC #16 = 1 từ ECU Master khác trên bus.";
    },
    steps: [
      {
        title: "NM Wakeup & NmIf gọi ComM_Nm_UpdateEIRA(01 00)",
        desc: "Bus thức (READY_SLEEP) & NmIf báo EIRA Bit 0 = 0x01 qua ComM_Nm_UpdateEIRA() (SWS_ComM_01060). PNC #16 lên COMM_PNC_READY_SLEEP (Tx IRA vẫn 0x00).",
        exec() { api_ComM_Nm_NetworkStartIndication(0); api_ComM_Nm_UpdateEIRA(0x01, 0x00); }
      },
      {
        title: "ECU giữ PNC_READY_SLEEP (BswM mở I-PDU cụm PNC #16)",
        desc: "Các ECU trong cụm PNC #16 trao đổi dữ liệu bình thường; BusNm tự giữ mạng vì vẫn nhận được khung NM có bit PNC = 1.",
        exec() { stepClockTick(60); }
      },
      {
        title: "ECU Master nhả PNC #16 -> NmIf gọi ComM_Nm_UpdateEIRA(00 00)",
        desc: "Bit 0 trong Rx EIRA về 0 -> PNC #16 chuyển COMM_PNC_PREPARE_SLEEP và khởi chạy PncPrepareSleepTimer = 400ms (SWS_ComM_00952).",
        exec() { api_ComM_Nm_UpdateEIRA(0x00, 0x00); }
      },
      {
        title: "Tick +200ms (Timer còn 200ms — chống chập chờn gói NM)",
        desc: "PNC vẫn giữ trạng thái chuẩn bị ngủ trong cửa sổ 400ms để đón nếu có gói NM trễ.",
        exec() { stepClockTick(200); }
      },
      {
        title: "Tick +200ms — Timer hết hạn -> PNC về NO_COMMUNICATION",
        desc: "Hết 400ms -> PNC #16 xuống PNC_NO_COM, báo BswM tắt I-PDU Group cụm PNC #16.",
        exec() { stepClockTick(200); }
      }
    ],
    whatIfs: [
      { label: "🧪 Khi đang PREPARE_SLEEP, User 2 giành lại PNC_REQUESTED (+20ms Tick)", run() { api_ComM_RequestComMode(2, "FULL_COM"); stepClockTick(20); } },
      { label: "🧪 Đổi PncPrepareSleepTimer lên 800ms", run() { ecucConfig.ComMPncPrepareSleepTimer = 800; syncConfigToDOM(); } },
      { label: "🧪 NmIf báo Rx EIRA bật cả PNC #16 & #18 (05 00)", run() { api_ComM_Nm_UpdateEIRA(0x05, 0x00); } }
    ]
  },
  {
    id: "S13",
    group: "Nhóm 4: Partial Networking & DET",
    title: "S13: PNC Gateway (ComM_Nm_UpdateERA → Nm_UpdateIRA) & Sync Shutdown",
    summary: "Central Gateway định tuyến ERA qua NmIf (SWS_ComM_01061 / 01072): Ch0 (ACTIVE) -> Ch1 (PASSIVE), tính Tx IRA riêng từng kênh qua Nm_UpdateIRA() và kích hoạt Synchronized PNC Shutdown khi release.",
    setup() {
      applyPresetBase({
        ComMPncSupport: true,
        ComMPncGatewayEnabled: true,
        ComMCommunicationAllowedFlag: true,
        Ch0_GatewayType: "COMM_GATEWAY_TYPE_ACTIVE",
        Ch1_GatewayType: "COMM_GATEWAY_TYPE_PASSIVE",
        ComMPncPrepareSleepTimer: 300,
        ComMSynchronizedPncShutdownEnabled: true,
        SimulateBusSmIndicationDelay: 0
      });
      simState.stepExplain = "Bước 0: PNC Gateway BẬT. Ch0 = ACTIVE GW, Ch1 = PASSIVE GW. Synchronized PNC Shutdown = TRUE.";
    },
    steps: [
      {
        title: "NmIf Ch0 (ACTIVE) báo ComM_Nm_UpdateERA(Ch0, 04 00)",
        desc: "Bit 2 (0x04 = PNC #18) bật trên Rx ERA Ch0 (SWS_ComM_01061). Gateway định tuyến hợp lệ sang Ch1 (PASSIVE), gọi Nm_UpdateIRA(Ch1, 0x04) (SWS_ComM_01062/01072)!",
        exec() { api_ComM_Nm_UpdateERA(0, 0x04, 0x00); }
      },
      {
        title: "Tick +40ms — Ch0 & Ch1 truyền thông hợp nhất cụm PNC #18",
        desc: "Cả Ch0 và Ch1 ổn định ở FULL_COM_NETWORK_REQUESTED; Ch1 chủ động giữ cụm PNC #18 qua Tx IRA Ch1 = 0x04.",
        exec() { stepClockTick(40); }
      },
      {
        title: "Ngừng nhận ERA từ Ch0 -> READY_SLEEP & Synchronized PNC Shutdown!",
        desc: "RxEraCh0 về 00 -> PNC #18 rời REQUESTED sang READY_SLEEP (Nm_UpdateIRA=0), Top-Level gọi ngay Nm_RequestSynchronizedPncShutdown (SWS_ComM_01083) rồi chạy timer 300ms!",
        exec() { api_ComM_Nm_UpdateERA(0, 0x00, 0x00); }
      },
      {
        title: "Hết 300ms PncPrepareSleepTimer -> PNC #18 về NO_COM",
        desc: "Hoàn tất chu kỳ tắt đồng bộ PNC #18.",
        exec() { stepClockTick(300); }
      }
    ],
    whatIfs: [
      { label: "🧪 Kiểm chứng chống Loop: Cả Ch0 & Ch1 PASSIVE rồi nhận UpdateERA(0)", run() { ecucConfig.Ch0_GatewayType = "COMM_GATEWAY_TYPE_PASSIVE"; ecucConfig.Ch1_GatewayType = "COMM_GATEWAY_TYPE_PASSIVE"; syncConfigToDOM(); api_ComM_Nm_UpdateERA(0, 0x04, 0x00); } },
      { label: "🧪 Intermediate GW: Nhận ForwardSyncShutdown(Ch0, PNC18) -> PASSIVE Ch1 (SWS_ComM_01082)", run() { ecucConfig.Ch0_GatewayType = "COMM_GATEWAY_TYPE_ACTIVE"; ecucConfig.Ch1_GatewayType = "COMM_GATEWAY_TYPE_PASSIVE"; syncConfigToDOM(); api_ComM_Nm_ForwardSynchronizedPncShutdown(0, 18); } },
      { label: "🧪 Nhận ERA từ Ch1 (PASSIVE) -> định tuyến sang Ch0 (ACTIVE)", run() { ecucConfig.Ch0_GatewayType = "COMM_GATEWAY_TYPE_ACTIVE"; ecucConfig.Ch1_GatewayType = "COMM_GATEWAY_TYPE_PASSIVE"; syncConfigToDOM(); api_ComM_Nm_UpdateERA(1, 0x04, 0x00); } }
    ]
  },
  {
    id: "S14",
    group: "Nhóm 4: Partial Networking & DET",
    title: "S14: Bẫy DET Errors, Bảo Vệ ComM_DeInit() & BusSM Timeout Lock",
    summary: "Thực hành các lỗi tích hợp thực tế: gọi API khi COMM_UNINIT (0x01), truyền sai tham số (0x02), cố gọi ComM_DeInit() khi kênh đang FULL_COM (bị chặn theo SWS_ComM_00794) và trễ xác nhận BusSM.",
    setup() {
      applyPresetBase({ ComMInitialized: false, ComMDevErrorDetect: true, ComMCommunicationAllowedFlag: false, SimulateBusSmIndicationDelay: 2000 });
      forceUninitPrecondition("Tiền điều kiện: ComM chưa Init (COMM_UNINIT) và BusSM Delay = 2000ms.");
      simState.stepExplain = "Bước 0: Bật ComMDevErrorDetect = TRUE nhưng đang COMM_UNINIT và đặt BusSM Delay = 2000ms để bẫy treo bắt tay.";
    },
    steps: [
      {
        title: "Bẫy 1: Gọi ComM_RequestComMode() khi đang COMM_UNINIT",
        desc: "DET lập tức bắt lỗi COMM_E_UNINIT (0x01) và nhấp nháy khối DET trên sơ đồ kiến trúc!",
        exec() { api_ComM_RequestComMode(0, "FULL_COM"); }
      },
      {
        title: "Bẫy 2: Init ComM rồi truyền sai tham số UserId = 99",
        desc: "DET bắt lỗi COMM_E_WRONG_PARAMETERS (0x02) vì UserId vượt quá danh sách cấu hình.",
        exec() { api_ComM_Init(true); api_ComM_CommunicationAllowed(0, true); api_ComM_RequestComMode(99, "FULL_COM"); }
      },
      {
        title: "Bẫy 3: BusSM kẹt Confirm (2000ms) -> User treo ở NO_COM & DeInit bị chặn!",
        desc: "User 0 gọi FULL_COM -> gọi thử ComM_DeInit() lập tức BỊ TỪ CHỐI vì Ch0 chưa về NO_COM_NO_PENDING_REQUEST (SWS_ComM_00794)!",
        exec() { api_ComM_RequestComMode(0, "FULL_COM"); api_ComM_DeInit(); stepClockTick(100); }
      },
      {
        title: "Sau +1900ms — BusSM thoát kẹt gửi ModeIndication(FULL_COM)",
        desc: "Bit 1 BUSSM bật 1 -> Hệ thống tự hồi phục, SWC nhận Rte_Switch(FULL_COM).",
        exec() { stepClockTick(1900); }
      }
    ],
    whatIfs: [
      { label: "🧪 Thử tắt ComMDevErrorDetect = FALSE rồi gọi UserId=99", run() { ecucConfig.ComMDevErrorDetect = false; syncConfigToDOM(); api_ComM_RequestComMode(99, "FULL_COM"); } },
      { label: "🧪 Gây lỗi sai ComMode='INVALID'", run() { api_ComM_RequestComMode(0, "INVALID"); } },
      { label: "🧪 Bật Gateway nhưng quên bật ComMPncSupport (Validator)", run() { ecucConfig.ComMPncSupport = false; ecucConfig.ComMPncGatewayEnabled = true; syncConfigToDOM(); renderAll(); } }
    ]
  }
];
