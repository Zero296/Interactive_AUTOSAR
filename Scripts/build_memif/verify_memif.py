# -*- coding: utf-8 -*-
"""Comprehensive verification suite for Simulation/04_ECU_Abstraction/AUTOSAR_MemIf.html."""
import json
import re
import shutil
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REPO_ROOT = ROOT.parent.parent
HTML_PATH = REPO_ROOT / "Simulation" / "04_ECU_Abstraction" / "AUTOSAR_MemIf.html"

BROWSER_CANDIDATES = [
    Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe"),
    Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"),
]


def extract_script(html_text):
    m = re.search(r"<script>([\s\S]*)</script>\s*</body>\s*</html>\s*$", html_text)
    if not m:
        raise AssertionError("Could not extract inline <script> from AUTOSAR_MemIf.html")
    return m.group(1)


def check_offline_self_contained(html_text):
    ext_links = re.findall(r'<(?:script|link|img)[^>]+\b(?:src|href)\s*=\s*["\']https?://', html_text, flags=re.I)
    if ext_links:
        raise AssertionError(f"External URLs found (must be 100% offline): {ext_links}")


def check_dom_and_handlers(html_text, js_code):
    ids_in_html = set(re.findall(r'\bid="([^"]+)"', html_text))

    required_ids = {
        "btnViewSim", "btnViewHb", "btnTheme", "scenSelect", "btnPrevStep", "stepIndicator",
        "btnNextStep", "btnAutoPlay", "clockVal", "btnAutoClock", "hdrBadgeBroadcast",
        "hdrBadgeRoute", "hdrBadgeFee", "hdrBadgeEa", "qaDevSelect", "qaBlkSelect",
        "qaTxtMode", "qaTxtFaultKind", "qaFaultKind", "scenIdBadge", "scenSummaryBox",
        "whatIfContainer", "cfgValidationBox", "btnToggleRoutingMode", "routingDispatcherBox",
        "deviceMatrixBox", "physLayoutBox", "regATitle", "regAHex", "regABits",
        "regBTitle", "regBHex", "regBBits", "memifPanel2Badge", "timersGrid",
        "smStatusLbl", "statusSmDiagram", "smJobResultLbl", "jobResultSmDiagram",
        "memifArchSvg", "inspBody", "hbNav2", "hbAbbrFilterBox", "abbrSearchInput",
        "abbrCountBadge", "hbContentArea", "exportModal", "exportCodeArea", "cfgTooltipPopup"
    }
    for i in range(6):
        required_ids.add(f"cfgTabBtn{i}")
        required_ids.add(f"cfgPane{i}")
    for i in range(4):
        required_ids.add(f"inspTabBtn{i}")
        required_ids.add(f"expTab{i}")
    for i in range(7):
        required_ids.add(f"hbTab1_{i}")
    for c in ["ALL", "CORE", "API", "FEE", "EA_NVM"]:
        required_ids.add(f"catPill_{c}")

    arrows = [
        "arr_swc_rte", "arr_rte_nvm", "arr_ecum_nvm", "arr_nvm_memif",
        "arr_memif_polling", "arr_memif_det", "arr_memif_fee", "arr_memif_ea",
        "arr_fee_nvm_cbk", "arr_ea_nvm_cbk", "arr_fee_fls", "arr_ea_eep", "arr_drv_dem"
    ]
    nodes = [
        "node_MOD_SWC", "node_MOD_ECUM", "node_MOD_RTE", "node_MOD_NVM", "node_MOD_DEM",
        "node_MOD_MEMIF", "node_MOD_DET", "node_MOD_FEE", "node_MOD_EA", "node_MOD_FLS", "node_MOD_EEP"
    ]
    svg_subs = [
        "svgSub_MOD_SWC", "svgSub_MOD_ECUM", "svgSub_MOD_RTE", "svgSub_MOD_NVM",
        "svgSub_MOD_DEM", "svgSub_MOD_MEMIF1", "svgSub_MOD_MEMIF2", "svgSub_MOD_DET",
        "svgSub_MOD_FEE", "svgSub_MOD_EA", "svgTitle_MOD_FLS", "svgSub_MOD_FLS",
        "svgTitle_MOD_EEP", "svgSub_MOD_EEP"
    ]
    required_ids.update(arrows + nodes + svg_subs)

    missing_ids = sorted(required_ids - ids_in_html)
    if missing_ids:
        raise AssertionError(f"Missing DOM IDs in HTML: {missing_ids}")

    handlers = set(re.findall(r'\bon(?:click|change|input)="([a-zA-Z0-9_]+)\(', html_text))
    defined_fns = set(re.findall(r'function\s+([a-zA-Z0-9_]+)\s*\(', js_code))
    missing_fns = sorted(handlers - defined_fns)
    if missing_fns:
        raise AssertionError(f"Inline HTML event handlers not defined in JS: {missing_fns}")

    return len(required_ids), len(handlers)


