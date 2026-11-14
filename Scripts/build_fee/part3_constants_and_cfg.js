// ============================================================================
// PART 3: FEE CONSTANTS, BITFIELDS, ECUC TOOLTIPS, MODULES INFO & ABBREVIATIONS
// ============================================================================

const FEE_MODULE_BITS = [
  {
    bit: 7,
    name: 'FEE_INIT',
    hex: '0x80',
    desc: 'Module Initialized — Fee_Init() hoàn tất startup scan & dựng RAM LUT, trạng thái tối thiểu thoát khỏi MEMIF_UNINIT.'
  },
  {
    bit: 6,
    name: 'FEE_BUSY',
    hex: '0x40',
    desc: 'User Job Active — Có Job do NvM/MemIf yêu cầu (Read/Write/Invalidate/EraseImmediate) đang xử lý ở nền.'
  },
  {
    bit: 5,
    name: 'FEE_BUSY_INT',
    hex: '0x20',
    desc: 'Busy Internal — Fee đang thực hiện Garbage Collection nội bộ hoặc startup repair (MemIf_GetStatus -> MEMIF_BUSY_INTERNAL).'
  },
  {
    bit: 4,
    name: 'FAST_MODE',
    hex: '0x10',
    desc: 'High-Speed Mode Active — Fee_SetMode(MEMIF_MODE_FAST) đang bật, đẩy thông lượng ghi/đọc mỗi chu kỳ lên FlsBytesPerCycleFast.'
  },
  {
    bit: 3,
    name: 'GC_ACTIVE',
    hex: '0x08',
    desc: 'Garbage Collection Active — Tiến trình copy block hợp lệ sang Standby Bank & Fls_Erase() Old Active Bank đang chạy.'
  },
  {
    bit: 2,
    name: 'IMM_PREEMPT',
    hex: '0x04',
    desc: 'Immediate Preemption — Block khẩn cấp (FeeImmediateData=TRUE) đang tạm hoãn Standard Job/GC để ghi vào vùng dự phòng.'
  },
  {
    bit: 1,
    name: 'JOB_ERR_PEND',
    hex: '0x02',
    desc: 'Job Error Pending — Phản hồi kết quả lỗi gần nhất (JOB_FAILED / INCONSISTENT / INVALID) chờ NvM kiểm tra hoặc Callback.'
  },
  {
    bit: 0,
    name: 'JOB_OK_DONE',
    hex: '0x01',
    desc: 'Job Completed OK — Job gần nhất kết thúc thành công (MEMIF_JOB_OK) và đã phát Fee_JobEndNotification().'
  }
];

const FEE_HEADER_BITS = [
  {
    bit: 7,
    name: 'HDR_WRITTEN',
    hex: '0x80',
    desc: 'Header Written — Phase 1 ghi Block Header (BlockNumber, Length, InstanceSeq, HeaderCRC) xuống DFlash thành công.'
  },
  {
    bit: 6,
    name: 'DATA_ALIGNED',
    hex: '0x40',
    desc: 'Payload & Virtual Page Padded — Phase 2 ghi đủ Payload được đệm bội số FeeVirtualPageSize xuống Data Flash.'
  },
  {
    bit: 5,
    name: 'VALID_TRAILR',
    hex: '0x20',
    desc: 'Valid Trailer Committed — Phase 3 ghi Pattern 0xA5A5 xác nhận instance toàn vẹn (không bị Torn Write khi mất điện).'
  },
  {
    bit: 4,
    name: 'IMM_BLOCK',
    hex: '0x10',
    desc: 'Immediate Block Flag — Block thuộc nhóm khẩn cấp (FeeImmediateData=TRUE), có quyền ghi vào Reserved Immediate Zone.'
  },
  {
    bit: 3,
    name: 'LUT_CACHED',
    hex: '0x08',
    desc: 'RAM LUT Cached — Địa chỉ vật lý mới nhất của Block đã được cập nhật trong bảng tra nhanh RAM (O(1) lookup).'
  },
  {
    bit: 2,
    name: 'SUPERSEDED',
    hex: '0x04',
    desc: 'Superseded Instance — Phiên bản cũ hơn đã bị bản mới ghi đè; Garbage Collection sẽ bỏ qua vùng nhớ này khi thu hồi.'
  },
  {
    bit: 1,
    name: 'INVALIDATED',
    hex: '0x02',
    desc: 'Invalidated Block — Có bản ghi Trailer/Marker vô hiệu hóa từ Fee_InvalidateBlock(); Read sẽ trả MEMIF_BLOCK_INVALID.'
  },
  {
    bit: 0,
    name: 'INCONSISTENT',
    hex: '0x01',
    desc: 'Inconsistent / Torn Write — Mất điện giữa Phase 1-3 (thiếu Valid Trailer) hoặc lỗi ECC Flash; tự fallback nếu cấu hình cho phép.'
  }
];

const BLOCK_CATALOG = {
  '0x0010': {
    id: '0x0010',
    name: 'Blk#1_Odometer',
    label: '0x0010 (Blk#1 Odometer - 14B)',
    baseNumber: 0x0010,
    size: 14,
    immediate: false,
    writeCycles: 100000,
    datasetBits: 2,
    description: 'Số công-tơ-mét xe (Standard NvM Native Block, 14B raw -> 16B aligned payload + 8B Hdr = 24B).'
  },
  '0x0020': {
    id: '0x0020',
    name: 'Blk#2_EngCalib_DS0',
    label: '0x0020 (Blk#2 EngCalib DS0 - 24B)',
    baseNumber: 0x0020,
    size: 24,
    immediate: false,
    writeCycles: 250000,
    datasetBits: 2,
    description: 'Dữ liệu học hiệu chỉnh động cơ Dataset 0 (24B raw -> 24B aligned, tổng slot 32B với Header 8B).'
  },
  '0x0021': {
    id: '0x0021',
    name: 'Blk#2_EngCalib_DS1',
    label: '0x0021 (Blk#2 EngCalib DS1 - 24B)',
    baseNumber: 0x0021,
    size: 24,
    immediate: false,
    writeCycles: 250000,
    datasetBits: 2,
    description: 'Bản sao dự phòng Dataset 1 của EngCalib (cùng Block group 0x002x với dataset index = 1).'
  },
  '0x0030': {
    id: '0x0030',
    name: 'Blk#3_CrashEvt_Imm',
    label: '0x0030 (Blk#3 CrashEvt - 8B Immediate)',
    baseNumber: 0x0030,
    size: 8,
    immediate: true,
    writeCycles: 10000,
    datasetBits: 1,
    description: 'Dữ liệu túi khí / va chạm khẩn cấp (FeeImmediateData=TRUE). Có quyền ghi xuyên ngưỡng GC vào Reserved Zone.'
  },
  '0x0040': {
    id: '0x0040',
    name: 'Blk#4_DiagVinCode',
    label: '0x0040 (Blk#4 DiagVinCode - 17B)',
    baseNumber: 0x0040,
    size: 17,
    immediate: false,
    writeCycles: 1000,
    datasetBits: 1,
    description: 'Số khung VIN & Variant Coding 17 bytes (cần pad 7 bytes 0xFF thành 24B với VirtualPage=8B).'
  }
};

