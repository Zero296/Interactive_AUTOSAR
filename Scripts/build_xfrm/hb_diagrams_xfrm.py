"""Theme-aware SVG diagram generators (full Vietnamese diacritics + AUTOSAR English terms) for the Xfrm Handbook."""

import html


def esc(s):
    return html.escape(str(s), quote=True)


def svg_wrap(w, h, title, body):
    return (
        f'<div class="hb-svg-box" role="img" aria-label="{esc(title)}">'
        f'<svg viewBox="0 0 {w} {h}" xmlns="http://www.w3.org/2000/svg" '
        f'style="background:var(--hb-svg-bg);border-radius:6px;width:100%;height:auto;display:block;">'
        f'<defs>'
        f'<marker id="hbArrB" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">'
        f'<path d="M 0 1 L 10 5 L 0 9 z" fill="var(--hb-arrow)"/></marker>'
        f'<marker id="hbArrG" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">'
        f'<path d="M 0 1 L 10 5 L 0 9 z" fill="var(--hb-arrow-green)"/></marker>'
        f'<marker id="hbArrA" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">'
        f'<path d="M 0 1 L 10 5 L 0 9 z" fill="var(--hb-arrow-amber)"/></marker>'
        f'<marker id="hbArrR" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">'
        f'<path d="M 0 1 L 10 5 L 0 9 z" fill="var(--hb-arrow-red)"/></marker>'
        f'<marker id="hbArrP" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">'
        f'<path d="M 0 1 L 10 5 L 0 9 z" fill="var(--hb-arrow-purple)"/></marker>'
        f'</defs>'
        f'<text x="14" y="20" font-size="11" font-weight="700" font-family="Segoe UI, Arial, sans-serif" fill="var(--hb-text)">{esc(title)}</text>'
        f'{body}'
        f'</svg></div>'
    )


def box_ml(x, y, w, h, lines, fill="var(--hb-box-bg)", stroke="var(--hb-box-stroke)", hdr_fill=None, hdr_h=22):
    parts = [
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="6" fill="{fill}" stroke="{stroke}" stroke-width="1.5"/>'
    ]
    if hdr_fill and lines:
        parts.append(
            f'<rect x="{x}" y="{y}" width="{w}" height="{hdr_h}" rx="5" fill="{hdr_fill}" stroke="{stroke}" stroke-width="1"/>'
        )
    cx = x + w / 2
    start_y = y + (15 if hdr_fill else max(16, (h - len(lines) * 14) / 2 + 11))
    for i, ln in enumerate(lines):
        if i == 0:
            yy = y + 15 if hdr_fill else start_y
            sz = "10.5"
            wt = "700"
            col = "var(--hb-text)"
        else:
            yy = (y + hdr_h + 14 + (i - 1) * 14) if hdr_fill else (start_y + i * 14)
            sz = "9.5"
            wt = "500"
            col = "var(--hb-sub)"
        parts.append(
            f'<text x="{cx:.1f}" y="{yy:.1f}" text-anchor="middle" font-size="{sz}" font-weight="{wt}" '
            f'font-family="Segoe UI, Arial, sans-serif" fill="{col}">{esc(ln)}</text>'
        )
    return "".join(parts)


def arrow_line(x1, y1, x2, y2, marker="hbArrB", color="var(--hb-arrow)", label=None, lx=None, ly=None, dashed=False):
    dash = ' stroke-dasharray="5 3"' if dashed else ''
    s = f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="1.8"{dash} marker-end="url(#{marker})"/>'
    if label:
        tx = lx if lx is not None else (x1 + x2) / 2
        ty = ly if ly is not None else (y1 + y2) / 2 - 5
        s += f'<text x="{tx:.1f}" y="{ty:.1f}" text-anchor="middle" font-size="9" font-weight="700" font-family="Segoe UI, Arial, sans-serif" fill="{color}">{esc(label)}</text>'
    return s


def arrow_path(d, marker="hbArrB", color="var(--hb-arrow)", label=None, lx=None, ly=None, dashed=False):
    dash = ' stroke-dasharray="5 3"' if dashed else ''
    s = f'<path d="{d}" fill="none" stroke="{color}" stroke-width="1.8"{dash} marker-end="url(#{marker})"/>'
    if label and lx is not None and ly is not None:
        s += f'<text x="{lx}" y="{ly}" text-anchor="middle" font-size="9" font-weight="700" font-family="Segoe UI, Arial, sans-serif" fill="{color}">{esc(label)}</text>'
    return s


