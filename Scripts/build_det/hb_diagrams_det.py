# -*- coding: utf-8 -*-
"""Inline theme-aware SVG diagrams for the AUTOSAR Det Technical Handbook."""

def svg_wrap(vb_w, vb_h, inner, title=""):
    t_el = f"<title>{title}</title>" if title else ""
    return (
        f'<div class="hb-svg-box">'
        f'<svg viewBox="0 0 {vb_w} {vb_h}" width="{vb_w}" height="{vb_h}" xmlns="http://www.w3.org/2000/svg">'
        f'{t_el}'
        f'<defs>'
        f'<marker id="hbArr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">'
        f'<path d="M 0 1 L 10 5 L 0 9 z" fill="#38bdf8"/></marker>'
        f'<marker id="hbArrRed" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">'
        f'<path d="M 0 1 L 10 5 L 0 9 z" fill="#ef4444"/></marker>'
        f'<marker id="hbArrAmb" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">'
        f'<path d="M 0 1 L 10 5 L 0 9 z" fill="#f59e0b"/></marker>'
        f'<marker id="hbArrPur" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">'
        f'<path d="M 0 1 L 10 5 L 0 9 z" fill="#a855f7"/></marker>'
        f'<marker id="hbArrGrn" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">'
        f'<path d="M 0 1 L 10 5 L 0 9 z" fill="#22c55e"/></marker>'
        f'</defs>'
        f'<rect x="0" y="0" width="{vb_w}" height="{vb_h}" rx="10" fill="var(--hb-svg-bg)" stroke="var(--hb-box-stroke)" stroke-width="1"/>'
        f'{inner}'
        f'</svg></div>'
    )


