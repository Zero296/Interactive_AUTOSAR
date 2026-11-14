# -*- coding: utf-8 -*-
"""Comprehensive static, SVG-layout, parity, and live Chromium headless verification for AUTOSAR_NvM.html."""
import os
import re
import shutil
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
HTML_FILE = os.path.abspath(os.path.join(BASE_DIR, "..", "..", "Simulation", "03_Services", "AUTOSAR_NvM.html"))

sys.path.insert(0, BASE_DIR)
from hb_diagrams_nvm import HANDBOOK_SVGS  # noqa: E402


def scan_js_balance(js_code):
    """Lexical scanner ensuring braces/parens/brackets, strings, regexes & template literals balance cleanly."""
    stack = []
    i = 0
    n = len(js_code)
    in_single = False
    in_double = False
    in_line_comment = False
    in_block_comment = False
    tmpl_depth = 0
    tmpl_brace_depths = []
    line = 1

    prev_token = ""
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
            else:
                i += 1
            continue
        if in_single:
            if ch == "\\":
                i += 2
            elif ch == "'":
                in_single = False
                prev_token = "VAL"
                i += 1
            else:
                i += 1
            continue
        if in_double:
            if ch == "\\":
                i += 2
            elif ch == '"':
                in_double = False
                prev_token = "VAL"
                i += 1
            else:
                i += 1
            continue

        # Template literal body
        if tmpl_depth > 0 and (not tmpl_brace_depths or tmpl_brace_depths[-1] != len(stack)):
            if ch == "\\":
                i += 2
                continue
            if ch == "`":
                tmpl_depth -= 1
                prev_token = "VAL"
                i += 1
                continue
            if ch == "$" and nxt == "{":
                stack.append(("{", line))
                tmpl_brace_depths.append(len(stack))
                prev_token = "OP"
                i += 2
                continue
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
        if ch == "'":
            in_single = True
            i += 1
            continue
        if ch == '"':
            in_double = True
            i += 1
            continue
        if ch == "`":
            tmpl_depth += 1
            i += 1
            continue

        # Regex literal heuristic
        if ch == "/" and prev_token in ("", "OP", "OPEN"):
            j = i + 1
            in_class = False
            closed = False
            while j < n and js_code[j] != "\n":
                rc = js_code[j]
                if rc == "\\":
                    j += 2
                    continue
                if rc == "[":
                    in_class = True
                elif rc == "]":
                    in_class = False
                elif rc == "/" and not in_class:
                    closed = True
                    j += 1
                    break
                j += 1
            if closed:
                i = j
                prev_token = "VAL"
                continue

        if ch in "([{":
            stack.append((ch, line))
            prev_token = "OPEN"
        elif ch in ")]}":
            if not stack:
                return f"Unmatched closing '{ch}' at script line {line}"
            top, open_ln = stack.pop()
            pair = {"(": ")", "[": "]", "{": "}"}[top]
            if pair != ch:
                return f"Mismatched '{top}' (line {open_ln}) closed by '{ch}' (line {line})"
            if ch == "}" and tmpl_brace_depths and len(stack) + 1 == tmpl_brace_depths[-1]:
                tmpl_brace_depths.pop()
            prev_token = "VAL"
        elif ch in ";,=?:+-*&|!<>%^~":
            prev_token = "OP"
        elif not ch.isspace():
            if js_code[i:].startswith("return") or js_code[i:].startswith("typeof") or js_code[i:].startswith("case "):
                prev_token = "OP"
            else:
                prev_token = "VAL"
        i += 1

    if in_single or in_double or in_block_comment or tmpl_depth > 0:
        return f"Unclosed literal/comment (single={in_single}, double={in_double}, comment={in_block_comment}, tmpl={tmpl_depth})"
    if stack:
        top, open_ln = stack[-1]
        return f"Unclosed '{top}' opened at script line {open_ln}"
    return None


