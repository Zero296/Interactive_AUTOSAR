# Helper to generate crisp, overlap-free, offline theme-aware inline SVG diagrams for EcuM Handbook

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
def diag_ecum_ecosystem():
    inner = (
        box_ml(20, 18, 215, 62, "Bootloader & Reset", ["main() -> EcuM_Init()", "BootTarget (No-Init RAM)"], "var(--hb-acc)")
        + box_ml(290, 18, 220, 62, "SWC / RTE / DCM", ["RequestRUN / POST_RUN", "SetRelAlarmClock()"], "var(--hb-warn)")
        + box_ml(565, 18, 215, 62, "BswM (Mode Manager)", ["BswM_Init(PbCfg)", "EcuM_GoDownHaltPoll()"], "var(--hb-ok)")

        + box_ml(20, 134, 195, 78, "AUTOSAR OS & SchM", ["StartOS / ShutdownOS", "EcuM_StartupTwo / MainFn"], "var(--hb-acc)")
        + box_ml(260, 128, 280, 90, "EcuM Core (SWS_EcuM)", ["StartPreOS & StartPostOS", "Wakeup Validation (4 States)", "GoHalt / GoPoll / OffPreOS"], "var(--hb-pri)", "var(--hb-card2)", "var(--hb-pri)")
        + box_ml(585, 134, 195, 78, "NvM & DET / ErrorHook", ["NvM_ReadAll / WriteAll", "Det_ReportError(Mod=10)"], "var(--hb-err)")

        + box_ml(20, 274, 225, 66, "ComM (Comm Manager)", ["ComM_EcuM_WakeUpInd()", "ComM_EcuM_PNCWakeUpInd()"], "var(--hb-cyan)")
        + box_ml(288, 274, 224, 66, "CanIf / CanTrcv / Icu", ["EcuM_SetWakeupEvent()", "EcuM_ValidateWakeupEvent()"], "var(--hb-pur)")
        + box_ml(555, 274, 225, 66, "Mcu, Gpt & WdgM", ["Mcu_GetResetReason()", "Mcu_SetMode(HALT/POLL)"], "var(--hb-ok)")

        + path_arrow("M 130 80 L 130 104 L 320 104 L 320 128", "var(--hb-acc)", "hbArr")
        + pill_label(185, 104, "StartPreOS", "var(--hb-acc)")

        + line_arrow(400, 80, 400, 128, "var(--hb-warn)", "hbArrWarn")
        + pill_label(400, 104, "RUN / Alarm", "var(--hb-warn)")

        + path_arrow("M 665 80 L 665 104 L 485 104 L 485 128", "var(--hb-ok)", "hbArrOk")
        + pill_label(605, 104, "Handover / GoDown", "var(--hb-ok)")

        + line_arrow(260, 173, 215, 173, "var(--hb-acc)", "hbArr")
        + line_arrow(540, 173, 585, 173, "var(--hb-err)", "hbArrErr")

        + path_arrow("M 315 218 L 315 246 L 132 246 L 132 274", "var(--hb-cyan)", "hbArrCyan")
        + pill_label(180, 246, "Validated Wakeup", "var(--hb-cyan)")

        + line_arrow(400, 274, 400, 218, "var(--hb-pur)", "hbArrPur")
        + pill_label(400, 246, "Wakeup Events", "var(--hb-pur)")

        + path_arrow("M 485 218 L 485 246 L 667 246 L 667 274", "var(--hb-ok)", "hbArrOk")
        + pill_label(610, 246, "Halt / Poll / Reset", "var(--hb-ok)")
    )
    return svg_wrap(800, 360, inner)


# 1.2 Flexible vs Fixed
def diag_flex_vs_fixed():
    inner = (
        box_ml(20, 20, 360, 205, "EcuM Fixed (AUTOSAR R3/R4 Cổ Điển)", [
            "1. EcuM tự giữ DriverInitTwo & DriverInitThree",
            "2. EcuM tự điều khiển cứng toàn bộ Mode:",
            "   STARTUP -> RUN -> POST_RUN -> PREP_SHUT",
            "3. Khó mở rộng logic rẽ nhánh theo dự án",
            "4. Ít phụ thuộc vào BswM"
        ], "var(--hb-warn)")
        + box_ml(420, 20, 360, 205, "EcuM Flexible (Chuẩn R20-11 / R23-11)", [
            "1. EcuM chỉ chạy DriverInitZero & InitOne",
            "2. StartPostOS gọi BswM_Init() bàn giao quyền",
            "3. BswM quyết định Init BSW, ComM & Shutdown",
            "4. Hỗ trợ tùy chọn RUN/POST_RUN Request",
            "5. Hỗ trợ GoDownHaltPoll() & Multi-Core"
        ], "var(--hb-ok)", "var(--hb-card2)", "var(--hb-ok)")
        + line_arrow(380, 122, 420, 122, "var(--hb-pri)", "hbArr")
    )
    return svg_wrap(800, 245, inner)


