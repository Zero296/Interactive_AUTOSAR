# Helper to generate crisp, overlap-free, offline theme-aware inline SVG diagrams for ComM Handbook

import html


def svg_wrap(w, h, inner):
    return (
        f'<svg class="hb-svg" viewBox="0 0 {w} {h}" xmlns="http://www.w3.org/2000/svg">'
        f'<defs>'
        f'<marker id="hbArr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">'
        f'<path d="M 0 1 L 10 5 L 0 9 z" fill="var(--hb-pri)"/></marker>'
        f'<marker id="hbArrOk" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">'
        f'<path d="M 0 1 L 10 5 L 0 9 z" fill="var(--hb-ok)"/></marker>'
        f'<marker id="hbArrWarn" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">'
        f'<path d="M 0 1 L 10 5 L 0 9 z" fill="var(--hb-warn)"/></marker>'
        f'<marker id="hbArrErr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">'
        f'<path d="M 0 1 L 10 5 L 0 9 z" fill="var(--hb-err)"/></marker>'
        f'<marker id="hbArrPur" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">'
        f'<path d="M 0 1 L 10 5 L 0 9 z" fill="var(--hb-pur)"/></marker>'
        f'<marker id="hbArrCyan" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">'
        f'<path d="M 0 1 L 10 5 L 0 9 z" fill="var(--hb-cyan)"/></marker>'
        f'</defs>'
        f'<rect class="svg-canvas" x="0" y="0" width="{w}" height="{h}" rx="8" fill="var(--hb-bg)"/>'
        f'{inner}</svg>'
    )


def box_ml(
    x, y, w, h, title, lines=None,
    stroke="var(--hb-bdr)", fill="var(--hb-card)",
    title_col="var(--hb-txt)", sub_col="var(--hb-mut)",
    title_size=11.5, line_size=10
):
    lines = lines or []
    cx = x + w / 2
    total_h = 16 + len(lines) * 14
    start_y = y + (h - total_h) / 2 + 12
    parts = [
        f'<rect class="svg-box" x="{x}" y="{y}" width="{w}" height="{h}" rx="8" fill="{fill}" stroke="{stroke}" stroke-width="1.7"/>',
        f'<text class="svg-box-txt" data-box-w="{w}" x="{cx}" y="{start_y:.1f}" text-anchor="middle" fill="{title_col}" font-weight="700" font-size="{title_size}">{html.escape(title)}</text>'
    ]
    for idx, ln in enumerate(lines):
        ly = start_y + 16 + idx * 14
        parts.append(
            f'<text class="svg-box-txt" data-box-w="{w}" x="{cx}" y="{ly:.1f}" text-anchor="middle" fill="{sub_col}" font-size="{line_size}">{html.escape(ln)}</text>'
        )
    return "".join(parts)


def pill_label(cx, cy, lines, color="var(--hb-pri)", anchor="middle", bg="var(--hb-bg)", stroke="none", font_size=10):
    if isinstance(lines, str):
        lines = [lines]
    max_len = max((len(l) for l in lines), default=1)
    pw = max(40, int(max_len * font_size * 0.62) + 14)
    ph = len(lines) * 13 + 6
    rx = cx - pw / 2 if anchor == "middle" else (cx - 6 if anchor == "start" else cx - pw + 6)
    ry = cy - ph / 2
    parts = [
        f'<rect class="svg-pill" x="{rx:.1f}" y="{ry:.1f}" width="{pw}" height="{ph}" rx="4" fill="{bg}" stroke="{stroke}" stroke-width="1"/>'
    ]
    for i, ln in enumerate(lines):
        ty = ry + 13 + i * 13
        parts.append(
            f'<text x="{cx}" y="{ty:.1f}" text-anchor="{anchor}" fill="{color}" font-weight="600" font-size="{font_size}">{html.escape(ln)}</text>'
        )
    return "".join(parts)


def line_arrow(x1, y1, x2, y2, color="var(--hb-pri)", marker="hbArr", dashed=False):
    dash = ' stroke-dasharray="5 3"' if dashed else ""
    return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="1.8"{dash} marker-end="url(#{marker})"/>'


def path_arrow(d, color="var(--hb-pri)", marker="hbArr", dashed=False):
    dash = ' stroke-dasharray="5 3"' if dashed else ""
    return f'<path d="{d}" fill="none" stroke="{color}" stroke-width="1.8" stroke-linejoin="round"{dash} marker-end="url(#{marker})"/>'


