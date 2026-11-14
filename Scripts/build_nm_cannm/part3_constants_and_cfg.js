// ================= PART 3: CONSTANTS, 8-BIT REGISTERS, 46 CONFIG TOOLTIPS, MODULE METADATA & 56 ABBREVIATIONS =================

const CANNM_CBV_BITS = [
  { bit: 7, mask: 0x80, tag: "RSVD_7",  name: "RESERVED_BIT_7", tone: "",     desc: "Bit dự trữ theo chuẩn SWS_CanNm_00045. Luôn đặt bằng 0." },
  { bit: 6, mask: 0x40, tag: "PNI",     name: "PNI_BIT",        tone: "pur",  desc: "Partial Network Information Bit (0x40): Bật = 1 khi CanNmPnEnabled = TRUE (SWS_CanNm_00413) báo khung NM mang PNC Bit Vector." },
  { bit: 5, mask: 0x20, tag: "PNSR",    name: "SYNC_PNC_SHDN",  tone: "cyan", desc: "Synchronized PNC Shutdown Request Bit (0x20, R20-11+): Bật = 1 khi ComM -> Nm_RequestSynchronizedPncShutdown -> CanNm." },
  { bit: 4, mask: 0x10, tag: "AWB",     name: "ACTIVE_WAKEUP",  tone: "",     desc: "Active Wakeup Bit (0x10, SWS_CanNm_00401): Bật = 1 khi thức dậy chủ động qua Nm_NetworkRequest(); giữ 0 nếu PassiveStartUp." },
  { bit: 3, mask: 0x08, tag: "SRB/CWU", name: "SRB_OR_CWU_BIT", tone: "warn", desc: "Bit 3 (0x08): Vừa là CoordReadyToSleepBit (CanNm_SetSleepReadyBit từ Nm Coordinator, SWS_CanNm_00342), vừa là Car WakeUp Bit (SWS_CanNm_00406)." },
  { bit: 2, mask: 0x04, tag: "RSVD_2",  name: "RESERVED_BIT_2", tone: "",     desc: "Bit dự trữ theo chuẩn SWS_CanNm_00045. Luôn đặt bằng 0." },
  { bit: 1, mask: 0x02, tag: "RSVD_1",  name: "RESERVED_BIT_1", tone: "",     desc: "Bit dự trữ theo chuẩn SWS_CanNm_00045. Luôn đặt bằng 0." },
  { bit: 0, mask: 0x01, tag: "RMR",     name: "REPEAT_MSG_REQ", tone: "warn", desc: "Repeat Message Request Bit (0x01, SWS_CanNm_00113): Bật = 1 khi gọi Nm_RepeatMessageRequest() để ép toàn mạng điểm danh." }
];

const NM_CANNM_ENGINE_BITS = [
  { bit: 7, mask: 0x80, tag: "COORD_SHDN", name: "COORD_SHDN_RUN",  tone: "pur",  desc: "Nm Coordinator đang chạy NmShutdownDelayTimer (SHUTDOWN_INITIATED, SWS_Nm_00232) trước khi giải phóng đồng loạt Cluster." },
  { bit: 6, mask: 0x40, tag: "CH0_REMSLP", name: "CH0_REMOTE_SLP",  tone: "cyan", desc: "CanNm Ch0 đã phát hiện các node từ xa im lặng đủ CanNmRemoteSleepIndTime và báo Nm_RemoteSleepIndication(Ch0)." },
  { bit: 5, mask: 0x20, tag: "CH1_REMSLP", name: "CH1_REMOTE_SLP",  tone: "cyan", desc: "Nhánh phụ Ch1 sẵn sàng ngủ (đã báo Nm_RemoteSleepIndication(Ch1) hoặc có NmChannelSleepMaster=TRUE & đã Release)." },
  { bit: 4, mask: 0x10, tag: "COORD_SRB",  name: "COORD_SRB_SET",   tone: "warn", desc: "Nm Coordinator đã gọi CanNm_SetSleepReadyBit(TRUE) hoặc Passive Coordinator đã nhận Nm_CoordReadyToSleepIndication()." },
  { bit: 3, mask: 0x08, tag: "NMS_RPT",    name: "NMS_REPORT_SENT", tone: "cyan", desc: "Nm nhận Nm_StateChangeNotification() từ CanNm và đã gọi Com_SendSignal(NmStateReportSignalRef) ghi mã 6-bit NMS (SWS_Nm_00154)." },
  { bit: 2, mask: 0x04, tag: "CANNM_HOLD", name: "CANNM_NET_HOLD",  tone: "",     desc: "CanNm Ch0 đang được giữ ở trạng thái Network Requested (CanNm_NetworkRequest đang hiệu lực từ Nm / Coordinator)." },
  { bit: 1, mask: 0x02, tag: "TIMEOUT",    name: "CANNM_TMO_RUN",   tone: "warn", desc: "CanNmTimeoutTime (NM-Timeout Timer) đang hoạt động trong NM_MODE_NETWORK (sẽ dừng khi DisableCommunication)." },
  { bit: 0, mask: 0x01, tag: "INIT",       name: "NM_CANNM_INIT",   tone: "",     desc: "Cả Nm_Init() và CanNm_Init() đã hoàn tất khởi tạo. Nếu = 0, mọi API sẽ báo lỗi DET NM_E_UNINIT / CANNM_E_UNINIT." }
];

