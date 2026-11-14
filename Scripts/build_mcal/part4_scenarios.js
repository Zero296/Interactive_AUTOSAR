// ================= PART 4B: 16 INTERACTIVE SCENARIOS (S1..S16) & 48 1-CLICK WHAT-IF EXPERIMENTS =================

function setStepFocus(mod, arrows, mods, title, inputFrom, processing, outputTo, swsRef) {
  simState.selectedMod = mod;
  simState.activeArrows = arrows;
  simState.highlightedMods = mods;
  simState.stepMeta = {
    moduleTag: mod.replace("MOD_", ""),
    title,
    inputFrom,
    processing,
    outputTo,
    swsRef
  };
}

const SCENARIOS = {
  // ---------------- S1: MCU CLOCK TREE & PLL ----------------
  S1: {
    id: "S1", workspace: "Mcu", hwView: "MCU", cfgTab: 0,
    title: "S1: Mcu Khởi Tạo Clock Tree, Khóa PLL (160MHz) & DistributePllClock",
    summary: "Luồng chuẩn EcuM_AL_DriverInitOne → Mcu_Init → Mcu_InitClock → chờ Mcu_GetPllStatus() == MCU_PLL_LOCKED (Bit 7=1) → Mcu_DistributePllClock().",
    steps: [
      {
        label: "Bước 1: EcuM gọi Mcu_Init(&Mcu_Config)",
        desc: "EcuM khởi tạo driver Mcu trước tiên. CPU chạy tạm bằng xung nội IRC 16 MHz, PLL chưa bật (Bit 7 PLL_LOCK_OK = 0).",
        exec() {
          simState = createInitialSimState();
          simState.activeWorkspace = "Mcu"; simState.activeHwView = "MCU";
          mcalMcuInit();
          setStepFocus("MOD_MCU", ["arr_ecum_mcal", "arr_mcu_hw"], ["MOD_ECUM", "MOD_MCU", "MOD_HW"],
            "1. Mcu_Init(): Nạp cấu hình Clock, RAM & PowerMode",
            "EcuM_AL_DriverInitOne() truyền con trỏ &Mcu_Config",
            "Nạp bảng hệ số chia tần số và reset cờ phần cứng (fCPU = 16MHz fOSC)",
            "Cấp trạng thái MCAL_DRV_INIT = 1 (Bit 7 Thanh B)", "SWS_Mcu_00026");
        }
      },
      {
        label: "Bước 2: Mcu_InitClock() bật mạch VCO của PLL",
        desc: "Cấu hình bộ chia Prescaler và bật bộ nhân tần PLL từ thạch anh 16 MHz lên 160 MHz. Lưu ý: chưa nối PLL vào CPU để tránh sốc clock!",
        exec() {
          mcalMcuInitClock();
          setStepFocus("MOD_MCU", ["arr_ecum_mcal", "arr_mcu_hw"], ["MOD_ECUM", "MOD_MCU", "MOD_HW"],
            "2. Mcu_InitClock(): Kích hoạt PLL nhưng chưa nối MUX",
            "EcuM gọi Mcu_InitClock(McuClockSetting_160MHz)",
            "Ghi Prescaler PLL_DV/FD, bật VCO. Bit 7 (PLL_LOCK_OK) vẫn = 0 trong lúc chờ ổn định",
            "Thanh ghi PLL_SR báo trạng thái chờ khóa pha", "SWS_Mcu_00137");
        }
      },
      {
        label: "Bước 3: Mcu_GetPllStatus() → MCU_PLL_LOCKED (Bit 7 = 1)",
        desc: "EcuM kiểm tra vòng lặp Mcu_GetPllStatus(). Khi VCO ổn định, Bit 7 (PLL_LOCK_OK) trên Thanh A bật lên 1!",
        exec() {
          mcalMcuLockAndGetPll();
          setStepFocus("MOD_MCU", ["arr_mcu_hw", "arr_ecum_mcal"], ["MOD_ECUM", "MOD_MCU", "MOD_HW"],
            "3. Mcu_GetPllStatus(): Phát hiện PLL_LOCK_OK = 1",
            "Đọc bit LOCK trong thanh ghi phần cứng PLL_SR",
            "Vòng khóa pha ổn định ở 160 MHz → hàm trả về MCU_PLL_LOCKED",
            "Cho phép EcuM chuyển sang bước DistributePllClock()", "SWS_Mcu_00008");
        }
      },
      {
        label: "Bước 4: Mcu_DistributePllClock() cấp xung cho toàn bộ MCAL",
        desc: "Chuyển mạch MUX hệ thống đưa fCPU=160MHz, fBUS=80MHz, fCAN=80MHz, fADC=40MHz tới Port/Adc/Pwm/Spi/Can/Fls và gọi Mcu_InitRamSection(0).",
        exec() {
          mcalMcuDistributePllClock();
          simState.ramInitDone = true;
          addApiTrace("Mcu", "RAM INIT", "Mcu_InitRamSection(0)", "Khởi tạo vùng RAM không mất dữ liệu (No-Init RAM section)", "SWS_Mcu_00011", "ok");
          setStepFocus("MOD_MCU", ["arr_ecum_mcal", "arr_mcu_hw"], ["MOD_ECUM", "MOD_MCU", "MOD_HW"],
            "4. Mcu_DistributePllClock(): Phân phối 160MHz toàn chip",
            "Lệnh từ EcuM sau khi kiểm tra MCU_PLL_LOCKED",
            "Đóng MUX chuyển nguồn xung từ fOSC 16MHz sang PLL 160MHz + Init RAM Section",
            "Cấp xung chuẩn cho Adc (40MHz), Can/Spi (80MHz), Core/Pwm (160MHz)", "SWS_Mcu_00140");
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Gọi Distribute sớm khi PLL=0 (DET)",
        run() {
          simState.pllLocked = false; simState.pllDistributed = false; syncHardwareClocks();
          mcalMcuDistributePllClock();
          setStepFocus("MOD_MCU", ["arr_mcal_det"], ["MOD_MCU", "MOD_ECUM"],
            "What-If S1.1: Gọi Mcu_DistributePllClock() khi chưa Lock PLL",
            "EcuM gọi sớm lúc Bit 7 (PLL_LOCK_OK) == 0",
            "Mcu từ chối chuyển MUX và báo Det_ReportError(MCU_E_PLL_NOT_LOCKED=0x0E)",
            "Bit 0 (DET_ERR_TRAP = 1) bật sáng đỏ trên Thanh B!", "SWS_Mcu_00142");
          renderAll();
        }
      },
      {
        label: "🧪 Bật McuNoPll = TRUE (16 MHz IRC)",
        run() {
          ecucConfig.McuNoPll = true; applyConfigToState();
          mcalMcuInitClock(); mcalMcuLockAndGetPll();
          setStepFocus("MOD_MCU", ["arr_mcu_hw"], ["MOD_MCU", "MOD_HW"],
            "What-If S1.2: Chế độ không dùng PLL (McuNoPll = TRUE)",
            "Cấu hình ECUC_Mcu_00180 bật McuNoPll",
            "Mcu_GetPllStatus() trả về MCU_PLL_STATUS_UNDEFINED, chạy 16MHz fOSC",
            "Giảm tiêu thụ điện cho các ECU chi phí thấp", "SWS_Mcu_00180");
          renderAll();
        }
      },
      {
        label: "🧪 Giả lập lỗi Clock Loss (DEM)",
        run() {
          simState.clockFailure = true; simState.pllLocked = false; syncHardwareClocks();
          demReport("Mcu", "MCU_E_CLOCK_FAILURE", true, "Mất xung thạch anh ngoài → hạ về IRC 16MHz dự phòng & báo DEM", "SWS_Mcu_00166");
          setStepFocus("MOD_MCU", ["arr_mcal_det", "arr_mcu_hw"], ["MOD_MCU", "MOD_ECUM", "MOD_HW"],
            "What-If S1.3: Thạch anh sập (MCU_E_CLOCK_FAILURE)",
            "Mạch Clock Monitor phần cứng phát hiện mất khóa pha",
            "Tự động fallback CPU về 16MHz & gọi Dem_SetEventStatus(FAILED)",
            "Bit 1 (DEM_HW_FAULT = 1) trên Thanh B, Bit 7 (PLL_LOCK_OK = 0)", "SWS_Mcu_00166");
          renderAll();
        }
      }
    ]
  },

  // ---------------- S2: MCU RESET REASON, HALT & SW RESET ----------------
  S2: {
    id: "S2", workspace: "Mcu", hwView: "MCU", cfgTab: 0,
    title: "S2: Mcu Đọc ResetReason, Ngủ HALT/STOP & Software Reset (UDS 0x11)",
    summary: "Đọc thanh ghi RGM_FES qua Mcu_GetResetReason(), đưa ECU vào MCU_MODE_HALT / STOP và kích hoạt Mcu_PerformReset().",
    steps: [
      {
        label: "Bước 1: EcuM đọc Mcu_GetResetReason() & RawValue",
        desc: "Ngay lúc khởi động, EcuM giải mã nguồn vừa gây reset chip (Power-On / Watchdog / SW Reset) để chọn chiến lược khởi động.",
        exec() {
          simState.activeWorkspace = "Mcu"; simState.activeHwView = "MCU";
          mcalMcuInit(); mcalMcuLockAndGetPll(); mcalMcuDistributePllClock();
          addApiTrace("Mcu", "RST REASON", `Mcu_GetResetReason() -> ${simState.resetReason} (Raw=${simState.resetRaw})`, "Đọc thanh ghi RGM_DES/FES báo nguồn Reset về cho EcuM", "SWS_Mcu_00005", "ok");
          setStepFocus("MOD_MCU", ["arr_mcu_hw", "arr_ecum_mcal"], ["MOD_ECUM", "MOD_MCU", "MOD_HW"],
            "1. Mcu_GetResetReason(): Đọc nguyên nhân Reset chip",
            "Thanh ghi silicon RGM_DES / RGM_FES",
            "Ánh xạ bit phần cứng sang Enum chuẩn MCU_POWER_ON_RESET",
            "Trả về EcuM để cập nhật Wakeup Source", "SWS_Mcu_00005");
        }
      },
      {
        label: "Bước 2: EcuM đưa chip vào ngủ Mcu_SetMode(MCU_MODE_HALT)",
        desc: "Khi không còn nhu cầu truyền thông, EcuM gọi Mcu_SetMode(MCU_MODE_HALT) thực thi WFI ngắt xung CPU nhưng giữ PLL & RAM.",
        exec() {
          mcalMcuSetMode("MCU_MODE_HALT");
          setStepFocus("MOD_MCU", ["arr_ecum_mcal", "arr_mcu_hw"], ["MOD_ECUM", "MOD_MCU", "MOD_HW"],
            "2. Mcu_SetMode(MCU_MODE_HALT): Ngủ chờ ngắt đánh thức",
            "EcuM_GoHalt() gọi Mcu_SetMode(MCU_MODE_HALT)",
            "Cổng xung CPU Core dừng (WFI), vẫn giữ RAM & khối đánh thức CAN",
            "Tiết kiệm dòng tiêu thụ; sẵn sàng bật lại khi có ngắt IRQ", "SWS_Mcu_00147");
        }
      },
      {
        label: "Bước 3: Đánh thức lại RUN & nhận lệnh UDS 0x11 → Mcu_PerformReset()",
        desc: "Sau khi Dcm nhận dịch vụ chẩn đoán 0x11 ECUReset, BswM/EcuM gọi Mcu_PerformReset() kích hoạt Software Reset toàn vi điều khiển.",
        exec() {
          mcalMcuSetMode("MCU_MODE_RUN");
          mcalMcuPerformReset();
          setStepFocus("MOD_MCU", ["arr_ecum_mcal", "arr_mcu_hw"], ["MOD_ECUM", "MOD_MCU", "MOD_HW"],
            "3. Mcu_PerformReset(): Software Reset qua RGM",
            "Dcm (0x11) → BswM → EcuM_AL_Reset() gọi Mcu_PerformReset()",
            "Ghi mã mở khóa vào thanh ghi RGM kích hoạt Reset mềm",
            "Lần boot tiếp theo Mcu_GetResetReason() trả về MCU_SW_RESET", "SWS_Mcu_00143");
        }
      },
      {
        label: "Bước 4: Sau Reset — Kiểm tra cờ MCU_SW_RESET & sẵn sàng",
        desc: "Bootloader/Startup kiểm tra lý do vừa reset là MCU_SW_RESET và nạp lại trạng thái RUN bình thường.",
        exec() {
          addApiTrace("Mcu", "BOOT CHECK", `Mcu_GetResetReason() -> ${simState.resetReason} (${simState.resetRaw})`, "Xác nhận vừa khởi động lại do yêu cầu Software Reset", "SWS_Mcu_00005", "ok");
          setStepFocus("MOD_MCU", ["arr_ecum_mcal"], ["MOD_ECUM", "MOD_MCU"],
            "4. Xác minh MCU_SW_RESET sau khi chip khởi động lại",
            "EcuM Startup đọc lại Mcu_GetResetReason()",
            "Nhận diện cờ MCU_SW_RESET từ thanh ghi giữ lại qua Reset",
            "Hoàn tất chu trình UDS Reset / Bootloader Update", "SWS_Mcu_00006");
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Giả lập Watchdog Reset (WDG)",
        run() {
          simState.resetReason = "MCU_WATCHDOG_RESET"; simState.resetRaw = "0x00000008";
          addApiTrace("Mcu", "WDG RESET", "Mcu_GetResetReason() -> MCU_WATCHDOG_RESET", "Thanh ghi RGM ghi nhận Watchdog phần cứng tràn bộ đếm!", "SWS_Mcu_00005", "err");
          renderAll();
        }
      },
      {
        label: "🧪 Chuyển sang MCU_MODE_STOP (Tắt PLL)",
        run() {
          mcalMcuSetMode("MCU_MODE_STOP");
          renderAll();
        }
      },
      {
        label: "🧪 Tắt McuPerformResetApi rồi Reset",
        run() {
          ecucConfig.McuPerformResetApi = false; applyConfigToState();
          mcalMcuPerformReset();
          renderAll();
        }
      }
    ]
  },

  // ---------------- S3: PORT INIT & EMC REFRESH ----------------
  S3: {
    id: "S3", workspace: "Port", hwView: "PORT_DIO", cfgTab: 1,
    title: "S3: Port_Init Pin Mux (PCR), Đổi Hướng/Mode Runtime & Port_RefreshPortDirection",
    summary: "Khởi tạo an toàn toàn bộ ma trận chân (Level trước Direction), đổi PA0 lúc runtime và phục hồi chống nhiễu EMC bằng Port_RefreshPortDirection().",
    steps: [
      {
        label: "Bước 1: EcuM gọi Port_Init(&Port_Config)",
        desc: "Port nạp sẵn mức điện áp PortPinLevelValue trước khi bật Output Enable để không gây nháy rơ-le lúc cấp nguồn, rồi cấu hình PCR[0..7].",
        exec() {
          simState.activeWorkspace = "Port"; simState.activeHwView = "PORT_DIO";
          mcalPortInit();
          setStepFocus("MOD_PORT", ["arr_ecum_mcal", "arr_port_hw"], ["MOD_ECUM", "MOD_PORT", "MOD_HW"],
            "1. Port_Init(): Cấu hình toàn chip Pin Mux & chống glitch",
            "EcuM_AL_DriverInitOne() gọi Port_Init(&Port_Config)",
            "Ghi mức logic khởi đầu trước → ghi thanh ghi PCR[0..7] (DIO/ADC/PWM/SPI/CAN)",
            "Cấp ánh xạ chân vật lý chuẩn cho tất cả driver MCAL khác", "SWS_Port_00041");
        }
      },
      {
        label: "Bước 2: IoHwAb gọi Port_SetPinDirection(PA0, PORT_PIN_OUT)",
        desc: "PA0 có PortPinDirectionChangeable = TRUE nên IoHwAb được phép đổi hướng từ IN sang OUT ngay trong lúc xe đang chạy.",
        exec() {
          mcalPortSetPinDirection(0, "PORT_PIN_OUT");
          setStepFocus("MOD_PORT", ["arr_iohwab_port", "arr_port_hw"], ["MOD_IOHWAB", "MOD_PORT", "MOD_HW"],
            "2. Port_SetPinDirection(PA0, OUT): Đổi hướng chân động",
            "IoHwAb yêu cầu đổi hướng chân PA0 (PortPinDirectionChangeable=TRUE)",
            "Kiểm tra cờ cho phép → cập nhật PCR[0].OBE = 1",
            "Chân PA0 sẵn sàng xuất tín hiệu Output", "SWS_Port_00063");
        }
      },
      {
        label: "Bước 3: Đổi chức năng sang PWM bằng Port_SetPinMode(PA0)",
        desc: "Khi PortPinModeChangeable = TRUE, Port_SetPinMode() chuyển mạch Multiplexer chân PA0 sang chân phát xung PWM hoặc ngược lại về DIO.",
        exec() {
          mcalPortSetPinMode(0, "PORT_PIN_MODE_PWM");
          setStepFocus("MOD_PORT", ["arr_iohwab_port", "arr_port_hw"], ["MOD_IOHWAB", "MOD_PORT", "MOD_HW"],
            "3. Port_SetPinMode(PA0, PORT_PIN_MODE_PWM): Đổi ALT Mux",
            "IoHwAb gọi Port_SetPinMode() khi PortPinModeChangeable=TRUE",
            "Chuyển trường MUX trong thanh ghi PCR[0] sang chế độ ngoại vi khác",
            "Chân PA0 thay đổi kết nối phần cứng bên trong vi điều khiển", "SWS_Port_00125");
        }
      },
      {
        label: "Bước 4: Port_RefreshPortDirection() phục hồi chống nhiễu EMC",
        desc: "Định kỳ SchM gọi Port_RefreshPortDirection() quét làm tươi hướng của các chân cố định (DirectionChangeable=FALSE) nhưng giữ nguyên chân PA0.",
        exec() {
          mcalPortRefreshDirection();
          setStepFocus("MOD_PORT", ["arr_port_hw"], ["MOD_PORT", "MOD_HW"],
            "4. Port_RefreshPortDirection(): Tự sửa lỗi lật bit EMC",
            "Lịch biểu định kỳ bảo vệ an toàn chân IO khỏi nhiễu tĩnh điện EMC",
            "Nạp lại hướng chuẩn cho các chân có PortPinDirectionChangeable=FALSE; bỏ qua PA0",
            "Đảm bảo chân PA1..PB3 không bao giờ sai hướng do nhiễu!", "SWS_Port_00060");
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Đổi hướng chân PA1 cố định (DET 0x0B)",
        run() {
          mcalPortSetPinDirection(1, "PORT_PIN_IN");
          setStepFocus("MOD_PORT", ["arr_mcal_det"], ["MOD_PORT", "MOD_ECUM"],
            "What-If S3.1: Chặn Port_SetPinDirection(PA1) không cho đổi!",
            "Gọi đổi hướng chân PA1 (WarnLed, DirectionChangeable=FALSE)",
            "Phát hiện vi phạm → báo Det_ReportError(PORT_E_DIRECTION_UNCHANGEABLE=0x0B)",
            "Bảo vệ phần cứng không bị ngắn mạch chân Output/Input", "SWS_Port_00077");
          renderAll();
        }
      },
      {
        label: "🧪 Tắt PortPinModeChangeable rồi SetMode",
        run() {
          ecucConfig.PortPinModeChangeable = false; applyConfigToState();
          mcalPortSetPinMode(0, "PORT_PIN_MODE_DIO");
          renderAll();
        }
      },
      {
        label: "🧪 Giả lập nhiễu EMC & Refresh sửa lỗi",
        run() {
          simState.pins[1].dir = "PORT_PIN_IN"; simState.emcGlitchInjected = true;
          addApiTrace("HW Glitch", "EMC NOISE", "Thanh ghi PCR[1] (PA1) bị nhiễu lật từ OUT → IN!", "Tình huống kiểm thử an toàn trước khi gọi Port_RefreshPortDirection()", "EMC Test", "warn");
          mcalPortRefreshDirection();
          renderAll();
        }
      }
    ]
  },

  // ---------------- S4: DIO CROSS-LAYER SWC <-> RTE <-> IOHWAB <-> DIO ----------------
  S4: {
    id: "S4", workspace: "Dio", hwView: "PORT_DIO", cfgTab: 2,
    title: "S4: Dio Đọc/Ghi/Đảo Chân IO Xuyên Tầng (SWC ↔ RTE ↔ IoHwAb ↔ Dio)",
    summary: "Chứng minh SWC không gọi thẳng Dio: đi qua RTE → IoHwAb → Dio_ReadChannel / WriteChannel / FlipChannel (Stateless & Atomic, không có Dio_Init).",
    steps: [
      {
        label: "Bước 1: SWC → RTE → IoHwAb → Dio_ReadChannel(PA0 IgnSw)",
        desc: "SWC_BodyCtrl đọc trạng thái khóa điện IG qua RTE/IoHwAb. Dio đọc trực tiếp thanh ghi GPIO_PDIR[0] không cần Dio_Init().",
        exec() {
          simState.activeWorkspace = "Dio"; simState.activeHwView = "PORT_DIO";
          mcalPortInit();
          const lvl = simState.pins[0].level;
          addApiTrace("SWC/IoHwAb", "READ CH ↑", `Rte_Call_IgnSw_Read() -> IoHwAb -> Dio_ReadChannel(PA0) = ${lvl ? "STD_HIGH" : "STD_LOW"}`, "Đọc nguyên tử từ GPIO_PDIR[0] truyền ngược lên IoHwAb → RTE → SWC", "SWS_Dio_00027", "rx");
          setStepFocus("MOD_DIO", ["arr_swc_rte", "arr_rte_iohwab", "arr_iohwab_dio", "arr_dio_hw", "arr_iohwab_rte", "arr_rte_swc"],
            ["MOD_SWC", "MOD_RTE", "MOD_IOHWAB", "MOD_DIO", "MOD_HW"],
            "1. Dio_ReadChannel(PA0): Đọc công tắc từ tầng SWC",
            "SWC gọi Rte_Call_IgnSw_Read() → IoHwAb ánh xạ sang DioConf_PA0",
            "Dio đọc bit 0 thanh ghi GPIO_PDIR (không dùng bất kỳ hàm Init nào)",
            "Trả mức logic STD_HIGH/LOW về SWC qua RTE", "SWS_Dio_00027");
        }
      },
      {
        label: "Bước 2: SWC ra lệnh bật đèn → Dio_WriteChannel(PA1, STD_HIGH)",
        desc: "Khi nhận thấy điều kiện cảnh báo, SWC gọi RTE → IoHwAb → Dio_WriteChannel(PA1, STD_HIGH) đẩy Bit 6 (PIN_DIO_LVL) lên 1!",
        exec() {
          mcalDioWriteChannel(1, 1);
          setStepFocus("MOD_DIO", ["arr_swc_rte", "arr_rte_iohwab", "arr_iohwab_dio", "arr_dio_hw"],
            ["MOD_SWC", "MOD_RTE", "MOD_IOHWAB", "MOD_DIO", "MOD_HW"],
            "2. Dio_WriteChannel(PA1, STD_HIGH): Bật đèn WarnLed",
            "SWC gửi yêu cầu bật đèn qua RTE → IoHwAb",
            "Dio kiểm tra PA1 là PORT_PIN_OUT rồi ghi nguyên tử GPIO_PDOR[1]=1",
            "Bit 6 (PIN_DIO_LVL) trên Thanh A chuyển từ 0 → 1, chân PA1 sáng!", "SWS_Dio_00028");
        }
      },
      {
        label: "Bước 3: Nhấp nháy đèn tức thời với Dio_FlipChannel(PA1)",
        desc: "Dio_FlipChannel() đọc mức hiện tại và đảo ngược tức thời (HIGH ↔ LOW) trong một thao tác nguyên tử an toàn ngắt.",
        exec() {
          mcalDioFlipChannel(1);
          setStepFocus("MOD_DIO", ["arr_iohwab_dio", "arr_dio_hw"], ["MOD_IOHWAB", "MOD_DIO", "MOD_HW"],
            "3. Dio_FlipChannel(PA1): Đảo trạng thái đèn nhanh gọn",
            "IoHwAb gọi Dio_FlipChannel(DioConf_WarnLed_PA1)",
            "Đảo mức chân PA1 (HIGH ↔ LOW) & trả lại mức mới sau khi đảo",
            "Lật trực tiếp Bit 6 (PIN_DIO_LVL) trên Thanh A", "SWS_Dio_00190");
        }
      },
      {
        label: "Bước 4: Đảo tiếp lần nữa xác nhận chu kỳ nhấp nháy hoàn chỉnh",
        desc: "Hoàn tất một chu kỳ OFF → ON → OFF đồng bộ xuyên suốt 4 tầng SWC ↔ RTE ↔ IoHwAb ↔ Dio ↔ Pin vật lý.",
        exec() {
          mcalDioFlipChannel(1);
          setStepFocus("MOD_DIO", ["arr_iohwab_dio", "arr_dio_hw", "arr_iohwab_rte", "arr_rte_swc"],
            ["MOD_SWC", "MOD_RTE", "MOD_IOHWAB", "MOD_DIO", "MOD_HW"],
            "4. Hoàn tất chu trình đảo trạng thái trên chân Output",
            "Lệnh Dio_FlipChannel() kế tiếp từ IoHwAb",
            "Thanh ghi PTOR phần cứng đảo ngược mức logic điện áp ra chân",
            "Phản hồi mức đèn mới lên giao diện hệ thống", "SWS_Dio_00190");
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Ghi vào chân Input PA0 (Bỏ qua an toàn)",
        run() {
          simState.pins[0].dir = "PORT_PIN_IN";
          mcalDioWriteChannel(0, 0);
          renderAll();
        }
      },
      {
        label: "🧪 Bấm Dio_FlipChannel(PA1) ngay",
        run() {
          mcalDioFlipChannel(1);
          renderAll();
        }
      },
      {
        label: "🧪 Gọi DioChannelId = 99 (DET 0x0A)",
        run() {
          mcalDioWriteChannel(99, 1);
          renderAll();
        }
      }
    ]
  },

  // ---------------- S5: DIO CHANNEL GROUP & MASKED WRITE ----------------
  S5: {
    id: "S5", workspace: "Dio", hwView: "PORT_DIO", cfgTab: 2,
    title: "S5: Dio_WriteChannelGroup (Mask & Offset) & Dio_MaskedWritePort",
    summary: "Điều khiển song song cụm 4 chân cao trên Port 0 với Mask=0xF0, Offset=4 mà không làm xáo trộn 4 chân thấp.",
    steps: [
      {
        label: "Bước 1: Xem trạng thái Port 0 ban đầu (0xA5 = 1010_0101b)",
        desc: "Port 0 có 8 chân: 4 chân cao (Pin 4..7) dùng làm LED Bar, 4 chân thấp (Pin 0..3) phục vụ nút bấm và relay khác.",
        exec() {
          simState.activeWorkspace = "Dio"; simState.activeHwView = "PORT_DIO";
          simState.dioPortVal = 0x55;
          addApiTrace("Dio", "READ PORT", `Dio_ReadPort(DIO_PORT_0) = 0x${fmtHex2(simState.dioPortVal)}`, "Đọc cả 8 chân Port 0 làm mốc so sánh trước khi ghi nhóm", "SWS_Dio_00031", "rx");
          setStepFocus("MOD_DIO", ["arr_iohwab_dio", "arr_dio_hw"], ["MOD_IOHWAB", "MOD_DIO", "MOD_HW"],
            "1. Trạng thái Port 0 ban đầu = 0x55 (0101_0101b)",
            "Đọc thanh ghi PDIR của Port 0",
            "4 bit thấp (0101b) đang phục vụ các chức năng hệ thống cần giữ nguyên",
            "Chuẩn bị phép toán dịch bit & mặt nạ cho ChannelGroup", "SWS_Dio_00031");
        }
      },
      {
        label: "Bước 2: Dio_WriteChannelGroup(&LedGroup, 0x0C) với Mask=0xF0",
        desc: "Dio tự động dịch trái (0x0C << 4) = 0xC0, che với Mask=0xF0 và giữ nguyên 4 bit thấp (0x05) → Port 0 trở thành 0xC5!",
        exec() {
          mcalDioWriteChannelGroup(0x0C, ecucConfig.DioPortMaskHex, 4);
          setStepFocus("MOD_DIO", ["arr_iohwab_dio", "arr_dio_hw"], ["MOD_IOHWAB", "MOD_DIO", "MOD_HW"],
            "2. Dio_WriteChannelGroup(): Dịch trái + Mask giữ nguyên chân ngoài",
            "IoHwAb gọi Dio_WriteChannelGroup(&LedBarGroup, 0x0C)",
            "Tính toán: (old & ~0xF0) | ((0x0C << 4) & 0xF0) = 0xC5",
            "4 chân cao thành 1100b, 4 chân thấp giữ nguyên 0101b!", "SWS_Dio_00039");
        }
      },
      {
        label: "Bước 3: Dio_ReadChannelGroup(&LedGroup) giải mã ngược về 0x0C",
        desc: "Dio_ReadChannelGroup() đọc 0xC5, che mặt nạ & 0xF0 rồi dịch phải >> 4 để trả về đúng số 0x0C ban đầu.",
        exec() {
          const grpVal = (simState.dioPortVal & simState.dioGroupMask) >> simState.dioGroupOffset;
          addApiTrace("Dio", "GRP READ", `Dio_ReadChannelGroup(&LedGroup) = 0x${fmtHex2(grpVal)}`, `(0x${fmtHex2(simState.dioPortVal)} & 0x${fmtHex2(simState.dioGroupMask)}) >> ${simState.dioGroupOffset} = 0x${fmtHex2(grpVal)}`, "SWS_Dio_00037", "rx");
          setStepFocus("MOD_DIO", ["arr_dio_hw", "arr_iohwab_dio"], ["MOD_IOHWAB", "MOD_DIO", "MOD_HW"],
            "3. Dio_ReadChannelGroup(): Đọc và tách nhóm chân liên kề",
            "Thanh ghi Port 0 hiện giữ 0xC5",
            "Áp mặt nạ & 0xF0 và dịch phải >> 4 bit",
            "Trả chính xác giá trị 0x0C lên IoHwAb", "SWS_Dio_00037");
        }
      },
      {
        label: "Bước 4: Dio_MaskedWritePort() bảo vệ các bit ngoài mặt nạ",
        desc: "Cập nhật trực tiếp các bit tùy chọn trên Port theo cặp (Level, Mask) chuẩn AUTOSAR R20-11+ mà không làm đổi bit khác.",
        exec() {
          const val = parseHexInt(ecucConfig.DioPortWriteValueHex, 0xA5);
          mcalDioMaskedWritePort(val, 0xAA);
          setStepFocus("MOD_DIO", ["arr_iohwab_dio", "arr_dio_hw"], ["MOD_IOHWAB", "MOD_DIO", "MOD_HW"],
            "4. Dio_MaskedWritePort(): Chỉ ghi những bit có Mask=1",
            `IoHwAb truyền Level=0x${fmtHex2(val)}, Mask=0xAA`,
            "Phần cứng chỉ cập nhật các chân lẻ (Bit 1,3,5,7), giữ nguyên bit chẵn",
            "Ghi nguyên tử an toàn đa luồng (Reentrant)", "SWS_Dio_00300");
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Đổi Mask sang 0x3C (Offset=2) & Ghi 0x09",
        run() {
          ecucConfig.DioPortMaskHex = "0x3C"; applyConfigToState();
          mcalDioWriteChannelGroup(0x09, "0x3C", 2);
          renderAll();
        }
      },
      {
        label: "🧪 Ghi đè cả Port bằng Dio_WritePort(0xA0)",
        run() {
          simState.dioPortVal = 0xA0;
          addApiTrace("Dio", "FULL PORT", "Dio_WritePort(DIO_PORT_0, 0xA0)", "Ghi đè toàn bộ 8 chân Port 0 cùng lúc (các bit thấp bị xóa về 0!)", "SWS_Dio_00034", "warn");
          recomputeRegisters(); renderAll();
        }
      },
      {
        label: "🧪 Truyền NULL_PTR vào ReadGroup (DET 0x20)",
        run() {
          detReport("Dio", 120, "0x04", "DIO_E_PARAM_POINTER", "Gọi Dio_ReadChannelGroup(NULL_PTR) vi phạm kiểm tra con trỏ Null", "SWS_Dio_00188");
          renderAll();
        }
      }
    ]
  },

  // ---------------- S6: ADC SW TRIGGER ONE-SHOT ----------------
  S6: {
    id: "S6", workspace: "Adc", hwView: "ADC_PWM", cfgTab: 3,
    title: "S6: Adc SW Trigger One-Shot (SetupResultBuffer → Start → EOC ISR → ReadGroup)",
    summary: "Quy trình chuẩn đọc cảm biến bằng Software Trigger: Cấp buffer (Bit 3) → Bật Notification (Bit 4) → Start (ADC_BUSY) → EOC ISR (Bit 5) → ReadGroup về ADC_IDLE.",
    steps: [
      {
        label: "Bước 1: Adc_Init & Adc_SetupResultBuffer + EnableNotification",
        desc: "Trước khi đo, IoHwAb bắt buộc cấp địa chỉ RAM qua Adc_SetupResultBuffer() (bật Bit 3 BUFF_LOCK_RDY=1) và bật callback Notification.",
        exec() {
          simState.activeWorkspace = "Adc"; simState.activeHwView = "ADC_PWM";
          ecucConfig.AdcGroupTriggSrc = "ADC_TRIGG_SRC_SW";
          ecucConfig.AdcGroupAccessMode = "ADC_ACCESS_MODE_SINGLE";
          applyConfigToState();
          simState.adcGroupStatus = "ADC_IDLE"; simState.adcNotifEnabled = true;
          mcalAdcSetupResultBuffer(true);
          addApiTrace("Adc", "EN NOTIF", "Adc_EnableGroupNotification(AdcGroup_0)", "Kích hoạt gọi IoHwAb_AdcNotification_0() khi xong (Bit 4=1)", "SWS_Adc_00057", "ok");
          setStepFocus("MOD_ADC", ["arr_iohwab_adc"], ["MOD_IOHWAB", "MOD_ADC"],
            "1. Cấp Result Buffer & Bật Notification cho AdcGroup_0",
            "IoHwAb gọi Adc_SetupResultBuffer() & Adc_EnableGroupNotification()",
            "Ghi con trỏ DMA/ISR Buffer vào Driver (Bit 3=1, Bit 4=1), Group=ADC_IDLE",
            "Sẵn sàng nhận lệnh kích chuyển đổi", "SWS_Adc_00419");
        }
      },
      {
        label: "Bước 2: Adc_StartGroupConversion() → Trạng thái ADC_BUSY",
        desc: "SWC/IoHwAb kích chuyển đổi phần mềm. Trạng thái chuyển sang ADC_BUSY (Bit 6 JOB_SEQ_PEND=1) và bộ SAR bắt đầu nạp tụ lấy mẫu.",
        exec() {
          mcalAdcStartGroupConversion(true);
          setStepFocus("MOD_ADC", ["arr_iohwab_adc", "arr_adc_hw"], ["MOD_IOHWAB", "MOD_ADC", "MOD_HW"],
            "2. Adc_StartGroupConversion(): Kích hoạt lấy mẫu SAR 12-bit",
            "IoHwAb gọi Adc_StartGroupConversion(AdcGroup_0)",
            "Kiểm tra Buffer Ready & Trigger Source=SW → khởi chạy SAR ADC (ADC_BUSY)",
            "Phần cứng bắt đầu lượng tử hóa điện áp chân AN0", "SWS_Adc_00061");
        }
      },
      {
        label: "Bước 3: Hoàn tất lấy mẫu → ADC_STREAM_COMPLETED & IoHwAb_AdcNotification",
        desc: "SAR ADC nạp kết quả 12-bit vào Buffer, bật Bit 5 (ADC_CONV_OK=1) & Bit 0 (HW_IRQ_PEND=1) và bắn callback lên IoHwAb.",
        exec() {
          mcalAdcCompleteSampleStep();
          setStepFocus("MOD_ADC", ["arr_adc_hw", "arr_adc_iohwab"], ["MOD_HW", "MOD_ADC", "MOD_IOHWAB"],
            "3. ADC_EOC_ISR: Chuyển sang ADC_STREAM_COMPLETED & gọi Callback",
            `Điện áp analog ${ecucConfig.AdcSimInputVoltageMv}mV → SAR Raw = ${simState.adcRawAn0}`,
            "Lưu kết quả vào AdcRawBuffer, bật Bit 5 (ADC_CONV_OK=1)",
            "ISR gọi IoHwAb_AdcNotification_0() báo dữ liệu đã sẵn sàng!", "SWS_Adc_00060");
        }
      },
      {
        label: "Bước 4: Adc_ReadGroup() lấy mẫu & tự động trả về ADC_IDLE",
        desc: "Theo SWS_Adc_00329, với nhóm SW One-Shot, ngay khi IoHwAb gọi Adc_ReadGroup(), driver trao giá trị Raw và tự đặt lại nhóm về ADC_IDLE.",
        exec() {
          mcalAdcReadGroup();
          setStepFocus("MOD_ADC", ["arr_iohwab_adc", "arr_iohwab_rte", "arr_rte_swc"], ["MOD_ADC", "MOD_IOHWAB", "MOD_RTE", "MOD_SWC"],
            "4. Adc_ReadGroup(): Đọc giá trị & tự reset nhóm về ADC_IDLE",
            "IoHwAb gọi Adc_ReadGroup(AdcGroup_0, &AppValues[0])",
            `Trả về ${simState.adcRawAn0} (≈ ${ecucConfig.AdcSimInputVoltageMv}mV / ${simState.adcTempDegC}°C) & đưa Group → ADC_IDLE`,
            "IoHwAb quy đổi sang đơn vị vật lý (°C) đẩy qua RTE lên SWC", "SWS_Adc_00329");
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Bắt lỗi chưa gọi SetupResultBuffer (0x19)",
        run() {
          simState.adcGroupStatus = "ADC_IDLE"; mcalAdcSetupResultBuffer(false);
          mcalAdcStartGroupConversion(true);
          renderAll();
        }
      },
      {
        label: "🧪 Đổi áp AN0 lên 3750 mV & đo lại",
        run() {
          ecucConfig.AdcSimInputVoltageMv = 3750; applyConfigToState();
          simState.adcGroupStatus = "ADC_IDLE"; mcalAdcSetupResultBuffer(true);
          mcalAdcStartGroupConversion(true); mcalAdcCompleteSampleStep();
          renderAll();
        }
      },
      {
        label: "🧪 Gọi Start đè khi đang ADC_BUSY (0x0B)",
        run() {
          simState.adcBufferReady = true; simState.adcGroupStatus = "ADC_BUSY";
          mcalAdcStartGroupConversion(true);
          renderAll();
        }
      }
    ]
  },

  // ---------------- S7: ADC HW TRIGGER STREAMING ----------------
  S7: {
    id: "S7", workspace: "Adc", hwView: "ADC_PWM", cfgTab: 3,
    title: "S7: Adc HW Trigger & Streaming Buffer (EnableHardwareTrigger → StreamLastPtr)",
    summary: "Lấy mẫu tự động theo xung kích phần cứng Timer/PWM (ADC_TRIGG_SRC_HW) điền đủ N=3 mẫu vào Streaming Buffer.",
    steps: [
      {
        label: "Bước 1: Cấu hình HW Trigger + Streaming (3 mẫu) & EnableHardwareTrigger",
        desc: "IoHwAb gọi Adc_EnableHardwareTrigger(AdcGroup_0) để nối cổng Trigger phần cứng từ bộ đếm Timer/PWM vào SAR ADC.",
        exec() {
          simState.activeWorkspace = "Adc"; simState.activeHwView = "ADC_PWM";
          ecucConfig.AdcGroupTriggSrc = "ADC_TRIGG_SRC_HW";
          ecucConfig.AdcGroupAccessMode = "ADC_ACCESS_MODE_STREAMING";
          ecucConfig.AdcStreamingNumSamples = 3;
          applyConfigToState();
          simState.adcGroupStatus = "ADC_IDLE"; simState.adcBufferReady = true; simState.adcHwTrigArmed = true;
          simState.adcSamplesDone = 0; simState.adcResultBuf = [0, 0, 0];
          addApiTrace("Adc", "HW TRIG EN", "Adc_EnableHardwareTrigger(AdcGroup_0)", "Mở cổng phần cứng chờ xung Trigger từ FTM/PWM Timer (Không cần CPU Start!)", "SWS_Adc_00114", "tx");
          setStepFocus("MOD_ADC", ["arr_iohwab_adc", "arr_adc_hw"], ["MOD_IOHWAB", "MOD_ADC", "MOD_HW"],
            "1. Adc_EnableHardwareTrigger(): Giao phó việc kích cho Timer HW",
            "IoHwAb cấp Buffer [3 mẫu] & bật kích phần cứng",
            "Gắn kênh Trigger Timer → SAR ADC (Group = ADC_IDLE chờ cạnh xung)",
            "CPU rảnh hoàn toàn đến khi đủ bộ đệm Streaming", "SWS_Adc_00114");
        }
      },
      {
        label: "Bước 2: Xung Timer #1 & #2 → ADC_COMPLETED (Chưa đầy Stream)",
        desc: "2 xung phần cứng đầu tiên kích SAR đo mẫu 1 và 2. Trạng thái đạt ADC_COMPLETED nhưng chưa đầy 3 mẫu nên chưa báo xong hoàn toàn.",
        exec() {
          mcalAdcStartGroupConversion(false); mcalAdcCompleteSampleStep();
          mcalAdcStartGroupConversion(false); mcalAdcCompleteSampleStep();
          setStepFocus("MOD_ADC", ["arr_adc_hw"], ["MOD_ADC", "MOD_HW"],
            "2. Lấy mẫu 1/3 & 2/3 trong vùng nhớ Streaming (ADC_COMPLETED)",
            "Cạnh xung PWM/Gpt Trigger #1 và #2 tự kích bộ SAR",
            "Ghi lần lượt 2 mẫu vào Result Buffer[0..1], trạng thái = ADC_COMPLETED",
            "Tiếp tục chờ xung kích thứ 3", "SWS_Adc_00307");
        }
      },
      {
        label: "Bước 3: Xung Timer #3 → ADC_STREAM_COMPLETED & Notification!",
        desc: "Xung thứ 3 điền đủ 3/3 mẫu vào Streaming Buffer! Trạng thái nhảy sang ADC_STREAM_COMPLETED và kích ngắt báo lên IoHwAb.",
        exec() {
          mcalAdcCompleteSampleStep();
          setStepFocus("MOD_ADC", ["arr_adc_hw", "arr_adc_iohwab"], ["MOD_HW", "MOD_ADC", "MOD_IOHWAB"],
            "3. Đủ 3/3 mẫu → ADC_STREAM_COMPLETED (Bit 5 = 1)",
            "Xung Trigger #3 hoàn tất chu kỳ Streaming",
            "Ghi mẫu cuối vào Stream Buffer & chuyển ADC_STREAM_COMPLETED",
            "Gọi callback IoHwAb_AdcNotification_0()", "SWS_Adc_00060");
        }
      },
      {
        label: "Bước 4: IoHwAb đọc trực tiếp không copy qua Adc_GetStreamLastPointer()",
        desc: "Thay vì copy cả mảng lớn, Adc_GetStreamLastPointer() trả về số mẫu hợp lệ (3) và con trỏ trỏ tới mẫu mới nhất.",
        exec() {
          addApiTrace("Adc", "STREAM PTR", `Adc_GetStreamLastPointer(0, &Ptr) -> NumSamples=${simState.adcStreamTarget}, Latest=${simState.adcRawAn0}`, "Zero-copy trỏ trực tiếp tới mẫu mới nhất trong Buffer Streaming", "SWS_Adc_00214", "rx");
          simState.adcGroupStatus = "ADC_IDLE"; simState.adcHwTrigArmed = false;
          setStepFocus("MOD_ADC", ["arr_adc_iohwab", "arr_iohwab_rte"], ["MOD_ADC", "MOD_IOHWAB", "MOD_RTE"],
            "4. Adc_GetStreamLastPointer(): Đọc nhanh con trỏ mẫu mới nhất",
            "IoHwAb gọi Adc_GetStreamLastPointer(AdcGroup_0, &SamplePtr)",
            `Linear Buffer trả về ${simState.adcStreamTarget} mẫu và đặt Group về ADC_IDLE`,
            "Dữ liệu mượt (lọc trung bình 3 mẫu) gửi lên SWC", "SWS_Adc_00214");
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Gọi SW Start trên nhóm HW Trig (DET 0x17)",
        run() {
          ecucConfig.AdcGroupTriggSrc = "ADC_TRIGG_SRC_HW"; simState.adcGroupStatus = "ADC_IDLE";
          mcalAdcStartGroupConversion(true);
          renderAll();
        }
      },
      {
        label: "🧪 Đổi Streaming Linear ↔ Circular",
        run() {
          simState.adcStreamingCircular = !simState.adcStreamingCircular;
          addApiTrace("Adc", "STREAM MODE", `Đổi Buffer Type -> ${simState.adcStreamingCircular ? "ADC_STREAM_BUFFER_CIRCULAR" : "ADC_STREAM_BUFFER_LINEAR"}`, "Circular quay vòng ghi đè liên tục không tự dừng ở ADC_IDLE", "SWS_Adc_00319", "tx");
          renderAll();
        }
      },
      {
        label: "🧪 Dừng kích phần cứng DisableHardwareTrigger",
        run() {
          simState.adcHwTrigArmed = false; simState.adcGroupStatus = "ADC_IDLE";
          addApiTrace("Adc", "HW TRIG OFF", "Adc_DisableHardwareTrigger(AdcGroup_0)", "Đóng cổng Trigger phần cứng, dừng chuyển đổi", "SWS_Adc_00145", "warn");
          recomputeRegisters(); renderAll();
        }
      }
    ]
  },

  // ---------------- S8: PWM DUTY 0..0x8000, PERIOD & IDLE ----------------
  S8: {
    id: "S8", workspace: "Pwm", hwView: "ADC_PWM", cfgTab: 4,
    title: "S8: Pwm Điều Chế Duty (0..0x8000), Đổi Chu Kỳ & SetOutputToIdle",
    summary: "Quy chuẩn Duty 16-bit (0x8000 = 100%), cập nhật cuối chu kỳ tránh xung gai (Shadow Register), đổi chu kỳ và đưa về Idle.",
    steps: [
      {
        label: "Bước 1: Pwm_Init() — Khởi phát xung mặc định 50% (0x4000)",
        desc: "EcuM khởi tạo Pwm_Init(&Pwm_Config), chân PA3 (FanPwm0) phát xung 20 kHz (50 us), Duty = 50%, Bit 4 (PWM_OUT_ACT) = 1.",
        exec() {
          simState.activeWorkspace = "Pwm"; simState.activeHwView = "ADC_PWM";
          simState.pwmInit = true; ecucConfig.PwmDriverInitialized = true;
          ecucConfig.PwmChannelClass = "PWM_VARIABLE_PERIOD";
          mcalPwmSetDutyCycle(0x4000);
          setStepFocus("MOD_PWM", ["arr_ecum_mcal", "arr_pwm_hw"], ["MOD_ECUM", "MOD_PWM", "MOD_HW"],
            "1. Pwm_Init(): Khởi phát sóng PWM 20kHz · Duty 50% (0x4000)",
            "EcuM_AL_DriverInitOne() gọi Pwm_Init(&Pwm_Config)",
            "Nạp thanh ghi Period & Compare cho Timer FTM/eMIOS (0x4000 = 16384/32768)",
            "Bật Bit 4 (PWM_OUT_ACT = 1) phát xung ra chân PA3", "SWS_Pwm_00007");
        }
      },
      {
        label: "Bước 2: IoHwAb gọi Pwm_SetDutyCycle(PwmCh_0, 0x6000 = 75%)",
        desc: "Thay đổi độ rộng xung lên 75% (0x6000). Nhờ Shadow Register (UpdatedEndperiod=TRUE), xung mới ăn vào đầu chu kỳ kế tiếp nên không bị glitch!",
        exec() {
          mcalPwmSetDutyCycle(0x6000);
          setStepFocus("MOD_PWM", ["arr_iohwab_pwm", "arr_pwm_hw"], ["MOD_IOHWAB", "MOD_PWM", "MOD_HW"],
            "2. Pwm_SetDutyCycle(0x6000): Tăng tốc lên 75% (No Glitch)",
            "IoHwAb chuyển đổi 75% → 0x6000 gọi Pwm_SetDutyCycle()",
            "Tính Ticks = (PeriodTicks * 0x6000) >> 15 & nạp Shadow Register",
            "Đồ thị sóng PWM trên Panel 1A mở rộng T_on = 75%", "SWS_Pwm_00013");
        }
      },
      {
        label: "Bước 3: Đổi chu kỳ & bật Notification với Pwm_SetPeriodAndDuty()",
        desc: "Kênh thuộc lớp PWM_VARIABLE_PERIOD cho phép đổi đồng thời tần số sang 10 kHz (100 us) & Duty = 25% (0x2000), kèm ngắt sườn lên.",
        exec() {
          mcalPwmSetPeriodAndDuty(100, 0x2000);
          simState.pwmNotifEnabled = true; simState.pwmNotifCount += 1;
          addApiTrace("Pwm", "EDGE IRQ ↑", "Pwm_EnableNotification(0, PWM_RISING_EDGE) -> Pwm_Notification_0()", "Kích hoạt callback ngắt mỗi sườn lên của xung PWM (Bit 4 Thanh B=1)", "SWS_Pwm_00023", "cbk");
          setStepFocus("MOD_PWM", ["arr_iohwab_pwm", "arr_pwm_hw"], ["MOD_IOHWAB", "MOD_PWM", "MOD_HW"],
            "3. Pwm_SetPeriodAndDuty(100us, 0x2000) & Edge Notification",
            "IoHwAb gọi Pwm_SetPeriodAndDuty() trên kênh PWM_VARIABLE_PERIOD",
            "Cập nhật đồng bộ thanh ghi MOD (10 kHz) và CnV (25%)",
            "Bật ngắt sườn lên PWM_RISING_EDGE", "SWS_Pwm_00019");
        }
      },
      {
        label: "Bước 4: Dừng khẩn cấp — Pwm_SetOutputToIdle(PwmCh_0)",
        desc: "Đưa ngay chân PWM về mức an toàn PwmIdleState (PWM_LOW) khi tắt động cơ/quạt; Bit 4 (PWM_OUT_ACT) hạ xuống 0!",
        exec() {
          mcalPwmSetOutputToIdle();
          setStepFocus("MOD_PWM", ["arr_iohwab_pwm", "arr_pwm_hw"], ["MOD_IOHWAB", "MOD_PWM", "MOD_HW"],
            "4. Pwm_SetOutputToIdle(): Ngắt xung đưa chân về PWM_LOW",
            "Lệnh tắt khẩn cấp từ IoHwAb / SWC",
            "Ngắt đầu ra Timer Compare, ép chân PA3 về mức PwmIdleState",
            "Hạ Bit 4 (PWM_OUT_ACT = 0) trên Thanh A", "SWS_Pwm_00021");
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Đổi Period khi FIXED_PERIOD (DET 0x13)",
        run() {
          ecucConfig.PwmChannelClass = "PWM_FIXED_PERIOD"; applyConfigToState();
          mcalPwmSetPeriodAndDuty(80, 0x4000);
          renderAll();
        }
      },
      {
        label: "🧪 Test cực hạn 0% (0x0000) & 100% (0x8000)",
        run() {
          const nextD = simState.pwmDutyHex >= 0x8000 ? 0x0000 : 0x8000;
          mcalPwmSetDutyCycle(nextD);
          renderAll();
        }
      },
      {
        label: "🧪 Đọc Pwm_GetOutputState(PwmCh_0)",
        run() {
          const lvl = (simState.pwmOutputActive && simState.pwmDutyHex >= 0x4000 && !simState.pwmIdleForced) ? "PWM_HIGH" : "PWM_LOW";
          addApiTrace("Pwm", "GET STATE", `Pwm_GetOutputState(PwmCh_0) -> ${lvl}`, `Trạng thái chân hiện tại = ${lvl} (IdleForced=${simState.pwmIdleForced})`, "SWS_Pwm_00022", "rx");
          renderAll();
        }
      }
    ]
  },

  // ---------------- S9: E2E CLOSED LOOP SWC_THERMALCTRL ----------------
  S9: {
    id: "S9", workspace: "E2E", hwView: "ADC_PWM", cfgTab: 3,
    title: "S9: 🔗 E2E Loop SWC_ThermalCtrl (Cảm Biến → Adc → IoHwAb → SWC → Pwm + Dio)",
    summary: "Vòng lặp điều khiển nhiệt độ động cơ khép kín xuyên suốt 5 tầng: SWC_ThermalCtrl ↔ RTE ↔ IoHwAb ↔ Adc / Pwm / Dio ↔ Silicon Hardware.",
    steps: [
      {
        label: "Bước 1: Nhiệt độ nước tăng (4000mV → Adc đọc 3276 Raw ≈ 105°C)",
        desc: "Cảm biến nhiệt trên PA2 tăng lên 4.00V. Adc chuyển đổi SAR 12-bit = 3276, IoHwAb quy đổi thành 105.0°C gửi qua RTE cho SWC_ThermalCtrl.",
        exec() {
          simState.activeWorkspace = "E2E"; simState.activeHwView = "ADC_PWM";
          ecucConfig.AdcSimInputVoltageMv = 4000; applyConfigToState();
          simState.adcGroupStatus = "ADC_IDLE"; simState.adcBufferReady = true;
          mcalAdcStartGroupConversion(true); mcalAdcCompleteSampleStep();
          const raw = mcalAdcReadGroup();
          simState.swcThermal.tempC = simState.adcTempDegC;
          setStepFocus("MOD_ADC", ["arr_adc_hw", "arr_adc_iohwab", "arr_iohwab_rte", "arr_rte_swc"],
            ["MOD_HW", "MOD_ADC", "MOD_IOHWAB", "MOD_RTE", "MOD_SWC"],
            "1. Đường đi Input: Pin AN0 (4000mV) → Adc → IoHwAb → RTE → SWC",
            "Điện áp cảm biến nhiệt độ 4000 mV (Raw 3276 / 4095)",
            `IoHwAb chuẩn hóa sang đại lượng vật lý ${simState.swcThermal.tempC}°C`,
            "RTE đẩy 105°C vào Runnable RE_ThermalMain_10ms()", "SWS_Adc_00329");
        }
      },
      {
        label: "Bước 2: SWC_ThermalCtrl tính toán: Quá nhiệt > 95°C!",
        desc: "Thuật toán trên SWC hoàn toàn không biết chân Pin nào là Fan hay LED; nó chỉ quyết định: Fan = 90% và OverTempLed = ON.",
        exec() {
          simState.swcThermal.fanPct = 90; simState.swcThermal.warnLed = true; simState.swcThermal.runCount += 1;
          addApiTrace("SWC", "SWC CALC", `SWC_ThermalCtrl: Temp=${simState.swcThermal.tempC}°C (>95°C) => Fan=90%, WarnLed=ON`, "SWC ra quyết định hoàn toàn độc lập phần cứng thông qua các Port của RTE", "RTE VFB", "ok");
          setStepFocus("MOD_SWC", ["arr_swc_rte"], ["MOD_SWC", "MOD_RTE"],
            "2. Thuật toán SWC_ThermalCtrl (Ứng dụng độc lập phần cứng)",
            `Nhận đầu vào nhiệt độ: ${simState.swcThermal.tempC}°C từ RTE`,
            "So sánh ngưỡng quá nhiệt (95°C) → Xuất lệnh FanSpeed=90%, WarnLed=TRUE",
            "Gọi 2 Client-Server Port trên RTE xuống tầng IoHwAb", "AUTOSAR VFB");
        }
      },
      {
        label: "Bước 3: RTE → IoHwAb → Pwm_SetDutyCycle(90% = 0x7333)",
        desc: "IoHwAb nhận lệnh 90%, quy đổi 90% * 0x8000 = 0x7333 và gọi Pwm_SetDutyCycle(PwmCh_0, 0x7333) tăng tốc quạt làm mát hết công suất!",
        exec() {
          mcalPwmSetDutyCycle(0x7333);
          setStepFocus("MOD_PWM", ["arr_swc_rte", "arr_rte_iohwab", "arr_iohwab_pwm", "arr_pwm_hw"],
            ["MOD_SWC", "MOD_RTE", "MOD_IOHWAB", "MOD_PWM", "MOD_HW"],
            "3. Đường đi Output PWM: SWC (90%) → IoHwAb (0x7333) → Pwm",
            "Rte_Call_CoolingFan_SetSpeed(90) → IoHwAb",
            "IoHwAb quy đổi 90% = 0x7333 & gọi Pwm_SetDutyCycle()",
            "Quạt tản nhiệt quay 90% tốc độ (Bit 4 PWM_OUT_ACT = 1)", "SWS_Pwm_00013");
        }
      },
      {
        label: "Bước 4: RTE → IoHwAb → Dio_WriteChannel(PA1, STD_HIGH) Bật Đèn Đỏ",
        desc: "Song song đó, IoHwAb bật đèn cảnh báo quá nhiệt táp-lô qua Dio_WriteChannel(PA1, STD_HIGH). Bit 4, 5, 6 trên Thanh A đồng loạt phản ánh trạng thái vòng kín!",
        exec() {
          mcalDioWriteChannel(1, 1);
          setStepFocus("MOD_DIO", ["arr_swc_rte", "arr_rte_iohwab", "arr_iohwab_dio", "arr_dio_hw"],
            ["MOD_SWC", "MOD_RTE", "MOD_IOHWAB", "MOD_DIO", "MOD_HW"],
            "4. Đường đi Output DIO: SWC (TRUE) → IoHwAb → Dio_WriteChannel(PA1)",
            "Rte_Call_OverTempLed_Write(TRUE) → IoHwAb",
            "IoHwAb ánh xạ Logic ON sang PA1 (Active High) và gọi Dio_WriteChannel()",
            "Đèn WarnLed PA1 sáng (Bit 6 PIN_DIO_LVL = 1), hoàn tất vòng kín E2E!", "SWS_Dio_00028");
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Giảm nhiệt về 2000mV (65°C - Mát lại)",
        run() {
          ecucConfig.AdcSimInputVoltageMv = 2000; applyConfigToState();
          qaRunThermalLoopStep();
        }
      },
      {
        label: "🧪 Cảm biến chạm nguồn 4800mV (Short Vbat)",
        run() {
          ecucConfig.AdcSimInputVoltageMv = 4800; applyConfigToState();
          mcalAdcStartGroupConversion(true); mcalAdcCompleteSampleStep(); mcalAdcReadGroup();
          demReport("IoHwAb", "IOHWAB_E_TEMP_SHORT_HIGH", true, "Điện áp AN0=4800mV vượt dải hợp lệ (200..4600mV) → Thay thế giá trị an toàn Fan=100%!", "ISO 26262");
          mcalPwmSetDutyCycle(0x8000); mcalDioWriteChannel(1, 1);
          renderAll();
        }
      },
      {
        label: "🧪 Tắt khẩn cấp quạt Pwm_SetOutputToIdle()",
        run() {
          mcalPwmSetOutputToIdle();
          renderAll();
        }
      }
    ]
  },

  // ---------------- S10: SPI SEQUENCE -> JOB -> CHANNEL (IB) ----------------
  S10: {
    id: "S10", workspace: "Spi", hwView: "SPI_CAN", cfgTab: 5,
    title: "S10: Spi Truyền Bất Đồng Bộ Seq → Job → Channel Với Internal Buffer (IB)",
    summary: "Giao tiếp chip SBC qua QSPI: Spi_WriteIB → Spi_AsyncTransmit → kéo CS=LOW dịch MOSI/MISO → JobEnd/SeqEndNotification → Spi_ReadIB.",
    steps: [
      {
        label: "Bước 1: Spi_WriteIB(SpiCh_Sbc) nạp lệnh 4-byte vào IB",
        desc: "Nạp lệnh Watchdog chip nguồn SBC [A5 01 55 FF] vào bộ đệm nội bộ IB của driver Spi (Bit 3 BUFF_LOCK_RDY = 1).",
        exec() {
          simState.activeWorkspace = "Spi"; simState.activeHwView = "SPI_CAN";
          simState.spiHwError = false; ecucConfig.SpiLevelDelivered = "2";
          mcalSpiWriteIbOrEb(false);
          setStepFocus("MOD_SPI", ["arr_iohwab_spi"], ["MOD_IOHWAB", "MOD_SPI"],
            "1. Spi_WriteIB(): Nạp dữ liệu truyền vào Internal Buffer",
            "CDD_Sbc / Wdg gọi Spi_WriteIB(SpiCh_Sbc, TxData)",
            "Sao chép 4 bytes [A5 01 55 FF] vào vùng RAM nội bộ của Driver Spi",
            "Bit 3 (BUFF_LOCK_RDY = 1) sẵn sàng truyền", "SWS_Spi_00018");
        }
      },
      {
        label: "Bước 2: Spi_AsyncTransmit(SpiSeq_SbcControl) → SPI_BUSY",
        desc: "Đẩy Sequence vào bộ lập lịch; Spi chuyển sang SPI_BUSY, đặt SeqResult = SPI_SEQ_PENDING và kéo chân CS_SBC = LOW!",
        exec() {
          mcalSpiAsyncTransmit("SpiSeq_SbcControl", [{ name: "Job_SbcWdg", prio: 2, cs: "CS_SBC", bytes: [...simState.spiTxBytes] }]);
          setStepFocus("MOD_SPI", ["arr_iohwab_spi", "arr_spi_hw"], ["MOD_IOHWAB", "MOD_SPI", "MOD_HW"],
            "2. Spi_AsyncTransmit(): Kéo CS_SBC=LOW & Dịch xung SCLK",
            "Lệnh Spi_AsyncTransmit(SpiSeq_SbcControl) non-blocking",
            "Đặt SPI_SEQ_PENDING (Bit 6=1) và QSPI_SR[BUSY]=1 (Bit 3 Thanh A=1)",
            "Chân PB1 (CS_SBC) kéo xuống LOW, đẩy byte ra MOSI", "SWS_Spi_00177");
        }
      },
      {
        label: "Bước 3: Hoàn tất dịch bit → Spi_JobEndNotification & SeqEndNotification",
        desc: "QSPI dịch xong 4 byte nhận MISO đảo về [5A FE AA 00], nhả CS=HIGH, phát ngắt gọi Spi_JobEndNotification() rồi Spi_SeqEndNotification().",
        exec() {
          mcalSpiStepComplete();
          setStepFocus("MOD_SPI", ["arr_spi_hw", "arr_iohwab_spi"], ["MOD_HW", "MOD_SPI", "MOD_IOHWAB"],
            "3. Ngắt QSPI: Nhả CS & kích chuỗi Callbacks lên tầng trên",
            "Thanh ghi dịch hoàn tất byte cuối cùng trên MISO",
            "Nhả CS=HIGH, xóa cờ bận SPI_SHF_BSY=0, chuyển SeqResult = SPI_SEQ_OK",
            "Gọi Spi_JobEndNotification() → Spi_SeqEndNotification()", "SWS_Spi_00264");
        }
      },
      {
        label: "Bước 4: Spi_ReadIB() đọc lại dữ liệu phản hồi từ chip SBC",
        desc: "Trong callback hoặc task sau đó, tầng trên gọi Spi_ReadIB(SpiCh_Sbc, RxBuf) lấy phản hồi trạng thái từ chip SBC.",
        exec() {
          addApiTrace("Spi", "READ IB", `Spi_ReadIB(SpiCh_Sbc, &RxBuf) = [${simState.spiRxBytes.join(" ")}]`, "Đọc dữ liệu MISO đã thu nhận từ Internal Rx Buffer về Wdg/CDD", "SWS_Spi_00027", "rx");
          setStepFocus("MOD_SPI", ["arr_iohwab_spi"], ["MOD_SPI", "MOD_IOHWAB"],
            "4. Spi_ReadIB(): Đọc chuỗi byte phản hồi từ SBC",
            "Bộ đệm Rx IB đang giữ 4 byte từ MISO",
            "Copy từ Rx IB ra con trỏ RxBuf của tầng gọi",
            "Hoàn tất chu kỳ làm tươi External Watchdog qua SPI", "SWS_Spi_00027");
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Đổi sang SPI_POLLING_MODE",
        run() {
          ecucConfig.SpiAsyncMode = "SPI_POLLING_MODE"; applyConfigToState();
          addApiTrace("Spi", "ASYNC MODE", "Spi_SetAsyncMode(SPI_POLLING_MODE)", "Chuyển Bit 5 (ASYNC_IRQ_MODE)=0: Truyền sẽ xử lý bằng Spi_MainFunction_Handling()", "SWS_Spi_00152", "warn");
          renderAll();
        }
      },
      {
        label: "🧪 Hủy khẩn cấp bằng Spi_Cancel()",
        run() {
          mcalSpiWriteIbOrEb(false);
          mcalSpiAsyncTransmit("SpiSeq_SbcControl", [{ name: "Job_SbcWdg", prio: 2, cs: "CS_SBC" }]);
          simState.spiStatus = "SPI_IDLE"; simState.spiSeqResult = "SPI_SEQ_CANCELLED"; simState.spiCsLow = false; simState.spiPendingJobs = [];
          addApiTrace("Spi", "CANCELED", "Spi_Cancel(SpiSeq_SbcControl) -> SPI_SEQ_CANCELLED", "Dừng truyền ngay sau Job hiện tại, nhả CS=HIGH", "SWS_Spi_00144", "warn");
          recomputeRegisters(); renderAll();
        }
      },
      {
        label: "🧪 Gọi lồng Spi_AsyncTransmit (DET 0x2A)",
        run() {
          mcalSpiAsyncTransmit("SpiSeq_SbcControl");
          mcalSpiAsyncTransmit("SpiSeq_SbcControl");
          renderAll();
        }
      }
    ]
  },

  // ---------------- S11: SPI EB & INTERRUPTIBLE PREEMPTION ----------------
  S11: {
    id: "S11", workspace: "Spi", hwView: "SPI_CAN", cfgTab: 5,
    title: "S11: Spi External Buffer (EB) & Chèn Ngang Ưu Tiên Interruptible Sequence",
    summary: "Truyền khối lớn zero-copy qua Spi_SetupEB() và minh họa cơ chế Sequence ưu tiên cao (Prio 3) chèn ngang giữa các Job của Sequence ưu tiên thấp (Prio 1).",
    steps: [
      {
        label: "Bước 1: Ea gọi Spi_SetupEB() cấp con trỏ vùng nhớ lớn",
        desc: "Thay vì copy RAM vào IB, Spi_SetupEB() trỏ thẳng tới buffer 64-byte của tầng trên (Ea/EEPROM), tiết kiệm RAM vi điều khiển.",
        exec() {
          simState.activeWorkspace = "Spi"; simState.activeHwView = "SPI_CAN";
          ecucConfig.SpiInterruptibleSequence = true; simState.spiHwError = false;
          mcalSpiWriteIbOrEb(true);
          setStepFocus("MOD_SPI", ["arr_iohwab_spi"], ["MOD_IOHWAB", "MOD_SPI"],
            "1. Spi_SetupEB(): Truyền thẳng con trỏ SrcPtr/DesPtr (Zero-Copy)",
            "Ea (EEPROM Abstraction) truyền cặp con trỏ vùng nhớ ngoài",
            "Lưu địa chỉ SrcPtr & DesPtr trực tiếp vào descriptor kênh EB",
            "Sẵn sàng truyền khối EEPROM nhiều Job liên tiếp", "SWS_Spi_00053");
        }
      },
      {
        label: "Bước 2: Chạy SpiSeq_Eeprom (Prio=1) gồm 2 Job: Job_A & Job_B",
        desc: "Sequence EEPROM Priority=1 bắt đầu thực thi Job_A trước và xếp Job_B trong hàng đợi.",
        exec() {
          mcalSpiAsyncTransmit("SpiSeq_Eeprom_LowPrio", [
            { name: "Job_Eeprom_A", prio: 1, cs: "CS_EEP" },
            { name: "Job_Eeprom_B", prio: 1, cs: "CS_EEP" }
          ]);
          setStepFocus("MOD_SPI", ["arr_spi_hw"], ["MOD_SPI", "MOD_HW"],
            "2. Thực thi SpiSeq_Eeprom (Prio=1): Job_Eeprom_A đang chạy",
            "SpiSeq_Eeprom gồm 2 Job (Job_A → Job_B, Priority=1)",
            "Kéo CS_EEP=LOW thực hiện Job_A, giữ Job_B trong Queue",
            "Chuẩn bị tình huống Sequence khẩn cấp chen ngang", "SWS_Spi_00008");
        }
      },
      {
        label: "Bước 3: Chèn ngang SpiSeq_SbcWdg (Prio=3) ngay giữa Job_A & Job_B!",
        desc: "Nhờ SpiInterruptibleSequence=TRUE, Sequence Prio=3 chen ngang lên đầu hàng đợi ngay sau khi Job_A xong để phục vụ an toàn trước Job_B!",
        exec() {
          mcalSpiAsyncTransmit("SpiSeq_SbcWdg_Urgent", [
            { name: "Job_Urgent_SBC", prio: 3, cs: "CS_SBC" }
          ]);
          setStepFocus("MOD_SPI", ["arr_iohwab_spi", "arr_spi_hw"], ["MOD_IOHWAB", "MOD_SPI", "MOD_HW"],
            "3. Preemption (Prio 3 > Prio 1): Chèn ngang trước Job_B!",
            "Phát lệnh Spi_AsyncTransmit(SpiSeq_SbcWdg, Prio=3)",
            "SpiInterruptibleSequence=TRUE → tạm hoãn Job_B, chèn Job_Urgent_SBC lên trước",
            "Đảm bảo tín hiệu an toàn SBC được phục vụ không bị trễ!", "SWS_Spi_00008");
        }
      },
      {
        label: "Bước 4: Hoàn tất Job_Urgent_SBC trước, sau đó quay lại Job_Eeprom_B",
        desc: "Scheduler xử lý lần lượt theo độ ưu tiên giảm dần: Job_Urgent_SBC (Prio 3) → rồi mới quay về Job_Eeprom_B (Prio 1).",
        exec() {
          mcalSpiStepComplete();
          mcalSpiStepComplete();
          mcalSpiStepComplete();
          setStepFocus("MOD_SPI", ["arr_spi_hw", "arr_iohwab_spi"], ["MOD_HW", "MOD_SPI", "MOD_IOHWAB"],
            "4. Hoàn tất toàn bộ theo thứ tự ưu tiên: Urgent(3) → Eeprom_B(1)",
            "Các ngắt kết thúc Job nối tiếp nhau giải phóng hàng đợi",
            "Mỗi Job nhả chân CS riêng trước khi Job kế kéo CS mới",
            "Trạng thái quay về SPI_IDLE, SPI_SEQ_OK", "SWS_Spi_00259");
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Tắt SpiInterruptibleSequence = FALSE",
        run() {
          ecucConfig.SpiInterruptibleSequence = false; applyConfigToState();
          mcalSpiAsyncTransmit("SpiSeq_Eeprom_LowPrio", [
            { name: "Job_Eeprom_A", prio: 1, cs: "CS_EEP" },
            { name: "Job_Eeprom_B", prio: 1, cs: "CS_EEP" }
          ]);
          simState.spiPendingJobs.push({ name: "Job_Urgent_QueuedAfter", prio: 3, cs: "CS_SBC" });
          addApiTrace("Spi", "NO PREEMPT", "SpiInterruptibleSequence=FALSE -> Job Prio=3 phải chờ hết Job_B!", "Không cho chèn ngang: chạy trọn Job_A -> Job_B rồi mới tới Job_Urgent", "ECUC_Spi_00215", "warn");
          renderAll();
        }
      },
      {
        label: "🧪 So sánh truyền đồng bộ Spi_SyncTransmit()",
        run() {
          addApiTrace("Spi", "SYNC TX", "Spi_SyncTransmit(SpiSeq_Sync0) [Blocking]", "Hàm chặn CPU (Polling nội bộ) cho đến khi dịch xong toàn bộ byte rồi trả E_OK ngay!", "SWS_Spi_00134", "tx");
          simState.spiRxBytes = simState.spiTxBytes.map(h => fmtHex2(parseHexInt(h, 0x55) ^ 0xFF));
          renderAll();
        }
      },
      {
        label: "🧪 Giả lập lỗi HW QSPI (DEM FAILED)",
        run() {
          simState.spiHwError = true;
          mcalSpiAsyncTransmit("SpiSeq_TestErr");
          mcalSpiStepComplete();
          simState.spiHwError = false;
          renderAll();
        }
      }
    ]
  },

  // ---------------- S12: CAN CONTROLLER, CAN-FD & HRH FILTER ----------------
  S12: {
    id: "S12", workspace: "Can", hwView: "SPI_CAN", cfgTab: 6,
    title: "S12: Can Khởi Động Controller, CAN-FD 64B Qua HTH (Multiplexed) & HRH Filter",
    summary: "Luồng CAN xuyên tầng: CanIf gọi Can_SetControllerMode(STARTED) → Can_Write(HTH_0, CAN-FD) → CanIf_TxConfirmation & lọc HRH_0 → CanIf_RxIndication.",
    steps: [
      {
        label: "Bước 1: CanIf gọi Can_SetControllerMode(Ctrl_0, CAN_CS_STARTED)",
        desc: "Sau Can_Init() (CAN_CS_STOPPED), CanSM/CanIf khởi động Controller lên bus CAN_CS_STARTED (Bit 2 CAN_TXRX_OK = 1).",
        exec() {
          simState.activeWorkspace = "Can"; simState.activeHwView = "SPI_CAN";
          simState.canInit = true; ecucConfig.CanDriverInitialized = true;
          simState.canControllerMode = "CAN_CS_STOPPED"; simState.canTxMailboxes = [null, null, null];
          mcalCanSetControllerMode("CAN_CS_STARTED");
          setStepFocus("MOD_CAN", ["arr_canif_can", "arr_can_hw", "arr_can_canif"],
            ["MOD_CANIF", "MOD_CAN", "MOD_HW"],
            "1. Can_SetControllerMode(STARTED) & CanIf_ControllerModeIndication",
            "CanSM → CanIf yêu cầu kết nối Controller #0 vào CAN Bus",
            "Đồng bộ 11 bit lặng trên bus, bật Bit 2 (CAN_TXRX_OK = 1)",
            "Callback CanIf_ControllerModeIndication(STARTED) báo lên CanSM", "SWS_Can_00260");
        }
      },
      {
        label: "Bước 2: Truyền CAN FD từ SWC → COM → PduR → CanIf → Can_Write(HTH_0)",
        desc: "SWC gửi tín hiệu qua RTE/COM/CanIf xuống Can_Write(HTH_0) với CanId có cờ 0x40000000 (CAN FD 16 bytes, BRS 2 Mbps).",
        exec() {
          mcalCanWrite(ecucConfig.CanTxFrameIdHex, 16, "11 22 33 44 55 66 77 88 99 AA BB CC DD EE FF 00");
          setStepFocus("MOD_CAN", ["arr_swc_rte", "arr_rte_canif", "arr_canif_can", "arr_can_hw"],
            ["MOD_SWC", "MOD_RTE", "MOD_CANIF", "MOD_CAN", "MOD_HW"],
            "2. Can_Write(HTH_0, CAN-FD 16B): Nạp Tx Mailbox có Multiplexed",
            "SWC → RTE → COM → PduR → CanIf_Transmit() → Can_Write(HTH_0)",
            "Nhận diện cờ CAN FD (0x40000000), cấp vào Mailbox trống #0 của HTH_0",
            "Đẩy khung tin ra CAN Bus với BRS 2000 kbps", "SWS_Can_00276");
        }
      },
      {
        label: "Bước 3: Hoàn tất phát → CanIf_TxConfirmation()",
        desc: "Khi khung ACK thành công trên bus, ngắt Tx gọi CanIf_TxConfirmation() giúp CanIf giải phóng/rút gói tiếp từ hàng đợi TxQueue.",
        exec() {
          mcalCanCompleteTxAndRx(null);
          setStepFocus("MOD_CAN", ["arr_can_hw", "arr_can_canif", "arr_canif_rte", "arr_rte_swc"],
            ["MOD_HW", "MOD_CAN", "MOD_CANIF", "MOD_RTE", "MOD_SWC"],
            "3. CanIf_TxConfirmation(): Xác nhận truyền thành công lên tầng trên",
            "CAN Controller nhận bit ACK hợp lệ trên bus vật lý",
            "Giải phóng Tx Mailbox #0 và gọi callback CanIf_TxConfirmation()",
            "Báo ngược lên PduR → COM hoàn tất I-PDU", "SWS_Can_00016");
        }
      },
      {
        label: "Bước 4: Nhận khung ID=0x105 khớp bộ lọc HRH_0 → CanIf_RxIndication()",
        desc: "Khung 0x105 khớp Mask 0x7F0 & Code 0x100 nên được hộp thư HRH_0 nhận và đẩy lên CanIf → PduR → COM → RTE → SWC!",
        exec() {
          mcalCanCompleteTxAndRx("0x105");
          setStepFocus("MOD_CAN", ["arr_can_hw", "arr_can_canif", "arr_canif_rte", "arr_rte_swc"],
            ["MOD_HW", "MOD_CAN", "MOD_CANIF", "MOD_RTE", "MOD_SWC"],
            "4. HRH_0 Filter Match (0x105) → CanIf_RxIndication()",
            "CAN Bus nhận khung ID=0x105 (khớp 0x100 / Mask 0x7F0)",
            "Đóng gói Can_HwType & PduInfoType gọi CanIf_RxIndication()",
            "Routing dữ liệu lên COM → Rte_Read() cho SWC sử dụng", "SWS_Can_00279");
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Bắn 4 gói tràn 3 Tx Mailbox (CAN_BUSY)",
        run() {
          mcalCanSetControllerMode("CAN_CS_STARTED");
          mcalCanWrite("0x40000201", 8, "01 02 03 04 05 06 07 08");
          mcalCanWrite("0x40000202", 8, "02 02 03 04 05 06 07 08");
          mcalCanWrite("0x40000203", 8, "03 02 03 04 05 06 07 08");
          mcalCanWrite("0x40000204", 8, "04 02 03 04 05 06 07 08");
          renderAll();
        }
      },
      {
        label: "🧪 Bắn gói Rx ID=0x350 (Bị lọc bỏ tại HW)",
        run() {
          mcalCanCompleteTxAndRx("0x350");
          renderAll();
        }
      },
      {
        label: "🧪 Tắt CAN FD rồi gửi 16B (DET 0x03)",
        run() {
          ecucConfig.CanFdBaudrateConfig = false; applyConfigToState();
          mcalCanWrite("0x40000201", 16, "11 22 33 44");
          renderAll();
        }
      }
    ]
  },

  // ---------------- S13: CAN BUS-OFF & WAKEUP ----------------
  S13: {
    id: "S13", workspace: "Can", hwView: "SPI_CAN", cfgTab: 6,
    title: "S13: Can Xử Lý Sự Cố Bus-Off (TEC ≥ 256 → CanIf_ControllerBusOff) & Wakeup",
    summary: "Giám sát bộ đếm lỗi TEC tăng ngưỡng 256 gây Bus-Off, phối hợp CanSM phục hồi controller, và dò xung đánh thức lúc CAN_CS_SLEEP.",
    steps: [
      {
        label: "Bước 1: Nhiễu bus khiến TEC vượt 128 → CAN_ERRORSTATE_PASSIVE",
        desc: "Các khung truyền lỗi liên tiếp làm bộ đếm Transmit Error Counter (TEC) tăng lên 140; Controller chuyển vào Error Passive cảnh báo sớm.",
        exec() {
          simState.activeWorkspace = "Can"; simState.activeHwView = "SPI_CAN";
          mcalCanSetControllerMode("CAN_CS_STARTED");
          simState.canTec = 140; simState.canErrorState = "CAN_ERRORSTATE_PASSIVE";
          addApiTrace("Can", "ERR PASSIVE", "Can_GetControllerErrorState(0) -> CAN_ERRORSTATE_PASSIVE (TEC=140)", "Lỗi truyền đạt ngưỡng >127 nhưng controller vẫn tham gia bus ở chế độ thụ động", "SWS_Can_00020", "warn");
          setStepFocus("MOD_CAN", ["arr_can_hw", "arr_can_canif"], ["MOD_HW", "MOD_CAN", "MOD_CANIF"],
            "1. Error State Passive (TEC = 140 > 127)",
            "Mất ACK / Lỗi bit liên tiếp trên đường truyền CAN_H/CAN_L",
            "Bộ đếm TEC phần cứng đạt 140 → báo CAN_ERRORSTATE_PASSIVE",
            "Chưa ngắt bus nhưng gửi Passive Error Flag để tránh phá mạng", "SWS_Can_00020");
        }
      },
      {
        label: "Bước 2: TEC chạm 256 → BUS-OFF & Gọi CanIf_ControllerBusOff()",
        desc: "Chuẩn CAN/AUTOSAR buộc Controller tự động tách khỏi bus (CAN_CS_STOPPED, Bit 2=0) và gọi ngay CanIf_ControllerBusOff() lên CanSM!",
        exec() {
          mcalCanTriggerBusOff();
          setStepFocus("MOD_CAN", ["arr_can_hw", "arr_can_canif"], ["MOD_HW", "MOD_CAN", "MOD_CANIF"],
            "2. Sự cố BUS-OFF (TEC = 256): Tự động ngắt khỏi CAN Bus",
            "TEC chạm ngưỡng 256 trên silicon FlexCAN / M_CAN",
            "Hạ Bit 2 (CAN_TXRX_OK=0), chuyển State → CAN_CS_STOPPED & phát ngắt BusOff",
            "Gọi CanIf_ControllerBusOff() → CanSM bắt đầu đếm thời gian phục hồi", "SWS_Can_00020");
        }
      },
      {
        label: "Bước 3: CanSM phục hồi: Gọi Can_SetControllerMode(CAN_CS_STARTED)",
        desc: "Sau khoảng trễ BorTimeL1, CanSM gọi lại Can_SetControllerMode(STARTED) để reset bộ đếm lỗi TEC=0 và kết nối lại mạng CAN.",
        exec() {
          mcalCanSetControllerMode("CAN_CS_STARTED");
          setStepFocus("MOD_CAN", ["arr_canif_can", "arr_can_hw", "arr_can_canif"], ["MOD_CANIF", "MOD_CAN", "MOD_HW"],
            "3. Phục hồi sau Bus-Off: Khởi động lại CAN_CS_STARTED",
            "CanSM hết bộ đếm phục hồi BorTimeL1 → CanIf → Can_SetControllerMode(STARTED)",
            "Reset bộ đếm TEC về 0, khôi phục CAN_ERRORSTATE_ACTIVE",
            "Bật lại Bit 2 (CAN_TXRX_OK = 1), sẵn sàng truyền nhận", "SWS_Can_00260");
        }
      },
      {
        label: "Bước 4: Ngủ CAN_CS_STOPPED → CAN_CS_SLEEP & Đón xung Wakeup",
        desc: "Chuyển tuần tự STARTED → STOPPED → SLEEP rồi kích hoạt mạch lọc đánh thức trên CAN Bus (Bit 2 WAKEUP_EVENT = 1 → Can_CheckWakeup).",
        exec() {
          mcalCanSetControllerMode("CAN_CS_STOPPED");
          mcalCanSetControllerMode("CAN_CS_SLEEP");
          simState.canWakeupDetected = true;
          addApiTrace("Can", "WAKEUP ↑", "Bus Dominant Pulse -> Bit 2 WAKEUP_EVENT=1 -> Can_CheckWakeup(0) == E_OK", "Đánh thức ECU qua EcuM_CheckWakeup() khi phát hiện hoạt động trên CAN Bus", "SWS_Can_00360", "cbk");
          setStepFocus("MOD_CAN", ["arr_can_hw", "arr_can_canif"], ["MOD_HW", "MOD_CAN", "MOD_ECUM"],
            "4. CAN_CS_SLEEP & Can_CheckWakeup(): Đánh thức ECU từ bus",
            "Xung trội (Wakeup Pattern) xuất hiện trên đường dây CAN lúc đang ngủ",
            "Bật cờ WAKEUP_EVENT (Bit 2 Thanh B = 1) & xác nhận Can_CheckWakeup()",
            "Báo EcuM thức dậy khởi động lại hệ thống", "SWS_Can_00360");
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Đọc ErrorState & TEC Counter",
        run() {
          addApiTrace("Can", "GET ERR", `Can_GetControllerErrorState(0)=${simState.canErrorState}, TEC=${simState.canTec}`, "Truy vấn trực tiếp bộ đếm lỗi phần cứng phục vụ Dem/CanSM", "SWS_Can_00450", "rx");
          renderAll();
        }
      },
      {
        label: "🧪 Chuyển thẳng STARTED → SLEEP (DET 0x06)",
        run() {
          simState.canControllerMode = "CAN_CS_STARTED";
          mcalCanSetControllerMode("CAN_CS_SLEEP");
          renderAll();
        }
      },
      {
        label: "🧪 Bấm Trigger Bus-Off ngay",
        run() {
          mcalCanTriggerBusOff();
          renderAll();
        }
      }
    ]
  },

  // ---------------- S14: FLS ERASE -> WRITE -> READ/COMPARE ----------------
  S14: {
    id: "S14", workspace: "Fls", hwView: "FLS", cfgTab: 7,
    title: "S14: Fls Xóa Sector – Ghi Page – Đọc & So Sánh (NvM → Fee → Fls_MainFunction)",
    summary: "Quy trình bất đồng bộ Non-Blocking chuẩn AUTOSAR Flash: Fls_Erase → Fls_MainFunction (về 0xFF) → Fls_Write chia khối 8B/Tick → Write Verify → Compare.",
    steps: [
      {
        label: "Bước 1: NvM → Fee → Fls_Erase(0x0000, Sector) & chạy MainFunction",
        desc: "Flash chỉ ghi được từ 1 (0xFF) xuống 0 nên Fee phải gọi Fls_Erase() trước. Trong Fls_MainFunction(), toàn bộ Sector được xóa về 0xFF.",
        exec() {
          simState.activeWorkspace = "Fls"; simState.activeHwView = "FLS";
          simState.flsInit = true; ecucConfig.FlsDriverInitialized = true;
          ecucConfig.FlsDefaultMode = "MEMIF_MODE_SLOW"; ecucConfig.FlsTargetAddressHex = "0x0000";
          simState.flsHwFault = false; simState.flsStatus = "MEMIF_IDLE";
          simState.flsMemory.fill(0xAA);
          mcalFlsStartJob("ERASE", "0x0000", 32);
          mcalFlsMainFunctionStep();
          setStepFocus("MOD_FLS", ["arr_swc_rte", "arr_rte_fee", "arr_fee_fls", "arr_fls_hw", "arr_fls_fee"],
            ["MOD_SWC", "MOD_RTE", "MOD_FEE", "MOD_FLS", "MOD_HW"],
            "1. Fls_Erase(0x0000) + Fls_MainFunction(): Đưa 32B Sector về 0xFF",
            "SWC → NvM → Fee gọi Fls_Erase() (Non-blocking trả về ngay)",
            "Fls_MainFunction() xóa ô nhớ về 0xFF (ERASED) & gọi Fee_JobEndNotification()",
            "Vùng Sector 0 đã sạch sẽ, đủ điều kiện vật lý để ghi Page mới", "SWS_Fls_00218");
        }
      },
      {
        label: "Bước 2: Fls_Write(0x0000, 16B) ở chế độ SLOW (8 Bytes/Tick)",
        desc: "Fee gọi Fls_Write(16B). Vì MEMIF_MODE_SLOW giới hạn 8B/Tick, Bit 1 (FLS_HV_BUSY=1) bật lên và nhịp MainFunction #1 chỉ ghi 8 byte Page #0.",
        exec() {
          mcalFlsStartJob("WRITE", "0x0000", 16);
          mcalFlsMainFunctionStep();
          setStepFocus("MOD_FLS", ["arr_fee_fls", "arr_fls_hw"], ["MOD_FEE", "MOD_FLS", "MOD_HW"],
            "2. Fls_Write() Tick #1 (MEMIF_MODE_SLOW = 8B/Tick): Ghi Page #0",
            "Fee gọi Fls_Write(0x0000, 16 Bytes)",
            "Fls_MainFunction() lập trình 8/16 Bytes (Page #0) tránh chiếm dụng CPU lâu",
            "Status vẫn MEMIF_BUSY (50% tiến độ) chờ nhịp Tick kế tiếp", "SWS_Fls_00223");
        }
      },
      {
        label: "Bước 3: Nhịp Fls_MainFunction() #2 — Ghi nốt Page #1 & Write Verify",
        desc: "Nhịp OS Task thứ 2 ghi nốt 8 byte Page #1, thực hiện Write Verification đối chiếu Flash == Buffer và gọi Fee_JobEndNotification()!",
        exec() {
          mcalFlsMainFunctionStep();
          setStepFocus("MOD_FLS", ["arr_fls_hw", "arr_fls_fee", "arr_fee_rte"], ["MOD_HW", "MOD_FLS", "MOD_FEE", "MOD_RTE"],
            "3. Fls_MainFunction() Tick #2: Hoàn tất 16/16B & Verify thành công",
            "Chu kỳ Fls_MainFunction() kế tiếp từ SchM",
            "Ghi nốt Page #1 (Byte 8..15), kiểm tra Write Verification",
            "Đặt MEMIF_IDLE + MEMIF_JOB_OK & gọi Fee_JobEndNotification()", "SWS_Fls_00347");
        }
      },
      {
        label: "Bước 4: Fls_Compare(0x0000, 16B) xác nhận toàn vẹn 100% trước khi xong",
        desc: "Fee đọc kiểm tra toàn vẹn qua Fls_Compare(), xác nhận byte-by-byte khớp hoàn toàn với dữ liệu RAM trước khi báo OK lên NvM/SWC.",
        exec() {
          mcalFlsStartJob("COMPARE", "0x0000", 16);
          mcalFlsMainFunctionStep();
          setStepFocus("MOD_FLS", ["arr_fee_fls", "arr_fls_hw", "arr_fls_fee", "arr_fee_rte", "arr_rte_swc"],
            ["MOD_FEE", "MOD_FLS", "MOD_HW", "MOD_RTE", "MOD_SWC"],
            "4. Fls_Compare(): Xác nhận toàn vẹn 100% lên NvM → SWC",
            "Fee gọi Fls_Compare(0x0000, ExpectedBuf, 16B)",
            "Đối chiếu Flash với RAM qua Fls_MainFunction() → Khớp hoàn toàn",
            "Báo NvM_JobEndNotification(NVM_REQ_OK) hoàn tất lưu trữ Non-Volatile", "SWS_Fls_00241");
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Chuyển MEMIF_MODE_FAST (Ghi 16B trong 1 Tick)",
        run() {
          ecucConfig.FlsDefaultMode = "MEMIF_MODE_FAST"; applyConfigToState();
          simState.flsStatus = "MEMIF_IDLE"; simState.flsMemory.fill(0xFF);
          mcalFlsStartJob("WRITE", "0x0000", 16);
          mcalFlsMainFunctionStep();
          renderAll();
        }
      },
      {
        label: "🧪 Ghi đè khi CHƯA Erase (DEM WRITE_FAILED!)",
        run() {
          simState.flsStatus = "MEMIF_IDLE"; simState.flsMemory[0] = 0x5A;
          ecucConfig.FlsWriteVerificationEnabled = true; applyConfigToState();
          mcalFlsStartJob("WRITE", "0x0000", 16);
          mcalFlsMainFunctionStep();
          renderAll();
        }
      },
      {
        label: "🧪 Lỗi Compare (MEMIF_BLOCK_INCONSISTENT)",
        run() {
          simState.flsStatus = "MEMIF_IDLE"; simState.flsMemory[0] = 0x99;
          simState.flsCompareBytes = [0x5A, 0xA5, 0x01, 0x02];
          mcalFlsStartJob("COMPARE", "0x0000", 16);
          mcalFlsMainFunctionStep();
          simState.flsCompareBytes = [];
          renderAll();
        }
      }
    ]
  },

  // ---------------- S15: FLS BLANK CHECK, CANCEL & ALIGNMENT ----------------
  S15: {
    id: "S15", workspace: "Fls", hwView: "FLS", cfgTab: 7,
    title: "S15: Fls_BlankCheck, Hủy Tác Vụ Khẩn Cấp Fls_Cancel & Lỗi Căn Chỉnh Page",
    summary: "Kiểm tra nhanh Page trống 0xFF bằng Fls_BlankCheck(), hủy khẩn cấp lệnh ghi dở dang bằng Fls_Cancel() và bắt lỗi lệch căn chỉnh PageSize.",
    steps: [
      {
        label: "Bước 1: Fls_BlankCheck(0x0010, 8B) trên Page #2 đang trống 0xFF",
        desc: "Fee kiểm tra nhanh Page #2 đã ở trạng thái ERASED (0xFF) chưa để có thể ghi thẳng mà không cần xóa lại cả Sector!",
        exec() {
          simState.activeWorkspace = "Fls"; simState.activeHwView = "FLS";
          simState.flsStatus = "MEMIF_IDLE"; simState.flsHwFault = false;
          for (let i = 16; i < 24; i++) simState.flsMemory[i] = 0xFF;
          mcalFlsStartJob("BLANK_CHECK", "0x0010", 8);
          mcalFlsMainFunctionStep();
          setStepFocus("MOD_FLS", ["arr_fee_fls", "arr_fls_hw", "arr_fls_fee"], ["MOD_FEE", "MOD_FLS", "MOD_HW"],
            "1. Fls_BlankCheck(0x0010, 8B) -> MEMIF_JOB_OK",
            "Fee kiểm tra Page #2 (Offset 0x0010..0x0017)",
            "Cả 8 byte đều bằng 0xFF (ERASED) → không cần chạy Fls_Erase() tốn thời gian!",
            "Báo MEMIF_JOB_OK, tối ưu hiệu năng Wear-Leveling cho Fee", "SWS_Fls_00371");
        }
      },
      {
        label: "Bước 2: Bắt đầu ghi chậm Fls_Write() mới hoàn thành 50% (8/16B)",
        desc: "Đưa Flash vào MEMIF_BUSY ở chế độ SLOW để chuẩn bị thử nghiệm hủy lệnh khẩn cấp giữa chừng.",
        exec() {
          ecucConfig.FlsDefaultMode = "MEMIF_MODE_SLOW"; applyConfigToState();
          for (let i = 16; i < 32; i++) simState.flsMemory[i] = 0xFF;
          mcalFlsStartJob("WRITE", "0x0010", 16);
          mcalFlsMainFunctionStep();
          setStepFocus("MOD_FLS", ["arr_fee_fls", "arr_fls_hw"], ["MOD_FEE", "MOD_FLS", "MOD_HW"],
            "2. Đang ghi dở dang 8/16B (MEMIF_BUSY · Bit 1 FLS_HV_BUSY=1)",
            "Fls_MainFunction() vừa ghi xong nửa đầu",
            "Flash vẫn giữ bơm điện áp cao bận ở trạng thái MEMIF_JOB_PENDING",
            "Chuẩn bị tình huống tắt nguồn hoặc đọc khẩn cấp cần Fls_Cancel()", "SWS_Fls_00223");
        }
      },
      {
        label: "Bước 3: Fee gọi Fls_Cancel() — Ngắt bơm HV tức thì!",
        desc: "Fls_Cancel() dừng lập tức Job đang chạy (Bit 1 FLS_HV_BUSY: 1→0), chuyển sang MEMIF_JOB_CANCELED và báo lên Fee.",
        exec() {
          mcalFlsCancel();
          setStepFocus("MOD_FLS", ["arr_fee_fls", "arr_fls_fee"], ["MOD_FEE", "MOD_FLS"],
            "3. Fls_Cancel() -> MEMIF_JOB_CANCELED (Hạ Bit 1 FLS_HV_BUSY=0)",
            "Fee phát hiện yêu cầu ưu tiên cao và gọi Fls_Cancel()",
            "Ngắt lập tức mạch bơm HV và đặt Fls về MEMIF_IDLE + MEMIF_JOB_CANCELED",
            "Gọi Fee_JobErrorNotification() để tầng trên biết lệnh bị hủy", "SWS_Fls_00229");
        }
      },
      {
        label: "Bước 4: Thử gọi Fls_Write(0x0003) sai căn chỉnh PageSize=8B → DET!",
        desc: "Địa chỉ 0x0003 không chia hết cho FlsPageSize (8B) nên Fls chặn ngay tại cổng API và báo FLS_E_PARAM_ADDRESS (0x02).",
        exec() {
          mcalFlsStartJob("WRITE", "0x0003", 8);
          setStepFocus("MOD_FLS", ["arr_mcal_det"], ["MOD_FLS", "MOD_ECUM"],
            "4. Kiểm tra ràng buộc Alignment: Chặn địa chỉ lẻ 0x0003",
            "Gọi Fls_Write(0x0003) với FlsPageSize = 8B",
            "0x0003 % 8 != 0 → Phát hiện sai căn chỉnh, không đụng vào thanh ghi HW",
            "Gọi Det_ReportError(FLS_E_PARAM_ADDRESS=0x02)", "SWS_Fls_00026");
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 BlankCheck trên Page #0 đã ghi (Inconsistent)",
        run() {
          simState.flsStatus = "MEMIF_IDLE"; simState.flsMemory[0] = 0x5A;
          mcalFlsStartJob("BLANK_CHECK", "0x0000", 8);
          mcalFlsMainFunctionStep();
          renderAll();
        }
      },
      {
        label: "🧪 Bắt đầu Write 16B rồi bấm Cancel ngay",
        run() {
          simState.flsStatus = "MEMIF_IDLE";
          mcalFlsStartJob("WRITE", "0x0010", 16);
          mcalFlsCancel();
          renderAll();
        }
      },
      {
        label: "🧪 Đặt Offset = 0x0003 & thử Fls_Write()",
        run() {
          ecucConfig.FlsTargetAddressHex = "0x0003"; applyConfigToState();
          mcalFlsStartJob("WRITE", "0x0003", 8);
          renderAll();
        }
      }
    ]
  },

  // ---------------- S16: ALL 8 MODULES DET & DEM FAULT MATRIX ----------------
  S16: {
    id: "S16", workspace: "E2E", hwView: "MCU", cfgTab: 0,
    title: "S16: 🛡️ Kiểm Thử Tổng Hợp Lỗi DET & DEM Trên Cả 8 Module MCAL",
    summary: "Kiểm thử tập trung mọi lớp phòng vệ của 8 module MCAL: Lỗi chưa khởi tạo (*_E_UNINIT), xung đột trạng thái BUSY/TRANSITION và lỗi silicon báo DEM.",
    steps: [
      {
        label: "Bước 1: Chuỗi bẫy DET *_E_UNINIT (Mcu=101, Port=124, Adc=123, Can=80, Fls=92)",
        desc: "Giả lập gọi API trước khi gọi *_Init(): toàn bộ driver đều tự vệ chặn thao tác thanh ghi và đẩy mã ModuleId chính xác lên Det_ReportError().",
        exec() {
          simState.activeWorkspace = "E2E"; simState.activeHwView = "MCU";
          simState.mcuInit = false; simState.portInit = false; simState.adcInit = false; simState.canInit = false; simState.flsInit = false;
          mcalMcuInitClock();
          mcalPortSetPinDirection(0, "PORT_PIN_OUT");
          mcalAdcStartGroupConversion(true);
          mcalCanSetControllerMode("CAN_CS_STARTED");
          mcalFlsStartJob("WRITE", "0x0000", 8);
          setStepFocus("MOD_ECUM", ["arr_mcal_det"], ["MOD_MCU", "MOD_PORT", "MOD_ADC", "MOD_CAN", "MOD_FLS", "MOD_ECUM"],
            "1. Ma trận bảo vệ DET *_E_UNINIT trên các Module MCAL",
            "Gọi hàm dịch vụ khi Bit 7 (MCAL_DRV_INIT) == 0",
            "Từng driver báo đúng ModuleId (101, 124, 123, 80, 92) và ErrorId *_E_UNINIT",
            "Bit 0 (DET_ERR_TRAP = 1) sáng đỏ trên Thanh B!", "AUTOSAR SWS DET");
        }
      },
      {
        label: "Bước 2: Chuỗi bẫy xung đột Trạng thái & Tham số (BUSY / UNCHANGEABLE)",
        desc: "Kiểm thử các lỗi runtime phức tạp: ADC_E_BUSY, PWM_E_PERIOD_UNCHANGEABLE, SPI_E_SEQ_PENDING, CAN_E_TRANSITION, FLS_E_BUSY.",
        exec() {
          qaInitAllMcal();
          ecucConfig.PwmChannelClass = "PWM_FIXED_PERIOD";
          simState.adcGroupStatus = "ADC_BUSY"; mcalAdcStartGroupConversion(true);
          mcalPwmSetPeriodAndDuty(80, 0x4000);
          simState.spiStatus = "SPI_BUSY"; simState.spiActiveSeq = "SpiSeq_SbcControl"; mcalSpiAsyncTransmit("SpiSeq_SbcControl");
          simState.canControllerMode = "CAN_CS_STARTED"; mcalCanSetControllerMode("CAN_CS_SLEEP");
          simState.flsStatus = "MEMIF_BUSY"; mcalFlsStartJob("WRITE", "0x0000", 8);
          setStepFocus("MOD_ECUM", ["arr_mcal_det"], ["MOD_ADC", "MOD_PWM", "MOD_SPI", "MOD_CAN", "MOD_FLS", "MOD_ECUM"],
            "2. Kiểm thử xung đột State Machine (BUSY / TRANSITION / PARAM)",
            "Vi phạm quy tắc máy trạng thái & ràng buộc ECUC trên 5 module",
            "Mỗi module chặn lỗi chính xác theo mã SWS riêng biệt trước khi xuống HW",
            "Xem chi tiết tất cả mã lỗi tại bảng API Call Trace", "AUTOSAR SWS DET");
        }
      },
      {
        label: "Bước 3: Chuỗi báo lỗi phần cứng vật lý lên DEM (Bit 1 DEM_HW_FAULT = 1)",
        desc: "Phân biệt DET (lỗi code dev) vs DEM (hỏng phần cứng sản xuất): MCU_E_CLOCK_FAILURE, SPI_E_HARDWARE_ERROR, FLS_E_ERASE_FAILED.",
        exec() {
          simState.clockFailure = true; syncHardwareClocks();
          demReport("Mcu", "MCU_E_CLOCK_FAILURE", true, "Sập mạch tạo xung PLL trên silicon", "SWS_Mcu_00166");
          simState.spiHwError = true; mcalSpiAsyncTransmit("SpiSeq_Err"); mcalSpiStepComplete(); simState.spiHwError = false;
          simState.flsHwFault = true; simState.flsStatus = "MEMIF_IDLE"; mcalFlsStartJob("ERASE", "0x0000", 32); mcalFlsMainFunctionStep(); simState.flsHwFault = false;
          setStepFocus("MOD_ECUM", ["arr_mcal_det", "arr_mcu_hw", "arr_spi_hw", "arr_fls_hw"],
            ["MOD_MCU", "MOD_SPI", "MOD_FLS", "MOD_ECUM", "MOD_HW"],
            "3. Lỗi Phần Cứng Vật Lý → Dem_SetEventStatus(FAILED)",
            "Sự cố phần cứng ngoài ý muốn (mất clock, kẹt SPI, hỏng cell Flash)",
            "Driver ghi nhận lỗi và báo Dem lưu DTC vào NvM (Bit 1 DEM_HW_FAULT = 1)",
            "Phân biệt rạch ròi giữa DET (Dev Error) và DEM (Production Fault)", "SWS_Dem");
        }
      },
      {
        label: "Bước 4: Khôi phục hệ thống — Init lại toàn bộ 8 Module về sạch sẽ",
        desc: "Xóa các cờ fault giả lập, khóa lại PLL 160 MHz và khôi phục cả 8 module MCAL về trạng thái sẵn sàng.",
        exec() {
          qaInitAllMcal();
          setStepFocus("MOD_MCU", ["arr_ecum_mcal"], ["MOD_ECUM", "MOD_MCU", "MOD_PORT", "MOD_DIO", "MOD_ADC", "MOD_PWM", "MOD_SPI", "MOD_CAN", "MOD_FLS"],
            "4. Hoàn tất kiểm thử & Phục hồi hệ thống sạch sẽ",
            "EcuM chạy lại chuỗi khởi tạo toàn bộ 8 driver MCAL",
            "PLL khóa 160 MHz, xóa mọi trạng thái bận và xóa bộ đếm lỗi",
            "Toàn hệ thống quay lại trạng thái READY 100%", "AUTOSAR R23-11");
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Chạy chuỗi DET *_E_UNINIT (8 Modules)",
        run() {
          SCENARIOS.S16.steps[0].exec(); renderAll();
        }
      },
      {
        label: "🧪 Chạy chuỗi Busy / Transition Conflict",
        run() {
          SCENARIOS.S16.steps[1].exec(); renderAll();
        }
      },
      {
        label: "🧪 Chạy chuỗi DEM Hardware Faults",
        run() {
          SCENARIOS.S16.steps[2].exec(); renderAll();
        }
      }
    ]
  }
};
