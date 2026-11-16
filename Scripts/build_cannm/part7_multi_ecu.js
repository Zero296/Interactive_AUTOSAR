/*************************************************************************
 * PART 7: MULTI-ECU CAN NM BUS COMMUNICATION SIMULATOR
 * Decentralized Direct NM between 2+ ECUs on Virtual CAN Bus (R25-11)
 *************************************************************************/

function createMultiEcuNode(id, name, shortRole, nodeId, offsetMs, roleClass) {
  return {
    id,
    name,
    shortRole,
    roleClass,
    mode: "NM_MODE_BUS_SLEEP",
    subState: "NM_STATE_REPEAT_MESSAGE",
    netRequest: false,
    commEnabled: true,
    immBurstActive: false,
    burstLeft: 0,
    cfgOpen: false,
    cbv: { rmr: false, pnsr: false, csr: false, awb: false, pnl: false, pni: false },
    timers: { repeatMsg: 0, timeout: 0, waitBusSleep: 0, msgCycle: 0 },
    wakeupSource: "None",
    lastActivity: "Chưa có",
    userDataHex: id === "ECU1" ? "11 22 33 44 55 66" : (id === "ECU2" ? "A1 B2 C3 D4 E5 F6" : "CA FE BA BE 00 01"),
    cfg: {
      CanNmNodeId: nodeId,
      CanNmBaseCanId: 0x500,
      CanNmRepeatMessageTime: 1500,
      CanNmTimeoutTime: 2000,
      CanNmWaitBusSleepTime: 1500,
      CanNmMsgCycleTime: 1000,
      CanNmMsgCycleOffset: offsetMs,
      CanNmMsgReducedTime: 500,
      CanNmImmediateNmTransmissions: 3,
      CanNmImmediateNmCycleTime: 100,
      CanNmPassiveModeEnabled: false,
      CanNmImmediateRestartEnabled: false,
      CanNmNodeDetectionEnabled: true,
      CanNmBusLoadReductionEnabled: false,
      CanNmPnEnabled: false,
      CanNmPnFilterMaskHex: "05 00",
      txPnMaskHex: "01 00",
      CanNmActiveWakeupBitEnabled: true
    }
  };
}

let multiState = {
  ecuCount: 2,
  autoWakeupOnRx: true,
  autoScrollBus: true,
  clockMs: 0,
  autoClockTimer: null,
  lastFrame: null,
  busFrames: [],
  busSeq: 0,
  traceLogs: [],
  ecus: [
    createMultiEcuNode("ECU1", "ECU #1", "VCU / BCM", 0x1A, 100, ""),
    createMultiEcuNode("ECU2", "ECU #2", "IPC / Cluster", 0x2B, 200, "ecu-b"),
    createMultiEcuNode("ECU3", "ECU #3", "BMS / Gateway", 0x3C, 300, "ecu-c")
  ]
};

function multiGetCbvByte(ecu) {
  let val = 0;
  if (ecu.cbv.rmr) val |= (1 << 0);
  if (ecu.cbv.pnsr) val |= (1 << 1);
  if (ecu.cbv.csr) val |= (1 << 3);
  if (ecu.cbv.awb) val |= (1 << 4);
  if (ecu.cbv.pnl) val |= (1 << 5);
  if (ecu.cbv.pni || ecu.cfg.CanNmPnEnabled) val |= (1 << 6);
  return val & 0xFF;
}

function multiParseHexBytes(hexStr) {
  if (typeof parseHexBytes === "function") return parseHexBytes(hexStr);
  return String(hexStr || "").trim().split(/[\s,]+/).filter(Boolean).map(h => parseInt(h, 16) || 0);
}

function multiFormatHexBytes(arr) {
  if (typeof formatHexBytes === "function") return formatHexBytes(arr);
  return (arr || []).map(b => (b & 0xFF).toString(16).toUpperCase().padStart(2, "0")).join(" ");
}

function multiFormatPduBytes(ecu) {
  // SWS_CanNm_00025: Pad unused User Data bytes with 0xFF
  const userBytes = multiParseHexBytes(ecu.userDataHex).slice(0, 6);
  while (userBytes.length < 6) userBytes.push(0xFF);
  const payload = [...userBytes];
  if (ecu.cfg.CanNmPnEnabled) {
    // SWS_CanNm_00500 / SWS_CanNm_00518: Tx PN vector uses IRA (txPnMaskHex when NetReq=TRUE, else 0x00), NOT Rx FilterMask
    const txPn = ecu.netRequest ? multiParseHexBytes(ecu.cfg.txPnMaskHex) : [0, 0];
    payload[0] = txPn.length > 0 ? (txPn[0] & 0xFF) : 0x00;
    payload[1] = txPn.length > 1 ? (txPn[1] & 0xFF) : 0x00;
  }
  return [ecu.cfg.CanNmNodeId & 0xFF, multiGetCbvByte(ecu), ...payload];
}

function addMultiTraceLog(type, srcTag, route, title, desc) {
  multiState.traceLogs.unshift({
    time: `t=${multiState.clockMs}ms`,
    type,
    srcTag,
    route,
    title,
    desc
  });
  if (multiState.traceLogs.length > 100) multiState.traceLogs.pop();
}

function deliverFrameToEcu(rxEcu, frame) {
  const cbvHex = "0x" + frame.cbvByte.toString(16).toUpperCase().padStart(2, "0");

  // Partial Networking Rx Filter per ECU (SWS_CanNm_00409 / SWS_CanNm_00411)
  if (rxEcu.cfg.CanNmPnEnabled) {
    if (!frame.pni) {
      rxEcu.lastActivity = `Bỏ qua Rx ${frame.canIdHex} (PNI=0)`;
      addMultiTraceLog(
        "WARN",
        rxEcu.id,
        `${rxEcu.name} PN Filter`,
        `IGNORED (PNI=0 từ ${frame.srcName})`,
        `[SWS_CanNm_00411] ${rxEcu.name} bật CanNmPnEnabled=TRUE nhưng bản tin từ ${frame.srcName} có PNI=0 ➔ Bỏ qua.`
      );
      return;
    }
    const rxPn = Array.isArray(frame.pnBytes) ? frame.pnBytes : [0, 0];
    const myMask = multiParseHexBytes(rxEcu.cfg.CanNmPnFilterMaskHex);
    const m0 = myMask.length > 0 ? myMask[0] : 0;
    const m1 = myMask.length > 1 ? myMask[1] : 0;
    const and0 = (rxPn[0] || 0) & m0;
    const and1 = (rxPn[1] || 0) & m1;
    if ((and0 | and1) === 0) {
      const rxHex = multiFormatHexBytes([(rxPn[0] || 0), (rxPn[1] || 0)]);
      const maskHex = multiFormatHexBytes([m0, m1]);
      rxEcu.lastActivity = `Lọc bỏ Rx ${frame.canIdHex} (PN [${rxHex}] & [${maskHex}] = 0)`;
      addMultiTraceLog(
        "WARN",
        rxEcu.id,
        `${rxEcu.name} PN Filter`,
        `IGNORED (Không khớp PNC FilterMask)`,
        `[SWS_CanNm_00409] ${rxEcu.name} nhận PNI=[${rxHex}] & FilterMask=[${maskHex}] == 0 ➔ Bỏ qua, không đánh thức / không nạp Timeout.`
      );
      return;
    }
  }

  rxEcu.lastActivity = `Rx ${frame.canIdHex} từ ${frame.srcName} (CBV=${cbvHex})`;

  if (rxEcu.mode === "NM_MODE_BUS_SLEEP") {
    addMultiTraceLog(
      "WARN",
      rxEcu.id,
      `${rxEcu.name} ⬅ CAN Bus`,
      `CANNM_E_NET_START_IND (0x04) & Nm_NetworkStartIndication()`,
      `[SWS_CanNm_00336 / SWS_CanNm_00127] ${rxEcu.name} nhận gói ${frame.canIdHex} từ ${frame.srcName} khi ở BUS-SLEEP (CanNm KHÔNG tự wakeup).${multiState.autoWakeupOnRx ? " Mô phỏng ComM phản hồi -> CanNm_PassiveStartUp()." : " Giữ nguyên BUS_SLEEP (Auto PassiveStartUp=OFF)."}`
    );
    if (multiState.autoWakeupOnRx) {
      rxEcu.wakeupSource = `Rx từ ${frame.srcName} (ComM PassiveStartUp)`;
      rxEcu.mode = "NM_MODE_NETWORK";
      rxEcu.subState = "NM_STATE_REPEAT_MESSAGE";
      rxEcu.cbv.awb = false;
      rxEcu.cbv.rmr = false;
      rxEcu.cbv.pnsr = false;
      rxEcu.netRequest = false;
      rxEcu.immBurstActive = false;
      rxEcu.burstLeft = 0;
      rxEcu.timers.waitBusSleep = 0;
      rxEcu.timers.repeatMsg = rxEcu.cfg.CanNmRepeatMessageTime;
      rxEcu.timers.timeout = rxEcu.cfg.CanNmTimeoutTime;
      rxEcu.timers.msgCycle = rxEcu.cfg.CanNmPassiveModeEnabled ? 0 : rxEcu.cfg.CanNmMsgCycleOffset;
      addMultiTraceLog(
        "STATE",
        rxEcu.id,
        `${rxEcu.name} State Machine`,
        `BUS_SLEEP ➔ NETWORK: REPEAT_MESSAGE (AWB=0)`,
        `[SWS_CanNm_00128] ComM gọi CanNm_PassiveStartUp(); Tx đầu tiên sau MsgCycleOffset=${rxEcu.cfg.CanNmMsgCycleOffset}ms [PRS_Nm_00334].`
      );
    }
    return;
  }

  if (rxEcu.mode === "NM_MODE_PREPARE_BUS_SLEEP") {
    rxEcu.wakeupSource = `Rx từ ${frame.srcName}`;
    rxEcu.mode = "NM_MODE_NETWORK";
    rxEcu.subState = "NM_STATE_REPEAT_MESSAGE";
    rxEcu.cbv.awb = false;
    rxEcu.cbv.rmr = false;
    rxEcu.immBurstActive = false;
    rxEcu.burstLeft = 0;
    rxEcu.timers.waitBusSleep = 0;
    rxEcu.timers.repeatMsg = rxEcu.cfg.CanNmRepeatMessageTime;
    rxEcu.timers.timeout = rxEcu.cfg.CanNmTimeoutTime;
    rxEcu.timers.msgCycle = rxEcu.cfg.CanNmPassiveModeEnabled ? 0 : rxEcu.cfg.CanNmMsgCycleOffset;
    addMultiTraceLog(
      "STATE",
      rxEcu.id,
      `${rxEcu.name} State Machine`,
      `PREPARE_BUS_SLEEP ➔ REPEAT_MESSAGE (AWB=0)`,
      `[SWS_CanNm_00124 / PRS_Nm_00334] ${rxEcu.name} nhận NM PDU từ ${frame.srcName} khi đang Prepare Bus-Sleep ➔ quay lại Network Mode (Offset=${rxEcu.cfg.CanNmMsgCycleOffset}ms).`
    );
    return;
  }

  if (rxEcu.mode === "NM_MODE_NETWORK") {
    if (rxEcu.commEnabled) {
      rxEcu.timers.timeout = rxEcu.cfg.CanNmTimeoutTime;
    }

    // Bus Load Reduction on Rx in Normal Operation (SWS_CanNm_00052 / SWS_CanNm_00069)
    if (
      rxEcu.commEnabled &&
      !rxEcu.cfg.CanNmPassiveModeEnabled &&
      rxEcu.cfg.CanNmBusLoadReductionEnabled &&
      rxEcu.subState === "NM_STATE_NORMAL_OPERATION" &&
      rxEcu.cfg.CanNmMsgReducedTime > 0
    ) {
      rxEcu.timers.msgCycle = rxEcu.cfg.CanNmMsgReducedTime;
      addMultiTraceLog(
        "API",
        rxEcu.id,
        `${rxEcu.name} BusLoadReduction`,
        `Hoãn Tx: MsgCycleTimer = ${rxEcu.cfg.CanNmMsgReducedTime}ms`,
        `[SWS_CanNm_00069] ${rxEcu.name} nhận NM PDU từ ${frame.srcName} ở Normal Operation ➔ nạp CanNmMsgReducedTime=${rxEcu.cfg.CanNmMsgReducedTime}ms.`
      );
    }

    if (
      frame.rmr &&
      rxEcu.cfg.CanNmNodeDetectionEnabled &&
      (rxEcu.subState === "NM_STATE_NORMAL_OPERATION" || rxEcu.subState === "NM_STATE_READY_SLEEP")
    ) {
      const prevSub = rxEcu.subState.replace("NM_STATE_", "");
      const isFromRss = rxEcu.subState === "NM_STATE_READY_SLEEP";
      const swsRmr = isFromRss ? "SWS_CanNm_00111" : "SWS_CanNm_00119";
      rxEcu.subState = "NM_STATE_REPEAT_MESSAGE";
      rxEcu.immBurstActive = false;
      rxEcu.burstLeft = 0;
      rxEcu.timers.repeatMsg = rxEcu.cfg.CanNmRepeatMessageTime;
      if (rxEcu.commEnabled && !rxEcu.cfg.CanNmPassiveModeEnabled && (isFromRss || rxEcu.timers.msgCycle <= 0)) {
        rxEcu.timers.msgCycle = rxEcu.cfg.CanNmMsgCycleOffset;
      }
      addMultiTraceLog(
        "STATE",
        rxEcu.id,
        `${rxEcu.name} State Machine`,
        `${prevSub} ➔ REPEAT_MESSAGE (Nhận RMR=1 từ ${frame.srcName})`,
        `[${swsRmr} / SWS_CanNm_00100] ${rxEcu.name} hưởng ứng yêu cầu điểm danh, báo Nm_RepeatMessageIndication() và nạp RepeatMsgTimer=${rxEcu.cfg.CanNmRepeatMessageTime}ms.`
      );
    }
  }
}