def check_ecuc_36_parity(html_text, js_code):
    data_keys = re.findall(r'class="cfg-row"\s+data-cfg-key="([^"]+)"', html_text)
    cfg_input_keys = re.findall(r'\bid="cfg_([^"]+)"', html_text)

    m_def = re.search(r"const defaultConfig = \{([\s\S]*?)\n\};", js_code)
    if not m_def:
        raise AssertionError("defaultConfig block not found")
    def_keys = re.findall(r"^\s*([A-Za-z0-9_]+)\s*:", m_def.group(1), flags=re.M)

    m_tt = re.search(r"const configTooltipData = \{([\s\S]*?)\n\};", js_code)
    if not m_tt:
        raise AssertionError("configTooltipData block not found")
    tt_keys = re.findall(r"^  ([A-Za-z0-9_]+)\s*:\s*\{", m_tt.group(1), flags=re.M)

    assert len(data_keys) == 36, f"Expected 36 data-cfg-key rows, got {len(data_keys)}"
    assert len(cfg_input_keys) == 36, f"Expected 36 cfg_* inputs, got {len(cfg_input_keys)}"
    assert len(def_keys) == 36, f"Expected 36 defaultConfig keys, got {len(def_keys)}"
    assert len(tt_keys) == 36, f"Expected 36 configTooltipData keys, got {len(tt_keys)}"

    if not (set(data_keys) == set(cfg_input_keys) == set(def_keys) == set(tt_keys)):
        raise AssertionError(
            "ECUC key mismatch!\n"
            f"data-default diff: {set(data_keys) ^ set(def_keys)}\n"
            f"input-tooltip diff: {set(cfg_input_keys) ^ set(tt_keys)}"
        )
    return len(def_keys)


def check_handbook_svgs():
    sys.path.insert(0, str(ROOT))
    from hb_diagrams_memif import DIAGRAMS

    checked = 0
    for name, svg_str in DIAGRAMS.items():
        checked += 1
        root = ET.fromstring(svg_str)
        vb = root.attrib.get("viewBox", "0 0 820 300").split()
        vb_w, vb_h = float(vb[2]), float(vb[3])

        rects = []
        texts = []
        for elem in root.iter():
            tag = elem.tag.split("}")[-1]
            if tag == "rect" and elem.attrib.get("x") is not None:
                x = float(elem.attrib["x"])
                y = float(elem.attrib["y"])
                w = float(elem.attrib["width"])
                h = float(elem.attrib["height"])
                if not (x == 0 and y == 0 and w == vb_w and h == vb_h):
                    rects.append((x, y, w, h, elem.attrib.get("rx", "")))
                    if x < 0 or y < 0 or x + w > vb_w + 0.1 or y + h > vb_h + 0.1:
                        raise AssertionError(f"SVG '{name}': rect out of viewBox {(x, y, w, h)} vs {(vb_w, vb_h)}")
            elif tag == "text":
                tx = float(elem.attrib["x"])
                ty = float(elem.attrib["y"])
                fs = float(elem.attrib.get("font-size", "11"))
                txt = (elem.text or "").strip()
                texts.append((tx, ty, fs, txt))

        for i in range(len(rects)):
            ax, ay, aw, ah, _ = rects[i]
            for j in range(i + 1, len(rects)):
                bx, by, bw, bh, _ = rects[j]
                ix = max(0.0, min(ax + aw, bx + bw) - max(ax, bx))
                iy = max(0.0, min(ay + ah, by + bh) - max(ay, by))
                if ix > 1.0 and iy > 1.0:
                    raise AssertionError(f"SVG '{name}': overlapping rects {rects[i]} vs {rects[j]}")

        for tx, ty, fs, txt in texts:
            est_w = len(txt) * fs * 0.54
            enclosing = [r for r in rects if r[0] <= tx <= r[0] + r[2] and r[1] <= ty <= r[1] + r[3]]
            if enclosing:
                rx, _, rw, _, _ = enclosing[-1]
                if est_w > rw - 4:
                    raise AssertionError(f"SVG '{name}': text '{txt}' (est {est_w:.1f}px) overflows box width {rw}px")

    return checked


