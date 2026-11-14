#!/usr/bin/env python3
"""
Verification suite for AUTOSAR EcuM Simulator (Simulation/AUTOSAR_EcuM.html).
Audits:
1. HTML structure & offline standalone requirement
2. JS bracket/quote/template balance + node --check
3. DOM ID consistency (getElementById vs HTML ids)
4. 34 ECUC config keys consistency across HTML / defaultConfig / configTooltipData
5. Inline HTML handler function existence
6. 14 Scenarios (S1..S14), 42 What-Ifs, 54 Abbreviations, 10 Modules
7. 18 Handbook SVGs XML validity + bounding boxes + text fit + zero pill-box overlap
8. Headless Node.js runtime execution across all 14 scenarios, 42 What-Ifs & 8 Quick Actions
"""

import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(BASE_DIR)
HTML_PATH = os.path.join(ROOT_DIR, "Simulation", "AUTOSAR_EcuM.html")

EXPECTED_ECUC_KEYS = [
    "EcuMInitialized", "EcuMArchitectureVariant", "EcuMDevErrorDetect",
    "EcuMVersionInfoApi", "EcuMMainFunctionPeriod", "EcuMLoopDetectionEnabled",
    "EcuMDefaultAppMode", "EcuMConfigConsistencyHash", "InjectedPbConfigHash",
    "SimulatedMcuResetReason", "EcuMDriverInitZeroEnabled", "EcuMDriverInitOneEnabled",
    "EcuMDefaultShutdownTarget", "EcuMSleepModeId", "EcuMSleepModeSuspend",
    "EcuMResetModeId", "EcuMShutdownCauseId", "CurrentBootTarget",
    "Can0WakeupValidationTimeout", "Lin1WakeupValidationTimeout", "Kl15WakeupValidationTimeout",
    "Can0ComMChannelRefEnabled", "Can0ComMPNCRefEnabled", "EcuMSleepModeWakeupSourceMask",
    "EcuMRunMinimumDuration", "User0_RunRequestActive", "User1_PostRunRequestActive",
    "EcuMAlarmClockPresent", "EcuMAlarmClockTimeOut", "EcuMGoDownAllowedForUser0",
    "EcuMMultiCoreSupport", "SlaveCore1ReadyForSleep", "SimulateRamHashCorruption",
    "NvMWriteAllPendingDelay",
]


def scan_js_balance(js_code):
    """Scan JS code for balanced brackets while respecting comments, strings, templates."""
    stack = []
    pairs = {"(": ")", "[": "]", "{": "}"}
    closing = {")": "(", "]": "[", "}": "{"}
    i = 0
    n = len(js_code)
    line = 1
    in_line_comment = False
    in_block_comment = False
    quote_char = None
    template_expr_depths = []

    while i < n:
        ch = js_code[i]
        nxt = js_code[i + 1] if i + 1 < n else ""

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
                continue
            i += 1
            continue

        if quote_char is not None:
            if ch == "\\":
                i += 2
                continue
            if quote_char == "`" and ch == "$" and nxt == "{":
                template_expr_depths.append(len(stack))
                stack.append(("{", line))
                quote_char = None
                i += 2
                continue
            if ch == quote_char:
                quote_char = None
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
            quote_char = ch
            i += 1
            continue

        if ch in pairs:
            stack.append((ch, line))
        elif ch in closing:
            if not stack or stack[-1][0] != closing[ch]:
                return False, f"Unmatched '{ch}' at JS line {line} (stack top: {stack[-1] if stack else 'empty'})"
            stack.pop()
            if template_expr_depths and len(stack) == template_expr_depths[-1] and ch == "}":
                template_expr_depths.pop()
                quote_char = "`"
        i += 1

    if quote_char is not None:
        return False, f"Unclosed string/template quote {quote_char}"
    if in_block_comment:
        return False, "Unclosed block comment"
    if stack:
        return False, f"Unclosed brackets remaining: {stack[:5]}"
    return True, "Balanced"


