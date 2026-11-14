// ================= PART 4B: 14 PRE-BUILT SCENARIOS (S1-S14) & 42 WHAT-IF ACTIONS =================

const SCENARIOS = [
  // -------------------- GROUP 1: INIT, WRITE, READ & DATASET/VIRTUAL PAGE --------------------
  {
    id: "S1",
    group: "Nhóm 1: Khởi Tạo, Ghi/Đọc Chuẩn & Căn Chỉnh Trang Ảo",
    title: "S1: Khởi Tạo Ea_Init(NULL_PTR) & Tính Bản Đồ Địa Chỉ Logical → Physical",
    summary: "Minh họa chu trình khởi động bộ nhớ từ MEMIF_UNINIT (sau Power-On) → EcuM gọi Ea_Init(NULL_PTR) → tính địa chỉ vật lý theo EaVirtualPageSize (8B) & EaBlockOverhead (4B) → chuyển về MEMIF_IDLE.",
    setup: () => {
      resetEaToInit({
        cfgOverrides: { EaInitialized: false },
        stepExplain: "Power-On Reset: Ea chưa khởi tạo (MEMIF_UNINIT, Bit 7 EA_INIT = 0). Bấm Bước Tiếp để EcuM gọi Ea_Init()."
      });
      simState.initialized = false;
      simState.moduleStatus = "MEMIF_UNINIT";
      simState.traceLogs = [];
      addTrace("Power-On Reset", "Ea đang ở trạng thái MEMIF_UNINIT trước khi EcuM khởi tạo.", "warn");
      updateDerivedRegisters();
    },
    steps: [
      {
        title: "EcuM gọi Eep_Init() & Ea_Init(NULL_PTR)",
        desc: "EcuM_AL_DriverInitTwo() gọi Eep_Init() trước rồi gọi Ea_Init(NULL_PTR) [SWS_Ea_00084]. Ea bật Bit 7 (EA_INIT=1) và tạm vào MEMIF_BUSY_INTERNAL (Bit 5=1) để tính bảng ánh xạ.",
        exec: () => {
          ecucConfig.EaInitialized = true;
          simState.initialized = true;
          simState.moduleStatus = "MEMIF_BUSY_INTERNAL";
          simState.jobResult = "MEMIF_JOB_OK";
          simState.activeArrows = ["arr_ecum_ea"];
          addTrace("Ea_Init(NULL_PTR) [0x00 · SWS_Ea_00084]", "Bắt đầu khởi tạo nội bộ (MEMIF_UNINIT → MEMIF_BUSY_INTERNAL).", "info");
          updateDerivedRegisters();
        }
      },
      {
        title: "Ánh xạ Virtual Page & Quét Wear-Leveling Slot → MEMIF_IDLE",
        desc: "Ea căn chỉnh 4 Logical Blocks theo EaVirtualPageSize=8B, tính toán địa chỉ 0x0000..0x005F và chọn Slot #2 cho Blk_Odometer_Wear, sau đó hoàn tất về MEMIF_IDLE (Bit 3 JOB_OK=1).",
        exec: () => {
          simState.moduleStatus = "MEMIF_IDLE";
          simState.jobResult = "MEMIF_JOB_OK";
          recomputeMemoryLayout(true);
          simState.activeSlotByEntry.BLK3 = findLatestValidSlotIdx(
            simState.blockLayouts.find((x) => x.id === "BLK3"),
            simState.eepromSlots.BLK3
          );
          simState.activeArrows = ["arr_ecum_ea", "arr_schm_ea"];
          addTrace("Ea_Init() Complete [SWS_Ea_00129]", "Đã ánh xạ 4 Logical Blocks (VP=8B, Overhead=4B) → Trạng thái MEMIF_IDLE.", "ok");
          updateDerivedRegisters();
        }
      },
      {
        title: "Đọc thông tin phiên bản qua Ea_GetVersionInfo(&VerInfo)",
        desc: "Kiểm tra EaVersionInfoApi=TRUE: Ea trả về ModuleId=40 (0x0028), AUTOSAR Classic R23.11.0.",
        exec: () => {
          api_Ea_GetVersionInfo(false);
        }
      }
    ],
    whatIfs: [
      {
        label: "1. Đổi EaVirtualPageSize = 16B & Reset Init",
        run: () => {
          ecucConfig.EaVirtualPageSize = "16";
          api_Ea_Init(true);
        }
      },
      {
        label: "2. Tắt EaInitialized = FALSE & gọi Ea_Read(1)",
        run: () => {
          ecucConfig.EaInitialized = false;
          simState.initialized = false;
          simState.moduleStatus = "MEMIF_UNINIT";
          api_Ea_Read(1, 0, 4);
        }
      },
      {
        label: "3. Gọi Ea_GetVersionInfo(&VerInfo)",
        run: () => {
          ecucConfig.EaInitialized = true;
          simState.initialized = true;
          simState.moduleStatus = "MEMIF_IDLE";
          api_Ea_GetVersionInfo(false);
        }
      }
    ]
  },

  {
    id: "S2",
    group: "Nhóm 1: Khởi Tạo, Ghi/Đọc Chuẩn & Căn Chỉnh Trang Ảo",
    title: "S2: Luồng Ghi Chuẩn SWC → RTE → NvM → MemIf → Ea_Write(Blk #1) 3 Bước An Toàn",
    summary: "Theo dõi trọn vẹn luồng ghi từ tầng Application xuống tới EEPROM qua 3 pha an toàn: (1) Ghi Start Marker 0xA5, (2) Ghi 12B Payload, (3) Chốt Valid Footer 0x5A → gọi NvM_JobEndNotification().",
    setup: () => {
      resetEaToInit({ selectedEntryId: "BLK1" });
    },
    steps: [
      {
        title: "SWC → RTE → NvM → MemIf gọi Ea_Write(Blk #1)",
        desc: "SWC_App gọi Rte_Call_NvMService_WriteBlock(), đi qua NvM và MemIf(DeviceIdx=0) xuống Ea_Write(1). Ea chuyển ngay sang MEMIF_BUSY (Bit 6=1) và JOB_PENDING (Bit 4=1).",
        exec: () => {
          api_Ea_Write(Number(ecucConfig.Blk1_BlockNumber), "CA FE BA BE 20 26 01 02 03 04 05 06");
        }
      },
      {
        title: "Tick #1 Ea_MainFunction: Ghi Start Marker Header [0xA5 0x02]",
        desc: "Bước 1/3: Ea gọi Eep_Write(0x0000, [0xA5, 0x02], 2). Header=0xA5 (Bit 7 Thanh B=1) nhưng Footer vẫn 0xFF (Bit 6 Thanh B=0) để đánh dấu đang ghi dở.",
        exec: () => {
          stepClockTick();
        }
      },
      {
        title: "Tick #2: Eep xong Header → Ea gọi Eep_Write(Payload 12B)",
        desc: "Eep báo Ea_JobEndNotification() xong Header. Bước 2/3: Ea gọi Eep_Write(0x0002, DataBufferPtr, 12) để nạp 12 byte Calibration.",
        exec: () => {
          stepClockTick();
        }
      },
      {
        title: "Tick #3-4: Truyền xong Payload (SLOW 8B/tick) → Ghi Footer [0x5A 0x02]",
        desc: "Eep_MainFunction hoàn tất ghi 12B Payload (2 ticks ở SLOW). Bước 3/3: Ea gọi Eep_Write(0x000E, [0x5A, 0x02], 2) chốt dấu toàn vẹn.",
        exec: () => {
          stepClockTick();
          stepClockTick();
        }
      },
      {
        title: "Tick #5: Chốt Footer 0x5A → MEMIF_JOB_OK & NvM_JobEndNotification()",
        desc: "Footer 0x5A02 khớp Counter với Header 0xA502! Bit 6 FTR_VALID=1, Ea về MEMIF_IDLE (Bit 3 JOB_OK=1) và báo callback lên NvM → SWC.",
        exec: () => {
          stepClockTick();
        }
      }
    ],
    whatIfs: [
      {
        label: "1. Bật AutoVerifyAfterWrite=TRUE & chạy Ea_Write(1)",
        run: () => {
          resetEaToInit({ cfgOverrides: { AutoVerifyAfterWrite: true }, selectedEntryId: "BLK1" });
          api_Ea_Write(1, "CA FE BA BE 20 26 01 02 03 04 05 06");
          runActiveJobToCompletion(12);
        }
      },
      {
        label: "2. Bật SimulatePowerLossMidWrite=TRUE & chạy Ea_Write(1)",
        run: () => {
          resetEaToInit({ cfgOverrides: { SimulatePowerLossMidWrite: true }, selectedEntryId: "BLK1" });
          api_Ea_Write(1, "DE AD 00 00 11 22 33 44 55 66 77 88");
          runActiveJobToCompletion(12);
        }
      },
      {
        label: "3. Tắt EaNvmJobEndNotificationEnabled=FALSE & ghi xong",
        run: () => {
          resetEaToInit({ cfgOverrides: { EaNvmJobEndNotificationEnabled: false }, selectedEntryId: "BLK1" });
          api_Ea_Write(1, "10 20 30 40 50 60 70 80 90 A0 B0 C0");
          runActiveJobToCompletion(12);
        }
      }
    ]
  },

  {
    id: "S3",
    group: "Nhóm 1: Khởi Tạo, Ghi/Đọc Chuẩn & Căn Chỉnh Trang Ảo",
    title: "S3: Luồng Đọc Có Offset/Length (Ea_Read Blk #1, Ofs=4, Len=6) & Kiểm Tra Hdr/Ftr",
    summary: "Minh họa khả năng đọc một phần dữ liệu (Partial Read) kèm BlockOffset & Length của Ea_Read(), đồng thời kiểm tra cặp Header 0xA5 & Footer 0x5A trước khi nạp về RAM.",
    setup: () => {
      resetEaToInit({ selectedEntryId: "BLK1" });
    },
    steps: [
      {
        title: "Gọi Ea_Read(Blk #1, Offset=4, BufPtr, Length=6)",
        desc: "SWC/NvM yêu cầu đọc 6 byte giữa của Blk_Calibration (bắt đầu từ Offset=4). Ea chuyển MEMIF_BUSY (Bit 6=1, Bit 4 JOB_PENDING=1).",
        exec: () => {
          api_Ea_Read(Number(ecucConfig.Blk1_BlockNumber), 4, 6);
        }
      },
      {
        title: "Tick #1: Đọc kiểm tra cặp Header (0xA501) & Footer (0x5A01)",
        desc: "Ea_MainFunction() gọi Eep_Read() đọc 2 byte Header tại 0x0000 và 2 byte Footer tại 0x000E để xác thực khối dữ liệu không bị mất nguồn hay vô hiệu hóa.",
        exec: () => {
          stepClockTick();
        }
      },
      {
        title: "Tick #2: Cả Header/Footer VALID → Eep_Read tại 0x0006 (Base+2+Ofs=4)",
        desc: "Ea xác nhận VALID (Bit 7=1, Bit 6=1) và tính địa chỉ vật lý cần đọc: 0x0000 + 2(Hdr) + 4(Ofs) = 0x0006, gọi Eep_Read(0x0006, Buf, 6).",
        exec: () => {
          stepClockTick();
        }
      },
      {
        title: "Tick #3: Trả 6 Bytes [9A BC DE F0 11 22] & MEMIF_JOB_OK",
        desc: "Eep hoàn tất đọc 6 bytes vào RAM, Ea chuyển về MEMIF_IDLE, MEMIF_JOB_OK (Bit 3=1) và gọi NvM_JobEndNotification().",
        exec: () => {
          stepClockTick();
        }
      }
    ],
    whatIfs: [
      {
        label: "1. Đọc toàn bộ 12 bytes (Offset=0, Length=12)",
        run: () => {
          resetEaToInit({ selectedEntryId: "BLK1" });
          api_Ea_Read(1, 0, 12);
          runActiveJobToCompletion(10);
        }
      },
      {
        label: "2. Truyền Offset=10, Length=6 (Vượt Size=12) → Lỗi DET 0x05",
        run: () => {
          resetEaToInit({ selectedEntryId: "BLK1" });
          api_Ea_Read(1, 10, 6);
        }
      },
      {
        label: "3. Phá Footer Blk #1 thành 0xFF rồi đọc → INCONSISTENT",
        run: () => {
          resetEaToInit({ selectedEntryId: "BLK1" });
          corruptOrToggleSlotByte("BLK1", 0, "ftr");
          api_Ea_Read(1, 0, 12);
          runActiveJobToCompletion(10);
        }
      }
    ]
  },

  {
    id: "S4",
    group: "Nhóm 1: Khởi Tạo, Ghi/Đọc Chuẩn & Căn Chỉnh Trang Ảo",
    title: "S4: Ánh Xạ Khối Dataset NvM (Blk #2 vs #3) & Căn Chỉnh EaVirtualPageSize",
    summary: "Giải thích công thức NvM ánh xạ DataIndex=0/1 sang BlockNumber #2/#3 liên tiếp trong Ea, và cách EaVirtualPageSize=8B tự động chèn 4B Padding (0xFF) sau 12B (8B Data + 4B Overhead).",
    setup: () => {
      resetEaToInit({ selectedEntryId: "BLK2_0" });
    },
    steps: [
      {
        title: "Giải mã ánh xạ Dataset[0] → Block #2 (0x0010..0x001F)",
        desc: "NvM dùng công thức (Base=1 << 1) | DataIndex=0 → BlockNumber=2. Với Size=8B + Overhead=4B = 12B và EaVirtualPageSize=8B, Ea cấp 2 Pages = 16B (gồm 4B Padding 0xFF).",
        exec: () => {
          ecucConfig.Blk2_SelectedDatasetIndex = "0";
          simState.selectedEntryId = "BLK2_0";
          simState.activeArrows = ["arr_nvm_memif", "arr_memif_ea"];
          addTrace("NvM Dataset Mapping", "DataIndex=0 → EaBlockNumber=2 (0x0010..0x001F: 2B Hdr + 8B Data + 2B Ftr + 4B Pad).", "info");
          updateDerivedRegisters();
        }
      },
      {
        title: "Đọc Dataset[0] (Block #2) → Trả về MEMIF_JOB_OK",
        desc: "Block #2 đang có Header=0xA501 & Footer=0x5A01 nên Ea_Read(2, 0, 8) đọc thành công 8 bytes [AA BB CC DD 55 66 77 88].",
        exec: () => {
          api_Ea_Read(Number(ecucConfig.Blk2_BaseBlockNumber), 0, Number(ecucConfig.Blk2_BlockSize));
          runActiveJobToCompletion(10);
        }
      },
      {
        title: "Chuyển Dataset[1] → Block #3 (0x0020) Đang INVALID → MEMIF_BLOCK_INVALID",
        desc: "Khi NvM đổi DataIndex=1 → gọi Ea_Read(3, 0, 8). Vì Block #3 đang mang INVALID_MARKER (0x0000), Ea trả ngay MEMIF_BLOCK_INVALID!",
        exec: () => {
          ecucConfig.Blk2_SelectedDatasetIndex = "1";
          simState.selectedEntryId = "BLK2_1";
          api_Ea_Read(Number(ecucConfig.Blk2_BaseBlockNumber) + 1, 0, Number(ecucConfig.Blk2_BlockSize));
          runActiveJobToCompletion(10);
        }
      }
    ],
    whatIfs: [
      {
        label: "1. Đổi EaVirtualPageSize = 4B (Mất hẳn 4B Padding!)",
        run: () => {
          ecucConfig.EaVirtualPageSize = "4";
          recomputeMemoryLayout(true);
          addTrace("Config Change: EaVirtualPageSize = 4B", "Blk #2 & #3 thu từ 16B xuống 12B (3 Pages × 4B), 0B Padding thừa!", "ok");
          updateDerivedRegisters();
        }
      },
      {
        label: "2. Đổi EaVirtualPageSize = 16B (Mở rộng 1 Page = 16B)",
        run: () => {
          ecucConfig.EaVirtualPageSize = "16";
          recomputeMemoryLayout(true);
          addTrace("Config Change: EaVirtualPageSize = 16B", "Mỗi Block làm tròn lên bội số 16B trên EEPROM Map.", "info");
          updateDerivedRegisters();
        }
      },
      {
        label: "3. Chọn lại DataIndex=0 (Block #2) & đọc",
        run: () => {
          ecucConfig.Blk2_SelectedDatasetIndex = "0";
          api_Ea_Read(Number(ecucConfig.Blk2_BaseBlockNumber), 0, Number(ecucConfig.Blk2_BlockSize));
          runActiveJobToCompletion(10);
        }
      }
    ]
  },

  // -------------------- GROUP 2: INTEGRITY, INVALIDATE & WEAR-LEVELING --------------------
  {
    id: "S5",
    group: "Nhóm 2: Toàn Vẹn Khối, Vô Hiệu Hóa & Chia Tải Wear-Leveling",
    title: "S5: Sập Nguồn Giữa Lúc Ghi (Power-Loss) → Ea_Read Phát Hiện MEMIF_BLOCK_INCONSISTENT",
    summary: "Chứng minh lý do Ea phải tách 3 bước ghi (Header → Data → Footer): nếu mất điện khi chưa kịp ghi Footer 0x5A, lần khởi động sau Ea_Read() lập tức bắt được MEMIF_BLOCK_INCONSISTENT (SWS_Ea_00074).",
    setup: () => {
      resetEaToInit({ cfgOverrides: { SimulatePowerLossMidWrite: true }, selectedEntryId: "BLK1" });
    },
    steps: [
      {
        title: "Gọi Ea_Write(1) & ghi xong Header [0xA5 0x02]",
        desc: "SimulatePowerLossMidWrite=TRUE: Ea gọi Eep_Write ghi Header [0xA5 0x02] tại 0x0000 (Bit 7 HDR_0xA5=1, Bit 6 FTR_0x5A=0).",
        exec: () => {
          api_Ea_Write(1, "AA BB CC DD 11 22 33 44 55 66 77 88");
          stepClockTick();
        }
      },
      {
        title: "⚡ Sập nguồn (Brown-out) ngay giữa pha ghi User Data!",
        desc: "Eep_MainFunction mới ghi được 6/12 byte Data thì nguồn sập đột ngột! Footer tại 0x000E vẫn còn nguyên 0xFFFF (chưa được đóng dấu 0x5A).",
        exec: () => {
          stepClockTick(); // finish Hdr -> start Data
          stepClockTick(); // triggers power-loss mid-write
        }
      },
      {
        title: "Bật nguồn lại (Ea_Init) & NvM_ReadAll() gọi Ea_Read(1)",
        desc: "Hệ thống khởi động lại, tắt cờ sập nguồn và chạy Ea_Init() → NvM gọi Ea_Read(1, 0, 12) để khôi phục dữ liệu.",
        exec: () => {
          ecucConfig.SimulatePowerLossMidWrite = false;
          api_Ea_Init(true);
          api_Ea_Read(1, 0, 12);
        }
      },
      {
        title: "Phát hiện Header≠Footer → Trả MEMIF_BLOCK_INCONSISTENT (Bit 5=1)",
        desc: "Ea_MainFunction đọc thấy Header=0xA502 nhưng Footer=0xFFFF! Ea bật Bit 5 INCONSISTENT=1, dừng đọc Data rác và gọi NvM_JobErrorNotification() để NvM nạp ROM Default!",
        exec: () => {
          runActiveJobToCompletion(10);
        }
      }
    ],
    whatIfs: [
      {
        label: "1. Ghi lại Ea_Write(1) trọn vẹn để tự phục hồi VALID",
        run: () => {
          ecucConfig.SimulatePowerLossMidWrite = false;
          api_Ea_Write(1, "12 34 56 78 9A BC DE F0 11 22 33 44");
          runActiveJobToCompletion(12);
        }
      },
      {
        label: "2. Đọc vùng EEPROM mới xuất xưởng (0xFF..FF)",
        run: () => {
          ecucConfig.SimulatePowerLossMidWrite = false;
          const sl = simState.eepromSlots.BLK1[0];
          sl.hdrBytes = [0xFF, 0xFF];
          sl.dataBytes.fill(0xFF);
          sl.ftrBytes = [0xFF, 0xFF];
          api_Ea_Read(1, 0, 12);
          runActiveJobToCompletion(10);
        }
      },
      {
        label: "3. Đối chiếu với Block bị Invalidate (0x0000)",
        run: () => {
          simState.selectedEntryId = "BLK2_1";
          api_Ea_Read(3, 0, 8);
          runActiveJobToCompletion(10);
        }
      }
    ]
  },

  {
    id: "S6",
    group: "Nhóm 2: Toàn Vẹn Khối, Vô Hiệu Hóa & Chia Tải Wear-Leveling",
    title: "S6: Vô Hiệu Hóa Khối Bằng Ea_InvalidateBlock(0x0000) → MEMIF_BLOCK_INVALID",
    summary: "Khi ứng dụng hoặc chẩn đoán cần hủy bỏ giá trị một Block mà không muốn tốn thời gian xóa toàn bộ, Ea_InvalidateBlock() chỉ ghi dấu 0x0000 vào Header để các lần đọc sau trả ngay MEMIF_BLOCK_INVALID.",
    setup: () => {
      resetEaToInit({ selectedEntryId: "BLK2_0" });
    },
    steps: [
      {
        title: "Gọi Ea_InvalidateBlock(Blk #2)",
        desc: "SWC → NvM → MemIf gọi Ea_InvalidateBlock(2). Ea chuyển MEMIF_BUSY (Bit 6=1) chuẩn bị ghi dấu INVALID_MARKER.",
        exec: () => {
          api_Ea_InvalidateBlock(Number(ecucConfig.Blk2_BaseBlockNumber));
        }
      },
      {
        title: "Tick #1-2: Ghi dấu [0x00 0x00] vào Header @ 0x0010",
        desc: "Ea_MainFunction gọi Eep_Write(0x0010, [0x00, 0x00], 2). Khi xong, Bit 4 INVALID=1 trên Thanh B và trả MEMIF_JOB_OK cho lệnh Invalidate.",
        exec: () => {
          runActiveJobToCompletion(8);
        }
      },
      {
        title: "Gọi lại Ea_Read(2) → Trả ngay MEMIF_BLOCK_INVALID [SWS_Ea_00075]",
        desc: "Ở lần đọc kế tiếp, Ea đọc Header thấy 0x0000 nên lập tức dừng đọc Data, đặt JobResult=MEMIF_BLOCK_INVALID và gọi NvM_JobErrorNotification().",
        exec: () => {
          api_Ea_Read(Number(ecucConfig.Blk2_BaseBlockNumber), 0, Number(ecucConfig.Blk2_BlockSize));
          runActiveJobToCompletion(8);
        }
      }
    ],
    whatIfs: [
      {
        label: "1. Ghi đè Ea_Write(2) khôi phục Block #2 về VALID",
        run: () => {
          api_Ea_Write(2, "AA BB CC DD 55 66 77 88");
          runActiveJobToCompletion(12);
        }
      },
      {
        label: "2. Vô hiệu hóa luôn Block #1 (Calibration) & đọc thử",
        run: () => {
          api_Ea_InvalidateBlock(1);
          runActiveJobToCompletion(8);
          api_Ea_Read(1, 0, 12);
          runActiveJobToCompletion(8);
        }
      },
      {
        label: "3. Gọi Ea_InvalidateBlock(99) sai BlockNo → Lỗi DET 0x02",
        run: () => {
          api_Ea_InvalidateBlock(99);
        }
      }
    ]
  },

  {
    id: "S7",
    group: "Nhóm 2: Toàn Vẹn Khối, Vô Hiệu Hóa & Chia Tải Wear-Leveling",
    title: "S7: Chia Tải Chu Kỳ Ghi (Wear-Leveling 400k Cycles → Luân Chuyển 4 Slots Vật Lý)",
    summary: "Khi EaNumberOfWriteCycles (400,000) vượt quá giới hạn chịu đựng của EEPROM (EepAllowedWriteCycles = 100,000), Ea tự động nhân bản Blk_Odometer_Wear thành 4 Slots vật lý (0x0030..0x004F) và xoay vòng điểm ghi.",
    setup: () => {
      resetEaToInit({ selectedEntryId: "BLK3" });
    },
    steps: [
      {
        title: "Kiểm tra cấu hình 4 Wear-Leveling Slots (Bit 1 WEAR_RT = 1)",
        desc: "Blk #3 (BlockNo=4) cần 400k cycles / 100k = 4 Slots (mỗi Slot 8B: 0x0030, 0x0038, 0x0040, 0x0048). Hiện tại Slot #2 đang giữ bản ghi mới nhất (Cnt=0x03).",
        exec: () => {
          simState.selectedEntryId = "BLK3";
          simState.activeArrows = ["arr_memif_ea"];
          addTrace("Wear-Leveling Check", "Blk #3 (400k/100k = 4 Slots): Active=Slot#2 (Cnt=0x03), Slot tiếp theo sẽ là Slot#3.", "info");
          updateDerivedRegisters();
        }
      },
      {
        title: "Gọi Ea_Write(4) lần 1 → Xoay điểm ghi sang Slot #3 (0x0048, Cnt=0x04)",
        desc: "Ea tự động tính TargetSlot = (2 + 1) mod 4 = 3 và tăng CycleCounter = 0x04, hoàn tất ghi toàn bộ tại Slot #3!",
        exec: () => {
          api_Ea_Write(Number(ecucConfig.Blk3_BlockNumber), "00 05 43 22");
          runActiveJobToCompletion(10);
        }
      },
      {
        title: "Gọi Ea_Write(4) lần 2 → Xoay vòng tròn về Slot #0 (0x0030, Cnt=0x05)",
        desc: "Lần ghi tiếp theo xoay vòng tròn về Slot #0 (0x0030) với Counter = 0x05, giúp mỗi ô nhớ vật lý chỉ chịu đúng 1/4 tổng số lần ghi!",
        exec: () => {
          api_Ea_Write(Number(ecucConfig.Blk3_BlockNumber), "00 05 43 23");
          runActiveJobToCompletion(10);
        }
      }
    ],
    whatIfs: [
      {
        label: "1. Ghi thêm 1 chu kỳ Odometer nữa (Xoay sang Slot #1!)",
        run: () => {
          api_Ea_Write(Number(ecucConfig.Blk3_BlockNumber), "00 05 43 24");
          runActiveJobToCompletion(10);
        }
      },
      {
        label: "2. Đổi Blk3_NumberOfWriteCycles = 100,000 (Thu còn 1 Slot)",
        run: () => {
          ecucConfig.Blk3_NumberOfWriteCycles = 100000;
          recomputeMemoryLayout(true);
          updateDerivedRegisters();
        }
      },
      {
        label: "3. Sập nguồn khi ghi Slot #3 (Slot #2 cũ vẫn an toàn!)",
        run: () => {
          ecucConfig.SimulatePowerLossMidWrite = true;
          api_Ea_Write(Number(ecucConfig.Blk3_BlockNumber), "00 05 43 99");
          runActiveJobToCompletion(10);
          ecucConfig.SimulatePowerLossMidWrite = false;
        }
      }
    ]
  },

  {
    id: "S8",
    group: "Nhóm 2: Toàn Vẹn Khối, Vô Hiệu Hóa & Chia Tải Wear-Leveling",
    title: "S8: Quét Tìm Slot Hợp Lệ Mới Nhất Khi Khởi Động & Chống Tràn CycleCounter",
    summary: "Giải thích cách Ea tìm lại đúng Slot mới nhất trong N Slots vật lý sau khi bật nguồn lại dựa trên trường Counter ở Header/Footer và thuật toán so sánh chống tràn số 8-bit.",
    setup: () => {
      resetEaToInit({ selectedEntryId: "BLK3" });
      const sls = simState.eepromSlots.BLK3;
      sls[0].hdrBytes = [0xA5, 0x10]; sls[0].ftrBytes = [0x5A, 0x10]; sls[0].counter = 0x10;
      sls[1].hdrBytes = [0xA5, 0x11]; sls[1].ftrBytes = [0x5A, 0x11]; sls[1].counter = 0x11;
      sls[2].hdrBytes = [0xA5, 0x12]; sls[2].ftrBytes = [0x5A, 0x12]; sls[2].counter = 0x12;
      sls[3].hdrBytes = [0xFF, 0xFF]; sls[3].ftrBytes = [0xFF, 0xFF]; sls[3].counter = 0;
      simState.activeSlotByEntry.BLK3 = 0; // Reset pointer to verify scan picks #2
      updateDerivedRegisters();
    },
    steps: [
      {
        title: "Khởi động gọi Ea_Init() → Quét 4 Slots (0x10, 0x11, 0x12, 0xFF)",
        desc: "Ea quét Header & Footer của cả 4 Slots tại 0x0030..0x0048, loại bỏ Slot #3 (0xFF chưa ghi) và so sánh 3 Slot VALID còn lại.",
        exec: () => {
          api_Ea_Init(true);
        }
      },
      {
        title: "Chốt Slot #2 (Cnt=0x12) là bản ghi mới nhất & gọi Ea_Read(4)",
        desc: "Con trỏ đọc tự động khóa vào Slot #2 (0x0040), Ea_Read(4, 0, 4) trả về đúng dữ liệu từ Slot #2 [00 05 43 21].",
        exec: () => {
          api_Ea_Read(Number(ecucConfig.Blk3_BlockNumber), 0, Number(ecucConfig.Blk3_BlockSize));
          runActiveJobToCompletion(10);
        }
      }
    ],
    whatIfs: [
      {
        label: "1. Test Wrap-around Counter (0xFD, 0xFE, 0x01 → Chọn 0x01!)",
        run: () => {
          const sls = simState.eepromSlots.BLK3;
          sls[0].hdrBytes = [0xA5, 0xFD]; sls[0].ftrBytes = [0x5A, 0xFD]; sls[0].counter = 0xFD;
          sls[1].hdrBytes = [0xA5, 0xFE]; sls[1].ftrBytes = [0x5A, 0xFE]; sls[1].counter = 0xFE;
          sls[2].hdrBytes = [0xA5, 0x01]; sls[2].ftrBytes = [0x5A, 0x01]; sls[2].counter = 0x01;
          sls[2].dataBytes = [0x00, 0x09, 0x99, 0x99];
          api_Ea_Init(true);
          api_Ea_Read(4, 0, 4);
          runActiveJobToCompletion(10);
        }
      },
      {
        label: "2. Làm hỏng Footer Slot #2 (0xFF) → Quét lùi hoặc báo lỗi",
        run: () => {
          corruptOrToggleSlotByte("BLK3", 2, "ftr");
          api_Ea_Init(true);
        }
      },
      {
        label: "3. Vô hiệu hóa Blk #3 bằng Ea_InvalidateBlock(4)",
        run: () => {
          api_Ea_InvalidateBlock(4);
          runActiveJobToCompletion(8);
        }
      }
    ]
  },

  // -------------------- GROUP 3: IMMEDIATE DATA, SETMODE & POLLING --------------------
  {
    id: "S9",
    group: "Nhóm 3: Dữ Liệu Khẩn Cấp (Immediate), SetMode & Polling",
    title: "S9: Dữ Liệu Khẩn Cấp EaImmediateData: Xóa Sẵn Ea_EraseImmediateBlock → Ghi Tức Thì",
    summary: "Với khối dữ liệu va chạm khẩn cấp (Blk #4: Blk_Crash_ImmData, EaImmediateData=TRUE), hệ thống gọi trước Ea_EraseImmediateBlock(5) để xóa sẵn vùng 0x0050..0x005F về 0xFF; khi xảy ra tai nạn chỉ cần ghi thẳng không tốn thời gian Erase.",
    setup: () => {
      resetEaToInit({ selectedEntryId: "BLK4" });
      const sl = simState.eepromSlots.BLK4[0];
      sl.hdrBytes = [0xA5, 0x01];
      sl.dataBytes = [0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A];
      sl.ftrBytes = [0x5A, 0x01];
      sl.counter = 1;
      updateDerivedRegisters();
    },
    steps: [
      {
        title: "Pha Pre-Erase: Gọi Ea_EraseImmediateBlock(5) (Bit 3 IMM_BLK=1)",
        desc: "Khi xe vận hành bình thường, NvM/SWC gọi trước Ea_EraseImmediateBlock(5) [SWS_Ea_00093] để dọn trắng vùng dữ liệu va chạm cũ.",
        exec: () => {
          api_Ea_EraseImmediateBlock(Number(ecucConfig.Blk4_BlockNumber));
        }
      },
      {
        title: "Tick #1-2: Eep_Erase(0x0050, 16B) → Bật Bit 2 IMM_PRE_ERASED = 1",
        desc: "Eep xóa sạch toàn bộ 16 bytes (2 Pages) tại 0x0050..0x005F về 0xFF! Block #4 chuyển sang trạng thái PRE_ERASED sẵn sàng ghi khẩn cấp.",
        exec: () => {
          runActiveJobToCompletion(8);
        }
      },
      {
        title: "⚡ Sự cố va chạm! Ghi khẩn cấp Ea_Write(5) không cần chờ Erase",
        desc: "Cảm biến túi khí kích hoạt: NvM chen ngang hàng đợi gọi Ea_Write(5, CrashData) và hoàn tất ghi xuống vùng đã Pre-Erased với tốc độ tối đa!",
        exec: () => {
          api_Ea_Write(Number(ecucConfig.Blk4_BlockNumber), "FF 99 88 77 66 55 44 33 22 11");
          runActiveJobToCompletion(12);
        }
      }
    ],
    whatIfs: [
      {
        label: "1. Gọi Ea_EraseImmediateBlock(1) lên Block thường → DET 0x02",
        run: () => {
          api_Ea_EraseImmediateBlock(1);
        }
      },
      {
        label: "2. Bật StrictImmediateEraseCheck & ghi lại Blk #4 khi chưa Erase",
        run: () => {
          ecucConfig.StrictImmediateEraseCheck = true;
          api_Ea_Write(5, "AA AA BB BB CC CC DD DD EE EE");
          runActiveJobToCompletion(12);
        }
      },
      {
        label: "3. Xóa sẵn lại Blk #4 bằng Ea_EraseImmediateBlock(5)",
        run: () => {
          api_Ea_EraseImmediateBlock(5);
          runActiveJobToCompletion(8);
        }
      }
    ]
  },

  {
    id: "S10",
    group: "Nhóm 3: Dữ Liệu Khẩn Cấp (Immediate), SetMode & Polling",
    title: "S10: Chuyển Đổi Tốc Độ Ea_SetMode(MEMIF_MODE_FAST vs SLOW) Khi NvM_ReadAll/WriteAll",
    summary: "Đối chiếu tốc độ truyền tải từng chunk giữa MEMIF_MODE_SLOW (8B/tick khi xe đang chạy) và MEMIF_MODE_FAST (32B/tick khi NvM_ReadAll / WriteAll).",
    setup: () => {
      resetEaToInit({ cfgOverrides: { CurrentMemIfMode: "MEMIF_MODE_SLOW", EepChunkSizeMode: "8_32" }, selectedEntryId: "BLK1" });
    },
    steps: [
      {
        title: "Ghi Blk #1 ở MEMIF_MODE_SLOW (8B/tick) — Mất 5 Ticks",
        desc: "Vì 12B > 8B/tick, ở chế độ SLOW (Bit 1 FAST_MD=0), pha ghi Payload phải chia thành 2 nhịp Eep_MainFunction() (8B + 4B), tổng 5 ticks.",
        exec: () => {
          api_Ea_Write(1, "11 22 33 44 55 66 77 88 99 AA BB CC");
          runActiveJobToCompletion(12);
        }
      },
      {
        title: "BswM gọi Ea_SetMode(MEMIF_MODE_FAST) → Bit 1 FAST_MD = 1",
        desc: "Chuẩn bị NvM_WriteAll lúc tắt máy: Ea chuyển xuống Eep_SetMode(MEMIF_MODE_FAST), nâng gói truyền mỗi tick từ 8B lên 32B!",
        exec: () => {
          api_Ea_SetMode("MEMIF_MODE_FAST");
        }
      },
      {
        title: "Ghi Blk #1 ở MEMIF_MODE_FAST (32B/tick) — Rút gọn còn 4 Ticks",
        desc: "Toàn bộ 12B Payload đi gọn trong 1 nhịp duy nhất của Eep_MainFunction(), tiết kiệm thời gian shutdown ECU!",
        exec: () => {
          api_Ea_Write(1, "AA BB CC DD EE FF 00 11 22 33 44 55");
          runActiveJobToCompletion(12);
        }
      },
      {
        title: "Khôi phục Ea_SetMode(MEMIF_MODE_SLOW) khi vào RUN",
        desc: "Hạ tốc độ về SLOW (Bit 1=0) để không chiếm dụng băng thông bus SPI trong vận hành bình thường.",
        exec: () => {
          api_Ea_SetMode("MEMIF_MODE_SLOW");
        }
      }
    ],
    whatIfs: [
      {
        label: "1. Gọi Ea_SetMode(FAST) giữa lúc Ea đang MEMIF_BUSY → EA_E_BUSY",
        run: () => {
          api_Ea_Write(1, "12 34 56 78 90 AB CD EF 11 22 33 44");
          api_Ea_SetMode("MEMIF_MODE_FAST");
        }
      },
      {
        label: "2. Tắt EaSetModeSupported = FALSE & gọi Ea_SetMode",
        run: () => {
          ecucConfig.EaSetModeSupported = false;
          api_Ea_SetMode("MEMIF_MODE_FAST");
        }
      },
      {
        label: "3. Đổi EepChunkSizeMode thành 4B (Slow) / 16B (Fast)",
        run: () => {
          ecucConfig.EepChunkSizeMode = "4_16";
          api_Ea_SetMode("MEMIF_MODE_SLOW");
          api_Ea_Write(1, "01 02 03 04 05 06 07 08 09 0A 0B 0C");
          runActiveJobToCompletion(14);
        }
      }
    ]
  },

  {
    id: "S11",
    group: "Nhóm 3: Dữ Liệu Khẩn Cấp (Immediate), SetMode & Polling",
    title: "S11: Đối Chiếu Callback Mode (Ea_JobEndNotification) vs Polling (EaPollingMode)",
    summary: "Phân tích hai cơ chế đồng bộ giữa Ea và Eep Driver: dùng hàm Callback ngắt Ea_JobEndNotification() (EaPollingMode=FALSE) hay hỏi vòng Eep_GetJobResult() trong Ea_MainFunction() (EaPollingMode=TRUE).",
    setup: () => {
      resetEaToInit({ cfgOverrides: { EaPollingMode: false }, selectedEntryId: "BLK1" });
    },
    steps: [
      {
        title: "Nhánh A (Callback Mode · Bit 0=0): Ghi Blk #1 & theo dõi Ea_JobEndNotification",
        desc: "Với EaPollingMode=FALSE, mỗi khi Eep hoàn tất Sub-Job, Eep chủ động gọi ngược lên Ea_JobEndNotification() (xem trên API Call Trace).",
        exec: () => {
          api_Ea_Write(1, "C0 11 22 33 44 55 66 77 88 99 AA BB");
          runActiveJobToCompletion(12);
        }
      },
      {
        title: "Chuyển sang EaPollingMode = TRUE (Bit 0 POLLING = 1)",
        desc: "Trong cấu hình Polling, hai hàm Ea_JobEndNotification / Ea_JobErrorNotification không được dùng; Ea_MainFunction phải tự hỏi Eep_GetJobResult().",
        exec: () => {
          ecucConfig.EaPollingMode = true;
          simState.activeArrows = ["arr_schm_ea", "arr_ea_eep"];
          addTrace("Config Change: EaPollingMode = TRUE", "Tắt Callback từ Eep; bật cơ chế hỏi vòng Eep_GetJobResult() mỗi chu kỳ MainFunction.", "warn");
          updateDerivedRegisters();
        }
      },
      {
        title: "Nhánh B (Polling Mode · Bit 0=1): Đọc Blk #1 qua Eep_GetJobResult()",
        desc: "Quan sát API Trace: thay vì Ea_JobEndNotification(), hệ thống ghi nhận các lệnh Ea_MainFunction() → Eep_GetJobResult() == MEMIF_JOB_OK!",
        exec: () => {
          api_Ea_Read(1, 0, 12);
          runActiveJobToCompletion(10);
        }
      }
    ],
    whatIfs: [
      {
        label: "1. Chạy Ea_Write(1) trọn vẹn ở chế độ Polling Mode",
        run: () => {
          ecucConfig.EaPollingMode = true;
          api_Ea_Write(1, "AA BB CC DD EE FF 11 22 33 44 55 66");
          runActiveJobToCompletion(12);
        }
      },
      {
        label: "2. Chuyển về Callback Mode (EaPollingMode = FALSE)",
        run: () => {
          ecucConfig.EaPollingMode = false;
          updateDerivedRegisters();
        }
      },
      {
        label: "3. Bơm lỗi phần cứng ở Polling Mode (Eep_GetJobResult == FAILED)",
        run: () => {
          ecucConfig.EaPollingMode = true;
          ecucConfig.InjectEepHardwareError = true;
          api_Ea_Read(1, 0, 12);
          runActiveJobToCompletion(8);
        }
      }
    ]
  },

  // -------------------- GROUP 4: CANCEL, HW ERROR & DET --------------------
  {
    id: "S12",
    group: "Nhóm 4: Hủy Lệnh (Cancel), Lỗi Phần Cứng & Kiểm Thử DET",
    title: "S12: Hủy Lệnh Giữa Chừng Bằng Ea_Cancel() → Eep_Cancel() → MEMIF_JOB_CANCELED",
    summary: "Khi cần giải phóng ngay EEPROM cho lệnh khẩn cấp hoặc chuẩn bị tắt nguồn, NvM gọi MemIf_Cancel → Ea_Cancel(). Ea hủy lệnh đang chạy, về MEMIF_IDLE, nhưng khối ghi dở sẽ ở trạng thái INCONSISTENT.",
    setup: () => {
      resetEaToInit({ selectedEntryId: "BLK1" });
    },
    steps: [
      {
        title: "Bắt đầu Ea_Write(1) & chạy Tick #1 (Mới ghi xong Header 0xA5)",
        desc: "Block #1 đang ở trạng thái WRITING (Header=0xA502, Footer=0xFFFF), Ea đang MEMIF_BUSY (Bit 6=1).",
        exec: () => {
          api_Ea_Write(1, "99 88 77 66 55 44 33 22 11 00 AA BB");
          stepClockTick();
        }
      },
      {
        title: "Gọi Ea_Cancel() → Eep_Cancel() → MEMIF_JOB_CANCELED (Bit 0=1)",
        desc: "NvM hủy ngang Job: Ea gọi Eep_Cancel(), đưa trạng thái về MEMIF_IDLE, JobResult=MEMIF_JOB_CANCELED, bật Bit 0 Thanh B và báo NvM_JobErrorNotification().",
        exec: () => {
          api_Ea_Cancel();
        }
      },
      {
        title: "Đọc lại Blk #1 → Phát hiện MEMIF_BLOCK_INCONSISTENT",
        desc: "Vì lệnh ghi trước bị hủy trước khi kịp ghi Footer 0x5A, lần gọi Ea_Read(1) tiếp theo lập tức cảnh báo MEMIF_BLOCK_INCONSISTENT!",
        exec: () => {
          api_Ea_Read(1, 0, 12);
          runActiveJobToCompletion(8);
        }
      }
    ],
    whatIfs: [
      {
        label: "1. Gọi Ea_Cancel() khi đang MEMIF_IDLE → EA_E_INVALID_CANCEL",
        run: () => {
          if (simState.activeJob) api_Ea_Cancel();
          api_Ea_Cancel();
        }
      },
      {
        label: "2. Hủy Blk #1 rồi chèn ngay Ea_Write(5) Immediate Crash Data",
        run: () => {
          if (simState.activeJob) api_Ea_Cancel();
          api_Ea_Write(5, "FF 00 11 22 33 44 55 66 77 88");
          runActiveJobToCompletion(12);
        }
      },
      {
        label: "3. Ghi lại Blk #1 trọn vẹn để phục hồi VALID",
        run: () => {
          api_Ea_Write(1, "12 34 56 78 9A BC DE F0 11 22 33 44");
          runActiveJobToCompletion(12);
        }
      }
    ]
  },

  {
    id: "S13",
    group: "Nhóm 4: Hủy Lệnh (Cancel), Lỗi Phần Cứng & Kiểm Thử DET",
    title: "S13: Lỗi Phần Cứng Eep → Ea_JobErrorNotification() → MEMIF_JOB_FAILED & Dem",
    summary: "Mô phỏng khi chip EEPROM bị lỗi vật lý (SPI đứt dây hoặc ô nhớ hỏng): Eep báo lỗi sản xuất về DEM, gọi Ea_JobErrorNotification(), Ea đặt MEMIF_JOB_FAILED và báo lên NvM để kích hoạt cơ chế Retry.",
    setup: () => {
      resetEaToInit({ cfgOverrides: { InjectEepHardwareError: true }, selectedEntryId: "BLK1" });
    },
    steps: [
      {
        title: "Bật InjectEepHardwareError=TRUE & gọi Ea_Write(1) + Tick #1",
        desc: "Ea tiếp nhận lệnh ghi và đẩy Sub-Job Eep_Write xuống trình điều khiển Eep ở tầng MCAL.",
        exec: () => {
          api_Ea_Write(1, "11 22 33 44 55 66 77 88 99 AA BB CC");
          stepClockTick();
        }
      },
      {
        title: "Tick #2: Eep thất bại → Dem_SetEventStatus(EEP_E_WRITE_FAILED) + Ea_JobErrorNotification",
        desc: "Eep báo lỗi DEM, gọi callback Ea_JobErrorNotification() [SWS_Ea_00096]. Ea đặt MEMIF_JOB_FAILED (Bit 0 ERR_CNC=1) và báo NvM_JobErrorNotification().",
        exec: () => {
          stepClockTick();
        }
      },
      {
        title: "Tắt lỗi phần cứng & NvM thực hiện Retry Ea_Write(1) thành công!",
        desc: "Lỗi nhiễu thoáng qua biến mất: NvM gọi lại Ea_Write(1) và lần này toàn bộ 3 bước ghi hoàn tất sạch sẽ với MEMIF_JOB_OK.",
        exec: () => {
          ecucConfig.InjectEepHardwareError = false;
          api_Ea_Write(1, "11 22 33 44 55 66 77 88 99 AA BB CC");
          runActiveJobToCompletion(12);
        }
      }
    ],
    whatIfs: [
      {
        label: "1. Bơm lỗi phần cứng trong lúc Ea_Read(1) (EEP_E_READ_FAILED)",
        run: () => {
          ecucConfig.InjectEepHardwareError = true;
          api_Ea_Read(1, 0, 12);
          runActiveJobToCompletion(8);
        }
      },
      {
        label: "2. Bơm lỗi phần cứng trong lúc Ea_EraseImmediateBlock(5)",
        run: () => {
          ecucConfig.InjectEepHardwareError = true;
          api_Ea_EraseImmediateBlock(5);
          runActiveJobToCompletion(8);
        }
      },
      {
        label: "3. Xóa lỗi phần cứng & reset về MEMIF_JOB_OK",
        run: () => {
          ecucConfig.InjectEepHardwareError = false;
          api_Ea_Read(1, 0, 12);
          runActiveJobToCompletion(8);
        }
      }
    ]
  },

  {
    id: "S14",
    group: "Nhóm 4: Hủy Lệnh (Cancel), Lỗi Phần Cứng & Kiểm Thử DET",
    title: "S14: Kiểm Thử Toàn Diện DET (0x01..0x05) & Runtime Errors R23-11 (EA_E_BUSY / CANCEL)",
    summary: "Kiểm chứng tất cả chốt bảo vệ tham số Development Errors (Det_ReportError) và Runtime Errors (Det_ReportRuntimeError) của module Ea (ModuleId = 40 / 0x0028) theo SWS_Ea_00049.",
    setup: () => {
      resetEaToInit({ selectedEntryId: "BLK1" });
    },
    steps: [
      {
        title: "1. Lỗi EA_E_UNINIT (0x01): Gọi Ea_Read khi chưa Ea_Init()",
        desc: "Tắt EaInitialized=FALSE (Bit 7=0) rồi gọi Ea_Read(1, 0, 4) → Phát Det_ReportError(40, 0, 0x02, EA_E_UNINIT).",
        exec: () => {
          ecucConfig.EaInitialized = false;
          simState.initialized = false;
          simState.moduleStatus = "MEMIF_UNINIT";
          api_Ea_Read(1, 0, 4);
        }
      },
      {
        title: "2. Lỗi 0x02..0x05: BlockNo, BlockOffset, NULL_PTR & BlockLen",
        desc: "Khôi phục Ea_Init(), sau đó thử gọi sai BlockNumber=0xFFFF (0x02), Offset>=Size (0x03), NULL_PTR (0x04) và Length vượt giới hạn (0x05).",
        exec: () => {
          api_Ea_Init(true);
          api_Ea_Read(0xFFFF, 0, 4);        // 0x02 EA_E_INVALID_BLOCK_NO
          api_Ea_Read(1, 20, 4);            // 0x03 EA_E_INVALID_BLOCK_OFS
          api_Ea_Write(1, "", true);        // 0x04 EA_E_INVALID_DATA_PTR
          api_Ea_Read(1, 8, 8);             // 0x05 EA_E_INVALID_BLOCK_LEN
        }
      },
      {
        title: "3. Runtime Error EA_E_BUSY (0x06): Gọi đè lệnh khi đang MEMIF_BUSY",
        desc: "Khởi chạy Ea_Write(1) (MEMIF_BUSY), rồi gọi ngay Ea_Write(2) khi Job 1 chưa xong → Det_ReportRuntimeError(40, 0, 0x03, EA_E_BUSY).",
        exec: () => {
          api_Ea_Write(1, "11 22 33 44 55 66 77 88 99 AA BB CC");
          api_Ea_Write(2, "AA BB CC DD EE FF 00 11");
        }
      },
      {
        title: "4. Runtime Error EA_E_INVALID_CANCEL (0x08): Cancel khi đang MEMIF_IDLE",
        desc: "Hủy Job 1 bằng Ea_Cancel() (đưa về MEMIF_IDLE), rồi gọi tiếp Ea_Cancel() lần 2 → Det_ReportRuntimeError(40, 0, 0x04, EA_E_INVALID_CANCEL).",
        exec: () => {
          api_Ea_Cancel(); // cancels active job 1 cleanly
          api_Ea_Cancel(); // invalid cancel while IDLE -> 0x08
        }
      }
    ],
    whatIfs: [
      {
        label: "1. Bắn liên hoàn 5 Development Errors (0x01..0x05)",
        run: () => {
          ecucConfig.EaInitialized = false;
          simState.initialized = false;
          simState.moduleStatus = "MEMIF_UNINIT";
          api_Ea_Read(1, 0, 4);
          api_Ea_Init(true);
          api_Ea_EraseImmediateBlock(1);
          api_Ea_Read(1, 15, 2);
          api_Ea_GetVersionInfo(true);
          api_Ea_Read(1, 10, 6);
        }
      },
      {
        label: "2. Bắn chuỗi Runtime Errors (EA_E_BUSY + EA_E_INVALID_CANCEL)",
        run: () => {
          api_Ea_Init(true);
          api_Ea_Write(1, "12 34 56 78 90 AB CD EF 11 22 33 44");
          api_Ea_Read(2, 0, 4);
          api_Ea_Cancel();
          api_Ea_Cancel();
        }
      },
      {
        label: "3. Tắt EaDevErrorDetect = FALSE & thử truyền NULL_PTR",
        run: () => {
          ecucConfig.EaDevErrorDetect = false;
          api_Ea_Init(true);
          api_Ea_Read(1, 0, 4, true);
        }
      }
    ]
  }
];
