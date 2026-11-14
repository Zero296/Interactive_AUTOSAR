// ================= PART 3: CONSTANTS, BITFIELDS, CONFIG TOOLTIPS, MODULE METADATA & GLOSSARY =================

const COMM_CH_BITS = [
  { bit: 7, mask: 0x80, tag: "USER_FULL",   name: "USER_FULL_REQ",     tone: "",     desc: "Ít nhất một ComMUser trực tiếp hoặc PNC đã map yêu cầu FULL_COM sau phân xử." },
  { bit: 6, mask: 0x40, tag: "DCM_DIAG",    name: "DCM_DIAG_ACTIVE",   tone: "warn", desc: "ComM_DCM_ActiveDiagnostic(Ch) đang bật. Quyền tối cao cưỡng bức kênh vào FULL_COM bất chấp Mode Inhibition." },
  { bit: 5, mask: 0x20, tag: "WAKEUP_PEND", name: "WAKEUP_PENDING",    tone: "warn", desc: "Đang ở NO_COM_REQUEST_PENDING: có yêu cầu FULL_COM / Passive Wakeup nhưng đang đợi CommunicationAllowed == TRUE." },
  { bit: 4, mask: 0x10, tag: "COMM_ALLOW",  name: "COMM_ALLOWED",      tone: "",     desc: "Cờ Gatekeeper ComM_CommunicationAllowed(Ch, TRUE) do EcuM/BswM mở khóa." },
  { bit: 3, mask: 0x08, tag: "T_MIN_FULL",  name: "T_MIN_FULL_RUN",    tone: "warn", desc: "Timer ComMTMinFullComModeDuration đang chạy (giữ kênh ở FULL_COM_NETWORK_REQUESTED cho biến thể LIGHT / NONE)." },
  { bit: 2, mask: 0x04, tag: "NM_LIGHT_TM", name: "NM_LIGHT_TMR_RUN",  tone: "warn", desc: "Timer ComMNmLightTimeout đang đếm ngược trong FULL_COM_READY_SLEEP (biến thể LIGHT) trước khi chuyển NO_COM." },
  { bit: 1, mask: 0x02, tag: "BUSSM",       name: "BUSSM_FULL_IND",    tone: "",     desc: "Đã nhận ComM_BusSM_ModeIndication(COMM_FULL_COMMUNICATION). Điều kiện tiên quyết để báo Rte_Switch/BswM." },
  { bit: 0, mask: 0x01, tag: "NMREQ",       name: "NM_NET_REQ_ACTIVE", tone: "",     desc: "Đang ở COMM_FULL_COM_NETWORK_REQUESTED và đã phát Nm_NetworkRequest(Ch) (nếu ComMNmVariant == FULL)." }
];

const COMM_INHIB_BITS = [
  { bit: 7, mask: 0x80, tag: "COMM_INIT",   name: "COMM_INITIALIZED",   tone: "",     desc: "ComM_Init() đã hoàn thành (COMM_INIT). Nếu bit = 0 (COMM_UNINIT), mọi API gọi vào đều bắn DET COMM_E_UNINIT." },
  { bit: 6, mask: 0x40, tag: "INHIB_CNT",   name: "INHIBIT_CNT_INC",    tone: "warn", desc: "Có yêu cầu FULL_COM bị Mode Inhibition chặn; ComMInhibitCounter > 0 và đã đánh dấu lưu NvM." },
  { bit: 5, mask: 0x20, tag: "PNC_PREP_TM", name: "PNC_PREP_SLEEP_RUN", tone: "warn", desc: "Timer ComMPncPrepareSleepTimer đang đếm ngược trong trạng thái COMM_PNC_PREPARE_SLEEP." },
  { bit: 4, mask: 0x10, tag: "PNC_GW_ACTV", name: "PNC_GW_ROUTING",     tone: "",     desc: "ComMPncGatewayEnabled = TRUE và đang định tuyến ERA giữa các kênh ACTIVE / PASSIVE." },
  { bit: 3, mask: 0x08, tag: "ECU_LIM_NC",  name: "ECU_LIMIT_NOCOM",    tone: "err",  desc: "ComM_LimitECUToNoComMode(TRUE) đang hiệu lực toàn cục cho tất cả kênh trên ECU." },
  { bit: 2, mask: 0x04, tag: "SYNC_WAKEUP", name: "SYNC_WAKEUP_ACTV",   tone: "",     desc: "ComMSynchronousWakeUp đã kích hoạt đánh thức đồng loạt nhiều kênh từ một wakeup nguồn." },
  { bit: 1, mask: 0x02, tag: "CH_LIM",      name: "CH_LIMIT_NOCOM",     tone: "err",  desc: "Bit 1 của ComM_InhibitionStatusType (SWS_ComM_00669): LimitChannelToNoComMode + EcuGroupClassification & 0x02." },
  { bit: 0, mask: 0x01, tag: "CH_NW",       name: "CH_NO_WAKEUP",       tone: "err",  desc: "Bit 0 của ComM_InhibitionStatusType (SWS_ComM_00669): PreventWakeUp(NoWakeup) + EcuGroupClassification & 0x01." }
];

const PNC_BIT_SLOTS = [
  { bit: 0, pncId: 16, mask: 0x01, label: "PNC16", mapped: true },
  { bit: 1, pncId: 17, mask: 0x02, label: "PNC17", mapped: false },
  { bit: 2, pncId: 18, mask: 0x04, label: "PNC18", mapped: true },
  { bit: 3, pncId: 19, mask: 0x08, label: "PNC19", mapped: false },
  { bit: 4, pncId: 20, mask: 0x10, label: "PNC20", mapped: false },
  { bit: 5, pncId: 21, mask: 0x20, label: "PNC21", mapped: false },
  { bit: 6, pncId: 22, mask: 0x40, label: "PNC22", mapped: false },
  { bit: 7, pncId: 23, mask: 0x80, label: "PNC23", mapped: false }
];

