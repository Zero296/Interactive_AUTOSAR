// ==================== PART 3: CONSTANTS, 2x8 REGISTERS, 36 ECUC TOOLTIPS, 12 MODULES & 52 ABBREVIATIONS ====================

const IOHWAB_SIG_BITS = [
  {
    bit: 7, key: "IOHWAB_INIT", hex: "0x80", label: "INIT", full: "IoHwAb Initialized (Module State)",
    desc: "bit 7 = 1 khi IoHwAb_Init(&IoHwAb_Config) hoàn tất sau Port/Adc/Pwm/Icu Init. Nếu = 0, mọi lệnh ghi PWM/DIO bị khóa an toàn và DET báo IOHWAB_E_UNINIT (0x01)."
  },
  {
    bit: 6, key: "ADC_VALID", hex: "0x40", label: "ADC_V", full: "ADC Group Conversion Valid",
    desc: "bit 6 = 1 khi Adc_GetGroupStatus() == ADC_STREAM_COMPLETED và Adc_ReadGroup() trả E_OK không có lỗi chuyển đổi hay ADC_E_BUSY."
  },
  {
    bit: 5, key: "RATIO_COMP", hex: "0x20", label: "RATIO", full: "5V Ratiometric Compensation Active",
    desc: "bit 5 = 1 khi IoHwAbEnableRatiometricCompensation bật và V_5V_Ref nằm trong cửa sổ hợp lệ, bù trừ sai số nguồn 5V sensor theo tỷ lệ 5000 / V_5V_Meas."
  },
  {
    bit: 4, key: "IIR_SETTLED", hex: "0x10", label: "IIR_OK", full: "IIR EMA Low-Pass Filter Settled",
    desc: "bit 4 = 1 khi bộ lọc thông thấp IIR EMA (y[n] = α·x[n] + (1−α)·y[n−1]) hội tụ (|inst - filtered| < 0.5%), hoặc khi IIR bypass."
  },
  {
    bit: 3, key: "DIO_DEBOUNCE", hex: "0x08", label: "DBNC", full: "DIO Debounce Filter Stable",
    desc: "bit 3 = 1 khi tín hiệu số đầu vào (vd: Brake Switch) đã giữ ổn định đủ thời gian IoHwAbDioDebounceTimeMs (mặc định 15ms) hoặc debounce tắt."
  },
  {
    bit: 2, key: "PWM_CLAMPED", hex: "0x04", label: "CLAMP", full: "PWM Duty Cycle Clamped to Safety Envelope",
    desc: "bit 2 = 1 khi SWC hoặc DCM yêu cầu duty cycle vượt biên IoHwAbPwmDutyClampRangePct (mặc định 5%..95%) và IoHwAb đã cắt giới hạn bảo vệ H-Bridge."
  },
  {
    bit: 1, key: "ICU_CAP", hex: "0x02", label: "ICU_OK", full: "ICU Signal Capture Active (No Stall)",
    desc: "bit 1 = 1 khi Icu_GetDutyCycleValues() / Icu_GetEdgeNumbers() thu nhận xung trong cửa sổ IoHwAbIcuTimeoutMs. = 0 khi stall/mất xung."
  },
  {
    bit: 0, key: "SIG_GOOD", hex: "0x01", label: "GOOD", full: "Overall Signal Qualifier == GOOD",
    desc: "bit 0 = 1 khi IoHwAb_SignalQuality == VALID/GOOD (không lỗi điện, không DET uninit, không FiM Safe-State). Nếu = 0, SWC nhận SignalStatus = E_NOT_OK / FAULT."
  }
];

const IOHWAB_DIAG_BITS = [
  {
    bit: 7, key: "SHORT_GND", hex: "0x80", label: "SC_GND", full: "Short-to-Ground (SCG) Detected",
    desc: "bit 7 = 1 khi điện áp ADC chân cảm biến < IoHwAbAdcShortToGndThrMv (mặc định < 250mV). Báo DEM PREFAILED -> FAILED và kích thay thế giá trị."
  },
  {
    bit: 6, key: "SHORT_BAT", hex: "0x40", label: "SC_BAT", full: "Short-to-Battery / Vref Detected",
    desc: "bit 6 = 1 khi điện áp ADC > IoHwAbAdcShortToBatThrMv (mặc định > 4750mV). Ngắt dữ liệu cảm biến thô để tránh hiểu nhầm 100% chân ga."
  },
  {
    bit: 5, key: "OPEN_LOAD", hex: "0x20", label: "OPEN_L", full: "Open-Load / Broken Wire Detected",
    desc: "bit 5 = 1 khi SmartFET/Driver phản hồi dòng tải = 0mA hoặc chân kéo thả hở mạch (Open Load). Báo Dem_SetEventStatus(EVENT_OPEN_LOAD)."
  },
  {
    bit: 4, key: "OVER_CURR", hex: "0x10", label: "OV_CUR", full: "Actuator Over-Current Hardware Fault",
    desc: "bit 4 = 1 khi dòng qua H-Bridge / SmartFET vượt IoHwAbActuatorOverCurrentLimitMa (mặc định > 8000mA). IoHwAb ép PWM -> 0x0000 (Idle) tức thời."
  },
  {
    bit: 3, key: "SUP_5V_FLT", hex: "0x08", label: "SUP_5V", full: "Sensor 5V Supply Out of Valid Window",
    desc: "bit 3 = 1 khi nguồn V_5V_Ref ngoài dải IoHwAbSupplyValidWindowMv (4750..5250mV). Dừng bù ratiometric và gắn cờ nghi ngờ chất lượng ADC."
  },
  {
    bit: 2, key: "DEM_FAULT", hex: "0x04", label: "DEM_FLT", full: "DEM Event Status == FAILED (Confirmed)",
    desc: "bit 2 = 1 khi bộ đếm debounce chẩn đoán đạt IoHwAbDiagDebounceTicks (mặc định 3 ticks), sự kiện DEM chuyển từ PREFAILED sang FAILED xác nhận."
  },
  {
    bit: 1, key: "FIM_SAFE", hex: "0x02", label: "FIM_INH", full: "FiM Function Permission Denied (Safe-State)",
    desc: "bit 1 = 1 khi FiM_GetFunctionPermission(FID_ACTUATOR) == FALSE do lỗi DEM liên quan. IoHwAb cưỡng bức Actuator về Idle 0x0000 (ưu tiên cao nhất)."
  },
  {
    bit: 0, key: "DCM_0x2F", hex: "0x01", label: "IO_0x2F", full: "DCM UDS 0x2F InputOutputControl Active",
    desc: "bit 0 = 1 khi DCM đang giữ quyền kiểm soát actuator qua UDS Service 0x2F (ShortTermAdjustment 0x03 hoặc FreezeCurrentState 0x02), bỏ qua lệnh từ SWC."
  }
];

