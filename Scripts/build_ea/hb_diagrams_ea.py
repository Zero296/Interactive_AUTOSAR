# -*- coding: utf-8 -*-
"""18 crisp, theme-aware inline SVG diagrams for AUTOSAR Ea Handbook (6 topics x 3 SVGs)."""

from xml.sax.saxutils import escape as xml_esc


def svg_wrap(w, h, title_text, body):
    return (
        f'<svg class="hb-svg" viewBox="0 0 {w} {h}" width="100%" '
        f'style="max-width:{w}px;height:auto;display:block;margin:8px auto;" '
        f'role="img" aria-label="{xml_esc(title_text)}">\n'
        f'  <defs>\n'
        f'    <marker id="hbArr" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">\n'
        f'      <path d="M0,0 L7,3.5 L0,7 z" fill="var(--pri)"/>\n'
        f'    </marker>\n'
        f'    <marker id="hbArrOk" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">\n'
        f'      <path d="M0,0 L7,3.5 L0,7 z" fill="var(--ok)"/>\n'
        f'    </marker>\n'
        f'    <marker id="hbArrWarn" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">\n'
        f'      <path d="M0,0 L7,3.5 L0,7 z" fill="var(--warn)"/>\n'
        f'    </marker>\n'
        f'    <marker id="hbArrErr" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">\n'
        f'      <path d="M0,0 L7,3.5 L0,7 z" fill="var(--err)"/>\n'
        f'    </marker>\n'
        f'    <marker id="hbArrPur" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">\n'
        f'      <path d="M0,0 L7,3.5 L0,7 z" fill="var(--pur)"/>\n'
        f'    </marker>\n'
        f'    <marker id="hbArrCyan" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">\n'
        f'      <path d="M0,0 L7,3.5 L0,7 z" fill="var(--cyan)"/>\n'
        f'    </marker>\n'
        f'  </defs>\n'
        f'{body}\n'
        f'</svg>'
    )


def box_ml(x, y, w, h, lines, fill="var(--bg3)", stroke="var(--bd)", stroke_w=1.5, rx=7, text_color="var(--txt)"):
    """Multi-line centered box with data-box-* attributes for static overflow/collision check."""
    out = [
        f'  <rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" '
        f'fill="{fill}" stroke="{stroke}" stroke-width="{stroke_w}" '
        f'data-box-x="{x}" data-box-y="{y}" data-box-w="{w}" data-box-h="{h}"/>'
    ]
    n = len(lines)
    total_h = n * 13
    start_y = y + (h - total_h) / 2 + 10.5
    cx = x + w / 2
    for idx, line in enumerate(lines):
        if isinstance(line, tuple):
            txt, fsz, fw, col = line
        else:
            txt, fsz, fw, col = (line, 11 if idx == 0 else 9.5, "700" if idx == 0 else "500", text_color if idx == 0 else "var(--mut)")
        ly = round(start_y + idx * 13.5, 1)
        out.append(
            f'  <text x="{cx}" y="{ly}" text-anchor="middle" font-size="{fsz}" '
            f'font-weight="{fw}" fill="{col}">{xml_esc(str(txt))}</text>'
        )
    return "\n".join(out)


def pill_label(cx, cy, text, color="var(--pri)", w=None):
    """Compact pill tag sitting cleanly in open channel (with data-px/y/w/h metadata)."""
    pw = w if w is not None else max(38, int(len(text) * 5.8 + 12))
    ph = 15
    px = round(cx - pw / 2, 1)
    py = round(cy - ph / 2, 1)
    return (
        f'  <g class="hb-pill" data-px="{px}" data-py="{py}" data-pw="{pw}" data-ph="{ph}">\n'
        f'    <rect x="{px}" y="{py}" width="{pw}" height="{ph}" rx="4" fill="var(--bg)" stroke="{color}" stroke-width="1"/>\n'
        f'    <text x="{cx}" y="{round(cy + 3.2, 1)}" text-anchor="middle" font-size="8.8" font-weight="700" fill="{color}">{xml_esc(text)}</text>\n'
        f'  </g>'
    )


def line_arrow(x1, y1, x2, y2, color="var(--pri)", marker="hbArr", dashed=False):
    dash = ' stroke-dasharray="4 3"' if dashed else ""
    return f'  <line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="1.6"{dash} marker-end="url(#{marker})"/>'


def path_arrow(d, color="var(--pri)", marker="hbArr", dashed=False):
    dash = ' stroke-dasharray="4 3"' if dashed else ""
    return f'  <path d="{d}" fill="none" stroke="{color}" stroke-width="1.6"{dash} marker-end="url(#{marker})"/>'


def caption_text(x, y, text, size=10.5, weight="700", color="var(--txt)", anchor="middle"):
    return f'  <text x="{x}" y="{y}" text-anchor="{anchor}" font-size="{size}" font-weight="{weight}" fill="{color}">{xml_esc(text)}</text>'


# =========================================================================
# TOPIC 0: 1. Kiến Trúc Memory Stack & Ea
# =========================================================================

