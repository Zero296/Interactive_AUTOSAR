# -*- coding: utf-8 -*-
"""Static, SVG Geometry, Parity & Runtime Verification Suite for AUTOSAR_BswM.html."""

import json
import os
import re
import shutil
import subprocess
import tempfile
import xml.etree.ElementTree as ET

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
HTML_PATH = os.path.abspath(os.path.join(BASE_DIR, "..", "Simulation", "AUTOSAR_BswM.html"))
SVG_NS = "{http://www.w3.org/2000/svg}"

errors = []
warnings = []


def err(msg):
    errors.append(msg)


def warn(msg):
    warnings.append(msg)


def check_js_balance(js_code):
    """Scan JS string literals, templates, comments, and bracket nesting."""
    stack = []
    i = 0
    n = len(js_code)
    in_squote = False
    in_dquote = False
    in_line_comment = False
    in_block_comment = False
    tpl_expr_depth = []  # track brace depth inside `${...}`

    while i < n:
        ch = js_code[i]
        nxt = js_code[i + 1] if i + 1 < n else ""

        if in_line_comment:
            if ch == "\n":
                in_line_comment = False
            i += 1
            continue

        if in_block_comment:
            if ch == "*" and nxt == "/":
                in_block_comment = False
                i += 2
                continue
            i += 1
            continue

        if in_squote:
            if ch == "\\":
                i += 2
                continue
            if ch == "'":
                in_squote = False
            i += 1
            continue

        if in_dquote:
            if ch == "\\":
                i += 2
                continue
            if ch == '"':
                in_dquote = False
            i += 1
            continue

        in_tpl_str = len(tpl_expr_depth) > 0 and tpl_expr_depth[-1] == -1
        if in_tpl_str:
            if ch == "\\":
                i += 2
                continue
            if ch == "`":
                tpl_expr_depth.pop()
                i += 1
                continue
            if ch == "$" and nxt == "{":
                tpl_expr_depth[-1] = 1
                stack.append("{")
                i += 2
                continue
            i += 1
            continue

        # Normal JS code (or inside `${ ... }` expression)
        if ch == "/" and nxt == "/":
            in_line_comment = True
            i += 2
            continue
        if ch == "/" and nxt == "*":
            in_block_comment = True
            i += 2
            continue
        if ch == "'":
            in_squote = True
            i += 1
            continue
        if ch == '"':
            in_dquote = True
            i += 1
            continue
        if ch == "`":
            tpl_expr_depth.append(-1)
            i += 1
            continue

        # Detect regex literals conservatively (avoid splitting template / etc.)
        if ch == "/" and nxt not in ("/", "*"):
            # Look backward for preceding non-whitespace char
            j = i - 1
            while j >= 0 and js_code[j] in " \t\r\n":
                j -= 1
            prev = js_code[j] if j >= 0 else ""
            if prev in ("", "(", "[", "{", ",", ";", "=", ":", "!", "&", "|", "?", "~", "+", "-", "*", "%", "<", ">", "\n"):
                k = i + 1
                in_cls = False
                closed = False
                while k < n:
                    c2 = js_code[k]
                    if c2 == "\\":
                        k += 2
                        continue
                    if c2 == "[":
                        in_cls = True
                    elif c2 == "]":
                        in_cls = False
                    elif c2 == "/" and not in_cls:
                        closed = True
                        break
                    elif c2 == "\n":
                        break
                    k += 1
                if closed:
                    i = k + 1
                    continue

        if ch in "([{":
            stack.append(ch)
            if tpl_expr_depth and tpl_expr_depth[-1] >= 1 and ch == "{":
                tpl_expr_depth[-1] += 1
        elif ch in ")]}":
            expected = {"(": ")", "[": "]", "{": "}"}
            if not stack or expected[stack[-1]] != ch:
                line_no = js_code[:i].count("\n") + 1
                err(f"JS delimiter mismatch at line {line_no}: unexpected '{ch}' (stack tail: {stack[-3:]})")
                return
            stack.pop()
            if tpl_expr_depth and tpl_expr_depth[-1] >= 1 and ch == "}":
                tpl_expr_depth[-1] -= 1
                if tpl_expr_depth[-1] == 0:
                    tpl_expr_depth[-1] = -1
        i += 1

    if stack or in_squote or in_dquote or tpl_expr_depth or in_block_comment:
        err(f"Unclosed JS state at EOF: stack={stack[-5:]}, sq={in_squote}, dq={in_dquote}, tpl={tpl_expr_depth}")


