# -*- coding: utf-8 -*-
"""Inline SVG diagram helpers and 24 topic-specific technical diagrams for AUTOSAR Fee Handbook."""

import html


def esc(txt):
    return html.escape(str(txt), quote=True)


def svg_wrap(w, h, body):
    return (
        f'<svg class="hb-svg" viewBox="0 0 {w} {h}" xmlns="http://www.w3.org/2000/svg">\n'
        f'  <defs>\n'
        f'    <marker id="hbArr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">\n'
        f'      <path d="M 0 1 L 8 5 L 0 9 z" fill="var(--hb-pri)"/>\n'
        f'    </marker>\n'
        f'    <marker id="hbArrOk" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">\n'
        f'      <path d="M 0 1 L 8 5 L 0 9 z" fill="var(--hb-ok)"/>\n'
        f'    </marker>\n'
        f'    <marker id="hbArrWarn" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">\n'
        f'      <path d="M 0 1 L 8 5 L 0 9 z" fill="var(--hb-warn)"/>\n'
        f'    </marker>\n'
        f'    <marker id="hbArrErr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">\n'
        f'      <path d="M 0 1 L 8 5 L 0 9 z" fill="var(--hb-err)"/>\n'
        f'    </marker>\n'
        f'  </defs>\n'
        f'  <rect x="0" y="0" width="{w}" height="{h}" rx="8" fill="var(--hb-bg)"/>\n'
        f'{body}\n'
        f'</svg>'
    )


def box_ml(x, y, w, h, lines, stroke="var(--hb-bdr)", fill="var(--hb-card)", title_color="var(--hb-txt)", rx=7):
    parts = [f'  <rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="1.6"/>']
    cx = x + w / 2
    n = len(lines)
    start_y = y + (h / 2) - ((n - 1) * 16) / 2 + 4
    for idx, line in enumerate(lines):
        ly = start_y + idx * 16
        fw = "700" if idx == 0 else "500"
        fs = "12" if idx == 0 else "10.5"
        col = title_color if idx == 0 else "var(--hb-mut)"
        parts.append(
            f'  <text x="{cx}" y="{ly:.1f}" text-anchor="middle" fill="{col}" font-size="{fs}" font-weight="{fw}">{esc(line)}</text>'
        )
    return "\n".join(parts)


def pill(x, y, w, h, text, stroke="var(--hb-pri)", fill="var(--hb-card2)", color="var(--hb-pri)"):
    cx = x + w / 2
    cy = y + h / 2 + 3.5
    return (
        f'  <rect x="{x}" y="{y}" width="{w}" height="{h}" rx="10" fill="{fill}" stroke="{stroke}" stroke-width="1.2"/>\n'
        f'  <text x="{cx}" y="{cy:.1f}" text-anchor="middle" fill="{color}" font-size="10" font-weight="700">{esc(text)}</text>'
    )


def arrow(x1, y1, x2, y2, stroke="var(--hb-pri)", marker="hbArr", dashed=False):
    dash = ' stroke-dasharray="5,4"' if dashed else ""
    return f'  <line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{stroke}" stroke-width="1.8"{dash} marker-end="url(#{marker})"/>'


def path_arrow(d, stroke="var(--hb-pri)", marker="hbArr", dashed=False):
    dash = ' stroke-dasharray="5,4"' if dashed else ""
    return f'  <path d="{d}" fill="none" stroke="{stroke}" stroke-width="1.8"{dash} marker-end="url(#{marker})"/>'


def heading(x, y, text, color="var(--hb-pri)"):
    return f'  <text x="{x}" y="{y}" fill="{color}" font-size="13" font-weight="800">{esc(text)}</text>'


def label(x, y, text, color="var(--hb-mut)", size=10.5, anchor="start", weight="600"):
    return f'  <text x="{x}" y="{y}" text-anchor="{anchor}" fill="{color}" font-size="{size}" font-weight="{weight}">{esc(text)}</text>'


