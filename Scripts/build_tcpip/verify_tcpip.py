# -*- coding: utf-8 -*-
"""5-stage verification suite for AUTOSAR_TcpIp.html including headless Chromium/Edge runtime & SVG geometry audit."""

import html as html_mod
import json
import os
import re
import subprocess
import sys
import xml.etree.ElementTree as ET
from html.parser import HTMLParser

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
HTML_PATH = os.path.join(ROOT_DIR, "Simulation", "03_Services", "AUTOSAR_TcpIp.html")
PART6_PATH = os.path.join(SCRIPT_DIR, "part6_handbook.js")
ARTIFACT_SCRATCH = r"C:\Users\Acer\.gemini\antigravity\brain\728c3c01-d20a-4797-82b6-190fd0d443c8\scratch"

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
    assert len(html_text) > 150_000, f"Output HTML unexpectedly small: {len(html_text)}"
    assert "<!DOCTYPE html>" in html_text and "</html>" in html_text
    cleaned = re.sub(r'xmlns="http://(?:www\.w3\.org/2000/svg|autosar\.org/schema/r4\.0)"', "", html_text)
    cleaned = re.sub(r"https?://autosar\.org/schema/r4\.0", "", cleaned)
    ext_refs = re.findall(r'(?:src|href)\s*=\s*["\']\s*(?:https?:)?//', cleaned, flags=re.I)
    assert not ext_refs, f"Found external asset references: {ext_refs}"
    css_urls = re.findall(r"@import\s+url\s*\(\s*['\"]?https?:", cleaned, flags=re.I)
    assert not css_urls, f"Found external CSS imports: {css_urls}"
    print(f"  PASS: 100% offline HTML verified ({len(html_text):,} bytes).")


def stage2_dom_and_handlers(html_text):
    print("[Stage 2] Checking DOM IDs, inline handlers & JS function declarations...")
    body_part = html_text.split("<script>", 1)[0]
    script_part = html_text.split("<script>", 1)[1].rsplit("</script>", 1)[0]

    parser = DomInspector()
    parser.feed(body_part)

    fn_defs = set(re.findall(r"function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(", script_part))
    missing_fns = sorted({fn for _, fn, _ in parser.handlers if fn not in fn_defs})
    assert not missing_fns, f"Missing JS functions referenced by HTML inline handlers: {missing_fns}"

    static_ids = set(re.findall(r'document\.getElementById\(\s*["\']([A-Za-z0-9_-]+)["\']\s*\)', script_part))
    missing_ids = sorted(static_ids - parser.ids)
    assert not missing_ids, f"JS calls getElementById for missing DOM IDs: {missing_ids}"
    print(f"  PASS: {len(parser.handlers)} inline handler calls & {len(static_ids)} getElementById targets verified.")
    return parser, script_part


def stage3_ecuc_parity(parser, script_part):
    print("[Stage 3] Checking 36 ECUC Config 4-way parity...")
    m_def = re.search(r"const\s+defaultConfig\s*=\s*\{(.*?)\n\};", script_part, flags=re.S)
    assert m_def, "Could not locate defaultConfig block"
    def_keys = re.findall(r"^\s{2}([A-Za-z0-9_]+)\s*:", m_def.group(1), flags=re.M)

    m_tt = re.search(r"const\s+configTooltipData\s*=\s*\{(.*?)\n\};", script_part, flags=re.S)
    assert m_tt, "Could not locate configTooltipData block"
    tt_keys = re.findall(r"^\s{2}([A-Za-z0-9_]+)\s*:\s*\{", m_tt.group(1), flags=re.M)

    set_attr = set(parser.cfg_keys)
    set_inp = set(parser.cfg_input_ids)
    set_def = set(def_keys)
    set_tt = set(tt_keys)

    assert len(set_attr) == 36, f"Expected 36 data-cfg-key attributes, got {len(set_attr)}"
    assert set_attr == set_inp, f"Mismatch data-cfg-key vs cfg_* inputs: {set_attr ^ set_inp}"
    assert set_attr == set_def, f"Mismatch data-cfg-key vs defaultConfig: {set_attr ^ set_def}"
    assert set_attr == set_tt, f"Mismatch data-cfg-key vs configTooltipData: {set_attr ^ set_tt}"
    print("  PASS: All 36 ECUC parameters synchronized 4-way (data-cfg-key, cfg_*, defaultConfig, configTooltipData).")


