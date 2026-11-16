/*************************************************************************
 * PART 3: CONSTANTS, METADATA, TOOLTIP DATA & ABBREVIATION GLOSSARY
 * Standard: AUTOSAR Classic R25-11 (SWS_CanNm, SWS_Nm, SWS_ComM)
 *************************************************************************/

// 1. ECUC CONFIGURATION TOOLTIP DATABASE
const configTooltipData = {
  CanNmInitialized: {
    name: "CanNmInitialized",
    path: "CanNm / CanNmGlobalConfig / CanNmInitialized",
    sws: "SWS_CanNm_00060",
    desc: "Cờ trạng thái khởi tạo của module CanNM. Nếu FALSE (CAN_NM_UNINIT), mọi hàm API ngoại trừ CanNm_Init() đều trả về E_NOT_OK và báo lỗi CANNM_E_UNINIT qua Det_ReportError.",
    range: "Boolean (TRUE / FALSE)",
    typical: "TRUE (Sau khi gọi CanNm_Init())",
    note: "Khởi tạo thành công đưa module vào NM_MODE_BUS_SLEEP, xóa sạch CBV=0x00 và dừng mọi bộ đếm thời gian."
  },
  CanNmDevErrorDetect: {
    name: "CanNmDevErrorDetect",
    path: "CanNm / CanNmGlobalConfig / CanNmDevErrorDetect",
    sws: "ECUC_CanNm_00002",
    desc: "Bật hoặc tắt cơ chế phát hiện và thông báo lỗi phát triển (Development Errors) qua module DET (Default Error Tracer).",
    range: "Boolean (TRUE / FALSE)",
    typical: "TRUE trong giai đoạn phát triển; FALSE khi xuất xưởng thương mại",
    note: "Khi bật, các tham số đầu vào con trỏ NULL, Channel Handle sai hoặc gọi API sai trạng thái sẽ được DET ghi nhận."
  },
  CanNmPassiveModeEnabled: {
    name: "CanNmPassiveModeEnabled",
    path: "CanNm / CanNmGlobalConfig / CanNmPassiveModeEnabled",
    sws: "ECUC_CanNm_00010 | SWS_CanNm_00130",
    desc: "Khi kích hoạt TRUE, node CanNM chuyển sang chế độ Chỉ Lắng Nghe (Passive Mode): không bao giờ gọi CanIf_Transmit() và từ chối lời gọi CanNm_NetworkRequest().",
    range: "Boolean (TRUE / FALSE)",
    typical: "FALSE trên ECU thông thường; TRUE trên ECU giám sát (Logger/Tester)",
    note: "Node thụ động vẫn nhận được bản tin NM và cập nhật trạng thái mạng bình thường."
  },
  CanNmActiveWakeupBitEnabled: {
    name: "CanNmActiveWakeupBitEnabled",
    path: "CanNm / CanNmChannelConfig / CanNmActiveWakeupBitEnabled",
    sws: "ECUC_CanNm_00084 | SWS_CanNm_00401",
    desc: "Bật Bit 4 (Active Wakeup Bit - AWB) trong byte Control Bit Vector (CBV) khi node thức dậy chủ động từ Bus-Sleep/Prepare Bus-Sleep do lời gọi CanNm_NetworkRequest().",
    range: "Boolean (TRUE / FALSE)",
    typical: "TRUE (Chuẩn AUTOSAR CP R25-11)",
    note: "Theo SWS_CanNm_00402, bit AWB giữ nguyên = 1 trong suốt thời gian ở Network Mode và chỉ xóa về 0 khi rời khỏi Network Mode sang Prepare Bus-Sleep Mode."
  },
  CanNmStateChangeIndEnabled: {
    name: "CanNmStateChangeIndEnabled",
    path: "CanNm / CanNmGlobalConfig / CanNmStateChangeIndEnabled",
    sws: "ECUC_CanNm_00012 | SWS_CanNm_00166",
    desc: "Cho phép CanNM thông báo mỗi khi có sự chuyển dịch trạng thái mạng (State/Mode Change) lên tầng trên qua hàm Callback Nm_StateChangeNotification().",
    range: "Boolean (TRUE / FALSE)",
    typical: "TRUE để ComM và BswM giám sát chính xác trạng thái mạng",
    note: "Callback truyền kèm 2 tham số: nmPreviousState và nmCurrentState."
  },
  CanNmComControlEnabled: {
    name: "CanNmComControlEnabled",
    path: "CanNm / CanNmGlobalConfig / CanNmComControlEnabled",
    sws: "ECUC_CanNm_00013 | SWS_CanNm_00170",
    desc: "Cho phép kích hoạt cặp API chẩn đoán CanNm_DisableCommunication() và CanNm_EnableCommunication() phục vụ dịch vụ UDS 0x28 CommunicationControl.",
    range: "Boolean (TRUE / FALSE)",
    typical: "TRUE (Bắt buộc nếu ECU hỗ trợ UDS 0x28 trước khi Flash Bootloader)",
    note: "Theo SWS_CanNm_00173/00174/00179: Disable phải dừng MsgCycleTimer và NM-TimeoutTimer; Enable phải khởi động lại NM-TimeoutTimer."
  },
  CanNmImmediateTxconfEnabled: {
    name: "CanNmImmediateTxconfEnabled",
    path: "CanNm / CanNmGlobalConfig / CanNmImmediateTxconfEnabled",
    sws: "ECUC_CanNm_00041 | SWS_CanNm_00071",
    desc: "Xác nhận truyền thành công ngay lập tức khi gọi LSduR/CanIf_Transmit(), bỏ qua giám sát lỗi truyền CanNmMsgTimeoutTime (SWS_CanNm_00073).",
    range: "Boolean (TRUE / FALSE)",
    typical: "FALSE khi cần giám sát lỗi Tx Timeout (CanNmMsgTimeoutTime) cho Partial Networking",
    note: "Không được bật đồng thời với CanNmPassiveModeEnabled (ECUC_CanNm_00041)."
  },
  CanNmCoordinatorSyncSupport: {
    name: "CanNmCoordinatorSyncSupport",
    path: "CanNm / CanNmGlobalConfig / CanNmCoordinatorSyncSupport",
    sws: "ECUC_CanNm_00080 | SWS_CanNm_00341",
    desc: "Bật hỗ trợ Bit 3 CBV (CSR - NM Coordinator Sleep Ready Bit) và hàm Nm_CoordReadyToSleepIndication() / CanNm_SetSleepReadyBit().",
    range: "Boolean (TRUE / FALSE)",
    typical: "FALSE trên node thường; TRUE trên nhánh phối hợp bởi NM Coordinator",
    note: "Phải đặt FALSE nếu CanNmPassiveModeEnabled == TRUE."
  },
  CanNmMainFunctionPeriod: {
    name: "CanNmMainFunctionPeriod",
    path: "CanNm / CanNmChannelConfig / CanNmMainFunctionPeriod",
    sws: "ECUC_CanNm_00032 | SWS_CanNm_00234",
    desc: "Chu kỳ gọi hàm CanNm_MainFunction() từ Os Task của SchM, tính bằng mili-giây (ms).",
    range: "10 .. 200 ms",
    typical: "100 ms (hoặc 10ms trên các mạng đòi hỏi đáp ứng cực nhanh)",
    note: "Mỗi nhịp tick MainFunction sẽ trừ đều tất cả các bộ đếm thời gian đang hoạt động."
  },
  CanNmMsgCycleTime: {
    name: "CanNmMsgCycleTime",
    path: "CanNm / CanNmChannelConfig / CanNmMsgCycleTime",
    sws: "ECUC_CanNm_00028 | SWS_CanNm_00040",
    desc: "Chu kỳ phát bản tin NM PDU định kỳ khi node ở trạng thái Repeat Message State và Normal Operation State.",
    range: "100 .. 5000 ms",
    typical: "1000 ms (1 giây một gói NM PDU)",
    note: "Quy tắc Timing AUTOSAR bắt buộc: CanNmMsgCycleTime phải nhỏ hơn CanNmTimeoutTime (ECUC_CanNm_00020)."
  },
  CanNmMsgCycleOffset: {
    name: "CanNmMsgCycleOffset",
    path: "CanNm / CanNmChannelConfig / CanNmMsgCycleOffset",
    sws: "ECUC_CanNm_00029 | PRS_Nm_00334",
    desc: "Độ lệch pha phát bản tin đầu tiên sau khi vào Repeat Message State (nếu không bắn Immediate Burst / Immediate Restart) để tránh va chạm khung CAN.",
    range: "0 .. 500 ms (< CanNmMsgCycleTime)",
    typical: "100 ms (hoặc gán lệch pha theo Node ID của ECU)",
    note: "Nếu CanNmMsgCycleOffset = 0 ms, gói tin sẽ được phát ngay tại chu kỳ đầu tiên."
  },
  CanNmRepeatMessageTime: {
    name: "CanNmRepeatMessageTime",
    path: "CanNm / CanNmChannelConfig / CanNmRepeatMessageTime",
    sws: "ECUC_CanNm_00022 | SWS_CanNm_00102",
    desc: "Thời gian bắt buộc node phải lưu lại ở trạng thái Repeat Message State trước khi được phép rẽ nhánh sang Normal Operation hoặc Ready Sleep.",
    range: "0 .. 65535 ms (0 = thoát ngay lập tức)",
    typical: "1500 ms (đủ cho 1 - 2 chu kỳ phát NM PDU)",
    note: "Trong thời gian này, mọi ECU đều phát bản tin NM để đảm bảo toàn bộ các node trên bus đều nhận biết được sự hiện diện của nhau."
  },
  CanNmTimeoutTime: {
    name: "CanNmTimeoutTime (NM-Timeout Timer)",
    path: "CanNm / CanNmChannelConfig / CanNmTimeoutTime",
    sws: "ECUC_CanNm_00020 | SWS_CanNm_00096 | SWS_CanNm_00109",
    desc: "Bộ định thời sinh tử của mạng CAN. Khi có gói NM phát (TxConfirmation) hoặc nhận (RxIndication nếu Tx enabled), timer này được nạp lại đầy.",
    range: "200 .. 5000 ms",
    typical: "2000 ms (Lớn hơn CanNmMsgCycleTime)",
    note: "Ở Ready Sleep, hết Timeout -> Prepare Bus-Sleep (SWS_CanNm_00109). Ở Repeat Message / Normal Operation, hết Timeout -> restart timer & báo CANNM_E_NETWORK_TIMEOUT (SWS_CanNm_00101/00117/00193/00194)."
  },
  CanNmWaitBusSleepTime: {
    name: "CanNmWaitBusSleepTime",
    path: "CanNm / CanNmChannelConfig / CanNmWaitBusSleepTime",
    sws: "ECUC_CanNm_00021 | SWS_CanNm_00248 | SWS_CanNm_00088",
    desc: "Thời gian đếm ngược tại pha đệm Prepare Bus-Sleep Mode trước khi chuyển hẳn sang Bus-Sleep Mode và ngắt nguồn phần cứng CAN.",
    range: "100 .. 5000 ms",
    typical: "1500 ms",
    note: "Tất cả các ECU trên cùng một bus CAN bắt buộc phải cấu hình cùng một giá trị CanNmWaitBusSleepTime để tắt nguồn đồng loạt."
  },
  CanNmMsgTimeoutTime: {
    name: "CanNmMsgTimeoutTime",
    path: "CanNm / CanNmChannelConfig / CanNmMsgTimeoutTime",
    sws: "ECUC_CanNm_00030 | SWS_CanNm_00064 | SWS_CanNm_00066",
    desc: "Thời gian giám sát việc gửi bản tin NM. Sau khi gọi CanIf_Transmit() (khi GlobalPnSupport / giám sát Tx bật và ImmediateTxconf=FALSE), quá thời gian này chưa có TxConfirmation sẽ báo timeout.",
    range: "50 .. 1000 ms (< CanNmMsgCycleTime)",
    typical: "500 ms",
    note: "Khi hết hạn, CanNM gọi Nm_TxTimeoutException() (SWS_CanNm_00066) và CanSM_TxTimeoutException() (SWS_CanNm_00446)."
  },
  CanNmNodeId: {
    name: "CanNmNodeId",
    path: "CanNm / CanNmChannelConfig / CanNmNodeId",
    sws: "ECUC_CanNm_00031 | SWS_CanNm_00013",
    desc: "Mã định danh logic 8-bit duy nhất của ECU trên kênh CAN, được đóng gói vào byte Source Node Identifier (SNI) của bản tin NM PDU.",
    range: "0x00 .. 0xFE (0 .. 254)",
    typical: "0x1A (Node #26 trong mô phỏng)",
    note: "Chỉ hiệu lực khi CanNmNodeIdEnabled == TRUE. CAN ID = CanNmBaseCanId + CanNmNodeId."
  },
  CanNmBaseCanId: {
    name: "CanNmBaseCanId",
    path: "CanNm / CanNmChannelConfig / CanNmBaseCanId",
    sws: "SWS_CanNm_00013",
    desc: "Mã CAN ID cơ sở của dải bản tin Network Management trên kênh CAN.",
    range: "0x000 .. 0x7FF (Standard 11-bit) hoặc 29-bit Extended",
    typical: "0x500 (Dải NM chuẩn 0x500 .. 0x5FF)",
    note: "Giúp bộ lọc phần cứng CAN Mailbox gom toàn bộ các khung NM vào một bộ đệm tiếp nhận riêng biệt."
  },
  CanNmPduNidPosition: {
    name: "CanNmPduNidPosition",
    path: "CanNm / CanNmChannelConfig / CanNmPduNidPosition",
    sws: "ECUC_CanNm_00025 | SWS_CanNm_00074",
    desc: "Vị trí byte trong khung 8-byte NM PDU dành cho Source Node Identifier (SNI).",
    range: "CANNM_PDU_BYTE_0 | CANNM_PDU_BYTE_1 | CANNM_PDU_OFF",
    typical: "CANNM_PDU_BYTE_0 (Chuẩn phổ biến nhất)",
    note: "Nếu chọn CANNM_PDU_OFF, Node ID không được gửi trong payload (tiết kiệm thêm 1 byte cho User Data) vì đã có trong CAN ID."
  },
  CanNmPduCbvPosition: {
    name: "CanNmPduCbvPosition",
    path: "CanNm / CanNmChannelConfig / CanNmPduCbvPosition",
    sws: "ECUC_CanNm_00026 | SWS_CanNm_00075",
    desc: "Vị trí byte trong khung 8-byte NM PDU dành cho Control Bit Vector (CBV).",
    range: "CANNM_PDU_BYTE_0 | CANNM_PDU_BYTE_1 | CANNM_PDU_OFF",
    typical: "CANNM_PDU_BYTE_1 (Chuẩn phổ biến nhất)",
    note: "CANNM_PDU_OFF chỉ dùng trong các hệ thống cực kỳ giản lược không dùng bất kỳ cờ điều khiển mạng nào."
  },
  CanNmNodeIdEnabled: {
    name: "CanNmNodeIdEnabled",
    path: "CanNm / CanNmChannelConfig / CanNmNodeIdEnabled",
    sws: "ECUC_CanNm_00090 | SWS_CanNm_00132",
    desc: "Kích hoạt tính năng Node ID và các API đọc mã Node ID (CanNm_GetNodeIdentifier / CanNm_GetLocalNodeIdentifier).",
    range: "Boolean (TRUE / FALSE)",
    typical: "TRUE",
    note: "Nếu TRUE thì CanNmPduNidPosition không được đặt CANNM_PDU_OFF (ECUC_CanNm_00025)."
  },
  CanNmNodeDetectionEnabled: {
    name: "CanNmNodeDetectionEnabled",
    path: "CanNm / CanNmChannelConfig / CanNmNodeDetectionEnabled",
    sws: "ECUC_CanNm_00088 | SWS_CanNm_00119 | SWS_CanNm_00137",
    desc: "Bật tính năng điểm danh toàn mạng. Cho phép gọi CanNm_RepeatMessageRequest() (trong Normal Operation / Ready Sleep) và xử lý Bit 0 RMR = 1.",
    range: "Boolean (TRUE / FALSE)",
    typical: "TRUE (Phải đặt FALSE nếu CanNmPassiveModeEnabled = TRUE)",
    note: "Theo SWS_CanNm_00137, không được gọi RepeatMessageRequest khi đang ở Repeat Message State, Prepare Bus-Sleep hoặc Bus-Sleep."
  },
  CanNmRepeatMsgIndEnabled: {
    name: "CanNmRepeatMsgIndEnabled",
    path: "CanNm / CanNmChannelConfig / CanNmRepeatMsgIndEnabled",
    sws: "ECUC_CanNm_00089 | SWS_CanNm_00014",
    desc: "Bật việc gọi hàm Callback Nm_RepeatMessageIndication() lên tầng Nm mỗi khi nhận được gói tin NM có Bit 0 (RMR = 1).",
    range: "Boolean (TRUE / FALSE)",
    typical: "TRUE khi cần báo cho ứng dụng biết có lệnh điểm danh từ xa",
    note: "Giúp ứng dụng chủ động khởi động các tiến trình chẩn đoán mạng."
  },
  CanNmImmediateNmTransmissions: {
    name: "CanNmImmediateNmTransmissions",
    path: "CanNm / CanNmChannelConfig / CanNmImmediateNmTransmissions",
    sws: "ECUC_CanNm_00056 | PRS_Nm_00005 | SWS_CanNm_00335",
    desc: "Số lượng bản tin NM PDU bắn chùm tốc độ cao (Immediate Burst Tx) ngay khi thức dậy chủ động qua CanNm_NetworkRequest().",
    range: "0 .. 255 gói tin",
    typical: "3 gói tin (Phải = 0 nếu CanNmImmediateRestartEnabled = TRUE theo ECUC_CanNm_00056)",
    note: "Sau khi truyền đủ số gói Immediate, CanNm tiếp tục truyền theo chu kỳ chuẩn CanNmMsgCycleTime (SWS_CanNm_00335)."
  },
  CanNmImmediateNmCycleTime: {
    name: "CanNmImmediateNmCycleTime",
    path: "CanNm / CanNmChannelConfig / CanNmImmediateNmCycleTime",
    sws: "ECUC_CanNm_00057 | SWS_CanNm_00335",
    desc: "Chu kỳ cực ngắn giữa các bản tin trong chùm bắn tốc độ cao Immediate Burst Tx.",
    range: "10 .. 200 ms (chỉ dùng khi CanNmImmediateNmTransmissions > 1)",
    typical: "100 ms",
    note: "Sau khi bắn đủ số gói CanNmImmediateNmTransmissions, CanNM tự động quay lại chu kỳ phát chuẩn CanNmMsgCycleTime."
  },
  CanNmImmediateRestartEnabled: {
    name: "CanNmImmediateRestartEnabled",
    path: "CanNm / CanNmChannelConfig / CanNmImmediateRestartEnabled",
    sws: "ECUC_CanNm_00009 | SWS_CanNm_00122",
    desc: "Nếu có Network Request khi đang ở Prepare Bus-Sleep Mode: nếu TRUE, CanNM bắn ngay 1 gói NM PDU tại t=0ms; nếu FALSE, chờ CanNmMsgCycleOffset.",
    range: "Boolean (TRUE / FALSE)",
    typical: "FALSE (khi dùng Immediate Burst Tx) hoặc TRUE (ECUC_CanNm_00056)",
    note: "Theo ECUC_CanNm_00056, nếu bật ImmediateRestartEnabled = TRUE thì CanNmImmediateNmTransmissions phải bằng 0."
  },
  CanNmBusLoadReductionEnabled: {
    name: "CanNmBusLoadReductionEnabled",
    path: "CanNm / CanNmGlobalConfig / CanNmBusLoadReductionEnabled",
    sws: "ECUC_CanNm_00040 | SWS_CanNm_00052 | SWS_CanNm_00157",
    desc: "Kích hoạt thuật toán giảm tải đường truyền CAN trong Normal Operation State (chỉ khi PassiveMode=FALSE và GlobalPnSupport=FALSE).",
    range: "Boolean (TRUE / FALSE)",
    typical: "FALSE trên mạng nhỏ hoặc PN; TRUE trên mạng thông thường nhiều ECU",
    note: "Theo SWS_CanNm_00156/00157, tắt khi vào Repeat Message State và kích hoạt khi vào Normal Operation State."
  },
  CanNmMsgReducedTime: {
    name: "CanNmMsgReducedTime",
    path: "CanNm / CanNmChannelConfig / CanNmMsgReducedTime",
    sws: "ECUC_CanNm_00043 | SWS_CanNm_00069",
    desc: "Thời gian nạp lại cho CanNm Message Cycle Timer khi nhận NM PDU từ node khác trong Normal Operation State lúc bật Bus Load Reduction.",
    range: "0.5 * CanNmMsgCycleTime <= CanNmMsgReducedTime < CanNmMsgCycleTime",
    typical: "500 ms (khi MsgCycleTime = 1000 ms)",
    note: "Theo SWS_CanNm_00069: nạp lại timer bằng đúng CanNmMsgReducedTime (khi PDU transmission ability đang bật)."
  },
  CanNmPnEnabled: {
    name: "CanNmPnEnabled",
    path: "CanNm / CanNmChannelConfig / CanNmPnEnabled",
    sws: "ECUC_CanNm_00066 | SWS_CanNm_00409 | SWS_CanNm_00413",
    desc: "Kích hoạt tính năng Partial Networking (PN): Bật Bit 6 (PNI = 1) trong CBV (SWS_CanNm_00413) và bật bộ lọc PN khi nhận gói tin.",
    range: "Boolean (TRUE / FALSE)",
    typical: "TRUE trên hệ thống hỗ trợ Selective Wakeup (ISO 11898-6)",
    note: "Trong R25-11, CanNm trích xuất PNC bit vector và gọi Nm_PncBitVectorRxIndication / TxIndication sang module Nm (SWS_CanNm_00502/00518)."
  },
  CanNmAllNmMessagesKeepAwake: {
    name: "CanNmAllNmMessagesKeepAwake",
    path: "CanNm / CanNmChannelConfig / CanNmAllNmMessagesKeepAwake",
    sws: "ECUC_CanNm_00068 | SWS_CanNm_00410 | SWS_CanNm_00503",
    desc: "Khi bật PN: nếu FALSE, bỏ qua NM PDU có PNI=0 (SWS_CanNm_00411) hoặc không khớp PNC liên quan; nếu TRUE, mọi NM PDU đều được xử lý giữ thức khi đang Network Mode.",
    range: "Boolean (TRUE / FALSE)",
    typical: "FALSE",
    note: "Khi ECU đang ở Bus-Sleep Mode, gói tin chỉ đánh thức ECU nếu khớp bộ lọc PNC."
  },
  CanNmPnInfoOffset: {
    name: "CanNmPnInfoOffset",
    path: "CanNm / CanNmChannelConfig / CanNmPnInfoOffset",
    sws: "SWS_CanNm_00501 | SWS_CanNm_00502 (NmPncBitVectorOffset trong Nm R25-11)",
    desc: "Vị trí byte bắt đầu trong khung 8-byte NM PDU chứa mảng bit PNC Bit Vector.",
    range: "0 .. 7 (>= số System Bytes nếu NID/CBV bật)",
    typical: "2 (Byte 2)",
    note: "Theo SWS_CanNm_00501, User Data chỉ được nằm ĐỘC QUYỀN trước hoặc sau vùng PNC Bit Vector (không được tách 2 đầu)."
  },
  CanNmPnInfoLength: {
    name: "CanNmPnInfoLength",
    path: "CanNm / CanNmChannelConfig / CanNmPnInfoLength",
    sws: "SWS_CanNm_00502 (NmPncBitVectorLength trong Nm R25-11)",
    desc: "Số lượng byte trong khung NM PDU dành riêng cho PNC Bit Vector.",
    range: "1 .. 6 Bytes",
    typical: "2 Bytes (16 cụm PNC)",
    note: "Vùng PnInfo (Offset + Length) phải <= chiều dài NM PDU (8 bytes)."
  },
  CanNmPnFilterMaskByte: {
    name: "CanNmPnFilterMaskByte (Rx Filter Mask)",
    path: "CanNm / CanNmChannelConfig / CanNmPnFilterMaskByte",
    sws: "SWS_CanNm_00503 | SWS_CanNm_00411",
    desc: "Mặt nạ bit LỌC ĐẦU THU (Rx) cấu hình các cụm PNC mà ECU này lắng nghe. KHÔNG tự động dùng làm payload phát Tx.",
    range: "Mảng Hex byte (Ví dụ: 05 00 = PNC #16 và #18)",
    typical: "05 00",
    note: "Khi nhận gói NM có PNI=1, nếu (RxPncMask & FilterMask) != 0 -> RelevantPncRequestDetectedPtr = TRUE."
  },
  CanNmTxPnRequestHex: {
    name: "Tx PNC Req IRA (Internal Request Array)",
    path: "Nm / ComM -> CanNm_Tx (SWS_CanNm_00518)",
    sws: "SWS_CanNm_00500 | SWS_CanNm_00518",
    desc: "Mảng bit PNC nội bộ (IRA) được ComM/Nm truyền xuống qua Nm_PncBitVectorTxIndication() để nhúng vào khung NM PDU khi phát Tx.",
    range: "Mảng Hex byte (khởi tạo 0x00 khi chưa có request)",
    typical: "01 00 (yêu cầu PNC #16)",
    note: "Phân biệt hoàn toàn với Rx FilterMask (ECU chỉ truyền những PNC mình đang yêu cầu nội bộ)."
  },
  CanNmPnEiraCalcEnabled: {
    name: "CanNmPnEiraCalcEnabled",
    path: "Nm / CanNmGlobalConfig / CanNmPnEiraCalcEnabled",
    sws: "ECUC_CanNm_00070 (Legacy) / Nm_PncBitVectorRxIndication (R25-11 SWS_CanNm_00502)",
    desc: "Bật tính toán External and Internal Request Array (EIRA) hợp nhất trạng thái PNC từ cả Tx nội bộ (IRA) và Rx trên bus.",
    range: "Boolean (TRUE / FALSE)",
    typical: "TRUE (khi dùng PNC Gateway / EIRA tracking)",
    note: "Trong R25-11 EIRA được chuyển lên module Nm tính toán thống nhất qua Nm_PncBitVectorRxIndication / TxIndication."
  },
  CanNmPnEraCalcEnabled: {
    name: "CanNmPnEraCalcEnabled",
    path: "Nm / CanNmChannelConfig / CanNmPnEraCalcEnabled",
    sws: "ECUC_CanNm_00067 (Legacy) / Nm_PncBitVectorRxIndication (R25-11 SWS_CanNm_00502)",
    desc: "Bật tính toán External Request Array (ERA) theo từng kênh mạng chỉ từ các bản tin Rx nhận được bên ngoài.",
    range: "Boolean (TRUE / FALSE)",
    typical: "FALSE (hoặc TRUE tại Gateway routing nhiều bus CAN)",
    note: "Trong R25-11 ERA được chuyển lên tầng Nm quản lý từ PNC bit vector Rx nhận qua CanNm."
  },
  CanNmPnResetTime: {
    name: "CanNmPnResetTime",
    path: "Nm / CanNmChannelConfig / CanNmPnResetTime",
    sws: "SWS_CanNm_00502 (NmPnResetTime trong R25-11)",
    desc: "Thời gian đếm lùi riêng cho từng bit PNC trước khi xóa bit đó trong EIRA / ERA nếu không có yêu cầu mới.",
    range: "200 .. 5000 ms",
    typical: "1500 ms",
    note: "Mỗi PNC đếm hạn độc lập; nhận gói PNC #18 không được phép ghi đè xóa PNC #16 đang đếm."
  },
  CanNmPnHandleMultipleNetworkRequests: {
    name: "CanNmPnHandleMultipleNetworkRequests",
    path: "CanNm / CanNmChannelConfig / CanNmPnHandleMultipleNetworkRequests",
    sws: "ECUC_CanNm_00073 | State Chart 7.18",
    desc: "Nếu TRUE, mỗi lần gọi lại CanNm_NetworkRequest() khi đã ở Network Mode sẽ chuyển/khởi động lại Repeat Message State và bắn Immediate Tx.",
    range: "Boolean (TRUE / FALSE)",
    typical: "FALSE (TRUE khi dùng PNC cần phát ngay thay đổi IRA qua NetworkRequest)",
    note: "ECUC_CanNm_00056: Nếu bật TRUE thì CanNmImmediateNmTransmissions phải > 0."
  },
  PnAvailabilityConfirmed: {
    name: "CanNm_ConfirmPnAvailability (CanSM)",
    path: "CanSM -> CanNm_ConfirmPnAvailability()",
    sws: "SWS_CanNm_00344 | SWS_CanNm_00503",
    desc: "Xác nhận phần cứng CAN Transceiver hỗ trợ PN đã sẵn sàng. Nếu chưa xác nhận (FALSE), mọi NM PDU hợp lệ đều được chấp nhận (SWS_CanNm_00503).",
    range: "Boolean (TRUE / FALSE)",
    typical: "TRUE (sau khi CanSM khởi động kênh)",
    note: "Nếu Transceiver PN gặp lỗi chưa confirm, SWS_CanNm_00503 buộc mở nhận toàn bộ gói NM để ngủ đồng bộ an toàn."
  },
  CanNmSynchronizedPncShutdownEnabled: {
    name: "CanNmSynchronizedPncShutdownEnabled",
    path: "CanNm / CanNmChannelConfig / CanNmSynchronizedPncShutdownEnabled",
    sws: "ECUC_CanNm_00097 | SWS_CanNm_00519 | SWS_CanNm_00504",
    desc: "Kích hoạt cơ chế đồng bộ tắt PNC bằng Bit 1 CBV (PNSR = PN Shutdown Request Bit) thông qua CanNm_ActivateTxPnShutdownMsg().",
    range: "Boolean (TRUE / FALSE)",
    typical: "FALSE (TRUE trên Gateway/Coordinator có ERA)",
    note: "Theo SWS_CanNm_00094, Network Mode chỉ gồm 3 trạng thái nội bộ (RMS, NOS, RSS), không có NM_STATE_SYNCHRONIZE."
  },
  CanNmUserDataEnabled: {
    name: "CanNmUserDataEnabled",
    path: "CanNm / CanNmChannelConfig / CanNmUserDataEnabled",
    sws: "ECUC_CanNm_00004 | SWS_CanNm_00159 | SWS_CanNm_00025",
    desc: "Cho phép truyền và nhận User Data trong khung NM PDU. Nếu FALSE, các byte dư không truyền dữ liệu người dùng và giữ giá trị khởi tạo 0xFF.",
    range: "Boolean (TRUE / FALSE)",
    typical: "TRUE",
    note: "SWS_CanNm_00025: Mọi byte User Data được khởi tạo bằng 0xFF khi CanNm_Init()."
  },
  CanNmComUserDataSupport: {
    name: "CanNmComUserDataSupport",
    path: "CanNm / CanNmGlobalConfig / CanNmComUserDataSupport",
    sws: "ECUC_CanNm_00044 | SWS_CanNm_00328",
    desc: "Tự động lấy User Data từ I-PDU của COM qua PduR_CanNmTriggerTransmit() mỗi khi chuẩn bị phát NM PDU.",
    range: "Boolean (TRUE / FALSE)",
    typical: "FALSE / TRUE (phải FALSE nếu PassiveMode hoặc hết byte cho User Data)",
    note: "Khi bật tính năng này, API CanNm_SetUserData() không được dùng."
  },
  UserDataBytesHex: {
    name: "UserData Bytes (Hex)",
    path: "CanNm / UserData Buffer",
    sws: "SWS_CanNm_00025 | SWS_CanNm_00501",
    desc: "Chuỗi byte User Data đóng gói vào vùng dành cho User Data (pad bằng 0xFF nếu thiếu theo SWS_CanNm_00025).",
    range: "Mảng Hex byte (Ví dụ: 11 22 33 44 55 66)",
    typical: "11 22 33 44 55 66",
    note: "Khi CanNmPnEnabled=TRUE, User Data chỉ được đặt ở 1 vùng liên tục trước hoặc sau PNC vector (SWS_CanNm_00501)."
  },
  CanNmCarWakeUpRxEnabled: {
    name: "CanNmCarWakeUpRxEnabled",
    path: "CanNm / CanNmChannelConfig / CanNmCarWakeUpRxEnabled",
    sws: "ECUC_CanNm_00074 | SWS_CanNm_00405 | SWS_CanNm_00406",
    desc: "Bật kiểm tra bit Car Wakeup (CWU) trong phần User Data tại vị trí CanNmCarWakeUpBytePosition/BitPosition và gọi Nm_CarWakeUpIndication().",
    range: "Boolean (TRUE / FALSE)",
    typical: "TRUE trên ECU Gateway/Master",
    note: "Car Wakeup bit (CWU) nằm ở vùng User Data do CanNmCarWakeUpBytePosition/BitPosition định nghĩa, KHÔNG phải Bit 3 CSR của CBV!"
  },
  CanNmCarWakeUpBytePosition: {
    name: "CanNmCarWakeUpBytePosition",
    path: "CanNm / CanNmChannelConfig / CanNmCarWakeUpBytePosition",
    sws: "ECUC_CanNm_00076 | SWS_CanNm_00405",
    desc: "Chỉ số Byte trong khung NM PDU (0..7, >= số lượng System Bytes NID/CBV) chứa bit Car Wakeup (CWU).",
    range: "0 .. 7 (>= số System Bytes)",
    typical: "2",
    note: "Không được trùng vào vùng byte hệ thống (SNI/CBV)."
  },
  CanNmCarWakeUpBitPosition: {
    name: "CanNmCarWakeUpBitPosition",
    path: "CanNm / CanNmChannelConfig / CanNmCarWakeUpBitPosition",
    sws: "ECUC_CanNm_00075 | SWS_CanNm_00405",
    desc: "Vị trí Bit (0..7) trong byte CanNmCarWakeUpBytePosition dùng cho Car Wakeup (CWU).",
    range: "0 .. 7",
    typical: "0",
    note: "Chỉ hiệu lực khi CanNmCarWakeUpRxEnabled == TRUE."
  },
  CanNmCarWakeUpFilterEnabled: {
    name: "CanNmCarWakeUpFilterEnabled",
    path: "CanNm / CanNmChannelConfig / CanNmCarWakeUpFilterEnabled",
    sws: "ECUC_CanNm_00077 | SWS_CanNm_00408",
    desc: "Chỉ chấp nhận Car Wakeup (CWU=1) nếu Source Node ID khớp với CanNmCarWakeUpFilterNodeId.",
    range: "Boolean (TRUE / FALSE)",
    typical: "TRUE",
    note: "Nếu sai Node ID, bỏ qua Nm_CarWakeUpIndication() nhưng vẫn xử lý RxIndication tiêu chuẩn."
  },
  CanNmCarWakeUpFilterNodeId: {
    name: "CanNmCarWakeUpFilterNodeId",
    path: "CanNm / CanNmChannelConfig / CanNmCarWakeUpFilterNodeId",
    sws: "ECUC_CanNm_00078 | SWS_CanNm_00408",
    desc: "Mã Source Node ID hợp lệ được quyền kích hoạt Car Wakeup.",
    range: "0x00 .. 0xFF",
    typical: "0x2B",
    note: "Chỉ có tác dụng khi CanNmCarWakeUpFilterEnabled == TRUE."
  },
  CanNmRemoteSleepIndEnabled: {
    name: "CanNmRemoteSleepIndEnabled",
    path: "CanNm / CanNmGlobalConfig / CanNmRemoteSleepIndEnabled",
    sws: "ECUC_CanNm_00055 | SWS_CanNm_00150 | SWS_CanNm_00151",
    desc: "Bật phát hiện trạng thái ngủ từ xa (Remote Sleep) khi ở Normal Operation State và không nhận NM PDU nào suốt CanNmRemoteSleepIndTime.",
    range: "Boolean (TRUE / FALSE)",
    typical: "TRUE trên ECU Gateway",
    note: "Phải FALSE nếu CanNmPassiveModeEnabled == TRUE (ECUC_CanNm_00055)."
  },
  CanNmRemoteSleepIndTime: {
    name: "CanNmRemoteSleepIndTime",
    path: "CanNm / CanNmChannelConfig / CanNmRemoteSleepIndTime",
    sws: "ECUC_CanNm_00023 | SWS_CanNm_00150 | SWS_CanNm_00249",
    desc: "Thời gian không nhận Rx PDU ở Normal Operation State trước khi gọi Nm_RemoteSleepIndication().",
    range: ">= CanNmMsgCycleTime (ECUC_CanNm_00023)",
    typical: "1500 ms",
    note: "Bị dừng khi DisableCommunication (SWS_CanNm_00175) và bị hủy nếu nhận Rx hoặc quay lại Repeat Message (SWS_CanNm_00151/00152)."
  }
};

