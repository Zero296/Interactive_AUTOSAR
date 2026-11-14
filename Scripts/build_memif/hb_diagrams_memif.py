# -*- coding: utf-8 -*-
"""Theme-aware inline SVG diagram generators for the MemIf Technical Handbook."""
from xml.sax.saxutils import escape


def svg_wrap(body, w=820, h=290, label="MemIf Diagram"):
    return (
        f'<svg class="hb-svg" viewBox="0 0 {w} {h}" '
        f'xmlns="http://www.w3.org/2000/svg" role="img" aria-label="{escape(label)}">'
        '<defs>'
        '<marker id="hbArr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">'
        '<path d="M 0 1 L 10 5 L 0 9 z" fill="var(--hb-pri)"/></marker>'
        '<marker id="hbArrOk" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">'
        '<path d="M 0 1 L 10 5 L 0 9 z" fill="var(--hb-ok)"/></marker>'
        '<marker id="hbArrWarn" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">'
        '<path d="M 0 1 L 10 5 L 0 9 z" fill="var(--hb-warn)"/></marker>'
        '<marker id="hbArrErr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">'
        '<path d="M 0 1 L 10 5 L 0 9 z" fill="var(--hb-err)"/></marker>'
        '</defs>'
        f'<rect x="0" y="0" width="{w}" height="{h}" rx="10" fill="var(--hb-bg)"/>'
        f'{body}</svg>'
    )