def stage4_handbook_svg_xml(html_text):
    print("[Stage 4] Checking Architecture SVG & Handbook SVGs XML + rect bounds...")
    m_arch = re.search(r'(<svg[^>]*id="tcpipArchSvg".*?</svg>)', html_text, flags=re.S)
    assert m_arch, "Could not locate #tcpipArchSvg in HTML"
    arch_svg = m_arch.group(1)
    ET.fromstring(arch_svg)

    with open(PART6_PATH, "r", encoding="utf-8") as f:
        p6 = f.read()
    m_tabs = re.search(r"const\s+HANDBOOK_TABS\s*=\s*(\[.*?\]);\s*\nconst\s+hbState", p6, flags=re.S)
    assert m_tabs, "Could not parse HANDBOOK_TABS JSON from part6_handbook.js"
    tabs = json.loads(m_tabs.group(1))
    assert len(tabs) == 6, f"Expected 6 main handbook tabs, got {len(tabs)}"
    total_subs = sum(len(t["subs"]) for t in tabs)
    assert total_subs == 24, f"Expected 24 subtopics, got {total_subs}"

    svg_count = 0
    for ti, tab in enumerate(tabs):
        for si, sub in enumerate(tab["subs"]):
            for svg_txt in re.findall(r"(<svg\b.*?</svg>)", sub["html"], flags=re.S):
                svg_count += 1
                root = ET.fromstring(svg_txt)
                vb = [float(v) for v in root.attrib["viewBox"].split()]
                vb_w, vb_h = vb[2], vb[3]
                for rect in root.iter("{http://www.w3.org/2000/svg}rect"):
                    rx = float(rect.attrib.get("x", 0))
                    ry = float(rect.attrib.get("y", 0))
                    rw = float(rect.attrib.get("width", 0))
                    rh = float(rect.attrib.get("height", 0))
                    assert rx >= 0 and ry >= 0 and rx + rw <= vb_w + 0.5 and ry + rh <= vb_h + 0.5, (
                        f"Rect out of viewBox bounds in T{ti}.S{si}: ({rx},{ry},{rw},{rh}) > ({vb_w},{vb_h})"
                    )
    print(f"  PASS: #tcpipArchSvg + {svg_count} inline Handbook SVGs across 24 subtopics are valid XML & within bounds.")


def find_browser():
    for p in CHROME_PATHS:
        if os.path.exists(p):
            return p
    return None


