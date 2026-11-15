# -*- coding: utf-8 -*-
"""5-Stage verification suite for Simulation/03_Services/AUTOSAR_DoIP.html."""
import json
import os
import re
import subprocess
import sys
import xml.etree.ElementTree as ET

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
HTML_PATH = os.path.join(REPO_ROOT, "Simulation", "03_Services", "AUTOSAR_DoIP.html")
SCRATCH_DIR = r"C:\Users\Acer\.gemini\antigravity\brain\05a48237-16f3-4183-85aa-68a0799b8d8c\scratch"


def find_browser():
    candidates = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    return None


def stage1_offline_and_structure(html):
    print("[Stage 1] Checking offline purity & HTML structure...")
    if len(html) < 50000:
        raise AssertionError(f"HTML unexpectedly small: {len(html)} bytes")
    external_refs = re.findall(r'(?:src|href)\s*=\s*["\']https?://', html, flags=re.IGNORECASE)
    # Allow xmlns="http://www.w3.org/2000/svg" / schema in ARXML generator string (not src/href)
    if external_refs:
        raise AssertionError(f"External src/href found: {external_refs}")
    if html.count("<script>") != 1 or html.count("</script>") != 1:
        raise AssertionError(f"Expected single inline <script> block, got open={html.count('<script>')}, close={html.count('</script>')}")
    print("  PASS: 100% offline single-file HTML, clean inline <script> block.")


def stage2_dom_and_handlers(html):
    print("[Stage 2] Checking DOM IDs & inline JS handler functions...")
    script_m = re.search(r"<script>(.*)</script>", html, flags=re.DOTALL)
    js_body = script_m.group(1)
    fn_names = set(re.findall(r"function\s+([A-Za-z0-9_]+)\s*\(", js_body))
    inline_attrs = re.findall(r'on(?:click|change|input)="([^"]+)"', html)
    inline_calls = set()
    for attr in inline_attrs:
        for fn in re.findall(r"([A-Za-z0-9_]+)\s*\(", attr):
            if fn not in {"if"}:
                inline_calls.add(fn)
    missing = [fn for fn in sorted(inline_calls) if fn not in fn_names]
    if missing:
        raise AssertionError(f"Missing handler functions in JS: {missing}")

    html_ids = set(re.findall(r'id="([A-Za-z0-9_]+)"', html))
    required_static = {
        "scenarioSelect", "btnPrevStep", "stepIndicator", "btnNextStep", "btnAutoPlay", "clockVal",
        "hdrBadgeActLine", "hdrBadgeIp", "hdrBadgeTcp", "hdrBadgeRouting", "hdrBadgeDet",
        "doipHeaderStrip", "doipTcpConnTbody", "regABits", "regBBits", "doipArchSvg", "inspBody",
        "hbNav2", "hbAbbrFilterBox", "hbContentArea", "abbrSearchInput", "exportModal", "cfgTooltipPopup"
    }
    miss_ids = sorted(required_static - html_ids)
    if miss_ids:
        raise AssertionError(f"Missing critical DOM IDs: {miss_ids}")
    print(f"  PASS: All {len(inline_calls)} handler calls resolved, all {len(required_static)} static DOM IDs present.")


def stage3_config_4way_parity(html):
    print("[Stage 3] Checking 36 ECUC Parameter 4-Way Parity...")
    m_def = re.search(r"const defaultConfig = \{(.*?)\};", html, flags=re.DOTALL)
    def_keys = re.findall(r"^\s*([A-Za-z0-9_]+)\s*:", m_def.group(1), flags=re.MULTILINE)

    m_tt = re.search(r"const configTooltipData = \{(.*?)\n\};", html, flags=re.DOTALL)
    tt_keys = re.findall(r"^\s{2}([A-Za-z0-9_]+)\s*:\s*\{", m_tt.group(1), flags=re.MULTILINE)

    dom_cfg_ids = set(re.findall(r'id="cfg_([A-Za-z0-9_]+)"', html))
    dom_row_keys = set(re.findall(r'data-cfg-key="([A-Za-z0-9_]+)"', html))

    if len(def_keys) != 36:
        raise AssertionError(f"Expected 36 defaultConfig keys, found {len(def_keys)}: {def_keys}")
    s_def, s_tt = set(def_keys), set(tt_keys)
    if not (s_def == s_tt == dom_cfg_ids == dom_row_keys):
        raise AssertionError(
            f"Config 4-way mismatch!\n"
            f"  def-tt: {s_def ^ s_tt}\n"
            f"  def-domId: {s_def ^ dom_cfg_ids}\n"
            f"  def-domRow: {s_def ^ dom_row_keys}"
        )
    print(f"  PASS: Exact 36-parameter 4-way parity verified (defaultConfig == configTooltipData == cfg_* == data-cfg-key).")


