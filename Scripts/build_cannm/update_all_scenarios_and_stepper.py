# -*- coding: utf-8 -*-
"""
Script to update SCENARIOS in part4_engine_and_scenarios.js with Step 0 for all S1..S14,
update part5_ui_and_exports.js with resetScenario() and step counter logic,
and update part2_body_structure.html with onclick="resetScenario()".
"""

import os
import sys

def update_part4():
    p4_path = r"D:\__Personal\AntiGravity\build_cannm\part4_engine_and_scenarios.js"
    with open(p4_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Find where const SCENARIOS = { starts
    idx = content.find("const SCENARIOS = {")
    if idx == -1:
        print("Error: Could not find const SCENARIOS in part4")
        sys.exit(1)

    prefix = content[:idx]

    new_scenarios = """const SCENARIOS = {
  1: {
    title: "S1: Active Wakeup từ App SWC (AWB=1 & Immediate Burst Tx)",
    steps: [
      {
        api: "Bước 0: Chuẩn bị kịch bản & Thiết lập điều kiện ban đầu (Precondition)",
        io: "Trạng thái sẵn sàng: NM_MODE_BUS_SLEEP | Timers = OFF | CBV = 0x00 | Burst Tx = 3",
        desc: "ECU đang ở chế độ Bus-Sleep Mode, mọi bộ đếm thời gian tắt. Cấu hình kiểm thử: CanNmImmediateNmTransmissions = 3, CanNmActiveWakeupBitEnabled = TRUE. Bấm 'Tiếp Theo ▶' để bắt đầu phát lệnh Active Wakeup.",
        action: () => {
          resetSimulation();
          ecucConfig.CanNmImmediateNmTransmissions = 3;
          ecucConfig.CanNmActiveWakeupBitEnabled = true;
          ecucConfig.CanNmPassiveModeEnabled = false;
          addTraceLog("INIT", "Precondition", "S1 Sẵn Sàng: ECU đang ở Bus-Sleep Mode", "Chờ SWC phát lệnh ComM_RequestComMode() để thực hiện Active Wakeup.");
        }
      },
      {
        api: "Bước 1: SWC gọi ComM_RequestComMode(COMM_FULL_COMMUNICATION)",
        io: "Input: SWC_App -> ComM -> Nm -> CanNm_NetworkRequest()",
        desc: "ECU đang ở Bus-Sleep Mode. Người dùng bật khóa điện hoặc mở cửa xe, SWC kích hoạt yêu cầu mạng chủ động. CanNM chuyển sang Repeat Message State và bật Bit 4 (AWB = 1) trong CBV.",
        action: () => {
          apiNetworkRequest();
        }
      },
      {
        api: "Bước 2: Bắn chùm gói tin tốc độ cao (Immediate Burst Tx #2 & #3)",
        io: "Input: SchM Clock +100ms -> CanNm -> CanIf_Transmit()",
        desc: "Vì CanNmImmediateNmTransmissions = 3 và ImmediateNmCycleTime = 100ms, CanNM bắn liên tiếp 3 gói NM PDU tốc độ cao để đánh thức nhanh toàn mạng trước khi quay về chu kỳ chuẩn.",
        action: () => {
          stepClockTick(100);
          stepClockTick(100);
        }
      },
      {
        api: "Bước 3: Hết thời gian RepeatMessageTime (1500ms) -> Chuyển sang Normal Operation",
        io: "Input: CanNm_MainFunction() -> CanNm -> Normal Operation State",
        desc: "Đã trôi qua 1500ms ở Repeat Message State. Vì SWC vẫn đang giữ mạng (Network Requested), CanNM chuyển sang Normal Operation State và duy trì phát định kỳ mỗi CanNmMsgCycleTime (1000ms).",
        action: () => {
          stepClockTick(1300);
        }
      },
      {
        api: "Bước 4: Mạng hoạt động ổn định ở Normal Operation State",
        io: "Input: SchM MainFunction +1000ms -> CanIf_Transmit()",
        desc: "ECU định kỳ phát gói NM PDU mỗi 1000ms. Byte CBV = 0x10 (AWB=1) để báo cho các ECU khác biết node này là Wakeup Master.",
        action: () => {
          stepClockTick(1000);
        }
      }
    ],
    whatIf: [
      { label: "Đặt Immediate Transmissions = 0", action: () => { ecucConfig.CanNmImmediateNmTransmissions = 0; onConfigChange("CanNmImmediateNmTransmissions"); } },
      { label: "Tắt Bit 4 AWB (CanNmActiveWakeupBitEnabled = FALSE)", action: () => { ecucConfig.CanNmActiveWakeupBitEnabled = false; onConfigChange("CanNmActiveWakeupBitEnabled"); } },
      { label: "Bật Passive Mode (CanNmPassiveModeEnabled = TRUE)", action: () => { ecucConfig.CanNmPassiveModeEnabled = true; onConfigChange("CanNmPassiveModeEnabled"); } }
    ]
  },

  2: {
    title: "S2: Passive Startup từ CAN Bus (AWB=0 -> Rơi về Ready Sleep)",
    steps: [
      {
        api: "Bước 0: Chuẩn bị kịch bản & Thiết lập điều kiện ban đầu (Precondition)",
        io: "Trạng thái sẵn sàng: NM_MODE_BUS_SLEEP | Timers = OFF | CBV = 0x00 | App Req = False",
        desc: "ECU đang ở chế độ Bus-Sleep Mode. Ứng dụng nội bộ không có nhu cầu mạng (Network Released). Bấm 'Tiếp Theo ▶' để giả lập nhận bản tin NM từ Remote ECU trên bus.",
        action: () => {
          resetSimulation();
          addTraceLog("INIT", "Precondition", "S2 Sẵn Sàng: ECU đang ở Bus-Sleep Mode", "Chờ bản tin NM từ Remote ECU trên bus đánh thức thụ động (Passive Startup).");
        }
      },
      {
        api: "Bước 1: ECU đang ngủ, nhận được gói tin NM từ Remote ECU Node 0x2B",
        io: "Input: Bus CAN -> CanIf_RxIndication() -> CanNm -> Nm_NetworkStartIndication()",
        desc: "ECU đang ở Bus-Sleep Mode. Một ECU khác trên xe thức dậy và phát bản tin NM. CanIf bắt được và báo lên CanNM. CanNM gọi Nm_NetworkStartIndication() để ComM gọi CanNm_PassiveStartUp().",
        action: () => {
          apiPassiveStartUp();
        }
      },
      {
        api: "Bước 2: Phát gói NM đầu tiên trễ theo CanNmMsgCycleOffset (100ms)",
        io: "Input: SchM Clock +100ms -> CanNm -> CanIf_Transmit()",
        desc: "Khác với Active Wakeup (phát ngay tại t=0ms), khi Passive Startup, CanNM chờ hết MsgCycleOffset để tránh xung đột đường truyền. Byte CBV = 0x00 (AWB = 0 vì thức dậy thụ động!).",
        action: () => {
          stepClockTick(100);
        }
      },
      {
        api: "Bước 3: Hết RepeatMessageTime (1500ms) -> Tự động rẽ sang Ready Sleep State",
        io: "Input: CanNm_MainFunction() -> CanNm -> Ready Sleep State",
        desc: "Vì SWC của bản thân ECU này không yêu cầu mạng (Network Released), sau khi hết thời gian điểm danh ở Repeat Message State, CanNM rẽ sang Ready Sleep State và NGƯNG PHÁT bản tin NM!",
        action: () => {
          stepClockTick(1400);
        }
      }
    ],
    whatIf: [
      { label: "Gọi CanNm_NetworkRequest() khi đang ở Ready Sleep", action: () => apiNetworkRequest() },
      { label: "Bắn thêm gói Rx từ Node #2 để nạp lại Timeout Timer", action: () => apiSimulatedRxIndication() },
      { label: "Tăng MsgCycleOffset lên 300ms", action: () => { ecucConfig.CanNmMsgCycleOffset = 300; onConfigChange("CanNmMsgCycleOffset"); } }
    ]
  },

  3: {
    title: "S3: Chu Trình Ngủ Mạng Đồng Bộ 4 Pha Chuẩn AUTOSAR",
    steps: [
      {
        api: "Bước 0: Chuẩn bị kịch bản & Thiết lập điều kiện ban đầu (Precondition)",
        io: "Trạng thái sẵn sàng: NM_STATE_NORMAL_OPERATION | TimeoutTimer = 2000ms | MsgCycle = 1000ms",
        desc: "ECU đang hoạt động bình thường ở Normal Operation State, ứng dụng SWC đang giữ mạng và định kỳ phát bản tin NM PDU. Bấm 'Tiếp Theo ▶' để bắt đầu kịch bản SWC nhả mạng đi ngủ.",
        action: () => {
          resetSimulation();
          apiNetworkRequest();
          stepClockTick(1600); // Into Normal Operation
          addTraceLog("INIT", "Precondition", "S3 Sẵn Sàng: ECU đang ở Normal Operation State", "SWC đang giữ mạng, truyền phát bản tin định kỳ. Sẵn sàng theo dõi chu trình đi ngủ 4 pha.");
        }
      },
      {
        api: "Bước 1: SWC nhả mạng -> CanNm_NetworkRelease()",
        io: "Input: SWC -> ComM -> Nm -> CanNm -> Ready Sleep State",
        desc: "ECU đang ở Normal Operation State. Ứng dụng đã hoàn tất nhiệm vụ và gọi CanNm_NetworkRelease(). CanNM chuyển ngay sang Ready Sleep State và dừng phát bản tin NM định kỳ.",
        action: () => {
          apiNetworkRelease(); // Into Ready Sleep
        }
      },
      {
        api: "Bước 2: Đếm ngược NM-Timeout Timer (CanNmTimeoutTime = 2000ms)",
        io: "Input: SchM Clock -> Giảm Timeout Timer từ 2000ms về 0ms",
        desc: "Trên bus không có bất kỳ ECU nào phát bản tin NM. NM-Timeout Timer đếm lùi. Nếu có node nào phát trong thời gian này, timer sẽ lập tức nạp lại đầy 2000ms để giữ mạng thức.",
        action: () => {
          stepClockTick(1000);
        }
      },
      {
        api: "Bước 3: Hết NM-Timeout -> Chuyển sang Prepare Bus-Sleep Mode",
        io: "Input: CanNm_MainFunction() -> CanNm -> Prepare Bus-Sleep Mode",
        desc: "NM-Timeout Timer chạm 0ms! Toàn mạng đồng ý đi ngủ. CanNM xóa cờ AWB về 0, chuyển sang Prepare Bus-Sleep Mode, báo Nm_PrepareBusSleepMode() và chạy WaitBusSleepTimer (1500ms).",
        action: () => {
          stepClockTick(1000);
        }
      },
      {
        api: "Bước 4: Hết WaitBusSleepTime (1500ms) -> Vào Bus-Sleep Mode & Tắt Phần Cứng",
        io: "Input: CanNm_MainFunction() -> CanNm -> Bus-Sleep Mode",
        desc: "Sau 1500ms yên ắng tuyệt đối tại pha đệm, CanNM chuyển sang Bus-Sleep Mode, gọi Nm_BusSleepMode() để ComM ra lệnh CanSM tắt nguồn CAN Controller & Transceiver.",
        action: () => {
          stepClockTick(1500);
        }
      }
    ],
    whatIf: [
      { label: "Bắn gói Rx từ Node #2 khi đang đếm ngược ở Ready Sleep", action: () => apiSimulatedRxIndication() },
      { label: "Đặt CanNmTimeoutTime (800ms) < MsgCycleTime (1000ms)", action: () => { ecucConfig.CanNmTimeoutTime = 800; onConfigChange("CanNmTimeoutTime"); } },
      { label: "Thay đổi WaitBusSleepTime = 2000ms", action: () => { ecucConfig.CanNmWaitBusSleepTime = 2000; onConfigChange("CanNmWaitBusSleepTime"); } }
    ]
  },

  4: {
    title: "S4: Đánh Thức Khẩn Cấp Tại Prepare Bus-Sleep (Immediate Restart)",
    steps: [
      {
        api: "Bước 0: Chuẩn bị kịch bản & Thiết lập điều kiện ban đầu (Precondition)",
        io: "Trạng thái sẵn sàng: NM_MODE_PREPARE_BUS_SLEEP | WaitBusSleepTimer = 1000ms còn lại",
        desc: "ECU vừa hết hạn NM-Timeout Timer và đang nằm đếm ngược ở Prepare Bus-Sleep Mode (WaitBusSleepTimer = 1500ms). Còn 1000ms nữa là tắt nguồn. Bấm 'Tiếp Theo ▶' để SWC gọi lệnh khẩn cấp.",
        action: () => {
          resetSimulation();
          apiNetworkRequest();
          stepClockTick(1600);
          apiNetworkRelease();
          stepClockTick(2000);
          stepClockTick(500); // 1000ms left in Prepare Bus-Sleep
          addTraceLog("INIT", "Precondition", "S4 Sẵn Sàng: ECU đang ở Prepare Bus-Sleep Mode", "Còn 1000ms trước khi sập nguồn. Sẵn sàng nhận lệnh khẩn cấp để kiểm tra Immediate Restart.");
        }
      },
      {
        api: "Bước 1: Bất ngờ SWC yêu cầu mạng khẩn cấp: CanNm_NetworkRequest()",
        io: "Input: SWC -> ComM -> CanNm_NetworkRequest() tại Prepare Bus-Sleep",
        desc: "SWC bất ngờ có sự kiện khẩn cấp! Nhờ bật CanNmImmediateRestartEnabled = TRUE, CanNM lập tức hủy WaitBusSleepTimer, quay lại Repeat Message State, bật AWB=1 và BẮN NGAY 1 GÓI NM TẠI t=0ms để cứu mạng CAN!",
        action: () => {
          apiNetworkRequest();
        }
      }
    ],
    whatIf: [
      { label: "Tắt Immediate Restart (CanNmImmediateRestartEnabled = FALSE)", action: () => { ecucConfig.CanNmImmediateRestartEnabled = false; onConfigChange("CanNmImmediateRestartEnabled"); } },
      { label: "Bắn gói Rx từ Node #2 khi đang ở Prepare Bus-Sleep", action: () => apiSimulatedRxIndication() },
      { label: "Gọi CanNm_PassiveStartUp() tại Prepare Bus-Sleep", action: () => apiPassiveStartUp() }
    ]
  },

  5: {
    title: "S5: Điểm Danh Toàn Mạng (Repeat Message Request RMR = 1)",
    steps: [
      {
        api: "Bước 0: Chuẩn bị kịch bản & Thiết lập điều kiện ban đầu (Precondition)",
        io: "Trạng thái sẵn sàng: NM_STATE_READY_SLEEP | Tx = OFF | TimeoutTimer = 2000ms | CBV RMR = 0",
        desc: "ECU đang ở Ready Sleep State và không phát bản tin NM. Máy chẩn đoán Tester hoặc Gateway chuẩn bị kết nối vào bus. Bấm 'Tiếp Theo ▶' để phát lệnh điểm danh.",
        action: () => {
          resetSimulation();
          apiNetworkRequest();
          stepClockTick(1600);
          apiNetworkRelease();
          addTraceLog("INIT", "Precondition", "S5 Sẵn Sàng: ECU đang ở Ready Sleep State (im lặng)", "Sẵn sàng nhận yêu cầu điểm danh toàn mạng CanNm_RepeatMessageRequest() từ máy chẩn đoán Tester.");
        }
      },
      {
        api: "Bước 1: Gọi CanNm_RepeatMessageRequest() -> Bật Bit 0 (RMR = 1)",
        io: "Input: Diag SWC -> CanNm_RepeatMessageRequest()",
        desc: "CanNM chuyển ngay về Repeat Message State, bật Bit 0 (RMR = 1) trong byte CBV và phát ngay bản tin ra bus để ép tất cả các ECU khác cùng điểm danh.",
        action: () => {
          apiRepeatMessageRequest();
        }
      },
      {
        api: "Bước 2: Hết RepeatMessageTime (1500ms) -> Tự động xóa Bit RMR về 0",
        io: "Input: CanNm_MainFunction() -> CanNm -> Ready Sleep (RMR = 0)",
        desc: "Theo SWS_CanNm_00107, ngay khi hết CanNmRepeatMessageTime, CanNM tự động hạ Bit 0 (RMR: 1 -> 0) để tránh mạng bị lặp điểm danh vô tận.",
        action: () => {
          stepClockTick(1500);
        }
      }
    ],
    whatIf: [
      { label: "Tắt tính năng điểm danh (CanNmNodeDetectionEnabled = FALSE)", action: () => { ecucConfig.CanNmNodeDetectionEnabled = false; onConfigChange("CanNmNodeDetectionEnabled"); } },
      { label: "Bắn gói Rx có RMR=1 từ Remote Node #2", action: () => { document.getElementById("simRxRmr").checked = true; apiSimulatedRxIndication(); } },
      { label: "Bật callback Nm_RepeatMessageIndication()", action: () => { ecucConfig.CanNmRepeatMsgIndEnabled = true; onConfigChange("CanNmRepeatMsgIndEnabled"); } }
    ]
  },

  6: {
    title: "S6: Giảm Tải Đường Truyền CAN (CanNmBusLoadReductionEnabled)",
    steps: [
      {
        api: "Bước 0: Chuẩn bị kịch bản & Thiết lập điều kiện ban đầu (Precondition)",
        io: "Trạng thái sẵn sàng: NM_STATE_NORMAL_OPERATION | BusLoadReduction = TRUE | MsgCycle = 1000ms",
        desc: "ECU đang ở Normal Operation State với tính năng Bus Load Reduction được kích hoạt. Bấm 'Tiếp Theo ▶' để xem cách CanNM phản ứng khi Remote Node #2 phát bản tin.",
        action: () => {
          ecucConfig.CanNmBusLoadReductionEnabled = true;
          onConfigChange("CanNmBusLoadReductionEnabled");
          resetSimulation();
          apiNetworkRequest();
          stepClockTick(1600); // In Normal Operation
          addTraceLog("INIT", "Precondition", "S6 Sẵn Sàng: ECU ở Normal Operation, Bus Load Reduction = TRUE", "Sẵn sàng nhận bản tin NM từ Remote Node #2 để kiểm tra cơ chế hoãn phát bản tin.");
        }
      },
      {
        api: "Bước 1: Remote Node #2 phát bản tin NM -> CanNM hoãn lượt phát",
        io: "Input: CanNm_RxIndication() -> CanNm -> Nạp lại MsgCycleTimer = 1000ms",
        desc: "Khi nhận bản tin từ Node #2, CanNM nạp lại bộ đếm phát MsgCycleTimer về 1000ms (SWS_CanNm_00052) thay vì tự phát bản tin của mình, giảm 70% tải trên bus!",
        action: () => {
          apiSimulatedRxIndication();
        }
      }
    ],
    whatIf: [
      { label: "Tắt Bus Load Reduction (CanNmBusLoadReductionEnabled = FALSE)", action: () => { ecucConfig.CanNmBusLoadReductionEnabled = false; onConfigChange("CanNmBusLoadReductionEnabled"); } },
      { label: "Đổi CanNmMsgReducedTime = 300ms", action: () => { ecucConfig.CanNmMsgReducedTime = 300; onConfigChange("CanNmMsgReducedTime"); } },
      { label: "Chuyển về Repeat Message (Bus Load Reduction tạm ngưng)", action: () => apiRepeatMessageRequest() }
    ]
  },

  7: {
    title: "S7: Linh Hoạt Vị Trí SNI/CBV & Đọc Định Danh Node (GetNodeId)",
    steps: [
      {
        api: "Bước 0: Chuẩn bị kịch bản & Thiết lập điều kiện ban đầu (Precondition)",
        io: "Trạng thái sẵn sàng: PDU chuẩn (Byte 0: SNI, Byte 1: CBV) | NodeId = 0x1A",
        desc: "Khung PDU đang ở cấu hình mặc định: Byte 0 là Source Node ID (0x1A), Byte 1 là CBV. Bấm 'Tiếp Theo ▶' để thực hiện hoán đổi vị trí cấu hình.",
        action: () => {
          ecucConfig.CanNmPduNidPosition = "BYTE_0";
          ecucConfig.CanNmPduCbvPosition = "BYTE_1";
          ecucConfig.CanNmNodeId = 0x1A;
          onConfigChange("CanNmPduNidPosition");
          resetSimulation();
          addTraceLog("INIT", "Precondition", "S7 Sẵn Sàng: PDU chuẩn (Byte 0: SNI, Byte 1: CBV), NodeId = 0x1A", "Sẵn sàng kiểm tra hoán đổi vị trí trường và đọc định danh node.");
        }
      },
      {
        api: "Bước 1: Cấu hình đổi chỗ: CBV ở Byte 0, SNI ở Byte 1",
        io: "Input: CanNmPduCbvPosition = BYTE_0, CanNmPduNidPosition = BYTE_1",
        desc: "Tùy theo kiến trúc OEM, vị trí các trường trong khung 8-byte NM PDU có thể linh hoạt. Quan sát Thanh Khung 8-Byte tự động hoán đổi vị trí Byte 0 và Byte 1!",
        action: () => {
          ecucConfig.CanNmPduCbvPosition = "BYTE_0";
          ecucConfig.CanNmPduNidPosition = "BYTE_1";
          onConfigChange("CanNmPduCbvPosition");
        }
      },
      {
        api: "Bước 2: Đọc mã Node ID qua CanNm_GetNodeIdentifier()",
        io: "Input: CanNm_GetNodeIdentifier() -> Trả về NodeId = 0x1A",
        desc: "Ứng dụng gọi CanNm_GetLocalNodeIdentifier() lấy về 0x1A (Node 26). Khi nhận gói tin từ Remote Node #2, CanNm_GetNodeIdentifier() trả về 0x2B.",
        action: () => {
          addTraceLog("API", "SWC -> CanNm", "CanNm_GetLocalNodeIdentifier() -> 0x1A", "[SWS_CanNm_00133] Đọc mã Node ID cục bộ.");
          apiSimulatedRxIndication();
          addTraceLog("API", "SWC -> CanNm", "CanNm_GetNodeIdentifier() -> 0x2B", "[SWS_CanNm_00132] Đọc mã Node ID của bản tin vừa nhận.");
        }
      }
    ],
    whatIf: [
      { label: "Cấu hình NidPosition = OFF (dành 7 bytes cho User Data)", action: () => { ecucConfig.CanNmPduNidPosition = "OFF"; onConfigChange("CanNmPduNidPosition"); } },
      { label: "Khôi phục vị trí chuẩn (SNI Byte 0, CBV Byte 1)", action: () => { ecucConfig.CanNmPduNidPosition = "BYTE_0"; ecucConfig.CanNmPduCbvPosition = "BYTE_1"; onConfigChange("CanNmPduNidPosition"); } },
      { label: "Đổi Node ID thành 0x3F (Node 63)", action: () => { ecucConfig.CanNmNodeId = 0x3F; onConfigChange("CanNmNodeId"); } }
    ]
  },

  8: {
    title: "S8: Lọc Cụm Mạng Con Partial Networking (PN Filter Mask)",
    steps: [
      {
        api: "Bước 0: Chuẩn bị kịch bản & Thiết lập điều kiện ban đầu (Precondition)",
        io: "Trạng thái sẵn sàng: CanNmPnEnabled = TRUE | FilterMask = [0x05, 0x00] (PNC #16 & #18) | Network Mode",
        desc: "ECU được kích hoạt tính năng Partial Networking với mặt nạ [0x05, 0x00]. Chỉ chấp nhận PNC #16 và PNC #18. Bấm 'Tiếp Theo ▶' để thử nghiệm gửi gói tin PNI không khớp.",
        action: () => {
          ecucConfig.CanNmPnEnabled = true;
          ecucConfig.CanNmPnFilterMaskHex = "05 00";
          onConfigChange("CanNmPnEnabled");
          resetSimulation();
          apiNetworkRequest();
          addTraceLog("INIT", "Precondition", "S8 Sẵn Sàng: Bật Partial Networking với Mặt nạ Mask = [0x05, 0x00]", "ECU chỉ chấp nhận PNC #16 và PNC #18. Sẵn sàng nhận gói tin PNI để kiểm chứng bộ lọc.");
        }
      },
      {
        api: "Bước 1: Remote Node gửi gói NM yêu cầu PNC #17 (0x02) -> BỊ LỌC BỎ!",
        io: "Input: Rx PNI = [0x02, 0x00] & Mask = [0x05, 0x00] -> Không khớp!",
        desc: "Remote Node #2 gửi gói NM yêu cầu PNC #17. Phép AND logic: (0x02 & 0x05) == 0. CanNM BỎ QUA HOÀN TOÀN gói tin này (NM-Timeout Timer KHÔNG được nạp lại!).",
        action: () => {
          document.getElementById("simRxPni").checked = true;
          document.getElementById("simRxPniHex").value = "02 00";
          apiSimulatedRxIndication();
        }
      },
      {
        api: "Bước 2: Remote Node gửi gói NM yêu cầu PNC #16 (0x01) -> CHẤP NHẬN!",
        io: "Input: Rx PNI = [0x01, 0x00] & Mask = [0x05, 0x00] -> Khớp PNC #16!",
        desc: "Phép AND logic: (0x01 & 0x05) == 0x01 != 0. Khớp PNC #16! CanNM bật cờ PN_RELEVANT, nạp lại Timeout Timer = 2000ms và chạy PnResetTimer (1500ms).",
        action: () => {
          document.getElementById("simRxPni").checked = true;
          document.getElementById("simRxPniHex").value = "01 00";
          apiSimulatedRxIndication();
        }
      }
    ],
    whatIf: [
      { label: "Bật CanNmAllNmMessagesKeepAwake = TRUE", action: () => { ecucConfig.CanNmAllNmMessagesKeepAwake = true; onConfigChange("CanNmAllNmMessagesKeepAwake"); } },
      { label: "Đổi PnFilterMask thành 0x02 (chấp nhận PNC #17)", action: () => { ecucConfig.CanNmPnFilterMaskHex = "02 00"; onConfigChange("CanNmPnFilterMaskByte"); } },
      { label: "Tắt Partial Networking (CanNmPnEnabled = FALSE)", action: () => { ecucConfig.CanNmPnEnabled = false; onConfigChange("CanNmPnEnabled"); } }
    ]
  },

  9: {
    title: "S9: Quản Lý ERA / EIRA & Đồng Bộ Tắt PNC (Sync PNC Shutdown)",
    steps: [
      {
        api: "Bước 0: Chuẩn bị kịch bản & Thiết lập điều kiện ban đầu (Precondition)",
        io: "Trạng thái sẵn sàng: CanNmPnEnabled = TRUE | EIRA = 0x0000 | PnResetTimer = OFF | Network Mode",
        desc: "ECU đang ở Network Mode với Partial Networking sẵn sàng. Vector EIRA rỗng. Bấm 'Tiếp Theo ▶' để kích hoạt PNC #16 và quan sát bộ đếm CanNmPnResetTime.",
        action: () => {
          ecucConfig.CanNmPnEnabled = true;
          onConfigChange("CanNmPnEnabled");
          resetSimulation();
          apiNetworkRequest();
          addTraceLog("INIT", "Precondition", "S9 Sẵn Sàng: Bật Partial Networking, ECU ở Network Mode", "Sẵn sàng kích hoạt cụm PNC để theo dõi tính toán vector EIRA và PnResetTimer.");
        }
      },
      {
        api: "Bước 1: Kích hoạt PNC #16 -> Cập nhật mảng EIRA = 0x0001",
        io: "Input: CanNm -> PduR_CanNmRxIndication(PnEiraRxPduId, &EiraBytes)",
        desc: "Khi PNC #16 được yêu cầu, CanNM cập nhật vector EIRA và đẩy lên ComM qua PduR. Bộ đếm CanNmPnResetTime (1500ms) được kích hoạt.",
        action: () => {
          document.getElementById("simRxPni").checked = true;
          document.getElementById("simRxPniHex").value = "01 00";
          apiSimulatedRxIndication();
        }
      },
      {
        api: "Bước 2: Hết thời gian CanNmPnResetTime (1500ms) -> Xóa bit PNC trong EIRA",
        io: "Input: CanNm_MainFunction() -> PduR_CanNmRxIndication(EIRA = 0x0000)",
        desc: "Suốt 1500ms không có thêm gói tin nào yêu cầu PNC #16. PnResetTimer hết hạn, CanNM tự động xóa bit PNC #16 về 0 trong EIRA và báo ComM tắt cụm mạng con.",
        action: () => {
          stepClockTick(1500);
        }
      }
    ],
    whatIf: [
      { label: "Bật Synchronized PNC Shutdown", action: () => { ecucConfig.CanNmSynchronizedPncShutdownEnabled = true; onConfigChange("CanNmSynchronizedPncShutdownEnabled"); } },
      { label: "Yêu cầu đồng thời cả PNC #16 và PNC #18 (Mask 0x05)", action: () => { document.getElementById("simRxPniHex").value = "05 00"; apiSimulatedRxIndication(); } },
      { label: "Thay đổi PnResetTime = 3000ms", action: () => { ecucConfig.CanNmPnResetTime = 3000; onConfigChange("CanNmPnResetTime"); } }
    ]
  },

  10: {
    title: "S10: Đánh Thức Toàn Xe Qua Car Wakeup Bit (CSR = 1)",
    steps: [
      {
        api: "Bước 0: Chuẩn bị kịch bản & Thiết lập điều kiện ban đầu (Precondition)",
        io: "Trạng thái sẵn sàng: CanNmCarWakeUpFilterNodeId = 0x2B | ECU ở Bus-Sleep Mode",
        desc: "Bộ lọc Car Wakeup được cài đặt chỉ chấp nhận cờ CSR từ SmartKey ECU Node 0x2B. ECU đang ngủ ở Bus-Sleep Mode. Bấm 'Tiếp Theo ▶' để phát bản tin đánh thức toàn xe.",
        action: () => {
          ecucConfig.CanNmCarWakeUpRxEnabled = true;
          ecucConfig.CanNmCarWakeUpFilterEnabled = true;
          ecucConfig.CanNmCarWakeUpFilterNodeId = 0x2B;
          onConfigChange("CanNmCarWakeUpFilterEnabled");
          resetSimulation();
          addTraceLog("INIT", "Precondition", "S10 Chuẩn Bị: Car Wakeup Filter = Node 0x2B, ECU ở Bus-Sleep", "Sẵn sàng nhận bản tin Car Wakeup từ SmartKey ECU 0x2B.");
        }
      },
      {
        api: "Bước 1: Remote ECU 0x2B gửi gói NM có Bit 3 (CSR = 1) -> Kích hoạt Car Wakeup!",
        io: "Input: CanNm_RxIndication(CSR=1, NodeId=0x2B) -> Nm_CarWakeUpIndication()",
        desc: "Khớp đúng Node ID được cấp phép! CanNM gọi ngay Nm_CarWakeUpIndication() để ComM và BswM đánh thức toàn bộ hệ thống điện trên xe.",
        action: () => {
          document.getElementById("simRxCsr").checked = true;
          apiSimulatedRxIndication();
        }
      }
    ],
    whatIf: [
      { label: "Tắt bộ lọc Car Wakeup Filter (Chấp nhận CSR từ mọi Node)", action: () => { ecucConfig.CanNmCarWakeUpFilterEnabled = false; onConfigChange("CanNmCarWakeUpFilterEnabled"); } },
      { label: "Đổi Filter Node ID thành 0x99 (làm lệch NodeId để xem lệnh bị chặn)", action: () => { ecucConfig.CanNmCarWakeUpFilterNodeId = 0x99; onConfigChange("CanNmCarWakeUpFilterNodeId"); } },
      { label: "Tắt tính năng Car Wakeup (CanNmCarWakeUpRxEnabled = FALSE)", action: () => { ecucConfig.CanNmCarWakeUpRxEnabled = false; onConfigChange("CanNmCarWakeUpRxEnabled"); } }
    ]
  },

  11: {
    title: "S11: Kéo User Data Tự Động Qua COM (TriggerTransmit)",
    steps: [
      {
        api: "Bước 0: Chuẩn bị kịch bản & Thiết lập điều kiện ban đầu (Precondition)",
        io: "Trạng thái sẵn sàng: CanNmComUserDataSupport = TRUE | UserData = 'DE AD BE EF CA FE' | Bus-Sleep",
        desc: "Module COM đã nạp sẵn chuỗi dữ liệu 'DE AD BE EF CA FE' vào buffer PduR. CanNM đang ở Bus-Sleep Mode. Bấm 'Tiếp Theo ▶' để khởi động mạng và quan sát TriggerTransmit.",
        action: () => {
          ecucConfig.CanNmComUserDataSupport = true;
          ecucConfig.UserDataBytesHex = "DE AD BE EF CA FE";
          onConfigChange("CanNmComUserDataSupport");
          resetSimulation();
          addTraceLog("INIT", "Precondition", "S11 Chuẩn Bị: COM User Data Support = TRUE, Data = 'DE AD BE EF CA FE'", "Sẵn sàng thực hiện Active Wakeup và quan sát TriggerTransmit.");
        }
      },
      {
        api: "Bước 1: Kích hoạt Active Wakeup -> CanNM gọi PduR_CanNmTriggerTransmit()",
        io: "Input: SWC_App -> CanNm_NetworkRequest() -> PduR copy User Data",
        desc: "Thay vì ứng dụng phải gọi API thủ công CanNm_SetUserData(), CanNM tự động gọi PduR -> Com_TriggerTransmit() để lấy dữ liệu mới nhất đính kèm vào khung 8-byte NM PDU.",
        action: () => {
          apiNetworkRequest();
        }
      },
      {
        api: "Bước 2: Phát bản tin định kỳ mang dữ liệu mới từ COM",
        io: "Input: CanNm_MainFunction() -> CanIf_Transmit(Data=[1A 10 DE AD BE EF CA FE])",
        desc: "Quan sát Thanh Khung 8-Byte: Các byte từ Byte 2 đến Byte 7 mang trọn vẹn chuỗi dữ liệu 'DE AD BE EF CA FE' được kéo từ COM!",
        action: () => {
          stepClockTick(100);
        }
      }
    ],
    whatIf: [
      { label: "Đổi dữ liệu User Data thành 'AA BB CC DD EE FF'", action: () => { ecucConfig.UserDataBytesHex = "AA BB CC DD EE FF"; onConfigChange("UserDataBytesHex"); } },
      { label: "Tắt User Data (CanNmUserDataEnabled = FALSE)", action: () => { ecucConfig.CanNmUserDataEnabled = false; onConfigChange("CanNmUserDataEnabled"); } },
      { label: "Chuyển về gọi API thủ công CanNm_SetUserData()", action: () => { ecucConfig.CanNmComUserDataSupport = false; onConfigChange("CanNmComUserDataSupport"); } }
    ]
  },

  12: {
    title: "S12: Dịch Vụ Chẩn Đoán UDS 0x28 (Disable/Enable Comm)",
    steps: [
      {
        api: "Bước 0: Chuẩn bị kịch bản & Thiết lập điều kiện ban đầu (Precondition)",
        io: "Trạng thái sẵn sàng: NM_STATE_NORMAL_OPERATION | TX_EN = 1 (Truyền thông bình thường)",
        desc: "ECU đang ở Normal Operation State, định kỳ phát bản tin NM. Chuẩn bị tiếp nhận dịch vụ UDS 0x28 Communication Control từ kỹ thuật viên chẩn đoán. Bấm 'Tiếp Theo ▶' để khóa truyền thông.",
        action: () => {
          resetSimulation();
          apiNetworkRequest();
          stepClockTick(1600);
          addTraceLog("INIT", "Precondition", "S12 Chuẩn Bị: ECU đang ở Normal Operation State", "Sẵn sàng nhận lệnh UDS 0x28 CanNm_DisableCommunication() từ máy chẩn đoán Dcm.");
        }
      },
      {
        api: "Bước 1: Dcm gọi CanNm_DisableCommunication() (UDS 0x28)",
        io: "Input: UDS 0x28 -> Dcm -> BswM -> Nm -> CanNm_DisableCommunication()",
        desc: "Kỹ thuật viên nạp phần mềm Flash Bootloader. Dịch vụ UDS 0x28 khóa truyền thông: CanNM hạ Bit 1 (TX_EN: 1 -> 0), ngưng phát bản tin NM và tạm dừng NM-Timeout Timer.",
        action: () => {
          apiToggleCommunication();
        }
      },
      {
        api: "Bước 2: Tiến đồng hồ +1000ms -> Không có gói tin nào phát ra",
        io: "Input: SchM MainFunction +1000ms -> Tx bị chặn hoàn toàn",
        desc: "Trong suốt quá trình nạp phần mềm, bus CAN được giải phóng hoàn toàn khỏi các bản tin NM.",
        action: () => {
          stepClockTick(1000);
        }
      },
      {
        api: "Bước 3: Dcm gọi CanNm_EnableCommunication() khôi phục mạng",
        io: "Input: Dcm -> CanNm_EnableCommunication() -> Mở lại phát bản tin NM",
        desc: "Quá trình Flash hoàn tất. CanNM bật lại Bit 1 (TX_EN = 1), chạy lại NM-Timeout Timer và tiếp tục phát bản tin NM định kỳ.",
        action: () => {
          apiToggleCommunication();
        }
      }
    ],
    whatIf: [
      { label: "Thử gọi DisableCommunication khi đang ở Bus-Sleep", action: () => { resetSimulation(); apiToggleCommunication(); } },
      { label: "Bắn gói Rx từ Node #2 trong khi đang DisableComm", action: () => apiSimulatedRxIndication() },
      { label: "Tắt tính năng ComControl (CanNmComControlEnabled = FALSE)", action: () => { ecucConfig.CanNmComControlEnabled = false; onConfigChange("CanNmComControlEnabled"); } }
    ]
  },

  13: {
    title: "S13: Giám Sát Ngủ Từ Xa Cho Gateway (Remote Sleep Indication)",
    steps: [
      {
        api: "Bước 0: Chuẩn bị kịch bản & Thiết lập điều kiện ban đầu (Precondition)",
        io: "Trạng thái sẵn sàng: NM_STATE_NORMAL_OPERATION | RemoteSleepIndEnabled = TRUE | RemoteSleepTime = 1500ms",
        desc: "ECU Gateway đang ở Normal Operation State. Bộ đếm Remote Sleep Indication (1500ms) sẵn sàng theo dõi các node con. Bấm 'Tiếp Theo ▶' để bắt đầu giám sát bus yên ắng.",
        action: () => {
          ecucConfig.CanNmRemoteSleepIndEnabled = true;
          ecucConfig.CanNmRemoteSleepIndTime = 1500;
          onConfigChange("CanNmRemoteSleepIndEnabled");
          resetSimulation();
          apiNetworkRequest();
          stepClockTick(1600); // Normal Operation
          addTraceLog("INIT", "Precondition", "S13 Chuẩn Bị: Remote Sleep Indication = TRUE, ECU ở Normal Operation", "Sẵn sàng theo dõi bus yên ắng 1500ms để kích hoạt Nm_RemoteSleepIndication().");
        }
      },
      {
        api: "Bước 1: Không có gói Rx nào từ các node con suốt 1500ms",
        io: "Input: CanNm_MainFunction() -> Nm_RemoteSleepIndication()",
        desc: "Suốt 1500ms yên ắng từ các node con, CanNM phát hiện tất cả các node đều đã ở Ready Sleep và gọi Nm_RemoteSleepIndication() báo cho Gateway!",
        action: () => {
          stepClockTick(1500);
          addTraceLog("API", "CanNm -> Nm", "Nm_RemoteSleepIndication(nmChannelHandle=0)", "[SWS_CanNm_00150] Báo cho Gateway: Toàn bộ node con trên nhánh CAN này đã sẵn sàng ngủ!");
        }
      },
      {
        api: "Bước 2: Node con bất ngờ thức dậy -> Báo Nm_RemoteSleepCancellation()",
        io: "Input: CanNm_RxIndication() -> Nm_RemoteSleepCancellation()",
        desc: "Một node con bất ngờ thức lại phát bản tin NM. CanNM lập tức hủy trạng thái ngủ từ xa và gọi Nm_RemoteSleepCancellation()!",
        action: () => {
          apiSimulatedRxIndication();
          addTraceLog("API", "CanNm -> Nm", "Nm_RemoteSleepCancellation(nmChannelHandle=0)", "[SWS_CanNm_00151] Hủy trạng thái Remote Sleep vì có node con vừa thức dậy!");
        }
      }
    ],
    whatIf: [
      { label: "Gọi CanNm_CheckRemoteSleepIndication()", action: () => addTraceLog("API", "SWC -> CanNm", "CanNm_CheckRemoteSleepIndication() -> E_OK", "[SWS_CanNm_00152] Đọc trạng thái Remote Sleep.") },
      { label: "Đổi RemoteSleepIndTime = 2500ms", action: () => { ecucConfig.CanNmRemoteSleepIndTime = 2500; onConfigChange("CanNmRemoteSleepIndTime"); } },
      { label: "Tắt tính năng Remote Sleep", action: () => { ecucConfig.CanNmRemoteSleepIndEnabled = false; onConfigChange("CanNmRemoteSleepIndEnabled"); } }
    ]
  },

  14: {
    title: "S14: Xử Lý Lỗi TxTimeoutException & Phối Hợp CanSM Bus-Off",
    steps: [
      {
        api: "Bước 0: Chuẩn bị kịch bản & Thiết lập điều kiện ban đầu (Precondition)",
        io: "Trạng thái sẵn sàng: NM_STATE_REPEAT_MESSAGE | MsgTimeoutTime = 500ms | Chờ TxConfirmation",
        desc: "ECU vừa chuyển vào Network Mode và phát lệnh gửi bản tin NM. Bộ đếm CanNmMsgTimeoutTime (500ms) bắt đầu đếm. Bấm 'Tiếp Theo ▶' để kiểm tra tình huống mất TxConfirmation.",
        action: () => {
          resetSimulation();
          apiNetworkRequest();
          addTraceLog("INIT", "Precondition", "S14 Chuẩn Bị: ECU ở Network Mode (Repeat Message)", "Sẵn sàng kiểm tra tình huống timeout mất TxConfirmation từ phần cứng.");
        }
      },
      {
        api: "Bước 1: CanNM phát bản tin nhưng không nhận được TxConfirmation (Timeout)",
        io: "Input: CanNmMsgTimeoutTime (500ms) hết hạn -> Nm_TxTimeoutException()",
        desc: "Do đường truyền bị ngắt hoặc phần cứng CAN Controller bị kẹt, sau 500ms gọi CanIf_Transmit() mà không có TxConfirmation. CanNM gọi Nm_TxTimeoutException() và CanSM_TxTimeoutException().",
        action: () => {
          addTraceLog("WARN", "CanNm Engine", "CanNmMsgTimeoutTime (500ms) Hết Hạn!", "[SWS_CanNm_00066] Không nhận được CanIf_TxConfirmation().");
          addTraceLog("API", "CanNm -> Nm", "Nm_TxTimeoutException(nmChannelHandle=0)", "Báo lỗi timeout truyền bản tin NM.");
          addTraceLog("API", "CanNm -> CanSM", "CanSM_TxTimeoutException(nmChannelHandle=0)", "Yêu cầu CanSM kiểm tra và khởi động lại CAN Controller.");
        }
      },
      {
        api: "Bước 2: Nhận gói NM bất ngờ tại Bus-Sleep Mode -> Báo lỗi DET CANNM_E_NET_START_IND",
        io: "Input: CanNm_RxIndication() tại Bus-Sleep -> Det_ReportRuntimeError(0x04)",
        desc: "Khi ECU đang ở Bus-Sleep Mode mà nhận được gói NM trên bus, CanNM vừa chuyển vào Network Mode vừa ghi nhận lỗi Runtime CANNM_E_NET_START_IND lên bảng DET.",
        action: () => {
          resetSimulation();
          apiSimulatedRxIndication();
        }
      }
    ],
    whatIf: [
      { label: "Tắt CanNmInitialized = FALSE rồi gọi API (Test CANNM_E_UNINIT)", action: () => { ecucConfig.CanNmInitialized = false; onConfigChange("CanNmInitialized"); apiNetworkRequest(); } },
      { label: "Giả lập CanSM phục hồi và gọi CanNm_ConfirmPnAvailability()", action: () => addTraceLog("API", "CanSM -> CanNm", "CanNm_ConfirmPnAvailability(nmChannelHandle=0)", "CanSM phục hồi phần cứng thành công.") },
      { label: "Bật lại CanNmInitialized = TRUE", action: () => { ecucConfig.CanNmInitialized = true; onConfigChange("CanNmInitialized"); } }
    ]
  }
};
"""

    full_content = prefix + new_scenarios
    with open(p4_path, "w", encoding="utf-8") as f:
        f.write(full_content)
    print("SUCCESS: Updated part4_engine_and_scenarios.js with Step 0 for all 14 scenarios!")

if __name__ == "__main__":
    update_part4()
