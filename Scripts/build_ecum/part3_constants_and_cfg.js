// ================= PART 3: CONSTANTS, BITFIELDS, CONFIG TOOLTIPS, MODULE METADATA & GLOSSARY =================

const ECUM_PHASE_BITS = [
  { bit: 7, mask: 0x80, tag: "ECUM_INIT",   name: "ECUM_INIT_DONE",   tone: "",     desc: "EcuM_Init() đã khởi chạy hoàn tất (DriverInitZero, DeterminePbConfiguration, DriverInitOne). Nếu = 0 (ECUM_UNINIT), mọi API gọi vào bắn DET ECUM_E_UNINIT (0x10)." },
  { bit: 6, mask: 0x40, tag: "OS_STARTED",  name: "OS_STARTED",       tone: "",     desc: "EcuM đã gọi StartOS(EcuMDefaultAppMode) bàn giao CPU cho AUTOSAR OS. Hạ về 0 khi gọi ShutdownOS(E_OK) để vào ShutdownHook." },
  { bit: 5, mask: 0x20, tag: "BSWM_HANDVR", name: "BSWM_HANDOVER",    tone: "",     desc: "EcuM_StartupTwo() đã gọi SchM_Init() và BswM_Init(PbCfg), bàn giao điều phối chế độ cho BswM (EcuM Flexible). Hạ về 0 khi chạy BswM_Deinit()." },
  { bit: 4, mask: 0x10, tag: "RUN_REQ",     name: "RUN_REQ_HELD",     tone: "",     desc: "Có ít nhất 1 EcuMUser giữ EcuM_RequestRUN(User) hoặc bộ đếm EcuMRunMinimumDuration > 0, giữ ECU tại ECUM_STATE_APP_RUN." },
  { bit: 3, mask: 0x08, tag: "POSTRUN",     name: "POSTRUN_ACT",      tone: "warn", desc: "ECU đang ở ECUM_STATE_APP_POST_RUN: mọi RUN Request đã nhả nhưng còn User giữ EcuM_RequestPOST_RUN(User) chờ hậu kỳ trước khi tắt." },
  { bit: 2, mask: 0x04, tag: "GO_DOWN",     name: "GO_DOWN_ACT",      tone: "warn", desc: "Đã gọi EcuM_GoDownHaltPoll(UserID) để kích hoạt trình tự đi xuống SLEEP (GoHalt/GoPoll), RESET hoặc OFF theo ShutdownTarget." },
  { bit: 1, mask: 0x02, tag: "HALT_SLP",    name: "HALT_SLEEP_ACT",   tone: "pur",  desc: "Đang ngủ sâu trong EcuM_GoHalt(): đã tính EcuM_GenerateRamHash(), khóa ngắt và gọi Mcu_SetMode(MCU_HALT_MODE)." },
  { bit: 0, mask: 0x01, tag: "RAM_OK",      name: "RAM_HASH_VALID",   tone: "",     desc: "Chữ ký kiểm tra toàn vẹn RAM (EcuM_GenerateRamHash / EcuM_CheckRamHash) hợp lệ (0xA55A). Hạ về 0 nếu RAM hỏng trong lúc ngủ Halt!" }
];

const ECUM_WKUP_BITS = [
  { bit: 7, mask: 0x80, tag: "WK_PEND",     name: "WKUP_PENDING",     tone: "warn", desc: "PendingWakeupEvents != 0: ít nhất 1 nguồn có ValidationTimeout > 0 vừa kích hoạt EcuM_SetWakeupEvent() và đang chờ xác thực." },
  { bit: 6, mask: 0x40, tag: "VAL_TMR",     name: "WK_VAL_TMR_RUN",   tone: "warn", desc: "Đang chạy giao thức Wakeup Validation: đã gọi EcuM_StartWakeupSources() và bộ đếm EcuMValidationTimeout đang đếm lùi." },
  { bit: 5, mask: 0x20, tag: "WK_VALID",    name: "WKUP_VALIDATED",   tone: "",     desc: "ValidatedWakeupEvents != 0: nguồn đánh thức đã được xác nhận hợp lệ (tức thì nếu Timeout=0 hoặc qua EcuM_ValidateWakeupEvent)." },
  { bit: 4, mask: 0x10, tag: "WK_EXPIRE",   name: "WKUP_EXPIRED",     tone: "err",  desc: "ExpiredWakeupEvents != 0: hết EcuMValidationTimeout mà không nhận được frame hợp lệ (nhiễu Glitch) -> gọi EcuM_StopWakeupSources()." },
  { bit: 3, mask: 0x08, tag: "POLL_SLP",    name: "POLL_SLEEP_ACT",   tone: "pur",  desc: "Đang chạy chế độ ngủ thăm dò EcuM_GoPoll(): gọi định kỳ EcuM_SleepActivity() và EcuM_CheckWakeup() để kiểm tra nguồn không có ngắt." },
  { bit: 2, mask: 0x04, tag: "ALARM_CLK",   name: "ALARM_CLK_RUN",    tone: "warn", desc: "EcuM Alarm Clock (EcuMMasterAlarm) đang đếm lùi để tự động đánh thức ECU khỏi giấc ngủ khi chạm mốc hẹn giờ." },
  { bit: 1, mask: 0x02, tag: "CORE_SYNC",   name: "SLAVE_CORE_SYNC",  tone: "",     desc: "Hệ thống Multi-Core: Slave Core 1 đã đồng bộ cùng Master Core 0 (hoặc Single-Core mặc định 1). Bằng 0 nếu Core 1 chưa sẵn sàng Halt/Off!" },
  { bit: 0, mask: 0x01, tag: "SYS_FAULT",   name: "CFG_OR_RAM_ERR",   tone: "err",  desc: "Cảnh báo lỗi nghiêm trọng: PB Config Hash Mismatch, EcuM_CheckRamHash() == 0, LoopDetection, hoặc DET Error." }
];

const WAKEUP_SOURCES = [
  { bit: 0, mask: 0x01, id: "POWER",          shortLbl: "POWER",   fullName: "ECUM_WKSOURCE_POWER",          std: true,  commCh: null, pncId: null, desc: "Nguồn chuẩn AUTOSAR (Bit 0): Bật nguồn ắc-quy lạnh (Power-On Reset). ValidationTimeout = 0 ms." },
  { bit: 1, mask: 0x02, id: "RESET",          shortLbl: "RESET",   fullName: "ECUM_WKSOURCE_RESET",          std: true,  commCh: null, pncId: null, desc: "Nguồn chuẩn AUTOSAR (Bit 1): Tín hiệu chân phần cứng External Reset. ValidationTimeout = 0 ms." },
  { bit: 2, mask: 0x04, id: "INTERNAL_RESET", shortLbl: "INT_RST", fullName: "ECUM_WKSOURCE_INTERNAL_RESET", std: true,  commCh: null, pncId: null, desc: "Nguồn chuẩn AUTOSAR (Bit 2): Reset nội bộ từ phần mềm (Mcu_PerformReset / UDS 0x11). Timeout = 0 ms." },
  { bit: 3, mask: 0x08, id: "INTERNAL_WDG",   shortLbl: "INT_WDG", fullName: "ECUM_WKSOURCE_INTERNAL_WDG",   std: true,  commCh: null, pncId: null, desc: "Nguồn chuẩn AUTOSAR (Bit 3): Reset do Watchdog nội bộ hoặc Alarm Clock GPT. Timeout = 0 ms." },
  { bit: 4, mask: 0x10, id: "EXTERNAL_WDG",   shortLbl: "EXT_WDG", fullName: "ECUM_WKSOURCE_EXTERNAL_WDG",   std: true,  commCh: null, pncId: null, desc: "Nguồn chuẩn AUTOSAR (Bit 4): Reset từ SBC / Watchdog ngoài. ValidationTimeout = 0 ms." },
  { bit: 5, mask: 0x20, id: "CAN_CH0_RX",     shortLbl: "CAN0_RX", fullName: "ECUM_WKSOURCE_CAN_CH0_RX",     std: false, commCh: 0,    pncId: 16,   desc: "Nguồn ngoại vi (Bit 5): Đánh thức qua CanTrcv/CanIf kênh CAN0. Cần ValidationTimeout (500ms) để lọc nhiễu!" },
  { bit: 6, mask: 0x40, id: "LIN_CH1_RX",     shortLbl: "LIN1_RX", fullName: "ECUM_WKSOURCE_LIN_CH1_RX",     std: false, commCh: 1,    pncId: null, desc: "Nguồn ngoại vi (Bit 6): Đánh thức qua LinTrcv/LinIf kênh LIN1. Cần ValidationTimeout (300ms) hoặc GoPoll." },
  { bit: 7, mask: 0x80, id: "KL15_IGNITION",  shortLbl: "KL15_IG", fullName: "ECUM_WKSOURCE_KL15_IGNITION",  std: false, commCh: null, pncId: null, desc: "Nguồn ngoại vi (Bit 7): Chân công tắc khóa điện IG (KL15) qua Icu/Dio. Mặc định 0 ms (có thể cấu hình debounce)." }
];