const configTooltipData = {
  NmCanNmInitialized: {
    title: "Nm & CanNm Init Status",
    ecucPath: "EcuM / BswM Init -> Nm_Init() & CanNm_Init()",
    sws: "SWS_Nm_00030 · SWS_CanNm_00060",
    range: "Boolean (TRUE = Initialized | FALSE = UNINIT)",
    role: "Biểu thị trạng thái đã khởi tạo của cả module Nm và module CanNm.",
    mechanism: "Nếu tắt FALSE, mọi lời gọi API vào Nm_* báo Det_ReportError(Module=29, NM_E_UNINIT=0x00) và xuống CanNm_* báo Det_ReportError(Module=31, CANNM_E_UNINIT=0x01).",
    scenarioImpact: "Tắt ở kịch bản S14 hoặc What-If để quan sát cơ chế bẫy DET phân tầng giữa Nm và CanNm."
  },
  NmDevErrorDetect: {
    title: "NmDevErrorDetect & CanNmDevErrorDetect",
    ecucPath: "NmGlobalConfig/NmGlobalProperties/NmDevErrorDetect",
    sws: "SWS_Nm_00193 · SWS_CanNm_00002",
    range: "Boolean (true | false)",
    role: "Bật/tắt phát hiện và báo lỗi Development Error qua Det_ReportError().",
    mechanism: "Kiểm tra tham số Channel Handle hợp lệ, con trỏ NULL_PTR và trạng thái khởi tạo trước khi thực thi logic.",
    scenarioImpact: "Khi tắt FALSE, các hàm sai điều kiện vẫn trả về E_NOT_OK nhưng không ghi lỗi vào DET."
  },
  NmBusType: {
    title: "NmBusType (Dispatcher Target)",
    ecucPath: "NmChannelConfig / NmBusType",
    sws: "SWS_Nm_00020 · ECUC_Nm_00207",
    range: "NM_BUSNM_CANNM | NM_BUSNM_FRNM | NM_BUSNM_UDPNM | NM_BUSNM_GENERICNM",
    role: "Định danh loại BusNM vật lý bên dưới để lớp giao diện Nm ánh xạ lời gọi hàm 1-1.",
    mechanism: "Khi đặt NM_BUSNM_CANNM, mọi API Nm_NetworkRequest / Nm_RepeatMessageRequest / Nm_SetSleepReadyBit đều gọi sang CanNm_* tương ứng.",
    scenarioImpact: "Nếu đổi sang loại BusNM khác, Inspector Code C và Export cho thấy bảng dispatcher của Nm thay đổi tuyến đường."
  },
  NmPassiveModeEnabled: {
    title: "NmPassiveModeEnabled",
    ecucPath: "NmGlobalConfig/NmGlobalFeatures/NmPassiveModeEnabled",
    sws: "SWS_Nm_00196 · SWS_CanNm_00130",
    range: "Boolean (true | false)",
    role: "Biến ECU thành node thụ động (Passive Listener) ngay từ lớp giao diện Nm.",
    mechanism: "Nếu TRUE, Nm khóa/vô hiệu hóa các hàm yêu cầu chủ động (Nm_NetworkRequest, Nm_NetworkRelease, Nm_RepeatMessageRequest, Nm_SetUserData) trước khi gọi xuống CanNm.",
    scenarioImpact: "Bật ở S1 What-If để thấy Nm_NetworkRequest bị chặn ngay tại tầng Nm!"
  },
  NmStateChangeIndEnabled: {
    title: "NmStateChangeIndEnabled & CanNmStateChangeIndEnabled",
    ecucPath: "NmGlobalConfig/NmGlobalFeatures/NmStateChangeIndEnabled",
    sws: "SWS_Nm_00099 · SWS_CanNm_00166",
    range: "Boolean (true | false)",
    role: "Cho phép CanNm gọi callback Nm_StateChangeNotification(Handle, prevState, currState) mỗi khi đổi trạng thái.",
    mechanism: "Là cầu nối đầu vào bắt buộc để Nm thông báo lên BswM_Nm_StateChangeNotification() và kích hoạt NmStateReport.",
    scenarioImpact: "Tắt ở S4 để thấy CanNm không còn báo chuyển trạng thái lên Nm nữa."
  },
  NmStateReportEnabled: {
    title: "NmStateReportEnabled (NMS Auto Report)",
    ecucPath: "NmChannelConfig / NmStateReportEnabled",
    sws: "SWS_Nm_00154 · ECUC_Nm_00221",
    range: "Boolean (true | false)",
    role: "Tự động mã hóa quá trình chuyển trạng thái của CanNm thành tín hiệu 6-bit NMS gửi qua COM.",
    mechanism: "Mỗi khi nhận Nm_StateChangeNotification(), Nm ánh xạ cặp (prevState->currState) ra mã 0x01..0x20 và gọi Com_SendSignal(NmStateReportSignalRef).",
    scenarioImpact: "Trọng tâm kịch bản S4: tạo thành vòng tròn khép kín CanNm -> Nm -> COM -> PduR -> CanNm!"
  },
  NmStateReportSignalRef: {
    title: "NmStateReportSignalRef",
    ecucPath: "NmChannelConfig / NmStateReportSignalRef",
    sws: "SWS_Nm_00222 · ECUC_Nm_00222",
    range: "Symbolic Signal Ref (ComSignal)",
    role: "Tham chiếu tới COM Signal dùng để lưu byte mã hóa trạng thái mạng (NMS) trong User Data của NM PDU.",
    mechanism: "Tín hiệu này thường nằm ở Byte 4 của khung 8-Byte NM PDU và được CanNm tự động kéo xuống qua PduR_CanNmTriggerTransmit().",
    scenarioImpact: "Hiển thị nhãn Signal trực tiếp trên Byte 4 của Khung 8-Byte PDU và trong API Trace."
  },
  NmCoordinatorSupportEnabled: {
    title: "NmCoordinatorSupportEnabled",
    ecucPath: "NmGlobalConfig/NmGlobalFeatures/NmCoordinatorSupportEnabled",
    sws: "SWS_Nm_00232 · ECUC_Nm_00200",
    range: "Boolean (true | false)",
    role: "Kích hoạt thuật toán NM Coordinator trong Nm_MainFunction() cho ECU Gateway đa kênh.",
    mechanism: "Khi TRUE, Nm gom Ch0 & Ch1 vào Cluster chung: giữ các kênh thức đồng bộ, đợi đủ RemoteSleepIndication() và đếm ngược NmShutdownDelayTimer mới gọi CanNm_NetworkRelease().",
    scenarioImpact: "Trọng tâm các kịch bản Nhóm 3 (S8, S9, S10, S11). Tắt FALSE sẽ biến Nm thành bộ chuyển tiếp 1-1 thuần túy."
  },
  NmCycletimeMainFunction: {
    title: "NmCycletimeMainFunction",
    ecucPath: "NmGlobalConfig/NmGlobalProperties/NmCycletimeMainFunction",
    sws: "SWS_Nm_00118 · ECUC_Nm_00194",
    range: "uint16 (10 .. 500 ms, typical 100 ms)",
    role: "Chu kỳ SchM gọi hàm Nm_MainFunction() để chạy máy trạng thái NM Coordinator.",
    mechanism: "Quyết định độ phân giải đếm ngược của NmShutdownDelayTimer trên mỗi tick.",
    scenarioImpact: "Ảnh hưởng tốc độ đếm ngược của NmShutdownDelayTimer khi nhấn +1 Tick hoặc Auto Clock."
  },
  NmGlobalCoordinatorTime: {
    title: "NmGlobalCoordinatorTime",
    ecucPath: "NmGlobalConfig/NmGlobalFeatures/NmGlobalCoordinatorTime",
    sws: "SWS_Nm_00232 · ECUC_Nm_00230",
    range: "uint32 (200 .. 20000 ms, typical 1500 ms)",
    role: "Thời gian trễ tối đa dùng để tính NmShutdownDelayTimer khi phối hợp tắt đồng bộ nhiều nhánh mạng.",
    mechanism: "Trong pha SHUTDOWN_INITIATED, Nm đặt bộ đếm NmShutdownDelayTimer (sau khi bù trừ NmMsgCycleTime của kênh) để chờ các Passive Coordinator chuẩn bị xong.",
    scenarioImpact: "Điều chỉnh tại S9/S10 để thay đổi thời gian đếm ngược trước khi gọi CanNm_NetworkRelease() đồng loạt."
  },
  NmActiveCoordinator: {
    title: "NmActiveCoordinator (Ch0 Role)",
    ecucPath: "NmChannelConfig / NmActiveCoordinator",
    sws: "SWS_Nm_00238 · SWS_Nm_00242",
    range: "Boolean (true = Active | false = Passive Coord)",
    role: "Xác định ECU này là Active Coordinator (chủ động phát lệnh ngủ) hay Passive Coordinator (nghe theo lệnh trên bus).",
    mechanism: "Active Coordinator gọi CanNm_SetSleepReadyBit(TRUE) bật CBV Bit 3 = 1; Passive Coordinator chờ nhận callback Nm_CoordReadyToSleepIndication() từ CanNm.",
    scenarioImpact: "Chuyển qua lại trong kịch bản S11 để thấy sự khác biệt giữa Active và Passive Coordinator."
  },
  NmChannelSleepMaster: {
    title: "NmChannelSleepMaster (Ch1 Config)",
    ecucPath: "NmChannelConfig / NmChannelSleepMaster",
    sws: "SWS_Nm_00228 · ECUC_Nm_00228",
    range: "Boolean (true | false)",
    role: "Đánh dấu kênh phụ Ch1 không có node khác giữ mạng (hoặc ECU này là Master duy nhất trên nhánh Ch1).",
    mechanism: "Khi TRUE, Nm Coordinator không cần đợi callback Nm_RemoteSleepIndication(Ch1) mà chỉ cần ComM Release Ch1 là coi Ch1 sẵn sàng ngủ!",
    scenarioImpact: "Bật/tắt trên Ch1 ở S8/S9 để thấy điều kiện kết thúc pha WAIT_REMOTE_SLEEP."
  },
  NmSynchronizingNetwork: {
    title: "NmSynchronizingNetwork (Ch0 Config)",
    ecucPath: "NmChannelConfig / NmSynchronizingNetwork",
    sws: "SWS_Nm_00226 · ECUC_Nm_00229",
    range: "Boolean (true | false)",
    role: "Chỉ định nhánh Ch0 là mạng đồng bộ hóa cho quy trình Coordinated Shutdown.",
    mechanism: "Nếu TRUE, Nm Coordinator sau khi thấy đủ RemoteSleep phải chờ thêm callback Nm_SynchronizationPoint(Ch0) từ CanNm (khi CanNm phát gói NM kế tiếp) mới khởi chạy NmShutdownDelayTimer.",
    scenarioImpact: "Bật trong S9 What-If để quan sát bước đợi Nm_SynchronizationPoint() trước khi đếm ngược."
  },
  CanNmMainFunctionPeriod: {
    title: "CanNmMainFunctionPeriod",
    ecucPath: "CanNmGlobalConfig / CanNmMainFunctionPeriod",
    sws: "SWS_CanNm_00234 · ECUC_CanNm_00032",
    range: "uint16 (10 .. 500 ms, typical 100 ms)",
    role: "Chu kỳ SchM gọi CanNm_MainFunction() để cập nhật tất cả timers và phát gói NM định kỳ.",
    mechanism: "Mỗi nhịp clock giảm các bộ đếm RepeatMessageTimer, TimeoutTime, WaitBusSleepTime, RemoteSleepIndTime, MsgCycleTimer, PnResetTime.",
    scenarioImpact: "Quyết định bước nhảy thời gian của các bộ đếm CanNm."
  },
  CanNmMsgCycleTime: {
    title: "CanNmMsgCycleTime",
    ecucPath: "CanNmChannelConfig / CanNmMsgCycleTime",
    sws: "SWS_CanNm_00028 · ECUC_CanNm_00028",
    range: "uint32 (100 .. 10000 ms, typical 1000 ms)",
    role: "Chu kỳ phát bản tin NM PDU định kỳ trong trạng thái Repeat Message và Normal Operation.",
    mechanism: "Mỗi khi MsgCycleTimer chạm 0 ms, CanNm kéo User Data mới nhất và gọi CanIf_Transmit() đồng thời báo Nm_SynchronizationPoint() nếu bật.",
    scenarioImpact: "Quy luật bắt buộc AUTOSAR: CanNmTimeoutTime và CanNmRemoteSleepIndTime phải LỚN HƠN CanNmMsgCycleTime."
  },
  CanNmMsgCycleOffset: {
    title: "CanNmMsgCycleOffset",
    ecucPath: "CanNmChannelConfig / CanNmMsgCycleOffset",
    sws: "SWS_CanNm_00029 · ECUC_CanNm_00029",
    range: "uint32 (0 .. 5000 ms, typical 100 ms)",
    role: "Độ trễ lệch pha trước khi phát bản tin NM PDU đầu tiên khi thức dậy thụ động (PassiveStartUp).",
    mechanism: "Tránh việc hàng loạt ECU trên cùng bus CAN đồng loạt phát gói NM tại t = 0 ms gây nghẽn arbitration.",
    scenarioImpact: "Thử thay đổi ở kịch bản S2 để quan sát độ trễ phát gói đầu tiên sau Nm_PassiveStartUp()."
  },
  CanNmRepeatMessageTime: {
    title: "CanNmRepeatMessageTime",
    ecucPath: "CanNmChannelConfig / CanNmRepeatMessageTime",
    sws: "SWS_CanNm_00102 · ECUC_CanNm_00022",
    range: "uint32 (100 .. 10000 ms, typical 1500 ms)",
    role: "Khoảng thời gian ECU phải lưu lại trong NM_STATE_REPEAT_MESSAGE.",
    mechanism: "Khi đếm về 0 ms, CanNm tự động xóa Bit 0 (RMR=0), rời Repeat Message sang Normal Operation (nếu Network Requested) hoặc Ready Sleep (nếu Released) và gọi Nm_StateChangeNotification().",
    scenarioImpact: "Thấy rõ trong S1, S2 và S5 (tự xóa cờ RMR)."
  },
  CanNmTimeoutTime: {
    title: "CanNmTimeoutTime (NM-Timeout Timer)",
    ecucPath: "CanNmChannelConfig / CanNmTimeoutTime",
    sws: "SWS_CanNm_00096 · ECUC_CanNm_00020",
    range: "uint32 (200 .. 20000 ms, typical 2000 ms)",
    role: "Đồng hồ sinh tử của mạng CAN trong NM_MODE_NETWORK; được nạp lại mỗi khi có TxConfirmation hoặc RxIndication hợp lệ.",
    mechanism: "Khi ECU ở Ready Sleep và timer này chạm 0 ms, CanNm xóa AWB=0, chuyển sang Prepare Bus-Sleep và gọi callback Nm_PrepareBusSleepMode() lên Nm.",
    scenarioImpact: "Ảnh hưởng trực tiếp tới tốc độ đi ngủ ở S3 và timing validator nếu đặt nhỏ hơn CanNmMsgCycleTime."
  },
  CanNmWaitBusSleepTime: {
    title: "CanNmWaitBusSleepTime",
    ecucPath: "CanNmChannelConfig / CanNmWaitBusSleepTime",
    sws: "SWS_CanNm_00115 · ECUC_CanNm_00021",
    range: "uint32 (100 .. 10000 ms, typical 1500 ms)",
    role: "Thời gian đệm tại NM_MODE_PREPARE_BUS_SLEEP trước khi tắt hẳn mạng về Bus-Sleep Mode.",
    mechanism: "Khi chạm 0 ms, CanNm gọi Nm_BusSleepMode() -> ComM_Nm_BusSleepMode() để ComM ra lệnh cho CanSM tắt CAN Controller.",
    scenarioImpact: "Quan sát pha đệm an toàn ở S3 và cơ hội đánh thức khẩn cấp ở S4/S10."
  },
  CanNmMsgTimeoutTime: {
    title: "CanNmMsgTimeoutTime (Tx Timeout)",
    ecucPath: "CanNmChannelConfig / CanNmMsgTimeoutTime",
    sws: "SWS_CanNm_00064 · ECUC_CanNm_00030",
    range: "uint32 (100 .. 5000 ms, typical 500 ms)",
    role: "Thời gian chờ tối đa cho callback CanNm_TxConfirmation() sau khi gọi CanIf_Transmit().",
    mechanism: "Nếu quá hạn (do Bus-Off hoặc mất ACK), CanNm gọi đồng thời Nm_TxTimeoutException() lên Nm và CanSM_TxTimeoutException() sang CanSM.",
    scenarioImpact: "Kích hoạt trong kịch bản S14 để minh họa luồng xử lý lỗi truyền NM PDU."
  },
  CanNmNodeId: {
    title: "CanNmNodeId (Source Node ID)",
    ecucPath: "CanNmChannelConfig / CanNmNodeId",
    sws: "SWS_CanNm_00031 · ECUC_CanNm_00031",
    range: "uint8 Hex (0x00 .. 0xFE, default 0x1A)",
    role: "Mã định danh duy nhất 8-bit của ECU cục bộ trên kênh CAN.",
    mechanism: "Tự động ghi vào byte SNI của khung 8-Byte NM PDU và cộng vào CanNmBaseCanId để tạo CAN ID phát (0x500 + 0x1A = 0x51A).",
    scenarioImpact: "Đổi giá trị sẽ thấy ngay CAN ID trên Panel 1 và Byte SNI thay đổi tức thời."
  },
  CanNmBaseCanId: {
    title: "CanNmBaseCanId (NM CAN ID Base)",
    ecucPath: "CanIfTxPduCfg / CanNmTxPdu",
    sws: "OEM CAN Matrix · SWS_CanNm_00013",
    range: "Hex CAN ID (e.g. 0x500)",
    role: "Địa chỉ CAN ID nền của dải Network Management trên kênh CAN.",
    mechanism: "CAN ID thực tế phát ra bus được tính bằng BaseCanId + CanNmNodeId.",
    scenarioImpact: "Hiển thị trực tiếp trên thanh tiêu đề Khung 8-Byte NM PDU và trong Code Export."
  },
  CanNmPduNidPosition: {
    title: "CanNmPduNidPosition",
    ecucPath: "CanNmChannelConfig / CanNmPduNidPosition",
    sws: "SWS_CanNm_00074 · ECUC_CanNm_00025",
    range: "CANNM_PDU_BYTE_0 | CANNM_PDU_BYTE_1 | CANNM_PDU_OFF",
    role: "Vị trí byte chứa Source Node Identifier (SNI) trong payload 8-byte NM PDU.",
    mechanism: "Có thể đặt ở Byte 0, Byte 1 hoặc tắt (OFF) để nhường thêm 1 byte cho User Data (vì Node ID đã nằm trong CAN ID).",
    scenarioImpact: "Thử đổi ở S6 để xem Thanh Giải Phẫu 8-Byte PDU tự động hoán đổi byte SNI/CBV/UserData!"
  },
  CanNmPduCbvPosition: {
    title: "CanNmPduCbvPosition",
    ecucPath: "CanNmChannelConfig / CanNmPduCbvPosition",
    sws: "SWS_CanNm_00075 · ECUC_CanNm_00026",
    range: "CANNM_PDU_BYTE_1 | CANNM_PDU_BYTE_0 | CANNM_PDU_OFF",
    role: "Vị trí byte chứa Control Bit Vector (CBV) trong payload 8-byte NM PDU.",
    mechanism: "Không được trùng byte với CanNmPduNidPosition (nếu cả hai cùng khác OFF). Timing Validator sẽ cảnh báo ngay nếu đặt trùng!",
    scenarioImpact: "Thử hoán đổi với NidPos trong kịch bản S6."
  },
  CanNmActiveWakeupBitEnabled: {
    title: "CanNmActiveWakeupBitEnabled",
    ecucPath: "CanNmChannelConfig / CanNmActiveWakeupBitEnabled",
    sws: "SWS_CanNm_00401 · SWS_CanNm_00402",
    range: "Boolean (true | false)",
    role: "Cho phép bật Bit 4 (AWB = 1) trong CBV khi ECU thức dậy chủ động từ Bus-Sleep hoặc Prepare Bus-Sleep.",
    mechanism: "Khi Nm gọi CanNm_NetworkRequest() từ pha ngủ, AWB bật lên 1 và chỉ xóa về 0 khi rời Network Mode.",
    scenarioImpact: "Tắt ở S1 What-If để thấy Bit 4 giữ bằng 0 ngay cả khi Active Wakeup."
  },
  NmNodeIdEnabled: {
    title: "NmNodeIdEnabled & CanNmNodeIdEnabled",
    ecucPath: "NmChannelConfig / NmNodeIdEnabled",
    sws: "SWS_Nm_00036 · SWS_CanNm_00003",
    range: "Boolean (true | false)",
    role: "Cho phép truy vấn Node ID qua cặp API Nm_GetNodeIdentifier() -> CanNm_GetNodeIdentifier() và Nm_GetLocalNodeIdentifier().",
    mechanism: "Khi TRUE, CanNm lưu SNI của gói NM vừa nhận để trả về khi ứng dụng hoặc chẩn đoán hỏi thông qua Nm.",
    scenarioImpact: "Dùng trong kịch bản S6 để đọc Node ID 0x2B của Remote ECU."
  },
  NmNodeDetectionEnabled: {
    title: "NmNodeDetectionEnabled & CanNmNodeDetectionEnabled",
    ecucPath: "NmChannelConfig / NmNodeDetectionEnabled",
    sws: "SWS_Nm_00035 · SWS_CanNm_00113",
    range: "Boolean (true | false)",
    role: "Kích hoạt tính năng điểm danh toàn mạng qua Bit 0 (RMR - Repeat Message Request).",
    mechanism: "Cho phép gọi Nm_RepeatMessageRequest() -> CanNm_RepeatMessageRequest() và phản ứng khi nhận gói có Rx RMR = 1.",
    scenarioImpact: "Bật/tắt ở S5 để thấy sự khác biệt khi gọi RepeatMessageRequest hoặc nhận Rx RMR=1."
  },
  NmRemoteSleepIndEnabled: {
    title: "NmRemoteSleepIndEnabled & CanNmRemoteSleepIndEnabled",
    ecucPath: "NmGlobalFeatures / NmRemoteSleepIndEnabled",
    sws: "SWS_Nm_00149 · SWS_CanNm_00150",
    range: "Boolean (true | false)",
    role: "Bật cơ chế phát hiện các node từ xa sẵn sàng ngủ — điều kiện bắt buộc để NM Coordinator hoạt động.",
    mechanism: "Khi ở Normal Operation mà suốt CanNmRemoteSleepIndTime không nhận Rx NM từ bus, CanNm gọi Nm_RemoteSleepIndication(). Khi có node phát lại, gọi Nm_RemoteSleepCancellation().",
    scenarioImpact: "Trọng tâm của các kịch bản S8, S9, S10!"
  },
  CanNmRemoteSleepIndTime: {
    title: "CanNmRemoteSleepIndTime",
    ecucPath: "CanNmChannelConfig / CanNmRemoteSleepIndTime",
    sws: "SWS_CanNm_00150 · ECUC_CanNm_00023",
    range: "uint32 (200 .. 10000 ms, typical 1500 ms)",
    role: "Khoảng thời gian im lặng tối thiểu trên bus trước khi CanNm kết luận toàn bộ node từ xa đã vào Ready Sleep.",
    mechanism: "Bắt buộc phải LỚN HƠN CanNmMsgCycleTime để không báo nhầm RemoteSleep giữa 2 chu kỳ phát bình thường của node khác!",
    scenarioImpact: "Quan sát thanh tiến trình RemoteSleepIndTimer trong Panel 2 ở kịch bản S8/S9."
  },
  NmRepeatMsgIndEnabled: {
    title: "NmRepeatMsgIndEnabled & CanNmRepeatMsgIndEnabled",
    ecucPath: "NmGlobalFeatures / NmRepeatMsgIndEnabled",
    sws: "SWS_Nm_00230 · SWS_CanNm_00014",
    range: "Boolean (true | false)",
    role: "Cho phép CanNm gọi callback Nm_RepeatMessageIndication() lên Nm khi nhận gói tin có Bit 0 (RMR = 1).",
    mechanism: "Giúp lớp trên (Nm / ComM / BswM) biết rằng một ECU khác trên bus vừa yêu cầu điểm danh toàn mạng.",
    scenarioImpact: "Kiểm tra sự xuất hiện của callback Nm_RepeatMessageIndication() trên API Trace trong S5."
  },
  NmPduRxIndicationEnabled: {
    title: "NmPduRxIndicationEnabled & CanNmPduRxIndicationEnabled",
    ecucPath: "NmGlobalFeatures / NmPduRxIndicationEnabled",
    sws: "SWS_Nm_00097 · SWS_CanNm_00037",
    range: "Boolean (true | false)",
    role: "Cho phép CanNm gọi callback Nm_PduRxIndication() lên Nm mỗi khi nhận một gói NM PDU hợp lệ.",
    mechanism: "Hữu ích khi ứng dụng/chẩn đoán cần đếm hoặc theo dõi lưu lượng mọi bản tin NM thu được trên bus.",
    scenarioImpact: "Bật ở S2 What-If để thấy Nm_PduRxIndication() xuất hiện trong API Trace."
  },
  CanNmImmediateNmTransmissions: {
    title: "CanNmImmediateNmTransmissions",
    ecucPath: "CanNmChannelConfig / CanNmImmediateNmTransmissions",
    sws: "SWS_CanNm_00334 · ECUC_CanNm_00056",
    range: "uint8 (0 .. 10 frames, typical 3)",
    role: "Số gói NM PDU bắn chùm tốc độ cao (Immediate Burst Tx) khi thức dậy chủ động qua Nm_NetworkRequest().",
    mechanism: "Đặt = 0 sẽ tắt bắn chùm và dùng chu kỳ chuẩn (CanNmMsgCycleTime / Offset).",
    scenarioImpact: "Thử đặt về 0 trong S1 What-If để so sánh hành vi khởi động."
  },
  CanNmImmediateNmCycleTime: {
    title: "CanNmImmediateNmCycleTime",
    ecucPath: "CanNmChannelConfig / CanNmImmediateNmCycleTime",
    sws: "SWS_CanNm_00334 · ECUC_CanNm_00057",
    range: "uint32 (50 .. 1000 ms, typical 100 ms)",
    role: "Khoảng cách thời gian cực ngắn giữa các gói trong chùm Immediate Burst Tx.",
    mechanism: "Giúp đánh thức nhanh toàn bộ các ECU và Gateway trên nhánh CAN trong vòng 200-300 ms đầu.",
    scenarioImpact: "Điều chỉnh nhịp bắn burst khi Active Wakeup."
  },
  CanNmImmediateRestartEnabled: {
    title: "CanNmImmediateRestartEnabled",
    ecucPath: "CanNmGlobalConfig / CanNmImmediateRestartEnabled",
    sws: "SWS_CanNm_00122 · ECUC_CanNm_00008",
    range: "Boolean (true | false)",
    role: "Phát ngay lập tức 1 gói NM PDU tại t=0ms nếu có Nm_NetworkRequest() đúng lúc đang ở Prepare Bus-Sleep.",
    mechanism: "Kéo toàn bộ các node khác trên bus kịp thời quay lại Network Mode trước khi WaitBusSleepTimer của chúng hết hạn.",
    scenarioImpact: "Bảo vệ mạng không bị rớt ngủ lệch pha khi đánh thức khẩn cấp."
  },
  NmBusLoadReductionEnabled: {
    title: "NmBusLoadReductionEnabled & CanNmBusLoadReductionEnabled",
    ecucPath: "NmGlobalFeatures / NmBusLoadReductionEnabled",
    sws: "SWS_Nm_00203 · SWS_CanNm_00052",
    range: "Boolean (true | false)",
    role: "Bật cơ chế giảm tải khung NM trên CAN Bus khi đang ở Normal Operation.",
    mechanism: "Khi nhận gói NM từ node khác, CanNm nạp lại MsgCycleTimer về CanNmMsgCycleTime; khi tự phát xong nạp về CanNmMsgReducedTime.",
    scenarioImpact: "Giúp chỉ 2 node có thời gian ngắn nhất luân phiên giữ mạng."
  },
  CanNmMsgReducedTime: {
    title: "CanNmMsgReducedTime",
    ecucPath: "CanNmChannelConfig / CanNmMsgReducedTime",
    sws: "SWS_CanNm_00069 · ECUC_CanNm_00027",
    range: "uint32 (100 .. 5000 ms, typical 600 ms)",
    role: "Chu kỳ phát rút gọn áp dụng sau khi tự phát xong trong chế độ Bus Load Reduction.",
    mechanism: "Bắt buộc nằm trong khoảng (0.5 * MsgCycleTime) .. MsgCycleTime.",
    scenarioImpact: "Kết hợp cùng NmBusLoadReductionEnabled để điều chỉnh mật độ phát."
  },
  CanNmPnEnabled: {
    title: "CanNmPnEnabled (Partial Networking)",
    ecucPath: "CanNmChannelConfig / CanNmPnEnabled",
    sws: "SWS_CanNm_00409 · SWS_CanNm_00413",
    range: "Boolean (true | false)",
    role: "Kích hoạt Partial Networking trên kênh CanNm: bật Bit 6 (PNI = 1) và bộ lọc mặt nạ PNC.",
    mechanism: "CanNm chỉ giữ mạng thức và cập nhật EIRA/ERA với các gói NM có bit trùng với CanNmPnFilterMaskByte (sau khi CanSM gọi CanNm_ConfirmPnAvailability).",
    scenarioImpact: "Trọng tâm kịch bản S12 & S13."
  },
  CanNmPnFilterMaskHex: {
    title: "CanNmPnFilterMaskByte (Hex)",
    ecucPath: "CanNmPnInfo / CanNmPnFilterMaskByte",
    sws: "SWS_CanNm_00409 · ECUC_CanNm_00065",
    range: "2 Hex Bytes (VD: 05 00 = PNC #16 & #18)",
    role: "Mặt nạ bit các cụm mạng con (PNC) mà ECU này quan tâm.",
    mechanism: "Byte 0 (0x01) = PNC #16, Bit 2 (0x04) = PNC #18. Gói Rx có (RxPNI & Mask) == 0 sẽ bị lọc bỏ!",
    scenarioImpact: "Thử thay đổi Mask trong S12 để lọc chọn lọc các gói từ Node 0x2B."
  },
  CanNmPnResetTime: {
    title: "CanNmPnResetTime (ERA/EIRA Timer)",
    ecucPath: "CanNmGlobalConfig / CanNmPnResetTime",
    sws: "SWS_CanNm_00431 · ECUC_CanNm_00064",
    range: "uint32 (200 .. 10000 ms, typical 1500 ms)",
    role: "Bộ đếm thời gian giữ bit PNC = 1 trong mảng EIRA / ERA trước khi xóa về 0 nếu không còn node nào yêu cầu.",
    mechanism: "Mỗi khi phát hoặc nhận gói NM có PNC = 1, timer được nạp lại. Khi hết hạn về 0, CanNm xóa bit và báo lên ComM qua PduR_CanNmRxIndication().",
    scenarioImpact: "Quan sát đếm ngược PnResetTimer trong S12."
  },
  NmSynchronizedPncShutdownEnabled: {
    title: "Nm & CanNmSynchronizedPncShutdownEnabled",
    ecucPath: "NmGlobalFeatures / NmSynchronizedPncShutdownEnabled",
    sws: "SWS_Nm_91009 · SWS_CanNm_91003 (R20-11+)",
    range: "Boolean (true | false)",
    role: "Cho phép quy trình tắt đồng bộ cụm PNC 2 chiều giữa ComM, Nm và CanNm.",
    mechanism: "Chiều xuống: ComM -> Nm_RequestSynchronizedPncShutdown -> CanNm (bật Bit 5 PNSR=1). Chiều lên: CanNm nhận PNSR=1 -> Nm_ForwardSynchronizedPncShutdown -> ComM.",
    scenarioImpact: "Trọng tâm kịch bản S13 (Synchronized PNC Shutdown R22-11/R23-11)."
  },
  NmComUserDataSupport: {
    title: "NmComUserDataSupport & CanNmComUserDataSupport",
    ecucPath: "NmGlobalFeatures / NmComUserDataSupport",
    sws: "SWS_Nm_00215 · SWS_CanNm_00328",
    range: "Boolean (true | false)",
    role: "Cho phép CanNm tự động kéo User Data (bao gồm tín hiệu NmStateReport) từ AUTOSAR COM qua PduR_CanNmTriggerTransmit().",
    mechanism: "Khi TRUE, ứng dụng ghi Signal qua COM (hoặc Nm ghi NMS) và CanNm tự kéo khi phát; hàm thủ công Nm_SetUserData() không khả dụng (SWS_CanNm_00327).",
    scenarioImpact: "So sánh trực tiếp 2 chế độ truyền User Data trong S4 và S6."
  },
  UserDataBytesHex: {
    title: "UserDataBytesHex (COM / SetUserData)",
    ecucPath: "COM Signal / CanNmUserDataTxPdu",
    sws: "SWS_CanNm_00159 · SWS_CanNm_00328",
    range: "Up to 6 Hex Bytes (VD: 11 22 33 44 55 66)",
    role: "Nội dung các byte User Data của ứng dụng nằm trong khung 8-Byte CanNm PDU.",
    mechanism: "Nếu bật NmStateReportEnabled, Byte 4 tự động được ghi đè bằng mã 6-bit NMS từ Nm -> Com_SendSignal(); các byte khác giữ dữ liệu ứng dụng.",
    scenarioImpact: "Hiển thị trực tiếp trên Khung 8-Byte PDU ở Panel 1."
  },
  NmCarWakeUpRxEnabled: {
    title: "NmCarWakeUpRxEnabled & CanNmCarWakeUpRxEnabled",
    ecucPath: "NmChannelConfig / NmCarWakeUpRxEnabled",
    sws: "SWS_Nm_00250 · SWS_CanNm_00406",
    range: "Boolean (true | false)",
    role: "Cho phép CanNm phát hiện bit Car WakeUp (CBV Bit 3 = 1) trong gói NM nhận được và báo lên Nm -> BswM.",
    mechanism: "Khi hợp lệ, CanNm gọi Nm_CarWakeUpIndication(Handle) và Nm gọi ngay BswM_Nm_CarWakeUpIndication(Handle) để đánh thức toàn bộ kiến trúc điện trên xe.",
    scenarioImpact: "Trọng tâm kịch bản S7."
  },
  CanNmCarWakeUpFilterEnabled: {
    title: "CanNmCarWakeUpFilterEnabled",
    ecucPath: "CanNmChannelConfig / CanNmCarWakeUpFilterEnabled",
    sws: "SWS_CanNm_00408 · ECUC_CanNm_00075",
    range: "Boolean (true | false)",
    role: "Lọc gói Car WakeUp theo Node ID nguồn (CanNmCarWakeUpFilterNodeId).",
    mechanism: "Khi TRUE, chỉ gói tin có SNI == CanNmCarWakeUpFilterNodeId mới được phép kích hoạt Nm_CarWakeUpIndication().",
    scenarioImpact: "Thử bắn gói từ Node 0x99 vs 0x2B trong S7 để kiểm chứng bộ lọc."
  },
  CanNmCarWakeUpFilterNodeId: {
    title: "CanNmCarWakeUpFilterNodeId",
    ecucPath: "CanNmChannelConfig / CanNmCarWakeUpFilterNodeId",
    sws: "SWS_CanNm_00408 · ECUC_CanNm_00076",
    range: "uint8 Hex (default 0x2B)",
    role: "Node ID duy nhất được cấp quyền phát tín hiệu Car WakeUp đánh thức toàn xe.",
    mechanism: "So sánh với byte SNI (hoặc CAN ID) của gói NM nhận được tại CanNm_RxIndication().",
    scenarioImpact: "Đổi giá trị này ở S7 để kiểm thử chấp nhận/từ chối Node 0x2B."
  },
  NmComControlEnabled: {
    title: "NmComControlEnabled & CanNmComControlEnabled",
    ecucPath: "NmGlobalFeatures / NmComControlEnabled",
    sws: "SWS_Nm_00033 · SWS_CanNm_00170",
    range: "Boolean (true | false)",
    role: "Kích hoạt cặp API Nm_DisableCommunication() / Nm_EnableCommunication() phục vụ UDS 0x28.",
    mechanism: "Chuyển tiếp từ Dcm/BswM -> Nm -> CanNm để khóa phát NM PDU và đóng băng NM-Timeout Timer khi nạp Flash Bootloader.",
    scenarioImpact: "Trọng tâm kịch bản S14 (UDS 0x28 CommunicationControl)."
  }
};