# 1.4 Handover Flow
def diag_handover_flow():
    inner = (
        box_ml(20, 40, 165, 95, "1. EcuM_Init()", ["StartPreOS", "DriverInitZero/One", "StartOS()"], "var(--hb-cyan)")
        + box_ml(220, 40, 170, 95, "2. OS & StartupTwo", ["OsTask_Init chạy", "SchM_Init()", "BswM_Init()"], "var(--hb-acc)")
        + box_ml(425, 40, 175, 95, "3. BswM Điều Phối", ["NvM_ReadAll()", "ComM_Init & Allow", "Rte_Start()"], "var(--hb-ok)")
        + box_ml(635, 40, 145, 95, "4. Pha UP / RUN", ["EcuM_SetState(RUN)", "RUN_REQ / BswM Rules"], "var(--hb-pri)")
        + line_arrow(185, 87, 220, 87, "var(--hb-cyan)", "hbArrCyan")
        + line_arrow(390, 87, 425, 87, "var(--hb-acc)", "hbArr")
        + line_arrow(600, 87, 635, 87, "var(--hb-ok)", "hbArrOk")
    )
    return svg_wrap(800, 175, inner)


# 2.1 StartPreOS Sequence
def diag_start_pre_os():
    inner = (
        box_ml(20, 25, 165, 76, "1. DriverInitZero", ["Pre-Compile only", "Det_Init()"], "var(--hb-acc)")
        + box_ml(220, 25, 175, 76, "2. DeterminePbCfg", ["Lấy EcuM_PBcfg", "So khớp Hash 32-bit"], "var(--hb-warn)")
        + box_ml(430, 25, 165, 76, "3. DriverInitOne", ["Mcu, Port, Dio", "Gpt, CanTrcv"], "var(--hb-cyan)")
        + box_ml(630, 25, 150, 76, "4. ResetReason", ["Mcu_GetResetReason", "Set Validated Bit"], "var(--hb-ok)")
        + box_ml(430, 145, 165, 76, "5. Default Target", ["SelectShutdownTarget", "LoopDetection()"], "var(--hb-pur)")
        + box_ml(220, 145, 175, 76, "6. Multi-Core & OS", ["StartCore(Slave)", "StartOS(AppMode)"], "var(--hb-pri)", "var(--hb-card2)", "var(--hb-pri)")
        + line_arrow(185, 63, 220, 63, "var(--hb-acc)", "hbArr")
        + line_arrow(395, 63, 430, 63, "var(--hb-warn)", "hbArrWarn")
        + line_arrow(595, 63, 630, 63, "var(--hb-cyan)", "hbArrCyan")
        + path_arrow("M 705 101 L 705 183 L 595 183", "var(--hb-ok)", "hbArrOk")
        + line_arrow(430, 183, 395, 183, "var(--hb-pur)", "hbArrPur")
    )
    return svg_wrap(800, 245, inner)


# 2.2 PB Hash Check
def diag_pb_hash_check():
    inner = (
        box_ml(25, 75, 195, 82, "EcuM_DeterminePbConfig", ["Đọc con trỏ EcuM_PBcfg", "từ Flash Post-Build"], "var(--hb-pri)")
        + box_ml(280, 65, 210, 102, "So Khớp Hash 32-Bit", ["PreCompile Hash (0x5A3C9F01)", "vs", "PB Config Hash"], "var(--hb-warn)", "var(--hb-card2)")
        + box_ml(550, 25, 225, 72, "KHỚP (Match == TRUE)", ["Tiếp tục DriverInitOne", "-> StartCore() -> StartOS()"], "var(--hb-ok)")
        + box_ml(550, 138, 225, 72, "LỆCH (Mismatch!)", ["Gọi EcuM_ErrorHook()", "CHẶN StartOS() An Toàn!"], "var(--hb-err)")
        + line_arrow(220, 116, 280, 116, "var(--hb-pri)", "hbArr")
        + path_arrow("M 490 95 L 520 95 L 520 61 L 550 61", "var(--hb-ok)", "hbArrOk")
        + pill_label(520, 42, "OK", "var(--hb-ok)")
        + path_arrow("M 490 138 L 520 138 L 520 174 L 550 174", "var(--hb-err)", "hbArrErr")
        + pill_label(520, 194, "FAIL", "var(--hb-err)")
    )
    return svg_wrap(800, 232, inner)


