# -*- coding: utf-8 -*-
"""Static, Geometric & Semantic Verifier for Simulation/AUTOSAR_Nm_CanNm.html."""

import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).parent
HTML_PATH = ROOT.parent / "Simulation" / "AUTOSAR_Nm_CanNm.html"


def check_js_balance(js_src):
    stack = []
    pairs = {"{": "}", "[": "]", "(": ")"}
    closing = set(pairs.values())
    i, n = 0, len(js_src)
    line = 1
    in_line_comment = False
    in_block_comment = False
    quote = None
    tpl_brace_depth = 0
    errors = []

    while i < n:
        ch = js_src[i]
        nxt = js_src[i + 1] if i + 1 < n else ""
        if ch == "\n":
            line += 1
            in_line_comment = False
            i += 1
            continue
        if in_line_comment:
            i += 1
            continue
        if in_block_comment:
            if ch == "*" and nxt == "/":
                in_block_comment = False
                i += 2
            else:
                i += 1
            continue
        if quote:
            if ch == "\\":
                i += 2
                continue
            if quote == "`" and ch == "$" and nxt == "{":
                stack.append(("`${", line))
                tpl_brace_depth += 1
                quote = None
                i += 2
                continue
            if ch == quote:
                quote = None
            i += 1
            continue

        if ch == "/" and nxt == "/":
            in_line_comment = True
            i += 2
            continue
        if ch == "/" and nxt == "*":
            in_block_comment = True
            i += 2
            continue
        if ch in ("'", '"', "`"):
            quote = ch
            i += 1
            continue
        if ch == "/":
            prev = js_src[max(0, i - 1)]
            # Heuristic regex literal check
            k = i - 1
            while k >= 0 and js_src[k] in " \t":
                k -= 1
            prev_tok = js_src[k] if k >= 0 else ""
            if prev_tok in ("(", "=", ",", ":", "!", "&", "|", "?", "[", ";", "\n", ""):
                j = i + 1
                in_class = False
                is_regex = False
                while j < n and js_src[j] != "\n":
                    c = js_src[j]
                    if c == "\\":
                        j += 2
                        continue
                    if c == "[":
                        in_class = True
                    elif c == "]" and in_class:
                        in_class = False
                    elif c == "/" and not in_class:
                        is_regex = True
                        break
                    j += 1
                if is_regex:
                    i = j + 1
                    continue

        if ch in pairs:
            stack.append((ch, line))
        elif ch in closing:
            if not stack:
                errors.append(f"Line {line}: Unexpected '{ch}'")
            else:
                op, op_line = stack.pop()
                if op == "`${" and ch == "}":
                    tpl_brace_depth -= 1
                    quote = "`"
                elif op in pairs and pairs[op] != ch:
                    errors.append(f"Line {line}: Mismatch '{op}' (line {op_line}) vs '{ch}'")
        i += 1

    if stack:
        errors.append(f"Unclosed delimiters: {stack[:5]}")
    if quote:
        errors.append(f"Unclosed string literal: {quote}")
    return errors


def rects_overlap(a, b):
    return (a["x1"] < b["x2"] - 1 and a["x2"] > b["x1"] + 1 and a["y1"] < b["y2"] - 1 and a["y2"] > b["y1"] + 1)