def stage5_headless_browser_test(html_text):
    print("[Stage 5] Running headless Chromium/Edge runtime, protocol semantics & SVG text-length checks...")
    browser = find_browser()
    assert browser, f"Chrome/Edge binary not found in {CHROME_PATHS}"

    test_harness = r"""
<script>
window.__testErrors = [];
window.addEventListener("error", function(e) {
  window.__testErrors.push("JS_ERROR: " + e.message + " @" + e.lineno);
});

window.addEventListener("DOMContentLoaded", function() {
  const report = { checks: [], errors: [], svgOverflows: [] };
  function assert(cond, msg) {
    if (!cond) report.errors.push("ASSERT_FAIL: " + msg);
    else report.checks.push(msg);
  }

  try {
    assert(SCENARIOS.length === 12, "12 scenarios S1..S12 loaded");
    assert(ABBREVIATIONS.length === 58, "58 glossary terms loaded");

    // 0. Init State (Step 0) checks on initial boot, select change, prev->0, and reset
    assert(uiState.stepIdx === 0 && document.getElementById("stepIndicator").textContent === "Bước 0 / 4", "Initial page boot stays at Step 0 (Init State)");
    assert(document.getElementById("btnPrevStep").disabled === true, "btnPrevStep disabled at Step 0");
    document.getElementById("scenSelect").value = "1";
    onScenarioSelectChange();
    assert(uiState.scenIdx === 1 && uiState.stepIdx === 0, "Selecting S2 starts cleanly at Step 0 (Init State)");
    nextScenarioStep();
    assert(uiState.stepIdx === 1 && document.getElementById("btnPrevStep").disabled === false, "Advancing to Step 1 enables btnPrevStep");
    prevScenarioStep();
    assert(uiState.stepIdx === 0 && document.getElementById("btnPrevStep").disabled === true, "prevScenarioStep rewinds back to Step 0 cleanly");
    nextScenarioStep();
    nextScenarioStep();
    resetCurrentScenario();
    assert(uiState.stepIdx === 0 && document.getElementById("btnPrevStep").disabled === true, "resetCurrentScenario resets back to Step 0");

    // 1. Step all 12 scenarios forward + rewind + reset + 36 what-ifs
    let whatIfTotal = 0;
    for (let i = 0; i < SCENARIOS.length; i++) {
      loadScenario(i, false);
      const sc = SCENARIOS[i];
      for (let s = 0; s < sc.steps.length; s++) {
        nextScenarioStep();
      }
      assert(uiState.stepIdx === sc.steps.length, sc.id + " stepped all " + sc.steps.length + " steps");
      if (sc.steps.length >= 2) {
        prevScenarioStep();
        assert(uiState.stepIdx === sc.steps.length - 1, sc.id + " prevScenarioStep rewinds snapshot cleanly");
      }
      assert(sc.whatIfs.length === 3, sc.id + " has 3 What-If buttons");
      sc.whatIfs.forEach(function(_, wIdx) {
        runScenarioWhatIf(wIdx);
        whatIfTotal++;
      });
    }
    assert(whatIfTotal === 36, "Executed all 36 What-If actions across S1..S12");

    // 2. TCP 3-Way Handshake & Close FIN vs RST (S4 & S6 semantics)
    loadScenario(3, false); // S4 setup
    api_TcpIp_SoAdGetSocket(0, "TCP");
    api_TcpIp_Bind(0, 0, 49152);
    api_TcpIp_TcpConnect(0, "192.168.10.100:13400");
    assert(sim.sockets[0].state === "SYN_SENT" && Boolean(sim.regB & 0x02), "TCP Connect moves CLOSED->SYN_SENT with SYN bit=1");
    api_TcpIp_RxIndication("TCP_SYN_ACK", { sockId: 0, skipTls: true });
    assert(sim.sockets[0].state === "ESTABLISHED" && Boolean(sim.regB & 0x10), "SYN+ACK moves SYN_SENT->ESTABLISHED");
    api_TcpIp_Close(0, false);
    assert(sim.sockets[0].state === "FIN_WAIT_1" && Boolean(sim.regB & 0x01), "Close(Abort=FALSE) enters FIN_WAIT_1 with FIN bit=1");
    api_TcpIp_RxIndication("TCP_FIN", { sockId: 0 });
    assert(sim.sockets[0].state === "TIME_WAIT", "Active Close enters TIME_WAIT upon FIN");
    for (let t = 0; t < 4; t++) api_TcpIp_MainFunction();
    assert(sim.sockets[0].state === "CLOSED", "TIME_WAIT expires cleanly to CLOSED");
    sim.sockets[0].state = "ESTABLISHED";
    api_TcpIp_Close(0, true);
    assert(sim.sockets[0].state === "CLOSED" && Boolean(sim.regB & 0x04), "Close(Abort=TRUE) sends RST (Bit 2=1) and closes immediately");

    // 3. Sliding Window & TcpIp_TcpReceived (S5 semantics)
    loadScenario(4, false); // S5 setup (ESTABLISHED, Win=4096)
    api_TcpIp_RxIndication("TCP_DATA", { sockId: 0, len: 2048 });
    api_TcpIp_RxIndication("TCP_DATA", { sockId: 0, len: 2048 });
    assert(sim.sockets[0].rxWindow === 0, "TCP Rx without TcpIp_TcpReceived hits ZeroWindow (0)");
    api_TcpIp_TcpReceived(0, 2048);
    assert(sim.sockets[0].rxWindow === 2048, "TcpIp_TcpReceived(2048) re-opens TCP Window to 2048B");

    // 4. ARP Cache Miss -> ArpPendingQueue -> ARP Reply Drain (S2 semantics)
    loadScenario(1, false); // S2 setup (SimulateArpCacheMiss=true, .200 absent)
    api_TcpIp_SoAdGetSocket(1, "UDP");
    api_TcpIp_Bind(1, 0, 30490);
    const prevTx = sim.counters.txOk;
    api_TcpIp_UdpTransmit(1, 64, "192.168.10.200:30490");
    assert(!sim.arpHit && !(sim.regA & 0x08) && sim.arpPendingQueue.length === 1, "ARP Miss queues UDP in ArpPendingQueue and sets Bit 3=0");
    api_TcpIp_RxIndication("ARP_REPLY", { targetIp: "192.168.10.200", mac: "00:11:22:33:44:C8" });
    assert(sim.arpHit && Boolean(sim.regA & 0x08) && sim.arpPendingQueue.length === 0 && sim.counters.txOk === prevTx + 1, "ARP Reply drains ArpPendingQueue and transmits UDP");

    // 5. IPv4 Fragmentation DF=1 block vs DF=0 split (S8 semantics)
    loadScenario(7, false); // S8 setup (MTU=1500)
    cfg.SetIpDontFragmentFlagDf = true;
    assert(api_TcpIp_UdpTransmit(1, 2800, "192.168.10.200:30490") === "E_NOT_OK", "DF=1 blocks 2800B UDP over 1500B MTU");
    cfg.SetIpDontFragmentFlagDf = false;
    assert(api_TcpIp_UdpTransmit(1, 2800, "192.168.10.200:30490") === "E_OK" && sim.lastFragList.length === 2, "DF=0 fragments 2800B UDP into 2 IPv4 pieces");
    assert(sim.lastFragList[0].mf === 1 && sim.lastFragList[0].fragOffset === 0 && sim.lastFragList[1].mf === 0 && sim.lastFragList[1].fragOffset === 185, "Fragment MF and 8B Offset values exact (0 and 185)");

    // 6. ONHOLD preserves IP & ESTABLISHED socket vs OFFLINE (S11 semantics)
    loadScenario(10, false); // S11 setup
    sim.sockets[0].state = "ESTABLISHED";
    sim.phyLinkUp = false;
    api_TcpIp_RequestComMode(0, "TCPIP_STATE_ONHOLD");
    assert(sim.ctrlState === "TCPIP_STATE_ONHOLD" && Boolean(sim.regA & 0x40) && !(sim.regA & 0x80), "ONHOLD sets Bit 6=1 & Bit 7=0");
    assert(sim.sockets[0].state === "ESTABLISHED" && sim.localAddrs[0].ip === "192.168.10.50", "ONHOLD preserves IP & ESTABLISHED socket");
    assert(api_TcpIp_UdpTransmit(1, 64) === "E_NOT_OK", "ONHOLD blocks new UDP Tx");
    sim.phyLinkUp = true;
    api_TcpIp_RequestComMode(0, "TCPIP_STATE_ONLINE");
    assert(sim.ctrlState === "TCPIP_STATE_ONLINE" && sim.sockets[0].state === "ESTABLISHED" && sim.ipAssigned, "ONLINE recovers from ONHOLD preserving session");
    api_TcpIp_RequestComMode(0, "TCPIP_STATE_OFFLINE");
    assert(sim.ctrlState === "TCPIP_STATE_OFFLINE" && sim.sockets[0].state === "CLOSED" && !sim.ipAssigned, "OFFLINE closes sockets and releases IP");

    // 7. AUTOSAR TLS 1.3 + SYN Flood/IdsM + DET(170) + DEM (S10 & S12)
    loadScenario(9, false); // S10 TLS
    api_RunTlsHandshake(3, false);
    assert(Boolean(sim.regA & 0x02) && sim.sockets[3].tlsHandshakeDone, "TLS 1.3 handshake sets Bit 1 TLS_SEC_ACTV=1");
    loadScenario(11, false); // S12 Security/Faults
    api_InjectSynFlood();
    assert(sim.counters.idsmEvents >= 1 && Boolean(sim.regA & 0x01), "SYN Flood triggers IdsM_SetSecurityEvent & Bit 0=1");
    api_TcpIp_RxIndication("ARP_SPOOF");
    assert(sim.counters.idsmEvents >= 2, "ARP Spoofing triggers IdsM_SetSecurityEvent");
    api_InjectDetFault();
    assert(sim.counters.detErrors >= 1 && sim.lastDet.moduleId === 170, "DET fault reports ModuleId 170");
    cfg.PassInvalidSocketOrNullForDet = false;
    cfg.SimulateNetworkFaultForDem = true;
    api_TcpIp_TcpConnect(0, "192.168.10.100:13400");
    assert(sim.counters.demEvents >= 1 && sim.lastDem.event === "TCPIP_E_CONNREFUSED", "DEM reports TCPIP_E_CONNREFUSED");

    // 8. Tooltip + All 4 Exports
    const rowEl = document.querySelector('.cfg-row[data-cfg-key="TcpIpTcpNagleEnabled"]');
    showCfgTooltip("TcpIpTcpNagleEnabled", rowEl);
    const popup = document.getElementById("cfgTooltipPopup");
    assert(popup.classList.contains("show") && popup.textContent.includes("SWS_TcpIp_00150"), "Tooltip popup displays SWS_TcpIp_00150");
    hideCfgTooltip();

    openExportModal();
    assert(getExportContentByTab(0).content.includes("/AUTOSAR/EcucDefs/TcpIp"), "ARXML export valid");
    assert(getExportContentByTab(1).content.includes("#define TCPIP_MODULE_ID                     (170u)"), "TcpIp_Cfg.h export valid");
    assert(getExportContentByTab(2).content.includes("TcpIp_LocalAddrCfg"), "TcpIp_Lcfg.c export valid");
    const parsedJson = JSON.parse(getExportContentByTab(3).content);
    assert(parsedJson.moduleId === 170 && parsedJson.autosarRelease === "R23-11", "JSON export parses cleanly");
    closeExportModal();

    // 9. SVG text length audit in Sim View & ALL 24 Handbook Sub-tabs
    const auditSvgs = function(scopeEl, labelPrefix) {
      if (!scopeEl) return;
      scopeEl.querySelectorAll("svg").forEach(function(svg, sIdx) {
        const vbAttr = svg.getAttribute("viewBox");
        if (!vbAttr) return;
        const vbW = parseFloat(vbAttr.split(/\s+/)[2]);
        const rects = Array.from(svg.querySelectorAll("rect")).map(function(r) {
          return {
            x: parseFloat(r.getAttribute("x") || 0),
            y: parseFloat(r.getAttribute("y") || 0),
            w: parseFloat(r.getAttribute("width") || 0),
            h: parseFloat(r.getAttribute("height") || 0)
          };
        });
        svg.querySelectorAll("text").forEach(function(txt) {
          const len = txt.getComputedTextLength ? txt.getComputedTextLength() : 0;
          if (len > vbW - 10) {
            report.svgOverflows.push(labelPrefix + " svg#" + sIdx + " viewport overflow (" + len.toFixed(1) + " > " + vbW + "): " + txt.textContent);
          }
          const tx = parseFloat(txt.getAttribute("x") || 0);
          const ty = parseFloat(txt.getAttribute("y") || 0);
          const enclosing = rects
            .filter(function(r) { return tx >= r.x && tx <= r.x + r.w && ty >= r.y && ty <= r.y + r.h; })
            .sort(function(a, b) { return (a.w * a.h) - (b.w * b.h); })[0];
          if (enclosing && len > enclosing.w - 6) {
            report.svgOverflows.push(labelPrefix + " svg#" + sIdx + " box overflow (" + len.toFixed(1) + " > rectW " + enclosing.w + "): " + txt.textContent);
          }
        });
      });
    };

    loadScenario(0, true);
    auditSvgs(document.getElementById("viewSim"), "Sim");

    switchMainView("hb");
    for (let t = 0; t < 6; t++) {
      switchHbTab1(t);
      for (let st = 0; st < 4; st++) {
        switchHbSubTab(st);
        auditSvgs(document.getElementById("hbContentArea"), "HB_T" + t + "_S" + st);
      }
    }

    // 10. Abbreviation Search Highlight & Category Filter + Theme Toggle
    switchHbTab1(6);
    setAbbrCategory("TCP");
    const abbrInp = document.getElementById("abbrSearchInput");
    abbrInp.value = "Nagle";
    filterAbbreviationTable();
    assert(document.querySelectorAll("#hbContentArea mark").length >= 1, "Abbreviation live search highlights <mark> cleanly");
    assert(!document.getElementById("hbContentArea").textContent.includes("undefined"), "Abbreviation table has no undefined fields");

    toggleTheme();
    assert(document.documentElement.getAttribute("data-theme") === "light", "Light theme toggles cleanly");
    toggleTheme();
    assert(document.documentElement.getAttribute("data-theme") === "dark", "Dark theme restores cleanly");
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
    scratch_file = os.path.join(ARTIFACT_SCRATCH, "test_tcpip_verify.html")
    with open(scratch_file, "w", encoding="utf-8") as f:
        f.write(injected_html)

    file_url = "file:///" + scratch_file.replace("\\", "/")
    cmd = [
        browser,
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--virtual-time-budget=3500",
        "--dump-dom",
        file_url,
    ]
    res = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=45)
    assert res.returncode == 0, f"Browser exited with code {res.returncode}: {res.stderr}"

    m = re.search(r'<pre id="__VERIFY_REPORT__">(.*?)</pre>', res.stdout, flags=re.S)
    assert m, "Could not locate __VERIFY_REPORT__ in headless browser DOM dump!"
    report = json.loads(html_mod.unescape(m.group(1)))

    print(f"  Browser runtime checks passed: {len(report['checks'])}")
    if report["errors"]:
        print("  ERRORS:", json.dumps(report["errors"], indent=2, ensure_ascii=False))
    if report["svgOverflows"]:
        print("  SVG OVERFLOWS:", json.dumps(report["svgOverflows"], indent=2, ensure_ascii=False))
    assert not report["errors"], f"Runtime assertion errors in browser: {report['errors']}"
    assert not report["svgOverflows"], f"SVG text width overflows detected: {report['svgOverflows']}"
    print("  PASS: Zero JS errors, all protocol & UI checks + live SVG text bounds passed!")


def main():
    assert os.path.exists(HTML_PATH), f"Target HTML missing: {HTML_PATH}"
    with open(HTML_PATH, "r", encoding="utf-8") as f:
        html_text = f.read()

    stage1_offline_check(html_text)
    parser, script_part = stage2_dom_and_handlers(html_text)
    stage3_ecuc_parity(parser, script_part)
    stage4_handbook_svg_xml(html_text)
    stage5_headless_browser_test(html_text)
    print("\nOVERALL RESULT: PASS")


if __name__ == "__main__":
    main()
