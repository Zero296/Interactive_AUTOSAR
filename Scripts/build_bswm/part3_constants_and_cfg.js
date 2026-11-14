// ================= PART 3: CONSTANTS, BITFIELDS, CONFIG TOOLTIPS, MODULE METADATA & GLOSSARY =================

const BSWM_ARB_BITS = [
  { bit: 7, mask: 0x80, tag: "BSWM_INIT",    name: "BSWM_INITIALIZED",    tone: "",     desc: "BswM_Init(&BswM_Config) đã hoàn tất (SWS_BswM_00002). Nếu bằng 0 (BSWM_UNINIT), mọi API gọi vào đều bị từ chối và báo DET BSWM_E_NO_INIT (0x01)." },
  { bit: 6, mask: 0x40, tag: "IMM_PROC",     name: "IMM_REQ_ACTIVE",      tone: "",     desc: "Yêu cầu/thông báo chế độ mới vừa đi vào cổng cấu hình BSWM_IMMEDIATE: BswM đánh giá Rule và chạy ActionList ngay trong ngữ cảnh Caller (SWS_BswM_00051)." },
  { bit: 5, mask: 0x20, tag: "DEF_PENDING",  name: "DEF_REQ_PENDING",     tone: "warn", desc: "Hàng đợi Deferred Queue đang chứa ít nhất 1 cổng BSWM_DEFERRED (hoặc yêu cầu bị hoãn do Re-entrancy), chờ BswM_MainFunction() xử lý (SWS_BswM_00052)." },
  { bit: 4, mask: 0x10, tag: "RULE_TRUE",    name: "RULE_EXPR_TRUE",      tone: "",     desc: "Biểu thức logic BswMLogicalExpression của Rule trọng tâm vừa được đánh giá cho kết quả BSWM_TRUE (chọn nhánh TrueActionList)." },
  { bit: 3, mask: 0x08, tag: "RULE_CHG",     name: "RULE_RES_CHANGED",    tone: "warn", desc: "Kết quả mới của BswMRule khác kỳ trước (Prev != Curr, gồm cả UNDEFINED → TRUE/FALSE). Điều kiện kích hoạt ActionList kiểu BSWM_TRIGGER (SWS_BswM_00056)." },
  { bit: 2, mask: 0x04, tag: "ACT_COND",     name: "ACT_COND_EXEC",       tone: "warn", desc: "ActionList vừa xử lý cấu hình kiểu BSWM_CONDITION (SWS_BswM_00057): thực thi lặp lại mỗi lần Rule được đánh giá, không cần đợi đổi trạng thái." },
  { bit: 1, mask: 0x02, tag: "TMR_RUN",      name: "BSWM_TIMER_RUN",      tone: "warn", desc: "Bộ đếm nội bộ BswMTimer_0 đang ở trạng thái BSWM_TIMER_STARTED và đếm ngược theo mỗi chu kỳ BswM_MainFunction() (SWS_BswM_00205)." },
  { bit: 0, mask: 0x01, tag: "RTE_START",    name: "RTE_SWC_STARTED",     tone: "",     desc: "BswM đã thực thi Action Rte_Start() ở pha STARTUP_TWO, cho phép các SWC chạy Runnable và trao đổi cổng Mode Request / Switch." }
];

const BSWM_ACT_BITS = [
  { bit: 7, mask: 0x80, tag: "COMM_ALLOW",   name: "COMM_ALLOW_CH0",      tone: "",     desc: "BswM đã thực thi Action BswMComMAllowCom gọi ComM_CommunicationAllowed(Ch0, TRUE) sau khi NvM_ReadAll hoàn tất (SWS_BswM_00120)." },
  { bit: 6, mask: 0x40, tag: "IPDU_TX_ON",   name: "IPDU_TX_ONLINE",      tone: "",     desc: "BswMPduGroupSwitch đã bật IG_0_Tx_App và gọi Com_IpduGroupStart(IG_0_Tx_App, Reinit) cho phép gửi frame ứng dụng lên CAN." },
  { bit: 5, mask: 0x20, tag: "IPDU_RX_ON",   name: "IPDU_RX_ONLINE",      tone: "",     desc: "BswMPduGroupSwitch đã bật IG_1_Rx_App qua Com_IpduGroupStart(IG_1_Rx_App) (giữ bật trong cả FULL_COM lẫn SILENT_COM)." },
  { bit: 4, mask: 0x10, tag: "RX_DM_EN",     name: "RX_DM_ACTIVE",        tone: "",     desc: "BswMDeadlineMonitoringControl đã gọi Com_EnableReceptionDM(IG_2_Rx_DM) kích hoạt giám sát timeout gói tin Rx khi mạng FULL_COM (SWS_BswM_00122)." },
  { bit: 3, mask: 0x08, tag: "PDUR_RT_EN",   name: "PDUR_ROUTING_EN",     tone: "",     desc: "BswMPduRouterControl đã gọi PduR_EnableRouting(RPG_0_Gateway) mở luồng định tuyến Gateway (SWS_BswM_00105)." },
  { bit: 2, mask: 0x04, tag: "DCM_DIS",      name: "DCM_COM_DISABLED",    tone: "warn", desc: "Dịch vụ UDS 0x28 CommunicationControl đang khóa một phần/toàn bộ truyền thông Normal/NM và giữ riêng IG_5_Diag_Pdu (SWS_BswM_00048)." },
  { bit: 1, mask: 0x02, tag: "ABORT_FAIL",   name: "ABORT_ON_FAIL_ERR",   tone: "err",  desc: "Một BswMActionListItem có BswMAbortOnFail = TRUE trả về E_NOT_OK; BswM hủy bỏ các bước còn lại trong ActionList (SWS_BswM_00065)." },
  { bit: 0, mask: 0x01, tag: "SHUTDOWN",     name: "SHUTDOWN_SEQ_ACTV",   tone: "err",  desc: "BswM đang điều phối chuỗi tắt ECU (PREP_SHUTDOWN → Rte_Stop → ComM_Allow(FALSE) → NvM_WriteAll → EcuM_GoDownHaltPoll)." }
];

const IPDU_GROUP_SLOTS = [
  { bit: 0, mask: 0x01, id: "IG_0_Tx_App",   shortName: "IG_0_Tx",   tone: "on",     desc: "Nhóm Tx I-PDU ứng dụng trên CAN Ch0 (Chỉ bật khi FULL_COM & không bị BUS_OFF / DCM 0x28 khóa Tx)." },
  { bit: 1, mask: 0x02, id: "IG_1_Rx_App",   shortName: "IG_1_Rx",   tone: "on",     desc: "Nhóm Rx I-PDU ứng dụng trên CAN Ch0 (Bật ở cả FULL_COM & SILENT_COM; tắt khi NO_COM hoặc DCM tắt Rx)." },
  { bit: 2, mask: 0x04, id: "IG_2_Rx_DM",    shortName: "IG_2_DM",   tone: "dm-on",  desc: "Reception Deadline Monitoring cho nhóm Rx (Com_EnableReceptionDM). Tắt ở SILENT_COM / BUS_OFF để tránh báo lỗi giả." },
  { bit: 3, mask: 0x08, id: "IG_3_PNC16_Tx", shortName: "IG_PNC_Tx", tone: "on",     desc: "Nhóm Tx I-PDU riêng cho cụm Partial Network PNC #16 (Chỉ bật khi PNC #16 ở REQUESTED hoặc READY_SLEEP)." },
  { bit: 4, mask: 0x10, id: "IG_4_PNC16_Rx", shortName: "IG_PNC_Rx", tone: "on",     desc: "Nhóm Rx I-PDU riêng cho cụm PNC #16 (Bật khi PNC #16 hoạt động, tắt khi PNC_NO_COMMUNICATION)." },
  { bit: 5, mask: 0x20, id: "IG_5_Diag_Pdu", shortName: "IG_5_Diag", tone: "dm-on",  desc: "Nhóm I-PDU chẩn đoán UDS (DCM). Luôn được giữ mở ngay cả khi dịch vụ UDS 0x28 tắt bản tin Normal/NM." },
  { bit: 6, mask: 0x40, id: "IG_6_NM_Pdu",   shortName: "IG_6_NM",   tone: "on",     desc: "Nhóm gói tin Network Management (CanNm). Bị khóa bởi Nm_DisableCommunication() khi UDS 0x28 Disable NM." },
  { bit: 7, mask: 0x80, id: "RPG_0_Gateway", shortName: "RPG_0_GW",  tone: "rpg-on", desc: "PduR RoutingPathGroup #0 cho đường định tuyến Gateway (PduR_EnableRouting / PduR_DisableRouting)." }
];

