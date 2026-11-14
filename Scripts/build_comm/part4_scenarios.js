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
    summary: "Minh họa chu trình khởi tạo ComM từ COMM_UNINIT, tình huống SWC xin mạng sớm bị giữ ở NO_COM_REQUEST_PENDING và khoảnh khắc EcuM mở Gatekeeper CommunicationAllowed.",
    setup() {
      applyPresetBase({ ComMInitialized: false, ComMCommunicationAllowedFlag: false });
      simState.stepExplain = "Bước 0 (Tiền điều kiện): ECU vừa cấp nguồn. ComM chưa gọi ComM_Init() (COMM_UNINIT, Bit 7 Thanh B = 0) và Gatekeeper CommunicationAllowed = FALSE.";
      addTraceLog("info", "Power-On Reset", "ECU khởi động, ComM đang ở trạng thái COMM_UNINIT");
    },
    steps: [
      {
        title: "EcuM gọi ComM_Init(&ComM_Config)",
        desc: "Khởi tạo toàn bộ cấu trúc nội bộ ComM, đọc NvM và đưa kênh Ch0/Ch1 vào NO_COM_NO_PENDING_REQUEST (Bit 7 Thanh B bật 1).",
        exec() { api_ComM_Init(true); }
      },
      {
        title: "SWC User 0 gọi ComM_RequestComMode(0, FULL_COM) sớm",
        desc: "User 0 xin mạng ngay khi ECU đang Startup One. Vì CommunicationAllowed = FALSE, ComM KHÔNG được bật BusSM mà giữ yêu cầu ở COMM_NO_COM_REQUEST_PENDING (Bit 5 Thanh A = 1).",
        exec() { api_ComM_RequestComMode(0, "FULL_COM"); }
      },
      {
        title: "EcuM/BswM mở Gatekeeper ComM_CommunicationAllowed(0, TRUE)",
        desc: "Transceiver & nguồn đã ổn định. Gatekeeper mở khóa (Bit 4 Thanh A COMM_ALLOW = 1).",
        exec() { api_ComM_CommunicationAllowed(0, true); }
      },
      {
        title: "Tick +20ms MainFunction — Kênh Ch0 bứt chốt vào FULL_COM",
        desc: "ComM xác nhận BusSM_ModeIndication(FULL_COM) và cập nhật User 0 lên FULL_COM.",
        exec() { stepClockTick(20); }
      }
    ],
    whatIfs: [
      { label: "🧪 Thử khóa lại CommunicationAllowed(FALSE) và gọi User 1", run() { api_ComM_CommunicationAllowed(0, false); api_ComM_RequestComMode(1, "FULL_COM"); } },
      { label: "🧪 Giả lập gọi RequestComMode khi vẫn COMM_UNINIT", run() { api_ComM_Init(false); api_ComM_RequestComMode(0, "FULL_COM"); } },
      { label: "🧪 Tăng BusSM Delay = 100ms để xem trạng thái chờ Confirm", run() { ecucConfig.SimulateBusSmIndicationDelay = 100; syncConfigToDOM(); api_ComM_RequestComMode(0, "FULL_COM"); } }
    ]
  },
  {
    id: "S2",
    group: "Nhóm 1: Khởi Động & Phân Xử",
    title: "S2: Single User Request FULL_COM & Bắt Tay BusSM / Nm (FULL)",
    summary: "Theo dõi giao thức bắt tay bất đồng bộ giữa ComM ↔ CanSM (BusSM) ↔ CanNm. Chỉ khi nhận BusSM_ModeIndication() thì Rte_Switch/BswM mới báo User thực sự đạt FULL_COM.",
    setup() {
      applyPresetBase({ ComMNmVariant: "FULL", SimulateBusSmIndicationDelay: 40 });
      simState.stepExplain = "Bước 0: Kênh Ch0 ở NO_COM (Variant=FULL). SimulateBusSmIndicationDelay được đặt 40ms để quan sát rõ pha chờ CanSM.";
    },
    steps: [
      {
        title: "User 0 gọi ComM_RequestComMode(0, COMM_FULL_COMMUNICATION)",
        desc: "Ch0 nhảy vào FULL_COM_NETWORK_REQUESTED, ComM gọi BusSM_RequestComMode(0, FULL) và Nm_NetworkRequest(0). Chú ý: Bit 1 BUSSM vẫn bằng 0 và User 0 currentMode vẫn là NO_COM!",
        exec() { api_ComM_RequestComMode(0, "FULL_COM"); }
      },
      {
        title: "Tick +20ms (CanSM đang bật Transceiver / Controller)",
        desc: "Delay còn 20ms; ComM vẫn đợi callback từ CanSM trước khi mở khóa SWC gửi tín hiệu.",
        exec() { stepClockTick(20); }
      },
      {
        title: "Tick +20ms — CanSM gọi ComM_BusSM_ModeIndication(0, FULL_COM)",
        desc: "Bit 1 BUSSM bật lên 1! ComM lập tức phát BswM_ComM_CurrentMode(FULL_COM) và Rte_Switch tới SWC User 0.",
        exec() { stepClockTick(20); }
      }
    ],
    whatIfs: [
      { label: "🧪 Cho BusSM xác nhận tức thì (Delay = 0ms)", run() { ecucConfig.SimulateBusSmIndicationDelay = 0; syncConfigToDOM(); api_ComM_RequestComMode(0, "FULL_COM"); } },
      { label: "🧪 User 0 Release ngay tại đây", run() { api_ComM_RequestComMode(0, "NO_COM"); } },
      { label: "🧪 Kéo BusSM Delay lên 200ms để giả lập bus nghẽn", run() { ecucConfig.SimulateBusSmIndicationDelay = 200; syncConfigToDOM(); simState.channels[0].mode = "COMM_NO_COMMUNICATION"; api_ComM_RequestComMode(0, "FULL_COM"); } }
    ]
  },
  {
    id: "S3",
    group: "Nhóm 1: Khởi Động & Phân Xử",
    title: "S3: Multi-User Arbitration & Ràng Buộc Thời Gian TMinFullComMode",
    summary: "Phân xử OR logic giữa User 0 và User 1: chỉ cần 1 User còn giữ yêu cầu thì kênh vẫn ở FULL_COM; khi cả 2 nhả sớm, timer TMinFullComModeDuration (500ms) vẫn giữ NETWORK_REQUESTED.",
    setup() {
      applyPresetBase({ ComMNmVariant: "LIGHT", ComMTMinFullComModeDuration: 500, ComMNmLightTimeout: 1000, SimulateBusSmIndicationDelay: 0 });
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
      { label: "🧪 Chuyển Variant sang FULL (không dùng TMinFull cho FULL)", run() { ecucConfig.ComMNmVariant = "FULL"; syncConfigToDOM(); runArbitrationCycle(0); } }
    ]
  },
  {
    id: "S4",
    group: "Nhóm 1: Khởi Động & Phân Xử",
    title: "S4: Release Toàn Bộ User — Graceful Shutdown (FULL → SILENT → NO_COM)",
    summary: "Quy trình ngủ mạng êm dịu (Graceful Shutdown) chuẩn AUTOSAR biến thể FULL thông qua callback đồng bộ với CanNm.",
    setup() {
      applyPresetBase({ ComMNmVariant: "FULL", SimulateBusSmIndicationDelay: 0 });
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
        desc: "Sau khi hết NmTimeout trên bus, CanNm vào PrepareBusSleep. ComM đưa Ch0 xuống COMM_SILENT_COMMUNICATION (tắt Tx, giữ Rx).",
        exec() { stepClockTick(200); api_ComM_Nm_PrepareBusSleepMode(0); }
      },
      {
        title: "CanNm hết WaitBusSleepTime -> gọi ComM_Nm_BusSleepMode(0)",
        desc: "ComM gọi BusSM_RequestComMode(0, NO_COM), BswM tắt toàn bộ I-PDU Group. Ch0 về dứt điểm COMM_NO_COMMUNICATION.",
        exec() { stepClockTick(500); api_ComM_Nm_BusSleepMode(0); }
      }
    ],
    whatIfs: [
      { label: "🧪 Đang ở SILENT_COM: User 0 xin FULL_COM đột xuất!", run() { api_ComM_RequestComMode(0, "FULL_COM"); } },
      { label: "🧪 Đang ở SILENT_COM: Mạng ngoài phát NM đánh thức lại", run() { api_ComM_Nm_NetworkStartIndication(0); } },
      { label: "🧪 Bật PreventWakeUp rồi thử xin FULL_COM khi đang SILENT_COM", run() { api_ComM_PreventWakeUp(0, true); api_ComM_RequestComMode(0, "FULL_COM"); } }
    ]
  },

  // -------------------- GROUP 2 --------------------
  {
    id: "S5",
    group: "Nhóm 2: NM Variants & Wakeup",
    title: "S5: Biến Thể ComMNmVariant = LIGHT & Bộ Đếm NmLightTimeout",
    summary: "Khi ECU dùng bus đơn giản không chạy gói CanNm (hoặc chỉ làm node phụ), biến thể LIGHT tự dùng bộ đếm NmLightTimeout trong READY_SLEEP rồi nhảy thẳng xuống NO_COM.",
    setup() {
      applyPresetBase({ ComMNmVariant: "LIGHT", ComMTMinFullComModeDuration: 100, ComMNmLightTimeout: 1000, SimulateBusSmIndicationDelay: 0 });
      api_ComM_RequestComMode(0, "FULL_COM");
      simState.stepExplain = "Bước 0: Kênh cấu hình ComMNmVariant = LIGHT (NmLightTimeout = 1000ms), đang ở FULL_COM_NETWORK_REQUESTED.";
    },
    steps: [
      {
        title: "User 0 release NO_COM & chờ hết TMinFull (100ms)",
        desc: "Tua qua TMinFull=100ms để kênh chuyển sang COMM_FULL_COM_READY_SLEEP và kích hoạt timer NmLightTimeout = 1000ms.",
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
      { label: "🧪 Đổi ComMNmLightTimeout sang 400ms", run() { ecucConfig.ComMNmLightTimeout = 400; syncConfigToDOM(); runArbitrationCycle(0); } },
      { label: "🧪 Chuyển sang biến thể NONE (bỏ qua luôn READY_SLEEP)", run() { ecucConfig.ComMNmVariant = "NONE"; syncConfigToDOM(); api_ComM_RequestComMode(0, "NO_COM"); } }
    ]
  },
  {
    id: "S6",
    group: "Nhóm 2: NM Variants & Wakeup",
    title: "S6: Passive Wakeup (Rx Network Wakeup) & ComMSynchronousWakeUp",
    summary: "Khi ECU đang ngủ sâu, một xung CAN Wakeup hoặc gói NM từ ECU khác gọi ComM_EcuM_WakeUpIndication(). Nếu ComMSynchronousWakeUp = TRUE, toàn bộ các kênh khác (Ch1) cũng thức đồng loạt.",
    setup() {
      applyPresetBase({ ComMSynchronousWakeUp: true, ComMCommunicationAllowedFlag: false, SimulateBusSmIndicationDelay: 0 });
      simState.stepExplain = "Bước 0: Ch0 và Ch1 đều ngủ sâu (NO_COM_NO_PENDING_REQUEST). ComMSynchronousWakeUp = TRUE, CommunicationAllowed đang đợi ECU Startup = FALSE.";
    },
    steps: [
      {
        title: "CanTrcv đánh thức -> EcuM gọi ComM_EcuM_WakeUpIndication(0)",
        desc: "Bit 2 Thanh B SYNC_WAKEUP bật lên 1! Cả Ch0 và Ch1 cùng chuyển sang COMM_NO_COM_REQUEST_PENDING (Bit 5 WAKEUP_PEND = 1).",
        exec() { api_ComM_EcuM_WakeUpIndication(0); }
      },
      {
        title: "EcuM mở ComM_CommunicationAllowed(0 & 1, TRUE)",
        desc: "Gatekeeper mở -> Cả Ch0 lẫn Ch1 vào COMM_FULL_COM_READY_SLEEP và gọi Nm_PassiveStartUp() (không giữ NETWORK_REQUESTED!).",
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
      { label: "🧪 Bật PreventWakeUp = TRUE rồi kích EcuM_WakeUpIndication(0)", run() { api_ComM_PreventWakeUp(0, true); api_ComM_EcuM_WakeUpIndication(0); } }
    ]
  },
  {
    id: "S7",
    group: "Nhóm 2: NM Variants & Wakeup",
    title: "S7: Passive Channel (ComMNmVariant = PASSIVE) Chỉ Nghe Mạng",
    summary: "ECU/Kênh cấu hình PASSIVE không được phép chủ động gọi Nm_NetworkRequest() hay kéo bus vào NETWORK_REQUESTED ngay cả khi SWC gọi RequestComMode.",
    setup() {
      applyPresetBase({ ComMNmVariant: "PASSIVE", SimulateBusSmIndicationDelay: 0 });
      simState.stepExplain = "Bước 0: Ch0 mang biến thể ComMNmVariant = PASSIVE. Chỉ bus bên ngoài mới đánh thức được kênh sang READY_SLEEP.";
    },
    steps: [
      {
        title: "SWC User 0 thử gọi ComM_RequestComMode(0, FULL_COM)",
        desc: "Vì kênh PASSIVE, ComM KHÔNG chuyển lên FULL_COM_NETWORK_REQUESTED và KHÔNG gọi Nm_NetworkRequest()! Bus tiếp tục giữ NO_COM.",
        exec() { api_ComM_RequestComMode(0, "FULL_COM"); }
      },
      {
        title: "Bus có gói NM tới -> ComM_Nm_NetworkStartIndication(0)",
        desc: "Passive Wakeup thành công! Kênh PASSIVE nhảy vào COMM_FULL_COM_READY_SLEEP (chỉ nghe & gửi Apdu theo bus ngoài).",
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
      { label: "🧪 Thử gọi DCM ActiveDiagnostic trên kênh PASSIVE", run() { api_ComM_DCM_ActiveDiagnostic(0, true); } },
      { label: "🧪 Gửi lại Nm_NetworkStartIndication(0)", run() { api_ComM_Nm_NetworkStartIndication(0); } }
    ]
  },

  // -------------------- GROUP 3 --------------------
  {
    id: "S8",
    group: "Nhóm 3: Mode Inhibition & DCM",
    title: "S8: Wake-Up Inhibition (NoWakeup) & Bộ Đếm ComMInhibitCounter",
    summary: "Chống cạn ắc quy khi xe đỗ: Bit 0 (NoWakeup) cấm mọi SWC User đánh thức bus từ NO_COM/SILENT_COM, ghi nhận số lần từ chối vào ComMInhibitCounter & đánh dấu NvM.",
    setup() {
      applyPresetBase({ ComMWakeupInhibitionEnabled: true, ComMNoWakeupNvMStorage: true, ComMEcuGroupClassification: "0x03", SimulateBusSmIndicationDelay: 0 });
      simState.stepExplain = "Bước 0: Kênh Ch0 đang ngủ NO_COM, EcuGroupClassification = 0x03 (cho phép NoWakeup & LimitToNoCom).";
    },
    steps: [
      {
        title: "BswM gọi ComM_PreventWakeUp(0, TRUE)",
        desc: "Thanh B Bit 0 (CH_NW) bật lên 1 (0x01 của ComM_InhibitionStatusType). NvM lưu cờ ComMNoWakeup.",
        exec() { api_ComM_PreventWakeUp(0, true); }
      },
      {
        title: "User 0 gọi RequestComMode(0, FULL_COM) -> BỊ CHẶN!",
        desc: "Do NoWakeup đang bật, ComM từ chối cấp mạng, tăng InhibitCounter = 1 (Bit 6 INHIB_CNT = 1) và gọi NvM_SetRamBlockStatus(TRUE).",
        exec() { api_ComM_RequestComMode(0, "FULL_COM"); }
      },
      {
        title: "User 1 tiếp tục đòi mạng -> InhibitCounter tăng lên 2",
        desc: "Cả User 0 và User 1 đều không đánh thức được bus đang ngủ.",
        exec() { api_ComM_RequestComMode(1, "FULL_COM"); }
      },
      {
        title: "Xe ngoài cắm tín hiệu wakeup -> EcuM_WakeUpIndication(0)",
        desc: "QUAN TRỌNG: NoWakeup CHỈ cấm SWC nội bộ, KHÔNG chặn Passive Wakeup từ bus ngoài! Kênh Ch0 vẫn vào FULL_COM_READY_SLEEP.",
        exec() { api_ComM_EcuM_WakeUpIndication(0); }
      }
    ],
    whatIfs: [
      { label: "🧪 Reset bộ đếm qua ComM_ResetInhibitCounter()", run() { api_ComM_ResetInhibitCounter(); } },
      { label: "🧪 Tháo khóa ComM_PreventWakeUp(0, FALSE)", run() { api_ComM_PreventWakeUp(0, false); } },
      { label: "🧪 Che mặt nạ Classification = 0x02 (Vô hiệu Bit 0 NoWakeup)", run() { api_ComM_SetECUGroupClassification("0x02"); syncConfigToDOM(); } }
    ]
  },
  {
    id: "S9",
    group: "Nhóm 3: Mode Inhibition & DCM",
    title: "S9: Limit Channel/ECU To NO_COM Mode & Bảng Classification Bit",
    summary: "Cưỡng bức tắt kênh (hoặc toàn ECU) đang truyền xuống NO_COM bất chấp User còn xin FULL_COM, đồng thời minh họa ảnh hưởng của mặt nạ ComMEcuGroupClassification.",
    setup() {
      applyPresetBase({ ComMModeLimitationEnabled: true, ComMEcuGroupClassification: "0x03", SimulateBusSmIndicationDelay: 0 });
      api_ComM_RequestComMode(0, "FULL_COM");
      simState.stepExplain = "Bước 0: User 0 đang hoạt động ổn định trong FULL_COM_NETWORK_REQUESTED. Mặt nạ Classification = 0x03.";
    },
    steps: [
      {
        title: "Gọi ComM_LimitChannelToNoComMode(0, TRUE)",
        desc: "Bit 1 Thanh B (CH_LIM = 0x02) bật! Dù User 0 vẫn giữ FULL_COM, ComM ép Ch0 nhả mạng sang FULL_COM_READY_SLEEP và gọi Nm_NetworkRelease(0).",
        exec() { api_ComM_LimitChannelToNoComMode(0, true); }
      },
      {
        title: "CanNm chuẩn bị ngủ & ngủ hẳn -> Ch0 bị ép xuống NO_COM",
        desc: "PrepareBusSleep (SILENT_COM) -> BusSleepMode -> NO_COM hoàn tất.",
        exec() { stepClockTick(100); api_ComM_Nm_PrepareBusSleepMode(0); stepClockTick(200); api_ComM_Nm_BusSleepMode(0); }
      },
      {
        title: "Đổi ComMEcuGroupClassification = 0x01 (Tắt Bit 1 Mask!)",
        desc: "Vì Bit 1 trong mặt nạ bị xóa = 0, lệnh LimitToNoCom mất hiệu lực ngay! Do User 0 vẫn giữ FULL_COM trong bảng phân xử, Ch0 tự động bật trở lại FULL_COM!",
        exec() { api_ComM_SetECUGroupClassification("0x01"); syncConfigToDOM(); }
      }
    ],
    whatIfs: [
      { label: "🧪 Khôi phục Classification = 0x03 & Kích LimitECUToNoComMode(TRUE)", run() { api_ComM_SetECUGroupClassification("0x03"); api_ComM_LimitECUToNoComMode(true); syncConfigToDOM(); } },
      { label: "🧪 Gọi DCM ActiveDiagnostic đè lên LimitToNoCom", run() { api_ComM_DCM_ActiveDiagnostic(0, true); } },
      { label: "🧪 Thử gỡ bỏ LimitChannel(FALSE)", run() { api_ComM_LimitChannelToNoComMode(0, false); syncConfigToDOM(); } }
    ]
  },
  {
    id: "S10",
    group: "Nhóm 3: Mode Inhibition & DCM",
    title: "S10: DCM ActiveDiagnostic Override Bỏ Qua Mọi Mode Inhibition",
    summary: "Quyền ưu tiên tối cao của chẩn đoán UDS: ComM_DCM_ActiveDiagnostic() xuyên thủng cả PreventWakeUp lẫn LimitChannelToNoComMode / LimitECUToNoComMode.",
    setup() {
      applyPresetBase({
        ComMModeLimitationEnabled: true,
        ComMWakeupInhibitionEnabled: true,
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
    title: "S11: PNC Request Internal User & Truyền PNC Bit Vector Qua COM",
    summary: "User 2 map vào logic PNC #16 (Byte 2 Bit 0 = 0x01). Khi User 2 xin FULL_COM, PNC #16 lên PNC_REQUESTED, bật bit trong TxSignal gửi qua COM và đánh thức cả Ch0 & Ch1.",
    setup() {
      applyPresetBase({ ComMPncSupport: true, ComMPncPrepareSleepTimer: 400, ComMPncNmRequest: true, SimulateBusSmIndicationDelay: 0 });
      simState.stepExplain = "Bước 0: Partial Networking bật. PNC #16 (Bit 0 = 0x01 tại Byte 2) map tới User 2, Ch0 và Ch1.";
    },
    steps: [
      {
        title: "User 2 gọi ComM_RequestComMode(2, FULL_COM)",
        desc: "PNC #16 chuyển COMM_PNC_REQUESTED! Thanh giải phẫu PNC Vector set Bit 0 ở hàng Internal Req & hàng Tx Signal (0x01). ComM gọi Com_SendSignal() & đánh thức cả Ch0 lẫn Ch1!",
        exec() { api_ComM_RequestComMode(2, "FULL_COM"); }
      },
      {
        title: "Tick +40ms — Quan sát BswM bật I-PDU Group theo PNC #16",
        desc: "Ch0 & Ch1 ổn định tại FULL_COM_NETWORK_REQUESTED, Tx Signal giữ bit 0x01 phát trong user data của khung CanNm.",
        exec() { stepClockTick(40); }
      },
      {
        title: "User 2 release NO_COM (trong khi Rx EIRA = 0x00)",
        desc: "Vì không còn yêu cầu nội bộ hay EIRA ngoài, Tx Signal hạ về 0x00, PNC #16 chuyển sang COMM_PNC_PREPARE_SLEEP và chạy timer 400ms (Bit 5 Thanh B = 1).",
        exec() { api_ComM_RequestComMode(2, "NO_COM"); }
      },
      {
        title: "Tua hết 400ms PncPrepareSleepTimer -> PNC #16 tắt hẳn",
        desc: "Timer chạm 0 -> PNC #16 về COMM_PNC_NO_COMMUNICATION, nhả yêu cầu khỏi Ch0 & Ch1.",
        exec() { stepClockTick(400); }
      }
    ],
    whatIfs: [
      { label: "🧪 Trong lúc PNC đang PREPARE_SLEEP, kích Rx EIRA (01 00) từ bus!", run() { api_ComM_COMCbk_RxEira(0x01, 0x00); } },
      { label: "🧪 Tắt ComMPncSupport = FALSE để thấy PNC bị vô hiệu", run() { ecucConfig.ComMPncSupport = false; syncConfigToDOM(); runArbitrationCycle(0); } },
      { label: "🧪 Bật lại User 2 xin PNC #16", run() { api_ComM_RequestComMode(2, "FULL_COM"); } }
    ]
  },
  {
    id: "S12",
    group: "Nhóm 4: Partial Networking & DET",
    title: "S12: Nhận Rx EIRA Từ Bus & Bộ Đếm PNC Prepare Sleep (10-Step Flow)",
    summary: "Luồng nhận PNC từ mạng ngoài qua COM callback ComM_COMCbk_EIRA(): ECU giữ PNC ở PNC_READY_SLEEP mà KHÔNG tự bật Tx Bit, và đếm PrepareSleepTimer khi EIRA mất.",
    setup() {
      applyPresetBase({ ComMPncSupport: true, ComMPncPrepareSleepTimer: 400, SimulateBusSmIndicationDelay: 0 });
      simState.stepExplain = "Bước 0: ECU đang ngủ. Đang chờ gói NM chứa bit PNC #16 = 1 từ một ECU Master khác trên bus.";
    },
    steps: [
      {
        title: "COM nhận NM PDU với PNC #16 = 1 -> gọi ComM_COMCbk_EIRA(01 00)",
        desc: "Hàng Rx EIRA bật Bit 0 (0x01). PNC #16 nhảy sang COMM_PNC_READY_SLEEP (lưu ý Tx Signal VẪN LÀ 0x00 vì ECU không tự chủ xin PNC!). Kênh Ch0 & Ch1 thức dậy nhận dữ liệu.",
        exec() { api_ComM_COMCbk_RxEira(0x01, 0x00); }
      },
      {
        title: "ECU giữ PNC_READY_SLEEP (BswM mở I-PDU Rx/Tx ứng dụng PNC #16)",
        desc: "Các ECU tham gia cụm PNC #16 trao đổi thông tin bình thường trên bus.",
        exec() { stepClockTick(60); }
      },
      {
        title: "ECU Master nhả PNC #16 -> COM báo Rx EIRA về 00 00",
        desc: "Bit 0 trong Rx EIRA về 0 -> PNC #16 chuyển COMM_PNC_PREPARE_SLEEP và khởi chạy PncPrepareSleepTimer = 400ms (Bit 5 Thanh B = 1).",
        exec() { api_ComM_COMCbk_RxEira(0x00, 0x00); }
      },
      {
        title: "Tick +200ms (Timer còn 200ms — chống chập chờn gói NM)",
        desc: "PNC vẫn giữ các kênh mở trong cửa sổ bảo vệ 400ms để không tắt vội nếu gói NM đến trễ.",
        exec() { stepClockTick(200); }
      },
      {
        title: "Tick +200ms — Timer hết hạn -> PNC về NO_COMMUNICATION",
        desc: "Hết 400ms -> PNC #16 xuống PNC_NO_COM, báo BswM tắt I-PDU Group và nhả kênh Ch0/Ch1 sang READY_SLEEP.",
        exec() { stepClockTick(200); }
      }
    ],
    whatIfs: [
      { label: "🧪 Khi đang PREPARE_SLEEP, User 2 nội bộ giành lại PNC_REQUESTED", run() { api_ComM_RequestComMode(2, "FULL_COM"); } },
      { label: "🧪 Đổi PncPrepareSleepTimer lên 800ms", run() { ecucConfig.ComMPncPrepareSleepTimer = 800; syncConfigToDOM(); } },
      { label: "🧪 Bắn Rx EIRA bật cả PNC #16 & #18 (05 00)", run() { api_ComM_COMCbk_RxEira(0x05, 0x00); } }
    ]
  },
  {
    id: "S13",
    group: "Nhóm 4: Partial Networking & DET",
    title: "S13: PNC Gateway Routing (ACTIVE / PASSIVE GW) & Synchronized Shutdown",
    summary: "Mô phỏng ECU Central Gateway định tuyến External Request Array (ERA) của PNC #18 từ kênh ACTIVE (Ch0) sang kênh PASSIVE (Ch1) kèm Synchronized PNC Shutdown.",
    setup() {
      applyPresetBase({
        ComMPncSupport: true,
        ComMPncGatewayEnabled: true,
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
        title: "Mạng ngoài Ch0 (ACTIVE) gửi PNC #18 -> ComM_COMCbk_ERA_Ch0(04 00)",
        desc: "Bit 2 (0x04 = PNC #18) bật trên Rx ERA Ch0. Bit 4 Thanh B (PNC_GW_ACTV) sáng! Gateway định tuyến hợp lệ từ ACTIVE sang Ch1 (PASSIVE).",
        exec() { api_ComM_COMCbk_RxEra(0, 0x04, 0x00); }
      },
      {
        title: "PNC #18 lên COMM_PNC_REQUESTED -> Đánh thức & phát 0x04 lên Ch1",
        desc: "Tx PNC Signal phát 0x04 xuống Ch1, đưa cả Ch0 và Ch1 vào FULL_COM để chuyển tiếp dữ liệu cụm PNC #18 giữa 2 bus!",
        exec() { stepClockTick(40); }
      },
      {
        title: "Ngừng nhận ERA từ Ch0 (RxEraCh0 -> 00 00)",
        desc: "Yêu cầu từ gateway rút lại -> PNC #18 vào COMM_PNC_PREPARE_SLEEP chạy timer 300ms.",
        exec() { api_ComM_COMCbk_RxEra(0, 0x00, 0x00); }
      },
      {
        title: "Hết 300ms -> Kích hoạt Nm_RequestSynchronizedPncShutdown!",
        desc: "PNC #18 về PNC_NO_COM và ComM phát lệnh Synchronized PNC Shutdown để các ECU con trên Ch1 ngủ đồng thời.",
        exec() { stepClockTick(300); }
      }
    ],
    whatIfs: [
      { label: "🧪 Kiểm chứng chống Loop: Đặt cả Ch0 & Ch1 thành PASSIVE rồi nhận ERA", run() { ecucConfig.Ch0_GatewayType = "COMM_GATEWAY_TYPE_PASSIVE"; ecucConfig.Ch1_GatewayType = "COMM_GATEWAY_TYPE_PASSIVE"; syncConfigToDOM(); api_ComM_COMCbk_RxEra(0, 0x04, 0x00); } },
      { label: "🧪 Nhận ERA từ Ch1 (PASSIVE) -> chuyển sang Ch0 (ACTIVE)", run() { ecucConfig.Ch0_GatewayType = "COMM_GATEWAY_TYPE_ACTIVE"; ecucConfig.Ch1_GatewayType = "COMM_GATEWAY_TYPE_PASSIVE"; syncConfigToDOM(); api_ComM_COMCbk_RxEra(1, 0x04, 0x00); } },
      { label: "🧪 Tắt SynchronizedPncShutdown", run() { ecucConfig.ComMSynchronizedPncShutdownEnabled = false; syncConfigToDOM(); } }
    ]
  },
  {
    id: "S14",
    group: "Nhóm 4: Partial Networking & DET",
    title: "S14: Bẫy DET Errors (UNINIT, BusSM Trễ, Timeout Lock, Sai Parameters)",
    summary: "Thực hành phát hiện các lỗi tích hợp kinh điển ngoài dự án: gọi API trước ComM_Init(), truyền sai tham số UserId/ComMode, và lỗi treo xác nhận BusSM_ModeIndication.",
    setup() {
      applyPresetBase({ ComMInitialized: false, ComMDevErrorDetect: true, SimulateBusSmIndicationDelay: 2000 });
      simState.stepExplain = "Bước 0: Bật ComMDevErrorDetect = TRUE nhưng chưa Init (COMM_UNINIT) và đặt BusSM Delay = 2000ms để bẫy treo bắt tay.";
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
        exec() { api_ComM_Init(true); api_ComM_RequestComMode(99, "FULL_COM"); }
      },
      {
        title: "Bẫy 3: BusSM kẹt/trễ Confirm (2000ms) -> User bị treo ở NO_COM",
        desc: "User 0 gọi FULL_COM hợp lệ; kênh đã ra lệnh BusSM_RequestComMode, NHƯNG bit BUSSM (Bit 1) = 0 nên SWC vẫn bị kẹt currentMode = NO_COM!",
        exec() { api_ComM_RequestComMode(0, "FULL_COM"); stepClockTick(100); }
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
