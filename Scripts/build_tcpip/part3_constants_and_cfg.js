// ================= PART 3: CONSTANTS, BITFIELDS, SOCKETS/ADDRS, 36 CONFIG TOOLTIPS, MODULE INFO & GLOSSARY =================

const TCPIP_CTRL_IP_BITS = [
  { bit: 7, mask: 0x80, tag: "ONLINE",   name: "CTRL_ONLINE",   tone: "ok",   desc: "Bit 7 = 1 khi bộ điều khiển TcpIpCtrl ở trạng thái TCPIP_STATE_ONLINE (SWS_TcpIp_00075): cho phép truyền/nhận Socket bình thường." },
  { bit: 6, mask: 0x40, tag: "ONHOLD",   name: "CTRL_ONHOLD",   tone: "warn", desc: "Bit 6 = 1 khi mất PHY Link tạm thời (TCPIP_STATE_ONHOLD — SWS_TcpIp_00076): giữ nguyên địa chỉ IP & Socket TCP đang mở thay vì xóa." },
  { bit: 5, mask: 0x20, tag: "IP_ASSGN", name: "IP_ASSIGNED",   tone: "ok",   desc: "Bit 5 = 1 khi LocalAddrId đạt TCPIP_IPADDR_STATE_ASSIGNED và đã phát callback SoAd_LocalIpAddrAssignmentChg() (SWS_TcpIp_00094)." },
  { bit: 4, mask: 0x10, tag: "DHC_AUTO", name: "DHCP_AUTOIP",   tone: "cyan", desc: "Bit 4 = 1 khi IP hiện tại được cấp phát động thành công qua DHCP (DORA) hoặc Link-Local AutoIP (169.254.x.x RFC 3927)." },
  { bit: 3, mask: 0x08, tag: "ARP_HIT",  name: "ARP_NDP_HIT",   tone: "ok",   desc: "Bit 3 = 1 khi tra cứu ARP Cache (IPv4) / NDP Cache (IPv6) cho kết quả HIT/REACHABLE. Hạ về 0 khi gặp ARP Cache Miss." },
  { bit: 2, mask: 0x04, tag: "ZEROCPY",  name: "ZERO_COPY_TX",  tone: "cyan", desc: "Bit 2 = 1 khi TcpIp cấp phát thành công DMA Tx Buffer từ EthIf_ProvideTxBuffer() và gọi SoAd_CopyTxData() không copy thừa." },
  { bit: 1, mask: 0x02, tag: "TLS_ACTV", name: "TLS_SEC_ACTV",  tone: "pur",  desc: "Bit 1 = 1 khi kết nối TCP đã hoàn tất bắt tay AUTOSAR TLS 1.2/1.3 qua KeyM (X.509) & Csm (AEAD Encrypt, Port 3496)." },
  { bit: 0, mask: 0x01, tag: "ERR_IDSM", name: "ERR_IDSM_DET",  tone: "err",  desc: "Bit 0 = 1 khi TcpIp phát hiện lỗi DET (ModuleId 170), báo lỗi DEM (TIMEDOUT/CONNREFUSED), hoặc cảnh báo tấn công lên IdsM." }
];

const TCPIP_TCP_IP_FLAGS_BITS = [
  { bit: 7, mask: 0x80, tag: "IP_DF",    name: "IP_DF_FLAG",    tone: "pur",  desc: "Bit DF (Don't Fragment) trên IPv4 Header: 1 = cấm phân mảnh gói tin (chặn truyền UDP nếu Payload > MTU); 0 = cho phép cắt mảnh." },
  { bit: 6, mask: 0x40, tag: "IP_MF",    name: "IP_MF_FRAG",    tone: "warn", desc: "Bit MF (More Fragments) trên IPv4 Header: 1 = gói đang bị cắt thành nhiều mảnh vượt MTU hoặc đang chờ tái hợp tại ReassemblyBuffer." },
  { bit: 5, mask: 0x20, tag: "TCP_URG",  name: "TCP_URG",       tone: "pur",  desc: "Cờ TCP URG (0x20): Báo hiệu trường Urgent Pointer trong TCP Header có hiệu lực cho dữ liệu khẩn cấp." },
  { bit: 4, mask: 0x10, tag: "TCP_ACK",  name: "TCP_ACK",       tone: "ok",   desc: "Cờ TCP ACK (0x10): Xác nhận trường AckNum hợp lệ (có mặt trên SYN+ACK, PSH+ACK, ACK thuần túy và FIN+ACK)." },
  { bit: 3, mask: 0x08, tag: "TCP_PSH",  name: "TCP_PSH",       tone: "cyan", desc: "Cờ TCP PSH (0x08): Yêu cầu tầng TCP bên nhận đẩy ngay dữ liệu lên SoAd_RxIndication() không chờ gom đệm." },
  { bit: 2, mask: 0x04, tag: "TCP_RST",  name: "TCP_RST",       tone: "err",  desc: "Cờ TCP RST (0x04): Hủy kết nối cưỡng bức (TcpIp_Close(Abort=TRUE) hoặc từ chối cổng đóng), báo SoAd_TcpIpEvent(TCPIP_TCP_RESET)." },
  { bit: 1, mask: 0x02, tag: "TCP_SYN",  name: "TCP_SYN",       tone: "cyan", desc: "Cờ TCP SYN (0x02): Đồng bộ Initial Sequence Number (ISN) ở bước 1 & 2 của TCP 3-Way Handshake." },
  { bit: 0, mask: 0x01, tag: "TCP_FIN",  name: "TCP_FIN",       tone: "warn", desc: "Cờ TCP FIN (0x01): Bắt đầu đóng kết nối êm dịu 4-Way Teardown (TcpIp_Close(Abort=FALSE)) tới FIN_WAIT_1 / TIME_WAIT." }
];

const SOCKETS_PRESET = {
  "0": {
    socketId: 0, name: "Sock_0_DoIP_TCP", owner: "SoAd (DoIP)", domain: "AF_INET", proto: "TCP",
    localAddrId: 0, localIp: "192.168.10.50", localPort: 49152,
    remoteIp: "192.168.10.100", remotePort: 13400, defaultState: "CLOSED",
    tlsAssigned: false, isMulticast: false, framePrio: 4, ttl: 64,
    desc: "Socket TCP DoIP Client/Diag (ISO 13400 Port 13400)"
  },
  "1": {
    socketId: 1, name: "Sock_1_SomeIp_UDP", owner: "SoAd (SOME/IP)", domain: "AF_INET", proto: "UDP",
    localAddrId: 0, localIp: "192.168.10.50", localPort: 30490,
    remoteIp: "192.168.10.200", remotePort: 30490, defaultState: "BOUND",
    tlsAssigned: false, isMulticast: false, framePrio: 4, ttl: 64,
    desc: "Socket UDP Unicast SOME/IP Event (Port 30490)"
  },
  "2": {
    socketId: 2, name: "Sock_2_SD_Multicast", owner: "SoAd (Sd / UdpNm)", domain: "AF_INET", proto: "UDP",
    localAddrId: 1, localIp: "224.224.224.245", localPort: 30490,
    remoteIp: "224.224.224.245", remotePort: 30490, defaultState: "BOUND",
    tlsAssigned: false, isMulticast: true, framePrio: 5, ttl: 1,
    desc: "Socket UDP Multicast SOME/IP-SD (224.224.224.245:30490)"
  },
  "3": {
    socketId: 3, name: "Sock_3_DoIP_TLS", owner: "SoAd (DoIP TLS)", domain: "AF_INET", proto: "TCP",
    localAddrId: 0, localIp: "192.168.10.50", localPort: 3496,
    remoteIp: "192.168.10.100", remotePort: 51200, defaultState: "CLOSED",
    tlsAssigned: true, isMulticast: false, framePrio: 6, ttl: 64,
    desc: "Socket TCP over AUTOSAR TLS 1.3 (DoIP Secure Port 3496)"
  }
};

const LOCAL_ADDRS_PRESET = [
  {
    localAddrId: 0, label: "LocalAddr_0 (Unicast IPv4 · VLAN 10)", domain: "AF_INET",
    addrType: "UNICAST", method: "TCPIP_IPADDR_ASSIGNMENT_STATIC",
    ip: "192.168.10.50", netmask: "255.255.255.0", gateway: "192.168.10.1",
    state: "TCPIP_IPADDR_STATE_UNASSIGNED", igmpJoined: false
  },
  {
    localAddrId: 1, label: "LocalAddr_1 (Multicast SOME/IP-SD)", domain: "AF_INET",
    addrType: "MULTICAST", method: "TCPIP_IPADDR_ASSIGNMENT_STATIC",
    ip: "224.224.224.245", netmask: "240.0.0.0", gateway: "0.0.0.0",
    state: "TCPIP_IPADDR_STATE_UNASSIGNED", igmpJoined: false
  },
  {
    localAddrId: 2, label: "LocalAddr_2 (IPv6 Link-Local NDP)", domain: "AF_INET6",
    addrType: "UNICAST", method: "TCPIP_IPADDR_ASSIGNMENT_IPV6_ROUTER",
    ip: "fe80::02aa:bbff:fe00:0050", netmask: "/64", gateway: "fe80::1",
    state: "TCPIP_IPADDR_STATE_UNASSIGNED", igmpJoined: false
  }
];

