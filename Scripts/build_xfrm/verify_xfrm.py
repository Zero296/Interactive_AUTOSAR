"""5-Stage Comprehensive Verification Suite for AUTOSAR_Xfrm.html."""

import os
import re
import shutil
import subprocess
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

BUILD_DIR = Path(__file__).resolve().parent
REPO_ROOT = BUILD_DIR.parent.parent
HTML_PATH = REPO_ROOT / "Simulation" / "03_Services" / "AUTOSAR_Xfrm.html"
SCRATCH_DIR = Path(r"C:\Users\Acer\.gemini\antigravity\brain\94634ff2-7006-4a4b-9b10-a8cb92496d73\scratch")

sys.path.insert(0, str(BUILD_DIR))
from generate_part6_xfrm import build_handbook_data


def find_browser():
    candidates = [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    return shutil.which("msedge") or shutil.which("chrome") or shutil.which("google-chrome")


def stage1_offline_check(html_text):
    print("\n=== STAGE 1: 100% OFFLINE SELF-CONTAINED ASSET CHECK ===")
    allowed_urls = {"http://www.w3.org/2000/svg", "http://autosar.org/schema/r4.0"}
    urls = set(re.findall(r"https?://[^\s\"'<>`\\)]+", html_text))
    disallowed = [u for u in urls if u not in allowed_urls]
    ext_tags = re.findall(r"<(?:script|link|img)[^>]+(?:src|href)\s*=\s*[\"']https?://", html_text, re.I)
    if disallowed or ext_tags:
        print(f"FAIL: Disallowed external URLs: {disallowed}, ext_tags: {ext_tags}")
        return False
    print(f"PASS: Zero external assets. Only XML namespace URLs present: {sorted(urls)}")
    return True


def stage2_dom_and_handlers_check(html_text):
    print("\n=== STAGE 2: DOM IDS, INLINE HANDLERS & GETELEMENTBYID CHECK ===")
    ids = set(re.findall(r'\bid\s*=\s*"([^"]+)"', html_text))
    # Also dynamically generated IDs in handbook & modals
    dynamic_id_prefixes = ("hbTab2_",)

    script_match = html_text.split("<script>", 1)[1].rsplit("</script>", 1)[0]
    fn_defs = set(re.findall(r"\bfunction\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(", script_match))

    # Inline handlers inside HTML body before <script>
    body_html = html_text.split("<script>", 1)[0]
    inline_calls = re.findall(r'\bon(?:click|change|input)\s*=\s*"([^"]+)"', body_html)
    missing_fns = []
    for call_expr in inline_calls:
        # Handle inline condition like: if(event.target===this) closeExportModal()
        cleaned = re.sub(r"if\s*\([^)]+\)\s*", "", call_expr)
        for m in re.finditer(r"\b([A-Za-z_][A-Za-z0-9_]*)\s*\(", cleaned):
            fn = m.group(1)
            if fn not in fn_defs:
                missing_fns.append((call_expr, fn))

    get_els = set(re.findall(r"document\.getElementById\(\s*['\"]([A-Za-z0-9_-]+)['\"]\s*\)", script_match))
    missing_ids = [eid for eid in sorted(get_els) if eid not in ids and not eid.startswith(dynamic_id_prefixes)]

    ok = True
    if missing_fns:
        print(f"FAIL: Missing inline handler functions: {missing_fns}")
        ok = False
    if missing_ids:
        print(f"FAIL: Missing DOM IDs referenced by getElementById: {missing_ids}")
        ok = False
    if ok:
        print(f"PASS: {len(fn_defs)} top-level JS functions, {len(inline_calls)} inline handlers, {len(get_els)} static getElementById() calls verified.")
    return ok


def stage3_ecuc_parity_and_counts(html_text):
    print("\n=== STAGE 3: EXACT 36 ECUC CONFIG 4-WAY PARITY & DATA COUNTS ===")
    body_html = html_text.split("<script>", 1)[0]
    script_text = html_text.split("<script>", 1)[1]

    row_keys = re.findall(r'data-cfg-key="([^"]+)"', body_html)
    input_ids = re.findall(r'id="cfg_([^"]+)"', body_html)

    m_def = re.search(r"const\s+defaultConfig\s*=\s*\{(.*?)\n\};", script_text, re.S)
    def_keys = re.findall(r"^\s*([A-Za-z0-9_]+)\s*:", m_def.group(1), re.M) if m_def else []

    m_tt = re.search(r"const\s+configTooltipData\s*=\s*\{(.*?)\n\};", script_text, re.S)
    tt_keys = re.findall(r"^\s{2}([A-Za-z0-9_]+)\s*:\s*\{", m_tt.group(1), re.M) if m_tt else []

    s_row, s_in, s_def, s_tt = set(row_keys), set(input_ids), set(def_keys), set(tt_keys)
    ok = True
    if not (len(row_keys) == 36 and len(input_ids) == 36 and len(def_keys) == 36 and len(tt_keys) == 36):
        print(f"FAIL: Counts mismatch: row={len(row_keys)}, input={len(input_ids)}, defaultConfig={len(def_keys)}, tooltips={len(tt_keys)}")
        ok = False
    if not (s_row == s_in == s_def == s_tt):
        print(f"FAIL: 4-way key set mismatch!")
        print("  row - def:", s_row - s_def, "def - tt:", s_def - s_tt, "tt - in:", s_tt - s_in)
        ok = False

    if ok:
        print("PASS: Exact 36-key 4-way parity verified (HTML rows == HTML inputs == defaultConfig == configTooltipData).")
    return ok


def stage4_handbook_svg_xml_check(html_text):
    print("\n=== STAGE 4: HANDBOOK & MAIN SVG XML/VIEWBOX INTEGRITY CHECK ===")
    hb_data = build_handbook_data()
    if len(hb_data) != 6 or any(len(t["subs"]) != 4 for t in hb_data):
        print("FAIL: Handbook must be 6 main tabs x 4 sub-topics = 24 topics!")
        return False

    # Check main SVG in body HTML + all SVGs embedded in handbook
    body_html = html_text.split("<script>", 1)[0]
    svgs = re.findall(r"<svg\b.*?</svg>", body_html, re.S)
    for t in hb_data:
        for s in t["subs"]:
            svgs.extend(re.findall(r"<svg\b.*?</svg>", s["html"], re.S))

    bad = []
    for idx, svg in enumerate(svgs):
        if "viewBox=" not in svg:
            bad.append((idx, "missing viewBox"))
            continue
        try:
            ET.fromstring(svg)
        except Exception as exc:
            bad.append((idx, str(exc)))

    if bad:
        print(f"FAIL: SVG XML errors: {bad}")
        return False
    print(f"PASS: 6x4=24 Handbook topics + {len(svgs)} SVGs parsed cleanly with valid XML & viewBox.")
    return True


def stage5_headless_browser_audit(html_text):
    print("\n=== STAGE 5: HEADLESS BROWSER V8 + FUNCTIONAL & SVG GEOMETRY AUDIT ===")
    browser = find_browser()
    if not browser:
        print("FAIL: Neither msedge.exe nor chrome.exe found on system!")
        return False

    probe_js = r"""
<script>
window.__PROBE_ERRORS__ = [];
window.addEventListener('error', function(e) { window.__PROBE_ERRORS__.push(e.message || String(e)); });
window.addEventListener('DOMContentLoaded', function() {
  setTimeout(function() {
    var report = { pass: true, checks: [], errors: window.__PROBE_ERRORS__, svgOverflows: [] };
    function assert(cond, msg) {
      report.checks.push({ ok: !!cond, msg: msg });
      if (!cond) report.pass = false;
    }

    try {
      // 0. Check Scenario Dropdown & Step 0 Init State (Select / Prev / Reset)
      var scnSel = document.getElementById('scnSelect');
      assert(!!scnSel && scnSel.tagName === 'SELECT', 'Scenario select dropdown present');
      assert(scnSel.querySelectorAll('optgroup').length === 4 && scnSel.options.length === 12, 'Scenario dropdown has 4 optgroups & 12 options');
      loadScenario('S2');
      assert(scnSel.value === 'S2' && uiState.currentStepNum === 0, 'loadScenario(S2) syncs dropdown & starts at Step 0');

      loadScenario('S1');
      assert(uiState.currentStepNum === 0 && simState.bufferBytes.length === 0, 'S1 starts at Step 0 Init State with empty buffer');
      var emptyBox0 = document.querySelector('#byteStreamGrid .byte-grid-empty');
      var r0 = emptyBox0 ? emptyBox0.getBoundingClientRect() : null;
      assert(!!emptyBox0 && r0.width >= 300 && r0.height <= 60 && emptyBox0.textContent.indexOf('Bước 0') >= 0, 'Step 0 byteStreamGrid empty placeholder spans horizontally (' + (r0 ? Math.round(r0.width) + 'x' + Math.round(r0.height) : 'none') + ')');
      assert(document.getElementById('stepIndicator').textContent.indexOf('Bước 0/') === 0, 'Step indicator shows Bước 0 (Init)');
      assert(document.getElementById('btnStepPrev').disabled === true && document.getElementById('btnStepNext').disabled === false, 'Step 0 buttons: Prev disabled, Next enabled');
      nextStep();
      var emptyBox1 = document.querySelector('#byteStreamGrid .byte-grid-empty');
      assert(uiState.currentStepNum === 1 && uiState.activeScenarioId === 'S1' && document.getElementById('stepIndicator').textContent === 'Bước 1/4' && document.getElementById('btnStepPrev').disabled === false && (!emptyBox1 || emptyBox1.textContent.indexOf('Bước 0') < 0), 'nextStep() from Step 0 enters Step 1');
      prevStep();
      assert(uiState.currentStepNum === 0 && simState.bufferBytes.length === 0 && document.getElementById('btnStepPrev').disabled === true, 'prevStep() from Step 1 returns cleanly to Step 0 Init State');
      nextStep(); nextStep();
      assert(uiState.currentStepNum === 2, 'Advanced to Step 2 before Reset check');
      resetCurrentScenario();
      assert(uiState.currentStepNum === 0 && simState.bufferBytes.length === 0 && document.getElementById('stepIndicator').textContent.indexOf('Bước 0/') === 0, 'resetCurrentScenario() resets back to Step 0 Init State');

      // 1. Check all 12 Scenarios x 4 steps (starting from Step 0) + 36 What-Ifs
      assert(typeof SCENARIOS !== 'undefined' && SCENARIOS.length === 12, 'SCENARIOS length == 12');
      var totalSteps = 0, totalWhatIfs = 0, allStartAtZero = true;
      SCENARIOS.forEach(function(scn) {
        loadScenario(scn.id);
        if (uiState.currentStepNum !== 0) allStartAtZero = false;
        for (var i = 0; i < scn.steps.length; i++) {
          totalSteps++;
          nextStep();
        }
        for (var w = 0; w < scn.whatIfs.length; w++) {
          totalWhatIfs++;
          runWhatIf(w);
        }
      });
      assert(allStartAtZero, 'All 12 scenarios start at Step 0 Init State');
      assert(totalSteps === 48, 'All 48 scenario steps executed (' + totalSteps + ')');
      assert(totalWhatIfs === 36, 'All 36 What-If buttons executed (' + totalWhatIfs + ')');

      // 2. Functional Test S1 Endianness & FillPattern & Inv
      loadScenario('S1');
      nextStep(); // Step 1: RTE / Init request
      nextStep(); // Step 2: Tx ComXf Big Endian
      assert(simState.bufferBytes[0].hexVal === '04' && simState.bufferBytes[1].hexVal === 'B5', 'S1 Big-Endian 1205 -> 04 B5');
      assert(simState.bufferBytes[7].hexVal === 'FF', 'S1 FillPattern 0xFF at Byte 7');
      runWhatIf(0); // Little-Endian
      assert(simState.bufferBytes[0].hexVal === 'B5' && simState.bufferBytes[1].hexVal === '04', 'S1 Little-Endian 1205 -> B5 04');
      runWhatIf(2); // Inv restore -120
      assert(simState.decodedSummary.indexOf('Steer=-120') >= 0, 'S1 ComXf_Inv preserves signed Steer=-120');

      // 3. Functional Test S3 IN_PLACE vs OUT_OF_PLACE
      loadScenario('S3');
      nextStep(); // Step 1: IN_PLACE
      assert(simState.headerShiftBytes === 3 && simState.memcpyBytes === 0, 'S3 IN_PLACE P05 HeaderShift=3, memcpy=0');
      nextStep(); // Step 2: OUT_OF_PLACE
      assert(simState.headerShiftBytes === 0 && simState.memcpyBytes > 0, 'S3 OUT_OF_PLACE memcpy > 0');

      // 4. Functional Test S8 ExtractProtocolHeaderFields + S9 AppError 0x81
      loadScenario('S9');
      nextStep();
      nextStep();
      assert(simState.chainFsmState === 'APP_ERR_0x81' && simState.rteReturnCode === 0x01, 'S9 Server AppError 0x81 forwarded');

      // 5. Functional Test S10 E2E 2-Nibble Soft 0x8A -> Hard 0x88 Abort
      loadScenario('S10');
      nextStep(); // Step 1
      nextStep(); // Step 2: Jump #1 -> Soft 0x8A
      assert(simState.e2eRawReturnByte === 0x20 && simState.rteReturnCode === 0x8A, 'S10 Error #1 -> 2-Nibble 0x20 & Soft Error 0x8A');
      nextStep(); // Step 3: Jump #2 -> SM_INVALID 0xA3 & Hard Error 0x88 Abort
      assert(simState.e2eRawReturnByte === 0xA3 && simState.rteReturnCode === 0x88 && simState.chainFsmState === 'ABORTED_0x88', 'S10 Error #2 -> 2-Nibble 0xA3 & Abort 0x88');

      // 6. Functional Test S12 DET UNINIT + Production Runtime 0x05
      loadScenario('S12');
      nextStep(); // Step 1: UNINIT
      assert(simState.detErrors.some(function(e){ return e.errCode === 0x01; }), 'S12 DET UNINIT 0x01 reported');
      nextStep(); // Step 2: PARAM_POINTER
      assert(simState.detErrors.some(function(e){ return e.errCode === 0x04; }), 'S12 DET PARAM_POINTER 0x04 reported');
      nextStep(); // Step 3: XfrmDevErrorDetect=false + Truncated -> Runtime 0x05!
      assert(simState.detErrors.some(function(e){ return e.type === 'RUNTIME' && e.errCode === 0x05; }), 'S12 DET Runtime 0x05 active in Production');

      // 7. Handbook & Abbreviations Search (58 terms, filter TLV)
      assert(typeof ABBREVIATIONS !== 'undefined' && ABBREVIATIONS.length === 58, 'ABBREVIATIONS == 58 terms');
      switchMainView('hb');
      selectHandbookMainTab(6);
      var inp = document.getElementById('abbrSearchInput');
      inp.value = 'TLV';
      onAbbrSearchInput();
      var cntText = document.getElementById('abbrMatchCount').textContent;
      var marks = document.querySelectorAll('#hbArticleContent mark').length;
      assert(marks > 0 && cntText.indexOf('/ 58') >= 0, 'Abbreviation search TLV highlights <mark> (' + cntText + ')');

      // 8. SVG Geometry Audit on main SVG + all Handbook SVGs
      switchMainView('sim');
      function auditSvg(svg, label) {
        if (!svg) return;
        var vb = svg.getAttribute('viewBox');
        var vbW = vb ? parseFloat(vb.split(/\s+/)[2]) : 920;
        var rects = Array.prototype.slice.call(svg.querySelectorAll('rect'));
        var texts = Array.prototype.slice.call(svg.querySelectorAll('text'));
        texts.forEach(function(t) {
          var len = typeof t.getComputedTextLength === 'function' ? t.getComputedTextLength() : 0;
          var x = parseFloat(t.getAttribute('x') || '0');
          var y = parseFloat(t.getAttribute('y') || '0');
          if (len > vbW - 10) {
            report.svgOverflows.push(label + ': text wider than viewBox (' + Math.round(len) + '>' + vbW + '): ' + t.textContent);
          }
          // Find narrowest enclosing rect
          var enclosing = rects.filter(function(r) {
            var rx = parseFloat(r.getAttribute('x')), ry = parseFloat(r.getAttribute('y'));
            var rw = parseFloat(r.getAttribute('width')), rh = parseFloat(r.getAttribute('height'));
            return rw < vbW * 0.85 && x >= rx - 2 && x <= rx + rw + 2 && y >= ry - 2 && y <= ry + rh + 2;
          }).sort(function(a, b) {
            return parseFloat(a.getAttribute('width')) - parseFloat(b.getAttribute('width'));
          });
          if (enclosing.length) {
            var rw = parseFloat(enclosing[0].getAttribute('width'));
            if (len > rw - 6) {
              report.svgOverflows.push(label + ': text overflows rect (' + Math.round(len) + '>' + (rw - 6) + '): "' + t.textContent + '"');
            }
          }
        });
      }
      auditSvg(document.getElementById('archSvg'), 'MainArchSVG');

      switchMainView('hb');
      for (var m = 0; m < 6; m++) {
        for (var s = 0; s < 4; s++) {
          selectHandbookMainTab(m);
          selectHandbookSubTab(s);
          var svgs = document.querySelectorAll('#hbArticleContent svg');
          for (var k = 0; k < svgs.length; k++) {
            auditSvg(svgs[k], 'HB_T' + (m+1) + '_S' + (s+1));
          }
        }
      }
      assert(report.svgOverflows.length === 0, 'Zero SVG text overflows (' + report.svgOverflows.length + ')');

      // 9. Tooltip >1s popup, Byte-click corruption & Module selector + Theme + Exports
      showCfgTooltip('ComXfSignalEndianness', 120, 120);
      var ttPop = document.getElementById('cfgTooltipPopup');
      assert(ttPop && ttPop.style.display === 'block' && ttPop.textContent.indexOf('SWS_ComXf_00018') >= 0, 'Tooltip popup displays SWS_ComXf_00018');
      ttPop.style.display = 'none';

      loadScenario('S2');
      nextStep();
      nextStep();
      toggleByteCorruption(0);
      assert(simState.e2eCheckStatus === 0x30, 'Clicking byte[0] CRC triggers E2E_P_ERROR (0x30)');

      selectModule('SomeIpXf');
      assert(document.getElementById('inspPane_module').textContent.indexOf('ModuleId 174') >= 0, 'selectModule SomeIpXf renders ModuleId 174 I/O');

      switchMainView('sim');
      var hdrSimEl = document.querySelector('header.hdr');
      var hdrSimRect = hdrSimEl.getBoundingClientRect();
      assert(hdrSimRect.height > 0 && hdrSimRect.height <= 68, 'Compact Simulator header height <= 68px (' + Math.round(hdrSimRect.height) + 'px)');

      var colL = document.querySelector('#viewSim .col-left');
      var colC = document.querySelector('#viewSim .col-center');
      var inspBody = document.querySelector('#viewSim .col-right .insp-body');
      assert(colL && colC && inspBody && getComputedStyle(colL).overflowY === 'auto' && getComputedStyle(colC).overflowY === 'auto' && getComputedStyle(inspBody).overflowY === 'auto', 'All 3 workspace columns support independent vertical scroll');
      assert(colL.scrollHeight > colL.clientHeight && colC.scrollHeight > colC.clientHeight, 'Columns scroll internally within fixed 720px viewport');
      colC.scrollTop = 180;
      colL.scrollTop = 120;
      assert(colC.scrollTop > 0 && colL.scrollTop > 0 && inspBody.scrollTop === 0 && Math.round(hdrSimEl.getBoundingClientRect().top) === 0, 'Scrolling left/center columns independently keeps header pinned at top=0');
      colC.scrollTop = 0; colL.scrollTop = 0;

      switchMainView('hb');
      selectHandbookMainTab(0);
      selectHandbookSubTab(0);
      var hdrHbRect = hdrSimEl.getBoundingClientRect();
      assert(hdrHbRect.height > 0 && hdrHbRect.height <= 38, 'Compact Handbook header height <= 38px (' + Math.round(hdrHbRect.height) + 'px)');
      var viewHbEl = document.getElementById('viewHb');
      viewHbEl.scrollTop = 180;
      assert(viewHbEl.scrollTop > 0 && Math.round(hdrSimEl.getBoundingClientRect().top) === 0, 'Scrolling Handbook keeps header sticky/pinned at top=0');
      viewHbEl.scrollTop = 0;
      switchMainView('sim');
      toggleTheme();
      assert(document.documentElement.getAttribute('data-theme') === 'light', 'Light theme activates');
      toggleTheme();
      assert(!document.documentElement.hasAttribute('data-theme'), 'Dark theme restores');
      openExportModal();
      switchExportTab('arxml');
      assert(document.getElementById('exportCodePre').textContent.indexOf('DATA-TRANSFORMATION') >= 0, 'ARXML export non-empty');
      switchExportTab('cfg_h');
      assert(document.getElementById('exportCodePre').textContent.indexOf('#define XFRM_CFG_H') >= 0, 'Xfrm_Cfg.h export non-empty');
      switchExportTab('rte_c');
      assert(document.getElementById('exportCodePre').textContent.indexOf('Rte_') >= 0, 'Rte_Xfrm.c export non-empty');
      switchExportTab('json');
      assert(document.getElementById('exportCodePre').textContent.indexOf('ActiveTransformerChainPreset') >= 0, 'JSON export non-empty');
      closeExportModal();
      loadScenario('S1');
    } catch (ex) {
      report.pass = false;
      report.errors.push('Probe exception: ' + (ex.message || String(ex)));
    }

    var out = document.createElement('pre');
    out.id = 'PROBE_RESULT_JSON';
    out.textContent = JSON.stringify(report);
    document.body.appendChild(out);
  }, 150);
});
</script>
"""
    SCRATCH_DIR.mkdir(parents=True, exist_ok=True)
    probe_file = SCRATCH_DIR / "probe_xfrm.html"
    injected = html_text.replace("</body>", probe_js + "\n</body>")
    probe_file.write_text(injected, encoding="utf-8")

    try:
        res = subprocess.run(
            [browser, "--headless=new", "--window-size=1280,720", "--disable-gpu", "--no-sandbox", "--virtual-time-budget=5000", "--dump-dom", probe_file.as_uri()],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=30,
        )
        m = re.search(r'<pre id="PROBE_RESULT_JSON">(.*?)</pre>', res.stdout, re.S)
        if not m:
            print("FAIL: Could not capture PROBE_RESULT_JSON from headless browser.")
            print("stderr sample:", res.stderr[:500])
            return False

        import json
        import html as html_mod
        report = json.loads(html_mod.unescape(m.group(1)))
        for c in report["checks"]:
            status = "PASS" if c["ok"] else "FAIL"
            print(f"  [{status}] {c['msg']}")
        if report["errors"]:
            print("  Runtime errors:", report["errors"])
        if report["svgOverflows"]:
            print("  SVG Overflows:")
            for ov in report["svgOverflows"]:
                print("   -", ov)
        return bool(report["pass"]) and not report["errors"]
    finally:
        if probe_file.exists():
            probe_file.unlink()


def main():
    if not HTML_PATH.exists():
        print(f"FAIL: Missing output HTML at {HTML_PATH}")
        sys.exit(1)

    html_text = HTML_PATH.read_text(encoding="utf-8")
    r1 = stage1_offline_check(html_text)
    r2 = stage2_dom_and_handlers_check(html_text)
    r3 = stage3_ecuc_parity_and_counts(html_text)
    r4 = stage4_handbook_svg_xml_check(html_text)
    r5 = stage5_headless_browser_audit(html_text)

    print("\n============================================================")
    all_pass = r1 and r2 and r3 and r4 and r5
    print(f"OVERALL RESULT: {'PASS' if all_pass else 'FAIL'}")
    print("============================================================")
    sys.exit(0 if all_pass else 1)


if __name__ == "__main__":
    main()