# 2.3 StartPostOS
def diag_start_post_os():
    inner = (
        box_ml(20, 45, 165, 86, "StartOS(AppMode)", ["OS bật lập lịch", "Autostart OsTask_Init"], "var(--hb-acc)")
        + box_ml(220, 45, 175, 86, "EcuM_StartupTwo()", ["Gọi SchM_Init()", "Bật Task chu kỳ 10ms"], "var(--hb-cyan)")
        + box_ml(430, 45, 170, 86, "BswM_Init(PbCfg)", ["Bàn giao cho BswM", "NvM_ReadAll() / ComM"], "var(--hb-ok)")
        + box_ml(635, 45, 145, 86, "Rte_Start()", ["Bật Runnable SWC", "ECU vào pha RUN"], "var(--hb-pri)")
        + line_arrow(185, 88, 220, 88, "var(--hb-acc)", "hbArr")
        + line_arrow(395, 88, 430, 88, "var(--hb-cyan)", "hbArrCyan")
        + line_arrow(600, 88, 635, 88, "var(--hb-ok)", "hbArrOk")
    )
    return svg_wrap(800, 175, inner)


# 3.1 RUN & POST_RUN
def diag_run_postrun():
    inner = (
        box_ml(15, 42, 210, 92, "ECUM_STATE_APP_RUN", ["EcuM_RequestRUN(User) > 0", "HOẶC RunMinimumDuration > 0", "(Bit 4 Thanh A = 1)"], "var(--hb-ok)")
        + box_ml(315, 42, 210, 92, "ECUM_STATE_APP_POST_RUN", ["Mọi RUN đã Release", "Còn RequestPOST_RUN > 0", "(Bit 3 Thanh A = 1)"], "var(--hb-warn)")
        + box_ml(605, 42, 180, 92, "PREP_SHUTDOWN", ["Mọi POST_RUN đã Release", "Đợi NvM_WriteAll()", "-> GoDownHaltPoll()"], "var(--hb-pur)")
        + line_arrow(225, 78, 315, 78, "var(--hb-warn)", "hbArrWarn")
        + pill_label(270, 56, "ReleaseRUN", "var(--hb-warn)")
        + path_arrow("M 420 134 L 420 162 L 120 162 L 120 134", "var(--hb-ok)", "hbArrOk", dashed=True)
        + pill_label(270, 162, "New RequestRUN", "var(--hb-ok)")
        + line_arrow(525, 88, 605, 88, "var(--hb-pur)", "hbArrPur")
        + pill_label(565, 66, "Rel Post", "var(--hb-pur)")
    )
    return svg_wrap(800, 188, inner)


# 3.2 Shutdown Sequence
def diag_shutdown_seq():
    inner = (
        box_ml(20, 30, 175, 82, "1. GoDownHaltPoll()", ["BswM gọi khi NvM xong", "Target = OFF / RESET"], "var(--hb-warn)")
        + box_ml(230, 30, 180, 82, "2. Shutdown PreOS", ["BswM_Deinit()", "SchM_Deinit()", "Multi-Core Sync"], "var(--hb-pur)")
        + box_ml(445, 30, 150, 82, "3. ShutdownOS()", ["Dừng toàn bộ OS", "Vào ShutdownHook"], "var(--hb-err)")
        + box_ml(630, 30, 150, 82, "4. EcuM_OnGoOffOne", ["Thông báo sắp tắt", "Đóng driver cuối"], "var(--hb-acc)")
        + box_ml(445, 150, 165, 78, "5. DriverDeInit & Two", ["EcuM_AL_DriverDeInit", "EcuM_OnGoOffTwo()"], "var(--hb-cyan)")
        + box_ml(175, 150, 225, 78, "6. SwitchOff / AL_Reset", ["OFF -> Ngắt nguồn Power Latch", "RESET -> Mcu_PerformReset()"], "var(--hb-err)", "var(--hb-card2)")
        + line_arrow(195, 71, 230, 71, "var(--hb-warn)", "hbArrWarn")
        + line_arrow(410, 71, 445, 71, "var(--hb-pur)", "hbArrPur")
        + line_arrow(595, 71, 630, 71, "var(--hb-err)", "hbArrErr")
        + path_arrow("M 705 112 L 705 189 L 610 189", "var(--hb-acc)", "hbArr")
        + line_arrow(445, 189, 400, 189, "var(--hb-cyan)", "hbArrCyan")
    )
    return svg_wrap(800, 252, inner)