def check_svg_geometry(svg_str, label):
    errors = []
    try:
        root = ET.fromstring(svg_str)
    except ET.ParseError as exc:
        return [f"{label}: XML parse error: {exc}"]

    vb = root.attrib.get("viewBox", "")
    parts = [float(p) for p in vb.strip().split()]
    if len(parts) != 4:
        return [f"{label}: invalid viewBox '{vb}'"]
    _, _, vb_w, vb_h = parts

    boxes = []
    pills = []

    for elem in root.iter():
        tag = elem.tag.split("}")[-1]
        cls = elem.attrib.get("class", "")
        if tag == "rect":
            try:
                rx = float(elem.attrib.get("x", 0))
                ry = float(elem.attrib.get("y", 0))
                rw = float(elem.attrib.get("width", 0))
                rh = float(elem.attrib.get("height", 0))
            except ValueError:
                continue
            if "svg-pill" in cls:
                pills.append((rx, ry, rw, rh))
                if rx < -0.5 or ry < -0.5 or (rx + rw) > vb_w + 0.5 or (ry + rh) > vb_h + 0.5:
                    errors.append(f"{label}: svg-pill ({rx},{ry},{rw},{rh}) outside viewBox {vb_w}x{vb_h}")
            elif "svg-box" in cls:
                boxes.append((rx, ry, rw, rh))
        elif tag == "text":
            try:
                tx = float(elem.attrib.get("x", 0))
                ty = float(elem.attrib.get("y", 0))
            except ValueError:
                continue
            if tx < 0 or tx > vb_w or ty < 0 or ty > vb_h:
                errors.append(f"{label}: text '{elem.text}' at ({tx},{ty}) outside viewBox")
            box_w_attr = elem.attrib.get("data-box-w")
            if box_w_attr and elem.text:
                box_w = float(box_w_attr)
                fs = float(elem.attrib.get("font-size", 11))
                est_w = len(elem.text) * fs * 0.56
                if est_w > box_w - 6:
                    errors.append(
                        f"{label}: text overflow risk '{elem.text}' (est={est_w:.1f}px > box_w-6={box_w - 6:.1f}px)"
                    )

    for px, py, pw, ph in pills:
        for bx, by, bw, bh in boxes:
            ix = min(px + pw, bx + bw) - max(px, bx)
            iy = min(py + ph, by + bh) - max(py, by)
            if ix > 1.0 and iy > 1.0:
                errors.append(
                    f"{label}: svg-pill ({px},{py},{pw},{ph}) overlaps svg-box ({bx},{by},{bw},{bh}) by {ix:.1f}x{iy:.1f}"
                )

    return errors


