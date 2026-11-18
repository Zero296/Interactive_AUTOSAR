// ================= PART 3: CONSTANTS, BITFIELDS, CONFIG TOOLTIPS, MODULE METADATA & GLOSSARY =================

const COMM_CH_BITS = [
  { bit: 7, mask: 0x80, tag: "USER_FULL",   name: "USER_FULL_REQ",     tone: "",     desc: "Ít nhất một ComMUser trực tiếp hoặc PNC ở COMM_PNC_REQUESTED yêu cầu kênh vào FULL_COM (SWS_ComM_01069)." },
  { bit: 6, mask: 0x40, tag: "DCM_DIAG",    name: "DCM_DIAG_ACTIVE",   tone: "warn", desc: "ComM_DCM_ActiveDiagnostic(Ch) đang bật (SWS_ComM_00873). Quyền tối cao giữ kênh FULL_COM bất chấp Mode Inhibition." },
  { bit: 5, mask: 0x20, tag: "WAKEUP_PEND", name: "WAKEUP_PENDING",    tone: "warn", desc: "Đang ở NO_COM_REQUEST_PENDING (SWS_ComM_00895): có User/DCM hoặc Passive Wakeup nhưng đang đợi CommunicationAllowed == TRUE." },
  { bit: 4, mask: 0x10, tag: "COMM_ALLOW",  name: "COMM_ALLOWED",      tone: "",     desc: "Cờ Gatekeeper ComM_CommunicationAllowed(Ch, TRUE) do EcuM/BswM mở khóa (mặc định FALSE sau Init, SWS_ComM_00884)." },
  { bit: 3, mask: 0x08, tag: "T_MIN_FULL",  name: "T_MIN_FULL_RUN",    tone: "warn", desc: "Timer ComMTMinFullComModeDuration đang chạy (giữ kênh ở FULL_COM_NETWORK_REQUESTED cho LIGHT / NONE, bị hủy ngay khi Limit NO_COM, SWS_ComM_00890)." },
  { bit: 2, mask: 0x04, tag: "NM_LIGHT_TM", name: "NM_LIGHT_TMR_RUN",  tone: "warn", desc: "Timer ComMNmLightTimeout đang đếm ngược trong FULL_COM_READY_SLEEP (LIGHT) trước khi chuyển NO_COM (SWS_ComM_00891)." },
  { bit: 1, mask: 0x02, tag: "BUSSM",       name: "BUSSM_FULL_IND",    tone: "",     desc: "Đã nhận ComM_<Bus>SM_ModeIndication(Ch, COMM_FULL_COMMUNICATION) (SWS_ComM_00675) hoặc kênh COMM_BUS_TYPE_INTERNAL." },
  { bit: 0, mask: 0x01, tag: "NMREQ",       name: "NM_NET_REQ_ACTIVE", tone: "",     desc: "Đang ở COMM_FULL_COM_NETWORK_REQUESTED (SWS_ComM_00880): gọi Nm_NetworkRequest (active) hoặc Nm_PassiveStartUp (passive wakeup)." }
];