function transmitMultiEcuFrame(ecu, reasonLabel) {
  if (ecu.cfg.CanNmPassiveModeEnabled) {
    addMultiTraceLog("WARN", ecu.id, ecu.name, "Bỏ qua Tx (PassiveMode = TRUE)", `${ecu.name} chỉ nghe bus.`);
    return;
  }
  if (!ecu.commEnabled) {
    addMultiTraceLog("WARN", ecu.id, ecu.name, "Tx bị khóa (UDS 0x28 DisableComm)", `${ecu.name} đang tắt truyền thông.`);
    return;
  }

  const bytes = multiFormatPduBytes(ecu);
  const hexArr = bytes.map(b => b.toString(16).toUpperCase().padStart(2, "0"));
  const canIdHex = "0x" + (ecu.cfg.CanNmBaseCanId + ecu.cfg.CanNmNodeId).toString(16).toUpperCase();
  const cbvByte = bytes[1];

  ecu.timers.timeout = ecu.cfg.CanNmTimeoutTime;
  ecu.lastActivity = `Tx ${canIdHex} [${hexArr[0]} ${hexArr[1]} ...]`;

  multiState.busSeq += 1;
  const isPni = !!(ecu.cbv.pni || ecu.cfg.CanNmPnEnabled);
  const frame = {
    seq: multiState.busSeq,
    srcId: ecu.id,
    srcName: ecu.name,
    roleClass: ecu.roleClass || "",
    srcNodeId: ecu.cfg.CanNmNodeId,
    canIdHex,
    hexArr,
    cbvByte,
    awb: ecu.cbv.awb,
    rmr: ecu.cbv.rmr,
    pni: isPni,
    pnBytes: isPni ? bytes.slice(2, 4) : [0, 0],
    timeMs: multiState.clockMs,
    reason: reasonLabel
  };
  multiState.lastFrame = frame;
  multiState.busFrames.push(frame);
  if (multiState.busFrames.length > 80) {
    multiState.busFrames.shift();
  }

  addMultiTraceLog(
    "BUS",
    ecu.id,
    `${ecu.name} ➔ CAN Bus`,
    `CanIf_Transmit(ID=${canIdHex}, Data=[${hexArr.join(" ")}])`,
    `${reasonLabel} | AWB=${ecu.cbv.awb ? 1 : 0}, RMR=${ecu.cbv.rmr ? 1 : 0}, PNI=${isPni ? 1 : 0} | Reset Timeout(${ecu.name})=${ecu.cfg.CanNmTimeoutTime}ms`
  );

  for (let i = 0; i < multiState.ecuCount; i++) {
    const other = multiState.ecus[i];
    if (other && other.id !== ecu.id) {
      deliverFrameToEcu(other, frame);
    }
  }
}

