// ================= PART 3: CONSTANTS, BITFIELDS, LOGICAL BLOCKS, CONFIG TOOLTIPS, MODULE INFO & GLOSSARY =================

const MEMIF_CORE_BITS = [
  { bit: 7, mask: 0x80, tag: "FCT_PTR",   name: "FCT_PTR_MOD",   tone: "cyan", desc: "Bit 7 = 1 khi MemIfNumberOfDevices > 1 (Dùng bảng con trỏ hàm MemIf_*FctPtr[DevIdx] — SWS_MemIf_00020). Bit 7 = 0 khi == 1 (Macro #define trực tiếp xuống Fee — SWS_MemIf_00019)." },
  { bit: 6, mask: 0x40, tag: "ACT_DEV1",  name: "ACTV_DEV_1",    tone: "cyan", desc: "Bit 6 = 0: Lệnh đang nhắm tới DeviceIndex = 0 (Fee - Data Flash). Bit 6 = 1: Lệnh nhắm tới DeviceIndex = 1 (Ea - External SPI EEPROM)." },
  { bit: 5, mask: 0x20, tag: "FAST_MOD",  name: "FAST_MODE",     tone: "",     desc: "Chế độ MemIf_SetMode(): 1 = MEMIF_MODE_FAST (tốc độ Burst khi NvM_ReadAll/WriteAll); 0 = MEMIF_MODE_SLOW (vận hành thường tiết kiệm CPU — SWS_MemIf_00038)." },
  { bit: 4, mask: 0x10, tag: "BCAST_QRY", name: "BCAST_QUERY",   tone: "cyan", desc: "Bit 4 = 1 khi tầng trên gọi MemIf_GetStatus(MEMIF_BROADCAST_ID = 0xFF) hoặc MemIf_SetMode() phát quảng bá tới toàn bộ thiết bị — SWS_MemIf_00035." },
  { bit: 3, mask: 0x08, tag: "DET_ERR",   name: "DET_ERR_FLG",   tone: "err",  desc: "Cờ phát hiện lỗi lập trình DET: MEMIF_E_PARAM_DEVICE (0x01) hoặc MEMIF_E_PARAM_POINTER (0x02) — SWS_MemIf_00022, 00023." },
  { bit: 2, mask: 0x04, tag: "GLB_UNIN",  name: "GLB_UNINIT",    tone: "err",  desc: "Trạng thái hợp nhất Broadcast = MEMIF_UNINIT (0x00) do có ít nhất 1 thiết bị (Fee hoặc Ea) chưa Init (Ưu tiên Broadcast #1 — SWS_MemIf_00035)." },
  { bit: 1, mask: 0x02, tag: "GLB_INT",   name: "GLB_BUSY_INT",  tone: "warn", desc: "Trạng thái hợp nhất Broadcast = MEMIF_BUSY_INTERNAL (0x03): Không có Dev BUSY, nhưng Fee đang chạy ngầm Garbage Collection (Ưu tiên #3 — SWS_MemIf_00037)." },
  { bit: 0, mask: 0x01, tag: "GLB_BUSY",  name: "GLB_BUSY",      tone: "warn", desc: "Trạng thái hợp nhất Broadcast = MEMIF_BUSY (0x02): Có ít nhất 1 thiết bị đang xử lý lệnh của NvM (Ưu tiên #2 — SWS_MemIf_00036). Nếu B2..B0 = 000b → MEMIF_IDLE." }
];

const MEMIF_DEV_JOB_BITS = [
  { bit: 7, mask: 0x80, tag: "FEE0_BSY",  name: "FEE0_BUSY",     tone: "warn", desc: "Nhánh DeviceIndex = 0 (Fee - Flash Emulation) đang ở trạng thái MEMIF_BUSY thực thi lệnh đọc/ghi/xóa/invalidate xuống Fls." },
  { bit: 6, mask: 0x40, tag: "FEE0_GC",   name: "FEE0_GC_INT",   tone: "warn", desc: "Nhánh DeviceIndex = 0 (Fee) đang ở MEMIF_BUSY_INTERNAL (0x03) để chạy Garbage Collection / Sector Switch trên Data Flash." },
  { bit: 5, mask: 0x20, tag: "EA1_BUSY",  name: "EA1_BUSY",      tone: "warn", desc: "Nhánh DeviceIndex = 1 (Ea - EEPROM Abstraction) đang ở trạng thái MEMIF_BUSY truyền nhận khung dữ liệu EEPROM qua Eep/SPI." },
  { bit: 4, mask: 0x10, tag: "IMM_BLK",   name: "IMMED_BLOCK",   tone: "cyan", desc: "Thao tác đang nhắm vào Immediate Block (FeeImmediateData = TRUE) qua MemIf_EraseImmediateBlock() hoặc Crash Data Write khẩn cấp." },
  { bit: 3, mask: 0x08, tag: "NVM_CBK",   name: "NVM_CBK_OK",    tone: "",     desc: "1 = Callback Notification Mode (NvMPollingMode=FALSE): Fee/Ea gọi thẳng NvM_JobEnd/ErrorNotification() bỏ qua MemIf. 0 = Polling Mode qua MemIf." },
  { bit: 2, mask: 0x04, tag: "JOB_B2",    name: "JOB_RES_B2",    tone: "err",  desc: "Bit 2 của MemIf_JobResultType (SWS_MemIf_00065): 100b = MEMIF_BLOCK_INCONSISTENT (0x04), 101b = MEMIF_BLOCK_INVALID (0x05)." },
  { bit: 1, mask: 0x02, tag: "JOB_B1",    name: "JOB_RES_B1",    tone: "warn", desc: "Bit 1 của MemIf_JobResultType: 010b = MEMIF_JOB_CANCELED (0x02), 011b = MEMIF_JOB_FAILED (0x03)." },
  { bit: 0, mask: 0x01, tag: "JOB_B0",    name: "JOB_RES_B0",    tone: "warn", desc: "Bit 0 của MemIf_JobResultType: 000b = JOB_OK, 001b = JOB_PENDING, 011b = JOB_FAILED, 101b = BLOCK_INVALID." }
];

const LOGICAL_BLOCKS = {
  "0x0004": {
    blockNum: 0x0004, hex: "0x0004", nvmId: 4, name: "NvM_CalibData",
    devIdx: 0, devName: "Fee (Flash)", size: 32, immediate: false, mgmt: "NATIVE",
    physAddr: "Active Sector 0 · VP #12..#15", defaultHex: "DE AD BE EF 20 26 AA 55"
  },
  "0x0008": {
    blockNum: 0x0008, hex: "0x0008", nvmId: 8, name: "NvM_VinRedundant_0",
    devIdx: 0, devName: "Fee (Flash)", size: 16, immediate: false, mgmt: "REDUNDANT (Copy 1)",
    physAddr: "Active Sector 0 · VP #08..#09", defaultHex: "56 49 4E 32 30 32 36 01"
  },
  "0x0009": {
    blockNum: 0x0009, hex: "0x0009", nvmId: 8, name: "NvM_VinRedundant_1",
    devIdx: 0, devName: "Fee (Flash)", size: 16, immediate: false, mgmt: "REDUNDANT (Copy 2)",
    physAddr: "Active Sector 0 · VP #10..#11", defaultHex: "56 49 4E 32 30 32 36 01"
  },
  "0x000F": {
    blockNum: 0x000F, hex: "0x000F", nvmId: 15, name: "Dem_CrashImmediate",
    devIdx: 0, devName: "Fee (Flash)", size: 64, immediate: true, mgmt: "IMMEDIATE (Crash DTC)",
    physAddr: "Reserved Imm Region · Sector 0", defaultHex: "C0 A5 40 01 FF 99 11 22"
  },
  "0x0010": {
    blockNum: 0x0010, hex: "0x0010", nvmId: 10, name: "NvM_OdometerEep",
    devIdx: 1, devName: "Ea (EEPROM)", size: 16, immediate: false, mgmt: "NATIVE (EEPROM)",
    physAddr: "Ext EEPROM Offset 0x0180 (16B)", defaultHex: "00 01 4E 20 4B 4D 00 01"
  },
  "0x0020": {
    blockNum: 0x0020, hex: "0x0020", nvmId: 12, name: "NvM_ImmoKeyEep",
    devIdx: 1, devName: "Ea (EEPROM)", size: 32, immediate: false, mgmt: "NATIVE (Security)",
    physAddr: "Ext EEPROM Offset 0x0240 (32B)", defaultHex: "A1 B2 C3 D4 E5 F6 07 18"
  }
};