const MRP_DEFS = [
  { id: "ecum",  label: "MRP_EcuM_State",   procKey: "MRP_EcuM_State_Processing",  cycles: ["ECUM_STATE_STARTUP_ONE", "ECUM_STATE_STARTUP_TWO", "ECUM_STATE_RUN", "ECUM_STATE_PREP_SHUTDOWN", "ECUM_STATE_GO_OFF_ONE"] },
  { id: "nvm",   label: "MRP_NvM_ReadAll",  procKey: "MRP_NvM_Job_Processing",     cycles: ["NVM_REQ_PENDING", "NVM_REQ_OK", "NVM_REQ_NOT_OK"] },
  { id: "comm",  label: "MRP_ComM_Ch0",     procKey: "MRP_ComM_Ch0_Processing",    cycles: ["COMM_NO_COMMUNICATION", "COMM_FULL_COMMUNICATION", "COMM_SILENT_COMMUNICATION"] },
  { id: "cansm", label: "MRP_CanSM_Ch0",    procKey: "MRP_CanSM_Ch0_Processing",   cycles: ["CANSM_BSWM_NO_COMMUNICATION", "CANSM_BSWM_FULL_COMMUNICATION", "CANSM_BSWM_SILENT_COMMUNICATION", "CANSM_BSWM_BUS_OFF"] },
  { id: "dcm",   label: "MRP_Dcm_ComCtrl",  procKey: "MRP_Dcm_ComCtrl_Processing", cycles: ["DCM_ENABLE_RX_TX_NORM_NM", "DCM_ENABLE_RX_DISABLE_TX_NORM", "DCM_DISABLE_RX_TX_NORM", "DCM_DISABLE_RX_TX_NM", "DCM_DISABLE_RX_TX_NORM_NM"] },
  { id: "swc",   label: "MRP_Swc_AppMode",  procKey: "MRP_Swc_AppMode_Processing", cycles: ["APP_MODE_NORMAL", "APP_MODE_SPORT", "APP_MODE_ECO"] },
  { id: "pnc16", label: "MRP_Pnc16_Mode",   procKey: "MRP_ComM_Ch0_Processing",    cycles: ["COMM_PNC_NO_COMMUNICATION", "COMM_PNC_REQUESTED", "COMM_PNC_READY_SLEEP", "COMM_PNC_PREPARE_SLEEP"] },
  { id: "timer", label: "MRP_Timer0_State", procKey: "MRP_EcuM_State_Processing",  cycles: ["BSWM_TIMER_STOPPED", "BSWM_TIMER_STARTED", "BSWM_TIMER_EXPIRED"] }
];