const COMM_INHIB_BITS = [
  { bit: 7, mask: 0x80, tag: "COMM_INIT",   name: "COMM_INITIALIZED",   tone: "",     desc: "ComM_Init() đã hoàn thành (COMM_INIT, SWS_ComM_00313). Nếu bit = 0 (COMM_UNINIT), mọi API bắn DET COMM_E_UNINIT (0x01)." },
  { bit: 6, mask: 0x40, tag: "INHIB_CNT",   name: "INHIBIT_CNT_INC",    tone: "warn", desc: "Có yêu cầu FULL_COM bị Mode Inhibition chặn (trả COMM_E_MODE_LIMITATION); ComMInhibitCounter > 0, tối đa 65535 (SWS_ComM_00142)." },
  { bit: 5, mask: 0x20, tag: "PNC_PREP_TM", name: "PNC_PREP_SLEEP_RUN", tone: "warn", desc: "Timer ComMPncPrepareSleepTimer đang đếm ngược trong COMM_PNC_PREPARE_SLEEP (SWS_ComM_00952)." },
  { bit: 4, mask: 0x10, tag: "PNC_GW_ACTV", name: "PNC_GW_ROUTING",     tone: "",     desc: "ComMPncGatewayEnabled = TRUE và đang tính Tx IRA từng kênh từ ERA (ACTIVE / PASSIVE) via Nm_UpdateIRA (SWS_ComM_01072)." },
  { bit: 3, mask: 0x08, tag: "ECU_LIM_NC",  name: "ECU_LIMIT_NOCOM",    tone: "err",  desc: "ComM_LimitECUToNoComMode(TRUE) đang hiệu lực toàn cục cho tất cả kênh trên ECU (SWS_ComM_00124)." },
  { bit: 2, mask: 0x04, tag: "SYNC_WAKEUP", name: "SYNC_WAKEUP_ACTV",   tone: "",     desc: "ComMSynchronousWakeUp đã kích hoạt đánh thức đồng loạt nhiều kênh từ sự kiện wakeup (SWS_ComM_00694, SWS_ComM_01063)." },
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
    sws: "SWS_ComM_00313 · SWS_ComM_00884 · SWS_ComM_00794",
    range: "COMM_UNINIT (false) | COMM_INIT (true)",
    role: "Trạng thái khởi tạo toàn cục của module ComM sau khi EcuM gọi ComM_Init().",
    mechanism: "ComM_Init() luôn khởi tạo mọi kênh ở NO_COM_NO_PENDING_REQUEST và CommunicationAllowed = FALSE (SWS_ComM_00884). Nếu chưa Init (false), API trừ Init/GetStatus bắn DET COMM_E_UNINIT (0x01). ComM_DeInit() chỉ thành công khi tất cả kênh đang ở NO_COM_NO_PENDING_REQUEST (SWS_ComM_00794).",
    scenarioImpact: "Kiểm chứng Init/DeInit và bẫy lỗi COMM_E_UNINIT trong kịch bản S1 và S14."
  },
  ComMDevErrorDetect: {
    title: "ComMDevErrorDetect",
    ecucPath: "ComMGeneral / ComMDevErrorDetect",
    sws: "ECUC_ComM_00555 · SWS_ComM_00234 · SWS_ComM_00858",
    range: "boolean (true | false)",
    role: "Bật/tắt cơ chế phát hiện lỗi phát triển (DET) trong ComM.",
    mechanism: "Khi true, ComM kiểm tra NULL_PTR, UNINIT, WRONG_PARAMETERS (UserId/ChannelId/ComMode sai) và gọi Det_ReportError(COMM_MODULE_ID=12).",
    scenarioImpact: "Tắt DET sẽ khiến lời gọi sai tham số im lặng bỏ qua thay vì ghi nhận lỗi ở khối DET (S14)."
  },
  ComMVersionInfoApi: {
    title: "ComMVersionInfoApi",
    ecucPath: "ComMGeneral / ComMVersionInfoApi",
    sws: "ECUC_ComM_00622 · SWS_ComM_00370",
    range: "boolean (true | false)",
    role: "Biên dịch và kích hoạt hàm ComM_GetVersionInfo(Std_VersionInfoType* VersionInfoPtr).",
    mechanism: "Ảnh hưởng trực tiếp tới macro #define COMM_VERSION_INFO_API STD_ON/OFF khi xuất file ComM_Cfg.h.",
    scenarioImpact: "Bật lên để thấy macro STD_ON được sinh trong tab Export ComM_Cfg.h."
  },
  ComMModeLimitationEnabled: {
    title: "ComMModeLimitationEnabled",
    ecucPath: "ComMGeneral / ComMModeLimitationEnabled",
    sws: "ECUC_ComM_00560 · SWS_ComM_00800 · SWS_ComM_00801",
    range: "boolean (true | false)",
    role: "Pre-compile switch cho phép dùng ComM_LimitChannelToNoComMode() và ComM_LimitECUToNoComMode().",
    mechanism: "Nếu false, các hàm Limit To NO_COM bị vô hiệu hóa / trả E_NOT_OK, bit 1 của InhibitStatus luôn bằng 0.",
    scenarioImpact: "Liên quan trực tiếp tới kịch bản S9 (Limit to NO_COM)."
  },
  ComMWakeupInhibitionEnabled: {
    title: "ComMWakeupInhibitionEnabled",
    ecucPath: "ComMGeneral / ComMWakeupInhibitionEnabled",
    sws: "ECUC_ComM_00559 · SWS_ComM_00799",
    range: "boolean (true | false)",
    role: "Pre-compile switch cho phép tính năng Wake-up Inhibition (ComM_PreventWakeUp).",
    mechanism: "Khi true, ComM cho phép chặn các SWC User đánh thức kênh đang ở NO_COM hoặc SILENT_COM (Bit 0 = 1).",
    scenarioImpact: "Tác động trực tiếp trong kịch bản S8 (Wake-up Inhibition & InhibitCounter)."
  },
  ComMSynchronousWakeUp: {
    title: "ComMSynchronousWakeUp",
    ecucPath: "ComMGeneral / ComMSynchronousWakeUp",
    sws: "ECUC_ComM_00695 · SWS_ComM_00694 · SWS_ComM_01063",
    range: "boolean (true | false)",
    role: "Cho phép một sự kiện EcuM/Nm Wakeup hoặc User Request (tùy điều kiện) đánh thức đồng loạt nhiều kênh sang NO_COM_REQUEST_PENDING.",
    mechanism: "Theo SWS_ComM_01063, nếu ECU có PNC không map kênh nào hoặc đang ở chế độ sync wakeup, EcuM_WakeUpIndication bật pending trên các kênh còn lại (nếu chưa tắt bởi Inhibition).",
    scenarioImpact: "Bật/tắt trong kịch bản S6 để thấy Ch1 cùng chuyển NO_COM_REQUEST_PENDING theo Ch0 hay giữ nguyên."
  },
  ComMTMinFullComModeDuration: {
    title: "ComMTMinFullComModeDuration",
    ecucPath: "ComMGeneral / ComMTMinFullComModeDuration",
    sws: "ECUC_ComM_00557 · SWS_ComM_00886 · SWS_ComM_00889 · SWS_ComM_00890",
    range: "float/ms (default 500 ms)",
    role: "Thời gian tối thiểu kênh (biến thể LIGHT/NONE) phải giữ trong COMM_FULL_COM_NETWORK_REQUESTED.",
    mechanism: "Giữ kênh ở NETWORK_REQUESTED kể cả khi User đã nhả về NO_COM sớm. Tuy nhiên theo SWS_ComM_00890, nếu LimitToNoCom kích hoạt, timer bị HỦY NGAY LẬP TỨC.",
    scenarioImpact: "Trọng tâm kịch bản S3 (Multi-User Arbitration & TMinFullComModeDuration)."
  },
  ComMChannelId: {
    title: "ComMChannelId",
    ecucPath: "ComMConfigSet / ComMChannel / ComMChannelId",
    sws: "ECUC_ComM_00635",
    range: "NetworkHandleType (0..255)",
    role: "Định danh logic duy nhất (NetworkHandleType) của kênh truyền thông đang quan sát trong ComM.",
    mechanism: "Mỗi kênh vật lý (CAN0, CAN1, ETH0...) có 1 ChannelId ánh xạ xuống CanSM/EthSM/FrSM/LinSM và Nm.",
    scenarioImpact: "Hiển thị nhãn kênh hiện tại và ánh xạ vào cấu trúc ComM_Lcfg.c."
  },
  ComMBusType: {
    title: "ComMBusType",
    ecucPath: "ComMConfigSet / ComMChannel / ComMBusType",
    sws: "ECUC_ComM_00567 · SWS_ComM_00962 · SWS_ComM_00664",
    range: "CAN | ETH | FR | LIN | INTERNAL",
    role: "Loại bus bên dưới kênh để ComM ánh xạ tới đúng <Bus>SM (CanSM, EthSM, FrSM, LinSM).",
    mechanism: "Theo SWS_ComM_00664, với COMM_BUS_TYPE_INTERNAL không tồn tại <Bus>SM bên dưới nên ComM không gọi <Bus>SM_RequestComMode và chuyển mode nội bộ ngay.",
    scenarioImpact: "Đổi thành INTERNAL trong What-If để thấy ComM bỏ qua bắt tay BusSM."
  },
  ComMMainFunctionPeriod: {
    title: "ComMMainFunctionPeriod",
    ecucPath: "ComMConfigSet / ComMChannel / ComMMainFunctionPeriod",
    sws: "ECUC_ComM_00556 · SWS_ComM_00429 · SWS_ComM_00978",
    range: "float/ms (5 .. 100 ms, điển hình 10ms hoặc 20ms)",
    role: "Chu kỳ SchM/OS gọi định kỳ hàm ComM_MainFunction_<Channel>().",
    mechanism: "Mọi bộ đếm timer, phân xử chuyển trạng thái kênh và các chuyển pha PNC từ ComM_RequestComMode (SWS_ComM_00978) được thực thi trong MainFunction.",
    scenarioImpact: "Quyết định độ phân giải mỗi lần bấm '+20ms Tick' hoặc Auto Clock."
  },
  ComMNmVariant: {
    title: "ComMNmVariant",
    ecucPath: "ComMChannel / ComMNetworkManagement / ComMNmVariant",
    sws: "ECUC_ComM_00568 · SWS_ComM_00599 · SWS_ComM_01017 · SWS_ComM_01018",
    range: "FULL | LIGHT | PASSIVE | SLAVE_ACTIVE | SLAVE_PASSIVE | NONE",
    role: "Chiến lược quản lý mạng (NM) quyết định cấu trúc máy trạng thái của kênh (SWS_ComM_00599).",
    mechanism: "FULL: NM đầy đủ. LIGHT: dùng TMinFull + NmLightTimeout, không SILENT_COM. PASSIVE: chỉ nghe NM, vào READY_SLEEP sau TMin/Startup (không phát Nm_NetworkRequest). SLAVE_ACTIVE / SLAVE_PASSIVE (LIN/Slave): giữ kênh qua BusSM và đợi ComM_<Bus>SM_BusSleepMode(). NONE: không NM, giữ READY_SLEEP vô hạn (trừ INTERNAL về NO_COM).",
    scenarioImpact: "Thay đổi luồng trong S2/S4 (FULL), S5 (LIGHT), S7 (PASSIVE / SLAVE_ACTIVE)."
  },
  ComMNmLightTimeout: {
    title: "ComMNmLightTimeout",
    ecucPath: "ComMChannel / ComMNetworkManagement / ComMNmLightTimeout",
    sws: "ECUC_ComM_00606 · SWS_ComM_00891 · SWS_ComM_00610",
    range: "float/ms (0 .. 65000 ms, default 1000 ms)",
    role: "Thời gian chờ ở FULL_COM_READY_SLEEP dành riêng cho biến thể ComMNmVariant = LIGHT.",
    mechanism: "Sau khi TMinFull kết thúc và kênh sang READY_SLEEP, NmLightTimeout đếm về 0 rồi ComM tự tắt bus về NO_COM mà không đi qua SILENT_COM (SWS_ComM_00891).",
    scenarioImpact: "Là cơ chế trung tâm của kịch bản S5."
  },
  ComMPncNmRequest: {
    title: "ComMPncNmRequest",
    ecucPath: "ComMChannel / ComMNetworkManagement / ComMPncNmRequest",
    sws: "ECUC_ComM_00886 · SWS_ComM_00980",
    range: "boolean (true | false)",
    role: "Khi TRUE và bất kỳ PNC nào map vào kênh này chuyển sang COMM_PNC_REQUESTED, ComM gọi Nm_NetworkRequest() ngay dù kênh đang giữ mạng từ trước (SWS_ComM_00980).",
    mechanism: "Giúp CanNm gửi lại gói NM frame với bit PNC vừa bật ngay lập tức cho các ECU khác trên bus.",
    scenarioImpact: "Ghi nhận lời gọi Nm_NetworkRequest bổ sung trong API Trace ở S11/S12."
  },
  ComMFullCommRequestNotificationEnabled: {
    title: "ComMFullCommRequestNotificationEnabled",
    ecucPath: "ComMChannel / ComMFullCommRequestNotificationEnabled",
    sws: "ECUC_ComM_00787 · SWS_ComM_00734 · SWS_ComM_00736",
    range: "boolean (true | false)",
    role: "Cho phép thông báo danh sách User đang xin FULL_COM qua SenderReceiver port khi kênh đang bị Mode Inhibition.",
    mechanism: "Giúp ứng dụng biết User nào đang giữ ý định yêu cầu truyền thông (VD: khi PreventWakeUp vẫn lưu User request, SWS_ComM_00839).",
    scenarioImpact: "Hiển thị thông tin trạng thái chờ của User trong Inspector."
  },
  User0_RequestMode: {
    title: "User 0 (SWC_DiagApp) Request Mode",
    ecucPath: "ComMConfigSet / ComMUser_0 → ComM_RequestComMode(0, Mode)",
    sws: "SWS_ComM_00110 · SWS_ComM_00979 · SWS_ComM_00582",
    range: "COMM_NO_COMMUNICATION | COMM_FULL_COMMUNICATION",
    role: "Chế độ truyền thông mà SWC User 0 (mapped tới Ch0) đang yêu cầu vào ComM.",
    mechanism: "ComM lưu yêu cầu vào UserReqArray[] rồi OR phân xử. Lưu ý: LimitToNoCom (SWS_ComM_00582) sẽ XÓA yêu cầu này về NO_COM; còn PreventWakeUp (SWS_ComM_00839) vẫn GIỮ LẠI yêu cầu để kích hoạt ngay khi bỏ ức chế!",
    scenarioImpact: "Dùng trong S2, S3, S4, S8, S9 để mô phỏng 1 hoặc nhiều User cùng đòi mạng."
  },
  User1_RequestMode: {
    title: "User 1 (SWC_BodyCtrl) Request Mode",
    ecucPath: "ComMConfigSet / ComMUser_1 → ComM_RequestComMode(1, Mode)",
    sws: "SWS_ComM_00110 · SWS_ComM_00871",
    range: "COMM_NO_COMMUNICATION | COMM_FULL_COMMUNICATION",
    role: "Chế độ truyền thông mà SWC User 1 (cùng map tới Ch0) đang yêu cầu.",
    mechanism: "Minh họa Multi-User Arbitration: chỉ cần User 0 HOẶC User 1 vẫn xin FULL_COM thì kênh Ch0 chưa thể sang READY_SLEEP.",
    scenarioImpact: "Cốt lõi của kịch bản S3 & S4."
  },
  User2_Pnc16RequestMode: {
    title: "User 2 (SWC_PncPower → PNC #16) Request",
    ecucPath: "ComMConfigSet / ComMUser_2 → ComM_RequestComMode(2, Mode)",
    sws: "SWS_ComM_00932 · SWS_ComM_00978 · SWS_ComM_01069",
    range: "COMM_NO_COMMUNICATION | COMM_FULL_COMMUNICATION",
    role: "User 2 được map vào cụm Partial Network PNC #16 (qua đó điều khiển cả Ch0 và Ch1 qua ComMChannelPerPnc).",
    mechanism: "Theo SWS_ComM_00978, ComM_RequestComMode() cho User map PNC KHÔNG đổi trạng thái PNC ngay mà được thực thi trong ComM_MainFunction kế tiếp (+20ms Tick): PNC #16 sang PNC_REQUESTED, gọi Nm_UpdateIRA(bit0=1) và xin FULL_COM trên Ch0, Ch1 (SWS_ComM_01069).",
    scenarioImpact: "Trung tâm của kịch bản S11."
  },
  ComMCommunicationAllowedFlag: {
    title: "ComM_CommunicationAllowed(Ch0, Allowed)",
    ecucPath: "Runtime API: EcuM/BswM → ComM_CommunicationAllowed()",
    sws: "SWS_ComM_00871 · SWS_ComM_00884 · SWS_ComM_00895",
    range: "boolean (TRUE | FALSE, Init = FALSE)",
    role: "Chốt chặn (Gatekeeper) cho biết nguồn phần cứng, Transceiver và Stack đã sẵn sàng giao tiếp hay chưa.",
    mechanism: "Theo SWS_ComM_00884, luôn = FALSE lúc Init. Khi FALSE, User/Wakeup chỉ đưa kênh từ NO_COM_NO_PENDING_REQUEST sang NO_COM_REQUEST_PENDING rồi đợi (SWS_ComM_00895). Khi đang ở SILENT_COM, CommunicationAllowed được BỎ QUA (SWS_ComM_00896) vì chỉ kiểm tra tại NO_COM_REQUEST_PENDING.",
    scenarioImpact: "Điều phối chuyển pha trong S1, S6, và bẫy kẹt chờ trong S14."
  },
  ComMDcmDiagnosticActiveFlag: {
    title: "ComM_DCM_ActiveDiagnostic(Ch0)",
    ecucPath: "Runtime API: DCM → ComM_DCM_ActiveDiagnostic / InactiveDiagnostic",
    sws: "SWS_ComM_00873 · SWS_ComM_00874 · SWS_ComM_00866 · SWS_ComM_00303",
    range: "boolean (TRUE = Active | FALSE = Inactive)",
    role: "Tín hiệu từ module DCM báo có phiên chẩn đoán UDS đang hoạt động.",
    mechanism: "Quyền TỐI CAO: Vượt qua tất cả Mode Inhibition (NoWakeup và LimitToNoCom), ép kênh giữ FULL_COM_NETWORK_REQUESTED. Khi kênh vào/ra FULL_COM/SILENT_COM/NO_COM, ComM báo ngược Dcm_ComM_*ModeEntered(). Nếu NmVariant = PASSIVE, DCM Active bị bỏ qua theo bảng SWS.",
    scenarioImpact: "Trung tâm của kịch bản S10."
  },
  SimulateBusSmIndicationDelay: {
    title: "Simulated BusSM Mode Indication Delay",
    ecucPath: "Simulation Timing / <Bus>SM_RequestComMode ↔ ComM_<Bus>SM_ModeIndication",
    sws: "SWS_ComM_00675 · SWS_ComM_00828 · SWS_ComM_00664",
    range: "uint32 (0 .. 5000 ms, default 20 ms)",
    role: "Độ trễ mô phỏng từ lúc ComM gọi <Bus>SM_RequestComMode() cho đến khi BusSM gọi lại ComM_<Bus>SM_ModeIndication(Channel, ComMode) (truyền giá trị, KHÔNG phải con trỏ).",
    mechanism: "ComM không báo Rte_Switch(FULL_COM) hoặc Dcm_ComM_FullComModeEntered() trước khi nhận BusSM_ModeIndication(). Với COMM_BUS_TYPE_INTERNAL không có BusSM (SWS_ComM_00664).",
    scenarioImpact: "Minh họa cơ chế bắt tay bất đồng bộ ở S2 và lỗi treo BusSM ở S14."
  },
  ComMNoWakeup: {
    title: "ComMNoWakeup (ComM_PreventWakeUp Bit 0)",
    ecucPath: "ComMChannel / ComMNoWakeup (Runtime: ComM_PreventWakeUp(Ch, Status))",
    sws: "ECUC_ComM_00569 · SWS_ComM_00218 · SWS_ComM_00219 · SWS_ComM_00839",
    range: "boolean (true | false)",
    role: "Wake-up Inhibition (Bit 0 = 0x01): Chặn SWC User đánh thức kênh đang ở NO_COM hoặc SILENT_COM.",
    mechanism: "Hiệu lực khi (EcuGroupClassification & 0x01) != 0 và ComMWakeupInhibitionEnabled=TRUE. Không ảnh hưởng khi kênh ĐÃ ở FULL_COM (SWS_ComM_00219). Theo SWS_ComM_00839, User request vẫn ĐƯỢC LƯU LẠI (không bị xóa) để tự bật ngay khi tắt PreventWakeUp!",
    scenarioImpact: "Là trọng tâm của kịch bản S8."
  },
  ComMNoCom: {
    title: "ComMNoCom (LimitChannelToNoComMode Bit 1)",
    ecucPath: "ComMChannel / ComMNoCom (Runtime: ComM_LimitChannelToNoComMode(Ch, Status))",
    sws: "ECUC_ComM_00571 · SWS_ComM_00163 · SWS_ComM_00215 · SWS_ComM_00582 · SWS_ComM_00890",
    range: "boolean (true | false)",
    role: "Limit to NO_COM (Bit 1 = 0x02): Cưỡng bức kênh rời NETWORK_REQUESTED, hủy TMinFull ngay lập tức (SWS_ComM_00890) và về NO_COM.",
    mechanism: "Theo SWS_ComM_00582 & SWS_ComM_00215, LimitToNoCom XÓA toàn bộ User request về NO_COMMUNICATION (SWC phải gọi lại sau khi hết limit). Yêu cầu mới trong lúc Limit bị trả COMM_E_MODE_LIMITATION (SWS_ComM_91027) và tăng InhibitCounter.",
    scenarioImpact: "Là trọng tâm của kịch bản S9."
  },
  GlobalLimitEcuToNoCom: {
    title: "ComM_LimitECUToNoComMode (Global ECU)",
    ecucPath: "Runtime API: ComM_LimitECUToNoComMode(Status)",
    sws: "SWS_ComM_00124 · SWS_ComM_00215 · SWS_ComM_00582",
    range: "boolean (true | false)",
    role: "Áp dụng cưỡng bức tắt về NO_COM đồng loạt cho TẤT CẢ các kênh (Ch0 & Ch1) trên toàn ECU.",
    mechanism: "Khi Status=TRUE và Classification Bit 1 bật, toàn bộ kênh xóa User request và thu hồi về NO_COM (trừ kênh đang có DCM ActiveDiagnostic).",
    scenarioImpact: "Kiểm thử tác động đồng loạt trên cả Ch0 và Ch1 trong S9 / What-If."
  },
  ComMEcuGroupClassification: {
    title: "ComMEcuGroupClassification",
    ecucPath: "ComMGeneral / ComMEcuGroupClassification",
    sws: "ECUC_ComM_00563 · SWS_ComM_01102 · SWS_ComM_01103 · SWS_ComM_00669",
    range: "0x00 | 0x01 | 0x02 | 0x03 (2-bit Mask)",
    role: "Mặt nạ toàn cục quyết định việc GỌI API ức chế có được chấp nhận hay không.",
    mechanism: "Bit 0 (0x01) cho phép ComM_PreventWakeUp; Bit 1 (0x02) cho phép ComM_LimitChannel/ECUToNoComMode. Theo SWS_ComM_01102 & SWS_ComM_01103, nếu bit tương ứng = 0, lời gọi API bị TỪ CHỐI với E_NOT_OK; nhưng các ức chế đã kích hoạt trước đó vẫn tiếp tục có hiệu lực (không tự tắt khi đổi Classification).",
    scenarioImpact: "Kiểm chứng E_NOT_OK khi đổi Classification trong S9."
  },
  ComMInhibitCounterValue: {
    title: "ComMInhibitCounter (NvM Ram Mirror)",
    ecucPath: "ComMGeneral / ComMGlobalNvMBlockDescriptor → InhibitCounter",
    sws: "SWS_ComM_00140 · SWS_ComM_00141 · SWS_ComM_00142 · SWS_ComM_00302",
    range: "uint16 (0 .. 65535)",
    role: "Bộ đếm số lần yêu cầu FULL_COM của User bị từ chối do Mode Inhibition.",
    mechanism: "Mỗi khi User gọi RequestComMode(FULL_COM) bị từ chối với COMM_E_MODE_LIMITATION, ComM tăng counter thêm 1 (chặn trần bão hòa ở 65535 theo SWS_ComM_00142), đánh dấu NvM_SetRamBlockStatus(TRUE) và đọc qua ComM_ReadInhibitCounter().",
    scenarioImpact: "Thể hiện trực tiếp trong S8 và S9; có nút reset qua ComM_ResetInhibitCounter()."
  },
  ComMNoWakeUpInhibitionNvmStorage: {
    title: "ComMNoWakeUpInhibitionNvmStorage",
    ecucPath: "ComMChannel / ComMNoWakeUpInhibitionNvmStorage",
    sws: "ECUC_ComM_00789 · SWS_ComM_00157",
    range: "boolean (true | false)",
    role: "Quyết định cờ ComMNoWakeup của kênh có được lưu bền vững vào NvM qua chu kỳ ngủ/tắt nguồn hay không.",
    mechanism: "Khi TRUE, mỗi lần đổi cờ NoWakeup, ComM đánh dấu lưu NvM để ECU giữ trạng thái chống đánh thức sau khi khởi động lại (SWS_ComM_00157).",
    scenarioImpact: "Kích hoạt hiệu ứng mũi tên lưu NvM trên sơ đồ kiến trúc ở S8."
  },
  ComMPncSupport: {
    title: "ComMPncSupport",
    ecucPath: "ComMGeneral / ComMPncSupport",
    sws: "ECUC_ComM_00839 · SWS_ComM_00910 · SWS_ComM_00911",
    range: "boolean (true | false)",
    role: "Công tắc tổng kích hoạt tính năng Partial Networking Cluster (PNC) trong ComM.",
    mechanism: "Nếu FALSE, máy trạng thái PNC bị khóa tại PNC_NO_COMMUNICATION, ComM không xử lý EIRA/ERA hay gọi Nm_UpdateIRA().",
    scenarioImpact: "Kiểm thử validation khi bật PNC Gateway mà quên bật ComMPncSupport."
  },
  ComMPncPrepareSleepTimer: {
    title: "ComMPncPrepareSleepTimer",
    ecucPath: "ComMGeneral / ComMPncPrepareSleepTimer",
    sws: "ECUC_ComM_00841 · SWS_ComM_00952 · SWS_ComM_00947",
    range: "float/ms (0 .. 10000 ms, default 400 ms)",
    role: "Thời gian trễ giữ PNC ở COMM_PNC_PREPARE_SLEEP trước khi tắt hẳn về COMM_PNC_NO_COMMUNICATION.",
    mechanism: "Khi PNC đang ở READY_SLEEP và Rx EIRA bit về 0 (không còn ECU nào giữ PNC), ComM chuyển sang PREPARE_SLEEP và chạy timer này trước khi về PNC_NO_COM (SWS_ComM_00952).",
    scenarioImpact: "Trọng tâm kịch bản S12 (Rx EIRA Flow)."
  },
  Pnc16_Enabled_And_Mask: {
    title: "PNC #16 (Byte 2, Bit 0 = 0x01) Mapping",
    ecucPath: "ComMConfigSet / ComMPnc_16 (ComMPncId = 16)",
    sws: "ECUC_ComM_00843 · ECUC_ComM_00874 · SWS_ComM_00825 · SWS_ComM_00929",
    range: "boolean (Mapped / Enabled)",
    role: "Kích hoạt cấu hình PNC #16 map tới User 2, Ch0 và Ch1 (vị trí Bit 0 của Byte 2 theo SWS_ComM_00825).",
    mechanism: "Với Offset=2 trong payload 8 byte NM (Byte 2..7): ByteIndex = floor(16/8) - 2 = 0, BitMask = 1 << (16 % 8) = 0x01 (SWS_ComM_00825).",
    scenarioImpact: "Điều khiển PNC #16 trong S11, S12, S13."
  },
  Pnc18_Enabled_And_Mask: {
    title: "PNC #18 (Byte 2, Bit 2 = 0x04) Mapping",
    ecucPath: "ComMConfigSet / ComMPnc_18 (ComMPncId = 18)",
    sws: "ECUC_ComM_00843 · ECUC_ComM_00874 · SWS_ComM_00825",
    range: "boolean (Mapped / Enabled)",
    role: "Kích hoạt cấu hình PNC #18 map qua Gateway giữa Ch0 (ACTIVE) và Ch1 (PASSIVE).",
    mechanism: "Khi nhận ERA từ NmIf qua ComM_Nm_UpdateERA() có bit 2 = 0x04 trên Ch0 (ACTIVE), Gateway tính toán Tx IRA cho Ch1 (PASSIVE) và gọi Nm_UpdateIRA(Ch1, 0x04) (SWS_ComM_01072).",
    scenarioImpact: "Cốt lõi của kịch bản S13 (PNC Gateway Routing)."
  },
  RxEiraSignalHex: {
    title: "RxEIRA (ComM_Nm_UpdateEIRA Vector)",
    ecucPath: "Nm / NmIf Callback → ComM_Nm_UpdateEIRA(PncBitVectorPtr)",
    sws: "SWS_ComM_01060 · SWS_ComM_00940 · SWS_ComM_00938",
    range: "Hex Byte2 Byte3 (VD: '01 00' bật PNC#16)",
    role: "External & Internal Request Array (EIRA) tổng hợp do Nm/NmIf gửi trực tiếp tới ComM qua ComM_Nm_UpdateEIRA() (R25-11 bỏ trung gian COM).",
    mechanism: "Bit=1 trong EIRA kéo PNC từ NO_COM hoặc PREPARE_SLEEP lên PNC_READY_SLEEP (SWS_ComM_00940). Khi thoát PNC_REQUESTED, ComM luôn xuống PNC_READY_SLEEP trước và xóa Nm_UpdateIRA=0 (SWS_ComM_00938); nếu EIRA=0 sẽ tự chuyển sang PREPARE_SLEEP.",
    scenarioImpact: "Thao tác trực tiếp trong S12 để kích hoạt Rx EIRA Flow."
  },
  ComMPncWakeupSleepRequestEnabled: {
    title: "ComMPncWakeupSleepRequestEnabled",
    ecucPath: "ComMConfigSet / ComMPnc / ComMPncWakeupSleepRequestEnabled",
    sws: "ECUC_ComM_00899 · SWS_ComM_01067",
    range: "boolean (true | false)",
    role: "Cho phép chuyển tiếp yêu cầu ngủ/thức PNC sang chuỗi BusSM/BswM nếu có thuộc tính WakeupSleepRequestEnabled.",
    mechanism: "Theo SWS_ComM_01067, khi TRUE và PNC từ NO_COM/PREPARE_SLEEP vào READY_SLEEP/REQUESTED, ComM gọi BswM_ComM_CurrentPNCMode với COMM_PNC_REQUESTED_WAKEUP / FULL.",
    scenarioImpact: "Hiển thị trong API trace ở S11/S12/S13 và export Cfg/ARXML."
  },
  ComMPncGatewayEnabled: {
    title: "ComMPncGatewayEnabled",
    ecucPath: "ComMGeneral / ComMPncGatewayEnabled",
    sws: "ECUC_ComM_00887 · SWS_ComM_01061 · SWS_ComM_01066 · SWS_ComM_01072",
    range: "boolean (true | false)",
    role: "Bật chức năng PNC Gateway trong ComM để tổng hợp Tx IRA riêng biệt cho từng kênh qua Nm_UpdateIRA().",
    mechanism: "Phải bật cùng ComMPncSupport = TRUE. Nếu bật Gateway mà ComMPncSupport = FALSE, validator sẽ báo lỗi cấu hình.",
    scenarioImpact: "Bắt buộc bật cho kịch bản S13 (PNC Gateway Routing)."
  },
  Ch0_GatewayType: {
    title: "Ch0 ComMPncGatewayType",
    ecucPath: "ComMChannel_0 / ComMPncGatewayType",
    sws: "ECUC_ComM_00842 · SWS_ComM_01072 · SWS_ComM_01076..01080",
    range: "ACTIVE | PASSIVE | NONE",
    role: "Vai trò PNC Gateway của kênh Ch0: ACTIVE, PASSIVE hoặc NONE.",
    mechanism: "ACTIVE nhận ERA từ ngoài (ComM_Nm_UpdateERA) và truyền tiếp sang cả kênh ACTIVE lẫn PASSIVE. PASSIVE chỉ chuyển sang kênh ACTIVE (cấm PASSIVE→PASSIVE để tránh loop).",
    scenarioImpact: "Dùng trong S13 để kiểm chứng định tuyến IRA từng kênh và chống routing loop."
  },
  Ch1_GatewayType: {
    title: "Ch1 ComMPncGatewayType",
    ecucPath: "ComMChannel_1 / ComMPncGatewayType",
    sws: "ECUC_ComM_00842 · SWS_ComM_01072 · SWS_ComM_01076..01080",
    range: "ACTIVE | PASSIVE | NONE",
    role: "Vai trò PNC Gateway của kênh Ch1 (mặc định PASSIVE trong bài lab Gateway).",
    mechanism: "Kênh PASSIVE nhận ERA qua ComM_Nm_UpdateERA(Ch1, ...) chỉ phản ánh sang các kênh ACTIVE; không định tuyến sang kênh PASSIVE khác.",
    scenarioImpact: "Thử đảo Ch0/Ch1 trong What-If của S13 để thấy Tx IRA của Ch0 và Ch1 đảo chiều tức thì."
  },
  RxEraCh0Hex: {
    title: "RxERA_Ch0 (ComM_Nm_UpdateERA Kênh 0)",
    ecucPath: "NmIf → ComM_Nm_UpdateERA(Ch0, PncBitVectorPtr)",
    sws: "SWS_ComM_01061 · SWS_ComM_01072",
    range: "Hex Byte2 Byte3 (VD: '04 00' = PNC#18)",
    role: "External Request Array nhận riêng từ bus bên ngoài trên Ch0 thông qua NmIf (R25-11).",
    mechanism: "Đầu vào cho thuật toán PNC Gateway: tính IRA[Ch] cho từng kênh map và gọi Nm_UpdateIRA(Ch, IRA) nếu Ch0 là ACTIVE hoặc đích là ACTIVE.",
    scenarioImpact: "Kích hoạt định tuyến PNC#18 sang Ch1 trong S13."
  },
  RxEraCh1Hex: {
    title: "RxERA_Ch1 (ComM_Nm_UpdateERA Kênh 1)",
    ecucPath: "NmIf → ComM_Nm_UpdateERA(Ch1, PncBitVectorPtr)",
    sws: "SWS_ComM_01061 · SWS_ComM_01072",
    range: "Hex Byte2 Byte3 (VD: '04 00' = PNC#18)",
    role: "External Request Array nhận riêng từ bus bên ngoài trên Ch1 qua NmIf.",
    mechanism: "Minh họa rule an toàn chống lặp Gateway: ERA trên kênh PASSIVE chỉ định tuyến sang kênh ACTIVE, không phát ngược sang PASSIVE.",
    scenarioImpact: "Dùng để kiểm chứng chống vòng lặp ở S13."
  },
  ComMSynchronizedPncShutdownEnabled: {
    title: "ComMSynchronizedPncShutdownEnabled",
    ecucPath: "ComMGeneral / ComMSynchronizedPncShutdownEnabled",
    sws: "ECUC_ComM_00897 · SWS_ComM_01082 · SWS_ComM_01083",
    range: "boolean (true | false)",
    role: "Kích hoạt đồng bộ tắt mạng PNC phối hợp giữa PNC Coordinator (Top-Level hoặc Intermediate) và BusNm.",
    mechanism: "Top-Level Coordinator gọi Nm_RequestSynchronizedPncShutdown(Ch, PncId) khi PNC nhả trên mọi kênh (SWS_ComM_01083). Intermediate Gateway còn phản hồi lệnh ComM_Nm_ForwardSynchronizedPncShutdown() từ Top-Level xuống các kênh PASSIVE (SWS_ComM_01082 / SWS_ComM_91030).",
    scenarioImpact: "Được minh họa đầy đủ (Top-Level & Intermediate) ở cuối kịch bản S13."
  }
};

