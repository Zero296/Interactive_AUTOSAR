// ================= PART 3: CONSTANTS, 36 ECUC PARAMETERS, TOOLTIP METADATA, BITFIELDS & MODULES =================

const EEP_MODULE_ID = 90; // 0x005A

const defaultConfig = {
  // Tab 0: EepGeneral (7)
  EepInitialized: true,
  EepDevErrorDetect: true,
  EepVersionInfoApi: true,
  EepUseInterrupts: false,
  EepWriteCycleReduction: false,
  EepDriverIndex: 0,
  EepJobCallCycle: 5,
  // Tab 1: InitConfig & Mode (6)
  EepDefaultMode: "MEMIF_MODE_SLOW",
  CurrentMemIfMode: "MEMIF_MODE_SLOW",
  EepNormalReadBlockSize: 16,
  EepNormalWriteBlockSize: 8,
  EepFastReadBlockSize: 64,
  EepFastWriteBlockSize: 32,
  // Tab 2: Physical Layout & Units (8)
  EepBaseAddress: "0x0000",
  EepSize: 256,
  EepTotalSize: 256,
  EepEraseValue: "0xFF",
  EepReadUnitSize: 1,
  EepWriteUnitSize: 1,
  EepEraseUnitSize: 8,
  EepAllowedWriteCycles: 100000,
  // Tab 3: HW Interface Int/SPI (5)
  EepHardwareInterfaceType: "EXTERNAL_SPI_EEPROM",
  EepSpiSequenceId: 0,
  EepWriteTimeMs: 5,
  EepEraseTimeMs: 5,
  AutoEraseBeforeWrite: true,
  // Tab 4: Callbacks & Dem (5)
  EepJobEndNotificationEnabled: true,
  EepJobEndNotification: "Ea_JobEndNotification",
  EepJobErrorNotificationEnabled: true,
  EepJobErrorNotification: "Ea_JobErrorNotification",
  EepDemErrorReportingEnabled: true,
  // Tab 5: Fault & Timeout (5)
  EnableWriteVerification: true,
  EnableEraseVerification: true,
  InjectHwWriteOrEraseVerifyFail: false,
  InjectHwTimeoutStuckBusy: false,
  TestInvalidParamMode: "NONE"
};