def verify_svg_geometry(svg_str, label):
    try:
        root = ET.fromstring(svg_str)
    except ET.ParseError as e:
        err(f"SVG XML ParseError in {label}: {e}")
        return

    boxes = []
    for elem in root.iter():
        tag = elem.tag.replace(SVG_NS, "")
        if tag == "rect" and "data-box-w" in elem.attrib:
            boxes.append((
                float(elem.attrib["data-box-x"]),
                float(elem.attrib["data-box-y"]),
                float(elem.attrib["data-box-w"]),
                float(elem.attrib["data-box-h"]),
            ))
        if tag == "text" and "data-box-w" in elem.attrib:
            box_w = float(elem.attrib["data-box-w"])
            txt = "".join(elem.itertext()).strip()
            if txt and len(txt) * 6.5 > box_w - 6:
                err(f"SVG text overflow in {label}: '{txt}' (~{len(txt)*6.5:.0f}px) vs box_w={box_w:.0f}px")

    # Check hb-pill vs rect[data-box-w] overlap
    for g in root.iter():
        if g.tag.replace(SVG_NS, "") == "g" and "data-px" in g.attrib:
            px = float(g.attrib["data-px"])
            py = float(g.attrib["data-py"])
            pw = float(g.attrib["data-pw"])
            ph = float(g.attrib["data-ph"])
            for (bx, by, bw, bh) in boxes:
                ox = min(px + pw, bx + bw) - max(px, bx)
                oy = min(py + ph, by + bh) - max(py, by)
                if ox > 2.0 and oy > 2.0:
                    pill_txt = "".join(g.itertext()).strip()
                    err(f"SVG pill '{pill_txt}' overlaps box [{bx},{by},{bw},{bh}] by {ox:.1f}x{oy:.1f}px in {label}")


