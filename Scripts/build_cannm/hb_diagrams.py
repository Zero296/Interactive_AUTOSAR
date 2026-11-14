# -*- coding: utf-8 -*-
"""
28 Offline Geometric Shape / Block SVG Diagrams for AUTOSAR CanNM Handbook.
Replaces every text-based <pre> ASCII diagram in part6_handbook.js while staying
100% offline, theme-aware (Dark & Light mode CSS variables), and crisp at any zoom.
"""

import html

PALETTE = {
    "sky":  ("var(--hb-sky)",    "var(--hb-sky-bg)"),
    "ok":   ("var(--hb-ok)",     "var(--hb-ok-bg)"),
    "warn": ("var(--hb-warn)",   "var(--hb-warn-bg)"),
    "err":  ("var(--hb-err)",    "var(--hb-err-bg)"),
    "vio":  ("var(--hb-vio)",    "var(--hb-vio-bg)"),
    "ind":  ("var(--hb-ind)",    "var(--hb-ind-bg)"),
    "mut":  ("var(--hb-stroke)", "var(--hb-card2)"),
}


def esc(s):
    return html.escape(str(s), quote=True).replace("`", "'")


def marker_defs(did):
    out = []
    for k, (stroke, _) in PALETTE.items():
        out.append(
            f'<marker id="{did}_arr_{k}" viewBox="0 0 10 10" refX="8" refY="5" '
            f'markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">'
            f'<path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="{stroke}"/></marker>'
        )
    return "<defs>" + "".join(out) + "</defs>"


def svg_wrap(did, w, h, body):
    return (
        f'<svg viewBox="0 0 {w} {h}" class="hb-svg" xmlns="http://www.w3.org/2000/svg" '
        f'role="img" aria-label="Diagram {esc(did)}">'
        f'{marker_defs(did)}{body}</svg>'
    )


def zone(x, y, w, h, title, col="mut", dashed=True, rx=10):
    stroke, bg = PALETTE[col]
    dash_attr = ' stroke-dasharray="6,4"' if dashed else ""
    parts = [
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" '
        f'fill="var(--hb-card2)" fill-opacity="0.35" stroke="{stroke}" stroke-width="1.5"{dash_attr}/>'
    ]
    if title:
        tw = max(120, int(len(title) * 6.5 + 22))
        parts.append(
            f'<rect x="{x + 12}" y="{y - 11}" width="{tw}" height="22" rx="11" '
            f'fill="var(--hb-bg)" stroke="{stroke}" stroke-width="1.4"/>'
        )
        parts.append(
            f'<text x="{x + 12 + tw / 2}" y="{y + 4}" fill="{stroke}" '
            f'font-size="10.5" font-weight="800" text-anchor="middle">{esc(title)}</text>'
        )
    return "".join(parts)


def box(x, y, w, h, title, lines=None, col="sky", rx=8, double=False,
        header_band=False, title_size=12, sub_size=10.5, mono_sub=False):
    stroke, bg = PALETTE[col]
    lines = lines or []
    parts = [
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" '
        f'fill="var(--hb-card)" stroke="{stroke}" stroke-width="2"/>',
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" '
        f'fill="{bg}" stroke="none"/>'
    ]
    if double:
        parts.append(
            f'<rect x="{x + 4}" y="{y + 4}" width="{w - 8}" height="{h - 8}" rx="{max(4, rx - 3)}" '
            f'fill="none" stroke="{stroke}" stroke-width="1.2" stroke-opacity="0.8"/>'
        )
    cx = x + w / 2
    if header_band:
        hh = min(26, max(22, int(h * 0.34)))
        parts.append(
            f'<path d="M {x} {y + rx} Q {x} {y} {x + rx} {y} L {x + w - rx} {y} '
            f'Q {x + w} {y} {x + w} {y + rx} L {x + w} {y + hh} L {x} {y + hh} Z" '
            f'fill="{stroke}" fill-opacity="0.22"/>'
        )
        parts.append(
            f'<line x1="{x}" y1="{y + hh}" x2="{x + w}" y2="{y + hh}" '
            f'stroke="{stroke}" stroke-width="1" stroke-opacity="0.5"/>'
        )
        parts.append(
            f'<text x="{cx}" y="{y + hh / 2 + 4}" fill="{stroke}" '
            f'font-size="{title_size}" font-weight="800" text-anchor="middle">{esc(title)}</text>'
        )
        if lines:
            avail_h = h - hh
            gap = min(15, max(12, avail_h / (len(lines) + 0.5)))
            start_y = y + hh + (avail_h - (len(lines) - 1) * gap) / 2 + 3.5
            cls = ' class="mono-svg"' if mono_sub else ""
            for i, ln in enumerate(lines):
                parts.append(
                    f'<text x="{cx}" y="{start_y + i * gap:.1f}" fill="var(--text)"{cls} '
                    f'font-size="{sub_size}" text-anchor="middle">{esc(ln)}</text>'
                )
    else:
        total_lines = 1 + len(lines)
        gap = 15
        block_h = (total_lines - 1) * gap
        start_y = y + h / 2 - block_h / 2 + 4
        parts.append(
            f'<text x="{cx}" y="{start_y:.1f}" fill="{stroke if lines else "var(--text)"}" '
            f'font-size="{title_size}" font-weight="800" text-anchor="middle">{esc(title)}</text>'
        )
        cls = ' class="mono-svg"' if mono_sub else ""
        for i, ln in enumerate(lines):
            parts.append(
                f'<text x="{cx}" y="{start_y + (i + 1) * gap:.1f}" fill="var(--muted)"{cls} '
                f'font-size="{sub_size}" text-anchor="middle">{esc(ln)}</text>'
            )
    return "".join(parts)


def diamond(cx, cy, rx, ry, lines, col="warn", font_size=11):
    stroke, bg = PALETTE[col]
    pts = f"{cx},{cy - ry} {cx + rx},{cy} {cx},{cy + ry} {cx - rx},{cy}"
    parts = [
        f'<polygon points="{pts}" fill="var(--hb-card)" stroke="{stroke}" stroke-width="2"/>',
        f'<polygon points="{pts}" fill="{bg}" stroke="none"/>'
    ]
    gap = 14
    start_y = cy - (len(lines) - 1) * gap / 2 + 4
    for i, ln in enumerate(lines):
        parts.append(
            f'<text x="{cx}" y="{start_y + i * gap:.1f}" fill="{stroke}" '
            f'font-size="{font_size}" font-weight="800" text-anchor="middle">{esc(ln)}</text>'
        )
    return "".join(parts)


def pill(cx, cy, w, h, text, col="sky", font_size=10.5, bold=True, solid=False):
    stroke, bg = PALETTE[col]
    fill_bg = stroke if solid else bg
    txt_col = "#06101c" if solid else stroke
    if solid and col in ("ind", "err", "vio", "ok"):
        txt_col = "#ffffff"
    fw = "800" if bold else "600"
    parts = [
        f'<rect x="{cx - w / 2:.1f}" y="{cy - h / 2:.1f}" width="{w}" height="{h}" rx="{h / 2:.1f}" '
        f'fill="var(--hb-card)" stroke="none"/>',
        f'<rect x="{cx - w / 2:.1f}" y="{cy - h / 2:.1f}" width="{w}" height="{h}" rx="{h / 2:.1f}" '
        f'fill="{fill_bg}" stroke="{stroke}" stroke-width="1.5"/>',
        f'<text x="{cx}" y="{cy + 3.8:.1f}" fill="{txt_col}" font-size="{font_size}" '
        f'font-weight="{fw}" text-anchor="middle">{esc(text)}</text>'
    ]
    return "".join(parts)


def arrow(did, x1, y1, x2, y2, col="sky", dashed=False, width=2, bidir=False):
    stroke, _ = PALETTE[col]
    dash = ' stroke-dasharray="5,4"' if dashed else ""
    ms = f' marker-start="url(#{did}_arr_{col})"' if bidir else ""
    me = f' marker-end="url(#{did}_arr_{col})"'
    return (
        f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{stroke}" '
        f'stroke-width="{width}"{dash}{ms}{me}/>'
    )


def path_arrow(did, d, col="sky", dashed=False, width=2, bidir=False, end=True):
    stroke, _ = PALETTE[col]
    dash = ' stroke-dasharray="5,4"' if dashed else ""
    ms = f' marker-start="url(#{did}_arr_{col})"' if bidir else ""
    me = f' marker-end="url(#{did}_arr_{col})"' if end else ""
    return (
        f'<path d="{d}" fill="none" stroke="{stroke}" stroke-width="{width}" '
        f'stroke-linejoin="round"{dash}{ms}{me}/>'
    )


