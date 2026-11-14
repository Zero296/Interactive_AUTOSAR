// ================= PART 3: CONSTANTS, BITFIELDS, CONFIG TOOLTIPS, MODULE METADATA & GLOSSARY =================

const NVM_ADMIN_BITS = [
  { bit: 7, mask: 0x80, tag: "VALID_RAM",   name: "VALID_RAM",         tone: "",     desc: "Dữ liệu trong RAM Block hợp lệ (VALID) sau ReadBlock/ReadAll, RestoreFromROM, WriteBlock hoặc NvM_SetRamBlockStatus(TRUE) (SWS_NvM_00453)." },
  { bit: 6, mask: 0x40, tag: "CHANGED_SW",  name: "CHANGED_SW",        tone: "warn", desc: "RAM Block đã bị sửa đổi (Dirty) so với NV Flash. Khi NvM_WriteAll() chạy, NvM chỉ ghi những khối có VALID_RAM=1 && CHANGED_SW=1 (SWS_NvM_00254)." },
  { bit: 5, mask: 0x20, tag: "WRITE_PROT",  name: "WRITE_PROT",        tone: "warn", desc: "Khối đang bị khóa chống ghi qua NvMBlockWriteProt hoặc NvM_SetBlockProtection(TRUE). Mọi Write/Erase/Invalidate đều bị từ chối (SWS_NvM_00450)." },
  { bit: 4, mask: 0x10, tag: "WR_ONCE_LCK", name: "WR_ONCE_LOCKED",    tone: "err",  desc: "Khối cấu hình NvMWriteBlockOnce=TRUE đã được ghi/đọc hợp lệ: khóa cứng WRITE_PROT vĩnh viễn không cho phép mở khóa (SWS_NvM_00326)." },
  { bit: 3, mask: 0x08, tag: "CRC_SKIP",    name: "CRC_COMP_SKIP",     tone: "",     desc: "NvMBlockUseCrcCompMechanism=TRUE: CRC mới của RAM trùng khớp với CRC đã lưu trên NV → BỎ QUA MemIf_Write() để chống mòn Flash (SWS_NvM_00852)." },
  { bit: 2, mask: 0x04, tag: "REDUND_LOSS", name: "REDUNDANCY_LOSS",   tone: "err",  desc: "Khối NVM_BLOCK_REDUNDANT có bản sao NV #0 bị lỗi CRC/đọc; NvM phải đọc cứu hộ từ NV #1 và báo DEM NVM_E_LOSS_OF_REDUNDANCY (SWS_NvM_00215)." },
  { bit: 1, mask: 0x02, tag: "ROM_DEF",     name: "ROM_DEFAULT_USED",  tone: "warn", desc: "RAM Block đang chứa dữ liệu khôi phục từ NvMRomBlockDataAddress / NvMInitBlockCallback (NVM_REQ_RESTORED_FROM_ROM — SWS_NvM_00222)." },
  { bit: 0, mask: 0x01, tag: "SYNC_OK",     name: "EXPLICIT_SYNC_OK",  tone: "",     desc: "NvMBlockUseSyncMechanism=TRUE: Đã đồng bộ nguyên tử thành công qua bộ đệm NvM Mirror và callback Read/WriteRamBlock (SWS_NvM_00694)." }
];

const NVM_JOB_BITS = [
  { bit: 7, mask: 0x80, tag: "NVM_INIT",    name: "NVM_INITIALIZED",      tone: "",     desc: "NvM_Init(NULL_PTR) đã hoàn tất (SWS_NvM_00447). Nếu bằng 0, mọi lời gọi API đều bị chặn và báo DET NVM_E_UNINIT (0x14)." },
  { bit: 6, mask: 0x40, tag: "MULTI_ACTV",  name: "MULTI_BLOCK_ACTV",     tone: "warn", desc: "Đang chạy tiến trình đa khối (NvM_ReadAll, NvM_WriteAll hoặc NvM_ValidateAll) trên Block #0 (SWS_NvM_00460 / 00461)." },
  { bit: 5, mask: 0x20, tag: "IMM_PREEMPT", name: "IMM_PRIO_PREEMPT",     tone: "err",  desc: "Job ưu tiên tức thời (Prio=0) vừa cắt ngang Job thường bằng MemIf_Cancel() để ghi khẩn cấp rồi tự Resume lại Job cũ (SWS_NvM_00381)." },
  { bit: 4, mask: 0x10, tag: "MEMIF_PEND",  name: "MEMIF_JOB_PENDING",    tone: "warn", desc: "Tầng dưới MemIf → Fee/Ea → Fls/Eep đang bận đọc/ghi vật lý (MEMIF_BUSY), chờ NvM_JobEndNotification() hoặc ErrorNotification()." },
  { bit: 3, mask: 0x08, tag: "CRC_ENG_OK",  name: "CRC_ENGINE_OK",        tone: "",     desc: "Bộ tính CRC-8/16/32 và kiểm tra Static Block ID hoàn tất khớp 100% với dữ liệu khối (SWS_NvM_00201)." },
  { bit: 2, mask: 0x04, tag: "WR_VERIF_OK", name: "WRITE_VERIFY_OK",      tone: "",     desc: "NvMWriteVerification=TRUE: Đã đọc ngược từ Flash sau MemIf_Write() và đối chiếu khớp từng byte với RAM Block (SWS_NvM_00842)." },
  { bit: 1, mask: 0x02, tag: "RETRY",       name: "RETRY_IN_PROGRESS",    tone: "warn", desc: "Đọc/ghi hoặc kiểm chứng gặp lỗi; NvM đang tự động thử lại trong giới hạn NvMMaxNumOfWriteRetries / ReadRetries (SWS_NvM_00263)." },
  { bit: 0, mask: 0x01, tag: "ERR!",        name: "INTEGRITY_OR_REQ_ERR", tone: "err",  desc: "Job gặp lỗi toàn vẹn/phần cứng/tham số: phát Dem_SetEventStatus(NVM_E_*) hoặc Det_ReportError(ModuleId=20)." }
];

