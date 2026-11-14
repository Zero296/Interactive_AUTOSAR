# -*- coding: utf-8 -*-
"""18 Crisp Theme-Aware Inline SVG Diagrams for AUTOSAR BswM Handbook (6 Topics x 3 SVGs)."""

from xml.sax.saxutils import escape


def svg_wrap(inner, vb_w=860, vb_h=300):
    return (
        f'<svg class="hb-svg" viewBox="0 0 {vb_w} {vb_h}" '
        f'xmlns="http://www.w3.org/2000/svg">\n'
        f'  <defs>\n'
        f'    <marker id="hbArr" viewBox="0 0 10 10" refX="8" refY="5" '
        f'markerWidth="6" markerHeight="6" orient="auto-start-reverse">\n'
        f'      <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--hb-pri)" />\n'
        f'    </marker>\n'
        f'    <marker id="hbArrOk" viewBox="0 0 10 10" refX="8" refY="5" '
        f'markerWidth="6" markerHeight="6" orient="auto-start-reverse">\n'
        f'      <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--hb-ok)" />\n'
        f'    </marker>\n'
        f'    <marker id="hbArrWarn" viewBox="0 0 10 10" refX="8" refY="5" '
        f'markerWidth="6" markerHeight="6" orient="auto-start-reverse">\n'
        f'      <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--hb-warn)" />\n'
        f'    </marker>\n'
        f'    <marker id="hbArrErr" viewBox="0 0 10 10" refX="8" refY="5" '
        f'markerWidth="6" markerHeight="6" orient="auto-start-reverse">\n'
        f'      <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--hb-err)" />\n'
        f'    </marker>\n'
        f'  </defs>\n'
        f'  <rect x="0" y="0" width="{vb_w}" height="{vb_h}" rx="8" fill="var(--hb-bg)" />\n'
        f'{inner}\n'
        f'</svg>'
    )


def box_ml(x, y, w, h, lines, fill="var(--hb-card)", stroke="var(--hb-bdr)", title_color="var(--hb-pri)", rx=8, sw=1.6):
    """Multi-line centered box annotated with data-box-w for automated overflow verification."""
    out = [
        f'  <rect data-box-x="{x}" data-box-y="{y}" data-box-w="{w}" data-box-h="{h}" '
        f'x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" />'
    ]
    n = len(lines)
    line_h = 15
    total_h = n * line_h
    start_y = y + (h - total_h) / 2 + 12
    cx = x + w / 2
    for idx, line in enumerate(lines):
        if isinstance(line, tuple):
            txt, weight, size, color = line
        else:
            txt = line
            weight = "700" if idx == 0 else "500"
            size = "11.5" if idx == 0 else "10.5"
            color = title_color if idx == 0 else "var(--hb-txt)"
        ty = round(start_y + idx * line_h, 1)
        out.append(
            f'  <text data-box-w="{w}" x="{cx:.1f}" y="{ty}" text-anchor="middle" '
            f'fill="{color}" font-weight="{weight}" font-size="{size}" '
            f'font-family="Segoe UI, Arial, sans-serif">{escape(txt)}</text>'
        )
    return "\n".join(out)


def pill_label(cx, cy, text, bg="var(--hb-card2)", stroke="var(--hb-pri)", color="var(--hb-txt)", font_size="10"):
    """Compact pill badge centered at (cx, cy) with bounding metadata for collision verification."""
    w = max(46, round(len(text) * 6.3 + 14))
    h = 20
    rx = round(cx - w / 2, 1)
    ry = round(cy - h / 2, 1)
    return (
        f'  <g class="hb-pill" data-px="{rx}" data-py="{ry}" data-pw="{w}" data-ph="{h}">\n'
        f'    <rect x="{rx}" y="{ry}" width="{w}" height="{h}" rx="10" fill="{bg}" stroke="{stroke}" stroke-width="1.2" />\n'
        f'    <text x="{cx}" y="{cy + 3.5}" text-anchor="middle" fill="{color}" font-weight="700" font-size="{font_size}" '
        f'font-family="Segoe UI, Arial, sans-serif">{escape(text)}</text>\n'
        f'  </g>'
    )


def line_arrow(x1, y1, x2, y2, color="var(--hb-pri)", marker="hbArr", dashed=False, sw=1.8):
    dash = ' stroke-dasharray="5 3"' if dashed else ""
    return (
        f'  <line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" '
        f'stroke-width="{sw}"{dash} marker-end="url(#{marker})" />'
    )


def path_arrow(d, color="var(--hb-pri)", marker="hbArr", dashed=False, sw=1.8):
    dash = ' stroke-dasharray="5 3"' if dashed else ""
    return (
        f'  <path d="{d}" fill="none" stroke="{color}" stroke-width="{sw}"{dash} marker-end="url(#{marker})" />'
    )


# ==================== TOPIC 0: KIEN TRUC & ARBITRATION ====================

def svg_bswm_architecture():
    parts = [
        '<text x="430" y="22" text-anchor="middle" fill="var(--hb-pri)" font-weight="800" font-size="13">Kiến Trúc 2 Nửa Module BswM: Mode Arbitration → Mode Control (SWS_BswM)</text>',
        # Left inputs
        box_ml(20, 42, 195, 52, ["EcuM / NvM / WdgM", "BswM_EcuM_CurrentState()", "BswM_NvM_CurrentJobMode()"], stroke="var(--hb-ok)", title_color="var(--hb-ok)"),
        box_ml(20, 108, 195, 52, ["ComM / CanSM / Dcm", "ComM_CurrentMode / PNC", "CanSM_State / Dcm 0x28"], stroke="var(--hb-warn)", title_color="var(--hb-warn)"),
        box_ml(20, 174, 195, 52, ["SWC & CDD (via RTE)", "BswMSwcModeRequest", "BswM_RequestMode(u, m)"], stroke="var(--hb-acc)", title_color="var(--hb-acc)"),
        box_ml(20, 240, 195, 44, ["BswM Internal Timer", "BswMTimer_0 (MainFn tick)"], stroke="var(--hb-cyan)", title_color="var(--hb-cyan)"),

        # Center BswM Core container (decorative frame without data-box-x)
        '  <rect x="305" y="42" width="250" height="242" rx="10" fill="var(--hb-card2)" stroke="var(--hb-pri)" stroke-width="2.0" />',
        box_ml(320, 56, 220, 94, [
            ("1. MODE ARBITRATION", "800", "11.5", "var(--hb-pri)"),
            ("Mode Request Ports (MRP)", "600", "10.5", "var(--hb-txt)"),
            ("→ ModeCondition (==, !=)", "500", "10", "var(--hb-mut)"),
            ("→ LogicalExpr (AND/OR/XOR)", "500", "10", "var(--hb-mut)"),
            ("→ BswMRule (Prev → Curr)", "600", "10", "var(--hb-cyan)")
        ], fill="var(--hb-card)", stroke="var(--hb-pri)"),
        box_ml(320, 182, 220, 88, [
            ("2. MODE CONTROL", "800", "11.5", "var(--hb-pur)"),
            ("TrueAL / FalseActionList", "600", "10.5", "var(--hb-txt)"),
            ("BSWM_TRIGGER (Edge)", "500", "10", "var(--hb-mut)"),
            ("BSWM_CONDITION (Level)", "500", "10", "var(--hb-mut)")
        ], fill="var(--hb-card)", stroke="var(--hb-pur)"),

        # Right outputs
        box_ml(635, 42, 205, 52, ["AUTOSAR COM", "Com_IpduGroupStart / Stop", "Enable / DisableRxDM()"], stroke="var(--hb-cyan)", title_color="var(--hb-cyan)"),
        box_ml(635, 108, 205, 52, ["PduR & Nm", "PduR_Enable/DisableRouting", "Nm_DisableCommunication()"], stroke="var(--hb-pur)", title_color="var(--hb-pur)"),
        box_ml(635, 174, 205, 52, ["RTE & SchM & SWC", "Rte_Start() / Rte_Stop()", "Rte_Switch() / SchM_Switch()"], stroke="var(--hb-acc)", title_color="var(--hb-acc)"),
        box_ml(635, 240, 205, 44, ["EcuM / NvM / ComM / DET", "AllowCom / GoDown / DET(42)"], stroke="var(--hb-err)", title_color="var(--hb-err)"),

        # Arrows
        line_arrow(215, 68, 305, 85, "var(--hb-ok)", "hbArrOk"),
        line_arrow(215, 134, 305, 108, "var(--hb-warn)", "hbArrWarn"),
        line_arrow(215, 200, 305, 128, "var(--hb-pri)", "hbArr"),
        line_arrow(215, 262, 305, 144, "var(--hb-cyan)", "hbArr"),
        line_arrow(430, 150, 430, 182, "var(--hb-ok)", "hbArrOk"),
        pill_label(430, 166, "TRUE / FALSE"),

        line_arrow(555, 200, 635, 68, "var(--hb-cyan)", "hbArr"),
        line_arrow(555, 214, 635, 134, "var(--hb-pur)", "hbArr"),
        line_arrow(555, 228, 635, 200, "var(--hb-acc)", "hbArr"),
        line_arrow(555, 246, 635, 262, "var(--hb-err)", "hbArrErr"),
        pill_label(260, 62, "MRP In"),
        pill_label(595, 268, "Actions"),
    ]
    return svg_wrap("\n".join(parts), 860, 305)