def pill_note(x, y, w, h, text, fill="var(--hb-box-amber)", stroke="var(--hb-box-amber-s)"):
    cx = x + w / 2
    cy = y + h / 2 + 3.5
    return (
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="10" fill="{fill}" stroke="{stroke}" stroke-width="1.2"/>'
        f'<text x="{cx:.1f}" y="{cy:.1f}" text-anchor="middle" font-size="9.5" font-weight="700" font-family="Segoe UI, Arial, sans-serif" fill="var(--hb-text)">{esc(text)}</text>'
    )


def svg_1_1_xfrm_swc_transparent():
    b = []
    b.append(box_ml(20, 42, 180, 74, ["SWC Application", "Struct { Spd, Steer }", "Không biết Byte Order", "Hoàn toàn trong suốt"], "var(--hb-box-green)", "var(--hb-box-green-s)", "var(--hb-box-hdr)"))
    b.append(arrow_line(200, 79, 250, 79, "hbArrG", "var(--hb-arrow-green)", "Rte_Write"))
    b.append(box_ml(254, 42, 180, 74, ["RTE Glue Layer", "Cấp phát Rte_XfrmBuf", "Điều phối chuỗi Xfrm"], "var(--hb-box-blue)", "var(--hb-box-blue-s)", "var(--hb-box-hdr)"))
    b.append(arrow_line(434, 64, 484, 64, "hbArrB", "var(--hb-arrow)", "Tx Bước 1"))
    b.append(box_ml(488, 34, 180, 56, ["Serializer Module", "ComXf #175 / SomeIpXf #174", "Struct ➔ Mảng Byte"], "var(--hb-box-purple)", "var(--hb-box-purple-s)"))
    b.append(arrow_line(668, 62, 718, 62, "hbArrP", "var(--hb-arrow-purple)", "Tx Bước 2"))
    b.append(box_ml(722, 34, 180, 56, ["E2EXf Safety (#176)", "CRC + Counter + DataID", "Bảo vệ ISO 26262"], "var(--hb-box-amber)", "var(--hb-box-amber-s)"))
    b.append(arrow_path("M 812 90 L 812 135 L 620 135", "hbArrA", "var(--hb-arrow-amber)", "Mảng[N] + E2E Hdr", 726, 127))
    b.append(box_ml(330, 108, 285, 56, ["COM (#50) / LdCom (#49) ➔ PduR", "Com_SendSignalGroupArray() | LdCom_Transmit()", "Đẩy thẳng xuống bus CanIf / SoAd"], "var(--hb-box-teal)", "var(--hb-box-teal-s)"))
    b.append(pill_note(20, 128, 285, 28, "SWC không chứa mã Endian, TLV hay CRC!"))
    return svg_wrap(920, 180, "1.1 Vai trò độc lập của Xfrm giữa SWC và tầng Bus", "".join(b))


def svg_1_2_symmetric_mirror():
    b = []
    # Tx Top
    b.append(box_ml(20, 40, 165, 52, ["SWC Tx Struct", "BrakeStatus_t"], "var(--hb-box-green)", "var(--hb-box-green-s)"))
    b.append(arrow_line(185, 66, 230, 66, "hbArrG", "var(--hb-arrow-green)", "1"))
    b.append(box_ml(234, 40, 185, 52, ["ComXf / SomeIpXf", "Serialize ➔ Payload"], "var(--hb-box-purple)", "var(--hb-box-purple-s)"))
    b.append(arrow_line(419, 66, 464, 66, "hbArrB", "var(--hb-arrow)", "2"))
    b.append(box_ml(468, 40, 185, 52, ["E2EXf_Tx Protect", "Ghi E2E Hdr + CRC"], "var(--hb-box-amber)", "var(--hb-box-amber-s)"))
    b.append(arrow_line(653, 66, 698, 66, "hbArrA", "var(--hb-arrow-amber)", "3"))
    b.append(box_ml(702, 40, 195, 52, ["Bus Tx (COM/LdCom)", "Khung [E2E | Payload]"], "var(--hb-box-teal)", "var(--hb-box-teal-s)"))

    # Rx Bottom (Mirror Inverse!)
    b.append(box_ml(702, 124, 195, 52, ["Khung Bus Rx", "[E2E Hdr | Payload]"], "var(--hb-box-teal)", "var(--hb-box-teal-s)"))
    b.append(arrow_line(702, 150, 657, 150, "hbArrA", "var(--hb-arrow-amber)", "1"))
    b.append(box_ml(468, 124, 185, 52, ["E2EXf_Inv Check", "LUÔN CHẠY TRƯỚC!"], "var(--hb-box-red)", "var(--hb-box-red-s)"))
    b.append(arrow_line(468, 150, 423, 150, "hbArrR", "var(--hb-arrow-red)", "2"))
    b.append(box_ml(234, 124, 185, 52, ["ComXf_Inv / SomeIp_Inv", "Chỉ chạy khi Bit 7 == 0"], "var(--hb-box-purple)", "var(--hb-box-purple-s)"))
    b.append(arrow_line(234, 150, 189, 150, "hbArrG", "var(--hb-arrow-green)", "3"))
    b.append(box_ml(20, 124, 165, 52, ["SWC Rx Struct", "Dữ liệu sạch an toàn"], "var(--hb-box-green)", "var(--hb-box-green-s)"))
    return svg_wrap(920, 195, "1.2 Kiến trúc đối xứng gương: Tx Forward vs Rx Inverse", "".join(b))


