// ================= PART 3: CONSTANTS, 36 ECUC PARAMETERS, TOOLTIP METADATA, BITFIELDS & MODULES =================

const EA_MODULE_ID = 40; // 0x0028

const defaultConfig = {
  // Tab 0: EaGeneral (8)
  EaInitialized: true,
  EaDevErrorDetect: true,
  EaVersionInfoApi: true,
  EaPollingMode: false,
  EaSetModeSupported: true,
  EaVirtualPageSize: "8",
  EaIndex: 0,
  EaMainFunctionPeriod: 5,
  // Tab 1: Callbacks & Mode (6)
  EaNvmJobEndNotificationEnabled: true,
  EaNvmJobEndNotification: "NvM_JobEndNotification",
  EaNvmJobErrorNotificationEnabled: true,
  EaNvmJobErrorNotification: "NvM_JobErrorNotification",
  CurrentMemIfMode: "MEMIF_MODE_SLOW",
  EaBufferAlignmentValue: "4",
  // Tab 2: Block #1 & #2 (6)
  Blk1_BlockNumber: 1,
  Blk1_BlockSize: 12,
  Blk1_ImmediateData: false,
  Blk2_BaseBlockNumber: 2,
  Blk2_BlockSize: 8,
  Blk2_SelectedDatasetIndex: "0",
  // Tab 3: Block #3 & #4 (6)
  Blk3_BlockNumber: 4,
  Blk3_BlockSize: 4,
  Blk3_NumberOfWriteCycles: 400000,
  Blk4_BlockNumber: 5,
  Blk4_BlockSize: 10,
  Blk4_ImmediateData: true,
  // Tab 4: Overhead & Eep (5)
  EaBlockOverhead: 4,
  EaPageOverhead: 0,
  EepAllowedWriteCycles: 100000,
  EepBaseAddress: "0x0000",
  EepChunkSizeMode: "8_32",
  // Tab 5: Fault Injection (5)
  SimulatePowerLossMidWrite: false,
  InjectEepHardwareError: false,
  AutoVerifyAfterWrite: false,
  StrictImmediateEraseCheck: false,
  TestInvalidParamMode: "NONE"
};