def svg_arb_vs_ctrl_pipeline():
    parts = [
        '<text x="430" y="22" text-anchor="middle" fill="var(--hb-pri)" font-weight="800" font-size="13">Luồng Xử Lý Chi Tiết: Từ Mode Indication Tới Atomic &amp; Cascaded Actions</text>',
        box_ml(20, 52, 165, 86, ["Bước 1: API / RTE", "BswM_*_CurrentState()", "hoặc Rte_Write()", "Check DET (Init/Range)"], stroke="var(--hb-pri)"),
        box_ml(220, 52, 175, 86, ["Bước 2: MRP Processing", "BSWM_IMMEDIATE:", "Đánh giá ngay lập tức", "BSWM_DEFERRED: Queue"], stroke="var(--hb-warn)", title_color="var(--hb-warn)"),
        box_ml(435, 52, 190, 86, ["Bước 3: Arbitrate Rule", "So sánh ModeCondition", "Tính BswMLogicalExpr", "So khớp Prev vs Curr"], stroke="var(--hb-cyan)", title_color="var(--hb-cyan)"),
        box_ml(665, 52, 175, 86, ["Bước 4: Chọn Nhánh", "Curr == TRUE -> TrueAL", "Curr == FALSE -> FalseAL", "TRIGGER vs CONDITION"], stroke="var(--hb-ok)", title_color="var(--hb-ok)"),

        box_ml(85, 190, 225, 76, ["ActionList Item #1..N", "Chạy tuần tự theo Index", "BswMPduGroupSwitch", "BswMDeadlineMonitoring"], fill="var(--hb-card2)", stroke="var(--hb-pur)", title_color="var(--hb-pur)"),
        box_ml(355, 190, 225, 76, ["Kiểm Tra BswMAbortOnFail", "Item trả về E_NOT_OK?", "TRUE -> Dừng khẩn cấp!", "FALSE -> Bỏ qua chạy tiếp"], fill="var(--hb-card2)", stroke="var(--hb-err)", title_color="var(--hb-err)"),
        box_ml(620, 190, 215, 76, ["Cascaded List / Sub-Rule", "Gọi lồng BswMActionList", "hoặc đánh giá Sub-Rule", "Cập nhật Bit Registers"], fill="var(--hb-card2)", stroke="var(--hb-ok)", title_color="var(--hb-ok)"),

        line_arrow(185, 95, 220, 95),
        line_arrow(395, 95, 435, 95),
        line_arrow(625, 95, 665, 95, "var(--hb-ok)", "hbArrOk"),
        path_arrow("M 752 138 L 752 162 L 197 162 L 197 190", "var(--hb-ok)", "hbArrOk"),
        pill_label(480, 162, "Kích Hoạt Thực Thi ActionList (Mode Control)", stroke="var(--hb-ok)"),
        line_arrow(310, 228, 355, 228, "var(--hb-err)", "hbArrErr"),
        line_arrow(580, 228, 620, 228, "var(--hb-ok)", "hbArrOk"),
    ]
    return svg_wrap("\n".join(parts), 860, 286)


def svg_io_interaction_map():
    parts = [
        '<text x="430" y="22" text-anchor="middle" fill="var(--hb-pri)" font-weight="800" font-size="13">Bản Đồ Tương Tác Đẩy Đủ Input Sources ↔ BswM Core ↔ Output Action Targets</text>',
        box_ml(20, 44, 230, 226, [
            ("NGUỒN INPUT (Mode Ports)", "800", "11.5", "var(--hb-cyan)"),
            ("• EcuM: CurrentState / Wakeup", "500", "10.5", "var(--hb-txt)"),
            ("• NvM: CurrentJobMode / Block", "500", "10.5", "var(--hb-txt)"),
            ("• ComM: CurrentMode / PNCMode", "500", "10.5", "var(--hb-txt)"),
            ("• CanSM: BUS_OFF / FULL / NO", "500", "10.5", "var(--hb-txt)"),
            ("• Dcm: ComControl / ResetMode", "500", "10.5", "var(--hb-txt)"),
            ("• WdgM: RequestPartitionReset", "500", "10.5", "var(--hb-txt)"),
            ("• SWC/CDD: BswMSwcModeReq", "500", "10.5", "var(--hb-txt)"),
            ("• BswMTimer: STARTED/EXPIRED", "500", "10.5", "var(--hb-txt)")
        ], stroke="var(--hb-cyan)"),
        box_ml(340, 82, 180, 148, [
            ("BswM POLICY CORE", "800", "12", "var(--hb-pri)"),
            ("ArbitrationMatrix + Rules", "600", "10.5", "var(--hb-txt)"),
            ("Deferred Queue (MainFn)", "500", "10.5", "var(--hb-warn)"),
            ("8-Bit Arb Register", "500", "10.5", "var(--hb-mut)"),
            ("8-Bit Act Register", "500", "10.5", "var(--hb-mut)")
        ], fill="var(--hb-card2)", stroke="var(--hb-pri)", sw=2.0),
        box_ml(610, 44, 230, 226, [
            ("ĐÍCH OUTPUT (BSW Actions)", "800", "11.5", "var(--hb-ok)"),
            ("• COM: IpduGroupStart / Stop", "500", "10.5", "var(--hb-txt)"),
            ("• COM: Enable / DisableRxDM", "500", "10.5", "var(--hb-txt)"),
            ("• COM: TriggerIPDUSend(Pdu)", "500", "10.5", "var(--hb-txt)"),
            ("• PduR: Enable / DisableRouting", "500", "10.5", "var(--hb-txt)"),
            ("• ComM: CommunicationAllowed", "500", "10.5", "var(--hb-txt)"),
            ("• Nm: Disable / EnableComm", "500", "10.5", "var(--hb-txt)"),
            ("• RTE/SchM: Rte_Start / Switch", "500", "10.5", "var(--hb-txt)"),
            ("• EcuM/NvM: Callout / GoDown", "500", "10.5", "var(--hb-txt)")
        ], stroke="var(--hb-ok)"),
        line_arrow(250, 156, 340, 156, "var(--hb-cyan)", "hbArr"),
        line_arrow(520, 156, 610, 156, "var(--hb-ok)", "hbArrOk"),
        pill_label(295, 130, "Read MRP", stroke="var(--hb-cyan)"),
        pill_label(565, 130, "Exec AL", stroke="var(--hb-ok)"),
    ]
    return svg_wrap("\n".join(parts), 860, 290)


