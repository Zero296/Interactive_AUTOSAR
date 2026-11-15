"""5-Stage Comprehensive Verification Suite for AUTOSAR Classic SoAd Simulator."""
import html
import html.parser
import json
import os
import re
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
HTML_PATH = os.path.join(REPO_ROOT, "Simulation", "03_Services", "AUTOSAR_SoAd.html")

ALLOWED_URLS = {
    "http://www.w3.org/2000/svg",
    "http://autosar.org/schema/r4.0",
}


class StaticHtmlAuditor(html.parser.HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = set()
        self.inline_calls = []

    def handle_starttag(self, tag, attrs):
        for k, v in attrs:
            if k == "id" and v:
                self.ids.add(v)
            elif k in ("onclick", "onchange", "oninput") and v:
                for m in re.finditer(r"\b([A-Za-z_][A-Za-z0-9_]*)\s*\(", v):
                    fn = m.group(1)
                    if fn not in ("if", "else"):
                        self.inline_calls.append((k, fn))


def find_browser():
    candidates = [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"),
    ]
    for p in candidates:
        if os.path.isfile(p):
            return p
    return None


def stage1_file_and_offline_check(html_text):
    print("\n[Stage 1] File Integrity & 100% Offline Verification...")
    if not os.path.isfile(HTML_PATH):
        return [f"Missing output HTML: {HTML_PATH}"]
    size_kb = os.path.getsize(HTML_PATH) / 1024.0
    errs = []
    if size_kb < 90:
        errs.append(f"HTML size suspiciously small: {size_kb:.1f} KB")
    if "<!DOCTYPE html>" not in html_text or "</html>" not in html_text:
        errs.append("Missing DOCTYPE or closing </html>")

    urls = set(re.findall(r"https?://[^\s\"'<>`\\)]+", html_text))
    disallowed = [u for u in urls if u not in ALLOWED_URLS]
    if disallowed:
        errs.append(f"Disallowed external URLs found: {disallowed}")

    print(f"  OK Size = {size_kb:.1f} KB | External non-NS URLs = {len(disallowed)}")
    return errs


def stage2_static_dom_and_handlers():
    print("\n[Stage 2] Static DOM ID & Inline Handler Wiring Verification...")
    with open(os.path.join(SCRIPT_DIR, "part2_body_structure.html"), "r", encoding="utf-8") as f:
        body_html = f.read()

    parser = StaticHtmlAuditor()
    parser.feed(body_html)

    js_texts = []
    for jname in ["part3_constants_and_cfg.js", "part4_engine.js", "part4_scenarios.js", "part5_ui_and_exports.js", "part6_handbook.js"]:
        with open(os.path.join(SCRIPT_DIR, jname), "r", encoding="utf-8") as f:
            js_texts.append(f.read())
    all_js = "\n".join(js_texts)

    declared_fns = set(re.findall(r"^\s*function\s+([A-Za-z0-9_]+)\s*\(", all_js, re.MULTILINE))

    errs = []
    for attr, fn in parser.inline_calls:
        if fn not in declared_fns:
            errs.append(f"Inline {attr} calls undeclared function: {fn}()")

    # Literal document.getElementById("...") must exist statically in part2
    literal_ids = set(re.findall(r'document\.getElementById\(\s*"([A-Za-z0-9_]+)"\s*\)', all_js))
    missing_ids = sorted(id_name for id_name in literal_ids if id_name not in parser.ids)
    if missing_ids:
        errs.append(f"JS getElementById literal IDs missing from static HTML: {missing_ids}")

    # Check template indexed IDs
    for i in range(6):
        if f"cfgTab{i}" not in parser.ids or f"cfgPane{i}" not in parser.ids:
            errs.append(f"Missing cfgTab{i} or cfgPane{i}")
    for i in range(4):
        if f"inspTab{i}" not in parser.ids or f"inspPane{i}" not in parser.ids:
            errs.append(f"Missing inspTab{i} or inspPane{i}")

    print(f"  OK Static IDs = {len(parser.ids)} | Declared Fns = {len(declared_fns)} | Missing Literal IDs = {len(missing_ids)}")
    return errs


def stage3_ecuc_4way_parity():
    print("\n[Stage 3] 36-ECUC 4-Way Parity Verification...")
    with open(os.path.join(SCRIPT_DIR, "part2_body_structure.html"), "r", encoding="utf-8") as f:
        p2 = f.read()
    with open(os.path.join(SCRIPT_DIR, "part3_constants_and_cfg.js"), "r", encoding="utf-8") as f:
        p3 = f.read()
    with open(os.path.join(SCRIPT_DIR, "part4_engine.js"), "r", encoding="utf-8") as f:
        p4 = f.read()

    set_data_keys = set(re.findall(r'data-cfg-key="([A-Za-z0-9_]+)"', p2))
    set_inp_ids = set(re.findall(r'id="cfg_([A-Za-z0-9_]+)"', p2))

    m_def = re.search(r"const defaultConfig\s*=\s*\{(.*?)\n\};", p4, re.DOTALL)
    set_def = set(re.findall(r"^\s*([A-Za-z0-9_]+)\s*:", m_def.group(1), re.MULTILINE)) if m_def else set()

    m_tt = re.search(r"const configTooltipData\s*=\s*\{(.*?)\n\};", p3, re.DOTALL)
    set_tt = set(re.findall(r"^\s{2}([A-Za-z0-9_]+)\s*:\s*\{", m_tt.group(1), re.MULTILINE)) if m_tt else set()

    errs = []
    if len(set_data_keys) != 36:
        errs.append(f"Expected 36 data-cfg-key entries, found {len(set_data_keys)}")
    if set_data_keys != set_inp_ids:
        errs.append(f"Parity mismatch data-cfg-key vs cfg_*: {set_data_keys ^ set_inp_ids}")
    if set_data_keys != set_def:
        errs.append(f"Parity mismatch HTML vs defaultConfig: {set_data_keys ^ set_def}")
    if set_data_keys != set_tt:
        errs.append(f"Parity mismatch HTML vs configTooltipData: {set_data_keys ^ set_tt}")

    print(f"  OK Parity counts: HTML_key={len(set_data_keys)}, HTML_inp={len(set_inp_ids)}, defaultConfig={len(set_def)}, tooltips={len(set_tt)}")
    return errs


def stage4_svg_xml_check():
    print("\n[Stage 4] Inline SVG & Handbook SVG Well-Formedness Check...")
    sys.path.insert(0, SCRIPT_DIR)
    import hb_diagrams_soad as hbd

    with open(os.path.join(SCRIPT_DIR, "part2_body_structure.html"), "r", encoding="utf-8") as f:
        p2 = f.read()

    m_svg = re.search(r"(<svg id=\"soadArchSvg\".*?</svg>)", p2, re.DOTALL)
    errs = []
    if not m_svg:
        return ["Could not locate #soadArchSvg in part2"]

    svgs = [("soadArchSvg", m_svg.group(1))]
    for fn_name in [
        "svg_eth_stack", "svg_socon_fsm", "svg_pdu_header", "svg_best_match",
        "svg_if_tp_tx", "svg_npdu_bundling", "svg_tcp_stream", "svg_sd_control",
        "svg_tcpip_recovery", "svg_ecuc_tree"
    ]:
        svgs.append((fn_name, getattr(hbd, fn_name)()))

    for name, xml_str in svgs:
        try:
            root = ET.fromstring(xml_str)
            vb = root.attrib.get("viewBox", "")
            parts = vb.split()
            if len(parts) != 4:
                errs.append(f"{name}: Invalid viewBox '{vb}'")
        except ET.ParseError as ex:
            errs.append(f"{name}: XML parse error: {ex}")

    print(f"  OK Validated {len(svgs)} SVG diagrams for well-formed XML & viewBox")
    return errs


def stage5_headless_runtime_and_svg_geometry(html_text):
    print("\n[Stage 5] Headless Browser Runtime, 12-Scenario Behavior & SVG Geometry Verification...")
    browser = find_browser()
    if not browser:
        return ["Chrome/Edge binary not found for Stage 5 headless browser verification"]

    audit_script = """
<script>
window.__auditErrors = [];
window.addEventListener("error", function(e) {
  window.__auditErrors.push("JS_ERR: " + e.message);
});

window.addEventListener("DOMContentLoaded", function() {
  setTimeout(function() {
    var report = { ok: true, errors: [], checks: {}, svgOverflows: [] };
    try {
      // 1. All 12 Scenarios x 4 Steps + 36 WhatIfs smoke + state verification
      var scenCount = SCENARIOS.length;
      report.checks.scenarioCount = scenCount;
      var whatIfTotal = 0;
      for (var i = 0; i < scenCount; i++) {
        selectScenarioById(SCENARIOS[i].id);
        for (var s = 0; s < SCENARIOS[i].steps.length; s++) {
          nextScenarioStep();
        }
        for (var w = 0; w < SCENARIOS[i].whatIfs.length; w++) {
          runWhatIf(w);
          whatIfTotal++;
        }
      }
      report.checks.whatIfCount = whatIfTotal;

      // 2. Specific Behavioral Assertions (S1..S12)
      selectScenarioById("S1");
      nextScenarioStep();
      if (sim.soCons[0].mode !== "OFFLINE") report.errors.push("S1 Step1 SoCon_0 expected OFFLINE, got " + sim.soCons[0].mode);
      nextScenarioStep();
      if (sim.soCons[0].mode !== "ONLINE") report.errors.push("S1 Step2 SoCon_0 expected ONLINE, got " + sim.soCons[0].mode);

      selectScenarioById("S2");
      nextScenarioStep();
      if (sim.soCons[3].mode !== "RECONNECT") report.errors.push("S2 Step1 TCP SoCon_3 expected RECONNECT, got " + sim.soCons[3].mode);
      nextScenarioStep();
      if (sim.soCons[3].mode !== "ONLINE" || !sim.soCons[3].tcpEstablished) report.errors.push("S2 Step2 TCP SoCon_3 expected ONLINE+TCP_ESTAB");

      selectScenarioById("S3");
      nextScenarioStep();
      if (!sim.lastBestMatchNote.includes("Score 4")) report.errors.push("S3 Step1 expected Score 4 Best-Match: " + sim.lastBestMatchNote);

      selectScenarioById("S5");
      nextScenarioStep();
      if (!sim.tpSession.active) report.errors.push("S5 Step1 expected active TP session");
      nextScenarioStep();
      nextScenarioStep();
      if (sim.tpSession.sentBytes !== 1200) report.errors.push("S5 Step3 expected sentBytes=1200, got " + sim.tpSession.sentBytes);
      nextScenarioStep();
      if (sim.tpSession.active) report.errors.push("S5 Step4 expected TP session closed after TxConfirmation");

      selectScenarioById("S6");
      nextScenarioStep();
      if (sim.nPdu.chunks.length !== 1) report.errors.push("S6 Step1 expected 1 nPdu chunk queued");
      nextScenarioStep();
      nextScenarioStep();
      if (sim.nPdu.chunks.length !== 0 || sim.nPdu.bundledFramesCount < 1) report.errors.push("S6 Step3 expected nPdu flushed by TRIGGER_ALWAYS");

      selectScenarioById("S7");
      nextScenarioStep();
      nextScenarioStep();
      if (sim.counters.rxPdus < 3) report.errors.push("S7 Step2 expected Multi-PDU rxPdus >= 3, got " + sim.counters.rxPdus);
      nextScenarioStep();
      if (sim.counters.idsmSecEvents < 1) report.errors.push("S7 Step3 expected IdsM secEvent >= 1");

      selectScenarioById("S8");
      nextScenarioStep();
      if (sim.rxStream.bufferedBytes <= 0) report.errors.push("S8 Step1 expected bufferedBytes > 0 in SoAdRxBuffer");
      nextScenarioStep();
      if (sim.rxStream.bufferedBytes !== 0) report.errors.push("S8 Step2 expected bufferedBytes reset to 0 after reassembly");

      selectScenarioById("S9");
      nextScenarioStep();
      var txBefore = sim.counters.txPdus;
      if (txBefore !== 0) report.errors.push("S9 Step1 expected txPdus=0 when RG_0 disabled");
      nextScenarioStep();
      nextScenarioStep();
      if (sim.counters.txPdus < 1) report.errors.push("S9 Step3 expected txPdus >= 1 after EnableRouting + IfRoutingGroupTransmit");

      selectScenarioById("S10");
      nextScenarioStep();
      nextScenarioStep();
      if (sim.soCons[3].mode !== "RECONNECT") report.errors.push("S10 Step2 expected TCP_RESET -> RECONNECT");

      selectScenarioById("S12");
      for (var k = 0; k < 4; k++) nextScenarioStep();
      if (sim.counters.detCount < 2) report.errors.push("S12 expected detCount >= 2");
      if (sim.counters.dropUdp !== 0) report.errors.push("S12 Step4 expected dropUdp reset to 0");

      // 3. Export generators
      var kinds = ["arxml", "cfgh", "lcfgc", "json"];
      for (var ki = 0; ki < kinds.length; ki++) {
        var exp = generateExportArtifact(kinds[ki]);
        if (!exp || exp.length < 40) report.errors.push("Export failed for " + kinds[ki]);
      }

      // 4. Audit View 1 SVG text-in-box geometry
      function auditRenderedSvgs(ctxLabel) {
        var svgs = document.querySelectorAll("svg");
        svgs.forEach(function(svg, idx) {
          var vb = svg.viewBox.baseVal;
          var vbW = vb && vb.width ? vb.width : 900;
          var rects = Array.from(svg.querySelectorAll("rect")).map(function(r) {
            return {
              x: parseFloat(r.getAttribute("x") || 0),
              y: parseFloat(r.getAttribute("y") || 0),
              w: parseFloat(r.getAttribute("width") || 0),
              h: parseFloat(r.getAttribute("height") || 0)
            };
          });
          svg.querySelectorAll("text").forEach(function(t) {
            var style = window.getComputedStyle(t);
            if (style.display === "none") return;
            var txtLen = t.getComputedTextLength();
            if (txtLen === 0) return;
            var tx = parseFloat(t.getAttribute("x") || 0);
            var ty = parseFloat(t.getAttribute("y") || 0);
            var anchor = t.getAttribute("text-anchor") || "start";
            var left = anchor === "middle" ? tx - txtLen / 2 : (anchor === "end" ? tx - txtLen : tx);
            var right = anchor === "middle" ? tx + txtLen / 2 : (anchor === "end" ? tx : tx + txtLen);
            if (left < -4 || right > vbW + 4) {
              report.svgOverflows.push(ctxLabel + " viewBox overflow: '" + t.textContent + "' (" + left.toFixed(1) + ".." + right.toFixed(1) + " vs 0.." + vbW + ")");
            }
            // Find smallest enclosing rect
            var enc = null;
            rects.forEach(function(r) {
              if (tx >= r.x && tx <= r.x + r.w && ty >= r.y && ty <= r.y + r.h + 4) {
                if (!enc || (r.w * r.h) < (enc.w * enc.h)) enc = r;
              }
            });
            if (enc && enc.w < 850 && txtLen > (enc.w - 6)) {
              report.svgOverflows.push(ctxLabel + " box overflow: '" + t.textContent + "' len=" + txtLen.toFixed(1) + " > boxW=" + enc.w);
            }
            if (!enc) {
              // Floating label (arrow text / title): ensure it does not cross any box border
              var bbTop = ty - 10, bbBot = ty + 2;
              rects.forEach(function(r) {
                if (r.w >= 850) return;
                var hOverlap = !(right <= r.x + 1 || left >= r.x + r.w - 1);
                var vOverlap = !(bbBot <= r.y + 1 || bbTop >= r.y + r.h - 1);
                if (hOverlap && vOverlap) {
                  report.svgOverflows.push(ctxLabel + " label overlaps rect: '" + t.textContent + "' hits rect(" + r.x + "," + r.y + "," + r.w + "," + r.h + ")");
                }
              });
            }
          });
          // Verify handbook marker color matches stroke color
          if (ctxLabel.indexOf("HB_") === 0) {
            var markerMap = {
              "url(#hbArr)": "var(--hb-accent)",
              "url(#hbArrGreen)": "var(--hb-green)",
              "url(#hbArrAmber)": "var(--hb-amber)",
              "url(#hbArrRed)": "var(--hb-red)",
              "url(#hbArrPurple)": "var(--hb-purple)",
              "url(#hbArrCyan)": "var(--hb-cyan)"
            };
            svg.querySelectorAll("line, path").forEach(function(el) {
              var mEnd = el.getAttribute("marker-end");
              var strokeCol = el.getAttribute("stroke");
              if (mEnd && markerMap[mEnd] && strokeCol !== markerMap[mEnd]) {
                report.svgOverflows.push(ctxLabel + " marker/stroke mismatch: stroke=" + strokeCol + " vs " + mEnd);
              }
            });
          }
        });
      }

      switchMainView("sim");
      auditRenderedSvgs("SimArchSvg");

      // 5. Walk ALL Handbook Tabs x Subtabs + Audit SVGs + Abbreviation Search
      switchMainView("hb");
      for (var t = 0; t < HANDBOOK_TABS.length; t++) {
        switchHbTab1(t);
        var subs = HANDBOOK_TABS[t].subtabs;
        for (var st = 0; st < subs.length; st++) {
          switchHbSubTab(st);
          if (!HANDBOOK_TABS[t].isAbbrTab) {
            auditRenderedSvgs("HB_t" + t + "_s" + st);
          }
        }
      }

      // Check Abbreviation Search filter + <mark class="hl">
      switchHbTab1(HANDBOOK_TABS.length - 1);
      onAbbrSearchInput("nPdu");
      var rows = document.querySelectorAll("#abbrTableHost tbody tr").length;
      var marks = document.querySelectorAll("#abbrTableHost mark.hl").length;
      report.checks.abbrFilterRows = rows;
      report.checks.abbrFilterMarks = marks;
      if (rows < 2 || marks < 2) report.errors.push("Abbreviation search failed for 'nPdu': rows=" + rows + ", marks=" + marks);

      if (window.__auditErrors.length > 0) {
        report.errors = report.errors.concat(window.__auditErrors);
      }
      if (report.svgOverflows.length > 0) {
        report.errors = report.errors.concat(report.svgOverflows);
      }
      report.ok = report.errors.length === 0;
    } catch (ex) {
      report.ok = false;
      report.errors.push("AUDIT_EXCEPTION: " + ex.message);
    }

    var out = document.createElement("pre");
    out.id = "__soadAuditOut";
    out.textContent = JSON.stringify(report);
    document.body.appendChild(out);
  }, 150);
});
</script>
</body>
"""
    injected_html = html_text.replace("</body>", audit_script)

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_html = os.path.join(tmpdir, "soad_audit.html")
        with open(tmp_html, "w", encoding="utf-8") as f:
            f.write(injected_html)

        file_url = "file:///" + tmp_html.replace("\\", "/")
        cmd = [
            browser,
            "--headless=new",
            "--disable-gpu",
            "--no-sandbox",
            "--virtual-time-budget=3000",
            "--dump-dom",
            file_url,
        ]
        proc = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=45)
        dom = proc.stdout

    m = re.search(r'<pre id="__soadAuditOut">(.*?)</pre>', dom, re.DOTALL)
    if not m:
        return ["Headless browser did not emit #__soadAuditOut (stderr: " + proc.stderr[:400] + ")"]

    data = json.loads(html.unescape(m.group(1)))
    print(f"  Headless Checks: {json.dumps(data.get('checks', {}), ensure_ascii=False)}")
    if data.get("svgOverflows"):
        print(f"  SVG Overflows found: {len(data['svgOverflows'])}")
    return data.get("errors", [])


def main():
    with open(HTML_PATH, "r", encoding="utf-8") as f:
        html_text = f.read()

    all_errors = []
    for stage_fn in [
        lambda: stage1_file_and_offline_check(html_text),
        stage2_static_dom_and_handlers,
        stage3_ecuc_4way_parity,
        stage4_svg_xml_check,
        lambda: stage5_headless_runtime_and_svg_geometry(html_text),
    ]:
        errs = stage_fn()
        if errs:
            for e in errs:
                print(f"  FAIL: {e}")
            all_errors.extend(errs)

    print("\n===================================================")
    if all_errors:
        print(f"OVERALL RESULT: FAIL ({len(all_errors)} errors)")
        sys.exit(1)
    else:
        print("OVERALL RESULT: PASS (All 5 verification stages passed)")


if __name__ == "__main__":
    main()
