// ================= PART 4B: 14 PRE-BUILT SCENARIOS (S1-S14) & 42 1-CLICK WHAT-IF ACTIONS =================

function resetConfigToBase(overrides) {
  ecucConfig = JSON.parse(JSON.stringify(defaultConfig));
  if (overrides) Object.assign(ecucConfig, overrides);
  api_BswM_Init(true);
  if (typeof syncConfigToDOM === "function") syncConfigToDOM();
}

function fastForwardRunFullCom() {
  api_BswM_EcuM_CurrentState("ECUM_STATE_STARTUP_TWO");
  stepClockTick(10);
  api_BswM_NvM_CurrentJobMode("NVM_READ_ALL", "NVM_REQ_OK");
  stepClockTick(10);
  api_BswM_CanSM_CurrentState(0, "CANSM_BSWM_FULL_COMMUNICATION");
  api_BswM_ComM_CurrentMode(0, "COMM_FULL_COMMUNICATION");
}

function fastForwardRunReady() {
  api_BswM_EcuM_CurrentState("ECUM_STATE_STARTUP_TWO");
  stepClockTick(10);
  api_BswM_NvM_CurrentJobMode("NVM_READ_ALL", "NVM_REQ_OK");
  stepClockTick(10);
}

const SCENARIOS = [
  // ==================== NHÓM 1: STARTUP, NVM, RTE & COM_IPDUGROUP ====================
  {
    id: "S1",
    title: "S1: Boot-Up ECU 2 Pha, Đợi NvM_ReadAll() Mới Gọi Rte_Start() & AllowCom",
    summary: "S1 — Khởi động ECU Flexible: EcuM gọi BswM_Init() -> STARTUP_TWO (DEFERRED) -> NvM_ReadAll() -> Khi có NVM_REQ_OK mới gọi Rte_Start() & ComM_CommunicationAllowed(Ch0, TRUE).",
    setup: () => {
      resetConfigToBase({
        MRP_EcuM_State_Processing: "BSWM_DEFERRED",
        MRP_NvM_Job_Processing: "BSWM_DEFERRED",
        RequireNvMReadAllBeforeRteStart: true
      });
      simState.stepExplain = "S1 sẵn sàng: BswM vừa qua BswM_Init() (Bit 7 BSWM_INIT = 1). Mọi I-PDU Group = 0x00, Rte_Start = 0, ComMAllowed = 0.";
    },
    steps: [
      {
        title: "EcuM báo ECUM_STATE_STARTUP_TWO (DEFERRED)",
        desc: "EcuM gọi BswM_EcuM_CurrentState(ECUM_STATE_STARTUP_TWO). Vì cấu hình BSWM_DEFERRED, BswM bật Bit 5 (DEF_PENDING = 1) đẩy vào Deferred Queue chờ MainFunction.",
        exec: () => api_BswM_EcuM_CurrentState("ECUM_STATE_STARTUP_TWO")
      },
      {
        title: "BswM_MainFunction() kích hoạt NvM_ReadAll() & BswMTimer",
        desc: "Chu kỳ 10ms xả hàng đợi: Rule_01a chuyển FALSE->TRUE, gọi NvM_ReadAll() và khởi chạy BswMTimer_0 (Bit 1 TMR_RUN = 1) làm chốt cứu hộ nếu Flash treo.",
        exec: () => stepClockTick(10)
      },
      {
        title: "NvM hoàn tất đọc Flash -> NVM_REQ_OK",
        desc: "NvM gọi BswM_NvM_CurrentJobMode(NVM_READ_ALL, NVM_REQ_OK). Cổng MRP_NvM_ReadAll vào hàng đợi Deferred (Bit 5 = 1); Rte_Start vẫn chưa được bật!",
        exec: () => api_BswM_NvM_CurrentJobMode("NVM_READ_ALL", "NVM_REQ_OK")
      },
      {
        title: "MainFunction mở khóa Rte_Start() & ComM_CommunicationAllowed(TRUE)",
        desc: "Rule_01b chuyển FALSE->TRUE -> Thực thi AL_EnterRunMode: gọi Rte_Start() (Bit 0 Thanh A = 1), ComM_CommunicationAllowed(Ch0, TRUE) (Bit 7 Thanh B = 1) & EcuM_SetState(RUN).",
        exec: () => stepClockTick(10)
      }
    ],
    whatIfs: [
      {
        label: "🧪 1. Giả lập NvM_ReadAll bị kẹt NVM_REQ_PENDING",
        run: () => {
          resetConfigToBase({ RequireNvMReadAllBeforeRteStart: true });
          api_BswM_EcuM_CurrentState("ECUM_STATE_STARTUP_TWO");
          stepClockTick(10);
          api_BswM_NvM_CurrentJobMode("NVM_READ_ALL", "NVM_REQ_PENDING");
          stepClockTick(10);
        }
      },
      {
        label: "🧪 2. Đổi MRP_NvM_Job sang BSWM_IMMEDIATE & báo NVM_REQ_OK",
        run: () => {
          ecucConfig.MRP_NvM_Job_Processing = "BSWM_IMMEDIATE";
          syncConfigToDOM();
          api_BswM_NvM_CurrentJobMode("NVM_READ_ALL", "NVM_REQ_OK");
        }
      },
      {
        label: "🧪 3. Cho BswMTimer_0 hết hạn cứu hộ khi NvM treo",
        run: () => {
          resetConfigToBase({ BswMTimerValue: 20 });
          api_BswM_EcuM_CurrentState("ECUM_STATE_STARTUP_TWO");
          stepClockTick(10);
          stepClockTick(10);
          stepClockTick(10);
        }
      }
    ]
  },

  {
    id: "S2",
    title: "S2: ComM & CanSM FULL_COM → Mở Com_IpduGroupStart, ReceptionDM & PduR",
    summary: "S2 — Khi ECU đang ở RUN_READY (0x00), CanSM & ComM báo FULL_COM (BSWM_IMMEDIATE) -> Rule_02 (AND) chuyển TRUE -> Mở IG_0_Tx, IG_1_Rx, IG_2_DM & RPG_0_GW.",
    setup: () => {
      resetConfigToBase();
      fastForwardRunReady();
      simState.stepExplain = "S2 sẵn sàng: ECU đã chạy xong Startup (RteStarted=1, CommAllowed=1), nhưng ComM vẫn NO_COM nên Com_IpduGroupVector = 0x00.";
    },
    steps: [
      {
        title: "CanSM xác nhận phần cứng CAN đã sẵn sàng",
        desc: "CanSM gọi BswM_CanSM_CurrentState(0, CANSM_BSWM_FULL_COMMUNICATION). Tuy nhiên ComM vẫn ở NO_COM nên biểu thức AND của Rule_02 vẫn bằng FALSE.",
        exec: () => api_BswM_CanSM_CurrentState(0, "CANSM_BSWM_FULL_COMMUNICATION")
      },
      {
        title: "ComM báo COMM_FULL_COMMUNICATION (BSWM_IMMEDIATE)",
        desc: "ComM gọi BswM_ComM_CurrentMode(0, COMM_FULL_COMMUNICATION). Với BSWM_IMMEDIATE, Bit 6 (IMM_PROC=1) bật, Rule_02 nhảy FALSE->TRUE (Bit 4=1, Bit 3=1) và mở ngay Vector PDU!",
        exec: () => api_BswM_ComM_CurrentMode(0, "COMM_FULL_COMMUNICATION")
      },
      {
        title: "Kiểm tra kết quả trên Vector & ActionControlByte",
        desc: "Thanh B bật Bit 6 (IPDU_TX_ON), Bit 5 (IPDU_RX_ON), Bit 4 (RX_DM_EN), Bit 3 (PDUR_RT_EN). Vector PDU = 0xE7 (Tx, Rx, DM, Diag, NM, RPG_GW).",
        exec: () => stepClockTick(10)
      }
    ],
    whatIfs: [
      {
        label: "🧪 1. Tắt BswMPduGroupSwitchReinit = FALSE & bắn lại FULL_COM",
        run: () => {
          ecucConfig.BswMPduGroupSwitchReinit = false;
          syncConfigToDOM();
          api_BswM_ComM_CurrentMode(0, "COMM_NO_COMMUNICATION");
          api_BswM_ComM_CurrentMode(0, "COMM_FULL_COMMUNICATION");
        }
      },
      {
        label: "🧪 2. Bật EnableTriggerIpduSendAction = TRUE & tái kích hoạt Rule_02",
        run: () => {
          ecucConfig.EnableTriggerIpduSendAction = true;
          syncConfigToDOM();
          api_BswM_ComM_CurrentMode(0, "COMM_NO_COMMUNICATION");
          api_BswM_ComM_CurrentMode(0, "COMM_FULL_COMMUNICATION");
        }
      },
      {
        label: "🧪 3. Đổi Rule02_LogicalOperator sang BSWM_OR (chỉ cần 1 nguồn FULL)",
        run: () => {
          resetConfigToBase({ Rule02_LogicalOperator: "BSWM_OR" });
          fastForwardRunReady();
          api_BswM_CanSM_CurrentState(0, "CANSM_BSWM_FULL_COMMUNICATION");
        }
      }
    ]
  },

  {
    id: "S3",
    title: "S3: Chuyển SILENT_COM & NO_COM (Ngắt Tx/DM, Giữ Rx Khi SILENT_COM)",
    summary: "S3 — Minh họa sự khác biệt giữa SILENT_COM (chỉ ngắt IG_0_Tx & Rx DM, VẪN GIỮ IG_1_Rx = 1) và NO_COM (ngắt sạch toàn bộ Vector PDU về 0x00).",
    setup: () => {
      resetConfigToBase();
      fastForwardRunFullCom();
      simState.stepExplain = "S3 sẵn sàng: Kênh đang ở FULL_COM_ONLINE (Vector = 0xE7: IG_Tx, IG_Rx, IG_DM, Diag, NM, PduR đều ON).";
    },
    steps: [
      {
        title: "CanNm chuẩn bị ngủ -> ComM báo COMM_SILENT_COMMUNICATION",
        desc: "ComM gọi BswM_ComM_CurrentMode(0, COMM_SILENT_COMMUNICATION). Rule_02 lật TRUE->FALSE và Rule_03 lên TRUE: tắt IG_0_Tx (Bit 6=0) và Rx DM (Bit 4=0), nhưng GIỮ IG_1_Rx=1 (Bit 5=1)!",
        exec: () => api_BswM_ComM_CurrentMode(0, "COMM_SILENT_COMMUNICATION")
      },
      {
        title: "CanNm vào Bus-Sleep -> ComM báo COMM_NO_COMMUNICATION",
        desc: "ComM gọi BswM_ComM_CurrentMode(0, COMM_NO_COMMUNICATION). Rule_03 chuyển TRUE->FALSE kích hoạt AL_SilentFalseCheck tắt nốt IG_1_Rx, NM & PduR -> Vector = 0x00!",
        exec: () => api_BswM_ComM_CurrentMode(0, "COMM_NO_COMMUNICATION")
      },
      {
        title: "Bus thức lại -> ComM báo lại FULL_COM",
        desc: "Khi mạng thức dậy trở lại, BswM mở đồng bộ lại cả IG_0_Tx, IG_1_Rx, Rx DM & PduR Routing.",
        exec: () => api_BswM_ComM_CurrentMode(0, "COMM_FULL_COMMUNICATION")
      }
    ],
    whatIfs: [
      {
        label: "🧪 1. Đưa thẳng về SILENT_COM (Vector Tx=0, Rx=1, DM=0)",
        run: () => api_BswM_ComM_CurrentMode(0, "COMM_SILENT_COMMUNICATION")
      },
      {
        label: "🧪 2. Đưa thẳng về NO_COM (Tắt sạch Vector = 0x00)",
        run: () => api_BswM_ComM_CurrentMode(0, "COMM_NO_COMMUNICATION")
      },
      {
        label: "🧪 3. Tắt Rule02_EnableFalseActionList & chuyển SILENT_COM",
        run: () => {
          ecucConfig.Rule02_EnableFalseActionList = false;
          syncConfigToDOM();
          api_BswM_ComM_CurrentMode(0, "COMM_SILENT_COMMUNICATION");
        }
      }
    ]
  },

  {
    id: "S4",
    title: "S4: Phản Ứng Tức Thì Khi CANSM_BSWM_BUS_OFF (Cắt Khẩn Cấp Tx & DM)",
    summary: "S4 — Khi đang FULL_COM mà CanSM phát hiện Bus-Off, cổng MRP_CanSM (BSWM_IMMEDIATE) buộc Rule_02 về FALSE ngay lập tức để ngắt Tx & DM trong khi chờ phục hồi.",
    setup: () => {
      resetConfigToBase({ MRP_CanSM_Ch0_Processing: "BSWM_IMMEDIATE" });
      fastForwardRunFullCom();
      simState.stepExplain = "S4 sẵn sàng: Mạng CAN đang truyền nhận bình thường (FULL_COM_ONLINE, IG_0_Tx=1, IG_2_DM=1).";
    },
    steps: [
      {
        title: "Sự cố chập dây CAN -> CanSM báo CANSM_BSWM_BUS_OFF (IMMEDIATE)",
        desc: "CanSM gọi BswM_CanSM_CurrentState(0, CANSM_BSWM_BUS_OFF). Dù ComM vẫn báo FULL_COM, Rule_02 (AND) rơi ngay TRUE->FALSE & Rule_03 lên TRUE: cắt khẩn cấp IG_0_Tx & Rx DM!",
        exec: () => api_BswM_CanSM_CurrentState(0, "CANSM_BSWM_BUS_OFF")
      },
      {
        title: "CanSM khôi phục Bus-Off thành công -> FULL_COMMUNICATION",
        desc: "Sau chu trình L1/L2 Recovery, CanSM gọi lại BswM_CanSM_CurrentState(0, CANSM_BSWM_FULL_COMMUNICATION). Rule_02 lật FALSE->TRUE mở lại ngay IG_0_Tx & Rx DM!",
        exec: () => api_BswM_CanSM_CurrentState(0, "CANSM_BSWM_FULL_COMMUNICATION")
      }
    ],
    whatIfs: [
      {
        label: "🧪 1. Đổi MRP_CanSM sang DEFERRED rồi bắn BUS_OFF (thấy độ trễ nguy hiểm!)",
        run: () => {
          ecucConfig.MRP_CanSM_Ch0_Processing = "BSWM_DEFERRED";
          syncConfigToDOM();
          api_BswM_CanSM_CurrentState(0, "CANSM_BSWM_BUS_OFF");
        }
      },
      {
        label: "🧪 2. Bắn CANSM_BSWM_CHANGE_BAUDRATE (tạm ngắt Tx khi đổi Baud)",
        run: () => api_BswM_CanSM_CurrentState(0, "CANSM_BSWM_CHANGE_BAUDRATE")
      },
      {
        label: "🧪 3. Phục hồi CanSM -> CANSM_BSWM_FULL_COMMUNICATION",
        run: () => api_BswM_CanSM_CurrentState(0, "CANSM_BSWM_FULL_COMMUNICATION")
      }
    ]
  },

  // ==================== NHÓM 2: IMMEDIATE vs DEFERRED, TRIGGER vs CONDITION, CASCADE ====================
  {
    id: "S5",
    title: "S5: Đối Chiếu BSWM_IMMEDIATE vs BSWM_DEFERRED & Chống Re-entrancy",
    summary: "S5 — So sánh rõ thời điểm đánh giá Rule giữa cổng DEFERRED (SWC xếp hàng đợi MainFunction) và IMMEDIATE (ComM xử lý ngay trong hàm gọi), cùng cơ chế chống đụng độ Re-entrancy.",
    setup: () => {
      resetConfigToBase({
        MRP_Swc_AppMode_Processing: "BSWM_DEFERRED",
        MRP_ComM_Ch0_Processing: "BSWM_IMMEDIATE"
      });
      fastForwardRunReady();
      api_BswM_CanSM_CurrentState(0, "CANSM_BSWM_FULL_COMMUNICATION");
      simState.stepExplain = "S5 sẵn sàng: MRP_Swc_AppMode = DEFERRED, MRP_ComM_Ch0 = IMMEDIATE. Hãy quan sát Bit 5 (DEF_PENDING) & Bit 6 (IMM_PROC).";
    },
    steps: [
      {
        title: "Nhánh A (DEFERRED): SWC gọi xin APP_MODE_SPORT",
        desc: "SWC gọi Rte_Write(APP_MODE_SPORT). Do DEFERRED, BswM CHƯA đánh giá Rule_06, chỉ bật Bit 5 (DEF_PENDING=1) và đưa vào Deferred Request Queue!",
        exec: () => api_Swc_ModeRequest("APP_MODE_SPORT")
      },
      {
        title: "Nhánh B (IMMEDIATE): ComM báo FULL_COM xen ngang",
        desc: "ComM gọi BswM_ComM_CurrentMode(FULL_COM). Do IMMEDIATE, BswM bật Bit 6 (IMM_PROC=1) và mở ngay Vector PDU trước khi MainFunction chạy, nhưng Rule_06 vẫn chờ Queue!",
        exec: () => api_BswM_ComM_CurrentMode(0, "COMM_FULL_COMMUNICATION")
      },
      {
        title: "BswM_MainFunction() xả hàng đợi DEFERRED -> Chạy Rte_Switch(SPORT)",
        desc: "Tại chu kỳ 10ms, BswM xả Queue (Bit 5: 1->0), đánh giá Rule_06 TRUE và gọi Rte_Switch(SPORT) + SchM_Switch(FAST_5MS)!",
        exec: () => stepClockTick(10)
      }
    ],
    whatIfs: [
      {
        label: "🧪 1. Gửi liên tiếp 2 yêu cầu SWC DEFERRED (chưa bấm MainFunction)",
        run: () => {
          api_Swc_ModeRequest("APP_MODE_ECO");
          api_Swc_ModeRequest("APP_MODE_SPORT");
        }
      },
      {
        label: "🧪 2. Chuyển MRP_Swc_AppMode sang BSWM_IMMEDIATE & xin SPORT ngay",
        run: () => {
          ecucConfig.MRP_Swc_AppMode_Processing = "BSWM_IMMEDIATE";
          syncConfigToDOM();
          api_Swc_ModeRequest("APP_MODE_SPORT");
        }
      },
      {
        label: "🧪 3. Kích hoạt xung đột Re-entrancy (SWS_BswM_00143 Hoãn Queue)",
        run: () => testReentrancyConflict()
      }
    ]
  },

  {
    id: "S6",
    title: "S6: Đối Chiếu BSWM_TRIGGER vs BSWM_CONDITION (Sườn Đổi vs Lặp Chu Kỳ)",
    summary: "S6 — Rule_02 dùng BSWM_TRIGGER (chỉ chạy đúng 1 lần khi đổi trạng thái), còn Rule_06 dùng BSWM_CONDITION (chạy lặp lại mỗi chu kỳ BswM_MainFunction miễn còn TRUE).",
    setup: () => {
      resetConfigToBase({
        AL_EnableTxRxDM_Execution: "BSWM_TRIGGER",
        AL_SwcSportMode_Execution: "BSWM_CONDITION",
        EnableTriggerIpduSendAction: true
      });
      fastForwardRunFullCom();
      simState.stepExplain = "S6 sẵn sàng: AL_EnableTxRxDM = BSWM_TRIGGER, AL_SwcSportMode = BSWM_CONDITION.";
    },
    steps: [
      {
        title: "Bật SWC SPORT_MODE -> Chạy lần đầu",
        desc: "SWC yêu cầu APP_MODE_SPORT -> Tick MainFunction: Rule_06 chuyển FALSE->TRUE chạy AL_SwcSportMode (Bit 2 ACT_COND = 1). Rule_02 (TRIGGER) không đổi nên SKIP.",
        exec: () => {
          api_Swc_ModeRequest("APP_MODE_SPORT");
          stepClockTick(10);
        }
      },
      {
        title: "Bấm +10ms MainFunction lần 2 (Không đổi đầu vào)",
        desc: "Quan sát API Trace: Rule_02 (BSWM_TRIGGER) BỎ QUA không gọi lại Com_IpduGroupStart, nhưng Rule_06 (BSWM_CONDITION) TIẾP TỤC chạy lặp lại Rte_Switch & Com_TriggerIPDUSend!",
        exec: () => stepClockTick(10)
      },
      {
        title: "Bấm +10ms MainFunction lần 3",
        desc: "Rule_06 (CONDITION) tiếp tục chạy thêm chu kỳ nữa chứng minh cơ chế Level-Triggered vs Edge-Triggered!",
        exec: () => stepClockTick(10)
      }
    ],
    whatIfs: [
      {
        label: "🧪 1. Đổi AL_EnableTxRxDM sang BSWM_CONDITION & chạy +10ms Tick",
        run: () => {
          ecucConfig.AL_EnableTxRxDM_Execution = "BSWM_CONDITION";
          syncConfigToDOM();
          stepClockTick(10);
        }
      },
      {
        label: "🧪 2. Đổi AL_SwcSportMode về BSWM_TRIGGER & chạy +10ms Tick",
        run: () => {
          ecucConfig.AL_SwcSportMode_Execution = "BSWM_TRIGGER";
          syncConfigToDOM();
          stepClockTick(10);
        }
      },
      {
        label: "🧪 3. Gọi lặp ComM FULL_COM lần 2 (xem TRIGGER chặn chạy thừa)",
        run: () => api_BswM_ComM_CurrentMode(0, "COMM_FULL_COMMUNICATION")
      }
    ]
  },

  {
    id: "S7",
    title: "S7: Vai Trò BswMRuleInitState = BSWM_UNDEFINED & True/False ActionList",
    summary: "S7 — Giải thích tại sao đặt Rule02_InitState = BSWM_UNDEFINED giúp lần đánh giá đầu tiên dù kết quả ra FALSE vẫn chạy được FalseActionList (khác hẳn BSWM_FALSE!).",
    setup: () => {
      resetConfigToBase({
        Rule02_ComMFull_InitState: "BSWM_UNDEFINED",
        Rule02_EnableFalseActionList: true
      });
      fastForwardRunReady();
      simState.stepExplain = "S7 sẵn sàng: Rule_02 có InitState = BSWM_UNDEFINED và ComM đang ở NO_COM. Hãy bấm Bước Tiếp để xem lần đánh giá đầu tiên!";
    },
    steps: [
      {
        title: "Đánh giá lần đầu khi ComM = NO_COM (UNDEFINED -> FALSE)",
        desc: "BswM_MainFunction() đánh giá Rule_02 ra BSWM_FALSE. Vì Prev = UNDEFINED != FALSE (Bit 3 RULE_CHG = 1), BswM vẫn kích hoạt nhánh BswMFalseActionList!",
        exec: () => stepClockTick(10)
      },
      {
        title: "Chuyển sang FULL_COM (FALSE -> TRUE)",
        desc: "CanSM & ComM báo FULL_COM -> Rule_02 đổi FALSE->TRUE, kích hoạt nhánh TrueActionList (AL_EnableTxRxDM) mở toàn bộ I-PDU Group.",
        exec: () => {
          api_BswM_CanSM_CurrentState(0, "CANSM_BSWM_FULL_COMMUNICATION");
          api_BswM_ComM_CurrentMode(0, "COMM_FULL_COMMUNICATION");
        }
      },
      {
        title: "Lật về NO_COM (TRUE -> FALSE)",
        desc: "ComM báo NO_COMMUNICATION -> Rule_02 lật TRUE->FALSE chạy lại FalseActionList tắt sạch I-PDU Group.",
        exec: () => api_BswM_ComM_CurrentMode(0, "COMM_NO_COMMUNICATION")
      }
    ],
    whatIfs: [
      {
        label: "🧪 1. Đặt InitState = BSWM_UNDEFINED & đánh giá khi NO_COM",
        run: () => {
          resetConfigToBase({ Rule02_ComMFull_InitState: "BSWM_UNDEFINED" });
          stepClockTick(10);
        }
      },
      {
        label: "🧪 2. Đặt InitState = BSWM_FALSE & đánh giá khi NO_COM (FalseAL bị BỎ QUA!)",
        run: () => {
          resetConfigToBase({ Rule02_ComMFull_InitState: "BSWM_FALSE" });
          stepClockTick(10);
        }
      },
      {
        label: "🧪 3. Lật nhanh ComM FULL_COM -> NO_COM quan sát cặp True/False AL",
        run: () => {
          api_BswM_CanSM_CurrentState(0, "CANSM_BSWM_FULL_COMMUNICATION");
          api_BswM_ComM_CurrentMode(0, "COMM_FULL_COMMUNICATION");
          api_BswM_ComM_CurrentMode(0, "COMM_NO_COMMUNICATION");
        }
      }
    ]
  },

  {
    id: "S8",
    title: "S8: Cascaded ActionList Đa Tầng & Cơ Chế BswMAbortOnFail = TRUE",
    summary: "S8 — Khi Rule_02 chạy chuỗi ActionList lồng nhau (Item#1 IPduStart -> Item#2 CheckPower -> Item#3 Nested AL_Sub -> Item#4 Sub-Rule), nếu Item#2 trả E_NOT_OK và BswMAbortOnFail=TRUE thì hủy ngay các bước sau!",
    setup: () => {
      resetConfigToBase({
        EnableCascadedActionList: true,
        BswMAbortOnFail: true,
        InjectActionItemFailure: true,
        EnableTriggerIpduSendAction: true
      });
      fastForwardRunReady();
      api_BswM_CanSM_CurrentState(0, "CANSM_BSWM_FULL_COMMUNICATION");
      simState.stepExplain = "S8 sẵn sàng: Đã bật sẵn EnableCascadedActionList=TRUE, BswMAbortOnFail=TRUE và InjectActionItemFailure=TRUE ở Item #2.";
    },
    steps: [
      {
        title: "Kích hoạt Rule_02 trong lúc Item #2 lỗi (BswMAbortOnFail = TRUE)",
        desc: "ComM báo FULL_COM -> Item #1 mở Tx/Rx bình thường, nhưng Item #2 trả E_NOT_OK! Bit 1 (ABORT_FAIL=1) sáng đỏ trên Thanh B: Item #3 (DM, PduR RPG_0_GW) và Item #4 bị HỦY BỎ!",
        exec: () => api_BswM_ComM_CurrentMode(0, "COMM_FULL_COMMUNICATION")
      },
      {
        title: "Khắc phục lỗi (InjectFailure = FALSE) & tái chạy",
        desc: "Tắt lỗi ở Item #2 rồi kích hoạt lại Rule_02: Toàn bộ 4 bước Cascaded ActionList chạy thông suốt, mở đầy đủ DM (0x04) & PduR Gateway (0x80)!",
        exec: () => {
          ecucConfig.InjectActionItemFailure = false;
          syncConfigToDOM();
          api_BswM_ComM_CurrentMode(0, "COMM_NO_COMMUNICATION");
          api_BswM_ComM_CurrentMode(0, "COMM_FULL_COMMUNICATION");
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 1. Bật lỗi Item #2 với BswMAbortOnFail = TRUE (Hủy Item #3, #4)",
        run: () => {
          ecucConfig.InjectActionItemFailure = true;
          ecucConfig.BswMAbortOnFail = true;
          syncConfigToDOM();
          api_BswM_ComM_CurrentMode(0, "COMM_NO_COMMUNICATION");
          api_BswM_ComM_CurrentMode(0, "COMM_FULL_COMMUNICATION");
        }
      },
      {
        label: "🧪 2. Tắt BswMAbortOnFail = FALSE khi Item #2 lỗi (Vẫn chạy tiếp #3, #4!)",
        run: () => {
          ecucConfig.InjectActionItemFailure = true;
          ecucConfig.BswMAbortOnFail = false;
          syncConfigToDOM();
          api_BswM_ComM_CurrentMode(0, "COMM_NO_COMMUNICATION");
          api_BswM_ComM_CurrentMode(0, "COMM_FULL_COMMUNICATION");
        }
      },
      {
        label: "🧪 3. Đổi BswMActionListPriority = 1 & xem cấu hình Export C",
        run: () => {
          ecucConfig.BswMActionListPriority = 1;
          syncConfigToDOM();
          openExportModal();
          switchExportTab(2);
        }
      }
    ]
  },

  // ==================== NHÓM 3: SWC/RTE, PNC #16, PDUR & BSWMTIMER ====================
  {
    id: "S9",
    title: "S9: Phối Hợp 2 Chiều SWC ↔ BswM Qua RTE (Request, Rte_Switch, SchM_Switch)",
    summary: "S9 — SWC_ModeMgr xin chế độ SPORT qua Rte_Write (hoặc CDD gọi BswM_RequestMode), BswM kiểm tra điều kiện mạng ComM == FULL_COM rồi mới gọi Rte_Switch() & SchM_Switch()!",
    setup: () => {
      resetConfigToBase({
        MRP_Swc_AppMode_Processing: "BSWM_DEFERRED",
        EnableTriggerIpduSendAction: true
      });
      fastForwardRunReady();
      api_BswM_CanSM_CurrentState(0, "CANSM_BSWM_FULL_COMMUNICATION");
      simState.stepExplain = "S9 sẵn sàng: ECU đang ở RUN_READY nhưng ComM vẫn NO_COM (chưa sẵn sàng truyền bus).";
    },
    steps: [
      {
        title: "SWC_ModeMgr xin APP_MODE_SPORT khi ComM đang NO_COM",
        desc: "SWC gọi Rte_Write(APP_MODE_SPORT) -> Tick MainFunction: Vì Rule_06 = (Swc==SPORT && ComM==FULL_COM), điều kiện chưa thỏa nên BswM KHÔNG chuyển lên SPORT!",
        exec: () => {
          api_Swc_ModeRequest("APP_MODE_SPORT");
          stepClockTick(10);
        }
      },
      {
        title: "ComM đạt FULL_COM -> BswM lập tức Rte_Switch(SPORT) & SchM_Switch(FAST_5MS)",
        desc: "Khi ComM báo FULL_COM, Rule_06 thỏa mãn -> BswM kích hoạt Rte_Switch lên SWC_App, SchM_Switch sang 5ms và gọi Com_TriggerIPDUSend()!",
        exec: () => api_BswM_ComM_CurrentMode(0, "COMM_FULL_COMMUNICATION")
      },
      {
        title: "SWC chuyển về APP_MODE_NORMAL",
        desc: "SWC gọi Rte_Write(NORMAL) -> MainFunction chạy FalseActionList đưa hệ thống về NORMAL_10MS.",
        exec: () => {
          api_Swc_ModeRequest("APP_MODE_NORMAL");
          stepClockTick(10);
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 1. Xin SPORT khi ComM đang NO_COM (xem BswM giữ NORMAL)",
        run: () => {
          api_BswM_ComM_CurrentMode(0, "COMM_NO_COMMUNICATION");
          api_Swc_ModeRequest("APP_MODE_SPORT");
          stepClockTick(10);
        }
      },
      {
        label: "🧪 2. Gọi BswM_RequestMode(1, 2) từ Complex Device Driver",
        run: () => {
          api_BswM_CanSM_CurrentState(0, "CANSM_BSWM_FULL_COMMUNICATION");
          api_BswM_ComM_CurrentMode(0, "COMM_FULL_COMMUNICATION");
          api_BswM_RequestMode(1, 2);
          stepClockTick(10);
        }
      },
      {
        label: "🧪 3. Trả SWC về APP_MODE_NORMAL",
        run: () => {
          api_Swc_ModeRequest("APP_MODE_NORMAL");
          stepClockTick(10);
        }
      }
    ]
  },

  {
    id: "S10",
    title: "S10: Điều Khiển Cụm Mạng Con PNC #16 (Đóng/Mở Riêng IG_PNC16_Tx/Rx)",
    summary: "S10 — Ngay cả khi kênh vật lý Ch0 đã FULL_COM, BswM vẫn chờ BswM_ComM_CurrentPNCMode(16) để đóng/mở độc lập cặp I-PDU Group của cụm mạng con PNC #16.",
    setup: () => {
      resetConfigToBase({ BswMComMPncEnabled: true });
      fastForwardRunFullCom();
      simState.stepExplain = "S10 sẵn sàng: Kênh Ch0 đang FULL_COM (IG_0_Tx=1, IG_1_Rx=1), nhưng IG_3_PNC16_Tx = 0 & IG_4_PNC16_Rx = 0.";
    },
    steps: [
      {
        title: "ComM báo PNC #16 vào COMM_PNC_REQUESTED",
        desc: "ComM gọi BswM_ComM_CurrentPNCMode(16, COMM_PNC_REQUESTED). Rule_05 bật TRUE -> Com_IpduGroupStart mở riêng cặp bit IG_3_PNC16_Tx (0x08) & IG_4_PNC16_Rx (0x10)!",
        exec: () => api_BswM_ComM_CurrentPNCMode(16, "COMM_PNC_REQUESTED")
      },
      {
        title: "PNC #16 sang COMM_PNC_PREPARE_SLEEP -> Ngắt riêng Tx PNC #16",
        desc: "Khi không còn ai dùng PNC #16, ComM báo PNC_PREPARE_SLEEP: BswM lập tức gọi Com_IpduGroupStop(IG_3_PNC16_Tx) nhưng vẫn giữ mở IG_4_PNC16_Rx để kịp nghe bus!",
        exec: () => api_BswM_ComM_CurrentPNCMode(16, "COMM_PNC_PREPARE_SLEEP")
      },
      {
        title: "PNC #16 tắt hẳn về COMM_PNC_NO_COMMUNICATION",
        desc: "Hết thời gian PrepareSleep, BswM tắt nốt IG_4_PNC16_Rx (cả 2 bit PNC16 về 0 trong khi kênh chính Ch0 vẫn giữ giao tiếp bình thường).",
        exec: () => api_BswM_ComM_CurrentPNCMode(16, "COMM_PNC_NO_COMMUNICATION")
      }
    ],
    whatIfs: [
      {
        label: "🧪 1. Đặt PNC #16 sang COMM_PNC_READY_SLEEP (Giữ cả Tx & Rx PNC16)",
        run: () => api_BswM_ComM_CurrentPNCMode(16, "COMM_PNC_READY_SLEEP")
      },
      {
        label: "🧪 2. Đặt PNC #16 sang COMM_PNC_PREPARE_SLEEP (Cắt Tx, Giữ Rx)",
        run: () => api_BswM_ComM_CurrentPNCMode(16, "COMM_PNC_PREPARE_SLEEP")
      },
      {
        label: "🧪 3. Đưa PNC #16 về COMM_PNC_NO_COMMUNICATION (Tắt cả 2)",
        run: () => api_BswM_ComM_CurrentPNCMode(16, "COMM_PNC_NO_COMMUNICATION")
      }
    ]
  },

  {
    id: "S11",
    title: "S11: Bộ Đếm Nội Bộ BswMTimerControl (STARTED → EXPIRED) & Ngắt PduR",
    summary: "S11 — Khởi chạy bộ đếm nội bộ BswMTimer_0 (Bit 1 TMR_RUN = 1), đếm lùi mỗi BswM_MainFunction() đến khi chạm 0ms (EXPIRED) để tự động ngắt đường định tuyến PduR Gateway!",
    setup: () => {
      resetConfigToBase({
        BswMTimerValue: 30,
        EnablePduRouterControl: true
      });
      fastForwardRunFullCom();
      simState.stepExplain = "S11 sẵn sàng: PduR RPG_0_Gateway đang bật (0x80). Đặt BswMTimerValue = 30ms (3 ticks) để quan sát nhanh chu trình đếm lùi.";
    },
    steps: [
      {
        title: "Bật BswMTimer_0 (STARTED = 30 ms)",
        desc: "BswMTimerControl(Timer_0, START, 30ms) bật Bit 1 (TMR_RUN = 1) trên Thanh A và chuyển cổng MRP_Timer0_State sang BSWM_TIMER_STARTED.",
        exec: () => api_BswM_TimerControl(true, 30)
      },
      {
        title: "Tick +10ms (Còn 20ms) & Tick +10ms (Còn 10ms)",
        desc: "Sau 2 chu kỳ BswM_MainFunction(), bộ đếm giảm từ 30ms xuống 10ms; PduR RPG_0_Gateway vẫn giữ ON.",
        exec: () => {
          stepClockTick(10);
          stepClockTick(10);
        }
      },
      {
        title: "Tick +10ms -> BswMTimer_0 EXPIRED (0ms) & Ngắt PduR_DisableRouting()",
        desc: "Chạm 0ms -> Cổng MRP_Timer0_State đổi sang BSWM_TIMER_EXPIRED, kích hoạt Rule_06b gọi PduR_DisableRouting(RPG_0_Gateway) (Bit 3 Thanh B: 1->0)!",
        exec: () => stepClockTick(10)
      }
    ],
    whatIfs: [
      {
        label: "🧪 1. Nạp Timer = 50ms & chạy ngay 5 ticks tới EXPIRED",
        run: () => {
          ecucConfig.BswMTimerValue = 50;
          syncConfigToDOM();
          api_BswM_TimerControl(true, 50);
          for (let i = 0; i < 5; i++) stepClockTick(10);
        }
      },
      {
        label: "🧪 2. Dừng khẩn cấp BswMTimerControl(STOP) giữa chừng",
        run: () => {
          api_BswM_TimerControl(true, 100);
          stepClockTick(10);
          api_BswM_TimerControl(false);
        }
      },
      {
        label: "🧪 3. Tắt EnablePduRouterControl = FALSE & thử hết hạn Timer",
        run: () => {
          ecucConfig.EnablePduRouterControl = false;
          syncConfigToDOM();
          api_BswM_TimerControl(true, 10);
          stepClockTick(10);
        }
      }
    ]
  },

  // ==================== NHÓM 4: DCM 0x28, SHUTDOWN & DET ====================
  {
    id: "S12",
    title: "S12: Dịch Vụ UDS 0x28 CommunicationControl (Khóa/Mở Normal PDU & NmCtrl)",
    summary: "S12 — Khi Tester gửi lệnh chẩn đoán UDS 0x28 trước khi nạp phần mềm, Dcm báo BswM khóa có chọn lọc Normal PDU & CanNm trong khi vẫn giữ mở kênh chẩn đoán IG_5_Diag_Pdu!",
    setup: () => {
      resetConfigToBase({
        MRP_Dcm_ComCtrl_Processing: "BSWM_IMMEDIATE",
        EnableNmControlOnDcm0x28: true
      });
      fastForwardRunFullCom();
      simState.stepExplain = "S12 sẵn sàng: Mạng đang FULL_COM_ONLINE (Tx=1, Rx=1, DM=1, Diag=1, NM=1).";
    },
    steps: [
      {
        title: "UDS 0x28: Chỉ tắt Tx ứng dụng (DCM_ENABLE_RX_DISABLE_TX_NORM)",
        desc: "Dcm gọi BswM_Dcm_CommunicationMode_CurrentState(0, DCM_ENABLE_RX_DISABLE_TX_NORM): Bit 2 Thanh B (DCM_DIS = 1), khóa IG_0_Tx & Rx DM nhưng vẫn giữ IG_1_Rx và IG_6_NM!",
        exec: () => api_BswM_Dcm_CommunicationMode_CurrentState(0, "DCM_ENABLE_RX_DISABLE_TX_NORM")
      },
      {
        title: "UDS 0x28: Khóa toàn bộ Normal & NM (DCM_DISABLE_RX_TX_NORM_NM)",
        desc: "Khóa sạch IG_0_Tx, IG_1_Rx, IG_6_NM (gọi Nm_DisableCommunication(Ch0)), CHỈ GIỮ DUY NHẤT IG_5_Diag_Pdu (0x20) để duy trì nạp Flash UDS!",
        exec: () => api_BswM_Dcm_CommunicationMode_CurrentState(0, "DCM_DISABLE_RX_TX_NORM_NM")
      },
      {
        title: "UDS 0x28: Khôi phục bình thường (DCM_ENABLE_RX_TX_NORM_NM)",
        desc: "Tester gửi 28 00 03 -> FalseActionList của Rule_04 gọi Nm_EnableCommunication(Ch0) & Com_IpduGroupStart() mở lại toàn bộ!",
        exec: () => api_BswM_Dcm_CommunicationMode_CurrentState(0, "DCM_ENABLE_RX_TX_NORM_NM")
      }
    ],
    whatIfs: [
      {
        label: "🧪 1. Chọn DCM_ENABLE_RX_DISABLE_TX_NORM (Chỉ tắt Tx, giữ Rx & NM)",
        run: () => api_BswM_Dcm_CommunicationMode_CurrentState(0, "DCM_ENABLE_RX_DISABLE_TX_NORM")
      },
      {
        label: "🧪 2. Chọn DCM_DISABLE_RX_TX_NM (Chỉ tắt NM, giữ ứng dụng Normal)",
        run: () => {
          api_BswM_Dcm_CommunicationMode_CurrentState(0, "DCM_ENABLE_RX_TX_NORM_NM");
          api_BswM_Dcm_CommunicationMode_CurrentState(0, "DCM_DISABLE_RX_TX_NM");
        }
      },
      {
        label: "🧪 3. Khôi phục DCM_ENABLE_RX_TX_NORM_NM",
        run: () => api_BswM_Dcm_CommunicationMode_CurrentState(0, "DCM_ENABLE_RX_TX_NORM_NM")
      }
    ]
  },

  {
    id: "S13",
    title: "S13: Chu Trình Tắt Máy An Toàn (PREP_SHUTDOWN → Rte_Stop → NvM_WriteAll → GoOff)",
    summary: "S13 — Quy trình tắt ECU chuẩn EcuM Flexible: Khóa ComMAllowed(FALSE) -> Rte_Stop() -> NvM_WriteAll() -> Chỉ khi có NVM_REQ_OK mới gọi EcuM_GoDownHaltPoll() & BswM_Deinit().",
    setup: () => {
      resetConfigToBase({
        RequireNvMWriteAllBeforeGoOff: true,
        EcuMShutdownTarget: "ECUM_STATE_OFF"
      });
      fastForwardRunFullCom();
      api_BswM_ComM_CurrentMode(0, "COMM_NO_COMMUNICATION");
      api_BswM_CanSM_CurrentState(0, "CANSM_BSWM_NO_COMMUNICATION");
      simState.stepExplain = "S13 sẵn sàng: ComM đã về NO_COM, ECU sẵn sàng nhận sự kiện tắt khóa điện (PREP_SHUTDOWN).";
    },
    steps: [
      {
        title: "EcuM báo ECUM_STATE_PREP_SHUTDOWN (DEFERRED)",
        desc: "EcuM gọi BswM_EcuM_CurrentState(ECUM_STATE_PREP_SHUTDOWN). Cổng MRP_EcuM_State vào hàng đợi Deferred.",
        exec: () => api_BswM_EcuM_CurrentState("ECUM_STATE_PREP_SHUTDOWN")
      },
      {
        title: "MainFunction -> Rte_Stop(), AllowCom(FALSE) & NvM_WriteAll()",
        desc: "Rule_07 bật Bit 0 Thanh B (SHUTDOWN=1), tắt Bit 0 Thanh A (RTE_START=0), tắt Bit 7 Thanh B (COMM_ALLOW=0) và gọi NvM_WriteAll()!",
        exec: () => stepClockTick(10)
      },
      {
        title: "NvM báo NVM_WRITE_ALL -> NVM_REQ_OK",
        desc: "Sau khi ghi xong bộ nhớ Flash/EEPROM, NvM gọi BswM_NvM_CurrentJobMode(NVM_WRITE_ALL, NVM_REQ_OK).",
        exec: () => api_BswM_NvM_CurrentJobMode("NVM_WRITE_ALL", "NVM_REQ_OK")
      },
      {
        title: "MainFunction -> EcuM_GoDownHaltPoll() & BswM_Deinit()",
        desc: "Rule_08 chạy AL_GoOffDeinit: chọn EcuMShutdownTarget, gọi EcuM_GoDownHaltPoll() và BswM_Deinit() (Bit 7 BSWM_INIT: 1->0)!",
        exec: () => stepClockTick(10)
      }
    ],
    whatIfs: [
      {
        label: "🧪 1. Giữ NvM_WriteAll ở NVM_REQ_PENDING (BswM chờ không cho tắt nguồn!)",
        run: () => {
          resetConfigToBase({ RequireNvMWriteAllBeforeGoOff: true });
          fastForwardRunReady();
          api_BswM_EcuM_CurrentState("ECUM_STATE_PREP_SHUTDOWN");
          stepClockTick(10);
          api_BswM_NvM_CurrentJobMode("NVM_WRITE_ALL", "NVM_REQ_PENDING");
          stepClockTick(10);
        }
      },
      {
        label: "🧪 2. Đổi EcuMShutdownTarget sang ECUM_STATE_RESET (UDS 0x11 Reset)",
        run: () => {
          ecucConfig.EcuMShutdownTarget = "ECUM_STATE_RESET";
          syncConfigToDOM();
          if (!simState.shutdownActive) {
            api_BswM_EcuM_CurrentState("ECUM_STATE_PREP_SHUTDOWN");
            stepClockTick(10);
          }
          api_BswM_NvM_CurrentJobMode("NVM_WRITE_ALL", "NVM_REQ_OK");
          stepClockTick(10);
        }
      },
      {
        label: "🧪 3. Kích hoạt BswM_WdgM_RequestPartitionReset() khẩn cấp",
        run: () => api_BswM_WdgM_RequestPartitionReset()
      }
    ]
  },

  {
    id: "S14",
    title: "S14: Bẫy DET Errors (NO_INIT, REQ_USER_OUT_OF_RANGE, MODE_OUT_OF_RANGE, NULL)",
    summary: "S14 — Kiểm chứng hệ thống phòng vệ của BswM (ModuleId = 42, SWS_BswM_00029): Bẫy lỗi chưa Init (0x01), con trỏ NULL (0x02), sai UserId (0x04) và sai Mode (0x05).",
    setup: () => {
      resetConfigToBase({
        BswMInitialized: true,
        BswMDevErrorDetect: true,
        GenericReq_UserId_And_MaxMode: "1 / 3"
      });
      simState.stepExplain = "S14 sẵn sàng: BswMDevErrorDetect = TRUE (ModuleId = 42). Bấm Bước Tiếp để kích hoạt từng mã lỗi DET chuẩn!";
    },
    steps: [
      {
        title: "Lỗi BSWM_E_NO_INIT (0x01): Gọi API khi BswM chưa Init",
        desc: "Tắt BswMInitialized = FALSE (Bit 7 = 0) rồi gọi BswM_ComM_CurrentMode() -> Từ chối xử lý và gọi Det_ReportError(42, 0, 0x0E, 0x01)!",
        exec: () => {
          ecucConfig.BswMInitialized = false;
          simState.initialized = false;
          syncConfigToDOM();
          api_BswM_ComM_CurrentMode(0, "COMM_FULL_COMMUNICATION");
        }
      },
      {
        title: "Lỗi BSWM_E_REQ_USER_OUT_OF_RANGE (0x04): Sai requesting_user",
        desc: "Bật lại Init và gọi BswM_RequestMode(User=99, Mode=1) vượt ngoài MaxUser=1 -> Báo Det_ReportError(42, 0, 0x02, 0x04)!",
        exec: () => {
          api_BswM_Init(true);
          syncConfigToDOM();
          api_BswM_RequestMode(99, 1);
        }
      },
      {
        title: "Lỗi BSWM_E_REQ_MODE_OUT_OF_RANGE (0x05): Sai requested_mode",
        desc: "Gọi BswM_RequestMode(User=1, Mode=255) vượt ngoài MaxMode=3 -> Báo Det_ReportError(42, 0, 0x02, 0x05)!",
        exec: () => api_BswM_RequestMode(1, 255)
      },
      {
        title: "Lỗi BSWM_E_NULL_POINTER (0x02) & PARAM_CONFIG (0x06)",
        desc: "Gọi BswM_GetVersionInfo(NULL_PTR) và BswM_Init(NULL_PTR) -> Báo đầy đủ mã lỗi DET tương ứng!",
        exec: () => {
          api_BswM_GetVersionInfo(true);
          api_BswM_Init(false);
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 1. Tắt BswMInitialized = FALSE & gọi BswM_ComM_CurrentMode (0x01)",
        run: () => {
          ecucConfig.BswMInitialized = false;
          simState.initialized = false;
          syncConfigToDOM();
          api_BswM_ComM_CurrentMode(0, "COMM_FULL_COMMUNICATION");
        }
      },
      {
        label: "🧪 2. Bắn BswM_RequestMode(User=99, Mode=1) -> OUT_OF_RANGE (0x04)",
        run: () => {
          if (!simState.initialized) { api_BswM_Init(true); syncConfigToDOM(); }
          api_BswM_RequestMode(99, 1);
        }
      },
      {
        label: "🧪 3. Bắn BswM_RequestMode(User=1, Mode=255) -> MODE_RANGE (0x05)",
        run: () => {
          if (!simState.initialized) { api_BswM_Init(true); syncConfigToDOM(); }
          api_BswM_RequestMode(1, 255);
        }
      }
    ]
  }
];
