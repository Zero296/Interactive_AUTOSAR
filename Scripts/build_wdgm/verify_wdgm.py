import json
import re
import shutil
import subprocess
import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path

BUILD_DIR = Path(__file__).resolve().parent
HTML_FILE = BUILD_DIR.parent / "Simulation" / "AUTOSAR_WdgM.html"


def check_js_balance(js_code: str):
    """Verify balanced (), [], {} outside comments, strings, and regex literals."""
    stack = []
    i = 0
    n = len(js_code)
    in_single = False
    in_double = False
    in_template = False
    in_line_comment = False
    in_block_comment = False
    in_regex = False
    in_regex_class = False
    line_num = 1
    prev_sig = ""
    while i < n:
        c = js_code[i]
        nxt = js_code[i + 1] if i + 1 < n else ""
        if c == "\n":
            line_num += 1
            in_line_comment = False
            in_regex = False
            in_regex_class = False
            i += 1
            continue
        if in_line_comment:
            i += 1
            continue
        if in_block_comment:
            if c == "*" and nxt == "/":
                in_block_comment = False
                i += 2
                continue
            i += 1
            continue
        if in_regex:
            if c == "\\":
                i += 2
                continue
            if c == "[":
                in_regex_class = True
            elif c == "]":
                in_regex_class = False
            elif c == "/" and not in_regex_class:
                in_regex = False
                prev_sig = "/"
            i += 1
            continue
        if in_single:
            if c == "\\":
                i += 2
                continue
            if c == "'":
                in_single = False
                prev_sig = "'"
            i += 1
            continue
        if in_double:
            if c == "\\":
                i += 2
                continue
            if c == '"':
                in_double = False
                prev_sig = '"'
            i += 1
            continue
        if in_template:
            if c == "\\":
                i += 2
                continue
            if c == "`":
                in_template = False
                prev_sig = "`"
            i += 1
            continue
        if c == "/" and nxt == "/":
            in_line_comment = True
            i += 2
            continue
        if c == "/" and nxt == "*":
            in_block_comment = True
            i += 2
            continue
        if c == "/" and prev_sig in ("", "(", "[", "{", ",", ";", "=", ":", "!", "&", "|", "?", "+", "-", "~", "n"):
            in_regex = True
            in_regex_class = False
            i += 1
            continue
        if c == "'":
            in_single = True
        elif c == '"':
            in_double = True
        elif c == "`":
            in_template = True
        elif c in "({[":
            stack.append((c, line_num))
            prev_sig = c
        elif c in ")}]":
            if not stack:
                return False, f"Unmatched '{c}' at JS line {line_num}"
            top, tline = stack.pop()
            pairs = {"(": ")", "{": "}", "[": "]"}
            if pairs[top] != c:
                return False, f"Mismatched '{top}' (line {tline}) vs '{c}' (line {line_num})"
            prev_sig = c
        elif not c.isspace():
            prev_sig = c
        i += 1
    if in_single or in_double or in_template:
        return False, "Unterminated string literal at EOF"
    if stack:
        top, tline = stack[-1]
        return False, f"Unclosed '{top}' from JS line {line_num if False else tline}"
    return True, "OK"


