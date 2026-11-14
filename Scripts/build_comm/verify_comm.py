import re
import sys
from pathlib import Path

HTML_PATH = Path(__file__).resolve().parent.parent / "Simulation" / "AUTOSAR_ComM.html"

def check_js_balance(js_code: str):
    stack = []
    pairs = {"{": "}", "(": ")", "[": "]"}
    closing = {v: k for k, v in pairs.items()}
    i = 0
    n = len(js_code)
    in_single = False
    in_double = False
    in_backtick = False
    in_line_comment = False
    in_block_comment = False
    interp_depth = 0
    line_no = 1

    while i < n:
        ch = js_code[i]
        nxt = js_code[i + 1] if i + 1 < n else ""
        if ch == "\n":
            line_no += 1
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
                continue
            i += 1
            continue

        if in_single:
            if ch == "\\":
                i += 2
                continue
            if ch == "'":
                in_single = False
            i += 1
            continue
        if in_double:
            if ch == "\\":
                i += 2
                continue
            if ch == '"':
                in_double = False
            i += 1
            continue
        if in_backtick and interp_depth == 0:
            if ch == "\\":
                i += 2
                continue
            if ch == "$" and nxt == "{":
                stack.append(("{_TMPL", line_no))
                interp_depth += 1
                i += 2
                continue
            if ch == "`":
                in_backtick = False
            i += 1
            continue

        # Not inside string/comment (or inside ${...} of template)
        if ch == "/" and nxt == "/":
            in_line_comment = True
            i += 2
            continue
        if ch == "/" and nxt == "*":
            in_block_comment = True
            i += 2
            continue
        if ch == "'":
            in_single = True
            i += 1
            continue
        if ch == '"':
            in_double = True
            i += 1
            continue
        if ch == "`":
            if interp_depth > 0:
                pass
            else:
                in_backtick = True
                i += 1
                continue
        # Basic regex literal skip heuristic when preceded by = ( , ! : ? return
        if ch == "/" and nxt not in ("/", "*"):
            prev = js_code[max(0, i - 20):i].rstrip()
            if prev and prev[-1] in "=(,!:[?":
                j = i + 1
                escaped = False
                in_class = False
                closed = False
                while j < n:
                    c2 = js_code[j]
                    if c2 == "\n":
                        break
                    if escaped:
                        escaped = False
                    elif c2 == "\\":
                        escaped = True
                    elif c2 == "[":
                        in_class = True
                    elif c2 == "]":
                        in_class = False
                    elif c2 == "/" and not in_class:
                        closed = True
                        break
                    j += 1
                if closed:
                    i = j + 1
                    continue

        if ch in pairs:
            stack.append((ch, line_no))
        elif ch in closing:
            if not stack:
                raise AssertionError(f"Unmatched closing '{ch}' at JS line {line_no}")
            top, t_line = stack.pop()
            if top == "{_TMPL" and ch == "}":
                interp_depth -= 1
            elif top != closing[ch]:
                raise AssertionError(f"Mismatched '{top}' (line {t_line}) vs '{ch}' (line {line_no})")
        i += 1

    if stack:
        raise AssertionError(f"Unclosed delimiters: {stack[:5]}")
    if in_single or in_double or in_backtick:
        raise AssertionError("Unclosed string or template literal at EOF")