def svg_ea_memstack_5layer():
    b = [caption_text(390, 16, "Kiến Trúc Memory Stack 5 Tầng AUTOSAR Classic (ModuleId = 40)")]
    # Row 1: Application / RTE / System
    b.append(box_ml(25, 30, 145, 44, ["SWC_App / SWC_Diag", "Rte_Call_NvMService()"], stroke="var(--pri)"))
    b.append(box_ml(210, 30, 145, 44, ["RTE Layer", "Port Client-Server Map"], stroke="var(--cyan)"))
    b.append(box_ml(420, 30, 155, 44, ["EcuM / BswM", "Ea_Init() & SetMode()"], stroke="var(--pur)"))
    b.append(box_ml(610, 30, 145, 44, ["SchM / OS (5ms)", "Ea_MainFunction()"], stroke="var(--pur)"))

    # Row 2: Service & Abstraction Chain
    b.append(box_ml(25, 118, 155, 50, ["NvM (Memory Service)", "Queue, CRC, Dataset Index"], stroke="var(--warn)"))
    b.append(box_ml(225, 118, 155, 50, ["MemIf (Mem Abstraction)", "Route theo DeviceIndex"], stroke="var(--warn)"))
    b.append(box_ml(425, 118, 170, 50, [("Ea (EEPROM Abst. #40)", 11, "800", "var(--pri)"), ("Addr Map, VP Pad, Hdr/Ftr", 9.2, "600", "var(--mut)")], fill="var(--bg2)", stroke="var(--pri)", stroke_w=2.2))
    b.append(box_ml(635, 118, 120, 50, ["DET / DEM", "Dev/Runtime & HW"], stroke="var(--err)"))

    # Row 3: MCAL & Hardware
    b.append(box_ml(425, 206, 170, 44, ["Eep Driver (MCAL #90)", "Eep_Write/Read/Erase"], stroke="var(--ok)"))
    b.append(box_ml(635, 206, 120, 44, ["SPI / Ext EEPROM", "AT25640 / 25LC256"], stroke="var(--ok)"))

    # Arrows cleanly routed between boxes (no overlap)
    b.append(line_arrow(170, 52, 210, 52, "var(--pri)", "hbArr"))
    b.append(path_arrow("M282,74 L282,94 L102,94 L102,118", "var(--cyan)", "hbArrCyan"))
    b.append(line_arrow(180, 143, 225, 143, "var(--warn)", "hbArrWarn"))
    b.append(line_arrow(380, 143, 425, 143, "var(--pri)", "hbArr"))
    b.append(line_arrow(595, 143, 635, 143, "var(--err)", "hbArrErr", True))
    b.append(line_arrow(497, 74, 497, 118, "var(--pur)", "hbArrPur"))
    b.append(path_arrow("M682,74 L682,96 L535,96 L535,118", "var(--pur)", "hbArrPur"))
    b.append(line_arrow(510, 168, 510, 206, "var(--ok)", "hbArrOk"))
    b.append(line_arrow(595, 228, 635, 228, "var(--ok)", "hbArrOk"))
    b.append(line_arrow(695, 206, 695, 168, "var(--err)", "hbArrErr", True))

    # Pills strictly in open gaps
    b.append(pill_label(202, 143, "MemIf", "var(--warn)", 40))
    b.append(pill_label(402, 143, "Ea_*", "var(--pri)", 38))
    b.append(pill_label(510, 187, "Eep_*", "var(--ok)", 42))
    return svg_wrap(780, 265, "Kiến Trúc Memory Stack 5 Tầng", "\n".join(b))


def svg_ea_memif_routing():
    b = [caption_text(390, 16, "Cơ Chế Định Tuyến MemIf → Ea (Single Device Macro vs Dual Device FctPtr)")]
    b.append(box_ml(25, 80, 145, 58, ["NvM Manager", "BlockId + DataIndex", "=> (DeviceIdx, BlkNo)"], stroke="var(--warn)"))
    b.append(box_ml(220, 80, 175, 58, ["MemIf Dispatcher", "1 Device: Macro Inline", "2+ Dev: FctPtr Table[Idx]"], stroke="var(--pri)"))
    b.append(box_ml(455, 36, 290, 62, [("DeviceIndex == 0 (EaIndex=0)", 10.5, "700", "var(--ok)"), ("Ea_Read / Ea_Write / Ea_Invalidate", 9.5, "600", "var(--txt)"), ("-> Eep Driver -> External SPI EEPROM", 9, "500", "var(--mut)")], stroke="var(--ok)"))
    b.append(box_ml(455, 134, 290, 62, [("DeviceIndex == 1 (FeeIndex=1)", 10.5, "700", "var(--cyan)"), ("Fee_Read / Fee_Write / Fee_Invalidate", 9.5, "600", "var(--txt)"), ("-> Fls Driver -> Internal Data Flash", 9, "500", "var(--mut)")], stroke="var(--cyan)"))

    b.append(line_arrow(170, 109, 220, 109, "var(--warn)", "hbArrWarn"))
    b.append(path_arrow("M395,95 L425,95 L425,67 L455,67", "var(--ok)", "hbArrOk"))
    b.append(path_arrow("M395,123 L425,123 L425,165 L455,165", "var(--cyan)", "hbArrCyan"))

    b.append(pill_label(195, 92, "Call", "var(--warn)", 34))
    b.append(pill_label(425, 50, "Idx=0", "var(--ok)", 40))
    b.append(pill_label(425, 182, "Idx=1", "var(--cyan)", 40))
    b.append(caption_text(390, 220, "Lưu ý: Khi hệ thống chỉ dùng 1 thiết bị EEPROM, MemIf biên dịch thành #define trực tiếp sang Ea_* (0 byte RAM overhead).", 9.8, "600", "var(--mut)"))
    return svg_wrap(780, 236, "Cơ chế định tuyến MemIf tới Ea", "\n".join(b))


