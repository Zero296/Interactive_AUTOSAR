// ============================================================================
// PART 4B: 12 BUILT-IN PEDAGOGICAL SCENARIOS (S1-S12) & 36 WHAT-IF BUTTONS
// ============================================================================

const SCENARIOS = [
  {
    id: 'S1',
    group: 'A. Khởi Tạo & Ghi/Đọc Chuẩn',
    title: 'S1: EcuM Startup, Fee_Init() & RAM LUT Scan',
    summary:
      'Mô phỏng trình tự bật nguồn ECU: Fee ban đầu ở trạng thái MEMIF_UNINIT (Bit 7 FEE_INIT = 0). EcuM gọi Fee_Init(&Fee_Config) để quét tuần tự Bank 0/Bank 1, xác định các instance hợp lệ có Trailer 0xA5A5 và dựng bảng tra nhanh RAM LUT.',
    setup() {
      resetRuntimeBlockCatalog();
      ecucConfig = { ...defaultConfig, FeeInitialized: false, ActiveMemIfMode: 'MEMIF_MODE_SLOW' };
      createInitialSimState('NEAR_THRESHOLD', { uninit: true });
      simState.selectedModule = 'MOD_ECUM';
      simState.activeArrows = ['arr_ecum_fee'];
      simState.activeModules = ['MOD_ECUM', 'MOD_FEE'];
      pushStepLog('ECU Boot: Power-On Reset -> Fee đang ở MEMIF_UNINIT (B7=0).');
    },
    steps: [
      {
        label: '1. Trạng thái trước Init (MEMIF_UNINIT)',
        action() {
          simState.clockMs = 0;
          simState.selectedModule = 'MOD_FEE';
          simState.activeArrows = ['arr_ecum_fee'];
          simState.activeModules = ['MOD_ECUM', 'MOD_FEE'];
          addTrace('EcuM', 'EcuM_AL_DriverInitZero()', 'Chuẩn bị khởi tạo Memory Stack, Fee đang MEMIF_UNINIT (RegA B7=0)', 'INFO');
          setCodeSnippet(
            'Trạng thái Boot Trước Init',
            `/* Reset xong: Fee_GetStatus() == MEMIF_UNINIT */\n/* Nếu gọi Fee_Read() lúc này -> DET FEE_E_UNINIT (0x01)! */`
          );
          syncBitRegistersFromState();
        }
      },
      {
        label: '2. EcuM gọi Fee_Init(&Fee_Config)',
        action() {
          simState.clockMs += Number(ecucConfig.FeeMainFunctionPeriod) || 5;
          apiFeeInit('EcuM_StartupTwo');
          simState.selectedModule = 'MOD_FEE';
        }
      },
      {
        label: '3. Kiểm chứng RAM LUT O(1) sau Scan',
        action() {
          simState.clockMs += 5;
          simState.selectedModule = 'MOD_DFLASH';
          simState.activeArrows = ['arr_fee_fls', 'arr_fls_fee', 'arr_fls_dflash'];
          simState.activeModules = ['MOD_FEE', 'MOD_FLS', 'MOD_DFLASH'];
          const lutCount = Object.keys(simState.lut).length;
          addTrace('Fee', 'Fee_GetStatus() -> MEMIF_IDLE', `RAM LUT chứa ${lutCount} địa chỉ mới nhất. các bản SUPERSEDED cũ bị loại khỏi LUT!`, 'OK');
          pushStepLog(`RAM LUT dựng xong ${lutCount} blocks hợp lệ. Sẵn sàng phục vụ NvM_ReadAll().`);
          syncBitRegistersFromState();
        }
      }
    ],
    whatIfs: [
      {
        label: 'What-If: Thử gọi Fee_Read khi chưa Init?',
        run() {
          ecucConfig.FeeInitialized = false;
          simState.moduleState = 'MEMIF_UNINIT';
          apiFeeRead('0x0010');
        }
      },
      {
        label: 'What-If: Tắt RAM LUT Cache (O(N) Scan)?',
        run() {
          ecucConfig.FeeEnableRamLutCache = false;
          rebuildRamLutFromFlash();
          apiFeeRead('0x0020');
          stepCompleteAsyncJob();
        }
      },
      {
        label: 'What-If: Đổi Page Size 8B -> 16B & xem lại Geometry?',
        run() {
          ecucConfig.FeeVirtualPageSize = '16';
          ecucConfig.FeeBlockHeaderSize = 16;
          apiFeeWrite('0x0010', '0xBB 0xCC [VP=16B Test]');
          stepCompleteAsyncJob();
        }
      }
    ]
  },

  {
    id: 'S2',
    group: 'A. Khởi Tạo & Ghi/Đọc Chuẩn',
    title: 'S2: Fee_Write() — Header + Virtual Page Padding + Trailer',
    summary:
      'Minh họa giải phẫu từng tick của một lệnh Fee_Write(0x0010) 14 bytes raw payload với FeeVirtualPageSize=8B: 14B được đệm thêm 2 bytes 0xFF thành 16B (+ 8B Header = 24B), chạy tuần tự 3 pha Phase 1 (Header) -> Phase 2 (Payload+Pad) -> Phase 3 (Trailer 0xA5A5).',
    setup() {
      resetRuntimeBlockCatalog();
      ecucConfig = { ...defaultConfig, ActiveMemIfMode: 'MEMIF_MODE_SLOW', FlsBytesPerCycleSlow: 8 };
      createInitialSimState('EMPTY');
      apiFeeInit('S2 Fresh Flash');
      simState.clockMs = 0;
      ecucConfig.SelectedFeeBlock = '0x0010';
    },
    steps: [
      {
        label: '1. SWC -> NvM -> MemIf gọi Fee_Write(0x0010, 14B)',
        action() {
          apiFeeWrite('0x0010', '0x1A 0x2B 0x3C [EngineLearn 14B]');
        }
      },
      {
        label: '2. Tick 1 (+5ms): Phase 1 Ghi Block Header (8B)',
        action() {
          stepMainFunctionTick();
        }
      },
      {
        label: '3. Tick 2 (+5ms): Phase 2 Ghi 8B Payload đầu',
        action() {
          stepMainFunctionTick();
        }
      },
      {
        label: '4. Tick 3 (+5ms): Ghi nốt 6B + 2B Pad (0xFF) & Trailer 0xA5A5',
        action() {
          stepMainFunctionTick();
        }
      }
    ],
    whatIfs: [
      {
        label: 'What-If: Ghi Blk#4 VIN 17B (Pad 7B)?',
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
        label: 'What-If: Giả lập lỗi Write Verify (DEM)?',
        run() {
          ecucConfig.SimulateFlsWriteVerifyError = true;
          apiFeeWrite('0x0020', '0x00 0xEE [Verify Fail]');
          stepMainFunctionTick();
        }
      }
    ]
  },

  {
    id: 'S3',
    group: 'A. Khởi Tạo & Ghi/Đọc Chuẩn',
    title: 'S3: Fee_Read() — O(1) RAM LUT & Partial Offset/Len Read',
    summary:
      'Cho thấy sức mạnh của bảng tra RAM LUT (O(1) lookup không cần scan lại Bank) và khả năng Partial Read theo đúng BlockOffset + Length nhỏ hơn FeeBlockSize (ví dụ chỉ đọc 4 bytes giữa khối Odometer 24B).',
    setup() {
      resetRuntimeBlockCatalog();
      ecucConfig = { ...defaultConfig, FeeEnableRamLutCache: true };
      createInitialSimState('DEFAULT_LIGHT');
      ecucConfig.SelectedFeeBlock = '0x0020';
    },
    steps: [
      {
        label: '1. Kiểm tra RAM LUT trỏ thẳng tới Blk#2 (0x0020)',
        action() {
          simState.clockMs += 5;
          simState.selectedModule = 'MOD_FEE';
          const entry = simState.lut['0x0020'];
          if (entry) {
            const slot = simState.banks[entry.bankId].slots.find((s) => s.offset === entry.offset);
            if (slot) simState.selectedSlotUid = slot.uid;
          }
          addTrace('Fee', 'LUT Lookup(0x0020)', `O(1) Hit -> Bank ${entry ? entry.bankId : 0} +0x${entry ? entry.offset.toString(16).toUpperCase() : '0'}`, 'OK');
          syncBitRegistersFromState();
        }
      },
      {
        label: '2. NvM gọi Fee_Read(0x0020, Ofs=8, Len=4)',
        action() {
          apiFeeRead('0x0020', { offset: 8, length: 4 });
        }
      },
      {
        label: '3. Fls_Read() hoàn tất & Callback JobEndNotification()',
        action() {
          stepMainFunctionTick();
        }
      }
    ],
    whatIfs: [
      {
        label: 'What-If: Đọc quá Offset (>= BlockSize)?',
        run() {
          apiFeeRead('0x0020', { offset: 30, length: 4 });
        }
      },
      {
        label: 'What-If: Đọc Dataset DS1 (0x0021) thay vì DS0?',
        run() {
          apiFeeWrite('0x0021', '0x00 0x02 0x10 [ODO DS1]');
          stepCompleteAsyncJob();
          apiFeeRead('0x0021', { offset: 0, length: 8 });
          stepCompleteAsyncJob();
        }
      },
      {
        label: 'What-If: Tắt RAM LUT để thấy Linear Scan chậm hơn?',
        run() {
          ecucConfig.FeeEnableRamLutCache = false;
          rebuildRamLutFromFlash();
          apiFeeRead('0x0020', { offset: 0, length: 24 });
          stepMainFunctionTick();
        }
      }
    ]
  },

  {
    id: 'S4',
    group: 'B. Wear Leveling, GC & Immediate',
    title: 'S4: Wear Leveling — Append-Only & Superseded Mark',
    summary:
      'Giải thích bản chất phần cứng Data Flash không thể ghi đè trực tiếp 0->1 tại chỗ. Mỗi lần gọi Fee_Write() cho cùng một Block 0x0010, Fee tự động ghi tiếp nối (Append) sang vùng 0xFF mới và đánh dấu bản cũ là SUPERSEDED (Bit 2 Thanh B = 1).',
    setup() {
      resetRuntimeBlockCatalog();
      ecucConfig = { ...defaultConfig, ActiveMemIfMode: 'MEMIF_MODE_FAST' };
      createInitialSimState('DEFAULT_LIGHT');
      ecucConfig.SelectedFeeBlock = '0x0010';
    },
    steps: [
      {
        label: '1. Ghi lần 2 Block 0x0010 (Append sang Offset mới)',
        action() {
          apiFeeWrite('0x0010', '0x22 0xB0 [EngineLearn Update #2]');
          stepCompleteAsyncJob();
        }
      },
      {
        label: '2. Ghi lần 3 Block 0x0010 (Bản #1 & #2 thành SUPERSEDED)',
        action() {
          apiFeeWrite('0x0010', '0x33 0xC4 [EngineLearn Update #3]');
          stepCompleteAsyncJob();
        }
      },
      {
        label: '3. Ghi lần 4 & Kiểm chứng RAM LUT chỉ trỏ bản mới nhất',
        action() {
          apiFeeWrite('0x0010', '0x44 0xD9 [EngineLearn Latest #4]');
          stepCompleteAsyncJob();
        }
      }
    ],
    whatIfs: [
      {
        label: 'What-If: Ghi liên tiếp 4 lần nữa để kích hoạt GC?',
        run() {
          for (let i = 0; i < 4; i++) {
            apiFeeWrite('0x0020', `0x00 0xAA [Wear Test #${i + 1}]`);
            stepCompleteAsyncJob();
          }
        }
      },
      {
        label: 'What-If: Chọn một Slot SUPERSEDED xem Thanh B Bit 2?',
        run() {
          const old = simState.banks[simState.activeBank].slots.find((s) => s.status === 'SUPERSEDED');
          if (old) simState.selectedSlotUid = old.uid;
          syncBitRegistersFromState();
        }
      },
      {
        label: 'What-If: Gọi Fee_Read(0x0010) xem lấy bản nào?',
        run() {
          apiFeeRead('0x0010');
          stepCompleteAsyncJob();
        }
      }
    ]
  },

  {
    id: 'S5',
    group: 'B. Wear Leveling, GC & Immediate',
    title: 'S5: Garbage Collection (GC) — Sector Switch & Fls_Erase()',
    summary:
      'Kịch bản trọng tâm của Fee: Bank 0 chứa nhiều rác SUPERSEDED gần chạm ngưỡng 75% (192B/256B). Khi nhận lệnh ghi mới vượt ngưỡng, Fee chuyển sang MEMIF_BUSY_INTERNAL (GC_ACTIVE=1), copy các instance VALID sang Standby Bank 1, đảo vai trò Active Bank, rồi gọi Fls_Erase(Bank 0) mất 3 ticks!',
    setup() {
      resetRuntimeBlockCatalog();
      ecucConfig = { ...defaultConfig, ActiveMemIfMode: 'MEMIF_MODE_FAST', FlsSectorEraseDurationTicks: 3 };
      createInitialSimState('GC_READY_MIXED');
      ecucConfig.SelectedFeeBlock = '0x0020';
    },
    steps: [
      {
        label: '1. Ghi Block 0x0020 khi Bank 0 sắp chạm ngưỡng GC 75%',
        action() {
          apiFeeWrite('0x0020', '0x00 0x09 0x99 [Trigger GC!]');
        }
      },
      {
        label: '2. GC Pha Copy: Sao chép các VALID block sang Bank 1',
        action() {
          let guard = 0;
          while (simState.gcState.active && simState.gcState.phase === 'GC_COPY_VALID' && guard < 10) {
            stepMainFunctionTick();
            guard += 1;
          }
        }
      },
      {
        label: '3. Sector Switch: Bank 1 thành ACTIVE & cập nhật RAM LUT',
        action() {
          if (simState.gcState.phase === 'GC_SWITCH_BANK') {
            stepMainFunctionTick();
          }
        }
      },
      {
        label: '4. Fls_Erase(Bank 0) (3 ticks) & hoàn tất Write chờ',
        action() {
          stepCompleteAsyncJob();
        }
      }
    ],
    whatIfs: [
      {
        label: 'What-If: Phun lỗi Fls_Erase Error giữa GC?',
        run() {
          ecucConfig.SimulateFlsEraseError = true;
          startGarbageCollectionInternal(null);
          stepCompleteAsyncJob();
        }
      },
      {
        label: 'What-If: Hạ ngưỡng GC Threshold xuống 60%?',
        run() {
          ecucConfig.FeeGcTriggerThresholdPct = 60;
          apiFeeWrite('0x0040', '56 49 4E [Early GC]');
        }
      },
      {
        label: 'What-If: Đổi sang R23-11 MemAcc xem tên API Erase?',
        run() {
          ecucConfig.FeeLowerLayerArchitecture = 'R23_MEMACC';
          startGarbageCollectionInternal(null);
          stepMainFunctionTick();
        }
      }
    ]
  },

  {
    id: 'S6',
    group: 'B. Wear Leveling, GC & Immediate',
    title: 'S6: Immediate Block (Crash Data) Preemption [SWS_Fee_00060]',
    summary:
      'Trong lúc Garbage Collection đang bận copy rác, cảm biến túi khí phát hiện va chạm và gọi Fee_Write(0x0030) với FeeImmediateData=TRUE. Fee lập tức bật Bit 2 IMM_PREEMPT, tạm hoãn GC, ghi dữ liệu khẩn cấp vào Reserved Immediate Zone, sau đó tiếp tục hoàn tất GC mà không làm mất Crash Event!',
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
        label: '1. GC đang chạy (MEMIF_BUSY_INTERNAL, GC_ACTIVE=1)',
        action() {
          simState.clockMs += 5;
          addTrace('Fee GC', 'Status = MEMIF_BUSY_INTERNAL', `Đang dọn Bank 0 -> Bank 1 (${simState.gcState.copiedCount}/${simState.gcState.itemsToCopy.length} copied)`, 'WARN');
          syncBitRegistersFromState();
        }
      },
      {
        label: '2. Airbag SWC gọi khẩn cấp Fee_Write(0x0030, IMM=TRUE)',
        action() {
          apiFeeWrite('0x0030', '0xFF 0xCA [AIRBAG DEPLOYED!]', { immediate: true });
        }
      },
      {
        label: '3. Ghi xong Crash Block vào Reserved Zone (IMM_PREEMPT=1)',
        action() {
          let guard = 0;
          while (simState.activeJob && guard < 10) {
            stepMainFunctionTick();
            guard += 1;
          }
        }
      },
      {
        label: '4. GC tự động phục hồi, mang cả Crash Block mới sang Bank 1!',
        action() {
          stepCompleteAsyncJob();
        }
      }
    ],
    whatIfs: [
      {
        label: 'What-If: Thử gọi Standard Write (0x0010) khi GC đang chạy?',
        run() {
          if (!simState.gcState.active) startGarbageCollectionInternal(null);
          apiFeeWrite('0x0010', '0x01 0x02 [Standard Blocked?]');
        }
      },
      {
        label: 'What-If: Chuẩn bị trước bằng Fee_EraseImmediateBlock?',
        run() {
          apiFeeEraseImmediateBlock('0x0030');
        }
      },
      {
        label: 'What-If: Chuyển sang FAST_MODE cho Crash Event?',
        run() {
          apiFeeSetMode('MEMIF_MODE_FAST');
          apiFeeWrite('0x0030', '0xFF 0xCC [FAST CRASH]', { immediate: true });
          stepCompleteAsyncJob();
        }
      }
    ]
  },

  {
    id: 'S7',
    group: 'C. Phục Hồi Sự Cố & Lỗi (Safety)',
    title: 'S7: Torn Write (Power Loss) & Previous Instance Fallback',
    summary:
      'Kịch bản an toàn kinh điển của AUTOSAR Fee: Nguồn 12V ECU sập giữa Phase 2 khi đang ghi Odometer bản mới (chưa kịp ghi Valid Trailer 0xA5A5 -> Torn Write). Khi ECU bật lại và gọi Fee_Init(), Fee phát hiện B0 INCONSISTENT=1 và tự động Fallback lùi về bản trước đó an toàn!',
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
        label: '1. Bắt đầu ghi Odometer mới (SimulatePowerLoss = TRUE)',
        action() {
          apiFeeWrite('0x0020', '0x00 0x01 0x99 [Power Cut Soon]');
        }
      },
      {
        label: '2. Tick 1 & Tick 2: Mất điện ECU giữa chừng -> TORN WRITE!',
        action() {
          stepMainFunctionTick();
          stepMainFunctionTick();
        }
      },
      {
        label: '3. ECU Có Điện Lại -> EcuM gọi Fee_Init() Quét & Fallback',
        action() {
          ecucConfig.SimulatePowerLossDuringWrite = false;
          simState.clockMs += 10;
          apiFeeInit('Recovery After Power Cut');
        }
      },
      {
        label: '4. Fee_Read(0x0020) -> Trả MEMIF_JOB_OK với bản cũ toàn vẹn!',
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
          apiFeeInit('No Fallback Mode');
          apiFeeRead('0x0010');
          stepCompleteAsyncJob();
        }
      },
      {
        label: 'What-If: Bơm thêm 1 Torn Write trên Blk#1?',
        run() {
          injectTornWritePowerLoss('0x0010');
        }
      },
      {
        label: 'What-If: Ghi đè bản sạch mới sau khi phục hồi?',
        run() {
          ecucConfig.SimulatePowerLossDuringWrite = false;
          if (!ecucConfig.FeeInitialized) apiFeeInit('Auto Init');
          apiFeeWrite('0x0020', '0x00 0x01 0xA5 [Clean Recovery]');
          stepCompleteAsyncJob();
        }
      }
    ]
  },

  {
    id: 'S8',
    group: 'C. Phục Hồi Sự Cố & Lỗi (Safety)',
    title: 'S8: Fee_InvalidateBlock() -> MEMIF_BLOCK_INVALID',
    summary:
      'Để xóa dữ liệu hợp lệ (ví dụ Reset dữ liệu học động cơ) mà không thể Erase 1 block đơn lẻ trên Flash, Fee ghi thêm một Invalidation Marker vào cuối Bank và đánh dấu bản cũ SUPERSEDED. Lần đọc sau trả MEMIF_BLOCK_INVALID để NvM nạp lại ROM Default.',
    setup() {
      resetRuntimeBlockCatalog();
      ecucConfig = { ...defaultConfig };
      createInitialSimState('DEFAULT_LIGHT');
      ecucConfig.SelectedFeeBlock = '0x0010';
    },
    steps: [
      {
        label: '1. Kiểm tra Blk#1 (0x0010) đang VALID trên Bank 0 & RAM LUT',
        action() {
          apiFeeRead('0x0010');
          stepCompleteAsyncJob();
        }
      },
      {
        label: '2. NvM gọi Fee_InvalidateBlock(0x0010)',
        action() {
          apiFeeInvalidate('0x0010');
          stepCompleteAsyncJob();
        }
      },
      {
        label: '3. Gọi lại Fee_Read(0x0010) -> Trả MEMIF_BLOCK_INVALID!',
        action() {
          apiFeeRead('0x0010');
          stepCompleteAsyncJob();
        }
      }
    ],
    whatIfs: [
      {
        label: 'What-If: Ghi lại giá trị mới sau khi Invalidate?',
        run() {
          apiFeeWrite('0x0010', '0x15 0x00 [Re-Learned]');
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
    id: 'S9',
    group: 'C. Phục Hồi Sự Cố & Lỗi (Safety)',
    title: 'S9: Fee_SetMode(SLOW vs FAST) Throughput Scaling',
    summary:
      'So sánh trực tiếp hiệu năng khi ghi cùng một Block 0x0020 (tổng 32B gồm 8B Hdr + 24B Data): ở MEMIF_MODE_SLOW (8B/tick) mất 4 ticks = 20ms, còn khi EcuM/NvM chuyển sang MEMIF_MODE_FAST (64B/tick) lúc WriteAll shutdown chỉ mất đúng 1 tick = 5ms!',
    setup() {
      resetRuntimeBlockCatalog();
      ecucConfig = { ...defaultConfig, ActiveMemIfMode: 'MEMIF_MODE_SLOW', FlsBytesPerCycleSlow: 8, FlsBytesPerCycleFast: 64 };
      createInitialSimState('DEFAULT_LIGHT');
      ecucConfig.SelectedFeeBlock = '0x0020';
    },
    steps: [
      {
        label: '1. Ghi Blk#2 (32B) ở SLOW MODE (8B/tick -> 4 ticks = 20ms)',
        action() {
          apiFeeSetMode('MEMIF_MODE_SLOW');
          apiFeeWrite('0x0020', '0x00 0x02 0x00 [SLOW 20ms]');
          stepCompleteAsyncJob();
        }
      },
      {
        label: '2. EcuM Shutdown -> Gọi Fee_SetMode(MEMIF_MODE_FAST)',
        action() {
          apiFeeSetMode('MEMIF_MODE_FAST');
        }
      },
      {
        label: '3. Ghi lại Blk#2 (32B) ở FAST MODE (64B/tick -> 1 tick = 5ms!)',
        action() {
          apiFeeWrite('0x0020', '0x00 0x02 0x01 [FAST 5ms]');
          stepCompleteAsyncJob();
        }
      }
    ],
    whatIfs: [
      {
        label: 'What-If: Tắt FeeSetModeSupported=FALSE?',
        run() {
          ecucConfig.FeeSetModeSupported = false;
          apiFeeSetMode('MEMIF_MODE_FAST');
        }
      },
      {
        label: 'What-If: Đổi Fast Throughput lên 128 B/tick?',
        run() {
          ecucConfig.FlsBytesPerCycleFast = 128;
          apiFeeSetMode('MEMIF_MODE_FAST');
          apiFeeWrite('0x0040', '57 44 42 [Turbo 128B]');
          stepCompleteAsyncJob();
        }
      },
      {
        label: 'What-If: Đổi Slow xuống 4 B/tick để quan sát 8 ticks?',
        run() {
          ecucConfig.FlsBytesPerCycleSlow = 4;
          apiFeeSetMode('MEMIF_MODE_SLOW');
          apiFeeWrite('0x0020', '0x00 0x03 0x00 [Slow 4B]');
          stepMainFunctionTick();
        }
      }
    ]
  },

  {
    id: 'S10',
    group: 'C. Phục Hồi Sự Cố & Lỗi (Safety)',
    title: 'S10: Fee_Cancel() & DET Guards (Uninit / Busy / Invalid)',
    summary:
      'Kiểm chứng hàng rào phòng thủ lập trình AUTOSAR DET (Module ID = 21) và hành vi Fee_Cancel() hủy ngang một Job đang chạy dở -> trả về MEMIF_JOB_CANCELED để giải phóng NvM cho tác vụ ưu tiên khác.',
    setup() {
      resetRuntimeBlockCatalog();
      ecucConfig = { ...defaultConfig, FeeDevErrorDetect: true, ActiveMemIfMode: 'MEMIF_MODE_SLOW', FlsBytesPerCycleSlow: 8 };
      createInitialSimState('DEFAULT_LIGHT');
      ecucConfig.SelectedFeeBlock = '0x0020';
    },
    steps: [
      {
        label: '1. Bắt đầu Write & Cố tình gửi thêm lệnh -> DET FEE_E_BUSY (0x06)',
        action() {
          apiFeeWrite('0x0020', '0x11 0x22 [Job 1 Busy]');
          stepMainFunctionTick();
          apiFeeWrite('0x0010', '0x33 0x44 [Should Fail BUSY]');
        }
      },
      {
        label: '2. Gọi Fee_Cancel() hủy ngang Job 1 -> MEMIF_JOB_CANCELED',
        action() {
          apiFeeCancel();
        }
      },
      {
        label: '3. Gọi BlockNumber=0x0000 -> DET FEE_E_INVALID_BLOCK_NO (0x02)',
        action() {
          apiFeeWrite('0x0010', '0x00', { explicitBlockNumber: '0x0000' });
        }
      }
    ],
    whatIfs: [
      {
        label: 'What-If: Gọi Fee_Cancel khi IDLE (FEE_E_INVALID_CANCEL)?',
        run() {
          simState.activeJob = null;
          simState.moduleState = 'MEMIF_IDLE';
          apiFeeCancel();
        }
      },
      {
        label: 'What-If: Thử Param Pointer NULL (FEE_E_PARAM_POINTER)?',
        run() {
          apiFeeRead('0x0010', { offset: 0, length: 4, nullPtr: true });
        }
      },
      {
        label: 'What-If: Tắt FeeDevErrorDetect xem DET có im lặng?',
        run() {
          ecucConfig.FeeDevErrorDetect = false;
          apiFeeWrite('0x0010', '0x00', { explicitBlockNumber: '0x0000' });
        }
      }
    ]
  },

  {
    id: 'S11',
    group: 'D. Hardware Faults & AUTOSAR R23-11',
    title: 'S11: Hardware Fault Injection — Erase Error & ECC Bit-Flip',
    summary:
      'Mô phỏng sự cố phần cứng Data Flash thực tế trên xe lão hóa: lỗi Uncorrectable Double-Bit ECC khi đọc (trả MEMIF_BLOCK_INCONSISTENT) và lỗi Fls_Erase() thất bại trong Garbage Collection khiến DEM ghi nhận DTC và khóa Sector hỏng.',
    setup() {
      resetRuntimeBlockCatalog();
      ecucConfig = { ...defaultConfig, SimulateFlashEccBitFlip: false, SimulateFlsEraseError: false };
      createInitialSimState('GC_READY_MIXED');
    },
    steps: [
      {
        label: '1. Kích hoạt SimulateFlashEccBitFlip & gọi Fee_Read(0x0010)',
        action() {
          ecucConfig.SimulateFlashEccBitFlip = true;
          apiFeeRead('0x0010');
          stepCompleteAsyncJob();
        }
      },
      {
        label: '2. Kích hoạt SimulateFlsEraseError & khởi chạy Garbage Collection',
        action() {
          ecucConfig.SimulateFlashEccBitFlip = false;
          ecucConfig.SimulateFlsEraseError = true;
          startGarbageCollectionInternal(null);
          stepCompleteAsyncJob();
        }
      },
      {
        label: '3. Kiểm tra Sector SM = SECTOR_CORRUPT_DEM & DEM Log',
        action() {
          simState.selectedModule = 'MOD_DEM';
          addTrace('Dem', 'DTC Active: FEE_E_GC_ERASE_FAILED', 'Bank 0 bị đánh dấu lỗi phần cứng không thể xóa', 'ERR');
          syncBitRegistersFromState();
        }
      }
    ],
    whatIfs: [
      {
        label: 'What-If: Reset lỗi phần cứng & khôi phục Bank mới?',
        run() {
          ecucConfig.SimulateFlsEraseError = false;
          ecucConfig.SimulateFlashEccBitFlip = false;
          ecucConfig.SimulateFlsWriteVerifyError = false;
          simState.banks[0].state = 'BANK_ACTIVE';
          apiFeeInit('Hardware Service Cleared');
        }
      },
      {
        label: 'What-If: Phun lỗi Write Verify Fail lúc ghi 0x0030?',
        run() {
          ecucConfig.SimulateFlsWriteVerifyError = true;
          apiFeeWrite('0x0030', '0xFA 0x1L [Verify Err]');
          stepCompleteAsyncJob();
        }
      },
      {
        label: 'What-If: Mở Inspector xem Code C xử lý DEM Callback?',
        run() {
          switchInspTab(2);
        }
      }
    ]
  },

  {
    id: 'S12',
    group: 'D. Hardware Faults & AUTOSAR R23-11',
    title: 'S12: AUTOSAR R23-11 Migration (Classic Fls vs MemAcc Stack)',
    summary:
      'So sánh sự thay đổi mang tính bước ngoặt từ AUTOSAR Classic R20-11 (Fee gọi trực tiếp MCAL Fls_Write/Read/Erase) sang AUTOSAR R23-11 (Fee gọi qua tầng Memory Access hợp nhất MemAcc_Write/Read/Erase giúp chia sẻ băng thông bus Flash an toàn giữa nhiều ECU Core/FOTA).',
    setup() {
      resetRuntimeBlockCatalog();
      ecucConfig = { ...defaultConfig, FeeLowerLayerArchitecture: 'CLASSIC_FLS' };
      createInitialSimState('DEFAULT_LIGHT');
    },
    steps: [
      {
        label: '1. Kiến trúc Classic R20-11: Fee -> Fls Driver (Fls_Write)',
        action() {
          ecucConfig.FeeLowerLayerArchitecture = 'CLASSIC_FLS';
          apiFeeWrite('0x0010', '0x11 0xAA [Classic Fls]');
          stepCompleteAsyncJob();
        }
      },
      {
        label: '2. Chuyển công tắc sang AUTOSAR R23-11: MemAcc Lower Layer!',
        action() {
          ecucConfig.FeeLowerLayerArchitecture = 'R23_MEMACC';
          simState.selectedModule = 'MOD_FLS';
          addTrace('Stack Upgrade', 'FeeLowerLayerArchitecture -> R23_MEMACC', 'Khối MCAL Fls đổi thành MemAcc Address Area Arbitration!', 'OK');
          syncBitRegistersFromState();
        }
      },
      {
        label: '3. Ghi Block bằng API R23-11 MemAcc_Write() & xem Code C',
        action() {
          apiFeeWrite('0x0020', '0x22 0xBB [R23 MemAcc_Write]');
          stepCompleteAsyncJob();
        }
      }
    ],
    whatIfs: [
      {
        label: 'What-If: Quay lại Classic Fls ngay để so sánh SVG?',
        run() {
          ecucConfig.FeeLowerLayerArchitecture = 'CLASSIC_FLS';
          addTrace('Stack', 'Switch -> CLASSIC_FLS', 'Đổi tên khối SVG & Code về Fls_Write/Read/Erase', 'INFO');
          syncBitRegistersFromState();
        }
      },
      {
        label: 'What-If: Xem Fee_Cfg.h cho cấu hình R23-11 MemAcc?',
        run() {
          ecucConfig.FeeLowerLayerArchitecture = 'R23_MEMACC';
          openExportModal();
          switchExportTab(1);
        }
      },
      {
        label: 'What-If: Chạy GC với MemAcc_Erase() trên R23-11?',
        run() {
          ecucConfig.FeeLowerLayerArchitecture = 'R23_MEMACC';
          startGarbageCollectionInternal(null);
          stepCompleteAsyncJob();
        }
      }
    ]
  }
];