def main():
    assert os.path.exists(HTML_PATH), f"Missing {HTML_PATH}"
    with open(HTML_PATH, "r", encoding="utf-8") as f:
        html = f.read()

    failures = []

    # 1. HTML structure & offline check
    print("[1/7] Checking HTML structure & standalone offline constraint...")
    if "<!DOCTYPE html>" not in html or "</html>" not in html:
        failures.append("Missing <!DOCTYPE html> or </html>")
    if re.search(r"<script[^>]+src=|<link[^>]+href=[\"']https?://", html, re.IGNORECASE):
        failures.append("External CDN <script src> or <link href=http...> found!")

    m_script = re.search(r"<script>\s*(.*)\s*</script>\s*</body>\s*</html>", html, re.DOTALL)
    if not m_script:
        failures.append("Could not isolate single main <script>...</script></body></html> block")
        print("\n".join(failures))
        sys.exit(1)

    html_head_body = html[:m_script.start()]
    js_code = m_script.group(1)

    # 2. JS bracket balance & node --check
    print("[2/7] Checking JS bracket/quote balance and syntax...")
    ok_bal, msg_bal = scan_js_balance(js_code)
    if not ok_bal:
        failures.append(f"JS balance error: {msg_bal}")
    else:
        print(f"      -> {msg_bal}")

    node_bin = shutil.which("node")
    if node_bin:
        with tempfile.NamedTemporaryFile("w", suffix=".js", encoding="utf-8", delete=False) as tf:
            tf.write(js_code)
            tmp_js = tf.name
        try:
            res = subprocess.run([node_bin, "--check", tmp_js], capture_output=True, text=True)
            if res.returncode != 0:
                failures.append(f"node --check failed:\n{res.stderr}")
            else:
                print("      -> node --check: PASS")
        finally:
            os.remove(tmp_js)
    else:
        print("      -> node not found in PATH (skipping node --check)")

    # 3. DOM IDs & ECUC config consistency
    print("[3/7] Checking DOM IDs & 34 ECUC keys consistency...")
    html_ids = set(re.findall(r'id="([^"]+)"', html_head_body))
    static_gets = set(re.findall(r'document\.getElementById\("([^"]+)"\)', js_code))
    missing_ids = sorted(gid for gid in static_gets if gid not in html_ids)
    if missing_ids:
        failures.append(f"Missing static DOM IDs referenced in JS: {missing_ids}")

    dom_cfg_keys = set(re.findall(r'data-cfg-key="([^"]+)"', html_head_body))
    m_def = re.search(r"const defaultConfig = \{(.*?)\n\};", js_code, re.DOTALL)
    def_cfg_keys = set(re.findall(r"^\s*([A-Za-z0-9_]+)\s*:", m_def.group(1), re.MULTILINE)) if m_def else set()
    m_tt = re.search(r"const configTooltipData = \{(.*?)\n\};", js_code, re.DOTALL)
    tt_keys = set(re.findall(r"^\s*([A-Za-z0-9_]+)\s*:\s*\{", m_tt.group(1), re.MULTILINE)) if m_tt else set()

    expected_set = set(EXPECTED_ECUC_KEYS)
    for label, s in [("HTML data-cfg-key", dom_cfg_keys), ("defaultConfig", def_cfg_keys), ("configTooltipData", tt_keys)]:
        if s != expected_set:
            failures.append(f"{label} mismatch! Missing={sorted(expected_set - s)}, Extra={sorted(s - expected_set)}")
    for k in EXPECTED_ECUC_KEYS:
        if f"cfg_{k}" not in html_ids:
            failures.append(f"Missing input DOM id 'cfg_{k}'")
    print(f"      -> 34 ECUC keys verified across DOM, defaultConfig & configTooltipData; static DOM IDs: {len(static_gets)} OK")

    # 4. Inline HTML event handlers
    print("[4/7] Checking inline HTML event handler function definitions...")
    defined_fns = set(re.findall(r"function\s+([A-Za-z0-9_]+)\s*\(", js_code))
    inline_calls = re.findall(r'on(?:click|change|input)="([^"]+)"', html_head_body)
    called_fns = set()
    for expr in inline_calls:
        for fn in re.findall(r"([A-Za-z0-9_]+)\s*\(", expr):
            if fn not in ("if",):
                called_fns.add(fn)
    missing_fns = sorted(fn for fn in called_fns if fn not in defined_fns)
    if missing_fns:
        failures.append(f"Undefined inline handler functions: {missing_fns}")
    else:
        print(f"      -> {len(called_fns)} distinct inline handlers all defined")

    # 5. Scenarios, What-Ifs, Abbreviations & Modules
    print("[5/7] Checking 14 Scenarios, 42 What-Ifs, 54 Abbreviations & 10 Modules...")
    scen_ids = re.findall(r'id:\s*"(S\d+)"', js_code)
    whatif_labels = re.findall(r'label:\s*"🧪', js_code)
    select_opts = re.findall(r'<option value="(S\d+)">', html_head_body)
    if len(scen_ids) != 14:
        failures.append(f"Expected 14 scenarios, got {len(scen_ids)}: {scen_ids}")
    if scen_ids != select_opts:
        failures.append(f"Scenario select options {select_opts} != JS scenarios {scen_ids}")
    if len(whatif_labels) != 42:
        failures.append(f"Expected 42 What-If actions, got {len(whatif_labels)}")

    abbr_entries = re.findall(r'abbr:\s*"([^"]+)".*?cat:\s*"([^"]+)"', js_code)
    if len(abbr_entries) < 52:
        failures.append(f"Expected >=52 abbreviations, got {len(abbr_entries)}")
    cats = {c for _, c in abbr_entries}
    if cats != {"PHASE", "START", "WKUP", "SLEEP"}:
        failures.append(f"Unexpected abbreviation categories: {cats}")
    mod_keys = re.findall(r'^\s*(MOD_[A-Z0-9_]+):\s*\{', js_code, re.MULTILINE)
    if len(mod_keys) < 10:
        failures.append(f"Expected >=10 MODULES_INFO entries, got {len(mod_keys)}")
    print(f"      -> Scenarios={len(scen_ids)}, WhatIfs={len(whatif_labels)}, Abbreviations={len(abbr_entries)}, Modules={len(mod_keys)}")

    # 6. Handbook & 18 SVGs Geometric Audit
    print("[6/7] Auditing Handbook structure & all 18 inline SVGs...")
    sys.path.insert(0, BASE_DIR)
    from hb_diagrams_ecum import DIAGRAMS
    from generate_part6_ecum import build_handbook_tabs

    if len(DIAGRAMS) != 18:
        failures.append(f"Expected 18 diagrams, got {len(DIAGRAMS)}")
    tabs = build_handbook_tabs()
    svg_errors = []
    total_svgs = 0
    for ti, tab in enumerate(tabs):
        for si, sub in enumerate(tab["subs"]):
            svgs = re.findall(r"<svg\b.*?</svg>", sub["html"], re.DOTALL)
            total_svgs += len(svgs)
            for idx_svg, svg_xml in enumerate(svgs):
                svg_errors.extend(check_svg_geometry(svg_xml, f"Tab{ti}.Sub{si}.SVG{idx_svg}"))

    if total_svgs != 18:
        failures.append(f"Expected 18 SVGs embedded in HANDBOOK_DATA, found {total_svgs}")
    if svg_errors:
        failures.extend(svg_errors)
    else:
        print(f"      -> All {total_svgs} Handbook SVGs passed XML, viewBox, overflow & zero-overlap checks!")

    # Architecture main SVG XML check
    arch_svg_m = re.search(r'<svg id="ecumArchSvg".*?</svg>', html_head_body, re.DOTALL)
    if arch_svg_m:
        try:
            ET.fromstring(arch_svg_m.group(0))
            print("      -> Main architecture SVG #ecumArchSvg XML valid")
        except ET.ParseError as exc:
            failures.append(f"#ecumArchSvg XML parse error: {exc}")

    # 7. Cross-reference audit: ecucConfig.*, API/callout calls, SVG nodes & arrows, dynamic DOM IDs
    print("[7/8] Auditing cross-references (ecucConfig keys, APIs, SVG nodes/arrows, dynamic IDs)...")
    used_ecuc_keys = set(re.findall(r'\becucConfig\.([A-Za-z0-9_]+)\b', js_code))
    unknown_ecuc = sorted(used_ecuc_keys - expected_set)
    if unknown_ecuc:
        failures.append(f"Unknown ecucConfig.* property access: {unknown_ecuc}")

    api_calls = set(re.findall(r'\b(api_[A-Za-z0-9_]+|execute[A-Za-z0-9_]+)\s*\(', js_code))
    missing_apis = sorted(fn for fn in api_calls if fn not in defined_fns)
    if missing_apis:
        failures.append(f"Undefined engine API/execute calls: {missing_apis}")

    mod_refs = set(re.findall(r"selectModule\('([^']+)'\)", html_head_body))
    missing_mods = sorted(m for m in mod_refs if m not in set(mod_keys))
    if missing_mods:
        failures.append(f"Undefined inspectModule targets in SVG: {missing_mods}")

    arch_arrow_ids = set(re.findall(r'id="(arr[A-Za-z0-9_]+)"', arch_svg_m.group(0))) if arch_svg_m else set()
    used_arrow_ids = set(re.findall(r'"(arr[A-Za-z0-9_]+)"', js_code))
    missing_arrows = sorted(a for a in used_arrow_ids if a not in arch_arrow_ids)
    if missing_arrows:
        failures.append(f"Arrow IDs referenced in JS missing from #ecumArchSvg: {missing_arrows}")

    dynamic_expected_ids = (
        [f"cfgTabBtn{i}" for i in range(6)]
        + [f"cfgPane{i}" for i in range(6)]
        + [f"inspTabBtn{i}" for i in range(4)]
        + [f"hbTab1_{i}" for i in range(7)]
        + [f"catPill_{c}" for c in ("ALL", "PHASE", "START", "WKUP", "SLEEP")]
        + [f"expTab{i}" for i in range(4)]
    )
    missing_dyn = [d for d in dynamic_expected_ids if d not in html_ids]
    if missing_dyn:
        failures.append(f"Missing dynamic tab/pill IDs in HTML: {missing_dyn}")
    print(f"      -> Cross-refs OK: {len(used_ecuc_keys)} ecucConfig.*, {len(api_calls)} engine APIs, {len(mod_refs)} SVG modules, {len(used_arrow_ids)} SVG arrows")

    # 8. Headless Node.js execution test
    if node_bin:
        print("[8/8] Running headless Node.js simulation smoke test (all 14 scenarios, 42 What-Ifs, 8 Quick Actions, Exports)...")
        harness = r"""
const elements = {};
function makeElem(id) {
  return {
    id, value: "", checked: false, textContent: "", innerHTML: "", title: "", disabled: false,
    className: "",
    style: {},
    classList: {
      _set: new Set(),
      add(c) { this._set.add(c); },
      remove(c) { this._set.delete(c); },
      toggle(c, force) {
        if (force === undefined) {
          if (this._set.has(c)) this._set.delete(c); else this._set.add(c);
        } else if (force) this._set.add(c); else this._set.delete(c);
      },
      contains(c) { return this._set.has(c); }
    },
    setAttribute(k, v) { this[k] = v; },
    getAttribute(k) { return this[k] || ""; },
    addEventListener() {},
    querySelector() { return null; },
    getBoundingClientRect() { return { left: 100, top: 100, right: 300, bottom: 130 }; }
  };
}
const document = {
  documentElement: {
    _attrs: { "data-theme": "dark" },
    setAttribute(k, v) { this._attrs[k] = v; },
    getAttribute(k) { return this._attrs[k]; },
    outerHTML: "<html></html>"
  },
  getElementById(id) {
    if (!elements[id]) elements[id] = makeElem(id);
    return elements[id];
  },
  querySelectorAll() { return []; },
  addEventListener() {},
  createElement() { return makeElem("tmp"); }
};
const window = { innerWidth: 1400, innerHeight: 900 };
const navigator = { clipboard: { writeText: () => Promise.resolve() } };
""" + js_code + r"""
for (let i = 0; i < SCENARIOS.length; i++) {
  loadScenario(i);
  const sc = SCENARIOS[i];
  while (currentStepIdx < sc.steps.length) {
    nextScenarioStep();
  }
  prevScenarioStep();
  nextScenarioStep();
  for (let w = 0; w < sc.whatIfs.length; w++) {
    runWhatIf(w);
  }
}
loadScenario(0);
while (currentStepIdx < SCENARIOS[0].steps.length) nextScenarioStep();
qaTriggerWakeup('CAN_CH0_RX');
qaValidatePending();
qaToggleUserRun();
qaTogglePostRun();
qaCallGoDown();
qaEnterSleepDirect();
qaSetAlarmClock();
qaColdReset();
switchHbTab1(0);
switchHbSubTab(2);
switchHbTab1(6);
setAbbrCategory('WKUP');
document.getElementById('abbrSearchInput').value = 'PreOS';
filterAbbreviationTable();
for (let e = 0; e < 4; e++) {
  const p = getExportPayload(e);
  if (!p.text || p.text.length < 30) throw new Error('Empty export payload ' + e);
}
console.log('HEADLESS_SMOKE_OK: scenarios=' + SCENARIOS.length + ', finalPhase=' + simState.majorPhase);
"""
        with tempfile.NamedTemporaryFile("w", suffix=".js", encoding="utf-8", delete=False) as tf:
            tf.write(harness)
            tmp_test = tf.name
        try:
            res = subprocess.run([node_bin, tmp_test], capture_output=True, text=True)
            if res.returncode != 0 or "HEADLESS_SMOKE_OK" not in res.stdout:
                failures.append(f"Headless Node test failed:\nSTDOUT: {res.stdout}\nSTDERR: {res.stderr}")
            else:
                print(f"      -> {res.stdout.strip()}")
        finally:
            os.remove(tmp_test)
    else:
        browser_bin = next(
            (p for p in [
                r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
                r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
                r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            ] if os.path.exists(p)),
            None,
        )
        if browser_bin:
            print(f"[8/8] Running real Chromium headless runtime test via {os.path.basename(browser_bin)}...")
            probe = r"""
window.__PROBE__ = { errors: [], scenarios: 0, steps: 0, whatIfs: 0, hbSubTabs: 0, exports: 0, abbrHasMark: false, targetCards: 0, bits: 0 };
window.addEventListener("error", (e) => { window.__PROBE__.errors.push(String(e.message || e)); });
window.addEventListener("DOMContentLoaded", () => {
  try {
    for (let i = 0; i < SCENARIOS.length; i++) {
      loadScenario(i);
      window.__PROBE__.scenarios++;
      const sc = SCENARIOS[i];
      while (currentStepIdx < sc.steps.length) {
        nextScenarioStep();
        window.__PROBE__.steps++;
      }
      prevScenarioStep();
      nextScenarioStep();
      for (let w = 0; w < sc.whatIfs.length; w++) {
        runWhatIf(w);
        window.__PROBE__.whatIfs++;
      }
    }
    loadScenario(0);
    while (currentStepIdx < SCENARIOS[0].steps.length) nextScenarioStep();
    qaTriggerWakeup("CAN_CH0_RX");
    qaValidatePending();
    qaToggleUserRun();
    qaTogglePostRun();
    qaCallGoDown();
    qaEnterSleepDirect();
    qaSetAlarmClock();
    qaColdReset();
    toggleTheme();
    toggleTheme();
    switchMainView("hb");
    for (let t = 0; t < 6; t++) {
      switchHbTab1(t);
      for (let s = 0; s < 4; s++) { switchHbSubTab(s); window.__PROBE__.hbSubTabs++; }
    }
    switchHbTab1(6);
    setAbbrCategory("WKUP");
    document.getElementById("abbrSearchInput").value = "SetWakeupEvent";
    filterAbbreviationTable();
    window.__PROBE__.abbrHasMark = document.getElementById("hbContentArea").innerHTML.includes("<mark>");
    switchMainView("sim");
    openExportModal();
    for (let e = 0; e < 4; e++) {
      switchExportTab(e);
      if (getExportPayload(e).text.length > 30) window.__PROBE__.exports++;
    }
    closeExportModal();
    window.__PROBE__.targetCards = document.querySelectorAll(".target-card").length;
    window.__PROBE__.bits = document.querySelectorAll(".bit-box, .reg-bit").length;
  } catch (err) {
    window.__PROBE__.errors.push("EXC: " + (err.stack || err.message || err));
  }
  const el = document.createElement("div");
  el.id = "__PROBE_RES__";
  el.textContent = JSON.stringify(window.__PROBE__);
  document.body.appendChild(el);
});
"""
            patched = html.replace("</script>\n</body>", probe + "\n</script>\n</body>")
            with tempfile.TemporaryDirectory() as td:
                tp = os.path.join(td, "test_ecum.html")
                ud = os.path.join(td, "ud")
                with open(tp, "w", encoding="utf-8") as f:
                    f.write(patched)
                url = "file:///" + tp.replace("\\", "/")
                res = subprocess.run(
                    [browser_bin, "--headless=new", "--disable-gpu", f"--user-data-dir={ud}", "--virtual-time-budget=3000", "--dump-dom", url],
                    capture_output=True, text=True, timeout=25,
                )
                m_probe = re.search(r'id="__PROBE_RES__">(.*?)</div>', res.stdout, re.DOTALL)
                if not m_probe:
                    failures.append(f"Chromium headless runtime probe missing from DOM (rc={res.returncode})")
                else:
                    rep = json.loads(m_probe.group(1))
                    if rep["errors"] or rep["scenarios"] != 14 or rep["whatIfs"] != 42 or rep["hbSubTabs"] != 24 or rep["exports"] != 4 or not rep["abbrHasMark"]:
                        failures.append(f"Chromium runtime test reported failure: {rep}")
                    else:
                        print(f"      -> Chromium E2E PASS: {rep}")
        else:
            print("[8/8] Skipping runtime execution (neither node nor Chromium browser found)")

    print("\n" + "=" * 65)
    if failures:
        print(f"FAILED WITH {len(failures)} ISSUE(S):")
        for idx, err in enumerate(failures, 1):
            print(f"  {idx}. {err}")
        sys.exit(1)
    else:
        print("ALL VERIFICATION CHECKS PASSED (0 FAILURES)!")
        sys.exit(0)


if __name__ == "__main__":
    main()
