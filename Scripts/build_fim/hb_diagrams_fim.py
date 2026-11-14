"""Inline theme-aware SVG diagrams for the AUTOSAR FiM (Function Inhibition Manager) Handbook."""

import html


def svg_wrap(vb_w: int, vb_h: int, body: str) -> str:
    return (
        f'<svg class="hb-svg" viewBox="0 0 {vb_w} {vb_h}" width="100%" '
        f'xmlns="http://www.w3.org/2000/svg">'
        f'<defs>'
        f'<marker id="ah-pri" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">'
        f'<polygon points="0 0, 8 3, 0 6" fill="var(--hb-pri)"/></marker>'
        f'<marker id="ah-ok" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">'
        f'<polygon points="0 0, 8 3, 0 6" fill="var(--hb-ok)"/></marker>'
        f'<marker id="ah-warn" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">'
        f'<polygon points="0 0, 8 3, 0 6" fill="var(--hb-warn)"/></marker>'
        f'<marker id="ah-err" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">'
        f'<polygon points="0 0, 8 3, 0 6" fill="var(--hb-err)"/></marker>'
        f'<marker id="ah-pur" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">'
        f'<polygon points="0 0, 8 3, 0 6" fill="var(--hb-pur)"/></marker>'
        f'<marker id="ah-cyan" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">'
        f'<polygon points="0 0, 8 3, 0 6" fill="var(--hb-cyan)"/></marker>'
        f'<marker id="ah-mut" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">'
        f'<polygon points="0 0, 8 3, 0 6" fill="var(--hb-mut)"/></marker>'
        f'</defs>'
        f'<rect x="0" y="0" width="{vb_w}" height="{vb_h}" rx="10" fill="var(--hb-bg)" stroke="var(--hb-bdr)" stroke-width="1"/>'
        f'{body}'
        f'</svg>'
    )


def box_ml(x: int, y: int, w: int, h: int, title: str, lines: list[str],
           stroke: str = "var(--hb-pri)", fill: str = "var(--hb-card)",
           title_fill: str = "var(--hb-txt)", sub_fill: str = "var(--hb-mut)",
           rx: int = 8, sw: float = 1.6, title_fs: int = 11, sub_fs: int = 10) -> str:
    title_esc = html.escape(title)
    parts = [
        f'<rect class="svg-box" data-box-w="{w}" x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" '
        f'fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>'
    ]
    total_lines = 1 + len(lines)
    line_step = 14 if total_lines <= 3 else 13
    start_y = y + (h - (total_lines - 1) * line_step) / 2 + 3.5
    parts.append(
        f'<text x="{x + w / 2:.1f}" y="{start_y:.1f}" text-anchor="middle" '
        f'fill="{title_fill}" font-size="{title_fs}" font-weight="700" font-family="sans-serif">{title_esc}</text>'
    )
    for idx, ln in enumerate(lines, start=1):
        ln_esc = html.escape(ln)
        parts.append(
            f'<text x="{x + w / 2:.1f}" y="{start_y + idx * line_step:.1f}" text-anchor="middle" '
            f'fill="{sub_fill}" font-size="{sub_fs}" font-family="Consolas, monospace">{ln_esc}</text>'
        )
    return "".join(parts)


def pill_label(cx: float, cy: float, text: str, stroke: str = "var(--hb-pri)",
               fill: str = "var(--hb-card2)", txt_fill: str = "var(--hb-txt)", fs: int = 9.5) -> str:
    w = max(56, int(len(text) * (fs * 0.62) + 14))
    h = 18
    x = cx - w / 2
    y = cy - h / 2
    esc = html.escape(text)
    return (
        f'<g class="svg-pill">'
        f'<rect x="{x:.1f}" y="{y:.1f}" width="{w}" height="{h}" rx="9" fill="{fill}" stroke="{stroke}" stroke-width="1"/>'
        f'<text x="{cx:.1f}" y="{cy + 3.2:.1f}" text-anchor="middle" fill="{txt_fill}" font-size="{fs}" font-weight="700" font-family="Consolas, monospace">{esc}</text>'
        f'</g>'
    )


def line_arrow(x1: float, y1: float, x2: float, y2: float, stroke: str = "var(--hb-pri)",
               marker: str = "ah-pri", dashed: bool = False, sw: float = 1.6) -> str:
    dash = ' stroke-dasharray="5,4"' if dashed else ""
    return (
        f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" '
        f'stroke="{stroke}" stroke-width="{sw}"{dash} marker-end="url(#{marker})"/>'
    )


def path_arrow(d: str, stroke: str = "var(--hb-pri)", marker: str = "ah-pri",
               dashed: bool = False, sw: float = 1.6) -> str:
    dash = ' stroke-dasharray="5,4"' if dashed else ""
    return (
        f'<path d="{d}" fill="none" stroke="{stroke}" stroke-width="{sw}"{dash} '
        f'marker-end="url(#{marker})"/>'
    )


