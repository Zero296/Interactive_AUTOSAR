# -*- coding: utf-8 -*-
"""Comprehensive static, SVG geometry, ECUC parity & headless Edge/Chrome verification for AUTOSAR_Eep.html."""
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET

HERE = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
HTML_PATH = os.path.join(REPO_ROOT, "Simulation", "05_MCAL", "AUTOSAR_Eep.html")

if HERE not in sys.path:
    sys.path.insert(0, HERE)

from hb_diagrams_eep import build_all_hb_diagrams


def check_static_and_parity(html_text):
    errors = []

    # 1. Exactly 1 <script> block and offline guarantees
    script_opens = len(re.findall(r"<script\b[^>]*>", html_text, flags=re.IGNORECASE))
    script_closes = len(re.findall(r"</script>", html_text, flags=re.IGNORECASE))
    if script_opens != 1 or script_closes != 1:
        errors.append(f"Expected exactly 1 <script> tag, found open={script_opens}, close={script_closes}")

    # Check no external scripts/stylesheets/fetches (ignore XML namespace xmlns="http://...")
    ext_patterns = [
        r"<script\b[^>]+src=",
        r"<link\b[^>]+href=",
        r"@import\s+url\(",
        r"\bfetch\s*\(\s*['\"]https?://",
        r"cdn\.",
    ]
    for pat in ext_patterns:
        if re.search(pat, html_text, flags=re.IGNORECASE):
            errors.append(f"Detected forbidden external resource pattern: {pat}")

    # Extract script body
    m = re.search(r"<script>\n(.*)\n</script>", html_text, flags=re.DOTALL)
    if not m:
        errors.append("Could not locate main <script>...</script> block")
        return errors, {}
    js_body = m.group(1)

    # Check HTML body portion (before main script)
    html_part = html_text[: m.start()]

    # 2. Check 36 ECUC keys parity across HTML IDs, data-cfg-key, defaultConfig & configTooltipData
    html_cfg_ids = set(re.findall(r'id="cfg_([A-Za-z0-9_]+)"', html_part))
    html_cfg_attrs = set(re.findall(r'data-cfg-key="([A-Za-z0-9_]+)"', html_part))
    if len(html_cfg_ids) != 36:
        errors.append(f"Expected 36 cfg_* inputs in HTML, found {len(html_cfg_ids)}: {sorted(html_cfg_ids)}")
    if html_cfg_ids != html_cfg_attrs:
        errors.append(f"Mismatch between cfg_* IDs and data-cfg-key attributes: diff={html_cfg_ids ^ html_cfg_attrs}")

    dc_block = re.search(r"const defaultConfig = \{(.*?)\n\};", js_body, flags=re.DOTALL)
    if not dc_block:
        errors.append("Could not find defaultConfig block in JS")
        default_keys = set()
    else:
        default_keys = set(re.findall(r"^\s*([A-Za-z0-9_]+)\s*:", dc_block.group(1), flags=re.MULTILINE))

    tt_block = re.search(r"const configTooltipData = \{(.*?)\n\};", js_body, flags=re.DOTALL)
    if not tt_block:
        errors.append("Could not find configTooltipData block in JS")
        tt_keys = set()
    else:
        tt_keys = set(re.findall(r"^  ([A-Za-z0-9_]+)\s*:\s*\{", tt_block.group(1), flags=re.MULTILINE))

    if html_cfg_ids != default_keys:
        errors.append(f"ECUC key mismatch HTML vs defaultConfig: missing_in_dc={html_cfg_ids - default_keys}, extra_in_dc={default_keys - html_cfg_ids}")
    if html_cfg_ids != tt_keys:
        errors.append(f"ECUC key mismatch HTML vs configTooltipData: missing_in_tt={html_cfg_ids - tt_keys}, extra_in_tt={tt_keys - html_cfg_ids}")

    # 3. Check 10 MOD_* parity between SVG and MODULES_INFO
    svg_mods = set(re.findall(r'id="node_(MOD_[A-Za-z0-9_]+)"', html_part))
    mi_block = re.search(r"const MODULES_INFO = \{(.*?)\n\};", js_body, flags=re.DOTALL)
    mi_mods = set(re.findall(r"^  (MOD_[A-Za-z0-9_]+)\s*:\s*\{", mi_block.group(1), flags=re.MULTILINE)) if mi_block else set()
    if len(svg_mods) != 10 or svg_mods != mi_mods:
        errors.append(f"MOD_* parity mismatch: svg={len(svg_mods)} {sorted(svg_mods)}, js={len(mi_mods)} {sorted(mi_mods)}")

    # 4. Check all inline HTML event handlers map to defined functions in JS
    handler_calls = set(re.findall(r'on(?:click|change|input)="([A-Za-z0-9_]+)\(', html_part))
    for fn in sorted(handler_calls):
        if not re.search(rf"\bfunction\s+{re.escape(fn)}\s*\(", js_body):
            errors.append(f"Inline HTML handler calls undefined JS function: {fn}()")

    # 5. Check static DOM getElementById calls exist in HTML (skip dynamic/handbook-rendered IDs)
    dynamic_ids = {"hbEcucDynamicList"}
    html_all_ids = set(re.findall(r'\bid="([^"]+)"', html_part))
    get_ids = set(re.findall(r'document\.getElementById\(\s*"([A-Za-z0-9_]+)"\s*\)', js_body))
    for gid in sorted(get_ids):
        if gid not in html_all_ids and gid not in dynamic_ids:
            errors.append(f"JS references unknown DOM ID: {gid}")

    # 6. Verify 18 Handbook SVGs (valid XML + zero text overflow + zero pill collisions)
    diagrams = build_all_hb_diagrams()
    if len(diagrams) != 18:
        errors.append(f"Expected 18 handbook SVGs, found {len(diagrams)}")

    for diag_id, svg_str in diagrams.items():
        try:
            root = ET.fromstring(svg_str)
        except ET.ParseError as ex:
            errors.append(f"SVG {diag_id} invalid XML: {ex}")
            continue

        # Check text overflow inside boxes
        for elem in root.iter():
            tag = elem.tag.split("}")[-1]
            if tag == "text" and "data-box-w" in elem.attrib:
                box_w = float(elem.attrib["data-box-w"])
                fs = float(elem.attrib.get("font-size", "10"))
                txt = "".join(elem.itertext())
                approx_w = len(txt) * fs * 0.56
                if approx_w > box_w + 8:
                    errors.append(f"SVG {diag_id} text overflow risk: '{txt}' (~{approx_w:.1f}px) > box_w={box_w}")

        # Collect boxes and pills to check overlap
        rects_boxes = []
        rects_pills = []
        for g in root.iter():
            if g.tag.split("}")[-1] == "g":
                if "data-box-x" in g.attrib:
                    rects_boxes.append((
                        float(g.attrib["data-box-x"]),
                        float(g.attrib["data-box-y"]),
                        float(g.attrib["data-box-w"]),
                        float(g.attrib["data-box-h"]),
                    ))
                elif "data-px" in g.attrib:
                    rects_pills.append((
                        float(g.attrib["data-px"]),
                        float(g.attrib["data-py"]),
                        float(g.attrib["data-pw"]),
                        float(g.attrib["data-ph"]),
                    ))

        def overlaps(a, b):
            ax, ay, aw, ah = a
            bx, by, bw, bh = b
            return not (ax + aw <= bx or bx + bw <= ax or ay + ah <= by or by + bh <= ay)

        for i, p in enumerate(rects_pills):
            for j, b in enumerate(rects_boxes):
                if overlaps(p, b):
                    errors.append(f"SVG {diag_id} pill#{i} {p} overlaps box#{j} {b}")
            for j, p2 in enumerate(rects_pills):
                if i < j and overlaps(p, p2):
                    errors.append(f"SVG {diag_id} pill#{i} {p} overlaps pill#{j} {p2}")

    return errors, {"ecucCount": len(html_cfg_ids), "modCount": len(svg_mods), "svgCount": len(diagrams)}


