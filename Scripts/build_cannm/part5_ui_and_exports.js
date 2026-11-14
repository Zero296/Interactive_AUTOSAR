/*************************************************************************
 * PART 5: UI RENDERING, SVG DIAGRAM, BIT REGISTERS, TIMERS & EXPORTS
 * Standard: AUTOSAR Classic R22-11 / R23-11 (SWS_CanNm, SWS_Nm, SWS_ComM)
 *************************************************************************/

let activeInspectorTab = 0;
let activeModuleKey = "CanNm";
let activeExportTab = "arxml";
let tooltipTimer = null;

// 1. RENDER 8-BYTE NM PDU FRAME SLICER
function renderPduFrameGrid() {
  const container = document.getElementById("pduFrameGrid");
  if (!container) return;

  const bytes = getPduFrameBytes();
  const hexArr = bytes.map(b => b.toString(16).toUpperCase().padStart(2, "0"));

  let html = "";
  for (let i = 0; i < 8; i++) {
    let cardClass = "";
    let label = "User Data";
    let desc = "Ứng dụng COM";

    if (i === 0 && ecucConfig.CanNmPduNidPosition === "BYTE_0") {
      cardClass = "active-sni"; label = "SNI (NodeId)"; desc = `Node 0x${hexArr[i]}`;
    } else if (i === 1 && ecucConfig.CanNmPduNidPosition === "BYTE_1") {
      cardClass = "active-sni"; label = "SNI (NodeId)"; desc = `Node 0x${hexArr[i]}`;
    }

    if (i === 1 && ecucConfig.CanNmPduCbvPosition === "BYTE_1") {
      cardClass = "active-cbv"; label = "CBV Byte"; desc = "Control Bit Vector";
    } else if (i === 0 && ecucConfig.CanNmPduCbvPosition === "BYTE_0") {
      cardClass = "active-cbv"; label = "CBV Byte"; desc = "Control Bit Vector";
    }

    if (ecucConfig.CanNmPnEnabled) {
      if (i >= ecucConfig.CanNmPnInfoOffset && i < ecucConfig.CanNmPnInfoOffset + ecucConfig.CanNmPnInfoLength) {
        cardClass = "active-pni"; label = `PNI Mask #${i - ecucConfig.CanNmPnInfoOffset}`; desc = "Partial Network";
      }
    }

    if (!cardClass) {
      cardClass = "active-usr";
    }

    html += `
      <div class="pdu-byte-card ${cardClass}" title="Byte ${i}: ${label} - Giá trị: 0x${hexArr[i]} (${desc})">
        <div class="pdu-byte-idx">Byte ${i}</div>
        <div class="pdu-byte-val">0x${hexArr[i]}</div>
        <div class="pdu-byte-lbl">${label}</div>
      </div>
    `;
  }
  container.innerHTML = html;

  const note = document.getElementById("lblPduLayoutNote");
  if (note) {
    note.innerText = `NidPos: ${ecucConfig.CanNmPduNidPosition} | CbvPos: ${ecucConfig.CanNmPduCbvPosition} | Base: 0x${ecucConfig.CanNmBaseCanId.toString(16).toUpperCase()} | Node: 0x${ecucConfig.CanNmNodeId.toString(16).toUpperCase()}`;
  }
}

// 2. RENDER DUAL 8-BIT INTERACTIVE REGISTERS
function render8BitRegisters() {
  // Render Thanh A: CBV Byte
  const cbvRow = document.getElementById("bitRowCbv");
  if (cbvRow) {
    const cbvVal = getCbvByteValue();
    let html = "";
    for (let i = 7; i >= 0; i--) {
      const bitMeta = CANNM_CBV_BITS[i];
      const isSet = (cbvVal & bitMeta.mask) !== 0;
      let onClass = isSet ? "on" : "";
      if (isSet) {
        if (i === 4) onClass += " ok"; // AWB = green
        else if (i === 0) onClass += " amb"; // RMR = amber
        else if (i === 6) onClass += " vio"; // PNI = violet
      }

      html += `
        <div class="bit-box ${onClass}" onclick="toggleCbvBit(${i})" title="${bitMeta.label} (${bitMeta.name}) - ${bitMeta.desc}">
          <div class="bit-num">b${i}</div>
          <div class="bit-val">${isSet ? "1" : "0"}</div>
          <div class="bit-name">${bitMeta.name}</div>
        </div>
      `;
    }
    cbvRow.innerHTML = html;

    const cbvBin = document.getElementById("lblCbvBin");
    if (cbvBin) cbvBin.innerText = cbvVal.toString(2).padStart(8, "0") + "b (0x" + cbvVal.toString(16).toUpperCase().padStart(2, "0") + ")";
    const cbvHex = document.getElementById("lblCbvByteHex");
    if (cbvHex) cbvHex.innerText = "CBV: 0x" + cbvVal.toString(16).toUpperCase().padStart(2, "0");
    const cbvSum = document.getElementById("lblCbvSummary");
    if (cbvSum) {
      cbvSum.innerText = `AWB=${simState.cbv.awb ? 1 : 0} | RMR=${simState.cbv.rmr ? 1 : 0} | PNI=${simState.cbv.pni || ecucConfig.CanNmPnEnabled ? 1 : 0} | CSR=${simState.cbv.csr ? 1 : 0}`;
    }
  }

  // Render Thanh B: CanNM Engine Status Byte
  const engRow = document.getElementById("bitRowEngine");
  if (engRow) {
    const engVal = getEngineByteValue();
    let html = "";
    for (let i = 7; i >= 0; i--) {
      const bitMeta = CANNM_ENGINE_BITS[i];
      const isSet = (engVal & bitMeta.mask) !== 0;
      let onClass = isSet ? "on ok" : "";

      html += `
        <div class="bit-box ${onClass}" onclick="toggleEngineBit(${i})" title="${bitMeta.label} (${bitMeta.name}) - ${bitMeta.desc}">
          <div class="bit-num">b${i}</div>
          <div class="bit-val">${isSet ? "1" : "0"}</div>
          <div class="bit-name">${bitMeta.name}</div>
        </div>
      `;
    }
    engRow.innerHTML = html;

    const engBin = document.getElementById("lblEngineBin");
    if (engBin) engBin.innerText = engVal.toString(2).padStart(8, "0") + "b (0x" + engVal.toString(16).toUpperCase().padStart(2, "0") + ")";
    const engHex = document.getElementById("lblEngineByteHex");
    if (engHex) engHex.innerText = "Engine: 0x" + engVal.toString(16).toUpperCase().padStart(2, "0");
    const engSum = document.getElementById("lblEngineSummary");
    if (engSum) {
      engSum.innerText = `${simState.mode} | ${simState.subState} | TxEn=${simState.engine.msgTxEnabled ? 1 : 0}`;
    }
  }
}

function toggleCbvBit(bitIdx) {
  if (bitIdx === 0) simState.cbv.rmr = !simState.cbv.rmr;
  if (bitIdx === 3) simState.cbv.csr = !simState.cbv.csr;
  if (bitIdx === 4) simState.cbv.awb = !simState.cbv.awb;
  if (bitIdx === 6) simState.cbv.pni = !simState.cbv.pni;
  addTraceLog("USER", "Inspector", `Click thay đổi Bit ${bitIdx} trong CBV Byte`, `Giá trị CBV mới: 0x${getCbvByteValue().toString(16).toUpperCase()}`);
  renderAll();
}

function toggleEngineBit(bitIdx) {
  if (bitIdx === 0) {
    ecucConfig.CanNmInitialized = !ecucConfig.CanNmInitialized;
    onConfigChange("CanNmInitialized", true);
  } else if (bitIdx === 1) {
    apiToggleCommunication();
  } else if (bitIdx === 7) {
    if (simState.engine.netRequest) apiNetworkRelease();
    else apiNetworkRequest();
  }
}

