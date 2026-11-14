# -*- coding: utf-8 -*-
"""Geometric SVG Diagram Generator for AUTOSAR Nm & CanNm Handbook (Zero-Overlap, Theme-Aware)."""

import html


def esc(s):
    return html.escape(str(s), quote=True)


def svg_wrap(w, h, body):
    return (
        f'<svg class="hb-svg" viewBox="0 0 {w} {h}" xmlns="http://www.w3.org/2000/svg">\n'
        '  <defs>\n'
        '    <marker id="hbArr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">\n'
        '      <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--hb-pri)" />\n'
        '    </marker>\n'
        '    <marker id="hbArrWarn" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">\n'
        '      <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--hb-warn)" />\n'
        '    </marker>\n'
        '    <marker id="hbArrOk" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">\n'
        '      <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--hb-ok)" />\n'
        '    </marker>\n'
        '    <marker id="hbArrCyan" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">\n'
        '      <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--hb-cyan)" />\n'
        '    </marker>\n'
        '    <marker id="hbArrPur" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">\n'
        '      <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--hb-pur)" />\n'
        '    </marker>\n'
        '    <marker id="hbArrErr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">\n'
        '      <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--hb-err)" />\n'
        '    </marker>\n'
        '  </defs>\n'
        f'  <rect x="0" y="0" width="{w}" height="{h}" rx="10" fill="var(--hb-bg)" />\n'
        f'{body}\n</svg>'
    )


def box_ml(x, y, w, h, lines, fill="var(--hb-card)", stroke="var(--hb-bdr)", title_color="var(--hb-pri)", rx=8):
    parts = [f'  <rect class="svg-box" data-box-w="{w}" x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="1.6" />']
    n = len(lines)
    step_y = 14 if n <= 3 else 13
    start_y = y + (h / 2) - ((n - 1) * step_y / 2) + 4
    cx = x + w / 2
    for idx, line in enumerate(lines):
        ly = start_y + idx * step_y
        if idx == 0:
            parts.append(f'  <text x="{cx:.1f}" y="{ly:.1f}" text-anchor="middle" fill="{title_color}" font-size="11.5" font-weight="700">{esc(line)}</text>')
        else:
            parts.append(f'  <text x="{cx:.1f}" y="{ly:.1f}" text-anchor="middle" fill="var(--hb-txt)" font-size="10">{esc(line)}</text>')
    return "\n".join(parts)


def pill_label(cx, cy, text, bg="var(--hb-card2)", fg="var(--hb-cyan)", stroke="var(--hb-bdr)"):
    pw = max(62, int(len(text) * 6.2 + 16))
    ph = 18
    x = cx - pw / 2
    y = cy - ph / 2
    return (
        f'  <rect class="svg-pill" x="{x:.1f}" y="{y:.1f}" width="{pw}" height="{ph}" rx="9" fill="{bg}" stroke="{stroke}" stroke-width="1" />\n'
        f'  <text x="{cx:.1f}" y="{cy + 3.5:.1f}" text-anchor="middle" fill="{fg}" font-size="9.5" font-weight="700">{esc(text)}</text>'
    )


def line_arrow(x1, y1, x2, y2, stroke="var(--hb-pri)", marker="hbArr", dashed=False):
    dash = ' stroke-dasharray="5,4"' if dashed else ""
    return f'  <line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{stroke}" stroke-width="1.8"{dash} marker-end="url(#{marker})" />'


def path_arrow(d, stroke="var(--hb-pri)", marker="hbArr", dashed=False):
    dash = ' stroke-dasharray="5,4"' if dashed else ""
    return f'  <path d="{d}" fill="none" stroke="{stroke}" stroke-width="1.8"{dash} marker-end="url(#{marker})" />'