const configTooltipData = {
  BswMInitialized: {
    title: "BswM Module Initialization State",
    ecucPath: "BswMRuntime / BswM_InitStatus",
    sws: "SWS_BswM_00002 · SWS_BswM_00043",
    range: "BSWM_UNINIT (false) | BSWM_INIT (true)",
    role: "Biến trạng thái nội bộ xác nhận BswM_Init(&BswM_Config) đã chạy thành công hay đã gọi BswM_Deinit().",
    mechanism: "Nếu đặt false (BSWM_UNINIT), mọi lời gọi API như BswM_ComM_CurrentMode(), BswM_RequestMode() sẽ không xử lý và gọi Det_ReportError(42, 0, ServiceId, BSWM_E_NO_INIT=0x01).",
    scenarioImpact: "Bỏ chọn ở kịch bản S14 hoặc What-If để kiểm chứng cơ chế chặn lỗi BSWM_E_NO_INIT."
  },
  BswMDevErrorDetect: {
    title: "BswMDevErrorDetect",
    ecucPath: "BswMGeneral / BswMDevErrorDetect",
    sws: "SWS_BswM_00029 · ECUC_BswM_00802",
    range: "boolean (true | false)",
    role: "Công tắc tiền biên dịch (Pre-compile) bật/tắt kiểm tra và báo lỗi phát triển qua DET.",
    mechanism: "Khi true, BswM kiểm tra lỗi chưa Init (0x01), con trỏ NULL (0x02), sai UserId (0x04), sai Mode (0x05) và báo Det_ReportError(ModuleId=42).",
    scenarioImpact: "Tác động trực tiếp trong kịch bản S14 (DET Fault Injection)."
  },
  BswMVersionInfoApi: {
    title: "BswMVersionInfoApi",
    ecucPath: "BswMGeneral / BswMVersionInfoApi",
    sws: "SWS_BswM_00003 · ECUC_BswM_00803",
    range: "boolean (true | false)",
    role: "Bật/tắt API BswM_GetVersionInfo(Std_VersionInfoType* VersionInfo).",
    mechanism: "Ảnh hưởng tới macro #define BSWM_VERSION_INFO_API STD_ON/OFF khi xuất file BswM_Cfg.h và kiểm tra NULL_PTR trong S14.",
    scenarioImpact: "Bật lên để dùng BswM_GetVersionInfo() hoặc kiểm tra xuất mã C."
  },
  BswMMainFunctionPeriod: {
    title: "BswMMainFunctionPeriod",
    ecucPath: "BswMGeneral / BswMMainFunctionPeriod",
    sws: "SWS_BswM_00053 · ECUC_BswM_00804",
    range: "float / uint32 (1 .. 100 ms, typical: 10 ms)",
    role: "Chu kỳ gọi định kỳ BswM_MainFunction() từ Basic Software Scheduler (SchM).",
    mechanism: "Mỗi chu kỳ MainFunction, BswM giải phóng hàng đợi BSWM_DEFERRED, giảm bộ đếm BswMTimer và đánh giá các Rule/ActionList kiểu BSWM_CONDITION.",
    scenarioImpact: "Quyết định bước nhảy thời gian khi bấm Auto Clock và tốc độ đếm ngược BswMTimer_0 ở kịch bản S11."
  },
  BswMComMEnabled: {
    title: "BswMComMEnabled",
    ecucPath: "BswMGeneral / BswMComMEnabled",
    sws: "SWS_BswM_00047 · ECUC_BswM_00805",
    range: "boolean (true | false)",
    role: "Bật tích hợp giao diện BswM_ComM_CurrentMode() và hành động BswMComMAllowCom / BswMComMModeSwitch.",
    mechanism: "Nếu tắt, BswM không xử lý cổng MRP_ComM_Ch0 và không cho phép xuất phần cấu hình ComM Indication.",
    scenarioImpact: "Phải bật TRUE cho các kịch bản S2, S3, S10, S13."
  },
  BswMDcmEnabled: {
    title: "BswMDcmEnabled (& BswMEcuMEnabled)",
    ecucPath: "BswMGeneral / BswMDcmEnabled",
    sws: "SWS_BswM_00048 · ECUC_BswM_00807",
    range: "boolean (true | false)",
    role: "Bật tích hợp cổng nhận trạng thái từ module chẩn đoán Dcm (0x28) và quản lý trạng thái EcuM.",
    mechanism: "Cho phép hàm BswM_Dcm_CommunicationMode_CurrentState() cập nhật cổng MRP_Dcm_ComCtrl.",
    scenarioImpact: "Ảnh hưởng trực tiếp tới kịch bản S12 (UDS 0x28 CommunicationControl)."
  },
  MRP_ComM_Ch0_Processing: {
    title: "BswMRequestProcessing (MRP_ComM_Ch0)",
    ecucPath: "BswMArbitration / BswMModeRequestPort / MRP_ComM_Ch0 / BswMRequestProcessing",
    sws: "SWS_BswM_00051 · SWS_BswM_00052 · ECUC_BswM_00815",
    range: "BSWM_IMMEDIATE | BSWM_DEFERRED",
    role: "Quy định BswM xử lý thông báo từ ComM ngay lập tức trong hàm gọi hay hoãn tới BswM_MainFunction().",
    mechanism: "BSWM_IMMEDIATE: Đánh giá Rule_02/Rule_03 và bật/tắt I-PDU Group ngay trước khi BswM_ComM_CurrentMode() return. BSWM_DEFERRED: Đẩy vào Deferred Queue chờ MainFunction.",
    scenarioImpact: "Chuyển sang DEFERRED trong kịch bản S2/S5 để quan sát sự khác biệt về thời điểm bật Com_IpduGroupStart()."
  },
  MRP_CanSM_Ch0_Processing: {
    title: "BswMRequestProcessing (MRP_CanSM_Ch0)",
    ecucPath: "BswMArbitration / BswMModeRequestPort / MRP_CanSM_Ch0 / BswMRequestProcessing",
    sws: "SWS_BswM_00051 · ECUC_BswM_00815",
    range: "BSWM_IMMEDIATE | BSWM_DEFERRED",
    role: "Quy định thời điểm đánh giá khi CanSM báo trạng thái CAN (đặc biệt là CANSM_BSWM_BUS_OFF).",
    mechanism: "Theo khuyến nghị AUTOSAR, cổng CanSM phải đặt BSWM_IMMEDIATE để cắt ngay Tx I-PDU Group trong hàm BswM_CanSM_CurrentState() khi vừa Bus-Off.",
    scenarioImpact: "Trọng tâm kịch bản S4: thử đổi sang BSWM_DEFERRED để thấy độ trễ nguy hiểm khi Bus-Off!"
  },
  MRP_Dcm_ComCtrl_Processing: {
    title: "BswMRequestProcessing (MRP_Dcm_ComCtrl)",
    ecucPath: "BswMArbitration / BswMModeRequestPort / MRP_Dcm_ComCtrl / BswMRequestProcessing",
    sws: "SWS_BswM_00048 · ECUC_BswM_00815",
    range: "BSWM_IMMEDIATE | BSWM_DEFERRED",
    role: "Quy định thời điểm phản ứng khi Dcm nhận lệnh UDS 0x28 CommunicationControl.",
    mechanism: "Đặt BSWM_IMMEDIATE giúp BswM đóng/mở các nhóm PDU ứng dụng và Nm tức thời ngay khi Dcm báo mode.",
    scenarioImpact: "Liên quan trực tiếp tới kịch bản S12 (DCM 0x28)."
  },
  MRP_EcuM_State_Processing: {
    title: "BswMRequestProcessing (MRP_EcuM_State)",
    ecucPath: "BswMArbitration / BswMModeRequestPort / MRP_EcuM_State / BswMRequestProcessing",
    sws: "SWS_BswM_00050 · ECUC_BswM_00815",
    range: "BSWM_DEFERRED | BSWM_IMMEDIATE",
    role: "Quy định ngữ cảnh xử lý thông báo chuyển pha vòng đời ECU từ EcuM (STARTUP_TWO, PREP_SHUTDOWN...).",
    mechanism: "Thường cấu hình BSWM_DEFERRED để BswM điều phối NvM_ReadAll / Rte_Start / Shutdown tuần tự trong MainFunction.",
    scenarioImpact: "Trọng tâm kịch bản S1 (Startup) và S13 (Shutdown)."
  },
  MRP_NvM_Job_Processing: {
    title: "BswMRequestProcessing (MRP_NvM_Job)",
    ecucPath: "BswMArbitration / BswMModeRequestPort / MRP_NvM_Job / BswMRequestProcessing",
    sws: "SWS_BswM_00109 · ECUC_BswM_00815",
    range: "BSWM_DEFERRED | BSWM_IMMEDIATE",
    role: "Quy định thời điểm đánh giá Rule sau khi NvM gọi callback BswM_NvM_CurrentJobMode(NVM_READ_ALL/WRITE_ALL).",
    mechanism: "Khi đặt DEFERRED, BswM ghi nhận kết quả NVM_REQ_OK và mở khóa Rte_Start() / GoDown ở chu kỳ MainFunction kế tiếp.",
    scenarioImpact: "Thử đổi sang IMMEDIATE ở kịch bản S1 để thấy Rte_Start() chạy ngay trong callback NvM."
  },
  MRP_Swc_AppMode_Processing: {
    title: "BswMRequestProcessing (MRP_Swc_AppMode)",
    ecucPath: "BswMArbitration / BswMModeRequestPort / MRP_Swc_AppMode / BswMRequestProcessing",
    sws: "SWS_BswM_00132 · ECUC_BswM_00816",
    range: "BSWM_DEFERRED | BSWM_IMMEDIATE",
    role: "Quy định xử lý cho cổng BswMSwcModeRequest nhận từ SWC thông qua RTE (Rte_Write).",
    mechanism: "Hầu hết các cổng SWC đặt BSWM_DEFERRED để đồng bộ đánh giá cùng chu kỳ OS Task 10ms và giảm tải Context Switching.",
    scenarioImpact: "Trọng tâm kịch bản S5 (IMMEDIATE vs DEFERRED) và S9 (SWC ↔ BswM)."
  },
  Rule02_ComMFull_InitState: {
    title: "BswMRuleInitState (Rule_02_ComMFullCom)",
    ecucPath: "BswMArbitration / BswMRule / Rule_02 / BswMRuleInitState",
    sws: "SWS_BswM_00056 · ECUC_BswM_00822",
    range: "BSWM_FALSE | BSWM_TRUE | BSWM_UNDEFINED",
    role: "Giá trị kết quả kỳ trước (PrevResult) được nạp sẵn cho Rule_02 ngay lúc BswM_Init().",
    mechanism: "Nếu đặt BSWM_UNDEFINED: lần đánh giá đầu tiên dù kết quả ra TRUE hay FALSE đều được tính là ĐỔI TRẠNG THÁI (RuleChanged=1) để kích hoạt ActionList kiểu BSWM_TRIGGER!",
    scenarioImpact: "Trọng tâm kịch bản S7: chứng minh tại sao BSWM_UNDEFINED rất quan trọng cho FalseActionList."
  },
  Rule02_LogicalOperator: {
    title: "BswMLogicalOperator (Rule_02_ComMFullCom)",
    ecucPath: "BswMArbitration / BswMLogicalExpression / Expr_ComMFull / BswMLogicalOperator",
    sws: "SWS_BswM_00055 · ECUC_BswM_00825",
    range: "BSWM_AND | BSWM_OR | BSWM_XOR | BSWM_NAND",
    role: "Toán tử logic kết hợp giữa điều kiện (MRP_ComM == FULL_COM) và (MRP_CanSM == FULL_COM).",
    mechanism: "Mặc định là BSWM_AND: cả ComM và CanSM đều phải xác nhận FULL_COM (không bị BUS_OFF) thì Rule_02 mới bằng TRUE.",
    scenarioImpact: "Thử chuyển sang BSWM_OR ở kịch bản S2 hoặc S4 để quan sát tác động của bảng chân trị."
  },
  Rule02_EnableFalseActionList: {
    title: "BswMFalseActionList Enable (Rule_02)",
    ecucPath: "BswMArbitration / BswMRule / Rule_02 / BswMFalseActionList",
    sws: "SWS_BswM_00056 · ECUC_BswM_00824",
    range: "boolean (true | false)",
    role: "Bật/tắt nhánh hành động AL_DisableTxRxDM khi biểu thức của Rule_02 đánh giá ra BSWM_FALSE.",
    mechanism: "Khi bật, hễ Rule_02 lật TRUE → FALSE (hoặc UNDEFINED → FALSE), BswM tự động gọi Com_IpduGroupStop(IG_0_Tx) & DisableReceptionDM.",
    scenarioImpact: "Tắt đi ở kịch bản S3 hoặc S7 để so sánh thiết kế dùng FalseActionList với dùng Rule riêng."
  },
  Rule06_SwcSport_InitState: {
    title: "BswMRuleInitState (Rule_06_SwcSportMode)",
    ecucPath: "BswMArbitration / BswMRule / Rule_06 / BswMRuleInitState",
    sws: "SWS_BswM_00056 · ECUC_BswM_00822",
    range: "BSWM_FALSE | BSWM_UNDEFINED",
    role: "Trạng thái khởi đầu của Rule_06 kiểm tra điều kiện (Swc == SPORT && ComM == FULL_COM).",
    mechanism: "Đặt BSWM_UNDEFINED nếu muốn ngay chu kỳ đầu tiên sau Init phải chắc chắn chạy Rte_Switch(NORMAL) thông qua FalseActionList.",
    scenarioImpact: "Tác động trực tiếp ở kịch bản S7 và S9."
  },
  EnableIndependentRuleEvaluation: {
    title: "Independent Rule Evaluation",
    ecucPath: "BswMConfig / BswMArbitration / Optimization",
    sws: "SWS_BswM_00051 · SWS_BswM_00053",
    range: "boolean (true | false)",
    role: "Tối ưu hóa đánh giá luật: chỉ chạy các Rule phụ thuộc trực tiếp vào cổng MRP vừa thay đổi.",
    mechanism: "Khi true, chỉ Rule nào tham chiếu tới cổng MRP vừa cập nhật mới được tính lại. Khi false, BswM quét toàn bộ bảng Rule trong mỗi sự kiện.",
    scenarioImpact: "Ảnh hưởng tới danh sách Rule được đánh giá lại ở cột ActionList trên bảng Rule Matrix."
  },
  GenericReq_UserId_And_MaxMode: {
    title: "BswMGenericRequest (UserId / ModeMax)",
    ecucPath: "BswMArbitration / BswMGenericRequest / BswMModeRequesterId & Max",
    sws: "SWS_BswM_00046 · ECUC_BswM_00845",
    range: "Text format: '<UserId> / <MaxMode>' (VD: '1 / 3')",
    role: "Cấu hình mã User hợp lệ tối đa và dải Mode hợp lệ cho hàm đa năng BswM_RequestMode(requesting_user, requested_mode).",
    mechanism: "Nếu gọi BswM_RequestMode với User > MaxUser hoặc Mode > MaxMode, BswM từ chối và báo DET BSWM_E_REQ_USER_OUT_OF_RANGE / BSWM_E_REQ_MODE_OUT_OF_RANGE.",
    scenarioImpact: "Thử sửa ngưỡng trong ô textbox này và test lỗi DET ở kịch bản S9 & S14."
  },
  AL_EnableTxRxDM_Execution: {
    title: "BswMActionListExecution (AL_EnableTxRxDM)",
    ecucPath: "BswMModeControl / BswMActionList / AL_EnableTxRxDM / BswMActionListExecution",
    sws: "SWS_BswM_00056 · SWS_BswM_00057 · ECUC_BswM_00830",
    range: "BSWM_TRIGGER | BSWM_CONDITION",
    role: "Chọn kiểu thực thi theo sườn thay đổi (TRIGGER) hay theo mức duy trì (CONDITION) cho danh sách bật Tx/Rx PDU.",
    mechanism: "BSWM_TRIGGER: Chỉ chạy khi Rule_02 đổi từ FALSE → TRUE (hoặc UNDEFINED → TRUE). BSWM_CONDITION: Chạy lặp lại mỗi chu kỳ MainFunction miễn Rule_02 == TRUE.",
    scenarioImpact: "Trọng tâm kịch bản S6: đổi sang CONDITION rồi bấm +10ms Tick để thấy Com_IpduGroupStart chạy lặp lại!"
  },
  AL_SwcSportMode_Execution: {
    title: "BswMActionListExecution (AL_SwcSportMode)",
    ecucPath: "BswMModeControl / BswMActionList / AL_SwcSportMode / BswMActionListExecution",
    sws: "SWS_BswM_00057 · ECUC_BswM_00830",
    range: "BSWM_CONDITION | BSWM_TRIGGER",
    role: "Chọn chế độ thực thi cho ActionList điều khiển chế độ lái SPORT của SWC.",
    mechanism: "Mặc định đặt BSWM_CONDITION trong kịch bản S6 để minh họa hành động lặp lại mỗi chu kỳ BswM_MainFunction() khi điều kiện giữ nguyên TRUE.",
    scenarioImpact: "Trọng tâm kịch bản S6 và S9."
  },
  BswMActionListPriority: {
    title: "BswMActionListPriority",
    ecucPath: "BswMModeControl / BswMActionList / BswMActionListPriority",
    sws: "SWS_BswM_00060 · ECUC_BswM_00912",
    range: "uint8 (0 = Highest .. 255)",
    role: "Thứ tự ưu tiên khi nhiều ActionList được xếp lịch chạy trong cùng một chu kỳ BswM_MainFunction().",
    mechanism: "ActionList có số Priority nhỏ hơn sẽ thực thi trước (ví dụ tắt/bật nguồn ưu tiên hơn gửi bản tin thông báo).",
    scenarioImpact: "Hiển thị thứ tự ưu tiên trên API Trace và trong file cấu hình BswM_Lcfg.c."
  },
  BswMAbortOnFail: {
    title: "BswMAbortOnFail",
    ecucPath: "BswMModeControl / BswMActionList / BswMActionListItem / BswMAbortOnFail",
    sws: "SWS_BswM_00065 · ECUC_BswM_00833",
    range: "boolean (true | false)",
    role: "Quyết định BswM có dừng ngay chuỗi hành động nếu một bước con trả về E_NOT_OK hay không.",
    mechanism: "Khi true và bước #2 trả về E_NOT_OK, BswM bật Bit 1 (ABORT_FAIL = 1) và hủy bỏ bước #3, #4 còn lại thay vì chạy tiếp.",
    scenarioImpact: "Trọng tâm kịch bản S8 (kết hợp cùng InjectActionItemFailure)."
  },
  InjectActionItemFailure: {
    title: "Test Fault Injection (Item #2 Returns E_NOT_OK)",
    ecucPath: "Simulation Fault Injector / ActionItemStatus",
    sws: "SWS_BswM_00065",
    range: "boolean (false = E_OK | true = E_NOT_OK)",
    role: "Công cụ mô phỏng lỗi phần cứng/BSW khiến bước hành động thứ 2 trong Cascaded ActionList trả về E_NOT_OK.",
    mechanism: "Dùng để kiểm chứng tức thì sự khác biệt giữa BswMAbortOnFail = TRUE (dừng sớm) và FALSE (bỏ qua lỗi chạy tiếp).",
    scenarioImpact: "Bật lên ở kịch bản S8 để xem Bit 1 Thanh B sáng đỏ và Item #3/#4 bị hủy."
  },
  EnableCascadedActionList: {
    title: "Enable Cascaded ActionList (Nested List / Sub-Rule)",
    ecucPath: "BswMModeControl / BswMActionListItem / BswMActionListRef",
    sws: "SWS_BswM_00060 · SWS_BswM_00061",
    range: "boolean (true | false)",
    role: "Cho phép một ActionList cha gọi lồng sang một ActionList con (AL_Sub_PduRAndTrigger) và một Sub-Rule.",
    mechanism: "Giúp tái sử dụng các cụm hành động dùng chung (Modular Policy Design) trong dự án AUTOSAR lớn.",
    scenarioImpact: "Minh họa rõ chuỗi lồng nhau ở kịch bản S8."
  },
  BswMPduGroupSwitchReinit: {
    title: "BswMPduGroupSwitchReinit",
    ecucPath: "BswMModeControl / BswMAction / BswMPduGroupSwitch / BswMPduGroupSwitchReinit",
    sws: "SWS_BswM_00119 · ECUC_BswM_00861",
    range: "boolean (true | false)",
    role: "Giá trị tham số initialize truyền cho hàm Com_IpduGroupStart(IpduGroupId, initialize).",
    mechanism: "TRUE: AUTOSAR COM khởi tạo lại toàn bộ các signal/PDU trong nhóm về giá trị init mặc định và reset timer DM. FALSE: Giữ nguyên buffer cũ.",
    scenarioImpact: "Quan sát tham số TRUE/FALSE xuất hiện trong API Call Trace tại kịch bản S2."
  },
  EnableReceptionDmControl: {
    title: "BswMDeadlineMonitoringControl",
    ecucPath: "BswMModeControl / BswMAction / BswMDeadlineMonitoringControl",
    sws: "SWS_BswM_00122 · ECUC_BswM_00865",
    range: "boolean (true | false)",
    role: "Cho phép BswM bật/tắt cơ chế giám sát timeout bản tin nhận (Com_EnableReceptionDM / Com_DisableReceptionDM).",
    mechanism: "Bắt buộc tắt Rx DM khi mạng về SILENT_COM, NO_COM hoặc khi xảy ra BUS_OFF để ngăn DEM ghi nhận mã lỗi timeout DTC giả.",
    scenarioImpact: "Quan sát Bit 4 (RX_DM_EN) và Bit 2 (IG_2_DM) ở kịch bản S2, S3, S4."
  },
  EnableTriggerIpduSendAction: {
    title: "BswMTriggerIPduSend",
    ecucPath: "BswMModeControl / BswMAction / BswMTriggerIPduSend",
    sws: "SWS_BswM_00121 · ECUC_BswM_00870",
    range: "boolean (true | false)",
    role: "Bật hành động gọi Com_TriggerIPDUSend(PduId) ngay khi kích hoạt ActionList.",
    mechanism: "Thường dùng để phát ngay một bản tin báo trạng thái mới lên bus mà không phải đợi hết chu kỳ phát định kỳ của COM.",
    scenarioImpact: "Bật lên để thấy lệnh Com_TriggerIPDUSend() trong kịch bản S2 và S9."
  },
  EnablePduRouterControl: {
    title: "BswMPduRouterControl",
    ecucPath: "BswMModeControl / BswMAction / BswMPduRouterControl",
    sws: "SWS_BswM_00105 · ECUC_BswM_00875",
    range: "boolean (true | false)",
    role: "Cho phép BswM gọi PduR_EnableRouting(RPG_0_Gateway) và PduR_DisableRouting() theo trạng thái mạng/Timer.",
    mechanism: "Đóng mở nhóm đường định tuyến Gateway giữa các bus vật lý khi cần cách ly hoặc chuyển nguồn.",
    scenarioImpact: "Ảnh hưởng trực tiếp tới Bit 7 (RPG_0_GW) trong vector PDU và kịch bản S2, S3, S11."
  },
  BswMComMPncEnabled: {
    title: "BswMComMPncEnabled",
    ecucPath: "BswMGeneral / BswMComMPncEnabled",
    sws: "SWS_BswM_00148 · ECUC_BswM_00806",
    range: "boolean (true | false)",
    role: "Cho phép BswM nhận thông báo trạng thái cụm mạng con BswM_ComM_CurrentPNCMode(PNC, Mode).",
    mechanism: "Khi true, Rule_05 điều khiển đóng/mở riêng cặp nhóm IG_3_PNC16_Tx và IG_4_PNC16_Rx theo trạng thái của PNC #16.",
    scenarioImpact: "Trọng tâm kịch bản S10 (Partial Networking PNC #16)."
  },
  BswMTimerValue: {
    title: "BswMTimerValue (BswMTimerControl)",
    ecucPath: "BswMModeControl / BswMAction / BswMTimerControl / BswMTimerValue",
    sws: "SWS_BswM_00205 · ECUC_BswM_00940",
    range: "uint32 (10 .. 5000 ms, typical: 300 ms)",
    role: "Khoảng thời gian đếm ngược của bộ đếm nội bộ BswMTimer_0 tính bằng ms.",
    mechanism: "Mỗi lần gọi BswM_MainFunction(), bộ đếm giảm đi BswMMainFunctionPeriod ms; khi về 0 chuyển MRP_Timer0_State sang BSWM_TIMER_EXPIRED.",
    scenarioImpact: "Trọng tâm kịch bản S11 (Timer Control) và kịch bản S1 (NvM Timeout Rescue)."
  },
  EcuMShutdownTarget: {
    title: "BswMEcuMSelectShutdownTarget",
    ecucPath: "BswMModeControl / BswMAction / BswMEcuMSelectShutdownTarget",
    sws: "SWS_BswM_00102 · ECUC_BswM_00890",
    range: "ECUM_STATE_OFF | ECUM_STATE_SLEEP | ECUM_STATE_RESET",
    role: "Chọn đích tắt máy truyền xuống EcuM_SelectShutdownTarget() trước khi kết thúc pha PREP_SHUTDOWN.",
    mechanism: "Quy định ECU sẽ sập nguồn hẳn (OFF), vào giấc ngủ sâu (SLEEP), hay tự khởi động lại (RESET - dùng cho UDS 0x11 ECUReset).",
    scenarioImpact: "Thử chuyển sang ECUM_STATE_RESET ở kịch bản S13."
  },
  RequireNvMReadAllBeforeRteStart: {
    title: "Startup Gate: Require NvM_ReadAll OK",
    ecucPath: "BswMArbitration / Rule_01b_RunReady / Condition",
    sws: "SWS_BswM_00109 · SWS_BswM_00237",
    range: "boolean (true | false)",
    role: "Yêu cầu Rule khởi động phải chờ BswM_NvM_CurrentJobMode(NVM_READ_ALL, NVM_REQ_OK) mới gọi Rte_Start().",
    mechanism: "Ngăn SWC đọc nhầm dữ liệu RAM rác trước khi NvM kịp khôi phục thông số cấu hình/hiệu chuẩn từ Flash/EEPROM.",
    scenarioImpact: "Trọng tâm kịch bản S1 (Startup Sequence)."
  },
  RequireNvMWriteAllBeforeGoOff: {
    title: "Shutdown Gate: Require NvM_WriteAll OK",
    ecucPath: "BswMArbitration / Rule_08_GoOff / Condition",
    sws: "SWS_BswM_00109 · SWS_BswM_00043",
    range: "boolean (true | false)",
    role: "Yêu cầu Rule tắt máy phải chờ BswM_NvM_CurrentJobMode(NVM_WRITE_ALL, NVM_REQ_OK) mới gọi EcuM_GoDownHaltPoll().",
    mechanism: "Bảo vệ dữ liệu DTC, Odometer và cấu hình người dùng khỏi bị mất khi cắt nguồn đột ngột.",
    scenarioImpact: "Trọng tâm kịch bản S13 (Safe ECU Shutdown)."
  },
  DcmCommunicationControlMode: {
    title: "Dcm CommunicationControl Mode (UDS 0x28)",
    ecucPath: "BswMArbitration / MRP_Dcm_ComCtrl / ActiveValue",
    sws: "SWS_BswM_00048",
    range: "DCM_ENABLE_RX_TX_NORM_NM .. DCM_DISABLE_RX_TX_NORM_NM",
    role: "Chế độ giao tiếp do Tester gửi qua dịch vụ UDS 0x28 (CommunicationControl) xuống Dcm và báo sang BswM.",
    mechanism: "Cho phép khóa chọn lọc bản tin Normal (IG_0_Tx, IG_1_Rx) và/hoặc bản tin NM (IG_6_NM) trong khi vẫn giữ mở bản tin chẩn đoán (IG_5_Diag).",
    scenarioImpact: "Trọng tâm kịch bản S12 (UDS 0x28)."
  },
  EnableNmControlOnDcm0x28: {
    title: "BswMNmControl (Nm_Disable / EnableCommunication)",
    ecucPath: "BswMModeControl / BswMAction / BswMNmControl",
    sws: "SWS_BswM_00104 · ECUC_BswM_00880",
    range: "boolean (true | false)",
    role: "Cho phép BswM gọi Nm_DisableCommunication(Ch0) / Nm_EnableCommunication(Ch0) khi lệnh DCM 0x28 tác động tới kênh NM.",
    mechanism: "Cấm CanNm phát và nhận gói NM trên bus trong quá trình nạp lại phần mềm (ECU Flashing).",
    scenarioImpact: "Tác động tới Bit IG_6_NM trong kịch bản S12."
  },
  EnableWdgMPartitionResetRule: {
    title: "BswMWdgMRequestPartitionReset",
    ecucPath: "BswMArbitration / BswMWdgMRequestPartitionReset",
    sws: "SWS_BswM_00156 · ECUC_BswM_00898",
    range: "boolean (true | false)",
    role: "Cho phép BswM xử lý thông báo vi phạm giám sát Watchdog từ WdgM để thực hiện khởi động lại phân vùng/ECU.",
    mechanism: "Khi WdgM gọi BswM_WdgM_RequestPartitionReset(), BswM lập tức ngắt PDU Tx và điều hướng Reset khẩn cấp.",
    scenarioImpact: "Dùng trong What-If của kịch bản S13."
  }
};