const configTooltipData = {
  // Tab 0: MemIf General
  MemIfNumberOfDevices: {
    title: "MemIfNumberOfDevices",
    ecucPath: "MemIf / MemIfGeneral / MemIfNumberOfDevices",
    sws: "SWS_MemIf_00018 · ECUC_MemIf_00033",
    range: "1 .. 254 (0xFF là MEMIF_BROADCAST_ID)",
    typical: "1 (Macro Mode) | 2 (Fee + Ea)",
    role: "Quy định tổng số module trừu tượng hóa bộ nhớ (Fee / Ea) bên dưới lớp MemIf.",
    mechanism: "Nếu == 1: MemIf sinh Macro #define gọi thẳng xuống Fee (Zero CPU Overhead). Nếu >= 2: sinh mảng con trỏ hàm MemIf_*FctPtr[DeviceIndex] kèm kiểm tra DET.",
    scenarioImpact: "Gạt trực tiếp giữa 1 và 2 ở kịch bản S3 để thấy biến đổi code C trong MemIf_Cfg.h và Thanh ghi A (Bit 7)."
  },
  MemIfDevErrorDetect: {
    title: "MemIfDevErrorDetect",
    ecucPath: "MemIf / MemIfGeneral / MemIfDevErrorDetect",
    sws: "SWS_MemIf_00022 · ECUC_MemIf_00035",
    range: "boolean (true | false)",
    typical: "true (Dev/Test) | false (Production Release)",
    role: "Bật/tắt phát hiện lỗi phát triển (Development Error) và báo cáo sang DET.",
    mechanism: "Khi true, MemIf kiểm tra DeviceIndex < MEMIF_NUMBER_OF_DEVICES (báo MEMIF_E_PARAM_DEVICE=0x01) và con trỏ NULL_PTR (báo MEMIF_E_PARAM_POINTER=0x02).",
    scenarioImpact: "Kiểm thử toàn diện ở kịch bản S12; tắt cờ này sẽ bỏ qua hàng rào bảo vệ chỉ số mảng!"
  },
  MemIfVersionInfoApi: {
    title: "MemIfVersionInfoApi",
    ecucPath: "MemIf / MemIfGeneral / MemIfVersionInfoApi",
    sws: "SWS_MemIf_00046 · ECUC_MemIf_00032",
    range: "boolean (true | false)",
    typical: "true hoặc false tùy nhu cầu chẩn đoán phiên bản",
    role: "Bật/tắt biên dịch API MemIf_GetVersionInfo(Std_VersionInfoType *VersionInfoPtr).",
    mechanism: "Khi true, xuất macro #define MEMIF_VERSION_INFO_API STD_ON trong MemIf_Cfg.h và cho phép lấy ModuleId=22.",
    scenarioImpact: "Ảnh hưởng tới kết quả gọi MemIf_GetVersionInfo() ở S12 và mã sinh trong MemIf_Cfg.h."
  },
  ActiveMemIfMode: {
    title: "Active MemIf_ModeType (MemIf_SetMode)",
    ecucPath: "MemIfRuntime / MemIf_SetMode(Mode)",
    sws: "SWS_MemIf_00038 · SWS_MemIf_00066",
    range: "MEMIF_MODE_SLOW (0x00) | MEMIF_MODE_FAST (0x01)",
    typical: "FAST khi ReadAll/WriteAll | SLOW khi xe chạy",
    role: "Điều khiển tốc độ xử lý byte trên mỗi chu kỳ MainFunction của tất cả driver bộ nhớ bên dưới.",
    mechanism: "MemIf_SetMode() không nhận DeviceIndex mà tự động quảng bá Mode tới cả Fee_SetMode() và Ea_SetMode() để Fls/Eep chọn khối truyền Slow hay Fast.",
    scenarioImpact: "Thử nghiệm ở S8 để so sánh tốc độ hoàn tất NvM_ReadAll() giữa SLOW và FAST."
  },
  FeeDev0Initialized: {
    title: "Fee Initialization State (DeviceIndex = 0)",
    ecucPath: "FeeRuntime / Fee_Init() Status",
    sws: "SWS_MemIf_00035 · SWS_Fee_00001",
    range: "boolean (true = IDLE/READY | false = MEMIF_UNINIT)",
    typical: "true sau khi EcuM hoàn tất pha Driver Init",
    role: "Xác định module Fee (Device 0) đã được khởi tạo hay chưa.",
    mechanism: "Theo SWS_MemIf_00035, nếu bất kỳ thiết bị nào ở MEMIF_UNINIT, lệnh MemIf_GetStatus(MEMIF_BROADCAST_ID = 0xFF) phải trả về MEMIF_UNINIT ưu tiên cao nhất!",
    scenarioImpact: "Tắt cờ này trong S7 để chứng minh quy tắc ưu tiên UNINIT > BUSY > BUSY_INTERNAL > IDLE."
  },
  EaDev1Initialized: {
    title: "Ea Initialization State (DeviceIndex = 1)",
    ecucPath: "EaRuntime / Ea_Init() Status",
    sws: "SWS_MemIf_00035 · SWS_Ea_00001",
    range: "boolean (true = IDLE/READY | false = MEMIF_UNINIT)",
    typical: "true sau khi SPI & Eep hoàn tất khởi tạo",
    role: "Xác định module Ea (Device 1) đã được khởi tạo hay chưa.",
    mechanism: "Nếu Ea chưa Init nhưng Fee đang rảnh hoặc bận, MemIf_GetStatus(0xFF) vẫn trả về MEMIF_UNINIT (Bit 2 GLB_UNINIT = 1).",
    scenarioImpact: "Dùng để test Broadcast Priority Matrix ở kịch bản S7."
  },

  // Tab 1: Device Routing & Blocks
  SelectedDeviceIndex: {
    title: "Target DeviceIndex Parameter",
    ecucPath: "NvMBlockDescriptor / NvMTargetBlockReference -> DeviceIndex",
    sws: "SWS_MemIf_00022 · SWS_MemIf_00035",
    range: "0 (Fee) | 1 (Ea) | 255 (0xFF BROADCAST) | 99 (Invalid)",
    typical: "0 cho Internal Flash, 1 cho External EEPROM",
    role: "Tham số chỉ định module phần cứng đích khi NvM gọi các API của MemIf.",
    mechanism: "MemIf dùng DeviceIndex làm chỉ số tra mảng MemIf_*FctPtr[DeviceIndex]. Giá trị 0xFF (MEMIF_BROADCAST_ID) chỉ được phép dùng cho MemIf_GetStatus().",
    scenarioImpact: "Thử chọn 0xFF rồi gọi MemIf_GetStatus (Hợp lệ) so với MemIf_GetJobResult (Báo lỗi DET 0x01!) ở S12."
  },
  SelectedLogicalBlock: {
    title: "Logical BlockNumber Mapping",
    ecucPath: "FeeBlockConfiguration / EaBlockConfiguration -> BlockNumber",
    sws: "SWS_NvM_00341 · SWS_Fee_00006",
    range: "uint16 (0x0001 .. 0xFFFE, cấm 0x0000 và 0xFFFF)",
    typical: "(NvMNvBlockBaseNumber << DataSelectionBits) + DataIndex",
    role: "Số định danh logic của khối dữ liệu truyền xuống MemIf_Read / Write / Invalidate / EraseImmediate.",
    mechanism: "Một Logical Block cố định gắn với 1 thiết bị (VD: 0x0004 thuộc Fee Dev 0, 0x0010 thuộc Ea Dev 1).",
    scenarioImpact: "Chuyển nhanh giữa Calib (0x0004), Redundant (0x0008/0009), CrashImmediate (0x000F) và EEPROM Odometer (0x0010)."
  },
  MemIfReadBlockOffset: {
    title: "BlockOffset (Byte Offset in Block)",
    ecucPath: "MemIf_Read(..., uint16 BlockOffset, ...)",
    sws: "SWS_MemIf_00039",
    range: "0 .. (BlockSize - 1) bytes",
    typical: "0 (đọc từ đầu Block) hoặc >0 (đọc một phần)",
    role: "Vị trí byte bắt đầu đọc tính từ đầu Logical Block.",
    mechanism: "Cho phép NvM hoặc Fee/Ea chỉ đọc một đoạn dữ liệu con bên trong Block thay vì đọc toàn bộ (chỉ áp dụng cho MemIf_Read, không dùng cho MemIf_Write).",
    scenarioImpact: "Thử đổi Offset = 8, Length = 16 trong What-If của kịch bản S1."
  },
  MemIfReadLength: {
    title: "Length (Number of Bytes to Read)",
    ecucPath: "MemIf_Read(..., uint16 Length)",
    sws: "SWS_MemIf_00039",
    range: "1 .. BlockSize bytes",
    typical: "16, 32 hoặc 64 bytes",
    role: "Số lượng byte dữ liệu yêu cầu đọc ra vùng nhớ RAM đích DataBufferPtr.",
    mechanism: "Fls/Eep sẽ chia tổng số byte Length thành nhiều chu kỳ MainFunction dựa theo BytesPerCycle (Slow/Fast).",
    scenarioImpact: "Quyết định số nhịp Tick Fee/Fls hoặc Ea/Eep cần thiết để hoàn thành lệnh MemIf_Read."
  },
  WritePayloadHex: {
    title: "DataBufferPtr Payload (RAM Hex Data)",
    ecucPath: "MemIf_Write(..., const uint8* DataBufferPtr)",
    sws: "SWS_MemIf_00040",
    range: "Chuỗi Hex tối đa 64 bytes",
    typical: "DE AD BE EF 20 26 AA 55",
    role: "Nội dung dữ liệu mẫu trong RAM Buffer sẽ được ghi xuống Flash (Fee) hoặc EEPROM (Ea).",
    mechanism: "Khi gọi MemIf_Write(), dữ liệu này được nạp vào Virtual Page mới của Fee hoặc Offset EEPROM của Ea.",
    scenarioImpact: "Quan sát nội dung mới xuất hiện ngay trên bảng Physical Layout sau khi ghi thành công."
  },
  PassNullPointerTest: {
    title: "Pass NULL_PTR Test (DET Injection)",
    ecucPath: "Runtime Fault Injection / DataBufferPtr = NULL_PTR",
    sws: "SWS_MemIf_00023",
    range: "boolean (true = Gửi NULL_PTR | false = Valid Pointer)",
    typical: "false (bật true để test DET)",
    role: "Cố tình truyền con trỏ NULL_PTR vào MemIf_Read, MemIf_Write hoặc MemIf_GetVersionInfo.",
    mechanism: "Khi MemIfDevErrorDetect == TRUE, MemIf lập tức chặn lệnh và gọi Det_ReportError(22, 0, ApiId, MEMIF_E_PARAM_POINTER = 0x02).",
    scenarioImpact: "Kiểm thử trực tiếp trong kịch bản S12."
  },

  // Tab 2: Fee & Fls (Dev 0)
  FeeDevErrorDetect: {
    title: "FeeDevErrorDetect",
    ecucPath: "Fee / FeeGeneral / FeeDevErrorDetect",
    sws: "SWS_Fee_00039 · ECUC_Fee_00039",
    range: "boolean (true | false)",
    typical: "true khi tích hợp",
    role: "Bật kiểm tra lỗi phát triển tại module Fee (ví dụ FEE_E_INVALID_BLOCK_NO, FEE_E_BUSY).",
    mechanism: "Nếu gọi Fee_EraseImmediateBlock() trên Block có FeeImmediateData == FALSE, Fee sẽ từ chối và báo lỗi DET.",
    scenarioImpact: "Minh họa ở What-If của kịch bản S4."
  },
  FeePollingMode: {
    title: "FeePollingMode (Fee ↔ Fls)",
    ecucPath: "Fee / FeeGeneral / FeePollingMode",
    sws: "SWS_Fee_00040 · ECUC_Fee_00040",
    range: "boolean (false = Fls Callback | true = Fee Polls Fls)",
    typical: "false (Dùng Fls JobEndNotification)",
    role: "Quy định cách Fee nhận biết tầng Fls (MCAL) đã hoàn tất lệnh Flash vật lý.",
    mechanism: "Nếu false: Fls gọi Fee_JobEndNotification(). Nếu true: Fee_MainFunction() chủ động gọi Fls_GetJobResult() định kỳ.",
    scenarioImpact: "Thử bật ở What-If của S9 để so sánh Polling tầng dưới và tầng trên."
  },
  FeeSetModeSupported: {
    title: "FeeSetModeSupported",
    ecucPath: "Fee / FeeGeneral / FeeSetModeSupported",
    sws: "SWS_Fee_00041 · ECUC_Fee_00041",
    range: "boolean (true | false)",
    typical: "true (Hỗ trợ chuyển SLOW/FAST)",
    role: "Cho phép API Fee_SetMode(Mode) chuyển tiếp lệnh đổi tốc độ xuống Fls_SetMode().",
    mechanism: "Nếu false, khi MemIf_SetMode() phát quảng bá, nhánh Fee sẽ giữ nguyên tốc độ cũ thay vì đổi sang FAST.",
    scenarioImpact: "Kiểm thử ở What-If kịch bản S8."
  },
  FeeVirtualPageSize: {
    title: "FeeVirtualPageSize",
    ecucPath: "Fee / FeeGeneral / FeeVirtualPageSize",
    sws: "SWS_Fee_00043 · ECUC_Fee_00043",
    range: "4 .. 32 bytes (Bội số của kích thước Page vật lý Data Flash)",
    typical: "8 bytes (Infineon Aurix / NXP S32K) hoặc 16 bytes",
    role: "Đơn vị cấp phát tối thiểu (Alignment) của một Virtual Page trong Sector Flash của Fee.",
    mechanism: "Mọi dữ liệu Block + Header/Trailer quản lý trong Fee đều được làm tròn lên bội số của FeeVirtualPageSize.",
    scenarioImpact: "Hiển thị trực tiếp trên thanh thông số Physical Layout của Fee."
  },
  FeeImmediateData: {
    title: "FeeImmediateData (Immediate Block Flag)",
    ecucPath: "Fee / FeeBlockConfiguration / FeeImmediateData",
    sws: "SWS_Fee_00048 · ECUC_Fee_00048",
    range: "boolean (true = Immediate Block | false = Standard Block)",
    typical: "true cho Dem Crash DTC / Airbag Event",
    role: "Đánh dấu Block chứa dữ liệu khẩn cấp được cấp vùng dự trữ riêng trên Flash.",
    mechanism: "Chỉ những Block có FeeImmediateData == TRUE mới được phép gọi MemIf_EraseImmediateBlock() và có thể ghi ngay ngay cả khi Fee đang chạy Garbage Collection.",
    scenarioImpact: "Trọng tâm của kịch bản S4."
  },
  FeeActiveSectorUsagePct: {
    title: "FeeActiveSectorUsagePct (Sector Fill %)",
    ecucPath: "FeeRuntime / Active Flash Sector Consumption",
    sws: "SWS_Fee_00018 · SWS_MemIf_00037",
    range: "0 .. 100 %",
    typical: "0..85% Bình thường | >=90% Tự kích hoạt Garbage Collection",
    role: "Mức độ lấp đầy hiện tại của Sector Flash đang hoạt động.",
    mechanism: "Vì Fee ghi nối tiếp theo kiểu Append-only (Wear-Leveling), mỗi lần ghi tăng mức đầy Sector. Khi >= 90%, Fee tự chuyển sang MEMIF_BUSY_INTERNAL để chạy Sector Switch!",
    scenarioImpact: "Quan sát hiệu ứng chuyển sang MEMIF_BUSY_INTERNAL trong S7."
  },

  // Tab 3: Ea & Eep (Dev 1)
  EaDevErrorDetect: {
    title: "EaDevErrorDetect",
    ecucPath: "Ea / EaGeneral / EaDevErrorDetect",
    sws: "SWS_Ea_00039 · ECUC_Ea_00039",
    range: "boolean (true | false)",
    typical: "true khi tích hợp",
    role: "Bật kiểm tra lỗi phát triển tại module Ea (DeviceIndex = 1).",
    mechanism: "Kiểm tra EA_E_NOT_INITIALIZED, EA_E_INVALID_BLOCK_NO trước khi tính Offset vật lý EEPROM.",
    scenarioImpact: "Bảo vệ nhánh DeviceIndex = 1."
  },
  EaPollingMode: {
    title: "EaPollingMode (Ea ↔ Eep)",
    ecucPath: "Ea / EaGeneral / EaPollingMode",
    sws: "SWS_Ea_00040 · ECUC_Ea_00040",
    range: "boolean (false = Eep Callback | true = Ea Polls Eep)",
    typical: "false (Dùng Eep JobEndNotification)",
    role: "Quy định cách Ea đồng bộ kết quả từ Eep / Spi Driver.",
    mechanism: "Nếu false: Eep gọi Ea_JobEndNotification(). Nếu true: Ea_MainFunction() gọi Eep_GetJobResult().",
    scenarioImpact: "Thay đổi luồng gọi nội bộ nhánh Device 1."
  },
  EaSetModeSupported: {
    title: "EaSetModeSupported",
    ecucPath: "Ea / EaGeneral / EaSetModeSupported",
    sws: "SWS_Ea_00041 · ECUC_Ea_00041",
    range: "boolean (true | false)",
    typical: "true",
    role: "Cho phép Ea_SetMode(Mode) truyền xuống Eep_SetMode(Mode).",
    mechanism: "Khi tắt false, Ea không đổi tốc độ ngay cả khi MemIf_SetMode(FAST) được gọi quảng bá.",
    scenarioImpact: "Kiểm thử ở What-If kịch bản S8."
  },
  EaVirtualPageSize: {
    title: "EaVirtualPageSize",
    ecucPath: "Ea / EaGeneral / EaVirtualPageSize",
    sws: "SWS_Ea_00043 · ECUC_Ea_00043",
    range: "1 .. 16 bytes (Mặc định: 4 bytes)",
    typical: "1 hoặc 4 bytes (EEPROM hỗ trợ ghi từng byte/page nhỏ)",
    role: "Kích thước căn lề trang ảo của Ea trên EEPROM vật lý.",
    mechanism: "Giúp Ea ánh xạ BlockNumber thành địa chỉ vật lý cố định (Fixed EEPROM Offset) không cần Garbage Collection.",
    scenarioImpact: "So sánh với FeeVirtualPageSize trong S2 và Sổ tay Tab 4."
  },
  FlsEepBytesPerCycleSlow: {
    title: "Max Bytes Per Cycle (MEMIF_MODE_SLOW)",
    ecucPath: "FlsGeneral / EepGeneral -> FlsMaxRead/WriteNormalMode",
    sws: "SWS_Fls_00249 · SWS_Eep_00071",
    range: "1 .. 64 bytes/tick (Mặc định: 8 bytes)",
    role: "Số byte tối đa Fls/Eep xử lý trong 1 nhịp MainFunction khi ở chế độ SLOW.",
    mechanism: "Ở chế độ SLOW, Block 32 bytes cần 32 / 8 = 4 chu kỳ MainFunction mới xong, giúp giữ CPU Load ổn định.",
    scenarioImpact: "Trực quan hóa thanh tiến trình truyền dữ liệu ở Panel 2 trong S1, S2, S8."
  },
  FlsEepBytesPerCycleFast: {
    title: "Max Bytes Per Cycle (MEMIF_MODE_FAST)",
    ecucPath: "FlsGeneral / EepGeneral -> FlsMaxRead/WriteFastMode",
    sws: "SWS_Fls_00250 · SWS_Eep_00072",
    range: "8 .. 128 bytes/tick (Mặc định: 32 bytes)",
    role: "Số byte tối đa Fls/Eep xử lý trong 1 nhịp MainFunction khi ở chế độ FAST.",
    mechanism: "Trong NvM_ReadAll() / WriteAll(), MemIf_SetMode(MEMIF_MODE_FAST) giúp Block 32 bytes hoàn tất chỉ sau 1 tick!",
    scenarioImpact: "So sánh trực tiếp tốc độ ở kịch bản S1 và S8."
  },

  // Tab 4: NvM & Callbacks
  NvMPollingMode: {
    title: "NvMPollingMode (Callback vs Polling)",
    ecucPath: "NvM / NvMCommon / NvMPollingMode",
    sws: "SWS_NvM_00490 · ECUC_NvM_00490",
    range: "boolean (false = Callback Notification | true = Polling via MemIf)",
    typical: "false (Dùng NvM_JobEndNotification / NvM_JobErrorNotification)",
    role: "Quy định cơ chế báo hoàn tất công việc từ Fee/Ea về NvM.",
    mechanism: "Nếu false: Fee/Ea gọi thẳng NvM_JobEndNotification() bỏ qua MemIf! Nếu true: NvM_MainFunction() định kỳ gọi MemIf_GetStatus() & MemIf_GetJobResult().",
    scenarioImpact: "Trọng tâm kịch bản S9 — đổi trực tiếp đường mũi tên trên sơ đồ SVG!"
  },
  NvMSetRamBlockStatusApi: {
    title: "NvMSetRamBlockStatusApi",
    ecucPath: "NvM / NvMCommon / NvMSetRamBlockStatusApi",
    sws: "SWS_NvM_00406 · ECUC_NvM_00491",
    range: "boolean (true | false)",
    typical: "true",
    role: "Bật API NvM_SetRamBlockStatus() để SWC đánh dấu RAM Block đã bị thay đổi cần lưu khi tắt máy.",
    mechanism: "Chỉ những Block được đánh dấu VALID & CHANGED mới được NvM_WriteAll() gửi xuống MemIf_Write() khi ECU Shutdown.",
    scenarioImpact: "Ảnh hưởng pha Shutdown WriteAll trong kịch bản S8."
  },
  NvMDynamicConfiguration: {
    title: "NvMDynamicConfiguration",
    ecucPath: "NvM / NvMCommon / NvMDynamicConfiguration",
    sws: "SWS_NvM_00248 · ECUC_NvM_00488",
    range: "boolean (true | false)",
    typical: "false hoặc true nếu hỗ trợ nâng cấp phần mềm OTA",
    role: "Kiểm tra ID cấu hình (ConfigId Block 1) khi chạy NvM_ReadAll() để phát hiện thay đổi bố cục bộ nhớ.",
    mechanism: "Nếu ConfigId thay đổi sau cập nhật firmware, NvM nạp lại dữ liệu ROM mặc định thay vì đọc dữ liệu cũ sai lệch.",
    scenarioImpact: "Bổ sung thông tin pha Startup ReadAll trong S8."
  },
  NvMBlockManagementType: {
    title: "NvMBlockManagementType",
    ecucPath: "NvM / NvMBlockDescriptor / NvMBlockManagementType",
    sws: "SWS_NvM_00062 · ECUC_NvM_00062",
    range: "NVM_BLOCK_NATIVE | NVM_BLOCK_REDUNDANT | NVM_BLOCK_DATASET",
    typical: "NATIVE (1 bản) | REDUNDANT (2 bản sao chống mất nguồn)",
    role: "Cơ chế nhân bản dự phòng của Block NVRAM trên tầng MemIf.",
    mechanism: "REDUNDANT ánh xạ 1 BlockId thành 2 BlockNumber liên tiếp (VD: 0x0008 & 0x0009); nếu bản 1 trả về MEMIF_BLOCK_INCONSISTENT, NvM tự động gọi MemIf_Read() bản 2!",
    scenarioImpact: "Cơ chế cứu dữ liệu cốt lõi ở kịch bản S10."
  },
  NvMDataSelectionBits: {
    title: "NvMDataSelectionBits",
    ecucPath: "NvM / NvMCommon / NvMDataSelectionBits",
    sws: "SWS_NvM_00479 · ECUC_NvM_00479",
    range: "0 .. 4 bits (Mặc định: 2 bits)",
    typical: "2 bits (hỗ trợ tối đa 4 bản ghi Dataset/Redundant mỗi Block)",
    role: "Số bit dịch trái để ghép BaseNumber và DataIndex thành BlockNumber truyền xuống MemIf.",
    mechanism: "Công thức chuẩn: MemIf_BlockNumber = (NvMNvBlockBaseNumber << NvMDataSelectionBits) + DataIndex.",
    scenarioImpact: "Hiển thị trong bảng giải mã ánh xạ BlockId -> BlockNumber."
  },
  NvMBswMMultiBlockJobStatusInformation: {
    title: "NvMBswMMultiBlockJobStatusInformation",
    ecucPath: "NvM / NvMCommon / NvMBswMMultiBlockJobStatusInformation",
    sws: "SWS_NvM_00516 · ECUC_NvM_00516",
    range: "boolean (true | false)",
    typical: "true (bắt buộc để EcuM/BswM biết ReadAll/WriteAll đã xong)",
    role: "Bật thông báo kết thúc ReadAll/WriteAll sang BswM_NvM_CurrentJobMode().",
    mechanism: "Khi NvM hoàn tất đọc/ghi toàn bộ các Block qua MemIf, BswM mới cho phép hệ thống chuyển vào RUN hoặc cắt nguồn ECU Sleep.",
    scenarioImpact: "Phối hợp với EcuM/BswM trong kịch bản S8."
  },

  // Tab 5: Faults & R23-11 MemAcc
  InjectBlockInconsistent: {
    title: "Inject MEMIF_BLOCK_INCONSISTENT",
    ecucPath: "Fault Injection / Corrupted Flash Trailer or Blank Page",
    sws: "SWS_MemIf_00065 · SWS_Fee_00023",
    range: "boolean (true = Mô phỏng dữ liệu rách/trống | false = Bình thường)",
    typical: "false (bật true để test S10)",
    role: "Giả lập tình huống mất nguồn giữa lúc ghi khiến dữ liệu bị rách (Torn Write) hoặc trang Flash trắng chưa ghi.",
    mechanism: "Khi gọi MemIf_Read(), Fee/Ea phát hiện Header/Trailer không khớp và trả về MEMIF_BLOCK_INCONSISTENT (0x04) thay vì MEMIF_JOB_OK.",
    scenarioImpact: "Kích hoạt quy trình tự cứu bản sao thứ 2 trong kịch bản S10."
  },
  InjectBlockInvalid: {
    title: "Inject MEMIF_BLOCK_INVALID",
    ecucPath: "Fault Injection / Invalidated Block State",
    sws: "SWS_MemIf_00043 · SWS_MemIf_00065",
    range: "boolean (true = Block bị đánh dấu Invalid | false = Valid)",
    typical: "false (tự động bật khi gọi MemIf_InvalidateBlock)",
    role: "Giả lập trạng thái Block đang mang cờ INVALID sau lệnh MemIf_InvalidateBlock().",
    mechanism: "Khi gọi MemIf_Read() trên Block này, kết quả trả về là MEMIF_BLOCK_INVALID (0x05) để NvM nạp ROM Default.",
    scenarioImpact: "Kiểm thử trực tiếp ở kịch bản S5."
  },
  InjectHardwareWriteEraseFail: {
    title: "Inject Hardware Write/Erase Failure",
    ecucPath: "Fault Injection / Fls or Eep Physical Error",
    sws: "SWS_MemIf_00065 · SWS_Fls_00105",
    range: "boolean (true = Lỗi phần cứng Flash/EEPROM | false = OK)",
    typical: "false",
    role: "Mô phỏng ô nhớ Data Flash bị hỏng (Max Erase Cycles) hoặc đứt đường truyền SPI tới EEPROM ngoài.",
    mechanism: "Fls/Eep trả về thất bại, bắn lỗi Dem_SetEventStatus(FLS_E_WRITE_FAILED / EEP_E_WRITE_FAILED, FAILED) và MemIf_GetJobResult() trả về MEMIF_JOB_FAILED (0x03).",
    scenarioImpact: "Trọng tâm kịch bản S11."
  },
  ForceFeeGarbageCollection: {
    title: "Force Fee Garbage Collection (BUSY_INTERNAL)",
    ecucPath: "FeeRuntime / Background Sector Switch",
    sws: "SWS_MemIf_00037 · SWS_Fee_00018",
    range: "boolean (true = Fee đang chạy GC | false = Bình thường)",
    typical: "false (tự động kích hoạt khi Sector Usage >= 90%)",
    role: "Đưa Fee (Device 0) vào trạng thái MEMIF_BUSY_INTERNAL (0x03) để mô phỏng quá trình dọn rác Flash.",
    mechanism: "Fee sao chép các Virtual Page còn hợp lệ sang Sector mới rồi gọi Fls_Erase() xóa Sector cũ; trong lúc này Broadcast Status(0xFF) trả về MEMIF_BUSY_INTERNAL (nếu Dev 1 IDLE).",
    scenarioImpact: "Kiểm chứng quy tắc ưu tiên Broadcast trong kịch bản S7."
  },
  EnableR2311MemAccLayer: {
    title: "Enable AUTOSAR R22-11 / R23-11 MemAcc & Mem Layer",
    ecucPath: "Architecture Standard / R21-11+ MemAcc & Unified Mem Driver",
    sws: "SWS_MemAcc (R22-11 / R23-11) · SWS_MemIf",
    range: "boolean (false = Classic Fls/Eep | true = R23-11 MemAcc -> Mem)",
    typical: "true cho dự án AUTOSAR R22-11 / R23-11 mới (hỗ trợ FOTA / Multi-Core)",
    role: "Chuyển đổi lớp truy cập bộ nhớ bên dưới Fee/Ea sang kiến trúc chuẩn mới MemAcc + Mem.",
    mechanism: "Giao diện NvM ↔ MemIf ↔ Fee/Ea vẫn giữ nguyên 100% để tương thích ngược, nhưng bên dưới Fee/Ea sẽ gọi MemAcc_Read/Write() ➔ Mem_Read/Write() thay vì Fls/Eep trực tiếp.",
    scenarioImpact: "Cập nhật trực tiếp sơ đồ SVG, nhãn module và API Call Trace trong kịch bản S11."
  },
  MemIfDemEventReporting: {
    title: "MemIfDemEventReporting (DEM Production Errors)",
    ecucPath: "Fls/Eep/NvM DemEventParameterRefs",
    sws: "SWS_Fls_00105 · SWS_NvM_00601",
    range: "boolean (true | false)",
    typical: "true",
    role: "Cho phép báo cáo các sự kiện lỗi phần cứng và toàn vẹn bộ nhớ sang module DEM.",
    mechanism: "Báo FLS_E_WRITE_FAILED, EEP_E_WRITE_FAILED hoặc NVM_E_INTEGRITY_FAILED sang Dem_SetEventStatus() khi xảy ra lỗi phần cứng/dữ liệu.",
    scenarioImpact: "Kiểm soát việc ghi nhận lỗi vào khối DEM trên SVG trong S10 và S11."
  }
};