def run_browser_runtime_checks(html_content):
    chrome_candidates = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    ]
    browser_bin = next((p for p in chrome_candidates if os.path.exists(p)), None)
    if not browser_bin:
        err("Neither Chrome nor Edge found; cannot perform real browser JS & DOM runtime verification.")
        return

    test_script = """
<div id="__verifyOut">RUNNING</div>
<script>
(function() {
  const out = document.getElementById("__verifyOut");
  const assert = (cond, msg) => { if (!cond) throw new Error("ASSERT FAILED: " + msg); };
  try {
    // Wait / ensure DOMContentLoaded initial state ran or initialize explicitly
    assert(typeof SCENARIOS !== "undefined" && SCENARIOS.length === 14, "Expected 14 SCENARIOS");
    assert(typeof ABBREVIATIONS_DATA !== "undefined" && ABBREVIATIONS_DATA.length >= 52, "Expected >=52 ABBREVIATIONS");
    assert(typeof HANDBOOK_TABS !== "undefined" && HANDBOOK_TABS.length === 6, "Expected 6 HANDBOOK_TABS");
    let subCnt = 0;
    HANDBOOK_TABS.forEach(t => subCnt += (t.subTabs || []).length);
    assert(subCnt === 24, "Expected 24 handbook subTabs, got " + subCnt);

    // 1. Run every scenario forward, rewind backward, and run all 42 What-Ifs in real DOM
    let wfCount = 0;
    for (const sc of SCENARIOS) {
      loadScenario(sc.id);
      assert(document.getElementById("scenIdBadge").textContent === sc.id, "scenIdBadge mismatch " + sc.id);
      for (let i = 0; i < sc.steps.length; i++) nextScenarioStep();
      assert(currentStepIdx === sc.steps.length, sc.id + " forward mismatch");
      while (currentStepIdx > 0) prevScenarioStep();
      assert(currentStepIdx === 0, sc.id + " rewind mismatch");
      assert(sc.whatIfs.length === 3, sc.id + " expected 3 whatIfs");
      for (let w = 0; w < sc.whatIfs.length; w++) {
        loadScenario(sc.id);
        runWhatIf(w);
        wfCount++;
      }
    }

    // 2. Functional checks on real state + DOM badges
    loadScenario("S1");
    nextScenarioStep();
    assert(simState.deferredQueue.length === 1, "S1 step 1 should queue EcuM");
    nextScenarioStep();
    assert(simState.nvmJobType === "NVM_READ_ALL" && simState.rteStarted === false, "S1 step 2 Rte must wait NvM");
    nextScenarioStep();
    nextScenarioStep();
    assert(simState.rteStarted === true && simState.commAllowedCh0 === true, "S1 step 4 Rte+ComM should be TRUE");

    loadScenario("S2");
    for (let i = 0; i < 4; i++) nextScenarioStep();
    assert(simState.ipduVecByte === 0xE7, "S2 final ipduVecByte expected 0xE7, got 0x" + simState.ipduVecByte.toString(16));
    assert(document.getElementById("hdrBadgeIpdu").textContent.includes("0xE7"), "Header IPdu badge missing 0xE7");

    loadScenario("S4");
    nextScenarioStep();
    assert((simState.ipduVecByte & 0x01) === 0 && (simState.ipduVecByte & 0x04) === 0, "S4 Bus-Off must cut Tx & DM immediately");

    loadScenario("S8");
    nextScenarioStep();
    assert(simState.abortOnFailTriggered === true && (simState.ipduVecByte & 0x80) === 0, "S8 AbortOnFail must block RPG_0_Gateway");

    loadScenario("S12");
    nextScenarioStep(); // Step 1: DCM_ENABLE_RX_DISABLE_TX_NORM
    assert((simState.ipduVecByte & 0x01) === 0 && (simState.ipduVecByte & 0x02) === 0x02 && simState.nmEnabledCh0 === true, "S12 step 1 should disable Tx only while keeping Rx & NM");
    nextScenarioStep(); // Step 2: DCM_DISABLE_RX_TX_NORM_NM
    assert((simState.ipduVecByte & 0x20) === 0x20 && (simState.ipduVecByte & 0x03) === 0 && !simState.nmEnabledCh0, "S12 step 2 Diag must remain ON while Normal & NM OFF");

    loadScenario("S10");
    nextScenarioStep(); // Step 1: REQUESTED -> IG_3 (0x08) & IG_4 (0x10) ON
    assert((simState.ipduVecByte & 0x18) === 0x18, "S10 step 1 PNC REQUESTED must open IG_3 & IG_4");
    nextScenarioStep(); // Step 2: PREPARE_SLEEP -> IG_3 OFF, IG_4 ON
    assert((simState.ipduVecByte & 0x18) === 0x10, "S10 step 2 PREPARE_SLEEP must cut IG_3 Tx & hold IG_4 Rx");
    nextScenarioStep(); // Step 3: NO_COMMUNICATION -> both OFF
    assert((simState.ipduVecByte & 0x18) === 0, "S10 step 3 PNC NO_COM must close IG_3 & IG_4");

    loadScenario("S11");
    nextScenarioStep(); // START timer 30ms
    assert(simState.timerRunning === true, "S11 step 1 timer should run");
    stepClockTick(30); // expire immediately
    assert(simState.mrp.timer === "BSWM_TIMER_EXPIRED" && (simState.ipduVecByte & 0x80) === 0, "S11 timer expiry must disable RPG_0");

    loadScenario("S13");
    for (let i = 0; i < 4; i++) nextScenarioStep();
    assert(simState.ipduVecByte === 0x00 && simState.initialized === false, "S13 final must Deinit");

    // Verify floating tooltip (>1s popup) renders clean content
    const firstCfgRow = document.querySelector(".cfg-row[data-cfg-key]");
    assert(firstCfgRow, "Missing cfg-row");
    showConfigTooltip(firstCfgRow.getAttribute("data-cfg-key"), firstCfgRow);
    assert(document.getElementById("cfgTooltipPopup").classList.contains("show"), "Tooltip popup failed to open");
    hideConfigTooltip();
    assert(!document.getElementById("cfgTooltipPopup").classList.contains("show"), "Tooltip popup failed to hide");

    loadScenario("S14");
    for (let i = 0; i < 4; i++) nextScenarioStep();
    assert(simState.detFaults.length >= 4, "S14 expected >=4 DET faults");

    // 3. UI interactions: Quick Actions, Inspector 4 tabs, Handbook 7 tabs + SubTabs + Search highlight, Exports
    loadScenario("S2");
    qaSetComMMode();
    qaToggleCanSmBusOff();
    qaCycleSwcMode();
    qaCyclePnc16Mode();
    qaToggleDcm0x28();
    qaStepEcuLifecycle();
    qaStartStopTimer();
    cycleMrpPort("comm");
    toggleIpduBit(0x01);
    toggleRegisterBit("A", 0x80);
    toggleTheme();
    toggleTheme();
    for (let it = 0; it < 4; it++) switchInspTab(it);
    switchMainView("hb");
    for (let ht = 0; ht < 6; ht++) {
      switchHbTab1(ht);
      for (let st = 0; st < 4; st++) {
        switchHbSubTab(st);
        assert(document.getElementById("hbContentArea").innerHTML.length > 50, "Handbook empty at " + ht + "." + st);
      }
    }
    switchHbTab1(6);
    document.getElementById("abbrSearchInput").value = "TRIGGER";
    filterAbbreviationTable();
    assert(document.getElementById("hbContentArea").innerHTML.includes("<mark>TRIGGER</mark>"), "Search mark highlight failed");
    setAbbrCategory("PDU");
    switchMainView("sim");
    for (let et = 0; et < 4; et++) {
      switchExportTab(et);
      assert(document.getElementById("exportCodeArea").textContent.length > 40, "Export tab " + et + " empty");
    }

    out.textContent = "BROWSER_OK scenarios=14 whatIfs=" + wfCount + " subTabs=" + subCnt + " abbr=" + ABBREVIATIONS_DATA.length;
  } catch (e) {
    out.textContent = "BROWSER_ERR: " + (e && e.stack ? e.stack : String(e));
  }
})();
</script>
</body>
"""
    harness_html = html_content.replace("</body>", test_script)
    with tempfile.NamedTemporaryFile("w", suffix=".html", encoding="utf-8", delete=False) as tf:
        tf.write(harness_html)
        tmp_html = tf.name
    try:
        file_url = "file:///" + tmp_html.replace("\\", "/")
        cmd = [
            browser_bin,
            "--headless=new",
            "--disable-gpu",
            "--no-sandbox",
            "--virtual-time-budget=2500",
            "--dump-dom",
            file_url,
        ]
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        m = re.search(r'<div id="__verifyOut">(.*?)</div>', res.stdout, re.S)
        if not m:
            err(f"Browser headless test did not produce #__verifyOut (exit={res.returncode}). Stderr: {res.stderr[:400]}")
        else:
            status = m.group(1).strip()
            if status.startswith("BROWSER_OK"):
                print(f"[PASS] {status} ({os.path.basename(browser_bin)} headless)")
            else:
                err(f"Browser runtime verification FAILED: {status}")
    finally:
        if os.path.exists(tmp_html):
            os.remove(tmp_html)


