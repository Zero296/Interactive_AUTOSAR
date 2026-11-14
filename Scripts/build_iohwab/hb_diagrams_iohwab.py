# -*- coding: utf-8 -*-
"""18 Theme-Aware Inline SVG Diagrams for AUTOSAR IoHwAb Technical Handbook."""

from xml.sax.saxutils import escape

FONT_FAMILY = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif"
MONO_FAMILY = "'Cascadia Code', 'Fira Code', Consolas, monospace"


def svg_wrap(inner: str, width: int = 820, height: int = 230, title: str = "") -> str:
    title_el = f"<title>{escape(title)}</title>" if title else ""
    return (
        f'<svg class="hb-svg" viewBox="0 0 {width} {height}" width="100%" '
        f'style="max-width:{width}px;height:auto;display:block;margin:10px auto;'
        f'background:var(--hb-bg);border:1px solid var(--hb-bdr);border-radius:10px" '
        f'xmlns="http://www.w3.org/2000/svg">{title_el}'
        f'<defs>'
        f'<marker id="hbArr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">'
        f'<path d="M 0 1 L 10 5 L 0 9 z" fill="var(--hb-pri)"/></marker>'
        f'<marker id="hbArrOk" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">'
        f'<path d="M 0 1 L 10 5 L 0 9 z" fill="var(--hb-ok)"/></marker>'
        f'<marker id="hbArrErr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">'
        f'<path d="M 0 1 L 10 5 L 0 9 z" fill="var(--hb-err)"/></marker>'
        f'<marker id="hbArrWarn" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">'
        f'<path d="M 0 1 L 10 5 L 0 9 z" fill="var(--hb-warn)"/></marker>'
        f'</defs>{inner}</svg>'
    )


def box_ml(x: int, y: int, w: int, h: int, title: str, lines: list[str],
           stroke: str = "var(--hb-bdr)", fill: str = "var(--hb-card)",
           title_color: str = "var(--hb-pri)", rx: int = 8) -> str:
    cx = x + w / 2.0
    parts = [
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="1.6"/>'
    ]
    ty = y + 20 if lines else y + h / 2.0 + 4
    parts.append(
        f'<text x="{cx}" y="{ty}" text-anchor="middle" fill="{title_color}" '
        f'font-family="{FONT_FAMILY}" font-size="11.5" font-weight="700" data-box-w="{w}">{escape(title)}</text>'
    )
    for i, ln in enumerate(lines):
        ly = y + 37 + i * 14
        parts.append(
            f'<text x="{cx}" y="{ly}" text-anchor="middle" fill="var(--hb-mut)" '
            f'font-family="{FONT_FAMILY}" font-size="9.8" data-box-w="{w}">{escape(ln)}</text>'
        )
    return "".join(parts)


def pill_label(cx: float, cy: float, text: str, bg: str = "var(--hb-card2)",
               color: str = "var(--hb-txt)", border: str = "var(--hb-bdr)",
               w: int = 110, h: int = 18) -> str:
    px = cx - w / 2.0
    py = cy - h / 2.0
    return (
        f'<g class="hb-pill" data-px="{px:.1f}" data-py="{py:.1f}" data-pw="{w}" data-ph="{h}">'
        f'<rect x="{px:.1f}" y="{py:.1f}" width="{w}" height="{h}" rx="9" fill="{bg}" stroke="{border}" stroke-width="1"/>'
        f'<text x="{cx:.1f}" y="{cy + 3.5:.1f}" text-anchor="middle" fill="{color}" '
        f'font-family="{MONO_FAMILY}" font-size="9.2" font-weight="700" data-box-w="{w}">{escape(text)}</text>'
        f'</g>'
    )


def arrow_line(x1: float, y1: float, x2: float, y2: float,
               color: str = "var(--hb-pri)", marker: str = "url(#hbArr)", dashed: bool = False) -> str:
    dash = ' stroke-dasharray="5,3"' if dashed else ""
    return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="1.8" marker-end="{marker}"{dash}/>'


def title_bar(text: str, width: int = 820) -> str:
    return (
        f'<text x="{width/2}" y="20" text-anchor="middle" fill="var(--hb-txt)" '
        f'font-family="{FONT_FAMILY}" font-size="12.5" font-weight="800" data-box-w="{width-20}">{escape(text)}</text>'
    )


