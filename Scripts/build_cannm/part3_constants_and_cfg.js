/*************************************************************************
 * PART 3: CONSTANTS, METADATA, TOOLTIP DATA & ABBREVIATION GLOSSARY
 * Standard: AUTOSAR Classic R22-11 / R23-11 (SWS_CanNm, SWS_Nm, SWS_ComM)
 *************************************************************************/

// 1. ECUC CONFIGURATION TOOLTIP DATABASE (34 Parameters with >1s Hover Delay)
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
    path: "CanNm / CanNmGlobalConfig / CanNmActiveWakeupBitEnabled",
    sws: "ECUC_CanNm_00084 | SWS_CanNm_00401",
    desc: "Bật Bit 4 (Active Wakeup Bit - AWB) trong byte Control Bit Vector (CBV) khi node thức dậy chủ động từ Bus-Sleep/Prepare Bus-Sleep do lời gọi CanNm_NetworkRequest().",
    range: "Boolean (TRUE / FALSE)",
    typical: "TRUE (Khuyến nghị chuẩn AUTOSAR R22-11)",
    note: "Theo SWS_CanNm_00402, bit AWB giữ nguyên = 1 trong suốt thời gian ở Network Mode và chỉ xóa về 0 khi rời khỏi Network Mode sang Prepare Bus-Sleep Mode."
  },
  CanNmStateChangeIndEnabled: {
    name: "CanNmStateChangeIndEnabled",
    path: "CanNm / CanNmGlobalConfig / CanNmStateChangeIndEnabled",
    sws: "ECUC_CanNm_00009 | SWS_CanNm_00166",
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
    note: "Khi DisableCommunication, việc phát bản tin NM PDU và NM-Timeout Timer bị tạm dừng để tránh làm nhiễu bus khi nạp phần mềm."
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
    sws: "ECUC_CanNm_00028 | SWS_CanNm_00032",
    desc: "Chu kỳ phát bản tin NM PDU định kỳ khi node ở trạng thái Repeat Message State và Normal Operation State.",
    range: "100 .. 5000 ms",
    typical: "1000 ms (1 giây một gói NM PDU)",
    note: "Quy tắc Timing AUTOSAR bắt buộc: CanNmMsgCycleTime phải nhỏ hơn CanNmTimeoutTime (thường CanNmTimeoutTime >= 2x CanNmMsgCycleTime)."
  },
  CanNmMsgCycleOffset: {
    name: "CanNmMsgCycleOffset",
    path: "CanNm / CanNmChannelConfig / CanNmMsgCycleOffset",
    sws: "ECUC_CanNm_00029 | SWS_CanNm_00019",
    desc: "Độ lệch pha phát bản tin đầu tiên sau khi chuyển trạng thái (ví dụ khi Passive Startup hoặc vào Normal Operation) để tránh va chạm khung CAN.",
    range: "0 .. 500 ms",
    typical: "100 ms (hoặc gán lệch pha theo Node ID của ECU)",
    note: "Nếu CanNmMsgCycleOffset = 0 ms, gói tin sẽ được phát ngay tại thời điểm chuyển trạng thái."
  },
  CanNmRepeatMessageTime: {
    name: "CanNmRepeatMessageTime",
    path: "CanNm / CanNmChannelConfig / CanNmRepeatMessageTime",
    sws: "ECUC_CanNm_00022 | SWS_CanNm_00102",
    desc: "Thời gian bắt buộc node phải lưu lại ở trạng thái Repeat Message State trước khi được phép rẽ nhánh sang Normal Operation hoặc Ready Sleep.",
    range: "200 .. 5000 ms",
    typical: "1500 ms (đủ cho 1 - 2 chu kỳ phát NM PDU)",
    note: "Trong thời gian này, mọi ECU đều phát bản tin NM để đảm bảo toàn bộ các node trên bus đều nhận biết được sự hiện diện của nhau."
  },
  CanNmTimeoutTime: {
    name: "CanNmTimeoutTime (NM-Timeout Timer)",
    path: "CanNm / CanNmChannelConfig / CanNmTimeoutTime",
    sws: "ECUC_CanNm_00020 | SWS_CanNm_00096",
    desc: "Bộ định thời sinh tử của mạng CAN. Bất kỳ khi nào có gói NM phát (TxConfirmation) hoặc nhận (RxIndication), timer này được nạp lại đầy.",
    range: "200 .. 5000 ms",
    typical: "2000 ms (Gấp đôi CanNmMsgCycleTime)",
    note: "Khi node ở Ready Sleep State, nếu CanNmTimeoutTime chạm 0 ms nghĩa là toàn mạng đã yên ắng và đồng ý đi ngủ, kích hoạt chuyển sang Prepare Bus-Sleep."
  },
  CanNmWaitBusSleepTime: {
    name: "CanNmWaitBusSleepTime",
    path: "CanNm / CanNmChannelConfig / CanNmWaitBusSleepTime",
    sws: "ECUC_CanNm_00021 | SWS_CanNm_00115",
    desc: "Thời gian đếm ngược tại pha đệm Prepare Bus-Sleep Mode trước khi chuyển hẳn sang Bus-Sleep Mode và ngắt nguồn phần cứng CAN.",
    range: "100 .. 5000 ms",
    typical: "1500 ms",
    note: "Tất cả các ECU trên cùng một bus CAN bắt buộc phải cấu hình cùng một giá trị CanNmWaitBusSleepTime để tắt nguồn đồng loạt."
  },
  CanNmMsgTimeoutTime: {
    name: "CanNmMsgTimeoutTime",
    path: "CanNm / CanNmChannelConfig / CanNmMsgTimeoutTime",
    sws: "ECUC_CanNm_00030 | SWS_CanNm_00064",
    desc: "Thời gian giám sát việc gửi bản tin NM. Sau khi gọi CanIf_Transmit(), nếu quá khoảng thời gian này mà chưa nhận được CanNm_TxConfirmation(), CanNM sẽ báo lỗi timeout.",
    range: "50 .. 1000 ms",
    typical: "500 ms",
    note: "Khi hết hạn, CanNM gọi Nm_TxTimeoutException() và CanSM_TxTimeoutException() để xử lý ngắt nghẽn đường truyền hoặc Bus-Off."
  },
  CanNmNodeId: {
    name: "CanNmNodeId",
    path: "CanNm / CanNmChannelConfig / CanNmNodeId",
    sws: "ECUC_CanNm_00031 | SWS_CanNm_00013",
    desc: "Mã định danh logic 8-bit duy nhất của ECU trên kênh CAN, được đóng gói vào byte Source Node Identifier (SNI) của bản tin NM PDU.",
    range: "0x00 .. 0xFE (0 .. 254)",
    typical: "0x1A (Node #26 trong mô phỏng)",
    note: "CAN ID truyền thực tế của bản tin NM = CanNmBaseCanId + CanNmNodeId (ví dụ: 0x500 + 0x1A = 0x51A)."
  },
  CanNmBaseCanId: {
    name: "CanNmBaseCanId",
    path: "CanNm / CanNmChannelConfig / CanNmBaseCanId",
    sws: "ECUC_CanNm_00013 | SWS_CanNm_00013",
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
    sws: "ECUC_CanNm_00003 | SWS_CanNm_00132",
    desc: "Kích hoạt các API đọc mã Node ID: CanNm_GetNodeIdentifier() để đọc Node ID của bản tin vừa nhận và CanNm_GetLocalNodeIdentifier() để đọc Node ID của chính mình.",
    range: "Boolean (TRUE / FALSE)",
    typical: "TRUE",
    note: "Cho phép các SWC phía trên biết được chính xác ECU nào vừa gửi gói tin NM trên bus."
  },
  CanNmNodeDetectionEnabled: {
    name: "CanNmNodeDetectionEnabled",
    path: "CanNm / CanNmChannelConfig / CanNmNodeDetectionEnabled",
    sws: "ECUC_CanNm_00004 | SWS_CanNm_00113",
    desc: "Bật tính năng điểm danh toàn mạng. Cho phép gọi CanNm_RepeatMessageRequest() và chuyển về Repeat Message khi nhận gói tin có Bit 0 RMR = 1.",
    range: "Boolean (TRUE / FALSE)",
    typical: "TRUE (Dùng nhiều cho Tester hoặc Gateway)",
    note: "Gói tin có RMR=1 sẽ ép tất cả các ECU trên mạng dù đang ở Ready Sleep cũng phải thức dậy phát bản tin để điểm danh."
  },
  CanNmRepeatMsgIndEnabled: {
    name: "CanNmRepeatMsgIndEnabled",
    path: "CanNm / CanNmChannelConfig / CanNmRepeatMsgIndEnabled",
    sws: "ECUC_CanNm_00005 | SWS_CanNm_00014",
    desc: "Bật việc gọi hàm Callback Nm_RepeatMessageIndication() lên tầng Nm mỗi khi nhận được gói tin NM có Bit 0 (RMR = 1).",
    range: "Boolean (TRUE / FALSE)",
    typical: "TRUE khi cần báo cho ứng dụng biết có lệnh điểm danh từ xa",
    note: "Giúp ứng dụng chủ động khởi động các tiến trình chẩn đoán mạng."
  },
  CanNmImmediateNmTransmissions: {
    name: "CanNmImmediateNmTransmissions",
    path: "CanNm / CanNmChannelConfig / CanNmImmediateNmTransmissions",
    sws: "ECUC_CanNm_00056 | SWS_CanNm_00334",
    desc: "Số lượng bản tin NM PDU được bắn chùm tốc độ cao (Immediate Burst Tx) ngay khi node thức dậy chủ động qua CanNm_NetworkRequest().",
    range: "0 .. 10 gói tin",
    typical: "3 gói tin (Nếu = 0, tắt chế độ bắn chùm và dùng chu kỳ bình thường)",
    note: "Bắn chùm giúp đảm bảo các ECU khác trên bus nhận được bản tin đánh thức nhanh nhất có thể ngay cả khi bus đang có tải."
  },
  CanNmImmediateNmCycleTime: {
    name: "CanNmImmediateNmCycleTime",
    path: "CanNm / CanNmChannelConfig / CanNmImmediateNmCycleTime",
    sws: "ECUC_CanNm_00057 | SWS_CanNm_00335",
    desc: "Chu kỳ cực ngắn giữa các bản tin trong chùm bắn tốc độ cao Immediate Burst Tx.",
    range: "10 .. 200 ms",
    typical: "100 ms (hoặc 20ms - 50ms tùy yêu cầu OEM)",
    note: "Sau khi bắn đủ số gói CanNmImmediateNmTransmissions, CanNM tự động quay lại chu kỳ phát chuẩn CanNmMsgCycleTime."
  },
  CanNmImmediateRestartEnabled: {
    name: "CanNmImmediateRestartEnabled",
    path: "CanNm / CanNmChannelConfig / CanNmImmediateRestartEnabled",
    sws: "ECUC_CanNm_00008 | SWS_CanNm_00122",
    desc: "Nếu có Network Request khi đang ở Prepare Bus-Sleep Mode: nếu TRUE, CanNM bắn ngay gói NM PDU tại t=0ms; nếu FALSE, chờ hết chu kỳ định kỳ mới phát.",
    range: "Boolean (TRUE / FALSE)",
    typical: "TRUE (Đánh thức khẩn cấp ngay tức thì)",
    note: "Giúp cứu mạng CAN không bị rơi vào trạng thái ngủ lỡ dở khi một ECU bất ngờ có việc khẩn cấp cần mạng."
  },
  CanNmBusLoadReductionEnabled: {
    name: "CanNmBusLoadReductionEnabled",
    path: "CanNm / CanNmChannelConfig / CanNmBusLoadReductionEnabled",
    sws: "ECUC_CanNm_00006 | SWS_CanNm_00052",
    desc: "Kích hoạt thuật toán giảm tải đường truyền CAN trong Normal Operation State bằng cách nạp lại chu kỳ dài hơn mỗi khi có ECU khác vừa phát bản tin.",
    range: "Boolean (TRUE / FALSE)",
    typical: "FALSE trên mạng nhỏ; TRUE trên mạng có hàng chục ECU",
    note: "Thuật toán này chỉ hoạt động trong Normal Operation State; không áp dụng trong Repeat Message State."
  },
  CanNmMsgReducedTime: {
    name: "CanNmMsgReducedTime",
    path: "CanNm / CanNmChannelConfig / CanNmMsgReducedTime",
    sws: "ECUC_CanNm_00027 | SWS_CanNm_00069",
    desc: "Chu kỳ phát điều chỉnh dùng khi bật cơ chế giảm tải đường truyền CanNmBusLoadReductionEnabled.",
    range: "100 .. 2000 ms",
    typical: "500 ms",
    note: "Khi nhận bản tin từ node khác, timer phát của node được đẩy lùi về CanNmMsgCycleTime để nhường đường cho node khác."
  },
  CanNmPnEnabled: {
    name: "CanNmPnEnabled",
    path: "CanNm / CanNmChannelConfig / CanNmPnEnabled",
    sws: "ECUC_CanNm_00060 | SWS_CanNm_00409",
    desc: "Kích hoạt tính năng Partial Networking (PN): Tự động bật Bit 6 (PNI = 1) trong CBV và bật bộ lọc cụm mạng con CanNmPnFilterAlgorithm.",
    range: "Boolean (TRUE / FALSE)",
    typical: "TRUE trên các dòng xe điện/hybrid hiện đại có hỗ trợ PN",
    note: "Yêu cầu phần cứng CAN Transceiver hỗ trợ ISO 11898-6 (Selective Wakeup)."
  },
  CanNmAllNmMessagesKeepAwake: {
    name: "CanNmAllNmMessagesKeepAwake",
    path: "CanNm / CanNmChannelConfig / CanNmAllNmMessagesKeepAwake",
    sws: "ECUC_CanNm_00068 | SWS_CanNm_00411",
    desc: "Khi bật PN: nếu FALSE, chỉ những gói NM có PNC trùng mặt nạ mới giữ ECU thức; nếu TRUE, bất kỳ gói NM nào trên bus cũng giữ ECU thức.",
    range: "Boolean (TRUE / FALSE)",
    typical: "FALSE (Để tận dụng tối đa lợi ích tiết kiệm điện của Partial Networking)",
    note: "Nếu đặt TRUE, ECU sẽ không bao giờ ngủ được nếu các cụm mạng khác vẫn đang hoạt động."
  },
  CanNmPnInfoOffset: {
    name: "CanNmPnInfoOffset",
    path: "CanNm / CanNmChannelConfig / CanNmPnInfoOffset",
    sws: "ECUC_CanNm_00061 | SWS_CanNm_00412",
    desc: "Vị trí byte bắt đầu trong khung 8-byte NM PDU chứa mảng bit yêu cầu Partial Network Cluster (PNC).",
    range: "1 .. 6 (Thường là Byte 2 ngay sau CBV)",
    typical: "2 (Byte 2)",
    note: "Từ vị trí này trở đi, mỗi bit đại diện cho một cụm mạng con PNC (PNC #16..#23 tại Byte 2)."
  },
  CanNmPnInfoLength: {
    name: "CanNmPnInfoLength",
    path: "CanNm / CanNmChannelConfig / CanNmPnInfoLength",
    sws: "ECUC_CanNm_00062 | SWS_CanNm_00412",
    desc: "Số lượng byte trong khung NM PDU dành riêng cho thông tin Partial Network (PNC Bit Vector).",
    range: "1 .. 6 Bytes",
    typical: "2 Bytes (Quản lý được 16 cụm PNC)",
    note: "Các byte còn lại phía sau vùng PnInfo sẽ được dùng cho User Data thông thường."
  },
  CanNmPnFilterMaskByte: {
    name: "CanNmPnFilterMaskByte",
    path: "CanNm / CanNmChannelConfig / CanNmPnFilterMaskByte",
    sws: "ECUC_CanNm_00065 | SWS_CanNm_00409",
    desc: "Mặt nạ bit cấu hình các cụm mạng con PNC mà ECU này trực tiếp tham gia (mỗi bit 1 = tham gia PNC đó).",
    range: "Mảng Hex byte (Ví dụ: 05 00 = PNC #16 và #18)",
    typical: "05 00",
    note: "Khi nhận gói NM PDU có PNI=1, CanNM thực hiện phép AND logic giữa PnInfo nhận được và FilterMask này. Nếu khác 0, gói tin được chấp nhận."
  },
  CanNmPnResetTime: {
    name: "CanNmPnResetTime",
    path: "CanNm / CanNmChannelConfig / CanNmPnResetTime",
    sws: "ECUC_CanNm_00064 | SWS_CanNm_00431",
    desc: "Thời gian đếm ngược duy trì trạng thái PNC thức trong mảng ERA/EIRA sau khi nhận được yêu cầu từ bus.",
    range: "200 .. 5000 ms",
    typical: "1500 ms",
    note: "Nếu suốt thời gian này không có thêm gói tin nào yêu cầu PNC đó, bit PNC tương ứng trong ERA/EIRA sẽ tự động xóa về 0."
  },
  CanNmSynchronizedPncShutdownEnabled: {
    name: "CanNmSynchronizedPncShutdownEnabled",
    path: "CanNm / CanNmChannelConfig / CanNmSynchronizedPncShutdownEnabled",
    sws: "ECUC_CanNm_00095 | SWS_CanNm_91003",
    desc: "Kích hoạt cơ chế tắt đồng bộ cụm mạng con (Synchronized PNC Shutdown) qua trạng thái NM_STATE_SYNCHRONIZE.",
    range: "Boolean (TRUE / FALSE)",
    typical: "TRUE trên ECU Gateway R20-11 / R22-11",
    note: "Giúp ngăn chặn hiện tượng các ECU đánh thức qua lại lẫn nhau (Ping-Pong Wakeup) khi tắt cụm PNC."
  },
  CanNmUserDataEnabled: {
    name: "CanNmUserDataEnabled",
    path: "CanNm / CanNmChannelConfig / CanNmUserDataEnabled",
    sws: "ECUC_CanNm_00007 | SWS_CanNm_00159",
    desc: "Cho phép truyền và nhận dữ liệu người dùng (User Data) trong các byte còn lại của bản tin NM PDU.",
    range: "Boolean (TRUE / FALSE)",
    typical: "TRUE (Dùng truyền mã nguyên nhân thức, điện áp, trạng thái xe)",
    note: "Có thể truyền dữ liệu qua API thủ công CanNm_SetUserData() hoặc tự động qua COM."
  },
  CanNmComUserDataSupport: {
    name: "CanNmComUserDataSupport",
    path: "CanNm / CanNmChannelConfig / CanNmComUserDataSupport",
    sws: "ECUC_CanNm_00055 | SWS_CanNm_00328",
    desc: "Tự động lấy dữ liệu User Data từ bộ đệm I-PDU của AUTOSAR COM qua lời gọi PduR_CanNmTriggerTransmit() mỗi khi CanNM phát bản tin.",
    range: "Boolean (TRUE / FALSE)",
    typical: "TRUE (Phương pháp hiện đại nhất, tránh phải gọi API thủ công)",
    note: "Khi bật tính năng này, hàm CanNm_SetUserData() sẽ bị khóa theo SWS_CanNm_00327."
  },
  UserDataBytesHex: {
    name: "UserDataBytesHex",
    path: "CanNm / CanNmChannelConfig / UserDataBytesHex",
    sws: "SWS_CanNm_00158",
    desc: "Chuỗi byte dữ liệu người dùng giả lập được đóng gói vào các byte còn lại của bản tin NM PDU.",
    range: "Mảng Hex byte (Ví dụ: 11 22 33 44 55 66)",
    typical: "11 22 33 44 55 66",
    note: "Dữ liệu này được các ECU khác trích xuất và đẩy lên ứng dụng khi nhận được bản tin NM."
  },
  CanNmCarWakeUpRxEnabled: {
    name: "CanNmCarWakeUpRxEnabled",
    path: "CanNm / CanNmChannelConfig / CanNmCarWakeUpRxEnabled",
    sws: "ECUC_CanNm_00074 | SWS_CanNm_00406",
    desc: "Cho phép phát hiện Bit 3 (Car Wakeup Bit - CSR) trong byte CBV và kích hoạt hàm Callback Nm_CarWakeUpIndication().",
    range: "Boolean (TRUE / FALSE)",
    typical: "TRUE trên các ECU Master/Gateway quản lý nguồn xe",
    note: "Car Wakeup được dùng khi một sự kiện (như mở khóa cửa) cần đánh thức toàn bộ các liên mạng trên xe chứ không chỉ riêng 1 cụm PNC."
  },
  CanNmCarWakeUpFilterEnabled: {
    name: "CanNmCarWakeUpFilterEnabled",
    path: "CanNm / CanNmChannelConfig / CanNmCarWakeUpFilterEnabled",
    sws: "ECUC_CanNm_00075 | SWS_CanNm_00408",
    desc: "Chỉ chấp nhận lệnh Car Wakeup nếu gói tin NM xuất phát từ đúng mã Node ID được chỉ định trong CanNmCarWakeUpFilterNodeId.",
    range: "Boolean (TRUE / FALSE)",
    typical: "TRUE (Bảo vệ an ninh, tránh bị ECU lỗi hoặc mã độc kích hoạt Car Wakeup bừa bãi)",
    note: "Nếu gói tin có CSR=1 nhưng Node ID không khớp bộ lọc, lệnh Car Wakeup sẽ bị CanNM bỏ qua."
  },
  CanNmCarWakeUpFilterNodeId: {
    name: "CanNmCarWakeUpFilterNodeId",
    path: "CanNm / CanNmChannelConfig / CanNmCarWakeUpFilterNodeId",
    sws: "ECUC_CanNm_00076 | SWS_CanNm_00408",
    desc: "Mã Node ID của ECU duy nhất được quyền phát lệnh đánh thức toàn xe Car Wakeup.",
    range: "0x00 .. 0xFE",
    typical: "0x2B (Ví dụ: ECU Body Control Module / Smart Key)",
    note: "Chỉ có tác dụng khi CanNmCarWakeUpFilterEnabled = TRUE."
  },
  CanNmRemoteSleepIndEnabled: {
    name: "CanNmRemoteSleepIndEnabled",
    path: "CanNm / CanNmChannelConfig / CanNmRemoteSleepIndEnabled",
    sws: "ECUC_CanNm_00011 | SWS_CanNm_00150",
    desc: "Bật tính năng phát hiện trạng thái ngủ từ xa (Remote Sleep Detection) cho ECU Gateway / NM Coordinator.",
    range: "Boolean (TRUE / FALSE)",
    typical: "TRUE trên ECU Gateway điều phối nhiều mạng",
    note: "Khi node ở Normal Operation mà không nhận được gói NM nào suốt CanNmRemoteSleepIndTime, CanNM sẽ báo Nm_RemoteSleepIndication."
  },
  CanNmRemoteSleepIndTime: {
    name: "CanNmRemoteSleepIndTime",
    path: "CanNm / CanNmChannelConfig / CanNmRemoteSleepIndTime",
    sws: "ECUC_CanNm_00023 | SWS_CanNm_00150",
    desc: "Thời gian chờ yên ắng trên bus tại Normal Operation State trước khi kết luận toàn bộ các node con đều đã ở Ready Sleep State.",
    range: "200 .. 5000 ms",
    typical: "1500 ms",
    note: "Giúp Gateway chủ động chuẩn bị đóng nhánh mạng mà không cần chờ đến khi tắt hẳn."
  }
};

