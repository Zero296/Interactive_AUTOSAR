# Helper to generate crisp, overlap-free, offline theme-aware inline SVG diagrams for WdgM Handbook

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
    title_size=11.5, line_size=9.5
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


def pill_label(cx, cy, lines, color="var(--hb-pri)", anchor="middle", bg="var(--hb-bg)", stroke="none", font_size=9.5):
    if isinstance(lines, str):
        lines = [lines]
    max_len = max((len(l) for l in lines), default=1)
    pw = max(40, int(max_len * font_size * 0.60) + 12)
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


# 1.1 Ecosystem
def diag_ecosystem():
    inner = (
        box_ml(20, 16, 220, 58, "SWC Brake / Engine (SE0/1)", ["WdgM_CheckpointReached()", "Rte_Switch_local/globalMode"], "var(--hb-acc)")
        + box_ml(290, 16, 220, 58, "BSW_CanDiag (SE_2)", ["C API Direct Checkpoint", "Active in SLOW_MODE"], "var(--hb-cyan)")
        + box_ml(560, 16, 220, 58, "BswM / EcuM / Mcu", ["WdgM_Init() & SetMode()", "Partition / Mcu_PerformReset"], "var(--hb-ok)")
        + box_ml(20, 132, 200, 74, "RTE, SchM & OS", ["WdgM_MainFunction() [10ms]", "GetCounterValue(OsCounter)"], "var(--hb-pur)")
        + box_ml(265, 126, 270, 86, "WdgM Core (SWS_WdgM)", ["Alive + Deadline + Logical", "Local/Global Status & Latch"], "var(--hb-pri)", "var(--hb-card2)", "var(--hb-pri)")
        + box_ml(580, 132, 200, 74, "DEM & DET Services", ["WDGM_E_MONITORING/SET_MODE", "Det_ReportError(Module=13)"], "var(--hb-err)")
        + box_ml(20, 270, 225, 64, "Wdg_Int (MCU Watchdog)", ["DeviceIndex = 0", "Internal WDG_SR Refresh"], "var(--hb-ok)")
        + box_ml(290, 270, 220, 64, "WdgIf (Abstraction)", ["WdgIf_SetTriggerCondition()", "WdgIf_SetMode(Idx, Mode)"], "var(--hb-cyan)")
        + box_ml(555, 270, 225, 64, "Wdg_Ext (SBC Window)", ["DeviceIndex = 1 (SPI)", "Closed / Open Window + NRES"], "var(--hb-warn)")
        + line_arrow(120, 74, 120, 132, "var(--hb-acc)", "hbArr")
        + pill_label(120, 103, "CP0 / CP1 / CP2", "var(--hb-acc)")
        + line_arrow(220, 169, 265, 169, "var(--hb-pur)", "hbArrPur")
        + line_arrow(400, 74, 400, 126, "var(--hb-cyan)", "hbArrCyan")
        + pill_label(400, 100, "BSW Direct CP", "var(--hb-cyan)")
        + path_arrow("M 640 74 L 640 100 L 495 100 L 495 126", "var(--hb-ok)", "hbArrOk")
        + pill_label(610, 100, "Init / SetMode", "var(--hb-ok)")
        + line_arrow(535, 169, 580, 169, "var(--hb-err)", "hbArrErr")
        + line_arrow(400, 212, 400, 270, "var(--hb-cyan)", "hbArrCyan")
        + pill_label(400, 241, "Trigger / Mode", "var(--hb-cyan)")
        + line_arrow(290, 302, 245, 302, "var(--hb-ok)", "hbArrOk")
        + line_arrow(510, 302, 555, 302, "var(--hb-warn)", "hbArrWarn")
    )
    return svg_wrap(800, 352, inner)