// 2. 8-BIT CONTROL BIT VECTOR (CBV) BITS METADATA (Table 7.2 AUTOSAR CP R25-11)
const CANNM_CBV_BITS = [
  { bit: 0, mask: 0x01, name: "RMR", label: "Repeat Message Request", desc: "Bit 0 (Table 7.2): Yêu cầu toàn mạng điểm danh. Bật khi gọi CanNm_RepeatMessageRequest(). Xóa về 0 khi rời Repeat Message State (SWS_CanNm_00107)." },
  { bit: 1, mask: 0x02, name: "PNSR", label: "PN Shutdown Request Bit", desc: "Bit 1 (Table 7.2): Yêu cầu đồng bộ tắt PNC (Synchronized PNC Shutdown), bật qua CanNm_ActivateTxPnShutdownMsg() (SWS_CanNm_00521)." },
  { bit: 2, mask: 0x04, name: "RES2", label: "Reserved Bit 2", desc: "Bit 2 (Table 7.2): Bit dự phòng (Reserved) trong R25-11. Luôn truyền bằng 0." },
  { bit: 3, mask: 0x08, name: "CSR", label: "NM Coordinator Sleep Ready", desc: "Bit 3 (Table 7.2): NM Coordinator Sleep Ready Bit (SWS_CanNm_00341/00342), kích hoạt Nm_CoordReadyToSleepIndication(). KHÔNG phải Car Wakeup!" },
  { bit: 4, mask: 0x10, name: "AWB", label: "Active Wakeup Bit", desc: "Bit 4 (Table 7.2): Bật = 1 khi thức dậy chủ động do CanNm_NetworkRequest() (SWS_CanNm_00401); xóa = 0 khi rời Network Mode (SWS_CanNm_00402)." },
  { bit: 5, mask: 0x20, name: "PNL", label: "Partial Network Learning Bit", desc: "Bit 5 (Table 7.2): Partial Network Learning Bit (SWS_CanNm_00380/00381) dùng cho Dynamic PNC-to-channel Mapping." },
  { bit: 6, mask: 0x40, name: "PNI", label: "Partial Network Information Bit", desc: "Bit 6 (Table 7.2): Báo hiệu bản tin chứa thông tin Partial Network (SWS_CanNm_00413: =1 nếu CanNmPnEnabled=TRUE, SWS_CanNm_00414: =0 nếu FALSE)." },
  { bit: 7, mask: 0x80, name: "RES7", label: "Reserved Bit 7", desc: "Bit 7 (Table 7.2): Bit dự phòng (Reserved). Luôn truyền bằng 0." }
];

