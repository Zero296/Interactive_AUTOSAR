# -*- coding: utf-8 -*-
"""Comprehensive Static, SVG Geometry & Headless Browser Verifier for AUTOSAR_IoHwAb.html."""

import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
HTML_PATH = os.path.join(REPO_ROOT, "Simulation", "04_ECU_Abstraction", "AUTOSAR_IoHwAb.html")

ERRORS = []
WARNINGS = []


def err(msg: str) -> None:
    ERRORS.append(msg)
    print(f"[ERROR] {msg}")


def warn(msg: str) -> None:
    WARNINGS.append(msg)
    print(f"[WARN]  {msg}")


def find_browser_bin() -> str | None:
    candidates = [
        shutil.which("msedge"),
        shutil.which("chrome"),
        shutil.which("chromium"),
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    ]
    for c in candidates:
        if c and os.path.exists(c):
            return c
    return None


def verify_handbook_svgs_xml(js_code: str) -> None:
    m = re.search(r"const HANDBOOK_TABS = (\[.*?\]);\n\nlet activeHbTab1", js_code, re.S)
    if not m:
        err("Could not locate HANDBOOK_TABS JSON in part6")
        return
    tabs = json.loads(m.group(1))
    if len(tabs) != 6:
        err(f"Expected 6 Handbook main tabs, got {len(tabs)}")
        return
    sub_count = sum(len(t["subs"]) for t in tabs)
    if sub_count != 24:
        err(f"Expected 24 Handbook sub-tabs, got {sub_count}")

    svg_count = 0
    for t in tabs:
        for s in t["subs"]:
            svgs = re.findall(r"(<svg\b.*?</svg>)", s["html"], re.S)
            for svg_str in svgs:
                svg_count += 1
                try:
                    root = ET.fromstring(svg_str)
                except ET.ParseError as e:
                    err(f"Handbook SVG XML error in Tab {t['id']} ({s['title']}): {e}")
                    continue

                # Check pill vs rect overlap using geometry attributes
                rects = []
                for rect in root.iter("{http://www.w3.org/2000/svg}rect"):
                    x = float(rect.attrib.get("x", 0))
                    y = float(rect.attrib.get("y", 0))
                    w = float(rect.attrib.get("width", 0))
                    h = float(rect.attrib.get("height", 0))
                    rects.append((x, y, w, h))
                for g in root.iter("{http://www.w3.org/2000/svg}g"):
                    if "hb-pill" in g.attrib.get("class", ""):
                        px = float(g.attrib["data-px"])
                        py = float(g.attrib["data-py"])
                        pw = float(g.attrib["data-pw"])
                        ph = float(g.attrib["data-ph"])
                        for rx, ry, rw, rh in rects:
                            if abs(rx - px) < 0.2 and abs(ry - py) < 0.2 and abs(rw - pw) < 0.2:
                                continue
                            if (px < rx + rw and px + pw > rx and py < ry + rh and py + ph > ry):
                                err(f"Pill overlap in SVG Tab {t['id']} ({s['title']}): pill({px},{py},{pw},{ph}) vs rect({rx},{ry},{rw},{rh})")

    if svg_count != 18:
        err(f"Expected 18 Handbook SVGs, got {svg_count}")
    else:
        print(f"[PASS] Handbook structure & SVG XML valid: 6 main tabs, 24 sub-tabs, {svg_count} SVGs")


