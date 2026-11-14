// ================= PART 3: CONSTANTS, BITFIELDS, 4 MASKS, CONFIG TOOLTIPS, MODULE METADATA & GLOSSARY =================

const UDS_STATUS_BITS = [
  { bit: 7, mask: 0x80, tag: "WIR",    keyBit: false, tone: "warn", name: "warningIndicatorRequested",              desc: "Bit 7 (0x80): Đèn MIL / Cảnh báo táp-lô được yêu cầu bật." },
  { bit: 6, mask: 0x40, tag: "TNCTOC", keyBit: true,  tone: "warn", name: "testNotCompletedThisOperationCycle",     desc: "Bit 6 (0x40 - KEY BIT FIM): =1 nghĩa là Event CHƯA chạy xong bài kiểm tra trong chu kỳ hiện tại; =0 nghĩa là ĐÃ chạy xong." },
  { bit: 5, mask: 0x20, tag: "TFSLC",  keyBit: false, tone: "",     name: "testFailedSinceLastClear",               desc: "Bit 5 (0x20): Đã từng báo lỗi ít nhất 1 lần kể từ lần Dem_ClearDTC() gần nhất." },
  { bit: 4, mask: 0x10, tag: "TNCSLC", keyBit: false, tone: "",     name: "testNotCompletedSinceLastClear",         desc: "Bit 4 (0x10): Chưa hoàn thành bài kiểm tra lần nào kể từ lần ClearDTC gần nhất." },
  { bit: 3, mask: 0x08, tag: "CDTC",   keyBit: false, tone: "err",  name: "confirmedDTC",                           desc: "Bit 3 (0x08): Mã lỗi đã được xác nhận bền vững và lưu vào Primary Event Memory / NvM." },
  { bit: 2, mask: 0x04, tag: "PDTC",   keyBit: false, tone: "warn", name: "pendingDTC",                             desc: "Bit 2 (0x04): Mã lỗi đang chờ xác nhận qua chu kỳ lái tiếp theo." },
  { bit: 1, mask: 0x02, tag: "TFTOC",  keyBit: false, tone: "warn", name: "testFailedThisOperationCycle",           desc: "Bit 1 (0x02): Đã từng FAIL trong chu kỳ vận hành hiện tại (giữ 1 suốt chu kỳ)." },
  { bit: 0, mask: 0x01, tag: "TF",     keyBit: true,  tone: "err",  name: "testFailed (Last Failed)",               desc: "Bit 0 (0x01 - KEY BIT FIM): =1 khi kết quả kiểm tra gần nhất là FAILED; =0 khi kết quả gần nhất là PASSED." }
];

const FIM_ENGINE_BITS = [
  { bit: 7, mask: 0x80, tag: "FIM_INIT",    tone: "",     name: "FIM_INITIALIZED",       desc: "FiM_Init() và FiM_DemInit() đã hoàn thành (SWS_FiM_00059). Nếu =0 (UNINIT/PRE_INIT), mọi GetFunctionPermission() trả E_NOT_OK và Permission=FALSE." },
  { bit: 6, mask: 0x40, tag: "TRIG_BY_DEM", tone: "",     name: "EVENT_TRIG_BY_DEM",     desc: "Chế độ Push Event-Driven (FiMEventUpdateTriggeredByDem=TRUE): DEM gọi FiM_DemTriggerOnEventStatus() tức thì (=0 là Cyclic Polling qua FiM_MainFunction)." },
  { bit: 5, mask: 0x20, tag: "AVAIL_SUPP",  tone: "",     name: "AVAILABILITY_SUPP",       desc: "FiMAvailabilitySupport=TRUE (ECUC_FiM_00097): cho phép gọi FiM_SetFunctionAvailable(FID, Availability)." },
  { bit: 4, mask: 0x10, tag: "COMP_FAILED", tone: "err",  name: "COMP_FAILED_INH",       desc: "DemComponent liên kết với FID đang báo Failed=TRUE qua FiM_DemTriggerOnComponentStatus() hoặc Dem_GetComponentFailed()." },
  { bit: 3, mask: 0x08, tag: "SUM_EVT_ACT", tone: "warn", name: "SUM_EVENT_INH",         desc: "Nhóm FiMSummaryEvent (Sum_01) liên kết với FID có ít nhất 1 Event thành viên khớp mặt nạ ức chế." },
  { bit: 2, mask: 0x04, tag: "MASK_MATCH",  tone: "err",  name: "MASK_MATCH_ACTIVE",     desc: "Ít nhất 1 quy tắc mặt nạ (EventStatus & Mask) == ExpectedPattern trả về TRUE cho FID đang chọn (InhibitCounter[FID] > 0)." },
  { bit: 1, mask: 0x02, tag: "FID_AVL",     tone: "",     name: "FID_AVAILABLE",         desc: "Trạng thái khả dụng động của FID đang chọn (mặc định TRUE; =0 khi gọi FiM_SetFunctionAvailable(FID, FALSE))." },
  { bit: 0, mask: 0x01, tag: "FID_PERM",    tone: "",     name: "FID_PERMISSION",        desc: "Đầu ra cuối cùng của FiM_GetFunctionPermission(): =1 (TRUE) khi Init=1 && Avail=1 && InhibitCounter==0 && CompFailed==0; ngược lại =0 (FALSE / FAIL-SAFE)." }
];

const FIM_MASKS_DEF = {
  FIM_LAST_FAILED: {
    id: "FIM_LAST_FAILED",
    maskByte: 0x01,
    patternByte: 0x01,
    sws: "SWS_FiM_00012",
    cExpr: "(Status & 0x01u) == 0x01u",
    shortDesc: "Bit 0 (TF) == 1",
    useCase: "Khóa tức thời chức năng an toàn (ACC/AEB) ngay khi cảm biến báo lỗi."
  },
  FIM_NOT_TESTED: {
    id: "FIM_NOT_TESTED",
    maskByte: 0x40,
    patternByte: 0x40,
    sws: "SWS_FiM_00012",
    cExpr: "(Status & 0x40u) == 0x40u",
    shortDesc: "Bit 6 (TNCTOC) == 1",
    useCase: "Khóa điều kiện tiền đề lúc mới bật khóa điện hoặc sau ClearDTC cho đến khi test xong."
  },
  FIM_TESTED: {
    id: "FIM_TESTED",
    maskByte: 0x40,
    patternByte: 0x00,
    sws: "SWS_FiM_00012",
    cExpr: "(Status & 0x40u) == 0x00u",
    shortDesc: "Bit 6 (TNCTOC) == 0",
    useCase: "Khóa bài test sau khi đã chạy xong 1 lần trong chu kỳ lái (Once-Per-Trip Monitor)."
  },
  FIM_TESTED_AND_FAILED: {
    id: "FIM_TESTED_AND_FAILED",
    maskByte: 0x41,
    patternByte: 0x01,
    sws: "SWS_FiM_00012",
    cExpr: "(Status & 0x41u) == 0x01u",
    shortDesc: "Bit 0 == 1 && Bit 6 == 0",
    useCase: "Chỉ khóa khi bài kiểm tra chu kỳ hiện tại ĐÃ chạy xong và kết quả là FAILED."
  }
};