const FEE_DET_CATALOG = {
  FEE_E_UNINIT: { id: '0x01', name: 'FEE_E_UNINIT', apiHint: 'Read/Write/Invalidate/SetMode', desc: 'Gọi API dịch vụ khi Fee chưa được khởi tạo bằng Fee_Init().' },
  FEE_E_INVALID_BLOCK_NO: { id: '0x02', name: 'FEE_E_INVALID_BLOCK_NO', apiHint: 'Read/Write/Invalidate/EraseImmediate', desc: 'BlockNumber bằng 0x0000, 0xFFFF hoặc không tồn tại trong FeeBlockConfiguration.' },
  FEE_E_INVALID_BLOCK_OFS: { id: '0x03', name: 'FEE_E_INVALID_BLOCK_OFS', apiHint: 'Fee_Read', desc: 'BlockOffset >= FeeBlockSize cấu hình của block.' },
  FEE_E_PARAM_POINTER: { id: '0x04', name: 'FEE_E_PARAM_POINTER', apiHint: 'Read/Write/GetVersionInfo', desc: 'Con trỏ DataBufferPtr hoặc VersionInfoPtr bị NULL_PTR.' },
  FEE_E_INVALID_BLOCK_LEN: { id: '0x05', name: 'FEE_E_INVALID_BLOCK_LEN', apiHint: 'Fee_Read', desc: 'Length == 0 hoặc (BlockOffset + Length) vượt quá FeeBlockSize.' },
  FEE_E_BUSY: { id: '0x06', name: 'FEE_E_BUSY', apiHint: 'Read/Write/Invalidate/SetMode', desc: 'Module đang bận MEMIF_BUSY hoặc MEMIF_BUSY_INTERNAL khi nhận lệnh mới không hợp lệ.' },
  FEE_E_INVALID_CANCEL: { id: '0x08', name: 'FEE_E_INVALID_CANCEL', apiHint: 'Fee_Cancel', desc: 'Gọi Fee_Cancel() khi không có user job nào đang ở trạng thái BUSY.' }
};