// 2. 8-BIT CONTROL BIT VECTOR (CBV) BITS METADATA (SWS_CanNm_00045)
const CANNM_CBV_BITS = [
  { bit: 0, mask: 0x01, name: "RMR", label: "Repeat Message Request", desc: "Bit 0: Yêu cầu toàn mạng điểm danh. Bật khi gọi CanNm_RepeatMessageRequest(). Tự xóa về 0 khi hết CanNmRepeatMessageTime." },
  { bit: 1, mask: 0x02, name: "RES1", label: "Reserved Bit 1", desc: "Bit 1: Dự trữ cho chuẩn AUTOSAR tương lai. Luôn truyền bằng 0." },
  { bit: 2, mask: 0x04, name: "RES2", label: "Reserved Bit 2", desc: "Bit 2: Dự trữ cho chuẩn AUTOSAR tương lai. Luôn truyền bằng 0." },
  { bit: 3, mask: 0x08, name: "CSR", label: "Car Wakeup Request", desc: "Bit 3: Yêu cầu đánh thức toàn xe. Khi nhận được từ node hợp lệ, CanNM kích hoạt Nm_CarWakeUpIndication()." },
  { bit: 4, mask: 0x10, name: "AWB", label: "Active Wakeup Bit", desc: "Bit 4: Báo hiệu node thức dậy chủ động (Active Wakeup). Duy trì suốt Network Mode và chỉ xóa khi sang Prepare Bus-Sleep." },
  { bit: 5, mask: 0x20, name: "RES5", label: "Reserved / SyncShutdown", desc: "Bit 5: Dự trữ (Trong R20-11/R22-11 dùng cho Synchronized PNC Shutdown Request nếu bật cấu hình)." },
  { bit: 6, mask: 0x40, name: "PNI", label: "Partial Network Info", desc: "Bit 6: Báo hiệu gói tin NM có chứa thông tin Partial Network (PNC Bit Vector). Kích hoạt bộ lọc PN ở đầu nhận." },
  { bit: 7, mask: 0x80, name: "RES7", label: "Reserved Bit 7", desc: "Bit 7: Dự trữ cho chuẩn AUTOSAR tương lai. Luôn truyền bằng 0." }
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
    sws: "AUTOSAR SWS CanNm (R22-11 / R23-11)",
    input: "Lệnh điều khiển từ Nm. Xác nhận khả dụng PN từ CanSM (CanNm_ConfirmPnAvailability). Callbacks từ CanIf (CanNm_RxIndication, CanNm_TxConfirmation). Xung nhịp CanNm_MainFunction().",
    processing: "Điều phối máy trạng thái phân tán (3 Modes, 3 Sub-states). Quản lý 5 bộ đếm thời gian (RepeatMessage, Timeout, WaitBusSleep, MsgCycle, BurstTx). Đóng gói khung 8-byte NM PDU và byte CBV. Bộ lọc Partial Networking (PN Filter Mask).",
    output: "Gọi xuống CanIf: CanIf_Transmit(). Gọi sang PduR: PduR_CanNmTriggerTransmit(), PduR_CanNmRxIndication(). Báo lên Nm: Nm_NetworkMode(), Nm_BusSleepMode(), Nm_StateChangeNotification().",
    apis: ["CanIf_Transmit()", "PduR_CanNmTriggerTransmit()", "PduR_CanNmRxIndication()", "Nm_StateChangeNotification()"]
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
    input: "Báo cáo lỗi phát triển và lỗi runtime từ CanNM (ModuleId = 31 / 0x001F).",
    processing: "Det ghi nhận các mã lỗi CANNM_E_UNINIT (0x01), CANNM_E_INVALID_CHANNEL (0x02), CANNM_E_INVALID_PDUID (0x03), CANNM_E_NET_START_IND (0x04), CANNM_E_INIT_FAILED (0x05). Dem ghi nhận lỗi phần cứng chập bus nếu có.",
    output: "Hiển thị cảnh báo trên bảng Trace log và Inspector.",
    apis: ["Det_ReportError()", "Det_ReportRuntimeError()"]
  }
};