const configTooltipData = {
  FiMInitialized: {
    title: "FiM Initialization State (Init + DemInit)",
    ecucPath: "FiMRuntime / FiMStatus",
    sws: "SWS_FiM_00059 · SWS_FiM_00006",
    range: "boolean (true = READY | false = UNINIT)",
    role: "Trạng thái khởi tạo hoàn chỉnh của FiM sau khi đã chạy FiM_Init() và DEM gọi FiM_DemInit().",
    mechanism: "Nếu false, mọi lệnh FiM_GetFunctionPermission() bắt buộc gán *Permission = FALSE, trả E_NOT_OK và báo DET FIM_E_UNINIT (0x01) nếu bật DET.",
    scenarioImpact: "Dùng để kiểm chứng trình tự Startup (S6) và bẫy lỗi FIM_E_UNINIT trong kịch bản S12."
  },
  FiMDevErrorDetect: {
    title: "FiMDevErrorDetect",
    ecucPath: "FiMGeneral / FiMDevErrorDetect",
    sws: "SWS_FiM_00076 · ECUC_FiM_00087",
    range: "boolean (true | false)",
    role: "Bật/tắt phát hiện và báo lỗi phát triển (Development Error) sang module DET (ModuleId = 11).",
    mechanism: "Khi true, FiM kiểm tra điều kiện chưa khởi tạo, FID/EventId vượt biên và con trỏ NULL_PTR trước khi thực thi logic.",
    scenarioImpact: "Ảnh hưởng trực tiếp tới log DET trong kịch bản S12."
  },
  FiMVersionInfoApi: {
    title: "FiMVersionInfoApi",
    ecucPath: "FiMGeneral / FiMVersionInfoApi",
    sws: "SWS_FiM_00078 · ECUC_FiM_00094",
    range: "boolean (true | false)",
    role: "Biên dịch hàm FiM_GetVersionInfo(Std_VersionInfoType* versioninfo).",
    mechanism: "Bật STD_ON cho phép lớp trên đọc VendorId, ModuleId (11) và phiên bản AUTOSAR SW của FiM.",
    scenarioImpact: "Cập nhật macro #define FIM_VERSION_INFO_API trong file FiM_Cfg.h khi xuất code."
  },
  FiMEventUpdateTriggeredByDem: {
    title: "FiMEventUpdateTriggeredByDem",
    ecucPath: "FiMGeneral / FiMEventUpdateTriggeredByDem",
    sws: "SWS_FiM_00021 · ECUC_FiM_00086",
    range: "boolean (true = Push Mode | false = Polling Mode)",
    role: "Lựa chọn kiến trúc đồng bộ trạng thái giữa DEM và FiM: Event-Driven Push hay Cyclic Polling.",
    mechanism: "TRUE: DEM gọi thẳng FiM_DemTriggerOnEventStatus() ngay khi status byte đổi (độ trễ 0ms). FALSE: FiM chỉ cập nhật trong FiM_MainFunction() bằng cách gọi Dem_GetEventUdsStatus().",
    scenarioImpact: "Là trọng tâm của kịch bản S5 để thấy độ trễ cho tới nhịp +20ms Tick khi tắt Push Mode."
  },
  FiMAvailabilitySupport: {
    title: "FiMAvailabilitySupport",
    ecucPath: "FiMGeneral / FiMAvailabilitySupport",
    sws: "SWS_FiM_00105 · ECUC_FiM_00097",
    range: "boolean (true | false)",
    role: "Cho phép điều khiển tính khả dụng động của từng FID qua API FiM_SetFunctionAvailable().",
    mechanism: "Nếu false, mọi lời gọi FiM_SetFunctionAvailable() bị vô hiệu hóa; nếu true, việc đặt Availability=FALSE sẽ khóa FID bất chấp trạng thái DEM.",
    scenarioImpact: "Dùng trực tiếp trong kịch bản S11 (Variant Coding / Transport Mode)."
  },
  FiMMainFunctionPeriod: {
    title: "FiMMainFunctionPeriod",
    ecucPath: "FiMGeneral / FiMMainFunctionPeriod",
    sws: "SWS_FiM_00060 · ECUC_FiM_00095",
    range: "float / ms (1 .. 100 ms, điển hình 10ms hoặc 20ms)",
    role: "Chu kỳ tác vụ BSW Scheduler (SchM) gọi định kỳ hàm FiM_MainFunction().",
    mechanism: "Xác định bước thời gian mỗi lần nhấn nút '+20ms MainFn' hoặc Auto Clock trong chế độ Polling.",
    scenarioImpact: "Quyết định tần suất FiM quét Dem_GetEventUdsStatus() trong kịch bản S5."
  },
  FiMMaxHandledFidEventLinksPerSchedulableStep: {
    title: "FiMMaxHandledFidEventLinksPerSchedulableStep",
    ecucPath: "FiMGeneral / FiMMaxHandledFidEventLinksPerSchedulableStep",
    sws: "SWS_FiM_00103 · ECUC_FiM_00098 (R20-11+)",
    range: "uint16 (1 .. 128, mặc định 64)",
    role: "Giới hạn số lượng liên kết FID-Event tối đa được tính lại trong 1 lần chạy FiM_MainFunction().",
    mechanism: "Ngăn FiM chiếm dụng quá nhiều CPU trong một OS Task khi hệ thống có hàng trăm FID; nếu đặt =1 hoặc =2 trong Polling Mode, việc quét sẽ chia qua nhiều nhịp Tick.",
    scenarioImpact: "Thử hạ về 1 ở S5 để quan sát cơ chế tính toán phân tán qua nhiều chu kỳ MainFunction."
  },
  FID0_Name: {
    title: "FID_0 Symbolic Name",
    ecucPath: "FiMConfigSet / FiMFID[0] / FiMFunctionId",
    sws: "SWS_FiM_00043 · ECUC_FiM_00039",
    range: "String Identifier (FID = 0)",
    role: "Tên biểu tượng của Function ID #0 ánh xạ qua PortDefinedArgumentValue tới SWC_Controller.",
    mechanism: "Liên kết với InhCfg0 (Evt_01), Summary Sum_01 (nếu bật) và Comp_01 (nếu bật). Khi bất kỳ nguồn nào khớp, FID_0 chuyển FALSE (ACC Limp-Home).",
    scenarioImpact: "Cập nhật tên hiển thị trên Ma trận, Badge Header và file FiM_Cfg.h."
  },
  FID0_Available: {
    title: "FID_0 Availability Flag",
    ecucPath: "FiMRuntime / Availability[FID_0]",
    sws: "SWS_FiM_00105 · SWS_FiM_00106",
    range: "boolean (true | false)",
    role: "Trạng thái khả dụng runtime của FID_0 thiết lập qua FiM_SetFunctionAvailable(0, Avail).",
    mechanism: "Nếu đặt false (khi FiMAvailabilitySupport=true), Bit 1 (FID_AVL) về 0 và Bit 0 (FID_PERM) bị ép về 0 ngay cả khi mọi cảm biến đều sạch lỗi.",
    scenarioImpact: "Trọng tâm kiểm chứng ở kịch bản S11."
  },
  FID1_Name: {
    title: "FID_1 Symbolic Name",
    ecucPath: "FiMConfigSet / FiMFID[1] / FiMFunctionId",
    sws: "SWS_FiM_00043 · ECUC_FiM_00039",
    range: "String Identifier (FID = 1)",
    role: "Tên biểu tượng của Function ID #1 (mặc định phanh khẩn cấp tự động AEB).",
    mechanism: "Minh họa quan hệ 1-to-Many: cùng một lỗi Evt_01 (Radar) hoặc Comp_01 khóa đồng thời cả FID_0 (ACC) và FID_1 (AEB).",
    scenarioImpact: "Hiển thị trên Ma trận Đa-Đa ở S1 và S9."
  },
  FID1_Available: {
    title: "FID_1 Availability Flag",
    ecucPath: "FiMRuntime / Availability[FID_1]",
    sws: "SWS_FiM_00105 · SWS_FiM_00106",
    range: "boolean (true | false)",
    role: "Trạng thái khả dụng runtime của FID_1.",
    mechanism: "Cho phép vô hiệu hóa độc lập tính năng AEB mà không ảnh hưởng tới các FID khác.",
    scenarioImpact: "Dùng để thử nghiệm Variant Coding độc lập từng FID."
  },
  FID2_Name: {
    title: "FID_2 Symbolic Name",
    ecucPath: "FiMConfigSet / FiMFID[2] / FiMFunctionId",
    sws: "SWS_FiM_00043 · ECUC_FiM_00039",
    range: "String Identifier (FID = 2)",
    role: "Tên biểu tượng của Function ID #2 (mặc định bài chẩn đoán Radar Monitor).",
    mechanism: "Đóng vai cổng bảo vệ Pre-condition Gate cho SWC_DiagMonitor: nếu nguồn 5V (Evt_02) lỗi hoặc chưa test xong, FID_2 bị khóa để chặn DTC giả (Cascading Faults).",
    scenarioImpact: "Trọng tâm của kịch bản S2, S7 và S10."
  },
  FID2_Available: {
    title: "FID_2 Availability Flag",
    ecucPath: "FiMRuntime / Availability[FID_2]",
    sws: "SWS_FiM_00105 · SWS_FiM_00106",
    range: "boolean (true | false)",
    role: "Trạng thái khả dụng runtime của FID_2.",
    mechanism: "Nếu đặt false, bài chẩn đoán Radar Monitor sẽ ngừng chạy vĩnh viễn cho tới khi được bật lại.",
    scenarioImpact: "Tắt bài giám sát theo cấu hình xe không gắn Radar."
  },
  InhCfg0_Mask: {
    title: "InhCfg0 Inhibition Mask (Evt_01 -> FID_0, FID_1)",
    ecucPath: "FiMConfigSet / FiMInhibitionConfiguration[0] / FiMInhInhibitionMask",
    sws: "SWS_FiM_00012 · ECUC_FiM_00090",
    range: "FIM_LAST_FAILED | FIM_NOT_TESTED | FIM_TESTED | FIM_TESTED_AND_FAILED",
    role: "Mặt nạ bitwise áp dụng lên byte trạng thái UDS của Evt_01 (RadarSignalErr) để khóa FID_0 & FID_1.",
    mechanism: "So khớp (Status & Mask) == Pattern. Mặc định FIM_LAST_FAILED khóa ngay khi Bit 0 (TF)=1; chuyển sang FIM_TESTED_AND_FAILED để bỏ qua lỗi cũ đầu chu kỳ (0x6D).",
    scenarioImpact: "Thay đổi trực tiếp ở S1, S3 và S4."
  },
  Evt01_UdsStatusHex: {
    title: "Evt_01 UDS Status Byte (RadarSignalErr)",
    ecucPath: "DemConfigSet / DemEventParameter[Evt_01] / UdsStatusByte",
    sws: "SWS_Dem_00006 · SWS_FiM_00012",
    range: "Hex Byte (0x00 .. 0xFF)",
    role: "Byte 8-bit UDS hiện tại của Evt_01 từ DEM (Bit 0 TF, Bit 6 TNCTOC là 2 bit FiM đọc).",
    mechanism: "Ví dụ: 0x00 (sạch), 0x50 (mới bật IG / ClearDTC: TNCTOC=1), 0x6D (lỗi từ chu kỳ trước chưa test lại: TF=1, TNCTOC=1), 0x2F (lỗi xác nhận: TF=1, TNCTOC=0).",
    scenarioImpact: "Đồng bộ hai chiều với Thanh ghi 8-Bit A khi đang chọn Evt_01."
  },
  InhCfg1_Mask: {
    title: "InhCfg1 Inhibition Mask (Evt_02 -> FID_2)",
    ecucPath: "FiMConfigSet / FiMInhibitionConfiguration[1] / FiMInhInhibitionMask",
    sws: "SWS_FiM_00012 · ECUC_FiM_00090",
    range: "FIM_LAST_FAILED | FIM_NOT_TESTED | FIM_TESTED | FIM_TESTED_AND_FAILED",
    role: "Mặt nạ bitwise áp dụng lên Evt_02 (SensorSupply5V_UnderV) để kiểm soát quyền chạy của FID_2 (RadarDiagMonitor).",
    mechanism: "Mặc định FIM_NOT_TESTED: khóa FID_2 mỗi khi mạch nguồn 5V chưa chạy test xong (TNCTOC=1), ví dụ lúc mới bật khóa điện hoặc ngay sau Dem_ClearDTC().",
    scenarioImpact: "Tạo hiệu ứng kép thú vị trong kịch bản S2, S7 và S10."
  },
  Evt02_UdsStatusHex: {
    title: "Evt_02 UDS Status Byte (SensorSupply5V_UnderV)",
    ecucPath: "DemConfigSet / DemEventParameter[Evt_02] / UdsStatusByte",
    sws: "SWS_Dem_00006 · SWS_FiM_00012",
    range: "Hex Byte (0x00 .. 0xFF)",
    role: "Byte 8-bit UDS của nguồn cảm biến 5V (Root Cause Event trong bài toán chống lỗi dây chuyền).",
    mechanism: "Mặc định 0x50 (TNCTOC=1). Khi test xong đạt PASSED -> 0x00; nếu lỗi sụt áp -> 0x2F.",
    scenarioImpact: "Trực tiếp điều khiển InhCfg1 và là thành viên thứ nhất của nhóm Sum_01."
  },
  InhCfg2_Mask: {
    title: "InhCfg2 Inhibition Mask (Sum_01 -> FID_0)",
    ecucPath: "FiMConfigSet / FiMInhibitionConfiguration[2] / FiMInhInhibitionMask",
    sws: "SWS_FiM_00063 · ECUC_FiM_00090",
    range: "FIM_LAST_FAILED | FIM_NOT_TESTED | FIM_TESTED | FIM_TESTED_AND_FAILED",
    role: "Mặt nạ dùng chung cho nhóm FiMSummaryEvent Sum_01 (gồm Evt_02 và Evt_03).",
    mechanism: "Chỉ cần BẤT KỲ Event thành viên nào của Sum_01 thỏa mãn InhCfg2_Mask thì Sum_01 kích hoạt khóa FID_0 và bật Bit 3 (SUM_EVT_ACT).",
    scenarioImpact: "Là cơ chế trung tâm của kịch bản S8."
  },
  Evt03_UdsStatusHex: {
    title: "Evt_03 UDS Status Byte (BatteryOverVoltage)",
    ecucPath: "DemConfigSet / DemEventParameter[Evt_03] / UdsStatusByte",
    sws: "SWS_Dem_00006 · SWS_FiM_00063",
    range: "Hex Byte (0x00 .. 0xFF)",
    role: "Byte 8-bit UDS của Evt_03 (Quá áp ắc-quy), thành viên thứ hai trong nhóm Sum_01.",
    mechanism: "Dùng để chứng minh logic OR trong Summary Event: khi Evt_02 sạch (0x00) nhưng Evt_03 lỗi (0x2F), Sum_01 vẫn tiếp tục giữ khóa FID_0.",
    scenarioImpact: "Hoạt động trong kịch bản S8 khi bật SummaryEvent_Sum01_Enabled."
  },
  SummaryEvent_Sum01_Enabled: {
    title: "FiMSummaryEvent (Sum_01: PowerSupplySummary)",
    ecucPath: "FiMConfigSet / FiMSummaryEvent[0] / FiMInhSumRef",
    sws: "SWS_FiM_00063 · ECUC_FiM_00063",
    range: "boolean (true | false)",
    role: "Bật/tắt quy tắc gom nhóm nhiều DemEventId (Evt_02 & Evt_03) thành 1 đầu mối ức chế chung tới FID_0.",
    mechanism: "Giúp giảm kích thước bảng cấu hình FiM trong ROM/Flash khi nhiều mã lỗi nguồn đều gây cùng một tác động an toàn.",
    scenarioImpact: "Được kích hoạt mặc định trong kịch bản S8."
  },
  ComponentInhibition_Enabled: {
    title: "FiMInhComponentRef (DemComponent Graph Link)",
    ecucPath: "FiMConfigSet / FiMInhibitionConfiguration[3] / FiMInhComponentRef",
    sws: "SWS_FiM_00099 · ECUC_FiM_00102",
    range: "boolean (true | false)",
    role: "Bật/tắt liên kết ức chế dựa trên trạng thái hỏng của nút phần cứng DemComponent (Comp_01: RadarHwCluster).",
    mechanism: "Khác với Event mask, Component Inhibition chỉ kiểm tra cờ nhị phân ComponentFailedStatus == TRUE từ DEM mà không dùng mặt nạ bit UDS.",
    scenarioImpact: "Kích hoạt trong kịch bản S9 để bật/tắt Bit 4 (COMP_FAILED) trên Thanh B."
  },
  Comp01_FailedStatus: {
    title: "Comp_01 Failed Status (RadarHwCluster)",
    ecucPath: "DemConfigSet / DemComponent[Comp_01] / ComponentFailed",
    sws: "SWS_FiM_00099 · SWS_FiM_00100",
    range: "boolean (true = Failed | false = OK)",
    role: "Trạng thái hỏng hiện tại của khối phần cứng Comp_01 được đẩy qua FiM_DemTriggerOnComponentStatus().",
    mechanism: "Khi true (và bật ComponentInhibition_Enabled), FiM lập tức khóa cả FID_0 và FID_1.",
    scenarioImpact: "Điều khiển trực tiếp ở kịch bản S9 hoặc nút 'Comp_01 Fail' trên Quick Action Bar."
  },
  FiMMaxSummaryEvents: {
    title: "FiMMaxSummaryEvents",
    ecucPath: "FiMGeneral / FiMMaxSummaryEvents",
    sws: "SWS_FiM_00091 · ECUC_FiM_00091",
    range: "uint16 (1 .. 256, mặc định 16)",
    role: "Số lượng tối đa FiMSummaryEvent được phép khai báo khi biên dịch hoặc Post-Build.",
    mechanism: "Dùng để cấp phát kích thước tĩnh cho mảng SummaryEvent trong RAM/ROM và kiểm tra tính hợp lệ cấu hình.",
    scenarioImpact: "Sinh macro #define FIM_MAX_SUMMARY_EVENTS trong file FiM_Cfg.h."
  },
  FiMMaxEventsPerFidInhibitionConfiguration: {
    title: "FiMMaxEventsPerFidInhibitionConfiguration",
    ecucPath: "FiMGeneral / FiMMaxEventsPerFidInhibitionConfiguration",
    sws: "SWS_FiM_00092 · ECUC_FiM_00092",
    range: "uint16 (1 .. 256, mặc định 16)",
    role: "Giới hạn số lượng DemEventParameter tối đa có thể trỏ vào cùng một FiMInhibitionConfiguration.",
    mechanism: "Kiểm soát độ sâu bộ nhớ bảng ánh xạ Event -> FID tại thời điểm Generate code.",
    scenarioImpact: "Sinh macro #define FIM_MAX_EVENTS_PER_FID_INH_CFG trong file FiM_Cfg.h."
  },
  CascadingFaultSuppressionEnabled: {
    title: "Cascading / Secondary Fault Suppression",
    ecucPath: "App_SWC_DiagMonitor / FiM_PermissionGate",
    sws: "SWS_FiM_00011 · ISO 26262 Diagnostic Gate",
    range: "boolean (true | false)",
    role: "Chặn lỗi dây chuyền: kiểm tra FiM_GetFunctionPermission(FID_2) trước khi ghi nhận Evt_01 (Radar) xuống DEM.",
    mechanism: "Khi nguồn 5V (Evt_02) đang lỗi hoặc chưa test xong, FID_2 = FALSE. Nếu bật cờ này, SWC_DiagMonitor sẽ không báo lỗi giả Evt_01 vào DEM!",
    scenarioImpact: "Cốt lõi của kịch bản S10 — thử bật/tắt để thấy có lưu DTC giả Evt_01 hay không."
  },
  ConfigVariantType: {
    title: "FiM Configuration Variant",
    ecucPath: "FiM / ImplementationConfigVariant",
    sws: "SWS_FiM_00059 · SWS_FiM_00083",
    range: "POST_BUILD_LOADABLE | PRE_COMPILE",
    role: "Chọn kiểu cấu hình khi khởi tạo FiM_Init(ConfigPtr).",
    mechanism: "Với POST_BUILD_LOADABLE, truyền NULL_PTR vào FiM_Init() sẽ bị coi là lỗi cấu hình và báo DET FIM_E_INIT_FAILED (0x05); với PRE_COMPILE thì ConfigPtr được phép là NULL_PTR.",
    scenarioImpact: "Ảnh hưởng kiểm tra lỗi FIM_E_INIT_FAILED ở S12 và cấu trúc file xuất FiM_Lcfg.c."
  },
  FiMDataFixed: {
    title: "FiMDataFixed (ROM Calibration Lock)",
    ecucPath: "FiMGeneral / FiMDataFixed",
    sws: "SWS_FiM_00096 · ECUC_FiM_00096",
    range: "boolean (true | false)",
    role: "Cho phép hoặc khóa chỉnh sửa bảng ánh xạ Event-to-FID trong vùng Calibration (ROM).",
    mechanism: "Khi true, các cấu trúc ánh xạ nằm cố định trong const ROM để tiết kiệm RAM và tối ưu tốc độ truy xuất.",
    scenarioImpact: "Xuất macro #define FIM_DATA_FIXED trong file FiM_Cfg.h."
  },
  ObdIumprInhibitionSupport: {
    title: "OBD IUMPR Inhibition Support",
    ecucPath: "DemGeneral / DemIUMPRIntegration + FiM",
    sws: "SWS_Dem_00353 · SWS_FiM_00011",
    range: "boolean (true | false)",
    role: "Liên kết FiM để tạm khóa bộ đếm tỷ lệ hiệu năng giám sát OBD-II (IUMPR Numerator / Denominator).",
    mechanism: "Khi một FID giám sát khí thải bị khóa bởi FiM (VD: nhiệt độ môi trường hoặc lỗi cảm biến tiền đề), DEM ngừng tăng mẫu số IUMPR để đạt chuẩn OBD-II / Euro 6.",
    scenarioImpact: "Hiển thị nhãn trạng thái IUMPR LOCKED trên thẻ FID và khối DCM/OBD."
  },
  SimulateDetFaultType: {
    title: "Simulate DET Error Injection",
    ecucPath: "Debug / Det_ReportError(ModuleId = 11)",
    sws: "SWS_FiM_00076",
    range: "NONE | UNINIT | FID_OUT_OF_RANGE | EVENTID_OUT_OF_RANGE | PARAM_POINTER | INIT_FAILED",
    role: "Công cụ chèn nhanh một lời gọi API sai quy cách để quan sát phản ứng phòng vệ của FiM.",
    mechanism: "Kích hoạt Det_ReportError(11, 0, ApiId, ErrorId) ngay lập tức và trả về E_NOT_OK (cùng *Permission = FALSE để giữ an toàn).",
    scenarioImpact: "Dùng trực tiếp trong kịch bản S12 hoặc thử nghiệm bất kỳ lúc nào."
  }
};