const configTooltipData = {
  FeeInitialized: {
    title: 'FeeInitialized (Runtime Init Flag)',
    type: 'ECUC Boolean / Runtime Guard',
    desc: 'Mô phỏng trạng thái đã chạy Fee_Init(&Fee_Config) hay chưa. Nếu FALSE, mọi API dịch vụ đều bị chặn và báo FEE_E_UNINIT (0x01).',
    range: 'TRUE | FALSE',
    impact: 'Kiểm soát Bit 7 FEE_INIT trên Thanh A và cho phép các bước Read/Write hoạt động.',
    ref: 'SWS_Fee_00187 / SWS_Fee_00010'
  },
  FeeDevErrorDetect: {
    title: 'FeeDevErrorDetect',
    type: 'ECUC Boolean Parameter',
    desc: 'Bật/tắt cơ chế phát hiện lỗi phát triển và gửi báo cáo tới Det_ReportError(ModuleId=21, ...).',
    range: 'TRUE | FALSE',
    impact: 'Khi TRUE: Invalid Block, Offset/Length quá giới hạn, Busy hay Uninit đều phát sinh DET entry trên tab API Trace.',
    ref: 'ECUC_Fee_00111 / SWS_Fee_00011'
  },
  FeeVersionInfoApi: {
    title: 'FeeVersionInfoApi',
    type: 'ECUC Boolean Parameter',
    desc: 'Bật/tắt tiền xử lý biên dịch cho hàm Fee_GetVersionInfo(Std_VersionInfoType* VersionInfoPtr).',
    range: 'TRUE | FALSE',
    impact: 'Xuất macro #define FEE_VERSION_INFO_API STD_ON/OFF trong Fee_Cfg.h.',
    ref: 'ECUC_Fee_00118 / SWS_Fee_00093'
  },
  FeePollingMode: {
    title: 'FeePollingMode',
    type: 'ECUC Boolean Parameter',
    desc: 'Chọn cơ chế đồng bộ tiến độ với Fls/MemAcc: TRUE dùng Polling định kỳ trong MainFunction, FALSE dùng Callback Notification từ tầng dưới.',
    range: 'TRUE (Polling) | FALSE (Interrupt/Callback)',
    impact: 'Khi Polling=TRUE, Fee tự hỏi Fls_GetJobResult()/MemAcc_GetJobResult() thay vì chờ ISR callback.',
    ref: 'ECUC_Fee_00114 / SWS_Fee_00095'
  },
  FeeSetModeSupported: {
    title: 'FeeSetModeSupported',
    type: 'ECUC Boolean Parameter',
    desc: 'Cho phép NvM/MemIf chuyển đổi chế độ tốc độ giữa MEMIF_MODE_SLOW và MEMIF_MODE_FAST thông qua Fee_SetMode().',
    range: 'TRUE | FALSE',
    impact: 'Nếu FALSE, nút/hàm chuyển sang FAST MODE sẽ bị vô hiệu hóa ở mức cấu hình tĩnh.',
    ref: 'ECUC_Fee_00119 / SWS_Fee_00091'
  },
  FeeMainFunctionPeriod: {
    title: 'FeeMainFunctionPeriod [ms]',
    type: 'ECUC Float / Integer Time (ms)',
    desc: 'Chu kỳ gọi hàm Fee_MainFunction() từ BSW Scheduler (SchM). Mỗi lần nhấn "+1 Tick MainFn", đồng hồ mô phỏng tăng đúng khoảng thời gian này.',
    range: '1 .. 50 ms (Mặc định: 5 ms)',
    impact: 'Quyết định tổng latency tính theo ms của quá trình Write, GC copy và Erase.',
    ref: 'ECUC_Fee_00120'
  },
  FeeVirtualPageSize: {
    title: 'FeeVirtualPageSize [Bytes]',
    type: 'ECUC Integer (Power of 2)',
    desc: 'Kích thước trang ảo tối thiểu để căn chỉnh cả Block Header lẫn phần cuối Payload (Alignment Padding).',
    range: '4 | 8 | 16 | 32 Bytes',
    impact: 'Công thức tổng dung lượng slot = AlignUp(HeaderSize, VP) + AlignUp(BlockSize, VP). Thay đổi VP lập tức đổi hiệu suất lưu Flash!',
    ref: 'ECUC_Fee_00115 / SWS_Fee_00028'
  },
  FeeMinimumReadPageSize: {
    title: 'FeeMinimumReadPageSize [Bytes]',
    type: 'ECUC Integer',
    desc: 'Đơn vị đọc nhỏ nhất mà Data Flash hỗ trợ (thường 1 byte hoặc 4 bytes). Cho phép đọc lệch byte qua Fee_Read(Offset, Length).',
    range: '1 .. 32 Bytes',
    impact: 'Hiển thị độ chi tiết khi Partial Read một đoạn nhỏ trong Block Payload.',
    ref: 'SWS_Fee_00088 / Partial Read'
  },
  FeeBlockHeaderSize: {
    title: 'FeeBlockHeaderSize [Bytes]',
    type: 'Implementation Overhead (Bytes)',
    desc: 'Kích thước siêu dữ liệu đầu mỗi instance trên Flash (chứa BlockNumber, BlockSize, WriteCounter, HeaderCRC). Sẽ được căn tròn theo bội số VirtualPage.',
    range: '4 .. 32 Bytes (Mặc định: 8B)',
    impact: 'Tăng kích thước Header làm tiêu tốn dung lượng Bank DFlash nhanh hơn với block kích thước nhỏ.',
    ref: 'Internal Fee Management Header'
  },
  FeeEnableHeaderCrc: {
    title: 'FeeEnableHeaderCrc',
    type: 'ECUC Boolean / Safety Option',
    desc: 'Bật kiểm tra CRC trên vùng Block Header trong quá trình Scan & Read để phát hiện sớm hỏng metadata do bit-flip.',
    range: 'TRUE | FALSE',
    impact: 'Nếu FALSE, Fee chỉ dựa vào Valid Trailer 0xA5A5 và các trường dài/số block thô.',
    ref: 'Safety Integrity Extension'
  },
  FeeValidTrailerPattern: {
    title: 'FeeValidTrailerPattern (Hex)',
    type: 'Hex Pattern (16-bit)',
    desc: 'Mẫu byte đặc biệt được ghi sau cùng (Phase 3) để đóng dấu một instance đã ghi xong an toàn 100% xuống DFlash.',
    range: '0xA5A5 | 0x5A5A | 0xAA55 (Khác ErasedValue 0xFF)',
    impact: 'Nếu mất điện trước khi pattern này được ghi, startup scan nhận diện bản ghi là INCONSISTENT (Torn Write).',
    ref: 'SWS_Fee_00014 / Atomic Commit'
  },
  FeeErasedValue: {
    title: 'FeeErasedValue (Hex)',
    type: 'ECUC / Fls Erased Byte',
    desc: 'Giá trị mặc định của từng byte trên Data Flash sau khi Fls_Erase() thành công và được dùng để đệm (pad) vào Virtual Page.',
    range: '0xFF (NOR/DFlash) | 0x00',
    impact: 'Mọi ô trống và byte Padding cuối payload đều hiển thị đúng giá trị này trên Flash Map.',
    ref: 'ECUC_Fls_00271 / SWS_Fee_00028'
  },
  SelectedFeeBlock: {
    title: 'SelectedFeeBlock (Active Config Block)',
    type: 'Block Selector Reference',
    desc: 'Chọn một trong 5 khối dữ liệu mẫu để chỉnh sửa thuộc tính và thao tác nhanh trên thanh công cụ.',
    range: '0x0010 .. 0x0040',
    impact: 'Đồng bộ với danh sách chọn Block ở Quick Action Bar và nạp lại thông số Block Size / Immediate.',
    ref: 'ECUC_Fee_00101 (FeeBlockConfiguration)'
  },
  FeeBlockNumber: {
    title: 'FeeBlockNumber (Hex ID)',
    type: 'ECUC Integer (1..65534)',
    desc: 'Mã định danh duy nhất của Block trong Fee. MemIf tính toán dựa trên (NvMBlockBaseNumber << DatasetSelectionBits) | DatasetIndex.',
    range: '0x0001 .. 0xFFFE (0x0000 & 0xFFFF bị cấm)',
    impact: 'Nếu gõ 0x0000 hoặc 0xFFFF sẽ kích hoạt DET FEE_E_INVALID_BLOCK_NO.',
    ref: 'ECUC_Fee_00102 / SWS_Fee_00006'
  },
  FeeBlockSize: {
    title: 'FeeBlockSize [Bytes]',
    type: 'ECUC Integer (Bytes)',
    desc: 'Kích thước dữ liệu thực (raw payload) của Block đang chọn theo cấu hình NvM.',
    range: '1 .. 240 Bytes',
    impact: 'Thay đổi BlockSize tự động tính lại số Virtual Page và kích thước slot thực chiếm trên Bank.',
    ref: 'ECUC_Fee_00103'
  },
  FeeImmediateData: {
    title: 'FeeImmediateData',
    type: 'ECUC Boolean Parameter',
    desc: 'Đánh dấu Block chứa dữ liệu khẩn cấp (ví dụ: Crash Event, Airbag). Được quyền chiếm dụng Reserved Immediate Space và xen ngang Garbage Collection.',
    range: 'TRUE | FALSE',
    impact: 'Khi TRUE: bật Bit 4 IMM_BLOCK (Thanh B) và cho phép ghi ngay cả khi Standard Area đã đầy tới ngưỡng GC.',
    ref: 'ECUC_Fee_00104 / SWS_Fee_00060'
  },
  FeeNumberOfWriteCycles: {
    title: 'FeeNumberOfWriteCycles',
    type: 'ECUC Integer (Endurance)',
    desc: 'Số chu kỳ ghi dự kiến suốt vòng đời của Block này, dùng để tính toán số sector vật lý cần thiết nhằm san mòn (Wear Leveling).',
    range: '1,000 .. 1,000,000 cycles',
    impact: 'Phản ánh độ bền yêu cầu khi sinh cấu hình Lcfg/ARXML.',
    ref: 'ECUC_Fee_00105'
  },
  FeeDatasetSelectionBits: {
    title: 'FeeDatasetSelectionBits',
    type: 'ECUC Integer (0..8 bits)',
    desc: 'Số bit thấp nhất của BlockNumber dành để mã hóa chỉ số Dataset (ví dụ 2 bits cho phép DS0..DS3 nằm chung nhóm block).',
    range: '0 .. 4 bits',
    impact: 'Giải thích quan hệ giữa MemIf BlockNumber 0x0020 (DS0) và 0x0021 (DS1).',
    ref: 'SWS_MemIf / SWS_Fee_00006'
  },
  FeeBank0SizeBytes: {
    title: 'FeeBank0SizeBytes [Bytes]',
    type: 'Sector Physical Capacity',
    desc: 'Dung lượng vật lý của Flash Bank 0 (Logical Sector 0) tính bằng byte trong mô hình 2-Bank Alternating.',
    range: '128 .. 512 Bytes (Mặc định: 256B)',
    impact: 'Khi dung lượng sử dụng đạt ngưỡng Threshold %, Fee kích hoạt Garbage Collection chuyển toàn bộ bản valid sang Bank 1.',
    ref: 'MCAL DFlash Sector Geometry'
  },
  FeeBank1SizeBytes: {
    title: 'FeeBank1SizeBytes [Bytes]',
    type: 'Sector Physical Capacity',
    desc: 'Dung lượng vật lý của Flash Bank 1 (Logical Sector 1) đóng vai trò Standby Copy Bank khi Bank 0 hoạt động và ngược lại.',
    range: '128 .. 512 Bytes (Mặc định: 256B)',
    impact: 'Nên đặt bằng Bank 0 để đảm bảo 100% block hợp lệ luôn vừa vặn sau Sector Switch.',
    ref: 'MCAL DFlash Sector Geometry'
  },
  FeeGcTriggerThresholdPct: {
    title: 'FeeGcTriggerThresholdPct [%]',
    type: 'GC Watermark Percentage',
    desc: 'Ngưỡng đầy (%) trên Active Bank để khởi phát Garbage Collection cho các bản ghi Standard Block.',
    range: '50% .. 95% (Mặc định: 75%)',
    impact: 'Phần còn lại từ Threshold đến 100% được giữ an toàn cho Reserved Immediate Zone.',
    ref: 'Sector Switch Policy'
  },
  FeeReservedImmediateSpaceBytes: {
    title: 'FeeReservedImmediateSpaceBytes [B]',
    type: 'Reserved Flash Bytes',
    desc: 'Dung lượng dự phòng tối thiểu ở cuối mỗi Bank chỉ dành riêng cho khối FeeImmediateData=TRUE ghi trong tình huống khẩn cấp.',
    range: '16 .. 128 Bytes (Mặc định: 64B)',
    impact: 'Hiển thị ranh giới vùng "Reserved Immediate Zone" trên bản đồ Bank 0 & Bank 1.',
    ref: 'SWS_Fee_00060'
  },
  FeeEnableBackgroundGc: {
    title: 'FeeEnableBackgroundGc',
    type: 'ECUC Boolean Parameter',
    desc: 'Cho phép chạy thu gom rác nền (từng chunk trong Fee_MainFunction) ở trạng thái MEMIF_BUSY_INTERNAL mà không chờ có user Write mới.',
    range: 'TRUE | FALSE',
    impact: 'Khi TRUE, thao tác xóa sector cũ diễn ra êm ái từng tick để tránh treo NvM quá lâu.',
    ref: 'SWS_Fee_00150 / Background GC'
  },
  FeeMaxEraseCyclesPerSector: {
    title: 'FeeMaxEraseCyclesPerSector',
    type: 'Hardware Endurance Limit',
    desc: 'Giới hạn số lần xóa (P/E cycles) định mức của một sector Data Flash phần cứng trước khi cần cảnh báo hao mòn.',
    range: '10,000 .. 500,000 cycles',
    impact: 'So sánh với Erase Counter thực tế của Bank 0 & Bank 1 trên Flash Summary Bar.',
    ref: 'ECU Flash Hardware Datasheet'
  },
  FeeLowerLayerArchitecture: {
    title: 'FeeLowerLayerArchitecture (R20-11 vs R23-11)',
    type: 'AUTOSAR Release Stack Switch',
    desc: 'Chuyển đổi kiến trúc tầng dưới giữa Classic Fls Driver (Fls_Write/Fls_Read/Fls_Erase) và AUTOSAR R23-11 Memory Access (MemAcc_Write/MemAcc_Read/MemAcc_Erase).',
    range: 'CLASSIC_FLS | R23_MEMACC',
    impact: 'Tự động đổi nhãn khối, mũi tên gọi hàm trên Sơ đồ SVG, mã C sinh ra và nội dung Inspector!',
    ref: 'AUTOSAR CP R20-11 vs R23-11 SWS_Fee / SWS_MemAcc'
  },
  ActiveMemIfMode: {
    title: 'ActiveMemIfMode',
    type: 'MemIf_ModeType Enum',
    desc: 'Chế độ hoạt động hiện tại được đặt qua Fee_SetMode(): SLOW tiết kiệm CPU trong lúc xe chạy; FAST đẩy tối đa bytes/tick khi Shutdown hoặc Startup.',
    range: 'MEMIF_MODE_SLOW | MEMIF_MODE_FAST',
    impact: 'Đồng bộ Bit 4 FAST_MODE (Thanh A) và chuyển đổi tốc độ ghi thực tế giữa FlsBytesPerCycleSlow và Fast.',
    ref: 'SWS_Fee_00091 / SWS_MemIf_00041'
  },
  FlsBytesPerCycleSlow: {
    title: 'FlsBytesPerCycleSlow [B/tick]',
    type: 'Lower Layer Throughput (Slow)',
    desc: 'Số byte tối đa mà Fls/MemAcc xử lý trong mỗi chu kỳ MainFunction khi hệ thống ở MEMIF_MODE_SLOW.',
    range: '4 .. 32 Bytes/tick (Mặc định: 8B)',
    impact: 'Ví dụ Block slot 32B sẽ mất 32/8 = 4 ticks (~20ms) ở chế độ SLOW.',
    ref: 'FlsMaxWriteNormalMode'
  },
  FlsBytesPerCycleFast: {
    title: 'FlsBytesPerCycleFast [B/tick]',
    type: 'Lower Layer Throughput (Fast)',
    desc: 'Số byte tối đa mà Fls/MemAcc xử lý trong mỗi chu kỳ MainFunction khi chuyển sang MEMIF_MODE_FAST (WriteAll/ReadAll).',
    range: '16 .. 256 Bytes/tick (Mặc định: 64B)',
    impact: 'Ví dụ Block slot 32B chỉ mất 1 tick (~5ms) ở chế độ FAST!',
    ref: 'FlsMaxWriteFastMode'
  },
  FlsSectorEraseDurationTicks: {
    title: 'FlsSectorEraseDurationTicks',
    type: 'Hardware Erase Latency (Ticks)',
    desc: 'Số chu kỳ MainFunction cần thiết để Fls_Erase() hoặc MemAcc_Erase() hoàn thành việc xóa toàn bộ một Bank DFlash.',
    range: '1 .. 10 ticks (Mặc định: 3 ticks)',
    impact: 'Quyết định thời gian pha cuối của quá trình Garbage Collection.',
    ref: 'DFlash Sector Erase Timing'
  },
  FeeNvmJobNotificationsEnabled: {
    title: 'FeeNvmJobNotificationsEnabled',
    type: 'ECUC Callback Config',
    desc: 'Bật/tắt phát thông báo kết thúc công việc bất đồng bộ Fee_JobEndNotification() hoặc Fee_JobErrorNotification() lên NvM.',
    range: 'TRUE | FALSE',
    impact: 'Điều khiển mũi tên Callback ngược lên NvM và hiển thị log trong API Trace.',
    ref: 'ECUC_Fee_00112 / ECUC_Fee_00113'
  },
  FeeEnableRamLutCache: {
    title: 'FeeEnableRamLutCache',
    type: 'Performance Optimization',
    desc: 'Bật bảng tra nhanh trong RAM (Fee_BlockLutCache) ánh xạ BlockNumber -> Physical Bank & Offset ngay từ lúc Fee_Init().',
    range: 'TRUE (O(1)) | FALSE (O(N) Linear Scan)',
    impact: 'Nếu tắt (FALSE), Fee_Read() mất thêm tick quét tuần tự từ đầu tới cuối Active Bank.',
    ref: 'Fee RAM Address Lookup Table'
  },
  SimulatePowerLossDuringWrite: {
    title: 'SimulatePowerLossDuringWrite',
    type: 'Fault Injection Toggle',
    desc: 'Mô phỏng sự cố mất nguồn ECU (Battery Cut-off) ngay sau Phase 1/2 trước khi Phase 3 Valid Trailer 0xA5A5 kịp ghi xong!',
    range: 'TRUE (Inject Torn Write) | FALSE',
    impact: 'Tạo ra bản ghi INCONSISTENT (Bit 0 = 1) trên Bank để kiểm chứng khả năng phục hồi khi Fee_Init() hoặc Fee_Read().',
    ref: 'SWS_Fee_00014 Power-Loss Safety'
  },
  FeeAutoFallbackPreviousInstance: {
    title: 'FeeAutoFallbackPreviousInstance',
    type: 'Recovery Strategy Toggle',
    desc: 'Khi phát hiện instance mới nhất bị Torn Write (INCONSISTENT), tự động lùi lại tìm bản ghi trước đó có Valid Trailer 0xA5A5 hợp lệ.',
    range: 'TRUE (Recover Prev Valid) | FALSE (Fail Job)',
    impact: 'Nếu TRUE: Fee_Read trả MEMIF_JOB_OK bằng dữ liệu an toàn cũ; nếu FALSE: trả MEMIF_BLOCK_INCONSISTENT.',
    ref: 'AUTOSAR Fee Multi-Instance Recovery'
  },
  SimulateFlsWriteVerifyError: {
    title: 'SimulateFlsWriteVerifyError',
    type: 'Hardware Fault Injection',
    desc: 'Giả lập lỗi tầng Fls/MemAcc ghi không khớp verify (MEMIF_JOB_FAILED) khi thực hiện Write.',
    range: 'TRUE | FALSE',
    impact: 'Kích hoạt JobErrorNotification() lên NvM và ghi nhận Dem_SetEventStatus(FEE_E_FLS_WRITE_FAILED, FAILED).',
    ref: 'SWS_Fee_00099'
  },
  SimulateFlsEraseError: {
    title: 'SimulateFlsEraseError',
    type: 'Hardware Fault Injection',
    desc: 'Giả lập lỗi phần cứng khi xóa Bank cũ ở bước cuối Garbage Collection (Fls_Erase -> MEMIF_JOB_FAILED).',
    range: 'TRUE | FALSE',
    impact: 'Đẩy Sector State sang SECTOR_CORRUPT_DEM, báo lỗi DEM và ngăn ghi đè lên sector chưa sạch.',
    ref: 'SWS_Fee_00102'
  },
  SimulateFlashEccBitFlip: {
    title: 'SimulateFlashEccBitFlip',
    type: 'Hardware Fault Injection',
    desc: 'Giả lập lỗi Uncorrectable ECC Double-Bit Flip trong ô nhớ Data Flash khi đang đọc Payload.',
    range: 'TRUE | FALSE',
    impact: 'Fee_Read() lập tức dừng và trả về MEMIF_BLOCK_INCONSISTENT kèm cảnh báo phần cứng cho NvM/DEM.',
    ref: 'SWS_Fee_00098'
  }
};