const configTooltipData = {
  EcuMInitialized: {
    title: "EcuM Module Initialization State",
    ecucPath: "EcuMRuntime / EcuMInitialized",
    sws: "SWS_EcuM_02411 · SWS_EcuM_02811",
    range: "boolean (true = INIT | false = ECUM_UNINIT)",
    role: "Xác định module EcuM đã thực thi EcuM_Init() hay chưa.",
    mechanism: "Nếu đặt false (ECUM_UNINIT) khi bật EcuMDevErrorDetect, mọi API gọi vào EcuM (SelectShutdownTarget, RequestRUN, SetWakeupEvent...) sẽ trả E_NOT_OK và gọi Det_ReportError(ECUM_MODULE_ID=10, ECUM_E_UNINIT=0x10).",
    scenarioImpact: "Bỏ chọn ở kịch bản S14 hoặc bất kỳ lúc nào để kiểm tra bẫy lỗi DET ECUM_E_UNINIT."
  },
  EcuMArchitectureVariant: {
    title: "EcuM Architecture Variant (Flexible vs Fixed)",
    ecucPath: "EcuMGeneral / EcuMArchitectureVariant",
    sws: "SWS_EcuM_04004 · AUTOSAR R20-11/R23-11",
    range: "ECUM_FLEXIBLE_WITH_BSWM | ECUM_FIXED_CLASSIC",
    role: "Lựa chọn kiến trúc điều phối chế độ ECU giữa EcuM Flexible (chuẩn mới phối hợp BswM) và EcuM Fixed (cổ điển).",
    mechanism: "Trong EcuM Flexible, EcuM_StartupTwo() gọi BswM_Init() để BswM quản lý Mode, đồng thời vẫn hỗ trợ cổng RUN/POST_RUN Request tùy chọn cho SWC. Trong EcuM Fixed, bản thân EcuM quản lý cứng pha RUN, POST_RUN và PREP_SHUTDOWN.",
    scenarioImpact: "Ảnh hưởng tới thông điệp bàn giao BswM trong S1 và luồng chuyển trạng thái ở S2."
  },
  EcuMDevErrorDetect: {
    title: "EcuMDevErrorDetect",
    ecucPath: "EcuMGeneral / EcuMDevErrorDetect",
    sws: "SWS_EcuM_02802 · ECUC_EcuM_00108",
    range: "boolean (true | false)",
    role: "Bật/tắt cơ chế phát hiện và báo cáo Development Errors qua Det_ReportError(ModuleId=10).",
    mechanism: "Kiểm tra tham số đầu vào (NULL_PTR, UNKNOWN_WAKEUP_SOURCE, INVALID_PAR, STATE_PAR_OUT_OF_RANGE) và trạng thái UNINIT.",
    scenarioImpact: "Tắt cờ này sẽ bỏ qua báo cáo DET trong kịch bản S14."
  },
  EcuMVersionInfoApi: {
    title: "EcuMVersionInfoApi",
    ecucPath: "EcuMGeneral / EcuMVersionInfoApi",
    sws: "SWS_EcuM_02813 · ECUC_EcuM_00112",
    range: "boolean (true | false)",
    role: "Bật/tắt hàm EcuM_GetVersionInfo(Std_VersionInfoType* versioninfo).",
    mechanism: "Quy định macro #define ECUM_VERSION_INFO_API STD_ON/OFF khi xuất file EcuM_Cfg.h.",
    scenarioImpact: "Cập nhật trực tiếp mã C trong modal Export EcuM_Cfg.h."
  },
  EcuMMainFunctionPeriod: {
    title: "EcuMMainFunctionPeriod",
    ecucPath: "EcuMGeneral / EcuMMainFunctionPeriod",
    sws: "SWS_EcuM_02839 · ECUC_EcuM_00121",
    range: "float/ms (1 .. 100 ms, điển hình 10 ms)",
    role: "Chu kỳ OS/SchM gọi định kỳ hàm EcuM_MainFunction().",
    mechanism: "Mỗi tick MainFunction sẽ giảm các bộ đếm EcuMValidationTimeout, EcuMRunMinimumDuration, EcuMMasterAlarm, xử lý Wakeup Validation và kiểm tra chuyển trạng thái.",
    scenarioImpact: "Quyết định bước nhảy thời gian khi bấm '+10ms Tick' hoặc chạy Auto Clock."
  },
  EcuMLoopDetectionEnabled: {
    title: "EcuMLoopDetectionEnabled",
    ecucPath: "EcuMGeneral / EcuMLoopDetectionEnabled",
    sws: "SWS_EcuM_02927 · ECUC_EcuM_00167",
    range: "boolean (true | false)",
    role: "Bật/tắt hàm callout EcuM_LoopDetection() trong pha StartPreOS.",
    mechanism: "Cho phép integrator đếm số lần Reset liên tiếp không mong muốn (ví dụ do kẹt Watchdog hoặc sụt áp lúc khởi động) để đưa ECU vào chế độ an toàn trước khi lặp vô tận.",
    scenarioImpact: "Bật lên trong kịch bản S3 để quan sát bước gọi callout EcuM_LoopDetection() ở StartPreOS."
  },
  EcuMDefaultAppMode: {
    title: "EcuMDefaultAppMode",
    ecucPath: "EcuMCommonConfiguration / EcuMDefaultAppMode",
    sws: "SWS_EcuM_02603 · ECUC_EcuM_00104",
    range: "AppModeType (VD: OSDEFAULTAPPMODE, APPMODE_DIAG)",
    role: "Tên AppMode mặc định mà EcuM_Init() truyền vào hàm StartOS() ở cuối pha StartPreOS.",
    mechanism: "AUTOSAR OS dựa vào tham số AppMode này để quyết định kích hoạt nhóm Autostart Tasks/Alarms nào (chứa EcuM_StartupTwo).",
    scenarioImpact: "Hiển thị trong lời gọi StartOS(...) ở bước cuối StartPreOS của kịch bản S1 và file export."
  },
  EcuMConfigConsistencyHash: {
    title: "EcuMConfigConsistencyHash",
    ecucPath: "EcuMCommonConfiguration / EcuMConfigConsistencyHash",
    sws: "SWS_EcuM_02795 · ECUC_EcuM_00103",
    range: "uint32 Hex (VD: 0x5A3C9F01)",
    role: "Mã băm kiểm tra tính nhất quán biên dịch giữa EcuM Pre-Compile và bảng Post-Build Config.",
    mechanism: "EcuM_Init() đối chiếu hằng số này với giá trị hash nằm trong cấu trúc trả về từ EcuM_DeterminePbConfiguration().",
    scenarioImpact: "Nếu không khớp với InjectedPbConfigHash (như trong kịch bản S3), EcuM gọi ngay EcuM_ErrorHook() và chặn StartOS()."
  },
  InjectedPbConfigHash: {
    title: "InjectedPbConfigHash (Post-Build Config Runtime Hash)",
    ecucPath: "EcuM_PBcfg / ConfigConsistencyHash (Runtime Simulation)",
    sws: "SWS_EcuM_02796",
    range: "uint32 Hex (Khớp với EcuMConfigConsistencyHash)",
    role: "Giá trị mã băm thực tế được đọc ra từ bộ nhớ Flash Post-Build trong pha StartPreOS.",
    mechanism: "Dùng để mô phỏng sự cố flash nhầm bản Post-Build cũ/lệch phiên bản với firmware nền Pre-Compile.",
    scenarioImpact: "Đổi khác với 0x5A3C9F01 ở kịch bản S3 để kích hoạt EcuM_ErrorHook(ECUM_E_CONFIGURATION_DATA_INCONSISTENT)."
  },
  SimulatedMcuResetReason: {
    title: "Simulated Mcu_GetResetReason()",
    ecucPath: "Mcu Driver → EcuM_Init() Reset Mapping",
    sws: "SWS_EcuM_02623",
    range: "MCU_POWER_ON_RESET | MCU_SW_RESET | MCU_WATCHDOG_RESET | MCU_EXT_RESET",
    role: "Nguyên nhân Reset phần cứng do Mcu_GetResetReason() trả về trong pha StartPreOS.",
    mechanism: "EcuM ánh xạ mã Reset của MCAL thành bit nguồn đánh thức chuẩn: POWER_ON -> Bit 0 (0x01), EXT_RESET -> Bit 1 (0x02), SW_RESET -> Bit 2 (0x04), WATCHDOG -> Bit 3 (0x08) và đặt thẳng vào ValidatedWakeupEvents.",
    scenarioImpact: "Thử thay đổi ở kịch bản S1 hoặc S12 rồi bấm Cold Reset Init để xem bit Validated tương ứng sáng lên!"
  },
  EcuMDriverInitZeroEnabled: {
    title: "EcuMDriverInitZeroEnabled",
    ecucPath: "EcuMCommonConfiguration / EcuMDriverInitListZero",
    sws: "SWS_EcuM_02411 · ECUC_EcuM_00125",
    range: "boolean (true | false)",
    role: "Cho phép chạy danh sách khởi tạo DriverInitZero ở ngay đầu EcuM_Init().",
    mechanism: "Chỉ chứa các module không phụ thuộc cấu hình Post-Build (như Det_Init) để có thể ghi nhận lỗi sớm nếu các bước sau thất bại.",
    scenarioImpact: "Bật/tắt để quan sát có gọi EcuM_AL_DriverInitZero() trong kịch bản S1 hay không."
  },
  EcuMDriverInitOneEnabled: {
    title: "EcuMDriverInitOneEnabled",
    ecucPath: "EcuMCommonConfiguration / EcuMDriverInitListOne",
    sws: "SWS_EcuM_02416 · ECUC_EcuM_00126",
    range: "boolean (true | false)",
    role: "Cho phép chạy danh sách khởi tạo DriverInitOne sau khi đã xác định Post-Build Config.",
    mechanism: "Khởi tạo các MCAL drivers thiết yếu trước khi StartOS(): Mcu_Init, Mcu_InitClock, Port_Init, Dio_Init, Gpt_Init, CanTrcv_Init.",
    scenarioImpact: "Hiển thị trong chuỗi StartPreOS của kịch bản S1."
  },
  EcuMDefaultShutdownTarget: {
    title: "EcuMDefaultShutdownTarget",
    ecucPath: "EcuMCommonConfiguration / EcuMDefaultShutdownTarget",
    sws: "SWS_EcuM_02185 · ECUC_EcuM_00105",
    range: "ECUM_STATE_SLEEP | ECUM_STATE_RESET | ECUM_STATE_OFF",
    role: "Mục tiêu tắt/ngủ mặc định được nạp ngay trong EcuM_Init() bằng EcuM_SelectShutdownTarget().",
    mechanism: "Quy định hành động của EcuM khi nhận lệnh EcuM_GoDownHaltPoll() nếu ứng dụng/BswM chưa ghi đè mục tiêu mới.",
    scenarioImpact: "Chuyển qua lại giữa SLEEP (S4/S5), OFF (S11) và RESET (S12)."
  },
  EcuMSleepModeId: {
    title: "EcuMSleepModeId",
    ecucPath: "EcuMCommonConfiguration / EcuMSleepMode",
    sws: "SWS_EcuM_02960 · ECUC_EcuM_00142",
    range: "0: SleepMode_Halt | 1: SleepMode_Poll",
    role: "Chỉ số chế độ ngủ (EcuM_ShutdownModeType) đi kèm khi ShutdownTarget là ECUM_STATE_SLEEP.",
    mechanism: "ID 0 (Halt) dừng hoàn toàn xung nhịp CPU (Mcu_SetMode HALT) + kiểm tra RamHash; ID 1 (Poll) dùng vòng lặp EcuM_SleepActivity() + CheckWakeup().",
    scenarioImpact: "Phân tách trực tiếp luồng chạy của kịch bản S4 (GoHalt) và S5 (GoPoll)."
  },
  EcuMSleepModeSuspend: {
    title: "EcuMSleepModeSuspend",
    ecucPath: "EcuMSleepMode / EcuMSleepModeSuspend",
    sws: "SWS_EcuM_02960 · ECUC_EcuM_00144",
    range: "boolean (true = GoHalt | false = GoPoll)",
    role: "Cờ cấu hình xác định chế độ ngủ hiện tại có tạm dừng thực thi CPU (Suspend) hay không.",
    mechanism: "Khi true, EcuM chạy EcuM_GoHalt() và bắt buộc tạo/kiểm tra RamHash. Khi false, EcuM chạy EcuM_GoPoll() để thăm dò nguồn đánh thức không có ngắt.",
    scenarioImpact: "Tự động đồng bộ theo EcuMSleepModeId hoặc có thể ép thủ công để quan sát GoHalt vs GoPoll."
  },
  EcuMResetModeId: {
    title: "EcuMResetModeId",
    ecucPath: "EcuMFlexConfiguration / EcuMResetMode",
    sws: "SWS_EcuM_04045 · ECUC_EcuM_00174",
    range: "ECUM_RESET_MCU | ECUM_RESET_WDG | ECUM_RESET_IO",
    role: "Kiểu khởi động lại phần cứng được truyền cho callout EcuM_AL_Reset(ResetMode) khi Target là RESET.",
    mechanism: "ECUM_RESET_MCU gọi Mcu_PerformReset(); ECUM_RESET_WDG chủ động ngừng đá Watchdog để reset; ECUM_RESET_IO kích chân reset ngoài.",
    scenarioImpact: "Thay đổi ở kịch bản S12 để quan sát callout EcuM_AL_Reset() tương ứng."
  },
  EcuMShutdownCauseId: {
    title: "EcuMShutdownCauseId",
    ecucPath: "EcuMFlexConfiguration / EcuMShutdownCause",
    sws: "SWS_EcuM_04050 · ECUC_EcuM_00175",
    range: "ECU_STATE | DCM | WDGM | UNKNOWN",
    role: "Ghi nhận nguyên nhân dẫn đến việc tắt/reset ECU thông qua EcuM_SelectShutdownCause().",
    mechanism: "Giúp EcuM/BswM lưu lịch sử hoặc cho phép đọc lại bằng EcuM_GetShutdownCause() để chẩn đoán sau khi khởi động lại.",
    scenarioImpact: "Thể hiện trong kịch bản S11 (ECU_STATE) và S12 (DCM Reset UDS 0x11)."
  },
  CurrentBootTarget: {
    title: "Boot Target (EcuM_SelectBootTarget)",
    ecucPath: "EcuMRuntime / EcuM_BootTargetType",
    sws: "SWS_EcuM_02247 · SWS_EcuM_02835",
    range: "ECUM_BOOT_TARGET_APP | OEM_BOOTLOADER | SYS_BOOTLOADER",
    role: "Chỉ định phần mềm đích sẽ chạy sau lần Reset kế tiếp (ghi vào vùng No-Init RAM chia sẻ với Bootloader).",
    mechanism: "Khi máy chẩn đoán yêu cầu Programming Session (UDS 0x10 02), Dcm/SWC gọi EcuM_SelectBootTarget(OEM_BOOTLOADER) trước khi Reset để Startup Code nhảy vào Flash Bootloader.",
    scenarioImpact: "Là trọng tâm của kịch bản S12 (Bootloader Reset)."
  },
  Can0WakeupValidationTimeout: {
    title: "CAN0 Wakeup Validation Timeout",
    ecucPath: "EcuMWakeupSource_CAN_CH0_RX / EcuMValidationTimeout",
    sws: "SWS_EcuM_02539 · ECUC_EcuM_00151",
    range: "0 .. 5000 ms (0 = Immediate Validated, điển hình 500 ms)",
    role: "Thời gian tối đa EcuM chờ CanIf xác nhận khung CAN hợp lệ sau khi nhận xung đánh thức từ CanTrcv.",
    mechanism: "Nếu > 0, nguồn vào PENDING và đếm ngược; hết timeout mà chưa Validate -> chuyển EXPIRED và ngủ lại. Nếu = 0 -> bỏ qua PENDING vào thẳng VALIDATED.",
    scenarioImpact: "Quyết định thành công (S8) hay hết hạn Glitch Expired (S9)."
  },
  Lin1WakeupValidationTimeout: {
    title: "LIN1 Wakeup Validation Timeout",
    ecucPath: "EcuMWakeupSource_LIN_CH1_RX / EcuMValidationTimeout",
    sws: "SWS_EcuM_02539 · ECUC_EcuM_00151",
    range: "0 .. 5000 ms (điển hình 300 ms)",
    role: "Thời gian chờ LinIf xác nhận Header/Frame LIN hợp lệ sau xung đánh thức Bit 6 (LIN_CH1_RX).",
    mechanism: "Cơ chế tương tự CAN0: lọc nhiễu xung điện trên dây LIN trước khi đánh thức ComM kênh LIN.",
    scenarioImpact: "Dùng khi thử kích hoạt Bit 6 LIN_CH1_RX trong Quick Actions hoặc kịch bản S5."
  },
  Kl15WakeupValidationTimeout: {
    title: "KL15 Ignition Validation Timeout",
    ecucPath: "EcuMWakeupSource_KL15_IGN / EcuMValidationTimeout",
    sws: "SWS_EcuM_02566 · ECUC_EcuM_00151",
    range: "0 .. 5000 ms (mặc định 0 ms = Immediate)",
    role: "Thời gian lọc nhiễu công tắc khóa điện KL15 (Bit 7).",
    mechanism: "Khi đặt = 0 ms, EcuM_SetWakeupEvent(KL15) đặt thẳng bit 0x80 vào ValidatedWakeupEvents ngay trong hàm gọi mà không cần qua PENDING.",
    scenarioImpact: "Minh họa ở kịch bản S7 (Immediate Wakeup vs Debounced Wakeup)."
  },
  Can0ComMChannelRefEnabled: {
    title: "EcuMComMChannelRef (CAN0 → ComMChannel_0)",
    ecucPath: "EcuMWakeupSource_CAN_CH0_RX / EcuMComMChannelRef",
    sws: "SWS_EcuM_02562 · ECUC_EcuM_00150",
    range: "boolean (true | false)",
    role: "Liên kết nguồn đánh thức CAN_CH0_RX với kênh ComMChannel_0.",
    mechanism: "Ngay khi nguồn CAN_CH0_RX đạt trạng thái VALIDATED, EcuM tự động gọi ComM_EcuM_WakeUpIndication(0) để đánh thức ngăn xếp truyền thông.",
    scenarioImpact: "Quan sát lời gọi ComM_EcuM_WakeUpIndication(0) ở kịch bản S8."
  },
  Can0ComMPNCRefEnabled: {
    title: "EcuMComMPNCRef (CAN0 → PNC #16)",
    ecucPath: "EcuMWakeupSource_CAN_CH0_RX / EcuMComMPNCRef",
    sws: "SWS_EcuM_04016 · ECUC_EcuM_00221",
    range: "boolean (true | false)",
    role: "Liên kết nguồn đánh thức WUF từ CanTrcv với cụm mạng con Partial Network Cluster (PNC #16).",
    mechanism: "Khi nguồn wakeup được xác thực và cờ này bật, EcuM gọi ComM_EcuM_PNCWakeUpIndication(16) giúp ComM chỉ bật đúng cụm PNC #16 thay vì toàn bộ xe.",
    scenarioImpact: "Là trọng tâm của kịch bản S10."
  },
  EcuMSleepModeWakeupSourceMask: {
    title: "EcuMWakeupSourceMask (Enabled for Sleep)",
    ecucPath: "EcuMSleepMode / EcuMWakeupSourceMask",
    sws: "SWS_EcuM_02549 · ECUC_EcuM_00145",
    range: "uint8 Bitmask Hex (VD: 0xE0 = CAN0 | LIN1 | KL15)",
    role: "Mặt nạ bitmask quy định những nguồn đánh thức nào được EcuM_EnableWakeupSources() bật lên khi đi ngủ.",
    mechanism: "Nếu một nguồn có bit bằng 0 trong mặt nạ này (VD đặt 0x80 chỉ giữ KL15), ngắt của CAN0 sẽ bị vô hiệu hóa khi đi ngủ (EcuM_SetWakeupEvent sẽ bị bỏ qua lúc ngủ).",
    scenarioImpact: "Thay đổi ở kịch bản S4 What-If để thấy tác dụng chặn wakeup ngoại vi lúc ngủ."
  },
  EcuMRunMinimumDuration: {
    title: "EcuMRunMinimumDuration",
    ecucPath: "EcuMGeneral / EcuMRunMinimumDuration",
    sws: "SWS_EcuM_02310 · ECUC_EcuM_00110",
    range: "0 .. 10000 ms (điển hình 300 ms trong mô phỏng)",
    role: "Thời gian tối thiểu bắt buộc ECU phải giữ ở trạng thái RUN sau khi vừa khởi động hoặc thức dậy.",
    mechanism: "Ngay cả khi mọi SWC nhả EcuM_ReleaseRUN() từ rất sớm, EcuM không cho chuyển sang POST_RUN/PREP_SHUTDOWN cho tới khi bộ đếm này chạm 0 ms (chống bật tắt nguồn liên tục).",
    scenarioImpact: "Thể hiện rõ ở kịch bản S2."
  },
  User0_RunRequestActive: {
    title: "EcuMUser_0 RUN Request (SWC_Powertrain)",
    ecucPath: "EcuMRuntime / EcuM_RequestRUN(0)",
    sws: "SWS_EcuM_01144 · SWS_EcuM_01145",
    range: "boolean (true = RUN Held | false = Released)",
    role: "Mô phỏng việc SWC_Powertrain gọi EcuM_RequestRUN(0) / EcuM_ReleaseRUN(0).",
    mechanism: "Bật Bit 4 (RUN_REQ_HELD) trên Thanh A và giữ ECU trong pha ECUM_STATE_APP_RUN.",
    scenarioImpact: "Dùng trong kịch bản S2 và Quick Action Bar."
  },
  User1_PostRunRequestActive: {
    title: "EcuMUser_1 POST_RUN Request (SWC_DiagLogger)",
    ecucPath: "EcuMRuntime / EcuM_RequestPOST_RUN(1)",
    sws: "SWS_EcuM_01146 · SWS_EcuM_01147",
    range: "boolean (true = POST_RUN Held | false = Released)",
    role: "Mô phỏng việc SWC_DiagLogger giữ trạng thái APP_POST_RUN để hoàn tất ghi log/NvM trước khi cắt nguồn.",
    mechanism: "Khi mọi RUN request đã nhả nhưng POST_RUN vẫn = TRUE, ECU dừng ở ECUM_STATE_APP_POST_RUN (Bit 3 Thanh A = 1) và không đi xuống PREP_SHUTDOWN.",
    scenarioImpact: "Dùng trong kịch bản S2 và Quick Action Bar."
  },
  EcuMAlarmClockPresent: {
    title: "EcuMAlarmClockPresent",
    ecucPath: "EcuMGeneral / EcuMAlarmClockPresent",
    sws: "SWS_EcuM_04054 · ECUC_EcuM_00199",
    range: "boolean (true | false)",
    role: "Bật/tắt hỗ trợ đồng hồ báo thức nội bộ (EcuM Alarm Clock) sử dụng Gpt để tự đánh thức ECU từ giấc ngủ.",
    mechanism: "Khi tắt, mọi lời gọi EcuM_SetRelAlarmClock() bị từ chối (E_NOT_OK / ECUM_E_SERVICE_DISABLED).",
    scenarioImpact: "Điều kiện tiên quyết để chạy kịch bản S6."
  },
  EcuMAlarmClockTimeOut: {
    title: "EcuMAlarmClockTimeOut (Rel Alarm Duration)",
    ecucPath: "EcuMRuntime / EcuM_SetRelAlarmClock(User, Time)",
    sws: "SWS_EcuM_04054 · ECUC_EcuM_00198",
    range: "50 .. 10000 ms (mô phỏng đại diện cho giây thực tế)",
    role: "Khoảng thời gian tương đối hẹn giờ thức dậy khi gọi EcuM_SetRelAlarmClock().",
    mechanism: "EcuM duy trì EcuMMasterAlarm bằng mốc sớm nhất trong các User; khi đếm về 0 lúc đang ngủ, EcuM kích hoạt EcuM_SetWakeupEvent(INT_WDG/GPT) đánh thức toàn ECU.",
    scenarioImpact: "Điều chỉnh thời gian hẹn giờ trong kịch bản S6."
  },
  EcuMGoDownAllowedForUser0: {
    title: "EcuMGoDownAllowedUsers (User 0)",
    ecucPath: "EcuMFlexConfiguration / EcuMGoDownAllowedUsers",
    sws: "SWS_EcuM_04050 · ECUC_EcuM_00206",
    range: "boolean (true = Allowed | false = Denied)",
    role: "Phân quyền những User/Module nào được phép gọi hàm EcuM_GoDownHaltPoll(UserID) để tắt hoặc cho ECU ngủ.",
    mechanism: "Nếu một User không nằm trong danh sách cấp phép gọi EcuM_GoDownHaltPoll(), EcuM từ chối và trả E_NOT_OK (tránh SWC thường tự ý tắt nguồn xe!).",
    scenarioImpact: "Thử tắt trong What-If của S4 hoặc S11 để thấy cơ chế bảo vệ quyền tắt nguồn."
  },
  EcuMMultiCoreSupport: {
    title: "EcuMMultiCoreSupport (Master Core 0 + Slave Core 1)",
    ecucPath: "EcuMGeneral / Multi-Core Configuration",
    sws: "SWS_EcuM_04018 · SWS_EcuM_04025",
    range: "boolean (true = Multi-Core | false = Single-Core)",
    role: "Bật mô phỏng vi điều khiển đa nhân với Core 0 (Master) và Core 1 (Slave).",
    mechanism: "Ở pha Startup, Master Core 0 gọi StartCore(OS_CORE_ID_1) trước StartOS(). Ở pha Sleep/Shutdown, Core 0 phải chờ Core 1 hội tụ tại rào chắn đồng bộ (CoordinateShutdown) mới được Halt hoặc SwitchOff.",
    scenarioImpact: "Là trọng tâm của kịch bản S13 (Multi-Core EcuM) và What-If của S1."
  },
  SlaveCore1ReadyForSleep: {
    title: "SlaveCore1ReadyForSleep (Core 1 Sync Barrier)",
    ecucPath: "EcuMRuntime / Slave Core 1 Synchronization",
    sws: "SWS_EcuM_04025",
    range: "boolean (true = Core 1 Ready | false = Core 1 Busy)",
    role: "Giả lập trạng thái Slave Core 1 đã hoàn thành dọn dẹp tác vụ và sẵn sàng đồng bộ Sleep/Shutdown hay chưa.",
    mechanism: "Nếu đặt false khi bật Multi-Core, Master Core 0 sẽ giữ ECU ở pha chờ đồng bộ (Bit 1 SLAVE_CORE_SYNC = 0 trên Thanh B) mà không gọi Mcu_SetMode(HALT) hay SwitchOff().",
    scenarioImpact: "Thử bật/tắt trực tiếp ở kịch bản S13 để thấy vai trò rào chắn đồng bộ đa nhân!"
  },
  SimulateRamHashCorruption: {
    title: "SimulateRamHashCorruption (CheckRamHash Fail)",
    ecucPath: "EcuM_CheckRamHash() Fault Injection",
    sws: "SWS_EcuM_02926 · SWS_EcuM_02960",
    range: "boolean (true = Inject Corrupt | false = Valid 0xA55A)",
    role: "Tiêm lỗi sai lệch chữ ký bộ nhớ RAM trong lúc ECU ngủ sâu GoHalt.",
    mechanism: "Khi thức dậy từ Halt, EcuM_CheckRamHash() kiểm tra vùng RAM được bảo vệ; nếu trả về 0, EcuM hạ Bit 0 Thanh A (RAM_OK=0), bật Bit 0 Thanh B (FAULT=1) và gọi ngay EcuM_ErrorHook(ECUM_RAM_CHECK_FAILED).",
    scenarioImpact: "Dùng trong What-If của S4 và kịch bản S14."
  },
  NvMWriteAllPendingDelay: {
    title: "NvMWriteAllPendingDelay",
    ecucPath: "BswM / NvM_WriteAll() Async Completion",
    sws: "SWS_EcuM_02920",
    range: "boolean (true = NvM Busy | false = NvM Idle)",
    role: "Giả lập bộ nhớ Flash/EEPROM đang bận ghi dữ liệu cuối phiên qua NvM_WriteAll() trong pha PREP_SHUTDOWN.",
    mechanism: "Ngăn không cho BswM gọi EcuM_GoDownHaltPoll() cắt nguồn khi NvM chưa ghi xong để tránh mất dữ liệu DTC/Odometer.",
    scenarioImpact: "Thử bật trong kịch bản S2 hoặc S11 để thấy ECU đợi NvM xong mới cho phép tắt."
  }
};

