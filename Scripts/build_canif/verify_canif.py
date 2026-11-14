# -*- coding: utf-8 -*-
"""5-stage verification suite for AUTOSAR_CanIf.html including headless Chromium/Edge runtime & SVG geometry check."""

import json
import os
import re
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET
from html.parser import HTMLParser

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
HTML_PATH = os.path.join(ROOT_DIR, "Simulation", "04_ECU_Abstraction", "AUTOSAR_CanIf.html")
ARTIFACT_SCRATCH = r"C:\Users\Acer\.gemini\antigravity\brain\72bd933b-e222-4c24-9bd6-ac93c27bca45\scratch"

CHROME_PATHS = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
]


class DomInspector(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = set()
        self.cfg_keys = []
        self.cfg_input_ids = []
        self.handlers = []

    def handle_starttag(self, tag, attrs):
        attr_map = dict(attrs)
        el_id = attr_map.get("id")
        if el_id:
            self.ids.add(el_id)
            if el_id.startswith("cfg_"):
                self.cfg_input_ids.append(el_id[4:])
        if "data-cfg-key" in attr_map:
            self.cfg_keys.append(attr_map["data-cfg-key"])
        for ev in ("onclick", "onchange", "oninput"):
            val = attr_map.get(ev)
            if val:
                for m in re.finditer(r"([A-Za-z_][A-Za-z0-9_]*)\s*\(", val):
                    self.handlers.append((ev, m.group(1), val))


def stage1_offline_check(html_text):
    print("[Stage 1] Checking file integrity & 100% offline compliance...")
    assert len(html_text) > 100_000, "Output HTML unexpectedly small"
    assert "<html" in html_text and "</html>" in html_text
    # Allow only XML namespace URIs, reject any external network assets/links
    cleaned = re.sub(r'xmlns="http://(?:www\.w3\.org/2000/svg|autosar\.org/schema/r4\.0)"', "", html_text)
    cleaned = re.sub(r"https?://autosar\.org/schema/r4\.0", "", cleaned)
    ext_refs = re.findall(r'(?:src|href)\s*=\s*["\']\s*(?:https?:)?//', cleaned, flags=re.I)
    assert not ext_refs, f"Found external asset references: {ext_refs}"
    css_urls = re.findall(r"@import\s+url\s*\(\s*['\"]?https?:", cleaned, flags=re.I)
    assert not css_urls, f"Found external CSS imports: {css_urls}"
    print("  PASS: 100% offline self-contained HTML verified.")


def stage2_dom_and_handlers(html_text):
    print("[Stage 2] Checking DOM IDs, inline handlers & JS function declarations...")
    body_part = html_text.split("<script>", 1)[0]
    script_part = html_text.split("<script>", 1)[1].rsplit("</script>", 1)[0]

    parser = DomInspector()
    parser.feed(body_part)

    # All inline handler top-level function calls must exist as function declarations
    fn_defs = set(re.findall(r"function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(", script_part))
    missing_fns = sorted({fn for _, fn, _ in parser.handlers if fn not in fn_defs})
    assert not missing_fns, f"Missing JS functions referenced by HTML inline handlers: {missing_fns}"

    # Verify static document.getElementById("literal") calls match DOM IDs
    static_ids = set(re.findall(r'document\.getElementById\(\s*["\']([A-Za-z0-9_-]+)["\']\s*\)', script_part))
    missing_ids = sorted(static_ids - parser.ids)
    assert not missing_ids, f"JS calls getElementById for missing DOM IDs: {missing_ids}"
    print(f"  PASS: {len(parser.handlers)} inline handler calls & {len(static_ids)} getElementById targets verified.")
    return parser, script_part


def stage3_ecuc_parity(parser, script_part):
    print("[Stage 3] Checking 36 ECUC Config 4-way parity...")
    m_def = re.search(r"const\s+defaultConfig\s*=\s*\{(.*?)\n\};", script_part, flags=re.S)
    assert m_def, "Could not locate defaultConfig block"
    def_keys = re.findall(r"^\s*([A-Za-z0-9_]+)\s*:", m_def.group(1), flags=re.M)

    m_tt = re.search(r"const\s+configTooltipData\s*=\s*\{(.*?)\n\};", script_part, flags=re.S)
    assert m_tt, "Could not locate configTooltipData block"
    tt_keys = re.findall(r"^\s{2}([A-Za-z0-9_]+)\s*:\s*\{", m_tt.group(1), flags=re.M)

    set_attr = set(parser.cfg_keys)
    set_inp = set(parser.cfg_input_ids)
    set_def = set(def_keys)
    set_tt = set(tt_keys)

    assert len(set_attr) == 36, f"Expected 36 data-cfg-key attributes, got {len(set_attr)}"
    assert set_attr == set_inp, f"Mismatch attr vs inputs: {set_attr ^ set_inp}"
    assert set_attr == set_def, f"Mismatch attr vs defaultConfig: {set_attr ^ set_def}"
    assert set_attr == set_tt, f"Mismatch attr vs configTooltipData: {set_attr ^ set_tt}"
    print("  PASS: Exact 36 ECUC parameters match across data-cfg-key, cfg_* inputs, defaultConfig & configTooltipData.")


def stage4_handbook_svg_xml():
    print("[Stage 4] Validating Handbook inline SVGs (XML + bounding boxes)...")
    if SCRIPT_DIR not in sys.path:
        sys.path.insert(0, SCRIPT_DIR)
    from hb_diagrams_canif import build_diagrams

    diags = build_diagrams()
    assert len(diags) == 10, f"Expected 10 handbook diagrams, got {len(diags)}"
    for name, svg_str in diags.items():
        root = ET.fromstring(svg_str)
        vb = [float(v) for v in root.attrib["viewBox"].split()]
        vb_w, vb_h = vb[2], vb[3]
        for el in root.iter():
            tag = el.tag.split("}")[-1]
            if tag == "rect":
                x = float(el.attrib["x"])
                y = float(el.attrib["y"])
                w = float(el.attrib["width"])
                h = float(el.attrib["height"])
                assert x >= 0 and y >= 0, f"{name}: negative rect origin ({x}, {y})"
                assert x + w <= vb_w + 1 and y + h <= vb_h + 1, f"{name}: rect exceeds viewBox ({x+w}>{vb_w} or {y+h}>{vb_h})"
    print(f"  PASS: All {len(diags)} Handbook SVG diagrams parsed with valid XML & viewBox bounds.")


def find_browser():
    for p in CHROME_PATHS:
        if os.path.exists(p):
            return p
    return None


def stage5_headless_browser_test(html_text):
    print("[Stage 5] Running real V8 + DOM + SVG geometry checks in headless browser...")
    browser = find_browser()
    assert browser, "Neither Chrome nor Edge found on system!"

    test_harness = r"""
<script>
window.__testErrors = [];
window.addEventListener("error", (e) => {
  window.__testErrors.push(e.message + " @" + (e.lineno || "?"));
});

window.addEventListener("load", () => {
  const report = { errors: [], checks: [], svgOverflows: [] };
  const assert = (cond, msg) => {
    if (!cond) report.errors.push("ASSERT FAIL: " + msg);
    else report.checks.push(msg);
  };

  try {
    // 1. Data inventory checks
    assert(SCENARIOS.length === 12, "SCENARIOS === 12");
    assert(HANDBOOK_TABS.length === 6, "HANDBOOK_TABS === 6");
    assert(ABBREVIATIONS.length === 58, "ABBREVIATIONS === 58");
    assert(Object.keys(configTooltipData).length === 36, "configTooltipData === 36");
    assert(Object.keys(defaultConfig).length === 36, "defaultConfig === 36");

    // 2. Execute all 12 scenarios + all 36 what-ifs + step rollback
    let whatIfTotal = 0;
    SCENARIOS.forEach(sc => {
      loadScenario(sc.id);
      assert(uiState.stepIndex === 0, sc.id + " reset stepIndex=0");
      for (let i = 0; i < sc.steps.length; i++) {
        nextScenarioStep();
      }
      assert(uiState.stepIndex === sc.steps.length, sc.id + " reached final step " + sc.steps.length);
      prevScenarioStep();
      assert(uiState.stepIndex === sc.steps.length - 1, sc.id + " prevScenarioStep works");
      sc.whatIfs.forEach(w => {
        w.run();
        syncInputsFromConfig();
        renderAll();
        whatIfTotal++;
      });
    });
    assert(whatIfTotal === 36, "Executed all 36 What-If actions");

    // 3. Core CanIf semantics: TxBuffer Priority Sort & Auto-Drain
    loadScenario("S2");
    api_CanIf_Transmit("2");
    api_CanIf_Transmit("3"); // 0x7E8 queued first
    api_CanIf_Transmit("1"); // 0x100 should preempt 0x7E8 to index 0!
    assert(sim.txBuffer.length === 2, "S2 TxBuffer holds 2 queued PDUs");
    assert(sim.txBuffer[0].rawCanId === 0x100, "S2 TxBuffer sorted 0x100 ahead of 0x7E8");
    api_CanIf_TxConfirmation("2");
    assert(sim.txBuffer.length === 1 && sim.hth1InFlight && sim.hth1InFlight.rawCanId === 0x100, "S2 TxConfirm drains 0x100 first");
    assert(sim.txConfirmationState === "CANIF_TX_RX_NOTIFICATION", "TxConfirmationState updated");

    // 4. CANIF_TX_OFFLINE_ACTIVE virtual callback
    loadScenario("S8");
    api_CanIf_SetPduMode("CANIF_TX_OFFLINE_ACTIVE");
    const prevTxOk = sim.counters.txOk;
    const prevPassive = sim.counters.txPassiveCbk;
    const rPassive = api_CanIf_Transmit("1");
    assert(rPassive === "E_OK", "TX_OFFLINE_ACTIVE returns E_OK");
    assert(sim.counters.txPassiveCbk === prevPassive + 1 && sim.counters.txOk === prevTxOk, "TX_OFFLINE_ACTIVE emits virtual TxConfirm without Can_Write");

    // 5. Partial Networking Filter & Unlock
    loadScenario("S9");
    sim.pnFilterActive = true;
    assert(api_CanIf_Transmit("1") === "E_NOT_OK", "PN Filter blocks App TxPdu_1");
    assert(api_CanIf_Transmit("0") === "E_OK", "PN Filter permits CanNm TxPdu_0");
    api_CanIf_ConfirmPnAvailability();
    assert(api_CanIf_Transmit("1") === "E_OK", "ConfirmPnAvailability unlocks TxPdu_1");

    // 6. Rx SwFilter & DLC Check 0x32
    loadScenario("S4");
    api_CanIf_RxIndication("FRAME_E");
    assert(sim.lastRxSummary && !sim.lastRxSummary.swFilterPassed, "Rx SwFilter drops unknown 0x3FF");
    cfg.CanIfPrivateDlcCheck = true;
    api_CanIf_RxIndication("FRAME_F", { forceDlc: 4 });
    assert(sim.counters.rxErrDlc > 0 && sim.lastRxSummary && !sim.lastRxSummary.dlcCheckPassed, "DLC Check catches short 4B frame (0x32)");

    // 7. Illegal STARTED->SLEEP & Bus-Off TxBuffer wipe
    loadScenario("S10");
    assert(api_CanIf_SetControllerMode("CAN_CS_SLEEP") === "E_NOT_OK", "STARTED -> SLEEP directly is rejected");
    api_CanIf_Transmit("2");
    api_CanIf_Transmit("1");
    assert(sim.txBuffer.length === 1, "TxBuffer populated before Bus-Off");
    api_CanIf_ControllerBusOff();
    assert(sim.ctrlMode === "CAN_CS_STOPPED" && sim.pduMode === "CANIF_TX_OFFLINE" && sim.txBuffer.length === 0, "Bus-Off forces STOPPED, TX_OFFLINE & wipes TxBuffer");

    // 8. Wakeup Validation Glitch Guard
    loadScenario("S11");
    api_CanIf_CheckWakeup();
    assert(api_CanIf_CheckValidation() === "E_NOT_OK", "CheckValidation blocks unvalidated glitch");
    api_CanIf_SetControllerMode("CAN_CS_STOPPED");
    api_CanIf_SetControllerMode("CAN_CS_STARTED");
    api_CanIf_SetPduMode("CANIF_ONLINE");
    api_CanIf_RxIndication("FRAME_C", { forceDlc: 8 });
    assert(api_CanIf_CheckValidation() === "E_OK" && sim.wakeupValidated, "CheckValidation succeeds after valid Rx");

    // 9. Tooltip & Export Generators
    const rowEl = document.querySelector('.cfg-row[data-cfg-key="CanIfPublicTxBuffering"]');
    showCfgTooltip(rowEl, "CanIfPublicTxBuffering");
    const popup = document.getElementById("cfgTooltipPopup");
    assert(popup.classList.contains("show") && popup.textContent.includes("SWS_CanIf_00381"), "Tooltip popup displays SWS_CanIf_00381");
    hideCfgTooltip();

    openExportModal();
    assert(getExportContentByTab(0).content.includes("/AUTOSAR/EcucDefs/CanIf"), "ARXML export valid");
    assert(getExportContentByTab(1).content.includes("CANIF_PUBLIC_TX_BUFFERING"), "CanIf_Cfg.h export valid");
    assert(getExportContentByTab(2).content.includes("CanIf_TxPduConfig"), "CanIf_Lcfg.c export valid");
    const parsedJson = JSON.parse(getExportContentByTab(3).content);
    assert(parsedJson.autosarRelease === "R23-11", "JSON export parses cleanly");
    closeExportModal();

    // 10. SVG text length checks in live DOM (canifArchSvg + all 24 handbook sub-tabs)
    const auditSvgs = (scopeEl, labelPrefix) => {
      const svgs = scopeEl.querySelectorAll("svg");
      svgs.forEach((svg, sIdx) => {
        const vbAttr = svg.getAttribute("viewBox");
        if (!vbAttr) return;
        const vbW = parseFloat(vbAttr.split(/\s+/)[2]);
        const rects = Array.from(svg.querySelectorAll("rect")).map(r => ({
          x: parseFloat(r.getAttribute("x") || 0),
          y: parseFloat(r.getAttribute("y") || 0),
          w: parseFloat(r.getAttribute("width") || 0),
          h: parseFloat(r.getAttribute("height") || 0)
        }));
        svg.querySelectorAll("text").forEach(txt => {
          const len = txt.getComputedTextLength ? txt.getComputedTextLength() : 0;
          if (len > vbW - 10) {
            report.svgOverflows.push(labelPrefix + " svg#" + sIdx + " text too wide (" + len.toFixed(1) + " > " + vbW + "): " + txt.textContent);
          }
          const tx = parseFloat(txt.getAttribute("x") || 0);
          const ty = parseFloat(txt.getAttribute("y") || 0);
          const enclosing = rects
            .filter(r => tx >= r.x && tx <= r.x + r.w && ty >= r.y && ty <= r.y + r.h)
            .sort((a, b) => (a.w * a.h) - (b.w * b.h))[0];
          if (enclosing && len > enclosing.w - 6) {
            report.svgOverflows.push(labelPrefix + " svg#" + sIdx + " box overflow (" + len.toFixed(1) + " > rectW " + enclosing.w + "): " + txt.textContent);
          }
        });
      });
    };
    loadScenario("S1");
    auditSvgs(document.getElementById("viewSim"), "Sim");

    switchMainView("hb");
    for (let t = 0; t < 6; t++) {
      switchHbTab1(t);
      for (let st = 0; st < 4; st++) {
        switchHbSubTab(st);
        auditSvgs(document.getElementById("hbContentArea"), "HB_T" + t + "_S" + st);
      }
    }
    switchHbTab1(6);
    setAbbrCategory("TX");
    const abbrInp = document.getElementById("abbrSearchInput");
    abbrInp.value = "TxBuffer";
    filterAbbreviationTable();
    assert(document.querySelectorAll("#hbContentArea mark").length >= 1, "Abbreviation search highlights <mark>");

    toggleTheme();
    assert(document.documentElement.getAttribute("data-theme") === "light", "Light mode toggles");
    toggleTheme();

  } catch (ex) {
    report.errors.push("EXCEPTION: " + ex.message);
  }
  report.errors = window.__testErrors.concat(report.errors);
  const el = document.createElement("pre");
  el.id = "__VERIFY_REPORT__";
  el.textContent = JSON.stringify(report);
  document.body.appendChild(el);
});
</script>
"""

    injected_html = html_text.replace("</body>", test_harness + "\n</body>")
    os.makedirs(ARTIFACT_SCRATCH, exist_ok=True)
    scratch_file = os.path.join(ARTIFACT_SCRATCH, "test_canif_verify.html")
    with open(scratch_file, "w", encoding="utf-8") as f:
        f.write(injected_html)

    file_url = "file:///" + scratch_file.replace("\\", "/")
    cmd = [
        browser,
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--virtual-time-budget=3000",
        "--dump-dom",
        file_url,
    ]
    res = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=45)
    assert res.returncode == 0, f"Browser exited with code {res.returncode}: {res.stderr}"

    m = re.search(r'<pre id="__VERIFY_REPORT__">(.*?)</pre>', res.stdout, flags=re.S)
    assert m, "Could not locate __VERIFY_REPORT__ in headless browser DOM dump!"
    import html as html_mod
    report = json.loads(html_mod.unescape(m.group(1)))

    print(f"  Browser checks passed: {len(report['checks'])}")
    assert not report["errors"], f"Runtime assertion errors in browser: {report['errors']}"
    assert not report["svgOverflows"], f"SVG text width overflows detected: {report['svgOverflows']}"
    print("  PASS: Zero JS errors, all runtime checks & live SVG text measurements passed!")


def main():
    assert os.path.exists(HTML_PATH), f"Target HTML missing: {HTML_PATH}"
    with open(HTML_PATH, "r", encoding="utf-8") as f:
        html_text = f.read()

    stage1_offline_check(html_text)
    parser, script_part = stage2_dom_and_handlers(html_text)
    stage3_ecuc_parity(parser, script_part)
    stage4_handbook_svg_xml()
    stage5_headless_browser_test(html_text)
    print("\nOVERALL RESULT: PASS")


if __name__ == "__main__":
    main()