const MODULES_INFO = {
  MOD_SWC: {
    id: "MOD_SWC",
    name: "SWC_App, SWC_Diag & SWC_CarWakeup",
    layer: "Application Layer",
    role: "Ứng dụng tầng trên yêu cầu dịch vụ truyền thông và kích hoạt các chức năng chẩn đoán/điểm danh mạng.",
    inputs: "Sự kiện xe (khóa điện IG_ON, mở cửa, sạc pin), phản hồi Mode từ RTE và dữ liệu NMS / User Data từ AUTOSAR COM.",
    processing: "SWC_App yêu cầu FULL_COM/NO_COM qua cổng UR_ComMUser; SWC_Diag gọi Nm_RepeatMessageRequest() để điểm danh hoặc đọc Nm_GetNodeIdentifier() / Nm_GetState(); SWC cập nhật tín hiệu User Data vào COM qua Rte_Write().",
    outputs: "Gọi xuống ComM qua RTE (Rte_Call_UR_ComMUser_RequestComMode) và ghi dữ liệu/điểm danh tới COM/Nm.",
    apis: [
      "Rte_Call_UR_ComMUser_0_RequestComMode(COMM_FULL_COMMUNICATION)",
      "Nm_RepeatMessageRequest(NetworkHandle)",
      "Nm_GetNodeIdentifier(NetworkHandle, &nmNodeIdPtr)",
      "Nm_GetState(NetworkHandle, &nmStatePtr, &nmModePtr)",
      "Rte_Write_PP_NmUserData_Signal(val)"
    ]
  },
  MOD_RTE: {
    id: "MOD_RTE",
    name: "RTE & SchM (BSW Scheduler)",
    layer: "Runtime Environment & OS Task",
    role: "Cầu nối thực thi giữa SWC và BSW, đồng thời cung cấp nhịp đồng hồ định kỳ cho cả Nm và CanNm.",
    inputs: "Lời gọi Rte_Call/Rte_Write từ SWC và xung nhịp định kỳ từ AUTOSAR OS (Task_Bsw_100ms).",
    processing: "Gọi tuần tự Nm_MainFunction() (xử lý NM Coordinator & NmShutdownDelayTimer) và CanNm_MainFunction() (xử lý State Machine & các bộ đếm CanNm), đồng thời bảo vệ vùng găng (ExclusiveArea) chống xung đột ngắt Rx/Tx.",
    outputs: "Kích hoạt Nm_MainFunction() và CanNm_MainFunction() theo đúng chu kỳ cấu hình.",
    apis: [
      "Nm_MainFunction() [SWS_Nm_00118]",
      "CanNm_MainFunction() [SWS_CanNm_00234]",
      "SchM_Enter_Nm_EA_0() / SchM_Exit_Nm_EA_0()",
      "SchM_Enter_CanNm_EA_0() / SchM_Exit_CanNm_EA_0()"
    ]
  },
  MOD_COMM: {
    id: "MOD_COMM",
    name: "ComM, BswM & Dcm",
    layer: "System / Communication Services",
    role: "Nhạc trưởng phân xử yêu cầu từ các User và giao tiếp ĐỘC QUYỀN với lớp Nm (không gọi trực tiếp CanNm).",
    inputs: "Yêu cầu từ SWC Users, lệnh UDS 0x28 từ Dcm, và toàn bộ các callbacks báo trạng thái từ Nm (ComM_Nm_*, BswM_Nm_*).",
    processing: "Khi cần bật mạng, ComM gọi Nm_NetworkRequest() (chủ động) hoặc Nm_PassiveStartUp() (thụ động). Khi tất cả User nhả mạng, ComM gọi Nm_NetworkRelease() nhưng vẫn giữ CanSM ở FULL_COM cho đến khi Nm báo ComM_Nm_BusSleepMode(). Dcm/BswM gọi Nm_DisableCommunication() khi chạy UDS 0x28.",
    outputs: "Gửi lệnh điều khiển xuống Nm (Nm.h) và nhận lại thông báo trạng thái từ Nm.",
    apis: [
      "Nm_NetworkRequest(NetworkHandle) [SWS_Nm_00031]",
      "Nm_NetworkRelease(NetworkHandle) [SWS_Nm_00032]",
      "Nm_PassiveStartUp(NetworkHandle) [SWS_Nm_00030]",
      "Nm_DisableCommunication() / Nm_EnableCommunication()",
      "Nm_RequestSynchronizedPncShutdown(NetworkHandle, PncId)"
    ]
  },
  MOD_NM: {
    id: "MOD_NM",
    name: "Nm (Generic Network Management Interface & NM Coordinator)",
    layer: "Communication Services (ModuleId = 29 / 0x1D)",
    role: "Tâm điểm tầng trên: (1) Trừu tượng hóa Bus vật lý cho ComM, (2) Báo cáo NmStateReport qua COM, và (3) Điều phối ngủ/thức đồng bộ cụm đa kênh NM Coordinator.",
    inputs: "Lệnh Nm_* từ ComM/BswM/SWC và toàn bộ callbacks Nm_* từ CanNm (Nm_RemoteSleepIndication, Nm_RemoteSleepCancellation, Nm_StateChangeNotification, Nm_SynchronizationPoint, Nm_CoordReadyToSleepIndication, Nm_CarWakeUpIndication...).",
    processing: "• Dispatcher 1-1 xuống CanNm theo NmBusType.\n• NmStateReport: Khi nhận Nm_StateChangeNotification(), mã hóa 6-bit NMS và gọi Com_SendSignal().\n• NM Coordinator: Giữ toàn bộ Ch0 & Ch1 trong Cluster thức cho tới khi đủ Release + RemoteSleep, gọi CanNm_SetSleepReadyBit(TRUE), đếm NmShutdownDelayTimer rồi mới gọi CanNm_NetworkRelease() đồng loạt (hỗ trợ Abort Shutdown nếu nhận RemoteSleepCancellation!).",
    outputs: "Gọi xuống CanNm_* (CanNm.h), ghi tín hiệu NMS xuống COM (Com_SendSignal) và báo callbacks ngược lên ComM / BswM.",
    apis: [
      "CanNm_NetworkRequest() / CanNm_NetworkRelease() / CanNm_PassiveStartUp()",
      "CanNm_SetSleepReadyBit(nmChannelHandle, nmSleepReadyBit) [SWS_Nm_00238]",
      "Com_SendSignal(NmStateReportSignalRef, &nmsVal) [SWS_Nm_00154]",
      "ComM_Nm_NetworkStartIndication / NetworkMode / PrepareBusSleepMode / BusSleepMode",
      "BswM_Nm_StateChangeNotification() / BswM_Nm_CarWakeUpIndication()"
    ]
  },
  MOD_CANNM: {
    id: "MOD_CANNM",
    name: "CanNm Engine (CAN Network Management — Ch0 & Ch1)",
    layer: "Communication Services (ModuleId = 31 / 0x1F)",
    role: "Động cơ thực thi nghi thức mạng phân tán trực tiếp trên đường truyền CAN Bus thông qua Khung 8-Byte NM PDU và thanh ghi CBV.",
    inputs: "Lệnh từ Nm (NetworkRequest, NetworkRelease, PassiveStartUp, SetSleepReadyBit, RepeatMessageRequest...), CanNm_ConfirmPnAvailability từ CanSM, và Rx/Tx callbacks từ CanIf.",
    processing: "Vận hành Máy Trạng Thái 2 cấp (Bus-Sleep, Prepare Bus-Sleep, Network Mode: Repeat Message / Normal Operation / Ready Sleep); quản lý 5 timers CanNm + RemoteSleepIndTimer; đóng gói 8-Byte PDU (SNI, CBV, PNI, User Data); lọc Partial Networking & tính ERA/EIRA.",
    outputs: "Gọi CanIf_Transmit() xuống CAN Bus, kéo UserData từ PduR_CanNmTriggerTransmit(), báo ERA/EIRA qua PduR_CanNmRxIndication(), và đẩy 15+ callbacks lên Nm (Nm_Cbk.h).",
    apis: [
      "CanIf_Transmit(CanNmTxPduId, &PduInfo) [SWS_CanNm_00032]",
      "PduR_CanNmTriggerTransmit() / PduR_CanNmRxIndication()",
      "Nm_RemoteSleepIndication() / Nm_RemoteSleepCancellation()",
      "Nm_StateChangeNotification() / Nm_SynchronizationPoint()",
      "Nm_CoordReadyToSleepIndication() / Nm_CarWakeUpIndication() / Nm_TxTimeoutException()"
    ]
  },
  MOD_COM: {
    id: "MOD_COM",
    name: "AUTOSAR COM & PduR (PDU Router)",
    layer: "Communication Services",
    role: "Cầu nối khép kín luân chuyển tín hiệu NmStateReport (NMS), NM User Data và vector EIRA/ERA giữa Nm, CanNm và ComM.",
    inputs: "Com_SendSignal(NmStateReportSignalRef) từ Nm; PduR_CanNmTriggerTransmit() và PduR_CanNmRxIndication() từ CanNm.",
    processing: "Lưu giá trị byte NMS (và User Data từ SWC) vào I-PDU buffer để CanNm kéo xuống đúng thời điểm phát frame (TriggerTransmit); định tuyến vector ERA/EIRA nhận từ CanNm lên ComM qua Com_RxIndication().",
    outputs: "Cung cấp 8-Byte payload dữ liệu UserData/NMS cho CanNm và đẩy tín hiệu EIRA/ERA lên ComM.",
    apis: [
      "Com_SendSignal(NmStateReportSignalRef, &nmsVal)",
      "PduR_CanNmTriggerTransmit(TxPduId, &PduInfo) -> Com_TriggerTransmit()",
      "PduR_CanNmRxIndication(RxPduId, &PduInfo) -> Com_RxIndication()"
    ]
  },
  MOD_CANSM: {
    id: "MOD_CANSM",
    name: "CanSM (CAN State Manager)",
    layer: "Communication Services",
    role: "Quản lý trạng thái phần cứng CAN Controller/Transceiver, xác nhận Partial Networking cho CanNm và xử lý phục hồi Bus-Off.",
    inputs: "CanSM_RequestComMode() từ ComM và CanSM_TxTimeoutException() từ CanNm.",
    processing: "Bật CAN Controller & CanTrcv; khi vào FULLCOM trên kênh PN gọi CanNm_ConfirmPnAvailability() mở khóa bộ lọc PN trong CanNm; khi nhận CanSM_TxTimeoutException() sẽ kích hoạt khởi động lại Controller để khôi phục đường truyền.",
    outputs: "Gọi CanNm_ConfirmPnAvailability() vào CanNm và điều khiển CanIf_SetControllerMode / CanIf_SetPduMode.",
    apis: [
      "CanNm_ConfirmPnAvailability(nmChannelHandle) [SWS_CanNm_00404]",
      "CanSM_TxTimeoutException(network) [SWS_CanNm_00066]",
      "CanIf_SetPduMode(ControllerId, CANIF_ONLINE)"
    ]
  },
  MOD_CANIF: {
    id: "MOD_CANIF",
    name: "CanIf (CAN Interface)",
    layer: "ECU Abstraction Layer",
    role: "Cổng truyền nhận khung CAN trừu tượng giữa CanNm và phần cứng CanDrv.",
    inputs: "Yêu cầu CanIf_Transmit() từ CanNm và ngắt Rx/Tx phần cứng từ CanDrv.",
    processing: "Kiểm tra PduMode (CANIF_ONLINE), lọc dải CAN ID của NM (0x500..0x57F), chuyển tiếp khung NM nhận được từ bus lên CanNm_RxIndication() và báo xác nhận đã phát qua CanNm_TxConfirmation().",
    outputs: "Gọi CanNm_RxIndication() & CanNm_TxConfirmation() lên CanNm và gọi Can_Write() xuống CanDrv.",
    apis: [
      "CanNm_RxIndication(RxPduId, &PduInfo) [SWS_CanNm_00035]",
      "CanNm_TxConfirmation(TxPduId, E_OK) [SWS_CanNm_00037]",
      "Can_Write(Hth, &CanPdu)"
    ]
  },
  MOD_HW: {
    id: "MOD_HW",
    name: "CanDrv / CanTrcv & CAN Bus (Node 0x2B)",
    layer: "MCAL & Transceiver Hardware",
    role: "Tầng vật lý truyền/nhận điện áp vi sai CAN_H/CAN_L và giải mã Wake-Up Frame (WUF ISO 11898-6).",
    inputs: "Lệnh Can_Write từ CanIf và gói NM PDU từ các ECU khác trên xe (ví dụ Remote ECU Node #2 = 0x2B).",
    processing: "Transceiver hỗ trợ PN khi ngủ ở STANDBY vẫn lắng nghe bit PNI=1 & PNC Mask trên bus; khi phát hiện WUF hợp lệ sẽ tạo xung đánh thức toàn ECU.",
    outputs: "Gửi ngắt Rx/Tx lên CanIf và truyền 8-Byte NM PDU vật lý trên dây CAN.",
    apis: [
      "CanIf_RxIndication(Mailbox, PduInfo)",
      "CanIf_TxConfirmation(CanTxPduId)",
      "EcuM_CheckWakeup(WakeupSource)"
    ]
  },
  MOD_DET: {
    id: "MOD_DET",
    name: "DET (Default Error Tracer)",
    layer: "System / Diagnostic Services",
    role: "Ghi nhận các lỗi lập trình (Development Error) và lỗi vận hành (Runtime Error) từ cả Nm (ModuleId 29) và CanNm (ModuleId 31).",
    inputs: "Det_ReportError() và Det_ReportRuntimeError() từ Nm và CanNm.",
    processing: "Phân tách rõ nguồn lỗi từ Nm (NM_E_UNINIT=0x00, NM_E_INVALID_CHANNEL=0x01, NM_E_PARAM_POINTER=0x02) và từ CanNm (CANNM_E_UNINIT=0x01, CANNM_E_NET_START_IND=0x04...).",
    outputs: "Lưu vào bảng DET Faults và hiển thị trực tiếp trên Inspector & API Trace.",
    apis: [
      "Det_ReportError(29, 0, ApiId, NM_E_UNINIT)",
      "Det_ReportError(31, 0, ApiId, CANNM_E_UNINIT)",
      "Det_ReportRuntimeError(31, 0, RxInd, CANNM_E_NET_START_IND)"
    ]
  }
};