# ============================================================================
# 24 TOPIC DIAGRAMS (keyed by "mainIdx-subIdx")
# ============================================================================
def get_fee_diagram(key):
    if key == "0-0":
        body = "\n".join([
            heading(20, 26, "So Sánh EEPROM Vật Lý vs Data Flash + Fee Emulation"),
            box_ml(20, 44, 390, 80, ["External/Byte EEPROM (Ea)", "Xóa & ghi theo từng Byte (1B)", "Chi phí silicon cao, tốc độ chậm"], stroke="var(--hb-warn)"),
            box_ml(470, 44, 390, 80, ["MCU Internal Data Flash + Fee", "Nạp 1->0 theo Page (8B), chỉ Erase cả Sector!", "Rẻ, tích hợp sẵn, cần Wear Leveling"], stroke="var(--hb-ok)"),
            box_ml(20, 148, 840, 68, [
                "Chiến lược Fee (Flash EEPROM Emulation):",
                "Append-Only bản mới sang vùng 0xFF -> Đánh dấu bản cũ SUPERSEDED -> Thu hồi rác 2-Bank Garbage Collection"
            ], stroke="var(--hb-pri)", fill="var(--hb-card2)", title_color="var(--hb-pri)")
        ])
        return svg_wrap(880, 234, body)

    if key == "0-1":
        body = "\n".join([
            heading(20, 26, "Luồng Giao Tiếp Chuẩn Trên AUTOSAR Memory Stack"),
            box_ml(20, 48, 130, 56, ["SWC (App)", "NvM User Ports"], stroke="var(--hb-acc)"),
            box_ml(185, 48, 130, 56, ["RTE", "C/S Dispatch"], stroke="var(--hb-acc)"),
            box_ml(350, 48, 140, 56, ["NvM (Service)", "Queue + RAM Mirror"], stroke="var(--hb-pri)"),
            box_ml(525, 48, 140, 56, ["MemIf (Dev=0)", "Thin Route -> Fee"], stroke="var(--hb-cyan)"),
            box_ml(700, 48, 160, 56, ["Fee (ECU Ab)", "LUT + GC + Header"], stroke="var(--hb-ok)", title_color="var(--hb-ok)"),
            arrow(150, 76, 185, 76),
            arrow(315, 76, 350, 76),
            arrow(490, 76, 525, 76),
            arrow(665, 76, 700, 76),
            box_ml(700, 142, 160, 56, ["Fls / MemAcc", "HW Chunk Transfer"], stroke="var(--hb-warn)"),
            box_ml(350, 142, 310, 56, ["Callback Path (Async)", "Fee_JobEndNotification() -> NvM -> SWC"], stroke="var(--hb-ok)", fill="var(--hb-card2)"),
            arrow(780, 104, 780, 142, stroke="var(--hb-warn)", marker="hbArrWarn"),
            path_arrow("M 700 170 L 660 170", stroke="var(--hb-ok)", marker="hbArrOk", dashed=True),
            path_arrow("M 420 142 L 420 104", stroke="var(--hb-ok)", marker="hbArrOk", dashed=True)
        ])
        return svg_wrap(880, 218, body)

    if key == "0-2":
        body = "\n".join([
            heading(20, 26, "So Sánh Tầng Dưới: AUTOSAR R20-11 (Classic Fls) vs R23-11 (MemAcc)"),
            box_ml(20, 46, 405, 160, [
                "AUTOSAR R20-11 / R4.x (Classic Fls)",
                "Fee gọi trực tiếp Fls_Write() / Fls_Read() / Fls_Erase()",
                "Ràng buộc cứng 1 Fee -> 1 Fls Driver đơn lẻ",
                "Khó chia sẻ Bus Flash giữa Core hoặc FOTA"
            ], stroke="var(--hb-cyan)"),
            box_ml(455, 46, 405, 160, [
                "AUTOSAR R23-11 (Memory Access - MemAcc)",
                "Fee gọi MemAcc_Write() / MemAcc_Read() / MemAcc_Erase()",
                "MemAcc quản lý AddressAreaId & Bus Arbitration",
                "Cho phép nhiều User/Fee dùng chung Flash an toàn"
            ], stroke="var(--hb-pur)", title_color="var(--hb-pur)"),
            pill(360, 220, 160, 24, "Đổi trực tiếp trên Tab 5!", stroke="var(--hb-pri)")
        ])
        return svg_wrap(880, 256, body)

    if key == "0-3":
        body = "\n".join([
            heading(20, 26, "Chuỗi Sinh Mã Cấu Hình AUTOSAR ECUC Cho Module Fee"),
            box_ml(20, 52, 200, 64, ["Fee_EcucValues.arxml", "ECUC Parameters (36)"], stroke="var(--hb-pri)"),
            box_ml(280, 52, 210, 64, ["BSW Configurator Tool", "Validate Alignment & Threshold"], stroke="var(--hb-cyan)"),
            box_ml(560, 42, 300, 42, ["Fee_Cfg.h (Pre-Compile)", "#define FEE_VIRTUAL_PAGE_SIZE 8U"], stroke="var(--hb-ok)"),
            box_ml(560, 96, 300, 42, ["Fee_Lcfg.c (Link-Time)", "Fee_BlockConfig[] & SectorConfig[]"], stroke="var(--hb-warn)"),
            arrow(220, 84, 280, 84),
            path_arrow("M 490 74 L 560 63", stroke="var(--hb-ok)", marker="hbArrOk"),
            path_arrow("M 490 94 L 560 117", stroke="var(--hb-warn)", marker="hbArrWarn")
        ])
        return svg_wrap(880, 160, body)

    if key == "1-0":
        body = "\n".join([
            heading(20, 26, "Giải Phẫu 1 Instance Slot Trên Data Flash (VP = 8 Bytes)"),
            box_ml(20, 56, 210, 74, ["VP 0: Block Header (8B)", "BlockNo | RawLen | Seq | CRC"], stroke="var(--hb-pri)", fill="var(--hb-card2)", title_color="var(--hb-pri)"),
            box_ml(234, 56, 310, 74, ["VP 1..N: Raw Payload Data (14B)", "Dữ liệu thực do NvM truyền xuống"], stroke="var(--hb-ok)", fill="var(--hb-card2)", title_color="var(--hb-ok)"),
            box_ml(548, 56, 150, 74, ["Padding (2B)", "Đệm 0xFF tròn 16B"], stroke="var(--hb-warn)", title_color="var(--hb-warn)"),
            box_ml(702, 56, 158, 74, ["Valid Trailer", "0xA5A5 Atomic Commit"], stroke="var(--hb-pur)", title_color="var(--hb-pur)"),
            label(440, 156, "Tổng kích thước trên Flash = AlignUp(Hdr, VP) + AlignUp(Payload, VP) = 8 + 16 = 24 Bytes", anchor="middle", color="var(--hb-txt)", size=11.5)
        ])
        return svg_wrap(880, 180, body)

    if key == "1-1":
        body = "\n".join([
            heading(20, 26, "Mã Hóa Dataset BlockNumber & Tăng Tốc O(1) Với RAM LUT"),
            box_ml(20, 50, 380, 86, [
                "Công thức BlockNumber (16-bit):",
                "FeeBlockNumber = (BaseId << DatasetBits) | DatasetIdx",
                "VD: Base=0x08 (2 bits) -> DS0=0x0020, DS1=0x0021"
            ], stroke="var(--hb-cyan)"),
            box_ml(460, 50, 400, 86, [
                "RAM LUT Cache (Fee_BlockLutCache[]):",
                "Map trực tiếp 0x0020 -> {Bank 0, Offset +0x40, Seq #5}",
                "Fee_Read() tìm ra vị trí sau đúng 1 nhịp (O(1))!"
            ], stroke="var(--hb-ok)"),
            arrow(400, 93, 460, 93, stroke="var(--hb-ok)", marker="hbArrOk"),
            label(440, 162, "Nếu tắt FeeEnableRamLutCache -> Fee phải quét tuyến tự toàn bộ Bank O(N) khi đọc.", anchor="middle", color="var(--hb-warn)")
        ])
        return svg_wrap(880, 184, body)

    if key == "1-2":
        body = "\n".join([
            heading(20, 26, "Quy Trình Ghi Bất Đồng Bộ 3 Pha Trong Fee_MainFunction()"),
            box_ml(20, 52, 185, 66, ["Tick 1: Phase 1", "Ghi Header (8B)", "Bit HDR_WRITTEN = 1"], stroke="var(--hb-pri)"),
            box_ml(245, 52, 220, 66, ["Tick 2..K: Phase 2", "Ghi Payload + Padding", "Theo FlsBytesPerCycle"], stroke="var(--hb-cyan)"),
            box_ml(505, 52, 175, 66, ["Cuối Tick: Phase 3", "Ghi Trailer 0xA5A5", "Khẳng định toàn vẹn"], stroke="var(--hb-ok)"),
            box_ml(720, 52, 140, 66, ["Hoàn Tất", "Cập nhật RAM LUT", "JobEndNotification()"], stroke="var(--hb-pur)"),
            arrow(205, 85, 245, 85),
            arrow(465, 85, 505, 85, stroke="var(--hb-ok)", marker="hbArrOk"),
            arrow(680, 85, 720, 85, stroke="var(--hb-ok)", marker="hbArrOk"),
            label(440, 144, "Mất điện trước khi Phase 3 xong -> Trailer rỗng -> Block tự bị đánh dấu INCONSISTENT (Torn Write).", anchor="middle", color="var(--hb-err)")
        ])
        return svg_wrap(880, 166, body)

    if key == "1-3":
        body = "\n".join([
            heading(20, 26, "Partial Read (BlockOffset + Length) Trên DFlash"),
            box_ml(40, 48, 800, 46, ["Full Slot Trên Flash: [Hdr 8B @ 0x40] | [Bytes 0..7] | [Bytes 8..11 Target] | [Bytes 12..23]"], stroke="var(--hb-bdr)"),
            box_ml(330, 114, 280, 56, ["Fee_Read(0x0020, Ofs=8, Len=4)", "PhysicalAddr = 0x40 + HdrSize(8) + 8 = 0x50"], stroke="var(--hb-ok)", fill="var(--hb-card2)"),
            arrow(470, 94, 470, 114, stroke="var(--hb-ok)", marker="hbArrOk")
        ])
        return svg_wrap(880, 188, body)

    if key == "2-0":
        body = "\n".join([
            heading(20, 26, "Wear Leveling: Append-Only Không Xóa Tại Chỗ"),
            box_ml(20, 52, 240, 66, ["0x0010 Seq #1 @ +0x00", "Trạng thái: SUPERSEDED", "Bị bỏ qua khi GC"], stroke="var(--hb-mut)", fill="var(--hb-card2)"),
            box_ml(290, 52, 240, 66, ["0x0010 Seq #2 @ +0x18", "Trạng thái: SUPERSEDED", "Bị bỏ qua khi GC"], stroke="var(--hb-mut)", fill="var(--hb-card2)"),
            box_ml(560, 52, 290, 66, ["0x0010 Seq #3 @ +0x30", "Trạng thái: VALID (RAM LUT trỏ tới đây)", "Giữ lại khi GC"], stroke="var(--hb-ok)"),
            arrow(260, 85, 290, 85),
            arrow(530, 85, 560, 85, stroke="var(--hb-ok)", marker="hbArrOk"),
            label(440, 144, "Vì Flash chỉ nạp 1->0, ghi bản mới luôn dịch sang phải để tránh Fls_Erase() liên tục làm mòn 1 ô nhớ.", anchor="middle")
        ])
        return svg_wrap(880, 166, body)

    if key == "2-1":
        body = "\n".join([
            heading(20, 26, "Quy Trình 4 Pha Của Garbage Collection (Sector Switch)"),
            box_ml(20, 52, 185, 74, ["1. Đạt Ngưỡng 75%", "Bank 0 đầy rác + VALID", "Bank 1 đang Erased"], stroke="var(--hb-warn)"),
            box_ml(235, 52, 195, 74, ["2. Copy VALID Only", "Chép bản mới nhất -> Bank 1", "Bỏ hết SUPERSEDED"], stroke="var(--hb-cyan)"),
            box_ml(460, 52, 185, 74, ["3. Sector Switch", "Bank 1 -> ACTIVE BANK", "Cập nhật RAM LUT"], stroke="var(--hb-ok)"),
            box_ml(675, 52, 185, 74, ["4. Fls_Erase(Bank 0)", "Đưa Bank 0 về 0xFF", "EraseCount++"], stroke="var(--hb-pur)"),
            arrow(205, 89, 235, 89, stroke="var(--hb-warn)", marker="hbArrWarn"),
            arrow(430, 89, 460, 89, stroke="var(--hb-ok)", marker="hbArrOk"),
            arrow(645, 89, 675, 89)
        ])
        return svg_wrap(880, 152, body)

    if key == "2-2":
        body = "\n".join([
            heading(20, 26, "Kiến Trúc Reserved Immediate Zone & Preemption [SWS_Fee_00060]"),
            box_ml(20, 50, 540, 68, ["Standard Data Region (0 .. Threshold 75% = 192B)", "Chứa Blk#1, Blk#2, Blk#4. Đầy -> Bắt buộc chạy GC"], stroke="var(--hb-pri)"),
            box_ml(570, 50, 290, 68, ["Reserved Immediate Zone (64B)", "Chỉ Blk#3_Crash (Immediate=TRUE) được ghi!"], stroke="var(--hb-warn)", title_color="var(--hb-warn)"),
            box_ml(220, 144, 440, 56, ["Immediate Preemption Flow:", "Tạm hoãn GC (pausedByImmediate) -> Ghi Crash Data -> Tiếp tục GC"], stroke="var(--hb-err)", fill="var(--hb-card2)"),
            arrow(715, 118, 660, 144, stroke="var(--hb-err)", marker="hbArrErr")
        ])
        return svg_wrap(880, 220, body)

    if key == "2-3":
        body = "\n".join([
            heading(20, 26, "Background GC (MEMIF_BUSY_INTERNAL) vs Foreground Urgent GC"),
            box_ml(20, 48, 405, 90, [
                "Background GC (FeeEnableBackgroundGc = TRUE)",
                "Tự dọn rác êm ái từng chunk nhỏ trong MainFunction",
                "Immediate Block có thể xen ngang bất kỳ lúc nào"
            ], stroke="var(--hb-cyan)"),
            box_ml(455, 48, 405, 90, [
                "Foreground / Urgent GC",
                "Standard Write tới khi bank đã kín ngưỡng -> Phải chờ",
                "Độ trễ User Write cộng thêm thời gian Copy + Erase"
            ], stroke="var(--hb-warn)")
        ])
        return svg_wrap(880, 158, body)

    if key == "3-0":
        body = "\n".join([
            heading(20, 26, "Cơ Chế Chống Mất Dữ Liệu Khi Mất Điện Đột Ngột (Torn Write)"),
            box_ml(20, 50, 230, 74, ["Seq #1 (An Toàn)", "Hdr + Data + Trailer 0xA5A5", "Trạng thái: VALID CŨ"], stroke="var(--hb-ok)"),
            box_ml(295, 50, 260, 74, ["Seq #2 (Mất Điện Giữa Chừng!)", "Hdr + Nửa Data | KHÔNG CÓ TRAILER", "Trạng thái: INCONSISTENT"], stroke="var(--hb-err)"),
            box_ml(600, 50, 260, 74, ["Fee_Init() Startup Fallback", "Bỏ qua Seq #2 -> Khôi phục Seq #1", "NvM giữ nguyên dữ liệu cũ an toàn"], stroke="var(--hb-pri)"),
            arrow(250, 87, 295, 87, stroke="var(--hb-err)", marker="hbArrErr"),
            arrow(555, 87, 600, 87, stroke="var(--hb-ok)", marker="hbArrOk")
        ])
        return svg_wrap(880, 148, body)

    if key == "3-1":
        body = "\n".join([
            heading(20, 26, "Xóa Mềm Bằng Fee_InvalidateBlock() & Cách NvM Ứng Xử"),
            box_ml(20, 50, 240, 68, ["1. Fee_InvalidateBlock(0x0010)", "Append slot mang Invalidation Marker"], stroke="var(--hb-pur)"),
            box_ml(310, 50, 250, 68, ["2. Fee_Read(0x0010)", "Trả kết quả MEMIF_BLOCK_INVALID"], stroke="var(--hb-warn)"),
            box_ml(610, 50, 250, 68, ["3. NvM Xử Lý Callback", "Nạp ROM Default / Báo Invalid lên App"], stroke="var(--hb-ok)"),
            arrow(260, 84, 310, 84),
            arrow(560, 84, 610, 84, stroke="var(--hb-warn)", marker="hbArrWarn")
        ])
        return svg_wrap(880, 142, body)

    if key == "3-2":
        body = "\n".join([
            heading(20, 26, "Hàng Rào Kiểm Lỗi Phát Triển DET (Module ID = 21)"),
            box_ml(20, 48, 195, 62, ["FEE_E_UNINIT (0x01)", "Gọi API khi chưa Fee_Init"], stroke="var(--hb-err)"),
            box_ml(235, 48, 200, 62, ["FEE_E_INVALID_BLOCK_NO", "ID = 0x0000 / 0xFFFF"], stroke="var(--hb-err)"),
            box_ml(455, 48, 195, 62, ["FEE_E_INVALID_OFS/LEN", "Vượt ngoài FeeBlockSize"], stroke="var(--hb-warn)"),
            box_ml(670, 48, 190, 62, ["FEE_E_BUSY / CANCEL", "Gửi trùng khi đang bận"], stroke="var(--hb-warn)"),
            label(440, 134, "Mọi lỗi DET được đẩy tới Det_ReportError(ModuleId=21, InstanceId=0, ApiId, ErrorId) khi FeeDevErrorDetect=TRUE.", anchor="middle")
        ])
        return svg_wrap(880, 156, body)

    if key == "3-3":
        body = "\n".join([
            heading(20, 26, "Luồng Lan Truyền Lỗi Phần Cứng DFlash Tới DEM"),
            box_ml(20, 50, 240, 68, ["DFlash Silicon Fault", "ECC Double-Bit / Write Verify / Erase Fail"], stroke="var(--hb-err)"),
            box_ml(315, 50, 230, 68, ["Fls / MemAcc Driver", "Trả MEMIF_JOB_FAILED về Fee"], stroke="var(--hb-warn)"),
            box_ml(600, 50, 260, 68, ["Fee -> Dem_SetEventStatus()", "Lưu DTC & chuyển Sector -> CORRUPT"], stroke="var(--hb-err)", title_color="var(--hb-err)"),
            arrow(260, 84, 315, 84, stroke="var(--hb-err)", marker="hbArrErr"),
            arrow(545, 84, 600, 84, stroke="var(--hb-err)", marker="hbArrErr")
        ])
        return svg_wrap(880, 142, body)

    if key == "4-0":
        body = "\n".join([
            heading(20, 26, "Fee Module & Async Job State Machine"),
            box_ml(20, 56, 150, 60, ["MEMIF_UNINIT", "Reset State"], stroke="var(--hb-err)"),
            box_ml(220, 56, 165, 60, ["MEMIF_IDLE", "Sẵn sàng nhận lệnh"], stroke="var(--hb-ok)"),
            box_ml(450, 40, 200, 52, ["MEMIF_BUSY", "Write / Read / Invalidate"], stroke="var(--hb-pri)"),
            box_ml(450, 110, 200, 52, ["MEMIF_BUSY_INTERNAL", "Background Garbage Collect"], stroke="var(--hb-warn)"),
            box_ml(700, 56, 160, 60, ["JOB RESULT", "OK / CANCELED / FAIL"], stroke="var(--hb-pur)"),
            arrow(170, 86, 220, 86, stroke="var(--hb-ok)", marker="hbArrOk"),
            arrow(385, 76, 450, 66),
            arrow(385, 96, 450, 134, stroke="var(--hb-warn)", marker="hbArrWarn"),
            arrow(650, 66, 700, 82, stroke="var(--hb-ok)", marker="hbArrOk"),
            arrow(650, 134, 700, 96, stroke="var(--hb-warn)", marker="hbArrWarn")
        ])
        return svg_wrap(880, 184, body)

    if key == "4-1":
        body = "\n".join([
            heading(20, 26, "Flash Sector & Block Lifecycle State Machine"),
            box_ml(20, 54, 180, 64, ["BANK_ACTIVE", "Append Standard Blocks"], stroke="var(--hb-ok)"),
            box_ml(245, 54, 190, 64, ["GC_COPY_VALID", "Sao chép sang Standby"], stroke="var(--hb-warn)"),
            box_ml(480, 54, 185, 64, ["GC_ERASE_OLD", "Fls_Erase -> Standby"], stroke="var(--hb-pri)"),
            box_ml(705, 54, 155, 64, ["IMMEDIATE ZONE", "Preempt khẩn cấp"], stroke="var(--hb-pur)"),
            arrow(200, 86, 245, 86, stroke="var(--hb-warn)", marker="hbArrWarn"),
            arrow(435, 86, 480, 86),
            path_arrow("M 340 118 L 340 148 L 782 148 L 782 118", stroke="var(--hb-pur)", marker="hbArrWarn", dashed=True)
        ])
        return svg_wrap(880, 174, body)

    if key == "4-2":
        bits = [
            ("B7", "FEE_INIT", "var(--hb-ok)"),
            ("B6", "FEE_BUSY", "var(--hb-cyan)"),
            ("B5", "BUSY_INT", "var(--hb-warn)"),
            ("B4", "FAST_MODE", "var(--hb-pur)"),
            ("B3", "GC_ACT", "var(--hb-warn)"),
            ("B2", "IMM_PRE", "var(--hb-warn)"),
            ("B1", "JOB_ERR", "var(--hb-err)"),
            ("B0", "JOB_OK", "var(--hb-ok)")
        ]
        cells = [heading(20, 26, "Bản Đồ 8-Bit Thanh A: Fee_ModuleControlByte (MSB B7 -> LSB B0)")]
        for i, (b, nm, col) in enumerate(bits):
            x = 20 + i * 105
            cells.append(box_ml(x, 48, 98, 66, [b, nm, f"0x{1<<(7-i):02X}"], stroke=col, title_color=col))
        return svg_wrap(880, 134, "\n".join(cells))

    if key == "4-3":
        bits = [
            ("B7", "HDR_WRT", "var(--hb-ok)"),
            ("B6", "DATA_ALN", "var(--hb-ok)"),
            ("B5", "TRLR_OK", "var(--hb-ok)"),
            ("B4", "IMM_BLK", "var(--hb-warn)"),
            ("B3", "LUT_CCH", "var(--hb-cyan)"),
            ("B2", "SUPERSD", "var(--hb-mut)"),
            ("B1", "INVALID", "var(--hb-pur)"),
            ("B0", "INCONST", "var(--hb-err)")
        ]
        cells = [heading(20, 26, "Bản Đồ 8-Bit Thanh B: Fee_BlockHeaderStatusByte (MSB B7 -> LSB B0)")]
        for i, (b, nm, col) in enumerate(bits):
            x = 20 + i * 105
            cells.append(box_ml(x, 48, 98, 66, [b, nm, f"0x{1<<(7-i):02X}"], stroke=col, title_color=col))
        return svg_wrap(880, 134, "\n".join(cells))

    if key == "5-0":
        body = "\n".join([
            heading(20, 26, "Bản Đồ Các Nhóm Hàm AUTOSAR Chuẩn Module Fee"),
            box_ml(20, 48, 260, 110, ["Init & Control", "Fee_Init(&Fee_Config)", "Fee_SetMode(Mode)", "Fee_Cancel()"], stroke="var(--hb-pri)"),
            box_ml(310, 48, 260, 110, ["Async Flash Jobs", "Fee_Read(Blk, Ofs, Buf, Len)", "Fee_Write(Blk, DataPtr)", "Fee_InvalidateBlock(Blk)", "Fee_EraseImmediateBlock(Blk)"], stroke="var(--hb-ok)"),
            box_ml(600, 48, 260, 110, ["Polling & Callbacks", "Fee_GetStatus() / GetJobResult()", "Fee_MainFunction() (5ms)", "Fee_JobEndNotification()"], stroke="var(--hb-warn)")
        ])
        return svg_wrap(880, 178, body)

    if key == "5-1":
        body = "\n".join([
            heading(20, 26, "Hiệu Năng Tốc Độ Ghi: MEMIF_MODE_SLOW vs MEMIF_MODE_FAST (Block 32B)"),
            box_ml(20, 50, 840, 48, ["SLOW MODE (8 B/tick): [Hdr 8B] -> [Data 8B] -> [Data 8B] -> [Data+Trailer]  ==>  4 Ticks = 20 ms"], stroke="var(--hb-cyan)"),
            box_ml(20, 112, 340, 48, ["FAST MODE (64 B/tick): [Toàn bộ 32B] => 1 Tick = 5 ms!"], stroke="var(--hb-pur)", title_color="var(--hb-pur)"),
            label(380, 140, "Nhanh gấp 4x — Lý tưởng cho EcuM Shutdown / NvM_WriteAll()", color="var(--hb-ok)")
        ])
        return svg_wrap(880, 178, body)

    if key == "5-2":
        body = "\n".join([
            heading(20, 26, "Công Thức Sizing Dung Lượng Sector & Tuổi Thọ Wear Leveling"),
            box_ml(20, 48, 840, 96, [
                "Tổng Số Ghi Suốt Đời ECU = Sum(Block_i_Size_Aligned * Block_i_WriteCycles)",
                "Hệ Số Khuếch Đại GC (Write Amplification) ~ 1.3x .. 2.0x tùy Threshold %",
                "Số Chu Kỳ Xóa Thực Tế / Bank = (Tổng Bytes Ghi) / (BankSize - ValidRetentionBytes)"
            ], stroke="var(--hb-pri)", fill="var(--hb-card2)")
        ])
        return svg_wrap(880, 162, body)

    # 5-3 fallback
    body = "\n".join([
        heading(20, 26, "Checklist Kiểm Thử Thực Chiến Module Fee Trước Khi Release ECU"),
        box_ml(20, 48, 265, 96, ["1. Boundary & Alignment", "Test Block lẻ byte (14B, 17B)", "Kiểm tra Padding đúng 0xFF"], stroke="var(--hb-pri)"),
        box_ml(307, 48, 265, 96, ["2. Power-Loss Testbench", "Ngắt nguồn tại Phase 1/2/GC", "Verify Recovery Fallback OK"], stroke="var(--hb-err)"),
        box_ml(595, 48, 265, 96, ["3. Shutdown Budget", "Đo thời gian NvM_WriteAll", "Đảm bảo đã gọi FAST MODE"], stroke="var(--hb-ok)")
    ])
    return svg_wrap(880, 164, body)
