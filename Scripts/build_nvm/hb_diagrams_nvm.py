# -*- coding: utf-8 -*-
"""18 theme-aware inline SVG technical diagrams for AUTOSAR NvM Handbook (3 per main tab 0..5)."""
import html

P = {
    "bg": "var(--hb-bg)",
    "box": "var(--hb-box)",
    "box2": "var(--hb-box2)",
    "pri": "var(--hb-pri)",
    "pri_bg": "var(--hb-pri-bg)",
    "ok": "var(--hb-ok)",
    "ok_bg": "var(--hb-ok-bg)",
    "warn": "var(--hb-warn)",
    "warn_bg": "var(--hb-warn-bg)",
    "err": "var(--hb-err)",
    "err_bg": "var(--hb-err-bg)",
    "pur": "var(--hb-pur)",
    "pur_bg": "var(--hb-pur-bg)",
    "cyan": "var(--hb-cyan)",
    "cyan_bg": "var(--hb-cyan-bg)",
    "txt": "var(--hb-txt)",
    "mut": "var(--hb-mut)",
    "bdr": "var(--hb-bdr)",
    "arr": "var(--hb-arr)",
}


def svg_wrap(w, h, body):
    return (
        f'<svg class="hb-svg" viewBox="0 0 {w} {h}" xmlns="http://www.w3.org/2000/svg">\n'
        f'<defs>\n'
        f'  <marker id="hbArr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">\n'
        f'    <path d="M 0 1 L 10 5 L 0 9 z" fill="{P["arr"]}"/>\n'
        f'  </marker>\n'
        f'  <marker id="hbArrOk" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">\n'
        f'    <path d="M 0 1 L 10 5 L 0 9 z" fill="{P["ok"]}"/>\n'
        f'  </marker>\n'
        f'  <marker id="hbArrWarn" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">\n'
        f'    <path d="M 0 1 L 10 5 L 0 9 z" fill="{P["warn"]}"/>\n'
        f'  </marker>\n'
        f'  <marker id="hbArrErr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">\n'
        f'    <path d="M 0 1 L 10 5 L 0 9 z" fill="{P["err"]}"/>\n'
        f'  </marker>\n'
        f'</defs>\n'
        f'<rect x="0" y="0" width="{w}" height="{h}" rx="10" fill="{P["bg"]}"/>\n'
        f'{body}\n'
        f'</svg>'
    )


