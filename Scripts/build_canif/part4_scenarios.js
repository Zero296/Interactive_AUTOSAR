// ================= PART 4B: 12 PRE-BUILT SCENARIOS (S1-S12) & 36 WHAT-IF ACTIONS =================

const SCENARIOS = [
  {
    id: "S1",
    group: "Nhóm 1: Truyền L-PDU, FullCAN vs BasicCAN & CanIfTxBuffer",
    title: "S1: Truyền Chuẩn Qua FullCAN & BasicCAN HTH (SWC → Com → PduR → CanIf → CanDrv)",
    summary: "Mô tả đường đi trọn vẹn của một L-PDU từ tín hiệu ứng dụng SWC qua RTE → COM/PduR → CanIf_Transmit() → ánh xạ FullCAN HTH_0 / BasicCAN HTH_1 → Can_Write() và kết thúc bằng ngắt CanIf_TxConfirmation().",
    setup() {
      cfg.SelectedTxPduId = "1";
      cfg.CanIfTxPduCanIdType = "STANDARD_CAN";
      cfg.CanIfHthHandleType = "BASIC";
      cfg.SimulateHthMailboxBusy = false;
      cfg.ActiveControllerMode = "CAN_CS_STARTED";
      cfg.ActivePduMode = "CANIF_ONLINE";
      cfg.CanIfPnFilterEnabled = false;
    },
    steps: [
      {
        title: "Bước 1: SWC gọi Rte_Write() → Com/PduR gọi CanIf_Transmit(TxPdu_1)",
        exec() {
          cfg.SelectedTxPduId = "1";
          cfg.CanIfHthHandleType = "BASIC";
          cfg.CanIfTxPduCanIdType = "STANDARD_CAN";
          api_CanIf_Transmit("1");
        }
      },
      {
        title: "Bước 2: So sánh sang FullCAN HTH_0 cho bản tin CanNm (TxPdu_0, 0x500)",
        exec() {
          cfg.SelectedTxPduId = "0";
          cfg.CanIfHthHandleType = "FULL";
          cfg.CanIfTxPduCanIdType = "STANDARD_CAN";
          api_CanIf_Transmit("0");
        }
      },
      {
        title: "Bước 3: Ngắt phần cứng TxConfirmation(TxPdu_1) báo thành công lên PduR",
        exec() {
          api_CanIf_TxConfirmation("1");
        }
      },
      {
        title: "Bước 4: Ngắt TxConfirmation(TxPdu_0) xác nhận xong FullCAN HTH_0",
        exec() {
          api_CanIf_TxConfirmation("0");
        }
      }
    ],
    whatIfs: [
      {
        label: "⚡ Gửi ngay TxPdu_1 BasicCAN",
        run() { cfg.SelectedTxPduId = "1"; cfg.CanIfHthHandleType = "BASIC"; api_CanIf_Transmit("1"); }
      },
      {
        label: "🎯 Gửi FullCAN HTH_0 (0x500)",
        run() { cfg.SelectedTxPduId = "0"; cfg.CanIfHthHandleType = "FULL"; api_CanIf_Transmit("0"); }
      },
      {
        label: "✅ Phát HW TxConfirmation",
        run() { api_CanIf_TxConfirmation(); }
      }
    ]
  },

  {
    id: "S2",
    group: "Nhóm 1: Truyền L-PDU, FullCAN vs BasicCAN & CanIfTxBuffer",
    title: "S2: Tranh Chấp BasicCAN HTH (CAN_BUSY) → Xếp Hàng Ưu Tiên CanIfTxBuffer & Xả Trong TxConfirm",
    summary: "Chứng minh cơ chế chống đảo ngược ưu tiên nội tại (Inner Priority Inversion): khi HTH_1 bận (CAN_BUSY), bản tin CanTp 0x7E8 đứng chờ, sau đó ComBrake 0x100 đến sau được chèn lên ĐẦU hàng đợi CanIfTxBuffer và xả trước trong TxConfirmation().",
    setup() {
      cfg.SelectedTxPduId = "3";
      cfg.CanIfPublicTxBuffering = true;
      cfg.CanIfTxBufferSize = 4;
      cfg.CanIfHthHandleType = "BASIC";
      cfg.SimulateHthMailboxBusy = false;
    },
    steps: [
      {
        title: "Bước 1: Phát TxPdu_2 (0x120) chiếm giữ Mailbox BasicCAN HTH_1",
        exec() {
          cfg.SelectedTxPduId = "2";
          cfg.CanIfTxPduCanIdType = "STANDARD_FD_CAN";
          api_CanIf_Transmit("2");
        }
      },
      {
        title: "Bước 2: CanTp gửi TxPdu_3 (0x7E8 ưu tiên thấp) gặp CAN_BUSY → Vào CanIfTxBuffer [0x7E8]",
        exec() {
          cfg.SelectedTxPduId = "3";
          cfg.CanIfTxPduCanIdType = "STANDARD_CAN";
          api_CanIf_Transmit("3");
        }
      },
      {
        title: "Bước 3: COM gửi TxPdu_1 (0x100 ưu tiên CAO) → Vượt lên ĐẦU CanIfTxBuffer [0x100, 0x7E8]",
        exec() {
          cfg.SelectedTxPduId = "1";
          cfg.CanIfTxPduCanIdType = "STANDARD_CAN";
          api_CanIf_Transmit("1");
        }
      },
      {
        title: "Bước 4: Ngắt TxConfirmation(2) → CanIf tự động xả 0x100 trước 0x7E8 xuống Can_Write()!",
        exec() {
          api_CanIf_TxConfirmation("2");
        }
      }
    ],
    whatIfs: [
      {
        label: "📦 Bơm thêm vào TxBuffer (Busy)",
        run() { cfg.SimulateHthMailboxBusy = true; api_CanIf_Transmit("3"); api_CanIf_Transmit("1"); }
      },
      {
        label: "🚫 Tắt PublicTxBuffering & thử gửi",
        run() { cfg.CanIfPublicTxBuffering = false; cfg.SimulateHthMailboxBusy = true; api_CanIf_Transmit("1"); }
      },
      {
        label: "🚀 Xả tiếp từ TxConfirmation()",
        run() { cfg.SimulateHthMailboxBusy = false; api_CanIf_TxConfirmation(); }
      }
    ]
  },

  {
    id: "S3",
    group: "Nhóm 1: Truyền L-PDU, FullCAN vs BasicCAN & CanIfTxBuffer",
    title: "S3: Kéo Dữ Liệu Tức Thời CanIf_TriggerTransmit() & Đổi ID Động CanIf_SetDynamicTxId()",
    summary: "Thực hành hai tính năng nâng cao chiều Tx: (1) CanIf_TriggerTransmit kéo dữ liệu tươi mới ngay sát giờ truyền cho TxPdu_5 và (2) CanIf_SetDynamicTxId đổi CAN ID 29-bit nóng trong RAM cho J1939/DoCAN TxPdu_4.",
    setup() {
      cfg.SelectedTxPduId = "5";
      cfg.CanIfTriggerTransmitSupport = true;
      cfg.CanIfSetDynamicTxIdApi = true;
      cfg.CustomDynamicCanIdHex = "0x18FEF100";
    },
    steps: [
      {
        title: "Bước 1: Gửi TxPdu_5 (TriggerTransmit=TRUE) khởi tạo luồng phát",
        exec() {
          cfg.SelectedTxPduId = "5";
          cfg.CanIfTxPduCanIdType = "STANDARD_CAN";
          api_CanIf_Transmit("5");
        }
      },
      {
        title: "Bước 2: CanDrv sát giờ phát gọi CanIf_TriggerTransmit(5) kéo payload mới nhất từ PduR",
        exec() {
          api_CanIf_TriggerTransmit("5");
          api_CanIf_TxConfirmation("5");
        }
      },
      {
        title: "Bước 3: Gọi CanIf_SetDynamicTxId(TxPdu_4, 0x18DAFA10) đổi địa chỉ đích động 29-bit",
        exec() {
          cfg.SelectedTxPduId = "4";
          api_CanIf_SetDynamicTxId(0x18DAFA10);
        }
      },
      {
        title: "Bước 4: Truyền TxPdu_4 với CAN ID 29-bit mới 0x98DAFA10 (Bit 31 EXT=1)",
        exec() {
          cfg.CanIfTxPduCanIdType = "EXTENDED_CAN";
          api_CanIf_Transmit("4");
        }
      }
    ],
    whatIfs: [
      {
        label: "🔄 Gọi TriggerTransmit(TxPdu_5)",
        run() { api_CanIf_TriggerTransmit("5"); }
      },
      {
        label: "🏷️ Đổi Dynamic CAN ID → 0x18FEF233",
        run() { api_CanIf_SetDynamicTxId(0x18FEF233); }
      },
      {
        label: "🔒 Tắt SetDynamicTxIdApi test",
        run() { cfg.CanIfSetDynamicTxIdApi = false; api_CanIf_SetDynamicTxId(0x18FEF999); }
      }
    ]
  },

  {
    id: "S4",
    group: "Nhóm 2: Nhận L-PDU, Lọc Phần Mềm, DLC Check, CAN FD & Multi-UL",
    title: "S4: Luồng Nhận CanIf_RxIndication(): Lọc Phần Mềm BasicCAN HRH & Bắt Lỗi DLC Check (0x32)",
    summary: "Theo dõi cơ chế phòng thủ 2 lớp của CanIf ở chiều nhận: Software Acceptance Filter (loại khung lạ 0x3FF không cấu hình) và DLC Check (bắt khung ngắn 4B < 16B để báo Runtime Error CANIF_E_INVALID_DATA_LENGTH 0x32).",
    setup() {
      cfg.SelectedRxPduProfile = "FRAME_A";
      cfg.CanIfHrhHandleType = "BASIC";
      cfg.CanIfHrhSoftwareFilter = true;
      cfg.CanIfPrivateSoftwareFilterType = "MASK";
      cfg.CanIfPrivateDlcCheck = true;
      cfg.CanIfRxPduDataLength = 16;
      cfg.InjectedRxDlcLength = 32;
    },
    steps: [
      {
        title: "Bước 1: Nhận Frame A (0x120 FD 32B) → Qua SwFilter + Đạt DLC (32 >= 16) → PduR_CanIfRxIndication()",
        exec() {
          cfg.SelectedRxPduProfile = "FRAME_A";
          cfg.CanIfRxPduDataLength = 16;
          cfg.InjectedRxDlcLength = 32;
          api_CanIf_RxIndication("FRAME_A");
        }
      },
      {
        title: "Bước 2: Nhận Frame E (ID lạ 0x3FF) vào BasicCAN HRH_1 → SwFilter (MASK) loại bỏ im lặng",
        exec() {
          cfg.SelectedRxPduProfile = "FRAME_E";
          api_CanIf_RxIndication("FRAME_E");
        }
      },
      {
        title: "Bước 3: Nhận Frame F (0x120 nhưng bị cắt ngắn DLC=4B < 16B) → Báo lỗi 0x32 & chặn!",
        exec() {
          cfg.SelectedRxPduProfile = "FRAME_F";
          cfg.CanIfRxPduDataLength = 16;
          cfg.InjectedRxDlcLength = 4;
          api_CanIf_RxIndication("FRAME_F", { forceDlc: 4 });
        }
      },
      {
        title: "Bước 4: Thử tắt CanIfPrivateDlcCheck & bật IdsM → Quan sát rủi ro bảo mật / IdsM",
        exec() {
          cfg.EnableIdsMSecurityEvents = true;
          cfg.CanIfPrivateDlcCheck = true;
          api_CanIf_RxIndication("FRAME_F", { forceDlc: 4 });
        }
      }
    ],
    whatIfs: [
      {
        label: "📥 Bơm Frame A hợp lệ (32B)",
        run() { cfg.SelectedRxPduProfile = "FRAME_A"; cfg.InjectedRxDlcLength = 32; api_CanIf_RxIndication("FRAME_A", { forceDlc: 32 }); }
      },
      {
        label: "🧹 Bơm Frame E lạ (0x3FF)",
        run() { cfg.SelectedRxPduProfile = "FRAME_E"; api_CanIf_RxIndication("FRAME_E"); }
      },
      {
        label: "🛡 Bơm Frame F lỗi DLC (4B < 16B)",
        run() { cfg.SelectedRxPduProfile = "FRAME_F"; cfg.CanIfPrivateDlcCheck = true; api_CanIf_RxIndication("FRAME_F", { forceDlc: 4 }); }
      }
    ]
  },

  {
    id: "S5",
    group: "Nhóm 2: Nhận L-PDU, Lọc Phần Mềm, DLC Check, CAN FD & Multi-UL",
    title: "S5: Khung CAN FD 64B + BRS (Giải Mã Bit 31 EXT & Bit 30 FD) & CanIfTxPduTruncation",
    summary: "Giải mã cấu trúc 32-bit Can_IdType theo SWS_Can_00416 (Bit 31 Extended Flag, Bit 30 CAN FD Flag) và xử lý khi PduR gửi payload 72B vượt maxLen 64B (cắt ngắn nếu bật CanIfTxPduTruncation hoặc báo 0x33).",
    setup() {
      cfg.SelectedTxPduId = "2";
      cfg.CanIfTxPduCanIdType = "STANDARD_FD_CAN";
      cfg.CanFdBitRateSwitchBrs = true;
      cfg.CanIfTxPduTruncation = true;
    },
    steps: [
      {
        title: "Bước 1: Phát TxPdu_2 (STANDARD_FD_CAN 0x120) → Bit 30 FD=1 ➔ Can_IdType = 0x40000120",
        exec() {
          cfg.SelectedTxPduId = "2";
          cfg.CanIfTxPduCanIdType = "STANDARD_FD_CAN";
          api_CanIf_Transmit("2");
        }
      },
      {
        title: "Bước 2: Bật EXTENDED_FD_CAN (Bit 31=1 & Bit 30=1) cho TxPdu_4 → 0xD8FEF100 (BRS 2Mbps)",
        exec() {
          api_CanIf_TxConfirmation("2");
          cfg.SelectedTxPduId = "4";
          cfg.CanIfTxPduCanIdType = "EXTENDED_FD_CAN";
          api_CanIf_Transmit("4");
        }
      },
      {
        title: "Bước 3: Gửi quá 64B (force 72B) khi CanIfTxPduTruncation=TRUE → Báo 0x33 & cắt về 64B phát tiếp",
        exec() {
          api_CanIf_TxConfirmation("4");
          cfg.SelectedTxPduId = "2";
          cfg.CanIfTxPduCanIdType = "STANDARD_FD_CAN";
          cfg.CanIfTxPduTruncation = true;
          api_CanIf_Transmit("2", { forceLen: 72 });
        }
      },
      {
        title: "Bước 4: Tắt CanIfTxPduTruncation=FALSE & gửi quá 64B → Báo 0x33 và trả về E_NOT_OK",
        exec() {
          api_CanIf_TxConfirmation("2");
          cfg.CanIfTxPduTruncation = false;
          api_CanIf_Transmit("2", { forceLen: 72 });
        }
      }
    ],
    whatIfs: [
      {
        label: "🏎 Bật Extended FD (Bit31+Bit30)",
        run() { cfg.SelectedTxPduId = "4"; cfg.CanIfTxPduCanIdType = "EXTENDED_FD_CAN"; api_CanIf_Transmit("4"); }
      },
      {
        label: "✂ Bơm 72B test Truncation=ON",
        run() { cfg.CanIfTxPduTruncation = true; api_CanIf_Transmit("2", { forceLen: 72 }); }
      },
      {
        label: "🚫 Bơm 72B test Truncation=OFF",
        run() { cfg.CanIfTxPduTruncation = false; api_CanIf_Transmit("2", { forceLen: 72 }); }
      }
    ]
  },

  {
    id: "S6",
    group: "Nhóm 2: Nhận L-PDU, Lọc Phần Mềm, DLC Check, CAN FD & Multi-UL",
    title: "S6: Điều Phối Đa Tầng Trên (PduR, CanTp, CanNm, CanTSyn) & Đọc Polling ReadRxPduData()",
    summary: "Minh họa vai trò điều phối (Dispatcher) của CanIf cho nhiều Upper Layer đồng thời qua bảng con trỏ callback UserRxIndication, đồng thời kiểm thử chế độ đọc Polling qua CanIf_ReadRxPduData().",
    setup() {
      cfg.CanIfPrivateDlcCheck = true;
      cfg.CanIfRxPduReadDataAndNotif = true;
      cfg.CanIfRxPduDataLength = 8;
    },
    steps: [
      {
        title: "Bước 1: Frame B (0x7E0 UDS 10 03) → Định tuyến riêng sang CanTp_RxIndication(1)",
        exec() {
          cfg.SelectedRxPduProfile = "FRAME_B";
          cfg.InjectedRxDlcLength = 8;
          api_CanIf_RxIndication("FRAME_B", { forceDlc: 8 });
        }
      },
      {
        title: "Bước 2: Frame C (0x501 dải 0x500/Mask 0x700) → Định tuyến sang CanNm_RxIndication(2)",
        exec() {
          cfg.SelectedRxPduProfile = "FRAME_C";
          api_CanIf_RxIndication("FRAME_C", { forceDlc: 8 });
        }
      },
      {
        title: "Bước 3: Frame D (0x190 TimeSync) → Định tuyến sang CanTSyn_RxIndication(3)",
        exec() {
          cfg.SelectedRxPduProfile = "FRAME_D";
          api_CanIf_RxIndication("FRAME_D", { forceDlc: 8 });
        }
      },
      {
        title: "Bước 4: Đọc Polling CanIf_ReadRxPduData() lấy dữ liệu lưu đệm cho CDD/Task",
        exec() {
          cfg.CanIfRxPduReadDataAndNotif = true;
          api_CanIf_ReadRxPduData();
        }
      }
    ],
    whatIfs: [
      {
        label: "🩺 Bơm 0x7E0 → CanTp",
        run() { api_CanIf_RxIndication("FRAME_B", { forceDlc: 8 }); }
      },
      {
        label: "🌐 Bơm 0x501 → CanNm (Mask 0x700)",
        run() { api_CanIf_RxIndication("FRAME_C", { forceDlc: 8 }); }
      },
      {
        label: "⏱ Đọc Polling ReadRxPduData()",
        run() { cfg.CanIfRxPduReadDataAndNotif = true; api_CanIf_ReadRxPduData(); }
      }
    ]
  },

  {
    id: "S7",
    group: "Nhóm 3: ControllerMode, Cổng PduMode & Partial Networking",
    title: "S7: Điều Phối Chuyển Đổi ControllerMode (STOPPED → STARTED → SLEEP) & TransceiverMode",
    summary: "Làm rõ đồ thị chuyển trạng thái hợp lệ của Can_ControllerStateType theo SWS_CanIf_00308: cấm chuyển thẳng STARTED → SLEEP, bắt buộc dừng về CAN_CS_STOPPED (xóa TxBuffer) trước khi vào SLEEP cùng CanTrcv.",
    setup() {
      cfg.ActiveControllerMode = "CAN_CS_STARTED";
      cfg.ActivePduMode = "CANIF_ONLINE";
      cfg.ActiveTransceiverMode = "CANTRCV_TRCVMODE_NORMAL";
    },
    steps: [
      {
        title: "Bước 1: Thử chuyển thẳng STARTED → SLEEP → CanIf từ chối (E_NOT_OK) bảo vệ bus!",
        exec() {
          api_CanIf_SetControllerMode("CAN_CS_SLEEP");
        }
      },
      {
        title: "Bước 2: Quy trình chuẩn — Hạ về CAN_CS_STOPPED (xóa TxBuffer & đưa TxConf=0)",
        exec() {
          api_CanIf_SetControllerMode("CAN_CS_STOPPED");
        }
      },
      {
        title: "Bước 3: Đưa Controller vào CAN_CS_SLEEP & hạ CanTrcv xuống STANDBY chờ Wakeup",
        exec() {
          api_CanIf_SetControllerMode("CAN_CS_SLEEP");
          api_CanIf_SetTrcvMode("CANTRCV_TRCVMODE_STANDBY");
        }
      },
      {
        title: "Bước 4: Đánh thức lại: Transceiver NORMAL → STOPPED → STARTED → PduMode ONLINE",
        exec() {
          api_CanIf_SetTrcvMode("CANTRCV_TRCVMODE_NORMAL");
          api_CanIf_SetControllerMode("CAN_CS_STOPPED");
          api_CanIf_SetControllerMode("CAN_CS_STARTED");
          api_CanIf_SetPduMode("CANIF_ONLINE");
        }
      }
    ],
    whatIfs: [
      {
        label: "⛔ Test STARTED → SLEEP (Cấm)",
        run() { api_CanIf_SetControllerMode("CAN_CS_STARTED"); api_CanIf_SetControllerMode("CAN_CS_SLEEP"); }
      },
      {
        label: "😴 Đưa về STOPPED → SLEEP",
        run() { api_CanIf_SetControllerMode("CAN_CS_STOPPED"); api_CanIf_SetControllerMode("CAN_CS_SLEEP"); }
      },
      {
        label: "▶ Khôi phục STARTED + ONLINE",
        run() { api_CanIf_SetControllerMode("CAN_CS_STOPPED"); api_CanIf_SetControllerMode("CAN_CS_STARTED"); api_CanIf_SetPduMode("CANIF_ONLINE"); }
      }
    ]
  },

  {
    id: "S8",
    group: "Nhóm 3: ControllerMode, Cổng PduMode & Partial Networking",
    title: "S8: Giải Phẫu 4 Chế Độ PduMode: OFFLINE, TX_OFFLINE, ONLINE & Giả Lập TX_OFFLINE_ACTIVE",
    summary: "Phân biệt sắc bén 4 trạng thái cổng logic CanIf_PduModeType (độc lập với ControllerMode phần cứng) — đặc biệt cơ chế bắn TxConfirmation ảo trong CANIF_TX_OFFLINE_ACTIVE (ECU Passive Mode, SWS_CanIf_00072).",
    setup() {
      cfg.ActiveControllerMode = "CAN_CS_STARTED";
      cfg.ActivePduMode = "CANIF_OFFLINE";
      cfg.SelectedTxPduId = "1";
    },
    steps: [
      {
        title: "Bước 1: CANIF_OFFLINE — Chặn tuyệt đối cả Transmit() lẫn RxIndication()",
        exec() {
          api_CanIf_SetPduMode("CANIF_OFFLINE");
          api_CanIf_Transmit("1");
        }
      },
      {
        title: "Bước 2: CANIF_TX_OFFLINE (SilentCom) — Khóa chiều Tx nhưng MỞ chiều Rx đón bản tin!",
        exec() {
          api_CanIf_SetPduMode("CANIF_TX_OFFLINE");
          api_CanIf_RxIndication("FRAME_B", { forceDlc: 8 });
        }
      },
      {
        title: "Bước 3: CANIF_TX_OFFLINE_ACTIVE — Không gọi Can_Write(), bắn ảo TxConfirmation(E_OK)!",
        exec() {
          api_CanIf_SetPduMode("CANIF_TX_OFFLINE_ACTIVE");
          api_CanIf_Transmit("1");
        }
      },
      {
        title: "Bước 4: CANIF_ONLINE — Mở thông suốt cả 2 chiều Tx & Rx lên bus CAN",
        exec() {
          api_CanIf_SetPduMode("CANIF_ONLINE");
          api_CanIf_Transmit("1");
        }
      }
    ],
    whatIfs: [
      {
        label: "🟡 Test TX_OFFLINE_ACTIVE + Transmit",
        run() { api_CanIf_SetPduMode("CANIF_TX_OFFLINE_ACTIVE"); api_CanIf_Transmit("1"); }
      },
      {
        label: "🔇 Test TX_OFFLINE (Chặn Tx, Mở Rx)",
        run() { api_CanIf_SetPduMode("CANIF_TX_OFFLINE"); api_CanIf_Transmit("1"); }
      },
      {
        label: "🟢 Mở lại CANIF_ONLINE",
        run() { api_CanIf_SetPduMode("CANIF_ONLINE"); api_CanIf_Transmit("1"); }
      }
    ]
  },

  {
    id: "S9",
    group: "Nhóm 3: ControllerMode, Cổng PduMode & Partial Networking",
    title: "S9: Bộ Lọc Truyền Partial Networking (CanIfPnFilter) & Mở Khóa Khi ConfirmPnAvailability()",
    summary: "Mô phỏng tiết kiệm năng lượng mạng Partial Networking: khi bật CanIfPnFilter, mọi bản tin ứng dụng (COM/CanTp) đều bị khóa, chỉ TxPdu_0 (CanIfTxPduPnFilterPdu=TRUE) đi qua được cho tới khi gọi CanIf_ConfirmPnAvailability().",
    setup() {
      cfg.ActiveControllerMode = "CAN_CS_STARTED";
      cfg.ActivePduMode = "CANIF_ONLINE";
      cfg.CanIfPublicPnSupport = true;
      cfg.CanIfPnFilterEnabled = true;
    },
    steps: [
      {
        title: "Bước 1: PN Tx Filter đang BẬT — COM gửi TxPdu_1 (PnFilterPdu=FALSE) → BỊ CHẶN E_NOT_OK",
        exec() {
          sim.pnFilterActive = true;
          cfg.CanIfPnFilterEnabled = true;
          api_CanIf_Transmit("1");
        }
      },
      {
        title: "Bước 2: CanNm gửi TxPdu_0 (CanIfTxPduPnFilterPdu=TRUE) → Đi xuyên PN Filter ra bus!",
        exec() {
          api_CanIf_Transmit("0");
        }
      },
      {
        title: "Bước 3: Gọi CanIf_ConfirmPnAvailability(0) hoặc hoàn tất TxConfirm(0) → Tắt PN Filter",
        exec() {
          api_CanIf_TxConfirmation("0");
          api_CanIf_ConfirmPnAvailability();
        }
      },
      {
        title: "Bước 4: COM gửi lại TxPdu_1 (0x100) → Truyền thành công sau khi mạng PN mở khóa!",
        exec() {
          api_CanIf_Transmit("1");
        }
      }
    ],
    whatIfs: [
      {
        label: "🔒 Khóa PN & test TxPdu_1",
        run() { sim.pnFilterActive = true; cfg.CanIfPnFilterEnabled = true; api_CanIf_Transmit("1"); }
      },
      {
        label: "🔑 Gửi CanNm (TxPdu_0) xuyên PN",
        run() { api_CanIf_Transmit("0"); }
      },
      {
        label: "🔓 Gọi ConfirmPnAvailability()",
        run() { api_CanIf_ConfirmPnAvailability(); }
      }
    ]
  },

  {
    id: "S10",
    group: "Nhóm 4: Bus-Off, Wakeup Validation, SetBaudrate & Hàng Rào DET",
    title: "S10: Xử Lý Ngắt Bus-Off: Về STOPPED, Khóa TX_OFFLINE, Xóa Sạch TxBuffer & Báo CanSM",
    summary: "Chẩn đoán sự cố ngắn mạch đường truyền CAN gây Bus-Off (TEC > 255): CanIf_ControllerBusOff() dọn dẹp khẩn cấp hàng đợi CanIfTxBuffer, khóa cổng truyền và nhường quyền khôi phục (BOR) cho CanSM.",
    setup() {
      cfg.ActiveControllerMode = "CAN_CS_STARTED";
      cfg.ActivePduMode = "CANIF_ONLINE";
      cfg.SimulateHthMailboxBusy = false;
    },
    steps: [
      {
        title: "Bước 1: Đang kẹt HTH_1 & có 2 khung xếp hàng trong CanIfTxBuffer [0x100, 0x7E8]",
        exec() {
          api_CanIf_Transmit("2");
          api_CanIf_Transmit("3");
          api_CanIf_Transmit("1");
        }
      },
      {
        title: "Bước 2: Ngắt CanIf_ControllerBusOff(0) → Về STOPPED, TX_OFFLINE, XÓA SẠCH 2 khung TxBuffer!",
        exec() {
          api_CanIf_ControllerBusOff();
        }
      },
      {
        title: "Bước 3: Trong lúc Bus-Off, nếu COM cố Transmit() → Bị từ chối E_NOT_OK",
        exec() {
          api_CanIf_Transmit("1");
        }
      },
      {
        title: "Bước 4: CanSM phục hồi BOR → Chuyển lại CAN_CS_STARTED & CANIF_ONLINE",
        exec() {
          api_CanIf_SetControllerMode("CAN_CS_STARTED");
          api_CanIf_SetPduMode("CANIF_ONLINE");
        }
      }
    ],
    whatIfs: [
      {
        label: "⚡ Kích hoạt Bus-Off ngay",
        run() { api_CanIf_ControllerBusOff(); }
      },
      {
        label: "📥 Nạp sẵn TxBuf rồi Bus-Off",
        run() { api_CanIf_Transmit("2"); api_CanIf_Transmit("1"); api_CanIf_ControllerBusOff(); }
      },
      {
        label: "🔁 CanSM phục hồi BOR",
        run() { api_CanIf_SetControllerMode("CAN_CS_STARTED"); api_CanIf_SetPduMode("CANIF_ONLINE"); }
      }
    ]
  },

  {
    id: "S11",
    group: "Nhóm 4: Bus-Off, Wakeup Validation, SetBaudrate & Hàng Rào DET",
    title: "S11: Chu Trình Đánh Thức & Xác Thực Chống Nhiễu EcuM (CheckWakeup → RxInd → CheckValidation)",
    summary: "Giải thích cơ chế Wakeup Validation 2 pha tránh tiêu hao ắc quy do nhiễu bus (Glitch): EcuM gọi CheckWakeup() rồi đánh thức Ctrl, chỉ khi nhận >= 1 RxIndication() hợp lệ thì CheckValidation() mới báo EcuM_ValidateWakeupEvent().",
    setup() {
      cfg.CanIfCtrlWakeupSupport = true;
      cfg.CanIfPublicWakeupCheckValidSupport = true;
      cfg.CanIfWakeupCheckValidByNM = false;
    },
    steps: [
      {
        title: "Bước 1: EcuM gọi CanIf_CheckWakeup() phát hiện WUF trên CanTrcv (Wakeup Pending)",
        exec() {
          api_CanIf_SetControllerMode("CAN_CS_STOPPED");
          api_CanIf_SetControllerMode("CAN_CS_SLEEP");
          api_CanIf_SetTrcvMode("CANTRCV_TRCVMODE_STANDBY");
          api_CanIf_CheckWakeup();
        }
      },
      {
        title: "Bước 2: Chưa thấy khung Rx hợp lệ → Thử CheckValidation() bị từ chối (Chống nhiễu Glitch!)",
        exec() {
          api_CanIf_CheckValidation();
        }
      },
      {
        title: "Bước 3: Đánh thức Ctrl lên STARTED & nhận khung NM 0x501 hợp lệ qua RxIndication()",
        exec() {
          api_CanIf_SetTrcvMode("CANTRCV_TRCVMODE_NORMAL");
          api_CanIf_SetControllerMode("CAN_CS_STOPPED");
          api_CanIf_SetControllerMode("CAN_CS_STARTED");
          api_CanIf_SetPduMode("CANIF_ONLINE");
          api_CanIf_RxIndication("FRAME_C", { forceDlc: 8 });
        }
      },
      {
        title: "Bước 4: EcuM gọi lại CanIf_CheckValidation() → Gọi EcuM_ValidateWakeupEvent() giữ ECU thức!",
        exec() {
          api_CanIf_CheckValidation();
          api_CanIf_ClearTrcvWufFlag();
        }
      }
    ],
    whatIfs: [
      {
        label: "🔔 Phát xung Wakeup (CheckWakeup)",
        run() { api_CanIf_CheckWakeup(); }
      },
      {
        label: "⚠ Test CheckValidation khi chưa Rx",
        run() { sim.wakeupDetected = true; sim.firstValidRxReceived = false; api_CanIf_CheckValidation(); }
      },
      {
        label: "✔ Nhận NM + CheckValidation()",
        run() { sim.wakeupDetected = true; api_CanIf_SetControllerMode("CAN_CS_STARTED"); api_CanIf_SetPduMode("CANIF_ONLINE"); api_CanIf_RxIndication("FRAME_C", { forceDlc: 8 }); api_CanIf_CheckValidation(); }
      }
    ]
  },

  {
    id: "S12",
    group: "Nhóm 4: Bus-Off, Wakeup Validation, SetBaudrate & Hàng Rào DET",
    title: "S12: Đổi Tốc Độ CanIf_SetBaudrate(), Kiểm Thử Hàng Rào Lỗi DET & Cảnh Báo An Ninh IdsM",
    summary: "Thao tác đổi cấu hình tốc độ baud (500k/2M FD <-> 500k/5M FD), kích hoạt hàm GetVersionInfo (Module 60), và thử nghiệm hàng rào bắt lỗi DET (0x32, 0x0F, UNINIT) kết hợp báo cáo an ninh IdsM.",
    setup() {
      cfg.CanIfDevErrorDetect = true;
      cfg.EnableIdsMSecurityEvents = true;
      cfg.ActiveBaudRateConfigID = 0;
    },
    steps: [
      {
        title: "Bước 1: Đổi BaudRateConfigID = 1 (500 kbps / 5 Mbps CAN FD) qua CanIf_SetBaudrate()",
        exec() {
          api_CanIf_SetBaudrate(1);
        }
      },
      {
        title: "Bước 2: Gọi CanIf_GetVersionInfo() kiểm tra ModuleId = 60 (AUTOSAR R23-11)",
        exec() {
          api_CanIf_GetVersionInfo();
        }
      },
      {
        title: "Bước 3: Truyền TxPduId=999 vượt biên → Hàng rào DET bắt lỗi CANIF_E_INVALID_TXPDUID (0x32) + IdsM",
        exec() {
          api_CanIf_Transmit("999");
        }
      },
      {
        title: "Bước 4: Chạy tổng hợp DET & Runtime Security Check (TxPduId=999 + DLC Error 0x32)",
        exec() {
          cfg.EnableIdsMSecurityEvents = true;
          api_CanIf_TestDetError();
        }
      }
    ],
    whatIfs: [
      {
        label: "⚡ Đổi BaudRateConfigID kế tiếp",
        run() { api_CanIf_SetBaudrate(); }
      },
      {
        label: "🛡 Bắt lỗi DET + IdsM ngay",
        run() { cfg.CanIfDevErrorDetect = true; cfg.EnableIdsMSecurityEvents = true; api_CanIf_TestDetError(); }
      },
      {
        label: "ℹ Gọi CanIf_GetVersionInfo()",
        run() { api_CanIf_GetVersionInfo(); }
      }
    ]
  }
];