const MODULES_INFO = {
  MOD_SWC_MON: {
    id: "MOD_SWC_MON",
    name: "SWC_DiagMonitor (Sensor & Pre-condition Monitor)",
    layer: "Application Layer",
    role: "Đọc tín hiệu vật lý (Radar, 5V Supply, Battery), hỏi quyền chạy bài test từ FiM để tránh lỗi dây chuyền và báo kết quả Event Status xuống DEM.",
    inputs: "Tín hiệu cảm biến từ IoHwAb/RTE và kết quả Permission của FID_2 (FID_RadarDiagMonitor) qua Rte_Call_FunctionInhibition_GetFunctionPermission().",
    processing: "Nếu bật cơ chế chống Cascading Faults, trước khi kết luận Radar hỏng (Evt_01), SWC hỏi FiM xem FID_2 có TRUE không. Nếu FID_2 = FALSE (do nguồn 5V lỗi hoặc chưa test xong), SWC chặn không gửi FAILED giả xuống DEM.",
    outputs: "Gọi xuống DEM qua RTE: Dem_SetEventStatus(EventId, PASSED/FAILED) và gọi hỏi FiM qua RTE: FiM_GetFunctionPermission(FID_2, &Permission).",
    apis: [
      "Std_ReturnType Rte_Call_FI_FID2_GetFunctionPermission(boolean* Permission)",
      "Std_ReturnType Rte_Call_DiagnosticMonitor_SetEventStatus(Dem_EventStatusType EventStatus)"
    ]
  },
  MOD_SWC_CTRL: {
    id: "MOD_SWC_CTRL",
    name: "SWC_Controller (ACC & AEB Feature Control)",
    layer: "Application Layer",
    role: "Thực thi các tính năng xe (Adaptive Cruise Control, Auto Emergency Braking) và chuyển đổi ngay sang chế độ Fail-Safe / Limp-Home khi FiM khóa quyền.",
    inputs: "Yêu cầu vận hành từ tài xế/ADCU và cờ boolean Permission nhận từ FiM qua cổng Client-Server FunctionInhibition trên RTE.",
    processing: "Hoàn toàn không phụ thuộc mã DTC phần cứng (Decoupling): chỉ cần kiểm tra if (Permission == TRUE) chạy Normal Mode; ngược lại lập tức ngắt điều khiển chủ động sang Fail-Safe theo ISO 26262.",
    outputs: "Gọi Rte_Call_UR_FID_x_GetFunctionPermission(&Permission) và điều khiển cơ cấu chấp hành (hoặc gọi SetFunctionAvailable nếu được phân quyền).",
    apis: [
      "Std_ReturnType Rte_Call_UR_FID0_GetFunctionPermission(boolean* Permission)",
      "Std_ReturnType Rte_Call_UR_FID0_SetFunctionAvailable(boolean Availability)"
    ]
  },
  MOD_RTE: {
    id: "MOD_RTE",
    name: "RTE & SchM (Runtime Environment & BSW Scheduler)",
    layer: "RTE / System Scheduler Layer",
    role: "Cầu nối ánh xạ cổng PortDefinedArgumentValue (FID) từ SWC xuống FiM, đồng thời cấp xung nhịp định kỳ FiM_MainFunction() và khóa vùng găng ExclusiveArea.",
    inputs: "Lời gọi Rte_Call từ SWC_DiagMonitor, SWC_Controller và Task định kỳ (20ms) từ AUTOSAR OS.",
    processing: "Chuyển Port của từng SWC thành đúng tham số FiM_FunctionIdType FID (0, 1, 2); kích hoạt FiM_MainFunction() theo FiMMainFunctionPeriod và bảo vệ mảng InhibitCounter[] bằng SchM_Enter/Exit_FiM.",
    outputs: "Gọi vào FiM: FiM_GetFunctionPermission(FID, &Perm), FiM_SetFunctionAvailable(FID, Avail), FiM_MainFunction().",
    apis: [
      "void FiM_MainFunction(void) [SWS_FiM_00060]",
      "void SchM_Enter_FiM_FIM_EXCLUSIVE_AREA_0(void)",
      "void SchM_Exit_FiM_FIM_EXCLUSIVE_AREA_0(void)"
    ]
  },
  MOD_FIM: {
    id: "MOD_FIM",
    name: "FiM Core Engine (Function Inhibition Manager)",
    layer: "System / Diagnostic Services (BSW)",
    role: "Nhạc trưởng tổng hợp trạng thái lỗi UDS & Component từ DEM qua 4 mặt nạ bitwise để cấp/khóa quyền thực thi FID trong thời gian O(1).",
    inputs: "FiM_DemTriggerOnEventStatus(), FiM_DemTriggerOnComponentStatus(), FiM_DemInit() từ DEM; kết quả Dem_GetEventUdsStatus() khi Polling; FiM_SetFunctionAvailable() và FiM_GetFunctionPermission().",
    processing: "1) Tính công thức bitwise (Status & Mask) == ExpectedPattern cho 4 mặt nạ; 2) Tổng hợp Many-to-Many qua Events, FiMSummaryEvent và DemComponent thành bộ đếm InhibitCounter[FID]; 3) Tính Permission = (Init && Avail && InhibitCounter==0 && !CompFailed).",
    outputs: "Trả *Permission (TRUE/FALSE) cho SWC/OBD, truy vấn Dem_GetEventUdsStatus() khi cần và báo lỗi Det_ReportError(ModuleId=11) khi sai tham số.",
    apis: [
      "void FiM_Init(const FiM_ConfigType* FiMConfigPtr) [SWS_FiM_00059]",
      "Std_ReturnType FiM_GetFunctionPermission(FiM_FunctionIdType FID, boolean* Permission) [SWS_FiM_00011]",
      "Std_ReturnType FiM_SetFunctionAvailable(FiM_FunctionIdType FID, boolean Availability) [SWS_FiM_00106]",
      "void FiM_DemTriggerOnEventStatus(Dem_EventIdType EventId, Dem_UdsStatusByteType Old, Dem_UdsStatusByteType New) [SWS_FiM_00021]",
      "void FiM_DemTriggerOnComponentStatus(Dem_ComponentIdType ComponentId, boolean ComponentFailedStatus) [SWS_FiM_00099]",
      "void FiM_DemInit(void) [SWS_FiM_00006]"
    ]
  },
  MOD_DEM: {
    id: "MOD_DEM",
    name: "DEM (Diagnostic Event Manager)",
    layer: "Diagnostic Services (BSW)",
    role: "Quản lý vòng đời mã lỗi DTC, byte trạng thái 8-bit UDS, lưu trữ NvM, đồ thị phụ thuộc DemComponent và đồng bộ đẩy sang FiM.",
    inputs: "Dem_SetEventStatus() từ SWC_DiagMonitor; Dem_SetOperationCycleState() từ BswM; Dem_ClearDTC() từ DCM (UDS 0x14).",
    processing: "Khi bất kỳ bit nào của byte UDS thay đổi (Old != New) và FiMEventUpdateTriggeredByDem=TRUE, DEM lập tức gọi FiM_DemTriggerOnEventStatus(). Sau Dem_Init() hoặc Dem_ClearDTC(), DEM gọi FiM_DemInit().",
    outputs: "Đẩy callback FiM_DemTriggerOnEventStatus(), FiM_DemTriggerOnComponentStatus(), FiM_DemInit() sang FiM; cung cấp Dem_GetEventUdsStatus() & Dem_GetComponentFailed().",
    apis: [
      "Std_ReturnType Dem_GetEventUdsStatus(Dem_EventIdType EventId, Dem_UdsStatusByteType* UDSStatusByte)",
      "Std_ReturnType Dem_GetComponentFailed(Dem_ComponentIdType ComponentId, boolean* ComponentFailed)",
      "Std_ReturnType Dem_ClearDTC(uint8 ClientId)"
    ]
  },
  MOD_ECUM: {
    id: "MOD_ECUM",
    name: "EcuM & BswM (ECU State & Mode Manager)",
    layer: "System Services (BSW)",
    role: "Điều phối trình tự khởi động ECU (FiM_Init -> Dem_Init -> FiM_DemInit), quản lý chu kỳ Ignition Cycle và khóa/mở FID theo chế độ xe.",
    inputs: "Pha khởi tạo Startup Two, tín hiệu khóa điện KL15 (IG ON/OFF), biến thể xe (Variant Coding) và chế độ Transport/Factory Mode.",
    processing: "Gọi FiM_Init(&FiM_Config) trước khi OS/DEM sẵn sàng, kích hoạt Dem_SetOperationCycleState(START) đặt TNCTOC=1, và gọi FiM_SetFunctionAvailable() khi cần vô hiệu hóa tính năng không lắp đặt.",
    outputs: "Gọi FiM_Init(), FiM_SetFunctionAvailable() vào FiM và Dem_SetOperationCycleState() xuống DEM.",
    apis: [
      "void FiM_Init(const FiM_ConfigType* FiMConfigPtr)",
      "Std_ReturnType Dem_SetOperationCycleState(uint8 OperationCycleId, Dem_OperationCycleStateType CycleState)",
      "Std_ReturnType FiM_SetFunctionAvailable(FiM_FunctionIdType FID, boolean Availability)"
    ]
  },
  MOD_DCM: {
    id: "MOD_DCM",
    name: "DCM & OBD-II (UDS 0x14 & IUMPR Integration)",
    layer: "Diagnostic Communication Services",
    role: "Xử lý lệnh xóa lỗi UDS 0x14 ClearDiagnosticInformation và đồng bộ trạng thái ức chế bộ đếm IUMPR (OBD-II Service $09) qua FiM.",
    inputs: "Khung yêu cầu chẩn đoán UDS 0x14 từ Tester và trạng thái Permission của các FID giám sát OBD từ FiM.",
    processing: "Lệnh 0x14 gọi Dem_ClearDTC() đưa mọi Event về 0x50 (TF=0, TNCTOC=1) rồi DEM gọi FiM_DemInit() — làm mở khóa FIM_LAST_FAILED nhưng đồng thời khóa lại FIM_NOT_TESTED! Với OBD, DEM/OBD hỏi FiM để khóa IUMPR Denominator khi FID bị ức chế.",
    outputs: "Kích hoạt Dem_ClearDTC() -> FiM_DemInit() và đọc trạng thái FiM_GetFunctionPermission() cho IUMPR.",
    apis: [
      "Std_ReturnType Dem_ClearDTC(uint8 ClientId)",
      "Std_ReturnType FiM_GetFunctionPermission(FiM_FunctionIdType FID, boolean* Permission)"
    ]
  },
  MOD_DET: {
    id: "MOD_DET",
    name: "DET (Default Error Tracer — ModuleId = 11)",
    layer: "System Services (BSW)",
    role: "Ghi vết các lỗi phát triển (Development Errors) khi API của FiM bị gọi sai ngữ cảnh khởi tạo hoặc truyền tham số vượt biên.",
    inputs: "Nhận báo cáo Det_ReportError(ModuleId=11, InstanceId=0, ApiId, ErrorId) từ FiM khi FiMDevErrorDetect == TRUE.",
    processing: "Phân loại 5 mã lỗi chuẩn SWS_FiM_00076: FIM_E_UNINIT (0x01), FIM_E_FID_OUT_OF_RANGE (0x02), FIM_E_EVENTID_OUT_OF_RANGE (0x03), FIM_E_PARAM_POINTER (0x04), FIM_E_INIT_FAILED (0x05).",
    outputs: "Lưu lịch sử lỗi vào Inspector & API Trace để kỹ sư debug ngay tại Runtime.",
    apis: [
      "Std_ReturnType Det_ReportError(uint16 ModuleId, uint8 InstanceId, uint8 ApiId, uint8 ErrorId)"
    ]
  }
};