# 1.2 Layered Architecture
def diag_layered_wdg():
    inner = (
        box_ml(160, 18, 480, 62, "WdgM (System Services Layer)", ["Độc lập phần cứng · Quản lý Alive / Deadline / Logical", "Gọi WdgIf qua DeviceIndex (0, 1, ...)"], "var(--hb-pri)", "var(--hb-card2)", "var(--hb-pri)")
        + box_ml(160, 128, 480, 56, "WdgIf (ECU Abstraction Layer)", ["Trừu tượng hóa bảng con trỏ hàm WdgIf_Device[Idx]", "Ánh xạ DeviceIndex -> Driver cụ thể"], "var(--hb-cyan)")
        + box_ml(50, 234, 310, 64, "Wdg_Int (MCAL Internal Driver)", ["DeviceIndex = 0 · Thao tác thanh ghi MCU", "Cảnh báo Reset nội bộ nếu Timeout = 0"], "var(--hb-ok)")
        + box_ml(440, 234, 310, 64, "Wdg_Ext (External SBC Window Driver)", ["DeviceIndex = 1 · Giao tiếp SPI PMIC/SBC", "Kiểm soát Closed/Open Window & kéo NRES"], "var(--hb-warn)")
        + line_arrow(400, 80, 400, 128, "var(--hb-pri)", "hbArr")
        + pill_label(400, 104, "WdgIf_SetTriggerCondition(Idx, Tmo)", "var(--hb-pri)")
        + path_arrow("M 310 184 L 310 210 L 205 210 L 205 234", "var(--hb-ok)", "hbArrOk")
        + pill_label(205, 209, "DeviceIdx = 0", "var(--hb-ok)")
        + path_arrow("M 490 184 L 490 210 L 595 210 L 595 234", "var(--hb-warn)", "hbArrWarn")
        + pill_label(595, 209, "DeviceIdx = 1", "var(--hb-warn)")
    )
    return svg_wrap(800, 316, inner)


# 1.3 SE & CP Mapping
def diag_se_cp_map():
    inner = (
        box_ml(20, 26, 230, 178, "SWC_BrakeCtrl (SE_0)", ["Runnable_Brake10ms():", "1. WdgM_CheckpointReached(CP_0)", "2. /* Tính áp suất ABS */", "3. WdgM_CheckpointReached(CP_1)", "4. /* Xuất lệnh van */", "5. WdgM_CheckpointReached(CP_2)"], "var(--hb-acc)")
        + box_ml(320, 44, 170, 140, "RTE Port Wrapper", ["Ánh xạ Port Arg:", "SEID = 0 cố định", "Không cho SWC tự", "chỉnh SEID của", "SWC khác!"], "var(--hb-pur)")
        + box_ml(550, 26, 230, 178, "WdgM SE_0 Config", ["CP_0: Alive + DL Start + LogInit", "CP_1: DL Stop + LogStep", "CP_2: LogFinal", "OS App: OsApp_ASILD_Brake", "LocalStatus: OK / FAIL / EXP"], "var(--hb-pri)", "var(--hb-card2)", "var(--hb-pri)")
        + line_arrow(250, 114, 320, 114, "var(--hb-acc)", "hbArr")
        + line_arrow(490, 114, 550, 114, "var(--hb-pri)", "hbArr")
    )
    return svg_wrap(800, 230, inner)


# 1.4 I/O Flow Summary
def diag_io_flow():
    inner = (
        box_ml(20, 26, 220, 180, "INPUTS Vào WdgM", ["1. WdgM_CheckpointReached()", "2. WdgM_MainFunction() [10ms]", "3. GetCounterValue(OsCounter)", "4. WdgM_SetMode(ModeId)", "5. WdgM_PerformReset()"], "var(--hb-acc)")
        + box_ml(290, 26, 220, 180, "XỬ LÝ NỘI BỘ WdgM", ["1. Tăng AC & đo Δt ngay", "2. Kiểm tra đồ thị Logical", "3. Đánh giá Alive khi SC==SRC", "4. Tính Local & Global Status", "5. Chốt FirstExpiredSEID"], "var(--hb-pri)", "var(--hb-card2)", "var(--hb-pri)")
        + box_ml(560, 26, 220, 180, "OUTPUTS Từ WdgM", ["1. WdgIf_SetTriggerCondition()", "2. WdgIf_SetMode()", "3. BswM_RequestPartitionReset", "4. Mcu_PerformReset()", "5. Dem_SetEventStatus / DET"], "var(--hb-ok)")
        + line_arrow(240, 116, 290, 116, "var(--hb-pri)", "hbArr")
        + line_arrow(510, 116, 560, 116, "var(--hb-ok)", "hbArrOk")
    )
    return svg_wrap(800, 232, inner)


