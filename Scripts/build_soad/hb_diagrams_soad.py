"""Theme-aware SVG diagram generators for the AUTOSAR Classic SoAd Handbook."""
import html


def esc(s):
    return html.escape(str(s), quote=True)


def title_txt(text, y=22):
    return (
        f'<text x="450" y="{y}" text-anchor="middle" font-size="13.5" '
        f'font-weight="800" fill="var(--hb-text)">{esc(text)}</text>'
    )


def svg_wrap(w, h, inner):
    markers = [
        ("hbArr", "var(--hb-accent)"),
        ("hbArrGreen", "var(--hb-green)"),
        ("hbArrAmber", "var(--hb-amber)"),
        ("hbArrRed", "var(--hb-red)"),
        ("hbArrPurple", "var(--hb-purple)"),
        ("hbArrCyan", "var(--hb-cyan)"),
    ]
    m_xml = "".join(
        f'<marker id="{mid}" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">'
        f'<path d="M0,0 L8,4 L0,8 Z" fill="{col}"/></marker>'
        for mid, col in markers
    )
    return (
        f'<svg viewBox="0 0 {w} {h}" xmlns="http://www.w3.org/2000/svg" '
        f'style="width:100%;height:auto;display:block;background:var(--hb-bg);border-radius:8px">\n'
        f'<defs>{m_xml}</defs>\n'
        f'{inner}\n</svg>'
    )


