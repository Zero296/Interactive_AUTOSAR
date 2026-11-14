# -*- coding: utf-8 -*-
"""Static & structural verification suite for AUTOSAR_MCAL.html."""

import json
import os
import re
import sys
import xml.etree.ElementTree as ET

HERE = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
TARGET_HTML = os.path.join(REPO_ROOT, "Simulation", "05_MCAL", "AUTOSAR_MCAL.html")


def extract_script_body(html):
    matches = list(re.finditer(r"<script>([\s\S]*?)</script>", html))
    assert len(matches) == 1, f"Expected exactly 1 <script> block, found {len(matches)}"
    return matches[0].group(1), html[:matches[0].start()], html[matches[0].end():]


def check_js_delimiters(js_code):
    """Balanced (), [], {} check respecting strings, template literals, regexes and comments."""
    stack = []
    pairs = {"(": ")", "[": "]", "{": "}"}
    closing = {")": "(", "]": "[", "}": "{"}
    i = 0
    n = len(js_code)
    line = 1
    mode = "code"  # code | sq | dq | tpl | slc | mlc | regex
    tpl_brace_depth = []
    prev_sig = ""

    while i < n:
        ch = js_code[i]
        nxt = js_code[i + 1] if i + 1 < n else ""
        if ch == "\n":
            line += 1
            if mode == "slc":
                mode = "code"
            i += 1
            continue

        if mode == "slc":
            i += 1
            continue
        if mode == "mlc":
            if ch == "*" and nxt == "/":
                mode = "code"
                i += 2
                continue
            i += 1
            continue
        if mode == "sq":
            if ch == "\\":
                i += 2
                continue
            if ch == "'":
                mode = "code"
                prev_sig = "'"
            i += 1
            continue
        if mode == "dq":
            if ch == "\\":
                i += 2
                continue
            if ch == '"':
                mode = "code"
                prev_sig = '"'
            i += 1
            continue
        if mode == "regex":
            if ch == "\\":
                i += 2
                continue
            if ch == "/":
                mode = "code"
                prev_sig = "/"
            i += 1
            continue
        if mode == "tpl":
            if ch == "\\":
                i += 2
                continue
            if ch == "`":
                mode = "code"
                prev_sig = "`"
                i += 1
                continue
            if ch == "$" and nxt == "{":
                tpl_brace_depth.append(len(stack))
                stack.append(("{", line))
                mode = "code"
                prev_sig = "{"
                i += 2
                continue
            i += 1
            continue

        # mode == "code"
        if ch.isspace():
            i += 1
            continue
        if ch == "/" and nxt == "/":
            mode = "slc"
            i += 2
            continue
        if ch == "/" and nxt == "*":
            mode = "mlc"
            i += 2
            continue
        if ch == "/" and prev_sig in ("", "(", "[", "{", "=", ":", ",", ";", "!", "&", "|", "?", "+"):
            mode = "regex"
            i += 1
            continue
        if ch == "'":
            mode = "sq"
            i += 1
            continue
        if ch == '"':
            mode = "dq"
            i += 1
            continue
        if ch == "`":
            mode = "tpl"
            i += 1
            continue

        if ch in pairs:
            stack.append((ch, line))
        elif ch in closing:
            if not stack or stack[-1][0] != closing[ch]:
                top = stack[-1] if stack else ("EMPTY", 0)
                raise AssertionError(f"Unmatched '{ch}' at JS line {line} (stack top: {top})")
            stack.pop()
            if tpl_brace_depth and len(stack) == tpl_brace_depth[-1]:
                tpl_brace_depth.pop()
                mode = "tpl"
                i += 1
                continue

        prev_sig = ch
        i += 1

    if stack:
        raise AssertionError(f"Unclosed delimiter(s) in JS: {stack[:5]}")
    if mode != "code":
        raise AssertionError(f"Unterminated string/comment/regex mode '{mode}' at EOF")


def check_dom_and_handlers(html_head_body, js_code):
    raw_ids = re.findall(r'\bid="([^"]+)"', html_head_body)
    seen = {}
    dups = []
    for x in raw_ids:
        seen[x] = seen.get(x, 0) + 1
        if seen[x] == 2:
            dups.append(x)
    assert not dups, f"Duplicate HTML IDs: {dups}"
    id_set = set(raw_ids)

    # Static literal getElementById("...") calls
    lit_ids = re.findall(r'getElementById\(\s*["\']([A-Za-z0-9_]+)["\']\s*\)', js_code)
    missing_ids = sorted({x for x in lit_ids if x not in id_set})
    assert not missing_ids, f"Missing HTML IDs referenced by getElementById: {missing_ids}"

    # Verify declared JS functions cover all inline HTML handlers
    declared_fns = set(re.findall(r'function\s+([A-Za-z0-9_]+)\s*\(', js_code))
    inline_handlers = re.findall(r'\son(?:click|change|input)\s*=\s*"([^"]+)"', html_head_body)
    missing_fns = []
    for expr in inline_handlers:
        # Ignore simple guard prefix like `if(event.target===this) closeExportModal()`
        for fn in re.findall(r'\b([A-Za-z_][A-Za-z0-9_]*)\s*\(', expr):
            if fn in ("if",):
                continue
            if fn not in declared_fns:
                missing_fns.append(fn)
    assert not missing_fns, f"Undeclared inline handler functions: {sorted(set(missing_fns))}"
    return len(id_set), len(declared_fns)