# 2.1 Alive Supervision
def diag_alive_algo():
    inner = (
        box_ml(20, 30, 195, 76, "AC < EAI - MinMargin", ["VD: AC = 0 (< 1)", "Lỗi: Task treo / chậm", "Kết quả: INCORRECT"], "var(--hb-err)")
        + box_ml(275, 22, 250, 92, "Vùng Hợp Lệ (WDGM_CORRECT)", ["(EAI - MinMargin) ≤ AC ≤ (EAI + MaxMargin)", "VD: 1 ≤ AC(2) ≤ 3 tại SC == SRC(2)", "Reset AC=0, SC=0 · FailedCnt--"], "var(--hb-ok)", "var(--hb-card2)", "var(--hb-ok)")
        + box_ml(585, 30, 195, 76, "AC > EAI + MaxMargin", ["VD: AC = 5 (> 3)", "Lỗi: Babbling / Lặp vô tận", "Kết quả: INCORRECT"], "var(--hb-err)")
        + box_ml(225, 166, 350, 68, "Đánh Giá Dung Sai (FailedAliveRefCycleTol)", ["Nếu FailedCnt ≤ Tol -> LOCAL_STATUS_FAILED (Vẫn nuôi Wdg)", "Nếu FailedCnt > Tol -> LOCAL_STATUS_EXPIRED (Chết!)"], "var(--hb-warn)")
        + path_arrow("M 117 106 L 117 200 L 225 200", "var(--hb-err)", "hbArrErr")
        + path_arrow("M 682 106 L 682 200 L 575 200", "var(--hb-err)", "hbArrErr")
        + line_arrow(400, 114, 400, 166, "var(--hb-ok)", "hbArrOk")
    )
    return svg_wrap(800, 256, inner)


# 2.2 Deadline Supervision
def diag_deadline_algo():
    inner = (
        box_ml(20, 24, 185, 78, "1. CP_Start (CP_0)", ["GetCounterValue(&tStart)", "pending = TRUE", "VD: tStart = 2 ms"], "var(--hb-pri)")
        + box_ml(290, 24, 210, 78, "2. CP_Stop (CP_1)", ["tStop = OsCounter", "Δt = tStop - tStart", "Kiểm tra: Tmin ≤ Δt ≤ Tmax"], "var(--hb-ok)")
        + box_ml(575, 24, 205, 78, "3. Timeout Detection", ["MainFn thấy pending=TRUE", "và (tNow - tStart) > Tmax", "Bắt treo Task dù chưa CP1!"], "var(--hb-warn)")
        + box_ml(20, 156, 225, 68, "Δt < Tmin (VD: 1ms < 2ms)", ["Lỗi chạy quá sớm / bỏ nhánh", "Nhảy thẳng EXPIRED (Tol=0)!"], "var(--hb-err)")
        + box_ml(285, 156, 225, 68, "Tmin ≤ Δt ≤ Tmax [2..8ms]", ["Deadline = WDGM_CORRECT", "Cho phép tiếp tục vận hành"], "var(--hb-ok)")
        + box_ml(550, 156, 230, 68, "Δt > Tmax hoặc Timeout", ["Lỗi chạy quá hạn / Deadlock", "Nhảy thẳng EXPIRED (Tol=0)!"], "var(--hb-err)")
        + line_arrow(205, 63, 290, 63, "var(--hb-pri)", "hbArr")
        + pill_label(247, 42, "Δt ms", "var(--hb-pri)")
        + line_arrow(500, 63, 575, 63, "var(--hb-warn)", "hbArrWarn", dashed=True)
        + line_arrow(295, 102, 165, 156, "var(--hb-err)", "hbArrErr")
        + line_arrow(395, 102, 395, 156, "var(--hb-ok)", "hbArrOk")
        + line_arrow(575, 102, 650, 156, "var(--hb-err)", "hbArrErr")
    )
    return svg_wrap(800, 244, inner)