function multiEcuAction(idx, actionType) {
  const ecu = multiState.ecus[idx];
  if (!ecu) return;

  const triggerWakeupTx = (isPrepareRestart) => {
    const immCnt = ecu.cfg.CanNmImmediateNmTransmissions;
    if (isPrepareRestart && ecu.cfg.CanNmImmediateRestartEnabled && ecu.commEnabled) {
      ecu.immBurstActive = false;
      ecu.burstLeft = 0;
      ecu.timers.msgCycle = ecu.cfg.CanNmMsgCycleTime;
      transmitMultiEcuFrame(ecu, "Immediate Restart Tx [SWS_CanNm_00122]");
    } else if (immCnt === 1 && ecu.commEnabled) {
      ecu.immBurstActive = false;
      ecu.burstLeft = 0;
      ecu.timers.msgCycle = ecu.cfg.CanNmMsgCycleTime;
      transmitMultiEcuFrame(ecu, "Immediate Burst Tx #1/1 [SWS_CanNm_00335]");
    } else if (immCnt > 1 && ecu.commEnabled) {
      ecu.immBurstActive = true;
      ecu.burstLeft = immCnt - 1;
      ecu.timers.msgCycle = ecu.cfg.CanNmImmediateNmCycleTime;
      transmitMultiEcuFrame(ecu, `Burst Tx #1/${immCnt}`);
    } else {
      ecu.immBurstActive = false;
      ecu.burstLeft = 0;
      ecu.timers.msgCycle = ecu.cfg.CanNmMsgCycleOffset;
    }
  };

  if (actionType === "netReq") {
    if (ecu.cfg.CanNmPassiveModeEnabled) {
      addMultiTraceLog("WARN", ecu.id, ecu.name, "CanNm_NetworkRequest() -> E_NOT_OK", "[SWS_CanNm_00130] Passive Mode không hỗ trợ NetworkRequest.");
      renderMultiEcuView();
      return;
    }
    ecu.netRequest = true;
    ecu.wakeupSource = "Active SWC Request";
    addMultiTraceLog("API", ecu.id, `SWC ➔ ${ecu.name}`, "CanNm_NetworkRequest()", `[SWS_CanNm_00104] ${ecu.name} yêu cầu giữ mạng (FULL_COM).`);

    if (ecu.mode === "NM_MODE_BUS_SLEEP") {
      ecu.mode = "NM_MODE_NETWORK";
      ecu.subState = "NM_STATE_REPEAT_MESSAGE";
      ecu.cbv.awb = !!ecu.cfg.CanNmActiveWakeupBitEnabled;
      ecu.timers.waitBusSleep = 0;
      ecu.timers.repeatMsg = ecu.cfg.CanNmRepeatMessageTime;
      ecu.timers.timeout = ecu.cfg.CanNmTimeoutTime;

      addMultiTraceLog("STATE", ecu.id, `${ecu.name} State Machine`, "BUS_SLEEP ➔ REPEAT_MESSAGE (AWB=" + (ecu.cbv.awb ? 1 : 0) + ")", `[SWS_CanNm_00129] ${ecu.name} Active Wakeup!`);
      triggerWakeupTx(false);
    } else if (ecu.mode === "NM_MODE_PREPARE_BUS_SLEEP") {
      ecu.mode = "NM_MODE_NETWORK";
      ecu.subState = "NM_STATE_REPEAT_MESSAGE";
      ecu.cbv.awb = !!ecu.cfg.CanNmActiveWakeupBitEnabled;
      ecu.timers.waitBusSleep = 0;
      ecu.timers.repeatMsg = ecu.cfg.CanNmRepeatMessageTime;
      ecu.timers.timeout = ecu.cfg.CanNmTimeoutTime;

      addMultiTraceLog("STATE", ecu.id, `${ecu.name} State Machine`, "PREPARE_BUS_SLEEP ➔ REPEAT_MESSAGE", `[SWS_CanNm_00123] ${ecu.name} đánh thức lại từ Prepare Bus-Sleep (MsgCycleOffset=${ecu.cfg.CanNmMsgCycleOffset}ms nếu !ImmRestart)!`);
      triggerWakeupTx(true);
    } else if (ecu.mode === "NM_MODE_NETWORK") {
      if (ecu.subState === "NM_STATE_READY_SLEEP") {
        ecu.subState = "NM_STATE_NORMAL_OPERATION";
        addMultiTraceLog("STATE", ecu.id, `${ecu.name} State Machine`, "READY_SLEEP ➔ NORMAL_OPERATION", `[SWS_CanNm_00110 / SWS_CanNm_00006] ${ecu.name} quay lại Normal Operation & phát ngay lập tức.`);
        if (ecu.commEnabled) {
          ecu.timers.msgCycle = ecu.cfg.CanNmMsgCycleTime;
          transmitMultiEcuFrame(ecu, "Immediate Tx (Ready Sleep -> Normal Operation [SWS_CanNm_00006])");
        } else {
          ecu.timers.msgCycle = 0;
        }
      }
    }
  } else if (actionType === "netRel") {
    if (ecu.cfg.CanNmPassiveModeEnabled) {
      addMultiTraceLog("WARN", ecu.id, ecu.name, "CanNm_NetworkRelease() -> E_NOT_OK", "[SWS_CanNm_00260 / SWS_CanNm_00130] Passive Mode không hỗ trợ NetworkRelease.");
      renderMultiEcuView();
      return;
    }
    ecu.netRequest = false;
    addMultiTraceLog("API", ecu.id, `SWC ➔ ${ecu.name}`, "CanNm_NetworkRelease()", `[SWS_CanNm_00105] ${ecu.name} báo hết nhu cầu dùng mạng.`);
    if (ecu.mode === "NM_MODE_NETWORK" && ecu.subState === "NM_STATE_NORMAL_OPERATION") {
      ecu.subState = "NM_STATE_READY_SLEEP";
      ecu.timers.msgCycle = 0; // SWS_CanNm_00108 / SWS_CanNm_00051
      ecu.immBurstActive = false;
      ecu.burstLeft = 0;
      addMultiTraceLog("STATE", ecu.id, `${ecu.name} State Machine`, "NORMAL_OPERATION ➔ READY_SLEEP", `[SWS_CanNm_00118 / SWS_CanNm_00108 / SWS_CanNm_00051] ${ecu.name} hủy MsgCycleTimer=0, ngưng phát Tx định kỳ và chờ NM-Timeout.`);
    }
  } else if (actionType === "passive") {
    if (ecu.mode === "NM_MODE_NETWORK") {
      addMultiTraceLog("WARN", ecu.id, ecu.name, "CanNm_PassiveStartUp() -> E_NOT_OK", `[SWS_CanNm_00147] ${ecu.name} đã ở NETWORK_MODE -> trả E_NOT_OK.`);
      renderMultiEcuView();
      return;
    }
    ecu.wakeupSource = "Passive StartUp";
    addMultiTraceLog("API", ecu.id, `EcuM/ComM ➔ ${ecu.name}`, "CanNm_PassiveStartUp()", `[SWS_CanNm_00128] Đánh thức thụ động ${ecu.name}.`);
    const fromLbl = ecu.mode.replace("NM_MODE_", "");
    ecu.mode = "NM_MODE_NETWORK";
    ecu.subState = "NM_STATE_REPEAT_MESSAGE";
    ecu.cbv.awb = false;
    ecu.cbv.rmr = false;
    ecu.netRequest = false;
    ecu.immBurstActive = false;
    ecu.burstLeft = 0;
    ecu.timers.waitBusSleep = 0;
    ecu.timers.repeatMsg = ecu.cfg.CanNmRepeatMessageTime;
    ecu.timers.timeout = ecu.cfg.CanNmTimeoutTime;
    ecu.timers.msgCycle = ecu.cfg.CanNmPassiveModeEnabled ? 0 : ecu.cfg.CanNmMsgCycleOffset;
    addMultiTraceLog("STATE", ecu.id, `${ecu.name} State Machine`, `${fromLbl} ➔ REPEAT_MESSAGE (AWB=0)`, `[SWS_CanNm_00128 / PRS_Nm_00334] ${ecu.name} thức thụ động${ecu.cfg.CanNmPassiveModeEnabled ? "" : `, chờ MsgCycleOffset=${ecu.cfg.CanNmMsgCycleOffset}ms rồi phát`}.`);
  } else if (actionType === "rmr") {
    if (!ecu.cfg.CanNmNodeDetectionEnabled || ecu.cfg.CanNmPassiveModeEnabled) {
      addMultiTraceLog("WARN", ecu.id, ecu.name, "CanNm_RepeatMessageRequest() -> E_NOT_OK", `${ecu.name} chưa bật NodeDetection hoặc đang PassiveMode.`);
      renderMultiEcuView();
      return;
    }
    if (ecu.mode !== "NM_MODE_NETWORK" || ecu.subState === "NM_STATE_REPEAT_MESSAGE") {
      addMultiTraceLog("WARN", ecu.id, ecu.name, "CanNm_RepeatMessageRequest() -> E_NOT_OK", `[SWS_CanNm_00137] ${ecu.name} chỉ gọi được RepeatMessageRequest() ở NORMAL_OPERATION hoặc READY_SLEEP.`);
      renderMultiEcuView();
      return;
    }
    const isFromRss = ecu.subState === "NM_STATE_READY_SLEEP";
    const swsRef = isFromRss ? "SWS_CanNm_00112 / SWS_CanNm_00113" : "SWS_CanNm_00120 / SWS_CanNm_00121";
    ecu.cbv.rmr = true;
    ecu.subState = "NM_STATE_REPEAT_MESSAGE";
    ecu.immBurstActive = false;
    ecu.burstLeft = 0;
    ecu.timers.repeatMsg = ecu.cfg.CanNmRepeatMessageTime;
    if (ecu.commEnabled && (isFromRss || ecu.timers.msgCycle <= 0)) {
      ecu.timers.msgCycle = ecu.cfg.CanNmMsgCycleOffset; // SWS_CanNm_00100 / SWS_CanNm_00221
    }
    addMultiTraceLog("STATE", ecu.id, `${ecu.name} State Machine`, `${isFromRss ? "READY_SLEEP" : "NORMAL_OPERATION"} ➔ REPEAT_MESSAGE (Bật RMR=1)`, `[${swsRef} / SWS_CanNm_00100] ${ecu.name} bật RMR=1 cho các khung sắp phát (Offset=${ecu.cfg.CanNmMsgCycleOffset}ms).`);
  } else if (actionType === "toggleComm") {
    if (ecu.mode !== "NM_MODE_NETWORK") {
      addMultiTraceLog("WARN", ecu.id, `Dcm ➔ ${ecu.name}`, "CanNm_Disable/EnableCommunication() -> E_NOT_OK", `[SWS_CanNm_00172 / SWS_CanNm_00295] ${ecu.name} không ở NETWORK_MODE -> trả E_NOT_OK.`);
      renderMultiEcuView();
      return;
    }
    ecu.commEnabled = !ecu.commEnabled;
    if (!ecu.commEnabled) {
      ecu.timers.msgCycle = 0; // SWS_CanNm_00173
      ecu.timers.timeout = 0; // SWS_CanNm_00174
      ecu.immBurstActive = false;
      ecu.burstLeft = 0;
      addMultiTraceLog("API", ecu.id, `Dcm ➔ ${ecu.name}`, "CanNm_DisableCommunication()", `[SWS_CanNm_00173 / SWS_CanNm_00174] Hủy MsgCycle=0 & dừng NM-TimeoutTimer=0 trên ${ecu.name}.`);
    } else {
      ecu.timers.timeout = ecu.cfg.CanNmTimeoutTime; // SWS_CanNm_00179
      ecu.timers.msgCycle = (ecu.subState !== "NM_STATE_READY_SLEEP" && !ecu.cfg.CanNmPassiveModeEnabled)
        ? ecu.cfg.CanNmMsgCycleOffset
        : 0; // SWS_CanNm_00178
      addMultiTraceLog("API", ecu.id, `Dcm ➔ ${ecu.name}`, "CanNm_EnableCommunication()", `[SWS_CanNm_00178 / SWS_CanNm_00179] Khôi phục NM-Timeout=${ecu.cfg.CanNmTimeoutTime}ms${ecu.timers.msgCycle > 0 ? ` & Tx sau Offset=${ecu.timers.msgCycle}ms` : ""} trên ${ecu.name}.`);
    }
  } else if (actionType === "reset") {
    const keptOpen = ecu.cfgOpen;
    const fresh = createMultiEcuNode(ecu.id, ecu.name, ecu.shortRole, ecu.cfg.CanNmNodeId, ecu.cfg.CanNmMsgCycleOffset, ecu.roleClass);
    fresh.cfg = JSON.parse(JSON.stringify(ecu.cfg));
    fresh.cfgOpen = keptOpen;
    multiState.ecus[idx] = fresh;
    addMultiTraceLog("STATE", ecu.id, ecu.name, `Reset ${ecu.name} về BUS_SLEEP`, "Khởi tạo lại trạng thái CanNM về trạng thái ngủ ban đầu.");
  }

  renderMultiEcuView();
}