const RX_FRAMES_PRESET = {
  TCP_SYN_ACK: {
    key: "TCP_SYN_ACK", label: "TCP SYN+ACK (Hoàn tất bắt tay 3 bước Client)",
    etherType: "0x0800", proto: "TCP", srcIp: "192.168.10.100", dstIp: "192.168.10.50",
    srcPort: 13400, dstPort: 49152, flags: { syn: 1, ack: 1 }, len: 0, payload: ""
  },
  TCP_DATA: {
    key: "TCP_DATA", label: "TCP Data PSH+ACK (DoIP UDS Payload 64B)",
    etherType: "0x0800", proto: "TCP", srcIp: "192.168.10.100", dstIp: "192.168.10.50",
    srcPort: 13400, dstPort: 49152, flags: { psh: 1, ack: 1 }, len: 64, payload: "02 FD 80 01 00 00 00 08 (DoIP UDS)"
  },
  TCP_FIN: {
    key: "TCP_FIN", label: "TCP FIN+ACK (Remote yêu cầu đóng kết nối)",
    etherType: "0x0800", proto: "TCP", srcIp: "192.168.10.100", dstIp: "192.168.10.50",
    srcPort: 13400, dstPort: 49152, flags: { fin: 1, ack: 1 }, len: 0, payload: ""
  },
  TCP_RST: {
    key: "TCP_RST", label: "TCP RST (Remote hủy kết nối / Port Closed)",
    etherType: "0x0800", proto: "TCP", srcIp: "192.168.10.100", dstIp: "192.168.10.50",
    srcPort: 13400, dstPort: 49152, flags: { rst: 1, ack: 1 }, len: 0, payload: ""
  },
  UDP_SOMEIP_SD: {
    key: "UDP_SOMEIP_SD", label: "UDP Multicast SOME/IP-SD OfferService (224.224.224.245)",
    etherType: "0x0800", proto: "UDP", srcIp: "192.168.10.200", dstIp: "224.224.224.245",
    srcPort: 30490, dstPort: 30490, flags: {}, len: 48, payload: "FF FF 81 00 00 00 00 28 (SD Offer)"
  },
  ARP_REPLY: {
    key: "ARP_REPLY", label: "ARP Reply (0x0806: Giải quyết ARP Miss 192.168.10.200)",
    etherType: "0x0806", proto: "ARP", srcIp: "192.168.10.200", dstIp: "192.168.10.50",
    srcMac: "00:11:22:33:44:C8", srcPort: 0, dstPort: 0, flags: {}, len: 28, payload: "ARP Is-At 00:11:22:33:44:C8"
  },
  ICMP_PING: {
    key: "ICMP_PING", label: "ICMPv4 Echo Request (Ping Type 8 Code 0 từ Tester)",
    etherType: "0x0800", proto: "ICMP", srcIp: "192.168.10.100", dstIp: "192.168.10.50",
    srcPort: 0, dstPort: 0, flags: {}, len: 32, payload: "ICMP Echo Req Seq=1"
  },
  ARP_SPOOF: {
    key: "ARP_SPOOF", label: "ARP Spoofing Packet (Giả mạo MAC ➔ IdsM)",
    etherType: "0x0806", proto: "ARP", srcIp: "192.168.10.100", dstIp: "192.168.10.50",
    srcMac: "DE:AD:BE:EF:BA:AD", srcPort: 0, dstPort: 0, flags: {}, len: 28, payload: "SPOOFED ARP Reply!"
  }
};