def svg_ea_dual_registers():
    b = [caption_text(390, 16, "Cấu Trúc 2 Thanh Ghi 8-Bit Trực Quan Trong Simulator")]
    # Register A row
    b.append(caption_text(25, 42, "Reg A: Ea_ModuleJobStatusByte (Trạng thái Module & Chế độ)", 10, "700", "var(--pri)", "start"))
    reg_a = [
        ("b7 INIT", "var(--ok)"), ("b6 BUSY", "var(--warn)"), ("b5 B_INT", "var(--pur)"), ("b4 PEND", "var(--warn)"),
        ("b3 OK", "var(--ok)"), ("b2 EEP", "var(--pur)"), ("b1 FAST", "var(--cyan)"), ("b0 POLL", "var(--warn)")
    ]
    for i, (lbl, col) in enumerate(reg_a):
        b.append(box_ml(25 + i * 92, 50, 84, 42, [lbl, "1 / 0"], stroke=col))

    # Register B row
    b.append(caption_text(25, 122, "Reg B: Ea_BlockHeaderControlByte (Cờ Block đang chọn & Toàn vẹn)", 10, "700", "var(--cyan)", "start"))
    reg_b = [
        ("b7 0xA5", "var(--ok)"), ("b6 0x5A", "var(--ok)"), ("b5 INC", "var(--err)"), ("b4 INV", "var(--warn)"),
        ("b3 IMM", "var(--pur)"), ("b2 ERS", "var(--pur)"), ("b1 WEAR", "var(--ok)"), ("b0 ERR", "var(--err)")
    ]
    for i, (lbl, col) in enumerate(reg_b):
        b.append(box_ml(25 + i * 92, 130, 84, 42, [lbl, "1 / 0"], stroke=col))

    b.append(box_ml(25, 192, 728, 48, [
        "Click bất kỳ ô bit nào trên Bảng Monitor (Dual 8-Bit Registers)",
        "để bật/tắt EaInitialized, SetMode(FAST/SLOW), Polling, Immediate hoặc tiêm/gỡ lỗi Footer!"
    ], fill="var(--bg2)", stroke="var(--pri)"))
    return svg_wrap(780, 254, "Cấu trúc 2 thanh ghi 8-bit", "\n".join(b))


# =========================================================================
# TOPIC 1: 2. Ánh Xạ, Virtual Page & Wear-Level
# =========================================================================

def svg_ea_blocknumber_formula():
    b = [caption_text(390, 16, "Ánh Xạ Đa Tầng: NvM (Base, DataIndex) → EaBlockNumber → EEPROM Slot Address")]
    b.append(box_ml(25, 42, 175, 58, ["NvM Configuration", "NvMDatasetSelectionBits=2", "BaseBlk=2, DataIndex=0/1"], stroke="var(--warn)"))
    b.append(box_ml(250, 42, 225, 58, [("Công Thức Bitwise SWS_Ea", 10.5, "700", "var(--pri)"), ("BlkNo = (Base << k) | DataIdx", 10, "700", "var(--cyan)"), ("Simulator: Blk #2 [DS 0], Blk #3 [DS 1]", 9.2, "500", "var(--mut)")], stroke="var(--pri)"))
    b.append(box_ml(525, 42, 230, 58, ["EaBlockConfiguration", "Blk #2 -> 0x0010 (16B)", "Blk #3 -> 0x0020 (16B)"], stroke="var(--ok)"))

    b.append(line_arrow(200, 71, 250, 71, "var(--warn)", "hbArrWarn"))
    b.append(line_arrow(475, 71, 525, 71, "var(--ok)", "hbArrOk"))
    b.append(pill_label(225, 52, "Input", "var(--warn)", 38))
    b.append(pill_label(500, 52, "Map", "var(--ok)", 36))

    b.append(box_ml(25, 128, 165, 56, ["Blk #1 (Calib)", "12B + 4B OH = 16B", "Slot #0 @ 0x0000"], stroke="var(--pri)"))
    b.append(box_ml(205, 128, 175, 56, ["Blk #2 / #3 (Dataset)", "8B+4B+4B Pad = 16B mỗi copy", "@ 0x0010 & 0x0020"], stroke="var(--cyan)"))
    b.append(box_ml(395, 128, 185, 56, ["Blk #4 (Odometer Wear)", "400k cycles -> 4 Slots × 8B", "@ 0x0030..0x004F (32B)"], stroke="var(--ok)"))
    b.append(box_ml(595, 128, 160, 56, ["Blk #5 (Crash Imm)", "ImmediateData=TRUE", "10B+4B+2B Pad = 16B"], stroke="var(--pur)"))
    return svg_wrap(780, 202, "Công thức EaBlockNumber và bảng Block", "\n".join(b))


def svg_ea_virtual_page_align():
    b = [caption_text(390, 16, "Căn Chỉnh Trang Ảo (EaVirtualPageSize = 8B vs 4B) & Padding 0xFF")]
    b.append(caption_text(25, 44, "Công thức: SlotSize = Ceil((DataSize + EaBlockOverhead) / VirtualPage) × VirtualPage", 10, "700", "var(--pri)", "start"))

    # Case 1: Blk 1 (12B Data + 4B OH = 16B @ VP=8)
    b.append(caption_text(25, 74, "Trường hợp A: Blk #1 (12B Data + 4B OH = 16B) với VP = 8B -> Vừa khít (Pad = 0B)", 9.5, "600", "var(--txt)", "start"))
    b.append(box_ml(25, 84, 95, 40, ["Hdr (2B)", "0xA5 Cnt"], stroke="var(--pri)"))
    b.append(box_ml(125, 84, 240, 40, ["Data Payload (12B)", "User RAM Data"], stroke="var(--cyan)"))
    b.append(box_ml(370, 84, 95, 40, ["Ftr (2B)", "0x5A Cnt"], stroke="var(--ok)"))
    b.append(box_ml(475, 84, 270, 40, ["Tổng = 16B = 2 × 8B", "Không dư Padding"], stroke="var(--ok)"))

    # Case 2: Blk 3 (4B Data + 4B OH = 8B -> at VP=16B needs 8B Pad)
    b.append(caption_text(25, 152, "Trường hợp B: Blk #3 (4B Data + 4B OH = 8B) nếu đổi VP = 16B -> Tốn 8B Padding 0xFF", 9.5, "600", "var(--warn)", "start"))
    b.append(box_ml(25, 162, 85, 40, ["Hdr (2B)", "0xA5"], stroke="var(--pri)"))
    b.append(box_ml(115, 162, 130, 40, ["Data (4B)", "Odometer"], stroke="var(--cyan)"))
    b.append(box_ml(250, 162, 85, 40, ["Ftr (2B)", "0x5A"], stroke="var(--ok)"))
    b.append(box_ml(340, 162, 165, 40, ["VP Pad (8B = 0xFF)", "Chừa trống canh VP=16"], stroke="var(--warn)"))
    b.append(box_ml(515, 162, 230, 40, ["Tổng = 16B/Slot × 4 Slots", "Chiếm 64B EEPROM"], stroke="var(--warn)"))
    return svg_wrap(780, 222, "Căn chỉnh Virtual Page Size", "\n".join(b))