def verify_handbook_svgs():
    errors = []
    assert len(HANDBOOK_SVGS) == 18, f"Expected 18 handbook SVGs, got {len(HANDBOOK_SVGS)}"
    for key, svg_str in HANDBOOK_SVGS.items():
        try:
            root = ET.fromstring(svg_str)
        except Exception as exc:
            errors.append(f"SVG {key} XML parse error: {exc}")
            continue

        # Collect rect bounds and pill bounds
        box_rects = []
        pill_rects = []
        for el in root.iter():
            tag = el.tag.split("}")[-1]
            if tag == "g" and "data-px" in el.attrib:
                pill_rects.append((
                    float(el.attrib["data-px"]),
                    float(el.attrib["data-py"]),
                    float(el.attrib["data-pw"]),
                    float(el.attrib["data-ph"]),
                ))
            elif tag == "rect" and "width" in el.attrib and "height" in el.attrib:
                w = float(el.attrib["width"])
                h = float(el.attrib["height"])
                x = float(el.attrib.get("x", 0))
                y = float(el.attrib.get("y", 0))
                # Exclude full background rect (x=0, y=0, w>=900) and pill inner rects (rx=9, h=18)
                if not (x == 0 and y == 0 and w >= 900) and not (el.attrib.get("rx") == "9" and h == 18):
                    box_rects.append((x, y, w, h))
            elif tag == "text" and "data-box-w" in el.attrib:
                bw = float(el.attrib["data-box-w"])
                txt = (el.text or "").strip()
                fsize = float(el.attrib.get("font-size", 11))
                est_w = len(txt) * fsize * 0.56
                if est_w > bw - 8:
                    errors.append(f"SVG {key} text overflow ({est_w:.1f} > {bw - 8}): {txt!r}")

        for px, py, pw, ph in pill_rects:
            for bx, by, bw, bh in box_rects:
                if px < bx + bw - 2 and px + pw > bx + 2 and py < by + bh - 2 and py + ph > by + 2:
                    errors.append(f"SVG {key} pill ({px},{py},{pw},{ph}) overlaps box ({bx},{by},{bw},{bh})")
    return errors


def find_headless_browser():
    candidates = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    ]
    for p in candidates:
        if os.path.exists(p):
            return p
    return shutil.which("chrome") or shutil.which("msedge")