// 5. ABBREVIATION GLOSSARY TABLE (48+ TERMS WITH CATEGORIES)
const ABBREVIATIONS_DATA = [
  { abbr: "CanNM / CanNm", term: "CAN Network Management", cat: "CORE", desc: "Module BSW thuộc tầng Communication Services điều phối việc đánh thức và đưa mạng CAN về ngủ đồng bộ nhằm tiết kiệm ắc-quy." },
  { abbr: "CBV", term: "Control Bit Vector", cat: "CBV", desc: "Byte điều khiển 8-bit nằm trong khung NM PDU (thường ở Byte 1), chứa các cờ điều phối mạng: Bit 0 (RMR), Bit 3 (CSR), Bit 4 (AWB), Bit 6 (PNI)." },
  { abbr: "SNI / NID", term: "Source Node Identifier", cat: "CBV", desc: "Mã định danh 8-bit duy nhất của ECU phát bản tin NM (thường ở Byte 0, cấu hình qua CanNmNodeId)." },
  { abbr: "AWB", term: "Active Wakeup Bit", cat: "CBV", desc: "Bit 4 (0x10) của byte CBV. Bật = 1 khi node thức dậy chủ động do CanNm_NetworkRequest(); bằng 0 nếu thức dậy thụ động (Passive)." },
  { abbr: "RMR", term: "Repeat Message Request Bit", cat: "CBV", desc: "Bit 0 (0x01) của byte CBV. Khi bật = 1, yêu cầu tất cả các ECU trên mạng chuyển về Repeat Message State để điểm danh." },
  { abbr: "CSR / CWU", term: "Car Wakeup Request", cat: "CBV", desc: "Bit 3 (0x08) của byte CBV. Khi bằng 1, kích hoạt Nm_CarWakeUpIndication() để đánh thức toàn bộ các nhánh mạng trên xe." },
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
  { abbr: "Synchronized Shutdown", term: "Synchronized PNC Shutdown", cat: "PN", desc: "Tính năng trong AUTOSAR R20-11/R22-11 đưa kênh qua NM_STATE_SYNCHRONIZE để tắt đồng loạt cụm mạng con, tránh Ping-Pong." },
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