const configTooltipData = {
  EaInitialized: {
    title: "Trạng Thái Khởi Tạo Module Ea (Ea_Init)",
    sws: "SWS_Ea_00084 | SWS_Ea_00129",
    ecucPath: "Ea / Runtime State / Ea_Init(NULL_PTR)",
    range: "TRUE (MEMIF_IDLE) | FALSE (MEMIF_UNINIT)",
    role: "Điều khiển trạng thái khởi tạo toàn cục của module Ea (Bit 7 EA_INIT trên Thanh A).",
    mechanism: "Khi Ea_Init(NULL_PTR) được gọi từ EcuM, Ea quét bảng ánh xạ Block, đặt trạng thái MEMIF_IDLE. Nếu tắt về FALSE (MEMIF_UNINIT), mọi lời gọi API (trừ GetStatus/GetVersionInfo) sẽ bị từ chối và báo lỗi DET.",
    scenarioImpact: "Bỏ tích để kiểm thử mã lỗi EA_E_UNINIT (0x01) trong Kịch bản S1 và S14."
  },
  EaDevErrorDetect: {
    title: "Bật Phát Hiện Lỗi Phát Triển & Runtime (DET)",
    sws: "SWS_Ea_00049 | ECUC_Ea_00038",
    ecucPath: "Ea / EaGeneral / EaDevErrorDetect",
    range: "BOOLEAN (TRUE | FALSE)",
    role: "Bật/tắt cơ chế kiểm tra tham số đầu vào và báo lỗi về Default Error Tracer (ModuleId = 40).",
    mechanism: "Khi TRUE, Ea kiểm tra NULL_PTR, BlockNumber hợp lệ (khác 0x0000/0xFFFF), BlockOffset < BlockSize, Length, và phát Det_ReportError(). Lỗi Runtime (EA_E_BUSY, EA_E_INVALID_CANCEL) phát qua Det_ReportRuntimeError().",
    scenarioImpact: "Tắt để thấy Ea bỏ qua hàng rào kiểm tra Development Error trong S14."
  },
  EaVersionInfoApi: {
    title: "Kích Hoạt API Đọc Phiên Bản Module",
    sws: "SWS_Ea_00092 | ECUC_Ea_00121",
    ecucPath: "Ea / EaGeneral / EaVersionInfoApi",
    range: "BOOLEAN (TRUE | FALSE)",
    role: "Biên dịch và cho phép gọi hàm Ea_GetVersionInfo(Std_VersionInfoType* VersionInfoPtr).",
    mechanism: "Trả về vendorID, moduleID (40) và sw_major/minor/patch_version chuẩn AUTOSAR R23-11. Kiểm tra EA_E_INVALID_DATA_PTR nếu truyền NULL_PTR.",
    scenarioImpact: "Ảnh hưởng đến khả năng gọi Ea_GetVersionInfo() ở S1 và S14."
  },
  EaPollingMode: {
    title: "Chế Độ Hỏi Vòng Eep (Polling vs Callback)",
    sws: "SWS_Ea_00095 | ECUC_Ea_00039",
    ecucPath: "Ea / EaGeneral / EaPollingMode",
    range: "FALSE (Callback Mode) | TRUE (Polling Mode)",
    role: "Quyết định cách Ea nhận biết trình điều khiển Eep đã hoàn tất Sub-Job đọc/ghi/xóa hay chưa.",
    mechanism: "FALSE: Eep chủ động gọi callback Ea_JobEndNotification() / Ea_JobErrorNotification(). TRUE: Các callback này tắt; Ea_MainFunction() chủ động gọi Eep_GetJobResult() mỗi chu kỳ.",
    scenarioImpact: "Bật TRUE ở Kịch bản S11 để quan sát sự thay đổi của Bit 0 Thanh A và chuỗi API Trace."
  },
  EaSetModeSupported: {
    title: "Cho Phép Chuyển Đổi Tốc Độ Ea_SetMode()",
    sws: "SWS_Ea_00085 | ECUC_Ea_00120",
    ecucPath: "Ea / EaGeneral / EaSetModeSupported",
    range: "BOOLEAN (TRUE | FALSE)",
    role: "Bật/tắt hỗ trợ API Ea_SetMode(MemIf_ModeType Mode) để chuyển SLOW ↔ FAST.",
    mechanism: "Khi TRUE, Ea cho phép NvM/BswM chuyển đổi giữa MEMIF_MODE_SLOW (8B/tick) và MEMIF_MODE_FAST (32B/tick) bằng cách gọi tiếp Eep_SetMode(Mode) khi Ea đang MEMIF_IDLE.",
    scenarioImpact: "Nếu tắt FALSE, nút và lệnh Ea_SetMode() trong S10 sẽ bị vô hiệu hóa."
  },
  EaVirtualPageSize: {
    title: "Kích Thước Trang Ảo Căn Chỉnh Địa Chỉ",
    sws: "SWS_Ea_00051 | ECUC_Ea_00070",
    ecucPath: "Ea / EaGeneral / EaVirtualPageSize",
    range: "1 | 4 | 8 | 16 | 32 (bytes)",
    role: "Đơn vị trang ảo mà tổng kích thước vật lý mỗi Logical Block (Data + Overhead) phải làm tròn lên bội số.",
    mechanism: "AlignedSize = ceil((EaBlockSize + EaBlockOverhead) / EaVirtualPageSize) * EaVirtualPageSize. Các byte dư ở cuối trở thành Padding Bytes (0xFF) trên EEPROM.",
    scenarioImpact: "Thay đổi từ 8B sang 4B hoặc 16B sẽ tính lại ngay toàn bộ bảng địa chỉ vật lý và Padding trong S1 và S4!"
  },
  EaIndex: {
    title: "Chỉ Số Thiết Bị Đăng Ký Với MemIf",
    sws: "SWS_MemIf_00018 | ECUC_Ea_00119",
    ecucPath: "Ea / EaGeneral / EaIndex",
    range: "0 .. 254 (Mặc định: 0)",
    role: "DeviceIndex định danh thể hiện (Instance) của module Ea trong bảng định tuyến MemIf.",
    mechanism: "NvM truyền cặp (DeviceIndex, BlockNumber) xuống MemIf; khi DeviceIndex khớp EaIndex, MemIf định tuyến lệnh xuống Ea_*().",
    scenarioImpact: "Hiển thị trong code sinh Ea_Cfg.h / Ea.arxml và bước định tuyến MemIf."
  },
  EaMainFunctionPeriod: {
    title: "Chu Kỳ Gọi Hàm Định Kỳ Ea_MainFunction()",
    sws: "SWS_Ea_00097 | ECUC_Ea_00125",
    ecucPath: "Ea / EaGeneral / EaMainFunctionPeriod",
    range: "1 .. 50 ms (Typical: 5 ms)",
    role: "Khoảng thời gian giữa các lần SchM kích hoạt Ea_MainFunction() để đẩy máy trạng thái Sub-Job.",
    mechanism: "Mỗi lần nhấn +5ms MainFn (hoặc Auto Clock), đồng hồ tăng thêm đúng EaMainFunctionPeriod ms và thực hiện bước chuyển tiếp Ea → Eep.",
    scenarioImpact: "Điều chỉnh bước nhảy thời gian trên đồng hồ mô phỏng."
  },
  EaNvmJobEndNotificationEnabled: {
    title: "Bật Callback Báo Hoàn Tất Lên NvM",
    sws: "SWS_Ea_00054 | ECUC_Ea_00072",
    ecucPath: "Ea / EaGeneral / EaNvmJobEndNotification (Enable)",
    range: "BOOLEAN (TRUE | FALSE)",
    role: "Cho phép Ea gọi hàm thông báo khi công việc hoàn thành thành công (MEMIF_JOB_OK).",
    mechanism: "Nếu TRUE, ngay khi kết thúc Job thành công, Ea gọi tên hàm cấu hình trong EaNvmJobEndNotification (thường là NvM_JobEndNotification).",
    scenarioImpact: "Tắt đi để thấy NvM phải tự hỏi trạng thái bằng Polling (MemIf_GetJobResult)."
  },
  EaNvmJobEndNotification: {
    title: "Tên Hàm Callback Hoàn Tất Công Việc",
    sws: "SWS_Ea_00054 | ECUC_Ea_00072",
    ecucPath: "Ea / EaGeneral / EaNvmJobEndNotification",
    range: "C Function Identifier (Typical: NvM_JobEndNotification)",
    role: "Con trỏ hàm lớp trên được Ea gọi khi kết thúc Job với kết quả MEMIF_JOB_OK.",
    mechanism: "Được xuất trực tiếp vào Ea_Lcfg.c và hiển thị trong API Call Trace khi Job hoàn thành.",
    scenarioImpact: "Cập nhật tên hàm callback trong Trace và Inspector Code C."
  },
  EaNvmJobErrorNotificationEnabled: {
    title: "Bật Callback Báo Lỗi Công Việc Lên NvM",
    sws: "SWS_Ea_00056 | ECUC_Ea_00073",
    ecucPath: "Ea / EaGeneral / EaNvmJobErrorNotification (Enable)",
    range: "BOOLEAN (TRUE | FALSE)",
    role: "Cho phép Ea gọi hàm báo lỗi lên NvM khi Job không đạt MEMIF_JOB_OK.",
    mechanism: "Áp dụng cho cả 4 kết quả bất thường: MEMIF_JOB_FAILED, MEMIF_JOB_CANCELED, MEMIF_BLOCK_INCONSISTENT và MEMIF_BLOCK_INVALID.",
    scenarioImpact: "Giúp NvM nhận biết ngay để nạp ROM Default hoặc thực hiện Write Retry trong S5, S6, S12, S13."
  },
  EaNvmJobErrorNotification: {
    title: "Tên Hàm Callback Báo Lỗi Lên Lớp Trên",
    sws: "SWS_Ea_00056 | ECUC_Ea_00073",
    ecucPath: "Ea / EaGeneral / EaNvmJobErrorNotification",
    range: "C Function Identifier (Typical: NvM_JobErrorNotification)",
    role: "Con trỏ hàm lớp trên được Ea gọi khi Job kết thúc với trạng thái lỗi / hủy / không hợp lệ.",
    mechanism: "Được gọi từ ngữ cảnh Ea_MainFunction() ngay sau khi chốt MemIf_JobResultType.",
    scenarioImpact: "Cập nhật tên hàm callback báo lỗi trên Trace và Code C."
  },
  CurrentMemIfMode: {
    title: "Chế Độ Tốc Độ Truyền Tải Hiện Hành",
    sws: "SWS_Ea_00085 | MemIf_ModeType",
    ecucPath: "Ea / Runtime Mode / MemIf_ModeType",
    range: "MEMIF_MODE_SLOW | MEMIF_MODE_FAST",
    role: "Quy định tốc độ đọc/ghi từng khối byte của Eep Driver.",
    mechanism: "MEMIF_MODE_SLOW giảm tải SPI/CPU trong chế độ RUN bình thường; MEMIF_MODE_FAST tăng gấp 4x số byte chuyển mỗi chu kỳ để tăng tốc NvM_ReadAll/WriteAll.",
    scenarioImpact: "Thay đổi ngay số chu kỳ MainFunction cần thiết để ghi/đọc xong Block trong S10."
  },
  EaBufferAlignmentValue: {
    title: "Ràng Buộc Căn Chỉnh Bộ Đệm RAM (DMA/CPU)",
    sws: "SWS_Ea_00051 | EaPublishedInformation",
    ecucPath: "Ea / EaPublishedInformation / EaBufferAlignmentValue",
    range: "1 | 2 | 4 (bytes)",
    role: "Thông báo cho NvM biết địa chỉ RAM Buffer truyền xuống Ea phải chia hết cho bao nhiêu byte.",
    mechanism: "Giúp tối ưu hóa truy cập bộ nhớ 32-bit hoặc truyền DMA qua SPI khi đọc/ghi EEPROM ngoài.",
    scenarioImpact: "Xuất vào Ea_Cfg.h và hiển thị trong bảng kiểm tra cấu hình."
  },
  Blk1_BlockNumber: {
    title: "Mã Định Danh Logical Block #1 (Calibration)",
    sws: "SWS_Ea_00006 | ECUC_Ea_00040",
    ecucPath: "Ea / EaBlockConfiguration[0] / EaBlockNumber",
    range: "1 .. 65534 (0x0001 .. 0xFFFE; cấm 0x0000 và 0xFFFF)",
    role: "Khóa nhận diện duy nhất của khối Blk_Calibration mà NvM/MemIf dùng để gọi Ea_Read/Write.",
    mechanism: "AUTOSAR cấm giá trị 0x0000 và 0xFFFF vì chúng được dành riêng làm dấu hiệu điều khiển nội bộ.",
    scenarioImpact: "Nếu đặt bằng 0 hoặc 65535 sẽ kích hoạt cảnh báo vi phạm SWS_Ea_00006."
  },
  Blk1_BlockSize: {
    title: "Kích Thước Dữ Liệu User Khối #1 (Bytes)",
    sws: "ECUC_Ea_00042",
    ecucPath: "Ea / EaBlockConfiguration[0] / EaBlockSize",
    range: "2 .. 32 bytes (Mặc định: 12 B)",
    role: "Độ dài dữ liệu ứng dụng (User Payload) của Blk_Calibration (chưa tính EaBlockOverhead).",
    mechanism: "Tổng chiếm dụng vật lý = ceil((Blk1_BlockSize + EaBlockOverhead) / EaVirtualPageSize) * EaVirtualPageSize.",
    scenarioImpact: "Thay đổi kích thước sẽ dịch chuyển địa chỉ vật lý của toàn bộ các khối đứng sau trên bản đồ EEPROM!"
  },
  Blk1_ImmediateData: {
    title: "Cờ Dữ Liệu Khẩn Cấp Cho Block #1",
    sws: "SWS_Ea_00064 | ECUC_Ea_00118",
    ecucPath: "Ea / EaBlockConfiguration[0] / EaImmediateData",
    range: "BOOLEAN (Mặc định: FALSE)",
    role: "Cho phép hay cấm dùng dịch vụ Ea_EraseImmediateBlock() trên Block #1.",
    mechanism: "Khi FALSE, mọi lời gọi Ea_EraseImmediateBlock(1) đều bị từ chối với lỗi DET EA_E_INVALID_BLOCK_NO (0x02).",
    scenarioImpact: "Thử nghiệm từ chối EraseImmediate trên Block thường trong Kịch bản S9."
  },
  Blk2_BaseBlockNumber: {
    title: "Mã Block Cơ Sở Cho Tập Dataset #2 (Idx 0 & 1)",
    sws: "SWS_Ea_00003 | ECUC_Ea_00040",
    ecucPath: "Ea / EaBlockConfiguration[1..2] / EaBlockNumber",
    range: "2 .. 65530 (Mặc định: 2 -> Idx 0 = #2, Idx 1 = #3)",
    role: "Mã Block cơ sở tương ứng với 2 phần tử Dataset liên tiếp do NvM ánh xạ xuống.",
    mechanism: "NvM tính EaBlockNumber = (BaseNumber << DatasetSelectionBits) | DataIndex, tạo thành Block #2 (Index 0) và Block #3 (Index 1).",
    scenarioImpact: "Minh họa trực quan trong Kịch bản S4."
  },
  Blk2_BlockSize: {
    title: "Kích Thước Mỗi Phần Tử Dataset #2 (Bytes)",
    sws: "ECUC_Ea_00042",
    ecucPath: "Ea / EaBlockConfiguration[1..2] / EaBlockSize",
    range: "2 .. 24 bytes (Mặc định: 8 B)",
    role: "Kích thước phần dữ liệu của mỗi bản ghi trong cặp Dataset[0] và Dataset[1].",
    mechanism: "Với Size=8B + Overhead=4B = 12B, khi EaVirtualPageSize=8B, mỗi bản ghi sẽ tự động căn tròn lên 16B (2 Pages + 4B Padding).",
    scenarioImpact: "Quan sát sự biến mất của Padding Bytes khi đổi EaVirtualPageSize = 4B trong S4."
  },
  Blk2_SelectedDatasetIndex: {
    title: "Chỉ Số Phần Tử Dataset Đang Chọn Từ NvM",
    sws: "SWS_NvM / Dataset Block",
    ecucPath: "NvM / NvMBlockDescriptor / DataIndex (0 or 1)",
    range: "0 (Dataset[0] VALID) | 1 (Dataset[1] INVALID)",
    role: "Chọn phần tử Dataset đang được NvM truy vấn xuống Ea.",
    mechanism: "Index 0 ánh xạ vào Block #2 (đang VALID); Index 1 ánh xạ vào Block #3 (đang ở trạng thái INVALID 0x0000).",
    scenarioImpact: "Chuyển từ 0 sang 1 trong S4 để thấy Ea_Read() trả về MEMIF_BLOCK_INVALID."
  },
  Blk3_BlockNumber: {
    title: "Mã Định Danh Logical Block #3 (Odometer Wear-Level)",
    sws: "ECUC_Ea_00040",
    ecucPath: "Ea / EaBlockConfiguration[3] / EaBlockNumber",
    range: "1 .. 65534 (Mặc định: 4)",
    role: "Mã Block của khối dữ liệu có tần suất ghi cực cao (số km Odometer).",
    mechanism: "Dùng để truy xuất vào vùng nhớ nhiều Slots vật lý của Blk_Odometer_Wear.",
    scenarioImpact: "Khối trọng tâm của Kịch bản S7 và S8."
  },
  Blk3_BlockSize: {
    title: "Kích Thước Dữ Liệu Khối Odometer #3 (Bytes)",
    sws: "ECUC_Ea_00042",
    ecucPath: "Ea / EaBlockConfiguration[3] / EaBlockSize",
    range: "2 .. 16 bytes (Mặc định: 4 B)",
    role: "Độ dài payload 32-bit lưu số công-tơ-mét của xe.",
    mechanism: "4B Data + 4B Overhead = 8B (vừa khít 1 Virtual Page 8B nên 4 Slots chỉ tốn đúng 32 bytes EEPROM!).",
    scenarioImpact: "Tính toán lại kích thước từng Slot khi đổi Blk3_BlockSize."
  },
  Blk3_NumberOfWriteCycles: {
    title: "Tổng Chu Kỳ Ghi Yêu Cầu (Wear-Leveling)",
    sws: "SWS_Ea_00005 | ECUC_Ea_00116",
    ecucPath: "Ea / EaBlockConfiguration[3] / EaNumberOfWriteCycles",
    range: "50,000 .. 800,000 (Mặc định: 400,000)",
    role: "Số lần ghi tối đa trong suốt vòng đời xe mà ứng dụng đòi hỏi cho khối này.",
    mechanism: "Số Slot vật lý = ceil(EaNumberOfWriteCycles / EepAllowedWriteCycles). Với 400k / 100k = 4 Slots, mỗi lần Ea_Write() luân chuyển sang Slot kế tiếp!",
    scenarioImpact: "Giảm về 100,000 để xem Block #3 thu gọn từ 4 Slots về 1 Slot và tắt Bit 1 WEAR_RT trong S7."
  },
  Blk4_BlockNumber: {
    title: "Mã Định Danh Khối Khẩn Cấp #4 (Crash Data)",
    sws: "ECUC_Ea_00040",
    ecucPath: "Ea / EaBlockConfiguration[4] / EaBlockNumber",
    range: "1 .. 65534 (Mặc định: 5)",
    role: "Mã Logical Block lưu dữ liệu sự cố va chạm túi khí khẩn cấp.",
    mechanism: "Đi kèm ưu tiên hàng đợi Immediate của NvM và lệnh xóa trước Ea_EraseImmediateBlock(5).",
    scenarioImpact: "Khối trọng tâm của Kịch bản S9."
  },
  Blk4_BlockSize: {
    title: "Kích Thước Dữ Liệu Khối Khẩn Cấp #4 (Bytes)",
    sws: "ECUC_Ea_00042",
    ecucPath: "Ea / EaBlockConfiguration[4] / EaBlockSize",
    range: "2 .. 24 bytes (Mặc định: 10 B)",
    role: "Độ dài bản ghi va chạm khẩn cấp (vận tốc, góc lái, gia tốc tại thời điểm kích nổ).",
    mechanism: "10B + 4B Overhead = 14B ➔ Căn tròn lên 2 Virtual Pages = 16B trên EEPROM.",
    scenarioImpact: "Thay đổi kích thước vùng EEPROM được xóa bởi Ea_EraseImmediateBlock()."
  },
  Blk4_ImmediateData: {
    title: "Đánh Dấu Dữ Liệu Khẩn Cấp (EaImmediateData)",
    sws: "SWS_Ea_00064 | ECUC_Ea_00118",
    ecucPath: "Ea / EaBlockConfiguration[4] / EaImmediateData",
    range: "BOOLEAN (Mặc định: TRUE)",
    role: "Khai báo Block #4 là dữ liệu khẩn cấp có quyền xóa trước vùng nhớ bằng Ea_EraseImmediateBlock().",
    mechanism: "Bật Bit 3 IMM_DATA_BLOCK trên Thanh B. Nếu tắt FALSE, lời gọi Ea_EraseImmediateBlock(5) sẽ bị chặn bởi lỗi DET EA_E_INVALID_BLOCK_NO.",
    scenarioImpact: "Thử tắt FALSE trong S9 để xem DET từ chối lệnh xóa khẩn cấp."
  },
  EaBlockOverhead: {
    title: "Dung Lượng Quản Lý Phụ Trội Mỗi Block",
    sws: "SWS_Ea_00074 | ECUC_Ea_00074",
    ecucPath: "Ea / EaPublishedInformation / EaBlockOverhead",
    range: "4 .. 8 bytes (Mặc định: 4 B = Hdr 2B + Ftr 2B)",
    role: "Số byte nội bộ mà Ea tự động chèn thêm vào đầu và cuối mỗi khối để kiểm soát toàn vẹn.",
    mechanism: "Gồm 2 byte Header (Marker 0xA5 + Write Counter) và 2 byte Footer (Marker 0x5A + Write Counter) giúp phát hiện sập nguồn giữa lúc ghi.",
    scenarioImpact: "Tăng giảm Overhead sẽ thay đổi ngay công thức tính số Virtual Pages và địa chỉ vật lý."
  },
  EaPageOverhead: {
    title: "Dung Lượng Quản Lý Phụ Trội Mỗi Virtual Page",
    sws: "ECUC_Ea_00075",
    ecucPath: "Ea / EaPublishedInformation / EaPageOverhead",
    range: "0 .. 4 bytes (Mặc định: 0 B)",
    role: "Số byte quản lý phụ trội bổ sung trên từng Virtual Page (nếu phần cứng hoặc thuật toán yêu cầu).",
    mechanism: "Với Ea truyền thống trên EEPROM, EaPageOverhead thường bằng 0; chỉ EaBlockOverhead = 4 bytes.",
    scenarioImpact: "Dùng để tham khảo tính dung lượng hiệu dụng của mỗi Virtual Page."
  },
  EepAllowedWriteCycles: {
    title: "Giới Hạn Chu Kỳ Ghi Vật Lý Của Phần Cứng EEPROM",
    sws: "SWS_Ea_00005 | ECUC_Eep_00170",
    ecucPath: "Eep / EepPublishedInformation / EepAllowedWriteCycles",
    range: "50,000 .. 500,000 (Typical: 100,000 cycles)",
    role: "Độ bền tối đa (Endurance) của mỗi ô nhớ EEPROM theo datasheet nhà sản xuất chip.",
    mechanism: "Là mẫu số trong công thức chia tải Wear-Leveling: Slots = ceil(EaNumberOfWriteCycles / EepAllowedWriteCycles).",
    scenarioImpact: "Tăng lên 200,000 sẽ tự động giảm số Slot của Block #3 từ 4 Slots xuống 2 Slots!"
  },
  EepBaseAddress: {
    title: "Địa Chỉ Vật Lý Cơ Sở Của EEPROM (Base Address)",
    sws: "ECUC_Eep_00165",
    ecucPath: "Eep / EepInitConfiguration / EepBaseAddress",
    range: "Hex Address (VD: 0x0000 hoặc 0x1000)",
    role: "Địa chỉ khởi đầu trên không gian nhớ vật lý mà Eep Driver quản lý.",
    mechanism: "Mọi địa chỉ truyền vào Eep_Read/Write/Erase đều được cộng thêm phần offset tính từ EepBaseAddress.",
    scenarioImpact: "Thay đổi thành 0x1000 để thấy toàn bộ dải địa chỉ trên bản đồ EEPROM tự động dịch chuyển!"
  },
  EepChunkSizeMode: {
    title: "Kích Thước Gói Truyền Eep Mỗi Tick (SLOW / FAST)",
    sws: "SWS_Eep | EepNormalWriteBlockSize / Fast",
    ecucPath: "Eep / EepInitConfiguration / BlockSize (Slow/Fast)",
    range: "4/16 | 8/32 (Typical) | 16/64 bytes/tick",
    role: "Số byte tối đa mà Eep_MainFunction() xử lý được trong 1 chu kỳ ở mỗi chế độ.",
    mechanism: "Ở MEMIF_MODE_SLOW dùng số byte nhỏ để tránh nghẽn SPI; ở MEMIF_MODE_FAST dùng số byte lớn gấp 4 lần.",
    scenarioImpact: "Ảnh hưởng trực tiếp tới số nhịp +5ms MainFn cần thiết trong Kịch bản S10."
  },
  SimulatePowerLossMidWrite: {
    title: "Giả Lập Sập Nguồn Giữa Lúc Đang Ghi (Brown-out)",
    sws: "SWS_Ea_00074 (Power-Loss Protection)",
    ecucPath: "Simulator Fault Injection / PowerLossMidWrite",
    range: "BOOLEAN (TRUE | FALSE)",
    role: "Cắt nguồn ngay sau khi Ea_Write ghi xong Header (0xA5) & Data nhưng chưa kịp ghi Footer (0x5A).",
    mechanism: "Để lại khối ở trạng thái Header=0xA5xx, Footer=0xFFFF. Lần Ea_Read() tiếp theo sẽ lập tức phát hiện MEMIF_BLOCK_INCONSISTENT!",
    scenarioImpact: "Cốt lõi của Kịch bản S5 — chứng minh vai trò sống còn của cặp Header/Footer."
  },
  InjectEepHardwareError: {
    title: "Bơm Lỗi Phần Cứng EEPROM (SPI / Stuck Bit)",
    sws: "SWS_Ea_00056 | SWS_Ea_00096",
    ecucPath: "Simulator Fault Injection / InjectEepHardwareError",
    range: "BOOLEAN (TRUE | FALSE)",
    role: "Giả lập tầng Eep Driver gặp lỗi vật lý không thể đọc/ghi/xóa EEPROM.",
    mechanism: "Eep báo Dem_SetEventStatus(EEP_E_*, FAILED) và gọi Ea_JobErrorNotification() (hoặc JOB_FAILED trong Polling), khiến Ea trả về MEMIF_JOB_FAILED.",
    scenarioImpact: "Kích hoạt luồng xử lý lỗi phần cứng trong Kịch bản S13."
  },
  AutoVerifyAfterWrite: {
    title: "Tự Động Đối Chiếu Sau Khi Ghi (Eep_Compare)",
    sws: "SWS_Ea_00054 | Write Verification",
    ecucPath: "Ea / Optional Verify / AutoVerifyAfterWrite",
    range: "BOOLEAN (TRUE | FALSE)",
    role: "Bắt buộc gọi thêm Sub-Job Eep_Compare() sau khi ghi xong Footer 0x5A để kiểm tra lại nội dung.",
    mechanism: "Đảm bảo 100% dữ liệu trên EEPROM khớp với RAM trước khi gọi NvM_JobEndNotification().",
    scenarioImpact: "Thêm Bước 4 VERIFY_CMP vào chu trình ghi trong Kịch bản S2."
  },
  StrictImmediateEraseCheck: {
    title: "Kiểm Tra Bắt Buộc Pre-Erase Cho Block Khẩn Cấp",
    sws: "SWS_Ea_00064",
    ecucPath: "Ea / Safety Check / StrictImmediateEraseCheck",
    range: "BOOLEAN (TRUE | FALSE)",
    role: "Cảnh báo/chặn nếu ghi vào Block có EaImmediateData=TRUE mà chưa chạy Ea_EraseImmediateBlock() trước đó.",
    mechanism: "Giúp kiểm chứng đúng quy trình chuẩn bị vùng nhớ trống (0xFF) trước khi ghi dữ liệu khẩn cấp.",
    scenarioImpact: "Thử nghiệm trong Kịch bản S9 (What-If #2)."
  },
  TestInvalidParamMode: {
    title: "Chọn Tham Số Sai Kiểm Thử Hàng Rào DET",
    sws: "SWS_Ea_00049",
    ecucPath: "Simulator DET Test / TestInvalidParamMode",
    range: "NONE | INVALID_BLOCK_NO | INVALID_OFFSET | INVALID_LEN | NULL_PTR",
    role: "Chủ động bơm tham số lỗi vào lệnh gọi tiếp theo để kiểm chứng các mã lỗi DET của Ea.",
    mechanism: "Khi khác NONE, lệnh Ea_Read/Ea_Write tiếp theo sẽ mang tham số sai tương ứng để kích hoạt Det_ReportError(40, 0, ServiceId, ErrorId).",
    scenarioImpact: "Dùng để kiểm thử nhanh mọi mã lỗi DET trong Kịch bản S14."
  }
};