const configTooltipData = {
  ComMInitialized: {
    title: "ComM Module Init Status",
    ecucPath: "ComMRuntime / ComMStatusType",
    sws: "SWS_ComM_00313 · SWS_ComM_00858",
    range: "COMM_UNINIT (false) | COMM_INIT (true)",
    role: "Trạng thái khởi tạo toàn cục của module ComM sau khi EcuM gọi ComM_Init().",
    mechanism: "Nếu chưa Init (false), bất kỳ API nào trừ ComM_Init()/ComM_GetStatus() sẽ trả về E_NOT_OK và báo DET COMM_E_UNINIT (0x01) nếu bật DET.",
    scenarioImpact: "Thử bỏ chọn ở kịch bản S14 hoặc What-If để quan sát DET bẫy lỗi COMM_E_UNINIT."
  },
  ComMDevErrorDetect: {
    title: "ComMDevErrorDetect",
    ecucPath: "ComMGeneral / ComMDevErrorDetect",
    sws: "SWS_ComM_00557 · ECUC_ComM_00557",
    range: "boolean (true | false)",
    role: "Bật/tắt cơ chế phát hiện lỗi phát triển (DET) trong ComM.",
    mechanism: "Khi true, ComM kiểm tra NULL_PTR, UNINIT, WRONG_PARAMETERS (UserId/ChannelId/ComMode sai) và gọi Det_ReportError(COMM_MODULE_ID=12).",
    scenarioImpact: "Tắt DET sẽ khiến lời gọi sai tham số im lặng bỏ qua thay vì ghi nhận lỗi ở khối DET."
  },
  ComMVersionInfoApi: {
    title: "ComMVersionInfoApi",
    ecucPath: "ComMGeneral / ComMVersionInfoApi",
    sws: "SWS_ComM_00370 · ECUC_ComM_00558",
    range: "boolean (true | false)",
    role: "Biên dịch và kích hoạt hàm ComM_GetVersionInfo(Std_VersionInfoType* versioninfo).",
    mechanism: "Ảnh hưởng trực tiếp tới macro #define COMM_VERSION_INFO_API STD_ON/OFF khi xuất file ComM_Cfg.h.",
    scenarioImpact: "Bật lên để thấy macro STD_ON được sinh trong tab Export ComM_Cfg.h."
  },
  ComMModeLimitationEnabled: {
    title: "ComMModeLimitationEnabled",
    ecucPath: "ComMGeneral / ComMModeLimitationEnabled",
    sws: "SWS_ComM_00560 · ECUC_ComM_00560",
    range: "boolean (true | false)",
    role: "Pre-compile switch cho phép dùng ComM_LimitChannelToNoComMode() và ComM_LimitECUToNoComMode().",
    mechanism: "Nếu false, các hàm Limit To NO_COM bị vô hiệu hóa hoặc trả E_NOT_OK, bit 1 của InhibitStatus luôn bằng 0.",
    scenarioImpact: "Liên quan trực tiếp tới kịch bản S9 (Limit to NO_COM)."
  },
  ComMWakeupInhibitionEnabled: {
    title: "ComMWakeupInhibitionEnabled",
    ecucPath: "ComMGeneral / ComMWakeupInhibitionEnabled",
    sws: "SWS_ComM_00563 · ECUC_ComM_00563",
    range: "boolean (true | false)",
    role: "Pre-compile switch cho phép tính năng Wake-up Inhibition (ComM_PreventWakeUp).",
    mechanism: "Khi true, ComM cho phép chặn các SWC User đánh thức kênh đang ở NO_COM hoặc SILENT_COM (Bit 0 = 1).",
    scenarioImpact: "Tác động trực tiếp trong kịch bản S8 (Wake-up Inhibition & InhibitCounter)."
  },
  ComMSynchronousWakeUp: {
    title: "ComMSynchronousWakeUp",
    ecucPath: "ComMGeneral / ComMSynchronousWakeUp",
    sws: "SWS_ComM_00562 · SWS_ComM_00695",
    range: "boolean (true | false)",
    role: "Cho phép một sự kiện wakeup từ EcuM/Nm trên Ch0 tự động đánh thức toàn bộ các kênh khác sang NO_COM_REQUEST_PENDING.",
    mechanism: "Hữu ích cho kiến trúc Gateway hoặc ECU đa bus cần khởi động đồng pha giữa Ch0 và Ch1.",
    scenarioImpact: "Bật/tắt trong kịch bản S6 để thấy Ch1 cùng chuyển trạng thái theo Ch0 hay giữ nguyên."
  },
  ComMTMinFullComModeDuration: {
    title: "ComMTMinFullComModeDuration",
    ecucPath: "ComMGeneral / ComMTMinFullComModeDuration",
    sws: "SWS_ComM_00564 · SWS_ComM_00889",
    range: "uint32 (0 .. 65000 ms, default 500 ms)",
    role: "Thời gian tối thiểu kênh (biến thể LIGHT/NONE) phải giữ trong COMM_FULL_COM_NETWORK_REQUESTED.",
    mechanism: "Ngay cả khi mọi User đã release về NO_COM sớm (VD tại t=100ms), kênh vẫn ở NETWORK_REQUESTED tới khi timer này đếm về 0.",
    scenarioImpact: "Trọng tâm kịch bản S3 (Multi-User Arbitration & TMinFullComModeDuration)."
  },
  ComMChannelId: {
    title: "ComMChannelId",
    ecucPath: "ComMConfigSet / ComMChannel / ComMChannelId",
    sws: "SWS_ComM_00565 · ECUC_ComM_00565",
    range: "NetworkHandleType (0..255)",
    role: "Định danh logic duy nhất (NetworkHandleType) của kênh truyền thông đang quan sát trong ComM.",
    mechanism: "Mỗi kênh vật lý (CAN0, CAN1, ETH0...) có 1 ChannelId ánh xạ xuống CanSM/Nm.",
    scenarioImpact: "Hiển thị nhãn kênh hiện tại và ánh xạ vào cấu trúc ComM_Lcfg.c."
  },
  ComMBusType: {
    title: "ComMBusType",
    ecucPath: "ComMConfigSet / ComMChannel / ComMBusType",
    sws: "SWS_ComM_00566 · SWS_ComM_00668",
    range: "CAN | ETH | FR | LIN | INTERNAL",
    role: "Loại bus vật lý bên dưới kênh để ComM ánh xạ tới đúng BusSM (CanSM, EthSM, FrSM, LinSM).",
    mechanism: "Với COMM_BUS_TYPE_INTERNAL, không có BusSM phần cứng thực sự; giao tiếp chỉ nội bộ ECU.",
    scenarioImpact: "Cập nhật hàm BusSM tương ứng trong sơ đồ kiến trúc và file export."
  },
  ComMMainFunctionPeriod: {
    title: "ComMMainFunctionPeriod",
    ecucPath: "ComMConfigSet / ComMChannel / ComMMainFunctionPeriod",
    sws: "SWS_ComM_00567 · ECUC_ComM_00567",
    range: "float/ms (5 .. 100 ms, điển hình 10ms hoặc 20ms)",
    role: "Chu kỳ OS/SchM gọi định kỳ hàm ComM_MainFunction_<Channel>().",
    mechanism: "Mọi bộ đếm timer (TMinFull, NmLightTimeout, PncPrepareSleep) và quá trình phân xử chuyển trạng thái được giảm theo bước period này.",
    scenarioImpact: "Quyết định độ phân giải mỗi lần bấm '+20ms Tick' hoặc Auto Clock."
  },
  ComMNmVariant: {
    title: "ComMNmVariant",
    ecucPath: "ComMChannel / ComMNetworkManagement / ComMNmVariant",
    sws: "SWS_ComM_00568 · SWS_ComM_00667",
    range: "FULL | LIGHT | PASSIVE | NONE",
    role: "Chiến lược quản lý mạng (NM) quyết định cấu trúc máy trạng thái của kênh.",
    mechanism: "FULL: dùng Nm/CanNm đầy đủ (có SILENT_COM). LIGHT: không có gói NM, tự dùng NmLightTimeout để ngủ. PASSIVE: chỉ nghe NM từ bus, không được phát Nm_NetworkRequest. NONE: không dùng NM và không dùng SILENT_COM.",
    scenarioImpact: "Thay đổi luồng trong S2/S4 (FULL), S5 (LIGHT), S7 (PASSIVE)."
  },
  ComMNmLightTimeout: {
    title: "ComMNmLightTimeout",
    ecucPath: "ComMChannel / ComMNetworkManagement / ComMNmLightTimeout",
    sws: "SWS_ComM_00569 · SWS_ComM_00610",
    range: "uint32 (0 .. 65000 ms, default 1000 ms)",
    role: "Thời gian chờ ở trạng thái FULL_COM_READY_SLEEP dành riêng cho biến thể ComMNmVariant = LIGHT.",
    mechanism: "Sau khi TMinFull kết thúc và kênh sang READY_SLEEP, NmLightTimeout đếm về 0 rồi ComM tự tắt bus về NO_COM mà không đi qua SILENT_COM.",
    scenarioImpact: "Là cơ chế trung tâm của kịch bản S5."
  },
  ComMPncNmRequest: {
    title: "ComMPncNmRequest",
    ecucPath: "ComMChannel / ComMPncNmRequest",
    sws: "SWS_ComM_00829 · ECUC_ComM_00890",
    range: "boolean (true | false)",
    role: "Khi TRUE và có bất kỳ PNC nào được map vào kênh này chuyển sang PNC_REQUESTED, ComM gọi Nm_NetworkRequest() lại để ép NM gửi gói PN tức thì.",
    mechanism: "Giúp các ECU khác trên bus nhanh chóng nhận ra sự thay đổi PNC bit vector ngay cả khi kênh đang giữ mạng từ trước.",
    scenarioImpact: "Ghi nhận lời gọi Nm_NetworkRequest bổ sung trong API Trace ở S11/S12."
  },
  ComMFullCommRequestNotificationEnabled: {
    title: "ComMFullCommRequestNotificationEnabled",
    ecucPath: "ComMChannel / ComMFullCommRequestNotificationEnabled",
    sws: "SWS_ComM_00842 · ECUC_ComM_00842",
    range: "boolean (true | false)",
    role: "Cho phép thông báo danh sách User đang xin FULL_COM ngay cả khi kênh đang bị cưỡng bức ở NO_COM bởi LimitToNoCom.",
    mechanism: "Giúp ứng dụng/diag biết có User đang chờ mạng nhưng đang bị Mode Limitation chặn.",
    scenarioImpact: "Hiển thị thông tin trạng thái chờ của User trong Inspector."
  },
  User0_RequestMode: {
    title: "User 0 (SWC_DiagApp) Request Mode",
    ecucPath: "ComMConfigSet / ComMUser_0 → ComM_RequestComMode(0, Mode)",
    sws: "SWS_ComM_00110 · SWS_ComM_00979",
    range: "COMM_NO_COMMUNICATION | COMM_FULL_COMMUNICATION",
    role: "Chế độ truyền thông mà SWC User 0 (mapped tới Ch0) đang yêu cầu vào ComM.",
    mechanism: "ComM lưu yêu cầu riêng của từng User trong UserReqArray[] rồi thực hiện phép OR logic trong bộ phân xử (Mode Arbitration).",
    scenarioImpact: "Dùng trong S2, S3, S4, S8, S9 để mô phỏng 1 hoặc nhiều User cùng đòi mạng."
  },
  User1_RequestMode: {
    title: "User 1 (SWC_BodyCtrl) Request Mode",
    ecucPath: "ComMConfigSet / ComMUser_1 → ComM_RequestComMode(1, Mode)",
    sws: "SWS_ComM_00110 · SWS_ComM_00871",
    range: "COMM_NO_COMMUNICATION | COMM_FULL_COMMUNICATION",
    role: "Chế độ truyền thông mà SWC User 1 (cùng map tới Ch0) đang yêu cầu.",
    mechanism: "Minh họa Multi-User Arbitration: chỉ cần User 0 HOẶC User 1 vẫn xin FULL_COM thì kênh Ch0 tuyệt đối không được tắt mạng.",
    scenarioImpact: "Cốt lõi của kịch bản S3 & S4."
  },
  User2_Pnc16RequestMode: {
    title: "User 2 (SWC_PncPower → PNC #16) Request",
    ecucPath: "ComMConfigSet / ComMUser_2 → ComM_RequestComMode(2, Mode)",
    sws: "SWS_ComM_00930 · SWS_ComM_00932",
    range: "COMM_NO_COMMUNICATION | COMM_FULL_COMMUNICATION",
    role: "User 2 được map vào cụm Partial Network PNC #16 (qua đó điều khiển cả Ch0 và Ch1 tùy mapping).",
    mechanism: "Khi User 2 xin FULL_COM và ComMPncSupport=TRUE, PNC #16 bật lên PNC_REQUESTED, set Bit 0 (Byte 2) trong TxPncSignal = 1 và tự động yêu cầu kênh vật lý thức dậy.",
    scenarioImpact: "Trung tâm của kịch bản S11."
  },
  ComMCommunicationAllowedFlag: {
    title: "ComM_CommunicationAllowed(Ch0, Allowed)",
    ecucPath: "Runtime API: EcuM/BswM → ComM_CommunicationAllowed()",
    sws: "SWS_ComM_00871 · SWS_ComM_00895",
    range: "boolean (TRUE | FALSE)",
    role: "Chốt chặn (Gatekeeper) cho biết nguồn phần cứng, Transceiver và Stack bên dưới đã sẵn sàng cho phép kênh giao tiếp hay chưa.",
    mechanism: "Nếu FALSE, yêu cầu FULL_COM hoặc Passive Wakeup chỉ đưa kênh từ NO_COM_NO_PENDING_REQUEST sang NO_COM_REQUEST_PENDING rồi đứng đợi (Bit 5 WAKEUP_PEND = 1).",
    scenarioImpact: "Điều phối chuyển pha Step 2→3 trong S1, S6, và bẫy kẹt chờ trong S14."
  },
  ComMDcmDiagnosticActiveFlag: {
    title: "ComM_DCM_ActiveDiagnostic(Ch0)",
    ecucPath: "Runtime API: DCM → ComM_DCM_ActiveDiagnostic / InactiveDiagnostic",
    sws: "SWS_ComM_00873 · SWS_ComM_00874 · SWS_ComM_00303",
    range: "boolean (TRUE = Active | FALSE = Inactive)",
    role: "Tín hiệu từ module DCM báo có phiên chẩn đoán UDS đang hoạt động.",
    mechanism: "Quyền TỐI CAO: Vượt qua tất cả Mode Inhibition (NoWakeup và LimitToNoCom), ép kênh giữ FULL_COM_NETWORK_REQUESTED tới khi gọi InactiveDiagnostic().",
    scenarioImpact: "Trung tâm của kịch bản S10."
  },
  SimulateBusSmIndicationDelay: {
    title: "Simulated BusSM Mode Indication Delay",
    ecucPath: "Simulation Timing / CanSM_RequestComMode ↔ ComM_BusSM_ModeIndication",
    sws: "SWS_ComM_00675 · SWS_ComM_00828",
    range: "uint32 (0 .. 5000 ms, default 20 ms)",
    role: "Độ trễ mô phỏng từ lúc ComM gọi CanSM_RequestComMode() cho đến khi CanSM bật Transceiver/Controller xong và gọi lại ComM_BusSM_ModeIndication().",
    mechanism: "ComM không báo Rte_Switch(FULL_COM) lên SWC trước khi nhận BusSM_ModeIndication(). Nếu đặt quá lớn (VD >2000ms), dễ quan sát trạng thái treo chờ BusSM trong S14.",
    scenarioImpact: "Minh họa cơ chế bắt tay bất đồng bộ ở S2 và lỗi timeout BusSM ở S14."
  },
  ComMNoWakeup: {
    title: "ComMNoWakeup (ComM_PreventWakeUp Bit 0)",
    ecucPath: "ComMChannel / ComMNoWakeup (Runtime: ComM_PreventWakeUp(Ch, TRUE))",
    sws: "SWS_ComM_00305 · SWS_ComM_00669 (Bit 0 = 0x01)",
    range: "boolean (true | false)",
    role: "Wake-up Inhibition (Bit 0): Cấm SWC User chủ động đánh thức kênh đang ở NO_COM hoặc SILENT_COM.",
    mechanism: "Chỉ hiệu lực nếu (EcuGroupClassification & 0x01) != 0 và ComMWakeupInhibitionEnabled = TRUE. Lưu ý: KHÔNG chặn Passive Wakeup từ bus và KHÔNG chặn DCM!",
    scenarioImpact: "Là trọng tâm của kịch bản S8."
  },
  ComMNoCom: {
    title: "ComMNoCom (LimitChannelToNoComMode Bit 1)",
    ecucPath: "Runtime API: ComM_LimitChannelToNoComMode(Ch, Status)",
    sws: "SWS_ComM_00163 · SWS_ComM_00669 (Bit 1 = 0x02)",
    range: "boolean (true | false)",
    role: "Limit to NO_COM Mode (Bit 1): Cưỡng bức kênh đang FULL_COM phải nhả mạng và tắt về NO_COM bất chấp User đang giữ FULL_COM.",
    mechanism: "Chỉ hiệu lực nếu (EcuGroupClassification & 0x02) != 0 và ComMModeLimitationEnabled = TRUE. Yêu cầu mới từ User cũng bị chặn và tăng InhibitCounter.",
    scenarioImpact: "Là trọng tâm của kịch bản S9."
  },
  GlobalLimitEcuToNoCom: {
    title: "ComM_LimitECUToNoComMode (Global ECU)",
    ecucPath: "Runtime API: ComM_LimitECUToNoComMode(Status)",
    sws: "SWS_ComM_00124 · SWS_ComM_00215",
    range: "boolean (true | false)",
    role: "Áp dụng cưỡng bức tắt về NO_COM đồng loạt cho TẤT CẢ các kênh (Ch0 & Ch1) trên toàn ECU.",
    mechanism: "Khi Status=TRUE và Classification Bit 1 bật, toàn bộ kênh giao tiếp được thu hồi về NO_COM (trừ kênh đang có DCM ActiveDiagnostic).",
    scenarioImpact: "Kiểm thử tác động đồng loạt trên cả Ch0 và Ch1 trong S9 / What-If."
  },
  ComMEcuGroupClassification: {
    title: "ComMEcuGroupClassification",
    ecucPath: "ComMGeneral / ComMEcuGroupClassification",
    sws: "SWS_ComM_00559 · SWS_ComM_00669 · ComM_SetECUGroupClassification",
    range: "0x00 | 0x01 | 0x02 | 0x03 (2-bit Mask)",
    role: "Mặt nạ toàn cục (Global Mask) quyết định lệnh Inhibition nào thực sự có quyền hoạt động trên ECU.",
    mechanism: "Bit 0 (0x01) cho phép NoWakeup; Bit 1 (0x02) cho phép LimitToNoCom. Nếu Classification = 0x00, mọi lệnh PreventWakeUp / LimitChannel đều bị che (vô tác dụng)!",
    scenarioImpact: "Cho phép kiểm chứng tình huống lệnh Limit bị vô hiệu vì mask trong S9."
  },
  ComMInhibitCounterValue: {
    title: "ComMInhibitCounter (NvM Ram Mirror)",
    ecucPath: "ComMGeneral / ComMGlobalNvMBlockDescriptor → InhibitCounter",
    sws: "SWS_ComM_00141 · SWS_ComM_00302",
    range: "uint16 (0 .. 65535)",
    role: "Bộ đếm số lần yêu cầu FULL_COM của User bị từ chối do Mode Inhibition.",
    mechanism: "Mỗi khi User gọi RequestComMode(FULL_COM) mà bị chặn, ComM tăng counter thêm 1, gọi NvM_SetRamBlockStatus(TRUE) và cho đọc qua ComM_ReadInhibitCounter().",
    scenarioImpact: "Thể hiện trực tiếp trong S8 và S9; có nút reset counter qua ComM_ResetInhibitCounter()."
  },
  ComMNoWakeupNvMStorage: {
    title: "ComMNoWakeupNvMStorage",
    ecucPath: "ComMChannel / ComMNoWakeupNvMStorage",
    sws: "SWS_ComM_00709 · ECUC_ComM_00709",
    range: "boolean (true | false)",
    role: "Quyết định cờ ComMNoWakeup của kênh có được lưu bền vững vào bộ nhớ NvM qua chu kỳ ngủ/tắt nguồn hay không.",
    mechanism: "Khi TRUE, mỗi lần đổi cờ NoWakeup, ComM gọi NvM_SetRamBlockStatus(BlockId, TRUE) để ECU giữ trạng thái chống đánh thức sau khi khởi động lại.",
    scenarioImpact: "Kích hoạt hiệu ứng mũi tên lưu NvM trên sơ đồ kiến trúc ở S8."
  },
  ComMPncSupport: {
    title: "ComMPncSupport",
    ecucPath: "ComMGeneral / ComMPncSupport",
    sws: "SWS_ComM_00894 · ECUC_ComM_00894",
    range: "boolean (true | false)",
    role: "Công tắc tổng kích hoạt tính năng Partial Networking Cluster (PNC) trong ComM.",
    mechanism: "Nếu FALSE, máy trạng thái PNC bị khóa tại PNC_NO_COMMUNICATION, ComM không xử lý vector EIRA/ERA hay gọi Com_SendSignal cho PN.",
    scenarioImpact: "Kiểm thử validation khi bật PNC Gateway mà quên bật ComMPncSupport."
  },
  ComMPncPrepareSleepTimer: {
    title: "ComMPncPrepareSleepTimer",
    ecucPath: "ComMGeneral / ComMPncPrepareSleepTimer",
    sws: "SWS_ComM_00952 · ECUC_ComM_00952",
    range: "uint32 (0 .. 10000 ms, default 400 ms)",
    role: "Thời gian trễ giữ PNC ở COMM_PNC_PREPARE_SLEEP trước khi tắt hẳn về COMM_PNC_NO_COMMUNICATION.",
    mechanism: "Sau khi cả yêu cầu nội bộ lẫn bit tương ứng trong Rx EIRA về 0, PNC chuyển từ READY_SLEEP sang PREPARE_SLEEP và chạy timer này để tránh bật/tắt bus liên tục khi gói NM vừa mất.",
    scenarioImpact: "Trọng tâm bước 8→10 của kịch bản S12 (10-Step Flow)."
  },
  Pnc16_Enabled_And_Mask: {
    title: "PNC #16 (Byte 2, Bit 0 = 0x01) Mapping",
    ecucPath: "ComMConfigSet / ComMPnc_16 (ComMPncId = 16)",
    sws: "SWS_ComM_00910 · SWS_ComM_00922",
    range: "boolean (Mapped / Enabled)",
    role: "Kích hoạt cấu hình PNC #16 map tới User 2, Ch0 và Ch1 (vị trí Bit 0 của Byte 2 theo ComMPncInfoOffset=2).",
    mechanism: "Byte Index = (16 / 8) - Offset(2) = Byte 0 của PNC Vector; Bit Mask = 1 << (16 % 8) = 0x01.",
    scenarioImpact: "Điều khiển PNC #16 trong S11, S12, S13."
  },
  Pnc18_Enabled_And_Mask: {
    title: "PNC #18 (Byte 2, Bit 2 = 0x04) Mapping",
    ecucPath: "ComMConfigSet / ComMPnc_18 (ComMPncId = 18)",
    sws: "SWS_ComM_00910 · ECUC_ComM_00922",
    range: "boolean (Mapped / Enabled)",
    role: "Kích hoạt cấu hình PNC #18 map qua Gateway giữa Ch0 (ACTIVE) và Ch1 (PASSIVE).",
    mechanism: "Khi nhận ERA có bit 2 = 0x04 trên Ch0 (ACTIVE), Gateway sẽ định tuyến yêu cầu PNC #18 sang Ch1 (PASSIVE).",
    scenarioImpact: "Cốt lõi của kịch bản S13 (PNC Gateway Routing)."
  },
  RxEiraSignalHex: {
    title: "RxEiraSignal (ComSignal EIRA Vector)",
    ecucPath: "ComMConfigSet / ComMPnc / ComMPncComSignal (COMM_EIRA)",
    sws: "SWS_ComM_00984 · SWS_ComM_00986",
    range: "Hex Byte2 Byte3 (VD: '01 00' bật PNC#16)",
    role: "Giá trị vector EIRA (External & Internal Request Array) do COM callback báo vào ComM qua ComM_COMCbk().",
    mechanism: "Bit = 1 trong EIRA kéo PNC tương ứng từ NO_COM hoặc PREPARE_SLEEP lên PNC_READY_SLEEP để ECU tham gia nghe/nhận dữ liệu cụm PNC đó.",
    scenarioImpact: "Thao tác trực tiếp trong S12 để kích hoạt 10-Step Rx EIRA Flow."
  },
  ComMPncWakeupSleepRequestEnabled: {
    title: "ComMPncWakeupSleepRequestEnabled",
    ecucPath: "ComMGeneral / ComMPncWakeupSleepRequestEnabled",
    sws: "ECUC_ComM_00971 · SWS_ComM_01059",
    range: "boolean (true | false)",
    role: "Cho phép chuyển tiếp yêu cầu ngủ/thức PNC phối hợp xuống các bus vật lý hỗ trợ Synchronized PNC Shutdown.",
    mechanism: "Kết hợp cùng PNC_REQUESTED để điều phối bit wake/sleep tới BusNm.",
    scenarioImpact: "Hiển thị trong export Cfg/ARXML và phối hợp với kịch bản S13."
  },
  ComMPncGatewayEnabled: {
    title: "ComMPncGatewayEnabled",
    ecucPath: "ComMGeneral / ComMPncGatewayEnabled",
    sws: "SWS_ComM_00942 · ECUC_ComM_00942",
    range: "boolean (true | false)",
    role: "Bật chức năng PNC Gateway trong ComM để định tuyến vector ERA giữa các kênh mạng độc lập.",
    mechanism: "Phải bật cùng ComMPncSupport = TRUE. Nếu bật Gateway khi ComMPncSupport = FALSE, validator sẽ báo lỗi cấu hình.",
    scenarioImpact: "Bắt buộc bật cho kịch bản S13 (PNC Gateway Routing)."
  },
  Ch0_GatewayType: {
    title: "Ch0 ComMPncGatewayType",
    ecucPath: "ComMChannel_0 / ComMPncGatewayType",
    sws: "SWS_ComM_00943 · SWS_ComM_00944",
    range: "ACTIVE | PASSIVE | NONE",
    role: "Vai trò PNC Gateway của kênh Ch0: ACTIVE hoặc PASSIVE.",
    mechanism: "ACTIVE nhận ERA từ ngoài và kích cả kênh ACTIVE lẫn PASSIVE. PASSIVE nhận ERA và chỉ định tuyến sang các kênh ACTIVE (cấm phát ngược sang PASSIVE khác để tránh vòng lặp vô hạn!).",
    scenarioImpact: "Dùng trong S13 để kiểm chứng nguyên tắc chống routing loop."
  },
  Ch1_GatewayType: {
    title: "Ch1 ComMPncGatewayType",
    ecucPath: "ComMChannel_1 / ComMPncGatewayType",
    sws: "SWS_ComM_00943 · SWS_ComM_00944",
    range: "ACTIVE | PASSIVE | NONE",
    role: "Vai trò PNC Gateway của kênh Ch1 (mặc định PASSIVE trong bài lab Gateway).",
    mechanism: "Nếu Ch1 là PASSIVE và nhận Rx ERA từ Ch1, theo quy tắc Gateway PASSIVE→PASSIVE bị cấm; chỉ ACTIVE→PASSIVE/ACTIVE hoặc PASSIVE→ACTIVE được phép.",
    scenarioImpact: "Thử đảo Ch0/Ch1 trong What-If của S13 để thấy luồng routing thay đổi ngay lập tức."
  },
  RxEraCh0Hex: {
    title: "RxEraSignal_Ch0 (ERA Trên Kênh 0)",
    ecucPath: "ComMPncComSignal (COMM_ERA, ComMChannel_0)",
    sws: "SWS_ComM_00984 · SWS_ComM_00945",
    range: "Hex Byte2 Byte3 (VD: '04 00' = PNC#18)",
    role: "External Request Array chỉ chứa bit PNC nhận riêng từ bus bên ngoài trên Ch0.",
    mechanism: "Dùng làm đầu vào cho thuật toán PNC Gateway (phản chiếu sang TX PN vector của Ch1 nếu hợp lệ).",
    scenarioImpact: "Kích hoạt định tuyến PNC#18 sang Ch1 trong S13."
  },
  RxEraCh1Hex: {
    title: "RxEraSignal_Ch1 (ERA Trên Kênh 1)",
    ecucPath: "ComMPncComSignal (COMM_ERA, ComMChannel_1)",
    sws: "SWS_ComM_00984 · SWS_ComM_00945",
    range: "Hex Byte2 Byte3 (VD: '04 00' = PNC#18)",
    role: "External Request Array nhận riêng từ bus bên ngoài trên Ch1.",
    mechanism: "Minh họa rule an toàn chống lặp Gateway: nếu Ch1=PASSIVE, bit từ RxEraCh1 không được gửi sang các kênh PASSIVE khác.",
    scenarioImpact: "Dùng để kiểm chứng chống vòng lặp ở S13."
  },
  ComMSynchronizedPncShutdownEnabled: {
    title: "ComMSynchronizedPncShutdownEnabled",
    ecucPath: "ComMGeneral / ComMSynchronizedPncShutdownEnabled",
    sws: "SWS_ComM_01059 · AUTOSAR R21-11+",
    range: "boolean (true | false)",
    role: "Kích hoạt đồng bộ tắt mạng PNC phối hợp giữa PNC Coordinator và BusNm (Nm_RequestSynchronizedPncShutdown).",
    mechanism: "Khi tất cả điều kiện tắt PNC hội tụ trên mạng Top-Level Gateway, ComM chủ động gửi yêu cầu Synchronized Shutdown để mọi ECU trong cụm PNC tắt đồng thời thay vì chờ hết NmTimeout dài.",
    scenarioImpact: "Được kích hoạt ở giai đoạn cuối của kịch bản S13."
  }
};