def text_lbl(x: float, y: float, txt: str, fill: str = "var(--hb-mut)", fs: int = 10,
             anchor: str = "middle", bold: bool = False, mono: bool = False) -> str:
    fw = ' font-weight="700"' if bold else ""
    ff = 'Consolas, monospace' if mono else 'sans-serif'
    return (
        f'<text x="{x:.1f}" y="{y:.1f}" text-anchor="{anchor}" fill="{fill}" '
        f'font-size="{fs}"{fw} font-family="{ff}">{html.escape(txt)}</text>'
    )


# ---------------------------------------------------------------------------
# 18 Inline SVG Diagrams for AUTOSAR FiM Handbook
# ---------------------------------------------------------------------------

def diag_decoupling() -> str:
    body = [
        text_lbl(360, 22, "Decoupling Architecture: Why SW-C Queries FiM Instead of Dem", "var(--hb-txt)", 12, bold=True),
        # Left side: Tight Coupling Anti-pattern
        '<rect x="18" y="34" width="286" height="196" rx="8" fill="none" stroke="var(--hb-err)" stroke-dasharray="5,4" stroke-width="1.2"/>',
        text_lbl(161, 52, "Tight Coupling (Without FiM)", "var(--hb-err)", 10.5, bold=True),
        box_ml(30, 64, 118, 52, "SW-C Control", ["Reads 12 EventIds", "Hardcoded masks"], stroke="var(--hb-err)"),
        box_ml(176, 64, 114, 52, "Dem Events", ["Evt_01..Evt_12", "Cal changes break"], stroke="var(--hb-warn)"),
        line_arrow(176, 90, 148, 90, "var(--hb-err)", "ah-err", sw=1.5),
        box_ml(38, 134, 244, 80, "Maintenance Problem", [
            "Every DTC remap forces C recompile",
            "App logic polluted with UDS bits",
            "No central availability override"
        ], stroke="var(--hb-err)", fill="var(--hb-card2)"),

        # Right side: AUTOSAR FiM Decoupled
        '<rect x="320" y="34" width="382" height="196" rx="8" fill="none" stroke="var(--hb-ok)" stroke-width="1.4"/>',
        text_lbl(511, 52, "AUTOSAR FiM Decoupled Pattern (SWS_FiM)", "var(--hb-ok)", 10.5, bold=True),
        box_ml(332, 66, 112, 62, "SW-C Function", ["FuelInjection()", "Checks 1 FID only"], stroke="var(--hb-ok)"),
        box_ml(470, 66, 96, 62, "FiM", ["Many-to-Many", "Bitwise Engine"], stroke="var(--hb-pri)"),
        box_ml(592, 66, 98, 62, "Dem", ["UDS 8-bit Byte", "Push / Poll"], stroke="var(--hb-warn)"),
        line_arrow(444, 84, 470, 84, "var(--hb-pri)", "ah-pri"),
        line_arrow(470, 110, 444, 110, "var(--hb-ok)", "ah-ok"),
        line_arrow(592, 97, 566, 97, "var(--hb-warn)", "ah-warn"),
        pill_label(511, 146, "FiM_GetFunctionPermission(FID_0) -> TRUE/FALSE", "var(--hb-ok)"),
        box_ml(336, 166, 350, 50, "Calibration Freedom", [
            "SW-C unchanged when new fault EventIds are added in ECUC",
            "Dem changes UDS byte -> FiM evaluates masks -> FID boolean"
        ], stroke="var(--hb-cyan)", fill="var(--hb-card2)")
    ]
    return svg_wrap(720, 244, "".join(body))


def diag_init_seq() -> str:
    body = [
        text_lbl(360, 22, "2-Phase Cold-Start Initialization Sequence (EcuM -> FiM -> Dem -> SW-C)", "var(--hb-txt)", 12, bold=True),
        # Lifelines
        box_ml(26, 34, 108, 34, "EcuM / BswM", ["Boot Master"], stroke="var(--hb-cyan)"),
        box_ml(198, 34, 110, 34, "FiM Module", ["State Machine"], stroke="var(--hb-pri)"),
        box_ml(372, 34, 110, 34, "Dem Module", ["Event Memory"], stroke="var(--hb-warn)"),
        box_ml(546, 34, 142, 34, "SW-C / RTE", ["FID Consumers"], stroke="var(--hb-ok)"),

        '<line x1="80" y1="68" x2="80" y2="250" stroke="var(--hb-bdr)" stroke-dasharray="4,3" stroke-width="1.5"/>',
        '<line x1="253" y1="68" x2="253" y2="250" stroke="var(--hb-bdr)" stroke-dasharray="4,3" stroke-width="1.5"/>',
        '<line x1="427" y1="68" x2="427" y2="250" stroke="var(--hb-bdr)" stroke-dasharray="4,3" stroke-width="1.5"/>',
        '<line x1="617" y1="68" x2="617" y2="250" stroke="var(--hb-bdr)" stroke-dasharray="4,3" stroke-width="1.5"/>',

        # Step 1
        line_arrow(80, 92, 253, 92, "var(--hb-pri)", "ah-pri"),
        pill_label(166, 82, "1. FiM_Init(Cfg)", "var(--hb-pri)"),
        pill_label(340, 98, "FIM_INITIALIZED_NO_DEM", "var(--hb-warn)"),

        # Step 2: Early query while Dem uninit -> Safe Default FALSE
        line_arrow(617, 128, 253, 128, "var(--hb-err)", "ah-err", dashed=True),
        pill_label(435, 118, "2. Early GetPerm -> FALSE (Safe Default)", "var(--hb-err)"),

        # Step 3
        line_arrow(80, 158, 427, 158, "var(--hb-warn)", "ah-warn"),
        pill_label(166, 148, "3. Dem_Init()", "var(--hb-warn)"),

        # Step 4
        line_arrow(427, 192, 253, 192, "var(--hb-ok)", "ah-ok"),
        pill_label(340, 182, "4. FiM_DemInit()", "var(--hb-ok)"),
        pill_label(155, 206, "FIM_INITIALIZED", "var(--hb-ok)"),

        # Step 5
        line_arrow(617, 232, 253, 232, "var(--hb-ok)", "ah-ok"),
        pill_label(435, 224, "5. FiM_GetFunctionPermission -> E_OK", "var(--hb-ok)")
    ]
    return svg_wrap(720, 266, "".join(body))


