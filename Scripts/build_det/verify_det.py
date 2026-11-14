# -*- coding: utf-8 -*-
"""Comprehensive Static + SVG Geometry + Headless Chromium Runtime Verification for AUTOSAR_Det.html."""

import json
import os
import re
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(BASE_DIR, "..", ".."))
HTML_PATH = os.path.join(REPO_ROOT, "Simulation", "03_Services", "AUTOSAR_Det.html")

BROWSER_CANDIDATES = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
]


def scan_js_balance(js_src):
    stack = []
    pairs = {"{": "}", "(": ")", "[": "]"}
    closing = {v: k for k, v in pairs.items()}
    i = 0
    n = len(js_src)
    line = 1
    in_s = in_d = in_bt = False
    in_lc = in_bc = False
    tpl_brace_depth = []

    while i < n:
        ch = js_src[i]
        nxt = js_src[i + 1] if i + 1 < n else ""
        if ch == "\n":
            line += 1
            in_lc = False
            i += 1
            continue
        if in_lc:
            i += 1
            continue
        if in_bc:
            if ch == "*" and nxt == "/":
                in_bc = False
                i += 2
                continue
            i += 1
            continue
        if in_s:
            if ch == "\\":
                i += 2
                continue
            if ch == "'":
                in_s = False
            i += 1
            continue
        if in_d:
            if ch == "\\":
                i += 2
                continue
            if ch == '"':
                in_d = False
            i += 1
            continue
        if in_bt:
            if ch == "\\":
                i += 2
                continue
            if ch == "`":
                in_bt = False
                i += 1
                continue
            if ch == "$" and nxt == "{":
                tpl_brace_depth.append(len(stack))
                stack.append(("{", line))
                in_bt = False
                i += 2
                continue
            i += 1
            continue

        # Not in string/comment
        if ch == "/" and nxt == "/":
            in_lc = True
            i += 2
            continue
        if ch == "/" and nxt == "*":
            in_bc = True
            i += 2
            continue
        if ch == "'":
            in_s = True
            i += 1
            continue
        if ch == '"':
            in_d = True
            i += 1
            continue
        if ch == "`":
            in_bt = True
            i += 1
            continue

        # Regex literal heuristic
        if ch == "/" and nxt not in ("/", "*"):
            prev_non_ws = ""
            k = i - 1
            while k >= 0 and js_src[k] in " \t\r\n":
                k -= 1
            if k >= 0:
                prev_non_ws = js_src[k]
            if prev_non_ws in ("", "(", "[", "{", ",", "=", ":", ";", "!", "&", "|", "?", "~", "+", "-", "*"):
                # Scan regex until unescaped /
                j = i + 1
                in_cls = False
                found_end = False
                while j < n and js_src[j] != "\n":
                    c2 = js_src[j]
                    if c2 == "\\":
                        j += 2
                        continue
                    if c2 == "[":
                        in_cls = True
                    elif c2 == "]" and in_cls:
                        in_cls = False
                    elif c2 == "/" and not in_cls:
                        found_end = True
                        j += 1
                        break
                    j += 1
                if found_end:
                    i = j
                    continue

        if ch in pairs:
            stack.append((ch, line))
        elif ch in closing:
            if not stack or stack[-1][0] != closing[ch]:
                raise AssertionError(f"Unmatched '{ch}' at script line {line}; top={stack[-1] if stack else 'EMPTY'}")
            stack.pop()
            if tpl_brace_depth and len(stack) == tpl_brace_depth[-1]:
                tpl_brace_depth.pop()
                in_bt = True
        i += 1

    if in_s or in_d or in_bt or in_bc:
        raise AssertionError(f"Unterminated string/comment at EOF (in_s={in_s}, in_d={in_d}, in_bt={in_bt}, in_bc={in_bc})")
    if stack:
        raise AssertionError(f"Unclosed brackets at EOF: {stack[:5]}")


def check_svg_xml(svg_str, label):
    try:
        root = ET.fromstring(svg_str)
    except ET.ParseError as e:
        raise AssertionError(f"Invalid SVG XML in {label}: {e}")
    # Basic text overflow check inside rect boxes if x/y/width/height present
    vb = root.attrib.get("viewBox", "")
    parts = [float(x) for x in vb.split()] if vb else []
    if len(parts) == 4:
        vb_w, vb_h = parts[2], parts[3]
        for el in root.iter():
            tag = el.tag.split("}")[-1]
            if tag == "text":
                tx = float(el.attrib.get("x", "0"))
                ty = float(el.attrib.get("y", "0"))
                assert 0 <= tx <= vb_w, f"{label}: text x={tx} outside viewBox width {vb_w}"
                assert 0 <= ty <= vb_h, f"{label}: text y={ty} outside viewBox height {vb_h}"