def svg_2_1_comxf_vs_com():
    b = []
    b.append(box_ml(20, 36, 425, 96, [
        "COM Truyền Thống (Không dùng ComXf)",
        "1. COM duyệt từng ComSignal trong SignalGroup",
        "2. Dịch bit & mask từng trường tại Com_MainFunction",
        "3. Tốn nhiều chu kỳ CPU khi ECU có hàng trăm nhóm"
    ], "var(--hb-box-amber)", "var(--hb-box-amber-s)", "var(--hb-box-hdr)"))
    b.append(arrow_line(445, 84, 485, 84, "hbArrG", "var(--hb-arrow-green)", "Tối ưu"))
    b.append(box_ml(490, 36, 410, 96, [
        "ComXf (#175) + SignalGroupArray (SWS_Com_00851)",
        "1. ComXf đóng gói sẵn cả Struct thành mảng byte phẳng",
        "2. RTE gọi Com_SendSignalGroupArray() 1 lần duy nhất",
        "3. Copy nguyên khối I-PDU ➔ Giảm tải CPU tối đa!"
    ], "var(--hb-box-green)", "var(--hb-box-green-s)", "var(--hb-box-hdr)"))
    return svg_wrap(920, 152, "2.1 So sánh COM Packing truyền thống với ComXf + SignalGroupArray", "".join(b))


def svg_2_2_endianness_bits():
    b = []
    b.append(box_ml(20, 42, 230, 66, ["Biến SWC (uint16)", "VehicleSpeed = 1205", "Hex = 0x04B5", "MSB=0x04 | LSB=0xB5"], "var(--hb-box-blue)", "var(--hb-box-blue-s)", "var(--hb-box-hdr)"))
    b.append(arrow_line(250, 58, 325, 58, "hbArrG", "var(--hb-arrow-green)", "Big-Endian"))
    b.append(box_ml(330, 34, 270, 54, ["Motorola BIG_ENDIAN (Chuẩn CAN)", "Byte 0 = 0x04 (MSB)", "Byte 1 = 0xB5 (LSB)"], "var(--hb-box-green)", "var(--hb-box-green-s)"))
    b.append(arrow_line(250, 92, 325, 114, "hbArrA", "var(--hb-arrow-amber)", "Little-End"))
    b.append(box_ml(330, 96, 270, 54, ["Intel LITTLE_ENDIAN", "Byte 0 = 0xB5 (LSB)", "Byte 1 = 0x04 (MSB)"], "var(--hb-box-amber)", "var(--hb-box-amber-s)"))
    b.append(box_ml(625, 34, 270, 116, ["UnusedBitPattern & SignExt", "Byte 4 = (Fill & 0xF0) | Gear", "Fill=0xFF, Gear=4 ➔ 0xF4", "sint16 Steer = -120 (0xFF88)", "ComXf_Inv khôi phục đúng -120"], "var(--hb-box-purple)", "var(--hb-box-purple-s)", "var(--hb-box-hdr)"))
    return svg_wrap(920, 168, "2.2 Quy tắc Big-Endian vs Little-Endian & UnusedBitPattern", "".join(b))


