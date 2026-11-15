// ==================== XFRM SIMULATION ENGINE, CRC, SERIALIZERS & EXPORTS ====================

const defaultConfig = {
  // Tab 0: General & Chain (6)
  XfrmDevErrorDetect: true,
  ActiveTransformerChainPreset: 'COMXF_ONLY',
  XfrmBufferComputationMode: 'IN_PLACE',
  XfrmAllocatedRteBufferSize: 64,
  RteForwardSoftErrorToSwc: true,
  XfrmInitializedState: true,

  // Tab 1: ComXf & SignalGroup (6)
  ComXfSignalEndianness: 'BIG_ENDIAN',
  ComXfUnusedBitFillPatternHex: '0xFF',
  SwcInputVehicleSpeedKmh: 1205,
  SwcInputSteerAngleDeg: -120,
  SwcInputGearPosition: 4,
  ComSendSignalGroupArrayEnable: true,

  // Tab 2: SomeIpXf & Header (6)
  SomeIpXfServiceAndMethodIdHex: '0x1234:0x0001',
  SomeIpXfClientAndSessionIdHex: '0x0001:0x0007',
  SomeIpXfProtocolVersion: 1,
  SomeIpXfInterfaceVersion: 1,
  SomeIpXfMessageType: 'NOTIFICATION_0x02',
  SomeIpXfStructAlignmentBytes: '1',

  // Tab 3: Dynamic Array & TLV (6)
  SomeIpXfLengthFieldSize: '4',
  SomeIpXfDynamicArrayElementCount: 2,
  SomeIpXfEnableTlvEncoding: false,
  SomeIpXfTlvWireType: '1_16BIT_BASE',
  SomeIpXfUnrecognizedTlvBehavior: 'IGNORE_SKIP_UNKNOWN_TAG',
  SomeIpXfStringEncoding: 'UTF8_DYNAMIC_LEN',

  // Tab 4: E2EXf Safety Profile (6)
  E2EXfActiveProfile: 'NONE',
  E2EXfDataIdHex: '0x1A2B3C4D',
  E2EXfHeaderBitOffset: 0,
  E2EXfMaxDeltaCounter: 1,
  E2EXfMinOkStateValid: 2,
  E2EXfMaxErrorStateValid: 1,

  // Tab 5: Faults & DET (6)
  InjectE2ECrcCorruption: false,
  InjectE2ECounterFaultMode: 'NORMAL_INC_PLUS_1',
  InjectSomeIpHeaderFault: 'NONE',
  InjectTruncatedBufferBytes: false,
  PassNullPtrOrUninitForDetTest: false,
  E2ESmWindowClearOnReset: true
};