// 3. RENDER TIMERS PROGRESS BARS
function renderTimers() {
  const setBar = (valId, barId, cur, max) => {
    const valEl = document.getElementById(valId);
    const barEl = document.getElementById(barId);
    if (!valEl || !barEl) return;
    valEl.innerText = `${cur} / ${max} ms`;
    const pct = Math.min(100, Math.max(0, (cur / max) * 100));
    barEl.style.width = pct + "%";
  };

  // RepeatMessageTimer
  setBar("valRptMsgTimer", "barRptMsgTimer", simState.timers.repeatMsg, ecucConfig.CanNmRepeatMessageTime);

  // NM-Timeout Timer
  setBar("valTimeoutTimer", "barTimeoutTimer", simState.timers.timeout, ecucConfig.CanNmTimeoutTime);

  // WaitBusSleepTimer
  setBar("valWaitSleepTimer", "barWaitSleepTimer", simState.timers.waitBusSleep, ecucConfig.CanNmWaitBusSleepTime);

  // MsgCycleTimer
  const lblCycle = document.getElementById("lblMsgCycleType");
  if (lblCycle) {
    if (ecucConfig.CanNmBusLoadReductionEnabled && simState.subState === "NM_STATE_NORMAL_OPERATION") {
      lblCycle.innerText = "MsgCycleTimer (Bus Load Reduced)";
    } else {
      lblCycle.innerText = "MsgCycleTimer (Tx Period)";
    }
  }
  setBar("valMsgCycleTimer", "barMsgCycleTimer", simState.timers.msgCycle, ecucConfig.CanNmMsgCycleTime);

  // Extra Timer: Burst Tx or PN Reset Timer
  const lblExtra = document.getElementById("lblExtraTimerTitle");
  const valExtra = document.getElementById("valExtraTimer");
  const barExtra = document.getElementById("barExtraTimer");
  if (lblExtra && valExtra && barExtra) {
    if (simState.engine.immBurstActive && simState.engine.burstLeft > 0) {
      lblExtra.innerText = "Immediate Burst Tx";
      valExtra.innerText = `${simState.engine.burstLeft} / ${ecucConfig.CanNmImmediateNmTransmissions} Frames`;
      const pct = (simState.engine.burstLeft / ecucConfig.CanNmImmediateNmTransmissions) * 100;
      barExtra.style.width = pct + "%";
      barExtra.style.background = "#c084fc";
    } else if (ecucConfig.CanNmPnEnabled) {
      lblExtra.innerText = "PN Reset Timer (ERA/EIRA)";
      valExtra.innerText = `${simState.timers.pnReset} / ${ecucConfig.CanNmPnResetTime} ms`;
      const pct = (simState.timers.pnReset / ecucConfig.CanNmPnResetTime) * 100;
      barExtra.style.width = pct + "%";
      barExtra.style.background = "#818cf8";
    } else {
      lblExtra.innerText = "Bộ Đếm Phụ (Burst/PN)";
      valExtra.innerText = "IDLE";
      barExtra.style.width = "0%";
    }
  }
}

// 4. RENDER STATE MACHINE DIAGRAM
function renderStateMachine() {
  const nodeBusSleep = document.getElementById("smNodeBusSleep");
  const nodePrepSleep = document.getElementById("smNodePrepSleep");
  const nodeNetwork = document.getElementById("smNodeNetwork");
  const subRepeat = document.getElementById("smSubRepeat");
  const subNormal = document.getElementById("smSubNormal");
  const subReady = document.getElementById("smSubReady");

  [nodeBusSleep, nodePrepSleep, nodeNetwork, subRepeat, subNormal, subReady].forEach(el => {
    if (el) { el.classList.remove("active"); el.classList.remove("pulse-glow"); }
  });

  if (simState.mode === "NM_MODE_BUS_SLEEP") {
    if (nodeBusSleep) nodeBusSleep.classList.add("active");
  } else if (simState.mode === "NM_MODE_PREPARE_BUS_SLEEP") {
    if (nodePrepSleep) { nodePrepSleep.classList.add("active"); nodePrepSleep.classList.add("pulse-glow"); }
  } else if (simState.mode === "NM_MODE_NETWORK") {
    if (nodeNetwork) nodeNetwork.classList.add("active");
    if (simState.subState === "NM_STATE_REPEAT_MESSAGE" && subRepeat) {
      subRepeat.classList.add("active"); subRepeat.classList.add("pulse-glow");
    } else if (simState.subState === "NM_STATE_NORMAL_OPERATION" && subNormal) {
      subNormal.classList.add("active"); subNormal.classList.add("pulse-glow");
    } else if (simState.subState === "NM_STATE_READY_SLEEP" && subReady) {
      subReady.classList.add("active"); subReady.classList.add("pulse-glow");
    }
  }

  // Update Mini Table Variables
  const vWake = document.getElementById("varWakeupSource");
  if (vWake) vWake.innerText = simState.wakeupSource;
  const vBus = document.getElementById("varLastBusActivity");
  if (vBus) vBus.innerText = simState.lastBusActivity;
  const vPnc = document.getElementById("varPncEira");
  if (vPnc) vPnc.innerText = "0x" + simState.pnc.eira.toString(16).toUpperCase().padStart(4, "0");
  const vComM = document.getElementById("varComMMode");
  if (vComM) {
    vComM.innerText = simState.mode === "NM_MODE_NETWORK" ? "COMM_FULL_COMMUNICATION" : "COMM_NO_COMMUNICATION";
  }
}