function stepMultiClockTick(deltaMs, skipRender) {
  multiState.clockMs += deltaMs;
  const txDue = [];

  for (let i = 0; i < multiState.ecuCount; i++) {
    const ecu = multiState.ecus[i];

    // 1. NM-Timeout Timer in NETWORK_MODE
    if (ecu.mode === "NM_MODE_NETWORK" && ecu.commEnabled && ecu.timers.timeout > 0) {
      ecu.timers.timeout = Math.max(0, ecu.timers.timeout - deltaMs);
      if (ecu.timers.timeout === 0) {
        if (ecu.subState === "NM_STATE_READY_SLEEP") {
          ecu.mode = "NM_MODE_PREPARE_BUS_SLEEP";
          ecu.cbv.awb = false;
          ecu.cbv.rmr = false;
          ecu.immBurstActive = false;
          ecu.burstLeft = 0;
          ecu.timers.msgCycle = 0;
          ecu.timers.repeatMsg = 0;
          ecu.timers.waitBusSleep = ecu.cfg.CanNmWaitBusSleepTime;
          addMultiTraceLog("STATE", ecu.id, `${ecu.name} State Machine`, "READY_SLEEP ➔ PREPARE_BUS_SLEEP", `[SWS_CanNm_00109] Hết NM-Timeout (0ms) ➔ Xóa AWB=0, bắt đầu đếm WaitBusSleepTimer=${ecu.cfg.CanNmWaitBusSleepTime}ms.`);
        } else {
          // SWS_CanNm_00101 / 00117 / 00193 / 00194: Restart Timeout & DET CANNM_E_NETWORK_TIMEOUT
          ecu.timers.timeout = ecu.cfg.CanNmTimeoutTime;
          addMultiTraceLog("WARN", ecu.id, `${ecu.name} DET Runtime`, "CANNM_E_NETWORK_TIMEOUT (0x11) — Reload Timeout", `[SWS_CanNm_00101 / SWS_CanNm_00117 / SWS_CanNm_00193] Hết NM-Timeout ở ${ecu.subState.replace("NM_STATE_", "")} ➔ Restart Timeout=${ecu.cfg.CanNmTimeoutTime}ms & Det_ReportRuntimeError(0x11).`);
        }
      }
    }

    // 2. RepeatMessageTimer in REPEAT_MESSAGE (also exits if CanNmRepeatMessageTime == 0 [SWS_CanNm_00102])
    if (ecu.mode === "NM_MODE_NETWORK" && ecu.subState === "NM_STATE_REPEAT_MESSAGE") {
      ecu.timers.repeatMsg = Math.max(0, ecu.timers.repeatMsg - deltaMs);
      if (ecu.timers.repeatMsg === 0) {
        ecu.cbv.rmr = false;
        ecu.immBurstActive = false;
        ecu.burstLeft = 0;
        if (ecu.netRequest) {
          ecu.subState = "NM_STATE_NORMAL_OPERATION";
          if (ecu.commEnabled && !ecu.cfg.CanNmPassiveModeEnabled && ecu.timers.msgCycle <= 0) {
            ecu.timers.msgCycle = ecu.cfg.CanNmMsgCycleTime;
          }
          addMultiTraceLog("STATE", ecu.id, `${ecu.name} State Machine`, "REPEAT_MESSAGE ➔ NORMAL_OPERATION", `[SWS_CanNm_00103 / SWS_CanNm_00040] Hết RepeatMessageTime & NetReq=1 ➔ Normal Operation (giữ MsgCycleTimer).`);
        } else {
          ecu.subState = "NM_STATE_READY_SLEEP";
          ecu.timers.msgCycle = 0; // SWS_CanNm_00108 / 00051
          addMultiTraceLog("STATE", ecu.id, `${ecu.name} State Machine`, "REPEAT_MESSAGE ➔ READY_SLEEP", `[SWS_CanNm_00106 / SWS_CanNm_00108 / SWS_CanNm_00051] Hết RepeatMessageTime & NetReq=0 ➔ Ready Sleep (Hủy MsgCycleTimer).`);
        }
      }
    }

    // 3. WaitBusSleepTimer in PREPARE_BUS_SLEEP
    if (ecu.mode === "NM_MODE_PREPARE_BUS_SLEEP" && ecu.timers.waitBusSleep > 0) {
      ecu.timers.waitBusSleep = Math.max(0, ecu.timers.waitBusSleep - deltaMs);
      if (ecu.timers.waitBusSleep === 0) {
        ecu.mode = "NM_MODE_BUS_SLEEP";
        ecu.wakeupSource = "None";
        addMultiTraceLog("STATE", ecu.id, `${ecu.name} State Machine`, "PREPARE_BUS_SLEEP ➔ BUS_SLEEP", `[SWS_CanNm_00248 / SWS_CanNm_00088] Hết WaitBusSleepTime (0ms) ➔ Tắt Controller & Transceiver.`);
      }
    }

    // 4. Periodic MsgCycle & Immediate Burst Tx
    if (
      ecu.mode === "NM_MODE_NETWORK" &&
      ecu.commEnabled &&
      !ecu.cfg.CanNmPassiveModeEnabled &&
      (ecu.subState === "NM_STATE_REPEAT_MESSAGE" || ecu.subState === "NM_STATE_NORMAL_OPERATION") &&
      ecu.timers.msgCycle > 0
    ) {
      ecu.timers.msgCycle = Math.max(0, ecu.timers.msgCycle - deltaMs);
      if (ecu.timers.msgCycle === 0) {
        txDue.push(ecu);
      }
    }
  }

  // Execute queued CAN Bus Transmissions in CAN ID arbitration order (lowest ID first) and broadcast to peers
  txDue.sort((a, b) => (a.cfg.CanNmBaseCanId + a.cfg.CanNmNodeId) - (b.cfg.CanNmBaseCanId + b.cfg.CanNmNodeId));
  txDue.forEach(ecu => {
    // If an earlier frame in the same tick deferred this ECU via Bus Load Reduction, skip Tx
    if (ecu.timers.msgCycle > 0) return;
    if (ecu.immBurstActive && ecu.burstLeft > 0) {
      const idxFrame = ecu.cfg.CanNmImmediateNmTransmissions - ecu.burstLeft + 1;
      ecu.burstLeft--;
      if (ecu.burstLeft > 0) {
        ecu.timers.msgCycle = ecu.cfg.CanNmImmediateNmCycleTime;
      } else {
        ecu.immBurstActive = false;
        ecu.timers.msgCycle = ecu.cfg.CanNmMsgCycleTime;
      }
      transmitMultiEcuFrame(ecu, `Burst Tx #${idxFrame}/${ecu.cfg.CanNmImmediateNmTransmissions}`);
    } else {
      ecu.timers.msgCycle = ecu.cfg.CanNmMsgCycleTime;
      transmitMultiEcuFrame(ecu, "Periodic NM Tx");
    }
  });

  if (!skipRender) renderMultiEcuView();
}

function advanceMultiTime(totalMs) {
  const step = 100;
  const ticks = Math.max(1, Math.round(totalMs / step));
  for (let t = 0; t < ticks; t++) {
    stepMultiClockTick(step, t < ticks - 1);
  }
}

function stopMultiClock() {
  if (multiState.autoClockTimer) {
    clearInterval(multiState.autoClockTimer);
    multiState.autoClockTimer = null;
  }
  const btn = document.getElementById("btnMultiClock");
  if (btn) {
    btn.innerText = "▶ Auto Clock";
    btn.classList.remove("amber");
    btn.classList.add("green");
  }
}

function toggleMultiClock() {
  if (multiState.autoClockTimer) {
    stopMultiClock();
  } else {
    const btn = document.getElementById("btnMultiClock");
    if (btn) {
      btn.innerText = "⏸ Dừng Clock (2x)";
      btn.classList.remove("green");
      btn.classList.add("amber");
    }
    multiState.autoClockTimer = setInterval(() => {
      stepMultiClockTick(100);
    }, 500);
  }
}

function setMultiEcuCount(n) {
  multiState.ecuCount = n === 3 ? 3 : 2;
  const b2 = document.getElementById("btnMulti2Ecu");
  const b3 = document.getElementById("btnMulti3Ecu");
  if (b2) b2.classList.toggle("primary", multiState.ecuCount === 2);
  if (b3) b3.classList.toggle("primary", multiState.ecuCount === 3);
  addMultiTraceLog("API", "BUS", "Bus Topology", `Chuyển mô hình sang ${multiState.ecuCount} ECU trên cùng CAN Bus`, "Tất cả node dùng chung Virtual CAN Bus.");
  renderMultiEcuView();
}

function setMultiAutoWakeup(checked) {
  multiState.autoWakeupOnRx = !!checked;
}

function toggleMultiEcuCfg(idx) {
  const ecu = multiState.ecus[idx];
  if (!ecu) return;
  ecu.cfgOpen = !ecu.cfgOpen;
  renderMultiEcuView();
}

function updateMultiEcuCfg(idx, key, val) {
  const ecu = multiState.ecus[idx];
  if (!ecu) return;
  if (typeof val === "boolean") {
    ecu.cfg[key] = val;
  } else if (key === "CanNmPnFilterMaskHex" || key === "txPnMaskHex") {
    const cleaned = multiFormatHexBytes(multiParseHexBytes(val).slice(0, 2));
    ecu.cfg[key] = cleaned || "00 00";
  } else {
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed)) {
      const minVal = (key === "CanNmImmediateNmTransmissions" || key === "CanNmMsgCycleOffset" || key === "CanNmRepeatMessageTime")
        ? 0
        : (key === "CanNmMsgReducedTime" ? 50 : 100);
      ecu.cfg[key] = Math.max(minVal, parsed);
    }
  }
  renderMultiEcuView();
}

function clearMultiBusFrames() {
  multiState.lastFrame = null;
  multiState.busFrames = [];
  multiState.busSeq = 0;
  updateMultiBusBridgeDom();
}

