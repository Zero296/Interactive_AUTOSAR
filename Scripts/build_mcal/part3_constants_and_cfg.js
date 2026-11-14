// ================= PART 3: CONSTANTS, 8-BIT REGISTERS, 48 CONFIG TOOLTIPS, MODULE METADATA & 68 ABBREVIATIONS =================

const MCAL_HW_STATUS_BITS = [
  { bit: 7, mask: 0x80, tag: "PLL_LOCK", name: "PLL_LOCK_OK",  tone: "",     desc: "Thanh ghi khóa pha PLL_SR[LOCK] (SWS_Mcu_00008): =1 khi PLL khóa ổn định ở fCPU (160 MHz), cho phép Mcu_DistributePllClock()." },
  { bit: 6, mask: 0x40, tag: "DIO_LVL",  name: "PIN_DIO_LVL",  tone: "cyan", desc: "Mức logic vật lý trên chân GPIO_PDIR/PDOR (PA1 WarnLed — SWS_Dio_00011): 1 = STD_HIGH (3.3V/5V), 0 = STD_LOW (0V)." },
  { bit: 5, mask: 0x20, tag: "ADC_EOC",  name: "ADC_CONV_OK",  tone: "cyan", desc: "Cờ hoàn tất chuyển đổi SAR ADC 12-bit (ADC_ISR[EOC] — SWS_Adc_00060): =1 khi mẫu nằm sẵn trong Result Buffer." },
  { bit: 4, mask: 0x10, tag: "PWM_ACT",  name: "PWM_OUT_ACT",  tone: "warn", desc: "Cờ bộ đếm FTM/eMIOS đang phát xung PWM (Duty > 0x0000 — SWS_Pwm_00013): =0 khi Pwm_SetOutputToIdle() hoặc Duty=0." },
  { bit: 3, mask: 0x08, tag: "SPI_BSY",  name: "SPI_SHF_BSY",  tone: "pur",  desc: "Cờ thanh ghi dịch QSPI_SR[BUSY] đang kéo chân CS=LOW dịch bit MOSI/MISO (SWS_Spi_00177)." },
  { bit: 2, mask: 0x04, tag: "CAN_OK",   name: "CAN_TXRX_OK",  tone: "",     desc: "Bộ điều khiển FlexCAN/M_CAN đã STARTED & ErrorState=ACTIVE (SWS_Can_00272). Hạ =0 khi STOPPED/SLEEP hoặc BUS-OFF!" },
  { bit: 1, mask: 0x02, tag: "FLS_BSY",  name: "FLS_HV_BUSY",  tone: "warn", desc: "Bơm điện áp cao Flash FLASH_MCR[BUSY] đang xóa Sector (0xFF) hoặc ghi Page (SWS_Fls_00220)." },
  { bit: 0, mask: 0x01, tag: "HW_IRQ",   name: "HW_IRQ_PEND",  tone: "pur",  desc: "Cờ ngắt phần cứng (ISR Cat 2: ADC_EOC / PWM_EDGE / SPI_QEND / CAN_RXTX / FLS_DONE) đang kích hoạt callback tầng trên." }
];

const MCAL_DRV_ENGINE_BITS = [
  { bit: 7, mask: 0x80, tag: "DRV_INIT", name: "MCAL_DRV_INIT", tone: "",     desc: "Driver MCAL đang chọn đã gọi *_Init() thành công. Nếu =0, mọi lời gọi API sẽ báo DET *_E_UNINIT." },
  { bit: 6, mask: 0x40, tag: "JOB_PEND", name: "JOB_SEQ_PEND",  tone: "warn", desc: "Tác vụ bất đồng bộ đang xử lý: ADC_BUSY, SPI_SEQ_PENDING, MEMIF_JOB_PENDING hoặc CanTx Mailbox đang chờ." },
  { bit: 5, mask: 0x20, tag: "ASYNC_EN", name: "ASYNC_IRQ_MODE",tone: "cyan", desc: "=1: Chế độ ngắt bất đồng bộ (SPI_INTERRUPT_MODE / CAN INTERRUPT); =0: Polling qua MainFunction." },
  { bit: 4, mask: 0x10, tag: "NOTIF_EN", name: "NOTIF_CBK_EN",  tone: "cyan", desc: "=1 khi đã bật Callback lên tầng trên (Adc_EnableGroupNotification / Pwm_EnableNotification / Fee/Spi JobEnd)." },
  { bit: 3, mask: 0x08, tag: "BUF_RDY",  name: "BUFF_LOCK_RDY", tone: "",     desc: "=1 khi đã cấp bộ đệm hợp lệ (Adc_SetupResultBuffer, Spi_WriteIB/SetupEB, Fls Buffer)." },
  { bit: 2, mask: 0x04, tag: "WKUP_DET", name: "WAKEUP_EVENT",  tone: "pur",  desc: "=1 khi phát hiện xung đánh thức phần cứng từ bus CAN lúc CAN_CS_SLEEP (Can_CheckWakeup -> EcuM)." },
  { bit: 1, mask: 0x02, tag: "DEM_FLT",  name: "DEM_HW_FAULT",  tone: "err",  desc: "=1 khi lỗi phần cứng silicon xảy ra & MCAL gọi Dem_SetEventStatus(FAILED) (MCU ClockLoss, SPI HW Err, FLS Verify Fail)." },
  { bit: 0, mask: 0x01, tag: "DET_ERR",  name: "DET_ERR_TRAP",  tone: "err",  desc: "=1 khi bất kỳ hàm MCAL nào phát hiện tham số/trạng thái sai & gọi Det_ReportError()." }
];

