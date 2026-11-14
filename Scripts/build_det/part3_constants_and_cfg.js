// ==================== PART 3: CONSTANTS, 4-TUPLE DICTIONARIES, 36 ECUC TOOLTIPS, 10 MODULES, 52 ABBREVIATIONS ====================

const DET_CORE_BITS = [
  { bit: 7, mask: 0x80, tag: "INIT",   name: "DET_INIT",   tone: "ok",    desc: "Bit 7 (0x80): Det_Init(NULL_PTR) [SID 0x00] đã chạy, Det_ErrorBuffer[] được reset (SWS_Det_00019, SWS_Det_00204)." },
  { bit: 6, mask: 0x40, tag: "START",  name: "DET_STRT",   tone: "ok",    desc: "Bit 6 (0x40): Det_Start() [SID 0x02] đã gọi ở StartupTwo — sẵn sàng ghi RAM Ring Buffer & DLT (SWS_Det_00025)." },
  { bit: 5, mask: 0x20, tag: "DEV",    name: "ACTV_DEV",   tone: "err",   desc: "Bit 5 (0x20): Đang xử lý/vừa xử lý Det_ReportError() [SID 0x01] Development Error (SWS_Det_00039)." },
  { bit: 4, mask: 0x10, tag: "RUNTM",  name: "ACTV_RTM",   tone: "warn",  desc: "Bit 4 (0x10): Đang xử lý/vừa xử lý Det_ReportRuntimeError() [SID 0x04] — luôn bật cả Production (SWS_Det_00501)." },
  { bit: 3, mask: 0x08, tag: "TRANS",  name: "ACTV_TRN",   tone: "trans", desc: "Bit 3 (0x08): Đang xử lý/vừa xử lý Det_ReportTransientFault() [SID 0x05] — có thể trả E_OK/E_NOT_OK (SWS_Det_00502)." },
  { bit: 2, mask: 0x04, tag: "DLT",    name: "DLT_FWD",    tone: "info",  desc: "Bit 2 (0x04): DetForwardToDlt=TRUE đã đẩy gói 4-Tuple sang Dlt_DetForwardErrorTrace() (chỉ Dev & Runtime, KHÔNG Transient)." },
  { bit: 1, mask: 0x02, tag: "OVF",    name: "BUF_OVF",    tone: "warn",  desc: "Bit 1 (0x02): Det_ErrorBuffer[DetErrorBufferSize] đã đầy — FIFO ghi đè hoặc Stop-On-Full khóa slot mới." },
  { bit: 0, mask: 0x01, tag: "HALT",   name: "HALT_LP",    tone: "err",   desc: "Bit 0 (0x01): CPU đang treo trong while(det_halt) / __BKPT(0) do Dev Error hoặc Breakpoint Filter! Nhấn Break Endless Loop để thoát." }
];

const DET_PIPELINE_BITS = [
  { bit: 7, mask: 0x80, tag: "RTE",    name: "VIA_RTE",    tone: "info",  desc: "Bit 7 (0x80): Lỗi bắt nguồn từ SWC Application thông qua RTE DETService Port (PDAV tự chèn ModuleId >= 2048)." },
  { bit: 6, mask: 0x40, tag: "ISR",    name: "ISR_PRE",    tone: "warn",  desc: "Bit 6 (0x40): Lỗi xảy ra trong ngữ cảnh ISR_CanRx (Cat-2 Interrupt) hoặc preemption giữa Task và ISR." },
  { bit: 5, mask: 0x20, tag: "DEVDET", name: "DEV_ENA",    tone: "ok",    desc: "Bit 5 (0x20): CallerDevErrorDetect == STD_ON (Build Phát triển). Khi Tắt (Production), các macro gọi 0x01 ở Caller bị lược bỏ." },
  { bit: 4, mask: 0x10, tag: "HOOK",   name: "HOOK_OK",    tone: "info",  desc: "Bit 4 (0x10): Ít nhất một DetErrorHook[] hoặc Runtime/Transient Callout đã thực thi (SWS_Det_00014, 00018)." },
  { bit: 3, mask: 0x08, tag: "GLBFLT", name: "GLB_FLT",    tone: "warn",  desc: "Bit 3 (0x08): Gói 4-Tuple khớp DetGlobalFilterRule -> bị chặn ghi vào RAM Ring Buffer / DLT (vẫn chạy Hook tùy cấu hình)." },
  { bit: 2, mask: 0x04, tag: "BRKFLT", name: "BRK_FLT",    tone: "err",   desc: "Bit 2 (0x04): Gói 4-Tuple khớp DetBreakpointFilterRule -> kích hoạt halt / __BKPT(0) ngay cả khi lỗi khác không dừng." },
  { bit: 1, mask: 0x02, tag: "FLTRET", name: "FLT_REJ",    tone: "err",   desc: "Bit 1 (0x02): DetReportTransientFaultCallout trả về khác E_OK (vd E_NOT_OK = 0x01) -> báo caller không phục hồi được (SWS_Det_00503)." },
  { bit: 0, mask: 0x01, tag: "SELF",   name: "SELF_ERR",   tone: "err",   desc: "Bit 0 (0x01): Self-reporting! Det_GetVersionInfo(NULL_PTR) tự gọi Det_ReportError(15, 0, 0x03, DET_E_PARAM_POINTER=0x01) (SWS_Det_00028)." }
];

const MODULE_DICT = {
  10:   { name: "EcuM",          layer: "BSW" },
  12:   { name: "ComM",          layer: "BSW" },
  13:   { name: "WdgM",          layer: "BSW" },
  15:   { name: "Det",           layer: "BSW" },
  20:   { name: "NvM",           layer: "BSW" },
  42:   { name: "BswM",          layer: "BSW" },
  54:   { name: "Dem",           layer: "BSW" },
  55:   { name: "Dlt",           layer: "BSW" },
  60:   { name: "CanIf",         layer: "BSW" },
  83:   { name: "Spi",           layer: "MCAL" },
  92:   { name: "Fls",           layer: "MCAL" },
  120:  { name: "Dio",           layer: "MCAL" },
  123:  { name: "Adc",           layer: "MCAL" },
  2048: { name: "SWC_BrakeCtrl", layer: "SWC" },
  2049: { name: "SWC_DiagApp",   layer: "SWC" }
};

const API_DICT = {
  "10:0":   "EcuM_GoDownHaltPoll()",
  "12:3":   "ComM_RequestComMode()",
  "13:7":   "WdgM_CheckpointReached()",
  "15:0":   "Det_Init()",
  "15:1":   "Det_ReportError()",
  "15:2":   "Det_Start()",
  "15:3":   "Det_GetVersionInfo()",
  "15:4":   "Det_ReportRuntimeError()",
  "15:5":   "Det_ReportTransientFault()",
  "20:6":   "NvM_ReadBlock()",
  "20:7":   "NvM_WriteBlock()",
  "20:14":  "NvM_MainFunction()",
  "42:0":   "BswM_Init()",
  "60:1":   "CanIf_Init()",
  "60:5":   "CanIf_Transmit()",
  "60:20":  "CanIf_RxIndication()",
  "83:2":   "Spi_SyncTransmit()",
  "92:1":   "Fls_Erase()",
  "92:2":   "Fls_Write()",
  "92:7":   "Fls_Read()",
  "2048:0": "DETService.ReportError()",
  "2048:1": "SWC_BrakeCtrl_10ms()",
  "2049:0": "DETService.ReportRuntimeError()"
};