def diag_io_map() -> str:
    body = [
        text_lbl(360, 22, "8-Module FiM Ecosystem: Inputs, Core Engine, and Routed Outputs", "var(--hb-txt)", 12, bold=True),
        # Left inputs
        box_ml(20, 42, 164, 46, "EcuM / BswM", ["FiM_Init / MainFn", "20ms OS Task"], stroke="var(--hb-cyan)"),
        box_ml(20, 102, 164, 48, "Dem (Event Status)", ["Dem_SetEventStatus", "UDS Byte (0x00..FF)"], stroke="var(--hb-warn)"),
        box_ml(20, 164, 164, 46, "Dcm (UDS 0x14)", ["Dem_ClearDTC", "Reset to 0x50"], stroke="var(--hb-pur)"),
        box_ml(20, 224, 164, 46, "ECUC Calibration", ["FiM_ConfigType", "Masks & Summary"], stroke="var(--hb-mut)"),

        # Center Core
        box_ml(252, 76, 214, 154, "FiM Core Engine", [
            "1. Matrix: InhCfg0..3 -> FID",
            "2. Check (UDS & Mask) == Pat",
            "3. Push / Polling Sync",
            "4. AvailGate && !ANY(Inh)",
            "5. DET Guard Checks"
        ], stroke="var(--hb-pri)", fill="var(--hb-card2)", sw=2.0),

        # Right outputs
        box_ml(536, 48, 164, 54, "SW-C / RTE", ["GetFunctionPermission", "Control Actuators"], stroke="var(--hb-ok)"),
        box_ml(536, 124, 164, 54, "FID Permissions", ["FID_0, FID_1, FID_2", "Availability Latch"], stroke="var(--hb-ok)"),
        box_ml(536, 200, 164, 54, "Det (Error Tracer)", ["Dem_ReportError", "0x01 .. 0x05"], stroke="var(--hb-err)"),

        # Arrows Left -> Center
        line_arrow(184, 65, 252, 98, "var(--hb-cyan)", "ah-cyan"),
        line_arrow(184, 126, 252, 134, "var(--hb-warn)", "ah-warn"),
        line_arrow(184, 187, 252, 174, "var(--hb-pur)", "ah-pur"),
        line_arrow(184, 247, 252, 204, "var(--hb-mut)", "ah-mut"),

        # Arrows Center -> Right
        line_arrow(466, 108, 536, 75, "var(--hb-ok)", "ah-ok"),
        line_arrow(466, 153, 536, 151, "var(--hb-ok)", "ah-ok"),
        line_arrow(466, 198, 536, 227, "var(--hb-err)", "ah-err")
    ]
    return svg_wrap(720, 282, "".join(body))


def diag_bitwise_arch() -> str:
    body = [
        text_lbl(360, 22, "Bitwise Comparator Pipeline: Evaluating Inhibition Formula in O(1)", "var(--hb-txt)", 12, bold=True),
        box_ml(20, 56, 156, 62, "Dem UDS Status Byte", ["b7..b0 (8-bit reg)", "Ex: 0x09 (TF=1,CDTC=1)"], stroke="var(--hb-warn)"),
        box_ml(20, 138, 156, 56, "ECUC Mask Constant", ["LAST_FAILED = 0x01", "TESTED_FAILED = 0x41"], stroke="var(--hb-cyan)"),

        box_ml(234, 88, 134, 72, "Bitwise AND (&)", ["masked =", "UdsByte & InhMask"], stroke="var(--hb-pri)", fill="var(--hb-card2)"),
        box_ml(422, 88, 134, 72, "Equality Check (==)", ["matched =", "(masked == Pattern)"], stroke="var(--hb-pur)", fill="var(--hb-card2)"),
        box_ml(604, 88, 96, 72, "Inh Result", ["TRUE = Inhibit", "FALSE = Clear"], stroke="var(--hb-err)"),

        line_arrow(176, 87, 234, 114, "var(--hb-warn)", "ah-warn"),
        line_arrow(176, 166, 234, 138, "var(--hb-cyan)", "ah-cyan"),
        line_arrow(368, 124, 422, 124, "var(--hb-pri)", "ah-pri"),
        line_arrow(556, 124, 604, 124, "var(--hb-pur)", "ah-pur"),

        pill_label(360, 206, "Formula: (Dem_UdsStatusByte & InhMask) == InhPattern", "var(--hb-ok)")
    ]
    return svg_wrap(720, 234, "".join(body))