const MODULES_INFO = {
  MOD_SWC: {
    id: "MOD_SWC",
    name: "Application SWCs (User 0 / 1 / 2)",
    layer: "Application Layer",
    role: "Các phần mềm ứng dụng gửi nhu cầu truyền thông (FULL_COM hoặc NO_COM) vào ComM mà không cần biết chi tiết phần cứng CAN/ETH bên dưới.",
    inputs: "Nhận thông báo chế độ thực tế qua Rte_Switch_UM_<User>_currentMode (hoặc đọc qua ComM_GetCurrentComMode) chỉ khi BusSM đã confirm.",
    processing: "User 0 & User 1 map vào kênh vật lý Ch0; User 2 map vào logic PNC #16 (qua đó kéo Ch0/Ch1 khi PNC bật).",
    outputs: "Gọi ComM_RequestComMode(User, ComMode) thông qua cổng Rte_Call_UR_<User>_RequestComMode().",
    apis: ["ComM_RequestComMode(User, ComMode)", "ComM_GetRequestedComMode(User, &ComMode)", "ComM_GetCurrentComMode(User, &ComMode)"]
  },
  MOD_RTE: {
    id: "MOD_RTE",
    name: "RTE & SchM (Runtime Env / Schedule Mgr)",
    layer: "Runtime Environment & OS",
    role: "Cầu nối chuyển lệnh từ SWC vào ComM và lập lịch gọi ComM_MainFunction_<Channel>() theo đúng chu kỳ cấu hình (VD: 20 ms).",
    inputs: "Lời gọi client-server từ SWC và lệnh cập nhật Mode Switch Notification từ ComM.",
    processing: "Bảo vệ vùng tranh chấp (Exclusive Area) và thực thi Rte_Switch gửi Mode tới các SWC liên quan.",
    outputs: "Trigger định kỳ ComM_MainFunction_0(), ComM_MainFunction_1() và Rte_Switch_UM_<User>_currentMode().",
    apis: ["SchM_Enter_ComM_COMM_EXCLUSIVE_AREA()", "ComM_MainFunction_0()", "Rte_Switch_UM_User_currentMode()"]
  },
  MOD_COMM: {
    id: "MOD_COMM",
    name: "ComM Core (Communication Manager)",
    layer: "System Services (BSW)",
    role: "Nhạc trưởng phân xử tập trung của hệ thống truyền thông AUTOSAR: thu thập yêu cầu đa User, PNC, DCM; lọc qua Mode Inhibition & CommunicationAllowed; điều phối Nm và BusSM.",
    inputs: "User Requests, EcuM WakeUpIndication, CommunicationAllowed, DCM ActiveDiagnostic, BusSM_ModeIndication, Nm_Mode callbacks, COM Rx EIRA/ERA callbacks.",
    processing: "Thực hiện Mode Arbitration (lấy mode cao nhất), cập nhật Channel State Machine (3 modes / 5 sub-states), PNC State Machine (4 states), timers và đếm InhibitCounter.",
    outputs: "Gọi BusSM_RequestComMode(), Nm_NetworkRequest/Release(), Com_SendSignal() (PNC Tx Vector), BswM_ComM_CurrentMode(), Rte_Switch(), NvM_SetRamBlockStatus().",
    apis: ["ComM_Init()", "ComM_MainFunction_Channel()", "ComM_RequestComMode()", "ComM_GetState()", "ComM_COMCbk()"]
  },
  MOD_ECUM: {
    id: "MOD_ECUM",
    name: "EcuM & BswM (ECU State & BSW Mode Mgr)",
    layer: "System Services (BSW)",
    role: "EcuM quản lý chu kỳ khởi động ECU, đánh thức bus (Wakeup) và mở chốt Gatekeeper; BswM nhận trạng thái ComM để kích hoạt I-PDU Group (Enable Tx/Rx trong COM).",
    inputs: "EcuM nhận wakeup interrupt từ CanTrcv/CanIf; BswM nhận callback BswM_ComM_CurrentMode() & BswM_ComM_CurrentPNCMode().",
    processing: "Khi Startup đạt pha RUN/STARTUP_TWO, EcuM/BswM mở ComM_CommunicationAllowed(Ch, TRUE). Khi có wakeup lúc ECU đang ngủ, EcuM báo ComM_EcuM_WakeUpIndication(Ch).",
    outputs: "Gọi ComM_Init(), ComM_CommunicationAllowed(), ComM_EcuM_WakeUpIndication(), ComM_EcuM_PNCWakeUpIndication().",
    apis: ["ComM_CommunicationAllowed(Channel, Allowed)", "ComM_EcuM_WakeUpIndication(Channel)", "BswM_ComM_CurrentMode(Channel, Mode)", "BswM_ComM_CurrentPNCMode(PNC, Mode)"]
  },
  MOD_DCM: {
    id: "MOD_DCM",
    name: "DCM (Diagnostic Communication Manager)",
    layer: "Diagnostic Services (BSW)",
    role: "Xử lý các dịch vụ chẩn đoán UDS ($10 Session, TesterPresent...). Có quyền ưu tiên cao nhất trong ComM để bảo toàn kết nối chẩn đoán bất chấp lệnh hạn chế Mode Inhibition.",
    inputs: "Nhận bản tin UDS Request qua PduR hoặc timer S3SessionTimeout.",
    processing: "Báo hiệu phiên chẩn đoán đang bận hoặc vừa kết thúc lên ComM.",
    outputs: "Gọi ComM_DCM_ActiveDiagnostic(Channel) và ComM_DCM_InactiveDiagnostic(Channel).",
    apis: ["ComM_DCM_ActiveDiagnostic(Channel)", "ComM_DCM_InactiveDiagnostic(Channel)"]
  },
  MOD_NM: {
    id: "MOD_NM",
    name: "Nm & CanNm (Network Management)",
    layer: "Communication Services",
    role: "Điều phối thuật toán ngủ/thức mạng đồng bộ giữa nhiều ECU trên bus bằng gói tin NM chứa Node ID & CBV/PNC Bit Vector (với biến thể FULL/PASSIVE).",
    inputs: "Nhận Nm_NetworkRequest(Ch), Nm_PassiveStartUp(Ch), Nm_NetworkRelease(Ch) từ ComM.",
    processing: "Chạy máy trạng thái RepeatMessage -> NormalOperation -> ReadySleep -> PrepareBusSleep -> BusSleepMode.",
    outputs: "Gọi ngược callback về ComM: ComM_Nm_NetworkStartIndication(), ComM_Nm_NetworkMode(), ComM_Nm_PrepareBusSleepMode(), ComM_Nm_BusSleepMode().",
    apis: ["Nm_NetworkRequest()", "Nm_NetworkRelease()", "ComM_Nm_NetworkMode()", "ComM_Nm_PrepareBusSleepMode()", "ComM_Nm_BusSleepMode()"]
  },
  MOD_SM: {
    id: "MOD_SM",
    name: "CanSM / BusSM (Bus State Manager)",
    layer: "Communication Services",
    role: "Thực thi lệnh chuyển chế độ phần cứng thực sự của bus (CanIf Controller START/STOPPED/SLEEP, CanTrcv NORMAL/STANDBY) theo yêu cầu từ ComM.",
    inputs: "Nhận CanSM_RequestComMode(Channel, ComMode) từ ComM.",
    processing: "Điều khiển state machine chuyển mạch CanIf & CanTrcv, xử lý Bus-Off recovery trước khi xác nhận bus đã sẵn sàng.",
    outputs: "Bắt tay xác nhận bằng ComM_BusSM_ModeIndication(Channel, &ComMode) và ComM_BusSM_BusSleepMode() (R20-11+).",
    apis: ["BusSM_RequestComMode(Ch, Mode)", "ComM_BusSM_ModeIndication(Ch, &Mode)", "ComM_BusSM_BusSleepMode(Ch)"]
  },
  MOD_COM: {
    id: "MOD_COM",
    name: "AUTOSAR COM / PduR (PNC Signal Routing)",
    layer: "Communication Services",
    role: "Chuyên trách truyền nhận vector bit PNC (TX PN Signal nhúng vào user data của gói NM, và nhận Rx EIRA / ERA Signal đưa vào ComM).",
    inputs: "Nhận Com_SendSignal(TxSignalId, &PncBitVector) khi ComM cập nhật trạng thái PNC_REQUESTED; nhận UserData gói NM từ bus.",
    processing: "Cập nhật EIRA (gộp Internal+External) và ERA (External từng kênh) khi có NM PDU đến hoặc hết PN Reset Timer.",
    outputs: "Trigger callback ComM_COMCbk_<SignalId>() vào ComM để đọc Com_ReceiveSignal() cập nhật PNC State Machine.",
    apis: ["Com_SendSignal(SignalId, DataPtr)", "Com_ReceiveSignal(SignalId, DataPtr)", "ComM_COMCbk()"]
  },
  MOD_NVM: {
    id: "MOD_NVM",
    name: "NvM (Non-Volatile Memory Manager)",
    layer: "Memory Services (BSW)",
    role: "Lưu trữ bền vững các dữ liệu quản trị của ComM qua chu kỳ tắt nguồn: InhibitCounter, ECUGroupClassification và cờ NoWakeup của từng kênh.",
    inputs: "Nhận ComM_NvM_Block ram mirror và lệnh đánh dấu bẩn NvM_SetRamBlockStatus(BlockId, TRUE).",
    processing: "Đọc dữ liệu lúc EcuM Startup (ReadAll) và ghi xuống Flash/EEPROM lúc ECU Shutdown (WriteAll).",
    outputs: "Khôi phục giá trị ComMNoWakeup & ComMInhibitCounter cho ComM trong ComM_Init().",
    apis: ["NvM_SetRamBlockStatus(BlockId, TRUE)", "ComM_ReadInhibitCounter(&Val)", "ComM_ResetInhibitCounter()"]
  },
  MOD_DET: {
    id: "MOD_DET",
    name: "DET (Default Error Tracer)",
    layer: "Diagnostic / Debug Services",
    role: "Ghi nhận và báo cáo các lỗi phát triển/tham số khi ComMDevErrorDetect = TRUE để kỹ sư tích hợp BSW phát hiện lỗi gọi sai API.",
    inputs: "Nhận Det_ReportError(ModuleId=12, InstanceId, ApiId, ErrorId) từ ComM.",
    processing: "Phân loại mã lỗi: COMM_E_UNINIT (0x01), COMM_E_WRONG_PARAMETERS (0x02), COMM_E_PARAM_POINTER (0x03), COMM_E_INIT_FAILED (0x04).",
    outputs: "Lưu log lỗi vào buffer debug hoặc kích hoạt hook dừng CPU trong môi trường phát triển.",
    apis: ["Det_ReportError(12, 0, ApiId, ErrorId)", "COMM_E_UNINIT (0x01)", "COMM_E_WRONG_PARAMETERS (0x02)"]
  }
};