def run_headless_browser_smoke(html_text):
    browser_exe = next((p for p in BROWSER_CANDIDATES if p.exists()), None)
    if browser_exe is None:
        raise AssertionError("Neither Chrome nor Edge found for headless V8/DOM smoke test.")

    smoke_hook = r"""
<script>
(function(){
  const runtimeErrors = [];
  window.addEventListener("error", function(e) {
    runtimeErrors.push("window.error: " + (e.message || e.error));
  });
  window.addEventListener("unhandledrejection", function(e) {
    runtimeErrors.push("unhandledrejection: " + e.reason);
  });

  window.addEventListener("DOMContentLoaded", function() {
    setTimeout(function() {
      const out = { ok: false, errors: runtimeErrors };
      try {
        if (!Array.isArray(SCENARIOS) || SCENARIOS.length !== 12) {
          throw new Error("Expected 12 SCENARIOS, got " + (SCENARIOS && SCENARIOS.length));
        }

        // Check initial DOM rendered cleanly
        if (!document.getElementById("regABits").innerHTML.includes("FCT_PTR")) {
          throw new Error("regABits did not render");
        }
        if (!document.getElementById("inspBody").innerHTML.includes("Diễn Giải Bước Hiện Tại")) {
          throw new Error("inspBody initial tab did not render");
        }

        // Execute every step forward/back + 3 What-Ifs across S1..S12
        let stepsExecuted = 0;
        let whatIfsExecuted = 0;
        for (const sc of SCENARIOS) {
          loadScenario(sc.id);
          for (let i = 0; i < sc.steps.length; i++) {
            nextScenarioStep();
            stepsExecuted++;
          }
          if (uiState.currentStepIdx !== sc.steps.length) {
            throw new Error("Step forward mismatch on " + sc.id);
          }
          if (sc.steps.length > 0) {
            prevScenarioStep();
            if (uiState.currentStepIdx !== sc.steps.length - 1) {
              throw new Error("Step backward mismatch on " + sc.id);
            }
          }
          for (let w = 0; w < (sc.whatIfs || []).length; w++) {
            runWhatIf(w);
            whatIfsExecuted++;
          }
        }
        if (whatIfsExecuted !== 36) throw new Error("Expected 36 What-Ifs, ran " + whatIfsExecuted);

        // Broadcast priority rules: UNINIT > BUSY > BUSY_INTERNAL > IDLE
        loadScenario("S1");
        api_ResetMemoryStackToIdle();
        if (api_MemIf_GetStatus(255) !== "MEMIF_IDLE") throw new Error("Expected IDLE");
        api_TriggerFeeGarbageCollection();
        if (api_MemIf_GetStatus(255) !== "MEMIF_BUSY_INTERNAL") throw new Error("Expected BUSY_INTERNAL");
        api_MemIf_Write(1, "0x0010", "00 11 22 33", false);
        if (api_MemIf_GetStatus(255) !== "MEMIF_BUSY") throw new Error("Expected BUSY > BUSY_INTERNAL");
        ecucConfig.EaDev1Initialized = false;
        syncInitFlagsToDevices();
        if (api_MemIf_GetStatus(255) !== "MEMIF_UNINIT") throw new Error("Expected UNINIT > BUSY");

        // Broadcast forbidden in GetJobResult -> must log DET MEMIF_E_PARAM_DEVICE
        api_ResetMemoryStackToIdle();
        ecucConfig.MemIfNumberOfDevices = "2";
        ecucConfig.MemIfDevErrorDetect = true;
        api_MemIf_GetJobResult(255);
        if (!simState.detFlagActive || !simState.detErrors.some((e) => e.errorId.includes("MEMIF_E_PARAM_DEVICE"))) {
          throw new Error("Expected DET error when passing 0xFF to MemIf_GetJobResult");
        }

        // Macro 1-Dev vs FctPtr 2-Dev export generators
        ecucConfig.MemIfNumberOfDevices = "1";
        if (!generateMemIfCfgH().includes("#define MemIf_Read")) {
          throw new Error("Macro MemIf_Cfg.h missing #define MemIf_Read");
        }
        ecucConfig.MemIfNumberOfDevices = "2";
        if (!generateMemIfCfgC().includes("MemIf_ReadFctPtr[MEMIF_NUMBER_OF_DEVICES]")) {
          throw new Error("FctPtr MemIf_Cfg.c missing table");
        }
        if (!generateMemIfArxml().includes("<AUTOSAR")) {
          throw new Error("ARXML generation invalid");
        }

        // Quick Actions + Fault Kinds + Tick buttons + Config Tabs + Register bit toggles
        document.getElementById("qaDevSelect").value = "0";
        document.getElementById("qaBlkSelect").value = "0x0004";
        onQaTargetChanged("blk");
        qaMemIfRead();
        stepFeeFlsTick();
        stepNvMTick();
        qaMemIfWrite();
        qaMemIfEraseImmediate();
        qaMemIfInvalidate();
        qaMemIfCancel();
        qaMemIfBroadcastStatus();
        qaToggleMemIfMode();
        stepEaEepTick();
        for (const fk of ["FEE_GC", "INCONSISTENT", "HW_FAIL", "DET_DEV", "VER_INFO"]) {
          document.getElementById("qaFaultKind").value = fk;
          onFaultKindChange();
          qaInjectFaultOrGc();
        }
        for (const mask of [0x80, 0x40, 0x20, 0x10, 0x08, 0x04, 0x02, 0x01]) {
          toggleRegisterBit("A", mask);
          toggleRegisterBit("B", mask);
        }
        for (let ct = 0; ct < 6; ct++) switchCfgTab(ct);
        for (let it = 0; it < 4; it++) switchInspTab(it);
        selectModule("MOD_MEMIF");
        toggleTheme();
        toggleTheme();

        // Tooltip popup population test
        const firstRow = document.querySelector(".cfg-row[data-cfg-key]");
        showCfgTooltipForRow(firstRow);
        if (!document.getElementById("cfgTooltipPopup").classList.contains("show")) {
          throw new Error("Tooltip popup failed to open");
        }
        hideCfgTooltip();

        // Export modal
        openExportModal();
        for (let et = 0; et < 4; et++) switchExportTab(et);
        if (!document.getElementById("exportCodeArea").textContent.includes("MemIf")) {
          throw new Error("Export modal code area empty");
        }
        closeExportModal();

        // Handbook 6x4 + Real Browser SVG Geometry Check + Tab 7 Abbreviation search & filter
        if (ABBREVIATIONS.length < 52) throw new Error("Too few abbreviations: " + ABBREVIATIONS.length);
        switchMainView("hb");
        let hbSvgCount = 0;
        for (let t = 0; t < 6; t++) {
          switchHbTab1(t);
          for (let s = 0; s < 4; s++) {
            switchHbSubTab(s);
            const svgs = document.querySelectorAll("#hbContentArea svg.hb-svg");
            svgs.forEach((svg) => {
              hbSvgCount++;
              const rects = Array.from(svg.querySelectorAll("rect")).map((r) => ({
                x: parseFloat(r.getAttribute("x") || 0),
                y: parseFloat(r.getAttribute("y") || 0),
                w: parseFloat(r.getAttribute("width") || 0),
                h: parseFloat(r.getAttribute("height") || 0)
              }));
              svg.querySelectorAll("text").forEach((txtEl) => {
                const tx = parseFloat(txtEl.getAttribute("x") || 0);
                const ty = parseFloat(txtEl.getAttribute("y") || 0);
                const tw = txtEl.getComputedTextLength();
                const enclosing = rects.filter((r) => !(r.x === 0 && r.y === 0 && r.w >= 819) && tx >= r.x && tx <= r.x + r.w && ty >= r.y && ty <= r.y + r.h);
                if (enclosing.length) {
                  const box = enclosing[enclosing.length - 1];
                  if (tw > box.w - 4) {
                    throw new Error("Chrome SVG text overflow (" + Math.round(tw) + "px > " + box.w + "px): " + txtEl.textContent);
                  }
                }
              });
            });
          }
        }
        out.hbSvgRendered = hbSvgCount;
        switchHbTab1(6);
        document.getElementById("abbrSearchInput").value = "Broadcast";
        setAbbrCategory("CORE");
        filterAbbreviationTable();
        if (!document.getElementById("hbContentArea").innerHTML.includes("<mark>")) {
          throw new Error("Abbreviation search highlight missing <mark>");
        }

        // Return cleanly to SIM view and S1
        switchMainView("sim");
        loadScenario("S1");

        out.ok = runtimeErrors.length === 0;
        out.scenarios = SCENARIOS.length;
        out.stepsExecuted = stepsExecuted;
        out.whatIfsExecuted = whatIfsExecuted;
        out.abbreviations = ABBREVIATIONS.length;
      } catch (err) {
        runtimeErrors.push(String(err && err.stack ? err.stack : err));
        out.ok = false;
      }
      const pre = document.createElement("pre");
      pre.id = "smokeResult";
      pre.textContent = JSON.stringify(out);
      document.body.appendChild(pre);
    }, 60);
  });
})();
</script>
</body></html>
"""
    injected_html = re.sub(r"</body>\s*</html>\s*$", smoke_hook, html_text)
    temp_dir = Path(tempfile.mkdtemp(prefix="memif_smoke_"))
    try:
        test_html = temp_dir / "smoke.html"
        profile_dir = temp_dir / "profile"
        profile_dir.mkdir(exist_ok=True)
        test_html.write_text(injected_html, encoding="utf-8")

        cmd = [
            str(browser_exe),
            "--headless=new",
            "--disable-gpu",
            "--no-first-run",
            "--no-default-browser-check",
            f"--user-data-dir={profile_dir}",
            "--virtual-time-budget=2000",
            "--dump-dom",
            test_html.as_uri(),
        ]
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if res.returncode != 0:
            raise AssertionError(f"Headless browser exited with {res.returncode}:\n{res.stderr}")

        m = re.search(r'<pre id="smokeResult">([\s\S]*?)</pre>', res.stdout)
        if not m:
            raise AssertionError("Headless smoke script did not produce #smokeResult in dumped DOM.")
        import html as html_mod
        payload = json.loads(html_mod.unescape(m.group(1)))
        if not payload.get("ok"):
            raise AssertionError(f"Headless DOM runtime test failed: {payload}")
        return browser_exe.name, payload
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