// 5. RENDER SVG ARCHITECTURE DIAGRAM
function renderSvgArchitecture() {
  const container = document.getElementById("svgArchitectureContainer");
  if (!container) return;

  const isDark = !document.body.classList.contains("light");
  const strokeCol = isDark ? "#334155" : "#cbd5e1";
  const boxBg = isDark ? "#111827" : "#ffffff";
  const boxActiveBg = isDark ? "#1e293b" : "#f1f5f9";
  const textCol = isDark ? "#e2e8f0" : "#0f172a";
  const mutedCol = isDark ? "#8a9ab5" : "#64748b";

  container.innerHTML = `
    <svg viewBox="0 0 880 280" width="100%" height="280" xmlns="http://www.w3.org/2000/svg" style="background:${isDark ? '#080d1a' : '#f8fafc'}; border-radius:8px">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 8 5 L 0 9 z" fill="#38bdf8"/>
        </marker>
        <marker id="arrow-amber" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 8 5 L 0 9 z" fill="#fbbf24"/>
        </marker>
        <marker id="arrow-green" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 8 5 L 0 9 z" fill="#34d399"/>
        </marker>
      </defs>

      <!-- Connecting Lines -->
      <path d="M 120 40 L 120 75" stroke="${strokeCol}" stroke-width="2" marker-end="url(#arrow)"/>
      <path d="M 120 115 L 120 150" stroke="${strokeCol}" stroke-width="2" marker-end="url(#arrow)"/>
      <path d="M 120 190 L 120 225" stroke="${strokeCol}" stroke-width="2" marker-end="url(#arrow)"/>
      <path d="M 175 170 L 250 170" stroke="${strokeCol}" stroke-width="2" marker-end="url(#arrow)"/>
      <path d="M 360 170 L 440 170" stroke="#38bdf8" stroke-width="2.5" marker-end="url(#arrow)"/>
      <path d="M 550 170 L 630 170" stroke="${strokeCol}" stroke-width="2" marker-end="url(#arrow)"/>
      <path d="M 740 170 L 800 170" stroke="${strokeCol}" stroke-width="2" marker-end="url(#arrow)"/>
      
      <!-- Feedback lines -->
      <path d="M 495 145 L 495 95 L 360 95" stroke="#fbbf24" stroke-dasharray="4,4" stroke-width="1.8" fill="none" marker-end="url(#arrow-amber)"/>
      <path d="M 495 195 L 495 245 L 360 245" stroke="#34d399" stroke-dasharray="4,4" stroke-width="1.8" fill="none" marker-end="url(#arrow-green)"/>

      <!-- Node 1: SWC_App -->
      <g onclick="selectModule('SWC_App')" style="cursor:pointer">
        <rect x="50" y="10" width="140" height="30" rx="6" fill="${boxBg}" stroke="#38bdf8" stroke-width="1.5"/>
        <text x="120" y="28" fill="${textCol}" font-size="11" font-weight="700" text-anchor="middle">SWC_App / SWC_PNC</text>
      </g>

      <!-- Node 2: RTE & SchM -->
      <g onclick="selectModule('RTE')" style="cursor:pointer">
        <rect x="50" y="75" width="140" height="40" rx="6" fill="${boxBg}" stroke="${strokeCol}" stroke-width="1.5"/>
        <text x="120" y="93" fill="${textCol}" font-size="11" font-weight="700" text-anchor="middle">RTE / SchM</text>
        <text x="120" y="107" fill="${mutedCol}" font-size="9" text-anchor="middle">CanNm_MainFunction()</text>
      </g>

      <!-- Node 3: ComM -->
      <g onclick="selectModule('ComM')" style="cursor:pointer">
        <rect x="50" y="150" width="140" height="40" rx="6" fill="${boxBg}" stroke="#34d399" stroke-width="1.5"/>
        <text x="120" y="168" fill="${textCol}" font-size="11" font-weight="700" text-anchor="middle">ComM</text>
        <text x="120" y="182" fill="${mutedCol}" font-size="9" text-anchor="middle">Communication Manager</text>
      </g>

      <!-- Node 4: BswM -->
      <g onclick="selectModule('BswM')" style="cursor:pointer">
        <rect x="50" y="225" width="140" height="35" rx="6" fill="${boxBg}" stroke="${strokeCol}" stroke-width="1.5"/>
        <text x="120" y="243" fill="${textCol}" font-size="10.5" font-weight="700" text-anchor="middle">BswM (Mode Manager)</text>
      </g>

      <!-- Node 5: Nm -->
      <g onclick="selectModule('Nm')" style="cursor:pointer">
        <rect x="250" y="150" width="110" height="40" rx="6" fill="${boxBg}" stroke="#818cf8" stroke-width="1.5"/>
        <text x="305" y="168" fill="${textCol}" font-size="11" font-weight="700" text-anchor="middle">Nm Interface</text>
        <text x="305" y="182" fill="${mutedCol}" font-size="9" text-anchor="middle">Generic NM Bus</text>
      </g>

      <!-- Node 6: CanNM (TRỌNG TÂM - PULSE GLOW) -->
      <g onclick="selectModule('CanNm')" style="cursor:pointer">
        <rect x="440" y="140" width="120" height="60" rx="8" fill="${boxActiveBg}" stroke="#38bdf8" stroke-width="2.5" class="pulse-glow"/>
        <text x="500" y="162" fill="#38bdf8" font-size="12.5" font-weight="800" text-anchor="middle">CanNM Engine</text>
        <text x="500" y="177" fill="${textCol}" font-size="10" font-weight="700" text-anchor="middle">${simState.mode.replace('NM_MODE_', '')}</text>
        <text x="500" y="191" fill="${mutedCol}" font-size="9" text-anchor="middle">${simState.subState.replace('NM_STATE_', '')}</text>
      </g>

      <!-- Node 7: COM & PduR (User Data TriggerTransmit) -->
      <g onclick="selectModule('PduR_COM')" style="cursor:pointer">
        <rect x="250" y="75" width="120" height="40" rx="6" fill="${boxBg}" stroke="#fbbf24" stroke-width="1.5"/>
        <text x="310" y="93" fill="${textCol}" font-size="10.5" font-weight="700" text-anchor="middle">PduR &amp; COM</text>
        <text x="310" y="107" fill="${mutedCol}" font-size="9" text-anchor="middle">TriggerTransmit (User Data)</text>
      </g>

      <!-- Node 8: CanSM -->
      <g onclick="selectModule('CanSM')" style="cursor:pointer">
        <rect x="250" y="225" width="120" height="35" rx="6" fill="${boxBg}" stroke="#34d399" stroke-width="1.5"/>
        <text x="310" y="242" fill="${textCol}" font-size="10.5" font-weight="700" text-anchor="middle">CanSM</text>
        <text x="310" y="254" fill="${mutedCol}" font-size="8.5" text-anchor="middle">ConfirmPnAvailability()</text>
      </g>

      <!-- Node 9: CanIf -->
      <g onclick="selectModule('CanIf')" style="cursor:pointer">
        <rect x="630" y="150" width="110" height="40" rx="6" fill="${boxBg}" stroke="${strokeCol}" stroke-width="1.5"/>
        <text x="685" y="168" fill="${textCol}" font-size="11" font-weight="700" text-anchor="middle">CanIf</text>
        <text x="685" y="182" fill="${mutedCol}" font-size="9" text-anchor="middle">CAN Interface</text>
      </g>

      <!-- Node 10: Can Driver & Transceiver (PN HW) -->
      <g onclick="selectModule('CanIf')" style="cursor:pointer">
        <rect x="800" y="145" width="70" height="50" rx="6" fill="${boxBg}" stroke="#c084fc" stroke-width="1.5"/>
        <text x="835" y="165" fill="${textCol}" font-size="10" font-weight="700" text-anchor="middle">CanDrv</text>
        <text x="835" y="178" fill="${textCol}" font-size="10" font-weight="700" text-anchor="middle">&amp; Trcv</text>
        <text x="835" y="190" fill="${mutedCol}" font-size="8" text-anchor="middle">ISO 11898-6</text>
      </g>
    </svg>
  `;
}

function selectModule(modKey) {
  activeModuleKey = modKey;
  switchInspTab(1); // Switch to Module tab
  renderInspector();
}

// 6. RENDER INSPECTOR 4 SUB-TABS
function switchInspTab(tabIdx) {
  activeInspectorTab = tabIdx;
  const tabs = document.querySelectorAll("#inspTabs .tab");
  tabs.forEach((t, i) => {
    if (i === tabIdx) t.classList.add("active");
    else t.classList.remove("active");
  });

  for (let i = 0; i < 4; i++) {
    const pane = document.getElementById(`inspPane${i}`);
    if (pane) {
      if (i === tabIdx) pane.classList.remove("hidden");
      else pane.classList.add("hidden");
    }
  }
  renderInspector();
}