// -------------------- Low-level Hex & CRC Helpers --------------------
function toHex2(n) {
  return ((Number(n) || 0) & 0xFF).toString(16).toUpperCase().padStart(2, '0');
}
function toHex4(n) {
  return ((Number(n) || 0) & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
}
function toHex8(n) {
  return ((Number(n) || 0) >>> 0).toString(16).toUpperCase().padStart(8, '0');
}
function parseHexInt(str, fallback) {
  const clean = String(str || '').trim();
  const v = parseInt(clean, 16);
  return Number.isFinite(v) ? v : (fallback || 0);
}
function parseHexPair(str, defA, defB) {
  const parts = String(str || '').split(':');
  const a = parseHexInt(parts[0], defA);
  const b = parseHexInt(parts[1] !== undefined ? parts[1] : parts[0], defB);
  return [a & 0xFFFF, b & 0xFFFF];
}
function pushU16(arr, val, bigEndian) {
  const v = val & 0xFFFF;
  if (bigEndian) {
    arr.push((v >> 8) & 0xFF, v & 0xFF);
  } else {
    arr.push(v & 0xFF, (v >> 8) & 0xFF);
  }
}
function pushU32BE(arr, val) {
  const v = val >>> 0;
  arr.push((v >>> 24) & 0xFF, (v >>> 16) & 0xFF, (v >>> 8) & 0xFF, v & 0xFF);
}
function calcCrc8J1850(bytes) {
  let crc = 0xFF;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= (bytes[i] & 0xFF);
    for (let b = 0; b < 8; b++) {
      crc = (crc & 0x80) ? (((crc << 1) ^ 0x1D) & 0xFF) : ((crc << 1) & 0xFF);
    }
  }
  return crc ^ 0xFF;
}
function calcCrc16Ccitt(bytes) {
  let crc = 0xFFFF;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= ((bytes[i] & 0xFF) << 8);
    for (let b = 0; b < 8; b++) {
      crc = (crc & 0x8000) ? (((crc << 1) ^ 0x1021) & 0xFFFF) : ((crc << 1) & 0xFFFF);
    }
  }
  return crc & 0xFFFF;
}
function calcCrc32P4(bytes) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= (bytes[i] & 0xFF);
    for (let b = 0; b < 8; b++) {
      crc = (crc & 1) ? ((crc >>> 1) ^ 0xC8DF352F) : (crc >>> 1);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
function calcCrc64Bytes(bytes) {
  let hi = 0xA55A1234 >>> 0;
  let lo = calcCrc32P4(bytes);
  for (let i = 0; i < bytes.length; i++) {
    hi = ((hi * 33) ^ (bytes[i] + i * 17)) >>> 0;
  }
  return [
    (hi >>> 24) & 0xFF, (hi >>> 16) & 0xFF, (hi >>> 8) & 0xFF, hi & 0xFF,
    (lo >>> 24) & 0xFF, (lo >>> 16) & 0xFF, (lo >>> 8) & 0xFF, lo & 0xFF
  ];
}

function getMsgTypeByte(cfg) {
  const m = String(cfg.SomeIpXfMessageType || '');
  if (m.indexOf('0x00') >= 0) return 0x00;
  if (m.indexOf('0x01') >= 0) return 0x01;
  if (m.indexOf('0x80') >= 0) return 0x80;
  if (m.indexOf('0x81') >= 0) return 0x81;
  return 0x02;
}
function isSomeIpPreset(cfg) {
  return String(cfg.ActiveTransformerChainPreset || '').indexOf('SOMEIPXF') === 0;
}
function getEffectiveE2eProfile(cfg) {
  return cfg.E2EXfActiveProfile || 'NONE';
}
function getHeaderShiftBytes(cfg) {
  const prof = getEffectiveE2eProfile(cfg);
  if (prof === 'NONE') return 0;
  if (cfg.XfrmBufferComputationMode !== 'IN_PLACE') return 0;
  return (E2E_PROFILES_META[prof] || E2E_PROFILES_META.NONE).headerBytes;
}

// -------------------- State Initialization & Registers --------------------
function createInitialSimState(cfg) {
  const sim = {
    clockMs: 0,
    lastChainDir: 'IDLE',
    chainFsmState: 'IDLE',
    e2eSmState: 'E2E_SM_VALID',
    e2eSmStateNibble: 0x00,
    e2eCheckStatus: 0x00,
    e2eRawReturnByte: 0x00,
    rteReturnCode: 0x00,
    rteReturnLabel: 'RTE_E_OK (0x00)',
    txCounter: 0,
    lastRxCounter: -1,
    e2eDeltaCounter: 1,
    e2eOkCount: 2,
    e2eErrCount: 0,
    e2eWindowHistory: ['OK', 'OK'],
    headerShiftBytes: getHeaderShiftBytes(cfg),
    memcpyBytes: 0,
    requiredBufSize: 0,
    serverAppErrCode: 0x00,
    rpcStepPhase: 'NONE', // 'REQ_TX', 'SERVER_EXEC', 'RESP_TX', 'CLIENT_RX'
    someIpExtractResult: null,
    decodedSummary: 'Sẵn sàng tuần tự hóa',
    corruptedOffsets: [],
    bufferBytes: [],
    bufferRegions: [],
    pipelineStages: [],
    regAReturnErrByte: 0x01,
    regBChainPipeByte: 0x8C,
    detErrors: [],
    detFlagLatched: false,
    traceSeq: 0,
    traces: [],
    activeSvgModules: ['SWC', 'RTE'],
    activeSvgPaths: [],
    lastErrorModule: '',
    stepExplanation: {
      title: 'Khởi tạo Xfrm Simulator',
      summary: 'Hệ thống đã sẵn sàng mô phỏng ComXf (#175), SomeIpXf (#174) và E2EXf (#176).',
      inputSrc: 'SWC struct hoặc Bus Buffer',
      processDesc: 'Chọn kịch bản S1–S12 hoặc bấm Quick Action để thực thi.',
      outputDst: 'Com_SendSignalGroupArray() / LdCom_Transmit() / SWC',
      bitDiff: 'Bit 0 SM_VALID_OK = 1 | Bit 7 XFRM_INIT = 1',
      alert: ''
    }
  };
  updatePipelineVisual(sim, cfg, 'IDLE');
  syncRegistersFromState(sim, cfg);
  return sim;
}

function syncRegistersFromState(sim, cfg) {
  const someIp = isSomeIpPreset(cfg);
  const e2eProf = getEffectiveE2eProfile(cfg);
  const e2eOn = e2eProf !== 'NONE';
  const inPlace = cfg.XfrmBufferComputationMode === 'IN_PLACE';
  const bigEnd = someIp ? true : (cfg.ComXfSignalEndianness === 'BIG_ENDIAN');
  const msgByte = getMsgTypeByte(cfg);
  const extTlvRpc = someIp && (cfg.SomeIpXfEnableTlvEncoding || msgByte === 0x00 || msgByte === 0x80 || msgByte === 0x81);

  // Register B: Xfrm_ChainPipelineByte
  let regB = 0;
  if (cfg.XfrmInitializedState) regB |= (1 << 7);
  if (sim.lastChainDir === 'RX' || sim.lastChainDir === 'EXTRACT') regB |= (1 << 6);
  if (someIp) regB |= (1 << 5);
  if (e2eOn) regB |= (1 << 4);
  if (inPlace) regB |= (1 << 3);
  if (bigEnd) regB |= (1 << 2);
  if (extTlvRpc) regB |= (1 << 1);
  if (sim.detFlagLatched || sim.detErrors.length > 0) regB |= (1 << 0);
  sim.regBChainPipeByte = regB & 0xFF;

  // Register A: Xfrm_ReturnErrorByte
  let regA = 0;
  const hardErr = (sim.rteReturnCode === 0x88 || sim.rteReturnCode === 0x87 || sim.rteReturnCode === 0x89 || (sim.e2eRawReturnByte & 0x80) !== 0);
  if (hardErr) regA |= (1 << 7);
  if (sim.e2eCheckStatus >= 0x40 || sim.rteReturnCode === 0x87) regA |= (1 << 6);
  if (sim.e2eCheckStatus === 0x20 || sim.e2eCheckStatus === 0x30) regA |= (1 << 5);
  if (sim.e2eCheckStatus === 0x10 || sim.e2eCheckStatus === 0x30) regA |= (1 << 4);
  if (sim.lastErrorModule === 'SomeIpXf' || sim.lastErrorModule === 'ComXf' || sim.rteReturnCode === 0x89 || sim.rteReturnCode === 0x8A && !e2eOn) {
    regA |= (1 << 3);
  }
  if (sim.e2eSmState === 'E2E_SM_NODATA' || sim.e2eSmState === 'E2E_SM_DEINIT') regA |= (1 << 2);
  if (sim.e2eSmState === 'E2E_SM_INVALID') regA |= (1 << 1);
  if (!hardErr && sim.e2eSmState === 'E2E_SM_VALID') regA |= (1 << 0);
  sim.regAReturnErrByte = regA & 0xFF;
}

function advanceClock(sim, dt) {
  sim.clockMs += (dt || 5);
}

function addTrace(sim, module, modId, api, params, result, severity, detail) {
  sim.traceSeq += 1;
  sim.traces.unshift({
    seq: sim.traceSeq,
    timeMs: sim.clockMs,
    module,
    modId,
    api,
    params,
    result,
    severity: severity || 'ok',
    detail: detail || ''
  });
  if (sim.traces.length > 40) sim.traces.length = 40;
}

function reportDetError(sim, cfg, isRuntime, moduleName, modId, apiId, errName, errCode) {
  if (!isRuntime && !cfg.XfrmDevErrorDetect) {
    return false;
  }
  const fnName = isRuntime ? 'Det_ReportRuntimeError' : 'Det_ReportError';
  sim.detFlagLatched = true;
  sim.detErrors.push({
    timeMs: sim.clockMs,
    type: isRuntime ? 'RUNTIME' : 'DEV',
    module: moduleName,
    modId,
    apiId,
    errName,
    errCode
  });
  addTrace(
    sim,
    'Det',
    15,
    `${fnName}(${modId}, 0, 0x${toHex2(apiId)}, 0x${toHex2(errCode)})`,
    `${moduleName} -> ${errName}`,
    'E_OK',
    'err',
    isRuntime
      ? `Lỗi Runtime luôn báo cáo kể cả khi XfrmDevErrorDetect = FALSE`
      : `Lỗi phát triển (XfrmDevErrorDetect = TRUE)`
  );
  return true;
}

// -------------------- Pipeline Stage Builder --------------------
function updatePipelineVisual(sim, cfg, dir, opts) {
  opts = opts || {};
  const someIp = isSomeIpPreset(cfg);
  const serName = someIp ? 'SomeIpXf (#174)' : 'ComXf (#175)';
  const e2eProf = getEffectiveE2eProfile(cfg);
  const e2eOn = e2eProf !== 'NONE';
  const busName = someIp ? 'LdCom (#49) ➔ SoAd' : 'COM (#50) ➔ CanIf';
  const inPlace = cfg.XfrmBufferComputationMode === 'IN_PLACE';
  const aborted = !!opts.aborted;

  if (dir === 'IDLE') {
    sim.pipelineStages = [
      {
        title: 'SWC Application',
        sub: someIp ? 'Rte_Write / Rte_Call' : 'Rte_Write(BrakeGrp)',
        meta: 'Init State (Standby)',
        state: ''
      },
      {
        title: `Stage 1: ${serName}`,
        sub: someIp ? `8B Hdr + ${cfg.SomeIpXfEnableTlvEncoding ? 'TLV' : 'DynArr[' + cfg.SomeIpXfDynamicArrayElementCount + ']'}` : `${cfg.ComXfSignalEndianness === 'BIG_ENDIAN' ? 'BigEnd' : 'LitEnd'} Fill=${cfg.ComXfUnusedBitFillPatternHex}`,
        meta: e2eOn && inPlace ? `Dự kiến Offset +${sim.headerShiftBytes}B` : 'Offset +0B',
        state: ''
      },
      {
        title: e2eOn ? `Stage 2: E2EXf (#176)` : 'Stage 2: No E2EXf',
        sub: e2eOn ? `${e2eProf} (${E2E_PROFILES_META[e2eProf].headerBytes}B Hdr)` : 'Bypass (Không bọc CRC)',
        meta: e2eOn ? `SM: ${sim.e2eSmState}` : 'Direct Pass',
        state: !e2eOn ? 'bypassed' : ''
      },
      {
        title: busName,
        sub: someIp ? 'LdCom_Transmit()' : (cfg.ComSendSignalGroupArrayEnable ? 'Com_SendSigGrpArray()' : 'Com_SendSignal()'),
        meta: 'Chờ kích hoạt Bước 1',
        state: ''
      }
    ];
    return;
  }

  if (dir === 'TX') {
    sim.pipelineStages = [
      {
        title: 'SWC Application',
        sub: someIp ? (getMsgTypeByte(cfg) === 0x00 ? 'Rte_Call()' : 'Rte_Write(RadarObj)') : 'Rte_Write(BrakeGrp)',
        meta: 'ApplicationDataType',
        state: 'active-tx'
      },
      {
        title: `Stage 1: ${serName}`,
        sub: someIp ? `8B Hdr + ${cfg.SomeIpXfEnableTlvEncoding ? 'TLV' : 'DynArr[' + cfg.SomeIpXfDynamicArrayElementCount + ']'}` : `${cfg.ComXfSignalEndianness === 'BIG_ENDIAN' ? 'BigEnd' : 'LitEnd'} Fill=${cfg.ComXfUnusedBitFillPatternHex}`,
        meta: e2eOn && inPlace ? `Offset +${sim.headerShiftBytes}B (Zero-Copy)` : 'Offset +0B',
        state: aborted && sim.lastErrorModule === (someIp ? 'SomeIpXf' : 'ComXf') ? 'active-err' : 'active-tx'
      },
      {
        title: e2eOn ? `Stage 2: E2EXf (#176)` : 'Stage 2: No E2EXf',
        sub: e2eOn ? `${e2eProf} (${E2E_PROFILES_META[e2eProf].headerBytes}B Hdr)` : 'Bypass (Không bọc CRC)',
        meta: e2eOn ? `Cnt=${sim.txCounter} DataID=${cfg.E2EXfDataIdHex}` : 'Direct Pass',
        state: !e2eOn ? 'bypassed' : (aborted ? 'active-err' : 'active-tx')
      },
      {
        title: busName,
        sub: someIp ? 'LdCom_Transmit()' : (cfg.ComSendSignalGroupArrayEnable ? 'Com_SendSigGrpArray()' : 'Com_SendSignal()'),
        meta: `Total = ${sim.requiredBufSize} Bytes`,
        state: aborted ? 'active-err' : 'active-tx'
      }
    ];
  } else {
    sim.pipelineStages = [
      {
        title: busName,
        sub: someIp ? 'Rte_LdComCbkRxInd()' : 'Com_ReceiveSigGrpArr()',
        meta: `Rx Frame = ${sim.bufferBytes.length}B`,
        state: 'active-rx'
      },
      {
        title: e2eOn ? 'Step 1: E2EXf_Inv (#176)' : 'Step 1: No E2EXf_Inv',
        sub: e2eOn ? `2-Nibble: 0x${toHex2(sim.e2eRawReturnByte)}` : 'Bypass Check',
        meta: e2eOn ? `${sim.e2eSmState}` : 'Direct Rx',
        state: !e2eOn ? 'bypassed' : ((sim.e2eRawReturnByte & 0x80) ? 'active-err' : 'active-rx')
      },
      {
        title: `Step 2: ${serName}_Inv`,
        sub: aborted && sim.lastErrorModule === 'E2EXf' ? 'ABORTED (Skipped!)' : (someIp ? 'ExtractHdr + Deser' : 'Unpack + SignExt'),
        meta: aborted ? `RTE Ret: 0x${toHex2(sim.rteReturnCode)}` : sim.decodedSummary,
        state: aborted ? 'active-err' : 'active-rx'
      },
      {
        title: 'SWC Receiver / Client',
        sub: aborted ? 'Blocked (No Garbage Write)' : (sim.rteReturnCode === 0x8A ? 'Deliver + Soft 0x8A' : (cfg.SomeIpXfMessageType === 'ERROR_0x81' ? 'App Error 0x01' : 'Deliver Clean Struct')),
        meta: `Return = 0x${toHex2(sim.rteReturnCode)}`,
        state: aborted ? 'active-err' : 'active-rx'
      }
    ];
  }
}

// -------------------- TX FORWARD ENGINE --------------------
function executeTxForward(sim, cfg, opts) {
  opts = opts || {};
  advanceClock(sim, 5);
  sim.lastChainDir = 'TX';
  sim.chainFsmState = 'TX_FORWARD';
  sim.lastErrorModule = '';
  sim.someIpExtractResult = null;
  sim.corruptedOffsets = [];

  const someIp = isSomeIpPreset(cfg);
  const modName = someIp ? 'SomeIpXf' : 'ComXf';
  const modId = someIp ? 174 : 175;
  const e2eProf = getEffectiveE2eProfile(cfg);
  const e2eMeta = E2E_PROFILES_META[e2eProf] || E2E_PROFILES_META.NONE;
  const e2eOn = e2eProf !== 'NONE';
  const inPlace = cfg.XfrmBufferComputationMode === 'IN_PLACE';
  const headerShift = (e2eOn && inPlace) ? e2eMeta.headerBytes : 0;
  sim.headerShiftBytes = headerShift;

  // DET Check 1: Uninitialized
  if (!cfg.XfrmInitializedState) {
    sim.rteReturnCode = 0xFF;
    sim.rteReturnLabel = 'DET UNINIT (0xFF)';
    sim.chainFsmState = 'ABORTED_0x88';
    sim.lastErrorModule = modName;
    reportDetError(sim, cfg, false, modName, modId, 0x03, 'XFRM_E_UNINIT', 0x01);
    if (e2eOn) reportDetError(sim, cfg, false, 'E2EXf', 176, 0x03, 'XFRM_E_UNINIT', 0x01);
    sim.activeSvgModules = ['RTE', modName, 'Det'];
    sim.activeSvgPaths = [`path_RTE_${modName}`, 'path_RTE_Det'];
    updatePipelineVisual(sim, cfg, 'TX', { aborted: true });
    sim.stepExplanation = {
      title: `DET Chặn Tx: ${modName} Chưa Init (XFRM_E_UNINIT = 0x01)`,
      summary: `Biến XfrmInitializedState = FALSE khiến Bit 7 XFRM_INIT = 0. Khi gọi ${modName}_Tx(), hàng rào DET chặn lại ngay.`,
      inputSrc: 'SWC ghi struct vào Rte_Write()',
      processDesc: `${modName} kiểm tra initStatus == UNINIT -> gọi Det_ReportError(${modId}, 0, 0x03, 0x01).`,
      outputDst: 'DET ModuleId 15 (Không đẩy frame ra bus)',
      bitDiff: 'Reg B Bit 7 (XFRM_INIT) = 0, Bit 0 (DET_ERR_FLG) = 1',
      alert: 'Hãy tick XfrmInitializedState = TRUE để khôi phục hoạt động.'
    };
    syncRegistersFromState(sim, cfg);
    return;
  }

  // DET Check 2: NULL_PTR injection
  if (cfg.PassNullPtrOrUninitForDetTest) {
    sim.rteReturnCode = 0xFF;
    sim.rteReturnLabel = 'DET PARAM_POINTER';
    sim.chainFsmState = 'ABORTED_0x88';
    sim.lastErrorModule = modName;
    reportDetError(sim, cfg, false, modName, modId, 0x03, 'XFRM_E_PARAM_POINTER', 0x04);
    sim.activeSvgModules = ['RTE', modName, 'Det'];
    sim.activeSvgPaths = [`path_RTE_${modName}`, 'path_RTE_Det'];
    updatePipelineVisual(sim, cfg, 'TX', { aborted: true });
    sim.stepExplanation = {
      title: `DET Chặn Tx: Con Trỏ NULL_PTR (XFRM_E_PARAM_POINTER = 0x04)`,
      summary: `PassNullPtrOrUninitForDetTest = TRUE mô phỏng buffer == NULL_PTR hoặc dataElement == NULL_PTR truyền vào ${modName}.`,
      inputSrc: 'buffer = NULL_PTR',
      processDesc: `${modName} kiểm tra con trỏ != NULL_PTR -> báo Det_ReportError(${modId}, 0, 0x03, 0x04).`,
      outputDst: 'DET ModuleId 15 (Hủy truyền Tx)',
      bitDiff: 'Reg B Bit 0 (DET_ERR_FLG) = 1',
      alert: 'Tắt PassNullPtrOrUninitForDetTest để truyền với buffer hợp lệ.'
    };
    syncRegistersFromState(sim, cfg);
    return;
  }

  // Build Stage 1 Serialized Payload Bytes
  const stage1Entries = [];
  if (!someIp) {
    // ComXf (#175): SignalGroup packing
    const bigEnd = cfg.ComXfSignalEndianness === 'BIG_ENDIAN';
    const spd = Math.max(0, Math.min(65535, Number(cfg.SwcInputVehicleSpeedKmh) || 0));
    const steerRaw = Math.max(-32768, Math.min(32767, Number(cfg.SwcInputSteerAngleDeg) || 0));
    const steerU16 = steerRaw & 0xFFFF;
    const gear = Math.max(0, Math.min(15, Number(cfg.SwcInputGearPosition) || 0));
    const fillVal = parseHexInt(cfg.ComXfUnusedBitFillPatternHex, 0xFF) & 0xFF;

    const spdBytes = []; pushU16(spdBytes, spd, bigEnd);
    const strBytes = []; pushU16(strBytes, steerU16, bigEnd);
    const gearByte = (fillVal & 0xF0) | (gear & 0x0F);

    stage1Entries.push({ byte: spdBytes[0], role: 'payload', label: bigEnd ? 'Spd_Hi' : 'Spd_Lo', detail: `VehicleSpeed (${spd}) Byte 0 [${cfg.ComXfSignalEndianness}]` });
    stage1Entries.push({ byte: spdBytes[1], role: 'payload', label: bigEnd ? 'Spd_Lo' : 'Spd_Hi', detail: `VehicleSpeed (${spd}) Byte 1 [${cfg.ComXfSignalEndianness}]` });
    stage1Entries.push({ byte: strBytes[0], role: 'payload', label: bigEnd ? 'Str_Hi' : 'Str_Lo', detail: `SteerAngle (${steerRaw}, sint16 0x${toHex4(steerU16)}) Byte 0` });
    stage1Entries.push({ byte: strBytes[1], role: 'payload', label: bigEnd ? 'Str_Lo' : 'Str_Hi', detail: `SteerAngle (${steerRaw}) Byte 1` });
    stage1Entries.push({ byte: gearByte, role: 'payload', label: `Fill|Gr=${gear}`, detail: `Bits[7..4]=Fill(${toHex2(fillVal & 0xF0)}), Bits[3..0]=Gear(${gear})` });

    const padCount = e2eOn ? (e2eProf === 'PROFILE_05' ? 0 : (e2eProf === 'PROFILE_01' ? 1 : 3)) : 3;
    for (let p = 0; p < padCount; p++) {
      stage1Entries.push({ byte: fillVal, role: 'pad', label: 'FillPat', detail: `ComXfUnusedBitFillPattern = ${cfg.ComXfUnusedBitFillPatternHex}` });
    }
  } else {
    // SomeIpXf (#174): 8-byte Header + Struct/DynArray/TLV/RPC
    const [cliId, sesId] = parseHexPair(cfg.SomeIpXfClientAndSessionIdHex, 1, 7);
    const pVer = (Number(cfg.SomeIpXfProtocolVersion) || 1) & 0xFF;
    const iVer = (Number(cfg.SomeIpXfInterfaceVersion) || 1) & 0xFF;
    const msgType = getMsgTypeByte(cfg);
    const retCode = msgType === 0x81 ? (sim.serverAppErrCode || 0x01) : 0x00;

    stage1Entries.push({ byte: (cliId >> 8) & 0xFF, role: 'someip', label: 'Cli_Hi', detail: `ClientId = 0x${toHex4(cliId)} (High)` });
    stage1Entries.push({ byte: cliId & 0xFF, role: 'someip', label: 'Cli_Lo', detail: `ClientId = 0x${toHex4(cliId)} (Low)` });
    stage1Entries.push({ byte: (sesId >> 8) & 0xFF, role: 'someip', label: 'Ses_Hi', detail: `SessionId = 0x${toHex4(sesId)} (High)` });
    stage1Entries.push({ byte: sesId & 0xFF, role: 'someip', label: 'Ses_Lo', detail: `SessionId = 0x${toHex4(sesId)} (Low)` });
    stage1Entries.push({ byte: pVer, role: 'someip', label: `PVer:${pVer}`, detail: `SOME/IP ProtocolVersion = 0x${toHex2(pVer)}` });
    stage1Entries.push({ byte: iVer, role: 'someip', label: `IVer:${iVer}`, detail: `InterfaceVersion = 0x${toHex2(iVer)}` });
    stage1Entries.push({ byte: msgType, role: 'someip', label: `Msg:${toHex2(msgType)}`, detail: `MessageType = ${cfg.SomeIpXfMessageType}` });
    stage1Entries.push({ byte: retCode, role: 'someip', label: `Ret:${toHex2(retCode)}`, detail: msgType === 0x81 ? `Server Application Error Code = 0x${toHex2(retCode)}` : 'SOME/IP ReturnCode = 0x00 (E_OK)' });

    if (msgType !== 0x81) {
      if (cfg.SomeIpXfEnableTlvEncoding) {
        // TLV Tags [WireType (3b) | DataId (12b)]
        const wtMap = { '0_8BIT_BASE': 0, '1_16BIT_BASE': 1, '2_32BIT_BASE': 2, '3_64BIT_BASE': 3, '4_LEN_1B': 4, '5_LEN_2B': 5, '6_LEN_4B': 6 };
        const wt = wtMap[cfg.SomeIpXfTlvWireType] !== undefined ? wtMap[cfg.SomeIpXfTlvWireType] : 1;
        // Tag 1: DataId 0x0001 (Speed, 2B fixed WireType=1 -> 0x1001)
        const tag1 = ((1 << 12) | 0x0001);
        stage1Entries.push({ byte: (tag1 >> 8) & 0xFF, role: 'tlv', label: 'Tag1_Hi', detail: 'TLV Tag 0x1001: WireType=1(16b), DataId=0x0001 (Known)' });
        stage1Entries.push({ byte: tag1 & 0xFF, role: 'tlv', label: 'Tag1_Lo', detail: 'TLV Tag DataId=0x0001' });
        const spd = Math.max(0, Math.min(65535, Number(cfg.SwcInputVehicleSpeedKmh) || 1205));
        stage1Entries.push({ byte: (spd >> 8) & 0xFF, role: 'payload', label: 'Val1_H', detail: `TLV Value Speed=${spd}` });
        stage1Entries.push({ byte: spd & 0xFF, role: 'payload', label: 'Val1_L', detail: `TLV Value Speed=${spd}` });

        // Tag 2: DataId 0x0002 (Gear/Mode, 1B fixed WireType=0 -> 0x0002)
        const tag2 = ((0 << 12) | 0x0002);
        stage1Entries.push({ byte: (tag2 >> 8) & 0xFF, role: 'tlv', label: 'Tag2_Hi', detail: 'TLV Tag 0x0002: WireType=0(8b), DataId=0x0002 (Known)' });
        stage1Entries.push({ byte: tag2 & 0xFF, role: 'tlv', label: 'Tag2_Lo', detail: 'TLV Tag DataId=0x0002' });
        stage1Entries.push({ byte: Number(cfg.SwcInputGearPosition) & 0xFF, role: 'payload', label: 'Val2_B', detail: `TLV Value Gear=${cfg.SwcInputGearPosition}` });

        // Tag 3: Unknown V2 field DataId 0x0003 using user's WireType!
        const tag3 = ((wt << 12) | 0x0003);
        stage1Entries.push({ byte: (tag3 >> 8) & 0xFF, role: 'tlv', label: 'Tag3?_H', detail: `TLV Tag Mới V2 (Lạ với V1): WireType=${wt}, DataId=0x0003` });
        stage1Entries.push({ byte: tag3 & 0xFF, role: 'tlv', label: 'Tag3?_L', detail: 'TLV Unknown DataId=0x0003' });
        if (wt >= 4) {
          const lfB = wt === 4 ? 1 : (wt === 5 ? 2 : 4);
          for (let k = 0; k < lfB; k++) {
            stage1Entries.push({ byte: k === lfB - 1 ? 2 : 0, role: 'len', label: `TLV_L${k}`, detail: 'TLV Complex LengthField = 2 bytes' });
          }
          stage1Entries.push({ byte: 0xCA, role: 'payload', label: 'Conf_0', detail: 'V2 Extended Payload Byte 0' });
          stage1Entries.push({ byte: 0xFE, role: 'payload', label: 'Conf_1', detail: 'V2 Extended Payload Byte 1' });
        } else {
          const bLen = 1 << wt; // 1, 2, 4, 8
          for (let k = 0; k < Math.min(4, bLen); k++) {
            stage1Entries.push({ byte: (0x50 + k), role: 'payload', label: `V2_${k}`, detail: `V2 New Field Data (WireType=${wt})` });
          }
        }
      } else {
        // HeaderInfo (3B timestamp/status) + Alignment Padding + LengthField + Dynamic Array
        stage1Entries.push({ byte: 0x0A, role: 'payload', label: 'Hdr_Stat', detail: 'Struct Fixed Field: Status = 0x0A' });
        stage1Entries.push({ byte: 0x15, role: 'payload', label: 'Hdr_Seq', detail: 'Struct Fixed Field: CycleSeq = 0x15' });
        stage1Entries.push({ byte: 0x01, role: 'payload', label: 'Hdr_Flg', detail: 'Struct Fixed Field: ValidFlag = 0x01' });

        const align = Math.max(1, Number(cfg.SomeIpXfStructAlignmentBytes) || 1);
        while (stage1Entries.length % align !== 0) {
          stage1Entries.push({ byte: 0x00, role: 'pad', label: 'AlignPad', detail: `Alignment Padding (${align}-Byte Struct Alignment)` });
        }

        const nObj = Math.max(0, Math.min(8, Number(cfg.SomeIpXfDynamicArrayElementCount) || 0));
        const lenFieldSz = Math.max(1, Math.min(4, Number(cfg.SomeIpXfLengthFieldSize) || 4));
        const dynBytesLen = nObj * 4;
        for (let b = lenFieldSz - 1; b >= 0; b--) {
          stage1Entries.push({
            byte: (dynBytesLen >>> (b * 8)) & 0xFF,
            role: 'len',
            label: `LenF_${lenFieldSz - 1 - b}`,
            detail: `LengthField (${lenFieldSz}B) = ${dynBytesLen} bytes (${nObj} RadarObj)`
          });
        }
        for (let idx = 0; idx < nObj; idx++) {
          stage1Entries.push({ byte: idx + 1, role: 'payload', label: `Obj${idx}_Id`, detail: `RadarObj[${idx}].Id = ${idx + 1}` });
          stage1Entries.push({ byte: 0x20 + idx * 5, role: 'payload', label: `Obj${idx}_Dst`, detail: `RadarObj[${idx}].Dist = ${(0x20 + idx * 5)}m` });
          stage1Entries.push({ byte: 0xFE, role: 'payload', label: `Obj${idx}_Vel`, detail: `RadarObj[${idx}].RelVel` });
          stage1Entries.push({ byte: 0x42, role: 'payload', label: `Obj${idx}_Rcs`, detail: `RadarObj[${idx}].RCS` });
        }
      }
    }
  }

  // Update Counter & Build E2EXf Header if active
  const stage1Len = stage1Entries.length;
  const e2eEntries = [];
  if (e2eOn) {
    if (opts.keepCounter !== true) {
      if (cfg.InjectE2ECounterFaultMode === 'NORMAL_INC_PLUS_1') sim.txCounter = (sim.txCounter + 1) & 0xFF;
      else if (cfg.InjectE2ECounterFaultMode === 'JUMP_SEQ_PLUS_5') sim.txCounter = (sim.txCounter + 5) & 0xFF;
    }
    const rawPayloadBytes = stage1Entries.map(e => e.byte);
    const dataIdVal = parseHexInt(cfg.E2EXfDataIdHex, 0x1A2B3C4D) >>> 0;
    const totalLenForE2e = e2eMeta.headerBytes + stage1Len;
    const crcInput = [(dataIdVal >>> 8) & 0xFF, dataIdVal & 0xFF, sim.txCounter & 0xFF].concat(rawPayloadBytes);

    if (e2eProf === 'PROFILE_01') {
      const crc8 = calcCrc8J1850(crcInput);
      const cntByte = (((dataIdVal & 0x0F) << 4) | (sim.txCounter & 0x0F)) & 0xFF;
      e2eEntries.push({ byte: crc8, role: 'e2e', label: 'P01_CRC8', detail: `E2E P01 CRC-8-J1850 = 0x${toHex2(crc8)}` });
      e2eEntries.push({ byte: cntByte, role: 'e2e', label: `P01_C${sim.txCounter & 0x0F}`, detail: `Bits[7..4]=DataID Nib | Bits[3..0]=Counter(${sim.txCounter & 0x0F})` });
    } else if (e2eProf === 'PROFILE_05') {
      const crc16 = calcCrc16Ccitt(crcInput);
      e2eEntries.push({ byte: (crc16 >> 8) & 0xFF, role: 'e2e', label: 'P05_CRCH', detail: `E2E P05 CRC-16 Hi = 0x${toHex2(crc16 >> 8)}` });
      e2eEntries.push({ byte: crc16 & 0xFF, role: 'e2e', label: 'P05_CRCL', detail: `E2E P05 CRC-16 Lo = 0x${toHex2(crc16)}` });
      e2eEntries.push({ byte: sim.txCounter & 0xFF, role: 'e2e', label: `P05_C${sim.txCounter}`, detail: `E2E P05 Counter (8-bit) = ${sim.txCounter}` });
    } else if (e2eProf === 'PROFILE_04') {
      const crc32 = calcCrc32P4(crcInput);
      e2eEntries.push({ byte: (totalLenForE2e >> 8) & 0xFF, role: 'e2e', label: 'P04_LenH', detail: `P04 Length = ${totalLenForE2e}B` });
      e2eEntries.push({ byte: totalLenForE2e & 0xFF, role: 'e2e', label: 'P04_LenL', detail: `P04 Length = ${totalLenForE2e}B` });
      e2eEntries.push({ byte: (sim.txCounter >> 8) & 0xFF, role: 'e2e', label: 'P04_CntH', detail: `P04 Counter (16b) = ${sim.txCounter}` });
      e2eEntries.push({ byte: sim.txCounter & 0xFF, role: 'e2e', label: `P04_C${sim.txCounter}`, detail: `P04 Counter = ${sim.txCounter}` });
      e2eEntries.push({ byte: (dataIdVal >>> 24) & 0xFF, role: 'e2e', label: 'P04_DID0', detail: `DataID = ${cfg.E2EXfDataIdHex}` });
      e2eEntries.push({ byte: (dataIdVal >>> 16) & 0xFF, role: 'e2e', label: 'P04_DID1', detail: `DataID Byte 1` });
      e2eEntries.push({ byte: (dataIdVal >>> 8) & 0xFF, role: 'e2e', label: 'P04_DID2', detail: `DataID Byte 2` });
      e2eEntries.push({ byte: dataIdVal & 0xFF, role: 'e2e', label: 'P04_DID3', detail: `DataID Byte 3` });
      e2eEntries.push({ byte: (crc32 >>> 24) & 0xFF, role: 'e2e', label: 'CRC32_0', detail: `CRC-32P4 = 0x${toHex8(crc32)}` });
      e2eEntries.push({ byte: (crc32 >>> 16) & 0xFF, role: 'e2e', label: 'CRC32_1', detail: `CRC-32P4 Byte 1` });
      e2eEntries.push({ byte: (crc32 >>> 8) & 0xFF, role: 'e2e', label: 'CRC32_2', detail: `CRC-32P4 Byte 2` });
      e2eEntries.push({ byte: crc32 & 0xFF, role: 'e2e', label: 'CRC32_3', detail: `CRC-32P4 Byte 3` });
    } else if (e2eProf === 'PROFILE_07') {
      const crc64 = calcCrc64Bytes(crcInput);
      pushU32BE(e2eEntries, totalLenForE2e);
      for (let i = 0; i < 4; i++) e2eEntries[i] = { byte: e2eEntries[i], role: 'e2e', label: `P07_Len${i}`, detail: `P07 32-bit Length = ${totalLenForE2e}B` };
      const cBytes = []; pushU32BE(cBytes, sim.txCounter);
      cBytes.forEach((b, i) => e2eEntries.push({ byte: b, role: 'e2e', label: i === 3 ? `P07_C${sim.txCounter}` : `P07_Cnt${i}`, detail: `P07 Counter = ${sim.txCounter}` }));
      const dBytes = []; pushU32BE(dBytes, dataIdVal);
      dBytes.forEach((b, i) => e2eEntries.push({ byte: b, role: 'e2e', label: `P07_DID${i}`, detail: `P07 DataID = ${cfg.E2EXfDataIdHex}` }));
      crc64.forEach((b, i) => e2eEntries.push({ byte: b, role: 'e2e', label: `CRC64_${i}`, detail: `E2E P07 CRC-64-ECMA Byte ${i}` }));
    }
  }

  // Combine final Rte_XfrmBuffer[]
  const combined = e2eEntries.concat(stage1Entries);

  // Inject Fault Mutations if configured
  if (cfg.InjectE2ECrcCorruption && e2eEntries.length > 0) {
    const crcIdx = (e2eProf === 'PROFILE_01' || e2eProf === 'PROFILE_05') ? 0 : (e2eEntries.length - 1);
    combined[crcIdx].byte ^= 0xFF;
    combined[crcIdx].corrupt = true;
    combined[crcIdx].detail += ' [⚠️ CRC BỊ ĐẢO BIT!]';
  }
  if (cfg.InjectTruncatedBufferBytes && combined.length > 5) {
    combined.length = Math.max(4, combined.length - 4);
  }

  sim.bufferBytes = combined.map((entry, idx) => ({
    offset: idx,
    byte: entry.byte & 0xFF,
    origByte: entry.byte & 0xFF,
    hexVal: toHex2(entry.byte),
    role: entry.role,
    label: entry.label,
    detail: entry.detail,
    corrupt: !!entry.corrupt
  }));

  sim.requiredBufSize = e2eEntries.length + stage1Len;
  sim.memcpyBytes = (!e2eOn || inPlace) ? 0 : stage1Len;

  // Check Buffer Overflow
  if (sim.requiredBufSize > Number(cfg.XfrmAllocatedRteBufferSize)) {
    sim.rteReturnCode = 0x88;
    sim.rteReturnLabel = 'BUFFER OVERFLOW (DET 0x03)';
    sim.chainFsmState = 'ABORTED_0x88';
    sim.lastErrorModule = modName;
    reportDetError(sim, cfg, false, modName, modId, 0x03, 'XFRM_E_PARAM', 0x03);
    sim.bufferRegions = [
      { role: 'err', title: `Tràn Bộ Đệm! Cần ${sim.requiredBufSize}B > Cấp phát ${cfg.XfrmAllocatedRteBufferSize}B`, offsetStart: 0, offsetEnd: sim.requiredBufSize - 1, size: sim.requiredBufSize, desc: 'Tăng XfrmAllocatedRteBufferSize ngay!' }
    ];
    updatePipelineVisual(sim, cfg, 'TX', { aborted: true });
    syncRegistersFromState(sim, cfg);
    return;
  }

  // Buffer Regions visualization
  sim.bufferRegions = [];
  if (inPlace || !e2eOn) {
    if (e2eEntries.length > 0) {
      sim.bufferRegions.push({ role: 'e2e', title: `E2E Hdr (${e2eEntries.length}B)`, offsetStart: 0, offsetEnd: e2eEntries.length - 1, size: e2eEntries.length, desc: `E2EXf ghi đè vào vùng chừa sẵn HeaderShift [0..${e2eEntries.length - 1}]` });
    }
    sim.bufferRegions.push({
      role: someIp ? 'someip' : 'payload',
      title: `${someIp ? 'SomeIpXf' : 'ComXf'} Output (${stage1Len}B) @ Rte_Buf[${headerShift}]`,
      offsetStart: headerShift,
      offsetEnd: sim.bufferBytes.length - 1,
      size: stage1Len,
      desc: inPlace ? 'IN_PLACE Zero-Copy (0B memcpy)' : 'Single-Stage Buffer'
    });
  } else {
    sim.bufferRegions.push({ role: 'copy', title: `OUT_OF_PLACE: Rte_Buf1[${stage1Len}] -> memcpy(${stage1Len}B) -> Rte_Buf2[${sim.requiredBufSize}]`, offsetStart: 0, offsetEnd: sim.requiredBufSize - 1, size: sim.requiredBufSize, desc: `Tốn gấp đôi RAM & ${stage1Len}B chu kỳ CPU memcpy!` });
  }

  sim.rteReturnCode = 0x00;
  sim.rteReturnLabel = 'RTE_E_OK (0x00)';
  sim.chainFsmState = 'DONE';

  // Traces
  addTrace(sim, modName, modId, `${modName}_Tx(${inPlace && e2eOn ? '&buf[' + headerShift + ']' : 'buf1'}, &len, &data)`, `Len=${stage1Len}B`, '0x00 E_OK', 'ok', someIp ? '8B SOME/IP Header + Payload' : `SignalGroup Packed (${cfg.ComXfSignalEndianness})`);
  if (e2eOn) {
    addTrace(sim, 'E2EXf', 176, `E2EXf_Tx_${e2eProf}(buf, &len, &buf[${headerShift}], ${stage1Len})`, `Cnt=${sim.txCounter}, DataID=${cfg.E2EXfDataIdHex}`, '0x00 E_OK', 'ok', `Đã bọc ${e2eEntries.length}B ${e2eMeta.crcType}`);
  }
  const transportMod = someIp ? 'LdCom' : 'Com';
  const transportApi = someIp
    ? `LdCom_Transmit(LdComConf_RadarObj, &PduInfo[${sim.bufferBytes.length}B])`
    : (cfg.ComSendSignalGroupArrayEnable ? `Com_SendSignalGroupArray(ComConf_SigGrp, buf, ${sim.bufferBytes.length})` : `Com_SendSignal(...)`);
  addTrace(sim, transportMod, someIp ? 49 : 50, transportApi, `Total=${sim.bufferBytes.length}B`, 'E_OK', 'ok', someIp ? 'Chuyển PduR -> SoAd (thêm 8B ServiceID/MethodID/Len)' : 'Chuyển PduR -> CanIf');

  sim.activeSvgModules = ['SWC', 'RTE', modName, transportMod, 'BusIf'].concat(e2eOn ? ['E2EXf'] : []);
  sim.activeSvgPaths = ['path_SWC_RTE', `path_RTE_${modName}`, someIp ? 'path_Com_BusIf' : 'path_Com_BusIf'];
  if (someIp) {
    sim.activeSvgPaths = ['path_SWC_RTE', 'path_RTE_SomeIpXf', e2eOn ? 'path_SomeIpXf_E2EXf' : 'path_SomeIpXf_LdCom', e2eOn ? 'path_E2EXf_LdCom' : '', 'path_LdCom_BusIf'].filter(Boolean);
  } else {
    sim.activeSvgPaths = ['path_SWC_RTE', 'path_RTE_ComXf', e2eOn ? 'path_ComXf_E2EXf' : 'path_ComXf_Com', e2eOn ? 'path_E2EXf_Com' : '', 'path_Com_BusIf'].filter(Boolean);
  }

  sim.stepExplanation = {
    title: `Tx Forward Thành Công (${modName}${e2eOn ? ' ➔ E2EXf ' + e2eProf : ''} ➔ ${transportMod})`,
    summary: `RTE điều phối tuần tự: Stage 1 gọi ${modName} tạo ${stage1Len}B${e2eOn ? ', Stage 2 gọi E2EXf gắn ' + e2eEntries.length + 'B Header an toàn' : ''}.`,
    inputSrc: someIp ? `SWC struct (${cfg.SomeIpXfMessageType}, ${cfg.SomeIpXfDynamicArrayElementCount} obj)` : `SWC BrakeStatus_t (Spd=${cfg.SwcInputVehicleSpeedKmh}, Steer=${cfg.SwcInputSteerAngleDeg}, Gear=${cfg.SwcInputGearPosition})`,
    processDesc: `Chế độ đệm ${cfg.XfrmBufferComputationMode} (${inPlace ? 'HeaderShift=' + headerShift + 'B, 0 memcpy' : 'memcpy=' + sim.memcpyBytes + 'B'}).`,
    outputDst: `${transportApi} ➔ Bus vật lý`,
    bitDiff: `Reg B: INPLACE=${inPlace ? 1 : 0}, SOMEIP=${someIp ? 1 : 0}, E2E_ON=${e2eOn ? 1 : 0}`,
    alert: cfg.InjectE2ECrcCorruption ? 'Cảnh báo: Đang bật InjectE2ECrcCorruption — byte CRC trên bus đã bị đảo bit!' : ''
  };

  updatePipelineVisual(sim, cfg, 'TX', { aborted: false });
  syncRegistersFromState(sim, cfg);
}

// -------------------- RX INVERSE ENGINE --------------------
function executeRxInverse(sim, cfg) {
  advanceClock(sim, 5);
  if (sim.bufferBytes.length === 0) {
    executeTxForward(sim, cfg, { keepCounter: true });
    advanceClock(sim, 5);
  }

  sim.lastChainDir = 'RX';
  sim.lastErrorModule = '';
  const someIp = isSomeIpPreset(cfg);
  const modName = someIp ? 'SomeIpXf' : 'ComXf';
  const modId = someIp ? 174 : 175;
  const e2eProf = getEffectiveE2eProfile(cfg);
  const e2eMeta = E2E_PROFILES_META[e2eProf] || E2E_PROFILES_META.NONE;
  const e2eOn = e2eProf !== 'NONE';
  const transportMod = someIp ? 'LdCom' : 'Com';

  // DET Check 1: Uninit
  if (!cfg.XfrmInitializedState) {
    sim.rteReturnCode = 0x88;
    sim.rteReturnLabel = 'RTE_E_HARD_ERR (UNINIT)';
    sim.chainFsmState = 'ABORTED_0x88';
    sim.lastErrorModule = e2eOn ? 'E2EXf' : modName;
    reportDetError(sim, cfg, false, sim.lastErrorModule, e2eOn ? 176 : modId, 0x04, 'XFRM_E_UNINIT', 0x01);
    sim.activeSvgModules = ['RTE', sim.lastErrorModule, 'Det'];
    sim.activeSvgPaths = [`path_RTE_${sim.lastErrorModule}`, 'path_RTE_Det'];
    updatePipelineVisual(sim, cfg, 'RX', { aborted: true });
    syncRegistersFromState(sim, cfg);
    return;
  }

  // DET Check 2: NULL_PTR
  if (cfg.PassNullPtrOrUninitForDetTest) {
    sim.rteReturnCode = 0x88;
    sim.rteReturnLabel = 'DET PARAM_POINTER (0x04)';
    sim.chainFsmState = 'ABORTED_0x88';
    sim.lastErrorModule = e2eOn ? 'E2EXf' : modName;
    reportDetError(sim, cfg, false, sim.lastErrorModule, e2eOn ? 176 : modId, 0x04, 'XFRM_E_PARAM_POINTER', 0x04);
    sim.activeSvgModules = ['RTE', sim.lastErrorModule, 'Det'];
    sim.activeSvgPaths = [`path_RTE_${sim.lastErrorModule}`, 'path_RTE_Det'];
    updatePipelineVisual(sim, cfg, 'RX', { aborted: true });
    syncRegistersFromState(sim, cfg);
    return;
  }

  // Simulate new incoming Rx frame counter shift if CounterFaultMode active
  const anyUserCorrupt = sim.bufferBytes.some(b => b.corrupt);
  let abortAtE2e = false;

  if (e2eOn) {
    sim.chainFsmState = 'RX_E2E_CHECK';
    const e2eHdrLen = e2eMeta.headerBytes;
    const truncated = cfg.InjectTruncatedBufferBytes || sim.bufferBytes.length < e2eHdrLen;
    const crcBad = cfg.InjectE2ECrcCorruption || anyUserCorrupt;

    // Determine Counter Delta
    let curCnt = sim.txCounter;
    if (cfg.InjectE2ECounterFaultMode === 'REPEATED_DELTA_0') {
      if (sim.lastRxCounter < 0) sim.lastRxCounter = curCnt;
    } else if (cfg.InjectE2ECounterFaultMode === 'JUMP_SEQ_PLUS_5') {
      if (sim.lastRxCounter < 0) sim.lastRxCounter = (curCnt - 5) & 0xFF;
    } else {
      if (sim.lastRxCounter === curCnt) curCnt = (curCnt + 1) & 0xFF;
      sim.txCounter = curCnt;
    }

    const delta = sim.lastRxCounter < 0 ? 1 : ((curCnt - sim.lastRxCounter) & 0xFF);
    sim.e2eDeltaCounter = delta;

    if (crcBad || truncated) {
      sim.e2eCheckStatus = 0x30; // E2E_P_ERROR
    } else if (delta === 0) {
      sim.e2eCheckStatus = 0x10; // E2E_P_REPEATED
    } else if (delta > Number(cfg.E2EXfMaxDeltaCounter)) {
      sim.e2eCheckStatus = 0x20; // E2E_P_WRONGSEQUENCE
    } else {
      sim.e2eCheckStatus = 0x00; // E2E_P_OK
      sim.lastRxCounter = curCnt;
    }

    // Update E2E_SMCheck() Sliding Window
    if (sim.e2eCheckStatus === 0x00) {
      sim.e2eOkCount += 1;
      sim.e2eErrCount = Math.max(0, sim.e2eErrCount - 1);
      sim.e2eWindowHistory.push('OK');
      if (sim.e2eWindowHistory.length > 8) sim.e2eWindowHistory.shift();

      if (sim.e2eOkCount >= Number(cfg.E2EXfMinOkStateValid)) {
        sim.e2eSmState = 'E2E_SM_VALID';
        sim.e2eSmStateNibble = 0x00;
      } else {
        sim.e2eSmState = 'E2E_SM_INIT';
        sim.e2eSmStateNibble = 0x02;
      }
    } else {
      sim.e2eErrCount += 1;
      sim.e2eWindowHistory.push('ERR');
      if (sim.e2eWindowHistory.length > 8) sim.e2eWindowHistory.shift();

      if (sim.e2eErrCount > Number(cfg.E2EXfMaxErrorStateValid) || !cfg.RteForwardSoftErrorToSwc) {
        sim.e2eSmState = 'E2E_SM_INVALID';
        sim.e2eSmStateNibble = 0x03;
      } else {
        // Stay VALID during Soft Error tolerance window
        if (sim.e2eSmState === 'E2E_SM_NODATA' || sim.e2eSmState === 'E2E_SM_DEINIT') {
          sim.e2eSmState = 'E2E_SM_INIT';
          sim.e2eSmStateNibble = 0x02;
        } else {
          sim.e2eSmState = 'E2E_SM_VALID';
          sim.e2eSmStateNibble = 0x00;
        }
      }
    }

    // Build 2-Nibble Return Code [High:CheckStatus | Low:SMState] + Bit 7 Hard Error
    const highNib = sim.e2eCheckStatus & 0x70;
    const isHardBit7 = (sim.e2eSmState === 'E2E_SM_INVALID') ? 0x80 : 0x00;
    sim.e2eRawReturnByte = (isHardBit7 | highNib | sim.e2eSmStateNibble) & 0xFF;

    const chkMeta = E2E_CHECK_STATUS_MAP[sim.e2eCheckStatus] || { name: 'E2E_P_UNKNOWN' };
    addTrace(
      sim,
      'E2EXf',
      176,
      `E2EXf_Inv_${e2eProf}(out, &outLen, buf, ${sim.bufferBytes.length})`,
      `${chkMeta.name} (Δ=${delta}) | ${sim.e2eSmState}`,
      `0x${toHex2(sim.e2eRawReturnByte)}`,
      isHardBit7 ? 'err' : (highNib ? 'warn' : 'ok'),
      isHardBit7 ? 'Bit 7 = 1 -> ÉP RTE NGẮT CHUỖI (Abort Chain!)' : (highNib ? 'Bit 7 = 0 -> Soft Error (Cho phép đi tiếp kèm 0x8A)' : 'E2E Toàn vẹn')
    );

    if (isHardBit7) {
      abortAtE2e = true;
      sim.rteReturnCode = 0x88;
      sim.rteReturnLabel = 'RTE_E_HARD_TRANSFORMER_ERROR (0x88)';
      sim.chainFsmState = 'ABORTED_0x88';
      sim.lastErrorModule = 'E2EXf';
      sim.decodedSummary = 'BỊ CHẶN TẠI E2EXf_Inv (0x88)';
      sim.activeSvgModules = [transportMod, 'E2EXf', 'RTE'];
      sim.activeSvgPaths = [`path_${transportMod}_BusIf`, someIp ? 'path_E2EXf_LdCom' : 'path_E2EXf_Com', 'path_RTE_E2EXf'];
      sim.stepExplanation = {
        title: `NGẮT CHUỖI KHẨN CẤP (Abort Chain) Tại Step 1: E2EXf_Inv ➔ 0x88`,
        summary: `E2EXf_Inv phát hiện ${chkMeta.name} vượt quá MaxErrorStateValid (${sim.e2eErrCount} > ${cfg.E2EXfMaxErrorStateValid}), đưa cửa sổ về E2E_SM_INVALID và bật Bit 7 = 1 (0x${toHex2(sim.e2eRawReturnByte)}).`,
        inputSrc: `${transportMod} giao Buffer ${sim.bufferBytes.length}B`,
        processDesc: `E2E_PxxCheck() ➔ ${chkMeta.name} | E2E_SMCheck() ➔ E2E_SM_INVALID. RTE thấy Bit 7 = 1 nên KHÔNG GỌI ${modName}_Inv!`,
        outputDst: `RTE trả RTE_E_HARD_TRANSFORMER_ERROR (0x88) về SWC, bảo toàn biến cũ.`,
        bitDiff: `Reg A: HARD_ERR_B7=1, SM_INVALID=1, E2E Raw=0x${toHex2(sim.e2eRawReturnByte)}`,
        alert: `Chứng minh quy tắc vàng: E2EXf_Inv LUÔN chạy trước ${modName}_Inv trên chiều Rx!`
      };
      updatePipelineVisual(sim, cfg, 'RX', { aborted: true });
      syncRegistersFromState(sim, cfg);
      return;
    }
  } else {
    sim.e2eCheckStatus = 0x00;
    sim.e2eSmState = 'E2E_SM_VALID';
    sim.e2eSmStateNibble = 0x00;
    sim.e2eRawReturnByte = 0x00;
  }

  // Step 2: Deserializer (ComXf_Inv or SomeIpXf_Inv)
  sim.chainFsmState = 'RX_DESERIALIZE';
  const payloadStart = e2eOn ? e2eMeta.headerBytes : 0;
  const rxSlice = sim.bufferBytes.slice(payloadStart);

  if (!someIp) {
    // ComXf_Inv
    const bigEnd = cfg.ComXfSignalEndianness === 'BIG_ENDIAN';
    const b0 = rxSlice[0] ? rxSlice[0].byte : 0;
    const b1 = rxSlice[1] ? rxSlice[1].byte : 0;
    const b2 = rxSlice[2] ? rxSlice[2].byte : 0;
    const b3 = rxSlice[3] ? rxSlice[3].byte : 0;
    const b4 = rxSlice[4] ? rxSlice[4].byte : 0;

    const spd = bigEnd ? ((b0 << 8) | b1) : ((b1 << 8) | b0);
    let steerU16 = bigEnd ? ((b2 << 8) | b3) : ((b3 << 8) | b2);
    const steerSigned = (steerU16 & 0x8000) ? (steerU16 - 0x10000) : steerU16;
    const gear = b4 & 0x0F;

    sim.decodedSummary = `Spd=${spd}, Steer=${steerSigned}, Gear=${gear}`;
    const softWarn = e2eOn && (sim.e2eRawReturnByte & 0x70) !== 0;
    sim.rteReturnCode = softWarn ? 0x8A : 0x00;
    sim.rteReturnLabel = softWarn ? 'RTE_E_SOFT_TRANSFORMER_ERROR (0x8A)' : 'RTE_E_OK (0x00)';
    sim.chainFsmState = softWarn ? 'SOFT_0x8A' : 'DONE';

    addTrace(sim, 'ComXf', 175, `ComXf_Inv_BrakeGrp(&data, &buf[${payloadStart}], ${rxSlice.length})`, `Endian=${cfg.ComXfSignalEndianness}`, '0x00 E_OK', softWarn ? 'warn' : 'ok', `Khôi phục ${sim.decodedSummary} (SignExt sint16 chuẩn)`);
    sim.activeSvgModules = ['Com', ...(e2eOn ? ['E2EXf'] : []), 'ComXf', 'RTE', 'SWC'];
    sim.activeSvgPaths = ['path_ComXf_Com', 'path_RTE_ComXf', 'path_SWC_RTE'];

    sim.stepExplanation = {
      title: softWarn ? `Rx Thành Công Kèm SOFT ERROR (0x8A): ${sim.decodedSummary}` : `Rx Inverse Hoàn Tất (RTE_E_OK 0x00): ${sim.decodedSummary}`,
      summary: softWarn
        ? `E2EXf_Inv trả về 0x${toHex2(sim.e2eRawReturnByte)} (Bit 7 = 0 nên chưa sập SM_INVALID!). RTE vẫn gọi ComXf_Inv và giao struct kèm mã cảnh báo 0x8A.`
        : `Chuỗi nghịch đảo ${e2eOn ? 'E2EXf_Inv ➔ ' : ''}ComXf_Inv giải nén đúng Speed, SteerAngle âm (bù 2) và Gear về cho SWC.`,
      inputSrc: `Com_ReceiveSignalGroupArray() (${sim.bufferBytes.length}B)`,
      processDesc: `${e2eOn ? 'Step 1: E2EXf_Inv OK -> ' : ''}Step 2: ComXf_Inv đọc từ Offset ${payloadStart}, áp dụng SignExtension cho sint16.`,
      outputDst: `Rte_Read() trả Struct { ${sim.decodedSummary} } về SWC (${sim.rteReturnLabel})`,
      bitDiff: `Reg A = 0x${toHex2(sim.regAReturnErrByte)} | E2E Raw = 0x${toHex2(sim.e2eRawReturnByte)}`,
      alert: softWarn ? 'Cảnh báo Soft Error (0x8A): Thêm 1 lỗi liên tiếp nữa E2E_SMCheck sẽ sập xuống Hard Error (0x88)!' : ''
    };
  } else {
    // SomeIpXf_Inv checks header & truncation
    const headerFault = cfg.InjectSomeIpHeaderFault || 'NONE';
    if (cfg.InjectTruncatedBufferBytes || rxSlice.length < 8) {
      sim.rteReturnCode = 0x89;
      sim.rteReturnLabel = 'E_SER_MALFORMED_MESSAGE (0x89)';
      sim.chainFsmState = 'ABORTED_0x88';
      sim.lastErrorModule = 'SomeIpXf';
      sim.decodedSummary = 'MALFORMED (0x89)';
      reportDetError(sim, cfg, true, 'SomeIpXf', 174, 0x04, 'XFRM_E_MALFORMED_MESSAGE', 0x05);
      addTrace(sim, 'SomeIpXf', 174, `SomeIpXf_Inv(&out, buf, ${rxSlice.length})`, 'Length < Expected', '0x89 MALFORMED', 'err', 'DET Runtime 0x05 + Hủy Deserializer');
      sim.activeSvgModules = ['LdCom', 'SomeIpXf', 'RTE', 'Det'];
      sim.activeSvgPaths = ['path_SomeIpXf_LdCom', 'path_RTE_SomeIpXf', 'path_RTE_Det'];
      updatePipelineVisual(sim, cfg, 'RX', { aborted: true });
      syncRegistersFromState(sim, cfg);
      return;
    }

    if (headerFault === 'WRONG_PROTOCOL_VER' || (rxSlice[4] && rxSlice[4].byte !== 0x01)) {
      sim.rteReturnCode = 0x87;
      sim.rteReturnLabel = 'E_SER_WRONG_PROTOCOL_VERSION (0x87)';
      sim.chainFsmState = 'ABORTED_0x88';
      sim.lastErrorModule = 'SomeIpXf';
      sim.decodedSummary = 'ERR ProtoVer (0x87)';
      addTrace(sim, 'SomeIpXf', 174, 'SomeIpXf_Inv(...)', `ProtoVer != 0x01`, '0x87 HARD ERR', 'err', 'Ngắt chuỗi do sai SOME/IP ProtocolVersion');
      sim.activeSvgModules = ['LdCom', 'SomeIpXf', 'RTE'];
      sim.activeSvgPaths = ['path_SomeIpXf_LdCom', 'path_RTE_SomeIpXf'];
      updatePipelineVisual(sim, cfg, 'RX', { aborted: true });
      syncRegistersFromState(sim, cfg);
      return;
    }

    if (headerFault === 'WRONG_INTERFACE_VER') {
      sim.rteReturnCode = 0x88;
      sim.rteReturnLabel = 'E_SER_WRONG_INTERFACE_VERSION (0x88)';
      sim.chainFsmState = 'ABORTED_0x88';
      sim.lastErrorModule = 'SomeIpXf';
      sim.decodedSummary = 'ERR IfVer (0x88)';
      addTrace(sim, 'SomeIpXf', 174, 'SomeIpXf_Inv(...)', 'InterfaceVer Mismatch', '0x88 HARD ERR', 'err', 'Ngắt chuỗi do sai Interface Major Version');
      updatePipelineVisual(sim, cfg, 'RX', { aborted: true });
      syncRegistersFromState(sim, cfg);
      return;
    }

    if (headerFault === 'WRONG_MESSAGE_TYPE') {
      sim.rteReturnCode = 0x8A;
      sim.rteReturnLabel = 'E_SER_WRONG_MESSAGE_TYPE (0x8A)';
      sim.chainFsmState = 'ABORTED_0x88';
      sim.lastErrorModule = 'SomeIpXf';
      sim.decodedSummary = 'ERR MsgType (0x8A)';
      addTrace(sim, 'SomeIpXf', 174, 'SomeIpXf_Inv(...)', 'MessageType Invalid', '0x8A SER ERR', 'err', 'Sai loại bản tin SOME/IP');
      updatePipelineVisual(sim, cfg, 'RX', { aborted: true });
      syncRegistersFromState(sim, cfg);
      return;
    }

    const msgType = rxSlice[6] ? rxSlice[6].byte : getMsgTypeByte(cfg);
    if (msgType === 0x81) {
      // Server Application Error!
      const appCode = rxSlice[7] ? rxSlice[7].byte : 0x01;
      sim.rteReturnCode = appCode;
      sim.rteReturnLabel = `AppError (0x${toHex2(appCode)})`;
      sim.chainFsmState = 'APP_ERR_0x81';
      sim.decodedSummary = `AppError=0x${toHex2(appCode)} (Bỏ qua OUT params)`;
      addTrace(sim, 'SomeIpXf', 174, 'SomeIpXf_ExtractProtocolHeaderFields()', `MsgType=0x81 ERROR, Ret=0x${toHex2(appCode)}`, '0x00 E_OK', 'warn', 'RTE không gọi giải mã OUT; giao thẳng Application Error cho SWC');
      sim.activeSvgModules = ['LdCom', 'SomeIpXf', 'RTE', 'SWC'];
      sim.activeSvgPaths = ['path_SomeIpXf_LdCom', 'path_RTE_SomeIpXf', 'path_SWC_RTE'];
      updatePipelineVisual(sim, cfg, 'RX', { aborted: false });
      syncRegistersFromState(sim, cfg);
      return;
    }

    // TLV Unknown Tag Check
    if (cfg.SomeIpXfEnableTlvEncoding && cfg.SomeIpXfUnrecognizedTlvBehavior === 'REPORT_MALFORMED_HARD_ERR') {
      sim.rteReturnCode = 0x89;
      sim.rteReturnLabel = 'E_SER_MALFORMED_MESSAGE (Unknown TLV 0x0003)';
      sim.chainFsmState = 'ABORTED_0x88';
      sim.lastErrorModule = 'SomeIpXf';
      sim.decodedSummary = 'Reject Unknown Tag 0x0003';
      reportDetError(sim, cfg, true, 'SomeIpXf', 174, 0x04, 'XFRM_E_MALFORMED_MESSAGE', 0x05);
      addTrace(sim, 'SomeIpXf', 174, 'SomeIpXf_Inv_TLV(...)', 'Tag 0x0003 Unknown & HardErr Enabled', '0x89 MALFORMED', 'err', 'Từ chối Tag lạ theo cấu hình');
      updatePipelineVisual(sim, cfg, 'RX', { aborted: true });
      syncRegistersFromState(sim, cfg);
      return;
    }

    const softWarn = e2eOn && (sim.e2eRawReturnByte & 0x70) !== 0;
    sim.rteReturnCode = softWarn ? 0x8A : 0x00;
    sim.rteReturnLabel = softWarn ? 'RTE_E_SOFT_TRANSFORMER_ERROR (0x8A)' : 'RTE_E_OK (0x00)';
    sim.chainFsmState = softWarn ? 'SOFT_0x8A' : 'DONE';
    sim.decodedSummary = cfg.SomeIpXfEnableTlvEncoding
      ? `TLV OK (Skip Tag 0x0003 via WireType)`
      : `8B Hdr + ${cfg.SomeIpXfDynamicArrayElementCount} RadarObj`;

    addTrace(sim, 'SomeIpXf', 174, `SomeIpXf_Inv(&out, &buf[${payloadStart}], ${rxSlice.length})`, `MsgType=0x${toHex2(msgType)}`, '0x00 E_OK', softWarn ? 'warn' : 'ok', sim.decodedSummary);
    sim.activeSvgModules = ['LdCom', ...(e2eOn ? ['E2EXf'] : []), 'SomeIpXf', 'RTE', 'SWC'];
    sim.activeSvgPaths = ['path_SomeIpXf_LdCom', 'path_RTE_SomeIpXf', 'path_SWC_RTE'];

    sim.stepExplanation = {
      title: softWarn ? `Rx SomeIpXf Thành Công Kèm SOFT ERROR (0x8A)` : `Rx SomeIpXf Inverse Thành Công (RTE_E_OK 0x00)`,
      summary: cfg.SomeIpXfEnableTlvEncoding
        ? `SomeIpXf_Inv giải mã Tag 0x0001/0x0002 và dùng 3-bit WireType để NHẢY QUA AN TOÀN thẻ lạ 0x0003 từ V2 ECU!`
        : `SomeIpXf_Inv đọc 8B Header, kiểm tra ProtoVer=0x01/IfVer=0x01, đọc LengthField và phục hồi ${cfg.SomeIpXfDynamicArrayElementCount} phần tử.`,
      inputSrc: `Rte_LdComCbkRxIndication() (${sim.bufferBytes.length}B)`,
      processDesc: `${e2eOn ? 'Step 1: E2EXf_Inv xác thực an toàn -> ' : ''}Step 2: SomeIpXf_Inv giải mã từ Offset ${payloadStart}.`,
      outputDst: `SWC nhận Struct (${sim.decodedSummary})`,
      bitDiff: `Reg A = 0x${toHex2(sim.regAReturnErrByte)} | Reg B = 0x${toHex2(sim.regBChainPipeByte)}`,
      alert: ''
    };
  }

  updatePipelineVisual(sim, cfg, 'RX', { aborted: false });
  syncRegistersFromState(sim, cfg);
}

// -------------------- ExtractProtocolHeaderFields --------------------
function executeExtractProtocolHeader(sim, cfg) {
  advanceClock(sim, 3);
  if (sim.bufferBytes.length === 0) executeTxForward(sim, cfg, { keepCounter: true });

  const e2eOn = getEffectiveE2eProfile(cfg) !== 'NONE';
  const offset = e2eOn ? E2E_PROFILES_META[getEffectiveE2eProfile(cfg)].headerBytes : 0;
  const slice = sim.bufferBytes.slice(offset);

  sim.lastChainDir = 'EXTRACT';
  if (cfg.InjectTruncatedBufferBytes || slice.length < 8) {
    sim.rteReturnCode = 0x89;
    sim.rteReturnLabel = 'E_SER_MALFORMED_MESSAGE (0x89)';
    sim.chainFsmState = 'ABORTED_0x88';
    sim.lastErrorModule = 'SomeIpXf';
    sim.someIpExtractResult = { valid: false, ret: '0x89 E_SER_MALFORMED_MESSAGE', branch: 'ABORT (Len < 8B)' };
    reportDetError(sim, cfg, true, 'SomeIpXf', 174, 0x05, 'XFRM_E_MALFORMED_MESSAGE', 0x05);
    addTrace(sim, 'SomeIpXf', 174, `SomeIpXf_ExtractProtocolHeaderFields(&buf[${offset}], ${slice.length}, &type, &res)`, 'Short Buffer (<8B)', '0x89 MALFORMED', 'err', 'Không đủ 8B SOME/IP Header!');
  } else if (cfg.InjectSomeIpHeaderFault === 'WRONG_PROTOCOL_VER') {
    sim.rteReturnCode = 0x87;
    sim.rteReturnLabel = 'E_SER_WRONG_PROTOCOL_VERSION (0x87)';
    sim.chainFsmState = 'ABORTED_0x88';
    sim.someIpExtractResult = { valid: false, ret: '0x87 WRONG_PROTO_VER', branch: 'ABORT trước Deserializer' };
    addTrace(sim, 'SomeIpXf', 174, 'SomeIpXf_ExtractProtocolHeaderFields(...)', 'ProtoVer != 0x01', '0x87 HARD ERR', 'err', 'Bắt lỗi ProtocolVersion ngay ở ExtractHeader');
  } else {
    const msgByte = getMsgTypeByte(cfg);
    const retByte = msgByte === 0x81 ? (sim.serverAppErrCode || 0x01) : 0x00;
    let branchDesc = 'Gọi SomeIpXf_Inv_Notify() (Event)';
    if (msgByte === 0x00) branchDesc = 'Gọi SomeIpXf_Inv_Req() -> Đánh thức Server Runnable';
    else if (msgByte === 0x80) branchDesc = 'Khớp SessionId -> Giải mã tham số OUT về Client SWC';
    else if (msgByte === 0x81) branchDesc = 'PHÁT HIỆN ERROR (0x81): BỎ QUA OUT Params, trả AppError về Client!';

    sim.rteReturnCode = 0x00;
    sim.rteReturnLabel = 'ExtractHdr: E_OK (0x00)';
    sim.chainFsmState = 'RX_E2E_CHECK';
    sim.someIpExtractResult = {
      valid: true,
      msgTypeHex: `0x${toHex2(msgByte)}`,
      msgTypeName: cfg.SomeIpXfMessageType,
      retCodeHex: `0x${toHex2(retByte)}`,
      branch: branchDesc
    };
    addTrace(sim, 'SomeIpXf', 174, `SomeIpXf_ExtractProtocolHeaderFields(buf, ${slice.length}, &msgType, &msgRes)`, `MsgType=0x${toHex2(msgByte)}, Ret=0x${toHex2(retByte)}`, 'E_OK (0x00)', 'ok', branchDesc);
  }

  sim.stepExplanation = {
    title: 'SomeIpXf_ExtractProtocolHeaderFields() — Phân Luồng Nhanh Tại RTE (SWS_SomeIpXf_00171)',
    summary: 'Hàm đặc thù của SomeIpXf giúp RTE đọc trước Byte 6 (MessageType) và Byte 7 (ReturnCode) trước khi gọi Deserializer.',
    inputSrc: `Luồng byte tại Offset ${offset} (${slice.length}B)`,
    processDesc: sim.someIpExtractResult ? sim.someIpExtractResult.branch : 'Đọc 8B Header',
    outputDst: 'RTE chuyển luồng tới Request / Response / AppError handler tương ứng',
    bitDiff: `Reg A = 0x${toHex2(sim.regAReturnErrByte)}`,
    alert: ''
  };
  sim.activeSvgModules = ['LdCom', 'SomeIpXf', 'RTE'];
  sim.activeSvgPaths = ['path_SomeIpXf_LdCom', 'path_RTE_SomeIpXf'];
  updatePipelineVisual(sim, cfg, 'RX', { aborted: sim.rteReturnCode !== 0x00 });
  syncRegistersFromState(sim, cfg);
}

// -------------------- Dynamic C Code & ARXML / JSON Generators --------------------
function generateLiveCCode(sim, cfg) {
  const someIp = isSomeIpPreset(cfg);
  const e2eProf = getEffectiveE2eProfile(cfg);
  const e2eOn = e2eProf !== 'NONE';
  const inPlace = cfg.XfrmBufferComputationMode === 'IN_PLACE';
  const hdrShift = (e2eOn && inPlace) ? E2E_PROFILES_META[e2eProf].headerBytes : 0;

  if (!someIp) {
    return `/* ===== AUTOSAR RTE + ComXf (#175)${e2eOn ? ' + E2EXf (#176)' : ''} Generated Glue Code ===== */
Std_ReturnType Rte_Write_PpBrake_Status(const BrakeStatus_t* data) {
  uint8 Rte_XfrmBuf[${cfg.XfrmAllocatedRteBufferSize}]; /* Mode: ${cfg.XfrmBufferComputationMode}, HeaderShift: ${hdrShift}B */
  ${!inPlace && e2eOn ? 'uint8 Rte_BufStage1[16]; /* OUT_OF_PLACE: can memcpy! */\n  ' : ''}uint16 outLen1 = 0, outLen2 = 0;
  Std_ReturnType ret;

  /* Step 1 (Tx Forward): ComXf SignalGroup Packing (${cfg.ComXfSignalEndianness}, Fill=${cfg.ComXfUnusedBitFillPatternHex}) */
  ret = ComXf_Tx_BrakeGrp(${inPlace ? `&Rte_XfrmBuf[${hdrShift}]` : (e2eOn ? 'Rte_BufStage1' : 'Rte_XfrmBuf')}, &outLen1, data);
  if ((ret & 0x80U) != 0U) { return RTE_E_HARD_TRANSFORMER_ERROR; /* 0x88 */ }

${e2eOn ? `  /* Step 2 (Tx Forward): E2EXf ${e2eProf} Protection (${hdrShift || E2E_PROFILES_META[e2eProf].headerBytes}B Header, DataID=${cfg.E2EXfDataIdHex}) */
  ret = E2EXf_Tx_Brake_${e2eProf}(Rte_XfrmBuf, &outLen2, ${inPlace ? `&Rte_XfrmBuf[${hdrShift}]` : 'Rte_BufStage1'}, outLen1);
` : '  outLen2 = outLen1;\n'}
  /* Push monolithic array to AUTOSAR COM */
  return ${cfg.ComSendSignalGroupArrayEnable ? 'Com_SendSignalGroupArray(ComConf_ComSignalGroup_Brake, Rte_XfrmBuf)' : 'Com_SendSignal(...)'};
}

/* ----- Chiều Nhận Rx (Đảo ngược thứ tự: E2EXf_Inv TRƯỚC -> ComXf_Inv SAU!) ----- */
Std_ReturnType Rte_Read_RpBrake_Status(BrakeStatus_t* outData) {
  uint8 rxBuf[${cfg.XfrmAllocatedRteBufferSize}], cleanBuf[${cfg.XfrmAllocatedRteBufferSize}];
  uint16 cleanLen = 0; Std_ReturnType xfrmRet = RTE_E_OK;
  (void)Com_ReceiveSignalGroupArray(ComConf_ComSignalGroup_Brake, rxBuf);
${e2eOn ? `
  /* Rx Step 1: E2EXf_Inv -> 2-Nibble [High:Check | Low:SM] (Hiện tại: 0x${toHex2(sim.e2eRawReturnByte)}) */
  uint8 e2eRet = E2EXf_Inv_Brake_${e2eProf}(cleanBuf, &cleanLen, rxBuf, sizeof(rxBuf));
  if ((e2eRet & 0x80U) != 0U) {
    return RTE_E_HARD_TRANSFORMER_ERROR; /* 0x88 ABORT CHAIN! Không gọi ComXf_Inv */
  }
  if (e2eRet != 0x00U) { xfrmRet = RTE_E_SOFT_TRANSFORMER_ERROR; /* 0x8A */ }` : '  cleanLen = sizeof(rxBuf);'}
  /* Rx Step 2: ComXf_Inv khôi phục struct + SignExtension */
  (void)ComXf_Inv_BrakeGrp(outData, ${e2eOn ? 'cleanBuf' : 'rxBuf'}, cleanLen);
  return xfrmRet;
}`;
  } else {
    const [cliId, sesId] = parseHexPair(cfg.SomeIpXfClientAndSessionIdHex, 1, 7);
    return `/* ===== AUTOSAR RTE + SomeIpXf (#174)${e2eOn ? ' + E2EXf (#176)' : ''} + LdCom (#49) ===== */
Std_ReturnType Rte_Call_RpPlanner_Run(${cfg.SomeIpXfMessageType === 'REQUEST_0x00' ? 'const PathReq_t* in, PathResp_t* out' : 'const RadarObjList_t* radarList'}) {
  uint8 Rte_XfrmBuf[${cfg.XfrmAllocatedRteBufferSize}]; /* ${cfg.XfrmBufferComputationMode}, HeaderShift=${hdrShift}B */
  Rte_Cs_TransactionHandleType txHandle = { .clientId = 0x${toHex4(cliId)}, .sequenceCounter = 0x${toHex4(sesId)} };
  uint32 len1 = 0${e2eOn ? ', len2 = 0' : ''};
  PduInfoType pduInfo;

  /* Tx Step 1: SomeIpXf (8B Hdr + Align=${cfg.SomeIpXfStructAlignmentBytes}B + LenF=${cfg.SomeIpXfLengthFieldSize}B${cfg.SomeIpXfEnableTlvEncoding ? ' + TLV Tags' : ''}) */
  SomeIpXf_Tx_Msg(${inPlace ? `&Rte_XfrmBuf[${hdrShift}]` : 'buf1'}, &len1, ${cfg.SomeIpXfMessageType === 'REQUEST_0x00' ? '&txHandle, in' : 'radarList'});
${e2eOn ? `
  /* Tx Step 2: E2EXf ${e2eProf} (DataID=${cfg.E2EXfDataIdHex}) */
  E2EXf_Tx_Msg_${e2eProf}(Rte_XfrmBuf, &len2, &Rte_XfrmBuf[${hdrShift}], len1);
  pduInfo.SduLength = len2;` : '  pduInfo.SduLength = len1;'}
  pduInfo.SduDataPtr = Rte_XfrmBuf;
  return LdCom_Transmit(LdComConf_LdComIPdu_SomeIpTx, &pduInfo);
}

/* ----- Rx Dispatch với SomeIpXf_ExtractProtocolHeaderFields (SWS_SomeIpXf_00171) ----- */
void Rte_LdComCbkRxIndication(PduIdType id, const PduInfoType* PduInfoPtr) {
  Std_MessageTypeType msgType; Std_MessageResultType msgResult;
  ${e2eOn ? `uint8 e2eRet = E2EXf_Inv_${e2eProf}(cleanBuf, &cleanLen, PduInfoPtr->SduDataPtr, PduInfoPtr->SduLength);
  if (e2eRet & 0x80U) return; /* ABORT_0x88 trước Deserializer! */\n  ` : ''}if (SomeIpXf_ExtractProtocolHeaderFields(${e2eOn ? 'cleanBuf' : 'PduInfoPtr->SduDataPtr'}, len, &msgType, &msgResult) == E_OK) {
    if (msgType == STD_MESSAGETYPE_ERROR) { /* 0x81 */
      /* Bỏ qua OUT params -> giao thẳng Application Error code cho SWC */
    } else {
      SomeIpXf_Inv_Msg(&outData, ${e2eOn ? 'cleanBuf' : 'PduInfoPtr->SduDataPtr'}, len);
    }
  }
}`;
  }
}

function generateExportContent(tab, sim, cfg) {
  if (tab === 'json') {
    return JSON.stringify(cfg, null, 2);
  }
  if (tab === 'cfg_h') {
    const e2eProf = getEffectiveE2eProfile(cfg);
    return `#ifndef XFRM_CFG_H
#define XFRM_CFG_H

/* Generated by AUTOSAR Xfrm Simulator (ASWS R23-11) */
#define XFRM_DEV_ERROR_DETECT              (${cfg.XfrmDevErrorDetect ? 'STD_ON' : 'STD_OFF'})
#define XFRM_BUFFER_COMPUTATION_MODE       XFRM_BUF_${cfg.XfrmBufferComputationMode}
#define XFRM_ALLOCATED_RTE_BUF_SIZE        (${cfg.XfrmAllocatedRteBufferSize}U)
#define XFRM_E2E_HEADER_SHIFT_BYTES        (${getHeaderShiftBytes(cfg)}U)

/* ComXf (#175) Config */
#define COMXF_MODULE_ID                    (175U)
#define COMXF_SIGNAL_ENDIANNESS            COMXF_${cfg.ComXfSignalEndianness}
#define COMXF_UNUSED_BIT_FILL_PATTERN      (${cfg.ComXfUnusedBitFillPatternHex}U)
#define COM_SIGNAL_GROUP_ARRAY_ENABLE      (${cfg.ComSendSignalGroupArrayEnable ? 'STD_ON' : 'STD_OFF'})

/* SomeIpXf (#174) Config */
#define SOMEIPXF_MODULE_ID                 (174U)
#define SOMEIPXF_PROTOCOL_VERSION          (${cfg.SomeIpXfProtocolVersion}U)
#define SOMEIPXF_INTERFACE_VERSION         (${cfg.SomeIpXfInterfaceVersion}U)
#define SOMEIPXF_STRUCT_ALIGNMENT_BYTES    (${cfg.SomeIpXfStructAlignmentBytes}U)
#define SOMEIPXF_LENGTH_FIELD_SIZE         (${cfg.SomeIpXfLengthFieldSize}U)
#define SOMEIPXF_ENABLE_TLV_ENCODING       (${cfg.SomeIpXfEnableTlvEncoding ? 'STD_ON' : 'STD_OFF'})
#define SOMEIPXF_UNRECOGNIZED_TLV_BEHAVIOR SOMEIPXF_${cfg.SomeIpXfUnrecognizedTlvBehavior}

/* E2EXf (#176) Config */
#define E2EXF_MODULE_ID                    (176U)
#define E2EXF_ACTIVE_PROFILE               E2EXF_${e2eProf}
#define E2EXF_DATA_ID                      (${cfg.E2EXfDataIdHex}UL)
#define E2EXF_MAX_DELTA_COUNTER            (${cfg.E2EXfMaxDeltaCounter}U)
#define E2EXF_SM_MIN_OK_STATE_VALID        (${cfg.E2EXfMinOkStateValid}U)
#define E2EXF_SM_MAX_ERR_STATE_VALID       (${cfg.E2EXfMaxErrorStateValid}U)

#endif /* XFRM_CFG_H */`;
  }
  if (tab === 'rte_c') {
    return generateLiveCCode(sim, cfg);
  }
  // ARXML
  return `<?xml version="1.0" encoding="UTF-8"?>
<AUTOSAR xmlns="http://autosar.org/schema/r4.0">
  <AR-PACKAGES>
    <AR-PACKAGE>
      <SHORT-NAME>XfrmSimulatorConfig</SHORT-NAME>
      <ELEMENTS>
        <DATA-TRANSFORMATION>
          <SHORT-NAME>${cfg.ActiveTransformerChainPreset}</SHORT-NAME>
          <EXECUTE-DESPITE-DATA-UNAVAILABILITY>true</EXECUTE-DESPITE-DATA-UNAVAILABILITY>
          <BUFFER-COMPUTATION>${cfg.XfrmBufferComputationMode}</BUFFER-COMPUTATION>
          <TRANSFORMER-CHAIN-REFS>
            <TRANSFORMER-REF>${isSomeIpPreset(cfg) ? 'SomeIpXf_Transf' : 'ComXf_Transf'}</TRANSFORMER-REF>
            ${getEffectiveE2eProfile(cfg) !== 'NONE' ? `<TRANSFORMER-REF>E2EXf_${getEffectiveE2eProfile(cfg)}</TRANSFORMER-REF>` : ''}
          </TRANSFORMER-CHAIN-REFS>
        </DATA-TRANSFORMATION>
        <ECUC-MODULE-CONFIGURATION-VALUES>
          <SHORT-NAME>XfrmModuleValues</SHORT-NAME>
          <PARAMETER-VALUES>
            <ECUC-BOOLEAN-PARAM-VALUE><SHORT-NAME>XfrmDevErrorDetect</SHORT-NAME><VALUE>${cfg.XfrmDevErrorDetect}</VALUE></ECUC-BOOLEAN-PARAM-VALUE>
            <ECUC-TEXTUAL-PARAM-VALUE><SHORT-NAME>ComXfSignalEndianness</SHORT-NAME><VALUE>${cfg.ComXfSignalEndianness}</VALUE></ECUC-TEXTUAL-PARAM-VALUE>
            <ECUC-NUMERICAL-PARAM-VALUE><SHORT-NAME>SomeIpXfLengthFieldSize</SHORT-NAME><VALUE>${cfg.SomeIpXfLengthFieldSize}</VALUE></ECUC-NUMERICAL-PARAM-VALUE>
            <ECUC-TEXTUAL-PARAM-VALUE><SHORT-NAME>E2EXfActiveProfile</SHORT-NAME><VALUE>${cfg.E2EXfActiveProfile}</VALUE></ECUC-TEXTUAL-PARAM-VALUE>
          </PARAMETER-VALUES>
        </ECUC-MODULE-CONFIGURATION-VALUES>
      </ELEMENTS>
    </AR-PACKAGE>
  </AR-PACKAGES>
</AUTOSAR>`;
}