# 1.1 Vai trò ComM & Hệ sinh thái Stack
def diag_comm_ecosystem():
    inner = (
        box_ml(20, 18, 220, 62, "SWC Users (0 / 1 / 2)", ["ComM_RequestComMode()", "ComM_GetCurrentComMode()"], "var(--hb-acc)")
        + box_ml(290, 18, 220, 62, "DCM (UDS Diagnostics)", ["ComM_DCM_ActiveDiagnostic()", "ComM_DCM_InactiveDiagnostic()"], "var(--hb-warn)")
        + box_ml(560, 18, 220, 62, "EcuM & BswM", ["ComM_CommunicationAllowed()", "BswM_ComM_CurrentMode()"], "var(--hb-ok)")

        + box_ml(20, 134, 195, 78, "RTE & SchM", ["SchM_ComM_MainFunction()", "Rte_Switch_UM_currentMode"], "var(--hb-acc)")
        + box_ml(260, 128, 280, 90, "ComM Core (SWS_ComM)", ["Bộ phân xử Đa User & Mode Inhibition", "Channel State Machine (3 Modes)", "PNC State Machine (4 Trạng thái)"], "var(--hb-pri)", "var(--hb-card2)", "var(--hb-pri)")
        + box_ml(585, 134, 195, 78, "NvM & DET Services", ["NvM_SetRamBlockStatus()", "Det_ReportError(Module = 12)"], "var(--hb-err)")

        + box_ml(20, 274, 225, 66, "AUTOSAR COM / PduR", ["Com_SendSignal() [Tx PNC]", "ComM_COMCbk() [Rx EIRA/ERA]"], "var(--hb-cyan)")
        + box_ml(288, 274, 224, 66, "Nm / CanNm", ["Nm_NetworkRequest / Release()", "PrepareBusSleep / BusSleep Ind"], "var(--hb-pur)")
        + box_ml(555, 274, 225, 66, "BusSM (CanSM / EthSM)", ["CanSM_RequestComMode()", "ComM_BusSM_ModeIndication()"], "var(--hb-ok)")

        + line_arrow(118, 80, 118, 134, "var(--hb-acc)", "hbArr")
        + pill_label(118, 107, "Cổng SWC Request", "var(--hb-acc)")

        + line_arrow(215, 173, 260, 173, "var(--hb-pri)", "hbArr")
        + line_arrow(400, 80, 400, 128, "var(--hb-warn)", "hbArrWarn")
        + pill_label(400, 104, "Quyền ưu tiên DCM", "var(--hb-warn)")

        + path_arrow("M 625 80 L 625 104 L 495 104 L 495 128", "var(--hb-ok)", "hbArrOk")
        + pill_label(615, 104, "CommAllowed & Wakeup", "var(--hb-ok)")

        + line_arrow(540, 173, 585, 173, "var(--hb-err)", "hbArrErr")

        + path_arrow("M 315 218 L 315 246 L 132 246 L 132 274", "var(--hb-cyan)", "hbArrCyan")
        + pill_label(175, 246, "Tín hiệu PNC Bit Vector", "var(--hb-cyan)")

        + line_arrow(400, 218, 400, 274, "var(--hb-pur)", "hbArrPur")
        + pill_label(400, 246, "Điều phối NM", "var(--hb-pur)")

        + path_arrow("M 485 218 L 485 246 L 667 246 L 667 274", "var(--hb-ok)", "hbArrOk")
        + pill_label(625, 246, "Chế độ phần cứng", "var(--hb-ok)")
    )
    return svg_wrap(800, 360, inner)


# 1.2 Phân xử Đa User (OR Arbitration)
def diag_multi_user_arbitration():
    inner = (
        box_ml(20, 18, 225, 50, "User 0 (SWC_DiagApp)", ["ComM_RequestComMode(FULL_COM)"], "var(--hb-ok)")
        + box_ml(20, 82, 225, 50, "User 1 (SWC_BodyCtrl)", ["ComM_RequestComMode(NO_COM)"], "var(--hb-mut)")
        + box_ml(20, 146, 225, 50, "User 2 (PNC #16 Map)", ["ComM_RequestComMode(FULL_COM)"], "var(--hb-cyan)")
        + box_ml(20, 210, 225, 50, "DCM (UDS Diagnostics)", ["ActiveDiagnostic = FALSE"], "var(--hb-warn)")

        + box_ml(335, 62, 235, 152, "OR Arbitrator & Filters", [
            "1. Hợp nhất mode (FULL > NO)",
            "2. Kiểm tra PreventWakeUp (Bit 0)",
            "3. Kiểm tra LimitToNoCom (Bit 1)",
            "4. Ưu tiên DCM ActiveDiagnostic"
        ], "var(--hb-pri)", "var(--hb-card2)", "var(--hb-pri)")

        + box_ml(625, 92, 160, 92, "Channel 0 Result", [
            "Winner: FULL_COM",
            "NETWORK_REQUESTED",
            "(OR Logic = TRUE)"
        ], "var(--hb-ok)", "var(--hb-card2)", "var(--hb-ok)")

        + path_arrow("M 245 43 L 290 43 L 290 110 L 335 110", "var(--hb-ok)", "hbArrOk")
        + line_arrow(245, 107, 335, 125, "var(--hb-mut)", "hbArr")
        + line_arrow(245, 171, 335, 152, "var(--hb-cyan)", "hbArrCyan")
        + path_arrow("M 245 235 L 290 235 L 290 182 L 335 182", "var(--hb-warn)", "hbArrWarn")

        + line_arrow(570, 138, 625, 138, "var(--hb-ok)", "hbArrOk")
        + pill_label(597, 114, "Target", "var(--hb-ok)")
    )
    return svg_wrap(800, 280, inner)