const EA_STATUS_BITS = [
  { bit: 7, mask: 0x80, name: "EA_INITIALIZED", tag: "EA_INIT", tone: "ok", desc: "1 khi Ea_Init() đã chạy xong (MEMIF_IDLE/BUSY); 0 là MEMIF_UNINIT (gọi API sẽ báo EA_E_UNINIT)." },
  { bit: 6, mask: 0x40, name: "EA_STATUS_BUSY", tag: "EA_BUSY", tone: "warn", desc: "1 khi Ea_GetStatus() == MEMIF_BUSY (đang thực thi Job bất đồng bộ; từ chối Job mới với EA_E_BUSY)." },
  { bit: 5, mask: 0x20, name: "EA_BUSY_INTERNAL", tag: "BUSY_INT", tone: "pur", desc: "1 khi Ea_GetStatus() == MEMIF_BUSY_INTERNAL (đang quét bảng Slot nội bộ sau Ea_Init)." },
  { bit: 4, mask: 0x10, name: "JOB_PENDING", tag: "JOB_PEND", tone: "warn", desc: "1 khi Ea_GetJobResult() == MEMIF_JOB_PENDING (Job đang chạy từng bước trong Ea_MainFunction)." },
  { bit: 3, mask: 0x08, name: "JOB_RESULT_OK", tag: "JOB_OK", tone: "ok", desc: "1 khi Job gần nhất kết thúc với MEMIF_JOB_OK và gọi EaNvmJobEndNotification." },
  { bit: 2, mask: 0x04, name: "EEP_SUBJOB_ACTV", tag: "EEP_SUB", tone: "pur", desc: "1 khi Ea đang chờ Eep Driver hoàn thành một Sub-Job (Eep_Write / Read / Erase / Compare)." },
  { bit: 1, mask: 0x02, name: "FAST_MODE_EN", tag: "FAST_MD", tone: "ok", desc: "1 khi Ea_SetMode(MEMIF_MODE_FAST) đang kích hoạt (truyền khối lớn); 0 là MEMIF_MODE_SLOW." },
  { bit: 0, mask: 0x01, name: "POLLING_MODE_EN", tag: "POLLING", tone: "warn", desc: "1 khi EaPollingMode=TRUE (hỏi vòng Eep_GetJobResult); 0 là Callback Mode (Ea_JobEndNotification)." }
];