def diag_mask_truth() -> str:
    body = [
        text_lbl(360, 22, "4 AUTOSAR Inhibition Masks Truth Matrix (Bit 6 TNCTOC vs Bit 0 TF)", "var(--hb-txt)", 12, bold=True),
        # Matrix boxes
        box_ml(22, 46, 162, 164, "FIM_LAST_FAILED", [
            "Mask: 0x01 | Pat: 0x01",
            "Triggers when: TF == 1",
            "0x00 -> Clear",
            "0x01 -> INHIBIT",
            "0x50 (Cold) -> Clear"
        ], stroke="var(--hb-err)"),
        box_ml(194, 46, 162, 164, "FIM_NOT_TESTED", [
            "Mask: 0x40 | Pat: 0x40",
            "Triggers when: TNCTOC=1",
            "0x50 (Cold) -> INHIBIT",
            "0x00 (Pass) -> Clear",
            "0x01 (Fail) -> Clear"
        ], stroke="var(--hb-warn)"),
        box_ml(366, 46, 162, 164, "FIM_TESTED", [
            "Mask: 0x40 | Pat: 0x00",
            "Triggers when: TNCTOC=0",
            "0x50 (Cold) -> Clear",
            "0x00 (Pass) -> INHIBIT",
            "0x01 (Fail) -> INHIBIT"
        ], stroke="var(--hb-cyan)"),
        box_ml(538, 46, 162, 164, "TESTED_AND_FAILED", [
            "Mask: 0x41 | Pat: 0x01",
            "TNCTOC==0 && TF==1",
            "0x50 (Cold) -> Clear",
            "0x00 (Pass) -> Clear",
            "0x01 (Fail) -> INHIBIT"
        ], stroke="var(--hb-pur)")
    ]
    return svg_wrap(720, 232, "".join(body))


def diag_cold_start_0x6d() -> str:
    body = [
        text_lbl(360, 22, "Cold Start (0x50 / 0x6D) Behavior: Why NOT_TESTED Blocks Early", "var(--hb-txt)", 12, bold=True),
        box_ml(20, 62, 146, 72, "1. Key-On / OpCycle", ["UDS = 0x50 (TNCTOC=1)", "No test ran yet"], stroke="var(--hb-warn)"),
        box_ml(204, 62, 146, 72, "2. Monitor Runs", ["Dem_SetEventStatus", "PASSED or FAILED"], stroke="var(--hb-pri)"),
        box_ml(392, 42, 144, 52, "3a. Monitor PASSED", ["UDS = 0x00 (TNCTOC=0)", "TF=0 -> Tested OK"], stroke="var(--hb-ok)"),
        box_ml(392, 114, 144, 52, "3b. Monitor FAILED", ["UDS = 0x0D (TF=1)", "TNCTOC=0 -> Confirmed"], stroke="var(--hb-err)"),
        box_ml(568, 42, 134, 52, "NOT_TESTED", ["Un-inhibits (Perm=T)", "Cleared at 3a/3b"], stroke="var(--hb-ok)"),
        box_ml(568, 114, 134, 52, "TESTED_FAILED", ["Ignores stale (0x41)", "Inhibits ONLY at 3b"], stroke="var(--hb-pur)"),

        line_arrow(166, 98, 204, 98, "var(--hb-warn)", "ah-warn"),
        line_arrow(350, 82, 392, 68, "var(--hb-ok)", "ah-ok"),
        line_arrow(350, 114, 392, 140, "var(--hb-err)", "ah-err"),
        line_arrow(536, 68, 568, 68, "var(--hb-ok)", "ah-ok"),
        line_arrow(536, 140, 568, 140, "var(--hb-pur)", "ah-pur"),

        pill_label(360, 196, "0x41 Mask prevents stale TF=1 before cycle test from misfiring FiM", "var(--hb-cyan)")
    ]
    return svg_wrap(720, 224, "".join(body))