# 1.3 Bắt tay bất đồng bộ BusSM & Rte_Switch
def diag_bussm_handshake():
    inner = (
        box_ml(20, 22, 240, 66, "1. ComM Core (Transition)", ["Target: FULL_COM_NET_REQ", "Gọi xuống lớp quản lý Bus"], "var(--hb-pri)")
        + box_ml(540, 22, 240, 66, "2. CanSM / BusSM Hardware", ["Bật CanTrcv & CanIf Controller", "Xử lý trễ phần cứng CAN"], "var(--hb-ok)")

        + box_ml(540, 148, 240, 66, "3. Wait Confirmation Gate", ["Trong lúc chờ: Bit 1 BUSSM = 0", "User CurrentMode VẪN LÀ NO_COM!"], "var(--hb-warn)")
        + box_ml(20, 148, 240, 66, "4. ComM Confirm Handler", ["Nhận ModeIndication(FULL_COM)", "Bật Bit 1 BUSSM = 1"], "var(--hb-ok)")

        + box_ml(355, 248, 265, 66, "5. BswM & SWC Notification", ["BswM mở Tx/Rx I-PDU Group", "Rte_Switch báo User FULL_COM"], "var(--hb-pur)")

        + line_arrow(260, 55, 540, 55, "var(--hb-pri)", "hbArr")
        + pill_label(400, 40, "1. CanSM_RequestComMode(0, FULL_COM)", "var(--hb-pri)")

        + line_arrow(660, 88, 660, 148, "var(--hb-warn)", "hbArrWarn")
        + pill_label(644, 118, "Đang khởi động HW", "var(--hb-warn)", anchor="end")

        + line_arrow(540, 181, 260, 181, "var(--hb-ok)", "hbArrOk")
        + pill_label(400, 165, "2. ComM_BusSM_ModeIndication(0, FULL_COM)", "var(--hb-ok)")

        + path_arrow("M 140 214 L 140 281 L 355 281", "var(--hb-pur)", "hbArrPur")
        + pill_label(248, 252, ["3. BswM_ComM_CurrentMode()", "& Rte_Switch(FULL_COM)"], "var(--hb-pur)", anchor="middle")
    )
    return svg_wrap(800, 336, inner)


# 1.4 ComMSynchronousWakeUp
def diag_sync_wakeup():
    inner = (
        box_ml(16, 78, 192, 72, "CanTrcv / EcuM (Ch0)", ["Phát hiện CAN Wakeup", "ComM_EcuM_WakeUpInd(0)"], "var(--hb-ok)", line_size=9.5)
        + box_ml(274, 70, 212, 88, "ComM Wakeup Manager", ["Kiểm tra ComMSynchronousWakeUp", "• TRUE: Thức đồng pha tất cả", "• FALSE: Chỉ thức duy nhất Ch0"], "var(--hb-pri)", "var(--hb-card2)", "var(--hb-pri)", line_size=9.5)
        + box_ml(612, 26, 174, 72, "Channel 0 (CAN Bus)", ["Vào NO_COM_REQ_PENDING", "Chờ CommAllowed -> FULL"], "var(--hb-warn)", title_size=11, line_size=9.5)
        + box_ml(612, 144, 174, 72, "Channel 1 (Bus phụ)", ["SYNC=TRUE: Thức cùng Ch0", "SYNC=FALSE: Giữ NO_COM"], "var(--hb-cyan)", title_size=11, line_size=9.5)

        + line_arrow(208, 114, 274, 114, "var(--hb-ok)", "hbArrOk")
        + pill_label(241, 90, "Wake(0)", "var(--hb-ok)", font_size=9.5)

        + path_arrow("M 486 96 L 548 96 L 548 62 L 612 62", "var(--hb-warn)", "hbArrWarn")
        + pill_label(548, 36, "Luôn đánh thức", "var(--hb-warn)", font_size=9.5)

        + path_arrow("M 486 136 L 548 136 L 548 180 L 612 180", "var(--hb-cyan)", "hbArrCyan")
        + pill_label(548, 206, "Nếu Sync == TRUE", "var(--hb-cyan)", font_size=9.5)
    )
    return svg_wrap(800, 236, inner)


# 2.1 Bản đồ 3 Modes & 5 Sub-States (SWS_ComM_00298)
def diag_channel_sm():
    inner = (
        f'<rect class="svg-box" x="16" y="22" width="272" height="162" rx="10" fill="var(--hb-card)" stroke="var(--hb-pri)" stroke-width="2"/>'
        f'<text x="152" y="46" text-anchor="middle" fill="var(--hb-pri)" font-weight="800" font-size="12">1. COMM_NO_COMMUNICATION</text>'
        + box_ml(28, 62, 248, 50, "COMM_NO_COM_NO_PENDING_REQUEST", ["Ngủ hẳn, chưa có yêu cầu chờ"], "var(--hb-bdr)", "var(--hb-card2)", "var(--hb-txt)", title_size=10.5, line_size=9.5)
        + box_ml(28, 122, 248, 50, "COMM_NO_COM_REQUEST_PENDING", ["Chờ Gatekeeper CommAllowed"], "var(--hb-warn)", "var(--hb-card2)", "var(--hb-warn)", title_size=10.5, line_size=9.5)

        + f'<rect class="svg-box" x="532" y="22" width="272" height="162" rx="10" fill="var(--hb-card)" stroke="var(--hb-ok)" stroke-width="2"/>'
        + f'<text x="668" y="46" text-anchor="middle" fill="var(--hb-ok)" font-weight="800" font-size="12">3. COMM_FULL_COMMUNICATION</text>'
        + box_ml(544, 62, 248, 50, "COMM_FULL_COM_NETWORK_REQUESTED", ["User / DCM / TMinFull giữ mạng"], "var(--hb-ok)", "var(--hb-card2)", "var(--hb-ok)", title_size=10.5, line_size=9.5)
        + box_ml(544, 122, 248, 50, "COMM_FULL_COM_READY_SLEEP", ["Hết User Req / Đếm NmLightTimeout"], "var(--hb-cyan)", "var(--hb-card2)", "var(--hb-cyan)", title_size=10.5, line_size=9.5)

        + box_ml(275, 238, 270, 68, "2. COMM_SILENT_COMMUNICATION", ["Sub-state: COMM_SILENT_COM", "Chỉ nhận (Rx), cấm phát Tx (FULL/PASSIVE)"], "var(--hb-pur)", "var(--hb-card2)", "var(--hb-pur)")

        + line_arrow(288, 82, 532, 82, "var(--hb-ok)", "hbArrOk")
        + pill_label(410, 58, ["CommunicationAllowed == TRUE", "& (User Req / Passive Wakeup)"], "var(--hb-ok)")

        + line_arrow(532, 152, 288, 152, "var(--hb-warn)", "hbArrWarn", dashed=True)
        + pill_label(410, 152, "NmLightTimeout == 0 (LIGHT) / NONE", "var(--hb-warn)")

        + path_arrow("M 668 184 L 668 272 L 545 272", "var(--hb-pur)", "hbArrPur")
        + pill_label(675, 236, ["ComM_Nm_PrepareBusSleepMode()", "(Biến thể FULL / PASSIVE)"], "var(--hb-pur)")

        + path_arrow("M 275 272 L 152 272 L 152 184", "var(--hb-pri)", "hbArr")
        + pill_label(152, 236, "ComM_Nm_BusSleepMode()", "var(--hb-pri)")
    )
    return svg_wrap(820, 326, inner)