const MODULES_INFO = {
  MOD_SWC: {
    id: "MOD_SWC",
    name: "Application SWCs (User 0 / 1 / 2)",
    layer: "Application Layer",
    role: "Các phần mềm ứng dụng gửi nhu cầu truyền thông (FULL_COM hoặc NO_COM) vào ComM mà không cần biết chi tiết phần cứng CAN/ETH bên dưới.",
    inputs: "Nhận thông báo chế độ thực tế qua Rte_Switch_UM_<User>_currentMode (hoặc ComM_GetCurrentComMode) chỉ khi BusSM đã confirm.",
    processing: "User 0 & User 1 map vào kênh vật lý Ch0; User 2 map vào logic PNC #16 (qua đó kéo Ch0/Ch1 khi PNC bật trong MainFunction).",
    outputs: "Gọi ComM_RequestComMode(User, ComMode) thông qua cổng Rte_Call_UR_<User>_RequestComMode().",
    apis: ["ComM_RequestComMode(User, ComMode)", "ComM_GetRequestedComMode(User, *ComMode)", "ComM_GetCurrentComMode(User, *ComMode)"]
  },
  MOD_RTE: {
    id: "MOD_RTE",
    name: "RTE & SchM (Runtime Env / Schedule Mgr)",
    layer: "Runtime Environment & OS",
    role: "Cầu nối chuyển lệnh từ SWC vào ComM và lập lịch gọi ComM_MainFunction_<Channel>() theo đúng chu kỳ cấu hình (VD: 20 ms).",
    inputs: "Lời gọi client-server từ SWC và lệnh cập nhật Mode Switch Notification từ ComM.",
    processing: "Bảo vệ vùng tranh chấp (Exclusive Area), thực thi Rte_Switch gửi Mode tới các SWC liên quan.",
    outputs: "Trigger định kỳ ComM_MainFunction_0(), ComM_MainFunction_1() và Rte_Switch_UM_<User>_currentMode().",
    apis: ["SchM_Enter_ComM_COMM_EXCLUSIVE_AREA()", "ComM_MainFunction_<Channel>()", "Rte_Switch_UM_User_currentMode()"]
  },
  MOD_COMM: {
    id: "MOD_COMM",
    name: "ComM Core (Communication Manager)",
    layer: "System Services (BSW)",
    role: "Nhạc trưởng phân xử tập trung của hệ thống truyền thông AUTOSAR R25-11: thu thập User, PNC, DCM; lọc qua Mode Inhibition & CommunicationAllowed; điều phối Nm và BusSM.",
    inputs: "User Requests, EcuM WakeUp/PNCWakeUp, CommunicationAllowed, DCM ActiveDiagnostic, BusSM_ModeIndication, Nm callbacks & NmIf EIRA/ERA.",
    processing: "Mode Arbitration (OR), Channel SM (SWS_ComM_00879..00881), PNC SM (4 states, chuyển pha từ RequestComMode chạy trong MainFunction SWS_ComM_00978), GW IRA routing.",
    outputs: "Gọi <Bus>SM_RequestComMode(), Nm_NetworkRequest/PassiveStartUp/Release(), Nm_UpdateIRA(), Nm_RequestSynchronizedPncShutdown(), BswM_ComM_CurrentMode(), Dcm_ComM_*Entered(), Rte_Switch(), NvM.",
    apis: ["ComM_Init()", "ComM_DeInit()", "ComM_MainFunction_<Ch>()", "ComM_RequestComMode()", "ComM_GetState()"]
  },
  MOD_ECUM: {
    id: "MOD_ECUM",
    name: "EcuM (ECU State Manager)",
    layer: "System Services (BSW)",
    role: "Quản lý vòng đời ECU, gọi ComM_Init/DeInit, báo đánh thức thụ động (WakeUp / PNCWakeUp) và mở chốt Gatekeeper CommunicationAllowed.",
    inputs: "Nhận wakeup interrupt từ CanTrcv/CanIf và tiến trình pha Startup ECU.",
    processing: "Khi Startup sẵn sàng, gọi ComM_CommunicationAllowed(Ch, TRUE). Khi wakeup xảy ra, gọi ComM_EcuM_WakeUpIndication(Ch) hoặc ComM_EcuM_PNCWakeUpIndication(PncId).",
    outputs: "Gọi ComM_Init(), ComM_DeInit(), ComM_CommunicationAllowed(), ComM_EcuM_WakeUpIndication(), ComM_EcuM_PNCWakeUpIndication().",
    apis: ["ComM_Init(ConfigPtr)", "ComM_CommunicationAllowed(Ch, Allowed)", "ComM_EcuM_WakeUpIndication(Ch)", "ComM_EcuM_PNCWakeUpIndication(PNC)"]
  },
  MOD_DCM: {
    id: "MOD_DCM",
    name: "DCM (Diagnostic Communication Manager)",
    layer: "Diagnostic Services (BSW)",
    role: "Xử lý các dịch vụ chẩn đoán UDS. Có quyền ưu tiên cao nhất trong ComM để ép kênh FULL_COM (trừ biến thể PASSIVE), đồng thời nhận phản hồi trạng thái kênh từ ComM.",
    inputs: "Nhận UDS Request qua PduR và nhận callback từ ComM: Dcm_ComM_FullComModeEntered(), SilentComModeEntered(), NoComModeEntered().",
    processing: "Kích hoạt/tắt cờ ActiveDiagnostic và mở khóa giao tiếp Rx/Tx chẩn đoán theo callback mode từ ComM.",
    outputs: "Gọi ComM_DCM_ActiveDiagnostic(Channel) và ComM_DCM_InactiveDiagnostic(Channel).",
    apis: ["ComM_DCM_ActiveDiagnostic(Ch)", "ComM_DCM_InactiveDiagnostic(Ch)", "Dcm_ComM_FullComModeEntered(Ch)", "Dcm_ComM_NoComModeEntered(Ch)"]
  },
  MOD_NM: {
    id: "MOD_NM",
    name: "NmIf / CanNm (Network Mgmt & PNC)",
    layer: "Communication Services",
    role: "Điều phối thuật toán ngủ/thức mạng đồng bộ và trực tiếp xử lý bit vector PNC (EIRA, ERA, IRA, SyncShutdown) giao tiếp 2 chiều với ComM theo chuẩn R25-11.",
    inputs: "Nhận Nm_NetworkRequest/PassiveStartUp/NetworkRelease(Ch), Nm_UpdateIRA(Ch, IRA) và Nm_RequestSynchronizedPncShutdown(Ch, PncId) từ ComM.",
    processing: "Tính toán EIRA tổng hợp từ Internal IRA + bus ngoài; tách ERA từng kênh cho Gateway; điều phối chu trình RepeatMsg → ReadySleep → PrepareBusSleep → BusSleep.",
    outputs: "Gọi ComM_Nm_NetworkStartIndication(), NetworkMode(), PrepareBusSleepMode(), BusSleepMode(), RestartIndication(), ComM_Nm_UpdateEIRA/ERA(), ForwardSynchronizedPncShutdown().",
    apis: ["Nm_NetworkRequest / PassiveStartUp()", "Nm_UpdateIRA(Ch, IRA)", "ComM_Nm_UpdateEIRA(Ptr)", "ComM_Nm_UpdateERA(Ch, Ptr)", "Nm_RequestSynchronizedPncShutdown()"]
  },
  MOD_SM: {
    id: "MOD_SM",
    name: "<Bus>SM (CanSM / EthSM / FrSM / LinSM)",
    layer: "Communication Services",
    role: "Thực thi lệnh chuyển chế độ phần cứng thực sự của bus (Controller/Transceiver) theo yêu cầu từ ComM (không gọi khi COMM_BUS_TYPE_INTERNAL, SWS_ComM_00664).",
    inputs: "Nhận <Bus>SM_RequestComMode(Channel, ComMode) từ ComM.",
    processing: "Điều khiển CanIf/EthIf/FrIf/LinIf, xử lý Bus-Off recovery và gọi ComM_<Bus>SM_BusSleepMode() cho SLAVE_ACTIVE/PASSIVE.",
    outputs: "Bắt tay xác nhận bằng ComM_<Bus>SM_ModeIndication(Channel, ComMode) (truyền theo giá trị - pass-by-value, SWS_ComM_00675).",
    apis: ["<Bus>SM_RequestComMode(Ch, Mode)", "ComM_<Bus>SM_ModeIndication(Ch, Mode)", "ComM_<Bus>SM_BusSleepMode(Ch)"]
  },
  MOD_BSWM: {
    id: "MOD_BSWM",
    name: "BswM → COM (Mode & I-PDU Group Ctrl)",
    layer: "System & Comm Services",
    role: "BswM nhận chỉ thị trạng thái Channel & PNC từ ComM để đóng/mở nhóm I-PDU Tx/Rx của AUTOSAR COM (Com_IpduGroupControl) và kích hoạt Reset nếu yêu cầu.",
    inputs: "Nhận BswM_ComM_CurrentMode(Ch, RequestedMode) và BswM_ComM_CurrentPNCMode(PncId, RequestedMode) (SWS_ComM_00976).",
    processing: "Ánh xạ điều kiện ComM Channel / PNC Mode sang hành động bật/tắt Tx & Rx PDU Group trong COM hoặc PduR.",
    outputs: "Gọi Com_IpduGroupControl() để đóng/mở các I-PDU thực tế, hoặc thực thi ECU Reset khi nhận BswM_ComM_InitiateReset() (SWS_ComM_00355).",
    apis: ["BswM_ComM_CurrentMode(Ch, Mode)", "BswM_ComM_CurrentPNCMode(PncId, Mode)", "BswM_ComM_InitiateReset()"]
  },
  MOD_NVM: {
    id: "MOD_NVM",
    name: "NvM (Non-Volatile Memory Manager)",
    layer: "Memory Services (BSW)",
    role: "Lưu trữ bền vững các dữ liệu quản trị của ComM: InhibitCounter, ECUGroupClassification (SWS_ComM_01104) và cờ NoWakeup (ECUC_ComM_00789).",
    inputs: "Nhận ComM_GlobalNvMBlockDescriptor RAM mirror, NvM_SetRamBlockStatus(TRUE) và NvM_WriteBlock() khi DeInit (SWS_ComM_00865).",
    processing: "Đọc dữ liệu lúc Startup (NvM_ReadBlock / ReadAll) và ghi xuống Flash/EEPROM lúc Shutdown/DeInit.",
    outputs: "Khôi phục giá trị ComMNoWakeup, EcuGroupClassification & ComMInhibitCounter cho ComM trong ComM_Init() (SWS_ComM_00864).",
    apis: ["NvM_SetRamBlockStatus(BlockId, TRUE)", "NvM_WriteBlock()", "ComM_ReadInhibitCounter(*Val)", "ComM_ResetInhibitCounter()"]
  },
  MOD_DET: {
    id: "MOD_DET",
    name: "DET (Default Error Tracer)",
    layer: "Diagnostic / Debug Services",
    role: "Ghi nhận các lỗi phát triển/tham số khi ComMDevErrorDetect = TRUE (SWS_ComM_00234), phân biệt với lỗi runtime COMM_E_MODE_LIMITATION.",
    inputs: "Nhận Det_ReportError(ModuleId=12, InstanceId=0, ApiId, ErrorId) từ ComM.",
    processing: "Phân loại mã lỗi DET: COMM_E_UNINIT (0x01), COMM_E_WRONG_PARAMETERS (0x02), COMM_E_PARAM_POINTER (0x03), COMM_E_INIT_FAILED (0x04).",
    outputs: "Lưu log lỗi vào buffer debug hoặc kích hoạt hook dừng CPU trong môi trường phát triển.",
    apis: ["Det_ReportError(12, 0, ApiId, ErrorId)", "COMM_E_UNINIT (0x01)", "COMM_E_WRONG_PARAMETERS (0x02)"]
  }
};