def diag_push_vs_poll() -> str:
    body = [
        text_lbl(360, 22, "Push Synchronization vs Polling Synchronization Latency", "var(--hb-txt)", 12, bold=True),
        # Top track: Push Mode
        box_ml(22, 44, 676, 86, "", [], stroke="var(--hb-ok)", fill="var(--hb-card)"),
        text_lbl(34, 62, "PUSH MODE (FiMEventUpdateTriggeredByDem = TRUE) -> Latency < 5 us", "var(--hb-ok)", 10.5, anchor="start", bold=True),
        box_ml(34, 72, 144, 46, "Dem_SetEventStatus", ["UDS Bit changes"], stroke="var(--hb-warn)"),
        box_ml(222, 72, 200, 46, "FiM_DemTriggerOnEventStatus", ["Immediate sync callback"], stroke="var(--hb-ok)"),
        box_ml(466, 72, 214, 46, "FID Permission Updated", ["Zero MainFunction delay"], stroke="var(--hb-ok)"),
        line_arrow(178, 95, 222, 95, "var(--hb-ok)", "ah-ok"),
        line_arrow(422, 95, 466, 95, "var(--hb-ok)", "ah-ok"),

        # Bottom track: Polling Mode
        box_ml(22, 146, 676, 96, "", [], stroke="var(--hb-warn)", fill="var(--hb-card)"),
        text_lbl(34, 164, "POLLING MODE (FiMEventUpdateTriggeredByDem = FALSE) -> Latency <= FiMTaskTime", "var(--hb-warn)", 10.5, anchor="start", bold=True),
        box_ml(34, 178, 144, 50, "Dem_SetEventStatus", ["UDS queued inside Dem"], stroke="var(--hb-warn)"),
        box_ml(222, 178, 200, 50, "Wait OS Cyclic Alarm", ["10ms..20ms wait window"], stroke="var(--hb-mut)", fill="var(--hb-card2)"),
        box_ml(466, 178, 214, 50, "FiM_MainFunction()", ["Dem_GetEventUdsStatus()"], stroke="var(--hb-pri)"),
        line_arrow(178, 203, 222, 203, "var(--hb-mut)", "ah-mut", dashed=True),
        line_arrow(422, 203, 466, 203, "var(--hb-pri)", "ah-pri")
    ]
    return svg_wrap(720, 260, "".join(body))


def diag_polling_budget() -> str:
    body = [
        text_lbl(360, 22, "Cyclic Polling CPU Budget Control (FiMMaxEventsPerCalcCycle = 20)", "var(--hb-txt)", 12, bold=True),
        box_ml(20, 46, 180, 74, "OS Task 10ms Tick #1", ["Process Evt 00..19", "Pause & save cursor", "WCET stays bounded"], stroke="var(--hb-pri)"),
        box_ml(270, 46, 180, 74, "OS Task 10ms Tick #2", ["Resume Evt 20..39", "Update dirty FIDs", "Prevents CPU spike"], stroke="var(--hb-cyan)"),
        box_ml(520, 46, 180, 74, "OS Task 10ms Tick #3", ["Finish Evt 40..49", "Wrap cursor -> 0", "Full cycle = 30ms"], stroke="var(--hb-ok)"),
        line_arrow(200, 83, 270, 83, "var(--hb-pri)", "ah-pri"),
        line_arrow(450, 83, 520, 83, "var(--hb-cyan)", "ah-cyan"),

        box_ml(40, 150, 640, 56, "ECUC Design Rule", [
            "Worst-case Latency = ceil(TotalEvents / FiMMaxEventsPerCalcCycle) * FiMTaskTime",
            "Enable FiMEventUpdateTriggeredByDem=TRUE for safety-critical FIDs needing sub-ms cutoff"
        ], stroke="var(--hb-warn)", fill="var(--hb-card2)")
    ]
    return svg_wrap(720, 226, "".join(body))


def diag_clear_dtc_dual() -> str:
    body = [
        text_lbl(360, 22, "UDS 0x14 Dem_ClearDTC: Why LAST_FAILED Clears While NOT_TESTED Blocks", "var(--hb-txt)", 12, bold=True),
        box_ml(20, 78, 126, 68, "UDS Tester 0x14", ["Dcm -> Dem_ClearDTC", "Reset all bytes"], stroke="var(--hb-pur)"),
        box_ml(188, 78, 148, 68, "New UDS Byte = 0x50", ["Bit0 TF = 0", "Bit6 TNCTOC = 1"], stroke="var(--hb-warn)"),

        box_ml(400, 44, 294, 62, "Path A: LAST_FAILED / TESTED_FAILED", [
            "(0x50 & 0x01) = 0x00 != 0x01",
            "FID Permission RECOVERED -> TRUE"
        ], stroke="var(--hb-ok)"),
        box_ml(400, 128, 294, 62, "Path B: FIM_NOT_TESTED (OBD/Safety)", [
            "(0x50 & 0x40) = 0x40 == 0x40",
            "FID RE-INHIBITED -> FALSE until retested"
        ], stroke="var(--hb-err)"),

        line_arrow(146, 112, 188, 112, "var(--hb-pur)", "ah-pur"),
        line_arrow(336, 98, 400, 75, "var(--hb-ok)", "ah-ok"),
        line_arrow(336, 126, 400, 159, "var(--hb-err)", "ah-err")
    ]
    return svg_wrap(720, 214, "".join(body))