def svg_ea_wear_leveling_slots():
    b = [caption_text(390, 16, "Cơ Chế Multi-Slot Wear-Leveling Cho Blk #3 (400k Cycles / 100k = 4 Slots)")]
    slots = [
        ("Slot #0 @ 0x0030", "Cnt=0x01 (Old)", "Cycles: 1", "var(--mut)"),
        ("Slot #1 @ 0x0038", "Cnt=0x02 (Old)", "Cycles: 2", "var(--mut)"),
        ("Slot #2 @ 0x0040", "Cnt=0x03 ACTIVE", "Newest Valid!", "var(--ok)"),
        ("Slot #3 @ 0x0048", "0xFF (Next Write)", "Cycles: 0", "var(--pri)")
    ]
    for i, (t1, t2, t3, col) in enumerate(slots):
        b.append(box_ml(25 + i * 188, 42, 162, 62, [t1, t2, t3], stroke=col, stroke_w=2.2 if i == 2 else 1.5))
        if i < 3:
            b.append(line_arrow(187 + i * 188, 73, 213 + i * 188, 73, "var(--pri)", "hbArr"))

    b.append(box_ml(25, 134, 345, 58, ["Lần Ea_Write(3) kế tiếp:", "Tự động xoay (2 + 1) % 4 → Chọn Slot #3!", "Tăng SeqCounter = 0x04 chống mài mòn 1 ô."], stroke="var(--pri)"))
    b.append(box_ml(400, 134, 355, 58, ["Xử lý Wrap-Around 8-Bit Counter (0xFF → 0x00):", "So sánh Modulo ((a - b) & 0xFF) < 128:", "0x00 vẫn được nhận diện mới hơn 0xFF!"], stroke="var(--cyan)"))
    b.append(line_arrow(650, 104, 650, 134, "var(--cyan)", "hbArrCyan"))
    b.append(line_arrow(240, 134, 460, 104, "var(--ok)", "hbArrOk"))
    return svg_wrap(780, 208, "Multi-Slot Wear-Leveling Rotation", "\n".join(b))


# =========================================================================
# TOPIC 2: 3. Header/Footer & Chống Sập Nguồn
# =========================================================================

def svg_ea_slot_anatomy():
    b = [caption_text(390, 16, "Cấu Trúc Byte-Level Của 1 Slot Vật Lý Trong EEPROM")]
    b.append(box_ml(25, 42, 155, 62, ["Header (2 Bytes)", "Byte[0] = 0xA5 (Start)", "Byte[1] = SeqCnt"], stroke="var(--pri)"))
    b.append(box_ml(195, 42, 235, 62, ["Data Payload (N Bytes)", "Dữ liệu người dùng từ NvM", "Ghi sau khi đã ghi Header"], stroke="var(--cyan)"))
    b.append(box_ml(445, 42, 165, 62, ["Footer (2 Bytes)", "Byte[N+2] = 0x5A (End)", "Byte[N+3] = SeqCnt"], stroke="var(--ok)"))
    b.append(box_ml(625, 42, 130, 62, ["Padding (0..VP-1)", "Giá trị 0xFF", "Canh biên VirtualPage"], stroke="var(--mut)"))

    b.append(line_arrow(180, 73, 195, 73, "var(--pri)", "hbArr"))
    b.append(line_arrow(430, 73, 445, 73, "var(--cyan)", "hbArrCyan"))
    b.append(line_arrow(610, 73, 625, 73, "var(--mut)", "hbArr"))

    b.append(box_ml(25, 130, 175, 56, ["VALID", "Hdr=0xA5 & Ftr=0x5A", "Cnt(Hdr) == Cnt(Ftr)"], stroke="var(--ok)"))
    b.append(box_ml(215, 130, 180, 56, ["INCONSISTENT", "Hdr=0xA5 & Ftr=0xFF", "Mất nguồn giữa chừng"], stroke="var(--err)"))
    b.append(box_ml(410, 130, 170, 56, ["INVALID", "Hdr=0x00 & Ftr=0x00", "Sau Ea_InvalidateBlock"], stroke="var(--warn)"))
    b.append(box_ml(595, 130, 160, 56, ["ERASED / PRE_ERS", "Toàn bộ byte = 0xFF", "Sau EraseImmediate"], stroke="var(--pur)"))
    return svg_wrap(780, 204, "Giải phẫu cấu trúc Header/Footer Slot", "\n".join(b))