def edge_label(cx, cy, text, col="mut", w=None, h=20, font_size=10):
    stroke, bg = PALETTE[col]
    tw = w or max(54, int(len(text) * 5.8 + 16))
    txt_col = "var(--text)" if col == "mut" else stroke
    return (
        f'<rect x="{cx - tw / 2:.1f}" y="{cy - h / 2:.1f}" width="{tw}" height="{h}" rx="5" '
        f'fill="var(--hb-bg)" stroke="{stroke}" stroke-width="1" stroke-opacity="0.7"/>'
        f'<text x="{cx}" y="{cy + 3.5:.1f}" fill="{txt_col}" font-size="{font_size}" '
        f'font-weight="700" text-anchor="middle">{esc(text)}</text>'
    )


def num_badge(cx, cy, num, col="sky", r=10):
    stroke, _ = PALETTE[col]
    return (
        f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="var(--hb-card)" stroke="{stroke}" stroke-width="1.8"/>'
        f'<text x="{cx}" y="{cy + 3.8:.1f}" fill="{stroke}" font-size="10" font-weight="800" text-anchor="middle">{num}</text>'
    )


def bus_rail(x1, y, x2, label="", col="sky"):
    stroke, _ = PALETTE[col]
    parts = [
        f'<line x1="{x1}" y1="{y - 2}" x2="{x2}" y2="{y - 2}" stroke="{stroke}" stroke-width="2.2"/>',
        f'<line x1="{x1}" y1="{y + 2}" x2="{x2}" y2="{y + 2}" stroke="{stroke}" stroke-width="2.2"/>'
    ]
    if label:
        tw = max(140, int(len(label) * 6.4 + 22))
        cx = (x1 + x2) / 2
        parts.append(
            f'<rect x="{cx - tw / 2:.1f}" y="{y - 11}" width="{tw}" height="22" rx="11" '
            f'fill="var(--hb-bg)" stroke="{stroke}" stroke-width="1.6"/>'
        )
        parts.append(
            f'<text x="{cx}" y="{y + 3.8}" fill="{stroke}" font-size="10.5" '
            f'font-weight="800" text-anchor="middle">{esc(label)}</text>'
        )
    return "".join(parts)


# =============================================================================
# 28 TAILORED DIAGRAMS (B01..B28)
# =============================================================================

def b01():
    d = "b01"
    body = []
    # Left zone: Master-Slave
    body.append(zone(14, 20, 326, 224, "MÔ HÌNH MASTER-SLAVE TRUYỀN THỐNG", "err", dashed=True))
    body.append(box(92, 42, 170, 52, "Master Node", ["Single Point of Failure!"], "err", header_band=True))
    body.append(edge_label(177, 114, "Polling / Heartbeat", "err", 136))
    for nx in (38, 134, 230):
        body.append(path_arrow(d, f"M 177 94 L 177 128 L {nx + 42} 128 L {nx + 42} 152", "err"))
        body.append(box(nx, 152, 84, 42, "Slave Node", ["Chờ lệnh Master"], "mut", title_size=11, sub_size=9.5))
    body.append(pill(177, 218, 286, 24, "Master hỏng -> Toàn mạng tê liệt!", "err", 10.5))

    # Right zone: Decentralized Peer-to-Peer CanNM
    body.append(zone(364, 20, 542, 224, "MÔ HÌNH PHÂN TÁN TRỰC TIẾP — AUTOSAR CANNM", "sky", dashed=False))
    ecus = [(400, "ECU #1"), (575, "ECU #2"), (750, "ECU #3")]
    for ex, lbl in ecus:
        body.append(box(ex, 44, 120, 50, lbl, ["Peer-to-Peer"], "sky", header_band=True))
        body.append(arrow(d, ex + 60, 94, ex + 60, 146, "sky", width=2, bidir=True))
    body.append(arrow(d, 520, 69, 575, 69, "ok", bidir=True))
    body.append(arrow(d, 695, 69, 750, 69, "ok", bidir=True))
    body.append(bus_rail(388, 154, 882, "CAN BUS VẬT LÝ (Peer-to-Peer)", "sky"))
    body.append(pill(452, 202, 146, 24, "Không có Master cố định", "ok", 10))
    body.append(pill(634, 202, 176, 24, "Nhận NM PDU = Giữ mạng thức", "sky", 10))
    body.append(pill(808, 202, 148, 24, "Đồng thuận 100% mới ngủ", "vio", 10))
    return svg_wrap(d, 920, 260, "".join(body))


def b02():
    d = "b02"
    body = []
    # Top row
    body.append(box(30, 18, 210, 48, "SWC App / PncUser", ["Tầng Ứng Dụng"], "ind", header_band=True))
    body.append(arrow(d, 240, 42, 430, 42, "sky", width=2.2))
    body.append(edge_label(335, 25, "RequestComMode(FULL_COM)", "sky", 174))
    body.append(box(430, 18, 220, 48, "RTE / ComM", ["Communication Manager"], "ok", header_band=True))

    # Branch down from RTE/ComM (cx=540)
    body.append(path_arrow(d, "M 540 66 L 540 88 L 220 88 L 220 112", "ok"))
    body.append(edge_label(330, 88, "Bật HW Controller / Trcv", "ok", 156))
    body.append(path_arrow(d, "M 540 66 L 540 88 L 710 88 L 710 112", "vio"))
    body.append(edge_label(662, 88, "Đồng bộ chu trình", "vio", 122))

    # Row 2
    body.append(box(120, 112, 200, 48, "CanSM Core", ["CAN State Manager"], "ok", header_band=True))
    body.append(box(610, 112, 200, 48, "Nm Interface", ["Generic NM Layer"], "vio", header_band=True))

    # Arrows down to row 3
    body.append(arrow(d, 220, 160, 220, 190, "ok"))
    body.append(arrow(d, 710, 160, 710, 190, "vio"))

    # Row 3
    body.append(box(120, 190, 200, 50, "CanIf Driver", ["CAN Interface"], "mut", header_band=True))
    body.append(box(610, 190, 200, 50, "CanNM Core Engine", ["8-Byte NM PDU + Timers"], "sky", double=True, header_band=True))

    # Tx arrow between CanNM and CanIf
    body.append(arrow(d, 610, 215, 320, 215, "sky", width=2.4))
    body.append(edge_label(465, 215, "CanIf_Transmit(NM PDU 8-byte)", "sky", 198))

    # Bottom CAN Bus connecting both
    body.append(arrow(d, 220, 240, 220, 266, "ok"))
    body.append(arrow(d, 710, 240, 710, 266, "sky"))
    body.append(bus_rail(60, 272, 860, "CAN BUS VẬT LÝ (Đường truyền vi sai CAN_H / CAN_L)", "sky"))
    return svg_wrap(d, 920, 296, "".join(body))


