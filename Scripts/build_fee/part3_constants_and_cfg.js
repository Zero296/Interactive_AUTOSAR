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
  FEE_E_UNINIT: { id: '0x01', kind: 'DEV', name: 'FEE_E_UNINIT', apiHint: 'Read/Write/Cancel/GetJobResult/Invalidate/EraseImmediate/SetMode', desc: '[SWS_Fee_00010] Gọi API dịch vụ khi module đang ở trạng thái MEMIF_UNINIT (chưa gọi Fee_Init()).' },
  FEE_E_INVALID_BLOCK_NO: { id: '0x02', kind: 'DEV', name: 'FEE_E_INVALID_BLOCK_NO', apiHint: 'Read/Write/Invalidate/EraseImmediate', desc: '[SWS_Fee_00010] BlockNumber bằng 0x0000, 0xFFFF [SWS_Fee_00006], chưa cấu hình hoặc Fee_EraseImmediateBlock() gọi cho block không phải Immediate [SWS_Fee_00068].' },
  FEE_E_INVALID_BLOCK_OFS: { id: '0x03', kind: 'DEV', name: 'FEE_E_INVALID_BLOCK_OFS', apiHint: 'Fee_Read', desc: '[SWS_Fee_00010 / SWS_Fee_00135] BlockOffset >= FeeBlockSize cấu hình của block.' },
  FEE_E_PARAM_POINTER: { id: '0x04', kind: 'DEV', name: 'FEE_E_PARAM_POINTER', apiHint: 'Read/Write/GetVersionInfo', desc: '[SWS_Fee_00010] Con trỏ DataBufferPtr hoặc VersionInfoPtr bị NULL_PTR.' },
  FEE_E_INVALID_BLOCK_LEN: { id: '0x05', kind: 'DEV', name: 'FEE_E_INVALID_BLOCK_LEN', apiHint: 'Fee_Read', desc: '[SWS_Fee_00010 / SWS_Fee_00137] Length == 0 hoặc (BlockOffset + Length) vượt quá FeeBlockSize.' },
  FEE_E_BUSY: { id: '0x06', kind: 'RUNTIME', name: 'FEE_E_BUSY', apiHint: 'Read/Write/Invalidate/EraseImmediate/SetMode', desc: '[SWS_Fee_91002] Runtime Error: API gọi khi module đang ở trạng thái MEMIF_BUSY xử lý yêu cầu tầng trên (MEMIF_BUSY_INTERNAL vẫn được chấp nhận).' },
  FEE_E_INVALID_CANCEL: { id: '0x08', kind: 'RUNTIME', name: 'FEE_E_INVALID_CANCEL', apiHint: 'Fee_Cancel', desc: '[SWS_Fee_91002 / SWS_Fee_00184] Runtime Error: Gọi Fee_Cancel() khi trạng thái module không phải MEMIF_BUSY.' }
};

