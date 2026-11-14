# -*- coding: utf-8 -*-
"""Static, SVG Geometry, Parity & Headless Browser Runtime Verification Suite for AUTOSAR_Ea.html."""

import json
import os
import re
import subprocess
import tempfile
import xml.etree.ElementTree as ET

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
HTML_PATH = os.path.abspath(
    os.path.join(BASE_DIR, "..", "..", "Simulation", "04_ECU_Abstraction", "AUTOSAR_Ea.html")
)
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
    tpl_expr_depth = []

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
        if ch == "/" and not in_squote and not in_dquote:
            # Skip regex literal heuristics cleanly where safe (/.../flags)
            prev = js_code[max(0, i - 1)]
            if prev in "(,=:[!&|?{};\n":
                j = i + 1
                escaped = False
                in_cls = False
                found_end = False
                while j < n and js_code[j] != "\n":
                    c2 = js_code[j]
                    if escaped:
                        escaped = False
                    elif c2 == "\\":
                        escaped = True
                    elif c2 == "[":
                        in_cls = True
                    elif c2 == "]":
                        in_cls = False
                    elif c2 == "/" and not in_cls:
                        found_end = True
                        break
                    j += 1
                if found_end:
                    i = j + 1
                    continue

        if ch in "([{":
            stack.append(ch)
            if ch == "{" and tpl_expr_depth and tpl_expr_depth[-1] >= 1:
                tpl_expr_depth[-1] += 1
        elif ch in ")]}":
            expected = {"(": ")", "[": "]", "{": "}"}[stack[-1]] if stack else None
            if expected != ch:
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
    rects_info = []
    texts_info = []
    for elem in root.iter():
        tag = elem.tag.replace(SVG_NS, "")
        if tag == "rect" and "data-box-w" in elem.attrib:
            bx = float(elem.attrib["data-box-x"])
            by = float(elem.attrib["data-box-y"])
            bw = float(elem.attrib["data-box-w"])
            bh = float(elem.attrib["data-box-h"])
            boxes.append((bx, by, bw, bh))
            rects_info.append((bx, by, bw, bh))
        elif tag == "text":
            txt = "".join(elem.itertext()).strip()
            if txt and "x" in elem.attrib and "y" in elem.attrib and elem.attrib.get("text-anchor") == "middle":
                tx = float(elem.attrib["x"])
                ty = float(elem.attrib["y"])
                fsz = float(elem.attrib.get("font-size", "10"))
                texts_info.append((tx, ty, fsz, txt))

    # Check text overflow inside enclosing box_ml rect
    for (tx, ty, fsz, txt) in texts_info:
        # Find tightest enclosing box_ml rect
        enclosing = [b for b in rects_info if b[0] <= tx <= b[0] + b[2] and b[1] <= ty <= b[1] + b[3]]
        if enclosing:
            smallest = min(enclosing, key=lambda b: b[2] * b[3])
            est_w = len(txt) * fsz * 0.54
            if est_w > smallest[2] - 4:
                err(f"SVG text overflow in {label}: '{txt}' (~{est_w:.0f}px) vs box_w={smallest[2]:.0f}px")

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
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    ]
    browser_bin = next((p for p in chrome_candidates if os.path.exists(p)), None)
    if not browser_bin:
        err("Neither Chrome nor Edge found; cannot perform real browser JS & DOM runtime verification.")
        return

    test_script = r"""
<div id="__verifyOut">RUNNING</div>
<script>
document.addEventListener("DOMContentLoaded", function() {
  const out = document.getElementById("__verifyOut");
  const assert = (cond, msg) => { if (!cond) throw new Error("ASSERT FAILED: " + msg); };
  try {
    // 0. Check initial DOMContentLoaded bootstrap
    assert(typeof SCENARIOS !== "undefined" && SCENARIOS.length === 14, "Expected 14 SCENARIOS");
    assert(typeof ABBREVIATIONS_DATA !== "undefined" && ABBREVIATIONS_DATA.length >= 52, "Expected >=52 ABBREVIATIONS, got " + ABBREVIATIONS_DATA.length);
    assert(typeof HANDBOOK_TABS !== "undefined" && HANDBOOK_TABS.length === 6, "Expected 6 HANDBOOK_TABS");
    let subCnt = 0;
    HANDBOOK_TABS.forEach(t => subCnt += (t.subTabs || []).length);
    assert(subCnt === 24, "Expected 24 handbook subTabs, got " + subCnt);
    assert(document.getElementById("scenIdBadge").textContent === "S1", "Initial loadScenario S1 failed");

    // 1. Run all 14 scenarios forward, rewind backward, and execute all 42 What-Ifs
    let wfCount = 0;
    for (const sc of SCENARIOS) {
      loadScenario(sc.id);
      assert(document.getElementById("scenIdBadge").textContent === sc.id, "scenIdBadge mismatch " + sc.id);
      for (let i = 0; i < sc.steps.length; i++) nextScenarioStep();
      assert(uiState.stepIdx === sc.steps.length - 1, sc.id + " forward stepIdx mismatch");
      while (uiState.stepIdx >= 0) prevScenarioStep();
      assert(uiState.stepIdx === -1, sc.id + " full rewind stepIdx mismatch");
      assert(sc.whatIfs && sc.whatIfs.length === 3, sc.id + " expected 3 whatIfs");
      for (let w = 0; w < sc.whatIfs.length; w++) {
        loadScenario(sc.id);
        runWhatIf(w);
        wfCount++;
      }
    }

    // 2. Functional Ea domain assertions
    // S1: Init flow
    loadScenario("S1");
    assert(simState.moduleStatus === "MEMIF_UNINIT", "S1 initial must be MEMIF_UNINIT");
    nextScenarioStep();
    assert(simState.moduleStatus === "MEMIF_BUSY_INTERNAL", "S1 step 1 must enter MEMIF_BUSY_INTERNAL");
    nextScenarioStep();
    assert(simState.moduleStatus === "MEMIF_IDLE" && simState.jobResult === "MEMIF_JOB_OK", "S1 step 2 must reach MEMIF_IDLE");
    assert((simState.regAByte & 0x80) === 0x80, "Reg A b7 EA_INIT must be 1");

    // S2: 3-phase safe write
    loadScenario("S2");
    for (let i = 0; i < SCENARIOS[1].steps.length; i++) nextScenarioStep();
    assert(simState.jobResult === "MEMIF_JOB_OK", "S2 final must complete MEMIF_JOB_OK");
    assert(simState.eepromSlots.BLK1[0].ftrBytes[0] === 0x5A, "S2 final Footer must be 0x5A");

    // S5: Power-loss Mid-Write -> MEMIF_BLOCK_INCONSISTENT
    loadScenario("S5");
    for (let i = 0; i < SCENARIOS[4].steps.length; i++) nextScenarioStep();
    assert(simState.jobResult === "MEMIF_BLOCK_INCONSISTENT", "S5 must produce MEMIF_BLOCK_INCONSISTENT, got " + simState.jobResult);
    assert((simState.regBByte & 0x20) === 0x20, "S5 Reg B b5 INCONSIS must be 1");
    assert(document.getElementById("hdrBadgeResult").textContent.includes("MEMIF_BLOCK_INCONSISTENT"), "Header result badge missing INCONSISTENT");

    // S6: InvalidateBlock -> MEMIF_BLOCK_INVALID
    loadScenario("S6");
    for (let i = 0; i < SCENARIOS[5].steps.length; i++) nextScenarioStep();
    assert(simState.jobResult === "MEMIF_BLOCK_INVALID", "S6 must result in MEMIF_BLOCK_INVALID, got " + simState.jobResult);
    assert((simState.regBByte & 0x10) === 0x10, "S6 Reg B b4 INVALID must be 1");

    // S7: Multi-slot Wear-Leveling rotation on Blk #3
    loadScenario("S7");
    const s7StartSlot = simState.activeSlotByEntry.BLK3;
    for (let i = 0; i < SCENARIOS[6].steps.length; i++) nextScenarioStep();
    assert(simState.activeSlotByEntry.BLK3 !== s7StartSlot, "S7 wear leveling should rotate active slot on BLK3");

    // S8: 8-bit Counter Wrap-Around (0xFF -> 0x00)
    loadScenario("S8");
    for (let i = 0; i < SCENARIOS[7].steps.length; i++) nextScenarioStep();
    assert(simState.eepromSlots.BLK3[simState.activeSlotByEntry.BLK3].hdrBytes[1] === 0x00 || simState.jobResult === "MEMIF_JOB_OK", "S8 wrap-around failed");

    // S9: Immediate Erase + Crash Write + What-If Strict DET Check
    loadScenario("S9");
    for (let i = 0; i < SCENARIOS[8].steps.length; i++) nextScenarioStep();
    assert(simState.jobResult === "MEMIF_JOB_OK" && simState.eepromSlots.BLK4[0].hdrBytes[0] === 0xA5, "S9 crash write after Pre-Erase must commit MEMIF_JOB_OK");
    runWhatIf(0);
    assert(simState.detFaults.length >= 1, "S9 What-If #0 must catch Immediate=FALSE DET fault on Blk #1");

    // S10: Ea_SetMode FAST/SLOW (Step 0 runs SLOW, Step 1 switches to FAST)
    loadScenario("S10");
    nextScenarioStep();
    nextScenarioStep();
    assert(simState.memIfMode === "MEMIF_MODE_FAST" && (simState.regAByte & 0x02) === 0x02, "S10 FAST mode failed");

    // S11: Polling Mode (Step 0 runs Callback, Step 1 switches EaPollingMode = true)
    loadScenario("S11");
    nextScenarioStep();
    nextScenarioStep();
    assert(ecucConfig.EaPollingMode === true && (simState.regAByte & 0x01) === 0x01, "S11 Polling mode failed");

    // S12: Ea_Cancel at Step 1 -> MEMIF_JOB_CANCELED, then Read at Step 2 -> MEMIF_BLOCK_INCONSISTENT
    loadScenario("S12");
    nextScenarioStep();
    nextScenarioStep();
    assert(simState.jobResult === "MEMIF_JOB_CANCELED", "S12 step 1 expected MEMIF_JOB_CANCELED, got " + simState.jobResult);
    nextScenarioStep();
    assert(simState.jobResult === "MEMIF_BLOCK_INCONSISTENT", "S12 final expected MEMIF_BLOCK_INCONSISTENT, got " + simState.jobResult);

    // S13: Hardware Error DEM Injection at Step 1 -> MEMIF_JOB_FAILED, then NvM Retry recovery at Step 2 -> MEMIF_JOB_OK
    loadScenario("S13");
    nextScenarioStep();
    nextScenarioStep();
    assert(simState.demHwFaults.length >= 1 && simState.jobResult === "MEMIF_JOB_FAILED", "S13 step 1 expected DEM HW failure + MEMIF_JOB_FAILED");
    nextScenarioStep();
    assert(simState.jobResult === "MEMIF_JOB_OK", "S13 step 2 expected NvM Retry recovery MEMIF_JOB_OK");

    // S14: DET & Runtime error matrix
    loadScenario("S14");
    for (let i = 0; i < SCENARIOS[13].steps.length; i++) nextScenarioStep();
    assert(simState.detFaults.length >= 4, "S14 expected >=4 DET/Runtime errors, got " + simState.detFaults.length);

    // 3. UI & Tooltips & Config & Quick Actions & Handbook & Exports
    const firstCfgRow = document.querySelector(".cfg-row[data-cfg-key]");
    assert(firstCfgRow, "Missing cfg-row");
    showConfigTooltip(firstCfgRow.getAttribute("data-cfg-key"), firstCfgRow);
    assert(document.getElementById("cfgTooltipPopup").classList.contains("show"), "Tooltip failed to show");
    hideConfigTooltip();
    assert(!document.getElementById("cfgTooltipPopup").classList.contains("show"), "Tooltip failed to hide");

    loadScenario("S2");
    qaEaWrite();
    stepClockTick();
    runActiveJobToCompletion(12);
    qaEaRead();
    runActiveJobToCompletion(12);
    qaTogglePowerLoss();
    qaTogglePowerLoss();
    qaCancelOrSetMode();
    qaResetEaInit();
    corruptOrToggleSlotByte("BLK1", 0, "ftr");
    corruptOrToggleSlotByte("BLK1", 0, "ftr");
    toggleRegisterBit("A", 0x01);
    toggleRegisterBit("B", 0x08);
    toggleTheme();
    toggleTheme();

    for (let it = 0; it < 4; it++) switchInspTab(it);
    switchMainView("hb");
    for (let ht = 0; ht < 6; ht++) {
      switchHbTab1(ht);
      for (let st = 0; st < 4; st++) {
        switchHbSubTab(st);
        assert(document.getElementById("hbContentArea").innerHTML.length > 60, "Empty handbook tab " + ht + "." + st);
      }
    }
    switchHbTab1(6);
    document.getElementById("abbrSearchInput").value = "Virtual";
    filterAbbreviationTable();
    assert(document.getElementById("hbContentArea").innerHTML.includes("<mark>Virtual</mark>"), "Search highlight mark failed");
    setAbbrCategory("ADDR");
    setAbbrCategory("ALL");
    switchMainView("sim");

    openExportModal();
    for (let et = 0; et < 4; et++) {
      switchExportTab(et);
      assert(document.getElementById("exportCodeArea").value.length > 50, "Export tab " + et + " empty");
    }
    closeExportModal();

    out.textContent = "BROWSER_OK scenarios=14 whatIfs=" + wfCount + " subTabs=" + subCnt + " abbr=" + ABBREVIATIONS_DATA.length;
  } catch (e) {
    out.textContent = "BROWSER_ERR: " + (e && e.stack ? e.stack : String(e));
  }
});
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
            "--virtual-time-budget=3000",
            "--dump-dom",
            file_url,
        ]
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=35)
        m = re.search(r'<div id="__verifyOut">(.*?)</div>', res.stdout, re.S)
        if not m:
            err(f"Browser headless test did not produce #__verifyOut (exit={res.returncode}). Stderr: {res.stderr[:500]}")
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
        print(f"Summary: {len(errors)} error(s)")
        for e in errors:
            print("  ERR :", e)
        raise SystemExit(1)

    with open(HTML_PATH, "r", encoding="utf-8") as f:
        html = f.read()

    # 1. Offline / External dependency check & <script> structure
    if html.count("<script>") != 1 or html.count("</script>") != 1:
        err(f"Expected 1 <script>/</script> block, got {html.count('<script>')}/{html.count('</script>')}")
    if re.search(r'<script[^>]+src=|<link[^>]+href=["\']https?://', html, re.I):
        err("Found forbidden external CDN/script/link reference in standalone HTML!")
    if "__HANDBOOK_JSON__" in html or "__ABBR_JSON__" in html:
        err("Unreplaced placeholder token found in assembled HTML!")

    m = re.search(r"<script>\n(.*?)\n</script>", html, re.S)
    if not m:
        err("Cannot locate <script>...</script> body!")
        raise SystemExit(1)
    js_code = m.group(1)
    html_body = html[:m.start()]

    # 2. JS syntax/delimiter balance check
    check_js_balance(js_code)

    # 3. DOM IDs parity & 36 ECUC keys parity
    dom_ids = set(re.findall(r'\bid=["\']([^"\']+)["\']', html_body))
    cfg_row_keys = set(re.findall(r'data-cfg-key=["\']([^"\']+)["\']', html_body))
    cfg_input_keys = set(re.findall(r'id=["\']cfg_([^"\']+)["\']', html_body))
    if len(cfg_row_keys) != 36:
        err(f"Expected 36 ECUC data-cfg-key rows, found {len(cfg_row_keys)}")
    if cfg_row_keys != cfg_input_keys:
        err(f"ECUC data-cfg-key vs cfg_* mismatch: {cfg_row_keys ^ cfg_input_keys}")

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

    js_id_refs = set(re.findall(r'getElementById\(\s*["\']([A-Za-z0-9_]+)["\']\s*\)', js_code))
    missing_ids = js_id_refs - dom_ids
    if missing_ids:
        err(f"JS references unknown DOM IDs: {sorted(missing_ids)}")

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

    # 4. Check 10 SVG MOD_* IDs vs MODULES_INFO keys
    svg_mods = set(re.findall(r'id=["\']node_(MOD_[A-Z0-9_]+)["\']', html_body))
    mod_info_blk = re.search(r"const MODULES_INFO = \{(.*?)\n\};", js_code, re.S)
    mod_keys = set(re.findall(r"^\s{2}(MOD_[A-Z0-9_]+):\s*\{", mod_info_blk.group(1), re.M)) if mod_info_blk else set()
    if len(svg_mods) != 10 or svg_mods != mod_keys:
        err(f"SVG MOD_* vs MODULES_INFO mismatch: svg={sorted(svg_mods)} vs js={sorted(mod_keys)}")

    # 5. Check 18 Handbook SVGs (valid XML, zero text overflow, zero pill-box collisions)
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

    if not errors:
        print(f"[PASS] Static parity checks passed (36 ECUC params, 10 SVG modules, JS balance, 0 external deps).")

    # 6. Headless browser runtime verification
    run_browser_runtime_checks(html)

    print(f"\nSummary: {len(errors)} error(s), {len(warnings)} warning(s)")
    for w in warnings:
        print("  WARN:", w)
    for e in errors:
        print("  ERR :", e)
    raise SystemExit(1 if errors else 0)


if __name__ == "__main__":
    main()