def svg_3_1_someip_16b_hdr():
    b = []
    # SoAd 8B
    b.append(pill_note(20, 34, 420, 22, "8 BYTE ĐẦU (SoAd #56 Quản lý — Transport Header)", "var(--hb-box-teal)", "var(--hb-box-teal-s)"))
    b.append(box_ml(20, 62, 130, 62, ["Byte 0..1", "ServiceID", "0x1234"], "var(--hb-box-teal)", "var(--hb-box-teal-s)"))
    b.append(box_ml(155, 62, 130, 62, ["Byte 2..3", "MethodID", "0x0001"], "var(--hb-box-teal)", "var(--hb-box-teal-s)"))
    b.append(box_ml(290, 62, 150, 62, ["Byte 4..7", "MessageLength", "8B + PayloadLen"], "var(--hb-box-teal)", "var(--hb-box-teal-s)"))

    # SomeIpXf 8B
    b.append(pill_note(460, 34, 440, 22, "8 BYTE SAU (SomeIpXf #174 Tạo & Kiểm tra!)", "var(--hb-box-purple)", "var(--hb-box-purple-s)"))
    b.append(box_ml(460, 62, 115, 62, ["Byte 8..9", "ClientID", "0x0001"], "var(--hb-box-purple)", "var(--hb-box-purple-s)"))
    b.append(box_ml(580, 62, 115, 62, ["Byte 10..11", "SessionID", "0x0007"], "var(--hb-box-purple)", "var(--hb-box-purple-s)"))
    b.append(box_ml(700, 62, 95, 62, ["Byte 12..13", "PVer | IVer", "0x01 | 0x01"], "var(--hb-box-blue)", "var(--hb-box-blue-s)"))
    b.append(box_ml(800, 62, 100, 62, ["Byte 14..15", "Msg | Ret", "0x02 | 0x00"], "var(--hb-box-amber)", "var(--hb-box-amber-s)"))
    return svg_wrap(920, 145, "3.1 Tách bạch 8B SoAd Header và 8B SomeIpXf Header (Tổng 16 Bytes)", "".join(b))


def svg_3_2_dynarr_align():
    b = []
    b.append(box_ml(20, 45, 195, 76, ["Struct Fixed Fields", "Status(1B)+Seq(1B)+Flg(1B)", "Tổng 3 Bytes đầu", "Chưa chia hết Align 4B"], "var(--hb-box-blue)", "var(--hb-box-blue-s)", "var(--hb-box-hdr)"))
    b.append(arrow_line(215, 83, 250, 83, "hbArrA", "var(--hb-arrow-amber)"))
    b.append(box_ml(254, 45, 140, 76, ["AlignPad (1B)", "0x00 Byte đệm", "Đưa Offset lên 4", "(Bội số Align 4B)"], "var(--hb-box-amber)", "var(--hb-box-amber-s)", "var(--hb-box-hdr)"))
    b.append(arrow_line(394, 83, 429, 83, "hbArrP", "var(--hb-arrow-purple)"))
    b.append(box_ml(433, 45, 200, 76, ["LengthField (1/2/4B BE)", "Len = N * sizeof(RadarObj)", "VD: N=2 ➔ 8 (0x00000008)", "Co giãn động mỗi chu kỳ"], "var(--hb-box-purple)", "var(--hb-box-purple-s)", "var(--hb-box-hdr)"))
    b.append(arrow_line(633, 83, 668, 83, "hbArrG", "var(--hb-arrow-green)"))
    b.append(box_ml(672, 45, 225, 76, ["RadarObj[0 .. N-1]", "Obj[0]: Id, Dist, Vel, RCS", "Obj[1]: Id, Dist, Vel, RCS", "SomeIpXf_Inv đọc đúng N"], "var(--hb-box-green)", "var(--hb-box-green-s)", "var(--hb-box-hdr)"))
    return svg_wrap(920, 142, "3.2 Alignment Padding và LengthField cho Mảng Động Dynamic Array", "".join(b))


