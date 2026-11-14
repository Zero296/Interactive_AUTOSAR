# -*- coding: utf-8 -*-
"""Theme-aware inline SVG diagram builder for AUTOSAR CanIf Handbook."""

from xml.sax.saxutils import escape


def svg_wrap(w, h, inner):
    return (
        f'<svg class="hb-svg" viewBox="0 0 {w} {h}" xmlns="http://www.w3.org/2000/svg">'
        f'<defs>'
        f'<marker id="hbArr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">'
        f'<path d="M 0 1 L 10 5 L 0 9 z" fill="currentColor" />'
        f'</marker>'
        f'</defs>'
        f'{inner}'
        f'</svg>'
    )


def box_ml(x, y, w, h, lines, border_var="--pri", fill_var="--panel-2", rx=8, title_size=12, sub_size=10):
    rect = (
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" '
        f'fill="var({fill_var})" stroke="var({border_var})" stroke-width="1.6" />'
    )
    texts = []
    n = len(lines)
    top_y = y + (h - (n - 1) * 16) / 2 + 4
    cx = x + w / 2
    for idx, line in enumerate(lines):
        if isinstance(line, tuple):
            txt, color, bold = line
        else:
            txt, color, bold = line, ("--pri" if idx == 0 else "--txt-soft"), (idx == 0)
        sz = title_size if idx == 0 else sub_size
        wt = "800" if bold else "500"
        texts.append(
            f'<text x="{cx:.1f}" y="{top_y + idx * 16:.1f}" text-anchor="middle" '
            f'fill="var({color})" font-size="{sz}" font-weight="{wt}">{escape(txt)}</text>'
        )
    return rect + "".join(texts)


def arrow_line(x1, y1, x2, y2, color="--cyan", label="", lx=None, ly=None, dashed=False):
    dash = ' stroke-dasharray="4 3"' if dashed else ""
    line = (
        f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="var({color})" '
        f'stroke-width="1.8"{dash} marker-end="url(#hbArr)" style="color:var({color})" />'
    )
    if not label:
        return line
    tx = lx if lx is not None else (x1 + x2) / 2
    ty = ly if ly is not None else (y1 + y2) / 2 - 5
    lbl = (
        f'<text x="{tx:.1f}" y="{ty:.1f}" text-anchor="middle" fill="var({color})" '
        f'font-size="9.5" font-weight="700">{escape(label)}</text>'
    )
    return line + lbl


def arrow_path(d, color="--pri", label="", lx=0, ly=0, dashed=False):
    dash = ' stroke-dasharray="4 3"' if dashed else ""
    p = (
        f'<path d="{d}" fill="none" stroke="var({color})" stroke-width="1.8"{dash} '
        f'marker-end="url(#hbArr)" style="color:var({color})" />'
    )
    if label:
        p += (
            f'<text x="{lx}" y="{ly}" text-anchor="middle" fill="var({color})" '
            f'font-size="9.5" font-weight="700">{escape(label)}</text>'
        )
    return p


def pill_note(x, y, w, h, text, color="--warn", fill="--warn-bg"):
    return (
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="10" fill="var({fill})" stroke="var({color})" stroke-width="1.2" />'
        f'<text x="{x + w / 2:.1f}" y="{y + h / 2 + 3.5:.1f}" text-anchor="middle" fill="var({color})" font-size="10" font-weight="700">{escape(text)}</text>'
    )


