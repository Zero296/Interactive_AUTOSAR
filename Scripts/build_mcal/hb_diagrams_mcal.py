# -*- coding: utf-8 -*-
"""Zero-overlap, dark/light theme-aware SVG diagrams for 8-Module Core MCAL Handbook."""

from xml.sax.saxutils import escape as _xml_esc

TONE_VAR = {
    "":     ("var(--hb-card)",  "var(--hb-bdr)",  "var(--hb-txt)"),
    "pri":  ("var(--pri-bg)",   "var(--hb-pri)",  "var(--hb-pri)"),
    "ok":   ("var(--ok-bg)",    "var(--hb-ok)",   "var(--hb-ok)"),
    "warn": ("var(--warn-bg)",  "var(--hb-warn)", "var(--hb-warn)"),
    "err":  ("var(--err-bg)",   "var(--hb-err)",  "var(--hb-err)"),
    "pur":  ("var(--pur-bg)",   "var(--hb-pur)",  "var(--hb-pur)"),
    "cyan": ("var(--cyan-bg)",  "var(--hb-cyan)", "var(--hb-cyan)"),
    "org":  ("var(--org-bg)",   "var(--hb-org)",  "var(--hb-org)"),
}


def box(x, y, w, h, title, sub="", tone="", rx=8):
    fill, stroke, tcol = TONE_VAR.get(tone, TONE_VAR[""])
    cx = x + w / 2
    out = [f'<rect class="hb-svg-box" data-bb="{x},{y},{w},{h}" x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="1.6"/>']
    if sub:
        lines = sub.split("\n")
        ty = y + 20 if len(lines) == 1 else y + 17
        out.append(f'<text x="{cx}" y="{ty}" text-anchor="middle" fill="{tcol}" font-weight="800" font-size="11.5">{_xml_esc(title)}</text>')
        for i, ln in enumerate(lines):
            out.append(f'<text x="{cx}" y="{ty + 15 + i * 13}" text-anchor="middle" fill="var(--hb-mut)" font-size="10">{_xml_esc(ln)}</text>')
    else:
        out.append(f'<text x="{cx}" y="{y + h / 2 + 4}" text-anchor="middle" fill="{tcol}" font-weight="800" font-size="11.5">{_xml_esc(title)}</text>')
    return "\n  ".join(out)