# 2.2 So sánh 4 Biến thể ComMNmVariant (Không tràn viền!)
def diag_nm_variants():
    inner = (
        box_ml(16, 20, 186, 180, "FULL Variant", [
            "Dùng CanNm / UdpNm đầy đủ",
            "Có NETWORK_REQUESTED",
            "và FULL_COM_READY_SLEEP",
            "Có trạng thái SILENT_COM",
            "Không dùng NmLightTimeout"
        ], "var(--hb-ok)", "var(--hb-card)", "var(--hb-ok)", line_size=10)
        + box_ml(216, 20, 186, 180, "LIGHT Variant", [
            "Không phát gói NM trên bus",
            "Dùng TMinFullComMode",
            "Dùng ComMNmLightTimeout",
            "Bỏ qua SILENT_COM",
            "Tắt thẳng READY_SLEEP->NO"
        ], "var(--hb-warn)", "var(--hb-card)", "var(--hb-warn)", line_size=10)
        + box_ml(416, 20, 186, 180, "PASSIVE Variant", [
            "Chỉ nghe gói NM từ mạng",
            "SWC KHÔNG được tự xin",
            "NETWORK_REQUESTED",
            "Chỉ vào READY_SLEEP thụ động",
            "Có trạng thái SILENT_COM"
        ], "var(--hb-pur)", "var(--hb-card)", "var(--hb-pur)", line_size=10)
        + box_ml(616, 20, 188, 180, "NONE Variant", [
            "Không dùng NM & SILENT",
            "Dùng TMinFullComMode",
            "Hết User & hết TMinFull:",
            "Chuyển thẳng FULL_COM",
            "xuống NO_COMMUNICATION"
        ], "var(--hb-cyan)", "var(--hb-card)", "var(--hb-cyan)", line_size=10)
    )
    return svg_wrap(820, 220, inner)


# 2.3 Gatekeeper CommunicationAllowed (Không đè viền!)
def diag_gatekeeper():
    inner = (
        box_ml(16, 86, 224, 78, "COMM_NO_COM_NO_PENDING", ["Chưa có User / Wakeup Req", "Trạng thái ngủ ổn định"], "var(--hb-mut)", title_size=11)
        + box_ml(298, 86, 224, 78, "COMM_NO_COM_REQ_PENDING", ["Bit 5 WAKEUP_PEND = 1", "Đợi CommAllowed == TRUE"], "var(--hb-warn)", "var(--hb-card2)", "var(--hb-warn)", title_size=11)
        + box_ml(580, 86, 224, 78, "COMM_FULL_COMMUNICATION", ["Bit 4 COMM_ALLOW = 1", "Mở CanSM & Nm_NetworkReq"], "var(--hb-ok)", "var(--hb-card2)", "var(--hb-ok)", title_size=11)

        + line_arrow(240, 125, 298, 125, "var(--hb-warn)", "hbArrWarn")
        + path_arrow("M 269 60 L 269 118", "var(--hb-warn)", "hbArrWarn")
        + pill_label(269, 36, ["User Req / Wakeup", "khi Allowed == FALSE"], "var(--hb-warn)")

        + line_arrow(522, 125, 580, 125, "var(--hb-ok)", "hbArrOk")
        + path_arrow("M 551 60 L 551 118", "var(--hb-ok)", "hbArrOk")
        + pill_label(551, 36, ["EcuM / BswM mở khóa:", "CommunicationAllowed(TRUE)"], "var(--hb-ok)")
    )
    return svg_wrap(820, 188, inner)