const configTooltipData = {
  EepInitialized: {
    title: "Trạng Thái Khởi Tạo Module Eep (Eep_Init)",
    sws: "SWS_Eep_00010 | SWS_Eep_00146",
    ecucPath: "Eep / Runtime State / Eep_Init(&Eep_Config)",
    type: "Runtime Flag",
    range: "TRUE (MEMIF_IDLE) | FALSE (MEMIF_UNINIT)",
    typical: "TRUE sau EcuM_AL_DriverInitOne",
    desc: "Điều khiển trạng thái khởi tạo toàn cục của trình điều khiển EEPROM (Bit 7 EEP_INIT trên Thanh A). Khi tắt về FALSE (MEMIF_UNINIT), mọi lời gọi API (Read/Write/Erase/Compare/Cancel/SetMode) sẽ bị chặn và báo lỗi DET.",
    note: "Bỏ tích để kiểm thử mã lỗi EEP_E_UNINIT (0x00) trong Kịch bản S1 và S14.",
    impact: "Tắt ngay khả năng nhận lệnh của Eep nếu ở MEMIF_UNINIT."
  },
  EepDevErrorDetect: {
    title: "Bật Phát Hiện Lỗi Phát Triển (DET)",
    sws: "SWS_Eep_00047 | ECUC_Eep_00161",
    ecucPath: "Eep / EepGeneral / EepDevErrorDetect",
    type: "Boolean",
    range: "TRUE | FALSE",
    typical: "TRUE (Dev/Test), FALSE (Production tùy chọn)",
    desc: "Bật/tắt cơ chế kiểm tra tham số đầu vào và báo lỗi về Default Error Tracer (ModuleId = 90) qua Det_ReportError(). Kiểm tra con trỏ NULL, địa chỉ vượt EepSize, độ dài = 0 hoặc chưa khởi tạo.",
    note: "Lưu ý: Các lỗi Runtime Error như EEP_E_BUSY (0x04) và EEP_E_TIMEOUT (0x05) luôn được báo qua Det_ReportRuntimeError() bất kể DET tắt hay bật (R20-11+).",
    impact: "Tắt để quan sát Eep bỏ qua kiểm tra Development Error trong S14."
  },
  EepVersionInfoApi: {
    title: "Kích Hoạt API Eep_GetVersionInfo",
    sws: "SWS_Eep_00156 | ECUC_Eep_00163",
    ecucPath: "Eep / EepGeneral / EepVersionInfoApi",
    type: "Boolean",
    range: "TRUE | FALSE",
    typical: "TRUE",
    desc: "Biên dịch và cho phép lớp trên gọi hàm đồng bộ Eep_GetVersionInfo(Std_VersionInfoType* versioninfo) để lấy VendorId, ModuleId (90) và số phiên bản SW.",
    note: "Nếu truyền versioninfo == NULL_PTR khi EepDevErrorDetect = TRUE, Eep báo EEP_E_PARAM_POINTER (0x0A).",
    impact: "Cho phép/vô hiệu hóa hàm Eep_GetVersionInfo() ở S1 và S14."
  },
  EepUseInterrupts: {
    title: "Sử Dụng Ngắt Phần Cứng Hay Hỏi Vòng (ISR vs Polling)",
    sws: "SWS_Eep_00117 | ECUC_Eep_00162",
    ecucPath: "Eep / EepGeneral / EepUseInterrupts",
    type: "Boolean",
    range: "FALSE (Polling trong Eep_MainFunction) | TRUE (ISR Eep_JobEndIsr)",
    typical: "FALSE (an toàn qua SchM) hoặc TRUE (tối ưu độ trễ SPI/HW)",
    desc: "Khi FALSE, toàn bộ tiến trình chuyển trang và đọc trạng thái WIP được xử lý tuần tự mỗi chu kỳ Eep_MainFunction(). Khi TRUE, ngắt phần cứng Eep_JobEndIsr thúc đẩy chuyển Chunk ngay khi phần cứng xong.",
    note: "Bật TRUE sẽ bật Bit 0 (ISR_MODE_EN) trên Thanh A và giảm độ trễ chờ giữa các trang EEPROM.",
    impact: "Minh họa trực tiếp trong Kịch bản S8."
  },
  EepWriteCycleReduction: {
    title: "Giảm Chu Kỳ Ghi Bằng Đọc So Sánh Trước (Write Cycle Reduction)",
    sws: "SWS_Eep_00024 | ECUC_Eep_00164",
    ecucPath: "Eep / EepGeneral / EepWriteCycleReduction",
    type: "Boolean",
    range: "TRUE | FALSE",
    typical: "FALSE (hoặc TRUE cho vùng hay ghi đè giá trị giống nhau)",
    desc: "Khi TRUE, trước khi xóa/ghi vật lý một trang trong Eep_Write(), Eep tự động đọc dữ liệu đang nằm trên EEPROM và so sánh với DataBufferPtr. Nếu đã giống hệt nhau, Eep BỎ QUA chu kỳ ghi vật lý!",
    note: "Giúp tăng mạnh tuổi thọ thực tế của cell EEPROM nhưng tốn thêm một bước đọc đối chiếu trước khi ghi.",
    impact: "Thử nghiệm trực quan trong Kịch bản S7 để thấy các trang không đổi được đánh dấu SKIPPED (tiết kiệm hao mòn)."
  },
  EepDriverIndex: {
    title: "Chỉ Số Thể Hiện Trình Điều Khiển (Driver Index)",
    sws: "ECUC_Eep_00178",
    ecucPath: "Eep / EepGeneral / EepDriverIndex",
    type: "Integer (uint8)",
    range: "0 .. 255",
    typical: "0",
    desc: "Định danh instance của Eep Driver trong kiến trúc đa trình điều khiển (khi ECU dùng nhiều chip EEPROM khác nhau).",
    note: "Hiển thị trong file cấu hình sinh ra Eep_Cfg.h và Eep.arxml.",
    impact: "Xuất trực tiếp ra macro EEP_DRIVER_INDEX trong Eep_Cfg.h."
  },
  EepJobCallCycle: {
    title: "Chu Kỳ Gọi Hàm Eep_MainFunction() (ms)",
    sws: "SWS_Eep_00155 | ECUC_Eep_00175",
    ecucPath: "Eep / EepGeneral / EepJobCallCycle",
    type: "Float / Integer (ms)",
    range: "1 .. 50 ms",
    typical: "5 ms (hoặc 10 ms)",
    desc: "Khoảng thời gian định kỳ mà SchM/OS lập lịch gọi Eep_MainFunction() để thực thi từng Chunk đọc/ghi/xóa/so sánh.",
    note: "Mỗi lần bấm nút +5ms MainFn, đồng hồ mô phỏng sẽ tăng thêm đúng EepJobCallCycle ms.",
    impact: "Quyết định bước nhảy thời gian t (ms) của đồng hồ mô phỏng."
  },
  EepDefaultMode: {
    title: "Chế Độ Tốc Độ Mặc Định Sau Eep_Init()",
    sws: "SWS_Eep_00015 | ECUC_Eep_00166",
    ecucPath: "Eep / EepInitConfiguration / EepDefaultMode",
    type: "Enum (MemIf_ModeType)",
    range: "MEMIF_MODE_SLOW | MEMIF_MODE_FAST",
    typical: "MEMIF_MODE_SLOW",
    desc: "Chế độ mà Eep_Init(&Eep_Config) tự động thiết lập ngay khi khởi tạo driver xong.",
    note: "Thường để SLOW để ổn định hệ thống lúc chạy bình thường, sau đó BswM/NvM gọi Eep_SetMode(FAST) khi cần.",
    impact: "Quyết định trạng thái Bit 1 Thanh A ngay sau Reset / Eep_Init() ở S1."
  },
  CurrentMemIfMode: {
    title: "Chế Độ Vận Hành Hiện Hành (SLOW vs FAST)",
    sws: "SWS_Eep_00016 | SWS_Eep_00147",
    ecucPath: "Eep / Runtime State / CurrentMode",
    type: "Enum (MemIf_ModeType)",
    range: "MEMIF_MODE_SLOW | MEMIF_MODE_FAST",
    typical: "MEMIF_MODE_SLOW",
    desc: "Chế độ đang hoạt động tại thời điểm hiện tại. Quyết định Eep_MainFunction() dùng bộ kích thước Normal Block Size (SLOW) hay Fast Block Size (FAST).",
    note: "Không được gọi Eep_SetMode() khi Eep đang MEMIF_BUSY nếu không sẽ bị báo EEP_E_BUSY (0x04).",
    impact: "Thay đổi ngay số byte xử lý mỗi Tick trên Thanh Tiến Độ Chunking."
  },
  EepNormalReadBlockSize: {
    title: "Kích Thước Chunk Đọc Chế Độ SLOW (Bytes/Tick)",
    sws: "SWS_Eep_00037 | ECUC_Eep_00171",
    ecucPath: "Eep / EepInitConfiguration / EepNormalReadBlockSize",
    type: "Integer (Eep_LengthType)",
    range: "1 .. 64 bytes",
    typical: "16 bytes",
    desc: "Số byte tối đa mà Eep_MainFunction() đọc hoặc so sánh trong 1 chu kỳ khi đang ở chế độ MEMIF_MODE_SLOW.",
    note: "Ví dụ đọc 24 bytes với NormalReadBlockSize = 16B sẽ tự động chia thành 2 chu kỳ: 16B + 8B.",
    impact: "Kiểm chứng trực tiếp số Tick cần thiết trong Kịch bản S2 và S5."
  },
  EepNormalWriteBlockSize: {
    title: "Kích Thước Chunk Ghi Chế Độ SLOW (Bytes/Tick)",
    sws: "SWS_Eep_00038 | ECUC_Eep_00172",
    ecucPath: "Eep / EepInitConfiguration / EepNormalWriteBlockSize",
    type: "Integer (Eep_LengthType)",
    range: "1 .. 64 bytes",
    typical: "8 bytes (bằng 1 page vật lý)",
    desc: "Số byte tối đa mà Eep_MainFunction() lập trình xuống EEPROM trong 1 chu kỳ khi ở chế độ MEMIF_MODE_SLOW.",
    note: "Ghi EEPROM vật lý tốn 3-5ms mỗi trang, nên giữ Chunk ghi nhỏ khi chạy SLOW giúp tránh nghẽn Task BSW.",
    impact: "Quy định số nhịp Tick để hoàn tất Eep_Write() ở Kịch bản S3."
  },
  EepFastReadBlockSize: {
    title: "Kích Thước Chunk Đọc Chế Độ FAST (Bytes/Tick)",
    sws: "SWS_Eep_00037 | ECUC_Eep_00167",
    ecucPath: "Eep / EepInitConfiguration / EepFastReadBlockSize",
    type: "Integer (Eep_LengthType)",
    range: "8 .. 256 bytes",
    typical: "64 bytes",
    desc: "Số byte tối đa mà Eep_MainFunction() đọc hoặc so sánh trong 1 chu kỳ khi chuyển sang MEMIF_MODE_FAST (lúc NvM_ReadAll).",
    note: "Gấp 4 lần chế độ SLOW (64B vs 16B), rút ngắn đáng kể thời gian khởi động ECU.",
    impact: "Thử chuyển sang FAST trong S2 và S7 để thấy tốc độ đọc tăng vọt!"
  },
  EepFastWriteBlockSize: {
    title: "Kích Thước Chunk Ghi Chế Độ FAST (Bytes/Tick)",
    sws: "SWS_Eep_00038 | ECUC_Eep_00168",
    ecucPath: "Eep / EepInitConfiguration / EepFastWriteBlockSize",
    type: "Integer (Eep_LengthType)",
    range: "4 .. 128 bytes",
    typical: "32 bytes",
    desc: "Số byte tối đa mà Eep_MainFunction() ghi trong 1 chu kỳ khi chuyển sang MEMIF_MODE_FAST (lúc NvM_WriteAll khi tắt máy).",
    note: "Thường là bội số của kích thước trang vật lý EEPROM.",
    impact: "Giúp Eep_Write(16B..32B) hoàn tất chỉ trong 1 nhịp Tick duy nhất ở S3 và S7."
  },
  EepBaseAddress: {
    title: "Địa Chỉ Cơ Sở Vật Lý EEPROM (Base Address)",
    sws: "ECUC_Eep_00165",
    ecucPath: "Eep / EepInitConfiguration / EepBaseAddress",
    type: "Hex Address (uint32)",
    range: "0x0000 .. 0xFFFF",
    typical: "0x0000",
    desc: "Địa chỉ vật lý bắt đầu của vùng nhớ EEPROM do trình điều khiển quản lý. Mọi EepromAddress truyền vào Eep_Read/Write/Erase/Compare là offset cộng thêm vào EepBaseAddress.",
    note: "PhysicalAddr = EepBaseAddress + EepromAddress.",
    impact: "Hiển thị nhãn địa chỉ thực tế trên Bản đồ Ô nhớ Vật lý."
  },
  EepSize: {
    title: "Dung Lượng Vùng Nhớ EEPROM Sử Dụng (Bytes)",
    sws: "SWS_Eep_00019 | SWS_Eep_00022 | ECUC_Eep_00173",
    ecucPath: "Eep / EepInitConfiguration / EepSize",
    type: "Integer (Eep_LengthType)",
    range: "32 .. 256 bytes (trong Simulator)",
    typical: "256 bytes (mô phỏng trực quan 16x16 grid)",
    desc: "Tổng số byte logic/vật lý hợp lệ mà lớp trên (Ea) được phép truy cập. Eep kiểm tra nghiêm ngặt điều kiện EepromAddress + Length <= EepSize.",
    note: "Nếu truyền địa chỉ hoặc độ dài làm vượt quá EepSize, DET bắt ngay EEP_E_INVALID_ADDRESS (0x01) hoặc EEP_E_INVALID_LENGTH (0x03).",
    impact: "Thu nhỏ EepSize (vd xuống 128B) sẽ kích hoạt kiểm tra vượt biên khi thao tác vùng 0x0080+."
  },
  EepTotalSize: {
    title: "Tổng Dung Lượng Chip EEPROM Vật Lý",
    sws: "ECUC_Eep_00174",
    ecucPath: "Eep / EepPublishedInformation / EepTotalSize",
    type: "Integer (Bytes)",
    range: "64 .. 65536 bytes",
    typical: "256 .. 32768 bytes",
    desc: "Tổng dung lượng silicon thực tế của chip EEPROM (luôn >= EepSize; phần chênh lệch có thể dành cho bootloader hoặc phân vùng khác).",
    note: "Tham số thuộc nhóm EepPublishedInformation do nhà cung cấp MCAL công bố.",
    impact: "Xuất vào Eep_Cfg.h và Eep.arxml."
  },
  EepEraseValue: {
    title: "Giá Trị Byte Sau Khi Xóa Trắng (Erase Value)",
    sws: "SWS_Eep_00025 | ECUC_Eep_00193",
    ecucPath: "Eep / EepPublishedInformation / EepEraseValue",
    type: "Hex Byte (uint8)",
    range: "0xFF | 0x00",
    typical: "0xFF",
    desc: "Giá trị mặc định của từng byte trên EEPROM sau khi thực hiện lệnh Eep_Erase(). Eep dùng giá trị này cho bước Erase Verification và Blank Check.",
    note: "Đa số chip EEPROM/Flash có bit sau xóa là 1 (0xFF), một số loại EEPROM đặc biệt dùng 0x00.",
    impact: "Thay đổi từ 0xFF sang 0x00 sẽ làm lệnh Eep_Erase() điền 0x00 vào các ô nhớ ở S4!"
  },
  EepReadUnitSize: {
    title: "Đơn Vị Đọc Tối Thiểu Phần Cứng (Read Unit)",
    sws: "ECUC_Eep_00194",
    ecucPath: "Eep / EepPublishedInformation / EepReadUnitSize",
    type: "Integer (Bytes)",
    range: "1 | 2 | 4 | 8",
    typical: "1 byte",
    desc: "Số byte nhỏ nhất có thể đọc được trong một thao tác phần cứng. Mọi EepromAddress và Length trong Eep_Read phải là bội số của đơn vị này.",
    note: "Nếu không chia hết cho EepReadUnitSize sẽ báo EEP_E_INVALID_ADDRESS hoặc EEP_E_INVALID_LENGTH.",
    impact: "Kiểm tra căn chỉnh địa chỉ đọc."
  },
  EepWriteUnitSize: {
    title: "Đơn Vị Ghi Tối Thiểu Phần Cứng (Write Unit)",
    sws: "ECUC_Eep_00195",
    ecucPath: "Eep / EepPublishedInformation / EepWriteUnitSize",
    type: "Integer (Bytes)",
    range: "1 | 2 | 4 | 8 | 16",
    typical: "1 byte (EEPROM) hoặc 4-8 bytes (Emulated/ECC)",
    desc: "Kích thước khối dữ liệu tối thiểu để lập trình vào EEPROM. Khác với Flash (cần phrase lớn), EEPROM truyền thống thường hỗ trợ ghi từng byte (1B).",
    note: "Đặt lớn hơn 1 (vd 4B) buộc Eep_Write chỉ nhận địa chỉ và độ dài chia hết cho 4B.",
    impact: "Kiểm tra căn chỉnh địa chỉ và độ dài cho lệnh Eep_Write()."
  },
  EepEraseUnitSize: {
    title: "Đơn Vị Xóa Tối Thiểu Phần Cứng (Erase Unit)",
    sws: "ECUC_Eep_00192",
    ecucPath: "Eep / EepPublishedInformation / EepEraseUnitSize",
    type: "Integer (Bytes)",
    range: "1 | 4 | 8 | 16 | 32",
    typical: "8 bytes (1 Page)",
    desc: "Kích thước trang xóa tối thiểu của EEPROM. Tham số EepromAddress và Length của Eep_Erase() phải là bội số của EepEraseUnitSize.",
    note: "Nhỏ hơn rất nhiều so với Sector của Flash (4KB-64KB)!",
    impact: "Kiểm tra căn chỉnh cho Eep_Erase() trong S4 và S14."
  },
  EepAllowedWriteCycles: {
    title: "Giới Hạn Chu Kỳ Xóa/Ghi Mỗi Ô Nhớ (Endurance)",
    sws: "ECUC_Eep_00170",
    ecucPath: "Eep / EepPublishedInformation / EepAllowedWriteCycles",
    type: "Integer (Cycles)",
    range: "10,000 .. 1,000,000",
    typical: "100,000 cycles",
    desc: "Số lần xóa/ghi tối đa cho phép theo datasheet phần cứng EEPROM. Tham số này được xuất cho tầng trên (Ea) để tính số lượng Slot Wear-Leveling.",
    note: "Ví dụ Ea cần 400,000 lần ghi và EepAllowedWriteCycles = 100,000 -> Ea tự nhân 4 Slots.",
    impact: "Hiển thị trong thông số phần cứng & xuất code Eep_Cfg.h."
  },
  EepHardwareInterfaceType: {
    title: "Kiến Trúc Phần Cứng EEPROM (Internal vs External SPI)",
    sws: "SWS_Eep_00001 | SWS_Eep_00116",
    ecucPath: "Eep / Hardware Architecture / InterfaceType",
    type: "Enum",
    range: "EXTERNAL_SPI_EEPROM | INTERNAL_ONCHIP_EEPROM",
    typical: "EXTERNAL_SPI_EEPROM (hoặc INTERNAL_ONCHIP_EEPROM)",
    desc: "Chọn cách Eep Driver giao tiếp vật lý: dùng EEPROM nội tích hợp sẵn trên MCU (thanh ghi EECTRL/EEADDR/EEDATA) hoặc chip EEPROM rời qua bus SPI (gọi Spi_SetupEB & Spi_AsyncTransmit).",
    note: "Theo SWS_Eep_00001, khi điều khiển EEPROM ngoài, Eep đóng vai trò SPI Handler/Driver User.",
    impact: "Thay đổi toàn bộ chuỗi khung lệnh trên HW Bus Trace (SPI WREN/WRITE/RDSR vs Internal Regs) và sơ đồ SVG ở S9!"
  },
  EepSpiSequenceId: {
    title: "Mã SPI Sequence Giao Tiếp EEPROM Ngoài",
    sws: "SWS_Eep_00116",
    ecucPath: "Eep / EepExternalDriver / SpiSequenceRef",
    type: "Integer (Spi_SequenceType)",
    range: "0 .. 15",
    typical: "0 (SPI_SEQ_EEPROM)",
    desc: "ID của SpiSequence trong module Spi dùng để truyền các khung lệnh WREN (0x06), WRITE (0x02), READ (0x03), RDSR (0x05) xuống chip EEPROM.",
    note: "Chỉ áp dụng khi EepHardwareInterfaceType == EXTERNAL_SPI_EEPROM.",
    impact: "Hiển thị trong khung truyền SPI Trace và code C Spi_AsyncTransmit(SeqId)."
  },
  EepWriteTimeMs: {
    title: "Thời Gian Lập Trình Vật Lý 1 Trang (ms)",
    sws: "ECUC_Eep_00191",
    ecucPath: "Eep / EepPublishedInformation / EepWriteTime",
    type: "Integer (ms)",
    range: "1 .. 50 ms",
    typical: "5 ms",
    desc: "Thời gian trung bình (t_WC) mà mạch bơm điện áp cao EEPROM cần để nạp điện tích vào ô nhớ cho 1 chu kỳ ghi trang.",
    note: "Trong khoảng thời gian này, bit WIP (Write In Progress) ở Thanh B giữ mức 1.",
    impact: "Ảnh hưởng đến số chu kỳ chờ trong chế độ phần cứng."
  },
  EepEraseTimeMs: {
    title: "Thời Gian Xóa Vật Lý 1 Đơn Vị Xóa (ms)",
    sws: "ECUC_Eep_00176",
    ecucPath: "Eep / EepPublishedInformation / EepEraseTime",
    type: "Integer (ms)",
    range: "1 .. 50 ms",
    typical: "5 ms",
    desc: "Thời gian phần cứng cần để xóa một đơn vị xóa (EepEraseUnitSize) về giá trị EepEraseValue (0xFF).",
    note: "Dùng để ước lượng tổng thời gian thực thi lệnh Eep_Erase().",
    impact: "Hiển thị trong thông số timing phần cứng và Inspector."
  },
  AutoEraseBeforeWrite: {
    title: "Tự Động Xóa Trước Khi Ghi (Auto Erase-Before-Write)",
    sws: "SWS_Eep_00053",
    ecucPath: "Eep / Hardware / AutoEraseBeforeWrite",
    type: "Boolean",
    range: "TRUE | FALSE",
    typical: "TRUE (EEPROM thường tự xóa byte trước khi ghi)",
    desc: "Khi TRUE, phần cứng/driver tự động xóa ô nhớ đích trước khi lập trình dữ liệu mới. Khi FALSE, Eep thực hiện Blank Check nghiêm ngặt: nếu ô nhớ chưa là EepEraseValue (0xFF) sẽ báo lỗi EEP_E_WRITE_FAILED!",
    note: "Giúp phân biệt EEPROM (thường hỗ trợ tự xóa byte-level) với bộ nhớ bắt buộc phải xóa trước bằng lệnh Erase riêng.",
    impact: "Tắt FALSE ở Kịch bản S3 What-If #0 để thử nghiệm bắt lỗi ghi đè lên vùng chưa xóa!"
  },
  EepJobEndNotificationEnabled: {
    title: "Bật Callback Báo Hoàn Tất Lên Ea",
    sws: "SWS_Eep_00051 | ECUC_Eep_00169",
    ecucPath: "Eep / EepInitConfiguration / EepJobEndNotification (Enable)",
    type: "Boolean",
    range: "TRUE | FALSE",
    typical: "TRUE",
    desc: "Bật/tắt việc gọi hàm callback lớp trên khi Job kết thúc thành công (MEMIF_JOB_OK).",
    note: "Nếu tắt FALSE, tầng Ea phải dùng chế độ Polling (EaPollingMode = TRUE) để tự hỏi Eep_GetJobResult().",
    impact: "Điều khiển xem Ea_JobEndNotification() có được kích hoạt trên Trace hay không."
  },
  EepJobEndNotification: {
    title: "Tên Hàm Callback Hoàn Tất Lên Ea",
    sws: "SWS_Eep_00141 | ECUC_Eep_00169",
    ecucPath: "Eep / EepInitConfiguration / EepJobEndNotification",
    type: "C Function Identifier",
    range: "Tên hàm hợp lệ",
    typical: "Ea_JobEndNotification",
    desc: "Tên hàm callback của tầng trên (thường là Ea_JobEndNotification trong Ea_Cbk.h) được Eep gọi ngay khi Chunk cuối cùng hoàn tất thành công.",
    note: "Xuất trực tiếp vào cấu trúc Eep_ConfigType trong Eep_PBcfg.c.",
    impact: "Cập nhật tên hàm callback hiển thị trên API Call Trace và Tab Code C."
  },
  EepJobErrorNotificationEnabled: {
    title: "Bật Callback Báo Lỗi Lên Ea",
    sws: "SWS_Eep_00052 | ECUC_Eep_00170",
    ecucPath: "Eep / EepInitConfiguration / EepJobErrorNotification (Enable)",
    type: "Boolean",
    range: "TRUE | FALSE",
    typical: "TRUE",
    desc: "Bật/tắt gọi hàm callback thông báo lỗi khi Job kết thúc với MEMIF_JOB_FAILED, MEMIF_JOB_CANCELED hoặc MEMIF_BLOCK_INCONSISTENT.",
    note: "Cần thiết để Ea và NvM nhận biết tức thời khi Eep gặp lỗi ghi/đọc hoặc so sánh lệch byte.",
    impact: "Điều khiển gọi Ea_JobErrorNotification() trong các kịch bản S6, S11, S12, S13."
  },
  EepJobErrorNotification: {
    title: "Tên Hàm Callback Báo Lỗi Lên Ea",
    sws: "SWS_Eep_00142 | ECUC_Eep_00170",
    ecucPath: "Eep / EepInitConfiguration / EepJobErrorNotification",
    type: "C Function Identifier",
    range: "Tên hàm hợp lệ",
    typical: "Ea_JobErrorNotification",
    desc: "Tên hàm callback báo lỗi được cấu hình trong Eep_ConfigType (mặc định Ea_JobErrorNotification).",
    note: "Cũng được gọi khi Eep_Cancel() hủy một Job đang pending (SWS_Eep_00031).",
    impact: "Hiển thị trong API Call Trace và code C sinh ra."
  },
  EepDemErrorReportingEnabled: {
    title: "Báo Cáo Lỗi Phần Cứng Sang Dem",
    sws: "SWS_Eep_00053 | SWS_Eep_00054",
    ecucPath: "Eep / EepDemEventParameterRefs",
    type: "Boolean",
    range: "TRUE | FALSE",
    typical: "TRUE",
    desc: "Cho phép Eep gọi Dem_SetEventStatus() để báo 4 Extended Production Errors: EEP_E_WRITE_FAILED, EEP_E_READ_FAILED, EEP_E_ERASE_FAILED, EEP_E_COMPARE_FAILED.",
    note: "Khi một thao tác thành công sau đó, Eep báo lại DEM_EVENT_STATUS_PASSED để Dem gỡ lỗi.",
    impact: "Tắt/bật báo cáo sự kiện Dem ở Kịch bản S6 và S12."
  },
  EnableWriteVerification: {
    title: "Đọc Ngược Xác Thực Sau Khi Ghi (Write Verify)",
    sws: "SWS_Eep_00054",
    ecucPath: "Eep / Safety & Verification / EnableWriteVerification",
    type: "Boolean",
    range: "TRUE | FALSE",
    typical: "TRUE (Khuyến nghị cho Automotive Safety)",
    desc: "Yêu cầu Eep_MainFunction() ngay sau khi ghi mỗi Chunk phải đọc ngược lại từ EEPROM và đối chiếu từng byte với bộ đệm RAM nguồn.",
    note: "Nếu đọc về bị sai lệch, bật Bit 1 DEM_HW_ERR_FLAG và báo ngay EEP_E_WRITE_FAILED.",
    impact: "Cốt lõi của Kịch bản S3 và S12 (Stuck Bit)."
  },
  EnableEraseVerification: {
    title: "Đọc Kiểm Tra Trắng Sau Khi Xóa (Erase Verify)",
    sws: "SWS_Eep_00053",
    ecucPath: "Eep / Safety & Verification / EnableEraseVerification",
    type: "Boolean",
    range: "TRUE | FALSE",
    typical: "TRUE",
    desc: "Yêu cầu Eep_MainFunction() sau khi xóa vùng nhớ phải đọc kiểm tra chắc chắn toàn bộ các byte đều bằng EepEraseValue (0xFF).",
    note: "Nếu phát hiện byte != EepEraseValue, báo ngay EEP_E_ERASE_FAILED sang Dem.",
    impact: "Minh họa trong Kịch bản S4."
  },
  InjectHwWriteOrEraseVerifyFail: {
    title: "Tiêm Lỗi Ô Nhớ Hỏng / Đứt Bus SPI (Verify Fail)",
    sws: "SWS_Eep_00053 | SWS_Eep_00054",
    ecucPath: "Simulator Fault Injection / HwVerifyFail",
    type: "Boolean (Fault Injection)",
    range: "FALSE (Bình thường) | TRUE (Lỗi ô nhớ / SPI)",
    typical: "FALSE",
    desc: "Giả lập ô nhớ EEPROM bị chết cổng nổi (Stuck Bit) hoặc lỗi truyền dẫn SPI khiến dữ liệu đọc về khi Verify / Read không khớp.",
    note: "Tương đương với việc gài Stuck Bit trực tiếp trên Bản đồ EEPROM.",
    impact: "Kích hoạt Dem EEP_E_WRITE_FAILED / ERASE_FAILED / READ_FAILED trong S12."
  },
  InjectHwTimeoutStuckBusy: {
    title: "Tiêm Lỗi Treo Phần Cứng WIP_HW_BUSY (Timeout)",
    sws: "SWS_Eep_00047 | EEP_E_TIMEOUT (0x05)",
    ecucPath: "Simulator Fault Injection / HwTimeoutStuckBusy",
    type: "Boolean (Fault Injection)",
    range: "FALSE | TRUE",
    typical: "FALSE",
    desc: "Giả lập thanh ghi phần cứng EEPROM bị treo cờ WIP (Write In Progress) ở mức 1 vượt quá ngưỡng EepTimeoutTicks (3 ticks).",
    note: "Khi quá hạn, Eep bật Bit 0 Thanh B (HW_TIMEOUT_ERR), phát Det_ReportRuntimeError(EEP_E_TIMEOUT = 0x05) và kết thúc MEMIF_JOB_FAILED.",
    impact: "Trọng tâm của Kịch bản S13."
  },
  TestInvalidParamMode: {
    title: "Chọn Kịch Bản Tiêm Tham Số Lỗi DET (0x01..0x0A)",
    sws: "SWS_Eep_00047",
    ecucPath: "Simulator Fault Injection / DET Param Injector",
    type: "Enum",
    range: "NONE | INVALID_ADDRESS | INVALID_LENGTH | INVALID_DATA | INIT_NULL_PTR | VERSION_NULL_PTR",
    typical: "NONE",
    desc: "Tự động gài tham số sai khi người dùng bấm các nút Quick Action (Eep_Read/Write/Erase/Compare/Init) để kiểm tra hàng rào bảo vệ DET.",
    note: "Kiểm chứng nhanh các mã lỗi EEP_E_INVALID_ADDRESS (0x01), EEP_E_INVALID_DATA (0x02), EEP_E_INVALID_LENGTH (0x03), EEP_E_INIT_FAILED (0x09), EEP_E_PARAM_POINTER (0x0A).",
    impact: "Phục vụ kiểm thử nhanh ở Kịch bản S14."
  }
};

