# -*- coding: utf-8 -*-
"""Comprehensive verification suite for AUTOSAR_Fee.html.

Performs:
1. Script tag balance & extracted JS validation.
2. Static inline HTML handler -> JS function parity.
3. Static DOM ID existence check for literal getEl('id') calls.
4. ECUC 36-parameter parity across HTML, defaultConfig, and configTooltipData.
5. Full runtime execution in real V8/DOM (via Node.js vm if installed, or real
   headless Chrome/Edge --dump-dom) testing all 12 scenarios, 36 What-Ifs,
   Quick Actions, SLOW/FAST timing (20ms vs 5ms), alignment math, exports,
   10 MODULES_INFO, 56+ ABBREVIATIONS, and 24 HANDBOOK_DATA topics.
6. Strict XML + bounding-box audit of all 24 Handbook SVG diagrams.
"""

import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
TARGET_HTML = os.path.join(ROOT_DIR, "Simulation", "04_ECU_Abstraction", "AUTOSAR_Fee.html")

CHROME_CANDIDATES = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
]


def extract_script(html_text):
    m = re.search(r"<script>\s*(.*)\s*</script>", html_text, flags=re.S)
    assert m, "Could not locate <script>...</script> block in HTML!"
    return m.group(1)


def find_browser_exe():
    for c in CHROME_CANDIDATES:
        if os.path.exists(c):
            return c
    return shutil.which("chrome") or shutil.which("msedge")


def check_svg_xml_and_bounds(svg_text, label):
    root = ET.fromstring(svg_text)
    vb = root.attrib.get("viewBox", "")
    parts = [float(x) for x in vb.split()]
    assert len(parts) == 4, f"Invalid viewBox in {label}: {vb}"
    vw, vh = parts[2], parts[3]

    for elem in root.iter():
        tag = elem.tag.split("}")[-1]
        if tag == "rect":
            x = float(elem.attrib.get("x", 0))
            y = float(elem.attrib.get("y", 0))
            w = float(elem.attrib.get("width", 0))
            h = float(elem.attrib.get("height", 0))
            assert x >= -1 and y >= -1 and x + w <= vw + 2 and y + h <= vh + 2, (
                f"Rect out of bounds in {label}: ({x},{y},{w},{h}) vs ({vw},{vh})"
            )