def svg_3_3_tlv_wiretype():
    b = []
    b.append(box_ml(20, 42, 270, 72, ["Định dạng Tag TLV 16-bit", "Bit 15: Reserved (0)", "Bit 14..12: WireType (0..6)", "Bit 11..0: DataId (0x001..FFF)"], "var(--hb-box-purple)", "var(--hb-box-purple-s)", "var(--hb-box-hdr)"))
    b.append(arrow_line(290, 78, 340, 78, "hbArrP", "var(--hb-arrow-purple)", "V2 Gửi"))
    b.append(box_ml(344, 42, 260, 72, ["ECU Phát Bản V2 Mới", "Tag 0x1001 (Speed 2B)", "Tag 0x0002 (Gear 1B)", "Tag 0x1003 (Trường mới V2!)"], "var(--hb-box-blue)", "var(--hb-box-blue-s)", "var(--hb-box-hdr)"))
    b.append(arrow_line(604, 78, 654, 78, "hbArrG", "var(--hb-arrow-green)", "V1 Đọc"))
    b.append(box_ml(658, 42, 240, 72, ["ECU Nhận Bản V1 Cũ", "Giải mã 0x0001 & 0x0002", "Gặp Tag lạ 0x1003:", "Đọc WireType=1 ➔ Bỏ qua 2B!"], "var(--hb-box-green)", "var(--hb-box-green-s)", "var(--hb-box-hdr)"))
    b.append(pill_note(20, 128, 878, 26, "WireType: 0=1B | 1=2B | 2=4B | 3=8B | 4=+1B LenField | 5=+2B LenField | 6=+4B LenField"))
    return svg_wrap(920, 168, "3.3 Cơ chế TLV (WireType + DataId) cho phép tương thích tiến/lùi OTA", "".join(b))


def svg_3_4_rpc_sequence():
    b = []
    b.append(box_ml(20, 40, 175, 58, ["SWC Client + RTE", "Rte_Call_CalcPath()", "TxHandle {Cli, Ses}"], "var(--hb-box-blue)", "var(--hb-box-blue-s)"))
    b.append(arrow_line(195, 62, 255, 62, "hbArrG", "var(--hb-arrow-green)", "REQ 0x00"))
    b.append(box_ml(259, 40, 195, 58, ["SomeIpXf Client", "MsgType = 0x00 REQ", "RequestId = Cli:Ses"], "var(--hb-box-purple)", "var(--hb-box-purple-s)"))
    b.append(arrow_line(454, 62, 514, 62, "hbArrP", "var(--hb-arrow-purple)", "LdCom"))
    b.append(box_ml(518, 40, 180, 58, ["Server ECU Runnable", "Thực thi CalcPath()", "OK (0x80) | ERR (0x81)"], "var(--hb-box-teal)", "var(--hb-box-teal-s)"))
    b.append(arrow_path("M 608 98 L 608 135 L 485 135", "hbArrA", "var(--hb-arrow-amber)", "RESP/ERR", 545, 127))
    b.append(box_ml(259, 108, 222, 64, ["ExtractProtocolHeaderFields()", "Đọc MsgType & ReturnCode:", "0x80 ➔ Giải mã OUT params", "0x81 ➔ Bỏ OUT, trả AppError"], "var(--hb-box-amber)", "var(--hb-box-amber-s)"))
    b.append(arrow_line(259, 140, 199, 140, "hbArrB", "var(--hb-arrow)", "Khớp Phiên"))
    b.append(box_ml(20, 114, 175, 52, ["Rte_Result / Return", "Khớp đúng SessionId"], "var(--hb-box-green)", "var(--hb-box-green-s)"))
    return svg_wrap(920, 185, "3.4 Luồng Client-Server RPC & SomeIpXf_ExtractProtocolHeaderFields()", "".join(b))


def svg_4_1_e2e_profiles():
    b = []
    b.append(box_ml(20, 38, 205, 92, ["Profile 01 (2 Bytes)", "CAN 8B Classic", "CRC-8-SAE-J1850 (1B)", "Cnt(4b) + DID Nib(4b)", "Max Payload nhỏ (<8B)"], "var(--hb-box-teal)", "var(--hb-box-teal-s)", "var(--hb-box-hdr)"))
    b.append(box_ml(240, 38, 205, 92, ["Profile 05 (3 Bytes)", "CAN-FD & PDU Gọn", "CRC-16-CCITT (2B)", "Counter 8-bit (1B)", "DataID 16b ẩn trong CRC"], "var(--hb-box-green)", "var(--hb-box-green-s)", "var(--hb-box-hdr)"))
    b.append(box_ml(460, 38, 210, 92, ["Profile 04 (12 Bytes)", "Ethernet SOME/IP SOA", "Len(2B)+Cnt(2B)+DID(4B)", "CRC-32P4 (4B)", "Hỗ trợ tới 4 KB/PDU"], "var(--hb-box-blue)", "var(--hb-box-blue-s)", "var(--hb-box-hdr)"))
    b.append(box_ml(685, 38, 215, 92, ["Profile 07 (20 Bytes)", "High ASIL-D ADAS", "Len(4B)+Cnt(4B)+DID(4B)", "CRC-64-ECMA (8B)", "Hỗ trợ khung > 4 KB"], "var(--hb-box-purple)", "var(--hb-box-purple-s)", "var(--hb-box-hdr)"))
    return svg_wrap(920, 150, "4.1 So sánh 4 E2E Safety Profiles Phổ Biến (HeaderShift & Thuật toán CRC)", "".join(b))