def main():
    if not HTML_PATH.exists():
        print(f"ERROR: Missing {HTML_PATH}")
        sys.exit(1)

    html_txt = HTML_PATH.read_text(encoding="utf-8")
    failures = []

    # 1. Extract script & body
    m_script = re.search(r"<script>([\s\S]*)</script>\s*</body>", html_txt)
    if not m_script:
        print("ERROR: Could not extract <script> block.")
        sys.exit(1)
    js_src = m_script.group(1)
    html_part = html_txt[:m_script.start()]

    # 2. JS Delimiter balance
    bal_errs = check_js_balance(js_src)
    if bal_errs:
        failures.extend(bal_errs)

    # 3. DOM IDs check (static getElementById calls vs HTML id="...")
    html_ids = set(re.findall(r'\bid="([^"]+)"', html_part))
    js_ids = set(re.findall(r'document\.getElementById\("([A-Za-z0-9_]+)"\)', js_src))
    missing_ids = sorted(js_ids - html_ids)
    if missing_ids:
        failures.append(f"Static JS getElementById missing in HTML: {missing_ids}")

    # 4. Inline event handlers check
    declared_fns = set(re.findall(r"\bfunction\s+([A-Za-z0-9_]+)\s*\(", js_src))
    inline_handlers = re.findall(r'\bon(?:click|change|input)="([^"]+)"', html_part)
    for h in inline_handlers:
        for fn_name in re.findall(r"\b([A-Za-z0-9_]+)\(", h):
            if fn_name in ("if", "for", "while", "switch"):
                continue
            if fn_name not in declared_fns:
                failures.append(f"Inline handler calls undefined function '{fn_name}': {h}")

    # 5. Config consistency (46 parameters)
    cfg_input_keys = set(re.findall(r'id="cfg_([A-Za-z0-9_]+)"', html_part))
    cfg_row_keys = set(re.findall(r'data-cfg-key="([A-Za-z0-9_]+)"', html_part))
    m_def = re.search(r"const defaultConfig = \{([\s\S]*?)\};", js_src)
    def_keys = set(re.findall(r"^\s*([A-Za-z0-9_]+)\s*:", m_def.group(1), re.M)) if m_def else set()
    m_tt = re.search(r"const configTooltipData = \{([\s\S]*?)\n\};", js_src)
    tt_keys = set(re.findall(r"^  ([A-Za-z0-9_]+):\s*\{", m_tt.group(1), re.M)) if m_tt else set()

    if len(def_keys) != 46:
        failures.append(f"Expected 46 ECUC keys in defaultConfig, found {len(def_keys)}")
    for label, s in [("cfg_<key>", cfg_input_keys), ("data-cfg-key", cfg_row_keys), ("configTooltipData", tt_keys)]:
        diff1 = def_keys - s
        diff2 = s - def_keys
        if diff1 or diff2:
            failures.append(f"Config mismatch ({label}): missing={sorted(diff1)}, extra={sorted(diff2)}")

    # 6. Scenarios (14) & What-Ifs (42)
    scen_ids = re.findall(r'^\s+id:\s*"(S\d+)",', js_src, re.M)
    whatif_count = len(re.findall(r'label:\s*"🧪', js_src))
    if len(scen_ids) != 14:
        failures.append(f"Expected 14 scenarios (S1..S14), found {len(scen_ids)}: {scen_ids}")
    if whatif_count != 42:
        failures.append(f"Expected 42 What-Ifs (3 per scenario), found {whatif_count}")

    # 7. Abbreviations (56)
    abbr_count = len(re.findall(r'^\s*\{\s*abbr:', js_src, re.M))
    if abbr_count != 56:
        failures.append(f"Expected 56 abbreviations, found {abbr_count}")

    # 8. Handbook (6 x 4 = 24 topics) & SVG XML/Geometry verification
    m_hb = re.search(r"const HANDBOOK_DATA = (\[[\s\S]*?\n\]);\n\nlet currentHbTab1", js_src)
    if not m_hb:
        failures.append("Could not parse HANDBOOK_DATA JSON block.")
    else:
        hb_data = json.loads(m_hb.group(1))
        total_topics = sum(len(sec["topics"]) for sec in hb_data)
        if len(hb_data) != 6 or total_topics != 24:
            failures.append(f"Expected 6x4=24 handbook topics, got {len(hb_data)} tabs / {total_topics} topics")
        svg_count = 0
        for s_idx, sec in enumerate(hb_data):
            for t_idx, topic in enumerate(sec["topics"]):
                for svg_str in re.findall(r"(<svg[\s\S]*?</svg>)", topic["html"]):
                    svg_count += 1
                    try:
                        root = ET.fromstring(svg_str)
                    except ET.ParseError as ex:
                        failures.append(f"SVG XML error in Tab {s_idx+1}.{t_idx+1}: {ex}")
                        continue
                    boxes = []
                    pills = []
                    for el in root.iter():
                        tag = el.tag.split("}")[-1]
                        cls = el.attrib.get("class", "")
                        if tag == "rect" and "svg-box" in cls:
                            x, y = float(el.attrib["x"]), float(el.attrib["y"])
                            w, h = float(el.attrib["width"]), float(el.attrib["height"])
                            boxes.append({"x1": x, "y1": y, "x2": x + w, "y2": y + h})
                        elif tag == "rect" and "svg-pill" in cls:
                            x, y = float(el.attrib["x"]), float(el.attrib["y"])
                            w, h = float(el.attrib["width"]), float(el.attrib["height"])
                            pills.append({"x1": x, "y1": y, "x2": x + w, "y2": y + h})
                    for p in pills:
                        for b in boxes:
                            if rects_overlap(p, b):
                                failures.append(f"SVG pill {p} overlaps box {b} in Tab {s_idx+1}.{t_idx+1}")
        print(f"Verified {svg_count} Handbook SVGs cleanly (XML + Box/Pill geometry).")

    if failures:
        print("VERIFICATION FAILED:")
        for f in failures:
            print(" -", f)
        sys.exit(1)

    print("ALL STATIC & GEOMETRIC CHECKS PASSED:")
    print(f" - File: {HTML_PATH} ({HTML_PATH.stat().st_size:,} bytes)")
    print(f" - ECUC Configs: {len(def_keys)} params (100% matched across DOM, defaultConfig, Tooltips)")
    print(f" - Scenarios: {len(scen_ids)} ({scen_ids[0]}..{scen_ids[-1]}), What-Ifs: {whatif_count}")
    print(f" - Abbreviations: {abbr_count} | Handbook: {len(hb_data)} main tabs x 4 = {total_topics} topics + Tab 7")
    print(f" - Static DOM IDs verified: {len(js_ids)} | Declared inline handlers: {len(inline_handlers)}")


if __name__ == "__main__":
    main()