function renderInspector() {
  if (activeInspectorTab === 0) {
    // Sub-tab 0: Bước Hiện Tại
    const box = document.getElementById("stepDetailBox");
    if (!box) return;

    const scen = SCENARIOS[simState.currentScenario];
    const step = scen && scen.steps[simState.currentStep] ? scen.steps[simState.currentStep] : null;

    if (!step) {
      box.innerHTML = `<p class="muted">Chưa có kịch bản nào được chọn.</p>`;
      return;
    }

    box.innerHTML = `
      <div style="background:var(--code); border:1px solid var(--border); border-radius:8px; padding:10px; margin-bottom:8px">
        <div class="row" style="justify-content:space-between; margin-bottom:4px">
          <span class="mono" style="font-weight:700; color:#38bdf8">${step.api}</span>
          <span class="badge ok">R22-11</span>
        </div>
        <div class="mono small muted" style="margin-bottom:6px">${step.io}</div>
        <div style="font-size:12px; line-height:1.5; color:var(--text)">${step.desc}</div>
      </div>

      <div style="background:var(--panel2); border:1px solid var(--border); border-radius:8px; padding:8px; margin-bottom:8px">
        <div class="mono small" style="font-weight:700; color:#fbbf24; margin-bottom:4px">📊 THAY ĐỔI TRẠNG THÁI VÀ BIT TRONG BƯỚC NÀY:</div>
        <table class="tbl">
          <tr><td>CanNM Mode</td><td class="mono" style="color:#38bdf8; font-weight:700">${simState.mode}</td></tr>
          <tr><td>Sub-State</td><td class="mono" style="color:#fbbf24; font-weight:700">${simState.subState}</td></tr>
          <tr><td>CBV Byte</td><td class="mono">0x${getCbvByteValue().toString(16).toUpperCase()} (AWB=${simState.cbv.awb ? 1 : 0}, RMR=${simState.cbv.rmr ? 1 : 0}, PNI=${simState.cbv.pni || ecucConfig.CanNmPnEnabled ? 1 : 0})</td></tr>
          <tr><td>NM-Timeout Timer</td><td class="mono">${simState.timers.timeout} / ${ecucConfig.CanNmTimeoutTime} ms</td></tr>
          <tr><td>RepeatMessageTimer</td><td class="mono">${simState.timers.repeatMsg} / ${ecucConfig.CanNmRepeatMessageTime} ms</td></tr>
        </table>
      </div>
    `;
  } else if (activeInspectorTab === 1) {
    // Sub-tab 1: Module Info
    const box = document.getElementById("moduleDetailBox");
    if (!box) return;

    const mod = MODULES_INFO[activeModuleKey] || MODULES_INFO.CanNm;
    box.innerHTML = `
      <div style="margin-bottom:10px">
        <div class="row" style="justify-content:space-between; margin-bottom:4px">
          <span class="mono" style="font-weight:800; font-size:13px; color:#38bdf8">${mod.name}</span>
          <span class="badge">${mod.layer}</span>
        </div>
        <div class="mono small muted" style="margin-bottom:6px">${mod.sws}</div>
      </div>

      <div style="background:var(--panel2); border:1px solid var(--border); border-radius:8px; padding:8px; margin-bottom:8px">
        <div class="mono small" style="font-weight:700; color:#34d399; margin-bottom:2px">📥 INPUT (LẤY TỪ ĐÂU?):</div>
        <div style="font-size:11.5px; line-height:1.45; color:var(--text)">${mod.input}</div>
      </div>

      <div style="background:var(--panel2); border:1px solid var(--border); border-radius:8px; padding:8px; margin-bottom:8px">
        <div class="mono small" style="font-weight:700; color:#fbbf24; margin-bottom:2px">⚙️ XỬ LÝ NỘI BỘ (PROCESSING &amp; TIMERS):</div>
        <div style="font-size:11.5px; line-height:1.45; color:var(--text)">${mod.processing}</div>
      </div>

      <div style="background:var(--panel2); border:1px solid var(--border); border-radius:8px; padding:8px; margin-bottom:8px">
        <div class="mono small" style="font-weight:700; color:#38bdf8; margin-bottom:2px">📤 OUTPUT (ROUTE ĐẾN ĐÂU &amp; HÀM API CHUẨN):</div>
        <div style="font-size:11.5px; line-height:1.45; color:var(--text)">${mod.output}</div>
      </div>

      <div class="mono small muted">Hàm API liên quan: ${mod.apis.map(a => `<code>${a}</code>`).join(" ")}</div>
    `;
  } else if (activeInspectorTab === 2) {
    // Sub-tab 2: Code C Thực Thi
    const viewer = document.getElementById("codeViewerBox");
    if (!viewer) return;

    viewer.innerText = `/* =========================================================================
 * AUTOSAR BSW Module: CanNm (SWS_CanNm Classic Platform R22-11)
 * ========================================================================= */

void CanNm_MainFunction(void)
{
    /* SWS_CanNm_00234: Periodic main function to manage timers */
    SchM_Enter_CanNm_EA_0();

    if (CanNm_Initialized == FALSE) {
        SchM_Exit_CanNm_EA_0();
        return;
    }

    /* 1. Manage NM-Timeout Timer in Network Mode */
    if (CanNm_NetworkMode == NM_MODE_NETWORK && CanNm_MsgTxEnabled) {
        if (CanNm_TimeoutTimer > 0) {
            CanNm_TimeoutTimer -= CANNM_MAIN_FUNCTION_PERIOD;
            if (CanNm_TimeoutTimer == 0) {
                if (CanNm_SubState == NM_STATE_READY_SLEEP) {
                    /* SWS_CanNm_00115: Transition to Prepare Bus-Sleep Mode */
                    CanNm_NetworkMode = NM_MODE_PREPARE_BUS_SLEEP;
                    CanNm_CBV.AWB = 0; /* SWS_CanNm_00402: Clear AWB on exit */
                    CanNm_WaitBusSleepTimer = CANNM_WAIT_BUS_SLEEP_TIME;
                    Nm_PrepareBusSleepMode(CanNm_NetworkHandle);
                }
            }
        }
    }

    /* 2. Manage Repeat Message Timer */
    if (CanNm_SubState == NM_STATE_REPEAT_MESSAGE) {
        if (CanNm_RepeatMessageTimer > 0) {
            CanNm_RepeatMessageTimer -= CANNM_MAIN_FUNCTION_PERIOD;
            if (CanNm_RepeatMessageTimer == 0) {
                CanNm_CBV.RMR = 0; /* SWS_CanNm_00107: Clear RMR */
                if (CanNm_NetworkRequested) {
                    CanNm_SubState = NM_STATE_NORMAL_OPERATION;
                    CanNm_MsgCycleTimer = CANNM_MSG_CYCLE_TIME;
                } else {
                    CanNm_SubState = NM_STATE_READY_SLEEP;
                }
            }
        }
    }

    /* 3. Manage Wait Bus Sleep Timer */
    if (CanNm_NetworkMode == NM_MODE_PREPARE_BUS_SLEEP) {
        if (CanNm_WaitBusSleepTimer > 0) {
            CanNm_WaitBusSleepTimer -= CANNM_MAIN_FUNCTION_PERIOD;
            if (CanNm_WaitBusSleepTimer == 0) {
                /* SWS_CanNm_00117: Enter Bus-Sleep Mode */
                CanNm_NetworkMode = NM_MODE_BUS_SLEEP;
                Nm_BusSleepMode(CanNm_NetworkHandle);
            }
        }
    }

    /* 4. Manage Periodic Transmission */
    if (CanNm_MsgTxEnabled && !CANNM_PASSIVE_MODE) {
        if (CanNm_MsgCycleTimer > 0) {
            CanNm_MsgCycleTimer -= CANNM_MAIN_FUNCTION_PERIOD;
            if (CanNm_MsgCycleTimer == 0) {
                CanNm_TransmitPdu();
                CanNm_MsgCycleTimer = CANNM_MSG_CYCLE_TIME;
            }
        }
    }

    SchM_Exit_CanNm_EA_0();
}

Std_ReturnType CanNm_NetworkRequest(NetworkHandleType nmChannelHandle)
{
    /* SWS_CanNm_00104: Request network communication */
    CanNm_NetworkRequested = TRUE;
    if (CanNm_NetworkMode == NM_MODE_BUS_SLEEP) {
        CanNm_NetworkMode = NM_MODE_NETWORK;
        CanNm_SubState = NM_STATE_REPEAT_MESSAGE;
        CanNm_CBV.AWB = 1; /* SWS_CanNm_00401: Set Active Wakeup Bit */
        CanNm_RepeatMessageTimer = CANNM_REPEAT_MESSAGE_TIME;
        CanNm_TimeoutTimer = CANNM_TIMEOUT_TIME;
        Nm_NetworkMode(nmChannelHandle);
        CanNm_TriggerImmediateBurstTx();
    }
    return E_OK;
}`;
  } else if (activeInspectorTab === 3) {
    // Sub-tab 3: API Call Trace Log
    renderTraceLog();
  }
}