const MODULES_INFO = {
  MOD_SWC: {
    id: 'MOD_SWC',
    name: 'SWC (Application Layer)',
    layer: 'Application Layer',
    file: 'App_NvMUser.c',
    desc: 'Thành phần phần mềm ứng dụng (ví dụ: Engine Learning, Odometer, Crash Detection). Đọc/ghi dữ liệu bền vững qua RTE Port tới NvM NVRAM Blocks.',
    inputs: 'Dữ liệu tính toán trong RAM (Mirrors), sự kiện va chạm hoặc lệnh Read/Write từ ứng dụng.',
    outputs: 'Lời gọi Rte_Write_NvMService_WriteBlock() / ReadBlock() / InvalidateNvBlock() xuống RTE.',
    apis: ['Rte_Call_PS_EngineLearn_WriteBlock()', 'Rte_Call_PS_Odometer_ReadBlock()', 'Rte_Call_PS_Crash_WriteBlock()'],
    srd: 'AUTOSAR Application / NvM Port Interface'
  },
  MOD_RTE: {
    id: 'MOD_RTE',
    name: 'RTE (Runtime Environment)',
    layer: 'Runtime Environment',
    file: 'Rte_NvM.c',
    desc: 'Lớp trung gian kết nối Application SWC với BSW Service NvM thông qua Client-Server Port và callback Notification.',
    inputs: 'Yêu cầu C/S Port từ SWC và trạng thái kết quả job bất đồng bộ từ NvM.',
    outputs: 'Chuyển tiếp lời gọi xuống NvM_WriteBlock() / NvM_ReadBlock() và trả JobEnd về SWC.',
    apis: ['Rte_Call_NvMService_WriteBlock()', 'Rte_NvM_JobFinished_Callback()'],
    srd: 'SWS_Rte (Communication Service Mapping)'
  },
  MOD_ECUM: {
    id: 'MOD_ECUM',
    name: 'EcuM & BswM (ECU State Mgr)',
    layer: 'System Services',
    file: 'EcuM_Callout_Stubs.c',
    desc: 'Quản lý vòng đời ECU: khởi tạo Fee khi StartupTwo, chuyển Fee_SetMode(FAST) khi Shutdown/WriteAll để tăng tốc lưu toàn bộ NVRAM trước khi ngắt nguồn.',
    inputs: 'Startup Init List, GoDown / Shutdown Preparation trigger.',
    outputs: 'Gọi Fee_Init(&Fee_Config) khi bật ECU và NvM_WriteAll() -> Fee_SetMode(MEMIF_MODE_FAST) khi tắt ECU.',
    apis: ['Fee_Init(&Fee_Config)', 'MemIf_SetMode(MEMIF_MODE_FAST)', 'NvM_WriteAll()'],
    srd: 'SWS_EcuM / SWS_BswM'
  },
  MOD_NVM: {
    id: 'MOD_NVM',
    name: 'NvM (NVRAM Manager)',
    layer: 'Services Layer (Memory)',
    file: 'NvM.c / NvM_JobProc.c',
    desc: 'Quản lý hàng đợi NVRAM Block, RAM Mirror, tính CRC payload, quản lý Dataset và cơ chế Redundant Block. Không tự thao tác Flash mà ủy quyền cho MemIf.',
    inputs: 'Lệnh từ SWC/EcuM, Callback Fee_JobEndNotification() / Fee_JobErrorNotification().',
    outputs: 'Gọi MemIf_Write/Read/Invalidate(DeviceIndex=0, BlockNumber) và cập nhật kết quả RAM Mirror.',
    apis: ['NvM_WriteBlock()', 'NvM_ReadBlock()', 'NvM_InvalidateNvBlock()', 'NvM_JobEndNotification()'],
    srd: 'SWS_NvM (ISO/AUTOSAR Classic)'
  },
  MOD_MEMIF: {
    id: 'MOD_MEMIF',
    name: 'MemIf (Memory Abstraction IF)',
    layer: 'ECU Abstraction (Thin Dispatch)',
    file: 'MemIf.h / MemIf.c',
    desc: 'Cầu nối siêu mỏng ánh xạ DeviceIndex (0 = Fee / Flash, 1 = Ea / EEPROM) và gom trạng thái trừu tượng MemIf_StatusType / MemIf_JobResultType.',
    inputs: 'DeviceIndex & BlockNumber từ NvM, trạng thái trả về từ Fee_GetStatus() / Fee_GetJobResult().',
    outputs: 'Macro/Inline dispatch trực tiếp sang Fee_Write(), Fee_Read(), Fee_SetMode(), Fee_Cancel().',
    apis: ['MemIf_Write()', 'MemIf_Read()', 'MemIf_GetStatus()', 'MemIf_GetJobResult()', 'MemIf_SetMode()'],
    srd: 'SWS_MemIf (Memory Abstraction Interface)'
  },
  MOD_DEM: {
    id: 'MOD_DEM',
    name: 'Dem (Diagnostic Event Mgr)',
    layer: 'Services Layer (Diagnostics)',
    file: 'Dem.c',
    desc: 'Ghi nhận các lỗi phần cứng Data Flash hoặc mất toàn vẹn dữ liệu nghiêm trọng tại runtime (Write Verify Failed, Erase Failed, ECC Unrecoverable).',
    inputs: 'Sự kiện sản xuất từ Fee hoặc NvM khi phần cứng Flash lỗi không thể tự sửa.',
    outputs: 'Lưu DTC & Freeze Frame vào bộ nhớ lỗi ECU (cũng thông qua NvM/Fee!).',
    apis: ['Dem_SetEventStatus(FEE_E_FLS_WRITE_FAILED, DEM_EVENT_STATUS_FAILED)', 'Dem_SetEventStatus(FEE_E_GC_ERASE_FAILED, ...)'],
    srd: 'SWS_Dem (Production Error Reporting)'
  },
  MOD_FEE: {
    id: 'MOD_FEE',
    name: 'Fee (Flash EEPROM Emulation)',
    layer: 'ECU Abstraction Layer (Module ID 21)',
    file: 'Fee.c / Fee_Gc.c',
    desc: 'Bộ điều khiển cốt lõi giả lập EEPROM trên Data Flash: đóng gói Header + Virtual Page Padding + Trailer 0xA5A5, tra cứu O(1) qua RAM LUT, san mòn (Wear Leveling) và Garbage Collection 2-Bank.',
    inputs: 'Lệnh từ MemIf, chu kỳ Fee_MainFunction(), dữ liệu/trạng thái trả về từ Fls hoặc R23 MemAcc.',
    outputs: 'Các chunk ghi/đọc/xóa gửi xuống Fls/MemAcc, Callback lên NvM và báo cáo DET/DEM.',
    apis: ['Fee_Init()', 'Fee_Read()', 'Fee_Write()', 'Fee_InvalidateBlock()', 'Fee_EraseImmediateBlock()', 'Fee_Cancel()', 'Fee_MainFunction()'],
    srd: 'AUTOSAR SWS_Fee (R20-11 / R23-11)'
  },
  MOD_DET: {
    id: 'MOD_DET',
    name: 'Det (Default Error Tracer)',
    layer: 'Services Layer (Dev Diagnostics)',
    file: 'Det.c',
    desc: 'Bắt các lỗi lập trình / sai tham số gọi API của Fee trong giai đoạn phát triển khi FeeDevErrorDetect = STD_ON.',
    inputs: 'Det_ReportError(ModuleId=21, InstanceId=0, ApiId, ErrorId).',
    outputs: 'Ghi nhận log lỗi (FEE_E_UNINIT 0x01, FEE_E_INVALID_BLOCK_NO 0x02, FEE_E_BUSY 0x06...) và hỗ trợ debug.',
    apis: ['Det_ReportError(21, 0, ApiId, ErrorId)', 'Det_ReportRuntimeError()'],
    srd: 'SWS_Det'
  },
  MOD_FLS: {
    id: 'MOD_FLS',
    name: 'Fls / MemAcc (Lower Flash Access)',
    layer: 'MCAL / Memory Services',
    file: 'Fls.c (Classic) / MemAcc.c (R23-11)',
    desc: 'Tầng giao tiếp trực tiếp với thanh ghi bộ điều khiển Data Flash. Classic dùng Fls_Write/Read/Erase; từ R23-11 chuyển sang MemAcc gộp vùng nhớ địa chỉ logic.',
    inputs: 'Địa chỉ vật lý Bank + Offset, độ dài chunk, chế độ Polling hoặc ISR JobEndNotification.',
    outputs: 'Lệnh Flash Controller xuống phần cứng DFlash, trả MEMIF_JOB_OK / MEMIF_JOB_FAILED về Fee.',
    apis: ['Fls_Write() / MemAcc_Write()', 'Fls_Read() / MemAcc_Read()', 'Fls_Erase() / MemAcc_Erase()', 'Fls_MainFunction()'],
    srd: 'SWS_Fls / SWS_MemAcc (R23-11)'
  },
  MOD_DFLASH: {
    id: 'MOD_DFLASH',
    name: 'Physical DFlash (2-Bank NVM)',
    layer: 'MCU Hardware Silicon',
    file: 'Bank 0 (0x0800_0000) & Bank 1 (0x0800_1000)',
    desc: 'Bộ nhớ Data Flash vật lý chia làm 2 Logical Bank luân phiên (Active & Standby). Chỉ cho phép ghi bit 1 -> 0; muốn đảo bit 0 -> 1 bắt buộc Fls_Erase cả Sector.',
    inputs: 'Xung điện áp lập trình page (Program) và xóa khối (Sector Erase) từ Fls/MemAcc.',
    outputs: 'Mức logic byte lưu trữ vĩnh viễn không bay hơi, tín hiệu ECC kiểm tra sai bit.',
    apis: ['Hardware Program (1 -> 0)', 'Hardware Sector Erase (-> 0xFF)', 'ECC Single/Double Bit Check'],
    srd: 'MCU Data Flash Hardware Specification'
  }
};