def b03():
    d = "b03"
    body = []
    # Grid 3x3: cols x=50, 355, 670 (w=200); rows y=20, 116, 212 (h=52)
    body.append(box(50, 20, 200, 52, "SWC Ứng Dụng", ["Yêu cầu chế độ mạng"], "ind", header_band=True))
    body.append(box(355, 20, 210, 52, "ComM", ["Communication Manager"], "ok", header_band=True))
    body.append(box(670, 20, 200, 52, "CanSM", ["Bật/Tắt HW & Bus-Off"], "ok", header_band=True))

    body.append(box(50, 116, 200, 52, "BswM / EcuM", ["Quản lý Mode & Nguồn"], "warn", header_band=True))
    body.append(box(355, 116, 210, 52, "Nm Interface", ["Điều phối trung gian"], "vio", header_band=True))
    body.append(box(670, 116, 200, 52, "CanIf", ["Giao tiếp Driver Tx/Rx"], "mut", header_band=True))

    body.append(box(50, 212, 200, 52, "Det Log", ["CANNM_E_* Error Freeze"], "err", header_band=True))
    body.append(box(355, 212, 210, 54, "CanNM Engine", ["Core State Machine & Timers"], "sky", double=True, header_band=True))

    # Row 1 links
    body.append(arrow(d, 250, 46, 355, 46, "ind"))
    body.append(edge_label(302, 30, "Mode Req", "ind", 74))
    body.append(arrow(d, 565, 46, 670, 46, "ok"))
    body.append(edge_label(618, 30, "Mode Req", "ok", 74))

    # Vertical col 1: BswM/EcuM <-> SWC & Det -> BswM
    body.append(arrow(d, 150, 116, 150, 72, "warn"))
    body.append(edge_label(88, 94, "Trạng thái", "warn", 74))
    body.append(arrow(d, 150, 212, 150, 168, "err"))

    # Vertical col 2: ComM -> Nm -> CanNM
    body.append(arrow(d, 460, 72, 460, 116, "ok"))
    body.append(edge_label(520, 94, "Network Req", "ok", 86))
    body.append(arrow(d, 460, 168, 460, 212, "vio", bidir=True))
    body.append(edge_label(526, 190, "APIs & Callbacks", "vio", 104))

    # Vertical col 3: CanSM -> CanIf
    body.append(arrow(d, 770, 72, 770, 116, "ok"))
    body.append(edge_label(820, 94, "Bật HW", "ok", 64))

    # Nm -> BswM/EcuM & CanIf -> Nm
    body.append(arrow(d, 355, 142, 250, 142, "vio"))
    body.append(edge_label(302, 126, "State Change CB", "vio", 98))
    body.append(arrow(d, 670, 142, 565, 142, "mut"))

    # CanNM <-> Det & CanNM <-> CanIf
    body.append(arrow(d, 355, 239, 250, 239, "err"))
    body.append(edge_label(302, 223, "CANNM_E_*", "err", 84))
    body.append(path_arrow(d, "M 565 239 L 770 239 L 770 168", "sky", bidir=True))
    body.append(edge_label(685, 239, "Tx / Rx NM PDU", "sky", 110))
    return svg_wrap(d, 920, 282, "".join(body))


def b04():
    d = "b04"
    body = []
    # Root card: ComM
    body.append(zone(260, 12, 400, 96, "QUYỀN LẬP PHÁP (POLICY)", "warn", dashed=False))
    body.append(box(282, 28, 356, 68, "ComM — Communication Manager",
                    ["Ra quyết định chính sách:", "ECU được phép thức dậy hay đi ngủ"], "warn", title_size=13))

    # Branch to CanSM and CanNM
    body.append(path_arrow(d, "M 460 108 L 460 128 L 235 128 L 235 154", "ok"))
    body.append(path_arrow(d, "M 460 108 L 460 128 L 685 128 L 685 154", "sky"))

    body.append(zone(45, 146, 380, 108, "QUYỀN HÀNH PHÁP PHẦN CỨNG", "ok", dashed=False))
    body.append(box(65, 162, 340, 80, "CanSM — CAN State Manager",
                    ["Bật/Tắt Transceiver & CAN Controller,", "Xử lý phục hồi lỗi phần cứng Bus-Off"], "ok", title_size=12.5))

    body.append(zone(495, 146, 380, 108, "QUYỀN ĐIỀU PHỐI GIAO THỨC BUS", "sky", dashed=False))
    body.append(box(515, 162, 340, 80, "CanNM — CAN Network Management",
                    ["Thuật toán máy trạng thái phân tán,", "Bắn bản tin NM PDU & đếm timer giữ mạng"], "sky", double=True, title_size=12.5))
    return svg_wrap(d, 920, 270, "".join(body))


def b05():
    d = "b05"
    body = []
    # Left return rail area x=30..145, containers x=165..880 (w=715)
    body.append(zone(165, 20, 715, 195, "NM_MODE_NETWORK (Network Mode)", "sky", dashed=False))
    body.append(box(195, 42, 270, 58, "Repeat Message (RMS)", ["Bắt buộc vào đầu tiên! • RptTimer"], "sky", double=True, header_band=True))
    body.append(box(575, 42, 275, 58, "Normal Operation (NOS)", ["Phát định kỳ mỗi MsgCycleTime"], "ok", header_band=True))
    body.append(arrow(d, 465, 71, 575, 71, "ok"))
    body.append(edge_label(520, 53, "NetReq == 1", "ok", 82))

    body.append(box(240, 142, 560, 56, "Ready Sleep State (RSS)",
                    ["Dừng phát Tx bản tin NM • Chỉ lắng nghe bus & đếm lùi CanNmTimeoutTime"], "warn", header_band=True))
    body.append(path_arrow(d, "M 330 100 L 330 142", "warn"))
    body.append(edge_label(268, 120, "NetReq == 0", "warn", 88))
    body.append(path_arrow(d, "M 712 100 L 712 142", "warn"))
    body.append(edge_label(780, 120, "NetRelease()", "warn", 92))

    # Down to Prepare Bus-Sleep
    body.append(arrow(d, 520, 215, 520, 248, "err", width=2.2))
    body.append(edge_label(650, 231, "CanNmTimeoutTime hết hạn (0ms)", "err", 216))

    body.append(zone(165, 248, 715, 64, "PREPARE BUS-SLEEP MODE (PBSM)", "warn", dashed=False))
    body.append(box(190, 263, 665, 40, "Chạy đệm WaitBusSleepTimer (1500ms) • Phần cứng CAN vẫn mở sẵn sàng nghe lại", [], "warn", title_size=11))

    # Down to Bus-Sleep
    body.append(arrow(d, 520, 312, 520, 344, "mut", width=2.2))
    body.append(edge_label(662, 328, "CanNmWaitBusSleepTime hết hạn (0ms)", "mut", 238))

    body.append(zone(165, 344, 715, 64, "BUS-SLEEP MODE (BSM)", "ind", dashed=False))
    body.append(box(190, 359, 665, 40, "ECU ngủ sâu • Controller SLEEP, Transceiver STANDBY (Tiết kiệm < 100 µA)", [], "ind", title_size=11))

    # Return wakeup arrows on left
    body.append(path_arrow(d, "M 165 280 L 105 280 L 105 110 L 165 110", "ok", width=2.2))
    body.append(edge_label(88, 195, "Wakeup / NetReq", "ok", 118))

    body.append(path_arrow(d, "M 165 376 L 44 376 L 44 71 L 165 71", "sky", width=2.2))
    body.append(edge_label(68, 326, "PassiveStartUp", "sky", 104))
    return svg_wrap(d, 920, 422, "".join(body))


def b06():
    d = "b06"
    body = []
    entries = [
        (22, "Bus-Sleep Mode", "Active Wakeup / PassiveStartUp", "ind"),
        (82, "Prepare Bus-Sleep", "NetworkRequest / Rx NM PDU", "warn"),
        (142, "Ready Sleep State", "NetworkRequest / Rx RMR==1", "ok"),
        (202, "Normal Operation", "Bit RMR==1 hoặc lệnh SWC", "sky"),
    ]
    for ey, label, edge, col in entries:
        body.append(box(16, ey, 165, 44, label, [], col, title_size=11))
        body.append(path_arrow(d, f"M 181 {ey + 22} L 368 {ey + 22} L 368 134 L 408 134", col))
        body.append(edge_label(274, ey + 22, edge, col, 170, 19, 9.5))

    # Central Repeat Message block
    body.append(box(408, 66, 210, 136, "REPEAT MESSAGE (RMS)",
                    ["• Bắt buộc vào đầu tiên", "• Chạy RepeatMessageTimer", "• Bắn Burst Tx (nếu Active)"],
                    "sky", double=True, header_band=True, title_size=11.5, sub_size=10))

    # Decision Diamond
    body.append(arrow(d, 618, 134, 650, 134, "warn", width=2.2))
    body.append(diamond(714, 134, 64, 42, ["Hết Timer &", "NetReq == ?"], "warn", 10.5))

    # Two outputs
    body.append(path_arrow(d, "M 714 92 L 714 54 L 748 54", "ok"))
    body.append(edge_label(714, 72, "NetReq == 1", "ok", 78))
    body.append(box(748, 30, 156, 48, "Normal Operation", ["Tiếp tục phát Tx"], "ok", header_band=True, title_size=11))

    body.append(path_arrow(d, "M 714 176 L 714 214 L 748 214", "err"))
    body.append(edge_label(714, 196, "NetReq == 0", "err", 78))
    body.append(box(748, 190, 156, 48, "Ready Sleep", ["Ngưng phát Tx"], "err", header_band=True, title_size=11))
    return svg_wrap(d, 920, 264, "".join(body))