def svg_4_2_e2e_sm_window():
    b = []
    b.append(box_ml(20, 50, 130, 54, ["DEINIT (0x_4)", "Chưa khởi tạo"], "var(--hb-box-bg)", "var(--hb-box-stroke)"))
    b.append(arrow_line(150, 77, 190, 77, "hbArrB", "var(--hb-arrow)", "Init"))
    b.append(box_ml(194, 50, 145, 54, ["NODATA (0x_1)", "Chờ khung đầu tiên"], "var(--hb-box-amber)", "var(--hb-box-amber-s)"))
    b.append(arrow_line(339, 77, 385, 77, "hbArrA", "var(--hb-arrow-amber)", "Khung 1"))
    b.append(box_ml(389, 50, 155, 54, ["INIT (0x_2)", "Tích lũy MinOkValid"], "var(--hb-box-blue)", "var(--hb-box-blue-s)"))
    b.append(arrow_line(544, 68, 600, 68, "hbArrG", "var(--hb-arrow-green)", "Ok>=Min"))
    b.append(box_ml(604, 34, 155, 54, ["VALID (0x_0)", "An toàn ASIL"], "var(--hb-box-green)", "var(--hb-box-green-s)"))
    b.append(arrow_line(759, 61, 800, 95, "hbArrR", "var(--hb-arrow-red)", "Err>Max"))
    b.append(box_ml(720, 110, 175, 58, ["INVALID (0x_3)", "Bit 7=1 ➔ ABORT 0x88!", "Cần MinOkInvalid để hồi"], "var(--hb-box-red)", "var(--hb-box-red-s)"))
    b.append(arrow_path("M 720 138 L 650 138 L 650 88", "hbArrG", "var(--hb-arrow-green)", "Hồi phục", 618, 126))
    return svg_wrap(920, 182, "4.2 Máy trạng thái cửa sổ trượt E2E_SMCheck()", "".join(b))


def svg_4_3_two_nibble_byte():
    b = []
    b.append(box_ml(20, 42, 420, 74, ["HIGH NIBBLE (Bits 7..4): CheckStatus + Bit HardErr", "Bit 7: HARD_ERR (0=OK/Soft 0x8A, 1=SM_INVALID ➔ 0x88)", "Bits 6..4: 0=P_OK | 1=REPEATED | 2=WRONGSEQ | 3=ERR"], "var(--hb-box-amber)", "var(--hb-box-amber-s)", "var(--hb-box-hdr)"))
    b.append(box_ml(455, 42, 440, 74, ["LOW NIBBLE (Bits 3..0): E2E_SMState", "0x_0: E2E_SM_VALID | 0x_1: NODATA | 0x_2: INIT", "0x_3: E2E_SM_INVALID (Bắt buộc kéo Bit 7 = 1!)"], "var(--hb-box-teal)", "var(--hb-box-teal-s)", "var(--hb-box-hdr)"))
    b.append(pill_note(20, 128, 875, 28, "Ví dụ: 0x00=OK+VALID | 0x20=WRONGSEQ+VALID ➔ Soft 0x8A | 0xA3=WRONGSEQ+INVALID ➔ Abort 0x88!"))
    return svg_wrap(920, 168, "4.3 Giải phẫu mã trả về 2-Nibble Std_TransformerForwardCode", "".join(b))