const ABBREVIATIONS_DATA = [
  { abbr: "ComM", cat: "CORE", full: "Communication Manager", vi: "Bộ quản lý truyền thông ECU", desc: "Module BSW tầng System Services làm nhạc trưởng phân xử mọi yêu cầu truyền thông xuống BusSM và Nm.", sws: "SWS_ComM_00001" },
  { abbr: "ComMUser", cat: "CORE", full: "Communication Manager User", vi: "Người dùng logic đại diện SWC", desc: "Thực thể đại diện cho 1 hoặc nhóm SWC gọi RequestComMode mà không phụ thuộc phần cứng kênh vật lý.", sws: "SWS_ComM_00110" },
  { abbr: "ComMChannel", cat: "CORE", full: "Communication Manager Channel", vi: "Kênh mạng logic trong ComM", desc: "Đại diện cho một bus vật lý (CAN, ETH, FR, LIN) hoặc INTERNAL với máy trạng thái riêng.", sws: "SWS_ComM_00565" },
  { abbr: "FULL_COM", cat: "CORE", full: "COMM_FULL_COMMUNICATION", vi: "Chế độ truyền thông đầy đủ", desc: "Cho phép truyền và nhận cả Application PDU lẫn NM PDU bình thường trên bus.", sws: "SWS_ComM_00068" },
  { abbr: "SILENT_COM", cat: "CORE", full: "COMM_SILENT_COMMUNICATION", vi: "Chế độ truyền thông im lặng", desc: "Bus chỉ được phép nhận (Rx), cấm truyền (Tx) trong pha PrepareBusSleep của CanNm.", sws: "SWS_ComM_00067" },
  { abbr: "NO_COM", cat: "CORE", full: "COMM_NO_COMMUNICATION", vi: "Chế độ tắt truyền thông", desc: "Không cho phép Rx và Tx; Transceiver/Controller đưa về ngủ/dừng.", sws: "SWS_ComM_00066" },
  { abbr: "NO_COM_NO_PENDING_REQ", cat: "CORE", full: "COMM_NO_COM_NO_PENDING_REQUEST", vi: "Ngủ hẳn không có yêu cầu chờ", desc: "Sub-state ổn định của NO_COM khi không có User request hay Wakeup pending.", sws: "SWS_ComM_00298" },
  { abbr: "NO_COM_REQ_PENDING", cat: "CORE", full: "COMM_NO_COM_REQUEST_PENDING", vi: "Ngủ nhưng đang giữ yêu cầu chờ", desc: "Sub-state trung gian khi có User/Wakeup muốn vào FULL_COM nhưng CommunicationAllowed vẫn là FALSE.", sws: "SWS_ComM_00895" },
  { abbr: "FULL_COM_NET_REQ", cat: "CORE", full: "COMM_FULL_COM_NETWORK_REQUESTED", vi: "FULL_COM đang có chủ thể giữ mạng", desc: "Sub-state khi có User, DCM hoặc TMinFullComModeDuration đang giữ mạng chủ động.", sws: "SWS_ComM_00298" },
  { abbr: "FULL_COM_READY_SLEEP", cat: "CORE", full: "COMM_FULL_COM_READY_SLEEP", vi: "FULL_COM sẵn sàng nhả mạng ngủ", desc: "Sub-state khi tất cả User đã release; đã gọi Nm_NetworkRelease hoặc đang đếm NmLightTimeout.", sws: "SWS_ComM_00889" },
  { abbr: "ComMNmVariant", cat: "CORE", full: "ComM Network Management Variant", vi: "Biến thể quản lý mạng của kênh", desc: "Cấu hình cách phối hợp NM của kênh: FULL, LIGHT, PASSIVE hoặc NONE.", sws: "SWS_ComM_00568" },
  { abbr: "NM FULL", cat: "CORE", full: "ComMNmVariant = FULL", vi: "Biến thể dùng NM đầy đủ", desc: "Kênh sử dụng đầy đủ API Nm_NetworkRequest/Release và có trạng thái SILENT_COM.", sws: "SWS_ComM_00667" },
  { abbr: "NM LIGHT", cat: "CORE", full: "ComMNmVariant = LIGHT", vi: "Biến thể NM nhẹ dùng Timer", desc: "Không dùng module Nm/CanNm; sau TMinFull tự đếm ComMNmLightTimeout trong READY_SLEEP để tắt về NO_COM.", sws: "SWS_ComM_00610" },
  { abbr: "NM PASSIVE", cat: "CORE", full: "ComMNmVariant = PASSIVE", vi: "Biến thể chỉ nghe mạng (không xin mạng)", desc: "ECU chỉ thức sang READY_SLEEP khi nhận wakeup từ bus, không được phát gói NM chủ động.", sws: "SWS_ComM_00667" },
  { abbr: "NM NONE", cat: "CORE", full: "ComMNmVariant = NONE", vi: "Biến thể không dùng NM", desc: "Không có NM và không qua SILENT_COM; User nhả hết sau TMinFull sẽ tắt thẳng về NO_COM.", sws: "SWS_ComM_00667" },
  { abbr: "TMinFullCom", cat: "CORE", full: "ComMTMinFullComModeDuration", vi: "Thời gian giữ FULL_COM tối thiểu", desc: "Đảm bảo kênh LIGHT/NONE ở FULL_COM_NETWORK_REQUESTED đủ lâu để tránh bật/tắt bus quá nhanh.", sws: "SWS_ComM_00564" },
  { abbr: "NmLightTimeout", cat: "CORE", full: "ComMNmLightTimeout", vi: "Timer chờ ngủ biến thể LIGHT", desc: "Khoảng thời gian trễ ở FULL_COM_READY_SLEEP trước khi tắt kênh biến thể LIGHT xuống NO_COM.", sws: "SWS_ComM_00569" },
  { abbr: "Mode Arbitration", cat: "CORE", full: "Highest Requested Mode Arbitration", vi: "Bộ phân xử yêu cầu đa chủ thể", desc: "Thuật toán chọn trạng thái cao nhất (FULL > NO_COM) từ tất cả User, PNC và DCM.", sws: "SWS_ComM_00297" },
  { abbr: "CommAllowed", cat: "CORE", full: "ComM_CommunicationAllowed", vi: "Cổng cho phép truyền thông (Gatekeeper)", desc: "API do EcuM/BswM gọi để mở khóa chuyển từ NO_COM_REQUEST_PENDING sang FULL_COM.", sws: "SWS_ComM_00871" },
  { abbr: "SyncWakeUp", cat: "CORE", full: "ComMSynchronousWakeUp", vi: "Đánh thức đồng loạt đa kênh", desc: "Cơ chế một sự kiện EcuM_WakeUpIndication trên 1 kênh làm tất cả kênh khác cùng wakeup.", sws: "SWS_ComM_00695" },
  { abbr: "MainFunction", cat: "CORE", full: "ComM_MainFunction_<Channel>", vi: "Hàm tác vụ định kỳ của kênh", desc: "Được SchM gọi mỗi 10-20ms để giảm các timer và thực thi chuyển trạng thái Channel & PNC.", sws: "SWS_ComM_00429" },
  { abbr: "Mode Inhibition", cat: "INHIB", full: "Communication Mode Inhibition", vi: "Cơ chế ức chế / hạn chế truyền thông", desc: "Tập hợp 2 tính năng NoWakeup và LimitToNoCom nhằm tiết kiệm ắc quy hoặc bảo vệ xe.", sws: "SWS_ComM_00163" },
  { abbr: "NoWakeup", cat: "INHIB", full: "ComM_PreventWakeUp (Wake-up Inhibition)", vi: "Cấm User chủ động đánh thức mạng", desc: "Bit 0 (0x01) của ComM_InhibitionStatusType; chặn User wakeup kênh đang ở NO_COM/SILENT_COM.", sws: "SWS_ComM_00305" },
  { abbr: "LimitToNoCom", cat: "INHIB", full: "ComM_LimitChannelToNoComMode", vi: "Cưỡng bức tắt kênh về NO_COM", desc: "Bit 1 (0x02) của ComM_InhibitionStatusType; ép kênh nhả mạng ngay cả khi User đang xin FULL_COM.", sws: "SWS_ComM_00163" },
  { abbr: "LimitECU", cat: "INHIB", full: "ComM_LimitECUToNoComMode", vi: "Cưỡng bức tắt toàn bộ ECU về NO_COM", desc: "Áp dụng LimitToNoCom đồng loạt cho tất cả các kênh cấu hình trên ECU.", sws: "SWS_ComM_00124" },
  { abbr: "InhibStatus", cat: "INHIB", full: "ComM_InhibitionStatusType", vi: "Byte trạng thái ức chế 2 bit", desc: "Bit 0 = Wake-up Inhibition active (0x01); Bit 1 = Limit to NO_COM active (0x02).", sws: "SWS_ComM_00669" },
  { abbr: "Classification", cat: "INHIB", full: "ComMEcuGroupClassification", vi: "Mặt nạ cho phép các bit Inhibition", desc: "Byte cấu hình global: Bit 0 cho phép NoWakeup, Bit 1 cho phép LimitToNoCom.", sws: "SWS_ComM_00559" },
  { abbr: "InhibitCounter", cat: "INHIB", full: "ComMInhibitCounter", vi: "Bộ đếm số lần yêu cầu bị ức chế", desc: "Tăng lên mỗi khi FULL_COM request của User bị Mode Inhibition từ chối; lưu xuống NvM.", sws: "SWS_ComM_00141" },
  { abbr: "DCM", cat: "INHIB", full: "Diagnostic Communication Manager", vi: "Bộ quản lý chẩn đoán UDS", desc: "Quản lý phiên chẩn đoán; giữ quyền tối cao trong ComM để duy trì bus thông suốt khi sửa chữa.", sws: "SWS_ComM_00873" },
  { abbr: "ActiveDiagnostic", cat: "INHIB", full: "ComM_DCM_ActiveDiagnostic", vi: "API bật quyền tối cao chẩn đoán", desc: "Vượt qua mọi NoWakeup và LimitToNoCom, giữ kênh ở FULL_COM_NETWORK_REQUESTED.", sws: "SWS_ComM_00303" },
  { abbr: "NoWakeupNvM", cat: "INHIB", full: "ComMNoWakeupNvMStorage", vi: "Lưu cờ NoWakeup bền vững vào NvM", desc: "Khi bật, cờ NoWakeup của kênh được đánh dấu NvM_SetRamBlockStatus để giữ sau reset.", sws: "SWS_ComM_00709" },
  { abbr: "PNC", cat: "PN", full: "Partial Network Cluster", vi: "Cụm mạng con bán phần", desc: "Nhóm logic các ECU cần thức cùng lúc cho một chức năng (VD: sạc, mở khóa cửa) trong khi ECU khác vẫn ngủ.", sws: "SWS_ComM_00909" },
  { abbr: "PNC_NO_COM", cat: "PN", full: "COMM_PNC_NO_COMMUNICATION", vi: "PNC đang tắt hoàn toàn", desc: "Không có User nội bộ hay ECU nào ngoài bus yêu cầu cụm PNC này.", sws: "SWS_ComM_00909" },
  { abbr: "PNC_REQUESTED", cat: "PN", full: "COMM_PNC_REQUESTED", vi: "PNC được chủ động yêu cầu bật", desc: "User nội bộ hoặc Gateway ACTIVE yêu cầu PNC; ComM bật bit = 1 trong Tx PN Signal và giữ các kênh map.", sws: "SWS_ComM_00930" },
  { abbr: "PNC_READY_SLEEP", cat: "PN", full: "COMM_PNC_READY_SLEEP", vi: "PNC sẵn sàng ngủ (giữ bởi EIRA ngoài)", desc: "Nội bộ đã nhả (hoặc chỉ có Rx EIRA = 1 từ ECU khác); Rx EIRA vẫn duy trì kênh thức mà không tự phát bit PN=1.", sws: "SWS_ComM_00938" },
  { abbr: "PNC_PREP_SLEEP", cat: "PN", full: "COMM_PNC_PREPARE_SLEEP", vi: "PNC chuẩn bị ngủ đếm timer", desc: "Sau khi cả internal request & Rx EIRA = 0, chạy ComMPncPrepareSleepTimer trước khi về PNC_NO_COM.", sws: "SWS_ComM_00952" },
  { abbr: "PrepSleepTimer", cat: "PN", full: "ComMPncPrepareSleepTimer", vi: "Timer trì hoãn tắt PNC", desc: "Tránh trạng thái chập chờn PNC nếu gói NM đến trễ nhẹ trên bus.", sws: "SWS_ComM_00952" },
  { abbr: "EIRA", cat: "PN", full: "External and Internal Request Array", vi: "Vector bit yêu cầu PNC tổng hợp", desc: "COM gộp yêu cầu nội bộ + bên ngoài bus vào EIRA báo ComM để giữ PNC ở PNC_READY_SLEEP.", sws: "SWS_ComM_00984" },
  { abbr: "ERA", cat: "PN", full: "External Request Array", vi: "Vector yêu cầu PNC bên ngoài từng kênh", desc: "COM báo riêng yêu cầu PNC thu từ ngoài bus của mỗi kênh cho mục đích PNC Gateway routing.", sws: "SWS_ComM_00984" },
  { abbr: "PNC Gateway", cat: "PN", full: "ComMPncGatewayEnabled", vi: "Định tuyến thức/ngủ PNC đa mạng", desc: "Chuyển tiếp yêu cầu PNC qua ERA từ kênh mạng này sang kênh mạng khác trong Gateway ECU.", sws: "SWS_ComM_00942" },
  { abbr: "ACTIVE GW", cat: "PN", full: "COMM_GATEWAY_TYPE_ACTIVE", vi: "Kênh Gateway chủ động", desc: "Có quyền định tuyến ERA sang tất cả kênh khác (cả ACTIVE lẫn PASSIVE).", sws: "SWS_ComM_00943" },
  { abbr: "PASSIVE GW", cat: "PN", full: "COMM_GATEWAY_TYPE_PASSIVE", vi: "Kênh Gateway thụ động", desc: "Chỉ định tuyến ERA sang kênh ACTIVE; bị cấm chuyển sang kênh PASSIVE khác để chống routing loop.", sws: "SWS_ComM_00944" },
  { abbr: "SyncPncShutdown", cat: "PN", full: "Synchronized PNC Shutdown", vi: "Tắt cụm PNC đồng bộ toàn mạng", desc: "Từ R21-11+: ComM coordinator phối hợp BusNm để tắt cùng lúc các ECU tham gia cụm PNC.", sws: "SWS_ComM_01059" },
  { abbr: "PncInfoOffset", cat: "PN", full: "ComMPncInfoOffset", vi: "Vị trí byte bắt đầu vector PNC trong NM", desc: "Offset (thường = 2 byte đầu CanNm PDU) để tính Byte/Bit cho PNC_ID.", sws: "ECUC_ComM_00950" },
  { abbr: "BusSM", cat: "STACK", full: "Bus State Manager (CanSM/EthSM/FrSM/LinSM)", vi: "Bộ quản lý trạng thái vật lý bus", desc: "Nhận BusSM_RequestComMode từ ComM và báo ngược ComM_BusSM_ModeIndication khi phần cứng hoàn tất.", sws: "SWS_ComM_00675" },
  { abbr: "EcuM", cat: "STACK", full: "ECU State Manager", vi: "Bộ quản lý vòng đời ECU", desc: "Gọi ComM_Init, thông báo wakeup sự kiện và mở khóa CommunicationAllowed.", sws: "SWS_ComM_00895" },
  { abbr: "BswM", cat: "STACK", full: "Basic Software Mode Manager", vi: "Bộ điều phối chế độ BSW", desc: "Nhận BswM_ComM_CurrentMode để bật/tắt I-PDU Group trong COM, Router và PDU routing.", sws: "SWS_ComM_00976" },
  { abbr: "AUTOSAR COM", cat: "STACK", full: "AUTOSAR Communication Module", vi: "Module truyền nhận tín hiệu & PDU", desc: "Truyền Tx PN Signal do ComM gửi và đẩy callback EIRA/ERA khi có dữ liệu PNC từ bus.", sws: "SWS_ComM_00974" },
  { abbr: "NvM", cat: "STACK", full: "Non-Volatile Memory Manager", vi: "Quản lý bộ nhớ không bay hơi Flash/EEPROM", desc: "Lưu InhibitCounter & NoWakeup giữa các chu kỳ tắt nguồn ECU.", sws: "SWS_ComM_00302" },
  { abbr: "DET", cat: "STACK", full: "Default Error Tracer", vi: "Bộ bắt lỗi phát triển & sai tham số", desc: "Nhận báo lỗi COMM_E_UNINIT (0x01), COMM_E_WRONG_PARAMETERS (0x02), COMM_E_PARAM_POINTER (0x03).", sws: "SWS_ComM_00234" }
];
