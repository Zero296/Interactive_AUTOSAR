# -*- coding: utf-8 -*-
"""Theme-aware SVG diagram generators for the AUTOSAR DoIP Handbook."""

def svg_wrap(w, h, inner):
    return (
        f'<div class="hb-svg-box">'
        f'<svg viewBox="0 0 {w} {h}" width="100%" style="max-width:{w}px;height:auto;display:block;margin:0 auto;" xmlns="http://www.w3.org/2000/svg">'
        f'<defs>'
        f'<marker id="hbArr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">'
        f'<path d="M0,1 L9,5 L0,9 z" fill="var(--pri)"/>'
        f'</marker>'
        f'<marker id="hbArrOk" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">'
        f'<path d="M0,1 L9,5 L0,9 z" fill="var(--ok)"/>'
        f'</marker>'
        f'<marker id="hbArrPur" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">'
        f'<path d="M0,1 L9,5 L0,9 z" fill="var(--pur)"/>'
        f'</marker>'
        f'<marker id="hbArrErr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">'
        f'<path d="M0,1 L9,5 L0,9 z" fill="var(--err)"/>'
        f'</marker>'
        f'</defs>'
        f'<rect x="0" y="0" width="{w}" height="{h}" rx="8" fill="var(--hb-svg-bg)"/>'
        f'{inner}</svg></div>'
    )


