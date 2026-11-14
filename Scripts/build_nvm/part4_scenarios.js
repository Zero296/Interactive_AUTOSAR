// ================= PART 4B: 14 SCENARIOS (S1..S14) x 3 WHAT-IFS (42 CASES) =================

const SCENARIOS = [
  // -------------------- GROUP 1: STARTUP, READALL, EXPLICIT SYNC & DATASET --------------------
  {
    id: "S1",
    group: "Nhóm 1: Khởi Động, ReadAll & Đồng Bộ",
    title: "S1: Boot-Up NvM_Init() & NvM_ReadAll() (ConfigId, MEMIF_FAST & BswM)",
    summary: "Mô tả trình tự khởi động chuẩn AUTOSAR: EcuM gọi NvM_Init(), BswM kích hoạt NvM_ReadAll(), chuyển MemIf sang MEMIF_MODE_FAST để nạp Block #1 (ConfigId) và toàn bộ khối SelectForReadAll về RAM trước khi báo BswM hoàn tất.",
    setup() {
      ecucConfig = Object.assign({}, defaultConfig, {
        NvMInitialized: false,
        NvMDrvModeSwitch: true,
        NvMBswMJobStatusInfo: true,
        NvMDynamicConfiguration: true,
        NvMConfigIdComparison: "0xA55A / 0xA55A"
      });
      simState = createInitialSimState();
      simState.jobState = "NVM_UNINIT";
      simState.blocks.forEach(b => { if (b.id > 0) { b.ramValid = false; b.ramChanged = false; b.ramData = b.ramData.map(() => 0x00); } });
      syncBlockToEcuc(1);
      syncConfigToDOM();
      updateDerivedRegisters();
    },
    steps: [
      {
        title: "Bước 1: EcuM_AL_DriverInitTwo() gọi NvM_Init(NULL_PTR)",
        detail: "Khởi tạo toàn bộ bảng Admin Block (#0..#5), đặt DataIndex = 0, xóa sạch hàng đợi Immediate/Standard Queue và bật bit Thanh B Bit 7 (NVM_INIT = 1).",
        inputSrc: "EcuM Init Table",
        outputDst: "NvM Admin Blocks & Queues",
        apiCall: "NvM_Init(NULL_PTR)",
        highlightMod: "MOD_NVM",
        arrows: ["arr_bswm_nvm"],
        action() { api_NvM_Init(); }
      },
      {
        title: "Bước 2: BswM gọi NvM_ReadAll() & chuyển MemIf_SetMode(FAST)",
        detail: "NvM nhận Multi-Block Job trên Block #0, bật NvMDrvModeSwitch -> chuyển Fee/Fls sang MEMIF_MODE_FAST và báo BswM_NvM_CurrentJobMode(NVM_READ_ALL, NVM_REQ_PENDING).",
        inputSrc: "BswM Startup Rule",
        outputDst: "Block #0 MultiJob & MemIf FAST",
        apiCall: "NvM_ReadAll() -> MemIf_SetMode(MEMIF_MODE_FAST)",
        highlightMod: "MOD_BSWM",
        arrows: ["arr_bswm_nvm", "arr_nvm_bswm", "arr_nvm_memif"],
        action() { api_NvM_ReadAll(); }
      },
      {
        title: "Bước 3: Đọc Block #1 ConfigId_CompiledSw & đối chiếu phiên bản SW",
        detail: "ReadAll luôn ưu tiên đọc Block #1 trước tiên. Compiled ConfigId = 0xA55A khớp với Stored ConfigId = 0xA55A -> giữ nguyên dữ liệu NV hợp lệ của ECU.",
        inputSrc: "NV Copy #0/#1 (Block #1)",
        outputDst: "NvM Dynamic Config Check",
        apiCall: "NvM_MainFunction() -> Read Block #1 (ConfigId=0xA55A)",
        highlightMod: "MOD_MEMIF",
        arrows: ["arr_nvm_memif", "arr_memif_fee", "arr_fee_fls", "arr_fls_nvm"],
        action() { stepClockTick(10); }
      },
      {
        title: "Bước 4: Tiếp tục nạp các khối còn lại (#2 Calib, #3 Odometer) qua Fee/Fls",
        detail: "NvM tuần tự đọc và kiểm tra CRC cho từng khối được đánh dấu NvMSelectBlockForReadAll=TRUE (chú ý Dataset #4 và Immediate Crash #5 có cấu hình riêng).",
        inputSrc: "DFlash (Fls -> Fee -> MemIf)",
        outputDst: "RAM Blocks #2, #3",
        apiCall: "NvM_MainFunction() -> Read #2 & #3",
        highlightMod: "MOD_FEE",
        arrows: ["arr_nvm_memif", "arr_memif_fee", "arr_fee_fls", "arr_nvm_crc"],
        action() { stepClockTick(10); stepClockTick(10); }
      },
      {
        title: "Bước 5: ReadAll hoàn tất -> MemIf_SetMode(SLOW) & báo BswM OK",
        detail: "NvM khôi phục MemIf_SetMode(MEMIF_MODE_SLOW) để giảm tải CPU trong runtime và phát BswM_NvM_CurrentJobMode(NVM_READ_ALL, NVM_REQ_OK) để RTE bắt đầu chạy.",
        inputSrc: "NvM Multi-Block FSM",
        outputDst: "BswM & MemIf SLOW",
        apiCall: "MultiBlockCbk(NVM_READ_ALL, NVM_REQ_OK) + BswM_NvM_CurrentJobMode",
        highlightMod: "MOD_BSWM",
        arrows: ["arr_nvm_bswm", "arr_nvm_memif"],
        action() { stepClockTick(10); stepClockTick(10); }
      }
    ],
    whatIfs: [
      {
        label: "🔄 What-If 1: Lệch ConfigId (0xB202 ≠ 0xA55A)",
        run() {
          ecucConfig.NvMConfigIdComparison = "0xB202 / 0xA55A";
          ecucConfig.NvMDynamicConfiguration = true;
          simState.blocks[3].resistantToChangedSw = false;
          syncConfigToDOM();
          api_NvM_ReadAll();
          stepClockTick(10);
          if (typeof renderAll === "function") renderAll();
        }
      },
      {
        label: "🐢 What-If 2: Tắt NvMDrvModeSwitch (SLOW)",
        run() {
          ecucConfig.NvMDrvModeSwitch = false;
          simState.memIfMode = "MEMIF_MODE_SLOW";
          syncConfigToDOM();
          api_NvM_ReadAll();
          if (typeof renderAll === "function") renderAll();
        }
      },
      {
        label: "🔕 What-If 3: Tắt BswM Job Status Callback",
        run() {
          ecucConfig.NvMBswMJobStatusInfo = false;
          syncConfigToDOM();
          api_NvM_ReadAll();
          for (let i = 0; i < 6; i++) stepClockTick(10);
          if (typeof renderAll === "function") renderAll();
        }
      }
    ]
  },

  {
    id: "S2",
    group: "Nhóm 1: Khởi Động, ReadAll & Đồng Bộ",
    title: "S2: Đọc Khối Đơn Lẻ Bất Đồng Bộ (ReadBlock/PRAM → MemIf → Fee → Fls → CRC)",
    summary: "Theo dõi đầy đủ đường đi bất đồng bộ của một lời gọi đọc đơn lẻ trên Block #3 (Odometer): đẩy vào Standard Queue -> MemIf_Read -> Fee_Read -> Fls_Read -> kiểm tra Static ID + CRC-16 -> trả kết quả NVM_REQ_OK qua callback.",
    setup() {
      ecucConfig = Object.assign({}, defaultConfig, { SelectedBlockId: "3" });
      simState = createInitialSimState();
      simState.blocks[3].ramData = [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
      simState.blocks[3].ramValid = false;
      recomputeBlockMetadata(simState.blocks[3]);
      syncBlockToEcuc(3);
      syncConfigToDOM();
      updateDerivedRegisters();
    },
    steps: [
      {
        title: "Bước 1: SWC gọi NvM_ReadBlock(3, DstPtr) qua RTE",
        detail: "Yêu cầu được kiểm tra Init/Param/Pending, xếp vào Standard Queue với Priority=2, đặt Block #3 thành NVM_REQ_PENDING và kích hoạt MemIf_Read().",
        inputSrc: "SWC_App / RTE",
        outputDst: "Standard Queue + MemIf_Read",
        apiCall: "NvM_ReadBlock(3, &OdoRamBuf)",
        highlightMod: "MOD_SWC",
        arrows: ["arr_swc_rte", "arr_rte_nvm", "arr_nvm_memif", "arr_memif_fee"],
        action() { api_NvM_ReadBlock(3, false); }
      },
      {
        title: "Bước 2: Tầng Fee & MCAL Fls thực thi bất đồng bộ (MEMIF_BUSY)",
        detail: "MemIf định tuyến đến Fee (Device 0). Fee định vị bản ghi mới nhất trong DFlash Sector và gọi Fls_Read(). Trong chu kỳ MainFunction này tầng dưới vẫn đang MEMIF_BUSY.",
        inputSrc: "NvM MainFunction (+10ms)",
        outputDst: "Fee -> Fls Hardware",
        apiCall: "Fls_MainFunction() -> Fee_MainFunction() [MEMIF_BUSY]",
        highlightMod: "MOD_FLS",
        arrows: ["arr_memif_fee", "arr_fee_fls"],
        action() { stepClockTick(10); }
      },
      {
        title: "Bước 3: Fls hoàn tất, CRC-16 & Static ID khớp 100% -> NVM_REQ_OK",
        detail: "Fls gọi Fee_JobEndNotification() -> NvM_JobEndNotification(). NvM kiểm tra Static ID = 3 và CRC-16 khớp -> chép 8 byte vào RAM, bật VALID_RAM=1 và gọi SingleBlockCallback(NVM_REQ_OK).",
        inputSrc: "Fls + Crc Engine",
        outputDst: "Permanent RAM Block #3 + RTE",
        apiCall: "NvM_JobEndNotification() -> SingleBlockCbk(READ, NVM_REQ_OK)",
        highlightMod: "MOD_CRC",
        arrows: ["arr_fls_nvm", "arr_nvm_crc", "arr_nvm_rte"],
        action() { stepClockTick(10); }
      }
    ],
    whatIfs: [
      {
        label: "📌 What-If 1: Dùng R23-11 NvM_ReadPRAMBlock(3)",
        run() {
          api_NvM_ReadBlock(3, true);
          stepClockTick(10);
          stepClockTick(10);
          if (typeof renderAll === "function") renderAll();
        }
      },
      {
        label: "⛔ What-If 2: Gọi Read lần 2 khi PENDING (DET)",
        run() {
          api_NvM_ReadBlock(3, false);
          api_NvM_ReadBlock(3, false);
          if (typeof renderAll === "function") renderAll();
        }
      },
      {
        label: "🔓 What-If 3: Tắt CRC Check khi đọc",
        run() {
          ecucConfig.NvMBlockUseCrc = false;
          onConfigInputChanged("NvMBlockUseCrc");
          api_NvM_ReadBlock(3, false);
          stepClockTick(10);
          stepClockTick(10);
          if (typeof renderAll === "function") renderAll();
        }
      }
    ]
  },

  {
    id: "S3",
    group: "Nhóm 1: Khởi Động, ReadAll & Đồng Bộ",
    title: "S3: Đồng Bộ Gương Tường Minh Explicit Sync (NvM Mirror & RepeatMirrorOps)",
    summary: "Khi SWC truy cập cấu trúc RAM đa biến không thể khóa ngắt lâu, NvM cấp bộ đệm trung gian Mirror (NvMBlockUseSyncMechanism=TRUE). Nếu SWC trả về E_NOT_OK vì đang bận cập nhật, NvM tự thử lại tối đa NvMRepeatMirrorOperations lần.",
    setup() {
      ecucConfig = Object.assign({}, defaultConfig, { SelectedBlockId: "2" });
      simState = createInitialSimState();
      const b2 = simState.blocks[2];
      b2.useSyncMechanism = true;
      b2.repeatMirrorOps = 3;
      b2.crcCompMechanism = false;
      b2.ramData = [0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 0x99];
      b2.ramChanged = true;
      recomputeBlockMetadata(b2);
      ecucConfig.InjectMirrorBusyConflict = true;
      syncBlockToEcuc(2);
      syncConfigToDOM();
      updateDerivedRegisters();
    },
    steps: [
      {
        title: "Bước 1: Kích hoạt NvM_WriteBlock(2, NULL_PTR) với SyncMechanism=TRUE",
        detail: "NvM đưa job ghi Block #2 vào hàng đợi và chuẩn bị gọi callback NvMWriteRamBlockToNvMCallback để sao chép nguyên tử từ RAM SWC sang NvM Internal Mirror.",
        inputSrc: "SWC_Calib -> RTE",
        outputDst: "NvM Mirror Sync FSM",
        apiCall: "NvM_WriteBlock(2, NULL_PTR) [UseSyncMechanism=TRUE]",
        highlightMod: "MOD_RTE",
        arrows: ["arr_swc_rte", "arr_rte_nvm", "arr_nvm_rte"],
        action() { api_NvM_WriteBlock(2, false); }
      },
      {
        title: "Bước 2: SWC đang cập nhật RAM -> Mirror Callback trả E_NOT_OK (Retry)",
        detail: "Xung đột truy cập RAM xảy ra! SWC trả E_NOT_OK ở chu kỳ 1 và 2. NvM không hủy job mà trừ bộ đếm NvMRepeatMirrorOperations (3 -> 2 -> 1) và chờ MainFunction sau.",
        inputSrc: "SWC WriteRamBlockToNvMCbk",
        outputDst: "NvM Retry Counter (Mirror)",
        apiCall: "NvMWriteRamBlockToNvMCbk() -> E_NOT_OK (Busy Retry)",
        highlightMod: "MOD_SWC",
        arrows: ["arr_swc_rte", "arr_rte_nvm"],
        action() { stepClockTick(10); stepClockTick(10); }
      },
      {
        title: "Bước 3: SWC rảnh -> Copy nguyên tử sang Mirror & bật SYNC_OK = 1",
        detail: "Khi InjectMirrorBusyConflict được giải phóng, callback trả E_OK, sao chép nguyên tử 8 bytes sang NvM Mirror, bật bit EXPLICIT_SYNC_OK (Bit 0 Thanh A) rồi tính CRC-32.",
        inputSrc: "SWC RAM -> NvM Mirror",
        outputDst: "Crc Module -> MemIf_Write",
        apiCall: "WriteRamBlockToNvMCbk() -> E_OK -> CRC32 -> MemIf_Write",
        highlightMod: "MOD_NVM",
        arrows: ["arr_swc_rte", "arr_rte_nvm", "arr_nvm_crc", "arr_nvm_memif"],
        action() {
          ecucConfig.InjectMirrorBusyConflict = false;
          syncConfigToDOM();
          stepClockTick(10);
          stepClockTick(10);
        }
      },
      {
        title: "Bước 4: Ghi Flash hoàn tất an toàn từ NvM Mirror -> WriteVerify OK",
        detail: "Dữ liệu trong suốt quá trình ghi Flash được lấy từ NvM Mirror bất biến, giúp SWC hoàn toàn tự do sửa RAM riêng mà không sợ rách dữ liệu (torn read/write).",
        inputSrc: "MemIf -> Fee -> Fls",
        outputDst: "NV Copy #0 & WriteVerify",
        apiCall: "WriteVerification Passed -> NVM_REQ_OK",
        highlightMod: "MOD_FEE",
        arrows: ["arr_nvm_memif", "arr_memif_fee", "arr_fee_fls", "arr_fls_nvm", "arr_nvm_rte"],
        action() { stepClockTick(10); stepClockTick(10); stepClockTick(10); }
      }
    ],
    whatIfs: [
      {
        label: "💥 What-If 1: Vượt quá RepeatMirrorOperations -> Lỗi",
        run() {
          ecucConfig.InjectMirrorBusyConflict = true;
          simState.blocks[2].repeatMirrorOps = 2;
          syncConfigToDOM();
          api_NvM_WriteBlock(2, false);
          for (let i = 0; i < 4; i++) stepClockTick(10);
          if (typeof renderAll === "function") renderAll();
        }
      },
      {
        label: "📖 What-If 2: ReadBlock(2) gọi ReadRamBlockFromNvMCbk",
        run() {
          ecucConfig.InjectMirrorBusyConflict = false;
          syncConfigToDOM();
          api_NvM_ReadBlock(2, false);
          for (let i = 0; i < 3; i++) stepClockTick(10);
          if (typeof renderAll === "function") renderAll();
        }
      },
      {
        label: "🔓 What-If 3: Tắt SyncMechanism (Direct RAM)",
        run() {
          ecucConfig.NvMBlockUseSyncMechanism = false;
          onConfigInputChanged("NvMBlockUseSyncMechanism");
          api_NvM_WriteBlock(2, false);
          for (let i = 0; i < 5; i++) stepClockTick(10);
          if (typeof renderAll === "function") renderAll();
        }
      }
    ]
  },

  {
    id: "S4",
    group: "Nhóm 1: Khởi Động, ReadAll & Đồng Bộ",
    title: "S4: Quản Lý Khối NVM_BLOCK_DATASET (NvM_SetDataIndex & Ánh Xạ NV/ROM)",
    summary: "Minh họa khối Variant_Coding (#4) quản lý 3 NV slots (Index 0: EU, 1: US, 2: JP) + 2 ROM slots (Index 3 & 4). Chọn sai vùng ROM khi gọi WriteBlock() sẽ bị chặn DET NVM_E_PARAM_BLOCK_DATA_IDX.",
    setup() {
      ecucConfig = Object.assign({}, defaultConfig, { SelectedBlockId: "4" });
      simState = createInitialSimState();
      syncBlockToEcuc(4);
      syncConfigToDOM();
      updateDerivedRegisters();
    },
    steps: [
      {
        title: "Bước 1: Đọc Dataset Index 0 (EU_Gasoline) mặc định",
        detail: "Ở trạng thái ban đầu DataIndex=0. Lệnh NvM_ReadBlock(4) ánh xạ vào NV Slot #0 của Fee và nạp 6 byte cấu hình EU_Gasoline vào RAM.",
        inputSrc: "Dataset NV Slot #0",
        outputDst: "RAM Block #4",
        apiCall: "NvM_SetDataIndex(4, 0) + NvM_ReadBlock(4)",
        highlightMod: "MOD_FEE",
        arrows: ["arr_rte_nvm", "arr_nvm_memif", "arr_memif_fee", "arr_fls_nvm"],
        action() { api_NvM_SetDataIndex(4, 0); api_NvM_ReadBlock(4, false); stepClockTick(10); stepClockTick(10); }
      },
      {
        title: "Bước 2: NvM_SetDataIndex(4, 1) -> chuyển sang cấu hình US_Hybrid",
        detail: "SWC chuyển DataIndex sang 1 rồi gọi ReadBlock(4). NvM cộng offset Dataset Index=1 để đọc bộ dữ liệu US_Hybrid từ NV Slot #1 mà không cần khai báo thêm Block ID.",
        inputSrc: "Dataset NV Slot #1",
        outputDst: "RAM Block #4",
        apiCall: "NvM_SetDataIndex(4, 1) -> NvM_ReadBlock(4)",
        highlightMod: "MOD_NVM",
        arrows: ["arr_swc_rte", "arr_rte_nvm", "arr_nvm_memif", "arr_fls_nvm"],
        action() { api_NvM_SetDataIndex(4, 1); api_NvM_ReadBlock(4, false); stepClockTick(10); stepClockTick(10); }
      },
      {
        title: "Bước 3: Chuyển sang Index 3 (ROM Read-Only) -> Đọc OK nhưng Write bị DET",
        detail: "Index >= nvBlockNum (3..4) ánh xạ vào vùng ROM chỉ đọc! Đọc từ Index 3 khôi phục ROM thành công, nhưng thử gọi NvM_WriteBlock(4) lập tức bị chặn DET NVM_E_PARAM_BLOCK_DATA_IDX.",
        inputSrc: "Dataset ROM Slot #3",
        outputDst: "RAM + DET Trap",
        apiCall: "NvM_SetDataIndex(4, 3) -> Read OK | Write -> DET 0x0C",
        highlightMod: "MOD_DET",
        arrows: ["arr_nvm_rte", "arr_nvm_det"],
        action() { api_NvM_SetDataIndex(4, 3); api_NvM_ReadBlock(4, false); stepClockTick(10); api_NvM_WriteBlock(4, false); }
      }
    ],
    whatIfs: [
      {
        label: "🇯🇵 What-If 1: Chuyển Index=2 (JP_EV) & Đọc",
        run() {
          api_NvM_SetDataIndex(4, 2);
          api_NvM_ReadBlock(4, false);
          stepClockTick(10);
          stepClockTick(10);
          if (typeof renderAll === "function") renderAll();
        }
      },
      {
        label: "💾 What-If 2: Sửa RAM & Ghi đè vào NV Slot #1",
        run() {
          api_NvM_SetDataIndex(4, 1);
          simState.blocks[4].ramData[5] = 0xAA;
          api_NvM_WriteBlock(4, false);
          stepClockTick(10);
          stepClockTick(10);
          stepClockTick(10);
          if (typeof renderAll === "function") renderAll();
        }
      },
      {
        label: "🚨 What-If 3: Thử DataIndex=7 vượt giới hạn (DET)",
        run() {
          api_NvM_SetDataIndex(4, 7);
          if (typeof renderAll === "function") renderAll();
        }
      }
    ]
  },

  // -------------------- GROUP 2: WRITE, CRC COMPARE, VERIFY, PREEMPTION & WRITEALL --------------------
  {
    id: "S5",
    group: "Nhóm 2: Ghi, CRC Compare, Verify & Queue",
    title: "S5: NvM_SetRamBlockStatus(TRUE) & NvM_WriteBlock (REDUNDANT NV #0/#1)",
    summary: "Giải thích vai trò của NvM_SetRamBlockStatus(TRUE) đối với Permanent RAM Block (bật VALID_RAM & CHANGED_SW) và cách NvM_WriteBlock ghi tuần tự cả hai bản sao NV #0 và NV #1 của khối Odometer (REDUNDANT).",
    setup() {
      ecucConfig = Object.assign({}, defaultConfig, { SelectedBlockId: "3", NvMBlockUseCrcCompMechanism: false });
      simState = createInitialSimState();
      simState.blocks[3].crcCompMechanism = false;
      syncBlockToEcuc(3);
      syncConfigToDOM();
      updateDerivedRegisters();
    },
    steps: [
      {
        title: "Bước 1: SWC tăng Odometer & gọi NvM_SetRamBlockStatus(3, TRUE)",
        detail: "Sau khi cập nhật dữ liệu mới trên RAM Block #3, SWC báo cho NvM biết RAM vừa hợp lệ vừa thay đổi (VALID_RAM=1, CHANGED_SW=1) trong Thanh A.",
        inputSrc: "SWC Odometer",
        outputDst: "Thanh A (Bit 7 & Bit 6)",
        apiCall: "NvM_SetRamBlockStatus(3, TRUE)",
        highlightMod: "MOD_SWC",
        arrows: ["arr_swc_rte", "arr_rte_nvm"],
        action() { api_NvM_SetRamBlockStatus(3, true); }
      },
      {
        title: "Bước 2: Gọi NvM_WriteBlock(3) -> Tính CRC-16 + Static ID & Ghi NV #0",
        detail: "NvM tính CRC-16 mới bao gồm Static Block ID=3 rồi gọi MemIf_Write() ghi bản sao thứ nhất NV #0 của khối Odometer_Redundant.",
        inputSrc: "NvM Core + Crc Module",
        outputDst: "MemIf -> Fee (NV Copy #0)",
        apiCall: "NvM_WriteBlock(3, Dst) -> MemIf_Write(NV #0)",
        highlightMod: "MOD_CRC",
        arrows: ["arr_nvm_crc", "arr_nvm_memif", "arr_memif_fee", "arr_fee_fls"],
        action() { api_NvM_WriteBlock(3, false); stepClockTick(10); stepClockTick(10); }
      },
      {
        title: "Bước 3: Hoàn tất NV #0 -> Tự động ghi bản sao kép NV #1 & WriteVerify",
        detail: "Vì Block #3 là NVM_BLOCK_REDUNDANT, NvM tiếp tục ghi đồng bộ NV #1, chạy WriteVerification đọc ngược đối chiếu rồi xóa cờ CHANGED_SW=0.",
        inputSrc: "NvM Redundant State Machine",
        outputDst: "NV Copy #1 + SWC Callback",
        apiCall: "MemIf_Write(NV #1) -> WriteVerify -> NVM_REQ_OK",
        highlightMod: "MOD_NVM",
        arrows: ["arr_nvm_memif", "arr_memif_fee", "arr_fee_fls", "arr_fls_nvm", "arr_nvm_rte"],
        action() { stepClockTick(10); stepClockTick(10); stepClockTick(10); stepClockTick(10); }
      }
    ],
    whatIfs: [
      {
        label: "⛔ What-If 1: Tắt UseSetRamBlockStatus -> DET",
        run() {
          ecucConfig.NvMBlockUseSetRamBlockStatus = false;
          onConfigInputChanged("NvMBlockUseSetRamBlockStatus");
          api_NvM_SetRamBlockStatus(3, true);
          if (typeof renderAll === "function") renderAll();
        }
      },
      {
        label: "🏷️ What-If 2: Chỉ gắn Dirty chờ WriteAll lúc tắt máy",
        run() {
          api_NvM_SetRamBlockStatus(3, true);
          if (typeof renderAll === "function") renderAll();
        }
      },
      {
        label: "🔐 What-If 3: Bật AutoValidation trước WriteAll",
        run() {
          ecucConfig.NvMBlockUseAutoValidation = true;
          onConfigInputChanged("NvMBlockUseAutoValidation");
          simState.blocks[3].ramData[0] = 0x77;
          api_NvM_ValidateAll();
          if (typeof renderAll === "function") renderAll();
        }
      }
    ]
  },

  {
    id: "S6",
    group: "Nhóm 2: Ghi, CRC Compare, Verify & Queue",
    title: "S6: Chống Mòn Flash (CRC Compare Skip) & Đọc Ngược Kiểm Chứng (WriteVerify)",
    summary: "So sánh trực quan hai tình huống khi gọi NvM_WriteBlock(3): (A) RAM giống hệt NV -> CRC Compare khớp -> BỎ QUA MemIf_Write() chống mòn Flash; (B) RAM khác NV -> Ghi Flash thật + Đọc ngược WriteVerification.",
    setup() {
      ecucConfig = Object.assign({}, defaultConfig, { SelectedBlockId: "3" });
      simState = createInitialSimState();
      simState.blocks[3].crcCompMechanism = true;
      simState.blocks[3].writeVerification = true;
      syncBlockToEcuc(3);
      syncConfigToDOM();
      updateDerivedRegisters();
    },
    steps: [
      {
        title: "Bước 1: Gọi NvM_WriteBlock(3) khi RAM chưa thay đổi so với NV",
        detail: "SWC gửi lệnh ghi định kỳ với dữ liệu giống y hệt giá trị đang nằm trên NV Flash. NvM chuyển sang giai đoạn tính CRC-16 trước khi chạm tới MemIf.",
        inputSrc: "SWC Periodic Write",
        outputDst: "Crc Calculation Stage",
        apiCall: "NvM_WriteBlock(3) [RAM == NV]",
        highlightMod: "MOD_CRC",
        arrows: ["arr_swc_rte", "arr_rte_nvm", "arr_nvm_crc"],
        action() { api_NvM_WriteBlock(3, false); }
      },
      {
        title: "Bước 2: CRC Compare Match -> BỎ QUA MemIf_Write (Bit CRC_COMP_SKIP=1)",
        detail: "Crc Engine tính ra mã CRC-16 khớp 100% với CRC lưu ở NV #0! Cơ chế NvMBlockUseCrcCompMechanism lập tức dừng ghi phần cứng, giữ nguyên WriteCount và trả về NVM_REQ_OK!",
        inputSrc: "Crc Engine (RAM == NV CRC)",
        outputDst: "SWC Callback (Skip Hardware Write)",
        apiCall: "CRC Match -> SKIP MemIf_Write() -> NVM_REQ_OK",
        highlightMod: "MOD_NVM",
        arrows: ["arr_nvm_crc", "arr_nvm_rte"],
        action() { stepClockTick(10); }
      },
      {
        title: "Bước 3: Đổi 1 byte RAM & gọi lại WriteBlock -> CRC khác -> Ghi + WriteVerify",
        detail: "Lần này RAM đã khác NV! CRC Compare không khớp nên NvM thực hiện ghi thật xuống NV #0 & #1, sau đó bật phase WRITE_VERIFY đọc ngược Flash đối chiếu từng byte!",
        inputSrc: "Modified RAM Block #3",
        outputDst: "MemIf_Write + WriteVerify Readback",
        apiCall: "CRC Mismatch -> MemIf_Write() -> Readback Verify -> OK",
        highlightMod: "MOD_FEE",
        arrows: ["arr_nvm_memif", "arr_memif_fee", "arr_fee_fls", "arr_fls_nvm", "arr_nvm_rte"],
        action() {
          simState.blocks[3].ramData[3] = (simState.blocks[3].ramData[3] + 1) & 0xFF;
          recomputeBlockMetadata(simState.blocks[3]);
          api_NvM_WriteBlock(3, false);
          for (let i = 0; i < 6; i++) stepClockTick(10);
        }
      }
    ],
    whatIfs: [
      {
        label: "🔥 What-If 1: Tắt CrcCompMechanism (Gây mòn Flash)",
        run() {
          ecucConfig.NvMBlockUseCrcCompMechanism = false;
          onConfigInputChanged("NvMBlockUseCrcCompMechanism");
          api_NvM_WriteBlock(3, false);
          for (let i = 0; i < 6; i++) stepClockTick(10);
          if (typeof renderAll === "function") renderAll();
        }
      },
      {
        label: "⚡ What-If 2: Tắt WriteVerification (Ghi nhanh hơn)",
        run() {
          ecucConfig.NvMWriteVerification = false;
          onConfigInputChanged("NvMWriteVerification");
          simState.blocks[3].ramData[2] ^= 0x11;
          api_NvM_WriteBlock(3, false);
          for (let i = 0; i < 5; i++) stepClockTick(10);
          if (typeof renderAll === "function") renderAll();
        }
      },
      {
        label: "🛡️ What-If 3: Thử lại chế độ CRC Skip trên Block #2",
        run() {
          syncBlockToEcuc(2);
          syncConfigToDOM();
          api_NvM_WriteBlock(2, false);
          stepClockTick(10);
          if (typeof renderAll === "function") renderAll();
        }
      }
    ]
  },

  {
    id: "S7",
    group: "Nhóm 2: Ghi, CRC Compare, Verify & Queue",
    title: "S7: Immediate Preemption (Prio=0 MemIf_Cancel Cắt Ngang Standard Queue)",
    summary: "Kịch bản thời gian thực đặc trưng nhất của NvM: Khối Calib (#2, Prio=4) đang ghi Flash ở tầng MemIf/Fee thì cảm biến va chạm gọi NvM_WriteBlock(5) với Priority=0 (Immediate). NvM gọi MemIf_Cancel(), ghi xong Crash trước, rồi tự động Resume lại khối Calib!",
    setup() {
      ecucConfig = Object.assign({}, defaultConfig, { SelectedBlockId: "2", NvMJobPrioritization: true });
      simState = createInitialSimState();
      simState.blocks[2].crcCompMechanism = false;
      simState.blocks[2].ramData[0] = 0xAA;
      simState.blocks[5].ramData[0] = 0xE9;
      recomputeBlockMetadata(simState.blocks[2]);
      recomputeBlockMetadata(simState.blocks[5]);
      syncBlockToEcuc(2);
      syncConfigToDOM();
      updateDerivedRegisters();
    },
    steps: [
      {
        title: "Bước 1: Block #2 Calib_EngineMap (Prio=4) bắt đầu ghi MemIf_Write()",
        detail: "Job thường của khối #2 rời Standard Queue xuống tầng MemIf -> Fee -> Fls. Thiết bị Flash đang bận (MEMIF_BUSY).",
        inputSrc: "Standard Queue (Prio=4)",
        outputDst: "MemIf -> Fee -> Fls (BUSY)",
        apiCall: "NvM_WriteBlock(2) -> MemIf_Write(Blk #2)",
        highlightMod: "MOD_MEMIF",
        arrows: ["arr_rte_nvm", "arr_nvm_memif", "arr_memif_fee"],
        action() { api_NvM_WriteBlock(2, false); stepClockTick(10); }
      },
      {
        title: "Bước 2: Va chạm xảy ra! Block #5 (Prio=0) gọi MemIf_Cancel() cắt ngang!",
        detail: "NvM đẩy Block #5 vào Immediate Priority Queue, phát hiện Job thường đang chạy -> lập tức gọi MemIf_Cancel(), đóng băng Blk #2 vào suspendedJob và bật Bit IMM_PRIO_PREEMPT (Bit 5 Thanh B)!",
        inputSrc: "Safety / Crash SWC (Prio=0)",
        outputDst: "Immediate Queue -> MemIf_Cancel(Blk #2)",
        apiCall: "NvM_WriteBlock(5 [IMM]) -> MemIf_Cancel() -> Preempt!",
        highlightMod: "MOD_NVM",
        arrows: ["arr_swc_rte", "arr_rte_nvm", "arr_nvm_memif"],
        action() { api_NvM_WriteBlock(5, false); }
      },
      {
        title: "Bước 3: Hoàn tất ghi khẩn cấp Crash_EventRecord (Blk #5) + WriteVerify",
        detail: "Toàn bộ 8 byte dữ liệu hộp đen Crash được ưu tiên tuyệt đối ghi xuống DFlash và kiểm chứng toàn vẹn ngay trước khi nguồn tụ ECU cạn kiệt.",
        inputSrc: "Immediate Queue (Blk #5)",
        outputDst: "Flash Immediate Sector",
        apiCall: "MemIf_Write(Blk #5) -> WriteVerify -> NVM_REQ_OK",
        highlightMod: "MOD_FLS",
        arrows: ["arr_nvm_memif", "arr_memif_fee", "arr_fee_fls", "arr_fls_nvm"],
        action() { for (let i = 0; i < 4; i++) stepClockTick(10); }
      },
      {
        title: "Bước 4: Hàng đợi Immediate trống -> Tự động Resume ghi nốt Block #2!",
        detail: "Sau khi Crash Event hoàn thành, NvM Scheduler lấy Job đang bị treo (#2 Calib) từ suspendedJob khởi động lại và ghi xong toàn bộ dữ liệu.",
        inputSrc: "Suspended Job (#2)",
        outputDst: "MemIf_Write -> RTE Complete",
        apiCall: "Auto Resume Blk #2 -> MemIf_Write -> NVM_REQ_OK",
        highlightMod: "MOD_RTE",
        arrows: ["arr_nvm_memif", "arr_fls_nvm", "arr_nvm_rte"],
        action() { for (let i = 0; i < 6; i++) stepClockTick(10); }
      }
    ],
    whatIfs: [
      {
        label: "⛔ What-If 1: Tắt NvMJobPrioritization (Không cắt ngang)",
        run() {
          ecucConfig.NvMJobPrioritization = false;
          syncConfigToDOM();
          simState.blocks[2].ramData[1] ^= 0x55;
          api_NvM_WriteBlock(2, false);
          stepClockTick(10);
          api_NvM_WriteBlock(5, false);
          if (typeof renderAll === "function") renderAll();
        }
      },
      {
        label: "📊 What-If 2: Đua hàng đợi Std Prio=4 vs Prio=2",
        run() {
          ecucConfig.NvMJobPrioritization = true;
          syncConfigToDOM();
          api_NvM_ReadBlock(2, false); // active
          api_NvM_ReadBlock(4, false); // prio 3
          api_NvM_ReadBlock(3, false); // prio 2 jumps ahead!
          if (typeof renderAll === "function") renderAll();
        }
      },
      {
        label: "🚨 What-If 3: Ghi khẩn cấp Crash Prio=0 ngay lúc rảnh",
        run() {
          simState.blocks[5].ramData[7] = (simState.blocks[5].ramData[7] + 1) & 0xFF;
          api_NvM_WriteBlock(5, false);
          for (let i = 0; i < 4; i++) stepClockTick(10);
          if (typeof renderAll === "function") renderAll();
        }
      }
    ]
  },

  {
    id: "S8",
    group: "Nhóm 2: Ghi, CRC Compare, Verify & Queue",
    title: "S8: Chu Trình Tắt Máy NvM_WriteAll(), ValidateAll() & CancelWriteAll()",
    summary: "Mô tả tắt máy ECU: BswM kích hoạt ValidateAll() + WriteAll() -> chỉ ghi các khối có VALID_RAM=1 && CHANGED_SW=1 (#3 Odometer), bỏ qua khối sạch -> nếu tài xế bật lại chìa khóa (IGN_ON), BswM gọi NvM_CancelWriteAll() hủy các khối còn lại.",
    setup() {
      ecucConfig = Object.assign({}, defaultConfig, { SelectedBlockId: "3" });
      simState = createInitialSimState();
      simState.blocks[2].ramData[0] = 0x51;
      simState.blocks[2].ramValid = true;
      simState.blocks[2].ramChanged = true;
      simState.blocks[3].ramData[3] = 0x45;
      simState.blocks[3].ramValid = true;
      simState.blocks[3].ramChanged = true;
      simState.blocks[1].ramChanged = false; // clean!
      recomputeBlockMetadata(simState.blocks[2]);
      recomputeBlockMetadata(simState.blocks[3]);
      syncBlockToEcuc(3);
      syncConfigToDOM();
      updateDerivedRegisters();
    },
    steps: [
      {
        title: "Bước 1: Đánh dấu Dirty & chạy NvM_ValidateAll() trước khi ngủ",
        detail: "Khối #2 và #3 đang có CHANGED_SW=1, khối #1 sạch (CHANGED_SW=0). NvM_ValidateAll() đồng bộ lại CRC cho các khối bật AutoValidation.",
        inputSrc: "BswM Shutdown Prep",
        outputDst: "Crc Engine + Block Admin",
        apiCall: "NvM_ValidateAll()",
        highlightMod: "MOD_BSWM",
        arrows: ["arr_bswm_nvm", "arr_nvm_crc"],
        action() { api_NvM_ValidateAll(); }
      },
      {
        title: "Bước 2: BswM gọi NvM_WriteAll() -> Ghi khối Dirty #2, bỏ qua khối sạch #1",
        detail: "NvM quét các khối selectForWriteAll=TRUE: bỏ qua #1 (vì Clean), bắt đầu ghi #2 Calib_EngineMap ở chế độ MEMIF_MODE_FAST.",
        inputSrc: "BswM_OnGoOffOne",
        outputDst: "Multi-Block WriteAll (#2, #3)",
        apiCall: "NvM_WriteAll() -> Ghi #2 (bỏ qua #1 Clean)",
        highlightMod: "MOD_FEE",
        arrows: ["arr_bswm_nvm", "arr_nvm_memif", "arr_memif_fee", "arr_fee_fls"],
        action() { api_NvM_WriteAll(); stepClockTick(10); }
      },
      {
        title: "Bước 3: Tài xế bật lại IGN_ON đột ngột -> BswM gọi NvM_CancelWriteAll()!",
        detail: "ECU tỉnh dậy giữa chừng! BswM gọi CancelWriteAll(): khối #2 đã xong được giữ an toàn, khối #3 bị hủy khỏi tiến trình WriteAll và BswM nhận NVM_REQ_CANCELED.",
        inputSrc: "IGN_ON Wakeup -> BswM",
        outputDst: "NvM MultiJob = CANCELED",
        apiCall: "NvM_CancelWriteAll() -> BswM(NVM_REQ_CANCELED)",
        highlightMod: "MOD_BSWM",
        arrows: ["arr_bswm_nvm", "arr_nvm_bswm"],
        action() { api_NvM_CancelWriteAll(); }
      }
    ],
    whatIfs: [
      {
        label: "✅ What-If 1: Không hủy -> Ghi xong hết WriteAll OK",
        run() {
          api_NvM_WriteAll();
          for (let i = 0; i < 4; i++) stepClockTick(10);
          if (typeof renderAll === "function") renderAll();
        }
      },
      {
        label: "💨 What-If 2: Tất cả khối Clean -> WriteAll 0 ghi",
        run() {
          simState.blocks.forEach(b => { if (b.id > 0) b.ramChanged = false; });
          api_NvM_WriteAll();
          stepClockTick(10);
          if (typeof renderAll === "function") renderAll();
        }
      },
      {
        label: "✍️ What-If 3: Ghi riêng khối #3 còn sót sau Cancel",
        run() {
          api_NvM_WriteBlock(3, false);
          for (let i = 0; i < 6; i++) stepClockTick(10);
          if (typeof renderAll === "function") renderAll();
        }
      }
    ]
  },

  // -------------------- GROUP 3: REDUNDANT RECOVERY, ROM DEFAULT & ERASE/INVALIDATE --------------------
  {
    id: "S9",
    group: "Nhóm 3: Redundant, ROM & Erase/Invalidate",
    title: "S9: Tự Cứu Hộ Khối REDUNDANT (NV #0 Lỗi CRC → Đọc NV #1 & Phục Hồi)",
    summary: "Chứng minh sức mạnh của NVM_BLOCK_REDUNDANT trên Block #3 (Odometer): khi mất điện lúc đang ghi làm NV Copy #0 bị hỏng CRC (0xDEAD), NvM tự chuyển sang NV #1 đọc thành công, báo DEM NVM_E_LOSS_OF_REDUNDANCY nhưng vẫn giữ vẹn nguyên số km cho SWC.",
    setup() {
      ecucConfig = Object.assign({}, defaultConfig, { SelectedBlockId: "3" });
      simState = createInitialSimState();
      simState.blocks[3].ramData = [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
      simState.blocks[3].ramValid = false;
      syncBlockToEcuc(3);
      syncConfigToDOM();
      updateDerivedRegisters();
    },
    steps: [
      {
        title: "Bước 1: Tiêm lỗi hỏng CRC (0xDEAD) lên bản sao NV #0 của Block #3",
        detail: "Giả lập sụt áp nguồn khi Flash đang cập nhật NV #0. Bản sao NV #1 trước đó vẫn còn nguyên vẹn dữ liệu Odometer 123,456 km.",
        inputSrc: "Fault Injector",
        outputDst: "NV Copy #0 (Stored CRC = 0xDEAD)",
        apiCall: "CorruptNvCopy(Blk #3, Copy #0, 0xDEAD)",
        highlightMod: "MOD_FLS",
        arrows: ["arr_fee_fls"],
        action() { api_CorruptNvCopy(3, 0, "CORRUPT"); }
      },
      {
        title: "Bước 2: Gọi NvM_ReadBlock(3) -> NV #0 lỗi CRC -> Chuyển sang NV #1 + DEM",
        detail: "Sau khi đọc NV #0 phát hiện sai CRC (và thử lại hết maxReadRetries), NvM bật bit REDUNDANCY_LOSS (Bit 2 Thanh A), gửi Dem_SetEventStatus(NVM_E_LOSS_OF_REDUNDANCY, FAILED) và tự động đọc sang NV #1!",
        inputSrc: "NV #0 Mismatch -> Fallback NV #1",
        outputDst: "DEM Event + Read NV #1",
        apiCall: "NvM_ReadBlock(3) -> CRC Err NV#0 -> DEM -> Read NV#1",
        highlightMod: "MOD_DCM_DEM",
        arrows: ["arr_nvm_crc", "arr_nvm_dem", "arr_nvm_memif"],
        action() { api_NvM_ReadBlock(3, false); stepClockTick(10); stepClockTick(10); stepClockTick(10); }
      },
      {
        title: "Bước 3: Đọc thành công từ NV #1! Trả RAM nguyên vẹn & sửa lại dự phòng kép",
        detail: "NV #1 khớp CRC-16 hoàn toàn -> RAM Block #3 nhận lại giá trị Odometer chuẩn và trả NVM_REQ_OK! (Nếu cần phục hồi cặp NV #0/#1, SWC gọi tiếp WriteBlock).",
        inputSrc: "NV Copy #1 (Valid)",
        outputDst: "RAM Block #3 (NVM_REQ_OK)",
        apiCall: "NV#1 CRC Match -> NVM_REQ_OK (Recovered!)",
        highlightMod: "MOD_NVM",
        arrows: ["arr_fls_nvm", "arr_nvm_crc", "arr_nvm_rte"],
        action() { stepClockTick(10); }
      }
    ],
    whatIfs: [
      {
        label: "💀 What-If 1: Hỏng CẢ 2 bản NV #0 & NV #1 -> Rơi về ROM",
        run() {
          api_CorruptNvCopy(3, 0, "CORRUPT");
          api_CorruptNvCopy(3, 1, "CORRUPT");
          api_NvM_ReadBlock(3, false);
          for (let i = 0; i < 6; i++) stepClockTick(10);
          if (typeof renderAll === "function") renderAll();
        }
      },
      {
        label: "🔧 What-If 2: Gọi WriteBlock(3) phục hồi cả NV #0 & NV #1",
        run() {
          simState.blocks[3].crcCompMechanism = false;
          api_NvM_WriteBlock(3, false);
          for (let i = 0; i < 6; i++) stepClockTick(10);
          if (typeof renderAll === "function") renderAll();
        }
      },
      {
        label: "🚫 What-If 3: Hỏng cả 2 + Không có ROM -> INTEGRITY_FAILED",
        run() {
          ecucConfig.ProvideRomBlockDefault = false;
          onConfigInputChanged("ProvideRomBlockDefault");
          api_CorruptNvCopy(3, 0, "CORRUPT");
          api_CorruptNvCopy(3, 1, "CORRUPT");
          api_NvM_ReadBlock(3, false);
          for (let i = 0; i < 6; i++) stepClockTick(10);
          if (typeof renderAll === "function") renderAll();
        }
      }
    ]
  },

  {
    id: "S10",
    group: "Nhóm 3: Redundant, ROM & Erase/Invalidate",
    title: "S10: Khôi Phục Mặc Định ROM Default & InitBlockCallback (RESTORED_FROM_ROM)",
    summary: "Khi Dcm hoặc SWC yêu cầu Reset Factory Settings qua NvM_RestoreBlockDefaults(), hoặc khi ReadAll/ReadBlock gặp Flash mới tinh chưa ghi (ERASED), NvM nạp NvMRomBlockDataAddress / NvMInitBlockCallback và trả kết quả NVM_REQ_RESTORED_FROM_ROM.",
    setup() {
      ecucConfig = Object.assign({}, defaultConfig, { SelectedBlockId: "2" });
      simState = createInitialSimState();
      simState.blocks[2].ramData = [0xAA, 0xBB, 0xCC, 0xDD, 0x11, 0x22, 0x33, 0x44];
      syncBlockToEcuc(2);
      syncConfigToDOM();
      updateDerivedRegisters();
    },
    steps: [
      {
        title: "Bước 1: Chẩn đoán Dcm gọi NvM_RestoreBlockDefaults(2, DstPtr)",
        detail: "KTV thực hiện Reset Calibration về mặc định nhà máy. NvM kiểm tra NvMRomBlockDataAddress / InitCallback hợp lệ và xếp lệnh RESTORE vào hàng đợi.",
        inputSrc: "Dcm Factory Reset",
        outputDst: "Standard Queue (RESTORE)",
        apiCall: "NvM_RestoreBlockDefaults(2, &CalibRam)",
        highlightMod: "MOD_DCM_DEM",
        arrows: ["arr_dcmdem_nvm", "arr_rte_nvm"],
        action() { api_NvM_RestoreBlockDefaults(2, false); }
      },
      {
        title: "Bước 2: Nạp ROM Default -> Bật ROM_DEFAULT_USED & CHANGED_SW=1",
        detail: "NvM chép ROM [10 20 30 40 50 60 70 80] vào RAM, bật Bit 1 (ROM_DEF=1) + Bit 6 (CHANGED_SW=1) và trả callback NVM_REQ_RESTORED_FROM_ROM (không ghi trực tiếp xuống Flash cho đến khi Write!).",
        inputSrc: "ROM Default Section",
        outputDst: "RAM Block #2 + Thanh A",
        apiCall: "SingleBlockCbk(NVM_REQ_RESTORED_FROM_ROM)",
        highlightMod: "MOD_NVM",
        arrows: ["arr_nvm_rte"],
        action() { stepClockTick(10); }
      },
      {
        title: "Bước 3: Gọi NvM_WriteBlock(2) để lưu cố định giá trị ROM xuống Flash NV",
        detail: "Nhờ CHANGED_SW=1 đã được bật sau khi Restore, lệnh WriteBlock hoặc WriteAll() sẽ lưu giá trị mặc định mới này xuống Flash.",
        inputSrc: "Restored RAM Block #2",
        outputDst: "NV Copy #0 (Flash)",
        apiCall: "NvM_WriteBlock(2) -> NVM_REQ_OK",
        highlightMod: "MOD_FEE",
        arrows: ["arr_nvm_crc", "arr_nvm_memif", "arr_memif_fee", "arr_fee_fls"],
        action() { simState.blocks[2].crcCompMechanism = false; api_NvM_WriteBlock(2, false); for (let i = 0; i < 5; i++) stepClockTick(10); }
      }
    ],
    whatIfs: [
      {
        label: "🆕 What-If 1: Flash Trống (ERASED) tự nạp ROM khi ReadBlock",
        run() {
          api_CorruptNvCopy(2, 0, "ERASED");
          api_NvM_ReadBlock(2, false);
          for (let i = 0; i < 3; i++) stepClockTick(10);
          if (typeof renderAll === "function") renderAll();
        }
      },
      {
        label: "📌 What-If 2: Dùng R23-11 RestorePRAMBlockDefaults(3)",
        run() {
          api_NvM_RestoreBlockDefaults(3, true);
          stepClockTick(10);
          if (typeof renderAll === "function") renderAll();
        }
      },
      {
        label: "🚫 What-If 3: Không có ROM & không InitCbk -> DET 0x12",
        run() {
          ecucConfig.ProvideRomBlockDefault = false;
          onConfigInputChanged("ProvideRomBlockDefault");
          api_NvM_RestoreBlockDefaults(2, false);
          if (typeof renderAll === "function") renderAll();
        }
      }
    ]
  },

  {
    id: "S11",
    group: "Nhóm 3: Redundant, ROM & Erase/Invalidate",
    title: "S11: Phân Biệt NvM_InvalidateNvBlock() vs NvM_EraseNvBlock() (Prio=0)",
    summary: "Hai dịch vụ thuộc API_CONFIG_CLASS_3: NvM_InvalidateNvBlock() chỉ đánh dấu metadata Fee=INVALID (chạy trên mọi Priority), còn NvM_EraseNvBlock() xóa sector vật lý thành 0xFF và BẮT BUỘC khối phải có Immediate Priority (Prio=0) theo SWS_NvM_00270!",
    setup() {
      ecucConfig = Object.assign({}, defaultConfig, { SelectedBlockId: "2", NvMApiConfigClass: "NVM_API_CONFIG_CLASS_3" });
      simState = createInitialSimState();
      syncBlockToEcuc(2);
      syncConfigToDOM();
      updateDerivedRegisters();
    },
    steps: [
      {
        title: "Bước 1: Dcm gọi NvM_InvalidateNvBlock(2) -> Fee đánh dấu Header INVALIDATED",
        detail: "NvM gửi MemIf_InvalidateBlock(2) xuống Fee. Không có sector Flash nào bị xóa vật lý lúc này — chỉ ghi một tag logic đánh dấu dữ liệu vô hiệu (tiết kiệm thời gian & tuổi thọ Flash).",
        inputSrc: "Dcm Diag -> NvM Class 3",
        outputDst: "Fee Logical Header = INVALIDATED",
        apiCall: "NvM_InvalidateNvBlock(2) -> MemIf_InvalidateBlock",
        highlightMod: "MOD_FEE",
        arrows: ["arr_dcmdem_nvm", "arr_nvm_memif", "arr_memif_fee"],
        action() { api_NvM_InvalidateNvBlock(2); stepClockTick(10); }
      },
      {
        title: "Bước 2: Đọc lại Block #2 -> NvM trả thẳng NVM_REQ_NV_INVALIDATED",
        detail: "Khi đọc một khối đã Invalidate, Fee báo MEMIF_BLOCK_INVALID -> NvM không coi đó là lỗi phần cứng mà trả ngay NVM_REQ_NV_INVALIDATED.",
        inputSrc: "Fee Header = INVALID",
        outputDst: "SWC Callback (NV_INVALIDATED)",
        apiCall: "NvM_ReadBlock(2) -> NVM_REQ_NV_INVALIDATED",
        highlightMod: "MOD_NVM",
        arrows: ["arr_rte_nvm", "arr_fls_nvm", "arr_nvm_rte"],
        action() { api_NvM_ReadBlock(2, false); stepClockTick(10); stepClockTick(10); }
      },
      {
        title: "Bước 3: Chạy NvM_EraseNvBlock(5) (Immediate Prio=0) -> Xóa vật lý 0xFF",
        detail: "Block #5 Crash_EventRecord có Priority=0 nên được phép gọi NvM_EraseNvBlock(5) -> MemIf_EraseImmediateBlock() đưa trang Flash về trắng 0xFF (ERASED).",
        inputSrc: "Safety Service (Prio=0)",
        outputDst: "DFlash Physical Cells = 0xFF",
        apiCall: "NvM_EraseNvBlock(5) -> MemIf_EraseImmediateBlock",
        highlightMod: "MOD_FLS",
        arrows: ["arr_dcmdem_nvm", "arr_nvm_memif", "arr_memif_fee", "arr_fee_fls"],
        action() { api_NvM_EraseNvBlock(5); stepClockTick(10); stepClockTick(10); }
      }
    ],
    whatIfs: [
      {
        label: "⛔ What-If 1: Gọi EraseNvBlock(3) trên Prio=2 -> DET 0x13!",
        run() {
          api_NvM_EraseNvBlock(3);
          if (typeof renderAll === "function") renderAll();
        }
      },
      {
        label: "🔒 What-If 2: Đổi Class xuống CLASS_1 -> Chặn Invalidate",
        run() {
          ecucConfig.NvMApiConfigClass = "NVM_API_CONFIG_CLASS_1";
          syncConfigToDOM();
          api_NvM_InvalidateNvBlock(2);
          if (typeof renderAll === "function") renderAll();
        }
      },
      {
        label: "♻️ What-If 3: Ghi dữ liệu mới phục hồi Block #2 sau Invalidate",
        run() {
          ecucConfig.NvMApiConfigClass = "NVM_API_CONFIG_CLASS_3";
          syncConfigToDOM();
          api_NvM_WriteBlock(2, false);
          for (let i = 0; i < 5; i++) stepClockTick(10);
          if (typeof renderAll === "function") renderAll();
        }
      }
    ]
  },

  // -------------------- GROUP 4: STATIC ID, WRITE PROT/ONCE, RETRIES & DET/DEM --------------------
  {
    id: "S12",
    group: "Nhóm 4: Static ID, Bảo Vệ, Retry & DET/DEM",
    title: "S12: Static Block ID Check (WRONG_BLOCK_ID) & Nâng Cấp SW (Dynamic Config)",
    summary: "Ngăn chặn lỗi đọc nhầm vùng nhớ giữa hai Block có cùng độ dài bằng cách băm kèm Static Block ID vào CRC (báo DEM NVM_E_WRONG_BLOCK_ID khi lệch). Kết hợp minh họa cơ chế NvMDynamicConfiguration khi cập nhật phần mềm.",
    setup() {
      ecucConfig = Object.assign({}, defaultConfig, { SelectedBlockId: "3" });
      simState = createInitialSimState();
      simState.blocks[3].staticBlockIdCheck = true;
      syncBlockToEcuc(3);
      syncConfigToDOM();
      updateDerivedRegisters();
    },
    steps: [
      {
        title: "Bước 1: Tiêm lỗi Static ID = 2 vào Header của Block #3 trên NV #0",
        detail: "Giả lập sự cố ánh xạ địa chỉ khiến trang Flash của Block #3 lại chứa Static ID Header thuộc về Block #2.",
        inputSrc: "Corrupted NV Block #3 Header",
        outputDst: "NV #0 StaticID = 2 (Expected 3)",
        apiCall: "Inject WRONG_STATIC_ID on Blk #3",
        highlightMod: "MOD_FLS",
        arrows: ["arr_fee_fls"],
        action() { api_CorruptNvCopy(3, 0, "STATIC_ID"); }
      },
      {
        title: "Bước 2: Đọc Block #3 -> Static ID Check bắt lỗi & báo NVM_E_WRONG_BLOCK_ID",
        detail: "Vì NvMStaticBlockIDCheck=TRUE, NvM đối chiếu 2 byte BlockId trước khi giao dữ liệu: ID=2 ≠ 3 -> từ chối, báo DEM NVM_E_WRONG_BLOCK_ID và trả NVM_REQ_NOT_OK.",
        inputSrc: "Static ID Comparator (2 != 3)",
        outputDst: "DEM Fault + NVM_REQ_NOT_OK",
        apiCall: "NvM_ReadBlock(3) -> Dem_SetEventStatus(NVM_E_WRONG_BLOCK_ID)",
        highlightMod: "MOD_DCM_DEM",
        arrows: ["arr_fls_nvm", "arr_nvm_crc", "arr_nvm_dem", "arr_nvm_rte"],
        action() { api_NvM_ReadBlock(3, false); stepClockTick(10); stepClockTick(10); }
      },
      {
        title: "Bước 3: Nâng cấp SW (ConfigId 0xB202 ≠ 0xA55A) -> Reset khối không Resistant",
        detail: "Khi phần mềm mới có ConfigId=0xB202 khác bản Flash cũ 0xA55A, NvM_ReadAll() giữ nguyên khối Odometer (Resistant=TRUE) nhưng reset khối Calib (Resistant=FALSE) về ROM Default!",
        inputSrc: "New SW Boot (ConfigId 0xB202)",
        outputDst: "Selective ROM Reset on Blk #2",
        apiCall: "NvM_ReadAll() [DynamicCfg=TRUE, Compiled 0xB202 != Stored 0xA55A]",
        highlightMod: "MOD_BSWM",
        arrows: ["arr_bswm_nvm", "arr_nvm_memif", "arr_fls_nvm"],
        action() {
          api_CorruptNvCopy(3, 0, "CLEAR");
          simState.blocks[2].resistantToChangedSw = false;
          ecucConfig.NvMConfigIdComparison = "0xB202 / 0xA55A";
          ecucConfig.NvMDynamicConfiguration = true;
          syncConfigToDOM();
          api_NvM_ReadAll();
          stepClockTick(10);
          stepClockTick(10);
        }
      }
    ],
    whatIfs: [
      {
        label: "😱 What-If 1: Tắt StaticBlockIDCheck (Bỏ lọt nhầm dữ liệu!)",
        run() {
          ecucConfig.NvMStaticBlockIDCheck = false;
          onConfigInputChanged("NvMStaticBlockIDCheck");
          api_CorruptNvCopy(3, 0, "STATIC_ID");
          api_NvM_ReadBlock(3, false);
          stepClockTick(10);
          stepClockTick(10);
          if (typeof renderAll === "function") renderAll();
        }
      },
      {
        label: "🔄 What-If 2: Đưa ConfigId về 0xA55A/0xA55A (Normal Boot)",
        run() {
          ecucConfig.NvMConfigIdComparison = "0xA55A / 0xA55A";
          syncConfigToDOM();
          api_NvM_ReadAll();
          for (let i = 0; i < 6; i++) stepClockTick(10);
          if (typeof renderAll === "function") renderAll();
        }
      },
      {
        label: "🛡️ What-If 3: Đặt Blk #3 Resistant=FALSE khi nâng cấp SW",
        run() {
          simState.blocks[3].resistantToChangedSw = false;
          ecucConfig.NvMConfigIdComparison = "0xC303 / 0xA55A";
          syncConfigToDOM();
          api_NvM_ReadAll();
          stepClockTick(10);
          if (typeof renderAll === "function") renderAll();
        }
      }
    ]
  },

  {
    id: "S13",
    group: "Nhóm 4: Static ID, Bảo Vệ, Retry & DET/DEM",
    title: "S13: Khóa Chống Ghi SetBlockProtection(TRUE) & NvMWriteBlockOnce = TRUE",
    summary: "Phân biệt khóa mềm tạm thời qua NvM_SetBlockProtection(TRUE/FALSE) và khóa cứng vĩnh viễn NvMWriteBlockOnce=TRUE (như số VIN / ConfigId tại nhà máy EOL: sau 1 lần ghi thành công, bit WR_ONCE_LOCKED=1 ngăn tuyệt đối mọi lệnh ghi/xóa/mở khóa sau đó).",
    setup() {
      ecucConfig = Object.assign({}, defaultConfig, { SelectedBlockId: "1" });
      simState = createInitialSimState();
      syncBlockToEcuc(1);
      syncConfigToDOM();
      updateDerivedRegisters();
    },
    steps: [
      {
        title: "Bước 1: Thử khóa mềm tạm thời trên Block #3 bằng SetBlockProtection(TRUE)",
        detail: "Khối Odometer (#3) không bật WriteOnce. Gọi SetBlockProtection(3, TRUE) đặt WRITE_PROT=1 khiến mọi lệnh Write/Erase/Invalidate đều bị từ chối với DET NVM_E_WRITE_PROTECTED.",
        inputSrc: "SWC / Dcm",
        outputDst: "Block #3 WRITE_PROT=1 + DET Reject",
        apiCall: "NvM_SetBlockProtection(3, TRUE) -> WriteBlock(3) -> REJECT",
        highlightMod: "MOD_DET",
        arrows: ["arr_dcmdem_nvm", "arr_nvm_det"],
        action() { api_NvM_SetBlockProtection(3, true); api_NvM_WriteBlock(3, false); }
      },
      {
        title: "Bước 2: Bật NvMWriteBlockOnce=TRUE trên Block #1 & ghi 1 lần duy nhất EOL",
        detail: "Số VIN / Config Block #1 bật NvMWriteBlockOnce=TRUE. Lần ghi EOL đầu tiên thành công -> NvM lập tức chốt cứng cả WR_ONCE_LOCKED=1 (Bit 4) lẫn WRITE_PROT=1 (Bit 5)!",
        inputSrc: "EOL Factory Flash Write",
        outputDst: "Thanh A Bit 4 WR_ONCE_LOCKED=1",
        apiCall: "WriteOnce=TRUE -> NvM_WriteBlock(1) -> LOCKED PERMANENTLY",
        highlightMod: "MOD_NVM",
        arrows: ["arr_rte_nvm", "arr_nvm_memif", "arr_memif_fee", "arr_fls_nvm"],
        action() {
          simState.selectedBlockId = 1;
          simState.blocks[1].writeOnce = true;
          simState.blocks[1].writeProtected = false;
          simState.blocks[1].crcCompMechanism = false;
          simState.blocks[1].ramData = [0xA5, 0x99];
          syncBlockToEcuc(1);
          syncConfigToDOM();
          api_NvM_WriteBlock(1, false);
          for (let i = 0; i < 6; i++) stepClockTick(10);
        }
      },
      {
        title: "Bước 3: Thử mở khóa hoặc ghi đè Block #1 -> Bị chặn vĩnh viễn!",
        detail: "Theo SWS_NvM_00326, khi WR_ONCE_LOCKED=1, ngay cả lệnh NvM_SetBlockProtection(1, FALSE) hay NvM_InvalidateNvBlock(1) đều bị từ chối tuyệt đối!",
        inputSrc: "Unauthorized Write / Unlock Attempt",
        outputDst: "DET NVM_E_BLOCK_LOCKED",
        apiCall: "SetBlockProtection(1, FALSE) -> REJECT + WriteBlock(1) -> REJECT",
        highlightMod: "MOD_DET",
        arrows: ["arr_dcmdem_nvm", "arr_nvm_det"],
        action() { api_NvM_SetBlockProtection(1, false); api_NvM_WriteBlock(1, false); }
      }
    ],
    whatIfs: [
      {
        label: "🔓 What-If 1: Mở khóa thành công Block #3 (Không WriteOnce)",
        run() {
          api_NvM_SetBlockProtection(3, false);
          api_NvM_WriteBlock(3, false);
          stepClockTick(10);
          if (typeof renderAll === "function") renderAll();
        }
      },
      {
        label: "🧨 What-If 2: Thử Invalidate Block #1 đang bị khóa WriteOnce",
        run() {
          api_NvM_InvalidateNvBlock(1);
          if (typeof renderAll === "function") renderAll();
        }
      },
      {
        label: "🆕 What-If 3: Ghi 1 lần rồi ReadAll() lần sau vẫn tự khóa",
        run() {
          api_NvM_ReadAll();
          stepClockTick(10);
          stepClockTick(10);
          if (typeof renderAll === "function") renderAll();
        }
      }
    ]
  },

  {
    id: "S14",
    group: "Nhóm 4: Static ID, Bảo Vệ, Retry & DET/DEM",
    title: "S14: Tự Động Thử Lại (MaxWriteRetries → DEM) & Bẫy Toàn Bộ Mã Lỗi DET",
    summary: "Kiểm thử khả năng chịu lỗi phần cứng và sai sót lập trình ứng dụng: (1) Tiêm lỗi ghi phần cứng khiến NvM tự động thử lại NvMMaxNumOfWriteRetries=3 lần trước khi báo DEM NVM_E_REQ_FAILED; (2) Bẫy các mã lỗi DET (NVM_E_UNINIT, NVM_E_PARAM_BLOCK_ID, NVM_E_BLOCK_PENDING).",
    setup() {
      ecucConfig = Object.assign({}, defaultConfig, { SelectedBlockId: "2", NvMMaxRetries: "3 / 1", InjectMemIfWriteError: true });
      simState = createInitialSimState();
      simState.blocks[2].crcCompMechanism = false;
      syncBlockToEcuc(2);
      syncConfigToDOM();
      updateDerivedRegisters();
    },
    steps: [
      {
        title: "Bước 1: Gọi NvM_WriteBlock(2) khi Flash HW đang lỗi (InjectMemIfWriteError)",
        detail: "NvM gửi MemIf_Write(2) xuống DFlash, nhưng phần cứng Fls liên tục báo lỗi ghi (E_NOT_OK / NvM_JobErrorNotification).",
        inputSrc: "SWC Write + Hardware Fault",
        outputDst: "MemIf -> Fls Error",
        apiCall: "NvM_WriteBlock(2) [InjectMemIfWriteError=TRUE]",
        highlightMod: "MOD_FLS",
        arrows: ["arr_rte_nvm", "arr_nvm_memif", "arr_memif_fee", "arr_fee_fls"],
        action() { api_NvM_WriteBlock(2, false); stepClockTick(10); }
      },
      {
        title: "Bước 2: Tự động WriteRetry 3 lần (Bit RETRY=1) -> Hết Retry báo DEM!",
        detail: "NvM lần lượt trừ NvMMaxNumOfWriteRetries (3 -> 2 -> 1 -> 0). Khi kiệt sức sau 3 lần retry, NvM phát Dem_SetEventStatus(NVM_E_REQ_FAILED, FAILED) và trả NVM_REQ_NOT_OK.",
        inputSrc: "NvM Retry FSM (3 -> 0)",
        outputDst: "DEM NVM_E_REQ_FAILED",
        apiCall: "Retry x3 -> Dem_SetEventStatus(NVM_E_REQ_FAILED, FAILED)",
        highlightMod: "MOD_DCM_DEM",
        arrows: ["arr_fls_nvm", "arr_nvm_dem", "arr_nvm_rte"],
        action() { for (let i = 0; i < 6; i++) stepClockTick(10); }
      },
      {
        title: "Bước 3: Kích hoạt bẫy toàn bộ mã DET (PARAM_BLOCK_ID & NVM_E_UNINIT)",
        detail: "Thử gọi NvM_ReadBlock(0) (sai BlockId=0) để bắt NVM_E_PARAM_BLOCK_ID (0x0A), sau đó tắt NvMInitialized=FALSE và gọi ReadBlock(3) để bắt NVM_E_UNINIT (0x14).",
        inputSrc: "Invalid SWC Calls",
        outputDst: "DET ModuleId = 20",
        apiCall: "ReadBlock(0) -> DET 0x0A | UNINIT ReadBlock(3) -> DET 0x14",
        highlightMod: "MOD_DET",
        arrows: ["arr_rte_nvm", "arr_nvm_det"],
        action() {
          api_NvM_ReadBlock(0, false);
          ecucConfig.NvMInitialized = false;
          syncConfigToDOM();
          api_NvM_ReadBlock(3, false);
        }
      }
    ],
    whatIfs: [
      {
        label: "🔧 What-If 1: Tăng MaxRetries=5 & Sửa lỗi HW giữa chừng -> OK!",
        run() {
          ecucConfig.NvMInitialized = true;
          ecucConfig.NvMMaxRetries = "5 / 2";
          ecucConfig.InjectMemIfWriteError = true;
          syncConfigToDOM();
          api_NvM_WriteBlock(2, false);
          stepClockTick(10);
          stepClockTick(10); // retry #1
          ecucConfig.InjectMemIfWriteError = false;
          syncConfigToDOM();
          for (let i = 0; i < 6; i++) stepClockTick(10);
          if (typeof renderAll === "function") renderAll();
        }
      },
      {
        label: "🔕 What-If 2: Tắt NvMDevErrorDetect (Bỏ qua DET Log)",
        run() {
          ecucConfig.NvMDevErrorDetect = false;
          ecucConfig.NvMInitialized = true;
          syncConfigToDOM();
          api_NvM_ReadBlock(0, false);
          if (typeof renderAll === "function") renderAll();
        }
      },
      {
        label: "🧹 What-If 3: Reset sạch trạng thái NvM_Init() lại bình thường",
        run() {
          ecucConfig.NvMDevErrorDetect = true;
          ecucConfig.InjectMemIfWriteError = false;
          api_NvM_Init();
          if (typeof renderAll === "function") renderAll();
        }
      }
    ]
  }
];