# 2.3 Logical Internal Graph
def diag_logical_internal():
    inner = (
        box_ml(30, 32, 185, 72, "CP_0 (Initial CP)", ["Khi ActivityFlag == 0", "Bắt buộc phải vào từ CP_0", "Bật ActivityFlag = TRUE"], "var(--hb-pri)")
        + box_ml(305, 32, 190, 72, "CP_1 (Intermediate)", ["Cạnh hợp lệ: CP0 -> CP1", "Kiểm tra điều kiện trung gian", "LastCP = CP_1"], "var(--hb-ok)")
        + box_ml(585, 32, 185, 72, "CP_2 (Final CP)", ["Cạnh hợp lệ: CP1 -> CP2", "Đóng đồ thị hoàn chỉnh", "Hạ ActivityFlag = FALSE"], "var(--hb-pur)")
        + box_ml(185, 158, 430, 62, "Lỗi Nhảy Cóc (CP0 -> CP2) hoặc Sai Điểm Vào", ["Không có cạnh hợp lệ trong bảng WdgMInternalTransition", "=> Logical = INCORRECT -> Nhảy thẳng LOCAL_STATUS_EXPIRED!"], "var(--hb-err)")
        + line_arrow(215, 68, 305, 68, "var(--hb-ok)", "hbArrOk")
        + pill_label(260, 48, "CP0->CP1", "var(--hb-ok)")
        + line_arrow(495, 68, 585, 68, "var(--hb-ok)", "hbArrOk")
        + pill_label(540, 48, "CP1->CP2", "var(--hb-ok)")
        + path_arrow("M 122 104 L 122 189 L 185 189", "var(--hb-err)", "hbArrErr", dashed=True)
        + path_arrow("M 677 104 L 677 189 L 615 189", "var(--hb-err)", "hbArrErr", dashed=True)
    )
    return svg_wrap(800, 240, inner)


# 2.4 Logical External Graph
def diag_logical_external():
    inner = (
        box_ml(20, 28, 330, 128, "SE_0: SWC_BrakeCtrl", ["1. Gọi SE0_CP0 (External Initial)", "2. Gọi SE0_CP1 (Hoàn tất phanh)", "Bàn giao qua RTE -> SE_1"], "var(--hb-pri)")
        + box_ml(450, 28, 330, 128, "SE_1: SWC_EngineTrq", ["3. Nhận SE1_CP0 (Cạnh SE0_CP1->SE1_CP0)", "4. Gọi SE1_CP1 (External Final)", "Hạ External ActivityFlag = FALSE"], "var(--hb-cyan)")
        + box_ml(160, 190, 480, 56, "Bảo Vệ Chống Gọi Trái Thứ Tự Đa SWC", ["Nếu SE_1 chạy SE1_CP0 khi SE_0 mới ở SE0_CP0 -> EXPIRED ngay!"], "var(--hb-err)")
        + line_arrow(350, 92, 450, 92, "var(--hb-ok)", "hbArrOk")
        + pill_label(400, 68, "SE0_CP1->SE1_CP0", "var(--hb-ok)")
        + line_arrow(400, 156, 400, 190, "var(--hb-err)", "hbArrErr", dashed=True)
    )
    return svg_wrap(800, 266, inner)


# 3.1 Local State Machine
def diag_local_sm():
    inner = (
        box_ml(20, 24, 210, 68, "DEACTIVATED (0x04)", ["Trước WdgM_Init() hoặc", "tắt trong WdgMMode hiện tại"], "var(--hb-mut)")
        + box_ml(305, 24, 200, 68, "LOCAL_STATUS_OK (0x00)", ["Alive, Deadline & Logical", "đều đạt chuẩn WDGM_CORRECT"], "var(--hb-ok)", "var(--hb-card2)", "var(--hb-ok)")
        + box_ml(570, 24, 210, 68, "LOCAL_STATUS_FAILED (0x01)", ["CHỈ Alive lỗi ≤ Tol", "Có thể tự hồi phục về OK"], "var(--hb-warn)")
        + box_ml(305, 166, 360, 72, "LOCAL_STATUS_EXPIRED (0x02)", ["1. Vượt Alive Tol (FailedCnt > Tol)", "2. HOẶC sai 1 lần Deadline / Logical!", "Không bao giờ tự thoát trừ Partition Reset!"], "var(--hb-err)", "var(--hb-card2)", "var(--hb-err)")
        + line_arrow(230, 58, 305, 58, "var(--hb-ok)", "hbArrOk")
        + line_arrow(505, 48, 570, 48, "var(--hb-warn)", "hbArrWarn")
        + line_arrow(570, 72, 505, 72, "var(--hb-ok)", "hbArrOk")
        + line_arrow(405, 92, 405, 166, "var(--hb-err)", "hbArrErr")
        + pill_label(405, 129, "Sai Deadline/Logical", "var(--hb-err)")
        + path_arrow("M 675 92 L 675 135 L 590 135 L 590 166", "var(--hb-err)", "hbArrErr")
        + pill_label(675, 129, "Vượt Alive Tol", "var(--hb-err)")
    )
    return svg_wrap(800, 258, inner)