const ERROR_DICT = {
  "12:17":  "COMM_E_PARAM_CHANNEL (0x11)",
  "13:18":  "WDGM_E_INV_POINTER (0x12)",
  "15:1":   "DET_E_PARAM_POINTER (0x01)",
  "20:10":  "NVM_E_PARAM_BLOCK_ID (0x0A) / Demo 0x15",
  "20:21":  "NVM_E_PARAM_BLOCK_ID (0x15)",
  "20:26":  "NVM_E_QUEUE_FULL (0x1A)",
  "42:1":   "BSWM_E_PARAM_CONFIG (0x01)",
  "60:1":   "CANIF_E_PARAM_CANID (0x01)",
  "60:5":   "CANIF_E_PARAM_POINTER (0x05)",
  "60:17":  "CANIF_E_INVALID_TXPDUID / Demo 0x11",
  "60:30":  "CANIF_E_UNINIT (0x1E)",
  "83:10":  "SPI_E_HARDWARE_ERROR (0x0A)",
  "83:17":  "SPI_E_SEQ_PENDING / BUSY (0x11)",
  "92:1":   "FLS_E_PARAM_CONFIG (0x01)",
  "92:3":   "FLS_E_PARAM_LENGTH (0x03)",
  "92:10":  "FLS_E_BUSY (0x0A)",
  "92:17":  "FLS_E_COMPARE_FAILED / ECC (0x11)",
  "92:24":  "FLS_E_ERASE_FAILED (0x18)",
  "2048:1": "SWC_E_PLAUSIBILITY_FAIL (0x01)",
  "2048:2": "SWC_E_WHEEL_SPD_RANGE (0x02)",
  "2049:5": "SWC_E_DIAG_SESSION_TIMEOUT (0x05)"
};