const MODULES_INFO = {
  MOD_BOOT: {
    id: "MOD_BOOT",
    name: "MCU Reset Vector & Bootloader",
    layer: "Microcontroller / Boot Layer",
    role: "Khởi tạo phần cứng tối thiểu ngay sau Reset (Stack, Clock cơ bản, No-Init RAM), kiểm tra BootTarget để quyết định nhảy vào Application hay Flash Bootloader.",
    inputs: "Tín hiệu cấp nguồn KL30, chân RESET vật lý, lệnh Mcu_PerformReset() và giá trị EcuM_BootTargetType nằm trong vùng No-Init RAM.",
    processing: "Nếu BootTarget == OEM_BOOTLOADER / SYS_BOOTLOADER -> giữ CPU trong Flash Bootloader để nạp UDS. Nếu BootTarget == APP -> nhảy vào main() của ứng dụng AUTOSAR và gọi EcuM_Init().",
    outputs: "Chuyển điều khiển trực tiếp vào EcuM_Init() ở pha StartPreOS (khi OS chưa chạy).",
    apis: ["main() -> EcuM_Init()", "EcuM_GetBootTarget(&target)", "NoInitRam_BootMagic"]
  },
  MOD_ECUM: {
    id: "MOD_ECUM",
    name: "EcuM Core Engine (ECU State Manager)",
    layer: "System Services (Module ID = 10)",
    role: "Quản lý toàn bộ vòng đời ECU (STARTUP, UP, SLEEP, SHUTDOWN), điều phối khởi tạo đa pha trước/sau OS, xác thực nguồn đánh thức và đồng bộ đa nhân.",
    inputs: "EcuM_Init(), EcuM_StartupTwo(), EcuM_MainFunction() từ SchM; lệnh RequestRUN/GoDownHaltPoll từ SWC/BswM; báo hiệu EcuM_SetWakeupEvent/ValidateWakeupEvent từ Driver/CanIf.",
    processing: "1) Chạy StartPreOS (DriverInitZero/One, PB Hash Check, ResetReason) & StartPostOS (SchM_Init, BswM_Init). 2) Vòng lặp Wakeup Validation (NONE->PENDING->VALIDATED/EXPIRED). 3) Thực thi GoHalt (RamHash + Halt), GoPoll (SleepActivity), hoặc Shutdown PreOS/OffPreOS.",
    outputs: "StartOS(), ShutdownOS(), BswM_EcuM_CurrentState/Wakeup(), ComM_EcuM_WakeUpIndication(), Mcu_SetMode/PerformReset(), Callouts (EcuM_AL_*), Det_ReportError().",
    apis: ["EcuM_Init()", "EcuM_StartupTwo()", "EcuM_MainFunction()", "EcuM_GoDownHaltPoll()", "EcuM_SetWakeupEvent()", "EcuM_ValidateWakeupEvent()", "EcuM_SelectShutdownTarget()", "EcuM_SelectBootTarget()"]
  },
  MOD_OS: {
    id: "MOD_OS",
    name: "AUTOSAR OS & SchM",
    layer: "OS / RTE Scheduler Layer",
    role: "Cung cấp bộ lập lịch đa nhiệm thời gian thực, khởi động nhân phụ (StartCore), kích hoạt Task khởi tạo BSW và xử lý hook tắt hệ điều hành.",
    inputs: "Nhận lệnh StartCore(), StartOS(EcuMDefaultAppMode) ở cuối pha StartPreOS; nhận lệnh ShutdownOS(E_OK) từ EcuM trong pha Shutdown PreOS.",
    processing: "Sau StartOS(), chạy Autostart Task (OsTask_Init) gọi EcuM_StartupTwo(). Sau khi SchM_Init() xong, gọi định kỳ EcuM_MainFunction() mỗi 10ms. Khi ShutdownOS() chạy, dừng toàn bộ Task/Alarm và gọi ShutdownHook() chứa pha OffPreOS.",
    outputs: "Kích hoạt EcuM_StartupTwo(), EcuM_MainFunction(), và ShutdownHook() -> EcuM_Shutdown().",
    apis: ["StartCore(CoreID, &Status)", "StartOS(AppMode)", "ShutdownOS(Error)", "ShutdownHook(Error)", "SchM_Init() / SchM_Deinit()"]
  },
  MOD_BSWM: {
    id: "MOD_BSWM",
    name: "BswM (BSW Mode Manager)",
    layer: "System Services",
    role: "Đối tác trung tâm của EcuM Flexible: tiếp nhận quyền điều phối chế độ sau EcuM_StartupTwo(), khởi tạo các BSW dùng OS và ra quyết định khi nào ECU được ngủ/tắt.",
    inputs: "Được khởi tạo bởi BswM_Init(PbCfg); nhận thông báo thay đổi pha từ EcuM (BswM_EcuM_CurrentState) và trạng thái wakeup (BswM_EcuM_CurrentWakeup).",
    processing: "Đánh giá các Rule dựa trên trạng thái Wakeup Validated, ComM Channels và NvM_ReadAll/WriteAll. Khi mọi kênh truyền thông đã về NO_COM và NvM ghi xong, BswM kích hoạt ActionList gọi EcuM_GoDownHaltPoll().",
    outputs: "Điều khiển NvM_ReadAll/WriteAll, Rte_Start, ComM_CommunicationAllowed(), và gọi EcuM_SelectShutdownTarget() / EcuM_GoDownHaltPoll().",
    apis: ["BswM_Init(ConfigPtr)", "BswM_Deinit()", "BswM_EcuM_CurrentState(State)", "BswM_EcuM_CurrentWakeup(src, status)", "EcuM_SetState(State)"]
  },
  MOD_SWC: {
    id: "MOD_SWC",
    name: "SWC_App, RTE & DCM",
    layer: "Application / Diagnostic Layer",
    role: "Các thành phần ứng dụng và chẩn đoán UDS xin giữ ECU thức để hoàn thành công việc, hẹn giờ báo thức định kỳ hoặc yêu cầu chuyển Bootloader.",
    inputs: "Tín hiệu khóa điện KL15, dịch vụ chẩn đoán UDS 0x10/0x11, nhu cầu tính toán định kỳ (ví dụ BMS kiểm tra cell pin khi xe đỗ).",
    processing: "Gọi EcuM_RequestRUN() / ReleaseRUN() / RequestPOST_RUN() qua cổng RTE; gọi EcuM_SetRelAlarmClock() để hẹn giờ đánh thức; gọi EcuM_SelectBootTarget(OEM_BOOTLOADER) trước khi Reset.",
    outputs: "Tác động trực tiếp lên thanh ghi RUN/POST_RUN Users, AlarmClock và BootTarget bên trong EcuM.",
    apis: ["EcuM_RequestRUN(User)", "EcuM_ReleaseRUN(User)", "EcuM_RequestPOST_RUN(User)", "EcuM_SetRelAlarmClock(User, Time)", "EcuM_SelectBootTarget(Target)"]
  },
  MOD_COMM: {
    id: "MOD_COMM",
    name: "ComM (Communication Manager)",
    layer: "System / Communication Services",
    role: "Quản lý trạng thái các kênh mạng (CAN/LIN/ETH) và Partial Network Clusters (PNC); chỉ nhận chỉ báo wakeup sau khi EcuM đã xác thực thành công.",
    inputs: "Nhận ComM_EcuM_WakeUpIndication(Channel) hoặc ComM_EcuM_PNCWakeUpIndication(PNCid) từ EcuM khi nguồn đánh thức đạt trạng thái VALIDATED.",
    processing: "Đưa kênh mạng từ NO_COM_NO_PENDING_REQUEST sang NO_COM_REQUEST_PENDING rồi lên FULL_COM_READY_SLEEP (hoặc đưa PNC vào PNC_PREPARE_SLEEP) mà không bị đánh thức giả do nhiễu bus.",
    outputs: "Thông báo trạng thái kênh lên BswM, RTE và điều khiển CanSM / CanNm.",
    apis: ["ComM_EcuM_WakeUpIndication(Channel)", "ComM_EcuM_PNCWakeUpIndication(PNCid)"]
  },
  MOD_CANIF: {
    id: "MOD_CANIF",
    name: "CanIf, CanTrcv, LinIf & Icu",
    layer: "ECU Abstraction & MCAL I/O",
    role: "Phát hiện sườn xung đánh thức phần cứng lúc ECU đang ngủ và phối hợp với EcuM để xác thực khung truyền thông hợp lệ (lọc nhiễu Glitch).",
    inputs: "Xung sườn xuống đường dây CAN/LIN/KL15; lệnh EcuM_CheckWakeup() và EcuM_CheckValidation() từ Callouts của EcuM.",
    processing: "1) Khi phát hiện xung, gọi EcuM_SetWakeupEvent(src) -> PENDING. 2) Khi EcuM bật Controller qua EcuM_StartWakeupSources(), chờ nhận 1 CAN/LIN frame hợp lệ -> gọi EcuM_ValidateWakeupEvent(src) -> VALIDATED.",
    outputs: "Gọi EcuM_SetWakeupEvent() và EcuM_ValidateWakeupEvent() lên EcuM.",
    apis: ["EcuM_SetWakeupEvent(sources)", "EcuM_ValidateWakeupEvent(sources)", "CanIf_CheckWakeup(src)", "CanIf_CheckValidation(src)"]
  },
  MOD_MCU: {
    id: "MOD_MCU",
    name: "Mcu, Gpt & WdgM (MCAL)",
    layer: "Microcontroller Abstraction Layer",
    role: "Thực thi phần cứng các lệnh đọc nguyên nhân Reset, chuyển đổi chế độ tiêu thụ điện CPU (NORMAL/HALT/POLL), đếm giờ AlarmClock và Reset phần cứng.",
    inputs: "Lệnh khởi tạo ở DriverInitOne; Mcu_GetResetReason() ở StartPreOS; Mcu_SetMode(HALT/POLL) khi ngủ; Mcu_PerformReset() khi EcuM_AL_Reset() chạy.",
    processing: "Khi vào Halt, khóa PLL/CPU Clock và chỉ giữ khối Wakeup IRQ + Gpt Alarm hoạt động. Khi Reset, thực hiện Soft/Hard Reset theo ResetMode.",
    outputs: "Trả ResetReason về EcuM_Init() và kích ngắt đánh thức CPU khi có sự kiện phần cứng hoặc hết giờ Gpt.",
    apis: ["Mcu_GetResetReason()", "Mcu_SetMode(McuMode)", "Mcu_PerformReset()", "Gpt_EnableWakeup(Channel)"]
  },
  MOD_NVM: {
    id: "MOD_NVM",
    name: "NvM (Non-Volatile Memory Manager)",
    layer: "Memory Services",
    role: "Đảm bảo dữ liệu RAM (DTC, cấu hình, Odometer, InhibitCounter) được nạp khi khởi động và ghi xuống Flash/EEPROM an toàn trước khi cắt nguồn.",
    inputs: "Lệnh NvM_ReadAll() trong pha StartPostOS (sau BswM_Init) và lệnh NvM_WriteAll() trong pha PREP_SHUTDOWN.",
    processing: "Thực thi đọc/ghi bất đồng bộ xuống Fee/Ea/Flash Driver. Chỉ khi NvM_GetErrorStatus() trả NVM_REQ_OK (hết bận), BswM mới được phép gọi EcuM_GoDownHaltPoll() để cắt rơ-le nguồn.",
    outputs: "Cung cấp trạng thái sẵn sàng cho BswM trước khi EcuM bước vào Shutdown PreOS.",
    apis: ["NvM_ReadAll()", "NvM_WriteAll()", "NvM_GetErrorStatus(0, &Status)"]
  },
  MOD_DET: {
    id: "MOD_DET",
    name: "DET & EcuM_ErrorHook",
    layer: "System Services (Diagnostics)",
    role: "Ghi nhận và bẫy lỗi lập trình (Development Errors) cũng như lỗi toàn vẹn hệ thống nghiêm trọng (RAM Hash Fail, Config Inconsistency).",
    inputs: "Det_ReportError(ModuleId=10, ...) khi truyền sai tham số/NULL_PTR/UNINIT; EcuM_ErrorHook(reason) khi Hash không khớp hoặc RamCheck lỗi.",
    processing: "Lưu vết mã lỗi API (ServiceId) và mã lỗi chi tiết; riêng EcuM_ErrorHook() dừng hệ thống vào trạng thái an toàn thay vì cho CPU chạy tiếp với RAM/Config hỏng.",
    outputs: "Hiển thị cảnh báo đỏ trên Thanh B (Bit 0 FAULT), Header Badge và bảng Trace.",
    apis: ["Det_ReportError(10, 0, ServiceId, ErrorId)", "EcuM_ErrorHook(uint16 reason)"]
  }
};