const configTooltipData = {
  FeeInitialized: {
    title: 'FeeInitialized (Runtime Init Flag)',
    type: 'ECUC Boolean / Runtime Guard',
    desc: 'Mô phỏng trạng thái đã chạy Fee_Init(&Fee_Config) hay chưa. Nếu FALSE (MEMIF_UNINIT), các API dịch vụ bị chặn với FEE_E_UNINIT (0x01) và không thay đổi trạng thái.',
    range: 'TRUE | FALSE',
    impact: 'Kiểm soát Bit 7 FEE_INIT trên Thanh A; Fee_Init() đưa từ MEMIF_UNINIT sang MEMIF_BUSY_INTERNAL [SWS_Fee_00120] rồi Fee_MainFunction() sang MEMIF_IDLE [SWS_Fee_00197].',
    ref: 'SWS_Fee_00085 / SWS_Fee_00120 / SWS_Fee_00034'
  },
  FeeDevErrorDetect: {
    title: 'FeeDevErrorDetect',
    type: 'ECUC Boolean Parameter',
    desc: 'Bật/tắt phát hiện và báo cáo Development Errors (0x01..0x05) qua Det_ReportError(ModuleId=21, ...). Lưu ý: Runtime Errors (FEE_E_BUSY 0x06, FEE_E_INVALID_CANCEL 0x08) luôn báo qua Det_ReportRuntimeError.',
    range: 'TRUE | FALSE (Mặc định chuẩn: false)',
    impact: 'Khi TRUE: các lỗi UNINIT, BLOCK_NO, OFS, LEN, PTR sinh entry trên API Trace.',
    ref: 'ECUC_Fee_00111 / SWS_Fee_00010 / SWS_Fee_91002'
  },
  FeeVersionInfoApi: {
    title: 'FeeVersionInfoApi',
    type: 'ECUC Boolean Parameter',
    desc: 'Công tắc tiền xử lý bật/tắt API Fee_GetVersionInfo(Std_VersionInfoType* VersionInfoPtr) (Service ID 0x08).',
    range: 'TRUE | FALSE (Mặc định chuẩn: false)',
    impact: 'Xuất macro #define FEE_VERSION_INFO_API STD_ON/OFF trong Fee_Cfg.h và cho phép gọi Fee_GetVersionInfo().',
    ref: 'ECUC_Fee_00115 / SWS_Fee_00093 / SWS_Fee_00147'
  },
  FeePollingMode: {
    title: 'FeePollingMode',
    type: 'ECUC Boolean Parameter',
    desc: 'Công tắc bật/tắt chế độ Polling với tầng dưới MemAcc/Fls: TRUE dùng Polling định kỳ MemAcc_GetJobResult() trong Fee_MainFunction(), FALSE dùng Callback Notification (Fee_JobEndNotification).',
    range: 'TRUE (Polling) | FALSE (Callback Enabled)',
    impact: 'Khi Polling=TRUE, Fee hỏi kết quả qua GetJobResult() thay vì nhận callback ngắt từ tầng dưới.',
    ref: 'ECUC_Fee_00114 / SWS_Fee_00095'
  },
  FeeSetModeSupported: {
    title: 'FeeSetModeSupported (Legacy R20-11)',
    type: 'Legacy R20-11 ECUC Switch',
    desc: 'Cho phép NvM/MemIf chuyển chế độ tốc độ MEMIF_MODE_SLOW ↔ MEMIF_MODE_FAST qua Fee_SetMode() trong kiến trúc Classic R20-11 Fls (API này đã được bỏ ở R21-11..R25-11 khi chuyển sang MemAcc).',
    range: 'TRUE | FALSE',
    impact: 'Nếu FALSE, lệnh chuyển SLOW ↔ FAST bị vô hiệu hóa ở mức cấu hình.',
    ref: 'Classic R20-11 Legacy (Removed in R25-11 MemAcc)'
  },
  FeeMainFunctionPeriod: {
    title: 'FeeMainFunctionPeriod [ms]',
    type: 'ECUC Float Param (Giây trong ARXML)',
    desc: 'Chu kỳ giữa các lần SchM gọi Fee_MainFunction() (Service ID 0x12). Trong ARXML chuẩn đơn vị là giây (]0..INF[), trình mô phỏng hiển thị theo ms để dễ quan sát.',
    range: '1 .. 50 ms (Mặc định mô phỏng: 5 ms)',
    impact: 'Quyết định tổng latency tính theo ms của Write, Read, GC copy và Erase.',
    ref: 'ECUC_Fee_00153 / SWS_Fee_00097'
  },
  FeeVirtualPageSize: {
    title: 'FeeVirtualPageSize [Bytes]',
    type: 'ECUC Integer (0..65535)',
    desc: 'Kích thước trang ảo (Virtual Page) để căn chỉnh mỗi Logical Block. Phải là bội số nguyên của physical page size [SWS_Fee_00076] và mỗi block chiếm bội số nguyên của VP [SWS_Fee_00005].',
    range: '4 | 8 | 16 | 32 Bytes',
    impact: 'Công thức dung lượng slot = AlignUp(HeaderSize, VP) + AlignUp(BlockSize, VP).',
    ref: 'ECUC_Fee_00116 / SWS_Fee_00076 / SWS_Fee_00005'
  },
  FeeMinimumReadPageSize: {
    title: 'FeeMinimumReadPageSize [Bytes]',
    type: 'ECUC Integer (DRAFT, 0..65535)',
    desc: 'Đơn vị trang đọc tối thiểu mà Fee căn chỉnh khi gửi yêu cầu đọc xuống MemAcc/Fls [SWS_Fee_00196]. Trên giao diện logic Fee_Read() cho phép BlockOffset & Length bất kỳ [SWS_Fee_00021].',
    range: '1 .. 32 Bytes',
    impact: 'Hiển thị độ mịn căn chỉnh khi Partial Read một đoạn nhỏ trong Block Payload.',
    ref: 'ECUC_Fee_00156 (DRAFT) / SWS_Fee_00196 / SWS_Fee_00021'
  },
  FeeBlockHeaderSize: {
    title: 'FeeBlockHeaderSize [Bytes]',
    type: 'Implementation Overhead (FeeBlockOverhead)',
    desc: 'Kích thước siêu dữ liệu quản lý đầu mỗi instance trên Flash (tương ứng thông số công bố FeeBlockOverhead). Được căn tròn theo bội số VirtualPage.',
    range: '4 .. 32 Bytes (Mặc định: 8B)',
    impact: 'Tăng Header làm tiêu tốn dung lượng Bank DFlash nhanh hơn với block nhỏ.',
    ref: 'ECUC_Fee_00117 (FeeBlockOverhead) / ECUC_Fee_00118 (FeePageOverhead)'
  },
  FeeEnableHeaderCrc: {
    title: 'FeeEnableHeaderCrc',
    type: 'Implementation Safety Option',
    desc: 'Bật kiểm tra CRC trên metadata của Block để phát hiện hỏng dữ liệu quản lý khi Scan & Read phục vụ yêu cầu quản lý tính đúng đắn khối (correctness).',
    range: 'TRUE | FALSE',
    impact: 'Nếu FALSE, Fee chỉ dựa vào Valid Trailer Pattern để xác nhận toàn vẹn.',
    ref: 'SWS_Fee_00049 / SWS_Fee_00023'
  },
  FeeValidTrailerPattern: {
    title: 'FeeValidTrailerPattern (Hex)',
    type: 'Implementation Pattern (16-bit)',
    desc: 'Mẫu byte xác nhận cuối slot (Implementation-specific) giúp thực hiện [SWS_Fee_00153]/[SWS_Fee_00154]: đánh dấu block "corrupted" khi bắt đầu ghi và "not corrupted" khi ghi hoàn tất.',
    range: '0xA5A5 | 0x5A5A | 0xAA55 (Khác ErasedValue 0xFF)',
    impact: 'Nếu mất điện trước khi chốt pattern này, quá trình quét nhận diện bản ghi bị Torn Write (INCONSISTENT).',
    ref: 'SWS_Fee_00049 / SWS_Fee_00153 / SWS_Fee_00154'
  },
  FeeErasedValue: {
    title: 'FeeErasedValue (Hex)',
    type: 'Flash Erased Cell Value',
    desc: 'Giá trị mặc định của từng byte trên Data Flash sau khi Erase thành công và dùng làm byte đệm (Internal Residue) ở cuối Virtual Page cuối cùng.',
    range: '0xFF (NOR/DFlash) | 0x00',
    impact: 'Mọi ô trống và byte Padding cuối payload hiển thị đúng giá trị này trên Flash Map.',
    ref: 'SWS_Fee_00005 / Table 2.1 (Internal residue)'
  },
  SelectedFeeBlock: {
    title: 'SelectedFeeBlock (Active Config Block)',
    type: 'Block Selector Reference',
    desc: 'Chọn một trong 5 khối dữ liệu mẫu trong FeeBlockConfiguration để chỉnh sửa thuộc tính và thao tác nhanh.',
    range: '0x0010 .. 0x0040',
    impact: 'Đồng bộ với danh sách Block ở Quick Action Bar và nạp lại BlockSize / Immediate.',
    ref: 'ECUC_Fee_00040 (FeeBlockConfiguration)'
  },
  FeeBlockNumber: {
    title: 'FeeBlockNumber (Hex ID)',
    type: 'ECUC Integer (1..65534)',
    desc: 'Mã định danh duy nhất của Logical Block. Hai giá trị 0x0000 và 0xFFFF bị cấm [SWS_Fee_00006]. Miền chuẩn: min = 2^NVM_DATASET_SELECTION_BITS, max = 0xFFFF - 2^NVM_DATASET_SELECTION_BITS.',
    range: '0x0001 .. 0xFFFE (0x0000 & 0xFFFF bị cấm)',
    impact: 'Truyền 0x0000, 0xFFFF hoặc Block chưa cấu hình sẽ kích hoạt DET FEE_E_INVALID_BLOCK_NO (0x02).',
    ref: 'ECUC_Fee_00150 / SWS_Fee_00006'
  },
  FeeBlockSize: {
    title: 'FeeBlockSize [Bytes]',
    type: 'ECUC Integer (1..65535)',
    desc: 'Kích thước dữ liệu thực (raw payload) của Logical Block tính bằng byte theo cấu hình.',
    range: '1 .. 240 Bytes (Chuẩn: 1 .. 65535)',
    impact: 'Thay đổi BlockSize tự động tính lại số Virtual Page và kiểm tra biên Offset/Length khi Fee_Read().',
    ref: 'ECUC_Fee_00148 / SWS_Fee_00005'
  },
  FeeImmediateData: {
    title: 'FeeImmediateData',
    type: 'ECUC Boolean Parameter',
    desc: 'Đánh dấu Block chứa dữ liệu khẩn cấp (Crash Event). Theo [SWS_Fee_00009], khối Immediate phải ghi được tức thì không bị trì hoãn bởi thao tác nội bộ (GC) hay cần Erase trước.',
    range: 'TRUE | FALSE',
    impact: 'Khi TRUE: bật Bit 4 IMM_BLOCK (Thanh B), cho phép gọi Fee_EraseImmediateBlock() [SWS_Fee_00068] và xen ngang GC.',
    ref: 'ECUC_Fee_00151 / SWS_Fee_00009 / SWS_Fee_00067 / SWS_Fee_00068'
  },
  FeeNumberOfWriteCycles: {
    title: 'FeeNumberOfWriteCycles',
    type: 'ECUC Integer (0..4294967295)',
    desc: 'Số chu kỳ ghi dự kiến suốt vòng đời của Block, buộc Fee phải phân bổ ghi đều (Wear Leveling) nếu phần cứng Flash không đáp ứng đủ [SWS_Fee_00103].',
    range: '1,000 .. 1,000,000 cycles',
    impact: 'Phản ánh độ bền yêu cầu khi sinh cấu hình ARXML / Fee_Lcfg.c.',
    ref: 'ECUC_Fee_00110 / SWS_Fee_00102 / SWS_Fee_00103'
  },
  FeeDatasetSelectionBits: {
    title: 'FeeDatasetSelectionBits (NVM_DATASET_SELECTION_BITS)',
    type: 'ECUC NvM Parameter (0..8 bits)',
    desc: 'Số bit LSB của 16-bit BlockNumber dùng mã hóa chỉ số Dataset/Redundant copy [SWS_Fee_00100]. Các bit MSB còn lại dùng xác định Block gốc.',
    range: '0 .. 4 bits',
    impact: 'Giải thích quan hệ giữa BlockNumber 0x0020 (DS0) và 0x0021 (DS1) độc lập nhau.',
    ref: 'SWS_Fee_00100 / ECUC_Fee_00150 (Figure 7.1)'
  },
  FeeBank0SizeBytes: {
    title: 'FeeBank0SizeBytes [Bytes]',
    type: 'Sector Physical Capacity',
    desc: 'Dung lượng vật lý của Flash Bank 0 (Logical Sector 0) tính bằng byte trong mô hình Multi-Bank (mặc định 2 Bank, hỗ trợ mở rộng tối đa 4 Bank).',
    range: '128 .. 512 Bytes (Mặc định: 256B)',
    impact: 'Khi dung lượng sử dụng chạm ngưỡng GC, Fee thu gom rác sang Standby Bank kế tiếp.',
    ref: 'SWS_Fee_00103 (Wear Leveling Geometry)'
  },
  FeeBank1SizeBytes: {
    title: 'FeeBank1SizeBytes [Bytes]',
    type: 'Sector Physical Capacity',
    desc: 'Dung lượng vật lý mặc định cho Flash Bank 1 (và các Bank mở rộng 2, 3 khi bấm Thêm Bank).',
    range: '128 .. 512 Bytes (Mặc định: 256B)',
    impact: 'Nên đặt bằng Bank 0 để đảm bảo toàn bộ dữ liệu sống luôn chuyển sang được khi Sector Switch.',
    ref: 'SWS_Fee_00103 (Wear Leveling Geometry)'
  },
  FeeGcTriggerThresholdPct: {
    title: 'FeeGcTriggerThresholdPct [%]',
    type: 'GC Watermark Percentage',
    desc: 'Ngưỡng đầy (%) trên Active Bank để khởi phát Garbage Collection cho các bản ghi Standard Block.',
    range: '50% .. 95% (Mặc định: 75%)',
    impact: 'Khoảng từ Threshold tới 100% được giữ dự phòng cho Immediate Data [SWS_Fee_00009].',
    ref: 'SWS_Fee_00009 / Internal Management Operations'
  },
  FeeReservedImmediateSpaceBytes: {
    title: 'FeeReservedImmediateSpaceBytes [B]',
    type: 'Reserved Flash Bytes',
    desc: 'Dung lượng pre-erased dự phòng tối thiểu ở cuối mỗi Bank chỉ dành riêng cho khối FeeImmediateData=TRUE để đảm bảo ghi không cần xóa [SWS_Fee_00009].',
    range: '16 .. 128 Bytes (Mặc định: 64B)',
    impact: 'Hiển thị vùng "Reserved Immediate Zone" trên bản đồ Bank 0 & Bank 1.',
    ref: 'SWS_Fee_00009 / SWS_Fee_00067'
  },
  FeeEnableBackgroundGc: {
    title: 'FeeEnableBackgroundGc',
    type: 'Internal Management Behavior',
    desc: 'Cho phép chạy thu gom rác nền ở trạng thái MEMIF_BUSY_INTERNAL [SWS_Fee_00074]. Các thao tác nội bộ này không làm thay đổi Fee_GetJobResult() [SWS_Fee_00155] và kết thúc về MEMIF_IDLE [SWS_Fee_00197].',
    range: 'TRUE | FALSE',
    impact: 'Khi TRUE, thao tác nội bộ chạy nền từng tick trong Fee_MainFunction().',
    ref: 'SWS_Fee_00074 / SWS_Fee_00155 / SWS_Fee_00197'
  },
  FeeMaxEraseCyclesPerSector: {
    title: 'FeeMaxEraseCyclesPerSector',
    type: 'Hardware Endurance Limit',
    desc: 'Giới hạn số lần xóa (P/E cycles) định mức của một sector Data Flash phần cứng, dùng đối chiếu với FeeNumberOfWriteCycles [SWS_Fee_00103].',
    range: '10,000 .. 500,000 cycles',
    impact: 'So sánh với Erase Counter thực tế của Bank 0 & Bank 1 trên Flash Summary Bar.',
    ref: 'SWS_Fee_00103'
  },
  FeeLowerLayerArchitecture: {
    title: 'FeeLowerLayerArchitecture (R20-11 vs R23/R25-11)',
    type: 'AUTOSAR Release Stack Switch',
    desc: 'Chuyển đổi tầng dưới giữa Classic Fls Driver (R20-11 trở về trước) và AUTOSAR R23-11/R25-11 Memory Access (MemAcc_Write/Read/Erase/Compare/BlankCheck/Cancel/GetJobResult [SWS_Fee_00105]/[00104]).',
    range: 'CLASSIC_FLS | R23_MEMACC',
    impact: 'Đổi tên khối SVG, Code C, API Trace (kèm MemAcc_BlankCheck [SWS_Fee_00187] & Fee_JobEndNotification hợp nhất [SWS_Fee_00194]).',
    ref: 'SWS_Fee_00084 / SWS_Fee_00105 / SWS_Fee_00104'
  },
  ActiveMemIfMode: {
    title: 'ActiveMemIfMode',
    type: 'MemIf_ModeType Enum (Classic R20-11)',
    desc: 'Chế độ hoạt động đặt qua Fee_SetMode() ở Classic Fls: SLOW tiết kiệm CPU khi xe chạy; FAST đẩy tối đa bytes/tick khi Startup/Shutdown (ở R25-11 MemAcc tự quản lý qua AddressArea priority).',
    range: 'MEMIF_MODE_SLOW | MEMIF_MODE_FAST',
    impact: 'Đồng bộ Bit 4 FAST_MODE (Thanh A) và tốc độ ghi/đọc mỗi chu kỳ MainFunction.',
    ref: 'Classic R20-11 / MemIf_ModeType'
  },
  FlsBytesPerCycleSlow: {
    title: 'FlsBytesPerCycleSlow [B/tick]',
    type: 'Lower Layer Throughput (Slow)',
    desc: 'Số byte tối đa mà Fls/MemAcc xử lý trong mỗi chu kỳ MainFunction khi ở MEMIF_MODE_SLOW.',
    range: '4 .. 32 Bytes/tick (Mặc định: 8B)',
    impact: 'Ví dụ Block slot 32B sẽ mất 32/8 = 4 ticks (20ms) ở chế độ SLOW.',
    ref: 'FlsMaxWriteNormalMode'
  },
  FlsBytesPerCycleFast: {
    title: 'FlsBytesPerCycleFast [B/tick]',
    type: 'Lower Layer Throughput (Fast)',
    desc: 'Số byte tối đa mà Fls/MemAcc xử lý trong mỗi chu kỳ MainFunction khi chuyển sang MEMIF_MODE_FAST.',
    range: '16 .. 256 Bytes/tick (Mặc định: 64B)',
    impact: 'Ví dụ Block slot 32B chỉ mất 1 tick (5ms) ở chế độ FAST!',
    ref: 'FlsMaxWriteFastMode'
  },
  FlsSectorEraseDurationTicks: {
    title: 'FlsSectorEraseDurationTicks',
    type: 'Hardware Erase Latency (Ticks)',
    desc: 'Số chu kỳ MainFunction cần thiết để Fls_Erase() hoặc MemAcc_Erase() [SWS_Fee_00105] hoàn thành xóa một Bank DFlash.',
    range: '1 .. 10 ticks (Mặc định: 3 ticks)',
    impact: 'Quyết định thời gian pha cuối của Garbage Collection.',
    ref: 'SWS_Fee_00105 (MemAcc_Erase)'
  },
  FeeNvmJobNotificationsEnabled: {
    title: 'FeeNvmJobNotificationsEnabled',
    type: 'ECUC Callback Config',
    desc: 'Bật/tắt phát thông báo kết thúc công việc bất đồng bộ FeeNvmJobEndNotification (NvM_JobEndNotification) [SWS_Fee_00055] và FeeNvmJobErrorNotification (NvM_JobErrorNotification) [SWS_Fee_00056].',
    range: 'TRUE | FALSE',
    impact: 'Điều khiển mũi tên Callback ngược lên NvM và hiển thị log trong API Trace.',
    ref: 'ECUC_Fee_00112 / ECUC_Fee_00113 / SWS_Fee_00055 / SWS_Fee_00056'
  },
  FeeEnableRamLutCache: {
    title: 'FeeEnableRamLutCache',
    type: 'Performance Optimization',
    desc: 'Bật bảng tra nhanh trong RAM (Fee_BlockLutCache) ánh xạ BlockNumber -> Physical Bank & Offset ngay từ quá trình Init scan.',
    range: 'TRUE (O(1)) | FALSE (O(N) Linear Scan)',
    impact: 'Nếu tắt (FALSE), Fee_Read() mất thêm tick quét tuần tự trên Active Bank.',
    ref: 'SWS_Fee_00007 / SWS_Fee_00076'
  },
  SimulatePowerLossDuringWrite: {
    title: 'SimulatePowerLossDuringWrite',
    type: 'Fault Injection Toggle',
    desc: 'Mô phỏng mất nguồn ECU ngay giữa lúc ghi (khi block đang đánh dấu "corrupted" theo [SWS_Fee_00153] và chưa kịp chốt "not corrupted" theo [SWS_Fee_00154]).',
    range: 'TRUE (Inject Torn Write) | FALSE',
    impact: 'Tạo ra bản ghi INCONSISTENT (Bit 0 = 1) để kiểm chứng [SWS_Fee_00023] & phục hồi đa phiên bản.',
    ref: 'SWS_Fee_00049 / SWS_Fee_00153 / SWS_Fee_00154'
  },
  FeeAutoFallbackPreviousInstance: {
    title: 'FeeAutoFallbackPreviousInstance',
    type: 'Recovery Strategy Toggle',
    desc: 'Khi phát hiện bản mới nhất bị Torn Write (INCONSISTENT), tự động lùi lại bản ghi liền trước toàn vẹn; nếu tắt (hoặc không có bản cũ), Fee trả MEMIF_BLOCK_INCONSISTENT [SWS_Fee_00023].',
    range: 'TRUE (Recover Prev Valid) | FALSE (Report Inconsistent)',
    impact: 'Nếu TRUE: trả MEMIF_JOB_OK từ bản cũ; nếu FALSE: trả MEMIF_BLOCK_INCONSISTENT [SWS_Fee_00159] và không trả dữ liệu hỏng cho caller.',
    ref: 'SWS_Fee_00023 / SWS_Fee_00159'
  },
  SimulateFlsWriteVerifyError: {
    title: 'SimulateFlsWriteVerifyError',
    type: 'Hardware Fault Injection',
    desc: 'Giả lập lỗi ghi phần cứng từ tầng dưới (MemAcc trả MEMACC_FAILED [SWS_Fee_00105]), khiến Fee đánh dấu thất bại MEMIF_JOB_FAILED [SWS_Fee_00158] và gọi NvM_JobErrorNotification() [SWS_Fee_00056].',
    range: 'TRUE | FALSE',
    impact: 'Kích hoạt chuỗi xử lý lỗi trong Fee_JobEndNotification() [SWS_Fee_00194] -> NvM_JobErrorNotification().',
    ref: 'SWS_Fee_00056 / SWS_Fee_00158 / SWS_Fee_00194'
  },
  SimulateFlsEraseError: {
    title: 'SimulateFlsEraseError',
    type: 'Hardware Fault Injection',
    desc: 'Giả lập lỗi phần cứng khi xóa Bank cũ ở bước cuối Garbage Collection (MemAcc_Erase / Fls_Erase trả MEM_JOB_FAILED [SWS_Fee_00105]).',
    range: 'TRUE | FALSE',
    impact: 'Đẩy Sector State sang SECTOR_CORRUPT_DEM, đặt job result MEMIF_JOB_FAILED [SWS_Fee_00158] và báo cảnh báo phần cứng.',
    ref: 'SWS_Fee_00105 / SWS_Fee_00158'
  },
  SimulateFlashEccBitFlip: {
    title: 'SimulateFlashEccBitFlip',
    type: 'Hardware Fault Injection',
    desc: 'Giả lập lỗi ECC Uncorrectable khi đọc Flash (MemAcc trả MEMACC_ECC_UNCORRECTED [SWS_Fee_00105]). Fee không trả dữ liệu hỏng mà đặt MEMIF_BLOCK_INCONSISTENT [SWS_Fee_00023].',
    range: 'TRUE | FALSE',
    impact: 'Fee_Read() dừng, đặt JobResult = MEMIF_BLOCK_INCONSISTENT [SWS_Fee_00159] và gọi NvM_JobErrorNotification() [SWS_Fee_00056].',
    ref: 'SWS_Fee_00023 / SWS_Fee_00159 / SWS_Fee_00105'
  }
};