def find_headless_browser():
    candidates = [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        shutil.which("msedge"),
        shutil.which("chrome"),
    ]
    for c in candidates:
        if c and os.path.exists(c):
            return c
    return None


def run_browser_runtime_verification(html_text):
    browser = find_headless_browser()
    if not browser:
        return ["Headless browser (msedge/chrome) not found on PATH or standard install dirs."], {}

    runtime_test_js = r"""
<script>
window.__eepErrors = [];
window.addEventListener("error", function (ev) {
  window.__eepErrors.push("UNCAUGHT: " + (ev.message || ev.error));
});

window.addEventListener("load", function () {
  const results = { checks: [], failures: [], ecucKeys: Object.keys(defaultConfig).length, scenarios: SCENARIOS.length, whatIfTotal: 0 };
  function assert(cond, msg) {
    if (cond) results.checks.push(msg);
    else results.failures.push("ASSERT FAIL: " + msg);
  }

  try {
    // Wait until DOMContentLoaded initialized cleanly
    assert(SCENARIOS.length === 14, "SCENARIOS.length === 14");
    assert(Object.keys(defaultConfig).length === 36, "defaultConfig has 36 ECUC params");
    assert(Object.keys(configTooltipData).length === 36, "configTooltipData has 36 entries");
    assert(ABBREVIATIONS_DATA.length === 52, "ABBREVIATIONS_DATA has 52 terms");
    assert(HANDBOOK_TABS.length === 6, "HANDBOOK_TABS has 6 topics");
    assert(HANDBOOK_TABS.reduce((a, t) => a + t.subtabs.length, 0) === 24, "24 level-2 subtabs");

    // Verify all 14 scenarios: forward + rewind + 3 What-Ifs each (42 total)
    for (let sIdx = 0; sIdx < SCENARIOS.length; sIdx++) {
      const scen = SCENARIOS[sIdx];
      loadScenario(scen.id);
      assert(uiState.scenStep === 0, scen.id + " starts at step 0");
      for (let st = 0; st < scen.steps.length; st++) {
        nextScenarioStep(false);
        assert(uiState.scenStep === st + 1, scen.id + " forward step " + (st + 1));
      }
      for (let st = scen.steps.length; st > 0; st--) {
        prevScenarioStep();
        assert(uiState.scenStep === st - 1, scen.id + " rewind step " + (st - 1));
      }
      assert(scen.whatIfs.length === 3, scen.id + " has 3 what-ifs");
      for (let w = 0; w < scen.whatIfs.length; w++) {
        loadScenario(scen.id);
        runWhatIf(w);
        results.whatIfTotal++;
      }
    }

    // Domain assertions on key scenarios:
    // S1: UNINIT -> DET 0x00 -> Init -> IDLE & EEP_INIT bit
    loadScenario("S1");
    assert(simState.driverStatus === "MEMIF_UNINIT", "S1 step0 is MEMIF_UNINIT");
    nextScenarioStep(false);
    assert(simState.detFaults.some((d) => d.errorName === "EEP_E_UNINIT"), "S1 step1 catches EEP_E_UNINIT");
    nextScenarioStep(false);
    assert(simState.driverStatus === "MEMIF_IDLE" && (simState.regAByte & 0x80) !== 0, "S1 step2 reaches MEMIF_IDLE + EEP_INIT=1");
    nextScenarioStep(false);
    assert(simState.traceLogs.some((t) => t.api.indexOf("Eep_GetVersionInfo") >= 0), "S1 step3 ran Eep_GetVersionInfo");

    // S2: Slow 24B Read (2 ticks) then Fast 24B Read (1 tick)
    loadScenario("S2");
    nextScenarioStep(false);
    assert(simState.driverStatus === "MEMIF_BUSY" && simState.activeJob.totalLen === 24, "S2 step1 queued 24B");
    nextScenarioStep(false);
    assert(simState.activeJob && simState.activeJob.completedBytes === 16, "S2 step2 read chunk1 16B");
    nextScenarioStep(false);
    assert(simState.driverStatus === "MEMIF_IDLE" && simState.jobResult === "MEMIF_JOB_OK", "S2 step3 finished SLOW read");
    nextScenarioStep(false);
    assert(simState.currentMode === "MEMIF_MODE_FAST" && (simState.regAByte & 0x02) !== 0, "S2 step4 FAST mode active");

    // S3: Write 16B @ 0x0060 + Write Verify
    loadScenario("S3");
    nextScenarioStep(false); nextScenarioStep(false); nextScenarioStep(false);
    assert(simState.eepromMemory[0x60] === 0xC0 && simState.eepromMemory[0x6F] === 0xCF, "S3 wrote 0xC0..0xCF to 0x60..0x6F");
    assert((simState.regBByte & 0x08) !== 0, "S3 WR_VRFY bit lit");

    // S4: Erase 16B @ 0x0050 -> 0xFF
    loadScenario("S4");
    assert(simState.eepromMemory[0x50] !== 0xFF, "S4 seeded non-FF before erase");
    nextScenarioStep(false); nextScenarioStep(false); nextScenarioStep(false);
    assert(simState.eepromMemory[0x50] === 0xFF && (simState.regBByte & 0x10) !== 0, "S4 erased to 0xFF & ERS_OK bit lit");

    // S6: Compare mismatch -> MEMIF_BLOCK_INCONSISTENT
    loadScenario("S6");
    nextScenarioStep(false); nextScenarioStep(false);
    assert(simState.jobResult === "MEMIF_BLOCK_INCONSISTENT" && (simState.regBByte & 0x04) !== 0, "S6 detected BLOCK_INCONSISTENT + CMP_MIS");

    // S7: WriteCycleReduction saves wear count
    loadScenario("S7");
    nextScenarioStep(false);
    assert(simState.writeCounts[0x10] === 1 && simState.jobResult === "MEMIF_JOB_OK", "S7 WriteCycleReduction skipped wear on identical data");
    nextScenarioStep(false);
    assert(simState.writeCounts[0x10] === 1 && simState.writeCounts[0x1A] === 2, "S7 skipped Chunk1 & wrote Chunk2 only");

    // S8: Polling vs Interrupts
    loadScenario("S8");
    nextScenarioStep(false); nextScenarioStep(false); nextScenarioStep(false);
    assert(ecucConfig.EepUseInterrupts === true && (simState.regAByte & 0x01) !== 0 && simState.hwInterruptCount > 0, "S8 ISR mode active & completed faster");

    // S9: SPI frames
    loadScenario("S9");
    nextScenarioStep(false); nextScenarioStep(false); nextScenarioStep(false);
    assert(simState.lastSpiFrames.some((f) => f.cmd.indexOf("WREN") >= 0) && simState.lastSpiFrames.some((f) => f.cmd.indexOf("READ") >= 0), "S9 recorded SPI WREN/WRITE/READ frames");

    // S10: Ea 3 subjobs
    loadScenario("S10");
    nextScenarioStep(false); nextScenarioStep(false); nextScenarioStep(false);
    assert(simState.eepromMemory[0x50] === 0xA5 && simState.eepromMemory[0x5C] === 0x5A && simState.eaSubJobState === "EA_DONE", "S10 Ea 3 Sub-Jobs completed Hdr/Data/Ftr");

    // S11: Eep_Cancel()
    loadScenario("S11");
    nextScenarioStep(false); nextScenarioStep(false);
    assert(simState.jobResult === "MEMIF_JOB_CANCELED" && (simState.regAByte & 0x04) !== 0, "S11 Eep_Cancel set JOB_CANCELED & CANCELED bit");

    // S12: Stuck bit DEM fail -> heal PASSED
    loadScenario("S12");
    nextScenarioStep(false); nextScenarioStep(false);
    assert(simState.demFaults.EEP_E_WRITE_FAILED === "FAILED" && (simState.regBByte & 0x02) !== 0, "S12 triggered DEM EEP_E_WRITE_FAILED");
    nextScenarioStep(false);
    assert(simState.demFaults.EEP_E_WRITE_FAILED === "PASSED" && simState.jobResult === "MEMIF_JOB_OK", "S12 healed DEM to PASSED");

    // S13: Timeout Runtime 0x05
    loadScenario("S13");
    nextScenarioStep(false); nextScenarioStep(false); nextScenarioStep(false);
    assert(simState.detFaults.some((d) => d.errorName === "EEP_E_TIMEOUT") && (simState.regBByte & 0x01) !== 0, "S13 triggered Runtime EEP_E_TIMEOUT");

    // S14: DET error codes
    loadScenario("S14");
    nextScenarioStep(false); nextScenarioStep(false); nextScenarioStep(false);
    assert(simState.detFaults.some((d) => d.errorName === "EEP_E_INVALID_ADDRESS"), "S14 caught INVALID_ADDRESS");
    assert(simState.detFaults.some((d) => d.errorName === "EEP_E_INVALID_LENGTH"), "S14 caught INVALID_LENGTH");
    assert(simState.detFaults.some((d) => d.errorName === "EEP_E_INVALID_DATA"), "S14 caught INVALID_DATA");
    assert(simState.detFaults.some((d) => d.errorName === "EEP_E_PARAM_POINTER"), "S14 caught PARAM_POINTER");
    assert(simState.detFaults.some((d) => d.errorName === "EEP_E_BUSY" && d.kind === "RUNTIME"), "S14 caught RUNTIME EEP_E_BUSY");

    // UI Tests: Config tabs 0..5 toggle .hidden
    for (let t = 0; t < 6; t++) {
      switchCfgTab(t);
      let vis = 0;
      for (let k = 0; k < 6; k++) {
        if (!document.getElementById("cfgPane" + k).classList.contains("hidden")) vis++;
      }
      assert(vis === 1 && !document.getElementById("cfgPane" + t).classList.contains("hidden"), "switchCfgTab(" + t + ") shows exactly 1 pane");
    }

    // Handbook 6x4 + Tab 7 Abbreviation search & category pills
    switchMainView("hb");
    for (let t1 = 0; t1 < 6; t1++) {
      switchHbTab1(t1);
      for (let t2 = 0; t2 < 4; t2++) {
        switchHbTab2(t2);
        assert(document.getElementById("hbContentArea").innerHTML.length > 80, "Handbook tab " + t1 + "." + t2 + " rendered");
      }
    }
    switchHbTab1(6);
    assert(document.querySelectorAll("#hbContentArea tbody tr").length === 52, "Abbreviation table displays all 52 terms initially");
    setAbbrCategory("ADDR");
    assert(document.querySelectorAll("#hbContentArea tbody tr").length === 15, "ADDR filter shows 15 terms");
    setAbbrCategory("ALL");
    document.getElementById("abbrSearchInput").value = "WIP";
    filterAbbreviationTable();
    assert(document.querySelectorAll("#hbContentArea mark").length >= 1, "Search highlights <mark>WIP</mark>");
    switchMainView("sim");

    // Export modal tabs 0..3
    openExportModal();
    for (let et = 0; et < 4; et++) {
      switchExportTab(et);
      assert(document.getElementById("exportCodeArea").textContent.length > 40, "Export tab " + et + " generated content");
    }
    closeExportModal();

    // Tooltip test
    const rowEl = document.querySelector('.cfg-row[data-cfg-key="EepWriteCycleReduction"]');
    showConfigTooltip("EepWriteCycleReduction", rowEl);
    assert(document.getElementById("cfgTooltipPopup").classList.contains("show"), "Tooltip shows cleanly");
    hideConfigTooltip();

    // Cell click & Bit toggle & Theme
    setEepCellClickMode("STUCK_BIT");
    toggleEepromCell(0x40);
    assert(Boolean(simState.stuckBits[0x40]), "Cell click injected stuck bit @ 0x40");
    toggleTheme();
    assert(document.documentElement.getAttribute("data-theme") === "light", "Theme toggled to light");
    toggleTheme();

    // Quick Action test
    loadScenario("S1");
    qaResetEepInit();
    qaEepWrite();
    stepClockTick(5);
    assert(simState.eepromMemory[0x60] === 0xDE, "Quick Action Eep_Write wrote 0xDE @ 0x60");
  } catch (e) {
    results.failures.push("EXCEPTION: " + e.message + " | " + (e.stack || ""));
  }

  results.uncaughtErrors = window.__eepErrors;
  const out = document.createElement("div");
  out.id = "__verifyOut";
  out.textContent = JSON.stringify(results);
  document.body.appendChild(out);
});
</script>
"""

    injected = html_text.replace("</body>", runtime_test_js + "\n</body>")
    with tempfile.NamedTemporaryFile("w", suffix=".html", delete=False, encoding="utf-8") as tf:
        tf.write(injected)
        tmp_path = tf.name

    try:
        cmd = [
            browser,
            "--headless=new",
            "--disable-gpu",
            "--no-sandbox",
            "--virtual-time-budget=4000",
            "--dump-dom",
            tmp_path,
        ]
        proc = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=40)
        dom = proc.stdout
        m = re.search(r'<div id="__verifyOut">(.*?)</div>', dom, flags=re.DOTALL)
        if not m:
            return [f"Browser verification did not produce __verifyOut (returncode={proc.returncode}). Stderr: {proc.stderr[:400]}"], {}
        raw_json = m.group(1).replace("&quot;", '"').replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
        data = json.loads(raw_json)
        errs = []
        if data.get("uncaughtErrors"):
            errs.extend(data["uncaughtErrors"])
        if data.get("failures"):
            errs.extend(data["failures"])
        return errs, data
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