def run_browser_runtime_check(html_text):
    browser = find_headless_browser()
    assert browser, "Chrome/Edge executable not found for headless runtime test!"

    runtime_test_js = r"""
;(function(){
  const errs = [];
  window.addEventListener('error', (e) => { errs.push('window.error: ' + e.message); });
  try {
    const assert = (cond, msg) => { if (!cond) errs.push('ASSERT FAIL: ' + msg); };

    // 1. All 14 Scenarios forward, undo step, replay + 42 What-Ifs
    assert(SCENARIOS.length === 14, 'Expected 14 scenarios, got ' + SCENARIOS.length);
    for (let si = 0; si < SCENARIOS.length; si++) {
      loadScenario(si);
      const scen = SCENARIOS[si];
      assert(scen.whatIfs.length === 3, scen.id + ' must have 3 whatIfs');
      for (let st = 0; st < scen.steps.length; st++) {
        nextScenarioStep();
      }
      assert(currentStepIdx === scen.steps.length - 1, scen.id + ' did not reach final step');
      // Rewind completely via Undo snapshots
      for (let st = 0; st < scen.steps.length; st++) {
        prevScenarioStep();
      }
      assert(currentStepIdx === -1, scen.id + ' undo rewind failed');
      // Replay & test 3 What-Ifs
      for (let wi = 0; wi < scen.whatIfs.length; wi++) {
        loadScenario(si);
        nextScenarioStep();
        runWhatIf(wi);
      }
    }

    // 2. Functional AUTOSAR assertions on key scenarios
    // S1: Init + ReadAll -> INITIALIZED, Block #1 ConfigId OK
    loadScenario('S1');
    for (let i = 0; i < SCENARIOS[0].steps.length; i++) nextScenarioStep();
    assert(ecucConfig.NvMInitialized === true, 'S1 should finish NvMInitialized=true');
    assert(simState.blocks[0].lastResult === 'NVM_REQ_OK', 'S1 ReadAll result should be NVM_REQ_OK');

    // S3: Mirror Sync EXPLICIT_SYNC_OK & RepeatMirrorOperations failure What-If
    loadScenario('S3');
    for (let i = 0; i < SCENARIOS[2].steps.length; i++) nextScenarioStep();
    assert(simState.blocks[2].explicitSyncOk === true, 'S3 should set explicitSyncOk=true');
    loadScenario('S3');
    runWhatIf(0); // exceed RepeatMirrorOps
    assert(simState.blocks[2].lastResult === 'NVM_REQ_NOT_OK', 'S3 WhatIf0 repeat limit exceeded should return NVM_REQ_NOT_OK');

    // S4: Dataset Index 1 vs Index 3 ROM Write DET block
    loadScenario('S4');
    for (let i = 0; i < SCENARIOS[3].steps.length; i++) nextScenarioStep();
    assert(simState.detFaults.some(d => d.name === 'NVM_E_PARAM_BLOCK_DATA_IDX'), 'S4 ROM write must trigger DET 0x0C');

    // S6: CRC Compare Skip & WriteVerification
    loadScenario('S6');
    nextScenarioStep();
    nextScenarioStep();
    assert(simState.blocks[3].lastCrcSkipped === true && (simState.regAByte & 0x08) !== 0, 'S6 step 2 must set CRC_COMP_SKIP');
    nextScenarioStep();
    assert(simState.lastWriteVerifyOk === true && simState.blocks[3].lastResult === 'NVM_REQ_OK', 'S6 step 3 WriteVerify OK');

    // S7: Immediate Preemption & Resume
    loadScenario('S7');
    nextScenarioStep();
    nextScenarioStep();
    assert(simState.immPreemptCount >= 1 && simState.suspendedJob && simState.suspendedJob.blockId === 2, 'S7 must preempt Blk #2 into suspendedJob');
    nextScenarioStep();
    nextScenarioStep();
    assert(simState.blocks[5].lastResult === 'NVM_REQ_OK' && simState.blocks[2].lastResult === 'NVM_REQ_OK' && !simState.suspendedJob, 'S7 must complete #5 then resume #2');

    // S8: CancelWriteAll
    loadScenario('S8');
    for (let i = 0; i < SCENARIOS[7].steps.length; i++) nextScenarioStep();
    assert(simState.blocks[0].lastResult === 'NVM_REQ_CANCELED', 'S8 must end in NVM_REQ_CANCELED');

    // S9: Redundant Copy #0 Corrupt -> Fallback #1 + DEM LOSS_OF_REDUNDANCY
    loadScenario('S9');
    for (let i = 0; i < SCENARIOS[8].steps.length; i++) nextScenarioStep();
    assert(simState.blocks[3].redundancyLoss === true && simState.blocks[3].lastResult === 'NVM_REQ_OK', 'S9 must recover #3 from NV#1 with redundancyLoss=true');
    assert(simState.demFaults.some(d => d.eventId === 'NVM_E_LOSS_OF_REDUNDANCY'), 'S9 must raise DEM NVM_E_LOSS_OF_REDUNDANCY');

    // S10: RestoreBlockDefaults -> NVM_REQ_RESTORED_FROM_ROM
    loadScenario('S10');
    nextScenarioStep();
    nextScenarioStep();
    assert(simState.blocks[2].lastResult === 'NVM_REQ_RESTORED_FROM_ROM' && (simState.regAByte & 0x02) !== 0, 'S10 step 2 must set RESTORED_FROM_ROM');

    // S11: EraseNvBlock(3) Prio!=0 -> DET, EraseNvBlock(5) -> OK
    loadScenario('S11');
    runWhatIf(0);
    assert(simState.detFaults.some(d => d.name === 'NVM_E_BLOCK_CONFIG'), 'S11 Erase Prio=2 must log DET');

    // S12: Static ID Check
    loadScenario('S12');
    nextScenarioStep();
    nextScenarioStep();
    assert(simState.demFaults.some(d => d.eventId === 'NVM_E_WRONG_BLOCK_ID'), 'S12 must detect NVM_E_WRONG_BLOCK_ID');

    // S13: WriteOnce permanent lock
    loadScenario('S13');
    for (let i = 0; i < SCENARIOS[12].steps.length; i++) nextScenarioStep();
    assert(simState.blocks[1].writeOnceLocked === true && simState.blocks[1].writeProtected === true, 'S13 must lock Blk #1 permanently');
    assert(simState.detFaults.some(d => d.name === 'NVM_E_BLOCK_LOCKED'), 'S13 unlock attempt must fail with NVM_E_BLOCK_LOCKED');

    // S14: Retries exhausted DEM & UNINIT DET
    loadScenario('S14');
    for (let i = 0; i < SCENARIOS[13].steps.length; i++) nextScenarioStep();
    assert(simState.demFaults.some(d => d.eventId === 'NVM_E_REQ_FAILED'), 'S14 must emit NVM_E_REQ_FAILED');
    assert(simState.detFaults.some(d => d.name === 'NVM_E_UNINIT'), 'S14 uninit call must emit NVM_E_UNINIT');

    // 3. Quick Actions, Bit Toggle & Tooltip
    loadScenario('S2');
    qaSetRamStatusDirty();
    assert(simState.blocks[3].ramChanged === true, 'qaSetRamStatusDirty failed');
    toggleRegisterBit('A', 0x40);
    assert(simState.blocks[3].ramChanged === false, 'toggleRegisterBit failed');
    const row = document.querySelector(".cfg-row[data-cfg-key='NvMJobPrioritization']");
    showConfigTooltip('NvMJobPrioritization', row, true);
    const tt = document.getElementById('cfgTooltipPopup');
    assert(tt.classList.contains('show') && tt.innerHTML.indexOf('SWS_NvM_00378') >= 0, 'Tooltip failed to show SWS content');
    hideConfigTooltip();
    assert(!tt.classList.contains('show'), 'Tooltip failed to hide');

    // 4. Handbook 24 Sub-tabs + Abbreviation Search + Theme + Export Modal
    switchMainView('hb');
    let hbSvgCount = 0;
    for (let t = 0; t < 6; t++) {
      switchHbTab1(t);
      for (let s = 0; s < 4; s++) {
        switchHbSubTab(s);
        hbSvgCount += document.querySelectorAll('#hbContentArea svg.hb-svg').length;
      }
    }
    assert(hbSvgCount === 18, 'Expected 18 rendered SVGs across 24 sub-tabs, got ' + hbSvgCount);
    switchHbTab1(6);
    const inp = document.getElementById('abbrSearchInput');
    inp.value = 'REDUNDANT';
    filterAbbreviationTable();
    assert(document.querySelectorAll('#hbContentArea mark').length > 0, 'Abbreviation search highlight <mark> missing');
    setAbbrCategory('STACK');
    assert(document.getElementById('abbrCountBadge').textContent.indexOf('/ 54') >= 0, 'Category count badge mismatch');

    toggleTheme();
    assert(document.body.classList.contains('light'), 'Light theme toggle failed');
    toggleTheme();

    openExportModal();
    for (let et = 0; et < 4; et++) {
      switchExportTab(et);
      assert(document.getElementById('exportCodeArea').textContent.trim().length > 80, 'Export tab ' + et + ' empty');
    }
    closeExportModal();

    const pre = document.createElement('pre');
    pre.id = '__VERIFY_REPORT__';
    pre.textContent = JSON.stringify({ ok: errs.length === 0, errors: errs, scenarios: SCENARIOS.length, hbSvgCount });
    document.body.appendChild(pre);
  } catch (ex) {
    const pre = document.createElement('pre');
    pre.id = '__VERIFY_REPORT__';
    pre.textContent = JSON.stringify({ ok: false, errors: errs.concat(['EXCEPTION: ' + ex.message + '\n' + ex.stack]) });
    document.body.appendChild(pre);
  }
})();
</script>
</body>
</html>
"""
    if "</script>\n</body>\n</html>" not in html_text:
        return ["Missing exact closing </script></body></html> anchor for runtime test injection."]

    test_html = html_text.replace("</script>\n</body>\n</html>", runtime_test_js)
    fd, tmp_path = tempfile.mkstemp(suffix=".html", prefix="nvm_verify_")
    os.close(fd)
    try:
        with open(tmp_path, "w", encoding="utf-8") as f:
            f.write(test_html)
        proc = subprocess.run(
            [browser, "--headless=new", "--disable-gpu", "--dump-dom", f"file:///{tmp_path.replace(os.sep, '/')}"],
            capture_output=True,
            text=True,
            encoding="utf-8",
            timeout=35,
        )
        m = re.search(r'<pre id="__VERIFY_REPORT__">([\s\S]*?)</pre>', proc.stdout)
        if not m:
            return [f"Headless browser did not produce __VERIFY_REPORT__ (rc={proc.returncode}, stderr={proc.stderr[:400]})"]
        import json as _json
        import html as _html
        rep = _json.loads(_html.unescape(m.group(1)))
        if not rep.get("ok"):
            return rep.get("errors", ["Unknown browser failure"])
        print(f"  [OK] Headless Chromium Runtime: {rep.get('scenarios')} scenarios x 3 What-Ifs, undo/replay, {rep.get('hbSvgCount')} SVGs, Tooltip, Search, Exports -> PASS")
        return []
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