def build_shared_js_assertions(html_keys):
    html_keys_json = json.dumps(sorted(html_keys))
    return f"""
(function() {{
  const htmlKeys = {html_keys_json};
  const cfgKeys = Object.keys(defaultConfig);
  const tipKeys = Object.keys(configTooltipData);

  const diffTip = cfgKeys.filter(k => !tipKeys.includes(k));
  const diffHtml = cfgKeys.filter(k => !htmlKeys.includes(k));
  if (diffTip.length || diffHtml.length || cfgKeys.length !== htmlKeys.length) {{
    throw new Error('ECUC key parity failed: diffTip=' + diffTip + ' diffHtml=' + diffHtml);
  }}

  if (SCENARIOS.length !== 12) throw new Error('Expected 12 scenarios, got ' + SCENARIOS.length);
  let whatIfCount = 0;
  for (let si = 0; si < SCENARIOS.length; si++) {{
    const sc = SCENARIOS[si];
    loadScenarioByIndex(si, 0);
    if (uiState.currentStepIdx !== 0) {{
      throw new Error('Scenario ' + sc.id + ' did not start at Step 0');
    }}
    for (let st = 1; st <= sc.steps.length; st++) {{
      nextScenarioStep();
      if (uiState.currentStepIdx !== st) {{
        throw new Error('Expected step ' + st + ', got ' + uiState.currentStepIdx);
      }}
    }}
    for (let st = sc.steps.length - 1; st >= 0; st--) {{
      prevScenarioStep();
      if (uiState.currentStepIdx !== st) {{
        throw new Error('prevScenarioStep expected step ' + st + ', got ' + uiState.currentStepIdx);
      }}
    }}
    goToScenarioStep(sc.steps.length);
    resetCurrentScenario();
    if (uiState.currentStepIdx !== 0) {{
      throw new Error('resetCurrentScenario did not return to Step 0');
    }}
    for (let wi = 0; wi < sc.whatIfs.length; wi++) {{
      loadScenarioByIndex(si, 0);
      runWhatIf(wi);
      whatIfCount += 1;
    }}
  }}
  if (whatIfCount !== 36) throw new Error('Expected 36 what-ifs, got ' + whatIfCount);

  loadScenarioByIndex(1, 0); // S2 at Step 0 (Clean Setup, 0 writes)
  if (simState.stats.totalWrites !== 0) {{
    throw new Error('S2 Step 0 should have 0 writes before Step 1, got ' + simState.stats.totalWrites);
  }}
  const g14 = calcSlotGeometry(14, {{ FeeVirtualPageSize: '8', FeeBlockHeaderSize: 8 }});
  if (g14.totalBytes !== 24 || g14.paddingBytes !== 2) {{
    throw new Error('Geometry 14B/VP=8 failed: ' + JSON.stringify(g14));
  }}

  loadScenarioByIndex(8, 0); // S9 Step 0 -> setup only
  goToScenarioStep(1); // S9 Step 1 -> SLOW 32B
  const slowLatency = simState.stats.lastLatencyMs;
  goToScenarioStep(3); // S9 Step 3 -> FAST 32B
  const fastLatency = simState.stats.lastLatencyMs;
  if (slowLatency !== 20 || fastLatency !== 5) {{
    throw new Error('Timing mismatch SLOW=' + slowLatency + 'ms, FAST=' + fastLatency + 'ms');
  }}

  qaFeeWrite(); stepCompleteAsyncJob();
  qaFeeRead(); stepCompleteAsyncJob();
  qaFeeInvalidate(); stepCompleteAsyncJob();
  qaEraseAndWriteImmediate(); stepCompleteAsyncJob();
  qaTriggerGarbageCollection(); stepCompleteAsyncJob();
  qaInjectTornWrite();
  qaCancelOrReset();

  const arxml = generateArxmlContent();
  const cfgh = generateFeeCfgH();
  const lcfg = generateFeeLcfgC();
  if (!arxml.includes('<AUTOSAR') || !cfgh.includes('#define FEE_VIRTUAL_PAGE_SIZE') || !lcfg.includes('Fee_BlockConfig')) {{
    throw new Error('Export output check failed');
  }}

  const modKeys = Object.keys(MODULES_INFO);
  if (modKeys.length !== 10) throw new Error('Expected 10 MODULES_INFO, got ' + modKeys.length);
  if (ABBREVIATIONS.length < 56) throw new Error('Expected >=56 ABBREVIATIONS, got ' + ABBREVIATIONS.length);
  if (HANDBOOK_DATA.length !== 6) throw new Error('Expected 6 Handbook tabs');
  let subTotal = 0;
  const svgs = [];
  HANDBOOK_DATA.forEach((t, ti) => {{
    if (t.subs.length !== 4) throw new Error('Tab ' + ti + ' expected 4 subs');
    t.subs.forEach((s, si) => {{
      subTotal += 1;
      const m = s.contentHtml.match(/<svg[\\s\\S]*?<\\/svg>/);
      if (!m) throw new Error('Missing SVG in Handbook tab ' + ti + '-' + si);
      svgs.push({{ key: ti + '-' + si, svg: m[0] }});
    }});
  }});

  if (typeof switchMainView === 'function' && typeof document !== 'undefined') {{
    switchMainView('hb');
    switchHbTab1(6);
    setAbbrCategory('GC');
    const inp = getEl('abbrSearchInput');
    if (inp) {{ inp.value = 'RAM'; filterAbbreviationTable(); }}
    const renderedRows = document.querySelectorAll('#hbContentArea tbody tr').length;
    if (renderedRows < 1) throw new Error('Expected filtered abbreviation rows in DOM');
    switchMainView('sim');
  }}

  return {{
    ok: true,
    cfgKeys: cfgKeys.length,
    scenarios: SCENARIOS.length,
    whatIfs: whatIfCount,
    abbreviations: ABBREVIATIONS.length,
    modules: modKeys.length,
    handbookTopics: subTotal,
    slowLatency,
    fastLatency,
    svgs
  }};
}})()
"""


def run_via_browser(html_text, browser_exe, js_assertions):
    # Inject a small self-test runner right before </body> in a TEMP copy
    hook = f"""
<script>
window.__FEE_VERIFY_RESULT__ = null;
window.addEventListener('DOMContentLoaded', () => {{
  setTimeout(() => {{
    let res;
    try {{
      res = {js_assertions};
    }} catch (err) {{
      res = {{ ok: false, error: err.message, stack: err.stack }};
    }}
    const pre = document.createElement('pre');
    pre.id = '__verify_out__';
    pre.textContent = JSON.stringify(res);
    document.body.appendChild(pre);
  }}, 80);
}});
</script>
"""
    patched_html = html_text.replace("</body>", hook + "\n</body>")
    with tempfile.TemporaryDirectory() as td:
        test_html = os.path.join(td, "test_fee.html")
        user_data_dir = os.path.join(td, "profile")
        with open(test_html, "w", encoding="utf-8") as f:
            f.write(patched_html)
        file_url = "file:///" + test_html.replace("\\", "/")
        cmd = [
            browser_exe,
            "--headless=new",
            "--disable-gpu",
            "--no-first-run",
            f"--user-data-dir={user_data_dir}",
            "--virtual-time-budget=2000",
            "--dump-dom",
            file_url,
        ]
        proc = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=30)
        dom = proc.stdout
        m = re.search(r'<pre id="__verify_out__">([\s\S]*?)</pre>', dom)
        assert m, f"Headless browser did not emit __verify_out__. rc={proc.returncode}, stderr={proc.stderr[:400]}"
        import html as html_mod
        payload = json.loads(html_mod.unescape(m.group(1)))
        assert payload.get("ok"), f"Browser self-test failed: {payload}"
        return payload