function resetMultiEcuSim(keepLogs) {
  stopMultiClock();
  multiState.clockMs = 0;
  multiState.autoScrollBus = true;
  multiState.lastFrame = null;
  multiState.busFrames = [];
  multiState.busSeq = 0;
  if (!keepLogs) multiState.traceLogs = [];
  multiState.ecus = [
    createMultiEcuNode("ECU1", "ECU #1", "VCU / BCM", 0x1A, 100, ""),
    createMultiEcuNode("ECU2", "ECU #2", "IPC / Cluster", 0x2B, 200, "ecu-b"),
    createMultiEcuNode("ECU3", "ECU #3", "BMS / Gateway", 0x3C, 300, "ecu-c")
  ];
  renderMultiEcuView();
}

function applyMultiPreset(preset) {
  resetMultiEcuSim(false);
  multiState.autoWakeupOnRx = true;
  const chk = document.getElementById("chkMultiAutoWakeup");
  if (chk) chk.checked = true;

  if (preset === "active_wake") {
    multiEcuAction(0, "netReq");
  } else if (preset === "keep_vs_rel") {
    multiEcuAction(0, "netReq");
    advanceMultiTime(1500); // Simulate 15x100ms ticks -> ECU1 Normal Op, ECU2 Ready Sleep
    addMultiTraceLog("API", "BUS", "Preset Hint", "ECU #1 đang ở NORMAL_OPERATION (giữ mạng), ECU #2 ở READY_SLEEP", "Thử bấm +500ms / Auto Clock: ECU #1 vẫn phát định kỳ nên Timeout của ECU #2 liên tục được reload!");
    renderMultiEcuView();
  } else if (preset === "consensus_sleep") {
    multiEcuAction(0, "netReq");
    multiEcuAction(1, "netReq");
    if (multiState.ecuCount === 3) multiEcuAction(2, "netReq");
    advanceMultiTime(1500); // Enter Normal Operation
    for (let i = 0; i < multiState.ecuCount; i++) multiEcuAction(i, "netRel");
    addMultiTraceLog("API", "BUS", "Preset Hint", "Tất cả ECU đã NetworkRelease ➔ cùng ở READY_SLEEP", "Bấm +500ms để xem TimeoutTimer chạm 0ms đồng thời ➔ PREPARE_BUS_SLEEP ➔ BUS_SLEEP!");
    renderMultiEcuView();
  } else if (preset === "rmr_check") {
    multiEcuAction(0, "netReq");
    advanceMultiTime(1500);
    multiEcuAction(1, "rmr");
    advanceMultiTime(multiState.ecus[1].cfg.CanNmMsgCycleOffset || 200);
    addMultiTraceLog("API", "BUS", "Preset Hint", "ECU #2 đã phát RMR=1 sau MsgCycleOffset ➔ ECU #1 quay lại REPEAT_MESSAGE", "[SWS_CanNm_00112 / SWS_CanNm_00119] Kiểm chứng Request Điểm Danh từ Ready Sleep.");
    renderMultiEcuView();
  }
}

function getMultiEcuStateBadge(ecu) {
  if (ecu.mode === "NM_MODE_BUS_SLEEP") return { text: "BUS-SLEEP MODE", cls: "ok" };
  if (ecu.mode === "NM_MODE_PREPARE_BUS_SLEEP") return { text: "PREPARE BUS-SLEEP", cls: "err" };
  return { text: `NETWORK: ${ecu.subState.replace("NM_STATE_", "")}`, cls: "sky" };
}

function buildMultiTimerBoxSkeleton(idx, key, label) {
  return `
    <div class="timer-card compact" style="margin-bottom:0">
      <div class="timer-h">
        <span class="mono" id="multiTimerLbl_${idx}_${key}">${escapeHtml(label)}</span>
        <span class="mono" id="multiTimerVal_${idx}_${key}" style="font-weight:700">0 / 0 ms</span>
      </div>
      <div class="timer-track"><div class="timer-bar" id="multiTimerBar_${idx}_${key}" style="width:0%"></div></div>
    </div>
  `;
}

function updateMultiTimerBoxDom(idx, key, label, curVal, maxVal, color) {
  const lblEl = document.getElementById(`multiTimerLbl_${idx}_${key}`);
  if (lblEl && label && lblEl.textContent !== label) lblEl.textContent = label;
  const valEl = document.getElementById(`multiTimerVal_${idx}_${key}`);
  const barEl = document.getElementById(`multiTimerBar_${idx}_${key}`);
  const nextText = `${curVal} / ${maxVal} ms`;
  if (valEl) {
    if (valEl.textContent !== nextText) valEl.textContent = nextText;
    if (valEl.style.color !== color) valEl.style.color = color;
  }
  if (barEl) {
    const safeMax = Math.max(1, maxVal);
    const pct = Math.min(100, Math.round((curVal / safeMax) * 100)) + "%";
    if (barEl.style.width !== pct) barEl.style.width = pct;
    if (barEl.style.background !== color) barEl.style.background = color;
  }
}

function setMultiTextIfChanged(id, text) {
  const el = document.getElementById(id);
  if (el && el.textContent !== text) el.textContent = text;
}

function setMultiClassIfChanged(id, cls) {
  const el = document.getElementById(id);
  if (el && el.className !== cls) el.className = cls;
}

