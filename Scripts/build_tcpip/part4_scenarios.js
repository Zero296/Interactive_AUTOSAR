// ================= PART 4B: 12 INTERACTIVE SCENARIOS (S1-S12) & 36 WHAT-IF ACTIONS =================

const SCENARIOS = [
  {
    id: "S1",
    group: "Nhóm 1: Khởi động EthSM, Cấp phát IP & UDP",
    title: "S1: Khởi động kênh Ethernet (EthSM -> TcpIp_RequestComMode) & Cấp phát IP (Static / AutoIP / DHCP)",
    summary: "Minh họa quy trình EthSM kích hoạt TcpIp từ OFFLINE ➔ STARTUP ➔ ONLINE, cấp phát IP (STATIC, AutoIP 169.254.x.x RFC 3927, hoặc DHCP DORA) và báo SoAd_LocalIpAddrAssignmentChg().",
    setup: function () {
      cfg = Object.assign({}, defaultConfig, {
        ActiveCtrlState: "TCPIP_STATE_OFFLINE",
        TcpIpAssignmentMethod: "TCPIP_IPADDR_ASSIGNMENT_STATIC",
        TcpIpAssignmentTrigger: "TCPIP_AUTOMATIC"
      });
      sim = createInitialSimState();
      sim.ctrlState = "TCPIP_STATE_OFFLINE";
      updateRegistersAfter();
    },
    steps: [
      {
        label: "Bước 1: ComM/EthSM kiểm tra EthTrcv Link UP & gọi TcpIp_RequestComMode(ONLINE)",
        run: function () {
          sim.phyLinkUp = true;
          api_TcpIp_RequestComMode(0, "TCPIP_STATE_ONLINE");
        }
      },
      {
        label: "Bước 2: So sánh AutoIP Link-Local DoIP (169.254.10.50 RFC 3927 + Lưu NvM)",
        run: function () {
          cfg.TcpIpAssignmentMethod = "TCPIP_IPADDR_ASSIGNMENT_LINKLOCAL_DOIP";
          api_TcpIp_RequestIpAddrAssignment(0, "TCPIP_IPADDR_ASSIGNMENT_LINKLOCAL_DOIP");
        }
      },
      {
        label: "Bước 3: Chuyển sang DHCP DORA (Discover -> Offer -> Request -> Ack)",
        run: function () {
          cfg.TcpIpAssignmentMethod = "TCPIP_IPADDR_ASSIGNMENT_DHCP";
          api_TcpIp_RequestIpAddrAssignment(0, "TCPIP_IPADDR_ASSIGNMENT_DHCP");
        }
      },
      {
        label: "Bước 4: Thu hồi IP (TcpIp_ReleaseIpAddrAssignment) & Cấp lại IP Tĩnh",
        run: function () {
          api_TcpIp_ReleaseIpAddrAssignment(0);
          cfg.TcpIpAssignmentMethod = "TCPIP_IPADDR_ASSIGNMENT_STATIC";
          api_TcpIp_RequestIpAddrAssignment(0, "TCPIP_IPADDR_ASSIGNMENT_STATIC");
        }
      }
    ],
    whatIfs: [
      {
        label: "🔄 Đổi Method (STATIC / AUTOIP / DHCP)",
        run: function () {
          const order = ["TCPIP_IPADDR_ASSIGNMENT_STATIC", "TCPIP_IPADDR_ASSIGNMENT_LINKLOCAL_DOIP", "TCPIP_IPADDR_ASSIGNMENT_DHCP"];
          const next = order[(order.indexOf(cfg.TcpIpAssignmentMethod) + 1) % order.length];
          cfg.TcpIpAssignmentMethod = next;
          api_TcpIp_RequestIpAddrAssignment(0, next);
        }
      },
      {
        label: "🖐️ Đổi Trigger sang TCPIP_MANUAL",
        run: function () {
          cfg.TcpIpAssignmentTrigger = "TCPIP_MANUAL";
          api_TcpIp_ReleaseIpAddrAssignment(0);
          sim.stepNarrative = "<b>Trigger = TCPIP_MANUAL:</b> Địa chỉ IP giữ nguyên ở <code>UNASSIGNED</code> chờ ứng dụng gọi <code>TcpIp_RequestIpAddrAssignment()</code>.";
        }
      },
      {
        label: "🔓 Gọi ReleaseIpAddrAssignment(0)",
        run: function () {
          api_TcpIp_ReleaseIpAddrAssignment(0);
        }
      }
    ]
  },
  {
    id: "S2",
    group: "Nhóm 1: Khởi động EthSM, Cấp phát IP & UDP",
    title: "S2: Truyền UDP (SOME/IP Event) Zero-Copy khi ARP Cache Miss (ArpPendingQueue -> ARP Reply)",
    summary: "Theo dõi tình huống SoAd gọi TcpIp_UdpTransmit() gặp ARP Cache Miss: TcpIp đẩy gói vào ArpPendingQueue, hạ Bit 3 = 0, phát ARP Request và xả gói Zero-Copy ngay khi nhận ARP Reply!",
    setup: function () {
      cfg = Object.assign({}, defaultConfig, {
        ActiveCtrlState: "TCPIP_STATE_ONLINE",
        SimulateArpCacheMiss: true,
        ForceCopyTxDataViaSoAd: true,
        SelectedSocketProfile: "1",
        RemoteIpAndPortEndpoint: "192.168.10.200:30490"
      });
      sim = createInitialSimState();
      api_TcpIp_RequestComMode(0, "TCPIP_STATE_ONLINE");
      sim.arpCache = sim.arpCache.filter(function (e) { return e.ip !== "192.168.10.200"; });
      updateRegistersAfter();
    },
    steps: [
      {
        label: "Bước 1: SoAd cấp & gắn Sock_1 (UDP Port 30490) qua GetSocket + Bind",
        run: function () {
          api_TcpIp_SoAdGetSocket(1, "UDP");
          api_TcpIp_Bind(1, 0, 30490);
        }
      },
      {
        label: "Bước 2: SoAd gọi TcpIp_UdpTransmit() -> Gặp ARP Cache Miss -> Vào ArpPendingQueue!",
        run: function () {
          api_TcpIp_UdpTransmit(1, 64, "192.168.10.200:30490");
        }
      },
      {
        label: "Bước 3: Nhận ARP Reply từ 192.168.10.200 -> Xả hàng đợi qua Zero-Copy DMA!",
        run: function () {
          api_TcpIp_RxIndication("ARP_REPLY", { targetIp: "192.168.10.200", mac: "00:11:22:33:44:C8" });
        }
      }
    ],
    whatIfs: [
      {
        label: "⚡ Tắt ARP Miss & Gửi UDP thẳng 1 nhịp",
        run: function () {
          cfg.SimulateArpCacheMiss = false;
          if (!sim.arpCache.find(function (e) { return e.ip === "192.168.10.200"; })) {
            sim.arpCache.push({ ip: "192.168.10.200", mac: "00:11:22:33:44:C8", state: "REACHABLE", ttlSec: 60, conflict: false });
          }
          api_TcpIp_UdpTransmit(1, 64, "192.168.10.200:30490");
        }
      },
      {
        label: "🔀 Đảo ForceCopyTxDataViaSoAd (NULL_PTR vs Buf)",
        run: function () {
          cfg.ForceCopyTxDataViaSoAd = !cfg.ForceCopyTxDataViaSoAd;
          cfg.SimulateArpCacheMiss = false;
          api_TcpIp_UdpTransmit(1, 64, "192.168.10.200:30490");
        }
      },
      {
        label: "📥 Bơm ARP Reply xả ArpPendingQueue",
        run: function () {
          api_TcpIp_RxIndication("ARP_REPLY", { targetIp: "192.168.10.200", mac: "00:11:22:33:44:C8" });
        }
      }
    ]
  },
  {
    id: "S3",
    group: "Nhóm 1: Khởi động EthSM, Cấp phát IP & UDP",
    title: "S3: Nhận UDP Unicast & UDP Multicast (SOME/IP-SD 224.224.224.245 với IGMPv2 & MAC Filter)",
    summary: "Phân tích cách TcpIp mở bộ lọc phần cứng EthIf_UpdatePhysAddrFilter() cho Multicast, nhận khung qua TcpIp_RxIndication(), kiểm tra Checksum / Port và định tuyến lên SoAd -> Sd.",
    setup: function () {
      cfg = Object.assign({}, defaultConfig, {
        ActiveCtrlState: "TCPIP_STATE_ONLINE",
        SelectedSocketProfile: "2",
        HwChecksumOffloadEnabled: true
      });
      sim = createInitialSimState();
      api_TcpIp_RequestComMode(0, "TCPIP_STATE_ONLINE");
      updateRegistersAfter();
    },
    steps: [
      {
        label: "Bước 1: Bind Sock_2 Multicast -> IGMPv2 Report & EthIf_UpdatePhysAddrFilter()",
        run: function () {
          api_TcpIp_SoAdGetSocket(2, "UDP");
          api_TcpIp_Bind(2, 1, 30490);
        }
      },
      {
        label: "Bước 2: Nhận SOME/IP-SD OfferService (224.224.224.245:30490) lên SoAd -> Sd",
        run: function () {
          api_TcpIp_RxIndication("UDP_SOMEIP_SD");
        }
      },
      {
        label: "Bước 3: Nhận UDP tới Port lạ 9999 -> Tự động trả ICMP Port Unreachable (T3 C3)",
        run: function () {
          api_TcpIp_RxIndication("UDP_PORT_9999");
        }
      }
    ],
    whatIfs: [
      {
        label: "❓ Bơm UDP tới Port lạ 9999",
        run: function () {
          api_TcpIp_RxIndication("UDP_PORT_9999");
        }
      },
      {
        label: "⚠️ Tắt HW Offload + Bơm UDP sai Checksum",
        run: function () {
          cfg.HwChecksumOffloadEnabled = false;
          api_TcpIp_RxIndication("UDP_SOMEIP_SD", { badChecksum: true });
        }
      },
      {
        label: "📤 Gửi SOME/IP-SD OfferService ra Multicast",
        run: function () {
          api_TcpIp_UdpTransmit(2, 48, "224.224.224.245:30490");
        }
      }
    ]
  },
  {
    id: "S4",
    group: "Nhóm 2: Kết nối TCP 3-Way Handshake, Stream & Đóng FIN/RST",
    title: "S4: Thiết lập TCP 3-Way Handshake (SYN -> SYN+ACK -> ACK) cho Client & Server Listen",
    summary: "So sánh khởi tạo chủ động TCP Client (TcpIp_TcpConnect -> SYN_SENT -> ESTABLISHED -> SoAd_TcpConnected) và thụ động TCP Server (TcpIp_TcpListen -> SoAd_TcpAccepted).",
    setup: function () {
      cfg = Object.assign({}, defaultConfig, {
        ActiveCtrlState: "TCPIP_STATE_ONLINE",
        SelectedSocketProfile: "0",
        TcpIpCtrlMtu: 1500
      });
      sim = createInitialSimState();
      api_TcpIp_RequestComMode(0, "TCPIP_STATE_ONLINE");
      updateRegistersAfter();
    },
    steps: [
      {
        label: "Bước 1: Client gọi TcpIp_TcpConnect(Sock_0) -> SYN_SENT (Bit 1 TCP_SYN = 1)",
        run: function () {
          api_TcpIp_SoAdGetSocket(0, "TCP");
          api_TcpIp_Bind(0, 0, 49152);
          api_TcpIp_TcpConnect(0, "192.168.10.100:13400");
        }
      },
      {
        label: "Bước 2: Nhận SYN+ACK từ DoIP Server -> Trả ACK -> ESTABLISHED & SoAd_TcpConnected()",
        run: function () {
          api_TcpIp_RxIndication("TCP_SYN_ACK", { sockId: 0, skipTls: true });
        }
      },
      {
        label: "Bước 3: Server mở cổng thụ động TcpIp_TcpListen(Sock_3, MaxCh=2) -> LISTEN",
        run: function () {
          api_TcpIp_SoAdGetSocket(3, "TCP");
          api_TcpIp_Bind(3, 0, 13400);
          api_TcpIp_TcpListen(3, 2);
        }
      },
      {
        label: "Bước 4: Nhận SYN từ Tester -> Chấp nhận kết nối mới qua SoAd_TcpAccepted()",
        run: function () {
          api_ServerAcceptIncomingSyn(3, 0, false);
        }
      }
    ],
    whatIfs: [
      {
        label: "🖥️ Thử Server Accept (TcpListen -> Accept)",
        run: function () {
          api_TcpIp_TcpListen(3, 2);
          api_ServerAcceptIncomingSyn(3, 0, false);
        }
      },
      {
        label: "🚫 Giả lập Port đóng (Nhận RST+ACK -> DEM)",
        run: function () {
          cfg.SimulateNetworkFaultForDem = true;
          api_TcpIp_TcpConnect(0, "192.168.10.100:13400");
          cfg.SimulateNetworkFaultForDem = false;
        }
      },
      {
        label: "📉 Giảm MTU=576 -> Bắt tay với MSS=536B",
        run: function () {
          cfg.TcpIpCtrlMtu = 576;
          api_TcpIp_TcpConnect(0, "192.168.10.100:13400");
        }
      }
    ]
  },
  {
    id: "S5",
    group: "Nhóm 2: Kết nối TCP 3-Way Handshake, Stream & Đóng FIN/RST",
    title: "S5: Luồng TCP Stream Tin Cậy (SoAd_CopyTxData, Nagle, MSS & Cửa Sổ Trượt TcpIp_TcpReceived)",
    summary: "Phân tích cắt đoạn MSS = 1460B khi gửi gói 2000B, thuật toán Nagle gom gói nhỏ, xác nhận SoAd_TxConfirmation() và bẫy ZeroWindow nếu quên gọi TcpIp_TcpReceived().",
    setup: function () {
      cfg = Object.assign({}, defaultConfig, {
        ActiveCtrlState: "TCPIP_STATE_ONLINE",
        TcpIpTcpNagleEnabled: false,
        TcpIpCtrlMtu: 1500,
        TcpIpTcpReceiveWindowMax: 4096,
        TxPayloadByteLength: 2000
      });
      sim = createInitialSimState();
      api_TcpIp_RequestComMode(0, "TCPIP_STATE_ONLINE");
      sim.sockets[0].state = "ESTABLISHED";
      updateRegistersAfter();
    },
    steps: [
      {
        label: "Bước 1: TcpIp_TcpTransmit(2000B) -> Cắt 2 đoạn MSS (1460B + 540B) via SoAd_CopyTxData()",
        run: function () {
          api_TcpIp_TcpTransmit(0, 2000);
        }
      },
      {
        label: "Bước 2: Nhận ACK xác nhận từ Remote -> Giải phóng Tx & gọi SoAd_TxConfirmation()",
        run: function () {
          api_TcpIp_RxIndication("TCP_ACK", { sockId: 0 });
        }
      },
      {
        label: "Bước 3: Nhận 2048B + 2048B nhưng chưa gọi TcpIp_TcpReceived() -> Window tụt về 0 [ZeroWindow]!",
        run: function () {
          api_TcpIp_RxIndication("TCP_DATA", { sockId: 0, len: 2048 });
          api_TcpIp_RxIndication("TCP_DATA", { sockId: 0, len: 2048 });
        }
      },
      {
        label: "Bước 4: SoAd xử lý xong & gọi TcpIp_TcpReceived(Sock_0, 4096) -> Mở lại cửa sổ 4096B!",
        run: function () {
          api_TcpIp_TcpReceived(0, 4096);
        }
      }
    ],
    whatIfs: [
      {
        label: "📦 Bật/Tắt Nagle & Gửi 2 gói nhỏ 32B",
        run: function () {
          cfg.TcpIpTcpNagleEnabled = !cfg.TcpIpTcpNagleEnabled;
          api_TcpIp_TcpTransmit(0, 32);
          api_TcpIp_TcpTransmit(0, 32);
        }
      },
      {
        label: "📥 Nhận 2048B KHÔNG gọi TcpReceived",
        run: function () {
          api_TcpIp_RxIndication("TCP_DATA", { sockId: 0, len: 2048 });
        }
      },
      {
        label: "🪟 Gọi TcpIp_TcpReceived(Sock_0, 2048)",
        run: function () {
          api_TcpIp_TcpReceived(0, 2048);
        }
      }
    ]
  },
  {
    id: "S6",
    group: "Nhóm 2: Kết nối TCP 3-Way Handshake, Stream & Đóng FIN/RST",
    title: "S6: Đóng Kết Nối TCP: Đóng Êm Dịu 4-Way FIN Teardown (Abort=FALSE) vs Cưỡng Bức RST (Abort=TRUE)",
    summary: "So sánh trực tiếp TcpIp_Close(SockId, Abort=FALSE) đi qua FIN_WAIT_1 -> TIME_WAIT (2×MSL) với TcpIp_Close(Abort=TRUE) bắn ngay cờ RST (Bit 2=1) xóa Socket tức thì.",
    setup: function () {
      cfg = Object.assign({}, defaultConfig, {
        ActiveCtrlState: "TCPIP_STATE_ONLINE",
        TcpCloseAbortWithRst: false
      });
      sim = createInitialSimState();
      api_TcpIp_RequestComMode(0, "TCPIP_STATE_ONLINE");
      sim.sockets[0].state = "ESTABLISHED";
      updateRegistersAfter();
    },
    steps: [
      {
        label: "Bước 1: Gọi TcpIp_Close(Sock_0, Abort=FALSE) -> Gửi FIN+ACK, vào FIN_WAIT_1",
        run: function () {
          api_TcpIp_Close(0, false);
        }
      },
      {
        label: "Bước 2: Nhận FIN+ACK từ đối tác -> Trả ACK cuối & Chờ TIME_WAIT (2×MSL)",
        run: function () {
          api_TcpIp_RxIndication("TCP_FIN", { sockId: 0 });
        }
      },
      {
        label: "Bước 3: Chạy TcpIp_MainFunction() hết TIME_WAIT -> Đóng sạch về CLOSED",
        run: function () {
          for (let i = 0; i < 4; i++) api_TcpIp_MainFunction();
        }
      },
      {
        label: "Bước 4: Thử Abort=TRUE -> Phát ngay RST (Bit 2 TCP_RST=1) xóa tức khắc không TIME_WAIT!",
        run: function () {
          sim.sockets[0].state = "ESTABLISHED";
          cfg.TcpCloseAbortWithRst = true;
          api_TcpIp_Close(0, true);
        }
      }
    ],
    whatIfs: [
      {
        label: "🔒 Đổi Abort (FIN vs RST) & Đóng ngay",
        run: function () {
          sim.sockets[0].state = "ESTABLISHED";
          cfg.TcpCloseAbortWithRst = !cfg.TcpCloseAbortWithRst;
          api_TcpIp_Close(0, cfg.TcpCloseAbortWithRst);
        }
      },
      {
        label: "📥 Remote gửi FIN (Passive Close -> CLOSE_WAIT)",
        run: function () {
          sim.sockets[0].state = "ESTABLISHED";
          api_TcpIp_RxIndication("TCP_FIN", { sockId: 0 });
        }
      },
      {
        label: "⏱️ Tick MainFn chạy hết TIME_WAIT -> CLOSED",
        run: function () {
          for (let i = 0; i < 4; i++) api_TcpIp_MainFunction();
        }
      }
    ]
  },
  {
    id: "S7",
    group: "Nhóm 3: TCP Retransmission, Fragmentation, ICMP & ChangeParam",
    title: "S7: Tự Phục Hồi Mất Gói TCP: Retransmission Timer (RTO), Fast Retransmit (3x Dup-ACK) & Keep-Alive",
    summary: "Theo dõi TcpIp_MainFunction() xử lý bộ đếm RTO (Exponential Backoff), kích hoạt Fast Retransmit ngay khi nhận đủ 3 Duplicate ACK và báo DEM TCPIP_E_TIMEDOUT khi quá MaxRtx.",
    setup: function () {
      cfg = Object.assign({}, defaultConfig, {
        ActiveCtrlState: "TCPIP_STATE_ONLINE",
        TcpIpTcpMaxRtx: 3,
        TcpIpTcpRetransmissionTimeoutMs: 200,
        TcpIpTcpKeepAliveEnabled: true
      });
      sim = createInitialSimState();
      api_TcpIp_RequestComMode(0, "TCPIP_STATE_ONLINE");
      sim.sockets[0].state = "ESTABLISHED";
      updateRegistersAfter();
    },
    steps: [
      {
        label: "Bước 1: Gửi TCP 64B nhưng gói bị mất trên Switch -> Bắt đầu đếm ngược RTO",
        run: function () {
          sim.dropNextTxForRtxTest = true;
          api_TcpIp_TcpTransmit(0, 64);
        }
      },
      {
        label: "Bước 2: Hết RTO trong TcpIp_MainFunction() -> Tái truyền lần #1 (Backoff 400ms)",
        run: function () {
          for (let i = 0; i < 4; i++) api_TcpIp_MainFunction();
        }
      },
      {
        label: "Bước 3: Nhận 3x Duplicate ACK liên tiếp -> Fast Retransmit tức thì trước khi hết RTO!",
        run: function () {
          api_TcpIp_RxIndication("TCP_DUP_ACK", { sockId: 0, count: 3 });
        }
      },
      {
        label: "Bước 4: Đứt mạng hoàn toàn vượt quá TcpIpTcpMaxRtx (3) -> Reset & Báo DEM TIMEDOUT!",
        run: function () {
          sim.sockets[0].rtxCount = 3;
          sim.sockets[0].rtoRemainingMs = 10;
          api_TcpIp_MainFunction();
        }
      }
    ],
    whatIfs: [
      {
        label: "⏱️ +4 Ticks MainFn kích RTO Retransmit",
        run: function () {
          for (let i = 0; i < 4; i++) api_TcpIp_MainFunction();
        }
      },
      {
        label: "⚡ Bơm 3x Duplicate ACK (Fast Retransmit)",
        run: function () {
          sim.sockets[0].state = "ESTABLISHED";
          api_TcpIp_RxIndication("TCP_DUP_ACK", { sockId: 0, count: 3 });
        }
      },
      {
        label: "💓 Kích Keep-Alive Probe (3 Ticks Idle)",
        run: function () {
          cfg.TcpIpTcpKeepAliveEnabled = true;
          sim.sockets[0].state = "ESTABLISHED";
          sim.sockets[0].unackedLen = 0;
          for (let i = 0; i < 3; i++) api_TcpIp_MainFunction();
        }
      }
    ]
  },
  {
    id: "S8",
    group: "Nhóm 3: TCP Retransmission, Fragmentation, ICMP & ChangeParam",
    title: "S8: Gói UDP Lớn Vượt MTU 1500B (2800B): Phân Mảnh IPv4 (MF=1, FragOffset) & Tái Hợp Reassembly",
    summary: "Chứng kiến phép tính cắt mảnh IPv4 (ID=0x4A12, Offset bội số 8 bytes), tác động chặn truyền khi bật cờ DF=1 (Bit 7), và ghép lại tại ReassemblyBuffer chiều nhận.",
    setup: function () {
      cfg = Object.assign({}, defaultConfig, {
        ActiveCtrlState: "TCPIP_STATE_ONLINE",
        TcpIpCtrlMtu: 1500,
        TxPayloadByteLength: 2800,
        SetIpDontFragmentFlagDf: false,
        TcpIpIpReassemblyAndFragEnabled: true,
        SimulateArpCacheMiss: false
      });
      sim = createInitialSimState();
      api_TcpIp_RequestComMode(0, "TCPIP_STATE_ONLINE");
      updateRegistersAfter();
    },
    steps: [
      {
        label: "Bước 1: Truyền UDP 2800B qua MTU 1500B (DF=0) -> Tự động cắt thành 2 mảnh IPv4!",
        run: function () {
          api_TcpIp_UdpTransmit(1, 2800, "192.168.10.200:30490");
        }
      },
      {
        label: "Bước 2: Bật thử DF=1 (Don't Fragment) -> TcpIp chặn truyền & báo TCPIP_E_MSGSIZE!",
        run: function () {
          cfg.SetIpDontFragmentFlagDf = true;
          api_TcpIp_UdpTransmit(1, 2800, "192.168.10.200:30490");
        }
      },
      {
        label: "Bước 3: Chiều nhận ghép 2 mảnh (Frag#1 MF=1 + Frag#2 MF=0) -> Đẩy 2800B lên SoAd!",
        run: function () {
          cfg.SetIpDontFragmentFlagDf = false;
          sim.errFlag = false;
          api_TcpIp_RxIndication("UDP_FRAG_PAIR");
        }
      }
    ],
    whatIfs: [
      {
        label: "🛑 Bật DF=1 & Truyền 2800B (Xem khóa truyền)",
        run: function () {
          cfg.SetIpDontFragmentFlagDf = true;
          api_TcpIp_UdpTransmit(1, 2800, "192.168.10.200:30490");
        }
      },
      {
        label: "✂️ Giảm MTU=576 & Truyền 1400B (3 Mảnh!)",
        run: function () {
          cfg.SetIpDontFragmentFlagDf = false;
          cfg.TcpIpCtrlMtu = 576;
          api_TcpIp_UdpTransmit(1, 1400, "192.168.10.200:30490");
        }
      },
      {
        label: "🚫 Tắt Reassembly & Bơm mảnh Rx (Bị hủy)",
        run: function () {
          cfg.TcpIpIpReassemblyAndFragEnabled = false;
          api_TcpIp_RxIndication("UDP_FRAG_PAIR");
        }
      }
    ]
  },
  {
    id: "S9",
    group: "Nhóm 3: TCP Retransmission, Fragmentation, ICMP & ChangeParam",
    title: "S9: Giao Thức ICMP (Ping Echo Reply & TcpIp_IcmpTransmit) & Đổi Nóng Tham Số TcpIp_ChangeParameter()",
    summary: "Thử nghiệm tự động trả lời ICMP Ping tại tầng IP không qua SoAd và đổi nóng TTL, VLAN 802.1Q PCP, TCP Nagle lúc đang chạy bằng TcpIp_ChangeParameter().",
    setup: function () {
      cfg = Object.assign({}, defaultConfig, {
        ActiveCtrlState: "TCPIP_STATE_ONLINE",
        TcpIpIcmpEchoReplyEnabled: true,
        ChangeParamIdSelector: "TCPIP_PARAMID_FRAMEPRIO"
      });
      sim = createInitialSimState();
      api_TcpIp_RequestComMode(0, "TCPIP_STATE_ONLINE");
      sim.sockets[0].state = "ESTABLISHED";
      updateRegistersAfter();
    },
    steps: [
      {
        label: "Bước 1: Tester gửi Ping (ICMP Type 8 Echo Request) -> TcpIp tự trả Echo Reply!",
        run: function () {
          api_TcpIp_RxIndication("ICMP_ECHO_REQ");
        }
      },
      {
        label: "Bước 2: Đổi nóng VLAN Priority PCP 4 -> 6 qua TcpIp_ChangeParameter(FRAMEPRIO)",
        run: function () {
          api_TcpIp_ChangeParameter(0, "TCPIP_PARAMID_FRAMEPRIO", 6);
        }
      },
      {
        label: "Bước 3: Đổi nóng IP TTL 64 -> 1 & CDD gọi chủ động TcpIp_IcmpTransmit()",
        run: function () {
          api_TcpIp_ChangeParameter(0, "TCPIP_PARAMID_TTL", 1);
          api_TcpIp_IcmpTransmit(1, 8, 0);
        }
      }
    ],
    whatIfs: [
      {
        label: "🏓 Bơm gói ICMP Ping Request",
        run: function () {
          api_TcpIp_RxIndication("ICMP_ECHO_REQ");
        }
      },
      {
        label: "🎛️ Gọi TcpIp_ChangeParameter(PCP/TTL)",
        run: function () {
          api_TcpIp_ChangeParameter(0, cfg.ChangeParamIdSelector);
        }
      },
      {
        label: "🔇 Tắt ICMP Echo Reply & Ping lại",
        run: function () {
          cfg.TcpIpIcmpEchoReplyEnabled = false;
          api_TcpIp_RxIndication("ICMP_ECHO_REQ");
        }
      }
    ]
  },
  {
    id: "S10",
    group: "Nhóm 4: Bảo mật TLS, Trạng thái ONHOLD, IdsM & DET/DEM",
    title: "S10: Thiết Lập AUTOSAR TLS 1.3 (DoIP Port 3496): Phối Hợp TcpIp <-> KeyM (X.509) <-> Csm (AEAD)",
    summary: "Mô phỏng đầy đủ kiến trúc bảo mật DoIP over TLS (UN R155): Gán TLS Connection, bắt tay TCP xong giữ lại để chạy TLS Handshake + KeyM_VerifyCertificate() + Csm_AEADEncrypt() (Bit 1 = 1).",
    setup: function () {
      cfg = Object.assign({}, defaultConfig, {
        ActiveCtrlState: "TCPIP_STATE_ONLINE",
        TcpIpTlsConnectionEnabled: true,
        SelectedSocketProfile: "3",
        RemoteIpAndPortEndpoint: "192.168.10.100:3496"
      });
      sim = createInitialSimState();
      api_TcpIp_RequestComMode(0, "TCPIP_STATE_ONLINE");
      updateRegistersAfter();
    },
    steps: [
      {
        label: "Bước 1: SoAd gán cấu hình TLS cho Sock_3 qua TCPIP_PARAMID_TLS_CONNECTION_ASSIGNMENT",
        run: function () {
          api_TcpIp_SoAdGetSocket(3, "TCP");
          api_TcpIp_Bind(3, 0, 3496);
          api_TcpIp_ChangeParameter(3, "TCPIP_PARAMID_TLS_CONNECTION_ASSIGNMENT", 1);
        }
      },
      {
        label: "Bước 2: Bắt tay TCP 3-Way trên Port 3496 -> Chuyển sang pha TLS Handshake!",
        run: function () {
          api_TcpIp_TcpConnect(3, "192.168.10.100:3496");
        }
      },
      {
        label: "Bước 3: KeyM_VerifyCertificate() + Csm_KeyExchangeCalcSecret() -> Bật Bit 1 TLS_ACTV = 1!",
        run: function () {
          api_TcpIp_RxIndication("TCP_SYN_ACK", { sockId: 3, badCert: false });
        }
      },
      {
        label: "Bước 4: Truyền DoIP UDS qua kênh TLS -> Mã hóa Csm_AEADEncrypt() (Header 17 03 03)",
        run: function () {
          api_TcpIp_TcpTransmit(3, 64);
        }
      }
    ],
    whatIfs: [
      {
        label: "❌ Giả lập X.509 Cert hết hạn / Sai CA!",
        run: function () {
          api_RunTlsHandshake(3, true);
        }
      },
      {
        label: "🔐 Bật/Tắt TLS Connection & Truyền lại",
        run: function () {
          cfg.TcpIpTlsConnectionEnabled = !cfg.TcpIpTlsConnectionEnabled;
          sim.sockets[3].tlsAssigned = cfg.TcpIpTlsConnectionEnabled;
          sim.sockets[3].tlsHandshakeDone = cfg.TcpIpTlsConnectionEnabled;
          sim.sockets[3].state = "ESTABLISHED";
          sim.tlsActive = cfg.TcpIpTlsConnectionEnabled;
          api_TcpIp_TcpTransmit(3, 64);
        }
      },
      {
        label: "📤 Truyền DoIP đã mã hóa TLS (AEAD)",
        run: function () {
          api_RunTlsHandshake(3, false);
          api_TcpIp_TcpTransmit(3, 64);
        }
      }
    ]
  },
  {
    id: "S11",
    group: "Nhóm 4: Bảo mật TLS, Trạng thái ONHOLD, IdsM & DET/DEM",
    title: "S11: Xử Lý Mất PHY Link Tạm Thời TCPIP_STATE_ONHOLD (Bit 6=1) Đối Chiếu Với OFFLINE",
    summary: "Chứng minh giá trị của TCPIP_STATE_ONHOLD (SWS_TcpIp_00076): bảo toàn IP & Socket TCP ESTABLISHED khi nhiễu/rút cáp thoáng qua và phục hồi tức thì so với OFFLINE xóa sạch kết nối.",
    setup: function () {
      cfg = Object.assign({}, defaultConfig, {
        ActiveCtrlState: "TCPIP_STATE_ONLINE"
      });
      sim = createInitialSimState();
      api_TcpIp_RequestComMode(0, "TCPIP_STATE_ONLINE");
      sim.sockets[0].state = "ESTABLISHED";
      updateRegistersAfter();
    },
    steps: [
      {
        label: "Bước 1: Rớt PHY Link tạm thời -> EthSM gọi TcpIp_RequestComMode(TCPIP_STATE_ONHOLD)",
        run: function () {
          sim.phyLinkUp = false;
          api_TcpIp_RequestComMode(0, "TCPIP_STATE_ONHOLD");
        }
      },
      {
        label: "Bước 2: Thử gọi TcpIp_UdpTransmit trong khi ONHOLD -> Chặn TX nhưng GIỮ NGUYÊN Sock_0 ESTABLISHED!",
        run: function () {
          api_TcpIp_UdpTransmit(1, 64);
        }
      },
      {
        label: "Bước 3: Cắm cáp lại (PHY Link UP) -> Phục hồi tức thì về ONLINE giữ nguyên phiên DoIP!",
        run: function () {
          sim.phyLinkUp = true;
          sim.errFlag = false;
          api_TcpIp_RequestComMode(0, "TCPIP_STATE_ONLINE");
        }
      },
      {
        label: "Bước 4: Đối chiếu với TCPIP_STATE_OFFLINE -> Xóa sạch IP về UNASSIGNED & Đóng mọi Socket!",
        run: function () {
          api_TcpIp_RequestComMode(0, "TCPIP_STATE_OFFLINE");
        }
      }
    ],
    whatIfs: [
      {
        label: "🔌 Toggle PHY Link (ONLINE <-> ONHOLD)",
        run: function () {
          sim.phyLinkUp = !sim.phyLinkUp;
          api_TcpIp_RequestComMode(0, sim.phyLinkUp ? "TCPIP_STATE_ONLINE" : "TCPIP_STATE_ONHOLD");
        }
      },
      {
        label: "📨 Thử TcpIp_UdpTransmit lúc đang ONHOLD",
        run: function () {
          if (sim.ctrlState !== "TCPIP_STATE_ONHOLD") {
            sim.phyLinkUp = false;
            api_TcpIp_RequestComMode(0, "TCPIP_STATE_ONHOLD");
          }
          api_TcpIp_UdpTransmit(1, 64);
        }
      },
      {
        label: "⏻ Chuyển thẳng sang TCPIP_STATE_OFFLINE",
        run: function () {
          api_TcpIp_RequestComMode(0, "TCPIP_STATE_OFFLINE");
        }
      }
    ]
  },
  {
    id: "S12",
    group: "Nhóm 4: Bảo mật TLS, Trạng thái ONHOLD, IdsM & DET/DEM",
    title: "S12: Phòng Thủ An Ninh Mạng & Lỗi: Chống SYN Flood (SynCookies), ARP Spoofing -> IdsM, DEM & DET (170)",
    summary: "Kiểm chứng lớp phòng thủ toàn diện của TcpIp: SYN Cookies chống tràn bảng Socket + báo IdsM, phát hiện ARP Spoofing, báo lỗi DEM runtime và hàng rào DET (ModuleId 170 / 0x00AA).",
    setup: function () {
      cfg = Object.assign({}, defaultConfig, {
        ActiveCtrlState: "TCPIP_STATE_ONLINE",
        TcpIpSynCookiesEnabled: true,
        EnableIdsMSecurityReporting: true,
        TcpIpDevErrorDetect: true
      });
      sim = createInitialSimState();
      api_TcpIp_RequestComMode(0, "TCPIP_STATE_ONLINE");
      updateRegistersAfter();
    },
    steps: [
      {
        label: "Bước 1: Bơm bão gói TCP SYN Flood -> SYN Cookies ngăn tràn Socket & báo IdsM!",
        run: function () {
          api_InjectSynFlood();
        }
      },
      {
        label: "Bước 2: Nhận ARP Reply giả mạo IP Gateway -> Phát hiện ARP Spoofing -> IdsM!",
        run: function () {
          api_TcpIp_RxIndication("ARP_SPOOF");
        }
      },
      {
        label: "Bước 3: Bơm lỗi tham số (SocketId=99) -> Hàng rào Det_ReportError(170, 0, 0x06, TCPIP_E_INV_SOCK_ID)",
        run: function () {
          api_InjectDetFault();
        }
      },
      {
        label: "Bước 4: Giả lập đối tác từ chối kết nối (RST) -> Báo lỗi DEM TCPIP_E_CONNREFUSED",
        run: function () {
          cfg.PassInvalidSocketOrNullForDet = false;
          cfg.SimulateNetworkFaultForDem = true;
          api_TcpIp_TcpConnect(0, "192.168.10.100:13400");
        }
      }
    ],
    whatIfs: [
      {
        label: "🛡️ Bơm SYN Flood (Bật/Tắt SYN Cookies)",
        run: function () {
          api_InjectSynFlood();
        }
      },
      {
        label: "💥 Bơm Lỗi DET (ModuleId 170)",
        run: function () {
          api_InjectDetFault();
        }
      },
      {
        label: "🚨 Bơm Lỗi Mạng DEM (CONNREFUSED)",
        run: function () {
          cfg.PassInvalidSocketOrNullForDet = false;
          cfg.SimulateNetworkFaultForDem = true;
          api_TcpIp_TcpConnect(0, "192.168.10.100:13400");
        }
      }
    ]
  }
];