# ==================== TOPIC 1: MRP & IMMEDIATE/DEFERRED ====================

def svg_mrp_indication_vs_request():
    parts = [
        '<text x="430" y="22" text-anchor="middle" fill="var(--hb-pri)" font-weight="800" font-size="13">Phân Biệt 3 Loại Nguồn Mode Request Port (MRP) Đầu Vào Của BswM</text>',
        box_ml(24, 48, 250, 195, [
            ("1. BSW MODE INDICATION", "800", "11.5", "var(--hb-warn)"),
            ("Nguồn bị động (Trạng thái thực)", "600", "10.5", "var(--hb-txt)"),
            ("ComM_CurrentMode()", "500", "10", "var(--hb-mut)"),
            ("CanSM_CurrentState()", "500", "10", "var(--hb-mut)"),
            ("EcuM_CurrentState()", "500", "10", "var(--hb-mut)"),
            ("NvM_CurrentJobMode()", "500", "10", "var(--hb-mut)"),
            ("Dcm_CommunicationMode()", "500", "10", "var(--hb-mut)"),
            ("→ Thường IMM cho CanSM/Dcm", "700", "10", "var(--hb-ok)")
        ], stroke="var(--hb-warn)"),
        box_ml(305, 48, 250, 195, [
            ("2. MODE REQUEST (SWC/CDD)", "800", "11.5", "var(--hb-acc)"),
            ("Yêu cầu chủ động chuyển Mode", "600", "10.5", "var(--hb-txt)"),
            ("SWC: Rte_Write(Port, Mode)", "500", "10", "var(--hb-mut)"),
            ("CDD: BswM_RequestMode(u, m)", "500", "10", "var(--hb-mut)"),
            ("Check MaxUserId & MaxMode", "500", "10", "var(--hb-mut)"),
            ("Hỗ trợ BswMModeReqPort", "500", "10", "var(--hb-mut)"),
            ("→ Thường DEFERRED theo Task", "700", "10", "var(--hb-warn)")
        ], stroke="var(--hb-acc)"),
        box_ml(586, 48, 250, 195, [
            ("3. BSWM INTERNAL / TIMER", "800", "11.5", "var(--hb-cyan)"),
            ("Trạng thái nội sinh trong BswM", "600", "10.5", "var(--hb-txt)"),
            ("MRP_Timer0_State:", "500", "10", "var(--hb-mut)"),
            ("STOPPED / STARTED / EXPIRED", "500", "10", "var(--hb-mut)"),
            ("BswMTimerControl cập nhật", "500", "10", "var(--hb-mut)"),
            ("Đếm lùi ở BswM_MainFunction", "500", "10", "var(--hb-mut)"),
            ("→ Đánh thức Rule khi 0 ms", "700", "10", "var(--hb-cyan)")
        ], stroke="var(--hb-cyan)"),
    ]
    return svg_wrap("\n".join(parts), 860, 265)


def svg_immediate_vs_deferred_timing():
    parts = [
        '<text x="430" y="22" text-anchor="middle" fill="var(--hb-pri)" font-weight="800" font-size="13">So Sánh Thời Điểm Thực Thi: BSWM_IMMEDIATE vs BSWM_DEFERRED (SWS_BswM_00051/52)</text>',
        # Row 1: IMMEDIATE
        box_ml(20, 46, 175, 76, ["Caller: CanSM (Bus-Off)", "t = 12 ms (ISR/Task)", "Gọi BswM_CanSM_State()"], stroke="var(--hb-ok)", title_color="var(--hb-ok)"),
        box_ml(255, 46, 225, 76, ["MRP = BSWM_IMMEDIATE", "Bit 6 Thanh A (IMM_PROC)=1", "Đánh giá ngay trong hàm gọi!"], fill="var(--hb-card2)", stroke="var(--hb-ok)", title_color="var(--hb-ok)"),
        box_ml(545, 46, 290, 76, ["Kết quả tại t = 12 ms (Độ trễ = 0ms)", "Com_IpduGroupStop(IG_0_Tx) CHẠY NGAY!", "Không cần đợi MainFunction()"], stroke="var(--hb-ok)", title_color="var(--hb-ok)"),
        line_arrow(195, 84, 255, 84, "var(--hb-ok)", "hbArrOk"),
        line_arrow(480, 84, 545, 84, "var(--hb-ok)", "hbArrOk"),
        pill_label(512, 60, "0 ms", stroke="var(--hb-ok)"),

        # Row 2: DEFERRED
        box_ml(20, 166, 175, 86, ["Caller: SWC / NvM / EcuM", "t = 12 ms", "Gọi RequestMode / EcuM()"], stroke="var(--hb-warn)", title_color="var(--hb-warn)"),
        box_ml(245, 166, 185, 86, ["MRP = BSWM_DEFERRED", "Ghi Deferred Queue", "Bit 5 Thanh A = 1 & Return"], fill="var(--hb-card2)", stroke="var(--hb-warn)", title_color="var(--hb-warn)"),
        box_ml(470, 166, 160, 86, ["Đợi BswM_MainFunction", "Chu kỳ kế t = 20 ms", "Xả Queue → Arbitrate"], stroke="var(--hb-pri)", title_color="var(--hb-pri)"),
        box_ml(668, 166, 168, 86, ["Chạy ActionList t=20ms", "An toàn Context OS Task", "Tránh kẹt ISR / Caller"], stroke="var(--hb-cyan)", title_color="var(--hb-cyan)"),
        line_arrow(195, 208, 245, 208, "var(--hb-warn)", "hbArrWarn"),
        line_arrow(430, 208, 470, 208, "var(--hb-pri)", "hbArr", dashed=True),
        line_arrow(630, 208, 668, 208, "var(--hb-pri)", "hbArr"),
        pill_label(450, 144, "Hoãn tối đa 1 chu kỳ MainFunction (vd 10ms)", stroke="var(--hb-warn)"),
    ]
    return svg_wrap("\n".join(parts), 860, 275)