const SIGNAL_CHANNELS_META = [
  {
    id: "CH0_ADC_PedalPos",
    name: "CH0 · PedalPos (ADC)",
    type: "Analog Input (12-bit)",
    mcalApi: "Adc_ReadGroup(GRP_PEDAL, &AdcRaw)",
    iohwabApi: "IoHwAb_PedalSensor_GetPhysVal(&PedalPct, &Qual)",
    rteApi: "Rte_Call_RpIoHwAb_Pedal_GetPhysVal()",
    unit: "%",
    direction: "MCAL → IoHwAb → RTE → SWC"
  },
  {
    id: "CH1_DIO_BrakeSw",
    name: "CH1 · BrakeSwitch (DIO)",
    type: "Digital Input (Active-Low)",
    mcalApi: "Dio_ReadChannel(DIO_CH_BRAKE_SW)",
    iohwabApi: "IoHwAb_BrakeSw_GetState(&IsPressed, &Qual)",
    rteApi: "Rte_Call_RpIoHwAb_BrakeSw_GetState()",
    unit: "Bool",
    direction: "MCAL → IoHwAb → RTE → SWC"
  },
  {
    id: "CH2_PWM_Throttle",
    name: "CH2 · ThrottleHBridge (PWM)",
    type: "PWM + Dir Output (0x8000)",
    mcalApi: "Pwm_SetDutyCycle(PWM_CH_THROTTLE, Duty15bit)",
    iohwabApi: "IoHwAb_ThrottleAct_SetDuty(TargetPct, Dir)",
    rteApi: "Rte_Call_RpIoHwAb_Throttle_SetDuty()",
    unit: "Hex15",
    direction: "SWC/DCM → IoHwAb → Pwm/Dio MCAL"
  },
  {
    id: "CH3_ICU_WheelSpeed",
    name: "CH3 · WheelSpeed (ICU)",
    type: "ICU Signal / Edge Capture",
    mcalApi: "Icu_GetDutyCycleValues(ICU_CH_WHEEL, &Duty)",
    iohwabApi: "IoHwAb_WheelSpeed_GetRpm(&Rpm, &DutyPct)",
    rteApi: "Rte_Call_RpIoHwAb_WheelSpd_GetRpm()",
    unit: "RPM",
    direction: "MCAL → IoHwAb → RTE → SWC"
  }
];