function buildMultiEcuCardSkeleton(ecu, idx) {
  return `
    <div class="panel multi-ecu-panel ${ecu.roleClass}" id="multiEcuCard_${idx}">
      <div class="panel-h">
        <div class="row wrap" style="gap:6px">
          <span class="panel-t" id="multiEcuTitle_${idx}" style="font-size:12px">${escapeHtml(ecu.name)} • ${escapeHtml(ecu.shortRole)}</span>
          <span class="badge xs" id="multiEcuNodeBadge_${idx}">Node 0x${ecu.cfg.CanNmNodeId.toString(16).toUpperCase()} | Tx 0x${(ecu.cfg.CanNmBaseCanId + ecu.cfg.CanNmNodeId).toString(16).toUpperCase()}</span>
          <span class="badge xs sky hidden" id="multiFlagPn_${idx}">PN</span>
          <span class="badge xs amb hidden" id="multiFlagBlr_${idx}">BLR</span>
          <span class="badge xs vio hidden" id="multiFlagPassive_${idx}">PASSIVE</span>
          <span class="badge xs err hidden" id="multiFlagTxBlocked_${idx}">TX BLOCKED</span>
        </div>
        <div class="row" style="gap:5px">
          <span class="badge ok" id="multiEcuBadge_${idx}">BUS-SLEEP MODE</span>
          <button class="btn xs" id="btnMultiCfg_${idx}" onclick="toggleMultiEcuCfg(${idx})" title="Chỉnh thông số timer / ECUC cho ${escapeHtml(ecu.name)}">⚙</button>
          <button class="btn xs" id="btnMultiReset_${idx}" onclick="multiEcuAction(${idx}, 'reset')" title="Reset riêng ${escapeHtml(ecu.name)} về BUS-SLEEP">↺</button>
        </div>
      </div>

      <div class="panel-b">
        <!-- Event Controls for this ECU (persistent DOM nodes; never recreated on clock ticks) -->
        <div class="multi-ctrl-grid">
          <button class="btn sm green" id="btnMultiReq_${idx}" onclick="multiEcuAction(${idx}, 'netReq')" title="CanNm_NetworkRequest()">🟢 Nw Request</button>
          <button class="btn sm amber" id="btnMultiRel_${idx}" onclick="multiEcuAction(${idx}, 'netRel')" title="CanNm_NetworkRelease()">🟡 Release</button>
          <button class="btn sm sky" id="btnMultiPas_${idx}" onclick="multiEcuAction(${idx}, 'passive')" title="CanNm_PassiveStartUp()">🔵 PassiveStart</button>
          <button class="btn sm vio" id="btnMultiRmr_${idx}" onclick="multiEcuAction(${idx}, 'rmr')" title="CanNm_RepeatMessageRequest() (RMR=1)">🟣 Repeat Msg</button>
          <button class="btn sm" id="btnMultiComm_${idx}" onclick="multiEcuAction(${idx}, 'toggleComm')" title="CanNm_DisableCommunication / EnableCommunication">🔇 Dis. Comm</button>
        </div>

        <div class="multi-cfg-drawer hidden" id="multiCfgDrawer_${idx}">
          <label>RepeatMsgTime (ms)<input id="multiCfg_${idx}_CanNmRepeatMessageTime" type="number" min="0" step="100" value="${ecu.cfg.CanNmRepeatMessageTime}" onchange="updateMultiEcuCfg(${idx}, 'CanNmRepeatMessageTime', this.value)"></label>
          <label>TimeoutTime (ms)<input id="multiCfg_${idx}_CanNmTimeoutTime" type="number" min="200" step="100" value="${ecu.cfg.CanNmTimeoutTime}" onchange="updateMultiEcuCfg(${idx}, 'CanNmTimeoutTime', this.value)"></label>
          <label>WaitBusSleep (ms)<input id="multiCfg_${idx}_CanNmWaitBusSleepTime" type="number" min="200" step="100" value="${ecu.cfg.CanNmWaitBusSleepTime}" onchange="updateMultiEcuCfg(${idx}, 'CanNmWaitBusSleepTime', this.value)"></label>
          <label>MsgCycleTime (ms)<input id="multiCfg_${idx}_CanNmMsgCycleTime" type="number" min="200" step="100" value="${ecu.cfg.CanNmMsgCycleTime}" onchange="updateMultiEcuCfg(${idx}, 'CanNmMsgCycleTime', this.value)"></label>
          <label>CycleOffset (ms)<input id="multiCfg_${idx}_CanNmMsgCycleOffset" type="number" min="0" step="50" value="${ecu.cfg.CanNmMsgCycleOffset}" onchange="updateMultiEcuCfg(${idx}, 'CanNmMsgCycleOffset', this.value)"></label>
          <label>Burst Frames<input id="multiCfg_${idx}_CanNmImmediateNmTransmissions" type="number" min="0" max="10" step="1" value="${ecu.cfg.CanNmImmediateNmTransmissions}" onchange="updateMultiEcuCfg(${idx}, 'CanNmImmediateNmTransmissions', this.value)"></label>
          <label title="SWS_CanNm_00069: Chu kỳ nạp lại khi nhận NM PDU từ node khác ở Normal Operation (khi bật Bus Load Reduction)">MsgReducedTime (ms)<input id="multiCfg_${idx}_CanNmMsgReducedTime" type="number" min="50" step="50" value="${ecu.cfg.CanNmMsgReducedTime}" onchange="updateMultiEcuCfg(${idx}, 'CanNmMsgReducedTime', this.value)"></label>
          <label title="Mặt nạ PNC FilterMask (2 Bytes Hex) dùng khi CanNmPnEnabled = TRUE (Rx filter)">PnFilterMask (Hex)<input id="multiCfg_${idx}_CanNmPnFilterMaskHex" type="text" value="${escapeHtml(ecu.cfg.CanNmPnFilterMaskHex)}" placeholder="VD: 05 00" onchange="updateMultiEcuCfg(${idx}, 'CanNmPnFilterMaskHex', this.value)"></label>
          <label title="SWS_CanNm_00500 / 00518: Vector PNC yêu cầu phát Tx (IRA) khi giữ mạng (NetReq=TRUE)">TxPnMask IRA (Hex)<input id="multiCfg_${idx}_txPnMaskHex" type="text" value="${escapeHtml(ecu.cfg.txPnMaskHex)}" placeholder="VD: 01 00" onchange="updateMultiEcuCfg(${idx}, 'txPnMaskHex', this.value)"></label>
          <div class="multi-cfg-checks">
            <label class="row" style="flex-direction:row; gap:5px; cursor:pointer" title="SWS_CanNm_00052: Bật thuật toán giảm tải đường truyền theo CanNmMsgReducedTime"><input id="multiCfg_${idx}_CanNmBusLoadReductionEnabled" type="checkbox" ${ecu.cfg.CanNmBusLoadReductionEnabled ? "checked" : ""} onchange="updateMultiEcuCfg(${idx}, 'CanNmBusLoadReductionEnabled', this.checked)"> Bus Load Red.</label>
            <label class="row" style="flex-direction:row; gap:5px; cursor:pointer" title="SWS_CanNm_00409: Kích hoạt Partial Networking (bật Bit 6 PNI=1 & lọc PNC Mask)"><input id="multiCfg_${idx}_CanNmPnEnabled" type="checkbox" ${ecu.cfg.CanNmPnEnabled ? "checked" : ""} onchange="updateMultiEcuCfg(${idx}, 'CanNmPnEnabled', this.checked)"> CanNmPnEnabled</label>
            <label class="row" style="flex-direction:row; gap:5px; cursor:pointer"><input id="multiCfg_${idx}_CanNmPassiveModeEnabled" type="checkbox" ${ecu.cfg.CanNmPassiveModeEnabled ? "checked" : ""} onchange="updateMultiEcuCfg(${idx}, 'CanNmPassiveModeEnabled', this.checked)"> Passive Mode</label>
            <label class="row" style="flex-direction:row; gap:5px; cursor:pointer"><input id="multiCfg_${idx}_CanNmImmediateRestartEnabled" type="checkbox" ${ecu.cfg.CanNmImmediateRestartEnabled ? "checked" : ""} onchange="updateMultiEcuCfg(${idx}, 'CanNmImmediateRestartEnabled', this.checked)"> Imm Restart</label>
            <label class="row" style="flex-direction:row; gap:5px; cursor:pointer"><input id="multiCfg_${idx}_CanNmNodeDetectionEnabled" type="checkbox" ${ecu.cfg.CanNmNodeDetectionEnabled ? "checked" : ""} onchange="updateMultiEcuCfg(${idx}, 'CanNmNodeDetectionEnabled', this.checked)"> Node Detection</label>
          </div>
        </div>

        <!-- Identical Expanded State Machine Block as Main Tab -->
        <div class="sm-wrap">
          <div class="sm-node" id="multiSmNet_${idx}">
            <div class="sm-mode-head">
              <span style="font-weight:800; font-size:11.5px; color:#38bdf8">3. NETWORK MODE (NM_MODE_NETWORK)</span>
              <span class="badge xs" id="multiSmNetMeta_${idx}">NetReq=0 • CBV=0x00</span>
            </div>
            <div class="sm-subgrid">
              <div class="sm-subnode" id="multiSmRms_${idx}">
                <span class="sm-subtitle">REPEAT_MESSAGE (RMS)</span>
                <span class="sm-subdesc">RepeatMsgTimer • Burst/RMR</span>
              </div>
              <div class="sm-subnode" id="multiSmNos_${idx}">
                <span class="sm-subtitle">NORMAL_OPERATION (NOS)</span>
                <span class="sm-subdesc">NetReq=1 • Phát MsgCycle</span>
              </div>
              <div class="sm-subnode" id="multiSmRss_${idx}">
                <span class="sm-subtitle">READY_SLEEP (RSS)</span>
                <span class="sm-subdesc">NetReq=0 • Đếm Timeout</span>
              </div>
            </div>
            <div class="sm-subfooter">
              <span>RMS ➔ NOS / RSS (Hết RepeatMsgTime)</span>
              <span>NOS ⇄ RSS (Release / Request)</span>
            </div>
          </div>

          <div class="sm-flow-strip">
            <div style="text-align:left"><span class="sm-flow-tag ok">⬆ Wakeup / NetReq</span></div>
            <div style="text-align:center"><span class="sm-flow-tag vio">⟲ Imm Restart</span></div>
            <div style="text-align:right"><span class="sm-flow-tag err">⬇ Timeout = 0ms</span></div>
          </div>

          <div class="sm-sleep-row">
            <div class="sm-node" id="multiSmSleep_${idx}">
              <div style="font-weight:800; font-size:11px; color:#94a3b8">1. BUS-SLEEP MODE</div>
              <div class="muted small" style="margin-top:2px; font-size:10px">Controller SLEEP, không Tx/Rx.</div>
              <div class="sm-subnode" style="margin-top:5px">Sleep Mode (BUS_SLEEP)</div>
            </div>

            <div class="sm-sleep-arrow">
              <span class="sm-flow-tag err" id="multiSmWaitArrow_${idx}">⬅ 0ms</span>
              <span class="hint" style="font-size:9px; white-space:nowrap">WaitSleep=0</span>
            </div>

            <div class="sm-node" id="multiSmPrep_${idx}">
              <div style="font-weight:800; font-size:11px; color:#f87171">2. PREPARE BUS-SLEEP</div>
              <div class="muted small" style="margin-top:2px; font-size:10px">Đếm WaitBusSleep, còn nghe bus.</div>
              <div class="sm-subnode" style="margin-top:5px">Prepare Sleep</div>
            </div>
          </div>
        </div>

        <!-- Compact Timers Grid -->
        <div class="multi-timers-grid">
          ${buildMultiTimerBoxSkeleton(idx, "repeat", "RepeatMsgTimer")}
          ${buildMultiTimerBoxSkeleton(idx, "timeout", "NM-TimeoutTimer")}
          ${buildMultiTimerBoxSkeleton(idx, "wait", "WaitBusSleepTimer")}
          ${buildMultiTimerBoxSkeleton(idx, "cycle", "MsgCycleTimer")}
        </div>

        <!-- Status Meta Strip -->
        <div class="multi-meta-bar">
          <span>Wakeup: <b style="color:var(--accent)" id="multiMetaWake_${idx}">None</b></span>
          <span id="multiMetaCbv_${idx}">AWB=<b>0</b> RMR=<b>0</b></span>
          <span class="muted" id="multiMetaAct_${idx}" style="max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">Chưa có</span>
        </div>
      </div>
    </div>
  `;
}