def svg_ea_atomic_powerloss():
    b = [caption_text(390, 16, "Chu Trình Ghi 3 Pha Chống Sập Nguồn & Kịch Bản Power-Loss Mid-Write")]
    b.append(box_ml(25, 38, 175, 54, ["Pha 1: WRITE_HDR", "Eep_Write(0xA5, Cnt)", "Đánh dấu bắt đầu ghi"], stroke="var(--pri)"))
    b.append(box_ml(245, 38, 210, 54, ["Pha 2: WRITE_DATA", "Eep_Write(Payload N bytes)", "Ghi dữ liệu vào phần thân"], stroke="var(--cyan)"))
    b.append(box_ml(505, 38, 240, 54, ["Pha 3: WRITE_FTR (Commit)", "Eep_Write(0x5A, Cnt) -> VALID", "Gọi NvM_JobEndNotification()"], stroke="var(--ok)"))

    b.append(line_arrow(200, 65, 245, 65, "var(--pri)", "hbArr"))
    b.append(line_arrow(455, 65, 505, 65, "var(--cyan)", "hbArrCyan"))
    b.append(pill_label(222, 48, "1", "var(--pri)", 22))
    b.append(pill_label(480, 48, "2", "var(--cyan)", 22))

    # Power-loss branch below Pha 2
    b.append(box_ml(210, 128, 280, 64, [("SẬP NGUỒN GIỮA PHA 2!", 10.5, "700", "var(--err)"), ("Footer vẫn là 0xFF (chưa tới Pha 3)", 9.5, "600", "var(--txt)"), ("Lần bật máy sau: Ea_Read trả MEMIF_BLOCK_INCONSISTENT", 9.2, "500", "var(--mut)")], stroke="var(--err)", stroke_w=2))
    b.append(box_ml(525, 128, 220, 64, ["Bảo Toàn Hệ Thống:", "• Wear-Slot cũ (Slot #2) còn nguyên!", "• Hoặc NvM dùng ROM Default Data."], stroke="var(--warn)"))
    b.append(line_arrow(350, 92, 350, 128, "var(--err)", "hbArrErr"))
    b.append(line_arrow(490, 160, 525, 160, "var(--warn)", "hbArrWarn"))
    b.append(pill_label(350, 110, "Power Loss!", "var(--err)", 74))
    return svg_wrap(780, 210, "Chu trình 3 pha và chống sập nguồn", "\n".join(b))


def svg_ea_read_decision_tree():
    b = [caption_text(390, 16, "Cây Quyết Định Khi Thực Thi Ea_Read() Kiểm Tra Tính Toàn Vẹn")]
    b.append(box_ml(25, 76, 155, 54, ["Ea_Read(BlkNo)", "Quét Header (2B)", "và Footer (2B)"], stroke="var(--pri)"))
    b.append(box_ml(230, 32, 230, 46, ["Hdr == 0x00 && Ftr == 0x00 ?", "Đã gọi Ea_InvalidateBlock"], stroke="var(--warn)"))
    b.append(box_ml(230, 102, 230, 50, ["Hdr[0]==0xA5 && Ftr[0]==0x5A", "&& Hdr[1] == Ftr[1] ?"], stroke="var(--ok)"))
    b.append(box_ml(230, 176, 230, 46, ["Mọi trường hợp khác:", "(0xFF rỗng hoặc lệch Counter)"], stroke="var(--err)"))

    b.append(box_ml(520, 32, 235, 46, ["Trả MEMIF_BLOCK_INVALID", "Gọi NvM_JobErrorNotification()"], stroke="var(--warn)"))
    b.append(box_ml(520, 102, 235, 50, ["Copy Payload vào RamPtr", "-> Trả MEMIF_JOB_OK"], stroke="var(--ok)"))
    b.append(box_ml(520, 176, 235, 46, ["MEMIF_BLOCK_INCONSISTENT", "Gọi NvM_JobErrorNotification()"], stroke="var(--err)"))

    b.append(path_arrow("M180,95 L205,95 L205,55 L230,55", "var(--warn)", "hbArrWarn"))
    b.append(line_arrow(180, 127, 230, 127, "var(--ok)", "hbArrOk"))
    b.append(path_arrow("M180,115 L205,115 L205,199 L230,199", "var(--err)", "hbArrErr"))

    b.append(line_arrow(460, 55, 520, 55, "var(--warn)", "hbArrWarn"))
    b.append(line_arrow(460, 127, 520, 127, "var(--ok)", "hbArrOk"))
    b.append(line_arrow(460, 199, 520, 199, "var(--err)", "hbArrErr"))

    b.append(pill_label(490, 42, "YES", "var(--warn)", 34))
    b.append(pill_label(490, 114, "YES", "var(--ok)", 34))
    b.append(pill_label(490, 186, "ELSE", "var(--err)", 36))
    return svg_wrap(780, 236, "Cây quyết định Ea_Read", "\n".join(b))


# =========================================================================
# TOPIC 3: 4. Bất Đồng Bộ, Immediate & Polling
# =========================================================================

def svg_ea_state_machine():
    b = [caption_text(390, 16, "Máy Trạng Thái Module Ea (Ea_GetStatus() : MemIf_StatusType)")]
    b.append(box_ml(25, 76, 150, 54, ["MEMIF_UNINIT", "Sau Power-On Reset", "API ngoài Init -> DET"], stroke="var(--err)"))
    b.append(box_ml(220, 76, 165, 54, ["MEMIF_BUSY_INTERNAL", "Ea_Init() đang chạy", "Chờ 1 MainFunction"], stroke="var(--pur)"))
    b.append(box_ml(435, 76, 145, 54, ["MEMIF_IDLE", "Sẵn sàng nhận lệnh", "Read/Write/Invalidate"], stroke="var(--ok)", stroke_w=2.2))
    b.append(box_ml(620, 76, 135, 54, ["MEMIF_BUSY", "Đang chạy Job + Eep", "Từ chối Job mới (0x06)"], stroke="var(--warn)"))

    b.append(line_arrow(175, 103, 220, 103, "var(--pur)", "hbArrPur"))
    b.append(line_arrow(385, 103, 435, 103, "var(--ok)", "hbArrOk"))
    b.append(path_arrow("M580,92 L620,92", "var(--warn)", "hbArrWarn"))
    b.append(path_arrow("M620,115 L580,115", "var(--ok)", "hbArrOk"))

    b.append(pill_label(197, 62, "Ea_Init()", "var(--pur)", 54))
    b.append(pill_label(410, 62, "MainFn OK", "var(--ok)", 60))
    b.append(pill_label(600, 58, "API Req", "var(--warn)", 52))
    b.append(pill_label(600, 148, "Done/Cancel", "var(--ok)", 72))
    b.append(line_arrow(600, 70, 600, 88, "var(--warn)", "hbArrWarn"))
    b.append(line_arrow(600, 139, 600, 120, "var(--ok)", "hbArrOk"))
    return svg_wrap(780, 178, "Máy trạng thái Ea_GetStatus", "\n".join(b))