const configTooltipData = {
  // ---------------- TAB 0: MCU (6) ----------------
  McuDriverInitialized: {
    title: "McuDriverInitialized (Mcu_Init State)",
    ecucPath: "EcuM_AL_DriverInitOne -> Mcu_Init(&Mcu_Config)",
    sws: "SWS_Mcu_00026 · SWS_Mcu_00125",
    range: "Boolean (TRUE = Initialized | FALSE = UNINIT)",
    role: "Xác định driver Mcu đã được khởi tạo qua Mcu_Init() hay chưa.",
    mechanism: "Nếu tắt FALSE, mọi lời gọi Mcu_InitClock / Mcu_GetPllStatus / Mcu_SetMode sẽ kích hoạt Det_ReportError(Module=101, MCU_E_UNINIT=0x0F).",
    scenarioImpact: "Dùng trong S16 hoặc What-If để kiểm thử cơ chế bảo vệ khi gọi API trước Mcu_Init()."
  },
  McuDevErrorDetect: {
    title: "McuDevErrorDetect (All MCAL DET Switch)",
    ecucPath: "McuGeneralConfiguration / McuDevErrorDetect",
    sws: "SWS_Mcu_00166 · ECUC_Mcu_00166",
    range: "Boolean (true | false)",
    role: "Bật/tắt phát hiện lỗi phát triển (Development Error Detection) và báo cáo lên Det_ReportError().",
    mechanism: "Kiểm tra lỗi *_E_UNINIT, *_E_PARAM_*, *_E_PLL_NOT_LOCKED trước khi ghi xuống thanh ghi phần cứng.",
    scenarioImpact: "Khi bật TRUE, mọi vi phạm trình tự hoặc tham số sai sẽ ghi trace lỗi đỏ và bật Bit 0 (DET_ERR_TRAP)."
  },
  McuNoPll: {
    title: "McuNoPll (No PLL Hardware Mode)",
    ecucPath: "McuGeneralConfiguration / McuNoPll",
    sws: "SWS_Mcu_00180 · SWS_Mcu_00206 · ECUC_Mcu_00180",
    range: "Boolean (false = Có PLL | true = Không dùng PLL)",
    role: "Cho biết phần cứng hoặc cấu hình hiện tại có bỏ qua mạch nhân tần PLL hay không.",
    mechanism: "Nếu TRUE, hàm Mcu_DistributePllClock() bị vô hiệu hóa và Mcu_GetPllStatus() luôn trả về MCU_PLL_STATUS_UNDEFINED.",
    scenarioImpact: "Bật ở S1 What-If để quan sát cách Mcu chạy trực tiếp xung thạch anh fOSC=16MHz mà không qua PLL."
  },
  McuPerformResetApi: {
    title: "McuPerformResetApi",
    ecucPath: "McuGeneralConfiguration / McuPerformResetApi",
    sws: "SWS_Mcu_00143 · SWS_Mcu_00145 · ECUC_Mcu_00167",
    range: "Boolean (true | false)",
    role: "Bật/tắt việc biên dịch và cho phép sử dụng hàm Mcu_PerformReset() kích hoạt Software Reset.",
    mechanism: "Nếu TRUE, EcuM có thể yêu cầu reset mềm vi điều khiển (phục vụ UDS 0x11 nhảy vào Bootloader).",
    scenarioImpact: "Tắt FALSE ở S2 What-If để xem Mcu_PerformReset() bị vô hiệu hóa."
  },
  McuClockReferencePointFrequencyMhz: {
    title: "McuClockReferencePointFrequency (PLL Target fCPU)",
    ecucPath: "McuModuleConfiguration / McuClockSettingConfig / McuClockReferencePoint",
    sws: "SWS_Mcu_00137 · ECUC_Mcu_00175",
    range: "40 .. 320 MHz (Typical: 160 MHz từ fOSC = 16 MHz)",
    role: "Tần số xung nhịp đích của lõi CPU sau khi mạch vòng khóa pha PLL khóa thành công.",
    mechanism: "Từ fCPU, các bộ chia Prescaler tạo ra fBUS = fCPU/2 (Port/Dio/Spi), fCAN = fCPU/2, và fADC = fCPU/4.",
    scenarioImpact: "Thay đổi tần số này làm cập nhật trực tiếp toàn bộ cây xung nhịp trên bảng Adaptive Hardware của Mcu."
  },
  McuPowerModeSetting: {
    title: "McuPowerModeSetting (Mcu_SetMode Target)",
    ecucPath: "McuModuleConfiguration / McuModeSettingConf / McuMode",
    sws: "SWS_Mcu_00147 · ECUC_Mcu_00176",
    range: "MCU_MODE_RUN | MCU_MODE_HALT | MCU_MODE_STOP",
    role: "Chế độ tiêu thụ năng lượng mục tiêu truyền vào API Mcu_SetMode(McuMode).",
    mechanism: "MCU_MODE_HALT ngắt xung CPU nhưng giữ PLL/ngoại vi thức; MCU_MODE_STOP tắt cả PLL (PLL_LOCK_OK=0) để tiết kiệm điện tối đa.",
    scenarioImpact: "Thử chọn MCU_MODE_STOP ở S2 để thấy Bit 7 PLL_LOCK_OK hạ về 0 và fCPU giảm về Standby."
  },

  // ---------------- TAB 1: PORT (6) ----------------
  PortDriverInitialized: {
    title: "PortDriverInitialized (Port_Init State)",
    ecucPath: "EcuM_AL_DriverInitOne -> Port_Init(&Port_Config)",
    sws: "SWS_Port_00041 · SWS_Port_00140",
    range: "Boolean (TRUE = PORT_INITIALIZED | FALSE = UNINIT)",
    role: "Xác định driver Port đã khởi tạo tất cả thanh ghi PCR (Pin Control Register) của chip hay chưa.",
    mechanism: "Nếu FALSE, các API Port_SetPinDirection / SetPinMode / RefreshPortDirection báo lỗi DET PORT_E_UNINIT (0x0F).",
    scenarioImpact: "Tắt để kiểm tra bẫy lỗi DET của module Port trong S16."
  },
  PortPinDirectionChangeable: {
    title: "PortPinDirectionChangeable (Runtime Direction)",
    ecucPath: "PortConfigSet / PortContainer / PortPin / PortPinDirectionChangeable",
    sws: "SWS_Port_00063 · ECUC_Port_00126",
    range: "Boolean (true | false)",
    role: "Quyết định chân Pin PA0 có được phép đổi hướng IN <-> OUT lúc runtime qua Port_SetPinDirection() hay không.",
    mechanism: "Nếu FALSE, gọi Port_SetPinDirection() bị chặn và báo PORT_E_DIRECTION_UNCHANGEABLE (0x0B). Ngoài ra Port_RefreshPortDirection() chỉ làm tươi các chân FALSE.",
    scenarioImpact: "Tắt FALSE ở S3 What-If để thấy lỗi PORT_E_DIRECTION_UNCHANGEABLE."
  },
  PortPinModeChangeable: {
    title: "PortPinModeChangeable (Runtime Pin Mux)",
    ecucPath: "PortConfigSet / PortContainer / PortPin / PortPinModeChangeable",
    sws: "SWS_Port_00125 · ECUC_Port_00134",
    range: "Boolean (true | false)",
    role: "Cho phép thay đổi chức năng Multiplexer của chân Pin (ALT0 DIO <-> ALT2 PWM...) khi hệ thống đang chạy.",
    mechanism: "Nếu FALSE, gọi Port_SetPinMode(Pin, Mode) lập tức báo lỗi DET PORT_E_MODE_UNCHANGEABLE (0x0E).",
    scenarioImpact: "Tắt FALSE ở S3 What-If để quan sát cơ chế khóa an toàn chức năng chân Pin."
  },
  PortPinDirection: {
    title: "PortPinDirection (PA0 Initial Direction)",
    ecucPath: "PortConfigSet / PortContainer / PortPin / PortPinDirection",
    sws: "SWS_Port_00046 · ECUC_Port_00125",
    range: "PORT_PIN_IN | PORT_PIN_OUT",
    role: "Hướng tín hiệu mặc định của chân PA0 khi Port_Init() thực thi.",
    mechanism: "PORT_PIN_IN cấu hình đệm ngõ vào (đọc qua Dio_ReadChannel); PORT_PIN_OUT bật đệm xuất tín hiệu.",
    scenarioImpact: "Cập nhật trực tiếp cột Direction của chân PA0 trên Ma trận Pin Mux PCR."
  },
  PortPinInitialMode: {
    title: "PortPinInitialMode (PA0 Multiplexer Mode)",
    ecucPath: "PortConfigSet / PortContainer / PortPin / PortPinInitialMode",
    sws: "SWS_Port_00124 · ECUC_Port_00128",
    range: "PORT_PIN_MODE_DIO | ADC | PWM | SPI | CAN",
    role: "Chọn chức năng ngoại vi (ALT0..ALT4) được nối ra chân vật lý PA0 trong thanh ghi PCR.",
    mechanism: "Tránh xung đột phần cứng bằng cách định tuyến duy nhất một ngoại vi nối vào mỗi chân tại một thời điểm.",
    scenarioImpact: "Đổi Mode sẽ làm thay đổi ALT tag trên bảng Pin Mux của Panel 1A."
  },
  PortPinInternalResistor: {
    title: "PortPinInternalResistor (Pull-Up / Pull-Down)",
    ecucPath: "PortConfigSet / PortContainer / PortPin / PortPinInternalResistor",
    sws: "SWS_Port_00041 · ECUC_Port_00127",
    range: "PORT_PIN_IN_PULL_UP | PORT_PIN_IN_PULL_DOWN | PORT_PIN_IN_NO_PULL",
    role: "Bật điện trở kéo lên nguồn hoặc kéo xuống mass tích hợp bên trong chip cho chân Input.",
    mechanism: "Ngăn trạng thái thả nổi (Floating Input) gây nhiễu khi công tắc ngoài hở mạch.",
    scenarioImpact: "Hiển thị trực tiếp cấu hình Pull trên bảng Pin Mux."
  },

  // ---------------- TAB 2: DIO (6) ----------------
  DioDevErrorDetect: {
    title: "DioDevErrorDetect",
    ecucPath: "DioGeneral / DioDevErrorDetect",
    sws: "SWS_Dio_00142 · ECUC_Dio_00142",
    range: "Boolean (true | false)",
    role: "Bật kiểm tra mã kênh, cổng, nhóm kênh hợp lệ và con trỏ NULL_PTR trong module Dio.",
    mechanism: "Lưu ý AUTOSAR R20+: Dio KHÔNG có hàm Dio_Init() nên lỗi chính là DIO_E_PARAM_INVALID_CHANNEL_ID (0x0A) hoặc DIO_E_PARAM_POINTER (0x20).",
    scenarioImpact: "Dùng khi thử nhập DioChannelId = 99 ở S4 để quan sát báo lỗi DET."
  },
  DioFlipChannelApi: {
    title: "DioFlipChannelApi",
    ecucPath: "DioGeneral / DioFlipChannelApi",
    sws: "SWS_Dio_00190 · ECUC_Dio_00153",
    range: "Boolean (true | false)",
    role: "Bật hàm Dio_FlipChannel(ChannelId) đảo mức logic tức thời của một chân Output.",
    mechanism: "Thực hiện đảo bit nguyên tử (0 <-> 1) trên GPIO_PTOR và trả về mức mới (STD_HIGH / STD_LOW) mà không cần Read-Modify-Write ở tầng trên.",
    scenarioImpact: "Nếu tắt FALSE, nút FlipChannel không khả dụng (hoặc báo DET)."
  },
  DioMaskedWritePortApi: {
    title: "DioMaskedWritePortApi",
    ecucPath: "DioGeneral / DioMaskedWritePortApi",
    sws: "SWS_Dio_00202 · ECUC_Dio_00155",
    range: "Boolean (true | false)",
    role: "Bật hàm Dio_MaskedWritePort(PortId, Level, Mask) để ghi chọn lọc nhiều chân trong cùng 1 Port.",
    mechanism: "Chỉ những bit có Mask=1 mới được cập nhật theo Level; các chân có Mask=0 được bảo vệ giữ nguyên giá trị cũ.",
    scenarioImpact: "Minh họa rõ trong kịch bản S5 khi so sánh WritePort và MaskedWritePort."
  },
  DioChannelIdSelected: {
    title: "DioChannelIdSelected (Target Channel)",
    ecucPath: "DioConfig / DioPort / DioChannel / DioChannelId",
    sws: "SWS_Dio_00027 · SWS_Dio_00028 · ECUC_Dio_00146",
    range: "0 (PA0 IgnSw [IN]) | 1 (PA1 WarnLed [OUT]) | 99 (Invalid ID)",
    role: "Mã kênh Dio_ChannelType đang thao tác bởi các hàm Dio_ReadChannel / WriteChannel / FlipChannel.",
    mechanism: "Theo SWS_Dio_00028, nếu gọi Dio_WriteChannel() lên kênh đang là Input (PA0), lệnh ghi bị bỏ qua an toàn.",
    scenarioImpact: "Nhập 0 để test ghi lên chân Input; nhập 99 để test lỗi DIO_E_PARAM_INVALID_CHANNEL_ID."
  },
  DioPortMaskHex: {
    title: "Dio_ChannelGroupType Mask (Hex)",
    ecucPath: "DioConfig / DioPort / DioChannelGroup / DioPortMask",
    sws: "SWS_Dio_00039 · ECUC_Dio_00149",
    range: "Hex 8-bit Mask (Typical: 0xF0 với Offset=4, hoặc 0x3C với Offset=2)",
    role: "Mặt nạ bit xác định các chân liền kề thuộc cùng một Dio_ChannelGroup.",
    mechanism: "Hàm Dio_WriteChannelGroup(&Grp, Val) tự tính Offset (vị trí bit 1 thấp nhất) và chỉ ghi ((Val << Offset) & Mask) ra Port.",
    scenarioImpact: "Đổi sang 0x3C ở S5 What-If để thấy 4 bit giữa (Pin 2..5) được cập nhật mà Pin 0,1,6,7 không đổi."
  },
  DioPortWriteValueHex: {
    title: "DioPort / Group Write Value (Hex)",
    ecucPath: "Runtime Parameter for Dio_WritePort / Dio_WriteChannelGroup",
    sws: "SWS_Dio_00034 · SWS_Dio_00039",
    range: "0x00 .. 0xFF (8-bit Dio_PortLevelType)",
    role: "Giá trị nhị phân 8-bit hoặc giá trị nhóm chân chuẩn bị xuất ra cổng Port_0.",
    mechanism: "Khi ghi nhóm 0xF0 (4 bit cao), giá trị 0x0A trở thành 0xA0 và ghép với 4 bit thấp hiện có của Port_0.",
    scenarioImpact: "Quan sát ngay trạng thái từng bit Pin 0..7 trên bảng Pin Mux của Panel 1A."
  },

  // ---------------- TAB 3: ADC (6) ----------------
  AdcDriverInitialized: {
    title: "AdcDriverInitialized (Adc_Init State)",
    ecucPath: "EcuM_AL_DriverInitOne -> Adc_Init(&Adc_Config)",
    sws: "SWS_Adc_00054 · SWS_Adc_00107",
    range: "Boolean (TRUE | FALSE)",
    role: "Xác định driver Adc đã được khởi tạo qua Adc_Init() hay chưa.",
    mechanism: "Nếu FALSE, gọi bất kỳ API nào của Adc đều báo DET ADC_E_UNINIT (0x0A).",
    scenarioImpact: "Dùng để kiểm thử lỗi chưa khởi tạo trong S16."
  },
  AdcGrpNotifCapability: {
    title: "AdcGrpNotifCapability (EOC Callback)",
    ecucPath: "AdcGeneral / AdcGrpNotifCapability",
    sws: "SWS_Adc_00057 · SWS_Adc_00060 · ECUC_Adc_00454",
    range: "Boolean (true | false)",
    role: "Cho phép AdcGroup kích hoạt thông báo ngắt (IoHwAb_AdcNotification_0) ngay khi chuyển đổi xong.",
    mechanism: "Cần gọi thêm Adc_EnableGroupNotification(Group) ở runtime (Bit 4 NOTIF_CBK_EN = 1). Nếu tắt FALSE mà gọi Enable sẽ báo ADC_E_NOTIF_CAPABILITY (0x18).",
    scenarioImpact: "Quyết định xem ngắt EOC của SAR ADC có đẩy callback lên IoHwAb hay không."
  },
  AdcGroupTriggSrc: {
    title: "AdcGroupTriggSrc (SW vs HW Trigger)",
    ecucPath: "AdcConfigSet / AdcHwUnit / AdcGroup / AdcGroupTriggSrc",
    sws: "SWS_Adc_00481 · ECUC_Adc_00481",
    range: "ADC_TRIGG_SRC_SW | ADC_TRIGG_SRC_HW",
    role: "Chọn nguồn kích hoạt quá trình lấy mẫu cho AdcGroup_0: Phần mềm hoặc Xung phần cứng Timer.",
    mechanism: "Nhóm SW Trigger dùng Adc_StartGroupConversion(); nhóm HW Trigger dùng Adc_EnableHardwareTrigger(). Gọi nhầm hàm sẽ báo DET ADC_E_WRONG_TRIGG_SRC (0x17)!",
    scenarioImpact: "Thử gọi StartGroupConversion khi đang đặt HW Trigger ở S7 What-If để thấy DET bắt lỗi."
  },
  AdcGroupAccessMode: {
    title: "AdcGroupAccessMode (Single vs Streaming)",
    ecucPath: "AdcConfigSet / AdcHwUnit / AdcGroup / AdcGroupAccessMode",
    sws: "SWS_Adc_00478 · ECUC_Adc_00478",
    range: "ADC_ACCESS_MODE_SINGLE | ADC_ACCESS_MODE_STREAMING",
    role: "Chọn kiểu lưu trữ bộ đệm kết quả: 1 mẫu/kênh (Single) hoặc mảng vòng/tuyến tính N mẫu (Streaming).",
    mechanism: "Chế độ Streaming thu thập đủ AdcStreamingNumSamples mẫu qua DMA/ISR rồi mới báo ADC_STREAM_COMPLETED, giúp giảm tải ngắt CPU.",
    scenarioImpact: "Trình diễn rõ ở S6 (Single) và S7 (Streaming 3 mẫu)."
  },
  AdcStreamingNumSamples: {
    title: "AdcStreamingNumSamples",
    ecucPath: "AdcConfigSet / AdcHwUnit / AdcGroup / AdcStreamingNumSamples",
    sws: "SWS_Adc_00485 · ECUC_Adc_00485",
    range: "1 .. 8 samples (Typical: 3 samples in Streaming mode)",
    role: "Số lượng mẫu tích lũy cho mỗi kênh trước khi bộ đệm Streaming báo đầy.",
    mechanism: "Sau mỗi xung kích, số mẫu đã lấy tăng 1 (ADC_COMPLETED -> ... -> ADC_STREAM_COMPLETED khi đạt đủ N).",
    scenarioImpact: "Quyết định số nhịp xung kích HW Trigger cần thiết trong S7."
  },
  AdcSimInputVoltageMv: {
    title: "Simulated Pin AN0 Input Voltage (mV)",
    ecucPath: "Physical Sensor Input -> MCU Pin PA2 (AN0_TempSens)",
    sws: "SWS_Adc_00075 · SWS_IoHwAb",
    range: "0 .. 5000 mV (12-bit SAR: 0 .. 4095 Raw Counts)",
    role: "Điện áp tương tự giả lập tại chân cảm biến nhiệt độ AN0 đưa vào bộ biến đổi SAR ADC.",
    mechanism: "Raw12bit = round((mV / 5000) * 4095). IoHwAb đọc Raw qua Adc_ReadGroup() và quy đổi sang nhiệt độ °C (VD: 2500mV = 85°C, 4000mV = 105°C).",
    scenarioImpact: "Thay đổi điện áp này trong S6 hoặc S9 (E2E Loop) sẽ tự động làm SWC tăng/giảm tốc độ quạt PWM và bật/tắt đèn DIO!"
  },

  // ---------------- TAB 4: PWM (6) ----------------
  PwmDriverInitialized: {
    title: "PwmDriverInitialized (Pwm_Init State)",
    ecucPath: "EcuM_AL_DriverInitOne -> Pwm_Init(&Pwm_Config)",
    sws: "SWS_Pwm_00007 · SWS_Pwm_00117",
    range: "Boolean (TRUE | FALSE)",
    role: "Xác định driver Pwm đã được khởi tạo bộ đếm FTM/eMIOS qua Pwm_Init() hay chưa.",
    mechanism: "Nếu FALSE, các hàm Pwm_SetDutyCycle / SetPeriodAndDuty / SetOutputToIdle sẽ báo DET PWM_E_UNINIT (0x11).",
    scenarioImpact: "Dùng để test bẫy lỗi chưa khởi tạo trong S16."
  },
  PwmChannelClass: {
    title: "PwmChannelClass (Fixed vs Variable Period)",
    ecucPath: "PwmChannelConfigSet / PwmChannel / PwmChannelClass",
    sws: "SWS_Pwm_00041 · SWS_Pwm_00045 · ECUC_Pwm_00137",
    range: "PWM_FIXED_PERIOD | PWM_VARIABLE_PERIOD",
    role: "Quy định kênh PwmCh_0 có được phép thay đổi chu kỳ/tần số lúc runtime hay không.",
    mechanism: "Nếu đặt PWM_FIXED_PERIOD, hàm Pwm_SetPeriodAndDuty() bị khóa và báo DET PWM_E_PERIOD_UNCHANGEABLE (0x13)! Muốn đổi tần số phải chọn PWM_VARIABLE_PERIOD.",
    scenarioImpact: "Thử gọi SetPeriodAndDuty khi đang là PWM_FIXED_PERIOD trong S8 What-If."
  },
  PwmDutycycleDefaultHex: {
    title: "PwmDutycycleDefault (16-bit Scale 0..0x8000)",
    ecucPath: "PwmChannelConfigSet / PwmChannel / PwmDutycycleDefault",
    sws: "SWS_Pwm_00013 · SWS_Pwm_00059 · ECUC_Pwm_00138",
    range: "0x0000 (0%) .. 0x4000 (50%) .. 0x8000 (100%)",
    role: "Độ rộng xung chuẩn hóa 16-bit theo quy ước AUTOSAR (độc lập độ phân giải Timer phần cứng).",
    mechanism: "Driver tính số tick so sánh = (PeriodTicks * DutyCycle) >> 15. Giá trị >= 0x8000 được hiểu là 100% mức tích cực.",
    scenarioImpact: "Đồ thị xung vuông PWM ở Panel 1A vẽ lại ngay lập tức tỷ lệ T_on / Period theo giá trị này."
  },
  PwmPeriodDefaultUs: {
    title: "PwmPeriodDefault (us)",
    ecucPath: "PwmChannelConfigSet / PwmChannel / PwmPeriodDefault",
    sws: "SWS_Pwm_00019 · ECUC_Pwm_00140",
    range: "10 .. 1000 us (Typical: 50 us = 20 kHz cho quạt/motor)",
    role: "Chu kỳ toàn phần (T = 1/f) của một xung PWM tính bằng micro-giây.",
    mechanism: "Khi thay đổi Period bằng Pwm_SetPeriodAndDuty(), tần số xung f = 1000 / PeriodUs (kHz) thay đổi tương ứng.",
    scenarioImpact: "Cập nhật thông số T_on, T_off và Tần số (kHz) trên biểu đồ xung PWM."
  },
  PwmIdleState: {
    title: "PwmIdleState (Safe Output Level)",
    ecucPath: "PwmChannelConfigSet / PwmChannel / PwmIdleState",
    sws: "SWS_Pwm_00021 · ECUC_Pwm_00139",
    range: "PWM_LOW | PWM_HIGH",
    role: "Mức điện áp an toàn của chân Pin PWM ngay khi gọi hàm Pwm_SetOutputToIdle(Channel).",
    mechanism: "Dừng xuất xung ngay lập tức (hạ Bit 4 PWM_OUT_ACT = 0) và ép chân Pin về mức thiết lập an toàn (thường là PWM_LOW để tắt cơ cấu chấp hành).",
    scenarioImpact: "Hiển thị rõ đường phẳng mức IDLE trên đồ thị sóng khi gọi SetOutputToIdle."
  },
  PwmDutycycleUpdatedEndperiod: {
    title: "PwmDutycycleUpdatedEndperiod (Shadow Register)",
    ecucPath: "PwmGeneral / PwmDutycycleUpdatedEndperiod",
    sws: "SWS_Pwm_00017 · ECUC_Pwm_00133",
    range: "Boolean (true | false)",
    role: "Đồng bộ việc nạp giá trị DutyCycle mới vào thanh ghi bóng (Shadow Register) tại thời điểm cuối chu kỳ xung.",
    mechanism: "Ngăn hiện tượng sinh xung gai siêu hẹp (Glitch) hoặc xung thừa gây hỏng IGBT/MOSFET khi thay đổi Duty đột ngột giữa chu kỳ.",
    scenarioImpact: "Hiển thị trạng thái Glitch-Free Shadow Update trên Panel PWM."
  },

  // ---------------- TAB 5: SPI (6) ----------------
  SpiDriverInitialized: {
    title: "SpiDriverInitialized (Spi_Init State)",
    ecucPath: "EcuM_AL_DriverInitOne -> Spi_Init(&Spi_Config)",
    sws: "SWS_Spi_00013 · SWS_Spi_00175",
    range: "Boolean (TRUE = SPI_IDLE | FALSE = SPI_UNINIT)",
    role: "Xác định driver Spi đã khởi tạo phần cứng QSPI và các hàng đợi Seq/Job hay chưa.",
    mechanism: "Nếu FALSE, mọi lời gọi Spi_WriteIB / AsyncTransmit / SetupEB báo lỗi DET SPI_E_UNINIT (0x1A).",
    scenarioImpact: "Kiểm thử lỗi chưa khởi tạo trong S16."
  },
  SpiLevelDelivered: {
    title: "SpiLevelDelivered (Sync / Async Capability)",
    ecucPath: "SpiGeneral / SpiLevelDelivered",
    sws: "SWS_Spi_00110 · ECUC_Spi_00201",
    range: "0 (Sync Only) | 1 (Async Only) | 2 (Sync & Async + Priority)",
    role: "Cấp độ chức năng của AUTOSAR Spi Handler/Driver.",
    mechanism: "LEVEL 0 chỉ dùng Spi_SyncTransmit (chặn CPU); LEVEL 1 chỉ dùng Spi_AsyncTransmit; LEVEL 2 hỗ trợ cả hai kèm hàng đợi ưu tiên SpiJobPriority (0..3).",
    scenarioImpact: "Nếu đặt 0 mà gọi Spi_AsyncTransmit() hoặc đặt 1 mà gọi Spi_SyncTransmit(), Driver sẽ từ chối thực thi!"
  },
  SpiChannelBuffersAllowed: {
    title: "SpiChannelBuffersAllowed (IB vs EB)",
    ecucPath: "SpiGeneral / SpiChannelBuffersAllowed",
    sws: "SWS_Spi_00018 · SWS_Spi_00053 · ECUC_Spi_00199",
    range: "0 (IB Only) | 1 (EB Only) | 2 (IB & EB Allowed)",
    role: "Quy định loại bộ đệm dữ liệu được phép dùng trên các SpiChannel.",
    mechanism: "IB (Internal Buffer) cấp phát trong Driver dùng Spi_WriteIB/ReadIB (lệnh ngắn); EB (External Buffer) truyền con trỏ RAM tầng trên qua Spi_SetupEB (khối dữ liệu lớn).",
    scenarioImpact: "Minh họa ở S10 (IB) và S11 (EB)."
  },
  SpiInterruptibleSequence: {
    title: "SpiInterruptibleSequence (Priority Preemption)",
    ecucPath: "SpiDriver / SpiSequence / SpiInterruptibleSequence",
    sws: "SWS_Spi_00008 · ECUC_Spi_00215",
    range: "Boolean (true | false)",
    role: "Cho phép một Sequence khác có SpiJobPriority cao hơn chèn ngang giữa các Job của Sequence hiện tại.",
    mechanism: "Khi TRUE, bộ lập lịch sẽ tạm dừng giữa Job A và Job B để ưu tiên chạy Sequence khẩn cấp (VD: Watchdog SBC Priority 3) ngay khi Job A vừa nhả chân CS.",
    scenarioImpact: "Bật/tắt trong S11 để quan sát thứ tự thực thi hàng đợi Job trong bảng SPI Pipeline."
  },
  SpiAsyncMode: {
    title: "SpiAsyncMode (Interrupt vs Polling)",
    ecucPath: "Runtime API: Spi_SetAsyncMode(Mode)",
    sws: "SWS_Spi_00188 · SWS_Spi_00152",
    range: "SPI_INTERRUPT_MODE | SPI_POLLING_MODE",
    role: "Chuyển đổi cơ chế kết thúc Job/Sequence bất đồng bộ giữa Ngắt phần cứng và Quét định kỳ.",
    mechanism: "Ở INTERRUPT_MODE, phần cứng tự gọi ISR kết thúc Job; ở POLLING_MODE, SchM phải gọi Spi_MainFunction_Handling() (+1 Tick) mới đẩy tiến trình chạy tiếp.",
    scenarioImpact: "Thử đổi sang POLLING_MODE trong S10 What-If để thấy Sequence đợi nhịp +1 Tick."
  },
  SpiTxDataHex: {
    title: "SpiTxDataBuffer (Hex Bytes)",
    ecucPath: "Spi_WriteIB() / Spi_SetupEB() Payload",
    sws: "SWS_Spi_00018 · SWS_Spi_00053",
    range: "Hex bytes (VD: A5 01 55 FF)",
    role: "Chuỗi dữ liệu truyền ra chân MOSI trong lần kích hoạt Spi_AsyncTransmit / Spi_SyncTransmit.",
    mechanism: "Vì SPI truyền song công (Full-Duplex), mỗi byte đẩy ra MOSI đồng thời dịch về 1 byte phản hồi trên đường MISO.",
    scenarioImpact: "Hiển thị trực tiếp byte dịch MOSI <-> MISO trên Pipeline của Panel 1A."
  },

  // ---------------- TAB 6: CAN (6) ----------------
  CanDriverInitialized: {
    title: "CanDriverInitialized (Can_Init State)",
    ecucPath: "EcuM_AL_DriverInitOne -> Can_Init(&Can_Config)",
    sws: "SWS_Can_00259 · SWS_Can_00407",
    range: "Boolean (TRUE = STOPPED/STARTED | FALSE = UNINIT)",
    role: "Xác định driver Can đã khởi tạo thanh ghi bộ điều khiển FlexCAN/M_CAN hay chưa.",
    mechanism: "Sau Can_Init(), Controller ở CAN_CS_STOPPED; phải đợi CanIf gọi Can_SetControllerMode(CAN_CS_STARTED) mới truyền/nhận được.",
    scenarioImpact: "Tắt để kiểm thử lỗi DET CAN_E_UNINIT (0x05)."
  },
  CanMultiplexedTransmission: {
    title: "CanMultiplexedTransmission (HTH Priority)",
    ecucPath: "CanGeneral / CanMultiplexedTransmission",
    sws: "SWS_Can_00276 · ECUC_Can_00095",
    range: "Boolean (true | false)",
    role: "Cho phép một HTH (Hardware Transmit Handle) điều phối nhiều hộp thư Tx vật lý song song.",
    mechanism: "Tránh hiện tượng Priority Inversion (gói ưu tiên thấp chiếm mất mailbox làm nghẽn gói ưu tiên cao phía sau). Khi bật TRUE, HTH_0 quản lý tới 3 Mailboxes!",
    scenarioImpact: "Tắt FALSE khiến HTH chỉ có 1 Mailbox, rất dễ trả về CAN_BUSY khi bắn liên tiếp trong S12 What-If!"
  },
  CanFdBaudrateConfig: {
    title: "CanFdBaudrateConfig (CAN FD 64B & BRS)",
    ecucPath: "CanController / CanControllerBaudrateConfig / CanControllerFdBaudrateConfig",
    sws: "SWS_Can_00473 · ECUC_Can_00473",
    range: "Boolean (true = CAN FD up to 64B | false = Classic CAN 8B)",
    role: "Kích hoạt giao thức CAN FD (Data Phase 2000 kbps với Bit Rate Switch và Payload lên tới 64 Bytes).",
    mechanism: "Khung CAN FD có bit 0x40000000 bật trong Can_IdType. Nếu tắt FALSE mà gửi khung > 8 bytes sẽ bị bắt lỗi DET CAN_E_PARAM_DATA_LENGTH (0x03)!",
    scenarioImpact: "Thử tắt FALSE trong S12 What-If khi đang gửi khung 16 bytes để thấy DET bắt lỗi."
  },
  CanTxRxProcessingMode: {
    title: "CanTxProcessing & CanRxProcessing",
    ecucPath: "CanController / CanTxProcessing & CanRxProcessing",
    sws: "SWS_Can_00031 · ECUC_Can_00067",
    range: "INTERRUPT | POLLING | MIXED",
    role: "Xác định cách Can Driver báo TxConfirmation / RxIndication / BusOff lên CanIf.",
    mechanism: "Chế độ INTERRUPT gọi callback ngay trong ngắt phần cứng; POLLING đợi hàm Can_MainFunction_Write/Read/BusOff (+1 Tick).",
    scenarioImpact: "Khi đặt POLLING, gói gửi đi sẽ đợi +1 Tick mới nhận CanIf_TxConfirmation()."
  },
  CanHwFilterCodeHex: {
    title: "CanHwFilterCode (HRH Acceptance Filter)",
    ecucPath: "CanHardwareObject (HRH) / CanHwFilter / CanHwFilterCode",
    sws: "SWS_Can_00469 · ECUC_Can_00469",
    range: "Hex CAN ID (Default: 0x100 với Mask 0x7F0 -> nhận 0x100..0x10F)",
    role: "Mã lọc phần cứng trên hộp thư nhận HRH_0 để lọc bỏ các bản tin CAN không liên quan ngay tại silicon.",
    mechanism: "Hộp thư chỉ kích ngắt CanIf_RxIndication() khi (RxCanId & 0x7F0) == (FilterCode & 0x7F0).",
    scenarioImpact: "Thay đổi FilterCode sẽ làm thay đổi kết quả chấp nhận hoặc loại bỏ khung Rx khi bấm Inject CAN Rx."
  },
  CanTxFrameIdHex: {
    title: "Can_PduType.id (Can_IdType Hex)",
    ecucPath: "Runtime Can_Write(HTH_0, &PduInfo)",
    sws: "SWS_Can_00416 · SWS_Can_00276",
    range: "0x000..0x7FF (Std) | 0x40000000+ID (CAN FD) | 0x80000000+ID (Ext)",
    role: "Trường ID trong cấu trúc Can_PduType truyền vào Can_Write(), mang 2 bit cờ cao nhất của AUTOSAR.",
    mechanism: "Bit 31 (0x80000000) báo Extended ID 29-bit; Bit 30 (0x40000000) báo khung CAN FD.",
    scenarioImpact: "Hiển thị trực tiếp giải mã Standard/Extended và CAN Classic/FD trên bảng Can Mailbox Panel 1A."
  },

  // ---------------- TAB 7: FLS (6) ----------------
  FlsDriverInitialized: {
    title: "FlsDriverInitialized (Fls_Init State)",
    ecucPath: "EcuM_AL_DriverInitOne -> Fls_Init(&Fls_Config)",
    sws: "SWS_Fls_00249 · SWS_Fls_00014",
    range: "Boolean (TRUE = MEMIF_IDLE | FALSE = MEMIF_UNINIT)",
    role: "Xác định Flash Driver đã được khởi tạo trước khi Fee gọi lệnh xóa/ghi/đọc hay chưa.",
    mechanism: "Nếu FALSE, mọi hàm Fls_Erase / Write / Read / Compare báo lỗi DET FLS_E_UNINIT (0x05).",
    scenarioImpact: "Kiểm thử lỗi chưa khởi tạo trong S16."
  },
  FlsDefaultMode: {
    title: "FlsDefaultMode (Slow vs Fast Mode)",
    ecucPath: "FlsConfigSet / FlsDefaultMode & Runtime Fls_SetMode()",
    sws: "SWS_Fls_00155 · ECUC_Fls_00171",
    range: "MEMIF_MODE_SLOW (8 B/Tick) | MEMIF_MODE_FAST (32 B/Tick)",
    role: "Điều chỉnh số lượng bytes tối đa mà Fls_MainFunction() xử lý trong mỗi chu kỳ gọi.",
    mechanism: "MEMIF_MODE_SLOW hạn chế thời gian chiếm dụng CPU khi xe đang chạy; MEMIF_MODE_FAST tăng tốc tối đa lúc Startup (NvM_ReadAll) hoặc Shutdown (NvM_WriteAll).",
    scenarioImpact: "Chuyển sang FAST trong S14 What-If để thấy 16 bytes được ghi xong ngay trong 1 Tick!"
  },
  FlsPageSize: {
    title: "FlsPageSize (Write Alignment Unit)",
    ecucPath: "FlsConfigSet / FlsSectorList / FlsSector / FlsPageSize",
    sws: "SWS_Fls_00223 · ECUC_Fls_00201",
    range: "4 .. 64 Bytes (Typical: 8 Bytes cho Data Flash)",
    role: "Kích thước đơn vị ghi tối thiểu (Page Alignment) của phần cứng Data Flash.",
    mechanism: "Cả TargetAddress và Length của hàm Fls_Write() bắt buộc phải chia hết cho FlsPageSize; nếu lệch sẽ báo DET FLS_E_PARAM_ADDRESS (0x02) hoặc FLS_E_PARAM_LENGTH (0x03)!",
    scenarioImpact: "Thử nhập địa chỉ lẻ như 0x0003 ở S15 What-If để thấy DET bắt lỗi căn chỉnh địa chỉ."
  },
  FlsWriteVerificationEnabled: {
    title: "FlsWriteVerificationEnabled (Verify & BlankCheck)",
    ecucPath: "FlsGeneral / FlsWriteVerificationEnabled",
    sws: "SWS_Fls_00056 · ECUC_Fls_00174",
    range: "Boolean (true | false)",
    role: "Bật bước kiểm tra ô nhớ chưa ghi phải bằng 0xFF và đọc đối chiếu ngay sau mỗi lệnh Fls_Write().",
    mechanism: "Bộ nhớ Flash chỉ ghi được bit 1->0 (0xFF -> Data). Nếu cố ghi đè lên vùng Page chưa Fls_Erase(), Driver báo lỗi DEM FLS_E_WRITE_FAILED & gọi Fee_JobErrorNotification()!",
    scenarioImpact: "Thử gọi Fls_Write trực tiếp lên Page đã có dữ liệu ở S14 What-If để thấy lỗi ghi đè!"
  },
  FlsTargetAddressHex: {
    title: "FlsTargetAddress (Flash Offset Hex)",
    ecucPath: "Runtime Parameter for Fls_Erase / Fls_Write / Fls_Read",
    sws: "SWS_Fls_00218 · SWS_Fls_00223",
    range: "0x0000 .. 0x07FF (Cộng với Base 0x00080000)",
    role: "Địa chỉ tương đối tính từ FlsBaseAddress (0x00080000) của Sector/Page cần thao tác.",
    mechanism: "0x0000 = Page #0, 0x0008 = Page #1, 0x0010 = Page #2. Địa chỉ không chia hết cho FlsPageSize sẽ kích lỗi DET.",
    scenarioImpact: "Nhập 0x0003 để test DET FLS_E_PARAM_ADDRESS hoặc chọn Page đích trên bản đồ Flash."
  },
  FlsWriteDataHex: {
    title: "FlsWriteData (Hex Payload Bytes)",
    ecucPath: "Runtime SourceAddressPtr for Fls_Write / Fls_Compare",
    sws: "SWS_Fls_00223 · SWS_Fls_00241",
    range: "Hex bytes (Typical: 16 bytes = 2 Pages)",
    role: "Chuỗi byte dữ liệu do Fee truyền xuống để Fls ghi vào bộ nhớ Data Flash vật lý.",
    mechanism: "Được chia thành từng khối FlsMaxWriteNormalMode / FastMode xử lý dần qua các nhịp Fls_MainFunction().",
    scenarioImpact: "Hiển thị trực tiếp từng byte ghi vào Page #0, Page #1 trên Flash Memory Map."
  }
};