def main():
    if not HTML_PATH.exists():
        raise FileNotFoundError(f"Assembled HTML missing: {HTML_PATH}")
    html_text = HTML_PATH.read_text(encoding="utf-8")
    js_code = extract_script(html_text)

    check_offline_self_contained(html_text)
    print("[PASS] Offline Self-Contained Check (zero external URLs)")

    n_ids, n_handlers = check_dom_and_handlers(html_text, js_code)
    print(f"[PASS] DOM ID & Inline Handler Integrity ({n_ids} IDs, {n_handlers} inline handlers)")

    n_ecuc = check_ecuc_36_parity(html_text, js_code)
    print(f"[PASS] 36 ECUC Config 1:1 Parity (data-cfg-key / cfg_* / defaultConfig / configTooltipData = {n_ecuc})")

    n_svgs = check_handbook_svgs()
    print(f"[PASS] Handbook Inline SVG XML & Geometry Check ({n_svgs} diagrams, 0 overlaps, 0 overflows)")

    browser_name, smoke_payload = run_headless_browser_smoke(html_text)
    print(f"[PASS] Headless {browser_name} V8/DOM Runtime Smoke Test: {json.dumps(smoke_payload)}")

    print("OVERALL RESULT: PASS")


if __name__ == "__main__":
    main()