def svg_ea_immediate_preerase():
    b = [caption_text(390, 16, "Tối Ưu Dữ Liệu Khẩn Cấp (Crash Data): Ea_EraseImmediateBlock vs Normal Write")]
    b.append(caption_text(25, 44, "Luồng A — EaImmediateData = TRUE + Pre-Erase (Xóa sẵn trước va chạm):", 9.8, "700", "var(--pur)", "start"))
    b.append(box_ml(25, 54, 210, 44, ["1. Lúc chạy bình thường (Idle)", "Ea_EraseImmediateBlock(4) -> 0xFF"], stroke="var(--pur)"))
    b.append(box_ml(275, 54, 200, 44, ["2. Sự kiện Crash xảy ra!", "Ea_Write(4, CrashData)"], stroke="var(--err)"))
    b.append(box_ml(515, 54, 240, 44, ["3. Ghi thẳng không cần xóa!", "Tiết kiệm tối đa thời gian trước sập pin"], stroke="var(--ok)"))
    b.append(line_arrow(235, 76, 275, 76, "var(--pur)", "hbArrPur"))
    b.append(line_arrow(475, 76, 515, 76, "var(--ok)", "hbArrOk"))

    b.append(caption_text(25, 130, "Luồng B — EaImmediateData = FALSE mà gọi Ea_EraseImmediateBlock():", 9.8, "700", "var(--err)", "start"))
    b.append(box_ml(25, 140, 280, 44, ["Kiểm tra StrictImmediateEraseCheck", "Block #1 có EaImmediateData == FALSE"], stroke="var(--warn)"))
    b.append(box_ml(350, 140, 405, 44, ["Bị từ chối ngay lập tức (Return E_NOT_OK)", "Báo lỗi DET EA_E_INVALID_BLOCK_NO / State Guard!"], stroke="var(--err)"))
    b.append(line_arrow(305, 162, 350, 162, "var(--err)", "hbArrErr"))
    return svg_wrap(780, 204, "Immediate Data và Pre-Erase", "\n".join(b))


def svg_ea_callback_vs_polling():
    b = [caption_text(390, 16, "Hai Cơ Chế Giao Tiếp Ea ↔ Eep: Callback Mode vs Polling Mode (EaPollingMode)")]
    # Callback lane
    b.append(box_ml(25, 42, 345, 136, ["", "", "", "", ""], fill="var(--bg2)", stroke="var(--ok)"))
    b.append(caption_text(197, 60, "EaPollingMode = FALSE (Callback Driven)", 10.5, "700", "var(--ok)"))
    b.append(box_ml(42, 74, 135, 40, ["Ea_MainFunction", "Gọi Eep_Write()"], stroke="var(--pri)"))
    b.append(box_ml(215, 74, 138, 40, ["Eep_MainFunction", "Xong -> Gọi Callback"], stroke="var(--ok)"))
    b.append(box_ml(42, 130, 311, 36, ["Ea_JobEndNotification() [0x10]", "-> Kích hoạt ngay NvM_JobEndNotification()"], stroke="var(--ok)"))
    b.append(line_arrow(177, 94, 215, 94, "var(--pri)", "hbArr"))
    b.append(line_arrow(284, 114, 284, 130, "var(--ok)", "hbArrOk"))

    # Polling lane
    b.append(box_ml(410, 42, 345, 136, ["", "", "", "", ""], fill="var(--bg2)", stroke="var(--warn)"))
    b.append(caption_text(582, 60, "EaPollingMode = TRUE (Polling Driven)", 10.5, "700", "var(--warn)"))
    b.append(box_ml(427, 74, 135, 40, ["Ea_MainFunction", "Gọi Eep_Write()"], stroke="var(--pri)"))
    b.append(box_ml(600, 74, 138, 40, ["Eep_MainFunction", "Chỉ cập nhật Flag nội"], stroke="var(--warn)"))
    b.append(box_ml(427, 130, 311, 36, ["Chu kỳ sau Ea hỏi: Eep_GetJobResult()", "Nếu MEMIF_JOB_OK -> Báo lên NvM"], stroke="var(--warn)"))
    b.append(line_arrow(562, 94, 600, 94, "var(--pri)", "hbArr"))
    b.append(line_arrow(669, 114, 669, 130, "var(--warn)", "hbArrWarn"))
    return svg_wrap(780, 198, "Callback vs Polling Mode", "\n".join(b))


# =========================================================================
# TOPIC 4: 5. So Sánh Chuyên Sâu: Ea vs Fee
# =========================================================================