# 2.4 Graceful Shutdown & Timers (Không viết tắt, không dính viền!)
def diag_shutdown_seq():
    inner = (
        box_ml(16, 74, 170, 76, "1. NETWORK_REQUESTED", ["User / TMinFull giữ mạng", "Nm_NetworkRequest()"], "var(--hb-ok)", title_size=11)
        + box_ml(222, 74, 170, 76, "2. READY_SLEEP", ["Mọi User = NO_COM", "Nm_NetworkRelease()"], "var(--hb-cyan)", title_size=11)
        + box_ml(428, 74, 170, 76, "3. SILENT_COM", ["PrepareBusSleepMode", "Chỉ Rx, cấm phát Tx"], "var(--hb-pur)", title_size=11)
        + box_ml(634, 74, 170, 76, "4. NO_COMMUNICATION", ["BusSM tắt phần cứng", "BswM tắt Tx/Rx I-PDU"], "var(--hb-mut)", title_size=11)

        + line_arrow(186, 112, 222, 112, "var(--hb-cyan)", "hbArrCyan")
        + path_arrow("M 204 50 L 204 106", "var(--hb-cyan)", "hbArrCyan")
        + pill_label(204, 28, "Release All & TMin=0", "var(--hb-cyan)")

        + line_arrow(392, 112, 428, 112, "var(--hb-pur)", "hbArrPur")
        + path_arrow("M 410 50 L 410 106", "var(--hb-pur)", "hbArrPur")
        + pill_label(410, 28, "Nm_PrepareBusSleep()", "var(--hb-pur)")

        + line_arrow(598, 112, 634, 112, "var(--hb-pri)", "hbArr")
        + path_arrow("M 616 50 L 616 106", "var(--hb-pri)", "hbArr")
        + pill_label(616, 28, "Nm_BusSleepMode()", "var(--hb-pri)")

        + path_arrow("M 307 150 L 307 194 L 719 194 L 719 150", "var(--hb-warn)", "hbArrWarn", dashed=True)
        + pill_label(513, 194, "Biến thể LIGHT: Hết ComMNmLightTimeout tắt thẳng về NO_COMMUNICATION (bỏ qua SILENT)", "var(--hb-warn)")
    )
    return svg_wrap(820, 226, inner)


# 3.1 Bit 0 NoWakeup vs Bit 1 LimitToNoCom & DCM Override
def diag_inhibition_gates():
    inner = (
        box_ml(20, 20, 205, 56, "1. SWC User Request", ["ComM_RequestComMode(FULL)"], "var(--hb-acc)")
        + box_ml(295, 20, 225, 56, "Mode Inhibition Filter", ["Bit 0: NoWakeup (chặn Wake)", "Bit 1: LimitToNoCom (ép tắt)"], "var(--hb-err)")
        + box_ml(295, 110, 225, 56, "InhibitCounter++ & NvM", ["Từ chối User Request -> ++", "NvM_SetRamBlockStatus(TRUE)"], "var(--hb-warn)")

        + box_ml(20, 190, 205, 56, "2. Passive Bus Wakeup", ["EcuM / CanNm từ bus ngoài"], "var(--hb-cyan)")
        + box_ml(20, 264, 205, 56, "3. DCM ActiveDiagnostic", ["Phiên chẩn đoán UDS OBD"], "var(--hb-ok)", "var(--hb-card2)", "var(--hb-ok)")

        + box_ml(585, 114, 195, 120, "Channel State Action", [
            "User bị chặn -> NO_COM",
            "User qua gate -> FULL_COM",
            "Passive -> READY_SLEEP",
            "DCM -> OVERRIDE TẤT CẢ!"
        ], "var(--hb-pri)", "var(--hb-card2)", "var(--hb-pri)")

        + line_arrow(225, 48, 295, 48, "var(--hb-acc)", "hbArr")
        + line_arrow(407, 76, 407, 110, "var(--hb-warn)", "hbArrWarn")
        + pill_label(468, 93, "Nếu bị chặn", "var(--hb-warn)")

        + path_arrow("M 520 48 L 682 48 L 682 114", "var(--hb-acc)", "hbArr")
        + pill_label(602, 48, "Pass Gate", "var(--hb-acc)")

        + path_arrow("M 225 218 L 548 218 L 548 176 L 585 176", "var(--hb-cyan)", "hbArrCyan")
        + pill_label(388, 218, "Bỏ qua PreventWakeUp (Bit 0)", "var(--hb-cyan)")

        + path_arrow("M 225 292 L 682 292 L 682 234", "var(--hb-ok)", "hbArrOk")
        + pill_label(455, 292, "Quyền tối cao DCM: Xuyên thủng cả Bit 0 & Bit 1!", "var(--hb-ok)")
    )
    return svg_wrap(800, 336, inner)


# 3.2 EcuGroupClassification Mask Truth Logic
def diag_mask_truth():
    inner = (
        box_ml(20, 24, 225, 62, "PreventWakeUp (Bit 0)", ["ComM_PreventWakeUp(Ch, TRUE)"], "var(--hb-warn)")
        + box_ml(20, 120, 225, 62, "LimitToNoCom (Bit 1)", ["ComM_LimitChannelToNoCom(TRUE)"], "var(--hb-err)")
        + box_ml(300, 58, 220, 92, "AND Classification Mask", ["ComMEcuGroupClassification:", "Bit 0 (0x01) · Bit 1 (0x02)", "0x00 = Vô hiệu hóa tất cả!"], "var(--hb-pri)", "var(--hb-card2)", "var(--hb-pri)")
        + box_ml(575, 24, 205, 62, "Effective CH_NW", ["Bit 0 Active = Status & 0x01"], "var(--hb-warn)")
        + box_ml(575, 120, 205, 62, "Effective CH_LIM", ["Bit 1 Active = Status & 0x02"], "var(--hb-err)")

        + line_arrow(245, 55, 300, 82, "var(--hb-warn)", "hbArrWarn")
        + line_arrow(245, 151, 300, 124, "var(--hb-err)", "hbArrErr")
        + line_arrow(520, 82, 575, 55, "var(--hb-warn)", "hbArrWarn")
        + line_arrow(520, 124, 575, 151, "var(--hb-err)", "hbArrErr")
    )
    return svg_wrap(800, 206, inner)