def svg_reentrancy_and_queue():
    parts = [
        '<text x="430" y="22" text-anchor="middle" fill="var(--hb-pri)" font-weight="800" font-size="13">Cơ Chế Bảo Vệ Re-entrancy (SWS_BswM_00143) &amp; Hàng Đợi Deferred Queue</text>',
        box_ml(25, 48, 220, 80, ["1. BswM Đang Chạy ActionList", "Cờ ReentrancyBusy = TRUE", "(SchM_Enter ExclusiveArea)"], fill="var(--hb-card2)", stroke="var(--hb-pri)"),
        box_ml(320, 48, 225, 80, ["2. ActionList Gọi ComM/CanSM", "Module đích phản hồi ngay:", "BswM_ComM_CurrentMode()!"], stroke="var(--hb-warn)", title_color="var(--hb-warn)"),
        box_ml(615, 48, 220, 80, ["3. Phát Hiện Lồng Nhau!", "Dù cổng là BSWM_IMMEDIATE,", "BswM TỪ CHỐI chạy đệ quy!"], stroke="var(--hb-err)", title_color="var(--hb-err)"),

        box_ml(70, 180, 720, 84, [
            ("4. CHUYỂN HƯỚNG AN TOÀN SANG DEFERRED QUEUE", "800", "11.5", "var(--hb-ok)"),
            ("Ghi {port:'comm', val:MODE} vào Queue → Bit 5 (DEF_PENDING)=1 → Return ngay", "600", "10.5", "var(--hb-txt)"),
            ("Khi ActionList 1 kết thúc & tới BswM_MainFunction(), Queue được xả sạch tuần tự.", "500", "10", "var(--hb-mut)")
        ], fill="var(--hb-card2)", stroke="var(--hb-ok)"),

        line_arrow(245, 88, 320, 88, "var(--hb-warn)", "hbArrWarn"),
        line_arrow(545, 88, 615, 88, "var(--hb-err)", "hbArrErr"),
        path_arrow("M 725 128 L 725 154 L 430 154 L 430 180", "var(--hb-ok)", "hbArrOk"),
        pill_label(580, 154, "Không bao giờ mất sự kiện / Không Stack Overflow", stroke="var(--hb-ok)"),
    ]
    return svg_wrap("\n".join(parts), 860, 285)


# ==================== TOPIC 2: RULES & TRIGGER/CONDITION ====================

def svg_rule_truth_table_flow():
    parts = [
        '<text x="430" y="22" text-anchor="middle" fill="var(--hb-pri)" font-weight="800" font-size="13">Chuỗi Đánh Giá Logic: ModeCondition → BswMLogicalExpression → BswMRule</text>',
        box_ml(20, 48, 175, 76, ["MRP_ComM_Ch0", "== COMM_FULL_COM ?", "Cond_A = TRUE/FALSE"], stroke="var(--hb-cyan)"),
        box_ml(20, 164, 175, 76, ["MRP_CanSM_Ch0", "== CANSM_FULL_COM ?", "Cond_B = TRUE/FALSE"], stroke="var(--hb-warn)", title_color="var(--hb-warn)"),

        box_ml(255, 102, 195, 88, ["BswMLogicalExpression", "Toán tử BswMLogicalOperator:", "BSWM_AND / OR / XOR / NAND", "Tính ra CurrResult (0/1)"], fill="var(--hb-card2)", stroke="var(--hb-pri)", sw=1.8),
        box_ml(505, 102, 140, 88, ["BswMRule Memory", "So sánh Curr vs Prev", "(Init từ InitState)", "Changed = (P != C)"], stroke="var(--hb-pur)", title_color="var(--hb-pur)"),
        box_ml(710, 58, 130, 72, ["TrueActionList", "Khi Curr = TRUE", "AL_EnableTxRxDM"], stroke="var(--hb-ok)", title_color="var(--hb-ok)"),
        box_ml(710, 166, 130, 72, ["FalseActionList", "Khi Curr = FALSE", "AL_DisableTxRxDM"], stroke="var(--hb-err)", title_color="var(--hb-err)"),

        path_arrow("M 195 86 L 225 86 L 225 132 L 255 132", "var(--hb-cyan)", "hbArr"),
        path_arrow("M 195 202 L 225 202 L 225 160 L 255 160", "var(--hb-warn)", "hbArrWarn"),
        line_arrow(450, 146, 505, 146),
        path_arrow("M 645 132 L 678 132 L 678 94 L 710 94", "var(--hb-ok)", "hbArrOk"),
        path_arrow("M 645 162 L 678 162 L 678 202 L 710 202", "var(--hb-err)", "hbArrErr"),
        pill_label(678, 42, "TRUE", stroke="var(--hb-ok)"),
        pill_label(678, 252, "FALSE", stroke="var(--hb-err)"),
    ]
    return svg_wrap("\n".join(parts), 860, 272)


def svg_trigger_vs_condition_wave():
    parts = [
        '<text x="430" y="22" text-anchor="middle" fill="var(--hb-pri)" font-weight="800" font-size="13">Biểu Đồ Sóng: BSWM_TRIGGER (Chạy Theo Sườn Đổi) vs BSWM_CONDITION (Lặp Chu Kỳ)</text>',
        box_ml(20, 48, 180, 54, ["Kết Quả Rule (t=0..50ms)", "t0:FALSE → t1..t3:TRUE", "→ t4:FALSE"], stroke="var(--hb-txt)"),
        box_ml(20, 122, 180, 62, ["BSWM_TRIGGER", "(SWS_BswM_00056)", "Chỉ chạy khi Prev != Curr"], stroke="var(--hb-pri)"),
        box_ml(20, 202, 180, 62, ["BSWM_CONDITION", "(SWS_BswM_00057)", "Chạy MỌI lần Rule đánh giá"], stroke="var(--hb-cyan)", title_color="var(--hb-cyan)"),

        # Digital waveform table for ticks t0..t4
        box_ml(220, 48, 115, 54, ["t=0ms: FALSE", "(Prev=FALSE)"], stroke="var(--hb-bdr)"),
        box_ml(345, 48, 115, 54, ["t=10ms: TRUE", "(Sườn Lên ↑)"], stroke="var(--hb-ok)", title_color="var(--hb-ok)"),
        box_ml(470, 48, 115, 54, ["t=20ms: TRUE", "(Giữ Nguyên)"], stroke="var(--hb-ok)", title_color="var(--hb-ok)"),
        box_ml(595, 48, 115, 54, ["t=30ms: TRUE", "(Giữ Nguyên)"], stroke="var(--hb-ok)", title_color="var(--hb-ok)"),
        box_ml(720, 48, 115, 54, ["t=40ms: FALSE", "(Sườn Xuống ↓)"], stroke="var(--hb-err)", title_color="var(--hb-err)"),

        # TRIGGER row
        box_ml(220, 122, 115, 62, ["SKIP", "P==C (F==F)"], stroke="var(--hb-bdr)", title_color="var(--hb-mut)"),
        box_ml(345, 122, 115, 62, ["RUN TrueAL!", "F → T (Đổi)"], fill="var(--hb-card2)", stroke="var(--hb-ok)", title_color="var(--hb-ok)"),
        box_ml(470, 122, 115, 62, ["SKIP!", "T==T (Không đổi)"], stroke="var(--hb-bdr)", title_color="var(--hb-mut)"),
        box_ml(595, 122, 115, 62, ["SKIP!", "T==T (Không đổi)"], stroke="var(--hb-bdr)", title_color="var(--hb-mut)"),
        box_ml(720, 122, 115, 62, ["RUN FalseAL!", "T → F (Đổi)"], fill="var(--hb-card2)", stroke="var(--hb-err)", title_color="var(--hb-err)"),

        # CONDITION row
        box_ml(220, 202, 115, 62, ["RUN FalseAL", "(Hoặc bỏ qua)"], stroke="var(--hb-bdr)", title_color="var(--hb-mut)"),
        box_ml(345, 202, 115, 62, ["RUN TrueAL!", "Lần 1 (t=10ms)"], fill="var(--hb-card2)", stroke="var(--hb-cyan)", title_color="var(--hb-cyan)"),
        box_ml(470, 202, 115, 62, ["RUN TrueAL!", "Lặp lần 2!"], fill="var(--hb-card2)", stroke="var(--hb-cyan)", title_color="var(--hb-cyan)"),
        box_ml(595, 202, 115, 62, ["RUN TrueAL!", "Lặp lần 3!"], fill="var(--hb-card2)", stroke="var(--hb-cyan)", title_color="var(--hb-cyan)"),
        box_ml(720, 202, 115, 62, ["RUN FalseAL!", "Về nhánh Sai"], fill="var(--hb-card2)", stroke="var(--hb-err)", title_color="var(--hb-err)"),
    ]
    return svg_wrap("\n".join(parts), 860, 285)