def svg_4_4_rx_order_safety():
    b = []
    # Safe top row
    b.append(box_ml(20, 36, 220, 56, ["Frame Bus Rx Bị Nhiễu", "LengthField hỏng = 0xFFFFFFFF"], "var(--hb-box-amber)", "var(--hb-box-amber-s)"))
    b.append(arrow_line(240, 64, 305, 64, "hbArrG", "var(--hb-arrow-green)", "Đúng Chuẩn"))
    b.append(box_ml(310, 36, 270, 56, ["Bước 1: E2EXf_Inv (#176)", "Phát hiện sai CRC ➔ 0xB3 (Bit 7=1)"], "var(--hb-box-blue)", "var(--hb-box-blue-s)"))
    b.append(arrow_line(580, 64, 635, 64, "hbArrR", "var(--hb-arrow-red)", "ABORT"))
    b.append(box_ml(640, 36, 255, 56, ["Ngắt Chuỗi An Toàn (0x88)!", "Chặn trước SomeIpXf_Inv"], "var(--hb-box-green)", "var(--hb-box-green-s)"))

    # Dangerous bottom row
    b.append(box_ml(20, 114, 220, 56, ["Nếu Đặt Ngược (SAI!)", "Deserializer chạy trước CRC"], "var(--hb-box-red)", "var(--hb-box-red-s)"))
    b.append(arrow_line(240, 142, 305, 142, "hbArrR", "var(--hb-arrow-red)", "Rủi ro!"))
    b.append(box_ml(310, 114, 585, 56, ["SomeIpXf_Inv Đọc Nhầm LengthField = 0xFFFFFFFF ➔ Tràn RAM / Fault Trap!", "Hoặc ComXf_Inv giao dữ liệu phanh/lái bị đảo bit cho SWC!"], "var(--hb-box-red)", "var(--hb-box-red-s)"))
    return svg_wrap(920, 186, "4.4 Tại sao E2EXf_Inv PHẢI đứng trước Deserializer trên chiều Rx?", "".join(b))


def svg_5_1_inplace_vs_outofplace():
    b = []
    b.append(box_ml(20, 38, 430, 112, ["IN_PLACE Buffer (Khuyên dùng — Zero-Copy)", "1 Mảng duy nhất: uint8 Rte_XfrmBuf[64]", "[ Offset 0..11: E2E Hdr | Offset 12..N: SomeIpXf ]", "SomeIpXf viết vào &Rte_XfrmBuf[12] (HeaderShift=12B)", "E2EXf tính CRC và điền vào [0..11] ➔ 0 bytes memcpy!"], "var(--hb-box-green)", "var(--hb-box-green-s)", "var(--hb-box-hdr)"))
    b.append(box_ml(470, 38, 430, 112, ["OUT_OF_PLACE Buffer (Tốn gấp đôi RAM + CPU)", "Mảng 1: Rte_Buf1[Payload] ← SomeIpXf ghi tại [0]", "Mảng 2: Rte_Buf2[12 + Payload]", "E2EXf phải memcpy(Buf2+12, Buf1) rồi mới ghi Header", "Lãng phí chu kỳ CPU khi mảng Dynamic Array lớn!"], "var(--hb-box-red)", "var(--hb-box-red-s)", "var(--hb-box-hdr)"))
    return svg_wrap(920, 166, "5.1 So sánh quản lý bộ đệm IN_PLACE (HeaderShift) vs OUT_OF_PLACE", "".join(b))


def svg_5_2_error_decision():
    b = []
    b.append(box_ml(20, 50, 210, 68, ["E2EXf_Inv / SomeIpXf_Inv", "Trả về mã lỗi 8-bit", "hoặc MsgType=0x81"], "var(--hb-box-blue)", "var(--hb-box-blue-s)"))
    b.append(arrow_line(230, 60, 320, 48, "hbArrR", "var(--hb-arrow-red)", "Bit 7 = 1"))
    b.append(box_ml(324, 24, 570, 44, ["HARD ERROR (0x88/0x87/0x89): NGẮT CHUỖI! Không gọi Deserializer", "SWC nhận RTE_E_HARD_TRANSFORMER_ERROR, giữ nguyên biến cũ"], "var(--hb-box-red)", "var(--hb-box-red-s)"))
    b.append(arrow_line(230, 84, 320, 84, "hbArrA", "var(--hb-arrow-amber)", "Bit7=0,Hi!=0"))
    b.append(box_ml(324, 72, 570, 44, ["SOFT ERROR (0x8A): Cho phép chạy Deserializer (VD: nhảy 1 Seq)", "Giao dữ liệu kèm mã cảnh báo RTE_E_SOFT_TRANSFORMER_ERROR"], "var(--hb-box-amber)", "var(--hb-box-amber-s)"))
    b.append(arrow_line(230, 108, 320, 130, "hbArrG", "var(--hb-arrow-green)", "Msg=0x81"))
    b.append(box_ml(324, 120, 570, 44, ["APPLICATION ERROR (MsgType 0x81): Tầng E2E OK (0x00)", "RTE bỏ giải mã OUT params, trả nguyên mã lỗi nghiệp vụ về SWC"], "var(--hb-box-green)", "var(--hb-box-green-s)"))
    return svg_wrap(920, 178, "5.2 Phân biệt 3 nhóm lỗi tại biên RTE: Hard (0x88) vs Soft (0x8A) vs AppError (0x81)", "".join(b))