def arrow_line(x1, y1, x2, y2, tone=""):
    _, stroke, _ = TONE_VAR.get(tone, TONE_VAR[""])
    col = stroke if tone else "var(--hb-pri)"
    return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{col}" stroke-width="1.8" marker-end="url(#hbArr)"/>'


def pill(cx, cy, text, tone=""):
    w = max(56, len(text) * 6 + 16)
    h = 20
    x = round(cx - w / 2)
    y = round(cy - h / 2)
    fill, stroke, tcol = TONE_VAR.get(tone, TONE_VAR["pri"])
    return (
        f'<rect class="hb-svg-pill" data-bb="{x},{y},{w},{h}" x="{x}" y="{y}" width="{w}" height="{h}" rx="10" fill="var(--hb-card)" stroke="{stroke}" stroke-width="1.2"/>\n'
        f'  <text x="{cx}" y="{cy + 3.5}" text-anchor="middle" fill="{tcol}" font-weight="700" font-size="9.5">{_xml_esc(text)}</text>'
    )


def wrap_svg(w, h, body):
    return (
        f'<svg class="hb-svg" viewBox="0 0 {w} {h}" xmlns="http://www.w3.org/2000/svg">\n'
        f'  <defs>\n'
        f'    <marker id="hbArr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">\n'
        f'      <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--hb-pri)"/>\n'
        f'    </marker>\n'
        f'  </defs>\n'
        f'  {body}\n'
        f'</svg>'
    )


def svg_arch_layers():
    parts = [
        box(20, 14, 240, 50, "SWC Application (Độc lập HW)", "Không gọi thẳng MCAL\nChỉ gọi Rte_Call / Rte_Read", "pri"),
        box(300, 14, 230, 50, "RTE & VFB Routing", "Điều phối Runnable & Signal", "cyan"),
        box(570, 14, 230, 50, "EcuM / BswM / Det / Dem", "DriverInitOne & Báo lỗi Hệ thống", "err"),
        box(20, 108, 250, 50, "IoHwAb (ECU Abstraction)", "Scale Raw↔V/°C/Duty · Map Pin", "ok"),
        box(300, 108, 240, 50, "CanIf & CanSM (Comm Abst.)", "TxQueue, HRH Filter, BusOff Rec", "pur"),
        box(570, 108, 230, 50, "Fee / Ea / MemIf / NvM", "Wear Leveling & Block Mapping", "cyan"),
        box(20, 204, 180, 52, "Mcu (101) & Port (124)", "PLL Clock Tree & Pin Mux PCR", "org"),
        box(220, 204, 180, 52, "Dio (120) · Adc (123)", "Atomic Pin & SAR 12-bit Group", "ok"),
        box(420, 204, 180, 52, "Pwm (121) · Spi (83)", "0..0x8000 & Seq→Job→Ch", "warn"),
        box(620, 204, 180, 52, "Can (80) · Fls (92)", "CAN-FD HOH & Non-Block Flash", "pur"),
        box(20, 294, 780, 42, "MCU Silicon Peripherals (PLL_SR, RGM, PCR, GPIO, SAR_ADC, FTM, QSPI, FlexCAN, DataFlash)", "", ""),
        arrow_line(260, 39, 296, 39),
        arrow_line(145, 64, 145, 104),
        arrow_line(420, 64, 420, 104),
        arrow_line(685, 64, 685, 104),
        arrow_line(110, 158, 110, 200),
        arrow_line(200, 158, 280, 200),
        arrow_line(420, 158, 660, 200),
        arrow_line(685, 158, 720, 200),
        arrow_line(110, 256, 110, 290),
        arrow_line(310, 256, 310, 290),
        arrow_line(510, 256, 510, 290),
        arrow_line(710, 256, 710, 290),
    ]
    return wrap_svg(820, 350, "\n  ".join(parts))


def svg_ecu_init_seq():
    parts = [
        box(16, 20, 150, 56, "1. Mcu_Init()", "Nạp cấu hình MCU\nfCPU=16MHz fOSC", "org"),
        box(200, 20, 170, 56, "2. Mcu_InitClock()", "Bật VCO bộ nhân PLL\n(Chưa nối vào CPU)", "warn"),
        box(406, 20, 175, 56, "3. GetPllStatus()", "Đợi Bit7 PLL_LOCK_OK\n== MCU_PLL_LOCKED", "cyan"),
        box(616, 20, 188, 56, "4. DistributePllClock()", "MUX → 160 MHz\nCấp xung toàn chip!", "ok"),
        box(16, 128, 185, 56, "5. Port_Init()", "Level trước Direction\nGhi PCR[0..N] toàn chip", "pri"),
        box(236, 128, 185, 56, "6. Adc / Pwm_Init()", "Khởi tạo nhóm ADC\n& kênh Timer PWM", "ok"),
        box(456, 128, 165, 56, "7. Spi / Can_Init()", "CAN_CS_STOPPED\nQSPI sẵn sàng", "pur"),
        box(656, 128, 148, 56, "8. Fls_Init()", "MEMIF_IDLE\n(Dio không cần Init)", "cyan"),
        arrow_line(166, 48, 196, 48),
        arrow_line(370, 48, 402, 48),
        arrow_line(581, 48, 612, 48),
        arrow_line(710, 76, 710, 102),
        arrow_line(710, 102, 108, 102),
        arrow_line(108, 102, 108, 124),
        arrow_line(201, 156, 232, 156),
        arrow_line(421, 156, 452, 156),
        arrow_line(621, 156, 652, 156),
    ]
    return wrap_svg(820, 206, "\n  ".join(parts))


def svg_mcu_pll():
    parts = [
        box(20, 24, 155, 56, "Thạch Anh Ngoài", "fOSC = 16 MHz\nHoặc IRC nội 16 MHz", "pri"),
        box(215, 24, 180, 56, "PLL Multiplier (VCO)", "Mcu_InitClock()\nĐợi khóa pha PLL_SR", "warn"),
        box(435, 24, 165, 56, "Clock MUX Switch", "Mcu_DistributePllClock\nChỉ bật khi LOCK==1", "ok"),
        box(640, 12, 160, 40, "fCPU = 160 MHz", "CPU Core & Pwm", "cyan"),
        box(640, 62, 160, 40, "fBUS/CAN = 80 MHz", "FlexCAN & QSPI", "pur"),
        box(640, 112, 160, 40, "fADC = 40 MHz", "SAR ADC Prescaler", "org"),
        box(215, 112, 385, 44, "Reset & Low Power Management (RGM_FES & WFI)", "Mcu_GetResetReason · Mcu_SetMode(RUN/HALT/STOP) · Mcu_PerformReset", ""),
        arrow_line(175, 52, 211, 52),
        arrow_line(395, 52, 431, 52),
        arrow_line(600, 38, 636, 32),
        arrow_line(600, 54, 636, 82),
        arrow_line(600, 68, 636, 132),
    ]
    return wrap_svg(820, 174, "\n  ".join(parts))


def svg_port_dio():
    parts = [
        box(20, 20, 230, 64, "Port Driver (Module 124)", "Port_Init(&Port_Config)\nGhi Level → Direction → PCR[n].MUX", "pri"),
        box(295, 20, 225, 64, "Runtime & Anti-EMC Guard", "Port_SetPinDirection / Mode\nPort_RefreshPortDirection()", "warn"),
        box(565, 20, 235, 64, "Pin Hardware PCR[0..7]", "ALT0=DIO | ALT1=ADC\nALT2=PWM | ALT3=SPI | ALT4=CAN", "cyan"),
        box(20, 122, 230, 66, "Dio Channel (1 Chân)", "Dio_ReadChannel / WriteChannel\nDio_FlipChannel() (Stateless)", "ok"),
        box(295, 122, 225, 66, "Dio Port (Cổng 8/16/32-bit)", "Dio_ReadPort / WritePort\nDio_MaskedWritePort(Port,Lvl,Mask)", "pur"),
        box(565, 122, 235, 66, "Dio ChannelGroup (Mask/Off)", "Ghi: (Old & ~Mask) | ((Val<<Off)&Mask)\nVí dụ Mask=0xF0, Offset=4", "org"),
        arrow_line(250, 52, 291, 52),
        arrow_line(520, 52, 561, 52),
        arrow_line(250, 155, 291, 155),
        arrow_line(520, 155, 561, 155),
    ]
    return wrap_svg(820, 208, "\n  ".join(parts))


def svg_adc_pwm():
    parts = [
        box(20, 20, 165, 54, "ADC_IDLE", "Sau Adc_Init() +\nAdc_SetupResultBuffer()", "pri"),
        box(225, 20, 175, 54, "ADC_BUSY", "StartGroupConversion\nhoặc HW Timer Trigger", "warn"),
        box(440, 20, 175, 54, "ADC_COMPLETED", "Xong 1 vòng quét\nĐang tích lũy Stream", "cyan"),
        box(655, 20, 150, 54, "STREAM_COMPLETED", "Đủ N mẫu · Ngắt EOC\n→ IoHwAb_AdcNotif()", "ok"),
        box(20, 118, 240, 56, "SWC/IoHwAb Duty: 0%..100%", "Pwm_SetDutyCycle(Ch, 0x0000..0x8000)\nVí dụ: 75% = 0x6000 (24576)", "pur"),
        box(300, 118, 250, 56, "Công Thức Chuẩn SWS_Pwm", "Ticks = (PeriodTicks * Duty) >> 15\nShadow Reg nạp cuối chu kỳ (No Glitch)", "warn"),
        box(590, 118, 215, 56, "Output An Toàn (PA3)", "FIXED vs VARIABLE Period\nPwm_SetOutputToIdle() → Bit4=0", "ok"),
        arrow_line(185, 47, 221, 47),
        arrow_line(400, 47, 436, 47),
        arrow_line(615, 47, 651, 47),
        arrow_line(260, 146, 296, 146),
        arrow_line(550, 146, 586, 146),
    ]
    return wrap_svg(820, 194, "\n  ".join(parts))


def svg_spi_hierarchy():
    parts = [
        box(20, 20, 230, 62, "1. SpiSequence (Cấp Lập Lịch)", "Gom 1..N Job thực thi nối tiếp\nSpiInterruptibleSequence (T/F)\nCallback: Spi_SeqEndNotification()", "pur"),
        box(295, 20, 235, 62, "2. SpiJob (Giữ 1 Chân CS)", "Gom 1..N Channel chung CS & Baud\nSpiJobPriority = 0..3 (3 Cao nhất)\nCallback: Spi_JobEndNotification()", "warn"),
        box(575, 20, 225, 62, "3. SpiChannel (Dữ Liệu)", "Cấu hình MSB/LSB & 8/16/32 bit\nIB (Internal Buf ≤16B)\nEB (External Zero-Copy Ptr)", "cyan"),
        box(20, 120, 370, 56, "Preemption (Chèn Ngang Priority 3 > 1)", "Job_A (Prio 1) xong → nhả CS → chen Job_Urgent (Prio 3)\nSau khi Urgent xong mới quay lại Job_B (Prio 1)!", "ok"),
        box(430, 120, 370, 56, "SpiLevelDelivered (0 / 1 / 2) & AsyncMode", "LEVEL 0: SyncTransmit | LEVEL 1: Async | LEVEL 2: Cả hai\nSPI_INTERRUPT_MODE vs SPI_POLLING_MODE (MainFn)", "pri"),
        arrow_line(250, 51, 291, 51),
        arrow_line(530, 51, 571, 51),
    ]
    return wrap_svg(820, 196, "\n  ".join(parts))


def svg_can_flow():
    parts = [
        box(20, 18, 175, 54, "CanIf / CanSM", "CanIf_Transmit()\nCanIf_TxConfirmation()", "pur"),
        box(235, 18, 190, 54, "HTH (Tx Mailbox Cluster)", "Multiplexed=TRUE: 3 Slots\nTrả CAN_BUSY nếu đầy hết", "warn"),
        box(465, 18, 165, 54, "FlexCAN / M_CAN Bus", "500kbps Arb / 2Mbps FD\nTEC & REC Error Counters", "cyan"),
        box(670, 18, 135, 54, "HRH HW Filter", "(RxId & Mask) == Code\nLọc bỏ nhiễu 0 tốn CPU", "ok"),
        box(20, 114, 175, 52, "CAN_CS_UNINIT", "Chưa gọi Can_Init()", ""),
        box(235, 114, 175, 52, "CAN_CS_STOPPED", "Init xong / Hoặc Bus-Off\n(Bit 2 CAN_TXRX_OK = 0)", "err"),
        box(450, 114, 175, 52, "CAN_CS_STARTED", "Tham gia Bus Active!\nTx / Rx hoạt động", "ok"),
        box(665, 114, 140, 52, "CAN_CS_SLEEP", "Wakeup Detector\nCan_CheckWakeup()", "pur"),
        arrow_line(195, 45, 231, 45),
        arrow_line(425, 45, 461, 45),
        arrow_line(630, 45, 666, 45),
        arrow_line(195, 140, 231, 140),
        arrow_line(410, 140, 446, 140),
        arrow_line(625, 140, 661, 140),
    ]
    return wrap_svg(820, 188, "\n  ".join(parts))


def svg_fls_async():
    parts = [
        box(20, 20, 215, 58, "1. NvM → MemIf → Fee", "Gọi Fls_Erase() / Fls_Write()\nKiểm tra Sector/Page Alignment", "cyan"),
        box(275, 20, 250, 58, "2. MEMIF_BUSY (Non-Blocking)", "Trả E_OK ngay không chặn CPU\nBit 1 FLS_HV_BUSY=1, JOB_PENDING", "warn"),
        box(565, 20, 235, 58, "3. SchM: Fls_MainFunction()", "SLOW: 8B/Tick | FAST: 32B/Tick\nGhi xong kiểm tra Write Verify", "ok"),
        box(20, 118, 250, 54, "Quy Tắc Vật Lý 0xFF → 0", "Bắt buộc Fls_Erase() (đưa về 0xFF)\ntrước khi ghi; ghi đè sẽ báo DEM Fail!", "err"),
        box(305, 118, 240, 54, "Fls_BlankCheck & Fls_Cancel", "BlankCheck bỏ qua Erase không cần thiết\nCancel ngắt HV khẩn cấp ngay lập tức", "pur"),
        box(580, 118, 220, 54, "Callbacks Lên Fee", "Fee_JobEndNotification() (OK)\nFee_JobErrorNotification() (Fail/Cancel)", "pri"),
        arrow_line(235, 49, 271, 49),
        arrow_line(525, 49, 561, 49),
    ]
    return wrap_svg(820, 192, "\n  ".join(parts))


def svg_det_dem():
    parts = [
        box(20, 20, 220, 62, "Hàm API Của 8 MCAL Drivers", "Kiểm tra điều kiện biên trước\nkhi chạm xuống thanh ghi HW", "pri"),
        box(295, 16, 245, 54, "DET: Development Error Tracer", "Det_ReportError(ModId, Inst, Api, Err)\nLỗi code dev: UNINIT, PARAM, BUSY", "warn"),
        box(295, 86, 245, 54, "DEM: Diagnostic Event Manager", "Dem_SetEventStatus(EventId, FAILED)\nLỗi silicon HW: ClockLoss, FlsVerify", "err"),
        box(590, 16, 215, 54, "Bit 0 Thanh B: DET_ERR_TRAP", "Ngắt lệnh sai bảo vệ phần cứng\nBáo chi tiết ModuleId (101..124)", "warn"),
        box(590, 86, 215, 54, "Bit 1 Thanh B: DEM_HW_FAULT", "Lưu Freeze Frame & DTC vào NvM\nPhục vụ chẩn đoán UDS 0x19!", "err"),
        arrow_line(240, 44, 291, 44),
        arrow_line(240, 64, 291, 108),
        arrow_line(540, 43, 586, 43),
        arrow_line(540, 113, 586, 113),
    ]
    return wrap_svg(820, 158, "\n  ".join(parts))


ALL_HB_DIAGRAMS = {
    "arch_layers": svg_arch_layers,
    "ecu_init_seq": svg_ecu_init_seq,
    "mcu_pll": svg_mcu_pll,
    "port_dio": svg_port_dio,
    "adc_pwm": svg_adc_pwm,
    "spi_hierarchy": svg_spi_hierarchy,
    "can_flow": svg_can_flow,
    "fls_async": svg_fls_async,
    "det_dem": svg_det_dem,
}
