// ==================== 12 PRESET SCENARIOS (4 STEPS EACH) & 36 WHAT-IFS ====================

const SCENARIOS = [
  // -------------------- GROUP 1: ComXf (#175) + E2EXf (#176) ON CAN / COM --------------------
  {
    id: 'S1',
    group: 'Nhóm 1: ComXf (#175) + E2EXf (#176)',
    title: 'S1. Tuần Tự Hóa Struct Với ComXf: Packing, Endianness, FillPattern & SignalGroupArray',
    summary: 'SWC ghi struct BrakeStatus_t {Speed=1205, Steer=-120, Gear=4}. ComXf đóng gói theo Motorola Big-Endian, điền 0xFF vào bit trống và gọi Com_SendSignalGroupArray().',
    setup(cfg) {
      Object.assign(cfg, defaultConfig, {
        ActiveTransformerChainPreset: 'COMXF_ONLY',
        E2EXfActiveProfile: 'NONE',
        ComXfSignalEndianness: 'BIG_ENDIAN',
        ComXfUnusedBitFillPatternHex: '0xFF',
        SwcInputVehicleSpeedKmh: 1205,
        SwcInputSteerAngleDeg: -120,
        SwcInputGearPosition: 4,
        ComSendSignalGroupArrayEnable: true
      });
    },
    steps: [
      {
        title: 'Bước 1: SWC ghi Struct qua Rte_Write()',
        exec(sim, cfg) {
          sim.lastChainDir = 'IDLE';
          sim.chainFsmState = 'IDLE';
          sim.activeSvgModules = ['SWC', 'RTE'];
          sim.activeSvgPaths = ['path_SWC_RTE'];
          addTrace(sim, 'SWC', 0, 'Rte_Write_PpBrake_Status(&brakeStruct)', 'Spd=1205, Steer=-120, Gear=4', 'Pending Xfrm', 'ok', 'SWC hoàn toàn trong suốt với byte order & fill pattern');
          sim.stepExplanation = {
            title: 'Pha 1 (SWC ➔ RTE): Ghi Struct Dữ Liệu Ứng Dụng',
            summary: 'SWC_Brake điền ApplicationDataType { Speed=1205, Steer=-120, Gear=4 } và gọi Rte_Write().',
            inputSrc: 'Biến nội bộ của SWC_Brake Runnable',
            processDesc: 'RTE chuẩn bị mảng đệm Rte_XfrmBuf[] kích thước 8 bytes cho chuỗi COMXF_ONLY.',
            outputDst: 'Chuẩn bị gọi ComXf_Tx_BrakeGrp()',
            bitDiff: 'Reg B: MODE_SOMEIP=0 (ComXf), BIG_ENDIAN=1',
            alert: ''
          };
          syncRegistersFromState(sim, cfg);
        }
      },
      {
        title: 'Bước 2: ComXf_Tx đóng gói Bit, Endian & FillPattern',
        exec(sim, cfg) {
          executeTxForward(sim, cfg, { keepCounter: true });
          sim.stepExplanation.title = 'Pha 2 (RTE ➔ ComXf #175): Packing Byte 0..7 + UnusedBitPattern';
          sim.stepExplanation.summary = `ComXf tuần tự hóa 1205 (0x04B5) vào Byte 0..1 [${cfg.ComXfSignalEndianness}], -120 (0xFF88) vào Byte 2..3, Gear=${cfg.SwcInputGearPosition} vào Byte 4 và điền bit trống = ${cfg.ComXfUnusedBitFillPatternHex}.`;
        }
      },
      {
        title: 'Bước 3: Com_SendSignalGroupArray() đẩy nguyên khối 8B',
        exec(sim, cfg) {
          advanceClock(sim, 4);
          sim.activeSvgModules = ['ComXf', 'Com', 'BusIf'];
          sim.activeSvgPaths = ['path_ComXf_Com', 'path_Com_BusIf'];
          addTrace(sim, 'PduR/CanIf', 51, 'CanIf_Transmit(CanTxPdu, &PduInfo[8B])', '8 Bytes Monolithic Frame', 'E_OK', 'ok', 'Bỏ qua vòng lặp packing từng signal trong Com_MainFunctionRx/Tx');
          sim.stepExplanation = {
            title: 'Pha 3 (RTE ➔ COM ➔ PduR ➔ CanIf): Tối ưu SignalGroupArray',
            summary: 'Thay vì gọi từng Com_SendSignal(), RTE gọi Com_SendSignalGroupArray() đẩy thẳng 8 bytes từ ComXf ra bus CAN.',
            inputSrc: 'Rte_XfrmBuf[8] từ ComXf_Tx',
            processDesc: 'COM copy thẳng 8 bytes vào Tx I-PDU buffer rồi định tuyến xuống PduR -> CanIf.',
            outputDst: 'Khung CAN 8B truyền ra bus vật lý',
            bitDiff: 'ComSendSignalGroupArrayEnable = TRUE (Giảm tối đa tải CPU COM)',
            alert: ''
          };
          syncRegistersFromState(sim, cfg);
        }
      },
      {
        title: 'Bước 4: ComXf_Inv trên Rx khôi phục đúng số âm sint16 (-120)',
        exec(sim, cfg) {
          executeRxInverse(sim, cfg);
        }
      }
    ],
    whatIfs: [
      {
        label: '1️⃣ Đổi ComXfSignalEndianness -> LITTLE_ENDIAN & chạy lại Tx',
        run(sim, cfg) {
          cfg.ComXfSignalEndianness = 'LITTLE_ENDIAN';
          executeTxForward(sim, cfg);
          selectModule('ComXf');
        }
      },
      {
        label: '2️⃣ Đổi UnusedBitFillPattern từ 0xFF sang 0x00',
        run(sim, cfg) {
          cfg.ComXfUnusedBitFillPatternHex = '0x00';
          executeTxForward(sim, cfg);
        }
      },
      {
        label: '3️⃣ Chạy chiều nhận nghịch đảo ComXf_Inv() khôi phục Steer=-120',
        run(sim, cfg) {
          executeRxInverse(sim, cfg);
        }
      }
    ]
  },

  {
    id: 'S2',
    group: 'Nhóm 1: ComXf (#175) + E2EXf (#176)',
    title: 'S2. Chuỗi Kết Hợp ComXf ➔ E2EXf (Profile 05): CRC-16 Tx & Inverse Rx',
    summary: 'Tx chạy ComXf (&buf[3]) rồi E2EXf Profile 05 (3B CRC-16 + Counter). Rx đảo ngược hoàn toàn: E2EXf_Inv trước -> ComXf_Inv sau!',
    setup(cfg) {
      Object.assign(cfg, defaultConfig, {
        ActiveTransformerChainPreset: 'COMXF_E2E_P05',
        E2EXfActiveProfile: 'PROFILE_05',
        XfrmBufferComputationMode: 'IN_PLACE',
        E2EXfDataIdHex: '0x00001A2B',
        E2EXfMinOkStateValid: 2,
        E2EXfMaxErrorStateValid: 1
      });
    },
    steps: [
      {
        title: 'Bước 1 (Tx): ComXf viết payload vào &Rte_XfrmBuf[3] (HeaderShift=3B)',
        exec(sim, cfg) {
          executeTxForward(sim, cfg);
        }
      },
      {
        title: 'Bước 2 (Tx): E2EXf Profile 05 tính CRC-16 & chèn Header vào Byte 0..2',
        exec(sim, cfg) {
          advanceClock(sim, 3);
          sim.activeSvgModules = ['ComXf', 'E2EXf', 'Com', 'BusIf'];
          sim.activeSvgPaths = ['path_ComXf_E2EXf', 'path_E2EXf_Com', 'path_Com_BusIf'];
          sim.stepExplanation = {
            title: 'Tx Step 2: E2EXf (#176) Profile 05 Bảo Vệ 5 Bytes Payload',
            summary: `E2EXf đọc payload từ buf[3..7], nhúng DataID (${cfg.E2EXfDataIdHex}) + Counter=${sim.txCounter}, tính CRC-16-CCITT ghi vào buf[0..2] thành khung 8B CAN hoàn chỉnh.`,
            inputSrc: 'Payload 5B tại &Rte_XfrmBuf[3]',
            processDesc: 'E2E_P05Protect() ghi [CRC16_Hi, CRC16_Lo, Counter] vào 3 bytes HeaderShift đầu.',
            outputDst: 'Com_SendSignalGroupArray() truyền 8B Frame an toàn ASIL',
            bitDiff: 'Reg B Bit 4 (E2E_ON)=1, Bit 3 (INPLACE)=1',
            alert: ''
          };
          syncRegistersFromState(sim, cfg);
        }
      },
      {
        title: 'Bước 3 (Rx): Bắt buộc chạy E2EXf_Inv TRƯỚC ComXf_Inv!',
        exec(sim, cfg) {
          executeRxInverse(sim, cfg);
        }
      },
      {
        title: 'Bước 4 (Rx): Giao Struct sạch & E2E_SM_VALID (0x00) cho SWC',
        exec(sim, cfg) {
          advanceClock(sim, 2);
          addTrace(sim, 'SWC', 0, 'Rte_Read_RpBrake_Status(&outStruct)', sim.decodedSummary, 'RTE_E_OK (0x00)', 'ok', 'SWC nhận dữ liệu đã qua xác thực E2E');
          syncRegistersFromState(sim, cfg);
        }
      }
    ],
    whatIfs: [
      {
        label: '1️⃣ Chuyển E2EXfActiveProfile sang PROFILE_01 (2B, CRC-8)',
        run(sim, cfg) {
          cfg.E2EXfActiveProfile = 'PROFILE_01';
          cfg.ActiveTransformerChainPreset = 'COMXF_E2E_P01';
          executeTxForward(sim, cfg);
        }
      },
      {
        label: '2️⃣ Bơm lỗi CRC (InjectE2ECrcCorruption) + Rx xem Abort trước ComXf_Inv',
        run(sim, cfg) {
          cfg.InjectE2ECrcCorruption = true;
          cfg.E2EXfMaxErrorStateValid = 0;
          executeTxForward(sim, cfg);
          executeRxInverse(sim, cfg);
        }
      },
      {
        label: '3️⃣ Đẩy E2E_SM từ NODATA -> INIT -> VALID qua 3 lần Rx',
        run(sim, cfg) {
          cfg.InjectE2ECrcCorruption = false;
          sim.e2eSmState = 'E2E_SM_NODATA';
          sim.e2eSmStateNibble = 1;
          sim.e2eOkCount = 0;
          sim.e2eErrCount = 0;
          sim.e2eWindowHistory = [];
          executeTxForward(sim, cfg);
          executeRxInverse(sim, cfg);
          executeTxForward(sim, cfg);
          executeRxInverse(sim, cfg);
        }
      }
    ]
  },

  {
    id: 'S3',
    group: 'Nhóm 1: ComXf (#175) + E2EXf (#176)',
    title: 'S3. So Sánh In-Place Buffer (HeaderShift Zero-Copy) vs Out-of-Place Buffer',
    summary: 'Phân tích tối ưu hóa RAM/CPU của ASWS_TransformerGeneral: dùng chung 1 mảng Rte_XfrmBuf[] (0 memcpy) vs tách 2 mảng copy.',
    setup(cfg) {
      Object.assign(cfg, defaultConfig, {
        ActiveTransformerChainPreset: 'COMXF_E2E_P05',
        E2EXfActiveProfile: 'PROFILE_05',
        XfrmBufferComputationMode: 'IN_PLACE',
        XfrmAllocatedRteBufferSize: 16
      });
    },
    steps: [
      {
        title: 'Bước 1: Chế độ IN_PLACE cấp 1 mảng duy nhất + HeaderShift = 3B',
        exec(sim, cfg) {
          cfg.XfrmBufferComputationMode = 'IN_PLACE';
          executeTxForward(sim, cfg);
        }
      },
      {
        title: 'Bước 2: Chuyển sang OUT_OF_PLACE — Phát sinh 2 mảng & memcpy CPU',
        exec(sim, cfg) {
          cfg.XfrmBufferComputationMode = 'OUT_OF_PLACE';
          executeTxForward(sim, cfg);
        }
      },
      {
        title: 'Bước 3: Thử cấp phát thiếu RAM (Allocated=6B < 8B cần thiết)',
        exec(sim, cfg) {
          cfg.XfrmBufferComputationMode = 'IN_PLACE';
          cfg.XfrmAllocatedRteBufferSize = 6;
          executeTxForward(sim, cfg);
        }
      },
      {
        title: 'Bước 4: Khôi phục RAM=64B & chuyển SomeIpXf + P04 (HeaderShift = 12B)',
        exec(sim, cfg) {
          cfg.XfrmAllocatedRteBufferSize = 64;
          cfg.ActiveTransformerChainPreset = 'SOMEIPXF_E2E_P04';
          cfg.E2EXfActiveProfile = 'PROFILE_04';
          executeTxForward(sim, cfg);
        }
      }
    ],
    whatIfs: [
      {
        label: '1️⃣ Bấm gạt IN_PLACE <-> OUT_OF_PLACE tức thì',
        run(sim, cfg) {
          cfg.XfrmAllocatedRteBufferSize = 64;
          cfg.XfrmBufferComputationMode = cfg.XfrmBufferComputationMode === 'IN_PLACE' ? 'OUT_OF_PLACE' : 'IN_PLACE';
          executeTxForward(sim, cfg);
        }
      },
      {
        label: '2️⃣ Giảm XfrmAllocatedRteBufferSize xuống 6B để test tràn đệm',
        run(sim, cfg) {
          cfg.XfrmAllocatedRteBufferSize = 6;
          executeTxForward(sim, cfg);
        }
      },
      {
        label: '3️⃣ Đổi sang SomeIpXf + Profile 04 IN_PLACE (HeaderShift = 12B)',
        run(sim, cfg) {
          cfg.XfrmAllocatedRteBufferSize = 64;
          cfg.XfrmBufferComputationMode = 'IN_PLACE';
          cfg.ActiveTransformerChainPreset = 'SOMEIPXF_E2E_P04';
          cfg.E2EXfActiveProfile = 'PROFILE_04';
          executeTxForward(sim, cfg);
        }
      }
    ]
  },

  // -------------------- GROUP 2: SomeIpXf (#174) + E2EXf (#176) ON ETHERNET / LdCom --------------------
  {
    id: 'S4',
    group: 'Nhóm 2: SomeIpXf (#174) + E2EXf (#176)',
    title: 'S4. Tuần Tự Hóa Struct & Mảng Động (Dynamic Radar Array) Với SomeIpXf + LdCom',
    summary: 'Minh họa 8-byte SOME/IP Header, Alignment Padding, LengthField 4B cho RadarObj[N] co giãn động và truyền qua LdCom_Transmit().',
    setup(cfg) {
      Object.assign(cfg, defaultConfig, {
        ActiveTransformerChainPreset: 'SOMEIPXF_ONLY',
        E2EXfActiveProfile: 'NONE',
        SomeIpXfMessageType: 'NOTIFICATION_0x02',
        SomeIpXfStructAlignmentBytes: '4',
        SomeIpXfLengthFieldSize: '4',
        SomeIpXfDynamicArrayElementCount: 2,
        SomeIpXfEnableTlvEncoding: false,
        XfrmAllocatedRteBufferSize: 128
      });
    },
    steps: [
      {
        title: 'Bước 1: SWC_ADAS cập nhật RadarObjList_t (N = 2 vật thể)',
        exec(sim, cfg) {
          executeTxForward(sim, cfg);
        }
      },
      {
        title: 'Bước 2: Tăng động N = 4 phần tử — LengthField & Payload tự co giãn',
        exec(sim, cfg) {
          cfg.SomeIpXfDynamicArrayElementCount = 4;
          executeTxForward(sim, cfg);
        }
      },
      {
        title: 'Bước 3: Đẩy qua LdCom_Transmit() xuống PduR ➔ SoAd (thêm 8B ServiceID/MethodID)',
        exec(sim, cfg) {
          advanceClock(sim, 3);
          addTrace(sim, 'BusIf', 56, `SoAd_IfTransmit(0x1234:0x0001)`, `Gắn 8B đầu + ${sim.bufferBytes.length}B SomeIpXf = ${sim.bufferBytes.length + 8}B`, 'E_OK', 'ok', '16B SOME/IP Header hoàn chỉnh trên dây Ethernet');
          sim.activeSvgModules = ['SomeIpXf', 'LdCom', 'BusIf'];
          sim.activeSvgPaths = ['path_SomeIpXf_LdCom', 'path_LdCom_BusIf'];
          syncRegistersFromState(sim, cfg);
        }
      },
      {
        title: 'Bước 4: Rx SomeIpXf_Inv() khôi phục mảng động tại ECU nhận',
        exec(sim, cfg) {
          executeRxInverse(sim, cfg);
        }
      }
    ],
    whatIfs: [
      {
        label: '1️⃣ Tăng DynamicArrayElementCount từ 2 lên 5 phần tử',
        run(sim, cfg) {
          cfg.SomeIpXfDynamicArrayElementCount = 5;
          executeTxForward(sim, cfg);
        }
      },
      {
        label: '2️⃣ Đổi LengthFieldSize = 2B & StructAlignment = 4B (xem AlignPad)',
        run(sim, cfg) {
          cfg.SomeIpXfLengthFieldSize = '2';
          cfg.SomeIpXfStructAlignmentBytes = '4';
          executeTxForward(sim, cfg);
        }
      },
      {
        label: '3️⃣ Chạy Rx SomeIpXf_Inv() khôi phục mảng động',
        run(sim, cfg) {
          executeRxInverse(sim, cfg);
        }
      }
    ]
  },

  {
    id: 'S5',
    group: 'Nhóm 2: SomeIpXf (#174) + E2EXf (#176)',
    title: 'S5. Mã Hóa Mở Rộng TLV (WireType + DataId) & Tương Thích V1 ↔ V2 OTA',
    summary: 'Phía phát V2 chèn thêm Tag 0x0003. Nhờ bit WireType trong Tag 16-bit, SomeIpXf_Inv bản V1 nhảy qua an toàn mà không làm lệch struct!',
    setup(cfg) {
      Object.assign(cfg, defaultConfig, {
        ActiveTransformerChainPreset: 'SOMEIPXF_ONLY',
        E2EXfActiveProfile: 'NONE',
        SomeIpXfEnableTlvEncoding: true,
        SomeIpXfTlvWireType: '1_16BIT_BASE',
        SomeIpXfUnrecognizedTlvBehavior: 'IGNORE_SKIP_UNKNOWN_TAG',
        XfrmAllocatedRteBufferSize: 128
      });
    },
    steps: [
      {
        title: 'Bước 1 (Tx V2): SomeIpXf gắn Tag [WireType|DataId] cho 0x0001, 0x0002 & 0x0003',
        exec(sim, cfg) {
          executeTxForward(sim, cfg);
        }
      },
      {
        title: 'Bước 2 (Rx V1): Bỏ qua an toàn Tag lạ 0x0003 nhờ đọc WireType',
        exec(sim, cfg) {
          cfg.SomeIpXfUnrecognizedTlvBehavior = 'IGNORE_SKIP_UNKNOWN_TAG';
          executeRxInverse(sim, cfg);
        }
      },
      {
        title: 'Bước 3: Đổi sang WireType = 6 (Complex + 4B LengthField) cho Tag V2',
        exec(sim, cfg) {
          cfg.SomeIpXfTlvWireType = '6_LEN_4B';
          executeTxForward(sim, cfg);
          executeRxInverse(sim, cfg);
        }
      },
      {
        title: 'Bước 4: Cấu hình REPORT_MALFORMED_HARD_ERR -> Từ chối Tag lạ (0x89)',
        exec(sim, cfg) {
          cfg.SomeIpXfUnrecognizedTlvBehavior = 'REPORT_MALFORMED_HARD_ERR';
          executeRxInverse(sim, cfg);
        }
      }
    ],
    whatIfs: [
      {
        label: '1️⃣ Bật/Tắt SomeIpXfEnableTlvEncoding (xem Tag tím xuất hiện/biến mất)',
        run(sim, cfg) {
          cfg.SomeIpXfEnableTlvEncoding = !cfg.SomeIpXfEnableTlvEncoding;
          executeTxForward(sim, cfg);
        }
      },
      {
        label: '2️⃣ Đổi UnrecognizedTlvBehavior -> REPORT_MALFORMED_HARD_ERR (0x89)',
        run(sim, cfg) {
          cfg.SomeIpXfEnableTlvEncoding = true;
          cfg.SomeIpXfUnrecognizedTlvBehavior = 'REPORT_MALFORMED_HARD_ERR';
          executeTxForward(sim, cfg);
          executeRxInverse(sim, cfg);
        }
      },
      {
        label: '3️⃣ Đổi SomeIpXfTlvWireType -> 6_LEN_4B (Kèm LengthField 32-bit)',
        run(sim, cfg) {
          cfg.SomeIpXfEnableTlvEncoding = true;
          cfg.SomeIpXfTlvWireType = '6_LEN_4B';
          executeTxForward(sim, cfg);
        }
      }
    ]
  },

  {
    id: 'S6',
    group: 'Nhóm 2: SomeIpXf (#174) + E2EXf (#176)',
    title: 'S6. Chuỗi Bảo Vệ Gói Tin Lớn SomeIpXf ➔ E2EXf (Profile 04 / Profile 07)',
    summary: 'Kết hợp SOME/IP Ethernet + ISO 26262 E2E Profile 04 (12B Header, CRC-32P4) hoặc Profile 07 (20B Header, CRC-64) dùng In-Place HeaderShift.',
    setup(cfg) {
      Object.assign(cfg, defaultConfig, {
        ActiveTransformerChainPreset: 'SOMEIPXF_E2E_P04',
        E2EXfActiveProfile: 'PROFILE_04',
        XfrmBufferComputationMode: 'IN_PLACE',
        SomeIpXfDynamicArrayElementCount: 2,
        XfrmAllocatedRteBufferSize: 128
      });
    },
    steps: [
      {
        title: 'Bước 1 (Tx P04): SomeIpXf viết tại &buf[12] (HeaderShift = 12B)',
        exec(sim, cfg) {
          executeTxForward(sim, cfg);
        }
      },
      {
        title: 'Bước 2 (Tx P04 -> P07): Nâng cấp Profile 07 (20B Header, CRC-64-ECMA)',
        exec(sim, cfg) {
          cfg.ActiveTransformerChainPreset = 'SOMEIPXF_E2E_P07';
          cfg.E2EXfActiveProfile = 'PROFILE_07';
          executeTxForward(sim, cfg);
        }
      },
      {
        title: 'Bước 3 (Rx): E2EXf_Inv xác thực CRC-64 trước ➔ SomeIpXf_Inv giải mã sau',
        exec(sim, cfg) {
          executeRxInverse(sim, cfg);
        }
      },
      {
        title: 'Bước 4: Bơm cắt ngắn gói tin -> E2EXf_Inv chặn trước khi chạm SomeIpXf_Inv',
        exec(sim, cfg) {
          cfg.InjectTruncatedBufferBytes = true;
          cfg.E2EXfMaxErrorStateValid = 0;
          executeTxForward(sim, cfg);
          executeRxInverse(sim, cfg);
        }
      }
    ],
    whatIfs: [
      {
        label: '1️⃣ Chuyển đổi Profile 04 (12B, CRC-32) <-> Profile 07 (20B, CRC-64)',
        run(sim, cfg) {
          cfg.InjectTruncatedBufferBytes = false;
          if (cfg.E2EXfActiveProfile === 'PROFILE_04') {
            cfg.E2EXfActiveProfile = 'PROFILE_07';
            cfg.ActiveTransformerChainPreset = 'SOMEIPXF_E2E_P07';
          } else {
            cfg.E2EXfActiveProfile = 'PROFILE_04';
            cfg.ActiveTransformerChainPreset = 'SOMEIPXF_E2E_P04';
          }
          executeTxForward(sim, cfg);
        }
      },
      {
        label: '2️⃣ Bơm lỗi cắt ngắn InjectTruncatedBufferBytes = TRUE',
        run(sim, cfg) {
          cfg.InjectTruncatedBufferBytes = true;
          cfg.E2EXfMaxErrorStateValid = 0;
          executeTxForward(sim, cfg);
          executeRxInverse(sim, cfg);
        }
      },
      {
        label: '3️⃣ Tăng DynamicArrayElementCount lên 6 (xem E2E Length tự cập nhật)',
        run(sim, cfg) {
          cfg.InjectTruncatedBufferBytes = false;
          cfg.SomeIpXfDynamicArrayElementCount = 6;
          executeTxForward(sim, cfg);
        }
      }
    ]
  },

  // -------------------- GROUP 3: CLIENT-SERVER RPC & ExtractProtocolHeaderFields --------------------
  {
    id: 'S7',
    group: 'Nhóm 3: Client-Server RPC & ExtractHeader',
    title: 'S7. Client-Server RPC Qua SomeIpXf: Rte_Call ➔ REQUEST (0x00) ➔ RESPONSE (0x80) ➔ Rte_Result',
    summary: 'Theo dõi trọn vẹn Rte_Cs_TransactionHandleType {clientId=0x0001, sequenceCounter=0x0007} khớp cặp Request và Response qua LdCom.',
    setup(cfg) {
      Object.assign(cfg, defaultConfig, {
        ActiveTransformerChainPreset: 'SOMEIPXF_ONLY',
        E2EXfActiveProfile: 'NONE',
        SomeIpXfClientAndSessionIdHex: '0x0001:0x0007',
        SomeIpXfMessageType: 'REQUEST_0x00',
        SomeIpXfDynamicArrayElementCount: 1,
        XfrmAllocatedRteBufferSize: 128
      });
    },
    steps: [
      {
        title: 'Bước 1 (Client Tx): Rte_Call() gắn MessageType = REQUEST (0x00) & SessionId = 0x0007',
        exec(sim, cfg) {
          cfg.SomeIpXfMessageType = 'REQUEST_0x00';
          sim.rpcStepPhase = 'REQ_TX';
          executeTxForward(sim, cfg);
        }
      },
      {
        title: 'Bước 2 (Server Rx): Server nhận Request, tách TransactionHandle & chạy Server Runnable',
        exec(sim, cfg) {
          sim.rpcStepPhase = 'SERVER_EXEC';
          executeRxInverse(sim, cfg);
        }
      },
      {
        title: 'Bước 3 (Server Tx): Server trả gói RESPONSE (0x80) giữ nguyên ClientId:SessionId 0x0001:0x0007',
        exec(sim, cfg) {
          cfg.SomeIpXfMessageType = 'RESPONSE_0x80';
          sim.rpcStepPhase = 'RESP_TX';
          executeTxForward(sim, cfg);
        }
      },
      {
        title: 'Bước 4 (Client Rx): Đối khớp đúng SessionId 0x0007 -> Trả kết quả cho Rte_Result()',
        exec(sim, cfg) {
          sim.rpcStepPhase = 'CLIENT_RX';
          executeRxInverse(sim, cfg);
        }
      }
    ],
    whatIfs: [
      {
        label: '1️⃣ Đổi ClientId:SessionId sang 0x0002:0x000A',
        run(sim, cfg) {
          cfg.SomeIpXfClientAndSessionIdHex = '0x0002:0x000A';
          executeTxForward(sim, cfg);
        }
      },
      {
        label: '2️⃣ Bọc thêm E2EXf Profile 04 cho giao dịch RPC đạt ASIL',
        run(sim, cfg) {
          cfg.ActiveTransformerChainPreset = 'SOMEIPXF_E2E_P04';
          cfg.E2EXfActiveProfile = 'PROFILE_04';
          executeTxForward(sim, cfg);
        }
      },
      {
        label: '3️⃣ Đổi sang REQUEST_NO_RETURN (0x01) (Fire & Forget RPC)',
        run(sim, cfg) {
          cfg.SomeIpXfMessageType = 'REQUEST_NO_RETURN_0x01';
          executeTxForward(sim, cfg);
        }
      }
    ]
  },

  {
    id: 'S8',
    group: 'Nhóm 3: Client-Server RPC & ExtractHeader',
    title: 'S8. Cơ Chế Bóc Tách Header Nhanh SomeIpXf_ExtractProtocolHeaderFields() (SWS_SomeIpXf_00171)',
    summary: 'RTE gọi SomeIpXf_ExtractProtocolHeaderFields() đọc trước MessageType & ReturnCode tại Byte 6..7 để phân luồng REQUEST / RESPONSE / ERROR.',
    setup(cfg) {
      Object.assign(cfg, defaultConfig, {
        ActiveTransformerChainPreset: 'SOMEIPXF_ONLY',
        E2EXfActiveProfile: 'NONE',
        SomeIpXfMessageType: 'RESPONSE_0x80',
        XfrmAllocatedRteBufferSize: 128
      });
    },
    steps: [
      {
        title: 'Bước 1: Chuẩn bị luồng byte RESPONSE (0x80) trên bus LdCom',
        exec(sim, cfg) {
          cfg.SomeIpXfMessageType = 'RESPONSE_0x80';
          executeTxForward(sim, cfg);
        }
      },
      {
        title: 'Bước 2: RTE gọi SomeIpXf_ExtractProtocolHeaderFields() phát hiện RESPONSE (0x80)',
        exec(sim, cfg) {
          executeExtractProtocolHeader(sim, cfg);
        }
      },
      {
        title: 'Bước 3: Đổi gói nhận thành ERROR (0x81) -> ExtractHeader chỉ hướng bỏ qua OUT params',
        exec(sim, cfg) {
          cfg.SomeIpXfMessageType = 'ERROR_0x81';
          sim.serverAppErrCode = 0x01;
          executeTxForward(sim, cfg);
          executeExtractProtocolHeader(sim, cfg);
        }
      },
      {
        title: 'Bước 4: Gửi gói ngắn < 8B -> ExtractHeader trả ngay E_SER_MALFORMED_MESSAGE (0x89)',
        exec(sim, cfg) {
          cfg.InjectTruncatedBufferBytes = true;
          executeExtractProtocolHeader(sim, cfg);
        }
      }
    ],
    whatIfs: [
      {
        label: '1️⃣ Chạy ExtractProtocolHeaderFields() với REQUEST (0x00)',
        run(sim, cfg) {
          cfg.InjectTruncatedBufferBytes = false;
          cfg.InjectSomeIpHeaderFault = 'NONE';
          cfg.SomeIpXfMessageType = 'REQUEST_0x00';
          executeTxForward(sim, cfg);
          executeExtractProtocolHeader(sim, cfg);
        }
      },
      {
        label: '2️⃣ Thử truyền gói cắt cụt (< 8B) vào ExtractProtocolHeaderFields()',
        run(sim, cfg) {
          cfg.InjectTruncatedBufferBytes = true;
          executeExtractProtocolHeader(sim, cfg);
        }
      },
      {
        label: '3️⃣ Thử sai ProtocolVersion (0x87) ngay bước ExtractHeader',
        run(sim, cfg) {
          cfg.InjectTruncatedBufferBytes = false;
          cfg.InjectSomeIpHeaderFault = 'WRONG_PROTOCOL_VER';
          executeExtractProtocolHeader(sim, cfg);
        }
      }
    ]
  },

  {
    id: 'S9',
    group: 'Nhóm 3: Client-Server RPC & ExtractHeader',
    title: 'S9. Lỗi Nghiệp Vụ Server (Application Error 0x81) vs Lỗi Hạ Tầng Transformer (0x88)',
    summary: 'Khi Server Runnable trả lỗi nghiệp vụ != E_OK, SomeIpXf tạo gói MessageType = ERROR (0x81) không chứa OUT params và RTE giao nguyên mã lỗi về SWC.',
    setup(cfg) {
      Object.assign(cfg, defaultConfig, {
        ActiveTransformerChainPreset: 'SOMEIPXF_ONLY',
        E2EXfActiveProfile: 'NONE',
        SomeIpXfMessageType: 'ERROR_0x81',
        XfrmAllocatedRteBufferSize: 128
      });
    },
    steps: [
      {
        title: 'Bước 1 (Server): Server Runnable trả lỗi nghiệp vụ E_PLANNER_NO_ROUTE = 0x01',
        exec(sim, cfg) {
          cfg.SomeIpXfMessageType = 'ERROR_0x81';
          sim.serverAppErrCode = 0x01;
          executeTxForward(sim, cfg);
        }
      },
      {
        title: 'Bước 2 (Client): ExtractHeader phát hiện MsgType=0x81 -> Bỏ giải mã OUT, trả AppError 0x01',
        exec(sim, cfg) {
          executeExtractProtocolHeader(sim, cfg);
          executeRxInverse(sim, cfg);
        }
      },
      {
        title: 'Bước 3: Kết hợp E2EXf Profile 04 hợp lệ (E2E OK 0x00, nhưng vẫn trả AppError 0x01)',
        exec(sim, cfg) {
          cfg.ActiveTransformerChainPreset = 'SOMEIPXF_E2E_P04';
          cfg.E2EXfActiveProfile = 'PROFILE_04';
          executeTxForward(sim, cfg);
          executeRxInverse(sim, cfg);
        }
      },
      {
        title: 'Bước 4: So sánh khi sai CRC trên gói Error -> Transformer chặn thành Hard Error 0x88',
        exec(sim, cfg) {
          cfg.InjectE2ECrcCorruption = true;
          cfg.E2EXfMaxErrorStateValid = 0;
          executeTxForward(sim, cfg);
          executeRxInverse(sim, cfg);
        }
      }
    ],
    whatIfs: [
      {
        label: '1️⃣ Đổi phản hồi Server: ERROR (0x81) <-> RESPONSE E_OK (0x80)',
        run(sim, cfg) {
          cfg.InjectE2ECrcCorruption = false;
          cfg.SomeIpXfMessageType = cfg.SomeIpXfMessageType === 'ERROR_0x81' ? 'RESPONSE_0x80' : 'ERROR_0x81';
          executeTxForward(sim, cfg);
          executeRxInverse(sim, cfg);
        }
      },
      {
        label: '2️⃣ Bọc E2EXf Profile 04 quanh gói ERROR (0x81)',
        run(sim, cfg) {
          cfg.InjectE2ECrcCorruption = false;
          cfg.SomeIpXfMessageType = 'ERROR_0x81';
          cfg.ActiveTransformerChainPreset = 'SOMEIPXF_E2E_P04';
          cfg.E2EXfActiveProfile = 'PROFILE_04';
          executeTxForward(sim, cfg);
          executeRxInverse(sim, cfg);
        }
      },
      {
        label: '3️⃣ Bơm lỗi CRC -> Chứng minh hạ tầng Transformer lấn át thành 0x88',
        run(sim, cfg) {
          cfg.ActiveTransformerChainPreset = 'SOMEIPXF_E2E_P04';
          cfg.E2EXfActiveProfile = 'PROFILE_04';
          cfg.InjectE2ECrcCorruption = true;
          cfg.E2EXfMaxErrorStateValid = 0;
          executeTxForward(sim, cfg);
          executeRxInverse(sim, cfg);
        }
      }
    ]
  },

  // -------------------- GROUP 4: FAULT INJECTION & DET --------------------
  {
    id: 'S10',
    group: 'Nhóm 4: Bơm Lỗi E2E, SomeIpXf & DET',
    title: 'S10. Giải Phẫu 2-Nibble E2EXf_Inv: REPEATED (0x10) & WRONGSEQUENCE (0x20) ➔ Soft (0x8A) vs SM_INVALID (0x88)',
    summary: 'Quan sát trực tiếp quá trình E2E_SMCheck() dung nạp 1 lỗi thành Soft Error (0x8A, Bit 7=0) rồi sập thành E2E_SM_INVALID (0xA3, Bit 7=1 -> 0x88) ở lỗi thứ 2!',
    setup(cfg) {
      Object.assign(cfg, defaultConfig, {
        ActiveTransformerChainPreset: 'COMXF_E2E_P05',
        E2EXfActiveProfile: 'PROFILE_05',
        E2EXfMaxDeltaCounter: 1,
        E2EXfMinOkStateValid: 2,
        E2EXfMaxErrorStateValid: 1,
        RteForwardSoftErrorToSwc: true,
        InjectE2ECounterFaultMode: 'NORMAL_INC_PLUS_1'
      });
    },
    steps: [
      {
        title: 'Bước 1: Truyền & nhận khung tốt (E2E_P_OK + E2E_SM_VALID ➔ 2-Nibble 0x00)',
        exec(sim, cfg) {
          cfg.InjectE2ECounterFaultMode = 'NORMAL_INC_PLUS_1';
          executeTxForward(sim, cfg);
          executeRxInverse(sim, cfg);
        }
      },
      {
        title: 'Bước 2: Nhảy Counter +5 LẦN 1 -> E2EXf trả 0x20 (WRONGSEQ | VALID) -> Soft Error 0x8A!',
        exec(sim, cfg) {
          cfg.InjectE2ECounterFaultMode = 'JUMP_SEQ_PLUS_5';
          executeTxForward(sim, cfg);
          executeRxInverse(sim, cfg);
        }
      },
      {
        title: 'Bước 3: Nhảy Counter +5 LẦN 2 (ErrCount 2 > MaxError 1) -> Sập SM_INVALID (0xA3 -> Abort 0x88!)',
        exec(sim, cfg) {
          cfg.InjectE2ECounterFaultMode = 'JUMP_SEQ_PLUS_5';
          executeTxForward(sim, cfg);
          executeRxInverse(sim, cfg);
        }
      },
      {
        title: 'Bước 4: Khôi phục gửi các khung chuẩn liên tiếp để hồi phục về E2E_SM_VALID',
        exec(sim, cfg) {
          cfg.InjectE2ECounterFaultMode = 'NORMAL_INC_PLUS_1';
          executeTxForward(sim, cfg);
          executeRxInverse(sim, cfg);
          executeTxForward(sim, cfg);
          executeRxInverse(sim, cfg);
        }
      }
    ],
    whatIfs: [
      {
        label: '1️⃣ Bơm tiếp JUMP_SEQ_PLUS_5 (Rx Inv để đẩy SMCheck quá ngưỡng)',
        run(sim, cfg) {
          cfg.InjectE2ECounterFaultMode = 'JUMP_SEQ_PLUS_5';
          executeTxForward(sim, cfg);
          executeRxInverse(sim, cfg);
        }
      },
      {
        label: '2️⃣ Chuyển mode sang REPEATED_DELTA_0 (Bit 4 E2E_REP_ERR = 1, 0x10)',
        run(sim, cfg) {
          cfg.InjectE2ECounterFaultMode = 'REPEATED_DELTA_0';
          executeTxForward(sim, cfg);
          executeRxInverse(sim, cfg);
        }
      },
      {
        label: '3️⃣ Khôi phục NORMAL_INC_PLUS_1 & chạy 2 khung tốt để hồi phục VALID',
        run(sim, cfg) {
          cfg.InjectE2ECounterFaultMode = 'NORMAL_INC_PLUS_1';
          executeTxForward(sim, cfg);
          executeRxInverse(sim, cfg);
          executeTxForward(sim, cfg);
          executeRxInverse(sim, cfg);
        }
      }
    ]
  },

  {
    id: 'S11',
    group: 'Nhóm 4: Bơm Lỗi E2E, SomeIpXf & DET',
    title: 'S11. Bơm Lỗi CRC (E2E_P_ERROR = 0x30) & Lỗi SomeIpXf Header (0x87 / 0x88 / 0x89 Abort)',
    summary: 'Kiểm thử nhánh Abort Chain khi CRC bị hỏng, hoặc khi SomeIpXf phát hiện Wrong Protocol/Interface Version (0x87/0x88) hoặc Malformed Message (0x89).',
    setup(cfg) {
      Object.assign(cfg, defaultConfig, {
        ActiveTransformerChainPreset: 'SOMEIPXF_E2E_P04',
        E2EXfActiveProfile: 'PROFILE_04',
        E2EXfMaxErrorStateValid: 0,
        XfrmAllocatedRteBufferSize: 128
      });
    },
    steps: [
      {
        title: 'Bước 1 (Nhánh A): Đảo bit CRC -> E2EXf_Inv báo 0xB3 (Bit 7=1) & NGẮT CHUỖI!',
        exec(sim, cfg) {
          cfg.InjectE2ECrcCorruption = true;
          executeTxForward(sim, cfg);
          executeRxInverse(sim, cfg);
        }
      },
      {
        title: 'Bước 2 (Nhánh B1): Tắt lỗi CRC, bơm WRONG_PROTOCOL_VER -> 0x87 Hard Error',
        exec(sim, cfg) {
          cfg.InjectE2ECrcCorruption = false;
          cfg.InjectSomeIpHeaderFault = 'WRONG_PROTOCOL_VER';
          executeTxForward(sim, cfg);
          executeRxInverse(sim, cfg);
        }
      },
      {
        title: 'Bước 3 (Nhánh B2): Bơm WRONG_INTERFACE_VER -> E_SER_WRONG_INTERFACE_VERSION (0x88)',
        exec(sim, cfg) {
          cfg.InjectSomeIpHeaderFault = 'WRONG_INTERFACE_VER';
          executeRxInverse(sim, cfg);
        }
      },
      {
        title: 'Bước 4 (Nhánh B3): Cắt ngắn Buffer -> 0x89 MALFORMED + DET Runtime Error 0x05',
        exec(sim, cfg) {
          cfg.InjectSomeIpHeaderFault = 'NONE';
          cfg.E2EXfActiveProfile = 'NONE';
          cfg.ActiveTransformerChainPreset = 'SOMEIPXF_ONLY';
          cfg.InjectTruncatedBufferBytes = true;
          executeTxForward(sim, cfg);
          executeRxInverse(sim, cfg);
        }
      }
    ],
    whatIfs: [
      {
        label: '1️⃣ Bơm lại lỗi CRC E2E_P_ERROR (hoặc click trực tiếp vào ô Byte bất kỳ)',
        run(sim, cfg) {
          cfg.InjectTruncatedBufferBytes = false;
          cfg.InjectSomeIpHeaderFault = 'NONE';
          cfg.ActiveTransformerChainPreset = 'SOMEIPXF_E2E_P04';
          cfg.E2EXfActiveProfile = 'PROFILE_04';
          cfg.E2EXfMaxErrorStateValid = 0;
          cfg.InjectE2ECrcCorruption = true;
          executeTxForward(sim, cfg);
          executeRxInverse(sim, cfg);
        }
      },
      {
        label: '2️⃣ Bơm lỗi WRONG_PROTOCOL_VER (0x87)',
        run(sim, cfg) {
          cfg.InjectE2ECrcCorruption = false;
          cfg.InjectTruncatedBufferBytes = false;
          cfg.InjectSomeIpHeaderFault = 'WRONG_PROTOCOL_VER';
          executeTxForward(sim, cfg);
          executeRxInverse(sim, cfg);
        }
      },
      {
        label: '3️⃣ Bơm lỗi cắt ngắn InjectTruncatedBufferBytes -> 0x89 & DET 0x05',
        run(sim, cfg) {
          cfg.InjectE2ECrcCorruption = false;
          cfg.InjectSomeIpHeaderFault = 'NONE';
          cfg.E2EXfActiveProfile = 'NONE';
          cfg.ActiveTransformerChainPreset = 'SOMEIPXF_ONLY';
          cfg.InjectTruncatedBufferBytes = true;
          executeTxForward(sim, cfg);
          executeRxInverse(sim, cfg);
        }
      }
    ]
  },

  {
    id: 'S12',
    group: 'Nhóm 4: Bơm Lỗi E2E, SomeIpXf & DET',
    title: 'S12. Kiểm Thử Toàn Diện Hàng Rào Lỗi DET (Dev & Runtime Errors) & GetVersionInfo()',
    summary: 'Kiểm chứng XFRM_E_UNINIT (0x01), XFRM_E_PARAM_POINTER (0x04), Runtime Error XFRM_E_MALFORMED_MESSAGE (0x05) ngay cả khi tắt DevErrorDetect, và GetVersionInfo().',
    setup(cfg) {
      Object.assign(cfg, defaultConfig, {
        XfrmDevErrorDetect: true,
        XfrmInitializedState: true,
        ActiveTransformerChainPreset: 'SOMEIPXF_E2E_P04',
        E2EXfActiveProfile: 'PROFILE_04'
      });
    },
    steps: [
      {
        title: 'Bước 1: XfrmInitializedState = FALSE ➔ Kích Det_ReportError(XFRM_E_UNINIT = 0x01)',
        exec(sim, cfg) {
          cfg.XfrmInitializedState = false;
          executeTxForward(sim, cfg);
        }
      },
      {
        title: 'Bước 2: Truyền NULL_PTR ➔ Kích Det_ReportError(XFRM_E_PARAM_POINTER = 0x04)',
        exec(sim, cfg) {
          cfg.XfrmInitializedState = true;
          cfg.PassNullPtrOrUninitForDetTest = true;
          executeTxForward(sim, cfg);
        }
      },
      {
        title: 'Bước 3: Tắt XfrmDevErrorDetect = FALSE (Production) + Truncate -> Det_ReportRuntimeError(0x05) vẫn chạy!',
        exec(sim, cfg) {
          cfg.PassNullPtrOrUninitForDetTest = false;
          cfg.XfrmDevErrorDetect = false;
          cfg.ActiveTransformerChainPreset = 'SOMEIPXF_ONLY';
          cfg.E2EXfActiveProfile = 'NONE';
          cfg.InjectTruncatedBufferBytes = true;
          executeTxForward(sim, cfg);
          executeRxInverse(sim, cfg);
        }
      },
      {
        title: 'Bước 4: Gọi <Mip>_GetVersionInfo() cho cả 3 module 174, 175, 176',
        exec(sim, cfg) {
          cfg.InjectTruncatedBufferBytes = false;
          cfg.XfrmDevErrorDetect = true;
          api_callGetVersionInfo();
        }
      }
    ],
    whatIfs: [
      {
        label: '1️⃣ Tắt XfrmInitializedState & chạy Tx -> Bắn DET 0x01 UNINIT',
        run(sim, cfg) {
          cfg.PassNullPtrOrUninitForDetTest = false;
          cfg.XfrmInitializedState = false;
          executeTxForward(sim, cfg);
        }
      },
      {
        label: '2️⃣ Bật PassNullPtrOrUninitForDetTest -> Bắn DET 0x04 PARAM_POINTER',
        run(sim, cfg) {
          cfg.XfrmInitializedState = true;
          cfg.PassNullPtrOrUninitForDetTest = true;
          executeTxForward(sim, cfg);
        }
      },
      {
        label: '3️⃣ Tắt XfrmDevErrorDetect & Cắt gói -> Chứng minh Runtime Error 0x05 vẫn chạy',
        run(sim, cfg) {
          cfg.XfrmDevErrorDetect = false;
          cfg.PassNullPtrOrUninitForDetTest = false;
          cfg.XfrmInitializedState = true;
          cfg.ActiveTransformerChainPreset = 'SOMEIPXF_ONLY';
          cfg.E2EXfActiveProfile = 'NONE';
          cfg.InjectTruncatedBufferBytes = true;
          executeTxForward(sim, cfg);
          executeRxInverse(sim, cfg);
        }
      }
    ]
  }
];