def diag_many_to_many() -> str:
    body = [
        text_lbl(360, 22, "Many-to-Many Bipartite Inhibition Graph & Per-FID OR Aggregation", "var(--hb-txt)", 12, bold=True),
        box_ml(24, 44, 150, 42, "Evt_01 (RailPress)", ["Mask: LAST_FAILED"], stroke="var(--hb-err)"),
        box_ml(24, 102, 150, 42, "Evt_02 (Misfire)", ["Mask: TESTED_FAIL"], stroke="var(--hb-warn)"),
        box_ml(24, 160, 150, 42, "Evt_03 (BatteryV)", ["Mask: NOT_TESTED"], stroke="var(--hb-cyan)"),

        box_ml(266, 66, 174, 96, "InhCfg Links", [
            "Evt_01 -> FID_0 & FID_1",
            "Evt_02 -> FID_0",
            "Evt_03 -> FID_1 & FID_2",
            "N-to-M Matrix"
        ], stroke="var(--hb-pri)", fill="var(--hb-card2)"),

        box_ml(526, 44, 168, 44, "FID_0 (FuelInject)", ["Inhibited if E1 || E2"], stroke="var(--hb-ok)"),
        box_ml(526, 102, 168, 44, "FID_1 (TurboBoost)", ["Inhibited if E1 || E3"], stroke="var(--hb-ok)"),
        box_ml(526, 160, 168, 44, "FID_2 (StartStop)", ["Inhibited if E3"], stroke="var(--hb-ok)"),

        line_arrow(174, 65, 266, 90, "var(--hb-err)", "ah-err"),
        line_arrow(174, 123, 266, 114, "var(--hb-warn)", "ah-warn"),
        line_arrow(174, 181, 266, 138, "var(--hb-cyan)", "ah-cyan"),

        line_arrow(440, 90, 526, 66, "var(--hb-pri)", "ah-pri"),
        line_arrow(440, 114, 526, 124, "var(--hb-pri)", "ah-pri"),
        line_arrow(440, 138, 526, 182, "var(--hb-pri)", "ah-pri"),

        pill_label(360, 222, "Safety Rule: Any single active inhibition on a FID forces Permission = FALSE", "var(--hb-err)")
    ]
    return svg_wrap(720, 248, "".join(body))


def diag_summary_event() -> str:
    body = [
        text_lbl(360, 22, "FiMSummaryEventId Fan-In Aggregation (ROM/RAM Table Reduction)", "var(--hb-txt)", 12, bold=True),
        box_ml(20, 44, 136, 38, "Evt_Cyl1_Open", ["Dem Event 10"], stroke="var(--hb-warn)"),
        box_ml(20, 94, 136, 38, "Evt_Cyl2_Open", ["Dem Event 11"], stroke="var(--hb-warn)"),
        box_ml(20, 144, 136, 38, "Evt_Cyl3_Short", ["Dem Event 12"], stroke="var(--hb-warn)"),
        box_ml(20, 194, 136, 38, "Evt_Cyl4_Short", ["Dem Event 13"], stroke="var(--hb-warn)"),

        box_ml(230, 88, 188, 92, "Sum_01 (FiMEventSum)", [
            "Virtual Summary Group",
            "Active if ANY member",
            "UDS satisfies Mask",
            "Replaces 4x3 = 12 rows"
        ], stroke="var(--hb-pur)", fill="var(--hb-card2)"),

        box_ml(508, 48, 184, 48, "FID_0 (CylinderCut)", ["Links only to Sum_01"], stroke="var(--hb-ok)"),
        box_ml(508, 112, 184, 48, "FID_1 (BoostControl)", ["Links only to Sum_01"], stroke="var(--hb-ok)"),
        box_ml(508, 176, 184, 48, "FID_2 (CatHeating)", ["Links only to Sum_01"], stroke="var(--hb-ok)"),

        line_arrow(156, 63, 230, 110, "var(--hb-warn)", "ah-warn"),
        line_arrow(156, 113, 230, 126, "var(--hb-warn)", "ah-warn"),
        line_arrow(156, 163, 230, 142, "var(--hb-warn)", "ah-warn"),
        line_arrow(156, 213, 230, 158, "var(--hb-warn)", "ah-warn"),

        line_arrow(418, 112, 508, 72, "var(--hb-pur)", "ah-pur"),
        line_arrow(418, 134, 508, 136, "var(--hb-pur)", "ah-pur"),
        line_arrow(418, 156, 508, 200, "var(--hb-pur)", "ah-pur")
    ]
    return svg_wrap(720, 250, "".join(body))


def diag_component_dag() -> str:
    body = [
        text_lbl(360, 22, "DemComponent DAG & FiM_DemTriggerOnComponentStatus", "var(--hb-txt)", 12, bold=True),
        box_ml(24, 72, 164, 76, "Comp_01 (TurboHW)", [
            "DemComponentFailed",
            "Parent HW Node",
            "1 Callback replaces",
            "15 leaf events"
        ], stroke="var(--hb-err)"),
        box_ml(272, 72, 178, 76, "FiM Component Hook", [
            "FiM_DemTriggerOn",
            "ComponentStatus()",
            "(CompId, FailedBool)"
        ], stroke="var(--hb-pri)", fill="var(--hb-card2)"),
        box_ml(530, 44, 166, 54, "FID_1 (TurboBoost)", ["Immediate Inhibit", "Permission = FALSE"], stroke="var(--hb-err)"),
        box_ml(530, 122, 166, 54, "Diag_Downstream", ["Suppresses child", "BoostPlausibility DTC"], stroke="var(--hb-cyan)"),

        line_arrow(188, 110, 272, 110, "var(--hb-err)", "ah-err"),
        line_arrow(450, 96, 530, 71, "var(--hb-pri)", "ah-pri"),
        line_arrow(450, 124, 530, 149, "var(--hb-cyan)", "ah-cyan"),

        pill_label(360, 198, "Triggered only if FiMAvailabilitySupport / Component Link configured", "var(--hb-mut)")
    ]
    return svg_wrap(720, 224, "".join(body))


