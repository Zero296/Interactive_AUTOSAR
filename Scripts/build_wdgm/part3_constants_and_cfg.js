// ================= PART 3: CONSTANTS, BITFIELDS, CONFIG TOOLTIPS, MODULE METADATA & GLOSSARY =================

const WDGM_LOCAL_BITS = [
  { bit: 7, mask: 0x80, tag: "SE_ACTV",    name: "SE_ACTV_MOD",     tone: "",     desc: "SE có cấu hình giám sát được bật trong WdgMMode hiện tại (SLOW_MODE hoặc FAST_MODE) — SWS_WdgM_00209." },
  { bit: 6, mask: 0x40, tag: "ALIVE_OK",   name: "ALIVE_RES_OK",    tone: "",     desc: "Kết quả Alive Supervision tại kỳ tham chiếu SRC: (EAI - MinMargin) <= AC <= (EAI + MaxMargin) — SWS_WdgM_00074." },
  { bit: 5, mask: 0x20, tag: "DEADLN_OK",  name: "DEADLN_RES_OK",   tone: "",     desc: "Kết quả Deadline Supervision: Tmin <= (t_stop - t_start) <= Tmax và không quá hạn Timeout — SWS_WdgM_00229." },
  { bit: 4, mask: 0x10, tag: "LOGIC_OK",   name: "LOGICAL_RES_OK",  tone: "",     desc: "Kết quả Logical Supervision: Đúng Initial CP, cạnh Transition hợp lệ và Final CP — SWS_WdgM_00252." },
  { bit: 3, mask: 0x08, tag: "GRAPH_ACT",  name: "GRAPH_ACTV",      tone: "warn", desc: "ActivityFlag = TRUE: Thực thể đã vào Initial Checkpoint và đang thực thi bên trong đồ thị Logical — SWS_WdgM_00273." },
  { bit: 2, mask: 0x04, tag: "LOC_DEACT",  name: "LOC_DEACTIVATED", tone: "warn", desc: "Bit 2 của WdgM_LocalStatusType (0x04): SE đang bị tắt giám sát trong Mode hiện tại hoặc chưa Init." },
  { bit: 1, mask: 0x02, tag: "LOC_EXP",    name: "LOC_EXPIRED",     tone: "err",  desc: "Bit 1 của WdgM_LocalStatusType (0x02): SE đã chết (vượt Alive Tol hoặc sai Deadline/Logical). Không tự phục hồi!" },
  { bit: 0, mask: 0x01, tag: "LOC_FAIL",   name: "LOC_FAILED",      tone: "warn", desc: "Bit 0 của WdgM_LocalStatusType (0x01): Cảnh báo tạm thời khi lỗi Alive còn trong FailedAliveRefCycleTol." }
];

const WDGM_GLOBAL_BITS = [
  { bit: 7, mask: 0x80, tag: "WDGM_INIT",  name: "WDGM_INITIALIZED", tone: "",     desc: "WdgM_Init(&WdgM_Config) đã khởi tạo thành công. Nếu = 0, mọi API báo lỗi DET WDGM_E_UNINIT (0x10)." },
  { bit: 6, mask: 0x40, tag: "WDGIF_TRIG", name: "WDGIF_TRIG_ACTV",  tone: "",     desc: "WdgM đang nuôi phần cứng qua WdgIf_SetTriggerCondition(DevIdx, Timeout > 0). Khi STOPPED, hạ = 0 (Timeout = 0)." },
  { bit: 5, mask: 0x20, tag: "FIRST_EXP",  name: "FIRST_EXP_LATCH",  tone: "err",  desc: "Đã chốt ID thực thể đầu tiên gây EXPIRED vào WdgM_FirstExpiredSEID (kèm đảo bit ~SEID chống nhiễu RAM — SWS_WdgM_00215)." },
  { bit: 4, mask: 0x10, tag: "PART_RST",   name: "PART_RESET_REQ",   tone: "warn", desc: "Đã phát lệnh BswM_WdgM_RequestPartitionReset(OsApp) để khởi động lại phân vùng OS bị lỗi — SWS_WdgM_00233." },
  { bit: 3, mask: 0x08, tag: "MCU_RST",    name: "MCU_IMM_RESET",    tone: "err",  desc: "Đã kích hoạt Mcu_PerformReset() ngay lập tức khi STOPPED (WdgMImmediateReset=TRUE) hoặc gọi WdgM_PerformReset()." },
  { bit: 2, mask: 0x04, tag: "GLB_DEACT",  name: "GLB_DEACTIVATED",  tone: "warn", desc: "Bit 2 của WdgM_GlobalStatusType (0x04 = DEACTIVATED): WdgM chưa Init hoặc đã gọi WdgM_DeInit()." },
  { bit: 1, mask: 0x02, tag: "GLB_EXP",    name: "GLB_EXPIRED",      tone: "err",  desc: "Bit 1 của WdgM_GlobalStatusType (0x02 = EXPIRED; kết hợp Bit0=1 thành 0x03 = STOPPED)." },
  { bit: 0, mask: 0x01, tag: "GLB_FAIL",   name: "GLB_FAILED",       tone: "warn", desc: "Bit 0 của WdgM_GlobalStatusType (0x01 = FAILED; kết hợp Bit1=1 thành 0x03 = STOPPED)." }
];

