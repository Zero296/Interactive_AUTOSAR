// ================= PART 4B: 14 SCENARIOS (S1..S14) & 42 1-CLICK WHAT-IF EXPERIMENTS =================

const SCENARIOS = [
  // -------------------- GROUP 1: INIT, READ, WRITE & ERASE (S1-S4) --------------------
  {
    id: "S1",
    group: "Nhóm 1: Khởi Tạo, Đọc, Ghi Đa Chu Kỳ & Xóa Trang",
    title: "S1: Khởi Tạo Eep_Init(&Eep_Config) & Nạp Tham Số Vật Lý (UNINIT → IDLE)",
    shortDesc: "Từ MEMIF_UNINIT -> Eep_Init(&Eep_Config) -> MEMIF_IDLE, chặn DET khi chưa khởi tạo và đọc VersionInfo ModuleId = 90.",
    setup: () => {
      resetSimState(false);
      ecucConfig.EepInitialized = false;
      ecucConfig.EepDevErrorDetect = true;
      ecucConfig.EepVersionInfoApi = true;
      simState.driverStatus = "MEMIF_UNINIT";
      simState.driverSmState = "UNINIT";
      simState.lastApiCodeKey = "Eep_Init";
      simState.activeArrows = [];
      updateDerivedRegisters();
    },
    steps: [
      {
        title: "Bước 1: Trạng thái sau Reset MCU (MEMIF_UNINIT)",
        explain: "<b>Input:</b> MCU vừa bật nguồn (Power-On Reset). Bit 7 <code>EEP_INIT = 0</code> trên Thanh A (0x10).<br><b>Xử lý:</b> Nếu bất kỳ lớp nào (như Ea) cố gọi <code>Eep_Read(0x0000, 16)</code> trước khi khởi tạo, hàng rào DET chặn ngay và báo <b>EEP_E_UNINIT (0x00)</b>.<br><b>Output:</b> <code>Det_ReportError(90, 0, 0x02, EEP_E_UNINIT)</code> & trả về <code>E_NOT_OK</code>.",
        apply: () => {
          api_Eep_Read(0x0000, 16, "Ea");
          simState.selectedModuleId = "MOD_DET";
        }
      },
      {
        title: "Bước 2: EcuM gọi Eep_Init(&Eep_Config)",
        explain: "<b>Input:</b> Ở pha <code>EcuM_AL_DriverInitOne</code>, EcuM truyền con trỏ cấu hình Post-Build <code>&amp;Eep_Config</code> (Mode mặc định <code>MEMIF_MODE_SLOW</code>, Base=0x0000, Size=256B).<br><b>Xử lý:</b> Eep thiết lập tham số vật lý, kiểm tra phần cứng sẵn sàng và chuyển từ <code>MEMIF_UNINIT</code> sang <code>MEMIF_IDLE</code>.<br><b>Output:</b> Thanh A bật <code>EEP_INIT=1</code> &amp; <code>JOB_OK=1</code> (0x90); Thanh B bật <code>HW_RDY=1</code> (0x80).",
        apply: () => {
          api_Eep_Init(true);
          simState.selectedModuleId = "MOD_EEP";
        }
      },
      {
        title: "Bước 3: Đọc Phiên Bản Eep_GetVersionInfo(&VerInfo)",
        explain: "<b>Input:</b> Bsw/Diagnostic kiểm tra nhận dạng module khi <code>EepVersionInfoApi = TRUE</code>.<br><b>Xử lý:</b> Eep điền cấu trúc <code>Std_VersionInfoType</code> theo AUTOSAR R23-11: <code>vendorID=43</code>, <code>moduleID=90 (0x005A)</code>, <code>sw=23.11.0</code>.<br><b>Output:</b> Trả đồng bộ tức thì, sẵn sàng nhận lệnh từ Ea.",
        apply: () => {
          api_Eep_GetVersionInfo(true);
          simState.selectedModuleId = "MOD_EEP";
        }
      }
    ],
    whatIfs: [
      {
        label: "Thử gọi Eep_Read khi UNINIT (DET 0x00)",
        run: () => {
          ecucConfig.EepInitialized = false;
          simState.driverStatus = "MEMIF_UNINIT";
          simState.driverSmState = "UNINIT";
          updateDerivedRegisters();
          api_Eep_Read(0x0000, 8, "Ea");
        }
      },
      {
        label: "Eep_Init(NULL_PTR) -> DET 0x09",
        run: () => {
          api_Eep_Init(false);
        }
      },
      {
        label: "Tắt EepVersionInfoApi & Đọc Ver",
        run: () => {
          ecucConfig.EepVersionInfoApi = false;
          api_Eep_GetVersionInfo(true);
        }
      }
    ]
  },

  {
    id: "S2",
    group: "Nhóm 1: Khởi Tạo, Đọc, Ghi Đa Chu Kỳ & Xóa Trang",
    title: "S2: Đọc Đa Chu Kỳ Eep_Read(0x0000, 24B) Chia Nhỏ 16B+8B Theo Mode SLOW",
    shortDesc: "Đọc 24B từ 0x0000 ở MEMIF_MODE_SLOW (Chunk 1 = 16B, Chunk 2 = 8B -> 2 Ticks) và đối chiếu tăng tốc FAST Mode (1 Tick).",
    setup: () => {
      resetSimState(false);
      api_Eep_Init(true);
      for (let i = 0; i < 64; i++) {
        simState.eepromMemory[i] = (0x10 + i) & 0xFF;
      }
      simState.traceLogs = [];
      simState.lastApiCodeKey = "Eep_Read";
    },
    steps: [
      {
        title: "Bước 1: Ea gọi Eep_Read(0x0000, 24B) ở MEMIF_MODE_SLOW",
        explain: "<b>Input:</b> <code>EepromAddress = 0x0000</code>, <code>Length = 24B</code>. Chế độ hiện tại là <code>MEMIF_MODE_SLOW</code> (<code>EepNormalReadBlockSize = 16B</code>).<br><b>Xử lý:</b> Eep xác thực <code>0+24 &lt;= 256</code>, nhận Job và chuyển sang <code>MEMIF_BUSY</code> / <code>MEMIF_JOB_PENDING</code>.<br><b>Output:</b> Tạo kế hoạch chia làm <b>2 Chunks (16B + 8B)</b>.",
        apply: () => {
          api_Eep_Read(0x0000, 24, "Ea");
        }
      },
      {
        title: "Bước 2: SchM Tick #1 (+5ms) -> Đọc Chunk 1/2 (16B: 0x0000..0x000F)",
        explain: "<b>Input:</b> Nhịp <code>Eep_MainFunction()</code> từ SchM.<br><b>Xử lý:</b> Đọc Chunk 1 <code>[0x0000..0x000F]</code> qua SPI CMD 0x03 vào RAM. Còn lại <code>8B</code>.<br><b>Output:</b> Driver giữ <code>MEMIF_BUSY</code> chờ chu kỳ kế tiếp.",
        apply: () => {
          stepClockTick(5);
        }
      },
      {
        title: "Bước 3: SchM Tick #2 (+5ms) -> Đọc Chunk 2/2 (8B) & Callback Ea",
        explain: "<b>Input:</b> Nhịp <code>Eep_MainFunction()</code> thứ 2.<br><b>Xử lý:</b> Đọc nốt 8B <code>[0x0010..0x0017]</code> -> Remaining = 0B.<br><b>Output:</b> Driver về <code>MEMIF_IDLE</code>, <code>MEMIF_JOB_OK</code>, gọi <code>Ea_JobEndNotification()</code>.",
        apply: () => {
          stepClockTick(5);
        }
      },
      {
        title: "Bước 4: Chuyển Eep_SetMode(FAST) & Đọc 24B vùng 0x0020 trong 1 Tick!",
        explain: "<b>Input:</b> BswM/NvM gọi <code>Eep_SetMode(MEMIF_MODE_FAST)</code> (bật Bit 1 <code>FAST_MD=1</code>, Chunk=64B) rồi gọi <code>Eep_Read(0x0020, 24)</code>.<br><b>Xử lý:</b> Vì 24B &lt;= 64B, chỉ mất <b>1 nhịp Eep_MainFunction()</b> duy nhất là đọc xong toàn bộ 24B!<br><b>Output:</b> Nhanh gấp đôi so với SLOW Mode.",
        apply: () => {
          api_Eep_SetMode("MEMIF_MODE_FAST", "MemIf");
          api_Eep_Read(0x0020, 24, "Ea");
          stepClockTick(5);
        }
      }
    ],
    whatIfs: [
      {
        label: "Đọc 24B ở SLOW Mode (16B + 8B = 2 Ticks)",
        run: () => {
          if (simState.driverStatus === "MEMIF_BUSY") api_Eep_Cancel("Test");
          api_Eep_SetMode("MEMIF_MODE_SLOW", "Test");
          api_Eep_Read(0x0000, 24, "Ea");
          runActiveJobToCompletion(10);
        }
      },
      {
        label: "Bật FAST Mode & Đọc 48B (1 Tick)",
        run: () => {
          if (simState.driverStatus === "MEMIF_BUSY") api_Eep_Cancel("Test");
          api_Eep_SetMode("MEMIF_MODE_FAST", "Test");
          api_Eep_Read(0x0000, 48, "Ea");
          stepClockTick(5);
        }
      },
      {
        label: "Gọi SetMode khi đang BUSY -> EEP_E_BUSY",
        run: () => {
          if (simState.driverStatus === "MEMIF_BUSY") api_Eep_Cancel("Test");
          api_Eep_Read(0x0000, 24, "Ea");
          api_Eep_SetMode("MEMIF_MODE_FAST", "Test");
        }
      }
    ]
  },

  {
    id: "S3",
    group: "Nhóm 1: Khởi Tạo, Đọc, Ghi Đa Chu Kỳ & Xóa Trang",
    title: "S3: Ghi Đa Chu Kỳ Eep_Write(0x0060, 16B) Kèm Blank Check & Read-Back Verify",
    shortDesc: "Ghi 16B tại 0x0060 ở SLOW (Chunk 8B = 2 Ticks), khóa ghi WREN, lập trình WIP và Read-Back Verify từng byte.",
    setup: () => {
      resetSimState(false);
      api_Eep_Init(true);
      simState.traceLogs = [];
      simState.lastApiCodeKey = "Eep_Write";
    },
    steps: [
      {
        title: "Bước 1: Gửi yêu cầu Eep_Write(0x0060, 16B Payload)",
        explain: "<b>Input:</b> Ghi 16 bytes dữ liệu Calibration <code>[C0..CF]</code> tại <code>0x0060</code> ở <code>MEMIF_MODE_SLOW</code> (<code>EepNormalWriteBlockSize = 8B</code>).<br><b>Xử lý:</b> Eep nhận lệnh, chuyển sang <code>MEMIF_BUSY</code>, chia 16B thành <b>2 Chunks x 8B</b>; bật <code>WEL_EN</code> &amp; <code>WIP_BSY</code> trên Thanh B.<br><b>Output:</b> Trả <code>E_OK</code> ngay lập tức (Non-blocking Async).",
        apply: () => {
          const data = Array.from({ length: 16 }, (_, i) => 0xC0 + i);
          api_Eep_Write(0x0060, data, "Ea");
        }
      },
      {
        title: "Bước 2: Tick #1 -> Lập trình Chunk 1 (0x0060..0x0067) + Verify",
        explain: "<b>Input:</b> <code>Eep_MainFunction()</code> chạy lần 1.<br><b>Xử lý:</b> Phát chuỗi SPI <code>WREN (0x06) -> WRITE (0x02, 8B)</code>. Với <code>EnableWriteVerification = TRUE</code>, Eep đọc ngược 8 byte vừa ghi để kiểm chứng khớp 100%.<br><b>Output:</b> 8B đầu xanh lá trên Bản đồ EEPROM, còn 8B chờ ở Tick 2.",
        apply: () => {
          stepClockTick(5);
        }
      },
      {
        title: "Bước 3: Tick #2 -> Lập trình Chunk 2 (0x0068..0x006F) + Callback",
        explain: "<b>Input:</b> <code>Eep_MainFunction()</code> chạy lần 2.<br><b>Xử lý:</b> Ghi tiếp 8B cuối <code>0x0068..0x006F</code> và Read-Back Verify khớp 100%.<br><b>Output:</b> Bật Bit 3 Thanh B <code>WR_VRFY=1</code>, trả <code>MEMIF_JOB_OK</code> và gọi <code>Ea_JobEndNotification()</code>.",
        apply: () => {
          stepClockTick(5);
        }
      }
    ],
    whatIfs: [
      {
        label: "Ghi 16B @ 0x0060 ở FAST Mode (1 Tick xong)",
        run: () => {
          if (simState.driverStatus === "MEMIF_BUSY") api_Eep_Cancel("Test");
          api_Eep_SetMode("MEMIF_MODE_FAST", "Test");
          api_Eep_Write(0x0060, Array.from({ length: 16 }, (_, i) => 0xD0 + i), "Ea");
          stepClockTick(5);
        }
      },
      {
        label: "Gài Stuck Bit @ 0x0064 -> Verify Fail!",
        run: () => {
          if (simState.driverStatus === "MEMIF_BUSY") api_Eep_Cancel("Test");
          simState.stuckBits[0x0064] = { forcedVal: 0x00, reason: "Injected Stuck-at-0" };
          api_Eep_Write(0x0060, Array.from({ length: 16 }, (_, i) => 0xA0 + i), "Ea");
          runActiveJobToCompletion(6);
        }
      },
      {
        label: "Tăng WriteTime lên 15ms (Đa Tick WIP)",
        run: () => {
          if (simState.driverStatus === "MEMIF_BUSY") api_Eep_Cancel("Test");
          ecucConfig.EepWriteTimeMs = 15;
          api_Eep_Write(0x0060, [1, 2, 3, 4, 5, 6, 7, 8], "Ea");
          stepClockTick(5);
        }
      }
    ]
  },

  {
    id: "S4",
    group: "Nhóm 1: Khởi Tạo, Đọc, Ghi Đa Chu Kỳ & Xóa Trang",
    title: "S4: Xóa Vùng Nhớ Eep_Erase(0x0050, 16B) Về 0xFF & Erase Verification",
    shortDesc: "Xóa vùng nhớ cũ [0x0050..0x005F] về EepEraseValue (0xFF) với kiểm tra bội số EepEraseUnitSize = 8B và Blank Check.",
    setup: () => {
      resetSimState(false);
      api_Eep_Init(true);
      for (let i = 0x50; i <= 0x5F; i++) {
        simState.eepromMemory[i] = (0x50 + (i - 0x50)) & 0xFF;
      }
      simState.traceLogs = [];
      simState.lastApiCodeKey = "Eep_Erase";
    },
    steps: [
      {
        title: "Bước 1: Hiện trạng dữ liệu cũ tại 0x0050..0x005F",
        explain: "<b>Input:</b> Vùng <code>0x0050..0x005F</code> đang chứa dữ liệu cũ <code>[50..5F]</code>. Tham số <code>EepEraseUnitSize = 8B</code>, <code>EepEraseValue = 0xFF</code>.<br><b>Xử lý:</b> Gọi <code>Eep_Erase(0x0050, 16)</code>. Địa chỉ và độ dài chia hết cho 8B nên vượt qua bước kiểm tra DET.<br><b>Output:</b> Hàng đợi Erase 16B (2 Chunks x 8B).",
        apply: () => {
          api_Eep_Erase(0x0050, 16, "Ea");
        }
      },
      {
        title: "Bước 2: Tick #1 -> Xóa 8B đầu (0x0050..0x0057) về 0xFF",
        explain: "<b>Input:</b> <code>Eep_MainFunction()</code> xử lý Chunk 1.<br><b>Xử lý:</b> Mở khóa WREN, đưa toàn bộ byte <code>0x0050..0x0057</code> về <code>0xFF</code> và bật <code>EnableEraseVerification</code> kiểm tra từng byte == 0xFF.<br><b>Output:</b> 8 ô nhớ đầu trở lại màu trắng <code>FF</code>.",
        apply: () => {
          stepClockTick(5);
        }
      },
      {
        title: "Bước 3: Tick #2 -> Hoàn tất Xóa 16B & Bật cờ ERS_OK",
        explain: "<b>Input:</b> <code>Eep_MainFunction()</code> xử lý nốt Chunk 2 <code>[0x0058..0x005F]</code>.<br><b>Xử lý:</b> Blank-Check 100% các byte đều bằng <code>0xFF</code>.<br><b>Output:</b> Bật Bit 4 Thanh B <code>ERS_OK=1</code>, gọi <code>Ea_JobEndNotification()</code>.",
        apply: () => {
          stepClockTick(5);
        }
      }
    ],
    whatIfs: [
      {
        label: "Đổi EepEraseValue=0x00 & Xóa 16B",
        run: () => {
          if (simState.driverStatus === "MEMIF_BUSY") api_Eep_Cancel("Test");
          ecucConfig.EepEraseValue = "0x00";
          api_Eep_Erase(0x0050, 16, "Ea");
          runActiveJobToCompletion(6);
        }
      },
      {
        label: "Xóa Length=5B (Lệch Unit 8B -> DET 0x03)",
        run: () => {
          if (simState.driverStatus === "MEMIF_BUSY") api_Eep_Cancel("Test");
          api_Eep_Erase(0x0050, 5, "Ea");
        }
      },
      {
        label: "Gài Stuck Bit @ 0x0055 -> DEM ERASE_FAILED",
        run: () => {
          if (simState.driverStatus === "MEMIF_BUSY") api_Eep_Cancel("Test");
          simState.stuckBits[0x0055] = { forcedVal: 0x00, reason: "Erase stuck at 0x00" };
          api_Eep_Erase(0x0050, 16, "Ea");
          runActiveJobToCompletion(6);
        }
      }
    ]
  },

  // -------------------- GROUP 2: COMPARE, CYCLE REDUCTION, SETMODE & INTERRUPT (S5-S8) --------------------
  {
    id: "S5",
    group: "Nhóm 2: So Sánh (Compare), Tối Ưu Chu Kỳ Ghi, SetMode & Ngắt",
    title: "S5: So Sánh Dữ Liệu Khớp 100% Eep_Compare(0x0000, 16B) → MEMIF_JOB_OK",
    shortDesc: "Dùng Eep_Compare() đối chiếu EEPROM [0x0000..0x000F] và RAM không mài mòn ô nhớ -> khớp 100%, MEMIF_JOB_OK.",
    setup: () => {
      resetSimState(false);
      api_Eep_Init(true);
      for (let i = 0; i < 16; i++) simState.eepromMemory[i] = (0xA0 + i) & 0xFF;
      simState.traceLogs = [];
      simState.lastApiCodeKey = "Eep_Compare";
    },
    steps: [
      {
        title: "Bước 1: Ea gọi Eep_Compare(0x0000, ExpectedRam, 16B)",
        explain: "<b>Input:</b> Ea muốn kiểm tra xem vùng <code>0x0000..0x000F</code> có khớp với dữ liệu RAM <code>[A0..AF]</code> hay không.<br><b>Xử lý:</b> <code>Eep_Compare()</code> xếp hàng lệnh so sánh không ghi đè EEPROM (<code>WriteCount</code> không đổi).<br><b>Output:</b> Driver ở <code>MEMIF_BUSY</code>, sẵn sàng đọc đối chiếu.",
        apply: () => {
          api_Eep_Compare(0x0000, Array.from({ length: 16 }, (_, i) => 0xA0 + i), "Ea");
        }
      },
      {
        title: "Bước 2: Eep_MainFunction() đối chiếu toàn bộ 16B -> Khớp 100%!",
        explain: "<b>Input:</b> Chu kỳ <code>Eep_MainFunction()</code> đọc 16B tại <code>0x0000..0x000F</code> và so từng byte với RAM.<br><b>Xử lý:</b> Mọi byte đều trùng khớp hoàn toàn -> không bật cờ lỗi <code>CMP_MIS</code>.<br><b>Output:</b> Trả <code>MEMIF_JOB_OK</code>, gọi <code>Ea_JobEndNotification()</code>.",
        apply: () => {
          runActiveJobToCompletion(6);
        }
      }
    ],
    whatIfs: [
      {
        label: "Compare Khớp 100% (0x0000, 16B)",
        run: () => {
          if (simState.driverStatus === "MEMIF_BUSY") api_Eep_Cancel("Test");
          for (let i = 0; i < 16; i++) simState.eepromMemory[i] = 0xA0 + i;
          api_Eep_Compare(0x0000, Array.from({ length: 16 }, (_, i) => 0xA0 + i), "Ea");
          runActiveJobToCompletion(6);
        }
      },
      {
        label: "Thử Compare vùng 32B SLOW (2 Chunks)",
        run: () => {
          if (simState.driverStatus === "MEMIF_BUSY") api_Eep_Cancel("Test");
          for (let i = 0; i < 32; i++) simState.eepromMemory[i] = (0xA0 + i) & 0xFF;
          api_Eep_Compare(0x0000, Array.from({ length: 32 }, (_, i) => (0xA0 + i) & 0xFF), "Ea");
          runActiveJobToCompletion(6);
        }
      },
      {
        label: "Compare truyền NULL_PTR -> DET 0x02",
        run: () => {
          if (simState.driverStatus === "MEMIF_BUSY") api_Eep_Cancel("Test");
          api_Eep_Compare(0x0000, null, "Ea", { ptrValid: false, length: 16 });
        }
      }
    ]
  },

  {
    id: "S6",
    group: "Nhóm 2: So Sánh (Compare), Tối Ưu Chu Kỳ Ghi, SetMode & Ngắt",
    title: "S6: So Sánh Phát Hiện Lệch Byte Eep_Compare() → MEMIF_BLOCK_INCONSISTENT",
    shortDesc: "Khi byte 0x0009 bị sai lệch giữa EEPROM và RAM, Eep trả MEMIF_BLOCK_INCONSISTENT (Bit 2 CMP_MIS=1) và báo Ea_JobErrorNotification().",
    setup: () => {
      resetSimState(false);
      api_Eep_Init(true);
      for (let i = 0; i < 16; i++) simState.eepromMemory[i] = (0xA0 + i) & 0xFF;
      simState.eepromMemory[0x0009] = 0x56;
      simState.traceLogs = [];
      simState.lastApiCodeKey = "Eep_Compare";
    },
    steps: [
      {
        title: "Bước 1: Chuẩn bị vùng EEPROM lệch 1 byte tại 0x0009 (0x56 != 0xA9)",
        explain: "<b>Input:</b> Trong EEPROM, byte <code>0x0009</code> chứa <code>0x56</code> trong khi bản RAM kỳ vọng là <code>0xA9</code>.<br><b>Xử lý:</b> Ea gọi <code>Eep_Compare(0x0000, ExpectedRam, 16B)</code>.<br><b>Output:</b> Driver vào trạng thái <code>MEMIF_BUSY</code> chuẩn bị quét Chunk.",
        apply: () => {
          api_Eep_Compare(0x0000, Array.from({ length: 16 }, (_, i) => 0xA0 + i), "Ea");
        }
      },
      {
        title: "Bước 2: Eep_Compare phát hiện lệch -> MEMIF_BLOCK_INCONSISTENT!",
        explain: "<b>Input:</b> <code>Eep_MainFunction()</code> quét từng byte và bắt được <code>EEPROM[0x0009] (0x56) != RAM (0xA9)</code>.<br><b>Xử lý:</b> Theo <b>[SWS_Eep_00056]</b>, sai lệch dữ liệu KHÔNG kích hoạt lỗi phần cứng Dem mà trả về <b>MEMIF_BLOCK_INCONSISTENT</b>.<br><b>Output:</b> Bật <code>CMP_MIS=1</code> trên Thanh B, <code>ERR_INC=1</code> trên Thanh A, tô đỏ ô 0x0009 và gọi <code>Ea_JobErrorNotification()</code>.",
        apply: () => {
          runActiveJobToCompletion(6);
        }
      }
    ],
    whatIfs: [
      {
        label: "Lệch byte 0x0009 -> BLOCK_INCONSISTENT",
        run: () => {
          if (simState.driverStatus === "MEMIF_BUSY") api_Eep_Cancel("Test");
          simState.eepromMemory[0x0009] = 0x56;
          api_Eep_Compare(0x0000, Array.from({ length: 16 }, (_, i) => 0xA0 + i), "Ea");
          runActiveJobToCompletion(6);
        }
      },
      {
        label: "Khôi phục 0x0009 = 0xA9 & Compare lại",
        run: () => {
          if (simState.driverStatus === "MEMIF_BUSY") api_Eep_Cancel("Test");
          simState.eepromMemory[0x0009] = 0xA9;
          api_Eep_Compare(0x0000, Array.from({ length: 16 }, (_, i) => 0xA0 + i), "Ea");
          runActiveJobToCompletion(6);
        }
      },
      {
        label: "Lỗi Bus SPI khi Compare -> DEM FAILED",
        run: () => {
          if (simState.driverStatus === "MEMIF_BUSY") api_Eep_Cancel("Test");
          ecucConfig.InjectHwWriteOrEraseVerifyFail = true;
          api_Eep_Compare(0x0000, Array.from({ length: 16 }, (_, i) => 0xA0 + i), "Ea");
          runActiveJobToCompletion(6);
        }
      }
    ]
  },

  {
    id: "S7",
    group: "Nhóm 2: So Sánh (Compare), Tối Ưu Chu Kỳ Ghi, SetMode & Ngắt",
    title: "S7: Giảm Chu Kỳ Ghi EepWriteCycleReduction & Tăng Tốc Eep_SetMode(FAST)",
    shortDesc: "Tiết kiệm tuổi thọ EEPROM bằng cách bỏ qua Chunk trùng dữ liệu (Skip) và kết hợp Eep_SetMode(FAST) tăng 4x kích thước Chunk.",
    setup: () => {
      resetSimState(false);
      api_Eep_Init(true);
      ecucConfig.EepWriteCycleReduction = true;
      for (let i = 0; i < 16; i++) {
        simState.eepromMemory[0x10 + i] = (0xB0 + i) & 0xFF;
        simState.writeCounts[0x10 + i] = 1;
      }
      simState.traceLogs = [];
      simState.lastApiCodeKey = "Eep_Write";
    },
    steps: [
      {
        title: "Bước 1: Ghi đè 16B giống hệt với WriteCycleReduction = TRUE -> Skip 100%!",
        explain: "<b>Input:</b> Vùng <code>0x0010..0x001F</code> đã chứa <code>[B0..BF]</code> (<code>WriteCount = 1</code>). Bật <code>EepWriteCycleReduction = TRUE</code>.<br><b>Xử lý:</b> <code>Eep_MainFunction()</code> đọc so sánh trước khi lập trình; cả 16 byte đều trùng 100% nên <b>Skip hoàn toàn</b> thao tác ghi vật lý!<br><b>Output:</b> <code>Skipped = 16B</code>, <code>WriteCount</code> giữ nguyên <b>1</b> (không mòn cell), báo <code>Ea_JobEndNotification()</code>.",
        apply: () => {
          api_Eep_Write(0x0010, Array.from({ length: 16 }, (_, i) => 0xB0 + i), "Ea");
          runActiveJobToCompletion(6);
        }
      },
      {
        title: "Bước 2: Sửa 1 byte ở Chunk 2 -> Chunk 1 Skip, Chunk 2 Write!",
        explain: "<b>Input:</b> Sửa byte tại <code>0x001A</code> thành <code>0x99</code> và ghi lại 16B ở chế độ SLOW (Chunk 8B).<br><b>Xử lý:</b> Chunk 1 (<code>0x0010..0x0017</code>) khớp 100% -> Skip; Chunk 2 (<code>0x0018..0x001F</code>) có byte khác -> chỉ lập trình vật lý Chunk 2.<br><b>Output:</b> Giảm 50% mài mòn silicon.",
        apply: () => {
          const payload = Array.from({ length: 16 }, (_, i) => 0xB0 + i);
          payload[10] = 0x99;
          api_Eep_Write(0x0010, payload, "Ea");
          runActiveJobToCompletion(6);
        }
      },
      {
        title: "Bước 3: Chuyển Eep_SetMode(MEMIF_MODE_FAST) tăng tốc 4x (32B/Tick)",
        explain: "<b>Input:</b> Gọi <code>Eep_SetMode(MEMIF_MODE_FAST)</code> (<code>FAST_MD=1</code>) và ghi 32B tại <code>0x0020</code>.<br><b>Xử lý:</b> Chunk tăng từ 8B lên <b>32B</b>, xử lý trọn 32B trong đúng <b>1 nhịp Eep_MainFunction()</b>.<br><b>Output:</b> Hoàn tất tức thì ở Tick đầu tiên.",
        apply: () => {
          api_Eep_SetMode("MEMIF_MODE_FAST", "MemIf");
          api_Eep_Write(0x0020, Array.from({ length: 32 }, (_, i) => (0xC0 + i) & 0xFF), "Ea");
          stepClockTick(5);
        }
      }
    ],
    whatIfs: [
      {
        label: "Tắt CycleReduction & Ghi giống hệt (Tốn Cycle)",
        run: () => {
          if (simState.driverStatus === "MEMIF_BUSY") api_Eep_Cancel("Test");
          ecucConfig.EepWriteCycleReduction = false;
          api_Eep_Write(0x0010, Array.from({ length: 16 }, (_, i) => 0xB0 + i), "Ea");
          runActiveJobToCompletion(6);
        }
      },
      {
        label: "Bật CycleReduction & Skip 16B",
        run: () => {
          if (simState.driverStatus === "MEMIF_BUSY") api_Eep_Cancel("Test");
          ecucConfig.EepWriteCycleReduction = true;
          api_Eep_Write(0x0010, Array.from({ length: 16 }, (_, i) => 0xB0 + i), "Ea");
          runActiveJobToCompletion(6);
        }
      },
      {
        label: "Ghi 32B FAST Mode (1 Tick)",
        run: () => {
          if (simState.driverStatus === "MEMIF_BUSY") api_Eep_Cancel("Test");
          api_Eep_SetMode("MEMIF_MODE_FAST", "Test");
          api_Eep_Write(0x0020, Array.from({ length: 32 }, (_, i) => 0x40 + i), "Ea");
          stepClockTick(5);
        }
      }
    ]
  },

  {
    id: "S8",
    group: "Nhóm 2: So Sánh (Compare), Tối Ưu Chu Kỳ Ghi, SetMode & Ngắt",
    title: "S8: Đối Chiếu Polling (Eep_MainFunction) vs Ngắt (EepUseInterrupts=TRUE)",
    shortDesc: "Minh họa EepUseInterrupts=FALSE (Polling mỗi 5ms mất 4 ticks cho 32B) vs TRUE (Ngắt Eep_JobEndIsr giảm một nửa độ trễ).",
    setup: () => {
      resetSimState(false);
      ecucConfig.EepUseInterrupts = false;
      api_Eep_Init(true);
      simState.traceLogs = [];
      simState.lastApiCodeKey = "Eep_MainFunction";
    },
    steps: [
      {
        title: "Bước 1: Polling Mode (EepUseInterrupts = FALSE) ghi 32B -> 4 Ticks",
        explain: "<b>Input:</b> Ghi 32B ở SLOW Mode (8B/chunk) với <code>EepUseInterrupts = FALSE</code> (Bit 0 <code>ISR_MD = 0</code>).<br><b>Xử lý:</b> Mỗi nhịp <code>Eep_MainFunction()</code> (5ms) chỉ xử lý được đúng 1 Chunk 8B -> mất <b>4 Ticks = 20ms</b>.<br><b>Output:</b> Hoàn tất an toàn trong ngữ cảnh OS Task.",
        apply: () => {
          api_Eep_Write(0x0080, Array.from({ length: 32 }, (_, i) => 0x30 + i), "Ea");
          runActiveJobToCompletion(10);
        }
      },
      {
        title: "Bước 2: Bật EepUseInterrupts = TRUE & Khởi chạy ghi 32B",
        explain: "<b>Input:</b> Bật <code>EepUseInterrupts = TRUE</code> (Bit 0 <code>ISR_MD = 1</code> trên Thanh A) và gọi <code>Eep_Write(0x00A0, 32B)</code>.<br><b>Xử lý:</b> Ngay khi phần cứng ghi xong 1 Chunk, ngắt <code>Eep_JobEndIsr()</code> tự nối tiếp Chunk kế mà không đợi chu kỳ OS dài.<br><b>Output:</b> SchM và ISR phối hợp xử lý tức thời [SWS_Eep_00117].",
        apply: () => {
          ecucConfig.EepUseInterrupts = true;
          updateDerivedRegisters();
          api_Eep_Write(0x00A0, Array.from({ length: 32 }, (_, i) => 0x50 + i), "Ea");
        }
      },
      {
        title: "Bước 3: Hoàn tất trong 2 Ticks nhờ Eep_JobEndIsr!",
        explain: "<b>Input:</b> Phần cứng phát ngắt hoàn tất nối tiếp 2 Chunks mỗi nhịp.<br><b>Xử lý:</b> Toàn bộ 32B (4 Chunks) xong chỉ sau <b>2 Ticks = 10ms</b> (nhanh gấp đôi Polling).<br><b>Output:</b> <code>MEMIF_JOB_OK</code>, <code>hwInterruptCount = 2</code>, giảm tải cho CPU Task.",
        apply: () => {
          runActiveJobToCompletion(10);
          simState.selectedModuleId = "MOD_SCHM";
        }
      }
    ],
    whatIfs: [
      {
        label: "Chạy Write 32B Polling (4 Ticks)",
        run: () => {
          if (simState.driverStatus === "MEMIF_BUSY") api_Eep_Cancel("Test");
          ecucConfig.EepUseInterrupts = false;
          updateDerivedRegisters();
          api_Eep_Write(0x0080, Array.from({ length: 32 }, (_, i) => 0x41 + i), "Ea");
          runActiveJobToCompletion(10);
        }
      },
      {
        label: "Bật Interrupt Mode (2 Ticks!)",
        run: () => {
          if (simState.driverStatus === "MEMIF_BUSY") api_Eep_Cancel("Test");
          ecucConfig.EepUseInterrupts = true;
          updateDerivedRegisters();
          api_Eep_Write(0x00A0, Array.from({ length: 32 }, (_, i) => 0x61 + i), "Ea");
          runActiveJobToCompletion(10);
        }
      },
      {
        label: "Kết hợp Interrupt + FAST Mode (1 Tick!)",
        run: () => {
          if (simState.driverStatus === "MEMIF_BUSY") api_Eep_Cancel("Test");
          ecucConfig.EepUseInterrupts = true;
          api_Eep_SetMode("MEMIF_MODE_FAST", "Test");
          api_Eep_Write(0x00C0, Array.from({ length: 32 }, (_, i) => 0x81 + i), "Ea");
          stepClockTick(5);
        }
      }
    ]
  },

  // -------------------- GROUP 3: SPI HARDWARE, SYSTEM STACK & CANCEL (S9-S11) --------------------
  {
    id: "S9",
    group: "Nhóm 3: Giao Tiếp External SPI EEPROM, Luồng Liên Tầng & Cancel",
    title: "S9: Điều Khiển External SPI EEPROM (WREN 0x06 → WRITE 0x02 → RDSR 0x05 → READ)",
    shortDesc: "So sánh trực tiếp Internal On-Chip EEPROM vs External SPI EEPROM đóng gói Spi_SetupEB() + Spi_AsyncTransmit() (WREN/WRITE/RDSR/READ).",
    setup: () => {
      resetSimState(false);
      ecucConfig.EepHardwareInterfaceType = "INTERNAL_ONCHIP_EEPROM";
      api_Eep_Init(true);
      simState.traceLogs = [];
      simState.lastApiCodeKey = "Eep_Write";
    },
    steps: [
      {
        title: "Bước 1: Ghi 8B qua Internal On-Chip EEPROM (Thanh ghi nội)",
        explain: "<b>Input:</b> <code>EepHardwareInterfaceType = INTERNAL_ONCHIP_EEPROM</code>.<br><b>Xử lý:</b> Eep tương tác trực tiếp với thanh ghi điều khiển EEPROM nội vi MCU (<code>EECTRL/EEDATA</code>), không cần gọi sang module <code>Spi</code>.<br><b>Output:</b> Hoàn tất ghi 8B tại <code>0x0060</code> không phát sinh SPI Frame.",
        apply: () => {
          api_Eep_Write(0x0060, [0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88], "Ea");
          runActiveJobToCompletion(4);
        }
      },
      {
        title: "Bước 2: Chuyển External SPI EEPROM -> WREN (0x06) + WRITE (0x02) + RDSR (0x05)",
        explain: "<b>Input:</b> Chuyển <code>EepHardwareInterfaceType = EXTERNAL_SPI_EEPROM</code> (<code>EepSpiSequenceId = 0</code>) và gọi <code>Eep_Write(0x0070, 8B)</code>.<br><b>Xử lý:</b> Eep gọi <code>Spi_SetupEB()</code> + <code>Spi_AsyncTransmit(Seq=0)</code> để truyền khung lệnh <code>WREN (0x06) -> WRITE (0x02, 0x0070) -> RDSR (0x05)</code> qua bus SPI.<br><b>Output:</b> Banner <b>Spi Sequence Frame</b> cập nhật đầy đủ các gói SPI!",
        apply: () => {
          ecucConfig.EepHardwareInterfaceType = "EXTERNAL_SPI_EEPROM";
          api_Eep_Write(0x0070, [0xAA, 0xBB, 0xCC, 0xDD, 0x12, 0x34, 0x56, 0x78], "Ea");
          runActiveJobToCompletion(4);
          simState.selectedModuleId = "MOD_SPI_HW";
        }
      },
      {
        title: "Bước 3: Đọc lại qua SPI CMD READ (0x03) [SWS_Eep_00116]",
        explain: "<b>Input:</b> Gọi <code>Eep_Read(0x0070, 8B)</code> trên bus SPI ngoài.<br><b>Xử lý:</b> Eep đóng gói SPI CMD <code>0x03</code> kèm địa chỉ 16-bit <code>0x0070</code> và nhận 8 byte MISO về RAM.<br><b>Output:</b> Ghi nhận đầy đủ Trace giao tiếp <code>Eep &lt;-&gt; Spi Driver</code>.",
        apply: () => {
          api_Eep_Read(0x0070, 8, "Ea");
          runActiveJobToCompletion(4);
        }
      }
    ],
    whatIfs: [
      {
        label: "Chạy Write ở Internal On-Chip",
        run: () => {
          if (simState.driverStatus === "MEMIF_BUSY") api_Eep_Cancel("Test");
          ecucConfig.EepHardwareInterfaceType = "INTERNAL_ONCHIP_EEPROM";
          api_Eep_Write(0x0060, [1, 2, 3, 4, 5, 6, 7, 8], "Ea");
          runActiveJobToCompletion(4);
        }
      },
      {
        label: "Chạy Write ở External SPI EEPROM",
        run: () => {
          if (simState.driverStatus === "MEMIF_BUSY") api_Eep_Cancel("Test");
          ecucConfig.EepHardwareInterfaceType = "EXTERNAL_SPI_EEPROM";
          api_Eep_Write(0x0070, [9, 8, 7, 6, 5, 4, 3, 2], "Ea");
          runActiveJobToCompletion(4);
        }
      },
      {
        label: "Đổi EepSpiSequenceId = 2 & Đọc SPI",
        run: () => {
          if (simState.driverStatus === "MEMIF_BUSY") api_Eep_Cancel("Test");
          ecucConfig.EepHardwareInterfaceType = "EXTERNAL_SPI_EEPROM";
          ecucConfig.EepSpiSequenceId = 2;
          api_Eep_Read(0x0070, 16, "Ea");
          runActiveJobToCompletion(4);
        }
      }
    ]
  },

  {
    id: "S10",
    group: "Nhóm 3: Giao Tiếp External SPI EEPROM, Luồng Liên Tầng & Cancel",
    title: "S10: Luồng Liên Tầng End-to-End: SWC → RTE → NvM → MemIf → Ea → 3x Eep_Write",
    shortDesc: "Hành trình đầy đủ từ SWC xuống tới silicon EEPROM: Ea tách 1 lệnh Ea_Write thành 3 Sub-Jobs Header -> Payload -> Footer.",
    setup: () => {
      resetSimState(false);
      api_Eep_Init(true);
      simState.traceLogs = [];
      simState.lastApiCodeKey = "Eep_Write";
    },
    steps: [
      {
        title: "Bước 1: SWC -> RTE -> NvM -> MemIf -> Ea & Sub-Job 1 (Ea Header 4B)",
        explain: "<b>Input:</b> <code>SWC_App</code> gọi <code>Rte_Call_NvMService_Blk4_WriteBlock()</code> -> NvM ánh xạ Block 4 -> <code>MemIf_Write(0, 4)</code> -> <code>Ea</code>.<br><b>Xử lý:</b> <b>Ea</b> là lớp trực tiếp sinh ra cấu trúc quản lý: gọi <code>Eep_Write(0x0050, Header=[A5, 04, 00, 01], 4B)</code> để đánh dấu đang ghi.<br><b>Output:</b> Toàn bộ chuỗi mũi tên dọc 6 tầng sáng lên; ghi xong 4B Header <code>0x0050..0x0053</code>.",
        apply: () => {
          simState.eaSubJobState = "EA_SUB_HDR";
          addTrace({ layer: "APP->BSW", caller: "SWC_App", callee: "RTE->NvM->MemIf->Ea", api: "NvM_WriteBlock(Blk4, OdoRamPtr)", params: "Logical Blk#4 -> Phys 0x0050 (16B)", ret: "E_OK", result: "MEMIF_JOB_PENDING", tone: "cyan", note: "SWC khong biet dia chi vat ly; Ea chiu trach nhiem map & tao Header/Footer." });
          api_Eep_Write(0x0050, [0xA5, 0x04, 0x00, 0x01], "STACK", { eaSubPhase: "EA_SUB_HDR", eaBlockNum: 4 });
          runActiveJobToCompletion(4);
          simState.selectedModuleId = "MOD_EA";
        }
      },
      {
        title: "Bước 2: Ea Sub-Job 2 -> Ghi 8B Payload Odometer @ 0x0054..0x005B",
        explain: "<b>Input:</b> Callback <code>Ea_JobEndNotification()</code> từ Sub-Job 1 kích hoạt máy trạng thái của Ea chuyển sang Sub-Job 2.<br><b>Xử lý:</b> Ea gọi <code>Eep_Write(0x0054, OdoData[8B], 8)</code>.<br><b>Output:</b> Ghi &amp; Verify 8 bytes Payload dữ liệu Odometer vào phần thân Block.",
        apply: () => {
          simState.eaSubJobState = "EA_SUB_DATA";
          api_Eep_Write(0x0054, [0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE, 0xF0], "STACK", { eaSubPhase: "EA_SUB_DATA", eaBlockNum: 4 });
          runActiveJobToCompletion(4);
        }
      },
      {
        title: "Bước 3: Ea Sub-Job 3 (Footer Valid 0x5A) -> Thông báo ngược lên SWC",
        explain: "<b>Input:</b> Payload ghi xong -> Ea khóa đuôi hợp lệ bằng Sub-Job 3.<br><b>Xử lý:</b> Ea gọi <code>Eep_Write(0x005C, Footer=[5A, EC, CA, FE], 4)</code>. Khi xong, Eep báo <code>Ea_JobEndNotification()</code> -> Ea báo <code>NvM_JobEndNotification()</code> -> RTE báo <code>Rte_Call_NvMNotifyJobFinished()</code>.<br><b>Output:</b> Khối Blk#4 hoàn thiện trọn vẹn từ <code>0x0050..0x005F</code>!",
        apply: () => {
          simState.eaSubJobState = "EA_SUB_FTR";
          api_Eep_Write(0x005C, [0x5A, 0xEC, 0xCA, 0xFE], "STACK", { eaSubPhase: "EA_SUB_FTR", eaBlockNum: 4 });
          runActiveJobToCompletion(4);
          addTrace({ layer: "CBK->APP", caller: "Ea->NvM->RTE", callee: "SWC_App", api: "Rte_Call_NvMNotifyJobFinished(WRITE, NVM_REQ_OK)", params: "Ea 3 Sub-Jobs Completed", ret: "void", result: "MEMIF_JOB_OK", tone: "ok", note: "SWC nhan xac nhan luu Odometer an toan vao EEPROM." });
          simState.selectedModuleId = "MOD_SWC";
        }
      }
    ],
    whatIfs: [
      {
        label: "Chạy trọn vẹn 3 Sub-Jobs Ea",
        run: () => {
          if (simState.driverStatus === "MEMIF_BUSY") api_Eep_Cancel("Test");
          simState.eaSubJobState = "EA_SUB_HDR";
          api_Eep_Write(0x0050, [0xA5, 0x04, 0x00, 0x01], "STACK", { eaSubPhase: "EA_SUB_HDR" });
          runActiveJobToCompletion(4);
          simState.eaSubJobState = "EA_SUB_DATA";
          api_Eep_Write(0x0054, [0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88], "STACK", { eaSubPhase: "EA_SUB_DATA" });
          runActiveJobToCompletion(4);
          simState.eaSubJobState = "EA_SUB_FTR";
          api_Eep_Write(0x005C, [0x5A, 0xEC, 0xCA, 0xFE], "STACK", { eaSubPhase: "EA_SUB_FTR" });
          runActiveJobToCompletion(4);
        }
      },
      {
        label: "Mô phỏng EcuM -> NvM_ReadAll (FAST Mode)",
        run: () => {
          if (simState.driverStatus === "MEMIF_BUSY") api_Eep_Cancel("Test");
          api_Eep_SetMode("MEMIF_MODE_FAST", "STACK");
          api_Eep_Read(0x0050, 16, "STACK");
          stepClockTick(5);
          api_Eep_SetMode("MEMIF_MODE_SLOW", "STACK");
        }
      },
      {
        label: "Gài Stuck Bit ở Data Sub-Job -> Rollback Error",
        run: () => {
          if (simState.driverStatus === "MEMIF_BUSY") api_Eep_Cancel("Test");
          simState.stuckBits[0x0056] = { forcedVal: 0x00, reason: "Data Sub-Job Stuck" };
          api_Eep_Write(0x0054, [0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE, 0xF0], "STACK", { eaSubPhase: "EA_SUB_DATA" });
          runActiveJobToCompletion(4);
          simState.eaSubJobState = "EA_ERR";
        }
      }
    ]
  },

  {
    id: "S11",
    group: "Nhóm 3: Giao Tiếp External SPI EEPROM, Luồng Liên Tầng & Cancel",
    title: "S11: Hủy Lệnh Bằng Eep_Cancel() → MEMIF_JOB_CANCELED & Bảo Vệ WIP_HW_BUSY",
    shortDesc: "Hủy ngay Job nền 32B đang pending để nhường EEPROM ghi khẩn cấp Crash Event Data qua Eep_Cancel().",
    setup: () => {
      resetSimState(false);
      api_Eep_Init(true);
      simState.traceLogs = [];
      simState.lastApiCodeKey = "Eep_Cancel";
    },
    steps: [
      {
        title: "Bước 1: Đang chạy Job nền 32B @ 0x0030 (Chạy xong Chunk 1 = 8B)",
        explain: "<b>Input:</b> Ea đang ghi dữ liệu thống kê thông thường 32B tại <code>0x0030..0x004F</code> (4 Chunks x 8B). Tick #1 vừa xong 8B đầu, còn 24B đang <code>MEMIF_JOB_PENDING</code>.<br><b>Xử lý:</b> Cảm biến va chạm kích hoạt yêu cầu ghi khẩn cấp Immediate Crash Block.<br><b>Output:</b> Driver đang bận (<code>EEP_BUSY=1</code>).",
        apply: () => {
          api_Eep_Write(0x0030, Array.from({ length: 32 }, (_, i) => 0x10 + i), "Ea");
          stepClockTick(5);
        }
      },
      {
        title: "Bước 2: NvM/Ea gọi Eep_Cancel() để cắt ngang Job nền",
        explain: "<b>Input:</b> <code>Ea</code> gọi hàm đồng bộ <code>Eep_Cancel()</code>.<br><b>Xử lý:</b> Theo <b>[SWS_Eep_00031]</b>, Eep lập tức hủy 24B còn lại trong hàng đợi, reset con trỏ Job, chuyển <code>MEMIF_BUSY -> MEMIF_IDLE</code> và gán <code>JobResult = MEMIF_JOB_CANCELED</code>.<br><b>Output:</b> Bit 2 Thanh A <code>CANCELED=1</code> (0x04) bật sáng; gọi <code>Ea_JobErrorNotification()</code> để giải phóng NvM Queue.",
        apply: () => {
          api_Eep_Cancel("Ea");
        }
      },
      {
        title: "Bước 3: Ghi khẩn cấp Crash Data 8B vào vùng Immediate 0x0050",
        explain: "<b>Input:</b> Driver đã <code>MEMIF_IDLE</code> -> Ea nạp ngay 8B dữ liệu tai nạn <code>[DE, AD, BA, BE...]</code> vào <code>0x0050</code>.<br><b>Xử lý:</b> <code>Eep_Write(0x0050, CrashBytes, 8)</code> thành công tức thì và xong trong 1 Tick.<br><b>Output:</b> Dữ liệu tai nạn được bảo toàn trước khi ECU mất nguồn!",
        apply: () => {
          api_Eep_Write(0x0050, [0xDE, 0xAD, 0xBA, 0xBE, 0xFA, 0x11, 0x99, 0x01], "STACK");
          stepClockTick(5);
        }
      }
    ],
    whatIfs: [
      {
        label: "Hủy ở Tick 1 & Ghi Crash @ 0x0050",
        run: () => {
          if (simState.driverStatus === "MEMIF_BUSY") api_Eep_Cancel("Test");
          api_Eep_Write(0x0030, Array.from({ length: 32 }, (_, i) => 0x20 + i), "Ea");
          stepClockTick(5);
          api_Eep_Cancel("Ea");
          api_Eep_Write(0x0050, [0xCA, 0xFE, 0xBA, 0xBE, 0x00, 0x01, 0x02, 0x03], "STACK");
          stepClockTick(5);
        }
      },
      {
        label: "Gọi Eep_Cancel khi đang IDLE",
        run: () => {
          if (simState.driverStatus === "MEMIF_BUSY") api_Eep_Cancel("Test");
          api_Eep_Cancel("Ea");
        }
      },
      {
        label: "Gọi Eep_Cancel khi UNINIT -> DET 0x00",
        run: () => {
          ecucConfig.EepInitialized = false;
          simState.driverStatus = "MEMIF_UNINIT";
          simState.driverSmState = "UNINIT";
          updateDerivedRegisters();
          api_Eep_Cancel("Ea");
        }
      }
    ]
  },

  // -------------------- GROUP 4: HARDWARE ERRORS, TIMEOUT & DET BARRIER (S12-S14) --------------------
  {
    id: "S12",
    group: "Nhóm 4: Lỗi Phần Cứng (Dem), Timeout & Kiểm Thử DET",
    title: "S12: Verify Thất Bại Do Stuck Bit → Dem (EEP_E_WRITE_FAILED) & MEMIF_JOB_FAILED",
    shortDesc: "Phát hiện ô nhớ Stuck Bit @ 0x0015 khi Write Verify -> báo EEP_E_WRITE_FAILED sang Dem, sau đó tự chữa lành (PASSED).",
    setup: () => {
      resetSimState(false);
      api_Eep_Init(true);
      ecucConfig.EnableWriteVerification = true;
      ecucConfig.EepDemErrorReportingEnabled = true;
      simState.stuckBits[0x0015] = { forcedVal: 0x00, reason: "Cell Stuck at 0x00" };
      simState.eepromMemory[0x0015] = 0x00;
      simState.traceLogs = [];
      simState.lastApiCodeKey = "Eep_Write";
    },
    steps: [
      {
        title: "Bước 1: Gửi lệnh Eep_Write(0x0010, 16B) vào vùng có ô nhớ chết 0x0015",
        explain: "<b>Input:</b> Ô nhớ <code>0x0015</code> bị kẹt cứng (Stuck Bit = <code>0x00</code>). Thực hiện ghi <code>[11..1F]</code> qua <code>Eep_Write(0x0010, 16B)</code>.<br><b>Xử lý:</b> Chunk 1 (<code>0x0010..0x0017</code>) chứa địa chỉ lỗi <code>0x0015</code>.<br><b>Output:</b> Xếp hàng ghi và chuẩn bị bật <code>EnableWriteVerification</code>.",
        apply: () => {
          api_Eep_Write(0x0010, Array.from({ length: 16 }, (_, i) => 0x11 + i), "Ea");
        }
      },
      {
        title: "Bước 2: Write Verify thất bại -> Dem EEP_E_WRITE_FAILED = FAILED",
        explain: "<b>Input:</b> <code>Eep_MainFunction()</code> ghi xong Chunk 1 rồi đọc lại kiểm chứng (Verify).<br><b>Xử lý:</b> Phát hiện <code>EEPROM[0x0015] = 0x00 != RAM 0x16</code>! Driver lập tức báo <code>Dem_SetEventStatus(EEP_E_WRITE_FAILED, FAILED)</code>, hủy nốt Chunk 2 và báo <code>Ea_JobErrorNotification()</code>.<br><b>Output:</b> Bit 1 Thanh B <code>DEM_HW_ERR_FLAG=1</code>, Bit 3 Thanh A <code>ERR_INC=1</code>, kết quả <code>MEMIF_JOB_FAILED</code>.",
        apply: () => {
          stepClockTick(5);
          simState.selectedModuleId = "MOD_DET";
        }
      },
      {
        title: "Bước 3: Khắc phục ô nhớ & Ghi lại -> DEM tự phục hồi (PASSED)",
        explain: "<b>Input:</b> Gỡ Stuck Bit rồi thực hiện <code>Eep_Write(0x0010, 16B)</code> lại.<br><b>Xử lý:</b> Lần này Write Verify khớp 100% toàn bộ 16B -> Eep gọi <code>Dem_SetEventStatus(EEP_E_WRITE_FAILED, DEM_EVENT_STATUS_PASSED)</code> để xóa DTC.<br><b>Output:</b> <code>DEM_HW_ERR_FLAG</code> tắt về 0, trả <code>MEMIF_JOB_OK</code>.",
        apply: () => {
          delete simState.stuckBits[0x0015];
          api_Eep_Write(0x0010, Array.from({ length: 16 }, (_, i) => 0x11 + i), "Ea");
          runActiveJobToCompletion(6);
        }
      }
    ],
    whatIfs: [
      {
        label: "Gài Stuck Bit @ 0x0015 & Ghi (FAILED)",
        run: () => {
          if (simState.driverStatus === "MEMIF_BUSY") api_Eep_Cancel("Test");
          simState.stuckBits[0x0015] = { forcedVal: 0x00, reason: "Cell Stuck" };
          api_Eep_Write(0x0010, Array.from({ length: 16 }, (_, i) => 0x22 + i), "Ea");
          runActiveJobToCompletion(6);
        }
      },
      {
        label: "Gỡ Stuck Bit & Ghi Lại -> DEM PASSED",
        run: () => {
          if (simState.driverStatus === "MEMIF_BUSY") api_Eep_Cancel("Test");
          delete simState.stuckBits[0x0015];
          api_Eep_Write(0x0010, Array.from({ length: 16 }, (_, i) => 0x22 + i), "Ea");
          runActiveJobToCompletion(6);
        }
      },
      {
        label: "Tắt EepDemErrorReporting & Gây Lỗi",
        run: () => {
          if (simState.driverStatus === "MEMIF_BUSY") api_Eep_Cancel("Test");
          ecucConfig.EepDemErrorReportingEnabled = false;
          simState.stuckBits[0x0015] = { forcedVal: 0x00, reason: "Cell Stuck" };
          api_Eep_Write(0x0010, Array.from({ length: 16 }, (_, i) => 0x22 + i), "Ea");
          runActiveJobToCompletion(6);
        }
      }
    ]
  },

  {
    id: "S13",
    group: "Nhóm 4: Lỗi Phần Cứng (Dem), Timeout & Kiểm Thử DET",
    title: "S13: Giám Sát Treo WIP_HW_BUSY → Det_ReportRuntimeError(EEP_E_TIMEOUT = 0x05)",
    shortDesc: "Thanh ghi phần cứng / RDSR kẹt WIP=1 vượt 3 chu kỳ MainFunction -> Det_ReportRuntimeError(EEP_E_TIMEOUT) bất kể DET bật hay tắt.",
    setup: () => {
      resetSimState(false);
      ecucConfig.InjectHwTimeoutStuckBusy = true;
      api_Eep_Init(true);
      simState.traceLogs = [];
      simState.lastApiCodeKey = "Eep_MainFunction";
    },
    steps: [
      {
        title: "Bước 1: Ghi 8B trong khi phần cứng bị kẹt cờ WIP = 1",
        explain: "<b>Input:</b> Bật <code>InjectHwTimeoutStuckBusy = TRUE</code> (mô phỏng chip EEPROM hỏng mạch bơm điện áp hoặc đứt dây MISO SPI). Gọi <code>Eep_Write(0x0060, 8B)</code>.<br><b>Xử lý:</b> Eep phát lệnh ghi và chờ cờ WIP hạ.<br><b>Output:</b> Driver vào trạng thái <code>MEMIF_BUSY</code>, Thanh B giữ <code>WIP_BSY = 1</code>.",
        apply: () => {
          api_Eep_Write(0x0060, [0xAA, 0xBB, 0xCC, 0xDD, 0x11, 0x22, 0x33, 0x44], "Ea");
        }
      },
      {
        title: "Bước 2: Tick #1 & #2 -> Eep_MainFunction thăm dò WIP vẫn = 1 (2/3)",
        explain: "<b>Input:</b> Chạy 2 nhịp <code>Eep_MainFunction()</code>.<br><b>Xử lý:</b> Đọc thanh ghi trạng thái RDSR (0x05) thấy bit WIP vẫn giữ nguyên mức 1 -> bộ đếm giám sát timeout tăng từ 1/3 lên 2/3.<br><b>Output:</b> Driver vẫn kiên nhẫn chờ thêm 1 nhịp nữa.",
        apply: () => {
          stepClockTick(5);
          stepClockTick(5);
        }
      },
      {
        title: "Bước 3: Tick #3 -> Quá ngưỡng 3 ticks -> EEP_E_TIMEOUT (0x05)!",
        explain: "<b>Input:</b> Nhịp thứ 3 cờ WIP vẫn không hạ!<br><b>Xử lý:</b> Eep phát lỗi Runtime <code>Det_ReportRuntimeError(90, 0, 0x09, EEP_E_TIMEOUT = 0x05)</code> (luôn bật ở R20-11+ dù <code>EepDevErrorDetect = FALSE</code>), đưa Driver về <code>MEMIF_IDLE</code>, <code>MEMIF_JOB_FAILED</code> và gọi <code>Ea_JobErrorNotification()</code>.<br><b>Output:</b> Bit 0 Thanh B <code>HW_TIMEOUT_ERR = 1</code> sáng đỏ.",
        apply: () => {
          stepClockTick(5);
          simState.selectedModuleId = "MOD_DET";
        }
      }
    ],
    whatIfs: [
      {
        label: "Tắt DET Dev & Chạy Timeout (Vẫn báo Runtime!)",
        run: () => {
          if (simState.driverStatus === "MEMIF_BUSY") api_Eep_Cancel("Test");
          ecucConfig.EepDevErrorDetect = false;
          ecucConfig.InjectHwTimeoutStuckBusy = true;
          api_Eep_Write(0x0060, [1, 2, 3, 4, 5, 6, 7, 8], "Ea");
          runActiveJobToCompletion(5);
        }
      },
      {
        label: "Gỡ kẹt WIP & Phục hồi Ghi thành công",
        run: () => {
          if (simState.driverStatus === "MEMIF_BUSY") api_Eep_Cancel("Test");
          ecucConfig.InjectHwTimeoutStuckBusy = false;
          api_Eep_Write(0x0060, [1, 2, 3, 4, 5, 6, 7, 8], "Ea");
          runActiveJobToCompletion(5);
        }
      },
      {
        label: "Chạy Timeout trong lệnh Eep_Erase()",
        run: () => {
          if (simState.driverStatus === "MEMIF_BUSY") api_Eep_Cancel("Test");
          ecucConfig.InjectHwTimeoutStuckBusy = true;
          api_Eep_Erase(0x0060, 8, "Ea");
          runActiveJobToCompletion(5);
        }
      }
    ]
  },

  {
    id: "S14",
    group: "Nhóm 4: Lỗi Phần Cứng (Dem), Timeout & Kiểm Thử DET",
    title: "S14: Kiểm Thử Toàn Diện DET (0x00..0x0A) & Runtime Error EEP_E_BUSY (0x04)",
    shortDesc: "Kiểm thử toàn bộ mã lỗi bảo vệ của AUTOSAR Eep: UNINIT (0x00), INVALID_ADDRESS (0x01), DATA (0x02), LENGTH (0x03), BUSY (0x04), INIT (0x09), POINTER (0x0A).",
    setup: () => {
      resetSimState(false);
      ecucConfig.EepDevErrorDetect = true;
      api_Eep_Init(true);
      simState.traceLogs = [];
      simState.lastApiCodeKey = "Eep_Write";
    },
    steps: [
      {
        title: "Bước 1: Vượt biên Địa chỉ & Độ dài (0x01 INVALID_ADDRESS / 0x03 LENGTH)",
        explain: "<b>Input:</b> <code>EepSize = 256B</code>. Thử gọi <code>Eep_Read(0x0110, 16)</code> (vượt biên 256) và <code>Eep_Write(0x0000, Len=0)</code>.<br><b>Xử lý:</b> Bộ kiểm tra DET chặn đứng ngay trước khi chạm vào phần cứng.<br><b>Output:</b> Ghi nhận <code>EEP_E_INVALID_ADDRESS (0x01)</code> &amp; <code>EEP_E_INVALID_LENGTH (0x03)</code>.",
        apply: () => {
          api_Eep_Read(0x0110, 16, "Ea");
          api_Eep_Write(0x0000, [], "Ea", { length: 0 });
          simState.selectedModuleId = "MOD_DET";
        }
      },
      {
        title: "Bước 2: Con trỏ NULL_PTR (0x02 INVALID_DATA & 0x0A PARAM_POINTER)",
        explain: "<b>Input:</b> Truyền <code>DataBufferPtr == NULL_PTR</code> vào <code>Eep_Read</code> và <code>NULL_PTR</code> vào <code>Eep_GetVersionInfo</code>.<br><b>Xử lý:</b> Ngăn chặn lỗi truy xuất vùng nhớ 0x0 (HardFault).<br><b>Output:</b> Ghi nhận <code>EEP_E_INVALID_DATA (0x02)</code> và <code>EEP_E_PARAM_POINTER (0x0A)</code>.",
        apply: () => {
          api_Eep_Read(0x0000, 16, "Ea", { ptrValid: false });
          api_Eep_GetVersionInfo(false);
        }
      },
      {
        title: "Bước 3: Chen ngang khi đang bận (Runtime Error EEP_E_BUSY = 0x04)",
        explain: "<b>Input:</b> Kích hoạt một Job ghi 16B (đang <code>MEMIF_BUSY</code>) rồi gọi chồng thêm lệnh <code>Eep_Read(0x0020, 8)</code>.<br><b>Xử lý:</b> <b>Eep KHÔNG có hàng đợi nội bộ</b> (khác NvM)! Khi đang <code>MEMIF_BUSY</code>, mọi lệnh Read/Write/Erase/Compare mới đều bị từ chối bằng <code>Det_ReportRuntimeError(EEP_E_BUSY = 0x04)</code>, trong khi Job cũ vẫn chạy an toàn.<br><b>Output:</b> Hoàn tất Job cũ không bị ghi đè dữ liệu.",
        apply: () => {
          api_Eep_Write(0x0000, Array.from({ length: 16 }, (_, i) => 0x70 + i), "Ea");
          api_Eep_Read(0x0020, 8, "Ea");
          runActiveJobToCompletion(4);
        }
      }
    ],
    whatIfs: [
      {
        label: "Lệch Unit Alignment (Addr=0x03, Unit=4B)",
        run: () => {
          if (simState.driverStatus === "MEMIF_BUSY") api_Eep_Cancel("Test");
          ecucConfig.EepWriteUnitSize = 4;
          api_Eep_Write(0x0003, [1, 2, 3, 4], "Ea");
        }
      },
      {
        label: "Tắt EepDevErrorDetect & Gọi Sai (Bỏ qua DET)",
        run: () => {
          if (simState.driverStatus === "MEMIF_BUSY") api_Eep_Cancel("Test");
          ecucConfig.EepDevErrorDetect = false;
          api_Eep_Read(0x0110, 16, "Ea");
        }
      },
      {
        label: "Test chen ngang BUSY (Runtime 0x04)",
        run: () => {
          if (simState.driverStatus === "MEMIF_BUSY") api_Eep_Cancel("Test");
          api_Eep_Write(0x0000, Array.from({ length: 16 }, () => 0x55), "Ea");
          api_Eep_Erase(0x0020, 8, "Ea");
        }
      }
    ]
  }
];
