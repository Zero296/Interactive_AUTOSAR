#!/usr/bin/env python3
"""Theme-aware SVG diagram generators for the AUTOSAR TcpIp Multi-Level Handbook."""


def esc(s):
    return (
        str(s)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def svg_wrap(w, h, inner):
    return (
        '<svg class="hb-svg" viewBox="0 0 ' + str(w) + ' ' + str(h) + '" '
        'xmlns="http://www.w3.org/2000/svg">\n'
        '<defs>\n'
        '  <marker id="hbArr" markerWidth="8" markerHeight="8" refX="7" refY="3.5" orient="auto">\n'
        '    <polygon points="0 0,8 3.5,0 7" fill="var(--cyan)" />\n'
        '  </marker>\n'
        '  <marker id="hbArrOk" markerWidth="8" markerHeight="8" refX="7" refY="3.5" orient="auto">\n'
        '    <polygon points="0 0,8 3.5,0 7" fill="var(--ok)" />\n'
        '  </marker>\n'
        '  <marker id="hbArrWarn" markerWidth="8" markerHeight="8" refX="7" refY="3.5" orient="auto">\n'
        '    <polygon points="0 0,8 3.5,0 7" fill="var(--warn)" />\n'
        '  </marker>\n'
        '  <marker id="hbArrErr" markerWidth="8" markerHeight="8" refX="7" refY="3.5" orient="auto">\n'
        '    <polygon points="0 0,8 3.5,0 7" fill="var(--err)" />\n'
        '  </marker>\n'
        '  <marker id="hbArrPur" markerWidth="8" markerHeight="8" refX="7" refY="3.5" orient="auto">\n'
        '    <polygon points="0 0,8 3.5,0 7" fill="var(--pur)" />\n'
        '  </marker>\n'
        '  <marker id="hbArrMut" markerWidth="8" markerHeight="8" refX="7" refY="3.5" orient="auto">\n'
        '    <polygon points="0 0,8 3.5,0 7" fill="var(--mut)" />\n'
        '  </marker>\n'
        '</defs>\n'
        '<rect x="0" y="0" width="' + str(w) + '" height="' + str(h) + '" rx="10" fill="var(--panel-2)" stroke="var(--bdr)" stroke-width="1"/>\n'
        + inner
        + '\n</svg>'
    )


def box_ml(x, y, w, h, lines, fill="var(--panel-3)", stroke="var(--pri)", title_color="var(--txt)"):
    out = [f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="7" fill="{fill}" stroke="{stroke}" stroke-width="1.5"/>']
    cx = x + w // 2
    n = len(lines)
    if n == 1:
        ys = [y + h // 2 + 4]
    elif n == 2:
        ys = [y + h // 2 - 4, y + h // 2 + 12]
    elif n == 3:
        ys = [y + 18, y + 34, y + 50]
    else:
        step = max(13, (h - 14) // max(1, n))
        ys = [y + 16 + i * step for i in range(n)]
    for i, ln in enumerate(lines):
        col = title_color if i == 0 else "var(--txt-soft)"
        fw = "700" if i == 0 else "500"
        fs = "10.5" if i == 0 else "9.2"
        out.append(
            f'<text x="{cx}" y="{ys[i]}" text-anchor="middle" fill="{col}" '
            f'font-size="{fs}" font-weight="{fw}" font-family="Segoe UI,system-ui,sans-serif">{esc(ln)}</text>'
        )
    return "\n".join(out)


def arrow_line(x1, y1, x2, y2, label="", stroke="var(--cyan)", marker="hbArr", dx=0, dy=-6):
    s = f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{stroke}" stroke-width="1.8" marker-end="url(#{marker})"/>'
    if label:
        mx = (x1 + x2) // 2 + dx
        my = (y1 + y2) // 2 + dy
        s += f'\n<text x="{mx}" y="{my}" text-anchor="middle" fill="{stroke}" font-size="9" font-weight="700" font-family="Segoe UI,system-ui,sans-serif">{esc(label)}</text>'
    return s


def arrow_path(d, lx, ly, label="", stroke="var(--cyan)", marker="hbArr"):
    s = f'<path d="{d}" fill="none" stroke="{stroke}" stroke-width="1.8" marker-end="url(#{marker})"/>'
    if label:
        s += f'\n<text x="{lx}" y="{ly}" text-anchor="middle" fill="{stroke}" font-size="9" font-weight="700" font-family="Segoe UI,system-ui,sans-serif">{esc(label)}</text>'
    return s


def pill_note(x, y, w, h, text, fill="var(--pri-bg)", stroke="var(--pri)"):
    cx = x + w // 2
    cy = y + h // 2 + 3
    return (
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="10" fill="{fill}" stroke="{stroke}" stroke-width="1.2"/>\n'
        f'<text x="{cx}" y="{cy}" text-anchor="middle" fill="{stroke}" font-size="9.5" font-weight="700" font-family="Segoe UI,system-ui,sans-serif">{esc(text)}</text>'
    )


def svg_eth_stack():
    inner = "\n".join([
        box_ml(18, 16, 194, 52, ["SW-C & ComM / BswM", "Yêu cầu kênh truyền thông"], stroke="var(--pri)"),
        box_ml(266, 16, 228, 52, ["SOME/IP (Sd), DoIP, UdpNm", "Chỉ dùng PduIdType (Không IP)"], stroke="var(--cyan)"),
        box_ml(548, 16, 194, 52, ["EthSM (Quản lý chế độ)", "TcpIp_RequestComMode()"], stroke="var(--warn)"),

        box_ml(245, 96, 270, 54, ["SoAd (Cầu nối Socket Adaptor)", "PduId ↔ SoConId ↔ SocketId", "+ Chèn 8B SoAd PDU Header"], fill="var(--pur-bg)", stroke="var(--pur)"),
        box_ml(226, 180, 308, 74, ["AUTOSAR TcpIp (ModuleId 170)", "TCP 11-FSM | UDP | IPv4/IPv6 | ARP/NDP", "ICMP | DHCP/AutoIP RFC 3927 | SYN Cookies"], fill="var(--ok-bg)", stroke="var(--ok)"),

        box_ml(18, 188, 160, 58, ["KeyM & Csm (TLS 1.3)", "X.509 & AES-GCM AEAD"], stroke="var(--pur)"),
        box_ml(582, 188, 160, 58, ["DET | DEM | IdsM | NvM", "170 / SEV / Lưu AutoIP"], stroke="var(--err)"),

        box_ml(245, 286, 270, 52, ["EthIf & Eth / EthTrcv MCAL", "Zero-Copy DMA & MAC PHY"], fill="var(--cyan-bg)", stroke="var(--cyan)"),

        arrow_line(212, 42, 266, 42, "RTE / PduR", "var(--pri)", dy=-7),
        arrow_line(494, 42, 548, 42, "ComM", "var(--warn)", "hbArrWarn", dy=-7),
        arrow_line(380, 68, 380, 96, "PduR_Transmit", "var(--cyan)", dx=46, dy=3),
        arrow_line(380, 150, 380, 180, "Socket API", "var(--ok)", "hbArrOk", dx=38, dy=3),
        arrow_path("M 645 68 L 645 166 L 518 166 L 518 180", 588, 159, "RequestComMode", "var(--warn)", "hbArrWarn"),
        arrow_line(226, 217, 178, 217, "TLS 1.3", "var(--pur)", "hbArrPur", dy=-7),
        arrow_line(534, 217, 582, 217, "Lỗi / IDS", "var(--err)", "hbArrErr", dy=-7),
        arrow_line(380, 254, 380, 286, "ProvideTxBuffer", "var(--cyan)", dx=48, dy=3)
    ])
    return svg_wrap(760, 354, inner)


def svg_zero_copy_vlan():
    inner = "\n".join([
        box_ml(16, 22, 186, 66, ["1. SoAd / DoIP / Sd", "Gọi TcpIp_UdpTransmit", "hoặc TcpIp_TcpTransmit", "(DataPtr = NULL_PTR)"], stroke="var(--pur)"),
        box_ml(270, 22, 220, 66, ["2. TcpIp Core", "Xin DMA Buf qua EthIf", "Gọi lại SoAd_CopyTxData", "Gắn Header L3/L4 + VLAN"], fill="var(--ok-bg)", stroke="var(--ok)"),
        box_ml(558, 22, 186, 66, ["3. EthIf & Eth DMA", "Cấp thẳng Tx Descriptor", "Chèn 802.1Q PCP (0..7)", "HW Checksum Offload"], stroke="var(--cyan)"),
        box_ml(70, 130, 620, 74, ["Khung Ethernet + Thẻ VLAN IEEE 802.1Q + Header L3/L4", "Eth (14B) | VLAN TPID 0x8100 + VID + PCP (4B) | IPv4 (20B) | TCP/UDP | Payload", "SoAd ghi thẳng Payload vào RAM DMA — KHÔNG memcpy trung gian!"], fill="var(--panel-3)", stroke="var(--pri)"),
        arrow_line(202, 46, 270, 46, "Tx + Force", "var(--pur)", "hbArrPur", dy=-6),
        arrow_line(270, 68, 202, 68, "CopyTxData", "var(--ok)", "hbArrOk", dy=12),
        arrow_line(490, 55, 558, 55, "ProvideTxBuf", "var(--cyan)", dy=-7),
        arrow_line(651, 88, 620, 130, "DMA Wire", "var(--cyan)", dx=40, dy=2)
    ])
    return svg_wrap(760, 224, inner)


def svg_ip_assignment():
    inner = "\n".join([
        box_ml(20, 20, 218, 82, ["1. TCPIP_STATIC", "Gán ngay IP tĩnh ECUC", "192.168.10.50/24 (< 1 ms)", "Bit 5 = 1, Bit 4 = 0"], fill="var(--ok-bg)", stroke="var(--ok)"),
        box_ml(271, 20, 218, 82, ["2. LINKLOCAL_DOIP", "RFC 3927 (169.254.10.50)", "ARP Probe ➔ Announce", "Tùy chọn lưu/đọc từ NvM"], fill="var(--cyan-bg)", stroke="var(--cyan)"),
        box_ml(522, 20, 218, 82, ["3. TCPIP_DHCP (DORA)", "Discover ➔ Offer ➔", "Request ➔ Ack (10.0.0.25)", "Quản lý bộ đếm Lease"], fill="var(--pur-bg)", stroke="var(--pur)"),
        box_ml(140, 146, 480, 56, ["Callback Thông Báo Tầng Trên (SWS_TcpIp_00094)", "SoAd_LocalIpAddrAssignmentChg(LocalAddrId, ASSIGNED)", "Trigger: TCPIP_AUTOMATIC (từ EthSM) vs TCPIP_MANUAL"], stroke="var(--warn)"),
        arrow_path("M 129 102 L 129 124 L 245 124 L 245 146", 187, 118, "Tức thời", "var(--ok)", "hbArrOk"),
        arrow_line(380, 102, 380, 146, "AutoIP Hợp Lệ", "var(--cyan)", dx=48, dy=2),
        arrow_path("M 631 102 L 631 124 L 515 124 L 515 146", 573, 118, "Lease Bound", "var(--pur)", "hbArrPur")
    ])
    return svg_wrap(760, 220, inner)


def svg_arp_pending():
    inner = "\n".join([
        box_ml(18, 22, 192, 64, ["1. UdpTransmit(64B)", "Đích: 192.168.10.200", "Tra ARP Cache ➔ MISS!"], stroke="var(--warn)"),
        box_ml(275, 22, 210, 64, ["2. ArpPendingQueue", "Giữ gói UDP tạm thời", "Bit 3 (ARP_HIT) = 0", "Gửi Broadcast ARP Request"], fill="var(--warn-bg)", stroke="var(--warn)"),
        box_ml(550, 22, 192, 64, ["3. Nhận ARP Reply", "0x0806: Is-At MAC :C8", "Cache = REACHABLE", "Bit 3 (ARP_HIT) = 1"], fill="var(--ok-bg)", stroke="var(--ok)"),
        box_ml(205, 134, 350, 58, ["4. Tự Động Xả ArpPendingQueue", "EthIf_ProvideTxBuffer() + SoAd_CopyTxData()", "Phát gói UDP ra bus Ethernet Zero-Copy!"], fill="var(--cyan-bg)", stroke="var(--cyan)"),
        arrow_line(210, 54, 275, 54, "Cache Miss", "var(--warn)", "hbArrWarn", dy=-7),
        arrow_line(485, 54, 550, 54, "ARP Reply", "var(--ok)", "hbArrOk", dy=-7),
        arrow_line(380, 86, 380, 134, "Xả Queue ➔ EthIf", "var(--cyan)", dx=52, dy=2)
    ])
    return svg_wrap(760, 212, inner)


def svg_tcp_fsm():
    inner = "\n".join([
        box_ml(20, 48, 160, 54, ["CLOSED", "Socket rảnh / đã đóng"], stroke="var(--mut)"),
        box_ml(256, 16, 190, 50, ["LISTEN (Server)", "TcpIp_TcpListen()"], stroke="var(--pur)"),
        box_ml(256, 86, 190, 50, ["SYN_SENT (Client)", "TcpConnect ➔ Gửi SYN"], stroke="var(--cyan)"),
        box_ml(518, 46, 222, 60, ["ESTABLISHED (Đã Kết Nối)", "Client: SoAd_TcpConnected()", "Server: SoAd_TcpAccepted()"], fill="var(--ok-bg)", stroke="var(--ok)"),
        box_ml(245, 182, 220, 58, ["FIN_WAIT_1 ➔ TIME_WAIT", "Close(Abort=FALSE) · 2×MSL", "Tránh gói trễ lạc vào phiên mới"], fill="var(--warn-bg)", stroke="var(--warn)"),
        box_ml(518, 182, 222, 58, ["Hủy Tức Thời (Abort=TRUE)", "Phát TCP RST (Bit 2 = 1)", "Bỏ TIME_WAIT ➔ CLOSED ngay"], fill="var(--err-bg)", stroke="var(--err)"),

        arrow_path("M 180 62 L 218 62 L 218 41 L 256 41", 218, 33, "Listen", "var(--pur)", "hbArrPur"),
        arrow_path("M 180 86 L 218 86 L 218 111 L 256 111", 218, 126, "Connect", "var(--cyan)", "hbArr"),
        arrow_line(446, 41, 518, 66, "SYN+ACK", "var(--ok)", "hbArrOk", dx=4, dy=-10),
        arrow_line(446, 111, 518, 88, "ACK", "var(--ok)", "hbArrOk", dx=6, dy=15),
        arrow_path("M 565 106 L 565 144 L 355 144 L 355 182", 460, 138, "Abort=FALSE (FIN)", "var(--warn)", "hbArrWarn"),
        arrow_line(665, 106, 665, 182, "Abort=TRUE (RST)", "var(--err)", "hbArrErr", dx=46, dy=4),
        arrow_path("M 245 211 L 100 211 L 100 102", 168, 203, "Hết 2×MSL", "var(--mut)", "hbArrMut")
    ])
    return svg_wrap(760, 260, inner)


def svg_tcp_sliding_window():
    inner = "\n".join([
        box_ml(18, 20, 220, 68, ["1. Chiều TX: Phân Đoạn MSS", "Payload > MSS (1460B)", "Nagle=FALSE ➔ PSH=1 ngay", "Nagle=TRUE ➔ Gom gói nhỏ"], stroke="var(--pri)"),
        box_ml(270, 20, 220, 68, ["2. Tái Truyền & Bộ Đếm RTO", "Gửi Seq=0x1001, chờ ACK", "3× Dup-ACK ➔ Fast Retransmit", "Quá MaxRtx ➔ DEM TIMEDOUT"], fill="var(--warn-bg)", stroke="var(--warn)"),
        box_ml(522, 20, 220, 68, ["3. Chiều RX: Cửa Sổ Trượt", "Nhận data ➔ Window giảm", "Quên TcpIp_TcpReceived()", "➔ Treo ở TCP ZeroWindow!"], fill="var(--err-bg)", stroke="var(--err)"),
        pill_note(90, 116, 580, 36, "Quy tắc vàng DoIP/UDS: Tắt Nagle + Gọi kịp TcpIp_TcpReceived(SockId, Len) để giữ Window > 0!", fill="var(--ok-bg)", stroke="var(--ok)")
    ])
    return svg_wrap(760, 172, inner)


def svg_ipv4_frag():
    inner = "\n".join([
        box_ml(18, 20, 214, 64, ["Gói UDP Gốc: 2800 Bytes", "IP Header (20B) + UDP (8B)", "+ 2800B = 2828B > MTU 1500B"], stroke="var(--pri)"),
        box_ml(276, 20, 214, 64, ["Kiểm Tra Cờ DF (Bit 7)", "DF=1 ➔ KHÓA (E_MSGSIZE)", "DF=0 ➔ Cắt theo bội số 8B!"], fill="var(--warn-bg)", stroke="var(--warn)"),
        box_ml(534, 20, 208, 64, ["Bộ Đệm Tái Hợp (RX)", "Giữ Mảnh #1 (MF=1)", "Ghép đủ ➔ SoAd 2800B!"], fill="var(--ok-bg)", stroke="var(--ok)"),
        box_ml(56, 124, 290, 56, ["Mảnh #1 (ID=0x4A12 · 1500B)", "IP(20B) + 1480B | MF = 1 | Offset = 0"], stroke="var(--cyan)"),
        box_ml(384, 124, 290, 56, ["Mảnh #2 (ID=0x4A12 · 1348B)", "IP(20B) + 1328B | MF = 0 | Offset = 185 (×8)"], stroke="var(--pur)"),
        arrow_line(232, 52, 276, 52, "> MTU", "var(--warn)", "hbArrWarn", dy=-7),
        arrow_path("M 340 84 L 340 104 L 201 104 L 201 124", 268, 98, "Tách Mảnh #1", "var(--cyan)", "hbArr"),
        arrow_path("M 426 84 L 426 104 L 529 104 L 529 124", 478, 98, "Tách Mảnh #2", "var(--pur)", "hbArrPur"),
        arrow_path("M 674 152 L 710 152 L 710 84", 666, 108, "Ghép 2800B", "var(--ok)", "hbArrOk")
    ])
    return svg_wrap(760, 200, inner)


def svg_ctrl_onhold():
    inner = "\n".join([
        box_ml(18, 24, 136, 56, ["OFFLINE", "IP Chưa Gán", "Đóng Mọi Socket"], stroke="var(--mut)"),
        box_ml(214, 24, 166, 56, ["STARTUP", "Cấp IP Static / DHCP", "/ AutoIP 169.254.x.x"], stroke="var(--cyan)"),
        box_ml(424, 24, 148, 56, ["ONLINE (Bit 7=1)", "Truyền / Nhận Đầy Đủ", "SoAd Hoạt Động"], fill="var(--ok-bg)", stroke="var(--ok)"),
        box_ml(606, 24, 136, 56, ["SHUTDOWN", "Đóng Socket", "Thu Hồi Địa Chỉ IP"], stroke="var(--err)"),
        box_ml(370, 128, 256, 64, ["TCPIP_STATE_ONHOLD (Bit 6 = 1)", "EthTrcv PHY Link Mất Tạm Thời!", "GIỮ NGUYÊN IP & TCP ESTABLISHED!"], fill="var(--warn-bg)", stroke="var(--warn)"),
        arrow_line(154, 52, 214, 52, "ComMode", "var(--cyan)", dy=-7),
        arrow_line(380, 52, 424, 52, "Có IP", "var(--ok)", "hbArrOk", dy=-7),
        arrow_line(572, 52, 606, 52, "Tắt", "var(--err)", "hbArrErr", dy=-7),
        arrow_line(458, 80, 458, 128, "Mất Link", "var(--warn)", "hbArrWarn", dx=-30, dy=4),
        arrow_line(534, 128, 534, 80, "Có Link Lại", "var(--ok)", "hbArrOk", dx=34, dy=4)
    ])
    return svg_wrap(760, 212, inner)


def svg_tls_handshake():
    inner = "\n".join([
        box_ml(18, 24, 198, 66, ["1. Cấu Hình TLS & TCP", "ChangeParameter(TLS_ASSGN)", "TCP 3-Way Port 3496", "Chưa vội báo SoAd!"], stroke="var(--cyan)"),
        box_ml(272, 24, 218, 66, ["2. TLS 1.3 + KeyM / Csm", "KeyM_VerifyCertificate()", "Csm_KeyExchangeCalcSecret()", "Sai Cert ➔ TLS Alert + RST"], fill="var(--pur-bg)", stroke="var(--pur)"),
        box_ml(546, 24, 196, 66, ["3. Luồng Dữ Liệu Mã Hóa", "Bit 1 (TLS_ACTV) = 1", "Csm_AEADEncrypt(17 03 03)", "Báo SoAd_TcpConnected()"], fill="var(--ok-bg)", stroke="var(--ok)"),
        arrow_line(216, 57, 272, 57, "TCP Xong", "var(--cyan)", dy=-7),
        arrow_line(490, 57, 546, 57, "X.509 OK", "var(--ok)", "hbArrOk", dy=-7)
    ])
    return svg_wrap(760, 114, inner)


def svg_idsm_defense():
    inner = "\n".join([
        box_ml(18, 22, 220, 68, ["1. Bão SYN Flood ➔ SynCookies", "Không cấp Socket RAM ngay!", "Nhúng Hash Cookie vào ISN", "Bảo vệ TcpIp_SocketTable"], fill="var(--cyan-bg)", stroke="var(--cyan)"),
        box_ml(270, 22, 220, 68, ["2. Chống Giả Mạo ARP Spoofing", "Kiểm tra xung đột MAC/IP", "Bảo vệ bản ghi Gateway Tĩnh", "Lọc khung L3/L4 bất thường"], fill="var(--warn-bg)", stroke="var(--warn)"),
        box_ml(522, 22, 220, 68, ["3. Báo Cáo IdsM / DEM / DET", "IdsM_SetSecurityEvent()", "Dem_SetEventStatus(TIMEDOUT)", "Det_ReportError(Module 170)"], fill="var(--err-bg)", stroke="var(--err)"),
        arrow_line(238, 56, 270, 56, "Lọc", "var(--cyan)", dy=-7),
        arrow_line(490, 56, 522, 56, "Báo", "var(--err)", "hbArrErr", dy=-7)
    ])
    return svg_wrap(760, 114, inner)


if __name__ == "__main__":
    import xml.etree.ElementTree as ET
    for fn in [
        svg_eth_stack, svg_zero_copy_vlan, svg_ip_assignment, svg_arp_pending,
        svg_tcp_fsm, svg_tcp_sliding_window, svg_ipv4_frag, svg_ctrl_onhold,
        svg_tls_handshake, svg_idsm_defense
    ]:
        xml_txt = fn()
        ET.fromstring(xml_txt)
        print("OK SVG:", fn.__name__, len(xml_txt.encode("utf-8")), "bytes")