const configTooltipData = {
  NvMInitialized: {
    title: "NvM Initialization State (NvM_Init)",
    ecucPath: "NvMRuntime / NvM_InitState",
    sws: "SWS_NvM_00447 · SWS_NvM_00399",
    range: "false (UNINIT) | true (INITIALIZED)",
    typical: "true (Được EcuM_AL_DriverInitTwo gọi lúc khởi động)",
    desc: "Xác nhận module NvM đã được khởi tạo các Administrative Block, hàng đợi Immediate/Standard Queue và DataIndex = 0 hay chưa.",
    notes: "Nếu tắt FALSE, mọi lời gọi API (trừ NvM_Init/GetVersionInfo) sẽ bị từ chối và báo DET NVM_E_UNINIT (0x14) ở kịch bản S14."
  },
  NvMApiConfigClass: {
    title: "NvMApiConfigClass",
    ecucPath: "NvMCommon / NvMApiConfigClass",
    sws: "SWS_NvM_00149 · ECUC_NvM_00491",
    range: "API_CONFIG_CLASS_1 | CLASS_2 | CLASS_3",
    typical: "NVM_API_CONFIG_CLASS_3 (Đầy đủ toàn bộ dịch vụ)",
    desc: "Quy định tập hợp API được phép biên dịch và sử dụng: Class 1 (chỉ Multi-block/GetError/SetRamStatus), Class 2 (thêm Read/WriteBlock/Restore/Dataset), Class 3 (thêm Erase/Invalidate/SetBlockProtection).",
    notes: "Các lệnh NvM_EraseNvBlock, NvM_InvalidateNvBlock và NvM_SetBlockProtection ở kịch bản S11 và S13 yêu cầu Class 3."
  },
  NvMDevErrorDetect: {
    title: "NvMDevErrorDetect",
    ecucPath: "NvMCommon / NvMDevErrorDetect",
    sws: "SWS_NvM_00592 · ECUC_NvM_00495",
    range: "Boolean (true | false)",
    typical: "true trong giai đoạn phát triển & kiểm thử",
    desc: "Bật/tắt cơ chế phát hiện và báo lỗi phát triển (DET) với ModuleId = 20 (0x0014) như sai BlockId, sai BlockType, khối đang Pending hoặc bị khóa.",
    notes: "Ảnh hưởng trực tiếp tới việc ghi nhận lỗi DET trong kịch bản S13 và S14."
  },
  NvMJobPrioritization: {
    title: "NvMJobPrioritization",
    ecucPath: "NvMCommon / NvMJobPrioritization",
    sws: "SWS_NvM_00378 · SWS_NvM_00381 · ECUC_NvM_00497",
    range: "Boolean (true | false)",
    typical: "true (Hỗ trợ hàng đợi ưu tiên & Immediate Preemption)",
    desc: "Cho phép NvM sắp xếp Standard Queue theo NvMBlockJobPriority (1..255) và tách riêng Immediate Priority Queue (Prio=0) có quyền gọi MemIf_Cancel() cắt ngang Job thường.",
    notes: "Trọng tâm kịch bản S7: nếu tắt FALSE, khối Crash Prio=0 sẽ không thể cắt ngang khối Calib đang ghi!"
  },
  NvMQueueSizes: {
    title: "NvMSizeStandardJobQueue / ImmediateJobQueue",
    ecucPath: "NvMCommon / NvMSizeStandardJobQueue & ImmediateJobQueue",
    sws: "SWS_NvM_00379 · ECUC_NvM_00503 / 00502",
    range: "Text '<StdSlots> / <ImmSlots>' (VD: '8 / 3')",
    typical: "8 / 3 (Standard: 8..32 slots, Immediate: 2..4 slots)",
    desc: "Số lượng khe tối đa trong hàng đợi thường (Standard Priority Queue) và hàng đợi khẩn cấp (Immediate Priority Queue).",
    notes: "Nếu gửi vượt quá số khe đang rảnh (thử ở What-If S7), NvM từ chối và báo lỗi NVM_E_QUEUE_FULL (0xA0)."
  },
  NvMMainFnAndCrcBytes: {
    title: "NvMMainFunctionPeriod & NvMCrcNumOfBytes",
    ecucPath: "NvMCommon / NvMMainFunctionPeriod & NvMCrcNumOfBytes",
    sws: "SWS_NvM_00464 · ECUC_NvM_00492",
    range: "Text '<PeriodMs> / <BytesPerCall>' (VD: '10 / 64')",
    typical: "10 ms / 64 bytes mỗi chu kỳ",
    desc: "Chu kỳ SchM gọi NvM_MainFunction() (ms) và số byte tối đa được phép tính CRC trong 1 chu kỳ MainFunction (Sliced CRC) để tránh khóa CPU quá lâu.",
    notes: "Với khối dữ liệu dài hơn NvMCrcNumOfBytes, máy trạng thái NvM sẽ chia phép tính CRC qua nhiều chu kỳ +10ms Tick."
  },
  SelectedBlockId: {
    title: "NvMNvramBlockIdentifier (Selected Block)",
    ecucPath: "NvMBlockDescriptor / NvMNvramBlockIdentifier",
    sws: "SWS_NvM_00481 · ECUC_NvM_00481",
    range: "BlockId #1 .. #5 (Block #0 dành cho Multi-Block)",
    typical: "#1 ConfigId, #2 Calib, #3 Odometer, #4 Dataset, #5 Crash",
    desc: "Chọn khối NVRAM mục tiêu đang được hiển thị trong Bảng Giải Phẫu 3 Vùng Nhớ và được chỉnh sửa các tham số BlockDescriptor.",
    notes: "Click vào từng hàng trong bảng 6 NVRAM Blocks ở cột giữa cũng sẽ đồng bộ ngay vào trường này."
  },
  NvMBlockManagementType: {
    title: "NvMBlockManagementType",
    ecucPath: "NvMBlockDescriptor / NvMBlockManagementType",
    sws: "SWS_NvM_00134 · ECUC_NvM_00062",
    range: "NVM_BLOCK_NATIVE | REDUNDANT | DATASET",
    typical: "NATIVE (phổ biến), REDUNDANT (Odometer/ConfigId), DATASET (Variant)",
    desc: "Quyết định số bản sao NV và khả năng dự phòng: NATIVE (1 bản sao), REDUNDANT (2 bản sao độc lập NV #0/#1 tự cứu hộ), DATASET (mảng 1..255 ngăn truy cập qua DataIndex).",
    notes: "Thay đổi ở kịch bản S4 (Dataset) và S9 (Redundant vs Native) để thấy ngay tác động khi NV #0 hỏng CRC!"
  },
  NvMBlockJobPriority: {
    title: "NvMBlockJobPriority",
    ecucPath: "NvMBlockDescriptor / NvMBlockJobPriority",
    sws: "SWS_NvM_00378 · ECUC_NvM_00477",
    range: "0 (Immediate Preempt) | 1 (Highest Std) .. 255 (Lowest Std)",
    typical: "0 cho Crash Record; 1..20 cho dữ liệu thông thường",
    desc: "Mức ưu tiên xử lý công việc: giá trị 0 là Immediate Priority được phép cắt ngang Job đang chạy bằng MemIf_Cancel(); giá trị 1..255 xếp vào Standard Queue.",
    notes: "Chỉ những khối có NvMBlockJobPriority == 0 mới được phép gọi API NvM_EraseNvBlock() ở kịch bản S11!"
  },
  NvMNvBlockLength: {
    title: "NvMNvBlockLength",
    ecucPath: "NvMBlockDescriptor / NvMNvBlockLength",
    sws: "SWS_NvM_00479 · ECUC_NvM_00479",
    range: "uint16 (1 .. 4096 bytes)",
    typical: "2..128 bytes (Block #1 ConfigId cố định 2 bytes)",
    desc: "Kích thước vùng dữ liệu người dùng (Payload) tính bằng byte, chưa bao gồm 2 byte Static Block ID và 1/2/4 byte mã CRC đi kèm trên Flash.",
    notes: "Tổng kích thước lưu vật lý trên Fee = Payload + (StaticID ? 2 : 0) + CrcBytes."
  },
  NvMBlockCounts: {
    title: "NvMNvBlockNum & NvMRomBlockNum",
    ecucPath: "NvMBlockDescriptor / NvMNvBlockNum & NvMRomBlockNum",
    sws: "SWS_NvM_00014 · ECUC_NvM_00480 / 00485",
    range: "Text '<NvNum> / <RomNum>' (VD: '2 / 1', '3 / 2')",
    typical: "NATIVE: 1/1, REDUNDANT: 2/1, DATASET: N/M",
    desc: "Số phần tử NV Block lưu trên Flash/EEPROM và số phần tử ROM Default đi kèm. Với DATASET, DataIndex >= NvMNvBlockNum sẽ đọc thẳng từ ROM!",
    notes: "Trọng tâm kịch bản S4: Block #4 có '3 / 2' nên DataIndex 0..2 là NV Flash, DataIndex 3..4 là ROM Default."
  },
  CurrentDataIndex: {
    title: "Current DataIndex (NvM_SetDataIndex)",
    ecucPath: "Runtime AdminBlock / DataIndex",
    sws: "SWS_NvM_00448 · SWS_NvM_00014 · ECUC_NvM_00494",
    range: "0 .. (NvMNvBlockNum + NvMRomBlockNum - 1)",
    typical: "0 (Mặc định sau NvM_Init)",
    desc: "Chỉ số ngăn dữ liệu hiện tại của khối NVM_BLOCK_DATASET. NvM ghép địa chỉ vật lý bằng công thức: (BaseNum << DatasetSelectionBits) | DataIndex.",
    notes: "Gọi NvM_SetDataIndex() lên khối NATIVE hoặc REDUNDANT sẽ kích lỗi DET NVM_E_PARAM_BLOCK_TYPE (0x0B) ở S14."
  },
  UsePermanentRamBlock: {
    title: "Permanent RAM Block (NvMRamBlockDataAddress)",
    ecucPath: "NvMBlockDescriptor / NvMRamBlockDataAddress",
    sws: "SWS_NvM_00482 · ECUC_NvM_00482",
    range: "Boolean (true = Có Permanent RAM | false = Chỉ dùng Temporary RAM)",
    typical: "true cho các khối cần tham gia ReadAll / WriteAll / PRAM API",
    desc: "Xác định khối có con trỏ RAM cố định hay không. Khi false, hàm ReadBlock(NULL_PTR) sẽ bị lỗi DET NVM_E_PARAM_ADDRESS (0x0D).",
    notes: "Nếu sử dụng ReadAll/WriteAll mà không bật Explicit Sync, khối bắt buộc phải có Permanent RAM Block."
  },
  NvMBlockUseSyncMechanism: {
    title: "NvMBlockUseSyncMechanism (Explicit Sync)",
    ecucPath: "NvMBlockDescriptor / NvMBlockUseSyncMechanism",
    sws: "SWS_NvM_00694 · SWS_NvM_00698 · ECUC_NvM_00519",
    range: "Boolean (true = Explicit Sync Mirror | false = Implicit Direct)",
    typical: "true cho dữ liệu SWC cập nhật liên tục ở OS Task khác nhau",
    desc: "Bật cơ chế đồng bộ tường minh qua bộ đệm trung gian NvM Mirror và cặp callback WriteRamBlockToNv / ReadRamBlockFromNv để tránh Data Tear khi SWC ghi dở.",
    notes: "Trọng tâm kịch bản S3: Bật Bit 0 (EXPLICIT_SYNC_OK) trên Thanh A khi Mirror copy thành công."
  },
  NvMRepeatMirrorOperations: {
    title: "NvMRepeatMirrorOperations",
    ecucPath: "NvMCommon / NvMRepeatMirrorOperations",
    sws: "SWS_NvM_00699 · ECUC_NvM_00515",
    range: "uint8 (0 .. 10 lần thử lại Mirror)",
    typical: "3 lần",
    desc: "Số lần tối đa NvM thử gọi lại callback đồng bộ NvM Mirror nếu SWC đang giữ khóa dữ liệu và trả về E_NOT_OK.",
    notes: "Kết hợp cùng InjectMirrorBusyConflict trong kịch bản S3 để thử trường hợp thử lại thành công vs vượt ngưỡng thất bại."
  },
  InjectMirrorBusyConflict: {
    title: "Inject Mirror Busy Conflict (Fault Injection)",
    ecucPath: "Simulation Fault Injector / ExplicitMirrorBusy",
    sws: "SWS_NvM_00699",
    range: "Boolean (false = E_OK ngay | true = Trả E_NOT_OK 2 lần đầu)",
    typical: "false (Bật true để mô phỏng SWC bận trong S3)",
    desc: "Giả lập SWC đang cập nhật mảng RAM dở dang khiến callback WriteRamBlockToNvCallback trả về E_NOT_OK trong 2 chu kỳ đầu tiên.",
    notes: "Nếu NvMRepeatMirrorOperations >= 3 thì lần 3 sẽ thành công; nếu <= 2 thì Job sẽ thất bại!"
  },
  NvMResistantToChangedSw: {
    title: "NvMResistantToChangedSw",
    ecucPath: "NvMBlockDescriptor / NvMResistantToChangedSw",
    sws: "SWS_NvM_00308 · ECUC_NvM_00483",
    range: "Boolean (true | false)",
    typical: "true cho Odometer/VIN; false cho Calib/Struct dễ đổi layout",
    desc: "Quy định hành vi trong NvM_ReadAll() khi Configuration ID (Block #1) trên Flash khác với bản SW mới biên dịch (NvMCompiledConfigId).",
    notes: "Trọng tâm kịch bản S12: true → giữ lại dữ liệu Flash cũ; false → bỏ qua Flash và nạp mới từ ROM Default."
  },
  NvMBlockUseSetRamBlockStatus: {
    title: "NvMBlockUseSetRamBlockStatus",
    ecucPath: "NvMBlockDescriptor / NvMBlockUseSetRamBlockStatus",
    sws: "SWS_NvM_00453 · ECUC_NvM_00556",
    range: "Boolean (true | false)",
    typical: "true cho Permanent RAM tham gia NvM_WriteAll()",
    desc: "Cho phép ứng dụng gọi NvM_SetRamBlockStatus(BlockId, TRUE/FALSE) để báo dữ liệu RAM hợp lệ và đã thay đổi (Dirty).",
    notes: "Nếu bằng false, lời gọi SetRamBlockStatus() sẽ không đánh dấu Bit 6 CHANGED_SW và NvM_WriteAll() sẽ bỏ qua khối này."
  },
  NvMBlockUseCrc: {
    title: "NvMBlockUseCrc (& NvMCalcRamBlockCrc)",
    ecucPath: "NvMBlockDescriptor / NvMBlockUseCrc & CalcRamBlockCrc",
    sws: "SWS_NvM_00201 · ECUC_NvM_00036 / 00119",
    range: "Boolean (true | false)",
    typical: "true (Luôn khuyến nghị để phát hiện lỗi bit trên Flash)",
    desc: "Bật bảo vệ toàn vẹn dữ liệu bằng mã CRC lưu kèm cuối NV Block trên Flash và tự động tính lại CRC trên RAM ở nền.",
    notes: "Nếu tắt FALSE, NvM sẽ không kiểm tra CRC khi đọc và tính năng CRC Compare Skip cũng bị vô hiệu hóa."
  },
  NvMBlockCrcType: {
    title: "NvMBlockCrcType",
    ecucPath: "NvMBlockDescriptor / NvMBlockCrcType",
    sws: "SWS_NvM_00476 · ECUC_NvM_00476",
    range: "NVM_CRC8 | NVM_CRC16 | NVM_CRC32",
    typical: "NVM_CRC16 (Cân bằng hiệu năng và độ tin cậy), NVM_CRC32 (Safety)",
    desc: "Chọn độ dài đa thức CRC thuộc Crc Library: CRC-8 SAE-J1850 (1B), CRC-16 CCITT-FALSE 0x1021 (2B), hoặc CRC-32 IEEE-802.3 (4B).",
    notes: "Mã Hex CRC thực tế của khối đang chọn trong Bảng Giải Phẫu sẽ tự động tính toán lại theo chuẩn này!"
  },
  NvMBlockUseCrcCompMechanism: {
    title: "NvMBlockUseCrcCompMechanism",
    ecucPath: "NvMBlockDescriptor / NvMBlockUseCrcCompMechanism",
    sws: "SWS_NvM_00852 · ECUC_NvM_00557",
    range: "Boolean (true | false)",
    typical: "true (Giảm tới 70–80% chu kỳ ghi Flash lúc tắt xe)",
    desc: "Trước khi đẩy MemIf_Write(), NvM đối chiếu CRC mới tính của RAM với CRC của lần đọc/ghi cuối; nếu trùng khớp thì BỎ QUA lệnh ghi xuống Flash!",
    notes: "Trọng tâm kịch bản S6: bật Bit 3 (CRC_COMP_SKIP = 1) trên Thanh A và tiết kiệm tuổi thọ Flash."
  },
  NvMStaticBlockIDCheck: {
    title: "NvMStaticBlockIDCheck",
    ecucPath: "NvMBlockDescriptor / NvMStaticBlockIDCheck",
    sws: "SWS_NvM_00535 · ECUC_NvM_00532",
    range: "Boolean (true | false)",
    typical: "true (Chống đọc nhầm địa chỉ hoặc lỗi bảng ánh xạ Fee)",
    desc: "Đính kèm 2-byte Static Block ID vào đầu khung dữ liệu lưu xuống NV Block và đối chiếu lại khi đọc; nếu sai lệch báo DEM NVM_E_WRONG_BLOCK_ID.",
    notes: "Trọng tâm kịch bản S12: phát hiện ngay khi Header ID đọc lên (0x0099) khác với BlockId mong đợi."
  },
  NvMWriteVerification: {
    title: "NvMWriteVerification (& DataSize)",
    ecucPath: "NvMBlockDescriptor / NvMWriteVerification",
    sws: "SWS_NvM_00842 · ECUC_NvM_00534 / 00538",
    range: "Boolean (true | false)",
    typical: "true cho các khối trọng yếu (Odometer, Calib, Crash Data)",
    desc: "Ngay sau khi MemIf_Write() thành công, NvM tự động phát lệnh MemIf_Read() đọc ngược dữ liệu từ Flash và so sánh từng byte với RAM Block gốc.",
    notes: "Trọng tâm kịch bản S6: bật Bit 2 (WRITE_VERIFY_OK = 1) trên Thanh B nếu khớp 100%, hoặc báo NVM_E_VERIFY_FAILED và Retry nếu lệch."
  },
  NvMBlockUseAutoValidation: {
    title: "NvMBlockUseAutoValidation",
    ecucPath: "NvMBlockDescriptor / NvMBlockUseAutoValidation",
    sws: "SWS_NvM_00855 · ECUC_NvM_00558",
    range: "Boolean (true | false)",
    typical: "false (Chỉ bật cho khối cần Validate hàng loạt qua NvM_ValidateAll)",
    desc: "Cho phép hàm NvM_ValidateAll() tự động đánh dấu VALID_RAM = 1 và CHANGED_SW = 1 cho khối trước khi chạy NvM_WriteAll().",
    notes: "Dùng trong kịch bản S8 (What-If #3) để minh họa dịch vụ NvM_ValidateAll()."
  },
  NvMBlockWriteProt: {
    title: "NvMBlockWriteProt",
    ecucPath: "NvMBlockDescriptor / NvMBlockWriteProt",
    sws: "SWS_NvM_00054 · ECUC_NvM_00033",
    range: "Boolean (true | false)",
    typical: "false (Trừ dữ liệu chỉ đọc cấu hình từ đầu)",
    desc: "Đặt trạng thái khóa bảo vệ chống ghi (Bit 5 WRITE_PROT = 1) ngay sau NvM_Init(). Cũng có thể bật/tắt động bằng NvM_SetBlockProtection().",
    notes: "Mọi lệnh Write/Erase/Invalidate khi đang bật khóa sẽ trả về E_NOT_OK và báo DET NVM_E_BLOCK_LOCKED (0x19) ở S13."
  },
  NvMWriteBlockOnce: {
    title: "NvMWriteBlockOnce",
    ecucPath: "NvMBlockDescriptor / NvMWriteBlockOnce",
    sws: "SWS_NvM_00326 · SWS_NvM_00399 · ECUC_NvM_00072",
    range: "Boolean (true | false)",
    typical: "true cho số khung VIN, Serial Number, dữ liệu xuất xưởng",
    desc: "Khối chỉ được ghi duy nhất 1 lần: sau lần đọc/ghi thành công đầu tiên, NvM tự khóa cứng cả WRITE_PROT và WR_ONCE_LOCKED vĩnh viễn.",
    notes: "Không thể mở khóa bằng NvM_SetBlockProtection(FALSE) — gọi vào sẽ bị báo DET NVM_E_BLOCK_CONFIG (0x18) ở S13!"
  },
  NvMMaxRetries: {
    title: "NvMMaxNumOfWriteRetries / ReadRetries",
    ecucPath: "NvMBlockDescriptor / NvMMaxNumOfWriteRetries & ReadRetries",
    sws: "SWS_NvM_00263 · ECUC_NvM_00489 / 00533",
    range: "Text '<WriteRetries> / <ReadRetries>' (0..7)",
    typical: "3 / 1 (Thử ghi lại 3 lần, thử đọc lại 1 lần)",
    desc: "Số lần NvM tự động thực hiện lại thao tác MemIf_Write / MemIf_Read khi gặp NvM_JobErrorNotification() hoặc lỗi Write Verification.",
    notes: "Trọng tâm kịch bản S14: quan sát bộ đếm Retry tăng dần với Bit 1 RETRY=1 trước khi báo DEM NVM_E_REQ_FAILED."
  },
  InjectNvCrcCorruption: {
    title: "InjectNvCrcCorruption (NV Block #0)",
    ecucPath: "Simulation Fault Injector / CorruptNvCopy0",
    sws: "SWS_NvM_00215 · SWS_NvM_00222",
    range: "Boolean (false = Sạch | true = Lật bit sai CRC trên NV #0)",
    typical: "false (Bật true để kiểm thử cứu hộ REDUNDANT / ROM Default)",
    desc: "Cố tình làm sai lệch mã CRC của bản sao NV Block #0 trên bộ nhớ Flash giả lập để quan sát phản ứng của NvM khi đọc khối.",
    notes: "Với REDUNDANT (#3), NvM tự cứu hộ từ NV #1 (S9); với NATIVE (#2), NvM nạp từ ROM Default (S10)."
  },
  InjectMemIfWriteError: {
    title: "InjectMemIfWriteError (Flash HW Error)",
    ecucPath: "Simulation Fault Injector / MemIfWriteFailure",
    sws: "SWS_NvM_00263 · SWS_NvM_00463",
    range: "Boolean (false = OK | true = Fee/Fls báo JobErrorNotification)",
    typical: "false (Bật true để kiểm thử Retry & DEM Error trong S14)",
    desc: "Giả lập tầng phần cứng Flash Driver (Fls) gặp lỗi lập trình ECC/Timeout khiến Fee bắn NvM_JobErrorNotification().",
    notes: "Kích hoạt vòng lặp NvMMaxNumOfWriteRetries và sau cùng phát Dem_SetEventStatus(NVM_E_REQ_FAILED)."
  },
  ProvideRomBlockDefault: {
    title: "ProvideRomBlockDefault (ROM / InitCallback)",
    ecucPath: "NvMBlockDescriptor / NvMRomBlockDataAddress & InitCbk",
    sws: "SWS_NvM_00222 · SWS_NvM_00466",
    range: "Boolean (true = Có ROM Default | false = NULL_PTR)",
    typical: "true cho mọi khối có thể khôi phục thông số xuất xưởng",
    desc: "Xác định khối có cung cấp vùng ROM mặc định hoặc NvMInitBlockCallback để cứu hộ khi dữ liệu Flash trống hoặc hỏng CRC hay không.",
    notes: "Nếu tắt FALSE khi NV hỏng CRC ở S10, NvM không thể cứu hộ và phải trả NVM_REQ_INTEGRITY_FAILED với VALID_RAM = 0!"
  },
  NvMSelectForReadAndWriteAll: {
    title: "NvMSelectBlockForReadAll / WriteAll",
    ecucPath: "NvMBlockDescriptor / SelectBlockForReadAll & WriteAll",
    sws: "SWS_NvM_00460 · SWS_NvM_00461 · ECUC_NvM_00117 / 00549",
    range: "BOTH_READ_WRITE | READ_ALL_ONLY | WRITE_ALL_ONLY | NONE",
    typical: "BOTH cho dữ liệu vận hành; NONE cho Crash/Dataset lớn",
    desc: "Đưa khối vào danh sách tự động nạp lúc bật máy (NvM_ReadAll) và tự động lưu các khối Dirty lúc tắt máy (NvM_WriteAll).",
    notes: "Thử đổi ở S1 hoặc S8 để thấy khối nào bị bỏ qua trong tiến trình Multi-Block."
  },
  NvMConfigIdComparison: {
    title: "NvMCompiledConfigId vs StoredNvConfigId",
    ecucPath: "NvMCommon / NvMCompiledConfigId & Block #1 Flash",
    sws: "SWS_NvM_00307 · ECUC_NvM_00028",
    range: "Text '<CompiledHex> / <StoredHex>' (VD: '0xA55A / 0xA55A')",
    typical: "0xA55A / 0xA55A (Trùng khớp khi chạy cùng phiên bản SW)",
    desc: "So sánh mã cấu hình biên dịch trong code mới với mã đang lưu tại Block #1 trên Flash trong pha NvM_ReadAll().",
    notes: "Khi hai giá trị khác nhau (Kịch bản S12), NvM kích hoạt xử lý nâng cấp phần mềm dựa trên NvMResistantToChangedSw."
  },
  NvMDynamicConfiguration: {
    title: "NvMDynamicConfiguration",
    ecucPath: "NvMCommon / NvMDynamicConfiguration",
    sws: "SWS_NvM_00307 · ECUC_NvM_00496",
    range: "Boolean (true | false)",
    typical: "true (Bắt buộc bật để phát hiện nâng cấp phần mềm qua Block #1)",
    desc: "Kích hoạt cơ chế đọc và kiểm tra Block #1 (Configuration ID) làm bước đầu tiên trong NvM_ReadAll().",
    notes: "Nếu tắt FALSE, NvM bỏ qua kiểm tra ConfigId và không áp dụng logic NvMResistantToChangedSw."
  },
  NvMBswMJobStatusInfo: {
    title: "NvMBswMMultiBlockJobStatusInformation",
    ecucPath: "NvMCommon / NvMBswMMultiBlockJobStatusInformation",
    sws: "SWS_NvM_00109 · ECUC_NvM_00516 / 00517",
    range: "Boolean (true | false)",
    typical: "true (Bắt buộc để BswM biết lúc nào ReadAll/WriteAll xong)",
    desc: "Tự động gọi BswM_NvM_CurrentJobMode() và BswM_NvM_CurrentBlockMode() thông báo tiến trình cho Mode Manager.",
    notes: "Trong S1 & S8, BswM dựa vào tín hiệu này để gọi Rte_Start() khi khởi động hoặc EcuM_GoDownHaltPoll() khi tắt xe."
  },
  NvMDrvModeSwitch: {
    title: "NvMDrvModeSwitch (MEMIF_MODE_FAST)",
    ecucPath: "NvMCommon / NvMDrvModeSwitch",
    sws: "SWS_NvM_00243 · ECUC_NvM_00493",
    range: "Boolean (true | false)",
    typical: "true (Tăng tốc độ đọc/ghi Flash khi ReadAll / WriteAll)",
    desc: "Khi chạy NvM_ReadAll() hoặc NvM_WriteAll(), NvM gọi MemIf_SetMode(MEMIF_MODE_FAST) cho phép Fee/Fls tăng tốc, rồi trả về MEMIF_MODE_SLOW khi xong.",
    notes: "Tắt ở What-If S1 để quan sát MemIf giữ nguyên ở MEMIF_MODE_SLOW."
  },
  NvMNvramDeviceId: {
    title: "NvMNvramDeviceId (MemIf Device Routing)",
    ecucPath: "NvMBlockDescriptor / NvMNvramDeviceId",
    sws: "SWS_NvM_00035 · ECUC_NvM_00035",
    range: "0 = Fee (Data Flash) | 1 = Ea (External/Internal EEPROM)",
    typical: "0 (Hầu hết ECU hiện đại dùng Internal Data Flash qua Fee)",
    desc: "Xác định thiết bị phần cứng lưu trữ bên dưới thông qua bộ chuyển mạch MemIf: 0 định tuyến tới Fee → Fls; 1 định tuyến tới Ea → Eep.",
    notes: "Thử chuyển sang 1 trong S2 để thấy MemIf chuyển luồng gọi từ Fee_Read sang Ea_Read → Eep_Read!"
  }
};