# 3.3 InhibitCounter & NvM Flow
def diag_nvm_counter():
    inner = (
        box_ml(20, 48, 170, 76, "User Req Blocked", ["FULL_COM bị từ chối", "bởi Bit 0 hoặc Bit 1"], "var(--hb-err)")
        + box_ml(222, 48, 180, 76, "InhibitCounter++", ["Tăng biến đếm uint16", "(Chống tràn tại 65535)"], "var(--hb-warn)")
        + box_ml(434, 48, 175, 76, "NvM RAM Mirror", ["Đánh dấu RAM bẩn:", "NvM_SetRamBlockStatus"], "var(--hb-pur)")
        + box_ml(640, 48, 140, 76, "Flash / Startup", ["WriteAll khi ngủ", "ReadAll khi boot"], "var(--hb-ok)")
        + line_arrow(190, 86, 222, 86, "var(--hb-warn)", "hbArrWarn")
        + line_arrow(402, 86, 434, 86, "var(--hb-pur)", "hbArrPur")
        + line_arrow(609, 86, 640, 86, "var(--hb-ok)", "hbArrOk")
    )
    return svg_wrap(800, 170, inner)


# 3.4 DCM Priority Override Hierarchy
def diag_dcm_priority():
    inner = (
        box_ml(100, 18, 600, 46, "Tầng 1 (Cao nhất): DCM ComM_DCM_ActiveDiagnostic(Ch)", ["Ép giữ FULL_COM_NETWORK_REQUESTED bất chấp mọi Mode Inhibition!"], "var(--hb-warn)", "var(--hb-card2)", "var(--hb-warn)")
        + box_ml(100, 74, 600, 46, "Tầng 2: Mode Inhibition (LimitToNoCom / PreventWakeUp)", ["Cưỡng bức nhả User về NO_COM hoặc chặn User đánh thức kênh"], "var(--hb-err)")
        + box_ml(100, 130, 600, 46, "Tầng 3: Passive Bus Wakeup (EcuM / CanNm NetworkStartInd)", ["Đánh thức kênh vào READY_SLEEP ngay cả khi bật PreventWakeUp"], "var(--hb-cyan)")
        + box_ml(100, 186, 600, 46, "Tầng 4 (Thấp nhất): SWC Users & PNC Internal Request", ["Hiệu lực bình thường khi không bị Tầng 1 / Tầng 2 chi phối"], "var(--hb-pri)")
    )
    return svg_wrap(800, 250, inner)


# 4.1 Giải phẫu Bit Vector PNC (Offset & Mask)
def diag_pnc_vector():
    inner = (
        box_ml(20, 20, 125, 52, "Byte 0", ["Source Node ID"], "var(--hb-mut)")
        + box_ml(158, 20, 115, 52, "Byte 1", ["CBV (Control)"], "var(--hb-mut)")
        + box_ml(286, 20, 245, 52, "Byte 2 (Offset = 2)", ["PNC #16 (0x01) .. PNC #23 (0x80)"], "var(--hb-cyan)", "var(--hb-card2)", "var(--hb-cyan)")
        + box_ml(544, 20, 236, 52, "Byte 3 (Length = 2)", ["PNC #24 .. PNC #31"], "var(--hb-pur)")

        + box_ml(100, 100, 70, 44, "b7", ["PNC#23"], "var(--hb-bdr)", line_size=9.5)
        + box_ml(175, 100, 70, 44, "b6", ["PNC#22"], "var(--hb-bdr)", line_size=9.5)
        + box_ml(250, 100, 70, 44, "b5", ["PNC#21"], "var(--hb-bdr)", line_size=9.5)
        + box_ml(325, 100, 70, 44, "b4", ["PNC#20"], "var(--hb-bdr)", line_size=9.5)
        + box_ml(400, 100, 70, 44, "b3", ["PNC#19"], "var(--hb-bdr)", line_size=9.5)
        + box_ml(475, 100, 78, 44, "b2 (0x04)", ["PNC#18"], "var(--hb-pur)", "var(--hb-card2)", "var(--hb-pur)", line_size=9.5)
        + box_ml(558, 100, 70, 44, "b1", ["PNC#17"], "var(--hb-bdr)", line_size=9.5)
        + box_ml(633, 100, 78, 44, "b0 (0x01)", ["PNC#16"], "var(--hb-ok)", "var(--hb-card2)", "var(--hb-ok)", line_size=9.5)

        + line_arrow(408, 72, 408, 96, "var(--hb-cyan)", "hbArrCyan")

        + box_ml(110, 166, 580, 50, "Công thức ánh xạ bit PNC trong AUTOSAR ComM", [
            "ByteIndex = (PncId / 8) - ComMPncInfoOffset   |   BitMask = 1 << (PncId % 8)"
        ], "var(--hb-pri)", "var(--hb-card2)", "var(--hb-pri)")
    )
    return svg_wrap(800, 232, inner)