def check_handbook_svgs(js_text: str):
    m = re.search(r"const HANDBOOK_DATA\s*=\s*(\[.*?\]);", js_text, re.DOTALL)
    if not m:
        return ["Could not locate HANDBOOK_DATA JSON in part6_handbook.js"]
    data = json.loads(m.group(1))
    tabs = data if isinstance(data, list) else data.get("tabs", [])
    issues = []
    svg_count = 0
    if len(tabs) != 6:
        issues.append(f"Expected 6 handbook tabs in HANDBOOK_DATA, found {len(tabs)}")

    sub_count = 0
    for tab in tabs:
        for sub in tab.get("subs", []):
            sub_count += 1
            svgs = re.findall(r"<svg\b.*?</svg>", sub.get("html", ""), re.DOTALL)
            for svg_str in svgs:
                svg_count += 1
                try:
                    root = ET.fromstring(svg_str)
                except ET.ParseError as e:
                    issues.append(f"{sub['label']}: XML ParseError: {e}")
                    continue

                boxes = []
                pills = []
                for el in root.iter():
                    tag = el.tag.split("}")[-1]
                    if tag == "rect":
                        x = float(el.attrib.get("x", 0))
                        y = float(el.attrib.get("y", 0))
                        w = float(el.attrib.get("width", 0))
                        h = float(el.attrib.get("height", 0))
                        rx = el.attrib.get("rx", "")
                        if rx == "4" or h <= 19:
                            pills.append((x, y, x + w, y + h))
                        elif w > 40 and h >= 28:
                            boxes.append((x, y, x + w, y + h))

                for el in root.iter():
                    tag = el.tag.split("}")[-1]
                    if tag == "text":
                        txt = "".join(el.itertext()).strip()
                        if not txt:
                            continue
                        tx = float(el.attrib.get("x", 0))
                        ty = float(el.attrib.get("y", 0))
                        anchor = el.attrib.get("text-anchor", "start")
                        fs_str = el.attrib.get("font-size", "10.5")
                        fs = float(re.sub(r"[^0-9.]", "", fs_str) or "10.5")
                        est_w = len(txt) * fs * 0.56
                        for (bx1, by1, bx2, by2) in boxes:
                            if bx1 <= tx <= bx2 and by1 <= ty <= by2:
                                bw = bx2 - bx1
                                if est_w > bw - 6:
                                    issues.append(
                                        f"{sub['label']}: Text overflow '{txt}' (est {est_w:.1f}px > box {bw:.1f}px)"
                                    )
                                if anchor == "middle" and abs(tx - (bx1 + bx2) / 2) < 5:
                                    half = est_w / 2
                                    if tx - half < bx1 + 2 or tx + half > bx2 - 2:
                                        issues.append(
                                            f"{sub['label']}: Centered text '{txt}' clips box [{bx1},{bx2}]"
                                        )
                                break

                for (px1, py1, px2, py2) in pills:
                    for (bx1, by1, bx2, by2) in boxes:
                        ix1, iy1 = max(px1, bx1), max(py1, by1)
                        ix2, iy2 = min(px2, bx2), min(py2, by2)
                        if ix2 > ix1 + 3 and iy2 > iy1 + 3:
                            pw, ph = px2 - px1, py2 - py1
                            if (ix2 - ix1) * (iy2 - iy1) < (pw * ph * 0.85):
                                issues.append(
                                    f"{sub['label']}: Pill [{px1},{py1},{px2},{py2}] partially overlaps box [{bx1},{by1},{bx2},{by2}]"
                                )
    return issues, len(tabs), sub_count, svg_count