const MODULES_INFO = {
  MOD_SWC: {
    id: "MOD_SWC",
    name: "SWC_App & SWC_Calibration",
    layer: "Application Layer (ASW)",
    role: "Các thành phần phần mềm ứng dụng tạo/sử dụng dữ liệu bền vững (Odometer, Calibration, Crash Record) và cung cấp bộ đệm RAM hoặc callback đồng bộ.",
    inputs: "Nhận thông báo hoàn tất Job qua SingleBlockCallbackFunction (Rte_Call_PNJF_*_JobFinished) hoặc lời gọi đồng bộ từ Explicit Sync Mirror.",
    processing: "Sửa đổi dữ liệu trong Permanent/Temporary RAM, gọi SetRamBlockStatus(TRUE) đánh dấu Dirty, hoặc triển khai NvMWriteRamBlockToNvCallback / ReadRamBlockFromNvCallback.",
    outputs: "Gửi yêu cầu ReadBlock, WriteBlock, RestoreBlockDefaults, SetDataIndex xuống NvM thông qua cổng Client-Server của RTE.",
    apis: [
      "Std_ReturnType Rte_Call_NvMService_ReadBlock(NvM_DstPtrType DstPtr);  /* SWS_NvM_00454 */",
      "Std_ReturnType Rte_Call_NvMService_WriteBlock(NvM_SrcPtrType SrcPtr); /* SWS_NvM_00455 */",
      "Std_ReturnType Rte_Call_NvMService_SetRamBlockStatus(boolean BlockChanged); /* SWS_NvM_00453 */",
      "Std_ReturnType Rte_Call_NvMService_GetErrorStatus(NvM_RequestResultType* ResultPtr);"
    ]
  },
  MOD_RTE: {
    id: "MOD_RTE",
    name: "RTE & SchM (BSW Scheduler)",
    layer: "Runtime Environment & Scheduler",
    role: "Cầu nối định tuyến Port của SWC thành tham số BlockId của NvM, đồng thời cấp xung nhịp định kỳ OS Task 10ms cho toàn bộ Memory Stack.",
    inputs: "Lời gọi Client-Server từ SWC; lệnh phát callback ngược lên SWC từ NvM; xung nhịp OS Task 10ms.",
    processing: "Ánh xạ PortDefinedArgumentValue (BlockId), bảo vệ vùng găng SchM_Enter_NvM_NVM_EXCLUSIVE_AREA_0(), và thực thi tuần tự MainFunction của NvM → Fee/Ea → Fls/Eep.",
    outputs: "Gọi định kỳ NvM_MainFunction(); chuyển tiếp SingleBlockCallback, InitBlockCallback và Explicit Sync Mirror Callback về SWC.",
    apis: [
      "void NvM_MainFunction(void); /* Period = 10ms — SWS_NvM_00464 */",
      "Std_ReturnType (*NvMWriteRamBlockToNvCallback)(void* NvMBuffer); /* SWS_NvM_00699 */",
      "Std_ReturnType (*NvMReadRamBlockFromNvCallback)(const void* NvMBuffer); /* SWS_NvM_00698 */",
      "Std_ReturnType (*NvMInitBlockCallback)(void); /* SWS_NvM_00466 */"
    ]
  },
  MOD_NVM: {
    id: "MOD_NVM",
    name: "NvM Core Engine (NVRAM Manager)",
    layer: "Memory Services (BSW Services Layer — ModuleId = 20)",
    role: "Bộ não quản lý đọc/ghi bất đồng bộ, hàng đợi ưu tiên (Immediate/Standard/Multi), 3 kiểu khối (NATIVE/REDUNDANT/DATASET), CRC & bảo vệ dữ liệu.",
    inputs: "Yêu cầu đơn khối từ SWC/Dcm/Dem; lệnh Multi-Block (ReadAll/WriteAll/ValidateAll) từ BswM/EcuM; callback JobEnd/JobErrorNotification từ Fee/Ea.",
    processing: "Phân xử hàng đợi (Prio=0 cắt ngang bằng MemIf_Cancel), đồng bộ Mirror, tính CRC-8/16/32, CRC Compare Skip, Write Verification, Redundant Fallback & Retry.",
    outputs: "Gọi Crc_CalculateCRC*, gọi MemIf_Read/Write/Erase/Invalidate/Cancel/SetMode, báo BswM_NvM_CurrentJobMode, báo lỗi DEM & DET.",
    apis: [
      "void NvM_Init(const NvM_ConfigType* ConfigPtr); /* SWS_NvM_00447 */",
      "void NvM_ReadAll(void); / void NvM_WriteAll(void); / void NvM_CancelWriteAll(void);",
      "Std_ReturnType NvM_ReadPRAMBlock(NvM_BlockIdType BlockId); /* R22-11/R23-11 */",
      "Std_ReturnType NvM_WritePRAMBlock(NvM_BlockIdType BlockId, const void* SrcPtr);"
    ]
  },
  MOD_CRC: {
    id: "MOD_CRC",
    name: "Crc Library (CRC Routines)",
    layer: "System / Library Services (SWS_Crc)",
    role: "Thư viện tính toán đa thức kiểm tra vòng (CRC-8, CRC-16 CCITT-FALSE, CRC-32 IEEE-802.3) đảm bảo dữ liệu đọc từ Flash/EEPROM không bị lỗi bit.",
    inputs: "Con trỏ vùng đệm RAM/NV (bao gồm Static Block ID 2B nếu bật) và độ dài lát cắt NvMCrcNumOfBytes từ NvM.",
    processing: "Thực hiện phép tính CRC theo từng lát cắt (Sliced CRC) trong NvM_MainFunction() để không làm trễ các tác vụ thời gian thực khác.",
    outputs: "Trả về giá trị CRC 8/16/32-bit cho NvM đối chiếu khi đọc, so sánh chống mòn Flash (CRC Compare) hoặc đính kèm cuối khung trước khi ghi.",
    apis: [
      "uint8 Crc_CalculateCRC8(const uint8* Crc_DataPtr, uint32 Crc_Length, uint8 Crc_StartValue8, boolean Crc_IsFirstCall);",
      "uint16 Crc_CalculateCRC16(const uint8* Crc_DataPtr, uint32 Crc_Length, uint16 Crc_StartValue16, boolean Crc_IsFirstCall);",
      "uint32 Crc_CalculateCRC32(const uint8* Crc_DataPtr, uint32 Crc_Length, uint32 Crc_StartValue32, boolean Crc_IsFirstCall);"
    ]
  },
  MOD_MEMIF: {
    id: "MOD_MEMIF",
    name: "MemIf (Memory Abstraction Interface)",
    layer: "ECU Abstraction Layer (SWS_MemIf)",
    role: "Lớp giao diện chuyển mạch trừu tượng hóa phần cứng bộ nhớ giữa NvM và các driver trừu tượng tầng dưới (Fee hoặc Ea).",
    inputs: "Lệnh Read, Write, EraseImmediateBlock, InvalidateBlock, Cancel, SetMode từ NvM kèm DeviceIndex và BlockNumber vật lý.",
    processing: "Ánh xạ BlockNumber từ (BaseNumber << DatasetBits) | DataIndex và chuyển hướng lời gọi tới Fee (DeviceIndex=0) hoặc Ea (DeviceIndex=1).",
    outputs: "Gọi xuống Fee_Read/Write/Cancel/SetMode() hoặc Ea_Read/Write/Cancel/SetMode().",
    apis: [
      "Std_ReturnType MemIf_Read(uint8 DeviceIndex, uint16 BlockNumber, uint16 BlockOffset, uint8* DataBufferPtr, uint16 Length);",
      "Std_ReturnType MemIf_Write(uint8 DeviceIndex, uint16 BlockNumber, const uint8* DataBufferPtr);",
      "void MemIf_Cancel(uint8 DeviceIndex); / void MemIf_SetMode(MemIf_ModeType Mode);",
      "Std_ReturnType MemIf_InvalidateBlock(uint8 DeviceIndex, uint16 BlockNumber);"
    ]
  },
  MOD_FEE: {
    id: "MOD_FEE",
    name: "Fee & Ea (Flash EEPROM Emulation / EEPROM Abstraction)",
    layer: "ECU Abstraction Layer (SWS_Fee / SWS_Ea)",
    role: "Thực hiện cân bằng hao mòn (Wear Leveling), gom rác chuyển Sector và ánh xạ BlockNumber logic sang địa chỉ vật lý cố định/động trên Flash/EEPROM.",
    inputs: "Lệnh đọc/ghi/xóa theo BlockNumber từ MemIf; callback kết thúc thao tác phần cứng từ Fls / Eep.",
    processing: "Fee ghi nối tiếp log-structured sang vùng trang trống tiếp theo, giữ sẵn Pre-erased Sector cho khối Immediate (Prio=0), và quản lý cờ Block Header INVALID.",
    outputs: "Gọi xuống Fls_Read/Write/Erase() (hoặc Eep_*) và chuyển tiếp callback NvM_JobEndNotification() / NvM_JobErrorNotification() lên NvM.",
    apis: [
      "Std_ReturnType Fee_Read(uint16 BlockNumber, uint16 BlockOffset, uint8* DataBufferPtr, uint16 Length);",
      "Std_ReturnType Fee_Write(uint16 BlockNumber, const uint8* DataBufferPtr);",
      "void NvM_JobEndNotification(void); /* SWS_NvM_00462 */",
      "void NvM_JobErrorNotification(void); /* SWS_NvM_00463 */"
    ]
  },
  MOD_FLS: {
    id: "MOD_FLS",
    name: "Fls & Eep (Flash / EEPROM Driver)",
    layer: "MCAL (Microcontroller Abstraction Layer)",
    role: "Trình điều khiển phần cứng cấp thấp thao tác trực tiếp lên thanh ghi Internal Data Flash (DFlash) hoặc chip SPI/I2C EEPROM ngoài.",
    inputs: "Yêu cầu đọc/ghi/xóa/so sánh theo địa chỉ vật lý tuyệt đối (TargetAddress, Length) từ Fee / Ea.",
    processing: "Mở khóa bộ điều khiển Flash, lập trình theo Page (FlsPageSize), xóa theo Sector (FlsSectorSize) và kiểm tra lỗi ECC/Sequence trong Fls_MainFunction().",
    outputs: "Khi xong hoặc gặp lỗi phần cứng, bắn callback Fee_JobEndNotification() hoặc Fee_JobErrorNotification() (chuỗi tới NvM).",
    apis: [
      "Std_ReturnType Fls_Read(Fls_AddressType SourceAddress, uint8* TargetAddressPtr, Fls_LengthType Length);",
      "Std_ReturnType Fls_Write(Fls_AddressType TargetAddress, const uint8* SourceAddressPtr, Fls_LengthType Length);",
      "Std_ReturnType Fls_Erase(Fls_AddressType TargetAddress, Fls_LengthType Length);",
      "void Fls_MainFunction(void); / void Eep_MainFunction(void);"
    ]
  },
  MOD_BSWM: {
    id: "MOD_BSWM",
    name: "BswM & EcuM (Lifecycle Orchestrator)",
    layer: "System Services (SWS_BswM / SWS_EcuM)",
    role: "Điều phối vòng đời bật/tắt ECU: kích hoạt NvM_Init(), NvM_ReadAll() khi khởi động và NvM_WriteAll() khi tắt máy.",
    inputs: "Nhận callback BswM_NvM_CurrentJobMode(MultiBlockRequest, CurrentJobMode) và CurrentBlockMode() từ NvM.",
    processing: "Khi Boot: BswM đợi NvM_ReadAll báo NVM_REQ_OK mới cho gọi Rte_Start(). Khi Shutdown: sau Rte_Stop(), đợi NvM_WriteAll báo NVM_REQ_OK mới gọi EcuM_GoDownHaltPoll().",
    outputs: "Gọi NvM_Init(), NvM_ReadAll(), NvM_WriteAll(), NvM_ValidateAll(), NvM_CancelWriteAll() vào NvM.",
    apis: [
      "void BswM_NvM_CurrentJobMode(NvM_MultiBlockRequestType MultiBlockRequest, NvM_RequestResultType CurrentJobMode);",
      "void BswM_NvM_CurrentBlockMode(NvM_BlockIdType Block, NvM_RequestResultType CurrentBlockMode);",
      "void NvM_ReadAll(void); / void NvM_WriteAll(void); / void NvM_CancelWriteAll(void);"
    ]
  },
  MOD_DCM_DEM: {
    id: "MOD_DCM_DEM",
    name: "Dcm & Dem (Diagnostic & Event Memory)",
    layer: "Diagnostic Services (SWS_Dcm / SWS_Dem)",
    role: "Dcm đọc/ghi DID cấu hình (UDS 0x22/0x2E); Dem lưu Event Memory xuống NVRAM và tiếp nhận báo cáo lỗi Production Error từ NvM.",
    inputs: "Từ NvM: kết quả Job (GetErrorStatus) và 5 sự kiện lỗi Dem_SetEventStatus(NVM_E_INTEGRITY_FAILED / REQ_FAILED / LOSS_OF_REDUNDANCY / VERIFY_FAILED / WRONG_BLOCK_ID).",
    processing: "Dcm dùng NvM_ReadBlock/WriteBlock cho DID; Dem dùng NvM lưu FreezeFrame/DTC Status và ghi nhận DTC hệ thống khi NvM hỏng Flash.",
    outputs: "Gọi NvM_ReadBlock(), NvM_WriteBlock(), NvM_InvalidateNvBlock(), NvM_GetErrorStatus() vào NvM.",
    apis: [
      "Std_ReturnType Dem_SetEventStatus(Dem_EventIdType EventId, Dem_EventStatusType EventStatus); /* SWS_NvM_00496 */",
      "Events: NVM_E_INTEGRITY_FAILED, NVM_E_REQ_FAILED, NVM_E_LOSS_OF_REDUNDANCY, NVM_E_VERIFY_FAILED, NVM_E_WRONG_BLOCK_ID"
    ]
  },
  MOD_DET: {
    id: "MOD_DET",
    name: "DET (Default Error Tracer — ModuleId = 20)",
    layer: "System Services (SWS_Det)",
    role: "Tiếp nhận và ghi nhận toàn bộ lỗi phát triển (Development Errors) và lỗi thời gian chạy (Runtime Errors) từ NvM.",
    inputs: "Lời gọi Det_ReportError(20, 0, ServiceId, ErrorId) hoặc Det_ReportRuntimeError() từ các chốt kiểm tra đầu hàm của NvM.",
    processing: "Ghi nhận 12 mã lỗi chuẩn AUTOSAR R22-11/R23-11: NVM_E_UNINIT (0x14), PARAM_BLOCK_ID (0x0A), BLOCK_TYPE (0x0B), DATA_IDX (0x0C), ADDRESS (0x0D), POINTER (0x10), PENDING (0x15), CONFIG (0x18), LOCKED (0x19), QUEUE_FULL (0xA0).",
    outputs: "Hiển thị cảnh báo lỗi trực tiếp trên API Trace Log và Inspector để lập trình viên sửa lỗi.",
    apis: [
      "Std_ReturnType Det_ReportError(uint16 ModuleId /*=20*/, uint8 InstanceId, uint8 ApiId, uint8 ErrorId);",
      "Std_ReturnType Det_ReportRuntimeError(uint16 ModuleId /*=20*/, uint8 InstanceId, uint8 ApiId, uint8 ErrorId);"
    ]
  }
};