# 3.2 Zero Tolerance vs Tolerance
def diag_tol_vs_zero():
    inner = (
        box_ml(20, 22, 360, 184, "Luồng Alive Supervision (Có Dung Sai)", ["1. Lỗi kỳ 1: FailedCnt=1 <= Tol(1) -> FAILED", "2. Hệ thống VẪN tiếp tục nuôi Watchdog", "3. Kỳ sau chạy đúng -> FailedCnt=0 -> TỰ VỀ OK!", "4. Chỉ khi FailedCnt > Tol -> mới sang EXPIRED"], "var(--hb-warn)")
        + box_ml(420, 22, 360, 184, "Luồng Deadline & Logical (Zero Tolerance)", ["1. Deadline đã có sẵn biên [Tmin..Tmax]", "2. Logical là thứ tự lệnh bắt buộc an toàn", "3. Do đó dung sai luôn = 0!", "4. Sai 1 lần -> Nhảy THẲNG OK -> EXPIRED!"], "var(--hb-err)")
    )
    return svg_wrap(800, 228, inner)


# 3.3 Global State Machine
def diag_global_sm():
    inner = (
        box_ml(20, 28, 160, 68, "DEACTIVATED (04)", ["Chưa Init hoặc", "sau WdgM_DeInit()"], "var(--hb-mut)")
        + box_ml(230, 28, 175, 68, "GLOBAL_OK (00)", ["Mọi SE = OK/DEACT", "Nuôi WdgIf đầy đủ"], "var(--hb-ok)", "var(--hb-card2)", "var(--hb-ok)")
        + box_ml(465, 28, 175, 68, "GLOBAL_FAILED (01)", ["Có SE FAILED", "Vẫn nuôi WdgIf"], "var(--hb-warn)")
        + box_ml(230, 162, 225, 74, "GLOBAL_EXPIRED (02)", ["Có SE EXPIRED & ExpCnt ≤ Tol", "Ân hạn để kịp ghi DEM / NvM"], "var(--hb-pur)")
        + box_ml(515, 162, 260, 74, "GLOBAL_STOPPED (03)", ["Hết ân hạn hoặc PerformReset()", "WdgIf(0) + DEM + McuReset!"], "var(--hb-err)", "var(--hb-card2)", "var(--hb-err)")
        + line_arrow(180, 62, 230, 62, "var(--hb-ok)", "hbArrOk")
        + line_arrow(405, 50, 465, 50, "var(--hb-warn)", "hbArrWarn")
        + line_arrow(465, 74, 405, 74, "var(--hb-ok)", "hbArrOk")
        + line_arrow(318, 96, 318, 162, "var(--hb-pur)", "hbArrPur")
        + line_arrow(455, 199, 515, 199, "var(--hb-err)", "hbArrErr")
        + pill_label(485, 145, "ExpCnt > Tol", "var(--hb-err)")
        + path_arrow("M 645 96 L 645 162", "var(--hb-err)", "hbArrErr")
    )
    return svg_wrap(800, 256, inner)


