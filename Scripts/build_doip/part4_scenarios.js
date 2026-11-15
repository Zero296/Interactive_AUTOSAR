// ==================== 12 PRE-BUILT DOIP SCENARIOS + 36 WHAT-IF ACTIONS ====================

const SCENARIOS = [
  // -------------------- GROUP 1: STARTUP, DISCOVERY & HEADER GUARD --------------------
  {
    id: "S1",
    group: "Nhóm 1: Startup, Discovery & Header Guard",
    title: "S1: Startup, Activation Line & 3× UDP Vehicle Announcement (0x0004)",
    summary: "Minh họa đầy đủ chuỗi khởi động chuẩn SWS_DoIP: DoIP_Init() -> BswM kéo Activation Line HIGH -> TcpIp gán IP -> chờ T_InitialDelay (250ms) -> tự động phát 3 lần UDP Broadcast 0x0004 (chu kỳ 500ms).",
    setup: function () {
      cfg = Object.assign({}, defaultConfig);
      sim = createInitialSimState();
      updateRegistersAfter();
    },
    steps: [
      { title: "DoIP_Init(&DoIP_Config)", exec: () => api_DoIP_Init() },
      { title: "BswM: ActivationLineSwitchActive()", exec: () => api_DoIP_ActivationLineSwitch(true) },
      { title: "SoAd: LocalIpAddrAssignmentChg(ASSIGNED)", exec: () => api_DoIP_LocalIpAddrAssignmentChg(true) },
      { title: "MainFn +250ms -> UDP 0x0004 #1", exec: () => api_DoIP_SendVehicleAnnouncement() },
      { title: "MainFn +500ms -> UDP 0x0004 #2 & #3", exec: () => { api_DoIP_SendVehicleAnnouncement(); api_DoIP_SendVehicleAnnouncement(); } }
    ],
    whatIfs: [
      {
        label: "What-If 1: Có IP trước khi bật ActLine",
        run: () => {
          api_DoIP_Init();
          api_DoIP_ActivationLineSwitch(false);
          api_DoIP_LocalIpAddrAssignmentChg(true);
        }
      },
      {
        label: "What-If 2: Lấy GID từ SWC qua RTE",
        run: () => {
          cfg.DoIPUseMacForGid = false;
          api_DoIP_Init();
          api_DoIP_ActivationLineSwitch(true);
          api_DoIP_LocalIpAddrAssignmentChg(true);
          api_DoIP_SendVehicleAnnouncement();
        }
      },
      {
        label: "What-If 3: Thử phát 0x0004 khi ActLine OFF",
        run: () => {
          api_DoIP_Init();
          api_DoIP_ActivationLineSwitch(false);
          api_DoIP_SendVehicleAnnouncement();
        }
      }
    ]
  },

  {
    id: "S2",
    group: "Nhóm 1: Startup, Discovery & Header Guard",
    title: "S2: UDP Vehicle ID (0x0001..0x0003), Entity Status (0x4001) & Power Mode (0x4003)",
    summary: "Mô phỏng quá trình Máy chẩn đoán tìm ECU trên mạng UDP 13400: Quét chung 0x0001, lọc chính xác theo EID (0x0002) và VIN 17 ký tự (0x0003), đọc trạng thái socket 0x4001 và đọc Power Mode trực tiếp từ SWC qua RTE (0x4003).",
    setup: function () {
      cfg = Object.assign({}, defaultConfig);
      api_DoIP_Init();
      api_DoIP_ActivationLineSwitch(true);
      api_DoIP_LocalIpAddrAssignmentChg(true);
      sim.nodeState = "ONLINE_READY";
      updateRegistersAfter();
    },
    steps: [
      { title: "Tester gửi UDP 0x0001 (VID Req Broadcast)", exec: () => api_DoIP_UdpRxIndication("0x0001", { protoVer: "0xFF", invVer: "0x00" }) },
      { title: "Tester gửi UDP 0x0002 (Filter EID Match)", exec: () => api_DoIP_UdpRxIndication("0x0002", { protoVer: "0xFF", invVer: "0x00", eid: cfg.DoIPEidMacHex }) },
      { title: "Tester gửi UDP 0x0003 (Filter VIN Match)", exec: () => api_DoIP_UdpRxIndication("0x0003", { protoVer: "0xFF", invVer: "0x00", vin: cfg.DoIPVinString }) },
      { title: "UDP 0x4001 -> Trả Entity Status 0x4002", exec: () => api_DoIP_UdpRxIndication("0x4001", { protoVer: "0x02", invVer: "0xFD" }) },
      { title: "UDP 0x4003 -> SWC RTE -> Power Mode 0x4004", exec: () => api_DoIP_UdpRxIndication("0x4003", { protoVer: "0x02", invVer: "0xFD" }) }
    ],
    whatIfs: [
      {
        label: "What-If 1: Gửi 0x0003 sai VIN (Im lặng)",
        run: () => api_DoIP_UdpRxIndication("0x0003", { protoVer: "0xFF", invVer: "0x00", vin: "WBA0000000WRONG99" })
      },
      {
        label: "What-If 2: Gửi 0x0002 sai EID (Im lặng)",
        run: () => api_DoIP_UdpRxIndication("0x0002", { protoVer: "0xFF", invVer: "0x00", eid: "AA:BB:CC:DD:EE:FF" })
      },
      {
        label: "What-If 3: Power Mode 0x00 Not Ready",
        run: () => api_DoIP_UdpRxIndication("0x4003", { protoVer: "0x02", invVer: "0xFD", powerNotReady: true })
      }
    ]
  },

  {
    id: "S3",
    group: "Nhóm 1: Startup, Discovery & Header Guard",
    title: "S3: Generic Header 8-Byte Sync & Hàng Rào NACK (0x0000)",
    summary: "Kiểm thử bộ giải mã Generic Header 8 byte tại cửa ngõ DoIP: phân biệt khung chuẩn (Ver ^ InvVer == 0xFF) với 3 lỗi kinh điển — sai XOR (0x0000 Code 0x00 + đóng TCP), PayloadType lạ (Code 0x01) và tràn kích thước (Code 0x02).",
    setup: function () {
      cfg = Object.assign({}, defaultConfig);
      api_DoIP_Init();
      api_DoIP_ActivationLineSwitch(true);
      api_DoIP_LocalIpAddrAssignmentChg(true);
      api_DoIP_TcpRoutingActivation("0x0E00", "0x00", false, { skipPending: true });
    },
    steps: [
      { title: "Khung 0x8001 Hợp Lệ (0x02 ^ 0xFD == 0xFF)", exec: () => api_DoIP_DiagRequest0x8001(cfg.DoIPLocalDcmTargetHex, { protoVer: "0x02", invVer: "0xFD", payloadLen: 7 }) },
      { title: "Sai PayloadType 0x9999 -> NACK 0x0000 (0x01)", exec: () => api_DoIP_DiagRequest0x8001(cfg.DoIPLocalDcmTargetHex, { forceUnknownType: true }) },
      { title: "PayloadLen=8192B > 4096B -> NACK 0x0000 (0x02)", exec: () => api_DoIP_DiagRequest0x8001(cfg.DoIPLocalDcmTargetHex, { payloadLen: 8192 }) },
      { title: "Sai Luật XOR (0x02 ^ 0xFE) -> 0x0000 (0x00) + Đóng TCP!", exec: () => api_DoIP_DiagRequest0x8001(cfg.DoIPLocalDcmTargetHex, { protoVer: "0x02", invVer: "0xFE" }) }
    ],
    whatIfs: [
      {
        label: "What-If 1: Bơm lỗi XOR trên TCP",
        run: () => api_DoIP_DiagRequest0x8001(cfg.DoIPLocalDcmTargetHex, { protoVer: "0x03", invVer: "0x00" })
      },
      {
        label: "What-If 2: Bơm PayloadType 0x9999",
        run: () => api_DoIP_DiagRequest0x8001(cfg.DoIPLocalDcmTargetHex, { forceUnknownType: true })
      },
      {
        label: "What-If 3: Bơm Len = 65535B (Overflow)",
        run: () => api_DoIP_DiagRequest0x8001(cfg.DoIPLocalDcmTargetHex, { payloadLen: 65535 })
      }
    ]
  },

  // -------------------- GROUP 2: TCP SOCKETS, SWC AUTH & ALIVE CHECK --------------------
  {
    id: "S4",
    group: "Nhóm 2: TCP Connection, SWC Auth & Alive Check",
    title: "S4: TCP Routing Activation (0x0005 ➔ 0x0006) & T_Initial_Inactivity (2000ms)",
    summary: "Theo dõi vòng đời TCP SoConId khi Tester bắt tay cổng 13400: Timer T_Initial_Inactivity (2000ms) lập tức đếm ngược; Tester phải kịp gửi 0x0005 để nhận 0x0006 Code 0x10 trước khi bị ngắt socket.",
    setup: function () {
      cfg = Object.assign({}, defaultConfig);
      api_DoIP_Init();
      api_DoIP_ActivationLineSwitch(true);
      api_DoIP_LocalIpAddrAssignmentChg(true);
      sim.nodeState = "ONLINE_READY";
      updateRegistersAfter();
    },
    steps: [
      { title: "TCP Handshake -> SoConModeChg(0, ONLINE)", exec: () => api_DoIP_SoConModeChg(0, true, 13400) },
      { title: "MainFn +500ms (T_Initial còn 1500ms)", exec: () => api_DoIP_MainFunction(500) },
      { title: "Tester 0x0E00 gửi 0x0005 (Default 0x00)", exec: () => api_DoIP_TcpRoutingActivation("0x0E00", "0x00", false, { skipPending: true }) },
      { title: "T_General_Inactivity (300s) bắt đầu chạy", exec: () => api_DoIP_MainFunction(100) }
    ],
    whatIfs: [
      {
        label: "What-If 1: Tester im lặng 2000ms (Timeout!)",
        run: () => {
          api_DoIP_SoConModeChg(0, true, 13400);
          api_DoIP_MainFunction(2000);
        }
      },
      {
        label: "What-If 2: Tester lạ SA=0x0EEE (NACK 0x00)",
        run: () => api_DoIP_TcpRoutingActivation("0x0EEE", "0x00", false, { forceUnknownSa: true })
      },
      {
        label: "What-If 3: ActType=0xAA không hỗ trợ (0x06)",
        run: () => api_DoIP_TcpRoutingActivation("0x0E00", "0xAA", false)
      }
    ]
  },

  {
    id: "S5",
    group: "Nhóm 2: TCP Connection, SWC Auth & Alive Check",
    title: "S5: SWC Auth/Confirmation Async (DOIP_E_PENDING) & TLS Cổng 3496 (0x07)",
    summary: "Mô phỏng DoIP gọi thẳng SWC_DoIPAuth qua RTE bằng chế độ bất đồng bộ DOIP_E_PENDING kết hợp luật bảo mật TLS ISO 13400-2:2019 (chặn port 13400 bằng mã 0x07, cho phép trên cổng TLS 3496).",
    setup: function () {
      cfg = Object.assign({}, defaultConfig, {
        DoIPEnableTlsPort3496: true,
        DoIPAuthCallbackMode: "RTE_ASYNC_PENDING",
        DoIPConfCallbackRequired: true,
        DoIPRoutingActivationNumHex: "0xE0"
      });
      api_DoIP_Init();
      api_DoIP_ActivationLineSwitch(true);
      api_DoIP_LocalIpAddrAssignmentChg(true);
      sim.nodeState = "ONLINE_READY";
      updateRegistersAfter();
    },
    steps: [
      { title: "Thử 0x0005 (0xE0) trên Port 13400 -> NACK 0x07 TLS!", exec: () => api_DoIP_TcpRoutingActivation("0x0E00", "0xE0", false) },
      { title: "Kết nối lại Port TLS 3496 -> SWC trả DOIP_E_PENDING", exec: () => api_DoIP_TcpRoutingActivation("0x0E00", "0xE0", true) },
      { title: "MainFn Poll #1 -> Auth OK -> CONF_PENDING", exec: () => api_DoIP_MainFunction(20) },
      { title: "MainFn Poll #2 -> Confirmation OK -> 0x0006 (0x10)", exec: () => api_DoIP_MainFunction(20) }
    ],
    whatIfs: [
      {
        label: "What-If 1: Bắt TLS nhưng thử Port 13400",
        run: () => {
          cfg.DoIPEnableTlsPort3496 = true;
          api_DoIP_TcpRoutingActivation("0x0E00", "0xE0", false);
        }
      },
      {
        label: "What-If 2: SWC từ chối Auth -> NACK 0x04",
        run: () => api_DoIP_TcpRoutingActivation("0x0E00", "0xE0", true, { forceAuthMode: "RTE_DENIED" })
      },
      {
        label: "What-If 3: SWC từ chối Conf (Xe chạy) -> 0x05",
        run: () => api_DoIP_TcpRoutingActivation("0x0E00", "0xE0", true, { skipPending: true, rejectConfirmation: true })
      }
    ]
  },

  {
    id: "S6",
    group: "Nhóm 2: TCP Connection, SWC Auth & Alive Check",
    title: "S6: Đầy Socket Pool & Thu Hồi Socket Bằng Alive Check (0x0007 / 0x0008)",
    summary: "Khi cả 3 slot trong DoIP_TcpConnTable đều có Tester chiếm chỗ, Tester thứ 4 (0x0E03) xin kết nối sẽ ép DoIP phát 0x0007 và mở đồng hồ 500ms để đuổi socket chết.",
    setup: function () {
      cfg = Object.assign({}, defaultConfig, { DoIPMaxTesterConnections: 3 });
      api_DoIP_Init();
      api_DoIP_ActivationLineSwitch(true);
      api_DoIP_LocalIpAddrAssignmentChg(true);
      sim.nodeState = "ONLINE_READY";
      updateRegistersAfter();
    },
    steps: [
      { title: "Lấp đầy Pool 3/3 (0x0E00, 0x0E01, 0x0E02)", exec: () => { api_DoIP_TcpRoutingActivation("0x0E00", "0x00", false, { skipPending: true }); api_DoIP_TcpRoutingActivation("0x0E01", "0x00", false, { skipPending: true }); api_DoIP_TcpRoutingActivation("0x0E02", "0x00", false, { skipPending: true }); } },
      { title: "Tester thứ 4 (0x0E03) vào -> Trigger 0x0007 Alive Check", exec: () => api_DoIP_TcpRoutingActivation("0x0E03", "0x00", false, { skipPending: true }) },
      { title: "0x0E00 trả lời 0x0008; Slot 1 (0x0E01) chết 500ms -> Evict!", exec: () => api_DoIP_SendAliveCheckResp("0x0E00", "0x0E03") },
      { title: "Cấp lại Slot 1 vừa trống cho Tester 0x0E03!", exec: () => api_DoIP_TcpRoutingActivation("0x0E03", "0x00", false, { skipPending: true }) }
    ],
    whatIfs: [
      {
        label: "What-If 1: Tất cả đều sống (Từ chối 0x01)",
        run: () => {
          api_DoIP_AliveCheckTrigger("0x0E03");
          sim.tcpConns.forEach(c => { c.routingState = "ROUTING_ACTIVE"; c.aliveTimerMs = 0; });
          sim.alivePending = false;
          setLastFrame("ECU ➔ 0x0E03 (0x0006 NACK 0x01)", "0x02", "0xFD", "0x0006", 9, "All Testers replied 0x0008 -> Reject 0x0E03 with Code 0x01");
          addTrace("Alive Check All Alive", "Tất cả trả lời 0x0008 -> Reject 0x0E03 (Code 0x01)", "warn");
          updateRegistersAfter();
        }
      },
      {
        label: "What-If 2: Giữ 0x0E00, đuổi slot im lặng",
        run: () => api_DoIP_SendAliveCheckResp("0x0E00", "0x0E03")
      },
      {
        label: "What-If 3: Tăng MaxTesterConnections = 5",
        run: () => {
          cfg.DoIPMaxTesterConnections = 5;
          resizeTcpConnPoolIfNeeded();
          api_DoIP_TcpRoutingActivation("0x0E03", "0x00", false, { skipPending: true });
        }
      }
    ]
  },

  // -------------------- GROUP 3: DIAGNOSTIC ROUTING (DCM & CANTP GATEWAY) --------------------
  {
    id: "S7",
    group: "Nhóm 3: Diagnostic Routing (Dcm & CanTp Gateway)",
    title: "S7: Local ECU UDS Diagnostic (0x8001 ➔ 0x8002 ACK ➔ PduR ➔ Dcm ➔ SWC_Diag)",
    summary: "Luồng chẩn đoán UDS nội bộ trọn vẹn: Tester gửi 0x8001 (TA=0x1001, DID 22 F1 90 đọc VIN), DoIP trả 0x8002 Positive ACK, đẩy qua PduR lên Dcm/SWC_Diag rồi đóng gói phản hồi 0x8001 (62 F1 90 ...).",
    setup: function () {
      cfg = Object.assign({}, defaultConfig);
      api_DoIP_Init();
      api_DoIP_ActivationLineSwitch(true);
      api_DoIP_LocalIpAddrAssignmentChg(true);
      api_DoIP_TcpRoutingActivation("0x0E00", "0x00", false, { skipPending: true });
    },
    steps: [
      { title: "Tester 0x0E00 đã Routing Active", exec: () => api_DoIP_TcpRoutingActivation("0x0E00", "0x00", false, { skipPending: true }) },
      { title: "Nhận 0x8001 (TA=0x1001, UDS 22 F1 90)", exec: () => api_DoIP_DiagRequest0x8001(cfg.DoIPLocalDcmTargetHex, { udsHex: "22 F1 90" }) },
      { title: "Thử dịch vụ khác: UDS 10 03 Extended Session", exec: () => api_DoIP_DiagRequest0x8001(cfg.DoIPLocalDcmTargetHex, { udsHex: "10 03" }) }
    ],
    whatIfs: [
      {
        label: "What-If 1: Tắt 0x8002 Diag Positive ACK",
        run: () => {
          cfg.DoIPEnableDiagAck0x8002 = false;
          api_DoIP_DiagRequest0x8001(cfg.DoIPLocalDcmTargetHex, { udsHex: "22 F1 90" });
        }
      },
      {
        label: "What-If 2: Gửi Programming Session 10 02",
        run: () => api_DoIP_DiagRequest0x8001(cfg.DoIPLocalDcmTargetHex, { udsHex: "10 02" })
      },
      {
        label: "What-If 3: Functional Group TA=0xE400 (3E 80)",
        run: () => api_DoIP_DiagRequest0x8001(cfg.DoIPFuncGroupTargetHex, { udsHex: "3E 80" })
      }
    ]
  },

  {
    id: "S8",
    group: "Nhóm 3: Diagnostic Routing (Dcm & CanTp Gateway)",
    title: "S8: Ma Trận Từ Chối Chẩn Đoán — Diagnostic NACK (0x8003: 0x02, 0x03, 0x06, 0x08)",
    summary: "So sánh 4 mã Diagnostic Negative Acknowledge phổ biến nhất khi xử lý khung UDS 0x8001: sai SA (0x02), sai TA (0x03), Target Unreachable (0x06) và kẹt đệm TP PduR (0x08).",
    setup: function () {
      cfg = Object.assign({}, defaultConfig);
      api_DoIP_Init();
      api_DoIP_ActivationLineSwitch(true);
      api_DoIP_LocalIpAddrAssignmentChg(true);
      api_DoIP_TcpRoutingActivation("0x0E00", "0x00", false, { skipPending: true });
    },
    steps: [
      { title: "0x8003 Code 0x02: Invalid / Spoofed Tester SA", exec: () => api_DoIP_DiagRequest0x8001("0x1001", { sourceSa: "0x0EFF", forceInvalidSa: true }) },
      { title: "0x8003 Code 0x03: Unknown Target TA=0x9999", exec: () => api_DoIP_DiagRequest0x8001("0x9999") },
      { title: "0x8003 Code 0x06: Target Unreachable", exec: () => api_DoIP_DiagRequest0x8001(cfg.DoIPGwCanTpTargetHex, { forceUnreachable: true }) },
      { title: "0x8003 Code 0x08: PduR TP Buffer Busy", exec: () => api_DoIP_DiagRequest0x8001(cfg.DoIPLocalDcmTargetHex, { forceTpBusy: true }) }
    ],
    whatIfs: [
      {
        label: "What-If 1: Bơm Spoof SA -> 0x8003 (0x02)",
        run: () => api_DoIP_DiagRequest0x8001("0x1001", { sourceSa: "0x0EAF", forceInvalidSa: true })
      },
      {
        label: "What-If 2: Bơm Unknown TA -> 0x8003 (0x03)",
        run: () => api_DoIP_DiagRequest0x8001("0xDEAD")
      },
      {
        label: "What-If 3: Bơm PduR Busy -> 0x8003 (0x08)",
        run: () => api_DoIP_DiagRequest0x8001("0x1001", { forceTpBusy: true })
      }
    ]
  },

  {
    id: "S9",
    group: "Nhóm 3: Diagnostic Routing (Dcm & CanTp Gateway)",
    title: "S9: Edge Gateway DoIP-to-CanTp (TA=0x2001 ➔ PduR ➔ CanTp ➔ CanIf ➔ CAN-FD)",
    summary: "Minh họa vai trò Central Gateway của DoIP: gói UDS 0x8001 có Target Address = 0x2001 được PduR bẻ nhánh chuyển xuống CanTp/CanIf để truyền trên bus CAN-FD 64B tới ECU động cơ không có cổng Ethernet.",
    setup: function () {
      cfg = Object.assign({}, defaultConfig);
      api_DoIP_Init();
      api_DoIP_ActivationLineSwitch(true);
      api_DoIP_LocalIpAddrAssignmentChg(true);
      api_DoIP_TcpRoutingActivation("0x0E00", "0x00", false, { skipPending: true });
    },
    steps: [
      { title: "Tester 0x0E00 Active trên TCP 13400", exec: () => api_DoIP_TcpRoutingActivation("0x0E00", "0x00", false, { skipPending: true }) },
      { title: "0x8001 (TA=0x2001) -> PduR -> CanTp -> CAN-FD!", exec: () => api_DoIP_DiagRequest0x8001(cfg.DoIPGwCanTpTargetHex, { udsHex: "22 F1 90" }) },
      { title: "Gửi UDS 10 03 qua Gateway xuống ECU CAN-FD", exec: () => api_DoIP_DiagRequest0x8001(cfg.DoIPGwCanTpTargetHex, { udsHex: "10 03" }) }
    ],
    whatIfs: [
      {
        label: "What-If 1: Bus CAN-FD Ngắt -> 0x8003 (0x06)",
        run: () => api_DoIP_DiagRequest0x8001(cfg.DoIPGwCanTpTargetHex, { forceUnreachable: true })
      },
      {
        label: "What-If 2: Đọc DID 22 F1 90 qua CAN-FD GW",
        run: () => api_DoIP_DiagRequest0x8001(cfg.DoIPGwCanTpTargetHex, { udsHex: "22 F1 90" })
      },
      {
        label: "What-If 3: So sánh rẽ nhánh Local Dcm (0x1001)",
        run: () => api_DoIP_DiagRequest0x8001(cfg.DoIPLocalDcmTargetHex, { udsHex: "22 F1 90" })
      }
    ]
  },

  // -------------------- GROUP 4: STREAMING TP, SHUTDOWN & DET/IDSM --------------------
  {
    id: "S10",
    group: "Nhóm 4: Streaming TP, Shutdown & DET",
    title: "S10: Streaming Nạp Flash 4KB (CopyRxData / CopyTxData Chunking)",
    summary: "Khi Tester truyền khối Flash UDS 0x36 (TransferData) dài 4096 bytes vượt kích thước 1 gói TCP (MSS 1460B), SoAd và DoIP thực hiện truyền dòng TP thành 3 phân đoạn không tốn RAM đệm trùng lặp.",
    setup: function () {
      cfg = Object.assign({}, defaultConfig, { DoIPMaxTpChunkBytes: 1460, DoIPMaxByteArrayLength: 4096 });
      api_DoIP_Init();
      api_DoIP_ActivationLineSwitch(true);
      api_DoIP_LocalIpAddrAssignmentChg(true);
      api_DoIP_TcpRoutingActivation("0x0E00", "0x00", false, { skipPending: true });
    },
    steps: [
      { title: "Pha 1: StartOfReception(4100B) + CopyRxData Chunk #1 (1460B)", exec: () => api_DoIP_TpStreamingStep("START_AND_CHUNK1", cfg.DoIPLocalDcmTargetHex) },
      { title: "Pha 2: CopyRxData Chunk #2 (1460B) -> PduR", exec: () => api_DoIP_TpStreamingStep("CHUNK2", cfg.DoIPLocalDcmTargetHex) },
      { title: "Pha 3: Chunk #3 + RxIndication + DoIP_TpTransmit(76 01)", exec: () => api_DoIP_TpStreamingStep("FINISH", cfg.DoIPLocalDcmTargetHex) }
    ],
    whatIfs: [
      {
        label: "What-If 1: Giảm MaxTpChunk = 512B",
        run: () => {
          cfg.DoIPMaxTpChunkBytes = 512;
          api_DoIP_TpStreamingStep("START_AND_CHUNK1", cfg.DoIPLocalDcmTargetHex);
        }
      },
      {
        label: "What-If 2: Giới hạn MaxByteArray = 2048B (NACK!)",
        run: () => {
          cfg.DoIPMaxByteArrayLength = 2048;
          api_DoIP_TpStreamingStep("START_AND_CHUNK1", cfg.DoIPLocalDcmTargetHex);
        }
      },
      {
        label: "What-If 3: Stream Flash xuống CanTp GW (0x2001)",
        run: () => {
          cfg.DoIPMaxByteArrayLength = 4096;
          api_DoIP_TpStreamingStep("START_AND_CHUNK1", cfg.DoIPGwCanTpTargetHex);
          sim.gwCanTpActive = true;
          updateRegistersAfter();
        }
      }
    ]
  },

  {
    id: "S11",
    group: "Nhóm 4: Streaming TP, Shutdown & DET",
    title: "S11: Shutdown (ActivationLineInactive), Mất IP & T_General_Inactivity (300s)",
    summary: "Khảo sát 3 con đường đóng kết nối và giải phóng tài nguyên an toàn của DoIP: hết 300s không giao tiếp, mất IP DHCP/ETH Link Down, hoặc BswM hạ Activation Line về INACTIVE.",
    setup: function () {
      cfg = Object.assign({}, defaultConfig);
      api_DoIP_Init();
      api_DoIP_ActivationLineSwitch(true);
      api_DoIP_LocalIpAddrAssignmentChg(true);
      api_DoIP_TcpRoutingActivation("0x0E00", "0x00", false, { skipPending: true });
    },
    steps: [
      { title: "Kênh 0x0E00 đang ROUTING_ACTIVE (Timer 300s)", exec: () => api_DoIP_MainFunction(1000) },
      { title: "Mất IP đột ngột (IP UNASSIGNED) -> Cắt TCP", exec: () => api_DoIP_LocalIpAddrAssignmentChg(false) },
      { title: "Cấp lại IP & Mở lại Routing -> Chuẩn bị tắt", exec: () => { api_DoIP_LocalIpAddrAssignmentChg(true); api_DoIP_TcpRoutingActivation("0x0E00", "0x00", false, { skipPending: true }); } },
      { title: "BswM: ActivationLineSwitchInactive() -> SHUTDOWN", exec: () => api_DoIP_ActivationLineSwitch(false) }
    ],
    whatIfs: [
      {
        label: "What-If 1: Đứt cáp ETH (IP UNASSIGNED)",
        run: () => api_DoIP_LocalIpAddrAssignmentChg(false)
      },
      {
        label: "What-If 2: Idle hết 300,000ms (T_General Timeout)",
        run: () => {
          api_DoIP_ActivationLineSwitch(true);
          api_DoIP_LocalIpAddrAssignmentChg(true);
          api_DoIP_TcpRoutingActivation("0x0E00", "0x00", false, { skipPending: true });
          api_DoIP_MainFunction(300000);
        }
      },
      {
        label: "What-If 3: Phục hồi ActLine + Announce 0x0004",
        run: () => {
          api_DoIP_ActivationLineSwitch(true);
          api_DoIP_LocalIpAddrAssignmentChg(true);
          api_DoIP_SendVehicleAnnouncement();
        }
      }
    ]
  },

  {
    id: "S12",
    group: "Nhóm 4: Streaming TP, Shutdown & DET",
    title: "S12: Giám Sát DET (ModuleId = 173 / 0x00AD) & Sự Kiện An Ninh IdsM",
    summary: "Kiểm thử hệ thống tự bảo vệ của AUTOSAR DoIP: bắt các lỗi lập trình (0x01 UNINIT, 0x02 PARAM, 0x03 INVALID_PDU_ID, 0x04 NULL_PTR) về Det_ReportError(173, ...) đồng thời đẩy cảnh báo IdsM.",
    setup: function () {
      cfg = Object.assign({}, defaultConfig, { DoIPDevErrorDetect: true, DoIPEnableIdsMSecurityEvents: true });
      api_DoIP_Init();
    },
    steps: [
      { title: "DET 0x01: Gọi API trước DoIP_Init() (UNINIT)", exec: () => { sim.initialized = false; sim.nodeState = "UNINIT"; api_DoIP_TestDetError("0x01"); sim.initialized = true; } },
      { title: "DET 0x03: DoIP_TpTransmit() sai TxPduId=999", exec: () => api_DoIP_TestDetError("0x03") },
      { title: "DET 0x04: Truyền Con trỏ NULL_PTR", exec: () => api_DoIP_TestDetError("0x04") },
      { title: "Đọc DoIP_GetVersionInfo() (ModuleId=173 / R23-11)", exec: () => api_DoIP_GetVersionInfo() }
    ],
    whatIfs: [
      {
        label: "What-If 1: Bơm lỗi DET 0x03 + IdsM",
        run: () => api_DoIP_TestDetError("0x03")
      },
      {
        label: "What-If 2: Tắt DoIPDevErrorDetect (Bypass!)",
        run: () => {
          cfg.DoIPDevErrorDetect = false;
          api_DoIP_TestDetError("0x02");
        }
      },
      {
        label: "What-If 3: Đọc Version Info Module 173",
        run: () => api_DoIP_GetVersionInfo()
      }
    ]
  }
];