const ABBREVIATIONS_DATA = [
  // Category: ARCH (15)
  { abbr: "NvM", full: "NVRAM Manager (Non-Volatile RAM Manager)", vi: "Trình quản lý bộ nhớ bất khả biến", cat: "ARCH", desc: "Module tầng Memory Services điều phối đọc/ghi bất đồng bộ, quản lý hàng đợi, CRC và phục hồi dữ liệu giữa RAM và Flash/EEPROM.", sws: "SWS_NvM" },
  { abbr: "NVRAM", full: "Non-Volatile Random Access Memory", vi: "Bộ nhớ không mất dữ liệu khi mất điện", cat: "ARCH", desc: "Khái niệm chỉ vùng lưu trữ bền vững (Data Flash nội hoặc chip EEPROM ngoài) lưu thông số xe qua các chu kỳ tắt/mở khóa điện.", sws: "SWS_NvM_00017" },
  { abbr: "NVRAM Block", full: "Logical NVRAM Block Unit", vi: "Khối quản lý logic NVRAM", cat: "ARCH", desc: "Đơn vị cấu hình logic gồm 4 thành phần: Administrative Block (RAM), RAM Block (hoặc Mirror), NV Block(s) và ROM Block.", sws: "SWS_NvM_00017" },
  { abbr: "Admin Block", full: "NvM Administrative Block", vi: "Khối quản trị nội bộ NvM", cat: "ARCH", desc: "Cấu trúc RAM nội bộ của NvM lưu RequestResult, cờ VALID/CHANGED/WRITE_PROT, DataIndex, RetryCounter và CRC gần nhất.", sws: "SWS_NvM_00134" },
  { abbr: "RAM Block", full: "Volatile Working RAM Area", vi: "Vùng dữ liệu làm việc trên RAM", cat: "ARCH", desc: "Vùng bộ nhớ trên RAM chứa dữ liệu ứng dụng đang xử lý; có thể là Permanent RAM, Temporary RAM hoặc NvM Mirror.", sws: "SWS_NvM_00482" },
  { abbr: "PRAM", full: "Permanent RAM Block", vi: "Vùng RAM cố định", cat: "ARCH", desc: "Vùng RAM có địa chỉ tĩnh (NvMRamBlockDataAddress) dùng cho NvM_ReadAll/WriteAll và API ReadPRAMBlock/WritePRAMBlock R22-11+.", sws: "SWS_NvM_00482" },
  { abbr: "Temp RAM", full: "Temporary RAM Block", vi: "Vùng RAM tạm thời", cat: "ARCH", desc: "Con trỏ bộ đệm được truyền trực tiếp qua tham số DstPtr/SrcPtr khi gọi NvM_ReadBlock() hoặc NvM_WriteBlock().", sws: "SWS_NvM_00454" },
  { abbr: "NV Block", full: "Non-Volatile Physical Block", vi: "Khối lưu trữ trên Flash/EEPROM", cat: "ARCH", desc: "Khung dữ liệu thực tế lưu dưới Fee/Ea gồm Header, Static Block ID (tùy chọn), Payload người dùng và CRC.", sws: "SWS_NvM_00134" },
  { abbr: "ROM Block", full: "Read-Only Default Data Block", vi: "Khối dữ liệu mặc định trong Flash code", cat: "ARCH", desc: "Chứa giá trị mặc định xuất xưởng (NvMRomBlockDataAddress) để nạp cứu hộ khi NV Block trống hoặc bị hỏng CRC.", sws: "SWS_NvM_00222" },
  { abbr: "NATIVE", full: "NVM_BLOCK_NATIVE", vi: "Khối đơn bản sao", cat: "ARCH", desc: "Kiểu quản lý mặc định lưu đúng 1 bản sao NV Block duy nhất trên Flash/EEPROM; tiết kiệm bộ nhớ nhất.", sws: "SWS_NvM_00134" },
  { abbr: "REDUNDANT", full: "NVM_BLOCK_REDUNDANT", vi: "Khối dự phòng kép (2 bản sao)", cat: "ARCH", desc: "Lưu 2 bản sao NV Block (#0 và #1) độc lập; nếu bản sao #0 lỗi CRC sẽ tự động đọc bản sao #1 và ghi phục hồi.", sws: "SWS_NvM_00215" },
  { abbr: "DATASET", full: "NVM_BLOCK_DATASET", vi: "Khối đa tập dữ liệu (mảng ngăn)", cat: "ARCH", desc: "Quản lý mảng 1..255 khối NV và ROM cùng kích thước trên 1 BlockId; truy cập qua chỉ số DataIndex.", sws: "SWS_NvM_00014" },
  { abbr: "DataIndex", full: "Dataset Element Index", vi: "Chỉ số phần tử trong Dataset", cat: "ARCH", desc: "Giá trị đặt qua NvM_SetDataIndex(BlockId, idx). Nếu idx < NvBlockNum trỏ vào NV Flash; nếu >= NvBlockNum trỏ vào ROM.", sws: "SWS_NvM_00448" },
  { abbr: "SelectionBits", full: "NvMDatasetSelectionBits", vi: "Số bit mã hóa DataIndex", cat: "ARCH", desc: "Số bit thấp dùng ghép thành BlockNumber cho MemIf: PhysBlockNum = (BaseNumber << SelectionBits) | DataIndex.", sws: "ECUC_NvM_00494" },
  { abbr: "InitCbk", full: "NvMInitBlockCallback", vi: "Hàm callback khởi tạo mặc định", cat: "ARCH", desc: "Hàm ứng dụng được NvM gọi để điền dữ liệu khởi tạo động khi không có hoặc sau khi nạp NvMRomBlockDataAddress.", sws: "SWS_NvM_00466" },

  // Category: QUEUE (15)
  { abbr: "Implicit Sync", full: "Implicit Synchronization", vi: "Đồng bộ ngầm định trực tiếp", cat: "QUEUE", desc: "NvM đọc/ghi thẳng vào Permanent RAM của SWC; yêu cầu SWC tự tránh sửa dữ liệu khi khối đang ở NVM_REQ_PENDING.", sws: "SWS_NvM_00482" },
  { abbr: "Explicit Sync", full: "Explicit Synchronization (NvM Mirror)", vi: "Đồng bộ tường minh qua Mirror", cat: "QUEUE", desc: "Dùng bộ đệm riêng NvM Mirror và cặp callback WriteRamBlockToNv/ReadRamBlockFromNv để copy nguyên tử, chống Data Tear.", sws: "SWS_NvM_00694" },
  { abbr: "NvM Mirror", full: "Internal NvM Synchronization Buffer", vi: "Bộ đệm gương nội bộ của NvM", cat: "QUEUE", desc: "Vùng đệm nội bộ giúp tách biệt vòng đời sửa RAM của SWC khỏi quá trình tính CRC và ghi Flash kéo dài nhiều chu kỳ.", sws: "SWS_NvM_00694" },
  { abbr: "RepeatMirrorOps", full: "NvMRepeatMirrorOperations", vi: "Số lần thử lại callback Mirror", cat: "QUEUE", desc: "Số lần NvM gọi lại WriteRamBlockToNvCallback nếu SWC đang giữ khóa và trả về E_NOT_OK.", sws: "ECUC_NvM_00515" },
  { abbr: "VALID / INVALID", full: "RAM Block Validity State", vi: "Cờ hợp lệ dữ liệu RAM (Bit 7)", cat: "QUEUE", desc: "Đánh dấu dữ liệu trong RAM đáng tin cậy để sử dụng và đủ điều kiện ghi xuống Flash khi NvM_WriteAll() chạy.", sws: "SWS_NvM_00453" },
  { abbr: "CHANGED / Dirty", full: "RAM Block Changed Attribute", vi: "Cờ đánh dấu RAM đã thay đổi (Bit 6)", cat: "QUEUE", desc: "Bật bằng NvM_SetRamBlockStatus(TRUE); NvM_WriteAll() chỉ ghi khối có đồng thời VALID=1 và CHANGED=1.", sws: "SWS_NvM_00254" },
  { abbr: "Std Queue", full: "Standard Priority Job Queue", vi: "Hàng đợi công việc ưu tiên thường", cat: "QUEUE", desc: "Hàng đợi chứa các lệnh Read/Write/Restore có NvMBlockJobPriority từ 1 (cao nhất) đến 255 (thấp nhất).", sws: "SWS_NvM_00378" },
  { abbr: "Imm Queue", full: "Immediate Priority Job Queue (Prio=0)", vi: "Hàng đợi ưu tiên tức thời", cat: "QUEUE", desc: "Hàng đợi FIFO dành riêng cho lệnh NvM_WriteBlock() của khối có Priority=0 (dữ liệu tai nạn/mất nguồn).", sws: "SWS_NvM_00378" },
  { abbr: "Preemption", full: "Immediate Job Preemption", vi: "Cơ chế cắt ngang Job thường", cat: "QUEUE", desc: "Khi Imm Queue có lệnh, NvM gọi MemIf_Cancel() tạm dừng Job thường, ghi xong khối Prio=0 rồi tự Resume Job thường.", sws: "SWS_NvM_00381" },
  { abbr: "NvM_ReadAll", full: "Multi-Block Startup Read Service", vi: "Dịch vụ đọc hàng loạt lúc bật ECU", cat: "QUEUE", desc: "Kiểm tra Block #1 ConfigId và nạp toàn bộ các khối có NvMSelectBlockForReadAll=TRUE từ Flash lên RAM khi khởi động.", sws: "SWS_NvM_00460" },
  { abbr: "NvM_WriteAll", full: "Multi-Block Shutdown Write Service", vi: "Dịch vụ lưu hàng loạt lúc tắt ECU", cat: "QUEUE", desc: "Quét và ghi mọi khối có SelectBlockForWriteAll=TRUE đang ở trạng thái VALID & CHANGED xuống Flash trước khi tắt nguồn.", sws: "SWS_NvM_00461" },
  { abbr: "CancelWriteAll", full: "NvM_CancelWriteAll", vi: "Hủy tiến trình NvM_WriteAll", cat: "QUEUE", desc: "Khi bật lại khóa điện IG giữa lúc tắt máy, đợi khối đang ghi dở hoàn tất an toàn rồi hủy phần còn lại (NVM_REQ_CANCELED).", sws: "SWS_NvM_00458" },
  { abbr: "ValidateAll", full: "NvM_ValidateAll", vi: "Đánh dấu hợp lệ hàng loạt", cat: "QUEUE", desc: "Đánh dấu VALID & CHANGED cho các khối bật NvMBlockUseAutoValidation=TRUE trước khi chạy NvM_WriteAll().", sws: "SWS_NvM_00855" },
  { abbr: "JobFinished Cbk", full: "NvMSingleBlockCallback", vi: "Callback hoàn tất đơn khối", cat: "QUEUE", desc: "Thông báo ngược lên SWC/Dcm qua RTE (ServiceId, JobResult) ngay khi lệnh bất đồng bộ trên khối kết thúc.", sws: "SWS_NvM_00467" },
  { abbr: "CurrentJobMode", full: "BswM_NvM_CurrentJobMode", vi: "Thông báo tiến trình đa khối sang BswM", cat: "QUEUE", desc: "Báo trạng thái NVM_READ_ALL / NVM_WRITE_ALL (PENDING/OK/CANCELED) cho BswM điều phối Rte_Start() và EcuM_GoDown().", sws: "SWS_NvM_00109" },

  // Category: CRC (13)
  { abbr: "CRC-8/16/32", full: "Cyclic Redundancy Check", vi: "Mã kiểm tra vòng toàn vẹn dữ liệu", cat: "CRC", desc: "Mã kiểm tra 1, 2 hoặc 4 byte tính bằng thư viện SWS_Crc đính kèm cuối NV Block để phát hiện lỗi lật bit bộ nhớ Flash.", sws: "SWS_NvM_00201" },
  { abbr: "Sliced CRC", full: "NvMCrcNumOfBytes Sliced Calculation", vi: "Tính CRC chia lát cắt theo chu kỳ", cat: "CRC", desc: "Chia nhỏ phép tính CRC theo số byte mỗi chu kỳ MainFunction để đảm bảo thời gian thực không khóa CPU.", sws: "ECUC_NvM_00492" },
  { abbr: "CRC Compare", full: "NvMBlockUseCrcCompMechanism", vi: "So sánh CRC bỏ qua ghi thừa", cat: "CRC", desc: "Nếu CRC tính mới trên RAM trùng với CRC đã lưu trên NV, bỏ qua MemIf_Write() giúp bảo vệ tuổi thọ Flash.", sws: "SWS_NvM_00852" },
  { abbr: "Static Block ID", full: "NvMStaticBlockIDCheck", vi: "Kiểm tra mã định danh khối 2-byte", cat: "CRC", desc: "Lưu kèm 2-byte BlockId ở đầu NV Block và kiểm tra lại khi đọc lên để chống đọc nhầm địa chỉ ô nhớ (NVM_E_WRONG_BLOCK_ID).", sws: "SWS_NvM_00535" },
  { abbr: "Write Verify", full: "NvMWriteVerification (Read-back)", vi: "Đọc ngược kiểm chứng sau khi ghi", cat: "CRC", desc: "Ngay sau MemIf_Write(), tự động MemIf_Read() đối chiếu từng byte với RAM; sai lệch sẽ Retry và báo NVM_E_VERIFY_FAILED.", sws: "SWS_NvM_00842" },
  { abbr: "WriteProt", full: "NvMBlockWriteProt / SetBlockProtection", vi: "Khóa bảo vệ chống ghi đè", cat: "CRC", desc: "Cờ ngăn mọi thao tác Write/Erase/Invalidate lên khối; vi phạm sẽ trả E_NOT_OK và báo DET NVM_E_BLOCK_LOCKED (0x19).", sws: "SWS_NvM_00450" },
  { abbr: "WriteBlockOnce", full: "NvMWriteBlockOnce", vi: "Chế độ chỉ cho phép ghi 1 lần duy nhất", cat: "CRC", desc: "Khóa cứng vĩnh viễn ngay sau lần đọc/ghi đầu tiên (dùng cho VIN/Serial); không thể mở khóa qua NvM_SetBlockProtection(FALSE).", sws: "SWS_NvM_00326" },
  { abbr: "ConfigId (#1)", full: "Configuration ID (Block #1 & CompiledConfigId)", vi: "Mã cấu hình phần mềm tại Block #1", cat: "CRC", desc: "So sánh NvMCompiledConfigId với giá trị lưu ở Block #1 khi ReadAll để phát hiện ECU vừa nâng cấp phần mềm mới.", sws: "SWS_NvM_00307" },
  { abbr: "ResistantToSw", full: "NvMResistantToChangedSw", vi: "Cờ giữ dữ liệu khi nâng cấp SW", cat: "CRC", desc: "TRUE: giữ lại dữ liệu NV cũ khi đổi ConfigId (Odometer); FALSE: nạp lại từ ROM Default để khớp cấu trúc SW mới.", sws: "SWS_NvM_00308" },
  { abbr: "Write/ReadRetry", full: "NvMMaxNumOfWriteRetries / ReadRetries", vi: "Số lần tự động thử lại khi lỗi HW", cat: "CRC", desc: "Tự động lặp lại lệnh MemIf_Write/Read khi gặp JobErrorNotification hoặc Verify lỗi trước khi báo lỗi DEM.", sws: "SWS_NvM_00263" },
  { abbr: "DEM NVM_E_*", full: "Production Diagnostic Events", vi: "5 sự kiện lỗi Production báo sang DEM", cat: "CRC", desc: "Gồm INTEGRITY_FAILED, REQ_FAILED, LOSS_OF_REDUNDANCY, VERIFY_FAILED, WRONG_BLOCK_ID gửi qua Dem_SetEventStatus().", sws: "SWS_NvM_00496" },
  { abbr: "DET (Mod 20)", full: "Development & Runtime Error Tracer", vi: "Báo lỗi lập trình ModuleId = 20", cat: "CRC", desc: "Gồm NVM_E_UNINIT (0x14), PARAM_BLOCK_ID (0x0A), BLOCK_TYPE (0x0B), BLOCK_PENDING (0x15), BLOCK_LOCKED (0x19), QUEUE_FULL (0xA0).", sws: "SWS_NvM_00592" },
  { abbr: "RestoreDefaults", full: "NvM_RestoreBlockDefaults", vi: "Khôi phục dữ liệu mặc định từ ROM", cat: "CRC", desc: "Nạp trực tiếp giá trị từ ROM Block / InitBlockCallback vào RAM (trả về NVM_REQ_RESTORED_FROM_ROM).", sws: "SWS_NvM_00456" },

  // Category: STACK (11)
  { abbr: "MemIf", full: "Memory Abstraction Interface", vi: "Lớp chuyển mạch giao diện bộ nhớ", cat: "STACK", desc: "Trừu tượng hóa tầng dưới cho NvM: định tuyến lệnh theo DeviceIndex sang Fee (0 = Data Flash) hoặc Ea (1 = EEPROM).", sws: "SWS_MemIf" },
  { abbr: "MEMIF_FAST/SLOW", full: "MemIf_SetMode (NvMDrvModeSwitch)", vi: "Chuyển chế độ tốc độ đọc/ghi Flash", cat: "STACK", desc: "Đặt MEMIF_MODE_FAST khi chạy NvM_ReadAll/WriteAll để tối ưu thời gian boot/shutdown, trả về SLOW khi kết thúc.", sws: "SWS_NvM_00243" },
  { abbr: "Fee", full: "Flash EEPROM Emulation", vi: "Lớp giả lập EEPROM trên Data Flash", cat: "STACK", desc: "Quản lý ánh xạ địa chỉ động (Log-structured), cân bằng hao mòn Wear Leveling và gom rác Sector trên DFlash.", sws: "SWS_Fee" },
  { abbr: "Ea", full: "EEPROM Abstraction", vi: "Lớp trừu tượng hóa EEPROM", cat: "STACK", desc: "Ánh xạ BlockNumber logic của NvM sang địa chỉ vật lý trên chip SPI/I2C EEPROM ngoài hoặc Data EEPROM nội.", sws: "SWS_Ea" },
  { abbr: "Fls / Eep", full: "Flash Driver / EEPROM Driver (MCAL)", vi: "Driver phần cứng Flash / EEPROM", cat: "STACK", desc: "Trình điều khiển MCAL lập trình từng Page, xóa từng Sector và kiểm tra ECC trong Fls_MainFunction() / Eep_MainFunction().", sws: "SWS_Fls / SWS_Eep" },
  { abbr: "Wear Leveling", full: "Flash Erase-Cycle Balancing", vi: "Cân bằng độ hao mòn ô nhớ Flash", cat: "STACK", desc: "Thuật toán của Fee luân chuyển vị trí ghi qua các trang trống khác nhau để không làm hỏng cục bộ một trang Flash.", sws: "SWS_Fee" },
  { abbr: "Garbage Collect", full: "Fee Sector Switch / Garbage Collection", vi: "Dọn rác chuyển vùng Flash", cat: "STACK", desc: "Khi Sector hiện tại đầy, Fee copy các bản ghi hợp lệ mới nhất sang Sector mới và xóa sạch Sector cũ.", sws: "SWS_Fee" },
  { abbr: "Pre-erased", full: "FeeImmediateData Pre-erased Space", vi: "Vùng Flash xóa sẵn cho khối khẩn cấp", cat: "STACK", desc: "Vùng dự trữ luôn xóa trắng sẵn trên Fee dành cho khối Priority=0 (Crash Record) để ghi tức thì không cần chờ xóa Sector.", sws: "SWS_Fee" },
  { abbr: "InvalidateNvBlock", full: "NvM_InvalidateNvBlock", vi: "Đánh dấu vô hiệu hóa logic trên Flash", cat: "STACK", desc: "Đánh dấu Header khối trên Fee thành INVALID mà không cần xóa cả Sector; lần đọc sau trả NVM_REQ_NV_INVALIDATED.", sws: "SWS_NvM_00459" },
  { abbr: "EraseNvBlock", full: "NvM_EraseNvBlock", vi: "Xóa trắng vật lý khối Immediate (Prio=0)", cat: "STACK", desc: "Gọi MemIf_EraseImmediateBlock() xóa sẵn vùng Flash; bắt buộc khối phải có Priority=0 nếu không sẽ báo lỗi 0x18.", sws: "SWS_NvM_00457" },
  { abbr: "JobEnd / JobError", full: "NvM_JobEndNotification / ErrorNotification", vi: "Callback kết thúc Job từ tầng dưới", cat: "STACK", desc: "Hàm callback trong NvM_Cbk.h được Fee/Ea gọi ngay khi Fls/Eep hoàn tất hoặc lỗi phần cứng.", sws: "SWS_NvM_00462 / 00463" }
];