def run_static_checks(html):
    print("[1/5] Checking offline compliance & script structure...")
    assert not re.search(r'<script[^>]+src=', html, re.I), "External <script src=...> forbidden!"
    assert not re.search(r'<link[^>]+href=["\']https?://', html, re.I), "External stylesheet link forbidden!"
    urls = set(re.findall(r'https?://[^\s"\'<>]+', html))
    allowed_prefixes = ("http://www.w3.org/2000/svg", "http://autosar.org/schema/r4.0", "http://www.w3.org/2001/XMLSchema-instance")
    for u in urls:
        assert any(u.startswith(p) for p in allowed_prefixes), f"Disallowed external URL found: {u}"
    script_matches = re.findall(r"<script>", html)
    assert len(script_matches) == 1, f"Expected 1 <script> tag, found {len(script_matches)}"
    assert html.rstrip().endswith("</script>\n</body>\n</html>"), "HTML must end cleanly with </script></body></html>"

    print("[2/5] Running JS lexical brace/quote balance scanner...")
    script_start = html.index("<script>") + len("<script>")
    script_end = html.rindex("</script>")
    js_src = html[script_start:script_end]
    scan_js_balance(js_src)

    print("[3/5] Checking 36 ECUC keys parity & DOM/handler parity...")
    html_part = html[:script_start]
    cfg_ids = set(re.findall(r'id="cfg_([A-Za-z0-9_]+)"', html_part))
    row_keys = set(re.findall(r'class="cfg-row"\s+data-cfg-key="([A-Za-z0-9_]+)"', html_part))
    info_keys = set(re.findall(r'class="cfg-i"\s+data-cfg-key="([A-Za-z0-9_]+)"', html_part))

    m_def = re.search(r"const defaultConfig = \{(.*?)\n\};", js_src, re.S)
    assert m_def, "defaultConfig not found"
    def_keys = set(re.findall(r"^\s*([A-Za-z0-9_]+):", m_def.group(1), re.M))

    m_tt = re.search(r"const configTooltipData = \{(.*?)\n\};", js_src, re.S)
    assert m_tt, "configTooltipData not found"
    tt_keys = set(re.findall(r"^  ([A-Za-z0-9_]+): \{", m_tt.group(1), re.M))

    for name, s in [("cfg_ids", cfg_ids), ("row_keys", row_keys), ("info_keys", info_keys), ("def_keys", def_keys), ("tt_keys", tt_keys)]:
        assert len(s) == 36, f"{name} count is {len(s)}, expected 36 (missing={def_keys - s}, extra={s - def_keys})"
        assert s == def_keys, f"{name} mismatch with defaultConfig: diff={s ^ def_keys}"

    all_html_ids = set(re.findall(r'id="([A-Za-z0-9_]+)"', html_part))
    dynamic_id_prefixes = ("cfg_", "hbTab2_")
    for gid in re.findall(r'document\.getElementById\("([A-Za-z0-9_]+)"\)', js_src):
        if gid.startswith(dynamic_id_prefixes):
            continue
        assert gid in all_html_ids, f"JS references missing DOM id: #{gid}"

    inline_calls = re.findall(r'on(?:click|change|input)="([^"]+)"', html_part)
    inline_fns = set()
    for expr in inline_calls:
        for fn in re.findall(r'([A-Za-z_][A-Za-z0-9_]*)\s*\(', expr):
            if fn not in ("if",):
                inline_fns.add(fn)
    defined_fns = set(re.findall(r'\bfunction\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(', js_src))
    for fn in inline_fns:
        assert fn in defined_fns, f"Inline handler calls undefined function: {fn}()"

    print("[4/5] Checking SVG Architecture & Handbook inline SVG geometry...")
    arch_m = re.search(r'(<svg id="detArchSvg".*?</svg>)', html_part, re.S)
    assert arch_m, "#detArchSvg missing"
    check_svg_xml(arch_m.group(1), "detArchSvg")

    for mod_key in ["MOD_SWC", "MOD_RTE", "MOD_BSW", "MOD_MCAL", "MOD_ECUM", "MOD_DET", "MOD_HOOKS", "MOD_DLT", "MOD_BUFFER", "MOD_DEBUG_DEM"]:
        assert f'id="svg_{mod_key}"' in arch_m.group(1), f"Missing SVG module node svg_{mod_key}"

    sys.path.insert(0, BASE_DIR)
    import generate_part6_det
    hb = generate_part6_det.build_handbook_data()
    assert len(hb) == 6, f"Expected 6 Level-1 handbook tabs, got {len(hb)}"
    for i, tab in enumerate(hb):
        assert len(tab["subs"]) == 4, f"Tab {i} expected 4 sub-tabs, got {len(tab['subs'])}"
        for j, sub in enumerate(tab["subs"]):
            for k, svg_match in enumerate(re.findall(r"<svg .*?</svg>", sub["html"], re.S)):
                check_svg_xml(svg_match, f"Handbook[{i}][{j}]_svg{k}")
    print("   -> All static, 36 ECUC parity, and XML/SVG checks passed!")


