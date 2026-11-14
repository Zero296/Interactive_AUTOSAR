// ================= PART 5: UI RENDERERS, STEPPER, TOOLTIP (>1S DEM STYLE) & EXPORTS =================

let currentMainView = "sim";
let currentTheme = "dark";
let currentCfgTab = 0;
let currentInspTab = 0;
let selectedModId = "MOD_NVM";
let currentScenarioIdx = 0;
let currentStepIdx = -1;
let lastExecutedStepMeta = null;
let stepSnapshots = [];
let scenAutoTimer = null;
let clockAutoTimer = null;
let currentExportTab = 0;

function escHtml(str) {
  return String(str === undefined || str === null ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function stopAutoTimers() {
  if (scenAutoTimer) { clearInterval(scenAutoTimer); scenAutoTimer = null; }
  if (clockAutoTimer) { clearInterval(clockAutoTimer); clockAutoTimer = null; }
  const b1 = document.getElementById("btnAutoPlay");
  if (b1) b1.textContent = "▶ Tự Động Kịch Bản";
  const b2 = document.getElementById("btnAutoClock");
  if (b2) b2.textContent = "⏱ Auto Clock";
}

// ---------------- MAIN NAVIGATION & THEME ----------------
function switchMainView(viewName) {
  currentMainView = viewName === "hb" ? "hb" : "sim";
  const vs = document.getElementById("viewSim");
  const vh = document.getElementById("viewHb");
  const bs = document.getElementById("btnViewSim");
  const bh = document.getElementById("btnViewHb");
  if (vs) vs.classList.toggle("hidden", currentMainView !== "sim");
  if (vh) vh.classList.toggle("hidden", currentMainView !== "hb");
  if (bs) bs.classList.toggle("active", currentMainView === "sim");
  if (bh) bh.classList.toggle("active", currentMainView === "hb");
  hideConfigTooltip();
  if (currentMainView === "hb" && typeof renderCurrentHandbookView === "function") {
    renderCurrentHandbookView();
  }
}

function toggleTheme() {
  currentTheme = currentTheme === "dark" ? "light" : "dark";
  document.body.classList.toggle("light", currentTheme === "light");
  const btn = document.getElementById("btnTheme");
  if (btn) btn.textContent = currentTheme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode";
}

function switchCfgTab(idx) {
  currentCfgTab = idx;
  for (let i = 0; i < 6; i++) {
    const tb = document.getElementById("cfgTabBtn" + i);
    const pn = document.getElementById("cfgPane" + i);
    if (tb) tb.classList.toggle("active", i === idx);
    if (pn) pn.classList.toggle("hidden", i !== idx);
  }
  hideConfigTooltip();
}

function switchInspTab(idx) {
  currentInspTab = idx;
  for (let i = 0; i < 4; i++) {
    const tb = document.getElementById("inspTabBtn" + i);
    if (tb) tb.classList.toggle("active", i === idx);
  }
  renderInspector();
}

function selectModule(modId) {
  if (!MODULES_INFO[modId]) return;
  selectedModId = modId;
  currentInspTab = 1;
  for (let i = 0; i < 4; i++) {
    const tb = document.getElementById("inspTabBtn" + i);
    if (tb) tb.classList.toggle("active", i === 1);
  }
  renderSvgArchitecture();
  renderInspector();
}

function selectNvmBlock(blockId) {
  const id = Math.max(0, Math.min(5, Number(blockId) || 0));
  if (!simState) return;
  simState.selectedBlockId = id;
  if (id > 0) syncBlockToEcuc(id);
  syncConfigToDOM();
  updateDerivedRegisters();
  renderAll();
}

// ---------------- QUICK ACTIONS ----------------
function qaSelectBlock() {
  const sel = document.getElementById("qaBlockSelect");
  if (!sel) return;
  selectNvmBlock(parseInt(sel.value, 10) || 3);
}

function getQaSelectedBlockId() {
  const sel = document.getElementById("qaBlockSelect");
  return sel ? (parseInt(sel.value, 10) || 3) : (simState ? simState.selectedBlockId : 3);
}

function qaReadBlock() {
  api_NvM_ReadBlock(getQaSelectedBlockId(), false);
  renderAll();
}

function qaWriteBlock() {
  api_NvM_WriteBlock(getQaSelectedBlockId(), false);
  renderAll();
}

function qaSetRamStatusDirty() {
  const id = getQaSelectedBlockId();
  const blk = getBlockById(id);
  api_NvM_SetRamBlockStatus(id, !(blk && blk.ramChanged));
  renderAll();
}

function qaExecuteMaintAction() {
  const actSel = document.getElementById("qaMaintSelect");
  const act = actSel ? actSel.value : "RESTORE";
  const id = getQaSelectedBlockId();
  const blk = getBlockById(id);
  if (act === "RESTORE") api_NvM_RestoreBlockDefaults(id, false);
  else if (act === "INVALIDATE") api_NvM_InvalidateNvBlock(id);
  else if (act === "ERASE") api_NvM_EraseNvBlock(id);
  else if (act === "PROTECT") api_NvM_SetBlockProtection(id, !(blk && blk.writeProtected));
  else if (act === "VALIDATE_ALL") api_NvM_ValidateAll();
  else if (act === "CANCEL_WRITE_ALL") api_NvM_CancelWriteAll();
  renderAll();
}

function qaRunReadAll() {
  api_NvM_ReadAll();
  renderAll();
}

function qaRunWriteAll() {
  api_NvM_WriteAll();
  renderAll();
}

function qaToggleCorruptNv0() {
  api_CorruptNvCopy(getQaSelectedBlockId(), 0, "TOGGLE");
  renderAll();
}

function qaTriggerImmediateCrash() {
  const b5 = getBlockById(5);
  if (b5) {
    b5.ramData[0] = (b5.ramData[0] + 1) & 0xFF;
    b5.ramData[7] = (b5.ramData[7] + 1) & 0xFF;
    b5.crcCompMechanism = false;
    recomputeBlockMetadata(b5);
  }
  api_NvM_WriteBlock(5, false);
  renderAll();
}

function modifySelectedBlockRam() {
  const blk = getSelectedBlock();
  if (!blk || blk.id === 0) return;
  blk.ramData[0] = (blk.ramData[0] + 1) & 0xFF;
  blk.ramValid = true;
  blk.ramChanged = true;
  recomputeBlockMetadata(blk);
  pushTrace("info", "SWC Edit RAM", "Block #" + blk.id, "Modify RAM[0] -> 0x" + blk.ramData[0].toString(16).toUpperCase().padStart(2, "0"), "Sửa trực tiếp byte [0] của RAM Block #" + blk.id + " và đánh dấu Dirty.");
  updateDerivedRegisters();
  renderAll();
}

function corruptSelectedBlockNv(copyIdx) {
  const blk = getSelectedBlock();
  if (!blk || blk.id === 0) return;
  api_CorruptNvCopy(blk.id, copyIdx || 0, "TOGGLE");
  renderAll();
}

// ---------------- SCENARIO STEPPER & WHAT-IF ----------------
function loadScenario(idxOrId) {
  stopAutoTimers();
  let idx = 0;
  if (typeof idxOrId === "string") {
    const found = SCENARIOS.findIndex(s => s.id === idxOrId);
    idx = found >= 0 ? found : 0;
  } else if (typeof idxOrId === "number") {
    idx = Math.max(0, Math.min(SCENARIOS.length - 1, idxOrId));
  }
  currentScenarioIdx = idx;
  currentStepIdx = -1;
  lastExecutedStepMeta = null;
  stepSnapshots = [];

  const scen = SCENARIOS[idx];
  scen.setup();

  const sel = document.getElementById("scenSelect");
  if (sel) sel.value = scen.id;
  const badge = document.getElementById("scenIdBadge");
  if (badge) badge.textContent = scen.id;

  const sumBox = document.getElementById("scenSummaryBox");
  if (sumBox) {
    sumBox.innerHTML = "<strong>" + escHtml(scen.title) + "</strong><div style='margin-top:3px'>" + escHtml(scen.summary) + "</div>";
  }

  const wifBox = document.getElementById("whatIfContainer");
  if (wifBox) {
    wifBox.innerHTML = scen.whatIfs.map((w, i) =>
      "<button class='whatif-btn' onclick='runWhatIf(" + i + ")'>" + escHtml(w.label) + "</button>"
    ).join("");
  }
  renderAll();
}

function onScenarioSelectChange() {
  const sel = document.getElementById("scenSelect");
  if (!sel) return;
  loadScenario(sel.value);
}

function resetCurrentScenario() {
  loadScenario(currentScenarioIdx);
}

function nextScenarioStep() {
  const scen = SCENARIOS[currentScenarioIdx];
  if (!scen) return;
  if (currentStepIdx + 1 >= scen.steps.length) {
    if (scenAutoTimer) toggleScenarioAutoPlay();
    return;
  }
  stepSnapshots.push({
    ecucConfig: deepClone(ecucConfig),
    simState: deepClone(simState),
    currentStepIdx: currentStepIdx,
    lastExecutedStepMeta: lastExecutedStepMeta ? deepClone(lastExecutedStepMeta) : null,
    selectedModId: selectedModId
  });
  currentStepIdx += 1;
  const st = scen.steps[currentStepIdx];
  lastExecutedStepMeta = {
    title: st.title,
    detail: st.detail,
    inputSrc: st.inputSrc,
    outputDst: st.outputDst,
    apiCall: st.apiCall
  };
  if (st.highlightMod) selectedModId = st.highlightMod;
  st.action();
  if (st.arrows && simState) simState.activeArrows = st.arrows.slice();
  renderAll();
}

function prevScenarioStep() {
  if (!stepSnapshots.length) return;
  stopAutoTimers();
  const snap = stepSnapshots.pop();
  ecucConfig = snap.ecucConfig;
  simState = snap.simState;
  currentStepIdx = snap.currentStepIdx;
  lastExecutedStepMeta = snap.lastExecutedStepMeta;
  selectedModId = snap.selectedModId || "MOD_NVM";
  syncConfigToDOM();
  updateDerivedRegisters();
  renderAll();
}

function toggleScenarioAutoPlay() {
  const btn = document.getElementById("btnAutoPlay");
  if (scenAutoTimer) {
    clearInterval(scenAutoTimer);
    scenAutoTimer = null;
    if (btn) btn.textContent = "▶ Tự Động Kịch Bản";
    return;
  }
  if (currentStepIdx + 1 >= SCENARIOS[currentScenarioIdx].steps.length) {
    resetCurrentScenario();
  }
  if (btn) btn.textContent = "⏸ Dừng Kịch Bản";
  scenAutoTimer = setInterval(() => {
    const scen = SCENARIOS[currentScenarioIdx];
    if (currentStepIdx + 1 >= scen.steps.length) {
      toggleScenarioAutoPlay();
    } else {
      nextScenarioStep();
    }
  }, 1450);
}

function toggleAutoClock() {
  const btn = document.getElementById("btnAutoClock");
  if (clockAutoTimer) {
    clearInterval(clockAutoTimer);
    clockAutoTimer = null;
    if (btn) btn.textContent = "⏱ Auto Clock";
    return;
  }
  if (btn) btn.textContent = "⏸ Dừng Clock";
  clockAutoTimer = setInterval(() => stepClockTick(10), 900);
}

function runWhatIf(idx) {
  stopAutoTimers();
  const scen = SCENARIOS[currentScenarioIdx];
  if (!scen || !scen.whatIfs[idx]) return;
  const w = scen.whatIfs[idx];
  lastExecutedStepMeta = {
    title: "Thử Nghiệm Nhanh: " + w.label,
    detail: "Đang chạy biến thể What-If trực tiếp trên trạng thái mô phỏng hiện tại.",
    inputSrc: "User What-If Preset",
    outputDst: "NvM Engine + Hardware Stack",
    apiCall: simState ? simState.lastApiCall : "What-If"
  };
  w.run();
  renderAll();
}

// ---------------- TOP HEADER & VALIDATION RENDERERS ----------------
function renderHeaderAndBadges() {
  const scen = SCENARIOS[currentScenarioIdx];
  const stepInd = document.getElementById("stepIndicator");
  if (stepInd && scen) stepInd.textContent = "Bước " + (currentStepIdx + 1) + " / " + scen.steps.length;

  const btnPrev = document.getElementById("btnPrevStep");
  if (btnPrev) btnPrev.disabled = stepSnapshots.length === 0;
  const btnNext = document.getElementById("btnNextStep");
  if (btnNext && scen) btnNext.disabled = currentStepIdx + 1 >= scen.steps.length;

  const ck = document.getElementById("clockVal");
  if (ck && simState) ck.textContent = simState.clockMs + " ms";

  const bInit = document.getElementById("hdrBadgeInit");
  if (bInit) {
    bInit.textContent = ecucConfig.NvMInitialized ? "NvM: INITIALIZED" : "NvM: UNINIT";
    bInit.className = "state-badge " + (ecucConfig.NvMInitialized ? "sb-ok" : "sb-err");
  }

  const blk = getSelectedBlock();
  const bBlk = document.getElementById("hdrBadgeBlk");
  if (bBlk && blk) bBlk.textContent = "Blk #" + blk.id + ": " + blk.shortName;

  const bRes = document.getElementById("hdrBadgeRes");
  if (bRes && blk) {
    bRes.textContent = "Result: " + blk.lastResult;
    const isErr = blk.lastResult.indexOf("NOT_OK") >= 0 || blk.lastResult.indexOf("FAILED") >= 0;
    const isWarn = blk.lastResult.indexOf("PENDING") >= 0 || blk.lastResult.indexOf("ROM") >= 0 || blk.lastResult.indexOf("INVALID") >= 0 || blk.lastResult.indexOf("CANCEL") >= 0;
    bRes.className = "state-badge " + (isErr ? "sb-err" : (isWarn ? "sb-warn" : (blk.lastResult === "NVM_REQ_OK" ? "sb-ok" : "sb-idle")));
  }

  const bQ = document.getElementById("hdrBadgeQ");
  if (bQ && simState) {
    bQ.textContent = "Q: " + simState.immediateQueue.length + " Imm / " + simState.standardQueue.length + " Std";
    bQ.className = "state-badge " + (simState.immediateQueue.length > 0 ? "sb-err" : (simState.standardQueue.length > 0 ? "sb-warn" : "sb-idle"));
  }

  const qaBlk = getBlockById(getQaSelectedBlockId());
  const dirtyTxt = document.getElementById("qaTxtDirty");
  if (dirtyTxt && qaBlk) dirtyTxt.textContent = qaBlk.ramChanged ? "DIRTY" : "Clean";
  const corrTxt = document.getElementById("qaTxtCorrupt");
  if (corrTxt && qaBlk) {
    const c0 = getActiveNvCopy(qaBlk, 0);
    corrTxt.textContent = (c0 && (c0.corruptedCrc || c0.wrongStaticId)) ? "CORRUPT" : "OK";
  }
}

function renderConfigValidation() {
  const box = document.getElementById("cfgValidationBox");
  if (!box) return;
  const msgs = [];
  if (!ecucConfig.NvMInitialized) {
    msgs.push({ cls: "err", txt: "⚠️ NvMInitialized=FALSE: Mọi lời gọi API (trừ NvM_Init) sẽ báo DET NVM_E_UNINIT (0x14)!" });
  }
  if (!ecucConfig.NvMJobPrioritization) {
    msgs.push({ cls: "", txt: "ℹ️ NvMJobPrioritization=FALSE: Immediate Prio=0 KHÔNG thể cắt ngang Job thường." });
  }
  if (ecucConfig.InjectMemIfWriteError) {
    msgs.push({ cls: "err", txt: "💥 Fault Injector: InjectMemIfWriteError=TRUE đang giả lập lỗi Flash vật lý!" });
  }
  if (ecucConfig.InjectMirrorBusyConflict) {
    msgs.push({ cls: "", txt: "⏳ Fault Injector: InjectMirrorBusyConflict=TRUE đang giả lập SWC bận cập nhật Mirror." });
  }
  const cid = getConfigIdPair();
  if (cid.compiled !== cid.stored) {
    msgs.push({ cls: "", txt: "🔄 ConfigId Lệch (" + formatHex16(cid.compiled) + " != " + formatHex16(cid.stored) + "): Dynamic Configuration sẽ kích hoạt." });
  }
  box.innerHTML = msgs.map(m => "<div class='cfg-alert " + m.cls + "'>" + escHtml(m.txt) + "</div>").join("");
}

// ---------------- TIER 1A: BLOCK ANATOMY + 6 BLOCKS TABLE ----------------
function renderBlockAnatomyAndTable() {
  const blk = getSelectedBlock();
  const hdr = document.getElementById("blockAnatomyHdr");
  const grid = document.getElementById("blockAnatomyGrid");
  const tbody = document.getElementById("blockTableBody");

  if (hdr && blk) {
    hdr.innerHTML =
      "<div style='display:flex;align-items:center;gap:6px;flex-wrap:wrap'>" +
        "<span class='pill-tag pt-pri'>Block #" + blk.id + ": " + escHtml(blk.name) + "</span>" +
        "<span class='pill-tag pt-cyan'>" + escHtml(blk.blockType) + "</span>" +
        "<span class='pill-tag pt-mut'>Prio=" + blk.jobPriority + " | Len=" + blk.length + "B | Dev=" + blk.deviceId + "</span>" +
      "</div>" +
      (blk.id > 0
        ? "<div style='display:flex;gap:5px'>" +
            "<button class='btn btn-sm' onclick='modifySelectedBlockRam()'>✏️ Sửa RAM (+1)</button>" +
            "<button class='btn btn-sm qa-warn' onclick='corruptSelectedBlockNv(0)'>💥 Toggle CRC NV#0</button>" +
          "</div>"
        : "<span class='pill-tag pt-pur'>Multi-Block Controller</span>");
  }

  if (grid && blk) {
    const nv0 = getActiveNvCopy(blk, 0);
    const nv1 = blk.blockType === "NVM_BLOCK_REDUNDANT" ? blk.nvCopies[1] : null;
    const renderCopyBox = (copy, label) => {
      if (!copy) return "<div class='anat-copy dim'>Không tồn tại bản sao</div>";
      const bad = copy.corruptedCrc || copy.wrongStaticId || copy.invalidated || copy.erased;
      const statusTag = copy.wrongStaticId ? "<span class='pill-tag pt-err'>WRONG_ID=" + copy.staticIdTag + "</span>"
        : copy.invalidated ? "<span class='pill-tag pt-warn'>INVALIDATED</span>"
        : copy.erased ? "<span class='pill-tag pt-warn'>ERASED 0xFF</span>"
        : copy.corruptedCrc ? "<span class='pill-tag pt-err'>CRC MISMATCH (" + copy.storedCrc + ")</span>"
        : "<span class='pill-tag pt-ok'>VALID (" + copy.storedCrc + ")</span>";
      return "<div class='anat-copy " + (bad ? "err" : "ok") + "'>" +
        "<div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:2px'><strong>" + escHtml(label) + "</strong>" + statusTag + "</div>" +
        "<div class='mono' style='font-size:10px'>[ID:" + (blk.staticBlockIdCheck ? ("0x000" + (copy.wrongStaticId ? copy.staticIdTag : blk.id)) : "OFF") + "] [" + bytesToHex(copy.data) + "]</div>" +
      "</div>";
    };

    const nvContentHtml = blk.id === 0
      ? "<div class='anat-frame'>Quản lý tiến trình đa khối:<br><strong>" + escHtml(blk.lastMultiOp) + "</strong> → <span class='mono'>" + escHtml(blk.lastResult) + "</span></div>"
      : (blk.blockType === "NVM_BLOCK_DATASET" && blk.datasetSlots
          ? blk.datasetSlots.slice(0, 4).map(s =>
              "<div class='anat-copy " + (s.idx === blk.dataIndex ? "ok" : "dim") + "' style='margin-bottom:3px'>" +
                "<strong>Idx=" + s.idx + (s.idx === blk.dataIndex ? " ◀ ACTIVE" : "") + "</strong> (" + escHtml(s.label) + "): <span class='mono'>" + bytesToHex(s.data, 4) + "..</span>" +
              "</div>"
            ).join("")
          : renderCopyBox(nv0, "NV Copy #0 (Primary)") + (nv1 ? "<div style='margin-top:4px'>" + renderCopyBox(nv1, "NV Copy #1 (Redundant)") + "</div>" : "<div class='anat-copy dim' style='margin-top:4px'>NV Copy #1: Không có (Native)</div>"));

    grid.innerHTML =
      // Region 1: RAM & Mirror
      "<div class='anat-card ram'>" +
        "<div class='anat-title'><span>1. RAM &amp; Mirror</span><span class='pill-tag " + (blk.ramValid ? "pt-ok" : "pt-err") + "'>" + (blk.ramValid ? "VALID" : "INVALID") + "</span></div>" +
        "<div class='anat-frame mono'>" + (blk.id === 0 ? "Multi-Block State Controller" : ("[Payload] " + bytesToHex(blk.ramData) + "<br>[CRC] " + blk.crcType + " = " + blk.ramCrc)) + "</div>" +
        (blk.useSyncMechanism && blk.id > 0 ? ("<div class='anat-frame mono'>[Mirror] " + bytesToHex(blk.mirrorData) + "</div>") : "") +
        "<div class='anat-meta'>" +
          "<span class='pill-tag " + (blk.ramChanged ? "pt-warn" : "pt-mut") + "'>" + (blk.ramChanged ? "DIRTY (CHANGED)" : "Clean") + "</span>" +
          (blk.useSyncMechanism ? "<span class='pill-tag pt-cyan'>Explicit Mirror</span>" : "<span class='pill-tag pt-mut'>Direct PermRAM</span>") +
        "</div>" +
      "</div>" +
      // Region 2: NV Flash
      "<div class='anat-card nv'>" +
        "<div class='anat-title'><span>2. Non-Volatile (Fee/Fls)</span><span class='pill-tag pt-warn'>" + (blk.nvBlockNum || 0) + " NV Slots</span></div>" +
        nvContentHtml +
      "</div>" +
      // Region 3: ROM Default & Flags
      "<div class='anat-card rom'>" +
        "<div class='anat-title'><span>3. ROM Default &amp; Guard</span><span class='pill-tag pt-pur'>" + (blk.provideRomDefault ? "ROM OK" : "No ROM") + "</span></div>" +
        "<div class='anat-frame mono'>" + (blk.id === 0 ? "ConfigId Compiled: " + escHtml(ecucConfig.NvMConfigIdComparison) : ("[ROM] " + bytesToHex(blk.romData))) + "</div>" +
        "<div class='anat-meta'>" +
          "<span class='pill-tag " + (blk.writeProtected ? "pt-err" : "pt-ok") + "'>" + (blk.writeOnceLocked ? "WR_ONCE_LOCKED" : (blk.writeProtected ? "PROTECTED" : "Writable")) + "</span>" +
          "<span class='pill-tag pt-mut'>ResSW=" + (blk.resistantToChangedSw ? "T" : "F") + "</span>" +
          "<span class='pill-tag pt-mut'>R/W_All=" + (blk.selectForReadAll ? "R" : "-") + (blk.selectForWriteAll ? "W" : "-") + "</span>" +
        "</div>" +
      "</div>";
  }

  if (tbody && simState) {
    tbody.innerHTML = simState.blocks.map(b => {
      const isSel = b.id === simState.selectedBlockId;
      const isErr = b.lastResult.indexOf("FAILED") >= 0 || b.lastResult.indexOf("NOT_OK") >= 0 || b.redundancyLoss;
      const c0 = getActiveNvCopy(b, 0);
      const c1 = b.blockType === "NVM_BLOCK_REDUNDANT" ? b.nvCopies[1] : null;
      const nvStatus = b.id === 0 ? (b.lastMultiOp || "IDLE")
        : (c0 ? (c0.corruptedCrc ? "0:CRC!" : (c0.wrongStaticId ? "0:ID!" : (c0.invalidated ? "0:INV" : (c0.erased ? "0:FF" : "0:OK")))) : "-")
          + (c1 ? (" / " + (c1.corruptedCrc ? "1:CRC!" : "1:OK")) : "");
      return "<tr class='" + (isSel ? "blk-selected " : "") + (isErr ? "blk-err" : "") + "' onclick='selectNvmBlock(" + b.id + ")'>" +
        "<td class='mono'><strong>#" + b.id + "</strong></td>" +
        "<td><strong>" + escHtml(b.shortName) + "</strong></td>" +
        "<td class='mono'>" + escHtml(b.blockType.replace("NVM_BLOCK_", "")) + "</td>" +
        "<td class='mono'>P" + b.jobPriority + (b.useSyncMechanism ? "/Mirror" : "") + (b.blockType === "NVM_BLOCK_DATASET" ? ("/DS" + b.dataIndex) : "") + "</td>" +
        "<td class='mono'>" + (b.ramValid ? (b.ramChanged ? "DIRTY" : "VALID") : "INVAL") + "</td>" +
        "<td class='mono'>" + escHtml(nvStatus) + "</td>" +
        "<td class='mono'>" + escHtml(b.ramCrc) + "</td>" +
        "<td class='mono'>" + escHtml(b.lastResult.replace("NVM_REQ_", "")) + "</td>" +
      "</tr>";
    }).join("");
  }
}

// ---------------- TIER 1B: DUAL 8-BIT REGISTERS ----------------
function renderBitGroup(containerId, hexId, bitsDef, byteVal, prevByteVal, regType) {
  const hexEl = document.getElementById(hexId);
  if (hexEl) hexEl.textContent = "0x" + (byteVal & 0xFF).toString(16).toUpperCase().padStart(2, "0");
  const cont = document.getElementById(containerId);
  if (!cont) return;
  cont.innerHTML = bitsDef.map(b => {
    const isOn = (byteVal & b.mask) !== 0;
    const isChg = ((byteVal ^ prevByteVal) & b.mask) !== 0;
    const cls = "bit-box" + (isOn ? " on" : "") + (b.tone ? (" " + b.tone + "-bit") : "") + (isChg ? " chg" : "");
    return "<div class='" + cls + "' title='" + escHtml(b.name + ": " + b.desc) + "' onclick=\"toggleRegisterBit('" + regType + "'," + b.mask + ")\">" +
      "<div class='bit-pos mono'>B" + b.bit + "</div>" +
      "<div class='bit-val mono'>" + (isOn ? "1" : "0") + "</div>" +
      "<div class='bit-tag'>" + escHtml(b.tag) + "</div>" +
    "</div>";
  }).join("");
}

function render8BitRegisters() {
  if (!simState) return;
  renderBitGroup("regABits", "regAHex", NVM_ADMIN_BITS, simState.regAByte, simState.prevRegAByte, "A");
  renderBitGroup("regBBits", "regBHex", NVM_JOB_BITS, simState.regBByte, simState.prevRegBByte, "B");
}

// ---------------- PANEL 2: QUEUES & DUAL STATE MACHINES ----------------
function renderQueuesAndStateMachines() {
  if (!simState) return;
  const limits = getQueueLimits();
  const execBadge = document.getElementById("nvmExecBadge");
  if (execBadge) {
    execBadge.textContent = "MemIf: " + simState.memIfMode.replace("MEMIF_MODE_", "") + "/" + simState.memIfState.replace("MEMIF_", "") + " | Retries: " + simState.retryCount + " | Preempts: " + simState.immPreemptCount;
  }

  const qGrid = document.getElementById("queuesGrid");
  if (qGrid) {
    const immPct = Math.round((simState.immediateQueue.length / limits.immCap) * 100);
    const stdPct = Math.round((simState.standardQueue.length / limits.stdCap) * 100);
    const mbTotal = simState.multiBlockJob ? (simState.multiBlockJob.processed.length + simState.multiBlockJob.remainingIds.length) : 0;
    const mbPct = simState.multiBlockJob && mbTotal ? Math.round((simState.multiBlockJob.processed.length / mbTotal) * 100) : 0;
    const memPct = simState.memIfState !== "MEMIF_IDLE" ? 100 : (simState.activeJob ? 55 : 0);

    qGrid.innerHTML =
      "<div class='timer-card " + (simState.immediateQueue.length || (simState.activeJob && simState.activeJob.isImmediate) ? "imm-active" : "") + "'>" +
        "<div class='timer-top'><span>🚨 Imm Queue (P0)</span><span class='mono'>" + simState.immediateQueue.length + "/" + limits.immCap + "</span></div>" +
        "<div class='timer-bar'><div class='timer-fill' style='width:" + immPct + "%;background:var(--err)'></div></div>" +
      "</div>" +
      "<div class='timer-card " + (simState.standardQueue.length ? "active" : "") + "'>" +
        "<div class='timer-top'><span>📋 Std Queue (P1..255)</span><span class='mono'>" + simState.standardQueue.length + "/" + limits.stdCap + "</span></div>" +
        "<div class='timer-bar'><div class='timer-fill' style='width:" + stdPct + "%'></div></div>" +
      "</div>" +
      "<div class='timer-card " + (simState.multiBlockJob ? "active" : "") + "'>" +
        "<div class='timer-top'><span>🔄 Multi-Block</span><span class='mono'>" + (simState.multiBlockJob ? simState.multiBlockJob.type : "IDLE") + "</span></div>" +
        "<div class='timer-bar'><div class='timer-fill' style='width:" + mbPct + "%;background:var(--pur)'></div></div>" +
      "</div>" +
      "<div class='timer-card " + (memPct ? "active" : "") + "'>" +
        "<div class='timer-top'><span>💾 MemIf/Fls</span><span class='mono'>" + simState.memIfMode.replace("MEMIF_MODE_", "") + "</span></div>" +
        "<div class='timer-bar'><div class='timer-fill' style='width:" + memPct + "%;background:var(--ok)'></div></div>" +
      "</div>";
  }

  const strip = document.getElementById("queueItemsStrip");
  if (strip) {
    const chips = [];
    if (simState.activeJob) {
      chips.push("<span class='q-chip " + (simState.activeJob.isImmediate ? "imm" : "std") + "'>▶ RUN #" + simState.activeJob.blockId + " " + simState.activeJob.service + " (" + simState.activeJob.phase + ")</span>");
    }
    if (simState.suspendedJob) {
      chips.push("<span class='q-chip susp'>⏸ SUSPENDED #" + simState.suspendedJob.blockId + " " + simState.suspendedJob.service + "</span>");
    }
    simState.immediateQueue.forEach(j => chips.push("<span class='q-chip imm'>IMM #" + j.blockId + " " + j.service + "</span>"));
    simState.standardQueue.forEach(j => chips.push("<span class='q-chip std'>P" + j.priority + " #" + j.blockId + " " + j.service + "</span>"));
    if (simState.multiBlockJob) {
      chips.push("<span class='q-chip multi'>" + simState.multiBlockJob.type + " [Left: " + (simState.multiBlockJob.remainingIds.join(",") || "Done") + "]</span>");
    }
    strip.innerHTML = chips.length ? chips.join("") : "<span style='color:var(--mut)'>Hàng đợi trống — Không có Single-Block hay Multi-Block Job đang chờ.</span>";
  }

  const jLbl = document.getElementById("smJobLbl");
  if (jLbl) jLbl.textContent = simState.jobState;
  const jStates = [
    { id: "NVM_IDLE", match: ["NVM_IDLE", "NVM_UNINIT"], cls: "active-ok", sub: "Sẵn sàng / Uninit" },
    { id: "NVM_READ_BLOCK / ALL", match: ["NVM_READ_BLOCK", "NVM_READ_ALL", "NVM_RESTORE_ROM"], cls: "active-pri", sub: "Đọc NV / Multi-Read" },
    { id: "NVM_MIRROR_SYNC", match: ["NVM_MIRROR_SYNC"], cls: "active-pur", sub: "Copy Explicit Mirror" },
    { id: "NVM_CALC_CRC", match: ["NVM_CALC_CRC"], cls: "active-warn", sub: "CRC & Skip Check" },
    { id: "NVM_WRITE_BLOCK / VERIFY", match: ["NVM_WRITE_BLOCK", "NVM_WRITE_ALL", "NVM_WRITE_VERIFY"], cls: "active-pri", sub: "Ghi & WriteVerify" },
    { id: "NVM_JOB_PREEMPTED", match: ["NVM_JOB_PREEMPTED"], cls: "active-err", sub: "Immediate Preempt!" }
  ];
  const jBox = document.getElementById("jobSmDiagram");
  if (jBox) {
    jBox.innerHTML = jStates.map(s => {
      const act = s.match.indexOf(simState.jobState) >= 0;
      return "<div class='sm-node " + (act ? s.cls : "") + "'><div class='sm-node-hdr'><span>" + escHtml(s.id) + "</span>" + (act ? "<span>●</span>" : "") + "</div><div style='color:var(--mut)'>" + escHtml(s.sub) + "</div></div>";
    }).join("");
  }

  const sLbl = document.getElementById("smStackLbl");
  if (sLbl) sLbl.textContent = simState.stackState;
  const sStates = [
    { id: "STACK_IDLE", match: ["STACK_IDLE", "STACK_CRC_CALC"], cls: "active-ok", sub: "MemIf / Fls Rảnh" },
    { id: "STACK_MEMIF_FAST", match: ["STACK_MEMIF_FAST"], cls: "active-pur", sub: "SetMode(FAST)" },
    { id: "STACK_FEE_READ", match: ["STACK_FEE_READ"], cls: "active-pri", sub: "MemIf→Fee→Fls Read" },
    { id: "STACK_FEE_WRITE / ERASE", match: ["STACK_FEE_WRITE", "STACK_FEE_ERASE"], cls: "active-warn", sub: "Fee Write / Erase" },
    { id: "STACK_MEMIF_CANCEL", match: ["STACK_MEMIF_CANCEL"], cls: "active-err", sub: "MemIf_Cancel (Prio=0)" },
    { id: "STACK_VERIFY_READ", match: ["STACK_VERIFY_READ"], cls: "active-ok", sub: "Readback Verify" }
  ];
  const sBox = document.getElementById("stackSmDiagram");
  if (sBox) {
    sBox.innerHTML = sStates.map(s => {
      const act = s.match.indexOf(simState.stackState) >= 0;
      return "<div class='sm-node " + (act ? s.cls : "") + "'><div class='sm-node-hdr'><span>" + escHtml(s.id) + "</span>" + (act ? "<span>●</span>" : "") + "</div><div style='color:var(--mut)'>" + escHtml(s.sub) + "</div></div>";
    }).join("");
  }
}

// ---------------- PANEL 3: ARCHITECTURE SVG RENDERER ----------------
function renderSvgArchitecture() {
  if (!simState) return;
  const blk = getSelectedBlock();
  const setTxt = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };

  setTxt("svgSub_MOD_SWC", blk ? ("Blk #" + blk.id + " RAM: " + (blk.ramValid ? (blk.ramChanged ? "DIRTY" : "VALID") : "INVALID")) : "RAM Ready");
  setTxt("svgSub_MOD_DCM_DEM", "DEM Faults: " + simState.demFaults.length + (simState.demFaults.length ? (" (" + simState.demFaults[0].eventId.replace("NVM_E_", "") + ")") : " (OK)"));
  setTxt("svgSub_MOD_BSWM", "MultiJob: " + simState.bswmJobMode + (ecucConfig.NvMBswMJobStatusInfo ? "" : " [Muted]"));
  const { periodMs } = getMainFnAndCrcBudget();
  setTxt("svgSub_MOD_RTE", "NvM_MainFunction: " + periodMs + "ms | " + (blk && blk.useSyncMechanism ? "Mirror Sync" : "Direct RAM"));
  setTxt("svgSub_MOD_CRC", blk && blk.useCrc ? (blk.crcType + " = " + blk.ramCrc) : "CRC: OFF");
  setTxt("svgSub_MOD_NVM1", "Init: " + (ecucConfig.NvMInitialized ? "INIT" : "UNINIT") + " | State: " + simState.jobState);
  setTxt("svgSub_MOD_NVM2", blk ? ("Blk #" + blk.id + " (" + blk.blockType.replace("NVM_BLOCK_", "") + ") | " + blk.lastResult) : "Idle");
  setTxt("svgSub_MOD_DET", "Faults: " + simState.detFaults.length + (simState.detFaults.length ? (" (" + simState.detFaults[0].name + ")") : " (OK)"));
  setTxt("svgSub_MOD_MEMIF", "Dev " + (blk ? blk.deviceId : "0") + " | " + simState.memIfMode.replace("MEMIF_MODE_", "") + " | " + simState.memIfState);
  setTxt("svgSub_MOD_FEE", "Fee/Ea: " + simState.feeState + " (Wear Leveling)");
  setTxt("svgSub_MOD_FLS", "Fls/Eep HW: " + simState.flsState);

  Object.keys(MODULES_INFO).forEach(m => {
    const g = document.getElementById("node_" + m);
    if (g) g.classList.toggle("selected", m === selectedModId);
  });

  const allArrows = [
    "arr_swc_rte", "arr_rte_nvm", "arr_nvm_rte", "arr_dcmdem_nvm", "arr_nvm_dem",
    "arr_bswm_nvm", "arr_nvm_bswm", "arr_nvm_crc", "arr_nvm_det", "arr_nvm_memif",
    "arr_memif_fee", "arr_fee_fls", "arr_fls_nvm"
  ];
  allArrows.forEach(aid => {
    const el = document.getElementById(aid);
    if (el) el.classList.toggle("active", (simState.activeArrows || []).indexOf(aid) >= 0);
  });
}

// ---------------- RIGHT INSPECTOR (4 TABS) ----------------
function generateLiveCCodeSnippet() {
  const blk = getSelectedBlock();
  if (!blk) return "";
  const id = blk.id || 3;
  const b = id === 0 ? simState.blocks[3] : blk;
  return "/* Auto-generated Live NvM C Snippet for Block #" + b.id + " (" + b.name + ") */\n" +
    "#include \"NvM.h\"\n#include \"MemIf.h\"\n\n" +
    "const NvM_BlockDescriptorType NvM_BlockCfg_" + b.id + " = {\n" +
    "  .BlockId               = " + b.id + "U,\n" +
    "  .BlockManagementType   = " + b.blockType + ",\n" +
    "  .BlockJobPriority      = " + b.jobPriority + "U,\n" +
    "  .NvBlockLength         = " + b.length + "U,\n" +
    "  .NvBlockNum            = " + b.nvBlockNum + "U,\n" +
    "  .RomBlockNum           = " + b.romBlockNum + "U,\n" +
    "  .CrcType               = " + (b.useCrc ? b.crcType : "NVM_CRC_NONE") + ",\n" +
    "  .CrcCompMechanism      = " + (b.crcCompMechanism ? "TRUE" : "FALSE") + ",\n" +
    "  .StaticBlockIDCheck    = " + (b.staticBlockIdCheck ? "TRUE" : "FALSE") + ",\n" +
    "  .WriteVerification     = " + (b.writeVerification ? "TRUE" : "FALSE") + ",\n" +
    "  .BlockUseSyncMechanism = " + (b.useSyncMechanism ? "TRUE" : "FALSE") + ",\n" +
    "  .WriteBlockOnce        = " + (b.writeOnce ? "TRUE" : "FALSE") + ",\n" +
    "  .SelectForReadAll      = " + (b.selectForReadAll ? "TRUE" : "FALSE") + ",\n" +
    "  .SelectForWriteAll     = " + (b.selectForWriteAll ? "TRUE" : "FALSE") + "\n" +
    "};\n\n" +
    "void App_RunNvmCycle_Blk" + b.id + "(void) {\n" +
    "  Std_ReturnType ret = E_OK;\n" +
    (b.blockType === "NVM_BLOCK_DATASET" ? ("  (void)NvM_SetDataIndex(" + b.id + "U, " + b.dataIndex + "U);\n") : "") +
    "  /* Last Sim API: " + (simState ? simState.lastApiCall : "NvM_Init(NULL_PTR)") + " */\n" +
    (b.useSyncMechanism
      ? ("  ret = NvM_WriteBlock(" + b.id + "U, NULL_PTR); /* Mirror Copy */\n")
      : ("  ret = NvM_WritePRAMBlock(" + b.id + "U);\n")) +
    "  NvM_SetRamBlockStatus(" + b.id + "U, TRUE);\n" +
    "}\n";
}

function renderInspector() {
  const body = document.getElementById("inspBody");
  if (!body || !simState) return;
  const blk = getSelectedBlock();

  if (currentInspTab === 0) {
    const scen = SCENARIOS[currentScenarioIdx];
    const meta = lastExecutedStepMeta || {
      title: "Trạng Thái Ban Đầu (" + scen.id + ")",
      detail: scen.summary,
      inputSrc: "EcuM / BswM / SWC",
      outputDst: "MemIf → Fee/Ea → Fls/Eep",
      apiCall: simState.lastApiCall
    };
    const demHtml = simState.demFaults.length
      ? simState.demFaults.slice(0, 4).map(d => "<div class='trace-item err'><strong>" + escHtml(d.eventId) + "</strong><div style='font-size:10px'>" + escHtml(d.detail) + "</div></div>").join("")
      : "<div class='trace-item ok'>Không có sự kiện lỗi DEM NVM_E_* nào đang kích hoạt.</div>";
    const detHtml = simState.detFaults.length
      ? simState.detFaults.slice(0, 4).map(d => "<div class='trace-item err'><strong>" + escHtml(d.name) + " (" + escHtml(d.code) + ")</strong><div style='font-size:10px'>" + escHtml(d.api + " — " + d.detail) + "</div></div>").join("")
      : "<div class='trace-item ok'>Không có lỗi phát triển DET (ModuleId=20) nào.</div>";

    body.innerHTML =
      "<div class='insp-card'>" +
        "<div class='insp-h'>📍 " + escHtml(meta.title) + "</div>" +
        "<p style='font-size:11.5px;line-height:1.5;margin-bottom:6px'>" + escHtml(meta.detail) + "</p>" +
        "<div style='font-size:11px;display:grid;gap:3px'>" +
          "<div><strong>📥 Input Nguồn:</strong> <span class='mono' style='color:var(--cyan)'>" + escHtml(meta.inputSrc) + "</span></div>" +
          "<div><strong>📤 Output Đích:</strong> <span class='mono' style='color:var(--ok)'>" + escHtml(meta.outputDst) + "</span></div>" +
          "<div><strong>⚡ API Chuẩn:</strong> <code style='color:var(--pri)'>" + escHtml(meta.apiCall) + "</code></div>" +
          "<div><strong>🧭 Đường đi mới nhất:</strong> <span style='color:var(--txt-soft)'>" + escHtml(simState.lastRoutingSummary) + "</span></div>" +
        "</div>" +
      "</div>" +
      "<div class='insp-card'>" +
        "<div class='insp-h'>🚨 Chẩn Đoán DEM (Integrity / Hardware)</div>" + demHtml +
      "</div>" +
      "<div class='insp-card'>" +
        "<div class='insp-h'>🐞 Lỗi Phát Triển DET (ModuleId = 20)</div>" + detHtml +
      "</div>";
  } else if (currentInspTab === 1) {
    const mod = MODULES_INFO[selectedModId] || MODULES_INFO.MOD_NVM;
    const pills = Object.keys(MODULES_INFO).map(k =>
      "<button class='mod-pill " + (k === selectedModId ? "active" : "") + "' onclick=\"selectModule('" + k + "')\">" + escHtml(MODULES_INFO[k].name.split(" ")[0]) + "</button>"
    ).join("");
    body.innerHTML =
      "<div class='mod-list'>" + pills + "</div>" +
      "<div class='insp-card'>" +
        "<div class='insp-h'>🧩 " + escHtml(mod.name) + "</div>" +
        "<div style='font-size:10.5px;color:var(--cyan);margin-bottom:6px' class='mono'>" + escHtml(mod.role) + " · " + escHtml(mod.sws) + "</div>" +
        "<div style='font-size:11px;margin-bottom:6px'><strong>📥 Input:</strong><ul>" + mod.inputs.map(x => "<li>" + escHtml(x) + "</li>").join("") + "</ul></div>" +
        "<div style='font-size:11px;margin-bottom:6px'><strong>📤 Output Route:</strong><ul>" + mod.outputs.map(x => "<li>" + escHtml(x) + "</li>").join("") + "</ul></div>" +
        "<div style='font-size:11px;margin-bottom:6px'><strong>⚙️ Cách xử lý:</strong><br>" + escHtml(mod.processing) + "</div>" +
        "<div style='font-size:11px'><strong>🔌 API Liên Quan:</strong><br><code class='mono' style='color:var(--ok)'>" + mod.apis.map(escHtml).join(" · ") + "</code></div>" +
      "</div>";
  } else if (currentInspTab === 2) {
    body.innerHTML =
      "<div class='insp-card'>" +
        "<div class='insp-h'>📄 Code C Tương Ứng Cấu Hình Block #" + (blk ? blk.id : 3) + "</div>" +
        "<pre class='code-block mono'>" + escHtml(generateLiveCCodeSnippet()) + "</pre>" +
      "</div>";
  } else {
    const traces = simState.traceLogs.length
      ? simState.traceLogs.map(t =>
          "<div class='trace-item " + escHtml(t.level) + "'>" +
            "<div style='display:flex;justify-content:space-between;font-size:10px;color:var(--mut)'><span class='mono'>" + t.timeMs + " ms · " + escHtml(t.src) + " → " + escHtml(t.dst) + "</span></div>" +
            "<div class='mono' style='font-weight:700;margin:2px 0;color:var(--pri)'>" + escHtml(t.api) + "</div>" +
            "<div style='color:var(--txt-soft)'>" + escHtml(t.detail) + "</div>" +
          "</div>"
        ).join("")
      : "<div class='trace-item'>Chưa có sự kiện nào trong nhật ký API.</div>";
    body.innerHTML = "<div class='insp-card'><div class='insp-h'>📜 Nhật Ký Luồng Gọi API &amp; Interrupt/Notification</div>" + traces + "</div>";
  }
}

function renderAll() {
  renderHeaderAndBadges();
  renderConfigValidation();
  renderBlockAnatomyAndTable();
  render8BitRegisters();
  renderQueuesAndStateMachines();
  renderSvgArchitecture();
  renderInspector();
}

// ---------------- FLOATING DEM-STYLE TOOLTIP (>1S HOVER OR ⓘ CLICK) ----------------
let ttHoverTimer = null;
let ttPinned = false;

function buildTooltipHtml(key) {
  const d = configTooltipData[key];
  if (!d) return "";
  return "<div class='tt-hdr'>" +
      "<div><div class='tt-title'>" + escHtml(d.title) + "</div><div class='tt-path mono'>" + escHtml(d.ecucPath) + "</div></div>" +
      "<span class='tt-sws-badge mono'>" + escHtml(d.sws) + "</span>" +
    "</div>" +
    "<div class='tt-desc'>" + escHtml(d.desc) + "</div>" +
    "<div class='tt-grid'>" +
      "<div class='tt-box'><strong>Dải Giá Trị (Range)</strong>" + escHtml(d.range) + "</div>" +
      "<div class='tt-box'><strong>Giá Trị Tiêu Chuẩn</strong>" + escHtml(d.typical) + "</div>" +
    "</div>" +
    "<div class='tt-note'><strong>💡 Lưu ý kỹ thuật:</strong> " + escHtml(d.notes) + "</div>";
}

function positionTooltipNear(targetEl) {
  const popup = document.getElementById("cfgTooltipPopup");
  if (!popup || !targetEl) return;
  const r = targetEl.getBoundingClientRect();
  const pw = Math.min(440, window.innerWidth - 24);
  const ph = popup.offsetHeight || 220;
  let left = r.right + 12;
  if (left + pw > window.innerWidth - 12) left = Math.max(12, r.left - pw - 12);
  if (left + pw > window.innerWidth - 12) left = Math.max(12, window.innerWidth - pw - 12);
  let top = Math.min(window.innerHeight - ph - 12, Math.max(12, r.top - 10));
  popup.style.left = Math.round(left) + "px";
  popup.style.top = Math.round(top) + "px";
}

function showConfigTooltip(key, anchorEl, pinned) {
  const popup = document.getElementById("cfgTooltipPopup");
  if (!popup || !configTooltipData[key]) return;
  ttPinned = !!pinned;
  popup.innerHTML = buildTooltipHtml(key);
  popup.classList.add("show");
  positionTooltipNear(anchorEl);
}

function hideConfigTooltip() {
  if (ttHoverTimer) { clearTimeout(ttHoverTimer); ttHoverTimer = null; }
  ttPinned = false;
  const popup = document.getElementById("cfgTooltipPopup");
  if (popup) popup.classList.remove("show");
}

function initTooltipHandlers() {
  const rows = document.querySelectorAll(".cfg-row[data-cfg-key]");
  rows.forEach(row => {
    const key = row.getAttribute("data-cfg-key");
    row.addEventListener("mouseenter", () => {
      if (ttHoverTimer) clearTimeout(ttHoverTimer);
      ttHoverTimer = setTimeout(() => {
        showConfigTooltip(key, row, false);
      }, 1050);
    });
    row.addEventListener("mouseleave", () => {
      if (ttHoverTimer) { clearTimeout(ttHoverTimer); ttHoverTimer = null; }
      if (!ttPinned) hideConfigTooltip();
    });
    const icon = row.querySelector(".cfg-i");
    if (icon) {
      icon.addEventListener("click", (ev) => {
        ev.stopPropagation();
        if (ttHoverTimer) { clearTimeout(ttHoverTimer); ttHoverTimer = null; }
        const popup = document.getElementById("cfgTooltipPopup");
        if (ttPinned && popup && popup.classList.contains("show")) hideConfigTooltip();
        else showConfigTooltip(key, row, true);
      });
    }
  });
  document.addEventListener("click", () => {
    if (ttPinned) hideConfigTooltip();
  });
}

// ---------------- EXPORT MODAL (ARXML / Cfg.h / Cfg.c / JSON) & DOWNLOAD HTML ----------------
function buildExportArtifactText(tabIdx) {
  const bList = simState ? simState.blocks.slice(1) : [];
  if (tabIdx === 0) {
    // NvM.arxml
    const blocksXml = bList.map(b =>
      "            <ECUC-CONTAINER-VALUE>\n" +
      "              <SHORT-NAME>" + b.name + "</SHORT-NAME>\n" +
      "              <DEFINITION-REF DEST=\"ECUC-PARAM-CONF-CONTAINER-DEF\">/AUTOSAR/EcucDefs/NvM/NvMBlockDescriptor</DEFINITION-REF>\n" +
      "              <PARAMETER-VALUES>\n" +
      "                <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST=\"ECUC-INTEGER-PARAM-DEF\">/AUTOSAR/EcucDefs/NvM/NvMBlockDescriptor/NvMNvramBlockIdentifier</DEFINITION-REF><VALUE>" + b.id + "</VALUE></ECUC-NUMERICAL-PARAM-VALUE>\n" +
      "                <ECUC-TEXTUAL-PARAM-VALUE><DEFINITION-REF DEST=\"ECUC-ENUMERATION-PARAM-DEF\">/AUTOSAR/EcucDefs/NvM/NvMBlockDescriptor/NvMBlockManagementType</DEFINITION-REF><VALUE>" + b.blockType + "</VALUE></ECUC-TEXTUAL-PARAM-VALUE>\n" +
      "                <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST=\"ECUC-INTEGER-PARAM-DEF\">/AUTOSAR/EcucDefs/NvM/NvMBlockDescriptor/NvMBlockJobPriority</DEFINITION-REF><VALUE>" + b.jobPriority + "</VALUE></ECUC-NUMERICAL-PARAM-VALUE>\n" +
      "                <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST=\"ECUC-INTEGER-PARAM-DEF\">/AUTOSAR/EcucDefs/NvM/NvMBlockDescriptor/NvMNvBlockLength</DEFINITION-REF><VALUE>" + b.length + "</VALUE></ECUC-NUMERICAL-PARAM-VALUE>\n" +
      "                <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST=\"ECUC-BOOLEAN-PARAM-DEF\">/AUTOSAR/EcucDefs/NvM/NvMBlockDescriptor/NvMBlockUseCrc</DEFINITION-REF><VALUE>" + (b.useCrc ? 1 : 0) + "</VALUE></ECUC-NUMERICAL-PARAM-VALUE>\n" +
      "                <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST=\"ECUC-BOOLEAN-PARAM-DEF\">/AUTOSAR/EcucDefs/NvM/NvMBlockDescriptor/NvMBlockUseSyncMechanism</DEFINITION-REF><VALUE>" + (b.useSyncMechanism ? 1 : 0) + "</VALUE></ECUC-NUMERICAL-PARAM-VALUE>\n" +
      "              </PARAMETER-VALUES>\n" +
      "            </ECUC-CONTAINER-VALUE>"
    ).join("\n");
    return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
      "<AUTOSAR xmlns=\"http://autosar.org/schema/r4.0\">\n" +
      "  <AR-PACKAGES><AR-PACKAGE><SHORT-NAME>NvM_EcucValues</SHORT-NAME><ELEMENTS>\n" +
      "    <ECUC-MODULE-CONFIGURATION-VALUES>\n" +
      "      <SHORT-NAME>NvM</SHORT-NAME>\n" +
      "      <DEFINITION-REF DEST=\"ECUC-MODULE-DEF\">/AUTOSAR/EcucDefs/NvM</DEFINITION-REF>\n" +
      "      <CONTAINERS>\n" +
      "        <ECUC-CONTAINER-VALUE><SHORT-NAME>NvMCommon</SHORT-NAME><PARAMETER-VALUES>\n" +
      "          <ECUC-TEXTUAL-PARAM-VALUE><SHORT-NAME>NvMApiConfigClass</SHORT-NAME><VALUE>" + ecucConfig.NvMApiConfigClass + "</VALUE></ECUC-TEXTUAL-PARAM-VALUE>\n" +
      "          <ECUC-NUMERICAL-PARAM-VALUE><SHORT-NAME>NvMDevErrorDetect</SHORT-NAME><VALUE>" + (ecucConfig.NvMDevErrorDetect ? 1 : 0) + "</VALUE></ECUC-NUMERICAL-PARAM-VALUE>\n" +
      "          <ECUC-NUMERICAL-PARAM-VALUE><SHORT-NAME>NvMJobPrioritization</SHORT-NAME><VALUE>" + (ecucConfig.NvMJobPrioritization ? 1 : 0) + "</VALUE></ECUC-NUMERICAL-PARAM-VALUE>\n" +
      "          <ECUC-NUMERICAL-PARAM-VALUE><SHORT-NAME>NvMDynamicConfiguration</SHORT-NAME><VALUE>" + (ecucConfig.NvMDynamicConfiguration ? 1 : 0) + "</VALUE></ECUC-NUMERICAL-PARAM-VALUE>\n" +
      "        </PARAMETER-VALUES></ECUC-CONTAINER-VALUE>\n" +
      blocksXml + "\n      </CONTAINERS>\n    </ECUC-MODULE-CONFIGURATION-VALUES>\n  </ELEMENTS></AR-PACKAGE></AR-PACKAGES>\n</AUTOSAR>";
  }
  if (tabIdx === 1) {
    const q = getQueueLimits();
    const mc = getMainFnAndCrcBudget();
    const mr = getMaxRetriesConfig();
    return "#ifndef NVM_CFG_H\n#define NVM_CFG_H\n\n/* Generated by AUTOSAR Classic NvM Simulator (R23-11) */\n" +
      "#define NVM_API_CONFIG_CLASS              " + ecucConfig.NvMApiConfigClass + "\n" +
      "#define NVM_DEV_ERROR_DETECT              " + (ecucConfig.NvMDevErrorDetect ? "STD_ON" : "STD_OFF") + "\n" +
      "#define NVM_JOB_PRIORITIZATION            " + (ecucConfig.NvMJobPrioritization ? "STD_ON" : "STD_OFF") + "\n" +
      "#define NVM_DYNAMIC_CONFIGURATION         " + (ecucConfig.NvMDynamicConfiguration ? "STD_ON" : "STD_OFF") + "\n" +
      "#define NVM_DRV_MODE_SWITCH               " + (ecucConfig.NvMDrvModeSwitch ? "STD_ON" : "STD_OFF") + "\n" +
      "#define NVM_BSWM_MULTI_BLOCK_JOB_INFO     " + (ecucConfig.NvMBswMJobStatusInfo ? "STD_ON" : "STD_OFF") + "\n" +
      "#define NVM_SIZE_STANDARD_JOB_QUEUE       " + q.stdCap + "U\n" +
      "#define NVM_SIZE_IMMEDIATE_JOB_QUEUE      " + q.immCap + "U\n" +
      "#define NVM_CRC_NUM_OF_BYTES              " + mc.crcBytesPerStep + "U\n" +
      "#define NVM_MAX_NUM_OF_WRITE_RETRIES      " + mr.maxWriteRetries + "U\n" +
      "#define NVM_MAX_NUM_OF_READ_RETRIES       " + mr.maxReadRetries + "U\n\n" +
      bList.map(b => "#define NvMConf_NvMBlockDescriptor_" + b.name + "  ((NvM_BlockIdType)" + b.id + "U)").join("\n") +
      "\n\n#endif /* NVM_CFG_H */\n";
  }
  if (tabIdx === 2) {
    return "#include \"NvM_Cfg.h\"\n#include \"NvM.h\"\n\nconst NvM_BlockDescriptorType NvM_BlockDescriptors[" + bList.length + "] = {\n" +
      bList.map(b =>
        "  /* Block #" + b.id + ": " + b.name + " */\n" +
        "  { " + b.id + "U, " + b.blockType + ", " + b.jobPriority + "U, " + b.length + "U, " + b.nvBlockNum + "U, " + b.romBlockNum + "U, " +
        (b.useCrc ? b.crcType : "NVM_CRC_NONE") + ", " + (b.crcCompMechanism ? "TRUE" : "FALSE") + ", " + (b.staticBlockIdCheck ? "TRUE" : "FALSE") + ", " +
        (b.writeVerification ? "TRUE" : "FALSE") + ", " + (b.useSyncMechanism ? "TRUE" : "FALSE") + ", " + (b.writeOnce ? "TRUE" : "FALSE") + " }"
      ).join(",\n") + "\n};\n";
  }
  return JSON.stringify({ ecucConfig: ecucConfig, blocks: bList.map(b => ({ id: b.id, name: b.name, blockType: b.blockType, jobPriority: b.jobPriority, length: b.length, useCrc: b.useCrc, crcType: b.crcType, lastResult: b.lastResult })) }, null, 2);
}

function openExportModal() {
  const modal = document.getElementById("exportModal");
  if (!modal) return;
  modal.classList.remove("hidden");
  switchExportTab(currentExportTab);
}

function closeExportModal() {
  const modal = document.getElementById("exportModal");
  if (modal) modal.classList.add("hidden");
}

function switchExportTab(tabIdx) {
  currentExportTab = tabIdx;
  for (let i = 0; i < 4; i++) {
    const b = document.getElementById("expTab" + i);
    if (b) b.className = "btn btn-sm" + (i === tabIdx ? " btn-pri" : "");
  }
  const area = document.getElementById("exportCodeArea");
  if (area) area.textContent = buildExportArtifactText(tabIdx);
}

function copyExportCode() {
  const area = document.getElementById("exportCodeArea");
  if (!area) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(area.textContent);
  }
}

function downloadExportCode() {
  const names = ["NvM.arxml", "NvM_Cfg.h", "NvM_Cfg.c", "NvM_Config.json"];
  const text = buildExportArtifactText(currentExportTab);
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = names[currentExportTab] || "NvM_Export.txt";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 250);
}

function downloadStandaloneHTML() {
  closeExportModal();
  hideConfigTooltip();
  const html = "<!DOCTYPE html>\n" + document.documentElement.outerHTML;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "AUTOSAR_NvM_Simulator.html";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 250);
}