# 3.4 Boot Target
def diag_boot_target():
    inner = (
        box_ml(20, 50, 210, 88, "DCM / SWC (UDS 0x10 02)", ["EcuM_SelectBootTarget(", "  OEM_BOOTLOADER)", "EcuM_SelectShutdownTarget"], "var(--hb-warn)")
        + box_ml(285, 50, 200, 88, "No-Init RAM & Reset", ["Lưu Magic 0xB007L0AD", "EcuM_AL_Reset(MCU)", "Mcu_PerformReset()"], "var(--hb-pur)")
        + box_ml(545, 18, 235, 68, "Bootloader Startup Check", ["Nếu Magic == OEM_BOOTLOADER", "-> Giữ ở Flash Bootloader (FBL)"], "var(--hb-cyan)")
        + box_ml(545, 114, 235, 68, "Normal Application", ["Nếu Magic == APP", "-> Nhảy vào main() -> EcuM_Init()"], "var(--hb-ok)")
        + line_arrow(230, 94, 285, 94, "var(--hb-warn)", "hbArrWarn")
        + path_arrow("M 485 78 L 515 78 L 515 52 L 545 52", "var(--hb-cyan)", "hbArrCyan")
        + path_arrow("M 485 110 L 515 110 L 515 148 L 545 148", "var(--hb-ok)", "hbArrOk")
    )
    return svg_wrap(800, 205, inner)


# 4.1 & 4.2 GoHalt & RAM Hash
def diag_go_halt():
    inner = (
        box_ml(20, 25, 170, 74, "1. EnableWakeup", ["EnableWakeupSources()", "Mở ngắt CAN/KL15"], "var(--hb-cyan)")
        + box_ml(225, 25, 175, 74, "2. GenerateRamHash", ["Tính checksum RAM", "Hash = 0xA55A"], "var(--hb-warn)")
        + box_ml(435, 25, 165, 74, "3. Mcu_SetMode(HALT)", ["Dừng CPU Clock", "Giữ nguồn RAM"], "var(--hb-pur)", "var(--hb-card2)")
        + box_ml(635, 25, 145, 74, "4. Wakeup IRQ", ["SetWakeupEvent()", "Tỉnh dậy -> NORMAL"], "var(--hb-ok)")
        + box_ml(435, 140, 175, 74, "5. CheckRamHash()", ["== 1: Toàn vẹn OK", "== 0: ErrorHook()!"], "var(--hb-err)")
        + box_ml(185, 140, 205, 74, "6. DriverRestart()", ["DisableWakeupSources", "Quay lại pha UP"], "var(--hb-ok)")
        + line_arrow(190, 62, 225, 62, "var(--hb-cyan)", "hbArrCyan")
        + line_arrow(400, 62, 435, 62, "var(--hb-warn)", "hbArrWarn")
        + line_arrow(600, 62, 635, 62, "var(--hb-pur)", "hbArrPur")
        + path_arrow("M 707 99 L 707 177 L 610 177", "var(--hb-ok)", "hbArrOk")
        + line_arrow(435, 177, 390, 177, "var(--hb-err)", "hbArrErr")
    )
    return svg_wrap(800, 238, inner)