// 7. TRACE LOG HELPER
function addTraceLog(type, sender, apiName, desc) {
  const timeStr = `t=${simState.clockMs}ms`;
  simState.traceLogs.unshift({ time: timeStr, type, sender, apiName, desc });
  if (simState.traceLogs.length > 80) simState.traceLogs.pop();
  renderTraceLog();
}

function clearTraceLog() {
  simState.traceLogs = [];
  renderTraceLog();
}

function renderTraceLog() {
  const container = document.getElementById("traceLogContainer");
  if (!container) return;

  const filterEl = document.getElementById("traceFilter");
  const filterVal = filterEl ? filterEl.value : "ALL";
  const allLogs = simState.traceLogs || [];
  const filtered = allLogs.filter(l => {
    if (filterVal === "ALL") return true;
    if (filterVal === "ALERT") return l.type === "DET" || l.type === "WARN";
    return l.type === filterVal;
  });

  const countBadge = document.getElementById("traceCountBadge");
  if (countBadge) {
    countBadge.innerText = filterVal === "ALL"
      ? `${allLogs.length} sự kiện`
      : `${filtered.length}/${allLogs.length} sự kiện`;
  }

  if (filtered.length === 0) {
    const msg = allLogs.length === 0
      ? `Chưa có sự kiện nào. Hãy bấm <b>Tiếp Theo</b> hoặc kích hoạt API thủ công.`
      : `Không có bản ghi nào khớp bộ lọc <code>${escapeHtml(filterVal)}</code>.`;
    container.innerHTML = `<p class="muted small" style="padding:14px 6px; text-align:center">${msg}</p>`;
    return;
  }

  const styleMap = {
    BUS: { badge: "indigo", item: "bus", label: "CAN PDU" },
    STATE: { badge: "amb", item: "state", label: "STATE" },
    PN: { badge: "vio", item: "pn", label: "PN" },
    DET: { badge: "err", item: "alert", label: "DET" },
    WARN: { badge: "err", item: "alert", label: "WARN" },
    INIT: { badge: "ok", item: "init", label: "INIT" },
    SCENARIO: { badge: "ok", item: "init", label: "DONE" },
    USER: { badge: "", item: "", label: "USER" },
    API: { badge: "", item: "", label: "API CALL" }
  };

  let html = "";
  filtered.forEach(l => {
    const st = styleMap[l.type] || { badge: "", item: "", label: l.type || "LOG" };
    const sender = escapeHtml(String(l.sender ?? ""));
    const apiName = escapeHtml(String(l.apiName ?? ""));
    const desc = escapeHtml(String(l.desc ?? ""));
    const time = escapeHtml(String(l.time ?? ""));

    html += `
      <div class="trace-item ${st.item}">
        <div class="trace-top">
          <div class="trace-meta">
            <span class="badge xs ${st.badge}">${escapeHtml(st.label)}</span>
            <span class="trace-route" title="${sender}">${sender}</span>
          </div>
          <span class="trace-time">${time}</span>
        </div>
        <div class="trace-api">${apiName}</div>
        <div class="trace-desc">${desc}</div>
      </div>
    `;
  });
  container.innerHTML = html;
}

// 8. SCENARIO STEPPER CONTROLS & SNAPSHOT HISTORY
let scenarioSnapshots = {}; // scenId -> array of snapshots per step

function resetQuickRxInputs() {
  const setChk = (id, v) => { const el = document.getElementById(id); if (el) el.checked = v; };
  const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
  setChk("simRxRmr", false);
  setChk("simRxAwb", true);
  setChk("simRxPni", false);
  setChk("simRxCsr", false);
  setTxt("simRxPniHex", "05 00");
}

function getQuickRxState() {
  return {
    rmr: !!document.getElementById("simRxRmr")?.checked,
    awb: !!document.getElementById("simRxAwb")?.checked,
    pni: !!document.getElementById("simRxPni")?.checked,
    csr: !!document.getElementById("simRxCsr")?.checked,
    pniHex: document.getElementById("simRxPniHex")?.value ?? "05 00"
  };
}

function applyQuickRxState(q) {
  if (!q) return;
  const setChk = (id, v) => { const el = document.getElementById(id); if (el) el.checked = !!v; };
  const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
  setChk("simRxRmr", q.rmr);
  setChk("simRxAwb", q.awb);
  setChk("simRxPni", q.pni);
  setChk("simRxCsr", q.csr);
  setTxt("simRxPniHex", q.pniHex);
}

function stopScenarioAutoPlay() {
  const btn = document.getElementById("btnAutoScenario");
  if (simState.autoScenarioTimer) {
    clearInterval(simState.autoScenarioTimer);
    simState.autoScenarioTimer = null;
  }
  if (btn) btn.innerText = "▶ Tự Chạy";
}

function stopAutoClock() {
  const btn = document.getElementById("btnAutoClock");
  if (simState.autoClockTimer) {
    clearInterval(simState.autoClockTimer);
    simState.autoClockTimer = null;
  }
  if (btn) {
    btn.innerText = "▶ Clock";
    btn.classList.remove("amber");
    btn.classList.add("green");
  }
}

function captureScenarioSnapshot(scenId, stepIdx) {
  if (!scenarioSnapshots[scenId]) {
    scenarioSnapshots[scenId] = [];
  }
  scenarioSnapshots[scenId][stepIdx] = {
    state: JSON.parse(JSON.stringify({
      mode: simState.mode,
      subState: simState.subState,
      cbv: simState.cbv,
      engine: simState.engine,
      timers: simState.timers,
      pnc: simState.pnc,
      clockMs: simState.clockMs,
      lastBusActivity: simState.lastBusActivity,
      wakeupSource: simState.wakeupSource,
      activeDirection: simState.activeDirection,
      currentScenario: scenId,
      currentStep: stepIdx
    })),
    ecuc: JSON.parse(JSON.stringify(ecucConfig)),
    traceLogs: JSON.parse(JSON.stringify(simState.traceLogs || [])),
    quickRx: getQuickRxState()
  };
}

function restoreScenarioSnapshot(scenId, stepIdx) {
  const snapList = scenarioSnapshots[scenId];
  if (snapList && snapList[stepIdx]) {
    const snap = snapList[stepIdx];
    Object.assign(simState, JSON.parse(JSON.stringify(snap.state)));
    Object.assign(ecucConfig, JSON.parse(JSON.stringify(snap.ecuc)));
    if (Array.isArray(snap.traceLogs)) {
      simState.traceLogs = JSON.parse(JSON.stringify(snap.traceLogs));
      renderTraceLog();
    }
    applyQuickRxState(snap.quickRx);
    if (typeof updateUIFromConfig === "function") {
      updateUIFromConfig();
    }
    return true;
  }
  return false;
}

function initializeScenarioAtStep0(scenId) {
  const scen = SCENARIOS[scenId];
  if (!scen) return;

  stopScenarioAutoPlay();
  stopAutoClock();

  simState.currentScenario = scenId;
  simState.currentStep = 0;
  simState.traceLogs = [];
  ecucConfig = JSON.parse(JSON.stringify(defaultConfig));
  resetQuickRxInputs();
  scenarioSnapshots[scenId] = [];

  const sel = document.getElementById("selScenario");
  if (sel) sel.value = String(scenId);

  const titleEl = document.getElementById("scenBoxTitle");
  if (titleEl) titleEl.innerText = scen.title || "";

  if (scen.steps[0] && typeof scen.steps[0].action === "function") {
    try {
      scen.steps[0].action();
    } catch (e) {
      console.error("Step 0 action error:", e);
    }
  } else {
    resetSimulation();
  }

  simState.currentStep = 0;
  if (typeof updateUIFromConfig === "function") {
    updateUIFromConfig();
  }
  captureScenarioSnapshot(scenId, 0);
  updateScenarioStepUI();
  renderAll();
}

