/*************************************************************************
 * PART 7: MULTI-ECU CAN NM BUS COMMUNICATION SIMULATOR
 * Decentralized Direct NM between 2+ ECUs on Virtual CAN Bus (R22-11)
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
    cbv: { rmr: false, csr: false, awb: false, pni: false },
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
      CanNmImmediateNmTransmissions: 3,
      CanNmImmediateNmCycleTime: 100,
      CanNmPassiveModeEnabled: false,
      CanNmImmediateRestartEnabled: true,
      CanNmNodeDetectionEnabled: true,
      CanNmActiveWakeupBitEnabled: true
    }
  };
}

let multiState = {
  ecuCount: 2,
  autoWakeupOnRx: true,
  clockMs: 0,
  autoClockTimer: null,
  lastFrame: null,
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
  if (ecu.cbv.csr) val |= (1 << 3);
  if (ecu.cbv.awb) val |= (1 << 4);
  if (ecu.cbv.pni) val |= (1 << 6);
  return val & 0xFF;
}

function multiFormatPduBytes(ecu) {
  const userBytes = ecu.userDataHex.split(/[\s,]+/).slice(0, 6).map(h => {
    const n = parseInt(h, 16);
    return isNaN(n) ? 0 : (n & 0xFF);
  });
  while (userBytes.length < 6) userBytes.push(0);
  return [ecu.cfg.CanNmNodeId & 0xFF, multiGetCbvByte(ecu), ...userBytes];
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
  rxEcu.lastActivity = `Rx ${frame.canIdHex} từ ${frame.srcName} (CBV=${cbvHex})`;

  if (rxEcu.mode === "NM_MODE_BUS_SLEEP") {
    addMultiTraceLog(
      "API",
      rxEcu.id,
      `${rxEcu.name} ⬅ CAN Bus`,
      `Nm_NetworkStartIndication() (Nhận ${frame.canIdHex})`,
      multiState.autoWakeupOnRx
        ? `[SWS_CanNm_00127] ${rxEcu.name} ở BUS-SLEEP nhận gói NM từ ${frame.srcName} ➔ ComM tự động gọi PassiveStartUp().`
        : `[SWS_CanNm_00336] ${rxEcu.name} ở BUS-SLEEP nhận gói NM bất ngờ (Auto PassiveStartUp đang TẮT).`
    );
    if (multiState.autoWakeupOnRx) {
      rxEcu.wakeupSource = `Rx từ ${frame.srcName}`;
      rxEcu.mode = "NM_MODE_NETWORK";
      rxEcu.subState = "NM_STATE_REPEAT_MESSAGE";
      rxEcu.cbv.awb = false;
      rxEcu.cbv.rmr = false;
      rxEcu.netRequest = false;
      rxEcu.timers.waitBusSleep = 0;
      rxEcu.timers.repeatMsg = rxEcu.cfg.CanNmRepeatMessageTime;
      rxEcu.timers.timeout = rxEcu.cfg.CanNmTimeoutTime;
      rxEcu.timers.msgCycle = rxEcu.cfg.CanNmMsgCycleOffset;
      addMultiTraceLog(
        "STATE",
        rxEcu.id,
        `${rxEcu.name} State Machine`,
        `BUS_SLEEP ➔ NETWORK: REPEAT_MESSAGE (AWB=0)`,
        `Đánh thức thụ động do ${frame.srcName}; Tx đầu tiên sau offset ${rxEcu.cfg.CanNmMsgCycleOffset}ms.`
      );
    }
    return;
  }

  if (rxEcu.mode === "NM_MODE_PREPARE_BUS_SLEEP") {
    rxEcu.wakeupSource = `Rx từ ${frame.srcName}`;
    rxEcu.mode = "NM_MODE_NETWORK";
    rxEcu.subState = "NM_STATE_REPEAT_MESSAGE";
    rxEcu.cbv.awb = false;
    rxEcu.timers.waitBusSleep = 0;
    rxEcu.timers.repeatMsg = rxEcu.cfg.CanNmRepeatMessageTime;
    rxEcu.timers.timeout = rxEcu.cfg.CanNmTimeoutTime;
    rxEcu.timers.msgCycle = rxEcu.cfg.CanNmMsgCycleOffset;
    addMultiTraceLog(
      "STATE",
      rxEcu.id,
      `${rxEcu.name} State Machine`,
      `PREPARE_BUS_SLEEP ➔ REPEAT_MESSAGE (AWB=0)`,
      `[SWS_CanNm_00124] ${rxEcu.name} nhận NM PDU từ ${frame.srcName} khi đang chuẩn bị ngủ ➔ quay lại Network Mode.`
    );
    return;
  }

  if (rxEcu.mode === "NM_MODE_NETWORK") {
    if (rxEcu.commEnabled) {
      rxEcu.timers.timeout = rxEcu.cfg.CanNmTimeoutTime;
    }

    if (
      frame.rmr &&
      rxEcu.cfg.CanNmNodeDetectionEnabled &&
      (rxEcu.subState === "NM_STATE_NORMAL_OPERATION" || rxEcu.subState === "NM_STATE_READY_SLEEP")
    ) {
      const prevSub = rxEcu.subState.replace("NM_STATE_", "");
      rxEcu.subState = "NM_STATE_REPEAT_MESSAGE";
      rxEcu.timers.repeatMsg = rxEcu.cfg.CanNmRepeatMessageTime;
      rxEcu.timers.msgCycle = rxEcu.cfg.CanNmMsgCycleOffset;
      addMultiTraceLog(
        "STATE",
        rxEcu.id,
        `${rxEcu.name} State Machine`,
        `${prevSub} ➔ REPEAT_MESSAGE (Nhận RMR=1 từ ${frame.srcName})`,
        `[SWS_CanNm_00119] ${rxEcu.name} hưởng ứng yêu cầu điểm danh, báo Nm_RepeatMessageIndication() và nạp RepeatMsgTimer=${rxEcu.cfg.CanNmRepeatMessageTime}ms.`
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

  const frame = {
    srcId: ecu.id,
    srcName: ecu.name,
    srcNodeId: ecu.cfg.CanNmNodeId,
    canIdHex,
    hexArr,
    cbvByte,
    awb: ecu.cbv.awb,
    rmr: ecu.cbv.rmr,
    pni: ecu.cbv.pni,
    timeMs: multiState.clockMs,
    reason: reasonLabel
  };
  multiState.lastFrame = frame;

  addMultiTraceLog(
    "BUS",
    ecu.id,
    `${ecu.name} ➔ CAN Bus`,
    `CanIf_Transmit(ID=${canIdHex}, Data=[${hexArr.join(" ")}])`,
    `${reasonLabel} | AWB=${ecu.cbv.awb ? 1 : 0}, RMR=${ecu.cbv.rmr ? 1 : 0} | Reset Timeout(${ecu.name})=${ecu.cfg.CanNmTimeoutTime}ms`
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

      if (ecu.cfg.CanNmImmediateNmTransmissions > 0 && ecu.commEnabled) {
        ecu.immBurstActive = true;
        ecu.burstLeft = ecu.cfg.CanNmImmediateNmTransmissions - 1;
        ecu.timers.msgCycle = ecu.cfg.CanNmImmediateNmCycleTime;
        transmitMultiEcuFrame(ecu, `Burst Tx #1/${ecu.cfg.CanNmImmediateNmTransmissions}`);
      } else {
        ecu.immBurstActive = false;
        ecu.burstLeft = 0;
        ecu.timers.msgCycle = ecu.cfg.CanNmMsgCycleOffset;
      }
    } else if (ecu.mode === "NM_MODE_PREPARE_BUS_SLEEP") {
      ecu.mode = "NM_MODE_NETWORK";
      ecu.subState = "NM_STATE_REPEAT_MESSAGE";
      ecu.cbv.awb = !!ecu.cfg.CanNmActiveWakeupBitEnabled;
      ecu.timers.waitBusSleep = 0;
      ecu.timers.repeatMsg = ecu.cfg.CanNmRepeatMessageTime;
      ecu.timers.timeout = ecu.cfg.CanNmTimeoutTime;

      addMultiTraceLog("STATE", ecu.id, `${ecu.name} State Machine`, "PREPARE_BUS_SLEEP ➔ REPEAT_MESSAGE", `[SWS_CanNm_00123] ${ecu.name} đánh thức lại trước khi ngủ!`);

      if (ecu.cfg.CanNmImmediateRestartEnabled && ecu.commEnabled) {
        ecu.timers.msgCycle = ecu.cfg.CanNmMsgCycleTime;
        transmitMultiEcuFrame(ecu, "Immediate Restart Tx");
      } else {
        ecu.timers.msgCycle = ecu.cfg.CanNmMsgCycleTime;
      }
    } else if (ecu.mode === "NM_MODE_NETWORK") {
      if (ecu.subState === "NM_STATE_READY_SLEEP") {
        ecu.subState = "NM_STATE_NORMAL_OPERATION";
        ecu.timers.msgCycle = ecu.cfg.CanNmMsgCycleTime;
        addMultiTraceLog("STATE", ecu.id, `${ecu.name} State Machine`, "READY_SLEEP ➔ NORMAL_OPERATION", `[SWS_CanNm_00110] ${ecu.name} mở lại phát định kỳ MsgCycleTime=${ecu.cfg.CanNmMsgCycleTime}ms.`);
      }
    }
  } else if (actionType === "netRel") {
    ecu.netRequest = false;
    addMultiTraceLog("API", ecu.id, `SWC ➔ ${ecu.name}`, "CanNm_NetworkRelease()", `[SWS_CanNm_00105] ${ecu.name} báo hết nhu cầu dùng mạng.`);
    if (ecu.mode === "NM_MODE_NETWORK" && ecu.subState === "NM_STATE_NORMAL_OPERATION") {
      ecu.subState = "NM_STATE_READY_SLEEP";
      ecu.immBurstActive = false;
      ecu.burstLeft = 0;
      addMultiTraceLog("STATE", ecu.id, `${ecu.name} State Machine`, "NORMAL_OPERATION ➔ READY_SLEEP", `[SWS_CanNm_00118] ${ecu.name} ngưng phát Tx định kỳ, chỉ nghe bus chờ NM-Timeout.`);
    }
  } else if (actionType === "passive") {
    ecu.wakeupSource = "Passive StartUp";
    addMultiTraceLog("API", ecu.id, `EcuM/ComM ➔ ${ecu.name}`, "CanNm_PassiveStartUp()", `[SWS_CanNm_00128] Đánh thức thụ động ${ecu.name}.`);
    if (ecu.mode === "NM_MODE_BUS_SLEEP" || ecu.mode === "NM_MODE_PREPARE_BUS_SLEEP") {
      const fromLbl = ecu.mode.replace("NM_MODE_", "");
      ecu.mode = "NM_MODE_NETWORK";
      ecu.subState = "NM_STATE_REPEAT_MESSAGE";
      ecu.cbv.awb = false;
      ecu.netRequest = false;
      ecu.timers.waitBusSleep = 0;
      ecu.timers.repeatMsg = ecu.cfg.CanNmRepeatMessageTime;
      ecu.timers.timeout = ecu.cfg.CanNmTimeoutTime;
      ecu.timers.msgCycle = ecu.cfg.CanNmMsgCycleOffset;
      addMultiTraceLog("STATE", ecu.id, `${ecu.name} State Machine`, `${fromLbl} ➔ REPEAT_MESSAGE (AWB=0)`, `[SWS_CanNm_00128] ${ecu.name} thức thụ động, chờ offset ${ecu.cfg.CanNmMsgCycleOffset}ms rồi phát.`);
    } else {
      addMultiTraceLog("API", ecu.id, ecu.name, "PassiveStartUp bỏ qua (Đã ở NETWORK_MODE)", `${ecu.name} đang hoạt động.`);
    }
  } else if (actionType === "rmr") {
    if (!ecu.cfg.CanNmNodeDetectionEnabled || ecu.cfg.CanNmPassiveModeEnabled) {
      addMultiTraceLog("WARN", ecu.id, ecu.name, "CanNm_RepeatMessageRequest() -> E_NOT_OK", `${ecu.name} chưa bật NodeDetection hoặc đang PassiveMode.`);
      renderMultiEcuView();
      return;
    }
    if (ecu.mode !== "NM_MODE_NETWORK") {
      addMultiTraceLog("WARN", ecu.id, ecu.name, "CanNm_RepeatMessageRequest() -> E_NOT_OK", `[SWS_CanNm_00137] ${ecu.name} phải đang ở NETWORK_MODE mới gọi được RepeatMessageRequest().`);
      renderMultiEcuView();
      return;
    }
    ecu.cbv.rmr = true;
    ecu.subState = "NM_STATE_REPEAT_MESSAGE";
    ecu.timers.repeatMsg = ecu.cfg.CanNmRepeatMessageTime;
    ecu.timers.timeout = ecu.cfg.CanNmTimeoutTime;
    addMultiTraceLog("STATE", ecu.id, `${ecu.name} State Machine`, "➔ REPEAT_MESSAGE (Bật RMR=1)", `[SWS_CanNm_00121] ${ecu.name} phát khung có RMR=1 ép toàn mạng điểm danh!`);
    transmitMultiEcuFrame(ecu, "Repeat Message Request (RMR=1)");
  } else if (actionType === "toggleComm") {
    ecu.commEnabled = !ecu.commEnabled;
    if (!ecu.commEnabled) {
      addMultiTraceLog("API", ecu.id, `Dcm ➔ ${ecu.name}`, "CanNm_DisableCommunication()", `[SWS_CanNm_00170] Khóa Tx & đóng băng NM-TimeoutTimer trên ${ecu.name}.`);
    } else {
      ecu.timers.msgCycle = ecu.cfg.CanNmMsgCycleOffset;
      addMultiTraceLog("API", ecu.id, `Dcm ➔ ${ecu.name}`, "CanNm_EnableCommunication()", `[SWS_CanNm_00176] Mở lại truyền thông trên ${ecu.name}.`);
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
      if (ecu.timers.timeout === 0 && ecu.subState === "NM_STATE_READY_SLEEP") {
        ecu.mode = "NM_MODE_PREPARE_BUS_SLEEP";
        ecu.cbv.awb = false;
        ecu.timers.waitBusSleep = ecu.cfg.CanNmWaitBusSleepTime;
        addMultiTraceLog("STATE", ecu.id, `${ecu.name} State Machine`, "READY_SLEEP ➔ PREPARE_BUS_SLEEP", `[SWS_CanNm_00115] Hết NM-Timeout (0ms) ➔ Xóa AWB=0, bắt đầu đếm WaitBusSleepTimer=${ecu.cfg.CanNmWaitBusSleepTime}ms.`);
      }
    }

    // 2. RepeatMessageTimer in REPEAT_MESSAGE
    if (ecu.mode === "NM_MODE_NETWORK" && ecu.subState === "NM_STATE_REPEAT_MESSAGE" && ecu.timers.repeatMsg > 0) {
      ecu.timers.repeatMsg = Math.max(0, ecu.timers.repeatMsg - deltaMs);
      if (ecu.timers.repeatMsg === 0) {
        ecu.cbv.rmr = false;
        if (ecu.netRequest) {
          ecu.subState = "NM_STATE_NORMAL_OPERATION";
          ecu.timers.msgCycle = ecu.cfg.CanNmMsgCycleTime;
          addMultiTraceLog("STATE", ecu.id, `${ecu.name} State Machine`, "REPEAT_MESSAGE ➔ NORMAL_OPERATION", `[SWS_CanNm_00103] Hết RepeatMessageTime & NetReq=1 ➔ Normal Operation.`);
        } else {
          ecu.subState = "NM_STATE_READY_SLEEP";
          addMultiTraceLog("STATE", ecu.id, `${ecu.name} State Machine`, "REPEAT_MESSAGE ➔ READY_SLEEP", `[SWS_CanNm_00106] Hết RepeatMessageTime & NetReq=0 ➔ Ready Sleep (ngưng Tx).`);
        }
      }
    }

    // 3. WaitBusSleepTimer in PREPARE_BUS_SLEEP
    if (ecu.mode === "NM_MODE_PREPARE_BUS_SLEEP" && ecu.timers.waitBusSleep > 0) {
      ecu.timers.waitBusSleep = Math.max(0, ecu.timers.waitBusSleep - deltaMs);
      if (ecu.timers.waitBusSleep === 0) {
        ecu.mode = "NM_MODE_BUS_SLEEP";
        ecu.wakeupSource = "None";
        addMultiTraceLog("STATE", ecu.id, `${ecu.name} State Machine`, "PREPARE_BUS_SLEEP ➔ BUS_SLEEP", `[SWS_CanNm_00117] Hết WaitBusSleepTime (0ms) ➔ Tắt Controller & Transceiver.`);
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

  // Execute queued CAN Bus Transmissions and broadcast to peers
  txDue.forEach(ecu => {
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
  } else {
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed)) ecu.cfg[key] = Math.max(key === "CanNmImmediateNmTransmissions" || key === "CanNmMsgCycleOffset" ? 0 : 100, parsed);
  }
  renderMultiEcuView();
}

function resetMultiEcuSim(keepLogs) {
  stopMultiClock();
  multiState.clockMs = 0;
  multiState.lastFrame = null;
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
  }
}

function getMultiEcuStateBadge(ecu) {
  if (ecu.mode === "NM_MODE_BUS_SLEEP") return { text: "BUS-SLEEP MODE", cls: "ok" };
  if (ecu.mode === "NM_MODE_PREPARE_BUS_SLEEP") return { text: "PREPARE BUS-SLEEP", cls: "err" };
  return { text: `NETWORK: ${ecu.subState.replace("NM_STATE_", "")}`, cls: "sky" };
}

function renderMultiTimerBox(label, curVal, maxVal, color) {
  const safeMax = Math.max(1, maxVal);
  const pct = Math.min(100, Math.round((curVal / safeMax) * 100));
  return `
    <div class="timer-card compact" style="margin-bottom:0">
      <div class="timer-h">
        <span class="mono">${escapeHtml(label)}</span>
        <span class="mono" style="font-weight:700; color:${color}">${curVal} / ${maxVal} ms</span>
      </div>
      <div class="timer-track"><div class="timer-bar" style="width:${pct}%; background:${color}"></div></div>
    </div>
  `;
}

function renderMultiEcuCard(ecu, idx) {
  const stBadge = getMultiEcuStateBadge(ecu);
  const canIdHex = "0x" + (ecu.cfg.CanNmBaseCanId + ecu.cfg.CanNmNodeId).toString(16).toUpperCase();
  const cbvHex = "0x" + multiGetCbvByte(ecu).toString(16).toUpperCase().padStart(2, "0");

  const isBusSleep = ecu.mode === "NM_MODE_BUS_SLEEP";
  const isPrepSleep = ecu.mode === "NM_MODE_PREPARE_BUS_SLEEP";
  const isNet = ecu.mode === "NM_MODE_NETWORK";
  const isRms = isNet && ecu.subState === "NM_STATE_REPEAT_MESSAGE";
  const isNos = isNet && ecu.subState === "NM_STATE_NORMAL_OPERATION";
  const isRss = isNet && ecu.subState === "NM_STATE_READY_SLEEP";

  const cfgDrawer = ecu.cfgOpen ? `
    <div class="multi-cfg-drawer">
      <label>RepeatMsgTime (ms)<input type="number" min="200" step="100" value="${ecu.cfg.CanNmRepeatMessageTime}" onchange="updateMultiEcuCfg(${idx}, 'CanNmRepeatMessageTime', this.value)"></label>
      <label>TimeoutTime (ms)<input type="number" min="200" step="100" value="${ecu.cfg.CanNmTimeoutTime}" onchange="updateMultiEcuCfg(${idx}, 'CanNmTimeoutTime', this.value)"></label>
      <label>WaitBusSleep (ms)<input type="number" min="200" step="100" value="${ecu.cfg.CanNmWaitBusSleepTime}" onchange="updateMultiEcuCfg(${idx}, 'CanNmWaitBusSleepTime', this.value)"></label>
      <label>MsgCycleTime (ms)<input type="number" min="200" step="100" value="${ecu.cfg.CanNmMsgCycleTime}" onchange="updateMultiEcuCfg(${idx}, 'CanNmMsgCycleTime', this.value)"></label>
      <label>CycleOffset (ms)<input type="number" min="0" step="50" value="${ecu.cfg.CanNmMsgCycleOffset}" onchange="updateMultiEcuCfg(${idx}, 'CanNmMsgCycleOffset', this.value)"></label>
      <label>Burst Frames<input type="number" min="0" max="10" step="1" value="${ecu.cfg.CanNmImmediateNmTransmissions}" onchange="updateMultiEcuCfg(${idx}, 'CanNmImmediateNmTransmissions', this.value)"></label>
      <label class="row" style="flex-direction:row; gap:5px; cursor:pointer"><input type="checkbox" ${ecu.cfg.CanNmPassiveModeEnabled ? "checked" : ""} onchange="updateMultiEcuCfg(${idx}, 'CanNmPassiveModeEnabled', this.checked)"> Passive Mode</label>
      <label class="row" style="flex-direction:row; gap:5px; cursor:pointer"><input type="checkbox" ${ecu.cfg.CanNmImmediateRestartEnabled ? "checked" : ""} onchange="updateMultiEcuCfg(${idx}, 'CanNmImmediateRestartEnabled', this.checked)"> Imm Restart</label>
      <label class="row" style="flex-direction:row; gap:5px; cursor:pointer"><input type="checkbox" ${ecu.cfg.CanNmNodeDetectionEnabled ? "checked" : ""} onchange="updateMultiEcuCfg(${idx}, 'CanNmNodeDetectionEnabled', this.checked)"> Node Detection</label>
    </div>
  ` : "";

  return `
    <div class="panel multi-ecu-panel ${ecu.roleClass}" id="multiEcuCard_${idx}">
      <div class="panel-h">
        <div class="row wrap" style="gap:6px">
          <span class="panel-t" style="font-size:12px">${escapeHtml(ecu.name)} • ${escapeHtml(ecu.shortRole)}</span>
          <span class="badge xs">Node 0x${ecu.cfg.CanNmNodeId.toString(16).toUpperCase()} | Tx ${canIdHex}</span>
          ${ecu.cfg.CanNmPassiveModeEnabled ? `<span class="badge xs vio">PASSIVE</span>` : ""}
          ${!ecu.commEnabled ? `<span class="badge xs err">TX BLOCKED</span>` : ""}
        </div>
        <div class="row" style="gap:5px">
          <span class="badge ${stBadge.cls}" id="multiEcuBadge_${idx}">${stBadge.text}</span>
          <button class="btn xs ${ecu.cfgOpen ? "primary" : ""}" onclick="toggleMultiEcuCfg(${idx})" title="Chỉnh thông số timer / ECUC cho ${escapeHtml(ecu.name)}">⚙</button>
          <button class="btn xs" onclick="multiEcuAction(${idx}, 'reset')" title="Reset riêng ${escapeHtml(ecu.name)} về BUS-SLEEP">↺</button>
        </div>
      </div>

      <div class="panel-b">
        <!-- Event Controls for this ECU -->
        <div class="multi-ctrl-grid">
          <button class="btn sm green ${ecu.netRequest ? "multi-btn-on" : ""}" id="btnMultiReq_${idx}" onclick="multiEcuAction(${idx}, 'netReq')" title="CanNm_NetworkRequest()">🟢 Nw Request</button>
          <button class="btn sm amber ${!ecu.netRequest ? "" : "multi-btn-on"}" id="btnMultiRel_${idx}" onclick="multiEcuAction(${idx}, 'netRel')" title="CanNm_NetworkRelease()">🟡 Release</button>
          <button class="btn sm sky" id="btnMultiPas_${idx}" onclick="multiEcuAction(${idx}, 'passive')" title="CanNm_PassiveStartUp()">🔵 PassiveStart</button>
          <button class="btn sm vio ${ecu.cbv.rmr ? "multi-btn-on" : ""}" id="btnMultiRmr_${idx}" onclick="multiEcuAction(${idx}, 'rmr')" title="CanNm_RepeatMessageRequest() (RMR=1)">🟣 Repeat Msg</button>
          <button class="btn sm ${ecu.commEnabled ? "" : "red multi-btn-on"}" id="btnMultiComm_${idx}" onclick="multiEcuAction(${idx}, 'toggleComm')" title="CanNm_DisableCommunication / EnableCommunication">${ecu.commEnabled ? "🔇 Dis. Comm" : "🔊 En. Comm"}</button>
        </div>

        ${cfgDrawer}

        <!-- Identical Expanded State Machine Block as Main Tab -->
        <div class="sm-wrap">
          <div class="sm-node ${isNet ? "active pulse-glow" : ""}">
            <div class="sm-mode-head">
              <span style="font-weight:800; font-size:11.5px; color:#38bdf8">3. NETWORK MODE (NM_MODE_NETWORK)</span>
              <span class="badge xs">NetReq=${ecu.netRequest ? 1 : 0} • CBV=${cbvHex}</span>
            </div>
            <div class="sm-subgrid">
              <div class="sm-subnode ${isRms ? "active" : ""}">
                <span class="sm-subtitle">REPEAT_MESSAGE (RMS)</span>
                <span class="sm-subdesc">RepeatMsgTimer • Burst/RMR</span>
              </div>
              <div class="sm-subnode ${isNos ? "active" : ""}">
                <span class="sm-subtitle">NORMAL_OPERATION (NOS)</span>
                <span class="sm-subdesc">NetReq=1 • Phát MsgCycle</span>
              </div>
              <div class="sm-subnode ${isRss ? "active" : ""}">
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
            <div class="sm-node ${isBusSleep ? "active pulse-glow" : ""}">
              <div style="font-weight:800; font-size:11px; color:#94a3b8">1. BUS-SLEEP MODE</div>
              <div class="muted small" style="margin-top:2px; font-size:10px">Controller SLEEP, không Tx/Rx.</div>
              <div class="sm-subnode" style="margin-top:5px">Sleep Mode (BUS_SLEEP)</div>
            </div>

            <div class="sm-sleep-arrow">
              <span class="sm-flow-tag err">⬅ 0ms</span>
              <span class="hint" style="font-size:9px; white-space:nowrap">WaitSleep=0</span>
            </div>

            <div class="sm-node ${isPrepSleep ? "active pulse-glow" : ""}">
              <div style="font-weight:800; font-size:11px; color:#f87171">2. PREPARE BUS-SLEEP</div>
              <div class="muted small" style="margin-top:2px; font-size:10px">Đếm WaitBusSleep, còn nghe bus.</div>
              <div class="sm-subnode" style="margin-top:5px">Prepare Sleep</div>
            </div>
          </div>
        </div>

        <!-- Compact Timers Grid -->
        <div class="multi-timers-grid">
          ${renderMultiTimerBox("RepeatMsgTimer", ecu.timers.repeatMsg, ecu.cfg.CanNmRepeatMessageTime, "#fbbf24")}
          ${renderMultiTimerBox("NM-TimeoutTimer", ecu.timers.timeout, ecu.cfg.CanNmTimeoutTime, "#38bdf8")}
          ${renderMultiTimerBox("WaitBusSleepTimer", ecu.timers.waitBusSleep, ecu.cfg.CanNmWaitBusSleepTime, "#f87171")}
          ${renderMultiTimerBox(
            ecu.immBurstActive ? `Burst Tx (${ecu.burstLeft} left)` : "MsgCycleTimer",
            ecu.timers.msgCycle,
            ecu.immBurstActive ? Math.max(100, ecu.cfg.CanNmImmediateNmCycleTime) : ecu.cfg.CanNmMsgCycleTime,
            ecu.immBurstActive ? "#c084fc" : "#34d399"
          )}
        </div>

        <!-- Status Meta Strip -->
        <div class="multi-meta-bar">
          <span>Wakeup: <b style="color:var(--accent)">${escapeHtml(ecu.wakeupSource)}</b></span>
          <span>AWB=<b>${ecu.cbv.awb ? 1 : 0}</b> RMR=<b>${ecu.cbv.rmr ? 1 : 0}</b></span>
          <span class="muted" style="max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">${escapeHtml(ecu.lastActivity)}</span>
        </div>
      </div>
    </div>
  `;
}

function renderMultiBusBridge() {
  const f = multiState.lastFrame;
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

  return `
    <div class="multi-bus-col">
      <div class="multi-bus-bridge">
        <div class="row" style="justify-content:space-between">
          <span class="panel-t" style="font-size:11px">🚌 VIRTUAL CAN BUS</span>
          <span class="badge xs ${f ? "sky" : ""}">${f ? "ACTIVE" : "IDLE"}</span>
        </div>

        <div class="multi-bus-wire ${f ? "active-tx" : ""}">
          <span class="multi-dir-pill">${escapeHtml(dirLabel)}</span>
          ${f ? `
            <div class="multi-frame-box">
              <div class="row" style="justify-content:space-between; margin-bottom:3px">
                <span style="font-weight:800; color:#fbbf24">ID ${escapeHtml(f.canIdHex)}</span>
                <span class="dim">t=${f.timeMs}ms</span>
              </div>
              <div style="font-weight:700; color:var(--text); word-break:break-all; margin-bottom:3px">[${f.hexArr.join(" ")}]</div>
              <div class="muted" style="font-size:10px">${escapeHtml(f.reason)}</div>
              <div style="margin-top:3px; color:#38bdf8; font-size:10px">CBV=0x${f.cbvByte.toString(16).toUpperCase().padStart(2, "0")} (AWB=${f.awb ? 1 : 0}, RMR=${f.rmr ? 1 : 0})</div>
            </div>
          ` : `
            <div class="muted small" style="padding:8px 4px">Chưa có bản tin NM nào trên bus.<br>Hãy bấm <b>Nw Request</b> trên một ECU!</div>
          `}
        </div>

        <div style="display:flex; flex-direction:column; gap:5px">
          <div class="multi-stat-row">
            <span class="muted">ECU đang Network Mode:</span>
            <span class="mono" style="font-weight:800; color:#38bdf8">${netCount} / ${multiState.ecuCount}</span>
          </div>
          <div class="multi-stat-row">
            <span class="muted">ECU đang giữ mạng (NetReq):</span>
            <span class="mono" style="font-weight:800; color:#34d399">${reqCount} / ${multiState.ecuCount}</span>
          </div>
          <div class="multi-stat-row">
            <span class="muted">Điều kiện ngủ chung:</span>
            <span class="mono" style="font-weight:700; color:${reqCount === 0 ? "#34d399" : "#fbbf24"}">${reqCount === 0 ? "Sẵn sàng đồng thuận" : "Chưa (Có ECU giữ)"}</span>
          </div>
        </div>
      </div>
    </div>
  `;
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
    badge.innerText = filterVal === "ALL"
      ? `${allLogs.length} sự kiện`
      : `${filtered.length}/${allLogs.length} sự kiện`;
  }

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

function renderMultiEcuView() {
  const clk = document.getElementById("lblMultiClock");
  if (clk) clk.innerText = `t = ${multiState.clockMs} ms`;

  const arena = document.getElementById("multiArena");
  if (!arena) return;

  if (multiState.ecuCount === 2) {
    arena.className = "multi-arena mode-2";
    arena.innerHTML =
      renderMultiEcuCard(multiState.ecus[0], 0) +
      renderMultiBusBridge() +
      renderMultiEcuCard(multiState.ecus[1], 1);
  } else {
    arena.className = "multi-arena mode-3";
    arena.innerHTML =
      renderMultiBusBridge() +
      renderMultiEcuCard(multiState.ecus[0], 0) +
      renderMultiEcuCard(multiState.ecus[1], 1) +
      renderMultiEcuCard(multiState.ecus[2], 2);
  }

  renderMultiTraceLogs();
}

window.addEventListener("DOMContentLoaded", () => {
  renderMultiEcuView();
});