def main():
    assert os.path.exists(TARGET_HTML), f"Missing assembled HTML: {TARGET_HTML}"
    with open(TARGET_HTML, "r", encoding="utf-8") as f:
        html_text = f.read()

    # 1. Script tags & syntax balance
    open_cnt = len(re.findall(r"<script>", html_text))
    close_cnt = len(re.findall(r"</script>", html_text))
    assert open_cnt == 1 and close_cnt == 1, f"Script tags mismatch: open={open_cnt}, close={close_cnt}"
    js_code = extract_script(html_text)
    print("[PASS] 1. Exactly 1 <script>...</script> block present.")

    # 2. Inline handler existence check
    handlers = set(re.findall(r'(?:onclick|onchange|oninput)="([a-zA-Z0-9_]+)\(', html_text))
    defined_fns = set(re.findall(r'function\s+([a-zA-Z0-9_]+)\s*\(', js_code))
    missing_fns = sorted(h for h in handlers if h not in defined_fns)
    assert not missing_fns, f"Missing inline handlers in JS: {missing_fns}"
    print(f"[PASS] 2. All {len(handlers)} inline HTML event handlers exist in JS.")

    # 3. ECUC 36 keys in HTML
    html_cfg_keys = set(re.findall(r'data-cfg-key="([A-Za-z0-9_]+)"', html_text))
    html_cfg_ids = set(re.findall(r'id="cfg_([A-Za-z0-9_]+)"', html_text))
    assert html_cfg_keys == html_cfg_ids, f"Mismatch HTML data-cfg-key vs id=cfg_*: {html_cfg_keys ^ html_cfg_ids}"
    assert len(html_cfg_keys) == 36, f"Expected 36 ECUC fields, got {len(html_cfg_keys)}"

    # 4. Runtime execution via real Browser V8 DOM (preferred) or Node fallback
    js_assert = build_shared_js_assertions(html_cfg_keys)
    browser_exe = find_browser_exe()
    node_bin = shutil.which("node")

    if browser_exe:
        print(f"[INFO] Executing full DOM + V8 runtime suite via {os.path.basename(browser_exe)}...")
        summary = run_via_browser(html_text, browser_exe, js_assert)
    elif node_bin:
        print("[INFO] Executing runtime suite via Node.js vm...")
        with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as tf:
            tf.write(js_code + f"\nconst _res = {js_assert};\nprocess.stdout.write(JSON.stringify(_res));\n")
            tmp_js = tf.name
        try:
            subprocess.run([node_bin, "--check", tmp_js], check=True)
            proc = subprocess.run([node_bin, tmp_js], check=True, capture_output=True, text=True, encoding="utf-8")
            summary = json.loads(proc.stdout)
        finally:
            os.remove(tmp_js)
    else:
        raise RuntimeError("Neither Chrome/Edge nor Node.js found to execute JS verification!")

    print(
        f"[PASS] 3. Runtime & ECUC parity verified: {summary['cfgKeys']} keys, "
        f"{summary['scenarios']} scenarios, {summary['whatIfs']} What-Ifs, "
        f"{summary['modules']} modules, {summary['abbreviations']} abbrs, "
        f"Timing SLOW={summary['slowLatency']}ms vs FAST={summary['fastLatency']}ms."
    )

    # 5. SVG XML + Bounds check
    for item in summary["svgs"]:
        check_svg_xml_and_bounds(item["svg"], item["key"])
    print(f"[PASS] 4. All {len(summary['svgs'])} Handbook SVGs passed XML & bounds checks.")

    # 6. Static DOM ID existence check
    js_ids = set(re.findall(r"\bgetEl\(\s*'([A-Za-z0-9_]+)'\s*\)", js_code))
    html_ids = set(re.findall(r'id="([A-Za-z0-9_]+)"', html_text))
    missing_ids = sorted(i for i in js_ids if i not in html_ids)
    assert not missing_ids, f"JS references non-existent static DOM IDs: {missing_ids}"
    print(f"[PASS] 5. All {len(js_ids)} literal DOM IDs referenced in JS exist in HTML.")

    print(f"\nALL VERIFICATION CHECKS PASSED ({TARGET_HTML}).")


if __name__ == "__main__":
    main()
