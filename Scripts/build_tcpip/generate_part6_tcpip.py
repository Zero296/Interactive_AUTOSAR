#!/usr/bin/env python3
"""Generates part6_handbook.js containing 6x4 multi-level handbook + 58-term Abbreviation table + DOMContentLoaded init."""

import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)

import hb_diagrams_tcpip as diag


def card(title, body):
    return f'<div class="hb-card"><h3>{title}</h3>{body}</div>'


def two_col(left, right):
    return f'<div class="hb-grid2"><div>{left}</div><div>{right}</div></div>'


def tbl(headers, rows, extra_cls=""):
    ths = "".join(f"<th>{h}</th>" for h in headers)
    trs = "".join("<tr>" + "".join(f"<td>{c}</td>" for c in r) + "</tr>" for r in rows)
    cls = "hb-table" + (f" {extra_cls}" if extra_cls else "")
    return f'<table class="{cls}"><thead><tr>{ths}</tr></thead><tbody>{trs}</tbody></table>'


HANDBOOK_TABS = [
    {
        "title": "1. Kiến Trúc & Cầu Nối SoAd",
        "subs": [
            {
                "label": "1.1 Vị trí TcpIp trong Ethernet Stack",
                "html": card(
                    "1.1. Vị Trí Chiến Lược Của Module TcpIp (ModuleId 170 / 0x00AA)",
                    "<p>Trong kiến trúc <b>AUTOSAR Classic R20-11 / R22-11 / R23-11</b>, module <b>TcpIp</b> (<code>SWS_TcpIp</code>) nằm ở tầng <b>Services Layer</b> (Communication Services), đóng vai trò cung cấp toàn bộ ngăn xếp giao thức mạng TCP/IPv4/IPv6 chuẩn RFC cho ECU ô tô.</p>"
                    + diag.svg_eth_stack()
                    + "<ul>"
                    "<li><b>Phía trên:</b> Giao tiếp duy nhất qua cầu nối <b>SoAd</b> (<code>Socket Adaptor</code>) hoặc một số CDD đặc biệt dùng trực tiếp API chuẩn <code>TcpIp_*</code>. Các tầng ứng dụng/dịch vụ như <code>SW-C</code>, <code>Com</code>, <code>Dcm/DoIP</code>, <code>Sd</code> hoàn toàn không biết địa chỉ IP hay Port.</li>"
                    "<li><b>Phía ngang:</b> Phối hợp với <b>EthSM</b> (điều phối chế độ <code>ONLINE / ONHOLD / OFFLINE</code>), <b>KeyM &amp; Csm</b> (bảo mật TLS 1.2/1.3 &amp; IPsec), <b>NvM</b> (lưu AutoIP/ARP), và <b>DET / DEM / IdsM</b> (chẩn đoán &amp; an ninh mạng).</li>"
                    "<li><b>Phía dưới:</b> Truy cập trực tiếp giao diện trừu tượng Ethernet <b>EthIf</b> bằng cơ chế DMA <b>Zero-Copy</b> qua <code>EthIf_ProvideTxBuffer()</code> &amp; <code>EthIf_Transmit()</code>.</li>"
                    "</ul>"
                ),
            },
            {
                "label": "1.2 Data Path vs Control Path từ SW-C",
                "html": card(
                    "1.2. Cách SW-C Tương Tác Gián Tiếp Với TcpIp Qua 2 Luồng",
                    two_col(
                        "<h4>🔵 Control Path (Quản lý kênh mạng)</h4>"
                        "<ol>"
                        "<li><code>SW-C / BswM</code> yêu cầu <code>ComM_RequestComMode(FULL_COMMUNICATION)</code>.</li>"
                        "<li><code>ComM</code> kích hoạt <code>EthSM</code>, đồng thời chờ <code>EthTrcv</code> báo Link Vật Lý <code>ACTIVE</code>.</li>"
                        "<li><code>EthSM</code> gọi <code>TcpIp_RequestComMode(0, TCPIP_STATE_ONLINE)</code>.</li>"
                        "<li><code>TcpIp</code> chuyển <code>STARTUP ➔ ONLINE</code>, cấp IP và báo ngược <code>EthSM_TcpIpModeIndication()</code> + <code>SoAd_LocalIpAddrAssignmentChg()</code>.</li>"
                        "</ol>",
                        "<h4>🟢 Data Path (Truyền/Nhận tín hiệu ECU)</h4>"
                        "<ol>"
                        "<li><code>SW-C</code> ghi Signal qua <code>Rte_Write_*()</code> xuống <code>Com / LdCom</code> (hoặc <code>DoIP / Sd</code>).</li>"
                        "<li><code>PduR</code> định tuyến bản tin dựa trên <b><code>PduIdType</code></b> sang <code>SoAd_IfTransmit()</code> hoặc <code>SoAd_TpTransmit()</code>.</li>"
                        "<li><code>SoAd</code> ánh xạ <code>PduId ➔ SoConId ➔ TcpIp_SocketIdType</code> và gọi <code>TcpIp_TcpTransmit()</code> hoặc <code>TcpIp_UdpTransmit()</code>.</li>"
                        "<li><code>TcpIp</code> đóng Header L4/L3 và truyền không copy qua <code>EthIf</code> xuống dây Ethernet.</li>"
                        "</ol>"
                    )
                    + "<p><b>Bảo vệ đa luồng (Reentrancy):</b> Do <code>TcpIp_MainFunction()</code> chạy trong BSW Task định kỳ còn <code>TcpIp_RxIndication()</code> có thể chạy trong ngắt <code>Eth_Rx</code> ISR, mọi cập nhật vào <code>TcpIp_SocketTable</code> hoặc <code>ARP Cache</code> đều phải khóa vùng găng bằng <code>SchM_Enter_TcpIp_EXCLUSIVE_AREA_0()</code>.</p>"
                ),
            },
            {
                "label": "1.3 Vai trò phiên dịch của SoAd",
                "html": card(
                    "1.3. Cầu Nối SoAd: PduIdType ⇄ SoConId ⇄ TcpIp_SocketIdType",
                    tbl(
                        ["Tầng / Module", "Định Danh Sử Dụng", "Nhiệm Vụ Cụ Thể"],
                        [
                            ["Com / PduR / DoIP / Sd / UdpNm", "<code>PduIdType</code>", "Chỉ làm việc với khối dữ liệu PDU thuần túy; tách biệt hoàn toàn khỏi Topology mạng IP/VLAN."],
                            ["SoAd (Socket Adaptor)", "<code>SoAd_SoConIdType</code>", "Giữ bảng Routing Group + tùy chọn chèn <b>8-Byte SoAd PDU Header</b> (4B ID + 4B Length) để ghép nhiều PDU vào chung 1 Socket TCP/UDP."],
                            ["TcpIp Core (ModuleId 170)", "<code>TcpIp_SocketIdType</code>", "Ánh xạ Socket tĩnh sang 5-Tuple (Proto, SrcIP, SrcPort, DstIP, DstPort) và LocalAddrId/EthIfCtrl."]
                        ]
                    )
                    + "<p><b>Lưu ý khi dùng chung TCP Stream:</b> Giao thức TCP là dòng byte liên tục không phân ranh giới gói (Byte-Stream). Nếu 2 bản tin DoIP/SOME/IP gửi sát nhau, SoAd bắt buộc bật <code>SoAdPduHeaderEnable</code> hoặc phân giải Header độ dài của DoIP (8 byte đầu) để tách gói chính xác khi <code>SoAd_RxIndication()</code> trả về.</p>"
                ),
            },
            {
                "label": "1.4 Bảng I/O 10 Module Ethernet Stack",
                "html": card(
                    "1.4. Phân Tích Input ➔ Processing ➔ Output Của 10 Module",
                    tbl(
                        ["Module", "Input Nhận Vào", "Xử Lý Cốt Lõi", "Output Định Tuyến Đi"],
                        [
                            ["SW-C", "Sensor / Diagnostic Signals", "Logic ứng dụng Application", "Rte_Write() tới RTE / ComM"],
                            ["RTE", "Port Signals & Mode Req", "Ánh xạ giữa App và BSW", "Com / BswM / EthSM"],
                            ["EthSM", "ComM Mode & EthTrcv Link", "Điều phối FSM mạng Ethernet", "TcpIp_RequestComMode()"],
                            ["Upper (DoIP/Sd/PduR)", "TX/RX PDU Data", "Xử lý Service Discovery / UDS", "SoAd_IfTransmit / TpTransmit"],
                            ["SoAd", "PduId <-> Socket Event", "Dịch PduId <-> SoConId <-> SocketId", "TcpIp_Tcp/UdpTransmit()"],
                            ["KeyM & Csm", "Cert X.509 & AEAD Jobs", "Xác thực chữ ký & Mã hóa AES-GCM", "Khóa phiên cho TLS 1.3"],
                            ["TcpIp (170)", "Socket Tx / EthIf Rx", "TCP FSM, IP Frag, ARP, DHCP, IDS", "EthIf & SoAd Callbacks"],
                            ["DET / DEM / IdsM", "Error ID & SEV Events", "Ghi nhận lỗi lập trình/mạng/IDS", "Diagnostic / SOC Security"],
                            ["EthIf", "TxBuffer & CtrlIdx / VLAN", "Trừu tượng hóa Eth MAC + Filter", "Eth_ProvideTxBuffer / Transmit"],
                            ["Eth & EthTrcv", "DMA RAM & MII/RGMII Wire", "Truyền khung 802.3 & giám sát Link", "Physical Bus Ethernet"]
                        ]
                    )
                ),
            },
        ],
    },
    {
        "title": "2. Giao Thức TCP & FSM",
        "subs": [
            {
                "label": "2.1 TCP 11-State FSM & Static Table",
                "html": card(
                    "2.1. Máy Trạng Thái TCP 11 Trạng Thái (RFC 793) & Socket Tĩnh Zero-Heap",
                    diag.svg_tcp_fsm()
                    + "<ul>"
                    "<li><b>Cấm Heap (No malloc):</b> Toàn bộ Socket được cấp phát tĩnh từ lúc biên dịch trong mảng <code>TcpIp_SocketTable[0..N-1]</code> qua tham số ECUC <code>TcpIpTcpSocketMax</code> &amp; <code>TcpIpUdpSocketMax</code>.</li>"
                    "<li><b>11 Trạng thái chuẩn RFC 793:</b> <code>CLOSED</code>, <code>LISTEN</code>, <code>SYN_SENT</code>, <code>SYN_RCVD</code>, <code>ESTABLISHED</code>, <code>FIN_WAIT_1</code>, <code>FIN_WAIT_2</code>, <code>TIME_WAIT</code>, <code>CLOSE_WAIT</code>, <code>LAST_ACK</code>, <code>CLOSING</code>.</li>"
                    "<li><b>Nhận kết nối trên Server (<code>LISTEN</code>):</b> Khi có <code>SYN</code> từ Tester, <code>TcpIp</code> lấy 1 phần tử rảnh từ Pool gán làm Socket con <code>SYN_RCVD ➔ ESTABLISHED</code> rồi bàn giao qua <code>SoAd_TcpAccepted(ListenSock, ChildSock, &amp;Remote)</code>.</li>"
                    "</ul>"
                ),
            },
            {
                "label": "2.2 3-Way Handshake & FIN vs RST",
                "html": card(
                    "2.2. Khởi Tạo 3 Bước & Đóng Êm Dịu 4-Way FIN vs Cưỡng Bức RST",
                    two_col(
                        "<h4>🤝 TCP 3-Way Handshake (Client &amp; Server)</h4>"
                        "<ul>"
                        "<li><b>Bước 1 (SYN):</b> <code>TcpIp_TcpConnect()</code> chọn ISN ngẫu nhiên mật mã, đính kèm Option <code>MSS = MTU - 40</code> (VD: 1460B), bật <b>SYN (Bit 1 = 1)</b> ➔ <code>SYN_SENT</code>.</li>"
                        "<li><b>Bước 2 (SYN+ACK):</b> Đối tác xác nhận <code>Ack = ISN + 1</code> và gửi ISN đối tác (<code>Bit 1 = 1, Bit 4 = 1</code>).</li>"
                        "<li><b>Bước 3 (ACK):</b> ECU trả <code>ACK</code> ➔ <code>ESTABLISHED</code> và gọi <code>SoAd_TcpConnected()</code>. (Nếu có TLS sẽ chạy TLS Handshake trước khi báo <code>SoAd</code>!).</li>"
                        "</ul>",
                        "<h4>🔒 So sánh <code>TcpIp_Close(SocketId, Abort)</code></h4>"
                        "<ul>"
                        "<li><b><code>Abort = FALSE</code> (4-Way FIN Teardown):</b> Bắn <b>FIN+ACK (Bit 0 = 1)</b>, xả nốt dữ liệu pending, đi qua <code>FIN_WAIT_1 ➔ FIN_WAIT_2 ➔ TIME_WAIT (2×MSL)</code> để đảm bảo mọi gói trễ mạng biến mất hoàn toàn trước khi tái sử dụng Port!</li>"
                        "<li><b><code>Abort = TRUE</code> (Reset Cưỡng Bức):</b> Hủy mọi buffer, bắn ngay cờ <b>RST (Bit 2 = 1)</b>, xóa Socket về <code>CLOSED</code> tức khắc và gọi <code>SoAd_TcpIpEvent(TCPIP_TCP_RESET)</code>.</li>"
                        "</ul>"
                    )
                ),
            },
            {
                "label": "2.3 Sliding Window, MSS & Nagle",
                "html": card(
                    "2.3. Kiểm Soát Luồng Cửa Sổ Trượt, MSS & Thuật Toán Nagle",
                    diag.svg_tcp_sliding_window()
                    + "<ul>"
                    "<li><b>Cạm bẫy ZeroWindow &amp; hàm <code>TcpIp_TcpReceived()</code>:</b> Khi nhận gói TCP, bộ đệm nhận trong <code>TcpIp</code> bị chiếm và giá trị trường <code>Window</code> gửi về đối tác co hẹp dần (VD 4096 ➔ 2048 ➔ 0). <code>TcpIp</code> <b>không tự động</b> mở lại cửa sổ sau callback <code>SoAd_RxIndication()</code>! Chính tầng trên <code>SoAd / CDD</code> phải chủ động gọi <code>TcpIp_TcpReceived(SocketId, Length)</code> [<code>SWS_TcpIp_00024</code>] sau khi tiêu thụ dữ liệu để phát gói <code>ACK Window Update</code>!</li>"
                    "<li><b>Thuật toán Nagle (RFC 896):</b> Khi <code>TcpIpTcpNagleEnabled = TRUE</code>, nếu còn phân đoạn trước chưa nhận ACK thì mọi gói nhỏ hơn <code>MSS</code> sẽ bị gom giữ chờ. <b>Khuyến nghị:</b> Luôn đặt <code>FALSE</code> cho kênh chẩn đoán DoIP/UDS để không vi phạm thời gian đáp ứng <code>P2 Server &lt; 50ms</code>.</li>"
                    "</ul>"
                ),
            },
            {
                "label": "2.4 Timers trong TcpIp_MainFunction()",
                "html": card(
                    "2.4. Bộ Định Thời Trong Tác Vụ Nền TcpIp_MainFunction() (SWS_TcpIp_00026)",
                    tbl(
                        ["Bộ Định Thời", "Tham Số ECUC Điều Khiển", "Hành Động Khi Hết Hạn"],
                        [
                            ["RTO (Retransmission Timeout)", "<code>TcpIpTcpRetransmissionTimeoutMs</code> (200ms) &amp; <code>TcpIpTcpMaxRtx</code> (3)", "Tái truyền đúng phân đoạn bị mất với <i>Exponential Backoff</i> (200 ➔ 400 ➔ 800ms). Quá <code>MaxRtx</code>: Đóng Socket &amp; báo <b>DEM <code>TCPIP_E_TIMEDOUT</code></b>!"],
                            ["Fast Retransmit (3x Dup-ACK)", "Tích hợp sẵn TCP Standard", "Khi nhận 3 gói ACK trùng AckNum liên tiếp, phát lại ngay gói mất trước khi bộ đếm RTO kịp hết."],
                            ["TIME_WAIT (2×MSL)", "Internal TCP FSM Timer", "Giữ Socket ở trạng thái TIME_WAIT tránh gói tin cũ lạc vào phiên mới rồi mới giải phóng về <code>CLOSED</code>."],
                            ["TCP Keep-Alive Probe", "<code>TcpIpTcpKeepAliveEnabled</code>", "Khi kênh ở <code>ESTABLISHED</code> im lặng kéo dài, tự động gửi Probe kiểm tra đối tác còn nguồn hay đã treo."]
                        ]
                    )
                ),
            },
        ],
    },
    {
        "title": "3. UDP, Zero-Copy & VLAN",
        "subs": [
            {
                "label": "3.1 Cơ chế Zero-Copy DMA Buffer",
                "html": card(
                    "3.1. Kiến Trúc Zero-Copy DMA Giữa SoAd – TcpIp – EthIf (SWS_TcpIp_00073)",
                    diag.svg_zero_copy_vlan()
                    + "<ol>"
                    "<li><code>SoAd</code> gọi <code>TcpIp_UdpTransmit(SockId, NULL_PTR, &amp;Remote, Len)</code> hoặc <code>TcpIp_TcpTransmit(SockId, NULL_PTR, Len, ForceRetrieve=TRUE)</code>.</li>"
                    "<li><code>TcpIp</code> tính tổng dài (Data + L4 + L3) và gọi <code>EthIf_ProvideTxBuffer(CtrlIdx, 0x0800, PCP, &amp;BufIdx, &amp;BufPtr, &amp;Len)</code>. Vùng <code>BufPtr</code> trả về nằm ngay trên bộ nhớ TX DMA Descriptor của vi điều khiển!</li>"
                    "<li><code>TcpIp</code> cộng offset dịch qua Ethernet + VLAN + IP + TCP/UDP Header rồi gọi ngược <code>SoAd_CopyTxData(SockId, BufPtr + HdrLen, Len)</code> để <code>SoAd/Com</code> ghi thẳng payload vào RAM DMA.</li>"
                    "<li><code>TcpIp</code> điền thông số IPv4/UDP/TCP, tính hoặc bật Checksum Offload và gọi <code>EthIf_Transmit()</code>.</li>"
                    "</ol>"
                ),
            },
            {
                "label": "3.2 UDP Unicast (SOME/IP & UdpNm)",
                "html": card(
                    "3.2. Truyền & Nhận UDP Unicast Phi Kết Nối (SWS_TcpIp_00025)",
                    "<p>Giao thức <b>UDP (IPProto = 17)</b> không cần bắt tay 3 bước, tiêu tốn ít Header (8 Bytes) nên được dùng làm giao thức mặc định cho luồng sự kiện <b>SOME/IP Notification</b> và quản lý mạng Ethernet <b>UdpNm</b>.</p>"
                    "<ul>"
                    "<li><b>Chiều truyền (TX):</b> Kiểm tra Controller <code>ONLINE</code>, kiểm tra <code>ARP Cache</code> cho <code>RemoteAddrPtr</code>; nếu Hit sẽ đóng gói Zero-Copy ngay (kèm cắt mảnh IPv4 nếu vượt MTU &amp; DF=0).</li>"
                    "<li><b>Chiều nhận (RX):</b> Nhận từ <code>TcpIp_RxIndication()</code>, xác thực Checksum UDP và tra cứu bảng <code>TcpIp_SocketTable</code> theo cặp <code>DstIP + DstPort</code>.</li>"
                    "<li><b>Xử lý Port đóng:</b> Nếu không có Socket nào đang Bind cổng đích đó, tầng IP tự động gửi trả <b>ICMP Type 3 Code 3 (Destination Port Unreachable)</b> về máy gửi!</li>"
                    "</ul>"
                ),
            },
            {
                "label": "3.3 Thẻ VLAN IEEE 802.1Q & Offload",
                "html": card(
                    "3.3. Gắn Thẻ Ưu Tiên VLAN IEEE 802.1Q (PCP 0..7) & HW Checksum Offload",
                    tbl(
                        ["Tham Số / Trường Header", "Kích Thước / Vị Trí", "Ý Nghĩa Tối Ưu Trong Automotive Ethernet"],
                        [
                            ["VLAN TPID &amp; VID", "<code>0x8100</code> · 12-bit VID (VD: VLAN 10)", "Phân tách luồng mạng logic trên cùng dây cáp vật lý (VD: VLAN Chẩn đoán DoIP vs VLAN Camera ADAS)."],
                            ["PCP Priority (`TcpIpCtrlFramePrioDefault`)", "3-bit (<code>0 .. 7</code>)", "Quy định độ ưu tiên hàng đợi QoS tại Ethernet Switch (VD: PCP=6 cho gói điều khiển/TLS; PCP=4 cho DoIP/SOME/IP). Đổi động bằng <code>TcpIp_ChangeParameter(TCPIP_PARAMID_FRAMEPRIO)</code>."],
                            ["HW Checksum Offload (`HwChecksumOffloadEnabled`)", "MAC Hardware Engine", "Ủy quyền bộ tăng tốc phần cứng Ethernet MAC tự chèn/kiểm Checksum IPv4, TCP, UDP giúp giảm đáng kể tải CPU ở tốc độ 100Mbps/1Gbps."]
                        ]
                    )
                ),
            },
            {
                "label": "3.4 Multicast IGMPv2 & MAC Filter",
                "html": card(
                    "3.4. Giao Tiếp UDP Multicast (SOME/IP-SD 224.224.224.245) & Bộ Lọc Phần Cứng",
                    "<p>Mỗi bản tin khám phá dịch vụ <b>SOME/IP-SD (Service Discovery)</b> thường gửi tới địa chỉ Multicast chuẩn <code>224.224.224.245:30490</code> với <code>IP TTL = 1</code> để giới hạn trong mạng nội bộ xe.</p>"
                    "<ul>"
                    "<li><b>Lỗi kinh điển nếu quên Multicast Filter:</b> Về mặt phần cứng, card MAC Ethernet mặc định chỉ nhận Unicast đúng MAC của nó và Broadcast <code>FF:FF:FF:FF:FF:FF</code>!</li>"
                    "<li><b>Cơ chế tự động của TcpIp khi Bind Multicast:</b> Khi <code>SoAd</code> gắn <code>Sock_2</code> vào <code>LocalAddr_1 (224.224.224.245)</code>, <code>TcpIp</code> vừa phát bản tin <b>IGMPv2 Membership Report</b> ra Ethernet Switch vừa gọi xuống dưới <code>EthIf_UpdatePhysAddrFilter(CtrlIdx, 01:00:5E:60:E0:F5, ETH_ADD_TO_FILTER)</code> để mở cổng cho phần cứng MAC cho phép khung Multicast lọt vào <code>TcpIp_RxIndication()</code>!</li>"
                    "</ul>"
                ),
            },
        ],
    },
    {
        "title": "4. IP, ARP/NDP, DHCP & Frag",
        "subs": [
            {
                "label": "4.1 ARP/NDP & ArpPendingQueue",
                "html": card(
                    "4.1. Phân Giải Địa Chỉ ARP (IPv4 RFC 826) / NDP (IPv6) & Hàng Đợi ArpPendingQueue",
                    diag.svg_arp_pending()
                    + "<ul>"
                    "<li><b>Cơ chế khi gặp ARP Cache Miss:</b> Trước khi truyền gói UDP/TCP tới IP đích mới trên mạng LAN, <code>TcpIp</code> tra cứu bảng <code>ARP Cache</code>. Nếu chưa có địa chỉ MAC tương ứng, Bit 3 (<code>ARP_NDP_HIT</code>) hạ về <b>0</b>.</li>"
                    "<li><b>Vai trò sống còn của <code>ArpPendingQueue</code>:</b> Thay vì vứt bỏ gói dữ liệu đầu tiên của ứng dụng như một số ngăn xếp tối giản, <code>TcpIp</code> tạm giữ gói tin vào hàng đợi <code>ArpPendingQueue</code>, đồng thời phát khung Broadcast <code>ARP Request (0x0806)</code> hỏi MAC. Ngay khi nhận <code>ARP Reply</code> qua <code>TcpIp_RxIndication()</code>, bản ghi chuyển sang <code>REACHABLE</code> (Bit 3 = 1) và <b>xả tự động</b> các gói đang nằm chờ ra dây Ethernet!</li>"
                    "<li><b>Aging Timeout:</b> Bộ đếm trong <code>TcpIp_MainFunction()</code> giảm dần TTL mỗi bản ghi theo <code>TcpIpArpTableEntryTimeoutSec</code> (mặc định 60s).</li>"
                    "</ul>"
                ),
            },
            {
                "label": "4.2 Static, AutoIP 169.254 & DHCP",
                "html": card(
                    "4.2. Cấp Phát Địa Chỉ IP: STATIC, LINKLOCAL_DOIP (AutoIP) & DHCP DORA",
                    diag.svg_ip_assignment()
                    + "<ul>"
                    "<li><b>TCPIP_IPADDR_ASSIGNMENT_STATIC:</b> Gán trực tiếp IP cố định trong cấu hình ECUC (tức thời &lt; 1ms), tối ưu cho ECU có Topology mạng xe cố định theo OEM.</li>"
                    "<li><b>TCPIP_IPADDR_ASSIGNMENT_LINKLOCAL_DOIP (RFC 3927):</b> Tự chọn IP dải <code>169.254.x.x</code>, gửi <i>ARP Probe</i> chờ theo <code>TcpIpAutoIpInitTimeoutMs</code> kiểm tra trùng lặp, rồi gửi <i>ARP Announce</i>. Rất quan trọng khi cắm trực tiếp máy chẩn đoán DoIP vào ECU mà không có DHCP Server!</li>"
                    "<li><b>Lưu trữ NvM (<code>PersistAutoIpArpToNvM</code>):</b> Bật để ghi IP AutoIP vào bộ nhớ bất khả biến <code>NvM_WriteBlock()</code>, giúp các lần khởi động sau của ECU vào DoIP cực nhanh (< 100ms).</li>"
                    "<li><b>TCPIP_IPADDR_ASSIGNMENT_DHCP:</b> Thực hiện chu trình 4 bước <code>Discover ➔ Offer ➔ Request ➔ Ack</code> và giám sát thời hạn thuê <i>DHCP Lease</i>.</li>"
                    "</ul>"
                ),
            },
            {
                "label": "4.3 Phân mảnh IPv4 & Reassembly",
                "html": card(
                    "4.3. Giải Phẫu Phân Mảnh IPv4 (DF, MF, Offset) & Tái Hợp Khi Vượt MTU",
                    diag.svg_ipv4_frag()
                    + "<ul>"
                    "<li><b>Cờ <code>DF (Don't Fragment — Thanh B Bit 7)</code>:</b> Nếu đặt <code>DF = 1</code> mà gói UDP có tổng chiều dài <code>(Payload + 8B UDP + 20B IP) &gt; MTU</code> (VD: 2828B &gt; 1500B), <code>TcpIp</code> bắt buộc hủy lệnh truyền và báo lỗi <code>TCPIP_E_MSGSIZE</code>!</li>"
                    "<li><b>Phép tính phân mảnh khi <code>DF = 0</code>:</b> Khối payload của từng mảnh IPv4 bắt buộc chia hết cho <b>8 bytes</b> (trừ mảnh cuối). Với <code>MTU = 1500B</code>, phần IP payload tối đa mỗi mảnh là <code>1480B</code> (= 185 × 8). Do đó Mảnh #1 đặt <b><code>MF = 1, FragOffset = 0</code></b>; Mảnh #2 đặt <b><code>MF = 0, FragOffset = 185</code></b> (185 × 8 = 1480B)!</li>"
                    "<li><b>Tái hợp chiều nhận (<code>ReassemblyBuffer</code>):</b> Khi nhận phân mảnh có <code>MF = 1</code> hoặc <code>FragOffset &gt; 0</code>, <code>TcpIp</code> lưu vào <code>ReassemblyBuffer</code> và chỉ đẩy 1 lần trọn gói hoàn chỉnh lên <code>SoAd_RxIndication()</code> khi đã lắp kín từ Byte 0 tới mảnh cuối <code>MF = 0</code>.</li>"
                    "</ul>"
                ),
            },
            {
                "label": "4.4 Giao thức ICMPv4/v6 & NvM",
                "html": card(
                    "4.4. Giao Thức Điều Khiển Mạng ICMPv4 / ICMPv6 & API TcpIp_IcmpTransmit()",
                    tbl(
                        ["Bản Tin ICMP", "Type / Code", "Xử Lý Trong AUTOSAR TcpIp"],
                        [
                            ["Echo Request (Ping)", "Type 8, Code 0", "Nếu <code>TcpIpIcmpEchoReplyEnabled == TRUE</code>, tầng L3 của TcpIp tự động phản hồi ngay Echo Reply (Type 0, Code 0) mà không đẩy lên SoAd."],
                            ["Destination Port Unreachable", "Type 3, Code 3", "Khi nhận gói UDP tới một Port không có Socket nào đang Bind(), tự động phát trả thông báo lỗi Port không mở."],
                            ["Fragmentation Needed (DF=1)", "Type 3, Code 4", "Báo cho đối tác giảm kích thước gói (Path MTU Discovery) khi gặp liên kết có MTU nhỏ hơn mà cờ DF=1."],
                            ["Chủ động gửi từ CDD/App", "<code>TcpIp_IcmpTransmit()</code>", "<code>SWS_TcpIp_00039</code>: Cho phép CDD kiểm thử độ trễ mạng bằng lệnh Ping chủ động từ ECU."]
                        ]
                    )
                ),
            },
        ],
    },
    {
        "title": "5. ONHOLD, TLS 1.3 & IdsM",
        "subs": [
            {
                "label": "5.1 Controller FSM & TCPIP_STATE_ONHOLD",
                "html": card(
                    "5.1. Máy Trạng Thái Bộ Điều Khiển & Giá Trị Của TCPIP_STATE_ONHOLD (SWS_TcpIp_00076)",
                    diag.svg_ctrl_onhold()
                    + "<ul>"
                    "<li><b>TCPIP_STATE_OFFLINE ➔ STARTUP ➔ ONLINE:</b> Luồng khởi động chuẩn do <code>EthSM_TcpIpModeIndication</code> điều phối khi đường truyền Ethernet vật lý ổn định.</li>"
                    "<li><b>Tại sao cần <code>TCPIP_STATE_ONHOLD</code> (Bit 6 = 1)?</b> Khi đường truyền vật lý bị nhiễu thoáng qua hoặc cắm lại Switch trong vài trăm mili-giây (<code>EthTrcv Link Down</code>), nếu chuyển thẳng về <code>OFFLINE</code> sẽ làm sập toàn bộ kết nối TCP chẩn đoán DoIP đang chạy và mất địa chỉ IP DHCP. Với <code>ONHOLD</code>, <code>TcpIp</code> tạm ngưng truyền nhưng <b>giữ nguyên địa chỉ IP &amp; giữ Socket TCP ESTABLISHED</b> để phục hồi tức thì khi Link UP!</li>"
                    "<li><b>TCPIP_STATE_SHUTDOWN ➔ OFFLINE:</b> Chỉ dùng khi tắt ECU hoặc ComM cắt kênh mạng hẳn: giải phóng DHCP Lease, xóa hàng đợi ARP và đóng toàn bộ Socket về <code>CLOSED</code>.</li>"
                    "</ul>"
                ),
            },
            {
                "label": "5.2 AUTOSAR TLS 1.2 / 1.3 (KeyM & Csm)",
                "html": card(
                    "5.2. Kiến Trúc Bảo Mật AUTOSAR TLS 1.2 / 1.3 Cho DoIP Secure Port 3496",
                    diag.svg_tls_handshake()
                    + "<ol>"
                    "<li><b>Bước 1 (Gán cấu hình TLS):</b> Trước khi kết nối, <code>SoAd</code> gọi <code>TcpIp_ChangeParameter(SockId, TCPIP_PARAMID_TLS_CONNECTION_ASSIGNMENT, &amp;TlsConnId)</code>.</li>"
                    "<li><b>Bước 2 (Giữ sau TCP 3-Way):</b> Sau khi <code>SYN / SYN+ACK / ACK</code> thành công, <code>TcpIp</code> <b>tạm giữ chưa gọi <code>SoAd_TcpConnected()</code></b> mà tự động thực hiện phiên TLS Handshake (<code>ClientHello ➔ ServerHello + Certificate</code>).</li>"
                    "<li><b>Bước 3 (Xác thực qua KeyM &amp; Csm):</b> Chứng chỉ X.509 của đối tác được kiểm chữ ký CA qua <b><code>KeyM_VerifyCertificate()</code></b>; khóa phiên đối xứng AES-128-GCM được tạo qua <b><code>Csm_KeyExchangeCalcSecret()</code></b>. Nếu chứng chỉ giả mạo/hết hạn, ECU bắn ngay <b>TLS Alert (Bad Certificate) + TCP RST</b> để ngăn tuyệt đối rò rỉ dữ liệu UDS!</li>"
                    "<li><b>Bước 4 (Mã hóa Record Layer):</b> Khi thành công (<b>Bit 1 TLS_ACTV = 1</b>), mọi payload gửi/nhận tự động qua <code>Csm_AEADEncrypt()</code> / <code>Decrypt()</code> (Header <code>17 03 03 ...</code>).</li>"
                    "</ol>"
                ),
            },
            {
                "label": "5.3 Đổi nóng với TcpIp_ChangeParameter()",
                "html": card(
                    "5.3. Tinh Chỉnh Động Tham Số Socket Bằng TcpIp_ChangeParameter() (SWS_TcpIp_00016)",
                    tbl(
                        ["TcpIp_ParamIdType", "Mã Số / Kiểu Dữ Liệu", "Tác Dụng Khi Đổi Nóng Lúc Chạy"],
                        [
                            ["<code>TCPIP_PARAMID_FRAMEPRIO</code>", "<code>uint8 (0..7)</code>", "Thay đổi tức thời mức độ ưu tiên thẻ VLAN 802.1Q PCP cho từng Socket cụ thể."],
                            ["<code>TCPIP_PARAMID_TTL</code>", "<code>uint8 (1..255)</code>", "Đặt giá trị IP Time-To-Live (VD: đặt TTL=1 cho bản tin khám phá mạng nội bộ để chặn đi qua Router)."],
                            ["<code>TCPIP_PARAMID_TCP_NAGLE</code>", "<code>uint8 (0/1)</code>", "Tắt thuật toán Nagle trên riêng Socket DoIP để đẩy cờ <code>PSH=1</code> tức thì."],
                            ["<code>TCPIP_PARAMID_TCP_KEEPALIVE</code>", "<code>uint8 (0/1)</code>", "Bật/tắt gói thăm dò Keep-Alive cho kết nối giữ phiên dài hạn."],
                            ["<code>TCPIP_PARAMID_TLS_CONNECTION_ASSIGNMENT</code>", "<code>TcpIp_TlsConnectionIdType</code>", "Gán Profile cấu hình AUTOSAR TLS 1.2/1.3 cho Socket TCP trước khi bắt tay."]
                        ]
                    )
                ),
            },
            {
                "label": "5.4 SYN Cookies, Spoofing & IdsM",
                "html": card(
                    "5.4. Phòng Thủ Tấn Công Mạng Ethernet (UN R155): SYN Cookies & IdsM Reporting",
                    diag.svg_idsm_defense()
                    + "<ul>"
                    "<li><b>Chống bão TCP SYN Flood bằng <code>SYN Cookies</code>:</b> Tin tặc gửi hàng nghìn gói <code>SYN</code> với IP nguồn giả mạo nhằm làm cạn hết phần tử Socket tĩnh trong <code>TcpIp_SocketTable</code>. Khi bật <code>TcpIpSynCookiesEnabled</code>, <code>TcpIp</code> không cấp phát bộ nhớ Socket cho nửa kết nối (Half-Open) mà mã hóa thông tin trạng thái thành giá trị <code>ISN</code> (Hash Cookie) trả trong <code>SYN+ACK</code>.</li>"
                    "<li><b>Chống đầu độc bảng ARP (<code>ARP Spoofing</code>):</b> Khi nhận khung <code>ARP Reply</code> thay đổi bất hợp pháp MAC của bản ghi tĩnh (như Gateway <code>192.168.10.1</code>), ngăn xếp phát hiện xung đột, từ chối ghi đè và báo ngay lên <b>IdsM</b>.</li>"
                    "<li><b>Sự kiện an ninh chuẩn lên IdsM:</b> Mọi sự cố đều gọi <code>IdsM_SetSecurityEvent()</code> (<code>TCPIP_IDSM_SEV_SYN_FLOOD</code>, <code>TCPIP_IDSM_SEV_ARP_CONFLICT</code>, <code>TCPIP_IDSM_SEV_TLS_CERT_INVALID</code>) để ghi nhật ký hoặc gửi cảnh báo về trung tâm SOC (V-SOC).</li>"
                    "</ul>"
                ),
            },
        ],
    },
    {
        "title": "6. API R23-11, ECUC & Bẫy Lỗi",
        "subs": [
            {
                "label": "6.1 Từ Điển API SWS_TcpIp R23-11",
                "html": card(
                    "6.1. Bảng Tra Cứu Hàm API & Callbacks Chuẩn AUTOSAR TcpIp (R20-11 .. R23-11)",
                    tbl(
                        ["Hàm API / Callback", "Service ID", "Hướng Gọi", "Chức Năng & Lưu Ý SWS_TcpIp"],
                        [
                            ["<code>TcpIp_Init()</code>", "0x01", "EcuM ➔ TcpIp", "Khởi tạo SocketTable, ARP Cache và cấu hình ECUC trước khi hoạt động."],
                            ["<code>TcpIp_GetVersionInfo()</code>", "0x02", "App ➔ TcpIp", "Trả về ModuleId = 170 (0x00AA) và phiên bản BSW."],
                            ["<code>TcpIp_SoAdGetSocket()</code>", "0x03", "SoAd ➔ TcpIp", "Xin cấp 1 Socket TCP/UDP tĩnh từ Pool."],
                            ["<code>TcpIp_Close(SockId, Abort)</code>", "0x04", "SoAd ➔ TcpIp", "Abort=FALSE: đóng 4-Way FIN; Abort=TRUE: phát ngay RST xóa Socket."],
                            ["<code>TcpIp_Bind(SockId, LA, Port)</code>", "0x05", "SoAd ➔ TcpIp", "Gắn IP cục bộ & Port; kích hoạt IGMP + MAC Filter nếu là Multicast."],
                            ["<code>TcpIp_TcpConnect() / TcpListen()</code>", "0x06 / 0x07", "SoAd ➔ TcpIp", "Client chủ động gửi SYN hoặc Server mở cổng thụ động LISTEN."],
                            ["<code>TcpIp_TcpReceived(SockId, Len)</code>", "0x08", "SoAd ➔ TcpIp", "Thông báo đã xử lý xong Data nhận để TcpIp mở rộng lại TCP Window!"],
                            ["<code>TcpIp_RequestComMode()</code>", "0x09", "EthSM ➔ TcpIp", "Chuyển ONLINE / ONHOLD / OFFLINE."],
                            ["<code>TcpIp_RequestIpAddrAssignment()</code>", "0x0A", "SoAd ➔ TcpIp", "Kích hoạt STATIC / AutoIP / DHCP khi ở chế độ MANUAL."],
                            ["<code>TcpIp_ChangeParameter()</code>", "0x0F", "SoAd ➔ TcpIp", "Đổi nóng TTL, PCP, Nagle, KeepAlive, TLS Connection."],
                            ["<code>TcpIp_UdpTransmit() / TcpTransmit()</code>", "0x12 / 0x13", "SoAd ➔ TcpIp", "Truyền gói qua Zero-Copy (hỗ trợ DataPtr=NULL kéo từ SoAd_CopyTxData)."],
                            ["<code>TcpIp_RxIndication()</code>", "0x14", "EthIf ➔ TcpIp", "Nhận khung từ Eth/EthIf (0x0800 IP, 0x0806 ARP, 0x86DD IPv6)."],
                            ["<code>TcpIp_MainFunction()</code>", "0x15", "Os/SchM", "Tác vụ nền quét RTO, TIME_WAIT, Keep-Alive, ARP Aging, DHCP Lease."]
                        ],
                        extra_cls="hb-table-api"
                    )
                ),
            },
            {
                "label": "6.2 Tham Số ECUC Cốt Lõi",
                "html": card(
                    "6.2. Cấu Trúc Container ECUC Trọng Tâm Của Module TcpIp",
                    tbl(
                        ["Container ECUC", "Tham Số Tiêu Biểu", "Vai Trò Trong Thực Tế Dự Án"],
                        [
                            ["<code>TcpIpGeneral</code>", "<code>TcpIpDevErrorDetect</code>, <code>TcpIpMainFunctionPeriod</code>, <code>TcpIpBufferMemory</code>", "Quy định kiểm tra lỗi DET (170), chu kỳ tác vụ định thời (5ms) và vùng đệm Zero-Copy tĩnh."],
                            ["<code>TcpIpCtrl</code>", "<code>TcpIpCtrlMtu</code>, <code>TcpIpCtrlFramePrioDefault</code>, <code>TcpIpEthIfCtrlRef</code>", "Liên kết kênh logic sang EthIfCtrl vật lý, thiết lập MTU 1500B và VLAN Priority mặc định."],
                            ["<code>TcpIpLocalAddr</code>", "<code>TcpIpAssignmentMethod</code>, <code>TcpIpAssignmentTrigger</code>, <code>AutoIpNvramBlockRef</code>", "Cấu hình Unicast/Multicast, phương thức DHCP/Static/AutoIP DoIP và lưu NvM."],
                            ["<code>TcpIpTcpConfig</code>", "<code>TcpIpTcpMaxRtx</code>, <code>TcpIpTcpNagleEnabled</code>, <code>TcpIpTcpReceiveWindowMax</code>", "Tinh chỉnh độ nhạy tái truyền, thuật toán Nagle và kích thước cửa sổ trượt TCP."],
                            ["<code>TcpIpArp / Frag / Icmp / Tls</code>", "<code>TcpIpArpTableEntryTimeout</code>, <code>IpReassemblyEnabled</code>, <code>SynCookies</code>", "Cấu hình thời gian sống ARP, cắt mảnh MTU, tự trả Ping ICMP và bảo mật TLS / SYN Cookies."]
                        ]
                    )
                ),
            },
            {
                "label": "6.3 Mã Lỗi DET (170), DEM & IdsM",
                "html": card(
                    "6.3. Bảng Tra Cứu Nhanh Mã Lỗi DET (Module 170), DEM & Sự Kiện IdsM",
                    tbl(
                        ["Nhóm Báo Cáo", "Tên Định Danh Chuẩn", "Nguyên Nhân Gây Lỗi & Biện Pháp Khắc Phục"],
                        [
                            ["DET (ModuleId 170)", "<code>TCPIP_E_UNINIT (0x01)</code> / <code>TCPIP_E_NOTINIT</code>", "Gọi API của TcpIp trước khi EcuM/BswM hoàn tất <code>TcpIp_Init()</code>."],
                            ["DET (ModuleId 170)", "<code>TCPIP_E_PARAM_POINTER (0x02)</code>", "Truyền con trỏ NULL_PTR vào tham số bắt buộc (hoặc NULL vào TcpTransmit khi ForceRetrieve=FALSE)."],
                            ["DET (ModuleId 170)", "<code>TCPIP_E_INV_SOCK_ID (0x08)</code>", "Truyền SocketId vượt quá số Socket cấu hình hoặc Socket đã đóng."],
                            ["DET (ModuleId 170)", "<code>TCPIP_E_ADDRINUSE (0x0A)</code>", "Gọi <code>TcpIp_Bind()</code> trùng Port đang mở mà chưa đóng xong (hoặc đang kẹt ở TIME_WAIT)."],
                            ["DET (ModuleId 170)", "<code>TCPIP_E_NOBUFS (0x04)</code> / <code>MSGSIZE</code>", "Cạn Tx DMA Descriptor của EthIf hoặc kích thước gói UDP &gt; MTU khi cờ <code>DF=1</code>."],
                            ["DEM Runtime Fault", "<code>TCPIP_E_CONNREFUSED</code> / <code>TCPIP_E_TIMEDOUT</code>", "Đối tác từ chối bằng RST hoặc vượt quá số lần tái truyền <code>TcpIpTcpMaxRtx</code>."],
                            ["IdsM Security", "<code>TCPIP_IDSM_SEV_SYN_FLOOD</code> / <code>ARP_CONFLICT</code>", "Phát hiện tấn công bão SYN hoặc giả mạo ARP đầu độc bảng định tuyến."]
                        ]
                    )
                ),
            },
            {
                "label": "6.4 6 Bẫy Lỗi Thực Chiến Cần Tránh",
                "html": card(
                    "6.4. 6 Bẫy Lỗi Kinh Điển Khi Tích Hợp Ethernet Stack (SoAd – TcpIp – EthIf – EthSM)",
                    "<ol>"
                    "<li><b>Quên gọi <code>TcpIp_TcpReceived()</code>:</b> Sau vài KB dữ liệu, <code>WindowSize</code> tụt xuống <code>0 [ZeroWindow]</code> làm Tester ngừng truyền hẳn gói DoIP UDS tiếp theo!</li>"
                    "<li><b>Bật Nagle (<code>TRUE</code>) trên kết nối DoIP/UDS:</b> Gây trễ 40ms–200ms cho các bản tin ngắn (Negative Response 0x7F), dễ rớt test Timing P2 của ISO 14229!</li>"
                    "<li><b>Quên cấu hình <code>EthIf_UpdatePhysAddrFilter</code> cho Multicast SOME/IP-SD:</b> Gói tin gửi đi bình thường nhưng ECU không bao giờ nhận được <code>OfferService</code> vì MAC phần cứng tự lọc bỏ khung <code>01:00:5E:...</code>!</li>"
                    "<li><b>Không cấp đủ <code>ArpPendingQueue</code>:</b> Làm rơi ngay gói bản tin đầu tiên sau khi Boot ECU (như bản tin UdpNm / SOME/IP đầu tiên) trong lúc đang chờ <code>ARP Reply</code>.</li>"
                    "<li><b>Bật cờ <code>DF=1</code> khi phát UDP lớn hơn MTU 1500B:</b> Ngăn xếp từ chối cắt mảnh và trả lỗi liên tục thay vì chia gói sang nhiều Fragment.</li>"
                    "<li><b>Lệch <code>MTU</code> giữa <code>TcpIpCtrlMtu</code> và <code>EthIfCtrlMtu</code>:</b> Gây lỗi Overflow DMA TX Descriptor tại trình điều khiển <code>Eth</code> MCAL.</li>"
                    "</ol>"
                ),
            },
        ],
    },
]