const EA_BLOCK_HDR_BITS = [
  { bit: 7, mask: 0x80, name: "BLK_HDR_START_WR", tag: "HDR_0xA5", tone: "ok", desc: "1 khi Header chứa Start Marker hợp lệ 0xA5 (+ Counter); 0 khi bị Invalidate (0x00) hoặc Erased (0xFF)." },
  { bit: 6, mask: 0x40, name: "BLK_FTR_VALID", tag: "FTR_0x5A", tone: "ok", desc: "1 khi Footer chứa Valid Marker 0x5A khớp Counter với Header -> Block đạt chứng nhận VALID!" },
  { bit: 5, mask: 0x20, name: "BLK_INCONSISTENT", tag: "INCONSIS", tone: "err", desc: "1 khi Header & Footer lệch nhau (mất điện khi ghi) hoặc ô nhớ trống 0xFF -> MEMIF_BLOCK_INCONSISTENT." },
  { bit: 4, mask: 0x10, name: "BLK_INVALIDATED", tag: "INVALID", tone: "warn", desc: "1 khi Block bị vô hiệu hóa logic bằng Ea_InvalidateBlock() (Header=0x0000) -> MEMIF_BLOCK_INVALID." },
  { bit: 3, mask: 0x08, name: "IMM_DATA_BLOCK", tag: "IMM_BLK", tone: "pur", desc: "1 khi Block đang chọn có cấu hình EaImmediateData = TRUE (cho phép EraseImmediateBlock)." },
  { bit: 2, mask: 0x04, name: "IMM_PRE_ERASED", tag: "PRE_ERS", tone: "pur", desc: "1 khi Block khẩn cấp đã được Ea_EraseImmediateBlock() xóa trắng (0xFF) sẵn sàng ghi tức thì." },
  { bit: 1, mask: 0x02, name: "WEAR_SLOT_ROTATE", tag: "WEAR_RT", tone: "ok", desc: "1 khi Block đang chọn sử dụng Multi-Slot Wear-Leveling (EaNumberOfWriteCycles > EepAllowedWriteCycles)." },
  { bit: 0, mask: 0x01, name: "JOB_ERR_OR_CANCEL", tag: "ERR_CNC", tone: "err", desc: "1 khi Job vừa bị hủy bởi Ea_Cancel(), lỗi phần cứng từ Eep, hoặc phát sinh lỗi DET / Runtime Error." }
];