const MODULES_INFO = {
  MOD_BSWM: {
    id: "MOD_BSWM",
    name: "BswM Core Engine (BSW Mode Manager)",
    layer: "System Services (SWS_BswM)",
    role: "Bộ não điều phối chính sách (Policy Engine) của toàn bộ tầng BSW và giao tiếp chế độ với SWC/RTE. Tách biệt thành Mode Arbitration (Đánh giá Luật) và Mode Control (Thực thi ActionList).",
    inputs: "Các cổng Mode Request Port (MRP) nhận thông báo tức thời hoặc hoãn lại từ EcuM, NvM, ComM, CanSM, Dcm, WdgM, SWC/RTE, Generic User và BswMTimer.",
    processing: "1) Phân loại BSWM_IMMEDIATE (xử lý ngay) vs BSWM_DEFERRED (xếp hàng đợi MainFunction). 2) Tính biểu thức BswMLogicalExpression (AND/OR/XOR/NAND). 3) So sánh PrevResult vs CurrResult (hỗ trợ BSWM_UNDEFINED). 4) Quyết định chạy ActionList theo BSWM_TRIGGER hoặc BSWM_CONDITION và kiểm tra BswMAbortOnFail.",
    outputs: "Gọi xuống COM (Com_IpduGroupStart/Stop, ReceptionDM, TriggerIPDUSend), PduR (Enable/DisableRouting), ComM (CommunicationAllowed), Nm (Disable/EnableComm), RTE (Rte_Start/Stop/Switch), SchM (SchM_Switch), EcuM (GoDownHaltPoll), NvM (ReadAll/WriteAll) và DET.",
    apis: [
      "void BswM_Init(const BswM_ConfigType* ConfigPtr)",
      "void BswM_Deinit(void)",
      "void BswM_MainFunction(void)",
      "Std_ReturnType BswM_RequestMode(BswM_UserType requesting_user, BswM_ModeType requested_mode)"
    ]
  },
  MOD_SWC: {
    id: "MOD_SWC",
    name: "SWC_ModeMgr & SWC_App",
    layer: "Application Layer",
    role: "Các thành phần phần mềm ứng dụng trên tầng Application tương tác 2 chiều với BswM thông qua cổng giao diện của RTE.",
    inputs: "Nhận sự kiện chuyển chế độ (SwcModeSwitchEvent) qua Rte_Switch để kích hoạt Runnable OnEntry/OnTransition/OnExit.",
    processing: "Khi logic ứng dụng muốn đổi chế độ vận hành xe (NORMAL / SPORT / ECO) hoặc xin tắt máy, SWC_ModeMgr ghi yêu cầu vào cổng Sender-Receiver nối tới BswMSwcModeRequest và chờ BswM phân xử cùng trạng thái mạng CAN/điện áp trước khi phản hồi lại.",
    outputs: "Ghi cổng Rte_Write_MRP_SwcModeReq_requestedMode(Mode) xuống RTE → BswM.",
    apis: [
      "Std_ReturnType Rte_Write_MRP_SwcModeReq_requestedMode(AppModeType mode)",
      "Std_ReturnType Rte_Read_MRP_SwcModeReq_requestedMode(AppModeType* mode)",
      "void Runnable_OnEntry_SportMode(void)"
    ]
  },
  MOD_RTE: {
    id: "MOD_RTE",
    name: "RTE & SchM (Runtime & Scheduler)",
    layer: "RTE Layer",
    role: "Cầu nối giao tiếp Mode Request/Switch giữa SWC với BswM, đồng thời là bộ lập lịch gọi hàm chu kỳ BswM_MainFunction() và quản lý ExclusiveArea.",
    inputs: "Lệnh Rte_Start(), Rte_Stop(), Rte_Switch(), SchM_Switch() từ BswM ActionList; lời gọi Rte_Write() từ SWC.",
    processing: "Gọi BswM_MainFunction() định kỳ mỗi BswMMainFunctionPeriod (10ms) để xả hàng đợi DEFERRED và cập nhật BswMTimer. Bảo vệ vùng găng chống xung đột Re-entrancy qua SchM_Enter_BswM_BSWM_EXCLUSIVE_AREA_0().",
    outputs: "Kích hoạt BswM_MainFunction() và phân phối sự kiện chuyển Mode lên các SWC / BSW Scheduler.",
    apis: [
      "Std_ReturnType Rte_Start(void) / Rte_Stop(void)",
      "Std_ReturnType Rte_Switch_BswM_SwitchPort_AppMode(uint8 mode)",
      "Std_ReturnType SchM_Switch_BswM_BswSchedule(uint8 mode)",
      "void BswM_MainFunction(void)"
    ]
  },
  MOD_ECUM: {
    id: "MOD_ECUM",
    name: "EcuM (ECU State Manager Flexible)",
    layer: "System Services (SWS_EcuM)",
    role: "Khởi tạo phần cứng ban đầu, gọi BswM_Init() và giao quyền điều phối chi tiết các pha RUN / POST_RUN / PREP_SHUTDOWN / GO_OFF cho BswM.",
    inputs: "Sự kiện bật/tắt khóa điện IG, Wakeup phần cứng và lệnh EcuM_SelectShutdownTarget() / EcuM_GoDownHaltPoll() từ BswM.",
    processing: "Trong EcuM Flexible, EcuM chỉ giữ khung lõi Startup/Sleep/Off tối giản; toàn bộ logic khi nào được phép mở RTE, khi nào được phép sập nguồn sau khi ghi Flash đều do các Rule của BswM quyết định.",
    outputs: "Gọi BswM_Init(), BswM_EcuM_CurrentState(), BswM_EcuM_CurrentWakeup() và BswM_EcuM_RequestedState() vào BswM.",
    apis: [
      "void BswM_EcuM_CurrentState(EcuM_StateType CurrentState)",
      "void BswM_EcuM_CurrentWakeup(EcuM_WakeupSourceType source, EcuM_WakeupStatusType state)",
      "Std_ReturnType EcuM_GoDownHaltPoll(uint16 caller)",
      "Std_ReturnType EcuM_SelectShutdownTarget(EcuM_ShutdownTargetType target, uint8 mode)"
    ]
  },
  MOD_COMM: {
    id: "MOD_COMM",
    name: "ComM & Nm (Comm & Network Mgmt)",
    layer: "Communication Services",
    role: "Quản lý trạng thái thức/ngủ của các kênh truyền thông và các cụm mạng con Partial Network (PNC), phối hợp chặt chẽ hai chiều với BswM.",
    inputs: "Nhận lệnh mở khóa ComM_CommunicationAllowed(Ch, TRUE/FALSE), ComM_RequestComMode() và Nm_Disable/EnableCommunication() từ BswM.",
    processing: "Ngay khi CanSM xác nhận chế độ mạng mới hoặc trạng thái PNC thay đổi, ComM báo về BswM để BswM biết thời điểm an toàn bật/tắt các I-PDU Group trên AUTOSAR COM.",
    outputs: "Gọi BswM_ComM_CurrentMode(Network, RequestedMode) và BswM_ComM_CurrentPNCMode(PNC, CurrentPncMode).",
    apis: [
      "void BswM_ComM_CurrentMode(NetworkHandleType Network, ComM_ModeType RequestedMode)",
      "void BswM_ComM_CurrentPNCMode(PNCHandleType PNC, ComM_PncModeType CurrentPncMode)",
      "void ComM_CommunicationAllowed(NetworkHandleType Channel, boolean Allowed)",
      "Std_ReturnType Nm_DisableCommunication(NetworkHandleType nmChannelHandle)"
    ]
  },
  MOD_CANSM: {
    id: "MOD_CANSM",
    name: "CanSM / BusSM (Bus State Manager)",
    layer: "Communication Services",
    role: "Điều khiển máy trạng thái phần cứng bộ điều khiển CAN (CanIf Controller / CanTrcv) và thực thi khôi phục lỗi Bus-Off.",
    inputs: "Lệnh chuyển chế độ từ ComM và ngắt báo lỗi Bus-Off từ CanIf.",
    processing: "Mỗi khi phần cứng CAN chuyển trạng thái (đặc biệt khi vừa phát hiện CANSM_BSWM_BUS_OFF hoặc vừa khôi phục xong), CanSM báo ngay vào BswM với cấu hình BSWM_IMMEDIATE.",
    outputs: "Gọi BswM_CanSM_CurrentState(Network, CurrentState) giúp BswM cắt khẩn cấp Tx I-PDU Group & Reception DM khi Bus-Off.",
    apis: [
      "void BswM_CanSM_CurrentState(NetworkHandleType Network, CanSM_BswMCurrentStateType CurrentState)"
    ]
  },
  MOD_COM: {
    id: "MOD_COM",
    name: "AUTOSAR COM",
    layer: "Communication Services",
    role: "Quản lý đóng gói tín hiệu và phát/nhận các gói I-PDU ứng dụng, giám sát Deadline Monitoring cho các bản tin Rx.",
    inputs: "Nhận vector nhóm PDU và các lệnh Com_IpduGroupStart(), Com_IpduGroupStop(), Com_EnableReceptionDM(), Com_DisableReceptionDM(), Com_TriggerIPDUSend() từ BswM.",
    processing: "Mặc định sau Com_Init(), mọi I-PDU Group đều ở trạng thái STOPPED. COM hoàn toàn bị động, chỉ bật truyền/nhận khi BswM ra lệnh theo trạng thái ComM/CanSM/PNC/DCM.",
    outputs: "Kích hoạt hoặc ngừng đẩy Tx I-PDU xuống PduR/CanIf và bật/tắt bộ đếm timeout Rx.",
    apis: [
      "void Com_IpduGroupStart(Com_IpduGroupIdType IpduGroupId, boolean initialize)",
      "void Com_IpduGroupStop(Com_IpduGroupIdType IpduGroupId)",
      "void Com_EnableReceptionDM(Com_IpduGroupIdType IpduGroupId)",
      "void Com_DisableReceptionDM(Com_IpduGroupIdType IpduGroupId)",
      "Std_ReturnType Com_TriggerIPDUSend(PduIdType PduId)"
    ]
  },
  MOD_PDUR: {
    id: "MOD_PDUR",
    name: "PduR (PDU Router)",
    layer: "Communication Services",
    role: "Định tuyến gói tin PDU giữa các module giao tiếp và định tuyến Gateway đa kênh thông qua các Routing Path Group (RPG).",
    inputs: "Nhận lệnh BswMPduRouterControl từ ActionList của BswM: PduR_EnableRouting() và PduR_DisableRouting().",
    processing: "Cho phép bật/tắt động các bảng định tuyến liên mạng (ví dụ RPG_0_Gateway) dựa trên chế độ xe, trạng thái kênh hoặc bộ đếm BswMTimer.",
    outputs: "Đóng hoặc mở dòng chuyển tiếp PDU qua Gateway giữa CAN0 và CAN1.",
    apis: [
      "void PduR_EnableRouting(PduR_RoutingPathGroupIdType id)",
      "void PduR_DisableRouting(PduR_RoutingPathGroupIdType id, boolean initialize)"
    ]
  },
  MOD_DCM: {
    id: "MOD_DCM",
    name: "DCM (UDS 0x28 / 0x11 Diagnostics)",
    layer: "Diagnostic Services",
    role: "Tiếp nhận các dịch vụ chẩn đoán UDS từ máy Tester (0x28 CommunicationControl, 0x11 ECUReset) và chuyển tiếp yêu cầu kiểm soát truyền thông sang BswM.",
    inputs: "Yêu cầu UDS 0x28 từ Tester (Enable/Disable Rx/Tx Normal và/hoặc NM).",
    processing: "Dcm không tự gọi thẳng vào COM hay Nm để tắt bản tin ứng dụng, mà gọi BswM_Dcm_CommunicationMode_CurrentState() để BswM đánh giá Rule và khóa nhóm I-PDU tương ứng trong khi vẫn giữ mở IG_5_Diag_Pdu.",
    outputs: "Gọi BswM_Dcm_CommunicationMode_CurrentState(Network, RequestedMode) và BswM_Dcm_ApplicationUpdated() vào BswM.",
    apis: [
      "void BswM_Dcm_CommunicationMode_CurrentState(NetworkHandleType Network, Dcm_CommunicationModeType RequestedMode)",
      "void BswM_Dcm_ApplicationUpdated(void)"
    ]
  },
  MOD_NVM: {
    id: "MOD_NVM",
    name: "NvM & WdgM (Memory & Safety)",
    layer: "Memory & Safety Services",
    role: "NvM đọc/ghi dữ liệu bền vững Flash/EEPROM khi khởi động/tắt máy; WdgM giám sát tiến trình thực thi phần mềm an toàn.",
    inputs: "NvM nhận lệnh NvM_ReadAll() / NvM_WriteAll() từ BswM Callout Action.",
    processing: "Khi đọc/ghi xong toàn bộ khối nhớ Multi-block, NvM báo BswM_NvM_CurrentJobMode(ServiceId, NVM_REQ_OK) để BswM cho phép Rte_Start() hoặc EcuM_GoDownHaltPoll(). Khi phát hiện treo phần mềm, WdgM gọi BswM_WdgM_RequestPartitionReset().",
    outputs: "Gọi BswM_NvM_CurrentJobMode(), BswM_NvM_CurrentBlockMode() và BswM_WdgM_RequestPartitionReset() vào BswM.",
    apis: [
      "void BswM_NvM_CurrentJobMode(NvM_MultiBlockRequestType MultiBlockRequest, NvM_RequestResultType CurrentJobMode)",
      "void BswM_NvM_CurrentBlockMode(NvM_BlockIdType Block, NvM_RequestResultType CurrentBlockMode)",
      "void BswM_WdgM_RequestPartitionReset(ApplicationType Application)"
    ]
  },
  MOD_DET: {
    id: "MOD_DET",
    name: "DET (Default Error Tracer)",
    layer: "System Services",
    role: "Ghi nhận và cảnh báo mọi lỗi phát triển (Development Error) và lỗi thời gian chạy (Runtime Error) từ BswM (ModuleId = 42 / 0x002A).",
    inputs: "Các lời gọi Det_ReportError(42, 0, ServiceId, ErrorId) và Det_ReportRuntimeError() từ BswM.",
    processing: "Ghi dấu thời gian, ServiceId API gây lỗi và mã lỗi chuẩn BSWM_E_NO_INIT (0x01), BSWM_E_NULL_POINTER (0x02), BSWM_E_REQ_USER_OUT_OF_RANGE (0x04), BSWM_E_REQ_MODE_OUT_OF_RANGE (0x05).",
    outputs: "Hiển thị cảnh báo lỗi ngay trên API Trace & Inspector để kỹ sư truy vết lỗi cấu hình/tích hợp.",
    apis: [
      "Std_ReturnType Det_ReportError(uint16 ModuleId, uint8 InstanceId, uint8 ApiId, uint8 ErrorId)",
      "Std_ReturnType Det_ReportRuntimeError(uint16 ModuleId, uint8 InstanceId, uint8 ApiId, uint8 ErrorId)"
    ]
  }
};