def main():
    if not os.path.exists(HTML_PATH):
        err(f"Missing assembled file: {HTML_PATH}")
        return

    with open(HTML_PATH, "r", encoding="utf-8") as f:
        html = f.read()

    # 1. External dependency check & <script> structure
    if html.count("<script>") != 1 or html.count("</script>") != 1:
        err(r"Expected 1 <script>/<\/script> block, got {}/{}".format(html.count("<script>"), html.count("</script>")))
    if re.search(r'<script[^>]+src=|<link[^>]+href=["\']https?://', html, re.I):
        err("Found forbidden external CDN/script/link reference in standalone HTML!")

    # Split HTML part vs JS part
    m = re.search(r"<script>\n(.*?)\n</script>", html, re.S)
    if not m:
        err("Cannot locate <script>...</script> body!")
        return
    js_code = m.group(1)
    html_body = html[:m.start()]

    # 2. JS delimiter check
    check_js_balance(js_code)

    # 3. DOM IDs parity & 36 ECUC keys parity
    dom_ids = set(re.findall(r'\bid=["\']([^"\']+)["\']', html_body))
    cfg_row_keys = set(re.findall(r'data-cfg-key=["\']([^"\']+)["\']', html_body))
    cfg_input_keys = set(re.findall(r'id=["\']cfg_([^"\']+)["\']', html_body))
    if len(cfg_row_keys) != 36:
        err(f"Expected 36 ECUC data-cfg-key rows, found {len(cfg_row_keys)}")
    if cfg_row_keys != cfg_input_keys:
        err(f"ECUC data-cfg-key vs cfg_* mismatch: {cfg_row_keys ^ cfg_input_keys}")

    # Check defaultConfig keys and configTooltipData keys in JS
    def_blk = re.search(r"const defaultConfig = \{(.*?)\n\};", js_code, re.S)
    tt_blk = re.search(r"const configTooltipData = \{(.*?)\n\};", js_code, re.S)
    if not def_blk or not tt_blk:
        err("Missing defaultConfig or configTooltipData object!")
    else:
        def_keys = set(re.findall(r"^\s{2}([A-Za-z0-9_]+):", def_blk.group(1), re.M))
        tt_keys = set(re.findall(r"^\s{2}([A-Za-z0-9_]+):\s*\{", tt_blk.group(1), re.M))
        if def_keys != cfg_row_keys:
            err(f"defaultConfig vs DOM ECUC mismatch: {def_keys ^ cfg_row_keys}")
        if tt_keys != cfg_row_keys:
            err(f"configTooltipData vs DOM ECUC mismatch: {tt_keys ^ cfg_row_keys}")

    # Check getElementById references in JS against DOM IDs
    js_id_refs = set(re.findall(r'getElementById\(\s*["\']([A-Za-z0-9_]+)["\']\s*\)', js_code))
    missing_ids = js_id_refs - dom_ids
    if missing_ids:
        err(f"JS references unknown DOM IDs: {sorted(missing_ids)}")

    # Check inline onclick/onchange/oninput functions exist
    inline_exprs = re.findall(r'on(?:click|change|input)=["\']([^"\']+)["\']', html_body)
    inline_fns = set()
    for expr in inline_exprs:
        for fn in re.findall(r'([A-Za-z_][A-Za-z0-9_]*)\s*\(', expr):
            if fn != "if":
                inline_fns.add(fn)
    defined_fns = set(re.findall(r'function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(', js_code))
    missing_fns = inline_fns - defined_fns
    if missing_fns:
        err(f"HTML inline handlers call undefined JS functions: {sorted(missing_fns)}")

    # Check 11 SVG MOD_* IDs vs MODULES_INFO keys
    svg_mods = set(re.findall(r'id=["\']node_(MOD_[A-Z0-9_]+)["\']', html_body))
    mod_info_blk = re.search(r"const MODULES_INFO = \{(.*?)\n\};", js_code, re.S)
    mod_keys = set(re.findall(r"^\s{2}(MOD_[A-Z0-9_]+):\s*\{", mod_info_blk.group(1), re.M)) if mod_info_blk else set()
    if len(svg_mods) != 11 or svg_mods != mod_keys:
        err(f"SVG MOD_* vs MODULES_INFO mismatch: svg={sorted(svg_mods)} vs js={sorted(mod_keys)}")

    # Check 18 Handbook SVGs
    hb_m = re.search(r"const HANDBOOK_TABS = (\[.*?\n\]);", js_code, re.S)
    if not hb_m:
        err("Missing HANDBOOK_TABS JSON array!")
    else:
        hb_tabs = json.loads(hb_m.group(1))
        svg_count = 0
        err_before = len(errors)
        for t in hb_tabs:
            for st in t["subTabs"]:
                for idx, svg in enumerate(re.findall(r"<svg\b.*?</svg>", st["html"], re.S)):
                    svg_count += 1
                    verify_svg_geometry(svg, f"Tab {t['id']} / {st['title']} #{idx+1}")
        if svg_count != 18:
            err(f"Expected 18 inline Handbook SVGs, found {svg_count}")
        elif len(errors) == err_before:
            print(f"[PASS] Audited {svg_count} inline Handbook SVGs (valid XML, zero text overflow, zero pill-box collisions).")

    # 4. Real headless Chromium runtime verification across DOM, 14 scenarios, 42 what-ifs, 24 sub-tabs, search, exports
    run_browser_runtime_checks(html)

    print(f"\nSummary: {len(errors)} error(s), {len(warnings)} warning(s)")
    for w in warnings:
        print("  WARN:", w)
    for e in errors:
        print("  ERR :", e)
    raise SystemExit(1 if errors else 0)


if __name__ == "__main__":
    main()