const MODULES_INFO = {
  MOD_SWC: {
    title: "SWC_App (Application Software Components)",
    layer: "Application Layer (01_Application)",
    sws: "SWS_Rte · SWS_NvM",
    inputs: "Dữ liệu vận hành (Calib, Odometer, Immobilizer Key) trong RAM Mirror của SWC; nhận thông báo hoàn tất Rte_Call_NvMNotifyJobFinished_JobFinished().",
    processing: "SWC tuyệt đối KHÔNG bao giờ gọi trực tiếp MemIf! Khi cần đọc/ghi dữ liệu bền vững (Non-Volatile), SWC đánh dấu NvM_SetRamBlockStatus() hoặc gọi Client-Server Port tới NvM qua RTE.",
    outputs: "Rte_Call_NvMService_ReadBlock(DstPtr), Rte_Call_NvMService_WriteBlock(SrcPtr), Rte_Call_NvMService_InvalidateNvBlock()."
  },
  MOD_ECUM: {
    title: "EcuM & BswM (ECU State & Mode Management)",
    layer: "System Services (03_Services)",
    sws: "SWS_EcuM · SWS_BswM",
    inputs: "Sự kiện bật khóa (StartupTwo) hoặc tắt máy (GoOffOne); nhận trạng thái BswM_NvM_CurrentJobMode() từ NvM.",
    processing: "Điều phối vòng đời toàn ECU: Khi Startup kích hoạt NvM_ReadAll() (NvM sẽ gọi MemIf_SetMode(FAST) rồi đọc tất cả Block). Khi Shutdown kích hoạt NvM_WriteAll() trước khi cắt nguồn.",
    outputs: "NvM_ReadAll(), NvM_WriteAll(), BswM_NvM_CurrentJobMode()."
  },
  MOD_RTE: {
    title: "RTE & SchM (Runtime Environment & BSW Scheduler)",
    layer: "RTE Layer (02_RTE)",
    sws: "SWS_Rte",
    inputs: "Lời gọi NvMService Port từ SWC; xung nhịp đồng hồ hệ thống (5ms / 10ms) từ AUTOSAR OS.",
    processing: "1. RTE chèn sẵn BlockId (Port-Defined Argument Value) khi chuyển tiếp lời gọi SWC vào NvM.\n2. SchM lập lịch gọi tuần tự các hàm nền Memory Stack từ trên xuống dưới: NvM_MainFunction() -> Fee_MainFunction()/Ea_MainFunction() -> Fls_MainFunction()/Eep_MainFunction().",
    outputs: "NvM_ReadBlock(BlockId, Ptr), NvM_WriteBlock(BlockId, Ptr), NvM_MainFunction(), Fee/Ea_MainFunction(), Fls/Eep_MainFunction()."
  },
  MOD_NVM: {
    title: "NvM (NVRAM Manager)",
    layer: "Memory Services (03_Services)",
    sws: "SWS_NvM (R20-11 / R22-11 / R23-11)",
    inputs: "Yêu cầu theo BlockId từ SWC/RTE/DEM/EcuM; nhận NvM_JobEndNotification() hoặc đọc MemIf_GetStatus()/GetJobResult() (nếu NvMPollingMode=TRUE).",
    processing: "Quản lý hàng đợi Standard & Immediate Queue, tính CRC16/32, quản lý Redundant/Dataset. Ánh xạ BlockId thành cặp (DeviceIndex, BlockNumber) và gọi toàn bộ 8 API điều khiển xuống MemIf.",
    outputs: "MemIf_Read(), MemIf_Write(), MemIf_EraseImmediateBlock(), MemIf_InvalidateBlock(), MemIf_Cancel(), MemIf_SetMode(), MemIf_GetStatus(), MemIf_GetJobResult()."
  },
  MOD_MEMIF: {
    title: "MemIf (Memory Abstraction Interface)",
    layer: "ECU Abstraction Layer (04_ECU_Abstraction)",
    sws: "SWS_MemIf (ModuleId = 22 / 0x0016)",
    inputs: "Nhận 8 API dịch vụ bộ nhớ từ NvM kèm DeviceIndex (0=Fee, 1=Ea, 0xFF=BROADCAST_ID) và MemIf_GetVersionInfo().",
    processing: "1. Kiểm tra DET (MEMIF_E_PARAM_DEVICE=0x01, MEMIF_E_PARAM_POINTER=0x02).\n2. Nếu MemIfNumberOfDevices == 1: Biên dịch thành #define Macro gọi thẳng Fee (0 CPU overhead).\n3. Nếu >= 2: Tra mảng con trỏ hàm hằng MemIf_*FctPtr[DeviceIndex] để định tuyến xuống Fee hoặc Ea.\n4. Hợp nhất trạng thái MemIf_GetStatus(0xFF): UNINIT > BUSY > BUSY_INTERNAL > IDLE; Quảng bá MemIf_SetMode().",
    outputs: "Định tuyến xuống Fee_* (Dev 0) và Ea_* (Dev 1); báo lỗi sang Det_ReportError(22, 0, ApiId, ErrId)."
  },
  MOD_FEE: {
    title: "Fee (Flash EEPROM Emulation — DeviceIndex = 0)",
    layer: "ECU Abstraction Layer (04_ECU_Abstraction)",
    sws: "SWS_Fee",
    inputs: "Lệnh thao tác theo Logical BlockNumber từ MemIf; nhận Fee_JobEndNotification() hoặc Fls_GetJobResult() từ Fls/MemAcc.",
    processing: "Giả lập ghi từng Block trên bộ nhớ Data Flash: mỗi lần ghi cấp phát một Virtual Page mới (Append-only Wear-Leveling). Khi Active Sector đầy (>=90%), chuyển sang MEMIF_BUSY_INTERNAL để chạy Garbage Collection (Sector Switch) copy trang hợp lệ sang Sector mới rồi Fls_Erase() Sector cũ. Hỗ trợ Immediate Block ghi khẩn cấp.",
    outputs: "Fls_Read(), Fls_Write(), Fls_Erase(), Fls_Cancel() (hoặc MemAcc_* ở R23-11); gọi callback TRỰC TIẾP lên NvM: NvM_JobEndNotification() / NvM_JobErrorNotification() (bỏ qua MemIf!)."
  },
  MOD_EA: {
    title: "Ea (EEPROM Abstraction — DeviceIndex = 1)",
    layer: "ECU Abstraction Layer (04_ECU_Abstraction)",
    sws: "SWS_Ea",
    inputs: "Lệnh đọc/ghi/vô hiệu hóa theo BlockNumber từ MemIf; nhận Ea_JobEndNotification() hoặc Eep_GetJobResult() từ Eep/MemAcc.",
    processing: "Ánh xạ BlockNumber thành địa chỉ vật lý cố định (Fixed Physical EEPROM Offset), gắn Header/Status quản lý tính hợp lệ (VALID / INVALID / INCONSISTENT) mà không cần Garbage Collection.",
    outputs: "Eep_Read(), Eep_Write(), Eep_Erase(), Eep_Cancel() (hoặc MemAcc_*); gọi callback TRỰC TIẾP lên NvM: NvM_JobEndNotification() / NvM_JobErrorNotification()."
  },
  MOD_FLS: {
    title: "Fls / MemAcc + Mem (Internal Data Flash Driver)",
    layer: "MCAL Layer (05_MCAL)",
    sws: "SWS_Fls · SWS_MemAcc (R22-11/R23-11)",
    inputs: "Lệnh đọc/ghi/xóa theo địa chỉ Flash vật lý (Fls_AddressType) và chế độ SLOW/FAST từ Fee.",
    processing: "Điều khiển trực tiếp thanh ghi bộ nhớ DFlash nội bộ MCU; chia khối dữ liệu theo BytesPerCycleSlow/Fast trong Fls_MainFunction(); kiểm tra ECC. Trong R22-11/R23-11, lớp MemAcc đồng bộ truy cập đa nhân xuống Unified Mem Driver.",
    outputs: "Thao tác phần cứng DFlash Sectors; gọi Fee_JobEndNotification() / Fee_JobErrorNotification(); báo Dem_SetEventStatus(FLS_E_WRITE_FAILED)."
  },
  MOD_EEP: {
    title: "Eep & Spi Driver / MemAcc (External EEPROM Driver)",
    layer: "MCAL Layer (05_MCAL)",
    sws: "SWS_Eep · SWS_Spi",
    inputs: "Lệnh đọc/ghi/xóa theo địa chỉ Eep_AddressType và chế độ SLOW/FAST từ Ea.",
    processing: "Đóng gói khung lệnh chuẩn EEPROM (WREN 0x06, WRITE 0x02, READ 0x03 + 16-bit Offset + Data) truyền bất đồng bộ qua Spi_AsyncTransmit() tới chip EEPROM ngoài trên bo mạch ECU.",
    outputs: "Truyền nhận SPI Bus; gọi Ea_JobEndNotification() / Ea_JobErrorNotification(); báo Dem_SetEventStatus(EEP_E_WRITE_FAILED)."
  },
  MOD_DEM: {
    title: "DEM (Diagnostic Event Manager)",
    layer: "Diagnostic Services (03_Services)",
    sws: "SWS_Dem",
    inputs: "Báo cáo lỗi phần cứng FLS_E_WRITE_FAILED / EEP_E_WRITE_FAILED từ driver MCAL, lỗi toàn vẹn NVM_E_INTEGRITY_FAILED từ NvM; đồng thời là khách hàng lưu Crash DTC khẩn cấp xuống NvM.",
    processing: "Lưu Event Status / FreezeFrame vào Event Memory, kích hoạt ghi khẩn cấp dữ liệu va chạm qua NvM Immediate Block (Block 0x000F).",
    outputs: "NvM_WriteBlock(ImmediateCrashBlock) và lưu trữ mã DTC chẩn đoán."
  },
  MOD_DET: {
    title: "DET (Default Error Tracer)",
    layer: "System Services (03_Services)",
    sws: "SWS_Det · SWS_MemIf",
    inputs: "Det_ReportError(ModuleId=22, InstanceId=0, ApiId, ErrorId) từ MemIf (hoặc từ Fee/Ea/NvM).",
    processing: "Bắt tức thời các lỗi tham số lập trình trong pha phát triển: MEMIF_E_PARAM_DEVICE (0x01) khi DeviceIndex không hợp lệ, và MEMIF_E_PARAM_POINTER (0x02) khi truyền NULL_PTR.",
    outputs: "Ghi log chi tiết lỗi DET lên API Call Trace & Inspector."
  }
};