def svg_rule_init_undefined():
    parts = [
        '<text x="430" y="22" text-anchor="middle" fill="var(--hb-pri)" font-weight="800" font-size="13">Tại Sao Phải Đặt BswMRuleInitState = BSWM_UNDEFINED Lúc Boot-Up? (Kịch Bản S7)</text>',
        # Left: Init = FALSE
        box_ml(20, 48, 400, 205, [
            ("TRƯỜNG HỢP A: BswMRuleInitState = BSWM_FALSE", "800", "11.5", "var(--hb-warn)"),
            ("1. BswM_Init() nạp PrevResult = BSWM_FALSE", "600", "10.5", "var(--hb-txt)"),
            ("2. Lần đầu đánh giá: ComM = NO_COM → Curr = FALSE", "500", "10", "var(--hb-txt)"),
            ("3. So sánh: Prev (FALSE) == Curr (FALSE) → KHÔNG ĐỔI!", "700", "10.5", "var(--hb-err)"),
            ("4. Với BSWM_TRIGGER: FalseActionList BỊ BỎ QUA!", "700", "10.5", "var(--hb-err)"),
            ("Hậu quả: Không chạy khóa an toàn ban đầu.", "500", "10", "var(--hb-mut)")
        ], stroke="var(--hb-warn)"),
        # Right: Init = UNDEFINED
        box_ml(440, 48, 400, 205, [
            ("TRƯỜNG HỢP B: BswMRuleInitState = BSWM_UNDEFINED", "800", "11.5", "var(--hb-ok)"),
            ("1. BswM_Init() nạp PrevResult = BSWM_UNDEFINED", "600", "10.5", "var(--hb-txt)"),
            ("2. Lần đầu đánh giá: ComM = NO_COM → Curr = FALSE", "500", "10", "var(--hb-txt)"),
            ("3. So sánh: Prev (UNDEF) != Curr (FALSE) → ĐỔI!", "700", "10.5", "var(--hb-ok)"),
            ("4. Với BSWM_TRIGGER: FalseActionList ĐƯỢC CHẠY!", "700", "10.5", "var(--hb-ok)"),
            ("Lợi ích: Chạy khóa PduR / Rte(NORMAL) ngay lúc boot.", "500", "10", "var(--hb-mut)")
        ], fill="var(--hb-card2)", stroke="var(--hb-ok)"),
    ]
    return svg_wrap("\n".join(parts), 860, 275)


# ==================== TOPIC 3: ACTIONLIST, I-PDU & DCM 0x28 ====================

def svg_cascaded_action_abort():
    parts = [
        '<text x="430" y="22" text-anchor="middle" fill="var(--hb-pri)" font-weight="800" font-size="13">Cascaded ActionList Đa Tầng &amp; Cơ Chế Ngắt Lỗi BswMAbortOnFail = TRUE (S8)</text>',
        box_ml(20, 46, 200, 72, ["Item #1: Atomic Action", "Com_IpduGroupStart()", "Return: E_OK → Tiếp tục"], stroke="var(--hb-ok)", title_color="var(--hb-ok)"),
        box_ml(255, 46, 220, 72, ["Item #2: User Callout", "BswM_User_CheckPower()", "Return: E_NOT_OK (Lỗi!)"], fill="var(--hb-card2)", stroke="var(--hb-err)", title_color="var(--hb-err)"),
        box_ml(540, 46, 295, 72, ["BswMAbortOnFail Decision", "TRUE → HỦY BỎ ITEM #3 & #4!", "FALSE → Cảnh báo & chạy tiếp #3"], stroke="var(--hb-warn)", title_color="var(--hb-warn)"),

        box_ml(100, 175, 290, 76, ["Item #3: Nested ActionList (AL_Sub)", "Com_EnableReceptionDM(IG_2_DM)", "PduR_EnableRouting(RPG_0_GW)"], stroke="var(--hb-pur)", title_color="var(--hb-pur)"),
        box_ml(470, 175, 290, 76, ["Item #4: Sub-Rule Evaluation", "Đánh giá SubRule_PncCheck", "Com_IpduGroupStart(IG_3_PNC16)"], stroke="var(--hb-cyan)", title_color="var(--hb-cyan)"),

        line_arrow(220, 82, 255, 82, "var(--hb-ok)", "hbArrOk"),
        line_arrow(475, 82, 540, 82, "var(--hb-err)", "hbArrErr"),
        path_arrow("M 687 118 L 687 148 L 245 148 L 245 175", "var(--hb-warn)", "hbArrWarn", dashed=True),
        line_arrow(390, 213, 470, 213, "var(--hb-pur)", "hbArr", dashed=True),
        pill_label(460, 148, "Nếu AbortOnFail=TRUE: Nhánh #3 & #4 BỊ CẮT BỎ (Bit 1 Thanh B = 1)", stroke="var(--hb-err)"),
    ]
    return svg_wrap("\n".join(parts), 860, 272)