# 4.2 Máy trạng thái PNC 4 bước (SWS_ComM_00909) — Không đè mũi tên đứng!
def diag_pnc_sm():
    inner = (
        box_ml(36, 24, 245, 68, "COMM_PNC_NO_COMMUNICATION", ["Cụm PNC đang tắt hẳn", "Tx PN Bit = 0, không giữ kênh"], "var(--hb-mut)", title_size=11)
        + box_ml(518, 24, 245, 68, "COMM_PNC_REQUESTED", ["Internal User / GW yêu cầu", "Gọi Com_SendSignal(Tx Bit = 1)"], "var(--hb-ok)", "var(--hb-card2)", "var(--hb-ok)", title_size=11)
        + box_ml(518, 182, 245, 68, "COMM_PNC_READY_SLEEP", ["Nội bộ đã nhả, Rx EIRA = 1", "Giữ kênh chỉ nghe (Tx = 0)"], "var(--hb-cyan)", title_size=11)
        + box_ml(36, 182, 245, 68, "COMM_PNC_PREPARE_SLEEP", ["Cả User & Rx EIRA về 0", "Đếm ComMPncPrepareSleepTimer"], "var(--hb-warn)", title_size=11)

        + line_arrow(281, 58, 518, 58, "var(--hb-ok)", "hbArrOk")
        + pill_label(400, 40, "User Request / Gateway ERA = 1", "var(--hb-ok)")

        + line_arrow(640, 92, 640, 182, "var(--hb-cyan)", "hbArrCyan")
        + pill_label(624, 136, ["User Release,", "nhưng Rx EIRA = 1"], "var(--hb-cyan)", anchor="end")

        + line_arrow(518, 216, 281, 216, "var(--hb-warn)", "hbArrWarn")
        + pill_label(400, 200, "Rx EIRA == 0 (Không còn ECU giữ)", "var(--hb-warn)")

        + line_arrow(158, 182, 158, 92, "var(--hb-pri)", "hbArr")
        + pill_label(174, 136, ["PrepSleepTimer = 0 ms", "(Tắt cụm PNC)"], "var(--hb-pri)", anchor="start")
    )
    return svg_wrap(800, 272, inner)


# 4.3 EIRA vs ERA Signal Routing
def diag_eira_era():
    inner = (
        box_ml(20, 20, 200, 56, "EIRA (Global Array)", ["Gộp Rx ngoài bus + Nội bộ", "trên tất cả các kênh của PNC"], "var(--hb-cyan)")
        + box_ml(295, 20, 215, 56, "ComM_COMCbk_EIRA()", ["Đọc Com_ReceiveSignal", "Cập nhật PNC_READY_SLEEP"], "var(--hb-pri)")
        + box_ml(575, 20, 205, 56, "BswM & Local Channels", ["Giữ kênh Ch0/Ch1 thức", "Mở I-PDU nhận dữ liệu PNC"], "var(--hb-ok)")

        + box_ml(20, 128, 200, 56, "ERA (Per-Channel Bus)", ["Chỉ chứa Rx từ bên ngoài", "riêng từng kênh (Ch0 / Ch1)"], "var(--hb-pur)")
        + box_ml(295, 128, 215, 56, "ComM_COMCbk_ERA()", ["Chỉ dùng cho PNC Gateway", "tránh tự dội ngược loop"], "var(--hb-warn)")
        + box_ml(575, 128, 205, 56, "PNC Gateway Routing", ["Chuyển tiếp Tx PN Signal", "sang các kênh đích hợp lệ"], "var(--hb-pur)")

        + line_arrow(220, 48, 295, 48, "var(--hb-cyan)", "hbArrCyan")
        + line_arrow(510, 48, 575, 48, "var(--hb-ok)", "hbArrOk")
        + line_arrow(220, 156, 295, 156, "var(--hb-pur)", "hbArrPur")
        + line_arrow(510, 156, 575, 156, "var(--hb-pur)", "hbArrPur")
    )
    return svg_wrap(800, 208, inner)


# 4.4 PNC Gateway (ACTIVE / PASSIVE) & Synchronized Shutdown
def diag_pnc_gateway():
    inner = (
        box_ml(18, 26, 195, 72, "Ch0 (ACTIVE Gateway)", ["Rx ERA: PNC #18 = 0x04", "Ch0_GatewayType = ACTIVE"], "var(--hb-ok)")
        + box_ml(302, 26, 196, 72, "ComM Gateway Router", ["ACTIVE -> ACTIVE/PASSIVE", "PNC #18 -> PNC_REQUESTED"], "var(--hb-pri)", "var(--hb-card2)", "var(--hb-pri)")
        + box_ml(587, 26, 195, 72, "Ch1 (PASSIVE Gateway)", ["Tx PNC Bit 0x04 -> Bus", "Ch1_GatewayType = PASSIVE"], "var(--hb-pur)")

        + box_ml(40, 168, 325, 72, "Quy tắc Chống Loop (SWS_ComM_00944)", [
            "CẤM định tuyến PASSIVE -> PASSIVE!",
            "Kênh PASSIVE chỉ được gửi tới ACTIVE GW"
        ], "var(--hb-err)")
        + box_ml(435, 168, 325, 72, "Synchronized PNC Shutdown (R21-11+)", [
            "Khi tắt PNC #18 trên Gateway Coordinator:",
            "Gọi Nm_RequestSynchronizedPncShutdown()"
        ], "var(--hb-cyan)")

        + line_arrow(213, 62, 302, 62, "var(--hb-ok)", "hbArrOk")
        + pill_label(257, 42, "Rx ERA Ch0", "var(--hb-ok)")

        + line_arrow(498, 62, 587, 62, "var(--hb-pur)", "hbArrPur")
        + pill_label(542, 42, "Route Tx Ch1", "var(--hb-pur)")

        + path_arrow("M 350 98 L 350 132 L 202 132 L 202 168", "var(--hb-err)", "hbArrErr")
        + pill_label(232, 132, "Kiểm tra quy tắc GW", "var(--hb-err)")

        + path_arrow("M 450 98 L 450 132 L 597 132 L 597 168", "var(--hb-cyan)", "hbArrCyan")
        + pill_label(572, 132, "Tắt PNC đồng bộ", "var(--hb-cyan)")
    )
    return svg_wrap(800, 260, inner)