const configTooltipData = {
  WdgMInitialized: {
    title: "WdgM Module Initialization State",
    ecucPath: "WdgMRuntime / WdgM_Init() State",
    sws: "SWS_WdgM_00135 · SWS_WdgM_00151",
    range: "boolean (TRUE = Init | FALSE = Uninit)",
    role: "Trạng thái đã khởi tạo của module WdgM bởi EcuM/BswM.",
    mechanism: "Nếu FALSE, mọi lời gọi WdgM_CheckpointReached(), WdgM_MainFunction(), WdgM_SetMode() đều bị từ chối và báo Det_ReportError(13, 0, ServiceId, WDGM_E_UNINIT=0x10).",
    scenarioImpact: "Thử bỏ chọn ở kịch bản S12 để quan sát DET bẫy lỗi WDGM_E_UNINIT."
  },
  WdgMDevErrorDetect: {
    title: "WdgMDevErrorDetect",
    ecucPath: "WdgMGeneral / WdgMDevErrorDetect",
    sws: "SWS_WdgM_00301 · ECUC_WdgM_00301",
    range: "boolean (true | false)",
    role: "Bật/tắt phát hiện lỗi phát triển (Development Error) và báo sang DET.",
    mechanism: "Khi true, WdgM kiểm tra UNINIT, PARAM_SEID, CPID, SEDEACTIVATED, INV_POINTER, DISABLE_NOT_ALLOWED và gọi Det_ReportError(ModuleId = 13).",
    scenarioImpact: "Tắt cờ này sẽ bỏ qua việc ghi log vào khối DET trong kịch bản S12."
  },
  WdgMVersionInfoApi: {
    title: "WdgMVersionInfoApi",
    ecucPath: "WdgMGeneral / WdgMVersionInfoApi",
    sws: "SWS_WdgM_00110 · ECUC_WdgM_00303",
    range: "boolean (true | false)",
    role: "Bật/tắt biên dịch hàm WdgM_GetVersionInfo(Std_VersionInfoType *VersionInfo).",
    mechanism: "Ánh xạ thành macro #define WDGM_VERSION_INFO_API STD_ON/OFF khi xuất file WdgM_Cfg.h.",
    scenarioImpact: "Thay đổi trực tiếp nội dung header WdgM_Cfg.h trong hộp thoại Export."
  },
  WdgMDefensiveBehavior: {
    title: "WdgMDefensiveBehavior (WdgMOffModeEnabled = FALSE)",
    ecucPath: "WdgMGeneral / WdgMDefensiveBehavior",
    sws: "SWS_WdgM_00031 · ECUC_WdgM_00305",
    range: "boolean (true = Phòng vệ ASIL | false = Cho phép OFF)",
    role: "Chế độ phòng vệ an toàn cấm tuyệt đối phần mềm tắt Watchdog sang WDGIF_OFF_MODE hoặc gọi WdgM_DeInit().",
    mechanism: "Nếu true và có lệnh gọi WdgM_SetMode(OFF_MODE), WdgM trả về E_NOT_OK và báo DET WDGM_E_DISABLE_NOT_ALLOWED (0x15).",
    scenarioImpact: "Trọng tâm kiểm thử trong kịch bản S10 và S11."
  },
  ActiveWdgMMode: {
    title: "Active WdgMMode (WdgM_SetMode)",
    ecucPath: "WdgMConfigSet / WdgMMode (SLOW=0, FAST=1, OFF=2)",
    sws: "SWS_WdgM_00154 · ECUC_WdgM_00329",
    range: "SLOW_MODE (0) | FAST_MODE (1) | OFF_MODE (2)",
    role: "Chế độ vận hành hiện tại quy định danh sách SE nào được bật giám sát và cửa sổ Trigger WdgIf.",
    mechanism: "SLOW_MODE (50ms) bật cả SE_0, SE_1, SE_2; FAST_MODE (20ms) bật SE_0, SE_1 và tắt SE_2 sang DEACTIVATED; OFF_MODE chuyển WdgIf sang OFF (nếu DefensiveBehavior=FALSE).",
    scenarioImpact: "Thay đổi trong S10 để xem SE_2 chuyển giữa OK và DEACTIVATED."
  },
  WdgMSupervisionCycle: {
    title: "WdgMSupervisionCycle",
    ecucPath: "WdgMConfigSet / WdgMMode / WdgMSupervisionCycle",
    sws: "SWS_WdgM_00159 · ECUC_WdgM_00313",
    range: "1 .. 100 ms (Mặc định: 10 ms)",
    role: "Chu kỳ SchM/OS gọi hàm WdgM_MainFunction().",
    mechanism: "Mỗi lần WdgM_MainFunction() chạy, bộ đếm SC (SupervisionCycleCounter) tăng thêm 1, đánh giá Alive/Timeout, cập nhật Local/Global Status và nạp WdgIf_SetTriggerCondition().",
    scenarioImpact: "Quyết định bước nhảy thời gian khi bấm '+10ms MainFn' hoặc Auto Clock."
  },
  SE0_AliveEnabled: {
    title: "SE_0 Alive Supervision Enable",
    ecucPath: "WdgMMode / WdgMAliveSupervision (SE_0: SWC_BrakeCtrl)",
    sws: "SWS_WdgM_00074 · ECUC_WdgM_00318",
    range: "boolean (true | false)",
    role: "Bật/tắt giám sát tần suất xung sống (Alive Supervision) tại CP_0_Init của SE_0.",
    mechanism: "Khi true, mỗi lần gọi WdgM_CheckpointReached(0, CP_0) sẽ tăng AliveCounter (AC) lên 1.",
    scenarioImpact: "Cơ sở cho các kịch bản Alive S1, S2, S3."
  },
  WdgMExpectedAliveIndications: {
    title: "WdgMExpectedAliveIndications (EAI)",
    ecucPath: "WdgMAliveSupervision / WdgMExpectedAliveIndications",
    sws: "SWS_WdgM_00074 · ECUC_WdgM_00319",
    range: "uint16 (0 .. 255, mặc định: 2)",
    role: "Số lần gọi Checkpoint Alive kỳ vọng nhận được từ SE_0 trong 1 chu kỳ tham chiếu SRC.",
    mechanism: "Tại thời điểm SC == SRC, WdgM kiểm tra: (EAI - MinMargin) <= AC <= (EAI + MaxMargin).",
    scenarioImpact: "Thay đổi để kiểm thử thiếu xung (AC < EAI - Min) hoặc dư xung (AC > EAI + Max) ở S2, S3."
  },
  WdgMSupervisionReferenceCycle: {
    title: "WdgMSupervisionReferenceCycle (SRC)",
    ecucPath: "WdgMAliveSupervision / WdgMSupervisionReferenceCycle",
    sws: "SWS_WdgM_00098 · ECUC_WdgM_00320",
    range: "uint16 (1 .. 100 chu kỳ MainFunction, mặc định: 2)",
    role: "Số chu kỳ WdgM_MainFunction() gom thành 1 kỳ tham chiếu để đánh giá công thức Alive của SE_0.",
    mechanism: "Với Cycle=10ms và SRC=2, WdgM đánh giá Alive cho SE_0 mỗi 20ms, sau đó reset AC=0 và SC=0.",
    scenarioImpact: "Minh họa ở S1 (SC = 1/2 chạy tiếp, SC = 2/2 mới đánh giá Alive)."
  },
  WdgMMinMargin: {
    title: "WdgMMinMargin",
    ecucPath: "WdgMAliveSupervision / WdgMMinMargin",
    sws: "SWS_WdgM_00074 · ECUC_WdgM_00321",
    range: "uint8 (0 .. 50, mặc định: 1)",
    role: "Biên độ sai số thiếu xung cho phép bên dưới EAI (bù sai lệch jitter đồng hồ OS).",
    mechanism: "Số xung tối thiểu hợp lệ là max(0, EAI - MinMargin). Nếu AC nhỏ hơn ngưỡng này -> Alive = INCORRECT.",
    scenarioImpact: "Thay đổi What-If ở S2 để mở rộng ngưỡng chịu đựng thiếu xung."
  },
  WdgMMaxMargin: {
    title: "WdgMMaxMargin",
    ecucPath: "WdgMAliveSupervision / WdgMMaxMargin",
    sws: "SWS_WdgM_00074 · ECUC_WdgM_00322",
    range: "uint8 (0 .. 50, mặc định: 1)",
    role: "Biên độ sai số dư xung cho phép bên trên EAI để tránh bắt nhầm khi task chạy dồn.",
    mechanism: "Nếu AC > (EAI + MaxMargin), WdgM kết luận Babbling/Runaway Task -> Alive = INCORRECT.",
    scenarioImpact: "Thử nghiệm ở kịch bản S3 với lỗi Babbling Task (AC = 5)."
  },
  SE1_AliveEnabled: {
    title: "SE_1 Alive Supervision Enable",
    ecucPath: "WdgMMode / WdgMAliveSupervision (SE_1: SWC_EngineTrq)",
    sws: "SWS_WdgM_00074",
    range: "boolean (true | false)",
    role: "Bật/tắt giám sát Alive cho thực thể thứ 2 (SWC_EngineTrq).",
    mechanism: "Minh họa việc WdgM giám sát đồng thời nhiều SWC độc lập với tần số khác nhau.",
    scenarioImpact: "Tắt để tập trung quan sát SE_0 hoặc bật để kiểm thử lỗi chéo nhiều SE ở S3/S7."
  },
  SE1_ExpectedAlive: {
    title: "SE_1 Expected Alive Indications (SRC=1)",
    ecucPath: "WdgMAliveSupervision(SE_1) / WdgMExpectedAliveIndications",
    sws: "SWS_WdgM_00074",
    range: "0 .. 20 (mặc định: 1 mỗi 10ms)",
    role: "Số xung kỳ vọng của SE_1 trong mỗi chu kỳ SRC = 1 (Margin = 0/0).",
    mechanism: "Nếu bật SE1_AliveEnabled, SE_1 phải đạt chính xác SE1_ExpectedAlive xung mỗi 10ms.",
    scenarioImpact: "Dùng để tạo lỗi đa thực thể trong What-If của S3."
  },
  SE0_DeadlineEnabled: {
    title: "SE_0 Deadline Supervision Enable",
    ecucPath: "WdgMMode / WdgMDeadlineSupervision (SE_0)",
    sws: "SWS_WdgM_00229 · SWS_WdgM_00230",
    range: "boolean (true | false)",
    role: "Bật/tắt đo thời gian thực thi Δt giữa cặp Checkpoint Start và Stop của SE_0.",
    mechanism: "Sử dụng dấu thời gian từ OsCounter (GetCounterValue) ngay bên trong WdgM_CheckpointReached().",
    scenarioImpact: "Cơ sở của các kịch bản S4 và S5."
  },
  WdgMDeadlineStartRef: {
    title: "WdgMDeadlineStartRef",
    ecucPath: "WdgMDeadlineSupervision / WdgMDeadlineStartRef",
    sws: "SWS_WdgM_00228 · ECUC_WdgM_00323",
    range: "CP_0 (Init) | CP_1 (Run)",
    role: "Checkpoint đánh dấu thời điểm bấm giờ bắt đầu đo Deadline (t_start).",
    mechanism: "Khi WdgM_CheckpointReached(0, StartRef) chạy, WdgM lưu t_start = clockMs và đánh dấu deadlinePending = TRUE.",
    scenarioImpact: "Mặc định CP_0 (Init) trong S4 và S5."
  },
  WdgMDeadlineStopRef: {
    title: "WdgMDeadlineStopRef",
    ecucPath: "WdgMDeadlineSupervision / WdgMDeadlineStopRef",
    sws: "SWS_WdgM_00229 · ECUC_WdgM_00324",
    range: "CP_1 (Run) | CP_2 (Exit)",
    role: "Checkpoint kết thúc đo thời gian thực thi (t_stop).",
    mechanism: "Ngay khi đi qua StopRef, WdgM tính Δt = t_stop - t_start và kiểm tra Tmin <= Δt <= Tmax. Nếu sai -> nhảy thẳng EXPIRED!",
    scenarioImpact: "Mặc định CP_1 (Run) trong S4 và S5."
  },
  WdgMDeadlineMin: {
    title: "WdgMDeadlineMin (Tmin)",
    ecucPath: "WdgMDeadlineSupervision / WdgMDeadlineMin",
    sws: "SWS_WdgM_00229 · ECUC_WdgM_00311",
    range: "0 .. 1000 ms (Mặc định: 2 ms)",
    role: "Thời gian chạy tối thiểu hợp lệ từ Start CP đến Stop CP.",
    mechanism: "Nếu Δt < Tmin, chứng tỏ hàm bị lỗi bỏ qua vòng lặp/tính toán an toàn -> Deadline = INCORRECT (nhảy thẳng EXPIRED).",
    scenarioImpact: "Kiểm thử nhánh chạy quá sớm ở kịch bản S5."
  },
  WdgMDeadlineMax: {
    title: "WdgMDeadlineMax (Tmax)",
    ecucPath: "WdgMDeadlineSupervision / WdgMDeadlineMax",
    sws: "SWS_WdgM_00229 · ECUC_WdgM_00312",
    range: "1 .. 5000 ms (Mặc định: 8 ms)",
    role: "Thời hạn tối đa cho phép để thực thể hoàn thành đoạn code từ Start CP đến Stop CP.",
    mechanism: "Nếu Δt > Tmax khi qua Stop CP, hoặc quá Tmax mà vẫn treo chưa qua Stop CP -> Deadline = INCORRECT -> EXPIRED.",
    scenarioImpact: "Kiểm thử biên trên (Δt=8ms) ở S4 và trễ hạn/timeout ở S5."
  },
  WdgMEnableDeadlineTimeoutDetection: {
    title: "WdgMEnableDeadlineTimeoutDetection",
    ecucPath: "WdgMGeneral / WdgMEnableDeadlineTimeoutDetection",
    sws: "SWS_WdgM_00374 (R20-11+)",
    range: "boolean (true | false)",
    role: "Cho phép WdgM_MainFunction() chủ động phát hiện Task bị treo sau Start CP mà không bao giờ tới được Stop CP.",
    mechanism: "Nếu FALSE, một Task treo vĩnh viễn sau CP_0 sẽ không bị Deadline bắt cho tới khi tới CP_1; nếu TRUE, WdgM_MainFunction kiểm tra (t_now - t_start) > Tmax để bắt lỗi ngay!",
    scenarioImpact: "Thử bật/tắt trong What-If của S5 để thấy sự khác biệt sống còn."
  },
  SE0_InternalGraphEnabled: {
    title: "SE_0 Internal Logical Graph Enable",
    ecucPath: "WdgMMode / WdgMInternalCheckpointSupervision",
    sws: "SWS_WdgM_00252 · SWS_WdgM_00273",
    range: "boolean (true | false)",
    role: "Bật/tắt giám sát thứ tự đi qua các Checkpoint bên trong thực thể SE_0.",
    mechanism: "Đảm bảo luồng thực thi tuân thủ Initial CP -> Valid Transitions -> Final CP.",
    scenarioImpact: "Trung tâm của kịch bản S6."
  },
  WdgMInitialCheckpoint: {
    title: "WdgMInitialCheckpoint",
    ecucPath: "WdgMInternalGraph / WdgMInitialCheckpoint",
    sws: "SWS_WdgM_00273 · ECUC_WdgM_00342",
    range: "CP_0 (Init) | CP_1 (Run)",
    role: "Checkpoint duy nhất được phép gọi khi đồ thị đang đóng (ActivityFlag == FALSE).",
    mechanism: "Nếu gọi CP khác khi ActivityFlag == FALSE -> Logical = INCORRECT -> EXPIRED ngay!",
    scenarioImpact: "Thử bấm thẳng CP_1 khi Graph đang Idle ở S6."
  },
  WdgMFinalCheckpoint: {
    title: "WdgMFinalCheckpoint",
    ecucPath: "WdgMInternalGraph / WdgMFinalCheckpoint",
    sws: "SWS_WdgM_00331 · ECUC_WdgM_00343",
    range: "CP_2 (Exit) | CP_1 (Run)",
    role: "Checkpoint kết thúc hợp lệ một chu trình đồ thị và hạ ActivityFlag về FALSE.",
    mechanism: "Khi chạm Final CP từ một cạnh hợp lệ, đồ thị khép lại thành công.",
    scenarioImpact: "Mặc định CP_2 (Exit) trong S1 và S6."
  },
  ValidInternalTransitions: {
    title: "ValidInternalTransitions",
    ecucPath: "WdgMInternalGraph / WdgMInternalTransition",
    sws: "SWS_WdgM_00252 · ECUC_WdgM_00344",
    range: "Danh sách cạnh dạng CP0->CP1, CP1->CP2",
    role: "Bảng các cung chuyển tiếp hợp lệ bên trong đồ thị nội bộ của SE_0.",
    mechanism: "Nếu gọi CP_next mà cặp (LastCP -> CP_next) không nằm trong danh sách này -> lỗi Logical ngay lập tức.",
    scenarioImpact: "Thử thêm 'CP0->CP2' vào ô này ở S6 để cho phép nhánh nhảy tắt."
  },
  ExternalGraphEnabled: {
    title: "WdgMExternalGraph Enable",
    ecucPath: "WdgMMode / WdgMExternalLogicalSupervision",
    sws: "SWS_WdgM_00271 · SWS_WdgM_00252",
    range: "boolean (true | false)",
    role: "Bật/tắt đồ thị giám sát thứ tự luồng điều khiển xuyên qua nhiều SWC (SE_0 -> SE_1).",
    mechanism: "Theo dõi trạng thái liên kết giữa các thực thể khác nhau (VD: SWC_Brake phải xong SE0_CP1 trước khi SWC_EngineTrq chạy SE1_CP0).",
    scenarioImpact: "Trọng tâm của kịch bản S7."
  },
  ValidExternalTransitions: {
    title: "ValidExternalTransitions",
    ecucPath: "WdgMExternalLogicalSupervision / WdgMExternalTransition",
    sws: "SWS_WdgM_00271",
    range: "Danh sách cạnh dạng SE0_CP1->SE1_CP0, SE1_CP0->SE1_CP1",
    role: "Danh sách cạnh chuyển tiếp hợp lệ giữa các Checkpoint thuộc nhiều SE khác nhau.",
    mechanism: "Kiểm tra mỗi bước gọi Checkpoint trong chuỗi External Graph có khớp cạnh quy định hay không.",
    scenarioImpact: "Dùng trong S7 để kiểm chứng lỗi vi phạm thứ tự giữa SE_0 và SE_1."
  },
  WdgMFailedAliveSupervisionRefCycleTol: {
    title: "WdgMFailedAliveSupervisionRefCycleTol (SE_0)",
    ecucPath: "WdgMLocalStatusParams / WdgMFailedAliveSupervisionRefCycleTol",
    sws: "SWS_WdgM_00202 · ECUC_WdgM_00326",
    range: "uint8 (0 .. 255, mặc định: 1)",
    role: "Số chu kỳ tham chiếu lỗi Alive tối đa mà SE_0 được giữ ở trạng thái đệm FAILED trước khi rơi sang EXPIRED.",
    mechanism: "CHỈ áp dụng cho Alive Supervision! Deadline và Logical luôn có dung sai bằng 0 (sai 1 lần -> EXPIRED ngay).",
    scenarioImpact: "Quyết định khả năng tự phục hồi ở S2 và ngưỡng kẹt EXPIRED ở S3."
  },
  SE1_FailedAliveTol: {
    title: "WdgMFailedAliveSupervisionRefCycleTol (SE_1)",
    ecucPath: "WdgMLocalStatusParams(SE_1) / WdgMFailedAliveSupervisionRefCycleTol",
    sws: "SWS_WdgM_00202 · ECUC_WdgM_00326",
    range: "uint8 (0 .. 255, mặc định: 0)",
    role: "Dung sai số chu kỳ lỗi Alive cho phép của thực thể thứ 2 (SE_1).",
    mechanism: "Đặt bằng 0 nghĩa là SE_1 (ví dụ Engine Torque) nhạy cảm hơn: thiếu/dư xung 1 lần là vào EXPIRED ngay.",
    scenarioImpact: "Dùng khi kiểm thử lỗi trên SE_1."
  },
  WdgMExpiredSupervisionCycleTol: {
    title: "WdgMExpiredSupervisionCycleTol (Global Tol)",
    ecucPath: "WdgMMode / WdgMExpiredSupervisionCycleTol",
    sws: "SWS_WdgM_00215 · ECUC_WdgM_00328",
    range: "uint16 (0 .. 255 chu kỳ MainFunction, mặc định: 2)",
    role: "Số chu kỳ ân hạn ở trạng thái GLOBAL_STATUS_EXPIRED trước khi rơi sang STOPPED và cắt xung Watchdog.",
    mechanism: "Trong các chu kỳ ân hạn này, WdgM vẫn gọi WdgIf_SetTriggerCondition(>0) để hệ thống kịp ghi DEM/NvM rồi mới ngừng nuôi Watchdog.",
    scenarioImpact: "Trọng tâm của kịch bản S8 (đặt = 0 sẽ nhảy thẳng vào STOPPED)."
  },
  WdgMImmediateReset: {
    title: "WdgMImmediateReset",
    ecucPath: "WdgMGeneral / WdgMImmediateReset",
    sws: "SWS_WdgM_00134 · ECUC_WdgM_00304",
    range: "boolean (true | false)",
    role: "Cho phép WdgM gọi thẳng Mcu_PerformReset() ngay tại thời điểm Global Status chuyển sang STOPPED.",
    mechanism: "Nếu FALSE, WdgM chỉ gọi WdgIf_SetTriggerCondition(0) và đợi phần cứng Watchdog đếm hết timeout mới Reset MCU; nếu TRUE, Reset phần mềm xảy ra tức thì.",
    scenarioImpact: "Đối chiếu trực tiếp trong kịch bản S9."
  },
  WdgMPartitionResetEnabled: {
    title: "WdgMPartitionResetEnabled (OsApplicationRef)",
    ecucPath: "WdgMSupervisedEntity / WdgMOsApplicationRef",
    sws: "SWS_WdgM_00233 · ECUC_WdgM_00341",
    range: "boolean (true | false)",
    role: "Khi SE thuộc một OS-Application bị EXPIRED, WdgM gọi BswM_WdgM_RequestPartitionReset() để khởi động lại riêng phân vùng đó.",
    mechanism: "Giúp cô lập lỗi phần mềm (ví dụ reset phân vùng OsApp_Brake đưa SE_0 về OK) mà không làm sập toàn bộ ECU.",
    scenarioImpact: "Trung tâm của kịch bản S9 (Nhánh A)."
  },
  WdgMDemEventParameterRefs: {
    title: "WdgMDemEventParameterRefs (WDGM_E_*)",
    ecucPath: "WdgMConfigSet / WdgMDemEventParameterRefs",
    sws: "SWS_WdgM_00375 · SWS_WdgM_00142",
    range: "boolean (true | false)",
    role: "Bật/tắt báo cáo Production Error sang DEM (WDGM_E_MONITORING khi STOPPED và WDGM_E_SET_MODE khi WdgIf_SetMode lỗi).",
    mechanism: "Gọi Dem_SetEventStatus(EventId, DEM_EVENT_STATUS_FAILED) để lưu lịch sử lỗi trước khi reset.",
    scenarioImpact: "Quan sát trong S8 và S10."
  },
  WdgMTriggerMode_IntWdg: {
    title: "WdgMTriggerMode (Internal MCU Watchdog)",
    ecucPath: "WdgMMode / WdgMTrigger_0 / WdgMTriggerMode",
    sws: "SWS_WdgM_00135 · ECUC_WdgM_00333",
    range: "WDGIF_FAST_MODE | WDGIF_SLOW_MODE | WDGIF_OFF_MODE",
    role: "Chế độ phần cứng nạp xuống Driver Internal MCU Watchdog (DeviceIndex = 0).",
    mechanism: "Thay đổi đồng bộ khi gọi WdgM_SetMode() hoặc tùy chỉnh trực tiếp để kiểm thử.",
    scenarioImpact: "Liên kết với S10."
  },
  WdgMTriggerConditionValue_Int: {
    title: "WdgMTriggerConditionValue (Internal Wdg)",
    ecucPath: "WdgMMode / WdgMTrigger_0 / WdgMTriggerConditionValue",
    sws: "SWS_WdgM_00223 · ECUC_WdgM_00334",
    range: "1 .. 5000 ms (Mặc định: 20 ms ở FAST, 50 ms ở SLOW)",
    role: "Giá trị Timeout (ms) được WdgM nạp vào WdgIf_SetTriggerCondition(0, Timeout) mỗi chu kỳ MainFunction.",
    mechanism: "Phải lớn hơn WdgMSupervisionCycle (VD 20ms > 10ms) để phần cứng không bị quá hạn giữa 2 chu kỳ MainFunction.",
    scenarioImpact: "Thay đổi giá trị Timeout trong S1 và quan sát thanh đếm ngược Watchdog."
  },
  ExternalWindowWdgEnabled: {
    title: "External SBC Window Watchdog Enable",
    ecucPath: "WdgMGeneral / WdgMWatchdog_1 (DeviceIndex = 1)",
    sws: "SWS_WdgM_00223 · SWS_WdgIf",
    range: "boolean (true | false)",
    role: "Bật/tắt điều khiển song song bộ Window Watchdog ngoài trên chip nguồn SBC/PMIC qua SPI.",
    mechanism: "Khi true, mỗi chu kỳ WdgM gọi WdgIf_SetTriggerCondition() cho cả Device 0 (MCU) và Device 1 (SBC Window).",
    scenarioImpact: "Minh họa kiến trúc đa Watchdog trong S1 và S10."
  },
  WdgMTriggerConditionValue_Ext: {
    title: "WdgMTriggerConditionValue (External SBC Wdg)",
    ecucPath: "WdgMMode / WdgMTrigger_1 / WdgMTriggerConditionValue",
    sws: "SWS_WdgM_00223 · ECUC_WdgM_00334",
    range: "1 .. 5000 ms (Mặc định: 20 ms)",
    role: "Timeout nạp cho bộ Watchdog ngoài qua WdgIf_SetTriggerCondition(1, Timeout).",
    mechanism: "Phối hợp với ClosedWindowMs để tạo vùng cửa sổ mở hợp lệ [ClosedWindow .. Timeout].",
    scenarioImpact: "Hiển thị trực tiếp trên thanh Window Watchdog ở Panel 2."
  },
  WindowWdgClosedWindowMs: {
    title: "Window Watchdog Closed Window Duration",
    ecucPath: "Wdg_Ext / WdgClosedWindowDuration",
    sws: "Hardware Window Watchdog Specification",
    range: "0 .. 100 ms (Mặc định: 5 ms)",
    role: "Khoảng thời gian cấm kích xung sớm đầu chu kỳ của Window Watchdog (từ 0 ms đến ClosedWindowMs).",
    mechanism: "Nếu phần mềm bị lỗi chạy quá nhanh kích xung trong Closed Window -> SBC kéo chân NRES Reset ngay! Chỉ được kích khi đã vào Open Window.",
    scenarioImpact: "Hiển thị vùng gạch chéo đỏ (Closed) vs vùng xanh lá (Open) trên Panel 2."
  },
  SimulateWdgIfSetModeFail: {
    title: "Simulate WdgIf_SetMode() Failure (E_NOT_OK)",
    ecucPath: "Simulation Fault Injection / WdgIf_SetMode Return",
    sws: "SWS_WdgM_00142 · SWS_WdgM_00139",
    range: "boolean (true | false)",
    role: "Giả lập sự cố giao tiếp phần cứng (VD đứt dây SPI tới SBC) làm hàm WdgIf_SetMode() trả về E_NOT_OK.",
    mechanism: "Theo SWS_WdgM_00142, nếu WdgIf_SetMode() thất bại, WdgM lập tức chuyển Global Status sang STOPPED và báo DEM WDGM_E_SET_MODE = FAILED.",
    scenarioImpact: "Kiểm thử trực tiếp trong kịch bản S10."
  }
};