const ABBREVIATIONS = [
  // CORE (14)
  { abbr: "MemIf", full: "Memory Abstraction Interface", cat: "CORE", desc: "Module tầng ECU Abstraction (ModuleId=22) cung cấp giao diện đồng nhất cho NvM định tuyến xuống nhiều thiết bị Fee và Ea theo DeviceIndex." },
  { abbr: "DeviceIndex", full: "Memory Abstraction Device Index", cat: "CORE", desc: "Chỉ số uint8 định danh module phần cứng đích bên dưới MemIf (VD: 0 = Fee [Data Flash], 1 = Ea [EEPROM])." },
  { abbr: "MEMIF_BROADCAST_ID", full: "Memory Interface Broadcast Identifier (0xFF)", cat: "CORE", desc: "Giá trị hằng số 0xFF (255) dành riêng cho MemIf_GetStatus(0xFF) để hợp nhất trạng thái tất cả Fee và Ea theo ưu tiên." },
  { abbr: "MemIfNumberOfDevices", full: "Configured Number of Underlying Devices", cat: "CORE", desc: "Tham số ECUC quyết định kiến trúc sinh mã của MemIf: == 1 (Macro #define) hay >= 2 (Function Pointer Table)." },
  { abbr: "Macro Expansion Mode", full: "Pre-compile Direct Macro Mapping (1 Device)", cat: "CORE", desc: "Khi MemIfNumberOfDevices == 1 (SWS_MemIf_00019), MemIf_Read/Write định nghĩa thành #define gọi thẳng Fee_*, tốn 0 chu kỳ CPU." },
  { abbr: "Function Pointer Array", full: "Constant Dispatch Table (Multi-Device)", cat: "CORE", desc: "Khi MemIfNumberOfDevices > 1 (SWS_MemIf_00020), MemIf dùng mảng con trỏ hàm hằng số MemIf_*FctPtr[DeviceIndex] để định tuyến động." },
  { abbr: "ECU Abstraction", full: "ECU Abstraction Layer", cat: "CORE", desc: "Tầng phần mềm AUTOSAR che giấu chi tiết phần cứng vi điều khiển/bo mạch (chứa MemIf, Fee, Ea, IoHwAb, CanIf, WdgIf)." },
  { abbr: "BlockNumber", full: "Logical Memory Block Number (uint16)", cat: "CORE", desc: "Số hiệu Block logic (0x0001..0xFFFE) truyền xuống MemIf, được NvM tính từ NvMNvBlockBaseNumber và DataIndex." },
  { abbr: "BlockOffset", full: "Read Byte Offset Inside Block", cat: "CORE", desc: "Độ lệch tính bằng byte bên trong Block khi gọi MemIf_Read(), hỗ trợ đọc một phần dữ liệu thay vì toàn bộ Block." },
  { abbr: "DataBufferPtr", full: "Pointer to RAM Data Buffer", cat: "CORE", desc: "Con trỏ trỏ tới vùng nhớ RAM chứa dữ liệu đọc ra (MemIf_Read) hoặc ghi xuống (MemIf_Write); không được phép là NULL_PTR." },
  { abbr: "MemIf_Cfg.h", full: "MemIf Pre-Compile Configuration Header", cat: "CORE", desc: "File header chứa MEMIF_NUMBER_OF_DEVICES, MEMIF_DEV_ERROR_DETECT và các Macro định tuyến khi chỉ có 1 thiết bị." },
  { abbr: "MemIf_Cfg.c", full: "MemIf Function Pointer Table Definition", cat: "CORE", desc: "File nguồn C định nghĩa các mảng hằng con trỏ hàm ánh xạ DeviceIndex sang Fee_* và Ea_* khi có >= 2 thiết bị." },
  { abbr: "ModuleId 22", full: "MemIf Standard AUTOSAR Module ID (0x0016)", cat: "CORE", desc: "Mã định danh chuẩn của module MemIf trong hệ thống AUTOSAR DET và MemIf_GetVersionInfo()." },
  { abbr: "Zero Overhead", full: "Zero CPU/ROM Runtime Overhead", cat: "CORE", desc: "Đặc tính tối ưu của MemIf ở chế độ 1 thiết bị nhờ trình tiền xử lý C thay thế trực tiếp lời gọi hàm bằng Macro." },

  // API (16)
  { abbr: "MemIf_SetMode", full: "Set Operation Mode API (ServiceId 0x01)", cat: "API", desc: "Hàm quảng bá duy nhất không nhận DeviceIndex: gọi đồng thời Fee_SetMode(Mode) và Ea_SetMode(Mode) để chuyển SLOW ↔ FAST." },
  { abbr: "MemIf_Read", full: "Asynchronous Read API (ServiceId 0x02)", cat: "API", desc: "Định tuyến yêu cầu đọc bất đồng bộ BlockNumber (từ BlockOffset, độ dài Length) lên DataBufferPtr trong RAM." },
  { abbr: "MemIf_Write", full: "Asynchronous Write API (ServiceId 0x03)", cat: "API", desc: "Định tuyến yêu cầu ghi toàn bộ nội dung từ DataBufferPtr xuống BlockNumber trong Flash (Fee) hoặc EEPROM (Ea)." },
  { abbr: "MemIf_Cancel", full: "Cancel Pending Job API (ServiceId 0x04)", cat: "API", desc: "Hủy bỏ ngay lập tức tác vụ đang chạy dở trên DeviceIndex để giải phóng tài nguyên cho tác vụ khẩn cấp (Immediate Job)." },
  { abbr: "MemIf_GetStatus", full: "Get Device / Broadcast Status API (ServiceId 0x05)", cat: "API", desc: "Trả về MemIf_StatusType của DeviceIndex cụ thể, hoặc trạng thái hợp nhất nếu truyền MEMIF_BROADCAST_ID (0xFF)." },
  { abbr: "MemIf_GetJobResult", full: "Get Last Job Result API (ServiceId 0x06)", cat: "API", desc: "Trả về MemIf_JobResultType của tác vụ gần nhất trên DeviceIndex (Cấm truyền 0xFF — sẽ báo lỗi DET 0x01!)." },
  { abbr: "MemIf_InvalidateBlock", full: "Invalidate Logical Block API (ServiceId 0x07)", cat: "API", desc: "Đánh dấu Header của Block là INVALID mà không tốn chu kỳ xóa Sector; lần đọc kế tiếp trả về MEMIF_BLOCK_INVALID." },
  { abbr: "MemIf_GetVersionInfo", full: "Get Module Version Info API (ServiceId 0x08)", cat: "API", desc: "Trả về VendorId, ModuleId (22) và phiên bản phần mềm của MemIf vào cấu trúc Std_VersionInfoType." },
  { abbr: "MemIf_EraseImmediateBlock", full: "Erase Immediate Block API (ServiceId 0x09)", cat: "API", desc: "Xóa trước vùng Flash dự trữ của Block khẩn cấp (FeeImmediateData=TRUE) để sẵn sàng ghi tức thì khi có va chạm/tai nạn." },
  { abbr: "MemIf_StatusType", full: "Device Operational Status Enum (SWS_MemIf_00064)", cat: "API", desc: "Gồm 4 giá trị: MEMIF_UNINIT (0x00), MEMIF_IDLE (0x01), MEMIF_BUSY (0x02), MEMIF_BUSY_INTERNAL (0x03)." },
  { abbr: "MEMIF_UNINIT", full: "Status: Uninitialized (0x00)", cat: "API", desc: "Thiết bị chưa chạy *_Init(). Có độ ưu tiên cao nhất (#1) trong phép hợp nhất MemIf_GetStatus(MEMIF_BROADCAST_ID)." },
  { abbr: "MEMIF_IDLE", full: "Status: Idle / Ready (0x01)", cat: "API", desc: "Thiết bị đã khởi tạo và hoàn toàn rảnh rỗi, sẵn sàng tiếp nhận lệnh mới từ NvM (Ưu tiên Broadcast thấp nhất #4)." },
  { abbr: "MEMIF_BUSY", full: "Status: Busy Executing External Job (0x02)", cat: "API", desc: "Thiết bị đang thực thi lệnh đọc/ghi/xóa/invalidate từ NvM giao xuống (Ưu tiên Broadcast #2, chỉ sau UNINIT)." },
  { abbr: "MEMIF_BUSY_INTERNAL", full: "Status: Busy Internal Management (0x03)", cat: "API", desc: "Thiết bị rảnh với NvM nhưng đang bận chạy quản lý nội bộ như Fee Garbage Collection (Ưu tiên Broadcast #3)." },
  { abbr: "MemIf_JobResultType", full: "Job Result Enum (SWS_MemIf_00065)", cat: "API", desc: "6 kết quả: JOB_OK, JOB_PENDING, JOB_CANCELED, JOB_FAILED, BLOCK_INCONSISTENT, BLOCK_INVALID." },
  { abbr: "MEMIF_MODE_FAST / SLOW", full: "MemIf_ModeType Operation Speed", cat: "API", desc: "FAST xử lý khối lớn mỗi tick (dùng lúc ReadAll/WriteAll); SLOW chia nhỏ byte mỗi tick để giảm tải CPU lúc xe chạy." },

  // FEE (13)
  { abbr: "Fee", full: "Flash EEPROM Emulation", cat: "FEE", desc: "Module tầng ECU Abstraction (DeviceIndex=0) giả lập EEPROM có khả năng ghi đè theo Block trên bộ nhớ Data Flash vật lý." },
  { abbr: "Fls", full: "Flash Driver (MCAL)", cat: "FEE", desc: "Driver MCAL điều khiển trực tiếp thanh ghi xóa Sector và lập trình từng Page của bộ nhớ Data Flash nội bộ MCU." },
  { abbr: "Virtual Page (VP)", full: "Fee Virtual Page Alignment Unit", cat: "FEE", desc: "Đơn vị trang ảo nhỏ nhất (4/8/16 bytes) trong Fee dùng để căn lề Block Header và dữ liệu trên Data Flash." },
  { abbr: "Wear-Leveling", full: "Flash Write Cycle Wear-Leveling", cat: "FEE", desc: "Thuật toán ghi nối tiếp vào các trang trống mới (Append-only) thay vì xóa tại chỗ, giúp phân bổ đều độ mòn chu kỳ xóa Flash." },
  { abbr: "Garbage Collection (GC)", full: "Fee Sector Switch / Garbage Collection", cat: "FEE", desc: "Quy trình nền của Fee khi Sector đầy: copy các Block VALID mới nhất sang Sector dự phòng rồi xóa trắng Sector cũ (MEMIF_BUSY_INTERNAL)." },
  { abbr: "Active Sector", full: "Currently Active Data Flash Sector", cat: "FEE", desc: "Sector Flash đang được Fee cấp phát để ghi các bản ghi mới (trong tối thiểu 2 Sector xoay vòng của Fee)." },
  { abbr: "Immediate Block", full: "High-Priority Crash Data Block (FeeImmediateData)", cat: "FEE", desc: "Block đặc biệt được cấp sẵn vùng trống dự trữ để ghi khẩn cấp tức thời (VD: Crash DTC của túi khí) không bị chặn bởi GC." },
  { abbr: "Torn Write", full: "Power-Loss Interrupted Partial Write", cat: "FEE", desc: "Lỗi rách dữ liệu do mất nguồn giữa lúc đang ghi Page Flash, làm Header và Trailer không khớp → trả về MEMIF_BLOCK_INCONSISTENT." },
  { abbr: "MEMIF_BLOCK_INCONSISTENT", full: "JobResult: Inconsistent or Blank Block", cat: "FEE", desc: "Báo hiệu Block chưa từng được ghi (Blank Flash) hoặc bị hỏng CRC/Trailer do mất nguồn giữa chừng (SWS_MemIf_00065)." },
  { abbr: "MEMIF_BLOCK_INVALID", full: "JobResult: Invalidated Block", cat: "FEE", desc: "Báo hiệu Block đã bị vô hiệu hóa chủ động bởi lệnh MemIf_InvalidateBlock() trước đó; NvM sẽ nạp lại ROM Default." },
  { abbr: "MEMIF_JOB_CANCELED", full: "JobResult: Canceled by MemIf_Cancel", cat: "FEE", desc: "Trạng thái kết quả ngay sau khi NvM gọi MemIf_Cancel() để cắt ngang một tác vụ thường nhằm ưu tiên tác vụ khẩn cấp." },
  { abbr: "MemAcc", full: "Memory Access (AUTOSAR R21-11 / R22-11 / R23-11)", cat: "FEE", desc: "Module mới nằm dưới Fee/Ea trong chuẩn R22-11/R23-11 giúp đồng bộ truy cập đa nhân, phân quyền Flash và hỗ trợ OTA/FOTA." },
  { abbr: "Mem", full: "Unified Memory Driver (AUTOSAR R22-11+)", cat: "FEE", desc: "Driver phần cứng bộ nhớ thế hệ mới nằm dưới MemAcc (thay thế mô hình Fls/Eep tách rời truyền thống)." },

  // EA_NVM (13)
  { abbr: "Ea", full: "EEPROM Abstraction", cat: "EA_NVM", desc: "Module tầng ECU Abstraction (DeviceIndex=1) ánh xạ BlockNumber thành địa chỉ vật lý cố định trên chip EEPROM." },
  { abbr: "Eep", full: "EEPROM Driver (MCAL)", cat: "EA_NVM", desc: "Driver MCAL điều khiển EEPROM nội bộ hoặc gửi lệnh SPI tới chip EEPROM ngoại vi (hỗ trợ SLOW/FAST Mode)." },
  { abbr: "SPI EEPROM", full: "Serial Peripheral Interface External EEPROM", cat: "EA_NVM", desc: "Chip nhớ EEPROM ngoài kết nối qua bus SPI, thường dùng làm DeviceIndex = 1 cho các thông số ghi nhiều như Odometer." },
  { abbr: "NvM", full: "NVRAM Manager (System/Memory Services)", cat: "EA_NVM", desc: "Module dịch vụ cấp trên duy nhất gọi vào MemIf; quản lý hàng đợi đọc/ghi, CRC, Native/Redundant/Dataset và ReadAll/WriteAll." },
  { abbr: "NvM_ReadAll", full: "Multi-Block Read at Startup (EcuM)", cat: "EA_NVM", desc: "Lệnh đọc toàn bộ cấu hình NVRAM khi khởi động ECU; tự động bật MemIf_SetMode(FAST) rồi quay về SLOW khi xong." },
  { abbr: "NvM_WriteAll", full: "Multi-Block Write at Shutdown (EcuM)", cat: "EA_NVM", desc: "Lệnh lưu toàn bộ RAM Block đã thay đổi xuống Flash/EEPROM khi ECU tắt máy trước khi cắt nguồn." },
  { abbr: "Redundant Block", full: "NVM_BLOCK_REDUNDANT (Dual Copy)", cat: "EA_NVM", desc: "Kiểu quản lý Block lưu song song 2 bản sao vật lý; nếu bản 1 báo MEMIF_BLOCK_INCONSISTENT, NvM tự động đọc bản 2 để cứu dữ liệu." },
  { abbr: "Dataset Block", full: "NVM_BLOCK_DATASET (Indexed Array)", cat: "EA_NVM", desc: "Kiểu Block chứa mảng nhiều bản ghi cùng cấu trúc, chọn bản ghi thông qua DataIndex kết hợp NvMDataSelectionBits." },
  { abbr: "NvM_JobEndNotification", full: "Direct Upward Success Callback", cat: "EA_NVM", desc: "Hàm callback do Fee/Ea gọi TRỰC TIẾP lên NvM khi xong việc (bỏ qua MemIf vì MemIf không có hàm callback nào!)." },
  { abbr: "NvMPollingMode", full: "NvM Polling vs Callback Configuration", cat: "EA_NVM", desc: "Khi TRUE, NvM_MainFunction() định kỳ gọi MemIf_GetStatus() & MemIf_GetJobResult() thay vì chờ callback từ Fee/Ea." },
  { abbr: "MEMIF_E_PARAM_DEVICE", full: "DET Error 0x01: Invalid DeviceIndex", cat: "EA_NVM", desc: "Lỗi DET bắn ra khi DeviceIndex >= MEMIF_NUMBER_OF_DEVICES hoặc truyền 0xFF vào API khác MemIf_GetStatus (SWS_MemIf_00022)." },
  { abbr: "MEMIF_E_PARAM_POINTER", full: "DET Error 0x02: NULL Pointer Argument", cat: "EA_NVM", desc: "Lỗi DET bắn ra khi truyền NULL_PTR vào DataBufferPtr (Read/Write) hoặc VersionInfoPtr (GetVersionInfo) (SWS_MemIf_00023)." },
  { abbr: "MEMIF_JOB_FAILED", full: "JobResult: Physical Hardware Error", cat: "EA_NVM", desc: "Kết quả báo lỗi phần cứng (lỗi Verify/Erase Data Flash hoặc mất kết nối SPI EEPROM), kích hoạt báo lỗi sang DEM." }
];