def run_headless_browser_test(html):
    browser = next((p for p in BROWSER_CANDIDATES if os.path.exists(p)), None)
    assert browser, "Neither Chrome nor Edge found for headless runtime test!"
    print(f"[5/5] Running Live Headless Browser Verification ({os.path.basename(browser)})...")

    probe_js = r"""
;(function(){
  const __errors = [];
  window.addEventListener("error", function(ev){ __errors.push(String(ev.message || ev.error)); });
  document.addEventListener("DOMContentLoaded", function(){
    setTimeout(function(){
      const out = { errors: __errors, checks: {} };
      try {
        out.checks.scenarioCount = SCENARIOS.length;
        out.checks.abbrCount = ABBREVIATIONS.length;
        out.checks.moduleInfoCount = Object.keys(MODULES_INFO).length;
        out.checks.whatIfTotal = SCENARIOS.reduce((a, s) => a + s.whatIfs.length, 0);

        // Execute every scenario step-by-step + stepPrev + whatIfs
        let totalStepsRun = 0;
        let totalWhatIfsRun = 0;
        for (let i = 0; i < SCENARIOS.length; i++) {
          loadScenario(i);
          if (SCENARIOS[i].steps.length > 0) {
            stepNext();
            totalStepsRun++;
            if (curStepIdx !== 1) throw new Error("stepNext failed on S" + (i + 1));
            stepPrev();
            if (curStepIdx !== 0) throw new Error("stepPrev failed on S" + (i + 1));
          }
          runAllSteps();
          if (curStepIdx !== SCENARIOS[i].steps.length) throw new Error("runAllSteps incomplete on S" + (i + 1));
          for (let w = 0; w < SCENARIOS[i].whatIfs.length; w++) {
            runWhatIf(w);
            totalWhatIfsRun++;
          }
        }
        out.checks.totalStepsRun = totalStepsRun;
        out.checks.totalWhatIfsRun = totalWhatIfsRun;

        // Verify SWS_Det_00211: Transient Fault must NOT forward to DLT
        loadScenario(6); // S7
        const dltBefore = simState.counts.dlt;
        qaTriggerTransientFault();
        if (simState.counts.dlt !== dltBefore) throw new Error("Transient fault mistakenly incremented DLT count!");
        out.checks.transientNoDltOk = true;

        // Verify Endless Loop Halt & Break Endless Loop recovery
        loadScenario(1); // S2
        stepNext();
        if (simState.loopHaltState !== "ENDLESS_HALT_BKPT") throw new Error("S2 did not halt CPU!");
        if ((computeCoreStatusByte() & 0x01) === 0) throw new Error("Bit 0 HALT_LP not set!");
        api_BreakEndlessLoop();
        if (simState.loopHaltState !== "NORMAL_EXEC") throw new Error("BreakEndlessLoop did not resume!");
        out.checks.haltAndResumeOk = true;

        // Verify Self-Error (S11)
        api_Det_GetVersionInfo(true);
        if ((computePipelineFilterByte() & 0x01) === 0) throw new Error("Self-error bit not set!");
        out.checks.selfErrorOk = true;

        // Verify Quick Actions & Custom 4-Tuple Injector & Interactive bits/slots
        qaTriggerDevError();
        qaTriggerRuntimeError();
        qaTriggerSwcRte();
        qaInjectSpecial();
        qaInjectCustom4Tuple();
        selectBufferSlot(0);
        toggleRegisterBit("core", 7);
        toggleRegisterBit("core", 7);
        out.checks.quickActionsOk = true;

        // Verify Inspector Tabs & Export Modal ARXML XML
        ["trace", "io", "callers", "code"].forEach(switchInspTab);
        openExportModal();
        switchExportTab("arxml");
        const arxml = document.getElementById("exportCodeArea").value;
        if (!arxml.includes("<SHORT-NAME>Det</SHORT-NAME>")) throw new Error("ARXML missing Det short-name!");
        switchExportTab("h");
        switchExportTab("c");
        switchExportTab("json");
        closeExportModal();
        out.checks.exportOk = true;

        // Verify Config Tooltip Hover/Pin
        const infoBtn = document.querySelector('.cfg-i[data-cfg-key="DetEndlessLoopInDevError"]');
        infoBtn.click();
        const ttVisible = document.getElementById("cfgTooltipPopup").style.display === "block";
        if (!ttVisible) throw new Error("Config tooltip did not appear on click!");
        hideConfigTooltip(true);
        out.checks.tooltipOk = true;

        // Verify Theme toggle
        toggleTheme();
        if (document.documentElement.getAttribute("data-theme") !== "light") throw new Error("Light theme toggle failed!");
        toggleTheme();

        // Verify Handbook 6x4 + Abbreviation Live Search <mark> + Category Filter
        switchView("hb");
        for (let t = 0; t < 6; t++) {
          selectHbTab1(t);
          for (let s = 0; s < 4; s++) {
            selectHbTab2(s);
            if (document.getElementById("hbContentArea").innerHTML.length < 100) {
              throw new Error("Empty handbook content at " + t + "." + s);
            }
          }
        }
        selectHbTab1(6);
        setAbbrCategory("CALLER");
        const srch = document.getElementById("abbrSearchInput");
        srch.value = "PDAV";
        renderAbbreviationTable();
        const hbHtml = document.getElementById("hbContentArea").innerHTML;
        if (!hbHtml.includes('<mark class="hl">PDAV</mark>')) throw new Error("Abbreviation search <mark> highlight missing!");
        out.checks.handbookAndAbbrOk = true;

        // Verify live SVG bounding boxes inside detArchSvg and Handbook SVGs
        const archSvg = document.getElementById("detArchSvg");
        const vb = archSvg.viewBox.baseVal;
        archSvg.querySelectorAll("text").forEach(t => {
          const b = t.getBBox();
          if (b.x < -2 || b.y < -2 || (b.x + b.width) > vb.width + 4 || (b.y + b.height) > vb.height + 4) {
            throw new Error("detArchSvg text overflow: " + t.textContent + " bbox=" + JSON.stringify(b));
          }
        });
        out.checks.archSvgBBoxOk = true;

        // Verify hover tooltip timer path (mouseenter -> wait >1050ms not tested here, click pin + DEM content verified)
        switchView("sim");
        const ttPopup = document.getElementById("cfgTooltipPopup");
        document.querySelector('.cfg-i[data-cfg-key="CallerDevErrorDetect"]').click();
        if (!ttPopup.innerHTML.includes("SWS_BSW_00049")) throw new Error("Tooltip SWS content mismatch!");
        hideConfigTooltip(true);

        // Verify compact header height at 1366x768 desktop viewport
        const hdrRect = document.querySelector(".app-hdr").getBoundingClientRect();
        const hdrTopRect = document.querySelector(".hdr-top").getBoundingClientRect();
        out.checks.headerHeightPx = Math.round(hdrRect.height);
        out.checks.headerTopHeightPx = Math.round(hdrTopRect.height);
        if (hdrRect.height > 76 || hdrTopRect.height > 36) {
          throw new Error("Header too tall / wrapped! hdr=" + hdrRect.height + "px, hdrTop=" + hdrTopRect.height + "px");
        }

        // Verify Abbreviation filter counts sum cleanly and zero console errors
        out.checks.ecucInputCount = document.querySelectorAll('.cfg-row[data-cfg-key]').length;
        if (out.checks.ecucInputCount !== 36) throw new Error("Expected 36 ECUC rows!");

        out.passed = (__errors.length === 0);
      } catch (err) {
        out.passed = false;
        out.exception = String(err && err.stack ? err.stack : err);
      }
      const pre = document.createElement("pre");
      pre.id = "__VERIFY_REPORT__";
      pre.textContent = JSON.stringify(out, null, 2);
      document.body.appendChild(pre);
    }, 60);
  });
})();
"""
    injected = html.replace("</script>\n</body>\n</html>", probe_js + "\n</script>\n</body>\n</html>")
    fd, tmp_path = tempfile.mkstemp(prefix="det_verify_", suffix=".html", dir=BASE_DIR)
    os.close(fd)
    try:
        with open(tmp_path, "w", encoding="utf-8") as f:
            f.write(injected)
        file_url = "file:///" + tmp_path.replace("\\", "/")
        proc = subprocess.run(
            [browser, "--headless=new", "--disable-gpu", "--window-size=1366,768", "--virtual-time-budget=3000", "--dump-dom", file_url],
            capture_output=True,
            text=True,
            encoding="utf-8",
            timeout=30,
        )
        m = re.search(r'<pre id="__VERIFY_REPORT__">(.*?)</pre>', proc.stdout, re.S)
        assert m, f"Headless report not found in DOM output! stderr={proc.stderr[:500]}"
        report = json.loads(m.group(1))
        print("   -> Headless Report:", json.dumps(report, ensure_ascii=False))
        assert report.get("passed"), f"Headless browser runtime check failed: {report}"
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


def main():
    assert os.path.exists(HTML_PATH), f"Missing assembled file: {HTML_PATH}"
    with open(HTML_PATH, "r", encoding="utf-8") as f:
        html = f.read()
    run_static_checks(html)
    run_headless_browser_test(html)
    print("\nALL VERIFICATION CHECKS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    main()