def box_ml(x, y, w, h, title, lines=None, stroke=None, fill=None, tcolor=None, rx=8):
    stroke = stroke or P["bdr"]
    fill = fill or P["box"]
    tcolor = tcolor or P["txt"]
    lines = lines or []
    parts = [f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="1.6"/>']
    cx = x + w / 2
    ty = y + 20 if lines else (y + h / 2 + 4)
    parts.append(f'<text x="{cx:.1f}" y="{ty:.1f}" data-box-w="{w}" text-anchor="middle" fill="{tcolor}" font-size="12" font-weight="800">{html.escape(title)}</text>')
    for idx, ln in enumerate(lines):
        ly = ty + 17 + idx * 14
        parts.append(f'<text x="{cx:.1f}" y="{ly:.1f}" data-box-w="{w}" text-anchor="middle" fill="{P["mut"]}" font-size="10.5">{html.escape(ln)}</text>')
    return "\n".join(parts)


def pill_label(cx, cy, text, color=None, bg=None):
    color = color or P["pri"]
    bg = bg or P["bg"]
    w = max(56, len(text) * 6.5 + 14)
    h = 18
    px = cx - w / 2
    py = cy - h / 2
    return (
        f'<g data-px="{px:.1f}" data-py="{py:.1f}" data-pw="{w:.1f}" data-ph="{h}">'
        f'<rect x="{px:.1f}" y="{py:.1f}" width="{w:.1f}" height="{h}" rx="9" fill="{bg}" stroke="{color}" stroke-width="1.2"/>'
        f'<text x="{cx:.1f}" y="{cy + 3.5:.1f}" text-anchor="middle" fill="{color}" font-size="10" font-weight="700">{html.escape(text)}</text>'
        f'</g>'
    )


def line_arrow(x1, y1, x2, y2, color=None, marker="hbArr", dashed=False):
    color = color or P["arr"]
    dash = ' stroke-dasharray="5,3"' if dashed else ""
    return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="1.8"{dash} marker-end="url(#{marker})"/>'


def path_arrow(d, color=None, marker="hbArr", dashed=False):
    color = color or P["arr"]
    dash = ' stroke-dasharray="5,3"' if dashed else ""
    return f'<path d="{d}" fill="none" stroke="{color}" stroke-width="1.8"{dash} marker-end="url(#{marker})"/>'


# ==================== TAB 0: STACK & BLOCK ANATOMY ====================
SVG_N0_0 = svg_wrap(960, 320, "\n".join([
    box_ml(40, 18, 250, 58, "SWC Application / Calib", ["NvM_ReadBlock / WriteBlock", "SetRamBlockStatus / PRAM"], P["pri"], P["pri_bg"], P["pri"]),
    box_ml(355, 18, 250, 58, "BswM & EcuM Lifecycle", ["NvM_Init / ReadAll / WriteAll", "CurrentJobMode Notification"], P["ok"], P["ok_bg"], P["ok"]),
    box_ml(670, 18, 250, 58, "Dcm & Dem Services", ["Factory Reset / Diag Write", "Dem_SetEventStatus(NVM_E_*)"], P["warn"], P["warn_bg"], P["warn"]),

    box_ml(210, 114, 540, 62, "NvM (NVRAM Manager — SWS_NvM R23-11)", ["Immediate Queue (Prio=0) & Standard Queue (Prio=1..255) · CRC-8/16/32 · Explicit Mirror"], P["pri"], P["box2"], P["pri"]),
    line_arrow(165, 76, 300, 114, P["pri"]),
    line_arrow(480, 76, 480, 114, P["ok"], "hbArrOk"),
    line_arrow(795, 76, 660, 114, P["warn"], "hbArrWarn"),

    box_ml(290, 206, 380, 44, "MemIf (Memory Abstraction Interface)", ["Route DeviceIndex: 0 -> Fee | 1 -> Ea | MemIf_Cancel()"], P["pur"], P["pur_bg"], P["pur"]),
    line_arrow(480, 176, 480, 206, P["pri"]),

    box_ml(120, 266, 320, 42, "Fee -> Fls (DFlash Emulation)", ["Wear Leveling & Dynamic Virtual Block"], P["cyan"], P["cyan_bg"], P["cyan"]),
    box_ml(520, 266, 320, 42, "Ea -> Eep (EEPROM Abstraction)", ["Byte/Page EEPROM Driver & Mapping"], P["warn"], P["warn_bg"], P["warn"]),
    line_arrow(390, 250, 290, 266, P["cyan"]),
    line_arrow(570, 250, 670, 266, P["warn"], "hbArrWarn"),
]))

SVG_N0_1 = svg_wrap(960, 290, "\n".join([
    box_ml(30, 34, 240, 210, "1. RAM Block / Mirror", ["Permanent RAM (Global)", "Hoặc NvM Mirror (Explicit)", "Chứa dữ liệu Payload thuần", "Cờ Admin: VALID & CHANGED", "NvM_SetRamBlockStatus()"], P["pri"], P["pri_bg"], P["pri"]),
    box_ml(345, 22, 270, 234, "2. NV Block (Flash / Fee)", ["[Header] Static Block ID (2B)", "[Data] NvMNvBlockLength (N Bytes)", "[Trailer] CRC-8 / 16 / 32", "NATIVE: 1 Copy (NV #0)", "REDUNDANT: 2 Copies (#0 + #1)", "DATASET: M NV Slots (0..M-1)"], P["warn"], P["warn_bg"], P["warn"]),
    box_ml(690, 34, 240, 210, "3. ROM Block / InitCbk", ["Hằng số Flash Chỉ Đọc", "NvMRomBlockDataAddress", "Hoặc NvMInitBlockCallback()", "Phòng hờ khi Flash Trống", "Hoặc hỏng CRC cả NV #0/#1"], P["pur"], P["pur_bg"], P["pur"]),
    line_arrow(270, 118, 345, 118, P["pri"]),
    line_arrow(345, 152, 270, 152, P["ok"], "hbArrOk"),
    line_arrow(690, 136, 615, 136, P["pur"]),
    pill_label(307, 94, "Write", P["pri"]),
    pill_label(307, 174, "Read", P["ok"]),
    pill_label(652, 114, "Fallback", P["pur"]),
]))

SVG_N0_2 = svg_wrap(960, 270, "\n".join([
    box_ml(35, 36, 410, 198, "DFlash + Fee (Flash EEPROM Emulation)", ["• Mỗi lần MemIf_Write ghi bản ghi mới nối tiếp", "• Không xóa Sector tại chỗ -> Chống mòn Flash", "• Ghi Header BlockNumber + DataLength + Status", "• Valid / Invalidated marker hỗ trợ Swap Cluster", "• Khi Sector đầy -> Fee Garbage Collection (GC)"], P["cyan"], P["cyan_bg"], P["cyan"]),
    box_ml(515, 36, 410, 198, "EEPROM + Ea (EEPROM Abstraction)", ["• Bộ nhớ EEPROM vật lý xóa/ghi theo byte/page", "• Tuổi thọ ghi cao (~100k–1M chu kỳ)", "• Ea chuyển Virtual BlockId -> Địa chỉ vật lý cố định", "• Thích hợp khối cập nhật tần suất siêu cao", "• Cùng giao diện chuẩn MemIf bên trên"], P["ok"], P["ok_bg"], P["ok"]),
    pill_label(480, 135, "vs MemIf", P["pri"]),
]))

# ==================== TAB 1: NATIVE / REDUNDANT / DATASET ====================
SVG_N1_0 = svg_wrap(960, 280, "\n".join([
    box_ml(30, 30, 280, 216, "NVM_BLOCK_NATIVE", ["1 NV Block + 0..1 ROM Block", "Chiếm ít Flash nhất (1x size)", "Không có bản sao dự phòng", "Lỗi CRC -> Restore ROM (nếu có)", "VD: Calib_Engine, Crash_Record"], P["pri"], P["pri_bg"], P["pri"]),
    box_ml(340, 30, 280, 216, "NVM_BLOCK_REDUNDANT", ["2 NV Copies (#0 & #1) + ROM", "WriteBlock ghi tuần tự cả 2 bản", "Mất điện giữa chừng -> Còn #1", "Read lỗi #0 -> Fallback #1 + DEM", "VD: Odometer, ConfigId"], P["ok"], P["ok_bg"], P["ok"]),
    box_ml(650, 30, 280, 216, "NVM_BLOCK_DATASET", ["M NV Slots + N ROM Slots", "Chọn slot via NvM_SetDataIndex()", "Chỉ 1 Slot active tại 1 thời điểm", "ROM Slots: Chỉ Read (Write -> DET)", "VD: Variant_Coding (EU/US/JP)"], P["pur"], P["pur_bg"], P["pur"]),
]))

SVG_N1_1 = svg_wrap(960, 290, "\n".join([
    box_ml(30, 96, 175, 76, "NvM_ReadBlock(3)", ["Odometer REDUNDANT", "Đọc NV Copy #0"], P["pri"], P["pri_bg"], P["pri"]),
    box_ml(265, 96, 185, 76, "Check CRC Copy #0", ["Tính CRC-16 + StaticID", "0xDEAD != Calc!"], P["err"], P["err_bg"], P["err"]),
    box_ml(510, 30, 195, 76, "Fallback NV Copy #1", ["Báo DEM LOSS_REDUNDANCY", "Đọc & Verify Copy #1"], P["warn"], P["warn_bg"], P["warn"]),
    box_ml(760, 30, 170, 76, "RAM Recovered!", ["Trả NVM_REQ_OK", "Giữ nguyên Odometer"], P["ok"], P["ok_bg"], P["ok"]),
    box_ml(510, 174, 420, 76, "Nếu cả NV #0 và NV #1 đều hỏng CRC", ["Báo DEM NVM_E_INTEGRITY_FAILED -> Nạp ROM Default (nếu bật)"], P["err"], P["err_bg"], P["err"]),
    line_arrow(205, 134, 265, 134, P["pri"]),
    line_arrow(450, 114, 510, 68, P["warn"], "hbArrWarn"),
    line_arrow(705, 68, 760, 68, P["ok"], "hbArrOk"),
    line_arrow(450, 152, 510, 204, P["err"], "hbArrErr"),
    pill_label(460, 60, "Retry Fail", P["warn"]),
]))

SVG_N1_2 = svg_wrap(960, 280, "\n".join([
    box_ml(30, 95, 220, 82, "NvM_SetDataIndex(4, idx)", ["Thay đổi con trỏ khối Dataset", "Giới hạn [0 .. M+N-1]"], P["pri"], P["pri_bg"], P["pri"]),
    box_ml(340, 26, 270, 98, "Index 0 .. M-1 (NV Slots)", ["NV #0: EU_Gasoline", "NV #1: US_Hybrid · NV #2: JP_EV", "Đọc & Ghi bình thường"], P["ok"], P["ok_bg"], P["ok"]),
    box_ml(340, 154, 270, 98, "Index M .. M+N-1 (ROM Slots)", ["ROM #3: Base · ROM #4: Safe", "CHỈ ĐỌC (Read / Restore)", "Write / Erase -> DET 0x0C!"], P["err"], P["err_bg"], P["err"]),
    box_ml(680, 95, 240, 82, "Lưu Ý ReadAll / WriteAll", ["Khối DATASET thường cấu hình", "chọn NvM_SetDataIndex thủ công"], P["cyan"], P["cyan_bg"], P["cyan"]),
    line_arrow(250, 120, 340, 76, P["ok"], "hbArrOk"),
    line_arrow(250, 150, 340, 200, P["err"], "hbArrErr"),
    line_arrow(610, 76, 680, 122, P["cyan"]),
]))

# ==================== TAB 2: RAM & EXPLICIT SYNC MIRROR ====================
SVG_N2_0 = svg_wrap(960, 280, "\n".join([
    box_ml(30, 28, 420, 102, "Chế Độ 1: Direct Permanent RAM Block", ["UsePermanentRamBlock=TRUE · SyncMechanism=FALSE", "SWC trỏ trực tiếp mảng RAM toàn cục cho NvM", "Rủi ro: SWC đang sửa nửa struct thì NvM đọc ghi Flash"], P["warn"], P["warn_bg"], P["warn"]),
    box_ml(30, 152, 420, 102, "Chế Độ 2: Temporary RAM Pointer (ReadBlock(id, ptr))", ["Truyền con trỏ DstPtr/SrcPtr lúc gọi hàm", "Buffer phải tồn tại tới khi JobFinished() (NVM_REQ_OK)"], P["cyan"], P["cyan_bg"], P["cyan"]),
    box_ml(510, 28, 420, 226, "Chế Độ 3: Explicit Synchronization Mirror (An Toàn Nhất)", ["NvMBlockUseSyncMechanism = TRUE", "NvM cấp riêng bộ đệm nội bộ NvM Mirror", "Khi Write: gọi WriteRamBlockToNvMCbk(MirrorPtr)", "Khi Read: gọi ReadRamBlockFromNvMCbk(MirrorPtr)", "SWC copy nguyên tử xong trả E_OK -> Bất biến trong Flash!"], P["ok"], P["ok_bg"], P["ok"]),
    pill_label(480, 140, "Safe", P["ok"]),
]))

SVG_N2_1 = svg_wrap(960, 290, "\n".join([
    box_ml(30, 96, 185, 76, "NvM_WriteBlock(2)", ["Khởi tạo đếm Retry", "cnt = RepeatMirrorOps"], P["pri"], P["pri_bg"], P["pri"]),
    box_ml(275, 96, 210, 76, "Gọi WriteRamToNvMCbk", ["SWC copy RAM -> Mirror", "Tránh Torn Read/Write"], P["pur"], P["pur_bg"], P["pur"]),
    box_ml(555, 24, 175, 72, "E_NOT_OK (Busy)", ["Giảm cnt -= 1", "Đợi MainFn kế tiếp"], P["warn"], P["warn_bg"], P["warn"]),
    box_ml(555, 186, 175, 72, "Hết Lượt Retry (0)", ["Báo DEM REQ_FAILED", "Trả NVM_REQ_NOT_OK"], P["err"], P["err_bg"], P["err"]),
    box_ml(765, 96, 170, 76, "E_OK -> CRC & MemIf", ["Bật EXPLICIT_SYNC_OK", "Ghi từ NvM Mirror"], P["ok"], P["ok_bg"], P["ok"]),
    line_arrow(215, 134, 275, 134, P["pri"]),
    line_arrow(485, 114, 555, 60, P["warn"], "hbArrWarn"),
    path_arrow("M 555 44 L 380 44 L 380 96", P["warn"], "hbArrWarn", dashed=True),
    line_arrow(642, 96, 642, 186, P["err"], "hbArrErr"),
    line_arrow(485, 134, 765, 134, P["ok"], "hbArrOk"),
    pill_label(465, 28, "Retry Loop", P["warn"]),
]))

SVG_N2_2 = svg_wrap(960, 270, "\n".join([
    box_ml(30, 40, 250, 186, "SWC Cập Nhật RAM Block", ["1. Sửa biến Permanent RAM", "2. Gọi NvM_SetRamBlockStatus", "   (BlockId, TRUE)", "-> VALID_RAM = 1", "-> CHANGED_SW = 1"], P["pri"], P["pri_bg"], P["pri"]),
    box_ml(355, 40, 250, 186, "AutoValidation / ValidateAll", ["Bật NvMBlockUseAutoValidation", "Khi BswM gọi NvM_ValidateAll()", "-> NvM tính sẵn CRC của RAM", "-> Chuẩn bị cho shutdown nhanh"], P["cyan"], P["cyan_bg"], P["cyan"]),
    box_ml(680, 40, 250, 186, "Bộ Lọc NvM_WriteAll()", ["Quét mọi khối SelectForWriteAll", "Nếu VALID==1 && CHANGED==1:", "  -> Ghi NV & xóa CHANGED=0", "Nếu CHANGED==0:", "  -> Bỏ qua (Chống mòn Flash)"], P["ok"], P["ok_bg"], P["ok"]),
    line_arrow(280, 133, 355, 133, P["pri"]),
    line_arrow(605, 133, 680, 133, P["ok"], "hbArrOk"),
]))

# ==================== TAB 3: CRC, COMPARE, WRITEVERIFY & PROTECTION ====================
SVG_N3_0 = svg_wrap(960, 275, "\n".join([
    box_ml(30, 86, 200, 84, "Header: Static Block ID", ["2 Bytes (High, Low ID)", "Bật: NvMStaticBlockIDCheck", "Ngăn đọc nhầm Block khác"], P["pur"], P["pur_bg"], P["pur"]),
    box_ml(265, 86, 220, 84, "Payload Data (N Bytes)", ["Dữ liệu từ Mirror / RAM", "Chia lát NvMCrcNumOfBytes", "mỗi MainFunction() để mượt"], P["pri"], P["pri_bg"], P["pri"]),
    box_ml(520, 86, 185, 84, "AUTOSAR Crc Engine", ["CRC-8 (J1850 0x1D)", "CRC-16 (CCITT 0x1021)", "CRC-32 (IEEE 0xEDB88320)"], P["cyan"], P["cyan_bg"], P["cyan"]),
    box_ml(740, 86, 190, 84, "Lưu NV / Đối Chiếu", ["Ghi kèm Trailer CRC xuống Fee", "Hoặc kiểm tra khi Read", "Lệch ID -> NVM_E_WRONG_ID"], P["ok"], P["ok_bg"], P["ok"]),
    line_arrow(230, 128, 265, 128, P["pur"]),
    line_arrow(485, 128, 520, 128, P["pri"]),
    line_arrow(705, 128, 740, 128, P["ok"], "hbArrOk"),
]))

SVG_N3_1 = svg_wrap(960, 290, "\n".join([
    box_ml(30, 96, 180, 76, "NvM_WriteBlock()", ["Tính NewCRC của", "RAM / Mirror"], P["pri"], P["pri_bg"], P["pri"]),
    box_ml(265, 96, 195, 76, "CRC Compare Check", ["NewCRC == NV_CRC ?", "CrcCompMechanism"], P["cyan"], P["cyan_bg"], P["cyan"]),
    box_ml(530, 24, 385, 68, "MATCH! -> SKIP MemIf_Write() (Chống Mòn Flash)", ["Không ghi Flash! Bật CRC_COMP_SKIP=1 -> Trả ngay NVM_REQ_OK!"], P["ok"], P["ok_bg"], P["ok"]),
    box_ml(530, 128, 180, 76, "DIFF -> MemIf_Write()", ["Ghi thật NV #0 (& #1)", "qua Fee -> Fls"], P["warn"], P["warn_bg"], P["warn"]),
    box_ml(755, 128, 175, 76, "WriteVerification", ["Đọc ngược MemIf_Read", "So từng byte với RAM!"], P["ok"], P["ok_bg"], P["ok"]),
    line_arrow(210, 134, 265, 134, P["pri"]),
    line_arrow(460, 114, 530, 58, P["ok"], "hbArrOk"),
    line_arrow(460, 152, 530, 166, P["warn"], "hbArrWarn"),
    line_arrow(710, 166, 755, 166, P["ok"], "hbArrOk"),
    pill_label(480, 62, "Skip HW", P["ok"]),
]))

SVG_N3_2 = svg_wrap(960, 270, "\n".join([
    box_ml(25, 34, 410, 200, "Khóa Mềm: NvMBlockWriteProt / SetBlockProtection", ["• Cho phép khóa tạm thời khi vận hành (VD: Odometer)", "• Bật: NvM_SetBlockProtection(id, TRUE) -> WRITE_PROT=1", "• Chặn mọi WriteBlock, WriteAll, Erase, Invalidate", "• CÓ THỂ MỞ KHÓA lại bằng SetBlockProtection(id, FALSE)", "• Phù hợp chế độ Diagnosis Unlock / Service"], P["warn"], P["warn_bg"], P["warn"]),
    box_ml(525, 34, 410, 200, "Khóa Vĩnh Viễn: NvMWriteBlockOnce = TRUE (EOL)", ["• Chuyên dùng cho số VIN / Calibration gốc nhà máy", "• Cho phép ghi DUY NHẤT 1 LẦN đầu tiên xuống Flash", "• Ngay khi ReadAll() đọc thấy hoặc WriteBlock() xong:", "  -> Tự chốt WR_ONCE_LOCKED = 1 & WRITE_PROT = 1", "• Cấm tuyệt đối mở khóa kể cả gọi SetBlockProtection(FALSE)!"], P["err"], P["err_bg"], P["err"]),
    pill_label(480, 134, "LOCK", P["err"]),
]))

# ==================== TAB 4: QUEUES & READALL / WRITEALL ====================
SVG_N4_0 = svg_wrap(960, 290, "\n".join([
    box_ml(25, 30, 210, 86, "Immediate Queue (Prio = 0)", ["Cảm biến Crash / Safety", "Chứa Block có Prio == 0", "Ưu tiên tuyệt đối!"], P["err"], P["err_bg"], P["err"]),
    box_ml(25, 174, 210, 86, "Standard Queue (Prio 1..255)", ["Khối Calib, Variant, Odo", "Sắp xếp Priority nhỏ trước", "FIFO nếu cùng Priority"], P["pri"], P["pri_bg"], P["pri"]),
    box_ml(345, 96, 260, 96, "NvM Job Preemption Engine", ["1. Gọi MemIf_Cancel() hủy job thường", "2. Lưu job thường vào SuspendedJob", "3. Chạy hết Immediate Queue P0", "4. Tự động Resume lại SuspendedJob!"], P["warn"], P["warn_bg"], P["warn"]),
    box_ml(675, 96, 260, 96, "MemIf -> Fee/Ea -> Fls/Eep", ["Chỉ phục vụ 1 job phần cứng", "tại một thời điểm (MEMIF_BUSY)", "Xong gọi JobEndNotification()"], P["ok"], P["ok_bg"], P["ok"]),
    line_arrow(235, 73, 345, 126, P["err"], "hbArrErr"),
    line_arrow(235, 217, 345, 166, P["pri"]),
    line_arrow(605, 144, 675, 144, P["ok"], "hbArrOk"),
    pill_label(290, 68, "Preempt!", P["err"]),
]))

SVG_N4_1 = svg_wrap(960, 280, "\n".join([
    box_ml(25, 84, 155, 92, "1. EcuM / BswM", ["NvM_Init()", "NvM_ReadAll()"], P["ok"], P["ok_bg"], P["ok"]),
    box_ml(210, 84, 170, 92, "2. MemIf FAST", ["MemIf_SetMode", "(MEMIF_MODE_FAST)", "Tăng tốc Flash boot"], P["cyan"], P["cyan_bg"], P["cyan"]),
    box_ml(410, 84, 215, 92, "3. Block #1 ConfigId", ["So Compiled vs Stored", "Lệch -> DynamicCfg", "Reset Resistant=FALSE"], P["warn"], P["warn_bg"], P["warn"]),
    box_ml(655, 84, 140, 92, "4. Blocks 2..N", ["Đọc các khối có", "SelectReadAll=T"], P["pri"], P["pri_bg"], P["pri"]),
    box_ml(825, 84, 115, 92, "5. Hoàn Tất", ["MemIf SLOW", "Báo BswM OK"], P["ok"], P["ok_bg"], P["ok"]),
    line_arrow(180, 130, 210, 130, P["ok"], "hbArrOk"),
    line_arrow(380, 130, 410, 130, P["cyan"]),
    line_arrow(625, 130, 655, 130, P["warn"], "hbArrWarn"),
    line_arrow(795, 130, 825, 130, P["pri"]),
]))

SVG_N4_2 = svg_wrap(960, 290, "\n".join([
    box_ml(25, 94, 175, 82, "BswM Shutdown", ["NvM_ValidateAll()", "NvM_WriteAll()"], P["pur"], P["pur_bg"], P["pur"]),
    box_ml(245, 94, 215, 82, "Lọc Điều Kiện Ghi", ["SelectWriteAll == T &&", "VALID == 1 && CHANGED == 1"], P["pri"], P["pri_bg"], P["pri"]),
    box_ml(515, 24, 420, 76, "Nhánh Bình Thường -> Ghi Xong -> SLOW & Sleep", ["Ghi xong Clear CHANGED_SW=0 -> BswM NVM_REQ_OK -> Tắt ECU"], P["ok"], P["ok_bg"], P["ok"]),
    box_ml(515, 176, 420, 76, "Nhánh Wakeup (IGN_ON) -> NvM_CancelWriteAll()", ["Xong khối đang ghi dở -> Hủy khối sau -> NVM_REQ_CANCELED"], P["warn"], P["warn_bg"], P["warn"]),
    line_arrow(200, 135, 245, 135, P["pur"]),
    line_arrow(460, 114, 515, 62, P["ok"], "hbArrOk"),
    line_arrow(460, 154, 515, 214, P["warn"], "hbArrWarn"),
]))

# ==================== TAB 5: API R23-11, DEM/DET & ECUC ====================
SVG_N5_0 = svg_wrap(960, 275, "\n".join([
    box_ml(30, 32, 280, 206, "NVM_API_CONFIG_CLASS_1", ["Cơ bản & Tối giản Code Size", "• NvM_Init / GetErrorStatus", "• NvM_SetRamBlockStatus", "• NvM_ReadAll / NvM_WriteAll", "• NvM_ValidateAll / CancelWriteAll"], P["mut"], P["box2"], P["txt"]),
    box_ml(340, 32, 280, 206, "NVM_API_CONFIG_CLASS_2", ["Toàn bộ Class 1 + Single Block:", "• NvM_ReadBlock / ReadPRAMBlock", "• NvM_WriteBlock / WritePRAMBlock", "• NvM_RestoreBlockDefaults / PRAM", "• NvM_SetDataIndex / GetDataIndex"], P["pri"], P["pri_bg"], P["pri"]),
    box_ml(650, 32, 280, 206, "NVM_API_CONFIG_CLASS_3", ["Toàn bộ Class 2 + Bảo Trì Cấp Cao:", "• NvM_SetBlockProtection(id, bool)", "• NvM_InvalidateNvBlock(id)", "• NvM_EraseNvBlock(id) [Yêu cầu Prio=0]"], P["pur"], P["pur_bg"], P["pur"]),
    line_arrow(310, 135, 340, 135, P["pri"]),
    line_arrow(620, 135, 650, 135, P["pur"]),
]))

SVG_N5_1 = svg_wrap(960, 285, "\n".join([
    box_ml(30, 32, 430, 220, "DET: Lỗi Phát Triển (Sync Call Guard — ModuleId = 20)", ["Phát Det_ReportError() ngay khi ứng dụng gọi sai:", "• NVM_E_UNINIT (0x14): Chưa gọi NvM_Init()", "• NVM_E_PARAM_BLOCK_ID (0x0A): BlockId = 0 hoặc >= Max", "• NVM_E_BLOCK_PENDING (0x15): Block đang nằm trong Queue", "• NVM_E_PARAM_BLOCK_DATA_IDX (0x0C): Dataset Index sai", "• NVM_E_BLOCK_CONFIG (0x12/0x13): Erase khối Prio!=0"], P["warn"], P["warn_bg"], P["warn"]),
    box_ml(500, 32, 430, 220, "DEM: Sự Cố Toàn Vẹn & Phần Cứng (Async Job Runtime)", ["Phát Dem_SetEventStatus(..., FAILED) trong MainFn:", "• NVM_E_INTEGRITY_FAILED: Lỗi CRC khi đọc Flash", "• NVM_E_LOSS_OF_REDUNDANCY: Hỏng 1 bản sao Redundant", "• NVM_E_REQ_FAILED: Ghi/xóa MemIf thất bại hết Retry", "• NVM_E_VERIFY_FAILED: WriteVerification đọc ngược sai byte", "• NVM_E_WRONG_BLOCK_ID: Lệch Header Static Block ID"], P["err"], P["err_bg"], P["err"]),
]))

SVG_N5_2 = svg_wrap(960, 275, "\n".join([
    box_ml(30, 36, 265, 198, "1. NvMCommon (Global)", ["• NvMApiConfigClass (1/2/3)", "• NvMDevErrorDetect", "• NvMJobPrioritization", "• SizeStdQueue / SizeImmQueue", "• CrcNumOfBytes / DrvModeSwitch", "• DynamicConfiguration"], P["pri"], P["pri_bg"], P["pri"]),
    box_ml(348, 36, 275, 198, "2. NvMBlockDescriptor (Per-Block)", ["• NvMNvramBlockIdentifier (1..65535)", "• BlockManagementType & Length", "• Priority / NvBlockNum / RomNum", "• UseCrc / CrcType / CrcCompMech", "• SyncMechanism / WriteVerify", "• WriteProt / WriteOnce / ReadAll"], P["cyan"], P["cyan_bg"], P["cyan"]),
    box_ml(675, 36, 255, 198, "3. MemIf & Fee/Ea Ref", ["• NvMNvramDeviceId (0=Fee, 1=Ea)", "• NvMNvBlockBaseNumber", "• Ánh xạ tới FeeBlockNumber", "  hoặc EaBlockNumber", "• Fls / Eep HW Sector Geometry"], P["ok"], P["ok_bg"], P["ok"]),
    line_arrow(295, 135, 348, 135, P["pri"]),
    line_arrow(623, 135, 675, 135, P["ok"], "hbArrOk"),
]))

HANDBOOK_SVGS = {
    (0, 0): SVG_N0_0,
    (0, 1): SVG_N0_1,
    (0, 2): SVG_N0_2,
    (1, 0): SVG_N1_0,
    (1, 1): SVG_N1_1,
    (1, 2): SVG_N1_2,
    (2, 0): SVG_N2_0,
    (2, 1): SVG_N2_1,
    (2, 2): SVG_N2_2,
    (3, 0): SVG_N3_0,
    (3, 1): SVG_N3_1,
    (3, 2): SVG_N3_2,
    (4, 0): SVG_N4_0,
    (4, 1): SVG_N4_1,
    (4, 2): SVG_N4_2,
    (5, 0): SVG_N5_0,
    (5, 1): SVG_N5_1,
    (5, 2): SVG_N5_2,
}
