r"""Static & geometric verification suite for D:\__Personal\AntiGravity\Simulation\AUTOSAR_FiM.html."""

import json
import os
import re
import sys
import xml.etree.ElementTree as ET

BASE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(BASE)
HTML_PATH = os.path.join(ROOT, "Simulation", "AUTOSAR_FiM.html")

sys.path.insert(0, BASE)
from hb_diagrams_fim import DIAGRAMS  # noqa: E402


def fail(msg: str) -> None:
    print(f"[FAIL] {msg}")
    sys.exit(1)


def ok(msg: str) -> None:
    print(f"[PASS] {msg}")


def check_js_balance(js_code: str) -> None:
    """Scan JS for balanced braces/parens/brackets, strings, templates, comments."""
    i = 0
    n = len(js_code)
    stack = []
    # Track template literal expression braces separately
    tpl_brace_stack = []
    mode = "CODE"  # CODE, SQ, DQ, TPL, LINE_CMT, BLK_CMT
    regex_prev_chars = set("(=,:;![?&|+-*/%^~{")
    last_non_ws = "("

    while i < n:
        ch = js_code[i]
        nxt = js_code[i + 1] if i + 1 < n else ""

        if mode == "LINE_CMT":
            if ch == "\n":
                mode = "CODE"
            i += 1
            continue

        if mode == "BLK_CMT":
            if ch == "*" and nxt == "/":
                mode = "CODE"
                i += 2
            else:
                i += 1
            continue

        if mode == "SQ":
            if ch == "\\":
                i += 2
                continue
            if ch == "'":
                mode = "CODE"
                last_non_ws = "'"
            i += 1
            continue

        if mode == "DQ":
            if ch == "\\":
                i += 2
                continue
            if ch == '"':
                mode = "CODE"
                last_non_ws = '"'
            i += 1
            continue

        if mode == "TPL":
            if ch == "\\":
                i += 2
                continue
            if ch == "`":
                mode = "CODE"
                last_non_ws = "`"
                i += 1
                continue
            if ch == "$" and nxt == "{":
                stack.append(("{", i))
                tpl_brace_stack.append(len(stack))
                mode = "CODE"
                last_non_ws = "{"
                i += 2
                continue
            i += 1
            continue

        # CODE mode
        if ch in " \t\r\n":
            i += 1
            continue

        if ch == "/" and nxt == "/":
            mode = "LINE_CMT"
            i += 2
            continue
        if ch == "/" and nxt == "*":
            mode = "BLK_CMT"
            i += 2
            continue

        # Simple regex literal detector
        if ch == "/" and last_non_ws in regex_prev_chars:
            j = i + 1
            in_cls = False
            closed = False
            while j < n and js_code[j] != "\n":
                c = js_code[j]
                if c == "\\":
                    j += 2
                    continue
                if c == "[":
                    in_cls = True
                elif c == "]":
                    in_cls = False
                elif c == "/" and not in_cls:
                    closed = True
                    j += 1
                    break
                j += 1
            if closed:
                while j < n and js_code[j] in "gimsuyd":
                    j += 1
                last_non_ws = "R"
                i = j
                continue

        if ch == "'":
            mode = "SQ"
            i += 1
            continue
        if ch == '"':
            mode = "DQ"
            i += 1
            continue
        if ch == "`":
            mode = "TPL"
            i += 1
            continue

        if ch in "({[":
            stack.append((ch, i))
            last_non_ws = ch
        elif ch in ")}]":
            expected = {")": "(", "}": "{", "]": "["}[ch]
            if not stack or stack[-1][0] != expected:
                line_no = js_code[:i].count("\n") + 1
                fail(f"JS delimiter mismatch '{ch}' at script line {line_no}")
            stack.pop()
            if ch == "}" and tpl_brace_stack and len(stack) == tpl_brace_stack[-1] - 1:
                tpl_brace_stack.pop()
                mode = "TPL"
            last_non_ws = ch
        else:
            last_non_ws = ch
        i += 1

    if mode != "CODE":
        fail(f"Unclosed JS string/comment/template state at EOF: {mode}")
    if stack:
        ch, pos = stack[-1]
        line_no = js_code[:pos].count("\n") + 1
        fail(f"Unclosed JS '{ch}' opened at script line {line_no}")
    ok("JS syntax delimiters, strings, comments & template literals balanced")


