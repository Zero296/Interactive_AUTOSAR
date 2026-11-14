// ==================== PART 4B: 14 SCENARIOS (S1..S14) & 42 WHAT-IF EXPERIMENTS ====================

const SCENARIOS = [
  {
    id: "S1",
    title: "S1 · Init Stack (Port -> Adc/Pwm/Icu -> IoHwAb)",
    summary: "Trình tự khởi tạo bắt buộc trong EcuM_StartupTwo / BswM: phải cấp xung Port & Init MCAL (Port, Adc, Pwm, Icu) trước khi gọi IoHwAb_Init(&IoHwAb_Config).",
    setup: () => {
      createInitialSimState();
      simState.cfg.IoHwAbInitialized = false;
      simState.initPhase = "UNINIT";
      simState.mcalInitMask = { PORT: false, ADC: false, PWM: false, ICU: false };
      simState.adcPinMv = 2500;
      simState.swcTargetDutyPct = 50;
      recomputeIoHwAbEngine({ stepFilter: false });
      simState.activeModules = ["MOD_BSWM_ECUM", "MOD_DET"];
      simState.activeArrows = [];
      simState.lastCStatement = "// ECU Startup: IoHwAb == UNINIT (Bit7 INIT = 0)\n// Bất kỳ lệnh SWC lúc này bị từ chối!";
    },
    steps: [
      {
        title: "Bước 1: Port_Init(&Port_Config) cấu hình chân & Pull-Up",
        desc: "EcuM khởi tạo MCAL Port Driver đầu tiên để định hướng chân IN/OUT, chọn AltFunc ADC/PWM/ICU và bật điện trở PORT_PIN_IN_PULL_UP.",
        apply: () => {
          simState.mcalInitMask.PORT = true;
          simState.initPhase = "MCAL_READY";
          logApiTrace("INIT", "EcuM", "Port_Init", "Configured AltFunc & Pull-Up");
          simState.activeModules = ["MOD_BSWM_ECUM", "MOD_PORT_DIO"];
          simState.activeArrows = [];
          simState.lastCStatement = "Port_Init(&Port_Config); // PD0=ADC, PD1=DIO_PU, PC4=PWM, PA2=ICU";
        }
      },
      {
        title: "Bước 2: Adc_Init, Pwm_Init, Icu_Init sẵn sàng ngoại vi",
        desc: "Các driver MCAL ngoại vi được nạp clock Timer/SAR-ADC và kích hoạt Shadow Register (PwmDutycycleUpdatedEndperiod = TRUE).",
        apply: () => {
          simState.mcalInitMask = { PORT: true, ADC: true, PWM: true, ICU: true };
          simState.initPhase = "MCAL_READY";
          logApiTrace("INIT", "EcuM", "Adc/Pwm/Icu_Init", "Peripheral Clocks & Triggers Ready");
          simState.activeModules = ["MOD_BSWM_ECUM", "MOD_ADC", "MOD_PWM", "MOD_ICU"];
          simState.activeArrows = [];
          simState.lastCStatement = "Adc_Init(&Adc_Cfg);\nPwm_Init(&Pwm_Cfg);  // 2000Hz, IDLE_LOW\nIcu_Init(&Icu_Cfg);  // 1MHz Rising Edge";
        }
      },
      {
        title: "Bước 3: Sai thứ tự! Gọi IoHwAb trước khi Init -> DET 0x01",
        desc: "Nếu SWC gọi IoHwAb_ThrottleAct_SetDuty() khi Bit7 IOHWAB_INIT == 0, IoHwAb khóa PWM về IDLE và báo DET Module 254, Error 0x01.",
        apply: () => {
          simState.cfg.IoHwAbInitialized = false;
          simState.initPhase = "UNINIT";
          recomputeIoHwAbEngine({ stepFilter: false });
          logDetError("0x10", "IOHWAB_E_UNINIT", "Gọi Actuator API trước IoHwAb_Init");
          simState.activeModules = ["MOD_SWC_SA", "MOD_RTE", "MOD_IOHWAB", "MOD_DET"];
          simState.activeArrows = ["arr_sa_rte", "arr_rte_iohwab", "arr_iohwab_det"];
          simState.lastCStatement = "ret = IoHwAb_ThrottleAct_SetDuty(50.0f, FWD); // E_NOT_OK!\nDet_ReportError(254, 0, 0x10, IOHWAB_E_UNINIT);";
        }
      },
      {
        title: "Bước 4: IoHwAb_Init(&IoHwAb_Config) thành công (RegA=0xFB)",
        desc: "EcuM/BswM gọi IoHwAb_Init(), mở cổng RTE Client-Server và bắt đầu chu kỳ IoHwAb_MainFunction(5ms). Thanh A Bit7 = 1 (0xFB).",
        apply: () => {
          simState.cfg.IoHwAbInitialized = true;
          simState.initPhase = "RUNNING";
          simState.clockMs += 5;
          recomputeIoHwAbEngine({ stepFilter: true });
          logApiTrace("INIT", "BswM", "IoHwAb_Init", "Module State -> RUNNING (Bit7 INIT=1)");
          simState.activeModules = ["MOD_BSWM_ECUM", "MOD_IOHWAB", "MOD_RTE"];
          simState.activeArrows = ["arr_ecum_iohwab", "arr_iohwab_rte"];
          simState.lastCStatement = "IoHwAb_Init(&IoHwAb_Config); // RegA = 0xFB (INIT=1, GOOD=1)\n// RTE Servable, 5ms MainFunction started";
        }
      }
    ],
    whatIfs: [
      {
        id: "S1_W1", label: "Bỏ tích Init -> Thử gọi API", desc: "Tắt IoHwAbInitialized và xem Actuator bị khóa 0x0000 + DET 0x01",
        run: () => {
          simState.cfg.IoHwAbInitialized = false;
          simState.initPhase = "UNINIT";
          logDetError("0x10", "IOHWAB_E_UNINIT", "What-If Uninit Lockout");
          recomputeIoHwAbEngine({ stepFilter: false });
        }
      },
      {
        id: "S1_W2", label: "Chạy IoHwAb_GetVersionInfo", desc: "Bật IoHwAbVersionInfoApi để truy vấn Vendor/ModID 254",
        run: () => {
          simState.cfg.IoHwAbVersionInfoApi = true;
          simState.cfg.IoHwAbInitialized = true;
          simState.initPhase = "RUNNING";
          logApiTrace("API", "BswM", "IoHwAb_GetVersionInfo", "ModuleID=254, SW=22.11.0");
          simState.lastCStatement = "IoHwAb_GetVersionInfo(&ver); // moduleID=254, sw_major=22";
          recomputeIoHwAbEngine({ stepFilter: false });
        }
      },
      {
        id: "S1_W3", label: "Tắt DevErrorDetect (Prod)", desc: "Thử tắt kiểm tra DET giống bản Production Release",
        run: () => {
          simState.cfg.IoHwAbDevErrorDetect = false;
          logApiTrace("CFG", "ECUC", "DevErrorDetect", "FALSE (Production CPU Save)");
          recomputeIoHwAbEngine({ stepFilter: false });
        }
      }
    ]
  },

  {
    id: "S2",
    title: "S2 · DIO Active-Low Polarity & 15ms Mechanical Debounce",
    summary: "Chuyển đổi mức phần cứng Active-Low (0V khi nhấn công tắc phanh) thành logic TRUE cho SWC và triệt tiêu nhiễu dội tiếp điểm cơ khí trong 15ms (3 ticks × 5ms).",
    setup: () => {
      createInitialSimState();
      simState.selectedChannel = "CH1_DIO_BrakeSw";
      simState.cfg.IoHwAbDioActivePolarity = "ACTIVE_LOW";
      simState.cfg.IoHwAbDioDebounceEnable = true;
      simState.cfg.IoHwAbDioDebounceTimeMs = 15;
      simState.dioPinLevel = "STD_HIGH";
      simState.dioLogicalState = false;
      recomputeIoHwAbEngine({ stepFilter: false });
      simState.activeModules = ["MOD_PORT_DIO", "MOD_IOHWAB"];
      simState.activeArrows = ["arr_dio_iohwab"];
      simState.lastCStatement = "// Nhả phanh: Pull-Up kéo chân PD1 = STD_HIGH -> Logical FALSE";
    },
    steps: [
      {
        title: "Bước 1: Nhấn phanh -> Dio_ReadChannel() xuống STD_LOW (Tick 1 = 5ms)",
        desc: "Chân vi điều khiển kéo xuống GND (STD_LOW). Cực tính thô = Active, nhưng bộ lọc Debounce 15ms mới đếm 5ms -> Bit3 DBNC = 0 (đang quá độ), SWC vẫn thấy FALSE.",
        apply: () => {
          simState.dioPinLevel = "STD_LOW";
          simState.dioDebounceElapsedMs = 0;
          stepClockTick({ silent: true }); // +5ms -> 5/15
          logApiTrace("DIO", "IoHwAb", "Dio_ReadChannel", "STD_LOW (Tick 5/15ms - Debouncing)");
          simState.activeModules = ["MOD_PORT_DIO", "MOD_IOHWAB"];
          simState.activeArrows = ["arr_dio_iohwab"];
          simState.lastCStatement = "lvl = Dio_ReadChannel(CH_BRAKE_SW); // STD_LOW\n// Debounce 5ms < 15ms: SWC output stays FALSE (Transient Guard)";
        }
      },
      {
        title: "Bước 2: Tiếp tục giữ STD_LOW ở Tick 2 (10ms) - Chưa xác nhận",
        desc: "Nếu đây chỉ là gai nhiễu 10ms rồi nhả ra, bộ đếm sẽ reset. Hiện tại 10ms < 15ms nên SWC vẫn giữ trạng thái ổn định cũ.",
        apply: () => {
          stepClockTick({ silent: true }); // +5ms -> 10/15
          logApiTrace("DIO", "IoHwAb", "IoHwAb_MainFunction", "STD_LOW stable 10/15ms");
          simState.activeModules = ["MOD_PORT_DIO", "MOD_IOHWAB"];
          simState.activeArrows = ["arr_dio_iohwab"];
          simState.lastCStatement = "// Tick +5ms -> Debounce = 10ms / 15ms (DIO_DEBOUNCE=0)";
        }
      },
      {
        title: "Bước 3: Đủ 15ms (Tick 3) -> Đảo cực tính thành Logical TRUE gửi SWC",
        desc: "Đạt ngưỡng IoHwAbDioDebounceTimeMs=15ms. Bit3 DBNC = 1, IoHwAb đảo Active-Low thành TRUE và trả về qua Rte_Call_RpIoHwAb_BrakeSw_GetState().",
        apply: () => {
          stepClockTick({ silent: true }); // +5ms -> 15/15
          logApiTrace("RTE", "IoHwAb", "SWC_App", "BrakePressed = TRUE (Active-Low Inverted + Debounced)");
          simState.activeModules = ["MOD_PORT_DIO", "MOD_IOHWAB", "MOD_RTE", "MOD_SWC_SA", "MOD_SWC_APP"];
          simState.activeArrows = ["arr_dio_iohwab", "arr_iohwab_rte", "arr_rte_sa", "arr_sa_app"];
          simState.lastCStatement = "IoHwAb_BrakeSw_GetState(&IsPressed, &Qual);\n// Pin=STD_LOW (Active-Low) -> IsPressed = TRUE, DIO_DEBOUNCE = 1";
        }
      }
    ],
    whatIfs: [
      {
        id: "S2_W1", label: "Đổi sang Active-High", desc: "Thử cấu hình ACTIVE_HIGH trong khi chân đang ở STD_LOW -> Logic thành FALSE",
        run: () => {
          simState.cfg.IoHwAbDioActivePolarity = "ACTIVE_HIGH";
          simState.dioPinLevel = "STD_LOW";
          simState.dioDebounceElapsedMs = 15;
          simState.dioLogicalState = false;
          recomputeIoHwAbEngine({ stepFilter: false });
        }
      },
      {
        id: "S2_W2", label: "Tắt Debounce Filter", desc: "Tắt IoHwAbDioDebounceEnable để phản ứng tức thời 0ms theo chân DIO",
        run: () => {
          simState.cfg.IoHwAbDioDebounceEnable = false;
          simState.dioPinLevel = "STD_LOW";
          recomputeIoHwAbEngine({ stepFilter: false });
        }
      },
      {
        id: "S2_W3", label: "Tăng Debounce 25ms", desc: "Thử công tắc cơ khí cũ nảy mạnh cần lọc 25ms (5 ticks)",
        run: () => {
          simState.cfg.IoHwAbDioDebounceTimeMs = 25;
          simState.dioPinLevel = simState.dioPinLevel === "STD_LOW" ? "STD_HIGH" : "STD_LOW";
          simState.dioDebounceElapsedMs = 0;
          recomputeIoHwAbEngine({ stepFilter: false });
        }
      }
    ]
  },

  {
    id: "S3",
    title: "S3 · DIO Output Write & Readback Hardware Stuck-at Check",
    summary: "Kỹ thuật kiểm tra toàn vẹn phần cứng ASIL: sau khi Dio_WriteChannel(RELAY, STD_HIGH), IoHwAb gọi ngay Dio_ReadChannel() để phát hiện lỗi kẹt dây xuống Mass (Stuck-at-LOW).",
    setup: () => {
      createInitialSimState();
      simState.selectedChannel = "CH1_DIO_BrakeSw";
      simState.cfg.IoHwAbDioOutputReadbackVerify = true;
      simState.dioRelayExpected = "STD_LOW";
      simState.dioRelayReadback = "STD_LOW";
      recomputeIoHwAbEngine({ stepFilter: false });
      simState.activeModules = ["MOD_SWC_APP", "MOD_IOHWAB", "MOD_PORT_DIO"];
      simState.activeArrows = ["arr_iohwab_dio"];
      simState.lastCStatement = "// Main Relay OFF (STD_LOW), Readback = STD_LOW (Khớp)";
    },
    steps: [
      {
        title: "Bước 1: SWC yêu cầu đóng Relay chính (Dio_WriteChannel STD_HIGH)",
        desc: "SWC gửi lệnh bật rơ-le cấp nguồn. Khi mạch bình thường, chân trả về Readback STD_HIGH khớp lệnh.",
        apply: () => {
          simState.dioRelayExpected = "STD_HIGH";
          simState.dioRelayReadback = "STD_HIGH";
          recomputeIoHwAbEngine({ stepFilter: false });
          logApiTrace("DIO", "IoHwAb", "Dio_WriteChannel", "CH_MAIN_RELAY = STD_HIGH (Readback OK)");
          simState.activeModules = ["MOD_SWC_SA", "MOD_RTE", "MOD_IOHWAB", "MOD_PORT_DIO"];
          simState.activeArrows = ["arr_sa_rte", "arr_rte_iohwab", "arr_iohwab_dio", "arr_dio_iohwab"];
          simState.lastCStatement = "Dio_WriteChannel(DIO_CH_RELAY, STD_HIGH);\nactual = Dio_ReadChannel(DIO_CH_RELAY); // STD_HIGH == Expected (OK)";
        }
      },
      {
        title: "Bước 2: Sự cố kẹt Mass! Chân bị ép STD_LOW dù vừa ghi STD_HIGH",
        desc: "Dây nối cuộn dây Relay bị chạm vỏ xe (Stuck-at-LOW). Readback đọc về STD_LOW != STD_HIGH -> kích hoạt đếm lỗi DEM PREFAILED.",
        apply: () => {
          simState.dioRelayExpected = "STD_HIGH";
          simState.dioRelayReadback = "STD_LOW";
          simState.diagDebounceCount = 1;
          recomputeIoHwAbEngine({ stepFilter: false, preserveDebounce: true });
          logApiTrace("DIAG", "IoHwAb", "Dem_SetEventStatus", "READBACK_MISMATCH -> PREFAILED (1/3)");
          simState.activeModules = ["MOD_PORT_DIO", "MOD_IOHWAB", "MOD_DEM_FIM"];
          simState.activeArrows = ["arr_dio_iohwab", "arr_iohwab_dem"];
          simState.lastCStatement = "if (Dio_ReadChannel(DIO_CH_RELAY) != STD_HIGH)\n  Dem_SetEventStatus(DEM_EVENT_RELAY_STUCK, PREFAILED);";
        }
      },
      {
        title: "Bước 3: Xác nhận DEM FAILED & ngắt chuỗi an toàn",
        desc: "Sau 3 chu kỳ mismatch liên tiếp, DEM xác nhận FAILED (RegB Bit2=1), kích FiM Inhibit khóa chấp hành phụ thuộc.",
        apply: () => {
          simState.diagDebounceCount = 3;
          simState.fimPermission = false;
          recomputeIoHwAbEngine({ stepFilter: false, preserveDebounce: true });
          logApiTrace("SAFE", "FiM", "IoHwAb", "Relay Stuck Confirmed -> FiM Safe-State Idle");
          simState.activeModules = ["MOD_IOHWAB", "MOD_DEM_FIM", "MOD_PWM"];
          simState.activeArrows = ["arr_iohwab_dem", "arr_fim_iohwab", "arr_iohwab_pwm"];
          simState.lastCStatement = "Dem_SetEventStatus(DEM_EVENT_RELAY_STUCK, FAILED);\nFiM_GetFunctionPermission(FID_ACTUATOR); // FALSE -> Idle";
        }
      }
    ],
    whatIfs: [
      {
        id: "S3_W1", label: "Tắt Readback Check", desc: "Tắt IoHwAbDioOutputReadbackVerify để thấy lỗi kẹt phần cứng bị bỏ qua mù quáng",
        run: () => {
          simState.cfg.IoHwAbDioOutputReadbackVerify = false;
          simState.fimPermission = true;
          simState.diagDebounceCount = 0;
          recomputeIoHwAbEngine({ stepFilter: false });
        }
      },
      {
        id: "S3_W2", label: "Khắc phục dây chạm Mass", desc: "Trả Readback về STD_HIGH khớp lệnh và khôi phục FiM",
        run: () => {
          simState.dioRelayReadback = simState.dioRelayExpected;
          simState.fimPermission = true;
          simState.diagDebounceCount = 0;
          recomputeIoHwAbEngine({ stepFilter: false });
        }
      },
      {
        id: "S3_W3", label: "Bật PortPinDirectionChangeable", desc: "Thử cho phép đổi hướng chân động trong ECUC (khuyến nghị FALSE cho ASIL)",
        run: () => {
          simState.cfg.PortPinDirectionChangeable = true;
          logApiTrace("PORT", "IoHwAb", "Port_SetPinDirection", "Pin Direction Changed at Runtime");
          recomputeIoHwAbEngine({ stepFilter: false });
        }
      }
    ]
  },

  {
    id: "S4",
    title: "S4 · Luồng F9 End-to-End: ADC -> IoHwAb -> SWC -> PWM 0x4000",
    summary: "Luồng chuẩn AUTOSAR F9 (Sensor Acquisition & Actuator Control): đọc 2500mV (2048 Raw) từ cảm biến bàn đạp ga, IoHwAb chuẩn hóa thành 50.0% cho SWC_App và xuất xung Pwm_SetDutyCycle(0x4000).",
    setup: () => {
      createInitialSimState();
      simState.adcPinMv = 2500;
      simState.adcFilteredPct = 50.0;
      simState.swcTargetDutyPct = 50.0;
      recomputeIoHwAbEngine({ stepFilter: false });
      simState.activeModules = ["MOD_ADC", "MOD_IOHWAB"];
      simState.activeArrows = ["arr_adc_iohwab"];
      simState.lastCStatement = "// S4 Ready: Pedal Sensor = 2500mV (50.0%), V5V = 5000mV";
    },
    steps: [
      {
        title: "Bước 1: Adc_StartGroupConversion & Adc_ReadGroup -> Raw = 2048",
        desc: "IoHwAb kích hoạt nhóm chuyển đổi ADC và đọc thanh ghi 12-bit: 2500mV tương ứng 2048 counts (trong dải 0..4095).",
        apply: () => {
          simState.adcPinMv = 2500;
          simState.adcFilteredPct = 50.0;
          recomputeIoHwAbEngine({ stepFilter: false });
          logApiTrace("MCAL", "IoHwAb", "Adc_ReadGroup", "GRP_PEDAL Raw = 2048 / 4095 (2500 mV)");
          simState.activeModules = ["MOD_ADC", "MOD_IOHWAB"];
          simState.activeArrows = ["arr_iohwab_adc", "arr_adc_iohwab"];
          simState.lastCStatement = "Adc_StartGroupConversion(ADC_GRP_PEDAL);\nAdc_ReadGroup(ADC_GRP_PEDAL, &AdcRaw); // AdcRaw = 2048 (12-bit)";
        }
      },
      {
        title: "Bước 2: IoHwAb Scaling & Trả 50.0% GOOD lên SWC_SensorActuator qua RTE",
        desc: "IoHwAb áp dụng bù 5V (5000/5000) và tuyến tính (2500 * 0.025 - 12.5 = 50.0%), ẩn toàn bộ thanh ghi mV/Raw khỏi tầng Application.",
        apply: () => {
          logApiTrace("RTE", "SWC_SA", "Rte_Call_RpIoHwAb_Pedal_GetPhysVal", "PedalPct = 50.0%, Qual = GOOD");
          simState.activeModules = ["MOD_IOHWAB", "MOD_RTE", "MOD_SWC_SA", "MOD_SWC_APP"];
          simState.activeArrows = ["arr_iohwab_rte", "arr_rte_sa", "arr_sa_app"];
          simState.lastCStatement = "Rte_Call_RpIoHwAb_Pedal_GetPhysVal(&PedalPct, &Qual);\n// IoHwAb_PedalSensor_GetPhysVal() -> 50.0f %, QUAL_GOOD";
        }
      },
      {
        title: "Bước 3: SWC_App tính toán Target Throttle = 50.0% -> Gửi xuống IoHwAb",
        desc: "SWC_App hoàn toàn không biết chân PWM hay công thức 15-bit; chỉ gọi yêu cầu bướm ga mở 50.0% chiều FORWARD.",
        apply: () => {
          simState.swcTargetDutyPct = 50.0;
          recomputeIoHwAbEngine({ stepFilter: false });
          logApiTrace("RTE", "SWC_App", "IoHwAb_ThrottleAct_SetDuty", "Target = 50.0%, Dir = FORWARD");
          simState.activeModules = ["MOD_SWC_APP", "MOD_SWC_SA", "MOD_RTE", "MOD_IOHWAB"];
          simState.activeArrows = ["arr_app_sa", "arr_sa_rte", "arr_rte_iohwab"];
          simState.lastCStatement = "Rte_Call_RpIoHwAb_Throttle_SetDuty(50.0f, DIR_FORWARD);\n// SWC purely uses engineering unit (%)";
        }
      },
      {
        title: "Bước 4: IoHwAb quy đổi 15-bit -> Pwm_SetDutyCycle(CH, 0x4000) + Dio(DIR)",
        desc: "IoHwAb ghi chân chiều quay qua MCAL Dio, nhân 50.0% × 0x8000 = 0x4000 (16384) và xuất xuống MCAL Pwm Driver.",
        apply: () => {
          simState.selectedChannel = "CH2_PWM_Throttle";
          logApiTrace("MCAL", "IoHwAb", "Pwm_SetDutyCycle", "CH_THROTTLE Duty = 0x4000 (16384 / 32768 = 50.0%)");
          simState.activeModules = ["MOD_IOHWAB", "MOD_PORT_DIO", "MOD_PWM"];
          simState.activeArrows = ["arr_iohwab_dio", "arr_iohwab_pwm"];
          simState.lastCStatement = "Dio_WriteChannel(DIO_THROTTLE_DIR, STD_HIGH); // FWD\nPwm_SetDutyCycle(PWM_CH_THROTTLE, 0x4000); // 16384 = 50%";
        }
      }
    ],
    whatIfs: [
      {
        id: "S4_W1", label: "Đổi ADC sang 10-bit", desc: "Thử hạ AdcResolutionBits xuống 10-bit để thấy Raw đổi từ 2048 -> 512 nhưng % giữ nguyên",
        run: () => {
          simState.cfg.AdcResolutionBits = "10";
          recomputeIoHwAbEngine({ stepFilter: false });
        }
      },
      {
        id: "S4_W2", label: "Đạp ga lên 80% (3700mV)", desc: "Thử đẩy điện áp bàn đạp lên 3700mV (80%) và đặt Pwm Target 80% (0x6666)",
        run: () => {
          simState.adcPinMv = 3700;
          simState.adcFilteredPct = 80.0;
          simState.swcTargetDutyPct = 80.0;
          recomputeIoHwAbEngine({ stepFilter: false });
        }
      },
      {
        id: "S4_W3", label: "Chuyển AdcGroupTriggSrc = HW", desc: "Đổi sang Hardware Timer Trigger đồng bộ điểm giữa xung PWM",
        run: () => {
          simState.cfg.AdcGroupTriggSrc = "ADC_TRIGG_SRC_HW";
          logApiTrace("CFG", "Adc", "Adc_EnableHardwareTrigger", "HW Sync Trigger Enabled");
          recomputeIoHwAbEngine({ stepFilter: false });
        }
      }
    ]
  },

  {
    id: "S5",
    title: "S5 · Bù Ratiometric nguồn 5V & Bộ lọc IIR Low-Pass (EMA)",
    summary: "Chứng minh IoHwAb chống trôi số đo khi nguồn nuôi cảm biến sụt còn 4800mV và làm mượt xung bước đột ngột nhờ bộ lọc IIR EMA (α = 0.40).",
    setup: () => {
      createInitialSimState();
      simState.adcPinMv = 2400; // 50% of 4800mV!
      simState.cfg.IoHwAbSensorSupplyMeasuredMv = 4800;
      simState.cfg.IoHwAbEnableRatiometricCompensation = true;
      simState.adcFilteredPct = 50.0;
      recomputeIoHwAbEngine({ stepFilter: false });
      simState.activeModules = ["MOD_ADC", "MOD_IOHWAB"];
      simState.activeArrows = ["arr_adc_iohwab"];
      simState.lastCStatement = "// V5V sụt từ 5000 -> 4800mV: Chân pedal giữa đọc 2400mV.\n// Với Ratiometric ON: 2400 * (5000/4800) = 2500mV -> Đúng 50.0%!";
    },
    steps: [
      {
        title: "Bước 1: Nguồn 5V tụt còn 4800mV -> V_comp tự động giữ nguyên 50.0%",
        desc: "Cảm biến Hall chia áp theo nguồn 4.8V nên xuất 2400mV. IoHwAb nhân hệ số 5000/4800 = 1.0417 -> phục hồi chính xác 2500mV = 50.0%.",
        apply: () => {
          simState.cfg.IoHwAbEnableRatiometricCompensation = true;
          simState.cfg.IoHwAbSensorSupplyMeasuredMv = 4800;
          simState.adcPinMv = 2400;
          simState.adcFilteredPct = 50.0;
          recomputeIoHwAbEngine({ stepFilter: false });
          logApiTrace("SCALE", "IoHwAb", "Ratiometric", "2400mV * (5000/4800) = 2500mV -> 50.0%");
          simState.activeModules = ["MOD_ADC", "MOD_IOHWAB"];
          simState.activeArrows = ["arr_adc_iohwab"];
          simState.lastCStatement = "V_comp = 2400.0f * (5000.0f / 4800.0f); // = 2500.0 mV\nPedal_Inst = 2500 * 0.025 - 12.5; // = 50.0 % (Sai số 0%)";
        }
      },
      {
        title: "Bước 2: Nhảy bước (Step Jump) lên 80% + Lọc IIR EMA (Tick 1, α=0.40)",
        desc: "Cảm biến nhảy lên 3840mV (80%). Nhờ IIR y[n] = 0.4·80 + 0.6·50 = 62.0%, đầu ra tăng êm và Bit4 IIR_SETTLED chuyển 0.",
        apply: () => {
          simState.adcPinMv = 3840; // 80% at 4800mV
          stepClockTick({ silent: true });
          logApiTrace("DSP", "IoHwAb", "IIR_EMA", `y[1] = 0.4*80 + 0.6*50 = ${simState.adcFilteredPct.toFixed(1)}%`);
          simState.activeModules = ["MOD_ADC", "MOD_IOHWAB", "MOD_RTE"];
          simState.activeArrows = ["arr_adc_iohwab", "arr_iohwab_rte"];
          simState.lastCStatement = `y[1] = 0.4f * 80.0f + 0.6f * 50.0f; // = ${simState.adcFilteredPct.toFixed(1)}% (IIR_SETTLED=0)`;
        }
      },
      {
        title: "Bước 3: Các chu kỳ 5ms tiếp theo -> IIR hội tụ về 80.0%",
        desc: "Sau vài chu kỳ MainFunction (5ms), giá trị lọc tiệm cận 80.0% và Bit4 IIR_SETTLED tự động bật lại 1.",
        apply: () => {
          for (let i = 0; i < 8; i++) stepClockTick({ silent: true });
          logApiTrace("DSP", "IoHwAb", "IIR_EMA", `Converged -> ${simState.adcFilteredPct.toFixed(1)}% (IIR_SETTLED=1)`);
          simState.activeModules = ["MOD_ADC", "MOD_IOHWAB", "MOD_RTE", "MOD_SWC_SA"];
          simState.activeArrows = ["arr_adc_iohwab", "arr_iohwab_rte", "arr_rte_sa"];
          simState.lastCStatement = `// Sau 9 ticks: Filtered = ${simState.adcFilteredPct.toFixed(1)}% -> IIR_SETTLED = 1`;
        }
      }
    ],
    whatIfs: [
      {
        id: "S5_W1", label: "Tắt Bù Ratiometric", desc: "Xem sai số tụt xuống 47.5% thay vì 50.0% khi V5V=4800mV không có Ratiometric",
        run: () => {
          simState.cfg.IoHwAbEnableRatiometricCompensation = false;
          simState.cfg.IoHwAbSensorSupplyMeasuredMv = 4800;
          simState.adcPinMv = 2400;
          simState.adcFilteredPct = 47.5;
          recomputeIoHwAbEngine({ stepFilter: false });
        }
      },
      {
        id: "S5_W2", label: "Giảm α = 0.15 (Lọc nặng)", desc: "Thử bộ lọc chậm để triệt nhiễu tối đa trên đường gập ghềnh",
        run: () => {
          simState.cfg.IoHwAbAdcIirAlphaCoeff = 0.15;
          simState.adcFilteredPct = 50.0;
          simState.adcPinMv = 3840;
          stepClockTick({ silent: true });
        }
      },
      {
        id: "S5_W3", label: "Bypass IIR Filter", desc: "Tắt IoHwAbAdcIirFilterEnable để đọc phản hồi tức thời 0 trễ",
        run: () => {
          simState.cfg.IoHwAbAdcIirFilterEnable = false;
          recomputeIoHwAbEngine({ stepFilter: false });
        }
      }
    ]
  },

  {
    id: "S6",
    title: "S6 · PWM 0x8000 Normalization & Duty Clamp Safety (5%..95%)",
    summary: "Cách IoHwAb bảo vệ tụ nạp Bootstrap trên cầu H bằng kẹp Duty Cycle trong dải 5.0%..95.0%, đồng thời chuẩn hóa sang thang 15-bit AUTOSAR (0x0000..0x8000).",
    setup: () => {
      createInitialSimState();
      simState.selectedChannel = "CH2_PWM_Throttle";
      simState.cfg.IoHwAbPwmDutyClampEnable = true;
      simState.cfg.IoHwAbPwmDutyClampRangePct = "5.0 .. 95.0";
      simState.swcTargetDutyPct = 50.0;
      recomputeIoHwAbEngine({ stepFilter: false });
      simState.activeModules = ["MOD_SWC_APP", "MOD_IOHWAB", "MOD_PWM"];
      simState.activeArrows = ["arr_sa_rte", "arr_rte_iohwab", "arr_iohwab_pwm"];
      simState.lastCStatement = "// Normal 50.0% -> 0x4000 (Không bị kẹp Clamp)";
    },
    steps: [
      {
        title: "Bước 1: SWC yêu cầu 99.0% -> IoHwAb Clamp xuống 95.0% (0x799A)",
        desc: "Để tránh tụ Bootstrap cầu H hết điện khi đóng MOSFET 100%, IoHwAb cắt xuống ngưỡng trên 95.0% và bật Thanh A Bit2 PWM_CLAMPED = 1.",
        apply: () => {
          simState.swcTargetDutyPct = 99.0;
          recomputeIoHwAbEngine({ stepFilter: false });
          logApiTrace("PWM", "IoHwAb", "Pwm_SetDutyCycle", `Req 99% Clamped -> 95.0% (${toHex15(simState.pwmDutyHex)})`);
          simState.activeModules = ["MOD_SWC_SA", "MOD_RTE", "MOD_IOHWAB", "MOD_PWM"];
          simState.activeArrows = ["arr_sa_rte", "arr_rte_iohwab", "arr_iohwab_pwm"];
          simState.lastCStatement = `// Target = 99.0% > Max(95.0%) -> PWM_CLAMPED = 1\nPwm_SetDutyCycle(CH_THROTTLE, ${toHex15(simState.pwmDutyHex)}); // 95.0%`;
        }
      },
      {
        title: "Bước 2: SWC yêu cầu 2.0% -> Nâng biên tối thiểu 5.0% (0x0666)",
        desc: "Tương tự biên dưới 5.0% đảm bảo thời gian tối thiểu kích mở ổn định driver MOSFET. Bit2 PWM_CLAMPED = 1.",
        apply: () => {
          simState.swcTargetDutyPct = 2.0;
          recomputeIoHwAbEngine({ stepFilter: false });
          logApiTrace("PWM", "IoHwAb", "Pwm_SetDutyCycle", `Req 2% Clamped -> 5.0% (${toHex15(simState.pwmDutyHex)})`);
          simState.activeModules = ["MOD_IOHWAB", "MOD_PWM"];
          simState.activeArrows = ["arr_iohwab_pwm"];
          simState.lastCStatement = `// Target = 2.0% < Min(5.0%) -> Clamped up to 5.0%\nPwm_SetDutyCycle(CH_THROTTLE, ${toHex15(simState.pwmDutyHex)});`;
        }
      },
      {
        title: "Bước 3: Đảo chiều REVERSE (-65%) -> Dio(DIR=LOW) + Pwm(0x5333)",
        desc: "IoHwAb tách lệnh chiều âm thành ghi chân hướng cầu H Dio_WriteChannel(DIR, STD_LOW) trước khi cập nhật PWM 65% đồng bộ cuối chu kỳ.",
        apply: () => {
          simState.swcTargetDir = "REVERSE";
          simState.swcTargetDutyPct = 65.0;
          recomputeIoHwAbEngine({ stepFilter: false });
          logApiTrace("ACT", "IoHwAb", "H-Bridge", `DIR=REVERSE (STD_LOW), Duty=65% (${toHex15(simState.pwmDutyHex)})`);
          simState.activeModules = ["MOD_IOHWAB", "MOD_PORT_DIO", "MOD_PWM"];
          simState.activeArrows = ["arr_iohwab_dio", "arr_iohwab_pwm"];
          simState.lastCStatement = `Dio_WriteChannel(DIO_THROTTLE_DIR, STD_LOW); // REVERSE\nPwm_SetDutyCycle(CH_THROTTLE, ${toHex15(simState.pwmDutyHex)}); // 65%`;
        }
      }
    ],
    whatIfs: [
      {
        id: "S6_W1", label: "Tắt Duty Clamp (Cho phép 100%)", desc: "Tắt IoHwAbPwmDutyClampEnable khi dùng 99% để thấy Duty lên thẳng 0x7EB8/0x8000",
        run: () => {
          simState.cfg.IoHwAbPwmDutyClampEnable = false;
          simState.swcTargetDutyPct = 100.0;
          recomputeIoHwAbEngine({ stepFilter: false });
        }
      },
      {
        id: "S6_W2", label: "Thử Dual-PWM Half-Bridge", desc: "Đổi cấu hình sang DUAL_PWM_HALF_BRIDGE không dùng chân DIO DIR",
        run: () => {
          simState.cfg.IoHwAbHBridgeDriveMode = "DUAL_PWM_HALF_BRIDGE";
          logApiTrace("CFG", "IoHwAb", "HBridgeMode", "DUAL_PWM_HALF_BRIDGE");
          recomputeIoHwAbEngine({ stepFilter: false });
        }
      },
      {
        id: "S6_W3", label: "Đổi tần số PWM 10kHz", desc: "Tăng IoHwAbPwmDefaultPeriodHz lên 10000Hz (chu kỳ 100µs)",
        run: () => {
          simState.cfg.IoHwAbPwmDefaultPeriodHz = 10000;
          recomputeIoHwAbEngine({ stepFilter: false });
        }
      }
    ]
  },

  {
    id: "S7",
    title: "S7 · ICU Signal Measurement -> Wheel RPM & Stall Timeout",
    summary: "Chuyển đổi xung phần cứng Timer 1 MHz (Icu_GetDutyCycleValues) từ đĩa răng cảm biến (20 răng) sang tốc độ bánh xe RPM và xử lý mất xung khi xe dừng.",
    setup: () => {
      createInitialSimState();
      simState.selectedChannel = "CH3_ICU_WheelSpeed";
      simState.icuFreqHz = 500;
      simState.icuDutyPct = 40;
      simState.icuSilentMs = 0;
      recomputeIoHwAbEngine({ stepFilter: false });
      simState.activeModules = ["MOD_ICU", "MOD_IOHWAB"];
      simState.activeArrows = ["arr_icu_iohwab"];
      simState.lastCStatement = "// Tone Wheel 20 teeth @ 500 Hz -> 2000 us period -> 1500 RPM";
    },
    steps: [
      {
        title: "Bước 1: Icu_GetDutyCycleValues -> Period=2000µs (500Hz) -> 1500 RPM",
        desc: "Timer phần cứng bắt cạnh lên đo PeriodTime = 2000 ticks (1MHz) & ActiveTime = 800 ticks (40% duty). IoHwAb tính RPM = (500 × 60)/20 = 1500 RPM.",
        apply: () => {
          simState.icuFreqHz = 500;
          simState.icuSilentMs = 0;
          recomputeIoHwAbEngine({ stepFilter: false });
          logApiTrace("ICU", "IoHwAb", "Icu_GetDutyCycleValues", "Period=2000us Active=800us -> 1500 RPM");
          simState.activeModules = ["MOD_ICU", "MOD_IOHWAB", "MOD_RTE", "MOD_SWC_SA", "MOD_SWC_APP"];
          simState.activeArrows = ["arr_icu_iohwab", "arr_iohwab_rte", "arr_rte_sa", "arr_sa_app"];
          simState.lastCStatement = "Icu_GetDutyCycleValues(ICU_CH_WHEEL, &Duty);\n// Period=2000us (500Hz), Teeth=20 -> WheelRpm = 1500 RPM";
        }
      },
      {
        title: "Bước 2: Tăng tốc lên 1200 Hz -> 3600 RPM",
        desc: "Khi xe tăng tốc, chu kỳ xung thu hẹp còn 833 µs (1200 Hz) -> SWC nhận tức thời 3600 RPM qua RTE.",
        apply: () => {
          simState.icuFreqHz = 1200;
          simState.icuSilentMs = 0;
          recomputeIoHwAbEngine({ stepFilter: false });
          logApiTrace("ICU", "IoHwAb", "IoHwAb_WheelSpeed_GetRpm", `Freq=1200Hz -> ${simState.icuRpm} RPM`);
          simState.activeModules = ["MOD_ICU", "MOD_IOHWAB", "MOD_RTE"];
          simState.activeArrows = ["arr_icu_iohwab", "arr_iohwab_rte"];
          simState.lastCStatement = `// Freq = 1200Hz (833 us) -> Rpm = (1200 * 60) / ${simState.cfg.IoHwAbSpeedSensorTeethCount} = ${simState.icuRpm} RPM`;
        }
      },
      {
        title: "Bước 3: Mất xung / Xe dừng -> Quá Timeout 50ms ép RPM = 0 (ICU_CAP=0)",
        desc: "Nếu bánh xe đứng yên không có cạnh xung vượt quá IoHwAbIcuTimeoutMs (50ms), IoHwAb hạ Bit1 ICU_CAP = 0 và đặt tốc độ về 0 RPM an toàn.",
        apply: () => {
          simState.icuFreqHz = 0;
          simState.icuSilentMs = 55;
          recomputeIoHwAbEngine({ stepFilter: false });
          logApiTrace("ICU", "IoHwAb", "ZeroSpeedTimeout", "No Edge > 50ms -> WheelRpm = 0, ICU_CAP = 0");
          simState.activeModules = ["MOD_ICU", "MOD_IOHWAB", "MOD_RTE"];
          simState.activeArrows = ["arr_icu_iohwab", "arr_iohwab_rte"];
          simState.lastCStatement = "if (SilentMs >= IoHwAbIcuTimeoutMs) { WheelRpm = 0; ICU_CAP = 0; }";
        }
      }
    ],
    whatIfs: [
      {
        id: "S7_W1", label: "Đĩa 48 răng (ABS)", desc: "Đổi IoHwAbSpeedSensorTeethCount = 48 ở 500 Hz -> 625 RPM",
        run: () => {
          simState.cfg.IoHwAbSpeedSensorTeethCount = 48;
          simState.icuFreqHz = 500;
          simState.icuSilentMs = 0;
          recomputeIoHwAbEngine({ stepFilter: false });
        }
      },
      {
        id: "S7_W2", label: "Đổi Edge Counter Mode", desc: "Chuyển IcuMeasurementMode sang ICU_MODE_EDGE_COUNTER",
        run: () => {
          simState.cfg.IcuMeasurementMode = "ICU_MODE_EDGE_COUNTER";
          logApiTrace("ICU", "IoHwAb", "Icu_EnableEdgeCount", "Switched to Edge Counter");
          recomputeIoHwAbEngine({ stepFilter: false });
        }
      },
      {
        id: "S7_W3", label: "Đổi Start Edge = BOTH", desc: "Bắt cả cạnh lên & cạnh xuống gấp đôi độ phân giải cạnh",
        run: () => {
          simState.cfg.IcuDefaultStartEdge = "ICU_BOTH_EDGES";
          recomputeIoHwAbEngine({ stepFilter: false });
        }
      }
    ]
  },

  {
    id: "S8",
    title: "S8 · Ngắn mạch Mass (Short-to-GND <250mV) & Giá trị thay thế",
    summary: "Phát hiện chập dây cảm biến xuống mass (<250mV), debounce lỗi DEM trong 3 chu kỳ (15ms) và tự động thay thế giá trị an toàn 10% (Limp-Home) lên SWC.",
    setup: () => {
      createInitialSimState();
      simState.selectedChannel = "CH0_ADC_PedalPos";
      simState.adcPinMv = 2500;
      simState.diagDebounceCount = 0;
      recomputeIoHwAbEngine({ stepFilter: false });
      simState.activeModules = ["MOD_ADC", "MOD_IOHWAB"];
      simState.activeArrows = ["arr_adc_iohwab"];
      simState.lastCStatement = "// Cảm biến đang bình thường ở 2500mV (50.0%)";
    },
    steps: [
      {
        title: "Bước 1: Đứt dây/chạm Mass -> Pin = 120mV (<250mV) [DEM PREFAILED 1/3]",
        desc: "Bit7 SHORT_GND bật. IoHwAb gửi PREFAILED cho DEM nhưng chưa thay thế ngay vì cần xác nhận 3 ticks để chống nhiễu tức thời.",
        apply: () => {
          simState.adcPinMv = 120;
          simState.diagDebounceCount = 1;
          recomputeIoHwAbEngine({ stepFilter: false, preserveDebounce: true });
          logApiTrace("DIAG", "IoHwAb", "Dem_SetEventStatus", "SHORT_TO_GND (120mV < 250mV) -> PREFAILED 1/3");
          simState.activeModules = ["MOD_ADC", "MOD_IOHWAB", "MOD_DEM_FIM"];
          simState.activeArrows = ["arr_adc_iohwab", "arr_iohwab_dem"];
          simState.lastCStatement = "if (PinMv < 250) { SHORT_GND=1; Dem_SetEventStatus(EVT_PEDAL_SCG, PREFAILED); }";
        }
      },
      {
        title: "Bước 2: Đủ 3 Ticks -> DEM FAILED (RegB Bit2=1) & Thay thế 10.0%",
        desc: "Lỗi xác nhận! IoHwAb chuyển chiến lược USE_REPLACEMENT_VALUE -> xuất 10.0% an toàn với cờ Qual = FAULT lên SWC.",
        apply: () => {
          simState.diagDebounceCount = 3;
          recomputeIoHwAbEngine({ stepFilter: false, preserveDebounce: true });
          logApiTrace("SAFE", "IoHwAb", "SWC_SA", `Confirmed FAILED -> Substituted Value = ${simState.adcOutPct.toFixed(1)}% (Qual=FAULT)`);
          simState.activeModules = ["MOD_IOHWAB", "MOD_DEM_FIM", "MOD_RTE", "MOD_SWC_SA"];
          simState.activeArrows = ["arr_iohwab_dem", "arr_iohwab_rte", "arr_rte_sa"];
          simState.lastCStatement = `Dem_SetEventStatus(EVT_PEDAL_SCG, FAILED);\n*PedalPct = ${simState.adcOutPct.toFixed(1)}f; // Safe Replacement Value`;
        }
      }
    ],
    whatIfs: [
      {
        id: "S8_W1", label: "Thử Hold Last Valid", desc: "Đổi chiến lược sang HOLD_LAST_VALID_VALUE (giữ 50.0% trước khi hỏng)",
        run: () => {
          simState.cfg.IoHwAbFaultSubstStrategy = "HOLD_LAST_VALID_VALUE";
          recomputeIoHwAbEngine({ stepFilter: false, preserveDebounce: true });
        }
      },
      {
        id: "S8_W2", label: "Tăng Replacement = 20%", desc: "Đổi mức thay thế Limp-Home lên 20.0%",
        run: () => {
          simState.cfg.IoHwAbFaultSubstStrategy = "USE_REPLACEMENT_VALUE";
          simState.cfg.IoHwAbSensorReplacementValuePct = 20;
          recomputeIoHwAbEngine({ stepFilter: false, preserveDebounce: true });
        }
      },
      {
        id: "S8_W3", label: "Sửa dây về 2500mV", desc: "Phục hồi áp 2500mV và chạy ticks để Heal lỗi DEM",
        run: () => {
          simState.adcPinMv = 2500;
          simState.diagDebounceCount = 0;
          recomputeIoHwAbEngine({ stepFilter: false, preserveDebounce: true });
        }
      }
    ]
  },

  {
    id: "S9",
    title: "S9 · Short-to-Battery (>4750mV) & Sụt nguồn 5V Sensor (<4750mV)",
    summary: "Phát hiện chạm dương Short-to-Bat (>4750mV) để chặn xe hiểu nhầm đạp ga 100%, và phản ứng khi nguồn nuôi V5V rơi ra ngoài cửa sổ 4750..5250mV.",
    setup: () => {
      createInitialSimState();
      simState.adcPinMv = 2500;
      simState.cfg.IoHwAbSensorSupplyMeasuredMv = 5000;
      recomputeIoHwAbEngine({ stepFilter: false });
      simState.activeModules = ["MOD_ADC", "MOD_IOHWAB"];
      simState.activeArrows = ["arr_adc_iohwab"];
      simState.lastCStatement = "// Kiểm tra ngưỡng Short-to-Bat (>4750mV) & V5V Window (4750..5250mV)";
    },
    steps: [
      {
        title: "Bước 1: Chạm dây nguồn -> ADC đọc 4880mV (>4750mV) [SHORT_BAT]",
        desc: "Bật cờ SHORT_BAT (0x40). Nếu không chẩn đoán ngưỡng trên, công thức tuyến tính sẽ báo sai là 100% ga! IoHwAb đếm lỗi và khóa về giá trị thay thế 10%.",
        apply: () => {
          simState.adcPinMv = 4880;
          simState.diagDebounceCount = 3;
          recomputeIoHwAbEngine({ stepFilter: false, preserveDebounce: true });
          logApiTrace("DIAG", "IoHwAb", "Dem_SetEventStatus", "SHORT_TO_BAT (4880mV > 4750mV) -> FAILED, Out=10%");
          simState.activeModules = ["MOD_ADC", "MOD_IOHWAB", "MOD_DEM_FIM", "MOD_RTE"];
          simState.activeArrows = ["arr_adc_iohwab", "arr_iohwab_dem", "arr_iohwab_rte"];
          simState.lastCStatement = "if (PinMv > 4750) { SHORT_BAT=1; Dem_SetEventStatus(EVT_SCB, FAILED); }\n// SWC gets 10.0% SAFE instead of dangerous 100% throttle!";
        }
      },
      {
        title: "Bước 2: Sự cố PMIC! Nguồn cảm biến V5V tụt còn 4400mV (<4750mV)",
        desc: "Khôi phục chân pedal 2200mV, nhưng nguồn V5V sụt xuống 4400mV (ngoài cửa sổ). IoHwAb bật bit SUP_5V_FLT (0x08), dừng bù tỷ lệ và gắn Qual=DEGRADED.",
        apply: () => {
          simState.adcPinMv = 2200;
          simState.diagDebounceCount = 0;
          simState.cfg.IoHwAbSensorSupplyMeasuredMv = 4400;
          recomputeIoHwAbEngine({ stepFilter: false, preserveDebounce: true });
          logApiTrace("DIAG", "IoHwAb", "SupplyMonitor", "V5V=4400mV Out of [4750..5250] -> SUP_5V_FLT=1, Ratiometric OFF");
          simState.activeModules = ["MOD_ADC", "MOD_IOHWAB", "MOD_DEM_FIM"];
          simState.activeArrows = ["arr_adc_iohwab", "arr_iohwab_dem"];
          simState.lastCStatement = "// V5V = 4400mV < 4750mV -> SUP_5V_FLT = 1, RATIO_COMP = 0\n// Qual = DEGRADED";
        }
      }
    ],
    whatIfs: [
      {
        id: "S9_W1", label: "Nới cửa sổ V5V (4300..5500)", desc: "Thay đổi IoHwAbSupplyValidWindowMv để 4400mV lại được chấp nhận và bù",
        run: () => {
          simState.cfg.IoHwAbSupplyValidWindowMv = "4300 .. 5500";
          recomputeIoHwAbEngine({ stepFilter: false });
        }
      },
      {
        id: "S9_W2", label: "Chạm quá áp 4990mV", desc: "Kiểm tra sát ngưỡng trên với strategy PASS_RAW_WITH_FAULT_FLAG",
        run: () => {
          simState.cfg.IoHwAbFaultSubstStrategy = "PASS_RAW_WITH_FAULT_FLAG";
          simState.adcPinMv = 4990;
          simState.diagDebounceCount = 3;
          recomputeIoHwAbEngine({ stepFilter: false, preserveDebounce: true });
        }
      },
      {
        id: "S9_W3", label: "Phục hồi V5V = 5000mV", desc: "Đưa nguồn nuôi cảm biến về chuẩn 5000mV",
        run: () => {
          simState.cfg.IoHwAbSensorSupplyMeasuredMv = 5000;
          simState.adcPinMv = 2500;
          simState.diagDebounceCount = 0;
          recomputeIoHwAbEngine({ stepFilter: false, preserveDebounce: true });
        }
      }
    ]
  },

  {
    id: "S10",
    title: "S10 · Actuator Open-Load (0mA) & Over-Current (>8A) SmartFET Trip",
    summary: "Giám sát dòng điện tải qua SmartFET/H-Bridge: phát hiện đứt dây cuộn motor (Open-Load 0mA) và ngắt khẩn cấp PWM về 0x0000 khi quá dòng (>8000mA).",
    setup: () => {
      createInitialSimState();
      simState.selectedChannel = "CH2_PWM_Throttle";
      simState.swcTargetDutyPct = 60.0;
      simState.actuatorCurrentMa = 2600;
      recomputeIoHwAbEngine({ stepFilter: false });
      simState.activeModules = ["MOD_IOHWAB", "MOD_PWM"];
      simState.activeArrows = ["arr_iohwab_pwm"];
      simState.lastCStatement = "// Bình thường: PWM=60% (0x4CCC), Dòng SmartFET ISENSE = 2600 mA";
    },
    steps: [
      {
        title: "Bước 1: Đứt dây Motor -> Dòng ISENSE = 0 mA khi đang lái 60% [OPEN_LOAD]",
        desc: "Dù IoHwAb xuất xung PWM 60%, mạch phản hồi dòng trả về 0 mA. Bật bit5 OPEN_LOAD (0x20) và báo DEM Event Open-Load.",
        apply: () => {
          simState.faultOpenLoad = true;
          simState.actuatorCurrentMa = 0;
          simState.diagDebounceCount = 3;
          recomputeIoHwAbEngine({ stepFilter: false, preserveDebounce: true });
          logApiTrace("DIAG", "SmartFET", "IoHwAb", "ISENSE = 0mA while PWM=60% -> OPEN_LOAD FAILED");
          simState.activeModules = ["MOD_ADC", "MOD_IOHWAB", "MOD_DEM_FIM"];
          simState.activeArrows = ["arr_adc_iohwab", "arr_iohwab_dem"];
          simState.lastCStatement = "// Duty > 10% && ISENSE < 50mA -> OPEN_LOAD = 1\nDem_SetEventStatus(DEM_EVENT_THROTTLE_OL, FAILED);";
        }
      },
      {
        title: "Bước 2: Chập tải! Dòng vọt 9600mA (>8000mA) -> Trip Over-Current -> IDLE",
        desc: "Bật bit4 OVER_CURR (0x10). Để tránh cháy MOSFET cầu H, IoHwAb cắt lập tức Pwm_SetOutputToIdle() (0x0000) bất chấp lệnh SWC 60%!",
        apply: () => {
          simState.faultOpenLoad = false;
          simState.actuatorCurrentMa = 9600;
          simState.diagDebounceCount = 3;
          recomputeIoHwAbEngine({ stepFilter: false, preserveDebounce: true });
          logApiTrace("SAFE", "IoHwAb", "Pwm_SetOutputToIdle", "Over-Current 9600mA > 8000mA -> PWM = 0x0000 IDLE!");
          simState.activeModules = ["MOD_ADC", "MOD_IOHWAB", "MOD_DEM_FIM", "MOD_PWM"];
          simState.activeArrows = ["arr_adc_iohwab", "arr_iohwab_dem", "arr_iohwab_pwm"];
          simState.lastCStatement = "if (ISENSE_mA > 8000) { OVER_CURR=1; Pwm_SetOutputToIdle(CH_THROTTLE); } // 0x0000!";
        }
      }
    ],
    whatIfs: [
      {
        id: "S10_W1", label: "Nâng giới hạn dòng 12A", desc: "Thử nâng IoHwAbActuatorOverCurrentLimitMa lên 12000mA để dòng 9600mA không trip",
        run: () => {
          simState.cfg.IoHwAbActuatorOverCurrentLimitMa = 12000;
          simState.diagDebounceCount = 0;
          recomputeIoHwAbEngine({ stepFilter: false, preserveDebounce: true });
        }
      },
      {
        id: "S10_W2", label: "Sửa tải về 2500mA", desc: "Xóa lỗi quá dòng và cho phép PWM chạy lại bình thường",
        run: () => {
          simState.faultOpenLoad = false;
          simState.actuatorCurrentMa = 2500;
          simState.diagDebounceCount = 0;
          recomputeIoHwAbEngine({ stepFilter: false, preserveDebounce: true });
        }
      },
      {
        id: "S10_W3", label: "Cưỡng bức OverCurrent + 0x2F", desc: "Chứng minh OCP vẫn thắng cả tester DCM 0x2F để bảo vệ phần cứng",
        run: () => {
          simState.actuatorCurrentMa = 9600;
          simState.dcmControlParam = "SHORT_TERM_ADJUSTMENT";
          simState.dcmOverridePct = 85;
          recomputeIoHwAbEngine({ stepFilter: false });
        }
      }
    ]
  },

  {
    id: "S11",
    title: "S11 · ISO 26262 Safety Chain: IoHwAb -> DEM -> FiM Safe-State Idle",
    summary: "Chuỗi an toàn chức năng kinh điển AUTOSAR: lỗi xác nhận từ DEM kích hoạt FiM_GetFunctionPermission(FID_ACTUATOR) == FALSE, buộc IoHwAb hạ Actuator về 0x0000 bất chấp SWC hay DCM 0x2F.",
    setup: () => {
      createInitialSimState();
      simState.swcTargetDutyPct = 75.0;
      simState.dcmControlParam = "SHORT_TERM_ADJUSTMENT";
      simState.dcmOverridePct = 80.0;
      simState.fimPermission = true;
      recomputeIoHwAbEngine({ stepFilter: false });
      simState.activeModules = ["MOD_DCM", "MOD_IOHWAB", "MOD_PWM"];
      simState.activeArrows = ["arr_dcm_iohwab", "arr_iohwab_pwm"];
      simState.lastCStatement = "// Hiện DCM 0x2F đang điều khiển 80%, FiM Permission = TRUE";
    },
    steps: [
      {
        title: "Bước 1: Phát sinh lỗi nghiêm trọng -> DEM báo FAILED -> FiM Cấm FID",
        desc: "DEM ghi nhận DTC nghiêm trọng (vd ngắn mạch cảm biến hoặc kẹt Relay) và báo cho FiM (Function Inhibition Manager) hạ quyền FID_ACTUATOR = FALSE.",
        apply: () => {
          simState.adcPinMv = 100;
          simState.diagDebounceCount = 3;
          simState.fimPermission = false;
          recomputeIoHwAbEngine({ stepFilter: false, preserveDebounce: true });
          logApiTrace("FIM", "DEM", "FiM", "Event FAILED -> FID_THROTTLE Permission = FALSE");
          simState.activeModules = ["MOD_IOHWAB", "MOD_DEM_FIM"];
          simState.activeArrows = ["arr_iohwab_dem", "arr_fim_iohwab"];
          simState.lastCStatement = "Dem_SetEventStatus(EVT_CRITICAL, FAILED);\nFiM_GetFunctionPermission(FID_THROTTLE, &Perm); // Perm == FALSE!";
        }
      },
      {
        title: "Bước 2: Multiplexer IoHwAb ưu tiên FiM Safe-State -> Pwm_SetOutputToIdle()",
        desc: "Dù SWC đòi 75% và DCM 0x2F đòi 80%, IoHwAb vẫn ép PWM về 0x0000 (IDLE_LOW). Thanh B Bit1 FIM_SAFE = 1.",
        apply: () => {
          logApiTrace("SAFE", "IoHwAb", "Pwm_SetOutputToIdle", "FiM Safe-State OVERRIDE ALL -> 0x0000 IDLE!");
          simState.activeModules = ["MOD_DEM_FIM", "MOD_IOHWAB", "MOD_PWM"];
          simState.activeArrows = ["arr_fim_iohwab", "arr_iohwab_pwm"];
          simState.lastCStatement = "// Priority 1: FiM Denied overrides both SWC & DCM 0x2F!\nPwm_SetOutputToIdle(PWM_CH_THROTTLE); // 0x0000 IDLE_LOW";
        }
      }
    ],
    whatIfs: [
      {
        id: "S11_W1", label: "Tắt Check FiM (Không an toàn)", desc: "Thử tắt IoHwAbEnableFiMSafeStateCheck -> Thấy DCM 0x2F chạy bừa dù DEM FAILED",
        run: () => {
          simState.cfg.IoHwAbEnableFiMSafeStateCheck = false;
          recomputeIoHwAbEngine({ stepFilter: false, preserveDebounce: true });
        }
      },
      {
        id: "S11_W2", label: "Xóa lỗi & Nhả FiM", desc: "Phục hồi cảm biến 2500mV và trả FiM Permission = TRUE",
        run: () => {
          simState.cfg.IoHwAbEnableFiMSafeStateCheck = true;
          simState.adcPinMv = 2500;
          simState.diagDebounceCount = 0;
          simState.fimPermission = true;
          recomputeIoHwAbEngine({ stepFilter: false, preserveDebounce: true });
        }
      },
      {
        id: "S11_W3", label: "Thử đảo cực tính PWM_LOW", desc: "Đổi PwmPolarityAndIdleState = PWM_LOW / IDLE_HIGH cho mạch nghịch",
        run: () => {
          simState.cfg.PwmPolarityAndIdleState = "PWM_LOW / IDLE_HIGH";
          recomputeIoHwAbEngine({ stepFilter: false, preserveDebounce: true });
        }
      }
    ]
  },

  {
    id: "S12",
    title: "S12 · DCM UDS 0x2F: ShortTermAdjustment (0x03), Freeze (0x02), Reset (0x01)",
    summary: "Chẩn đoán chủ động tại xưởng qua UDS Service 0x2F (InputOutputControlByIdentifier): máy tester ghi đè trực tiếp Actuator mà không cần sửa code SWC.",
    setup: () => {
      createInitialSimState();
      simState.selectedChannel = "CH2_PWM_Throttle";
      simState.swcTargetDutyPct = 35.0;
      simState.dcmControlParam = "RETURN_TO_ECU";
      recomputeIoHwAbEngine({ stepFilter: false });
      simState.activeModules = ["MOD_SWC_APP", "MOD_IOHWAB", "MOD_PWM"];
      simState.activeArrows = ["arr_sa_rte", "arr_rte_iohwab", "arr_iohwab_pwm"];
      simState.lastCStatement = "// SWC đang điều khiển bình thường ở 35.0% (0x2CCC)";
    },
    steps: [
      {
        title: "Bước 1: UDS 2F [DID] 03 [80%] -> ShortTermAdjustment (0x03)",
        desc: "Tester gửi lệnh 0x03 ép mở bướm ga 80.0%. Bit0 DCM_0x2F = 1, Mux ngắt lệnh 35% từ SWC và xuất 0x6666 xuống PWM MCAL.",
        apply: () => {
          simState.dcmControlParam = "SHORT_TERM_ADJUSTMENT";
          simState.dcmOverridePct = 80.0;
          recomputeIoHwAbEngine({ stepFilter: false });
          logApiTrace("UDS", "DCM", "IoHwAb_Dcm_ShortTermAdj", "0x03 Override = 80.0% (0x6666) -> Ignores SWC 35%");
          simState.activeModules = ["MOD_DCM", "MOD_IOHWAB", "MOD_PWM"];
          simState.activeArrows = ["arr_dcm_iohwab", "arr_iohwab_pwm"];
          simState.lastCStatement = "IoHwAb_Dcm_Throttle_ShortTermAdjustment(80.0f);\n// PWM = 0x6666 (80%), SWC command ignored!";
        }
      },
      {
        title: "Bước 2: UDS 2F [DID] 02 -> FreezeCurrentState (0x02)",
        desc: "Đóng băng trạng thái ngõ ra tại mức hiện hành (giả sử đóng băng ở 60.0%) kể cả khi SWC thay đổi giá trị.",
        apply: () => {
          simState.dcmFreezePct = 60.0;
          simState.dcmControlParam = "FREEZE_CURRENT_STATE";
          simState.swcTargetDutyPct = 15.0; // SWC tries 15%, ignored!
          recomputeIoHwAbEngine({ stepFilter: false });
          logApiTrace("UDS", "DCM", "IoHwAb_Dcm_FreezeState", "0x02 Frozen at 60.0% (0x4CCC)");
          simState.activeModules = ["MOD_DCM", "MOD_IOHWAB", "MOD_PWM"];
          simState.activeArrows = ["arr_dcm_iohwab", "arr_iohwab_pwm"];
          simState.lastCStatement = "IoHwAb_Dcm_Throttle_FreezeCurrentState(); // Frozen @ 60.0%";
        }
      },
      {
        title: "Bước 3: UDS 2F [DID] 01 -> ResetToDefault (0x01)",
        desc: "Đưa cơ cấu chấp hành về giá trị mặc định tĩnh (0.0% / IDLE) nhưng vẫn giữ quyền kiểm soát thuộc về DCM.",
        apply: () => {
          simState.dcmControlParam = "RESET_TO_DEFAULT";
          recomputeIoHwAbEngine({ stepFilter: false });
          logApiTrace("UDS", "DCM", "IoHwAb_Dcm_ResetToDefault", "0x01 Reset to Default 0.0%");
          simState.activeModules = ["MOD_DCM", "MOD_IOHWAB", "MOD_PWM"];
          simState.activeArrows = ["arr_dcm_iohwab", "arr_iohwab_pwm"];
          simState.lastCStatement = "IoHwAb_Dcm_Throttle_ResetToDefault(); // Output = 0.0%, DCM_0x2F=1";
        }
      }
    ],
    whatIfs: [
      {
        id: "S12_W1", label: "Tắt cho phép DCM 0x2F", desc: "Tắt IoHwAbEnableDcm0x2FControl -> Quyền tự động trả về SWC",
        run: () => {
          simState.cfg.IoHwAbEnableDcm0x2FControl = false;
          recomputeIoHwAbEngine({ stepFilter: false });
        }
      },
      {
        id: "S12_W2", label: "Ép 99% qua DCM 0x2F", desc: "Thử kiểm chứng DCM 0x2F vẫn phải tuân theo Clamp an toàn 95%!",
        run: () => {
          simState.cfg.IoHwAbEnableDcm0x2FControl = true;
          simState.cfg.IoHwAbPwmDutyClampEnable = true;
          simState.dcmControlParam = "SHORT_TERM_ADJUSTMENT";
          simState.dcmOverridePct = 99.0;
          recomputeIoHwAbEngine({ stepFilter: false });
        }
      },
      {
        id: "S12_W3", label: "Kích FiM Inhibit khi đang 0x2F", desc: "Xem FiM Safe-State cắt đứt quyền của Tester DCM 0x2F",
        run: () => {
          simState.fimPermission = false;
          recomputeIoHwAbEngine({ stepFilter: false });
        }
      }
    ]
  },

  {
    id: "S13",
    title: "S13 · ReturnControlToECU (0x00), S3 Timeout & IoHwAb_DeInit",
    summary: "Kết thúc phiên chẩn đoán UDS 0x2F bằng lệnh ReturnControlToECU (0x00) hoặc hết S3 Timer, trả quyền cho SWC, và trình tự tắt máy an toàn IoHwAb_DeInit().",
    setup: () => {
      createInitialSimState();
      simState.dcmControlParam = "SHORT_TERM_ADJUSTMENT";
      simState.dcmOverridePct = 70.0;
      simState.swcTargetDutyPct = 40.0;
      recomputeIoHwAbEngine({ stepFilter: false });
      simState.activeModules = ["MOD_DCM", "MOD_IOHWAB", "MOD_PWM"];
      simState.activeArrows = ["arr_dcm_iohwab", "arr_iohwab_pwm"];
      simState.lastCStatement = "// Đang trong phiên Tester 0x2F (70%), SWC đang chờ ở mức 40%";
    },
    steps: [
      {
        title: "Bước 1: UDS 2F [DID] 00 -> ReturnControlToECU (Trả quyền SWC 40%)",
        desc: "Bit0 DCM_0x2F xóa về 0. IoHwAb trả quyền Multiplexer lại cho SWC_App (xuất 40.0% = 0x3333).",
        apply: () => {
          simState.dcmControlParam = "RETURN_TO_ECU";
          simState.swcTargetDutyPct = 40.0;
          recomputeIoHwAbEngine({ stepFilter: false });
          logApiTrace("UDS", "DCM", "IoHwAb_Dcm_ReturnControlToECU", "0x00 Control Returned to SWC (40.0%)");
          simState.activeModules = ["MOD_DCM", "MOD_SWC_SA", "MOD_RTE", "MOD_IOHWAB", "MOD_PWM"];
          simState.activeArrows = ["arr_dcm_iohwab", "arr_sa_rte", "arr_rte_iohwab", "arr_iohwab_pwm"];
          simState.lastCStatement = "IoHwAb_Dcm_Throttle_ReturnControlToECU(); // Bit0 DCM_0x2F = 0\n// SWC Control restored -> PWM = 0x3333 (40%)";
        }
      },
      {
        title: "Bước 2: ECU Shutdown -> BswM/EcuM gọi IoHwAb_DeInit()",
        desc: "Khi tắt khóa điện (Ignition OFF), IoHwAb_DeInit() đưa toàn bộ PWM/DIO về trạng thái Idle an toàn và hạ Bit7 IOHWAB_INIT = 0.",
        apply: () => {
          simState.cfg.IoHwAbInitialized = false;
          simState.initPhase = "DEINIT";
          recomputeIoHwAbEngine({ stepFilter: false });
          logApiTrace("SHUTDOWN", "BswM", "IoHwAb_DeInit", "All Actuators Forced Idle, INIT=0");
          simState.activeModules = ["MOD_BSWM_ECUM", "MOD_IOHWAB", "MOD_PWM"];
          simState.activeArrows = ["arr_ecum_iohwab", "arr_iohwab_pwm"];
          simState.lastCStatement = "IoHwAb_DeInit(); // All PWM -> 0x0000 IDLE_LOW, IOHWAB_INIT = 0";
        }
      }
    ],
    whatIfs: [
      {
        id: "S13_W1", label: "S3 Session Timeout Fallback", desc: "Giả lập mất kết nối Tester -> DCM tự trả quyền về ECU",
        run: () => {
          simState.cfg.IoHwAbInitialized = true;
          simState.initPhase = "RUNNING";
          simState.dcmControlParam = "RETURN_TO_ECU";
          logApiTrace("DCM", "DCM", "S3_Timeout", "Diagnostic Session Ended -> Auto ReturnControlToECU");
          recomputeIoHwAbEngine({ stepFilter: false });
        }
      },
      {
        id: "S13_W2", label: "Re-Init sau Shutdown", desc: "Bật khóa điện lại gọi IoHwAb_Init() khôi phục vận hành",
        run: () => {
          simState.cfg.IoHwAbInitialized = true;
          simState.initPhase = "RUNNING";
          recomputeIoHwAbEngine({ stepFilter: false });
        }
      },
      {
        id: "S13_W3", label: "Thử gọi SWC sau DeInit", desc: "Chứng minh DET báo IOHWAB_E_UNINIT (0x01) sau khi đã DeInit",
        run: () => {
          simState.cfg.IoHwAbInitialized = false;
          simState.initPhase = "DEINIT";
          logDetError("0x12", "IOHWAB_E_UNINIT", "Call after IoHwAb_DeInit");
          recomputeIoHwAbEngine({ stepFilter: false });
        }
      }
    ]
  },

  {
    id: "S14",
    title: "S14 · DET Development Errors (Mod 254: 0x01..0x04) & ADC_E_BUSY",
    summary: "Tổng hợp xử lý lỗi phát triển DET chuẩn SWS (Uninit 0x01, NullPtr 0x02, InvalidChannel 0x03, InvalidValue 0x04) và lỗi MCAL ADC đang bận (ADC_E_BUSY).",
    setup: () => {
      createInitialSimState();
      simState.cfg.IoHwAbDevErrorDetect = true;
      recomputeIoHwAbEngine({ stepFilter: false });
      simState.activeModules = ["MOD_IOHWAB", "MOD_DET"];
      simState.activeArrows = ["arr_iohwab_det"];
      simState.lastCStatement = "// DET Enabled (Module ID = 254). Sẵn sàng bắt lỗi lập trình API.";
    },
    steps: [
      {
        title: "Bước 1: Truyền NULL Pointer -> Det_ReportError(254, 0, API, 0x02)",
        desc: "SWC truyền con trỏ NULL vào IoHwAb_PedalSensor_GetPhysVal(NULL, &Qual). IoHwAb ngắt ngay hàm và báo IOHWAB_E_PARAM_POINTER (0x02).",
        apply: () => {
          logDetError("0x05", "IOHWAB_E_PARAM_POINTER (0x02)", "NULL pointer in GetPhysVal");
          simState.activeModules = ["MOD_SWC_SA", "MOD_RTE", "MOD_IOHWAB", "MOD_DET"];
          simState.activeArrows = ["arr_sa_rte", "arr_rte_iohwab", "arr_iohwab_det"];
          simState.lastCStatement = "IoHwAb_PedalSensor_GetPhysVal(NULL_PTR, &Qual);\n// Det_ReportError(254, 0, 0x05, IOHWAB_E_PARAM_POINTER /*0x02*/);";
        }
      },
      {
        title: "Bước 2: Invalid Channel (0x03) & NaN Value (0x04)",
        desc: "Gọi kênh không cấu hình trong ECUC (0x03) hoặc ghi NaN / ngoài dải cho phép (0x04) -> DET ghi nhận tức thì.",
        apply: () => {
          logDetError("0x10", "IOHWAB_E_PARAM_CHANNEL (0x03)", "Channel ID 99 out of ECUC bounds");
          logDetError("0x11", "IOHWAB_E_PARAM_VALUE (0x04)", "TargetDuty = NaN or > 100%");
          simState.activeModules = ["MOD_IOHWAB", "MOD_DET"];
          simState.activeArrows = ["arr_iohwab_det"];
          simState.lastCStatement = "Det_ReportError(254, 0, 0x10, 0x03 /* E_PARAM_CHANNEL */);\nDet_ReportError(254, 0, 0x11, 0x04 /* E_PARAM_VALUE */);";
        }
      },
      {
        title: "Bước 3: MCAL Adc_GetGroupStatus() == ADC_BUSY -> Giữ giá trị cũ an toàn",
        desc: "Nếu gọi Adc_StartGroupConversion() khi ADC đang chuyển đổi, MCAL trả ADC_E_BUSY. IoHwAb hạ Bit6 ADC_VALID = 0 và giữ lại giá trị LastValid.",
        apply: () => {
          simState.adcGroupBusy = true;
          recomputeIoHwAbEngine({ stepFilter: false });
          logDetError("0x02", "ADC_E_BUSY (MCAL)", "Adc Group still converting -> Keep LastValid");
          simState.activeModules = ["MOD_IOHWAB", "MOD_ADC", "MOD_DET"];
          simState.activeArrows = ["arr_iohwab_adc", "arr_iohwab_det"];
          simState.lastCStatement = "if (Adc_GetGroupStatus(GRP_PEDAL) == ADC_BUSY)\n  return E_NOT_OK; // Keep LastValidPct, ADC_VALID=0";
        }
      }
    ],
    whatIfs: [
      {
        id: "S14_W1", label: "Xóa trạng thái ADC_BUSY", desc: "Cho nhóm ADC hoàn tất chuyển đổi để Bit6 ADC_VALID bật lại 1",
        run: () => {
          simState.adcGroupBusy = false;
          recomputeIoHwAbEngine({ stepFilter: false });
        }
      },
      {
        id: "S14_W2", label: "Tiêm DET 0x01 UNINIT", desc: "Gửi lỗi IOHWAB_E_UNINIT vào DET Trace",
        run: () => {
          simState.cfg.IoHwAbInitialized = false;
          simState.initPhase = "UNINIT";
          logDetError("0x01", "IOHWAB_E_UNINIT (0x01)", "Manual DET 0x01 Trigger");
          recomputeIoHwAbEngine({ stepFilter: false });
        }
      },
      {
        id: "S14_W3", label: "Dọn sạch DET Log", desc: "Xóa danh sách nhật ký lỗi DET để kiểm tra lượt chạy mới",
        run: () => {
          simState.detLogs = [];
          simState.adcGroupBusy = false;
          simState.cfg.IoHwAbInitialized = true;
          simState.initPhase = "RUNNING";
          recomputeIoHwAbEngine({ stepFilter: false });
        }
      }
    ]
  }
];