const MODULES_INFO = {
  MOD_SWC: {
    id: "MOD_SWC",
    name: "SWC_App & SWC_Diag (Application Layer)",
    layer: "Application Layer (01_Application)",
    role: "Thành phần phần mềm ứng dụng (lưu Calibration, Odometer, Crash Data hoặc xử lý UDS WriteDataByIdentifier). Không bao giờ giao tiếp trực tiếp với Ea!",
    inputs: "Sự kiện ứng dụng (đổi số km, tai nạn va chạm, yêu cầu chẩn đoán) và Callback kết quả JobFinished từ NvM thông qua RTE.",
    processing: "Chuẩn bị bộ đệm RAM (RamBlockData), gọi cổng Client-Server Rte_Call_NvMService_*(). Với dữ liệu va chạm khẩn cấp, gọi trước EraseNvBlock để dọn sẵn EEPROM.",
    outputs: "Gọi xuống NvM thông qua RTE: Rte_Call_NvMService_WriteBlock(), ReadBlock(), InvalidateNvBlock(), EraseNvBlock().",
    apis: [
      "Std_ReturnType Rte_Call_NvMService_Blk_WriteBlock(NvM_SrcPtrType SrcPtr)",
      "Std_ReturnType Rte_Call_NvMService_Blk_ReadBlock(NvM_DstPtrType DstPtr)",
      "Std_ReturnType Rte_Call_NvMService_Blk_InvalidateNvBlock(void)",
      "Std_ReturnType Rte_Call_NvMService_Blk_EraseNvBlock(void)"
    ]
  },
  MOD_RTE: {
    id: "MOD_RTE",
    name: "RTE (Runtime Environment)",
    layer: "RTE Layer (02_RTE)",
    role: "Cầu nối chuẩn hóa giữa thế giới Application (SWC) và Basic Software (NvM). Cách ly hoàn toàn SWC khỏi chi tiết lưu trữ vật lý.",
    inputs: "Lời gọi Client-Server Rte_Call_NvMService_* từ các SWC và Callback NvM_SingleBlockCallbackFunction từ NvM.",
    processing: "Ánh xạ Port-Defined Argument (BlockId) của từng SWC thành tham số NvM_BlockIdType và gọi trực tiếp hàm NvM tương ứng.",
    outputs: "Gọi xuống NvM (NvM_ReadBlock, NvM_WriteBlock...) và kích hoạt Runnable thông báo hoàn tất về SWC.",
    apis: [
      "/* SWC không bao giờ có quyền gọi thẳng Ea_Read / Ea_Write! */",
      "NvM_WriteBlock(NvMConf_NvMBlockDescriptor_Blk, SrcPtr)",
      "NvM_ReadBlock(NvMConf_NvMBlockDescriptor_Blk, DstPtr)"
    ]
  },
  MOD_NVM: {
    id: "MOD_NVM",
    name: "NvM (NVRAM Manager)",
    layer: "Memory Services (03_Services)",
    role: "Quản lý hàng đợi truy cập NVRAM, tính/kiểm tra CRC, quản lý Dataset Index, cơ chế Retry, ROM Default Fallback và điều phối ReadAll/WriteAll.",
    inputs: "Yêu cầu từng Block từ RTE/SWC, ReadAll/WriteAll từ EcuM/BswM, và thông báo EaNvmJobEndNotification / JobErrorNotification từ Ea.",
    processing: "Sắp xếp 2 hàng đợi (Immediate Priority vs Standard Queue). Chuyển đổi NvMBlockId + DataIndex thành (DeviceIndex, Ea_BlockNumber) bằng công thức (Base << SelectionBits) | DataIndex.",
    outputs: "Gọi xuống MemIf_Read / MemIf_Write / MemIf_InvalidateBlock / MemIf_EraseImmediateBlock / MemIf_Cancel kèm DeviceIndex = EaIndex (0).",
    apis: [
      "Std_ReturnType NvM_ReadBlock(NvM_BlockIdType BlockId, void* NvM_DstPtr)",
      "Std_ReturnType NvM_WriteBlock(NvM_BlockIdType BlockId, const void* NvM_SrcPtr)",
      "void NvM_JobEndNotification(void)   /* Callback nhận từ Ea */",
      "void NvM_JobErrorNotification(void) /* Callback lỗi nhận từ Ea */"
    ]
  },
  MOD_MEMIF: {
    id: "MOD_MEMIF",
    name: "MemIf (Memory Abstraction Interface)",
    layer: "ECU Abstraction Layer (04_ECU_Abstraction)",
    role: "Bộ ghép kênh/định tuyến giữa NvM và các module trừu tượng hóa bộ nhớ bên dưới (Ea cho EEPROM và Fee cho Data Flash).",
    inputs: "Mọi lời gọi dịch vụ bộ nhớ từ NvM kèm tham số DeviceIndex (0 = Ea, 1 = Fee).",
    processing: "Nếu chỉ có 1 thiết bị (Ea), MemIf biên dịch thành #define Macro 0% overhead. Nếu có nhiều thiết bị (Ea + Fee), tra bảng con trỏ hàm theo DeviceIndex.",
    outputs: "Định tuyến xuống Ea_Read(), Ea_Write(), Ea_InvalidateBlock(), Ea_EraseImmediateBlock(), Ea_Cancel(), Ea_SetMode(), Ea_GetStatus(), Ea_GetJobResult().",
    apis: [
      "Std_ReturnType MemIf_Read(uint8 DeviceIndex, uint16 BlockNumber, uint16 BlockOffset, uint8* DataBufferPtr, uint16 Length)",
      "Std_ReturnType MemIf_Write(uint8 DeviceIndex, uint16 BlockNumber, const uint8* DataBufferPtr)",
      "Std_ReturnType MemIf_EraseImmediateBlock(uint8 DeviceIndex, uint16 BlockNumber)",
      "void MemIf_Cancel(uint8 DeviceIndex)"
    ]
  },
  MOD_EA: {
    id: "MOD_EA",
    name: "Ea Core Engine (EEPROM Abstraction — Mod 40)",
    layer: "ECU Abstraction Layer (04_ECU_Abstraction)",
    role: "Trừu tượng hóa cấu trúc địa chỉ vật lý, kích thước trang và giới hạn hao mòn của EEPROM thành các Logical Blocks đồng nhất.",
    inputs: "Lệnh từ MemIf (Read/Write/Invalidate/EraseImmediate/Cancel/SetMode), Init từ EcuM, chu kỳ Ea_MainFunction từ SchM, và Callback/Status từ Eep.",
    processing: "1) Chốt kiểm tra DET & Runtime Errors; 2) Căn chỉnh kích thước (Data + Overhead) theo bội số EaVirtualPageSize; 3) Luân chuyển Slot Wear-Leveling theo EaNumberOfWriteCycles; 4) Điều phối máy trạng thái 3 bước ghi an toàn (Header 0xA5 → Payload → Footer 0x5A) trong Ea_MainFunction().",
    outputs: "Gọi xuống Eep_Read / Eep_Write / Eep_Erase / Eep_Compare / Eep_Cancel / Eep_SetMode; báo kết quả ngược lên NvM_JobEnd/ErrorNotification; báo lỗi DET.",
    apis: [
      "void Ea_Init(const Ea_ConfigType* ConfigPtr) [SWS_Ea_00084]",
      "Std_ReturnType Ea_Read(uint16 BlockNumber, uint16 BlockOffset, uint8* DataBufferPtr, uint16 Length) [SWS_Ea_00086]",
      "Std_ReturnType Ea_Write(uint16 BlockNumber, const uint8* DataBufferPtr) [SWS_Ea_00087]",
      "Std_ReturnType Ea_InvalidateBlock(uint16 BlockNumber) [SWS_Ea_00091]",
      "Std_ReturnType Ea_EraseImmediateBlock(uint16 BlockNumber) [SWS_Ea_00093]",
      "void Ea_Cancel(void) [SWS_Ea_00088] | void Ea_SetMode(MemIf_ModeType Mode) [SWS_Ea_00085]",
      "void Ea_MainFunction(void) [SWS_Ea_00097]"
    ]
  },
  MOD_EEP: {
    id: "MOD_EEP",
    name: "Eep Driver (EEPROM Driver — MCAL)",
    layer: "MCAL Layer (05_MCAL)",
    role: "Trình điều khiển phần cứng cấp thấp làm việc bằng địa chỉ vật lý tuyến tính (Eep_AddressType) trên EEPROM nội bộ hoặc EEPROM ngoài.",
    inputs: "Lệnh Eep_Read, Eep_Write, Eep_Erase, Eep_Compare, Eep_Cancel, Eep_SetMode từ Ea và xung nhịp Eep_MainFunction() từ SchM.",
    processing: "Kiểm tra dải địa chỉ EepBaseAddress, chia nhỏ gói dữ liệu theo kích thước SLOW (8B/tick) hoặc FAST (32B/tick), thực hiện truyền xuống phần cứng trong Eep_MainFunction().",
    outputs: "Gọi Ea_JobEndNotification() khi thành công, hoặc báo Dem_SetEventStatus(EEP_E_*) + gọi Ea_JobErrorNotification() khi lỗi phần cứng.",
    apis: [
      "Std_ReturnType Eep_Read(Eep_AddressType EepromAddress, uint8* DataBufferPtr, Eep_LengthType Length)",
      "Std_ReturnType Eep_Write(Eep_AddressType EepromAddress, const uint8* DataBufferPtr, Eep_LengthType Length)",
      "Std_ReturnType Eep_Erase(Eep_AddressType EepromAddress, Eep_LengthType Length)",
      "Std_ReturnType Eep_Compare(Eep_AddressType EepromAddress, const uint8* DataBufferPtr, Eep_LengthType Length)"
    ]
  },
  MOD_SPI_HW: {
    id: "MOD_SPI_HW",
    name: "Spi & Physical EEPROM Hardware",
    layer: "MCAL / ECU Hardware",
    role: "Giao tiếp bus nối tiếp SPI (với EEPROM ngoại vi) và mảng ô nhớ EEPROM vật lý (Internal / External EEPROM) lưu giữ dữ liệu không mất điện.",
    inputs: "Khung lệnh ghi/đọc/xóa byte từ Eep Driver (kèm địa chỉ 16/24-bit và chuỗi dữ liệu).",
    processing: "Xóa trang về 0xFF, lập trình ô nhớ, giữ dữ liệu bền vững. Mô phỏng cả các sự cố vật lý như mất nguồn đột ngột giữa lúc đang ghi (Brown-out) hoặc hỏng ô nhớ (Stuck Bit).",
    outputs: "Phản ánh trực tiếp lên Bản Đồ Ô Nhớ Vật Lý EEPROM (0x0000..0x00FF) ở đầu Cột Giữa.",
    apis: [
      "Std_ReturnType Spi_AsyncTransmit(Spi_SequenceType Sequence)",
      "/* Physical EEPROM Byte Operations: Write / Read / Erase(0xFF) */"
    ]
  },
  MOD_SCHM: {
    id: "MOD_SCHM",
    name: "SchM & AUTOSAR OS",
    layer: "System / RTE Services (03_Services)",
    role: "Lập lịch thực thi định kỳ cho tầng Memory Stack và cung cấp khóa vùng găng (Exclusive Area) bảo vệ biến trạng thái toàn cục.",
    inputs: "Ngắt bộ đếm hệ thống OS Counter (ví dụ 5ms OS Task).",
    processing: "Thực thi theo thứ tự chuẩn từ trên xuống dưới trong 1 chu kỳ Task: NvM_MainFunction() → Ea_MainFunction() → Eep_MainFunction() để tối thiểu hóa độ trễ phản hồi.",
    outputs: "Kích hoạt Ea_MainFunction() và Eep_MainFunction() khi người dùng nhấn +5ms MainFn hoặc bật Auto Clock.",
    apis: [
      "void Ea_MainFunction(void)  /* Chu kỳ EaMainFunctionPeriod (5ms) */",
      "void Eep_MainFunction(void) /* Chu kỳ MCAL driver */",
      "SchM_Enter_Ea_EA_EXCLUSIVE_AREA_0() / SchM_Exit_Ea_EA_EXCLUSIVE_AREA_0()"
    ]
  },
  MOD_ECUM: {
    id: "MOD_ECUM",
    name: "EcuM & BswM (ECU & Mode Management)",
    layer: "System Services (03_Services)",
    role: "Khởi tạo toàn bộ Memory Stack lúc bật máy (Eep_Init → Ea_Init → NvM_Init) và tối ưu tốc độ MEMIF_MODE_FAST khi ReadAll / WriteAll.",
    inputs: "Chu trình khởi động STARTUP_ONE / STARTUP_TWO và tắt máy PREP_SHUTDOWN.",
    processing: "Đảm bảo Eep_Init() chạy trước Ea_Init(NULL_PTR). Trong pha đọc/ghi hàng loạt lúc boot/shutdown, ra lệnh MemIf_SetMode(MEMIF_MODE_FAST) rồi hạ về SLOW khi vào RUN.",
    outputs: "Gọi Ea_Init(NULL_PTR), NvM_ReadAll(), NvM_WriteAll() và Ea_SetMode(MEMIF_MODE_FAST / SLOW).",
    apis: [
      "void Ea_Init(const Ea_ConfigType* ConfigPtr) /* Gọi từ EcuM_AL_DriverInitTwo */",
      "void Ea_SetMode(MemIf_ModeType Mode) /* BswM chuyển FAST khi ReadAll/WriteAll */"
    ]
  },
  MOD_DET: {
    id: "MOD_DET",
    name: "DET (Mod 40) & DEM (Eep Production Errors)",
    layer: "System & Diagnostic Services (03_Services)",
    role: "Tiếp nhận báo cáo lỗi lập trình/tham số/runtime từ module Ea (ModuleId=40) và lỗi hỏng phần cứng EEPROM từ Eep Driver.",
    inputs: "Det_ReportError(), Det_ReportRuntimeError() từ Ea; Dem_SetEventStatus() từ Eep.",
    processing: "Phân loại rõ Development Errors (0x01..0x05, 0x09) do gọi sai API/tham số và Runtime Errors (EA_E_BUSY=0x06, EA_E_INVALID_CANCEL=0x08) theo chuẩn R20-11/R22-11/R23-11.",
    outputs: "Hiển thị cảnh báo đỏ trực tiếp trong Inspector và nhật ký API Call Trace.",
    apis: [
      "Det_ReportError(40, 0, ServiceId, EA_E_UNINIT / INVALID_BLOCK_NO / OFS / PTR / LEN)",
      "Det_ReportRuntimeError(40, 0, ServiceId, EA_E_BUSY / EA_E_INVALID_CANCEL)",
      "Dem_SetEventStatus(EEP_E_WRITE_FAILED / READ_FAILED / ERASE_FAILED, DEM_EVENT_STATUS_FAILED)"
    ]
  }
};