const MODULES_INFO = {
  MOD_SWC: {
    name: "SWC_ThermalCtrl / SWC_Body / SWC_Diag (Application Layer)",
    sws: "TPS_SWCTemplate · AUTOSAR Classic R23-11",
    input: "Nhận giá trị cảm biến đã quy đổi (nhiệt độ °C, trạng thái công tắc), bản tin CAN từ COM và kết quả NvM qua RTE.",
    processing: "Chạy các Runnables định kỳ (VD: RE_ThermalMain_10ms). SWC hoàn toàn độc lập phần cứng: KHÔNG BAO GIỜ gọi trực tiếp Mcu/Port/Dio/Adc/Pwm/Spi/Can/Fls!",
    output: "Gọi xuống RTE: Rte_Call_RP_TempSens_Read(), Rte_Call_RP_CoolingFan_SetSpeed(), Rte_Call_RP_OverTempLed_Write(), Rte_Write_COM_Sig(), Rte_Call_NvM_WriteBlock().",
    apis: ["Rte_Call_RP_TempSens_Read(&tempDegC)", "Rte_Call_RP_CoolingFan_SetSpeed(dutyPct)", "Rte_Call_RP_OverTempLed_Write(level)", "Rte_Call_NvMService_WriteBlock()"]
  },
  MOD_RTE: {
    name: "RTE, SchM, COM/PduR & NvM (Middleware & Scheduler)",
    sws: "SWS_Rte · SWS_COM · SWS_NvM",
    input: "Lời gọi Port từ SWC, xung nhịp định kỳ OS Task (1ms / 10ms) và xác nhận truyền/nhận/lưu trữ từ ECU Abstraction.",
    processing: "RTE ánh xạ lời gọi của SWC xuống IoHwAb / COM / NvM. SchM định kỳ gọi MainFunction cho Spi/Can/Fls và quản lý vùng dữ liệu găng (Exclusive Area).",
    output: "Gọi các hàm định kỳ Fls_MainFunction(), Can_MainFunction_*(), Spi_MainFunction_Handling() và điều tuyến dữ liệu giữa SWC <-> ECU Abstraction.",
    apis: ["SchM_Enter_Fls_EA_0()", "Fls_MainFunction()", "Spi_MainFunction_Handling()", "Can_MainFunction_Write/Read/BusOff()"]
  },
  MOD_ECUM: {
    name: "EcuM, BswM, Dem & Det (System & Diagnostic Services)",
    sws: "SWS_EcuM · SWS_BswM · SWS_Dem · SWS_Det",
    input: "Sự kiện khởi động Power-On/Wakeup, yêu cầu Reset/Sleep, và các báo cáo lỗi từ 8 module MCAL.",
    processing: "EcuM thực thi EcuM_AL_DriverInitOne() khởi tạo tuần tự 8 MCAL (Mcu -> Port -> Adc -> Pwm -> Spi -> Can -> Fls). Det ghi lỗi phát triển (*_E_*); Dem ghi lỗi phần cứng sản xuất.",
    output: "Mcu_Init(), Mcu_InitClock(), Mcu_DistributePllClock(), Mcu_SetMode(), Mcu_PerformReset(), Port_Init()... và hiển thị cảnh báo DET/DEM.",
    apis: ["EcuM_AL_DriverInitOne()", "Det_ReportError(ModId, Inst, ApiId, ErrId)", "Dem_SetEventStatus(EventId, FAILED)", "Mcu_SetMode(MCU_MODE_HALT)"]
  },
  MOD_IOHWAB: {
    name: "IoHwAb (I/O Hardware Abstraction — Cầu nối SWC ⇄ I/O MCAL)",
    sws: "SWS_IoHwAb (ECU Abstraction Layer)",
    input: "Nhận yêu cầu logic từ SWC qua RTE và dữ liệu thô / ngắt callback từ Port, Dio, Adc, Pwm, Spi.",
    processing: "Ẩn mã chân Pin và quy ước phần cứng khỏi SWC. Quy đổi ADC 12-bit (0..4095) sang mV/°C; quy đổi tốc độ quạt 0..100% sang thang PWM 0x0000..0x8000; che giấu cực tính đèn LED.",
    output: "Gọi xuống Dio_ReadChannel / WriteChannel / FlipChannel, Adc_StartGroupConversion / ReadGroup, Pwm_SetDutyCycle, Port_SetPinDirection, Spi_AsyncTransmit.",
    apis: ["IoHwAb_AdcNotification_0()", "Adc_SetupResultBuffer()", "Adc_ReadGroup()", "Pwm_SetDutyCycle()", "Dio_WriteChannel()"]
  },
  MOD_CANIF: {
    name: "CanIf & CanSM (CAN Interface & State Manager)",
    sws: "SWS_CanIf · SWS_CanSM",
    input: "Nhận yêu cầu truyền I-PDU từ PduR/COM, lệnh đổi chế độ mạng từ ComM và các callbacks Rx/Tx/BusOff từ module Can.",
    processing: "Ánh xạ CanTxPduId sang HTH và CAN ID; lưu Tx Queue nếu Can_Write() trả về CAN_BUSY; lọc Rx PDU và kích hoạt phục hồi Bus-Off qua CanSM_ControllerBusOff().",
    output: "Gọi xuống Can_SetControllerMode(), Can_Write(Hth, &PduInfo) và báo ngược PduR_CanIfRxIndication() / TxConfirmation() / CanSM_ControllerBusOff().",
    apis: ["CanIf_Transmit()", "CanIf_TxConfirmation()", "CanIf_RxIndication()", "CanIf_ControllerBusOff()", "CanIf_ControllerModeIndication()"]
  },
  MOD_FEE: {
    name: "Fee & MemIf (Flash EEPROM Emulation — Cầu nối NvM ⇄ Fls)",
    sws: "SWS_Fee · SWS_MemIf",
    input: "Nhận yêu cầu đọc/ghi Block trừu tượng từ NvM (qua MemIf) và callback Fee_JobEndNotification / JobErrorNotification từ Fls.",
    processing: "Ánh xạ NvM Block ID thành địa chỉ Sector/Page vật lý trên Data Flash; thực hiện Wear Leveling và điều phối chuỗi Fls_Erase -> Fls_Write -> Fls_Compare.",
    output: "Gọi xuống Fls_Erase(), Fls_Write(), Fls_Read(), Fls_Compare(), Fls_BlankCheck(), Fls_Cancel() và báo hoàn tất lên NvM.",
    apis: ["Fee_Write()", "Fee_Read()", "Fee_JobEndNotification()", "Fee_JobErrorNotification()"]
  },
  MOD_MCU: {
    name: "Mcu (Microcontroller Driver — ModId: 101 / 0x65)",
    sws: "SWS_Mcu R20-11 / R22-11 / R23-11",
    input: "Lệnh khởi tạo, chọn nguồn xung nhịp, chuyển chế độ ngủ và truy vấn nguyên nhân Reset từ EcuM / BswM; đọc thanh ghi PLL_SR và RGM_FES.",
    processing: "Cấu hình bộ chia Prescaler và khởi động PLL (Mcu_InitClock), đợi khóa pha (Mcu_GetPllStatus == MCU_PLL_LOCKED) rồi mới đóng MUX phân phối xung (Mcu_DistributePllClock) tới CPU/BUS/CAN/ADC.",
    output: "Cấp xung nhịp ổn định cho toàn chip; trả ResetReason về EcuM; đưa CPU vào HALT/STOP hoặc kích SW Reset; báo Dem MCU_E_CLOCK_FAILURE nếu mất khóa clock.",
    apis: ["Mcu_Init()", "Mcu_InitClock()", "Mcu_GetPllStatus()", "Mcu_DistributePllClock()", "Mcu_GetResetReason()", "Mcu_SetMode()", "Mcu_PerformReset()", "Mcu_InitRamSection()"]
  },
  MOD_PORT: {
    name: "Port (Port Driver — ModId: 124 / 0x7C)",
    sws: "SWS_Port R20-11 / R22-11 / R23-11",
    input: "Lệnh cấu hình Pin Mux toàn chip từ EcuM (Port_Init) và lệnh đổi hướng/mode chân lúc runtime từ IoHwAb.",
    processing: "Nạp mức logic khởi tạo (PortPinLevelValue) trước khi mở đệm hướng để chống nháy đầu ra; ghi thanh ghi PCR[n] (ALT0..ALT4, Pull-up/down); kiểm tra cờ *Changeable trước khi đổi runtime; làm tươi chân cố định chống nhiễu EMC.",
    output: "Định tuyến chân vật lý MCU nối vào đúng ngoại vi Dio/Adc/Pwm/Spi/Can; báo DET PORT_E_DIRECTION_UNCHANGEABLE (0x0B) hoặc PORT_E_MODE_UNCHANGEABLE (0x0E) nếu vi phạm.",
    apis: ["Port_Init()", "Port_SetPinDirection()", "Port_SetPinMode()", "Port_RefreshPortDirection()", "Port_GetVersionInfo()"]
  },
  MOD_DIO: {
    name: "Dio (Digital I/O Driver — ModId: 120 / 0x78)",
    sws: "SWS_Dio R20-11 / R22-11 / R23-11",
    input: "Lệnh đọc/ghi/đảo mức logic từ IoHwAb (hoặc CanTrcv) và mức điện áp trên thanh ghi GPIO_PDIR.",
    processing: "Hoạt động hoàn toàn đồng bộ (Synchronous) & không trạng thái (Stateless — KHÔNG có Dio_Init). Hỗ trợ thao tác nguyên tử trên Channel đơn lẻ, Port 8/16-bit và ChannelGroup (dịch bit << Offset & Mask). Bỏ qua an toàn lệnh ghi lên chân Input.",
    output: "Cập nhật trực tiếp chân vật lý GPIO_PDOR/PTOR (STD_HIGH / STD_LOW), trả giá trị đọc về IoHwAb -> RTE -> SWC.",
    apis: ["Dio_ReadChannel()", "Dio_WriteChannel()", "Dio_FlipChannel()", "Dio_ReadPort()", "Dio_WritePort()", "Dio_ReadChannelGroup()", "Dio_WriteChannelGroup()", "Dio_MaskedWritePort()"]
  },
  MOD_ADC: {
    name: "Adc (Analog-to-Digital Driver — ModId: 123 / 0x7B)",
    sws: "SWS_Adc R20-11 / R22-11 / R23-11",
    input: "Con trỏ Result Buffer và lệnh kích hoạt từ IoHwAb; xung HW Trigger từ Timer; điện áp 0..5V tại chân AN0/AN1.",
    processing: "Quản lý theo AdcGroup (SW/HW Trigger, One-Shot/Continuous, Single/Streaming). Lấy mẫu 12-bit (0..4095) ghi vào Result Buffer, chuyển trạng thái ADC_IDLE -> ADC_BUSY -> ADC_COMPLETED -> ADC_STREAM_COMPLETED và kích ngắt EOC.",
    output: "Gọi callback IoHwAb_AdcNotification_<Group>() khi xong; trao dữ liệu thô qua Adc_ReadGroup() hoặc Adc_GetStreamLastPointer().",
    apis: ["Adc_Init()", "Adc_SetupResultBuffer()", "Adc_StartGroupConversion()", "Adc_StopGroupConversion()", "Adc_ReadGroup()", "Adc_EnableHardwareTrigger()", "Adc_EnableGroupNotification()", "Adc_GetGroupStatus()", "Adc_GetStreamLastPointer()"]
  },
  MOD_PWM: {
    name: "Pwm (Pulse Width Modulation Driver — ModId: 121 / 0x79)",
    sws: "SWS_Pwm R20-11 / R22-11 / R23-11",
    input: "Lệnh khởi tạo từ EcuM; giá trị DutyCycle (0x0000..0x8000), Period (us) và lệnh SetOutputToIdle từ IoHwAb.",
    processing: "Quy đổi Duty 16-bit sang thanh ghi so sánh: Ticks = (Period * Duty) >> 15. Kiểm tra lớp PWM_FIXED_PERIOD vs PWM_VARIABLE_PERIOD; nạp thanh ghi bóng cuối chu kỳ (Endperiod) chống xung gai.",
    output: "Phát sóng vuông phần cứng tới chân PWM (quạt làm mát, van, motor); gọi Pwm_Notification() tại sườn xung nếu bật EnableNotification.",
    apis: ["Pwm_Init()", "Pwm_DeInit()", "Pwm_SetDutyCycle()", "Pwm_SetPeriodAndDuty()", "Pwm_SetOutputToIdle()", "Pwm_GetOutputState()", "Pwm_EnableNotification()", "Pwm_DisableNotification()"]
  },
  MOD_SPI: {
    name: "Spi (SPI Handler / Driver — ModId: 83 / 0x53)",
    sws: "SWS_Spi R20-11 / R22-11 / R23-11",
    input: "Lệnh nạp đệm (WriteIB / SetupEB) và lệnh phát truyền (AsyncTransmit / SyncTransmit) từ CanTrcv / Wdg / Ea / IoHwAb.",
    processing: "Xử lý kiến trúc phân cấp 3 tầng Sequence -> Job (giữ CS & Baudrate, Priority 0..3) -> Channel (IB nội bộ / EB con trỏ ngoài). Hỗ trợ chèn ngang ưu tiên (Interruptible Sequence) và chuyển Interrupt/Polling mode.",
    output: "Kéo chân CS=LOW, dịch song công MOSI/MISO qua SCLK, gọi Spi_JobEndNotification() & Spi_SeqEndNotification() hoặc báo DEM SPI_E_HARDWARE_ERROR.",
    apis: ["Spi_Init()", "Spi_WriteIB()", "Spi_ReadIB()", "Spi_SetupEB()", "Spi_AsyncTransmit()", "Spi_SyncTransmit()", "Spi_GetStatus()", "Spi_GetSequenceResult()", "Spi_Cancel()", "Spi_SetAsyncMode()"]
  },
  MOD_CAN: {
    name: "Can (CAN / CAN-FD Driver — ModId: 80 / 0x50)",
    sws: "SWS_Can R20-11 / R22-11 / R23-11",
    input: "Lệnh chuyển Mode và truyền Can_PduType từ CanIf; xung truyền nhận vật lý và lỗi đường truyền từ CAN Bus.",
    processing: "Điều hành máy trạng thái Controller (UNINIT/STOPPED/STARTED/SLEEP). Quản lý hộp thư HOH: HTH (Multiplexed Tx tránh Priority Inversion, hỗ trợ CAN FD 64B + BRS) và HRH (lọc ID phần cứng). Giám sát TEC/REC; khi TEC >= 256 tự ngắt Bus-Off.",
    output: "Gọi lên CanIf: CanIf_TxConfirmation(), CanIf_RxIndication(&Mailbox, &PduInfo), CanIf_ControllerModeIndication(), CanIf_ControllerBusOff().",
    apis: ["Can_Init()", "Can_SetControllerMode()", "Can_SetBaudrate()", "Can_Write()", "Can_CheckWakeup()", "Can_GetControllerErrorState()", "Can_GetControllerTxErrorCounter()", "Can_MainFunction_Write/Read/BusOff()"]
  },
  MOD_FLS: {
    name: "Fls (Flash Driver — ModId: 92 / 0x5C)",
    sws: "SWS_Fls R20-11 / R22-11 / R23-11",
    input: "Lệnh Xóa Sector / Ghi Page / Đọc / So sánh / BlankCheck / Hủy từ Fee; xung nhịp thực thi bất đồng bộ Fls_MainFunction() từ SchM.",
    processing: "Kiểm tra căn chỉnh địa chỉ (SectorSize / PageSize), nhận Job Non-Blocking (MEMIF_BUSY), xử lý từng phần theo MEMIF_MODE_SLOW/FAST trong MainFunction, thực hiện Erase/Write Verification (chống ghi đè ô khác 0xFF).",
    output: "Cập nhật Data Flash vật lý (0x00080000); gọi Fee_JobEndNotification() / Fee_JobErrorNotification(); báo DEM FLS_E_ERASE/WRITE/READ/COMPARE_FAILED.",
    apis: ["Fls_Init()", "Fls_Erase()", "Fls_Write()", "Fls_Read()", "Fls_Compare()", "Fls_BlankCheck()", "Fls_Cancel()", "Fls_SetMode()", "Fls_GetStatus()", "Fls_GetJobResult()", "Fls_MainFunction()"]
  },
  MOD_HW: {
    name: "MCU Silicon Peripherals & Memory-Mapped Registers",
    sws: "Hardware Target Layer (TriCore / S32K / Cortex-R)",
    input: "Ghi/đọc trực tiếp vào thanh ghi ngoại vi từ 8 module MCAL và kích thích vật lý bên ngoài (điện áp cảm biến, khung CAN bus, công tắc).",
    processing: "PLL khóa pha nhân tần số; PCR định tuyến chân vật lý; SAR ADC lượng tử hóa 12-bit; Timer tạo xung PWM; QSPI dịch bit; FlexCAN truyền khung; Bơm HV nạp điện tích xóa/ghi Flash.",
    output: "Tín hiệu điện áp ra chân vật lý, khung điện áp CAN Bus, trạng thái nhớ Non-Volatile và các ngắt phần cứng (HW IRQ) báo ngược lên MCAL.",
    apis: ["PLL_SR[LOCK]", "RGM_DES/FES", "PCR[0..7]", "GPIO_PDOR/PDIR", "SAR_ADC_CDR", "FTM_CnV", "QSPI_PUSHR/POPR", "FLEXCAN_MB", "FLASH_MCR"]
  }
};