const ABBREVIATIONS = [
  // Category: NM_COORD (14)
  { abbr: "Nm", full: "Generic Network Management Interface", cat: "NM_COORD", desc: "Module BSW tầng Communication Services (ModuleId=29) cung cấp giao diện trừu tượng hóa bus vật lý cho ComM và chứa thuật toán NM Coordinator (SWS_Nm)." },
  { abbr: "NM Coord", full: "Network Management Coordinator", cat: "NM_COORD", desc: "Chức năng bên trong module Nm điều phối việc thức và ngủ đồng bộ giữa nhiều kênh mạng thuộc cùng một cụm NmCoordCluster trên ECU Gateway." },
  { abbr: "NmCoordCluster", full: "NM Coordinator Cluster", cat: "NM_COORD", desc: "Nhóm các kênh NmChannel (ví dụ Ch0 CAN_Body & Ch1 CAN_SubNet) được gắn cùng chỉ số NmCoordClusterIndex để đóng/mở đồng bộ (SWS_Nm_00232)." },
  { abbr: "Active Coord", full: "Active Coordinator (NmActiveCoordinator = TRUE)", cat: "NM_COORD", desc: "Vai trò Coordinator chủ động điều khiển cụm mạng, phát bit SRB=1 qua CanNm_SetSleepReadyBit(TRUE) và đếm NmShutdownDelayTimer trước khi Release." },
  { abbr: "Passive Coord", full: "Passive / Subordinate Coordinator", cat: "NM_COORD", desc: "Vai trò Coordinator thụ động (NmActiveCoordinator = FALSE), chờ nhận callback Nm_CoordReadyToSleepIndication() từ Active Coordinator trên bus (SWS_Nm_00242)." },
  { abbr: "SleepMaster", full: "NmChannelSleepMaster", cat: "NM_COORD", desc: "Cờ cấu hình chỉ định ECU này là chủ duy nhất trên nhánh mạng đó; Nm Coordinator không cần đợi Nm_RemoteSleepIndication() trên kênh này (SWS_Nm_00228)." },
  { abbr: "SyncNet", full: "NmSynchronizingNetwork", cat: "NM_COORD", desc: "Cấu hình buộc Nm Coordinator phải đợi callback Nm_SynchronizationPoint() từ CanNm rồi mới được khởi chạy NmShutdownDelayTimer (SWS_Nm_00226)." },
  { abbr: "ShdnDelayTmr", full: "NmShutdownDelayTimer", cat: "NM_COORD", desc: "Bộ đếm thời gian trễ trong Nm_MainFunction() (tính từ NmGlobalCoordinatorTime) trước khi gọi CanNm_NetworkRelease() đồng loạt xuống Cluster." },
  { abbr: "RSI", full: "Remote Sleep Indication (Nm_RemoteSleepIndication)", cat: "NM_COORD", desc: "Callback từ CanNm báo lên Nm khi toàn bộ các node khác trên nhánh CAN đã ngừng phát NM PDU đủ thời gian CanNmRemoteSleepIndTime (SWS_CanNm_00150)." },
  { abbr: "RSC", full: "Remote Sleep Cancellation (Nm_RemoteSleepCancellation)", cat: "NM_COORD", desc: "Callback từ CanNm báo lên Nm khi có node thức dậy phát lại NM PDU; là tín hiệu kích hoạt Abort Coordinated Shutdown (SWS_Nm_00180)." },
  { abbr: "Abort Shdn", full: "Abort Coordinated Shutdown", cat: "NM_COORD", desc: "Cơ chế hủy khẩn cấp quy trình tắt Cluster khi đang đếm NmShutdownDelayTimer: dừng timer, gọi CanNm_SetSleepReadyBit(FALSE) và CanNm_NetworkRequest() lại." },
  { abbr: "NMS", full: "Network Management State Report Signal", cat: "NM_COORD", desc: "Tín hiệu 6-bit do module Nm tự động ghi xuống AUTOSAR COM (Com_SendSignal) mỗi khi nhận Nm_StateChangeNotification() từ CanNm (SWS_Nm_00154)." },
  { abbr: "BusNm", full: "Bus-Specific Network Management", cat: "NM_COORD", desc: "Tên gọi chung cho các module NM phụ thuộc phần cứng bus bên dưới Nm (CanNm, FrNm, UdpNm, LinNm) được chọn qua NmBusType." },
  { abbr: "SyncPoint", full: "Nm_SynchronizationPoint()", cat: "NM_COORD", desc: "Callback từ CanNm báo lên Nm tại thời điểm phát một bản tin NM PDU mới trên mạng đồng bộ hóa, giúp căn chỉnh mốc tắt cụm Cluster." },

  // Category: CANNM (13)
  { abbr: "CanNm", full: "CAN Network Management", cat: "CANNM", desc: "Module BSW (ModuleId=31) thực thi giao thức quản lý mạng phân tán trực tiếp trên CAN Bus, quản lý 3 Modes, 3+1 Sub-states và khung 8-Byte PDU (SWS_CanNm)." },
  { abbr: "NM PDU", full: "Network Management Protocol Data Unit", cat: "CANNM", desc: "Khung CAN 8-byte truyền định kỳ trên bus (ID = BaseId + NodeId) mang SNI, CBV, PNI Mask, NMS Report và User Data để duy trì sự tỉnh táo của mạng." },
  { abbr: "RMS", full: "Repeat Message State (NM_STATE_REPEAT_MESSAGE)", cat: "CANNM", desc: "Trạng thái con đầu tiên khi vào Network Mode: phát bản tin NM liên tục trong CanNmRepeatMessageTime để thông báo sự hiện diện trên bus." },
  { abbr: "NOS", full: "Normal Operation State (NM_STATE_NORMAL_OPERATION)", cat: "CANNM", desc: "Trạng thái con khi ứng dụng đang giữ mạng (CanNm_NetworkRequest): phát NM PDU định kỳ mỗi CanNmMsgCycleTime và chạy RemoteSleepIndTimer." },
  { abbr: "RSS", full: "Ready Sleep State (NM_STATE_READY_SLEEP)", cat: "CANNM", desc: "Trạng thái con khi đã nhả mạng (CanNm_NetworkRelease): NGƯNG phát gói NM PDU, chỉ lắng nghe bus chờ NM-Timeout Timer hết hạn." },
  { abbr: "PBSM", full: "Prepare Bus-Sleep Mode (NM_MODE_PREPARE_BUS_SLEEP)", cat: "CANNM", desc: "Chế độ đệm an toàn chờ WaitBusSleepTimer đếm về 0 trước khi tắt phần cứng; gọi Nm_PrepareBusSleepMode() và xóa cờ AWB=0." },
  { abbr: "BSM", full: "Bus-Sleep Mode (NM_MODE_BUS_SLEEP)", cat: "CANNM", desc: "Chế độ ngủ hoàn toàn; CanNm gọi Nm_BusSleepMode() -> ComM_Nm_BusSleepMode() để ComM ra lệnh tắt CAN Controller/Transceiver." },
  { abbr: "Active Wakeup", full: "Active Network Wakeup", cat: "CANNM", desc: "Thức dậy chủ động do ứng dụng gọi Nm_NetworkRequest() -> CanNm_NetworkRequest(): bật AWB=1, bắn chùm Burst Tx và rẽ sang Normal Operation." },
  { abbr: "Passive Wakeup", full: "Passive Network Wakeup", cat: "CANNM", desc: "Thức dậy thụ động do nhận khung NM từ node khác: CanNm báo Nm_NetworkStartIndication() -> ComM gọi Nm_PassiveStartUp() (giữ AWB=0, rẽ sang Ready Sleep)." },
  { abbr: "Burst Tx", full: "Immediate Burst Transmission", cat: "CANNM", desc: "Chế độ bắn liên tiếp N gói NM PDU tốc độ cao (CanNmImmediateNmTransmissions x CanNmImmediateNmCycleTime) ngay khi Active Wakeup (SWS_CanNm_00334)." },
  { abbr: "ImmRestart", full: "CanNmImmediateRestartEnabled", cat: "CANNM", desc: "Tính năng bắn ngay 1 gói NM PDU tại t=0ms khi nhận CanNm_NetworkRequest() đúng lúc đang ở Prepare Bus-Sleep Mode (SWS_CanNm_00122)." },
  { abbr: "BusLoadRed", full: "CanNmBusLoadReductionEnabled", cat: "CANNM", desc: "Cơ chế giảm tải đường truyền CAN trong Normal Operation bằng cách đặt lại chu kỳ phát về MsgCycleTime mỗi khi nhận gói NM từ node khác (SWS_CanNm_00052)." },
  { abbr: "TxTimeout", full: "Nm_TxTimeoutException / CanSM_TxTimeoutException", cat: "CANNM", desc: "Cảnh báo từ CanNm lên Nm và CanSM khi gói NM PDU đã gọi CanIf_Transmit() nhưng không nhận được TxConfirmation trong CanNmMsgTimeoutTime (SWS_CanNm_00066)." },

  // Category: CBV_TMR (13)
  { abbr: "CBV", full: "Control Bit Vector", cat: "CBV_TMR", desc: "Byte điều khiển 8-bit trong gói CanNm PDU (thường ở Byte 1) chứa các cờ phối hợp mạng: Bit 0 (RMR), Bit 3 (SRB/CWU), Bit 4 (AWB), Bit 5 (PNSR), Bit 6 (PNI)." },
  { abbr: "SNI / NID", full: "Source Node Identifier", cat: "CBV_TMR", desc: "Mã định danh 8-bit của ECU phát bản tin NM (thường đặt ở Byte 0, cấu hình qua CanNmNodeId). Đọc qua Nm_GetNodeIdentifier()." },
  { abbr: "RMR", full: "Repeat Message Request Bit (CBV Bit 0)", cat: "CBV_TMR", desc: "Bit 0 (0x01) của CBV. Bật = 1 khi gọi Nm_RepeatMessageRequest() để ép mọi ECU trên bus nhảy về Repeat Message State điểm danh." },
  { abbr: "SRB / CSR", full: "CoordReadyToSleepBit / Sleep Ready Bit (CBV Bit 3)", cat: "CBV_TMR", desc: "Bit 3 (0x08) của CBV. Được Nm Coordinator bật = 1 qua CanNm_SetSleepReadyBit(TRUE) báo cụm sắp tắt; đầu nhận gọi Nm_CoordReadyToSleepIndication()." },
  { abbr: "CWU", full: "Car WakeUp Bit (Bit 3 / User Data)", cat: "CBV_TMR", desc: "Bit yêu cầu đánh thức liên mạng toàn xe. Khi nhận và qua bộ lọc CanNmCarWakeUpFilterNodeId, CanNm gọi Nm_CarWakeUpIndication() -> BswM (SWS_Nm_00250)." },
  { abbr: "AWB", full: "Active Wakeup Bit (CBV Bit 4)", cat: "CBV_TMR", desc: "Bit 4 (0x10) của CBV. Bật = 1 khi thức dậy chủ động qua NetworkRequest, giữ nguyên suốt Network Mode và chỉ xóa về 0 khi sang Prepare Bus-Sleep." },
  { abbr: "MsgCycleTmr", full: "CanNmMsgCycleTime & Offset", cat: "CBV_TMR", desc: "Bộ đếm điều khiển chu kỳ phát bản tin NM định kỳ (1000ms) và độ trễ lệch pha gói đầu tiên khi khởi động thụ động (MsgCycleOffset = 100ms)." },
  { abbr: "RptMsgTmr", full: "CanNmRepeatMessageTime", cat: "CBV_TMR", desc: "Bộ đếm thời gian duy trì trạng thái Repeat Message State (1500ms); hết hạn sẽ tự động xóa Bit 0 RMR = 0 và chuyển sang Normal/Ready Sleep." },
  { abbr: "TimeoutTmr", full: "CanNmTimeoutTime (NM-Timeout Timer)", cat: "CBV_TMR", desc: "Bộ đếm sinh tử (2000ms) nạp lại khi có bất kỳ gói NM Tx/Rx hợp lệ nào; hết hạn tại Ready Sleep sẽ đẩy node vào Prepare Bus-Sleep Mode." },
  { abbr: "WaitSlpTmr", full: "CanNmWaitBusSleepTime", cat: "CBV_TMR", desc: "Bộ đếm thời gian đệm (1500ms) tại Prepare Bus-Sleep Mode; hết hạn mới thực sự gọi Nm_BusSleepMode() tắt mạng." },
  { abbr: "RemSlpTmr", full: "CanNmRemoteSleepIndTime", cat: "CBV_TMR", desc: "Bộ đếm phát hiện các node từ xa im lặng (1500ms) khi ECU đang ở Normal Operation; phải lớn hơn CanNmMsgCycleTime." },
  { abbr: "NidPos", full: "CanNmPduNidPosition", cat: "CBV_TMR", desc: "Tham số cấu hình vị trí byte SNI trong payload 8-byte: CANNM_PDU_BYTE_0, CANNM_PDU_BYTE_1, hoặc CANNM_PDU_OFF." },
  { abbr: "CbvPos", full: "CanNmPduCbvPosition", cat: "CBV_TMR", desc: "Tham số cấu hình vị trí byte CBV trong payload 8-byte: CANNM_PDU_BYTE_1, CANNM_PDU_BYTE_0, hoặc CANNM_PDU_OFF." },

  // Category: PN_SYNC (8)
  { abbr: "PN / PNI", full: "Partial Networking / Partial Network Info Bit (CBV Bit 6)", cat: "PN_SYNC", desc: "Cơ chế chỉ đánh thức cụm ECU phục vụ một chức năng cụ thể. Bit 6 CBV (0x40) bằng 1 báo hiệu khung NM có chứa PNC Bit Vector." },
  { abbr: "PNC", full: "Partial Network Cluster", cat: "PN_SYNC", desc: "Cụm mạng con logic gồm các ECU cùng phục vụ một chức năng xe (VD: PNC #16 Sạc pin, PNC #18 Điều hòa) biểu diễn bằng từng bit trong Byte 2..3." },
  { abbr: "PNSR", full: "Synchronized PNC Shutdown Request Bit (CBV Bit 5)", cat: "PN_SYNC", desc: "Bit 5 CBV (0x20, R20-11+): Bật = 1 khi Gateway gọi Nm_RequestSynchronizedPncShutdown() yêu cầu các ECU tắt đồng loạt cụm PNC." },
  { abbr: "EIRA", full: "External and Internal Request Array", cat: "PN_SYNC", desc: "Vector bit PNC tổng hợp cả yêu cầu nội bộ (Tx) và từ bên ngoài bus (Rx), báo từ CanNm qua PduR lên ComM để giữ các PNC cục bộ thức." },
  { abbr: "ERA", full: "External Request Array", cat: "PN_SYNC", desc: "Vector bit PNC chỉ chứa yêu cầu nhận từ bên ngoài trên từng kênh riêng lẻ, dùng cho ECU Gateway định tuyến PNC sang nhánh mạng khác." },
  { abbr: "PnResetTime", full: "CanNmPnResetTime", cat: "PN_SYNC", desc: "Bộ đếm thời gian giữ bit PNC = 1 trong mảng EIRA/ERA (1500ms); hết hạn khi không còn ai phát yêu cầu thì bit tự xóa về 0." },
  { abbr: "SyncPncShdn", full: "Nm_Request & Nm_ForwardSynchronizedPncShutdown", cat: "PN_SYNC", desc: "Cặp API/Callback phối hợp ComM <-> Nm <-> CanNm (R22-11/R23-11) để tắt đồng bộ một cụm PNC mà không gây Wakeup Ping-Pong." },
  { abbr: "WUF", full: "Wake-Up Frame (ISO 11898-6)", cat: "PN_SYNC", desc: "Khung CAN đặc biệt có phần cứng CAN Transceiver giải mã ngay cả khi ECU đang tắt CPU, chỉ đánh thức ECU nếu khớp PNC Mask." },

  // Category: STACK (8)
  { abbr: "ComM", full: "Communication Manager", cat: "STACK", desc: "Module phân xử yêu cầu từ các SWC Users/DCM và chỉ giao tiếp xuống tầng Nm (không gọi trực tiếp CanNm)." },
  { abbr: "BswM", full: "Basic Software Mode Manager", cat: "STACK", desc: "Quản lý quy tắc kích hoạt COM I-PDU Groups và nhận các thông báo Nm_StateChangeNotification / BswM_Nm_CarWakeUpIndication." },
  { abbr: "CanSM", full: "CAN State Manager", cat: "STACK", desc: "Điều khiển bật/tắt CAN Controller/Transceiver, xác nhận CanNm_ConfirmPnAvailability() và xử lý phục hồi Bus-Off." },
  { abbr: "CanIf", full: "CAN Interface", cat: "STACK", desc: "Tầng trừu tượng hóa phần cứng CAN, định tuyến CanIf_Transmit từ CanNm xuống CanDrv và báo CanNm_RxIndication / TxConfirmation." },
  { abbr: "PduR", full: "PDU Router", cat: "STACK", desc: "Định tuyến User Data (TriggerTransmit) và vector ERA/EIRA (RxIndication) giữa CanNm và AUTOSAR COM." },
  { abbr: "COM", full: "AUTOSAR Communication Module", cat: "STACK", desc: "Cung cấp Com_SendSignal() (cho Nm ghi NmStateReport NMS) và Com_TriggerTransmit() (cho CanNm kéo vào frame NM)." },
  { abbr: "Dcm / UDS 0x28", full: "Diagnostic Communication Manager (CommunicationControl)", cat: "STACK", desc: "Sử dụng dịch vụ UDS 0x28 gọi Nm_DisableCommunication() -> CanNm_DisableCommunication() để im lặng đường truyền khi Flash Bootloader." },
  { abbr: "DET", full: "Default Error Tracer (Nm=29, CanNm=31)", cat: "STACK", desc: "Module ghi nhận lỗi Development & Runtime Error chuẩn AUTOSAR như NM_E_UNINIT (0x00), CANNM_E_UNINIT (0x01), CANNM_E_NET_START_IND (0x04)." }
];