def b07():
    d = "b07"
    body = []
    # Axis line
    body.append('<line x1="130" y1="34" x2="886" y2="34" stroke="var(--hb-stroke)" stroke-width="1.5"/>')
    ticks = [(140, "0ms"), (225, "20ms"), (310, "40ms"), (395, "60ms"), (520, "100ms"), (850, "1060ms")]
    for tx, lbl in ticks:
        body.append(f'<line x1="{tx}" y1="28" x2="{tx}" y2="40" stroke="var(--hb-sky)" stroke-width="1.8"/>')
        body.append(f'<text x="{tx}" y="20" fill="var(--muted)" font-size="10.5" font-weight="700" text-anchor="middle" class="mono-svg">{lbl}</text>')

    # Track 1: Burst Mode ON
    body.append(box(14, 54, 108, 72, "Burst Mode", ["Immediate = 4", "Cycle = 20ms"], "ok", title_size=11, sub_size=9.5))
    body.append(zone(134, 54, 276, 72, "PHA 1: BURST TỨC THÌ ĐÁNH THỨC MẠNG", "ok", dashed=False))
    for i, tx in enumerate((164, 232, 300, 368), 1):
        body.append(pill(tx, 90, 56, 26, f"Tx#{i}", "ok", 10.5, solid=True))
    body.append(zone(420, 54, 476, 72, "PHA 2: PHÁT ĐỊNH KỲ CHUẨN", "sky", dashed=False))
    body.append(box(440, 74, 340, 38, "CanNmMsgCycleTime = 1000ms (Nhịp ổn định)", [], "sky", title_size=11))
    body.append(pill(836, 93, 66, 26, "Tx#5", "sky", 10.5, solid=True))

    # Track 2: No Burst
    body.append(box(14, 152, 108, 72, "Không Burst", ["Immediate = 0", "Trễ theo Offset"], "err", title_size=11, sub_size=9.5))
    body.append(zone(134, 152, 366, 72, "ĐỢI OFFSET (100ms)", "warn", dashed=True))
    body.append(pill(200, 188, 102, 26, "Chờ Offset...", "warn", 10))
    body.append(pill(360, 188, 120, 26, "Tx#1 (Quá muộn!)", "err", 10))
    body.append(zone(510, 152, 386, 72, "RỦI RO TIMEOUT MẠNG!", "err", dashed=True))
    body.append(box(526, 170, 254, 42, "Đợi tiếp 1000ms -> ECU khác", ["có thể đã bị Timeout sập ngủ!"], "err", title_size=10.5, sub_size=9.5))
    body.append(pill(836, 191, 66, 26, "Tx#2", "err", 10.5))
    return svg_wrap(d, 920, 242, "".join(body))


def b08():
    d = "b08"
    body = []
    body.append(zone(14, 22, 245, 166, "ECU #2 (Transmitter)", "ind", dashed=False))
    body.append(box(28, 46, 217, 126, "CanNm Tx PDU (8-Byte)",
                    ["• CAN ID: 0x500 + NodeID2", "• CBV Byte: [RMR, CSR, AWB]", "• UserData / PN Bitmask"],
                    "ind", header_band=True, title_size=11.5, sub_size=10))

    body.append(arrow(d, 259, 109, 345, 109, "sky", width=2.8))
    body.append(edge_label(302, 86, "CAN BUS", "sky", 72))
    body.append(edge_label(302, 130, "0x502", "ind", 62))

    body.append(zone(345, 22, 560, 166, "ECU #1 (Receiver — Node Đang Xét)", "sky", dashed=False))
    body.append(box(362, 56, 150, 98, "1. CanDrv -> CanIf", ["Ngắt Rx CAN phần cứng", "Chuyển lên CanNM"], "mut", header_band=True, title_size=11, sub_size=9.8))
    body.append(arrow(d, 512, 105, 536, 105, "sky"))
    body.append(box(536, 56, 146, 98, "2. RxIndication()", ["CanNm_RxIndication()", "Giải mã CBV & Mask"], "sky", header_band=True, title_size=11, sub_size=9.8))
    body.append(arrow(d, 682, 105, 706, 105, "warn"))
    body.append(diamond(756, 105, 50, 44, ["ECU1 ở", "State nào?"], "warn", 10.2))
    body.append(arrow(d, 806, 105, 822, 105, "ok"))
    body.append(box(822, 56, 74, 98, "Phân Xử", ["Ma trận", "hành vi"], "ok", title_size=10.5, sub_size=9.5))
    return svg_wrap(d, 920, 206, "".join(body))


def b09():
    d = "b09"
    body = []
    # Time axis markers
    cols = [(160, "t = 1900 ms"), (380, "t = 1950 ms (Chỉ còn 50ms là ngủ!)"), (720, "t = 1951 ms (Cứu sống kịp thời!)")]
    for cx, lbl in cols:
        body.append(f'<line x1="{cx}" y1="34" x2="{cx}" y2="215" stroke="var(--hb-stroke)" stroke-dasharray="4,4" stroke-width="1"/>')
        body.append(pill(cx, 20, 168 if cx == 160 else 230, 22, lbl, "sky" if cx == 720 else "warn", 10))

    # Row 1: ECU #1
    body.append(box(14, 58, 92, 54, "ECU #1", ["Target Node"], "sky", header_band=True))
    body.append(box(120, 58, 175, 54, "Ready Sleep", ["Timeout còn: 100ms"], "warn", title_size=11))
    body.append(arrow(d, 295, 85, 326, 85, "warn"))
    body.append(box(326, 58, 180, 54, "Ready Sleep", ["Timeout còn: 50ms!"], "err", title_size=11))
    body.append(arrow(d, 506, 85, 558, 85, "ok"))
    body.append(box(558, 52, 342, 66, "RELOAD TimeoutTime = 2000 ms!",
                    ["CanNm_RxIndication() -> ECU1 giữ Ready Sleep thêm 2s"], "ok", double=True, header_band=True, title_size=11.5, sub_size=10))

    # Row 2: ECU #2
    body.append(box(14, 154, 92, 54, "ECU #2", ["Remote Node"], "ind", header_band=True))
    body.append(box(120, 154, 240, 54, "Bất ngờ có nhu cầu truyền tin", ["Ứng dụng thức -> CanNm PDU"], "ind", title_size=11))
    body.append(arrow(d, 360, 181, 470, 181, "ind"))
    body.append(box(470, 154, 195, 54, "Bắn CanNm PDU (0x502)", ["Phát lên CAN Bus @ 1951ms"], "ind", title_size=11))
    body.append(path_arrow(d, "M 665 181 L 729 181 L 729 118", "ok", width=2.4))
    body.append(edge_label(795, 150, "CanIf -> CanNm_RxIndication()", "ok", 174))
    return svg_wrap(d, 920, 232, "".join(body))


def b10():
    d = "b10"
    body = []
    # Top triggers
    body.append(pill(215, 24, 210, 26, "Ứng dụng cần mạng: NetworkRequest()", "sky", 10))
    body.append(arrow(d, 215, 37, 215, 68, "sky"))
    body.append(pill(705, 24, 210, 26, "Ứng dụng hết việc: NetworkRelease()", "warn", 10))
    body.append(arrow(d, 705, 37, 705, 68, "warn"))

    # Two state cards
    body.append(box(50, 68, 330, 114, "NORMAL OPERATION STATE (NOS)",
                    ["• Truyền phát Tx: BẬT (Enable Tx)", "• Lắng nghe Rx: BẬT (Listen Rx)", "• Phát định kỳ mỗi CanNmMsgCycleTime"],
                    "sky", double=True, header_band=True, title_size=12, sub_size=10.5))
    body.append(box(540, 68, 330, 114, "READY SLEEP STATE (RSS)",
                    ["• Truyền phát Tx: TẮT (Silent Mode)", "• Lắng nghe Rx: BẬT (Listen Rx)", "• Đếm lùi CanNmTimeoutTime"],
                    "warn", header_band=True, title_size=12, sub_size=10.5))

    # Bidirectional arrows between NOS and RSS
    body.append(arrow(d, 380, 102, 540, 102, "warn", width=2.2))
    body.append(edge_label(460, 86, "CanNm_NetworkRelease()", "warn", 148))
    body.append(arrow(d, 540, 148, 380, 148, "sky", width=2.2))
    body.append(edge_label(460, 166, "CanNm_NetworkRequest()", "sky", 148))

    # Down to PBSM
    body.append(arrow(d, 705, 182, 705, 216, "err", width=2.2))
    body.append(edge_label(796, 198, "TimeoutTime = 0ms", "err", 124))
    body.append(box(540, 216, 330, 44, "Prepare Bus-Sleep Mode (PBSM)", ["Đếm WaitBusSleepTimer trước khi ngủ"], "err", title_size=11.5))
    return svg_wrap(d, 920, 276, "".join(body))