def box_ml(x, y, w, h, lines, fill="var(--hb-box)", stroke="var(--hb-stroke)", title_color="var(--hb-accent)"):
    out = [f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="7" fill="{fill}" stroke="{stroke}" stroke-width="1.7"/>']
    n = len(lines)
    start_y = y + (h - (n - 1) * 16) / 2 + 4
    cx = x + w / 2
    for idx, line in enumerate(lines):
        ly = start_y + idx * 16
        fs = 12 if idx == 0 else 10.5
        fw = "700" if idx == 0 else "400"
        col = title_color if idx == 0 else "var(--hb-text)"
        out.append(
            f'<text x="{cx:.1f}" y="{ly:.1f}" text-anchor="middle" '
            f'font-size="{fs}" font-weight="{fw}" fill="{col}">{esc(line)}</text>'
        )
    return "\n".join(out)


def arrow_line(x1, y1, x2, y2, label="", color="var(--hb-accent)", marker="hbArr", dy=-8, dx=0):
    parts = [
        f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" '
        f'stroke="{color}" stroke-width="1.9" marker-end="url(#{marker})"/>'
    ]
    if label:
        mx = (x1 + x2) / 2 + dx
        my = (y1 + y2) / 2 + dy
        parts.append(
            f'<text x="{mx:.1f}" y="{my:.1f}" text-anchor="middle" '
            f'font-size="10" font-weight="700" fill="{color}">{esc(label)}</text>'
        )
    return "\n".join(parts)


def arrow_path(d, color="var(--hb-accent)", marker="hbArr"):
    return (
        f'<path d="{d}" fill="none" stroke="{color}" stroke-width="1.9" '
        f'marker-end="url(#{marker})"/>'
    )


def pill_note(x, y, w, h, text, stroke="var(--hb-amber)", fg="var(--hb-amber)"):
    cx = x + w / 2
    cy = y + h / 2 + 4
    return (
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="12" fill="var(--hb-surface)" stroke="{stroke}" stroke-width="1.4"/>'
        f'<text x="{cx:.1f}" y="{cy:.1f}" text-anchor="middle" font-size="10.5" font-weight="700" fill="{fg}">{esc(text)}</text>'
    )


def svg_eth_stack():
    inner = [
        title_txt("1. Kiến trúc Ngăn xếp Automotive Ethernet AUTOSAR Classic"),
        box_ml(40, 36, 260, 46, [
            "Application SW-C + RTE",
            "SomeIpXf / E2EXf (Không biết IP/Port)"
        ], stroke="var(--hb-accent)", title_color="var(--hb-accent)"),
        arrow_line(170, 82, 170, 114, "I-PDU", "var(--hb-accent)", "hbArr", dy=4, dx=26),
        box_ml(40, 116, 260, 52, [
            "PduR / Com / LdCom / Dcm",
            "Định tuyến IF & TP tầng trên"
        ], stroke="var(--hb-accent)", title_color="var(--hb-accent)"),
        box_ml(320, 116, 260, 52, [
            "Sd (Service Discovery)",
            "Offer / Subscribe / Điều khiển"
        ], stroke="var(--hb-purple)", title_color="var(--hb-purple)"),
        box_ml(600, 116, 260, 52, [
            "DoIP / UdpNm / Xcp / EthSM",
            "Kết nối trực tiếp & Quản lý Mode"
        ], stroke="var(--hb-cyan)", title_color="var(--hb-cyan)"),
        arrow_line(170, 168, 170, 204, "IfTx / TpTx", "var(--hb-accent)", "hbArr", dy=3, dx=38),
        arrow_line(450, 168, 450, 204, "OpenSoCon / RG", "var(--hb-purple)", "hbArrPurple", dy=3, dx=48),
        arrow_line(730, 168, 730, 204, "Direct / ModeChg", "var(--hb-cyan)", "hbArrCyan", dy=3, dx=50),
        box_ml(40, 206, 820, 62, [
            "SoAd Core — Socket Adaptor (ModuleId 56 / 0x0038)",
            "PduRoute | SocketRoute | 8B PDU Header | nPdu Buffer | SoAdRxBuffer | RoutingGroup",
            "Ánh xạ trừu tượng AUTOSAR PduId ↔ TcpIp SocketId + Best-Match Filter"
        ], fill="var(--hb-surface)", stroke="var(--hb-green)", title_color="var(--hb-green)"),
        arrow_line(450, 268, 450, 304, "UdpTx / TcpTx / Bind", "var(--hb-amber)", "hbArrAmber", dy=3, dx=58),
        arrow_line(730, 268, 730, 304, "Det / SecEvent", "var(--hb-red)", "hbArrRed", dy=3, dx=46),
        box_ml(40, 306, 230, 48, [
            "EthIf / EthTrcv",
            "100/1000BASE-T1 PHY"
        ], stroke="var(--hb-amber)", title_color="var(--hb-amber)"),
        arrow_line(320, 330, 272, 330, "EthTx", "var(--hb-amber)", "hbArrAmber", dy=-8),
        box_ml(320, 306, 265, 48, [
            "TcpIp Stack (UDP / TCP)",
            "IPv4 / DHCP / RxIndication"
        ], stroke="var(--hb-amber)", title_color="var(--hb-amber)"),
        box_ml(610, 306, 250, 48, [
            "Det & IdsM",
            "Dev/Runtime Error & Security"
        ], stroke="var(--hb-red)", title_color="var(--hb-red)")
    ]
    return svg_wrap(900, 368, "\n".join(inner))


def svg_socon_fsm():
    inner = [
        title_txt("2. Máy trạng thái Kết nối SoAd_SoConModeType (SWS_SoAd)"),
        arrow_path("M 120,108 C 120,44 780,44 780,106", color="var(--hb-green)", marker="hbArrGreen"),
        pill_note(190, 36, 520, 24, "UDP + LocalIp ASSIGNED + OpenSoCon (hoặc AutoSetup=TRUE) → Trực tiếp ONLINE", stroke="var(--hb-green)", fg="var(--hb-green)"),
        box_ml(25, 108, 190, 76, [
            "SOAD_SOCON_OFFLINE",
            "OpenRefCount = 0",
            "Chưa mở TcpIp socket"
        ], stroke="var(--hb-red)", title_color="var(--hb-red)"),
        box_ml(355, 108, 190, 76, [
            "SOAD_SOCON_RECONNECT",
            "Chờ IP ASSIGNED hoặc",
            "chờ TCP Handshake / Peer"
        ], stroke="var(--hb-amber)", title_color="var(--hb-amber)"),
        box_ml(685, 108, 190, 76, [
            "SOAD_SOCON_ONLINE",
            "Socket sẵn sàng Tx / Rx",
            "Báo SoConModeChg(ONLINE)"
        ], stroke="var(--hb-green)", title_color="var(--hb-green)"),
        arrow_line(215, 130, 353, 130, "OpenSoCon (TCP/NoIP)", "var(--hb-amber)", "hbArrAmber", dy=-8),
        arrow_line(353, 162, 217, 162, "CloseSoCon (Ref=0)", "var(--hb-red)", "hbArrRed", dy=14),
        arrow_line(545, 130, 683, 130, "TcpConnected/Accepted", "var(--hb-green)", "hbArrGreen", dy=-8),
        arrow_line(683, 162, 547, 162, "TCP_RESET / ONHOLD", "var(--hb-amber)", "hbArrAmber", dy=14),
        pill_note(55, 204, 790, 30, "Mọi chuyển đổi ONLINE ↔ RECONNECT ↔ OFFLINE đều thông báo tới Sd / EthSM qua SoConModeChg()", stroke="var(--hb-accent)", fg="var(--hb-accent)")
    ]
    return svg_wrap(900, 246, "\n".join(inner))


def svg_pdu_header():
    inner = [
        title_txt("3. Cấu trúc Khung 8-Byte SoAd PDU Header & Ghép kênh (SoAdPduHeaderEnable=TRUE)"),
        box_ml(30, 36, 200, 64, [
            "Byte 0..3: HeaderId",
            "32-bit Big-Endian",
            "Ví dụ: 0x01010001"
        ], fill="var(--hb-surface)", stroke="var(--hb-cyan)", title_color="var(--hb-cyan)"),
        box_ml(240, 36, 200, 64, [
            "Byte 4..7: PduLength",
            "32-bit Big-Endian",
            "Ví dụ: 0x00000020 (32B)"
        ], fill="var(--hb-surface)", stroke="var(--hb-amber)", title_color="var(--hb-amber)"),
        box_ml(450, 36, 420, 64, [
            "Byte 8 .. (8 + N - 1): AUTOSAR SDU Payload",
            "Dữ liệu SOME/IP / Com / DoIP từ PduR hoặc tầng trên",
            "Độ dài đúng N = PduLength Bytes (không gồm 8B Header)"
        ], stroke="var(--hb-green)", title_color="var(--hb-green)"),
        arrow_path("M 170,100 L 170,122 L 735,122 L 735,180", color="var(--hb-red)", marker="hbArrRed"),
        arrow_path("M 130,100 L 130,147 L 445,147 L 445,180", color="var(--hb-cyan)", marker="hbArrCyan"),
        arrow_path("M 90,100 L 90,168 L 160,168 L 160,180", color="var(--hb-cyan)", marker="hbArrCyan"),
        '<text x="580" y="115" text-anchor="middle" font-size="10" font-weight="700" fill="var(--hb-red)">HeaderId lạ → Drop + Báo lỗi</text>',
        '<text x="290" y="140" text-anchor="middle" font-size="10" font-weight="700" fill="var(--hb-cyan)">Tra bảng HeaderId khớp SocketRouteRx</text>',
        box_ml(30, 182, 260, 52, [
            "SocketRouteRx 0x01010001",
            "→ PduR_SoAdIfRxIndication(ID_A)"
        ], stroke="var(--hb-cyan)", title_color="var(--hb-cyan)"),
        box_ml(315, 182, 260, 52, [
            "SocketRouteRx 0x01010002",
            "→ PduR_SoAdIfRxIndication(ID_B)"
        ], stroke="var(--hb-cyan)", title_color="var(--hb-cyan)"),
        box_ml(600, 182, 270, 52, [
            "Unknown HeaderId (0xDEAD...)",
            "→ SOAD_E_INV_PDUHEADER_ID"
        ], stroke="var(--hb-red)", title_color="var(--hb-red)")
    ]
    return svg_wrap(900, 246, "\n".join(inner))


def svg_best_match():
    inner = [
        title_txt("4. Thuật toán Best-Match Remote Address & Bộ lọc Chấp nhận Gói"),
        box_ml(25, 72, 200, 82, [
            "Gói Rx từ TcpIp",
            "IP nguồn: 192.168.10.100",
            "Port nguồn: 30490"
        ], stroke="var(--hb-accent)", title_color="var(--hb-accent)"),
        arrow_path("M 225,113 L 258,113 L 258,57 L 298,57", color="var(--hb-green)", marker="hbArrGreen"),
        arrow_path("M 225,113 L 258,113 L 258,99 L 298,99", color="var(--hb-accent)", marker="hbArr"),
        arrow_path("M 225,113 L 258,113 L 258,141 L 298,141", color="var(--hb-purple)", marker="hbArrPurple"),
        arrow_path("M 225,113 L 258,113 L 258,183 L 298,183", color="var(--hb-amber)", marker="hbArrAmber"),
        box_ml(300, 40, 320, 34, ["Score 4: Exact IP + Exact Port (Ưu tiên #1)"], stroke="var(--hb-green)", title_color="var(--hb-green)"),
        box_ml(300, 82, 320, 34, ["Score 3: Exact IP + ANY Port (Ưu tiên #2)"], stroke="var(--hb-accent)", title_color="var(--hb-accent)"),
        box_ml(300, 124, 320, 34, ["Score 2: ANY IP + Exact Port (Ưu tiên #3)"], stroke="var(--hb-purple)", title_color="var(--hb-purple)"),
        box_ml(300, 166, 320, 34, ["Score 1: Wildcard ANY:ANY (Dự phòng #4)"], stroke="var(--hb-amber)", title_color="var(--hb-amber)"),
        '<line x1="620" y1="57" x2="642" y2="57" stroke="var(--hb-green)" stroke-width="1.9"/>',
        '<line x1="620" y1="99" x2="642" y2="99" stroke="var(--hb-accent)" stroke-width="1.9"/>',
        '<line x1="620" y1="141" x2="642" y2="141" stroke="var(--hb-purple)" stroke-width="1.9"/>',
        '<line x1="620" y1="183" x2="642" y2="183" stroke="var(--hb-amber)" stroke-width="1.9"/>',
        '<line x1="642" y1="57" x2="642" y2="183" stroke="var(--hb-green)" stroke-width="1.9"/>',
        arrow_line(642, 76, 688, 76, "Khớp", "var(--hb-green)", "hbArrGreen", dy=-8),
        arrow_line(642, 176, 688, 176, "Score=0", "var(--hb-red)", "hbArrRed", dy=-8),
        box_ml(690, 44, 185, 64, [
            "Chọn SoCon Điểm Cao",
            "Nhất & Tách Header"
        ], stroke="var(--hb-green)", title_color="var(--hb-green)"),
        box_ml(690, 144, 185, 64, [
            "Nếu Filter=TRUE & Trượt",
            "Drop + Tăng DROP_UDP/TCP"
        ], stroke="var(--hb-red)", title_color="var(--hb-red)")
    ]
    return svg_wrap(900, 220, "\n".join(inner))


def svg_if_tp_tx():
    inner = [
        title_txt("5. So sánh Luồng Phát IF (Đồng bộ) và TP (Streaming qua CopyTxData)"),
        box_ml(25, 44, 410, 172, [
            "Nhánh IF — SoAd_IfTransmit(TxPduId, PduInfoPtr)",
            "1. Toàn bộ SDU nằm sẵn trong PduInfoPtr→SduDataPtr",
            "2. Đóng 8B Header (nếu bật) + Kiểm tra RoutingGroup",
            "3. Nếu nPdu NEVER → Lưu đệm; ALWAYS → UdpTransmit",
            "4. Phát xong → Báo UpperLayer_SoAdIfTxConfirmation()"
        ], stroke="var(--hb-green)", title_color="var(--hb-green)"),
        box_ml(465, 44, 410, 172, [
            "Nhánh TP — SoAd_TpTransmit(TxPduId, TotalLen)",
            "1. Lưu thông tin phiên TP, gọi TcpIp_TcpTransmit(TotalLen)",
            "2. Khi TcpIp rảnh bộ đệm sẽ gọi SoAd_CopyTxData()",
            "3. SoAd gọi PduR_SoAdTpCopyTxData() rút từng phần",
            "4. Báo TpTxConfirmation khi copy hết hoặc có TCP ACK"
        ], stroke="var(--hb-cyan)", title_color="var(--hb-cyan)")
    ]
    return svg_wrap(900, 232, "\n".join(inner))


def svg_npdu_bundling():
    inner = [
        title_txt("6. Cơ chế Gom Gói nPdu UDP Tx (Giảm tải Khung Ethernet)"),
        box_ml(25, 50, 230, 62, [
            "PDU A (TRIGGER_NEVER)",
            "8B Hdr 0x010100A1 + 24B"
        ], stroke="var(--hb-amber)", title_color="var(--hb-amber)"),
        box_ml(25, 134, 230, 62, [
            "PDU B (TRIGGER_ALWAYS)",
            "8B Hdr 0x010100B2 + 20B"
        ], stroke="var(--hb-green)", title_color="var(--hb-green)"),
        arrow_line(255, 81, 338, 81, "Giữ đệm", "var(--hb-amber)", "hbArrAmber", dy=-8),
        arrow_line(255, 165, 338, 165, "Xả ngay!", "var(--hb-green)", "hbArrGreen", dy=-8),
        box_ml(340, 56, 240, 132, [
            "nPdu UDP Tx Buffer (RAM)",
            "Chứa [PDU A] + Đếm TriggerTimeout",
            "Xả lô khi: có PDU TRIGGER_ALWAYS,",
            "hết TriggerTimeout ở MainFunction,",
            "hoặc sắp vượt MTU nPduBufferMax"
        ], stroke="var(--hb-accent)", title_color="var(--hb-accent)"),
        arrow_line(580, 122, 653, 122, "Gửi 1 gói", "var(--hb-green)", "hbArrGreen", dy=-8),
        box_ml(655, 76, 220, 92, [
            "1 Gói UDP Datagram Duy Nhất",
            "TcpIp_UdpTransmit(60B)",
            "IP + UDP + [PDU A] + [PDU B]"
        ], stroke="var(--hb-green)", title_color="var(--hb-green)")
    ]
    return svg_wrap(900, 210, "\n".join(inner))


def svg_tcp_stream():
    inner = [
        title_txt("7. Tách & Ghép Mảnh Dòng Byte TCP trong SoAdRxBuffer"),
        box_ml(25, 48, 240, 72, [
            "Mảnh 1: 48 Bytes (Chưa đủ)",
            "8B Header (Len = 120B)",
            "+ 40B Payload đầu tiên"
        ], stroke="var(--hb-amber)", title_color="var(--hb-amber)"),
        box_ml(25, 136, 240, 72, [
            "Mảnh 2: 80 Bytes Tiếp Theo",
            "Đủ 128B → Khớp PduLength",
            "Hoặc Sticky Segment (2 PDU)"
        ], stroke="var(--hb-cyan)", title_color="var(--hb-cyan)"),
        arrow_line(265, 84, 343, 84, "Lưu tạm", "var(--hb-amber)", "hbArrAmber", dy=-8),
        arrow_line(265, 172, 343, 172, "Nối tiếp", "var(--hb-cyan)", "hbArrCyan", dy=-8),
        box_ml(345, 58, 255, 136, [
            "SoAdRxBuffer (Per TCP SoCon)",
            "1. Kiểm tra: Đã đủ 8B Header?",
            "2. Kiểm tra: Đủ 8 + PduLen?",
            "3. Còn dư byte → Lặp Sticky PDU",
            "4. Tràn đệm → Drop (SOAD_E_NOBUFS)"
        ], stroke="var(--hb-accent)", title_color="var(--hb-accent)"),
        arrow_line(600, 126, 673, 126, "Phân phối", "var(--hb-green)", "hbArrGreen", dy=-8),
        box_ml(675, 74, 200, 104, [
            "Upper Layer Callback",
            "IfRxIndication hoặc",
            "TpStartOfReception +",
            "CopyRxData(120B)"
        ], stroke="var(--hb-green)", title_color="var(--hb-green)")
    ]
    return svg_wrap(900, 222, "\n".join(inner))


def svg_sd_control():
    inner = [
        title_txt("8. Trình tự Điều khiển SOME/IP-SD & RoutingGroup (S9)"),
        box_ml(25, 54, 180, 62, [
            "1. Sd_RxIndication",
            "Offer / Subscribe ACK"
        ], stroke="var(--hb-purple)", title_color="var(--hb-purple)"),
        arrow_line(205, 85, 247, 85, "", "var(--hb-purple)", "hbArrPurple"),
        box_ml(249, 54, 180, 62, [
            "2. OpenSoCon +",
            "SetRemoteAddr(Peer)"
        ], stroke="var(--hb-purple)", title_color="var(--hb-purple)"),
        arrow_line(429, 85, 471, 85, "", "var(--hb-purple)", "hbArrPurple"),
        box_ml(473, 54, 180, 62, [
            "3. EnableRouting",
            "(RG_0 = ENABLED)"
        ], stroke="var(--hb-purple)", title_color="var(--hb-purple)"),
        arrow_line(653, 85, 695, 85, "", "var(--hb-purple)", "hbArrPurple"),
        box_ml(697, 54, 178, 62, [
            "4. IfRGTransmit",
            "Initial Event Tx!"
        ], stroke="var(--hb-purple)", title_color="var(--hb-purple)"),
        pill_note(45, 142, 810, 34, "RoutingGroup tắt (DisableRouting) giúp chặn Tx/Rx PDU mà vẫn giữ Socket ONLINE, tiết kiệm bắt tay TCP/SD!", stroke="var(--hb-purple)", fg="var(--hb-purple)")
    ]
    return svg_wrap(900, 192, "\n".join(inner))


def svg_tcpip_recovery():
    inner = [
        title_txt("9. Cơ chế Phục hồi khi Mất IP hoặc TCP_RESET / FIN (S10)"),
        box_ml(25, 50, 230, 76, [
            "Sự cố TcpIp Callback",
            "SoAd_TcpIpEvent(TCP_RESET)",
            "hoặc LocalIp = UNASSIGNED"
        ], stroke="var(--hb-red)", title_color="var(--hb-red)"),
        arrow_line(255, 88, 323, 88, "Dọn phiên", "var(--hb-red)", "hbArrRed", dy=-8),
        box_ml(325, 50, 250, 76, [
            "Hủy TP & Xóa Bộ đệm",
            "Abort TP Tx (E_NOT_OK)",
            "Xóa nPdu & SoAdRxBuffer"
        ], stroke="var(--hb-red)", title_color="var(--hb-red)"),
        arrow_line(575, 88, 643, 88, "OpenRef>0", "var(--hb-amber)", "hbArrAmber", dy=-8),
        box_ml(645, 50, 230, 76, [
            "Trạng thái RECONNECT",
            "Khi có lại IP ASSIGNED:",
            "MainFunction tự kết nối lại"
        ], stroke="var(--hb-amber)", title_color="var(--hb-amber)")
    ]
    return svg_wrap(900, 146, "\n".join(inner))


def svg_ecuc_tree():
    inner = [
        title_txt("10. Cây Cấu hình ECUC Chuẩn của Module SoAd"),
        box_ml(310, 42, 280, 44, [
            "/EcucDefs/SoAd (ModuleId 56)",
            "Cấu hình Gốc ECUC SoAd"
        ], stroke="var(--hb-accent)", title_color="var(--hb-accent)"),
        arrow_path("M 360,86 L 360,104 L 150,104 L 150,122", color="var(--hb-accent)", marker="hbArr"),
        arrow_path("M 450,86 L 450,122", color="var(--hb-green)", marker="hbArrGreen"),
        arrow_path("M 540,86 L 540,104 L 750,104 L 750,122", color="var(--hb-purple)", marker="hbArrPurple"),
        box_ml(30, 124, 240, 76, [
            "SoAdGeneral",
            "DevErrorDetect, SoConMax,",
            "MainFunctionPeriod,",
            "MeasDataApi, IdsM"
        ], stroke="var(--hb-accent)", title_color="var(--hb-accent)"),
        box_ml(310, 124, 280, 76, [
            "SoAdSocketConnectionGroup",
            "Proto (UDP/TCP), HeaderEnable,",
            "AutoSetup, TcpNoDelay,",
            "nPduTriggerTimeout, SoCon[0..N]"
        ], stroke="var(--hb-green)", title_color="var(--hb-green)"),
        box_ml(630, 124, 240, 76, [
            "SoAdPduRoute & SocketRoute",
            "TxHeaderId, TriggerMode,",
            "RxHeaderId, UpperLayer,",
            "SoAdRoutingGroup"
        ], stroke="var(--hb-purple)", title_color="var(--hb-purple)")
    ]
    return svg_wrap(900, 216, "\n".join(inner))