// Exact 36 ECUC Tooltip Definitions (DEM-style: title, ecucPath, sws, desc, range, typical, notes)
const configTooltipData = {
  DetInitialized: {
    title: "DetInitialized (Runtime State)",
    ecucPath: "/AUTOSAR/EcucDefs/Det/DetGeneral [Runtime State Flag]",
    sws: "SWS_Det_00019 / SWS_Det_00204",
    desc: "Trạng thái đã gọi Det_Init(NULL_PTR). Theo SWS_Det_00204, nếu bất kỳ Caller nào gọi Det_ReportError trước khi Det_Init chạy, Det không được ghi rác vào RAM hoặc gây crash.",
    range: "TRUE | FALSE (Runtime)",
    typical: "TRUE (sau EcuM_AL_DriverInitZero)",
    notes: "Tắt cờ này để mô phỏng lỗi gọi BSW trước khi Det_Init() hoàn tất."
  },
  DetStarted: {
    title: "DetStarted (Runtime State)",
    ecucPath: "/AUTOSAR/EcucDefs/Det/DetGeneral [Det_Start() Active]",
    sws: "SWS_Det_00025",
    desc: "Cờ kích hoạt sau khi Det_Start() được EcuM_StartupTwo() gọi. Cho phép hệ thống chính thức tiếp nhận và xuất log qua DLT / Callouts trong vận hành bình thường.",
    range: "TRUE | FALSE (Runtime)",
    typical: "TRUE (sau StartupTwo)",
    notes: "Ở một số vendor BSW, buffer trước Det_Start() chỉ đọng tạm trong PreInit RAM hoặc bỏ qua."
  },
  DetVersionInfoApi: {
    title: "DetVersionInfoApi",
    ecucPath: "/AUTOSAR/EcucDefs/Det/DetGeneral/DetVersionInfoApi",
    sws: "ECUC_Det_00003 / SWS_Det_00028",
    desc: "Bật/tắt API Det_GetVersionInfo(Std_VersionInfoType* versioninfo) tại compile-time.",
    range: "TRUE | FALSE",
    typical: "TRUE (Dev/Integration) | FALSE (Save ROM)",
    notes: "Nếu bật và caller truyền NULL_PTR, Det tự gọi Det_ReportError(15, 0, 0x03, DET_E_PARAM_POINTER=0x01)!"
  },
  DetReportRuntimeErrorCalloutEnabled: {
    title: "DetReportRuntimeErrorCalloutEnabled",
    ecucPath: "/AUTOSAR/EcucDefs/Det/DetNotification/DetReportRuntimeErrorCallout",
    sws: "ECUC_Det_00008 / SWS_Det_00501",
    desc: "Cho phép Det gọi mảng hàm DetReportRuntimeErrorCallout[] khi có Det_ReportRuntimeError (SID 0x04). Luôn khả dụng cả bản Production.",
    range: "TRUE | FALSE",
    typical: "TRUE",
    notes: "Runtime Error KHÔNG kích hoạt DetEndlessLoop ngay cả khi bật Halt ở Dev Error."
  },
  DetReportTransientFaultCalloutEnabled: {
    title: "DetReportTransientFaultCalloutEnabled",
    ecucPath: "/AUTOSAR/EcucDefs/Det/DetNotification/DetReportTransientFaultCallout",
    sws: "ECUC_Det_00009 / SWS_Det_00502",
    desc: "Cho phép Det gọi mảng hàm DetReportTransientFaultCallout[] khi MCAL/Driver báo Det_ReportTransientFault (SID 0x05).",
    range: "TRUE | FALSE",
    typical: "TRUE",
    notes: "Khác với 0x01 và 0x04, Return value của Callout này quyết định Det trả E_OK hay E_NOT_OK về cho Driver."
  },
  EcuBuildProfile: {
    title: "EcuBuildProfile (System Build Preset)",
    ecucPath: "/AUTOSAR/System/BuildProfile [Simulation Preset]",
    sws: "AUTOSAR Methodology",
    desc: "Preset cấu hình nhanh cho toàn ECU: DEV_DEBUG_BUILD (bật toàn bộ Dev + Loop + DLT), INTEGRATION_TEST_BUILD (bật Dev + Hooks, tắt treo CPU), PRODUCTION_SERIES_BUILD (tắt CallerDevErrorDetect, chỉ giữ Runtime & Transient).",
    range: "DEV_DEBUG_BUILD | INTEGRATION_TEST_BUILD | PRODUCTION_SERIES_BUILD",
    typical: "DEV_DEBUG_BUILD (trong lab) / PRODUCTION_SERIES_BUILD (xe thương mại)",
    notes: "Khi chọn PRODUCTION_SERIES_BUILD, simulator tự động đồng bộ các cờ phù hợp bản Production."
  },
  CallerDevErrorDetect: {
    title: "CallerDevErrorDetect (<Mod>DevErrorDetect)",
    ecucPath: "/AUTOSAR/EcucDefs/<Module>/<Module>General/<Mod>DevErrorDetect",
    sws: "SWS_BSW_00049 / ECUC_Det",
    desc: "Công tắc tiền xử lý (#if <MOD>_DEV_ERROR_DETECT == STD_ON) nằm ở phía Caller (NvM, CanIf, WdgM...). Khi OFF, Caller không biên dịch nhánh kiểm tra tham số và không bao giờ gọi Det_ReportError (0x01).",
    range: "STD_ON (TRUE) | STD_OFF (FALSE)",
    typical: "TRUE (Dev) | FALSE (Production Series)",
    notes: "Không ảnh hưởng tới Runtime Error (0x04) và Transient Fault (0x05) — hai luồng này luôn sống ở Production."
  },
  DetEndlessLoopInDevError: {
    title: "DetEndlessLoopInDevError",
    ecucPath: "/AUTOSAR/EcucDefs/Det/DetGeneral [Vendor Halt Extension]",
    sws: "SWS_Det_00039 / Debugger Integration",
    desc: "Sau khi chạy hết Hook/DLT/Buffer cho Dev Error (0x01), Det giữ CPU trong vòng lặp vô tận while(det_halt) để kỹ sư dùng JTAG/Trace32 bắt Call Stack ngay tại hiện trường.",
    range: "TRUE | FALSE",
    typical: "TRUE (Bench Debug) | FALSE (HIL / Road Test / Production)",
    notes: "Tuyệt đối KHÔNG dùng cho Runtime Error (0x04) hoặc Transient Fault (0x05) vì sẽ làm WdgM reset ECU!"
  },
  TriggerHardwareBkptInstruction: {
    title: "TriggerHardwareBkptInstruction (__BKPT(0))",
    ecucPath: "/AUTOSAR/EcucDefs/Det/DetGeneral [ARM/TriCore Breakpoint]",
    sws: "Debugger Hook Extension",
    desc: "Chèn lệnh assembly __BKPT(0) / debug trước vòng lặp vô tận khi Dev Error hoặc Breakpoint Filter khớp.",
    range: "TRUE | FALSE",
    typical: "TRUE (Lauterbach Trace32 attached)",
    notes: "Nếu bật mà không cắm JTAG, chip có thể nhảy vào DebugMonitor/HardFault exception."
  },
  ProtectReentrancyWithSchM: {
    title: "ProtectReentrancyWithSchM",
    ecucPath: "/AUTOSAR/EcucDefs/Det/DetGeneral [Exclusive Area]",
    sws: "SWS_Det_00039 / SWS_Det_00180",
    desc: "Bảo vệ Ring Buffer WriteIdx và bộ đếm bằng SchM_Enter_Det_DET_EXCLUSIVE_AREA_0() (Disable Interrupts ngắn) để ISR_CanRx không đè hỏng dữ liệu của Task_10ms.",
    range: "TRUE | FALSE",
    typical: "TRUE (Bắt buộc trong hệ thống multi-task/ISR)",
    notes: "Tắt cờ này ở Kịch bản S10 để quan sát lỗi Race Condition xé đôi 4-Tuple!"
  },
  PreventRecursiveHookCall: {
    title: "PreventRecursiveHookCall (Anti-Recursion)",
    ecucPath: "/AUTOSAR/EcucDefs/Det/DetGeneral [Recursion Guard]",
    sws: "SWS_Det_00018 / SWS_Det_00180",
    desc: "Cờ ngăn đệ quy vô tận nếu chính một hàm DetErrorHook gọi API BSW bị lỗi dẫn đến lại gọi ngược Det_ReportError().",
    range: "TRUE | FALSE",
    typical: "TRUE (Safety Critical)",
    notes: "Nếu FALSE và Hook gây lỗi, Stack Overflow sẽ đánh sập ECU sau vài micro-giây."
  },
  MaxHookExecutionTimeUs: {
    title: "MaxHookExecutionTimeUs",
    ecucPath: "/AUTOSAR/EcucDefs/Det/DetGeneral [Timing Budget]",
    sws: "ISO 26262 Timing Guard",
    desc: "Ngưỡng thời gian tối đa (micro-giây) cho phép toàn bộ chuỗi Hook thực thi trong vùng khóa ngắt SchM Exclusive Area.",
    range: "1 .. 5000 us",
    typical: "50 us",
    notes: "Vượt ngưỡng này trong Exclusive Area dễ gây trượt jitter cho CAN/FlexRay ISR."
  },
  LogRuntimeErrorsToBuffer: {
    title: "LogRuntimeErrorsToBuffer",
    ecucPath: "/AUTOSAR/EcucDefs/Det/DetGeneral [RAM Buffer Runtime Logging]",
    sws: "SWS_Det_00501",
    desc: "Cho phép lưu bản sao gói 4-Tuple của Det_ReportRuntimeError (0x04) vào Det_ErrorBuffer[] RAM ngoài việc gọi Callout và DLT.",
    range: "TRUE | FALSE",
    typical: "TRUE",
    notes: "Giúp đọc lại lịch sử nghẽn queue/timeout ngay trên RAM dump sau test đường trường."
  },
  LogTransientFaultsToBuffer: {
    title: "LogTransientFaultsToBuffer",
    ecucPath: "/AUTOSAR/EcucDefs/Det/DetGeneral [RAM Buffer Transient Logging]",
    sws: "SWS_Det_00502",
    desc: "Cho phép lưu sự kiện Det_ReportTransientFault (0x05) từ MCAL (Fls/Spi ECC/Noise) vào Det_ErrorBuffer[] RAM.",
    range: "TRUE | FALSE",
    typical: "TRUE",
    notes: "Dù lưu RAM buffer, Transient Fault vẫn KHÔNG gửi sang Dlt_DetForwardErrorTrace()."
  },
  TransientFaultRecoveryPolicy: {
    title: "TransientFaultRecoveryPolicy",
    ecucPath: "/AUTOSAR/EcucDefs/Det/DetNotification [Callout Return Policy]",
    sws: "SWS_Det_00502 / SWS_Det_00503",
    desc: "Mô phỏng kết quả trả về từ DetReportTransientFaultCallout(): AUTO_CORRECT (E_OK), FAIL_UNCORRECTABLE (E_NOT_OK -> leo thang DEM), hoặc CUSTOM_VENDOR_RETURN_CODE.",
    range: "AUTO_CORRECT_AND_RETURN_E_OK | FAIL_UNCORRECTABLE_RETURN_E_NOT_OK | CUSTOM_VENDOR_RETURN_CODE",
    typical: "AUTO_CORRECT_AND_RETURN_E_OK",
    notes: "Khi trả về E_NOT_OK, MCAL Driver sẽ ngừng retry và báo lỗi phần cứng lên DEM/NvM."
  },
  MaxTransientFaultRetries: {
    title: "MaxTransientFaultRetries",
    ecucPath: "/AUTOSAR/EcucDefs/Det/DetGeneral [Driver Retry Hint]",
    sws: "SWS_Det_00503 / MCAL Integration",
    desc: "Số lần thử lại tối đa trước khi chính sách leo thang chuyển từ E_OK sang E_NOT_OK để báo lên DEM.",
    range: "0 .. 10",
    typical: "3",
    notes: "Giúp phân biệt nhiễu nhất thời (transient ECC) với hư hỏng phần cứng vĩnh viễn."
  },
  EnableSideBySideDemComparison: {
    title: "EnableSideBySideDemComparison",
    ecucPath: "/AUTOSAR/EcucDefs/Det [Diagnostics Boundary Helper]",
    sws: "AUTOSAR Layered Architecture (Det vs Dem)",
    desc: "Hiển thị bảng so sánh đối xứng DET vs DEM ngay trong Module Inspector và ghi chú tuyến leo thang DEM/NvM/UDS 0x19 cho từng sự kiện.",
    range: "TRUE | FALSE",
    typical: "TRUE (Learning / Architecture Review)",
    notes: "Det KHÔNG lưu NvM và KHÔNG tạo DTC; chỉ DEM mới quản lý DTC, Debounce và UDS ReadDTC."
  },
  SaveCrashCrumbToNoInitRam: {
    title: "SaveCrashCrumbToNoInitRam",
    ecucPath: "/AUTOSAR/EcucDefs/Det/DetGeneral [NoInit RAM Integration]",
    sws: "SWS_Det_00014 Hook Pattern",
    desc: "Hook ghi dấu 4-Tuple cuối cùng vào vùng .noinit RAM (tồn tại qua Soft Reset / Watchdog Reset) trước khi CPU treo hoặc reset.",
    range: "TRUE | FALSE",
    typical: "TRUE (Production Field Analysis)",
    notes: "Thay thế nhu cầu DLT khi ECU chạy thực tế trên xe không cắm máy tính."
  },
  DetForwardToDlt: {
    title: "DetForwardToDlt",
    ecucPath: "/AUTOSAR/EcucDefs/Det/DetGeneral/DetForwardToDlt",
    sws: "ECUC_Det_00004 / SWS_Det_00211",
    desc: "Bật chuyển tiếp gói lỗi từ Det sang DLT qua API Dlt_DetForwardErrorTrace(ModuleId, InstanceId, ApiId, ErrorId).",
    range: "TRUE | FALSE",
    typical: "TRUE (khi ECU có DLT over CAN/Ethernet)",
    notes: "Theo SWS_Det_00211: chỉ forward Det_ReportError (0x01) và Det_ReportRuntimeError (0x04), KHÔNG forward Transient Fault (0x05)."
  },
  DltAppIdAndContextId: {
    title: "DltAppIdAndContextId",
    ecucPath: "/AUTOSAR/EcucDefs/Dlt/DltSwcSupport [Det Mapping]",
    sws: "SWS_Dlt_00432",
    desc: "Mã 4 ký tự AppId / ContextId mà DLT gắn vào frame log trước khi truyền qua PduR xuống CAN/DoIP tới PC Tool.",
    range: "String (AppId/CtxId)",
    typical: "DET / ERRS",
    notes: "Hiển thị trực tiếp trên PC DLT Viewer cùng dấu thời gian ECU."
  },
  DetErrorHook_0_Enabled: {
    title: "DetErrorHook_0 (DebuggerHook)",
    ecucPath: "/AUTOSAR/EcucDefs/Det/DetNotification/DetErrorHook[0]",
    sws: "ECUC_Det_00005 / SWS_Det_00014",
    desc: "Hàm callback tùy biến #0 được gọi mỗi khi Det_ReportError (0x01) nhận lỗi (nếu không bị Global Filter chặn).",
    range: "TRUE | FALSE",
    typical: "TRUE",
    notes: "Thường dùng để dừng phần cứng an toàn, bật LED báo lỗi hoặc ghi NoInit RAM."
  },
  DetErrorHook_1_Enabled: {
    title: "DetErrorHook_1 (SafetyLoggerHook)",
    ecucPath: "/AUTOSAR/EcucDefs/Det/DetNotification/DetErrorHook[1]",
    sws: "ECUC_Det_00005 / SWS_Det_00014",
    desc: "Hàm callback #1 chạy tuần tự ngay sau DetErrorHook_0 trong cùng vòng lặp thông báo Dev Error.",
    range: "TRUE | FALSE",
    typical: "TRUE",
    notes: "Tất cả Hook chạy đồng bộ trước khi Det trả E_OK hoặc vào endless loop."
  },
  DetRuntimeErrorCallout_0_Enabled: {
    title: "DetRuntimeErrorCallout_0",
    ecucPath: "/AUTOSAR/EcucDefs/Det/DetNotification/DetReportRuntimeErrorCallout[0]",
    sws: "ECUC_Det_00008 / SWS_Det_00501",
    desc: "Hàm Callout #0 dành riêng cho Runtime Error (0x04), cho phép giám sát tải queue CAN/NvM hoặc kích hoạt chẩn đoán hệ thống.",
    range: "TRUE | FALSE",
    typical: "TRUE",
    notes: "Tách biệt hoàn toàn khỏi danh sách DetErrorHook của Dev Error."
  },
  DetTransientFaultCallout_0_Enabled: {
    title: "DetTransientFaultCallout_0",
    ecucPath: "/AUTOSAR/EcucDefs/Det/DetNotification/DetReportTransientFaultCallout[0]",
    sws: "ECUC_Det_00009 / SWS_Det_00502",
    desc: "Hàm Callout #0 dành riêng cho Transient Fault (0x05). Hàm này trả Std_ReturnType cho biết lỗi tạm thời có khắc phục được hay không.",
    range: "TRUE | FALSE",
    typical: "TRUE",
    notes: "Nếu Callout bị tắt (FALSE), Det mặc định trả E_OK."
  },
  DetErrorBufferSize: {
    title: "DetErrorBufferSize",
    ecucPath: "/AUTOSAR/EcucDefs/Det/DetGeneral [Ring Buffer Depth]",
    sws: "Vendor Buffer Config",
    desc: "Số phần tử (slots) tối đa của mảng RAM Det_ErrorBuffer[] trong trình mô phỏng (1..8 slots).",
    range: "1 .. 8 slots",
    typical: "8 slots",
    notes: "Đặt xuống 3 hoặc 4 ở Kịch bản S9 để nhanh chóng quan sát hiện tượng tràn Ring Buffer."
  },
  DetBufferOverflowMode: {
    title: "DetBufferOverflowMode",
    ecucPath: "/AUTOSAR/EcucDefs/Det/DetGeneral [Overflow Policy]",
    sws: "Debug Buffer Strategy",
    desc: "Chính sách khi số lỗi vượt DetErrorBufferSize: FIFO_OVERWRITE_OLDEST (luôn giữ N lỗi mới nhất) hoặc STOP_ON_FULL_KEEP_FIRST (khóa buffer để bảo vệ Root-Cause đầu tiên!).",
    range: "FIFO_OVERWRITE_OLDEST | STOP_ON_FULL_KEEP_FIRST",
    typical: "STOP_ON_FULL_KEEP_FIRST (cho Root Cause) / FIFO (cho Stream)",
    notes: "Rất quan trọng khi một lỗi gốc kéo theo bão 50 lỗi hệ quả phía sau!"
  },
  DetGlobalFilterEnabled: {
    title: "DetGlobalFilterEnabled",
    ecucPath: "/AUTOSAR/EcucDefs/Det/DetGeneral [Global Filter Switch]",
    sws: "Debug Filtering Extension",
    desc: "Bật bộ lọc Global Filter để bỏ qua (chặn ghi Buffer / DLT) các cặp lỗi biết trước vô hại đang gây nhiễu trong quá trình tích hợp.",
    range: "TRUE | FALSE",
    typical: "FALSE (Default) | TRUE (khi Debug storm)",
    notes: "Khớp rule sẽ bật Bit 3 (GLB_FLT) trên Thanh B."
  },
  DetGlobalFilterRule: {
    title: "DetGlobalFilterRule (Mod:Err)",
    ecucPath: "/AUTOSAR/EcucDefs/Det/DetGeneral [Global Filter Pattern]",
    sws: "Filter Expression",
    desc: "Luật khớp theo định dạng ModuleId:ErrorId (ví dụ '60:0x05' hoặc '60:*' để lọc lỗi CanIf_Transmit busy). Có thể dùng '*' làm wildcard.",
    range: "ModId:ErrId (vd '60:0x05', '60:*')",
    typical: "60:0x05",
    notes: "Chỉ lọc phần ghi RAM Buffer & DLT, Hook có thể tùy cấu hình nhưng ở đây mô phỏng chặn nhiễu Buffer."
  },
  DetBreakpointFilterEnabled: {
    title: "DetBreakpointFilterEnabled",
    ecucPath: "/AUTOSAR/EcucDefs/Det/DetGeneral [Breakpoint Filter Switch]",
    sws: "Debugger Breakpoint Extension",
    desc: "Bật Breakpoint Filter để chỉ dừng CPU (halt) khi đúng ModuleId/ErrorId mục tiêu xuất hiện, tránh dừng nhầm ở các lỗi khác.",
    range: "TRUE | FALSE",
    typical: "TRUE (Target Debug)",
    notes: "Ngay cả khi DetEndlessLoopInDevError=FALSE, nếu BreakpointFilter khớp gói lỗi Dev Error, CPU vẫn dừng đúng điểm cần bắt!"
  },
  DetBreakpointFilterRule: {
    title: "DetBreakpointFilterRule (Mod:Err)",
    ecucPath: "/AUTOSAR/EcucDefs/Det/DetGeneral [Breakpoint Pattern]",
    sws: "Filter Expression",
    desc: "Luật khớp Breakpoint dạng ModuleId:ErrorId (vd '20:0x15' để bẫy đúng lỗi NVM_E_PARAM_BLOCK_ID).",
    range: "ModId:ErrId (vd '20:0x15', '15:0x01')",
    typical: "20:0x15",
    notes: "Hỗ trợ số thập phân hoặc hex 0x.. cho cả ModuleId và ErrorId."
  },
  SwcBrake_DetPortEnabled: {
    title: "SwcBrake_DetPortEnabled",
    ecucPath: "/AUTOSAR/EcucDefs/Det/DetConfigSet/DetServicePort [SWC_BrakeCtrl]",
    sws: "SWS_Det_00003 / SWS_Det_00210",
    desc: "Bật cổng Service R-Port DETService trên SWC_BrakeCtrl để ứng dụng báo cáo lỗi trực tiếp qua RTE thay vì gọi trực tiếp BSW Det_ReportError().",
    range: "TRUE | FALSE",
    typical: "TRUE",
    notes: "Nếu FALSE, RTE chặn lệnh gọi từ SWC_BrakeCtrl (cổng Service không nối)."
  },
  SwcBrake_DetModuleId: {
    title: "SwcBrake_DetModuleId (PDAV)",
    ecucPath: "/AUTOSAR/EcucDefs/Rte/RteSwComponentInstance/PDAV [ModuleId]",
    sws: "SWS_Det_00210 (Port-Defined Argument Value)",
    desc: "ModuleId do RTE tự động chèn (Port-Defined Argument Value) khi SWC_BrakeCtrl gọi Rte_Call_DETService_ReportError(Inst, Api, Err). SWC không cần tự truyền ModuleId!",
    range: "2048 .. 65535 (SWC Range)",
    typical: "2048 (0x0800)",
    notes: "Đảm bảo không SWC nào mạo danh ModuleId của NvM (20) hay CanIf (60)."
  },
  SwcBrake_DefaultInstanceId: {
    title: "SwcBrake_DefaultInstanceId",
    ecucPath: "/AUTOSAR/EcucDefs/Det/DetConfigSet/DetServicePort [InstanceId]",
    sws: "SWS_Det_00003",
    desc: "InstanceId của SWC_BrakeCtrl (vd 0 = Front Axle Controller, 1 = Rear Axle Controller).",
    range: "0 .. 255",
    typical: "0",
    notes: "Giúp phân biệt cùng một mã SWC đang chạy ở nhiều kênh/trục khác nhau."
  },
  SwcDiag_DetPortEnabled: {
    title: "SwcDiag_DetPortEnabled",
    ecucPath: "/AUTOSAR/EcucDefs/Det/DetConfigSet/DetServicePort [SWC_DiagApp]",
    sws: "SWS_Det_00003 / SWS_Det_00501",
    desc: "Bật cổng Service DETService cho SWC_DiagApp (hỗ trợ cả ReportError 0x01 và ReportRuntimeError 0x04 từ Application layer).",
    range: "TRUE | FALSE",
    typical: "TRUE",
    notes: "Cho phép SWC báo Runtime Error ngay cả trên xe Production."
  },
  SwcDiag_DetModuleId: {
    title: "SwcDiag_DetModuleId (PDAV)",
    ecucPath: "/AUTOSAR/EcucDefs/Rte/RteSwComponentInstance/PDAV [ModuleId]",
    sws: "SWS_Det_00210",
    desc: "ModuleId tự động do RTE chèn cho SWC_DiagApp (mặc định 2049 = 0x0801).",
    range: "2048 .. 65535",
    typical: "2049 (0x0801)",
    notes: "Mọi gói lỗi xuất phát từ SWC qua RTE đều bật Bit 7 (VIA_RTE) trên Thanh B."
  },
  CustomInject4Tuple: {
    title: "CustomInject4Tuple Preset",
    ecucPath: "/Simulator/QuickAction [Custom 4-Tuple]",
    sws: "4-Tuple Format (Mod, Inst, Api, Err)",
    desc: "Chuỗi 4-Tuple mặc định (ModuleId,InstanceId,ApiId,ErrorId) để nạp nhanh vào bộ Custom Injector.",
    range: "Mod,Inst,Api,Err (comma-separated)",
    typical: "60,0,0x05,0x11",
    notes: "Có thể nhập dạng hex 0x.. hoặc dec trực tiếp trong Custom Injector ở Quick Action Bar."
  }
};