def stage4_svg_xml(html):
    print("[Stage 4] Checking main & handbook SVG XML well-formedness...")
    m_svg = re.search(r'(<svg id="doipArchSvg".*?</svg>)', html, flags=re.DOTALL)
    if not m_svg:
        raise AssertionError("Main architecture SVG not found!")
    root = ET.fromstring(m_svg.group(1))
    vb = root.attrib.get("viewBox", "")
    if not vb:
        raise AssertionError("Main SVG missing viewBox!")

    m_hb = re.search(r"const HANDBOOK_TABS = (\[.*?\]);\n", html, flags=re.DOTALL)
    if not m_hb:
        raise AssertionError("HANDBOOK_TABS JSON not found in HTML!")
    hb_tabs = json.loads(m_hb.group(1))
    hb_svg_count = 0
    for ti, tab in enumerate(hb_tabs):
        for si, sub in enumerate(tab.get("subs", [])):
            for svg_str in re.findall(r"<svg\b[^>]*>.*?</svg>", sub.get("html", ""), flags=re.DOTALL):
                hb_root = ET.fromstring(svg_str)
                if not hb_root.attrib.get("viewBox"):
                    raise AssertionError(f"Handbook SVG at [{ti}.{si}] missing viewBox!")
                hb_svg_count += 1
    if hb_svg_count < 5:
        raise AssertionError(f"Expected >= 5 Handbook SVGs, found {hb_svg_count}")
    print(f"  PASS: Main SVG (viewBox='{vb}') + {hb_svg_count} Handbook SVGs parsed cleanly as valid XML.")