const configTooltipData = {
  // Tab 0 (6)
  TcpIpDevErrorDetect: {
    title: "Phát Hiện Lỗi Phát Triển (Development Error Detection)",
    sws: "SWS_TcpIp_00041 · ECUC_00001",
    ecucPath: "TcpIp / TcpIpGeneral / TcpIpDevErrorDetect",
    range: "Boolean: TRUE | FALSE",
    typical: "TRUE khi Dev/Test; FALSE ở bản Production tối ưu CPU",
    role: "Bật/tắt cơ chế kiểm tra tính hợp lệ của tham số, trạng thái khởi tạo và báo cáo qua Det_ReportError(ModuleId = 170).",
    mechanism: "Khi TRUE, mọi API như TcpIp_Bind(), TcpIp_TcpTransmit(), TcpIp_Close() sẽ kiểm tra NULL_PTR, SocketId hợp lệ và trạng thái Init trước khi xử lý; nếu vi phạm sẽ bắn DET và thoát ngay.",
    scenarioImpact: "Bật InjectInvalidDetTest ở Tab 6 cùng tham số này = TRUE để thấy DET chặn lỗi SocketId=99 hoặc NULL_PTR (S12)."
  },
  TcpIpMainFunctionPeriod: {
    title: "Chu Kỳ Tác Vụ Nền TcpIp_MainFunction (Period ms)",
    sws: "SWS_TcpIp_00026 · ECUC_00002",
    ecucPath: "TcpIp / TcpIpGeneral / TcpIpMainFunctionPeriod",
    range: "Float/Int: 1 .. 50 ms",
    typical: "5 ms hoặc 10 ms (gắn vào Os_Task_BSW)",
    role: "Quy định độ phân giải thời gian cho toàn bộ bộ định thời nội bộ của ngăn xếp TcpIp.",
    mechanism: "Mỗi lần nhấn '+1 Tick MainFn', TcpIp trừ thời gian trên các bộ đếm TCP RTO, TIME_WAIT (2×MSL), Keep-Alive, ARP Cache Aging, DHCP Lease và AutoIP ARP Probe.",
    scenarioImpact: "Dùng trong Kịch bản S7 (đếm lùi RTO để kích hoạt Retransmission) và S6 (chờ hết TIME_WAIT để đóng hẳn về CLOSED)."
  },
  TcpIpBufferMemoryPoolZeroCopy: {
    title: "Bộ Nhớ Đệm Tĩnh & Truyền Zero-Copy DMA",
    sws: "SWS_TcpIp_00073",
    ecucPath: "TcpIp / TcpIpGeneral / TcpIpBufferMemory",
    range: "Boolean: TRUE (Zero-Copy) | FALSE (Buffered)",
    typical: "TRUE (Bắt buộc cho 100BASE-T1 / 1000BASE-T1)",
    role: "Cho phép TcpIp xin thẳng vùng nhớ DMA Tx Descriptor từ EthIf_ProvideTxBuffer() và kéo dữ liệu qua SoAd_CopyTxData().",
    mechanism: "Tránh sao chép bộ nhớ RAM thừa qua nhiều lớp. Nếu phần cứng Eth hết DMA descriptor (BUFREQ_E_OVFL), TcpIp báo lỗi TCPIP_E_NOBUFS.",
    scenarioImpact: "Quan sát Bit 2 (ZERO_COPY) sáng xanh trên Thanh A khi gọi TcpTransmit/UdpTransmit trong Kịch bản S2 và S5."
  },
  ActiveCtrlState: {
    title: "Trạng Thái Bộ Điều Khiển TcpIp (TcpIp_StateType)",
    sws: "SWS_TcpIp_00075 · SWS_TcpIp_00076",
    ecucPath: "TcpIp / TcpIpConfig / TcpIpCtrl / RuntimeState",
    range: "OFFLINE | STARTUP | ONLINE | ONHOLD | SHUTDOWN",
    typical: "TCPIP_STATE_ONLINE khi vận hành bình thường",
    role: "Phản ánh trạng thái điều khiển bởi EthSM qua TcpIp_RequestComMode().",
    mechanism: "ONLINE mở giao tiếp đầy đủ; ONHOLD giữ nguyên IP và Socket TCP khi đứt PHY Link tạm thời; OFFLINE đóng toàn bộ Socket và thu hồi IP.",
    scenarioImpact: "Thử đổi sang ONHOLD trong S11 để thấy Socket TCP vẫn giữ trạng thái ESTABLISHED không bị reset."
  },
  TcpIpCtrlMtu: {
    title: "Kích Thước Truyền Tối Đa Giao Diện Mạng (MTU)",
    sws: "ECUC_TcpIp_00033 · RFC 791",
    ecucPath: "TcpIp / TcpIpConfig / TcpIpCtrl / TcpIpCtrlMtu",
    range: "256 .. 9000 Bytes (Ethernet chuẩn: 1500B)",
    typical: "1500 Bytes (Classical Ethernet) hoặc 9000 Bytes (Jumbo)",
    role: "Giới hạn kích thước tối đa của mỗi gói IP truyền xuống EthIf; trực tiếp quyết định ngưỡng MSS của TCP (MTU - 40B) và ngưỡng phân mảnh UDP.",
    mechanism: "Với MTU=1500B, TCP MSS = 1460B. Nếu gói UDP lớn hơn MTU (VD: 2800B) và DF=0, tầng IPv4 tự động cắt làm nhiều mảnh.",
    scenarioImpact: "Thử hạ xuống 576B trong S4 (xem TCP MSS tự tụt xuống 536B) hoặc S8 (xem gói UDP bị cắt làm 3 mảnh)."
  },
  TcpIpCtrlFramePrioDefault: {
    title: "Độ Ưu Tiên Khung Ethernet Mặc Định (IEEE 802.1Q VLAN PCP)",
    sws: "SWS_TcpIp_00016 · IEEE 802.1Q",
    ecucPath: "TcpIp / TcpIpConfig / TcpIpCtrl / TcpIpCtrlFramePrioDefault",
    range: "0 .. 7 (3-bit Priority Code Point)",
    typical: "4 (Service/DoIP) · 6 (Real-time Control/TSN)",
    role: "Giá trị ưu tiên truyền xuống EthIf_ProvideTxBuffer() để chèn vào thẻ 4-byte VLAN Tag cho Switch TSN xếp lịch QoS.",
    mechanism: "Mọi Socket thuộc Controller thừa hưởng mức PCP này trừ khi được ghi đè riêng qua TcpIp_ChangeParameter(TCPIP_PARAMID_FRAMEPRIO).",
    scenarioImpact: "Theo dõi giá trị VLAN PCP trên Thanh Giải Phẫu Header trong S9 khi gọi TcpIp_ChangeParameter()."
  },

  // Tab 1 (6)
  SelectedLocalAddrId: {
    title: "Định Danh Địa Chỉ IP Cục Bộ (TcpIp_LocalAddrIdType)",
    sws: "SWS_TcpIp_00038 · ECUC_00038",
    ecucPath: "TcpIp / TcpIpConfig / TcpIpLocalAddr / TcpIpAddrId",
    range: "0: IPv4 Unicast | 1: IPv4 Multicast | 2: IPv6 Link-Local",
    typical: "Mỗi VLAN/Unicast/Multicast cần 1 LocalAddrId riêng",
    role: "Liên kết giao diện logic TcpIpCtrl với một địa chỉ IP cụ thể (Unicast hoặc Multicast) và phương thức cấp phát IP tương ứng.",
    mechanism: "Khi gọi TcpIp_Bind(SocketId, LocalAddrId, &Port), Socket gắn chặt vào IP của LocalAddrId này.",
    scenarioImpact: "LocalAddr_0 dùng cho DoIP/SOME/IP Unicast; LocalAddr_1 dùng cho SOME/IP-SD Multicast 224.224.224.245 (S3)."
  },
  TcpIpAssignmentMethod: {
    title: "Phương Thức Cấp Phát Địa Chỉ IP (Assignment Method)",
    sws: "SWS_TcpIp_00037 · ECUC_00043",
    ecucPath: "TcpIp / TcpIpLocalAddr / TcpIpAddrAssignment / TcpIpAssignmentMethod",
    range: "STATIC | LINKLOCAL_DOIP (AutoIP) | DHCP | IPV6_ROUTER",
    typical: "STATIC cho mạng nội bộ cố định; LINKLOCAL_DOIP cho chẩn đoán nhanh",
    role: "Xác định cách TcpIp có được địa chỉ IP khi khởi động lên ONLINE.",
    mechanism: "STATIC gán ngay tức thì; LINKLOCAL_DOIP chạy ARP Probe dải 169.254.x.x (RFC 3927); DHCP chạy bắt tay 4 bước Discover-Offer-Request-Ack.",
    scenarioImpact: "Chuyển đổi qua lại giữa STATIC, LINKLOCAL_DOIP và DHCP trong Kịch bản S1 để xem chuỗi gói tin khởi tạo."
  },
  TcpIpAssignmentTrigger: {
    title: "Thời Điểm Kích Hoạt Cấp Phát IP (Assignment Trigger)",
    sws: "ECUC_TcpIp_00044",
    ecucPath: "TcpIp / TcpIpLocalAddr / TcpIpAddrAssignment / TcpIpAssignmentTrigger",
    range: "TCPIP_AUTOMATIC | TCPIP_MANUAL",
    typical: "TCPIP_AUTOMATIC cho khởi động tiêu chuẩn",
    role: "Quyết định TcpIp tự động gán IP khi EthSM yêu cầu ONLINE hay chờ lệnh tường minh từ tầng trên.",
    mechanism: "Nếu đặt MANUAL, IP giữ ở UNASSIGNED dù Controller đã STARTUP cho tới khi SoAd/BswM gọi TcpIp_RequestIpAddrAssignment().",
    scenarioImpact: "Thử đặt TCPIP_MANUAL trong S1 rồi bấm nút kích hoạt cấp phát IP để quan sát quá trình chuyển sang ASSIGNED."
  },
  TcpIpStaticIpAddress: {
    title: "Địa Chỉ IPv4 Tĩnh & Subnet Mask Cấu Hình",
    sws: "ECUC_TcpIp_00045",
    ecucPath: "TcpIp / TcpIpLocalAddr / TcpIpStaticIpAddressConfig",
    range: "IPv4/Prefix (VD: 192.168.10.50/24)",
    typical: "192.168.10.50/24 (Gateway 192.168.10.1)",
    role: "Cung cấp địa chỉ IP cố định, Netmask và Default Router khi chọn phương thức TCPIP_IPADDR_ASSIGNMENT_STATIC.",
    mechanism: "TcpIp dùng Subnet Mask để phân biệt gói tin gửi nội mạng (ARP trực tiếp tới Remote IP) hay ngoại mạng (ARP tới Default Gateway).",
    scenarioImpact: "Hiển thị trực tiếp làm địa chỉ nguồn SrcIP trên Thanh Giải Phẫu Header và Bảng LocalAddr."
  },
  TcpIpAutoIpInitTimeoutMs: {
    title: "Thời Gian Chờ Dò Trùng IP AutoIP (RFC 3927 ARP Probe)",
    sws: "RFC 3927 · SWS_TcpIp_00153",
    ecucPath: "TcpIp / TcpIpIpV4Config / TcpIpIpV4AutoIpConfig",
    range: "100 .. 5000 ms",
    typical: "1000 ms (hoặc tối ưu <200ms nếu khôi phục từ NvM)",
    role: "Thời gian đợi giữa các gói ARP Probe kiểm tra xem địa chỉ 169.254.x.x dự kiến có bị ECU khác dùng chưa.",
    mechanism: "Nếu phát hiện ARP Reply trùng IP, TcpIp tự sinh ngẫu nhiên IP khác trong dải 169.254.1.0..169.254.254.255 và thử lại.",
    scenarioImpact: "Ảnh hưởng đến quá trình cấp phát Link-Local DoIP ở Kịch bản S1."
  },
  PersistAutoIpArpToNvM: {
    title: "Lưu Trữ Địa Chỉ AutoIP / ARP Vào Bộ Nhớ NvM",
    sws: "ECUC_TcpIp_00056",
    ecucPath: "TcpIp / TcpIpIpV4Config / TcpIpIpV4AutoIpNvramBlockRef",
    range: "Boolean: TRUE | FALSE",
    typical: "TRUE (Tăng tốc khởi động DoIP sau Ignition On)",
    role: "Lưu IP Link-Local đã giành được thành công vào NvM qua NvM_WriteBlock() để lần khởi động sau ưu tiên thử lại đúng IP đó.",
    mechanism: "Giúp ECU rút ngắn đáng kể thời gian sẵn sàng chẩn đoán DoIP theo chuẩn OEM.",
    scenarioImpact: "Khi TRUE trong S1 (chế độ AutoIP), nút bấm bước sẽ kích hoạt luồng NvM_WriteBlock() & đánh dấu mũi tên tới NvM."
  },

  // Tab 2 (6)
  TcpIpTcpEnabled: {
    title: "Kích Hoạt Phân Hệ Giao Thức TCP (RFC 793)",
    sws: "ECUC_TcpIp_00010",
    ecucPath: "TcpIp / TcpIpConfig / TcpIpTcpConfig / TcpIpTcpEnabled",
    range: "Boolean: TRUE | FALSE",
    typical: "TRUE (Bắt buộc nếu dùng DoIP TCP hoặc SOME/IP TCP)",
    role: "Bật hoặc cắt bỏ hoàn toàn bộ máy trạng thái TCP 11-State, Sliding Window và Timer RTO trong biên dịch.",
    mechanism: "Nếu FALSE, mọi lời gọi TcpIp_SoAdGetSocket(TCP) hoặc TcpIp_TcpConnect() đều bị từ chối.",
    scenarioImpact: "Phải bật TRUE cho các kịch bản S4, S5, S6, S7, S10 và S12."
  },
  TcpIpTcpMaxRtx: {
    title: "Số Lần Truyền Lại Tối Đa Của TCP (Max Retransmissions)",
    sws: "ECUC_TcpIp_00021",
    ecucPath: "TcpIp / TcpIpConfig / TcpIpTcpConfig / TcpIpTcpMaxRtx",
    range: "1 .. 12 lần",
    typical: "3 .. 5 lần trong mạng nội bộ xe",
    role: "Giới hạn số lần gửi lại một phân đoạn TCP chưa có ACK trước khi kết luận đường truyền chết.",
    mechanism: "Khi số lần thử lại vượt quá TcpIpTcpMaxRtx, TcpIp hủy kết nối về CLOSED, báo SoAd_TcpIpEvent(TCPIP_TCP_RESET) và gọi Dem_SetEventStatus(TCPIP_E_TIMEDOUT).",
    scenarioImpact: "Thử bấm '+1 Tick MainFn' liên tiếp trong Kịch bản S7 để đếm tới giới hạn MaxRtx và quan sát báo lỗi DEM!"
  },
  TcpIpTcpRetransmissionTimeoutMs: {
    title: "Bộ Định Thời Truyền Lại TCP (RTO Base Timeout ms)",
    sws: "ECUC_TcpIp_00023",
    ecucPath: "TcpIp / TcpIpConfig / TcpIpTcpConfig / TcpIpTcpRetransmissionTimeout",
    range: "50 .. 5000 ms",
    typical: "200 ms trên LAN ô tô",
    role: "Khoảng thời gian chờ gói ACK từ đối tác trước khi TcpIp tự động truyền lại gói bị mất.",
    mechanism: "Sau mỗi lần timeout thất bại, RTO thường nhân đôi theo cơ chế Exponential Backoff (200ms ➔ 400ms ➔ 800ms) để tránh làm nghẽn mạng.",
    scenarioImpact: "Hiển thị thanh đếm tiến trình RTO trực tiếp ở Panel 2 trong Kịch bản S7."
  },
  TcpIpTcpNagleEnabled: {
    title: "Thuật Toán Gom Gói Nhỏ TCP Nagle (RFC 896)",
    sws: "SWS_TcpIp_00150 · ECUC_00018",
    ecucPath: "TcpIp / TcpIpConfig / TcpIpTcpConfig / TcpIpTcpNagleEnabled",
    range: "Boolean: TRUE (Gom gói nhỏ) | FALSE (Đẩy ngay)",
    typical: "FALSE cho DoIP/RPC độ trễ thấp; TRUE khi truyền tải file",
    role: "Hạn chế sinh ra quá nhiều gói tin nhỏ (< MSS) bằng cách giữ dữ liệu chờ ACK của gói trước.",
    mechanism: "Khi TRUE, các lần gọi TcpIp_TcpTransmit() kích thước nhỏ sẽ bị giữ lại ghép chung; khi FALSE (hoặc tắt động qua ChangeParameter), gói tin bật cờ PSH=1 đẩy đi ngay lập tức.",
    scenarioImpact: "Chuyển đổi trong Kịch bản S5 để thấy sự khác biệt giữa việc gom đệm (Nagle Wait) và bắn tức thì (PSH=1)."
  },
  TcpIpTcpKeepAliveEnabled: {
    title: "Cơ Chế Thăm Dò Kết Nối Nhàn Rỗi (TCP Keep-Alive)",
    sws: "ECUC_TcpIp_00015 · RFC 1122",
    ecucPath: "TcpIp / TcpIpConfig / TcpIpTcpConfig / TcpIpTcpKeepAliveEnabled",
    range: "Boolean: TRUE | FALSE",
    typical: "TRUE (Phát hiện sớm Tester bị rút nguồn đột ngột)",
    role: "Định kỳ phát gói thăm dò (Seq - 1) khi kết nối ESTABLISHED không có dữ liệu trao đổi trong thời gian dài.",
    mechanism: "Nếu đối tác còn sống sẽ trả về ACK; nếu đối tác đã sập nguồn im lặng quá số lần probe, TcpIp chủ động đóng Socket giải phóng tài nguyên.",
    scenarioImpact: "Bật TRUE và nhấn '+1 Tick MainFn' trong S7 để kích hoạt gói TCP Keep-Alive Probe."
  },
  TcpIpTcpReceiveWindowMax: {
    title: "Kích Thước Cửa Sổ Nhận Tối Đa (TCP Receive Window)",
    sws: "SWS_TcpIp_00024 · ECUC_00020",
    ecucPath: "TcpIp / TcpIpConfig / TcpIpTcpConfig / TcpIpTcpReceiveWindowMax",
    range: "512 .. 65535 Bytes",
    typical: "4096 hoặc 8192 Bytes (tùy RAM khả dụng của ECU)",
    role: "Số byte tối đa mà TcpIp cam kết có thể tiếp nhận trước khi SoAd xử lý xong dữ liệu.",
    mechanism: "Mỗi khi nhận dữ liệu, Window quảng bá giảm dần. Chỉ khi tầng trên gọi TcpIp_TcpReceived(SocketId, Len), cửa sổ mới mở rộng lại! Nếu quên gọi, Window về 0 (ZeroWindow).",
    scenarioImpact: "Theo dõi thanh trượt TCP Rx Window trong Kịch bản S5 và gọi nút 'TcpRecvd' để mở khóa cửa sổ!"
  },

  // Tab 3 (6)
  SelectedSocketProfile: {
    title: "Hồ Sơ Socket Đang Thao Tác (TcpIp_SocketTable)",
    sws: "SWS_TcpIp_00018",
    ecucPath: "TcpIp / Runtime / SocketTable[0..3]",
    range: "Sock_0 (TCP DoIP) .. Sock_3 (TCP TLS)",
    typical: "Chọn trực tiếp hoặc click vào dòng trong Bảng Socket",
    role: "Xác định SocketId mục tiêu cho mọi nút bấm thao tác thủ công ở Quick Action Bar.",
    mechanism: "Mỗi Socket mang bộ 5 thông số: Protocol, LocalAddrId, LocalPort, RemoteIP:Port và trạng thái kết nối độc lập.",
    scenarioImpact: "Đồng bộ hai chiều với bảng TcpIp_SocketTable ở đầu Cột Giữa."
  },
  RemoteIpAndPortEndpoint: {
    title: "Địa Chỉ IP & Cổng Đối Tác Đích (Remote Endpoint)",
    sws: "SWS_TcpIp_00022 · SWS_TcpIp_00025",
    ecucPath: "TcpIp_SockAddrInetType (IP:Port)",
    range: "IPv4:Port (VD: 192.168.10.100:13400)",
    typical: "192.168.10.100:13400 (DoIP Tester)",
    role: "Tham số đầu vào RemoteAddrPtr cho TcpIp_TcpConnect() và TcpIp_UdpTransmit().",
    mechanism: "TcpIp dựa vào địa chỉ IP đích này để tra cứu bảng ARP Cache nhằm tìm địa chỉ MAC 6-byte đích trước khi đóng khung Ethernet.",
    scenarioImpact: "Nếu nhập IP chưa có trong ARP Cache (VD .200 khi bật ARP Miss), luồng truyền tự động rẽ nhánh sang ARP Request (S2)."
  },
  TxPayloadByteLength: {
    title: "Độ Dài Dữ Liệu Truyền (AvailableLength / TotalLength)",
    sws: "SWS_TcpIp_00025 · SWS_TcpIp_00050",
    ecucPath: "Runtime Tx Parameter (Bytes)",
    range: "1 .. 8192 Bytes",
    typical: "64B (tin thường) hoặc >1500B (kích hoạt phân mảnh/MSS)",
    role: "Số byte dữ liệu tầng trên yêu cầu gửi đi qua TcpTransmit hoặc UdpTransmit.",
    mechanism: "Với TCP: cắt theo MSS (1460B) thành nhiều segment; với UDP: nếu tổng dài > MTU thì thực hiện IPv4 Fragmentation (nếu DF=0).",
    scenarioImpact: "Đặt 2800B ở Kịch bản S8 để quan sát gói UDP bị cắt làm 2 mảnh IPv4 (MF=1, FragOffset=185)."
  },
  ForceCopyTxDataViaSoAd: {
    title: "Cơ Chế Kéo Dữ Liệu Qua Callback SoAd_CopyTxData()",
    sws: "SWS_TcpIp_00073",
    ecucPath: "TcpIp_TcpTransmit / UdpTransmit (DataPtr == NULL_PTR)",
    range: "Boolean: TRUE (DataPtr=NULL) | FALSE (Direct Ptr)",
    typical: "TRUE để đạt Zero-Copy thực thụ từ SoAd xuống Eth DMA",
    role: "Khi bật TRUE, TcpIp gọi ngược SoAd_CopyTxData(SocketId, BufPtr, BufLength) ghi thẳng payload vào bộ đệm DMA do EthIf_ProvideTxBuffer() cấp.",
    mechanism: "Loại bỏ hoàn toàn bước copy trung gian giữa PduR/SoAd và ngăn xếp TcpIp.",
    scenarioImpact: "Quan sát chuỗi mũi tên kéo dữ liệu hai chiều giữa TcpIp và SoAd trên sơ đồ SVG trong S2 và S5."
  },
  TcpCloseAbortWithRst: {
    title: "Cờ Cưỡng Bức Hủy Kết Nối TCP Bằng RST (Abort)",
    sws: "SWS_TcpIp_00017",
    ecucPath: "TcpIp_Close(SocketId, Abort)",
    range: "Boolean: FALSE (4-Way FIN) | TRUE (Immediate RST)",
    typical: "FALSE cho đóng chuẩn; TRUE khi cần hủy khẩn cấp giải phóng Socket",
    role: "Quyết định giao thức đóng khi gọi TcpIp_Close().",
    mechanism: "FALSE gửi cờ FIN=1 và giữ TIME_WAIT (2×MSL); TRUE phát ngay cờ RST=1 (Bit 2 Thanh B), bỏ qua dữ liệu chờ và xóa ngay Socket về CLOSED.",
    scenarioImpact: "Gạt biến này giữa FALSE và TRUE trong Kịch bản S6 rồi bấm 'Close (FIN/RST)' để so sánh trực tiếp."
  },
  TxRxPayloadPreviewHex: {
    title: "Chuỗi Dữ Liệu Hex Minh Họa Payload (DoIP / SOME/IP)",
    sws: "SWS_TcpIp_00030 · SWS_TcpIp_00050",
    ecucPath: "Runtime Payload Preview",
    range: "Chuỗi Hex (VD: 02 FD 80 01 00 00 00 08)",
    typical: "02 FD 80 01 ... (Header DoIP ISO 13400)",
    role: "Hiển thị nội dung byte dữ liệu đang truyền/nhận qua Socket trên thanh giải phẫu và API Trace.",
    mechanism: "Khi bật AUTOSAR TLS (S10), chuỗi Plaintext này sẽ chuyển thành bản mã TLS Record Layer (17 03 03 ...).",
    scenarioImpact: "Dễ dàng đối chiếu dữ liệu trước và sau khi mã hóa TLS trong Kịch bản S10."
  },

  // Tab 4 (6)
  TcpIpArpTableEntryTimeoutSec: {
    title: "Thời Gian Sống Của Mục ARP Cache (ARP Aging Timeout)",
    sws: "ECUC_TcpIp_00051 · RFC 826",
    ecucPath: "TcpIp / TcpIpIpV4Config / TcpIpArpConfig / TcpIpArpTableEntryTimeout",
    range: "5 .. 600 giây",
    typical: "60 giây (hoặc 120s cho mạng tĩnh trên xe)",
    role: "Thời gian tối đa một ánh xạ IP ➔ MAC được giữ ở trạng thái REACHABLE trong ARP Cache trước khi hết hạn.",
    mechanism: "Mỗi nhịp MainFunction làm giảm tuổi thọ mục ARP; khi hết hạn, mục chuyển sang STALE và buộc phải gửi lại ARP Request làm mới.",
    scenarioImpact: "Hiển thị trực tiếp giá trị Age trên Bảng ARP Cache ở Panel 1A."
  },
  SimulateArpCacheMiss: {
    title: "Giả Lập Trượt Bộ Đệm ARP (ARP Cache Miss & PendingQueue)",
    sws: "RFC 826 · SWS_TcpIp_00025",
    ecucPath: "Runtime Simulation / ARP Cache State",
    range: "Boolean: FALSE (HIT) | TRUE (MISS)",
    typical: "Xảy ra tự nhiên với gói tin đầu tiên gửi tới đối tác mới",
    role: "Mô phỏng trường hợp IP đích (192.168.10.200) chưa có địa chỉ MAC tương ứng trong bảng ARP Cache.",
    mechanism: "Khi Miss, TcpIp hạ Bit 3 (ARP_NDP_HIT = 0), lưu gói UDP vào ArpPendingQueue và phát Broadcast ARP Request (0x0806). Khi nhận ARP Reply, gói chờ tự động được đẩy ra bus!",
    scenarioImpact: "Kịch bản chính của S2; cũng có thể bật nhanh ngay từ nút 'ARP .200' trên đầu Panel 1."
  },
  TcpIpIpReassemblyAndFragEnabled: {
    title: "Cho Phép Phân Mảnh & Tái Hợp Gói IPv4 (Frag & Reassembly)",
    sws: "ECUC_TcpIp_00060 · RFC 791",
    ecucPath: "TcpIp / TcpIpIpV4Config / TcpIpIpFragmentationConfig",
    range: "Boolean: TRUE | FALSE",
    typical: "TRUE nếu hỗ trợ truyền dữ liệu lớn qua UDP; FALSE để tiết kiệm RAM",
    role: "Bật bộ cắt nhỏ gói IP vượt MTU ở chiều truyền và bộ đệm ghép mảnh Reassembly ở chiều nhận.",
    mechanism: "Nếu FALSE, các gói UDP > MTU hoặc các mảnh nhận có MF=1 / Offset > 0 sẽ bị loại bỏ ngay lập tức.",
    scenarioImpact: "Thử bật/tắt trong Kịch bản S8 khi gửi gói UDP 2800B qua MTU 1500B."
  },
  SetIpDontFragmentFlagDf: {
    title: "Cờ Cấm Phân Mảnh IPv4 (Don't Fragment — DF Bit)",
    sws: "RFC 791 · Path MTU Discovery",
    ecucPath: "IPv4 Header Flags Bit 1 (DF)",
    range: "Boolean: TRUE (DF=1) | FALSE (DF=0)",
    typical: "TRUE cho TCP; FALSE cho gói UDP cỡ lớn cần phân mảnh",
    role: "Điều khiển Bit 7 (IP_DF_FLAG) trên Thanh B và trường Flags trong IPv4 Header.",
    mechanism: "Nếu DF=1 mà gói UDP dài hơn MTU (VD 2800B > 1500B), TcpIp tuyệt đối không được phép phân mảnh và phải hủy truyền!",
    scenarioImpact: "Đặt FALSE trong Kịch bản S8 để kích hoạt phân mảnh 2 gói; bật TRUE để xem TcpIp từ chối cắt gói."
  },
  TcpIpIcmpEchoReplyEnabled: {
    title: "Tự Động Phản Hồi ICMPv4/v6 Echo Request (Ping Reply)",
    sws: "ECUC_TcpIp_00070 · SWS_TcpIp_00039",
    ecucPath: "TcpIp / TcpIpIpV4Config / TcpIpIcmpConfig",
    range: "Boolean: TRUE | FALSE",
    typical: "TRUE khi Test/Lab; cân nhắc tắt ở Production vì bảo mật",
    role: "Cho phép ngăn xếp TcpIp tự động trả lời bản tin ICMP Echo Request (Ping Type 8 ➔ Reply Type 0) ngay tại tầng IP.",
    mechanism: "Xử lý khép kín giữa EthIf và TcpIp mà không làm phiền tầng SoAd hay ứng dụng.",
    scenarioImpact: "Dùng trong Kịch bản S9 khi bơm khung ICMP_PING từ Tester."
  },
  HwChecksumOffloadEnabled: {
    title: "Ủy Quyền Tính Tổng Kiểm Phần Cứng (HW Checksum Offload)",
    sws: "SWS_TcpIp · SWS_Eth",
    ecucPath: "TcpIp / TcpIpConfig / TcpIpCtrl / TcpIpIpV4Ctrl / ChecksumOffload",
    range: "Boolean: TRUE (MAC HW) | FALSE (CPU SW)",
    typical: "TRUE trên MCU hiện đại (AURIX TC3xx / S32G)",
    role: "Giao việc tính toán và xác minh Checksum IPv4, TCP, UDP cho phần cứng bộ điều khiển Eth MAC để giảm tải CPU.",
    mechanism: "Khi FALSE, TcpIp tự tính tổng bù 1 bằng phần mềm trên CPU và từ chối gói tin nhận có Checksum sai.",
    scenarioImpact: "Thử tắt FALSE trong S3 để kiểm tra hành vi loại bỏ gói UDP sai Checksum."
  },

  // Tab 5 (6)
  TcpIpTlsConnectionEnabled: {
    title: "Kết Nối Bảo Mật AUTOSAR TLS 1.2 / 1.3 (Csm & KeyM)",
    sws: "SWS_TcpIp R20-11..R23-11 · RFC 8446",
    ecucPath: "TcpIp / TcpIpConfig / TcpIpTlsConfig / TcpIpTlsConnection",
    range: "Boolean: TRUE | FALSE",
    typical: "TRUE cho DoIP Secure Port 3496 & kết nối V2G/Cloud",
    role: "Bật tầng bảo mật TLS chạy kẹp giữa lớp TCP và SoAd, phối hợp KeyM xác thực chứng chỉ X.509 và Csm mã hóa AEAD.",
    mechanism: "Sau TCP 3-Way Handshake, TcpIp giữ trạng thái chờ hoàn tất TLS Handshake rồi mới gọi SoAd_TcpConnected() và bật Bit 1 (TLS_ACTV = 1).",
    scenarioImpact: "Trọng tâm của Kịch bản S10 (DoIP over TLS Port 3496)."
  },
  ChangeParamIdSelector: {
    title: "Chọn Tham Số Đổi Nóng Qua TcpIp_ChangeParameter()",
    sws: "SWS_TcpIp_00016",
    ecucPath: "TcpIp_ParamIdType (API 0x0F)",
    range: "FRAMEPRIO | TTL | TCP_NAGLE | TCP_KEEPALIVE | TLS_ASSIGN",
    typical: "TCPIP_PARAMID_FRAMEPRIO hoặc TCP_NAGLE",
    role: "Xác định tham số sẽ thay đổi trên Socket đang chọn khi bấm nút 'Recvd/ChgPrm' hoặc trong Kịch bản S9.",
    mechanism: "Cho phép SoAd tùy biến từng Socket riêng biệt lúc chạy (như nâng VLAN PCP lên 6 hoặc gán TLS Connection) mà không cần cấu hình lại toàn cục.",
    scenarioImpact: "Chọn tham số rồi bấm nút #6 ở Quick Action Bar hoặc chạy S9."
  },
  TcpIpSynCookiesEnabled: {
    title: "Cơ Chế Chống Tấn Công Làm Ngập TCP SYN Flood (SYN Cookies)",
    sws: "RFC 4987 · Security Hardening",
    ecucPath: "TcpIp / TcpIpConfig / TcpIpTcpConfig / TcpIpSynCookiesEnabled",
    range: "Boolean: TRUE | FALSE",
    typical: "TRUE để bảo vệ ECU trước bão kết nối giả mạo",
    role: "Ngăn chặn kẻ tấn công làm cạn kiệt bảng Socket tĩnh bằng cách không cấp phát Socket RAM ngay khi nhận gói SYN.",
    mechanism: "TcpIp mã hóa thông số kết nối vào số ISN của gói SYN+ACK trả về; chỉ cấp phát Socket thật khi bên gửi chứng minh trả lại được ACK hợp lệ!",
    scenarioImpact: "Bấm nút '🛡️ SYN Flood' trên Header (hoặc S12) để thấy bảng Socket được bảo toàn khi bật TRUE."
  },
  EnableIdsMSecurityReporting: {
    title: "Báo Cáo Sự Kiện An Ninh Lên IdsM (Intrusion Detection)",
    sws: "SWS_IdsM · SWS_TcpIp R20-11+",
    ecucPath: "TcpIp / TcpIpGeneral / TcpIpIdsMSecurityEventRef",
    range: "Boolean: TRUE | FALSE",
    typical: "TRUE trên các dòng xe tuân thủ an ninh mạng UN R155",
    role: "Cho phép TcpIp đẩy ngay các Qualified Security Events (QSEv) sang IdsM_SetSecurityEvent() khi bị tấn công mạng.",
    mechanism: "Phát hiện SYN Flood, ARP Spoofing (trùng IP khác MAC), hoặc gói tin TCP/IP dị dạng và bật Bit 0 (ERR_IDSM_DET = 1).",
    scenarioImpact: "Kích hoạt trong Kịch bản S12 khi bơm ARP_SPOOF hoặc SYN Flood."
  },
  SimulateNetworkFaultForDem: {
    title: "Giả Lập Lỗi Mạng Thời Gian Chạy Cho DEM (Production Fault)",
    sws: "SWS_Dem · SWS_TcpIp",
    ecucPath: "TcpIp / TcpIpGeneral / TcpIpDemEventParameterRefs",
    range: "Boolean: TRUE | FALSE",
    typical: "FALSE lúc bình thường; TRUE để test báo lỗi TCPIP_E_*",
    role: "Mô phỏng sự cố từ chối kết nối (RST ➔ TCPIP_E_CONNREFUSED) hoặc rớt gói quá MaxRtx (TCPIP_E_TIMEDOUT).",
    mechanism: "Khi xảy ra sự cố kết nối mạng thực tế, TcpIp gọi Dem_SetEventStatus(EventId, DEM_EVENT_STATUS_FAILED) để lưu DTC chẩn đoán.",
    scenarioImpact: "Thử bật TRUE trong S4/S7/S12 để kích hoạt báo lỗi DEM."
  },
  PassInvalidSocketOrNullForDet: {
    title: "Bơm Lỗi Tham Số Không Hợp Lệ Kiểm Thử Hàng Rào DET",
    sws: "SWS_TcpIp_00041",
    ecucPath: "Runtime Fault Injection (DET Module 170)",
    range: "Boolean: TRUE | FALSE",
    typical: "FALSE lúc chạy bình thường; TRUE khi test DET",
    role: "Cố tình truyền SocketId = 99 hoặc NULL_PTR vào các API của TcpIp để kiểm chứng phản ứng phòng vệ DET.",
    mechanism: "Nếu TcpIpDevErrorDetect = TRUE, hàm lập tức gọi Det_ReportError(170, 0, ApiId, TCPIP_E_INV_SOCK_ID / PARAM_POINTER) và trả về E_NOT_OK.",
    scenarioImpact: "Bật TRUE rồi gọi truyền/đóng Socket để kiểm chứng trong Kịch bản S12."
  }
};