// 3. 8-BIT CANNM ENGINE STATUS BYTE METADATA
const CANNM_ENGINE_BITS = [
  { bit: 0, mask: 0x01, name: "INIT", label: "CanNm Initialized", desc: "Bit 0: Module CanNM đã được khởi tạo thành công qua CanNm_Init() (State != UNINIT)." },
  { bit: 1, mask: 0x02, name: "TX_EN", label: "Msg Tx Enabled", desc: "Bit 1: Cho phép phát bản tin NM PDU (Không ở Passive Mode và chưa bị khóa bởi DisableCommunication)." },
  { bit: 2, mask: 0x04, name: "PN_REL", label: "PN Filter Relevant", desc: "Bit 2: Gói tin NM vừa nhận có chứa PNC trùng với mặt nạ CanNmPnFilterMaskByte của ECU này." },
  { bit: 3, mask: 0x08, name: "WAIT_TMR", label: "WaitSleep Timer Running", desc: "Bit 3: Node đang ở Prepare Bus-Sleep Mode và bộ đếm WaitBusSleepTime đang đếm ngược." },
  { bit: 4, mask: 0x10, name: "TO_TMR", label: "NM-Timeout Timer Running", desc: "Bit 4: Node đang ở Network Mode và đồng hồ sinh tử NM-Timeout Timer đang chạy." },
  { bit: 5, mask: 0x20, name: "RPT_TMR", label: "RepeatMsg Timer Running", desc: "Bit 5: Node đang ở Repeat Message State và bộ đếm RepeatMessageTime đang đếm ngược." },
  { bit: 6, mask: 0x40, name: "BURST", label: "Immediate Burst Active", desc: "Bit 6: Node đang ở chế độ bắn chùm tốc độ cao Immediate Burst Tx (ImmediateNmTransmissions > 0)." },
  { bit: 7, mask: 0x80, name: "NET_REQ", label: "Network Requested", desc: "Bit 7: Ứng dụng cục bộ (SWC -> ComM) đang giữ mạng qua lời gọi CanNm_NetworkRequest()." }
];

