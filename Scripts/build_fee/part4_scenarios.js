// ============================================================================
// PART 4B: 13 SCENARIOS (S0 FREE SANDBOX + S1-S12 GUIDED) & 39 WHAT-IF BUTTONS
// ============================================================================

const SCENARIOS = [
  // --------------------------------------------------------------------------
  // MẶC ĐỊNH: KHÔNG CHẠY LUỒNG MẪU (FEE RỖNG ĐỂ THAO TÁC THỦ CÔNG & RESET)
  // --------------------------------------------------------------------------
  {
    id: 'S0',
    group: 'Mặc Định: Thao Tác Thủ Công / Reset',
    title: 'S0 (None): Không Chạy Luồng Mẫu — Fee Rỗng Ban Đầu (Thao Tác Thủ Công)',
    summary:
      'Trạng thái khởi tạo mặc định khi tải lại trang hoặc bấm Reset: Fee khởi điểm ở MEMIF_UNINIT (chưa gọi Fee_Init), Bank 0 & Bank 1 trống hoàn toàn (0/256B, Erased 0xFF) và RAM LUT rỗng (0 entries). Người dùng chủ động bấm Nút 8 (Fee_Init) hoặc tích FeeInitialized để khởi tạo rồi thao tác.',
    setupExplain:
      'Chế độ Tự do (Fee Rỗng & MEMIF_UNINIT): Data Flash Bank 0 & Bank 1 trống 100% (0/256B), RAM LUT rỗng và Fee đang ở MEMIF_UNINIT (Thanh A = 0x00, Bit 7 FEE_INIT = 0). Hãy bấm "🛑 8. Cancel/Init (Fee_Init)" rồi "+1 Tick MainFn" (hoặc tích FeeInitialized ở Tab General) để vào MEMIF_IDLE trước khi thao tác Write/Read.',
    setupMeta: {
      apiFlow: 'Power-On Reset → MEMIF_UNINIT (Chờ Fee_Init thủ công)',
      bitImpact: 'Thanh A: 0x00 (B7 FEE_INIT = 0) | Thanh B: 0x00 (Chưa có Slot)',
      memoryImpact: 'Bank 0: 0/256B (Sạch 0xFF) | Bank 1: 0/256B (Standby) | RAM LUT = 0 entries',
      swsRef: 'SWS_Fee_00128 / SWS_Fee_00085 / SWS_Fee_00120'
    },
    setup() {
      resetRuntimeBlockCatalog();
      ecucConfig = { ...defaultConfig, FeeInitialized: false, ActiveMemIfMode: 'MEMIF_MODE_SLOW' };
      createInitialSimState('EMPTY', { uninit: true });
      simState.clockMs = 0;
      simState.trace = [];
      simState.stepLog = [];
      simState.selectedModule = 'MOD_ECUM';
      simState.activeArrows = ['arr_ecum_fee'];
      simState.activeModules = ['MOD_ECUM', 'MOD_FEE'];
      setCodeSnippet(
        'Fee Rỗng Ban Đầu — MEMIF_UNINIT (Chờ Fee_Init)',
        `/* Trạng thái mặc định khi reload hoặc Reset (S0 / None): */\n/* Module = MEMIF_UNINIT (B7=0), Bank 0 = 0/256B (0xFF), Bank 1 = 0/256B */\n/* Bấm Nút 8 (Fee_Init) + Tick MainFn (hoặc chọn kịch bản S1..S12)! */`
      );
      pushStepLog('Khởi tạo mặc định (S0 / None): Fee rỗng 0/256B ở trạng thái MEMIF_UNINIT.');
      syncBitRegistersFromState();
    },
    steps: [],
    whatIfs: [
      {
        label: 'What-If: Chạy Fee_Init() (chuyển MEMIF_UNINIT → MEMIF_BUSY_INTERNAL [00120])?',
        run() {
          apiFeeInit('Empty Flash Cold Boot');
        }
      },
      {
        label: 'What-If: Chạy Fee_Init() + Fee_MainFunction() -> MEMIF_IDLE [00197]?',
        run() {
          apiFeeInit('Empty Flash Cold Boot');
          stepMainFunctionTick();
        }
      },
      {
        label: 'What-If: Init nhanh & ghi 1 block mẫu Blk#1 (0x0010) lên Bank 0 rỗng?',
        run() {
          apiFeeInit('Quick Init Empty', { completeImmediately: true });
          ecucConfig.SelectedFeeBlock = '0x0010';
          apiFeeWrite('0x0010', '0x00 0x01 0x00 [Manual Sample #1]');
          stepCompleteAsyncJob();
        }
      }
    ]
  },

  // --------------------------------------------------------------------------
  // NHÓM 1: KHỞI TẠO, GHI NGUYÊN TỬ & ĐỌC QUA RAM LUT
  // --------------------------------------------------------------------------
  {
    id: 'S1',
    group: 'Nhóm 1: Khởi Tạo, Ghi Nguyên Tử & Đọc Qua RAM LUT',
    title: 'S1: Fee_Init() — Quét 2 Bank Flash, Dựng Bảng RAM LUT & NvM_ReadAll()',
    summary:
      'Mô phỏng toàn bộ chu trình bật nguồn ECU: Fee khởi điểm ở MEMIF_UNINIT (Bit 7 FEE_INIT=0, RAM LUT rỗng). EcuM gọi Fee_Init(&Fee_Config) để quét Bank 0/Bank 1, loại bỏ bản SUPERSEDED cũ, dựng bảng RAM LUT O(1) và chuyển sang MEMIF_IDLE phục vụ NvM_ReadAll().',
    setupExplain:
      'ECU vừa cấp nguồn (Power-On Reset): Dữ liệu trên Data Flash Bank 0 đã có sẵn 7 bản ghi từ các lần chạy trước (gồm 3 bản SUPERSEDED cũ và 4 bản VALID mới nhất), nhưng RAM bị mất sạch khi tắt máy nên RAM LUT đang rỗng và Fee ở trạng thái MEMIF_UNINIT.',
    setupMeta: {
      apiFlow: 'Power-On Reset → Chờ EcuM_AL_DriverInitTwo()',
      bitImpact: 'Thanh A: 0x00 (B7 FEE_INIT = 0) | Module: MEMIF_UNINIT',
      memoryImpact: 'Bank 0 có 7 slots (3 SUPERSEDED, 4 VALID) | RAM LUT = 0 entries',
      swsRef: 'SWS_Fee_00085 / SWS_Fee_00120 / SWS_Fee_00128'
    },
    setup() {
      resetRuntimeBlockCatalog();
      ecucConfig = { ...defaultConfig, FeeInitialized: false, ActiveMemIfMode: 'MEMIF_MODE_SLOW' };
      createInitialSimState('NEAR_THRESHOLD', { uninit: true });
      simState.selectedModule = 'MOD_ECUM';
      simState.activeArrows = ['arr_ecum_fee'];
      simState.activeModules = ['MOD_ECUM', 'MOD_FEE'];
      pushStepLog('ECU Boot: Power-On Reset -> Fee đang ở MEMIF_UNINIT (B7=0, RAM LUT rỗng).');
    },
    steps: [
      {
        label: '1. Kiểm tra Boot State: MEMIF_UNINIT & Hàng rào chống truy cập sớm',
        desc:
          'Ngay sau Power-On Reset, thanh ghi Thanh A đang là 0x00 (Bit 7 FEE_INIT = 0). Bất kỳ lệnh Fee_Read() hoặc Fee_Write() nào gọi trước Fee_Init() đều bị từ chối và báo DET FEE_E_UNINIT (0x01) để tránh đọc nhầm khi chưa dựng bảng ánh xạ RAM LUT.',
        apiFlow: 'Fee_GetStatus() → MEMIF_UNINIT (Chờ Fls_Init() & Fee_Init())',
        bitImpact: 'Thanh A: B7 FEE_INIT = 0, B0 JOB_OK_DONE = 0 (0x00)',
        memoryImpact: 'RAM LUT trống hoàn toàn dù Bank 0 đã chứa dữ liệu DFlash',
        swsRef: 'SWS_Fee_00128 / SWS_Fee_00122',
        action() {
          simState.clockMs = 0;
          simState.selectedModule = 'MOD_FEE';
          simState.activeArrows = ['arr_ecum_fee'];
          simState.activeModules = ['MOD_ECUM', 'MOD_FEE'];
          addTrace('EcuM', 'EcuM_AL_DriverInitTwo()', 'Kiểm tra Fee_GetStatus() == MEMIF_UNINIT (B7=0) trước khi khởi tạo Memory Stack', 'INFO');
          setCodeSnippet(
            'Trạng thái Boot Trước Fee_Init()',
            `/* Sau Power-On Reset: */\nif (Fee_GetStatus() == MEMIF_UNINIT) {\n  /* Goi Fee_Read() luc nay se bi DET FEE_E_UNINIT (0x01)! */\n  Fls_Init(&Fls_Config);\n}`
          );
          pushStepLog('Kiểm tra Boot: Fee đang MEMIF_UNINIT, sẵn sàng nhận Fee_Init().');
          syncBitRegistersFromState();
        }
      },
      {
        label: '2. EcuM gọi Fee_Init(&Fee_Config) — MEMIF_UNINIT → MEMIF_BUSY_INTERNAL [SWS_Fee_00120]',
        desc:
          'EcuM_AL_DriverInitTwo() khởi tạo tầng dưới rồi gọi đồng bộ Fee_Init(&Fee_Config) [SWS_Fee_00085]. Theo chuẩn R25-11 [SWS_Fee_00120], Fee chuyển sang MEMIF_BUSY_INTERNAL (Bit 5 FEE_BUSY_INT = 1) và lên lịch quét các Sector/Block Header trong chu kỳ Fee_MainFunction() kế tiếp. Ở trạng thái này Fee_Read/Fee_Write vẫn có thể tiếp nhận sớm [SWS_Fee_00172 / SWS_Fee_00174].',
        apiFlow: 'EcuM_AL_DriverInitTwo() → Fee_Init(&Fee_Config) → MEMIF_BUSY_INTERNAL [SWS_Fee_00120]',
        bitImpact: 'Thanh A: B7 FEE_INIT = 1, B5 FEE_BUSY_INT = 1 | JobResult = MEMIF_JOB_OK',
        memoryImpact: 'Xác định Bank 0 là Active Bank; đã lên lịch Startup Scan trong Fee_MainFunction()',
        swsRef: 'SWS_Fee_00085 / SWS_Fee_00120 / SWS_Fee_00035',
        action() {
          simState.clockMs += Number(ecucConfig.FeeMainFunctionPeriod) || 5;
          apiFeeInit('EcuM_StartupTwo');
          simState.selectedModule = 'MOD_FEE';
          syncBitRegistersFromState();
        }
      },
      {
        label: '3. Fee_MainFunction() quét Header, dựng RAM LUT O(1) & về MEMIF_IDLE [SWS_Fee_00197]',
        desc:
          'Trong chu kỳ Fee_MainFunction() đầu tiên, Fee duyệt tuần tự các Block Header trên Bank 0 từ đầu tới vùng trống 0xFF: kiểm tra Valid Trailer 0xA5A5, loại bỏ các bản SUPERSEDED cũ (0x0010 #1/#2, 0x0020 #1), nạp 4 địa chỉ mới nhất vào bảng RAM LUT và chuyển MEMIF_BUSY_INTERNAL → MEMIF_IDLE [SWS_Fee_00197] (Thanh A = 0x81).',
        apiFlow: 'Fee_MainFunction() → Startup Scan → Rebuild RAM LUT → MEMIF_IDLE [SWS_Fee_00197]',
        bitImpact: 'Thanh A: B7 FEE_INIT = 1, B5 = 0, B0 JOB_OK_DONE = 1 (0x81) | Status: MEMIF_IDLE',
        memoryImpact: 'RAM LUT dựng xong 4 blocks hợp lệ (0x0040, 0x0021, 0x0010, 0x0020) · Bit 3 LUT_CACHED = 1',
        swsRef: 'SWS_Fee_00097 / SWS_Fee_00197 / SWS_Fee_00155',
        action() {
          stepMainFunctionTick();
          simState.selectedModule = 'MOD_DFLASH';
          syncBitRegistersFromState();
        }
      },
      {
        label: '4. BswM bật MEMIF_MODE_FAST & NvM_ReadAll() gọi Fee_Read(0x0010)',
        desc:
          'Để khởi động nhanh, BswM gọi Fee_SetMode(MEMIF_MODE_FAST) nâng băng thông lên 64 B/tick (Bit 4 FAST_MODE = 1). Tiếp đó NvM_ReadAll() lần lượt gọi MemIf_Read(0, 0x0010) → Fee_Read(0x0010) để nạp dữ liệu Odometer lên RAM Mirror.',
        apiFlow: 'BswM → Fee_SetMode(FAST) → NvM_ReadAll() → MemIf_Read(0, 0x0010) → Fee_Read(0x0010)',
        bitImpact: 'Thanh A: B4 FAST_MODE = 1, B6 FEE_BUSY = 1 | JobResult = MEMIF_JOB_PENDING',
        memoryImpact: 'RAM LUT tra cứu O(1) trả ngay Bank 0 +0x68 cho Blk#1 (0x0010 #3)',
        swsRef: 'SWS_Fee_00087 / SWS_Fee_00021 / R20-11 Legacy SetMode',
        action() {
          apiFeeSetMode('MEMIF_MODE_FAST');
          apiFeeRead('0x0010');
          simState.selectedModule = 'MOD_NVM';
          syncBitRegistersFromState();
        }
      },
      {
        label: '5. Hoàn tất NvM_ReadAll() — Đọc xong 0x0010 & 0x0020, trả Mode về SLOW',
        desc:
          'Fls_MainFunction() đọc nhanh xong Odometer (0x0010) và EngCalib_DS0 (0x0020) nhờ RAM LUT O(1) mà không cần quét lại Flash. NvM hoàn tất NvM_ReadAll() -> báo BswM_NvM_CurrentJobMode(NVM_READ_ALL, NVM_REQ_OK) và trả Fee về MEMIF_MODE_SLOW.',
        apiFlow: 'Fls_Read() → Fee_JobEndNotification() → NvM_ReadAll() OK → Fee_SetMode(SLOW)',
        bitImpact: 'Thanh A: B4 FAST_MODE = 0, B0 JOB_OK_DONE = 1 (0x81) | Status: MEMIF_IDLE',
        memoryImpact: 'RAM Mirror của NvM đã nạp đủ dữ liệu; ASW sẵn sàng khởi chạy',
        swsRef: 'SWS_Fee_00055 / SWS_Fee_00095 / SWS_Fee_00194',
        action() {
          stepCompleteAsyncJob();
          apiFeeRead('0x0020');
          stepCompleteAsyncJob();
          apiFeeSetMode('MEMIF_MODE_SLOW');
          simState.selectedModule = 'MOD_SWC';
          addTrace('BswM', 'BswM_NvM_CurrentJobMode(NVM_READ_ALL, NVM_REQ_OK)', 'Hoàn tất NvM_ReadAll() bằng RAM LUT O(1), trả mode về SLOW', 'OK');
          pushStepLog('Hoàn tất NvM_ReadAll(): 0x0010 & 0x0020 đã nạp RAM Mirror, trả về SLOW.');
          syncBitRegistersFromState();
        }
      }
    ],
    whatIfs: [
      {
        label: 'What-If: Thử gọi Fee_Read(0x0010) khi chưa Init?',
        run() {
          ecucConfig.FeeInitialized = false;
          simState.moduleState = 'MEMIF_UNINIT';
          apiFeeRead('0x0010');
        }
      },
      {
        label: 'What-If: Tắt RAM LUT Cache (O(N) Scan) khi đọc?',
        run() {
          ecucConfig.FeeEnableRamLutCache = false;
          rebuildRamLutFromFlash();
          apiFeeRead('0x0020');
          stepCompleteAsyncJob();
        }
      },
      {
        label: 'What-If: Đảo Bank 1 = ACTIVE, Bank 0 = ERASED rồi Fee_Init?',
        run() {
          simState.banks[0].state = 'BANK_ERASED_STANDBY';
          simState.banks[1].state = 'BANK_ACTIVE';
          simState.banks[1].slots = simState.banks[0].slots.map((s) => ({ ...s, bankId: 1, uid: s.uid.replace('B0_', 'B1_') }));
          simState.banks[0].slots = [];
          apiFeeInit('Bank 1 Active Recovery', { completeImmediately: true });
        }
      }
    ]
  },

  {
    id: 'S2',
    group: 'Nhóm 1: Khởi Tạo, Ghi Nguyên Tử & Đọc Qua RAM LUT',
    title: 'S2: Fee_Write() — Căn Chỉnh Trang Ảo 8B & Quy Trình Ghi Nguyên Tử 3 Pha',
    summary:
      'Giải phẫu từng chu kỳ MainFunction của lệnh Fee_Write(0x0010) 14 bytes raw payload với FeeVirtualPageSize=8B: 14B được đệm 2 bytes 0xFF thành 16B (+ 8B Header = 24B = 3 Virtual Pages), chạy tuần tự 3 pha Phase 1 (Header) → Phase 2 (Payload+Pad) → Phase 3 (Trailer 0xA5A5).',
    setupExplain:
      'Bank 0 đang trắng 100% (0/256B, Erased = 0xFF), Fee ở MEMIF_IDLE, chế độ MEMIF_MODE_SLOW (8 B/tick), FeeVirtualPageSize = 8B. Khối được chọn là Blk#1_Odometer (0x0010, RawSize = 14B).',
    setupMeta: {
      apiFlow: 'Hệ thống sau Fee_Init() trên Flash trắng',
      bitImpact: 'Thanh A: 0x81 (MEMIF_IDLE) | Mode: SLOW (8 B/tick)',
      memoryImpact: 'Bank 0: 0/256B (Sạch 0xFF) | VP = 8B',
      swsRef: 'SWS_Fee_00085 / SWS_Fee_00076'
    },
    setup() {
      resetRuntimeBlockCatalog();
      ecucConfig = { ...defaultConfig, ActiveMemIfMode: 'MEMIF_MODE_SLOW', FlsBytesPerCycleSlow: 8 };
      createInitialSimState('EMPTY');
      apiFeeInit('S2 Fresh Flash', { completeImmediately: true });
      simState.clockMs = 0;
      ecucConfig.SelectedFeeBlock = '0x0010';
    },
    steps: [
      {
        label: '1. Tiếp nhận Fee_Write(0x0010) & Căn chỉnh Virtual Page (14B → 16B + 8B = 24B)',
        desc:
          'SWC → RTE → NvM → MemIf gọi Fee_Write(0x0010, DataBuf). Vì RawSize = 14B không chia hết cho FeeVirtualPageSize = 8B, Fee tự động đệm 2 bytes 0xFF thành 16B (2 pages) + 8B Header (1 page) = 24B. Slot mới mở ở trạng thái WRITING_HDR tại Bank 0 +0x00, Fee chuyển MEMIF_BUSY.',
        apiFlow: 'SWC → RTE → NvM_WriteBlock → MemIf_Write(0, 0x0010) → Fee_Write(0x0010)',
        bitImpact: 'Thanh A: B6 FEE_BUSY = 1, B0 JOB_OK_DONE = 0 | JobResult = MEMIF_JOB_PENDING',
        memoryImpact: 'Cấp phát slot 24B (8B Hdr + 14B Data + 2B Pad 0xFF) tại Bank 0 +0x00',
        swsRef: 'SWS_Fee_00088 / SWS_Fee_00005 / SWS_Fee_00025',
        action() {
          apiFeeWrite('0x0010', '0x1A 0x2B 0x3C [EngineLearn 14B]');
        }
      },
      {
        label: '2. Tick 1 (+5ms): Phase 1 — Ghi Block Header 8B (HDR_WRITTEN = 1)',
        desc:
          'Chu kỳ Fee_MainFunction() đầu tiên gọi Fls_Write() nạp 8 bytes đầu (Block Header chứa BlockNo=0x0010, Len=14B, Seq#1, HeaderCRC). Thanh B bật Bit 7 HDR_WRITTEN = 1; Trailer vẫn chưa có (Bit 5 = 0) để nếu sập nguồn lúc này dữ liệu chưa hoàn chỉnh sẽ bị loại.',
        apiFlow: 'Fee_MainFunction() → Fls_Write(0x0800_0000, &Hdr, 8B)',
        bitImpact: 'Thanh A: B6 FEE_BUSY = 1 | Thanh B: B7 HDR_WRITTEN = 1, B5 VALID_TRAILR = 0',
        memoryImpact: 'Đã ghi 8/24B (33%) · Pipeline chuyển sang Phase 2: WRITE_PAYLOAD',
        swsRef: 'SWS_Fee_00097 / SWS_Fee_00153',
        action() {
          stepMainFunctionTick();
        }
      },
      {
        label: '3. Tick 2 (+5ms): Phase 2 — Ghi 8B Payload đầu tiên (16/24B)',
        desc:
          'Ở chế độ MEMIF_MODE_SLOW (8 B/tick), chu kỳ thứ 2 nạp tiếp 8 bytes đầu của Payload vào Virtual Page 1 (0x0800_0008..0x0800_000F). Thanh B vẫn giữ Bit 5 VALID_TRAILR = 0 vì chưa ghi hết Payload và Trailer.',
        apiFlow: 'Fee_MainFunction() → Fls_Write(0x0800_0008, &Payload[0], 8B)',
        bitImpact: 'Thanh A: B6 FEE_BUSY = 1 | Thanh B: B7 = 1, B6 DATA_ALIGNED = 0, B5 = 0',
        memoryImpact: 'Đã ghi 16/24B (67%) · Còn 6B Payload + 2B Pad 0xFF',
        swsRef: 'SWS_Fee_00097',
        action() {
          stepMainFunctionTick();
        }
      },
      {
        label: '4. Tick 3 (+5ms): Phase 2+3 — Nốt 6B + 2B Pad (0xFF) & Chốt Trailer 0xA5A5',
        desc:
          'Chu kỳ thứ 3 nạp 6 bytes cuối của Payload kèm 2 bytes đệm 0xFF cho tròn Virtual Page 2, đồng thời chốt Valid Trailer 0xA5A5 (Atomic Commit)! Thanh B bật sáng Bit 6 DATA_ALIGNED = 1, Bit 5 VALID_TRAILR = 1, Bit 3 LUT_CACHED = 1 (0xE8). RAM LUT cập nhật 0x0010 -> Bank 0 +0x00.',
        apiFlow: 'Fls_Write(6B+2B Pad) → Commit Trailer 0xA5A5 → Rebuild RAM LUT',
        bitImpact: 'Thanh B: 0xE8 (B7=1, B6=1, B5 VALID_TRAILR=1, B3 LUT_CACHED=1)',
        memoryImpact: 'Slot 24/24B chuyển VALID · NextFreeWriteAddr = +0x18',
        swsRef: 'SWS_Fee_00005 / SWS_Fee_00153 / SWS_Fee_00195',
        action() {
          stepMainFunctionTick();
        }
      },
      {
        label: '5. Chuỗi Callback Ngược: Fee_JobEndNotification() → NvM → SWC (MEMIF_JOB_OK)',
        desc:
          'Fls báo ghi hoàn tất, Fee phát Fee_JobEndNotification() → NvM_JobEndNotification(NVM_REQ_OK) báo về SWC_Odometer. Thanh A hạ Bit 6 FEE_BUSY = 0, bật Bit 0 JOB_OK_DONE = 1 (0x81), Status trở lại MEMIF_IDLE.',
        apiFlow: 'Fls_MainFunction() → Fee_JobEndNotification() → NvM_JobEndNotification() → RTE → SWC',
        bitImpact: 'Thanh A: 0x81 (B6 FEE_BUSY = 0, B0 JOB_OK_DONE = 1) | Status: MEMIF_IDLE',
        memoryImpact: 'Tổng thời gian ghi 24B ở SLOW (8B/tick) = 15ms (3 ticks)',
        swsRef: 'SWS_Fee_00055 / SWS_Fee_00095 / SWS_Fee_00194',
        action() {
          simState.selectedModule = 'MOD_NVM';
          simState.activeArrows = ['arr_fls_fee', 'arr_fee_nvm', 'arr_nvm_memif', 'arr_rte_nvm', 'arr_swc_rte'];
          simState.activeModules = ['MOD_FLS', 'MOD_FEE', 'MOD_MEMIF', 'MOD_NVM', 'MOD_RTE', 'MOD_SWC'];
          addTrace('NvM->SWC', 'Rte_Call_JobFinished(NVM_REQ_OK)', 'Hoàn tất chuỗi thông báo ngược từ Fls -> Fee -> NvM -> SWC (15ms)', 'OK');
          pushStepLog('Callback ngược lên NvM -> SWC hoàn tất (NVM_REQ_OK).');
          syncBitRegistersFromState();
        }
      }
    ],
    whatIfs: [
      {
        label: 'What-If: Ghi Blk#4 VIN 17B (cần đệm 7B 0xFF)?',
        run() {
          ecucConfig.SelectedFeeBlock = '0x0040';
          apiFeeWrite('0x0040', '57 44 42 [VIN 17B -> 24B + 8B]');
          stepCompleteAsyncJob();
        }
      },
      {
        label: 'What-If: Đổi VirtualPage=16B ngay lập tức?',
        run() {
          ecucConfig.FeeVirtualPageSize = '16';
          ecucConfig.SelectedFeeBlock = '0x0010';
          apiFeeWrite('0x0010', '0x44 0x55 [VP=16B]');
          stepCompleteAsyncJob();
        }
      },
      {
        label: 'What-If: Bật FeePollingMode=TRUE & ghi lại 0x0010?',
        run() {
          ecucConfig.FeePollingMode = true;
          apiFeeWrite('0x0010', '0x99 0xAA [Polling Mode]');
          stepCompleteAsyncJob();
        }
      }
    ]
  },

  {
    id: 'S3',
    group: 'Nhóm 1: Khởi Tạo, Ghi Nguyên Tử & Đọc Qua RAM LUT',
    title: 'S3: Fee_Read() — Tra Cứu O(1) Qua RAM LUT, BlockOffset & Partial Read',
    summary:
      'Minh họa cơ chế tra cứu O(1) qua RAM LUT (không cần quét lại toàn bộ Bank DFlash) kết hợp khả năng Partial Read theo đúng BlockOffset + Length nhỏ hơn FeeBlockSize (đọc 4 bytes giữa khối EngCalib 24B).',
    setupExplain:
      'Bank 0 đã có sẵn 2 khối hợp lệ: Blk#1 (0x0010, 24B tại +0x00) và Blk#2_EngCalib_DS0 (0x0020, 32B tại +0x18). RAM LUT Cache đang BẬT (FeeEnableRamLutCache = TRUE).',
    setupMeta: {
      apiFlow: 'Hệ thống MEMIF_IDLE với RAM LUT đã dựng',
      bitImpact: 'Thanh A: 0x81 | Thanh B: B3 LUT_CACHED = 1 (0xE8)',
      memoryImpact: 'LUT[0x0020] = { Bank 0, Offset +0x18, Seq #1, VALID }',
      swsRef: 'SWS_Fee_00087 / SWS_Fee_00021'
    },
    setup() {
      resetRuntimeBlockCatalog();
      ecucConfig = { ...defaultConfig, FeeEnableRamLutCache: true };
      createInitialSimState('DEFAULT_LIGHT');
      ecucConfig.SelectedFeeBlock = '0x0020';
    },
    steps: [
      {
        label: '1. Tra cứu O(1) trong bảng RAM LUT cho Block 0x0020',
        desc:
          'Khi FeeEnableRamLutCache = TRUE, Fee giữ sẵn bảng ánh xạ trong RAM: 0x0020 → Bank 0, Offset +0x18, Seq #1. Nhờ vậy Fee tìm ngay vị trí vật lý của bản mới nhất chỉ sau 1 phép tra O(1) mà không phải quét tuyến tính O(N) các Header trên Bank 0.',
        apiFlow: 'Fee_BlockLutCache[0x0020] → { Bank 0, Offset +0x18, VALID }',
        bitImpact: 'Thanh B: B3 LUT_CACHED = 1, B5 VALID_TRAILR = 1 (0xE8)',
        memoryImpact: 'O(1) Lookup Hit tại Bank 0 +0x18 (bỏ qua đọc Header tuần tự)',
        swsRef: 'SWS_Fee_00087 / SWS_Fee_00172',
        action() {
          simState.clockMs += 5;
          simState.selectedModule = 'MOD_FEE';
          const entry = simState.lut['0x0020'];
          if (entry) {
            const slot = simState.banks[entry.bankId].slots.find((s) => s.offset === entry.offset);
            if (slot) simState.selectedSlotUid = slot.uid;
          }
          addTrace('Fee', 'LUT Lookup(0x0020)', `O(1) Hit -> Bank ${entry ? entry.bankId : 0} +0x${entry ? entry.offset.toString(16).toUpperCase() : '0'}`, 'OK');
          setCodeSnippet(
            'RAM LUT O(1) Address Lookup',
            `const Fee_LutEntryType* e = &Fee_BlockLutCache[0x0020];\n/* e->Bank = 0, e->Offset = 0x18, e->Status = VALID */\n/* Tiet kiem toan bo thoi gian scan linear! */`
          );
          pushStepLog('Tra cứu O(1) RAM LUT[0x0020] -> Bank 0 +0x18.');
          syncBitRegistersFromState();
        }
      },
      {
        label: '2. NvM gọi Partial Read: Fee_Read(0x0020, BlockOffset=8, DstBuf, Length=4)',
        desc:
          'Ứng dụng chỉ cần đọc 4 bytes tham số ở giữa khối EngCalib 24B (từ byte thứ 8). NvM/MemIf gọi Fee_Read(0x0020, 8, BufPtr, 4). Fee kiểm tra hợp lệ biên (Offset 8 < 24 và 8+4 <= 24), tính địa chỉ vật lý = 0x18 + 8(Hdr) + 8(Ofs) = +0x28 và bật MEMIF_BUSY.',
        apiFlow: 'NvM → MemIf_Read(0, 0x0020, 8, Buf, 4) → Fee_Read(0x0020, 8, Buf, 4)',
        bitImpact: 'Thanh A: B6 FEE_BUSY = 1, B0 = 0 | JobResult = MEMIF_JOB_PENDING',
        memoryImpact: 'Địa chỉ đọc DFlash = Bank0(0x0800_0000) + 0x18 + 8(Hdr) + 8(Ofs) = 0x0800_0028',
        swsRef: 'SWS_Fee_00087 / SWS_Fee_00021 / SWS_Fee_00135',
        action() {
          apiFeeRead('0x0020', { offset: 8, length: 4 });
        }
      },
      {
        label: '3. Tick 1 (+5ms): Fls_Read() hoàn tất & Callback JobEndNotification()',
        desc:
          'Trong Fee_MainFunction(), tầng dưới Fls_Read(0x0800_0028, DstBuf, 4) đọc đúng 4 bytes cần thiết vào RAM Buffer, xác nhận không có lỗi ECC/Trailer và phát Fee_JobEndNotification() → NvM_JobEndNotification() với kết quả MEMIF_JOB_OK.',
        apiFlow: 'Fls_Read(0x0800_0028, 4B) → Fee_JobEndNotification() → NvM_JobEndNotification()',
        bitImpact: 'Thanh A: 0x81 (B6 FEE_BUSY = 0, B0 JOB_OK_DONE = 1) | Status: MEMIF_IDLE',
        memoryImpact: 'Read Output trả về lát cắt Ofs=8, Len=4/24B trong 5ms (1 tick)',
        swsRef: 'SWS_Fee_00021 / SWS_Fee_00055 / SWS_Fee_00095',
        action() {
          stepMainFunctionTick();
        }
      },
      {
        label: '4. Đối chiếu Full Block Read: Fee_Read(0x0010, Offset=0, Length=14)',
        desc:
          'Gọi tiếp Fee_Read(0x0010, 0, Buf, 14) để đọc toàn bộ payload 14 bytes của Blk#1_Odometer. Lưu ý: tuy trên Flash slot chiếm 24B (do 8B Header + 2B Padding 0xFF), Fee tự động cắt bỏ Header và Padding 0xFF để trả về đúng 14 bytes raw payload cho NvM.',
        apiFlow: 'Fee_Read(0x0010, Ofs=0, Buf, Len=14) → Fls_Read(0x0800_0008, 14B)',
        bitImpact: 'Thanh A: 0x81 | Read Output: Ofs=0, Len=14/14B (MEMIF_JOB_OK)',
        memoryImpact: 'Fee tự động loại bỏ 8B Header và 2B Padding 0xFF khi trả về NvM',
        swsRef: 'SWS_Fee_00087 / SWS_Fee_00196',
        action() {
          ecucConfig.SelectedFeeBlock = '0x0010';
          apiFeeRead('0x0010', { offset: 0, length: 14 });
          stepCompleteAsyncJob();
        }
      }
    ],
    whatIfs: [
      {
        label: 'What-If: Đọc quá Offset (>= BlockSize) → DET?',
        run() {
          apiFeeRead('0x0020', { offset: 30, length: 4 });
        }
      },
      {
        label: 'What-If: Tắt RAM LUT Cache (O(N) Linear Scan chậm hơn)?',
        run() {
          ecucConfig.FeeEnableRamLutCache = false;
          rebuildRamLutFromFlash();
          apiFeeRead('0x0020', { offset: 0, length: 24 });
          stepCompleteAsyncJob();
        }
      },
      {
        label: 'What-If: Bật lỗi ECC Bit-Flip khi đọc 0x0020?',
        run() {
          ecucConfig.SimulateFlashEccBitFlip = true;
          apiFeeRead('0x0020', { offset: 0, length: 8 });
          stepCompleteAsyncJob();
        }
      }
    ]
  },

  // --------------------------------------------------------------------------
  // NHÓM 2: WEAR LEVELING, INVALIDATION & KHÔI PHỤC SẬP NGUỒN
  // --------------------------------------------------------------------------
  {
    id: 'S4',
    group: 'Nhóm 2: Wear Leveling, Invalidation & Khôi Phục Sập Nguồn',
    title: 'S4: Ghi Nối Đuôi (Append-Only Wear Leveling) & Đa Tập Dữ Liệu (Dataset)',
    summary:
      'Chứng minh hai cơ chế lõi của Fee: (1) Ghi nối đuôi Append-Only kéo dài tuổi thọ DFlash mà không tăng EraseCount (bản cũ thành SUPERSEDED), và (2) Quản lý đa tập dữ liệu Dataset Block Index (0x0020 DS0 vs 0x0021 DS1) hoàn toàn độc lập với nhau.',
    setupExplain:
      'Bank 0 đang có Blk#1_Odometer (0x0010 #1 VALID) và Blk#2_EngCalib_DS0 (0x0020 #1 VALID). EraseCount của Bank 0 = 1. Chế độ FAST (64 B/tick) được bật để quan sát nhanh chuỗi Append-Only.',
    setupMeta: {
      apiFlow: 'Khởi tạo DEFAULT_LIGHT ở MEMIF_MODE_FAST',
      bitImpact: 'Thanh A: 0x91 (B7 INIT=1, B4 FAST_MODE=1, B0 OK=1)',
      memoryImpact: 'Bank 0: 56/256B | EraseCount B0 = 1',
      swsRef: 'SWS_Fee_00007 / SWS_Fee_00100 / Wear Leveling'
    },
    setup() {
      resetRuntimeBlockCatalog();
      ecucConfig = { ...defaultConfig, ActiveMemIfMode: 'MEMIF_MODE_FAST' };
      createInitialSimState('DEFAULT_LIGHT');
      ecucConfig.SelectedFeeBlock = '0x0010';
    },
    steps: [
      {
        label: '1. Pha 1 (Append-Only): Ghi lần 2 Blk#1 (0x0010) → Bản #1 thành SUPERSEDED',
        desc:
          'Vì Data Flash không thể ghi đè bit 0->1 tại chỗ, Fee không xóa Sector mà ghi nối đuôi bản #2 của 0x0010 vào offset mới (+0x38). Khi Trailer 0xA5A5 chốt xong, bản #1 chuyển sang SUPERSEDED (Bit 2 = 1) và RAM LUT trỏ sang bản #2. Lưu ý: EraseCount vẫn = 1!',
        apiFlow: 'Fee_Write(0x0010, #2) → Append @ +0x38 → Mark #1 SUPERSEDED',
        bitImpact: 'Bản #1: Thanh B Bit 2 SUPERSEDED = 1 | Bản #2: Bit 3 LUT_CACHED = 1 (0xE8)',
        memoryImpact: 'Bank 0 tăng lên 80/256B | EraseCount B0 giữ nguyên = 1',
        swsRef: 'SWS_Fee_00088 / SWS_Fee_00153 / Append-Only',
        action() {
          apiFeeWrite('0x0010', '0x00 0x01 0x8B [ODO=101,001km #2]');
          stepCompleteAsyncJob();
        }
      },
      {
        label: '2. Ghi lần 3 Blk#1 (0x0010) → Chuỗi Wear Leveling [#1 OLD → #2 OLD → #3 VALID]',
        desc:
          'SWC_Odometer cập nhật km lần 3: Fee tiếp tục ghi nối đuôi bản #3 tại +0x50. Bây giờ trên Bank 0 có chuỗi 3 instance của 0x0010, trong đó #1 và #2 là rác SUPERSEDED (sẽ bị bỏ qua khi GC), chỉ duy nhất #3 là VALID trong RAM LUT.',
        apiFlow: 'Fee_Write(0x0010, #3) → Append @ +0x50 → Mark #2 SUPERSEDED',
        bitImpact: 'RAM LUT[0x0010] cập nhật sang Seq #3 (+0x50)',
        memoryImpact: 'Bank 0: 104/256B (48B rác SUPERSEDED) | EraseCount vẫn = 1',
        swsRef: 'SWS_Fee_00102 / Wear Leveling Endurance',
        action() {
          apiFeeWrite('0x0010', '0x00 0x01 0x8C [ODO=101,002km #3]');
          stepCompleteAsyncJob();
        }
      },
      {
        label: '3. Pha 2 (Dataset Block): Ghi Blk#2 Dataset 0 (0x0020 — Eco Map)',
        desc:
          'Với FeeDatasetSelectionBits = 2, MemIf mã hóa BlockNumber = (BaseId << 2) | DatasetIdx. Dataset 0 của EngCalib mang mã 0x0020. Ghi cập nhật mới cho 0x0020 sẽ ghi nối đuôi và chỉ đánh dấu SUPERSEDED các bản cũ của chính 0x0020.',
        apiFlow: 'NvM_SetDataIndex(0) → MemIf_Write(0x0020) → Fee_Write(0x0020)',
        bitImpact: 'LUT[0x0020] = Seq #2 VALID | 0x0020 #1 → SUPERSEDED',
        memoryImpact: 'Bank 0: 136/256B | 0x0010 #3 vẫn nguyên vẹn',
        swsRef: 'SWS_Fee_00007 / SWS_Fee_00100 / ECUC_Fee_00150',
        action() {
          ecucConfig.SelectedFeeBlock = '0x0020';
          apiFeeWrite('0x0020', '0x20 0xEC 0x00 [EngCalib_DS0 Eco Map]');
          stepCompleteAsyncJob();
        }
      },
      {
        label: '4. Ghi song song Blk#2 Dataset 1 (0x0021 — Sport Map) → Không đè DS0!',
        desc:
          'NvM chọn Dataset Index = 1 (0x0021) và gọi Fee_Write(0x0021). Vì 0x0020 và 0x0021 có BlockNumber khác nhau ở 2 bit cuối, Fee quản lý chúng như 2 block độc lập: cả DS0 (0x0020) và DS1 (0x0021) đều giữ trạng thái VALID song song trong RAM LUT!',
        apiFlow: 'NvM_SetDataIndex(1) → MemIf_Write(0x0021) → Fee_Write(0x0021)',
        bitImpact: 'RAM LUT chứa đồng thời cả 0x0020 (DS0 VALID) và 0x0021 (DS1 VALID)',
        memoryImpact: 'Bank 0: 168/256B | DS0 (0x0020) KHÔNG bị SUPERSEDED bởi DS1',
        swsRef: 'SWS_Fee_00007 / SWS_Fee_00100 / Dataset Independence',
        action() {
          ecucConfig.SelectedFeeBlock = '0x0021';
          apiFeeWrite('0x0021', '0x21 0x5P 0x01 [EngCalib_DS1 Sport Map]');
          stepCompleteAsyncJob();
        }
      },
      {
        label: '5. Cập nhật riêng Dataset 1 (0x0021 #2) → Chỉ DS1 cũ thành SUPERSEDED',
        desc:
          'Khi cập nhật lại riêng Dataset 1 (0x0021), chỉ bản DS1 #1 cũ chuyển sang SUPERSEDED, trong khi Dataset 0 (0x0020) vẫn an toàn VALID. Kiểm chứng bằng bảng RAM LUT: luôn có 3 block hợp lệ (0x0010, 0x0020, 0x0021).',
        apiFlow: 'Fee_Write(0x0021, #2) → Chỉ 0x0021 #1 thành SUPERSEDED; DS0 nguyên vẹn',
        bitImpact: '0x0021 #1: Bit 2 SUPERSEDED=1 | 0x0020 #2: VALID | 0x0021 #2: VALID',
        memoryImpact: 'Chứng minh 100% tính độc lập giữa các Dataset và Wear Leveling không cần Erase',
        swsRef: 'SWS_Fee_00007 / SWS_Fee_00100',
        action() {
          apiFeeWrite('0x0021', '0x21 0x5P 0x02 [EngCalib_DS1 Tuned #2]');
          stepCompleteAsyncJob();
          setCodeSnippet(
            'Dataset Addressing Formula',
            `/* FeeDatasetSelectionBits = 2 */\n#define FEE_BLOCK_ENGCALIB_DS0  ((0x0008U << 2) | 0U) /* = 0x0020 */\n#define FEE_BLOCK_ENGCALIB_DS1  ((0x0008U << 2) | 1U) /* = 0x0021 */\n/* Hai BlockNumber doc lap: ghi DS1 khong lam mat DS0! */`
          );
          syncBitRegistersFromState();
        }
      }
    ],
    whatIfs: [
      {
        label: 'What-If: Ghi thêm để kích hoạt GC dọn sạch các bản SUPERSEDED?',
        run() {
          for (let i = 0; i < 2; i++) {
            apiFeeWrite('0x0010', `0x00 0xAA [Wear Trigger #${i + 1}]`);
            stepCompleteAsyncJob();
          }
        }
      },
      {
        label: 'What-If: Soi một Slot SUPERSEDED để xem Thanh B Bit 2 = 1?',
        run() {
          const old = simState.banks[simState.activeBank].slots.find((s) => s.status === 'SUPERSEDED');
          if (old) simState.selectedSlotUid = old.uid;
          syncBitRegistersFromState();
        }
      },
      {
        label: 'What-If: Đọc lại cả DS0 (0x0020) và DS1 (0x0021) kiểm chứng?',
        run() {
          apiFeeRead('0x0020');
          stepCompleteAsyncJob();
          apiFeeRead('0x0021');
          stepCompleteAsyncJob();
        }
      }
    ]
  },

  {
    id: 'S5',
    group: 'Nhóm 2: Wear Leveling, Invalidation & Khôi Phục Sập Nguồn',
    title: 'S5: Fee_InvalidateBlock() & Phản Hồi MEMIF_BLOCK_INVALID Khi Đọc Lại',
    summary:
      'Giải thích cách xóa mềm logic một Logical Block (ví dụ reset VIN/Coding khi bảo dưỡng UDS) mà không thể xóa 1 block đơn lẻ trên DFlash: Fee ghi Invalidation Marker ở cuối Bank, đánh dấu bản cũ SUPERSEDED, và trả về MEMIF_BLOCK_INVALID khi NvM đọc lại.',
    setupExplain:
      'Bank 0 đang chứa Blk#1 (0x0010), Blk#2 (0x0020) và Blk#4_DiagVinCode (0x0040) ở trạng thái VALID. Block đang chọn là 0x0040 (DiagVinCode).',
    setupMeta: {
      apiFlow: 'Hệ thống MEMIF_IDLE có sẵn 0x0040 VALID',
      bitImpact: 'Thanh A: 0x81 | 0x0040: VALID (Thanh B = 0xE8)',
      memoryImpact: 'LUT[0x0040] = VALID @ Bank 0 +0x38',
      swsRef: 'SWS_Fee_00092 / SWS_Fee_00036'
    },
    setup() {
      resetRuntimeBlockCatalog();
      ecucConfig = { ...defaultConfig, ActiveMemIfMode: 'MEMIF_MODE_FAST' };
      createInitialSimState('DEFAULT_LIGHT');
      apiFeeWrite('0x0040', '57 44 42 [VIN=WDB123456 VALID]');
      stepCompleteAsyncJob();
      simState.clockMs = 0;
      simState.trace = [];
      simState.stepLog = [];
      ecucConfig.SelectedFeeBlock = '0x0040';
      pushStepLog('Setup S5: Blk#4 DiagVinCode (0x0040) đang VALID trên Bank 0 & RAM LUT.');
    },
    steps: [
      {
        label: '1. Kiểm chứng đọc Blk#4 DiagVinCode (0x0040) trước khi xóa → MEMIF_JOB_OK',
        desc:
          'Trước khi vô hiệu hóa, NvM đọc thử 0x0040 qua Fee_Read(0x0040). Do bản ghi có Valid Trailer 0xA5A5 và chưa bị Invalidate, Fee trả về dữ liệu VIN bình thường với JobResult = MEMIF_JOB_OK.',
        apiFlow: 'Fee_Read(0x0040) → Fls_Read() → MEMIF_JOB_OK',
        bitImpact: 'Thanh A: 0x81 (B0 JOB_OK_DONE = 1) | Thanh B: B5 VALID_TRAILR = 1',
        memoryImpact: 'Đọc được VIN=WDB123456 từ Bank 0 +0x38',
        swsRef: 'SWS_Fee_00087 / SWS_Fee_00021 / SWS_Fee_00055',
        action() {
          apiFeeRead('0x0040');
          stepCompleteAsyncJob();
        }
      },
      {
        label: '2. Xưởng UDS yêu cầu xóa cấu hình: NvM gọi Fee_InvalidateBlock(0x0040)',
        desc:
          'Do DFlash không xóa lẻ từng byte được, thay vì gọi Fls_Erase() xóa cả Sector, NvM gọi Fee_InvalidateBlock(0x0040). Fee bật MEMIF_BUSY (Bit 6 = 1) và cấp phát một slot Invalidation Marker nhỏ nối đuôi ở cuối Bank 0.',
        apiFlow: 'UDS Service 0x31 → NvM_InvalidateNvBlock → Fee_InvalidateBlock(0x0040)',
        bitImpact: 'Thanh A: B6 FEE_BUSY = 1 | JobResult = MEMIF_JOB_PENDING',
        memoryImpact: 'Cấp phát slot INVALID_MARKER (0x00) nối đuôi ở Bank 0 +0x50 (không gọi Fls_Erase)',
        swsRef: 'SWS_Fee_00092 / SWS_Fee_00036 / SWS_Fee_00192',
        action() {
          apiFeeInvalidate('0x0040');
        }
      },
      {
        label: '3. Tick 1: Ghi xong Invalidation Marker (🟣 INVALIDATED, Bit 1 Thanh B = 1)',
        desc:
          'Fee_MainFunction() ghi xong Marker vô hiệu hóa xuống Flash: bản ghi mới của 0x0040 đổi sang màu tím INVALIDATED (Thanh B: Bit 1 INVALIDATED = 1, Bit 5 VALID_TRAILR = 0), bản VIN cũ chuyển thành SUPERSEDED, RAM LUT cập nhật trạng thái của 0x0040 thành INVALIDATED và trả MEMIF_JOB_OK.',
        apiFlow: 'Fee_MainFunction() → Fls_Write(INVALID_MARKER) → Fee_JobEndNotification()',
        bitImpact: 'Thanh A: 0x81 (MEMIF_JOB_OK) | Thanh B: B1 INVALIDATED = 1, B5 = 0',
        memoryImpact: 'LUT[0x0040] = INVALIDATED | Bản VIN cũ → SUPERSEDED (EraseCount không tăng)',
        swsRef: 'SWS_Fee_00092 / SWS_Fee_00037 / SWS_Fee_00055',
        action() {
          stepMainFunctionTick();
        }
      },
      {
        label: '4. Thử gọi lại Fee_Read(0x0040) sau khi đã Invalidate',
        desc:
          'Ở lần đọc tiếp theo (hoặc lúc NvM_ReadAll() khi khởi động lại), NvM gọi Fee_Read(0x0040). Fee tra RAM LUT thấy ngay cờ status == INVALIDATED mà không cần đọc payload.',
        apiFlow: 'NvM → MemIf_Read(0, 0x0040) → Fee_Read(0x0040) [LUT Hit = INVALIDATED]',
        bitImpact: 'Thanh A: B6 FEE_BUSY = 1 | JobResult = MEMIF_JOB_PENDING',
        memoryImpact: 'RAM LUT trả thẳng slot tím INVALIDATED tại Bank 0 +0x50',
        swsRef: 'SWS_Fee_00087 / SWS_Fee_00022',
        action() {
          apiFeeRead('0x0040');
        }
      },
      {
        label: '5. Phản hồi MEMIF_BLOCK_INVALID → NvM nạp ROM Default (Khác INCONSISTENT)',
        desc:
          'Fee_MainFunction() kết thúc đọc với JobResult = MEMIF_BLOCK_INVALID (Thanh A bật Bit 1 JOB_ERR_PEND = 1) và gọi Fee_JobErrorNotification(). NvM phân biệt rõ MEMIF_BLOCK_INVALID (xóa chủ đích -> nạp ROM Default êm ái) với MEMIF_BLOCK_INCONSISTENT (lỗi hỏng/mất nguồn -> báo lỗi).',
        apiFlow: 'Fee_JobErrorNotification() [MEMIF_BLOCK_INVALID] → NvM_JobErrorNotification() → Load ROM Default',
        bitImpact: 'Thanh A: B6 = 0, B1 JOB_ERR_PEND = 1 | JobResult = MEMIF_BLOCK_INVALID',
        memoryImpact: 'NvM khôi phục dữ liệu mặc định từ ROM Default cho SWC',
        swsRef: 'SWS_Fee_00022 / SWS_Fee_00160 / SWS_Fee_00056',
        action() {
          stepMainFunctionTick();
        }
      }
    ],
    whatIfs: [
      {
        label: 'What-If: Ghi lại giá trị mới cho 0x0040 sau khi Invalidate?',
        run() {
          apiFeeWrite('0x0040', '57 44 42 [VIN New Re-Coded]');
          stepCompleteAsyncJob();
        }
      },
      {
        label: 'What-If: Chạy GC để dọn sạch bản INVALIDATED luôn?',
        run() {
          startGarbageCollectionInternal(null);
          stepCompleteAsyncJob();
        }
      },
      {
        label: 'What-If: Invalidate chính block Immediate 0x0030?',
        run() {
          apiFeeInvalidate('0x0030');
          stepCompleteAsyncJob();
        }
      }
    ]
  },

  {
    id: 'S6',
    group: 'Nhóm 2: Wear Leveling, Invalidation & Khôi Phục Sập Nguồn',
    title: 'S6: Mất Nguồn Giữa Chừng (Torn Write) → INCONSISTENT & Auto Fallback Bản Cũ',
    summary:
      'Kịch bản an toàn kinh điển trên ô tô: Ắc-quy sụt áp đúng lúc ECU đang ghi Phase 2 bản Odometer/Calib mới (chưa kịp chốt Trailer 0xA5A5 -> Torn Write). Khi ECU bật lại và gọi Fee_Init(), Fee phát hiện bản lỗi INCONSISTENT và tự động Fallback lùi về bản cũ toàn vẹn!',
    setupExplain:
      'Bank 0 đang có bản VALID lành lặn của Blk#2_EngCalib_DS0 (0x0020 Seq #1 @ +0x18). Đã bật SimulatePowerLossDuringWrite = TRUE và FeeAutoFallbackPreviousInstance = TRUE ở chế độ SLOW (8 B/tick).',
    setupMeta: {
      apiFlow: 'Chuẩn bị mô phỏng Brown-out giữa lệnh Fee_Write(0x0020)',
      bitImpact: 'Thanh A: 0x81 | Bản cũ 0x0020 #1 đang VALID (0xE8)',
      memoryImpact: 'SimulatePowerLossDuringWrite = TRUE | AutoFallback = TRUE',
      swsRef: 'SWS_Fee_00023 / SWS_Fee_00153 / SWS_Fee_00154'
    },
    setup() {
      resetRuntimeBlockCatalog();
      ecucConfig = {
        ...defaultConfig,
        ActiveMemIfMode: 'MEMIF_MODE_SLOW',
        FlsBytesPerCycleSlow: 8,
        SimulatePowerLossDuringWrite: true,
        FeeAutoFallbackPreviousInstance: true
      };
      createInitialSimState('DEFAULT_LIGHT');
      ecucConfig.SelectedFeeBlock = '0x0020';
    },
    steps: [
      {
        label: '1. Bắt đầu ghi bản mới 0x0020 (Seq #2) với SimulatePowerLoss = TRUE',
        desc:
          'NvM gọi Fee_Write(0x0020) để lưu bản hiệu chỉnh mới (32B). Fee cấp phát slot mới #2 nối đuôi ở cuối Bank 0 (+0x38), vẫn giữ nguyên bản #1 cũ là VALID cho đến khi bản #2 chốt xong Valid Trailer.',
        apiFlow: 'NvM → Fee_Write(0x0020, NewCalib) → Cấp phát Seq #2 @ +0x38',
        bitImpact: 'Thanh A: B6 FEE_BUSY = 1 | Slot #2 ở trạng thái WRITING_HDR',
        memoryImpact: 'Bản #1 (+0x18) vẫn giữ nguyên toàn vẹn làm chốt chặn an toàn',
        swsRef: 'SWS_Fee_00088 / SWS_Fee_00025',
        action() {
          apiFeeWrite('0x0020', '0x99 0x88 0x77 [New Calib PowerCut Soon]');
        }
      },
      {
        label: '2. Tick 1 (+5ms): Phase 1 ghi xong Block Header 8B (HDR_WRITTEN = 1)',
        desc:
          'Fee_MainFunction() ghi thành công 8B Block Header xuống Bank 0 +0x38. Thanh B bật Bit 7 HDR_WRITTEN = 1 và slot chuyển sang WRITING_DATA. Do chưa ghi xong Payload và chưa có Trailer 0xA5A5, Bit 5 VALID_TRAILR vẫn = 0.',
        apiFlow: 'Fee_MainFunction() → Fls_Write(Header 8B) [Phase 1 Done]',
        bitImpact: 'Thanh B: B7 HDR_WRITTEN = 1, B5 VALID_TRAILR = 0 (WRITING_DATA)',
        memoryImpact: 'Đã ghi 8/32B tại Bank 0 +0x38; chuẩn bị vào Phase 2',
        swsRef: 'SWS_Fee_00097 / SWS_Fee_00153',
        action() {
          stepMainFunctionTick();
        }
      },
      {
        label: '3. Tick 2 (+5ms): ⚡ Mất nguồn ECU giữa Phase 2 → TORN WRITE (INCONSISTENT)!',
        desc:
          'Ngay khi đang nạp Phase 2 Payload, nguồn ECU bị ngắt đột ngột! Bước 3 (Valid Trailer 0xA5A5) không bao giờ được thực thi. Slot #2 trở thành bản ghi dở dang (Torn Write: có Header B7=1 nhưng thiếu Trailer B5=0) → INCONSISTENT, ECU mất điện về MEMIF_UNINIT.',
        apiFlow: 'HW Power Cut giữa Phase 2 → Torn Write @ +0x38 → Reset ECU (MEMIF_UNINIT)',
        bitImpact: 'Thanh A: 0x02 (B7 FEE_INIT=0) | Thanh B Slot #2: B7=1, B5=0, B0 INCONSISTENT=1',
        memoryImpact: 'Slot #2 đỏ (INCONSISTENT) nằm cuối Bank 0; RAM LUT mất sạch do tắt nguồn',
        swsRef: 'SWS_Fee_00023 / SWS_Fee_00153 / SWS_Fee_00154',
        action() {
          stepMainFunctionTick();
        }
      },
      {
        label: '4. ECU có điện lại: Fee_Init() + Fee_MainFunction() quét phát hiện Torn Write & Fallback #1',
        desc:
          'Khi bật khóa điện lại, EcuM gọi Fee_Init(&Fee_Config) [SWS_Fee_00120] (chuyển sang MEMIF_BUSY_INTERNAL), sau đó Fee_MainFunction() [SWS_Fee_00197] quét Bank 0 phát hiện Slot #2 thiếu Trailer 0xA5A5 (INCONSISTENT). Nhờ FeeAutoFallbackPreviousInstance = TRUE, Fee bỏ qua bản hỏng #2 và tự động Fallback bản cũ Seq #1 (+0x18) lên VALID trong RAM LUT rồi về MEMIF_IDLE!',
        apiFlow: 'EcuM → Fee_Init() [BUSY_INTERNAL] → Fee_MainFunction() [Fallback Seq #1] → MEMIF_IDLE',
        bitImpact: 'Thanh A: 0x81 (MEMIF_IDLE) | Bản #1 được khôi phục Bit 3 LUT_CACHED = 1',
        memoryImpact: 'LUT[0x0020] = Bank 0 +0x18 (Seq #1); bản hỏng #2 bị bỏ qua an toàn',
        swsRef: 'SWS_Fee_00085 / SWS_Fee_00120 / SWS_Fee_00197',
        action() {
          ecucConfig.SimulatePowerLossDuringWrite = false;
          simState.clockMs += 10;
          apiFeeInit('Recovery After Power Cut');
          stepMainFunctionTick();
        }
      },
      {
        label: '5. Fee_Read(0x0020) → Trả MEMIF_JOB_OK với dữ liệu bản #1 toàn vẹn 100%!',
        desc:
          'NvM_ReadAll() gọi Fee_Read(0x0020). Nhờ RAM LUT đã trỏ về bản cũ Seq #1 lành lặn, Fee đọc thành công 100% dữ liệu hiệu chỉnh cũ và trả MEMIF_JOB_OK — cứu ECU không bị mất dữ liệu quan trọng dù mất nguồn giữa lúc Flash!',
        apiFlow: 'Fee_Read(0x0020) → Fls_Read(Seq #1 @ +0x18) → MEMIF_JOB_OK',
        bitImpact: 'Thanh A: 0x81 (B0 JOB_OK_DONE = 1) | Read Output = Seq #1 VALID',
        memoryImpact: 'Dữ liệu 0x0020 được bảo toàn 100% sau sự cố Torn Write',
        swsRef: 'SWS_Fee_00023 / SWS_Fee_00055',
        action() {
          apiFeeRead('0x0020');
          stepCompleteAsyncJob();
        }
      }
    ],
    whatIfs: [
      {
        label: 'What-If: Tắt Auto Fallback (Báo INCONSISTENT lên NvM)?',
        run() {
          ecucConfig.FeeAutoFallbackPreviousInstance = false;
          injectTornWritePowerLoss('0x0010');
          apiFeeInit('No Fallback Mode', { completeImmediately: true });
          apiFeeRead('0x0010');
          stepCompleteAsyncJob();
        }
      },
      {
        label: 'What-If: Bơm thêm 1 Torn Write trên Blk#1 (0x0010)?',
        run() {
          injectTornWritePowerLoss('0x0010');
        }
      },
      {
        label: 'What-If: Ghi đè bản sạch mới sau khi phục hồi?',
        run() {
          ecucConfig.SimulatePowerLossDuringWrite = false;
          if (!ecucConfig.FeeInitialized) apiFeeInit('Auto Init', { completeImmediately: true });
          apiFeeWrite('0x0020', '0x00 0x01 0xA5 [Clean Recovery #3]');
          stepCompleteAsyncJob();
        }
      }
    ]
  },

  // --------------------------------------------------------------------------
  // NHÓM 3: GARBAGE COLLECTION, IMMEDIATE DATA & MODE/CANCEL
  // --------------------------------------------------------------------------
  {
    id: 'S7',
    group: 'Nhóm 3: Garbage Collection, Immediate Data & Mode/Cancel',
    title: 'S7: Thu Gom Rác Tự Động (Garbage Collection: Bank 0 → Bank 1) & Fls_Erase',
    summary:
      'Kịch bản trọng tâm của Fee: Bank 0 chứa nhiều rác SUPERSEDED gần chạm ngưỡng GC 75% (176B/256B, ngưỡng 192B). Khi nhận lệnh ghi 32B vượt ngưỡng, Fee giữ lệnh ở pendingUserJob, giữ trạng thái MEMIF_BUSY [SWS_Fee_00025 / SWS_Fee_00129] & MEMIF_JOB_PENDING [SWS_Fee_00156], chạy Foreground GC (copy các block VALID sang Bank 1, đảo Active Bank rồi gọi Fls_Erase(Bank 0) mất 3 ticks) trước khi thực thi nốt lệnh ghi.',
    setupExplain:
      'Bank 0 đang dùng 176/256B (gồm 4 bản rác SUPERSEDED chiếm 112B và chỉ 3 bản VALID thực sự: 0x0040, 0x0010, 0x0030 chiếm 64B). Ngưỡng GC Standard Limit = 75% (192B). Bank 1 đang trắng 0xFF.',
    setupMeta: {
      apiFlow: 'Bank 0 gần ngưỡng GC (176/192B Standard Limit)',
      bitImpact: 'Thanh A: 0x91 (MEMIF_IDLE, FAST MODE) | Erase B0/B1 = 1/1',
      memoryImpact: 'Bank 0: 176B used (112B rác + 64B Valid) | Bank 1: 0B (Standby Erased)',
      swsRef: 'SWS_Fee_00025 / SWS_Fee_00102 / SWS_Fee_00129'
    },
    setup() {
      resetRuntimeBlockCatalog();
      ecucConfig = { ...defaultConfig, ActiveMemIfMode: 'MEMIF_MODE_FAST', FlsSectorEraseDurationTicks: 3 };
      createInitialSimState('GC_READY_MIXED');
      ecucConfig.SelectedFeeBlock = '0x0020';
    },
    steps: [
      {
        label: '1. Ghi 0x0020 (32B) vượt ngưỡng 75% → Foreground GC (MEMIF_BUSY [SWS_Fee_00025])',
        desc:
          'NvM gọi Fee_Write(0x0020) cần 32B, nhưng 176 + 32 = 208B > StandardLimit (192B). Vì có User Job đang chờ thực thi (pendingUserJob), theo chuẩn AUTOSAR [SWS_Fee_00025 / SWS_Fee_00129] Fee giữ trạng thái MEMIF_BUSY (Bit 6 FEE_BUSY = 1, Bit 3 GC_ACTIVE = 1) và JobResult = MEMIF_JOB_PENDING [SWS_Fee_00156] trong suốt quá trình Foreground GC!',
        apiFlow: 'Fee_Write(0x0020) [176+32 > 192B] → MEMIF_BUSY (MEMIF_JOB_PENDING) → Foreground GC',
        bitImpact: 'Thanh A: B6 FEE_BUSY = 1, B3 GC_ACTIVE = 1 | Module: MEMIF_BUSY',
        memoryImpact: 'Thu thập 3 khối VALID (0x0040, 0x0010, 0x0030) cần chép; bỏ qua 4 bản SUPERSEDED',
        swsRef: 'SWS_Fee_00088 / SWS_Fee_00025 / SWS_Fee_00129 / SWS_Fee_00156',
        action() {
          apiFeeWrite('0x0020', '0x00 0x09 0x99 [Trigger GC!]');
        }
      },
      {
        label: '2. GC Pha Copy Tick 1: Chép khối VALID đầu tiên (0x0040) sang đầu Bank 1',
        desc:
          'Tick đầu tiên của Foreground GC đọc khối VALID đầu tiên (0x0040 DiagVinCode, 24B) từ Bank 0 và ghi sang đầu Bank 1 (+0x00). Toàn bộ các bản rác SUPERSEDED ở đầu Bank 0 bị bỏ qua hoàn toàn.',
        apiFlow: 'Fee_MainFunction() → Fls_Read(Bank 0) → Fls_Write(Bank 1 +0x00) [1/3]',
        bitImpact: 'Thanh A: B6 FEE_BUSY = 1, B3 GC_ACTIVE = 1 | Sector SM: GC_COPYING_TO_STANDBY',
        memoryImpact: 'Bank 1 đã nhận 0x0040 (24B) | Tiến độ copy: 1/3 blocks',
        swsRef: 'SWS_Fee_00025 / SWS_Fee_00102',
        action() {
          stepMainFunctionTick();
        }
      },
      {
        label: '3. GC Pha Copy Tick 2..3: Chép nốt 0x0010 & 0x0030 (3/3) → Nén từ 176B xuống 64B!',
        desc:
          'Hai tick tiếp theo chép nốt bản VALID mới nhất của Odometer (0x0010, 24B) và CrashEvt (0x0030, 16B) sang Bank 1. Tổng dung lượng trên Bank 1 chỉ còn 64/256B (25%) — thu hồi được 112B rác (44% dung lượng Bank)!',
        apiFlow: 'Fee_MainFunction() → Copy 0x0010 & 0x0030 sang Bank 1 [3/3 Done]',
        bitImpact: 'GC Phase chuyển sang GC_SWITCH_BANK',
        memoryImpact: 'Bank 1 chứa đúng 64B dữ liệu sống (từ 176B bên Bank 0)',
        swsRef: 'SWS_Fee_00102',
        action() {
          stepMainFunctionTick();
          stepMainFunctionTick();
        }
      },
      {
        label: '4. Sector Switch: Đảo Active Bank = Bank 1 & Cập nhật toàn bộ RAM LUT',
        desc:
          'Fee đánh dấu Bank 1 thành ACTIVE BANK, chuyển Bank 0 sang BANK_ERASING và gọi Rebuild RAM LUT để trỏ toàn bộ địa chỉ tra cứu sang Bank 1. Nhờ đảo nhãn nguyên tử này, nếu mất điện lúc xóa Bank 0 ngay sau đây thì dữ liệu vẫn an toàn 100% trên Bank 1.',
        apiFlow: 'Sector Switch (Bank 1 = ACTIVE) → Rebuild RAM LUT → Chuẩn bị Fls_Erase(Bank 0)',
        bitImpact: 'Sector SM: GC_ERASING_OLD_BANK | RAM LUT trỏ 100% sang Bank 1',
        memoryImpact: 'Bank 1 = ACTIVE (64/256B, 25%) | Bank 0 = GC SOURCE / ERASING',
        swsRef: 'SWS_Fee_00102 / SWS_Fee_00103',
        action() {
          if (simState.gcState.active && simState.gcState.phase === 'GC_SWITCH_BANK') {
            stepMainFunctionTick();
          }
        }
      },
      {
        label: '5. Fls_Erase(Bank 0) (3 ticks): Xóa sạch Bank 0 về 0xFF & Tăng EraseCount',
        desc:
          'Fee gọi Fls_Erase(Bank 0) mất 3 ticks MainFunction (15ms) để kéo toàn bộ các bit của Bank 0 về 0xFF (BANK_ERASED_STANDBY). Bộ đếm hao mòn Bank 0 tăng từ 1 → 2, đồng thời giải phóng pendingUserJob (0x0020) bắt đầu ghi lên Bank 1!',
        apiFlow: 'Fls_Erase(Bank 0) [3 ticks] → Bank 0 = ERASED (0xFF) → Start Pending Write(0x0020)',
        bitImpact: 'Thanh A: B3 GC_ACTIVE = 0, B6 FEE_BUSY = 1 | Bank 0 EraseCount: 1 → 2',
        memoryImpact: 'Bank 0 sạch 100% (0xFF); lệnh ghi 0x0020 bắt đầu nạp lên Bank 1',
        swsRef: 'SWS_Fee_00102 / SWS_Fee_00025',
        action() {
          let guard = 0;
          while (simState.gcState.active && guard < 10) {
            stepMainFunctionTick();
            guard += 1;
          }
        }
      },
      {
        label: '6. Hoàn tất lệnh Fee_Write(0x0020) đang chờ lên Bank 1 → MEMIF_IDLE',
        desc:
          'Lệnh ghi 0x0020 (32B) bị hoãn ở Bước 1 giờ được nạp gọn gàng vào vùng trống trên Bank 1 (+0x40), chốt Trailer 0xA5A5, cập nhật RAM LUT và phát Fee_JobEndNotification() → NvM_JobEndNotification() (MEMIF_JOB_OK).',
        apiFlow: 'Fls_Write(Bank 1 +0x40, 32B) → Trailer 0xA5A5 → Fee_JobEndNotification()',
        bitImpact: 'Thanh A: 0x91 (B0 JOB_OK_DONE = 1, B4 FAST_MODE = 1) | Status: MEMIF_IDLE',
        memoryImpact: 'Bank 1: 96/256B (38% — toàn bộ VALID) | Bank 0: 0/256B (STANDBY ERASED)',
        swsRef: 'SWS_Fee_00055 / SWS_Fee_00095 / SWS_Fee_00102',
        action() {
          stepCompleteAsyncJob();
        }
      }
    ],
    whatIfs: [
      {
        label: 'What-If: Phun lỗi Fls_Erase Error giữa GC → Báo DEM?',
        run() {
          ecucConfig.SimulateFlsEraseError = true;
          startGarbageCollectionInternal(null);
          stepCompleteAsyncJob();
        }
      },
      {
        label: 'What-If: Hạ ngưỡng GC Threshold xuống 60% để GC chạy sớm?',
        run() {
          ecucConfig.FeeGcTriggerThresholdPct = 60;
          apiFeeWrite('0x0040', '56 49 4E [Early GC Trigger]');
        }
      },
      {
        label: 'What-If: Đổi sang R23-11 MemAcc xem API MemAcc_Erase?',
        run() {
          ecucConfig.FeeLowerLayerArchitecture = 'R23_MEMACC';
          startGarbageCollectionInternal(null);
          stepCompleteAsyncJob();
        }
      }
    ]
  },

  {
    id: 'S8',
    group: 'Nhóm 3: Garbage Collection, Immediate Data & Mode/Cancel',
    title: 'S8: Dữ Liệu Khẩn Cấp (FeeImmediateData) — Vùng Dự Trữ & Fee_EraseImmediateBlock()',
    summary:
      'Giải thích tại sao dữ liệu túi khí/va chạm (Blk#3 CrashEvt, FeeImmediateData=TRUE) không bao giờ phải chờ Garbage Collection xóa Sector (hàng trăm ms): Fee cho phép chuẩn bị vùng nhớ qua Fee_EraseImmediateBlock() và cho phép Immediate Write ngắt ngang GC (Preemption) để ghi ngay vào Reserved Immediate Zone.',
    setupExplain:
      'Bank 0 đang chạy dở Garbage Collection (MEMIF_BUSY_INTERNAL, GC_ACTIVE = 1, đã copy 1/3 khối sang Bank 1). Khối khẩn cấp Blk#3_CrashEvt (0x0030, 8B payload + 8B Hdr = 16B) có FeeImmediateData = TRUE.',
    setupMeta: {
      apiFlow: 'GC đang chạy nền (1/3 blocks copied Bank 0 → Bank 1)',
      bitImpact: 'Thanh A: B5 FEE_BUSY_INT = 1, B3 GC_ACTIVE = 1 | Status: MEMIF_BUSY_INTERNAL',
      memoryImpact: 'Bank 0 còn vùng vàng Reserved Immediate Zone (192B..256B)',
      swsRef: 'SWS_Fee_00009 / SWS_Fee_00094 / SWS_Fee_00074'
    },
    setup() {
      resetRuntimeBlockCatalog();
      ecucConfig = { ...defaultConfig, ActiveMemIfMode: 'MEMIF_MODE_SLOW' };
      createInitialSimState('GC_READY_MIXED');
      ecucConfig.SelectedFeeBlock = '0x0030';
      startGarbageCollectionInternal(null);
      stepMainFunctionTick(); // Copy 1 item so GC is actively mid-flight
    },
    steps: [
      {
        label: '1. Kiểm tra GC đang bận nền (MEMIF_BUSY_INTERNAL) & Vùng Dự Trữ Immediate',
        desc:
          'Fee đang bận Garbage Collection (GC_ACTIVE = 1). Nếu một Standard Block (0x0010, FeeImmediateData = FALSE) cố gọi ghi lúc này sẽ bị từ chối/chờ GC xong. Ngược lại, vùng 64B cuối Bank 0 (Reserved Immediate Zone) luôn được để dành riêng cho dữ liệu va chạm.',
        apiFlow: 'Fee_GetStatus() == MEMIF_BUSY_INTERNAL (GC Copy 1/3)',
        bitImpact: 'Thanh A: B5 FEE_BUSY_INT = 1, B3 GC_ACTIVE = 1, B2 IMM_PREEMPT = 0',
        memoryImpact: 'Bank 0 đã dùng 176B; 192B..256B là Reserved Immediate Zone',
        swsRef: 'SWS_Fee_00074 / SWS_Fee_00009',
        action() {
          simState.clockMs += 5;
          addTrace('Fee GC', 'Status = MEMIF_BUSY_INTERNAL', `GC đang chạy (${simState.gcState.copiedCount}/${simState.gcState.itemsToCopy.length} copied). Vùng Reserved Zone sẵn sàng cho 0x0030!`, 'WARN');
          setCodeSnippet(
            'Trạng thái GC Đang Chạy & Reserved Immediate Zone',
            `/* GC dang chay o nen (MEMIF_BUSY_INTERNAL) */\n/* Standard Block 0x0010 bi chan; chi Block co FeeImmediateData=TRUE duoc quyen Preempt! */`
          );
          pushStepLog('GC đang bận (1/3 copied). Vùng Reserved Immediate Zone vẫn trống.');
          syncBitRegistersFromState();
        }
      },
      {
        label: '2. Gọi Fee_EraseImmediateBlock(0x0030) bất đồng bộ [SWS_Fee_00094]',
        desc:
          'Tầng trên gọi Fee_EraseImmediateBlock(0x0030) [SWS_Fee_00094] khi Fee đang MEMIF_BUSY_INTERNAL: Fee kiểm tra 0x0030 có FeeImmediateData == TRUE [SWS_Fee_00068], xử lý bất đồng bộ trong Fee_MainFunction() (chuyển bản cũ SUPERSEDED, trả MEMIF_JOB_OK [SWS_Fee_00055]), sau đó phục hồi MEMIF_BUSY_INTERNAL để sẵn sàng ghi Crash Data tức thời.',
        apiFlow: 'Fee_EraseImmediateBlock(0x0030) → Fee_MainFunction() [MEMIF_JOB_OK]',
        bitImpact: 'Thanh B: B4 IMM_BLOCK = 1 | Sau khi hoàn tất giữ MEMIF_BUSY_INTERNAL cho GC nền',
        memoryImpact: 'Bản 0x0030 cũ chuyển SUPERSEDED; vùng Reserved sẵn sàng cho Crash Write',
        swsRef: 'SWS_Fee_00094 / SWS_Fee_00066 / SWS_Fee_00067 / SWS_Fee_00068',
        action() {
          apiFeeEraseImmediateBlock('0x0030');
          stepMainFunctionTick();
        }
      },
      {
        label: '3. Tai nạn xảy ra! Airbag SWC gọi khẩn cấp Fee_Write(0x0030) xen ngang GC nền [SWS_Fee_00009]',
        desc:
          'Khi module đang ở MEMIF_BUSY_INTERNAL (GC nền), cảm biến túi khí gọi Fee_Write(0x0030, CrashData)! Nhờ FeeImmediateData == TRUE [SWS_Fee_00009], Fee lập tức bật Bit 2 IMM_PREEMPT = 1, TẠM HOÃN GC nền và cấp phát ngay slot 16B vào Reserved Zone Bank 0! (Lưu ý [SWS_Fee_00009 Note]: Nếu đang MEMIF_BUSY bởi User Job khác thì vẫn bị từ chối FEE_E_BUSY).',
        apiFlow: 'Airbag SWC → Fee_Write(0x0030, IMM=TRUE) [BUSY_INTERNAL] → Tạm hoãn GC [SWS_Fee_00009]',
        bitImpact: 'Thanh A: B6 FEE_BUSY = 1, B2 IMM_PREEMPT = 1, B3 GC_ACTIVE = 1 | Thanh B: B4 IMM_BLOCK = 1',
        memoryImpact: 'Slot 0x0030 (16B) được cấp phát ngay lập tức dù GC chưa xong',
        swsRef: 'SWS_Fee_00009 / SWS_Fee_00025 / SWS_Fee_00174',
        action() {
          apiFeeWrite('0x0030', '0xFF 0xCA [AIRBAG DEPLOYED!]', { immediate: true });
        }
      },
      {
        label: '4. Ghi xong Crash Event (2 ticks = 10ms) & Cập nhật RAM LUT',
        desc:
          'Trong 2 ticks MainFunction tiếp theo (ở SLOW 8B/tick cho 16B slot), dữ liệu túi khí được chốt xong Header + Payload + Valid Trailer 0xA5A5, cập nhật vào RAM LUT và báo MEMIF_JOB_OK cho Airbag SWC chỉ sau 10ms!',
        apiFlow: 'Fee_MainFunction() [2 ticks] → Fls_Write(16B + 0xA5A5) → Fee_JobEndNotification()',
        bitImpact: 'Thanh A: B2 IMM_PREEMPT = 0, B5 FEE_BUSY_INT = 1 | Job = MEMIF_JOB_OK',
        memoryImpact: 'Crash Block 0x0030 #2 = VALID tại Bank 0; RAM LUT cập nhật tức thì',
        swsRef: 'SWS_Fee_00009 / SWS_Fee_00055 / SWS_Fee_00095',
        action() {
          let guard = 0;
          while (simState.activeJob && guard < 10) {
            stepMainFunctionTick();
            guard += 1;
          }
        }
      },
      {
        label: '5. GC tự động phục hồi, mang cả Crash Event mới sang Bank 1 & Xóa Bank 0!',
        desc:
          'Ngay sau khi Crash Block được lưu an toàn, Garbage Collection tự động chạy tiếp phần còn lại, đồng thời phát hiện và chép luôn bản 0x0030 Crash Event mới nhất sang Bank 1 trước khi Sector Switch và Fls_Erase(Bank 0) — đảm bảo dữ liệu va chạm không bao giờ bị mất!',
        apiFlow: 'Resume GC → Copy 0x0030 Mới Nhất sang Bank 1 → Sector Switch → Fls_Erase(Bank 0)',
        bitImpact: 'Thanh A: 0x81 (B3 GC_ACTIVE = 0, B0 JOB_OK_DONE = 1) | Status: MEMIF_IDLE',
        memoryImpact: 'Bank 1 (Active) chứa bản Crash Event 0x0030 #2 an toàn; Bank 0 sạch 0xFF',
        swsRef: 'SWS_Fee_00009 / SWS_Fee_00102 / SWS_Fee_00197',
        action() {
          stepCompleteAsyncJob();
        }
      }
    ],
    whatIfs: [
      {
        label: 'What-If: Thử gọi Fee_EraseImmediateBlock(0x0010) (Standard Block) → DET?',
        run() {
          apiFeeEraseImmediateBlock('0x0010');
        }
      },
      {
        label: 'What-If: Thử gọi Standard Write (0x0010) khi GC đang chạy?',
        run() {
          if (!simState.gcState.active) startGarbageCollectionInternal(null);
          apiFeeWrite('0x0010', '0x01 0x02 [Standard Blocked by GC]');
        }
      },
      {
        label: 'What-If: Chuyển sang FAST_MODE cho Crash Event (1 tick = 5ms)?',
        run() {
          apiFeeSetMode('MEMIF_MODE_FAST');
          apiFeeWrite('0x0030', '0xFF 0xCC [FAST CRASH 5ms]', { immediate: true });
          stepCompleteAsyncJob();
        }
      }
    ]
  },

  {
    id: 'S9',
    group: 'Nhóm 3: Garbage Collection, Immediate Data & Mode/Cancel',
    title: 'S9: Đổi Tốc Độ Fee_SetMode(SLOW ↔ FAST) & Hủy Lệnh Đang Chạy Fee_Cancel()',
    summary:
      'Minh họa 2 dịch vụ điều khiển luồng quan trọng: (1) So sánh thông lượng ghi Blk#2 (32B) giữa MEMIF_MODE_SLOW (8 B/tick -> 4 ticks = 20ms) vs MEMIF_MODE_FAST (64 B/tick -> 1 tick = 5ms), và (2) Hủy ngang công việc đang chạy bằng Fee_Cancel() -> MEMIF_JOB_CANCELED.',
    setupExplain:
      'Hệ thống ở MEMIF_IDLE, ActiveMemIfMode = MEMIF_MODE_SLOW (8 B/tick), chế độ FAST = 64 B/tick, chu kỳ MainFunction = 5ms. Khối thử nghiệm là Blk#2_EngCalib_DS0 (0x0020, 24B data + 8B Hdr = 32B).',
    setupMeta: {
      apiFlow: 'Setup S9: SLOW = 8 B/tick | FAST = 64 B/tick | Period = 5ms',
      bitImpact: 'Thanh A: 0x81 (B4 FAST_MODE = 0)',
      memoryImpact: 'Blk#2 (0x0020) = 32B total',
      swsRef: 'SWS_Fee_00089 / SWS_Fee_00088 / R20-11 SetMode Legacy'
    },
    setup() {
      resetRuntimeBlockCatalog();
      ecucConfig = { ...defaultConfig, ActiveMemIfMode: 'MEMIF_MODE_SLOW', FlsBytesPerCycleSlow: 8, FlsBytesPerCycleFast: 64 };
      createInitialSimState('DEFAULT_LIGHT');
      ecucConfig.SelectedFeeBlock = '0x0020';
    },
    steps: [
      {
        label: '1. Gọi Fee_Write(0x0020, 32B) ở chế độ MEMIF_MODE_SLOW (8 B/tick)',
        desc:
          'Đang ở MEMIF_MODE_SLOW (Bit 4 FAST_MODE = 0), mỗi chu kỳ MainFunction chỉ nạp được 8B xuống Flash. Để ghi hết 32B của 0x0020 sẽ cần tới 4 chu kỳ (20ms).',
        apiFlow: 'Fee_Write(0x0020, 32B) [Active Mode = MEMIF_MODE_SLOW, 8 B/tick]',
        bitImpact: 'Thanh A: B6 FEE_BUSY = 1, B4 FAST_MODE = 0 | JobResult = MEMIF_JOB_PENDING',
        memoryImpact: 'Cần 32B / 8B = 4 ticks MainFunction',
        swsRef: 'SWS_Fee_00088 / R20-11 SetMode Legacy',
        action() {
          apiFeeSetMode('MEMIF_MODE_SLOW');
          apiFeeWrite('0x0020', '0x00 0x02 0x00 [SLOW 20ms]');
        }
      },
      {
        label: '2. Chạy đủ 4 ticks MainFunction ở SLOW → Hoàn tất trong 20 ms',
        desc:
          'Sau 4 chu kỳ Fee_MainFunction() (4 × 5ms = 20ms), toàn bộ 32B của 0x0020 đã ghi xong xuống Bank 0 và chốt Trailer 0xA5A5. Đồng hồ ghi nhận Latency = 20 ms.',
        apiFlow: '4× Fee_MainFunction() (8B → 16B → 24B → 32B + 0xA5A5) → MEMIF_JOB_OK',
        bitImpact: 'Thanh A: 0x81 (B0 JOB_OK_DONE = 1) | LastLatency = 20 ms',
        memoryImpact: '0x0020 Seq #2 VALID @ Bank 0',
        swsRef: 'SWS_Fee_00055 / SWS_Fee_00095',
        action() {
          stepCompleteAsyncJob();
        }
      },
      {
        label: '3. EcuM/BswM gọi Fee_SetMode(MEMIF_MODE_FAST) [Classic R20-11 Fls Legacy]',
        desc:
          'Ở kiến trúc Classic R20-11 (Fls Driver), BswM/NvM gọi Fee_SetMode(MEMIF_MODE_FAST) để nâng thông lượng lên 64 B/tick (Bit 4 FAST_MODE = 1). Lưu ý: Từ R21-11 đến R25-11 (kiến trúc MemAcc), Fee_SetMode đã được loại bỏ vì MemAcc dùng độ ưu tiên Job thay thế.',
        apiFlow: 'BswM → MemIf_SetMode(FAST) → Fee_SetMode(FAST) → Fls_SetMode(FAST) [R20-11]',
        bitImpact: 'Thanh A: 0x91 (B4 FAST_MODE = 1)',
        memoryImpact: 'Băng thông tầng dưới tăng gấp 8× (8 B/tick → 64 B/tick)',
        swsRef: 'Classic R20-11 Fls_SetMode (Removed in R25-11 MemAcc)',
        action() {
          apiFeeSetMode('MEMIF_MODE_FAST');
        }
      },
      {
        label: '4. Ghi lại 0x0020 (32B) ở FAST MODE → Hoàn tất chỉ trong 1 tick = 5 ms!',
        desc:
          'Ghi cùng khối 0x0020 (32B): vì 32B <= 64B/tick, toàn bộ Header + Payload + Trailer 0xA5A5 hoàn tất chỉ trong đúng 1 chu kỳ MainFunction (5 ms — nhanh gấp 4 lần so với SLOW MODE)!',
        apiFlow: 'Fee_Write(0x0020, 32B) → 1× Fee_MainFunction() (5ms) → MEMIF_JOB_OK',
        bitImpact: 'Thanh A: 0x91 (B4 FAST_MODE = 1, B0 JOB_OK_DONE = 1) | LastLatency = 5 ms',
        memoryImpact: '0x0020 Seq #3 VALID chỉ mất 5 ms (so với 20 ms ở SLOW)',
        swsRef: 'SWS_Fee_00088 / SWS_Fee_00055',
        action() {
          apiFeeWrite('0x0020', '0x00 0x02 0x01 [FAST 5ms]');
          stepCompleteAsyncJob();
        }
      },
      {
        label: '5. Quay về SLOW, bắt đầu ghi 0x0020 và dừng sau Tick 1 (Đang MEMIF_BUSY)',
        desc:
          'Chuyển lại SLOW MODE (8 B/tick) và khởi chạy một lệnh Fee_Write(0x0020) mới. Sau Tick 1, mới chỉ ghi xong Header 8B (WRITING_DATA, chưa có Trailer 0xA5A5), module đang ở MEMIF_BUSY.',
        apiFlow: 'Fee_SetMode(SLOW) → Fee_Write(0x0020) → 1× Fee_MainFunction() [MEMIF_BUSY]',
        bitImpact: 'Thanh A: B6 FEE_BUSY = 1 | Thanh B: B7 HDR_WRITTEN = 1, B5 = 0',
        memoryImpact: 'Slot #4 đang ghi dở 8/32B (RAM LUT vẫn đang giữ Seq #3 an toàn)',
        swsRef: 'SWS_Fee_00088 / SWS_Fee_00025',
        action() {
          apiFeeSetMode('MEMIF_MODE_SLOW');
          apiFeeWrite('0x0020', '0xDE 0xAD [Will Be Canceled]');
          stepMainFunctionTick();
        }
      },
      {
        label: '6. NvM gọi Fee_Cancel() hủy ngang Job → MEMIF_JOB_CANCELED [SWS_Fee_00089]',
        desc:
          'Để hủy job đang ghi dở, NvM gọi Fee_Cancel() [SWS_Fee_00089]. Fee gọi Fls_Cancel()/MemAcc_Cancel() [SWS_Fee_00080], đặt JobResult = MEMIF_JOB_CANCELED [SWS_Fee_00157], đưa module về MEMIF_IDLE [SWS_Fee_00081], đánh dấu slot ghi dở #4 là INCONSISTENT và giữ nguyên Seq #3 an toàn trong RAM LUT!',
        apiFlow: 'NvM_Cancel() → Fee_Cancel() → Fls_Cancel() → JobResult = MEMIF_JOB_CANCELED',
        bitImpact: 'Thanh A: 0x82 (B6 FEE_BUSY = 0, B1 JOB_ERR_PEND = 1) | Status: MEMIF_IDLE',
        memoryImpact: 'Slot #4 → INCONSISTENT (bỏ qua); RAM LUT vẫn trỏ an toàn vào Seq #3 VALID!',
        swsRef: 'SWS_Fee_00089 / SWS_Fee_00080 / SWS_Fee_00081 / SWS_Fee_00157',
        action() {
          apiFeeCancel();
        }
      }
    ],
    whatIfs: [
      {
        label: 'What-If: Tắt FeeSetModeSupported=FALSE rồi gọi Fee_SetMode?',
        run() {
          ecucConfig.FeeSetModeSupported = false;
          apiFeeSetMode('MEMIF_MODE_FAST');
        }
      },
      {
        label: 'What-If: Gọi Fee_Cancel() khi IDLE → DET FEE_E_INVALID_CANCEL?',
        run() {
          simState.activeJob = null;
          simState.moduleState = 'MEMIF_IDLE';
          apiFeeCancel();
        }
      },
      {
        label: 'What-If: Đổi Slow xuống 4 B/tick để quan sát 8 ticks ghi 32B?',
        run() {
          ecucConfig.FlsBytesPerCycleSlow = 4;
          apiFeeSetMode('MEMIF_MODE_SLOW');
          apiFeeWrite('0x0020', '0x00 0x03 0x00 [Slow 4B/tick]');
          stepMainFunctionTick();
        }
      }
    ]
  },

  // --------------------------------------------------------------------------
  // NHÓM 4: TÍCH HỢP TOÀN TRÌNH, MEMACC R23-11 & LỖI PHẦN CỨNG/DET
  // --------------------------------------------------------------------------
  {
    id: 'S10',
    group: 'Nhóm 4: Tích Hợp Toàn Trình, MemAcc R23-11 & Lỗi Phần Cứng/DET',
    title: 'S10: Luồng Toàn Trình (SWC → RTE → NvM → MemIf → Fee → Fls) & NvM_WriteAll()',
    summary:
      'Dựng bức tranh toàn cảnh End-to-End của AUTOSAR Memory Stack: từ lời gọi Rte_Call_NvMService_WriteBlock() tại SWC → NvM tính CRC16 → MemIf định tuyến DeviceIndex=0 → Fee ghi 3 pha xuống Fls/DFlash → chuỗi Callback ngược về SWC, và chu trình Shutdown NvM_WriteAll() ở chế độ FAST.',
    setupExplain:
      'Hệ thống đang ở trạng thái chạy ổn định (DEFAULT_LIGHT, MEMIF_IDLE, SLOW 8 B/tick). Người dùng sẽ đi qua từng tầng kiến trúc trên sơ đồ SVG End-to-End và theo dõi chu trình tắt máy NvM_WriteAll().',
    setupMeta: {
      apiFlow: 'Hệ thống sẵn sàng chạy End-to-End Stack & NvM_WriteAll()',
      bitImpact: 'Thanh A: 0x81 (MEMIF_IDLE, SLOW MODE)',
      memoryImpact: 'Bank 0: 56/256B (0x0010, 0x0020 VALID)',
      swsRef: 'AUTOSAR Memory Stack E2E'
    },
    setup() {
      resetRuntimeBlockCatalog();
      ecucConfig = { ...defaultConfig, ActiveMemIfMode: 'MEMIF_MODE_SLOW', FlsBytesPerCycleSlow: 8, FlsBytesPerCycleFast: 64 };
      createInitialSimState('DEFAULT_LIGHT');
      ecucConfig.SelectedFeeBlock = '0x0010';
    },
    steps: [
      {
        label: '1. Tầng ASW → RTE → NvM: SWC gọi Rte_Call & NvM tính CRC16 vào RAM Mirror',
        desc:
          'SWC_Odometer kích hoạt lưu dữ liệu bằng Rte_Call_NvMService_Odometer_WriteBlock(&RamData). RTE định tuyến qua SchM tới NvM_WriteBlock(BlockId=2): NvM sao chép dữ liệu vào RAM Mirror, tính mã kiểm tra CRC16 (0x8F42) và xếp lệnh vào hàng đợi NvM.',
        apiFlow: 'SWC_Odometer → Rte_Call_NvMService_WriteBlock() → NvM_WriteBlock() [CRC16=0x8F42]',
        bitImpact: 'Active Modules: SWC → RTE → NvM | Fee vẫn IDLE chờ NvM_MainFunction()',
        memoryImpact: 'NvM chuẩn bị frame 14B (Data + CRC16) trong RAM Mirror',
        swsRef: 'AUTOSAR NvM ↔ RTE Interface',
        action() {
          simState.clockMs += 5;
          simState.selectedModule = 'MOD_SWC';
          simState.activeArrows = ['arr_swc_rte', 'arr_rte_nvm'];
          simState.activeModules = ['MOD_SWC', 'MOD_RTE', 'MOD_NVM'];
          addTrace('SWC->NvM', 'Rte_Call_NvMService_Odometer_WriteBlock()', 'NvM nhận yêu cầu, tính CRC16=0x8F42 vào RAM Mirror và xếp hàng đợi', 'INFO');
          setCodeSnippet(
            'Bước 1: SWC → RTE → NvM (RAM Mirror & CRC16)',
            `/* SWC_Odometer.c */\nRte_Call_NvMService_Odometer_WriteBlock(&OdoRamData);\n/* NvM_MainFunction() tinh CRC16 = 0x8F42 va dua vao Queue */`
          );
          pushStepLog('SWC → RTE → NvM_WriteBlock(): Đã tính CRC16 và xếp hàng đợi.');
          syncBitRegistersFromState();
        }
      },
      {
        label: '2. Tầng NvM → MemIf → Fee: Định tuyến DeviceIndex=0 xuống Fee_Write(0x0010)',
        desc:
          'Trong NvM_MainFunction(), NvM gọi MemIf_Write(DeviceIndex=0, 0x0010, NvMBuffer). Vì DeviceIndex=0 cấu hình cho Flash, MemIf chuyển tiếp thẳng xuống Fee_Write(0x0010, NvMBuffer). Fee chuyển MEMIF_BUSY (Bit 6 = 1) và cấp phát slot 24B nối đuôi trên Bank 0.',
        apiFlow: 'NvM_MainFunction() → MemIf_Write(0, 0x0010) → Fee_Write(0x0010)',
        bitImpact: 'Thanh A: B6 FEE_BUSY = 1 | Active Modules: NvM → MemIf → Fee → Fls',
        memoryImpact: 'Cấp phát slot 24B tại Bank 0 +0x38 (WRITING_HDR)',
        swsRef: 'SWS_Fee_00088 / SWS_Fee_00105 / MemIf Routing',
        action() {
          apiFeeWrite('0x0010', '0x00 0x01 0x9F [ODO+CRC16=0x8F42]');
          simState.selectedModule = 'MOD_MEMIF';
          syncBitRegistersFromState();
        }
      },
      {
        label: '3. Tầng Fee → Fls → DFlash: Ghi 3 pha (Header → Payload+Pad → Trailer 0xA5A5)',
        desc:
          'Fee_MainFunction() phối hợp Fls_MainFunction() hoàn tất cả 3 pha ghi xuống Data Flash vật lý (Header 8B → Payload 14B + 2B Pad 0xFF → Valid Trailer 0xA5A5), đánh dấu bản cũ SUPERSEDED và cập nhật bảng RAM LUT.',
        apiFlow: 'Fee_MainFunction() → Fls_Write() [3 ticks: Hdr → Data+Pad → Trailer 0xA5A5]',
        bitImpact: 'Thanh B Slot mới: 0xE8 (VALID_TRAILR=1, LUT_CACHED=1) | Bản cũ: SUPERSEDED',
        memoryImpact: 'Slot mới VALID @ Bank 0 +0x38; RAM LUT trỏ vào bản mới nhất',
        swsRef: 'SWS_Fee_00097 / SWS_Fee_00153',
        action() {
          stepCompleteAsyncJob();
          simState.selectedModule = 'MOD_FLS';
          syncBitRegistersFromState();
        }
      },
      {
        label: '4. Chuỗi Callback Ngược: Fls → Fee → NvM → RTE → SWC (NVM_REQ_OK)',
        desc:
          'Tầng dưới Fls gọi Fee_JobEndNotification(), Fee trả MEMIF_JOB_OK và gọi NvM_JobEndNotification(). NvM giải phóng RAM Mirror và gọi Rte_Call_PNvMNotifyJobFinished_JobFinished(NVM_REQ_OK) báo hoàn tất về tận SWC_Odometer!',
        apiFlow: 'Fls → Fee_JobEndNotification() → NvM_JobEndNotification() → Rte_Call_JobFinished(NVM_REQ_OK)',
        bitImpact: 'Thanh A: 0x81 (MEMIF_IDLE, JOB_OK_DONE=1) | Active Path: Fls → Fee → NvM → SWC',
        memoryImpact: 'Chu trình End-to-End hoàn tất đồng bộ từ ASW tới DFlash và ngược lại',
        swsRef: 'SWS_Fee_00055 / SWS_Fee_00095 / SWS_Fee_00194',
        action() {
          simState.clockMs += 5;
          simState.selectedModule = 'MOD_NVM';
          simState.activeArrows = ['arr_fls_fee', 'arr_fee_nvm', 'arr_nvm_memif', 'arr_rte_nvm', 'arr_swc_rte'];
          simState.activeModules = ['MOD_FLS', 'MOD_FEE', 'MOD_MEMIF', 'MOD_NVM', 'MOD_RTE', 'MOD_SWC'];
          addTrace('NvM->SWC', 'Rte_Call_JobFinished(NVM_REQ_OK)', 'Chuỗi callback ngược hoàn tất báo về SWC_Odometer', 'OK');
          setCodeSnippet(
            'Bước 4: Chuỗi Callback Ngược (Fls → Fee → NvM → SWC)',
            `/* Fls_MainFunction() xong trang cuoi: */\nFee_JobEndNotification();\n  -> NvM_JobEndNotification(); /* JobResult = MEMIF_JOB_OK */\n  -> Rte_Call_PNvMNotifyJobFinished_JobFinished(NVM_REQ_OK);`
          );
          pushStepLog('Callback ngược: Fls -> Fee -> NvM -> RTE -> SWC (NVM_REQ_OK).');
          syncBitRegistersFromState();
        }
      },
      {
        label: '5. Chu trình Shutdown IG OFF: BswM bật FAST MODE & Gọi NvM_WriteAll()',
        desc:
          'Khi tài xế tắt khóa điện (IG OFF), EcuM/BswM bật tốc độ cao MemIf_SetMode(MEMIF_MODE_FAST) (64 B/tick) và kích hoạt NvM_WriteAll() để lưu hàng loạt các block thay đổi (0x0020 EngCalib & 0x0040 VIN/Coding) xuống DFlash trước khi cắt nguồn.',
        apiFlow: 'EcuM Shutdown → BswM → Fee_SetMode(FAST) → NvM_WriteAll() [0x0020, 0x0040]',
        bitImpact: 'Thanh A: B4 FAST_MODE = 1 (64 B/tick) | Ghi nối tiếp các block Shutdown',
        memoryImpact: 'Bank 0 nhận tuần tự các slot 0x0020 #2 và 0x0040 #1 ở tốc độ cao (5ms/block)',
        swsRef: 'R20-11 SetMode Legacy / SWS_Fee_00088',
        action() {
          apiFeeSetMode('MEMIF_MODE_FAST');
          apiFeeWrite('0x0020', '0x12 0xA8 [Shutdown WriteAll DS0]');
          stepCompleteAsyncJob();
          apiFeeWrite('0x0040', '57 44 42 [Shutdown WriteAll VIN]');
          stepCompleteAsyncJob();
          simState.selectedModule = 'MOD_ECUM';
          syncBitRegistersFromState();
        }
      },
      {
        label: '6. Hoàn tất NvM_WriteAll() → BswM cho phép EcuM_GoDownHaltPoll() ngắt nguồn',
        desc:
          'Tất cả các block trong NvM_WriteAll() đều đã chốt Valid Trailer 0xA5A5 và cập nhật RAM LUT. NvM phát BswM_NvM_CurrentJobMode(NVM_WRITE_ALL, NVM_REQ_OK) báo BswM/EcuM an toàn để thực thi EcuM_GoDownHaltPoll() cắt nguồn ECU!',
        apiFlow: 'NvM_WriteAll() DONE → BswM_NvM_CurrentJobMode(NVM_WRITE_ALL, NVM_REQ_OK) → EcuM_GoDownHaltPoll()',
        bitImpact: 'Thanh A: 0x91 (MEMIF_IDLE, FAST_MODE=1, JOB_OK_DONE=1)',
        memoryImpact: 'Toàn bộ dữ liệu RAM đã an toàn trên DFlash Bank 0 trước khi cắt điện',
        swsRef: 'AUTOSAR ECU Shutdown Sequence',
        action() {
          simState.clockMs += 5;
          simState.activeArrows = ['arr_fee_nvm', 'arr_ecum_fee'];
          simState.activeModules = ['MOD_ECUM', 'MOD_NVM', 'MOD_FEE'];
          addTrace('NvM->BswM', 'BswM_NvM_CurrentJobMode(NVM_WRITE_ALL, NVM_REQ_OK)', 'Cho phép EcuM_GoDownHaltPoll() ngắt nguồn an toàn!', 'OK');
          setCodeSnippet(
            'Hoàn tất NvM_WriteAll() & Cắt Nguồn An Toàn',
            `/* Tat ca block da chot Trailer 0xA5A5 */\nBswM_NvM_CurrentJobMode(NVM_WRITE_ALL, NVM_REQ_OK);\nEcuM_GoDownHaltPoll(); /* Power-Off Safe! */`
          );
          pushStepLog('NvM_WriteAll() hoàn tất -> EcuM sẵn sàng cắt nguồn an toàn.');
          syncBitRegistersFromState();
        }
      }
    ],
    whatIfs: [
      {
        label: 'What-If: Chạy luồng NvM_ReadAll() khi bật khóa điện?',
        run() {
          apiFeeSetMode('MEMIF_MODE_FAST');
          apiFeeRead('0x0010');
          stepCompleteAsyncJob();
          apiFeeRead('0x0020');
          stepCompleteAsyncJob();
          addTrace('NvM->BswM', 'BswM_NvM_CurrentJobMode(NVM_READ_ALL, NVM_REQ_OK)', 'Đọc xong toàn bộ NVRAM lúc startup', 'OK');
        }
      },
      {
        label: 'What-If: Giả lập Blk#4 chưa ghi (MEMIF_BLOCK_INVALID) lúc ReadAll?',
        run() {
          apiFeeRead('0x0040');
          stepCompleteAsyncJob();
        }
      },
      {
        label: 'What-If: Xem bảng Code C cấu hình Fee_Lcfg.c của toàn Stack?',
        run() {
          openExportModal();
          switchExportTab(2);
        }
      }
    ]
  },

  {
    id: 'S11',
    group: 'Nhóm 4: Tích Hợp Toàn Trình, MemAcc R23-11 & Lỗi Phần Cứng/DET',
    title: 'S11: Kiến Trúc Mới R23-11 (Fee ↔ MemAcc ↔ Mem_30_Fls) & Lỗi Flash Verify',
    summary:
      'So sánh chuyển đổi từ AUTOSAR Classic R20-11 (Fee gọi trực tiếp MCAL Fls) sang kiến trúc AUTOSAR R23-11 / R25-11 (Fee ↔ MemAcc ↔ Mem_30_Fls dùng MemAcc_Write, MemAcc_BlankCheck [SWS_Fee_00187] và callback thống nhất Fee_JobEndNotification [SWS_Fee_00194]), đồng thời mô phỏng phản ứng khi gặp lỗi Flash Write Verify Fail.',
    setupExplain:
      'Khởi điểm đang dùng kiến trúc Classic R20-11 (FeeLowerLayerArchitecture = CLASSIC_FLS). Người dùng sẽ quan sát sự thay đổi trực tiếp trên sơ đồ SVG, Code C, API Trace khi nâng cấp lên R23-11 / R25-11 MemAcc và khi bơm lỗi Verify Flash.',
    setupMeta: {
      apiFlow: 'Khởi điểm: Classic R20-11 (Fee ↔ Fls Driver)',
      bitImpact: 'Thanh A: 0x81 | Lower Layer: CLASSIC_FLS',
      memoryImpact: 'Bank 0: 56/256B | Lỗi phần cứng = OFF',
      swsRef: 'AUTOSAR R25-11 SWS_Fee_00187 / SWS_Fee_00194'
    },
    setup() {
      resetRuntimeBlockCatalog();
      ecucConfig = { ...defaultConfig, FeeLowerLayerArchitecture: 'CLASSIC_FLS', SimulateFlsWriteVerifyError: false };
      createInitialSimState('DEFAULT_LIGHT');
      ecucConfig.SelectedFeeBlock = '0x0020';
    },
    steps: [
      {
        label: '1. Kiến trúc Classic R20-11: Fee gọi trực tiếp MCAL Fls_Write()',
        desc:
          'Ở AUTOSAR R20-11 trở về trước, Fee gắn cứng xuống 1 MCAL Fls Driver duy nhất qua Fls_Write() / Fls_Read() / Fls_Erase(). Cách này đơn giản nhưng gây xung đột nếu vừa có Fee vừa có FOTA hoặc nhiều Core cùng truy cập Flash.',
        apiFlow: 'Fee_Write(0x0010) → Fls_Write() → Fls_MainFunction() [R20-11 Classic]',
        bitImpact: 'Lower Layer: Fls Driver (MCAL Classic) | JobResult = MEMIF_JOB_OK',
        memoryImpact: 'Ghi thành công 0x0010 #2 bằng API truyền thống Fls_Write()',
        swsRef: 'AUTOSAR R20-11 Fee → Fls',
        action() {
          ecucConfig.FeeLowerLayerArchitecture = 'CLASSIC_FLS';
          apiFeeWrite('0x0010', '0x11 0xAA [R20-11 Classic Fls_Write]');
          stepCompleteAsyncJob();
        }
      },
      {
        label: '2. Nâng cấp sang AUTOSAR R23-11: Bật tầng hợp nhất MemAcc (AddressAreaId)',
        desc:
          'Chuyển FeeLowerLayerArchitecture = R23_MEMACC: Khối MCAL Fls trên sơ đồ SVG tự động đổi thành MemAcc (AUTOSAR R23-11) kết nối tới Mem_30_Fls. MemAcc đảm nhiệm Address Area Management và Bus Arbitration để Fee và FOTA dùng chung Flash an toàn.',
        apiFlow: 'Switch Architecture → R23_MEMACC (Fee ↔ MemAcc ↔ Mem_30_Fls)',
        bitImpact: 'SVG & Code C chuyển sang MemAcc_Write / Read / Erase / MemAcc_MainFunction',
        memoryImpact: 'Băng thông Bus Flash được trọng tài tập trung tại MemAcc',
        swsRef: 'AUTOSAR R25-11 MemAcc / SWS_Fee_00187',
        action() {
          ecucConfig.FeeLowerLayerArchitecture = 'R23_MEMACC';
          simState.selectedModule = 'MOD_FLS';
          simState.activeArrows = ['arr_fee_fls', 'arr_fls_fee', 'arr_fls_dflash'];
          simState.activeModules = ['MOD_FEE', 'MOD_FLS', 'MOD_DFLASH'];
          addTrace('Stack Upgrade', 'FeeLowerLayerArchitecture -> R23_MEMACC', 'Khối tầng dưới chuyển thành MemAcc (AddressAreaId & Bus Arbitration) -> Mem_30_Fls!', 'OK');
          setCodeSnippet(
            'AUTOSAR R23-11: Fee -> MemAcc -> Mem_30_Fls',
            `/* AUTOSAR R23-11 Memory Stack */\n#define FEE_USE_MEMACC_LOWER_LAYER  (STD_ON)\nMemAcc_Write(MemAccAddressAreaId_DFlash, TargetAddr, SrcPtr, Len);\n/* MemAcc dieu phoi Bus Arbitration giua Fee va FOTA! */`
          );
          pushStepLog('Nâng cấp tầng dưới sang AUTOSAR R23-11 MemAcc!');
          syncBitRegistersFromState();
        }
      },
      {
        label: '3. Thực thi Fee_Write(0x0020) & Fee_Read(0x0010) qua MemAcc_Write / BlankCheck [SWS_Fee_00187]',
        desc:
          'Trên kiến trúc R23-11 / R25-11: Fee gọi MemAcc_Write() để ghi 0x0020 và MemAcc_BlankCheck() [SWS_Fee_00187] + MemAcc_Read() để kiểm chứng vùng nhớ khi đọc 0x0010, kết thúc qua callback thống nhất Fee_JobEndNotification() [SWS_Fee_00095 / SWS_Fee_00194] (MEMIF_JOB_OK).',
        apiFlow: 'Fee_Write(0x0020) → MemAcc_Write() | Fee_Read(0x0010) → MemAcc_BlankCheck() + MemAcc_Read()',
        bitImpact: 'Thanh A: 0x81 (MEMIF_JOB_OK) | Lower Layer: MemAcc',
        memoryImpact: '0x0020 #2 VALID @ Bank 0 & kiểm chứng MemAcc_BlankCheck [SWS_Fee_00187]',
        swsRef: 'SWS_Fee_00187 / SWS_Fee_00095 / SWS_Fee_00194',
        action() {
          apiFeeWrite('0x0020', '0x22 0xBB [R25-11 MemAcc_Write OK]');
          stepCompleteAsyncJob();
          apiFeeRead('0x0010');
          stepCompleteAsyncJob();
        }
      },
      {
        label: '4. Bơm lỗi phần cứng SimulateFlsWriteVerifyError = TRUE & Gọi Fee_Write(0x0030)',
        desc:
          'Mô phỏng ô nhớ Flash bị chai (Stuck Bit 1→0 không nạp được) bằng cách bật SimulateFlsWriteVerifyError = TRUE và gọi Fee_Write(0x0030). Fee cấp phát slot mới tại Bank 0 và đẩy lệnh xuống MemAcc_Write().',
        apiFlow: 'SimulateFlsWriteVerifyError = TRUE → Fee_Write(0x0030) → MemAcc_Write()',
        bitImpact: 'Thanh A: B6 FEE_BUSY = 1 | Chuẩn bị phát hiện lỗi Verify phần cứng',
        memoryImpact: 'Slot 0x0030 mới bắt đầu ghi vào vùng Flash bị lỗi vật lý',
        swsRef: 'SWS_Fee_00056 / SWS_Fee_00194',
        action() {
          ecucConfig.SimulateFlsWriteVerifyError = true;
          apiFeeWrite('0x0030', '0xFA 0x1L [Verify Error Inject]');
        }
      },
      {
        label: '5. Flash Verify Fail! Unified Fee_JobEndNotification() [00194] → MEMIF_JOB_FAILED & NvM Error',
        desc:
          'Trong Fee_MainFunction(), Mem_30_Fls/MemAcc kiểm tra Write Verify thất bại -> báo HW DEM từ tầng dưới và gọi callback thống nhất Fee_JobEndNotification() [SWS_Fee_00095 / SWS_Fee_00194]. Fee inspect MemAcc_GetJobResult() thấy FAILED, đánh dấu slot mới là INCONSISTENT, giữ nguyên RAM LUT cũ, đặt MEMIF_JOB_FAILED [SWS_Fee_00158] và gọi NvM_JobErrorNotification() [SWS_Fee_00056].',
        apiFlow: 'MemAcc Verify Fail → Fee_JobEndNotification() [00194] → NvM_JobErrorNotification() [00056]',
        bitImpact: 'Thanh A: B6=0, B1 JOB_ERR_PEND=1 | Thanh B: B0 INCONSISTENT=1 | Mem HW DEM +1',
        memoryImpact: 'Slot hỏng bị cô lập (INCONSISTENT); RAM LUT giữ nguyên dữ liệu sạch trước đó',
        swsRef: 'SWS_Fee_00095 / SWS_Fee_00194 / SWS_Fee_00056 / SWS_Fee_00158',
        action() {
          stepMainFunctionTick();
        }
      },
      {
        label: '6. Tự phục hồi nhờ Append-Only: Ghi lại 0x0030 sang địa chỉ mới sạch sẽ!',
        desc:
          'Tắt lỗi Verify tại ô nhớ hỏng cũ và để NvM thử ghi lại Fee_Write(0x0030): nhờ kiến trúc Append-Only, Fee tự động nhảy qua ô nhớ INCONSISTENT hỏng để ghi sang offset tiếp theo sạch sẽ trên Bank 0 và thành công MEMIF_JOB_OK!',
        apiFlow: 'NvM Retry → Fee_Write(0x0030) → MemAcc_Write(NextFreeAddr) → MEMIF_JOB_OK',
        bitImpact: 'Thanh A: 0x81 (MEMIF_JOB_OK) | Sector SM: ACTIVE_NORMAL',
        memoryImpact: 'Bỏ qua slot đỏ INCONSISTENT; ghi thành công bản sạch vào địa chỉ kế tiếp',
        swsRef: 'Append-Only Fault Tolerance',
        action() {
          ecucConfig.SimulateFlsWriteVerifyError = false;
          apiFeeWrite('0x0030', '0xCC 0x00 [Retry Clean @ Next Addr]');
          stepCompleteAsyncJob();
        }
      }
    ],
    whatIfs: [
      {
        label: 'What-If: Chuyển nhanh về Classic Fls để so sánh SVG?',
        run() {
          ecucConfig.FeeLowerLayerArchitecture = 'CLASSIC_FLS';
          addTrace('Stack', 'Switch -> CLASSIC_FLS', 'Đổi tên khối SVG & Code về Fls_Write/Read/Erase', 'INFO');
          syncBitRegistersFromState();
        }
      },
      {
        label: 'What-If: Phun lỗi ECC Bit-Flip & Fls_Erase Error (DEM)?',
        run() {
          ecucConfig.SimulateFlashEccBitFlip = true;
          apiFeeRead('0x0010');
          stepCompleteAsyncJob();
          ecucConfig.SimulateFlashEccBitFlip = false;
          ecucConfig.SimulateFlsEraseError = true;
          startGarbageCollectionInternal(null);
          stepCompleteAsyncJob();
        }
      },
      {
        label: 'What-If: Mở Export Fee_Cfg.h xem macro R23-11 MemAcc?',
        run() {
          ecucConfig.FeeLowerLayerArchitecture = 'R23_MEMACC';
          openExportModal();
          switchExportTab(1);
        }
      }
    ]
  },

  {
    id: 'S12',
    group: 'Nhóm 4: Tích Hợp Toàn Trình, MemAcc R23-11 & Lỗi Phần Cứng/DET',
    title: 'S12: Bảo Vệ Tham Số & Bẫy Lỗi DET (UNINIT, BLOCK_NO, OFS, LEN, PTR, BUSY, CANCEL)',
    summary:
      'Kiểm chứng toàn diện 5 Development Errors [SWS_Fee_00010] (FEE_E_UNINIT 0x01, FEE_E_INVALID_BLOCK_NO 0x02, FEE_E_INVALID_BLOCK_OFS 0x03, FEE_E_PARAM_POINTER 0x04, FEE_E_INVALID_BLOCK_LEN 0x05 — báo qua Det_ReportError khi FeeDevErrorDetect=TRUE) và 2 Runtime Errors [SWS_Fee_91002] (FEE_E_BUSY 0x06, FEE_E_INVALID_CANCEL 0x08 — luôn báo qua Det_ReportRuntimeError).',
    setupExplain:
      'Đã bật FeeDevErrorDetect = TRUE, tốc độ SLOW (8 B/tick), Bank 0 sẵn sàng với Blk#1 (0x0010, Size = 14B) và Blk#2 (0x0020, Size = 24B). Mỗi bước kích hoạt chính xác 1 mã lỗi Development hoặc Runtime trên Tab API Trace.',
    setupMeta: {
      apiFlow: 'FeeDevErrorDetect = TRUE (Mod 21: Dev 0x01..0x05 + Runtime 0x06, 0x08)',
      bitImpact: 'Thanh A: 0x81 | DET Count = 0',
      memoryImpact: 'Blk#1 (0x0010) Size = 14B | Blk#2 (0x0020) Size = 24B',
      swsRef: 'SWS_Fee_00010 / SWS_Fee_91002'
    },
    setup() {
      resetRuntimeBlockCatalog();
      ecucConfig = { ...defaultConfig, FeeDevErrorDetect: true, ActiveMemIfMode: 'MEMIF_MODE_SLOW', FlsBytesPerCycleSlow: 8 };
      createInitialSimState('DEFAULT_LIGHT');
      ecucConfig.SelectedFeeBlock = '0x0010';
    },
    steps: [
      {
        label: '1. FEE_E_UNINIT (0x01): Gọi Fee_Read(0x0010) khi Fee chưa khởi tạo',
        desc:
          'Đặt FeeInitialized = FALSE (MEMIF_UNINIT, Bit 7 = 0) rồi gọi Fee_Read(0x0010). Fee lập tức từ chối (trả E_NOT_OK) và gửi Det_ReportError(21, 0, Fee_Read, FEE_E_UNINIT) [0x01] để chặn truy cập Flash trước khi Init.',
        apiFlow: 'Fee_Read(0x0010) [UNINIT] → Det_ReportError(21, 0, Fee_Read, 0x01)',
        bitImpact: 'Thanh A: B7 FEE_INIT = 0 | Active Arrows: Fee → DET | DET Count = 1',
        memoryImpact: 'Truy cập bị chặn ngay tại API entry, không chạm vào Fls',
        swsRef: 'SWS_Fee_00122',
        action() {
          ecucConfig.FeeInitialized = false;
          simState.moduleState = 'MEMIF_UNINIT';
          simState.moduleSmState = 'UNINIT';
          apiFeeRead('0x0010');
        }
      },
      {
        label: '2. FEE_E_INVALID_BLOCK_NO (0x02): Truyền BlockNumber = 0x0000 hoặc chưa cấu hình [SWS_Fee_00138]',
        desc:
          'Khởi tạo lại Fee_Init() + Fee_MainFunction() về MEMIF_IDLE, sau đó thử gọi Fee_Write() với BlockNumber = 0x0000 (mã dự phòng bị cấm [SWS_Fee_00006] hoặc block chưa cấu hình [SWS_Fee_00138]). Fee bắt Development Error và báo FEE_E_INVALID_BLOCK_NO (0x02).',
        apiFlow: 'Fee_Init() → Fee_Write(0x0000, ...) → Det_ReportError(21, 0, Fee_Write, 0x02)',
        bitImpact: 'Thanh A: B7 = 1 | Active Arrows: Fee → DET | DET Count = 2',
        memoryImpact: 'BlockNumber 0x0000 / 0xFFFF / Unconfigured bị từ chối [SWS_Fee_00138]',
        swsRef: 'SWS_Fee_00006 / SWS_Fee_00138 / SWS_Fee_00010',
        action() {
          apiFeeInit('Re-Init for DET Tests', { completeImmediately: true });
          apiFeeWrite('0x0010', '0x00', { explicitBlockNumber: '0x0000' });
        }
      },
      {
        label: '3. FEE_E_INVALID_BLOCK_OFS (0x03): Đọc với Offset >= FeeBlockSize [SWS_Fee_00135]',
        desc:
          'Blk#1 (0x0010) chỉ có FeeBlockSize = 14 bytes (Offset hợp lệ: 0..13). Khi caller truyền BlockOffset = 20 vào Fee_Read(0x0010, 20, Buf, 4), Fee chặn ngay với mã FEE_E_INVALID_BLOCK_OFS (0x03) [SWS_Fee_00135].',
        apiFlow: 'Fee_Read(0x0010, Ofs=20, Buf, 4) → Det_ReportError(21, 0, Fee_Read, 0x03)',
        bitImpact: 'DET Count = 3 | Active Arrows: Fee → DET',
        memoryImpact: 'Ngăn lỗi đọc tràn sang vùng nhớ của Block kế tiếp trên Flash',
        swsRef: 'SWS_Fee_00135 / SWS_Fee_00010',
        action() {
          apiFeeRead('0x0010', { offset: 20, length: 4 });
        }
      },
      {
        label: '4. FEE_E_INVALID_BLOCK_LEN (0x05): Offset + Length vượt Size [SWS_Fee_00137]',
        desc:
          'Offset = 10 hợp lệ (< 14), nhưng cộng thêm Length = 8 cho ra 18 > FeeBlockSize (14B)! Fee kiểm tra biên (BlockOffset + Length > FeeBlockSize) và báo ngay FEE_E_INVALID_BLOCK_LEN (0x05) [SWS_Fee_00137].',
        apiFlow: 'Fee_Read(0x0010, Ofs=10, Buf, Len=8) → Det_ReportError(21, 0, Fee_Read, 0x05)',
        bitImpact: 'DET Count = 4 | Active Arrows: Fee → DET',
        memoryImpact: 'Chặn đọc vượt ranh giới Payload của Block',
        swsRef: 'SWS_Fee_00137 / SWS_Fee_00010',
        action() {
          apiFeeRead('0x0010', { offset: 10, length: 8 });
        }
      },
      {
        label: '5. FEE_E_PARAM_POINTER (0x04): Truyền NULL_PTR [SWS_Fee_00134 / SWS_Fee_00147]',
        desc:
          'Nếu tầng trên truyền con trỏ NULL_PTR vào Fee_Read() [SWS_Fee_00134 / SWS_Fee_00162], Fee_Write() [SWS_Fee_00163] hoặc Fee_GetVersionInfo() [SWS_Fee_00147], Fee chặn trước khi truy cập RAM và báo FEE_E_PARAM_POINTER (0x04).',
        apiFlow: 'Fee_Read(0x0010, 0, NULL_PTR, 4) → Det_ReportError(21, 0, Fee_Read, 0x04)',
        bitImpact: 'DET Count = 5 | Active Arrows: Fee → DET',
        memoryImpact: 'Tránh HardFault khi copy dữ liệu vào/ra RAM Buffer',
        swsRef: 'SWS_Fee_00134 / SWS_Fee_00162 / SWS_Fee_00147',
        action() {
          apiFeeRead('0x0010', { offset: 0, length: 4, nullPtr: true });
        }
      },
      {
        label: '6. FEE_E_BUSY (0x06): Gửi lệnh mới khi đang MEMIF_BUSY [SWS_Fee_00144 / SWS_Fee_91002]',
        desc:
          'Bắt đầu ghi 0x0020 ở SLOW mode (chạy 1 tick để giữ MEMIF_BUSY, Bit 6 = 1), sau đó gọi thêm Fee_Write(0x0010). Theo [SWS_Fee_00144 / SWS_Fee_00009 Note], mọi User API (kể cả Immediate Block!) đều bị từ chối với Runtime Error FEE_E_BUSY (0x06) qua Det_ReportRuntimeError() [SWS_Fee_91002].',
        apiFlow: 'Fee_Write(0x0020) [BUSY] + Fee_Write(0x0010) → Det_ReportRuntimeError(21, 0, Fee_Write, 0x06)',
        bitImpact: 'Thanh A: B6 FEE_BUSY = 1 | DET Count = 6 | Job 0x0020 vẫn chạy bình thường',
        memoryImpact: 'Bảo vệ Job 0x0020 đang ghi không bị ghi đè con trỏ nội bộ',
        swsRef: 'SWS_Fee_00144 / SWS_Fee_91002',
        action() {
          apiFeeWrite('0x0020', '0x11 0x22 [Job 1 Busy]');
          stepMainFunctionTick();
          apiFeeWrite('0x0010', '0x33 0x44 [Should Fail BUSY]');
        }
      },
      {
        label: '7. FEE_E_INVALID_CANCEL (0x08): Hủy Job rồi gọi Fee_Cancel() khi != MEMIF_BUSY [SWS_Fee_00184]',
        desc:
          'Gọi Fee_Cancel() lần 1 hủy hợp lệ Job 0x0020 đang MEMIF_BUSY (trả MEMIF_JOB_CANCELED, về MEMIF_IDLE). Ngay sau đó gọi Fee_Cancel() lần 2 khi status != MEMIF_BUSY -> Fee báo Runtime Error FEE_E_INVALID_CANCEL (0x08) [SWS_Fee_00184 / SWS_Fee_00164 / SWS_Fee_91002]!',
        apiFlow: 'Fee_Cancel() [BUSY → IDLE] → Fee_Cancel() [IDLE] → Det_ReportRuntimeError(21, 0, Fee_Cancel, 0x08)',
        bitImpact: 'DET Count = 7 | Thanh A: B1 JOB_ERR_PEND = 1 | Status: MEMIF_IDLE',
        memoryImpact: 'Hoàn tất kiểm thử 5 Dev Errors [00010] + 2 Runtime Errors [91002]',
        swsRef: 'SWS_Fee_00184 / SWS_Fee_00164 / SWS_Fee_91002',
        action() {
          apiFeeCancel();
          apiFeeCancel();
        }
      }
    ],
    whatIfs: [
      {
        label: 'What-If: Tắt FeeDevErrorDetect=FALSE rồi thử truyền 0xFFFF?',
        run() {
          ecucConfig.FeeDevErrorDetect = false;
          apiFeeWrite('0x0010', '0x00', { explicitBlockNumber: '0xFFFF' });
        }
      },
      {
        label: 'What-If: Thử gọi Fee_EraseImmediateBlock(0x0010) (Standard Block)?',
        run() {
          ecucConfig.FeeDevErrorDetect = true;
          apiFeeEraseImmediateBlock('0x0010');
        }
      },
      {
        label: 'What-If: Thử Block 0x1234 chưa cấu hình & GetVersionInfo NULL_PTR?',
        run() {
          ecucConfig.FeeDevErrorDetect = true;
          ecucConfig.FeeVersionInfoApi = true;
          apiFeeWrite('0x0010', '0x00', { explicitBlockNumber: '0x1234' });
          apiFeeGetVersionInfo({ nullPtr: true });
        }
      }
    ]
  }
];
