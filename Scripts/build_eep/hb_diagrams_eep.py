# ================= HANDBOOK INLINE THEME-AWARE SVG DIAGRAMS (6 x 3 = 18 SVGs) =================
import html


def _esc(s):
    return html.escape(str(s), quote=True)


def hb_svg_open(diag_id, w=820, h=250, caption=""):
    m_id = f"m_{diag_id}"
    return (
        f'<svg id="{diag_id}" class="hb-svg" viewBox="0 0 {w} {h}" '
        f'style="width:100%;max-width:{w}px;height:auto;display:block;margin:10px auto;'
        f'background:var(--panel-3);border:1px solid var(--bdr);border-radius:10px" '
        f'xmlns="http://www.w3.org/2000/svg" data-caption="{_esc(caption)}">'
        f'<defs>'
        f'<marker id="{m_id}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">'
        f'<path d="M 0 1 L 10 5 L 0 9 z" fill="currentColor"/>'
        f'</marker>'
        f'</defs>'
    )


def hb_box(x, y, w, h, title, sub="", stroke="var(--pri)", fill="var(--panel-2)", title_col="var(--pri)", fs_t=11.5, fs_s=9.5):
    cx = x + w / 2
    out = [
        f'<g data-box-x="{x}" data-box-y="{y}" data-box-w="{w}" data-box-h="{h}">',
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="7" fill="{fill}" stroke="{stroke}" stroke-width="1.6"/>',
    ]
    if sub:
        ty = y + h * 0.42
        sy = y + h * 0.74
        out.append(
            f'<text x="{cx:.1f}" y="{ty:.1f}" text-anchor="middle" fill="{title_col}" '
            f'font-weight="800" font-size="{fs_t}" data-box-x="{x}" data-box-y="{y}" data-box-w="{w}" data-box-h="{h}">{_esc(title)}</text>'
        )
        out.append(
            f'<text x="{cx:.1f}" y="{sy:.1f}" text-anchor="middle" fill="var(--txt-soft)" '
            f'font-size="{fs_s}" data-box-x="{x}" data-box-y="{y}" data-box-w="{w}" data-box-h="{h}">{_esc(sub)}</text>'
        )
    else:
        ty = y + h * 0.56
        out.append(
            f'<text x="{cx:.1f}" y="{ty:.1f}" text-anchor="middle" fill="{title_col}" '
            f'font-weight="800" font-size="{fs_t}" data-box-x="{x}" data-box-y="{y}" data-box-w="{w}" data-box-h="{h}">{_esc(title)}</text>'
        )
    out.append("</g>")
    return "".join(out)


def hb_pill(x, y, w, h, text, col="var(--cyan)", bg="var(--cyan-bg)", fs=9.5):
    cx = x + w / 2
    ty = y + h * 0.68
    return (
        f'<g data-px="{x}" data-py="{y}" data-pw="{w}" data-ph="{h}">'
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="5" fill="{bg}" stroke="{col}" stroke-width="1"/>'
        f'<text x="{cx:.1f}" y="{ty:.1f}" text-anchor="middle" fill="{col}" font-weight="700" font-size="{fs}" '
        f'data-box-x="{x}" data-box-y="{y}" data-box-w="{w}" data-box-h="{h}">{_esc(text)}</text>'
        f'</g>'
    )


def hb_arrow(diag_id, d, col="var(--pri)", dashed=False):
    dash_attr = ' stroke-dasharray="5 3"' if dashed else ""
    return f'<path d="{d}" fill="none" stroke="{col}" color="{col}" stroke-width="1.8"{dash_attr} marker-end="url(#m_{diag_id})"/>'