def box_ml(x, y, w, h, lines, stroke="var(--hb-svg-stroke)", fill="var(--hb-svg-box)", accent=False):
    sw = "2.2" if accent else "1.4"
    res = [f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="7" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>']
    cy = y + 20
    for idx, txt in enumerate(lines):
        if idx == 0:
            res.append(f'<text x="{x + 12}" y="{cy}" fill="var(--hb-svg-text)" font-size="11.5" font-weight="700" font-family="var(--sans)">{txt}</text>')
        else:
            res.append(f'<text x="{x + 12}" y="{cy}" fill="var(--hb-svg-muted)" font-size="10" font-family="var(--mono)">{txt}</text>')
        cy += 15
    return "\n".join(res)


def arrow_line(x1, y1, x2, y2, marker="hbArr", color="var(--pri)", label="", lx=None, ly=None):
    parts = [f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="1.8" marker-end="url(#{marker})"/>']
    if label:
        tx = lx if lx is not None else (x1 + x2) // 2
        ty = ly if ly is not None else (y1 + y2) // 2 - 5
        parts.append(f'<text x="{tx}" y="{ty}" fill="{color}" font-size="9.5" font-weight="700" font-family="var(--mono)" text-anchor="middle">{label}</text>')
    return "\n".join(parts)


def pill_note(x, y, w, text, color="var(--pri)"):
    return (
        f'<rect x="{x}" y="{y}" width="{w}" height="22" rx="11" fill="var(--hb-svg-box2)" stroke="{color}" stroke-width="1"/>'
        f'<text x="{x + w/2}" y="{y + 15}" fill="{color}" font-size="9.8" font-weight="700" font-family="var(--mono)" text-anchor="middle">{text}</text>'
    )


def build_diagrams():
    # Diagram 1: DoIP Stack with Direct RTE & Edge Gateway
    d1 = svg_wrap(880, 275, "\n".join([
        box_ml(20, 18, 220, 62, ["SWC_DoIPAuth (Ứng dụng)", "Auth / Conf / PwrMode / GID"], stroke="var(--pur)"),
        box_ml(330, 18, 230, 62, ["Dcm + SWC_Diag (Nội bộ)", "UDS 0x22 / 0x10 / 0x36 (0x1001)"], stroke="var(--ok)"),
        box_ml(640, 18, 220, 62, ["CanTp + CanIf + CAN-FD", "Edge Gateway ECU (TA 0x2001)"], stroke="var(--warn)"),
        box_ml(20, 108, 220, 52, ["Giao diện RTE", "Rte_Call_DoIP_Auth/Conf"], stroke="var(--pur)"),
        box_ml(330, 108, 530, 52, ["PduR (Bộ Định Tuyến Diagnostic TP)", "0x1001 ➔ Dcm Nội Bộ  |  0x2001 ➔ CanTp Edge Gateway"], stroke="var(--pri)"),
        box_ml(20, 192, 840, 66, [
            "DoIP (ModuleId 173 / 0x00AD)  &lt;--&gt;  SoAd + TcpIp + EthIf (UDP/TCP 13400, TLS 3496)",
            "Kiểm Tra Header 8B  |  Quảng Bá UDP 0x0004  |  TCP Pool &amp; Alive Check  |  UDS 0x8001/02/03"
        ], stroke="var(--pri)", fill="var(--hb-svg-box2)", accent=True),
        arrow_line(130, 192, 130, 160, "hbArrPur", "var(--pur)", "RTE Trực Tiếp", 178, 179),
        arrow_line(130, 108, 130, 80, "hbArrPur", "var(--pur)"),
        arrow_line(445, 192, 445, 160, "hbArr", "var(--pri)", "PduR_DoIPTp*", 505, 179),
        arrow_line(445, 108, 445, 80, "hbArrOk", "var(--ok)", "Dcm Nội Bộ", 495, 97),
        arrow_line(750, 108, 750, 80, "hbArr", "var(--warn)", "CanTp GW", 796, 97),
        box_ml(260, 108, 58, 52, ["BswM", "ActLn"], stroke="var(--teal)")
    ]))

    # Diagram 2: ISO 13400-2 8-Byte Generic Header
    d2 = svg_wrap(880, 215, "\n".join([
        box_ml(20, 20, 140, 74, ["Byte 0", "ProtoVer", "0x02 / 0x03 / 0xFF"], stroke="var(--pri)"),
        box_ml(170, 20, 145, 74, ["Byte 1", "InverseVer (~)", "0xFD / 0xFC / 0x00"], stroke="var(--pri)"),
        box_ml(325, 20, 225, 74, ["Bytes 2..3 (Big Endian)", "Payload Type (uint16)", "0x0000..0x0008, 0x4001..4, 0x8001"], stroke="var(--teal)"),
        box_ml(560, 20, 300, 74, ["Bytes 4..7 (Big Endian)", "Payload Length (uint32)", "Số byte SAU Header 8B (&lt;= MaxArray)"], stroke="var(--pur)"),
        pill_note(20, 118, 295, "(Byte0 ^ Byte1) == 0xFF ? ĐẠT : NACK 0x0000", "var(--ok)"),
        pill_note(330, 118, 250, "Type Hợp Lệ ? ĐẠT : 0x0000 (0x01)", "var(--teal)"),
        pill_note(595, 118, 265, "Len &lt;= MaxArray ? ĐẠT : 0x0000 (0x02)", "var(--warn)"),
        box_ml(20, 155, 840, 44, ["Nếu sai XOR trên TCP: DoIP trả 0x0000 (Mã 0x00) và gọi ngay SoAd_CloseSoCon() do mất đồng bộ TCP stream!"], stroke="var(--err)")
    ]))

    # Diagram 3: Startup & UDP Discovery Sequence
    d3 = svg_wrap(880, 240, "\n".join([
        box_ml(20, 20, 175, 62, ["1. DoIP_Init()", "Trạng thái INACTIVE"], stroke="var(--pri)"),
        box_ml(220, 20, 205, 62, ["2. BswM + TcpIp Sẵn Sàng", "ActLine=ON + IP_ASSIGNED"], stroke="var(--ok)"),
        box_ml(450, 20, 200, 62, ["3. T_Announce_Wait", "Chờ backoff 250ms"], stroke="var(--warn)"),
        box_ml(675, 20, 185, 62, ["4. 3× UDP 0x0004", "Chu kỳ 500ms Broadcast"], stroke="var(--teal)"),
        arrow_line(195, 51, 220, 51),
        arrow_line(425, 51, 450, 51, "hbArrOk", "var(--ok)"),
        arrow_line(650, 51, 675, 51),
        box_ml(20, 115, 265, 102, ["Tìm Xe Qua UDP 13400", "0x0001: Broadcast Tất Cả ECU", "0x0002: Lọc 6B EID (MAC)", "0x0003: Lọc 17B VIN"], stroke="var(--pri)"),
        box_ml(325, 115, 255, 102, ["Trạng Thái &amp; Nguồn UDP", "0x4001 ➔ 0x4002 Entity Status", "(MaxTCP / OpenTCP / MaxData)", "0x4003 ➔ SWC ➔ 0x4004 Nguồn"], stroke="var(--pur)"),
        box_ml(615, 115, 245, 102, ["Quy Tắc ISO 13400-2", "Khớp VIN/EID: Unicast 0x0004", "Lệch VIN/EID: IM LẶNG BỎ QUA", "(Chống bão broadcast Switch)"], stroke="var(--ok)"),
        arrow_line(285, 165, 325, 165),
        arrow_line(580, 165, 615, 165)
    ]))

    # Diagram 4: TCP Lifecycle, SWC Auth Async, TLS 3496 & Alive Check
    d4 = svg_wrap(880, 265, "\n".join([
        box_ml(20, 20, 195, 74, ["TCP Handshake ONLINE", "Cổng 13400 hoặc TLS 3496", "T_Initial = 2000ms"], stroke="var(--pri)"),
        box_ml(245, 20, 210, 74, ["Tester ➔ 0x0005", "Kiểm tra SA &amp; ActType", "Kiểm tra TLS 3496 (0x07)"], stroke="var(--teal)"),
        box_ml(485, 20, 195, 74, ["SWC_DoIPAuth (RTE)", "Vòng lặp DOIP_E_PENDING", "Xác nhận Conf (Mã 0x05)"], stroke="var(--pur)"),
        box_ml(705, 20, 155, 74, ["ROUTING_ACTIVE", "0x0006 Mã 0x10", "T_Gen = 300s"], stroke="var(--ok)", accent=True),
        arrow_line(215, 57, 245, 57),
        arrow_line(455, 57, 485, 57, "hbArrPur", "var(--pur)"),
        arrow_line(680, 57, 705, 57, "hbArrOk", "var(--ok)"),
        box_ml(20, 130, 840, 115, [
            "Cơ Chế Thu Hồi Socket Pool Khi Đầy (MaxTesterConnections = 3) ➔ Alive Check 0x0007 / 0x0008:",
            "1) Tester thứ 4 (0x0E03) kết nối ➔ DoIP gửi 0x0007 (Alive Check Req) tới các socket cũ &amp; bật T_Alive = 500ms.",
            "2) Tester nào gửi kịp 0x0008 trong 500ms được giữ lại; socket im lặng bị SoAd_CloseSoCon() thu hồi ngay.",
            "3) Nếu TẤT CẢ đều sống ➔ Trả về Tester mới 0x0006 Mã 0x01 (Tất cả socket đang hoạt động)."
        ], stroke="var(--warn)", fill="var(--hb-svg-box2)")
    ]))

    # Diagram 5: Diagnostic 0x8001, Streaming TP & CanTp Edge Gateway
    d5 = svg_wrap(880, 255, "\n".join([
        box_ml(20, 20, 225, 76, ["Tester TCP 0x8001 (4KB)", "SA=0x0E00 | TA=0x1001/0x2001", "Phân đoạn TP (Segments)"], stroke="var(--pri)"),
        box_ml(275, 20, 240, 76, ["DoIP Diag &amp; TP Manager", "Sai SA/TA/Busy ➔ 0x8003 NACK", "Hợp lệ ➔ 0x8002 ACK + PduR"], stroke="var(--teal)", accent=True),
        box_ml(545, 16, 315, 54, ["Nhánh 1: Dcm Nội Bộ (TA 0x1001)", "PduR ➔ Dcm ➔ SWC_Diag (22 F1 90 / 36)"], stroke="var(--ok)"),
        box_ml(545, 86, 315, 54, ["Nhánh 2: Edge Gateway (TA 0x2001)", "PduR ➔ CanTp (FF/FC/CF) ➔ CanIf ➔ CAN-FD"], stroke="var(--warn)"),
        arrow_line(245, 58, 275, 58),
        arrow_line(515, 43, 545, 43, "hbArrOk", "var(--ok)"),
        arrow_line(515, 75, 545, 113, "hbArr", "var(--warn)"),
        box_ml(20, 160, 840, 78, [
            "Luồng AUTOSAR TP Streaming Zero-Copy (4096B Flash TransferData):",
            "Rx: DoIP_SoAdTpStartOfReception(4100B) ➔ PduR_DoIPTpStartOfReception(4096B) ➔ Lặp CopyRxData(1460B) ➔ RxIndication()",
            "Tx: PduR gọi DoIP_TpTransmit(UDS Rsp) ➔ SoAd kéo DoIP_SoAdTpCopyTxData() ➔ SoAd_TpTxConfirmation()"
        ], stroke="var(--pri)")
    ]))

    return {
        "diag_stack": d1,
        "diag_header": d2,
        "diag_udp": d3,
        "diag_tcp": d4,
        "diag_tp_gw": d5,
    }