const configTooltipData = {
  // === TAB 0: 1. General ===
  IoHwAbInitialized: {
    title: "IoHwAbInitialized (BswM / EcuM State)",
    badge: "CORE · INIT", category: "1. General", type: "boolean", defaultVal: "true", swsId: "SWS_IoHwAb_00105 / 00119",
    meaning: "Trạng thái khởi tạo module IoHwAb sau khi EcuM_StartupTwo / BswM gọi IoHwAb_Init(&IoHwAb_Config).",
    effect: "Khi false (Uninit): IoHwAb khóa mọi ngõ ra Actuator về Idle, trả E_NOT_OK và báo Det_ReportError(254, 0, API_ID, IOHWAB_E_UNINIT).",
    dependency: "Phải được gọi SAU Port_Init, Adc_Init, Pwm_Init, Icu_Init để tránh đọc/ghi thanh ghi MCAL chưa cấp xung clock."
  },
  IoHwAbDevErrorDetect: {
    title: "IoHwAbDevErrorDetect",
    badge: "DET · DEV", category: "1. General", type: "boolean", defaultVal: "true", swsId: "ECUC_IoHwAb_00001 / SWS_IoHwAb_00060",
    meaning: "Bật/tắt cơ chế phát hiện lỗi phát triển (Development Error Tracer - Module ID 254) tại runtime.",
    effect: "Khi true: kiểm tra NULL pointer (0x02), kênh không hợp lệ (0x03), module chưa Init (0x01) và đẩy vào DET Trace Inspector.",
    dependency: "Trong sản phẩm Production thường tắt để tối ưu CPU, nhưng bật trong mô phỏng và tích hợp SIL/HIL."
  },
  IoHwAbVersionInfoApi: {
    title: "IoHwAbVersionInfoApi",
    badge: "API · STD", category: "1. General", type: "boolean", defaultVal: "false", swsId: "ECUC_IoHwAb_00002 / SWS_IoHwAb_00120",
    meaning: "Bật/tắt biên dịch hàm chuẩn IoHwAb_GetVersionInfo(Std_VersionInfoType* versioninfo).",
    effect: "Khi true: cho phép SWC hoặc BswM truy vấn VendorID, ModuleID (254) và SW Major/Minor/Patch version của IoHwAb.",
    dependency: "Nếu DevErrorDetect == true và truyền NULL pointer vào GetVersionInfo sẽ báo DET IOHWAB_E_PARAM_POINTER (0x02)."
  },
  IoHwAbMainFunctionPeriodMs: {
    title: "IoHwAbMainFunctionPeriodMs",
    badge: "SCHED · OS", category: "1. General", type: "integer (ms)", defaultVal: "5 ms", swsId: "ECUC_IoHwAb_00010 / OS Task",
    meaning: "Chu kỳ OS gọi hàm IoHwAb_MainFunction() (mặc định 5ms = 200Hz).",
    effect: "Quyết định độ phân giải bước thời gian của bộ đếm DIO Debounce (vd: 15ms = 3 ticks × 5ms), lọc IIR ADC và cập nhật ICU timeout.",
    dependency: "Phải là bội số của System Tick (thường 1ms, 5ms hoặc 10ms) và khớp với ngưỡng IoHwAbDioDebounceTimeMs."
  },
  IoHwAbSensorSupplyMeasuredMv: {
    title: "IoHwAbSensorSupplyMeasuredMv",
    badge: "HW · VREF", category: "1. General", type: "integer (mV)", defaultVal: "5000 mV", swsId: "Hardware Sensor Reference",
    meaning: "Điện áp nguồn tham chiếu 5V thực tế cấp cho các cảm biến ratiometric (Hall/Potentiometer), được đo qua kênh ADC nội bộ.",
    effect: "Khi nguồn sụt (vd 4600mV) hoặc tăng, giá trị thô cảm biến bị trôi tỷ lệ theo; IoHwAb dùng giá trị này để bù trừ ratiometric nếu nằm trong cửa sổ hợp lệ.",
    dependency: "Liên kết trực tiếp với IoHwAbSupplyValidWindowMv và IoHwAbEnableRatiometricCompensation."
  },
  IoHwAbSupplyValidWindowMv: {
    title: "IoHwAbSupplyValidWindowMv",
    badge: "DIAG · V5V", category: "1. General", type: "string (min..max mV)", defaultVal: "4750 .. 5250", swsId: "Safety Supply Monitor",
    meaning: "Cửa sổ điện áp hợp lệ của nguồn 5V cảm biến (thường 5.0V ± 5% = 4750..5250 mV).",
    effect: "Nếu V_5V_Ref ra ngoài dải này: bật bit SUP_5V_FLT (0x08), dừng bù ratiometric, báo DEM Event Supply Fault và gắn SignalQual = DEGRADED/INVALID.",
    dependency: "So sánh trực tiếp với IoHwAbSensorSupplyMeasuredMv tại mỗi chu kỳ MainFunction."
  },

  // === TAB 1: 2. Digital DIO ===
  IoHwAbDioActivePolarity: {
    title: "IoHwAbDioActivePolarity",
    badge: "DIO · POL", category: "2. Digital DIO", type: "enum", defaultVal: "ACTIVE_LOW", swsId: "IoHwAbDigitalSignalPolarity",
    meaning: "Quy định cực tính logic phần cứng tại chân vi điều khiển so với trạng thái logic trả về cho SWC.",
    effect: "ACTIVE_LOW (ví dụ Switch kéo GND khi nhấn): Dio_ReadChannel() == STD_LOW (0V) được IoHwAb đảo thành Logical Active = TRUE cho SWC (SWC không biết phần cứng kéo âm hay dương).",
    dependency: "Phải đồng bộ với điện trở kéo IoHwAbPortPinPullMode (Pull-up đi với Active-Low, Pull-down đi với Active-High)."
  },
  IoHwAbDioDebounceEnable: {
    title: "IoHwAbDioDebounceEnable",
    badge: "DIO · FLT", category: "2. Digital DIO", type: "boolean", defaultVal: "true", swsId: "IoHwAbDigitalDebounce",
    meaning: "Bật/tắt bộ lọc chống dội tiếp điểm cơ khí (Contact Bounce Suppression) cho tín hiệu Digital Input.",
    effect: "Khi true: tín hiệu thô từ Dio_ReadChannel phải duy trì ổn định liên tiếp đủ ngưỡng thời gian trước khi giá trị logic gửi lên SWC đổi trạng thái.",
    dependency: "Sử dụng bộ đếm dựa trên IoHwAbDioDebounceTimeMs và IoHwAbMainFunctionPeriodMs."
  },
  IoHwAbDioDebounceTimeMs: {
    title: "IoHwAbDioDebounceTimeMs",
    badge: "DIO · TIME", category: "2. Digital DIO", type: "integer (ms)", defaultVal: "15 ms", swsId: "IoHwAbDebounceDuration",
    meaning: "Thời gian yêu cầu tín hiệu DIO ổn định (ms) trước khi xác nhận chuyển trạng thái.",
    effect: "Với MainFunction = 5ms và Debounce = 15ms, bộ đếm cần 3 chu kỳ (15/5 = 3 ticks) ổn định. Xung nhiễu ngắn (<15ms) sẽ bị loại bỏ, bit DIO_DEBOUNCE = 0 trong lúc quá độ.",
    dependency: "Đặt bằng 0 hoặc tắt DebounceEnable nếu đọc xung tốc độ cao."
  },
  IoHwAbPortPinPullMode: {
    title: "IoHwAbPortPinPullMode",
    badge: "PORT · CFG", category: "2. Digital DIO", type: "enum", defaultVal: "PORT_PIN_IN_PULL_UP", swsId: "ECUC_Port_00131 / PortPinPullMode",
    meaning: "Cấu hình điện trở kéo nội (Pull-up / Pull-down / No-Pull) tại MCAL Port Driver cho chân DIO đầu vào.",
    effect: "PULL_UP giúp tránh trạng thái trôi nổi (floating pin) khi công tắc hở mạch (đọc ổn định ở mức STD_HIGH 5V/3.3V cho đến khi công tắc đóng xuống GND).",
    dependency: "Khởi tạo một lần trong Port_Init(); cảnh báo nếu dùng PULL_UP với logic ACTIVE_HIGH hoặc ngược lại."
  },
  IoHwAbDioOutputReadbackVerify: {
    title: "IoHwAbDioOutputReadbackVerify",
    badge: "DIO · SAFE", category: "2. Digital DIO", type: "boolean", defaultVal: "true", swsId: "Safety Output Verification",
    meaning: "Kích hoạt cơ chế đọc lại chân ngõ ra ngay sau khi gọi Dio_WriteChannel() để kiểm tra chân không bị kẹt (Stuck-at Fault).",
    effect: "Khi true: nếu IoHwAb ghi STD_HIGH ra Relay nhưng Dio_ReadChannel() đọc về STD_LOW (ngắn mạch xuống mass), IoHwAb phát hiện lỗi Readback mismatch và báo DEM.",
    dependency: "Yêu cầu chân MCU hỗ trợ đọc thanh ghi input buffer khi đang ở hướng PORT_PIN_OUT."
  },
  PortPinDirectionChangeable: {
    title: "PortPinDirectionChangeable",
    badge: "PORT · DIR", category: "2. Digital DIO", type: "boolean", defaultVal: "false", swsId: "ECUC_Port_00126 / SWS_Port_00137",
    meaning: "Cho phép (hoặc cấm) gọi Port_SetPinDirection() để đổi hướng chân IN <-> OUT tại runtime.",
    effect: "Mặc định false (an toàn ASIL): ngăn code lỗi đổi nhầm chân xuất PWM/DIO thành chân Input hoặc ngược lại làm ngắn mạch driver.",
    dependency: "Nếu cần bus 1-wire hai chiều hoặc kiểm tra pull-up động mới bật true."
  },

  // === TAB 2: 3. Analog ADC ===
  AdcGroupTriggSrc: {
    title: "AdcGroupTriggSrc",
    badge: "ADC · TRIG", category: "3. Analog ADC", type: "enum", defaultVal: "ADC_TRIGG_SRC_SW", swsId: "ECUC_Adc_00073 / SWS_Adc_00277",
    meaning: "Nguồn kích hoạt quá trình chuyển đổi của nhóm kênh ADC (Software Trigger từ OS Task hoặc Hardware Trigger từ Timer/PWM).",
    effect: "SW Trigger: IoHwAb hoặc ScheduleTable gọi Adc_StartGroupConversion() định kỳ. HW Trigger: Timer đồng bộ chuyển đổi chính giữa chu kỳ PWM (giảm nhiễu đóng cắt FET).",
    dependency: "Trong kịch bản SW Trigger, IoHwAb kiểm tra Adc_GetGroupStatus() tránh gọi chồng lệnh gây ADC_E_BUSY."
  },
  AdcResolutionBits: {
    title: "AdcResolutionBits",
    badge: "ADC · RES", category: "3. Analog ADC", type: "enum (bits)", defaultVal: "12-bit (0..4095)", swsId: "ECUC_Adc_00083 / AdcChannelResolution",
    meaning: "Độ phân giải lượng tử hóa của bộ chuyển đổi ADC phần cứng (12-bit Max=4095 hoặc 10-bit Max=1023).",
    effect: "Thay đổi trực tiếp công thức chuẩn hóa ADC_Raw -> mV: Pin_mV = (Raw / MaxCount) * 5000. Ở 2500mV, 12-bit cho Raw=2048, còn 10-bit cho Raw=512.",
    dependency: "Độ phân giải 12-bit (~1.22mV/LSB ở 5V) giúp phát hiện chính xác hơn ngưỡng ngắn mạch 250mV."
  },
  IoHwAbEnableRatiometricCompensation: {
    title: "IoHwAbEnableRatiometricCompensation",
    badge: "ADC · SCALE", category: "3. Analog ADC", type: "boolean", defaultVal: "true", swsId: "IoHwAbSignalScaling / Ratiometric",
    meaning: "Bật/tắt bù trừ tỷ lệ theo nguồn nuôi cảm biến V_5V_Ref thực tế.",
    effect: "Với cảm biến Hall/biến trở ăn nguồn 5V, khi V_5V sụt từ 5.0V xuống 4.8V, điện áp đọc được giảm 4%. Bù trừ V_comp = V_meas * (5000 / V_5V_meas) giữ kết quả % ổn định tuyệt đối!",
    dependency: "Chỉ thực hiện khi V_5V_meas nằm trong IoHwAbSupplyValidWindowMv."
  },
  IoHwAbPcbVoltageDividerGainOffset: {
    title: "IoHwAbPcbVoltageDividerGainOffset",
    badge: "ADC · PHYS", category: "3. Analog ADC", type: "string (gain / offset)", defaultVal: "0.025 / -12.5", swsId: "Linear Scaling Gain & Offset",
    meaning: "Hệ số chuyển đổi tuyến tính từ mV đã hiệu chỉnh sang giá trị vật lý (%): Phys = V_comp * Gain + Offset.",
    effect: "Mặc định 0.025 / -12.5 ứng với chuẩn cảm biến 500mV..4500mV -> 0%..100% (vùng 0..250mV và 4750..5000mV là vùng chết chẩn đoán đứt dây/ngắn mạch!).",
    dependency: "Cũng phản ánh hệ số cầu chia áp PCB (Voltage Divider) trước khi đưa vào chân MCU."
  },
  IoHwAbAdcIirFilterEnable: {
    title: "IoHwAbAdcIirFilterEnable",
    badge: "ADC · DSP", category: "3. Analog ADC", type: "boolean", defaultVal: "true", swsId: "IoHwAbAnalogLowPassFilter",
    meaning: "Bật/tắt bộ lọc thông thấp số IIR Exponential Moving Average (EMA) ngay trong tầng IoHwAb.",
    effect: "Khi true: làm mượt nhiễu xung EMI cao tần trên đường dây cảm biến theo công thức y[n] = α·x[n] + (1−α)·y[n−1] trước khi đưa qua RTE lên SWC.",
    dependency: "Điều chỉnh độ nhạy lọc qua hệ số IoHwAbAdcIirAlphaCoeff (α)."
  },
  IoHwAbAdcIirAlphaCoeff: {
    title: "IoHwAbAdcIirAlphaCoeff",
    badge: "ADC · EMA α", category: "3. Analog ADC", type: "float (0.05..1.0)", defaultVal: "0.40", swsId: "IIR Filter Coefficient",
    meaning: "Trọng số mẫu mới α trong bộ lọc IIR (0 < α ≤ 1.0).",
    effect: "α nhỏ (vd 0.15): lọc nhiễu cực mượt nhưng trễ đáp ứng bước nhảy (step response chậm). α lớn (vd 0.8 hoặc 1.0): bám sát tức thời nhưng ít lọc nhiễu.",
    dependency: "Trong stepClockTick(), bộ lọc tiến dần tới giá trị mới; bit IIR_SETTLED = 1 khi sai lệch < 0.5%."
  },

  // === TAB 3: 4. PWM Bridge ===
  IoHwAbPwmDefaultPeriodHz: {
    title: "IoHwAbPwmDefaultPeriodHz",
    badge: "PWM · FREQ", category: "4. PWM Bridge", type: "integer (Hz)", defaultVal: "2000 Hz", swsId: "ECUC_Pwm_00124 / PwmPeriodDefault",
    meaning: "Tần số sóng mang PWM mặc định (Hz) cấu hình cho kênh MCAL PWM (2000Hz -> chu kỳ 500 µs).",
    effect: "Ảnh hưởng đến độ gợn dòng điện qua cuộn dây Motor bướm ga và tổn hao chuyển mạch MOSFET trên cầu H.",
    dependency: "Một số driver yêu cầu tần số tối thiểu >1kHz để tránh tiếng rít cơ khí hoặc rung van."
  },
  IoHwAbPwmDutyClampEnable: {
    title: "IoHwAbPwmDutyClampEnable",
    badge: "PWM · SAFE", category: "4. PWM Bridge", type: "boolean", defaultVal: "true", swsId: "Safety Duty Cycle Clamping",
    meaning: "Bật/tắt giới hạn kẹp biên độ Duty Cycle bảo vệ phần cứng H-Bridge (Bootstrap Capacitor Charge).",
    effect: "Nhiều mạch driver cầu H cần tối thiểu 5% thời gian thấp để nạp tụ bootstrap và tối đa 95% để phát hiện lỗi; bật clamp sẽ kẹp 99% -> 95% và bật bit PWM_CLAMPED.",
    dependency: "Dùng khoảng biên khai báo trong IoHwAbPwmDutyClampRangePct."
  },
  IoHwAbPwmDutyClampRangePct: {
    title: "IoHwAbPwmDutyClampRangePct",
    badge: "PWM · MIN/MAX", category: "4. PWM Bridge", type: "string (min..max %)", defaultVal: "5.0 .. 95.0", swsId: "Duty Envelope Bounds",
    meaning: "Giới hạn dưới và trên (%) cho phép xuất xung ra cầu H khi ở chế độ điều khiển bình thường.",
    effect: "Ví dụ nhập 5.0 .. 95.0: lệnh 2% (khác 0%) bị nâng lên 5% (hoặc 0% hẳn khi Idle), lệnh 98% bị kẹp xuống 95% (0x799A trong hệ 0x8000).",
    dependency: "Không áp dụng cho trạng thái Idle An toàn (0x0000) khi FiM hoặc Over-Current ép tắt."
  },
  PwmPolarityAndIdleState: {
    title: "PwmPolarityAndIdleState",
    badge: "PWM · POL", category: "4. PWM Bridge", type: "enum", defaultVal: "PWM_HIGH / IDLE_LOW", swsId: "ECUC_Pwm_00125 / 00126",
    meaning: "Cực tính xung active (Active-High hay Active-Low) và mức điện áp chân khi gọi Pwm_SetOutputToIdle().",
    effect: "PWM_HIGH / IDLE_LOW đảm bảo khi có sự cố mất nguồn kích hoặc FiM Safe-State, chân vi điều khiển kéo xuống 0V để ngắt hoàn toàn MOSFET công suất.",
    dependency: "Gọi Pwm_SetOutputToIdle() trong kịch bản FiM Inhibit (S11) và Over-Current (S10)."
  },
  PwmDutycycleUpdatedEndperiod: {
    title: "PwmDutycycleUpdatedEndperiod",
    badge: "PWM · SYNC", category: "4. PWM Bridge", type: "boolean", defaultVal: "true", swsId: "ECUC_Pwm_00133 / SWS_Pwm_00017",
    meaning: "Đồng bộ cập nhật Duty Cycle mới vào cuối chu kỳ PWM hiện tại (Double-Buffered Shadow Register).",
    effect: "Khi true: ngăn chặn hiện tượng méo xung (glitch) hay hai MOSFET cùng nhánh dẫn thông (shoot-through) khi SWC đổi duty đột ngột giữa chu kỳ.",
    dependency: "Tính năng phần cứng Timer Reload của MCU được MCAL PWM bật khi Init."
  },
  IoHwAbHBridgeDriveMode: {
    title: "IoHwAbHBridgeDriveMode",
    badge: "ACT · DRV", category: "4. PWM Bridge", type: "enum", defaultVal: "PWM_PLUS_DIR_AND_EN", swsId: "H-Bridge Abstraction",
    meaning: "Kiểu giao tiếp điều khiển mạch cầu H (1 kênh PWM + chân DIO Dir/Enable hoặc 2 kênh PWM bán cầu độc lập).",
    effect: "IoHwAb ẩn hoàn toàn chi tiết phần cứng này: SWC chỉ gửi tốc độ/hướng (+80% Thuận / -40% Nghịch), IoHwAb tự phân tách ra Dio_WriteChannel(DIR) + Pwm_SetDutyCycle().",
    dependency: "Phối hợp cả MCAL Dio và MCAL Pwm trong cùng một Atomic sequence."
  },

  // === TAB 4: 5. ICU Capture ===
  IcuMeasurementMode: {
    title: "IcuMeasurementMode",
    badge: "ICU · MODE", category: "5. ICU Capture", type: "enum", defaultVal: "ICU_MODE_SIGNAL_MEASUREMENT", swsId: "ECUC_Icu_00222 / SWS_Icu_00277",
    meaning: "Chế độ hoạt động của kênh Input Capture Unit (đo Period/Duty bằng phần cứng Timer hoặc đếm số cạnh xung Edge Counter).",
    effect: "SIGNAL_MEASUREMENT cho phép gọi Icu_GetDutyCycleValues() lấy trực tiếp ActiveTime & PeriodTime ticks để tính tần số (Hz) và độ rộng xung.",
    dependency: "Sử dụng xung chuẩn Timer 1 MHz (1 tick = 1 µs) trong trình mô phỏng."
  },
  IcuDefaultStartEdge: {
    title: "IcuDefaultStartEdge",
    badge: "ICU · EDGE", category: "5. ICU Capture", type: "enum", defaultVal: "ICU_RISING_EDGE", swsId: "ECUC_Icu_00220 / SWS_Icu_00095",
    meaning: "Cạnh kích khởi mặc định để bộ đếm ICU bắt đầu chu kỳ đo (Cạnh lên, Cạnh xuống hoặc Cả hai cạnh).",
    effect: "RISING_EDGE: một chu kỳ được tính từ cạnh lên thứ nhất đến cạnh lên tiếp theo; ActiveTime tính từ cạnh lên đến cạnh xuống.",
    dependency: "Ảnh hưởng tới Icu_SetActivationCondition() khi khởi động đo."
  },
  IoHwAbSpeedSensorTeethCount: {
    title: "IoHwAbSpeedSensorTeethCount",
    badge: "ICU · RPM", category: "5. ICU Capture", type: "integer (teeth/rev)", defaultVal: "20 teeth", swsId: "Wheel Tone Ring Conversion",
    meaning: "Số răng của đĩa cảm biến tốc độ bánh xe/trục cam (Tone Wheel) gắn trên trục quay.",
    effect: "IoHwAb chuyển đổi tần số xung MCAL thành RPM vật lý theo công thức: RPM = (Freq_Hz × 60) / TeethCount. (VD: 500Hz / 20 răng × 60 = 1500 RPM).",
    dependency: "SWC chỉ nhận kết quả RPM vật lý thay vì phải tự biết phần cứng đĩa encoder có bao nhiêu răng."
  },
  IoHwAbIcuTimeoutMs: {
    title: "IoHwAbIcuTimeoutMs",
    badge: "ICU · STALL", category: "5. ICU Capture", type: "integer (ms)", defaultVal: "50 ms", swsId: "Zero-Speed / Stall Detection",
    meaning: "Thời gian chờ tối đa (ms) không thấy cạnh xung mới trước khi IoHwAb kết luận trục đứng yên (0 RPM) hoặc đứt cảm biến tốc độ.",
    effect: "Nếu không có cạnh xung vượt quá Timeout (hoặc Freq = 0Hz), bit ICU_CAP = 0 và giá trị RPM về 0 thay vì giữ kẹt giá trị cũ mãi.",
    dependency: "Tần số tối thiểu đo được xấp xỉ 1000 / TimeoutMs Hz (vd 50ms -> min 20Hz = 60 RPM)."
  },

  // === TAB 5: 6. Diag & 0x2F ===
  IoHwAbAdcShortToGndThrMv: {
    title: "IoHwAbAdcShortToGndThrMv",
    badge: "DIAG · SCG", category: "6. Diag & 0x2F", type: "integer (mV)", defaultVal: "250 mV", swsId: "Electrical Diagnostic Low Thr",
    meaning: "Ngưỡng điện áp dưới (mV) để phân biệt vùng hoạt động bình thường với lỗi Chạm Mass / Đứt dây kéo xuống GND (Short-to-GND).",
    effect: "Nếu V_meas < 250mV: gắn cờ SHORT_GND (0x80), đẩy Dem_SetEventStatus(PREFAILED), và thay thế đầu ra khi lỗi được xác nhận.",
    dependency: "Phải nhỏ hơn mức điện áp tối thiểu hợp lệ của cảm biến (500mV)."
  },
  IoHwAbAdcShortToBatThrMv: {
    title: "IoHwAbAdcShortToBatThrMv",
    badge: "DIAG · SCB", category: "6. Diag & 0x2F", type: "integer (mV)", defaultVal: "4750 mV", swsId: "Electrical Diagnostic High Thr",
    meaning: "Ngưỡng điện áp trên (mV) để phát hiện lỗi Chạm Nguồn / Vref (Short-to-Battery).",
    effect: "Nếu V_meas > 4750mV: gắn cờ SHORT_BAT (0x40), cảnh báo nguy hiểm (tránh xe hiểu nhầm chân ga 100%) và kích hoạt DEM Debounce.",
    dependency: "Phải lớn hơn mức điện áp tối đa hợp lệ của cảm biến (4500mV)."
  },
  IoHwAbActuatorOverCurrentLimitMa: {
    title: "IoHwAbActuatorOverCurrentLimitMa",
    badge: "DIAG · OCP", category: "6. Diag & 0x2F", type: "integer (mA)", defaultVal: "8000 mA", swsId: "SmartFET Over-Current Protection",
    meaning: "Ngưỡng dòng tải tối đa cho phép qua cầu H / SmartFET (mA).",
    effect: "Khi dòng phản hồi ISENSE vượt ngưỡng (vd 9500mA > 8000mA): bật cờ OVER_CURR (0x10), ngắt khẩn cấp Pwm_SetOutputToIdle() để chống cháy MOSFET và báo DEM.",
    dependency: "Kiểm tra song song với trạng thái Open-Load (0mA khi đang lái PWM)."
  },
  IoHwAbFaultSubstStrategy: {
    title: "IoHwAbFaultSubstStrategy",
    badge: "SAFE · SUB", category: "6. Diag & 0x2F", type: "enum", defaultVal: "USE_REPLACEMENT_VALUE", swsId: "Sensor Fault Substitution Policy",
    meaning: "Chiến lược xử lý tín hiệu gửi lên SWC khi cảm biến đầu vào bị xác nhận lỗi điện (DEM FAILED).",
    effect: "USE_REPLACEMENT_VALUE: trả giá trị an toàn cấu hình sẵn (vd 10% Limp-Home). HOLD_LAST_VALID: giữ giá trị tốt cuối cùng. PASS_RAW_WITH_FAULT_FLAG: truyền nguyên kèm Qual=FAULT.",
    dependency: "Dùng thông số IoHwAbSensorReplacementValuePct khi chọn USE_REPLACEMENT_VALUE."
  },
  IoHwAbSensorReplacementValuePct: {
    title: "IoHwAbSensorReplacementValuePct",
    badge: "SAFE · VAL", category: "6. Diag & 0x2F", type: "float (%)", defaultVal: "10.0 %", swsId: "Safe Fallback Physical Value",
    meaning: "Giá trị vật lý thay thế mặc định (%) cấp cho SWC khi cảm biến Pedal bị lỗi nặng và chính sách là USE_REPLACEMENT_VALUE.",
    effect: "Thường chọn mức nhỏ an toàn (0%..10% Limp-Home) để xe không tăng tốc ngoài ý muốn khi cảm biến hỏng.",
    dependency: "Chỉ có tác dụng khi DEM Fault đã được xác nhận và strategy == USE_REPLACEMENT_VALUE."
  },
  IoHwAbDiagDebounceTicks: {
    title: "IoHwAbDiagDebounceTicks",
    badge: "DEM · DBNC", category: "6. Diag & 0x2F", type: "integer (ticks)", defaultVal: "3 ticks", swsId: "Counter-based Fault Qualification",
    meaning: "Số lần liên tiếp IoHwAb phát hiện lỗi phần cứng trước khi lỗi được xác nhận (Qualified FAILED) và kích hoạt giá trị thay thế.",
    effect: "Mỗi lần đọc thấy áp ngoài biên, bộ đếm tăng +1 gửi DEM_EVENT_STATUS_PREFAILED; đủ 3 ticks thì gửi DEM_EVENT_STATUS_FAILED và khóa cờ lỗi.",
    dependency: "Ngăn nhiễu nhất thời (1 tick transient) kích hoạt sai Limp-Home."
  },
  IoHwAbEnableFiMSafeStateCheck: {
    title: "IoHwAbEnableFiMSafeStateCheck",
    badge: "FIM · ASIL", category: "6. Diag & 0x2F", type: "boolean", defaultVal: "true", swsId: "SWS_Fim_00011 / Safety Mux",
    meaning: "Bật kiểm tra FiM_GetFunctionPermission(FID) ngay trong vòng lặp xuất Actuator của IoHwAb.",
    effect: "Khi true và FiM trả FALSE (Permission Denied): IoHwAb cưỡng bức Actuator về Idle 0x0000 ngay cả khi SWC hoặc Tester DCM 0x2F đang ra lệnh xuất xung!",
    dependency: "Ưu tiên cao nhất trong chuỗi Actuator Multiplexer (ISO 26262 Fail-Safe Override)."
  },
  IoHwAbEnableDcm0x2FControl: {
    title: "IoHwAbEnableDcm0x2FControl",
    badge: "DCM · 0x2F", category: "6. Diag & 0x2F", type: "boolean", defaultVal: "true", swsId: "ISO 14229-1 UDS 0x2F / SWS_Dcm",
    meaning: "Cho phép DCM (Diagnostic Communication Manager) ghi đè tín hiệu I/O thông qua dịch vụ UDS InputOutputControlByIdentifier (0x2F).",
    effect: "Hỗ trợ 4 hành động chuẩn: ReturnControlToECU (0x00), ResetToDefault (0x01), FreezeCurrentState (0x02), ShortTermAdjustment (0x03).",
    dependency: "Bị vô hiệu hóa tức thời nếu FiM Safe-State == DENIED hoặc quá tải Over-Current."
  }
};