def main():
    if not HTML_FILE.exists():
        print(f"FAIL: {HTML_FILE} does not exist. Run assemble_wdgm.py first.")
        raise SystemExit(1)

    html = HTML_FILE.read_text(encoding="utf-8")
    errors = []

    scripts = re.findall(r"<script>(.*?)</script>", html, re.DOTALL)
    if not scripts:
        errors.append("No <script> blocks found in assembled HTML")
        full_js = ""
    else:
        full_js = "\n".join(scripts)

    # 1. JS syntax balance
    ok, msg = check_js_balance(full_js)
    print(f"[1] JS syntax balance check: {'PASS' if ok else 'FAIL'} ({msg})")
    if not ok:
        errors.append(msg)

    # 1b. Node.js syntax check if available
    node_bin = shutil.which("node")
    if node_bin and scripts:
        tmp_js = BUILD_DIR / "_tmp_verify_syntax.js"
        try:
            tmp_js.write_text(full_js, encoding="utf-8")
            res = subprocess.run([node_bin, "--check", str(tmp_js)], capture_output=True, text=True)
            if res.returncode == 0:
                print("[1b] Node.js --check JS parse: PASS")
            else:
                print(f"[1b] Node.js --check JS parse: FAIL\n{res.stderr}")
                errors.append(f"Node syntax error: {res.stderr.strip()}")
        finally:
            if tmp_js.exists():
                tmp_js.unlink()
    else:
        print("[1b] Node.js not in PATH, skipped node --check")

    # 2. Static DOM ID integrity
    html_ids = set(re.findall(r'\bid="([^"]+)"', html))
    ref_ids = set(re.findall(r'document\.getElementById\(\s*"([^"]+)"\s*\)', full_js))
    missing_ids = sorted(ref_ids - html_ids)
    print(f"[2] Static DOM ID check: {len(html_ids)} declared, {len(ref_ids)} referenced, {len(missing_ids)} missing")
    if missing_ids:
        errors.append(f"Missing DOM IDs: {missing_ids}")

    # Check dynamic SVG arrow/module IDs
    arr_refs = set(re.findall(r'"(arr_[A-Za-z0-9_]+)"', full_js))
    missing_arrs = sorted(arr_refs - html_ids)
    sub_refs = set(re.findall(r'"(svgSub_MOD_[A-Za-z0-9_]+)"', full_js))
    missing_subs = sorted(sub_refs - html_ids)
    if missing_arrs or missing_subs:
        errors.append(f"Missing SVG IDs: arr={missing_arrs}, sub={missing_subs}")
    print(f"[2b] SVG Arrow & Sub-label ID check: {len(arr_refs)} arrows, {len(sub_refs)} sub-labels -> PASS" if not (missing_arrs or missing_subs) else f"[2b] FAIL: arr={missing_arrs}, sub={missing_subs}")

    # 3. ECUC config keys consistency
    cfg_data_keys = set(re.findall(r'data-cfg-key="([^"]+)"', html))
    cfg_dom_keys = {i[4:] for i in html_ids if i.startswith("cfg_")}
    m_def = re.search(r"const defaultConfig\s*=\s*\{(.*?)\};", full_js, re.DOTALL)
    def_keys = set(re.findall(r"^\s*([A-Za-z0-9_]+)\s*:", m_def.group(1), re.MULTILINE)) if m_def else set()
    m_tt = re.search(r"const configTooltipData\s*=\s*\{(.*?)\n\};", full_js, re.DOTALL)
    tt_keys = set(re.findall(r"^\s*([A-Za-z0-9_]+)\s*:\s*\{", m_tt.group(1), re.MULTILINE)) if m_tt else set()

    print(
        f"[3] ECUC Keys: data-cfg-key={len(cfg_data_keys)}, cfg_DOM={len(cfg_dom_keys)}, defaultConfig={len(def_keys)}, tooltips={len(tt_keys)}"
    )
    if not (cfg_data_keys == cfg_dom_keys == def_keys == tt_keys) or len(cfg_data_keys) < 36:
        errors.append(
            f"ECUC mismatch! data-def={cfg_data_keys - def_keys}, def-data={def_keys - cfg_data_keys}, def-tt={def_keys - tt_keys}, tt-def={tt_keys - def_keys}, dom-data={cfg_dom_keys - cfg_data_keys}"
        )

    # 4. Inline handler coverage
    inline_calls = set(re.findall(r'on(?:click|change|input)="([A-Za-z0-9_]+)\(', html))
    defined_fns = set(re.findall(r"function\s+([A-Za-z0-9_]+)\s*\(", full_js))
    missing_fns = sorted(inline_calls - defined_fns)
    print(f"[4] Inline handler check: {len(inline_calls)} handlers called, {len(missing_fns)} missing")
    if missing_fns:
        errors.append(f"Missing handler functions: {missing_fns}")

    # 5. Scenarios and What-If count
    scen_opts = re.findall(r'<option value="(S\d+)"', html)
    scen_ids = re.findall(r'\{\s*id:\s*"(S\d+)"', full_js)
    whatif_count = len(re.findall(r'label:\s*"🧪', full_js))
    print(f"[5] Scenarios: {len(scen_opts)} dropdown opts, {len(scen_ids)} definitions, {whatif_count} What-If actions")
    if len(scen_ids) != 12 or scen_opts != scen_ids or whatif_count != 36:
        errors.append(f"Scenario count mismatch: opts={scen_opts}, defs={scen_ids}, whatifs={whatif_count}")

    # 6. Abbreviations count
    m_abbr = re.search(r"const ABBREVIATIONS\s*=\s*\[(.*?)\];", full_js, re.DOTALL)
    abbr_entries = re.findall(r'\{\s*abbr:\s*"', m_abbr.group(1)) if m_abbr else []
    print(f"[6] Abbreviations count: {len(abbr_entries)}")
    if len(abbr_entries) < 50:
        errors.append(f"Expected >= 50 abbreviations, found {len(abbr_entries)}")

    # 7. Handbook & SVG check
    hb_result = check_handbook_svgs(full_js)
    if isinstance(hb_result, list):
        errors.extend(hb_result)
    else:
        hb_issues, tab_cnt, sub_cnt, svg_cnt = hb_result
        print(f"[7] Handbook audit: {tab_cnt} tabs, {sub_cnt} sub-tabs, {svg_cnt} SVGs, {len(hb_issues)} geometry/XML issues")
        if hb_issues:
            for iss in hb_issues:
                print(f"    - {iss}")
            errors.extend(hb_issues)

    # 8. Runtime Smoke Test via Node.js (executes Engine + all 12 Scenarios + all 36 What-Ifs + APIs)
    if node_bin and scripts:
        smoke_code = f"""
const fs = require('fs');
const vm = require('vm');
const html = fs.readFileSync({json.dumps(str(HTML_FILE))}, 'utf8');
const scripts = [...html.matchAll(/<script>([\\s\\S]*?)<\\/script>/g)].map(m => m[1]);
const code = scripts.join('\\n');

function makeEl(id) {{
  return {{
    id, value: '', checked: false, textContent: '', innerHTML: '',
    className: '', title: '', disabled: false, style: {{}},
    dataset: {{}}, classList: {{ add(){{}}, remove(){{}}, toggle(){{}}, contains(){{ return false; }} }},
    querySelectorAll(){{ return []; }}, querySelector(){{ return null; }},
    appendChild(){{}}, setAttribute(){{}}, addEventListener(){{}},
    getBoundingClientRect(){{ return {{ left:0, top:0, right:100, bottom:30, width:100, height:30 }}; }},
    contains(){{ return false; }}
  }};
}}
const els = new Map();
const sandbox = {{
  console, Math, Date, Number, String, Boolean, Array, Object, JSON, Set, Map, RegExp, Error,
  parseInt, parseFloat, isNaN, isFinite, encodeURIComponent, decodeURIComponent,
  setTimeout: () => 0, clearTimeout: () => {{}},
  Blob: class {{ constructor(a){{ this.a = a; }} }},
  URL: {{ createObjectURL: () => 'blob:x', revokeObjectURL: () => {{}} }},
  navigator: {{ clipboard: {{ writeText: async () => {{}} }} }},
  document: {{
    documentElement: makeEl('html'),
    body: makeEl('body'),
    getElementById(id) {{ if (!els.has(id)) els.set(id, makeEl(id)); return els.get(id); }},
    querySelectorAll() {{ return []; }},
    querySelector() {{ return makeEl('q'); }},
    createElement(tag) {{ return makeEl(tag); }},
    addEventListener() {{}}
  }},
  window: {{ addEventListener(){{}}, innerWidth: 1440, innerHeight: 900 }}
}};
sandbox.globalThis = sandbox;
const ctx = vm.createContext(sandbox);
vm.runInContext(code, ctx);

// Run every scenario step & every whatIf in sandbox
const scenarios = vm.runInContext('SCENARIOS', ctx);
let stepTotal = 0;
let whatIfTotal = 0;
for (const sc of scenarios) {{
  ctx.loadScenario(sc.id);
  for (let i = 0; i < sc.steps.length; i++) {{
    ctx.applyStepIndex(i);
    stepTotal++;
  }}
  for (let w = 0; w < sc.whatIfs.length; w++) {{
    ctx.runWhatIf(w);
    whatIfTotal++;
  }}
}}
// Test Quick Actions & Exports
ctx.qaReachCheckpoint(0);
ctx.qaReachCheckpoint(1);
ctx.qaReachCheckpoint(2);
ctx.qaRunHealthyCycle();
ctx.qaCycleWdgMode();
ctx.qaPerformReset();
ctx.qaResetAllOk();
ctx.stepAdvanceMs(5);
ctx.stepMainFunctionTick();
const arxml = ctx.generateWdgMArxml();
const cfgC = ctx.generateWdgMCfgC();
const cfgH = ctx.generateWdgMCfgH();
console.log(JSON.stringify({{
  scenarios: scenarios.length,
  stepsExecuted: stepTotal,
  whatIfsExecuted: whatIfTotal,
  arxmlLen: arxml.length,
  cfgCLen: cfgC.length,
  cfgHLen: cfgH.length
}}));
"""
        tmp_smoke = BUILD_DIR / "_tmp_verify_smoke.js"
        try:
            tmp_smoke.write_text(smoke_code, encoding="utf-8")
            res = subprocess.run([node_bin, str(tmp_smoke)], capture_output=True, text=True)
            if res.returncode == 0:
                print(f"[8] Node.js Runtime Smoke Test (12 scenarios, steps, 36 What-Ifs, Quick Actions, ARXML/C/H): PASS -> {res.stdout.strip()}")
            else:
                print(f"[8] Node.js Runtime Smoke Test: FAIL\n{res.stderr}")
                errors.append(f"Runtime smoke error: {res.stderr.strip()}")
        finally:
            if tmp_smoke.exists():
                tmp_smoke.unlink()

    if errors:
        print("\nOVERALL RESULT: FAIL")
        for e in errors:
            print("  ERR:", e)
        raise SystemExit(1)
    else:
        print("\nOVERALL RESULT: PASS (All checks succeeded cleanly!)")


if __name__ == "__main__":
    main()