const MODULES_INFO = {
  MOD_SWC: {
    title: "SWC_BrakeCtrl (SE_0) & SWC_EngineTrq (SE_1)",
    layer: "Application Layer (AUTOSAR SWCs)",
    inputs: "Runnable TimingEvent (10ms) từ RTE; ModeSwitch Notification (Rte_Switch_localMode / globalMode) từ WdgM để đi vào Safe State khi phát hiện lỗi.",
    processing: "Chèn các lời gọi Checkpoint vào đầu/giữa/cuối Runnable: CP_0 (báo Alive + bấm giờ Deadline Start + mở Logical Initial), CP_1 (chốt Deadline Stop + bước Logical Run), CP_2 (đóng Logical Final).",
    outputs: "Gọi qua RTE xuống WdgM: WdgM_CheckpointReached(SEID, CPID), WdgM_GetLocalStatus(), WdgM_PerformReset().",
    sws: "SWS_WdgM_00263 · SWS_WdgM_00197"
  },
  MOD_BSW: {
    title: "BSW_CanDiag (SE_2 — Supervised BSW / CDD)",
    layer: "BSW / Complex Device Driver Layer",
    inputs: "Xung kích hoạt định kỳ từ SchM trong pha khởi động (SLOW_MODE).",
    processing: "Minh họa module BSW được giám sát trực tiếp qua C API (không qua RTE). Được cấu hình bật trong SLOW_MODE (#0) và tự động tắt sang WDGM_LOCAL_STATUS_DEACTIVATED (0x04) khi chuyển sang FAST_MODE (#1).",
    outputs: "Gọi trực tiếp WdgM_CheckpointReached(2, CP_ID). Nếu gọi khi đang DEACTIVATED -> bị bẫy lỗi DET WDGM_E_SEDEACTIVATED (0x1F).",
    sws: "SWS_WdgM_00206 · SWS_WdgM_00319"
  },
  MOD_RTE: {
    title: "RTE & SchM (Runtime Environment & BSW Scheduler)",
    layer: "RTE Layer",
    inputs: "Lời gọi Rte_Call_CheckpointReached từ SWC; Thay đổi trạng thái Local/Global từ WdgM; Chu kỳ 10ms từ OS.",
    processing: "RTE ánh xạ Port của từng SWC thành tham số SEID và định tuyến vào WdgM_CheckpointReached(). SchM gọi định kỳ WdgM_MainFunction() mỗi WdgMSupervisionCycle và bảo vệ vùng găng (ExclusiveArea) giữa ISR/Task và MainFunction.",
    outputs: "WdgM_MainFunction() [SWS_WdgM_00159], Rte_Switch_globalMode_currentMode(), Rte_Switch_localMode_currentMode().",
    sws: "SWS_WdgM_00159 · SWS_WdgM_00198"
  },
  MOD_OS: {
    title: "AUTOSAR OS & OsCounter (Hardware Timer & Partition)",
    layer: "System Services (OS)",
    inputs: "Nhịp Hardware Timer 1ms (GPT / System Tick); Lệnh khởi động lại OS-Application từ BswM khi Partition Reset.",
    processing: "1) Cung cấp dấu thời gian (Timestamp) độ phân giải cao cho thuật toán Deadline Supervision. 2) Thực hiện cô lập và khởi động lại phân vùng OS-Application bị lỗi (RestartApplication) mà không làm reset các phân vùng khác.",
    outputs: "Trả về giá trị Tick cho WdgM qua GetCounterValue(OsCounter, &Val) / GetElapsedValue().",
    sws: "SWS_WdgM_00373 · SWS_WdgM_00233"
  },
  MOD_WDGM: {
    title: "WdgM Core Engine (Watchdog Manager)",
    layer: "System / Functional Safety Services",
    inputs: "WdgM_CheckpointReached(SEID, CPID), WdgM_MainFunction(), WdgM_SetMode(Mode), dấu thời gian từ OsCounter.",
    processing: "1) Tại CheckpointReached: Tăng AliveCounter, đo Δt Deadline tức thời, kiểm tra cạnh đồ thị Logical (Internal & External). 2) Tại MainFunction: Đánh giá Alive theo chu kỳ SRC, kiểm tra Deadline Timeout, chuyển Local Status (OK/FAILED/EXPIRED/DEACTIVATED), chốt WdgM_FirstExpiredSEID, tổng hợp Global Status (OK/FAILED/EXPIRED/STOPPED), và gọi WdgIf_SetTriggerCondition().",
    outputs: "WdgIf_SetTriggerCondition(), WdgIf_SetMode(), BswM_WdgM_RequestPartitionReset(), Mcu_PerformReset(), Dem_SetEventStatus(), Det_ReportError().",
    sws: "SWS_WdgM_00074 · SWS_WdgM_00201 · SWS_WdgM_00214"
  },
  MOD_BSWM: {
    title: "BswM, EcuM & Mcu (Mode, ECU State & MCU Reset)",
    layer: "System Services & MCAL",
    inputs: "Yêu cầu Partition Reset (BswM_WdgM_RequestPartitionReset) hoặc Immediate MCU Reset (Mcu_PerformReset) từ WdgM.",
    processing: "1) EcuM/BswM gọi WdgM_Init() ở SLOW_MODE lúc Startup, chuyển sang FAST_MODE khi RUN và OFF_MODE/DeInit khi Sleep (nếu không bật DefensiveBehavior). 2) BswM kích hoạt OS Partition Reset khi có SE hết hạn. 3) Mcu thực hiện Reset tức thời nếu WdgMImmediateReset=TRUE.",
    outputs: "WdgM_Init(), WdgM_SetMode(), WdgM_DeInit(), WdgM_GetFirstExpiredSEID().",
    sws: "SWS_WdgM_00151 · SWS_WdgM_00154 · SWS_WdgM_00134"
  },
  MOD_DEM: {
    title: "DEM (Diagnostic Event Manager)",
    layer: "Diagnostic Services",
    inputs: "Báo cáo Production Error từ WdgM khi Global Status vào STOPPED hoặc WdgIf_SetMode trả về E_NOT_OK.",
    processing: "Ghi nhận 2 mã lỗi chuẩn AUTOSAR WdgM vào Event Memory (kèm FreezeFrame lưu xuống NvM trong thời gian ân hạn WdgMExpiredSupervisionCycleTol trước khi ECU bị reset).",
    outputs: "Dem_SetEventStatus(WDGM_E_MONITORING / WDGM_E_SET_MODE, DEM_EVENT_STATUS_FAILED).",
    sws: "SWS_WdgM_00375 · SWS_WdgM_00142"
  },
  MOD_DET: {
    title: "DET (Default Error Tracer — ModuleId 13)",
    layer: "System Services",
    inputs: "Lỗi tham số/trạng thái từ WdgM qua Det_ReportError(13, 0, ServiceId, ErrorId).",
    processing: "Ghi nhận 8 mã lỗi chuẩn R23-11: WDGM_E_UNINIT (0x10), PARAM_CONFIG (0x11), PARAM_MODE (0x12), PARAM_SEID (0x13), INV_POINTER (0x14), DISABLE_NOT_ALLOWED (0x15), CPID (0x16), SEDEACTIVATED (0x1F).",
    outputs: "Cảnh báo trực tiếp trên API Trace và SVG Node DET.",
    sws: "SWS_WdgM_00004"
  },
  MOD_WDGIF: {
    title: "WdgIf (Watchdog Interface)",
    layer: "ECU Abstraction Layer",
    inputs: "WdgIf_SetMode(DeviceIndex, WdgMode) và WdgIf_SetTriggerCondition(DeviceIndex, Timeout) từ WdgM.",
    processing: "Trừu tượng hóa đa thiết bị Watchdog qua chỉ số DeviceIndex: Index 0 định tuyến tới Internal MCU Watchdog Driver; Index 1 định tuyến tới External SBC Window Watchdog Driver.",
    outputs: "Wdg_Int_SetMode / Wdg_Int_SetTriggerCondition; Wdg_Ext_SetMode / Wdg_Ext_SetTriggerCondition.",
    sws: "SWS_WdgIf_00042 · SWS_WdgM_00223"
  },
  MOD_WDG_INT: {
    title: "Wdg_Int (Internal MCU Watchdog Driver)",
    layer: "MCAL (Microcontroller Abstraction Layer)",
    inputs: "Wdg_SetMode(OFF/SLOW/FAST) và Wdg_SetTriggerCondition(Timeout_ms) từ WdgIf (Device 0).",
    processing: "Nạp thanh ghi bộ đếm phần cứng nội bộ của MCU theo giá trị Timeout mới (VD 20ms). Nếu WdgM vào STOPPED và truyền Timeout = 0 (hoặc ngừng gọi), bộ đếm phần cứng về 0ms -> kích hoạt Reset MCU!",
    outputs: "Ghi thanh ghi WDG_SR nội bộ; phát tín hiệu Reset nội bộ khi Timeout = 0.",
    sws: "SWS_Wdg_00155"
  },
  MOD_WDG_EXT: {
    title: "Wdg_Ext (External SBC Window Watchdog Driver)",
    layer: "External / Complex Device Driver (SPI PMIC/SBC)",
    inputs: "Wdg_SetMode() và Wdg_SetTriggerCondition(Timeout_ms) từ WdgIf (Device 1).",
    processing: "Điều khiển chip nguồn ngoài SBC qua SPI theo cơ chế Window Watchdog: Chia chu kỳ thành Closed Window (cấm kích sớm 0..5ms) và Open Window (phải kích hợp lệ 5..20ms). Nếu lỡ kích trong Closed Window hoặc trễ quá Open Window -> kéo chân NRES Reset cứng ECU!",
    outputs: "Khung truyền SPI tới IC SBC; chân phần cứng NRES Reset.",
    sws: "SWS_Wdg_00155 · Window WDG Spec"
  }
};