const ABBREVIATIONS = [
  // CORE (14 items)
  { abbr: 'FEE', full: 'Flash EEPROM Emulation', cat: 'CORE', desc: 'Module giả lập tính năng đọc/ghi từng byte của EEPROM trên bộ nhớ Data Flash có kích thước xóa theo sector.' },
  { abbr: 'VP', full: 'Virtual Page Size', cat: 'CORE', desc: 'Đơn vị căn chỉnh bộ nhớ tối thiểu (ví dụ 8 bytes) cho Header và phần đuôi Payload của mỗi block.' },
  { abbr: 'LUT', full: 'Lookup Table (RAM Address Cache)', cat: 'CORE', desc: 'Bảng ánh xạ lưu trong RAM giữ địa chỉ Bank + Offset mới nhất của mỗi Block để đọc với độ phức tạp O(1).' },
  { abbr: 'HDR', full: 'Fee Block Header', cat: 'CORE', desc: 'Phần đầu cố định của mỗi instance trên Flash chứa BlockNumber, BlockLength, WriteSeq và HeaderCRC.' },
  { abbr: 'TRL', full: 'Valid Trailer Pattern', cat: 'CORE', desc: 'Mẫu byte đóng dấu (ví dụ 0xA5A5) được ghi cuối cùng sau payload để khẳng định instance không bị ghi dở.' },
  { abbr: 'IMM', full: 'Immediate Data Block', cat: 'CORE', desc: 'Khối dữ liệu khẩn cấp (FeeImmediateData=TRUE) được ưu tiên ghi ngay cả khi bank gần đầy và có thể xen ngang GC.' },
  { abbr: 'PAD', full: 'Virtual Page Alignment Padding', cat: 'CORE', desc: 'Các byte ErasedValue (0xFF) tự động chèn vào sau payload để tổng độ dài block chia hết cho FeeVirtualPageSize.' },
  { abbr: 'DS', full: 'Dataset Block Selection', cat: 'CORE', desc: 'Cơ chế nhiều phiên bản song song (DS0, DS1...) được phân biệt qua các bit thấp của BlockNumber (DatasetSelectionBits).' },
  { abbr: 'CRC', full: 'Cyclic Redundancy Check', cat: 'CORE', desc: 'Mã kiểm tra dư vòng bảo vệ tính toàn vẹn của Block Header và NvM Payload trước lỗi bit-flip.' },
  { abbr: 'SEQ', full: 'Instance Write Sequence Number', cat: 'CORE', desc: 'Bộ đếm tăng dần giúp Fee nhận biết đâu là phiên bản ghi sau cùng khi quét startup scan.' },
  { abbr: 'INV', full: 'Block Invalidation Marker', cat: 'CORE', desc: 'Đánh dấu logic xóa mềm bằng Fee_InvalidateBlock() khiến lần Fee_Read kế tiếp trả MEMIF_BLOCK_INVALID.' },
  { abbr: 'OFS', full: 'Physical Sector Byte Offset', cat: 'CORE', desc: 'Độ lệch địa chỉ tính bằng byte từ đầu Bank 0 hoặc Bank 1 tới vị trí bắt đầu Header của instance.' },
  { abbr: 'SUP', full: 'Superseded Instance', cat: 'CORE', desc: 'Bản ghi cũ của một block đã có phiên bản mới hợp lệ; nằm chờ Garbage Collection thu hồi không gian.' },
  { abbr: 'MOD_ID', full: 'Fee AUTOSAR Module ID (21)', cat: 'CORE', desc: 'Mã định danh chuẩn của module Fee (= 21 / 0x15) dùng khi gọi Det_ReportError().' },

  // GC (14 items)
  { abbr: 'GC', full: 'Garbage Collection', cat: 'GC', desc: 'Quá trình thu gom rác: sao chép các instance VALID mới nhất sang Standby Bank rồi xóa sạch Old Bank.' },
  { abbr: 'WL', full: 'Wear Leveling', cat: 'GC', desc: 'Thuật toán san mòn số lần ghi/xóa đều trên toàn bộ ô nhớ Data Flash giúp kéo dài tuổi thọ chip.' },
  { abbr: 'SSW', full: 'Sector Switch (Bank Swap)', cat: 'GC', desc: 'Sự kiện chuyển vai trò Active Bank <-> Standby Copy Bank sau khi copy toàn bộ block hợp lệ.' },
  { abbr: 'ABK', full: 'Active Bank', cat: 'GC', desc: 'Sector Data Flash hiện đang tiếp nhận các bản ghi append mới nhất (ví dụ Bank 0).' },
  { abbr: 'SBK', full: 'Standby / Copy Bank', cat: 'GC', desc: 'Sector Data Flash dự phòng đang ở trạng thái Erased (0xFF) sẵn sàng làm đích sao chép khi kích hoạt GC.' },
  { abbr: 'THR', full: 'GC Trigger Threshold (%)', cat: 'GC', desc: 'Ngưỡng dung lượng sử dụng tối đa cho Standard Block (mặc định 75%) trước khi bắt buộc kích hoạt GC.' },
  { abbr: 'RIZ', full: 'Reserved Immediate Zone', cat: 'GC', desc: 'Vùng đệm an toàn ở cuối mỗi Bank chỉ cấp phát cho block FeeImmediateData=TRUE trong tình huống khẩn cấp.' },
  { abbr: 'BGC', full: 'Background Garbage Collection', cat: 'GC', desc: 'Thu gom rác chạy nền chia nhỏ theo từng chu kỳ Fee_MainFunction ở trạng thái MEMIF_BUSY_INTERNAL.' },
  { abbr: 'FGC', full: 'Foreground / Urgent GC', cat: 'GC', desc: 'Thu gom rác ưu tiên ngay khi không còn đủ chỗ cho lệnh Write đến, khiến user job phải đợi hoàn thành GC.' },
  { abbr: 'TORN', full: 'Torn Write (Power-Cut Artifact)', cat: 'GC', desc: 'Bản ghi dở dang do ECU mất điện giữa chừng khi chưa kịp ghi Valid Trailer 0xA5A5.' },
  { abbr: 'FBK', full: 'Fallback to Previous Instance', cat: 'GC', desc: 'Cơ chế phục hồi tự động quay về bản ghi liền trước có Trailer hợp lệ khi gặp bản ghi cuối bị Torn Write.' },
  { abbr: 'EIB', full: 'Erase Immediate Block', cat: 'GC', desc: 'API Fee_EraseImmediateBlock() dọn sẵn không gian trong Reserved Zone cho tình huống ghi khẩn cấp.' },
  { abbr: 'PEC', full: 'Program / Erase Cycle', cat: 'GC', desc: 'Một chu kỳ nạp (write) và xóa (erase) hoàn chỉnh quyết định độ hao mòn vật lý của Sector Data Flash.' },
  { abbr: 'RCL', full: 'Space Reclamation Ratio', cat: 'GC', desc: 'Tỷ lệ phần trăm dung lượng sạch thu hồi được từ các slot Superseded & Invalidated sau mỗi lượt GC.' },

  // STACK (14 items)
  { abbr: 'MEMIF', full: 'Memory Abstraction Interface', cat: 'STACK', desc: 'Tầng trừu tượng hóa giúp NvM truy cập đồng nhất xuống cả Fee (Flash) và Ea (EEPROM) qua DeviceIndex.' },
  { abbr: 'NVM', full: 'NVRAM Manager', cat: 'STACK', desc: 'Service Layer quản lý hàng đợi, RAM Mirror, CRC và phục hồi dữ liệu cho Application SWC.' },
  { abbr: 'FLS', full: 'Flash Driver (MCAL)', cat: 'STACK', desc: 'Trình điều khiển tầng thấp trực tiếp thao tác bộ điều khiển Data Flash trong kiến trúc AUTOSAR Classic trước R23-11.' },
  { abbr: 'MEMACC', full: 'Memory Access Module (R23-11)', cat: 'STACK', desc: 'Module thay thế Fls/Eep kết hợp quản lý vùng địa chỉ và arbitration trong AUTOSAR Classic Release R23-11 trở lên.' },
  { abbr: 'ECUM', full: 'ECU State Manager', cat: 'STACK', desc: 'Module quản lý trạng thái khởi động/tắt nguồn ECU, chịu trách nhiệm gọi Fee_Init() và kích hoạt NvM_WriteAll().' },
  { abbr: 'DET', full: 'Default Error Tracer', cat: 'STACK', desc: 'Module ghi nhận lỗi lập trình/tham số sai ở giai đoạn phát triển (FEE_E_UNINIT, FEE_E_BUSY...).' },
  { abbr: 'DEM', full: 'Diagnostic Event Manager', cat: 'STACK', desc: 'Module quản lý DTC lưu trữ các lỗi phần cứng sản xuất (Write Verify Error, Erase Error).' },
  { abbr: 'RTE', full: 'Runtime Environment', cat: 'STACK', desc: 'Tầng kết nối Port từ Application SWC xuống các dịch vụ BSW như NvM.' },
  { abbr: 'SWC', full: 'Software Component', cat: 'STACK', desc: 'Thành phần phần mềm ứng dụng chứa logic nghiệp vụ và nhu cầu lưu giữ thông số qua tắt/mở khóa xe.' },
  { abbr: 'SCHM', full: 'BSW Scheduler', cat: 'STACK', desc: 'Thành phần phân lịch gọi định kỳ Fee_MainFunction() và Fls_MainFunction() mỗi chu kỳ 5ms.' },
  { abbr: 'ECUC', full: 'ECU Configuration (ARXML)', cat: 'STACK', desc: 'Chuẩn mô tả cấu hình các thông số tĩnh/hậu biên dịch của BSW bằng file XML AUTOSAR.' },
  { abbr: 'LCFG', full: 'Link-Time Configuration', cat: 'STACK', desc: 'File C (Fee_Lcfg.c) chứa cấu trúc bảng hằng số cấu hình các Block tại thời điểm liên kết.' },
  { abbr: 'CBK', full: 'Asynchronous Job Notification Callback', cat: 'STACK', desc: 'Hàm Fee_JobEndNotification() / Fee_JobErrorNotification() báo kết quả hoàn thành cho tầng NvM.' },
  { abbr: 'POLL', full: 'Polling Synchronization Mode', cat: 'STACK', desc: 'Chế độ kiểm tra định kỳ Fls_GetJobResult() bên trong MainFunction thay vì dùng ngắt ISR callback.' },

  // HW (14 items)
  { abbr: 'DFLASH', full: 'Data Flash Memory', cat: 'HW', desc: 'Bộ nhớ Flash phi khả biến tối ưu cho lưu dữ liệu (Sector nhỏ hơn Code Flash, chịu được 100k+ chu kỳ xóa).' },
  { abbr: 'PFLASH', full: 'Program / Code Flash', cat: 'HW', desc: 'Bộ nhớ Flash chứa mã chương trình thực thi, ít linh hoạt về sector nhỏ hơn Data Flash.' },
  { abbr: 'ECC', full: 'Error Correction Code', cat: 'HW', desc: 'Mã phần cứng tự động sửa lỗi 1-bit (SEC) và phát hiện lỗi 2-bit không thể sửa (DED) trên đường truyền DFlash.' },
  { abbr: 'ERASED', full: 'Erased Cell State (0xFF)', cat: 'HW', desc: 'Trạng thái vật lý tự nhiên của cell NOR/Data Flash sau lệnh Sector Erase: toàn bộ bit ở mức logic 1.' },
  { abbr: 'PGM', full: 'Flash Cell Programming (1 -> 0)', cat: 'HW', desc: 'Thao tác nạp điện tích chỉ có thể kéo bit từ 1 về 0; không thể kéo từ 0 lên 1 nếu chưa Erase.' },
  { abbr: 'SLOW_M', full: 'MEMIF_MODE_SLOW', cat: 'HW', desc: 'Chế độ băng thông thấp (~8B/tick) giữ tải CPU thấp và không ảnh hưởng các tác vụ thời gian thực khi xe chạy.' },
  { abbr: 'FAST_M', full: 'MEMIF_MODE_FAST', cat: 'HW', desc: 'Chế độ băng thông cao (~64B/tick) rút ngắn thời gian ghi NvM_WriteAll() lúc tắt khóa ECU.' },
  { abbr: 'B0', full: 'Physical Sector Bank 0 (0x0800_0000)', cat: 'HW', desc: 'Vùng địa chỉ cơ sở giả lập của Logical Sector 0 trong bộ nhớ Data Flash 2-Bank.' },
  { abbr: 'B1', full: 'Physical Sector Bank 1 (0x0800_1000)', cat: 'HW', desc: 'Vùng địa chỉ cơ sở giả lập của Logical Sector 1 trong bộ nhớ Data Flash 2-Bank.' },
  { abbr: 'WVER', full: 'Flash Write Verify', cat: 'HW', desc: 'Bước đọc kiểm tra ngay sau khi nạp page Flash để đảm bảo dữ liệu trên silicon khớp bộ đệm RAM.' },
  { abbr: 'EFAIL', full: 'Hardware Erase Failure', cat: 'HW', desc: 'Lỗi phần cứng khi một sector không thể đưa về 0xFF do ô nhớ bị chai quá mức P/E cycle.' },
  { abbr: 'ISR', full: 'Interrupt Service Routine', cat: 'HW', desc: 'Trình phục vụ ngắt phần cứng phát tín hiệu Fls_JobEndNotification ngay khi bộ điều khiển Flash xong việc.' },
  { abbr: 'ALIGN', full: 'Address & Size Alignment', cat: 'HW', desc: 'Yêu cầu căn tròn địa chỉ và độ dài ghi theo bội số page lập trình phần cứng (ví dụ 8 bytes).' },
  { abbr: 'RET', full: 'Data Retention Lifetime', cat: 'HW', desc: 'Thời gian lưu giữ dữ liệu ổn định trên ô nhớ Flash ở nhiệt độ ô tô (thường >= 15-20 năm).' }
];
