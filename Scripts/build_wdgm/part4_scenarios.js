// ================= PART 4B: 12 PRE-BUILT SCENARIOS (S1-S12) & 36 WHAT-IF ACTIONS =================

function resetConfigToBase(overrides) {
  ecucConfig = Object.assign(JSON.parse(JSON.stringify(defaultConfig)), overrides || {});
  simState = createInitialSimState();
}

const SCENARIOS = [
  // -------------------- NHOM 1: ALIVE SUPERVISION & TOLERANCE --------------------
  {
    id: "S1",
    group: "Nhóm 1: Alive Supervision & Tolerance",
    title: "S1: WdgM_Init() & Chu Trình Chuẩn (Alive + Deadline + Logical = OK)",
    summary: "Minh họa chu trình hoạt động bình thường: EcuM/BswM gọi WdgM_Init(), SE_0 thực hiện CP_0 → CP_1 → CP_2 với Δt=4ms ∈ [2,8]ms, đạt Alive AC=2 trong SRC=2 chu kỳ, bơm WdgIf_SetTriggerCondition(20ms).",
    setup: () => {
      resetConfigToBase({ ActiveWdgMMode: "FAST_MODE", WdgMExpectedAliveIndications: 2, WdgMSupervisionReferenceCycle: 2 });
      api_WdgM_Init(true, "FAST_MODE");
      simState.apiTrace = [];
      addTrace("Scenario S1 Ready", "Đã khởi tạo WdgM ở FAST_MODE (10ms cycle, WdgIf Trigger = 20ms).", "info");
    },
    steps: [
      {
        title: "Chu kỳ 1 — Bắn CP_0_Init (t = 2ms)",
        desc: "SWC_BrakeCtrl (SE_0) bắt đầu Runnable: tăng Alive AC=1, lưu TimestampStart=2ms, bật Bit 3 (GRAPH_ACTV=1).",
        exec: () => {
          simState.clockMs = 2;
          api_WdgM_CheckpointReached(0, 0);
        }
      },
      {
        title: "Chu kỳ 1 — Bắn CP_1_Run (t = 6ms, Δt = 4ms)",
        desc: "Hoàn thành nhánh tính toán phanh: Δt = 6-2 = 4ms ∈ [2,8]ms (Deadline OK) & cạnh CP0→CP1 hợp lệ.",
        exec: () => {
          simState.clockMs = 6;
          api_WdgM_CheckpointReached(0, 1);
        }
      },
      {
        title: "Chu kỳ 1 — Bắn CP_2_Exit & MainFunction #1 (t = 10ms)",
        desc: "Đóng đồ thị Logical tại CP_2 (t=8ms), sau đó SchM gọi WdgM_MainFunction() kỳ 1 (SC=1/2, chưa tới mốc SRC=2) và nuôi WdgIf(20ms).",
        exec: () => {
          simState.clockMs = 8;
          api_WdgM_CheckpointReached(0, 2);
          api_WdgM_CheckpointReached(1, 0);
          simState.clockMs = 0; // MainFn adds +10ms
          api_WdgM_MainFunction();
        }
      },
      {
        title: "Chu kỳ 2 — Hoàn Tất Vòng 2 & Đánh Giá Alive (t = 20ms)",
        desc: "SE_0 chạy vòng 2 (AC=2), đến t=20ms WdgM_MainFunction() thấy SC==SRC(2==2): kiểm tra 1 ≤ AC(2) ≤ 3 → WDGM_CORRECT! Tiếp tục nuôi WdgIf(20ms).",
        exec: () => {
          simState.clockMs = 12;
          api_WdgM_CheckpointReached(0, 0);
          simState.clockMs = 16;
          api_WdgM_CheckpointReached(0, 1);
          simState.clockMs = 18;
          api_WdgM_CheckpointReached(0, 2);
          api_WdgM_CheckpointReached(1, 0);
          simState.clockMs = 10; // MainFn -> 20ms
          api_WdgM_MainFunction();
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Giảm WdgMTriggerConditionValue_Int xuống 15ms",
        run: () => {
          ecucConfig.WdgMTriggerConditionValue_Int = 15;
          api_WdgM_MainFunction();
        }
      },
      {
        label: "🧪 Bật ExternalWindowWdgEnabled (SBC Window Wdg)",
        run: () => {
          ecucConfig.ExternalWindowWdgEnabled = true;
          api_WdgM_MainFunction();
        }
      },
      {
        label: "🧪 Chuyển sang SLOW_MODE (Thấy SE_2 từ DEACTIVATED → OK)",
        run: () => {
          api_WdgM_SetMode("SLOW_MODE");
        }
      }
    ]
  },

  {
    id: "S2",
    group: "Nhóm 1: Alive Supervision & Tolerance",
    title: "S2: Thiếu Xung Alive (FAILED) & Tự Phục Hồi Nhờ Tolerance",
    summary: "Chứng minh tính năng độc quyền của Alive Supervision: khi AC=0 < (EAI-MinMargin=1), SE_0 vào WDGM_LOCAL_STATUS_FAILED (0x01) nhưng vẫn nuôi Watchdog, sau đó tự phục hồi về OK khi chạy đúng trở lại.",
    setup: () => {
      resetConfigToBase({ WdgMExpectedAliveIndications: 2, WdgMSupervisionReferenceCycle: 2, WdgMMinMargin: 1, WdgMFailedAliveSupervisionRefCycleTol: 1, SE1_AliveEnabled: false });
      api_WdgM_Init(true, "FAST_MODE");
      simState.apiTrace = [];
    },
    steps: [
      {
        title: "Kỳ tham chiếu 1 (SC=1/2) — Task SE_0 bị trễ không gọi CP_0",
        desc: "Do tải CPU cao tạm thời, hết 10ms đầu tiên SE_0 vẫn chưa gửi được xung Alive nào (AC=0).",
        exec: () => {
          api_WdgM_MainFunction();
        }
      },
      {
        title: "Kỳ tham chiếu 1 (SC=2/2, t=20ms) — Bắt Lỗi Thiếu Xung → LOCAL_FAILED",
        desc: "SC==SRC(2): AC(0) < 1 → Alive=INCORRECT (Bit 6 ALIVE_OK=0). Vì FailedCnt(1) ≤ Tol(1), SE_0 vào FAILED (Bit 0=1) và Global=FAILED. WdgIf vẫn được nuôi 20ms!",
        exec: () => {
          api_WdgM_MainFunction();
        }
      },
      {
        title: "Kỳ tham chiếu 2 (t=22..30ms) — SE_0 Khôi Phục Chạy Lại Vòng Chuẩn #1",
        desc: "SE_0 thoát tắc nghẽn CPU và chạy lại CP_0 → CP_1 → CP_2 (AC=1).",
        exec: () => {
          simState.clockMs = 22;
          api_WdgM_CheckpointReached(0, 0);
          simState.clockMs = 26;
          api_WdgM_CheckpointReached(0, 1);
          simState.clockMs = 28;
          api_WdgM_CheckpointReached(0, 2);
          simState.clockMs = 20;
          api_WdgM_MainFunction();
        }
      },
      {
        title: "Kỳ tham chiếu 2 (t=40ms) — Tự Phục Hồi Hoàn Toàn Về OK (0x00)",
        desc: "SE_0 gọi đủ vòng 2 (AC=2 ∈ [1..3] → Alive=CORRECT). FailedAliveCnt giảm 1→0 [SWS_WdgM_00300] → cả Local & Global Status tự phục hồi về OK!",
        exec: () => {
          simState.clockMs = 32;
          api_WdgM_CheckpointReached(0, 0);
          simState.clockMs = 36;
          api_WdgM_CheckpointReached(0, 1);
          simState.clockMs = 38;
          api_WdgM_CheckpointReached(0, 2);
          simState.clockMs = 30;
          api_WdgM_MainFunction();
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Đặt FailedAliveRefCycleTol = 0 (Mất khả năng FAILED → EXPIRED ngay)",
        run: () => {
          ecucConfig.WdgMFailedAliveSupervisionRefCycleTol = 0;
          simState.entities[0].alive.ac = 0;
          simState.entities[0].alive.sc = 1;
          api_WdgM_MainFunction();
        }
      },
      {
        label: "🧪 Mở rộng WdgMMinMargin = 2 (Cho phép AC=0 vẫn hợp lệ)",
        run: () => {
          ecucConfig.WdgMMinMargin = 2;
          simState.entities[0].alive.ac = 0;
          simState.entities[0].alive.sc = 1;
          api_WdgM_MainFunction();
        }
      },
      {
        label: "🧪 Bỏ qua thêm 1 kỳ nữa khi đang FAILED (Vượt Tol → EXPIRED)",
        run: () => {
          simState.entities[0].alive.ac = 0;
          simState.entities[0].alive.sc = 1;
          api_WdgM_MainFunction();
        }
      }
    ]
  },

  {
    id: "S3",
    group: "Nhóm 1: Alive Supervision & Tolerance",
    title: "S3: Dư Xung (Babbling Task) & Vượt Tolerance → Kẹt EXPIRED + FirstExpiredSEID",
    summary: "Mô phỏng lỗi Babbling Task (AC=5 > EAI+MaxMargin=3) và vượt dung sai FailedAliveTol (2 > 1): SE_0 rơi vào LOCAL_STATUS_EXPIRED (0x02), chốt cứng WdgM_FirstExpiredSEID = 0 và không thể tự phục hồi.",
    setup: () => {
      resetConfigToBase({ WdgMExpectedAliveIndications: 2, WdgMSupervisionReferenceCycle: 2, WdgMMaxMargin: 1, WdgMFailedAliveSupervisionRefCycleTol: 1, SE1_AliveEnabled: false });
      api_WdgM_Init(true, "FAST_MODE");
      simState.apiTrace = [];
    },
    steps: [
      {
        title: "Lỗi Babbling Task — SE_0 bắn liên tiếp 5 xung CP_0",
        desc: "Task bị kẹt vòng lặp gọi CheckpointReached(0, CP_0) tới 5 lần (AC=5 > giới hạn trên 3).",
        exec: () => {
          ecucConfig.SE0_DeadlineEnabled = false;
          ecucConfig.SE0_InternalGraphEnabled = false;
          for (let i = 0; i < 5; i++) {
            simState.clockMs += 1;
            api_WdgM_CheckpointReached(0, 0);
          }
        }
      },
      {
        title: "Kỳ tham chiếu 1 (t=20ms) — Bắt Lỗi Dư Xung → LOCAL_FAILED (1/1)",
        desc: "Sau 2 chu kỳ MainFunction, WdgM thấy AC(5) > 3 → Alive=INCORRECT, FailedAliveCnt=1 ≤ Tol(1) → SE_0 vào FAILED.",
        exec: () => {
          simState.clockMs = 0;
          api_WdgM_MainFunction();
          api_WdgM_MainFunction();
        }
      },
      {
        title: "Kỳ tham chiếu 2 (t=40ms) — Tiếp Tục Lỗi → Vượt Tol → LOCAL_EXPIRED",
        desc: "Sang kỳ 2 tiếp tục sai (AC=0): FailedCnt=2 > Tol(1) [SWS_WdgM_00204] → SE_0 rơi vào EXPIRED (Bit 1=1), chốt WdgM_FirstExpiredSEID=0 (~0=0xFF)!",
        exec: () => {
          api_WdgM_MainFunction();
          api_WdgM_MainFunction();
        }
      },
      {
        title: "Thử Chạy Đúng Lại Sau Khi EXPIRED — Vẫn Kẹt Vĩnh Viễn!",
        desc: "Dù SE_0 gửi lại đúng 2 xung CP_0 trong kỳ kế tiếp, theo SWS_WdgM_00205 thực thể đã EXPIRED KHÔNG BAO GIỜ tự thoát về OK!",
        exec: () => {
          api_WdgM_CheckpointReached(0, 0);
          api_WdgM_CheckpointReached(0, 0);
          api_WdgM_MainFunction();
          api_WdgM_MainFunction();
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Cho SE_1 lỗi EXPIRED sau SE_0 (Kiểm chứng FirstExpiredSEID giữ nguyên 0)",
        run: () => {
          ecucConfig.SE1_AliveEnabled = true;
          ecucConfig.SE1_FailedAliveTol = 0;
          simState.entities[1].alive.ac = 0;
          api_WdgM_MainFunction();
          api_WdgM_GetFirstExpiredSEID();
        }
      },
      {
        label: "🧪 Gọi WdgM_GetFirstExpiredSEID() kiểm tra double-inverted RAM",
        run: () => {
          api_WdgM_GetFirstExpiredSEID();
        }
      },
      {
        label: "🧪 Tăng WdgMMaxMargin = 4 rồi reset chạy 5 xung (Không còn bắt lỗi)",
        run: () => {
          ecucConfig.WdgMMaxMargin = 4;
          api_WdgM_Init(true, "FAST_MODE");
          ecucConfig.SE0_DeadlineEnabled = false;
          ecucConfig.SE0_InternalGraphEnabled = false;
          for (let i = 0; i < 5; i++) api_WdgM_CheckpointReached(0, 0);
          api_WdgM_MainFunction();
          api_WdgM_MainFunction();
        }
      }
    ]
  },

  // -------------------- NHOM 2: DEADLINE SUPERVISION & TIMEOUT --------------------
  {
    id: "S4",
    group: "Nhóm 2: Deadline Supervision & Timeout",
    title: "S4: Giám Sát Thời Hạn Deadline Hợp Lệ (Tmin ≤ Δt ≤ Tmax) Qua OsCounter",
    summary: "Theo dõi cơ chế bấm giờ từng mili-giây bằng OsCounter giữa CP_0 (Start) và CP_1 (Stop) với ngưỡng [2ms .. 8ms].",
    setup: () => {
      resetConfigToBase({ WdgMDeadlineMin: 2, WdgMDeadlineMax: 8, SE0_AliveEnabled: false, SE1_AliveEnabled: false });
      api_WdgM_Init(true, "FAST_MODE");
      simState.apiTrace = [];
    },
    steps: [
      {
        title: "Tại t = 2ms: Gọi CP_0_Init (Bấm Giờ Deadline Start)",
        desc: "WdgM gọi GetCounterValue(OsCounter) lưu TimestampStart = 2ms và bật cờ deadlinePending = TRUE [SWS_WdgM_00228].",
        exec: () => {
          simState.clockMs = 2;
          api_WdgM_CheckpointReached(0, 0);
        }
      },
      {
        title: "Tại t = 5ms (+3ms): Đang Thực Thi Toán Học Trong Cửa Sổ [2..8ms]",
        desc: "OsCounter tiến thêm +3ms. Đồng hồ đo tức thời đang hiển thị Δt = 3ms (nằm trong ngưỡng hợp lệ).",
        exec: () => {
          simState.clockMs = 5;
          simState.wdgIf.intRemainingMs = Math.max(0, simState.wdgIf.intRemainingMs - 3);
        }
      },
      {
        title: "Tại t = 7ms: Gọi CP_1_Run (Chốt Deadline Stop: Δt = 5ms)",
        desc: "Ngay bên trong WdgM_CheckpointReached(0, CP_1), WdgM tính Δt = 7 - 2 = 5ms ∈ [2, 8]ms → DEADLINE_CORRECT (Bit 5 = 1) [SWS_WdgM_00229]!",
        exec: () => {
          simState.clockMs = 7;
          api_WdgM_CheckpointReached(0, 1);
        }
      },
      {
        title: "Tại t = 10ms: Hoàn Tất CP_2 & Chạy WdgM_MainFunction()",
        desc: "Đóng Logical tại CP_2 rồi chạy WdgM_MainFunction(): SE_0 và Global Status giữ nguyên OK (0x00).",
        exec: () => {
          simState.clockMs = 8;
          api_WdgM_CheckpointReached(0, 2);
          simState.clockMs = 0;
          api_WdgM_MainFunction();
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Bấm CP_1 đúng biên dưới Δt = 2ms (= Tmin)",
        run: () => {
          api_WdgM_Init(true, "FAST_MODE");
          simState.clockMs = 1;
          api_WdgM_CheckpointReached(0, 0);
          simState.clockMs = 3;
          api_WdgM_CheckpointReached(0, 1);
        }
      },
      {
        label: "🧪 Bấm CP_1 đúng biên trên Δt = 8ms (= Tmax)",
        run: () => {
          api_WdgM_Init(true, "FAST_MODE");
          simState.clockMs = 1;
          api_WdgM_CheckpointReached(0, 0);
          simState.clockMs = 9;
          api_WdgM_CheckpointReached(0, 1);
        }
      },
      {
        label: "🧪 Gọi lại CP_0 liên tiếp khi đang đo Deadline",
        run: () => {
          simState.clockMs += 2;
          api_WdgM_CheckpointReached(0, 0);
        }
      }
    ]
  },

  {
    id: "S5",
    group: "Nhóm 2: Deadline Supervision & Timeout",
    title: "S5: Vi Phạm Deadline (Quá Sớm / Quá Muộn / Timeout Detection) → Nhảy Thẳng EXPIRED",
    summary: "Chứng minh quy tắc Zero-Tolerance của Deadline Supervision: không đi qua trạng thái FAILED mà nhảy thẳng từ OK lên EXPIRED khi Δt > Tmax, Δt < Tmin hoặc treo quá hạn trong MainFunction.",
    setup: () => {
      resetConfigToBase({ WdgMDeadlineMin: 2, WdgMDeadlineMax: 8, WdgMEnableDeadlineTimeoutDetection: true, SE0_AliveEnabled: false, SE1_AliveEnabled: false });
      api_WdgM_Init(true, "FAST_MODE");
      simState.apiTrace = [];
    },
    steps: [
      {
        title: "Tại t = 1ms: Bắt Đầu Đo Deadline (CP_0_Init)",
        desc: "SE_0 ghi nhận t_start = 1ms, kỳ vọng hoàn tất trước t = 9ms (Tmax = 8ms).",
        exec: () => {
          simState.clockMs = 1;
          api_WdgM_CheckpointReached(0, 0);
        }
      },
      {
        title: "Tại t = 11ms: Task Bị Preempt Trễ → Gọi CP_1_Run (Δt = 10ms > 8ms)",
        desc: "Ngay khi gọi CP_1, WdgM tính Δt = 11 - 1 = 10ms > Tmax(8ms) → lập tức hạ Bit 5 (DEADLN_RES = 0) báo lỗi Deadline!",
        exec: () => {
          simState.clockMs = 11;
          api_WdgM_CheckpointReached(0, 1);
        }
      },
      {
        title: "Tại WdgM_MainFunction() — Nhảy Thẳng Lên EXPIRED (Bỏ Qua FAILED!)",
        desc: "Vì Deadline có dung sai = 0 [SWS_WdgM_00202], SE_0 nhảy thẳng từ OK (0x00) lên LOCAL_STATUS_EXPIRED (0x02) và chốt FirstExpiredSEID = 0!",
        exec: () => {
          simState.clockMs = 10;
          api_WdgM_MainFunction();
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Chạy quá sớm Δt = 1ms < Tmin(2ms) (Lỗi Under-run)",
        run: () => {
          api_WdgM_Init(true, "FAST_MODE");
          ecucConfig.SE0_AliveEnabled = false; ecucConfig.SE1_AliveEnabled = false;
          simState.clockMs = 1; api_WdgM_CheckpointReached(0, 0);
          simState.clockMs = 2; api_WdgM_CheckpointReached(0, 1);
          simState.clockMs = 0; api_WdgM_MainFunction();
        }
      },
      {
        label: "🧪 Treo Task sau CP_0 (Timeout Detection = TRUE bắt ngay tại MainFn)",
        run: () => {
          api_WdgM_Init(true, "FAST_MODE");
          ecucConfig.WdgMEnableDeadlineTimeoutDetection = true;
          ecucConfig.SE0_AliveEnabled = false; ecucConfig.SE1_AliveEnabled = false;
          simState.clockMs = 1; api_WdgM_CheckpointReached(0, 0);
          simState.clockMs = 0; api_WdgM_MainFunction(); // +10ms -> elapsed=9 > 8
        }
      },
      {
        label: "🧪 Tắt DeadlineTimeoutDetection = FALSE rồi treo sau CP_0 (Nguy hiểm!)",
        run: () => {
          api_WdgM_Init(true, "FAST_MODE");
          ecucConfig.WdgMEnableDeadlineTimeoutDetection = false;
          ecucConfig.SE0_AliveEnabled = false; ecucConfig.SE1_AliveEnabled = false;
          simState.clockMs = 1; api_WdgM_CheckpointReached(0, 0);
          simState.clockMs = 0; api_WdgM_MainFunction();
        }
      }
    ]
  },

  // -------------------- NHOM 3: LOGICAL SUPERVISION --------------------
  {
    id: "S6",
    group: "Nhóm 3: Logical Supervision (Internal & External Graph)",
    title: "S6: Đồ Thị Luồng Nội Bộ (Internal Graph: CP0 → CP1 → CP2) & Bắt Lỗi Nhảy Cóc",
    summary: "Giám sát thứ tự thực thi câu lệnh bên trong SE_0 theo đồ thị CP0 → CP1 → CP2 và phát hiện ngay lập tức lỗi nhảy cóc CP0 → CP2.",
    setup: () => {
      resetConfigToBase({ SE0_AliveEnabled: false, SE1_AliveEnabled: false, SE0_DeadlineEnabled: false, SE0_InternalGraphEnabled: true, ValidInternalTransitions: "CP0->CP1, CP1->CP2" });
      api_WdgM_Init(true, "FAST_MODE");
      simState.apiTrace = [];
    },
    steps: [
      {
        title: "Bước 1: Gọi Đúng Initial Checkpoint (CP_0)",
        desc: "Khi ActivityFlag=0, SE_0 gọi CP_0 → Hợp lệ! Bật Bit 3 (GRAPH_ACTV=1), lưu LastCP = CP_0 [SWS_WdgM_00273].",
        exec: () => {
          simState.clockMs = 2;
          api_WdgM_CheckpointReached(0, 0);
        }
      },
      {
        title: "Bước 2 (Lỗi Nhảy Cóc): Gọi Thẳng CP_2 Bỏ Qua CP_1!",
        desc: "Giả lập lỗi phần mềm nhảy qua bước kiểm tra an toàn CP_1 để tới thẳng CP_2. WdgM tra bảng thấy cạnh CP0->CP2 KHÔNG hợp lệ → hạ ngay Bit 4 (LOGICAL_OK = 0)!",
        exec: () => {
          simState.clockMs = 5;
          api_WdgM_CheckpointReached(0, 2);
        }
      },
      {
        title: "Bước 3: WdgM_MainFunction() Đưa Thẳng Lên EXPIRED (0x02)",
        desc: "Logical Supervision có dung sai bằng 0 → SE_0 chuyển thẳng sang WDGM_LOCAL_STATUS_EXPIRED và chốt FirstExpiredSEID = 0 [SWS_WdgM_00252]!",
        exec: () => {
          simState.clockMs = 0;
          api_WdgM_MainFunction();
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Bấm thẳng CP_1 khi Graph đang Idle (Lỗi sai Initial Checkpoint)",
        run: () => {
          api_WdgM_Init(true, "FAST_MODE");
          ecucConfig.SE0_AliveEnabled = false; ecucConfig.SE1_AliveEnabled = false; ecucConfig.SE0_DeadlineEnabled = false;
          api_WdgM_CheckpointReached(0, 1);
          api_WdgM_MainFunction();
        }
      },
      {
        label: "🧪 Thêm cạnh 'CP0->CP2' vào ValidInternalTransitions rồi thử lại",
        run: () => {
          ecucConfig.ValidInternalTransitions = "CP0->CP1, CP1->CP2, CP0->CP2";
          api_WdgM_Init(true, "FAST_MODE");
          ecucConfig.SE0_AliveEnabled = false; ecucConfig.SE1_AliveEnabled = false; ecucConfig.SE0_DeadlineEnabled = false;
          api_WdgM_CheckpointReached(0, 0);
          api_WdgM_CheckpointReached(0, 2);
          api_WdgM_MainFunction();
        }
      },
      {
        label: "🧪 Chạy đúng 1 vòng CP_0 → CP_1 → CP_2 (ActivityFlag đóng về 0)",
        run: () => {
          api_WdgM_Init(true, "FAST_MODE");
          ecucConfig.SE0_AliveEnabled = false; ecucConfig.SE1_AliveEnabled = false; ecucConfig.SE0_DeadlineEnabled = false;
          api_WdgM_CheckpointReached(0, 0);
          api_WdgM_CheckpointReached(0, 1);
          api_WdgM_CheckpointReached(0, 2);
          api_WdgM_MainFunction();
        }
      }
    ]
  },

  {
    id: "S7",
    group: "Nhóm 3: Logical Supervision (Internal & External Graph)",
    title: "S7: Đồ Thị Liên Thực Thể (External Graph: SE0 Brake → SE1 EngineTrq)",
    summary: "Bảo vệ chuỗi xử lý đa SWC: SWC_BrakeCtrl (SE_0) phải đi từ SE0_CP0 → SE0_CP1 rồi mới bàn giao sang SWC_EngineTrq (SE_1) chạy SE1_CP0 → SE1_CP1 [SWS_WdgM_00271].",
    setup: () => {
      resetConfigToBase({
        SE0_AliveEnabled: false, SE1_AliveEnabled: false, SE0_DeadlineEnabled: false, SE0_InternalGraphEnabled: false,
        ExternalGraphEnabled: true, ValidExternalTransitions: "SE0_CP0->SE0_CP1, SE0_CP1->SE1_CP0, SE1_CP0->SE1_CP1"
      });
      api_WdgM_Init(true, "FAST_MODE");
      simState.apiTrace = [];
    },
    steps: [
      {
        title: "Bước 1: SE_0 Bắt Đầu Chuỗi Liên SWC (SE0_CP0 → SE0_CP1)",
        desc: "SWC_BrakeCtrl khởi tạo External Graph tại SE0_CP0 (ExtActivityFlag=TRUE) rồi chuyển tiếp hợp lệ sang SE0_CP1.",
        exec: () => {
          simState.clockMs = 2;
          api_WdgM_CheckpointReached(0, 0);
          simState.clockMs = 4;
          api_WdgM_CheckpointReached(0, 1);
        }
      },
      {
        title: "Bước 2: Bàn Giao Sang SE_1 (SE0_CP1 → SE1_CP0 → SE1_CP1)",
        desc: "SWC_EngineTrq nhận bàn giao chạy SE1_CP0 → SE1_CP1 (Final), khép lại chuỗi External Graph hợp lệ (ExtGraph = OK).",
        exec: () => {
          simState.clockMs = 6;
          api_WdgM_CheckpointReached(1, 0);
          simState.clockMs = 8;
          api_WdgM_CheckpointReached(1, 1);
          simState.clockMs = 0;
          api_WdgM_MainFunction();
        }
      },
      {
        title: "Bước 3 (Vi Phạm Đa SWC): SE_1 Gọi SE1_CP0 Khi SE_0 Mới Tới SE0_CP0!",
        desc: "Bắt đầu vòng mới tại SE0_CP0 nhưng SE_1 chen ngang gọi SE1_CP0 trước khi SE_0 qua SE0_CP1 → Bắt lỗi BAD EXT: SE0_CP0->SE1_CP0 → EXPIRED!",
        exec: () => {
          simState.clockMs = 12;
          api_WdgM_CheckpointReached(0, 0);
          simState.clockMs = 13;
          api_WdgM_CheckpointReached(1, 0);
          simState.clockMs = 10;
          api_WdgM_MainFunction();
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Chạy lại trọn vẹn chuỗi hợp lệ SE0_CP0 → SE0_CP1 → SE1_CP0 → SE1_CP1",
        run: () => {
          api_WdgM_Init(true, "FAST_MODE");
          ecucConfig.SE0_AliveEnabled = false; ecucConfig.SE1_AliveEnabled = false; ecucConfig.SE0_DeadlineEnabled = false; ecucConfig.SE0_InternalGraphEnabled = false;
          ecucConfig.ExternalGraphEnabled = true;
          api_WdgM_CheckpointReached(0, 0);
          api_WdgM_CheckpointReached(0, 1);
          api_WdgM_CheckpointReached(1, 0);
          api_WdgM_CheckpointReached(1, 1);
          api_WdgM_MainFunction();
        }
      },
      {
        label: "🧪 Gọi SE_1 (SE1_CP0) khi External Graph chưa mở (ActivityFlag=0)",
        run: () => {
          api_WdgM_Init(true, "FAST_MODE");
          ecucConfig.ExternalGraphEnabled = true;
          api_WdgM_CheckpointReached(1, 0);
          api_WdgM_MainFunction();
        }
      },
      {
        label: "🧪 Cho phép cạnh tắt SE0_CP0->SE1_CP0 trong ValidExternalTransitions",
        run: () => {
          ecucConfig.ValidExternalTransitions = "SE0_CP0->SE0_CP1, SE0_CP1->SE1_CP0, SE1_CP0->SE1_CP1, SE0_CP0->SE1_CP0";
          api_WdgM_Init(true, "FAST_MODE");
          ecucConfig.SE0_AliveEnabled = false; ecucConfig.SE1_AliveEnabled = false; ecucConfig.SE0_DeadlineEnabled = false; ecucConfig.SE0_InternalGraphEnabled = false;
          ecucConfig.ExternalGraphEnabled = true;
          api_WdgM_CheckpointReached(0, 0);
          api_WdgM_CheckpointReached(1, 0);
          api_WdgM_CheckpointReached(1, 1);
          api_WdgM_MainFunction();
        }
      }
    ]
  },

  // -------------------- NHOM 4: GLOBAL STATUS, WDGIF, RESET, SETMODE & DET --------------------
  {
    id: "S8",
    group: "Nhóm 4: Global Status, WdgIf, Partition/MCU Reset, SetMode & DET/DEM",
    title: "S8: Leo Thang Global Status (OK → EXPIRED → STOPPED), Cắt WdgIf(0) & Báo DEM",
    summary: "Theo dõi chu kỳ ân hạn WdgMExpiredSupervisionCycleTol=2 (giữ hệ thống ở GLOBAL_EXPIRED để kịp ghi NvM), sau đó rơi vào STOPPED, cắt WdgIf_SetTriggerCondition(0) và báo DEM.",
    setup: () => {
      resetConfigToBase({ WdgMExpiredSupervisionCycleTol: 2, SE0_AliveEnabled: false, SE1_AliveEnabled: false, SE0_DeadlineEnabled: false });
      api_WdgM_Init(true, "FAST_MODE");
      simState.apiTrace = [];
    },
    steps: [
      {
        title: "t = 10ms: SE_0 Lỗi Logical → GLOBAL_EXPIRED (Ân Hạn ExpCnt = 0/2)",
        desc: "SE_0 vào EXPIRED, chốt FirstExpiredSEID=0. Vì Tol=2 > 0, Global vào EXPIRED (Bit 1=1), VẪN nuôi WdgIf(20ms) để kịp lưu lỗi!",
        exec: () => {
          api_WdgM_CheckpointReached(0, 0);
          api_WdgM_CheckpointReached(0, 2); // Skip CP1 -> Logical err
          api_WdgM_MainFunction();
        }
      },
      {
        title: "t = 20ms & t = 30ms: Đếm Hết 2 Chu Kỳ Ân Hạn (ExpCnt 1/2 → 2/2)",
        desc: "WdgM_MainFunction() tiếp tục đếm ân hạn (1 → 2 ≤ 2) và giữ Watchdog sống thêm 20ms.",
        exec: () => {
          api_WdgM_MainFunction();
          api_WdgM_MainFunction();
        }
      },
      {
        title: "t = 40ms: Vượt Ân Hạn (3 > 2) → GLOBAL_STOPPED, Cắt WdgIf(0) & Báo DEM!",
        desc: "Chuyển sang STOPPED (Bit 1=1, Bit 0=1): hạ Bit 6 (WDGIF_TRIG=0), gọi WdgIf_SetTriggerCondition(0, 0) [SWS_WdgM_00223] & Dem_SetEventStatus(WDGM_E_MONITORING, FAILED) [SWS_WdgM_00375]!",
        exec: () => {
          api_WdgM_MainFunction();
        }
      },
      {
        title: "t = 50ms: Phần Cứng Watchdog Hết Giờ (0 ms) → HW_WATCHDOG_RESET!",
        desc: "Vì không còn xung nuôi từ WdgM, bộ đếm phần cứng Watchdog giảm về 0ms và kích hoạt Reset cứng ECU!",
        exec: () => {
          api_WdgM_MainFunction();
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Đặt ExpiredSupervisionCycleTol = 0 (Nhảy thẳng OK → STOPPED!)",
        run: () => {
          ecucConfig.WdgMExpiredSupervisionCycleTol = 0;
          api_WdgM_Init(true, "FAST_MODE");
          ecucConfig.SE0_AliveEnabled = false; ecucConfig.SE1_AliveEnabled = false; ecucConfig.SE0_DeadlineEnabled = false;
          api_WdgM_CheckpointReached(0, 0);
          api_WdgM_CheckpointReached(0, 2);
          api_WdgM_MainFunction();
        }
      },
      {
        label: "🧪 Tăng ExpiredSupervisionCycleTol = 4 (Kéo dài ân hạn lên 40ms)",
        run: () => {
          ecucConfig.WdgMExpiredSupervisionCycleTol = 4;
          api_WdgM_Init(true, "FAST_MODE");
          ecucConfig.SE0_AliveEnabled = false; ecucConfig.SE1_AliveEnabled = false; ecucConfig.SE0_DeadlineEnabled = false;
          api_WdgM_CheckpointReached(0, 0);
          api_WdgM_CheckpointReached(0, 2);
          api_WdgM_MainFunction();
        }
      },
      {
        label: "🧪 Bật WdgMImmediateReset = TRUE ngay khi vào STOPPED",
        run: () => {
          ecucConfig.WdgMImmediateReset = true;
          ecucConfig.WdgMExpiredSupervisionCycleTol = 0;
          api_WdgM_Init(true, "FAST_MODE");
          ecucConfig.SE0_AliveEnabled = false; ecucConfig.SE1_AliveEnabled = false; ecucConfig.SE0_DeadlineEnabled = false;
          api_WdgM_CheckpointReached(0, 0);
          api_WdgM_CheckpointReached(0, 2);
          api_WdgM_MainFunction();
        }
      }
    ]
  },

  {
    id: "S9",
    group: "Nhóm 4: Global Status, WdgIf, Partition/MCU Reset, SetMode & DET/DEM",
    title: "S9: OS Partition Reset vs Immediate MCU Reset & Đọc Lại FirstExpiredSEID",
    summary: "So sánh cơ chế cô lập khởi động lại riêng phân vùng OS (BswM_WdgM_RequestPartitionReset) để cứu ECU với cơ chế Mcu_PerformReset() và đọc lại thủ phạm FirstExpiredSEID.",
    setup: () => {
      resetConfigToBase({ WdgMPartitionResetEnabled: true, WdgMImmediateReset: false, SE0_AliveEnabled: false, SE1_AliveEnabled: false, SE0_DeadlineEnabled: false });
      api_WdgM_Init(true, "FAST_MODE");
      simState.apiTrace = [];
    },
    steps: [
      {
        title: "Nhánh A (Partition Reset = TRUE): SE_0 Lỗi → Cô Lập Khởi Động Lại OsApp_Brake",
        desc: "SE_0 rơi vào EXPIRED và chốt FirstExpiredSEID=0, nhưng nhờ WdgMPartitionResetEnabled=TRUE, WdgM gọi BswM_WdgM_RequestPartitionReset(OsApp_ASILD_Brake) đưa SE_0 về OK mà không làm sập ECU!",
        exec: () => {
          api_WdgM_CheckpointReached(0, 0);
          api_WdgM_CheckpointReached(0, 2);
          api_WdgM_MainFunction();
        }
      },
      {
        title: "Nhánh B (Immediate MCU Reset = TRUE): Tắt Partition Reset → Gây Lỗi & Mcu_PerformReset()",
        desc: "Tắt Partition Reset, bật ImmediateReset=TRUE (Tol=0). Lỗi xảy ra khiến WdgM bật Bit 3 (MCU_IMM_RST=1) gọi thẳng Mcu_PerformReset() [SWS_WdgM_00134]!",
        exec: () => {
          ecucConfig.WdgMPartitionResetEnabled = false;
          ecucConfig.WdgMImmediateReset = true;
          ecucConfig.WdgMExpiredSupervisionCycleTol = 0;
          api_WdgM_CheckpointReached(0, 0);
          api_WdgM_CheckpointReached(0, 2);
          api_WdgM_MainFunction();
        }
      },
      {
        title: "Hậu Reset: Khởi Động Lại & Gọi WdgM_GetFirstExpiredSEID()",
        desc: "Sau Reset, BSW gọi WdgM_Init() rồi đọc WdgM_GetFirstExpiredSEID() từ vùng NO_INIT_RAM: xác thực ~SEID(0xFF) hợp lệ và trả về thủ phạm SEID = 0 [SWS_WdgM_00349]!",
        exec: () => {
          api_WdgM_Init(true, "FAST_MODE");
          api_WdgM_GetFirstExpiredSEID();
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Bật PartitionReset = TRUE và gây lỗi lại cho SE_0",
        run: () => {
          ecucConfig.WdgMPartitionResetEnabled = true;
          api_WdgM_Init(true, "FAST_MODE");
          ecucConfig.SE0_AliveEnabled = false; ecucConfig.SE1_AliveEnabled = false; ecucConfig.SE0_DeadlineEnabled = false;
          api_WdgM_CheckpointReached(0, 0);
          api_WdgM_CheckpointReached(0, 2);
          api_WdgM_MainFunction();
        }
      },
      {
        label: "🧪 Giả lập hỏng RAM (~SEID bị nhiễu) khi đọc GetFirstExpiredSEID",
        run: () => {
          simState.firstExpired.latched = true;
          simState.firstExpired.seId = 0;
          simState.firstExpired.invSeId = 0xAA; // Corrupted!
          api_WdgM_GetFirstExpiredSEID();
        }
      },
      {
        label: "🧪 Xóa vùng RAM FirstExpiredSEID (Power-On Reset)",
        run: () => {
          api_ClearFirstExpiredRAM();
        }
      }
    ]
  },

  {
    id: "S10",
    group: "Nhóm 4: Global Status, WdgIf, Partition/MCU Reset, SetMode & DET/DEM",
    title: "S10: Chuyển Chế Độ WdgM_SetMode (SLOW → FAST → OFF) & Phòng Vệ WdgMDefensiveBehavior",
    summary: "Điều khiển song song Internal MCU Wdg + External SBC Window Wdg theo các pha Startup (SLOW 50ms), Run (FAST 20ms) và cơ chế phòng vệ chặn OFF_MODE.",
    setup: () => {
      resetConfigToBase({ ActiveWdgMMode: "SLOW_MODE", WdgMDefensiveBehavior: true, ExternalWindowWdgEnabled: true });
      api_WdgM_Init(true, "SLOW_MODE");
      simState.apiTrace = [];
    },
    steps: [
      {
        title: "Pha Startup (SLOW_MODE): Cả 3 Thực Thể (Gồm SE_2 BSW_CanDiag) Đều Active (50ms)",
        desc: "Trong SLOW_MODE, WdgIf đặt 50ms cho cả MCU Wdg & SBC Window Wdg; SE_2 đang ở WDGM_LOCAL_STATUS_OK.",
        exec: () => {
          api_WdgM_CheckpointReached(2, 0);
          api_WdgM_MainFunction();
        }
      },
      {
        title: "Pha Vận Hành: Gọi WdgM_SetMode(FAST_MODE) → SE_2 Tự Tắt Sang DEACTIVATED",
        desc: "BswM chuyển sang FAST_MODE: WdgIf chuyển cửa sổ hẹp 20ms, còn SE_2 tự động chuyển sang DEACTIVATED (0x04) [SWS_WdgM_00207].",
        exec: () => {
          api_WdgM_SetMode("FAST_MODE");
        }
      },
      {
        title: "Pha Phòng Vệ ASIL: Cố Gọi WdgM_SetMode(OFF_MODE) Khi DefensiveBehavior=TRUE",
        desc: "WdgM chặn đứng lệnh tắt Watchdog (return E_NOT_OK) và bắn DET WDGM_E_DISABLE_NOT_ALLOWED (0x15) [SWS_WdgM_00031]!",
        exec: () => {
          api_WdgM_SetMode("OFF_MODE");
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Tắt WdgMDefensiveBehavior = FALSE rồi gọi WdgM_SetMode(OFF_MODE)",
        run: () => {
          ecucConfig.WdgMDefensiveBehavior = false;
          api_WdgM_SetMode("OFF_MODE");
        }
      },
      {
        label: "🧪 Bật SimulateWdgIfSetModeFail = TRUE rồi đổi Mode (Báo DEM & STOPPED)",
        run: () => {
          ecucConfig.SimulateWdgIfSetModeFail = true;
          api_WdgM_SetMode("SLOW_MODE");
        }
      },
      {
        label: "🧪 Giả lập kích xung quá sớm vào Closed Window (< 5ms) của SBC Wdg",
        run: () => {
          ecucConfig.ExternalWindowWdgEnabled = true;
          ecucConfig.WindowWdgClosedWindowMs = 5;
          ecucConfig.WdgMSupervisionCycle = 2; // < 5ms!
          simState.wdgIf.lastTriggerMs = simState.clockMs;
          api_WdgM_MainFunction();
        }
      }
    ]
  },

  {
    id: "S11",
    group: "Nhóm 4: Global Status, WdgIf, Partition/MCU Reset, SetMode & DET/DEM",
    title: "S11: Reset Khẩn Cấp WdgM_PerformReset() & Tắt An Toàn WdgM_DeInit()",
    summary: "Kiểm chứng 2 API điều khiển đặc biệt: yêu cầu Reset ECU tức thì bất chấp bộ đếm dung sai qua WdgM_PerformReset() và quy trình tắt WdgM_DeInit().",
    setup: () => {
      resetConfigToBase({ WdgMDefensiveBehavior: false });
      api_WdgM_Init(true, "FAST_MODE");
      simState.apiTrace = [];
    },
    steps: [
      {
        title: "Bước 1: Thử Tắt An Toàn WdgM_DeInit() Khi Hệ Thống Đang OK",
        desc: "Khi DefensiveBehavior=FALSE và GlobalStatus=OK, lời gọi WdgM_DeInit() đưa toàn ECU về GLOBAL_DEACTIVATED (0x04) & tắt Watchdog [SWS_WdgM_00261].",
        exec: () => {
          api_WdgM_DeInit();
        }
      },
      {
        title: "Bước 2: Khởi Tạo Lại WdgM_Init() Để Kiểm Thử WdgM_PerformReset()",
        desc: "Hệ thống hoạt động bình thường trở lại ở FAST_MODE (Global = OK).",
        exec: () => {
          api_WdgM_Init(true, "FAST_MODE");
        }
      },
      {
        title: "Bước 3: Gọi Khẩn Cấp WdgM_PerformReset() → Cắt Xung & Reset Tức Thì!",
        desc: "Bỏ qua mọi Tolerance, Global Status chuyển thẳng STOPPED (0x03), bật Bit 3 (MCU_IMM_RST=1) và cắt WdgIf_SetTriggerCondition(0) [SWS_WdgM_00133]!",
        exec: () => {
          api_WdgM_PerformReset();
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Thử gọi WdgM_DeInit() khi có SE đang EXPIRED (Bị từ chối theo SWS_WdgM_00286)",
        run: () => {
          api_WdgM_Init(true, "FAST_MODE");
          ecucConfig.WdgMDefensiveBehavior = false;
          ecucConfig.WdgMExpiredSupervisionCycleTol = 2;
          api_WdgM_CheckpointReached(0, 0);
          api_WdgM_CheckpointReached(0, 2);
          api_WdgM_MainFunction();
          api_WdgM_DeInit();
        }
      },
      {
        label: "🧪 Bật DefensiveBehavior = TRUE rồi gọi WdgM_DeInit() (Báo DET 0x15)",
        run: () => {
          api_WdgM_Init(true, "FAST_MODE");
          ecucConfig.WdgMDefensiveBehavior = true;
          api_WdgM_DeInit();
        }
      },
      {
        label: "🧪 Bấm WdgM_PerformReset() ngay lập tức",
        run: () => {
          api_WdgM_PerformReset();
        }
      }
    ]
  },

  {
    id: "S12",
    group: "Nhóm 4: Global Status, WdgIf, Partition/MCU Reset, SetMode & DET/DEM",
    title: "S12: Bảo Vệ Tham Số & Bẫy Lỗi DET (UNINIT, SEID, CPID, SEDEACTIVATED, INV_POINTER)",
    summary: "Kiểm thử đầy đủ các điều kiện phòng vệ Development Error Tracer (ModuleId = 13) của WdgM theo chuẩn AUTOSAR R23-11.",
    setup: () => {
      resetConfigToBase({ WdgMDevErrorDetect: true, ActiveWdgMMode: "FAST_MODE" });
      api_WdgM_Init(true, "FAST_MODE");
      simState.apiTrace = [];
    },
    steps: [
      {
        title: "Lỗi 1 — WDGM_E_SEDEACTIVATED (0x1F): SE_2 Gọi Checkpoint Khi Đang Tắt",
        desc: "Trong FAST_MODE, SE_2 (BSW_CanDiag) đang ở DEACTIVATED. Gọi WdgM_CheckpointReached(2, 0) lập tức bắn DET 0x1F [SWS_WdgM_00319]!",
        exec: () => {
          api_WdgM_CheckpointReached(2, 0);
        }
      },
      {
        title: "Lỗi 2 — WDGM_E_PARAM_SEID (0x13) & WDGM_E_CPID (0x16)",
        desc: "Truyền SEID=99 không tồn tại (0x13) và truyền CPID=55 không thuộc SE_0 (0x16) [SWS_WdgM_00284].",
        exec: () => {
          api_WdgM_CheckpointReached(99, 0);
          api_WdgM_CheckpointReached(0, 55);
        }
      },
      {
        title: "Lỗi 3 — WDGM_E_INV_POINTER (0x14) & WDGM_E_UNINIT (0x10)",
        desc: "Kiểm tra NULL_PTR (0x14), sau đó tắt WdgMInitialized=FALSE và gọi CheckpointReached(0, 0) → bắn DET WDGM_E_UNINIT (0x10)!",
        exec: () => {
          reportDet("0x0C", "WDGM_E_INV_POINTER", "0x14", "Truyền NULL_PTR vào WdgM_GetGlobalStatus(NULL_PTR).");
          api_WdgM_Init(false);
          api_WdgM_CheckpointReached(0, 0);
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Bắn thử WdgM_CheckpointReached(2, CP_0) khi FAST_MODE (Lỗi 0x1F)",
        run: () => {
          api_WdgM_Init(true, "FAST_MODE");
          api_WdgM_CheckpointReached(2, 0);
        }
      },
      {
        label: "🧪 Tắt WdgMInitialized = FALSE rồi bấm CP_0 (Lỗi 0x10)",
        run: () => {
          api_WdgM_Init(false);
          api_WdgM_CheckpointReached(0, 0);
        }
      },
      {
        label: "🧪 Bắn thử SEID = 99 & CPID = 55 (Lỗi 0x13 & 0x16)",
        run: () => {
          api_WdgM_Init(true, "FAST_MODE");
          api_WdgM_CheckpointReached(99, 0);
          api_WdgM_CheckpointReached(0, 55);
        }
      }
    ]
  }
];