def run_browser_verification(html_content: str) -> None:
    browser = find_browser_bin()
    if not browser:
        err("No headless Chromium/Edge binary found for runtime DOM verification!")
        return

    harness = r"""
<div id="__verifyOut">PENDING</div>
<script>
(function() {
  const out = document.getElementById("__verifyOut");
  const errors = [];
  window.addEventListener("error", (ev) => errors.push("WindowErr: " + ev.message));

  function assert(cond, msg) {
    if (!cond) throw new Error(msg);
  }

  try {
    // 1. Default Scenario S4 Loaded on DOMContentLoaded
    assert(typeof SCENARIOS !== "undefined" && SCENARIOS.length === 14, "Expected 14 scenarios, got " + (typeof SCENARIOS !== "undefined" ? SCENARIOS.length : 0));
    assert(Object.keys(defaultConfig).length === 36, "Expected 36 ECUC params");
    assert(ABBREVIATIONS_DATA.length === 52, "Expected 52 abbreviations");

    // 2. Execute all 14 scenarios + steps + undo + all 42 What-Ifs
    let totalSteps = 0;
    let totalWhatIfs = 0;
    for (const s of SCENARIOS) {
      loadScenario(s.id);
      assert(simState.currentScenarioId === s.id, "Failed loading scenario " + s.id);
      for (let i = 0; i < s.steps.length; i++) {
        nextScenarioStep();
        totalSteps++;
      }
      if (s.steps.length > 0) {
        const beforeUndo = simState.currentStepIdx;
        prevScenarioStep();
        assert(simState.currentStepIdx === beforeUndo - 1, "Undo failed in " + s.id);
        nextScenarioStep();
      }
      assert(s.whatIfs && s.whatIfs.length === 3, "Expected 3 WhatIfs for " + s.id);
      for (let wi = 0; wi < s.whatIfs.length; wi++) {
        runWhatIf(wi);
        totalWhatIfs++;
      }
    }

    // 3. Key domain assertions (S1..S14 critical physics & state invariants)
    // S1 Step 3 -> Uninit DET 0x01; Step 4 -> Init RUNNING 0xFB
    loadScenario("S1");
    nextScenarioStep();
    nextScenarioStep();
    nextScenarioStep();
    assert((simState.regAByte & 0x80) === 0 && simState.detLogs.length >= 1, "S1 Step 3 must clear INIT & log DET 0x01");
    nextScenarioStep();
    assert(simState.regAByte === 0xFB, "S1 Step 4 must initialize RegA=0xFB, got 0x" + simState.regAByte.toString(16));

    // S2 Active-Low + 15ms Debounce (5ms -> false, 10ms -> false, 15ms -> true)
    loadScenario("S2");
    nextScenarioStep();
    assert(simState.dioLogicalState === false && simState.dioDebouncing === true, "S2 Step 1 5ms must still debounce");
    nextScenarioStep();
    assert(simState.dioLogicalState === false, "S2 Step 2 10ms must hold false");
    nextScenarioStep();
    assert(simState.dioLogicalState === true && (simState.regAByte & 0x08) !== 0, "S2 Step 3 15ms must invert Active-Low to TRUE");

    // S4 F9 End-to-End: 2500mV -> 2048 -> 50.0% -> 0x4000
    loadScenario("S4");
    for (let i = 0; i < 4; i++) nextScenarioStep();
    assert(simState.adcRawCount === 2048 && Math.abs(simState.adcOutPct - 50.0) < 0.05 && simState.pwmDutyHex === 0x4000,
      "S4 F9 invariant failed: raw=" + simState.adcRawCount + " out=" + simState.adcOutPct + " pwm=" + simState.pwmDutyHex);

    // S5 Ratiometric V5V=4800mV, Pin=2400mV -> 50.0%
    loadScenario("S5");
    nextScenarioStep();
    assert(Math.abs(simState.adcInstPct - 50.0) < 0.1, "S5 Ratiometric failed: got " + simState.adcInstPct);

    // S6 Clamp 99% -> 95% (0x799A) & bit2 PWM_CLAMPED
    loadScenario("S6");
    nextScenarioStep();
    assert(simState.pwmClamped === true && simState.pwmDutyHex === Math.round(0.95 * 0x8000), "S6 Clamp 95% failed");

    // S7 ICU 500Hz/20 teeth -> 1500 RPM, Stall -> 0 RPM
    loadScenario("S7");
    nextScenarioStep();
    assert(simState.icuRpm === 1500 && (simState.regAByte & 0x02) !== 0, "S7 1500 RPM failed");
    nextScenarioStep();
    nextScenarioStep();
    assert(simState.icuRpm === 0 && (simState.regAByte & 0x02) === 0, "S7 Stall timeout failed");

    // S8 Short-to-GND -> RegB SHORT_GND & DEM_FAULT & Substitute 10%
    loadScenario("S8");
    nextScenarioStep();
    nextScenarioStep();
    assert((simState.regBByte & 0x84) === 0x84 && Math.abs(simState.adcOutPct - 10.0) < 0.1, "S8 SCG Substitution 10% failed");

    // S11 FiM Safe-State overrides DCM 0x2F -> 0x0000 IDLE
    loadScenario("S11");
    nextScenarioStep();
    nextScenarioStep();
    assert(simState.pwmOutToIdle === true && simState.pwmDutyHex === 0 && (simState.regBByte & 0x02) !== 0, "S11 FiM Safe-State failed");

    // S12 DCM 0x2F ShortTermAdjustment -> 80% (0x6666)
    loadScenario("S12");
    nextScenarioStep();
    assert((simState.regBByte & 0x01) !== 0 && simState.pwmDutyHex === Math.round(0.8 * 0x8000), "S12 DCM 0x2F failed");

    // 4. Register bit toggles, Quick Actions, Inspector Tabs, Config Changes, Tooltip (>1s class="show")
    loadScenario("S4");
    toggleRegisterBit("B", 7);
    assert((simState.regBByte & 0x80) !== 0, "Toggle Reg B bit 7 failed");
    toggleRegisterBit("B", 7);
    assert((simState.regBByte & 0x80) === 0, "Restore Reg B bit 7 failed");

    qaSetAdcVoltage();
    qaToggleDioBrake();
    qaCyclePwmCmd();
    qaCycleIcuFreq();
    qaCycleFaultInjection();
    qaCycleDcm0x2F();
    qaToggleFiMPerm();
    toggleTheme();
    toggleTheme();

    const firstRow = document.querySelector(".cfg-row[data-cfg-key]");
    assert(firstRow, "Missing cfg-row");
    showConfigTooltip(firstRow.getAttribute("data-cfg-key"), firstRow.getBoundingClientRect());
    assert(document.getElementById("cfgTooltipPopup").classList.contains("show"), "Tooltip failed to add .show class");
    hideConfigTooltip();
    assert(!document.getElementById("cfgTooltipPopup").classList.contains("show"), "Tooltip failed to remove .show class");

    for (let it = 0; it < 4; it++) switchInspTab(it);
    for (let ct = 0; ct < 6; ct++) switchCfgTab(ct);

    // 4b. Test genuine DOM onchange firing on checkbox, number, text & select ECUC inputs
    const chkInit = document.getElementById("cfg_IoHwAbInitialized");
    chkInit.checked = false;
    chkInit.onchange();
    assert(simState.cfg.IoHwAbInitialized === false && (simState.regAByte & 0x80) === 0, "Checkbox onchange failed to update IoHwAbInitialized");
    chkInit.checked = true;
    chkInit.onchange();
    assert(simState.cfg.IoHwAbInitialized === true && (simState.regAByte & 0x80) !== 0, "Checkbox onchange restore failed");

    const numSup = document.getElementById("cfg_IoHwAbSensorSupplyMeasuredMv");
    numSup.value = "4400";
    numSup.onchange();
    assert(simState.cfg.IoHwAbSensorSupplyMeasuredMv === 4400 && (simState.regBByte & 0x08) !== 0, "Number onchange failed on 5V supply");
    numSup.value = "5000";
    numSup.onchange();

    const selPol = document.getElementById("cfg_IoHwAbDioActivePolarity");
    selPol.value = "ACTIVE_HIGH";
    selPol.onchange();
    assert(simState.cfg.IoHwAbDioActivePolarity === "ACTIVE_HIGH", "Select onchange failed on polarity");

    // Verify all 12 SVG modules can be clicked & inspected
    for (const mKey of Object.keys(MODULES_INFO)) {
      selectModule(mKey);
      assert(simState.activeModule === mKey && document.getElementById("inspBody").innerHTML.includes(MODULES_INFO[mKey].sws.slice(0, 6)),
        "selectModule failed for " + mKey);
    }

    // 5. Handbook 6x4 Navigation + Pixel-level SVG text overflow check
    switchMainView("hb");
    let textOverflows = [];
    for (let t = 0; t < 6; t++) {
      switchHbTab1(t);
      for (let s = 0; s < 4; s++) {
        switchHbSubTab(s);
        assert(document.getElementById("hbContentArea").innerHTML.length > 80, "Empty handbook tab " + t + "." + s);
        document.querySelectorAll("#hbContentArea svg text[data-box-w]").forEach((tx) => {
          const bw = parseFloat(tx.getAttribute("data-box-w"));
          const tl = typeof tx.getComputedTextLength === "function" ? tx.getComputedTextLength() : 0;
          if (tl > bw - 4) {
            textOverflows.push("T" + t + "." + s + ": '" + tx.textContent + "' len=" + tl.toFixed(1) + " > box=" + bw);
          }
        });
      }
    }
    assert(textOverflows.length === 0, "SVG Text Overflows: " + textOverflows.join(" | "));

    // 6. Tab 7 Abbreviation Search (<mark> highlight) & Category Filters
    switchHbTab1(6);
    const searchEl = document.getElementById("abbrSearchInput");
    searchEl.value = "Ratiometric";
    filterAbbreviationTable();
    assert(document.getElementById("hbContentArea").innerHTML.includes("<mark>Ratiometric</mark>"), "Mark highlight failed");
    setAbbrCategory("DPWM");
    searchEl.value = "";
    filterAbbreviationTable();
    assert(document.getElementById("abbrCountBadge").textContent.includes("13"), "Category DPWM expected 13 items, got " + document.getElementById("abbrCountBadge").textContent);
    setAbbrCategory("ALL");

    // 7. Export Modal 4 Formats
    switchMainView("sim");
    openExportModal();
    for (let et = 0; et < 4; et++) {
      switchExportTab(et);
      assert(document.getElementById("exportCodeArea").textContent.length > 60, "Export tab " + et + " too short");
    }
    closeExportModal();

    assert(errors.length === 0, "Uncaught browser errors: " + errors.join("; "));
    out.textContent = `BROWSER_OK scenarios=14 steps=${totalSteps} whatIfs=${totalWhatIfs} subTabs=24 abbr=52`;
  } catch (e) {
    out.textContent = "BROWSER_ERR: " + (e && e.stack ? e.stack : String(e));
  }
})();
</script>
</body>
"""
    patched = html_content.replace("</body>", harness)
    with tempfile.NamedTemporaryFile("w", suffix=".html", encoding="utf-8", delete=False) as tf:
        tf.write(patched)
        tmp_path = tf.name

    try:
        file_url = "file:///" + tmp_path.replace("\\", "/")
        cmd = [
            browser,
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
            err(f"Headless browser did not render #__verifyOut (exit={res.returncode}). Stderr: {res.stderr[:400]}")
        else:
            status = m.group(1).strip()
            if status.startswith("BROWSER_OK"):
                print(f"[PASS] {status} ({os.path.basename(browser)} headless)")
            else:
                err(f"Headless browser test FAILED: {status}")
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


def main() -> None:
    if not os.path.exists(HTML_PATH):
        err(f"Missing assembled HTML: {HTML_PATH}")
        sys.exit(1)

    with open(HTML_PATH, "r", encoding="utf-8") as f:
        html = f.read()

    # 1. Single offline script & zero CDN references
    if html.count("<script>") != 1 or html.count("</script>") != 1:
        err(f"Expected exactly 1 <script>...</script> block, found {html.count('<script>')}/{html.count('</script>')}")
    if re.search(r'<script[^>]+src=|<link[^>]+href=["\']https?://', html, re.I):
        err("Forbidden external HTTP/CDN dependency found!")
    if not html.rstrip().endswith("</html>"):
        err("File does not end cleanly with </html>")

    m = re.search(r"<script>\n(.*?)\n</script>", html, re.S)
    if not m:
        err("Could not locate main <script>...</script> body")
        sys.exit(1)
    js_code = m.group(1)
    html_body = html[:m.start()]

    # 2. 36 ECUC params parity (DOM vs defaultConfig vs configTooltipData)
    cfg_rows = set(re.findall(r'data-cfg-key=["\']([^"\']+)["\']', html_body))
    cfg_inputs = set(re.findall(r'id=["\']cfg_([^"\']+)["\']', html_body))
    if len(cfg_rows) != 36:
        err(f"Expected 36 ECUC data-cfg-key rows, found {len(cfg_rows)}")
    if cfg_rows != cfg_inputs:
        err(f"Mismatch data-cfg-key vs cfg_* IDs: {cfg_rows ^ cfg_inputs}")

    def_m = re.search(r"const defaultConfig = \{(.*?)\n\};", js_code, re.S)
    tt_m = re.search(r"const configTooltipData = \{(.*?)\n\};", js_code, re.S)
    if not def_m or not tt_m:
        err("Missing defaultConfig or configTooltipData block")
    else:
        def_keys = set(re.findall(r"^\s{2}([A-Za-z0-9_]+):", def_m.group(1), re.M))
        tt_keys = set(re.findall(r"^\s{2}([A-Za-z0-9_]+):\s*\{", tt_m.group(1), re.M))
        if def_keys != cfg_rows:
            err(f"defaultConfig vs ECUC DOM mismatch: {def_keys ^ cfg_rows}")
        if tt_keys != cfg_rows:
            err(f"configTooltipData vs ECUC DOM mismatch: {tt_keys ^ cfg_rows}")

    # 3. 12 SVG Module IDs vs MODULES_INFO
    svg_mods = set(re.findall(r'id=["\']node_(MOD_[A-Z0-9_]+)["\']', html_body))
    mod_m = re.search(r"const MODULES_INFO = \{(.*?)\n\};", js_code, re.S)
    mod_keys = set(re.findall(r"^\s{2}(MOD_[A-Z0-9_]+):\s*\{", mod_m.group(1), re.M)) if mod_m else set()
    if len(svg_mods) != 12 or svg_mods != mod_keys:
        err(f"Expected 12 SVG modules matching MODULES_INFO, got SVG={len(svg_mods)} JS={len(mod_keys)} diff={svg_mods ^ mod_keys}")

    # 4. DOM getElementById references & inline handlers parity
    dom_ids = set(re.findall(r'\bid=["\']([^"\']+)["\']', html_body))
    js_ids = set(re.findall(r'getElementById\(\s*["\']([A-Za-z0-9_]+)["\']\s*\)', js_code))
    missing_ids = js_ids - dom_ids
    if missing_ids:
        err(f"JS calls getElementById for missing DOM IDs: {sorted(missing_ids)}")

    inline_exprs = re.findall(r'on(?:click|change|input)=["\']([^"\']+)["\']', html_body)
    inline_fns = set()
    for expr in inline_exprs:
        for fn in re.findall(r'([A-Za-z_][A-Za-z0-9_]*)\s*\(', expr):
            if fn != "if":
                inline_fns.add(fn)
    defined_fns = set(re.findall(r'function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(', js_code))
    missing_fns = inline_fns - defined_fns
    if missing_fns:
        err(f"HTML inline handlers reference undefined functions: {sorted(missing_fns)}")

    print(f"[PASS] Static Parity: {len(cfg_rows)} ECUC params, {len(svg_mods)} SVG nodes, {len(inline_fns)} handlers matched")

    # 5. Handbook SVG XML & Geometry verification
    verify_handbook_svgs_xml(js_code)

    # 6. Headless Browser Execution & Pixel Geometry Audit
    run_browser_verification(html)

    if ERRORS:
        print(f"\n[FAIL] {len(ERRORS)} error(s) found.")
        sys.exit(1)
    print(f"\n[ALL PASSED] 0 errors, {len(WARNINGS)} warnings verified cleanly!")


if __name__ == "__main__":
    main()