# 5.1 ECUC Hierarchy
def diag_ecuc_tree():
    inner = (
        box_ml(265, 18, 270, 52, "ECUC Container: ComM", ["Cấu hình Pre-Compile & Link-Time"], "var(--hb-pri)", "var(--hb-card2)", "var(--hb-pri)")
        + box_ml(16, 122, 180, 82, "ComMGeneral", ["DevErrorDetect", "ModeLimitation", "SynchronousWakeUp", "PncSupport / Gateway"], "var(--hb-acc)", line_size=9.5)
        + box_ml(212, 122, 180, 82, "ComMChannel", ["ChannelId & BusType", "NmVariant (FULL/LIGHT)", "NmLightTimeout", "PncGatewayType"], "var(--hb-ok)", line_size=9.5)
        + box_ml(408, 122, 180, 82, "ComMUser", ["ComMUserIdentifier", "Map User -> Channel", "Map User -> PNC", "RTE Request Ports"], "var(--hb-warn)", line_size=9.5)
        + box_ml(604, 122, 180, 82, "ComMPnc", ["ComMPncId & Bit Mask", "PncPrepareSleepTimer", "Rx EIRA / ERA Signal", "Tx PN Signal Ref"], "var(--hb-cyan)", line_size=9.5)

        + path_arrow("M 400 70 L 400 95 L 106 95 L 106 122", "var(--hb-acc)", "hbArr")
        + path_arrow("M 400 70 L 400 95 L 302 95 L 302 122", "var(--hb-ok)", "hbArrOk")
        + path_arrow("M 400 70 L 400 95 L 498 95 L 498 122", "var(--hb-warn)", "hbArrWarn")
        + path_arrow("M 400 70 L 400 95 L 694 95 L 694 122", "var(--hb-cyan)", "hbArrCyan")
    )
    return svg_wrap(800, 224, inner)


# 6.2 Debug Flowchart
def diag_debug_tree():
    inner = (
        box_ml(16, 24, 175, 70, "Triệu chứng:", ["Kênh không vào", "FULL_COM / không Tx"], "var(--hb-err)")
        + box_ml(218, 24, 175, 70, "Check 1: Thanh A", ["Bit 4 COMM_ALLOW=1?", "Bit 5 PENDING == 0?"], "var(--hb-warn)")
        + box_ml(420, 24, 175, 70, "Check 2: Thanh B", ["Bit 0/1/3 Inhibition?", "Classification & 0x03?"], "var(--hb-pur)")
        + box_ml(622, 24, 162, 70, "Check 3: BusSM", ["Bit 1 BUSSM == 1?", "BswM mở I-PDU?"], "var(--hb-ok)")
        + line_arrow(191, 59, 218, 59, "var(--hb-warn)", "hbArrWarn")
        + line_arrow(393, 59, 420, 59, "var(--hb-pur)", "hbArrPur")
        + line_arrow(595, 59, 622, 59, "var(--hb-ok)", "hbArrOk")
        + box_ml(110, 126, 580, 46, "Gợi ý Debug nhanh trên Simulator:", [
            "Bấm tab Inspector [Bước Hiện Tại] và [API Trace] để soi đúng bit đang bị khóa và DET!"
        ], "var(--hb-pri)", "var(--hb-card2)", "var(--hb-pri)")
    )
    return svg_wrap(800, 192, inner)


DIAGRAMS = {
    "ecosystem": diag_comm_ecosystem(),
    "arb": diag_multi_user_arbitration(),
    "bussm": diag_bussm_handshake(),
    "syncwake": diag_sync_wakeup(),
    "ch_sm": diag_channel_sm(),
    "variants": diag_nm_variants(),
    "gatekeeper": diag_gatekeeper(),
    "shutdown": diag_shutdown_seq(),
    "inhib": diag_inhibition_gates(),
    "mask_truth": diag_mask_truth(),
    "nvm_counter": diag_nvm_counter(),
    "dcm_priority": diag_dcm_priority(),
    "pnc_vec": diag_pnc_vector(),
    "pnc_sm": diag_pnc_sm(),
    "eira_era": diag_eira_era(),
    "pnc_gw": diag_pnc_gateway(),
    "ecuc_tree": diag_ecuc_tree(),
    "debug_tree": diag_debug_tree(),
}
