// ============================================================================
// PART 4B: 12 SCENARIOS (S1..S12) x 4 STEPS + 36 ONE-CLICK WHAT-IF PROBES
// ============================================================================

function resetCfgToBaseline(overrides = {}) {
  cfg = JSON.parse(JSON.stringify(defaultConfig));
  const scId = parseInt(overrides.SelectedSoConId || cfg.SelectedSoConId, 10) || 0;
  const defSc = SOCON_DEFS[scId];
  if (defSc) {
    cfg.SoAdSocketProtocolChoice = defSc.proto;
    cfg.SoAdPduHeaderEnable = defSc.headerEnable;
    cfg.SoAdSocketAutomaticSoConSetup = defSc.autoSetup;
    cfg.SoAdSocketTcpInitiate = defSc.tcpInitiate;
    cfg.SoAdSocketLocalAddressAndPort = defSc.localAddr;
    cfg.SoAdSocketRemoteAddressAndPort = defSc.remoteAddr;
    cfg.SelectedRoutingGroupId = defSc.rgId;
  }
  Object.assign(cfg, overrides);
}

const SCENARIOS = [
  // ===================== NHÓM A: VÒNG ĐỜI SOCON & BEST-MATCH =====================
  {
    id: "S1",
    group: "Nhóm A · SoCon Lifecycle",
    title: "S1: UDP SoCon Setup — AutoSetup vs Manual OpenSoCon",
    summary: "So sánh khởi tạo AutoSetup=FALSE (giữ OFFLINE đợi Sd/BswM gọi SoAd_OpenSoCon) và AutoSetup=TRUE (tự bind ngay khi IP=ASSIGNED).",
    setup() {
      resetCfgToBaseline({
        SelectedSoConId: "0",
        SoAdSocketProtocolChoice: "UDP",
        SoAdSocketAutomaticSoConSetup: false,
        ActiveLocalIpAddrState: "TCPIP_IPADDR_STATE_ASSIGNED",
        SoAdRoutingGroupIsEnabledAfterInit: true
      });
      applySoAdInit(true);
    },
    steps: [
      {
        title: "Bước 1: SoAd_Init() với AutoSetup=FALSE -> SoCon_0 ở OFFLINE",
        exec() {
          cfg.SelectedSoConId = "0";
          cfg.SoAdSocketAutomaticSoConSetup = false;
          applySoAdInit(false);
        }
      },
      {
        title: "Bước 2: SD/BswM gọi SoAd_OpenSoCon(SoCon_0) -> TcpIp_Bind -> ONLINE",
        exec() {
          SoAd_OpenSoCon(0);
        }
      },
      {
        title: "Bước 3: Bật AutoSetup=TRUE trên SoCon_2 (SD Multicast) khi IP=ASSIGNED",
        exec() {
          cfg.SelectedSoConId = "2";
          pushActiveSoConFieldsToCfg();
          cfg.SoAdSocketAutomaticSoConSetup = true;
          applySoAdInit(false);
          cfg.SelectedSoConId = "0";
          SoAd_OpenSoCon(0);
        }
      },
      {
        title: "Bước 4: Gọi SoAd_CloseSoCon(SoCon_0, abort=TRUE) -> Trở về OFFLINE",
        exec() {
          cfg.SelectedSoConId = "0";
          SoAd_CloseSoCon(0, true);
        }
      }
    ],
    whatIfs: [
      {
        label: "What-If: Đổi IP -> UNASSIGNED trước khi Open",
        run() {
          SoAd_LocalIpAddrAssignmentChg("TCPIP_IPADDR_STATE_UNASSIGNED");
          SoAd_OpenSoCon(0);
        }
      },
      {
        label: "What-If: Close (abort=FALSE) còn OpenRef>0",
        run() {
          SoAd_OpenSoCon(0);
          SoAd_OpenSoCon(0);
          SoAd_CloseSoCon(0, false);
        }
      },
      {
        label: "What-If: Truyền IfTransmit khi SoCon=OFFLINE",
        run() {
          SoAd_CloseSoCon(0, true);
          SoAd_IfTransmit("PduRoute_0");
        }
      }
    ]
  },

  {
    id: "S2",
    group: "Nhóm A · SoCon Lifecycle",
    title: "S2: TCP Handshake (Client TcpConnect & Server TcpListen/Accepted)",
    summary: "Theo dõi vòng đời socket TCP: khác với UDP, TCP bắt buộc dừng ở SOAD_SOCON_RECONNECT tới khi TcpIp callback TcpConnected hoặc TcpAccepted.",
    setup() {
      resetCfgToBaseline({
        SelectedSoConId: "3",
        SoAdSocketProtocolChoice: "TCP",
        SoAdSocketTcpInitiate: true,
        SoAdSocketAutomaticSoConSetup: false,
        SoAdSocketRemoteAddressAndPort: "192.168.10.120:40000",
        SoAdRoutingGroupIsEnabledAfterInit: true
      });
      applySoAdInit(true);
    },
    steps: [
      {
        title: "Bước 1: Mở TCP Client SoCon_3 -> TcpIp_TcpConnect() & giữ RECONNECT",
        exec() {
          cfg.SelectedSoConId = "3";
          syncActiveSoConFieldsFromCfg();
          SoAd_OpenSoCon(3);
        }
      },
      {
        title: "Bước 2: TcpIp báo SoAd_TcpConnected(SoCon_3) -> Chuyển ONLINE + Bit B4 TCP_ESTAB",
        exec() {
          SoAd_TcpConnected(3);
        }
      },
      {
        title: "Bước 3: Chuyển sang TCP Server Listen (SoCon_1) chờ Tester",
        exec() {
          cfg.SelectedSoConId = "1";
          pushActiveSoConFieldsToCfg();
          SoAd_OpenSoCon(1);
        }
      },
      {
        title: "Bước 4: TcpIp báo SoAd_TcpAccepted(SoCon_1) từ Tester 192.168.10.220:51000 -> ONLINE",
        exec() {
          SoAd_TcpAccepted(1, "192.168.10.220:51000");
        }
      }
    ],
    whatIfs: [
      {
        label: "What-If: Gửi TpTransmit khi TCP còn RECONNECT",
        run() {
          cfg.SelectedSoConId = "3";
          applySoAdInit(false);
          SoAd_OpenSoCon(3);
          SoAd_TpTransmit("PduRoute_1");
        }
      },
      {
        label: "What-If: Tester đóng đột ngột (TCP_RESET)",
        run() {
          SoAd_TcpIpEvent(3, "TCPIP_TCP_RESET");
        }
      },
      {
        label: "What-If: Đổi TCP NoDelay=FALSE (Bật Nagle)",
        run() {
          cfg.SoAdSocketTcpNoDelayAndKeepAlive = false;
          SoAd_ChangeParameter(3);
        }
      }
    ]
  },

  {
    id: "S3",
    group: "Nhóm A · SoCon Lifecycle",
    title: "S3: Best-Match Remote IP:Port & Wildcard SetUniqueRemoteAddr",
    summary: "Chứng minh bảng chấm điểm Best-Match (Exact > IP:ANY > ANY:ANY), lọc MessageAcceptanceFilter và khóa peer bằng SetRemoteAddr/SetUniqueRemoteAddr.",
    setup() {
      resetCfgToBaseline({
        SelectedSoConId: "0",
        SoAdSocketMsgAcceptanceFilterEnabled: true,
        SoAdPduHeaderEnable: true
      });
      applySoAdInit(true);
      SoAd_OpenSoCon(0);
      SoAd_TcpAccepted(1, "ANY:ANY");
      sim.soCons[1].remoteAddr = "ANY:ANY";
    },
    steps: [
      {
        title: "Bước 1: Gói UDP đến từ 192.168.10.100:30490 -> Exact IP:Port (Score 4) trên SoCon_0",
        exec() {
          SoAd_RxIndication("PKT_A");
        }
      },
      {
        title: "Bước 2: Peer mới kết nối qua SoCon_1 Wildcard (ANY:ANY) -> Khớp Wildcard (Score 1)",
        exec() {
          cfg.SelectedSoConId = "1";
          pushActiveSoConFieldsToCfg();
          sim.soCons[1].proto = "UDP";
          sim.soCons[1].mode = "ONLINE";
          sim.soCons[1].remoteAddr = "ANY:ANY";
          sim.soCons[0].remoteAddr = "192.168.10.99:30490";
          SoAd_RxIndication("PKT_A");
        }
      },
      {
        title: "Bước 3: Gọi SoAd_SetUniqueRemoteAddr() khóa SoCon_3 riêng cho peer 192.168.10.201:55123",
        exec() {
          SoAd_SetUniqueRemoteAddr(1, "192.168.10.201:55123");
        }
      },
      {
        title: "Bước 4: Gọi SoAd_SetRemoteAddr(SoCon_0) cập nhật lại 192.168.10.100:30490 -> Score 4",
        exec() {
          cfg.SelectedSoConId = "0";
          sim.soCons[1].proto = "TCP";
          SoAd_SetRemoteAddr(0, "192.168.10.100:30490");
          SoAd_RxIndication("PKT_A");
        }
      }
    ],
    whatIfs: [
      {
        label: "What-If: Tắt Wildcard & gửi từ IP lạ (Filter Drop)",
        run() {
          sim.soCons[0].remoteAddr = "192.168.10.88:30490";
          sim.soCons[1].mode = "OFFLINE";
          cfg.SoAdSocketMsgAcceptanceFilterEnabled = true;
          SoAd_RxIndication("PKT_A");
        }
      },
      {
        label: "What-If: Tắt MsgAcceptanceFilter (Cho qua tất cả)",
        run() {
          sim.soCons[0].remoteAddr = "192.168.10.88:30490";
          cfg.SoAdSocketMsgAcceptanceFilterEnabled = false;
          SoAd_RxIndication("PKT_A");
        }
      },
      {
        label: "What-If: ReleaseRemoteAddr về lại ANY:ANY",
        run() {
          SoAd_ReleaseRemoteAddr(0);
        }
      }
    ]
  },

  // ===================== NHÓM B: TX MULTIPLEXING, TP & NPDU =====================
  {
    id: "S4",
    group: "Nhóm B · Tx Multiplexing & nPdu",
    title: "S4: SoAd_IfTransmit() & Giải phẫu 8-Byte PDU Header ON/OFF",
    summary: "Luồng phát IF tiêu chuẩn từ SW-C -> SomeIpXf -> PduR -> SoAd_IfTransmit -> TcpIp_UdpTransmit, bật/tắt 8-Byte Header trên Panel 1.",
    setup() {
      resetCfgToBaseline({
        SelectedSoConId: "0",
        SelectedTxPduRouteId: "PduRoute_0",
        SoAdPduHeaderEnable: true,
        SoAdTxPduHeaderIdHex: "0x01010001",
        SoAdTxUdpTriggerMode: "SOAD_TRIGGER_ALWAYS",
        SoAdRoutingGroupIsEnabledAfterInit: true
      });
      applySoAdInit(true);
      SoAd_OpenSoCon(0);
    },
    steps: [
      {
        title: "Bước 1: SW-C -> PduR gọi SoAd_IfTransmit(PduRoute_0, 32B) với HeaderEnable=TRUE",
        exec() {
          cfg.SoAdPduHeaderEnable = true;
          syncActiveSoConFieldsFromCfg();
          SoAd_IfTransmit("PduRoute_0");
        }
      },
      {
        title: "Bước 2: Kiểm tra dây truyền: TcpIp_UdpTransmit nhận 40B (8B Header 0x01010001 + 32B Payload)",
        exec() {
          SoAd_TxConfirmation(0);
        }
      },
      {
        title: "Bước 3: Chuyển HeaderEnable=FALSE cho tuyến Raw (PduRoute_2 SOME/IP-SD)",
        exec() {
          cfg.SelectedSoConId = "2";
          cfg.SoAdPduHeaderEnable = false;
          cfg.SelectedTxPduRouteId = "PduRoute_2";
          SoAd_IfTransmit("PduRoute_2");
        }
      },
      {
        title: "Bước 4: Khôi phục HeaderEnable=TRUE & VLAN PCP=5 cho tín hiệu ưu tiên cao",
        exec() {
          cfg.SelectedSoConId = "0";
          cfg.SoAdPduHeaderEnable = true;
          cfg.SoAdSocketFramePriorityVlanPcp = 5;
          SoAd_ChangeParameter(0);
          SoAd_IfTransmit("PduRoute_0");
        }
      }
    ],
    whatIfs: [
      {
        label: "What-If: Ép TcpIp trả NoBufs (SOAD_E_NOBUFS)",
        run() {
          cfg.SimulateTcpIpBufferBusyOrNoBufs = true;
          SoAd_IfTransmit("PduRoute_0");
          cfg.SimulateTcpIpBufferBusyOrNoBufs = false;
        }
      },
      {
        label: "What-If: Tắt HeaderEnable nhưng gửi 2 PDU -> Khó phân biệt",
        run() {
          cfg.SoAdPduHeaderEnable = false;
          syncActiveSoConFieldsFromCfg();
          SoAd_IfTransmit("PduRoute_0");
        }
      },
      {
        label: "What-If: Truyền PduId sai với DET=TRUE",
        run() {
          cfg.PassInvalidArgOrUninitForDetTest = true;
          SoAd_IfTransmit("PduRoute_0");
          cfg.PassInvalidArgOrUninitForDetTest = false;
        }
      }
    ]
  },

  {
    id: "S5",
    group: "Nhóm B · Tx Multiplexing & nPdu",
    title: "S5: SoAd_TpTransmit() Streaming & ImmediateTpTxConfirmation",
    summary: "Truyền khối dữ liệu lớn (1200B) qua SoAd_TpTransmit(): TcpIp kéo từng chunk bằng SoAd_CopyTxData() trước khi báo TpTxConfirmation.",
    setup() {
      resetCfgToBaseline({
        SelectedSoConId: "3",
        SoAdSocketProtocolChoice: "TCP",
        SelectedTxPduRouteId: "PduRoute_1",
        SoAdTxUpperLayerType: "TP",
        SoAdSocketTcpImmediateTpTxConfirmation: false,
        SoAdRoutingGroupIsEnabledAfterInit: true
      });
      applySoAdInit(true);
      SoAd_OpenSoCon(3);
      SoAd_TcpConnected(3);
    },
    steps: [
      {
        title: "Bước 1: DoIP/Dcm -> PduR gọi SoAd_TpTransmit(PduRoute_1, 1200B) khởi tạo phiên TP",
        exec() {
          SoAd_TpTransmit("PduRoute_1");
        }
      },
      {
        title: "Bước 2: TcpIp gọi SoAd_CopyTxData(600B) -> PduR_SoAdTpCopyTxData() mảnh 1/2",
        exec() {
          SoAd_CopyTxData(600);
        }
      },
      {
        title: "Bước 3: TcpIp kéo nốt 600B còn lại (1200/1200B) -> Đợi TCP ACK",
        exec() {
          SoAd_CopyTxData(600);
        }
      },
      {
        title: "Bước 4: TcpIp báo SoAd_TxConfirmation() -> PduR_SoAdTpTxConfirmation(E_OK)",
        exec() {
          SoAd_TxConfirmation(3);
        }
      }
    ],
    whatIfs: [
      {
        label: "What-If: Bật ImmediateTpTxConfirmation=TRUE",
        run() {
          cfg.SoAdSocketTcpImmediateTpTxConfirmation = true;
          SoAd_TpTransmit("PduRoute_1");
          SoAd_CopyTxData(1200);
        }
      },
      {
        label: "What-If: PduR trả BUFREQ_E_BUSY giữa phiên CopyTxData",
        run() {
          SoAd_TpTransmit("PduRoute_1");
          cfg.SimulateTcpIpBufferBusyOrNoBufs = true;
          SoAd_CopyTxData(600);
          cfg.SimulateTcpIpBufferBusyOrNoBufs = false;
        }
      },
      {
        label: "What-If: Gọi SoAd_TpCancelTransmit() giữa chừng",
        run() {
          SoAd_TpTransmit("PduRoute_1");
          SoAd_CopyTxData(600);
          SoAd_TpCancelTransmit("PduRoute_1");
        }
      }
    ]
  },

  {
    id: "S6",
    group: "Nhóm B · Tx Multiplexing & nPdu",
    title: "S6: nPdu UDP Tx Bundling (TRIGGER_NEVER & TriggerTimeout Flush)",
    summary: "Gom nhiều tín hiệu Com/SOME/IP nhỏ vào một UDP Datagram duy nhất qua nPdu Buffer để tối ưu băng thông Ethernet và giảm overhead.",
    setup() {
      resetCfgToBaseline({
        SelectedSoConId: "0",
        SoAdSocketProtocolChoice: "UDP",
        SoAdPduHeaderEnable: true,
        SoAdTxUdpTriggerMode: "SOAD_TRIGGER_NEVER",
        SoAdTxUdpTriggerTimeoutMs: 20,
        SoAdMainFunctionPeriodMs: 10,
        SoAdRoutingGroupIsEnabledAfterInit: true
      });
      applySoAdInit(true);
      SoAd_OpenSoCon(0);
    },
    steps: [
      {
        title: "Bước 1: PduRoute_3A (TRIGGER_NEVER, 32B) nạp vào nPdu Buffer -> Kích Timer 20ms",
        exec() {
          cfg.SelectedTxPduRouteId = "PduRoute_3A";
          cfg.SoAdTxUdpTriggerMode = "SOAD_TRIGGER_NEVER";
          SoAd_IfTransmit("PduRoute_3A");
        }
      },
      {
        title: "Bước 2: SoAd_MainFunction() tick 10ms -> Timer giảm còn 10ms (chưa xả)",
        exec() {
          SoAd_MainFunction();
        }
      },
      {
        title: "Bước 3: PduRoute_3B (TRIGGER_ALWAYS, 28B) tới -> Ép xả ngay 2 PDU (60B) trong 1 UDP Frame!",
        exec() {
          cfg.SelectedTxPduRouteId = "PduRoute_3B";
          cfg.SoAdTxUdpTriggerMode = "SOAD_TRIGGER_ALWAYS";
          SoAd_IfTransmit("PduRoute_3B");
        }
      },
      {
        title: "Bước 4: Nạp lại TRIGGER_NEVER và để MainFunction() xả tự động khi hết Timer",
        exec() {
          cfg.SelectedTxPduRouteId = "PduRoute_3A";
          cfg.SoAdTxUdpTriggerMode = "SOAD_TRIGGER_NEVER";
          SoAd_IfTransmit("PduRoute_3A");
          SoAd_MainFunction();
          SoAd_MainFunction();
        }
      }
    ],
    whatIfs: [
      {
        label: "What-If: Đặt TriggerTimeout=50ms -> Chờ 5 tick MainFunction",
        run() {
          cfg.SoAdTxUdpTriggerTimeoutMs = 50;
          cfg.SoAdTxUdpTriggerMode = "SOAD_TRIGGER_NEVER";
          SoAd_IfTransmit("PduRoute_3A");
          SoAd_MainFunction();
        }
      },
      {
        label: "What-If: CloseSoCon() khi nPdu đang giữ dữ liệu",
        run() {
          cfg.SoAdTxUdpTriggerMode = "SOAD_TRIGGER_NEVER";
          SoAd_IfTransmit("PduRoute_3A");
          SoAd_CloseSoCon(0, true);
        }
      },
      {
        label: "What-If: Tắt HeaderEnable -> Không thể gom nPdu",
        run() {
          cfg.SoAdPduHeaderEnable = false;
          cfg.SoAdTxUdpTriggerMode = "SOAD_TRIGGER_NEVER";
          syncActiveSoConFieldsFromCfg();
          SoAd_IfTransmit("PduRoute_3A");
        }
      }
    ]
  },

  // ===================== NHÓM C: RX DEMUX & TCP REASSEMBLY =====================
  {
    id: "S7",
    group: "Nhóm C · Rx Demux & Stream",
    title: "S7: UDP Multi-PDU nPdu Demux & StrictHeaderLenCheck",
    summary: "Đầu thu nhận gói UDP chứa nhiều PDU đóng ghép nPdu (PKT_B), lặp giải mã từng 8B Header và phân phối tới đúng các RxPduId tầng trên.",
    setup() {
      resetCfgToBaseline({
        SelectedSoConId: "0",
        SelectedRxPacketProfile: "PKT_B",
        SoAdPduHeaderEnable: true,
        SoAdSocketUdpStrictHeaderLenCheck: true,
        SoAdRxUpperLayerTarget: "PDUR"
      });
      applySoAdInit(true);
      SoAd_OpenSoCon(0);
    },
    steps: [
      {
        title: "Bước 1: Bơm gói Single UDP PDU (PKT_A) khớp HeaderId 0x01010002 -> PduR",
        exec() {
          cfg.SelectedRxPacketProfile = "PKT_A";
          SoAd_RxIndication("PKT_A");
        }
      },
      {
        title: "Bước 2: Bơm gói Multi-PDU nPdu (PKT_B) -> Tách 2 RxPdu (24B + 16B) lên PduR",
        exec() {
          cfg.SelectedRxPacketProfile = "PKT_B";
          cfg.InjectedRxPayloadLengthBytes = 56;
          SoAd_RxIndication("PKT_B");
        }
      },
      {
        title: "Bước 3: Bơm gói Unknown HeaderId 0xDEADBEEF (PKT_E) -> SOAD_E_INV_PDUHEADER_ID + IdsM",
        exec() {
          cfg.SelectedRxPacketProfile = "PKT_E";
          SoAd_RxIndication("PKT_E");
        }
      },
      {
        title: "Bước 4: Bơm gói Raw UDP không Header (PKT_F) cho Sd_SoAdIfRxIndication()",
        exec() {
          cfg.SelectedRxPacketProfile = "PKT_F";
          SoAd_RxIndication("PKT_F");
        }
      }
    ],
    whatIfs: [
      {
        label: "What-If: Gói UDP cụt độ dài khi StrictLenCheck=TRUE",
        run() {
          cfg.SoAdSocketUdpStrictHeaderLenCheck = true;
          cfg.InjectedRxPayloadLengthBytes = 12;
          SoAd_RxIndication("PKT_B");
        }
      },
      {
        label: "What-If: Chuyển đích Rx sang UdpNm",
        run() {
          cfg.SoAdRxUpperLayerTarget = "UDPNM";
          cfg.InjectedRxPayloadLengthBytes = 32;
          SoAd_RxIndication("PKT_A");
        }
      },
      {
        label: "What-If: Đọc GetAndResetMeasurementData sau Unknown Header",
        run() {
          SoAd_RxIndication("PKT_E");
          SoAd_GetAndResetMeasurementData();
        }
      }
    ]
  },

  {
    id: "S8",
    group: "Nhóm C · Rx Demux & Stream",
    title: "S8: TCP Fragmented & Sticky Stream Reassembly (SoAdRxBuffer)",
    summary: "TCP là dòng byte không ranh giới: minh họa tích lũy mảnh xé lẻ (Fragmented PKT_C) và tách gói dính liền (Sticky PKT_D) qua SoAdRxBuffer.",
    setup() {
      resetCfgToBaseline({
        SelectedSoConId: "3",
        SoAdSocketProtocolChoice: "TCP",
        SoAdPduHeaderEnable: true,
        SelectedRxPacketProfile: "PKT_C",
        SoAdRxUpperLayerTarget: "DOIP",
        InjectedRxPayloadLengthBytes: 120,
        SoAdRxBufferMaxCapacityBytes: 2048
      });
      applySoAdInit(true);
      SoAd_OpenSoCon(3);
      SoAd_TcpConnected(3);
    },
    steps: [
      {
        title: "Bước 1: Nhận TCP mảnh 1 (PKT_C: 48/128B) -> Lưu đệm vào SoAdRxBuffer",
        exec() {
          cfg.SelectedRxPacketProfile = "PKT_C";
          cfg.InjectedRxPayloadLengthBytes = 120;
          SoAd_RxIndication("PKT_C", "PART1");
        }
      },
      {
        title: "Bước 2: Nhận TCP mảnh 2 (nốt 80B) -> Ghép đủ 128B -> DoIP_SoAdTpStartOfReception!",
        exec() {
          SoAd_RxIndication("PKT_C", "PART2");
        }
      },
      {
        title: "Bước 3: Nhận TCP Sticky Segment (PKT_D chứa 2 PDU dính liền 32B+32B)",
        exec() {
          cfg.SelectedRxPacketProfile = "PKT_D";
          cfg.SoAdRxUpperLayerTarget = "PDUR";
          SoAd_RxIndication("PKT_D");
        }
      },
      {
        title: "Bước 4: Nếu bị TCP_RESET giữa chừng -> Dọn sạch SoAdRxBuffer",
        exec() {
          SoAd_RxIndication("PKT_C", "PART1");
          SoAd_TcpIpEvent(3, "TCPIP_TCP_RESET");
        }
      }
    ],
    whatIfs: [
      {
        label: "What-If: Gói TCP vượt SoAdRxBufferMaxCapacityBytes -> Overflow",
        run() {
          cfg.SoAdRxBufferMaxCapacityBytes = 64;
          cfg.InjectedRxPayloadLengthBytes = 256;
          SoAd_RxIndication("PKT_C", "PART1");
        }
      },
      {
        label: "What-If: Đẩy thẳng đích Rx lên XCP",
        run() {
          cfg.SoAdRxBufferMaxCapacityBytes = 2048;
          cfg.SoAdRxUpperLayerTarget = "XCP";
          SoAd_RxIndication("PKT_D");
        }
      },
      {
        label: "What-If: Khôi phục TCP sau RESET (TcpConnected)",
        run() {
          SoAd_TcpConnected(3);
        }
      }
    ]
  },

  // ===================== NHÓM D: SD, RECOVERY, RUNTIME & DET =====================
  {
    id: "S9",
    group: "Nhóm D · SD Control, Recovery & DET",
    title: "S9: SOME/IP-SD RoutingGroup & IfRoutingGroupTransmit",
    summary: "Mô phỏng công tắc luồng RoutingGroup: khởi tạo DISABLED chặn PDU, sau đó Sd gọi EnableRouting + IfRoutingGroupTransmit để gửi Initial Event.",
    setup() {
      resetCfgToBaseline({
        SelectedSoConId: "0",
        SelectedRoutingGroupId: "RG_0",
        SoAdRoutingGroupIsEnabledAfterInit: false,
        SoAdRoutingGroupTxTriggerable: true
      });
      applySoAdInit(true);
      SoAd_OpenSoCon(0);
    },
    steps: [
      {
        title: "Bước 1: Thử gọi IfTransmit(PduRoute_0) khi RG_0=DISABLED -> Bị chặn (Bit B2=0)",
        exec() {
          SoAd_IfTransmit("PduRoute_0");
        }
      },
      {
        title: "Bước 2: Client Subscribe ACK -> Sd gọi SoAd_EnableRouting(RG_0) -> Bit B2=1",
        exec() {
          SoAd_EnableRouting("RG_0");
        }
      },
      {
        title: "Bước 3: Sd gọi SoAd_IfRoutingGroupTransmit(RG_0) + MainFunction -> Initial Event!",
        exec() {
          SoAd_IfRoutingGroupTransmit("RG_0");
          SoAd_MainFunction();
        }
      },
      {
        title: "Bước 4: Client Unsubscribe -> Sd gọi DisableRouting(RG_0) nhưng giữ Socket mở",
        exec() {
          SoAd_DisableRouting("RG_0");
        }
      }
    ],
    whatIfs: [
      {
        label: "What-If: Tắt TxTriggerable rồi gọi IfRoutingGroupTransmit",
        run() {
          cfg.SoAdRoutingGroupTxTriggerable = false;
          SoAd_IfRoutingGroupTransmit("RG_0");
        }
      },
      {
        label: "What-If: Bật lại RG_0 và truyền PduRoute_0 bình thường",
        run() {
          SoAd_EnableRouting("RG_0");
          SoAd_IfTransmit("PduRoute_0");
        }
      },
      {
        label: "What-If: Nhận Rx PDU khi RG_0 đang DISABLED",
        run() {
          SoAd_DisableRouting("RG_0");
          SoAd_RxIndication("PKT_A");
        }
      }
    ]
  },

  {
    id: "S10",
    group: "Nhóm D · SD Control, Recovery & DET",
    title: "S10: TcpIpEvent (TCP_RESET/FIN) & LocalIpAddrAssignmentChg Recovery",
    summary: "Xử lý sự cố mất liên kết Ethernet: TCP Reset đột ngột hoặc DHCP rút IP (UNASSIGNED) gây abort TP, rơi về RECONNECT và tự hồi phục khi cấp lại IP.",
    setup() {
      resetCfgToBaseline({
        SelectedSoConId: "3",
        SoAdSocketProtocolChoice: "TCP",
        InjectedTcpIpEventType: "TCPIP_TCP_RESET",
        ActiveLocalIpAddrState: "TCPIP_IPADDR_STATE_ASSIGNED"
      });
      applySoAdInit(true);
      SoAd_OpenSoCon(3);
      SoAd_TcpConnected(3);
    },
    steps: [
      {
        title: "Bước 1: Mở phiên TP Tx (PduRoute_1) đang truyền dở 600/1200B",
        exec() {
          SoAd_TpTransmit("PduRoute_1");
          SoAd_CopyTxData(600);
        }
      },
      {
        title: "Bước 2: TcpIp báo SoAd_TcpIpEvent(TCP_RESET) -> Abort TP, SoCon về RECONNECT",
        exec() {
          SoAd_TcpIpEvent(3, "TCPIP_TCP_RESET");
        }
      },
      {
        title: "Bước 3: IP chuyển UNASSIGNED (Mất link/DHCP) -> Bịt mọi socket khỏi ONLINE",
        exec() {
          SoAd_LocalIpAddrAssignmentChg("TCPIP_IPADDR_STATE_UNASSIGNED");
        }
      },
      {
        title: "Bước 4: Link trở lại ASSIGNED + TcpConnected() -> Hồi phục ONLINE!",
        exec() {
          SoAd_LocalIpAddrAssignmentChg("TCPIP_IPADDR_STATE_ASSIGNED");
          SoAd_TcpConnected(3);
        }
      }
    ],
    whatIfs: [
      {
        label: "What-If: IP chuyển sang ONHOLD tạm thời",
        run() {
          SoAd_LocalIpAddrAssignmentChg("TCPIP_IPADDR_STATE_ONHOLD");
        }
      },
      {
        label: "What-If: Nhận TCPIP_TCP_FIN_RECEIVED đóng êm",
        run() {
          SoAd_TcpIpEvent(3, "TCPIP_TCP_FIN_RECEIVED");
        }
      },
      {
        label: "What-If: Chạy MainFunction kiểm tra KeepAlive / Reconnect",
        run() {
          SoAd_MainFunction();
        }
      }
    ]
  },

  {
    id: "S11",
    group: "Nhóm D · SD Control, Recovery & DET",
    title: "S11: SoAd_TpCancelTransmit, ChangeParameter & Runtime Tuning",
    summary: "Kiểm soát phiên TP giữa chừng qua TpCancelTransmit, tinh chỉnh VLAN PCP / TCP NoDelay / KeepAlive bằng ChangeParameter và đọc Local/PhysAddr.",
    setup() {
      resetCfgToBaseline({
        SelectedSoConId: "3",
        SoAdSocketProtocolChoice: "TCP",
        SoAdSocketFramePriorityVlanPcp: 3,
        SoAdSocketTcpNoDelayAndKeepAlive: true
      });
      applySoAdInit(true);
      SoAd_OpenSoCon(3);
      SoAd_TcpConnected(3);
    },
    steps: [
      {
        title: "Bước 1: Gọi ChangeParameter(SoCon_3) áp VLAN PCP=6 & NoDelay=TRUE",
        exec() {
          cfg.SoAdSocketFramePriorityVlanPcp = 6;
          SoAd_ChangeParameter(3);
        }
      },
      {
        title: "Bước 2: Khởi tạo TP Tx và copy 600B đầu tiên",
        exec() {
          SoAd_TpTransmit("PduRoute_1");
          SoAd_CopyTxData(600);
        }
      },
      {
        title: "Bước 3: PduR/Dcm đổi ý -> Gọi SoAd_TpCancelTransmit(PduRoute_1) hủy phiên TP",
        exec() {
          SoAd_TpCancelTransmit("PduRoute_1");
        }
      },
      {
        title: "Bước 4: DoIP hỏi lại SoAd_ReleaseRemoteAddr / GetVersionInfo",
        exec() {
          SoAd_GetVersionInfo(false);
        }
      }
    ],
    whatIfs: [
      {
        label: "What-If: Gọi TpCancelTransmit khi không có TP nào chạy",
        run() {
          SoAd_TpCancelTransmit("PduRoute_1");
        }
      },
      {
        label: "What-If: Đổi VLAN PCP về 0 (Best-Effort)",
        run() {
          cfg.SoAdSocketFramePriorityVlanPcp = 0;
          SoAd_ChangeParameter(3);
        }
      },
      {
        label: "What-If: Gọi GetVersionInfo với NULL_PTR (DET 0x02)",
        run() {
          SoAd_GetVersionInfo(true);
        }
      }
    ]
  },

  {
    id: "S12",
    group: "Nhóm D · SD Control, Recovery & DET",
    title: "S12: DET Errors, IdsM Security Events & GetAndResetMeasurementData",
    summary: "Kích hoạt các lỗi DET chuẩn (NOTINIT, INV_PDUID, PARAM_POINTER), Runtime Error (NOBUFS, INV_PDUHEADER_ID), IdsM Security Event và đọc xóa bộ đếm rớt gói.",
    setup() {
      resetCfgToBaseline({
        SoAdDevErrorDetect: true,
        SoAdGetAndResetMeasurementDataApi: true,
        SoAdEnableSecurityEventReporting: true,
        SoAdVersionInfoApi: true
      });
      applySoAdInit(true);
      SoAd_OpenSoCon(0);
    },
    steps: [
      {
        title: "Bước 1: Gửi PduId sai với DET=TRUE -> Det_ReportError(56, SOAD_E_INV_PDUID)",
        exec() {
          cfg.PassInvalidArgOrUninitForDetTest = true;
          SoAd_IfTransmit("PduRoute_0");
          cfg.PassInvalidArgOrUninitForDetTest = false;
        }
      },
      {
        title: "Bước 2: Bơm Unknown HeaderId -> SOAD_E_INV_PDUHEADER_ID + IdsM + DROP_UDP",
        exec() {
          SoAd_RxIndication("PKT_E");
        }
      },
      {
        title: "Bước 3: Ép cạn buffer TcpIp -> SOAD_E_NOBUFS (0x04) + DROP_UDP",
        exec() {
          cfg.SimulateTcpIpBufferBusyOrNoBufs = true;
          SoAd_IfTransmit("PduRoute_0");
          cfg.SimulateTcpIpBufferBusyOrNoBufs = false;
        }
      },
      {
        title: "Bước 4: Gọi SoAd_GetAndResetMeasurementData() -> Đọc DROP và xóa về 0",
        exec() {
          SoAd_GetAndResetMeasurementData();
        }
      }
    ],
    whatIfs: [
      {
        label: "What-If: Tắt SoAdDevErrorDetect -> Bỏ qua lỗi Dev",
        run() {
          cfg.SoAdDevErrorDetect = false;
          cfg.PassInvalidArgOrUninitForDetTest = true;
          SoAd_IfTransmit("PduRoute_0");
          cfg.PassInvalidArgOrUninitForDetTest = false;
          cfg.SoAdDevErrorDetect = true;
        }
      },
      {
        label: "What-If: Gọi API khi chưa SoAd_Init (SOAD_E_NOTINIT)",
        run() {
          sim.initialized = false;
          SoAd_OpenSoCon(0);
          sim.initialized = true;
        }
      },
      {
        label: "What-If: Tắt GetAndResetMeasurementDataApi rồi gọi",
        run() {
          cfg.SoAdGetAndResetMeasurementDataApi = false;
          SoAd_GetAndResetMeasurementData();
          cfg.SoAdGetAndResetMeasurementDataApi = true;
        }
      }
    ]
  }
];