def stage5_headless_browser(html):
    print("[Stage 5] Running Headless Chromium V8 + Live SVG Bounds Audit...")
    browser = find_browser()
    if not browser:
        raise AssertionError("Neither Chrome nor Edge found for headless verification!")

    harness = r"""
window.__TEST_REPORT__ = { errors: [], checks: {}, svgOverflows: [] };
window.addEventListener("error", function(e) {
  window.__TEST_REPORT__.errors.push(String(e.message || e.error || e));
});
window.addEventListener("DOMContentLoaded", function() {
  setTimeout(function() {
    try {
      const rpt = window.__TEST_REPORT__;
      const ch = rpt.checks;

      // 1. Check all 12 Scenarios + steps + 36 What-Ifs
      ch.scenarioCount = SCENARIOS.length;
      let totalSteps = 0;
      let totalWhatIfs = 0;
      SCENARIOS.forEach(function(sc) {
        loadScenario(sc.id);
        for (let i = 0; i < sc.steps.length; i++) {
          nextScenarioStep();
          totalSteps++;
        }
        (sc.whatIfs || []).forEach(function(wi, wIdx) {
          runWhatIf(wIdx);
          totalWhatIfs++;
        });
      });
      ch.totalStepsExecuted = totalSteps;
      ch.totalWhatIfsExecuted = totalWhatIfs;

      // 2. Check specific DoIP domain assertions
      // 2a. Bad XOR Header NACK 0x0000
      loadScenario("S3");
      api_DoIP_DiagRequest0x8001("0x1001", { protoVer: "0x02", invVer: "0xFE" });
      ch.badXorNack = (sim.lastFrame.xorOk === false && sim.lastHeaderNack === true);

      // 2b. SWC Auth Async DOIP_E_PENDING + TLS 3496 Code 0x07
      loadScenario("S5");
      nextScenarioStep(); // port 13400 rejected 0x07
      const tlsRejected = (sim.lastFrame.payloadType === "0x0006" && sim.lastFrame.payloadSummary.includes("0x07"));
      nextScenarioStep(); // TLS 3496 -> DOIP_E_PENDING
      const asyncPend = (sim.tcpState === "AUTH_PENDING");
      nextScenarioStep();
      nextScenarioStep();
      ch.tlsAndSwcAsyncOk = (tlsRejected && asyncPend && sim.tcpState === "ROUTING_ACTIVE");

      // 2c. Alive Check pool eviction
      loadScenario("S6");
      nextScenarioStep();
      nextScenarioStep();
      const aliveWait = (sim.alivePending === true);
      nextScenarioStep();
      ch.aliveCheckOk = (aliveWait && sim.alivePending === false);

      // 2d. Edge Gateway CanTp TA 0x2001 vs Local Dcm 0x1001
      loadScenario("S9");
      nextScenarioStep();
      nextScenarioStep();
      ch.canTpGwOk = (sim.gwCanTpActive === true && ((sim.regA & 1) === 1));

      loadScenario("S7");
      nextScenarioStep();
      nextScenarioStep();
      ch.localDcmOk = (sim.gwCanTpActive === false && sim.lastDiagAck === true);

      // 2d-2. 4KB TP Streaming Lock/Unlock & DET 173
      loadScenario("S10");
      nextScenarioStep();
      const lockedAfter1 = (sim.tpBufferLocked === true);
      nextScenarioStep();
      nextScenarioStep();
      ch.tpStreaming4kbOk = (lockedAfter1 && sim.tpBufferLocked === false);

      loadScenario("S12");
      nextScenarioStep();
      nextScenarioStep();
      ch.det173Ok = (sim.detEvents >= 2 && ((sim.regB & 1) === 1));

      // 2e. All 8 Quick Action buttons
      loadScenario("S1");
      qaToggleActLine(); qaToggleIpAssign(); qaSendUdpRequest();
      qaTcpRoutingAct(); qaAliveCheckRsp(); qaInjectDiag0x8001();
      qaStepMainFunction(); qaDetOrClear();
      ch.quickActionsOk = (sim.simTimeMs > 0);

      // 2f. All 9 Modules Inspector (ZERO 'undefined')
      const modKeys = Object.keys(MODULES_INFO);
      let modUndef = false;
      modKeys.forEach(function(mId) {
        selectModule(mId);
        switchInspTab(1);
        const txt = document.getElementById("inspBody").textContent || "";
        if (txt.includes("undefined")) modUndef = true;
      });
      ch.modulesTested = modKeys.length;
      ch.modulesClean = !modUndef;

      // 2g. All 36 ECUC Tooltips
      const ttKeys = Object.keys(configTooltipData);
      let ttOk = 0;
      ttKeys.forEach(function(k) {
        const row = document.querySelector('.cfg-row[data-cfg-key="' + k + '"]');
        if (row) {
          showCfgTooltipNow(k, row);
          const tt = document.getElementById("cfgTooltipPopup");
          if (tt && tt.classList.contains("visible") && tt.textContent.trim().length > 20) ttOk++;
        }
      });
      hideCfgTooltip();
      ch.tooltipsVerified = ttOk;

      // 2h. Exports (ARXML / Cfg.h / Lcfg.c / JSON)
      openExportModal();
      let expOk = true;
      ["arxml", "h", "c", "json"].forEach(function(t) {
        switchExportTab(t);
        const val = document.getElementById("exportCodePre").textContent || "";
        if (val.trim().length < 50) expOk = false;
      });
      closeExportModal();
      ch.exportsOk = expOk;

      // 2i. Measure Main SVG text lengths inside parent boxes
      switchMainView("sim");
      function auditSvg(svgEl, label) {
        if (!svgEl) return;
        const groups = svgEl.querySelectorAll("g");
        groups.forEach(function(g) {
          const rect = g.querySelector("rect.box");
          if (!rect) return;
          const rw = parseFloat(rect.getAttribute("width") || "0");
          const rx = parseFloat(rect.getAttribute("x") || "0");
          const rects = Array.from(g.querySelectorAll("rect"));
          const texts = g.querySelectorAll("text");
          texts.forEach(function(t) {
            const tx = parseFloat(t.getAttribute("x") || "0");
            const ty = parseFloat(t.getAttribute("y") || "0");
            // Pick tightest enclosing rect around (tx, ty)
            let bestRect = rect;
            let bestArea = Infinity;
            rects.forEach(function(r) {
              const rx0 = parseFloat(r.getAttribute("x") || "0");
              const ry0 = parseFloat(r.getAttribute("y") || "0");
              const rw0 = parseFloat(r.getAttribute("width") || "0");
              const rh0 = parseFloat(r.getAttribute("height") || "0");
              if (tx >= rx0 && tx <= rx0 + rw0 && ty >= ry0 && ty <= ry0 + rh0) {
                const area = rw0 * rh0;
                if (area < bestArea) { bestArea = area; bestRect = r; }
              }
            });
            const brx = parseFloat(bestRect.getAttribute("x") || "0");
            const brw = parseFloat(bestRect.getAttribute("width") || "0");
            const tl = t.getComputedTextLength ? t.getComputedTextLength() : 0;
            if (tl > 0 && (tx + tl > brx + brw - 2)) {
              rpt.svgOverflows.push(label + " [" + (g.id || "g") + "]: '" + t.textContent + "' ends at " + (tx + tl).toFixed(1) + " > " + (brx + brw));
            }
          });
        });
      }
      auditSvg(document.getElementById("doipArchSvg"), "MainArchSVG");

      // 2j. Handbook 6x4 + Abbreviation Live Search (<mark> highlight)
      switchMainView("handbook");
      let hbPages = 0;
      for (let t1 = 0; t1 < 6; t1++) {
        switchHbTab1(t1);
        for (let s = 0; s < 4; s++) {
          switchHbSubTab(s);
          const area = document.getElementById("hbContentArea");
          if (area && area.innerHTML.trim().length > 50) hbPages++;
          const svgs = area ? area.querySelectorAll("svg") : [];
          svgs.forEach(function(sEl, idx) {
            const vb = (sEl.getAttribute("viewBox") || "0 0 880 260").split(/\s+/).map(Number);
            const vbW = vb[2] || 880;
            const vbH = vb[3] || 260;
            const hbRects = Array.from(sEl.querySelectorAll("rect")).filter(function(r) {
              const rw0 = parseFloat(r.getAttribute("width") || "0");
              const rh0 = parseFloat(r.getAttribute("height") || "0");
              return rw0 > 0 && rh0 > 0 && !(rw0 >= vbW - 10 && rh0 >= vbH - 10);
            });
            sEl.querySelectorAll("text").forEach(function(t) {
              const anchor = t.getAttribute("text-anchor") || "start";
              const tx = parseFloat(t.getAttribute("x") || "0");
              const ty = parseFloat(t.getAttribute("y") || "0");
              const tl = t.getComputedTextLength ? t.getComputedTextLength() : 0;
              if (!(tl > 0)) return;
              const startX = anchor === "middle" ? (tx - tl / 2) : (anchor === "end" ? (tx - tl) : tx);
              const endX = anchor === "middle" ? (tx + tl / 2) : (anchor === "end" ? tx : (tx + tl));
              if (startX < 4 || endX > vbW - 4) {
                rpt.svgOverflows.push("HB[" + t1 + "." + s + "]: '" + t.textContent + "' (" + startX.toFixed(1) + ".." + endX.toFixed(1) + ") outside viewBox 0.." + vbW);
              }
              let bestRect = null;
              let bestArea = Infinity;
              hbRects.forEach(function(r) {
                const rx0 = parseFloat(r.getAttribute("x") || "0");
                const ry0 = parseFloat(r.getAttribute("y") || "0");
                const rw0 = parseFloat(r.getAttribute("width") || "0");
                const rh0 = parseFloat(r.getAttribute("height") || "0");
                if (tx >= rx0 && tx <= rx0 + rw0 && ty >= ry0 && ty <= ry0 + rh0) {
                  const area = rw0 * rh0;
                  if (area < bestArea) { bestArea = area; bestRect = r; }
                }
              });
              if (bestRect) {
                const brx = parseFloat(bestRect.getAttribute("x") || "0");
                const brw = parseFloat(bestRect.getAttribute("width") || "0");
                if (startX < brx + 2 || endX > brx + brw - 2) {
                  rpt.svgOverflows.push("HB[" + t1 + "." + s + "]: '" + t.textContent + "' (" + startX.toFixed(1) + ".." + endX.toFixed(1) + ") overflows rect (" + brx + ".." + (brx + brw) + ")");
                }
              }
            });
          });
        }
      }
      ch.handbookTopicsVerified = hbPages;

      switchHbTab1(6);
      setAbbrCategory("TP_GW");
      const inp = document.getElementById("abbrSearchInput");
      inp.value = "0x8001";
      filterAbbreviationTable();
      const areaHtml = document.getElementById("hbContentArea").innerHTML;
      ch.abbrTotal = ABBREVIATIONS.length;
      ch.abbrSearchHighlighted = areaHtml.includes("<mark>0x8001</mark>");

      const outDiv = document.createElement("div");
      outDiv.id = "__VERIFY_JSON__";
      outDiv.textContent = JSON.stringify(rpt);
      document.body.appendChild(outDiv);
    } catch (err) {
      window.__TEST_REPORT__.errors.push(String(err && err.stack ? err.stack : err));
      const outDiv = document.createElement("div");
      outDiv.id = "__VERIFY_JSON__";
      outDiv.textContent = JSON.stringify(window.__TEST_REPORT__);
      document.body.appendChild(outDiv);
    }
  }, 150);
});
"""

    os.makedirs(SCRATCH_DIR, exist_ok=True)
    scratch_html = os.path.join(SCRATCH_DIR, "doip_verify.html")
    # Append harness inside inline <script>
    injected = html.replace("</script>", "\n" + harness + "\n</script>")
    with open(scratch_html, "w", encoding="utf-8") as f:
        f.write(injected)

    cmd = [browser, "--headless=new", "--disable-gpu", "--dump-dom", "--virtual-time-budget=6000", f"file:///{scratch_html.replace(os.sep, '/')}"]
    proc = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", timeout=45)
    m_res = re.search(r'<div id="__VERIFY_JSON__">(.*?)</div>', proc.stdout, flags=re.DOTALL)
    if not m_res:
        raise AssertionError(f"Headless verification failed to emit __VERIFY_JSON__! stderr={proc.stderr[:500]}")

    raw_json = m_res.group(1).replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", '"')
    rpt = json.loads(raw_json)
    print("  Headless Report:", json.dumps(rpt, ensure_ascii=False, indent=2))

    if rpt["errors"]:
        raise AssertionError(f"Runtime JS Errors: {rpt['errors']}")
    if rpt["svgOverflows"]:
        raise AssertionError(f"SVG Text Overflow Detected: {rpt['svgOverflows']}")

    ch = rpt["checks"]
    assert ch["scenarioCount"] == 12, f"Expected 12 scenarios, got {ch['scenarioCount']}"
    assert ch["totalWhatIfsExecuted"] == 36, f"Expected 36 What-Ifs, got {ch['totalWhatIfsExecuted']}"
    assert ch["badXorNack"] is True
    assert ch["tlsAndSwcAsyncOk"] is True
    assert ch["aliveCheckOk"] is True
    assert ch["canTpGwOk"] is True
    assert ch["localDcmOk"] is True
    assert ch["tpStreaming4kbOk"] is True
    assert ch["det173Ok"] is True
    assert ch["quickActionsOk"] is True
    assert ch["modulesTested"] == 9 and ch["modulesClean"] is True
    assert ch["tooltipsVerified"] == 36
    assert ch["exportsOk"] is True
    assert ch["handbookTopicsVerified"] == 24
    assert ch["abbrTotal"] >= 60 and ch["abbrSearchHighlighted"] is True
    print("  PASS: All Headless V8 & SVG layout assertions passed!")


def main():
    if not os.path.exists(HTML_PATH):
        raise FileNotFoundError(f"Missing target HTML: {HTML_PATH}")
    with open(HTML_PATH, "r", encoding="utf-8") as f:
        html = f.read()

    stage1_offline_and_structure(html)
    stage2_dom_and_handlers(html)
    stage3_config_4way_parity(html)
    stage4_svg_xml(html)
    stage5_headless_browser(html)
    print("\n=== OVERALL RESULT: PASS ===")


if __name__ == "__main__":
    main()