def diag_avail_gate() -> str:
    body = [
        text_lbl(360, 22, "Dual-Gate Permission Logic: Fault Mask AND Runtime Availability Gate", "var(--hb-txt)", 12, bold=True),
        box_ml(24, 48, 206, 58, "Input 1: Fault Inhibition", ["!ANY(MaskMatched)", "TRUE if 0 faults active"], stroke="var(--hb-warn)"),
        box_ml(24, 134, 206, 58, "Input 2: Availability Latch", ["FiM_SetFunctionAvailable()", "Variant / EoL Feature Flag"], stroke="var(--hb-pur)"),
        box_ml(312, 86, 150, 68, "Logical AND Gate", ["Perm =", "NoFault && Avail"], stroke="var(--hb-pri)", fill="var(--hb-card2)"),
        box_ml(538, 86, 158, 68, "Final SW-C Output", ["FALSE overrides all", "Requires AvailabilityCfg"], stroke="var(--hb-ok)"),

        line_arrow(230, 77, 312, 108, "var(--hb-warn)", "ah-warn"),
        line_arrow(230, 163, 312, 132, "var(--hb-pur)", "ah-pur"),
        line_arrow(462, 120, 538, 120, "var(--hb-ok)", "ah-ok")
    ]
    return svg_wrap(720, 214, "".join(body))


def diag_cascading_block() -> str:
    body = [
        text_lbl(360, 22, "Cascading Fault Suppression: Stopping Secondary DTC Storms", "var(--hb-txt)", 12, bold=True),
        box_ml(20, 66, 148, 68, "Root: Battery Low", ["Evt_03 UDS: TF=1", "Voltage < 8.5V"], stroke="var(--hb-err)"),
        box_ml(214, 66, 146, 68, "FiM Core Engine", ["Evt_03 inhibits", "FID_Diag_Sensor"], stroke="var(--hb-pri)", fill="var(--hb-card2)"),
        box_ml(406, 66, 136, 68, "SW-C Monitor", ["GetPermission()==F", "Skips Dem_SetEvent"], stroke="var(--hb-cyan)"),
        box_ml(582, 66, 118, 68, "Dem Memory", ["Clean Root Cause", "Zero False DTCs"], stroke="var(--hb-ok)"),

        line_arrow(168, 100, 214, 100, "var(--hb-err)", "ah-err"),
        line_arrow(360, 100, 406, 100, "var(--hb-pri)", "ah-pri"),
        line_arrow(542, 100, 582, 100, "var(--hb-ok)", "ah-ok"),

        pill_label(360, 174, "Diagnostic Mechanic sees 1 Root Battery DTC instead of 15 noisy Sensor DTCs", "var(--hb-ok)")
    ]
    return svg_wrap(720, 204, "".join(body))


def diag_fail_safe() -> str:
    body = [
        text_lbl(360, 22, "ISO 26262 Fail-Safe Degradation & Limp-Home Reaction Switch", "var(--hb-txt)", 12, bold=True),
        box_ml(20, 74, 152, 66, "Evt_01 Critical Fail", ["Rail Sensor Fault", "UDS = 0x09 (TF=1)"], stroke="var(--hb-err)"),
        box_ml(232, 74, 142, 66, "FiM Evaluator", ["Evaluates FIDs", "Fast Fail-Safe"], stroke="var(--hb-pri)", fill="var(--hb-card2)"),
        box_ml(436, 38, 256, 56, "FID_FullInjection = FALSE", ["Cuts high-pressure rail control immediately"], stroke="var(--hb-err)"),
        box_ml(436, 116, 256, 56, "SW-C Activates Limp-Home", ["!Perm(FullInj) triggers safe 40km/h mode"], stroke="var(--hb-warn)"),

        line_arrow(172, 107, 232, 107, "var(--hb-err)", "ah-err"),
        line_arrow(374, 92, 436, 66, "var(--hb-err)", "ah-err"),
        line_arrow(374, 122, 436, 144, "var(--hb-warn)", "ah-warn")
    ]
    return svg_wrap(720, 196, "".join(body))


def diag_obd_iumpr() -> str:
    body = [
        text_lbl(360, 22, "OBD-II / Euro-7 IUMPR & Monitor Scheduling via FiM", "var(--hb-txt)", 12, bold=True),
        box_ml(20, 62, 168, 70, "Prereq Monitor (Misfire)", ["Evt_02 Status:", "TNCTOC=1 or TF=1"], stroke="var(--hb-warn)"),
        box_ml(244, 62, 186, 70, "FID_CatMonitor Gate", ["Mask: NOT_TESTED", "+ LAST_FAILED"], stroke="var(--hb-pri)", fill="var(--hb-card2)"),
        box_ml(488, 36, 206, 54, "Permission == FALSE", ["Hold Cat Monitor & IUMPR Num"], stroke="var(--hb-err)"),
        box_ml(488, 112, 206, 54, "Permission == TRUE", ["Execute Monitor -> Dem Report"], stroke="var(--hb-ok)"),

        line_arrow(188, 97, 244, 97, "var(--hb-warn)", "ah-warn"),
        line_arrow(430, 82, 488, 63, "var(--hb-err)", "ah-err"),
        line_arrow(430, 112, 488, 139, "var(--hb-ok)", "ah-ok")
    ]
    return svg_wrap(720, 192, "".join(body))