# 4.3 GoPoll
def diag_go_poll():
    inner = (
        box_ml(25, 45, 190, 86, "1. Mcu_SetMode(POLL)", ["EcuMSleepModeSuspend=0", "Giảm xung nhịp CPU", "(Không dừng hoàn toàn)"], "var(--hb-pur)")
        + box_ml(275, 45, 230, 86, "2. Vòng Lặp Thăm Dò", ["EcuM_SleepActivity()", "EcuM_CheckWakeup(src)", "Kiểm tra ngoại vi không IRQ"], "var(--hb-warn)", "var(--hb-card2)")
        + box_ml(565, 45, 210, 86, "3. Phát Hiện Wakeup", ["SetWakeupEvent(LIN1)", "Thoát GoPoll", "-> EcuM_AL_DriverRestart()"], "var(--hb-ok)")
        + line_arrow(215, 88, 275, 88, "var(--hb-pur)", "hbArrPur")
        + line_arrow(505, 88, 565, 88, "var(--hb-ok)", "hbArrOk")
        + path_arrow("M 390 131 L 390 156 L 340 156 L 340 131", "var(--hb-warn)", "hbArrWarn", dashed=True)
        + pill_label(450, 156, "Lặp cho tới khi có Wakeup", "var(--hb-warn)")
    )
    return svg_wrap(800, 185, inner)


# 4.4 Alarm Clock
def diag_alarm_clock():
    inner = (
        box_ml(20, 22, 200, 56, "User 0 (SWC_BMS)", ["SetRelAlarmClock(0, 600ms)"], "var(--hb-acc)")
        + box_ml(20, 96, 200, 56, "User 1 (SWC_Telematics)", ["SetRelAlarmClock(1, 300ms)"], "var(--hb-cyan)")
        + box_ml(290, 42, 210, 90, "EcuMMasterAlarm Arbiter", ["Chọn mốc sớm nhất:", "min(600ms, 300ms) = 300ms", "Cài đặt Gpt_EnableWakeup()"], "var(--hb-warn)", "var(--hb-card2)")
        + box_ml(565, 42, 215, 90, "Auto Wakeup Tại t=300ms", ["Gpt chạm 0 ms trong SLEEP", "-> SetWakeupEvent(INT_WDG)", "-> Đánh thức toàn bộ ECU"], "var(--hb-ok)")
        + path_arrow("M 220 50 L 255 50 L 255 75 L 290 75", "var(--hb-acc)", "hbArr")
        + path_arrow("M 220 124 L 255 124 L 255 100 L 290 100", "var(--hb-cyan)", "hbArrCyan")
        + line_arrow(500, 87, 565, 87, "var(--hb-ok)", "hbArrOk")
    )
    return svg_wrap(800, 175, inner)


# 5.1 Wakeup Bitmask
def diag_wkup_bitmask():
    inner = (
        box_ml(20, 25, 365, 130, "Bit 0..4: 5 Nguồn Chuẩn AUTOSAR (Timeout = 0)", [
            "Bit 0 (0x01): ECUM_WKSOURCE_POWER",
            "Bit 1 (0x02): ECUM_WKSOURCE_RESET",
            "Bit 2 (0x04): ECUM_WKSOURCE_INTERNAL_RESET",
            "Bit 3 (0x08): ECUM_WKSOURCE_INTERNAL_WDG",
            "Bit 4 (0x10): ECUM_WKSOURCE_EXTERNAL_WDG"
        ], "var(--hb-ok)")
        + box_ml(415, 25, 365, 130, "Bit 5..7+: Nguồn Ngoại Vi Cấu Hình (Timeout >= 0)", [
            "Bit 5 (0x20): CAN_CH0_RX (Timeout = 500ms)",
            "Bit 6 (0x40): LIN_CH1_RX (Timeout = 300ms)",
            "Bit 7 (0x80): KL15_IGNITION (Timeout = 0ms)",
            "Ánh xạ: Pending / Validated / Expired Mask",
            "API: EcuM_GetPending / Validated / Expired()"
        ], "var(--hb-cyan)")
    )
    return svg_wrap(800, 180, inner)