const MODULES_INFO = {
  MOD_SWC: {
    title: "SWC_SomeIpApp & SWC_DiagApp (Application Layer)",
    layer: "Application Layer (01_Application)",
    inputs: "Tín hiệu & dịch vụ từ RTE (Rte_Read / Rte_Call), yêu cầu chẩn đoán từ Dcm, trạng thái mạng từ ComM.",
    outputs: "Rte_Write_PP_RadarObj_Data(), Rte_Call_CS_SomeIpMethod_Invoke(), Rte_Call_UR_ComMUser_Eth_RequestComMode().",
    apis: ["Rte_Write_<Port>_<Signal>()", "Rte_Call_<ClientServerPort>()", "Rte_Call_ComM_RequestComMode(FULL_COMM)"],
    role: "Tầng ứng dụng thực thi logic chức năng xe. Tuyệt đối KHÔNG gọi trực tiếp TcpIp hay mở Socket BSD.",
    notes: "Mọi dữ liệu Ethernet từ SWC đều đi qua RTE xuống COM/LdCom/Dcm -> PduR -> SoAd -> TcpIp."
  },
  MOD_RTE: {
    title: "RTE & SchM (Runtime Environment & ExclusiveArea)",
    layer: "RTE Layer (02_RTE)",
    inputs: "Lời gọi từ SWC, sự kiện từ COM/LdCom, yêu cầu khóa vùng găng từ TcpIp.",
    outputs: "SchM_Enter_TcpIp_EXCLUSIVE_AREA_0(), SchM_Exit_TcpIp_EXCLUSIVE_AREA_0(), SOME/IP Transformer.",
    apis: ["SchM_Enter_TcpIp_EXCLUSIVE_AREA_0()", "SchM_Exit_TcpIp_EXCLUSIVE_AREA_0()", "Rte_COMCbk_<Signal>()"],
    role: "Truyền tải dữ liệu qua ranh giới App/BSW và khóa vùng găng bảo vệ TcpIp_SocketTable, ArpCache khỏi xung đột Task vs Eth_RxIrq ISR.",
    notes: "Thiếu SchM ExclusiveArea giữa TcpIp_MainFunction()/SoAd và ngắt Eth_Rx sẽ làm hỏng con trỏ danh sách TCP Buffer."
  },
  MOD_UPPER: {
    title: "Com / LdCom / Dcm / SecOC / Sd / DoIP / UdpNm & PduR",
    layer: "Communication Services (03_Services)",
    inputs: "Dữ liệu ứng dụng từ RTE/SWC hoặc I-PDU đã tái hợp từ SoAd_RxIndication.",
    outputs: "SoAd_IfTransmit(SoAdTxPduId, &PduInfo), SoAd_TpTransmit(), Sd_LocalIpAddrAssignmentChg().",
    apis: ["PduR_ComTransmit()", "DoIP_TpTransmit()", "Sd_ServerServiceSetState()", "UdpNm_NetworkRequest()"],
    role: "Đóng gói bản tin ứng dụng/chẩn đoán/NM ở mức AUTOSAR PDU trước khi chuyển cho SoAd ánh xạ sang Socket.",
    notes: "DoIP (ISO 13400) chạy trên TCP Port 13400 / TLS Port 3496; SOME/IP-SD chạy trên UDP Multicast 224.224.224.245:30490."
  },
  MOD_SOAD: {
    title: "SoAd (Socket Adaptor — SWS_SoAd · Mod 56)",
    layer: "Communication Services (03_Services)",
    inputs: "PduId từ PduR/DoIP/Sd/UdpNm; callbacks RxIndication, CopyTxData, TcpAccepted, TcpConnected, TcpIpEvent từ TcpIp.",
    outputs: "TcpIp_SoAdGetSocket(), TcpIp_Bind(), TcpIp_TcpConnect(), TcpIp_TcpListen(), TcpIp_UdpTransmit(), TcpIp_TcpTransmit(), TcpIp_TcpReceived(), TcpIp_Close(), TcpIp_ChangeParameter().",
    apis: ["TcpIp_SoAdGetSocket()", "TcpIp_Bind()", "TcpIp_TcpConnect()", "TcpIp_TcpTransmit()", "TcpIp_UdpTransmit()", "SoAd_CopyTxData()"],
    role: "Phiên dịch viên giữa thế giới AUTOSAR PDU ID và thế giới BSD Socket (SocketId), hỗ trợ ghép kênh bằng 8-byte SoAd PDU Header.",
    notes: "Khi TcpIp gọi SoAd_CopyTxData(), SoAd ghi thẳng payload vào DMA Tx Buffer của EthIf để đạt Zero-Copy."
  },
  MOD_ETHSM: {
    title: "EthSM, ComM & BswM (Ethernet State Manager)",
    layer: "Communication Services (03_Services)",
    inputs: "Yêu cầu từ ComM (EthSM_RequestComMode), trạng thái PHY Link từ EthIf/EthTrcv và EthSM_TcpIpModeIndication() từ TcpIp.",
    outputs: "TcpIp_RequestComMode(CtrlIdx, TCPIP_STATE_ONLINE / ONHOLD / OFFLINE), ComM_BusSM_ModeIndication().",
    apis: ["TcpIp_RequestComMode(CtrlIdx, State)", "EthSM_TcpIpModeIndication(CtrlIdx, State)", "EthSM_TrcvLinkStateChg()"],
    role: "Điều phối vòng đời kênh Ethernet: chuyển TcpIp sang ONLINE khi có Link, ONHOLD khi mất Link tạm thời, và OFFLINE khi tắt mạng.",
    notes: "ComM chỉ được báo FULL_COMMUNICATION sau khi TcpIp phát EthSM_TcpIpModeIndication(TCPIP_STATE_ONLINE)."
  },
  MOD_TCPIP: {
    title: "TcpIp Core Engine (SWS_TcpIp · Mod 170 / 0x00AA)",
    layer: "Communication Services (03_Services)",
    inputs: "Lệnh Socket/Transmit từ SoAd, RequestComMode từ EthSM, khung nhận TcpIp_RxIndication() từ EthIf, nhịp chu kỳ TcpIp_MainFunction().",
    outputs: "EthIf_ProvideTxBuffer(), EthIf_Transmit(), EthIf_UpdatePhysAddrFilter(); callbacks lên SoAd, EthSM, Csm, KeyM, NvM, Det, Dem, IdsM.",
    apis: ["TcpIp_Init()", "TcpIp_SoAdGetSocket()", "TcpIp_Bind()", "TcpIp_TcpConnect()", "TcpIp_TcpTransmit()", "TcpIp_UdpTransmit()", "TcpIp_RxIndication()", "TcpIp_MainFunction()", "TcpIp_Close()"],
    role: "Trái tim ngăn xếp mạng nhúng: vận hành Socket tĩnh, TCP 11-State FSM (Window/Nagle/RTO/Keep-Alive), UDP, IPv4/IPv6 (Frag/Reassembly), ARP/NDP, DHCP/AutoIP, ICMP và TLS.",
    notes: "Không sử dụng malloc/free động; bảo toàn IP & Socket khi ở TCPIP_STATE_ONHOLD (SWS_TcpIp_00076)."
  },
  MOD_SEC: {
    title: "Csm & KeyM (AUTOSAR TLS 1.2/1.3 & IPsec Security)",
    layer: "Security Services (03_Services)",
    inputs: "Yêu cầu xác thực chứng chỉ X.509 (KeyM) và bắt tay/mã hóa AEAD TLS Record Layer (Csm) từ TcpIp.",
    outputs: "KeyM_VerifyCertificate(), Csm_KeyExchangeCalcSecret(), Csm_AEADEncrypt(), Csm_AEADDecrypt().",
    apis: ["KeyM_VerifyCertificate()", "Csm_KeyExchangeCalcSecret()", "Csm_AEADEncrypt()", "Csm_AEADDecrypt()"],
    role: "Bảo vệ kênh truyền DoIP over TLS (Port 3496) và các dịch vụ bảo mật theo tiêu chuẩn an ninh UN R155.",
    notes: "Nếu KeyM từ chối chứng chỉ sai hoặc hết hạn, TcpIp gửi TLS Alert và đóng ngay kết nối TCP trước khi dữ liệu lên được SoAd."
  },
  MOD_ETHIF: {
    title: "EthIf (Ethernet Interface — SWS_EthIf · Mod 65)",
    layer: "ECU Abstraction Layer (04_ECU_Abstraction)",
    inputs: "EthIf_ProvideTxBuffer(), EthIf_Transmit(), EthIf_UpdatePhysAddrFilter() từ TcpIp; khung nhận từ Eth MCAL.",
    outputs: "TcpIp_RxIndication(CtrlIdx, FrameType, IsBcast, PhysAddr, DataPtr, Len), EthIf_TxConfirmation(), Eth_Transmit().",
    apis: ["EthIf_ProvideTxBuffer()", "EthIf_Transmit()", "EthIf_UpdatePhysAddrFilter()", "TcpIp_RxIndication()"],
    role: "Trừu tượng hóa mạng ảo VLAN IEEE 802.1Q (chèn/gỡ 4-byte VLAN Tag VID + PCP Priority) và cấp phát Zero-Copy DMA Tx Buffer.",
    notes: "Phải cấu hình gọi EthIf_UpdatePhysAddrFilter() khi tham gia Multicast (SOME/IP-SD), nếu không MAC sẽ lọc bỏ gói tin!"
  },
  MOD_ETH: {
    title: "Eth (MCAL MAC) & EthTrcv (PHY Transceiver)",
    layer: "MCAL (05_MCAL) & ECU Abstraction",
    inputs: "Lệnh DMA Tx từ EthIf; tín hiệu vật lý trên cặp dây xoắn đơn 100BASE-T1 / 1000BASE-T1.",
    outputs: "EthIf_RxIndication() (từ Eth_RxIrq), EthIf_TxConfirmation(), EthTrcv_GetLinkState().",
    apis: ["Eth_ProvideTxBuffer()", "Eth_Transmit()", "Eth_RxHandler()", "EthTrcv_GetLinkState()"],
    role: "Quản lý DMA Descriptor Ring, tính/kiểm tra HW Checksum Offload (IPv4/TCP/UDP) và giám sát trạng thái PHY Link vật lý.",
    notes: "HW Checksum Offloading giải phóng CPU khỏi tính tổng bù 1 ở tốc độ Gigabit Ethernet."
  },
  MOD_DIAG: {
    title: "NvM · DET (Mod 170) · DEM · IdsM",
    layer: "System & Security Services (03_Services)",
    inputs: "NvM_WriteBlock() (lưu IP AutoIP), Det_ReportError() (170), Dem_SetEventStatus(), IdsM_SetSecurityEvent().",
    outputs: "Lưu cấu hình IP vào Flash/EEPROM; log lỗi DET/DEM & cảnh báo xâm nhập mạng (SYN Flood / ARP Spoofing) lên IdsM.",
    apis: ["Det_ReportError(170, ...)", "Dem_SetEventStatus(TCPIP_E_*)", "IdsM_SetSecurityEvent()", "NvM_WriteBlock()"],
    role: "Đảm bảo lưu trữ bền vững AutoIP, bắt lỗi phát triển DET, ghi nhận DTC mạng DEM và giám sát an ninh IDS trên xe.",
    notes: "Báo cáo lỗi runtime như TCPIP_E_CONNREFUSED / TCPIP_E_TIMEDOUT thông qua DEM giúp kỹ thuật viên chẩn đoán đứt cáp/lỗi mạng."
  }
};