def main():
    text = HTML_PATH.read_text(encoding="utf-8")
    m = re.search(r"<script>([\s\S]*)</script>", text)
    assert m, "Could not find <script> block"
    html_part = text[:m.start()]
    js_part = m.group(1)

    # 1. JS syntax balance
    check_js_balance(js_part)
    print("[PASS] JS bracket/quote/template balance check")

    # 2. DOM ID integrity
    dom_ids = set(re.findall(r'\bid="([^"]+)"', html_part))
    get_ids = re.findall(r'document\.getElementById\("([^"]+)"\)', js_part)
    missing_ids = [gid for gid in set(get_ids) if gid not in dom_ids]
    assert not missing_ids, f"Missing DOM IDs referenced in JS: {missing_ids}"
    print(f"[PASS] All {len(set(get_ids))} static getElementById() calls match DOM IDs")

    # 3. ECUC keys consistency: [data-cfg-key], id="cfg_...", defaultConfig, configTooltipData
    cfg_keys = re.findall(r'data-cfg-key="([^"]+)"', html_part)
    assert len(cfg_keys) >= 34, f"Expected >=34 cfg keys, got {len(cfg_keys)}"
    for k in cfg_keys:
        assert f'id="cfg_{k}"' in html_part, f"Missing input element id=cfg_{k}"
        assert re.search(rf'\b{k}\s*:', js_part), f"Missing {k} in JS defaultConfig/tooltip"
    tt_block = re.search(r'const configTooltipData = \{([\s\S]*?)\n\};', js_part).group(1)
    for k in cfg_keys:
        assert re.search(rf'^\s*{k}\s*:', tt_block, re.M), f"Missing {k} in configTooltipData"
    print(f"[PASS] All {len(cfg_keys)} ECUC config fields match DOM inputs, defaultConfig, and configTooltipData")

    # 4. Inline onclick/onchange handlers defined
    handlers = set(re.findall(r'on(?:click|change|input)="([a-zA-Z0-9_]+)\(', html_part)) - {"if"}
    for h in handlers:
        assert re.search(rf'function\s+{h}\s*\(', js_part), f"Handler function '{h}' not found in JS"
    print(f"[PASS] All {len(handlers)} inline event handlers are implemented")

    # 5. Scenarios count & What-Ifs
    opt_ids = re.findall(r'<option value="(S\d+)">', html_part)
    js_scen_ids = re.findall(r'id:\s*"(S\d+)"', js_part)
    assert opt_ids == js_scen_ids and len(opt_ids) == 14, f"Scenario mismatch: opt={opt_ids}, js={js_scen_ids}"
    whatif_count = len(re.findall(r'label:\s*"🧪', js_part))
    assert whatif_count == 42, f"Expected 42 What-Ifs (14x3), found {whatif_count}"
    print("[PASS] All 14 Scenarios (S1-S14) and 42 What-If actions verified")

    # 6. Handbook & Abbreviations
    abbr_count = len(re.findall(r'\{\s*abbr:\s*"', js_part))
    assert abbr_count >= 48, f"Expected >=48 abbreviations, found {abbr_count}"
    print(f"[PASS] Abbreviations count = {abbr_count} (>=48) and Handbook bundled cleanly")

    # 7. SVG Handbook Diagrams Geometric & XML Audit
    import json
    import xml.etree.ElementTree as ET
    hb_m = re.search(r'const HANDBOOK_DATA = (\[\s*[\s\S]*?\n\]);', js_part)
    assert hb_m, "Could not locate HANDBOOK_DATA JSON"
    hb_data = json.loads(hb_m.group(1))
    svg_count = 0
    for tab in hb_data:
        for sub in tab["subs"]:
            for svg_str in re.findall(r'<svg class="hb-svg"[\s\S]*?</svg>', sub["html"]):
                svg_count += 1
                root = ET.fromstring(svg_str)
                vb = [float(v) for v in root.attrib["viewBox"].split()]
                vb_w, vb_h = vb[2], vb[3]
                boxes = []
                pills = []
                for el in root.iter():
                    tag = el.tag.split("}")[-1]
                    if tag == "rect":
                        cls = el.attrib.get("class", "")
                        r = (float(el.attrib["x"]), float(el.attrib["y"]), float(el.attrib["width"]), float(el.attrib["height"]))
                        if "svg-box" in cls:
                            boxes.append(r)
                        elif "svg-pill" in cls:
                            pills.append(r)
                            assert r[0] >= 0 and r[1] >= 0 and r[0] + r[2] <= vb_w and r[1] + r[3] <= vb_h, f"Pill out of canvas in {sub['label']}: {r}"
                    elif tag == "text":
                        tx = float(el.attrib["x"])
                        ty = float(el.attrib["y"])
                        fs = float(el.attrib.get("font-size", "11"))
                        txt = "".join(el.itertext())
                        est_w = len(txt) * fs * 0.56
                        assert 0 < tx < vb_w and 0 < ty < vb_h, f"Text out of viewBox in {sub['label']}: {txt}"
                        bw = el.attrib.get("data-box-w")
                        if bw:
                            max_w = float(bw) - 8
                            assert est_w <= max_w, f"Text overflow box ({est_w:.1f} > {max_w:.1f}) in {sub['label']}: '{txt}'"
                for px, py, pw, ph in pills:
                    for bx, by, bw, bh in boxes:
                        ix = max(0.0, min(px + pw, bx + bw) - max(px, bx))
                        iy = max(0.0, min(py + ph, by + bh) - max(py, by))
                        assert ix * iy == 0.0, f"Pill ({px},{py},{pw},{ph}) overlaps Box ({bx},{by},{bw},{bh}) in {sub['label']}"
    assert svg_count == 18, f"Expected 18 Handbook SVG diagrams, found {svg_count}"
    print(f"[PASS] Audited {svg_count} Handbook SVGs: XML valid, 0 box text overflows, 0 pill-box overlaps")

if __name__ == "__main__":
    main()