def box_ml(x, y, w, h, title, lines=None, stroke="var(--hb-bdr)", fill="var(--hb-card)", title_fill="var(--hb-pri)", rx=8):
    lines = lines or []
    cx = x + w / 2
    out = [f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="1.6"/>']
    if not lines:
        ty = y + h / 2 + 4
        out.append(f'<text x="{cx}" y="{ty}" text-anchor="middle" fill="{title_fill}" font-size="11.5" font-weight="800">{escape(title)}</text>')
    else:
        total_h = 16 + len(lines) * 14
        start_y = y + (h - total_h) / 2 + 12
        out.append(f'<text x="{cx}" y="{start_y}" text-anchor="middle" fill="{title_fill}" font-size="11.5" font-weight="800">{escape(title)}</text>')
        for i, ln in enumerate(lines):
            ly = start_y + 15 + i * 14
            out.append(f'<text x="{cx}" y="{ly}" text-anchor="middle" fill="var(--hb-txt)" font-size="10">{escape(ln)}</text>')
    return "".join(out)


def line_arrow(x1, y1, x2, y2, stroke="var(--hb-pri)", marker="hbArr", dashed=False):
    dash = ' stroke-dasharray="5 3"' if dashed else ""
    return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{stroke}" stroke-width="1.8"{dash} marker-end="url(#{marker})"/>'


def path_arrow(d, stroke="var(--hb-pri)", marker="hbArr", dashed=False):
    dash = ' stroke-dasharray="5 3"' if dashed else ""
    return f'<path d="{d}" fill="none" stroke="{stroke}" stroke-width="1.8"{dash} marker-end="url(#{marker})"/>'


def pill_label(cx, cy, txt, w=120, bg="var(--hb-card2)", fg="var(--hb-cyan)", bdr="var(--hb-bdr)"):
    x = cx - w / 2
    y = cy - 10
    return (
        f'<rect x="{x}" y="{y}" width="{w}" height="20" rx="10" fill="{bg}" stroke="{bdr}" stroke-width="1"/>'
        f'<text x="{cx}" y="{cy + 3.5}" text-anchor="middle" fill="{fg}" font-size="9.5" font-weight="700">{escape(txt)}</text>'
    )


def mem_stack_overview():
    b = [
        '<text x="410" y="22" text-anchor="middle" fill="var(--hb-pri)" font-size="12.5" font-weight="800">Vị trí của MemIf trong AUTOSAR Classic Memory Stack (R20-11 -&gt; R23-11)</text>',
        box_ml(40, 38, 220, 48, "SWC_App (Application)", ["Chỉ gọi NvM qua RTE Port"], stroke="var(--hb-pri)", title_fill="var(--hb-pri)"),
        box_ml(300, 38, 220, 48, "DEM / EcuM / BswM", ["ReadAll / WriteAll / Crash DTC"], stroke="var(--hb-ok)", title_fill="var(--hb-ok)"),
        box_ml(560, 38, 220, 48, "DET (Module 22)", ["E_PARAM_DEVICE / POINTER"], stroke="var(--hb-err)", title_fill="var(--hb-err)"),
        box_ml(175, 108, 360, 50, "NvM (NVRAM Manager — Services)", ["Hàng đợi, CRC16/32 & BlockId -> (DevIdx, BlkNum)"], stroke="var(--hb-pur)", title_fill="var(--hb-pur)"),
        box_ml(175, 180, 360, 52, "MemIf (ECU Abstraction — Mod 22)", ["Định tuyến Macro/FctPtr[] | GetStatus(0xFF) & SetMode()"], stroke="var(--hb-cyan)", fill="var(--pri-bg)", title_fill="var(--hb-pri)"),
        box_ml(40, 256, 330, 50, "Dev 0: Fee (Flash Emulation)", ["Trang ảo Append-Only + Garbage Collection"], stroke="var(--hb-ok)", title_fill="var(--hb-ok)"),
        box_ml(450, 256, 330, 50, "Dev 1: Ea (EEPROM Abstraction)", ["Ánh xạ Offset cố định (Không cần GC)"], stroke="var(--hb-cyan)", title_fill="var(--hb-cyan)"),
        box_ml(40, 326, 330, 44, "Fls / R23-11 MemAcc + Mem (DFlash)", ["Ghi/Xóa Flash Sector nội bộ MCU"], stroke="var(--hb-bdr)", title_fill="var(--hb-txt)"),
        box_ml(450, 326, 330, 44, "Eep + Spi / R23-11 MemAcc + Mem", ["Truyền SPI tới chip EEPROM ngoài"], stroke="var(--hb-bdr)", title_fill="var(--hb-txt)"),
        line_arrow(150, 86, 260, 108),
        line_arrow(410, 86, 410, 108, stroke="var(--hb-ok)", marker="hbArrOk"),
        line_arrow(345, 158, 345, 180),
        line_arrow(535, 206, 670, 86, stroke="var(--hb-err)", marker="hbArrErr", dashed=True),
        line_arrow(270, 232, 210, 256, stroke="var(--hb-ok)", marker="hbArrOk"),
        line_arrow(420, 232, 600, 256),
        line_arrow(205, 306, 205, 326, stroke="var(--hb-ok)", marker="hbArrOk"),
        line_arrow(615, 306, 615, 326),
        # Callback bypass arrow on far left
        path_arrow("M 40 280 C 12 280, 12 133, 175 133", stroke="var(--hb-warn)", marker="hbArrWarn", dashed=True),
        pill_label(92, 206, "Callback bỏ qua MemIf", w=146, fg="var(--hb-warn)", bdr="var(--hb-warn)"),
    ]
    return svg_wrap("".join(b), 820, 384, "Sơ đồ tổng quan AUTOSAR Memory Stack")


def macro_vs_fctptr():
    b = [
        '<text x="410" y="22" text-anchor="middle" fill="var(--hb-pri)" font-size="12.5" font-weight="800">So sánh Pre-compile Macro (1 Device) vs Function Pointer Array (N Devices)</text>',
        box_ml(25, 42, 370, 230, "MODE A: MemIfNumberOfDevices == 1 (Macro)", [
            "SWS_MemIf_00019 — Biên dịch tiền xử lý (MemIf_Cfg.h)",
            "#define MemIf_Read(Dev,Blk,Off,P,L) Fee_Read(Blk,Off,P,L)",
            "Ưu điểm: 0 bytes ROM bảng con trỏ, 0 chu kỳ trễ CPU",
            "Tham số DeviceIndex bị loại bỏ hoàn toàn lúc dịch C!",
            "MemIf_GetStatus(0xFF) == Fee_GetStatus()",
            "Chỉ dùng khi ECU chỉ có Data Flash (Fee)"
        ], stroke="var(--hb-pur)", title_fill="var(--hb-pur)"),
        box_ml(425, 42, 370, 230, "MODE B: MemIfNumberOfDevices >= 2 (FctPtr)", [
            "SWS_MemIf_00020 — Mảng con trỏ hàm hằng số (MemIf_Cfg.c)",
            "MemIf_ReadFctPtr[2] = { &Fee_Read, &Ea_Read };",
            "B1: Kiểm tra DET: DeviceIndex >= 2 -> MEMIF_E_PARAM_DEVICE",
            "B2: Gọi gián tiếp MemIf_ReadFctPtr[DeviceIndex](...)",
            "MemIf_GetStatus(0xFF): Quét vòng lặp mọi thiết bị",
            "Bắt buộc khi ECU có cả Data Flash (Fee) + EEPROM (Ea)"
        ], stroke="var(--hb-cyan)", title_fill="var(--hb-cyan)"),
        pill_label(210, 286, "Gọi trực tiếp: 0 Overhead", w=160, fg="var(--hb-pur)", bdr="var(--hb-pur)"),
        pill_label(610, 286, "Chỉ mục động [0]=Fee, [1]=Ea", w=185, fg="var(--hb-cyan)", bdr="var(--hb-cyan)"),
    ]
    return svg_wrap("".join(b), 820, 306, "So sánh Macro 1 thiết bị và Mảng con trỏ hàm")


def broadcast_priority():
    b = [
        '<text x="410" y="22" text-anchor="middle" fill="var(--hb-pri)" font-size="12.5" font-weight="800">Quy tắc Hợp nhất MemIf_GetStatus(MEMIF_BROADCAST_ID = 0xFF) (SWS_MemIf_00035..37)</text>',
        box_ml(30, 44, 170, 56, "Device 0 (Fee) Status", ["UNINIT / BUSY /", "BUSY_INT / IDLE"], stroke="var(--hb-ok)", title_fill="var(--hb-ok)"),
        box_ml(30, 126, 170, 56, "Device 1 (Ea) Status", ["UNINIT / BUSY / IDLE", "(hoặc Dev 2..N-1)"], stroke="var(--hb-cyan)", title_fill="var(--hb-cyan)"),
        box_ml(250, 44, 340, 210, "Bộ Quét Ưu Tiên MemIf_GetStatus(0xFF)", [
            "1. Có bất kỳ Dev nào == MEMIF_UNINIT ?",
            "   --> Trả ngay MEMIF_UNINIT (0x00)",
            "2. Nếu không, có Dev == MEMIF_BUSY ?",
            "   --> Trả ngay MEMIF_BUSY (0x02)",
            "3. Nếu không, có Dev == MEMIF_BUSY_INTERNAL ?",
            "   --> Trả MEMIF_BUSY_INTERNAL (0x03) (Fee GC)",
            "4. Tất cả đều IDLE --> Trả MEMIF_IDLE (0x01)"
        ], stroke="var(--hb-warn)", fill="var(--hb-card2)", title_fill="var(--hb-warn)"),
        box_ml(635, 92, 160, 80, "Kết quả trả NvM", ["Một MemIf_StatusType", "duy nhất cho Shutdown", "/ BswM / EcuM"], stroke="var(--hb-pri)", title_fill="var(--hb-pri)"),
        box_ml(30, 268, 765, 44, "LƯU Ý: 0xFF (MEMIF_BROADCAST_ID) BỊ CẤM cho GetJobResult, Read, Write, Cancel!", ["Gọi MemIf_GetJobResult(0xFF) sẽ bị chặn bởi DET: MEMIF_E_PARAM_DEVICE (0x01)!"], stroke="var(--hb-err)", fill="var(--err-bg)", title_fill="var(--hb-err)"),
        line_arrow(200, 72, 250, 72, stroke="var(--hb-ok)", marker="hbArrOk"),
        line_arrow(200, 154, 250, 154),
        line_arrow(590, 132, 635, 132),
    ]
    return svg_wrap("".join(b), 820, 326, "Quy tắc ưu tiên Broadcast Status 0xFF")


def fee_vs_ea_layout():
    b = [
        '<text x="410" y="22" text-anchor="middle" fill="var(--hb-pri)" font-size="12.5" font-weight="800">Cách lưu trữ Vật lý: Fee Append-Only Virtual Page (Flash) vs Ea Fixed Offset (EEPROM)</text>',
        box_ml(25, 42, 375, 224, "Device 0: Fee + Fls (DFlash Append-Only)", [
            "Data Flash bắt buộc Xóa cả Sector trước khi ghi lại",
            "[VP#01..03] Blk 0x0004 (v1) -> SUPERSEDED (Cũ)",
            "[VP#04..07] Blk 0x0004 (v2) -> VALID (Mới nhất)",
            "[VP#12..15] Blk 0x000F (Imm) -> Dành riêng Crash DTC",
            "[VP#16..20] Trang trống 0xFF -> Ghi nối đuôi vào đây",
            "Khi Sector đầy >= 90%: chạy Garbage Collection (GC)"
        ], stroke="var(--hb-ok)", title_fill="var(--hb-ok)"),
        box_ml(420, 42, 375, 224, "Device 1: Ea + Eep/Spi (Fixed Physical Offset)", [
            "EEPROM ghi đè từng byte/page không cần xóa Sector",
            "Offset 0x0180 (16B): Blk 0x0010 (NvM_OdometerEep)",
            "Offset 0x0240 (32B): Blk 0x0020 (NvM_ImmoKeyEep)",
            "Mỗi Block có Header ảo (VALID / INVALID)",
            "Không có Garbage Collection -> Không có BUSY_INTERNAL",
            "Truyền qua SPI Bus tới chip EEPROM ngoài ECU"
        ], stroke="var(--hb-cyan)", title_fill="var(--hb-cyan)"),
        pill_label(212, 282, "Wear-Leveling tự động trên Flash", w=210, fg="var(--hb-ok)", bdr="var(--hb-ok)"),
        pill_label(607, 282, "Địa chỉ cố định & Thời gian xác định", w=230, fg="var(--hb-cyan)", bdr="var(--hb-cyan)"),
    ]
    return svg_wrap("".join(b), 820, 302, "So sánh lưu trữ vật lý Fee và Ea")


def fee_garbage_collection():
    b = [
        '<text x="410" y="22" text-anchor="middle" fill="var(--hb-pri)" font-size="12.5" font-weight="800">Chu trình Fee Garbage Collection (Sector Switch) &amp; Trạng thái MEMIF_BUSY_INTERNAL</text>',
        box_ml(25, 52, 165, 118, "Bước 1: Sector 0 Đầy", ["Sector 0 đạt >= 90%", "nhiều trang SUPERSEDED", "Fee vào BUSY_INTERNAL"], stroke="var(--hb-warn)", title_fill="var(--hb-warn)"),
        box_ml(225, 52, 175, 118, "Bước 2: Copy Hợp Lệ", ["Copy duy nhất trang VALID", "& IMMEDIATE sang Sector 1", "Bỏ qua trang cũ / Invalid"], stroke="var(--hb-pur)", title_fill="var(--hb-pur)"),
        box_ml(435, 52, 165, 118, "Bước 3: Đổi Sector", ["Sector 1 trở thành Active", "Fls_Erase() xóa sạch", "toàn bộ Sector 0 cũ"], stroke="var(--hb-ok)", title_fill="var(--hb-ok)"),
        box_ml(635, 52, 160, 118, "Bước 4: Ngắt Ưu Tiên", ["Nếu Crash Immediate", "Write đến giữa chừng:", "Tạm dừng GC -> Ghi ngay!"], stroke="var(--hb-err)", title_fill="var(--hb-err)"),
        line_arrow(190, 111, 225, 111, stroke="var(--hb-warn)", marker="hbArrWarn"),
        line_arrow(400, 111, 435, 111, stroke="var(--hb-ok)", marker="hbArrOk"),
        line_arrow(600, 111, 635, 111, stroke="var(--hb-err)", marker="hbArrErr", dashed=True),
        box_ml(25, 198, 770, 56, "Phân biệt với MemIf: Giao tiếp với NvM trong lúc chạy GC", [
            "Fee_GetStatus() = MEMIF_BUSY_INTERNAL (0x03) -> NvM vẫn gửi được lệnh (Immediate ưu tiên ngắt GC).",
            "Khi EcuM Shutdown gọi MemIf_GetStatus(0xFF) -> nhận BUSY_INTERNAL để đợi GC xóa xong trước khi tắt nguồn."
        ], stroke="var(--hb-pri)", fill="var(--hb-card2)", title_fill="var(--hb-pri)"),
    ]
    return svg_wrap("".join(b), 820, 270, "Chu trình Fee Garbage Collection")


def memacc_r23_11():
    b = [
        '<text x="410" y="22" text-anchor="middle" fill="var(--hb-pri)" font-size="12.5" font-weight="800">Tiến hóa Kiến trúc AUTOSAR: R20-11 (Fls/Eep) sang R22-11 / R23-11 (MemAcc + Mem)</text>',
        box_ml(30, 44, 355, 220, "AUTOSAR R4.x / R20-11 Truyền Thống", [
            "NvM --> MemIf (Dev0 / Dev1)",
            "MemIf[0] --> Fee --> Fls Driver (DFlash)",
            "MemIf[1] --> Ea --> Eep + Spi (EEPROM)",
            "Hạn chế: Fee/Ea khó chia sẻ bus đồng thời",
            "với Bootloader / Firmware OTA (FOTA)",
            "vì Fls & Eep nằm riêng rẽ ở tầng MCAL."
        ], stroke="var(--hb-bdr)", title_fill="var(--hb-txt)"),
        box_ml(435, 44, 355, 220, "AUTOSAR R22-11 / R23-11 (EnableR2311MemAccLayer)", [
            "NvM --> MemIf (API & SWS_MemIf GIỮ NGUYÊN!)",
            "Fee / Ea gọi xuống MemAcc (Memory Access)",
            "MemAcc điều phối AddressArea đa nguồn",
            "MemAcc --> Unified Mem Drivers (Mem_43_INFLS)",
            "Hỗ trợ FOTA & Multi-Core không đụng độ!",
            "MemIf vẫn tồn tại để bảo toàn tương thích NvM."
        ], stroke="var(--hb-cyan)", fill="var(--pri-bg)", title_fill="var(--hb-cyan)"),
        line_arrow(385, 154, 435, 154, stroke="var(--hb-ok)", marker="hbArrOk"),
    ]
    return svg_wrap("".join(b), 820, 282, "Kiến trúc R20-11 so với R23-11 MemAcc")


def async_cbk_vs_polling():
    b = [
        '<text x="410" y="22" text-anchor="middle" fill="var(--hb-pri)" font-size="12.5" font-weight="800">Hai cơ chế hoàn tất Job: Callback Trực Tiếp (Bỏ qua MemIf) vs Polling Qua MemIf</text>',
        box_ml(25, 44, 375, 206, "CƠ CHẾ 1: Callback Mode (NvMPollingMode = FALSE)", [
            "1. NvM -> MemIf_Write(0, Blk, Ptr) -> Fee_Write()",
            "2. MemIf xong nhiệm vụ định tuyến ngay lập tức!",
            "3. Fls & Fee chạy MainFunction() ghi xong 32 bytes",
            "4. Fee gọi TRỰC TIẾP: NvM_JobEndNotification()",
            "   (Hoặc NvM_JobErrorNotification() khi có lỗi)",
            "LƯU Ý: MemIf KHÔNG có hàm Callback nào!"
        ], stroke="var(--hb-ok)", title_fill="var(--hb-ok)"),
        box_ml(420, 44, 375, 206, "CƠ CHẾ 2: Polling Mode (NvMPollingMode = TRUE)", [
            "1. NvM -> MemIf_Read(Dev, Blk, Off, Ptr, Len)",
            "2. Mỗi chu kỳ 5ms, NvM_MainFunction() tự hỏi:",
            "   st = MemIf_GetStatus(Dev); (khi BUSY -> đợi)",
            "3. Khi st == MEMIF_IDLE:",
            "   res = MemIf_GetJobResult(Dev);",
            "4. Nhận MEMIF_JOB_OK / FAILED / INCONSISTENT"
        ], stroke="var(--hb-warn)", title_fill="var(--hb-warn)"),
    ]
    return svg_wrap("".join(b), 820, 268, "Luồng Callback so với Polling")


def redundant_recovery():
    b = [
        '<text x="410" y="22" text-anchor="middle" fill="var(--hb-pri)" font-size="12.5" font-weight="800">Phục hồi Block Dự Phòng (NvM Redundant Recovery) khi MEMIF_BLOCK_INCONSISTENT (S10)</text>',
        box_ml(25, 50, 175, 108, "1. Đọc Copy 1 (0x0008)", ["NvM -> MemIf_Read(0, 8)", "Phát hiện rách trang", "MEMIF_BLOCK_INCONSISTENT"], stroke="var(--hb-err)", title_fill="var(--hb-err)"),
        box_ml(235, 50, 180, 108, "2. Tự động Đọc Copy 2", ["NvM check BlockType ==", "NVM_BLOCK_REDUNDANT", "Gọi MemIf_Read(0, 0x0009)"], stroke="var(--hb-warn)", title_fill="var(--hb-warn)"),
        box_ml(450, 50, 175, 108, "3. Copy 2 OK & Phục hồi", ["Đọc 0x0009 -> JOB_OK", "Khôi phục RAM Mirror", "Không báo DEM fault!"], stroke="var(--hb-ok)", title_fill="var(--hb-ok)"),
        box_ml(655, 50, 140, 108, "4. Nếu cả 2 hỏng", ["Báo DEM event:", "NVM_E_INTEGRITY", "_FAILED"], stroke="var(--hb-pur)", title_fill="var(--hb-pur)"),
        line_arrow(200, 104, 235, 104, stroke="var(--hb-err)", marker="hbArrErr"),
        line_arrow(415, 104, 450, 104, stroke="var(--hb-ok)", marker="hbArrOk"),
        line_arrow(625, 104, 655, 104, stroke="var(--hb-warn)", marker="hbArrWarn", dashed=True),
    ]
    return svg_wrap("".join(b), 820, 184, "Phục hồi Redundant Block khi gặp rách trang")


def io_flow():
    b = [
        '<text x="410" y="22" text-anchor="middle" fill="var(--hb-pri)" font-size="12.5" font-weight="800">Luồng Input -&gt; Processing -&gt; Output của Module MemIf</text>',
        box_ml(25, 52, 230, 172, "INPUT (Từ Tầng Trên NvM)", [
            "DeviceIndex (0, 1, 0xFF)",
            "BlockNumber (0x0004..0x0020)",
            "BlockOffset & Length",
            "DataBufferPtr (RAM Mirror)",
            "Mode (SLOW / FAST)"
        ], stroke="var(--hb-pur)", title_fill="var(--hb-pur)"),
        box_ml(295, 52, 230, 172, "PROCESSING (Trong MemIf)", [
            "1. Kiểm tra DET (Dev < N, Ptr != NULL)",
            "2. Macro Mode (1 Dev): #define Fee_*",
            "3. FctPtr Mode (>=2 Dev): FctPtr[Dev]",
            "4. GetStatus(0xFF): UNINIT > BUSY",
            "   > BUSY_INTERNAL > IDLE"
        ], stroke="var(--hb-cyan)", fill="var(--pri-bg)", title_fill="var(--hb-pri)"),
        box_ml(565, 52, 230, 172, "OUTPUT (Route Xuống Dưới)", [
            "Dev 0: Fee_Read / Write / Cancel...",
            "Dev 1: Ea_Read / Write / Cancel...",
            "Broadcast: MemIf_SetMode() -> All",
            "Fault: Det_ReportError(22, 0, ...)",
            "Lưu ý: Callback bỏ qua MemIf!"
        ], stroke="var(--hb-ok)", title_fill="var(--hb-ok)"),
        line_arrow(255, 138, 295, 138),
        line_arrow(525, 138, 565, 138, stroke="var(--hb-ok)", marker="hbArrOk"),
    ]
    return svg_wrap("".join(b), 820, 248, "Luồng Input Processing Output của MemIf")


DIAGRAMS = {
    "mem_stack_overview": mem_stack_overview(),
    "macro_vs_fctptr": macro_vs_fctptr(),
    "broadcast_priority": broadcast_priority(),
    "fee_vs_ea_layout": fee_vs_ea_layout(),
    "fee_garbage_collection": fee_garbage_collection(),
    "memacc_r23_11": memacc_r23_11(),
    "async_cbk_vs_polling": async_cbk_vs_polling(),
    "redundant_recovery": redundant_recovery(),
    "io_flow": io_flow(),
}