function updateMultiEcuCardDom(ecu, idx) {
  const stBadge = getMultiEcuStateBadge(ecu);
  const canIdHex = "0x" + (ecu.cfg.CanNmBaseCanId + ecu.cfg.CanNmNodeId).toString(16).toUpperCase();
  const cbvHex = "0x" + multiGetCbvByte(ecu).toString(16).toUpperCase().padStart(2, "0");

  const isBusSleep = ecu.mode === "NM_MODE_BUS_SLEEP";
  const isPrepSleep = ecu.mode === "NM_MODE_PREPARE_BUS_SLEEP";
  const isNet = ecu.mode === "NM_MODE_NETWORK";
  const isRms = isNet && ecu.subState === "NM_STATE_REPEAT_MESSAGE";
  const isNos = isNet && ecu.subState === "NM_STATE_NORMAL_OPERATION";
  const isRss = isNet && ecu.subState === "NM_STATE_READY_SLEEP";

  setMultiTextIfChanged(`multiEcuNodeBadge_${idx}`, `Node 0x${ecu.cfg.CanNmNodeId.toString(16).toUpperCase()} | Tx ${canIdHex}`);
  setMultiClassIfChanged(`multiFlagPn_${idx}`, `badge xs sky${ecu.cfg.CanNmPnEnabled ? "" : " hidden"}`);
  setMultiClassIfChanged(`multiFlagBlr_${idx}`, `badge xs amb${ecu.cfg.CanNmBusLoadReductionEnabled ? "" : " hidden"}`);
  setMultiClassIfChanged(`multiFlagPassive_${idx}`, `badge xs vio${ecu.cfg.CanNmPassiveModeEnabled ? "" : " hidden"}`);
  setMultiClassIfChanged(`multiFlagTxBlocked_${idx}`, `badge xs err${!ecu.commEnabled ? "" : " hidden"}`);
  setMultiClassIfChanged(`multiEcuBadge_${idx}`, `badge ${stBadge.cls}`);
  setMultiTextIfChanged(`multiEcuBadge_${idx}`, stBadge.text);
  setMultiClassIfChanged(`btnMultiCfg_${idx}`, `btn xs${ecu.cfgOpen ? " primary" : ""}`);

  setMultiClassIfChanged(`btnMultiReq_${idx}`, `btn sm green${ecu.netRequest ? " multi-btn-on" : ""}`);
  setMultiClassIfChanged(`btnMultiRel_${idx}`, `btn sm amber${!ecu.netRequest && isNet ? " multi-btn-on" : ""}`);
  setMultiClassIfChanged(`btnMultiRmr_${idx}`, `btn sm vio${ecu.cbv.rmr ? " multi-btn-on" : ""}`);
  setMultiClassIfChanged(`btnMultiComm_${idx}`, `btn sm${ecu.commEnabled ? "" : " red multi-btn-on"}`);
  setMultiTextIfChanged(`btnMultiComm_${idx}`, ecu.commEnabled ? "🔇 Dis. Comm" : "🔊 En. Comm");

  setMultiClassIfChanged(`multiCfgDrawer_${idx}`, `multi-cfg-drawer${ecu.cfgOpen ? "" : " hidden"}`);
  if (ecu.cfgOpen) {
    ["CanNmRepeatMessageTime", "CanNmTimeoutTime", "CanNmWaitBusSleepTime", "CanNmMsgCycleTime", "CanNmMsgCycleOffset", "CanNmImmediateNmTransmissions", "CanNmMsgReducedTime", "CanNmPnFilterMaskHex", "txPnMaskHex"].forEach(k => {
      const inp = document.getElementById(`multiCfg_${idx}_${k}`);
      if (inp && document.activeElement !== inp) {
        const nextVal = String(ecu.cfg[k]);
        if (inp.value !== nextVal) inp.value = nextVal;
      }
    });
    ["CanNmBusLoadReductionEnabled", "CanNmPnEnabled", "CanNmPassiveModeEnabled", "CanNmImmediateRestartEnabled", "CanNmNodeDetectionEnabled"].forEach(k => {
      const chk = document.getElementById(`multiCfg_${idx}_${k}`);
      if (chk && chk.checked !== !!ecu.cfg[k]) chk.checked = !!ecu.cfg[k];
    });
  }

  setMultiClassIfChanged(`multiSmNet_${idx}`, `sm-node${isNet ? " active pulse-glow" : ""}`);
  setMultiTextIfChanged(`multiSmNetMeta_${idx}`, `NetReq=${ecu.netRequest ? 1 : 0} • CBV=${cbvHex}`);
  setMultiClassIfChanged(`multiSmRms_${idx}`, `sm-subnode${isRms ? " active" : ""}`);
  setMultiClassIfChanged(`multiSmNos_${idx}`, `sm-subnode${isNos ? " active" : ""}`);
  setMultiClassIfChanged(`multiSmRss_${idx}`, `sm-subnode${isRss ? " active" : ""}`);
  setMultiClassIfChanged(`multiSmSleep_${idx}`, `sm-node${isBusSleep ? " active pulse-glow" : ""}`);
  setMultiClassIfChanged(`multiSmPrep_${idx}`, `sm-node${isPrepSleep ? " active pulse-glow" : ""}`);
  setMultiTextIfChanged(`multiSmWaitArrow_${idx}`, `⬅ ${isPrepSleep ? ecu.timers.waitBusSleep : 0}ms`);

  updateMultiTimerBoxDom(idx, "repeat", "RepeatMsgTimer", ecu.timers.repeatMsg, ecu.cfg.CanNmRepeatMessageTime, "#fbbf24");
  updateMultiTimerBoxDom(idx, "timeout", "NM-TimeoutTimer", ecu.timers.timeout, ecu.cfg.CanNmTimeoutTime, "#38bdf8");
  updateMultiTimerBoxDom(idx, "wait", "WaitBusSleepTimer", ecu.timers.waitBusSleep, ecu.cfg.CanNmWaitBusSleepTime, "#f87171");
  const cycleLbl = ecu.immBurstActive
    ? `Burst Tx (${ecu.burstLeft} left)`
    : (ecu.cfg.CanNmBusLoadReductionEnabled && isNos ? `MsgCycle (Red ${ecu.cfg.CanNmMsgReducedTime}ms)` : "MsgCycleTimer");
  const cycleMax = ecu.immBurstActive
    ? Math.max(100, ecu.cfg.CanNmImmediateNmCycleTime)
    : Math.max(ecu.cfg.CanNmMsgCycleTime, ecu.cfg.CanNmBusLoadReductionEnabled ? ecu.cfg.CanNmMsgReducedTime : 0);
  updateMultiTimerBoxDom(
    idx,
    "cycle",
    cycleLbl,
    ecu.timers.msgCycle,
    cycleMax,
    ecu.immBurstActive ? "#c084fc" : "#34d399"
  );

  setMultiTextIfChanged(`multiMetaWake_${idx}`, ecu.wakeupSource);
  const cbvSpan = document.getElementById(`multiMetaCbv_${idx}`);
  const cbvHtml = `AWB=<b>${ecu.cbv.awb ? 1 : 0}</b> RMR=<b>${ecu.cbv.rmr ? 1 : 0}</b>${ecu.cfg.CanNmPnEnabled ? " PNI=<b>1</b>" : ""}`;
  if (cbvSpan && cbvSpan.innerHTML !== cbvHtml) cbvSpan.innerHTML = cbvHtml;
  setMultiTextIfChanged(`multiMetaAct_${idx}`, ecu.lastActivity);
}

function updateMultiBusAutoScrollBtn() {
  const isOn = !!multiState.autoScrollBus;
  setMultiClassIfChanged("btnMultiAutoScroll", `btn xs${isOn ? " sky multi-btn-on" : ""}`);
  setMultiTextIfChanged("btnMultiAutoScroll", isOn ? "⬇ Auto Scroll: BẬT" : "⏸ Auto Scroll: TẮT");
}

function setMultiBusAutoScroll(enabled, scrollNow) {
  multiState.autoScrollBus = !!enabled;
  updateMultiBusAutoScrollBtn();
  if (multiState.autoScrollBus && scrollNow) {
    const slot = document.getElementById("multiBusFrameSlot");
    if (slot) {
      slot._progScroll = true;
      slot.scrollTop = slot.scrollHeight;
      requestAnimationFrame(() => { slot._progScroll = false; });
    }
  }
}

function toggleMultiBusAutoScroll() {
  setMultiBusAutoScroll(!multiState.autoScrollBus, true);
}

function handleMultiBusFeedWheel(ev, slot) {
  if (!multiState.autoScrollBus || !slot) return;
  if (ev && ev.deltaY < 0 && slot.scrollHeight > slot.clientHeight + 2) {
    setMultiBusAutoScroll(false, false);
  }
}

function handleMultiBusFeedScroll(slot) {
  if (!multiState.autoScrollBus || !slot) return;
  const distFromBottom = slot.scrollHeight - slot.scrollTop - slot.clientHeight;
  if (slot._progScroll && distFromBottom <= 4) return;
  if (distFromBottom > 4) {
    setMultiBusAutoScroll(false, false);
  }
}