const ABBREVIATIONS_DATA = [
  // PHASE & CORE (14)
  { abbr: "EcuM", full: "ECU State Manager", vi: "Trình Quản Lý Trạng Thái ECU", cat: "PHASE", sws: "SWS_EcuM_02800", desc: "Module BSW tầng System Services (ModuleId = 10) quản lý toàn bộ vòng đời ECU (STARTUP, UP, SLEEP, SHUTDOWN) và xác thực nguồn đánh thức." },
  { abbr: "EcuM Flexible", full: "EcuM Flexible Architecture", vi: "Kiến Trúc EcuM Linh Hoạt", cat: "PHASE", sws: "SWS_EcuM_04004", desc: "Kiến trúc EcuM chuẩn R20-11/R23-11: bàn giao việc điều phối Mode và khởi tạo tầng cao cho BswM thay vì giữ bảng cứng trong EcuM." },
  { abbr: "EcuM Fixed", full: "EcuM Fixed Architecture", vi: "Kiến Trúc EcuM Cố Định", cat: "PHASE", sws: "SWS_EcuM_02310", desc: "Kiến trúc cổ điển nơi EcuM tự quản lý cứng máy trạng thái RUN, POST_RUN, PREP_SHUTDOWN và bảng DriverInitTwo/Three." },
  { abbr: "BswM", full: "Basic Software Mode Manager", vi: "Trình Quản Lý Chế Độ BSW", cat: "PHASE", sws: "SWS_BswM", desc: "Module phối hợp trực tiếp với EcuM Flexible để đánh giá Rule và ra lệnh khởi tạo/tắt BSW, gọi EcuM_GoDownHaltPoll()." },
  { abbr: "STARTUP Phase", full: "ECU Startup Phase", vi: "Pha Khởi Động ECU", cat: "PHASE", sws: "SWS_EcuM_02933", desc: "Pha đầu tiên của vòng đời ECU từ Reset Vector đến khi bàn giao xong BswM_Init(), chia thành StartPreOS và StartPostOS." },
  { abbr: "UP Phase", full: "ECU Operational UP Phase", vi: "Pha Hoạt Động Bình Thường", cat: "PHASE", sws: "SWS_EcuM_02933", desc: "Pha ECU đang chạy hệ điều hành và ứng dụng bình thường, bao gồm RUN, POST_RUN, PREP_SHUTDOWN và vòng lặp xác thực wakeup." },
  { abbr: "ECUM_STATE_RUN", full: "EcuM Operational Run State", vi: "Trạng Thái ECU Đang Chạy", cat: "PHASE", sws: "SWS_EcuM_04005", desc: "Trạng thái ECU hoạt động đầy đủ sau StartPostOS hoặc WakeupRestart; giữ ECU thức trong thời gian EcuMRunMinimumDuration hoặc khi có RequestRUN." },
  { abbr: "APP_RUN", full: "ECUM_STATE_APP_RUN", vi: "Trạng Thái Ứng Dụng RUN", cat: "PHASE", sws: "SWS_EcuM_01144", desc: "Trạng thái con trong pha UP giữ ECU chạy nhờ các lời gọi EcuM_RequestRUN(User) từ SWC." },
  { abbr: "APP_POST_RUN", full: "ECUM_STATE_APP_POST_RUN", vi: "Trạng Thái Hậu Kỳ POST_RUN", cat: "PHASE", sws: "SWS_EcuM_01146", desc: "Trạng thái chuyển tiếp sau khi tất cả RUN Request đã nhả nhưng còn User giữ RequestPOST_RUN để hoàn tất dọn dẹp dữ liệu." },
  { abbr: "PREP_SHUTDOWN", full: "ECUM_STATE_PREP_SHUTDOWN", vi: "Pha Chuẩn Bị Tắt Nguồn", cat: "PHASE", sws: "SWS_EcuM_02933", desc: "Trạng thái chuẩn bị ngay trước khi gọi GoDownHaltPoll: đợi ComM về NO_COM và NvM_WriteAll() hoàn tất." },
  { abbr: "RunMinimumDuration", full: "EcuMRunMinimumDuration", vi: "Thời Gian Giữ RUN Tối Thiểu", cat: "PHASE", sws: "ECUC_EcuM_00110", desc: "Timer đảm bảo ECU không bị tắt đột ngột ngay sau khi vừa khởi động nếu SWC chưa kịp gọi EcuM_RequestRUN()." },
  { abbr: "EcuM_RequestRUN", full: "Request RUN Mode API", vi: "Hàm Xin Giữ Trạng Thái RUN", cat: "PHASE", sws: "SWS_EcuM_01144", desc: "API cho phép SWC/BSW giữ ECU ở trạng thái APP_RUN không cho phép đi ngủ hoặc tắt nguồn." },
  { abbr: "EcuM_SetState", full: "Set EcuM State API (Flexible)", vi: "Hàm Cập Nhật Pha EcuM", cat: "PHASE", sws: "SWS_EcuM_04005", desc: "API do BswM gọi để thông báo trạng thái ECU logic hiện tại (RUN, APP_RUN, APP_POST_RUN, PREP_SHUTDOWN, SLEEP, OFF)." },
  { abbr: "DET", full: "Default Error Tracer", vi: "Bộ Ghi Nhận Lỗi Phát Triển", cat: "PHASE", sws: "SWS_EcuM_02802", desc: "Module nhận Det_ReportError(ModuleId = 10) khi EcuM bị gọi lúc UNINIT hoặc truyền sai tham số (NULL_PTR, INVALID_PAR, UNKNOWN_WAKEUP_SOURCE)." },

  // STARTUP & CALLOUTS (12)
  { abbr: "StartPreOS", full: "Startup Sequence Before StartOS", vi: "Khởi Động Trước Khi Chạy OS", cat: "START", sws: "SWS_EcuM_02411", desc: "Trình tự chạy bên trong EcuM_Init() trước StartOS(): gọi DriverInitZero, DeterminePbConfiguration, DriverInitOne và đọc ResetReason." },
  { abbr: "StartPostOS", full: "Startup Sequence After StartOS", vi: "Khởi Động Sau Khi Chạy OS", cat: "START", sws: "SWS_EcuM_02838", desc: "Trình tự chạy bên trong OsTask_Init thông qua EcuM_StartupTwo(): khởi tạo SchM_Init() và BswM_Init()." },
  { abbr: "EcuM_Init", full: "EcuM Initialization API", vi: "Hàm Khởi Tạo EcuM Đầu Tiên", cat: "START", sws: "SWS_EcuM_02811", desc: "Hàm đầu tiên được gọi từ main() khi phần cứng vừa Reset xong; kết thúc bằng việc gọi StartOS() (không bao giờ return)." },
  { abbr: "EcuM_StartupTwo", full: "EcuM Second Startup Phase", vi: "Hàm Khởi Tạo Pha Hai (PostOS)", cat: "START", sws: "SWS_EcuM_02838", desc: "Hàm chạy trong ngữ cảnh Task đầu tiên của OS để bật bộ lập lịch SchM và bàn giao điều khiển cho BswM." },
  { abbr: "DriverInitZero", full: "EcuM_AL_DriverInitZero", vi: "Callout Khởi Tạo Sớm Nhất (Mức 0)", cat: "START", sws: "SWS_EcuM_02411", desc: "Callout chạy ở đầu EcuM_Init() dùng để khởi tạo các module không dùng cấu hình Post-Build như Det." },
  { abbr: "DeterminePbConfig", full: "EcuM_DeterminePbConfiguration", vi: "Callout Xác Định Cấu Hình PB", cat: "START", sws: "SWS_EcuM_02795", desc: "Callout trả về con trỏ cấu hình Post-Build (EcuM_PBcfg) trước khi kiểm tra mã băm nhất quán ConfigConsistencyHash." },
  { abbr: "ConfigHash", full: "EcuMConfigConsistencyHash", vi: "Mã Băm Nhất Quán Cấu Hình", cat: "START", sws: "SWS_EcuM_02795", desc: "Mã băm 32-bit dùng so sánh dữ liệu Pre-Compile và Post-Build nhằm phát hiện sai lệch phiên bản trước khi StartOS()." },
  { abbr: "DriverInitOne", full: "EcuM_AL_DriverInitOne", vi: "Callout Khởi Tạo Driver Mức 1", cat: "START", sws: "SWS_EcuM_02416", desc: "Callout khởi tạo các MCAL drivers thiết yếu (Mcu, Port, Dio, Gpt, CanTrcv) ngay trước khi khởi động OS." },
  { abbr: "DriverRestart", full: "EcuM_AL_DriverRestart", vi: "Callout Khởi Tạo Lại Driver Sau Ngủ", cat: "START", sws: "SWS_EcuM_02961", desc: "Callout phục hồi các ngoại vi phần cứng bị tắt hoặc mất xung nhịp khi MCU vừa thức dậy từ chế độ GoHalt / GoPoll." },
  { abbr: "LoopDetection", full: "EcuM_LoopDetection", vi: "Callout Phát Hiện Reset Lặp", cat: "START", sws: "SWS_EcuM_02927", desc: "Callout chạy trong StartPreOS nhằm phát hiện tình trạng ECU bị Reset liên tiếp nhiều lần do lỗi sụt áp hoặc Watchdog." },
  { abbr: "Mcu_GetResetReason", full: "MCAL Get Reset Reason API", vi: "Hàm Đọc Nguyên Nhân Reset MCU", cat: "START", sws: "SWS_EcuM_02623", desc: "API của module Mcu cho biết lý do Reset vừa xảy ra (Power-On, Watchdog, Software Reset) để EcuM ánh xạ thành WakeupSource Validated." },
  { abbr: "EcuM_ErrorHook", full: "EcuM Fatal Error Hook Callout", vi: "Hàm Bẫy Lỗi Nghiêm Trọng EcuM", cat: "START", sws: "SWS_EcuM_02926", desc: "Callout được gọi khi gặp lỗi không thể phục hồi như ECUM_RAM_CHECK_FAILED hoặc ECUM_E_CONFIGURATION_DATA_INCONSISTENT." },

  // WAKEUP & VALIDATION (14)
  { abbr: "WakeupSource", full: "EcuM_WakeupSourceType (32-bit)", vi: "Mặt Nạ Bit Nguồn Đánh Thức", cat: "WKUP", sws: "SWS_EcuM_02165", desc: "Kiểu bitmask uint32 đại diện tối đa 32 nguồn đánh thức; Bit 0..4 là 5 nguồn chuẩn AUTOSAR, Bit 5 trở lên do người dùng định nghĩa." },
  { abbr: "WKSTATUS_NONE", full: "ECUM_WKSTATUS_NONE", vi: "Trạng Thái Chưa Có Wakeup", cat: "WKUP", sws: "SWS_EcuM_02344", desc: "Trạng thái nghỉ mặc định của nguồn đánh thức (không Pending, không Validated, không Expired)." },
  { abbr: "WKSTATUS_PENDING", full: "ECUM_WKSTATUS_PENDING", vi: "Trạng Thái Đang Chờ Xác Thực", cat: "WKUP", sws: "SWS_EcuM_01117", desc: "Nguồn đánh thức có ValidationTimeout > 0 vừa kích hoạt SetWakeupEvent() và đang đợi tầng truyền thông xác nhận frame hợp lệ." },
  { abbr: "WKSTATUS_VALIDATED", full: "ECUM_WKSTATUS_VALIDATED", vi: "Trạng Thái Đánh Thức Hợp Lệ", cat: "WKUP", sws: "SWS_EcuM_02546", desc: "Nguồn đánh thức đã được xác nhận hợp lệ (tức thì nếu Timeout=0 hoặc qua EcuM_ValidateWakeupEvent); đủ điều kiện báo ComM." },
  { abbr: "WKSTATUS_EXPIRED", full: "ECUM_WKSTATUS_EXPIRED", vi: "Trạng Thái Hết Hạn (Nhiễu Glitch)", cat: "WKUP", sws: "SWS_EcuM_02561", desc: "Trạng thái khi EcuMValidationTimeout đếm về 0 mà không nhận được frame hợp lệ -> EcuM dừng nguồn và đưa ECU ngủ lại." },
  { abbr: "SetWakeupEvent", full: "EcuM_SetWakeupEvent()", vi: "Hàm Báo Sự Kiện Đánh Thức", cat: "WKUP", sws: "SWS_EcuM_02826", desc: "Callback được ISR/Driver (CanTrcv, Icu) gọi khi phát hiện xung phần cứng; đưa nguồn vào PENDING (hoặc thẳng VALIDATED nếu Timeout=0)." },
  { abbr: "ValidateWakeupEvent", full: "EcuM_ValidateWakeupEvent()", vi: "Hàm Xác Nhận Đánh Thức Hợp Lệ", cat: "WKUP", sws: "SWS_EcuM_02827", desc: "Callback do CanIf/LinIf gọi khi nhận được frame hợp lệ trên bus trong lúc nguồn đang ở trạng thái PENDING." },
  { abbr: "ValidationTimeout", full: "EcuMValidationTimeout", vi: "Thời Gian Chờ Xác Thực Đánh Thức", cat: "WKUP", sws: "SWS_EcuM_02539", desc: "Thời hạn tối đa chờ xác nhận frame hợp lệ sau khi thức dậy. Bằng 0 ms nghĩa là tin cậy tuyệt đối không cần chờ." },
  { abbr: "StartWakeupSources", full: "EcuM_StartWakeupSources()", vi: "Callout Bật Nguồn Đợi Xác Thực", cat: "WKUP", sws: "SWS_EcuM_02539", desc: "Callout bật tạm CanController / LinController ở chế độ lắng nghe ngay khi có nguồn rơi vào PENDING." },
  { abbr: "StopWakeupSources", full: "EcuM_StopWakeupSources()", vi: "Callout Dừng Nguồn Hết Hạn", cat: "WKUP", sws: "SWS_EcuM_02561", desc: "Callout tắt lại CanController khi nguồn đánh thức rơi vào EXPIRED do hết timeout mà không có gói tin hợp lệ." },
  { abbr: "ClearWakeupEvent", full: "EcuM_ClearWakeupEvent()", vi: "Hàm Xóa Cờ Nguồn Đánh Thức", cat: "WKUP", sws: "SWS_EcuM_02683", desc: "Hàm xóa các bit trong Pending, Validated và Expired trước khi ECU bước vào chu kỳ ngủ mới." },
  { abbr: "WakeUpIndication", full: "ComM_EcuM_WakeUpIndication()", vi: "Chỉ Báo Đánh Thức Sang ComM", cat: "WKUP", sws: "SWS_EcuM_02562", desc: "Hàm EcuM gọi sang ComM chỉ sau khi nguồn đánh thức liên kết với kênh ComMChannel đạt trạng thái VALIDATED." },
  { abbr: "PNCWakeUpIndication", full: "ComM_EcuM_PNCWakeUpIndication()", vi: "Chỉ Báo Đánh Thức Cụm PNC", cat: "WKUP", sws: "SWS_EcuM_04016", desc: "Hàm EcuM gọi sang ComM khi CanTrcv có Selective Wakeup giải mã đúng khung WUF của cụm PNC." },
  { abbr: "WUF", full: "Wake-Up Frame (ISO 11898-2)", vi: "Khung Đánh Thức Mạng Con PNC", cat: "WKUP", sws: "SWS_EcuM_04016", desc: "Gói tin CAN đặc biệt được bộ lọc phần cứng CanTrcv giải mã khi CPU đang ngủ để chỉ đánh thức đúng các ECU thuộc PNC mục tiêu." },

  // SLEEP, SHUTDOWN & MULTI-CORE (14)
  { abbr: "SLEEP Phase", full: "ECU Low-Power Sleep Phase", vi: "Pha Ngủ Tiết Kiệm Điện", cat: "SLEEP", sws: "SWS_EcuM_02960", desc: "Pha vi điều khiển giảm tiêu thụ dòng tối đa (GoHalt hoặc GoPoll) nhưng vẫn giữ nguồn RAM và chờ ngắt đánh thức." },
  { abbr: "GoHalt", full: "EcuM_GoHalt() (Suspend Mode)", vi: "Chế Độ Ngủ Sâu Dừng CPU", cat: "SLEEP", sws: "SWS_EcuM_02960", desc: "Trình tự ngủ dừng hoàn toàn xung nhịp CPU qua Mcu_SetMode(HALT), bắt buộc tạo và kiểm tra RamHash trước/sau khi ngủ." },
  { abbr: "GoPoll", full: "EcuM_GoPoll() (Polling Mode)", vi: "Chế Độ Ngủ Thăm Dò Định Kỳ", cat: "SLEEP", sws: "SWS_EcuM_02962", desc: "Trình tự ngủ nhẹ giảm xung nhịp, chạy vòng lặp gọi EcuM_SleepActivity() và EcuM_CheckWakeup() cho các nguồn không có ngắt." },
  { abbr: "WakeupRestart", full: "EcuM WakeupRestart Sequence", vi: "Chuỗi Khôi Phục Sau Khi Thức Dậy", cat: "SLEEP", sws: "SWS_EcuM_02961", desc: "Trình tự phục hồi CPU từ giấc ngủ: đưa MCU về NORMAL, kiểm tra RamHash, tắt Wakeup IRQ, chạy DriverRestart() và trả về pha UP." },
  { abbr: "RamHash", full: "EcuM_GenerateRamHash / CheckRamHash", vi: "Chữ Ký Kiểm Tra Toàn Vẹn RAM", cat: "SLEEP", sws: "SWS_EcuM_02926", desc: "Cặp callout tính checksum RAM trước khi Halt và đối chiếu lại ngay khi thức dậy để đảm bảo dữ liệu không bị mất do sụt áp." },
  { abbr: "SleepActivity", full: "EcuM_SleepActivity()", vi: "Callout Thực Thi Trong GoPoll", cat: "SLEEP", sws: "SWS_EcuM_02963", desc: "Callout chạy lặp đi lặp lại trong vòng lặp GoPoll (ví dụ để đá Watchdog nhẹ hoặc chờ phần cứng ổn định)." },
  { abbr: "EcuM Alarm Clock", full: "EcuM_SetRelAlarmClock / Abs", vi: "Đồng Hồ Báo Thức Nội Bộ EcuM", cat: "SLEEP", sws: "SWS_EcuM_04054", desc: "Cơ chế hẹn giờ dùng Gpt cho phép các SWC đặt lịch tự đánh thức ECU khỏi trạng thái SLEEP sau một khoảng thời gian xác định." },
  { abbr: "GoDownHaltPoll", full: "EcuM_GoDownHaltPoll(UserID)", vi: "API Ra Lệnh Ngủ Hoặc Tắt Nguồn", cat: "SLEEP", sws: "SWS_EcuM_04050", desc: "API chuẩn R20-11+ do BswM/User được cấp phép gọi để thực thi ShutdownTarget (vào GoHalt, GoPoll, hoặc Shutdown PreOS)." },
  { abbr: "SHUTDOWN Phase", full: "ECU Shutdown Phase (OFF/RESET)", vi: "Pha Tắt Nguồn Hoặc Reset", cat: "SLEEP", sws: "SWS_EcuM_02920", desc: "Pha kết thúc phiên làm việc của ECU gồm 2 giai đoạn: PreOS Shutdown (trước ShutdownOS) và OffPreOS (bên trong ShutdownHook)." },
  { abbr: "OffPreOS", full: "Shutdown Sequence After ShutdownOS", vi: "Pha Tắt Cuối Sau Khi Dừng OS", cat: "SLEEP", sws: "SWS_EcuM_02920", desc: "Trình tự chạy sau khi OS đã tắt hoàn toàn: gọi EcuM_OnGoOffOne(), DriverDeInit, EcuM_OnGoOffTwo() và SwitchOff() / Reset()." },
  { abbr: "SwitchOff / Reset", full: "EcuM_AL_SwitchOff / EcuM_AL_Reset", vi: "Callout Cắt Nguồn / Reset Phần Cứng", cat: "SLEEP", sws: "SWS_EcuM_02920", desc: "Bước cuối cùng của vòng đời ECU: ngắt mạch giữ nguồn ngoài (SBC Power Latch) hoặc gọi Mcu_PerformReset()." },
  { abbr: "ShutdownTarget", full: "EcuM_ShutdownTargetType", vi: "Mục Tiêu Tắt/Ngủ (SLEEP/RESET/OFF)", cat: "SLEEP", sws: "SWS_EcuM_02585", desc: "Lựa chọn đích đến khi gọi GoDownHaltPoll: ngủ tiết kiệm điện (SLEEP), khởi động lại (RESET) hoặc tắt nguồn hoàn toàn (OFF)." },
  { abbr: "BootTarget / FBL", full: "EcuM_BootTargetType & Flash Bootloader", vi: "Đích Khởi Động & Nạp Phần Mềm", cat: "SLEEP", sws: "SWS_EcuM_02247", desc: "Chỉ định chạy Application hay OEM/Sys Flash Bootloader sau lần Reset kế tiếp thông qua vùng nhớ No-Init RAM." },
  { abbr: "Multi-Core Sync", full: "Master/Slave CoordinateShutdown", vi: "Đồng Bộ Đa Nhân Master-Slave", cat: "SLEEP", sws: "SWS_EcuM_04018", desc: "Cơ chế Master Core 0 gọi StartCore() lúc khởi động và chờ mọi Slave Core hoàn tất tác vụ tại rào chắn đồng bộ trước khi Halt hoặc SwitchOff." }
];