// 4. MODULES INFO (10 MODULES IN AUTOSAR CANNM ECOSYSTEM)
const MODULES_INFO = {
  SWC_App: {
    name: "SWC_App / SWC_PncUser",
    layer: "Application Layer",
    sws: "AUTOSAR SWS Application / SWC",
    input: "Sự kiện khởi chạy từ RTE (TimingEvent, DataReceivedEvent, SwcModeSwitchEvent) hoặc tác động từ người dùng (bật khóa điện IG, mở cửa xe, sạc pin).",
    processing: "Không gọi trực tiếp CanNM. Khi cần truyền thông mạng CAN hoặc yêu cầu cụm PNC, SWC gọi cổng Client-Server RequestComMode() xuống ComM. Đợi ComM báo mạng sẵn sàng mới bắt đầu gửi tín hiệu dữ liệu.",
    output: "Gọi qua RTE xuống ComM: Rte_Call_UR_ComMUser_RequestComMode(COMM_FULL_COMMUNICATION / COMM_NO_COMMUNICATION).",
    apis: ["Rte_Call_UR_ComMUser_RequestComMode()", "Rte_Write_PP_NmUserData()"]
  },
  RTE: {
    name: "RTE & SchM",
    layer: "Runtime Environment Layer",
    sws: "AUTOSAR SWS RTE / SchM",
    input: "Lời gọi API từ SWC và thông báo chuyển Mode từ ComM / BswM. Xung nhịp định kỳ từ AUTOSAR OS.",
    processing: "Chuyển tiếp yêu cầu truyền thông từ SWC xuống ComM. SchM định kỳ gọi CanNm_MainFunction() mỗi chu kỳ CanNmMainFunctionPeriod (ví dụ 100ms) để giảm các bộ đếm thời gian. Bảo vệ vùng găng SchM_Enter_CanNm_EA_0().",
    output: "Gọi định kỳ vào CanNM: CanNm_MainFunction(). Bảo vệ vùng găng: SchM_Enter/Exit_CanNm_EA_0(). Báo ModeSwitchEvent lên SWC.",
    apis: ["CanNm_MainFunction()", "SchM_Enter_CanNm_EA_0()", "SchM_Exit_CanNm_EA_0()"]
  },
  ComM: {
    name: "ComM (Communication Manager)",
    layer: "System / Comm Services",
    sws: "AUTOSAR SWS ComM",
    input: "Yêu cầu mạng từ SWC Users (ComM_RequestComMode) và từ Dcm (chẩn đoán UDS). Nhận callback báo trạng thái mạng từ Nm (ComM_Nm_NetworkMode, ComM_Nm_BusSleepMode).",
    processing: "Tổng hợp (Arbitrate) nhu cầu mạng của các User trên kênh CAN. Điều phối việc bật phần cứng CAN qua CanSM và bật chu trình đồng bộ mạng qua Nm. Chỉ khi CanNM báo BusSleepMode mới cho phép CanSM tắt phần cứng.",
    output: "Gọi xuống Nm: Nm_NetworkRequest(), Nm_NetworkRelease(), Nm_PassiveStartUp(). Gọi sang CanSM: CanSM_RequestComMode(FULL_COM / NO_COM).",
    apis: ["ComM_RequestComMode()", "Nm_NetworkRequest()", "Nm_NetworkRelease()", "Nm_PassiveStartUp()"]
  },
  BswM: {
    name: "BswM (BSW Mode Manager)",
    layer: "System Services",
    sws: "AUTOSAR SWS BswM",
    input: "Thông báo trạng thái mạng từ CanSM và Nm. Yêu cầu đổi chế độ truyền thông từ Dcm (UDS 0x28).",
    processing: "Đánh giá các quy tắc Rule Arbitration. Khi mạng vào FULL_COMMUNICATION, BswM kích hoạt ActionList gọi Com_IpduGroupStart(). Khi nhận lệnh UDS 0x28, ra lệnh Nm_DisableCommunication().",
    output: "Gọi sang AUTOSAR COM: Com_IpduGroupStart() / Stop(). Gọi sang Nm: Nm_DisableCommunication() / Nm_EnableCommunication().",
    apis: ["BswM_Nm_StateChangeNotification()", "Com_IpduGroupStart()", "Nm_DisableCommunication()"]
  },
  Nm: {
    name: "Nm (Generic NM Interface)",
    layer: "Communication Services",
    sws: "AUTOSAR SWS Nm",
    input: "Lệnh từ ComM (Nm_NetworkRequest, Nm_NetworkRelease, Nm_PassiveStartUp). Callbacks từ CanNm (Nm_NetworkMode, Nm_PrepareBusSleepMode, Nm_BusSleepMode, Nm_StateChangeNotification).",
    processing: "Lớp giao tiếp trừu tượng độc lập đường truyền (nối với CanNm, FrNm, UdpNm). Chuyển tiếp các lệnh từ ComM xuống CanNm và chuyển tiếp các sự kiện từ CanNm lên ComM. Điều phối NM Coordinator nếu có nhiều nhánh mạng.",
    output: "Gọi xuống CanNM: CanNm_NetworkRequest(), CanNm_NetworkRelease(), CanNm_PassiveStartUp(), CanNm_RepeatMessageRequest(). Báo lên ComM: ComM_Nm_*().",
    apis: ["CanNm_NetworkRequest()", "CanNm_NetworkRelease()", "Nm_StateChangeNotification()", "Nm_NetworkMode()"]
  },
  CanNm: {
    name: "CanNM Core Engine",
    layer: "Communication Services",
    sws: "AUTOSAR CP SWS CanNm (R25-11)",
    input: "Lệnh điều khiển từ Nm. Xác nhận khả dụng PN từ CanSM (CanNm_ConfirmPnAvailability). Callbacks từ CanIf (CanNm_RxIndication, CanNm_TxConfirmation). Xung nhịp CanNm_MainFunction().",
    processing: "Điều phối máy trạng thái phân tán (3 Modes, 3 Sub-states). Quản lý các bộ đếm thời gian (RepeatMessage, NM-Timeout, WaitBusSleep, MsgCycle, MsgTimeout, RemoteSleep). Đóng gói khung 8-byte NM PDU, byte CBV (Table 7.2) và chuyển tiếp PNC bit vector sang module Nm.",
    output: "Gọi xuống LSduR/CanIf: CanIf_Transmit(). Gọi sang PduR: PduR_CanNmTriggerTransmit(). Báo lên Nm: Nm_NetworkMode(), Nm_BusSleepMode(), Nm_StateChangeNotification(), Nm_PncBitVectorRxIndication().",
    apis: ["CanIf_Transmit()", "PduR_CanNmTriggerTransmit()", "Nm_PncBitVectorRxIndication()", "Nm_StateChangeNotification()"]
  },
  CanSM: {
    name: "CanSM (CAN State Manager)",
    layer: "Communication Services",
    sws: "AUTOSAR SWS CanSM",
    input: "Lệnh CanSM_RequestComMode từ ComM. Thông báo CanSM_TxTimeoutException từ CanNm / Nm.",
    processing: "Quản lý máy trạng thái phần cứng CAN (Controller & Transceiver). Khởi động controller CAN_CS_STARTED và mở cổng CanIf_SetPduMode(CANIF_ONLINE). Gọi CanNm_ConfirmPnAvailability() khi vào FULLCOM trên kênh có PN. Khôi phục Bus-Off.",
    output: "Gọi sang CanNM: CanNm_ConfirmPnAvailability(nmChannelHandle). Gọi xuống CanIf: CanIf_SetControllerMode(), CanIf_SetPduMode().",
    apis: ["CanNm_ConfirmPnAvailability()", "CanIf_SetControllerMode()", "CanIf_SetPduMode()"]
  },
  PduR_COM: {
    name: "PduR & AUTOSAR COM",
    layer: "Communication Services",
    sws: "AUTOSAR SWS PduR / COM",
    input: "Dữ liệu User Data từ SWC qua COM. Lệnh PduR_CanNmTriggerTransmit và PduR_CanNmRxIndication từ CanNm.",
    processing: "Khi CanNmComUserDataSupport = TRUE, mỗi chu kỳ phát NM PDU, CanNM gọi PduR_CanNmTriggerTransmit() -> Com_TriggerTransmit() để kéo dữ liệu mới nhất từ COM đính kèm vào khung NM PDU. Nhận mảng EIRA/ERA từ CanNm đẩy lên ComM.",
    output: "Cung cấp User Data cho CanNM qua PduR_CanNmTriggerTransmit(). Nhận EIRA/ERA qua PduR_CanNmRxIndication() -> Com_RxIndication().",
    apis: ["PduR_CanNmTriggerTransmit()", "Com_TriggerTransmit()", "PduR_CanNmRxIndication()"]
  },
  CanIf: {
    name: "CanIf (CAN Interface)",
    layer: "ECU Abstraction Layer",
    sws: "AUTOSAR SWS CanIf",
    input: "Lệnh CanIf_Transmit() từ CanNm. Khung CAN nhận từ Can Driver (CanIf_RxIndication) và xác nhận phát (CanIf_TxConfirmation).",
    processing: "Kiểm tra chế độ PduMode của controller (CANIF_ONLINE). Lọc dải CAN ID dành riêng cho Network Management (0x500..0x5FF). Định tuyến bản tin NM lên CanNm.",
    output: "Gọi ngược Callback lên CanNM: CanNm_RxIndication(RxPduId, &PduInfo), CanNm_TxConfirmation(TxPduId, E_OK). Gọi xuống Can Driver: Can_Write().",
    apis: ["CanIf_Transmit()", "CanNm_RxIndication()", "CanNm_TxConfirmation()"]
  },
  Dem_Det: {
    name: "Dem & Det (Diagnostic & Error Tracer)",
    layer: "System / Diag Services",
    sws: "AUTOSAR SWS Dem / Det",
    input: "Báo cáo lỗi phát triển (SWS_CanNm_00316) và lỗi runtime (SWS_CanNm_00317) từ CanNM (ModuleId = 31 / 0x001F).",
    processing: "Det ghi nhận lỗi phát triển CANNM_E_UNINIT (0x01), CANNM_E_INVALID_CHANNEL (0x02), CANNM_E_INVALID_PDUID (0x03), CANNM_E_INIT_FAILED (0x05), CANNM_E_PARAM_POINTER (0x12), CANNM_E_NOT_IN_BUS_SLEEP (0x13) và lỗi runtime CANNM_E_NET_START_IND (0x04), CANNM_E_NETWORK_TIMEOUT (0x11), CANNM_E_INVALID_PN_SYNC_SHUTDOWN_REQUEST (0x20).",
    output: "Hiển thị cảnh báo trên bảng Trace log và Inspector.",
    apis: ["Det_ReportError()", "Det_ReportRuntimeError()"]
  }
};