def b11():
    d = "b11"
    body = []
    # Nodes: BSM (left mid), RMS (top mid), NOS (top right), RSS (bot right), PBSM (bot mid)
    body.append(box(20, 118, 150, 74, "Bus-Sleep Mode", ["BSM (Ngủ sâu)"], "ind", header_band=True, title_size=11.5))
    body.append(box(270, 26, 200, 70, "Repeat Message", ["RMS (Khởi động/Điểm danh)"], "sky", double=True, header_band=True, title_size=11.5))
    body.append(box(660, 26, 230, 70, "Normal Operation", ["NOS (Giữ mạng & phát Tx)"], "ok", header_band=True, title_size=11.5))
    body.append(box(660, 206, 230, 70, "Ready Sleep", ["RSS (Dừng Tx, chờ Timeout)"], "warn", header_band=True, title_size=11.5))
    body.append(box(270, 206, 200, 70, "Prepare Bus-Sleep", ["PBSM (Đếm WaitBusSleep)"], "err", header_band=True, title_size=11.5))

    # (1)/(2) BSM -> RMS
    body.append(path_arrow(d, "M 95 118 L 95 61 L 270 61", "sky", width=2.2))
    body.append(num_badge(152, 61, "1", "sky"))
    body.append(num_badge(176, 61, "2", "ind"))
    body.append(edge_label(165, 36, "NetReq / PassiveStartUp", "sky", 148))

    # (3) RMS -> NOS
    body.append(arrow(d, 470, 61, 660, 61, "ok", width=2.2))
    body.append(num_badge(565, 61, "3", "ok"))
    body.append(edge_label(565, 36, "RptTimer=0 & NetReq=1", "ok", 146))

    # (4) RMS -> RSS diagonal clean elbow
    body.append(path_arrow(d, "M 425 96 L 425 148 L 620 148 L 620 226 L 660 226", "warn", width=2))
    body.append(num_badge(522, 148, "4", "warn"))
    body.append(edge_label(522, 126, "RptTimer=0 & NetReq=0", "warn", 146))

    # (5) NOS -> RSS & (6) RSS -> NOS
    body.append(arrow(d, 735, 96, 735, 206, "warn", width=2))
    body.append(num_badge(735, 151, "5", "warn"))
    body.append(edge_label(680, 178, "NetRelease", "warn", 78))

    body.append(arrow(d, 825, 206, 825, 96, "ok", width=2))
    body.append(num_badge(825, 151, "6", "ok"))
    body.append(edge_label(862, 124, "NetReq", "ok", 62))

    # (7) RSS -> PBSM
    body.append(arrow(d, 660, 250, 470, 250, "err", width=2.2))
    body.append(num_badge(565, 250, "7", "err"))
    body.append(edge_label(565, 275, "CanNmTimeoutTime = 0", "err", 142))

    # (8) PBSM -> RMS (Immediate Restart up)
    body.append(arrow(d, 350, 206, 350, 96, "vio", width=2.2))
    body.append(num_badge(350, 151, "8", "vio"))
    body.append(edge_label(248, 151, "Immediate Restart (NetReq/Rx)", "vio", 164))

    # (9) PBSM -> BSM
    body.append(path_arrow(d, "M 270 241 L 95 241 L 95 192", "ind", width=2.2))
    body.append(num_badge(165, 241, "9", "ind"))
    body.append(edge_label(165, 266, "WaitBusSleepTime = 0", "ind", 142))
    return svg_wrap(d, 920, 304, "".join(body))


def b12():
    d = "b12"
    body = []
    body.append(box(16, 48, 226, 86, "Prepare Bus-Sleep (PBSM)",
                    ["WaitBusSleepTimer đếm lùi:", "1500ms -> 800ms -> ..."], "warn", header_band=True, title_size=11.5))
    body.append(arrow(d, 242, 91, 290, 91, "err", width=2.2))
    body.append(diamond(370, 91, 80, 46, ["BẤT NGỜ!", "NetReq() / Rx PDU?"], "err", 10.5))
    body.append(arrow(d, 450, 91, 492, 91, "sky", width=2.2))
    body.append(edge_label(471, 66, "CÓ", "err", 42))

    body.append(zone(492, 22, 412, 162, "IMMEDIATE RESTART KÍCH HOẠT!", "sky", dashed=False))
    body.append(box(510, 42, 376, 36, "1. Lập tức HỦY bộ đếm WaitBusSleepTimer", [], "warn", title_size=11))
    body.append(arrow(d, 698, 78, 698, 92, "sky"))
    body.append(box(510, 92, 376, 36, "2. Chuyển ngay về Repeat Message State tại t = 0ms", [], "sky", title_size=11))
    body.append(arrow(d, 698, 128, 698, 142, "ok"))
    body.append(box(510, 142, 376, 34, "3. CanNmImmediateRestartEnabled = TRUE: Bắn Tx ngay!", [], "ok", title_size=10.8))
    return svg_wrap(d, 920, 202, "".join(body))


def b13():
    d = "b13"
    body = []
    # Address bar top
    body.append(box(18, 14, 884, 34, "CAN ID (11-bit / 29-bit) = BaseCanId (0x500) + NodeId (0x1A) = 0x51A", [], "sky", title_size=11.5, mono_sub=True))

    # 8 byte boxes
    bw = 104
    gap = 6
    x0 = 22
    byte_specs = [
        ("Byte 0", "SNI (NodeId)", "0x1A", "sky"),
        ("Byte 1", "CBV Vector", "0x10", "warn"),
        ("Byte 2", "User Data #0", "0x11 / PN0", "vio"),
        ("Byte 3", "User Data #1", "0x22 / PN1", "vio"),
        ("Byte 4", "User Data #2", "0x33", "mut"),
        ("Byte 5", "User Data #3", "0x44", "mut"),
        ("Byte 6", "User Data #4", "0x55", "mut"),
        ("Byte 7", "User Data #5", "0x66", "mut"),
    ]
    for i, (b_title, f_lbl, val, col) in enumerate(byte_specs):
        bx = x0 + i * (bw + gap)
        body.append(box(bx, 62, bw, 86, b_title, [f_lbl, val], col, header_band=True, title_size=11, sub_size=9.5, mono_sub=True))

    # Bottom grouping spans
    body.append(pill(22 + bw + gap / 2, 174, 214, 26, "Header Quản Lý Mạng (2 Bytes)", "sky", 10))
    body.append(pill(22 + 2 * (bw + gap) + (6 * bw + 5 * gap) / 2, 174, 650, 26,
                     "Khoang Dữ Liệu Ứng Dụng & Partial Networking (User Data / PNC — 6 Bytes)", "vio", 10.5))
    return svg_wrap(d, 920, 204, "".join(body))


def b14():
    d = "b14"
    body = []
    bits = [
        ("Bit 7", "Reserved", "Res7 (0)", "mut"),
        ("Bit 6", "PnInfoBit", "PNI (0x40)", "vio"),
        ("Bit 5", "Reserved", "Res5 (0)", "mut"),
        ("Bit 4", "ActiveWakeup", "AWB (0x10)", "ok"),
        ("Bit 3", "Reserved", "Res3 (0)", "mut"),
        ("Bit 2", "Reserved", "Res2 (0)", "mut"),
        ("Bit 1", "CoordSleep", "CSR (0x02)", "warn"),
        ("Bit 0", "RepeatMsgReq", "RMR (0x01)", "sky"),
    ]
    bw = 104
    gap = 6
    x0 = 22
    for i, (bt, name, code, col) in enumerate(bits):
        bx = x0 + i * (bw + gap)
        body.append(box(bx, 20, bw, 102, bt, [name, code], col, double=(col != "mut"),
                        header_band=True, title_size=11.5, sub_size=10, mono_sub=True))
    body.append(pill(460, 148, 520, 26, "MSB (Bit 7) ◄────────── Control Bit Vector (1 Byte = 8 Bits) ──────────► LSB (Bit 0)", "warn", 10.2))
    return svg_wrap(d, 920, 176, "".join(body))