def svg_ipdu_vector_bitmask():
    parts = [
        '<text x="430" y="22" text-anchor="middle" fill="var(--hb-pri)" font-weight="800" font-size="13">Ma Trận Đóng Mở 8-Bit Com_IpduGroupVector &amp; PduR Routing Theo Trạng Thái</text>',
        box_ml(20, 44, 155, 42, ["Trạng Thái Mạng", "Scenario"], fill="var(--hb-card2)", stroke="var(--hb-pri)"),
        box_ml(185, 44, 155, 42, ["IG_0_Tx / IG_1_Rx", "Normal App"], fill="var(--hb-card2)", stroke="var(--hb-pri)"),
        box_ml(350, 44, 145, 42, ["IG_2_Rx_DM", "Timeout Mon"], fill="var(--hb-card2)", stroke="var(--hb-pri)"),
        box_ml(505, 44, 165, 42, ["IG_5_Diag / IG_6_NM", "UDS & CanNm"], fill="var(--hb-card2)", stroke="var(--hb-pri)"),
        box_ml(680, 44, 160, 42, ["RPG_0_Gateway", "PduR Routing"], fill="var(--hb-card2)", stroke="var(--hb-pri)"),

        # Row FULL_COM
        box_ml(20, 96, 155, 40, ["FULL_COM (S2)", "Tx + Rx Online"], stroke="var(--hb-ok)", title_color="var(--hb-ok)"),
        box_ml(185, 96, 155, 40, ["Tx: ON | Rx: ON"], stroke="var(--hb-ok)", title_color="var(--hb-ok)"),
        box_ml(350, 96, 145, 40, ["DM: ENABLED"], stroke="var(--hb-cyan)", title_color="var(--hb-cyan)"),
        box_ml(505, 96, 165, 40, ["Diag: ON | NM: ON"], stroke="var(--hb-ok)", title_color="var(--hb-ok)"),
        box_ml(680, 96, 160, 40, ["RPG_0: ENABLED"], stroke="var(--hb-pur)", title_color="var(--hb-pur)"),

        # Row SILENT_COM
        box_ml(20, 144, 155, 40, ["SILENT_COM (S3)", "Chỉ Nghe Bus"], stroke="var(--hb-warn)", title_color="var(--hb-warn)"),
        box_ml(185, 144, 155, 40, ["Tx: OFF | Rx: ON!"], stroke="var(--hb-warn)", title_color="var(--hb-warn)"),
        box_ml(350, 144, 145, 40, ["DM: DISABLED!"], stroke="var(--hb-err)", title_color="var(--hb-err)"),
        box_ml(505, 144, 165, 40, ["Diag: ON | NM: Rx"], stroke="var(--hb-warn)", title_color="var(--hb-warn)"),
        box_ml(680, 144, 160, 40, ["RPG_0: HOLD/OFF"], stroke="var(--hb-bdr)", title_color="var(--hb-mut)"),

        # Row BUS_OFF
        box_ml(20, 192, 155, 40, ["BUS_OFF (S4)", "Cắt Khẩn Cấp IMM"], stroke="var(--hb-err)", title_color="var(--hb-err)"),
        box_ml(185, 192, 155, 40, ["Tx: OFF! | Rx: ON"], stroke="var(--hb-err)", title_color="var(--hb-err)"),
        box_ml(350, 192, 145, 40, ["DM: DISABLED!"], stroke="var(--hb-err)", title_color="var(--hb-err)"),
        box_ml(505, 192, 165, 40, ["Diag: HOLD"], stroke="var(--hb-bdr)", title_color="var(--hb-mut)"),
        box_ml(680, 192, 160, 40, ["RPG_0: OFF"], stroke="var(--hb-bdr)", title_color="var(--hb-mut)"),

        # Row DCM 0x28
        box_ml(20, 240, 155, 40, ["DCM 0x28 (S12)", "DISABLE_NORM_NM"], stroke="var(--hb-pur)", title_color="var(--hb-pur)"),
        box_ml(185, 240, 155, 40, ["Tx: OFF | Rx: OFF"], stroke="var(--hb-err)", title_color="var(--hb-err)"),
        box_ml(350, 240, 145, 40, ["DM: DISABLED"], stroke="var(--hb-err)", title_color="var(--hb-err)"),
        box_ml(505, 240, 165, 40, ["Diag: ON! | NM: OFF"], stroke="var(--hb-cyan)", title_color="var(--hb-cyan)"),
        box_ml(680, 240, 160, 40, ["Flash Programming OK"], stroke="var(--hb-ok)", title_color="var(--hb-ok)"),
    ]
    return svg_wrap("\n".join(parts), 860, 295)


def svg_dcm0x28_matrix():
    parts = [
        '<text x="430" y="22" text-anchor="middle" fill="var(--hb-pri)" font-weight="800" font-size="13">Luồng Xử Lý Dịch Vụ UDS 0x28 CommunicationControl Qua DCM → BswM (Kịch Bản S12)</text>',
        box_ml(20, 56, 175, 82, ["Tester Chẩn Đoán", "Gửi UDS 0x28 0x03 0x03", "(DisableRxAndTx,", "Normal + NM Messages)"], stroke="var(--hb-warn)", title_color="var(--hb-warn)"),
        box_ml(235, 56, 195, 82, ["DCM Module", "BswM_Dcm_Communication", "Mode_CurrentState(Ch0,", "DISABLE_RX_TX_NORM_NM)"], stroke="var(--hb-pri)"),
        box_ml(470, 56, 175, 82, ["BswM Rule_04 (IMM)", "Dcm != ENABLE_ALL", "→ Chạy tức thời:", "AL_DcmDisableNormNm"], fill="var(--hb-card2)", stroke="var(--hb-pur)", title_color="var(--hb-pur)"),
        box_ml(680, 56, 160, 82, ["AUTOSAR COM & Nm", "Stop IG_0_Tx & IG_1_Rx", "Nm_DisableComm(Ch0)", "GIỮ IG_5_Diag_Pdu!"], stroke="var(--hb-ok)", title_color="var(--hb-ok)"),

        box_ml(60, 185, 740, 68, [
            ("TẠI SAO IG_5_Diag_Pdu PHẢI GIỮ BẬT (0x20 = 1)?", "800", "11", "var(--hb-cyan)"),
            ("Khi Bootloader / Flash ECU, mạng Normal & NM cần im lặng hoàn toàn để tránh nhiễu bus,", "500", "10.5", "var(--hb-txt)"),
            ("nhưng Tester vẫn cần kênh UDS (0x34 RequestDownload, 0x36 TransferData) hoạt động!", "500", "10.5", "var(--hb-txt)")
        ], fill="var(--hb-card2)", stroke="var(--hb-cyan)"),

        line_arrow(195, 97, 235, 97, "var(--hb-warn)", "hbArrWarn"),
        line_arrow(430, 97, 470, 97),
        line_arrow(645, 97, 680, 97, "var(--hb-ok)", "hbArrOk"),
    ]
    return svg_wrap("\n".join(parts), 860, 272)


# ==================== TOPIC 4: VONG DOI ECU & SWC/RTE ====================

def svg_ecum_boot_sequence():
    parts = [
        '<text x="430" y="22" text-anchor="middle" fill="var(--hb-pri)" font-weight="800" font-size="13">Chuỗi Khởi Động ECU Hai Pha: EcuM Flexible + BswM + NvM_ReadAll() + Rte_Start() (S1)</text>',
        box_ml(20, 52, 145, 76, ["1. STARTUP_ONE", "EcuM gọi", "BswM_Init()", "(Init = 1, Vector=0)"], stroke="var(--hb-pri)"),
        box_ml(195, 52, 155, 76, ["2. STARTUP_TWO", "BswM_EcuM_State()", "Rule_01a → TRUE", "Gọi NvM_ReadAll()"], stroke="var(--hb-warn)", title_color="var(--hb-warn)"),
        box_ml(380, 52, 165, 76, ["3. Wait NvM + Timer", "NvM = NVM_REQ_PENDING", "BswMTimer = STARTED", "Rte_Start CHƯA mở!"], stroke="var(--hb-cyan)", title_color="var(--hb-cyan)"),
        box_ml(575, 52, 265, 76, ["4. RUN READY (AL_EnterRunMode)", "NvM báo NVM_REQ_OK (hoặc Timer=0)", "→ Rte_Start() + ComM_AllowCom(TRUE)", "→ EcuM_SetState(ECUM_STATE_RUN)"], fill="var(--hb-card2)", stroke="var(--hb-ok)", title_color="var(--hb-ok)"),

        box_ml(60, 178, 740, 68, [
            ("NGUYÊN TẮC AN TOÀN DỮ LIỆU KHI BOOT-UP", "800", "11", "var(--hb-ok)"),
            ("Không bao giờ cho phép SWC chạy Runnable (Rte_Start) hoặc mở mạng trước khi NvM đọc xong", "500", "10.5", "var(--hb-txt)"),
            ("dữ liệu Flash. BswMTimer đóng vai trò Timeout dự phòng nếu EEPROM / Flash gặp sự cố.", "500", "10.5", "var(--hb-txt)")
        ], stroke="var(--hb-bdr)"),

        line_arrow(165, 90, 195, 90),
        line_arrow(350, 90, 380, 90, "var(--hb-warn)", "hbArrWarn"),
        line_arrow(545, 90, 575, 90, "var(--hb-ok)", "hbArrOk"),
    ]
    return svg_wrap("\n".join(parts), 860, 268)