// 68 Abbreviations across 9 categories (ARCH:9, MCU:7, PORT:6, DIO:6, ADC:8, PWM:7, SPI:8, CAN:9, FLS:8)
const ABBREVIATIONS = [
  // ARCH (9)
  { abbr: "MCAL", full: "Microcontroller Abstraction Layer", cat: "ARCH", desc: "Lớp phần mềm thấp nhất của BSW truy cập trực tiếp các thanh ghi ngoại vi MCU (SWS_Mcu..SWS_Fls), giúp tầng trên độc lập phần cứng." },
  { abbr: "BSW", full: "Basic Software", cat: "ARCH", desc: "Toàn bộ phần mềm nền tảng dưới RTE gồm 3 tầng: Services Layer, ECU Abstraction Layer và MCAL (cộng Complex Drivers)." },
  { abbr: "SWC", full: "Software Component", cat: "ARCH", desc: "Thành phần phần mềm tầng ứng dụng (ASW). SWC KHÔNG bao giờ gọi trực tiếp API của MCAL mà giao tiếp qua RTE." },
  { abbr: "RTE", full: "Runtime Environment", cat: "ARCH", desc: "Lớp trung gian hiện thực hóa VFB, định tuyến lời gọi Port từ SWC xuống IoHwAb, COM, NvM và cung cấp SchM cho BSW." },
  { abbr: "IoHwAb", full: "I/O Hardware Abstraction", cat: "ARCH", desc: "Module tầng ECU Abstraction làm cầu nối giữa SWC (qua RTE) và Port/Dio/Adc/Pwm/Spi, thực hiện quy đổi đơn vị vật lý (mV, °C, %)." },
  { abbr: "EcuM", full: "ECU State Manager", cat: "ARCH", desc: "Module quản lý vòng đời ECU; thực thi EcuM_AL_DriverInitOne() khởi tạo 8 module MCAL và điều khiển Mcu_SetMode / PerformReset." },
  { abbr: "BswM", full: "Basic Software Mode Manager", cat: "ARCH", desc: "Module điều phối chế độ hoạt động BSW theo luật (Rules/Actions), phối hợp chuyển trạng thái với EcuM, CanSM, NvM." },
  { abbr: "DET", full: "Default Error Tracer", cat: "ARCH", desc: "Module ghi nhận lỗi phát triển (*_E_UNINIT, *_E_PARAM_*) khi MCAL phát hiện sai trình tự hoặc sai tham số gọi hàm." },
  { abbr: "DEM", full: "Diagnostic Event Manager", cat: "ARCH", desc: "Module quản lý sự kiện chẩn đoán; nhận Dem_SetEventStatus(FAILED) từ MCAL khi hỏng phần cứng silicon (ClockFail, FlsFail, SpiHwErr)." },

  // MCU (7)
  { abbr: "Mcu", full: "Microcontroller Driver (ModId 101)", cat: "MCU", desc: "Module MCAL cốt lõi điều khiển cây xung nhịp PLL, nguồn Reset, khởi tạo RAM Section và chế độ tiêu thụ điện CPU." },
  { abbr: "PLL", full: "Phase-Locked Loop", cat: "MCU", desc: "Mạch vòng khóa pha nhân tần số thạch anh fOSC (VD: 16 MHz) lên tần số cao fCPU (160 MHz), kiểm tra bằng Mcu_GetPllStatus()." },
  { abbr: "VCO", full: "Voltage-Controlled Oscillator", cat: "MCU", desc: "Bộ dao động điều khiển bằng điện áp nằm trong lõi PLL để tạo ra tần số nhân trước khi qua bộ chia đầu ra." },
  { abbr: "IRC / fOSC", full: "Internal RC / External Crystal Oscillator", cat: "MCU", desc: "Nguồn xung nhịp gốc ban đầu giúp CPU khởi động an toàn trước khi PLL khóa và thực hiện Mcu_DistributePllClock()." },
  { abbr: "Clock Tree", full: "MCU Clock Distribution Tree", cat: "MCU", desc: "Cây phân phối xung nhịp dùng các bộ chia Prescaler tạo ra fCPU, fBUS (Port/Dio/Spi), fCAN (FlexCAN) và fADC." },
  { abbr: "POR", full: "Power-On Reset", cat: "MCU", desc: "Nguyên nhân khởi động lại do mới cấp nguồn điện (MCU_POWER_ON_RESET), đọc được qua hàm Mcu_GetResetReason()." },
  { abbr: "HALT / STOP", full: "MCU Low-Power Modes (Mcu_ModeType)", cat: "MCU", desc: "Các chế độ tiết kiệm năng lượng thiết lập qua Mcu_SetMode(): HALT tắt xung CPU giữ PLL; STOP tắt cả PLL và dao động chính." },

  // PORT (6)
  { abbr: "Port", full: "Port Driver (ModId 124)", cat: "PORT", desc: "Module MCAL cấu hình toàn bộ chân Pin của chip qua Port_Init(), định tuyến Pin Mux và đổi hướng/mode chân lúc runtime." },
  { abbr: "PCR", full: "Pin Control Register", cat: "PORT", desc: "Thanh ghi phần cứng gắn với từng chân Pin dùng để chọn chức năng Multiplexer (ALT0..ALT7), Pull-Up/Down và Slew Rate." },
  { abbr: "Pin Mux", full: "Pin Multiplexing (ALT0..ALT7)", cat: "PORT", desc: "Cơ chế gán 1 chân vật lý trên vỏ chip đảm nhiệm 1 chức năng cụ thể: DIO, ADC, PWM, SPI hay CAN." },
  { abbr: "Pull-Up/Down", full: "Internal Pull-Up / Pull-Down Resistor", cat: "PORT", desc: "Điện trở kéo nội bộ cấu hình bởi PortPinInternalResistor giúp chống trạng thái lơ lửng (floating) trên chân Input." },
  { abbr: "Slew Rate", full: "Output Edge Transition Speed", cat: "PORT", desc: "Tốc độ chuyển cạnh lên/xuống của chân Output giúp cân bằng giữa tốc độ truyền tín hiệu cao và giảm nhiễu điện từ EMI." },
  { abbr: "RefreshDir", full: "Port_RefreshPortDirection()", cat: "PORT", desc: "API làm tươi lại thanh ghi hướng của tất cả các chân cố định (PortPinDirectionChangeable=FALSE) để chống lật bit do nhiễu EMC." },

  // DIO (6)
  { abbr: "Dio", full: "Digital I/O Driver (ModId 120)", cat: "DIO", desc: "Module MCAL đọc/ghi mức logic 0/1 đồng bộ và không trạng thái (không có Dio_Init). Phụ thuộc cấu hình chân của Port_Init()." },
  { abbr: "Dio_Channel", full: "Single Digital I/O Pin Channel", cat: "DIO", desc: "Định danh 1 chân đơn lẻ (VD: PA0 IgnSw, PA1 WarnLed) thao tác qua Dio_ReadChannel / WriteChannel / FlipChannel." },
  { abbr: "Dio_Port", full: "Hardware Digital I/O Port (8/16/32-bit)", cat: "DIO", desc: "Tập hợp toàn bộ các chân trong một cổng GPIO vật lý, đọc/ghi đồng loạt qua Dio_ReadPort / WritePort / MaskedWritePort." },
  { abbr: "ChannelGroup", full: "Dio_ChannelGroupType", cat: "DIO", desc: "Nhóm các chân liền kề trong cùng một Port (VD: 4 đèn LED Pin 4..7) dùng để xuất/đọc giá trị số nhị phân trong 1 lệnh." },
  { abbr: "Mask & Offset", full: "DioPortMask & DioPortOffset", cat: "DIO", desc: "Hai tham số cốt lõi của Dio_ChannelGroup: driver tự động dịch giá trị (val << offset) và che mặt nạ (& mask) để không chạm chân khác." },
  { abbr: "FlipChannel", full: "Dio_FlipChannel() Atomic Toggle", cat: "DIO", desc: "Hàm đảo tức thời mức logic chân Output (STD_HIGH <-> STD_LOW) trong một thao tác nguyên tử an toàn đa nhiệm." },

  // ADC (8)
  { abbr: "Adc", full: "Analog-to-Digital Driver (ModId 123)", cat: "ADC", desc: "Module MCAL điều khiển bộ chuyển đổi tương tự-số đọc cảm biến nhiệt độ, điện áp ắc-quy, áp suất theo nhóm kênh." },
  { abbr: "SAR ADC", full: "Successive Approximation Register ADC", cat: "ADC", desc: "Kiến trúc chuyển đổi ADC xấp xỉ liên tiếp phổ biến trên MCU ô tô (độ phân giải 10-bit hoặc 12-bit 0..4095)." },
  { abbr: "AdcGroup", full: "ADC Channel Group", cat: "ADC", desc: "Đơn vị quản lý cơ bản của AUTOSAR Adc: gom nhiều kênh dùng chung nguồn Trigger, chế độ chuyển đổi và Result Buffer." },
  { abbr: "EOC / EOS", full: "End of Conversion / End of Sequence", cat: "ADC", desc: "Cờ ngắt phần cứng báo bộ SAR đã lượng tử hóa xong 1 kênh (EOC) hoặc toàn bộ nhóm kênh (EOS) để kích callback IoHwAb." },
  { abbr: "SW/HW Trig", full: "ADC_TRIGG_SRC_SW / HW", cat: "ADC", desc: "Nguồn kích AdcGroup: SW Trigger gọi Adc_StartGroupConversion(); HW Trigger dùng xung Timer qua Adc_EnableHardwareTrigger()." },
  { abbr: "OneShot/Cont", full: "ADC_CONV_MODE_ONESHOT / CONTINUOUS", cat: "ADC", desc: "One-Shot chạy 1 lượt rồi dừng (về ADC_IDLE sau ReadGroup); Continuous tự lặp lại liên tục cho đến khi StopGroupConversion()." },
  { abbr: "Streaming", full: "ADC_ACCESS_MODE_STREAMING", cat: "ADC", desc: "Chế độ ghi liên tiếp N mẫu (AdcStreamingNumSamples) vào mảng tuyến tính (Linear) hoặc vòng tròn (Circular) giảm tần suất ngắt CPU." },
  { abbr: "ResultBuffer", full: "Adc_SetupResultBuffer()", cat: "ADC", desc: "Hàm bắt buộc tầng trên phải gọi để cấp địa chỉ mảng RAM chứa kết quả cho AdcGroup trước khi kích hoạt chuyển đổi (tránh lỗi 0x19)." },

  // PWM (7)
  { abbr: "Pwm", full: "Pulse Width Modulation Driver (ModId 121)", cat: "PWM", desc: "Module MCAL điều khiển bộ đếm Timer (FTM/eMIOS/GTM) phát xung điều chế độ rộng điều khiển quạt, van, motor, đèn LED." },
  { abbr: "Duty 0x8000", full: "16-bit Standardized Duty Cycle", cat: "PWM", desc: "Quy ước chuẩn AUTOSAR Pwm: 0x0000 = 0%, 0x4000 = 50%, 0x8000 = 100%, giúp SWC/IoHwAb độc lập độ phân giải Timer chip." },
  { abbr: "Period / Freq", full: "PWM Signal Period (us) & Frequency (Hz)", cat: "PWM", desc: "Thời gian toàn phần T của một chu kỳ xung (T = T_on + T_off). Tần số f = 1 / T (VD: 50 us tương ứng 20 kHz)." },
  { abbr: "Fixed/Var", full: "PWM_FIXED_PERIOD vs VARIABLE_PERIOD", cat: "PWM", desc: "Phân lớp kênh PWM: FIXED khóa chu kỳ (gọi SetPeriodAndDuty bị lỗi 0x13); VARIABLE cho phép đổi cả chu kỳ và Duty." },
  { abbr: "IdleState", full: "PwmPolarity & PwmIdleState", cat: "PWM", desc: "PwmPolarity chọn mức tích cực đầu chu kỳ; PwmIdleState (PWM_LOW/HIGH) là mức an toàn khi gọi Pwm_SetOutputToIdle()." },
  { abbr: "ShadowReg", full: "End-of-Period Shadow Register Update", cat: "PWM", desc: "Thanh ghi bóng giữ giá trị Duty/Period mới tới cuối chu kỳ hiện tại mới nạp vào bộ đếm (PwmDutycycleUpdatedEndperiod) để chống xung gai." },
  { abbr: "Pwm_Notif", full: "Pwm_EnableNotification() Edge IRQ", cat: "PWM", desc: "Cơ chế cho phép tạo ngắt phần cứng tại sườn lên (RISING), sườn xuống (FALLING) hoặc cả hai (BOTH_EDGES) của xung PWM." },

  // SPI (8)
  { abbr: "Spi", full: "SPI Handler / Driver (ModId 83)", cat: "SPI", desc: "Module MCAL truyền thông nối tiếp đồng bộ tốc độ cao với IC nguồn SBC, Watchdog ngoài, cảm biến gia tốc và External EEPROM." },
  { abbr: "MOSI/MISO/CS", full: "Master Out Slave In / Master In / Chip Select", cat: "SPI", desc: "4 đường tín hiệu vật lý của bus SPI: SCLK cấp xung đồng hồ, CS (Chip Select) chọn IC đích, MOSI truyền và MISO nhận đồng thời." },
  { abbr: "CPOL / CPHA", full: "Clock Polarity & Clock Phase", cat: "SPI", desc: "Hai tham số đồng bộ pha xung SCLK của SpiExternalDevice quyết định mức nghỉ của SCLK và cạnh lấy mẫu dữ liệu (Mode 0..3)." },
  { abbr: "SpiSequence", full: "SPI Sequence (Container of Jobs)", cat: "SPI", desc: "Đơn vị giao dịch cấp cao nhất gom 1 hoặc nhiều SpiJob thực thi liên tiếp, gắn với Spi_AsyncTransmit() & Spi_SeqEndNotification()." },
  { abbr: "SpiJob", full: "SPI Job (Single CS Activation)", cat: "SPI", desc: "Gom nhiều SpiChannel truyền liên tục trong 1 lần giữ chân CS=LOW, có tốc độ Baudrate riêng và độ ưu tiên SpiJobPriority (0..3)." },
  { abbr: "SpiChannel", full: "SPI Channel (Data Buffer Unit)", cat: "SPI", desc: "Đơn vị mang dữ liệu cơ bản của SPI gắn với độ rộng từ 8/16/32-bit, thứ tự dịch MSB/LSB và loại bộ đệm IB hoặc EB." },
  { abbr: "IB vs EB", full: "Internal Buffer vs External Buffer", cat: "SPI", desc: "IB nằm sẵn bên trong Spi Driver (Spi_WriteIB/ReadIB, hợp lệnh ngắn); EB dùng thẳng con trỏ RAM tầng trên (Spi_SetupEB, hợp dữ liệu lớn)." },
  { abbr: "SpiLevel", full: "SpiLevelDelivered (0 / 1 / 2)", cat: "SPI", desc: "LEVEL 0: chỉ đồng bộ (SyncTransmit); LEVEL 1: chỉ bất đồng bộ (AsyncTransmit); LEVEL 2: hỗ trợ cả Sync và Async kèm hàng đợi ưu tiên." },

  // CAN (9)
  { abbr: "Can", full: "CAN / CAN-FD Driver (ModId 80)", cat: "CAN", desc: "Module MCAL quản lý trực tiếp bộ điều khiển phần cứng FlexCAN/M_CAN, truyền nhận khung qua các hộp thư HOH và báo trạng thái lên CanIf." },
  { abbr: "CanIf", full: "CAN Interface (ECU Abstraction)", cat: "CAN", desc: "Module nằm ngay trên Can Driver giúp che giấu HOH/Controller khỏi PduR/CanTp/CanNm, quản lý hàng đợi Tx khi Can_Write trả về CAN_BUSY." },
  { abbr: "CanSM", full: "CAN State Manager", cat: "CAN", desc: "Module quản lý trạng thái mạng CAN (FULL_COM/SILENT/NO_COM) và thực hiện chu trình phục hồi L1/L2 khi Can báo CanIf_ControllerBusOff()." },
  { abbr: "HOH (HRH/HTH)", full: "Hardware Object Handle (Rx / Tx)", cat: "CAN", desc: "Định danh trừu tượng cho hộp thư RAM trên chip CAN: HRH (Hardware Receive Handle) dùng để nhận, HTH (Hardware Transmit Handle) dùng để truyền." },
  { abbr: "Full/BasicCAN", full: "FullCAN vs BasicCAN HOH", cat: "CAN", desc: "FullCAN lọc cứng 1 CAN ID duy nhất trên 1 hộp thư (tốc độ cao); BasicCAN dùng Mask lọc dải nhiều CAN ID chung một hộp thư/FIFO." },
  { abbr: "Mux Tx", full: "CanMultiplexedTransmission", cat: "CAN", desc: "Kỹ thuật gộp nhiều hộp thư Tx vật lý dưới 1 HTH sắp xếp theo độ ưu tiên CAN ID để chống nghẽn Priority Inversion trên bus." },
  { abbr: "CAN FD & BRS", full: "CAN Flexible Data-Rate & Bit Rate Switch", cat: "CAN", desc: "Chuẩn CAN mở rộng tải trọng tới 64 Bytes và tăng tốc độ vùng Data (BRS, VD: 500kbps -> 2Mbps); đánh dấu bằng bit 0x40000000 trong Can_IdType." },
  { abbr: "TEC / REC", full: "Transmit / Receive Error Counter", cat: "CAN", desc: "Hai bộ đếm lỗi phần cứng nội bộ của bộ điều khiển CAN (0..255+); xác định Error State: ACTIVE (<128), PASSIVE (128..255), BUSOFF (>=256)." },
  { abbr: "Bus-Off", full: "CAN_ERRORSTATE_BUSOFF (TEC >= 256)", cat: "CAN", desc: "Trạng thái tự cô lập khi node phát hiện quá nhiều lỗi truyền: phần cứng chuyển về CAN_CS_STOPPED và gọi ngay CanIf_ControllerBusOff()." },

  // FLS (8)
  { abbr: "Fls", full: "Flash Driver (ModId 92)", cat: "FLS", desc: "Module MCAL điều khiển xóa Sector và ghi/đọc/so sánh bộ nhớ Data Flash nội bộ theo cơ chế bất đồng bộ qua Fls_MainFunction()." },
  { abbr: "Fee", full: "Flash EEPROM Emulation", cat: "FLS", desc: "Module tầng ECU Abstraction chạy ngay trên Fls giúp giả lập EEPROM theo Block, thực hiện Wear Leveling để tăng tuổi thọ Flash." },
  { abbr: "Ea", full: "EEPROM Abstraction", cat: "FLS", desc: "Module tầng ECU Abstraction tương tự Fee nhưng điều khiển IC EEPROM ngoài thông qua Eep hoặc Spi Driver." },
  { abbr: "MemIf", full: "Memory Abstraction Interface", cat: "FLS", desc: "Lớp giao diện đồng nhất giữa NvM và nhiều thiết bị nhớ (Fee trên Fls nội và Ea trên EEPROM ngoài), định nghĩa MemIf_StatusType / JobResult." },
  { abbr: "NvM", full: "NVRAM Manager", cat: "FLS", desc: "Module tầng Memory Services cung cấp API NvM_ReadBlock/WriteBlock cho SWC và NvM_ReadAll/WriteAll cho EcuM/BswM." },
  { abbr: "Flash Sector", full: "Minimum Erase Unit (0xFF)", cat: "FLS", desc: "Khối ô nhớ nhỏ nhất có thể xóa đồng loạt về giá trị 0xFF (VD: 2048 Bytes); Fls_Erase() bắt buộc căn chỉnh theo FlsSectorSize." },
  { abbr: "Flash Page", full: "Minimum Write Unit (FlsPageSize)", cat: "FLS", desc: "Đơn vị ghi nhỏ nhất của phần cứng Flash (VD: 8 Bytes); địa chỉ và độ dài Fls_Write() phải chia hết cho FlsPageSize." },
  { abbr: "BlankCheck", full: "Fls_BlankCheck & Write Verification", cat: "FLS", desc: "Kiểm tra vùng nhớ đã ở trạng thái xóa 0xFF chưa (tránh ghi đè lỗi từ 0 lên 1) và đối chiếu lại dữ liệu sau ghi để phát hiện lỗi sớm." }
];