const EEP_DRIVER_STATUS_BITS = [
  { bit: 7, mask: 0x80, tag: "EEP_INIT", name: "EEP_INITIALIZED", tone: "ok", desc: "1 = Eep_Init() xong (MEMIF_IDLE/BUSY); 0 = MEMIF_UNINIT (Báo DET EEP_E_UNINIT)." },
  { bit: 6, mask: 0x40, tag: "EEP_BUSY", name: "EEP_STATUS_BUSY", tone: "warn", desc: "1 = MEMIF_BUSY (Đang xử lý Job; gọi thêm lệnh mới bị EEP_E_BUSY); 0 = MEMIF_IDLE." },
  { bit: 5, mask: 0x20, tag: "JOB_PEND", name: "JOB_PENDING", tone: "warn", desc: "1 = Eep_GetJobResult() == MEMIF_JOB_PENDING (Còn Chunk đang chờ Eep_MainFunction)." },
  { bit: 4, mask: 0x10, tag: "JOB_OK", name: "JOB_RESULT_OK", tone: "ok", desc: "1 = Job hoàn tất thành công (MEMIF_JOB_OK), kích hoạt Ea_JobEndNotification()." },
  { bit: 3, mask: 0x08, tag: "ERR_INC", name: "JOB_ERR_OR_INCONSISTENT", tone: "err", desc: "1 = Kết quả là MEMIF_JOB_FAILED hoặc MEMIF_BLOCK_INCONSISTENT (Compare lệch)." },
  { bit: 2, mask: 0x04, tag: "CANCELED", name: "JOB_CANCELED", tone: "pur", desc: "1 = Lệnh bị hủy bởi Eep_Cancel() (MEMIF_JOB_CANCELED)." },
  { bit: 1, mask: 0x02, tag: "FAST_MD", name: "FAST_MODE_ACTV", tone: "cyan", desc: "1 = MEMIF_MODE_FAST (Chunk 64B/32B); 0 = MEMIF_MODE_SLOW (Chunk 16B/8B)." },
  { bit: 0, mask: 0x01, tag: "ISR_MD", name: "ISR_MODE_EN", tone: "pur", desc: "1 = EepUseInterrupts=TRUE (Ngắt Eep_JobEndIsr); 0 = Polling trong Eep_MainFunction()." }
];