# 3.4 Aggregation Matrix
def diag_aggregation():
    inner = (
        box_ml(20, 20, 200, 56, "SE_0 (BrakeCtrl)", ["Local = EXPIRED (0x02)"], "var(--hb-err)")
        + box_ml(20, 92, 200, 56, "SE_1 (EngineTrq)", ["Local = OK (0x00)"], "var(--hb-ok)")
        + box_ml(20, 164, 200, 56, "SE_2 (CanDiag)", ["Local = DEACTIVATED (0x04)"], "var(--hb-mut)")
        + box_ml(295, 68, 220, 104, "Global Aggregator", ["Quy tắc: Worst-Case Wins", "EXPIRED > FAILED > OK", "(DEACTIVATED không ảnh hưởng)"], "var(--hb-pri)", "var(--hb-card2)", "var(--hb-pri)")
        + box_ml(575, 78, 205, 84, "Global Status Output", ["GLOBAL_EXPIRED (nếu Tol>0)", "hoặc GLOBAL_STOPPED (Tol=0)"], "var(--hb-err)")
        + path_arrow("M 220 48 L 258 48 L 258 96 L 295 96", "var(--hb-err)", "hbArrErr")
        + line_arrow(220, 120, 295, 120, "var(--hb-ok)", "hbArrOk")
        + path_arrow("M 220 192 L 258 192 L 258 144 L 295 144", "var(--hb-mut)", "hbArr")
        + line_arrow(515, 120, 575, 120, "var(--hb-err)", "hbArrErr")
    )
    return svg_wrap(800, 240, inner)


# 4.1 Trigger Condition
def diag_trigger_cond():
    inner = (
        box_ml(20, 26, 225, 92, "1. WdgM_MainFunction()", ["Mỗi 10ms kiểm tra GlobalStatus", "OK / FAILED / EXPIRED(ân hạn):", "-> Truyền Timeout = 20 ms"], "var(--hb-ok)")
        + box_ml(290, 26, 220, 92, "2. WdgIf_SetTriggerCondition", ["Nạp lại bộ đếm sống phần cứng", "CÒN 20 ms để đếm ngược", "(Chống reset khi chạy bình thường)"], "var(--hb-cyan)")
        + box_ml(555, 26, 225, 92, "3. Khi Global = STOPPED", ["Gọi TriggerCondition(Idx, 0)", "Ngừng nạp lại phần cứng", "-> Watchdog đếm về 0 & RESET!"], "var(--hb-err)")
        + line_arrow(245, 72, 290, 72, "var(--hb-ok)", "hbArrOk")
        + line_arrow(510, 72, 555, 72, "var(--hb-err)", "hbArrErr")
    )
    return svg_wrap(800, 144, inner)


# 4.2 Mode Switch
def diag_mode_switch():
    inner = (
        box_ml(20, 28, 215, 86, "SLOW_MODE (#0)", ["Pha Startup / NvM_ReadAll", "WdgIf Timeout = 50 ms", "SE_0, SE_1, SE_2 = ACTIVE"], "var(--hb-warn)")
        + box_ml(295, 28, 215, 86, "FAST_MODE (#1)", ["Pha RUN bình thường", "WdgIf Timeout = 20 ms", "SE_2 -> DEACTIVATED (0x04)"], "var(--hb-ok)", "var(--hb-card2)", "var(--hb-ok)")
        + box_ml(565, 28, 215, 86, "OFF_MODE (#2)", ["Bị CHẶN (DET 0x15) nếu", "WdgMDefensiveBehavior = TRUE", "Chỉ tắt khi Defensive = FALSE"], "var(--hb-err)")
        + line_arrow(235, 71, 295, 71, "var(--hb-ok)", "hbArrOk")
        + line_arrow(510, 71, 565, 71, "var(--hb-err)", "hbArrErr", dashed=True)
    )
    return svg_wrap(800, 140, inner)


# 4.3 Window Watchdog
def diag_window_wdg():
    inner = (
        box_ml(20, 26, 230, 88, "Closed Window [0 .. 5 ms]", ["Vùng CẤM kích xung sớm!", "Nếu Trigger trước 5 ms", "-> SBC kéo NRES Reset ngay!"], "var(--hb-err)")
        + box_ml(285, 26, 240, 88, "Open Window [5 .. 20 ms]", ["Vùng kích xung HỢP LỆ", "WdgM_MainFunction() (10 ms)", "gõ đúng vào giữa Open Window!"], "var(--hb-ok)", "var(--hb-card2)", "var(--hb-ok)")
        + box_ml(560, 26, 220, 88, "Timeout Expired (> 20 ms)", ["Quá hạn không thấy Trigger", "(VD khi vào STOPPED)", "-> SBC kéo NRES Reset!"], "var(--hb-err)")
        + line_arrow(250, 70, 285, 70, "var(--hb-ok)", "hbArrOk")
        + line_arrow(525, 70, 560, 70, "var(--hb-err)", "hbArrErr")
    )
    return svg_wrap(800, 138, inner)