const ABBREVIATIONS_DATA = [
  { abbr: "ComM", cat: "CORE", full: "Communication Manager", vi: "Bộ quản lý truyền thông ECU", desc: "Module BSW tầng System Services làm nhạc trưởng phân xử mọi yêu cầu truyền thông xuống BusSM và Nm.", sws: "SWS_ComM_00668" },
  { abbr: "ComMUser", cat: "CORE", full: "Communication Manager User", vi: "Người dùng logic đại diện SWC", desc: "Thực thể đại diện cho 1 hoặc nhóm SWC gọi RequestComMode mà không phụ thuộc phần cứng kênh vật lý.", sws: "SWS_ComM_00110" },
  { abbr: "ComMChannel", cat: "CORE", full: "Communication Manager Channel", vi: "Kênh mạng logic trong ComM", desc: "Đại diện cho một bus (CAN, ETH, FR, LIN) hoặc INTERNAL với máy trạng thái độc lập.", sws: "ECUC_ComM_00565" },
  { abbr: "FULL_COM", cat: "CORE", full: "COMM_FULL_COMMUNICATION", vi: "Chế độ truyền thông đầy đủ", desc: "Cho phép truyền và nhận cả Application PDU lẫn NM PDU bình thường trên bus.", sws: "SWS_ComM_00880" },
  { abbr: "SILENT_COM", cat: "CORE", full: "COMM_SILENT_COMMUNICATION", vi: "Chế độ truyền thông im lặng", desc: "Bus chỉ được phép nhận (Rx), cấm truyền (Tx) trong pha PrepareBusSleep của Nm.", sws: "SWS_ComM_00881" },
  { abbr: "NO_COM", cat: "CORE", full: "COMM_NO_COMMUNICATION", vi: "Chế độ tắt truyền thông", desc: "Không cho phép Rx và Tx; Transceiver/Controller đưa về ngủ/dừng.", sws: "SWS_ComM_00879" },
  { abbr: "NO_COM_NO_PENDING_REQ", cat: "CORE", full: "COMM_NO_COM_NO_PENDING_REQUEST", vi: "Ngủ hẳn không có yêu cầu chờ", desc: "Sub-state ổn định của NO_COM khi không có User request hay Wakeup pending.", sws: "SWS_ComM_00674" },
  { abbr: "NO_COM_REQ_PENDING", cat: "CORE", full: "COMM_NO_COM_REQUEST_PENDING", vi: "Ngủ nhưng đang giữ yêu cầu chờ", desc: "Sub-state trung gian khi có User/Wakeup muốn vào FULL_COM nhưng CommunicationAllowed vẫn là FALSE.", sws: "SWS_ComM_00895" },
  { abbr: "FULL_COM_NET_REQ", cat: "CORE", full: "COMM_FULL_COM_NETWORK_REQUESTED", vi: "FULL_COM đang có chủ thể giữ mạng", desc: "Sub-state khi có User, DCM, Passive Wakeup mới vào hoặc TMinFull đang giữ mạng chủ động.", sws: "SWS_ComM_00674" },
  { abbr: "FULL_COM_READY_SLEEP", cat: "CORE", full: "COMM_FULL_COM_READY_SLEEP", vi: "FULL_COM sẵn sàng nhả mạng ngủ", desc: "Sub-state khi tất cả User đã release; đã gọi Nm_NetworkRelease hoặc đang đếm NmLightTimeout.", sws: "SWS_ComM_00889" },
  { abbr: "ComMNmVariant", cat: "CORE", full: "ComM Network Management Variant", vi: "Biến thể quản lý mạng của kênh", desc: "6 giá trị trong R25-11: FULL, LIGHT, PASSIVE, SLAVE_ACTIVE, SLAVE_PASSIVE, NONE.", sws: "SWS_ComM_00599" },
  { abbr: "NM FULL", cat: "CORE", full: "ComMNmVariant = FULL", vi: "Biến thể dùng NM đầy đủ", desc: "Kênh dùng đầy đủ Nm_NetworkRequest/Release/PassiveStartUp và có trạng thái SILENT_COM.", sws: "ECUC_ComM_00568" },
  { abbr: "NM LIGHT", cat: "CORE", full: "ComMNmVariant = LIGHT", vi: "Biến thể NM nhẹ dùng Timer", desc: "Không dùng module Nm/CanNm; sau TMinFull tự đếm ComMNmLightTimeout trong READY_SLEEP để tắt về NO_COM.", sws: "SWS_ComM_00891" },
  { abbr: "NM PASSIVE", cat: "CORE", full: "ComMNmVariant = PASSIVE", vi: "Biến thể chỉ nghe mạng (không xin mạng)", desc: "Thức qua FULL_COM_NETWORK_REQUESTED (Nm_PassiveStartUp) rồi vào READY_SLEEP; không phát Nm_NetworkRequest.", sws: "SWS_ComM_00667" },
  { abbr: "SLAVE ACTIVE / PASSIVE", cat: "CORE", full: "SLAVE_ACTIVE / SLAVE_PASSIVE", vi: "Biến thể LIN/Bus Slave R25-11", desc: "Kênh nô lệ không chạy NM: SLAVE_ACTIVE cho phép yêu cầu từ User/DCM; cả hai đợi ComM_<Bus>SM_BusSleepMode() để ngủ.", sws: "SWS_ComM_01017" },
  { abbr: "NM NONE", cat: "CORE", full: "ComMNmVariant = NONE", vi: "Biến thể không dùng NM", desc: "Không có NM: giữ ở READY_SLEEP vô thời hạn trừ khi bus là COMM_BUS_TYPE_INTERNAL (về NO_COM ngay) hoặc bị Limit NO_COM.", sws: "SWS_ComM_00664" },
  { abbr: "TMinFullCom", cat: "CORE", full: "ComMTMinFullComModeDuration", vi: "Thời gian giữ FULL_COM tối thiểu", desc: "Giữ kênh LIGHT/NONE ở FULL_COM_NETWORK_REQUESTED đủ lâu; bị hủy ngay lập tức nếu Limit to NO_COM kích hoạt.", sws: "SWS_ComM_00890" },
  { abbr: "NmLightTimeout", cat: "CORE", full: "ComMNmLightTimeout", vi: "Timer chờ ngủ biến thể LIGHT", desc: "Khoảng thời gian trễ ở FULL_COM_READY_SLEEP trước khi tắt kênh biến thể LIGHT xuống NO_COM.", sws: "ECUC_ComM_00606" },
  { abbr: "Mode Arbitration", cat: "CORE", full: "Highest Requested Mode Arbitration", vi: "Bộ phân xử yêu cầu đa chủ thể", desc: "Thuật toán chọn trạng thái cao nhất (FULL > NO_COM) từ tất cả User, PNC và DCM.", sws: "SWS_ComM_00875" },
  { abbr: "CommAllowed", cat: "CORE", full: "ComM_CommunicationAllowed", vi: "Cổng cho phép truyền thông (Gatekeeper)", desc: "Mặc định FALSE lúc Init; mở khóa chuyển từ NO_COM_REQUEST_PENDING sang FULL_COM (bị bỏ qua khi ở SILENT_COM).", sws: "SWS_ComM_00884" },
  { abbr: "SyncWakeUp", cat: "CORE", full: "ComMSynchronousWakeUp", vi: "Đánh thức đồng loạt đa kênh", desc: "Cơ chế EcuM_WakeUpIndication hoặc sự kiện sync kích hoạt đánh thức các kênh khác đồng thời.", sws: "SWS_ComM_00694" },
  { abbr: "MainFunction", cat: "CORE", full: "ComM_MainFunction_<Channel>", vi: "Hàm tác vụ định kỳ của kênh", desc: "Được SchM gọi định kỳ để giảm timers, xử lý chuyển trạng thái Channel & thực thi chuyển pha PNC từ RequestComMode.", sws: "SWS_ComM_00978" },
  { abbr: "Mode Inhibition", cat: "INHIB", full: "Communication Mode Inhibition", vi: "Cơ chế ức chế / hạn chế truyền thông", desc: "Tập hợp 2 tính năng NoWakeup và LimitToNoCom nhằm tiết kiệm ắc quy hoặc bảo vệ xe.", sws: "SWS_ComM_00163" },
  { abbr: "NoWakeup", cat: "INHIB", full: "ComM_PreventWakeUp (Wake-up Inhibition)", vi: "Cấm User chủ động đánh thức mạng", desc: "Bit 0 (0x01); chặn User wakeup từ NO_COM/SILENT_COM nhưng VẪN GIỮ LẠI yêu cầu để tự bật khi tắt NoWakeup.", sws: "SWS_ComM_00839" },
  { abbr: "LimitToNoCom", cat: "INHIB", full: "ComM_LimitChannelToNoComMode", vi: "Cưỡng bức tắt kênh về NO_COM", desc: "Bit 1 (0x02); ép kênh nhả mạng, hủy TMinFull ngay và XÓA toàn bộ User request (SWC phải gọi lại sau).", sws: "SWS_ComM_00582" },
  { abbr: "LimitECU", cat: "INHIB", full: "ComM_LimitECUToNoComMode", vi: "Cưỡng bức tắt toàn bộ ECU về NO_COM", desc: "Áp dụng LimitToNoCom đồng loạt cho tất cả các kênh cấu hình trên ECU (xóa User req, trừ DCM).", sws: "SWS_ComM_00124" },
  { abbr: "InhibStatus", cat: "INHIB", full: "ComM_InhibitionStatusType", vi: "Byte trạng thái ức chế 2 bit", desc: "Bit 0 = Wake-up Inhibition active (0x01); Bit 1 = Limit to NO_COM active (0x02).", sws: "SWS_ComM_00669" },
  { abbr: "Classification", cat: "INHIB", full: "ComMEcuGroupClassification", vi: "Mặt nạ cho phép API Inhibition", desc: "Kiểm soát xem lời gọi ComM_PreventWakeUp / LimitToNoCom có được phép (E_OK vs E_NOT_OK); không xóa ức chế cũ.", sws: "SWS_ComM_01102" },
  { abbr: "InhibitCounter", cat: "INHIB", full: "ComMInhibitCounter", vi: "Bộ đếm số lần yêu cầu bị ức chế", desc: "Tăng khi User request bị từ chối với COMM_E_MODE_LIMITATION (bão hòa ở 65535); lưu xuống NvM.", sws: "SWS_ComM_00142" },
  { abbr: "DCM", cat: "INHIB", full: "Diagnostic Communication Manager", vi: "Bộ quản lý chẩn đoán UDS", desc: "Giữ quyền tối cao trong ComM (trừ PASSIVE/SLAVE_PASSIVE) và nhận callback Dcm_ComM_*ModeEntered().", sws: "SWS_ComM_00873" },
  { abbr: "ActiveDiagnostic", cat: "INHIB", full: "ComM_DCM_ActiveDiagnostic", vi: "API bật quyền tối cao chẩn đoán", desc: "Vượt qua mọi NoWakeup và LimitToNoCom, giữ kênh ở FULL_COM_NETWORK_REQUESTED.", sws: "SWS_ComM_00866" },
  { abbr: "NoWakeUpNvm", cat: "INHIB", full: "ComMNoWakeUpInhibitionNvmStorage", vi: "Lưu cờ NoWakeup bền vững vào NvM", desc: "Khi bật, cờ ComMNoWakeup của kênh được lưu xuống NvM qua chu kỳ ngủ/tắt nguồn.", sws: "ECUC_ComM_00789" },
  { abbr: "PNC", cat: "PN", full: "Partial Network Cluster", vi: "Cụm mạng con bán phần", desc: "Nhóm logic các ECU cần thức cùng lúc cho một chức năng trong khi các ECU khác vẫn ngủ.", sws: "SWS_ComM_00909" },
  { abbr: "PNC_NO_COM", cat: "PN", full: "COMM_PNC_NO_COMMUNICATION", vi: "PNC đang tắt hoàn toàn", desc: "Không có User nội bộ hay ECU nào ngoài bus yêu cầu cụm PNC này.", sws: "SWS_ComM_00909" },
  { abbr: "PNC_REQUESTED", cat: "PN", full: "COMM_PNC_REQUESTED", vi: "PNC được chủ động yêu cầu bật", desc: "User nội bộ hoặc Gateway ACTIVE yêu cầu PNC; ComM bật bit = 1 trong Nm_UpdateIRA() và xin FULL_COM cho các kênh map.", sws: "SWS_ComM_01069" },
  { abbr: "PNC_READY_SLEEP", cat: "PN", full: "COMM_PNC_READY_SLEEP", vi: "PNC sẵn sàng ngủ (trung gian bắt buộc)", desc: "Khi rời PNC_REQUESTED, ComM LUÔN xuống READY_SLEEP (xóa Nm_UpdateIRA=0, nhả kênh) trước; giữ nếu EIRA=1.", sws: "SWS_ComM_00938" },
  { abbr: "PNC_PREP_SLEEP", cat: "PN", full: "COMM_PNC_PREPARE_SLEEP", vi: "PNC chuẩn bị ngủ đếm timer", desc: "Từ READY_SLEEP khi EIRA về 0, chạy ComMPncPrepareSleepTimer trước khi về PNC_NO_COM.", sws: "SWS_ComM_00952" },
  { abbr: "PrepSleepTimer", cat: "PN", full: "ComMPncPrepareSleepTimer", vi: "Timer trì hoãn tắt PNC", desc: "Tránh bật/tắt PNC chập chờn nếu gói NM đến trễ nhẹ trên bus.", sws: "ECUC_ComM_00841" },
  { abbr: "EIRA", cat: "PN", full: "External and Internal Request Array", vi: "Vector bit yêu cầu PNC tổng hợp (NmIf)", desc: "Nm/NmIf báo vào ComM qua ComM_Nm_UpdateEIRA() để kéo PNC lên/giữ PNC_READY_SLEEP.", sws: "SWS_ComM_01060" },
  { abbr: "ERA", cat: "PN", full: "External Request Array", vi: "Vector yêu cầu PNC ngoài theo kênh (NmIf)", desc: "Nm/NmIf báo vào ComM qua ComM_Nm_UpdateERA(Ch, Ptr) phục vụ thuật toán PNC Gateway.", sws: "SWS_ComM_01061" },
  { abbr: "IRA", cat: "PN", full: "Internal Request Array (Per-Channel Tx)", vi: "Vector yêu cầu PNC truyền tới Nm_UpdateIRA", desc: "ComM tính cho mỗi kênh (Internal User OR ERA từ Gateway theo luật ACTIVE/PASSIVE) và đẩy xuống Nm_UpdateIRA(Ch, IRA).", sws: "SWS_ComM_01062" },
  { abbr: "PNC Gateway", cat: "PN", full: "ComMPncGatewayEnabled", vi: "Định tuyến thức/ngủ PNC đa mạng", desc: "Tính toán và đồng bộ yêu cầu PNC qua ERA giữa các kênh ACTIVE và PASSIVE trong Gateway ECU.", sws: "SWS_ComM_01072" },
  { abbr: "ACTIVE GW", cat: "PN", full: "COMM_GATEWAY_TYPE_ACTIVE", vi: "Kênh Gateway chủ động", desc: "Định tuyến ERA nhận được sang tất cả kênh khác (cả ACTIVE lẫn PASSIVE).", sws: "ECUC_ComM_00842" },
  { abbr: "PASSIVE GW", cat: "PN", full: "COMM_GATEWAY_TYPE_PASSIVE", vi: "Kênh Gateway thụ động", desc: "Chỉ định tuyến ERA sang kênh ACTIVE; cấm chuyển sang kênh PASSIVE khác để chống routing loop.", sws: "SWS_ComM_01079" },
  { abbr: "SyncPncShutdown", cat: "PN", full: "Synchronized PNC Shutdown", vi: "Tắt cụm PNC đồng bộ (Top/Intermediate)", desc: "Top-Level gọi Nm_RequestSynchronizedPncShutdown(); Intermediate forward xuống kênh PASSIVE khi nhận ForwardSynchronizedPncShutdown().", sws: "SWS_ComM_01082" },
  { abbr: "BusSM", cat: "STACK", full: "Bus State Manager (CanSM/EthSM/FrSM/LinSM)", vi: "Bộ quản lý trạng thái vật lý bus", desc: "Nhận <Bus>SM_RequestComMode và báo ngược ComM_<Bus>SM_ModeIndication(Ch, Mode) theo giá trị.", sws: "SWS_ComM_00675" },
  { abbr: "EcuM", cat: "STACK", full: "ECU State Manager", vi: "Bộ quản lý vòng đời ECU", desc: "Gọi ComM_Init/DeInit, WakeUpIndication/PNCWakeUpIndication và mở khóa CommunicationAllowed.", sws: "SWS_ComM_00884" },
  { abbr: "BswM", cat: "STACK", full: "Basic Software Mode Manager", vi: "Bộ điều phối chế độ BSW → COM", desc: "Nhận BswM_ComM_CurrentMode / CurrentPNCMode để bật/tắt I-PDU Group trong COM, hoặc thực hiện Reset.", sws: "SWS_ComM_00976" },
  { abbr: "NmIf / CanNm", cat: "STACK", full: "Network Management Interface & BusNm", vi: "Module quản lý mạng & vector PNC", desc: "Trao đổi Nm_NetworkRequest/Release/PassiveStartUp, EIRA/ERA/IRA và Synchronized PNC Shutdown trực tiếp với ComM.", sws: "SWS_ComM_01060" },
  { abbr: "DET", cat: "STACK", full: "Default Error Tracer", vi: "Bộ bắt lỗi phát triển & sai tham số", desc: "Nhận báo lỗi COMM_E_UNINIT (0x01), COMM_E_WRONG_PARAMETERS (0x02), COMM_E_PARAM_POINTER (0x03).", sws: "SWS_ComM_00234" }
];
