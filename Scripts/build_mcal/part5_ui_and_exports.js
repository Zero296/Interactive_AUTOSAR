// ================= PART 5: UI RENDERING, STEPPER, TOOLTIP (>1S), ADAPTIVE HW, REGISTERS & EXPORTS =================

let currentScenarioId = "S1";
let currentStepIdx = 0;
let stepSnapshots = [];
let scenPlayTimer = null;
let autoClockTimer = null;
let prevRegA = simState.regA;
let prevRegB = simState.regB;
let currentExportTab = 0;

function escHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function deepCloneSnapshot() {
  return JSON.parse(JSON.stringify({ cfg: ecucConfig, sim: simState }));
}

function restoreSnapshot(snap) {
  if (!snap) return;
  ecucConfig = JSON.parse(JSON.stringify(snap.cfg));
  simState = JSON.parse(JSON.stringify(snap.sim));
  syncConfigFromStateToInputs();
}

// ==================== WORKSPACE, URL HASH & THEME ====================

const WS_CFG_TAB_MAP = { Mcu: 0, Port: 1, Dio: 2, Adc: 3, Pwm: 4, Spi: 5, Can: 6, Fls: 7, E2E: 3 };
const WS_HW_VIEW_MAP = { Mcu: "MCU", Port: "PORT_DIO", Dio: "PORT_DIO", Adc: "ADC_PWM", Pwm: "ADC_PWM", Spi: "SPI_CAN", Can: "SPI_CAN", Fls: "FLS", E2E: "ADC_PWM" };
const WS_MOD_NODE_MAP = { Mcu: "MOD_MCU", Port: "MOD_PORT", Dio: "MOD_DIO", Adc: "MOD_ADC", Pwm: "MOD_PWM", Spi: "MOD_SPI", Can: "MOD_CAN", Fls: "MOD_FLS", E2E: "MOD_SWC" };
const WS_QA_BTN_MAP = { Mcu: "qaBtn_Mcu", Port: "qaBtn_PortDio", Dio: "qaBtn_PortDio", Adc: "qaBtn_Adc", Pwm: "qaBtn_Pwm", Spi: "qaBtn_Spi", Can: "qaBtn_Can", Fls: "qaBtn_Fls" };
const WS_DEFAULT_SCEN_MAP = { Mcu: "S1", Port: "S3", Dio: "S4", Adc: "S6", Pwm: "S8", Spi: "S10", Can: "S12", Fls: "S14", E2E: "S9" };

function switchMcalWorkspace(ws, syncHash = false) {
  if (!WS_CFG_TAB_MAP.hasOwnProperty(ws)) ws = "Mcu";
  simState.activeWorkspace = ws;
  simState.activeHwView = WS_HW_VIEW_MAP[ws] || "MCU";
  simState.activeCfgTab = WS_CFG_TAB_MAP[ws] ?? 0;
  simState.selectedMod = WS_MOD_NODE_MAP[ws] || "MOD_MCU";

  Object.keys(WS_CFG_TAB_MAP).forEach(k => {
    const el = document.getElementById("modWsBtn_" + k);
    if (el) el.classList.toggle("active", k === ws);
  });

  ["qaBtn_Mcu", "qaBtn_PortDio", "qaBtn_Adc", "qaBtn_Pwm", "qaBtn_Spi", "qaBtn_Can", "qaBtn_Fls", "qaBtn_Tick"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle("qa-focus", WS_QA_BTN_MAP[ws] === id);
  });

  switchCfgTab(simState.activeCfgTab, false);
  if (syncHash && window.location.hash !== "#" + ws) {
    try { history.replaceState(null, "", "#" + ws); } catch (_) { /* file:// safe */ }
  }
  recomputeRegisters();
  renderAll();
}