# 5.1 FirstExpiredSEID RAM
def diag_first_exp_ram():
    inner = (
        box_ml(20, 28, 220, 86, "1. SE_0 Rơi Vào EXPIRED", ["Nếu FirstExpired chưa Latch:", "Chốt ngay SEID = 0", "Bỏ qua mọi SE chết sau đó!"], "var(--hb-err)")
        + box_ml(290, 28, 230, 86, "2. NO_INIT_RAM (2 Biến)", ["Lưu song song 2 ô nhớ:", "FirstExp = 0x00", "InvFirstExp = 0xFF (~0x00)"], "var(--hb-pur)")
        + box_ml(565, 28, 215, 86, "3. Đọc Sau Khi MCU Reset", ["WdgM_GetFirstExpiredSEID()", "Kiểm tra FirstExp == ~Inv", "Trả về thủ phạm gốc SEID=0!"], "var(--hb-ok)")
        + line_arrow(240, 71, 290, 71, "var(--hb-err)", "hbArrErr")
        + line_arrow(520, 71, 565, 71, "var(--hb-ok)", "hbArrOk")
    )
    return svg_wrap(800, 140, inner)


# 5.2 Partition Reset vs Immediate MCU Reset
def diag_part_reset():
    inner = (
        box_ml(20, 24, 360, 142, "Chiến Lược 1: OS Partition Reset", ["WdgMPartitionResetEnabled = TRUE", "-> BswM_WdgM_RequestPartitionReset(OsApp_Brake)", "-> OS khởi động lại riêng SE_0 về OK", "-> SE_1 (EngineTrq) vẫn chạy liên tục!"], "var(--hb-ok)")
        + box_ml(420, 24, 360, 142, "Chiến Lược 2: Global STOPPED & MCU Reset", ["WdgMPartitionResetEnabled = FALSE", "-> GlobalStatus: EXPIRED (ân hạn) -> STOPPED", "-> Cắt WdgIf(0) + Báo DEM WDGM_E_MONITORING", "-> WdgMImmediateReset=TRUE gọi Mcu_PerformReset()"], "var(--hb-err)")
    )
    return svg_wrap(800, 190, inner)


# 6.1 API Evolution
def diag_api_evolution():
    inner = (
        box_ml(20, 28, 225, 86, "AUTOSAR 3.x (Cũ / Đã Bỏ)", ["WdgM_UpdateAliveCounter(SE)", "Chỉ đếm được xung sống", "Không có Deadline / Logical"], "var(--hb-mut)")
        + box_ml(295, 28, 225, 86, "AUTOSAR 4.x / R20-11..R23-11", ["WdgM_CheckpointReached(SE,CP)", "Hợp nhất cả 3 thuật toán:", "Alive + Deadline + Logical!"], "var(--hb-pri)", "var(--hb-card2)", "var(--hb-pri)")
        + box_ml(565, 28, 215, 86, "DET (Mod 13) & DEM Reports", ["DET: 0x10..0x1F (SEDEACTIVATED)", "DEM: WDGM_E_MONITORING", "DEM: WDGM_E_SET_MODE"], "var(--hb-warn)")
        + line_arrow(245, 71, 295, 71, "var(--hb-pri)", "hbArr")
        + line_arrow(520, 71, 565, 71, "var(--hb-warn)", "hbArrWarn")
    )
    return svg_wrap(800, 140, inner)


DIAGRAMS = {
    "ecosystem": diag_ecosystem(),
    "layered_wdg": diag_layered_wdg(),
    "se_cp_map": diag_se_cp_map(),
    "io_flow": diag_io_flow(),
    "alive_algo": diag_alive_algo(),
    "deadline_algo": diag_deadline_algo(),
    "logical_internal": diag_logical_internal(),
    "logical_external": diag_logical_external(),
    "local_sm": diag_local_sm(),
    "tol_vs_zero": diag_tol_vs_zero(),
    "global_sm": diag_global_sm(),
    "aggregation": diag_aggregation(),
    "trigger_cond": diag_trigger_cond(),
    "mode_switch": diag_mode_switch(),
    "window_wdg": diag_window_wdg(),
    "first_exp_ram": diag_first_exp_ram(),
    "part_reset": diag_part_reset(),
    "api_evolution": diag_api_evolution()
}