def svg_ecum_shutdown_sequence():
    parts = [
        '<text x="430" y="22" text-anchor="middle" fill="var(--hb-pri)" font-weight="800" font-size="13">Chuỗi Tắt Máy An Toàn: PREP_SHUTDOWN → Rte_Stop → NvM_WriteAll → GoDown (S13)</text>',
        box_ml(20, 52, 180, 80, ["1. PREP_SHUTDOWN", "EcuM báo sang BswM", "Rule_07 kích hoạt", "AL_PrepShutdown"], stroke="var(--hb-warn)", title_color="var(--hb-warn)"),
        box_ml(235, 52, 195, 80, ["2. Cô Lập Mạng & SWC", "ComM_Allow(Ch0, FALSE)", "Tắt mọi I-PDU (0x00)", "Gọi Rte_Stop() + NvM_WriteAll"], stroke="var(--hb-err)", title_color="var(--hb-err)"),
        box_ml(465, 52, 170, 80, ["3. Đợi Flash Ghi Xong", "Chờ callback:", "BswM_NvM_JobMode", "(NVM_WRITE_ALL, OK)"], stroke="var(--hb-cyan)", title_color="var(--hb-cyan)"),
        box_ml(670, 52, 170, 80, ["4. GO_OFF & Deinit", "SelectShutdownTarget", "EcuM_GoDownHaltPoll()", "BswM_Deinit() (Init=0)"], fill="var(--hb-card2)", stroke="var(--hb-pur)", title_color="var(--hb-pur)"),

        box_ml(60, 180, 740, 68, [
            ("VÌ SAO TÁCH BIỆT nvmJobType (NVM_READ_ALL vs NVM_WRITE_ALL)?", "800", "11", "var(--hb-pur)"),
            ("Cả NvM_ReadAll lúc mở máy và NvM_WriteAll lúc tắt máy đều trả về mã NVM_REQ_OK giống nhau.", "500", "10.5", "var(--hb-txt)"),
            ("Rule_08 chỉ chạy khi (EcuM == PREP_SHUTDOWN && ServiceId == WRITE_ALL && Result == OK).", "500", "10.5", "var(--hb-txt)")
        ], stroke="var(--hb-bdr)"),

        line_arrow(200, 92, 235, 92, "var(--hb-err)", "hbArrErr"),
        line_arrow(430, 92, 465, 92, "var(--hb-cyan)", "hbArr"),
        line_arrow(635, 92, 670, 92, "var(--hb-pur)", "hbArr"),
    ]
    return svg_wrap("\n".join(parts), 860, 270)


def svg_swc_rte_two_way():
    parts = [
        '<text x="430" y="22" text-anchor="middle" fill="var(--hb-pri)" font-weight="800" font-size="13">Vòng Khép Kín Hai Chiều: SWC ↔ RTE ↔ BswM ↔ SchM &amp; AUTOSAR COM (S9)</text>',
        box_ml(25, 62, 210, 128, [
            ("SWC_App / SWC_ModeMgr", "800", "11.5", "var(--hb-acc)"),
            ("Port Gửi: Require/Provide", "500", "10", "var(--hb-txt)"),
            ("Rte_Write(APP_MODE_SPORT)", "600", "10.5", "var(--hb-warn)"),
            ("Port Nhận Mode Switch:", "500", "10", "var(--hb-txt)"),
            ("Runnable_OnEntry_Sport()", "600", "10.5", "var(--hb-ok)")
        ], stroke="var(--hb-acc)"),

        box_ml(315, 62, 185, 128, [
            ("RTE Layer", "800", "11.5", "var(--hb-cyan)"),
            ("Chuyển giao MRP qua", "500", "10", "var(--hb-mut)"),
            ("BswMSwcModeRequest", "600", "10.5", "var(--hb-txt)"),
            ("Thực thi lệnh ngược", "500", "10", "var(--hb-mut)"),
            ("Rte_Switch_AppMode()", "600", "10.5", "var(--hb-ok)")
        ], stroke="var(--hb-cyan)"),

        box_ml(580, 62, 255, 128, [
            ("BswM Rule_06 & ActionList", "800", "11.5", "var(--hb-pri)"),
            ("Check: Swc==SPORT && ComM==FULL", "500", "10", "var(--hb-txt)"),
            ("1. Rte_Switch(APP_MODE_SPORT)", "600", "10.5", "var(--hb-ok)"),
            ("2. SchM_Switch(FAST_5MS)", "600", "10.5", "var(--hb-pur)"),
            ("3. Com_TriggerIPDUSend(Sport)", "600", "10.5", "var(--hb-cyan)")
        ], fill="var(--hb-card2)", stroke="var(--hb-pri)", sw=1.8),

        line_arrow(235, 98, 315, 98, "var(--hb-warn)", "hbArrWarn"),
        line_arrow(500, 98, 580, 98, "var(--hb-warn)", "hbArrWarn"),
        line_arrow(580, 152, 500, 152, "var(--hb-ok)", "hbArrOk"),
        line_arrow(315, 152, 235, 152, "var(--hb-ok)", "hbArrOk"),
        pill_label(275, 48, "1. Yêu Cầu", stroke="var(--hb-warn)"),
        pill_label(275, 212, "2. Phản Hồi Switch", stroke="var(--hb-ok)"),
    ]
    return svg_wrap("\n".join(parts), 860, 240)


# ==================== TOPIC 5: API R23-11, DET & ECUC ====================