def b15():
    d = "b15"
    body = []
    rows = [
        (18, "LAYOUT A", "AUTOSAR Chuẩn", "sky",
         [(128, "Byte 0: SNI (NodeID)", "sky"), (128, "Byte 1: CBV", "warn"), (414, "Bytes 2..7: User Data (6 Bytes)", "ok")]),
        (86, "LAYOUT B", "OEM Variant", "vio",
         [(128, "Byte 0: CBV", "warn"), (128, "Byte 1: SNI (NodeID)", "sky"), (414, "Bytes 2..7: User Data (6 Bytes)", "ok")]),
        (154, "LAYOUT C", "Full Payload (OFF NID)", "ok",
         [(128, "OFF: Không NID", "mut"), (128, "Byte 0: CBV", "warn"), (414, "Bytes 1..7: User Data (7 Bytes!)", "ok")]),
    ]
    for ry, rname, rsub, col, slots in rows:
        body.append(box(14, ry, 186, 50, rname, [rsub], col, header_band=True, title_size=11))
        cx = 212
        for sw, stxt, scol in slots:
            body.append(box(cx, ry + 3, sw, 44, stxt, [], scol, double=(ry == 154 and scol == "ok"), title_size=10.2))
            cx += sw + 10
    return svg_wrap(d, 920, 220, "".join(body))


def b16():
    d = "b16"
    body = []
    body.append(box(16, 72, 200, 68, "COM Module", ["Signal Transmission:", "Odo, Speed, Engine Status"], "ind", header_band=True, title_size=11.5))
    body.append(arrow(d, 216, 106, 268, 106, "ind", width=2.2))
    body.append(box(268, 72, 165, 68, "PduR Router", ["Định tuyến I-PDU", "theo TxPduId"], "warn", header_band=True, title_size=11.5))

    # Branch to Top (Normal COM) and Bottom (CanNM User Data)
    body.append(path_arrow(d, "M 433 106 L 465 106 L 465 52 L 502 52", "ok", width=2.2))
    body.append(edge_label(500, 24, "Đường 1: COM I-PDU thường", "ok", 168))
    body.append(box(502, 28, 178, 48, "CanIf_Transmit()", ["Gửi trực tiếp CanIf"], "ok", title_size=11))
    body.append(arrow(d, 680, 52, 718, 52, "ok", width=2.2))
    body.append(box(718, 28, 186, 48, "Khung CAN Data", ["Dữ liệu ứng dụng thường"], "ok", header_band=True, title_size=11))

    body.append(path_arrow(d, "M 433 106 L 465 106 L 465 162 L 502 162", "sky", width=2.2))
    body.append(edge_label(500, 196, "Đường 2: NM User Data", "sky", 156))
    body.append(box(502, 136, 178, 52, "CanNm_TriggerTransmit", ["/ CanNm_SetUserData()"], "sky", title_size=10.5))
    body.append(arrow(d, 680, 162, 718, 162, "sky", width=2.2))
    body.append(box(718, 136, 186, 52, "Khung NM PDU", ["Đóng gói vào Bytes 2..7"], "sky", double=True, header_band=True, title_size=11))
    return svg_wrap(d, 920, 220, "".join(body))


def b17():
    d = "b17"
    body = []
    xs = [85, 250, 455, 670, 845]
    parts = [("CAN Bus", "mut"), ("CanIf", "ind"), ("CanNM (Bus-Sleep)", "sky"), ("Nm / ComM", "vio"), ("CanSM", "ok")]
    for lx, (pname, pcol) in zip(xs, parts):
        body.append(f'<line x1="{lx}" y1="54" x2="{lx}" y2="338" stroke="var(--hb-stroke)" stroke-dasharray="5,4" stroke-width="1.5"/>')
        body.append(box(lx - 72, 12, 144, 42, pname, [], pcol, header_band=False, title_size=11))

    # Step 1: CAN Bus -> CanIf
    body.append(arrow(d, xs[0], 78, xs[1], 78, "ind", width=2))
    body.append(edge_label(167, 70, "1. Khung NM PDU", "ind", 118))
    # Step 2: CanIf -> CanNM
    body.append(arrow(d, xs[1], 110, xs[2], 110, "sky", width=2))
    body.append(edge_label(352, 102, "2. CanNm_RxIndication()", "sky", 148))
    # Step 3: DET box on CanNM
    body.append(pill(xs[2], 144, 210, 24, "3. Báo lỗi DET: CANNM_E_NET_START_IND", "err", 9.8))
    # Step 4: CanNM -> Nm / ComM
    body.append(arrow(d, xs[2], 178, xs[3], 178, "vio", width=2))
    body.append(edge_label(562, 170, "4. Nm_NetworkStartIndication()", "vio", 174))
    # Step 5: Self-loop arrow on CanNM explaining "MŨI TÊN QUAY VÒNG"
    body.append(path_arrow(d, f"M {xs[2]} 202 L {xs[2] + 62} 202 L {xs[2] + 62} 234 L {xs[2] + 4} 234", "warn", width=2.2))
    body.append(pill(xs[2] - 78, 218, 224, 26, "5. [QUAY VÒNG] Vẫn giữ Bus-Sleep Mode!", "warn", 10))
    # Step 6: Nm/ComM -> CanSM
    body.append(arrow(d, xs[3], 256, xs[4], 256, "ok", width=2))
    body.append(edge_label(757, 248, "6. Bật HW Controller", "ok", 132))
    # Step 7: Nm/ComM -> CanNM
    body.append(arrow(d, xs[3], 288, xs[2], 288, "ok", width=2.4))
    body.append(edge_label(562, 280, "7. Nm_PassiveStartUp() (Lệnh chính thức)", "ok", 220))
    # Step 8: Destination State
    body.append(box(xs[2] - 115, 306, 230, 34, "8. [ĐÍCH ĐẾN] REPEAT_MESSAGE State!", [], "ok", double=True, title_size=10.5))
    return svg_wrap(d, 920, 352, "".join(body))


def b18():
    d = "b18"
    body = []
    body.append(zone(16, 18, 888, 150, "NM_MODE_NETWORK (4 Bộ Định Thời Hoạt Động Song Song)", "sky", dashed=False))
    cards = [
        (36, 40, "1. CanNmTimeoutTime (2000ms)", ["Đồng hồ sinh tử toàn mạng (Reload khi Tx/Rx)"], "sky"),
        (468, 40, "2. CanNmRepeatMessageTime (1500ms)", ["Cửa sổ đóng băng bắt buộc tại Repeat Message"], "ind"),
        (36, 102, "3. CanNmMsgCycleTime (1000ms)", ["Chu kỳ phát bản tin NM định kỳ"], "ok"),
        (468, 102, "4. CanNmMsgTimeoutTime (500ms)", ["Giám sát lỗi nghẽn TxConfirmation phần cứng"], "err"),
    ]
    for cx, cy, ct, cl, col in cards:
        body.append(box(cx, cy, 416, 52, ct, cl, col, header_band=True, title_size=11, sub_size=10))

    body.append(arrow(d, 460, 168, 460, 206, "warn", width=2.4))
    body.append(edge_label(548, 187, "TimeoutTime chạm 0ms", "warn", 148))

    body.append(zone(16, 206, 888, 72, "PREPARE BUS-SLEEP MODE", "warn", dashed=False))
    body.append(box(120, 224, 680, 44, "5. CanNmWaitBusSleepTime (1500ms)",
                    ["Bộ đếm thời gian đệm trước khi ra lệnh CanSM tắt hoàn toàn Controller & Transceiver"],
                    "warn", header_band=True, title_size=11.5, sub_size=10))
    return svg_wrap(d, 920, 290, "".join(body))


def b19():
    d = "b19"
    body = []
    # Scaled 0ms..2000ms axis across x=60..860 (800px = 2000ms => 0.4px/ms)
    markers = [
        (60, "0 ms", "Phát Tx #1", "sky"),
        (460, "1000 ms (MsgCycleTime)", "Hạn phát Tx #2", "ok"),
        (660, "1500 ms", "Đệm +500 ms", "warn"),
        (860, "2000 ms (TimeoutTime)", "Hạn chót sập mạng!", "err"),
    ]
    for mx, mt, mb, col in markers:
        body.append(pill(mx, 26, 146 if mx != 60 else 80, 24, mt, col, 9.8))
        body.append(f'<line x1="{mx}" y1="38" x2="{mx}" y2="70" stroke="var(--hb-{col})" stroke-width="2"/>')

    # Segment bars
    body.append(box(60, 70, 400, 58, "Khoảng Chu Kỳ Phát (CanNmMsgCycleTime)", ["1000 ms"], "sky", header_band=True, title_size=11))
    body.append(box(460, 70, 200, 58, "Khoảng Đệm An Toàn", ["Tx Jitter + Drop Frame (+500ms)"], "ok", header_band=True, title_size=11, sub_size=9.5))
    body.append(box(660, 70, 200, 58, "Vùng Nguy Hiểm Timeout", ["Mất >1 gói vẫn kịp cứu!"], "err", header_band=True, title_size=11, sub_size=9.5))

    # Bottom markers
    for mx, _, mb, col in markers:
        body.append(f'<line x1="{mx}" y1="128" x2="{mx}" y2="152" stroke="var(--hb-{col})" stroke-width="1.8"/>')
        body.append(pill(mx, 166, 152 if mx != 60 else 100, 24, mb, col, 10))
    return svg_wrap(d, 920, 196, "".join(body))