# 5.2 Wakeup Validation SM
def diag_wkup_sm():
    inner = (
        box_ml(25, 78, 165, 82, "ECUM_WKSTATUS_NONE", ["Pending=0, Val=0", "ClearWakeupEvent()"], "var(--hb-pri)")
        + box_ml(285, 78, 195, 82, "ECUM_WKSTATUS_PENDING", ["Timeout > 0 ms", "StartWakeupSources()", "Đang đếm ValidationTmr"], "var(--hb-warn)", "var(--hb-card2)")
        + box_ml(565, 22, 210, 72, "ECUM_WKSTATUS_VALIDATED", ["ValidateWakeupEvent()", "Hoặc Timeout == 0 ms", "-> Báo BswM & ComM"], "var(--hb-ok)")
        + box_ml(565, 145, 210, 72, "ECUM_WKSTATUS_EXPIRED", ["ValidationTmr == 0!", "StopWakeupSources()", "-> Ngủ lại (Glitch)"], "var(--hb-err)")
        + line_arrow(190, 119, 285, 119, "var(--hb-warn)", "hbArrWarn")
        + pill_label(237, 94, "SetWakeup", "var(--hb-warn)")
        + path_arrow("M 480 100 L 522 100 L 522 58 L 565 58", "var(--hb-ok)", "hbArrOk")
        + pill_label(522, 36, "Frame OK", "var(--hb-ok)")
        + path_arrow("M 480 138 L 522 138 L 522 181 L 565 181", "var(--hb-err)", "hbArrErr")
        + pill_label(522, 204, "Timeout", "var(--hb-err)")
        + path_arrow("M 107 78 L 107 40 L 565 40", "var(--hb-ok)", "hbArrOk", dashed=True)
        + pill_label(335, 22, "SetWakeupEvent (Khi Timeout == 0 ms)", "var(--hb-ok)")
    )
    return svg_wrap(800, 240, inner)


# 5.3 Glitch Filter Sequence
def diag_glitch_filter():
    inner = (
        box_ml(20, 22, 165, 64, "CanTrcv / Icu IRQ", ["Phát hiện xung bus", "SetWakeupEvent(0x20)"], "var(--hb-warn)")
        + box_ml(225, 22, 185, 64, "EcuM Validation Loop", ["StartWakeupSources()", "Đợi CanIf 500 ms"], "var(--hb-pri)")
        + box_ml(455, 22, 155, 64, "CanIf Rx Check", ["Kiểm tra Frame CAN", "Validate hoặc Im lặng"], "var(--hb-cyan)")
        + box_ml(645, 22, 135, 64, "ComM / BswM", ["Chỉ đánh thức nếu", "VALIDATED!"], "var(--hb-ok)")

        + box_ml(20, 125, 360, 74, "Trường Hợp A: Có CAN Frame Hợp Lệ (< 500ms)", [
            "CanIf_RxIndication() -> EcuM_ValidateWakeupEvent(0x20)",
            "-> Gọi ComM_EcuM_WakeUpIndication(Ch0) khởi động mạng!"
        ], "var(--hb-ok)")
        + box_ml(420, 125, 360, 74, "Trường Hợp B: Nhiễu Glitch (500ms Không Có Frame)", [
            "EcuMValidationTimeout == 0 -> ExpiredWakeupEvents = 0x20",
            "-> EcuM_StopWakeupSources() -> Tự động ngủ lại!"
        ], "var(--hb-err)")

        + line_arrow(185, 54, 225, 54, "var(--hb-warn)", "hbArrWarn")
        + line_arrow(410, 54, 455, 54, "var(--hb-pri)", "hbArr")
        + line_arrow(610, 54, 645, 54, "var(--hb-ok)", "hbArrOk")
    )
    return svg_wrap(800, 222, inner)


# 5.4 PNC Wakeup
def diag_pnc_wakeup():
    inner = (
        box_ml(20, 42, 185, 86, "CanTrcv Selective Wake", ["Giải mã khung WUF", "Khớp bộ lọc PNC #16", "-> SetWakeupEvent(CAN0)"], "var(--hb-cyan)")
        + box_ml(255, 42, 235, 86, "EcuM Validation & Mapping", ["ValidateWakeupEvent(0x20)", "Kiểm tra EcuMComMPNCRef:", "Mapped tới PNC #16"], "var(--hb-pri)", "var(--hb-card2)")
        + box_ml(545, 42, 235, 86, "ComM Partial Network", ["ComM_EcuM_PNCWakeUpInd(16)", "Chỉ bật cụm PNC #16 vào", "COMM_PNC_PREPARE_SLEEP"], "var(--hb-ok)")
        + line_arrow(205, 85, 255, 85, "var(--hb-cyan)", "hbArrCyan")
        + line_arrow(490, 85, 545, 85, "var(--hb-ok)", "hbArrOk")
    )
    return svg_wrap(800, 165, inner)


