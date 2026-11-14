// ================= PART 4B: 14 BUILT-IN SCENARIOS (S1-S14) & 42 1-CLICK WHAT-IF ACTIONS =================

function applyPresetBase(overrides) {
  ecucConfig = Object.assign(JSON.parse(JSON.stringify(defaultConfig)), overrides || {});
  simState = createInitialSimState();
  simState.channels[0].cbv.pni = Boolean(ecucConfig.CanNmPnEnabled);
  simState.channels[1].cbv.pni = Boolean(ecucConfig.CanNmPnEnabled);
  if (ecucConfig.CanNmPnEnabled) {
    simState.eiraMask = parsePnMask16(ecucConfig.CanNmPnFilterMaskHex);
  }
  syncConfigToDOM();
  recomputeRegisters();
}

function advanceTicks(totalMs, stepMs) {
  const step = stepMs || 100;
  const count = Math.max(1, Math.round(totalMs / step));
  for (let i = 0; i < count; i++) {
    stepClockTick(step);
  }
}

const SCENARIOS = [
  // -------------------- NHÓM 1: ÁNH XẠ 2 CHIỀU ComM <-> Nm <-> CanNm & NmStateReport --------------------
  {
    id: "S1",
    group: "Nhóm 1: Ánh Xạ 2 Chiều ComM ↔ Nm ↔ CanNm & NmStateReport",
    title: "S1: Đánh Thức Chủ Động Qua Nm (Nm_NetworkRequest ➔ CanNm, Bit 4 AWB=1 & Burst Tx)",
    summary: "Minh họa ánh xạ 1-1 từ ComM ➔ Nm_NetworkRequest() ➔ CanNm_NetworkRequest(), bật Bit 4 (AWB=1), bắn chùm Immediate Burst Tx và chuỗi callbacks Nm_NetworkMode() + Nm_StateChangeNotification() + NMS=0x01/0x04.",
    setup() {
      applyPresetBase({
        NmCoordinatorSupportEnabled: false,
        NmStateReportEnabled: true,
        CanNmImmediateNmTransmissions: 3,
        CanNmImmediateNmCycleTime: 100,
        CanNmActiveWakeupBitEnabled: true
      });
      simState.stepExplain = "Bước 0 (Tiền điều kiện): ECU đang ngủ ở NM_MODE_BUS_SLEEP (CBV = 0x00). Module Nm & CanNm đã gọi Init (Bit 0 Thanh B = 1).";
      addTraceLog("info", "EcuM", "Nm & CanNm", "Nm_Init() + CanNm_Init()", "Hệ thống khởi tạo xong, Ch0 ở Bus-Sleep Mode.");
    },
    steps: [
      {
        title: "ComM gọi Nm_NetworkRequest(0) ➔ Nm định tuyến xuống CanNm_NetworkRequest(0)",
        desc: "SWC xin FULL_COM ➔ ComM gọi Nm_NetworkRequest(0). Nm kiểm tra NmBusType=NM_BUSNM_CANNM và gọi CanNm_NetworkRequest(0). CanNm vào REPEAT_MESSAGE, bật Bit 4 AWB=1 (CBV=0x10), bật Bit 2 CANNM_HOLD=1, báo Nm_NetworkMode(0) + Nm_StateChangeNotification(BSM➔RM, NMS=0x01) và bắn Burst #1.",
        exec() { api_Nm_NetworkRequest(0); }
      },
      {
        title: "Tick +100ms — Bắn gói Immediate Burst Tx #2 (100ms/gói)",
        desc: "Do CanNmImmediateNmTransmissions=3 và burstLeft còn 2, CanNm_MainFunction phát gói NM PDU thứ 2 mang AWB=1 và mã NMS=0x01 (Byte 4) mà không đợi CanNmMsgCycleTime=1000ms.",
        exec() { stepClockTick(100); }
      },
      {
        title: "Tick +100ms — Bắn gói Immediate Burst Tx #3, chuyển sang chu kỳ thường 1000ms",
        desc: "CanNm hoàn tất 3 gói Burst đánh thức khẩn cấp các node lân cận trên CAN Bus và nạp lại MsgCycleTimer = CanNmMsgCycleTime (1000ms).",
        exec() { stepClockTick(100); }
      },
      {
        title: "Tick +1300ms — Hết CanNmRepeatMessageTime (1500ms) ➔ Normal Operation",
        desc: "RepeatMessageTimer về 0. Vì Bit 2 CANNM_HOLD=1 (ComM vẫn giữ yêu cầu), CanNm chuyển NM_STATE_NORMAL_OPERATION, gọi Nm_StateChangeNotification(RM➔NO) ➔ Nm tự ghi NMS=0x04 xuống COM!",
        exec() { advanceTicks(1300, 100); }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Bật NmPassiveModeEnabled = TRUE rồi gọi Nm_NetworkRequest(0)",
        run() {
          ecucConfig.NmPassiveModeEnabled = true;
          syncConfigToDOM();
          api_Nm_NetworkRequest(0);
          simState.stepExplain = "What-If (SWS_Nm_00196): Khi bật NmPassiveModeEnabled=TRUE, tầng Nm chặn đứng Nm_NetworkRequest() và trả về E_NOT_OK trước khi gọi xuống CanNm!";
        }
      },
      {
        label: "🧪 Đặt CanNmImmediateNmTransmissions = 0 (Tắt Burst Tx)",
        run() {
          applyPresetBase({ NmCoordinatorSupportEnabled: false, CanNmImmediateNmTransmissions: 0 });
          api_Nm_NetworkRequest(0);
          simState.stepExplain = "What-If: Với CanNmImmediateNmTransmissions = 0, CanNm KHÔNG bắn chùm 100ms mà chờ hết CanNmMsgCycleOffset (100ms) mới phát gói đầu.";
        }
      },
      {
        label: "🧪 Tắt CanNmActiveWakeupBitEnabled = FALSE (AWB giữ = 0)",
        run() {
          applyPresetBase({ NmCoordinatorSupportEnabled: false, CanNmActiveWakeupBitEnabled: false });
          api_Nm_NetworkRequest(0);
          simState.stepExplain = "What-If: Dù đánh thức chủ động nhưng CanNmActiveWakeupBitEnabled=FALSE khiến CBV Bit 4 (AWB) giữ nguyên = 0.";
        }
      }
    ]
  },

  {
    id: "S2",
    group: "Nhóm 1: Ánh Xạ 2 Chiều ComM ↔ Nm ↔ CanNm & NmStateReport",
    title: "S2: Đánh Thức Thụ Động Khép Kín (CanNm_RxIndication ➔ Nm_NetworkStartIndication ➔ PassiveStartUp)",
    summary: "Theo dõi vòng lặp phối hợp 5 bước khi ECU đang ngủ ở Bus-Sleep nhận được gói NM từ Node #2 (0x2B): CanNm báo Nm_NetworkStartIndication ➔ ComM gọi Nm_PassiveStartUp ➔ vào Repeat Message (AWB=0) rồi tự rẽ sang Ready Sleep.",
    setup() {
      applyPresetBase({ NmCoordinatorSupportEnabled: false, CanNmMsgCycleOffset: 100 });
      simState.stepExplain = "Bước 0 (Tiền điều kiện): Ch0 đang ở NM_MODE_BUS_SLEEP (SWC chưa xin mạng). Node #2 (0x2B) chuẩn bị phát bản tin NM đánh thức bus.";
    },
    steps: [
      {
        title: "CanIf gọi CanNm_RxIndication(0) từ Node 0x2B khi đang Bus-Sleep",
        desc: "CanNm chưa tự ý chuyển trạng thái! Theo Figure 7-1 & SWS_CanNm_00127, CanNm ghi lỗi runtime CANNM_E_NET_START_IND (0x04) và gọi callback Nm_NetworkStartIndication(0) ➔ ComM_Nm_NetworkStartIndication(0).",
        exec() { api_CanNm_RxIndication(0, { nodeId: 0x2B, awb: true }); }
      },
      {
        title: "ComM phản hồi Nm_PassiveStartUp(0) ➔ Nm gọi CanNm_PassiveStartUp(0)",
        desc: "CanNm chuyển NM_STATE_REPEAT_MESSAGE, gọi Nm_NetworkMode(0), GIỮ Bit 4 (AWB=0) và Bit 2 (CANNM_HOLD=0) vì không có yêu cầu chủ động từ nội bộ ECU.",
        exec() { api_Nm_PassiveStartUp(0); }
      },
      {
        title: "Tick +1500ms — Hết RepeatMessageTime ➔ Rẽ thẳng sang READY_SLEEP",
        desc: "Vì Bit 2 CANNM_HOLD == 0 (PassiveStartUp), CanNm không vào Normal Operation mà rẽ sang NM_STATE_READY_SLEEP và ngừng phát bản tin NM.",
        exec() { advanceTicks(1500, 100); }
      },
      {
        title: "Tick +2000ms + 1500ms — Không có Rx mới ➔ Prepare Bus-Sleep ➔ Bus-Sleep",
        desc: "Hết CanNmTimeoutTime (2000ms) và WaitBusSleepTime (1500ms), CanNm gọi lần lượt Nm_PrepareBusSleepMode(0) rồi Nm_BusSleepMode(0) báo lên ComM.",
        exec() { advanceTicks(3500, 100); }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Gọi Nm_NetworkRequest(0) ngay khi đang ở Ready Sleep",
        run() {
          applyPresetBase({ NmCoordinatorSupportEnabled: false });
          api_Nm_PassiveStartUp(0);
          advanceTicks(1500, 100);
          api_Nm_NetworkRequest(0);
          simState.stepExplain = "What-If: Từ Ready Sleep, gọi Nm_NetworkRequest(0) làm CanNm nhảy sang Normal Operation, bật HOLD=1 và phát NMS=0x08 (NO_RS)!";
        }
      },
      {
        label: "🧪 Bật NmPduRxIndicationEnabled = TRUE và nhận gói NM",
        run() {
          ecucConfig.NmPduRxIndicationEnabled = true;
          syncConfigToDOM();
          if (simState.channels[0].canNmMode === "NM_MODE_BUS_SLEEP") api_Nm_PassiveStartUp(0);
          api_CanNm_RxIndication(0, { nodeId: 0x2B, awb: true });
          simState.stepExplain = "What-If: Khi bật NmPduRxIndicationEnabled=TRUE, mỗi lần CanNm_RxIndication() chạy sẽ báo callback Nm_PduRxIndication(0) lên tầng Nm.";
        }
      },
      {
        label: "🧪 Đổi CanNmMsgCycleOffset = 300ms khi PassiveStartUp",
        run() {
          applyPresetBase({ NmCoordinatorSupportEnabled: false, CanNmMsgCycleOffset: 300 });
          api_Nm_PassiveStartUp(0);
          simState.stepExplain = "What-If: Với CanNmMsgCycleOffset = 300ms, bộ đếm MsgCycleTimer khởi đầu tại 300ms trước khi phát gói thụ động đầu tiên (tránh đụng độ CAN Bus).";
        }
      }
    ]
  },

  {
    id: "S3",
    group: "Nhóm 1: Ánh Xạ 2 Chiều ComM ↔ Nm ↔ CanNm & NmStateReport",
    title: "S3: Chu Trình Ngủ Đồng Bộ 4 Pha & Callbacks Ngược Lên Nm ➔ ComM",
    summary: "Làm rõ cách Nm & CanNm phối hợp qua 4 pha ngủ để bảo vệ phần cứng CAN không bị tắt đột ngột: Nm_NetworkRelease ➔ Ready Sleep ➔ Prepare Bus-Sleep (SILENT_COM) ➔ Bus-Sleep (NO_COM).",
    setup() {
      applyPresetBase({ NmCoordinatorSupportEnabled: false, NmStateReportEnabled: true });
      api_Nm_NetworkRequest(0);
      advanceTicks(1500, 100);
      simState.stepExplain = "Bước 0 (Tiền điều kiện): Kênh Ch0 đang hoạt động ổn định tại NM_STATE_NORMAL_OPERATION (CBV Bit 4 AWB=1, Bit 2 CANNM_HOLD=1).";
      addTraceLog("ok", "Precondition", "Ch0", "Normal Operation Ready", "Kênh Ch0 sẵn sàng mô phỏng chu trình tắt 4 pha.");
    },
    steps: [
      {
        title: "Pha 1: ComM gọi Nm_NetworkRelease(0) ➔ CanNm_NetworkRelease(0) ➔ READY_SLEEP",
        desc: "CanNm hạ Bit 2 CANNM_HOLD=0, chuyển NM_STATE_READY_SLEEP và ngưng phát NM PDU. Lưu ý: ComM vẫn giữ CanSM ở FULL_COM suốt pha Ready Sleep!",
        exec() { api_Nm_NetworkRelease(0); }
      },
      {
        title: "Pha 2: Tick +2000ms (NM-Timeout=0) ➔ PREPARE_BUS_SLEEP (SILENT_COM)",
        desc: "CanNm tự xóa Bit 4 AWB về 0 (SWS_CanNm_00402), chuyển NM_MODE_PREPARE_BUS_SLEEP, nạp WaitBusSleepTime=1500ms và gọi Nm_PrepareBusSleepMode(0) ➔ ComM_Nm_PrepareBusSleepMode(0).",
        exec() { advanceTicks(2000, 100); }
      },
      {
        title: "Pha 3: Tick +1500ms (WaitBusSleep=0) ➔ BUS_SLEEP (NO_COM)",
        desc: "Không có gói Rx nào làm gián đoạn trong 1500ms, CanNm về NM_MODE_BUS_SLEEP và gọi Nm_BusSleepMode(0) ➔ ComM_Nm_BusSleepMode(0) để CanSM tắt Transceiver.",
        exec() { advanceTicks(1500, 100); }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Gọi Nm_NetworkRequest(0) ngay tại Prepare Bus-Sleep (Immediate Restart)",
        run() {
          applyPresetBase({ NmCoordinatorSupportEnabled: false, CanNmImmediateRestartEnabled: true });
          api_Nm_NetworkRequest(0);
          advanceTicks(1500, 100);
          api_Nm_NetworkRelease(0);
          advanceTicks(2000, 100);
          api_Nm_NetworkRequest(0);
          simState.stepExplain = "What-If (SWS_CanNm_00122): Tại Prepare Bus-Sleep, Nm_NetworkRequest() kích hoạt Immediate Restart Tx ngay lập tức và báo Nm_NetworkMode(0)!";
        }
      },
      {
        label: "🧪 Bắn CanNm_RxIndication(0) tại Prepare Bus-Sleep (RestartIndication)",
        run() {
          applyPresetBase({ NmCoordinatorSupportEnabled: false });
          api_Nm_NetworkRequest(0);
          advanceTicks(1500, 100);
          api_Nm_NetworkRelease(0);
          advanceTicks(2000, 100);
          api_CanNm_RxIndication(0, { nodeId: 0x2B, awb: true });
          simState.stepExplain = "What-If (SWS_CanNm_00124): Nhận Rx NM PDU tại Prepare Bus-Sleep khiến CanNm lập tức phục hồi về Repeat Message và gọi ComM_Nm_RestartIndication(0)!";
        }
      },
      {
        label: "🧪 Bắn CanNm_RxIndication(0) tại Ready Sleep (Reload NM-Timeout 2000ms)",
        run() {
          applyPresetBase({ NmCoordinatorSupportEnabled: false });
          api_Nm_NetworkRequest(0);
          advanceTicks(1500, 100);
          api_Nm_NetworkRelease(0);
          advanceTicks(1200, 100);
          api_CanNm_RxIndication(0, { nodeId: 0x2B, awb: false });
          simState.stepExplain = "What-If: Dù ECU đã sẵn sàng ngủ ở Ready Sleep (Timeout còn 800ms), gói Rx từ Node 0x2B nạp lại CanNmTimeoutTime = 2000ms!";
        }
      }
    ]
  },

  {
    id: "S4",
    group: "Nhóm 1: Ánh Xạ 2 Chiều ComM ↔ Nm ↔ CanNm & NmStateReport",
    title: "S4: Báo Cáo Trạng Thái Mạng Qua COM (NmStateReport: CanNm ➔ Nm ➔ COM ➔ PduR ➔ CanNm)",
    summary: "Trình diễn vòng khép kín AUTOSAR R22-11 (SWS_Nm_00154): mỗi lần chuyển trạng thái CanNm báo Nm_StateChangeNotification(), Nm tự ghi mã 6-bit NMS vào COM (Com_SendSignal) để CanNm kéo vào Byte 4 qua PduR_CanNmTriggerTransmit().",
    setup() {
      applyPresetBase({
        NmCoordinatorSupportEnabled: false,
        NmStateChangeIndEnabled: true,
        NmStateReportEnabled: true,
        NmComUserDataSupport: true
      });
      simState.stepExplain = "Bước 0: Kênh Ch0 ở Bus-Sleep (NMS = 0x00). Hãy quan sát Byte 4 (NMS Signal) trên Khung 8-Byte NM PDU và Bit 3 Thanh B qua từng chuyển trạng thái!";
    },
    steps: [
      {
        title: "Bước 1 (Bus-Sleep ➔ Repeat Message): Ghi NMS = 0x01 (RM_BSM)",
        desc: "Gọi Nm_NetworkRequest(0): CanNm gọi Nm_StateChangeNotification(BSM ➔ RM). Nm bật Bit 3 Thanh B, gọi Com_SendSignal(ComSig_NMS_B4, 0x01) và PduR_CanNmTriggerTransmit() đóng 0x01 vào Byte 4 PDU.",
        exec() { api_Nm_NetworkRequest(0); }
      },
      {
        title: "Bước 2 (+1500ms, Repeat Message ➔ Normal Operation): Ghi NMS = 0x04 (NO_RM)",
        desc: "Hết RepeatMessageTime=1500ms, CanNm chuyển Normal Operation ➔ báo Nm_StateChangeNotification(RM ➔ NO) ➔ Byte 4 cập nhật thành 0x04!",
        exec() { advanceTicks(1500, 100); }
      },
      {
        title: "Bước 3 (Release ➔ Ready Sleep rồi Request lại): Ghi NMS = 0x08 (NO_RS)",
        desc: "Gọi Nm_NetworkRelease(0) rồi gọi lại Nm_NetworkRequest(0): CanNm đi từ Ready Sleep ➔ Normal Operation và phát ngay gói NM có Byte 4 = 0x08!",
        exec() {
          api_Nm_NetworkRelease(0);
          api_Nm_NetworkRequest(0);
        }
      },
      {
        title: "Bước 4 (Normal Operation ➔ Repeat Message): Ghi NMS = 0x20 (RM_NO)",
        desc: "Gọi Nm_RepeatMessageRequest(0): CanNm quay về Repeat Message ➔ Byte 4 đổi sang mã 0x20 (NMS_RM_NO)!",
        exec() { api_Nm_RepeatMessageRequest(0); }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Tắt NmStateReportEnabled = FALSE",
        run() {
          ecucConfig.NmStateReportEnabled = false;
          simState.nmsSignalVal = 0x00;
          simState.nmsSignalDesc = "DISABLED (0x00)";
          syncConfigToDOM();
          recomputeRegisters();
          simState.stepExplain = "What-If: Khi NmStateReportEnabled=FALSE, Nm không gọi Com_SendSignal() nữa và Byte 4 quay về làm User Data thông thường.";
        }
      },
      {
        label: "🧪 Bắn chuỗi chuyển trạng thái RS ➔ RM (NMS = 0x10)",
        run() {
          applyPresetBase({ NmCoordinatorSupportEnabled: false, NmStateReportEnabled: true });
          api_Nm_NetworkRequest(0);
          advanceTicks(1500, 100);
          api_Nm_NetworkRelease(0);
          api_Nm_RepeatMessageRequest(0);
          simState.stepExplain = "What-If: Khi ở Ready Sleep mà gọi Nm_RepeatMessageRequest(0), CanNm nhảy RS ➔ RM khiến Byte 4 mang mã NMS_RM_RS (0x10)!";
        }
      },
      {
        label: "🧪 Tắt CanNmStateChangeIndEnabled (Cắt callback từ CanNm lên Nm)",
        run() {
          ecucConfig.NmStateChangeIndEnabled = false;
          syncConfigToDOM();
          api_Nm_NetworkRelease(0);
          api_Nm_NetworkRequest(0);
          simState.stepExplain = "What-If: Khi tắt Nm/CanNmStateChangeIndEnabled=FALSE, CanNm không gọi Nm_StateChangeNotification(), nên Nm không biết để cập nhật mã NMS (vẫn kẹt giá trị cũ)!";
        }
      }
    ]
  },

  // -------------------- NHÓM 2: NODE DETECTION, USER DATA & CAR WAKEUP QUA Nm --------------------
  {
    id: "S5",
    group: "Nhóm 2: Node Detection, User Data & Car WakeUp Qua Nm",
    title: "S5: Điểm Danh Toàn Mạng Qua Nm (Nm_RepeatMessageRequest ➔ Bit 0 RMR=1 & Nm_RepeatMessageIndication)",
    summary: "Minh họa 2 chiều điểm danh ECU: (1) ECU cục bộ gọi Nm_RepeatMessageRequest(0) bật Bit 0 RMR=1 kéo toàn bus điểm danh; (2) Nhận Rx RMR=1 từ Node 0x2B khi đang ở Ready Sleep khiến CanNm gọi Nm_RepeatMessageIndication(0).",
    setup() {
      applyPresetBase({
        NmCoordinatorSupportEnabled: false,
        NmNodeDetectionEnabled: true,
        NmRepeatMsgIndEnabled: true
      });
      api_Nm_NetworkRequest(0);
      advanceTicks(1500, 100);
      simState.stepExplain = "Bước 0: Kênh Ch0 đang ở NM_STATE_NORMAL_OPERATION. Chẩn đoán hoặc BswM chuẩn bị kích hoạt điểm danh toàn mạng.";
    },
    steps: [
      {
        title: "Chiều phát lệnh: SWC_Diag gọi Nm_RepeatMessageRequest(0) ➔ CanNm",
        desc: "Nm gọi CanNm_RepeatMessageRequest(0). CanNm chuyển về NM_STATE_REPEAT_MESSAGE, bật Bit 0 (RMR=1) trên Thanh A (CBV = 0x11) và truyền ngay gói NM PDU ra CAN Bus!",
        exec() { api_Nm_RepeatMessageRequest(0); }
      },
      {
        title: "Tick +1500ms — Hết RepeatMessageTime ➔ Xóa Bit 0 (RMR: 1 ➔ 0)",
        desc: "CanNm hoàn tất chu kỳ điểm danh, tự xóa CBV Bit 0 (RMR=0) và quay về Normal Operation.",
        exec() { advanceTicks(1500, 100); }
      },
      {
        title: "Chiều nhận từ bus: Ở Ready Sleep, nhận Rx có RMR=1 từ Node 0x2B",
        desc: "Chuyển về Ready Sleep rồi nhận gói Rx CBV Bit 0 RMR=1 từ Node 0x2B: CanNm nhảy ngược về REPEAT_MESSAGE và gọi callback Nm_RepeatMessageIndication(0) báo lên Nm!",
        exec() {
          api_Nm_NetworkRelease(0);
          api_CanNm_RxIndication(0, { nodeId: 0x2B, rmr: true });
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Tắt NmNodeDetectionEnabled = FALSE rồi thử gọi RepeatMessageRequest",
        run() {
          ecucConfig.NmNodeDetectionEnabled = false;
          syncConfigToDOM();
          api_Nm_RepeatMessageRequest(0);
          simState.stepExplain = "What-If: Với NmNodeDetectionEnabled=FALSE, tính năng điểm danh bị vô hiệu: Nm_RepeatMessageRequest() trả E_NOT_OK và bit RMR không bật!";
        }
      },
      {
        label: "🧪 Bắn gói Rx RMR=1 khi đang ở Normal Operation",
        run() {
          if (simState.channels[0].canNmMode === "NM_MODE_BUS_SLEEP") api_Nm_NetworkRequest(0);
          advanceTicks(1500, 100);
          api_CanNm_RxIndication(0, { nodeId: 0x2B, rmr: true });
          simState.stepExplain = "What-If: Đang ở Normal Operation, nhận RMR=1 từ Node 0x2B vẫn kéo ECU cục bộ vào Repeat Message và gọi Nm_RepeatMessageIndication(0).";
        }
      },
      {
        label: "🧪 Cho RepeatMessageTime (1500ms) hết hạn sau khi nhận Rx RMR=1",
        run() {
          advanceTicks(1500, 100);
          simState.stepExplain = "What-If: Sau 1500ms điểm danh, ECU kiểm tra Bit 2 CANNM_HOLD để quyết định về Normal Operation (HOLD=1) hoặc Ready Sleep (HOLD=0).";
        }
      }
    ]
  },

  {
    id: "S6",
    group: "Nhóm 2: Node Detection, User Data & Car WakeUp Qua Nm",
    title: "S6: Đồng Bộ User Data & Truy Vấn Định Danh Node Qua Nm (GetNodeIdentifier / GetPduData / SetUserData)",
    summary: "Trình diễn bộ API dữ liệu & định danh của lớp Nm (SWS_Nm_00036/37/40/43) và so sánh 2 cơ chế cập nhật User Data: Nm_SetUserData() trực tiếp vs tự động kéo từ COM qua PduR_CanNmTriggerTransmit().",
    setup() {
      applyPresetBase({
        NmCoordinatorSupportEnabled: false,
        NmNodeIdEnabled: true,
        NmComUserDataSupport: false,
        UserDataBytesHex: "AA BB CC DD EE FF"
      });
      api_Nm_NetworkRequest(0);
      advanceTicks(1500, 100);
      simState.stepExplain = "Bước 0: Kênh Ch0 đang ở Normal Operation với NmComUserDataSupport=FALSE (điều khiển User Data trực tiếp bằng Nm_SetUserData).";
    },
    steps: [
      {
        title: "Nhận Rx PDU từ Node 0x2B & Truy vấn Nm_GetNodeIdentifier / LocalNodeIdentifier",
        desc: "Node 0x2B gửi khung NM. Ứng dụng gọi Nm_GetNodeIdentifier(0) ➔ CanNm_GetNodeIdentifier trả về SNI = 0x2B, và Nm_GetLocalNodeIdentifier(0) trả về 0x1A!",
        exec() {
          api_CanNm_RxIndication(0, { nodeId: 0x2B, awb: true });
          simState.activeArrows = ["arr_swc_rte", "arr_rte_nm", "arr_nm_cannm"];
          addTraceLog("ok", "SWC ➔ Nm", "CanNm(Ch0)", "Nm_GetNodeIdentifier()=0x2B | Local=0x1A", "[SWS_Nm_00036 / 00037] Truy xuất định danh node phát gần nhất và node cục bộ qua Nm.");
          simState.stepExplain = "Đã gọi Nm_GetNodeIdentifier(0) = 0x" + simState.lastRxPdu.nodeId.toString(16).toUpperCase() + " và Nm_GetLocalNodeIdentifier(0) = " + ecucConfig.CanNmNodeId + ".";
        }
      },
      {
        title: "Gọi Nm_GetState(0) & Nm_GetPduData(0) đọc toàn bộ khung 8-Byte",
        desc: "Nm chuyển tiếp xuống CanNm_GetState() và CanNm_GetPduData() trả về trạng thái hiện tại cùng buffer 8-Byte PDU gần nhất.",
        exec() {
          const ch0 = simState.channels[0];
          simState.activeArrows = ["arr_swc_rte", "arr_rte_nm", "arr_nm_cannm"];
          addTraceLog("info", "SWC ➔ Nm", "CanNm(Ch0)", "Nm_GetState()=" + ch0.canNmState + " | Nm_GetPduData()", "[SWS_Nm_00040 / 00043] RxBytes=[" + simState.lastRxPdu.bytes.map((b) => b.toString(16).toUpperCase().padStart(2, "0")).join(" ") + "]");
          simState.stepExplain = "Nm_GetState(0) trả về (" + ch0.canNmState + ", " + ch0.canNmMode + ").";
        }
      },
      {
        title: "Ghi User Data bằng Nm_SetUserData(0, [DE AD BE EF CA FE])",
        desc: "Vì NmComUserDataSupport=FALSE, ứng dụng ghi trực tiếp mảng 6 byte user data qua Nm_SetUserData() ➔ CanNm_SetUserData() và phát khung NM mới!",
        exec() {
          ecucConfig.UserDataBytesHex = "DE AD BE EF CA FE";
          syncConfigToDOM();
          addTraceLog("ok", "SWC ➔ Nm", "CanNm(Ch0)", "Nm_SetUserData(0, [DE AD BE EF CA FE])", "[SWS_Nm_00033] Ghi trực tiếp User Data vào vùng byte còn lại ngoài NID/CBV.");
          api_CanNm_TransmitFrame(0, "Tx with Nm_SetUserData()");
          simState.stepExplain = "Đã cập nhật UserDataBytesHex = DE AD BE EF CA FE thông qua Nm_SetUserData().";
        }
      },
      {
        title: "Bật NmComUserDataSupport = TRUE ➔ Tự động kéo từ COM qua PduR_CanNmTriggerTransmit()",
        desc: "Theo chuẩn R22-11 khuyến nghị, khi bật NmComUserDataSupport=TRUE, CanNm gọi PduR_CanNmTriggerTransmit() lấy tín hiệu COM (kể cả NMS tại Byte 4) mỗi chu kỳ phát.",
        exec() {
          ecucConfig.NmComUserDataSupport = true;
          ecucConfig.NmStateReportEnabled = true;
          syncConfigToDOM();
          api_CanNm_TransmitFrame(0, "Tx with PduR_CanNmTriggerTransmit()");
          simState.stepExplain = "NmComUserDataSupport=TRUE: CanNm tự động kích hoạt PduR_CanNmTriggerTransmit() kéo dữ liệu COM (gồm Byte 4 NMS) vào khung 8-Byte PDU.";
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Đảo vị trí Byte 0 (CBV) và Byte 1 (NID)",
        run() {
          ecucConfig.CanNmPduNidPosition = "CANNM_PDU_BYTE_1";
          ecucConfig.CanNmPduCbvPosition = "CANNM_PDU_BYTE_0";
          syncConfigToDOM();
          recomputeRegisters();
          simState.stepExplain = "What-If: Hoán đổi NID sang Byte 1 và CBV sang Byte 0 — cấu trúc khung 8-Byte NM PDU tự động cập nhật vị trí tương ứng!";
        }
      },
      {
        label: "🧪 Tắt NmNodeIdEnabled = FALSE",
        run() {
          ecucConfig.NmNodeIdEnabled = false;
          syncConfigToDOM();
          addTraceLog("warn", "SWC ➔ Nm", "CanNm", "Nm_GetNodeIdentifier() -> E_NOT_OK", "NmNodeIdEnabled=FALSE nên API đọc NID không khả dụng.");
          simState.stepExplain = "What-If: Khi NmNodeIdEnabled=FALSE, cặp hàm Nm_GetNodeIdentifier / Nm_GetLocalNodeIdentifier bị vô hiệu hóa.";
        }
      },
      {
        label: "🧪 Đưa về cấu hình Byte 0 = NID, Byte 1 = CBV chuẩn AUTOSAR",
        run() {
          ecucConfig.CanNmPduNidPosition = "CANNM_PDU_BYTE_0";
          ecucConfig.CanNmPduCbvPosition = "CANNM_PDU_BYTE_1";
          syncConfigToDOM();
          recomputeRegisters();
          simState.stepExplain = "What-If: Khôi phục bố cục chuẩn Byte 0 = SNI, Byte 1 = CBV.";
        }
      }
    ]
  },

  {
    id: "S7",
    group: "Nhóm 2: Node Detection, User Data & Car WakeUp Qua Nm",
    title: "S7: Đánh Thức Toàn Xe Qua Car WakeUp (CWU Bit 3 + Filter NodeId ➔ BswM_Nm_CarWakeUpIndication)",
    summary: "Minh họa luồng Car WakeUp từ CanNm xuyên qua Nm lên BswM (SWS_Nm_00250): CanNm lọc nguồn Node ID trên Bit 3 (CWU=1) trước khi báo Nm_CarWakeUpIndication() ➔ BswM_Nm_CarWakeUpIndication().",
    setup() {
      applyPresetBase({
        NmCoordinatorSupportEnabled: false,
        NmActiveCoordinator: true,
        NmCarWakeUpRxEnabled: true,
        CanNmCarWakeUpFilterEnabled: true,
        CanNmCarWakeUpFilterNodeId: "0x2B"
      });
      api_Nm_NetworkRequest(0);
      advanceTicks(1500, 100);
      simState.stepExplain = "Bước 0: Kênh Ch0 đang ở Normal Operation. Bật CarWakeUp Filter chỉ cho phép Node 0x2B đánh thức toàn xe.";
    },
    steps: [
      {
        title: "Nhận Rx CWU=1 từ Node lạ 0x99 ➔ Bị bộ lọc CanNmCarWakeUpFilter chặn!",
        desc: "Node 0x99 gửi gói NM có CBV Bit 3 CWU=1. Vì Rx NodeId (0x99) != CanNmCarWakeUpFilterNodeId (0x2B), CanNm chặn lại và KHÔNG gọi Nm_CarWakeUpIndication()!",
        exec() { api_CanNm_RxIndication(0, { nodeId: 0x99, srb: true }); }
      },
      {
        title: "Nhận Rx CWU=1 từ đúng Node 0x2B ➔ Nm_CarWakeUpIndication ➔ BswM!",
        desc: "Khớp NodeId = 0x2B! CanNm gọi Nm_CarWakeUpIndication(0), sau đó Nm gọi ngay BswM_Nm_CarWakeUpIndication(0) (SWS_Nm_00250) để đánh thức toàn xe!",
        exec() { api_CanNm_RxIndication(0, { nodeId: 0x2B, srb: true }); }
      },
      {
        title: "BswM kích hoạt Nm_RepeatMessageRequest(0) đồng bộ thức các nhánh",
        desc: "Đáp ứng lệnh CarWakeUp từ BswM, tầng ứng dụng đồng bộ điểm danh các ECU trên bus bằng RepeatMessageRequest.",
        exec() { api_Nm_RepeatMessageRequest(0); }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Bắn gói CWU=1 từ Node 0x99 khi đã TẮT Filter",
        run() {
          ecucConfig.CanNmCarWakeUpFilterEnabled = false;
          syncConfigToDOM();
          api_CanNm_RxIndication(0, { nodeId: 0x99, srb: true });
          simState.stepExplain = "What-If: Khi CanNmCarWakeUpFilterEnabled=FALSE, mọi Node gửi CWU=1 (kể cả 0x99) đều đi xuyên qua lên BswM_Nm_CarWakeUpIndication().";
        }
      },
      {
        label: "🧪 Tắt hoàn toàn NmCarWakeUpRxEnabled = FALSE",
        run() {
          ecucConfig.NmCarWakeUpRxEnabled = false;
          syncConfigToDOM();
          api_CanNm_RxIndication(0, { nodeId: 0x2B, srb: true });
          simState.stepExplain = "What-If: Khi NmCarWakeUpRxEnabled=FALSE, bit CWU trên gói nhận bị bỏ qua hoàn toàn.";
        }
      },
      {
        label: "🧪 Khôi phục Filter = Node 0x2B và test lại Rx 0x2B",
        run() {
          ecucConfig.NmCarWakeUpRxEnabled = true;
          ecucConfig.CanNmCarWakeUpFilterEnabled = true;
          ecucConfig.CanNmCarWakeUpFilterNodeId = "0x2B";
          syncConfigToDOM();
          api_CanNm_RxIndication(0, { nodeId: 0x2B, srb: true });
          simState.stepExplain = "What-If: Filter hoạt động lại và chấp nhận CWU=1 từ Node 0x2B.";
        }
      }
    ]
  },

  // -------------------- NHÓM 3: THUẬT TOÁN NM COORDINATOR ĐIỀU PHỐI CỤM ĐA KÊNH --------------------
  {
    id: "S8",
    group: "Nhóm 3: Thuật Toán NM Coordinator Điều Phối Cụm Đa Kênh (Ch0 & Ch1)",
    title: "S8: Giám Sát Ngủ Từ Xa & Giữ Cụm Mạng Thức (Nm_RemoteSleepIndication: Ch0 Chờ Ch1)",
    summary: "Giải thích bài toán Gateway 2 nhánh CAN (Ch0: CAN_Body & Ch1: CAN_SubNet): dù ComM đã Release Ch0 và các node trên Ch0 im lặng đủ CanNmRemoteSleepIndTime, Nm Coordinator vẫn giữ Ch0 thức khi Ch1 chưa sẵn sàng ngủ!",
    setup() {
      applyPresetBase({
        NmCoordinatorSupportEnabled: true,
        NmActiveCoordinator: true,
        NmChannelSleepMaster: false,
        CanNmRemoteSleepIndTime: 1500
      });
      api_Nm_NetworkRequest(0);
      api_Nm_NetworkRequest(1);
      advanceTicks(1500, 100);
      simState.stepExplain = "Bước 0: Cụm mạng NmCoordCluster=0 (Ch0 & Ch1) đều đang thức ở Normal Operation (NM_COORD_CLUSTER_AWAKE_ACTIVE). Ch1 tắt SleepMaster để quan sát chờ chéo 2 kênh.";
    },
    steps: [
      {
        title: "ComM gọi Nm_NetworkRelease(Ch0) trong khi Ch1 vẫn còn yêu cầu",
        desc: "Chú ý: Nm Coordinator GIỮ LẠI lệnh Release (KHÔNG gọi CanNm_NetworkRelease(0)! Bit 2 CANNM_HOLD vẫn = 1) để đảm bảo Gateway định tuyến sang Ch1 luôn sẵn sàng.",
        exec() { api_Nm_NetworkRelease(0); }
      },
      {
        title: "Node con trên Ch0 im lặng ➔ CanNm Ch0 gọi Nm_RemoteSleepIndication(0)",
        desc: "Hết CanNmRemoteSleepIndTime (1500ms), Bit 6 (CH0_REMOTE_SLP) bật = 1! Tuy nhiên Ch1 vẫn chưa Release nên Cluster vẫn giữ thức.",
        exec() { api_TriggerRemoteSleepQuiet(0); }
      },
      {
        title: "ComM gọi Nm_NetworkRelease(Ch1) ➔ Coordinator vào WAIT_REMOTE_SLEEP",
        desc: "Cả Ch0 và Ch1 đều đã được ComM giải phóng, Ch0 đã có RemoteSleep=1, nhưng Bit 5 (CH1_REMOTE_SLP) vẫn = 0 ➔ Coordinator chờ thêm RemoteSleep trên Ch1!",
        exec() { api_Nm_NetworkRelease(1); }
      },
      {
        title: "Ch1 đạt RemoteSleep (Bit 5 = 1) ➔ Cluster bật Coordinated Shutdown!",
        desc: "Ngay khi cả 2 bit 6 & 5 đều = 1, Coordinator chuyển sang NM_COORD_SHUTDOWN_INITIATED, bật CBV Bit 3 SRB=1 và đếm lùi NmShutdownDelayTimer!",
        exec() {
          api_TriggerRemoteSleepQuiet(1);
          evaluateNmCoordinator();
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Gọi Nm_CheckRemoteSleepIndication(Ch0) kiểm tra cờ từ Nm API",
        run() {
          const r = simState.channels[0].remoteSleepInd;
          addTraceLog("info", "App/BswM", "Nm", "Nm_CheckRemoteSleepIndication(0) -> " + (r ? "TRUE" : "FALSE"), "[SWS_Nm_00153] Truy vấn trạng thái RemoteSleep qua giao diện Nm.");
          simState.stepExplain = "What-If: Nm_CheckRemoteSleepIndication(0) trả về isRemoteSleep = " + (r ? "TRUE (sẵn sàng ngủ)" : "FALSE (node từ xa vẫn đang phát)") + ".";
        }
      },
      {
        label: "🧪 Bật NmChannelSleepMaster = TRUE trên Ch1 (Ch1 ngủ không cần chờ node con)",
        run() {
          ecucConfig.NmChannelSleepMaster = true;
          syncConfigToDOM();
          if (!simState.channels[1].commRequested) simState.channels[1].remoteSleepInd = true;
          evaluateNmCoordinator();
          simState.stepExplain = "What-If (SWS_Nm_00228): Với NmChannelSleepMaster=TRUE, Ch1 lập tức sẵn sàng ngủ ngay khi ComM thả mà không cần Nm_RemoteSleepIndication(Ch1)!";
        }
      },
      {
        label: "🧪 Tắt NmCoordinatorSupportEnabled = FALSE rồi Release Ch0",
        run() {
          applyPresetBase({ NmCoordinatorSupportEnabled: false });
          api_Nm_NetworkRequest(0);
          api_Nm_NetworkRequest(1);
          advanceTicks(1500, 100);
          api_Nm_NetworkRelease(0);
          simState.stepExplain = "What-If: Khi tắt Coordinator, Nm_NetworkRelease(0) truyền thẳng xuống CanNm_NetworkRelease(0) ➔ Ch0 vào Ready Sleep ngay bất chấp Ch1 vẫn đang thức!";
        }
      }
    ]
  },

  {
    id: "S9",
    group: "Nhóm 3: Thuật Toán NM Coordinator Điều Phối Cụm Đa Kênh (Ch0 & Ch1)",
    title: "S9: Đóng Cụm Mạng Đồng Bộ Hoàn Chỉnh (SynchronizationPoint, SetSleepReadyBit SRB=1 & ShutdownDelayTimer)",
    summary: "Trình diễn quy trình Coordinated Shutdown chuẩn AUTOSAR R22-11 (SWS_Nm_00226 / 00232 / 00236): đợi Nm_SynchronizationPoint(), gọi CanNm_SetSleepReadyBit(TRUE) bật CBV Bit 3 = 1, đếm ngược NmShutdownDelayTimer rồi giải phóng đồng loạt Ch0 & Ch1.",
    setup() {
      applyPresetBase({
        NmCoordinatorSupportEnabled: true,
        NmActiveCoordinator: true,
        NmChannelSleepMaster: true,
        NmSynchronizingNetwork: true,
        NmGlobalCoordinatorTime: 1500,
        CanNmMsgCycleTime: 1000
      });
      api_Nm_NetworkRequest(0);
      api_Nm_NetworkRequest(1);
      advanceTicks(1500, 100);
      simState.stepExplain = "Bước 0: Cụm mạng Ch0 & Ch1 đang ở Normal Operation, bật NmSynchronizingNetwork=TRUE & NmChannelSleepMaster=TRUE (Ch1).";
    },
    steps: [
      {
        title: "ComM Release Ch0 & Ch1 + Ch0 đạt RemoteSleep ➔ Chờ Nm_SynchronizationPoint()",
        desc: "Cả 2 kênh đủ điều kiện ngủ, nhưng vì NmSynchronizingNetwork=TRUE, Coordinator đứng đợi CanNm phát gói NM kế tiếp báo Nm_SynchronizationPoint(0) [SWS_Nm_00226].",
        exec() {
          simState.syncPointDone = false;
          api_Nm_NetworkRelease(0);
          api_Nm_NetworkRelease(1);
          api_TriggerRemoteSleepQuiet(0);
          evaluateNmCoordinator();
        }
      },
      {
        title: "CanNm gọi Nm_SynchronizationPoint(0) ➔ CanNm_SetSleepReadyBit(0, TRUE)",
        desc: "Ngay tại điểm đồng bộ Tx, Nm Coordinator vào NM_COORD_SHUTDOWN_INITIATED (Bit 7 Thanh B=1), gọi CanNm_SetSleepReadyBit(0, TRUE) bật CBV Bit 3 (SRB=1) và nạp NmShutdownDelayTimer = 1500ms!",
        exec() {
          api_CanNm_TransmitFrame(0, "Sync Point Tx Trigger");
          evaluateNmCoordinator();
        }
      },
      {
        title: "Tick +1500ms — NmShutdownDelayTimer = 0 ➔ CanNm_NetworkRelease(All)",
        desc: "Hết thời gian trễ đồng bộ, Nm Coordinator gọi đồng thời CanNm_NetworkRelease(0) và CanNm_NetworkRelease(1) ➔ cả Ch0 & Ch1 cùng nhảy sang READY_SLEEP!",
        exec() { advanceTicks(1500, 100); }
      },
      {
        title: "Tick +3500ms — Cả Cụm Cùng Về PREPARE_BUS_SLEEP ➔ BUS_SLEEP Tuyệt Đối",
        desc: "Hết CanNmTimeoutTime (2000ms) + WaitBusSleepTime (1500ms), cả 2 kênh cùng chìm vào Bus-Sleep và Cluster đạt NM_COORD_CLUSTER_SLEEP!",
        exec() { advanceTicks(3500, 100); }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Tắt NmSynchronizingNetwork = FALSE (Không đợi SynchronizationPoint)",
        run() {
          applyPresetBase({ NmCoordinatorSupportEnabled: true, NmSynchronizingNetwork: false, NmChannelSleepMaster: true });
          api_Nm_NetworkRequest(0);
          api_Nm_NetworkRequest(1);
          advanceTicks(1500, 100);
          api_Nm_NetworkRelease(0);
          api_Nm_NetworkRelease(1);
          api_TriggerRemoteSleepQuiet(0);
          evaluateNmCoordinator();
          simState.stepExplain = "What-If: Tắt NmSynchronizingNetwork giúp Coordinator bật SRB=1 và đếm NmShutdownDelayTimer ngay lập tức khi đủ RemoteSleep!";
        }
      },
      {
        label: "🧪 Tăng NmGlobalCoordinatorTime lên 2200ms rồi khởi động Shutdown",
        run() {
          applyPresetBase({ NmCoordinatorSupportEnabled: true, NmSynchronizingNetwork: false, NmGlobalCoordinatorTime: 2200, NmChannelSleepMaster: true });
          api_Nm_NetworkRequest(0);
          api_Nm_NetworkRequest(1);
          advanceTicks(1500, 100);
          api_Nm_NetworkRelease(0);
          api_Nm_NetworkRelease(1);
          api_TriggerRemoteSleepQuiet(0);
          evaluateNmCoordinator();
          simState.stepExplain = "What-If: Thanh tiến trình NmShutdownDelayTimer khởi đầu ở 2200ms theo NmGlobalCoordinatorTime mới.";
        }
      },
      {
        label: "🧪 Bắn gói Rx từ Node 0x2B khi Timer đang ở 600ms (Xem Abort!)",
        run() {
          if (simState.coordState !== "NM_COORD_SHUTDOWN_INITIATED") {
            applyPresetBase({ NmCoordinatorSupportEnabled: true, NmSynchronizingNetwork: false, NmChannelSleepMaster: true });
            api_Nm_NetworkRequest(0);
            api_Nm_NetworkRequest(1);
            advanceTicks(1500, 100);
            api_Nm_NetworkRelease(0);
            api_Nm_NetworkRelease(1);
            api_TriggerRemoteSleepQuiet(0);
            evaluateNmCoordinator();
            advanceTicks(900, 100);
          }
          api_CanNm_RxIndication(0, { nodeId: 0x2B, awb: true });
          simState.stepExplain = "What-If: Đang đếm ShutdownDelayTimer mà có Node 0x2B phát gói Rx ➔ Nm_RemoteSleepCancellation() kích hoạt ABORT SHUTDOWN ngay lập tức!";
        }
      }
    ]
  },

  {
    id: "S10",
    group: "Nhóm 3: Thuật Toán NM Coordinator Điều Phối Cụm Đa Kênh (Ch0 & Ch1)",
    title: "S10: Hủy Khẩn Cấp Quy Trình Ngủ Cụm Mạng (Abort Shutdown: Nm_RemoteSleepCancellation ➔ SRB 1➔0)",
    summary: "Minh họa cơ chế bảo vệ chống ngủ lệch pha (SWS_Nm_00180): đang giữa NmShutdownDelayTimer với CBV Bit 3 SRB=1, một node trên Ch0 bất ngờ thức dậy ➔ CanNm gọi Nm_RemoteSleepCancellation ➔ Coordinator hủy tắt và giữ lại toàn bộ Cluster!",
    setup() {
      applyPresetBase({
        NmCoordinatorSupportEnabled: true,
        NmActiveCoordinator: true,
        NmChannelSleepMaster: true,
        NmSynchronizingNetwork: false,
        NmGlobalCoordinatorTime: 1500
      });
      api_Nm_NetworkRequest(0);
      api_Nm_NetworkRequest(1);
      advanceTicks(1500, 100);
      api_Nm_NetworkRelease(0);
      api_Nm_NetworkRelease(1);
      api_TriggerRemoteSleepQuiet(0);
      evaluateNmCoordinator();
      simState.stepExplain = "Bước 0: Cụm mạng vừa vào NM_COORD_SHUTDOWN_INITIATED (CBV Bit 3 SRB=1, NmShutdownDelayTimer = 1500ms).";
    },
    steps: [
      {
        title: "Tick +700ms — NmShutdownDelayTimer đang đếm ngược còn 800ms (SRB=1)",
        desc: "Cả cụm mạng sắp chạm mốc 0ms để cùng Release về Ready Sleep; Thanh B giữ Bit 7 COORD_SHDN_RUN=1 & Bit 4 COORD_SRB=1.",
        exec() { advanceTicks(700, 100); }
      },
      {
        title: "Node 0x2B bất ngờ thức dậy! Rx ➔ Nm_RemoteSleepCancellation(0) ➔ ABORT!",
        desc: "CanNm Ch0 nhận gói NM và báo ngay Nm_RemoteSleepCancellation(0). Theo SWS_Nm_00180, Nm Coordinator: (1) Dừng ShutdownDelayTimer; (2) Gọi CanNm_SetSleepReadyBit(0, FALSE) xóa SRB về 0; (3) Phát gói hủy và giữ cả Ch0/Ch1 tiếp tục thức!",
        exec() { api_CanNm_RxIndication(0, { nodeId: 0x2B, awb: true }); }
      },
      {
        title: "Các node im lặng lại ➔ Chờ đủ RemoteSleep lần 2 để đóng cụm an toàn",
        desc: "Sau khi Node 0x2B xong việc, hết CanNmRemoteSleepIndTime (1500ms), Coordinator tự động tái khởi động quy trình Coordinated Shutdown sạch sẽ.",
        exec() { advanceTicks(1500, 100); }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Kích hoạt Abort Shutdown bằng lời gọi Nm_NetworkRequest(Ch1) từ ComM",
        run() {
          applyPresetBase({ NmCoordinatorSupportEnabled: true, NmSynchronizingNetwork: false, NmChannelSleepMaster: true });
          api_Nm_NetworkRequest(0);
          api_Nm_NetworkRequest(1);
          advanceTicks(1500, 100);
          api_Nm_NetworkRelease(0);
          api_Nm_NetworkRelease(1);
          api_TriggerRemoteSleepQuiet(0);
          evaluateNmCoordinator();
          advanceTicks(500, 100);
          api_Nm_NetworkRequest(1);
          simState.stepExplain = "What-If: ComM xin lại mạng trên nhánh phụ Ch1 ngay giữa pha ShutdownDelayTimer ➔ Coordinator lập tức hủy SRB=0 và kéo toàn cụm về ACTIVE!";
        }
      },
      {
        label: "🧪 Cho NmShutdownDelayTimer chạy nốt 1500ms nếu KHÔNG bị hủy",
        run() {
          advanceTicks(1500, 100);
          simState.stepExplain = "What-If: Khi không có sự kiện phá bĩnh nào suốt 1500ms, cả Ch0 và Ch1 đã đồng loạt rời Normal Operation sang Ready Sleep.";
        }
      },
      {
        label: "🧪 Bắn thêm 1 gói Rx nữa để giữ Ch0 thức thêm 1500ms",
        run() {
          api_CanNm_RxIndication(0, { nodeId: 0x2B, awb: false });
          simState.stepExplain = "What-If: Mỗi gói Rx mới sẽ reset CanNmRemoteSleepIndTime về 1500ms!";
        }
      }
    ]
  },

  {
    id: "S11",
    group: "Nhóm 3: Thuật Toán NM Coordinator Điều Phối Cụm Đa Kênh (Ch0 & Ch1)",
    title: "S11: Active vs Passive Coordinator Qua CBV Bit 3 (Nm_CoordReadyToSleepIndication & Cancellation)",
    summary: "Khi ECU cấu hình NmActiveCoordinator = FALSE (Passive Coordinator), ECU không tự đặt Bit 3 mà lắng nghe bit CSR/SRB của Main Coordinator (Node 0x2B) qua Nm_CoordReadyToSleepIndication() và Nm_CoordReadyToSleepCancellation().",
    setup() {
      applyPresetBase({
        NmCoordinatorSupportEnabled: true,
        NmActiveCoordinator: false,
        NmChannelSleepMaster: true,
        NmSynchronizingNetwork: false
      });
      api_Nm_NetworkRequest(0);
      api_Nm_NetworkRequest(1);
      advanceTicks(1500, 100);
      api_Nm_NetworkRelease(0);
      api_Nm_NetworkRelease(1);
      simState.stepExplain = "Bước 0: ECU đóng vai Passive Coordinator (NmActiveCoordinator=FALSE), đang chạy cùng cụm với Main Active Coordinator Node 0x2B.";
    },
    steps: [
      {
        title: "Main Coordinator (0x2B) phát gói Rx có CBV Bit 3 SRB=1 ➔ CoordReadyToSleepIndication",
        desc: "CanNm phát hiện Bit 3 chuyển 0➔1 từ Node 0x2B và gọi ngay callback Nm_CoordReadyToSleepIndication(0) [SWS_CanNm_00344] lên Passive Coordinator!",
        exec() { api_CanNm_RxIndication(0, { nodeId: 0x2B, srb: true }); }
      },
      {
        title: "Main Coordinator (0x2B) đổi ý phát SRB=0 ➔ CoordReadyToSleepCancellation",
        desc: "CanNm phát hiện Bit 3 sụt 1➔0 và gọi ngay Nm_CoordReadyToSleepCancellation(0) [SWS_CanNm_00349] báo Passive Coordinator hủy ý định ngủ!",
        exec() { api_CanNm_RxIndication(0, { nodeId: 0x2B, srb: false }); }
      },
      {
        title: "Main Coordinator (0x2B) gửi lại SRB=1 + Hết RemoteSleep ➔ Đồng bộ ngủ",
        desc: "Main Coordinator tái khẳng định SRB=1 và các node im lặng ➔ Passive Coordinator tiến hành đồng bộ đóng nhánh Ch0 & Ch1.",
        exec() {
          api_CanNm_RxIndication(0, { nodeId: 0x2B, srb: true });
          api_TriggerRemoteSleepQuiet(0);
          evaluateNmCoordinator();
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Chuyển vai trò thành Active Coordinator (NmActiveCoordinator = TRUE)",
        run() {
          ecucConfig.NmActiveCoordinator = true;
          syncConfigToDOM();
          if (simState.channels[0].canNmMode === "NM_MODE_NETWORK") api_CanNm_SetSleepReadyBit(0, true);
          simState.stepExplain = "What-If: Với NmActiveCoordinator=TRUE, chính ECU này chủ động gọi CanNm_SetSleepReadyBit(0, TRUE) đặt Bit 3=1 trên khung Tx của mình.";
        }
      },
      {
        label: "🧪 Bắn gói Rx SRB=1 từ Main Coordinator 0x2B",
        run() {
          ecucConfig.NmActiveCoordinator = false;
          syncConfigToDOM();
          api_CanNm_RxIndication(0, { nodeId: 0x2B, srb: true });
          simState.stepExplain = "What-If: CanNm phát hiện cạnh lên SRB 0➔1 và gọi Nm_CoordReadyToSleepIndication(0).";
        }
      },
      {
        label: "🧪 Bắn gói Rx SRB=0 hủy từ Main Coordinator 0x2B",
        run() {
          ecucConfig.NmActiveCoordinator = false;
          syncConfigToDOM();
          api_CanNm_RxIndication(0, { nodeId: 0x2B, srb: false });
          simState.stepExplain = "What-If: CanNm phát hiện cạnh xuống SRB 1➔0 và gọi Nm_CoordReadyToSleepCancellation(0).";
        }
      }
    ]
  },

  // -------------------- NHÓM 4: PARTIAL NETWORKING, SYNC PNC SHUTDOWN & FAULT HANDLING --------------------
  {
    id: "S12",
    group: "Nhóm 4: Partial Networking, Sync PNC Shutdown & Fault Handling",
    title: "S12: Bộ Lọc Partial Networking (CanNmPnEnabled, Bit 6 PNI=1) & Báo Cáo ERA/EIRA Lên ComM",
    summary: "Trình diễn cách CanNm lọc gói tin theo mặt nạ PNC (CanNmPnFilterMaskHex = 05 00 cho PNC #16 & #18): gói không khớp bị loại bỏ không reset Timeout; gói khớp cập nhật EIRA/ERA báo lên ComM và nạp CanNmPnResetTime.",
    setup() {
      applyPresetBase({
        NmCoordinatorSupportEnabled: false,
        CanNmPnEnabled: true,
        CanNmPnFilterMaskHex: "05 00",
        CanNmPnResetTime: 1500
      });
      simState.pnAvailConfirmed = false;
      simState.eiraMask = 0x0000;
      simState.eraCh0Mask = 0x0000;
      recomputeRegisters();
      simState.stepExplain = "Bước 0: CanNmPnEnabled=TRUE với Filter Mask = 05 00 (PNC #16=0x0001 & PNC #18=0x0004). Chờ CanSM mở khóa bộ lọc via CanNm_ConfirmPnAvailability().";
    },
    steps: [
      {
        title: "CanSM xác nhận CanNm_ConfirmPnAvailability(0) & ComM đánh thức Ch0",
        desc: "CanNm kích hoạt bộ lọc Partial Networking (Bit 6 PNI=1 trên CBV) và khởi chạy kênh ở Normal Operation.",
        exec() {
          simState.pnAvailConfirmed = true;
          addTraceLog("ok", "CanSM", "CanNm(Ch0)", "CanNm_ConfirmPnAvailability(0)", "[SWS_CanNm_00404] Kích hoạt bộ lọc phần cứng/phần mềm Partial Networking.");
          api_Nm_NetworkRequest(0);
          advanceTicks(1500, 100);
        }
      },
      {
        title: "Nhận Rx PNC #17 (0x0002) — KHÔNG khớp Mask 0x0500 ➔ Bị DROP!",
        desc: "Phép (0x0002 & 0x0005) == 0 ➔ CanNm bỏ qua hoàn toàn gói tin [SWS_CanNm_00409], KHÔNG nạp lại CanNmTimeoutTime và KHÔNG báo Nm_PduRxIndication()!",
        exec() { api_CanNm_RxIndication(0, { nodeId: 0x2B, pni: true, pniMask: 0x0002 }); }
      },
      {
        title: "Nhận Rx PNC #16 (0x0001) — KHỚP Mask ➔ Cập nhật EIRA/ERA & Nạp PnResetTime",
        desc: "Phép (0x0001 & 0x0005) != 0 ➔ CanNm nạp lại Timeout, bật bit PNC #16 trong EIRA/ERA, chạy CanNmPnResetTime=1500ms và gọi PduR_CanNmRxIndication() lên ComM!",
        exec() { api_CanNm_RxIndication(0, { nodeId: 0x2B, pni: true, pniMask: 0x0001 }); }
      },
      {
        title: "Tick +1500ms — Hết CanNmPnResetTime ➔ Xóa bit PNC trong EIRA/ERA về 0x0000",
        desc: "Không còn ECU nào yêu cầu PNC #16, CanNm giải phóng bit PNC trong vector EIRA/ERA báo lên ComM ngừng kích hoạt cụm chức năng con.",
        exec() { advanceTicks(1500, 100); }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Bắn gói Rx PNI = [02 00] (PNC #17 — Ngoài Mask)",
        run() {
          simState.pnAvailConfirmed = true;
          api_CanNm_RxIndication(0, { nodeId: 0x2B, pni: true, pniMask: 0x0002 });
          simState.stepExplain = "What-If: Gói tin PNC #17 bị bộ lọc CanNm loại bỏ ngay lập tức, không làm xáo trộn EIRA/Timeout của ECU!";
        }
      },
      {
        label: "🧪 Bắn gói Rx PNI = [05 00] (PNC #16 & #18 — Khớp toàn bộ Mask)",
        run() {
          simState.pnAvailConfirmed = true;
          api_CanNm_RxIndication(0, { nodeId: 0x2B, pni: true, pniMask: 0x0005 });
          simState.stepExplain = "What-If: EIRA & ERA cùng bật cả PNC #16 & PNC #18 (0x0005) và nạp lại CanNmPnResetTime = 1500ms.";
        }
      },
      {
        label: "🧪 Bắn gói Rx thường có PNI = 0 khi CanNmPnEnabled = TRUE",
        run() {
          simState.pnAvailConfirmed = true;
          api_CanNm_RxIndication(0, { nodeId: 0x2B, pni: false, pniMask: 0x0005 });
          simState.stepExplain = "What-If: Vì PNI Bit 6 == 0, gói NM không mang thông tin PNC hợp lệ nên vẫn bị bộ lọc PN bỏ qua (SWS_CanNm_00409).";
        }
      }
    ]
  },

  {
    id: "S13",
    group: "Nhóm 4: Partial Networking, Sync PNC Shutdown & Fault Handling",
    title: "S13: Synchronized PNC Shutdown 2 Chiều R22-11 (Request ➔ Bit 5 PNSR=1 ➔ ForwardSynchronizedPncShutdown)",
    summary: "Tính năng mới AUTOSAR R20-11/R22-11/R23-11: (1) Chiều phát ComM ➔ Nm_RequestSynchronizedPncShutdown() ➔ CanNm đặt CBV Bit 5 PNSR=1; (2) Chiều nhận PNSR=1 ➔ CanNm báo Nm_ForwardSynchronizedPncShutdown() ➔ ComM.",
    setup() {
      applyPresetBase({
        NmCoordinatorSupportEnabled: false,
        CanNmPnEnabled: true,
        NmSynchronizedPncShutdownEnabled: true,
        CanNmPnFilterMaskHex: "05 00"
      });
      api_Nm_NetworkRequest(0);
      advanceTicks(1500, 100);
      simState.eiraMask = 0x0001;
      recomputeRegisters();
      simState.stepExplain = "Bước 0: Kênh Ch0 đang ở Normal Operation với PNC #16 (0x0001) đang hoạt động và NmSynchronizedPncShutdownEnabled = TRUE.";
    },
    steps: [
      {
        title: "Chiều phát (Coordinator): ComM gọi Nm_RequestSynchronizedPncShutdown(0, PNC #16)",
        desc: "Nm chuyển tiếp xuống CanNm_RequestSynchronizedPncShutdown(0, PNC #16). CanNm bật Bit 5 (PNSR=1) cùng Bit 6 (PNI=1) trên CBV (0x60) và phát ngay gói lệnh tắt đồng bộ!",
        exec() { api_Nm_RequestSynchronizedPncShutdown(0, 16); }
      },
      {
        title: "Chiều nhận (Subordinate Node): Nhận Rx có PNI=1 & PNSR=1 từ Gateway",
        desc: "Khi nhận được gói có Bit 5 PNSR=1 & Bit 6 PNI=1, CanNm trích xuất vector PNC và gọi ngay Nm_ForwardSynchronizedPncShutdown(0) ➔ ComM_Nm_ForwardSynchronizedPncShutdown()!",
        exec() {
          simState.channels[0].cbv.pnsr = false;
          api_CanNm_RxIndication(0, { nodeId: 0x2B, pni: true, pnsr: true, pniMask: 0x0001 });
        }
      },
      {
        title: "Tick +1500ms — Các node tắt đồng loạt PNC #16 & Xóa EIRA",
        desc: "ComM phát hành Release PNC #16 đồng bộ và CanNm xóa Bit PNC sau khi hết CanNmPnResetTime.",
        exec() { advanceTicks(1500, 100); }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Gọi Nm_RequestSynchronizedPncShutdown(0, PNC #18)",
        run() {
          api_Nm_RequestSynchronizedPncShutdown(0, 18);
          simState.stepExplain = "What-If: Bit 5 (PNSR=1) bật sáng kèm PNC #18 (0x0004) trong Byte 2..3 của khung NM PDU phát ra!";
        }
      },
      {
        label: "🧪 Bắn gói Rx PNI=1 & PNSR=1 (0x0005) từ Gateway 0x2B",
        run() {
          api_CanNm_RxIndication(0, { nodeId: 0x2B, pni: true, pnsr: true, pniMask: 0x0005 });
          simState.stepExplain = "What-If: CanNm nhận cả PNC #16 & #18 kèm PNSR=1 và chuyển tiếp qua Nm_ForwardSynchronizedPncShutdown ➔ ComM!";
        }
      },
      {
        label: "🧪 Tắt NmSynchronizedPncShutdownEnabled = FALSE",
        run() {
          ecucConfig.NmSynchronizedPncShutdownEnabled = false;
          syncConfigToDOM();
          api_Nm_RequestSynchronizedPncShutdown(0, 16);
          simState.stepExplain = "What-If: Khi tắt NmSynchronizedPncShutdownEnabled=FALSE, lời gọi Nm_RequestSynchronizedPncShutdown() trả về E_NOT_OK.";
        }
      }
    ]
  },

  {
    id: "S14",
    group: "Nhóm 4: Partial Networking, Sync PNC Shutdown & Fault Handling",
    title: "S14: UDS 0x28 (Nm_DisableCommunication / Enable) & Lỗi Nm_TxTimeoutException / DET",
    summary: "Tổng hợp điều khiển chẩn đoán và xử lý lỗi: (1) UDS 0x28 khóa phát NM PDU & đóng băng Timeout Timer; (2) Mất TxConfirmation quá CanNmMsgTimeoutTime báo Nm_TxTimeoutException; (3) Lỗi DET trên cả Nm (Id 29) & CanNm (Id 31).",
    setup() {
      applyPresetBase({
        NmCoordinatorSupportEnabled: false,
        NmComControlEnabled: true,
        CanNmMsgTimeoutTime: 500,
        NmDevErrorDetect: true
      });
      api_Nm_NetworkRequest(0);
      advanceTicks(1500, 100);
      simState.stepExplain = "Bước 0: Kênh Ch0 đang ở Normal Operation, NmComControlEnabled=TRUE và CanNmMsgTimeoutTime=500ms.";
    },
    steps: [
      {
        title: "UDS 0x28: Dcm gọi Nm_DisableCommunication(0) ➔ CanNm_DisableCommunication(0)",
        desc: "CanNm dừng ngay mọi hoạt động truyền NM PDU và ĐÓNG BĂNG NM-Timeout Timer (Bit 1 CANNM_TMO_RUN hạ về 0) để ECU không bị rơi về ngủ khi đang flash/chẩn đoán!",
        exec() { api_Nm_DisableOrEnableComm(0, true); }
      },
      {
        title: "Mở lại truyền thông: Nm_EnableCommunication(0) ➔ CanNm_EnableCommunication(0)",
        desc: "NM-Timeout Timer (Bit 1 = 1) và MsgCycleTimer được nạp lại, đường truyền NM trở lại bình thường.",
        exec() { api_Nm_DisableOrEnableComm(0, false); }
      },
      {
        title: "Giả lập CAN Bus-Off (Mất TxConfirmation 500ms) ➔ Nm_TxTimeoutException()",
        desc: "Chặn CanNm_TxConfirmation() và phát gói Tx: sau 500ms, CanNmMsgTimeoutTime về 0 ➔ CanNm báo đồng thời Nm_TxTimeoutException(0) và CanSM_TxTimeoutException(0)!",
        exec() {
          simState.txConfirmBlocked = true;
          api_CanNm_TransmitFrame(0, "Tx Without TxConfirmation (Bus-Off)");
          advanceTicks(500, 100);
          simState.txConfirmBlocked = false;
        }
      },
      {
        title: "Kiểm thử DET đa tầng: Tắt Init rồi gọi Nm & CanNm (Id 29 & Id 31)",
        desc: "Khi đặt NmCanNmInitialized=FALSE, gọi Nm_NetworkRequest(0) báo NM_E_UNINIT (0x00, ModuleId 29) và CanNm_NetworkRequest(0) báo CANNM_E_UNINIT (0x01, ModuleId 31) tới Det_ReportError()!",
        exec() {
          ecucConfig.NmCanNmInitialized = false;
          syncConfigToDOM();
          api_Nm_NetworkRequest(0);
          api_CanNm_NetworkRequest(0);
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Bật/Tắt nhanh Nm_DisableCommunication(0) / Enable",
        run() {
          ecucConfig.NmCanNmInitialized = true;
          syncConfigToDOM();
          if (simState.channels[0].canNmMode !== "NM_MODE_NETWORK") api_Nm_NetworkRequest(0);
          api_Nm_DisableOrEnableComm(0, !simState.commDisabled);
          simState.stepExplain = "What-If: Đã đảo trạng thái UDS 0x28 CommunicationControl -> " + (simState.commDisabled ? "DISABLED (Khóa Tx & Đóng băng Timeout)" : "ENABLED (Mở lại Tx & Timer)") + ".";
        }
      },
      {
        label: "🧪 Giả lập hết hạn CanNmMsgTimeoutTime (500ms) ngay bây giờ",
        run() {
          ecucConfig.NmCanNmInitialized = true;
          syncConfigToDOM();
          if (simState.channels[0].canNmMode !== "NM_MODE_NETWORK") api_Nm_NetworkRequest(0);
          simState.txConfirmBlocked = true;
          api_CanNm_TransmitFrame(0, "Forced MsgTimeout Test");
          advanceTicks(500, 100);
          simState.txConfirmBlocked = false;
          simState.stepExplain = "What-If: Đã kích hoạt Nm_TxTimeoutException(0) & CanSM_TxTimeoutException(0) do mất TxConfirmation!";
        }
      },
      {
        label: "🧪 Khôi phục Init = TRUE & chạy lại Bình Thường",
        run() {
          ecucConfig.NmCanNmInitialized = true;
          syncConfigToDOM();
          api_Nm_NetworkRequest(0);
          simState.stepExplain = "What-If: Đã bật lại NmCanNmInitialized=TRUE (Bit 0 Thanh B = 1) và thoát trạng thái lỗi DET.";
        }
      }
    ]
  }
];
