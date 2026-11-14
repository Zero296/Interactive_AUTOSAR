// ================= PART 4B: 12 AUTOSAR FIM SCENARIOS (S1-S12) & 36 WHAT-IF ACTIONS =================

function resetBaseScenario(overrides) {
  ecucConfig = Object.assign(JSON.parse(JSON.stringify(defaultConfig)), overrides || {});
  simState = createInitialSimState();
  simState.demEvents[0].statusByte = parseHexByte(ecucConfig.Evt01_UdsStatusHex);
  simState.demEvents[1].statusByte = parseHexByte(ecucConfig.Evt02_UdsStatusHex);
  simState.demEvents[2].statusByte = parseHexByte(ecucConfig.Evt03_UdsStatusHex);
  simState.fimCacheEvents = simState.demEvents.map((e) => e.statusByte);
  simState.demCompFailed = Boolean(ecucConfig.Comp01_FailedStatus);
  simState.fimCacheCompFailed = simState.demCompFailed;
  simState.lifecycleState = ecucConfig.FiMInitialized ? "FIM_INITIALIZED_READY" : "FIM_UNINITIALIZED";
  recomputeFimState(true);
  simState.prevRegAByte = simState.regAByte;
  simState.prevRegBByte = simState.regBByte;
  syncConfigToDOM();
}