def diag_det_guard() -> str:
    body = [
        text_lbl(360, 22, "DET Defensive Checks Inside FiM Public & Callback APIs", "var(--hb-txt)", 12, bold=True),
        box_ml(20, 48, 164, 52, "FIM_E_UNINIT (0x01)", ["Called before FiM_Init"], stroke="var(--hb-err)"),
        box_ml(20, 114, 164, 52, "FIM_E_FID_RANGE (0x02)", ["FID >= FiMMaxFids"], stroke="var(--hb-err)"),
        box_ml(20, 180, 164, 52, "FIM_E_EVT_RANGE (0x03)", ["EvtId invalid in Dem"], stroke="var(--hb-err)"),

        box_ml(254, 92, 192, 88, "Det Guard Layer", [
            "#if FiMDevErrorDetect",
            "Det_ReportError(11, 0,",
            "  ApiId, ErrorId);",
            "Force Safe Perm=FALSE"
        ], stroke="var(--hb-warn)", fill="var(--hb-card2)"),

        box_ml(516, 48, 180, 56, "FIM_E_PARAM_PTR (0x04)", ["Null pointer arg passed"], stroke="var(--hb-err)"),
        box_ml(516, 124, 180, 56, "FIM_E_INIT_FAIL (0x05)", ["NULL_PTR ConfigPtr"], stroke="var(--hb-err)"),

        line_arrow(184, 74, 254, 114, "var(--hb-err)", "ah-err"),
        line_arrow(184, 140, 254, 136, "var(--hb-err)", "ah-err"),
        line_arrow(184, 206, 254, 158, "var(--hb-err)", "ah-err"),
        line_arrow(516, 76, 446, 118, "var(--hb-err)", "ah-err"),
        line_arrow(516, 152, 446, 148, "var(--hb-err)", "ah-err")
    ]
    return svg_wrap(720, 250, "".join(body))


def diag_ecuc_tree() -> str:
    body = [
        text_lbl(360, 22, "AUTOSAR FiM ECUC Parameter Container Hierarchy", "var(--hb-txt)", 12, bold=True),
        box_ml(244, 38, 232, 44, "FiM (EcucModuleDef)", ["PRE-COMPILE / POST-BUILD"], stroke="var(--hb-pri)", fill="var(--hb-card2)"),

        box_ml(22, 118, 206, 110, "FiMGeneral", [
            "FiMDevErrorDetect",
            "FiMEventUpdateTriggeredByDem",
            "FiMTaskTime (0.020s)",
            "FiMMaxFids / CalcCycle",
            "FiMAvailabilitySupport"
        ], stroke="var(--hb-cyan)"),

        box_ml(254, 118, 212, 110, "FiMConfigSet", [
            "FiMFID (FiMFunctionId)",
            "FiMInhibitionConfiguration:",
            "  InhMask + InhRef + FidRef",
            "FiMEventSummary:",
            "  SummaryId + InputEventRef"
        ], stroke="var(--hb-ok)"),

        box_ml(492, 118, 206, 110, "Generated C Files", [
            "FiM_Cfg.h (#define switches)",
            "FiM_Lcfg.c (Link-time tables)",
            "FiM_PBcfg.c (Post-build ptr)",
            "Rte_FiM_Type.h (Port types)"
        ], stroke="var(--hb-pur)"),

        path_arrow("M 360 82 L 360 100 L 125 100 L 125 118", "var(--hb-cyan)", "ah-cyan"),
        line_arrow(360, 82, 360, 118, "var(--hb-ok)", "ah-ok"),
        path_arrow("M 360 82 L 360 100 L 595 100 L 595 118", "var(--hb-pur)", "ah-pur")
    ]
    return svg_wrap(720, 246, "".join(body))


DIAGRAMS = {
    "decoupling": diag_decoupling(),
    "init_seq": diag_init_seq(),
    "io_map": diag_io_map(),
    "bitwise_arch": diag_bitwise_arch(),
    "mask_truth": diag_mask_truth(),
    "cold_start_0x6d": diag_cold_start_0x6d(),
    "push_vs_poll": diag_push_vs_poll(),
    "polling_budget": diag_polling_budget(),
    "clear_dtc_dual": diag_clear_dtc_dual(),
    "many_to_many": diag_many_to_many(),
    "summary_event": diag_summary_event(),
    "component_dag": diag_component_dag(),
    "avail_gate": diag_avail_gate(),
    "cascading_block": diag_cascading_block(),
    "fail_safe": diag_fail_safe(),
    "obd_iumpr": diag_obd_iumpr(),
    "det_guard": diag_det_guard(),
    "ecuc_tree": diag_ecuc_tree(),
}