const MODULES_INFO = {
  MOD_SWC_APP: {
    name: "SWC_App (Application SWC)",
    layer: "Application Layer",
    sws: "AUTOSAR VFB / RTE Port Interface",
    role: "Điều khiển nghiệp vụ ứng dụng xe (vd: TorqueRequest, CruiseControl). Chỉ làm việc bằng đơn vị vật lý thuần túy (%, RPM, Bool), hoàn toàn độc lập phần cứng.",
    inputs: "Nhận giá trị PedalPct, BrakePressed, WheelRpm đã lọc & bù từ SWC_SensorActuator hoặc RTE S/R port.",
    outputs: "Gửi lệnh mong muốn (TargetThrottlePct = 50%..80%) qua RTE tới SWC_SensorActuator.",
    color: "#38bdf8"
  },
  MOD_SWC_SA: {
    name: "SWC_SensorActuator",
    layer: "Application Layer (Sensor/Actuator SWC)",
    sws: "AUTOSAR Sensor/Actuator SW-C Pattern",
    role: "Cầu nối logic trong tầng Application chuyên gọi Client-Server interface qua RTE xuống IoHwAb để lấy dữ liệu cảm biến hoặc đẩy lệnh điều khiển cơ cấu chấp hành.",
    inputs: "Rte_Call_RpIoHwAb_Pedal_GetPhysVal(&Pct, &Qual), Rte_Call_RpIoHwAb_BrakeSw_GetState(), Target từ SWC_App.",
    outputs: "Rte_Call_RpIoHwAb_Throttle_SetDuty(TargetPct, Dir) đẩy xuống IoHwAb.",
    color: "#818cf8"
  },
  MOD_RTE: {
    name: "RTE (Runtime Environment)",
    layer: "RTE Layer (Virtual Functional Bus Realization)",
    sws: "SWS_Rte · Standardized Client-Server Mapping",
    role: "Ánh xạ các lời gọi port Rte_Call_* độc lập phần cứng của SWC sang hàm C cụ thể của IoHwAb (ví dụ IoHwAb_PedalSensor_GetPhysVal).",
    inputs: "Client-Server requests từ SWC_SensorActuator.",
    outputs: "Trực tiếp invoke các Server Runnables của IoHwAb và trả kết quả (E_OK / E_NOT_OK).",
    color: "#a855f7"
  },
  MOD_IOHWAB: {
    name: "IoHwAb (I/O Hardware Abstraction)",
    layer: "ECU Abstraction Layer (Centerpiece)",
    sws: "AUTOSAR_SWS_IOHardwareAbstraction (Mod ID 254)",
    role: "Module trung tâm ẩn toàn bộ chi tiết phần cứng (chân MCU, độ phân giải 12-bit, cực tính Active-Low, 0x8000 PWM) và cung cấp giao diện tín hiệu thống nhất cho SWC qua RTE.",
    inputs: "MCAL Raw (Adc_ReadGroup, Dio_ReadChannel, Icu_GetDutyCycleValues), lệnh SWC qua RTE, DCM 0x2F DID control, FiM Permission, BswM/EcuM Init.",
    outputs: "MCAL Write (Pwm_SetDutyCycle, Pwm_SetOutputToIdle, Dio_WriteChannel), Dem_SetEventStatus, Det_ReportError, Physical Values & Qualifiers lên RTE.",
    color: "#22c55e"
  },
  MOD_BSWM_ECUM: {
    name: "EcuM / BswM (Init & Mode Ctrl)",
    layer: "System Services Layer",
    sws: "SWS_EcuM / SWS_BswM",
    role: "Điều phối trình tự khởi động MCU: gọi Port_Init -> Adc/Pwm/Icu_Init trước, rồi mới gọi IoHwAb_Init(&IoHwAb_Config); gọi IoHwAb_DeInit() khi Shutdown.",
    inputs: "Wakeup / Ignition OFF / EcuM StartupTwo phase.",
    outputs: "IoHwAb_Init(), IoHwAb_DeInit(), OS Task kích hoạt IoHwAb_MainFunction(5ms).",
    color: "#eab308"
  },
  MOD_DEM_FIM: {
    name: "DEM & FiM (Diag Event & Function Inhibition)",
    layer: "Diagnostic & Safety Services",
    sws: "SWS_Dem / SWS_Fim",
    role: "DEM nhận trạng thái PREFAILED/FAILED từ IoHwAb (Short-to-GND/Bat, Over-Current, Readback error); FiM ánh xạ DTC thành quyền FID_ACTUATOR để khóa Actuator.",
    inputs: "Dem_SetEventStatus(EventId, PREFAILED/FAILED/PASSED) từ IoHwAb.",
    outputs: "FiM_GetFunctionPermission(FID_ACTUATOR) trả FALSE -> IoHwAb ép PWM về 0x0000 Safe-State.",
    color: "#ef4444"
  },
  MOD_DCM: {
    name: "DCM (UDS 0x2F IO Control)",
    layer: "Diagnostic Communication Manager",
    sws: "ISO 14229-1 Service 0x2F / SWS_Dcm",
    role: "Cho phép máy chẩn đoán OBD/Tester điều khiển trực tiếp Actuator/Sensor trong gara thông qua dịch vụ InputOutputControlByIdentifier (0x2F).",
    inputs: "Tester request: 2F [DID] [ControlParam: 0x00..0x03] [OverrideVal].",
    outputs: "IoHwAb_Dcm_ShortTermAdjustment(), FreezeCurrentState(), ResetToDefault(), ReturnControlToECU().",
    color: "#f97316"
  },
  MOD_DET: {
    name: "DET (Default Error Tracer)",
    layer: "System Diagnostic Service",
    sws: "SWS_Det · Module ID 254 (IoHwAb)",
    role: "Ghi nhận lỗi lập trình/cấu hình sai tại thời điểm phát triển (Uninit, Null Ptr, Invalid Channel/Value, Busy).",
    inputs: "Det_ReportError(254, 0, ApiId, ErrorId) từ IoHwAb khi IoHwAbDevErrorDetect == TRUE.",
    outputs: "Lưu vào vòng đệm lỗi phát triển và đánh dấu cờ cảnh báo trong Inspector.",
    color: "#ec4899"
  },
  MOD_PORT_DIO: {
    name: "Port & Dio Driver (MCAL)",
    layer: "Microcontroller Abstraction Layer",
    sws: "SWS_Port / SWS_Dio",
    role: "Port cấu hình hướng chân, mode (ADC/PWM/ICU/GPIO) và pull-up/down lúc Init. Dio đọc/ghi mức STD_LOW/STD_HIGH tại runtime.",
    inputs: "Port_Init(), Dio_ReadChannel(ch), Dio_WriteChannel(ch, level) từ IoHwAb.",
    outputs: "Mức logic vật lý chân GPIO và giá trị đọc lại Readback.",
    color: "#06b6d4"
  },
  MOD_ADC: {
    name: "Adc Driver (MCAL)",
    layer: "Microcontroller Abstraction Layer",
    sws: "SWS_Adc",
    role: "Điều khiển ngoại vi SAR-ADC: kích hoạt chuyển đổi nhóm kênh SW/HW Trigger, kiểm tra trạng thái Busy và trả về mảng số nguyên thô (0..4095).",
    inputs: "Adc_StartGroupConversion(Grp), Adc_GetGroupStatus(Grp), Adc_ReadGroup(Grp, &Buf).",
    outputs: "Giá trị lượng tử Raw (12-bit/10-bit) cấp cho tầng bù & lọc của IoHwAb.",
    color: "#14b8a6"
  },
  MOD_PWM: {
    name: "Pwm Driver (MCAL)",
    layer: "Microcontroller Abstraction Layer",
    sws: "SWS_Pwm",
    role: "Điều khiển Timer phát xung PWM với chuẩn AUTOSAR cố định 15-bit Duty Cycle (0x0000 = 0%, 0x4000 = 50%, 0x8000 = 100%) và Idle State.",
    inputs: "Pwm_SetDutyCycle(Ch, Duty15bit), Pwm_SetOutputToIdle(Ch) từ IoHwAb Actuator Mux.",
    outputs: "Sóng PWM vật lý ra mạch cầu H / SmartFET điều khiển bướm ga.",
    color: "#f59e0b"
  },
  MOD_ICU: {
    name: "Icu Driver (MCAL)",
    layer: "Microcontroller Abstraction Layer",
    sws: "SWS_Icu",
    role: "Đo độ rộng xung, chu kỳ (Signal Measurement) hoặc đếm xung (Edge Counter) bằng Timer 1 MHz phần cứng.",
    inputs: "Icu_StartSignalMeasurement(Ch), Icu_GetDutyCycleValues(Ch, &DutyStruct).",
    outputs: "ActiveTime & PeriodTime (ticks µs) để IoHwAb đổi thành tần số Hz và Wheel RPM.",
    color: "#6366f1"
  }
};