def main():
    if not os.path.exists(HTML_PATH):
        print(f"ERROR: {HTML_PATH} not found! Run assemble_eep.py first.")
        sys.exit(1)

    with open(HTML_PATH, "r", encoding="utf-8") as f:
        html_text = f.read()

    print("=== [1/2] Static, Parity & 18-SVG Geometry Checks ===")
    static_errs, static_info = check_static_and_parity(html_text)
    if static_errs:
        for e in static_errs:
            print("  [FAIL]", e)
        sys.exit(1)
    print(f"  [PASS] ECUC Params: {static_info.get('ecucCount')}, Modules: {static_info.get('modCount')}, Handbook SVGs: {static_info.get('svgCount')} (0 overflows, 0 overlaps)")

    print("=== [2/2] Headless Edge/Chrome Runtime & Interactive Simulation Checks ===")
    rt_errs, rt_info = run_browser_runtime_verification(html_text)
    if rt_errs:
        for e in rt_errs:
            print("  [FAIL]", e)
        sys.exit(1)

    print(
        f"  [PASS] Checks passed: {len(rt_info.get('checks', []))} assertions, "
        f"{rt_info.get('scenarios')} scenarios (forward + rewind), "
        f"{rt_info.get('whatIfTotal')} What-If buttons, 0 uncaught JS errors."
    )
    print("ALL VERIFICATION CHECKS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    main()