def b20():
    d = "b20"
    body = []
    body.append(box(16, 94, 156, 56, "Active Wakeup", ["Event kích hoạt"], "ind", header_band=True, title_size=11))
    body.append(arrow(d, 172, 122, 212, 122, "sky"))
    body.append(diamond(304, 122, 92, 50, ["CanNmImmediate", "NmTransmissions > 0?"], "warn", 10))

    # Branch YES (Top)
    body.append(path_arrow(d, "M 304 72 L 304 42 L 424 42", "ok", width=2.2))
    body.append(edge_label(364, 42, "CÓ (TRUE)", "ok", 78))
    body.append(box(424, 16, 236, 52, "Bắn ngay Tx #1 @ t = 0 ms", ["Chu kỳ = ImmediateNmCycle (20ms)"], "ok", header_band=True, title_size=10.8, sub_size=9.5))
    body.append(arrow(d, 660, 42, 704, 42, "ok"))
    body.append(box(704, 16, 196, 52, "Bắn hết N gói Burst", ["Đánh thức tức thì toàn bus"], "ok", title_size=10.8, sub_size=9.5))

    # Branch NO (Bottom)
    body.append(path_arrow(d, "M 304 172 L 304 202 L 424 202", "err", width=2.2))
    body.append(edge_label(364, 202, "KHÔNG (FALSE)", "err", 94))
    body.append(box(424, 176, 260, 52, "Đợi CanNmMsgCycleOffset (100ms)", ["Rồi mới phát Tx #1 định kỳ"], "err", header_band=True, title_size=10.8, sub_size=9.5))

    # Merge to Final Block
    body.append(path_arrow(d, "M 802 68 L 802 96", "sky"))
    body.append(path_arrow(d, "M 684 202 L 802 202 L 802 148", "sky"))
    body.append(box(704, 96, 196, 52, "Chu Kỳ Chuẩn", ["CanNmMsgCycleTime (1000ms)"], "sky", double=True, title_size=11, sub_size=10))
    return svg_wrap(d, 920, 244, "".join(body))


def b21():
    d = "b21"
    body = []
    body.append(bus_rail(30, 28, 890, "CAN BUS XE VẬT LÝ — ISO 11898-6 SELECTIVE WAKEUP", "sky"))
    clusters = [
        (30, "PNC #1: CỤM SƯỞI GHẾ", ["• Ghế lái (ECU_SeatL)", "• Ghế phụ (ECU_SeatR)"], "NGỦ SAY < 100 µA", "mut", False),
        (325, "PNC #2: CỤM ĐÈN CHIẾU", ["• Đèn trước (ECU_HeadL)", "• Đèn sau (ECU_TailL)"], "NGỦ SAY < 100 µA", "mut", False),
        (620, "PNC #3: CỤM SẠC PIN (EV)", ["• Bộ sạc On-Board (OBC)", "• Quản lý pin (BMS)"], "THỨC DẬY KHI CẮM SẠC!", "ok", True),
    ]
    for cx, title, items, badge_txt, col, active in clusters:
        mid = cx + 135
        body.append(arrow(d, mid, 30, mid, 66, col, width=2.2))
        body.append(box(cx, 66, 270, 96, title, items, col, double=active, header_band=True, title_size=11, sub_size=10))
        body.append(pill(mid, 186, 210, 26, badge_txt, col, 10, solid=active))
    return svg_wrap(d, 920, 218, "".join(body))


def b22():
    d = "b22"
    body = []
    # Top Pipeline: EIRA
    body.append(box(16, 20, 175, 48, "Bản tin NM Rx từ bus", ["CanNm_RxIndication()"], "sky", title_size=10.8, sub_size=9.5))
    body.append(arrow(d, 191, 44, 232, 44, "sky"))
    body.append(box(232, 20, 165, 48, "Bộ lọc PN Mask", ["So Bitwise AND"], "vio", title_size=11))
    body.append(arrow(d, 397, 44, 444, 44, "vio"))
    body.append(box(444, 20, 224, 48, "EIRA (Ext + Int Req)", ["Hợp nhất tất cả kênh & nội bộ"], "ok", double=True, header_band=True, title_size=10.8))
    body.append(arrow(d, 668, 44, 714, 44, "ok"))
    body.append(box(714, 20, 190, 48, "ComM PNC State Machine", ["Bật/Tắt cụm PNC toàn ECU"], "ok", title_size=10.5))

    # Internal SWC feed
    body.append(box(232, 92, 165, 42, "Nhu cầu nội bộ SWC", ["ComM_RequestComMode"], "ind", title_size=10.5))
    body.append(path_arrow(d, "M 397 113 L 556 113 L 556 68", "ind"))

    # Bottom Pipeline: ERA
    body.append(box(16, 158, 175, 48, "Kênh CAN Gateway", ["Từng kênh vật lý riêng"], "warn", title_size=10.8, sub_size=9.5))
    body.append(arrow(d, 191, 182, 232, 182, "warn"))
    body.append(box(232, 158, 165, 48, "Bộ lọc Gateway ERA", ["Tách riêng từng bus CAN"], "warn", title_size=10.8))
    body.append(arrow(d, 397, 182, 444, 182, "warn"))
    body.append(box(444, 158, 224, 48, "ERA (External Only)", ["Chỉ tính yêu cầu từ bus ngoài"], "warn", header_band=True, title_size=10.8))
    body.append(arrow(d, 668, 182, 714, 182, "warn"))
    body.append(box(714, 158, 190, 48, "ComM Router Gateway", ["Chuyển tiếp PNC sang bus khác"], "warn", title_size=10.5))
    return svg_wrap(d, 920, 224, "".join(body))


def b23():
    d = "b23"
    body = []
    l1, l2 = 220, 700
    body.append(f'<line x1="{l1}" y1="54" x2="{l1}" y2="210" stroke="var(--hb-stroke)" stroke-dasharray="5,4" stroke-width="1.6"/>')
    body.append(f'<line x1="{l2}" y1="54" x2="{l2}" y2="210" stroke="var(--hb-stroke)" stroke-dasharray="5,4" stroke-width="1.6"/>')
    body.append(box(l1 - 125, 14, 250, 42, "ECU #1 (PNC Coordinator)", ["Điều phối đồng bộ tắt PNC"], "sky", header_band=True))
    body.append(box(l2 - 125, 14, 250, 42, "ECU #2 (PNC Client)", ["Thực thi tắt cụm mạng con"], "vio", header_band=True))

    # Message 1
    body.append(arrow(d, l1, 88, l2, 88, "warn", width=2.4))
    body.append(edge_label(460, 76, "Phát NM PDU: Cờ PNC = 0, Cờ CSR = 1 (Báo chuẩn bị tắt)", "warn", 344))
    # Action on ECU 2
    body.append(pill(l2, 122, 232, 26, "Nhận tin -> Chuẩn bị tắt App SWC", "vio", 10))
    # Sync wait
    body.append(arrow(d, l1, 160, l2, 160, "sky", bidir=True, dashed=True, width=2))
    body.append(edge_label(460, 160, "Đợi đồng bộ hết CanNmPnResetTime", "sky", 232))
    # Final Banner
    body.append(box(120, 192, 680, 42, "TẮT ĐỒNG THỜI CỤM PNC #1 TRÊN CẢ 2 ECU",
                    ["Không gây mất gói hoặc lỗi truyền thông dữ liệu cuối chu kỳ!"], "ok", double=True, title_size=11.5))
    return svg_wrap(d, 920, 248, "".join(body))