def check_ecuc_parity(html_head_body, js_code):
    data_keys = re.findall(r'data-cfg-key="([^"]+)"', html_head_body)
    input_keys = re.findall(r'\bid="cfg_([^"]+)"', html_head_body)
    assert len(data_keys) == 48, f"Expected 48 ECUC data-cfg-key rows, got {len(data_keys)}"
    assert set(data_keys) == set(input_keys), "Mismatch between data-cfg-key and cfg_* inputs"

    m_cfg = re.search(r'const defaultConfig = (\{[\s\S]*?\n\});', js_code)
    assert m_cfg, "Could not locate const defaultConfig"
    cfg_keys = set(re.findall(r'^\s*([A-Za-z0-9_]+)\s*:', m_cfg.group(1), re.M))
    assert cfg_keys == set(data_keys), f"defaultConfig mismatch: extra={cfg_keys - set(data_keys)}, missing={set(data_keys) - cfg_keys}"

    m_tt = re.search(r'const configTooltipData = (\{[\s\S]*?\n\});', js_code)
    assert m_tt, "Could not locate const configTooltipData"
    tt_keys = set(re.findall(r'^\s{2}([A-Za-z0-9_]+)\s*:\s*\{', m_tt.group(1), re.M))
    assert tt_keys == set(data_keys), f"configTooltipData mismatch: extra={tt_keys - set(data_keys)}, missing={set(data_keys) - tt_keys}"
    return len(data_keys)


def check_scenarios_and_abbrs(html_head_body, js_code):
    opt_ids = re.findall(r'<option value="(S\d+)"', html_head_body)
    assert opt_ids == [f"S{i}" for i in range(1, 17)], f"Expected S1..S16 options, got {opt_ids}"
    for sid in opt_ids:
        assert re.search(rf'\b{sid}\s*:\s*\{{', js_code), f"Missing scenario {sid} in SCENARIOS"
    whatif_count = len(re.findall(r'label:\s*"🧪 ', js_code))
    assert whatif_count == 48, f"Expected 48 What-If items (16 x 3), got {whatif_count}"

    m_abbr = re.search(r'const ABBREVIATIONS = (\[[\s\S]*?\n\]);', js_code)
    assert m_abbr, "Could not locate ABBREVIATIONS array"
    abbr_entries = re.findall(r'\{\s*abbr:\s*"[^"]+".*?cat:\s*"([A-Z]+)"', m_abbr.group(1))
    assert len(abbr_entries) == 68, f"Expected 68 ABBREVIATIONS, got {len(abbr_entries)}"
    return len(opt_ids), whatif_count, len(abbr_entries)


def check_handbook_and_svgs(html_head_body, js_code):
    m_arch = re.search(r'(<svg id="mcalArchSvg"[\s\S]*?</svg>)', html_head_body)
    assert m_arch, "Missing #mcalArchSvg"
    ET.fromstring(m_arch.group(1))

    m_hb = re.search(r'const HANDBOOK_DATA = (\[[\s\S]*?\]);\n', js_code)
    assert m_hb, "Could not locate HANDBOOK_DATA JSON"
    hb_data = json.loads(m_hb.group(1))
    assert len(hb_data) == 9, f"Expected 9 handbook main tabs, got {len(hb_data)}"
    topic_total = sum(len(sec) for sec in hb_data)
    assert topic_total == 36, f"Expected 36 handbook sub-topics (9x4), got {topic_total}"

    svg_count = 0
    for sec in hb_data:
        for top in sec:
            for svg_str in re.findall(r'(<svg\b[\s\S]*?</svg>)', top["html"]):
                svg_count += 1
                ET.fromstring(svg_str)
                boxes = []
                for bb_str in re.findall(r'data-bb="([\d\.,]+)"', svg_str):
                    x, y, w, h = [float(v) for v in bb_str.split(",")]
                    boxes.append((x, y, x + w, y + h))
                for i in range(len(boxes)):
                    for j in range(i + 1, len(boxes)):
                        ax1, ay1, ax2, ay2 = boxes[i]
                        bx1, by1, bx2, by2 = boxes[j]
                        if ax1 < bx2 and ax2 > bx1 and ay1 < by2 and ay2 > by1:
                            raise AssertionError(f"SVG bounding box overlap in topic '{top['title']}': {boxes[i]} vs {boxes[j]}")
    return topic_total, svg_count


def main():
    assert os.path.exists(TARGET_HTML), f"Missing output file: {TARGET_HTML}"
    with open(TARGET_HTML, "r", encoding="utf-8") as f:
        html = f.read()
    assert html.startswith("<!DOCTYPE html>"), "Missing <!DOCTYPE html>"
    assert html.rstrip().endswith("</html>"), "Missing </html>"

    js_code, head_body, tail = extract_script_body(html)
    assert "</body>" in tail and "</html>" in tail, "Missing closing </body></html>"

    check_js_delimiters(js_code)
    id_cnt, fn_cnt = check_dom_and_handlers(head_body, js_code)
    cfg_cnt = check_ecuc_parity(head_body, js_code)
    scen_cnt, wi_cnt, abbr_cnt = check_scenarios_and_abbrs(head_body, js_code)
    hb_topics, hb_svgs = check_handbook_and_svgs(head_body, js_code)

    print("[PASS] AUTOSAR_MCAL.html verified successfully:")
    print(f"  - DOM IDs: {id_cnt} (0 duplicates, 0 missing getElementById refs)")
    print(f"  - JS Functions: {fn_cnt} (all inline handlers resolved, balanced delimiters)")
    print(f"  - ECUC Params: {cfg_cnt}/48 matched across HTML/ToolTips/defaultConfig")
    print(f"  - Scenarios: {scen_cnt} (S1..S16) with {wi_cnt} What-If experiments")
    print(f"  - Handbook: 9 tabs x 4 topics = {hb_topics} topics, {hb_svgs} SVGs (0 overlaps, valid XML)")
    print(f"  - Abbreviations: {abbr_cnt}/68 terms verified")


if __name__ == "__main__":
    main()