def check_handbook_svgs() -> None:
    expected_keys = {
        "decoupling", "init_seq", "io_map", "bitwise_arch", "mask_truth", "cold_start_0x6d",
        "push_vs_poll", "polling_budget", "clear_dtc_dual", "many_to_many", "summary_event",
        "component_dag", "avail_gate", "cascading_block", "fail_safe", "obd_iumpr",
        "det_guard", "ecuc_tree"
    }
    if set(DIAGRAMS.keys()) != expected_keys:
        fail(f"Mismatch in diagram keys: {set(DIAGRAMS.keys()) ^ expected_keys}")

    errors = []
    for name, svg_str in DIAGRAMS.items():
        try:
            root = ET.fromstring(svg_str)
        except ET.ParseError as e:
            errors.append(f"Handbook SVG '{name}' invalid XML: {e}")
            continue

        vb = root.attrib.get("viewBox", "")
        parts = [float(x) for x in vb.split()]
        if len(parts) != 4:
            errors.append(f"Handbook SVG '{name}' missing viewBox")
            continue
        _, _, vb_w, vb_h = parts

        boxes = []
        children = list(root)
        for idx, elem in enumerate(children):
            cls = elem.attrib.get("class", "")
            if "svg-box" in cls:
                bx = float(elem.attrib["x"])
                by = float(elem.attrib["y"])
                bw = float(elem.attrib["width"])
                bh = float(elem.attrib["height"])
                if bx < 0 or by < 0 or bx + bw > vb_w or by + bh > vb_h:
                    errors.append(f"SVG '{name}' box out of viewBox bounds: ({bx},{by},{bw},{bh})")
                boxes.append((bx, by, bw, bh))

                k = idx + 1
                while k < len(children) and children[k].tag.endswith("text"):
                    t_el = children[k]
                    if t_el.attrib.get("text-anchor") == "middle":
                        fs = float(t_el.attrib.get("font-size", "10"))
                        txt = t_el.text or ""
                        est_w = len(txt) * fs * 0.58
                        if est_w > bw - 6:
                            errors.append(f"SVG '{name}' text overflow ({est_w:.1f} > {bw-6}): '{txt}'")
                    k += 1

        for elem in root.iter():
            if "svg-pill" in elem.attrib.get("class", ""):
                rect_el = None
                for c in elem:
                    if c.tag.endswith("rect"):
                        rect_el = c
                        break
                if rect_el is not None:
                    px = float(rect_el.attrib["x"])
                    py = float(rect_el.attrib["y"])
                    pw = float(rect_el.attrib["width"])
                    ph = float(rect_el.attrib["height"])
                    if px < 0 or py < 0 or px + pw > vb_w or py + ph > vb_h:
                        errors.append(f"SVG '{name}' pill out of viewBox: ({px},{py},{pw},{ph})")
                    for (bx, by, bw, bh) in boxes:
                        if px < bx + bw and px + pw > bx and py < by + bh and py + ph > by:
                            errors.append(f"SVG '{name}' pill ({px},{py},{pw},{ph}) overlaps box ({bx},{by},{bw},{bh})")

    if errors:
        fail("Handbook SVG errors:\n  - " + "\n  - ".join(errors))

    ok(f"All {len(DIAGRAMS)} Handbook inline SVGs valid XML with zero text overflow & zero pill-box overlap")