const ABBREVIATIONS_DATA = [
  // Category: CORE (13 terms)
  { abbr: "IoHwAb", full: "Input/Output Hardware Abstraction", cat: "CORE", desc: "Module trừu tượng hóa phần cứng I/O nằm ở tầng ECU Abstraction, cô lập SWC khỏi các driver MCAL phụ thuộc MCU." },
  { abbr: "MCAL", full: "Microcontroller Abstraction Layer", cat: "CORE", desc: "Tầng trừu tượng vi điều khiển thấp nhất trong AUTOSAR (Port, Dio, Adc, Pwm, Icu, Spi), truy cập trực tiếp thanh ghi MCU." },
  { abbr: "ECUAL", full: "ECU Abstraction Layer", cat: "CORE", desc: "Tầng trừu tượng ECU chứa IoHwAb, MemIf, CanIf, EthIf; kết nối MCAL bên dưới với RTE/Services bên trên." },
  { abbr: "SWC", full: "Software Component", cat: "CORE", desc: "Thành phần phần mềm tầng Application; chỉ giao tiếp bằng giá trị vật lý chuẩn (%, °C, RPM, Bool) qua RTE." },
  { abbr: "RTE", full: "Runtime Environment", cat: "CORE", desc: "Môi trường thực thi kết nối các SWC với nhau và ánh xạ Client-Server port xuống các hàm API của IoHwAb." },
  { abbr: "VFB", full: "Virtual Functional Bus", cat: "CORE", desc: "Khái niệm bus ảo ở giai đoạn thiết kế AUTOSAR giúp SWC hoàn toàn không phụ thuộc vị trí ECU hay sơ đồ chân MCU." },
  { abbr: "C/S", full: "Client-Server Interface", cat: "CORE", desc: "Giao diện Port chính mà SWC dùng để gọi đồng bộ các dịch vụ của IoHwAb (vd: Rte_Call_RpIoHwAb_GetPhysVal)." },
  { abbr: "EcuM", full: "ECU State Manager", cat: "CORE", desc: "Module quản lý vòng đời ECU, thực hiện chuỗi InitList gọi MCAL Init trước rồi mới khởi tạo IoHwAb_Init()." },
  { abbr: "BswM", full: "Basic Software Mode Manager", cat: "CORE", desc: "Module quản lý chế độ BSW, điều phối tắt/bật các nhóm tín hiệu I/O theo trạng thái nguồn xe (RUN, SLEEP, SHUTDOWN)." },
  { abbr: "ECUC", full: "ECU Configuration", cat: "CORE", desc: "Tệp cấu hình thông số AUTOSAR (.arxml) chứa toàn bộ container định nghĩa kênh ADC/DIO/PWM/ICU của IoHwAb." },
  { abbr: "SWS", full: "Software Specification", cat: "CORE", desc: "Tài liệu đặc tả chuẩn chính thức của AUTOSAR cho từng module (vd: AUTOSAR_SWS_IOHardwareAbstraction)." },
  { abbr: "Cbk", full: "Callback Notification Function", cat: "CORE", desc: "Hàm gọi ngược được MCAL (như Adc_Notification hay Icu_SignalNotification) kích hoạt khi xong sự kiện ngắt." },
  { abbr: "API", full: "Application Programming Interface", cat: "CORE", desc: "Giao diện lập trình chuẩn C của AUTOSAR (E_OK, E_NOT_OK, Std_ReturnType, IoHwAb_*)." },

  // Category: ADC (13 terms)
  { abbr: "ADC", full: "Analog-to-Digital Converter", cat: "ADC", desc: "Bộ chuyển đổi điện áp tương tự chân vi điều khiển thành số nguyên rời rạc (vd 0..4095 ở 12-bit)." },
  { abbr: "SAR", full: "Successive Approximation Register", cat: "ADC", desc: "Kiến trúc ADC phổ biến trên MCU ô tô cân bằng giữa tốc độ chuyển đổi µs và độ chính xác 12-bit." },
  { abbr: "LSB", full: "Least Significant Bit", cat: "ADC", desc: "Bước nhảy lượng tử nhỏ nhất của ADC; ở Vref=5V và 12-bit thì 1 LSB ≈ 1.22 mV." },
  { abbr: "Vref", full: "Reference Voltage", cat: "ADC", desc: "Điện áp chuẩn cấp cho bộ ADC (thường 5.0V hoặc 3.3V) dùng làm mốc 100% giá trị MaxCount." },
  { abbr: "RATIO", full: "Ratiometric Compensation", cat: "ADC", desc: "Kỹ thuật bù trừ sụt nguồn 5V cảm biến (V_comp = V_meas × 5000 / V_5V) giữ số đo % không trôi theo nguồn." },
  { abbr: "IIR", full: "Infinite Impulse Response Filter", cat: "ADC", desc: "Bộ lọc thông thấp số (EMA) dùng ít RAM nhất: y[n] = α·x[n] + (1−α)·y[n−1] để triệt nhiễu xung cảm biến." },
  { abbr: "EMA", full: "Exponential Moving Average", cat: "ADC", desc: "Dạng bộ lọc IIR bậc 1 sử dụng trọng số α điều chỉnh độ mượt và tốc độ đáp ứng quá độ." },
  { abbr: "RAW", full: "Unscaled ADC Register Value", cat: "ADC", desc: "Giá trị thô nguyên thủy chưa quy đổi từ thanh ghi ADC hoặc điện áp mV chân trước khi nhân hệ số PCB." },
  { abbr: "PHYS", full: "Physical Value (Engineering Unit)", cat: "ADC", desc: "Giá trị kỹ thuật thực tế cấp cho SWC sau khi trừ Offset và nhân Gain (%, Bar, °C, V)." },
  { abbr: "LUT", full: "Look-Up Table", cat: "ADC", desc: "Bảng tra nội suy tuyến tính dùng trong IoHwAb cho các cảm biến phi tuyến như nhiệt điện trở NTC/PTC." },
  { abbr: "TRIG", full: "ADC Conversion Trigger Source", cat: "ADC", desc: "Nguồn kích bắt đầu lấy mẫu ADC: Software Trigger (SW từ Task) hoặc Hardware Trigger (HW đồng bộ Timer)." },
  { abbr: "DMA", full: "Direct Memory Access", cat: "ADC", desc: "Cơ chế phần cứng chuyển thẳng kết quả Adc_ReadGroup vào bộ đệm RAM của IoHwAb mà không tốn ngắt CPU." },
  { abbr: "EMI", full: "Electromagnetic Interference", cat: "ADC", desc: "Nhiễu điện từ trường trên dây dẫn cảm biến ô tô đòi hỏi phần cứng RC kết hợp bộ lọc IIR trong IoHwAb." },

  // Category: DPWM (13 terms)
  { abbr: "DIO", full: "Digital Input / Output", cat: "DPWM", desc: "Kênh số đọc/ghi nhị phân STD_LOW / STD_HIGH thông qua MCAL Dio_ReadChannel và Dio_WriteChannel." },
  { abbr: "PORT", full: "Port Pin Multiplexer Driver", cat: "DPWM", desc: "MCAL Driver cấu hình hướng chân (IN/OUT), chức năng thay thế (AltFunc PWM/ADC/ICU) và điện trở kéo lúc Init." },
  { abbr: "DBNC", full: "Mechanical Contact Debouncing", cat: "DPWM", desc: "Thuật toán lọc dội tiếp điểm cơ khí của công tắc bằng cách yêu cầu tín hiệu ổn định qua N chu kỳ MainFunction." },
  { abbr: "PWM", full: "Pulse Width Modulation", cat: "DPWM", desc: "Điều chế độ rộng xung điều khiển công suất motor/van theo tỷ lệ thời gian mức cao trong một chu kỳ." },
  { abbr: "0x8000", full: "AUTOSAR 15-bit 100% Duty Scale", cat: "DPWM", desc: "Chuẩn biểu diễn Duty Cycle độc lập phần cứng của MCAL PWM: 0x0000 = 0%, 0x4000 = 50%, 0x8000 = 100%." },
  { abbr: "CLAMP", full: "PWM Duty Safety Clamping", cat: "DPWM", desc: "Giới hạn kẹp vùng Duty Cycle (vd 5%..95%) giúp tụ bootstrap mạch cầu H luôn kịp nạp và tránh bão hòa." },
  { abbr: "IDLE", full: "Pwm_SetOutputToIdle Safe State", cat: "DPWM", desc: "Trạng thái nghỉ an toàn (thường kéo chân PWM xuống LOW) khi ngắt cơ cấu chấp hành hoặc có lỗi FiM/OCP." },
  { abbr: "H-BR", full: "H-Bridge Motor Driver Stage", cat: "DPWM", desc: "Mạch cầu 4 MOSFET điều khiển đảo chiều dòng điện qua motor (vd bướm ga điện tử ETC) bằng PWM + DIR + EN." },
  { abbr: "ICU", full: "Input Capture Unit", cat: "DPWM", desc: "Bộ ngoại vi Timer đo thời gian cạnh xung (PeriodTime, ActiveTime) hoặc đếm xung từ cảm biến tốc độ/PWM." },
  { abbr: "RPM", full: "Revolutions Per Minute", cat: "DPWM", desc: "Đơn vị vòng/phút của trục quay được IoHwAb tính từ tần số ICU và số răng đĩa cảm biến: (Freq × 60) / Teeth." },
  { abbr: "TONE", full: "Tone Wheel / Reluctor Ring", cat: "DPWM", desc: "Đĩa răng cơ khí gắn trên bánh xe/trục khuỷu tạo xung từ hoặc Hall đưa vào chân ICU của ECU." },
  { abbr: "ACTL", full: "Active-Low Signal Polarity", cat: "DPWM", desc: "Cực tính tích cực mức thấp (0V = Active); IoHwAb đảo logic này thành TRUE cho SWC để ẩn cách đấu dây GND." },
  { abbr: "RDBK", full: "Digital Output Readback Check", cat: "DPWM", desc: "Kỹ thuật đọc lại mức chân ngay sau Dio_WriteChannel để phát hiện lỗi kẹt mức Stuck-at-High/Low." },

  // Category: DIAG (13 terms)
  { abbr: "DEM", full: "Diagnostic Event Manager", cat: "DIAG", desc: "Module dịch vụ chẩn đoán lưu giữ và debouncing lỗi phần cứng (PREFAILED -> FAILED) thành DTC trong bộ nhớ." },
  { abbr: "FiM", full: "Function Inhibition Manager", cat: "DIAG", desc: "Module quản lý khóa chức năng an toàn; báo FiM_GetFunctionPermission()==FALSE buộc IoHwAb ngắt Actuator." },
  { abbr: "FID", full: "Function Identifier (in FiM)", cat: "DIAG", desc: "Mã định danh chức năng dùng để tra cứu quyền thực thi trong FiM (vd FID_THROTTLE_ACTUATOR)." },
  { abbr: "DCM", full: "Diagnostic Communication Manager", cat: "DIAG", desc: "Module xử lý giao thức UDS (ISO 14229), chuyển tiếp lệnh ghi đè I/O 0x2F từ máy chẩn đoán xuống IoHwAb." },
  { abbr: "0x2F", full: "UDS InputOutputControlByIdentifier", cat: "DIAG", desc: "Dịch vụ UDS chuẩn cho phép tester can thiệp tức thời (0x03 ShortTermAdjustment), giữ (0x02 Freeze) hoặc trả quyền (0x00)." },
  { abbr: "DET", full: "Default Error Tracer (Mod ID 254)", cat: "DIAG", desc: "Bộ ghi nhận lỗi lập trình/phát triển (IOHWAB_E_UNINIT, IOHWAB_E_PARAM_POINTER, IOHWAB_E_PARAM_CHANNEL)." },
  { abbr: "SCG", full: "Short-to-Ground Fault", cat: "DIAG", desc: "Lỗi ngắn mạch dây tín hiệu xuống mass (GND), thường khiến áp ADC tụt xuống dưới 250 mV." },
  { abbr: "SCB", full: "Short-to-Battery / Vref Fault", cat: "DIAG", desc: "Lỗi chập dây tín hiệu lên nguồn dương hoặc 5V, đẩy điện áp ADC vượt quá 4750 mV." },
  { abbr: "OL", full: "Open-Load / Broken Wire Fault", cat: "DIAG", desc: "Lỗi hở mạch / đứt dây tải hoặc cảm biến; phát hiện khi dòng phản hồi SmartFET bằng 0 mA dù đang cấp PWM." },
  { abbr: "OCP", full: "Over-Current Protection", cat: "DIAG", desc: "Bảo vệ quá dòng khi dòng tải SmartFET/H-Bridge vượt ngưỡng (vd > 8000 mA), cắt PWM ngay về Idle." },
  { abbr: "SUB", full: "Fault Substitution Value Strategy", cat: "DIAG", desc: "Cơ chế thay thế giá trị cảm biến bị lỗi bằng giá trị an toàn (Limp-Home 10%) hoặc giữ giá trị hợp lệ cuối." },
  { abbr: "QUAL", full: "Signal Quality Status Qualifier", cat: "DIAG", desc: "Cờ chất lượng đi kèm mọi tín hiệu từ IoHwAb lên SWC (VALID/GOOD, DEGRADED, FAULT/INVALID)." },
  { abbr: "ASIL", full: "Automotive Safety Integrity Level", cat: "DIAG", desc: "Cấp toàn vẹn an toàn ISO 26262 (A..D) đòi hỏi IoHwAb có chuỗi bảo vệ FiM Safe-State và Output Readback." }
];