# 6.1 Multi-Core
def diag_multicore():
    inner = (
        box_ml(20, 22, 230, 86, "Master Core (Core 0)", [
            "1. DriverInitZero & InitOne",
            "2. StartCore(OS_CORE_ID_1)",
            "3. StartOS() & BswM_Init()"
        ], "var(--hb-pri)", "var(--hb-card2)", "var(--hb-pri)")
        + box_ml(20, 145, 230, 86, "Slave Core (Core 1)", [
            "1. Chờ Master gọi StartCore",
            "2. StartOS() & StartupTwo()",
            "3. Chạy Task riêng Core 1"
        ], "var(--hb-cyan)")
        + box_ml(320, 62, 225, 128, "CoordinateShutdown Barrier", [
            "Rào Chắn Đồng Bộ Đa Nhân",
            "(Spinlock / Shared Flag)",
            "Core 0 CHỜ đến khi Core 1",
            "hoàn tất GoDownHaltPoll()"
        ], "var(--hb-warn)", "var(--hb-card2)")
        + box_ml(600, 62, 180, 128, "Halt / SwitchOff", [
            "Chỉ khi mọi Core OK:",
            "• GenerateRamHash()",
            "• Mcu_SetMode(HALT)",
            "• Hoặc AL_SwitchOff()"
        ], "var(--hb-ok)")
        + path_arrow("M 250 65 L 285 65 L 285 105 L 320 105", "var(--hb-pri)", "hbArr")
        + path_arrow("M 250 188 L 285 188 L 285 148 L 320 148", "var(--hb-cyan)", "hbArrCyan")
        + line_arrow(545, 126, 600, 126, "var(--hb-ok)", "hbArrOk")
    )
    return svg_wrap(800, 252, inner)


# 6.4 Debug Decision Tree
def diag_debug_tree():
    inner = (
        box_ml(20, 20, 225, 62, "Triệu Chứng Lỗi Thực Tế", ["Chọn nhánh sự cố EcuM", "cần truy vết trên target"], "var(--hb-err)", "var(--hb-card2)")
        + box_ml(300, 15, 480, 48, "1. Không vào được StartOS() -> Bị treo ở EcuM_ErrorHook", ["Kiểm tra ConfigConsistencyHash (PreCompile vs PB) & Stack StartPreOS"], "var(--hb-warn)")
        + box_ml(300, 76, 480, 48, "2. ECU tự thức dậy liên tục khi đỗ xe -> Cạn ắc-quy", ["Kiểm tra WakeupMask & ExpiredWakeupEvents xem có Glitch hay ComM User Leak"], "var(--hb-cyan)")
        + box_ml(300, 137, 480, 48, "3. Gọi GoDownHaltPoll nhưng ECU không chịu ngủ / tắt", ["Kiểm tra RunRequest/PostRun chưa nhả, NvM_WriteAll bận, hoặc SlaveCore1 Busy"], "var(--hb-pur)")
        + box_ml(300, 198, 480, 48, "4. Tỉnh dậy từ GoHalt bị Reset ngay (RAM Check Failed)", ["Kiểm tra vùng bảo vệ RamHash có bị DMA/No-Init ghi đè hoặc mất nguồn giữ RAM"], "var(--hb-err)")
        + path_arrow("M 245 51 L 272 51 L 272 39 L 300 39", "var(--hb-warn)", "hbArrWarn")
        + path_arrow("M 245 51 L 272 51 L 272 100 L 300 100", "var(--hb-cyan)", "hbArrCyan")
        + path_arrow("M 245 51 L 272 51 L 272 161 L 300 161", "var(--hb-pur)", "hbArrPur")
        + path_arrow("M 245 51 L 272 51 L 272 222 L 300 222", "var(--hb-err)", "hbArrErr")
    )
    return svg_wrap(800, 265, inner)


DIAGRAMS = {
    "ecosystem": diag_ecum_ecosystem(),
    "flex_vs_fixed": diag_flex_vs_fixed(),
    "handover_flow": diag_handover_flow(),
    "start_pre_os": diag_start_pre_os(),
    "pb_hash_check": diag_pb_hash_check(),
    "start_post_os": diag_start_post_os(),
    "run_postrun": diag_run_postrun(),
    "shutdown_seq": diag_shutdown_seq(),
    "boot_target": diag_boot_target(),
    "go_halt": diag_go_halt(),
    "go_poll": diag_go_poll(),
    "alarm_clock": diag_alarm_clock(),
    "wkup_bitmask": diag_wkup_bitmask(),
    "wkup_sm": diag_wkup_sm(),
    "glitch_filter": diag_glitch_filter(),
    "pnc_wakeup": diag_pnc_wakeup(),
    "multicore": diag_multicore(),
    "debug_tree": diag_debug_tree(),
}