const EEP_HW_CTRL_BITS = [
  { bit: 7, mask: 0x80, tag: "HW_RDY", name: "HW_READY_IDLE", tone: "ok", desc: "1 = Phần cứng EEPROM nội / Bus SPI rảnh sẵn sàng nhận lệnh mới." },
  { bit: 6, mask: 0x40, tag: "WEL_EN", name: "WEL_WRITE_EN", tone: "cyan", desc: "1 = Đã mở khóa ghi (SPI WREN 0x06 / Internal EECTRL.WREN); tự reset sau ghi/xóa." },
  { bit: 5, mask: 0x20, tag: "WIP_BSY", name: "WIP_HW_BUSY", tone: "warn", desc: "1 = Chip EEPROM đang nạp điện tích (Write In Progress / RDSR Bit 0)." },
  { bit: 4, mask: 0x10, tag: "ERS_OK", name: "ERASE_BLANK_OK", tone: "ok", desc: "1 = Xác thực xóa trắng (0xFF) thành công (SWS_Eep_00053)." },
  { bit: 3, mask: 0x08, tag: "WR_VRFY", name: "WRITE_VERIFY_OK", tone: "ok", desc: "1 = Đọc ngược xác thực sau ghi khớp 100% RAM (SWS_Eep_00054) hoặc Skip do giống nhau." },
  { bit: 2, mask: 0x04, tag: "CMP_MIS", name: "CMP_MISMATCH", tone: "err", desc: "1 = Eep_Compare() phát hiện byte lệch (SWS_Eep_00056 -> MEMIF_BLOCK_INCONSISTENT)." },
  { bit: 1, mask: 0x02, tag: "DEM_ERR", name: "DEM_HW_ERR_FLAG", tone: "err", desc: "1 = Đã báo lỗi phần cứng EEP_E_*_FAILED sang Dem_SetEventStatus()." },
  { bit: 0, mask: 0x01, tag: "TIMEOUT", name: "HW_TIMEOUT_ERR", tone: "err", desc: "1 = Cờ WIP_HW_BUSY treo quá hạn -> Det_ReportRuntimeError(EEP_E_TIMEOUT = 0x05)." }
];