function replayScenarioToStep(scenId, targetStep) {
  const scen = SCENARIOS[scenId];
  if (!scen) return;
  const clampedTarget = Math.max(0, Math.min(targetStep, scen.steps.length - 1));
  initializeScenarioAtStep0(scenId);
  for (let s = 1; s <= clampedTarget; s++) {
    simState.currentStep = s;
    const step = scen.steps[s];
    if (step && typeof step.action === "function") {
      try {
        step.action();
      } catch (e) {
        console.error(`Replay Step ${s} error:`, e);
      }
    }
    simState.currentStep = s;
    if (typeof updateUIFromConfig === "function") {
      updateUIFromConfig();
    }
    captureScenarioSnapshot(scenId, s);
  }
}

function resetScenario() {
  initializeScenarioAtStep0(simState.currentScenario);
}

function loadScenario(scenId) {
  initializeScenarioAtStep0(scenId);
}

function nextScenarioStep() {
  const scen = SCENARIOS[simState.currentScenario];
  if (!scen) return;

  if (!scenarioSnapshots[simState.currentScenario]?.[simState.currentStep]) {
    captureScenarioSnapshot(simState.currentScenario, simState.currentStep);
  }

  if (simState.currentStep < scen.steps.length - 1) {
    simState.currentStep++;
    const step = scen.steps[simState.currentStep];
    if (step && typeof step.action === "function") {
      try {
        step.action();
      } catch (e) {
        console.error("Step action error:", e);
      }
    }
    if (typeof updateUIFromConfig === "function") {
      updateUIFromConfig();
    }
    captureScenarioSnapshot(simState.currentScenario, simState.currentStep);
    updateScenarioStepUI();
  } else {
    stopScenarioAutoPlay();
    addTraceLog("SCENARIO", "System", "Hoàn tất kịch bản!", "Đã chạy hết các bước của kịch bản hiện tại.");
    updateScenarioStepUI();
  }
  renderAll();
}

function prevScenarioStep() {
  stopScenarioAutoPlay();
  stopAutoClock();

  if (simState.currentStep <= 0) {
    updateScenarioStepUI();
    return;
  }

  const targetStep = simState.currentStep - 1;
  const restored = restoreScenarioSnapshot(simState.currentScenario, targetStep);
  if (!restored) {
    replayScenarioToStep(simState.currentScenario, targetStep);
  }

  simState.currentStep = targetStep;
  updateScenarioStepUI();
  renderAll();
}

function updateScenarioStepUI() {
  const scen = SCENARIOS[simState.currentScenario];
  if (!scen) return;

  const totalSteps = Math.max(0, scen.steps.length - 1); // Step 0 is preparation
  const step = scen.steps[simState.currentStep];
  const stepCtr = document.getElementById("lblStepCounter");
  if (stepCtr) {
    if (simState.currentStep === 0) {
      stepCtr.innerText = `Bước 0 / ${totalSteps} (Sẵn sàng)`;
      stepCtr.className = "badge warn";
    } else if (simState.currentStep >= totalSteps) {
      stepCtr.innerText = `Bước ${simState.currentStep} / ${totalSteps} (Hoàn tất)`;
      stepCtr.className = "badge ok";
    } else {
      stepCtr.innerText = `Bước ${simState.currentStep} / ${totalSteps}`;
      stepCtr.className = "badge sky";
    }
  }

  const prevBtn = document.getElementById("btnPrevStep");
  if (prevBtn) prevBtn.disabled = (simState.currentStep <= 0);

  const nextBtn = document.getElementById("btnNextStep");
  if (nextBtn) nextBtn.disabled = (simState.currentStep >= totalSteps);

  const apiBadge = document.getElementById("scenApiBadge");
  if (apiBadge) {
    if (simState.currentStep === 0) {
      apiBadge.innerText = "Bước 0: Chuẩn bị";
      apiBadge.className = "badge warn";
    } else {
      apiBadge.innerText = step ? step.api.split(":")[0] : "Sẵn sàng";
      apiBadge.className = "badge ok";
    }
  }

  const ioPill = document.getElementById("scenIoPill");
  if (ioPill) ioPill.innerText = step ? step.io : "";

  const descEl = document.getElementById("scenStepDesc");
  if (descEl) descEl.innerText = step ? step.desc : "";

  // Render 3 What-If Buttons
  const whatIfContainer = document.getElementById("whatIfBtnsContainer");
  if (whatIfContainer && scen.whatIf) {
    let btnsHtml = "";
    scen.whatIf.forEach((w, idx) => {
      btnsHtml += `
        <button class="btn xs" onclick="runWhatIf(${idx})" style="justify-content:flex-start; text-align:left; background:var(--panel2)">
          <span>👉</span> <span>${w.label}</span>
        </button>
      `;
    });
    whatIfContainer.innerHTML = btnsHtml;
  }
}

function runWhatIf(idx) {
  const scen = SCENARIOS[simState.currentScenario];
  if (scen && scen.whatIf && scen.whatIf[idx]) {
    addTraceLog("USER", "What-If", `Thử nghiệm: ${scen.whatIf[idx].label}`, "Kích hoạt kiểm thử What-If tương tác.");
    try {
      scen.whatIf[idx].action();
    } catch (e) {
      console.error("What-If action error:", e);
    }
    if (typeof updateUIFromConfig === "function") {
      updateUIFromConfig();
    }
    captureScenarioSnapshot(simState.currentScenario, simState.currentStep);
    updateScenarioStepUI();
    renderAll();
  }
}

function toggleScenarioAutoPlay() {
  const btn = document.getElementById("btnAutoScenario");
  if (simState.autoScenarioTimer) {
    stopScenarioAutoPlay();
  } else {
    const scen = SCENARIOS[simState.currentScenario];
    if (!scen) return;
    if (simState.currentStep >= scen.steps.length - 1) {
      initializeScenarioAtStep0(simState.currentScenario);
    }
    if (btn) btn.innerText = "⏸ Dừng Lại";
    simState.autoScenarioTimer = setInterval(() => {
      const curScen = SCENARIOS[simState.currentScenario];
      if (curScen && simState.currentStep < curScen.steps.length - 1) {
        nextScenarioStep();
        if (simState.currentStep >= curScen.steps.length - 1) {
          stopScenarioAutoPlay();
        }
      } else {
        stopScenarioAutoPlay();
      }
    }, 2200);
  }
}

function toggleAutoClock() {
  const btn = document.getElementById("btnAutoClock");
  if (simState.autoClockTimer) {
    stopAutoClock();
  } else {
    if (btn) {
      btn.innerText = "⏸ Dừng (2x)";
      btn.classList.remove("green");
      btn.classList.add("amber");
    }
    // Tốc độ đếm nhanh hơn gấp 2 lần: chu kỳ xung nhịp 500ms mỗi tick 100ms (thay vì 1000ms)
    simState.autoClockTimer = setInterval(() => {
      stepClockTick(100);
    }, 500);
  }
}