const SCENARIOS = [
  // ================= NHÓM 1: 4 MẶT NẠ ỨC CHẾ CHUẨN =================
  {
    id: "S1",
    group: "Nhóm 1",
    title: "S1: Mặt Nạ FIM_LAST_FAILED — Khóa Tức Thời ACC & AEB Khi Radar Lỗi (TF=1)",
    summary: "Minh họa mặt nạ FIM_LAST_FAILED ((Status & 0x01) == 0x01): Ngay khi Evt_01 (RadarSignalErr) báo lỗi (Bit 0 TF=1), FiM lập tức khóa cả FID_0 (ACC) và FID_1 (AEB) để chuyển sang Fail-Safe ISO 26262.",
    setup: () => {
      resetBaseScenario({
        InhCfg0_Mask: "FIM_LAST_FAILED",
        Evt01_UdsStatusHex: "0x00",
        Evt02_UdsStatusHex: "0x00",
        Evt03_UdsStatusHex: "0x00"
      });
      simState.selectedEventIdx = 0;
      simState.selectedFidIdx = 0;
      simState.selectedRuleId = "InhCfg0";
      simState.stepExplain = "Trạng thái khởi đầu sạch lỗi (Evt_01 = 0x00). Bấm 'Bước Tiếp' để theo dõi phản ứng tức thời của FIM_LAST_FAILED.";
      addTraceLog("info", "FiM Ready (S1)", "Evt_01=0x00 -> (0x00 & 0x01)=0x00 != 0x01 -> FID_0 & FID_1 PERMITTED.");
    },
    steps: [
      {
        title: "Pha 1: SWC_Controller hỏi quyền trước khi chạy bình thường",
        desc: "SWC_Controller gọi Rte_Call_UR_FID0_GetFunctionPermission(&Perm) -> FiM đọc RAM InhibitCounter[FID_0]==0 trong O(1), trả Permission = TRUE.",
        exec: () => {
          api_FiM_GetFunctionPermission(0, false);
        }
      },
      {
        title: "Pha 2: Radar mất tín hiệu -> DEM đẩy Push Callback sang FiM",
        desc: "SWC_DiagMonitor báo Dem_SetEventStatus(Evt_01, FAILED). DEM chốt Status=0x2F (Bit 0 TF=1) và gọi ngay FiM_DemTriggerOnEventStatus(Evt_01, 0x00, 0x2F) [SWS_FiM_00021].",
        exec: () => {
          simState.clockMs += 20;
          api_Dem_SetEventStatus(0, 0x2F, "DEM_EVENT_STATUS_FAILED");
        }
      },
      {
        title: "Pha 3: FiM khớp mặt nạ (0x2F & 0x01)==0x01 -> Khóa đa FID",
        desc: "InhCfg0 khớp (MATCH=1), bật Bit 2 (MASK_MATCH=1) Thanh B, tăng InhibitCounter lên 1 cho cả FID_0 (ACC) và FID_1 (AEB), hạ Bit 0 (FID_PERMISSION=0).",
        exec: () => {
          simState.clockMs += 5;
          api_FiM_GetFunctionPermission(0, false);
          api_FiM_GetFunctionPermission(1, false);
        }
      },
      {
        title: "Pha 4: Phục hồi PASSED (Bit 0 TF: 1 -> 0) mở khóa ngay cả khi CDTC=1",
        desc: "Tín hiệu Radar ổn định lại -> Status=0x2E (TF=0, CDTC vẫn=1). Vì FIM_LAST_FAILED chỉ soi Bit 0, (0x2E & 0x01)=0x00 -> FiM mở khóa lại FID_0 & FID_1 ngay lập tức!",
        exec: () => {
          simState.clockMs += 40;
          api_Dem_SetEventStatus(0, 0x2E, "DEM_EVENT_STATUS_PASSED");
          api_FiM_GetFunctionPermission(0, false);
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Cho Radar hồi phục PASSED (0x2E, TF=0 nhưng CDTC vẫn=1)",
        run: () => {
          api_Dem_SetEventStatus(0, 0x2E, "PASSED");
          api_FiM_GetFunctionPermission(0, false);
        }
      },
      {
        label: "🧪 Đổi InhCfg0_Mask sang FIM_NOT_TESTED (xem kết quả đảo ngược)",
        run: () => {
          ecucConfig.InhCfg0_Mask = "FIM_NOT_TESTED";
          recomputeFimState();
          syncConfigToDOM();
          addTraceLog("info", "What-If Mask Change", "Đổi InhCfg0_Mask -> FIM_NOT_TESTED ((Status & 0x40) == 0x40).");
        }
      },
      {
        label: "🧪 Báo lỗi Evt_01 FAILED (0x2F) & hỏi quyền FID_0 + FID_1",
        run: () => {
          api_Dem_SetEventStatus(0, 0x2F, "FAILED");
          api_FiM_GetFunctionPermission(0, false);
          api_FiM_GetFunctionPermission(1, false);
        }
      }
    ]
  },

  {
    id: "S2",
    group: "Nhóm 1",
    title: "S2: Mặt Nạ FIM_NOT_TESTED — Khóa Khi Mới Bật IG ON (TNCTOC=1) Chờ Tự Kiểm Tra",
    summary: "Minh họa mặt nạ FIM_NOT_TESTED ((Status & 0x40) == 0x40): Khi vừa bật khóa điện IG ON, Bit 6 TNCTOC=1 nên FiM khóa FID_2 (RadarDiagMonitor) cho đến khi mạch nguồn 5V chạy xong bài tự kiểm tra lần đầu.",
    setup: () => {
      resetBaseScenario({
        InhCfg1_Mask: "FIM_NOT_TESTED",
        Evt01_UdsStatusHex: "0x00",
        Evt02_UdsStatusHex: "0x50",
        Evt03_UdsStatusHex: "0x00"
      });
      simState.selectedEventIdx = 1;
      simState.selectedFidIdx = 2;
      simState.selectedRuleId = "InhCfg1";
      simState.stepExplain = "IG vừa bật: Evt_02 (5V Supply) = 0x50 (TNCTOC=1). Vì InhCfg1 dùng FIM_NOT_TESTED nên FID_2 đang bị khóa an toàn.";
      addTraceLog("warn", "IG ON (S2)", "Evt_02 = 0x50 (Bit 6 TNCTOC=1) -> (0x50 & 0x40)==0x40 -> FID_2 INHIBITED.");
    },
    steps: [
      {
        title: "Pha 1: BswM khởi động chu kỳ lái mới (IGNITION_CYCLE START)",
        desc: "DEM giữ Bit 6 TNCTOC = 1 (0x50) cho Evt_02 (SensorSupply5V). Công thức (0x50 & 0x40) == 0x40 khớp mặt nạ FIM_NOT_TESTED -> FID_2 Permission = FALSE.",
        exec: () => {
          api_FiM_GetFunctionPermission(2, false);
        }
      },
      {
        title: "Pha 2: Nguồn 5V hoàn tất bài tự kiểm tra (PASSED -> 0x00)",
        desc: "Sau 100ms, bài tự kiểm tra nguồn 5V xong và báo PASSED -> Bit 6 TNCTOC hạ 1 -> 0 (Status = 0x00). DEM gọi FiM_DemTriggerOnEventStatus(Evt_02, 0x50, 0x00).",
        exec: () => {
          simState.clockMs += 100;
          api_Dem_SetEventStatus(1, 0x00, "DEM_EVENT_STATUS_PASSED");
        }
      },
      {
        title: "Pha 3: Hết điều kiện chưa test -> Mở khóa FID_2",
        desc: "Công thức (0x00 & 0x40) = 0x00 != 0x40 -> InhCfg1 CLEAR! Bit 2 hạ về 0, Bit 0 FID_PERMISSION lên 1 -> FID_2_RadarDiagMonitor được phép chạy!",
        exec: () => {
          simState.clockMs += 10;
          api_FiM_GetFunctionPermission(2, false);
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Nguồn 5V test xong nhưng báo FAILED (0x03: TNCTOC=0, TF=1)",
        run: () => {
          api_Dem_SetEventStatus(1, 0x03, "TEST_FAILED_DONE");
          addTraceLog("warn", "Lưu ý FIM_NOT_TESTED", "Vì TNCTOC=0 (đã test xong), riêng FIM_NOT_TESTED sẽ nhả khóa! Muốn khóa cả khi lỗi phải thêm FIM_LAST_FAILED.");
        }
      },
      {
        label: "🧪 Đổi InhCfg1_Mask sang FIM_LAST_FAILED để khóa khi 0x03",
        run: () => {
          ecucConfig.InhCfg1_Mask = "FIM_LAST_FAILED";
          recomputeFimState();
          syncConfigToDOM();
        }
      },
      {
        label: "🧪 Bắt đầu chu kỳ mới (Dem_SetOperationCycleState START -> TNCTOC=1)",
        run: () => {
          api_Dem_SetOperationCycleStart(false);
          api_FiM_GetFunctionPermission(2, false);
        }
      }
    ]
  },

  {
    id: "S3",
    group: "Nhóm 1",
    title: "S3: Mặt Nạ FIM_TESTED — Khóa Bài Kiểm Tra Sau Lần Chạy Đầu Tiên (Once-Per-Trip)",
    summary: "Minh họa mặt nạ FIM_TESTED ((Status & 0x40) == 0x00): Dùng cho các bài test xâm lấn chỉ chạy 1 lần mỗi chuyến đi. Lúc mới nổ máy (TNCTOC=1) được phép chạy; vừa test xong (TNCTOC=0) là khóa luôn cho tới chu kỳ sau!",
    setup: () => {
      resetBaseScenario({
        InhCfg1_Mask: "FIM_TESTED",
        Evt01_UdsStatusHex: "0x00",
        Evt02_UdsStatusHex: "0x50",
        Evt03_UdsStatusHex: "0x00"
      });
      simState.selectedEventIdx = 1;
      simState.selectedFidIdx = 2;
      simState.selectedRuleId = "InhCfg1";
      simState.stepExplain = "Mới nổ máy: Evt_02 = 0x50 (TNCTOC=1). Vì FIM_TESTED kiểm tra (Status & 0x40)==0x00 nên hiện tại KHÔNG khớp -> FID_2 ĐƯỢC PHÉP CHẠY lần đầu!";
    },
    steps: [
      {
        title: "Pha 1: Đầu chuyến đi (TNCTOC=1) -> Cho phép chạy bài test lần 1",
        desc: "(0x50 & 0x40) = 0x40 != 0x00 -> InhCfg1 CLEAR. FiM_GetFunctionPermission(FID_2) trả về TRUE để bài chẩn đoán Once-Per-Trip bắt đầu thực thi.",
        exec: () => {
          api_FiM_GetFunctionPermission(2, false);
        }
      },
      {
        title: "Pha 2: Hoàn tất bài test (PASSED -> 0x00, TNCTOC: 1 -> 0)",
        desc: "Ngay khi hoàn thành bài test lần 1, Bit 6 TNCTOC hạ về 0 (0x00). DEM đẩy callback sang FiM -> (0x00 & 0x40) == 0x00 -> MATCH! FiM lập tức khóa FID_2.",
        exec: () => {
          simState.clockMs += 120;
          api_Dem_SetEventStatus(1, 0x00, "ONCE_PER_TRIP_DONE");
        }
      },
      {
        title: "Pha 3: Ngăn chạy lặp lại trong cùng chuyến đi; mở lại ở chu kỳ sau",
        desc: "Mọi truy vấn FiM_GetFunctionPermission(FID_2) tiếp theo trong chuyến đi này nhận FALSE. Khi khởi động Operation Cycle mới, Bit 6 lên 1 lại mở khóa.",
        exec: () => {
          simState.clockMs += 20;
          api_FiM_GetFunctionPermission(2, false);
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Bắt đầu Operation Cycle mới (TNCTOC -> 1) mở khóa cho chuyến mới",
        run: () => {
          api_Dem_SetOperationCycleStart(false);
          api_FiM_GetFunctionPermission(2, false);
        }
      },
      {
        label: "🧪 Thử báo FAILED (0x03) lúc đầu chu kỳ -> Vẫn khóa vì TNCTOC=0!",
        run: () => {
          api_Dem_SetEventStatus(1, 0x03, "FAILED_ONCE");
          api_FiM_GetFunctionPermission(2, false);
        }
      },
      {
        label: "🧪 Đổi sang FIM_NOT_TESTED để so sánh đảo pha tức thì",
        run: () => {
          ecucConfig.InhCfg1_Mask = "FIM_NOT_TESTED";
          recomputeFimState();
          syncConfigToDOM();
        }
      }
    ]
  },

  {
    id: "S4",
    group: "Nhóm 1",
    title: "S4: FIM_TESTED_AND_FAILED vs FIM_LAST_FAILED — Phân Biệt Lỗi Cũ (0x6D) & Mới (0x2F)",
    summary: "Giải thích tình huống kinh điển: Sáng nay vừa bật IG ON, Bit 0 (TF=1) lưu từ hôm qua nhưng sáng nay chưa chạy test (TNCTOC=1 -> Status=0x6D). FIM_TESTED_AND_FAILED ((Status & 0x41)==0x01) không khóa vội cho đến khi sáng nay test xong và xác nhận lại lỗi!",
    setup: () => {
      resetBaseScenario({
        InhCfg0_Mask: "FIM_TESTED_AND_FAILED",
        Evt01_UdsStatusHex: "0x6D",
        Evt02_UdsStatusHex: "0x00",
        Evt03_UdsStatusHex: "0x00"
      });
      simState.selectedEventIdx = 0;
      simState.selectedFidIdx = 0;
      simState.selectedRuleId = "InhCfg0";
      simState.stepExplain = "Vừa bật khóa điện: Evt_01 = 0x6D (TF=1 từ hôm qua, nhưng TNCTOC=1 vì sáng nay chưa test). Hãy xem FIM_TESTED_AND_FAILED xử lý thế nào!";
      addTraceLog("info", "Cold Start with Latched TF (0x6D)", "Status=0x6D (0110 1101b): TF=1, TNCTOC=1, CDTC=1.");
    },
    steps: [
      {
        title: "Pha 1: Đánh giá tại 0x6D với FIM_TESTED_AND_FAILED",
        desc: "(0x6D & 0x41) = 0x41 != 0x01 -> KHÔNG KHỚP! Vì Bit 6 TNCTOC đang bằng 1 (chưa test lại ở chu kỳ mới), FiM vẫn cấp FID_0 = TRUE thay vì khóa oan như FIM_LAST_FAILED.",
        exec: () => {
          api_FiM_GetFunctionPermission(0, false);
        }
      },
      {
        title: "Pha 2: Bài kiểm tra chu kỳ mới hoàn tất và xác nhận vẫn lỗi (0x2F)",
        desc: "Radar tự test xong trong chu kỳ sáng nay và báo FAILED -> Bit 6 TNCTOC hạ 1 -> 0 (Status = 0x2F). Lúc này (0x2F & 0x41) == 0x01 -> MATCH!",
        exec: () => {
          simState.clockMs += 80;
          api_Dem_SetEventStatus(0, 0x2F, "VERIFIED_FAILED_TODAY");
        }
      },
      {
        title: "Pha 3: Chốt khóa FID_0 & FID_1 sau khi đã xác minh trong chu kỳ",
        desc: "SWC_Controller gọi FiM_GetFunctionPermission(FID_0) nhận FALSE -> Chuyển sang Fail-Safe với độ tin cậy 100%.",
        exec: () => {
          simState.clockMs += 10;
          api_FiM_GetFunctionPermission(0, false);
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Đặt lại 0x6D & đổi thử sang FIM_LAST_FAILED (xem bị khóa ngay lập tức!)",
        run: () => {
          api_Dem_SetEventStatus(0, 0x6D, "OLD_TF_RESTORED");
          ecucConfig.InhCfg0_Mask = "FIM_LAST_FAILED";
          recomputeFimState();
          syncConfigToDOM();
        }
      },
      {
        label: "🧪 Bài test sáng nay báo PASSED (0x2C: TF=0, TNCTOC=0)",
        run: () => {
          api_Dem_SetEventStatus(0, 0x2C, "HEALED_TODAY");
          api_FiM_GetFunctionPermission(0, false);
        }
      },
      {
        label: "🧪 Chuyển về FIM_TESTED_AND_FAILED tại 0x6D để mở khóa chờ test",
        run: () => {
          ecucConfig.InhCfg0_Mask = "FIM_TESTED_AND_FAILED";
          api_Dem_SetEventStatus(0, 0x6D, "RETEST_WAIT");
        }
      }
    ]
  },

  // ================= NHÓM 2: PUSH VS POLLING & DEM_CLEARDTC =================
  {
    id: "S5",
    group: "Nhóm 2",
    title: "S5: Đối Chiếu Event-Driven Push (DEM) vs Cyclic Polling (FiM_MainFunction)",
    summary: "So sánh FiMEventUpdateTriggeredByDem = TRUE (Push 0ms) vs FALSE (Polling qua FiM_MainFunction mỗi 20ms) và giới hạn tải CPU FiMMaxHandledFidEventLinksPerSchedulableStep.",
    setup: () => {
      resetBaseScenario({
        FiMEventUpdateTriggeredByDem: false,
        FiMMaxHandledFidEventLinksPerSchedulableStep: 64,
        InhCfg0_Mask: "FIM_LAST_FAILED",
        Evt01_UdsStatusHex: "0x00",
        Evt02_UdsStatusHex: "0x00",
        Evt03_UdsStatusHex: "0x00"
      });
      simState.selectedEventIdx = 0;
      simState.selectedFidIdx = 0;
      simState.selectedRuleId = "InhCfg0";
      simState.stepExplain = "Đang bật chế độ CYCLIC POLLING (FiMEventUpdateTriggeredByDem = FALSE). Quan sát độ trễ giữa DEM và FiM trước khi FiM_MainFunction() chạy!";
      addTraceLog("info", "Polling Mode Init (S5)", "FiMEventUpdateTriggeredByDem = FALSE -> Bit 6 Thanh B = 0.");
    },
    steps: [
      {
        title: "Pha 1: DEM ghi nhận Evt_01 = 0x2F nhưng KHÔNG gọi callback sang FiM",
        desc: "Vì FiMEventUpdateTriggeredByDem = FALSE, DEM giữ status mới 0x2F trong DEM nhưng FiM Cache vẫn giữ 0x00! Độ lệch hiển thị ngay trên Thanh A.",
        exec: () => {
          simState.clockMs += 5;
          api_Dem_SetEventStatus(0, 0x2F, "FAILED_NO_PUSH");
        }
      },
      {
        title: "Pha 2: SWC hỏi FiM ở t=10ms -> FiM vẫn trả giá trị cũ TRUE!",
        desc: "Trước khi FiM_MainFunction() chạy, bộ đếm InhibitCounter[FID_0] chưa cập nhật nên FiM vẫn trả Permission = TRUE (độ trễ tối đa 1 chu kỳ MainFunction).",
        exec: () => {
          simState.clockMs += 5;
          api_FiM_GetFunctionPermission(0, false);
        }
      },
      {
        title: "Pha 3: SchM kích hoạt FiM_MainFunction() tại t=20ms -> Đồng bộ & Khóa FID",
        desc: "FiM gọi Dem_GetEventUdsStatus(Evt_01, &Status) [SWS_FiM_00065], nạp 0x2F vào Cache và hạ ngay FID_0 Permission xuống FALSE!",
        exec: () => {
          stepClockTick(20);
          api_FiM_GetFunctionPermission(0, false);
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Bật lại Push Mode (FiMEventUpdateTriggeredByDem=TRUE) & test độ trễ 0ms",
        run: () => {
          ecucConfig.FiMEventUpdateTriggeredByDem = true;
          api_Dem_SetEventStatus(0, 0x00, "PASSED_PUSH_0MS");
          api_Dem_SetEventStatus(0, 0x2F, "FAILED_PUSH_0MS");
          syncConfigToDOM();
        }
      },
      {
        label: "🧪 Đặt MaxHandledFidLinksPerStep = 1 trong Polling Mode (chia nhiều tick)",
        run: () => {
          ecucConfig.FiMEventUpdateTriggeredByDem = false;
          ecucConfig.FiMMaxHandledFidEventLinksPerSchedulableStep = 1;
          simState.pollingCursor = 1; // Bắt đầu từ Evt_02 để Evt_01 cần 2-3 tick!
          api_Dem_SetEventStatus(0, 0x00, "PASSED_WAIT_MULTI_TICK");
          syncConfigToDOM();
        }
      },
      {
        label: "🧪 Chạy +1 Tick FiM_MainFunction (+20ms)",
        run: () => {
          stepClockTick(20);
        }
      }
    ]
  },

  {
    id: "S6",
    group: "Nhóm 2",
    title: "S6: Trình Tự Khởi Tạo FiM_Init ➔ Dem_Init ➔ FiM_DemInit & Khôi Phục NvM",
    summary: "Chứng minh trình tự khởi động sống còn: FiM_Init() chỉ nạp cấu hình tĩnh (PRE_INITIALIZED); phải đợi DEM đọc xong lỗi từ NvM rồi gọi FiM_DemInit() thì FiM mới chốt Permission chính xác.",
    setup: () => {
      resetBaseScenario({
        FiMInitialized: false,
        InhCfg0_Mask: "FIM_LAST_FAILED",
        Evt01_UdsStatusHex: "0x00",
        Evt02_UdsStatusHex: "0x00",
        Evt03_UdsStatusHex: "0x00"
      });
      simState.lifecycleState = "FIM_UNINITIALIZED";
      recomputeFimState(true);
      simState.prevRegAByte = simState.regAByte;
      simState.prevRegBByte = simState.regBByte;
      syncConfigToDOM();
      simState.stepExplain = "ECU vừa cấp nguồn Power-On (FIM_UNINITIALIZED). Bấm 'Bước Tiếp' để chạy chuỗi khởi tạo 3 bước cùng EcuM, NvM và DEM.";
    },
    steps: [
      {
        title: "Bước 1: EcuM gọi FiM_Init(&FiM_Config) -> FIM_PRE_INITIALIZED",
        desc: "FiM nạp cấu hình bảng ánh xạ tĩnh nhưng DEM chưa đọc xong NvM. Vì vậy Bit 7 (FIM_INIT) vẫn = 0 để không trả nhầm Permission = TRUE.",
        exec: () => {
          simState.clockMs += 5;
          api_FiM_Init(false);
        }
      },
      {
        title: "Bước 2: NvM_ReadAll() nạp lỗi Evt_01 = 0x2F vào DEM trong Dem_Init()",
        desc: "DEM khôi phục dữ liệu bền vững từ Flash/EEPROM: phát hiện Evt_01 đang lưu lỗi từ chuyến đi trước (0x2F).",
        exec: () => {
          simState.clockMs += 15;
          simState.demEvents[0].statusByte = 0x2F;
          simState.activeModId = "MOD_DEM";
          addTraceLog("warn", "NvM_ReadAll() -> Dem_Init()", "DEM khôi phục Evt_01 = 0x2F từ Flash (FiM chưa chạy FiM_DemInit).");
          recomputeFimState();
        }
      },
      {
        title: "Bước 3: DEM gọi FiM_DemInit() -> Quét toàn bộ DEM & Bật Ready!",
        desc: "FiM gọi Dem_GetEventUdsStatus() đồng bộ 0x2F [SWS_FiM_00006], bật Bit 7 (FIM_INIT=1) và khóa ngay FID_0 & FID_1 (FALSE) từ giây đầu tiên!",
        exec: () => {
          simState.clockMs += 5;
          api_FiM_DemInit();
          api_FiM_GetFunctionPermission(0, false);
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Thử gọi FiM_GetFunctionPermission() lúc đang ở PRE_INITIALIZED",
        run: () => {
          api_FiM_Init(false);
          api_FiM_GetFunctionPermission(0, false);
        }
      },
      {
        label: "🧪 Giả lập NvM sạch lỗi (0x50) trước khi gọi FiM_DemInit()",
        run: () => {
          simState.demEvents[0].statusByte = 0x50;
          api_FiM_Init(false);
          api_FiM_DemInit();
        }
      },
      {
        label: "🧪 Giả lập NvM có sẵn lỗi 0x2F và chạy lại FiM_DemInit()",
        run: () => {
          simState.demEvents[0].statusByte = 0x2F;
          api_FiM_DemInit();
        }
      }
    ]
  },

  {
    id: "S7",
    group: "Nhóm 2",
    title: "S7: Tác Động Kép UDS 0x14 (Dem_ClearDTC): Mở LAST_FAILED & Khóa NOT_TESTED",
    summary: "Khi máy chẩn đoán gửi UDS 0x14 xóa lỗi, DEM đưa mọi Event về 0x50 (TF=0, TNCTOC=1) rồi gọi FiM_DemInit(): FID_0 (FIM_LAST_FAILED) lập tức ĐƯỢC MỞ, còn FID_2 (FIM_NOT_TESTED) lập tức BỊ KHÓA LẠI!",
    setup: () => {
      resetBaseScenario({
        InhCfg0_Mask: "FIM_LAST_FAILED",
        InhCfg1_Mask: "FIM_NOT_TESTED",
        Evt01_UdsStatusHex: "0x2F",
        Evt02_UdsStatusHex: "0x00",
        Evt03_UdsStatusHex: "0x00"
      });
      simState.selectedEventIdx = 0;
      simState.selectedFidIdx = 0;
      simState.selectedRuleId = "InhCfg0";
      simState.stepExplain = "Ban đầu: Evt_01=0x2F (lỗi) làm FID_0=FALSE; Evt_02=0x00 (đã test) nên FID_2=TRUE. Bấm 'Bước Tiếp' để chạy UDS 0x14 ClearDTC!";
    },
    steps: [
      {
        title: "Pha 1: Ghi nhận trạng thái trái ngược trước khi ClearDTC",
        desc: "Trước 0x14: FID_0 (LAST_FAILED) đang bị KHÓA (FALSE), trong khi FID_2 (NOT_TESTED) đang MỞ (TRUE).",
        exec: () => {
          api_FiM_GetFunctionPermission(0, false);
          api_FiM_GetFunctionPermission(2, false);
        }
      },
      {
        title: "Pha 2: Tester gửi UDS 0x14 -> DCM gọi Dem_ClearDTC() -> FiM_DemInit()",
        desc: "DEM xóa sạch bộ nhớ về 0x50 (Bit 0 TF=0, Bit 6 TNCTOC=1) và gọi FiM_DemInit() [SWS_FiM_00056]. Quan sát sự đảo chiều giữa FID_0 và FID_2!",
        exec: () => {
          simState.clockMs += 20;
          api_Dem_ClearDTC();
        }
      },
      {
        title: "Pha 3: Evt_02 test lại PASSED (0x00) sau ClearDTC -> Mở khóa cả hai",
        desc: "Sau khi xóa lỗi, nguồn 5V chạy lại bài tự test đầu tiên (TNCTOC: 1 -> 0) -> Lúc này cả FID_0 lẫn FID_2 đều về TRUE!",
        exec: () => {
          simState.clockMs += 60;
          api_Dem_SetEventStatus(1, 0x00, "RETEST_PASSED_AFTER_CLEAR");
          api_FiM_GetFunctionPermission(2, false);
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Bắn UDS 0x14 ClearDTC ngay bây giờ (xem FID_0 mở & FID_2 khóa!)",
        run: () => {
          api_Dem_ClearDTC();
        }
      },
      {
        label: "🧪 Đặt lại lỗi Evt_01=0x2F & Evt_02=0x00 để chuẩn bị trước ClearDTC",
        run: () => {
          api_Dem_SetEventStatus(0, 0x2F, "FAULT_BEFORE_CLEAR");
          api_Dem_SetEventStatus(1, 0x00, "TESTED_OK");
        }
      },
      {
        label: "🧪 Chạy test Evt_02 PASSED (0x00) để hạ TNCTOC=0 mở khóa FID_2",
        run: () => {
          api_Dem_SetEventStatus(1, 0x00, "PASSED");
        }
      }
    ]
  },

  // ================= NHÓM 3: SUMMARY EVENT, DEMCOMPONENT & CASCADING FAULTS =================
  {
    id: "S8",
    group: "Nhóm 3",
    title: "S8: Gom Nhóm Nhiều Lỗi Với FiMSummaryEvent (Sum_01 ➔ Đa FID)",
    summary: "Chứng minh FiMSummaryEvent (SWS_FiM_00063): Gom Evt_02 (5V Sụt Áp) và Evt_03 (Quá Áp Ắc-quy) vào Sum_01. Chỉ cần 1 trong 2 Event khớp mặt nạ là Sum_01 khóa FID_0 và bật Bit 3 (SUM_EVT_ACT).",
    setup: () => {
      resetBaseScenario({
        SummaryEvent_Sum01_Enabled: true,
        InhCfg2_Mask: "FIM_LAST_FAILED",
        Evt01_UdsStatusHex: "0x00",
        Evt02_UdsStatusHex: "0x00",
        Evt03_UdsStatusHex: "0x00"
      });
      simState.selectedEventIdx = 1;
      simState.selectedFidIdx = 0;
      simState.selectedRuleId = "InhCfg2";
      simState.stepExplain = "Đã bật SummaryEvent Sum_01 (gồm Evt_02 & Evt_03) với mặt nạ FIM_LAST_FAILED trỏ vào FID_0.";
    },
    steps: [
      {
        title: "Pha 1: Evt_02 (5V UnderVoltage) báo FAILED -> Sum_01 kích hoạt",
        desc: "Chỉ mình Evt_02=0x2F (Evt_03 vẫn 0x00). Phép OR trong Sum_01 = TRUE -> Bật Bit 3 (SUM_EVT_ACT=1) và khóa FID_0 = FALSE.",
        exec: () => {
          simState.clockMs += 20;
          api_Dem_SetEventStatus(1, 0x2F, "5V_UNDERVOLT_FAIL");
        }
      },
      {
        title: "Pha 2: Thêm Evt_03 (Battery OverVoltage) lỗi -> Sửa Evt_02 vẫn chưa mở!",
        desc: "Cả Evt_02 & Evt_03 đều lỗi. Sau đó Evt_02 hồi phục PASSED (0x00), nhưng vì Evt_03 vẫn còn 0x2F nên Sum_01 vẫn giữ Bit 3=1 và FID_0=FALSE!",
        exec: () => {
          simState.clockMs += 20;
          api_Dem_SetEventStatus(2, 0x2F, "OVERVOLT_FAIL");
          simState.clockMs += 20;
          api_Dem_SetEventStatus(1, 0x00, "5V_RECOVERED");
        }
      },
      {
        title: "Pha 3: Cả Evt_02 và Evt_03 cùng sạch lỗi -> Mở khóa FID_0",
        desc: "Khi Evt_03 cũng hồi phục PASSED (0x00), toàn bộ thành viên Sum_01 hết lỗi -> Hạ Bit 3 (SUM_EVT_ACT=0) và trả FID_0 = TRUE!",
        exec: () => {
          simState.clockMs += 40;
          api_Dem_SetEventStatus(2, 0x00, "OVERVOLT_RECOVERED");
          api_FiM_GetFunctionPermission(0, false);
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Bật lỗi cả Evt_02 & Evt_03 rồi chỉ sửa Evt_02 = PASSED (vẫn khóa!)",
        run: () => {
          api_Dem_SetEventStatus(1, 0x2F, "FAIL");
          api_Dem_SetEventStatus(2, 0x2F, "FAIL");
          api_Dem_SetEventStatus(1, 0x00, "PASS_E2_ONLY");
        }
      },
      {
        label: "🧪 Sửa nốt Evt_03 = PASSED (0x00) để nhả Sum_01",
        run: () => {
          api_Dem_SetEventStatus(2, 0x00, "PASS_E3");
        }
      },
      {
        label: "🧪 Đổi mặt nạ Sum_01 (InhCfg2_Mask) sang FIM_TESTED_AND_FAILED",
        run: () => {
          ecucConfig.InhCfg2_Mask = "FIM_TESTED_AND_FAILED";
          recomputeFimState();
          syncConfigToDOM();
        }
      }
    ]
  },

  {
    id: "S9",
    group: "Nhóm 3",
    title: "S9: Đồ Thị Phụ Thuộc Phần Cứng DemComponent (FiM_DemTriggerOnComponentStatus)",
    summary: "Minh họa cơ chế ức chế qua nút phần cứng DemComponent (SWS_FiM_00099): Khi DEM báo Comp_01 (RadarHwCluster) hỏng do đứt cầu chì cha, FiM bật Bit 4 (COMP_FAILED) và khóa ngay FID_0 & FID_1 mà không cần mặt nạ UDS!",
    setup: () => {
      resetBaseScenario({
        ComponentInhibition_Enabled: true,
        Comp01_FailedStatus: false,
        Evt01_UdsStatusHex: "0x00",
        Evt02_UdsStatusHex: "0x00",
        Evt03_UdsStatusHex: "0x00"
      });
      simState.selectedEventIdx = 0;
      simState.selectedFidIdx = 0;
      simState.selectedRuleId = "InhCfg3";
      simState.stepExplain = "Đã bật liên kết Component Comp_01 -> FID_0 & FID_1. Mọi Event UDS đang bằng 0x00 (sạch lỗi).";
    },
    steps: [
      {
        title: "Pha 1: Cầu chì nguồn Radar hỏng -> DEM báo Comp_01 Failed = TRUE",
        desc: "DEM đánh dấu cây DemComponent và gọi FiM_DemTriggerOnComponentStatus(Comp_01, TRUE) [SWS_FiM_00099]. Bit 4 (COMP_FAILED) bật lên 1!",
        exec: () => {
          simState.clockMs += 20;
          api_FiM_DemTriggerOnComponentStatus(true);
        }
      },
      {
        title: "Pha 2: Khóa đồng thời FID_0 (ACC) & FID_1 (AEB) dù Event UDS = 0x00",
        desc: "Do InhibitCounter[FID_0] & [FID_1] đều tăng bởi InhCfg3 (Comp_01), FiM_GetFunctionPermission() trả FALSE ngay cả khi không có DTC đơn lẻ nào khớp mặt nạ!",
        exec: () => {
          simState.clockMs += 10;
          api_FiM_GetFunctionPermission(0, false);
          api_FiM_GetFunctionPermission(1, false);
        }
      },
      {
        title: "Pha 3: Phần cứng khôi phục -> FiM_DemTriggerOnComponentStatus(FALSE)",
        desc: "Khi Comp_01 trở lại bình thường, Bit 4 (COMP_FAILED) hạ về 0 và trả lại Permission = TRUE cho ACC & AEB.",
        exec: () => {
          simState.clockMs += 40;
          api_FiM_DemTriggerOnComponentStatus(false);
          api_FiM_GetFunctionPermission(0, false);
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Bật Comp_01 Failed = TRUE (khóa ngay FID_0 & FID_1 dù UDS=0x00)",
        run: () => {
          api_FiM_DemTriggerOnComponentStatus(true);
        }
      },
      {
        label: "🧪 Khôi phục Comp_01 Failed = FALSE để mở khóa",
        run: () => {
          api_FiM_DemTriggerOnComponentStatus(false);
        }
      },
      {
        label: "🧪 Chuyển sang Polling Mode & đổi Comp_01 -> Đợi +20ms MainFn",
        run: () => {
          ecucConfig.FiMEventUpdateTriggeredByDem = false;
          api_FiM_DemTriggerOnComponentStatus(!simState.demCompFailed);
          syncConfigToDOM();
        }
      }
    ]
  },

  {
    id: "S10",
    group: "Nhóm 3",
    title: "S10: Chặn Lỗi Dây Chuyền (Cascading Faults): Nguồn 5V Khóa Radar Monitor",
    summary: "Ứng dụng sống còn trên xe thực tế: Khi đường nguồn 5V (Evt_02) sụt áp, Radar mất tín hiệu theo. Nhờ FiM khóa FID_2 (RadarDiagMonitor), SWC_DiagMonitor không ghi DTC giả Evt_01 xuống DEM — giữ bộ nhớ lỗi chỉ có nguyên nhân gốc!",
    setup: () => {
      resetBaseScenario({
        CascadingFaultSuppressionEnabled: true,
        InhCfg0_Mask: "FIM_LAST_FAILED",
        InhCfg1_Mask: "FIM_LAST_FAILED",
        Evt01_UdsStatusHex: "0x00",
        Evt02_UdsStatusHex: "0x00",
        Evt03_UdsStatusHex: "0x00"
      });
      simState.selectedEventIdx = 1;
      simState.selectedFidIdx = 2;
      simState.selectedRuleId = "InhCfg1";
      simState.stepExplain = "CascadingFaultSuppression = TRUE. Nguồn 5V (Evt_02) đang sạch (0x00) nên FID_2 (RadarDiagMonitor) đang được chạy bình thường.";
    },
    steps: [
      {
        title: "Pha 1: Lỗi gốc xảy ra — Nguồn 5V Sensor Supply sụt áp (Evt_02 = 0x2F)",
        desc: "SWC báo Evt_02 FAILED xuống DEM -> Push sang FiM -> InhCfg1 (FIM_LAST_FAILED) lập tức khóa FID_2_RadarDiagMonitor = FALSE!",
        exec: () => {
          simState.clockMs += 20;
          api_Dem_SetEventStatus(1, 0x2F, "ROOT_CAUSE_5V_FAIL");
        }
      },
      {
        title: "Pha 2: Radar mất tín hiệu theo — Nhưng SWC hỏi FID_2 và CHẶN DTC giả!",
        desc: "SWC_DiagMonitor chuẩn bị báo lỗi Evt_01 (RadarSignalErr = 0x2F). Trước khi ghi DEM, nó hỏi FiM_GetFunctionPermission(FID_2) -> nhận FALSE -> BỎ QUA không gọi DEM! Evt_01 vẫn giữ sạch 0x00!",
        exec: () => {
          simState.clockMs += 20;
          api_Dem_SetEventStatus(0, 0x2F, "SECONDARY_RADAR_FAIL");
        }
      },
      {
        title: "Pha 3: Sửa lỗi gốc 5V (0x00) -> Mở khóa FID_2 cho Radar kiểm tra lại",
        desc: "Khi đường nguồn 5V ổn định lại (0x00), FID_2 quay lại TRUE để Radar tiếp tục chẩn đoán bình thường.",
        exec: () => {
          simState.clockMs += 40;
          api_Dem_SetEventStatus(1, 0x00, "5V_RESTORED");
          api_FiM_GetFunctionPermission(2, false);
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Bật lỗi 5V (0x2F) rồi thử báo lỗi Radar Evt_01 -> Bị chặn hoàn toàn!",
        run: () => {
          ecucConfig.CascadingFaultSuppressionEnabled = true;
          api_Dem_SetEventStatus(1, 0x2F, "5V_FAIL");
          api_Dem_SetEventStatus(0, 0x2F, "RADAR_FAIL_BLOCKED");
          syncConfigToDOM();
        }
      },
      {
        label: "🧪 Tắt CascadingSuppression=FALSE rồi báo Radar -> Sinh DTC giả Evt_01!",
        run: () => {
          ecucConfig.CascadingFaultSuppressionEnabled = false;
          api_Dem_SetEventStatus(1, 0x2F, "5V_FAIL");
          api_Dem_SetEventStatus(0, 0x2F, "FAKE_SECONDARY_DTC");
          syncConfigToDOM();
        }
      },
      {
        label: "🧪 Hồi phục 5V & Radar về 0x00 sạch sẽ",
        run: () => {
          api_Dem_SetEventStatus(1, 0x00, "5V_OK");
          api_Dem_SetEventStatus(0, 0x00, "RADAR_OK");
        }
      }
    ]
  },

  // ================= NHÓM 4: AVAILABILITY & DET ERROR HANDLING =================
  {
    id: "S11",
    group: "Nhóm 4",
    title: "S11: Điều Khiển Tính Khả Dụng Động FiM_SetFunctionAvailable() (SWS_FiM_00105)",
    summary: "Minh họa cách dùng FiM_SetFunctionAvailable(FID, Availability) cho Variant Coding hoặc Transport Mode: Khóa cứng FID_0 (ACC) xuống FALSE dù không có bất kỳ lỗi DTC nào trên xe.",
    setup: () => {
      resetBaseScenario({
        FiMAvailabilitySupport: true,
        FID0_Available: true,
        Evt01_UdsStatusHex: "0x00",
        Evt02_UdsStatusHex: "0x00",
        Evt03_UdsStatusHex: "0x00"
      });
      simState.selectedEventIdx = 0;
      simState.selectedFidIdx = 0;
      simState.selectedRuleId = "InhCfg0";
      simState.stepExplain = "Hệ thống không có mã lỗi nào (InhibitCounter = 0). FID_0_Available = TRUE -> Permission = TRUE.";
    },
    steps: [
      {
        title: "Pha 1: Chức năng ACC khả dụng mặc định (Permission = TRUE)",
        desc: "Bit 5 (AVAIL_SUPP=1), Bit 1 (FID_AVL=1), InhibitCounter=0 -> Bit 0 (FID_PERM=1).",
        exec: () => {
          api_FiM_GetFunctionPermission(0, false);
        }
      },
      {
        title: "Pha 2: Xe vào Transport Mode -> Gọi FiM_SetFunctionAvailable(FID_0, FALSE)",
        desc: "BswM/SWC gọi FiM_SetFunctionAvailable(FID_0, FALSE) [SWS_FiM_00106]. Bit 1 (FID_AVL) hạ về 0 -> Ép Bit 0 (FID_PERM = 0) dù không có DTC!",
        exec: () => {
          simState.clockMs += 20;
          api_FiM_SetFunctionAvailable(0, false);
          api_FiM_GetFunctionPermission(0, false);
        }
      },
      {
        title: "Pha 3: Mở lại Availability = TRUE -> Phục hồi quyền (khi không có lỗi)",
        desc: "Khi tắt Transport Mode và gọi FiM_SetFunctionAvailable(FID_0, TRUE), FID_0 lập tức trở lại TRUE vì InhibitCounter == 0.",
        exec: () => {
          simState.clockMs += 40;
          api_FiM_SetFunctionAvailable(0, true);
          api_FiM_GetFunctionPermission(0, false);
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Gọi FiM_SetFunctionAvailable(FID_0, FALSE) ngay khi không có lỗi",
        run: () => {
          api_FiM_SetFunctionAvailable(0, false);
          syncConfigToDOM();
        }
      },
      {
        label: "🧪 Tắt FiMAvailabilitySupport=FALSE rồi gọi SetFunctionAvailable (bị bỏ qua)",
        run: () => {
          ecucConfig.FiMAvailabilitySupport = false;
          api_FiM_SetFunctionAvailable(0, false);
          recomputeFimState();
          syncConfigToDOM();
        }
      },
      {
        label: "🧪 Bật Avail=TRUE trong khi Evt_01 đang lỗi 0x2F (vẫn FALSE do Counter>0!)",
        run: () => {
          ecucConfig.FiMAvailabilitySupport = true;
          api_Dem_SetEventStatus(0, 0x2F, "FAULT_ACTIVE");
          api_FiM_SetFunctionAvailable(0, true);
          syncConfigToDOM();
        }
      }
    ]
  },

  {
    id: "S12",
    group: "Nhóm 4",
    title: "S12: Kiểm Thử Bảo Vệ Tham Số & Bẫy Lỗi DET (UNINIT, OUT_OF_RANGE, NULL_PTR)",
    summary: "Kiểm chứng 5 mã lỗi phát triển chuẩn SWS_FiM_00076 (ModuleId = 11): FIM_E_UNINIT (0x01), FIM_E_FID_OUT_OF_RANGE (0x02), FIM_E_EVENTID_OUT_OF_RANGE (0x03), FIM_E_PARAM_POINTER (0x04) và FIM_E_INIT_FAILED (0x05).",
    setup: () => {
      resetBaseScenario({
        FiMDevErrorDetect: true,
        ConfigVariantType: "POST_BUILD_LOADABLE",
        Evt01_UdsStatusHex: "0x00",
        Evt02_UdsStatusHex: "0x00",
        Evt03_UdsStatusHex: "0x00"
      });
      simState.stepExplain = "FiMDevErrorDetect = TRUE (ModuleId = 11). Bấm 'Bước Tiếp' để kiểm tra từng bẫy lỗi DET.";
    },
    steps: [
      {
        title: "Lỗi 1: FIM_E_UNINIT (0x01) — Gọi GetPermission khi FiM chưa khởi tạo",
        desc: "Đặt trạng thái FIM_UNINITIALIZED rồi gọi FiM_GetFunctionPermission(0). FiM báo Det_ReportError(11, 0, 0x01, 0x01), trả E_NOT_OK và gán *Permission=FALSE an toàn!",
        exec: () => {
          simState.lifecycleState = "FIM_UNINITIALIZED";
          recomputeFimState();
          api_FiM_GetFunctionPermission(0, false);
          syncConfigToDOM();
        }
      },
      {
        title: "Lỗi 2 & 3: FID_OUT_OF_RANGE (0x02) & EVENTID_OUT_OF_RANGE (0x03)",
        desc: "Khởi tạo lại FiM rồi gọi sai biên FID = 99 và EventId = 999 -> DET ghi vết cả hai mã lỗi 0x02 và 0x03.",
        exec: () => {
          simState.clockMs += 10;
          api_FiM_Init(false);
          api_FiM_DemInit();
          api_FiM_GetFunctionPermission(99, false);
          api_FiM_DemTriggerOnEventStatus(999, 0x00, 0x01);
          syncConfigToDOM();
        }
      },
      {
        title: "Lỗi 4 & 5: PARAM_POINTER (0x04) & INIT_FAILED (0x05)",
        desc: "Truyền NULL_PTR vào FiM_GetFunctionPermission(0, NULL_PTR) -> 0x04; và gọi FiM_Init(NULL_PTR) ở biến thể POST_BUILD_LOADABLE -> 0x05.",
        exec: () => {
          simState.clockMs += 10;
          api_FiM_GetFunctionPermission(0, true);
          api_FiM_Init(true);
          syncConfigToDOM();
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Bắn lỗi FIM_E_UNINIT (0x01): Đặt UNINIT & gọi GetFunctionPermission",
        run: () => {
          simState.lifecycleState = "FIM_UNINITIALIZED";
          recomputeFimState();
          api_FiM_GetFunctionPermission(0, false);
          syncConfigToDOM();
        }
      },
      {
        label: "🧪 Bắn lỗi FID=99 (0x02) & EventId=999 (0x03) lên DET Trace",
        run: () => {
          api_FiM_Init(false);
          api_FiM_DemInit();
          api_FiM_GetFunctionPermission(99, false);
          api_FiM_DemTriggerOnEventStatus(999, 0x00, 0x01);
          syncConfigToDOM();
        }
      },
      {
        label: "🧪 Bắn lỗi NULL_PTR (0x04) vào FiM_GetFunctionPermission",
        run: () => {
          api_FiM_Init(false);
          api_FiM_DemInit();
          api_FiM_GetFunctionPermission(0, true);
          syncConfigToDOM();
        }
      }
    ]
  }
];