def svg_5_4_com_vs_ldcom():
    b = []
    b.append(box_ml(20, 36, 225, 52, ["ComXf (#175) [+E2EXf]", "Đóng gói bit SignalGroup"], "var(--hb-box-teal)", "var(--hb-box-teal-s)"))
    b.append(arrow_line(245, 62, 345, 62, "hbArrB", "var(--hb-arrow)", "SigGrpArray"))
    b.append(box_ml(350, 36, 250, 52, ["AUTOSAR COM (#50)", "I-PDU cố định ≤ 64B, Deadline"], "var(--hb-box-blue)", "var(--hb-box-blue-s)"))
    b.append(arrow_line(600, 62, 665, 62, "hbArrB", "var(--hb-arrow)", "PduR"))
    b.append(box_ml(670, 36, 225, 52, ["CanIf (#60) ➔ CAN / CAN-FD", "Khung CAN chuẩn 8B & 64B"], "var(--hb-box-green)", "var(--hb-box-green-s)"))

    b.append(box_ml(20, 108, 225, 52, ["SomeIpXf (#174) [+E2EXf]", "8B Hdr + DynArray / TLV"], "var(--hb-box-purple)", "var(--hb-box-purple-s)"))
    b.append(arrow_line(245, 134, 345, 134, "hbArrP", "var(--hb-arrow-purple)", "LdCom_Tx"))
    b.append(box_ml(350, 108, 250, 52, ["LdCom (#49) Pass-Through", "Không bóc signal, kích thước động"], "var(--hb-box-amber)", "var(--hb-box-amber-s)"))
    b.append(arrow_line(600, 134, 665, 134, "hbArrA", "var(--hb-arrow-amber)", "PduR"))
    b.append(box_ml(670, 108, 225, 52, ["SoAd (#56) ➔ Ethernet", "Ghép 8B đầu ➔ 16B SOME/IP"], "var(--hb-box-green)", "var(--hb-box-green-s)"))
    return svg_wrap(920, 178, "5.4 Ranh giới AUTOSAR COM (#50) vs Large Data COM (LdCom #49)", "".join(b))


def svg_6_3_det_barrier():
    b = []
    b.append(box_ml(20, 52, 230, 68, ["SomeIpXf / ComXf / E2EXf", "Kiểm tra tham số & con trỏ", "trước và trong khi xử lý"], "var(--hb-box-blue)", "var(--hb-box-blue-s)"))
    b.append(arrow_line(250, 68, 360, 54, "hbArrA", "var(--hb-arrow-amber)", "DevError=ON"))
    b.append(box_ml(365, 32, 530, 52, ["Det_ReportError() — Development Errors (Tắt ở Production)", "0x01 XFRM_E_UNINIT | 0x02 INIT_FAILED | 0x03 PARAM | 0x04 PARAM_POINTER"], "var(--hb-box-amber)", "var(--hb-box-amber-s)"))
    b.append(arrow_line(250, 102, 360, 118, "hbArrR", "var(--hb-arrow-red)", "Always ON"))
    b.append(box_ml(365, 96, 530, 52, ["Det_ReportRuntimeError() — Runtime Error (Luôn bật cả Production!)", "0x05 XFRM_E_MALFORMED_MESSAGE (Gói cắt cụt < 8B hoặc Tag TLV hỏng)"], "var(--hb-box-red)", "var(--hb-box-red-s)"))
    return svg_wrap(920, 166, "6.3 Hàng rào lỗi DET (#15): Dev Errors vs Production Runtime (0x05)", "".join(b))