def svg_ea_vs_fee_hw():
    b = [caption_text(390, 16, "So Sánh Phần Cứng & MCAL: Ea (EEPROM) vs Fee (Data Flash)")]
    b.append(box_ml(25, 42, 345, 148, ["", "", "", "", "", ""], fill="var(--bg2)", stroke="var(--ok)", stroke_w=2))
    b.append(caption_text(197, 62, "Đường 1: Ea + Eep (External EEPROM)", 11, "800", "var(--ok)"))
    b.append(box_ml(45, 76, 305, 44, ["Ea (ModuleId=40) → Eep Driver (90)", "Ghi / xóa từng Byte hoặc Page (4B/8B/16B)"], stroke="var(--pri)"))
    b.append(box_ml(45, 132, 305, 44, ["External SPI / I2C EEPROM", "Độ bền cao: 100,000 .. 1,000,000+ cycles"], stroke="var(--ok)"))

    b.append(box_ml(410, 42, 345, 148, ["", "", "", "", "", ""], fill="var(--bg2)", stroke="var(--cyan)", stroke_w=2))
    b.append(caption_text(582, 62, "Đường 2: Fee + Fls (Internal Data Flash)", 11, "800", "var(--cyan)"))
    b.append(box_ml(430, 76, 305, 44, ["Fee (ModuleId=21) → Fls Driver (92)", "Ghi Page nhưng XÓA THEO CẢ SECTOR (4KB-64KB)"], stroke="var(--pur)"))
    b.append(box_ml(430, 132, 305, 44, ["Internal MCU Data Flash", "Độ bền thấp hơn: 10k-100k cycles; dung lượng lớn"], stroke="var(--cyan)"))
    return svg_wrap(780, 208, "So sánh Ea vs Fee phần cứng", "\n".join(b))


def svg_ea_vs_fee_gc():
    b = [caption_text(390, 16, "Quản Lý Ô Nhớ: Ea Xoay Vòng Slot Cố Định vs Fee Append-Only + Garbage Collection")]
    b.append(box_ml(25, 44, 345, 136, ["", "", "", "", ""], fill="var(--bg2)", stroke="var(--ok)"))
    b.append(caption_text(197, 64, "Ea: Static Fixed-Slot Wear-Leveling", 10.5, "700", "var(--ok)"))
    b.append(box_ml(45, 78, 305, 40, ["Địa chỉ Slot tính tĩnh lúc cấu hình", "Ghi đè trực tiếp lên Slot kế (k % N)"], stroke="var(--ok)"))
    b.append(box_ml(45, 128, 305, 40, ["KHÔNG cần Garbage Collection (GC)", "Thời gian ghi ổn định, xác định (Deterministic)"], stroke="var(--pri)"))

    b.append(box_ml(410, 44, 345, 136, ["", "", "", "", ""], fill="var(--bg2)", stroke="var(--pur)"))
    b.append(caption_text(582, 64, "Fee: Append-Only Log + Sector Switch GC", 10.5, "700", "var(--pur)"))
    b.append(box_ml(430, 78, 305, 40, ["Ghi nối đuôi liên tục vào Virtual Sector", "Block cũ đánh dấu INVALID nằm rải rác"], stroke="var(--cyan)"))
    b.append(box_ml(430, 128, 305, 40, ["Khi Sector đầy -> Phải chạy GC Copy & Erase", "Gây trễ tức thời khi dọn Sector Flash"], stroke="var(--warn)"))
    return svg_wrap(780, 198, "Ea Fixed Slot vs Fee Garbage Collection", "\n".join(b))


def svg_ea_hybrid_dual_stack():
    b = [caption_text(390, 16, "Kiến Trúc Hybrid ECU Kết Hợp Ea + Fee Dưới Tầng MemIf")]
    b.append(box_ml(270, 34, 240, 42, ["NvM Manager", "Phân loại Block theo tần suất & kích thước"], stroke="var(--warn)"))
    b.append(box_ml(270, 96, 240, 40, ["MemIf Abstraction", "DeviceIndex 0 -> Ea | DeviceIndex 1 -> Fee"], stroke="var(--pri)"))
    b.append(box_ml(45, 162, 310, 56, ["DeviceIndex=0: Ea → Eep → Ext EEPROM", "Dùng cho Odometer, CrashData, IMM"], stroke="var(--ok)"))
    b.append(box_ml(425, 162, 310, 56, ["DeviceIndex=1: Fee → Fls → Int DFlash", "Dùng cho DTC Dem (>2KB), VIN, Calib lớn"], stroke="var(--cyan)"))

    b.append(line_arrow(390, 76, 390, 96, "var(--warn)", "hbArrWarn"))
    b.append(path_arrow("M330,136 L330,149 L200,149 L200,162", "var(--ok)", "hbArrOk"))
    b.append(path_arrow("M450,136 L450,149 L580,149 L580,162", "var(--cyan)", "hbArrCyan"))
    return svg_wrap(780, 234, "Kiến trúc Hybrid ECU Ea + Fee", "\n".join(b))


# =========================================================================
# TOPIC 5: 6. API R23-11, Lỗi DET & 36 ECUC
# =========================================================================

def svg_ea_api_catalog():
    b = [caption_text(390, 16, "Danh Mục API & Callback Chuẩn AUTOSAR Classic Ea R23-11 (ModuleId=40)")]
    b.append(box_ml(25, 42, 230, 146, [
        ("Quản Lý & Trạng Thái", 10.5, "700", "var(--pri)"),
        "0x00 Ea_Init(ConfigPtr)",
        "0x01 Ea_SetMode(Mode)",
        "0x05 Ea_GetStatus()",
        "0x06 Ea_GetJobResult()",
        "0x08 Ea_GetVersionInfo()"
    ], stroke="var(--pri)"))
    b.append(box_ml(275, 42, 230, 146, [
        ("Thao Tác Dữ Liệu Bất Đồng Bộ", 10.5, "700", "var(--ok)"),
        "0x02 Ea_Read(Blk, Off, Ptr, Len)",
        "0x03 Ea_Write(Blk, DataPtr)",
        "0x04 Ea_Cancel()",
        "0x07 Ea_InvalidateBlock(Blk)",
        "0x09 Ea_EraseImmediateBlock(Blk)"
    ], stroke="var(--ok)"))
    b.append(box_ml(525, 42, 230, 146, [
        ("Scheduled & Callback Eep", 10.5, "700", "var(--pur)"),
        "0x12 Ea_MainFunction()",
        "0x10 Ea_JobEndNotification()",
        "0x11 Ea_JobErrorNotification()",
        "Notification lên NvM:",
        "NvM_JobEnd / ErrorNotif"
    ], stroke="var(--pur)"))
    return svg_wrap(780, 204, "Danh mục API AUTOSAR Ea R23-11", "\n".join(b))