const EEPROM_REGIONS = [
  { start: 0x00, end: 0x0F, label: "Ea Blk#1 (Calib 16B)", kind: "EA_CALIB" },
  { start: 0x10, end: 0x1F, label: "Ea Blk#2a (Dataset0)", kind: "EA_DS0" },
  { start: 0x20, end: 0x2F, label: "Ea Blk#2b (Dataset1)", kind: "EA_DS1" },
  { start: 0x30, end: 0x3F, label: "Ea Blk#3 Wear Slt0-1", kind: "EA_WEAR01" },
  { start: 0x40, end: 0x4F, label: "Ea Blk#3 Wear Slt2-3", kind: "EA_WEAR23" },
  { start: 0x50, end: 0x5F, label: "Ea Blk#4 (Immed 16B)", kind: "EA_IMM" },
  { start: 0x60, end: 0xFF, label: "Raw Eep Test / Free", kind: "RAW_FREE" }
];

const MODULES_INFO = {
  MOD_SWC: {
    id: "MOD_SWC",
    name: "SWC_App & SWC_Diag (Application Layer)",
    layer: "01_Application",
    role: "Thành phần phần mềm ứng dụng chứa nghiệp vụ xe (Odometer, Calibration, Crash Data, UDS 0x2E). Không bao giờ gọi trực tiếp Eep Driver.",
    inputs: "Sự kiện ứng dụng, bộ đệm RAM dữ liệu (RamBlockData), và thông báo hoàn tất Rte_Call_NvMNotifyJobFinished_* từ RTE.",
    processing: "Chuẩn bị dữ liệu trong RAM và yêu cầu dịch vụ NVRAM thông qua Client-Server Port NvMService của RTE.",
    outputs: "Gọi xuống RTE: Rte_Call_NvMService_<Block>_ReadBlock / WriteBlock / EraseNvBlock.",
    apis: [
      "Std_ReturnType Rte_Call_NvMService_Blk_WriteBlock(const void* SrcPtr)",
      "Std_ReturnType Rte_Call_NvMService_Blk_ReadBlock(void* DstPtr)",
      "Std_ReturnType Rte_Call_NvMService_Blk_EraseNvBlock(void)",
      "void Rte_Call_NvMNotifyJobFinished_JobFinished(uint8 ServiceId, NvM_RequestResultType JobResult)"
    ]
  },
  MOD_RTE: {
    id: "MOD_RTE",
    name: "RTE (Runtime Environment)",
    layer: "02_RTE",
    role: "Cầu nối chuẩn hóa tách biệt phần mềm ứng dụng (SWC) khỏi tầng dịch vụ BSW (NvM), đảm bảo SWC độc lập với phần cứng EEPROM/Flash.",
    inputs: "Lời gọi Client-Server Port từ SWC và Callback hoàn tất từ NvM.",
    processing: "Chuyển đổi lời gọi Port thành hàm C trực tiếp vào NvM kèm tham số NvM_BlockIdType tương ứng.",
    outputs: "Gọi xuống NvM: NvM_ReadBlock(), NvM_WriteBlock(), NvM_EraseNvBlock().",
    apis: [
      "Std_ReturnType NvM_ReadBlock(NvM_BlockIdType BlockId, void* NvM_DstPtr)",
      "Std_ReturnType NvM_WriteBlock(NvM_BlockIdType BlockId, const void* NvM_SrcPtr)",
      "Std_ReturnType NvM_EraseNvBlock(NvM_BlockIdType BlockId)"
    ]
  },
  MOD_NVM: {
    id: "MOD_NVM",
    name: "NvM (NVRAM Manager — ModuleId 20)",
    layer: "03_Services (Memory Services)",
    role: "Quản lý hàng đợi ưu tiên (Standard vs Immediate), tính/kiểm tra CRC, thử lại khi lỗi (Write Retries), quản lý Dataset Index và chạy ReadAll/WriteAll.",
    inputs: "Yêu cầu từng Block từ RTE/Dcm/Dem, lệnh ReadAll/WriteAll từ EcuM/BswM, Callback NvM_JobEndNotification/ErrorNotification từ Ea.",
    processing: "Ánh xạ (BlockId, DataIndex) thành (DeviceIndex=0, EaBlockNumber) rồi chuyển xuống MemIf. Thực hiện thử lại nếu Eep/Ea báo lỗi.",
    outputs: "Gọi xuống MemIf: MemIf_Read / Write / EraseImmediateBlock / Cancel / SetMode.",
    apis: [
      "void NvM_ReadAll(void) / void NvM_WriteAll(void)",
      "void NvM_JobEndNotification(void)",
      "void NvM_JobErrorNotification(void)"
    ]
  },
  MOD_MEMIF: {
    id: "MOD_MEMIF",
    name: "MemIf (Memory Abstraction Interface — ModuleId 22)",
    layer: "04_ECU_Abstraction",
    role: "Bộ định tuyến hợp nhất (Multiplexer) giữa NvM với các module trừu tượng bộ nhớ bên dưới: Ea (EEPROM) và Fee (Flash).",
    inputs: "Lời gọi MemIf_* từ NvM kèm tham số DeviceIndex (0 = Ea, 1 = Fee).",
    processing: "Nếu chỉ có 1 thiết bị, biên dịch thành Macro trực tiếp sang Ea_*. Nếu có >= 2 thiết bị, tra bảng con trỏ hàm theo DeviceIndex.",
    outputs: "Định tuyến trực tiếp xuống Ea (khi DeviceIndex == 0): Ea_Read, Ea_Write, Ea_EraseImmediateBlock, Ea_Cancel, Ea_SetMode.",
    apis: [
      "Std_ReturnType MemIf_Read(uint8 DeviceIndex, uint16 BlockNumber, uint16 BlockOffset, uint8* DataBufferPtr, uint16 Length)",
      "Std_ReturnType MemIf_Write(uint8 DeviceIndex, uint16 BlockNumber, const uint8* DataBufferPtr)",
      "void MemIf_SetMode(MemIf_ModeType Mode)"
    ]
  },
  MOD_EA: {
    id: "MOD_EA",
    name: "Ea (EEPROM Abstraction — Caller Trực Tiếp Của Eep, ModuleId 40)",
    layer: "04_ECU_Abstraction",
    role: "Lớp trên gọi trực tiếp duy nhất xuống Eep Driver. Che giấu địa chỉ vật lý bằng Logical Block, căn chỉnh VirtualPage, quản lý Header/Footer và Wear-Leveling.",
    inputs: "Lệnh từ MemIf (BlockNumber, Offset, Length) và Callback Ea_JobEndNotification / Ea_JobErrorNotification từ Eep.",
    processing: "Chuyển Logical BlockNumber thành địa chỉ vật lý Eep_AddressType; tách 1 lệnh Ea_Write() thành 3 Sub-Jobs gọi xuống Eep_Write() (Header 0xA5 -> Data Payload -> Footer 0x5A).",
    outputs: "Gọi trực tiếp xuống Eep: Eep_Read, Eep_Write, Eep_Erase, Eep_Compare, Eep_Cancel, Eep_SetMode.",
    apis: [
      "void Ea_JobEndNotification(void)   /* Callback từ Eep [SWS_Eep_00141] */",
      "void Ea_JobErrorNotification(void) /* Callback từ Eep [SWS_Eep_00142] */",
      "Std_ReturnType Ea_Write(uint16 BlockNumber, const uint8* DataBufferPtr)"
    ]
  },
  MOD_EEP: {
    id: "MOD_EEP",
    name: "Eep Driver (EEPROM Driver — Trọng Tâm MCAL, ModuleId 90 / 0x005A)",
    layer: "05_MCAL",
    role: "Trình điều khiển phần cứng EEPROM cấp thấp: đọc, ghi, xóa, so sánh theo địa chỉ vật lý tuyến tính; chia nhỏ Chunk theo Mode SLOW/FAST; kiểm chứng Verify & Cycle Reduction.",
    inputs: "Lời gọi Eep_Read/Write/Erase/Compare/Cancel/SetMode từ Ea, Eep_Init từ EcuM, nhịp Eep_MainFunction từ SchM (hoặc ISR), trạng thái WIP/Dữ liệu từ EEPROM/SPI.",
    processing: "Kiểm tra tham số DET/Runtime -> Lưu con trỏ CurrentAddr/RemainingLen -> Mỗi chu kỳ Eep_MainFunction() xử lý 1 Chunk (SLOW: Rd16/Wr8B, FAST: Rd64/Wr32B) -> Verify sau ghi/xóa -> Báo Ea_JobEnd/ErrorNotification.",
    outputs: "Điều khiển thanh ghi EEPROM nội hoặc Spi_AsyncTransmit(), gọi Ea_JobEndNotification()/Ea_JobErrorNotification(), báo lỗi sang Det và Dem.",
    apis: [
      "void Eep_Init(const Eep_ConfigType* ConfigPtr) [SWS_Eep_00146]",
      "void Eep_SetMode(MemIf_ModeType Mode) [SWS_Eep_00147]",
      "Std_ReturnType Eep_Read(Eep_AddressType EepromAddress, uint8* DataBufferPtr, Eep_LengthType Length) [SWS_Eep_00148]",
      "Std_ReturnType Eep_Write(Eep_AddressType EepromAddress, const uint8* DataBufferPtr, Eep_LengthType Length) [SWS_Eep_00149]",
      "Std_ReturnType Eep_Erase(Eep_AddressType EepromAddress, Eep_LengthType Length) [SWS_Eep_00150]",
      "Std_ReturnType Eep_Compare(Eep_AddressType EepromAddress, const uint8* DataBufferPtr, Eep_LengthType Length) [SWS_Eep_00151]",
      "void Eep_Cancel(void) [SWS_Eep_00152] · Eep_GetStatus() · Eep_GetJobResult() · Eep_MainFunction()"
    ]
  },
  MOD_SPI_HW: {
    id: "MOD_SPI_HW",
    name: "Spi Driver & Physical EEPROM Hardware (Internal / External SPI)",
    layer: "05_MCAL / ECU Hardware",
    role: "Thực thi lệnh đọc/xóa/lập trình vật lý xuống ô nhớ silicon: qua thanh ghi nội vi MCU (EECTRL/EESTAT) hoặc chip EEPROM ngoài qua bus SPI (25LC256/M95256).",
    inputs: "Thanh ghi điều khiển nội bộ hoặc khung truyền SPI từ Eep (Spi_SetupEB + Spi_AsyncTransmit): WREN (0x06), WRITE (0x02), READ (0x03), RDSR (0x05).",
    processing: "Chốt Write Enable Latch (WEL=1), bơm điện áp cao lập trình trang (kéo WIP=1 trong ~5ms), hạ WIP=0 khi xong hoặc kẹt nếu lỗi phần cứng.",
    outputs: "Trả dữ liệu đọc từ ô nhớ, thanh ghi trạng thái RDSR/EESTAT và ngắt hoàn tất về Eep Driver Core.",
    apis: [
      "Std_ReturnType Spi_SetupEB(Spi_ChannelType Channel, const Spi_DataBufferType* Src, Spi_DataBufferType* Des, Spi_NumberOfDataType Len)",
      "Std_ReturnType Spi_AsyncTransmit(Spi_SequenceType Sequence) [SWS_Eep_00116]",
      "Spi_SeqResultType Spi_GetSequenceResult(Spi_SequenceType Sequence)"
    ]
  },
  MOD_ECUM: {
    id: "MOD_ECUM",
    name: "EcuM & BswM (ECU State & BSW Mode Manager)",
    layer: "03_Services (System Services)",
    role: "Khởi tạo trình điều khiển Eep ở giai đoạn khởi động sớm và điều phối tốc độ FAST/SLOW khi chạy NvM_ReadAll/WriteAll.",
    inputs: "Chuỗi pha khởi động EcuM_AL_DriverInitOne và trạng thái Shutdown.",
    processing: "Gọi Eep_Init(&Eep_Config) trước khi gọi Ea_Init(), bảo đảm phần cứng EEPROM sẵn sàng trước khi đọc dữ liệu NVRAM.",
    outputs: "Gọi Eep_Init(&Eep_Config) và kích hoạt NvM_ReadAll / MemIf_SetMode.",
    apis: [
      "void Eep_Init(const Eep_ConfigType* ConfigPtr)",
      "void Ea_Init(const Ea_ConfigType* ConfigPtr)"
    ]
  },
  MOD_SCHM: {
    id: "MOD_SCHM",
    name: "SchM & AUTOSAR OS (Scheduler & Interrupts)",
    layer: "03_Services (RTE/OS)",
    role: "Lập lịch chu kỳ gọi hàm Eep_MainFunction() (mặc định 5ms), cung cấp vùng găng khóa ngắt (Exclusive Area) và phục vụ ISR nếu EepUseInterrupts=TRUE.",
    inputs: "Ngắt bộ định thời OS Tick (5ms) hoặc ngắt phần cứng hoàn tất EEPROM/SPI.",
    processing: "Gọi tuần tự NvM_MainFunction() -> Ea_MainFunction() -> Eep_MainFunction(), hoặc gọi trực tiếp Eep_JobEndIsr().",
    outputs: "Kích hoạt Eep_MainFunction() [SWS_Eep_00155] và Exclusive Area.",
    apis: [
      "void Eep_MainFunction(void) [SWS_Eep_00155]",
      "ISR(Eep_JobEndIsr) [SWS_Eep_00117]",
      "void SchM_Enter_Eep_EEP_EXCLUSIVE_AREA_0(void) / SchM_Exit_Eep_EEP_EXCLUSIVE_AREA_0(void)"
    ]
  },
  MOD_DET: {
    id: "MOD_DET",
    name: "DET (Default Error Tracer) & DEM (Diagnostic Event Manager)",
    layer: "03_Services (Diagnostic & Error)",
    role: "DET (Mod 90) ghi nhận lỗi tham số lập trình và lỗi Runtime (BUSY/TIMEOUT); DEM ghi nhận lỗi phần cứng vật lý (EEP_E_*_FAILED).",
    inputs: "Det_ReportError(), Det_ReportRuntimeError() và Dem_SetEventStatus() từ Eep Driver.",
    processing: "DET lưu lỗi API không hợp lệ (0x00..0x0A) và lỗi Runtime (0x04 BUSY, 0x05 TIMEOUT); DEM lưu DTC cho 4 sự kiện lỗi phần cứng.",
    outputs: "Hiển thị cảnh báo lỗi tức thời trên API Call Trace, Fault Log và các bit cờ trên Thanh A/B.",
    apis: [
      "Std_ReturnType Det_ReportError(90, 0, ApiId, ErrorId) /* 0x00..0x0A */",
      "Std_ReturnType Det_ReportRuntimeError(90, 0, ApiId, ErrorId) /* 0x04 BUSY, 0x05 TIMEOUT */",
      "Std_ReturnType Dem_SetEventStatus(EEP_E_WRITE/READ/ERASE/COMPARE_FAILED, FAILED/PASSED)"
    ]
  }
};
