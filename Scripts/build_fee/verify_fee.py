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

  // Check default reload state is S0 (empty Fee sandbox) before switching scenarios
  if (typeof document !== 'undefined') {{
    const initSel = getEl('scenSelect');
    if (!initSel || initSel.value !== 'S0') {{
      throw new Error('Default scenario on reload must be S0, got ' + (initSel ? initSel.value : 'missing'));
    }}
    if (!getEl('btnNextStep').disabled || !getEl('btnAutoPlay').disabled) {{
      throw new Error('Expected Next/AutoPlay disabled on S0 empty sandbox');
    }}
    const scenCard = getEl('scenSummaryCard');
    if (!scenCard || !scenCard.classList.contains('hidden')) {{
      throw new Error('Expected #scenSummaryCard to be hidden when S0 is active');
    }}
  }}
  if (SCENARIOS[uiState.currentScenarioIdx].id !== 'S0' || getBankStats(0).usedBytes !== 0 || getBankStats(1).usedBytes !== 0 || Object.keys(simState.lut).length !== 0 || apiFeeGetStatus() !== 'MEMIF_UNINIT' || ecucConfig.FeeInitialized !== false) {{
    throw new Error('Initial reload state S0 must have empty Bank0/Bank1, empty LUT, FeeInitialized=false, and MEMIF_UNINIT');
  }}

  if (SCENARIOS.length !== 13) throw new Error('Expected 13 scenarios (S0 + S1..S12), got ' + SCENARIOS.length);
  let whatIfCount = 0;
  for (let si = 0; si < SCENARIOS.length; si++) {{
    const sc = SCENARIOS[si];
    if (!sc.setupExplain || sc.setupExplain.trim().length < 20) {{
      throw new Error('Scenario ' + sc.id + ' missing detailed setupExplain');
    }}
    if (typeof document !== 'undefined') {{
      const opt = document.querySelector('#scenSelect option[value="' + sc.id + '"]');
      if (!opt) throw new Error('Missing dropdown option for ' + sc.id);
      if (opt.textContent.trim() !== sc.title.trim()) {{
        throw new Error('Dropdown vs SCENARIOS title mismatch for ' + sc.id + ': "' + opt.textContent.trim() + '" != "' + sc.title.trim() + '"');
      }}
    }}
    loadScenarioByIndex(si, 0);
    if (uiState.currentStepIdx !== 0) {{
      throw new Error('Scenario ' + sc.id + ' did not start at Step 0');
    }}
    for (let st = 1; st <= sc.steps.length; st++) {{
      const stepDef = sc.steps[st - 1];
      if (!stepDef.desc || stepDef.desc.trim().length < 30 || !stepDef.apiFlow || !stepDef.bitImpact || !stepDef.memoryImpact || !stepDef.swsRef) {{
        throw new Error('Scenario ' + sc.id + ' step ' + st + ' missing detailed explanation metadata');
      }}
      nextScenarioStep();
      if (uiState.currentStepIdx !== st) {{
        throw new Error('Expected step ' + st + ', got ' + uiState.currentStepIdx);
      }}
      if (simState.stepExplain !== stepDef.desc) {{
        throw new Error('Scenario ' + sc.id + ' step ' + st + ' did not sync stepExplain');
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
  if (whatIfCount !== 39) throw new Error('Expected 39 what-ifs, got ' + whatIfCount);

  loadScenarioByIndex(2, 0); // S2 at Step 0 (Clean Setup, 0 writes)
  if (simState.stats.totalWrites !== 0) {{
    throw new Error('S2 Step 0 should have 0 writes before Step 1, got ' + simState.stats.totalWrites);
  }}
  const g14 = calcSlotGeometry(14, {{ FeeVirtualPageSize: '8', FeeBlockHeaderSize: 8 }});
  if (g14.totalBytes !== 24 || g14.paddingBytes !== 2) {{
    throw new Error('Geometry 14B/VP=8 failed: ' + JSON.stringify(g14));
  }}

  loadScenarioByIndex(9, 0); // S9 Step 0 -> setup only
  goToScenarioStep(2); // S9 Step 2 -> SLOW 32B completed
  const slowLatency = simState.stats.lastLatencyMs;
  goToScenarioStep(4); // S9 Step 4 -> FAST 32B completed
  const fastLatency = simState.stats.lastLatencyMs;
  if (slowLatency !== 20 || fastLatency !== 5) {{
    throw new Error('Timing mismatch SLOW=' + slowLatency + 'ms, FAST=' + fastLatency + 'ms');
  }}
  if (typeof document !== 'undefined') {{
    switchInspTab(0);
    if (!document.querySelector('#inspBody .step-explain-card') || !document.querySelector('#inspBody .step-roadmap')) {{
      throw new Error('Inspector Tab 0 missing step-explain-card or step-roadmap');
    }}
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
  if (!arxml.includes('<AUTOSAR') || !arxml.includes('VARIANT-PRE-COMPILE') || !arxml.includes('FeeMinimumReadPageSize') || !cfgh.includes('#define FEE_VIRTUAL_PAGE_SIZE') || !lcfg.includes('Fee_BlockConfig')) {{
    throw new Error('Export output check failed (ARXML VARIANT-PRE-COMPILE / Header / Lcfg)');
  }}

  // R25-11 Behavioral Verification Suite
  loadScenarioByIndex(1, 0); // S1 UNINIT
  if (typeof document !== 'undefined' && getEl('scenSummaryCard').classList.contains('hidden')) {{
    throw new Error('Expected #scenSummaryCard to be visible on S1');
  }}
  const preDet = simState.stats.detCount;
  if (apiFeeGetStatus() !== 'MEMIF_UNINIT' || simState.stats.detCount !== preDet) {{
    throw new Error('Fee_GetStatus on UNINIT must return MEMIF_UNINIT without DET');
  }}
  apiFeeInit('Verify Init R25-11');
  if (apiFeeGetStatus() !== 'MEMIF_BUSY_INTERNAL') {{
    throw new Error('SWS_Fee_00120: Fee_Init must transition to MEMIF_BUSY_INTERNAL, got ' + apiFeeGetStatus());
  }}
  ecucConfig.FeeDevErrorDetect = false;
  apiFeeCancel();
  if (!simState.lastErrorDet || simState.lastErrorDet.name !== 'FEE_E_INVALID_CANCEL') {{
    throw new Error('SWS_Fee_00184/91002: Fee_Cancel during BUSY_INTERNAL must always raise Runtime Error FEE_E_INVALID_CANCEL');
  }}
  ecucConfig.FeeDevErrorDetect = true;
  if (apiFeeRead('0x0010') !== 'E_OK') {{
    throw new Error('SWS_Fee_00172: Fee_Read must be accepted during MEMIF_BUSY_INTERNAL');
  }}
  stepMainFunctionTick();
  if (apiFeeGetStatus() !== 'MEMIF_IDLE' || apiFeeGetJobResult() !== 'MEMIF_JOB_OK') {{
    throw new Error('SWS_Fee_00197: Expected MEMIF_IDLE / MEMIF_JOB_OK after tick, got ' + apiFeeGetStatus() + '/' + apiFeeGetJobResult());
  }}

  // Reject Immediate Write during MEMIF_BUSY [SWS_Fee_00144 / SWS_Fee_00009 Note]
  apiFeeWrite('0x0020', '0x11 0x22 [Busy Guard]');
  if (apiFeeWrite('0x0030', '0xFF [Must Fail BUSY]', {{ immediate: true }}) !== 'E_NOT_OK' || simState.lastErrorDet.name !== 'FEE_E_BUSY') {{
    throw new Error('SWS_Fee_00144: Immediate Write must be rejected with FEE_E_BUSY when MEMIF_BUSY');
  }}
  apiFeeCancel();
  if (apiFeeGetJobResult() !== 'MEMIF_JOB_CANCELED') {{
    throw new Error('SWS_Fee_00157: Cancel should set MEMIF_JOB_CANCELED');
  }}

  // Background GC must NOT overwrite JobResult [SWS_Fee_00155]
  startGarbageCollectionInternal(null);
  if (apiFeeGetStatus() !== 'MEMIF_BUSY_INTERNAL') {{
    throw new Error('SWS_Fee_00074: Background GC must report MEMIF_BUSY_INTERNAL');
  }}
  // Preempt Background GC with Immediate Write [SWS_Fee_00009]
  if (apiFeeWrite('0x0030', '0xFF [Preempt BUSY_INTERNAL]', {{ immediate: true }}) !== 'E_OK') {{
    throw new Error('SWS_Fee_00009: Immediate Write should preempt MEMIF_BUSY_INTERNAL background GC');
  }}
  stepMainFunctionTick();
  while (simState.activeJob || (simState.gcState && simState.gcState.active)) {{
    stepMainFunctionTick();
  }}
  startGarbageCollectionInternal(null);
  // Force preserve previous jobResult across background GC after cancel test
  simState.jobResult = 'MEMIF_JOB_CANCELED';
  while (simState.gcState && simState.gcState.active) {{
    stepMainFunctionTick();
  }}
  if (apiFeeGetJobResult() !== 'MEMIF_JOB_CANCELED') {{
    throw new Error('SWS_Fee_00155: Background GC must preserve prior JobResult, got ' + apiFeeGetJobResult());
  }}

  // EraseImmediateBlock rejects non-immediate [00068] and runs async for immediate [00094]
  if (apiFeeEraseImmediateBlock('0x0010') !== 'E_NOT_OK' || simState.lastErrorDet.name !== 'FEE_E_INVALID_BLOCK_NO') {{
    throw new Error('SWS_Fee_00068: EraseImmediateBlock must reject non-immediate block');
  }}
  if (apiFeeEraseImmediateBlock('0x0030') !== 'E_OK' || apiFeeGetStatus() !== 'MEMIF_BUSY' || apiFeeGetJobResult() !== 'MEMIF_JOB_PENDING') {{
    throw new Error('SWS_Fee_00094: EraseImmediateBlock must start async MEMIF_BUSY / MEMIF_JOB_PENDING');
  }}
  stepMainFunctionTick();
  if (apiFeeGetStatus() !== 'MEMIF_IDLE' || apiFeeGetJobResult() !== 'MEMIF_JOB_OK') {{
    throw new Error('SWS_Fee_00094: EraseImmediateBlock completion expected MEMIF_IDLE / MEMIF_JOB_OK');
  }}

  // Foreground GC (S7 Step 1) must stay MEMIF_BUSY [SWS_Fee_00025 / 00129]
  loadScenarioByIndex(7, 1);
  if (apiFeeGetStatus() !== 'MEMIF_BUSY' || apiFeeGetJobResult() !== 'MEMIF_JOB_PENDING') {{
    throw new Error('SWS_Fee_00025: S7 Step 1 Foreground GC expected MEMIF_BUSY / MEMIF_JOB_PENDING, got ' + apiFeeGetStatus());
  }}

  // Multi-Bank (2..4) & Removal Guard Verification
  loadScenarioByIndex(0, 0); // S0 starts at min/default 2 banks
  if (simState.banks.length !== 2) throw new Error('Expected default 2 banks, got ' + simState.banks.length);
  if (removeFlashBank() !== false || simState.banks.length !== 2) {{
    throw new Error('Must forbid removing below minimum 2 banks');
  }}
  if (!addFlashBank() || simState.banks.length !== 3) throw new Error('Failed adding Bank 2');
  if (!addFlashBank() || simState.banks.length !== 4) throw new Error('Failed adding Bank 3');
  if (addFlashBank() !== false || simState.banks.length !== 4) {{
    throw new Error('Must forbid exceeding maximum 4 banks');
  }}
  if (!generateFeeCfgH().includes('#define FEE_NUM_FLASH_BANKS             (4U)')) {{
    throw new Error('Fee_Cfg.h must reflect 4 banks when 4 banks configured');
  }}
  // Forbid removing active bank
  if (removeFlashBank(simState.activeBank) !== false || simState.banks.length !== 4) {{
    throw new Error('Must forbid removing currently active bank');
  }}
  // Forbid removing while GC is triggered/active (test with 3 banks on S7)
  loadScenarioByIndex(7, 0);
  addFlashBank(); // Now 3 banks before triggering GC
  apiFeeWrite('0x0020', '0x99 [Trigger GC with 3 banks]');
  if (!simState.gcState.active) throw new Error('Expected GC triggered on S7');
  if (removeFlashBank() !== false || removeFlashBank(2) !== false) {{
    throw new Error('Must forbid removing any bank while GC is active/triggered');
  }}
  if (typeof document !== 'undefined' && getEl('btnRemoveBank') && !getEl('btnRemoveBank').disabled) {{
    throw new Error('Expected btnRemoveBank UI button disabled while GC active');
  }}
  stepCompleteAsyncJob();
  if (simState.activeBank !== 1) throw new Error('GC #1 expected activeBank=1, got ' + simState.activeBank);
  // Test round-robin + wear-leveling GC #2 picks Bank 2 (lower eraseCount than Bank 0)
  startGarbageCollectionInternal(null);
  while (simState.gcState && simState.gcState.active) stepMainFunctionTick();
  if (simState.activeBank !== 2) throw new Error('GC #2 expected activeBank=2 on 3-bank rotation, got ' + simState.activeBank);
  // Active bank is now Bank 2: cannot remove Bank 2, CAN remove inactive Bank 0, keeping data & LUT on reindexed Bank 1!
  const lutCountBeforeRem = Object.keys(simState.lut).length;
  if (removeFlashBank(2) !== false) throw new Error('Must forbid removing active Bank 2');
  if (!removeFlashBank(0) || simState.banks.length !== 2 || simState.activeBank !== 1) {{
    throw new Error('Expected removing inactive Bank 0 to keep 2 banks with reindexed activeBank=1');
  }}
  if (Object.keys(simState.lut).length !== lutCountBeforeRem) {{
    throw new Error('RAM LUT entries lost after removing inactive Bank 0');
  }}

  const modKeys = Object.keys(MODULES_INFO);
  if (modKeys.length !== 10) throw new Error('Expected 10 MODULES_INFO, got ' + modKeys.length);
  if (ABBREVIATIONS.length < 56) throw new Error('Expected >=56 ABBREVIATIONS, got ' + ABBREVIATIONS.length);
  if (HANDBOOK_DATA.length !== 7) throw new Error('Expected 7 Handbook tabs, got ' + HANDBOOK_DATA.length);
  let subTotal = 0;
  let swsBarCount = 0;
  const svgs = [];
  HANDBOOK_DATA.forEach((t, ti) => {{
    if (t.subs.length !== 4) throw new Error('Tab ' + ti + ' expected 4 subs');
    t.subs.forEach((s, si) => {{
      subTotal += 1;
      if (!s.contentHtml.includes('class="hb-sws-bar"') || !s.contentHtml.includes('class="hb-sws-chip')) {{
        throw new Error('Missing SWS_ID strip in Handbook tab ' + ti + '-' + si);
      }}
      swsBarCount += 1;
      const m = s.contentHtml.match(/<svg[\\s\\S]*?<\\/svg>/);
      if (!m) throw new Error('Missing SVG in Handbook tab ' + ti + '-' + si);
      svgs.push({{ key: ti + '-' + si, svg: m[0] }});
    }});
  }});

  if (typeof switchMainView === 'function' && typeof document !== 'undefined') {{
    switchMainView('hb');
    switchHbTab1(0);
    switchHbTab2(0);
    if (!document.querySelector('#hbContentArea .hb-sws-bar .hb-sws-chip')) {{
      throw new Error('Expected rendered .hb-sws-bar .hb-sws-chip in Handbook DOM');
    }}
    switchHbTab1(6);
    for (let sbi = 0; sbi < 4; sbi++) {{
      switchHbTab2(sbi);
      if (!document.querySelector('#hbContentArea .hb-sws-bar') || !document.querySelector('#hbContentArea svg')) {{
        throw new Error('Expected Sector/Page/Bank/Virtual sub-tab 6-' + sbi + ' to render SWS bar and SVG');
      }}
    }}
    switchHbTab1(7);
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
    swsBars: swsBarCount,
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

    assert summary["swsBars"] == 28, f"Expected 28 SWS_ID strips, got {summary['swsBars']}"
    print(
        f"[PASS] 3. Runtime, R25-11 SM & ECUC parity verified: {summary['cfgKeys']} keys, "
        f"{summary['scenarios']} scenarios, {summary['whatIfs']} What-Ifs, "
        f"{summary['modules']} modules, {summary['abbreviations']} abbrs, "
        f"{summary['swsBars']}/28 SWS_ID strips, "
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