// Exact 10 Interactive Modules Info (Inspection Tab 2 + SVG Architecture clicks)
const MODULES_INFO = {
  MOD_SWC: {
    name: "SWC Layer (SWC_BrakeCtrl / SWC_DiagApp)",
    moduleId: "2048 (0x0800) / 2049 (0x0801)",
    role: "Application Layer Caller (Cảnh báo qua RTE Service Port)",
    purpose: "Các Software Component không được phép #include \"Det.h\" trực tiếp trong mô hình AUTOSAR chuẩn. Thay vào đó chúng báo lỗi logic hoặc runtime thông qua R-Port Service DETService.",
    inputs: "Giá trị cảm biến lỗi, tín hiệu bất hợp lý (Plausibility fail), timeout phiên chẩn đoán từ các Runnable 10ms.",
    internalLogic: "Gọi Rte_Call_DETService_ReportError(InstanceId, ApiId, ErrorId) hoặc Rte_Call_DETService_ReportRuntimeError(). Chỉ truyền 3 tham số (KHÔNG tự truyền ModuleId).",
    outputs: "Chuyển tiếp yêu cầu tới RTE (MOD_RTE).",
    configImpact: "SwcBrake_DetPortEnabled, SwcDiag_DetPortEnabled, SwcBrake_DefaultInstanceId.",
    swsRefs: "SWS_Det_00003, SWS_Det_00210"
  },
  MOD_RTE: {
    name: "RTE — Runtime Environment (DETService & PDAV)",
    moduleId: "N/A (Middleware Binder)",
    role: "Biên dịch & Chèn Port-Defined Argument Value (PDAV)",
    purpose: "Làm cầu nối Service Interface giữa Application Layer (SWC) và Services Layer (Det), đảm bảo tính độc lập phần mềm và bảo mật định danh ModuleId.",
    inputs: "3 tham số (InstanceId, ApiId, ErrorId) từ Rte_Call_DETService_* của SWC.",
    internalLogic: "Tra bảng ánh xạ Port-Defined Argument Value (PDAV) của từng SWC Instance để tự động chèn uint16 ModuleId (>= 2048), biến cuộc gọi 3 tham số thành chuẩn 4-Tuple.",
    outputs: "Gọi trực tiếp Det_ReportError(ModuleId, InstanceId, ApiId, ErrorId) hoặc Det_ReportRuntimeError(...) trên MOD_DET.",
    configImpact: "SwcBrake_DetModuleId, SwcDiag_DetModuleId.",
    swsRefs: "SWS_Det_00210, SWS_Rte_01234"
  },
  MOD_BSW: {
    name: "BSW Modules (NvM, CanIf, WdgM, ComM, BswM)",
    moduleId: "20 (NvM), 60 (CanIf), 13 (WdgM), 12 (ComM), 42 (BswM)",
    role: "Basic Software Services / ECU Abstraction Callers",
    purpose: "Kiểm tra tham số đầu vào (con trỏ NULL, ID vượt dải, chưa Init) ở mức phát triển (0x01) và báo sự cố tài nguyên/queue khi chạy thật (0x04).",
    inputs: "Lời gọi API từ ứng dụng hoặc các tầng BSW khác (ví dụ NvM_WriteBlock(99, ptr)).",
    internalLogic: "Với Dev Error: bọc trong #if (<MOD>_DEV_ERROR_DETECT == STD_ON). Với Runtime Error (ví dụ NVM_E_QUEUE_FULL): luôn gọi Det_ReportRuntimeError(0x04) kể cả khi bản Production tắt DevErrorDetect.",
    outputs: "Gọi trực tiếp Det_ReportError() [0x01] hoặc Det_ReportRuntimeError() [0x04].",
    configImpact: "CallerDevErrorDetect, EcuBuildProfile.",
    swsRefs: "SWS_BSW_00049, SWS_Det_00039, SWS_Det_00501"
  },
  MOD_MCAL: {
    name: "MCAL Drivers (Fls, Spi, Dio, Adc)",
    moduleId: "92 (Fls), 83 (Spi), 120 (Dio), 123 (Adc)",
    role: "Microcontroller Abstraction Layer & Transient Fault Source",
    purpose: "Giao tiếp thanh ghi phần cứng trực tiếp. Ngoài Dev Error (0x01) và Runtime Error (0x04), MCAL là nguồn chính phát sinh Transient Fault (0x05) như lỗi ECC Flash, nhiễu bus SPI, hoặc mất clock tạm thời.",
    inputs: "Trạng thái thanh ghi phần cứng, cờ ECC/CRC flash, timeout bus ngoại vi.",
    internalLogic: "Khi phát hiện lỗi nhất thời (transient hardware glitch), gọi Det_ReportTransientFault(ModuleId, InstanceId, ApiId, FaultId) và ĐỢI Std_ReturnType trả về để quyết định retry hay báo hỏng cứng.",
    outputs: "Gọi Det_ReportTransientFault() [0x05] -> nếu nhận E_NOT_OK có thể leo thang sang DEM.",
    configImpact: "TransientFaultRecoveryPolicy, MaxTransientFaultRetries.",
    swsRefs: "SWS_Det_00502, SWS_Det_00503"
  },
  MOD_ECUM: {
    name: "EcuM / BswM (ECU State Manager)",
    moduleId: "10 (EcuM) / 42 (BswM)",
    role: "Lifecycle Orchestrator (Khởi tạo Det sớm nhất có thể)",
    purpose: "Đảm bảo Det luôn được khởi tạo TRƯỚC tất cả các module BSW/MCAL khác trong pha EcuM_AL_DriverInitZero() để không bỏ sót lỗi khởi tạo sớm.",
    inputs: "Pha khởi động ECU (DriverInitZero -> OS Start -> StartupTwo).",
    internalLogic: "1) Gọi Det_Init(NULL_PTR) tại DriverInitZero (trước OS). 2) Gọi Det_Start() tại EcuM_StartupTwo (sau OS/DLT sẵn sàng).",
    outputs: "Chuyển State Machine SM1 từ DET_UNINIT -> DET_INIT -> DET_STARTED.",
    configImpact: "DetInitialized, DetStarted.",
    swsRefs: "SWS_Det_00019, SWS_Det_00025, SWS_Det_00204"
  },
  MOD_DET: {
    name: "Core Det Engine (Default Error Tracer)",
    moduleId: "15 (0x000F)",
    role: "Bộ điều phối 3 luồng lỗi tập trung & Bảo vệ hệ thống",
    purpose: "Tiếp nhận, phân loại và định tuyến 3 luồng lỗi riêng biệt (Dev 0x01, Runtime 0x04, Transient 0x05) tới Hook/Callout, DLT và RAM Ring Buffer trong môi trường đa nhiệm/ISR.",
    inputs: "Gói 4-Tuple (ModuleId, InstanceId, ApiId, ErrorId) + Ngữ cảnh Task/ISR.",
    internalLogic: "Kiểm tra DetInitialized -> Vào SchM Exclusive Area -> Chống đệ quy -> Kiểm tra Global Filter -> Chạy Hook/Callout tương ứng từng luồng -> Forward DLT (trừ Transient) -> Ghi Ring Buffer -> Breakpoint/Halt (chỉ Dev) hoặc Trả kết quả.",
    outputs: "MOD_HOOKS, MOD_DLT, MOD_BUFFER, MOD_DEBUG_DEM.",
    configImpact: "ProtectReentrancyWithSchM, PreventRecursiveHookCall, DetVersionInfoApi.",
    swsRefs: "SWS_Det_00014, SWS_Det_00028, SWS_Det_00039, SWS_Det_00180, SWS_Det_00204, SWS_Det_00211, SWS_Det_00501, SWS_Det_00502"
  },
  MOD_HOOKS: {
    name: "DetErrorHook[] & Runtime/Transient Callouts",
    moduleId: "User/Integrator Callbacks",
    role: "Đầu ra mở rộng đồng bộ cho Nhà tích hợp (OEM/Tier-1)",
    purpose: "Cho phép OEM chèn logic xử lý lỗi tức thời: lưu biến vào .noinit RAM trước reset, bật cảnh báo, đếm thống kê hoặc phục hồi phần cứng.",
    inputs: "4-Tuple từ Core Det Engine khi không bị Global Filter chặn.",
    internalLogic: "DetErrorHook[] chạy cho 0x01; DetReportRuntimeErrorCallout[] chạy cho 0x04; DetReportTransientFaultCallout[] chạy cho 0x05 và trả về E_OK hoặc E_NOT_OK.",
    outputs: "NoInit RAM Crumb, giá trị phục hồi Std_ReturnType.",
    configImpact: "DetErrorHook_0_Enabled, DetErrorHook_1_Enabled, DetRuntimeErrorCallout_0_Enabled, DetTransientFaultCallout_0_Enabled, PreventRecursiveHookCall.",
    swsRefs: "SWS_Det_00014, SWS_Det_00018, SWS_Det_00501, SWS_Det_00503"
  },
  MOD_DLT: {
    name: "DLT — Diagnostic Log and Trace",
    moduleId: "55 (0x0037)",
    role: "Cổng phát log 4-Tuple ra PC Tool (CAN / Ethernet)",
    purpose: "Chuyển tiếp các gói Dev Error (0x01) và Runtime Error (0x04) qua bus truyền thông tới DLT Viewer kèm AppId/ContextId và Timestamp.",
    inputs: "Gói 4-Tuple từ Det qua API Dlt_DetForwardErrorTrace(ModuleId, InstanceId, ApiId, ErrorId).",
    internalLogic: "QUAN TRỌNG (SWS_Det_00211): Det CHỈ gọi Dlt_DetForwardErrorTrace cho Development Error và Runtime Error. Transient Fault (0x05) KHÔNG được đẩy sang API này để tránh làm nghẽn băng thông log bởi nhiễu nhất thời.",
    outputs: "Gói tin DLT frame gửi tới PduR -> CanTp/SoAd -> PC DLT Viewer.",
    configImpact: "DetForwardToDlt, DltAppIdAndContextId.",
    swsRefs: "SWS_Det_00211, SWS_Dlt_00432"
  },
  MOD_BUFFER: {
    name: "RAM Ring Buffer (Det_ErrorBuffer[8]) & Filters",
    moduleId: "Det Internal RAM",
    role: "Bộ đệm vòng RAM lưu lịch sử lỗi phục vụ Debug/Dump RAM",
    purpose: "Lưu vết 4-Tuple gần nhất hoặc đầu tiên ngay trong RAM ECU để đọc qua Lauterbach Trace32 / Watch Window.",
    inputs: "4-Tuple đã vượt qua DetGlobalFilterRule.",
    internalLogic: "Kiểm tra DetGlobalFilterRule (nếu khớp -> DROP khỏi buffer, bật Bit 3 GLB_FLT). Nếu vượt DetErrorBufferSize: chế độ FIFO_OVERWRITE_OLDEST ghi đè slot cũ; STOP_ON_FULL_KEEP_FIRST khóa buffer để giữ lỗi gốc đầu tiên (Root Cause).",
    outputs: "Cập nhật mảng Det_ErrorBuffer[] trong RAM và Thanh trạng thái Bit 1 (BUF_OVF).",
    configImpact: "DetErrorBufferSize, DetBufferOverflowMode, DetGlobalFilterEnabled, DetGlobalFilterRule.",
    swsRefs: "Debug Buffer Vendor Pattern"
  },
  MOD_DEBUG_DEM: {
    name: "Endless Loop / Debugger Breakpoint & DEM Boundary",
    moduleId: "CPU Halt / Dem (ModuleId 54)",
    role: "Ranh giới Debug (Halt) vs Chẩn đoán Sản phẩm (DEM/DTC)",
    purpose: "Tách bạch rõ ràng: (1) Nếu là lỗi lập trình Dev Error (0x01) trên bàn lab -> dừng CPU tại while(1)/__BKPT(0) để kỹ sư sửa code. (2) Nếu là lỗi phần cứng/vận hành thật (hoặc Transient trả E_NOT_OK) -> chuyển cho DEM ghi NvM DTC & phục vụ UDS 0x19.",
    inputs: "Dev Error với DetEndlessLoop/BreakpointFilter, hoặc lỗi phần cứng leo thang từ Caller/Transient E_NOT_OK.",
    internalLogic: "DET là 'Vết lỗi phát triển không lưu NvM'; DEM là 'Chẩn đoán lỗi hệ thống có Debounce, Aging, Snapshot/FreezeFrame, lưu NvM và đọc bằng UDS 0x19'.",
    outputs: "Treo CPU debug (chỉ Dev) hoặc Dem_SetEventStatus(EventId, DEM_EVENT_STATUS_FAILED).",
    configImpact: "DetEndlessLoopInDevError, TriggerHardwareBkptInstruction, DetBreakpointFilterEnabled, EnableSideBySideDemComparison.",
    swsRefs: "SWS_Det_00039, SWS_Dem_00100"
  }
};