JS_TAIL = r"""
const hbState = { tab1: 0, sub: 0, abbrCat: "ALL", abbrQuery: "" };

function switchHbTab1(idx) {
  hbState.tab1 = Number(idx) || 0;
  hbState.sub = 0;
  for (let i = 0; i < 7; i++) {
    const b = document.getElementById("hbTab1_" + i);
    if (b) b.classList.toggle("active", i === hbState.tab1);
  }
  const isAbbr = hbState.tab1 === 6;
  const nav2 = document.getElementById("hbNav2");
  const abbrBox = document.getElementById("hbAbbrFilterBox");
  if (nav2) nav2.classList.toggle("hidden", isAbbr);
  if (abbrBox) abbrBox.classList.toggle("hidden", !isAbbr);
  renderCurrentHandbookView();
}

function switchHbSubTab(subIdx) {
  hbState.sub = Number(subIdx) || 0;
  renderCurrentHandbookView();
}

function setAbbrCategory(cat) {
  hbState.abbrCat = cat || "ALL";
  ["ALL", "CORE", "TCP", "UDP_IP", "SEC_DMA", "API"].forEach(function (c) {
    const p = document.getElementById("catPill_" + c);
    if (p) p.classList.toggle("active", c === hbState.abbrCat);
  });
  renderAbbreviationTable();
}

function highlightMatch(text, query) {
  const safe = escHtml(text);
  if (!query) return safe;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp("(" + escaped + ")", "gi");
  return safe.replace(re, "<mark>$1</mark>");
}

function filterAbbreviationTable() {
  const inp = document.getElementById("abbrSearchInput");
  hbState.abbrQuery = inp ? inp.value.trim() : "";
  if (hbState.tab1 === 6) {
    renderAbbreviationTable();
  }
}

function renderAbbreviationTable() {
  const area = document.getElementById("hbContentArea");
  const badge = document.getElementById("abbrCountBadge");
  const q = hbState.abbrQuery.toLowerCase();
  const cat = hbState.abbrCat;
  const filtered = ABBREVIATIONS.filter(function (item) {
    if (cat !== "ALL" && item.cat !== cat) return false;
    if (!q) return true;
    return (
      item.abbr.toLowerCase().indexOf(q) !== -1 ||
      item.full.toLowerCase().indexOf(q) !== -1 ||
      item.cat.toLowerCase().indexOf(q) !== -1 ||
      item.desc.toLowerCase().indexOf(q) !== -1
    );
  });

  if (badge) {
    badge.textContent = "Hiển thị " + filtered.length + " / " + ABBREVIATIONS.length + " thuật ngữ";
  }

  if (hbState.tab1 !== 6 || !area) return;

  const catLabels = {
    CORE: "🌐 Core & SoAd",
    TCP: "🔁 TCP FSM & Timer",
    UDP_IP: "📡 UDP, IP, ARP & DHCP",
    SEC_DMA: "⚡ Zero-Copy, VLAN & TLS",
    API: "📜 APIs, ECUC & DET/DEM"
  };

  let rowsHtml = filtered.map(function (item) {
    return "<tr>" +
      "<td class=\"mono\" style=\"font-weight:800;color:var(--pri)\">" + highlightMatch(item.abbr, hbState.abbrQuery) + "</td>" +
      "<td><b>" + highlightMatch(item.full, hbState.abbrQuery) + "</b></td>" +
      "<td><span class=\"pill pill-cyan\">" + escHtml(catLabels[item.cat] || item.cat) + "</span></td>" +
      "<td>" + highlightMatch(item.desc, hbState.abbrQuery) + "</td>" +
    "</tr>";
  }).join("");

  if (!rowsHtml) {
    rowsHtml = "<tr><td colspan=\"4\" style=\"text-align:center;color:var(--mut);padding:20px\">Không tìm thấy thuật ngữ phù hợp với từ khóa \"" + escHtml(hbState.abbrQuery) + "\".</td></tr>";
  }

  area.innerHTML =
    '<div class="hb-card">' +
      '<h3>🔤 Từ Điển Thuật Ngữ &amp; Từ Viết Tắt AUTOSAR TcpIp &amp; Ethernet Stack (' + filtered.length + ' / ' + ABBREVIATIONS.length + ')</h3>' +
      '<table class="hb-table"><thead><tr>' +
        '<th style="width:15%">Thuật Ngữ / Viết Tắt</th>' +
        '<th style="width:24%">Tên Đầy Đủ (English Term)</th>' +
        '<th style="width:16%">Phân Nhóm</th>' +
        '<th>Giải Thích Chi Tiết &amp; Vai Trò Trong AUTOSAR</th>' +
      '</tr></thead><tbody>' + rowsHtml + '</tbody></table>' +
    '</div>';
}

function renderCurrentHandbookView() {
  if (hbState.tab1 === 6) {
    renderAbbreviationTable();
    return;
  }
  const tab = HANDBOOK_TABS[hbState.tab1] || HANDBOOK_TABS[0];
  const nav2 = document.getElementById("hbNav2");
  if (nav2) {
    nav2.innerHTML = tab.subs.map(function (s, i) {
      return '<button class="hb-tab2 ' + (i === hbState.sub ? "active" : "") + '" onclick="switchHbSubTab(' + i + ')">' + escHtml(s.label) + "</button>";
    }).join("");
  }
  const sub = tab.subs[hbState.sub] || tab.subs[0];
  const area = document.getElementById("hbContentArea");
  if (area && sub) {
    area.innerHTML = sub.html;
  }
}

document.addEventListener("DOMContentLoaded", function () {
  populateScenarioDropdown();
  loadScenario(0, false);
  syncInputsFromConfig();
  onActionModeChange();
  initTooltipHandlers();
  renderAbbreviationTable();
  renderAll();
});
"""


def main():
    out_path = os.path.join(HERE, "part6_handbook.js")
    tabs_json = json.dumps(HANDBOOK_TABS, ensure_ascii=False, indent=2)
    content = (
        "// ================= PART 6: AUTO-GENERATED 6x4 HANDBOOK & 58-TERM GLOSSARY =================\n\n"
        + f"const HANDBOOK_TABS = {tabs_json};\n"
        + JS_TAIL
    )
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"[generate_part6_tcpip] Wrote {out_path} ({len(content)} bytes, {len(HANDBOOK_TABS)} main tabs x {sum(len(t['subs']) for t in HANDBOOK_TABS)} subtopics)")


if __name__ == "__main__":
    main()