const ABBREVIATIONS = [
  // CORE (12)
  { abbr: "TcpIp", full: "TCP/IP Stack Module (Mod 170 / 0x00AA)", cat: "CORE", desc: "Module tầng Services cung cấp trọn vẹn ngăn xếp giao thức TCP, UDP, IPv4/IPv6, ARP, NDP, ICMP, DHCP, AutoIP và TLS phía trên EthIf." },
  { abbr: "SoAd", full: "Socket Adaptor (SWS_SoAd · Mod 56)", cat: "CORE", desc: "Module cầu nối dịch ánh xạ giữa thế giới AUTOSAR PduId (PduR, DoIP, Sd, UdpNm) và thế giới Socket TCP/UDP của TcpIp." },
  { abbr: "SoCon", full: "Socket Connection", cat: "CORE", desc: "Thực thể cấu hình trong SoAd đại diện cho một cặp kênh truyền (Local IP:Port ↔ Remote IP:Port) gắn với một SocketId của TcpIp." },
  { abbr: "DoIP", full: "Diagnostics over IP (ISO 13400)", cat: "CORE", desc: "Giao thức chẩn đoán UDS qua Ethernet sử dụng UDP Port 13400 (Vehicle Announcement) và TCP Port 13400 / TLS 3496." },
  { abbr: "SOME/IP-SD", full: "Scalable service-Oriented Middleware over IP - Service Discovery", cat: "CORE", desc: "Giao thức phát hiện và đăng ký dịch vụ động (OfferService, FindService, SubscribeEventgroup) qua UDP Multicast 224.224.224.245:30490." },
  { abbr: "UdpNm", full: "UDP Network Management (SWS_UdpNm)", cat: "CORE", desc: "Module quản lý trạng thái ngủ/thức mạng đồng bộ qua gói tin UDP trên Automotive Ethernet (hỗ trợ Partial Networking PNC)." },
  { abbr: "EthSM", full: "Ethernet State Manager (SWS_EthSM)", cat: "CORE", desc: "Điều phối chế độ kênh Ethernet giữa ComM, EthIf/EthTrcv và TcpIp thông qua TcpIp_RequestComMode() và EthSM_TcpIpModeIndication()." },
  { abbr: "EthIf", full: "Ethernet Interface (SWS_EthIf · Mod 65)", cat: "CORE", desc: "Module tầng ECU Abstraction trừu tượng hóa VLAN 802.1Q, quản lý DMA Buffer Zero-Copy và phân phối FrameType lên TcpIp." },
  { abbr: "Eth & EthTrcv", full: "MCAL Ethernet MAC & PHY Transceiver", cat: "CORE", desc: "Driver điều khiển MAC Controller (DMA Ring, Checksum Offload) và chip PHY vật lý (100BASE-T1 / 1000BASE-T1 Link State)." },
  { abbr: "100/1000BASE-T1", full: "Automotive Single-Pair Ethernet (BroadR-Reach)", cat: "CORE", desc: "Chuẩn lớp vật lý Ethernet ô tô truyền song công 100 Mbps / 1 Gbps chỉ trên một cặp dây xoắn đơn không bọc giáp." },
  { abbr: "SocketId", full: "TcpIp_SocketIdType (Static Socket Handle)", cat: "CORE", desc: "Chỉ số định danh tĩnh một Socket trong mảng TcpIp_SocketTable (AUTOSAR cấm cấp phát heap động malloc/free)." },
  { abbr: "LocalAddrId", full: "TcpIp_LocalAddrIdType", cat: "CORE", desc: "Định danh cấu hình địa chỉ IP cục bộ (Unicast hoặc Multicast IPv4/IPv6) gắn với một TcpIpCtrl." },

  // TCP (14)
  { abbr: "TCP 11-State FSM", full: "TCP Finite State Machine (RFC 793)", cat: "TCP", desc: "11 trạng thái vòng đời Socket TCP: CLOSED, LISTEN, SYN_SENT, SYN_RCVD, ESTABLISHED, FIN_WAIT_1, FIN_WAIT_2, CLOSE_WAIT, CLOSING, LAST_ACK, TIME_WAIT." },
  { abbr: "3-Way Handshake", full: "TCP Connection Establishment (SYN ➔ SYN+ACK ➔ ACK)", cat: "TCP", desc: "Quy trình bắt tay 3 bước đồng bộ Initial Sequence Number (ISN) và đàm phán MSS trước khi vào trạng thái ESTABLISHED." },
  { abbr: "4-Way Teardown", full: "Graceful TCP Connection Close (FIN / ACK / FIN / ACK)", cat: "TCP", desc: "Quy trình đóng kết nối êm dịu hai chiều khi gọi TcpIp_Close(SocketId, Abort = FALSE), bảo đảm không mất dữ liệu đang truyền." },
  { abbr: "TCP SYN", full: "Synchronize Sequence Numbers Flag (Bit 1 · 0x02)", cat: "TCP", desc: "Cờ trong TCP Header dùng ở bước 1 và bước 2 của 3-Way Handshake để khởi tạo kết nối mới." },
  { abbr: "TCP ACK", full: "Acknowledgment Flag (Bit 4 · 0x10)", cat: "TCP", desc: "Cờ xác nhận giá trị AckNum hợp lệ, khẳng định đã nhận toàn bộ byte dữ liệu trước AckNum." },
  { abbr: "TCP PSH", full: "Push Function Flag (Bit 3 · 0x08)", cat: "TCP", desc: "Cờ yêu cầu bên nhận giao ngay dữ liệu lên tầng trên SoAd_RxIndication() không cần đợi đầy bộ đệm." },
  { abbr: "TCP RST", full: "Reset Connection Flag (Bit 2 · 0x04)", cat: "TCP", desc: "Cờ hủy kết nối cưỡng bức (TcpIp_Close(Abort=TRUE) hoặc cổng đóng), giải phóng ngay Socket và báo SoAd_TcpIpEvent(TCPIP_TCP_RESET)." },
  { abbr: "TCP FIN", full: "Finish / No More Data Flag (Bit 0 · 0x01)", cat: "TCP", desc: "Cờ báo kết thúc chiều gửi dữ liệu trong TCP Header, kích hoạt TCPIP_TCP_FIN_RECEIVED lên SoAd." },
  { abbr: "ISN", full: "Initial Sequence Number (32-bit)", cat: "TCP", desc: "Số thứ tự byte khởi đầu ngẫu nhiên khi thiết lập kết nối TCP nhằm tránh nhầm lẫn gói tin từ phiên trước." },
  { abbr: "Sliding Window", full: "TCP Flow Control Receive Window", cat: "TCP", desc: "Cơ chế bên nhận quảng bá số byte bộ đệm còn trống trong trường Window Size của TCP Header; tụt về 0 tạo thành ZeroWindow." },
  { abbr: "TcpIp_TcpReceived", full: "Confirm Consumed TCP Rx Data API (0x08)", cat: "TCP", desc: "Hàm SoAd bắt buộc gọi sau khi đọc xong dữ liệu để TcpIp mở rộng lại Sliding Window cho đối tác gửi tiếp." },
  { abbr: "Nagle Algorithm", full: "Small-Packet Coalescing Algorithm (RFC 896)", cat: "TCP", desc: "Thuật toán gom các gói nhỏ < MSS chờ ACK trước khi gửi; thường tắt (FALSE) cho DoIP để tránh trễ." },
  { abbr: "MSS", full: "Maximum Segment Size (MTU - 40 Bytes)", cat: "TCP", desc: "Kích thước payload tối đa của 1 phân đoạn TCP (= 1460 bytes khi MTU = 1500B), trao đổi trong TCP Option lúc SYN." },
  { abbr: "RTO & Fast Retransmit", full: "Retransmission Timeout & 3x Duplicate ACK", cat: "TCP", desc: "Hai cơ chế tự phục hồi mất gói của TCP: hết hạn bộ đếm RTO trong MainFunction() hoặc nhận 3 ACK trùng lặp để gửi lại ngay." },

  // UDP_IP (12)
  { abbr: "UDP", full: "User Datagram Protocol (RFC 768)", cat: "UDP_IP", desc: "Giao thức giao vận không kết nối, header gọn 8 bytes, độ trễ cực thấp cho SOME/IP Events, SOME/IP-SD và UdpNm." },
  { abbr: "MTU", full: "Maximum Transmission Unit (1500 Bytes)", cat: "UDP_IP", desc: "Kích thước tối đa của 1 gói IP đi qua giao diện Ethernet (1500B chuẩn; 9000B cho Jumbo Frame)." },
  { abbr: "IP Fragmentation", full: "IPv4 Packet Fragmentation & Reassembly (RFC 791)", cat: "UDP_IP", desc: "Cơ chế cắt gói UDP > MTU thành nhiều mảnh có cùng Identification, bật cờ MF=1 và tính Fragment Offset (bội số 8B)." },
  { abbr: "DF Flag", full: "Don't Fragment IPv4 Header Flag (Bit 7 Thanh B)", cat: "UDP_IP", desc: "Khi DF=1, cấm tuyệt đối cắt mảnh gói IP; nếu kích thước vượt quá MTU thì gói tin bị hủy bỏ." },
  { abbr: "MF Flag", full: "More Fragments IPv4 Header Flag (Bit 6 Thanh B)", cat: "UDP_IP", desc: "Đánh dấu MF=1 trên các mảnh đầu và mảnh giữa của một gói IPv4 bị phân mảnh; mảnh cuối cùng có MF=0." },
  { abbr: "TTL / Hop Limit", full: "Time To Live (IPv4) / Hop Limit (IPv6)", cat: "UDP_IP", desc: "Số bước nhảy tối đa qua Router trước khi gói tin bị hủy (thường là 64; đặt TTL=1 cho gói nội bộ không qua Router)." },
  { abbr: "ARP", full: "Address Resolution Protocol (RFC 826 · 0x0806)", cat: "UDP_IP", desc: "Giao thức phân giải địa chỉ IPv4 sang địa chỉ MAC 6-byte đích trên mạng LAN thông qua Broadcast Request và Unicast Reply." },
  { abbr: "ArpPendingQueue", full: "ARP Cache Miss Pending Packet Queue", cat: "UDP_IP", desc: "Hàng đợi tạm giữ gói tin UDP/IP khi gặp ARP Cache Miss; tự động xả truyền xuống EthIf ngay khi nhận ARP Reply." },
  { abbr: "NDP", full: "Neighbor Discovery Protocol (RFC 4861 · IPv6)", cat: "UDP_IP", desc: "Giao thức thay thế ARP trong IPv6 sử dụng Neighbor Solicitation / Advertisement qua ICMPv6 để tìm MAC và cấu hình SLAAC." },
  { abbr: "DHCP (DORA)", full: "Dynamic Host Configuration Protocol", cat: "UDP_IP", desc: "Cấp phát IP động tự động qua 4 thông điệp: Discover ➔ Offer ➔ Request ➔ Acknowledge kèm thời hạn Lease Time." },
  { abbr: "AutoIP / LINKLOCAL_DOIP", full: "Automatic Private IP Addressing (RFC 3927 · 169.254.x.x)", cat: "UDP_IP", desc: "Cơ chế tự chọn IP dải 169.254.x.x bằng ARP Probe/Announce giúp DoIP hoạt động nhanh không cần DHCP Server (lưu được vào NvM)." },
  { abbr: "ICMP & IGMP", full: "Internet Control & Group Management Protocol", cat: "UDP_IP", desc: "ICMP xử lý Ping (Echo Request/Reply) & Port Unreachable; IGMPv2/v3 đăng ký gia nhập nhóm Multicast với Switch Ethernet." },

  // SEC_DMA (10)
  { abbr: "Zero-Copy DMA", full: "Zero-Copy Direct Memory Access Transfer", cat: "SEC_DMA", desc: "Kỹ thuật cấp thẳng DMA Tx Descriptor từ EthIf_ProvideTxBuffer() và gọi SoAd_CopyTxData() ghi trực tiếp không copy RAM thừa." },
  { abbr: "IEEE 802.1Q VLAN", full: "Virtual LAN Tag (TPID 0x8100 + VID + PCP)", cat: "SEC_DMA", desc: "Thẻ 4-byte tách mạng ảo theo chức năng (ADAS/Diag) và mang trường ưu tiên 3-bit PCP (0..7) cho Switch TSN." },
  { abbr: "HwChecksumOffload", full: "Hardware Checksum Calculation Offload", cat: "SEC_DMA", desc: "Ủy quyền cho bộ điều khiển MAC phần cứng (Eth) tự động tính và kiểm tra Checksum IPv4/TCP/UDP thay cho CPU." },
  { abbr: "EthIf_UpdatePhysAddrFilter", full: "MAC Hardware Multicast Filter Update", cat: "SEC_DMA", desc: "Hàm TcpIp gọi xuống EthIf để mở bộ lọc MAC phần cứng (01:00:5E:xx) khi tham gia nhóm Multicast SOME/IP-SD." },
  { abbr: "TCPIP_STATE_ONLINE", full: "TcpIp Controller Active State (0x01)", cat: "SEC_DMA", desc: "Trạng thái vận hành đầy đủ sau khi gán IP thành công và phát EthSM_TcpIpModeIndication(TCPIP_STATE_ONLINE)." },
  { abbr: "TCPIP_STATE_ONHOLD", full: "TcpIp Controller On-Hold State (0x02 · SWS_TcpIp_00076)", cat: "SEC_DMA", desc: "Trạng thái khi mất PHY Link tạm thời: bảo toàn địa chỉ IP và các kết nối TCP đang mở thay vì thu hồi/đóng ngắt." },
  { abbr: "AUTOSAR TLS 1.2/1.3", full: "Transport Layer Security (DoIP Port 3496)", cat: "SEC_DMA", desc: "Lớp mã hóa tích hợp trong TcpIp (R20-11+), phối hợp KeyM xác thực chứng chỉ X.509 và Csm mã hóa AEAD bảo vệ dữ liệu." },
  { abbr: "Csm & KeyM", full: "Crypto Service Manager & Key Management", cat: "SEC_DMA", desc: "Hai module bảo mật cung cấp thuật toán mã hóa đối xứng/bất đối xứng và quản lý khóa/chứng chỉ số cho TLS/IPsec." },
  { abbr: "SYN Cookies", full: "Stateless TCP SYN Flood Mitigation (RFC 4987)", cat: "SEC_DMA", desc: "Kỹ thuật nhúng Cookie băm vào số ISN để chống tràn bảng Socket tĩnh khi bị tấn công bão gói SYN giả mạo." },
  { abbr: "IdsM_SetSecurityEvent", full: "Intrusion Detection System Security Reporting", cat: "SEC_DMA", desc: "Hàm báo cáo sự kiện tấn công mạng (SYN Flood, ARP Spoofing, Malformed Header) từ TcpIp lên IdsM theo chuẩn UN R155." },

  // API (10)
  { abbr: "TcpIp_SoAdGetSocket", full: "Allocate Static Socket API (0x03 · SWS_TcpIp_00018)", cat: "API", desc: "API cấu hình theo từng Upper Layer (SoAd) xin cấp phát 1 SocketId tĩnh (TCP hoặc UDP) từ TcpIp_SocketTable." },
  { abbr: "TcpIp_Bind", full: "Bind Socket to LocalAddrId & Port (0x05)", cat: "API", desc: "Gắn Socket với một địa chỉ IP cục bộ và số cổng LocalPort (báo TCPIP_E_ADDRINUSE nếu cổng đã bị chiếm)." },
  { abbr: "TcpIp_TcpConnect / Listen", full: "Active Connect (0x06) & Passive Server Listen (0x07)", cat: "API", desc: "TcpConnect khởi tạo bắt tay 3 bước phía Client; TcpListen đưa Socket Server vào LISTEN chờ SoAd_TcpAccepted()." },
  { abbr: "TcpIp_TcpTransmit / UdpTransmit", full: "Socket Data Transmission APIs (0x13 / 0x12)", cat: "API", desc: "Các hàm gửi dữ liệu qua Socket TCP (hỗ trợ Nagle/MSS/Retransmit) hoặc UDP (tra ARP/phân mảnh IPv4)." },
  { abbr: "TcpIp_RxIndication", full: "Lower Layer Ethernet Rx Callback (0x14)", cat: "API", desc: "Callback do EthIf gọi khi có khung IPv4/IPv6/ARP mới từ phần cứng, phân tích Header và chuyển lên SoAd_RxIndication()." },
  { abbr: "TcpIp_Close", full: "Close TCP or UDP Socket API (0x04)", cat: "API", desc: "Đóng Socket êm dịu theo 4-Way FIN (Abort=FALSE) hoặc cưỡng bức bằng cờ RST (Abort=TRUE)." },
  { abbr: "TcpIp_ChangeParameter", full: "Runtime Socket Parameter Tuning (0x0F)", cat: "API", desc: "Đổi nóng tham số trên Socket đang mở: VLAN PCP FramePrio, IP TTL, Nagle, Keep-Alive hoặc gán kết nối TLS." },
  { abbr: "TcpIp_RequestComMode", full: "EthSM Controller Mode Request (0x1C)", cat: "API", desc: "Hàm do EthSM gọi yêu cầu TcpIp chuyển đổi trạng thái bộ điều khiển giữa ONLINE, ONHOLD và OFFLINE." },
  { abbr: "DET (Mod 170)", full: "Development Error Tracer (TCPIP_E_INV_SOCK_ID / NOBUFS / ADDRINUSE)", cat: "API", desc: "ModuleId = 170 (0x00AA) bắt lỗi lập trình tham số và trạng thái ngay tại thời điểm gọi API của TcpIp." },
  { abbr: "DEM (TCPIP_E_*)", full: "Diagnostic Event Manager Runtime Network Faults", cat: "API", desc: "Ghi nhận sự cố mạng thực tế lúc vận hành như TCPIP_E_TIMEDOUT (hết MaxRtx), TCPIP_E_CONNREFUSED (RST) và TCPIP_E_HOSTUNREACH." }
];