// Exact 52 Abbreviations across 4 categories: CORE, CALLER, HOOK, SAFETY
const ABBREVIATIONS = [
  { abbr: "DET", full: "Default Error Tracer", cat: "CORE", desc: "Module Service (ModuleId 15) tiếp nhận và xử lý lỗi phát triển, lỗi runtime và lỗi nhất thời." },
  { abbr: "4-Tuple", full: "ModuleId, InstanceId, ApiId, ErrorId", cat: "CORE", desc: "Bộ 4 định danh chuẩn mọi API báo lỗi của Det đều mang theo để xác định chính xác vị trí lỗi." },
  { abbr: "ModuleId", full: "AUTOSAR Module Identifier (uint16)", cat: "CORE", desc: "Mã ID duy nhất của mỗi module (vd Det=15, NvM=20, CanIf=60, Fls=92, SWC>=2048)." },
  { abbr: "InstanceId", full: "Module Instance Identifier (uint8)", cat: "CORE", desc: "Chỉ số instance khi một module có nhiều kênh/bộ điều khiển (vd CanController 0 vs 1)." },
  { abbr: "ApiId", full: "API / Service Identifier (SID uint8)", cat: "CORE", desc: "Mã ID của hàm API đang chạy khi phát sinh lỗi (vd 0x00=Init, 0x01=ReportError, 0x07=NvM_WriteBlock)." },
  { abbr: "ErrorId", full: "Development / Runtime Error Code (uint8)", cat: "CORE", desc: "Mã nguyên nhân lỗi chi tiết do SWS từng module quy định (vd E_PARAM_POINTER, E_UNINIT)." },
  { abbr: "FaultId", full: "Transient Fault Identifier (uint8)", cat: "CORE", desc: "Mã lỗi phần cứng nhất thời truyền vào Det_ReportTransientFault() [SID 0x05]." },
  { abbr: "SWS", full: "Software Specification (SWS_Det)", cat: "CORE", desc: "Tài liệu đặc tả kỹ thuật chuẩn AUTOSAR Classic quy định hành vi và mã yêu cầu (SWS_Det_xxxxx)." },
  { abbr: "ECUC", full: "ECU Configuration Description", cat: "CORE", desc: "Mô tả tham số cấu hình ARXML dùng để sinh code Det_Cfg.h / Det_Cfg.c." },
  { abbr: "Det_Init", full: "DET Initialization API (SID 0x00)", cat: "CORE", desc: "Hàm khởi tạo Det trong EcuM_AL_DriverInitZero(), nhận ConfigPtr (thường NULL_PTR) và xóa sạch buffer." },
  { abbr: "Det_Start", full: "DET Start API (SID 0x02)", cat: "CORE", desc: "Hàm kích hoạt vận hành chính thức của Det được gọi bởi EcuM_StartupTwo() sau khi OS khởi chạy." },
  { abbr: "Det_GetVersionInfo", full: "Get Version Info API (SID 0x03)", cat: "CORE", desc: "Trả về VendorId, ModuleId và bản phát hành; tự báo DET_E_PARAM_POINTER (0x01) nếu truyền NULL_PTR." },
  { abbr: "DET_E_PARAM_POINTER", full: "Det Null Pointer Error (0x01)", cat: "CORE", desc: "Mã lỗi phát triển nội bộ duy nhất của module Det khi gọi Det_GetVersionInfo(NULL_PTR)." },
  { abbr: "DET_UNINIT", full: "Det Uninitialized State", cat: "CORE", desc: "Trạng thái trước khi Det_Init() chạy; mọi lời gọi Det phải được bảo vệ an toàn không crash RAM." },

  { abbr: "SWC", full: "Software Component", cat: "CALLER", desc: "Thành phần phần mềm tầng Application chạy trên RTE; gọi Det thông qua Service R-Port DETService." },
  { abbr: "RTE", full: "Runtime Environment", cat: "CALLER", desc: "Tầng trung gian nối SWC tới Det qua giao diện C/S và tự chèn ModuleId bằng PDAV." },
  { abbr: "PDAV", full: "Port-Defined Argument Value", cat: "CALLER", desc: "Tham số cố định cấu hình trên RTE Service Port giúp tự động chèn ModuleId (>=2048) cho SWC." },
  { abbr: "DETService", full: "AUTOSAR Standardized Client-Server Interface", cat: "CALLER", desc: "Giao diện Client-Server chuẩn hóa của Det cung cấp cho SWC gọi ReportError / ReportRuntimeError." },
  { abbr: "BSW", full: "Basic Software", cat: "CALLER", desc: "Các module phần mềm nền tảng như NvM, CanIf, ComM, WdgM, BswM, Dem, Dlt." },
  { abbr: "MCAL", full: "Microcontroller Abstraction Layer", cat: "CALLER", desc: "Tầng driver vi điều khiển (Fls, Spi, Dio, Adc), nguồn chính gọi Det_ReportTransientFault." },
  { abbr: "EcuM", full: "ECU State Manager", cat: "CALLER", desc: "Module quản lý khởi động/tắt ECU, chịu trách nhiệm gọi Det_Init() và Det_Start() đúng thứ tự." },
  { abbr: "NvM", full: "NVRAM Manager (ModuleId 20)", cat: "CALLER", desc: "Module quản lý bộ nhớ bất biến; hay báo NVM_E_PARAM_BLOCK_ID (0x15) và NVM_E_QUEUE_FULL (0x1A)." },
  { abbr: "CanIf", full: "CAN Interface (ModuleId 60)", cat: "CALLER", desc: "Module giao diện CAN; hay báo CANIF_E_UNINIT (0x1E) và CANIF_E_PARAM_POINTER (0x05)." },
  { abbr: "WdgM", full: "Watchdog Manager (ModuleId 13)", cat: "CALLER", desc: "Module giám sát thực thi checkpoint; báo WDGM_E_INV_POINTER (0x12) hoặc supervision fail." },
  { abbr: "ComM", full: "Communication Manager (ModuleId 12)", cat: "CALLER", desc: "Module quản lý kênh truyền thông; báo COMM_E_PARAM_CHANNEL (0x11) khi sai ChannelId." },
  { abbr: "BswM", full: "BSW Mode Manager (ModuleId 42)", cat: "CALLER", desc: "Module điều phối mode BSW; báo BSWM_E_PARAM_CONFIG (0x01) nếu config không hợp lệ." },
  { abbr: "Fls", full: "Flash Driver (ModuleId 92)", cat: "CALLER", desc: "MCAL Flash; ví dụ điển hình sử dụng cả 3 luồng: Dev (0x01), Runtime Busy (0x04) và ECC Transient (0x05)." },
  { abbr: "Spi", full: "Serial Peripheral Interface Driver (ModuleId 83)", cat: "CALLER", desc: "MCAL SPI; thường báo lỗi truyền bus nhất thời qua Det_ReportTransientFault." },

  { abbr: "Hook", full: "DetErrorHook[] Callback", cat: "HOOK", desc: "Mảng hàm callback do người dùng định nghĩa, được Det gọi đồng bộ khi có Development Error (0x01)." },
  { abbr: "Callout", full: "Runtime / Transient Callout Function", cat: "HOOK", desc: "Hàm thông báo dành cho Runtime Error (0x04) hoặc Transient Fault (0x05); Transient Callout có giá trị trả về." },
  { abbr: "DLT", full: "Diagnostic Log and Trace (ModuleId 55)", cat: "HOOK", desc: "Module thu thập và phát log chẩn đoán ra ngoài ECU qua CAN/Ethernet tới PC DLT Viewer." },
  { abbr: "Dlt_DetForwardErrorTrace", full: "DLT Det Forwarding API", cat: "HOOK", desc: "API chuẩn nhận 4-Tuple từ Det; theo SWS_Det_00211 chỉ áp dụng cho Dev Error và Runtime Error." },
  { abbr: "AppId / CtxId", full: "DLT Application / Context 4-Char ID", cat: "HOOK", desc: "Cặp định danh 4 ký tự (vd 'DET '/'ERRS') gắn vào gói tin DLT để lọc trên PC Tool." },
  { abbr: "Ring Buffer", full: "Det_ErrorBuffer[N] Circular RAM Array", cat: "HOOK", desc: "Mảng vòng trên RAM lưu lại các 4-Tuple gần nhất hoặc đầu tiên giúp kiểm tra khi Debug." },
  { abbr: "FIFO Overwrite", full: "Circular Overwrite Overflow Mode", cat: "HOOK", desc: "Chế độ ghi đè phần tử cũ nhất khi Ring Buffer đầy, luôn lưu N lỗi gần nhất." },
  { abbr: "Stop-On-Full", full: "Keep-First Overflow Protection Mode", cat: "HOOK", desc: "Chế độ khóa buffer khi đầy để bảo toàn 100% lỗi gốc đầu tiên (Root Cause) khỏi bị bão lỗi đè mất." },
  { abbr: "Global Filter", full: "Det Global Suppression Filter", cat: "HOOK", desc: "Bộ lọc cho phép bỏ qua các cặp ModuleId:ErrorId đã biết để giảm nhiễu trên RAM Buffer/DLT." },
  { abbr: "Breakpoint Filter", full: "Det Target Halt Filter", cat: "HOOK", desc: "Bộ lọc chỉ dừng CPU (Endless Loop / __BKPT) khi xuất hiện đúng cặp ModuleId:ErrorId mục tiêu." },
  { abbr: "NoInit RAM", full: "Non-Initialized Retained RAM Section", cat: "HOOK", desc: "Vùng RAM (.noinit) không bị startup code xóa về 0 sau reset, dùng lưu Crash Crumb của Hook." },
  { abbr: "Anti-Recursion", full: "Recursive Hook Protection Guard", cat: "HOOK", desc: "Cơ chế cờ chặn đệ quy nếu bản thân hàm Hook lại vô tình kích hoạt Det_ReportError()." },

  { abbr: "Dev Error", full: "Development Error (SID 0x01)", cat: "SAFETY", desc: "Lỗi do lập trình viên (NULL ptr, Uninit, sai dải). Bị lược bỏ bằng macro khỏi bản Production." },
  { abbr: "Runtime Error", full: "Runtime Error (SID 0x04)", cat: "SAFETY", desc: "Lỗi tài nguyên/tải trọng khi vận hành thật (Queue full, timeout). Luôn tồn tại ở bản Production." },
  { abbr: "Transient Fault", full: "Transient Hardware Fault (SID 0x05)", cat: "SAFETY", desc: "Lỗi phần cứng nhất thời (ECC/nhiễu bus) có cơ chế tự phục hồi; Callout quyết định E_OK / E_NOT_OK." },
  { abbr: "Endless Loop", full: "while(1) / __BKPT(0) Debug Halt", cat: "SAFETY", desc: "Vòng lặp treo CPU cố ý khi gặp Dev Error trong lab để debugger JTAG bắt nguyên nhân tại chỗ." },
  { abbr: "SchM", full: "Schedule Manager (Exclusive Area)", cat: "SAFETY", desc: "Module cung cấp SchM_Enter_Det_DET_EXCLUSIVE_AREA_0() khóa ngắt chống tranh chấp giữa Task và ISR." },
  { abbr: "ISR", full: "Interrupt Service Routine (Cat-2)", cat: "SAFETY", desc: "Trình phục vụ ngắt ưu tiên cao (vd ISR_CanRx) có thể ngắt ngang Task_10ms đang gọi Det." },
  { abbr: "Reentrancy", full: "Reentrant Safe Execution", cat: "SAFETY", desc: "Khả năng Det được gọi lồng nhau đồng thời từ nhiều Task/ISR mà không làm hỏng Ring Buffer." },
  { abbr: "Race Condition", full: "Concurrency Data Corruption", cat: "SAFETY", desc: "Lỗi hỏng dữ liệu khi tắt SchM Exclusive Area làm ISR ghi đè nửa chừng 4-Tuple của Task." },
  { abbr: "DEM", full: "Diagnostic Event Manager (ModuleId 54)", cat: "SAFETY", desc: "Module lưu DTC dài hạn vào NvM và trả lời máy chẩn đoán UDS 0x19 — hoàn toàn khác mục đích với Det." },
  { abbr: "DTC", full: "Diagnostic Trouble Code", cat: "SAFETY", desc: "Mã lỗi chẩn đoán xe của DEM/UDS; Det KHÔNG bao giờ tạo hoặc lưu DTC." },
  { abbr: "E_OK / E_NOT_OK", full: "AUTOSAR Std_ReturnType Status Codes", cat: "SAFETY", desc: "Mã trả về chuẩn (0x00=OK, 0x01=NOT_OK). Det 0x01 và 0x04 luôn trả E_OK; 0x05 phụ thuộc Callout." },
  { abbr: "JTAG / Trace32", full: "Hardware In-Circuit Debugger", cat: "SAFETY", desc: "Thiết bị gỡ lỗi phần cứng dùng để đọc Call Stack và bẻ khóa vòng lặp vô tận của Det trong lab." }
];