def svg_bswm_api_map():
    parts = [
        '<text x="430" y="22" text-anchor="middle" fill="var(--hb-pri)" font-weight="800" font-size="13">Hệ Thống Hàm API Chuẩn AUTOSAR Classic R23-11 Của Module BswM (SWS_BswM)</text>',
        box_ml(20, 46, 260, 210, [
            ("1. LIFECYCLE & SCHEDULER API", "800", "11.5", "var(--hb-pri)"),
            ("BswM_Init(ConfigPtr) [0x00]", "600", "10.5", "var(--hb-txt)"),
            ("BswM_GetVersionInfo(Ptr) [0x01]", "500", "10", "var(--hb-txt)"),
            ("BswM_MainFunction(void) [0x03]", "600", "10.5", "var(--hb-ok)"),
            ("BswM_Deinit(void) [0x04]", "500", "10", "var(--hb-err)"),
            ("-> Bắt buộc Init trước khi gọi", "500", "10", "var(--hb-mut)"),
            ("các API Indication / Request", "500", "10", "var(--hb-mut)")
        ], stroke="var(--hb-pri)"),

        box_ml(300, 46, 265, 210, [
            ("2. BSW MODULE INDICATION API", "800", "11.5", "var(--hb-ok)"),
            ("BswM_ComM_CurrentMode [0x0E]", "500", "10", "var(--hb-txt)"),
            ("BswM_ComM_CurrentPNCMode [0x15]", "500", "10", "var(--hb-txt)"),
            ("BswM_CanSM_CurrentState [0x05]", "500", "10", "var(--hb-txt)"),
            ("BswM_Dcm_CommunicationMode [0x06]", "500", "10", "var(--hb-txt)"),
            ("BswM_EcuM_CurrentState [0x0F]", "500", "10", "var(--hb-txt)"),
            ("BswM_NvM_CurrentJobMode [0x17]", "500", "10", "var(--hb-txt)")
        ], stroke="var(--hb-ok)"),

        box_ml(585, 46, 255, 210, [
            ("3. GENERIC & SAFETY API", "800", "11.5", "var(--hb-pur)"),
            ("BswM_RequestMode(u, m) [0x02]", "600", "10.5", "var(--hb-txt)"),
            ("BswM_WdgM_PartitionReset [0x11]", "500", "10", "var(--hb-warn)"),
            ("BswM_EcuM_CurrentWakeup [0x10]", "500", "10", "var(--hb-txt)"),
            ("BswM_NmIf_CarWakeUp [0x24]", "500", "10", "var(--hb-txt)"),
            ("BswM_J1939DcmBroadcast [0x1B]", "500", "10", "var(--hb-txt)"),
            ("-> Phát DET ModuleId = 42", "500", "10", "var(--hb-err)")
        ], stroke="var(--hb-pur)"),
    ]
    return svg_wrap("\n".join(parts), 860, 276)


def svg_det_error_guards():
    parts = [
        '<text x="430" y="22" text-anchor="middle" fill="var(--hb-pri)" font-weight="800" font-size="13">Lớp Phòng Vệ Đầu Hàm API: Chốt Chặn DET Errors (BSWM_MODULE_ID = 42 · S14)</text>',
        box_ml(20, 56, 175, 76, ["Guard 1: Check Init", "BswMInitialized == FALSE?", "→ BSWM_E_NO_INIT (0x01)"], stroke="var(--hb-err)", title_color="var(--hb-err)"),
        box_ml(230, 56, 175, 76, ["Guard 2: Check Pointer", "ConfigPtr/Ver == NULL?", "→ BSWM_E_NULL_PTR (0x02)"], stroke="var(--hb-warn)", title_color="var(--hb-warn)"),
        box_ml(440, 56, 185, 76, ["Guard 3: Check Range", "User > MaxUser → 0x04", "Mode > MaxMode → 0x05"], stroke="var(--hb-pur)", title_color="var(--hb-pur)"),
        box_ml(660, 56, 180, 76, ["Hợp Lệ → Ghi MRP!", "Chuyển vào Arb Engine", "hoặc Deferred Queue"], fill="var(--hb-card2)", stroke="var(--hb-ok)", title_color="var(--hb-ok)"),

        box_ml(65, 184, 730, 68, [
            ("DET (Default Error Tracer) — Det_ReportError(42, 0, ApiId, ErrorId)", "800", "11", "var(--hb-err)"),
            ("Mọi chốt Guard thất bại đều DỪNG xử lý tức thời (tránh làm sai lệch trạng thái Rule)", "500", "10.5", "var(--hb-txt)"),
            ("và ghi lỗi lên thanh DET Inspector & API Trace nếu BswMDevErrorDetect = TRUE.", "500", "10.5", "var(--hb-txt)")
        ], fill="var(--hb-card2)", stroke="var(--hb-err)"),

        line_arrow(195, 94, 230, 94, "var(--hb-ok)", "hbArrOk"),
        line_arrow(405, 94, 440, 94, "var(--hb-ok)", "hbArrOk"),
        line_arrow(625, 94, 660, 94, "var(--hb-ok)", "hbArrOk"),
        line_arrow(107, 132, 260, 184, "var(--hb-err)", "hbArrErr"),
        line_arrow(317, 132, 370, 184, "var(--hb-warn)", "hbArrWarn"),
        line_arrow(532, 132, 500, 184, "var(--hb-pur)", "hbArrErr"),
    ]
    return svg_wrap("\n".join(parts), 860, 272)


def svg_ecuc_container_tree():
    parts = [
        '<text x="430" y="22" text-anchor="middle" fill="var(--hb-pri)" font-weight="800" font-size="13">Cấu Trúc Cây Tham Số Cấu Hình ECUC BswM.arxml (36 Tham Số Trong 6 Nhóm)</text>',
        box_ml(300, 42, 260, 52, ["BswM (ECUC Root)", "ModuleId = 42 · BswM_Cfg.h"], fill="var(--hb-card2)", stroke="var(--hb-pri)", sw=2.0),

        box_ml(20, 134, 245, 130, [
            ("1. BswMGeneral", "800", "11.5", "var(--hb-cyan)"),
            ("• BswMDevErrorDetect", "500", "10.5", "var(--hb-txt)"),
            ("• BswMVersionInfoApi", "500", "10.5", "var(--hb-txt)"),
            ("• BswMMainFunctionPeriod", "500", "10.5", "var(--hb-txt)"),
            ("• BswMComMEnabled / PncEn", "500", "10.5", "var(--hb-txt)"),
            ("• BswMDcmEnabled", "500", "10.5", "var(--hb-txt)")
        ], stroke="var(--hb-cyan)"),

        box_ml(305, 134, 250, 130, [
            ("2. BswMArbitration", "800", "11.5", "var(--hb-warn)"),
            ("• ModeRequestPort (IMM/DEF)", "500", "10.5", "var(--hb-txt)"),
            ("• ModeCondition & LogicalExpr", "500", "10.5", "var(--hb-txt)"),
            ("• RuleInitState (FALSE/UNDEF)", "500", "10.5", "var(--hb-txt)"),
            ("• IndependentRuleEvaluation", "500", "10.5", "var(--hb-txt)"),
            ("• GenericUserId / MaxMode", "500", "10.5", "var(--hb-txt)")
        ], stroke="var(--hb-warn)"),

        box_ml(595, 134, 245, 130, [
            ("3. BswMModeControl", "800", "11.5", "var(--hb-ok)"),
            ("• Execution (TRIGGER/COND)", "500", "10.5", "var(--hb-txt)"),
            ("• BswMAbortOnFail & Priority", "500", "10.5", "var(--hb-txt)"),
            ("• PduGroupSwitchReinit & DM", "500", "10.5", "var(--hb-txt)"),
            ("• PduRouterControl & Timer", "500", "10.5", "var(--hb-txt)"),
            ("• EcuM Shutdown / DCM 0x28", "500", "10.5", "var(--hb-txt)")
        ], stroke="var(--hb-ok)"),

        path_arrow("M 430 94 L 430 112 L 142 112 L 142 134", "var(--hb-cyan)", "hbArr"),
        line_arrow(430, 94, 430, 134, "var(--hb-warn)", "hbArrWarn"),
        path_arrow("M 430 94 L 430 112 L 717 112 L 717 134", "var(--hb-ok)", "hbArrOk"),
    ]
    return svg_wrap("\n".join(parts), 860, 285)