def main() -> None:
    if not os.path.exists(HTML_PATH):
        fail(f"Missing assembled file: {HTML_PATH}")

    with open(HTML_PATH, "r", encoding="utf-8") as f:
        html_doc = f.read()

    # 1. Offline verification (no CDN URLs in tags)
    ext_links = re.findall(r'<(?:script|link)[^>]+(?:src|href)\s*=\s*["\']https?://', html_doc, re.I)
    if ext_links:
        fail(f"External network links found (violates 100% offline rule): {ext_links}")
    ok("100% offline self-contained check passed (zero external CSS/JS CDN links)")

    # 2. Extract HTML body and JS script
    script_matches = re.findall(r"<script>([\s\S]*?)</script>", html_doc)
    if len(script_matches) != 1:
        fail(f"Expected exactly 1 main <script> block, found {len(script_matches)}")
    js_code = script_matches[0]
    html_part = html_doc.split("<script>", 1)[0]

    check_js_balance(js_code)

    # 3. Validate #fimArchSvg XML
    arch_match = re.search(r'(<svg id="fimArchSvg"[\s\S]*?</svg>)', html_part)
    if not arch_match:
        fail("Missing #fimArchSvg element in HTML")
    try:
        ET.fromstring(arch_match.group(1))
    except ET.ParseError as e:
        fail(f"#fimArchSvg XML error: {e}")
    ok("Inline 8-module #fimArchSvg parsed cleanly as valid XML")

    # 4. DOM ID checks
    dom_ids = set(re.findall(r'\bid=["\']([A-Za-z0-9_\-]+)["\']', html_part))
    literal_gets = set(re.findall(r'document\.getElementById\(\s*["\']([A-Za-z0-9_\-]+)["\']\s*\)', js_code))
    missing_ids = sorted(literal_gets - dom_ids)
    if missing_ids:
        fail(f"JS getElementById references missing DOM IDs: {missing_ids}")

    # Check dynamic ID patterns used in JS loops/handlers
    expected_dyn_ids = (
        [f"cfgTabBtn{i}" for i in range(5)]
        + [f"cfgPane{i}" for i in range(5)]
        + [f"inspTabBtn{i}" for i in range(4)]
        + [f"hbTab1_{i}" for i in range(7)]
        + [f"catPill_{c}" for c in ("ALL", "CORE", "MASK", "DEM", "SAFETY", "STACK")]
        + [f"expTab{i}" for i in range(4)]
        + [
            "svgSub_MOD_SWC_MON", "svgSub_MOD_SWC_CTRL", "svgSub_MOD_ECUM",
            "svgSub_MOD_DCM", "svgSub_MOD_RTE", "svgSub_MOD_FIM1",
            "svgSub_MOD_FIM2", "svgSub_MOD_FIM3", "svgSub_MOD_DET", "svgSub_MOD_DEM1",
        ]
        + [f"node_{m}" for m in (
            "MOD_SWC_MON", "MOD_SWC_CTRL", "MOD_ECUM", "MOD_DCM",
            "MOD_RTE", "MOD_FIM", "MOD_DET", "MOD_DEM"
        )]
    )
    missing_dyn = [did for did in expected_dyn_ids if did not in dom_ids]
    if missing_dyn:
        fail(f"Missing expected dynamic DOM IDs: {missing_dyn}")
    ok(f"All {len(literal_gets)} literal + {len(expected_dyn_ids)} dynamic getElementById references resolved in DOM ({len(dom_ids)} total DOM IDs)")

    # 5. Inline event handlers exist as JS functions
    defined_funcs = set(re.findall(r'\bfunction\s+([A-Za-z0-9_]+)\s*\(', js_code))
    handler_attrs = re.findall(r'\bon(?:click|change|input|keydown|keyup)=["\']([^"\']+)["\']', html_part)
    missing_fns = set()
    for expr in handler_attrs:
        # Ignore simple inline statements like if(event.target===this) closeExportModal()
        for call in re.findall(r'\b([A-Za-z_][A-Za-z0-9_]*)\s*\(', expr):
            if call not in ("if", "event") and call not in defined_funcs:
                missing_fns.add(call)
    if missing_fns:
        fail(f"HTML inline handlers call undefined JS functions: {sorted(missing_fns)}")
    ok(f"All HTML inline handlers map to defined JS functions ({len(defined_funcs)} functions defined)")

    # 6. ECUC config controls, tooltips & defaultConfig cross-check
    cfg_rows = re.findall(r'data-cfg-key=["\']([A-Za-z0-9_]+)["\']', html_part)
    if len(cfg_rows) < 28:
        fail(f"Expected >= 28 ECUC config controls, found {len(cfg_rows)}")

    # Extract configTooltipData keys
    tt_block_m = re.search(r"const configTooltipData\s*=\s*\{([\s\S]*?)\n\};", js_code)
    if not tt_block_m:
        fail("Missing configTooltipData object")
    tt_keys = set(re.findall(r"^\s*([A-Za-z0-9_]+)\s*:\s*\{", tt_block_m.group(1), re.M))

    def_cfg_m = re.search(r"const defaultConfig\s*=\s*\{([\s\S]*?)\n\};", js_code)
    if not def_cfg_m:
        fail("Missing defaultConfig object")
    def_keys = set(re.findall(r"^\s*([A-Za-z0-9_]+)\s*:", def_cfg_m.group(1), re.M))

    missing_tt = sorted(set(cfg_rows) - tt_keys)
    missing_def = sorted(set(cfg_rows) - def_keys)
    missing_dom_ctrl = [k for k in cfg_rows if f"cfg_{k}" not in dom_ids]
    if missing_tt:
        fail(f"ECUC controls missing from configTooltipData: {missing_tt}")
    if missing_def:
        fail(f"ECUC controls missing from defaultConfig: {missing_def}")
    if missing_dom_ctrl:
        fail(f"ECUC controls missing input id='cfg_<key>': {missing_dom_ctrl}")
    ok(f"All {len(cfg_rows)} ECUC controls synced across HTML data-cfg-key, id='cfg_*', defaultConfig, and configTooltipData")

    # 7. Scenarios & What-Ifs
    scen_ids = re.findall(r'id:\s*"(S\d+)"', js_code)
    whatif_cnt = len(re.findall(r'\blabel:\s*"🧪', js_code))
    if len(scen_ids) != 12:
        fail(f"Expected 12 Scenarios (S1..S12), found {len(scen_ids)}: {scen_ids}")
    if whatif_cnt != 36:
        fail(f"Expected 36 What-If controls (3 x 12), found {whatif_cnt}")
    ok("Verified all 12 Scenarios (S1..S12) and 36 What-If buttons")

    # 8. Abbreviations data check
    abbr_m = re.search(r"const ABBREVIATIONS_DATA\s*=\s*(\[[\s\S]*?\]);", js_code)
    if not abbr_m:
        fail("Missing ABBREVIATIONS_DATA array")
    abbr_entries = re.findall(r'\{\s*abbr:\s*"([^"]+)"[^}]*cat:\s*"([^"]+)"', abbr_m.group(1))
    if len(abbr_entries) != 48:
        fail(f"Expected 48 Abbreviations in ABBREVIATIONS_DATA, found {len(abbr_entries)}")
    bad_cats = {cat for _, cat in abbr_entries if cat not in ("CORE", "MASK", "DEM", "SAFETY", "STACK")}
    if bad_cats:
        fail(f"Unexpected abbreviation categories: {bad_cats}")
    ok("Verified 48 AUTOSAR FiM glossary terms across 5 categories (CORE/MASK/DEM/SAFETY/STACK)")

    # 9. Handbook data check
    hb_m = re.search(r"const HANDBOOK_DATA\s*=\s*(\[[\s\S]*?\]);\n\nlet hbTab1", js_code)
    if not hb_m:
        fail("Missing HANDBOOK_DATA JSON block")
    hb_data = json.loads(hb_m.group(1))
    if len(hb_data) != 6:
        fail(f"Expected 6 Handbook main content tabs, found {len(hb_data)}")
    sub_counts = [len(t.get("subs", [])) for t in hb_data]
    if sub_counts != [4, 4, 4, 4, 4, 4]:
        fail(f"Expected 4 sub-tabs per Handbook main tab, got {sub_counts}")
    ok("Verified 6x4 = 24 structured Handbook sub-topics (+ Tab 7 Glossary)")

    # 10. SVG bounds & overlap audit
    check_handbook_svgs()
    print("\nALL VERIFICATION CHECKS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    main()
