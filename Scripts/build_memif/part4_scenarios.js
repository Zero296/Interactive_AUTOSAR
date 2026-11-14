// ================= PART 4B: 12 PRE-BUILT SCENARIOS (S1-S12) & 36 WHAT-IF ACTIONS =================

function resetConfigToBase(overrides) {
  ecucConfig = Object.assign(JSON.parse(JSON.stringify(defaultConfig)), overrides || {});
  simState = createInitialSimState();
  syncInitFlagsToDevices();
}

const SCENARIOS = [
  // -------------------- NHÓM 1: ĐỊNH TUYẾN ĐA THIẾT BỊ & MACRO VS FCTPTR --------------------
  {
    id: "S1",
    group: "Nhóm 1: Định Tuyến Đa Thiết Bị & Macro vs FctPtr",
    title: "S1: Đọc & Ghi Chuẩn Qua DeviceIndex=0 (SWC → RTE → NvM → MemIf → Fee → Fls)",
    summary: "Luồng chuẩn qua nhánh Data Flash nội bộ (DeviceIndex = 0): SWC_App gọi qua RTE → NvM ánh xạ BlockId=4 thành (DevIdx=0, Blk=0x0004) → MemIf_Write/Read định tuyến qua MemIf_*FctPtr[0] xuống Fee/Fls → cấp phát Virtual Page mới và gọi thẳng NvM_JobEndNotification().",
    setup: () => {
      resetConfigToBase({ MemIfNumberOfDevices: "2", ActiveMemIfMode: "MEMIF_MODE_SLOW", SelectedDeviceIndex: "0", SelectedLogicalBlock: "0x0004" });
      simState.apiTrace = [];
      addTrace("Scenario S1 Ready", "Khởi tạo 2 thiết bị (Dev0: Fee/Fls, Dev1: Ea/Eep) ở chế độ MEMIF_MODE_SLOW (8B/tick).", "info");
    },
    steps: [
      {
        title: "Pha 1 — SWC → RTE → NvM → MemIf_Write(0, 0x0004, Ptr)",
        desc: "NvM tra NvMBlockDescriptor thấy Block 0x0004 nằm trên Dev0 (Fee). MemIf kiểm tra DET rồi định tuyến qua MemIf_WriteFctPtr[0] xuống Fee_Write(0x0004). Bit 7 Thanh B (FEE0_BUSY=1) & JobResult=001b (PENDING).",
        exec: () => {
          api_MemIf_Write(0, "0x0004", "DE AD BE EF 20 26 AA 55", false);
        }
      },
      {
        title: "Pha 2 — Nhịp Fee_MainFunction() & Fls_MainFunction() Đang Ghi (8B/32B -> 24B/32B)",
        desc: "Vì đang ở MEMIF_MODE_SLOW (8B/tick), Fls lập trình từng chùm 8 byte lên Virtual Page mới (Wear-Leveling). Chạy 3 nhịp Tick để đạt 24/32 bytes.",
        exec: () => {
          api_FeeFls_MainFunction();
          api_FeeFls_MainFunction();
          api_FeeFls_MainFunction();
        }
      },
      {
        title: "Pha 3 — Hoàn Tất Ghi Flash & Callback Trực Tiếp Fee ➔ NvM_JobEndNotification()",
        desc: "Nhịp Tick thứ 4 hoàn tất 32/32 bytes! Fee đánh dấu VP cũ là SUPERSEDED, VP mới là VALID, hạ FEE0_BUSY=0 và gọi thẳng NvM_JobEndNotification() (bỏ qua MemIf!).",
        exec: () => {
          api_FeeFls_MainFunction();
        }
      },
      {
        title: "Pha 4 — Gọi MemIf_Read(0, 0x0004, 0, DstPtr, 32) Đọc Lại Kiểm Chứng",
        desc: "NvM đọc lại Block 0x0004 qua MemIf_Read(0, ...) và hoàn tất ở chế độ FAST hoặc qua các nhịp Fee/Fls_MainFunction() → MEMIF_JOB_OK (000b).",
        exec: () => {
          api_MemIf_Read(0, "0x0004", 0, 32, false);
          api_FeeFls_MainFunction();
          api_FeeFls_MainFunction();
          api_FeeFls_MainFunction();
          api_FeeFls_MainFunction();
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Đổi ActiveMemIfMode sang MEMIF_MODE_FAST (32B/tick -> xong trong 1 tick!)",
        run: () => {
          api_MemIf_SetMode("MEMIF_MODE_FAST");
          api_MemIf_Write(0, "0x0004", "FA 57 B0 05 20 26 99 88", false);
          api_FeeFls_MainFunction();
        }
      },
      {
        label: "🧪 Bật NvMPollingMode = TRUE (NvM gọi MemIf_GetStatus & GetJobResult)",
        run: () => {
          ecucConfig.NvMPollingMode = true;
          api_MemIf_Read(0, "0x0004", 0, 32, false);
          api_FeeFls_MainFunction();
          api_NvM_MainFunction();
        }
      },
      {
        label: "🧪 Đổi Offset = 8, Length = 16 để đọc một phần Block qua MemIf_Read",
        run: () => {
          ecucConfig.MemIfReadBlockOffset = 8;
          ecucConfig.MemIfReadLength = 16;
          api_MemIf_Read(0, "0x0004", 8, 16, false);
        }
      }
    ]
  },

  {
    id: "S2",
    group: "Nhóm 1: Định Tuyến Đa Thiết Bị & Macro vs FctPtr",
    title: "S2: Đọc & Ghi Qua DeviceIndex=1 (SWC → RTE → NvM → MemIf → Ea → Eep EEPROM)",
    summary: "Chứng minh tính độc lập phần cứng của NvM nhờ MemIf: chỉ bằng việc truyền DeviceIndex=1, MemIf tự động rẽ nhánh sang Ea (EEPROM Abstraction) và Eep/SPI Driver để ghi Odometer (Block 0x0010) lên chip EEPROM ngoại vi trong khi Fee (Dev0) vẫn rảnh rỗi!",
    setup: () => {
      resetConfigToBase({ MemIfNumberOfDevices: "2", SelectedDeviceIndex: "1", SelectedLogicalBlock: "0x0010" });
      simState.selectedDeviceCard = 1;
      simState.apiTrace = [];
      addTrace("Scenario S2 Ready", "Chọn đích DeviceIndex = 1 (Ea ➔ Eep SPI EEPROM), Block 0x0010 (NvM_OdometerEep 16B).", "info");
    },
    steps: [
      {
        title: "Pha 1 — NvM gọi MemIf_Write(1, 0x0010, &OdometerData)",
        desc: "MemIf bật Bit 6 Thanh A (ACTV_DEV_1 = 1), kiểm tra 1 < 2 rồi tra MemIf_WriteFctPtr[1] gọi xuống Ea_Write(0x0010). Bật Bit 5 Thanh B (EA1_BUSY = 1) trong khi Bit 7 (FEE0_BUSY = 0).",
        exec: () => {
          api_MemIf_Write(1, "0x0010", "00 01 86 A0 4B 4D 20 26", false);
        }
      },
      {
        title: "Pha 2 — Ea ánh xạ Offset 0x0180 & Eep truyền SPI (Tick #1: 8/16B)",
        desc: "Ea quy đổi Block 0x0010 sang địa chỉ vật lý cố định 0x0180 trên chip EEPROM (không cần Wear-Leveling như Flash) và đẩy qua Spi_AsyncTransmit().",
        exec: () => {
          api_EaEep_MainFunction();
        }
      },
      {
        title: "Pha 3 — Hoàn Tất Ghi EEPROM (Tick #2: 16/16B) & Callback Ea ➔ NvM",
        desc: "Eep báo Ea_JobEndNotification() → Ea cập nhật Slot 0x0180 thành VALID, hạ EA1_BUSY=0, đặt MEMIF_JOB_OK và gọi thẳng NvM_JobEndNotification().",
        exec: () => {
          api_EaEep_MainFunction();
        }
      },
      {
        title: "Pha 4 — Đọc lại Odometer bằng MemIf_Read(1, 0x0010, 0, DstPtr, 16)",
        desc: "Thực thi đọc lại 16 bytes từ EEPROM ngoài qua DevIdx=1 và hoàn tất sau 2 nhịp Ea/Eep_MainFunction().",
        exec: () => {
          api_MemIf_Read(1, "0x0010", 0, 16, false);
          api_EaEep_MainFunction();
          api_EaEep_MainFunction();
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Khi Ea (Dev 1) đang BUSY, gọi MemIf_GetStatus(0) cho Fee",
        run: () => {
          api_MemIf_Write(1, "0x0010", "11 22 33 44 55 66 77 88", false);
          api_MemIf_GetStatus(0);
        }
      },
      {
        label: "🧪 Khi Ea (Dev 1) đang BUSY, gọi MemIf_GetStatus(0xFF Broadcast)",
        run: () => {
          api_MemIf_Write(1, "0x0010", "11 22 33 44 55 66 77 88", false);
          api_MemIf_GetStatus(255);
        }
      },
      {
        label: "🧪 Đọc Block 0x0020 (NvM_ImmoKeyEep 32B) trên EEPROM",
        run: () => {
          ecucConfig.SelectedLogicalBlock = "0x0020";
          api_MemIf_Read(1, "0x0020", 0, 32, false);
        }
      }
    ]
  },

  {
    id: "S3",
    group: "Nhóm 1: Định Tuyến Đa Thiết Bị & Macro vs FctPtr",
    title: "S3: So Sánh Macro 1-Device (#define Zero Overhead) vs Function Pointer Array (2 Devices)",
    summary: "Minh họa hai yêu cầu kiến trúc cốt lõi SWS_MemIf_00019 và SWS_MemIf_00020: Khi MemIfNumberOfDevices==1, MemIf tự biến thành Macro #define trong MemIf_Cfg.h loại bỏ hoàn toàn DeviceIndex; khi >=2, MemIf tạo mảng con trỏ hàm trong MemIf_Cfg.c kèm kiểm tra DET.",
    setup: () => {
      resetConfigToBase({ MemIfNumberOfDevices: "1", SelectedDeviceIndex: "0", SelectedLogicalBlock: "0x0004" });
      simState.apiTrace = [];
      addTrace("Scenario S3 Ready", "Khởi tạo chế độ 1 Device (#define Macro Mode — SWS_MemIf_00019). Bit 7 FCT_PTR_MOD = 0.", "info");
    },
    steps: [
      {
        title: "Pha 1 — Chế độ 1 Device: #define Macro Expansion (Bit 7 = 0)",
        desc: "Gọi MemIf_Read(0, 0x0004, ...): Tiền xử lý C thay thẳng thành Fee_Read(0x0004, ...), không tốn mảng bảng hàm, 0 chu kỳ nhảy gián tiếp!",
        exec: () => {
          ecucConfig.MemIfNumberOfDevices = "1";
          api_MemIf_Read(0, "0x0004", 0, 32, false);
          api_FeeFls_MainFunction();
          api_FeeFls_MainFunction();
          api_FeeFls_MainFunction();
          api_FeeFls_MainFunction();
        }
      },
      {
        title: "Pha 2 — Bẫy thú vị ở Macro Mode: Truyền DeviceIndex=1 hoặc 99 vẫn gọi Fee!",
        desc: "Vì Macro #define bỏ qua tham số DeviceIndex ngay lúc biên dịch, nếu gọi MemIf_Read(1, ...) khi MemIfNumberOfDevices==1, tham số 1 bị vứt bỏ và lệnh vẫn chạy vào Fee_Read()!",
        exec: () => {
          api_MemIf_Read(1, "0x0004", 0, 16, false);
        }
      },
      {
        title: "Pha 3 — Chuyển sang 2 Devices: Const Function Pointer Array (Bit 7 = 1)",
        desc: "Nâng MemIfNumberOfDevices = 2: Bật Bit 7 (FCT_PTR_MOD = 1). MemIf tạo mảng MemIf_*FctPtr[2] = {&Fee_*, &Ea_*}, kích hoạt kiểm tra DET cho DeviceIndex.",
        exec: () => {
          ecucConfig.MemIfNumberOfDevices = "2";
          api_MemIf_Write(1, "0x0010", "AA BB CC DD 01 02 03 04", false);
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Gạt nhanh sang 1 Device (Macro #define) & xem Tab Code C",
        run: () => {
          ecucConfig.MemIfNumberOfDevices = "1";
          api_MemIf_Read(0, "0x0004", 0, 32, false);
        }
      },
      {
        label: "🧪 Gạt nhanh sang 2 Devices (FctPtr Array) & gọi Dev 1 (Ea)",
        run: () => {
          ecucConfig.MemIfNumberOfDevices = "2";
          api_MemIf_Read(1, "0x0010", 0, 16, false);
        }
      },
      {
        label: "🧪 So sánh truyền DeviceIndex=99 ở Macro (Pass) vs FctPtr (DET 0x01!)",
        run: () => {
          ecucConfig.MemIfNumberOfDevices = "2";
          api_MemIf_Read(99, "0x0004", 0, 16, false);
        }
      }
    ]
  },

  // -------------------- NHÓM 2: BLOCK KHẨN CẤP, VÔ HIỆU HÓA & HỦY LỆNH --------------------
  {
    id: "S4",
    group: "Nhóm 2: Block Khẩn Cấp, Vô Hiệu Hóa & Hủy Lệnh",
    title: "S4: Ghi Khẩn Cấp Crash DTC Với MemIf_EraseImmediateBlock() & FeeImmediateData",
    summary: "Khi xe gặp va chạm (Airbag Crash), nguồn điện chỉ còn vài mili-giây. Dem/NvM dùng Block 0x000F (FeeImmediateData=TRUE) đã được xóa sẵn qua MemIf_EraseImmediateBlock() để ghi tức thời mà không bị Garbage Collection làm chậm!",
    setup: () => {
      resetConfigToBase({ SelectedDeviceIndex: "0", SelectedLogicalBlock: "0x000F", FeeImmediateData: true, ActiveMemIfMode: "MEMIF_MODE_FAST" });
      simState.apiTrace = [];
      addTrace("Scenario S4 Ready", "Cấu hình Block 0x000F (Dem_CrashImmediate) với FeeImmediateData = TRUE.", "info");
    },
    steps: [
      {
        title: "Pha 1 — Chuẩn bị trước: MemIf_EraseImmediateBlock(0, 0x000F)",
        desc: "NvM gọi MemIf_EraseImmediateBlock(0, 0x000F) (ServiceId 0x09 — SWS_MemIf_00045). Bật Bit 4 Thanh B (IMMED_BLOCK = 1) và xóa trắng vùng dự trữ cho Block khẩn cấp.",
        exec: () => {
          api_MemIf_EraseImmediateBlock(0, "0x000F");
          api_FeeFls_MainFunction();
        }
      },
      {
        title: "Pha 2 — Xảy ra va chạm ngay lúc Fee đang bận Garbage Collection!",
        desc: "Giả lập Fee đang bận nội bộ MEMIF_BUSY_INTERNAL (dọn rác Sector). Ngay lúc này DEM phát hiện va chạm và đẩy Crash DTC vào Immediate Queue của NvM.",
        exec: () => {
          api_TriggerFeeGarbageCollection();
        }
      },
      {
        title: "Pha 3 — Immediate Write cắt ngang GC & ghi thẳng Flash trong 2 ticks!",
        desc: "NvM gọi MemIf_Write(0, 0x000F, &CrashDTC) (FAST Mode): Fee tạm ngưng GC để ghi thẳng vào vùng Immediate đã xóa sẵn, hoàn tất cực nhanh!",
        exec: () => {
          api_MemIf_Write(0, "0x000F", "C0 A5 40 01 DEAD C0DE", false);
          api_FeeFls_MainFunction();
          api_FeeFls_MainFunction();
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Thử gọi MemIf_EraseImmediateBlock() cho Block thường (0x0004, Imm=FALSE)",
        run: () => {
          ecucConfig.FeeImmediateData = false;
          api_MemIf_EraseImmediateBlock(0, "0x0004");
        }
      },
      {
        label: "🧪 Ghi lại Crash DTC trong lúc GC đang chạy (Preemption)",
        run: () => {
          api_TriggerFeeGarbageCollection();
          ecucConfig.FeeImmediateData = true;
          api_MemIf_Write(0, "0x000F", "C0 A5 99 11 AA BB CC DD", false);
        }
      },
      {
        label: "🧪 Đọc lại Crash Data từ Block 0x000F",
        run: () => {
          api_MemIf_Read(0, "0x000F", 0, 64, false);
          api_FeeFls_MainFunction();
          api_FeeFls_MainFunction();
        }
      }
    ]
  },

  {
    id: "S5",
    group: "Nhóm 2: Block Khẩn Cấp, Vô Hiệu Hóa & Hủy Lệnh",
    title: "S5: Vô Hiệu Hóa Block Bằng MemIf_InvalidateBlock() → Đọc Trả Về MEMIF_BLOCK_INVALID",
    summary: "Khi cần xóa dữ liệu nhạy cảm hoặc reset lỗi UDS, thay vì xóa cả Sector Flash, phần mềm gọi MemIf_InvalidateBlock() để gắn Header INVALID. Lần gọi MemIf_Read() tiếp theo trả về MEMIF_BLOCK_INVALID (0x05) để NvM nạp ROM Default.",
    setup: () => {
      resetConfigToBase({ SelectedDeviceIndex: "0", SelectedLogicalBlock: "0x0004", ActiveMemIfMode: "MEMIF_MODE_FAST" });
      simState.apiTrace = [];
      addTrace("Scenario S5 Ready", "Chuẩn bị vô hiệu hóa Block 0x0004 (NvM_CalibData).", "info");
    },
    steps: [
      {
        title: "Pha 1 — Gọi MemIf_InvalidateBlock(0, 0x0004) (ServiceId 0x07)",
        desc: "SWC/DCM gọi NvM_InvalidateNvBlock() → NvM gọi MemIf_InvalidateBlock(0, 0x0004) → định tuyến xuống Fee_InvalidateBlock(0x0004).",
        exec: () => {
          api_MemIf_InvalidateBlock(0, "0x0004");
        }
      },
      {
        title: "Pha 2 — Fee ghi Header trạng thái INVALID lên Flash",
        desc: "Fee_MainFunction() đánh dấu trang của Block 0x0004 thành INVALID (không cần xóa Sector!) và trả kết quả hoàn tất MEMIF_JOB_OK.",
        exec: () => {
          api_FeeFls_MainFunction();
        }
      },
      {
        title: "Pha 3 — Đọc lại Block 0x0004 → Trả về MEMIF_BLOCK_INVALID (101b = 0x05)!",
        desc: "Khi gọi MemIf_Read(0, 0x0004, ...), Fee thấy bản ghi mới nhất mang cờ INVALID nên trả JobResult = MEMIF_BLOCK_INVALID (Bit 2..0 Thanh B = 101b) và NvM nạp giá trị ROM Default.",
        exec: () => {
          api_MemIf_Read(0, "0x0004", 0, 32, false);
          api_FeeFls_MainFunction();
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Ghi đè dữ liệu mới lên Block đang INVALID (Block sống lại thành VALID!)",
        run: () => {
          api_MemIf_Write(0, "0x0004", "4E 45 57 5F 44 41 54 41", false);
          api_FeeFls_MainFunction();
        }
      },
      {
        label: "🧪 Thử Invalidate trên nhánh Ea (Dev 1 - Block 0x0010 EEPROM)",
        run: () => {
          api_MemIf_InvalidateBlock(1, "0x0010");
          api_EaEep_MainFunction();
          api_MemIf_Read(1, "0x0010", 0, 16, false);
          api_EaEep_MainFunction();
        }
      },
      {
        label: "🧪 Đặt InjectBlockInvalid = TRUE và đọc ngay Block 0x0004",
        run: () => {
          ecucConfig.InjectBlockInvalid = true;
          api_MemIf_Read(0, "0x0004", 0, 32, false);
          api_FeeFls_MainFunction();
        }
      }
    ]
  },

  {
    id: "S6",
    group: "Nhóm 2: Block Khẩn Cấp, Vô Hiệu Hóa & Hủy Lệnh",
    title: "S6: Hủy Lệnh Đang Chạy Bằng MemIf_Cancel(DevIdx) → MEMIF_JOB_CANCELED",
    summary: "Khi một Job thường dung lượng lớn đang chạy chậm ở SLOW Mode mà có yêu cầu Immediate khẩn cấp chèn vào hàng đợi NvM, NvM gọi MemIf_Cancel(0) cắt ngang Job thường (MEMIF_JOB_CANCELED = 0x02) để nhường quyền ngay lập tức!",
    setup: () => {
      resetConfigToBase({ ActiveMemIfMode: "MEMIF_MODE_SLOW", SelectedDeviceIndex: "0", SelectedLogicalBlock: "0x0004" });
      simState.apiTrace = [];
      addTrace("Scenario S6 Ready", "Chế độ SLOW (8B/tick) sẵn sàng mô phỏng hủy Job đang chạy dở.", "info");
    },
    steps: [
      {
        title: "Pha 1 — Bắt đầu ghi Block thường 0x0004 (Đang ghi dở 16/32 bytes)",
        desc: "MemIf_Write(0, 0x0004) chạy được 2 ticks (16/32 bytes). Status = MEMIF_BUSY, JobResult = MEMIF_JOB_PENDING (001b).",
        exec: () => {
          api_MemIf_Write(0, "0x0004", "11 22 33 44 55 66 77 88", false);
          api_FeeFls_MainFunction();
          api_FeeFls_MainFunction();
        }
      },
      {
        title: "Pha 2 — Yêu cầu khẩn cấp tới! NvM gọi MemIf_Cancel(0) (ServiceId 0x04)",
        desc: "MemIf định tuyến tới Fee_Cancel() → Fls_Cancel(). Thiết bị lập tức về MEMIF_IDLE, JobResult đổi sang MEMIF_JOB_CANCELED (Bit 2..0 = 010b) và báo NvM_JobErrorNotification().",
        exec: () => {
          api_MemIf_Cancel(0);
        }
      },
      {
        title: "Pha 3 — Chèn Immediate Job 0x000F ngay lập tức sau khi Cancel",
        desc: "NvM gửi ngay MemIf_Write(0, 0x000F) cho dữ liệu khẩn cấp mà không phải đợi Job 0x0004 hoàn tất!",
        exec: () => {
          ecucConfig.FeeImmediateData = true;
          api_MemIf_SetMode("MEMIF_MODE_FAST");
          api_MemIf_Write(0, "0x000F", "C0 A5 11 22 33 44 55 66", false);
          api_FeeFls_MainFunction();
          api_FeeFls_MainFunction();
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Bắt đầu Write SLOW rồi bấm MemIf_Cancel(0) ngay lúc 25%",
        run: () => {
          ecucConfig.ActiveMemIfMode = "MEMIF_MODE_SLOW";
          api_MemIf_Write(0, "0x0004", "AA 11 22 33", false);
          api_FeeFls_MainFunction();
          api_MemIf_Cancel(0);
        }
      },
      {
        label: "🧪 Thử gọi MemIf_Cancel(1) trên nhánh Ea (EEPROM) khi đang ghi SPI",
        run: () => {
          ecucConfig.ActiveMemIfMode = "MEMIF_MODE_SLOW";
          api_MemIf_Write(1, "0x0020", "99 88 77 66", false);
          api_EaEep_MainFunction();
          api_MemIf_Cancel(1);
        }
      },
      {
        label: "🧪 Kiểm tra MemIf_GetJobResult(0) ngay sau Cancel (Trả về 0x02 CANCELED)",
        run: () => {
          api_MemIf_Cancel(0);
          api_MemIf_GetJobResult(0);
        }
      }
    ]
  },

  // -------------------- NHÓM 3: BROADCAST (0xFF), GARBAGE COLLECTION & SETMODE --------------------
  {
    id: "S7",
    group: "Nhóm 3: Broadcast (0xFF), Garbage Collection & Callback vs Polling",
    title: "S7: Hợp Nhất MemIf_GetStatus(MEMIF_BROADCAST_ID=0xFF) & Fee Garbage Collection",
    summary: "Giải phẫu trọn vẹn công thức hợp nhất trạng thái quảng bá SWS_MemIf_00035..00037: UNINIT (0x00) ≻ BUSY (0x02) ≻ BUSY_INTERNAL (0x03) ≻ IDLE (0x01), kết hợp mô phỏng quy trình Garbage Collection / Sector Switch của Fee!",
    setup: () => {
      resetConfigToBase({ MemIfNumberOfDevices: "2", FeeActiveSectorUsagePct: 80 });
      simState.apiTrace = [];
      addTrace("Scenario S7 Ready", "Cả Dev 0 (Fee) và Dev 1 (Ea) đều đang MEMIF_IDLE.", "info");
    },
    steps: [
      {
        title: "Bước 1 — Cả 2 thiết bị rảnh → Broadcast(0xFF) trả về MEMIF_IDLE",
        desc: "Gọi MemIf_GetStatus(0xFF): Bật Bit 4 (BCAST_QUERY = 1). Fee=IDLE, Ea=IDLE → Kết quả hợp nhất = MEMIF_IDLE (Bits 2..0 Thanh A = 000b).",
        exec: () => {
          api_MemIf_GetStatus(255);
        }
      },
      {
        title: "Bước 2 — Fee đầy Sector (95%) chạy Garbage Collection → MEMIF_BUSY_INTERNAL",
        desc: "Fee tự chuyển sang MEMIF_BUSY_INTERNAL (Bit 6 FEE0_GC_INT = 1) để sao chép trang VALID sang Sector 1. Khi gọi MemIf_GetStatus(0xFF): BUSY_INTERNAL thắng IDLE → trả MEMIF_BUSY_INTERNAL (Bit 1 GLB_BUSY_INT = 1)!",
        exec: () => {
          api_TriggerFeeGarbageCollection();
          api_MemIf_GetStatus(255);
        }
      },
      {
        title: "Bước 3 — Ea (Dev 1) nhận lệnh Write trong lúc Fee đang GC → MEMIF_BUSY thắng thế!",
        desc: "Dev 0 = BUSY_INTERNAL, Dev 1 = BUSY. Theo SWS_MemIf_00036, MEMIF_BUSY có độ ưu tiên cao hơn BUSY_INTERNAL → MemIf_GetStatus(0xFF) trả về MEMIF_BUSY (Bit 0 = 1)!",
        exec: () => {
          api_MemIf_Write(1, "0x0010", "12 34 56 78 9A BC DE F0", false);
          api_MemIf_GetStatus(255);
        }
      },
      {
        title: "Bước 4 — Hoàn tất GC & Sector Switch sang Sector 1",
        desc: "Chạy Tick hoàn tất Ea và chạy 2 Tick GC của Fee → Sector 0 được xóa trắng, chỉ còn trang VALID trên Sector 1, toàn hệ thống quay về MEMIF_IDLE!",
        exec: () => {
          api_EaEep_MainFunction();
          api_EaEep_MainFunction();
          api_FeeFls_MainFunction();
          api_FeeFls_MainFunction();
          api_MemIf_GetStatus(255);
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Tắt EaDev1Initialized = FALSE rồi gọi GetStatus(0xFF) (UNINIT thắng tuyệt đối!)",
        run: () => {
          ecucConfig.EaDev1Initialized = false;
          api_MemIf_GetStatus(255);
        }
      },
      {
        label: "🧪 Bật lại EaInit & kích hoạt ngay Fee Garbage Collection (BUSY_INTERNAL)",
        run: () => {
          ecucConfig.EaDev1Initialized = true;
          syncInitFlagsToDevices();
          api_TriggerFeeGarbageCollection();
          api_MemIf_GetStatus(255);
        }
      },
      {
        label: "🧪 Hoàn tất nhanh quá trình Sector Switch của Fee",
        run: () => {
          api_FeeFls_MainFunction();
          api_FeeFls_MainFunction();
          api_MemIf_GetStatus(255);
        }
      }
    ]
  },

  {
    id: "S8",
    group: "Nhóm 3: Broadcast (0xFF), Garbage Collection & Callback vs Polling",
    title: "S8: Quảng Bá MemIf_SetMode(FAST → SLOW) Trong Chu Trình NvM_ReadAll() / WriteAll()",
    summary: "Giải thích lý do MemIf_SetMode() không nhận DeviceIndex: khi EcuM chạy NvM_ReadAll() lúc khởi động hoặc NvM_WriteAll() lúc tắt máy, NvM phát quảng bá MEMIF_MODE_FAST xuống cả Fee và Ea để tăng tốc gấp 4 lần, sau đó hạ về MEMIF_MODE_SLOW khi xe chạy.",
    setup: () => {
      resetConfigToBase({ ActiveMemIfMode: "MEMIF_MODE_SLOW", FlsEepBytesPerCycleSlow: 8, FlsEepBytesPerCycleFast: 32 });
      simState.apiTrace = [];
      addTrace("Scenario S8 Ready", "EcuM chuẩn bị gọi NvM_ReadAll() khi khởi động ECU (IGN ON).", "info");
    },
    steps: [
      {
        title: "Pha 1 — EcuM gọi NvM_ReadAll() → NvM quảng bá MemIf_SetMode(MEMIF_MODE_FAST)",
        desc: "Bật Bit 5 Thanh A (FAST_MODE = 1). MemIf tự lặp qua tất cả thiết bị gọi Fee_SetMode(FAST) và Ea_SetMode(FAST), nâng tốc độ xử lý từ 8B/tick lên 32B/tick!",
        exec: () => {
          addTrace("EcuM_StartupTwo() -> NvM_ReadAll()", "Bắt đầu đọc toàn bộ Block NVRAM từ Flash và EEPROM.", "info");
          api_MemIf_SetMode("MEMIF_MODE_FAST");
        }
      },
      {
        title: "Pha 2 — Đọc liên hoàn Block 0x0004 (Fee) & Block 0x0010 (Ea) tốc độ Burst",
        desc: "Nhờ FAST_MODE (32B/tick), mỗi Block hoàn tất chỉ trong đúng 1 nhịp MainFunction!",
        exec: () => {
          api_MemIf_Read(0, "0x0004", 0, 32, false);
          api_FeeFls_MainFunction();
          api_MemIf_Read(1, "0x0010", 0, 16, false);
          api_EaEep_MainFunction();
        }
      },
      {
        title: "Pha 3 — Hoàn tất NvM_ReadAll() → Hạ về MemIf_SetMode(MEMIF_MODE_SLOW) & Báo BswM",
        desc: "NvM gọi MemIf_SetMode(MEMIF_MODE_SLOW) (hạ Bit 5 FAST_MODE = 0) để tiết kiệm tải CPU khi xe chạy bình thường và báo BswM_NvM_CurrentJobMode(READ_ALL, OK).",
        exec: () => {
          api_MemIf_SetMode("MEMIF_MODE_SLOW");
          if (ecucConfig.NvMBswMMultiBlockJobStatusInformation) {
            addTrace("BswM_NvM_CurrentJobMode(NVM_READ_ALL, NVM_REQ_OK)", "EcuM chuyển sang trạng thái RUN!", "ok");
          }
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Tắt FeeSetModeSupported = FALSE rồi gọi MemIf_SetMode(FAST)",
        run: () => {
          ecucConfig.FeeSetModeSupported = false;
          api_MemIf_SetMode("MEMIF_MODE_FAST");
        }
      },
      {
        label: "🧪 Chạy chu trình Shutdown NvM_WriteAll() ở chế độ FAST",
        run: () => {
          api_MemIf_SetMode("MEMIF_MODE_FAST");
          api_MemIf_Write(0, "0x0004", "55 AA 20 26 SHUT D0 WN", false);
          api_FeeFls_MainFunction();
          api_MemIf_Write(1, "0x0010", "00 01 99 99 4B 4D 00 00", false);
          api_EaEep_MainFunction();
          api_MemIf_SetMode("MEMIF_MODE_SLOW");
        }
      },
      {
        label: "🧪 Thử đọc Block 32B ở SLOW Mode (8B/tick) để thấy mất 4 ticks",
        run: () => {
          api_MemIf_SetMode("MEMIF_MODE_SLOW");
          api_MemIf_Read(0, "0x0004", 0, 32, false);
          api_FeeFls_MainFunction();
        }
      }
    ]
  },

  {
    id: "S9",
    group: "Nhóm 3: Broadcast (0xFF), Garbage Collection & Callback vs Polling",
    title: "S9: Đối Chiếu Callback Notification (Fee/Ea → NvM) vs Polling Qua MemIf",
    summary: "Giải đáp câu hỏi kinh điển: Tại sao MemIf không có hàm MemIf_JobEndNotification()? Vì ở Callback Mode (NvMPollingMode=FALSE), Fee/Ea gọi THẲNG NvM_JobEndNotification() bỏ qua MemIf; còn ở Polling Mode (TRUE), NvM phải tự gọi MemIf_GetStatus() & MemIf_GetJobResult().",
    setup: () => {
      resetConfigToBase({ NvMPollingMode: false, ActiveMemIfMode: "MEMIF_MODE_FAST" });
      simState.apiTrace = [];
      addTrace("Scenario S9 Ready", "Chế độ mặc định: NvMPollingMode = FALSE (Callback Notification Mode).", "info");
    },
    steps: [
      {
        title: "Nhánh A (Callback Mode) — Downward qua MemIf, Upward Fee gọi thẳng NvM!",
        desc: "Bit 3 Thanh B (NVM_CBK_OK = 1). MemIf_Read(0) đi xuống Fee; khi xong, mũi tên cam nét đứt trên SVG bắn trực tiếp từ Fee lên NvM_JobEndNotification(), bỏ qua hoàn toàn MemIf!",
        exec: () => {
          ecucConfig.NvMPollingMode = false;
          api_MemIf_Read(0, "0x0004", 0, 32, false);
          api_FeeFls_MainFunction();
        }
      },
      {
        title: "Nhánh B (Polling Mode) — Bật NvMPollingMode = TRUE (Bit 3 = 0)",
        desc: "Khi bật Polling Mode, Fee hoàn tất công việc nhưng KHÔNG gọi callback lên NvM. NvM phải tự định kỳ thăm dò xuyên qua MemIf.",
        exec: () => {
          ecucConfig.NvMPollingMode = true;
          api_MemIf_Write(0, "0x0004", "CA 11 BA C4 90 11 00 01", false);
          api_FeeFls_MainFunction();
        }
      },
      {
        title: "Nhánh B (Polling) — NvM_MainFunction() gọi MemIf_GetStatus(0) & MemIf_GetJobResult(0)",
        desc: "Ở nhịp NvM_MainFunction() kế tiếp, NvM hỏi MemIf_GetStatus(0) thấy MEMIF_IDLE, rồi gọi tiếp MemIf_GetJobResult(0) lấy về MEMIF_JOB_OK!",
        exec: () => {
          api_NvM_MainFunction();
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Bật Callback Mode (NvMPollingMode=FALSE) & chạy ngay 1 vòng Đọc",
        run: () => {
          ecucConfig.NvMPollingMode = false;
          api_MemIf_Read(0, "0x0004", 0, 32, false);
          api_FeeFls_MainFunction();
        }
      },
      {
        label: "🧪 Bật Polling Mode (NvMPollingMode=TRUE) & xem NvM_MainFunction() thăm dò",
        run: () => {
          ecucConfig.NvMPollingMode = true;
          api_MemIf_Read(0, "0x0004", 0, 32, false);
          api_FeeFls_MainFunction();
          api_NvM_MainFunction();
        }
      },
      {
        label: "🧪 Bật thêm FeePollingMode = TRUE ở tầng dưới (Fee poll Fls)",
        run: () => {
          ecucConfig.FeePollingMode = true;
          api_MemIf_Write(0, "0x0004", "77 66 55 44 33 22 11 00", false);
          api_FeeFls_MainFunction();
        }
      }
    ]
  },

  // -------------------- NHÓM 4: XỬ LÝ LỖI, KIẾN TRÚC R23-11 MEMACC & HÀNG RÀO DET --------------------
  {
    id: "S10",
    group: "Nhóm 4: Xử Lý Lỗi, Kiến Trúc R23-11 MemAcc & Hàng Rào DET",
    title: "S10: Lỗi Rách Trang (MEMIF_BLOCK_INCONSISTENT) & Tự Cứu Với NvM Redundant Block",
    summary: "Nếu xe bị tắt nguồn đột ngột giữa chừng lúc ghi Bản sao 1 (0x0008), lần đọc kế tiếp Fee trả về MEMIF_BLOCK_INCONSISTENT (100b = 0x04). Nếu cấu hình NVM_BLOCK_REDUNDANT, NvM tự động chuyển sang đọc Bản sao 2 (0x0009) qua MemIf để cứu dữ liệu VIN!",
    setup: () => {
      resetConfigToBase({
        SelectedDeviceIndex: "0",
        SelectedLogicalBlock: "0x0008",
        NvMBlockManagementType: "NVM_BLOCK_REDUNDANT",
        ActiveMemIfMode: "MEMIF_MODE_FAST",
        InjectBlockInconsistent: true
      });
      simState.feeFlashLayout.pages[2].state = "INCONSISTENT";
      simState.feeFlashLayout.pages[2].note = "Torn Page (Power Loss!)";
      simState.apiTrace = [];
      addTrace("Scenario S10 Ready", "Block 0x0008 (VIN Copy 1) bị rách trang Flash do mất nguồn. Copy 2 (0x0009) còn nguyên.", "warn");
    },
    steps: [
      {
        title: "Pha 1 — NvM đọc Copy 1 (0x0008) qua MemIf_Read() → Phát hiện INCONSISTENT!",
        desc: "Fee kiểm tra Trailer không khớp → trả JobResult = MEMIF_BLOCK_INCONSISTENT (Bit 2..0 Thanh B = 100b = 0x04) và gọi NvM_JobErrorNotification().",
        exec: () => {
          api_MemIf_Read(0, "0x0008", 0, 16, false);
          api_FeeFls_MainFunction();
        }
      },
      {
        title: "Pha 2 — NvM tự cứu: Chuyển sang đọc Copy 2 dự phòng (0x0009) qua MemIf!",
        desc: "Nhờ NvMBlockManagementType = NVM_BLOCK_REDUNDANT, thay vì báo lỗi ngay, NvM tự động tính BlockNumber tiếp theo (0x0009) và gọi MemIf_Read(0, 0x0009, ...).",
        exec: () => {
          api_RedundantBlockRecovery();
          api_FeeFls_MainFunction();
        }
      },
      {
        title: "Pha 3 — Cứu dữ liệu VIN thành công (MEMIF_JOB_OK) & Lên lịch sửa lại Copy 1",
        desc: "Copy 2 (0x0009) trả về MEMIF_JOB_OK (000b) → NvM ghi sửa lại Copy 1 (0x0008) để khôi phục tính dự phòng kép!",
        exec: () => {
          api_MemIf_Write(0, "0x0008", "56 49 4E 32 30 32 36 01", false);
          api_FeeFls_MainFunction();
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Giả lập hỏng cả Copy 1 lẫn Copy 2 (NvM báo DEM_INTEGRITY_FAILED!)",
        run: () => {
          ecucConfig.InjectBlockInconsistent = true;
          api_MemIf_Read(0, "0x0009", 0, 16, false);
          api_FeeFls_MainFunction();
          if (ecucConfig.MemIfDemEventReporting) {
            simState.dem.nvmIntegrityFail = true;
            addTrace("Dem_SetEventStatus(NVM_E_INTEGRITY_FAILED, FAILED)", "Cả 2 bản sao Redundant đều hỏng → Nạp ROM Default!", "err");
          }
        }
      },
      {
        label: "🧪 Đọc Block mới tinh chưa từng ghi (Blank Flash 0xFF -> INCONSISTENT)",
        run: () => {
          ecucConfig.InjectBlockInconsistent = true;
          api_MemIf_Read(0, "0x0004", 0, 32, false);
          api_FeeFls_MainFunction();
        }
      },
      {
        label: "🧪 Ghi đè sửa lại Copy 1 (0x0008) để khôi phục trạng thái VALID",
        run: () => {
          ecucConfig.InjectBlockInconsistent = false;
          api_MemIf_Write(0, "0x0008", "56 49 4E 32 30 32 36 01", false);
          api_FeeFls_MainFunction();
        }
      }
    ]
  },

  {
    id: "S11",
    group: "Nhóm 4: Xử Lý Lỗi, Kiến Trúc R23-11 MemAcc & Hàng Rào DET",
    title: "S11: Lỗi Phần Cứng (MEMIF_JOB_FAILED), Báo DEM & Kiến Trúc R23-11 MemAcc / Mem",
    summary: "Mô phỏng lỗi phần cứng Flash/EEPROM (MEMIF_JOB_FAILED = 0x03) kích hoạt báo cáo sang DEM, đồng thời minh họa kiến trúc chuẩn AUTOSAR R22-11 / R23-11 mới nhất khi lớp Fee/Ea giao tiếp xuống MemAcc (Memory Access) & Unified Mem Driver.",
    setup: () => {
      resetConfigToBase({
        ActiveMemIfMode: "MEMIF_MODE_FAST",
        InjectHardwareWriteEraseFail: true,
        EnableR2311MemAccLayer: true,
        MemIfDemEventReporting: true
      });
      simState.apiTrace = [];
      addTrace("Scenario S11 Ready", "Bật kiến trúc AUTOSAR R23-11 (MemAcc + Mem Driver) và InjectHardwareWriteEraseFail = TRUE.", "info");
    },
    steps: [
      {
        title: "Pha 1 — Ghi xuống tầng dưới theo chuỗi R23-11: NvM → MemIf → Fee → MemAcc → Mem",
        desc: "Giao diện NvM ↔ MemIf ↔ Fee giữ nguyên để tương thích ngược, nhưng tầng dưới dùng MemAcc_Write() và Mem_Write() chuẩn AUTOSAR R22-11/R23-11.",
        exec: () => {
          api_MemIf_Write(0, "0x0004", "AA BB CC DD 11 22 33 44", false);
        }
      },
      {
        title: "Pha 2 — Phần cứng Flash lỗi Verify → MEMIF_JOB_FAILED (0x03) & Báo DEM!",
        desc: "Mem/Fls báo lỗi phần cứng: Dem_SetEventStatus(FLS_E_WRITE_FAILED, FAILED), JobResult = MEMIF_JOB_FAILED (Bit 2..0 = 011b) và báo NvM_JobErrorNotification().",
        exec: () => {
          api_FeeFls_MainFunction();
        }
      },
      {
        title: "Pha 3 — Khắc phục lỗi phần cứng & Thực hiện ghi lại thành công qua MemAcc",
        desc: "Tắt cờ InjectHardwareWriteEraseFail, thực hiện Retry ghi lại Block 0x0004 qua chuỗi R23-11 → MEMIF_JOB_OK!",
        exec: () => {
          ecucConfig.InjectHardwareWriteEraseFail = false;
          simState.dem.flsWriteFail = false;
          api_MemIf_Write(0, "0x0004", "AA BB CC DD 11 22 33 44", false);
          api_FeeFls_MainFunction();
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Bật/Tắt EnableR2311MemAccLayer để thấy SVG đổi Fls/Eep ↔ MemAcc/Mem",
        run: () => {
          ecucConfig.EnableR2311MemAccLayer = !ecucConfig.EnableR2311MemAccLayer;
          api_MemIf_Read(0, "0x0004", 0, 32, false);
        }
      },
      {
        label: "🧪 Gây lỗi phần cứng trên nhánh Ea (Device 1 - EEPROM SPI Timeout)",
        run: () => {
          ecucConfig.InjectHardwareWriteEraseFail = true;
          api_MemIf_Write(1, "0x0010", "FF 00 FF 00", false);
          api_EaEep_MainFunction();
        }
      },
      {
        label: "🧪 Xóa lỗi & Retry đọc lại qua MemIf_Read(0)",
        run: () => {
          ecucConfig.InjectHardwareWriteEraseFail = false;
          simState.dem.flsWriteFail = false;
          simState.dem.eepWriteFail = false;
          api_MemIf_Read(0, "0x0004", 0, 32, false);
          api_FeeFls_MainFunction();
        }
      }
    ]
  },

  {
    id: "S12",
    group: "Nhóm 4: Xử Lý Lỗi, Kiến Trúc R23-11 MemAcc & Hàng Rào DET",
    title: "S12: Kiểm Thử Hàng Rào DET (MEMIF_E_PARAM_DEVICE / POINTER) & MemIf_GetVersionInfo()",
    summary: "Kiểm chứng các lỗi Development Error của MemIf (ModuleId = 22): truyền DeviceIndex vượt ngưỡng hoặc 0xFF vào API không phải GetStatus (MEMIF_E_PARAM_DEVICE = 0x01), truyền NULL_PTR (MEMIF_E_PARAM_POINTER = 0x02), và truy vấn MemIf_GetVersionInfo().",
    setup: () => {
      resetConfigToBase({ MemIfNumberOfDevices: "2", MemIfDevErrorDetect: true, MemIfVersionInfoApi: true });
      simState.apiTrace = [];
      addTrace("Scenario S12 Ready", "MemIfDevErrorDetect = TRUE (ModuleId = 22). Sẵn sàng kiểm thử DET.", "info");
    },
    steps: [
      {
        title: "Lỗi 1 — Truyền DeviceIndex = 99 vào MemIf_Read() → DET MEMIF_E_PARAM_DEVICE (0x01)",
        desc: "MemIf chặn ngay trước khi truy cập mảng con trỏ hàm MemIf_ReadFctPtr[99] (tránh HardFault!), bật Bit 3 Thanh A (DET_ERR_FLG = 1) và báo Det_ReportError(22, 0, 0x02, 0x01).",
        exec: () => {
          api_MemIf_Read(99, "0x0004", 0, 32, false);
        }
      },
      {
        title: "Lỗi 2 — Truyền 0xFF (MEMIF_BROADCAST_ID) vào MemIf_GetJobResult(0xFF) → Bị DET chặn!",
        desc: "Mã 0xFF CHỈ hợp lệ duy nhất cho MemIf_GetStatus(0xFF). Nếu truyền 0xFF vào MemIf_GetJobResult(0xFF), MemIf lập tức báo lỗi MEMIF_E_PARAM_DEVICE (0x01)!",
        exec: () => {
          api_MemIf_GetJobResult(255);
        }
      },
      {
        title: "Lỗi 3 — Truyền NULL_PTR vào MemIf_Write() → DET MEMIF_E_PARAM_POINTER (0x02)",
        desc: "Bật PassNullPointerTest = TRUE rồi gọi MemIf_Write(0, 0x0004, NULL_PTR) → Báo Det_ReportError(22, 0, 0x03, 0x02) theo SWS_MemIf_00023.",
        exec: () => {
          ecucConfig.PassNullPointerTest = true;
          api_MemIf_Write(0, "0x0004", "00", true);
        }
      },
      {
        title: "Bước 4 — Gọi hợp lệ MemIf_GetVersionInfo(&VerInfo) (ServiceId 0x08)",
        desc: "Hạ lỗi DET và truy vấn thông tin phiên bản của MemIf: ModuleId = 22 (0x0016), VendorId = 43, SW Version = 4.2.0.",
        exec: () => {
          ecucConfig.PassNullPointerTest = false;
          api_MemIf_GetVersionInfo(false);
        }
      }
    ],
    whatIfs: [
      {
        label: "🧪 Gọi MemIf_GetStatus(0xFF) [Hợp lệ] rồi gọi MemIf_GetJobResult(0xFF) [Lỗi DET 0x01!]",
        run: () => {
          api_MemIf_GetStatus(255);
          api_MemIf_GetJobResult(255);
        }
      },
      {
        label: "🧪 Truyền NULL_PTR vào MemIf_GetVersionInfo(NULL_PTR) (Báo DET 0x02)",
        run: () => {
          api_MemIf_GetVersionInfo(true);
        }
      },
      {
        label: "🧪 Tắt MemIfDevErrorDetect = FALSE rồi gọi DeviceIndex=99 (Rủi ro Out-of-bounds!)",
        run: () => {
          ecucConfig.MemIfDevErrorDetect = false;
          api_MemIf_Read(99, "0x0004", 0, 16, false);
        }
      }
    ]
  }
];