// 9. VIEW SWITCHER & SUB-TABS
function switchMainView(view) {
  const views = {
    sim: { sec: "viewSim", btn: "btnViewSim" },
    multi: { sec: "viewMulti", btn: "btnViewMulti" },
    hb: { sec: "viewHb", btn: "btnViewHb" }
  };

  Object.keys(views).forEach(k => {
    const sec = document.getElementById(views[k].sec);
    const btn = document.getElementById(views[k].btn);
    if (sec) sec.classList.toggle("hidden", k !== view);
    if (btn) btn.classList.toggle("active", k === view);
  });

  const ctrlRow = document.getElementById("simControlRow");
  if (ctrlRow) ctrlRow.classList.toggle("hidden", view !== "sim");

  if (view !== "sim") {
    stopScenarioAutoPlay();
    stopAutoClock();
  }
  if (view !== "multi" && typeof stopMultiClock === "function") {
    stopMultiClock();
  }

  if (view === "multi" && typeof renderMultiEcuView === "function") {
    renderMultiEcuView();
  } else if (view === "hb") {
    if (typeof renderCurrentHandbookView === "function") {
      renderCurrentHandbookView();
    } else if (typeof switchHbTab1 === "function") {
      switchHbTab1(activeHbTab1);
    } else {
      if (typeof renderHbSubNav === "function") renderHbSubNav();
      if (typeof renderHandbookContent === "function") renderHandbookContent();
    }
  }
}

function switchCfgTab(tabIdx) {
  const tabs = document.querySelectorAll("#cfgTabs .tab");
  tabs.forEach((t, i) => {
    if (i === tabIdx) t.classList.add("active");
    else t.classList.remove("active");
  });

  for (let i = 0; i < 6; i++) {
    const pane = document.getElementById(`cfgPane${i}`);
    if (pane) {
      if (i === tabIdx) pane.classList.remove("hidden");
      else pane.classList.add("hidden");
    }
  }
}

function toggleTheme() {
  const isDark = !document.body.classList.contains("light");
  const lbl = document.getElementById("lblThemeText");
  if (isDark) {
    document.body.classList.add("light");
    if (lbl) lbl.innerText = "Tối";
  } else {
    document.body.classList.remove("light");
    if (lbl) lbl.innerText = "Sáng";
  }
  renderAll();
  if (typeof renderMultiEcuView === "function") renderMultiEcuView();
}

// 10. FLOATING CONFIG HOVER TOOLTIP (>1000ms HOVER DELAY)
function initTooltipHandlers() {
  const popup = document.getElementById("cfgTooltipPopup");
  if (!popup) return;

  const cfgElements = document.querySelectorAll("[data-cfg-key]");
  cfgElements.forEach(el => {
    el.addEventListener("mouseenter", e => {
      const key = el.getAttribute("data-cfg-key");
      const data = configTooltipData[key];
      if (!data) return;

      tooltipTimer = setTimeout(() => {
        document.getElementById("ttParamName").innerText = data.name;
        document.getElementById("ttParamPath").innerText = data.path;
        document.getElementById("ttSwsCode").innerText = data.sws;
        document.getElementById("ttDesc").innerText = data.desc;
        document.getElementById("ttRange").innerText = data.range;
        document.getElementById("ttTypical").innerText = data.typical;
        document.getElementById("ttTechNote").innerText = "💡 Lưu ý kỹ thuật: " + data.note;

        const rect = el.getBoundingClientRect();
        let top = rect.top - 8;
        let left = rect.right + 12;

        if (left + 440 > window.innerWidth) {
          left = rect.left - 450;
        }
        if (top + 280 > window.innerHeight) {
          top = window.innerHeight - 300;
        }

        popup.style.top = Math.max(10, top) + "px";
        popup.style.left = Math.max(10, left) + "px";
        popup.classList.remove("hidden");
      }, 1000); // 1.0 second hover delay
    });

    el.addEventListener("mouseleave", () => {
      if (tooltipTimer) { clearTimeout(tooltipTimer); tooltipTimer = null; }
      popup.classList.add("hidden");
    });
  });
}

// 11. CODE EXPORTERS (ARXML, CanNm_Cfg.h, CanNm_Lcfg.c, JSON)
function generateARXML() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- AUTOSAR CanNM Configuration ARXML Generated by CanNM Workbench v3.0 -->
<AUTOSAR xmlns="http://autosar.org/schema/r4.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <AR-PACKAGES>
    <AR-PACKAGE>
      <SHORT-NAME>CanNm_Config</SHORT-NAME>
      <ELEMENTS>
        <ECUC-MODULE-CONFIGURATION-VALUES>
          <SHORT-NAME>CanNm</SHORT-NAME>
          <DEFINITION-REF DEST="ECUC-MODULE-DEF">/AUTOSAR/EcucDefs/CanNm</DEFINITION-REF>
          <CONTAINERS>
            <ECUC-CONTAINER-VALUE>
              <SHORT-NAME>CanNmGlobalConfig</SHORT-NAME>
              <PARAMETER-VALUES>
                <ECUC-NUMERICAL-PARAM-VALUE>
                  <DEFINITION-REF DEST="ECUC-BOOLEAN-PARAM-DEF">/CanNm/CanNmDevErrorDetect</DEFINITION-REF>
                  <VALUE>${ecucConfig.CanNmDevErrorDetect ? "true" : "false"}</VALUE>
                </ECUC-NUMERICAL-PARAM-VALUE>
                <ECUC-NUMERICAL-PARAM-VALUE>
                  <DEFINITION-REF DEST="ECUC-BOOLEAN-PARAM-DEF">/CanNm/CanNmPassiveModeEnabled</DEFINITION-REF>
                  <VALUE>${ecucConfig.CanNmPassiveModeEnabled ? "true" : "false"}</VALUE>
                </ECUC-NUMERICAL-PARAM-VALUE>
              </PARAMETER-VALUES>
            </ECUC-CONTAINER-VALUE>
            <ECUC-CONTAINER-VALUE>
              <SHORT-NAME>CanNmChannelConfig_0</SHORT-NAME>
              <PARAMETER-VALUES>
                <ECUC-NUMERICAL-PARAM-VALUE>
                  <DEFINITION-REF DEST="ECUC-INTEGER-PARAM-DEF">/CanNm/CanNmNodeId</DEFINITION-REF>
                  <VALUE>${ecucConfig.CanNmNodeId}</VALUE>
                </ECUC-NUMERICAL-PARAM-VALUE>
                <ECUC-NUMERICAL-PARAM-VALUE>
                  <DEFINITION-REF DEST="ECUC-FLOAT-PARAM-DEF">/CanNm/CanNmMsgCycleTime</DEFINITION-REF>
                  <VALUE>${ecucConfig.CanNmMsgCycleTime / 1000.0}</VALUE>
                </ECUC-NUMERICAL-PARAM-VALUE>
                <ECUC-NUMERICAL-PARAM-VALUE>
                  <DEFINITION-REF DEST="ECUC-FLOAT-PARAM-DEF">/CanNm/CanNmTimeoutTime</DEFINITION-REF>
                  <VALUE>${ecucConfig.CanNmTimeoutTime / 1000.0}</VALUE>
                </ECUC-NUMERICAL-PARAM-VALUE>
                <ECUC-NUMERICAL-PARAM-VALUE>
                  <DEFINITION-REF DEST="ECUC-FLOAT-PARAM-DEF">/CanNm/CanNmWaitBusSleepTime</DEFINITION-REF>
                  <VALUE>${ecucConfig.CanNmWaitBusSleepTime / 1000.0}</VALUE>
                </ECUC-NUMERICAL-PARAM-VALUE>
                <ECUC-NUMERICAL-PARAM-VALUE>
                  <DEFINITION-REF DEST="ECUC-BOOLEAN-PARAM-DEF">/CanNm/CanNmPnEnabled</DEFINITION-REF>
                  <VALUE>${ecucConfig.CanNmPnEnabled ? "true" : "false"}</VALUE>
                </ECUC-NUMERICAL-PARAM-VALUE>
              </PARAMETER-VALUES>
            </ECUC-CONTAINER-VALUE>
          </CONTAINERS>
        </ECUC-MODULE-CONFIGURATION-VALUES>
      </ELEMENTS>
    </AR-PACKAGE>
  </AR-PACKAGES>