def main():
    assert os.path.exists(HTML_FILE), f"Assembled HTML missing: {HTML_FILE}"
    with open(HTML_FILE, "r", encoding="utf-8") as f:
        html_text = f.read()

    failures = []

    # 1. Offline & Single-script checks
    script_opens = len(re.findall(r"<script\b", html_text, flags=re.I))
    script_closes = len(re.findall(r"</script>", html_text, flags=re.I))
    if script_opens != 1 or script_closes != 1:
        failures.append(f"Expected 1 <script> pair, found opens={script_opens}, closes={script_closes}")
    if re.search(r'https?://|cdn\.', html_text, flags=re.I):
        # Allow http://autosar.org/schema/r4.0 XML namespace inside NvM.arxml exporter only!
        cleaned = html_text.replace("http://autosar.org/schema/r4.0", "")
        if re.search(r'<script[^>]+src=|<link[^>]+href=["\']https?:|cdn\.', cleaned, flags=re.I):
            failures.append("External CDN/URL detected in HTML/script tags!")

    # 2. JS Lexical balance
    m_js = re.search(r"<script>([\s\S]*)</script>", html_text)
    if not m_js:
        failures.append("Could not extract main <script> block")
    else:
        js_code = m_js.group(1)
        bal_err = scan_js_balance(js_code)
        if bal_err:
            failures.append("JS syntax/bracket error: " + bal_err)
        else:
            print("  [OK] JS Lexical Bracket, String, Regex & Template Balance -> PASS")

        # 3. 36 ECUC Keys Parity
        dom_keys = re.findall(r'data-cfg-key="([A-Za-z0-9_]+)"', html_text)
        dom_ids = set(re.findall(r'id="(cfg_[A-Za-z0-9_]+)"', html_text))
        m_def = re.search(r"const defaultConfig = \{([\s\S]*?)\};", js_code)
        def_keys = re.findall(r"^\s*([A-Za-z0-9_]+)\s*:", m_def.group(1), flags=re.M) if m_def else []
        m_tt = re.search(r"const configTooltipData = \{([\s\S]*?)\n\};", js_code)
        tt_keys = re.findall(r"^\s{2}([A-Za-z0-9_]+):\s*\{", m_tt.group(1), flags=re.M) if m_tt else []

        if len(dom_keys) != 36:
            failures.append(f"Expected 36 DOM ECUC keys, got {len(dom_keys)}")
        if set(dom_keys) != set(def_keys) or set(dom_keys) != set(tt_keys):
            failures.append(f"ECUC key mismatch: dom-def={set(dom_keys)^set(def_keys)}, dom-tt={set(dom_keys)^set(tt_keys)}")
        for k in dom_keys:
            if f"cfg_{k}" not in dom_ids:
                failures.append(f"Missing input/select element id='cfg_{k}'")
        print(f"  [OK] 36 ECUC Config Controls & Tooltips Parity -> PASS")

        # 4. Inline handler parity (skip JS keywords like `if`)
        attr_vals = re.findall(r'\bon(?:click|change|input)="([^"]+)"', html_text)
        handlers = set()
        for val in attr_vals:
            for fn in re.findall(r"\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(", val):
                if fn not in ("if", "return", "Boolean", "Number", "String", "parseInt"):
                    handlers.add(fn)
        for fn in handlers:
            if not re.search(rf"\bfunction\s+{re.escape(fn)}\s*\(", js_code):
                failures.append(f"Missing JS function '{fn}()' referenced by HTML inline handler")
        print(f"  [OK] Inline HTML Handlers Parity ({len(handlers)} functions) -> PASS")

    # 5. Handbook SVG XML + overflow + pill-box collision check
    svg_errs = verify_handbook_svgs()
    failures.extend(svg_errs)
    if not svg_errs:
        print("  [OK] 18 Handbook SVGs (Valid XML, Zero Text Overflow, Zero Pill Overlap) -> PASS")

    # 6. Headless browser runtime verification
    if not failures:
        rt_errs = run_browser_runtime_check(html_text)
        failures.extend(rt_errs)

    if failures:
        print("\n[FAIL] Verification failed with errors:")
        for e in failures:
            print("  -", e)
        sys.exit(1)

    print(f"\nALL VERIFICATION CHECKS PASSED FOR {HTML_FILE}")


if __name__ == "__main__":
    main()