const ABBREVIATIONS = [
  { abbr: "WdgM", full: "Watchdog Manager", cat: "CORE", desc: "Module BSW tầng System Services giám sát tiến trình SWC/BSW theo 3 thuật toán trước khi cho phép nuôi Watchdog phần cứng." },
  { abbr: "SE / SEID", full: "Supervised Entity / Supervised Entity Identifier", cat: "CORE", desc: "Thực thể được giám sát (1 SWC, 1 Runnable hoặc 1 module BSW), có ID duy nhất, tập các Checkpoint và trạng thái Local Status riêng." },
  { abbr: "CP / CPID", full: "Checkpoint / Checkpoint Identifier", cat: "CORE", desc: "Điểm mốc đặt trong mã nguồn của SE; khi đi qua gọi WdgM_CheckpointReached(SEID, CPID)." },
  { abbr: "WdgM_CheckpointReached", full: "Watchdog Manager Checkpoint Reached API", cat: "CORE", desc: "API trung tâm chuẩn AUTOSAR 4.x/R23-11 (ServiceId 0x0E) thay thế WdgM_UpdateAliveCounter cũ để phục vụ đồng thời Alive, Deadline và Logical." },
  { abbr: "WdgM_MainFunction", full: "Watchdog Manager Main Cyclic Function", cat: "CORE", desc: "Hàm xử lý định kỳ do SchM gọi mỗi WdgMSupervisionCycle (VD 10ms) để đánh giá Alive, Deadline Timeout, Local/Global Status và nuôi WdgIf." },
  { abbr: "WdgM_LocalStatusType", full: "Local Supervision Status Enumeration", cat: "CORE", desc: "Trạng thái cục bộ từng SE: OK (0x00), FAILED (0x01), EXPIRED (0x02), DEACTIVATED (0x04)." },
  { abbr: "LOCAL_STATUS_OK", full: "WDGM_LOCAL_STATUS_OK (0x00)", cat: "CORE", desc: "Thực thể đang được giám sát và mọi thuật toán Alive, Deadline, Logical đều đạt chuẩn." },
  { abbr: "LOCAL_STATUS_FAILED", full: "WDGM_LOCAL_STATUS_FAILED (0x01)", cat: "CORE", desc: "Trạng thái cảnh báo tạm thời CHỈ dành cho lỗi Alive khi FailedAliveCnt <= Tolerance; có thể tự phục hồi về OK." },
  { abbr: "LOCAL_STATUS_EXPIRED", full: "WDGM_LOCAL_STATUS_EXPIRED (0x02)", cat: "CORE", desc: "Trạng thái chết không thể tự phục hồi (do vượt Alive Tol hoặc sai 1 lần Deadline/Logical). Chỉ thoát bằng Partition/MCU Reset." },
  { abbr: "LOCAL_STATUS_DEACTIVATED", full: "WDGM_LOCAL_STATUS_DEACTIVATED (0x04)", cat: "CORE", desc: "Thực thể bị tắt giám sát trong WdgMMode hiện tại hoặc WdgM chưa Init." },
  { abbr: "WdgM_GlobalStatusType", full: "Global Supervision Status Enumeration", cat: "CORE", desc: "Trạng thái toàn ECU tổng hợp từ mọi SE: OK (0x00), FAILED (0x01), EXPIRED (0x02), STOPPED (0x03), DEACTIVATED (0x04)." },
  { abbr: "GLOBAL_STATUS_EXPIRED", full: "WDGM_GLOBAL_STATUS_EXPIRED (0x02)", cat: "CORE", desc: "Có ít nhất 1 SE đã EXPIRED nhưng vẫn đang trong chu kỳ ân hạn ExpiredSupervisionCycleTol (vẫn nuôi WdgIf để kịp ghi lỗi NvM)." },
  { abbr: "GLOBAL_STATUS_STOPPED", full: "WDGM_GLOBAL_STATUS_STOPPED (0x03)", cat: "CORE", desc: "Hết chu kỳ ân hạn hoặc gọi WdgM_PerformReset(): WdgM cắt xung WdgIf_SetTriggerCondition(0), báo DEM và có thể gọi Mcu_PerformReset()." },
  { abbr: "WdgMMode", full: "Watchdog Manager Operational Mode", cat: "CORE", desc: "Cấu hình chế độ (SLOW_MODE, FAST_MODE, OFF_MODE) quy định SE nào bật/tắt và tham số Trigger xuống WdgIf." },

  { abbr: "Alive Supervision", full: "Frequency / Liveness Supervision", cat: "ALGO", desc: "Kiểm tra số lần chạy định kỳ của SE trong 1 chu kỳ tham chiếu SRC có nằm trong khoảng [EAI - MinMargin, EAI + MaxMargin] hay không." },
  { abbr: "AC", full: "Alive Counter (Internal Indication Counter)", cat: "ALGO", desc: "Bộ đếm nội bộ số lần Checkpoint Alive của một SE đã được gọi trong chu kỳ tham chiếu hiện tại." },
  { abbr: "SC", full: "Supervision Cycle Counter", cat: "ALGO", desc: "Bộ đếm số lần WdgM_MainFunction() đã chạy kể từ lần kiểm tra Alive gần nhất của SE." },
  { abbr: "EAI", full: "WdgMExpectedAliveIndications", cat: "ALGO", desc: "Số xung Alive kỳ vọng nhận được trong 1 chu kỳ tham chiếu SRC." },
  { abbr: "SRC", full: "WdgMSupervisionReferenceCycle", cat: "ALGO", desc: "Số chu kỳ WdgM_MainFunction() gom lại làm một kỳ kiểm tra Alive cho SE." },
  { abbr: "MinMargin / MaxMargin", full: "WdgMMinMargin / WdgMMaxMargin", cat: "ALGO", desc: "Biên độ sai số thiếu xung (-MinMargin) và dư xung (+MaxMargin) cho phép xung quanh EAI." },
  { abbr: "Babbling Task", full: "Runaway / Over-triggering Task Fault", cat: "ALGO", desc: "Lỗi phần mềm kẹt vòng lặp hoặc ngắt kích hoạt liên tục làm AC > EAI + MaxMargin; bị Alive Supervision bắt lỗi." },
  { abbr: "FailedAliveTol", full: "WdgMFailedAliveSupervisionRefCycleTol", cat: "ALGO", desc: "Số chu kỳ tham chiếu lỗi Alive tối đa mà SE được phép giữ ở LOCAL_STATUS_FAILED trước khi sang EXPIRED." },
  { abbr: "Deadline Supervision", full: "Execution Duration Supervision (Δt)", cat: "ALGO", desc: "Đo thời gian thực thi giữa CP_Start và CP_Stop bằng OsCounter, kiểm tra T_min <= Δt <= T_max. Sai 1 lần nhảy thẳng EXPIRED." },
  { abbr: "CP_Start / CP_Stop", full: "WdgMDeadlineStartRef / WdgMDeadlineStopRef", cat: "ALGO", desc: "Cặp Checkpoint đánh dấu thời điểm bấm giờ bắt đầu (t_start) và kết thúc (t_stop) trong Deadline Supervision." },
  { abbr: "Tmin / Tmax", full: "WdgMDeadlineMin / WdgMDeadlineMax", cat: "ALGO", desc: "Ngưỡng thời gian ngắn nhất và dài nhất hợp lệ của đoạn code; bắt cả lỗi chạy thiếu nhánh lẫn lỗi trễ hạn." },
  { abbr: "Deadline Timeout Det", full: "WdgMEnableDeadlineTimeoutDetection", cat: "ALGO", desc: "Cơ chế cho phép WdgM_MainFunction() chủ động phát hiện Task treo vĩnh viễn sau CP_Start khi (t_now - t_start) > Tmax." },
  { abbr: "Logical Supervision", full: "Program Flow / Control-Flow Graph Supervision", cat: "ALGO", desc: "Kiểm tra thứ tự thực thi câu lệnh theo đồ thị định hướng Checkpoint (Initial CP -> Valid Transitions -> Final CP). Sai 1 lần -> EXPIRED." },
  { abbr: "Internal / External Graph", full: "WdgMInternalGraph / WdgMExternalGraph", cat: "ALGO", desc: "Internal Graph kiểm tra luồng trong 1 SE; External Graph kiểm tra luồng chuyển tiếp xuyên qua nhiều SE/SWC khác nhau." },
  { abbr: "ActivityFlag", full: "Logical Graph Activity Flag", cat: "ALGO", desc: "Cờ nội bộ bật TRUE khi SE đi qua Initial Checkpoint và hạ FALSE khi hoàn tất tại Final Checkpoint." },

  { abbr: "WdgIf", full: "Watchdog Interface (ECU Abstraction)", cat: "HW", desc: "Lớp trừu tượng hóa giúp 1 WdgM điều khiển đồng thời nhiều bộ Watchdog vật lý (Internal MCU + External SBC) qua DeviceIndex." },
  { abbr: "Wdg", full: "Watchdog Driver (MCAL / Ext Driver)", cat: "HW", desc: "Trình điều khiển tầng thấp thao tác trực tiếp thanh ghi Watchdog MCU hoặc giao tiếp SPI với IC nguồn ngoài." },
  { abbr: "TriggerCondition", full: "WdgIf_SetTriggerCondition(DevIdx, Timeout)", cat: "HW", desc: "API truyền giá trị Timeout sống còn lại (ms) xuống Driver Wdg. Khi vào STOPPED, truyền Timeout = 0 để dừng nuôi và kích Reset." },
  { abbr: "WDGIF_OFF_MODE", full: "Watchdog Off Mode", cat: "HW", desc: "Tắt bộ đếm Watchdog phần cứng (chỉ dùng khi Sleep nếu WdgMDefensiveBehavior = FALSE)." },
  { abbr: "WDGIF_SLOW_MODE", full: "Watchdog Slow Mode", cat: "HW", desc: "Chế độ cửa sổ rộng (VD 50ms) thường dùng khi Startup hoặc Shutdown khi các tác vụ chạy chậm." },
  { abbr: "WDGIF_FAST_MODE", full: "Watchdog Fast Mode", cat: "HW", desc: "Chế độ cửa sổ hẹp (VD 20ms) dùng trong vận hành bình thường (RUN) để phát hiện lỗi nhanh nhất." },
  { abbr: "Window Watchdog", full: "Closed + Open Window Watchdog", cat: "HW", desc: "Loại Watchdog ngoài (thường trên SBC) bắt buộc xung nuôi phải nằm đúng trong Open Window; kích quá sớm trong Closed Window cũng gây Reset!" },
  { abbr: "Closed Window", full: "Window Watchdog Closed Period", cat: "HW", desc: "Khoảng thời gian đầu chu kỳ cấm kích xung Watchdog (bắt lỗi xung lặp nhanh / CPU clock chạy sai tần số)." },
  { abbr: "SBC / PMIC", full: "System Basis Chip / Power Management IC", cat: "HW", desc: "IC quản lý nguồn ngoài MCU tích hợp bộ Window Watchdog độc lập và chân kéo Reset cứng NRES." },
  { abbr: "NRES", full: "Negative Reset Pin (Hardware Reset Line)", cat: "HW", desc: "Chân tín hiệu phần cứng do SBC/PMIC kéo xuống mức thấp để Reset toàn bộ vi điều khiển khi Watchdog hết hạn." },

  { abbr: "FirstExpiredSEID", full: "WdgM_FirstExpiredSEID (First Expired Latch)", cat: "SAFETY", desc: "Biến RAM đặc biệt lưu ID thực thể đầu tiên rơi vào EXPIRED (kèm bản sao đảo bit ~SEID) để truy vết nguyên nhân sau Reset." },
  { abbr: "Double-Inverted RAM", full: "Redundant Bitwise-Inverted RAM Storage", cat: "SAFETY", desc: "Kỹ thuật lưu song song Value và ~Value trong vùng NO_INIT_RAM để WdgM_GetFirstExpiredSEID() kiểm tra tính toàn vẹn sau khi MCU Reset." },
  { abbr: "ExpiredCycleTol", full: "WdgMExpiredSupervisionCycleTol", cat: "SAFETY", desc: "Số chu kỳ WdgM_MainFunction() giữ ở GLOBAL_STATUS_EXPIRED làm thời gian ân hạn trước khi rơi xuống STOPPED." },
  { abbr: "WdgMImmediateReset", full: "Immediate MCU Software Reset Switch", cat: "SAFETY", desc: "Nếu TRUE, WdgM gọi thẳng Mcu_PerformReset() ngay khi vào STOPPED thay vì chờ phần cứng Watchdog đếm hết timeout." },
  { abbr: "Partition Reset", full: "OS-Application Partition Restart", cat: "SAFETY", desc: "Khôi phục cục bộ riêng phân vùng OS bị lỗi qua BswM_WdgM_RequestPartitionReset() mà không làm sập cả ECU." },
  { abbr: "WdgMDefensiveBehavior", full: "Defensive Anti-Disable Protection", cat: "SAFETY", desc: "Cơ chế khóa an toàn ASIL cấm mọi lệnh chuyển Watchdog sang OFF_MODE hoặc DeInit trong lúc vận hành." },
  { abbr: "WDGM_E_MONITORING", full: "DEM Extended Production Error (Supervision)", cat: "SAFETY", desc: "Sự kiện chẩn đoán báo sang DEM (FAILED) ngay khi Global Supervision Status rơi vào STOPPED." },
  { abbr: "WDGM_E_SET_MODE", full: "DEM Extended Production Error (SetMode)", cat: "SAFETY", desc: "Sự kiện chẩn đoán báo sang DEM (FAILED) khi WdgIf_SetMode() trả về E_NOT_OK (lỗi phần cứng/SPI Watchdog)." },
  { abbr: "WDGM_E_SEDEACTIVATED", full: "DET Error Code 0x1F (SE Deactivated)", cat: "SAFETY", desc: "Lỗi DET bắn ra khi SWC/BSW gọi WdgM_CheckpointReached() cho thực thể đang ở trạng thái DEACTIVATED trong Mode hiện tại." },
  { abbr: "OsCounter", full: "AUTOSAR OS Hardware Timer Counter", cat: "SAFETY", desc: "Bộ đếm thời gian hệ điều hành được WdgM gọi qua GetCounterValue() để tính Δt của Deadline Supervision." },
  { abbr: "RTE / SchM", full: "Runtime Environment & BSW Scheduler", cat: "SAFETY", desc: "RTE dẫn lời gọi Checkpoint từ SWC xuống WdgM; SchM định kỳ gọi WdgM_MainFunction() và quản lý ExclusiveArea." },
  { abbr: "ISO 26262 / ASIL", full: "Automotive Functional Safety Standard", cat: "SAFETY", desc: "Tiêu chuẩn an toàn chức năng ô tô (ASIL-A..D) yêu cầu tách biệt cơ chế giám sát thời gian & luồng thực thi qua WdgM + External Watchdog." },
  { abbr: "BswM / Mcu", full: "BSW Mode Manager & MCU Driver", cat: "SAFETY", desc: "BswM điều phối WdgM_SetMode() và Partition Reset; Mcu thực thi Mcu_PerformReset() và lưu nguyên nhân Reset." }
];