def build_diagrams():
    d = {}

    # 1. Stack Position
    parts = [
        box_ml(20, 16, 220, 48, ["SWC_App & SWC_Diag", "Rte_Write() / Dem / UDS"], "--pri", "--panel-2"),
        box_ml(290, 16, 230, 48, ["EcuM & CanSM / ComM / BswM", "SetCtrlMode / SetPduMode / Wakeup"], "--pur", "--panel-2"),
        box_ml(570, 16, 230, 48, ["DET & IdsM (ModuleId 60)", "0x32 / 0x33 / Security Events"], "--err", "--panel-2"),
        box_ml(180, 92, 460, 52, ["Upper Layers: PduR / Com | CanTp | CanNm | CanTSyn | SecOC | CDD", "CanIf_Transmit()  <--->  <User>_RxIndication / <User>_TxConfirmation"], "--cyan", "--panel-2"),
        box_ml(150, 178, 520, 62, [("CanIf (ECU Abstraction Layer — SWS_CanIf R23-11)", "--pri", True), ("HOH Map (FullCAN/BasicCAN) | CanIfTxBuffer Queue | SwFilter & DLC Check | PduMode Gate", "--txt", False)], "--pri", "--pri-bg"),
        box_ml(60, 276, 310, 52, ["CanDrv (MCAL CAN Controller)", "Can_Write(HTH) | RxInd / TxConfirm / BusOff"], "--ok", "--panel-2"),
        box_ml(450, 276, 310, 52, ["CanTrcv (TJA1145 / TJA1043)", "SetOpMode / CheckWakeup / WUF PN"], "--cyan", "--panel-2"),
        pill_note(170, 344, 480, 22, "CAN / CAN-FD Physical Bus (CAN_H / CAN_L · Arbitration 500k + Data 2M/5M)", "--pri", "--panel-3"),
        arrow_line(130, 64, 240, 92, "--pri", "RTE / I-PDU", 155, 80),
        arrow_line(405, 64, 405, 178, "--pur", "Mode / CheckWakeup", 468, 166),
        arrow_line(410, 144, 410, 178, "--cyan", "Tx / Rx Cbk", 362, 164),
        arrow_line(570, 209, 685, 64, "--err", "DET 0x32/33", 662, 140, dashed=True),
        arrow_line(290, 240, 215, 276, "--ok", "Can_Write()", 215, 256),
        arrow_line(530, 240, 605, 276, "--cyan", "Trcv SPI/Pin", 605, 256),
    ]
    d["stack_position"] = svg_wrap(820, 380, "".join(parts))

    # 2. 32-bit Can_IdType Layout
    parts = [
        pill_note(20, 12, 780, 24, "Cấu trúc chuẩn uint32 Can_IdType theo SWS_Can_00416 (AUTOSAR R23-11)", "--pri", "--pri-bg"),
        box_ml(20, 50, 120, 68, [("Bit 31 (MSB)", "--pur", True), ("EXT_ID Flag", "--txt", False), ("0=11b | 1=29b", "--mut", False)], "--pur", "--pur-bg"),
        box_ml(150, 50, 120, 68, [("Bit 30", "--cyan", True), ("FD_MODE Flag", "--txt", False), ("0=CAN | 1=FD", "--mut", False)], "--cyan", "--cyan-bg"),
        box_ml(280, 50, 95, 68, [("Bit 29", "--mut", True), ("Reserved", "--txt", False), ("Luôn = 0", "--mut", False)], "--bdr", "--panel-3"),
        box_ml(385, 50, 415, 68, [("Bits 28 .. 0 (29 bits)", "--ok", True), ("Arbitration CAN Identifier (Standard: Bits 10..0 | Extended: Bits 28..0)", "--txt", False), ("Mask: 0x000007FF (Std) hoặc 0x1FFFFFFF (Ext)", "--mut", False)], "--ok", "--ok-bg"),
        box_ml(20, 142, 250, 56, [("0x00000100", "--ok", True), ("B31=0, B30=0 -> Std CAN 11-bit", "--txt-soft", False)], "--ok", "--panel-2"),
        box_ml(285, 142, 250, 56, [("0x40000120", "--cyan", True), ("B31=0, B30=1 -> Std CAN FD 64B", "--txt-soft", False)], "--cyan", "--panel-2"),
        box_ml(550, 142, 250, 56, [("0xD8FEF100", "--pur", True), ("B31=1, B30=1 -> Ext CAN FD 29-bit", "--txt-soft", False)], "--pur", "--panel-2"),
    ]
    d["canid_bits"] = svg_wrap(820, 216, "".join(parts))

    # 3. FullCAN vs BasicCAN HOH
    parts = [
        box_ml(20, 16, 375, 224, ["", "", "", ""], "--ok", "--panel-2"),
        pill_note(36, 26, 343, 24, "FullCAN HOH (1 HOH : 1 L-PDU chuyên biệt)", "--ok", "--ok-bg"),
        box_ml(42, 62, 140, 46, ["TxPdu_0 (0x500)", "CanNm Priority"], "--pri", "--panel-3"),
        box_ml(235, 62, 140, 46, ["HW Mailbox HTH_0", "Khớp 100% 1:1"], "--ok", "--panel-3"),
        arrow_line(182, 85, 235, 85, "--ok", "Direct", 208, 76),
        box_ml(42, 124, 140, 46, ["HW Mailbox HRH_0", "Lọc phần cứng"], "--ok", "--panel-3"),
        box_ml(235, 124, 140, 46, ["RxPdu_2 (CanNm)", "Zero SwFilter CPU"], "--cyan", "--panel-3"),
        arrow_line(182, 147, 235, 147, "--ok", "Fast", 208, 138),
        pill_note(42, 190, 333, 34, "Không cần CanIfTxBuffer, không tốn CPU lọc phần mềm", "--ok", "--panel-3"),

        box_ml(425, 16, 375, 224, ["", "", "", ""], "--warn", "--panel-2"),
        pill_note(441, 26, 343, 24, "BasicCAN HOH (N L-PDU dùng chung 1 HOH M:1)", "--warn", "--warn-bg"),
        box_ml(442, 62, 145, 58, ["TxPdu_1 (0x100)", "TxPdu_2 (0x120)", "TxPdu_3 (0x7E8)"], "--pri", "--panel-3"),
        box_ml(638, 62, 145, 58, ["HTH_1 + TxBuffer", "Sorted by CAN ID", "SWS_CanIf_00381"], "--warn", "--panel-3"),
        arrow_line(587, 91, 638, 91, "--warn", "Queue", 612, 82),
        box_ml(442, 132, 145, 52, ["HRH_1 BasicCAN", "Đón tất cả dải ID"], "--cyan", "--panel-3"),
        box_ml(638, 132, 145, 52, ["Software Filter", "MASK / BINARY_S"], "--pur", "--panel-3"),
        arrow_line(587, 158, 638, 158, "--pur", "Filter", 612, 149),
        pill_note(442, 196, 341, 30, "Tiết kiệm Mailbox phần cứng & chống Priority Inversion", "--warn", "--panel-3"),
    ]
    d["full_vs_basic_hoh"] = svg_wrap(820, 256, "".join(parts))

    # 4. CanIfTxBuffer Priority & Drain
    parts = [
        box_ml(20, 30, 170, 56, ["CanIf_Transmit()", "0x7E8 trước, 0x100 sau"], "--pri", "--panel-2"),
        box_ml(235, 30, 175, 56, ["Can_Write(HTH_1)", "Trả về CAN_BUSY"], "--warn", "--warn-bg"),
        box_ml(455, 22, 180, 72, [("CanIfTxBuffer (RAM)", "--cyan", True), ("#1: 0x100 (Cao nhất)", "--ok", False), ("#2: 0x7E8 (Thấp hơn)", "--txt-soft", False)], "--cyan", "--panel-2"),
        box_ml(675, 30, 125, 56, ["TxConfirm() ISR", "Tự động xả #1!"], "--ok", "--ok-bg"),
        arrow_line(190, 58, 235, 58, "--pri", "Write", 212, 48),
        arrow_line(410, 58, 455, 58, "--warn", "BUSY", 432, 48),
        arrow_line(635, 58, 675, 58, "--ok", "Dequeue", 655, 48),
        pill_note(20, 114, 780, 34, "SchM_Enter_CanIf_EXCLUSIVE_AREA_0() bảo vệ hàng đợi khỏi Race Condition giữa Task & ISR; trùng TxPduId sẽ ghi đè dữ liệu mới (SWS_CanIf_00068)", "--pur", "--pur-bg"),
    ]
    d["tx_buffer_priority"] = svg_wrap(820, 166, "".join(parts))

    # 5. Rx Filter & DLC Check
    parts = [
        box_ml(16, 36, 130, 62, ["CanDrv Rx ISR", "Mailbox + PduInfo"], "--ok", "--panel-2"),
        box_ml(172, 36, 136, 62, ["PduMode Gate", "!= CANIF_OFFLINE"], "--warn", "--panel-2"),
        box_ml(336, 36, 152, 62, ["Software Filter", "MASK / BINARY_S"], "--pur", "--panel-2"),
        box_ml(516, 36, 136, 62, ["DLC Check (0x32)", "Act >= MinDlc"], "--cyan", "--panel-2"),
        box_ml(678, 36, 126, 62, ["<User>_RxInd()", "PduR / Tp / Nm"], "--pri", "--pri-bg"),
        box_ml(336, 128, 152, 46, ["Drop Lặng Lẽ", "Không khớp CAN ID"], "--mut", "--panel-3"),
        box_ml(516, 128, 288, 46, ["Det_ReportRuntimeError(60, 0x32)", "CANIF_E_INVALID_DATA_LENGTH + IdsM"], "--err", "--err-bg"),
        arrow_line(146, 67, 172, 67, "--ok"),
        arrow_line(308, 67, 336, 67, "--warn"),
        arrow_line(488, 67, 516, 67, "--pur"),
        arrow_line(652, 67, 678, 67, "--cyan"),
        arrow_line(412, 98, 412, 128, "--mut", "Miss", 435, 116),
        arrow_line(584, 98, 584, 128, "--err", "Short", 608, 116),
    ]
    d["rx_filter_dlc"] = svg_wrap(820, 190, "".join(parts))

    # 6. TriggerTransmit & DynamicTxId
    parts = [
        box_ml(20, 20, 780, 72, ["", ""], "--cyan", "--panel-2"),
        pill_note(32, 28, 185, 22, "CanIf_TriggerTransmit()", "--cyan", "--cyan-bg"),
        box_ml(232, 28, 165, 52, ["CanDrv Ready Tx", "Sát giờ lên bus"], "--ok", "--panel-3"),
        box_ml(435, 28, 175, 52, ["CanIf_TriggerTransmit", "Kéo dữ liệu tươi"], "--cyan", "--panel-3"),
        box_ml(645, 28, 140, 52, ["PduR_CanIfTrigTx()", "Nạp Rolling Cnt"], "--pri", "--panel-3"),
        arrow_line(397, 54, 435, 54, "--ok"),
        arrow_line(610, 54, 645, 54, "--cyan"),

        box_ml(20, 110, 780, 72, ["", ""], "--pur", "--panel-2"),
        pill_note(32, 118, 185, 22, "CanIf_SetDynamicTxId()", "--pur", "--pur-bg"),
        box_ml(232, 118, 165, 52, ["J1939Nm / DoCAN", "Đổi Node Addr RAM"], "--pri", "--panel-3"),
        box_ml(435, 118, 175, 52, ["CanIf_DynTxId[Pdu]", "Ghi đè Can_IdType"], "--pur", "--panel-3"),
        box_ml(645, 118, 140, 52, ["CanIf_Transmit()", "Mang CAN ID mới"], "--ok", "--panel-3"),
        arrow_line(397, 144, 435, 144, "--pri"),
        arrow_line(610, 144, 645, 144, "--pur"),
    ]
    d["trigger_dyn_id"] = svg_wrap(820, 198, "".join(parts))

    # 7. Controller State Machine
    parts = [
        box_ml(30, 56, 150, 62, ["CAN_CS_UNINIT", "Chưa CanIf_Init()"], "--bdr", "--panel-3"),
        box_ml(240, 56, 170, 62, ["CAN_CS_STOPPED", "Xóa TxBuffer, Chờ"], "--warn", "--warn-bg"),
        box_ml(495, 56, 185, 62, ["CAN_CS_STARTED", "Tx & Rx Hoạt Động"], "--ok", "--ok-bg"),
        box_ml(240, 172, 170, 62, ["CAN_CS_SLEEP", "HW Sleep Chờ WUF"], "--pur", "--pur-bg"),
        arrow_line(180, 87, 240, 87, "--pri", "Init", 210, 77),
        arrow_line(410, 76, 495, 76, "--ok", "STARTED", 452, 66),
        arrow_line(495, 102, 410, 102, "--warn", "STOP / BusOff", 452, 118),
        arrow_line(305, 118, 305, 172, "--pur", "SLEEP", 278, 148),
        arrow_line(345, 172, 345, 118, "--warn", "STOPPED", 380, 148),
        arrow_line(585, 118, 410, 203, "--err", "CẤM đi thẳng STARTED -> SLEEP!", 558, 190, dashed=True),
    ]
    d["ctrl_sm"] = svg_wrap(820, 250, "".join(parts))

    # 8. PduMode Gate Matrix
    parts = [
        box_ml(20, 18, 180, 130, [("CANIF_OFFLINE (0x00)", "--err", True), ("Tx Path: LOCKED", "--err", False), ("Rx Path: LOCKED", "--err", False), ("Dùng khi Init / Stop", "--mut", False)], "--err", "--panel-2"),
        box_ml(218, 18, 185, 130, [("CANIF_TX_OFFLINE (1)", "--err", True), ("Tx Path: LOCKED", "--err", False), ("Rx Path: OPEN!", "--ok", False), ("SilentCom / Bus-Off", "--mut", False)], "--warn", "--panel-2"),
        box_ml(421, 18, 195, 130, [("TX_OFFLINE_ACTIVE (2)", "--warn", True), ("Can_Write(): SKIP", "--warn", False), ("TxConfirm(): VIRTUAL!", "--cyan", True), ("Passive ECU Mode", "--mut", False)], "--warn", "--warn-bg"),
        box_ml(634, 18, 166, 130, [("CANIF_ONLINE (0x03)", "--ok", True), ("Tx Path: OPEN", "--ok", False), ("Rx Path: OPEN", "--ok", False), ("Full Communication", "--mut", False)], "--ok", "--ok-bg"),
    ]
    d["pdu_mode_matrix"] = svg_wrap(820, 166, "".join(parts))

    # 9. Partial Networking & Bus-Off
    parts = [
        box_ml(20, 18, 375, 164, ["", "", "", ""], "--pur", "--panel-2"),
        pill_note(35, 28, 345, 24, "Partial Networking Tx Filter (SWS_CanIf_00750)", "--pur", "--pur-bg"),
        box_ml(38, 64, 155, 50, ["CanIfPnFilter=ON", "Chặn App TxPdu"], "--warn", "--panel-3"),
        box_ml(222, 64, 155, 50, ["TxPdu_0 (PN=TRUE)", "CanNm đi xuyên!"], "--ok", "--panel-3"),
        arrow_line(193, 89, 222, 89, "--pur"),
        pill_note(38, 130, 339, 36, "ConfirmPnAvailability() -> Mở khóa toàn bộ TxPdu!", "--ok", "--ok-bg"),

        box_ml(425, 18, 375, 164, ["", "", "", ""], "--err", "--panel-2"),
        pill_note(440, 28, 345, 24, "Phản Ứng Tức Thì Khi CanIf_ControllerBusOff()", "--err", "--err-bg"),
        box_ml(442, 64, 160, 50, ["1) Ctrl = STOPPED", "2) Pdu = TX_OFFLINE"], "--err", "--panel-3"),
        box_ml(624, 64, 160, 50, ["3) Clear TxBuffer", "4) TxConf = NO_NOTIF"], "--warn", "--panel-3"),
        arrow_line(602, 89, 624, 89, "--err"),
        pill_note(442, 130, 342, 36, "Gọi CanSM_ControllerBusOff() kích hoạt BOR L1/L2", "--err", "--err-bg"),
    ]
    d["pn_and_busoff"] = svg_wrap(820, 198, "".join(parts))

    # 10. Wakeup Validation 2-Phase Timeline
    parts = [
        box_ml(18, 30, 145, 64, ["1. HW Wakeup", "CanTrcv WUF / INH"], "--pur", "--panel-2"),
        box_ml(192, 30, 162, 64, ["2. CheckWakeup()", "EcuM_SetWakeupEvt", "(Chưa Validate!)"], "--warn", "--panel-2"),
        box_ml(386, 30, 178, 64, ["3. RxIndication()", "Chờ >=1 khung hợp lệ", "(Hoặc chỉ CanNm)"], "--cyan", "--panel-2"),
        box_ml(596, 30, 206, 64, ["4. CheckValidation()", "EcuM_ValidateWakeupEvt()", "ECU giữ FullCom!"], "--ok", "--ok-bg"),
        arrow_line(163, 62, 192, 62, "--pur"),
        arrow_line(354, 62, 386, 62, "--warn"),
        arrow_line(564, 62, 596, 62, "--ok"),
        pill_note(110, 122, 600, 32, "Nếu hết timer mà KHÔNG nhận được Rx hợp lệ -> Coi là nhiễu Glitch ESD -> ECU GoSleep!", "--warn", "--warn-bg"),
    ]
    d["wakeup_validation"] = svg_wrap(820, 172, "".join(parts))

    return d