</AUTOSAR>`;
}

function generateCanNmCfgH() {
  return `/* =========================================================================
 * File: CanNm_Cfg.h
 * Pre-compile Configuration Header for AUTOSAR CanNM R22-11
 * ========================================================================= */
#ifndef CANNM_CFG_H
#define CANNM_CFG_H

#define CANNM_DEV_ERROR_DETECT              (${ecucConfig.CanNmDevErrorDetect ? "STD_ON" : "STD_OFF"})
#define CANNM_PASSIVE_MODE_ENABLED          (${ecucConfig.CanNmPassiveModeEnabled ? "STD_ON" : "STD_OFF"})
#define CANNM_ACTIVE_WAKEUP_BIT_ENABLED     (${ecucConfig.CanNmActiveWakeupBitEnabled ? "STD_ON" : "STD_OFF"})
#define CANNM_NODE_DETECTION_ENABLED        (${ecucConfig.CanNmNodeDetectionEnabled ? "STD_ON" : "STD_OFF"})
#define CANNM_PN_SUPPORTED                  (${ecucConfig.CanNmPnEnabled ? "STD_ON" : "STD_OFF"})
#define CANNM_COM_USER_DATA_SUPPORT         (${ecucConfig.CanNmComUserDataSupport ? "STD_ON" : "STD_OFF"})
#define CANNM_IMMEDIATE_RESTART_ENABLED     (${ecucConfig.CanNmImmediateRestartEnabled ? "STD_ON" : "STD_OFF"})

#define CANNM_MAIN_FUNCTION_PERIOD          (${ecucConfig.CanNmMainFunctionPeriod}U)
#define CANNM_NUMBER_OF_CHANNELS            (1U)

#endif /* CANNM_CFG_H */`;
}

function generateCanNmLcfgC() {
  return `/* =========================================================================
 * File: CanNm_Lcfg.c
 * Link-time Configuration for AUTOSAR CanNM R22-11
 * ========================================================================= */
#include "CanNm.h"
#include "CanNm_Cbk.h"

const CanNm_ChannelConfigType CanNm_ChannelConfig[CANNM_NUMBER_OF_CHANNELS] = {
    {
        .CanNmNodeId = 0x${ecucConfig.CanNmNodeId.toString(16).toUpperCase()}U,
        .CanNmBaseCanId = 0x${ecucConfig.CanNmBaseCanId.toString(16).toUpperCase()}U,
        .CanNmMsgCycleTime = ${ecucConfig.CanNmMsgCycleTime}U,
        .CanNmMsgCycleOffset = ${ecucConfig.CanNmMsgCycleOffset}U,
        .CanNmRepeatMessageTime = ${ecucConfig.CanNmRepeatMessageTime}U,
        .CanNmTimeoutTime = ${ecucConfig.CanNmTimeoutTime}U,
        .CanNmWaitBusSleepTime = ${ecucConfig.CanNmWaitBusSleepTime}U,
        .CanNmImmediateNmTransmissions = ${ecucConfig.CanNmImmediateNmTransmissions}U,
        .CanNmImmediateNmCycleTime = ${ecucConfig.CanNmImmediateNmCycleTime}U,
        .CanNmPnEnabled = ${ecucConfig.CanNmPnEnabled ? "TRUE" : "FALSE"},
        .CanNmPnInfoOffset = ${ecucConfig.CanNmPnInfoOffset}U,
        .CanNmPnInfoLength = ${ecucConfig.CanNmPnInfoLength}U
    }
};

const CanNm_ConfigType CanNm_Config = {
    .ChannelConfigPtr = CanNm_ChannelConfig
};`;
}

function generateJsonConfig() {
  return JSON.stringify(ecucConfig, null, 2);
}

function openExportModal() {
  const modal = document.getElementById("exportModal");
  if (modal) modal.classList.remove("hidden");
  switchExportTab(activeExportTab);
}

function closeExportModal() {
  const modal = document.getElementById("exportModal");
  if (modal) modal.classList.add("hidden");
}

function switchExportTab(tabName) {
  activeExportTab = tabName;
  const tabs = document.querySelectorAll("#exportModal .tab");
  const names = ["arxml", "cfg_h", "lcfg_c", "json"];
  tabs.forEach((t, i) => {
    if (names[i] === tabName) t.classList.add("active");
    else t.classList.remove("active");
  });

  const viewer = document.getElementById("exportCodeView");
  if (!viewer) return;

  if (tabName === "arxml") viewer.innerText = generateARXML();
  else if (tabName === "cfg_h") viewer.innerText = generateCanNmCfgH();
  else if (tabName === "lcfg_c") viewer.innerText = generateCanNmLcfgC();
  else if (tabName === "json") viewer.innerText = generateJsonConfig();
}

function copyExportCode() {
  const viewer = document.getElementById("exportCodeView");
  if (!viewer) return;
  navigator.clipboard.writeText(viewer.innerText).then(() => {
    alert("Đã sao chép mã cấu hình vào Clipboard thành công!");
  });
}

function downloadExportFile() {
  const viewer = document.getElementById("exportCodeView");
  if (!viewer) return;
  const content = viewer.innerText;
  let filename = "CanNm.arxml";
  let mime = "application/xml";

  if (activeExportTab === "cfg_h") { filename = "CanNm_Cfg.h"; mime = "text/x-c"; }
  else if (activeExportTab === "lcfg_c") { filename = "CanNm_Lcfg.c"; mime = "text/x-c"; }
  else if (activeExportTab === "json") { filename = "CanNm_Config.json"; mime = "application/json"; }

  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadStandaloneHTML() {
  const htmlDoc = "<!DOCTYPE html>\n" + document.documentElement.outerHTML;
  const blob = new Blob([htmlDoc], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "AUTOSAR_CanNM_Simulator.html";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 12. MASTER RENDER ALL
function renderAll() {
  // Update Header Badges
  const clockEl = document.getElementById("lblSimClock");
  if (clockEl) clockEl.innerText = `t = ${simState.clockMs} ms`;

  const stateBadge = document.getElementById("lblHeaderStateBadge");
  if (stateBadge) {
    if (simState.mode === "NM_MODE_BUS_SLEEP") {
      stateBadge.innerText = "BUS-SLEEP MODE";
      stateBadge.className = "badge ok";
    } else if (simState.mode === "NM_MODE_PREPARE_BUS_SLEEP") {
      stateBadge.innerText = "PREPARE BUS-SLEEP";
      stateBadge.className = "badge err";
    } else {
      stateBadge.innerText = `NETWORK: ${simState.subState.replace("NM_STATE_", "")}`;
      stateBadge.className = "badge sky";
    }
  }

  const canIdBadge = document.getElementById("lblCanIdBadge");
  if (canIdBadge) {
    canIdBadge.innerText = "CAN ID: 0x" + (ecucConfig.CanNmBaseCanId + ecucConfig.CanNmNodeId).toString(16).toUpperCase();
  }

  const btnComm = document.getElementById("btnToggleComm");
  if (btnComm) {
    if (!simState.engine.msgTxEnabled) {
      btnComm.innerText = "🔊 Enable Comm";
      btnComm.classList.add("amber");
    } else {
      btnComm.innerText = "🔇 Toggle Comm";
      btnComm.classList.remove("amber");
    }
  }

  renderPduFrameGrid();
  render8BitRegisters();
  renderTimers();
  renderStateMachine();
  renderSvgArchitecture();
  renderInspector();
  renderTraceLog();
}