def b24():
    d = "b24"
    body = []
    body.append(box(120, 18, 280, 50, "Khóa cửa / Cảnh báo trộm", ["Sự kiện khẩn cấp toàn xe"], "warn", header_band=True))
    body.append(arrow(d, 400, 43, 470, 43, "err", width=2.2))
    body.append(box(470, 18, 310, 50, "NM PDU (CarWakeup Byte = 0x55)", ["Bật cờ CSR / Bit đánh thức xe"], "err", double=True, header_band=True))
    body.append(arrow(d, 625, 68, 625, 114, "err", width=2.4))

    body.append(bus_rail(40, 118, 880, "CAN BUS TOÀN XE (PHÁT QUẢNG BÁ ĐÁNH THỨC)", "err"))

    targets = [(70, "Đánh thức ECU Đèn"), (345, "Đánh thức Còi hú"), (620, "Đánh thức Gateway")]
    for tx, tlbl in targets:
        mid = tx + 115
        body.append(arrow(d, mid, 120, mid, 160, "err", width=2.2))
        body.append(box(tx, 160, 230, 48, tlbl, ["Nm_CarWakeUpIndication()"], "ok", header_band=True, title_size=11))
    return svg_wrap(d, 920, 224, "".join(body))


def b25():
    d = "b25"
    body = []
    stages = [
        (18, "1. Khởi động BSW", ["CanNm_Init(&Config)"], "ind"),
        (246, "2. Đánh thức mạng", ["NetworkRequest() /", "PassiveStartUp()"], "ok"),
        (474, "3. Chu kỳ vận hành", ["CanNm_MainFunction()", "(Chu kỳ 100ms)"], "sky"),
        (702, "4. Nhả & Tắt ECU", ["NetworkRelease() ->", "CanNm_DeInit()"], "err"),
    ]
    for i, (sx, st, sl, col) in enumerate(stages):
        body.append(box(sx, 26, 200, 74, st, sl, col, double=(i == 2), header_band=True, title_size=11, sub_size=10, mono_sub=True))
        if i < 3:
            body.append(arrow(d, sx + 200, 63, sx + 228, 63, col, width=2.2))

    # Sub-call User Data under Stage 3
    body.append(arrow(d, 574, 100, 574, 146, "vio", width=2, bidir=True))
    body.append(edge_label(650, 124, "Cập nhật payload", "vio", 118))
    body.append(box(454, 146, 240, 48, "CanNm_SetUserData()", ["Ghi 6 bytes User Data đồng bộ"], "vio", title_size=11, mono_sub=False))
    return svg_wrap(d, 920, 212, "".join(body))


def b26():
    d = "b26"
    body = []
    # Left blocks
    body.append(box(18, 22, 190, 52, "CanIf Driver (Rx)", ["Lớp giao tiếp CAN thấp"], "ind", header_band=True))
    body.append(box(18, 92, 190, 52, "CanIf Driver (Tx)", ["Xác nhận phát xong"], "ind", header_band=True))
    body.append(box(18, 162, 190, 52, "PduR Router", ["Cung cấp User Data"], "vio", header_band=True))

    # Center Hub
    body.append(box(360, 42, 200, 152, "CanNM Engine",
                    ["• Máy Trạng Thái", "• Quản Lý 5 Timers", "• Đóng Gói CBV & SNI"],
                    "sky", double=True, header_band=True, title_size=12.5, sub_size=10.5))

    # Right block
    body.append(box(712, 42, 190, 152, "Nm / ComM",
                    ["Tầng Điều Phối Trên", "(Thông báo trạng thái", "mạng theo chuẩn Nm)"],
                    "ok", header_band=True, title_size=12, sub_size=10))

    # Left <-> Center arrows
    body.append(arrow(d, 208, 48, 360, 74, "ind", width=2))
    body.append(edge_label(284, 61, "CanNm_RxIndication()", "ind", 138))

    body.append(arrow(d, 208, 118, 360, 118, "ind", width=2))
    body.append(edge_label(284, 118, "CanNm_TxConfirmation()", "ind", 142))

    body.append(arrow(d, 360, 166, 208, 188, "vio", width=2))
    body.append(edge_label(284, 177, "CanNm_TriggerTransmit()", "vio", 144))

    # Center -> Right arrows
    body.append(arrow(d, 560, 74, 712, 74, "ok", width=2))
    body.append(edge_label(636, 74, "Nm_NetworkMode()", "ok", 132))

    body.append(arrow(d, 560, 118, 712, 118, "warn", width=2))
    body.append(edge_label(636, 118, "Nm_BusSleepMode()", "warn", 132))

    body.append(arrow(d, 560, 162, 712, 162, "sky", width=2))
    body.append(edge_label(636, 162, "Nm_StateChangeNotif()", "sky", 142))
    return svg_wrap(d, 920, 232, "".join(body))


def b27():
    d = "b27"
    body = [
        box(16, 72, 158, 56, "CanNM API Call", ["Gọi từ lớp trên/dưới"], "sky", header_band=True),
        arrow(d, 174, 100, 214, 100, "sky"),
        diamond(324, 100, 110, 54, ["Kiểm tra Init?", "NULL Ptr? Kênh?"], "warn", 10.5),
        # Valid top branch
        path_arrow(d, "M 324 46 L 324 26 L 504 26", "ok", width=2.2),
        edge_label(414, 26, "HỢP LỆ (OK)", "ok", 94),
        box(504, 8, 396, 42, "Thực thi logic CanNM Engine bình thường", [], "ok", title_size=11),
        # Error right branch
        arrow(d, 434, 100, 504, 100, "err", width=2.2),
        edge_label(468, 80, "CÓ LỖI!", "err", 64),
        box(504, 71, 396, 58, "Det_ReportError(ModuleID=31, Instance=0, Api, Err)",
            ["Từ chối & báo lỗi chuẩn AUTOSAR DET (CANNM_E_*)"], "err", double=True, header_band=True, title_size=10.5, sub_size=9.5),
        arrow(d, 702, 129, 702, 158, "err", width=2),
        box(504, 158, 396, 50, "Ghi RAM Freeze Frame / Báo chẩn đoán Dcm", [], "warn", title_size=11),
    ]
    return svg_wrap(d, 920, 224, "".join(body))


def b28():
    d = "b28"
    body = []
    body.append(box(16, 116, 210, 74, "CanNmGlobalConfig", ["Gốc Cây Cấu Hình ECUC", "(AUTOSAR ARXML Container)"], "sky", double=True, header_band=True, title_size=12))
    spine_x = 276
    body.append(f'<line x1="226" y1="153" x2="{spine_x}" y2="153" stroke="var(--hb-sky)" stroke-width="2.2"/>')
    body.append(f'<line x1="{spine_x}" y1="34" x2="{spine_x}" y2="284" stroke="var(--hb-sky)" stroke-width="2.2"/>')

    items = [
        (14,  "1. CanNmGeneral",       "DevErrorDetect, PassiveMode, ActiveWakeupBit...",          "ind"),
        (64,  "2. CanNmChannelConfig", "MainFunctionPeriod, MsgCycleTime, TimeoutTime...",          "sky"),
        (114, "3. CanNmPduConfig",     "PduNidPosition, PduCbvPosition, BaseCanId, NodeId...",      "ok"),
        (164, "4. CanNmBurstConfig",   "ImmediateTransmissions, ImmediateCycleTime...",             "warn"),
        (214, "5. CanNmPnFilterConfig","PnEnabled, PnFilterMask, PnResetTime...",                   "vio"),
        (264, "6. CanNmUserDataConfig","UserDataSupport, ComUserDataSupport...",                    "err"),
    ]
    for iy, t, desc, col in items:
        mid_y = iy + 20
        body.append(arrow(d, spine_x, mid_y, 316, mid_y, col, width=2))
        body.append(box(316, iy, 224, 40, t, [], col, title_size=11))
        body.append(box(548, iy, 354, 40, desc, [], "mut", title_size=10, mono_sub=True))
    return svg_wrap(d, 920, 316, "".join(body))


DIAGRAMS = {
    1: b01, 2: b02, 3: b03, 4: b04, 5: b05, 6: b06, 7: b07,
    8: b08, 9: b09, 10: b10, 11: b11, 12: b12, 13: b13, 14: b14,
    15: b15, 16: b16, 17: b17, 18: b18, 19: b19, 20: b20, 21: b21,
    22: b22, 23: b23, 24: b24, 25: b25, 26: b26, 27: b27, 28: b28,
}


def get_diagram(idx):
    fn = DIAGRAMS.get(idx)
    if not fn:
        raise KeyError(f"Unknown diagram index: {idx}")
    return fn()