const ABBREVIATIONS_DATA = [
  // ARB: Arbitration & Rules (15)
  { abbr: "BswM", full: "Basic Software Mode Manager", vi: "Bộ quản lý chế độ phần mềm cơ sở", cat: "ARB", desc: "Module thuộc tầng System Services đóng vai trò bộ não chính sách (Policy Engine), phân xử các Mode Request/Indication để điều phối hành động trên toàn BSW & RTE.", sws: "SWS_BswM_00001" },
  { abbr: "Mode Arbitration", full: "Mode Arbitration Engine", vi: "Nhánh phân xử chế độ", cat: "ARB", desc: "Nửa đầu kiến trúc của BswM: thu thập giá trị từ các Mode Request Port, tính biểu thức logic và đánh giá các BswMRule để quyết định TRUE hay FALSE.", sws: "SWS_BswM_00051" },
  { abbr: "Mode Control", full: "Mode Control Engine", vi: "Nhánh thực thi hành động", cat: "ARB", desc: "Nửa sau kiến trúc của BswM: thực thi BswMTrueActionList hoặc BswMFalseActionList dựa trên kết quả Rule và chế độ TRIGGER / CONDITION.", sws: "SWS_BswM_00056" },
  { abbr: "MRP", full: "Mode Request Port (BswMModeRequestPort)", vi: "Cổng nhận yêu cầu / thông báo chế độ", cat: "ARB", desc: "Cổng đầu vào của BswM kết nối tới các nguồn BSW (ComM, CanSM, EcuM, Dcm, NvM) hoặc SWC qua RTE.", sws: "SWS_BswM_00046" },
  { abbr: "Mode Request", full: "Mode Request Source (Active)", vi: "Yêu cầu chuyển chế độ chủ động", cat: "ARB", desc: "Chế độ do một đối tượng (SWC hoặc Generic User) chủ động đề nghị BswM chuyển đổi (ví dụ xin sang chế độ SPORT).", sws: "SWS_BswM_00132" },
  { abbr: "Mode Indication", full: "Mode Indication Source (Passive)", vi: "Thông báo trạng thái hiện tại", cat: "ARB", desc: "Trạng thái thực tế mà một module BSW báo ngược vào BswM sau khi đã chuyển xong (ví dụ ComM báo FULL_COM, CanSM báo BUS_OFF).", sws: "SWS_BswM_00047" },
  { abbr: "BSWM_IMMEDIATE", full: "Immediate Request Processing", vi: "Xử lý tức thời trong hàm gọi", cat: "ARB", desc: "Cấu hình cổng MRP sao cho BswM đánh giá Rule và chạy ActionList ngay lập tức trong ngữ cảnh hàm gọi (Caller Context).", sws: "SWS_BswM_00051" },
  { abbr: "BSWM_DEFERRED", full: "Deferred Request Processing", vi: "Hoãn xử lý tới BswM_MainFunction", cat: "ARB", desc: "Cấu hình cổng MRP chỉ ghi giá trị mới vào hàng đợi và hoãn việc đánh giá Rule cho đến chu kỳ BswM_MainFunction() tiếp theo.", sws: "SWS_BswM_00052" },
  { abbr: "BswMRule", full: "BSW Mode Arbitration Rule", vi: "Luật phân xử chế độ", cat: "ARB", desc: "Đơn vị luật cấu hình gồm 1 biểu thức logic, trạng thái khởi tạo BswMRuleInitState và tham chiếu tới True/False ActionList.", sws: "SWS_BswM_00055" },
  { abbr: "LogicalExpr", full: "BswMLogicalExpression", vi: "Biểu thức logic (AND/OR/XOR/NAND)", cat: "ARB", desc: "Biểu thức đại số Boolean kết hợp nhiều BswMModeCondition hoặc biểu thức con bằng toán tử BSWM_AND, BSWM_OR, BSWM_XOR, BSWM_NAND.", sws: "SWS_BswM_00055" },
  { abbr: "ModeCondition", full: "BswMModeCondition", vi: "Điều kiện so sánh cổng MRP", cat: "ARB", desc: "Phép so sánh giá trị hiện tại của 1 cổng MRP với một hằng số chế độ (EQUALS hoặc NOT_EQUALS).", sws: "SWS_BswM_00055" },
  { abbr: "BSWM_UNDEFINED", full: "Undefined Rule State", vi: "Trạng thái luật chưa xác định ban đầu", cat: "ARB", desc: "Giá trị khởi tạo đặc biệt của BswMRuleInitState: đảm bảo lần đánh giá đầu tiên dù ra TRUE hay FALSE đều được coi là thay đổi trạng thái.", sws: "SWS_BswM_00056" },
  { abbr: "BSWM_TRUE / FALSE", full: "Rule Evaluation Boolean Results", vi: "Kết quả đúng / sai của Rule", cat: "ARB", desc: "Hai kết quả nhị phân của phép đánh giá BswMLogicalExpression quyết định chọn TrueActionList hay FalseActionList.", sws: "SWS_BswM_00055" },
  { abbr: "IndependentEval", full: "Independent Rule Evaluation", vi: "Đánh giá luật độc lập theo cổng đổi", cat: "ARB", desc: "Tối ưu hóa hiệu năng CPU: chỉ đánh giá các Rule có tham chiếu tới cổng MRP vừa thay đổi thay vì quét tất cả Rule.", sws: "SWS_BswM_00051" },
  { abbr: "Re-entrancy Guard", full: "BswM Re-entrancy Protection", vi: "Bảo vệ vùng găng khi gọi lồng nhau", cat: "ARB", desc: "Cơ chế bảo vệ dùng SchM ExclusiveArea: nếu ActionList đang chạy lại gián tiếp gọi vào BswM, yêu cầu mới được hoãn sang hàng đợi Deferred.", sws: "SWS_BswM_00143" },

  // ACT: ActionLists & Actions (13)
  { abbr: "BswMActionList", full: "BSW Mode Control Action List", vi: "Danh sách hành động điều khiển", cat: "ACT", desc: "Tập hợp có thứ tự các hành động (Atomic Action, Nested ActionList hoặc Sub-Rule) được thực thi khi Rule kích hoạt.", sws: "SWS_BswM_00060" },
  { abbr: "BswMActionListItem", full: "Action List Sequence Item", vi: "Phần tử hành động theo thứ tự", cat: "ACT", desc: "Một bước thực thi đánh số thứ tự (ItemIndex) bên trong BswMActionList, mang cờ BswMAbortOnFail.", sws: "SWS_BswM_00065" },
  { abbr: "TrueActionList", full: "BswMTrueActionList", vi: "Danh sách hành động nhánh Đúng", cat: "ACT", desc: "ActionList được chọn thực thi khi kết quả đánh giá BswMRule là BSWM_TRUE.", sws: "SWS_BswM_00056" },
  { abbr: "FalseActionList", full: "BswMFalseActionList", vi: "Danh sách hành động nhánh Sai", cat: "ACT", desc: "ActionList tùy chọn được chọn thực thi khi kết quả đánh giá BswMRule là BSWM_FALSE.", sws: "SWS_BswM_00056" },
  { abbr: "BSWM_TRIGGER", full: "Triggered ActionList Execution", vi: "Chạy theo sườn thay đổi trạng thái", cat: "ACT", desc: "Kiểu thực thi chỉ kích hoạt ActionList một lần duy nhất khi kết quả Rule thay đổi so với chu kỳ trước (Prev != Curr).", sws: "SWS_BswM_00056" },
  { abbr: "BSWM_CONDITION", full: "Conditional ActionList Execution", vi: "Chạy lặp theo mức điều kiện duy trì", cat: "ACT", desc: "Kiểu thực thi chạy lại ActionList trong MỌI lần Rule được đánh giá ra TRUE/FALSE, ngay cả khi kết quả không đổi.", sws: "SWS_BswM_00057" },
  { abbr: "Cascaded ActionList", full: "Nested BswMActionList / Sub-Rule", vi: "Danh sách hành động lồng nhau", cat: "ACT", desc: "Khả năng một ActionList cha gọi sang một ActionList con hoặc kích hoạt đánh giá tiếp một Sub-Rule theo cấu trúc cây.", sws: "SWS_BswM_00060" },
  { abbr: "AbortOnFail", full: "BswMAbortOnFail", vi: "Hủy danh sách hành động khi có lỗi", cat: "ACT", desc: "Nếu đặt TRUE và một ActionItem trả về E_NOT_OK, BswM dừng ngay và hủy toàn bộ các bước còn lại trong ActionList.", sws: "SWS_BswM_00065" },
  { abbr: "BswMTimer", full: "BswM Internal Countdown Timer", vi: "Bộ đếm thời gian nội bộ của BswM", cat: "ACT", desc: "Bộ đếm mềm gắn trực tiếp với một cổng MRP; đếm lùi mỗi BswM_MainFunction() từ lúc STARTED tới EXPIRED.", sws: "SWS_BswM_00205" },
  { abbr: "BswMTimerControl", full: "BswM Timer Control Action", vi: "Hành động bật/tắt BswMTimer", cat: "ACT", desc: "Hành động bên trong ActionList dùng để START hoặc STOP một BswMTimer với thời lượng BswMTimerValue cấu hình sẵn.", sws: "SWS_BswM_00205" },
  { abbr: "BswMUserCallout", full: "BswM User Callout C Function", vi: "Hàm C tùy biến do kỹ sư viết", cat: "ACT", desc: "Hành động gọi trực tiếp một hàm C do người dùng định nghĩa (ví dụ gọi NvM_ReadAll(), NvM_WriteAll() hoặc tắt nguồn phần cứng).", sws: "SWS_BswM_00060" },
  { abbr: "BswM_RequestMode", full: "Generic Mode Request API", vi: "Hàm xin chế độ đa năng cho CDD/BSW", cat: "ACT", desc: "API chuẩn cho phép Complex Device Driver hoặc module ngoài gửi cặp (requesting_user, requested_mode) vào cổng BswMGenericRequest.", sws: "SWS_BswM_00046" },
  { abbr: "ActionListPriority", full: "BswMActionListPriority", vi: "Độ ưu tiên thực thi ActionList", cat: "ACT", desc: "Số nguyên 0..255 quy định thứ tự chạy trước sau khi nhiều ActionList cùng kích hoạt trong một BswM_MainFunction().", sws: "SWS_BswM_00060" },

  // PDU: PDU Group, PduR & DCM (12)
  { abbr: "IPduGroup", full: "COM Interaction Layer PDU Group", vi: "Nhóm gói tin I-PDU trong AUTOSAR COM", cat: "PDU", desc: "Tập hợp các I-PDU (Tx, Rx, PNC, Diag) được bật hoặc tắt đồng loạt bởi BswM thông qua Com_IpduGroupStart() / Stop().", sws: "SWS_BswM_00119" },
  { abbr: "Com_IpduGroupVector", full: "COM I-PDU Group Control Bit Vector", vi: "Vector bit điều khiển nhóm I-PDU", cat: "PDU", desc: "Mảng bit đại diện trạng thái Bật/Tắt của toàn bộ I-PDU Group được BswM cập nhật và đồng bộ xuống COM.", sws: "SWS_BswM_00119" },
  { abbr: "PduGroupSwitch", full: "BswMPduGroupSwitch Action", vi: "Hành động đóng/mở nhóm I-PDU", cat: "PDU", desc: "Action bật hoặc tắt danh sách các I-PDU Group trong COM kèm cờ BswMPduGroupSwitchReinit.", sws: "SWS_BswM_00119" },
  { abbr: "GroupSwitchReinit", full: "BswMPduGroupSwitchReinit", vi: "Cờ khởi tạo lại giá trị COM khi mở nhóm", cat: "PDU", desc: "Tham số boolean (initialize) truyền vào Com_IpduGroupStart(): TRUE để nạp lại init-value cho tín hiệu và reset timer.", sws: "SWS_BswM_00119" },
  { abbr: "Reception DM", full: "Reception Deadline Monitoring", vi: "Giám sát quá hạn nhận bản tin COM", cat: "PDU", desc: "Bộ đếm kiểm tra định kỳ xem gói Rx có tới đúng hạn hay không; BswM bật ở FULL_COM và tắt ở SILENT_COM / BUS_OFF.", sws: "SWS_BswM_00122" },
  { abbr: "DMControl", full: "BswMDeadlineMonitoringControl", vi: "Hành động bật/tắt Deadline Monitoring", cat: "PDU", desc: "Action gọi Com_EnableReceptionDM() hoặc Com_DisableReceptionDM() lên một I-PDU Group cụ thể.", sws: "SWS_BswM_00122" },
  { abbr: "TriggerIPduSend", full: "BswMTriggerIPduSend Action", vi: "Hành động kích phát ngay một Tx I-PDU", cat: "PDU", desc: "Action gọi Com_TriggerIPDUSend(PduId) ép COM truyền lập tức bản tin báo chế độ mới lên bus.", sws: "SWS_BswM_00121" },
  { abbr: "RPG", full: "PduR Routing Path Group", vi: "Nhóm đường định tuyến trong PduR", cat: "PDU", desc: "Tập hợp các đường chuyển tiếp gói tin (Gateway Routing Paths) có thể đóng/mở động trong PduR.", sws: "SWS_BswM_00105" },
  { abbr: "PduRouterControl", full: "BswMPduRouterControl Action", vi: "Hành động bật/tắt định tuyến PduR", cat: "PDU", desc: "Action gọi PduR_EnableRouting(id) hoặc PduR_DisableRouting(id, initialize) để kiểm soát luồng Gateway.", sws: "SWS_BswM_00105" },
  { abbr: "BswMNmControl", full: "BswM Network Management Control", vi: "Hành động khóa/mở truyền thông NM", cat: "PDU", desc: "Action gọi Nm_DisableCommunication() hoặc Nm_EnableCommunication() khi thực thi dịch vụ UDS 0x28.", sws: "SWS_BswM_00104" },
  { abbr: "UDS 0x28", full: "Diagnostic CommunicationControl Service", vi: "Dịch vụ điều khiển truyền thông UDS 0x28", cat: "PDU", desc: "Dịch vụ chẩn đoán cho phép Tester yêu cầu ECU tắt/bật truyền nhận gói Normal và/hoặc NM qua BswM_Dcm_CommunicationMode_CurrentState().", sws: "SWS_BswM_00048" },
  { abbr: "DCM_DISABLE_ALL", full: "DCM_DISABLE_RX_TX_NORM_NM", vi: "Tắt cả truyền/nhận Normal và NM", cat: "PDU", desc: "Chế độ mạnh nhất của UDS 0x28 (sub-function 0x03, type 0x03): giữ nguyên kênh chẩn đoán UDS nhưng tắt toàn bộ ứng dụng và NM.", sws: "SWS_BswM_00048" },

  // LIFE: ECU Lifecycle, RTE & BSW (14)
  { abbr: "EcuM Flexible", full: "Flexible ECU State Manager Architecture", vi: "Kiến trúc EcuM linh hoạt giao quyền BswM", cat: "LIFE", desc: "Kiến trúc AUTOSAR R4.x/R22-11 trong đó EcuM chỉ xử lý phần cứng boot/sleep tối giản và ủy quyền điều phối trạng thái RUN/SHUTDOWN cho BswM.", sws: "SWS_BswM_00050" },
  { abbr: "STARTUP_ONE / TWO", full: "ECUM_STATE_STARTUP_ONE & STARTUP_TWO", vi: "Hai pha khởi động hệ thống ECU", cat: "LIFE", desc: "STARTUP_ONE khởi tạo OS và Driver cơ bản trước khi vào BswM_Init(); STARTUP_TWO khởi chạy SchM/NvM/ComM và đánh thức BswM Rules.", sws: "SWS_BswM_00050" },
  { abbr: "PREP_SHUTDOWN", full: "ECUM_STATE_PREP_SHUTDOWN", vi: "Pha chuẩn bị tắt máy an toàn", cat: "LIFE", desc: "Trạng thái EcuM báo sang BswM để BswM gọi Rte_Stop(), ComM_CommunicationAllowed(FALSE) và kích hoạt NvM_WriteAll().", sws: "SWS_BswM_00050" },
  { abbr: "GO_OFF_ONE", full: "ECUM_STATE_GO_OFF_ONE", vi: "Pha ngắt nguồn / ngủ sâu cuối cùng", cat: "LIFE", desc: "Pha cuối sau khi NvM_WriteAll() thành công: BswM gọi EcuM_GoDownHaltPoll() và BswM_Deinit().", sws: "SWS_BswM_00043" },
  { abbr: "NvM_ReadAll", full: "NvM Multi-Block Read All Startup Job", vi: "Đọc toàn bộ dữ liệu Flash/EEPROM lúc bật máy", cat: "LIFE", desc: "Lệnh đọc đồng loạt các block NvM khi STARTUP_TWO; khi xong NvM gọi BswM_NvM_CurrentJobMode(NVM_REQ_OK) mở khóa Rte_Start().", sws: "SWS_BswM_00109" },
  { abbr: "NvM_WriteAll", full: "NvM Multi-Block Write All Shutdown Job", vi: "Ghi toàn bộ dữ liệu xuống Flash lúc tắt máy", cat: "LIFE", desc: "Lệnh lưu giữ DTC và thông số cấu hình khi PREP_SHUTDOWN; BswM kiên quyết đợi NVM_REQ_OK trước khi sập nguồn ECU.", sws: "SWS_BswM_00109" },
  { abbr: "Rte_Start / Stop", full: "RTE Lifecycle Control Actions", vi: "Khởi động / Dừng tầng Runtime Environment", cat: "LIFE", desc: "Hành động BswMRteStart và BswMRteStop do BswM điều phối để mở/đóng hoạt động của tất cả SWC đúng thời điểm.", sws: "SWS_BswM_00237" },
  { abbr: "Rte_Switch", full: "BswMRteSwitch Action", vi: "Lệnh chuyển Mode từ BswM lên SWC", cat: "LIFE", desc: "Hành động đẩy Mode mới vào cổng ModeDeclarationGroup của RTE để kích hoạt các Runnable OnEntry/OnExit trong SWC.", sws: "SWS_BswM_00106" },
  { abbr: "SchM_Switch", full: "BswMSchMSwitch Action", vi: "Lệnh chuyển Mode lịch trình BSW", cat: "LIFE", desc: "Hành động yêu cầu Basic Software Scheduler (SchM) thay đổi chế độ lập lịch nội bộ các module BSW.", sws: "SWS_BswM_00138" },
  { abbr: "ComMAllowCom", full: "BswMComMAllowCom Action", vi: "Mở/Khóa chốt ComM_CommunicationAllowed", cat: "LIFE", desc: "Hành động BswM gọi ComM_CommunicationAllowed(Channel, TRUE/FALSE) để mở cửa cho phép kênh ComM thức dậy.", sws: "SWS_BswM_00120" },
  { abbr: "PNC", full: "Partial Network Cluster", vi: "Cụm mạng con Partial Networking", cat: "LIFE", desc: "Nhóm chức năng logic trên mạng; ComM báo BswM_ComM_CurrentPNCMode() để BswM chỉ mở I-PDU Group của cụm PNC đó.", sws: "SWS_BswM_00148" },
  { abbr: "CANSM_BUS_OFF", full: "CANSM_BSWM_BUS_OFF State Indication", vi: "Cảnh báo sự cố Bus-Off tức thời từ CanSM", cat: "LIFE", desc: "Trạng thái lỗi phần cứng CAN khiến CanSM báo ngay vào BswM (IMMEDIATE) để cắt Tx I-PDU Group & Reception DM.", sws: "SWS_BswM_00049" },
  { abbr: "WdgM_PartReset", full: "BswM_WdgM_RequestPartitionReset", vi: "Yêu cầu khởi động lại phân vùng từ Watchdog", cat: "LIFE", desc: "Callback từ WdgM báo lỗi giám sát thực thi để BswM chạy ActionList cô lập lỗi và khởi động lại phân vùng an toàn.", sws: "SWS_BswM_00156" },
  { abbr: "DET (Mod 42)", full: "Default Error Tracer (BSWM_MODULE_ID = 42)", vi: "Module ghi nhận lỗi chuẩn AUTOSAR", cat: "LIFE", desc: "Nhận các mã lỗi BSWM_E_NO_INIT (0x01), BSWM_E_NULL_POINTER (0x02), BSWM_E_REQ_USER_OUT_OF_RANGE (0x04), BSWM_E_REQ_MODE_OUT_OF_RANGE (0x05).", sws: "SWS_BswM_00029" }
];