// 5. ABBREVIATION GLOSSARY TABLE (48+ TERMS WITH CATEGORIES)
const ABBREVIATIONS_DATA = [
  { abbr: "CanNM / CanNm", term: "CAN Network Management", cat: "CORE", desc: "Module BSW thuộc tầng Communication Services điều phối việc đánh thức và đưa mạng CAN về ngủ đồng bộ nhằm tiết kiệm ắc-quy." },
  { abbr: "CBV", term: "Control Bit Vector", cat: "CBV", desc: "Byte điều khiển 8-bit trong NM PDU (Table 7.2 R25-11): Bit 0 (RMR), Bit 1 (PNSR), Bit 3 (CSR), Bit 4 (AWB), Bit 5 (PNL), Bit 6 (PNI)." },
  { abbr: "SNI / NID", term: "Source Node Identifier", cat: "CBV", desc: "Mã định danh 8-bit duy nhất của ECU phát bản tin NM (thường ở Byte 0, cấu hình qua CanNmNodeId)." },
  { abbr: "AWB", term: "Active Wakeup Bit", cat: "CBV", desc: "Bit 4 (0x10) của byte CBV. Bật = 1 khi node thức dậy chủ động do CanNm_NetworkRequest(); bằng 0 nếu thức dậy thụ động (Passive)." },
  { abbr: "RMR", term: "Repeat Message Request Bit", cat: "CBV", desc: "Bit 0 (0x01) của byte CBV. Khi bật = 1, yêu cầu tất cả các ECU trên mạng chuyển về Repeat Message State để điểm danh." },
  { abbr: "CSR", term: "NM Coordinator Sleep Ready Bit", cat: "CBV", desc: "Bit 3 (0x08) của byte CBV (Table 7.2). Dùng cho phối hợp ngủ đồng bộ giữa các NM Coordinator (SWS_CanNm_00341), KHÔNG phải Car Wakeup." },
  { abbr: "CWU", term: "Car Wakeup Bit (User Data)", cat: "CBV", desc: "Bit đánh thức toàn xe nằm trong User Data tại vị trí cấu hình CanNmCarWakeUpBytePosition và CanNmCarWakeUpBitPosition (SWS_CanNm_00405)." },
  { abbr: "PNSR / PNL", term: "PN Shutdown Request / PN Learning", cat: "PN", desc: "Bit 1 (0x02) của CBV báo đồng bộ tắt PNC (SWS_CanNm_00519) và Bit 5 (0x20) dùng cho học ánh xạ PNC động (SWS_CanNm_00380)." },
  { abbr: "PNI", term: "Partial Network Info Bit", cat: "PN", desc: "Bit 6 (0x40) của byte CBV. Khi bằng 1, báo hiệu khung NM PDU có mang mặt nạ yêu cầu cụm mạng con (PNC Bit Vector)." },
  { abbr: "PNC", term: "Partial Network Cluster", cat: "PN", desc: "Cụm mạng con logic gồm một nhóm các ECU cùng thực hiện một tính năng (có thể thức/ngủ độc lập với các cụm khác)." },
  { abbr: "EIRA", term: "External & Internal Request Array", cat: "PN", desc: "Mảng bit tổng hợp trạng thái yêu cầu PNC từ cả nội bộ ECU và từ các ECU khác trên bus, báo lên ComM qua PduR." },
  { abbr: "ERA", term: "External Request Array", cat: "PN", desc: "Mảng bit chỉ tổng hợp các yêu cầu PNC nhận được từ bên ngoài trên một kênh CAN (dùng cho Gateway định tuyến PNC)." },
  { abbr: "WUF", term: "Wake-Up Frame (ISO 11898-6)", cat: "PN", desc: "Khung CAN đánh thức chọn lọc được giải mã bởi phần cứng CAN Transceiver hỗ trợ Partial Networking khi ECU đang ngủ." },
  { abbr: "BSM", term: "Bus-Sleep Mode", cat: "CORE", desc: "Chế độ ngủ hoàn toàn của CanNM: phần cứng CAN ở trạng thái Sleep/Standby, không có bất kỳ truyền thông nào trên bus." },
  { abbr: "PBSM", term: "Prepare Bus-Sleep Mode", cat: "CORE", desc: "Pha đệm an toàn chờ WaitBusSleepTime trước khi tắt phần cứng CAN, giúp toàn mạng đồng bộ thời điểm sập nguồn." },
  { abbr: "NM_MODE_NETWORK", term: "Network Mode", cat: "CORE", desc: "Chế độ mạng hoạt động của CanNM, bao gồm 3 trạng thái con: Repeat Message State, Normal Operation State và Ready Sleep State." },
  { abbr: "RMS", term: "Repeat Message State", cat: "CORE", desc: "Trạng thái đầu tiên khi vào Network Mode: phát bản tin định kỳ và lưu lại đủ CanNmRepeatMessageTime trước khi rẽ nhánh." },
  { abbr: "NOS", term: "Normal Operation State", cat: "CORE", desc: "Trạng thái vận hành bình thường: ứng dụng đang cần mạng (Network Requested), node phát bản tin NM PDU định kỳ." },
  { abbr: "RSS", term: "Ready Sleep State", cat: "CORE", desc: "Trạng thái sẵn sàng ngủ: ứng dụng đã nhả mạng (Network Released), node ngưng phát bản tin NM và chờ NM-Timeout Timer hết hạn." },
  { abbr: "Active Wakeup", term: "Active Wakeup", cat: "CORE", desc: "Quá trình ECU thức dậy chủ động do ứng dụng nội bộ gọi CanNm_NetworkRequest() (AWB=1, bắn chùm Immediate Burst Tx)." },
  { abbr: "Passive Startup", term: "Passive Startup", cat: "CORE", desc: "Quá trình ECU thức dậy thụ động do nhận được khung NM từ bus gọi CanNm_PassiveStartUp() (AWB=0, phát trễ theo MsgCycleOffset)." },
  { abbr: "Immediate Burst Tx", term: "Immediate Burst Transmission", cat: "CORE", desc: "Cơ chế bắn chùm liên tiếp các gói NM PDU với chu kỳ cực ngắn (CanNmImmediateNmCycleTime) ngay khi thức dậy chủ động." },
  { abbr: "Immediate Restart", term: "Immediate Restart", cat: "CORE", desc: "Tính năng bắn ngay 1 gói NM PDU tại t=0ms nếu có Network Request khi đang nằm ở pha đệm Prepare Bus-Sleep Mode." },
  { abbr: "Bus Load Reduction", term: "Bus Load Reduction", cat: "CORE", desc: "Cơ chế giảm tải đường truyền CAN trong Normal Operation: giãn chu kỳ phát của node mỗi khi có ECU khác vừa phát bản tin." },
  { abbr: "Remote Sleep", term: "Remote Sleep Indication", cat: "CORE", desc: "Cơ chế trên ECU Gateway nhận biết toàn bộ các ECU con trên nhánh CAN đều đã ở Ready Sleep State (im lặng suốt thời gian quy định)." },
  { abbr: "NM Coordinator", term: "Network Management Coordinator", cat: "STACK", desc: "Chức năng điều phối trên ECU Gateway giúp đồng bộ hóa việc tắt mạng đồng thời giữa nhiều nhánh bus CAN / Ethernet / LIN." },
  { abbr: "Synchronized Shutdown", term: "Synchronized PNC Shutdown", cat: "PN", desc: "Tính năng trong AUTOSAR R25-11 dùng Bit 1 CBV (PNSR) và CanNm_ActivateTxPnShutdownMsg() để tắt đồng loạt cụm PNC, tránh Ping-Pong (Network Mode chỉ có 3 trạng thái nội bộ theo SWS_CanNm_00094)." },
  { abbr: "MsgCycleTime", term: "Message Cycle Time", cat: "CBV", desc: "Chu kỳ phát bản tin NM PDU định kỳ khi ở Repeat Message State và Normal Operation State (mặc định 1000ms)." },
  { abbr: "MsgCycleOffset", term: "Message Cycle Offset", cat: "CBV", desc: "Độ lệch pha phát bản tin đầu tiên sau khi chuyển trạng thái để tránh va chạm khung trên CAN bus (mặc định 100ms)." },
  { abbr: "RepeatMessageTime", term: "Repeat Message Time", cat: "CBV", desc: "Thời gian lưu lại ở Repeat Message State trước khi chuyển sang Normal Operation hoặc Ready Sleep (mặc định 1500ms)." },
  { abbr: "TimeoutTime", term: "NM-Timeout Time", cat: "CBV", desc: "Bộ định thời sinh tử của mạng CAN (mặc định 2000ms). Reset mỗi khi có gói NM; hết hạn ở Ready Sleep thì chuyển sang Prepare Sleep." },
  { abbr: "WaitBusSleepTime", term: "Wait Bus Sleep Time", cat: "CBV", desc: "Khoảng thời gian đếm ngược tại Prepare Bus-Sleep Mode trước khi rơi hẳn vào Bus-Sleep Mode (mặc định 1500ms)." },
  { abbr: "PnResetTime", term: "PN Reset Time", cat: "PN", desc: "Thời gian duy trì trạng thái PNC thức trong mảng ERA/EIRA (mặc định 1500ms). Hết giờ tự xóa bit PNC về 0." },
  { abbr: "TriggerTransmit", term: "PduR_CanNmTriggerTransmit", cat: "STACK", desc: "Cơ chế CanNM gọi lên PduR -> COM để kéo User Data mới nhất đính kèm vào khung NM PDU ngay trước khi phát ra bus." },
  { abbr: "Nm", term: "Generic Network Management", cat: "STACK", desc: "Module tầng dịch vụ cung cấp giao diện chuẩn hóa độc lập với đường truyền vật lý giữa ComM và các module bus NM (CanNm, FrNm...)." },
  { abbr: "ComM", term: "Communication Manager", cat: "STACK", desc: "Module quản lý trạng thái truyền thông của ECU, phân xử yêu cầu giữa các SWC Users và điều phối CanSM / Nm." },
  { abbr: "CanSM", term: "CAN State Manager", cat: "STACK", desc: "Module quản lý trạng thái phần cứng CAN (Controller, Transceiver, PDU Mode) và khôi phục sự cố Bus-Off (BOR)." },
  { abbr: "CanIf", term: "CAN Interface", cat: "STACK", desc: "Lớp trừu tượng hóa phần cứng CAN, cung cấp các hàm CanIf_Transmit(), CanNm_RxIndication() và CanNm_TxConfirmation()." },
  { abbr: "CanDrv", term: "CAN Driver (MCAL)", cat: "STACK", desc: "Driver tầng MCAL trực tiếp cấu hình phần cứng CAN Controller và các thanh ghi Mailbox phần cứng." },
  { abbr: "CanTrcv", term: "CAN Transceiver Driver", cat: "STACK", desc: "Driver điều khiển chip thu phát CAN vật lý (chuyển đổi giữa chế độ Normal, Standby, Sleep và cấu hình cờ Selective Wakeup WUF)." },
  { abbr: "PduR", term: "PDU Router", cat: "STACK", desc: "Bộ định tuyến I-PDU giữa COM, CanNm, SecOC, Dcm và CanIf." },
  { abbr: "COM", term: "AUTOSAR COM", cat: "STACK", desc: "Tầng dịch vụ đóng gói tín hiệu (Signals) từ ứng dụng vào các khung I-PDU và quản lý chu kỳ truyền nhận." },
  { abbr: "RTE", term: "Runtime Environment", cat: "STACK", desc: "Môi trường thực thi thời gian thực kết nối các cổng giao tiếp giữa SWC ứng dụng và các dịch vụ BSW." },
  { abbr: "SchM", term: "BSW Scheduler", cat: "STACK", desc: "Bộ lập lịch các hàm MainFunction định kỳ của BSW và quản lý các vùng dữ liệu găng ExclusiveArea." },
  { abbr: "BswM", term: "BSW Mode Manager", cat: "STACK", desc: "Bộ quản lý chế độ BSW, điều phối việc bật tắt nhóm I-PDU truyền nhận khi mạng vào hoặc ra khỏi chế độ FULL_COM." },
  { abbr: "EcuM", term: "ECU State Manager", cat: "STACK", desc: "Bộ quản lý trạng thái vòng đời ECU: khởi động nguồn (Startup), kiểm tra nguồn đánh thức (Wakeup Validation) và tắt nguồn (Shutdown)." },
  { abbr: "Dcm", term: "Diagnostic Communication Manager", cat: "STACK", desc: "Module xử lý các dịch vụ chẩn đoán UDS (ISO 14229-1), ví dụ dịch vụ UDS 0x28 CommunicationControl để khóa bản tin NM." },
  { abbr: "DEM", term: "Diagnostic Event Manager", cat: "STACK", desc: "Module quản lý các sự kiện lỗi chẩn đoán (DTC), lưu trữ freeze frames và báo cáo lỗi lên máy chẩn đoán." },
  { abbr: "DET", term: "Default Error Tracer", cat: "STACK", desc: "Module theo dõi lỗi phát triển (Development Error) và lỗi runtime trong quá trình tích hợp phần mềm AUTOSAR." },
  { abbr: "ARXML", term: "AUTOSAR XML", cat: "STACK", desc: "Định dạng file XML chuẩn hóa dùng để mô tả kiến trúc, cấu hình ECUC và giao diện của các module AUTOSAR." }
];