def svg_ea_det_runtime_guard():
    b = [caption_text(390, 16, "Chuỗi Kiểm Tra Bảo Vệ (DET & Runtime Error Guard) Đầu Hàm API")]
    guards = [
        ("1. Init Check", "EA_E_UNINIT (0x01)", "Chưa gọi Ea_Init()", "var(--err)"),
        ("2. Block Check", "EA_E_INVALID_BLOCK_NO (0x02)", "BlkNo sai / Không Imm", "var(--warn)"),
        ("3. Ptr & Ofs Check", "PTR (0x04) / OFS (0x03)", "NULL_PTR / Ofs / Len", "var(--err)"),
        ("4. Busy Guard", "EA_E_BUSY (0x06 Runtime)", "Module đang MEMIF_BUSY", "var(--warn)")
    ]
    for i, (t1, t2, t3, col) in enumerate(guards):
        b.append(box_ml(25 + i * 188, 44, 166, 62, [t1, t2, t3], stroke=col))
        if i < 3:
            b.append(line_arrow(191 + i * 188, 75, 213 + i * 188, 75, "var(--pri)", "hbArr"))

    b.append(box_ml(25, 134, 355, 50, ["Nếu bất kỳ điều kiện nào sai:", "-> Det_ReportError / Det_ReportRuntimeError()", "-> Trả ngay E_NOT_OK (KHÔNG xuống Eep)!"], stroke="var(--err)"))
    b.append(box_ml(410, 134, 345, 50, ["Nếu vượt qua cả 4 cổng kiểm tra:", "-> Set MEMIF_BUSY + MEMIF_JOB_PENDING", "-> Đưa Job vào Ea_MainFunction()!"], stroke="var(--ok)"))
    b.append(line_arrow(200, 106, 200, 134, "var(--err)", "hbArrErr"))
    b.append(line_arrow(585, 106, 585, 134, "var(--ok)", "hbArrOk"))
    return svg_wrap(780, 202, "DET và Runtime Error Guard", "\n".join(b))


def svg_ea_ecuc_containers():
    b = [caption_text(390, 16, "Bản Đồ 6 Nhóm Cấu Hình ECUC (36 Tham Số Trong Simulator)")]
    tabs = [
        ("Tab 0: EaGeneral (8)", "Init, DET, VersionInfo, Polling\nSetMode, VPSize, EaIndex, 5ms", "var(--pri)"),
        ("Tab 1: Callback & Mode (6)", "JobEnd/Error Notif Enabled & Name\nCurrentMode, BufferAlignment", "var(--cyan)"),
        ("Tab 2: Blk 1 & Dataset 2 (6)", "Blk1 (#1, 12B, IMM)\nBlk2 Dataset (#8 & #9, 8B)", "var(--ok)"),
        ("Tab 3: Wear & Crash Blk (6)", "Blk3 Wear (#3, 4B, 400k -> 4x)\nBlk4 Crash (#4, 16B, IMM)", "var(--ok)"),
        ("Tab 4: Published & Eep (5)", "EaBlockOverhead=4B, PageOH=0B\nEepCycles=100k, Base=0x0000, Chunk", "var(--pur)"),
        ("Tab 5: Fault Inject (5)", "PowerLossMidWrite, EepHwErr\nAutoVerify, StrictImm, NullPtr", "var(--err)")
    ]
    for i, (ttl, body, col) in enumerate(tabs):
        col_i = i % 3
        row_i = i // 3
        lines = [ttl] + body.split("\n")
        b.append(box_ml(25 + col_i * 250, 38 + row_i * 82, 232, 68, lines, stroke=col))
    return svg_wrap(780, 208, "Bản đồ 6 container cấu hình ECUC Ea", "\n".join(b))


DIAGRAM_BUILDERS = {
    "memstack_5layer": svg_ea_memstack_5layer,
    "memif_routing": svg_ea_memif_routing,
    "dual_registers": svg_ea_dual_registers,
    "blocknumber_formula": svg_ea_blocknumber_formula,
    "virtual_page_align": svg_ea_virtual_page_align,
    "wear_leveling_slots": svg_ea_wear_leveling_slots,
    "slot_anatomy": svg_ea_slot_anatomy,
    "atomic_powerloss": svg_ea_atomic_powerloss,
    "read_decision_tree": svg_ea_read_decision_tree,
    "state_machine": svg_ea_state_machine,
    "immediate_preerase": svg_ea_immediate_preerase,
    "callback_vs_polling": svg_ea_callback_vs_polling,
    "vs_fee_hw": svg_ea_vs_fee_hw,
    "vs_fee_gc": svg_ea_vs_fee_gc,
    "hybrid_dual_stack": svg_ea_hybrid_dual_stack,
    "api_catalog": svg_ea_api_catalog,
    "det_runtime_guard": svg_ea_det_runtime_guard,
    "ecuc_containers": svg_ea_ecuc_containers,
}