const ABBREVIATIONS_DATA = [
  // CORE (10)
  { abbr: "FiM", full: "Function Inhibition Manager", vi: "Bộ quản lý ức chế chức năng", cat: "CORE", sws: "SWS_FiM_00001", desc: "Module BSW tầng Diagnostic Services quyết định cấp hay khóa quyền thực thi (FID) cho SWC dựa trên trạng thái lỗi từ DEM." },
  { abbr: "FID", full: "Function Identifier (FiM_FunctionIdType)", vi: "Mã định danh chức năng", cat: "CORE", sws: "SWS_FiM_00043", desc: "ID duy nhất đại diện cho một chức năng ứng dụng (ACC, AEB) hoặc một bài chẩn đoán được FiM kiểm soát." },
  { abbr: "Permission", full: "Function Permission (TRUE / FALSE)", vi: "Quyền cho phép thực thi", cat: "CORE", sws: "SWS_FiM_00011", desc: "Giá trị boolean trả về qua FiM_GetFunctionPermission(): TRUE = được chạy bình thường; FALSE = bị khóa / chuyển Fail-Safe." },
  { abbr: "Availability", full: "Dynamic Function Availability", vi: "Tính khả dụng động của FID", cat: "CORE", sws: "SWS_FiM_00105", desc: "Cờ cho phép bật/tắt tĩnh hoặc động một FID (VD: Variant Coding, Transport Mode) bằng FiM_SetFunctionAvailable()." },
  { abbr: "FiMAvailabilitySupport", full: "FiM Availability Feature Switch", vi: "Công tắc bật tính năng Availability", cat: "CORE", sws: "ECUC_FiM_00097", desc: "Tham số pre-compile bật/tắt hỗ trợ API FiM_SetFunctionAvailable()." },
  { abbr: "InhibitCounter[FID]", full: "Active Inhibition Reference Counter", vi: "Bộ đếm số quy tắc đang khóa FID", cat: "CORE", sws: "SWS_FiM_00012", desc: "Mỗi FID đếm số lượng Event/Summary/Component đang khớp điều kiện khóa; Permission = TRUE chỉ khi InhibitCounter == 0." },
  { abbr: "FiMInhibitionConfiguration", full: "FiM Inhibition Mapping Container", vi: "Cấu hình ánh xạ ức chế Đa-Đa", cat: "CORE", sws: "ECUC_FiM_00088", desc: "Container ECUC kết nối danh sách Event/Summary/Component với Mặt nạ ức chế và danh sách FID đích." },
  { abbr: "FiM_Init()", full: "FiM Module Initialization API", vi: "Hàm khởi tạo tĩnh FiM", cat: "CORE", sws: "SWS_FiM_00059", desc: "Hàm được EcuM gọi để nạp bảng cấu hình tĩnh FiM trước khi DEM đồng bộ trạng thái lỗi." },
  { abbr: "FiM_DemInit()", full: "FiM DEM Synchronization Init API", vi: "Hàm đồng bộ FiM sau Dem_Init/ClearDTC", cat: "CORE", sws: "SWS_FiM_00006", desc: "Được DEM gọi ngay sau Dem_Init() hoặc Dem_ClearDTC() để FiM quét toàn bộ Event/Component và mở khóa trạng thái Ready." },
  { abbr: "FiMDataFixed", full: "FiM Fixed Calibration Data Flag", vi: "Khóa cố định dữ liệu cấu hình", cat: "CORE", sws: "ECUC_FiM_00096", desc: "Cố định bảng ánh xạ Event-FID trong ROM/Flash không cho phép chỉnh sửa Calibration khi runtime." },

  // MASK & BITS (12)
  { abbr: "FiMInhInhibitionMask", full: "FiM Inhibition Mask Enum", vi: "Mặt nạ điều kiện ức chế", cat: "MASK", sws: "SWS_FiM_00012", desc: "Tham số chọn 1 trong 4 mặt nạ bitwise áp dụng lên UDS Status Byte của DEM." },
  { abbr: "FIM_LAST_FAILED", full: "(Status & 0x01) == 0x01", vi: "Mặt nạ lỗi gần nhất (TF == 1)", cat: "MASK", sws: "SWS_FiM_00012", desc: "Khớp khi Bit 0 testFailed == 1. Phản ứng khóa tức thì ngay khi cảm biến vừa báo lỗi." },
  { abbr: "FIM_NOT_TESTED", full: "(Status & 0x40) == 0x40", vi: "Mặt nạ chưa test chu kỳ này (TNCTOC == 1)", cat: "MASK", sws: "SWS_FiM_00012", desc: "Khớp khi Bit 6 TNCTOC == 1. Khóa chức năng lúc mới bật IG ON hoặc sau ClearDTC cho đến khi test xong." },
  { abbr: "FIM_TESTED", full: "(Status & 0x40) == 0x00", vi: "Mặt nạ đã test xong chu kỳ này (TNCTOC == 0)", cat: "MASK", sws: "SWS_FiM_00012", desc: "Khớp khi Bit 6 TNCTOC == 0. Dùng để khóa bài test xâm lấn sau khi đã chạy 1 lần trong chuyến đi (Once-Per-Trip)." },
  { abbr: "FIM_TESTED_AND_FAILED", full: "(Status & 0x41) == 0x01", vi: "Mặt nạ đã test xong VÀ bị lỗi", cat: "MASK", sws: "SWS_FiM_00012", desc: "Khớp khi Bit 0 TF == 1 VÀ Bit 6 TNCTOC == 0. Tránh khóa nhầm vì cờ TF cũ chưa test lại đầu chu kỳ (0x6D)." },
  { abbr: "UDS Status Byte", full: "Dem_UdsStatusByteType (ISO 14229-1)", vi: "Byte 8-bit trạng thái DTC", cat: "MASK", sws: "SWS_Dem_00006", desc: "Byte 8-bit lưu trữ lịch sử lỗi của một Event trong DEM; FiM đọc trực tiếp Bit 0 (TF) và Bit 6 (TNCTOC)." },
  { abbr: "TF (Bit 0)", full: "testFailed (0x01)", vi: "Cờ báo lỗi ở lần test gần nhất", cat: "MASK", sws: "SWS_Dem_00386", desc: "Bit 0 trong byte UDS: lên 1 khi FAILED, về 0 khi PASSED hoặc sau Dem_ClearDTC()." },
  { abbr: "TFTOC (Bit 1)", full: "testFailedThisOperationCycle (0x02)", vi: "Cờ đã từng lỗi trong chu kỳ này", cat: "MASK", sws: "SWS_Dem_00389", desc: "Bit 1 được chốt giữ 1 suốt Operation Cycle ngay cả khi cảm biến tự hồi phục PASSED sau đó." },
  { abbr: "PDTC / CDTC", full: "pendingDTC (Bit 2) / confirmedDTC (Bit 3)", vi: "Lỗi chờ xác nhận / Lỗi đã xác nhận", cat: "MASK", sws: "SWS_Dem_00391", desc: "Bit 2 (0x04) & Bit 3 (0x08) phản ánh trạng thái chốt lưu DTC bền vững vào bộ nhớ NvM." },
  { abbr: "TNCSLC / TFSLC", full: "Bit 4 (0x10) / Bit 5 (0x20) SinceLastClear", vi: "Chưa test / Đã lỗi kể từ lần ClearDTC", cat: "MASK", sws: "SWS_Dem_00393", desc: "Theo dõi lịch sử dài hạn của Event kể từ lần xóa lỗi UDS 0x14 gần nhất." },
  { abbr: "TNCTOC (Bit 6)", full: "testNotCompletedThisOperationCycle (0x40)", vi: "Cờ chưa hoàn tất test trong chu kỳ này", cat: "MASK", sws: "SWS_Dem_00394", desc: "Bit 6 trong byte UDS: đặt về 1 khi bắt đầu Operation Cycle mới hoặc ClearDTC; hạ về 0 ngay khi test xong." },
  { abbr: "WIR (Bit 7)", full: "warningIndicatorRequested (0x80)", vi: "Cờ yêu cầu bật đèn cảnh báo (MIL)", cat: "MASK", sws: "SWS_Dem_00395", desc: "Bit 7 yêu cầu bật đèn báo lỗi động cơ/hệ thống trên cụm đồng hồ táp-lô." },

  // DEM & COMPONENT (10)
  { abbr: "DEM", full: "Diagnostic Event Manager", vi: "Trình quản lý sự kiện chẩn đoán", cat: "DEM", sws: "SWS_Dem_00001", desc: "Module BSW lưu trữ lỗi Event, thực hiện Debouncing, quản lý NvM và phát các thông báo thay đổi trạng thái sang FiM." },
  { abbr: "EventId", full: "Dem_EventIdType", vi: "Mã định danh sự kiện lỗi", cat: "DEM", sws: "SWS_Dem_00016", desc: "ID duy nhất đại diện cho một phép kiểm tra chẩn đoán cụ thể (VD: Evt_01 RadarSignalErr)." },
  { abbr: "FiMSummaryEvent", full: "FiM Summary Event Group", vi: "Nhóm gộp nhiều Event vào 1 cấu hình ức chế", cat: "DEM", sws: "SWS_FiM_00063", desc: "Nhóm gộp nhiều DemEventId (VD: Sum_01 gồm lỗi 5V & Quá áp) để áp chung mặt nạ lên các FID nhằm tiết kiệm ROM." },
  { abbr: "DemComponent", full: "DEM Hardware Component Dependency Node", vi: "Nút đồ thị phụ thuộc phần cứng trong DEM", cat: "DEM", sws: "SWS_FiM_00099", desc: "Đại diện cho cụm phần cứng vật lý có quan hệ cha-con trong DEM; khi nút cha hỏng, DEM kéo ComponentFailed của con sang TRUE." },
  { abbr: "FiM_DemTriggerOnEventStatus", full: "DEM Push Event Callback to FiM", vi: "Hàm DEM đẩy trạng thái Event sang FiM", cat: "DEM", sws: "SWS_FiM_00021", desc: "Được DEM gọi tức thì khi StatusOld != StatusNew (nếu FiMEventUpdateTriggeredByDem == TRUE)." },
  { abbr: "FiM_DemTriggerOnComponentStatus", full: "DEM Push Component Status to FiM", vi: "Hàm DEM báo trạng thái Component hỏng", cat: "DEM", sws: "SWS_FiM_00099", desc: "DEM gọi sang FiM mỗi khi trạng thái ComponentFailedStatus (TRUE/FALSE) của một DemComponent thay đổi." },
  { abbr: "Push Mode", full: "Event-Driven Update (TriggeredByDem=TRUE)", vi: "Chế độ cập nhật tức thời từ DEM", cat: "DEM", sws: "ECUC_FiM_00086", desc: "Độ trễ cập nhật Permission = 0ms nhờ DEM gọi trực tiếp callback ngay khi phát hiện đổi bit trạng thái." },
  { abbr: "Polling Mode", full: "Cyclic Polling via FiM_MainFunction", vi: "Chế độ quét chu kỳ định kỳ", cat: "DEM", sws: "SWS_FiM_00060", desc: "Khi FiMEventUpdateTriggeredByDem = FALSE, FiM tự gọi Dem_GetEventUdsStatus() định kỳ mỗi FiMMainFunctionPeriod." },
  { abbr: "MaxHandledFidLinks", full: "FiMMaxHandledFidEventLinksPerSchedulableStep", vi: "Giới hạn số liên kết xử lý mỗi tick", cat: "DEM", sws: "ECUC_FiM_00098", desc: "Cơ chế phân tải CPU trong FiM_MainFunction() cho các ECU có số lượng liên kết Event-FID cực lớn." },
  { abbr: "Dem_GetEventUdsStatus", full: "DEM Query UDS Status Byte API", vi: "Hàm đọc byte UDS từ DEM", cat: "DEM", sws: "SWS_FiM_00065", desc: "Được FiM gọi trong FiM_DemInit() hoặc FiM_MainFunction() (khi chạy Polling Mode) để lấy byte trạng thái mới nhất." },

  // SAFETY & OBD (8)
  { abbr: "Cascading Fault", full: "Cascading / Secondary Fault Suppression", vi: "Chặn lỗi dây chuyền / DTC giả", cat: "SAFETY", sws: "SWS_FiM_00011", desc: "Cơ chế dùng FiM khóa các bài giám sát hạ lưu (FID_2) khi nguồn/cảm biến gốc bị hỏng để không lưu hàng loạt DTC giả." },
  { abbr: "Root Cause Fault", full: "Primary / Root Cause Diagnostic Event", vi: "Lỗi nguyên nhân gốc rễ", cat: "SAFETY", sws: "ISO 26262", desc: "Sự cố ban đầu (VD: đứt nguồn 5V Sensor Supply) gây ra sự mất tín hiệu ở các cảm biến dùng chung đường nguồn." },
  { abbr: "Fail-Safe / Limp-Home", full: "Degraded Operating Mode", vi: "Chế độ suy giảm an toàn", cat: "SAFETY", sws: "ISO 26262", desc: "Trạng thái an toàn mà SWC_Controller phải chuyển vào ngay lập tức khi FiM_GetFunctionPermission() trả về FALSE." },
  { abbr: "Decoupling", full: "Fault-to-Function Decoupling Architecture", vi: "Kiến trúc tách rời lỗi khỏi ứng dụng", cat: "SAFETY", sws: "SWS_FiM_00001", desc: "SWC điều khiển chỉ biết FID, không biết chi tiết mã lỗi hay cảm biến nào bên dưới; giúp tái sử dụng SWC qua nhiều dòng xe." },
  { abbr: "ISO 26262", full: "Road Vehicles — Functional Safety", vi: "Tiêu chuẩn an toàn chức năng ô tô", cat: "SAFETY", sws: "ASIL A..D", desc: "Tiêu chuẩn yêu cầu phát hiện lỗi phần cứng/phần mềm và đưa hệ thống về trạng thái an toàn kịp thời thông qua FiM." },
  { abbr: "OBD-II / Euro 6", full: "On-Board Diagnostics Regulation", vi: "Chuẩn chẩn đoán khí thải bắt buộc", cat: "SAFETY", sws: "SWS_Dem_00353", desc: "Quy định giám sát khí thải sử dụng FiM để ức chế các monitor phụ thuộc hoặc khóa tỷ lệ IUMPR." },
  { abbr: "IUMPR", full: "In-Use Monitor Performance Ratio", vi: "Tỷ lệ hiệu năng giám sát thực tế (OBD $09)", cat: "SAFETY", sws: "SWS_Dem_00353", desc: "Tỷ lệ Numerator/Denominator đo tần suất chạy các bài test OBD; FiM tạm dừng tăng bộ đếm khi điều kiện bị khóa." },
  { abbr: "Once-Per-Trip", full: "Once-Per-Driving-Cycle Monitor", vi: "Bài kiểm tra chỉ chạy 1 lần mỗi chuyến đi", cat: "SAFETY", sws: "FIM_TESTED", desc: "Mẫu thiết kế sử dụng mặt nạ FIM_TESTED để khóa FID ngay sau lần chạy đầu tiên trong Operation Cycle." },

  // STACK & DET (8)
  { abbr: "SW-C", full: "AUTOSAR Application Software Component", vi: "Thành phần phần mềm ứng dụng", cat: "STACK", sws: "SWS_Rte", desc: "Gồm SWC_DiagMonitor (báo lỗi) và SWC_Controller (chạy chức năng xe), giao tiếp với FiM qua cổng RTE." },
  { abbr: "RTE", full: "Runtime Environment", vi: "Môi trường thực thi kết nối SWC-BSW", cat: "STACK", sws: "SWS_Rte", desc: "Ánh xạ Client-Server Port FunctionInhibition cùng PortDefinedArgumentValue (FID) vào FiM_GetFunctionPermission()." },
  { abbr: "SchM", full: "Basic Software Mode Manager Scheduler", vi: "Bộ lập lịch tác vụ BSW", cat: "STACK", sws: "SWS_SchM", desc: "Gọi định kỳ FiM_MainFunction() và cấp khóa ExclusiveArea bảo vệ bộ đếm InhibitCounter[] khỏi Race Condition." },
  { abbr: "EcuM / BswM", full: "ECU State Manager / BSW Mode Manager", vi: "Quản lý trạng thái ECU & Chế độ BSW", cat: "STACK", sws: "SWS_EcuM", desc: "Điều phối FiM_Init(), mở Operation Cycle trên DEM và gọi FiM_SetFunctionAvailable() theo chế độ xe." },
  { abbr: "DCM (UDS 0x14)", full: "Diagnostic Communication Manager", vi: "Quản lý giao tiếp chẩn đoán UDS", cat: "STACK", sws: "SWS_Dcm", desc: "Xử lý lệnh xóa lỗi 0x14 gọi Dem_ClearDTC(), kích hoạt FiM_DemInit() làm mới toàn bộ bảng mặt nạ FiM." },
  { abbr: "NvM", full: "Non-Volatile Memory Manager", vi: "Quản lý bộ nhớ không bay hơi Flash/EEPROM", cat: "STACK", sws: "SWS_NvM", desc: "Khôi phục byte trạng thái UDS cho DEM lúc bật nguồn (NvM_ReadAll) trước khi DEM gọi FiM_DemInit()." },
  { abbr: "DET (Module 11)", full: "Default Error Tracer (FIM_MODULE_ID = 11)", vi: "Bộ ghi vết lỗi phát triển", cat: "STACK", sws: "SWS_FiM_00076", desc: "Nhận Det_ReportError() cho 5 mã lỗi: FIM_E_UNINIT (0x01), FID_OUT_OF_RANGE (0x02), EVENTID_OUT_OF_RANGE (0x03), PARAM_POINTER (0x04), INIT_FAILED (0x05)." },
  { abbr: "O(1) Lookup", full: "Constant-Time Permission Query", vi: "Truy vấn quyền thời gian hằng số O(1)", cat: "STACK", sws: "SWS_FiM_00011", desc: "Nhờ tính trước InhibitCounter[FID] khi status đổi, FiM_GetFunctionPermission() chỉ đọc trực tiếp biến RAM cực nhanh." }
];