def get_hb_diagrams() -> dict[str, str]:
    d = {}

    # ==================== TAB 0: ARCHITECTURE & RESPONSIBILITIES ====================
    inner = [
        title_bar("Tầng Trừu Tượng AUTOSAR: SWC (Đơn Vị Vật Lý) ↔ RTE ↔ IoHwAb ↔ MCAL (Thanh Ghi)"),
        box_ml(30, 36, 165, 76, "SWC Application", ["PedalPct (0..100%)", "BrakePressed (Bool)", "TargetThrottle (%)"], "var(--hb-pri)", "var(--hb-card)", "var(--hb-pri)"),
        box_ml(235, 36, 130, 76, "RTE (VFB)", ["C/S Port Mapping", "Rte_Call_RpIoHwAb", "E_OK / E_NOT_OK"], "var(--hb-pur)", "var(--hb-card)", "var(--hb-pur)"),
        box_ml(405, 36, 195, 76, "IoHwAb (ECUAL)", ["Scaling & Ratiometric", "IIR Filter & Debounce", "0x8000 & Safety Mux"], "var(--hb-ok)", "var(--hb-card2)", "var(--hb-ok)"),
        box_ml(640, 36, 150, 76, "MCAL & MCU Pins", ["Adc / Dio / Pwm / Icu", "SAR 12-bit Raw", "Pin mV / Timer Tick"], "var(--hb-warn)", "var(--hb-card)", "var(--hb-warn)"),
        arrow_line(195, 74, 233, 74),
        arrow_line(365, 74, 403, 74),
        arrow_line(600, 74, 638, 74),
        pill_label(215, 132, "Physical Unit", "var(--hb-card2)", "var(--hb-pri)", "var(--hb-pri)", 95),
        pill_label(502, 132, "HW Independent Boundary", "var(--hb-card2)", "var(--hb-ok)", "var(--hb-ok)", 165),
        pill_label(715, 132, "MCU Specific", "var(--hb-card2)", "var(--hb-warn)", "var(--hb-warn)", 95),
        box_ml(30, 154, 760, 44, "Lợi Ích Thiết Kế Tái Sử Dụng (VFB Independence)", ["Đổi chip MCU hoặc đổi chân P02.3 -> P05.1 chỉ cập nhật ECUC/IoHwAb, mã nguồn SWC giữ nguyên 100%."], "var(--hb-bdr)")
    ]
    d["hb_0_layers"] = svg_wrap("".join(inner), 820, 212)

    inner = [
        title_bar("Chuẩn Giao Tiếp Client-Server & Luồng Dữ Liệu Hai Chiều Trong F9"),
        box_ml(30, 42, 210, 62, "1. Read Sensor Path", ["SWC gọi Rte_Call_Pedal()", "Trả: 50.0% + QUAL_GOOD"], "var(--hb-ok)", "var(--hb-card)", "var(--hb-ok)"),
        box_ml(305, 42, 210, 62, "2. IoHwAb Service Core", ["Adc_ReadGroup() -> 2048", "Calc + Filter + Diag Check"], "var(--hb-pri)", "var(--hb-card2)", "var(--hb-pri)"),
        box_ml(580, 42, 210, 62, "3. Write Actuator Path", ["SWC gọi SetDuty(50% FWD)", "IoHwAb -> Pwm(0x4000) + Dio"], "var(--hb-pur)", "var(--hb-card)", "var(--hb-pur)"),
        arrow_line(240, 73, 303, 73, "var(--hb-ok)", "url(#hbArrOk)"),
        arrow_line(515, 73, 578, 73),
        box_ml(30, 132, 360, 58, "Sensor Qualifier Contract", ["GOOD: Đáng tin | DEGRADED: V5V sụt", "FAULT: DEM Failed -> Substituted Value"], "var(--hb-cyan)"),
        box_ml(430, 132, 360, 58, "Cross-Driver Coordination", ["1 hàm IoHwAb điều phối cả Dio (DIR/EN)", "lẫn Pwm (Duty) hoặc đọc Adc ISENSE"], "var(--hb-warn)")
    ]
    d["hb_0_cs_interface"] = svg_wrap("".join(inner), 820, 206)

    inner = [
        title_bar("Trình Tự Khởi Tạo Bắt Buộc Trong EcuM_StartupTwo / BswM"),
        box_ml(25, 44, 155, 62, "B1. Port_Init()", ["Định hướng IN/OUT", "Cấu hình Pull-Up/Alt"], "var(--hb-cyan)"),
        box_ml(220, 44, 175, 62, "B2. MCAL Drivers Init", ["Adc_Init, Pwm_Init", "Icu_Init, Spi_Init"], "var(--hb-pri)"),
        box_ml(435, 44, 175, 62, "B3. IoHwAb_Init()", ["Bật Bit7 INIT = 1", "Mở khóa Actuator"], "var(--hb-ok)", "var(--hb-card2)", "var(--hb-ok)"),
        box_ml(650, 44, 145, 62, "B4. OS Schedule", ["MainFunction 5ms", "RTE Runnables Run"], "var(--hb-pur)"),
        arrow_line(180, 75, 218, 75),
        arrow_line(395, 75, 433, 75, "var(--hb-ok)", "url(#hbArrOk)"),
        arrow_line(610, 75, 648, 75),
        box_ml(25, 134, 770, 52, "Cảnh Báo Sai Thứ Tự: DET IOHWAB_E_UNINIT (0x01)", ["Gọi IoHwAb trước B3 -> Bit7 INIT=0 -> Trả E_NOT_OK, ghi Det_ReportError(254, 0, API, 0x01), giữ Actuator IDLE."], "var(--hb-err)", "var(--hb-card)", "var(--hb-err)")
    ]
    d["hb_0_init_seq"] = svg_wrap("".join(inner), 820, 202)

    # ==================== TAB 1: ANALOG CHAIN & RATIOMETRIC ====================
    inner = [
        title_bar("Chuỗi Xử Lý Tín Hiệu Analog 5 Tầng (Chân P02.3 -> SWC Pedal %)"),
        box_ml(18, 44, 118, 66, "Pin Analog", ["2500 mV", "(0..5000mV)"], "var(--hb-warn)"),
        box_ml(154, 44, 122, 66, "SAR ADC 12b", ["Raw = 2048", "(0..4095)"], "var(--hb-pri)"),
        box_ml(294, 44, 128, 66, "Ratiometric", ["× 5000 / V_5V", "Chống trôi áp"], "var(--hb-cyan)"),
        box_ml(440, 44, 124, 66, "Linear Scale", ["× Gain + Off", "0.025 / -12.5"], "var(--hb-ok)"),
        box_ml(582, 44, 118, 66, "IIR Filter", ["EMA α = 0.40", "Lọc gai nhiễu"], "var(--hb-pur)"),
        box_ml(718, 44, 86, 66, "SWC RTE", ["50.0 %", "GOOD"], "var(--hb-ok)", "var(--hb-card2)", "var(--hb-ok)"),
        arrow_line(136, 77, 152, 77),
        arrow_line(276, 77, 292, 77),
        arrow_line(422, 77, 438, 77),
        arrow_line(564, 77, 580, 77),
        arrow_line(700, 77, 716, 77, "var(--hb-ok)", "url(#hbArrOk)"),
        box_ml(18, 134, 786, 52, "Chế Độ Fallback Cho Tầng Thấp Hơn", ["Kiểm tra ngưỡng Short-to-GND (<250mV) và Short-to-Bat (>4750mV) được thực hiện ngay sau SAR ADC trước khi đưa qua Bộ lọc IIR."], "var(--hb-bdr)")
    ]
    d["hb_1_adc_chain"] = svg_wrap("".join(inner), 820, 200)

    inner = [
        title_bar("Bù Trừ Tỷ Lệ Nguồn 5V Ratiometric: Giữ Đúng 50.0% Khi Nguồn Sụt 4.8V"),
        box_ml(25, 40, 240, 72, "Tình Huống Nguồn Sụt Áp", ["V5V_Ref sụt 5000mV -> 4800mV", "Chân giữa biến trở đọc 2400mV", "(Thay vì 2500mV lúc đủ 5V)"], "var(--hb-warn)"),
        box_ml(295, 40, 235, 72, "Không Có Ratiometric Comp", ["Pin 2400mV × 0.025 - 12.5", "= 47.5% (SAI LỆCH -2.5%!)", "Mặc dù tài xế vẫn giữ 50% chân ga"], "var(--hb-err)", "var(--hb-card)", "var(--hb-err)"),
        box_ml(560, 40, 235, 72, "Có Bù Ratiometric IoHwAb", ["V_comp = 2400 × (5000 / 4800)", "= 2500.0 mV -> 50.0% ĐÚNG!", "Tự khóa nếu V5V ngoài 4750..5250"], "var(--hb-ok)", "var(--hb-card2)", "var(--hb-ok)"),
        arrow_line(265, 76, 293, 76, "var(--hb-err)", "url(#hbArrErr)"),
        arrow_line(530, 76, 558, 76, "var(--hb-ok)", "url(#hbArrOk)"),
        box_ml(25, 134, 770, 52, "Điều Kiện Áp Dụng (Safety Guard)", ["Chỉ áp dụng Ratiometric cho cảm biến tỷ lệ nguồn (Hall/Biến trở), KHÔNG dùng cho cảm biến áp tuyệt đối (vd Thermistor nội áp)."], "var(--hb-cyan)")
    ]
    d["hb_1_ratiometric"] = svg_wrap("".join(inner), 820, 200)

    inner = [
        title_bar("Bộ Lọc Số Thông Thấp IIR EMA: y[n] = α · x[n] + (1 − α) · y[n−1]"),
        box_ml(25, 42, 230, 72, "Mẫu Bước Nhảy (Step Input)", ["t=0ms: 50% -> nhảy 80%", "Hoặc gai nhiễu EMI 1 tick", "α nhỏ (0.15) lọc rất êm"], "var(--hb-warn)"),
        box_ml(285, 42, 250, 72, "Phép Tính EMA Tiết Kiệm RAM", ["α = 0.40, 1−α = 0.60", "Tick 1: 0.4×80 + 0.6×50 = 62.0%", "Chỉ cần 1 biến static lastFiltered"], "var(--hb-pri)", "var(--hb-card2)", "var(--hb-pri)"),
        box_ml(565, 42, 230, 72, "Hội Tụ & Bit IIR_SETTLED", ["Tick 2: 69.2% -> Tick 5: 77.7%", "|Inst - Filtered| < 0.5%", "-> Bật Thanh A Bit4 IIR_SETTLED"], "var(--hb-ok)", "var(--hb-card)", "var(--hb-ok)"),
        arrow_line(255, 78, 283, 78),
        arrow_line(535, 78, 563, 78, "var(--hb-ok)", "url(#hbArrOk)"),
        box_ml(25, 134, 770, 52, "Lưu Ý Tích Hợp Thời Gian Thực", ["Gai nhiễu đơn lẻ 100% rồi về 50% chỉ làm đầu ra nhích 1×0.4=70% rồi tụt về ngay, bảo vệ SWC không giật ga."], "var(--hb-pur)")
    ]
    d["hb_1_iir_ema"] = svg_wrap("".join(inner), 820, 200)

    # ==================== TAB 2: DIO, PWM & ICU ====================
    inner = [
        title_bar("Xử Lý DIO Input: Điện Trở Kéo Pull-Up + Đảo Cực Active-Low + Debounce 15ms"),
        box_ml(22, 42, 180, 68, "Công Tắc Nối Mass", ["Nhấn phanh -> Kéo 0V", "Dio_Read() = STD_LOW", "Gai cơ khí 5..10ms"], "var(--hb-warn)"),
        box_ml(232, 42, 175, 68, "Đảo Cực Active-Low", ["ACTIVE_LOW biến", "STD_LOW -> RawActive=1", "STD_HIGH -> RawActive=0"], "var(--hb-cyan)"),
        box_ml(437, 42, 185, 68, "Bộ Đếm Debounce", ["MainFn = 5ms, Target=15ms", "Cần 3 ticks ổn định liên tiếp", "Nhả nhiễu <15ms -> Reset 0"], "var(--hb-pri)", "var(--hb-card2)", "var(--hb-pri)"),
        box_ml(652, 42, 146, 68, "Output Lên SWC", ["Bit3 DBNC = 1", "BrakePressed=TRUE", "Tin cậy 100%"], "var(--hb-ok)"),
        arrow_line(202, 76, 230, 76),
        arrow_line(407, 76, 435, 76),
        arrow_line(622, 76, 650, 76, "var(--hb-ok)", "url(#hbArrOk)"),
        box_ml(22, 132, 776, 52, "Output Readback Hardware Integrity Check (Dio_Write + Dio_Read)", ["Sau khi Dio_WriteChannel(RELAY, HIGH), IoHwAb đọc ngay lại chân; nếu đọc được LOW -> Báo DEM Stuck-at-GND Fault."], "var(--hb-bdr)")
    ]
    d["hb_2_dio_dbnc"] = svg_wrap("".join(inner), 820, 200)

    inner = [
        title_bar("Chuẩn Hóa PWM 15-bit (0x0000..0x8000), Kẹp Clamp 5..95% & Cầu H"),
        box_ml(22, 42, 175, 70, "SWC Request", ["TargetThrottle = +99%", "hoặc -65% REVERSE", "Đơn vị phần trăm"], "var(--hb-pri)"),
        box_ml(225, 42, 195, 70, "Safety Duty Clamp", ["Khoảng an toàn: 5%..95%", "+99% kẹp xuống 95.0%", "Bật Bit2 PWM_CLAMPED"], "var(--hb-warn)", "var(--hb-card2)", "var(--hb-warn)"),
        box_ml(448, 42, 175, 70, "15-bit AUTOSAR Scale", ["DutyHex = % × 0x8000", "50% = 0x4000 (16384)", "95% = 0x799A | 100%=0x8000"], "var(--hb-pur)"),
        box_ml(650, 42, 148, 70, "H-Bridge MCAL", ["Dio_Write(DIR,H/L)", "Pwm_SetDutyCycle()", "End-Period Reload"], "var(--hb-ok)"),
        arrow_line(197, 77, 223, 77),
        arrow_line(420, 77, 446, 77),
        arrow_line(623, 77, 648, 77, "var(--hb-ok)", "url(#hbArrOk)"),
        box_ml(22, 132, 776, 52, "Tại Sao Phải Clamp 5%..95% Trên Cầu H?", ["Driver MOSFET High-Side dùng tụ Bootstrap cần chu kỳ thấp tối thiểu (~5% off-time) để nạp lại điện tích kích dẫn."], "var(--hb-cyan)")
    ]
    d["hb_2_pwm_hbridge"] = svg_wrap("".join(inner), 820, 200)

    inner = [
        title_bar("Đo Xung ICU Timer 1MHz -> Quy Đổi Wheel Speed RPM & Phát Hiện Stall"),
        box_ml(24, 42, 180, 68, "Cảm Biến Đĩa Răng", ["Tone Wheel 20 răng", "Tạo xung Hall 500 Hz", "Duty Cycle = 40%"], "var(--hb-cyan)"),
        box_ml(234, 42, 185, 68, "MCAL Icu Timer 1MHz", ["PeriodTime = 2000 ticks", "ActiveTime = 800 ticks", "F = 1,000,000 / 2000"], "var(--hb-pri)", "var(--hb-card2)", "var(--hb-pri)"),
        box_ml(449, 42, 185, 68, "IoHwAb Speed Formula", ["RPM = (Freq × 60) / Teeth", "(500 × 60) / 20 = 1500", "Giấu số răng khỏi SWC"], "var(--hb-ok)"),
        box_ml(664, 42, 132, 68, "Stall Timeout", ["Mất xung > 50ms", "-> Ép 0 RPM", "Bit1 ICU_CAP = 0"], "var(--hb-err)"),
        arrow_line(204, 76, 232, 76),
        arrow_line(419, 76, 447, 76, "var(--hb-ok)", "url(#hbArrOk)"),
        arrow_line(634, 76, 662, 76, "var(--hb-err)", "url(#hbArrErr)"),
        box_ml(24, 132, 772, 52, "HAI CHẾ ĐỘ ICU TRONG AUTOSAR", ["ICU_MODE_SIGNAL_MEASUREMENT dùng đọc Duty+Period cùng lúc; ICU_MODE_EDGE_COUNTER tối ưu đếm quãng đường Odometer."], "var(--hb-bdr)")
    ]
    d["hb_2_icu_rpm"] = svg_wrap("".join(inner), 820, 200)

    # ==================== TAB 3: ELECTRICAL DIAG, DEM & FIM ====================
    inner = [
        title_bar("Cửa Sổ Chẩn Đoán Điện Áp Cảm Biến 0..5000 mV (Live Diagnostic Window)"),
        box_ml(24, 44, 165, 68, "Short-to-GND", ["0 .. 249 mV", "Thanh B Bit7 = 1", "Đứt dây/Chạm mass"], "var(--hb-err)", "var(--hb-card)", "var(--hb-err)"),
        box_ml(198, 44, 92, 68, "Vùng Đệm", ["250..499mV", "Chưa lỗi SCG", "Clamp 0.0%"], "var(--hb-warn)"),
        box_ml(299, 44, 222, 68, "Vùng Vận Hành Chuẩn", ["500 .. 4500 mV (0% .. 100%)", "Bình thường & Bù Ratiometric", "Qual = VALID / GOOD"], "var(--hb-ok)", "var(--hb-card2)", "var(--hb-ok)"),
        box_ml(530, 44, 95, 68, "Vùng Đệm", ["4501..4750", "Clamp 100%", "Giám sát"], "var(--hb-warn)"),
        box_ml(634, 44, 162, 68, "Short-to-Bat", ["4751 .. 5000 mV", "Thanh B Bit6 = 1", "Chặn lỗi 100% ga"], "var(--hb-err)", "var(--hb-card)", "var(--hb-err)"),
        box_ml(24, 134, 772, 52, "Thiết Kế Vùng Chết (Dead-Band 500mV & 4500mV)", ["Cảm biến ô tô cố ý không dùng sát 0V và 5V để ECU phân biệt được đạp ga 0% (500mV) với đứt dây Mass (0..120mV)!"], "var(--hb-pri)")
    ]
    d["hb_3_diag_window"] = svg_wrap("".join(inner), 820, 200)

    inner = [
        title_bar("Cơ Chế Lọc Lỗi DEM Debounce & Chính Sách Thay Thế (Substitution)"),
        box_ml(24, 42, 165, 68, "Lỗi Phần Cứng", ["Pin < 250mV", "hoặc > 4750mV", "hoặc OCP > 8A"], "var(--hb-err)"),
        box_ml(219, 42, 195, 68, "DEM PreFailed Counter", ["Tick 1: PREFAILED (1/3)", "Tick 2: PREFAILED (2/3)", "Chưa thay thế giá trị"], "var(--hb-warn)", "var(--hb-card2)", "var(--hb-warn)"),
        box_ml(444, 42, 175, 68, "Xác Nhận FAILED", ["Tick 3 đạt ngưỡng", "Thanh B Bit2 = 1", "Lưu DTC vào NvM"], "var(--hb-err)"),
        box_ml(649, 42, 147, 68, "Thay Thế An Toàn", ["USE_REPLACE: 10%", "HOLD_LAST_VALID", "hoặc RAW+FAULT"], "var(--hb-pur)"),
        arrow_line(189, 76, 217, 76, "var(--hb-warn)", "url(#hbArrWarn)"),
        arrow_line(414, 76, 442, 76, "var(--hb-err)", "url(#hbArrErr)"),
        arrow_line(619, 76, 647, 76),
        box_ml(24, 132, 772, 52, "Phục Hồi Tự Động (Healing)", ["Khi áp trở về vùng sạch 500..4500mV và đếm đủ số ticks tốt -> Dem_SetEventStatus(PASSED), nhả thay thế."], "var(--hb-ok)")
    ]
    d["hb_3_dem_debounce"] = svg_wrap("".join(inner), 820, 200)

    inner = [
        title_bar("Chuỗi Phối Hợp An Toàn ISO 26262: IoHwAb → DEM → FiM → Safe-State Idle"),
        box_ml(24, 42, 170, 68, "1. Phát Hiện Hỏng", ["IoHwAb thấy kẹt Relay", "hoặc Quá Dòng / SCG", "Gọi Dem_SetEvent()"], "var(--hb-err)"),
        box_ml(224, 42, 165, 68, "2. DEM Khóa DTC", ["Xác nhận DTC FAILED", "Thông báo trạng thái", "sang FiM module"], "var(--hb-warn)"),
        box_ml(419, 42, 175, 68, "3. FiM Cấm FID", ["FiM_GetPermission()", "trả về FALSE (Inhibit)", "Thanh B Bit1 FIM_SAFE"], "var(--hb-err)", "var(--hb-card2)", "var(--hb-err)"),
        box_ml(624, 42, 172, 68, "4. Cắt Actuator", ["Pwm_SetOutputToIdle", "Duty = 0x0000 (0%)", "Thắng cả DCM 0x2F!"], "var(--hb-pur)"),
        arrow_line(194, 76, 222, 76, "var(--hb-err)", "url(#hbArrErr)"),
        arrow_line(389, 76, 417, 76, "var(--hb-warn)", "url(#hbArrWarn)"),
        arrow_line(594, 76, 622, 76, "var(--hb-err)", "url(#hbArrErr)"),
        box_ml(24, 132, 772, 52, "Cơ Chế Phân Tách Trách Nhiệm Chức Năng", ["SWC không cần tự viết hàng chục lệnh if kiểm tra từng DTC; FiM gom mọi lỗi liên quan vào 1 FID duy nhất cho IoHwAb."], "var(--hb-cyan)")
    ]
    d["hb_3_fim_safety"] = svg_wrap("".join(inner), 820, 200)

    # ==================== TAB 4: DCM 0x2F & SHUTDOWN ====================
    inner = [
        title_bar("Thang Ưu Tiên Tuyệt Đối Của Actuator Multiplexer Trong IoHwAb"),
        box_ml(20, 44, 135, 68, "1. UNINIT/DEINIT", ["Ưu tiên CAO NHẤT", "Khóa Idle 0x0000", "Báo DET 0x01"], "var(--hb-err)"),
        box_ml(172, 44, 145, 68, "2. FiM Safe-State", ["Permission == 0", "Ép Idle 0x0000", "Cấm cả DCM 0x2F"], "var(--hb-err)"),
        box_ml(334, 44, 145, 68, "3. Over-Current", ["ISENSE > 8000mA", "Cắt tải chống cháy", "MOSFET tức thì"], "var(--hb-warn)"),
        box_ml(496, 44, 145, 68, "4. DCM UDS 0x2F", ["Tester Override", "Adj / Freeze / Reset", "Bỏ qua lệnh SWC"], "var(--hb-pur)", "var(--hb-card2)", "var(--hb-pur)"),
        box_ml(658, 44, 142, 68, "5. Normal SWC", ["SWC_App điều khiển", "vận hành xe chuẩn", "(Khi 1..4 bình yên)"], "var(--hb-ok)"),
        arrow_line(155, 78, 170, 78),
        arrow_line(317, 78, 332, 78),
        arrow_line(479, 78, 494, 78),
        arrow_line(641, 78, 656, 78),
        box_ml(20, 134, 780, 52, "Bảo Vệ Phần Cứng Kép", ["Mọi lệnh hợp lệ từ DCM 0x2F (cấp 4) hay SWC (cấp 5) vẫn bắt buộc phải đi qua tầng kẹp Duty Clamp 5%..95% trước khi xuống MCAL."], "var(--hb-bdr)")
    ]
    d["hb_4_mux_priority"] = svg_wrap("".join(inner), 820, 200)

    inner = [
        title_bar("Dịch Vụ Chẩn Đoán UDS 0x2F InputOutputControlByIdentifier (ISO 14229-1)"),
        box_ml(22, 42, 175, 70, "0x03 ShortTermAdj", ["Ép giá trị tức thì", "VD: Mở bướm ga 80%", "DCM giữ quyền kiểm soát"], "var(--hb-warn)"),
        box_ml(222, 42, 175, 70, "0x02 FreezeState", ["Khóa giữ nguyên", "mức Duty hiện tại", "Kệ SWC thay đổi"], "var(--hb-pur)"),
        box_ml(422, 42, 175, 70, "0x01 ResetToDefault", ["Đưa Actuator về", "mặc định tĩnh (0%)", "Vẫn giữ cờ 0x2F"], "var(--hb-cyan)"),
        box_ml(622, 42, 176, 70, "0x00 ReturnToECU", ["Trả lại quyền về SWC", "Xóa Thanh B Bit0=0", "Hoặc tự trả khi S3"], "var(--hb-ok)", "var(--hb-card2)", "var(--hb-ok)"),
        arrow_line(197, 77, 220, 77),
        arrow_line(397, 77, 420, 77),
        arrow_line(597, 77, 620, 77, "var(--hb-ok)", "url(#hbArrOk)"),
        box_ml(22, 132, 776, 52, "Cơ Chế An Toàn Khi Mất Kết Nối Máy Chẩn Đoán", ["Nếu thợ rút cáp OBD đột ngột, bộ đếm S3 Session Timeout (5s) của DCM hết hạn và tự gọi ReturnControlToECU() trả lại xe."], "var(--hb-pri)")
    ]
    d["hb_4_uds_0x2f"] = svg_wrap("".join(inner), 820, 200)

    inner = [
        title_bar("Giám Sát Dòng SmartFET H-Bridge & Quy Trình Tắt Máy IoHwAb_DeInit()"),
        box_ml(24, 42, 230, 70, "Open-Load (ISENSE = 0mA)", ["PWM > 10% nhưng dòng = 0", "Bật Thanh B Bit5 OPEN_LOAD", "Báo DEM đứt dây / lỏng jack"], "var(--hb-warn)"),
        box_ml(284, 42, 240, 70, "Over-Current (> 8000mA)", ["Dòng vọt quá ngưỡng bảo vệ", "Cắt Pwm_SetOutputToIdle()", "Bật Thanh B Bit4 OVER_CURR"], "var(--hb-err)", "var(--hb-card)", "var(--hb-err)"),
        box_ml(554, 42, 242, 70, "IoHwAb_DeInit() (Sleep)", ["Khi BswM/EcuM tắt khóa IG_OFF", "Ép mọi kênh ngõ ra về IDLE", "Hạ Thanh A Bit7 INIT = 0"], "var(--hb-pur)", "var(--hb-card2)", "var(--hb-pur)"),
        arrow_line(254, 77, 282, 77),
        arrow_line(524, 77, 552, 77),
        box_ml(24, 132, 772, 52, "Đọc Dòng SmartFET Qua SPI Hoặc ADC Multiplexed Sense", ["IoHwAb tự quản lý chuẩn hóa hệ số k_ILIS (từ dòng tải sang µA phản hồi) nên tầng SWC chỉ thấy kết quả mA hoặc trạng thái lỗi."], "var(--hb-cyan)")
    ]
    d["hb_4_smartfet_sleep"] = svg_wrap("".join(inner), 820, 200)

    # ==================== TAB 5: API R23-11, DET & ECUC ====================
    inner = [
        title_bar("Hệ Thống Hàm API Chuẩn AUTOSAR R22-11 / R23-11 Của IoHwAb"),
        box_ml(20, 42, 175, 70, "Lifecycle & Version", ["IoHwAb_Init(&Cfg)", "IoHwAb_DeInit()", "IoHwAb_GetVersionInfo"], "var(--hb-ok)"),
        box_ml(215, 42, 190, 70, "RTE Signal Server", ["IoHwAb_<Sig>_Get()", "IoHwAb_<Sig>_Set()", "Client-Server Runnable"], "var(--hb-pri)", "var(--hb-card2)", "var(--hb-pri)"),
        box_ml(425, 42, 185, 70, "DCM 0x2F Interfaces", ["ShortTermAdjustment", "FreezeCurrentState", "Reset / ReturnToECU"], "var(--hb-warn)"),
        box_ml(630, 42, 170, 70, "Cyclic Scheduler", ["IoHwAb_MainFunction", "Gọi từ OS Task 5ms", "Debounce + IIR + ICU"], "var(--hb-pur)"),
        arrow_line(195, 77, 213, 77),
        arrow_line(405, 77, 423, 77),
        arrow_line(610, 77, 628, 77),
        box_ml(20, 132, 780, 52, "Lưu Ý Đặc Biệt Của SWS_IoHwAb Về Tên Hàm", ["Trong AUTOSAR Classic, tên hàm dịch vụ tín hiệu được sinh động từ ShortName cấu hình ECUC (vd: IoHwAb_PedalSensor_GetPhysVal)."], "var(--hb-cyan)")
    ]
    d["hb_5_sws_apis"] = svg_wrap("".join(inner), 820, 200)

    inner = [
        title_bar("Mã Lỗi Phát Triển DET Chuẩn SWS_IoHwAb (Module ID = 254)"),
        box_ml(20, 42, 142, 68, "0x01 UNINIT", ["Gọi API khi chưa", "IoHwAb_Init()", "Chặn mọi xuất xung"], "var(--hb-err)"),
        box_ml(176, 42, 145, 68, "0x02 POINTER", ["Truyền NULL_PTR", "vào hàm Get()", "hoặc GetVersion"], "var(--hb-warn)"),
        box_ml(335, 42, 145, 68, "0x03 CHANNEL", ["Channel ID vượt", "ngoài số lượng", "ECUC đã tạo"], "var(--hb-pur)"),
        box_ml(494, 42, 145, 68, "0x04 VALUE", ["Giá trị ghi PWM", "hoặc Tham số NaN", "ngoài dải hợp lệ"], "var(--hb-cyan)"),
        box_ml(653, 42, 147, 68, "ADC_E_BUSY", ["Lỗi từ MCAL Adc", "Nhóm đang đo", "Giữ LastValidPct"], "var(--hb-pri)"),
        box_ml(20, 132, 780, 52, "Kích Hoạt DET Runtime Guard", ["Khi IoHwAbDevErrorDetect == TRUE, kiểm tra DET thực thi trước khi truy cập mảng con trỏ cấu hình, ngăn sập hệ thống."], "var(--hb-bdr)")
    ]
    d["hb_5_det_errors"] = svg_wrap("".join(inner), 820, 200)

    inner = [
        title_bar("Cây Cấu Hình ECUC & Quy Trình Sinh Mã ARXML -> IoHwAb_Cfg.h / Lcfg.c"),
        box_ml(24, 42, 230, 70, "IoHwAb.arxml (ECUC Tree)", ["IoHwAbGeneral (DevErr, 5ms)", "IoHwAbConfig -> SignalGroups", "Channel Refs (Adc/Dio/Pwm/Icu)"], "var(--hb-pri)"),
        box_ml(290, 42, 240, 70, "Bộ Sinh Mã Code Gen", ["Biên dịch ARXML kiểm tra", "ràng buộc Pull-Up vs Polarity", "Tạo hằng số tối ưu Flash/RAM"], "var(--hb-cyan)", "var(--hb-card2)", "var(--hb-cyan)"),
        box_ml(566, 42, 230, 70, "C Files Sinh Ra (Pre/Link)", ["IoHwAb_Cfg.h (Macro STD_ON)", "IoHwAb_Lcfg.c (Gain, Offset,", "Clamp Bounds, DEM Event ID)"], "var(--hb-ok)"),
        arrow_line(254, 77, 288, 77),
        arrow_line(530, 77, 564, 77, "var(--hb-ok)", "url(#hbArrOk)"),
        box_ml(24, 132, 772, 52, "Tránh Hard-Code Trong File Tay C", ["Tất cả 36 thông số trong trình mô phỏng tương ứng trực tiếp với các thẻ trong file IoHwAb.arxml / IoHwAb_Cfg.h bạn có thể xuất ở góc trên!"], "var(--hb-pur)")
    ]
    d["hb_5_ecuc_containers"] = svg_wrap("".join(inner), 820, 200)

    return d