function handleUrlHashOnBoot() {
  const raw = (window.location.hash || "").replace(/^#/, "").trim();
  const matchKey = Object.keys(WS_DEFAULT_SCEN_MAP).find(k => k.toLowerCase() === raw.toLowerCase());
  if (matchKey) {
    switchMcalWorkspace(matchKey, false);
    loadScenario(WS_DEFAULT_SCEN_MAP[matchKey], false);
  } else {
    loadScenario("S1", false);
  }
}

function switchMainView(view) {
  const isSim = view === "sim";
  const vSim = document.getElementById("viewSim");
  const vHb = document.getElementById("viewHb");
  const bSim = document.getElementById("btnViewSim");
  const bHb = document.getElementById("btnViewHb");
  if (vSim) vSim.classList.toggle("hidden", !isSim);
  if (vHb) vHb.classList.toggle("hidden", isSim);
  if (bSim) bSim.classList.toggle("active", isSim);
  if (bHb) bHb.classList.toggle("active", !isSim);
}

function toggleTheme() {
  const root = document.documentElement;
  const cur = root.getAttribute("data-theme") || "dark";
  const next = cur === "dark" ? "light" : "dark";
  root.setAttribute("data-theme", next);
  const btn = document.getElementById("btnTheme");
  if (btn) btn.textContent = next === "light" ? "🌙 Dark Mode" : "☀️ Light Mode";
  try { localStorage.setItem("autosar_mcal_theme", next); } catch (_) {}
}

function applySavedTheme() {
  try {
    const saved = localStorage.getItem("autosar_mcal_theme");
    if (saved === "light" || saved === "dark") {
      document.documentElement.setAttribute("data-theme", saved);
      const btn = document.getElementById("btnTheme");
      if (btn) btn.textContent = saved === "light" ? "🌙 Dark Mode" : "☀️ Light Mode";
    }
  } catch (_) {}
}

// ==================== ECUC CONFIG INPUTS & VALIDATION ====================

function switchCfgTab(idx, renderNow = true) {
  simState.activeCfgTab = idx;
  for (let i = 0; i < 8; i++) {
    const btn = document.getElementById("cfgTabBtn" + i);
    const pane = document.getElementById("cfgPane" + i);
    if (btn) btn.classList.toggle("active", i === idx);
    if (pane) pane.classList.toggle("hidden", i !== idx);
  }
  if (renderNow) renderAll();
}

function syncConfigFromStateToInputs() {
  Object.keys(defaultConfig).forEach(key => {
    const el = document.getElementById("cfg_" + key);
    if (!el) return;
    if (el.type === "checkbox") el.checked = !!ecucConfig[key];
    else el.value = ecucConfig[key];
  });
}

function onConfigInputChanged(key) {
  const el = document.getElementById("cfg_" + key);
  if (!el) return;
  if (el.type === "checkbox") ecucConfig[key] = el.checked;
  else if (el.type === "number") ecucConfig[key] = Number(el.value);
  else ecucConfig[key] = el.value;

  applyConfigToState();
  addApiTrace("ECUC", "CFG CHANGE", `${key} = ${ecucConfig[key]}`, "Cấu hình ECUC được cập nhật trực tiếp vào Simulator", "ECUC R23-11", "tx");
  renderAll();
}

function renderValidationBox() {
  const box = document.getElementById("cfgValidationBox");
  if (!box) return;
  const issues = validateConfigRules();
  if (issues.length === 0) {
    box.innerHTML = `<div class="cfg-alert" style="background:var(--ok-bg);border-color:var(--ok);color:var(--ok)">✅ Cấu hình 48 trường ECUC đang nhất quán, không xung đột.</div>`;
    return;
  }
  box.innerHTML = issues.map(it => `<div class="cfg-alert ${it.lv === "err" ? "err" : ""}">${escHtml(it.msg)}</div>`).join("");
}

// ==================== HOVER TOOLTIP (>1S LIKE DEM) ====================

let ttShowTimer = null;
let ttHideTimer = null;

function initTooltipHandlers() {
  const popup = document.getElementById("cfgTooltipPopup");
  if (!popup) return;
  const rows = document.querySelectorAll(".cfg-row[data-cfg-key]");
  rows.forEach(row => {
    const key = row.getAttribute("data-cfg-key");
    if (!key) return;
    row.addEventListener("mouseenter", () => {
      clearTimeout(ttHideTimer);
      clearTimeout(ttShowTimer);
      ttShowTimer = setTimeout(() => showConfigTooltip(key, row.getBoundingClientRect()), 1050);
    });
    row.addEventListener("mouseleave", () => {
      clearTimeout(ttShowTimer);
      ttHideTimer = setTimeout(() => popup.classList.remove("show"), 140);
    });
    const icon = row.querySelector(".cfg-i");
    if (icon) {
      icon.addEventListener("click", (e) => {
        e.preventDefault();
        clearTimeout(ttShowTimer);
        if (popup.classList.contains("show") && popup.dataset.activeKey === key) {
          popup.classList.remove("show");
        } else {
          showConfigTooltip(key, row.getBoundingClientRect());
        }
      });
    }
  });
}

function showConfigTooltip(key, rect) {
  const popup = document.getElementById("cfgTooltipPopup");
  const info = configTooltipData[key];
  if (!popup || !info) return;
  popup.dataset.activeKey = key;
  popup.innerHTML = `
    <div class="tt-hdr">
      <div class="tt-title">${escHtml(info.title)}</div>
      <div class="tt-meta mono">${escHtml(info.sws)}</div>
    </div>
    <div class="tt-sec"><b>ECUC Path:</b> <span class="mono" style="color:var(--cyan)">${escHtml(info.ecucPath)}</span></div>
    <div class="tt-sec"><b>Miền giá trị:</b> <span class="mono">${escHtml(info.range)}</span></div>
    <div class="tt-sec"><b>Vai trò:</b> ${escHtml(info.role)}</div>
    <div class="tt-sec"><b>Cơ chế bên dưới:</b> ${escHtml(info.mechanism)}</div>
    <div class="tt-sec" style="margin-bottom:0"><b>Ảnh hưởng kịch bản:</b> <span style="color:var(--warn)">${escHtml(info.scenarioImpact)}</span></div>
  `;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let left = rect.right + 10;
  if (left + 405 > vw) left = Math.max(12, rect.left - 405);
  let top = Math.max(12, Math.min(rect.top - 10, vh - 260));
  popup.style.left = left + "px";
  popup.style.top = top + "px";
  popup.classList.add("show");
}

// ==================== SCENARIO STEPPER & SNAPSHOTS ====================

function stopTimers() {
  if (scenPlayTimer) { clearInterval(scenPlayTimer); scenPlayTimer = null; }
  if (autoClockTimer) { clearInterval(autoClockTimer); autoClockTimer = null; }
  const bPlay = document.getElementById("btnAutoPlay");
  const bClk = document.getElementById("btnAutoClock");
  if (bPlay) bPlay.textContent = "▶ Tự Chạy";
  if (bClk) bClk.textContent = "⏱ Auto Clock";
}

function loadScenario(id, runStep1 = false) {
  stopTimers();
  if (!SCENARIOS[id]) id = "S1";
  currentScenarioId = id;
  const scen = SCENARIOS[id];
  const sel = document.getElementById("scenSelect");
  if (sel) sel.value = id;

  ecucConfig = { ...defaultConfig };
  simState = createInitialSimState();
  simState.activeWorkspace = scen.workspace;
  simState.activeHwView = scen.hwView;
  simState.activeCfgTab = scen.cfgTab;
  simState.highlightedMods = [WS_MOD_NODE_MAP[scen.workspace] || "MOD_MCU"];
  simState.activeArrows = [];
  simState.stepMeta = {
    moduleTag: scen.workspace,
    title: "Bước 0 (Khởi tạo): " + scen.title,
    inputFrom: "Trạng thái nền trước Bước 1 (" + (scen.steps[0] ? scen.steps[0].label : "") + ")",
    processing: "Đang dừng ở Step 0 (Khởi tạo) — bấm [Tiếp ▶] hoặc [▶ Tự Chạy] để bắt đầu",
    outputTo: "Các module & thanh ghi ở trạng thái ban đầu của hệ thống",
    swsRef: "AUTOSAR R22-11 / R23-11 · " + scen.id
  };
  syncConfigFromStateToInputs();

  currentStepIdx = 0;
  stepSnapshots = [];

  const badge = document.getElementById("scenIdBadge");
  if (badge) badge.textContent = scen.id;
  const sum = document.getElementById("scenSummaryBox");
  if (sum) sum.innerHTML = `<strong>${escHtml(scen.title)}</strong><br>${escHtml(scen.summary)}`;

  const wiBox = document.getElementById("whatIfContainer");
  if (wiBox) {
    wiBox.innerHTML = "";
    scen.whatIfs.forEach((wi, idx) => {
      const btn = document.createElement("button");
      btn.className = "btn btn-sm btn-pur";
      btn.style.justifyContent = "flex-start";
      btn.textContent = wi.label;
      btn.onclick = () => wi.run();
      wiBox.appendChild(btn);
    });
  }

  switchMcalWorkspace(scen.workspace, false);
  if (runStep1 && scen.steps.length > 0) {
    nextScenarioStep();
  } else {
    renderAll();
  }
}

function onScenarioSelectChange() {
  const sel = document.getElementById("scenSelect");
  if (sel) loadScenario(sel.value, false);
}

function resetCurrentScenario() {
  loadScenario(currentScenarioId, false);
}

function nextScenarioStep() {
  const scen = SCENARIOS[currentScenarioId];
  if (!scen) return;
  if (currentStepIdx >= scen.steps.length) {
    if (scenPlayTimer) stopTimers();
    return;
  }
  stepSnapshots[currentStepIdx] = deepCloneSnapshot();
  const stepObj = scen.steps[currentStepIdx];
  stepObj.exec();
  currentStepIdx += 1;
  syncConfigFromStateToInputs();
  recomputeRegisters();
  renderAll();
}

function prevScenarioStep() {
  if (currentStepIdx <= 0) return;
  stopTimers();
  const targetIdx = currentStepIdx - 1;
  restoreSnapshot(stepSnapshots[targetIdx]);
  currentStepIdx = targetIdx;
  syncConfigFromStateToInputs();
  recomputeRegisters();
  renderAll();
}

function toggleScenarioAutoPlay() {
  const btn = document.getElementById("btnAutoPlay");
  if (scenPlayTimer) {
    clearInterval(scenPlayTimer);
    scenPlayTimer = null;
    if (btn) btn.textContent = "▶ Tự Chạy";
    return;
  }
  if (btn) btn.textContent = "⏸ Tạm Dừng";
  const scen = SCENARIOS[currentScenarioId];
  if (scen && currentStepIdx >= scen.steps.length) loadScenario(currentScenarioId, false);
  scenPlayTimer = setInterval(() => {
    const s = SCENARIOS[currentScenarioId];
    if (!s || currentStepIdx >= s.steps.length) {
      clearInterval(scenPlayTimer);
      scenPlayTimer = null;
      if (btn) btn.textContent = "▶ Tự Chạy";
      return;
    }
    nextScenarioStep();
  }, 1500);
}

function toggleAutoClock() {
  const btn = document.getElementById("btnAutoClock");
  if (autoClockTimer) {
    clearInterval(autoClockTimer);
    autoClockTimer = null;
    if (btn) btn.textContent = "⏱ Auto Clock";
    return;
  }
  if (btn) btn.textContent = "⏸ Dừng Clock";
  autoClockTimer = setInterval(() => stepClockTick(1), 900);
}

// ==================== 12 QUICK ACTION HANDLERS ====================

function qaInitAllMcal() {
  simState.clockFailure = false; simState.detCount = 0; simState.demCount = 0;
  simState.spiHwError = false; simState.flsHwFault = false;
  simState.canTec = 0; simState.canErrorState = "CAN_ERRORSTATE_ACTIVE";
  ecucConfig.McuDriverInitialized = true; ecucConfig.PortDriverInitialized = true;
  ecucConfig.AdcDriverInitialized = true; ecucConfig.PwmDriverInitialized = true;
  ecucConfig.SpiDriverInitialized = true; ecucConfig.CanDriverInitialized = true;
  ecucConfig.FlsDriverInitialized = true; ecucConfig.McuNoPll = false;
  mcalMcuInit(); mcalMcuInitClock(); mcalMcuLockAndGetPll(); mcalMcuDistributePllClock();
  mcalPortInit();
  simState.adcInit = true; simState.adcGroupStatus = "ADC_IDLE"; simState.adcBufferReady = true;
  simState.pwmInit = true; mcalPwmSetDutyCycle(parseHexInt(ecucConfig.PwmDutycycleDefaultHex, 0x6000));
  simState.spiInit = true; simState.spiStatus = "SPI_IDLE";
  simState.canInit = true; mcalCanSetControllerMode("CAN_CS_STARTED");
  simState.flsInit = true; simState.flsStatus = "MEMIF_IDLE"; simState.flsJobResult = "MEMIF_JOB_OK";
  syncConfigFromStateToInputs();
  setStepFocus("MOD_MCU", ["arr_ecum_mcal", "arr_mcu_hw"], ["MOD_ECUM", "MOD_MCU", "MOD_PORT", "MOD_ADC", "MOD_PWM", "MOD_SPI", "MOD_CAN", "MOD_FLS"],
    "Quick Action: Init All 8 MCAL Drivers & Lock PLL 160MHz",
    "EcuM_AL_DriverInitOne()", "Khởi tạo tuần tự cả 8 driver & khóa pha PLL 160 MHz", "Hệ thống 100% READY", "SWS_EcuM / All MCAL");
  recomputeRegisters(); renderAll();
}

function qaDioFlipAndPortRefresh() {
  switchMcalWorkspace("Dio");
  const ch = parseInt(ecucConfig.DioChannelIdSelected, 10);
  mcalDioFlipChannel(Number.isNaN(ch) ? 1 : ch);
  mcalPortRefreshDirection();
  setStepFocus("MOD_DIO", ["arr_iohwab_dio", "arr_dio_hw", "arr_port_hw"], ["MOD_IOHWAB", "MOD_PORT", "MOD_DIO", "MOD_HW"],
    "Quick Action: Dio_FlipChannel & Port_RefreshPortDirection",
    "IoHwAb → Dio & Port", "Đảo mức chân Output và làm tươi hướng bảo vệ EMC", "Cập nhật Pin Matrix & Thanh A Bit 6", "SWS_Dio_00190 · SWS_Port_00060");
  renderAll();
}

function qaTriggerAdcConversion() {
  switchMcalWorkspace("Adc");
  simState.adcGroupStatus = "ADC_IDLE";
  mcalAdcStartGroupConversion(true);
  mcalAdcCompleteSampleStep();
  mcalAdcReadGroup();
  setStepFocus("MOD_ADC", ["arr_iohwab_adc", "arr_adc_hw", "arr_adc_iohwab"], ["MOD_IOHWAB", "MOD_ADC", "MOD_HW"],
    "Quick Action: Trigger ADC SAR 12-bit + EOC ISR + ReadGroup",
    `Điện áp AN0 = ${ecucConfig.AdcSimInputVoltageMv}mV`, `Raw = ${simState.adcRawAn0} (≈ ${simState.adcTempDegC}°C)`, "IoHwAb_AdcNotification_0() + Adc_ReadGroup()", "SWS_Adc_00060");
  renderAll();
}

function qaUpdatePwmDuty() {
  switchMcalWorkspace("Pwm");
  const duty = parseHexInt(ecucConfig.PwmDutycycleDefaultHex, 0x6000);
  mcalPwmSetDutyCycle(duty);
  setStepFocus("MOD_PWM", ["arr_iohwab_pwm", "arr_pwm_hw"], ["MOD_IOHWAB", "MOD_PWM", "MOD_HW"],
    "Quick Action: Update Pwm_SetDutyCycle",
    `ECUC Duty=${ecucConfig.PwmDutycycleDefaultHex}`, `Phát xung ${simState.pwmPeriodUs}us · ${dutyHexToPct(simState.pwmDutyHex)}%`, "Cập nhật đồ thị PWM & Bit 4 Thanh A", "SWS_Pwm_00013");
  renderAll();
}

function qaSpiAsyncTransmit() {
  switchMcalWorkspace("Spi");
  mcalSpiWriteIbOrEb(false);
  mcalSpiAsyncTransmit("SpiSeq_SbcControl", [{ name: "Job_SbcWdg", prio: 2, cs: "CS_SBC" }]);
  setStepFocus("MOD_SPI", ["arr_iohwab_spi", "arr_spi_hw"], ["MOD_IOHWAB", "MOD_SPI", "MOD_HW"],
    "Quick Action: Spi_WriteIB -> Spi_AsyncTransmit (CS_SBC = LOW)",
    `Tx=[${simState.spiTxBytes.join(" ")}]`, "Sequence đang SPI_SEQ_PENDING (Bấm +1 Tick để dịch xong & callback)", "Đẩy xung SCLK/MOSI qua QSPI", "SWS_Spi_00177");
  renderAll();
}

function qaCanTxAndRx() {
  switchMcalWorkspace("Can");
  if (simState.canControllerMode !== "CAN_CS_STARTED") mcalCanSetControllerMode("CAN_CS_STARTED");
  mcalCanWrite(ecucConfig.CanTxFrameIdHex, 16, "11 22 33 44 55 66 77 88 99 AA BB CC DD EE FF 00");
  mcalCanCompleteTxAndRx("0x105");
  setStepFocus("MOD_CAN", ["arr_canif_can", "arr_can_hw", "arr_can_canif"], ["MOD_CANIF", "MOD_CAN", "MOD_HW"],
    "Quick Action: Can_Write(HTH_0) + TxConfirmation & Rx(0x105)",
    `CanId=${ecucConfig.CanTxFrameIdHex}`, "Phát khung CAN-FD & lọc khung nhận HRH_0 (0x105)", "CanIf_TxConfirmation & CanIf_RxIndication", "SWS_Can_00276 · SWS_Can_00279");
  renderAll();
}

function qaFlsEraseAndWrite() {
  switchMcalWorkspace("Fls");
  simState.flsStatus = "MEMIF_IDLE";
  simState.flsMemory.fill(0xFF);
  mcalFlsStartJob("WRITE", ecucConfig.FlsTargetAddressHex, 16);
  setStepFocus("MOD_FLS", ["arr_fee_fls", "arr_fls_hw"], ["MOD_FEE", "MOD_FLS", "MOD_HW"],
    "Quick Action: Fls_Write(16B) đang chờ +1 Tick Fls_MainFunction()",
    `Addr=${ecucConfig.FlsTargetAddressHex} (${ecucConfig.FlsDefaultMode})`, "Đưa Flash vào MEMIF_BUSY (Bit 1=1). Bấm +1 Tick để ghi từng Page!", "Data Flash Sector", "SWS_Fls_00223");
  renderAll();
}

function qaResetAllMcal() {
  resetCurrentScenario();
}

function qaRunThermalLoopStep() {
  switchMcalWorkspace("E2E");
  const mv = clampNum(ecucConfig.AdcSimInputVoltageMv, 0, 5000, 2500);
  simState.adcGroupStatus = "ADC_IDLE"; simState.adcBufferReady = true;
  mcalAdcStartGroupConversion(true); mcalAdcCompleteSampleStep(); mcalAdcReadGroup();
  const tempC = simState.adcTempDegC;
  const fanPct = tempC >= 95 ? 90 : (tempC >= 70 ? 60 : 25);
  const dutyHex = Math.round((fanPct / 100) * 0x8000);
  const ledOn = tempC >= 95;
  simState.swcThermal = { tempC, fanPct, warnLed: ledOn, runCount: simState.swcThermal.runCount + 1 };
  mcalPwmSetDutyCycle(dutyHex);
  mcalDioWriteChannel(1, ledOn ? 1 : 0);
  addApiTrace("SWC_Thermal", "E2E LOOP", `Temp=${tempC}°C → Fan=${fanPct}% (${fmtHex4(dutyHex)}) · WarnLed=${ledOn ? "ON" : "OFF"}`, "Chạy trọn chu trình SWC ↔ RTE ↔ IoHwAb ↔ Adc/Pwm/Dio", "AUTOSAR E2E", "ok");
  setStepFocus("MOD_SWC", ["arr_adc_hw", "arr_adc_iohwab", "arr_iohwab_rte", "arr_rte_swc", "arr_swc_rte", "arr_rte_iohwab", "arr_iohwab_pwm", "arr_iohwab_dio"],
    ["MOD_HW", "MOD_ADC", "MOD_IOHWAB", "MOD_RTE", "MOD_SWC", "MOD_PWM", "MOD_DIO"],
    `Vòng kín SWC_ThermalCtrl: ${tempC}°C → Quạt ${fanPct}% · Đèn ${ledOn ? "ON" : "OFF"}`,
    `AN0=${mv}mV → Adc Raw=${simState.adcRawAn0}`, `SWC tính Fan=${fanPct}%, OverTemp=${ledOn}`, "IoHwAb cập nhật Pwm + Dio tức thì", "SWC ↔ RTE ↔ IoHwAb ↔ MCAL");
  renderAll();
}

function qaInjectCanRxOnly() {
  switchMcalWorkspace("Can");
  if (simState.canControllerMode !== "CAN_CS_STARTED") mcalCanSetControllerMode("CAN_CS_STARTED");
  mcalCanCompleteTxAndRx("0x105");
  renderAll();
}

function qaTriggerCanBusOff() {
  switchMcalWorkspace("Can");
  mcalCanTriggerBusOff();
  renderAll();
}

function qaToggleMcuSleep() {
  switchMcalWorkspace("Mcu");
  const next = simState.powerMode === "MCU_MODE_RUN" ? "MCU_MODE_HALT" : "MCU_MODE_RUN";
  mcalMcuSetMode(next);
  renderAll();
}

// ==================== INTERACTIVE REGISTER BITS & PIN MATRIX CLICKS ====================

function toggleRegisterBit(regName, bit) {
  if (regName === "A") {
    if (bit === 7) { simState.pllLocked = !simState.pllLocked; simState.pllDistributed = simState.pllLocked; syncHardwareClocks(); }
    else if (bit === 6) mcalDioFlipChannel(1);
    else if (bit === 5) simState.adcGroupStatus = simState.adcGroupStatus === "ADC_STREAM_COMPLETED" ? "ADC_IDLE" : "ADC_STREAM_COMPLETED";
    else if (bit === 4) { if (simState.pwmOutputActive && !simState.pwmIdleForced) mcalPwmSetOutputToIdle(); else mcalPwmSetDutyCycle(simState.pwmDutyHex || 0x4000); }
    else if (bit === 3) { simState.spiStatus = simState.spiStatus === "SPI_BUSY" ? "SPI_IDLE" : "SPI_BUSY"; simState.spiCsLow = simState.spiStatus === "SPI_BUSY"; }
    else if (bit === 2) { if (simState.canControllerMode === "CAN_CS_STARTED") mcalCanSetControllerMode("CAN_CS_STOPPED"); else mcalCanSetControllerMode("CAN_CS_STARTED"); }
    else if (bit === 1) { simState.flsStatus = simState.flsStatus === "MEMIF_BUSY" ? "MEMIF_IDLE" : "MEMIF_BUSY"; }
    else if (bit === 0) { simState.hwIrqPending = !simState.hwIrqPending; }
  } else {
    if (bit === 7) { const key = (WS_MOD_NODE_MAP[simState.activeWorkspace] || "MOD_MCU").replace("MOD_", ""); const cap = key[0] + key.slice(1).toLowerCase(); const cfgK = cap + "DriverInitialized"; if (ecucConfig.hasOwnProperty(cfgK)) { ecucConfig[cfgK] = !ecucConfig[cfgK]; applyConfigToState(); syncConfigFromStateToInputs(); } }
    else if (bit === 5) { ecucConfig.SpiAsyncMode = ecucConfig.SpiAsyncMode === "SPI_INTERRUPT_MODE" ? "SPI_POLLING_MODE" : "SPI_INTERRUPT_MODE"; ecucConfig.CanTxRxProcessingMode = ecucConfig.CanTxRxProcessingMode === "INTERRUPT" ? "POLLING" : "INTERRUPT"; syncConfigFromStateToInputs(); }
    else if (bit === 4) { simState.adcNotifEnabled = !simState.adcNotifEnabled; simState.pwmNotifEnabled = !simState.pwmNotifEnabled; }
    else if (bit === 3) { simState.adcBufferReady = !simState.adcBufferReady; }
    else if (bit === 2) { simState.canWakeupDetected = !simState.canWakeupDetected; }
    else if (bit === 1) { if (simState.demCount > 0) { simState.demCount = 0; simState.clockFailure = false; simState.spiHwError = false; simState.flsHwFault = false; } else demReport("User", "MANUAL_DEM_TEST", true, "Kích thử nghiệm DEM từ thanh ghi B Bit 1", "DEM"); }
    else if (bit === 0) { if (simState.detCount > 0) simState.detCount = 0; else detReport("User", 255, "0xFF", "MANUAL_DET_TRAP", "Kích thử nghiệm DET từ thanh ghi B Bit 0", "DET"); }
  }
  recomputeRegisters();
  renderAll();
}

function togglePinLevel(pinId) {
  const pin = simState.pins[pinId];
  if (!pin) return;
  pin.level = pin.level ? 0 : 1;
  if (pin.level) simState.dioPortVal |= (1 << pinId);
  else simState.dioPortVal &= ~(1 << pinId);
  addApiTrace(pin.dir === "PORT_PIN_OUT" ? "Dio" : "HW Pin", "PIN TOGGLE", `${pin.name} (${pin.role}) = ${pin.level ? "STD_HIGH" : "STD_LOW"}`, `Port0 = 0x${fmtHex2(simState.dioPortVal)}`, "SWS_Dio_00011", "tx");
  recomputeRegisters();
  renderAll();
}

// ==================== ADAPTIVE HARDWARE VISUALIZER (5 MODES) ====================

function setAdaptiveHwView(view) {
  simState.activeHwView = view;
  renderAdaptiveHw();
  renderHeaderAndMetrics();
}

function buildPwmWaveformSvg() {
  const dutyRatio = simState.pwmIdleForced ? 0 : Math.max(0, Math.min(1, simState.pwmDutyHex / 0x8000));
  const cycW = 140;
  const highW = Math.round(cycW * dutyRatio);
  let pathD = "M 10 42 ";
  for (let c = 0; c < 2; c++) {
    const x0 = 10 + c * cycW;
    if (dutyRatio <= 0) {
      pathD += `L ${x0 + cycW} 42 `;
    } else if (dutyRatio >= 1) {
      pathD += `L ${x0} 12 L ${x0 + cycW} 12 `;
    } else {
      pathD += `L ${x0} 12 L ${x0 + highW} 12 L ${x0 + highW} 42 L ${x0 + cycW} 42 `;
    }
  }
  if (dutyRatio >= 1) pathD += "L 290 42";
  const pct = dutyHexToPct(simState.pwmDutyHex);
  const tOnUs = Math.round(simState.pwmPeriodUs * dutyRatio * 10) / 10;
  const khz = Math.round((1000 / Math.max(1, simState.pwmPeriodUs)) * 10) / 10;
  return `
    <svg viewBox="0 0 300 54" style="width:100%;height:54px;background:var(--code-bg);border:1px solid var(--bdr);border-radius:6px;margin-top:4px">
      <line x1="8" y1="42" x2="292" y2="42" stroke="var(--bdr)" stroke-dasharray="3 3" />
      <line x1="8" y1="12" x2="292" y2="12" stroke="var(--bdr)" stroke-dasharray="3 3" />
      <path d="${pathD}" fill="none" stroke="${simState.pwmIdleForced ? "var(--mut)" : "var(--warn)"}" stroke-width="2.4" />
      <text x="14" y="29" fill="var(--txt-soft)" font-size="9" font-family="monospace">${simState.pwmIdleForced ? "IDLE (" + ecucConfig.PwmIdleState + ")" : `Duty ${pct}% · Ton=${tOnUs}us · ${khz}kHz`}</text>
    </svg>`;
}

function renderAdaptiveHw() {
  const v = simState.activeHwView;
  ["MCU", "PORT_DIO", "ADC_PWM", "SPI_CAN", "FLS"].forEach(k => {
    const p = document.getElementById("hwPill_" + k);
    if (p) p.classList.toggle("active", k === v);
  });
  const titleEl = document.getElementById("hwVisTitle");
  const contentEl = document.getElementById("hwVisContent");
  if (!titleEl || !contentEl) return;

  if (v === "MCU") {
    titleEl.textContent = "⚡ PHẦN CỨNG MCU: PLL CLOCK TREE, POWER MODE & RESET REASON";
    contentEl.innerHTML = `
      <div class="hw-grid-4">
        <div class="hw-card ${simState.pllLocked ? "ok" : "warn"}">
          <div style="color:var(--mut)">Nguồn fOSC / PLL_SR</div>
          <div class="mono" style="font-weight:800;font-size:12px">${simState.fOscMhz} MHz → ${simState.pllLocked ? "LOCKED ✅" : "UNLOCKED ⏳"}</div>
          <div>McuNoPll: <b>${ecucConfig.McuNoPll ? "TRUE" : "FALSE"}</b></div>
        </div>
        <div class="hw-card cyan">
          <div style="color:var(--mut)">Tần Số Phân Phối (Clock Tree)</div>
          <div class="mono" style="font-weight:800;font-size:12px">fCPU=${simState.fCpuMhz}MHz · fBUS=${simState.fBusMhz}MHz</div>
          <div class="mono">fCAN=${simState.fCanMhz}MHz · fADC=${simState.fAdcMhz}MHz</div>
        </div>
        <div class="hw-card ${simState.powerMode === "MCU_MODE_RUN" ? "ok" : "warn"}">
          <div style="color:var(--mut)">Power Mode (Mcu_SetMode)</div>
          <div class="mono" style="font-weight:800;font-size:12px">${escHtml(simState.powerMode)}</div>
          <div>RAM Section: <b>${simState.ramInitDone ? "VALID" : "CLEAR"}</b></div>
        </div>
        <div class="hw-card ${simState.clockFailure ? "err" : ""}">
          <div style="color:var(--mut)">Reset Reason (RGM_FES)</div>
          <div class="mono" style="font-weight:800;font-size:11.5px">${escHtml(simState.resetReason)}</div>
          <div class="mono">Raw=${escHtml(simState.resetRaw)} · SwRst=${ecucConfig.McuPerformResetApi ? "ON" : "OFF"}</div>
        </div>
      </div>`;
  } else if (v === "PORT_DIO") {
    titleEl.textContent = "🔌💡 MA TRẬN PIN MULTIPLEXER (PCR[0..7]) & BẢNG LED PORT 0 (Click mức chân để đảo)";
    const rows = simState.pins.map(p => `
      <tr>
        <td class="mono"><b>${p.name}</b> <span style="color:var(--mut)">(${p.role})</span></td>
        <td class="mono">${escHtml(p.alt)}</td>
        <td><span class="ch-pill ${p.dir === "PORT_PIN_OUT" ? "cyan" : "pur"}">${p.dir === "PORT_PIN_OUT" ? "OUT" : "IN"}</span></td>
        <td>${p.pull.replace("PORT_PIN_IN_", "")}</td>
        <td>${p.dirChangeable ? "✅ YES" : "🔒 FIX"}</td>
        <td><button class="pin-btn ${p.level ? "high" : "low"}" onclick="togglePinLevel(${p.id})">${p.level ? "HIGH (1)" : "LOW (0)"}</button></td>
      </tr>`).join("");
    contentEl.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;font-size:10.5px">
        <span>Port 0 Byte: <b class="mono" style="color:var(--cyan)">0x${fmtHex2(simState.dioPortVal)} (${simState.dioPortVal.toString(2).padStart(8,"0")}b)</b></span>
        <span>ChannelGroup: <b class="mono">Mask=0x${fmtHex2(simState.dioGroupMask)}, Offset=${simState.dioGroupOffset}</b></span>
      </div>
      <table class="hw-tbl">
        <thead><tr><th>Pin</th><th>ALT Mux</th><th>Hướng</th><th>Pull</th><th>Chg?</th><th>Logic (Click)</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  } else if (v === "ADC_PWM") {
    titleEl.textContent = "📈〰️ BỘ BIẾN ĐỔI SAR ADC 12-BIT & DẠNG SÓNG PWM THỜI GIAN THỰC";
    const mv = clampNum(ecucConfig.AdcSimInputVoltageMv, 0, 5000, 2500);
    contentEl.innerHTML = `
      <div class="hw-grid-2">
        <div class="hw-card cyan">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <b>📈 SAR ADC 12-bit (AdcGroup_0)</b>
            <span class="ch-pill ${simState.adcGroupStatus === "ADC_BUSY" ? "warn" : simState.adcGroupStatus === "ADC_STREAM_COMPLETED" ? "ok" : "cyan"}">${simState.adcGroupStatus}</span>
          </div>
          <div style="margin-top:4px">AN0 Input: <b class="mono">${mv} mV</b> → Raw: <b class="mono" style="color:var(--cyan)">${simState.adcRawAn0} (0x${simState.adcRawAn0.toString(16).toUpperCase()})</b> ≈ <b>${simState.adcTempDegC}°C</b></div>
          <div>Trig: <b class="mono">${ecucConfig.AdcGroupTriggSrc.replace("ADC_TRIGG_SRC_", "")}</b> · Mode: <b>${ecucConfig.AdcGroupAccessMode.replace("ADC_ACCESS_MODE_", "")} (${simState.adcSamplesDone}/${simState.adcStreamTarget})</b></div>
          <div class="mono" style="color:var(--mut);margin-top:2px">ResultBuf: [${simState.adcResultBuf.join(", ")}] · Buff=${simState.adcBufferReady ? "OK" : "NONE"}</div>
        </div>
        <div class="hw-card ${simState.pwmOutputActive && !simState.pwmIdleForced ? "warn" : ""}">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <b>〰️ Kênh PWM (PwmCh_0 · ${ecucConfig.PwmChannelClass.replace("PWM_", "")})</b>
            <span class="ch-pill ${simState.pwmIdleForced ? "err" : "warn"}">${fmtHex4(simState.pwmDutyHex)} (${dutyHexToPct(simState.pwmDutyHex)}%)</span>
          </div>
          ${buildPwmWaveformSvg()}
        </div>
      </div>`;
  } else if (v === "SPI_CAN") {
    titleEl.textContent = "🔄🚌 HỆ THỐNG DỊCH SPI (Seq→Job→Ch) & BỘ ĐIỀU KHIỂN CAN / CAN-FD HOH";
    const mbHtml = simState.canTxMailboxes.map((m, idx) =>
      `<span class="ch-pill ${m ? "warn" : "ok"}">MB${idx}: ${m ? escHtml(m.cleanId) : "FREE"}</span>`).join(" ");
    contentEl.innerHTML = `
      <div class="hw-grid-2">
        <div class="hw-card ${simState.spiStatus === "SPI_BUSY" ? "pur" : "ok"}">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <b>🔄 QSPI Bus (Level ${ecucConfig.SpiLevelDelivered})</b>
            <span class="ch-pill ${simState.spiStatus === "SPI_BUSY" ? "pur" : "ok"}">${simState.spiStatus} · ${simState.spiSeqResult}</span>
          </div>
          <div style="margin-top:4px">Seq: <b class="mono">${escHtml(simState.spiActiveSeq)}</b> · CS: <b>${simState.spiCsLow ? "LOW (Active)" : "HIGH (Idle)"}</b></div>
          <div class="mono" style="margin-top:3px">MOSI Tx: [${simState.spiTxBytes.join(" ")}]</div>
          <div class="mono" style="color:var(--cyan)">MISO Rx: [${simState.spiRxBytes.join(" ")}]</div>
        </div>
        <div class="hw-card ${simState.canErrorState === "CAN_ERRORSTATE_BUSOFF" ? "err" : "cyan"}">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <b>🚌 FlexCAN (${simState.canControllerMode.replace("CAN_CS_", "")})</b>
            <span class="ch-pill ${simState.canErrorState === "CAN_ERRORSTATE_BUSOFF" ? "err" : "ok"}">${simState.canErrorState.replace("CAN_ERRORSTATE_", "")} (TEC=${simState.canTec})</span>
          </div>
          <div style="margin-top:4px;display:flex;gap:4px;flex-wrap:wrap">${mbHtml} <span class="ch-pill pur">CanIf Q: ${simState.canIfTxQueue.length}</span></div>
          <div class="mono" style="margin-top:3px;font-size:10px">LastTx: ${escHtml(simState.canLastTx.id)} (${simState.canLastTx.dlc}B) | Rx HRH(${ecucConfig.CanHwFilterCodeHex}): ${escHtml(simState.canLastRx.id)} ${simState.canLastRx.accepted ? "✅" : "🚫DROP"}</div>
        </div>
      </div>`;
  } else {
    titleEl.textContent = "💾 SECTOR DATA FLASH (0x0000..0x001F · 4 Pages × 8B) — 0xFF=ERASED, Màu Sáng=ĐÃ GHI";
    const cells = simState.flsMemory.map((b, i) => {
      const hex = fmtHex2(b);
      const isErased = b === 0xFF;
      const inJob = simState.flsStatus === "MEMIF_BUSY" && i >= simState.flsJobAddr && i < simState.flsJobAddr + simState.flsJobLen;
      const bg = inJob ? "var(--warn-bg)" : isErased ? "var(--panel)" : "var(--cyan-bg)";
      const bd = inJob ? "var(--warn)" : isErased ? "var(--bdr)" : "var(--cyan)";
      const col = isErased ? "var(--mut)" : "var(--cyan)";
      return `<div class="mono" title="Offset 0x${i.toString(16).padStart(4,"0")}" style="border:1px solid ${bd};background:${bg};color:${col};border-radius:4px;padding:2px 0;text-align:center;font-size:10px;font-weight:700">${hex}</div>`;
    }).join("");
    const pct = simState.flsJobLen > 0 ? Math.round((simState.flsJobDoneBytes / simState.flsJobLen) * 100) : 100;
    contentEl.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;font-size:10.5px">
        <span>Status: <span class="ch-pill ${simState.flsStatus === "MEMIF_BUSY" ? "warn" : "ok"}">${simState.flsStatus}</span> · Job: <span class="ch-pill ${simState.flsJobResult === "MEMIF_JOB_OK" ? "ok" : simState.flsJobResult.includes("FAIL") ? "err" : "warn"}">${simState.flsJobResult}</span></span>
        <span class="mono">Mode: ${ecucConfig.FlsDefaultMode} · Tiến độ: ${simState.flsJobDoneBytes}/${simState.flsJobLen}B (${pct}%)</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(16, 1fr);gap:3px">${cells}</div>`;
  }
}

// ==================== DUAL 8-BIT REGISTERS RENDER ====================

function renderBitGrid(containerId, hexId, regVal, prevVal, bitsDef, regKey) {
  const hexEl = document.getElementById(hexId);
  const box = document.getElementById(containerId);
  if (hexEl) hexEl.textContent = `0x${fmtHex2(regVal)} (${regVal.toString(2).padStart(8, "0")}b)`;
  if (!box) return;
  box.innerHTML = bitsDef.map(b => {
    const isOn = (regVal & b.mask) !== 0;
    const chg = ((regVal ^ prevVal) & b.mask) !== 0;
    const toneCls = b.tone ? b.tone + "-bit" : "";
    return `
      <div class="bit-box ${isOn ? "on " + toneCls : ""} ${chg ? "chg" : ""}" title="${escHtml(b.desc)} (Click để bật/tắt)" onclick="toggleRegisterBit('${regKey}', ${b.bit})">
        <div class="bit-pos">B${b.bit}</div>
        <div class="bit-val">${isOn ? 1 : 0}</div>
        <div class="bit-tag">${escHtml(b.tag)}</div>
      </div>`;
  }).join("");
}

function renderRegisters() {
  renderBitGrid("regABits", "regAHex", simState.regA, prevRegA, MCAL_HW_STATUS_BITS, "A");
  renderBitGrid("regBBits", "regBHex", simState.regB, prevRegB, MCAL_DRV_ENGINE_BITS, "B");
  prevRegA = simState.regA;
  prevRegB = simState.regB;
}

// ==================== PANEL 2: 6 METRICS & DUAL STATE MACHINES ====================

function renderHeaderAndMetrics() {
  const hMod = document.getElementById("hdrBadgeMod");
  const hDrv = document.getElementById("hdrBadgeDrv");
  const hHw = document.getElementById("hdrBadgeHw");
  const hFlt = document.getElementById("hdrBadgeFault");
  const clk = document.getElementById("clockVal");
  const p1 = document.getElementById("panel1FocusLbl");
  const p2 = document.getElementById("panel2SubLbl");

  if (hMod) hMod.textContent = "Focus: " + simState.activeWorkspace;
  if (hDrv) {
    const ok = getWorkspaceInitFlag(simState.activeWorkspace);
    hDrv.textContent = ok ? "Init: READY" : "Init: UNINIT!";
    hDrv.className = "state-badge " + (ok ? "sb-net" : "sb-err");
  }
  if (hHw) {
    hHw.textContent = `PLL: ${simState.fCpuMhz}MHz (${simState.powerMode.replace("MCU_MODE_", "")})`;
    hHw.className = "state-badge " + (simState.pllLocked ? "sb-prep" : "sb-wait");
  }
  if (hFlt) {
    const tot = simState.detCount + simState.demCount;
    hFlt.textContent = `DET:${simState.detCount} · DEM:${simState.demCount}`;
    hFlt.className = "state-badge " + (tot > 0 ? "sb-err" : "sb-sleep");
  }
  if (clk) clk.textContent = simState.clockMs + " ms";
  if (p1) p1.textContent = `View: ${simState.activeHwView} | A: 0x${fmtHex2(simState.regA)} | B: 0x${fmtHex2(simState.regB)}`;
  if (p2) p2.textContent = `SM Focus: ${simState.activeWorkspace} | Clock: ${simState.fCpuMhz} MHz`;

  // Scenario Stepper UI
  const scen = SCENARIOS[currentScenarioId];
  const stPill = document.getElementById("stepIndicator");
  const bPrev = document.getElementById("btnPrevStep");
  const bNext = document.getElementById("btnNextStep");
  if (scen) {
    if (stPill) stPill.textContent = `Bước ${currentStepIdx} / ${scen.steps.length}`;
    if (bPrev) bPrev.disabled = currentStepIdx <= 0;
    if (bNext) bNext.disabled = currentStepIdx >= scen.steps.length;
  }

  // 6 Metrics in timersGrid
  const tGrid = document.getElementById("timersGrid");
  if (tGrid) {
    const cards = [
      { lbl: "⚡ CPU / PLL Clock", val: `${simState.fCpuMhz} / ${ecucConfig.McuClockReferencePointFrequencyMhz} MHz`, pct: Math.min(100, Math.round((simState.fCpuMhz / 200) * 100)), tone: simState.pllLocked ? "" : "warn" },
      { lbl: "📈 ADC SAR AN0", val: `${simState.adcRawAn0} / 4095 (${simState.adcTempDegC}°C)`, pct: Math.round((simState.adcRawAn0 / 4095) * 100), tone: simState.adcSensorFault ? "err" : "" },
      { lbl: "〰️ PWM Duty Ratio", val: `${fmtHex4(simState.pwmDutyHex)} (${dutyHexToPct(simState.pwmDutyHex)}%)`, pct: simState.pwmIdleForced ? 0 : Math.round(dutyHexToPct(simState.pwmDutyHex)), tone: "warn" },
      { lbl: "🔄 SPI Job Queue", val: simState.spiStatus === "SPI_BUSY" ? `${simState.spiPendingJobs.length} Job Pending` : simState.spiSeqResult, pct: simState.spiStatus === "SPI_BUSY" ? 75 : 100, tone: "pur" },
      { lbl: "🚌 CAN TEC Counter", val: `${simState.canTec} / 256 (${simState.canControllerMode.replace("CAN_CS_", "")})`, pct: Math.min(100, Math.round((simState.canTec / 256) * 100)), tone: simState.canTec >= 128 ? "err" : "" },
      { lbl: "💾 FLS MainFn Job", val: simState.flsJobLen > 0 ? `${simState.flsJobDoneBytes}/${simState.flsJobLen}B` : simState.flsJobResult, pct: simState.flsJobLen > 0 ? Math.round((simState.flsJobDoneBytes / simState.flsJobLen) * 100) : 100, tone: simState.flsJobResult.includes("FAIL") ? "err" : "warn" }
    ];
    tGrid.innerHTML = cards.map(c => `
      <div class="timer-card ${c.tone === "err" ? "err-active" : c.tone === "warn" ? "warn-active" : "active"}">
        <div class="timer-top"><span>${c.lbl}</span><span class="mono">${escHtml(c.val)}</span></div>
        <div class="timer-bar"><div class="timer-fill ${c.tone}" style="width:${c.pct}%"></div></div>
      </div>`).join("");
  }
  renderDualStateMachines();
}

function renderSmNode(title, sub, active, activeCls = "active-state", subNodes = []) {
  const subHtml = subNodes.length ? `<div class="sm-subs">${subNodes.map(sn => `<span class="sm-subnode ${sn.on ? "sub-active" : ""}">${escHtml(sn.text)}</span>`).join("")}</div>` : "";
  return `<div class="sm-node ${active ? activeCls : ""}">
    <div class="sm-node-hdr"><span>${escHtml(title)}</span><span class="mono" style="font-size:9.5px">${active ? "● ACTIVE" : ""}</span></div>
    <div style="font-size:10px;color:var(--mut)">${escHtml(sub)}</div>${subHtml}
  </div>`;
}

function renderDualStateMachines() {
  const ws = simState.activeWorkspace;
  const lt = document.getElementById("smLeftTitle");
  const ll = document.getElementById("smLeftLbl");
  const ld = document.getElementById("driverSmDiagram");
  const rt = document.getElementById("smRightTitle");
  const rl = document.getElementById("smRightLbl");
  const rd = document.getElementById("hwSmDiagram");
  if (!lt || !ld || !rt || !rd) return;

  if (ws === "Mcu" || ws === "Port" || ws === "Dio") {
    lt.textContent = "🧭 Mcu Clock & PLL State Machine (SWS_Mcu)";
    const mcuSt = !simState.mcuInit ? "MCU_UNINIT" : !simState.pllLocked ? "MCU_PLL_UNLOCKED" : !simState.pllDistributed ? "MCU_PLL_LOCKED" : "PLL_DISTRIBUTED";
    if (ll) ll.textContent = mcuSt;
    ld.innerHTML = [
      renderSmNode("MCU_UNINIT", "Mặc định khi cấp nguồn (fOSC 16MHz)", !simState.mcuInit, "active-err"),
      renderSmNode("MCU_PLL_UNLOCKED", "Mcu_InitClock() đang đợi ổn định VCO", simState.mcuInit && !simState.pllLocked, "active-warn"),
      renderSmNode("MCU_PLL_LOCKED -> RUN_160MHz", "Mcu_DistributePllClock() cấp xung toàn chip", simState.mcuInit && simState.pllLocked && simState.pllDistributed, "active-state")
    ].join("");

    rt.textContent = "⚙️ Port & Dio Silicon State (SWS_Port / SWS_Dio)";
    if (rl) rl.textContent = simState.portInit ? simState.powerMode : "PORT_UNINIT";
    rd.innerHTML = [
      renderSmNode("Port_Init PCR[0..7]", `Level before Direction | EMC Refresh=${!simState.emcGlitchInjected}`, simState.portInit, "active-prep",
        simState.pins.slice(0, 4).map(p => ({ text: `${p.name}:${p.mode.replace("PORT_PIN_MODE_", "")}`, on: p.level === 1 }))),
      renderSmNode("Dio Stateless Port 0", `GPIO_PDOR=0x${fmtHex2(simState.dioPortVal)} | PA1=${simState.pins[1].level}`, true, "active-state"),
      renderSmNode("Mcu_SetMode Power State", `${simState.powerMode}`, simState.powerMode !== "MCU_MODE_RUN", "active-sleep")
    ].join("");
  } else if (ws === "Adc" || ws === "Pwm" || ws === "E2E") {
    lt.textContent = "🧭 AdcGroup Status State Machine (SWS_Adc_00307)";
    if (ll) ll.textContent = simState.adcGroupStatus;
    ld.innerHTML = [
      renderSmNode("ADC_IDLE", "Chờ SW Start hoặc HW Trigger (BuffReady=" + simState.adcBufferReady + ")", simState.adcGroupStatus === "ADC_IDLE", "active-sleep"),
      renderSmNode("ADC_BUSY", "SAR 12-bit đang lấy mẫu chân AN0", simState.adcGroupStatus === "ADC_BUSY", "active-warn"),
      renderSmNode("ADC_COMPLETED / STREAM_COMPLETED", `Đã đủ ${simState.adcSamplesDone}/${simState.adcStreamTarget} mẫu · ReadGroup()`, simState.adcGroupStatus === "ADC_COMPLETED" || simState.adcGroupStatus === "ADC_STREAM_COMPLETED", "active-state")
    ].join("");

    rt.textContent = "⚙️ Pwm Channel Output & SWC Loop (SWS_Pwm)";
    if (rl) rl.textContent = simState.pwmIdleForced ? "PWM_IDLE_SAFE" : `DUTY_${Math.round(dutyHexToPct(simState.pwmDutyHex))}%`;
    rd.innerHTML = [
      renderSmNode("PWM_ACTIVE (Shadow EndPeriod)", `Period=${simState.pwmPeriodUs}us · Duty=${fmtHex4(simState.pwmDutyHex)}`, simState.pwmOutputActive && !simState.pwmIdleForced, "active-warn"),
      renderSmNode("PWM_OUTPUT_TO_IDLE", `Mức an toàn: ${ecucConfig.PwmIdleState}`, simState.pwmIdleForced, "active-sleep"),
      renderSmNode("SWC_ThermalCtrl Closed Loop", `Temp=${simState.swcThermal.tempC}°C → Fan=${simState.swcThermal.fanPct}%`, ws === "E2E", "active-state")
    ].join("");
  } else if (ws === "Spi") {
    lt.textContent = "🧭 Spi Driver State Machine (SWS_Spi)";
    if (ll) ll.textContent = simState.spiStatus;
    ld.innerHTML = [
      renderSmNode("SPI_UNINIT", "Chưa gọi Spi_Init()", simState.spiStatus === "SPI_UNINIT", "active-err"),
      renderSmNode("SPI_IDLE", `SeqResult: ${simState.spiSeqResult}`, simState.spiStatus === "SPI_IDLE", "active-state"),
      renderSmNode("SPI_BUSY", `Đang chạy: ${simState.spiActiveSeq} (Preempt=${ecucConfig.SpiInterruptibleSequence})`, simState.spiStatus === "SPI_BUSY", "active-pur")
    ].join("");

    rt.textContent = "⚙️ Spi Job & Buffer Pipeline";
    if (rl) rl.textContent = simState.spiJobResult;
    rd.innerHTML = [
      renderSmNode("SPI_JOB_QUEUED / PENDING", `Job: ${simState.spiActiveJob} · CS=${simState.spiCsLow ? "LOW" : "HIGH"}`, simState.spiStatus === "SPI_BUSY", "active-warn"),
      renderSmNode("SPI_JOB_OK", `Tx=[${simState.spiTxBytes.join(" ")}] → Rx=[${simState.spiRxBytes.join(" ")}]`, simState.spiJobResult === "SPI_JOB_OK" && simState.spiStatus === "SPI_IDLE", "active-state"),
      renderSmNode("SPI_JOB_FAILED (DEM)", "SPI_E_HARDWARE_ERROR", simState.spiJobResult === "SPI_JOB_FAILED", "active-err")
    ].join("");
  } else if (ws === "Can") {
    lt.textContent = "🧭 Can Controller State Machine (SWS_Can_00414)";
    if (ll) ll.textContent = simState.canControllerMode;
    ld.innerHTML = [
      renderSmNode("CAN_CS_UNINIT / STOPPED", "Init xong, Tx/Rx bị khóa chờ Can_SetControllerMode", simState.canControllerMode === "CAN_CS_UNINIT" || simState.canControllerMode === "CAN_CS_STOPPED", "active-sleep"),
      renderSmNode("CAN_CS_STARTED", "Kết nối Bus active! Cho phép Can_Write & HRH RxInd", simState.canControllerMode === "CAN_CS_STARTED", "active-state"),
      renderSmNode("CAN_CS_SLEEP", `Chế độ ngủ · WakeupEvent=${simState.canWakeupDetected}`, simState.canControllerMode === "CAN_CS_SLEEP", "active-pur")
    ].join("");

    rt.textContent = "⚙️ CAN Error State (TEC/REC & HTH/HRH)";
    if (rl) rl.textContent = simState.canErrorState;
    rd.innerHTML = [
      renderSmNode("CAN_ERRORSTATE_ACTIVE", `TEC=${simState.canTec} (< 128) · Bus Khỏe Mạnh`, simState.canErrorState === "CAN_ERRORSTATE_ACTIVE", "active-state"),
      renderSmNode("CAN_ERRORSTATE_PASSIVE", `TEC=${simState.canTec} (128..255) · Cảnh báo lỗi bus`, simState.canErrorState === "CAN_ERRORSTATE_PASSIVE", "active-warn"),
      renderSmNode("CAN_ERRORSTATE_BUSOFF", "TEC ≥ 256 → CanIf_ControllerBusOff()", simState.canErrorState === "CAN_ERRORSTATE_BUSOFF", "active-err")
    ].join("");
  } else {
    lt.textContent = "🧭 Fls MemIf Status State Machine (SWS_Fls)";
    if (ll) ll.textContent = simState.flsStatus;
    ld.innerHTML = [
      renderSmNode("MEMIF_UNINIT", "Chưa gọi Fls_Init()", simState.flsStatus === "MEMIF_UNINIT", "active-err"),
      renderSmNode("MEMIF_IDLE", "Sẵn sàng nhận lệnh Erase / Write / Read / BlankCheck", simState.flsStatus === "MEMIF_IDLE", "active-state"),
      renderSmNode("MEMIF_BUSY", `Đang chạy ${simState.flsActiveJob} qua Fls_MainFunction()`, simState.flsStatus === "MEMIF_BUSY", "active-warn")
    ].join("");

    rt.textContent = "⚙️ Fls Asynchronous Job Result";
    if (rl) rl.textContent = simState.flsJobResult;
    rd.innerHTML = [
      renderSmNode("MEMIF_JOB_PENDING", `${simState.flsJobDoneBytes}/${simState.flsJobLen} Bytes (${ecucConfig.FlsDefaultMode})`, simState.flsJobResult === "MEMIF_JOB_PENDING", "active-warn"),
      renderSmNode("MEMIF_JOB_OK", "Fee_JobEndNotification() đã báo lên tầng trên", simState.flsJobResult === "MEMIF_JOB_OK", "active-state"),
      renderSmNode("MEMIF_JOB_FAILED / CANCELED / INCONSISTENT", `${simState.flsJobResult}`, simState.flsJobResult !== "MEMIF_JOB_OK" && simState.flsJobResult !== "MEMIF_JOB_PENDING", "active-err")
    ].join("");
  }
}

// ==================== PANEL 3: ARCHITECTURE SVG HIGHLIGHTER ====================

function selectModule(modId, switchTab = true) {
  simState.selectedMod = modId;
  renderSvgArchitecture();
  if (switchTab) switchInspTab(1);
  else renderInspector();
}

function renderSvgArchitecture() {
  const allMods = Object.keys(MODULES_INFO);
  allMods.forEach(m => {
    const g = document.getElementById("node_" + m);
    if (!g) return;
    g.classList.toggle("selected", m === simState.selectedMod);
    g.classList.toggle("active-mod", (simState.highlightedMods || []).includes(m));
  });

  const subUpdates = {
    svgSub_MOD_SWC: `Temp: ${simState.swcThermal.tempC}°C | Fan: ${simState.swcThermal.fanPct}% | LED: ${simState.swcThermal.warnLed ? "ON" : "OFF"}`,
    svgSub_MOD_ECUM: `Init: ${getWorkspaceInitFlag("E2E") ? "OK" : "PARTIAL"} | DET:${simState.detCount} DEM:${simState.demCount}`,
    svgSub_MOD_MCU: `${simState.fCpuMhz}MHz ${simState.pllLocked ? "LOCK" : "UNLK"}`,
    svgSub_MOD_PORT: simState.portInit ? "PORT_INIT" : "UNINIT",
    svgSub_MOD_DIO: `Port0: 0x${fmtHex2(simState.dioPortVal)}`,
    svgSub_MOD_ADC: simState.adcGroupStatus,
    svgSub_MOD_PWM: simState.pwmIdleForced ? "IDLE_SAFE" : `Duty: ${dutyHexToPct(simState.pwmDutyHex)}%`,
    svgSub_MOD_SPI: simState.spiStatus,
    svgSub_MOD_CAN: simState.canErrorState === "CAN_ERRORSTATE_BUSOFF" ? "BUS-OFF" : simState.canControllerMode.replace("CAN_CS_", ""),
    svgSub_MOD_FLS: simState.flsStatus,
    svgSub_MOD_HW: `PLL: ${simState.fCpuMhz}MHz | GPIO: 0x${fmtHex2(simState.dioPortVal)} | AN0: ${ecucConfig.AdcSimInputVoltageMv}mV | PWM: ${dutyHexToPct(simState.pwmDutyHex)}% | QSPI: ${simState.spiStatus.replace("SPI_", "")} | CAN: ${simState.canControllerMode.replace("CAN_CS_", "")} | Flash: ${simState.flsJobResult}`
  };
  Object.entries(subUpdates).forEach(([id, txt]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
  });

  document.querySelectorAll("#mcalArchSvg .flow-arrow").forEach(a => {
    a.classList.toggle("active", (simState.activeArrows || []).includes(a.id));
  });
}

// ==================== RIGHT COLUMN: 4-TAB INSPECTOR ====================

function switchInspTab(idx) {
  simState.activeInspTab = idx;
  for (let i = 0; i < 4; i++) {
    const btn = document.getElementById("inspTabBtn" + i);
    if (btn) btn.classList.toggle("active", i === idx);
  }
  renderInspector();
}

function clearApiTrace() {
  simState.apiTraces = [];
  renderInspector();
}

function renderInspector() {
  const body = document.getElementById("inspBody");
  if (!body) return;
  const tab = simState.activeInspTab;

  if (tab === 0) {
    const m = simState.stepMeta;
    const alerts = validateConfigRules();
    const scen = SCENARIOS[currentScenarioId];
    const stepObj = scen && currentStepIdx > 0 ? scen.steps[currentStepIdx - 1] : null;
    body.innerHTML = `
      <div class="insp-card" style="border-color:var(--pri)">
        <div class="insp-h">🔎 ${escHtml(m.title)}</div>
        <div style="font-size:11px;color:var(--txt-soft);margin-bottom:6px">${escHtml(stepObj ? stepObj.desc : scen ? scen.summary : "")}</div>
        <div style="font-size:11px;line-height:1.55">
          <div><b>📥 Input lấy từ đâu:</b> ${escHtml(m.inputFrom)}</div>
          <div><b>⚙️ Xử lý nội bộ MCAL:</b> ${escHtml(m.processing)}</div>
          <div><b>📤 Output route đến đâu:</b> ${escHtml(m.outputTo)}</div>
          <div><b>📚 Chuẩn SWS:</b> <span class="mono" style="color:var(--cyan)">${escHtml(m.swsRef)}</span></div>
        </div>
      </div>
      <div class="insp-card">
        <div class="insp-h">🎛️ Tóm Tắt Thanh Ghi & An Toàn Tức Thời</div>
        <div class="mono" style="font-size:11px;line-height:1.55">
          <div>Thanh A (HW/IRQ): <b>0x${fmtHex2(simState.regA)}</b> (${simState.regA.toString(2).padStart(8,"0")}b)</div>
          <div>Thanh B (Drv/Safety): <b>0x${fmtHex2(simState.regB)}</b> (${simState.regB.toString(2).padStart(8,"0")}b)</div>
          <div>DET Count: <b style="color:${simState.detCount ? "var(--err)" : "var(--ok)"}">${simState.detCount}</b> · DEM Count: <b style="color:${simState.demCount ? "var(--err)" : "var(--ok)"}">${simState.demCount}</b></div>
          ${simState.lastDetError ? `<div style="color:var(--err)">Last DET: ${escHtml(simState.lastDetError)}</div>` : ""}
          ${simState.lastDemFault ? `<div style="color:var(--warn)">Last DEM: ${escHtml(simState.lastDemFault)}</div>` : ""}
        </div>
      </div>
      ${alerts.length ? `<div class="insp-card" style="border-color:var(--warn)"><div class="insp-h" style="color:var(--warn)">⚠️ Cảnh Báo Cấu Hình ECUC</div>${alerts.map(a => `<div style="font-size:11px;margin-top:3px">${escHtml(a.msg)}</div>`).join("")}</div>` : ""}
    `;
  } else if (tab === 1) {
    const info = MODULES_INFO[simState.selectedMod] || MODULES_INFO.MOD_MCU;
    const pills = ["MOD_MCU", "MOD_PORT", "MOD_DIO", "MOD_ADC", "MOD_PWM", "MOD_SPI", "MOD_CAN", "MOD_FLS", "MOD_SWC", "MOD_IOHWAB", "MOD_CANIF", "MOD_FEE", "MOD_ECUM"].map(k =>
      `<button class="mod-pill ${k === simState.selectedMod ? "active" : ""}" onclick="selectModule('${k}', false)">${k.replace("MOD_", "")}</button>`).join("");
    body.innerHTML = `
      <div class="mod-list">${pills}</div>
      <div class="insp-card">
        <div class="insp-h">${escHtml(info.name)}</div>
        <div style="font-size:10.5px;color:var(--cyan);margin-bottom:6px" class="mono">${escHtml(info.layer)} · ${escHtml(info.modId)}</div>
        <div style="font-size:11.5px;line-height:1.55">
          <p><b>Vai trò:</b> ${escHtml(info.role)}</p>
          <p style="margin-top:5px"><b>📥 Input:</b> ${escHtml(info.input)}</p>
          <p style="margin-top:5px"><b>⚙️ Xử lý:</b> ${escHtml(info.process)}</p>
          <p style="margin-top:5px"><b>📤 Output:</b> ${escHtml(info.output)}</p>
        </div>
      </div>
      <div class="insp-card">
        <div class="insp-h">📜 Các Hàm API & Callbacks Chuẩn AUTOSAR R23-11</div>
        <ul style="padding-left:16px;font-size:11px;line-height:1.5" class="mono">
          ${info.apis.map(a => `<li>${escHtml(a)}</li>`).join("")}
        </ul>
      </div>`;
  } else if (tab === 2) {
    const modCodeKey = (simState.selectedMod && simState.selectedMod.startsWith("MOD_")) ? simState.selectedMod : "MOD_MCU";
    const cSrc = getLiveModuleCCode(modCodeKey);
    body.innerHTML = `
      <div class="insp-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <div class="insp-h" style="margin:0">📄 Code C Live (${escHtml(modCodeKey.replace("MOD_", ""))})</div>
          <button class="btn btn-sm" onclick="navigator.clipboard && navigator.clipboard.writeText(getLiveModuleCCode('${escHtml(modCodeKey)}'))">📋 Copy C</button>
        </div>
        <pre class="code-block">${escHtml(cSrc)}</pre>
      </div>`;
  } else {
    const traces = simState.apiTraces;
    body.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:7px">
        <span style="font-size:11px;font-weight:700;color:var(--mut)">Nhật ký API / ISR / DET / DEM (${traces.length})</span>
        <button class="btn btn-sm" onclick="clearApiTrace()">🧹 Xóa Log</button>
      </div>
      ${traces.length === 0 ? `<div class="insp-card">Chưa có bản ghi API nào. Hãy bấm Next Step hoặc Quick Action!</div>` : traces.map(t => `
        <div class="trace-item ${t.type === "err" ? "err" : t.type === "warn" ? "warn" : t.type === "ok" || t.type === "cbk" ? "ok" : ""}">
          <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--mut)">
            <span class="mono">#${t.seq} · @${t.clockMs}ms · <b>${escHtml(t.mod)}</b> [${escHtml(t.badge)}]</span>
            <span class="mono">${escHtml(t.sws)}</span>
          </div>
          <div class="mono" style="font-weight:700;color:var(--txt);margin:2px 0">${escHtml(t.fn)}</div>
          <div style="color:var(--txt-soft)">${escHtml(t.info)}</div>
        </div>`).join("")}`;
  }
}

function renderAll() {
  renderValidationBox();
  renderAdaptiveHw();
  renderRegisters();
  renderHeaderAndMetrics();
  renderSvgArchitecture();
  renderInspector();
}

// ==================== EXPORT MODAL (ARXML · 3x *_Cfg.h · JSON) & STANDALONE HTML ====================

function generateExportText(idx) {
  if (idx === 0) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<AUTOSAR xmlns="http://autosar.org/schema/r4.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <AR-PACKAGES><AR-PACKAGE><SHORT-NAME>McalEcucConfig</SHORT-NAME><ELEMENTS>
    <ECUC-MODULE-CONFIGURATION-VALUES><SHORT-NAME>Mcu</SHORT-NAME><CONTAINERS>
      <ECUC-CONTAINER-VALUE><SHORT-NAME>McuGeneralConfiguration</SHORT-NAME><PARAMETER-VALUES>
        <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-BOOLEAN-PARAM-DEF">/AUTOSAR/EcucDefs/Mcu/McuGeneralConfiguration/McuDevErrorDetect</DEFINITION-REF><VALUE>${ecucConfig.McuDevErrorDetect ? 1 : 0}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
        <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-BOOLEAN-PARAM-DEF">/AUTOSAR/EcucDefs/Mcu/McuGeneralConfiguration/McuNoPll</DEFINITION-REF><VALUE>${ecucConfig.McuNoPll ? 1 : 0}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
        <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-BOOLEAN-PARAM-DEF">/AUTOSAR/EcucDefs/Mcu/McuGeneralConfiguration/McuPerformResetApi</DEFINITION-REF><VALUE>${ecucConfig.McuPerformResetApi ? 1 : 0}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
        <ECUC-NUMERICAL-PARAM-VALUE><DEFINITION-REF DEST="ECUC-FLOAT-PARAM-DEF">/AUTOSAR/EcucDefs/Mcu/McuModuleConfiguration/McuClockSettingConfig/McuClockReferencePointFrequency</DEFINITION-REF><VALUE>${ecucConfig.McuClockReferencePointFrequencyMhz}000000.0</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
      </PARAMETER-VALUES></ECUC-CONTAINER-VALUE>
    </CONTAINERS></ECUC-MODULE-CONFIGURATION-VALUES>
    <ECUC-MODULE-CONFIGURATION-VALUES><SHORT-NAME>Adc_Pwm_Spi_Can_Fls</SHORT-NAME><CONTAINERS>
      <ECUC-CONTAINER-VALUE><SHORT-NAME>CoreSettings</SHORT-NAME><PARAMETER-VALUES>
        <ECUC-TEXTUAL-PARAM-VALUE><SHORT-NAME>AdcGroupTriggSrc</SHORT-NAME><VALUE>${ecucConfig.AdcGroupTriggSrc}</VALUE></ECUC-TEXTUAL-PARAM-VALUE>
        <ECUC-TEXTUAL-PARAM-VALUE><SHORT-NAME>PwmChannelClass</SHORT-NAME><VALUE>${ecucConfig.PwmChannelClass}</VALUE></ECUC-TEXTUAL-PARAM-VALUE>
        <ECUC-NUMERICAL-PARAM-VALUE><SHORT-NAME>SpiLevelDelivered</SHORT-NAME><VALUE>${ecucConfig.SpiLevelDelivered}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
        <ECUC-NUMERICAL-PARAM-VALUE><SHORT-NAME>CanMultiplexedTransmission</SHORT-NAME><VALUE>${ecucConfig.CanMultiplexedTransmission ? 1 : 0}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
        <ECUC-TEXTUAL-PARAM-VALUE><SHORT-NAME>FlsDefaultMode</SHORT-NAME><VALUE>${ecucConfig.FlsDefaultMode}</VALUE></ECUC-TEXTUAL-PARAM-VALUE>
      </PARAMETER-VALUES></ECUC-CONTAINER-VALUE>
    </CONTAINERS></ECUC-MODULE-CONFIGURATION-VALUES>
  </ELEMENTS></AR-PACKAGE></AR-PACKAGES>
</AUTOSAR>`;
  }
  if (idx === 1) {
    return `#ifndef MCU_PORT_DIO_CFG_H
#define MCU_PORT_DIO_CFG_H
#include "Std_Types.h"

/* Mcu ECUC Pre-Compile Parameters (SWS_Mcu R23-11) */
#define MCU_DEV_ERROR_DETECT              ${ecucConfig.McuDevErrorDetect ? "STD_ON" : "STD_OFF"}
#define MCU_NO_PLL                        ${ecucConfig.McuNoPll ? "STD_ON" : "STD_OFF"}
#define MCU_PERFORM_RESET_API             ${ecucConfig.McuPerformResetApi ? "STD_ON" : "STD_OFF"}
#define MCU_PLL_TARGET_FREQ_HZ            (${ecucConfig.McuClockReferencePointFrequencyMhz}000000UL)

/* Port ECUC Pre-Compile Parameters (SWS_Port R23-11) */
#define PORT_SET_PIN_DIRECTION_API        ${ecucConfig.PortPinDirectionChangeable ? "STD_ON" : "STD_OFF"}
#define PORT_SET_PIN_MODE_API             ${ecucConfig.PortPinModeChangeable ? "STD_ON" : "STD_OFF"}
#define PORT_PA0_DEFAULT_DIR              ${ecucConfig.PortPinDirection}
#define PORT_PA0_DEFAULT_MODE             ${ecucConfig.PortPinInitialMode}
#define PORT_PA0_PULL_CONFIG              ${ecucConfig.PortPinInternalResistor}

/* Dio ECUC Pre-Compile Parameters (SWS_Dio R23-11) */
#define DIO_DEV_ERROR_DETECT              ${ecucConfig.DioDevErrorDetect ? "STD_ON" : "STD_OFF"}
#define DIO_FLIP_CHANNEL_API              ${ecucConfig.DioFlipChannelApi ? "STD_ON" : "STD_OFF"}
#define DIO_MASKED_WRITE_PORT_API         ${ecucConfig.DioMaskedWritePortApi ? "STD_ON" : "STD_OFF"}
#define DIO_LED_GROUP_MASK                (${ecucConfig.DioPortMaskHex}U)
#endif`;
  }
  if (idx === 2) {
    return `#ifndef ADC_PWM_CFG_H
#define ADC_PWM_CFG_H
#include "Std_Types.h"

/* Adc ECUC Parameters (SWS_Adc R23-11) */
#define ADC_GRP_NOTIF_CAPABILITY          ${ecucConfig.AdcGrpNotifCapability ? "STD_ON" : "STD_OFF"}
#define ADC_GRP0_TRIGG_SRC                ${ecucConfig.AdcGroupTriggSrc}
#define ADC_GRP0_ACCESS_MODE              ${ecucConfig.AdcGroupAccessMode}
#define ADC_GRP0_STREAM_NUM_SAMPLES       (${ecucConfig.AdcStreamingNumSamples}U)

/* Pwm ECUC Parameters (SWS_Pwm R23-11) */
#define PWM_CH0_CHANNEL_CLASS             ${ecucConfig.PwmChannelClass}
#define PWM_CH0_DUTYCYCLE_DEFAULT         (${ecucConfig.PwmDutycycleDefaultHex}U)
#define PWM_CH0_PERIOD_DEFAULT_US         (${ecucConfig.PwmPeriodDefaultUs}U)
#define PWM_CH0_IDLE_STATE                ${ecucConfig.PwmIdleState}
#define PWM_DUTYCYCLE_UPDATED_ENDPERIOD   ${ecucConfig.PwmDutycycleUpdatedEndperiod ? "STD_ON" : "STD_OFF"}
#endif`;
  }
  if (idx === 3) {
    return `#ifndef SPI_CAN_FLS_CFG_H
#define SPI_CAN_FLS_CFG_H
#include "Std_Types.h"

/* Spi ECUC Parameters (SWS_Spi R23-11) */
#define SPI_LEVEL_DELIVERED               (${ecucConfig.SpiLevelDelivered}U)
#define SPI_CHANNEL_BUFFERS_ALLOWED       (${ecucConfig.SpiChannelBuffersAllowed}U)
#define SPI_INTERRUPTIBLE_SEQ_ALLOWED     ${ecucConfig.SpiInterruptibleSequence ? "STD_ON" : "STD_OFF"}
#define SPI_ASYNC_DEFAULT_MODE            ${ecucConfig.SpiAsyncMode}

/* Can ECUC Parameters (SWS_Can R23-11) */
#define CAN_MULTIPLEXED_TRANSMISSION      ${ecucConfig.CanMultiplexedTransmission ? "STD_ON" : "STD_OFF"}
#define CAN_FD_BAUDRATE_ENABLED           ${ecucConfig.CanFdBaudrateConfig ? "STD_ON" : "STD_OFF"}
#define CAN_TXRX_PROCESSING_MODE          CAN_PROC_${ecucConfig.CanTxRxProcessingMode}
#define CAN_HRH0_FILTER_CODE              (${ecucConfig.CanHwFilterCodeHex}UL)

/* Fls ECUC Parameters (SWS_Fls R23-11) */
#define FLS_DEFAULT_MODE                  ${ecucConfig.FlsDefaultMode}
#define FLS_PAGE_SIZE_BYTES               (${ecucConfig.FlsPageSize}U)
#define FLS_WRITE_VERIFICATION_ENABLED    ${ecucConfig.FlsWriteVerificationEnabled ? "STD_ON" : "STD_OFF"}
#endif`;
  }
  return JSON.stringify({ standard: "AUTOSAR Classic R22-11 / R23-11", ecucConfig, snapshotState: { regA: fmtHex2(simState.regA), regB: fmtHex2(simState.regB), clockMs: simState.clockMs } }, null, 2);
}

const EXPORT_FILENAMES = ["MCAL_Ecuc.arxml", "Mcu_Port_Dio_Cfg.h", "Adc_Pwm_Cfg.h", "Spi_Can_Fls_Cfg.h", "MCAL_Config.json"];

function openExportModal() {
  const m = document.getElementById("exportModal");
  if (m) m.classList.remove("hidden");
  switchExportTab(currentExportTab);
}

function closeExportModal() {
  const m = document.getElementById("exportModal");
  if (m) m.classList.add("hidden");
}

function switchExportTab(idx) {
  currentExportTab = idx;
  for (let i = 0; i < 5; i++) {
    const b = document.getElementById("expTab" + i);
    if (b) b.className = i === idx ? "btn btn-sm btn-pri" : "btn btn-sm";
  }
  const area = document.getElementById("exportCodeArea");
  if (area) area.textContent = generateExportText(idx);
}

function copyExportCode() {
  const txt = generateExportText(currentExportTab);
  if (navigator.clipboard) navigator.clipboard.writeText(txt);
}

function triggerFileDownload(filename, content, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(a.href), 500);
}

function downloadExportCode() {
  triggerFileDownload(EXPORT_FILENAMES[currentExportTab], generateExportText(currentExportTab));
}

function downloadStandaloneHTML() {
  const html = "<!DOCTYPE html>\n" + document.documentElement.outerHTML;
  triggerFileDownload("AUTOSAR_MCAL_Simulator.html", html, "text/html;charset=utf-8");
}