function buildMultiBusBridgeSkeleton() {
  const autoCls = multiState.autoScrollBus ? " sky multi-btn-on" : "";
  const autoLbl = multiState.autoScrollBus ? "⬇ Auto Scroll: BẬT" : "⏸ Auto Scroll: TẮT";
  return `
    <div class="multi-bus-col">
      <div class="multi-bus-bridge">
        <div class="row wrap" style="justify-content:space-between; gap:5px">
          <span class="panel-t" style="font-size:11px">🚌 VIRTUAL CAN BUS</span>
          <div class="row wrap" style="gap:4px">
            <span class="badge xs" id="multiBusStatus">IDLE</span>
            <button class="btn xs${autoCls}" id="btnMultiAutoScroll" onclick="toggleMultiBusAutoScroll()" title="Bật/Tắt tự động cuộn xuống bản tin mới nhất (tự tắt nếu bạn cuộn)">${autoLbl}</button>
            <button class="btn xs" id="btnClearMultiBus" onclick="clearMultiBusFrames()" title="Xóa lịch sử bản tin hiển thị trên Virtual CAN Bus" disabled>Xóa Bus</button>
          </div>
        </div>

        <div class="multi-bus-wire" id="multiBusWire">
          <div class="multi-wire-top">
            <span class="multi-dir-pill" id="multiBusDir">Bus Đang Rỗi (IDLE)</span>
            <span class="multi-bus-meta" id="multiBusOrderMeta">0 bản tin • Cũ ➔ Mới</span>
          </div>
          <div id="multiBusFrameSlot" class="multi-bus-feed" onscroll="handleMultiBusFeedScroll(this)" onwheel="handleMultiBusFeedWheel(event, this)">
            <div class="muted small multi-bus-empty">Chưa có bản tin NM nào trên bus.<br>Hãy bấm <b>Nw Request</b> trên một ECU!</div>
          </div>
        </div>

        <div class="multi-stats-bar">
          <div class="multi-stat-row">
            <span class="muted">ECU đang Network Mode:</span>
            <span class="mono" id="multiBusNetCount" style="font-weight:800; color:#38bdf8">0 / 2</span>
          </div>
          <div class="multi-stat-row">
            <span class="muted">ECU đang giữ mạng (NetReq):</span>
            <span class="mono" id="multiBusReqCount" style="font-weight:800; color:#34d399">0 / 2</span>
          </div>
          <div class="multi-stat-row">
            <span class="muted">Điều kiện ngủ chung:</span>
            <span class="mono" id="multiBusSleepCond" style="font-weight:700; color:#34d399">Sẵn sàng đồng thuận</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

function formatMultiBusFrameHtml(fr, isLatest, ecuCount) {
  const cbvHex = "0x" + fr.cbvByte.toString(16).toUpperCase().padStart(2, "0");
  const routeTxt = ecuCount === 2
    ? (fr.srcId === "ECU1" ? "ECU #1 ➔ ECU #2" : "ECU #2 ➔ ECU #1")
    : `${fr.srcName} ➔ Bus`;
  const roleCls = fr.roleClass ? ` ${fr.roleClass}` : "";
  return `
    <div class="multi-frame-box${roleCls}${isLatest ? " is-latest" : ""}">
      <div class="mf-top">
        <span class="mf-seq">#${fr.seq}</span>
        <span class="mf-route">${escapeHtml(routeTxt)}</span>
        <span class="mf-time">t=${fr.timeMs}ms</span>
      </div>
      <div class="mf-mid">
        <span class="mf-id">ID ${escapeHtml(fr.canIdHex)}</span>
        <span class="mf-data">[${fr.hexArr.join(" ")}]</span>
      </div>
      <div class="mf-foot">
        <span class="mf-reason">${escapeHtml(fr.reason)}</span>
        <span class="row" style="gap:5px">
          <span class="mf-cbv">CBV=${cbvHex} (AWB=${fr.awb ? 1 : 0}, RMR=${fr.rmr ? 1 : 0}${fr.pni ? ", PNI=1" : ""})</span>
          ${isLatest ? '<span class="mf-new">MỚI NHẤT</span>' : ""}
        </span>
      </div>
    </div>
  `;
}

function updateMultiBusBridgeDom() {
  const frames = multiState.busFrames || [];
  const f = frames.length ? frames[frames.length - 1] : multiState.lastFrame;
  const activeEcus = multiState.ecus.slice(0, multiState.ecuCount);
  const netCount = activeEcus.filter(e => e.mode === "NM_MODE_NETWORK").length;
  const reqCount = activeEcus.filter(e => e.netRequest).length;

  let dirLabel = "Bus Đang Rỗi (IDLE)";
  if (f) {
    if (multiState.ecuCount === 2) {
      dirLabel = f.srcId === "ECU1" ? "ECU #1 ➔ CAN Bus ➔ ECU #2" : "ECU #2 ➔ CAN Bus ➔ ECU #1";
    } else {
      dirLabel = `${f.srcName} ➔ Broadcast CAN Bus`;
    }
  }

  setMultiClassIfChanged("multiBusStatus", `badge xs${f ? " sky" : ""}`);
  setMultiTextIfChanged("multiBusStatus", f ? "ACTIVE" : "IDLE");
  setMultiClassIfChanged("multiBusWire", `multi-bus-wire${f ? " active-tx" : ""}`);
  setMultiTextIfChanged("multiBusDir", dirLabel);
  setMultiTextIfChanged("multiBusOrderMeta", `${frames.length} bản tin • Cũ ➔ Mới`);

  updateMultiBusAutoScrollBtn();

  const clearBtn = document.getElementById("btnClearMultiBus");
  if (clearBtn) {
    const shouldDisable = frames.length === 0;
    if (clearBtn.disabled !== shouldDisable) clearBtn.disabled = shouldDisable;
  }

  const slot = document.getElementById("multiBusFrameSlot");
  if (slot) {
    const firstSeq = frames.length ? frames[0].seq : 0;
    const lastSeq = frames.length ? frames[frames.length - 1].seq : 0;
    const fKey = frames.length
      ? `${multiState.ecuCount}|${frames.length}|${firstSeq}|${lastSeq}`
      : `idle|${multiState.ecuCount}`;
    if (slot.dataset.frameKey !== fKey) {
      const prevScrollTop = slot.scrollTop;
      const prevFirstSeq = parseInt(slot.dataset.firstSeq || "0", 10);
      const prevLen = parseInt(slot.dataset.frameCount || "0", 10);
      slot.dataset.frameKey = fKey;
      slot.dataset.firstSeq = String(firstSeq);
      slot.dataset.frameCount = String(frames.length);
      if (frames.length) {
        slot._progScroll = true;
        slot.innerHTML = frames
          .map((fr, i) => formatMultiBusFrameHtml(fr, i === frames.length - 1, multiState.ecuCount))
          .join("");
        if (multiState.autoScrollBus) {
          slot.scrollTop = slot.scrollHeight;
        } else {
          let nextTop = prevScrollTop;
          if (prevLen === 80 && frames.length === 80 && prevFirstSeq > 0 && firstSeq > prevFirstSeq) {
            const firstBox = slot.querySelector(".multi-frame-box");
            const stepPx = firstBox ? (firstBox.getBoundingClientRect().height + 5) : 35;
            nextTop = Math.max(0, prevScrollTop - (firstSeq - prevFirstSeq) * stepPx);
          }
          slot.scrollTop = nextTop;
        }
        requestAnimationFrame(() => { slot._progScroll = false; });
      } else {
        slot.innerHTML = `<div class="muted small multi-bus-empty">Chưa có bản tin NM nào trên bus.<br>Hãy bấm <b>Nw Request</b> trên một ECU!</div>`;
      }
    }
  }

  setMultiTextIfChanged("multiBusNetCount", `${netCount} / ${multiState.ecuCount}`);
  setMultiTextIfChanged("multiBusReqCount", `${reqCount} / ${multiState.ecuCount}`);
  const sleepCond = document.getElementById("multiBusSleepCond");
  if (sleepCond) {
    const nextTxt = reqCount === 0 ? "Sẵn sàng đồng thuận" : "Chưa (Có ECU giữ)";
    const nextCol = reqCount === 0 ? "#34d399" : "#fbbf24";
    if (sleepCond.textContent !== nextTxt) sleepCond.textContent = nextTxt;
    if (sleepCond.style.color !== nextCol) sleepCond.style.color = nextCol;
  }
}

function renderMultiTraceLogs() {
  const container = document.getElementById("multiTraceContainer");
  if (!container) return;

  const filterEl = document.getElementById("multiTraceFilter");
  const filterVal = filterEl ? filterEl.value : "ALL";
  const allLogs = multiState.traceLogs || [];
  const filtered = allLogs.filter(l => {
    if (filterVal === "ALL") return true;
    if (filterVal === "ECU1" || filterVal === "ECU2" || filterVal === "ECU3") return l.srcTag === filterVal;
    return l.type === filterVal;
  });

  const badge = document.getElementById("multiTraceCountBadge");
  if (badge) {
    const badgeTxt = filterVal === "ALL"
      ? `${allLogs.length} sự kiện`
      : `${filtered.length}/${allLogs.length} sự kiện`;
    if (badge.innerText !== badgeTxt) badge.innerText = badgeTxt;
  }

  const head = allLogs[0];
  const renderKey = `${allLogs.length}|${head ? `${head.time}|${head.srcTag}|${head.title}` : "empty"}|${filterVal}`;
  if (container.dataset.renderKey === renderKey) return;
  container.dataset.renderKey = renderKey;

  if (filtered.length === 0) {
    container.innerHTML = `<p class="muted small" style="padding:12px 6px; text-align:center">Chưa có sự kiện nào trên bus đa ECU. Hãy nhấn nút điều khiển trên ECU #1 / ECU #2 hoặc chọn Kịch bản nhanh ở trên.</p>`;
    return;
  }

  const styleMap = {
    BUS: { badge: "indigo", item: "bus", label: "CAN BUS" },
    STATE: { badge: "amb", item: "state", label: "STATE" },
    WARN: { badge: "err", item: "alert", label: "WARN" },
    API: { badge: "", item: "", label: "API" }
  };

  container.innerHTML = filtered.map(l => {
    const st = styleMap[l.type] || { badge: "", item: "", label: l.type };
    return `
      <div class="trace-item ${st.item}">
        <div class="trace-top">
          <div class="trace-meta">
            <span class="badge xs ${st.badge}">${escapeHtml(st.label)}</span>
            <span class="trace-route">${escapeHtml(l.route)}</span>
          </div>
          <span class="trace-time">${escapeHtml(l.time)}</span>
        </div>
        <div class="trace-api">${escapeHtml(l.title)}</div>
        <div class="trace-desc">${escapeHtml(l.desc)}</div>
      </div>
    `;
  }).join("");
}

function clearMultiTraceLogs() {
  multiState.traceLogs = [];
  renderMultiTraceLogs();
}

function syncMultiStickyTop() {
  const hdr = document.querySelector(".hdr");
  const panel = document.getElementById("multiControlPanel");
  if (!hdr || !panel) return;
  const h = Math.ceil(hdr.getBoundingClientRect().height);
  if (h > 0) {
    const nextTop = `${h + 6}px`;
    if (panel.style.getPropertyValue("--multi-sticky-top") !== nextTop) {
      panel.style.setProperty("--multi-sticky-top", nextTop);
    }
  }
}

function renderMultiEcuView() {
  syncMultiStickyTop();
  const clk = document.getElementById("lblMultiClock");
  if (clk) {
    const nextClk = `t = ${multiState.clockMs} ms`;
    if (clk.innerText !== nextClk) clk.innerText = nextClk;
  }

  const arena = document.getElementById("multiArena");
  if (!arena) return;

  const modeKey = String(multiState.ecuCount);
  if (arena.dataset.renderedMode !== modeKey) {
    arena.dataset.renderedMode = modeKey;
    if (multiState.ecuCount === 2) {
      arena.className = "multi-arena mode-2";
      arena.innerHTML =
        buildMultiEcuCardSkeleton(multiState.ecus[0], 0) +
        buildMultiBusBridgeSkeleton() +
        buildMultiEcuCardSkeleton(multiState.ecus[1], 1);
    } else {
      arena.className = "multi-arena mode-3";
      arena.innerHTML =
        buildMultiBusBridgeSkeleton() +
        buildMultiEcuCardSkeleton(multiState.ecus[0], 0) +
        buildMultiEcuCardSkeleton(multiState.ecus[1], 1) +
        buildMultiEcuCardSkeleton(multiState.ecus[2], 2);
    }
  }

  for (let i = 0; i < multiState.ecuCount; i++) {
    updateMultiEcuCardDom(multiState.ecus[i], i);
  }
  updateMultiBusBridgeDom();
  renderMultiTraceLogs();
}

window.addEventListener("DOMContentLoaded", () => {
  renderMultiEcuView();
});

window.addEventListener("resize", () => {
  const mv = document.getElementById("viewMulti");
  if (mv && !mv.classList.contains("hidden")) syncMultiStickyTop();
});