def box_ml(x, y, w, h, lines, stroke="#38bdf8", fill="var(--hb-box-fill)", rx=8):
    out = [f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="1.6"/>']
    cx = x + w / 2
    n = len(lines)
    start_y = y + (h / 2) - ((n - 1) * 8) + 4
    for idx, (txt, size, color, weight) in enumerate(lines):
        ly = start_y + idx * 16
        out.append(
            f'<text x="{cx:.1f}" y="{ly:.1f}" text-anchor="middle" '
            f'fill="{color}" font-size="{size}" font-weight="{weight}">{txt}</text>'
        )
    return "".join(out)


def pill_label(cx, cy, txt, stroke="#38bdf8", w=None):
    pw = w if w is not None else max(66, len(txt) * 7 + 16)
    ph = 20
    px = cx - pw / 2
    py = cy - ph / 2
    return (
        f'<rect x="{px:.1f}" y="{py:.1f}" width="{pw:.1f}" height="{ph}" rx="10" '
        f'fill="var(--hb-pill-bg)" stroke="{stroke}" stroke-width="1.2"/>'
        f'<text x="{cx:.1f}" y="{cy + 3.5:.1f}" text-anchor="middle" '
        f'fill="var(--hb-text)" font-size="10.5" font-weight="700">{txt}</text>'
    )


def line_arrow(x1, y1, x2, y2, color="#38bdf8", marker="hbArr", dashed=False):
    dash = ' stroke-dasharray="5 4"' if dashed else ''
    return (
        f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" '
        f'stroke="{color}" stroke-width="1.8"{dash} marker-end="url(#{marker})"/>'
    )


def path_arrow(d, color="#38bdf8", marker="hbArr", dashed=False):
    dash = ' stroke-dasharray="5 4"' if dashed else ''
    return (
        f'<path d="{d}" fill="none" stroke="{color}" stroke-width="1.8"{dash} marker-end="url(#{marker})"/>'
    )


def svg_det_lifecycle():
    parts = [
        '<text x="410" y="24" text-anchor="middle" fill="var(--hb-text)" font-size="13" font-weight="800">AUTOSAR Classic Det Lifecycle &amp; Pre-Init Safety (SWS_Det_00019 / 00025 / 00204)</text>',
        box_ml(25, 60, 175, 76, [
            ("DET_UNINIT", 12, "#f59e0b", "800"),
            ("Before Det_Init()", 10.5, "var(--hb-subtext)", "600"),
            ("SWS_Det_00204 Guard", 10, "#f59e0b", "700")
        ], stroke="#f59e0b"),
        box_ml(310, 60, 195, 76, [
            ("DET_INIT", 12, "#38bdf8", "800"),
            ("EcuM_AL_DriverInitZero()", 10.5, "var(--hb-subtext)", "600"),
            ("RAM Buffer Reset", 10, "#38bdf8", "700")
        ], stroke="#38bdf8"),
        box_ml(615, 60, 180, 76, [
            ("DET_STARTED", 12, "#22c55e", "800"),
            ("EcuM_StartupTwo()", 10.5, "var(--hb-subtext)", "600"),
            ("DLT + Runtime Active", 10, "#22c55e", "700")
        ], stroke="#22c55e"),
        line_arrow(200, 98, 306, 98, "#38bdf8", "hbArr"),
        pill_label(253, 52, "Det_Init(NULL)", "#38bdf8", 92),
        line_arrow(505, 98, 611, 98, "#22c55e", "hbArrGrn"),
        pill_label(558, 52, "Det_Start()", "#22c55e", 82),
        box_ml(165, 168, 490, 56, [
            ("Pre-Init Call Guard (SWS_Det_00204): ReportError while UNINIT", 11.5, "#ef4444", "700"),
            ("Det ignores RAM writes cleanly -> zero memory corruption before OS starts", 10.5, "var(--hb-subtext)", "500")
        ], stroke="#ef4444", fill="var(--hb-box-alt)")
    ]
    return svg_wrap(820, 245, "".join(parts), "Det Lifecycle")


def svg_3streams_routing():
    parts = [
        '<text x="420" y="24" text-anchor="middle" fill="var(--hb-text)" font-size="13" font-weight="800">Phan luong 3 API chuan AUTOSAR R22-11 / R23-11: Dev vs Runtime vs Transient</text>',
        box_ml(25, 48, 225, 58, [
            ("Det_ReportError (0x01)", 11.5, "#ef4444", "800"),
            ("#if DEV_ERROR_DETECT==ON", 10, "var(--hb-subtext)", "600")
        ], stroke="#ef4444"),
        box_ml(25, 126, 225, 58, [
            ("Det_ReportRuntimeError (0x04)", 11.5, "#f59e0b", "800"),
            ("Always Active (Production)", 10, "var(--hb-subtext)", "600")
        ], stroke="#f59e0b"),
        box_ml(25, 204, 225, 58, [
            ("Det_ReportTransientFault (0x05)", 11.5, "#a855f7", "800"),
            ("MCAL ECC / Bus Noise", 10, "var(--hb-subtext)", "600")
        ], stroke="#a855f7"),
        box_ml(330, 50, 210, 54, [
            ("DetErrorHook[] + RAM", 11, "var(--hb-text)", "700"),
            ("Can Halt while(1) / BKPT", 10, "#ef4444", "700")
        ], stroke="#ef4444"),
        box_ml(330, 128, 210, 54, [
            ("RuntimeCallout[] + RAM", 11, "var(--hb-text)", "700"),
            ("Always Return E_OK", 10, "#22c55e", "700")
        ], stroke="#f59e0b"),
        box_ml(330, 206, 210, 54, [
            ("TransientCallout[] + RAM", 11, "var(--hb-text)", "700"),
            ("NO DLT Forward!", 10, "#a855f7", "700")
        ], stroke="#a855f7"),
        box_ml(620, 62, 195, 92, [
            ("DLT Module (55)", 12, "#38bdf8", "800"),
            ("Dlt_DetForwardErrorTrace", 10, "var(--hb-subtext)", "600"),
            ("0x01 &amp; 0x04 ONLY", 10.5, "#22c55e", "700")
        ], stroke="#38bdf8", fill="var(--hb-box-alt)"),
        box_ml(620, 194, 195, 70, [
            ("Return Std_ReturnType", 11.5, "#a855f7", "800"),
            ("E_OK vs E_NOT_OK -> DEM", 10, "var(--hb-subtext)", "600")
        ], stroke="#a855f7", fill="var(--hb-box-alt)"),
        line_arrow(250, 77, 326, 77, "#ef4444", "hbArrRed"),
        line_arrow(250, 155, 326, 155, "#f59e0b", "hbArrAmb"),
        line_arrow(250, 233, 326, 233, "#a855f7", "hbArrPur"),
        line_arrow(540, 77, 616, 94, "#38bdf8", "hbArr"),
        line_arrow(540, 155, 616, 128, "#38bdf8", "hbArr"),
        line_arrow(540, 233, 616, 233, "#a855f7", "hbArrPur"),
    ]
    return svg_wrap(840, 285, "".join(parts), "Det 3-Stream Routing")


def svg_swc_rte_pdav():
    parts = [
        '<text x="410" y="24" text-anchor="middle" fill="var(--hb-text)" font-size="13" font-weight="800">SWC Interaction via RTE DETService &amp; Port-Defined Argument Value (PDAV)</text>',
        box_ml(25, 65, 210, 78, [
            ("SWC_BrakeCtrl (App)", 12, "#38bdf8", "800"),
            ("Rte_Call_DETService_ReportError", 10, "var(--hb-subtext)", "600"),
            ("(Inst=0, Api=0x01, Err=0x02)", 10, "#22c55e", "700")
        ], stroke="#38bdf8"),
        box_ml(305, 65, 225, 78, [
            ("RTE Generated Wrapper", 12, "#f59e0b", "800"),
            ("PDAV Lookup: ModId = 2048", 10.5, "#f59e0b", "700"),
            ("3 Args -&gt; 4-Tuple Auto-Inject", 10, "var(--hb-subtext)", "600")
        ], stroke="#f59e0b", fill="var(--hb-box-alt)"),
        box_ml(600, 65, 200, 78, [
            ("Core Det Engine (15)", 12, "#22c55e", "800"),
            ("Det_ReportError(2048,0,1,2)", 10, "var(--hb-subtext)", "600"),
            ("SWS_Det_00210 Verified", 10, "#22c55e", "700")
        ], stroke="#22c55e"),
        line_arrow(235, 104, 301, 104, "#38bdf8", "hbArr"),
        line_arrow(530, 104, 596, 104, "#22c55e", "hbArrGrn"),
        pill_label(268, 46, "3 Params", "#38bdf8", 74),
        pill_label(565, 46, "4 Params", "#22c55e", 74),
    ]
    return svg_wrap(820, 175, "".join(parts), "SWC RTE PDAV")


def svg_hooks_dlt_pipeline():
    parts = [
        '<text x="420" y="24" text-anchor="middle" fill="var(--hb-text)" font-size="13" font-weight="800">Internal Pipeline: Exclusive Area -&gt; Anti-Recursion -&gt; Hooks -&gt; DLT -&gt; Ring Buffer</text>',
        box_ml(20, 68, 130, 64, [("1. SchM Lock", 11, "#22c55e", "800"), ("EXCL_AREA_0", 9.5, "var(--hb-subtext)", "600")], stroke="#22c55e"),
        box_ml(178, 68, 130, 64, [("2. Global Filter", 11, "#f59e0b", "800"), ("Suppress Noise", 9.5, "var(--hb-subtext)", "600")], stroke="#f59e0b"),
        box_ml(336, 68, 145, 64, [("3. Hooks / Callout", 11, "#06b6d4", "800"), ("NoRecursion Guard", 9.5, "var(--hb-subtext)", "600")], stroke="#06b6d4"),
        box_ml(510, 68, 140, 64, [("4. DLT Forward", 11, "#38bdf8", "800"), ("0x01 &amp; 0x04 Only", 9.5, "var(--hb-subtext)", "600")], stroke="#38bdf8"),
        box_ml(678, 68, 140, 64, [("5. RAM Buffer/Halt", 11, "#a855f7", "800"), ("FIFO / StopFull", 9.5, "var(--hb-subtext)", "600")], stroke="#a855f7"),
        line_arrow(150, 100, 174, 100, "#22c55e", "hbArrGrn"),
        line_arrow(308, 100, 332, 100, "#f59e0b", "hbArrAmb"),
        line_arrow(481, 100, 506, 100, "#38bdf8", "hbArr"),
        line_arrow(650, 100, 674, 100, "#a855f7", "hbArrPur"),
    ]
    return svg_wrap(840, 160, "".join(parts), "Det Pipeline")


def svg_ringbuf_and_dem():
    parts = [
        '<text x="415" y="24" text-anchor="middle" fill="var(--hb-text)" font-size="13" font-weight="800">Ranh gioi kien truc: DET (Debug/Transient RAM) vs DEM (DTC / NvM / UDS 0x19)</text>',
        box_ml(25, 52, 360, 130, [
            ("DET — Default Error Tracer (ModuleId 15)", 12, "#38bdf8", "800"),
            ("RAM Ring Buffer (Det_ErrorBuffer[8]) + DLT", 10.5, "var(--hb-text)", "600"),
            ("NO NvM Write | NO Debounce | NO DTC Code", 10.5, "#f59e0b", "700"),
            ("Dev Bugs (0x01) + Runtime (0x04) + ECC (0x05)", 10, "var(--hb-subtext)", "500")
        ], stroke="#38bdf8"),
        box_ml(455, 52, 355, 130, [
            ("DEM — Diagnostic Event Manager (ModuleId 54)", 12, "#fb7185", "800"),
            ("Event Debounce -> Confirmed DTC -> NvM Flash", 10.5, "var(--hb-text)", "600"),
            ("FreezeFrame + Aging + UDS 0x19 Tester Read", 10.5, "#22c55e", "700"),
            ("Vehicle Field Faults (Wire Break, Short, Sensor)", 10, "var(--hb-subtext)", "500")
        ], stroke="#fb7185"),
        line_arrow(385, 117, 451, 117, "#ef4444", "hbArrRed", dashed=True),
        pill_label(418, 200, "Transient E_NOT_OK -> Dem_SetEventStatus()", "#ef4444", 310),
    ]
    return svg_wrap(835, 225, "".join(parts), "DET vs DEM")


def svg_reentrancy_and_guards():
    parts = [
        '<text x="415" y="24" text-anchor="middle" fill="var(--hb-text)" font-size="13" font-weight="800">Concurrency Protection: Task_10ms Preempted by ISR_CanRx (SchM Exclusive Area)</text>',
        box_ml(25, 56, 220, 74, [
            ("Task_10ms Context", 11.5, "#38bdf8", "800"),
            ("SchM_Enter_Det_EXCL_AREA_0()", 10, "#22c55e", "700"),
            ("Write Slot[N] safely", 10, "var(--hb-subtext)", "600")
        ], stroke="#38bdf8"),
        box_ml(305, 56, 220, 74, [
            ("ISR_CanRx (Cat-2 Preempt)", 11.5, "#f59e0b", "800"),
            ("Waits if SchM Interrupts Disabled", 10, "var(--hb-subtext)", "600"),
            ("Then writes Slot[N+1]", 10, "#22c55e", "700")
        ], stroke="#f59e0b"),
        box_ml(585, 56, 220, 74, [
            ("If SchM Disabled (Hazard!)", 11.5, "#ef4444", "800"),
            ("WriteIdx Race Condition", 10, "#ef4444", "700"),
            ("Torn 4-Tuple in RAM!", 10, "var(--hb-subtext)", "600")
        ], stroke="#ef4444"),
        line_arrow(245, 93, 301, 93, "#22c55e", "hbArrGrn"),
        line_arrow(525, 93, 581, 93, "#ef4444", "hbArrRed", dashed=True),
    ]
    return svg_wrap(830, 155, "".join(parts), "Det Reentrancy")