def build_diagrams():
    d = {}

    # 1. Architecture Separation: Generic Nm vs Bus-Specific CanNm
    d["arch_separation"] = svg_wrap(820, 290, "\n".join([
        box_ml(260, 14, 300, 50, ["ComM & BswM (Hardware-Independent)", "Chỉ gọi API chuẩn của lớp Nm (Nm.h)", "Không biết CAN hay FlexRay bên dưới"], fill="var(--hb-card2)", stroke="var(--hb-ok)", title_color="var(--hb-ok)"),
        line_arrow(410, 64, 410, 96, stroke="var(--hb-pri)", marker="hbArr"),
        pill_label(525, 80, "Nm_NetworkRequest / Release", fg="var(--hb-pri)"),
        box_ml(170, 96, 480, 74, [
            "Module Nm (Generic NM Interface + NM Coordinator, ModId 29)",
            "1. Dispatcher 1-1 theo NmBusType  |  2. NmStateReport -> Com_SendSignal(NMS)",
            "3. NM Coordinator: giữ & đóng đồng bộ Cluster đa kênh (Ch0 & Ch1)"
        ], fill="var(--hb-card)", stroke="var(--hb-pri)", title_color="var(--hb-pri)"),
        line_arrow(240, 170, 145, 212, stroke="var(--hb-warn)", marker="hbArrWarn"),
        line_arrow(410, 170, 410, 212, stroke="var(--hb-cyan)", marker="hbArrCyan"),
        line_arrow(580, 170, 675, 212, stroke="var(--hb-pur)", marker="hbArrPur"),
        box_ml(20, 212, 250, 64, ["CanNm (CAN Bus-Specific)", "State Machine 2 cấp + CBV Byte", "Timers & CanIf_Transmit()"], fill="var(--hb-card2)", stroke="var(--hb-warn)", title_color="var(--hb-warn)"),
        box_ml(290, 212, 240, 64, ["FrNm (FlexRay BusNm)", "Cycle & Repetition Phase", "Dành cho xương sống FlexRay"], fill="var(--hb-card)", stroke="var(--hb-bdr)", title_color="var(--hb-cyan)"),
        box_ml(550, 212, 250, 64, ["UdpNm (Ethernet / SOME/IP)", "Multicast UDP NM Packets", "Điều phối Sleep/Wake Ethernet"], fill="var(--hb-card)", stroke="var(--hb-bdr)", title_color="var(--hb-pur)"),
    ]))

    # 2. End-to-End Flow
    d["e2e_flow"] = svg_wrap(820, 320, "\n".join([
        box_ml(20, 18, 220, 54, ["SWC_App / SWC_Diag", "Request FULL_COM", "Nm_RepeatMessageRequest()"], stroke="var(--hb-pri)", title_color="var(--hb-pri)"),
        box_ml(295, 18, 250, 54, ["ComM / BswM / Dcm", "Phân xử Mode & UDS 0x28", "BswM_Nm_CarWakeUpIndication()"], stroke="var(--hb-ok)", title_color="var(--hb-ok)"),
        box_ml(585, 18, 215, 54, ["AUTOSAR COM & PduR", "Com_SendSignal(NMS Byte 4)", "PduR_CanNmTriggerTransmit()"], stroke="var(--hb-cyan)", title_color="var(--hb-cyan)"),
        line_arrow(240, 45, 295, 45, stroke="var(--hb-pri)", marker="hbArr"),
        line_arrow(385, 72, 385, 114, stroke="var(--hb-pri)", marker="hbArr"),
        line_arrow(455, 114, 455, 72, stroke="var(--hb-ok)", marker="hbArrOk"),
        pill_label(300, 93, "Nm_NetworkRequest()", fg="var(--hb-pri)"),
        pill_label(540, 93, "ComM_Nm_NetworkMode()", fg="var(--hb-ok)"),
        box_ml(220, 114, 380, 64, ["Nm (Generic Interface & Coordinator)", "Dispatcher -> CanNm_*  |  NmShutdownDelayTimer", "Callbacks <- CanNm (Nm_RemoteSleepInd / StateChange)"], fill="var(--hb-card2)", stroke="var(--hb-pri)", title_color="var(--hb-pri)"),
        path_arrow("M 600 140 L 692 140 L 692 72", stroke="var(--hb-cyan)", marker="hbArrCyan"),
        pill_label(692, 108, "Com_SendSignal", fg="var(--hb-cyan)"),
        line_arrow(375, 178, 375, 220, stroke="var(--hb-warn)", marker="hbArrWarn"),
        line_arrow(445, 220, 445, 178, stroke="var(--hb-cyan)", marker="hbArrCyan"),
        pill_label(285, 199, "CanNm_NetworkRequest/SRB", fg="var(--hb-warn)"),
        pill_label(535, 199, "Nm_StateChange/RemoteSlp", fg="var(--hb-cyan)"),
        box_ml(220, 220, 380, 56, ["CanNm (Ch0 & Ch1 Engine, ModId 31)", "RepeatMsg/NormalOp/ReadySleep | CBV Byte | EIRA/ERA"], fill="var(--hb-card)", stroke="var(--hb-warn)", title_color="var(--hb-warn)"),
        box_ml(20, 234, 165, 52, ["CanSM", "ConfirmPnAvailability", "TxTimeout Recovery"], stroke="var(--hb-ok)", title_color="var(--hb-ok)"),
        box_ml(635, 234, 165, 52, ["CanIf & CAN Bus", "CanIf_Transmit(0x51A)", "CanNm_RxIndication(0x2B)"], stroke="var(--hb-pur)", title_color="var(--hb-pur)"),
        line_arrow(185, 258, 220, 258, stroke="var(--hb-ok)", marker="hbArrOk"),
        line_arrow(600, 246, 635, 246, stroke="var(--hb-warn)", marker="hbArrWarn"),
        line_arrow(635, 266, 600, 266, stroke="var(--hb-pur)", marker="hbArrPur"),
    ]))

    # 3. Coordinator Cluster (Ch0 & Ch1)
    d["coord_cluster"] = svg_wrap(820, 260, "\n".join([
        box_ml(245, 14, 330, 62, [
            "NM Coordinator (NmCoordClusterIndex = 0)",
            "Giữ tất cả các kênh trong Cluster thức đồng bộ",
            "Chỉ thả ngủ khi cả Ch0 & Ch1 đủ Release + RemoteSleep"
        ], fill="var(--hb-card2)", stroke="var(--hb-pri)", title_color="var(--hb-pri)"),
        line_arrow(310, 76, 200, 128, stroke="var(--hb-cyan)", marker="hbArrCyan"),
        line_arrow(510, 76, 620, 128, stroke="var(--hb-pur)", marker="hbArrPur"),
        pill_label(185, 102, "Ch0: CanNm_SetSleepReadyBit", fg="var(--hb-cyan)"),
        pill_label(635, 102, "Ch1: SleepMaster=TRUE", fg="var(--hb-pur)"),
        box_ml(25, 128, 345, 114, [
            "Kênh Ch0: CAN_Body (Gateway Active Coord)",
            "• NmActiveCoordinator = TRUE",
            "• NmChannelSleepMaster = FALSE (phải chờ node con)",
            "• Nm_RemoteSleepIndication(Ch0) -> Bit 6 = 1",
            "• Chịu trách nhiệm phát CBV Bit 3 (SRB=1)"
        ], stroke="var(--hb-cyan)", title_color="var(--hb-cyan)"),
        box_ml(450, 128, 345, 114, [
            "Kênh Ch1: CAN_SubNet (Nhánh phụ)",
            "• NmChannelSleepMaster = TRUE (ECU là chủ nhánh)",
            "• Chỉ cần ComM gọi Release là sẵn sàng ngủ ngay",
            "• Nếu Ch1 vẫn còn ACTIVE, Nm Coordinator BẮT BUỘC",
            "  giữ Ch0 ở Normal Operation (nmCoordHold = TRUE)"
        ], stroke="var(--hb-pur)", title_color="var(--hb-pur)"),
    ]))

    # 4. Coordinated Shutdown & Abort Timeline
    d["coord_shutdown_seq"] = svg_wrap(820, 290, "\n".join([
        box_ml(20, 22, 165, 58, ["1. Wait RemoteSleep", "ComM đã Release hết", "Đợi RemoteSleep(Ch0/1)"], stroke="var(--hb-warn)", title_color="var(--hb-warn)"),
        box_ml(220, 22, 175, 58, ["2. Sync Point (Optional)", "NmSynchronizingNetwork", "Đợi Nm_SyncPoint(0)"], stroke="var(--hb-cyan)", title_color="var(--hb-cyan)"),
        box_ml(430, 22, 180, 58, ["3. Shutdown Initiated", "CanNm_SetSleepReadyBit(1)", "CBV SRB=1 + DelayTmr"], stroke="var(--hb-pur)", title_color="var(--hb-pur)"),
        box_ml(645, 22, 155, 58, ["4. Release Đồng Loạt", "DelayTimer == 0 ms", "CanNm_Release(Ch0/1)"], stroke="var(--hb-ok)", title_color="var(--hb-ok)"),
        line_arrow(185, 51, 220, 51, stroke="var(--hb-warn)", marker="hbArrWarn"),
        line_arrow(395, 51, 430, 51, stroke="var(--hb-cyan)", marker="hbArrCyan"),
        line_arrow(610, 51, 645, 51, stroke="var(--hb-ok)", marker="hbArrOk"),
        box_ml(110, 145, 600, 125, [
            "Cơ Chế Bảo Vệ ABORT COORDINATED SHUTDOWN [SWS_Nm_00180]",
            "Khi NmShutdownDelayTimer đang đếm ngược ở Bước 3:",
            "• Tình huống A: Node trên CAN Bus bất ngờ phát frame -> Nm_RemoteSleepCancellation()",
            "• Tình huống B: SWC trên nhánh Ch0 hoặc Ch1 gọi lại Nm_NetworkRequest()",
            "➔ PHẢN ỨNG: Dừng Timer + Gọi CanNm_SetSleepReadyBit(FALSE) (xóa SRB=0)",
            "   và gọi CanNm_NetworkRequest() giữ toàn Cluster tiếp tục thức hoàn toàn!"
        ], fill="var(--hb-card2)", stroke="var(--hb-err)", title_color="var(--hb-err)"),
        path_arrow("M 520 80 L 520 145", stroke="var(--hb-err)", marker="hbArrErr", dashed=True),
        pill_label(520, 112, "Abort Trigger: RSC / NetworkReq", fg="var(--hb-err)"),
    ]))

    # 5. CanNm State Machine
    d["cannm_sm"] = svg_wrap(820, 310, "\n".join([
        box_ml(16, 28, 165, 76, ["NM_MODE_BUS_SLEEP", "Tắt CanSM / CanTrcv", "Rx -> Nm_NetworkStartInd", "Callbacks: Nm_BusSleepMode"], fill="var(--hb-card2)", stroke="var(--hb-pri)", title_color="var(--hb-pri)"),
        box_ml(16, 206, 165, 78, ["PREPARE_BUS_SLEEP", "Xóa Bit 4 AWB = 0", "Đếm WaitBusSleepTime", "Báo: ComM SILENT_COM"], fill="var(--hb-card2)", stroke="var(--hb-cyan)", title_color="var(--hb-cyan)"),
        '  <rect x="268" y="14" width="536" height="280" rx="10" fill="var(--hb-card)" stroke="var(--hb-ok)" stroke-width="1.6" stroke-dasharray="6,4" />',
        '  <text x="536" y="32" text-anchor="middle" fill="var(--hb-ok)" font-size="11.5" font-weight="700">NM_MODE_NETWORK (Gọi Nm_NetworkMode(Ch) -&gt; ComM FULL_COM)</text>',
        box_ml(284, 48, 232, 92, [
            "NM_STATE_REPEAT_MESSAGE",
            "• Phát Burst Tx (AWB=1 nếu Active)",
            "• Nếu RMR=1 -> điểm danh toàn bus",
            "• Hết RepeatMsgTime -> rẽ theo HOLD"
        ], fill="var(--hb-card2)", stroke="var(--hb-warn)", title_color="var(--hb-warn)"),
        box_ml(554, 48, 234, 92, [
            "NM_STATE_NORMAL_OPERATION",
            "• Điều kiện: CANNM_HOLD == 1",
            "• Phát NM PDU mỗi MsgCycleTime",
            "• Chạy RemoteSleepIndTime"
        ], fill="var(--hb-card2)", stroke="var(--hb-ok)", title_color="var(--hb-ok)"),
        box_ml(425, 186, 250, 88, [
            "NM_STATE_READY_SLEEP",
            "• Điều kiện: CANNM_HOLD == 0",
            "• NGƯNG phát NM PDU (chỉ nghe)",
            "• Chờ CanNmTimeoutTime -> PBSM"
        ], fill="var(--hb-card2)", stroke="var(--hb-pur)", title_color="var(--hb-pur)"),
        line_arrow(181, 66, 284, 66, stroke="var(--hb-ok)", marker="hbArrOk"),
        line_arrow(516, 90, 554, 90, stroke="var(--hb-ok)", marker="hbArrOk"),
        line_arrow(435, 140, 475, 186, stroke="var(--hb-pur)", marker="hbArrPur"),
        line_arrow(625, 140, 585, 186, stroke="var(--hb-pur)", marker="hbArrPur"),
        line_arrow(425, 240, 181, 240, stroke="var(--hb-cyan)", marker="hbArrCyan"),
        line_arrow(98, 206, 98, 104, stroke="var(--hb-pri)", marker="hbArr"),
        pill_label(224, 46, "Req / Pasv", fg="var(--hb-ok)"),
        pill_label(340, 260, "NM-Timeout == 0", fg="var(--hb-cyan)"),
        pill_label(98, 155, "WaitSlp == 0", fg="var(--hb-pri)"),
    ]))

    # 6. Figure 7-1 Callbacks Integration
    d["fig71_algo"] = svg_wrap(820, 230, "\n".join([
        box_ml(20, 20, 240, 82, [
            "Điểm Callback 1 (Thức dậy)",
            "CanNm -> Nm_NetworkStartIndication()",
            "CanNm -> Nm_NetworkMode()",
            "Nm đẩy lên ComM mở CanSM"
        ], stroke="var(--hb-ok)", title_color="var(--hb-ok)"),
        box_ml(290, 20, 240, 82, [
            "Điểm Callback 2 (Đổi Sub-State)",
            "CanNm -> Nm_StateChangeNotification()",
            "Nm kích hoạt NmStateReport (NMS)",
            "CanNm -> Nm_RemoteSleepIndication()"
        ], stroke="var(--hb-warn)", title_color="var(--hb-warn)"),
        box_ml(560, 20, 240, 82, [
            "Điểm Callback 3 (Rút về ngủ)",
            "CanNm -> Nm_PrepareBusSleepMode()",
            "CanNm -> Nm_BusSleepMode()",
            "ComM hạ CanSM về SILENT / NO_COM"
        ], stroke="var(--hb-cyan)", title_color="var(--hb-cyan)"),
        line_arrow(260, 61, 290, 61, stroke="var(--hb-warn)", marker="hbArrWarn"),
        line_arrow(530, 61, 560, 61, stroke="var(--hb-cyan)", marker="hbArrCyan"),
        box_ml(85, 136, 650, 74, [
            "Nguyên Lý Cốt Lõi Của Figure 7-1 (AUTOSAR SWS_CanNm Algorithm)",
            "• RxIndication() trong Network Mode nạp lại NM-Timeout Timer giữ mạng không bị rơi ngủ.",
            "• RxIndication() trong Prepare Bus-Sleep phục hồi lập tức về Repeat Message & báo RestartIndication.",
            "• RxIndication() trong Bus-Sleep chỉ báo lỗi CANNM_E_NET_START_IND + gọi Nm_NetworkStartIndication()."
        ], fill="var(--hb-card2)", stroke="var(--hb-pri)", title_color="var(--hb-pri)"),
    ]))

    # 7. 8-Byte PDU Layout & CBV
    d["pdu_layout"] = svg_wrap(820, 250, "\n".join([
        box_ml(18, 20, 92, 74, ["Byte 0", "SNI / NID", "0x1A", "CanNmNodeId"], fill="var(--hb-card2)", stroke="var(--hb-pri)", title_color="var(--hb-pri)"),
        box_ml(118, 20, 92, 74, ["Byte 1", "CBV Byte", "b0..b7", "Điều phối"], fill="var(--hb-card2)", stroke="var(--hb-warn)", title_color="var(--hb-warn)"),
        box_ml(218, 20, 192, 74, ["Byte 2 .. Byte 3", "PNI Bit Vector (PNC Mask)", "VD: [05 00] = PNC #16 & #18", "Bật khi CBV Bit 6 (PNI=1)"], fill="var(--hb-card2)", stroke="var(--hb-pur)", title_color="var(--hb-pur)"),
        box_ml(418, 20, 120, 74, ["Byte 4", "NMS Report", "6-bit State", "Com_SendSig"], fill="var(--hb-card2)", stroke="var(--hb-cyan)", title_color="var(--hb-cyan)"),
        box_ml(546, 20, 254, 74, ["Byte 5 .. Byte 7 (hoặc 2..7)", "COM User Data (Signal Payload)", "Kéo qua PduR_CanNmTriggerTransmit()", "hoặc Nm_SetUserData()"], fill="var(--hb-card2)", stroke="var(--hb-bdr)", title_color="var(--hb-txt)"),
        box_ml(25, 128, 150, 96, ["Bit 0: RMR (0x01)", "Repeat Msg Request", "Nm_RepeatMsgReq", "Điểm danh Node"], stroke="var(--hb-warn)", title_color="var(--hb-warn)"),
        box_ml(182, 128, 150, 96, ["Bit 3: SRB/CWU", "SleepReadyBit (0x08)", "CanNm_SetSleepReady", "& CarWakeUp Flag"], stroke="var(--hb-warn)", title_color="var(--hb-warn)"),
        box_ml(339, 128, 145, 96, ["Bit 4: AWB (0x10)", "Active Wakeup Bit", "1 = Req chủ động", "0 = Passive Wakeup"], stroke="var(--hb-ok)", title_color="var(--hb-ok)"),
        box_ml(491, 128, 148, 96, ["Bit 5: PNSR (0x20)", "Sync PNC Shutdown", "Nm_RequestSyncPnc", "R20-11 / R22-11+"], stroke="var(--hb-cyan)", title_color="var(--hb-cyan)"),
        box_ml(646, 128, 150, 96, ["Bit 6: PNI (0x40)", "Partial Net Info", "1 = Có Byte PNC", "CanNmPnEnabled"], stroke="var(--hb-pur)", title_color="var(--hb-pur)"),
    ]))

    # 8. NmStateReport Closed Loop
    d["nms_loop"] = svg_wrap(820, 220, "\n".join([
        box_ml(20, 25, 175, 68, ["1. CanNm Ch0", "Chuyển State (VD: RM->NO)", "Bắn Nm_StateChangeInd"], stroke="var(--hb-warn)", title_color="var(--hb-warn)"),
        box_ml(228, 25, 185, 68, ["2. Module Nm", "NmStateReportEnabled=TRUE", "Tra bảng -> NMS = 0x04"], stroke="var(--hb-pri)", title_color="var(--hb-pri)"),
        box_ml(446, 25, 175, 68, ["3. AUTOSAR COM", "Nhận Com_SendSignal()", "Lưu NMS vào I-PDU Byte 4"], stroke="var(--hb-cyan)", title_color="var(--hb-cyan)"),
        box_ml(654, 25, 148, 68, ["4. PduR -> CanNm", "TriggerTransmit()", "Kéo 0x04 phát ra Bus"], stroke="var(--hb-ok)", title_color="var(--hb-ok)"),
        line_arrow(195, 59, 228, 59, stroke="var(--hb-warn)", marker="hbArrWarn"),
        line_arrow(413, 59, 446, 59, stroke="var(--hb-pri)", marker="hbArr"),
        line_arrow(621, 59, 654, 59, stroke="var(--hb-cyan)", marker="hbArrCyan"),
        box_ml(60, 128, 700, 72, [
            "6 Giá Trị Mã Hóa Chuẩn NMS (SWS_Nm_00154)",
            "0x01 = RM từ BSM   |   0x02 = RM từ PBSM   |   0x04 = NO từ RM",
            "0x08 = NO từ RS    |   0x10 = RM từ RS     |   0x20 = RM từ NO"
        ], fill="var(--hb-card2)", stroke="var(--hb-bdr)", title_color="var(--hb-cyan)"),
    ]))

    # 9. Partial Networking & ERA/EIRA
    d["pn_eira_era"] = svg_wrap(820, 240, "\n".join([
        box_ml(20, 35, 180, 72, ["Rx NM PDU từ Bus", "CBV Bit 6 (PNI) == 1", "PNC Mask: Byte 2..3"], stroke="var(--hb-pur)", title_color="var(--hb-pur)"),
        box_ml(245, 35, 260, 72, ["Bộ Lọc CanNm PN Filter", "(RxPNI & CanNmPnFilterMask)", "== 0 -> DROP! (Không reset TMO)", "!= 0 -> Hợp lệ + Nạp PnResetTime"], fill="var(--hb-card2)", stroke="var(--hb-warn)", title_color="var(--hb-warn)"),
        box_ml(550, 35, 250, 72, ["Cập nhật EIRA / ERA -> ComM", "PduR_CanNmRxIndication()", "ComM kích hoạt User thuộc PNC đó"], stroke="var(--hb-ok)", title_color="var(--hb-ok)"),
        line_arrow(200, 71, 245, 71, stroke="var(--hb-pur)", marker="hbArrPur"),
        line_arrow(505, 71, 550, 71, stroke="var(--hb-ok)", marker="hbArrOk"),
        box_ml(40, 145, 355, 74, ["EIRA (External & Internal Req Array)", "Gộp cả Rx từ bus + Tx nội bộ ECU trên mọi kênh", "Dùng để báo cho ComM cục bộ biết PNC nào đang bận"], stroke="var(--hb-cyan)", title_color="var(--hb-cyan)"),
        box_ml(425, 145, 355, 74, ["ERA (External Request Array)", "Chỉ phản ánh yêu cầu Rx bên ngoài trên TỪNG kênh", "Dùng cho ECU Gateway định tuyến PNC sang nhánh khác"], stroke="var(--hb-pri)", title_color="var(--hb-pri)"),
    ]))

    # 10. Synchronized PNC Shutdown (R22-11+)
    d["sync_pnc_shdn"] = svg_wrap(820, 235, "\n".join([
        box_ml(20, 22, 230, 80, ["Top-Level PNC Coordinator", "1. ComM -> Nm_RequestSyncPncShdn", "2. Nm -> CanNm_RequestSyncPncShdn", "3. CanNm đặt CBV Bit 5 PNSR=1"], fill="var(--hb-card2)", stroke="var(--hb-cyan)", title_color="var(--hb-cyan)"),
        box_ml(295, 22, 220, 80, ["Khung NM PDU Trên Bus", "CBV Bit 6 (PNI) = 1", "CBV Bit 5 (PNSR) = 1", "Payload PNC Vector = [01 00]"], fill="var(--hb-card)", stroke="var(--hb-warn)", title_color="var(--hb-warn)"),
        box_ml(560, 22, 240, 80, ["Subordinate PNC Node", "1. CanNm_RxIndication(PNSR=1)", "2. CanNm -> Nm_ForwardSyncPncShdn", "3. Nm -> ComM_Nm_ForwardSyncPncShdn"], fill="var(--hb-card2)", stroke="var(--hb-ok)", title_color="var(--hb-ok)"),
        line_arrow(250, 62, 295, 62, stroke="var(--hb-cyan)", marker="hbArrCyan"),
        line_arrow(515, 62, 560, 62, stroke="var(--hb-ok)", marker="hbArrOk"),
        box_ml(85, 134, 650, 78, [
            "Lợi Ích Của Synchronized PNC Shutdown (AUTOSAR R20-11 / R22-11 / R23-11)",
            "• Giải quyết triệt để hiện tượng 'Wakeup Ping-Pong' giữa Gateway và các node con trong PNC.",
            "• Toàn bộ các ECU thuộc PNC #16 đồng loạt giải phóng PNC tại cùng một chu kỳ, không bị đánh thức chéo!"
        ], fill="var(--hb-card2)", stroke="var(--hb-pri)", title_color="var(--hb-pri)"),
    ]))

    return d