def build_all_hb_diagrams():
    D = {}

    # ---------------- TOPIC 0: ARCHITECTURE & ROLE ----------------
    s = hb_svg_open("hbSvg_0_1", 820, 260, "Kiến trúc đa tầng AUTOSAR quanh Eep")
    s += hb_box(30, 14, 150, 44, "SWC_App", "Application Layer", "var(--acc)", "var(--panel-2)", "var(--acc)")
    s += hb_box(220, 14, 150, 44, "RTE", "NvMService Port", "var(--txt-soft)", "var(--panel-2)", "var(--txt)")
    s += hb_box(410, 14, 150, 44, "NvM (Mod 20)", "Queue / CRC / Retry", "var(--pur)", "var(--pur-bg)", "var(--pur)")
    s += hb_arrow("hbSvg_0_1", "M 180 36 L 216 36", "var(--acc)")
    s += hb_arrow("hbSvg_0_1", "M 370 36 L 406 36", "var(--pur)")

    s += hb_box(410, 86, 150, 44, "MemIf (Mod 22)", "DeviceIdx = 0 -> Ea", "var(--warn)", "var(--warn-bg)", "var(--warn)")
    s += hb_box(220, 86, 150, 44, "Ea (Mod 40)", "3 Sub-Jobs Hdr/Data/Ftr", "var(--cyan)", "var(--cyan-bg)", "var(--cyan)")
    s += hb_arrow("hbSvg_0_1", "M 485 58 L 485 82", "var(--warn)")
    s += hb_arrow("hbSvg_0_1", "M 410 108 L 374 108", "var(--cyan)")

    s += hb_box(205, 160, 210, 56, "Eep Driver (Mod 90)", "Chunk SLOW/FAST · Verify · Dem", "var(--pri)", "var(--pri-bg)", "var(--pri)", 12, 9.5)
    s += hb_arrow("hbSvg_0_1", "M 295 130 L 295 156", "var(--pri)")

    s += hb_box(600, 14, 190, 44, "EcuM / BswM", "Eep_Init & SetMode", "var(--ok)", "var(--ok-bg)", "var(--ok)")
    s += hb_box(600, 86, 190, 44, "SchM / OS (5ms)", "Eep_MainFunction / ISR", "var(--cyan)", "var(--panel-2)", "var(--cyan)")
    s += hb_box(600, 160, 190, 56, "DET & DEM", "DET 0x00..0x0A / Prod Err", "var(--err)", "var(--err-bg)", "var(--err)")
    s += hb_arrow("hbSvg_0_1", "M 600 36 L 419 166", "var(--ok)", dashed=True)
    s += hb_arrow("hbSvg_0_1", "M 600 108 L 419 180", "var(--cyan)")
    s += hb_arrow("hbSvg_0_1", "M 415 196 L 596 196", "var(--err)", dashed=True)

    s += hb_box(30, 160, 145, 56, "Int / SPI EEPROM", "EECTRL or 25LC256", "var(--ok)", "var(--panel-2)", "var(--ok)")
    s += hb_arrow("hbSvg_0_1", "M 205 188 L 179 188", "var(--ok)")
    s += hb_pill(30, 226, 760, 24, "Nguyên tắc vàng: SWC không gọi trực tiếp Eep · Ea là Caller duy nhất từ Memory Stack xuống Eep", "var(--pri)", "var(--panel-2)", 10)
    s += "</svg>"
    D["hbSvg_0_1"] = s

    s = hb_svg_open("hbSvg_0_2", 820, 230, "Phân tách ranh giới Caller hợp lệ trong Memory Stack")
    s += hb_box(25, 25, 165, 56, "SWC / App", "Chỉ gọi RTE / NvM", "var(--err)", "var(--err-bg)", "var(--err)")
    s += hb_box(235, 25, 165, 56, "MemIf Router", "Dev=0: Ea | Dev=1: Fee", "var(--warn)", "var(--warn-bg)", "var(--warn)")
    s += hb_box(445, 25, 165, 56, "Ea (Caller trực tiếp)", "Block -> PhysAddr + Len", "var(--cyan)", "var(--cyan-bg)", "var(--cyan)")
    s += hb_box(640, 25, 155, 56, "Eep Driver", "Read/Write/Erase/Cmp", "var(--pri)", "var(--pri-bg)", "var(--pri)")
    s += hb_arrow("hbSvg_0_2", "M 400 53 L 441 53", "var(--cyan)")
    s += hb_arrow("hbSvg_0_2", "M 610 53 L 636 53", "var(--pri)")
    s += hb_pill(35, 100, 340, 26, "CẤM: SWC gọi trực tiếp Eep_Write()!", "var(--err)", "var(--err-bg)", 10)
    s += hb_box(235, 148, 165, 52, "Fee + Fls Path", "Dev=1 (Data Flash)", "var(--mut)", "var(--panel-2)", "var(--mut)")
    s += hb_arrow("hbSvg_0_2", "M 317 81 L 317 144", "var(--mut)", dashed=True)
    s += hb_pill(445, 148, 350, 52, "MemIf tách biệt EEPROM (Ea+Eep) và Flash (Fee+Fls)", "var(--ok)", "var(--ok-bg)", 10.5)
    s += "</svg>"
    D["hbSvg_0_2"] = s

    s = hb_svg_open("hbSvg_0_3", 820, 230, "Chu trình Async Request & Notification Callback")
    s += hb_box(25, 22, 160, 50, "1. Ea gọi API", "Eep_Write(0x00, 16B)", "var(--cyan)", "var(--cyan-bg)", "var(--cyan)")
    s += hb_box(225, 22, 175, 50, "2. Trả về tức thì", "E_OK + MEMIF_BUSY", "var(--warn)", "var(--warn-bg)", "var(--warn)")
    s += hb_box(440, 22, 180, 50, "3. SchM Tick Loop", "Eep_MainFunction() 5ms", "var(--pri)", "var(--pri-bg)", "var(--pri)")
    s += hb_box(655, 22, 145, 50, "4. Callback Ea", "JobEnd / JobError", "var(--ok)", "var(--ok-bg)", "var(--ok)")
    s += hb_arrow("hbSvg_0_3", "M 185 47 L 221 47", "var(--cyan)")
    s += hb_arrow("hbSvg_0_3", "M 400 47 L 436 47", "var(--warn)")
    s += hb_arrow("hbSvg_0_3", "M 620 47 L 651 47", "var(--ok)")
    s += hb_box(130, 122, 260, 74, "Ea_JobEndNotification()", "Status=IDLE, Result=MEMIF_JOB_OK", "var(--ok)", "var(--ok-bg)", "var(--ok)")
    s += hb_box(440, 122, 260, 74, "Ea_JobErrorNotification()", "FAILED / CANCELED / INCONSISTENT", "var(--err)", "var(--err-bg)", "var(--err)")
    s += hb_arrow("hbSvg_0_3", "M 727 72 L 260 118", "var(--ok)")
    s += hb_arrow("hbSvg_0_3", "M 727 72 L 570 118", "var(--err)", dashed=True)
    s += "</svg>"
    D["hbSvg_0_3"] = s

    # ---------------- TOPIC 1: ADDRESSING, CHUNKING & SETMODE ----------------
    s = hb_svg_open("hbSvg_1_1", 820, 230, "Công thức ánh xạ địa chỉ tuyến tính EEPROM")
    s += hb_box(25, 28, 210, 58, "EepBaseAddress", "Ví dụ: 0x0000 (ECUC)", "var(--cyan)", "var(--cyan-bg)", "var(--cyan)")
    s += hb_box(275, 28, 210, 58, "EepromAddress (Arg)", "Offset do Ea truyền: 0x0060", "var(--pri)", "var(--pri-bg)", "var(--pri)")
    s += hb_box(525, 28, 265, 58, "Physical Silicon Addr", "Base + Offset = 0x0060", "var(--ok)", "var(--ok-bg)", "var(--ok)")
    s += hb_arrow("hbSvg_1_1", "M 235 57 L 271 57", "var(--cyan)")
    s += hb_arrow("hbSvg_1_1", "M 485 57 L 521 57", "var(--ok)")
    s += hb_pill(25, 118, 240, 36, "ReadUnit=1B | WriteUnit=1B", "var(--pri)", "var(--panel-2)", 10)
    s += hb_pill(285, 118, 240, 36, "EraseUnit=8B (Bắt buộc chia hết!)", "var(--warn)", "var(--warn-bg)", 10)
    s += hb_pill(545, 118, 245, 36, "Boundary: Addr + Len <= EepSize", "var(--err)", "var(--err-bg)", 10)
    s += hb_pill(25, 174, 765, 32, "Nếu vi phạm biên EepSize hoặc sai bội số Unit -> DET 0x01 (INVALID_ADDRESS) / 0x03 (INVALID_LENGTH)", "var(--txt)", "var(--panel-2)", 10)
    s += "</svg>"
    D["hbSvg_1_1"] = s

    s = hb_svg_open("hbSvg_1_2", 820, 240, "So sánh kích thước Chunk SLOW vs FAST Mode")
    s += hb_pill(25, 18, 210, 32, "MEMIF_MODE_SLOW (16B Read / 8B Wr)", "var(--cyan)", "var(--cyan-bg)", 10)
    s += hb_box(260, 14, 170, 44, "Tick #1 (+5ms)", "Chunk 1: 16B đọc", "var(--cyan)", "var(--panel-2)", "var(--cyan)")
    s += hb_box(450, 14, 170, 44, "Tick #2 (+10ms)", "Chunk 2: 8B còn lại", "var(--cyan)", "var(--panel-2)", "var(--cyan)")
    s += hb_box(640, 14, 155, 44, "Hoàn tất 24B", "Tổng: 2 Ticks (10ms)", "var(--warn)", "var(--warn-bg)", "var(--warn)")
    s += hb_arrow("hbSvg_1_2", "M 430 36 L 446 36", "var(--cyan)")
    s += hb_arrow("hbSvg_1_2", "M 620 36 L 636 36", "var(--warn)")

    s += hb_pill(25, 100, 210, 32, "MEMIF_MODE_FAST (64B Read / 32B Wr)", "var(--pri)", "var(--pri-bg)", 10)
    s += hb_box(260, 96, 360, 44, "Tick #1 Duy Nhất (+5ms)", "Đọc trọn 24B <= 64B trong 1 Chunk!", "var(--pri)", "var(--pri-bg)", "var(--pri)")
    s += hb_box(640, 96, 155, 44, "Hoàn tất 24B", "Tổng: 1 Tick (5ms)", "var(--ok)", "var(--ok-bg)", "var(--ok)")
    s += hb_arrow("hbSvg_1_2", "M 620 118 L 636 118", "var(--ok)")

    s += hb_pill(25, 172, 770, 42, "Quy tắc SWS_Eep_00011: Eep_SetMode() chỉ được phép gọi khi MEMIF_IDLE; gọi lúc BUSY sẽ báo EEP_E_BUSY!", "var(--warn)", "var(--warn-bg)", 10)
    s += "</svg>"
    D["hbSvg_1_2"] = s

    s = hb_svg_open("hbSvg_1_3", 820, 250, "Hai máy trạng thái song song của Eep")
    s += hb_pill(25, 14, 370, 26, "Máy Trạng Thái Eep Driver (SWS_Eep)", "var(--pri)", "var(--pri-bg)", 10.5)
    s += hb_box(25, 52, 165, 48, "MEMIF_UNINIT", "Trước Eep_Init()", "var(--err)", "var(--err-bg)", "var(--err)")
    s += hb_box(230, 52, 165, 48, "MEMIF_IDLE", "Sẵn sàng nhận lệnh", "var(--ok)", "var(--ok-bg)", "var(--ok)")
    s += hb_box(25, 128, 165, 48, "MEMIF_BUSY", "Đang chạy Chunk", "var(--warn)", "var(--warn-bg)", "var(--warn)")
    s += hb_box(230, 128, 165, 48, "JOB_FAILED / CANC", "Báo Error CBK", "var(--pur)", "var(--pur-bg)", "var(--pur)")
    s += hb_arrow("hbSvg_1_3", "M 190 76 L 226 76", "var(--ok)")
    s += hb_arrow("hbSvg_1_3", "M 260 100 L 145 124", "var(--warn)")
    s += hb_arrow("hbSvg_1_3", "M 190 152 L 226 152", "var(--pur)")

    s += hb_pill(425, 14, 370, 26, "Máy Trạng Thái EEPROM HW / SPI", "var(--cyan)", "var(--cyan-bg)", 10.5)
    s += hb_box(425, 52, 165, 48, "HW_READY_IDLE", "Chip / SPI rảnh", "var(--ok)", "var(--panel-2)", "var(--ok)")
    s += hb_box(630, 52, 165, 48, "SPI_WREN (0x06)", "Mở khóa Write Latch", "var(--cyan)", "var(--cyan-bg)", "var(--cyan)")
    s += hb_box(425, 128, 165, 48, "WIP_BUSY = 1", "Bơm điện áp ~5ms", "var(--warn)", "var(--warn-bg)", "var(--warn)")
    s += hb_box(630, 128, 165, 48, "READBACK_VERIFY", "Đọc lại kiểm khớp", "var(--pri)", "var(--pri-bg)", "var(--pri)")
    s += hb_arrow("hbSvg_1_3", "M 590 76 L 626 76", "var(--cyan)")
    s += hb_arrow("hbSvg_1_3", "M 712 100 L 540 124", "var(--warn)")
    s += hb_arrow("hbSvg_1_3", "M 590 152 L 626 152", "var(--pri)")
    s += hb_pill(25, 198, 770, 32, "Thanh ghi A giám sát Driver State (Bit 7..0) · Thanh ghi B giám sát Hardware WREN/WIP/Verify (Bit 7..0)", "var(--txt)", "var(--panel-2)", 10)
    s += "</svg>"
    D["hbSvg_1_3"] = s

    # ---------------- TOPIC 2: WRITE, ERASE, VERIFY & COMPARE ----------------
    s = hb_svg_open("hbSvg_2_1", 820, 235, "Cơ chế EepWriteCycleReduction giảm mài mòn EEPROM")
    s += hb_box(25, 25, 185, 54, "1. Eep_Write Chunk", "Dữ liệu RAM nguồn", "var(--pri)", "var(--pri-bg)", "var(--pri)")
    s += hb_box(250, 25, 220, 54, "2. Read Cell Trước Khi Ghi", "So sánh RAM vs EEPROM", "var(--cyan)", "var(--cyan-bg)", "var(--cyan)")
    s += hb_arrow("hbSvg_2_1", "M 210 52 L 246 52", "var(--cyan)")
    s += hb_box(530, 16, 260, 52, "YES (Giống 100%): SKIP!", "Không Erase/Write -> 0 Cycle", "var(--ok)", "var(--ok-bg)", "var(--ok)")
    s += hb_box(530, 94, 260, 52, "NO (Có Byte Khác): WRITE", "WREN + Program + +1 Cycle", "var(--warn)", "var(--warn-bg)", "var(--warn)")
    s += hb_arrow("hbSvg_2_1", "M 470 42 L 526 42", "var(--ok)")
    s += hb_arrow("hbSvg_2_1", "M 470 64 L 526 116", "var(--warn)")
    s += hb_pill(25, 172, 765, 38, "Lợi ích Automotive: Kéo dài tuổi thọ silicon EEPROM từ 100k lên gấp nhiều lần khi NvM_WriteAll()", "var(--ok)", "var(--ok-bg)", 10)
    s += "</svg>"
    D["hbSvg_2_1"] = s

    s = hb_svg_open("hbSvg_2_2", 820, 240, "Phân biệt 3 cơ chế Verify & Compare trong Eep")
    s += hb_box(25, 24, 240, 82, "Write Verify [00054]", "Sau khi ghi -> đọc ngược RAM", "var(--ok)", "var(--ok-bg)", "var(--ok)")
    s += hb_box(290, 24, 240, 82, "Erase Verify [00053]", "Sau khi xóa -> kiểm tra 0xFF", "var(--cyan)", "var(--cyan-bg)", "var(--cyan)")
    s += hb_box(555, 24, 240, 82, "Eep_Compare() [00056]", "Đọc đối chiếu không ghi đè", "var(--pur)", "var(--pur-bg)", "var(--pur)")
    s += hb_pill(25, 134, 240, 40, "Lỗi -> DEM EEP_E_WRITE_FAILED", "var(--err)", "var(--err-bg)", 9.5)
    s += hb_pill(290, 134, 240, 40, "Lỗi -> DEM EEP_E_ERASE_FAILED", "var(--err)", "var(--err-bg)", 9.5)
    s += hb_pill(555, 134, 240, 40, "Lệch -> MEMIF_BLOCK_INCONSISTENT", "var(--warn)", "var(--warn-bg)", 9.5)
    s += hb_arrow("hbSvg_2_2", "M 145 106 L 145 130", "var(--err)")
    s += hb_arrow("hbSvg_2_2", "M 410 106 L 410 130", "var(--err)")
    s += hb_arrow("hbSvg_2_2", "M 675 106 L 675 130", "var(--warn)")
    s += hb_pill(25, 192, 770, 30, "Mẹo nhớ: Compare sai chỉ báo INCONSISTENT (lệch logic), không đổ lỗi phần cứng Dem!", "var(--pri)", "var(--panel-2)", 10)
    s += "</svg>"
    D["hbSvg_2_2"] = s

    s = hb_svg_open("hbSvg_2_3", 820, 230, "Ea tách 1 Ea_Write thành 3 Sub-Jobs Eep_Write")
    s += hb_box(25, 22, 165, 58, "Ea_Write(Blk#4)", "1 yêu cầu từ NvM", "var(--cyan)", "var(--cyan-bg)", "var(--cyan)")
    s += hb_box(225, 22, 175, 58, "Sub-Job 1: Header", "Eep_Write(0x50, 0xA5, 4B)", "var(--pri)", "var(--pri-bg)", "var(--pri)")
    s += hb_box(425, 22, 175, 58, "Sub-Job 2: Payload", "Eep_Write(0x54, Data, 8B)", "var(--warn)", "var(--warn-bg)", "var(--warn)")
    s += hb_box(625, 22, 170, 58, "Sub-Job 3: Footer", "Eep_Write(0x5C, 0x5A, 4B)", "var(--ok)", "var(--ok-bg)", "var(--ok)")
    s += hb_arrow("hbSvg_2_3", "M 190 51 L 221 51", "var(--pri)")
    s += hb_arrow("hbSvg_2_3", "M 400 51 L 421 51", "var(--warn)")
    s += hb_arrow("hbSvg_2_3", "M 600 51 L 621 51", "var(--ok)")
    s += hb_pill(25, 118, 770, 42, "Bố cục vật lý 16B Blk#4: [0x50..53 Hdr 0xA5] | [0x54..5B Data Odometer] | [0x5C..5F Ftr 0x5A]", "var(--txt)", "var(--panel-2)", 10)
    s += hb_pill(25, 174, 770, 34, "Nếu mất nguồn ở Sub-Job 2: Footer chưa có 0x5A -> Lần bật máy sau Ea phát hiện Block lỗi rách!", "var(--err)", "var(--err-bg)", 10)
    s += "</svg>"
    D["hbSvg_2_3"] = s

    # ---------------- TOPIC 3: INTERNAL VS EXTERNAL SPI HW ----------------
    s = hb_svg_open("hbSvg_3_1", 820, 240, "Kiến trúc Internal On-Chip EEPROM vs External SPI EEPROM")
    s += hb_box(25, 20, 175, 115, "Eep Driver Core", "API, State Machine, Verify", "var(--pri)", "var(--pri-bg)", "var(--pri)")
    s += hb_box(255, 20, 240, 52, "Nhánh A: Internal On-Chip", "Direct Reg: EECTRL / EEDATA", "var(--pur)", "var(--pur-bg)", "var(--pur)")
    s += hb_box(255, 86, 240, 52, "Nhánh B: External SPI Driver", "Spi_SetupEB + AsyncTransmit", "var(--cyan)", "var(--cyan-bg)", "var(--cyan)")
    s += hb_box(545, 20, 245, 52, "MCU Silicon EEPROM", "Không qua bus ngoại vi", "var(--ok)", "var(--panel-2)", "var(--ok)")
    s += hb_box(545, 86, 245, 52, "Chip 25LC256 / M95256", "SPI MOSI/MISO/CLK/CS", "var(--ok)", "var(--panel-2)", "var(--ok)")
    s += hb_arrow("hbSvg_3_1", "M 200 50 L 251 46", "var(--pur)")
    s += hb_arrow("hbSvg_3_1", "M 200 105 L 251 112", "var(--cyan)")
    s += hb_arrow("hbSvg_3_1", "M 495 46 L 541 46", "var(--ok)")
    s += hb_arrow("hbSvg_3_1", "M 495 112 L 541 112", "var(--ok)")
    s += hb_pill(25, 168, 765, 42, "Ưu điểm lớp trừu tượng MCAL: Ea bên trên dùng chung 1 API bất kể phần cứng Internal hay SPI!", "var(--pri)", "var(--panel-2)", 10)
    s += "</svg>"
    D["hbSvg_3_1"] = s

    s = hb_svg_open("hbSvg_3_2", 820, 230, "Chuỗi khung lệnh SPI Sequence cho External EEPROM")
    s += hb_box(25, 25, 175, 62, "1. WREN (0x06)", "Bật Latch WEL=1", "var(--cyan)", "var(--cyan-bg)", "var(--cyan)")
    s += hb_box(225, 25, 200, 62, "2. WRITE (0x02)", "Addr16 + Page Bytes", "var(--warn)", "var(--warn-bg)", "var(--warn)")
    s += hb_box(450, 25, 185, 62, "3. Poll RDSR (0x05)", "Đọc Bit 0 WIP=0?", "var(--pri)", "var(--pri-bg)", "var(--pri)")
    s += hb_box(660, 25, 135, 62, "4. READ (0x03)", "Read-Back Verify", "var(--ok)", "var(--ok-bg)", "var(--ok)")
    s += hb_arrow("hbSvg_3_2", "M 200 56 L 221 56", "var(--cyan)")
    s += hb_arrow("hbSvg_3_2", "M 425 56 L 446 56", "var(--warn)")
    s += hb_arrow("hbSvg_3_2", "M 635 56 L 656 56", "var(--ok)")
    s += hb_pill(25, 118, 770, 38, "Chuỗi SPI thực thi bất đồng bộ via Spi_AsyncTransmit(EepSpiSequenceId) [SWS_Eep_00116]", "var(--txt)", "var(--panel-2)", 10)
    s += hb_pill(25, 170, 770, 36, "Cảnh báo phần cứng: Nếu đứt dây MISO, RDSR đọc 0xFF mãi -> WIP=1 -> Timeout EEP_E_TIMEOUT (0x05)!", "var(--err)", "var(--err-bg)", 10)
    s += "</svg>"
    D["hbSvg_3_2"] = s

    s = hb_svg_open("hbSvg_3_3", 820, 235, "Đối chiếu Polling Mode vs Interrupt-Driven Mode")
    s += hb_pill(25, 18, 220, 34, "Polling: EepUseInterrupts=FALSE", "var(--cyan)", "var(--cyan-bg)", 10)
    s += hb_box(265, 16, 250, 42, "SchM 5ms Tick -> 1 Chunk/Tick", "32B SLOW = 4 Ticks (20ms)", "var(--cyan)", "var(--panel-2)", "var(--cyan)")
    s += hb_box(535, 16, 260, 42, "Không cần khóa ISR phức tạp", "Đơn giản, an toàn Task context", "var(--ok)", "var(--panel-2)", "var(--ok)")

    s += hb_pill(25, 92, 220, 34, "Interrupt: EepUseInterrupts=TRUE", "var(--pur)", "var(--pur-bg)", 10)
    s += hb_box(265, 90, 250, 42, "Eep_JobEndIsr() nối tiếp ngay", "32B SLOW = 2 Ticks (10ms!)", "var(--pur)", "var(--pur-bg)", "var(--pur)")
    s += hb_box(535, 90, 260, 42, "Cần SchM_Enter_Exclusive_Area", "Bảo vệ biến Global Job không Race", "var(--warn)", "var(--warn-bg)", "var(--warn)")
    s += hb_arrow("hbSvg_3_3", "M 515 37 L 531 37", "var(--ok)")
    s += hb_arrow("hbSvg_3_3", "M 515 111 L 531 111", "var(--warn)")
    s += hb_pill(25, 168, 770, 42, "Bit 0 Thanh A (ISR_MD) phản ánh trực tiếp trạng thái Polling (0) vs Interrupt-Driven (1) [SWS_Eep_00117]", "var(--pri)", "var(--panel-2)", 10)
    s += "</svg>"
    D["hbSvg_3_3"] = s

    # ---------------- TOPIC 4: EEP VS FLS COMPARISON ----------------
    s = hb_svg_open("hbSvg_4_1", 820, 245, "Khác biệt vật lý cốt lõi: Eep (EEPROM) vs Fls (Flash)")
    s += hb_box(25, 20, 370, 74, "EEPROM Cell (Eep Driver)", "Sửa từng Byte / 8B · Tự xóa khi ghi · 100k-1M Cycles", "var(--pri)", "var(--pri-bg)", "var(--pri)", 12, 9.5)
    s += hb_box(425, 20, 370, 74, "NOR Flash Sector (Fls Driver)", "Phải Erase cả Sector (4KB-64KB) mới ghi được · ~10k Cycles", "var(--warn)", "var(--warn-bg)", "var(--warn)", 12, 9.5)
    s += hb_pill(25, 114, 370, 36, "Hợp: Odometer, Calib nhỏ, Ghi liên tục", "var(--ok)", "var(--ok-bg)", 10)
    s += hb_pill(425, 114, 370, 36, "Hợp: Dataset lớn, Cost rẻ (DataFlash MCU)", "var(--cyan)", "var(--cyan-bg)", 10)
    s += hb_arrow("hbSvg_4_1", "M 210 94 L 210 110", "var(--ok)")
    s += hb_arrow("hbSvg_4_1", "M 610 94 L 610 110", "var(--cyan)")
    s += hb_pill(25, 174, 770, 44, "Kết luận: EEPROM chi phí/bit cao hơn nhưng đơn giản hơn (không cần Wear-Leveling phức tạp như Fee/Fls)", "var(--txt)", "var(--panel-2)", 10)
    s += "</svg>"
    D["hbSvg_4_1"] = s

    s = hb_svg_open("hbSvg_4_2", 820, 235, "MemIf định tuyến DeviceIndex 0 (Ea+Eep) vs 1 (Fee+Fls)")
    s += hb_box(300, 14, 220, 44, "NvM (Memory Services)", "Không phân biệt EEPROM hay Flash", "var(--pur)", "var(--pur-bg)", "var(--pur)")
    s += hb_box(300, 84, 220, 44, "MemIf (Multiplexer)", "Định tuyến theo DeviceIndex", "var(--warn)", "var(--warn-bg)", "var(--warn)")
    s += hb_arrow("hbSvg_4_2", "M 410 58 L 410 80", "var(--warn)")
    s += hb_box(45, 158, 330, 56, "DeviceIndex = 0: Ea -> Eep", "External SPI / Internal EEPROM Chip", "var(--pri)", "var(--pri-bg)", "var(--pri)")
    s += hb_box(445, 158, 330, 56, "DeviceIndex = 1: Fee -> Fls", "Internal / QSPI Data Flash Sectors", "var(--cyan)", "var(--cyan-bg)", "var(--cyan)")
    s += hb_arrow("hbSvg_4_2", "M 345 128 L 230 154", "var(--pri)")
    s += hb_arrow("hbSvg_4_2", "M 475 128 L 590 154", "var(--cyan)")
    s += "</svg>"
    D["hbSvg_4_2"] = s

    s = hb_svg_open("hbSvg_4_3", 820, 230, "Ma trận đánh đổi kỹ thuật EEPROM vs DataFlash")
    s += hb_pill(25, 20, 180, 34, "Tiêu chí đánh giá", "var(--txt)", "var(--panel-2)", 10.5)
    s += hb_pill(225, 20, 275, 34, "Eep (EEPROM Driver)", "var(--pri)", "var(--pri-bg)", 10.5)
    s += hb_pill(520, 20, 275, 34, "Fls (Flash Driver)", "var(--warn)", "var(--warn-bg)", 10.5)
    s += hb_pill(25, 70, 180, 32, "Đơn vị xóa (Erase Unit)", "var(--mut)", "var(--panel-2)", 9.5)
    s += hb_pill(225, 70, 275, 32, "Nhỏ: 1B .. 8B (Auto-Erase trước Write)", "var(--ok)", "var(--ok-bg)", 9.5)
    s += hb_pill(520, 70, 275, 32, "Rất lớn: 4KB .. 64KB Sector", "var(--err)", "var(--err-bg)", 9.5)
    s += hb_pill(25, 114, 180, 32, "Tốc độ & Chu kỳ xóa", "var(--mut)", "var(--panel-2)", 9.5)
    s += hb_pill(225, 114, 275, 32, "100,000 .. 1,000,000 Write Cycles", "var(--ok)", "var(--ok-bg)", 9.5)
    s += hb_pill(520, 114, 275, 32, "10,000 .. 100,000 Erase/Program", "var(--warn)", "var(--warn-bg)", 9.5)
    s += hb_pill(25, 158, 180, 32, "Mức độ phức tạp Abstraction", "var(--mut)", "var(--panel-2)", 9.5)
    s += hb_pill(225, 158, 275, 32, "Ea đơn giản (3 Sub-Jobs cố định)", "var(--cyan)", "var(--cyan-bg)", 9.5)
    s += hb_pill(520, 158, 275, 32, "Fee rất phức tạp (Swap Sector, Cache)", "var(--pur)", "var(--pur-bg)", 9.5)
    s += "</svg>"
    D["hbSvg_4_3"] = s

    # ---------------- TOPIC 5: API R23-11, ERRORS & 36 ECUC ----------------
    s = hb_svg_open("hbSvg_5_1", 820, 240, "Phân loại 3 tầng lỗi trong AUTOSAR Eep R20-11..R23-11")
    s += hb_box(25, 18, 245, 70, "1. Development Errors (DET)", "Det_ReportError(90, 0, Api, Err)", "var(--warn)", "var(--warn-bg)", "var(--warn)")
    s += hb_pill(25, 108, 245, 36, "0x00 UNINIT · 0x01..0x03 · 0x09/0x0A", "var(--warn)", "var(--panel-2)", 9.5)
    s += hb_box(288, 18, 245, 70, "2. Runtime Errors (R20-11+)", "Det_ReportRuntimeError()", "var(--err)", "var(--err-bg)", "var(--err)")
    s += hb_pill(288, 108, 245, 36, "0x04 BUSY & 0x05 TIMEOUT (Luôn bật!)", "var(--err)", "var(--panel-2)", 9.5)
    s += hb_box(550, 18, 245, 70, "3. Extended Prod Errors (DEM)", "Dem_SetEventStatus()", "var(--pur)", "var(--pur-bg)", "var(--pur)")
    s += hb_pill(550, 108, 245, 36, "WRITE / READ / ERASE / CMP_FAILED", "var(--pur)", "var(--panel-2)", 9.5)
    s += hb_arrow("hbSvg_5_1", "M 147 88 L 147 104", "var(--warn)")
    s += hb_arrow("hbSvg_5_1", "M 410 88 L 410 104", "var(--err)")
    s += hb_arrow("hbSvg_5_1", "M 672 88 L 672 104", "var(--pur)")
    s += hb_pill(25, 166, 770, 46, "Lưu ý cực kỳ quan trọng: Tắt EepDevErrorDetect chỉ tắt nhóm 1 (DET), KHÔNG tắt nhóm 2 (Runtime) & nhóm 3 (DEM)!", "var(--err)", "var(--err-bg)", 10)
    s += "</svg>"
    D["hbSvg_5_1"] = s

    s = hb_svg_open("hbSvg_5_2", 820, 235, "Cấu trúc 6 nhóm ECUC 36 tham số cấu hình Eep")
    s += hb_box(25, 18, 245, 58, "Tab 1: EepGeneral (7)", "DevErr, VerInfo, ISR, CycleRed, Tick", "var(--pri)", "var(--pri-bg)", "var(--pri)")
    s += hb_box(288, 18, 245, 58, "Tab 2: Mode & Chunk (6)", "Default/CurrentMode, Rd/Wr Chunk", "var(--cyan)", "var(--cyan-bg)", "var(--cyan)")
    s += hb_box(550, 18, 245, 58, "Tab 3: Layout & Units (8)", "Base, Size, EraseVal, Unit, Cycles", "var(--ok)", "var(--ok-bg)", "var(--ok)")
    s += hb_box(25, 98, 245, 58, "Tab 4: HW Int/SPI (5)", "Int vs Ext SPI, SeqId, Write/EraseMs", "var(--pur)", "var(--pur-bg)", "var(--pur)")
    s += hb_box(288, 98, 245, 58, "Tab 5: Cbk & Dem (5)", "JobEnd/ErrorNotif, DemReportEn", "var(--warn)", "var(--warn-bg)", "var(--warn)")
    s += hb_box(550, 98, 245, 58, "Tab 6: Fault & Timeout (5)", "Write/EraseVerify, Stuck, Tmo, DET", "var(--err)", "var(--err-bg)", "var(--err)")
    s += hb_pill(25, 178, 770, 36, "Tổng cộng 36 tham số tương tác trực tiếp với Simulator & xuất file Eep.arxml / Eep_Cfg.h / Eep_PBcfg.c", "var(--pri)", "var(--panel-2)", 10)
    s += "</svg>"
    D["hbSvg_5_2"] = s

    s = hb_svg_open("hbSvg_5_3", 820, 230, "Luồng Eep_Cancel() cắt ngang lệnh nền để ghi Crash Immediate")
    s += hb_box(25, 24, 175, 56, "1. Job nền 32B", "MEMIF_BUSY @ 0x0030", "var(--warn)", "var(--warn-bg)", "var(--warn)")
    s += hb_box(225, 24, 185, 56, "2. Eep_Cancel()", "Hủy ngay 24B còn lại", "var(--pur)", "var(--pur-bg)", "var(--pur)")
    s += hb_box(435, 24, 175, 56, "3. CANCELED CBK", "Ea_JobErrorNotification", "var(--err)", "var(--err-bg)", "var(--err)")
    s += hb_box(635, 24, 160, 56, "4. Ghi Crash 8B", "Immediate @ 0x0050", "var(--ok)", "var(--ok-bg)", "var(--ok)")
    s += hb_arrow("hbSvg_5_3", "M 200 52 L 221 52", "var(--pur)")
    s += hb_arrow("hbSvg_5_3", "M 410 52 L 431 52", "var(--err)")
    s += hb_arrow("hbSvg_5_3", "M 610 52 L 631 52", "var(--ok)")
    s += hb_pill(25, 118, 770, 42, "Khi Eep_Cancel() chạy: Driver -> MEMIF_IDLE, JobResult -> MEMIF_JOB_CANCELED, Bit 2 Thanh A sáng tím!", "var(--pur)", "var(--pur-bg)", 10)
    s += hb_pill(25, 172, 770, 36, "Nếu gọi Eep_Cancel() khi MEMIF_IDLE: giữ an toàn No-op | Khi MEMIF_UNINIT: báo DET 0x00 EEP_E_UNINIT", "var(--txt)", "var(--panel-2)", 10)
    s += "</svg>"
    D["hbSvg_5_3"] = s

    return D