const MODULES_INFO = {
  MOD_SWC: {
    id: 'MOD_SWC',
    name: 'SWC (Application Layer)',
    layer: 'Application Layer',
    file: 'App_NvMUser.c',
    desc: 'Thành phần phần mềm ứng dụng (Odometer, Engine Calib, Crash Detection). Đọc/ghi dữ liệu bền vững qua RTE Port tới NvM NVRAM Blocks.',
    inputs: 'Dữ liệu tính toán trong RAM (Mirrors), sự kiện va chạm hoặc lệnh Read/Write từ ứng dụng.',
    outputs: 'Lời gọi Rte_Call_NvMService_WriteBlock() / ReadBlock() / InvalidateNvBlock() xuống RTE.',
    apis: ['Rte_Call_PS_EngineLearn_WriteBlock()', 'Rte_Call_PS_Odometer_ReadBlock()', 'Rte_Call_PS_Crash_WriteBlock()'],
    srd: 'AUTOSAR Application / NvM Port Interface'
  },
  MOD_RTE: {
    id: 'MOD_RTE',
    name: 'RTE & SchM (BSW Scheduler)',
    layer: 'Runtime Environment / System',
    file: 'Rte_NvM.c / SchM_Fee.h',
    desc: 'Lớp trung gian kết nối Application SWC với BSW Service NvM và lập lịch gọi định kỳ Fee_MainFunction() [SWS_Fee_00097] theo chu kỳ FeeMainFunctionPeriod [ECUC_Fee_00153].',
    inputs: 'Yêu cầu C/S Port từ SWC, tick hệ thống SchM và callback từ NvM.',
    outputs: 'Chuyển tiếp xuống NvM_WriteBlock()/ReadBlock(), gọi định kỳ Fee_MainFunction() và trả JobFinished về SWC.',
    apis: ['Rte_Call_NvMService_WriteBlock()', 'Fee_MainFunction() [SchM_Fee.h]', 'Rte_NvM_JobFinished_Callback()'],
    srd: 'SWS_Rte / SWS_Fee_00097 / ECUC_Fee_00153'
  },
  MOD_ECUM: {
    id: 'MOD_ECUM',
    name: 'EcuM & BswM (ECU State Mgr)',
    layer: 'System Services',
    file: 'EcuM_Callout_Stubs.c',
    desc: 'Quản lý vòng đời ECU: EcuM gọi đồng bộ Fee_Init(&Fee_Config) [SWS_Fee_00085] để đưa Fee từ MEMIF_UNINIT sang MEMIF_BUSY_INTERNAL [SWS_Fee_00120]; phối hợp NvM_ReadAll() khi bật máy và NvM_WriteAll() khi tắt máy.',
    inputs: 'Startup Init List, GoDown / Shutdown Preparation trigger.',
    outputs: 'Gọi Fee_Init(&Fee_Config) khi khởi động và điều phối NvM_WriteAll() khi Shutdown.',
    apis: ['Fee_Init(&Fee_Config) [SWS_Fee_00085]', 'NvM_ReadAll()', 'NvM_WriteAll()'],
    srd: 'SWS_EcuM / SWS_Fee_00085 / SWS_Fee_00120'
  },
  MOD_NVM: {
    id: 'MOD_NVM',
    name: 'NvM (NVRAM Manager)',
    layer: 'Services Layer (Memory)',
    file: 'NvM.c / NvM_JobProc.c',
    desc: 'Quản lý hàng đợi NVRAM Block, RAM Mirror, tính CRC payload, quản lý Dataset [SWS_Fee_00100] và Redundant Block. Nếu cần ghi Immediate Data khi đang có job ưu tiên thấp chạy, NvM phải gọi Fee_Cancel() trước [SWS_Fee_00009].',
    inputs: 'Lệnh từ SWC/EcuM, Callback NvM_JobEndNotification() [SWS_Fee_00055] / NvM_JobErrorNotification() [SWS_Fee_00056].',
    outputs: 'Gọi MemIf_Write/Read/Invalidate/Cancel(DeviceIndex=0, BlockNumber) và cập nhật RAM Mirror.',
    apis: ['NvM_WriteBlock()', 'NvM_ReadBlock()', 'NvM_InvalidateNvBlock()', 'NvM_JobEndNotification()', 'NvM_JobErrorNotification()'],
    srd: 'SWS_NvM / SWS_Fee_00055 / SWS_Fee_00056'
  },
  MOD_MEMIF: {
    id: 'MOD_MEMIF',
    name: 'MemIf (Memory Abstraction IF)',
    layer: 'ECU Abstraction (Thin Dispatch)',
    file: 'MemIf.h / MemIf.c',
    desc: 'Cầu nối siêu mỏng ánh xạ DeviceIndex (0 = Fee / Flash, 1 = Ea / EEPROM) và gom trạng thái trừu tượng MemIf_StatusType / MemIf_JobResultType [SWS_Fee_00084].',
    inputs: 'DeviceIndex & BlockNumber từ NvM, trạng thái trả về từ Fee_GetStatus() [SWS_Fee_00090] / Fee_GetJobResult() [SWS_Fee_00091].',
    outputs: 'Macro/Inline dispatch trực tiếp sang Fee_Write(), Fee_Read(), Fee_InvalidateBlock(), Fee_EraseImmediateBlock(), Fee_Cancel().',
    apis: ['MemIf_Write()', 'MemIf_Read()', 'MemIf_GetStatus()', 'MemIf_GetJobResult()', 'MemIf_Cancel()'],
    srd: 'SWS_MemIf / SWS_Fee_00084'
  },
  MOD_DEM: {
    id: 'MOD_DEM',
    name: 'Dem (Diagnostic Event Mgr)',
    layer: 'Services Layer (Diagnostics)',
    file: 'Dem.c',
    desc: 'Lưu trữ DTC khi phần cứng Flash gặp lỗi (Write/Erase Verify Failed, Uncorrectable ECC). Theo AUTOSAR R25-11 SWS_Fee mục 7.2.3 & 7.2.4, bản thân Fee KHÔNG có Production Error nào; lỗi phần cứng do Mem/Fls hoặc NvM báo lên DEM.',
    inputs: 'Báo cáo lỗi phần cứng từ MCAL Mem/Fls Driver hoặc phản hồi lỗi từ NvM sau khi nhận NvM_JobErrorNotification().',
    outputs: 'Lưu DTC & Freeze Frame vào bộ nhớ lỗi ECU.',
    apis: ['Dem_SetEventStatus(EventId, DEM_EVENT_STATUS_FAILED)'],
    srd: 'SWS_Dem / SWS_Fee §7.2.3 & §7.2.4 (No own DEM errors in Fee)'
  },
  MOD_FEE: {
    id: 'MOD_FEE',
    name: 'Fee (Flash EEPROM Emulation)',
    layer: 'ECU Abstraction Layer (Module ID 21)',
    file: 'Fee.c / Fee.h',
    desc: 'Module giả lập EEPROM trên Data Flash: cung cấp không gian địa chỉ ảo 32-bit (16-bit BlockNo + 16-bit Offset), căn chỉnh FeeVirtualPageSize [SWS_Fee_00005], quản lý tính đúng đắn khối [SWS_Fee_00049], Immediate Data [SWS_Fee_00009], san mòn [SWS_Fee_00103] và 2-Bank GC.',
    inputs: 'Lệnh từ MemIf, EcuM (Fee_Init), SchM (Fee_MainFunction), kết quả từ MemAcc/Fls qua Callback [SWS_Fee_00095] hoặc Polling.',
    outputs: 'Lệnh MemAcc_Write/Read/Erase/BlankCheck/Cancel [SWS_Fee_00105], Callback lên NvM và DET Dev/Runtime Errors.',
    apis: ['Fee_Init() [0x00]', 'Fee_Read() [0x02]', 'Fee_Write() [0x03]', 'Fee_Cancel() [0x04]', 'Fee_GetStatus() [0x05]', 'Fee_GetJobResult() [0x06]', 'Fee_InvalidateBlock() [0x07]', 'Fee_GetVersionInfo() [0x08]', 'Fee_EraseImmediateBlock() [0x09]', 'Fee_JobEndNotification() [0x10]', 'Fee_MainFunction() [0x12]'],
    srd: 'AUTOSAR CP R25-11 SWS_FlashEEPROMEmulation (Doc ID 286)'
  },
  MOD_DET: {
    id: 'MOD_DET',
    name: 'Det (Default Error Tracer)',
    layer: 'Services Layer (Dev & Runtime Errors)',
    file: 'Det.c / Det.h',
    desc: 'Phân tách rõ 2 nhóm lỗi chuẩn AUTOSAR R25-11 cho Fee (ModuleId=21): Development Errors [SWS_Fee_00010] (0x01..0x05 qua Det_ReportError khi FeeDevErrorDetect=TRUE) và Runtime Errors [SWS_Fee_91002] (0x06 FEE_E_BUSY, 0x08 FEE_E_INVALID_CANCEL qua Det_ReportRuntimeError [SWS_Fee_00105]).',
    inputs: 'Det_ReportError(21, 0, ApiId, ErrorId) & Det_ReportRuntimeError(21, 0, ApiId, ErrorId).',
    outputs: 'Ghi nhận log lỗi; hàm Fee bị từ chối tuyệt đối không làm thay đổi Status hay JobResult [SWS_Fee_00162..00166].',
    apis: ['Det_ReportError(21, 0, ApiId, Err)', 'Det_ReportRuntimeError(21, 0, ApiId, Err)'],
    srd: 'SWS_Det / SWS_Fee_00010 / SWS_Fee_91002'
  },
  MOD_FLS: {
    id: 'MOD_FLS',
    name: 'MemAcc / Fls (Lower Flash Access)',
    layer: 'Memory Access / MCAL',
    file: 'MemAcc.c (R23/R25-11) / Fls.c (R20-11)',
    desc: 'Trong R23-11 & R25-11, Fee gọi qua tầng MemAcc hợp nhất (MemAcc_Write/Read/Erase/Compare/BlankCheck/Cancel/GetJobResult [SWS_Fee_00105]/[00104]) xuống Mem_Fls. Ở Classic R20-11 cũ, Fee gọi thẳng Fls Driver.',
    inputs: 'AddressAreaId, TargetAddress, BufferPtr, Length từ Fee; cấu hình Polling hoặc Fee_JobEndNotification().',
    outputs: 'Điều phối Bus Arbitration tới Mem_Fls, trả MEMACC_OK / MEMACC_FAILED / MEMACC_ECC_UNCORRECTED.',
    apis: ['MemAcc_Write() / Fls_Write()', 'MemAcc_Read() / Fls_Read()', 'MemAcc_BlankCheck() [SWS_Fee_00187]', 'MemAcc_Erase() / Fls_Erase()', 'MemAcc_Cancel()', 'MemAcc_GetJobResult()'],
    srd: 'SWS_MemAcc / SWS_Fee_00105 / SWS_Fee_00187'
  },
  MOD_DFLASH: {
    id: 'MOD_DFLASH',
    name: 'Physical DFlash (2–4 Bank NVM)',
    layer: 'MCU Hardware Silicon',
    file: 'Bank 0..3 (0x0800_0000 .. 0x0800_3000)',
    desc: 'Bộ nhớ Data Flash vật lý hỗ trợ 2 đến 4 Logical Bank luân phiên (mặc định tối thiểu 2, tối đa 4). Chỉ cho phép ghi bit 1 -> 0; muốn đảo bit 0 -> 1 bắt buộc Erase cả Sector.',
    inputs: 'Xung lập trình page (Program) và xóa khối (Sector Erase) từ Mem_Fls / Fls.',
    outputs: 'Mức logic byte lưu trữ phi khả biến, tín hiệu ECC kiểm tra sai bit.',
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
  { abbr: 'MEMACC', full: 'Memory Access Module (R23/R25-11)', cat: 'STACK', desc: 'Module chuẩn từ R21-11/R23-11/R25-11 thay thế truy cập trực tiếp Fls/Eep, điều phối AddressArea và cung cấp MemAcc_Read/Write/Erase/BlankCheck/Compare/Cancel [SWS_Fee_00105].' },
  { abbr: 'ECUM', full: 'ECU State Manager', cat: 'STACK', desc: 'Module quản lý trạng thái khởi động/tắt nguồn ECU, chịu trách nhiệm gọi Fee_Init() [SWS_Fee_00085] và kích hoạt NvM_WriteAll().' },
  { abbr: 'DET', full: 'Default Error Tracer', cat: 'STACK', desc: 'Module ghi nhận Development Errors (0x01..0x05 qua Det_ReportError [SWS_Fee_00010]) và Runtime Errors (0x06, 0x08 qua Det_ReportRuntimeError [SWS_Fee_91002]).' },
  { abbr: 'DEM', full: 'Diagnostic Event Manager', cat: 'STACK', desc: 'Module lưu DTC. Theo SWS_Fee R25-11 (§7.2.3/7.2.4), Fee không có Production Error riêng; lỗi phần cứng Flash do Mem/Fls hoặc NvM báo lên DEM.' },
  { abbr: 'RTE', full: 'Runtime Environment', cat: 'STACK', desc: 'Tầng kết nối Port từ Application SWC xuống các dịch vụ BSW như NvM.' },
  { abbr: 'SWC', full: 'Software Component', cat: 'STACK', desc: 'Thành phần phần mềm ứng dụng chứa logic nghiệp vụ và nhu cầu lưu giữ thông số qua tắt/mở khóa xe.' },
  { abbr: 'SCHM', full: 'BSW Scheduler', cat: 'STACK', desc: 'Thành phần phân lịch gọi định kỳ Fee_MainFunction() [SWS_Fee_00097] theo chu kỳ FeeMainFunctionPeriod [ECUC_Fee_00153].' },
  { abbr: 'ECUC', full: 'ECU Configuration (ARXML)', cat: 'STACK', desc: 'Chuẩn mô tả cấu hình Pre-Compile (VARIANT-PRE-COMPILE [ECUC_Fee_00154]) của Fee bằng ARXML AUTOSAR.' },
  { abbr: 'LCFG', full: 'Link-Time Configuration', cat: 'STACK', desc: 'File C (Fee_Lcfg.c) mô phỏng cấu trúc bảng cấu hình các Block và Sector.' },
  { abbr: 'CBK', full: 'Asynchronous Job Notification Callback', cat: 'STACK', desc: 'Hàm Fee_JobEndNotification() [SWS_Fee_00095] nhận thông báo từ tầng dưới và gọi NvM_JobEndNotification() [SWS_Fee_00055] hoặc NvM_JobErrorNotification() [SWS_Fee_00056]/[SWS_Fee_00194].' },
  { abbr: 'POLL', full: 'Polling Synchronization Mode', cat: 'STACK', desc: 'Chế độ bật qua FeePollingMode [ECUC_Fee_00114]: kiểm tra MemAcc_GetJobResult()/Fls_GetJobResult() trong Fee_MainFunction() thay vì dùng callback từ MemAcc.' },

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
