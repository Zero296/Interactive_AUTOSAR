// ================= PART 3: CONSTANTS, BITFIELDS, TX/RX PDUS, 36 CONFIG TOOLTIPS, MODULE INFO & GLOSSARY =================

const CANIF_CTRL_PDU_BITS = [
  { bit: 7, mask: 0x80, tag: "CS_START",  name: "CS_STARTED",   tone: "ok",   desc: "Bit 7 = 1 khi CAN Controller hiện tại ở trạng thái CAN_CS_STARTED (0x02) — điều kiện tiên quyết để giao tiếp bus CAN (SWS_CanIf_00308)." },
  { bit: 6, mask: 0x40, tag: "CS_SLEEP",  name: "CS_SLEEP",     tone: "pur",  desc: "Bit 6 = 1 khi CAN Controller ở trạng thái ngủ CAN_CS_SLEEP (0x03). Khi B7=0 & B6=0 là CAN_CS_STOPPED (hoặc UNINIT)." },
  { bit: 5, mask: 0x20, tag: "PDU_ONLN",  name: "PDU_ONLINE",   tone: "ok",   desc: "Bit 5 = 1 khi cổng PDU ở CANIF_ONLINE (0x03): Mở thông suốt cả chiều truyền Tx lẫn chiều nhận Rx (SWS_CanIf_00008)." },
  { bit: 4, mask: 0x10, tag: "TX_O_ACT",  name: "TX_OFF_ACTV",  tone: "warn", desc: "Bit 4 = 1 khi ở CANIF_TX_OFFLINE_ACTIVE (0x02 — ECU Passive Mode): Không gọi Can_Write() ra bus, nhưng bắn ngay User_TxConfirmation() ảo lên tầng trên (SWS_CanIf_00072)." },
  { bit: 3, mask: 0x08, tag: "TX_OFFLN",  name: "TX_OFFLINE",   tone: "err",  desc: "Bit 3 = 1 khi đường truyền Tx ra bus bị khóa bởi CANIF_TX_OFFLINE (0x01) hoặc CANIF_OFFLINE (0x00) (Bus-Off / SilentCom / Wakeup Validation)." },
  { bit: 2, mask: 0x04, tag: "PN_FILT",   name: "PN_TX_FILT",   tone: "pur",  desc: "Bit 2 = 1 khi bộ lọc truyền Partial Networking (CanIfPnFilter) đang kích hoạt: Chỉ cho phép TxPdu có CanIfTxPduPnFilterPdu=TRUE đi qua (SWS_CanIf_00750)." },
  { bit: 1, mask: 0x02, tag: "TX_NOTF",   name: "TX_NOTF",      tone: "cyan", desc: "Bit 1 biểu diễn CanIf_GetTxConfirmationState(): 1 = CANIF_TX_RX_NOTIFICATION (đã truyền thành công >=1 khung); reset về 0 khi STOPPED/Bus-Off (SWS_CanIf_00734)." },
  { bit: 0, mask: 0x01, tag: "WKUP_VAL",  name: "WKUP_VALID",   tone: "cyan", desc: "Bit 0 = 1 khi sau sự kiện Wakeup đã nhận >=1 khung CAN hợp lệ qua CanIf_RxIndication(), giúp CanIf_CheckValidation() báo EcuM_ValidateWakeupEvent() (SWS_CanIf_00179)." }
];

const CANIF_FRAME_BUF_BITS = [
  { bit: 7, mask: 0x80, tag: "EXT_B31",   name: "ID_EXT_B31",   tone: "pur",  desc: "Bit 31 (MSB) của Can_IdType (SWS_Can_00416): 1 = Extended 29-bit CAN ID (0x80000000); 0 = Standard 11-bit CAN ID." },
  { bit: 6, mask: 0x40, tag: "FD_B30",    name: "FD_MODE_B30",  tone: "cyan", desc: "Bit 30 của Can_IdType (SWS_Can_00416): 1 = CAN FD Frame lên tới 64 Bytes + BRS (0x40000000); 0 = Classical CAN 2.0B (tối đa 8 Bytes)." },
  { bit: 5, mask: 0x20, tag: "BASIC_HOH", name: "BASIC_HOH",    tone: "warn", desc: "Bit 5 = 1 khi L-PDU đi qua BasicCAN HOH (Mailbox dùng chung M:1, bật CanIfTxBuffer/SwFilter). 0 = FullCAN HOH (Mailbox 1:1 chuyên biệt)." },
  { bit: 4, mask: 0x10, tag: "TX_BUF",    name: "TX_BUFFERED",  tone: "cyan", desc: "Bit 4 = 1 khi có L-PDU đang xếp hàng trong hàng đợi ưu tiên CanIfTxBuffer do Can_Write() trả về CAN_BUSY (SWS_CanIf_00381)." },
  { bit: 3, mask: 0x08, tag: "SW_FLT",    name: "SW_FLT_PASS",  tone: "ok",   desc: "Bit 3 = 1 trong luồng CanIf_RxIndication() khi CAN ID vượt qua thuật toán Software Acceptance Filter (Mask/BinarySearch) hoặc FullCAN." },
  { bit: 2, mask: 0x04, tag: "DLC_OK",    name: "DLC_CHK_OK",   tone: "ok",   desc: "Bit 2 = 1 khi độ dài khung nhận thỏa mãn CanDlc >= CanIfRxPduDataLength (CanIfPrivateDlcCheck). Nếu fail -> báo Runtime Error 0x32." },
  { bit: 1, mask: 0x02, tag: "UL_IND",    name: "UL_IND",       tone: "ok",   desc: "Bit 1 = 1 khi CanIf định tuyến thành công callback <User_RxIndication> hoặc <User_TxConfirmation> / <User_TriggerTransmit> lên tầng trên." },
  { bit: 0, mask: 0x01, tag: "DET_ERR",   name: "DET_ERR",      tone: "err",  desc: "Bit 0 = 1 khi CanIf bắt lỗi Development Error hoặc Runtime Error (CANIF_E_INVALID_DATA_LENGTH 0x32, TXPDU_LENGTH_EXCEEDED 0x33, DET IDs...)." }
];

const TX_PDUS = {
  "0": {
    txPduId: 0, name: "TxPdu_0_CanNm", ctrlId: 0, baseCanId: 0x500, idType: "STANDARD_CAN",
    hthId: "HTH_0", hthType: "FULL", ul: "CANNM", ulCbk: "CanNm_TxConfirmation",
    dlc: 8, maxLen: 8, pnFilterPdu: true, isDynamic: false, isTriggerTransmit: false,
    defaultPayload: "10 40 FF FF 00 00 00 00", desc: "Network Management PDU (FullCAN HTH_0, đi xuyên PN Filter)"
  },
  "1": {
    txPduId: 1, name: "TxPdu_1_ComBrake", ctrlId: 0, baseCanId: 0x100, idType: "STANDARD_CAN",
    hthId: "HTH_1", hthType: "BASIC", ul: "PDUR", ulCbk: "PduR_CanIfTxConfirmation",
    dlc: 8, maxLen: 8, pnFilterPdu: false, isDynamic: false, isTriggerTransmit: false,
    defaultPayload: "11 22 33 44 55 66 77 88", desc: "Com_BrakeTorque (Prio #1 cao nhất trên BasicCAN HTH_1)"
  },
  "2": {
    txPduId: 2, name: "TxPdu_2_ComSteerFD", ctrlId: 0, baseCanId: 0x120, idType: "STANDARD_FD_CAN",
    hthId: "HTH_1", hthType: "BASIC", ul: "PDUR", ulCbk: "PduR_CanIfTxConfirmation",
    dlc: 32, maxLen: 64, pnFilterPdu: false, isDynamic: false, isTriggerTransmit: false,
    defaultPayload: "AA BB CC DD 01 02 03 04 32B FD", desc: "Com_SteerAngleFD (CAN FD 32B + BRS, BasicCAN HTH_1)"
  },
  "3": {
    txPduId: 3, name: "TxPdu_3_CanTpDiag", ctrlId: 0, baseCanId: 0x7E8, idType: "STANDARD_CAN",
    hthId: "HTH_1", hthType: "BASIC", ul: "CANTP", ulCbk: "CanTp_TxConfirmation",
    dlc: 8, maxLen: 8, pnFilterPdu: false, isDynamic: false, isTriggerTransmit: false,
    defaultPayload: "06 50 03 00 32 01 F4 AA", desc: "CanTp UDS Diag Response (Prio thấp 0x7E8 trên BasicCAN HTH_1)"
  },
  "4": {
    txPduId: 4, name: "TxPdu_4_DynJ1939", ctrlId: 0, baseCanId: 0x18FF, idType: "EXTENDED_CAN",
    hthId: "HTH_1", hthType: "BASIC", ul: "PDUR", ulCbk: "PduR_CanIfTxConfirmation",
    dlc: 8, maxLen: 8, pnFilterPdu: false, isDynamic: true, isTriggerTransmit: false,
    defaultPayload: "FA FB FC FD 20 26 00 01", desc: "DYNAMIC Tx L-PDU (Hỗ trợ đổi CAN ID nóng qua CanIf_SetDynamicTxId)"
  },
  "5": {
    txPduId: 5, name: "TxPdu_5_TrigTx", ctrlId: 0, baseCanId: 0x280, idType: "STANDARD_CAN",
    hthId: "HTH_1", hthType: "BASIC", ul: "PDUR", ulCbk: "PduR_CanIfTxConfirmation",
    dlc: 8, maxLen: 8, pnFilterPdu: false, isDynamic: false, isTriggerTransmit: true,
    defaultPayload: "99 88 77 66 55 44 33 22", desc: "TriggerTransmit Tx L-PDU (Kéo dữ liệu tươi mới ngay sát giờ truyền)"
  }
};

const RX_PDUS = [
  {
    rxPduId: 0, name: "RxPdu_0_ComVehicleFD", ctrlId: 0, canId: 0x120, mask: 0x7FF,
    idType: "STANDARD_FD_CAN", hrhId: "HRH_1", hrhType: "BASIC", minDlc: 16,
    ul: "PDUR", ulCbk: "PduR_CanIfRxIndication", desc: "Tín hiệu xe CAN FD từ PduR/COM"
  },
  {
    rxPduId: 1, name: "RxPdu_1_CanTpDiagReq", ctrlId: 0, canId: 0x7E0, mask: 0x7FF,
    idType: "STANDARD_CAN", hrhId: "HRH_1", hrhType: "BASIC", minDlc: 8,
    ul: "CANTP", ulCbk: "CanTp_RxIndication", desc: "Yêu cầu chẩn đoán UDS Physical 0x7E0"
  },
  {
    rxPduId: 2, name: "RxPdu_2_CanNmRange", ctrlId: 0, canId: 0x500, mask: 0x700,
    idType: "STANDARD_CAN", hrhId: "HRH_0", hrhType: "FULL", minDlc: 8,
    ul: "CANNM", ulCbk: "CanNm_RxIndication", desc: "Dải bản tin quản lý mạng CanNm 0x500..0x5FF"
  },
  {
    rxPduId: 3, name: "RxPdu_3_CanTSynTime", ctrlId: 0, canId: 0x190, mask: 0x7FF,
    idType: "STANDARD_CAN", hrhId: "HRH_1", hrhType: "BASIC", minDlc: 8,
    ul: "CAN_TSYN", ulCbk: "CanTSyn_RxIndication", desc: "Đồng bộ thời gian toàn cục TimeSync"
  }
];

const RX_PROFILES = {
  FRAME_A: {
    key: "FRAME_A", label: "Frame A: 0x120 (Std FD 32B) @ BasicCAN HRH_1 ➔ PduR",
    canId: 0x120, idType: "STANDARD_FD_CAN", hrhId: "HRH_1", hrhType: "BASIC",
    dlc: 32, minDlc: 16, mask: "0x7FF", ul: "PDUR", payload: "12 34 56 78 9A BC DE F0 (32B FD)"
  },
  FRAME_B: {
    key: "FRAME_B", label: "Frame B: 0x7E0 (Std CAN 8B) @ BasicCAN HRH_1 ➔ CanTp",
    canId: 0x7E0, idType: "STANDARD_CAN", hrhId: "HRH_1", hrhType: "BASIC",
    dlc: 8, minDlc: 8, mask: "0x7FF", ul: "CANTP", payload: "02 10 03 55 55 55 55 55 (UDS 10 03)"
  },
  FRAME_C: {
    key: "FRAME_C", label: "Frame C: 0x501 (Std CAN 8B) @ FullCAN HRH_0 ➔ CanNm",
    canId: 0x501, idType: "STANDARD_CAN", hrhId: "HRH_0", hrhType: "FULL",
    dlc: 8, minDlc: 8, mask: "0x700", ul: "CANNM", payload: "01 51 FF FF 00 00 00 00 (NM Wakeup)"
  },
  FRAME_D: {
    key: "FRAME_D", label: "Frame D: 0x190 (Std CAN 8B) @ BasicCAN HRH_1 ➔ CanTSyn",
    canId: 0x190, idType: "STANDARD_CAN", hrhId: "HRH_1", hrhType: "BASIC",
    dlc: 8, minDlc: 8, mask: "0x7FF", ul: "CAN_TSYN", payload: "20 00 1A 2B 3C 4D 5E 6F (SYNC)"
  },
  FRAME_E: {
    key: "FRAME_E", label: "Frame E: 0x3FF (Unknown ID 8B) @ BasicCAN HRH_1 ➔ SwFilter Drop",
    canId: 0x3FF, idType: "STANDARD_CAN", hrhId: "HRH_1", hrhType: "BASIC",
    dlc: 8, minDlc: 8, mask: "0x7FF", ul: "PDUR", payload: "FF EE DD CC BB AA 99 88"
  },
  FRAME_F: {
    key: "FRAME_F", label: "Frame F: 0x120 (Short DLC 4B < Min 16B) @ HRH_1 ➔ Lỗi DLC 0x32",
    canId: 0x120, idType: "STANDARD_FD_CAN", hrhId: "HRH_1", hrhType: "BASIC",
    dlc: 4, minDlc: 16, mask: "0x7FF", ul: "PDUR", payload: "DE AD 00 04 (Truncated/Attack)"
  }
};

const configTooltipData = {
  // Tab 0: CanIf Public & Private (6)
  CanIfDevErrorDetect: {
    title: "CanIfDevErrorDetect",
    ecucPath: "CanIf / CanIfPublicCfg / CanIfDevErrorDetect",
    sws: "SWS_CanIf_00018 · ECUC_CanIf_00614",
    range: "boolean (true | false)",
    typical: "true (Dev/Integration) | false (Production)",
    role: "Bật hoặc tắt kiểm tra lỗi lập trình Development Error và báo cáo sang DET (ModuleId = 60).",
    mechanism: "Khi true, mọi API của CanIf kiểm tra UNINIT (0x1E), INVALID_TXPDUID (0x32), PARAM_HOH (0x0C), PARAM_CANID (0x0A), PARAM_CONTROLLERID (0x0F), PARAM_POINTER (0x14).",
    scenarioImpact: "Kiểm thử trực tiếp trong kịch bản S12; tắt cờ này sẽ bỏ qua bước kiểm tra biên."
  },
  CanIfPublicTxBuffering: {
    title: "CanIfPublicTxBuffering",
    ecucPath: "CanIf / CanIfPublicCfg / CanIfPublicTxBuffering",
    sws: "SWS_CanIf_00381 · ECUC_CanIf_00618",
    range: "boolean (true | false)",
    typical: "true (Bắt buộc khi dùng BasicCAN HTH Multiplexing)",
    role: "Bật/tắt bộ đệm truyền ưu tiên CanIfTxBuffer trong RAM khi Mailbox BasicCAN đang bận (Can_Write trả về CAN_BUSY).",
    mechanism: "Lưu L-PDU vào CanIfTxBuffer sắp xếp theo ưu tiên CAN ID (ID nhỏ ưu tiên cao) và tự động gọi Can_Write() phát tiếp ngay trong ngắt CanIf_TxConfirmation().",
    scenarioImpact: "Trọng tâm kịch bản S2; tắt cờ này khiến CanIf_Transmit() trả về ngay E_NOT_OK khi gặp CAN_BUSY."
  },
  CanIfPrivateDlcCheck: {
    title: "CanIfPrivateDlcCheck",
    ecucPath: "CanIf / CanIfPrivateCfg / CanIfPrivateDlcCheck",
    sws: "SWS_CanIf_00026 · ECUC_CanIf_00617",
    range: "boolean (true | false)",
    typical: "true (Bảo vệ an toàn vùng nhớ tầng COM/PduR)",
    role: "Kích hoạt kiểm tra độ dài dữ liệu chiều nhận: CanDlc nhận được phải >= CanIfRxPduDataLength cấu hình.",
    mechanism: "Nếu khung nhận ngắn hơn cấu hình, CanIf hủy khung tin và báo Runtime Error CANIF_E_INVALID_DATA_LENGTH (0x32), ngăn tầng trên đọc phải dữ liệu rác.",
    scenarioImpact: "Thử nghiệm ở S4 bằng cách bơm Frame F có DLC = 4B (< Min 16B)."
  },
  CanIfPrivateSoftwareFilterType: {
    title: "CanIfPrivateSoftwareFilterType",
    ecucPath: "CanIf / CanIfPrivateCfg / CanIfPrivateSoftwareFilterType",
    sws: "SWS_CanIf_00030 · ECUC_CanIf_00619",
    range: "MASK | BINARY_SEARCH | LINEAR | TABLE",
    typical: "BINARY_SEARCH (nhiều RxPdu) hoặc MASK (lọc dải ID)",
    role: "Chọn thuật toán lọc phần mềm trong CanIf_RxIndication() cho các BasicCAN HRH.",
    mechanism: "So khớp (CanId & Mask) == (CfgCanId & Mask) hoặc tìm nhị phân trên bảng RxPdu đã sắp xếp để ánh xạ nhanh ra RxPduId.",
    scenarioImpact: "Hiển thị phép toán lọc tương ứng ngay trên Bảng Giải Phẫu Rx Software Filter."
  },
  CanIfSetDynamicTxIdApi: {
    title: "CanIfSetDynamicTxIdApi",
    ecucPath: "CanIf / CanIfPublicCfg / CanIfSetDynamicTxIdApi",
    sws: "SWS_CanIf_00189 · ECUC_CanIf_00616",
    range: "boolean (true | false)",
    typical: "true nếu dùng J1939 hoặc XCP Dynamic Addressing",
    role: "Cho phép gọi API CanIf_SetDynamicTxId(CanIfTxSduId, CanId) để thay đổi CAN ID của DYNAMIC Tx L-PDU lúc chạy.",
    mechanism: "Cập nhật mảng CAN ID trong RAM cho các TxPdu cấu hình CanIfTxPduType = DYNAMIC; nếu gọi lên STATIC PDU sẽ báo lỗi DET.",
    scenarioImpact: "Trọng tâm pha 2 của kịch bản S3 và nút Quick Action #6."
  },
  CanIfTriggerTransmitSupport: {
    title: "CanIfTriggerTransmitSupport",
    ecucPath: "CanIf / CanIfPublicCfg / CanIfTriggerTransmitSupport",
    sws: "SWS_CanIf_00883 · ECUC_CanIf_00841",
    range: "boolean (true | false)",
    typical: "true khi dùng CanNm / PduR TriggerTransmit",
    role: "Bật cơ chế kéo dữ liệu tức thời CanIf_TriggerTransmit() từ tầng trên ngay sát lúc phát lên bus.",
    mechanism: "Khi CanDrv gọi CanIf_TriggerTransmit(TxPduId, &PduInfo), CanIf chuyển tiếp sang <User_TriggerTransmit>() để lấy payload mới nhất.",
    scenarioImpact: "Minh họa ở pha 1 kịch bản S3 với TxPdu_5."
  },

  // Tab 1: Ctrl & PduMode (6)
  SelectedControllerId: {
    title: "CanIfCtrlId (Target CAN Controller)",
    ecucPath: "CanIf / CanIfCtrlCfg / CanIfCtrlId",
    sws: "SWS_CanIf_00647 · ECUC_CanIf_00647",
    range: "0 (Chassis_CAN_FD) | 1 (Body_CAN_HS)",
    typical: "0 cho mạng CAN FD chính trên xe",
    role: "Chỉ số logic của bộ điều khiển CAN do CanIf quản lý độc lập về ControllerMode và PduMode.",
    mechanism: "Mỗi ControllerId có một cặp máy trạng thái riêng (Can_ControllerStateType và CanIf_PduModeType) cùng cờ TxConfirmationState.",
    scenarioImpact: "Cập nhật nhãn Controller đang điều khiển trên Panel 1, Panel 2 và Header."
  },
  ActiveControllerMode: {
    title: "Can_ControllerStateType (ControllerMode)",
    ecucPath: "CanIfRuntime / CanIf_SetControllerMode(CtrlId, Mode)",
    sws: "SWS_CanIf_00308 · SWS_CanIf_00866",
    range: "CAN_CS_UNINIT | CAN_CS_STOPPED | CAN_CS_STARTED | CAN_CS_SLEEP",
    typical: "CAN_CS_STARTED khi xe chạy; CAN_CS_SLEEP khi đỗ",
    role: "Trạng thái vận hành phần cứng của CAN Controller (chỉ truyền/nhận khi ở CAN_CS_STARTED).",
    mechanism: "Khi rời STARTED về STOPPED (hoặc bị Bus-Off), CanIf tự động xóa sạch CanIfTxBuffer và reset TxConfirmationState về NO_NOTIFICATION.",
    scenarioImpact: "Quan sát trực tiếp ở Máy trạng thái trái (Panel 2) và Thanh ghi A (Bit 7, Bit 6)."
  },
  ActivePduMode: {
    title: "CanIf_PduModeType (PduMode)",
    ecucPath: "CanIfRuntime / CanIf_SetPduMode(CtrlId, PduModeRequest)",
    sws: "SWS_CanIf_00008 · SWS_CanIf_00072",
    range: "CANIF_OFFLINE | CANIF_TX_OFFLINE | CANIF_TX_OFFLINE_ACTIVE | CANIF_ONLINE",
    typical: "CANIF_ONLINE (bình thường); TX_OFFLINE (Silent/BOR); TX_OFFLINE_ACTIVE (Passive)",
    role: "Cổng kiểm soát đường truyền L-PDU trên mỗi Controller: cho phép Tx, Rx hay giả lập TxConfirmation.",
    mechanism: "Đặc biệt ở CANIF_TX_OFFLINE_ACTIVE: Không gọi Can_Write() ra bus nhưng trả về E_OK và gọi ngay <User_TxConfirmation>() lên tầng trên!",
    scenarioImpact: "Trọng tâm kịch bản S8 và nút Quick Action #5."
  },
  CanIfCtrlWakeupSupport: {
    title: "CanIfCtrlWakeupSupport",
    ecucPath: "CanIf / CanIfCtrlCfg / CanIfCtrlWakeupSupport",
    sws: "SWS_CanIf_00219 · ECUC_CanIf_00637",
    range: "boolean (true | false)",
    typical: "true cho các mạng có khả năng đánh thức ECU từ Sleep",
    role: "Cho phép Controller tham gia quy trình phát hiện và xác thực nguồn đánh thức của EcuM.",
    mechanism: "Nếu tắt false, lời gọi CanIf_CheckWakeup() trên Controller này không đánh thức ECU.",
    scenarioImpact: "Ảnh hưởng tới chu trình Wakeup ở kịch bản S11."
  },
  CanIfPnFilterEnabled: {
    title: "CanIfPnFilter Runtime State",
    ecucPath: "CanIfRuntime / Controller PN Tx Filter State",
    sws: "SWS_CanIf_00750 · SWS_CanIf_00751",
    range: "boolean (true = Chặn PDU thường | false = Mở khóa toàn bộ)",
    typical: "true ngay khi thức dậy với Partial Networking; tự động về false khi có khung hợp lệ",
    role: "Bộ lọc chiều truyền Partial Networking ngăn ECU xả các khung COM khi mạng chưa xác nhận PN sẵn sàng.",
    mechanism: "Khi bật, CanIf_Transmit() chặn mọi TxPdu có CanIfTxPduPnFilterPdu == FALSE và chỉ mở khóa khi có ConfirmPnAvailability / RxInd / TxConfirm.",
    scenarioImpact: "Trọng tâm kịch bản S9 và Bit 2 (PN_TX_FILT) trên Thanh A."
  },
  ActiveBaudRateConfigID: {
    title: "BaudRateConfigID (CanIf_SetBaudrate)",
    ecucPath: "CanIfRuntime / CanIf_SetBaudrate(CtrlId, BaudRateConfigID)",
    sws: "SWS_CanIf_00867",
    range: "0 (500k/2M FD) | 1 (250k) | 2 (1000k) | 3 (125k)",
    typical: "0 (500 kbps Arbitration / 2 Mbps Data Phase)",
    role: "Mã cấu hình tốc độ truyền được chuyển tiếp xuống Can_SetBaudrate() khi DCM ($87 LinkControl) hoặc CanSM yêu cầu.",
    mechanism: "CanIf kiểm tra ControllerId hợp lệ và gọi Can_SetBaudrate(ControllerId, BaudRateConfigID).",
    scenarioImpact: "Thử nghiệm ở kịch bản S12 và hiển thị trên thanh Bus vật lý SVG."
  },

  // Tab 2: TxPdu & TxBuffer (6)
  SelectedTxPduId: {
    title: "CanIfTxPduId (Selected Tx L-PDU)",
    ecucPath: "CanIf / CanIfInitCfg / CanIfTxPduCfg / CanIfTxPduId",
    sws: "SWS_CanIf_00005 · ECUC_CanIf_00591",
    range: "0 .. 5 (TxPdu_0 .. TxPdu_5)",
    typical: "Mỗi TxPdu ánh xạ tới 1 HTH, 1 CAN ID, và 1 Upper Layer Callback",
    role: "Định danh duy nhất của L-PDU chiều truyền khi PduR / CanTp / CanNm gọi CanIf_Transmit().",
    mechanism: "CanIf dùng TxPduId để tra bảng CanIfTxPduCfg[], lấy HthId, Can_IdType và hàm <User_TxConfirmation>.",
    scenarioImpact: "Chọn L-PDU tương ứng cho nút Quick Action #1 (CanIf_Transmit)."
  },
  CanIfTxPduCanIdType: {
    title: "CanIfTxPduCanIdType (Bit 31 & Bit 30 MSB)",
    ecucPath: "CanIf / CanIfInitCfg / CanIfTxPduCfg / CanIfTxPduCanIdType",
    sws: "SWS_Can_00416 · ECUC_CanIf_00590",
    range: "STANDARD_CAN | STANDARD_FD_CAN | EXTENDED_CAN | EXTENDED_FD_CAN",
    typical: "STANDARD_FD_CAN (0x40000000) cho xe đời mới",
    role: "Quy định 2 bit cao nhất (Bit 31 Extended, Bit 30 CAN-FD) được gắn vào biến 32-bit Can_IdType.",
    mechanism: "Bit31=1 (0x80000000) bật khung 29-bit; Bit30=1 (0x40000000) bật CAN FD tới 64 bytes.",
    scenarioImpact: "Quan sát ngay trên dải giải mã 32-bit Can_IdType và Bit 7, Bit 6 Thanh B."
  },
  CustomDynamicCanIdHex: {
    title: "Dynamic CAN ID (CanIf_SetDynamicTxId)",
    ecucPath: "CanIfRuntime / DynamicTxId RAM Table",
    sws: "SWS_CanIf_00189",
    range: "Hex 11-bit (0x000..0x7FF) hoặc 29-bit (0x00000000..0x1FFFFFFF)",
    typical: "0x18FEF100 (J1939 PGN)",
    role: "Giá trị CAN ID động mới nạp vào RAM cho TxPdu_4 khi gọi CanIf_SetDynamicTxId().",
    mechanism: "Ghi đè CAN ID tĩnh mặc định trong bảng RAM của DYNAMIC TxPdu mà không cần biên dịch lại ROM.",
    scenarioImpact: "Dùng trong kịch bản S3 và nút Quick Action #6 (SetDynTxId)."
  },
  CanIfTxBufferSize: {
    title: "CanIfTxBufferSize (Priority Queue Depth)",
    ecucPath: "CanIf / CanIfInitCfg / CanIfBufferCfg / CanIfBufferSize",
    sws: "SWS_CanIf_00381 · ECUC_CanIf_00835",
    range: "0 .. 16 slots (Mặc định: 4)",
    typical: "4 .. 16 slots cho mỗi BasicCAN HTH",
    role: "Số lượng L-PDU tối đa được xếp hàng chờ trong CanIfTxBuffer khi BasicCAN HTH trả về CAN_BUSY.",
    mechanism: "Nếu hàng đợi đã đầy (hoặc bằng 0) và gói tin mới chưa có sẵn trong hàng đợi để ghi đè, CanIf_Transmit() trả về E_NOT_OK.",
    scenarioImpact: "Kiểm thử tranh chấp Mailbox và tràn hàng đợi ở kịch bản S2."
  },
  CanIfTxPduPnFilterPdu: {
    title: "CanIfTxPduPnFilterPdu (PN Whitelist)",
    ecucPath: "CanIf / CanIfInitCfg / CanIfTxPduCfg / CanIfTxPduPnFilterPdu",
    sws: "SWS_CanIf_00750 · ECUC_CanIf_00773",
    range: "boolean (true = Cho phép qua PN Filter | false = Bị chặn khi PN Filter bật)",
    typical: "true cho CanNm TxPdu; false cho mọi COM/CanTp TxPdu",
    role: "Đánh dấu Tx L-PDU được phép vượt qua bộ lọc Partial Networking khi mạng mới thức dậy.",
    mechanism: "Đảm bảo chỉ bản tin CanNm (chứa PN Info Vector) được truyền ra bus trước khi ECU nhận phản hồi mở khóa toàn bộ.",
    scenarioImpact: "Quyết định gói tin nào được đi qua hay bị chặn trong kịch bản S9."
  },
  CanIfTxPduTruncation: {
    title: "CanIfTxPduTruncation (Length Exceeded Handling)",
    ecucPath: "CanIf / CanIfInitCfg / CanIfTxPduCfg / CanIfTxPduTruncation",
    sws: "SWS_CanIf_00893 · ECUC_CanIf_00892",
    range: "boolean (true = Cắt gọn và truyền | false = Hủy truyền E_NOT_OK)",
    typical: "false (bảo vệ tính toàn vẹn gói tin) hoặc true cho Dynamic Frame",
    role: "Quyết định hành vi khi SduLength truyền vào lớn hơn kích thước tối đa của Tx L-PDU (ví dụ >8B trên Classical CAN).",
    mechanism: "Cả hai trường hợp đều báo Runtime Error CANIF_E_TXPDU_LENGTH_EXCEEDED (0x33); nếu true thì cắt ngắn xuống maxLen rồi gọi Can_Write().",
    scenarioImpact: "Thử nghiệm ở What-If kịch bản S5."
  },

  // Tab 3: RxPdu & Software Filter (6)
  SelectedRxPduProfile: {
    title: "Simulated Incoming CAN Frame Profile",
    ecucPath: "Bus Simulation / CanDrv Rx Mailbox Input",
    sws: "SWS_CanIf_00006",
    range: "FRAME_A .. FRAME_F",
    typical: "FRAME_A (0x120 FD 32B) ➔ PduR",
    role: "Chọn mẫu khung CAN đến từ bus vật lý để bơm vào ngắt CanIf_RxIndication().",
    mechanism: "Cung cấp sẵn các kịch bản hợp lệ (PduR, CanTp, CanNm, CanTSyn) và lỗi (Unknown ID 0x3FF, Short DLC 4B).",
    scenarioImpact: "Chọn nguồn đầu vào cho nút Quick Action #3 (RxIndication) và nút HW RxInd trên Header."
  },
  CanIfRxPduCanIdMaskHex: {
    title: "CanIfRxPduCanIdMask",
    ecucPath: "CanIf / CanIfInitCfg / CanIfRxPduCfg / CanIfRxPduCanIdMask",
    sws: "SWS_CanIf_00030 · ECUC_CanIf_00799",
    range: "0x000..0x7FF (Std) | 0x00000000..0x1FFFFFFF (Ext)",
    typical: "0x7FF (khớp chính xác 1 ID) | 0x700 (nhận cả dải 0x500..0x5FF cho CanNm)",
    role: "Mặt nạ bit sử dụng trong phép toán lọc phần mềm: (RxCanId & Mask) == (CfgCanId & Mask).",
    mechanism: "Bit 1 của Mask buộc phải khớp chính xác; Bit 0 cho phép 'Don't Care' (dùng để 1 RxPdu bắt cả dải Node ID của CanNm).",
    scenarioImpact: "Thử đổi sang 0x700 trong What-If kịch bản S6."
  },
  CanIfRxPduDataLength: {
    title: "CanIfRxPduDataLength (Min Expected DLC)",
    ecucPath: "CanIf / CanIfInitCfg / CanIfRxPduCfg / CanIfRxPduDataLength",
    sws: "SWS_CanIf_00026 · ECUC_CanIf_00599",
    range: "0 .. 64 bytes",
    typical: "8 bytes (CAN 2.0) | 16..64 bytes (CAN FD)",
    role: "Độ dài payload tối thiểu yêu cầu để khung CAN nhận được coi là hợp lệ bởi bộ kiểm tra DLC Check.",
    mechanism: "Nếu CanIfPrivateDlcCheck == TRUE và PduInfoPtr->SduLength < CanIfRxPduDataLength, khung bị loại và báo Runtime Error 0x32.",
    scenarioImpact: "So sánh với InjectedRxDlcLength trong kịch bản S4."
  },
  InjectedRxDlcLength: {
    title: "Actual Received Frame DLC (Bytes)",
    ecucPath: "Bus Input / PduInfoPtr->SduLength",
    sws: "SWS_CanIf_00168",
    range: "0 .. 64 bytes",
    typical: "32B (Frame A) hoặc 4B (Inject lỗi DLC)",
    role: "Độ dài thực tế của khung CAN vừa được CanDrv nhận từ dây bus và truyền vào CanIf_RxIndication().",
    mechanism: "Giảm giá trị này xuống thấp hơn RxPduDataLength để tái hiện lỗi CANIF_E_INVALID_DATA_LENGTH (0x32).",
    scenarioImpact: "Dùng trực tiếp để kích hoạt lỗi DLC Check trong S4 và S12."
  },
  CanIfRxPduUserRxIndicationUL: {
    title: "CanIfRxPduUserRxIndicationUL (Upper Layer)",
    ecucPath: "CanIf / CanIfInitCfg / CanIfRxPduCfg / CanIfRxPduUserRxIndicationUL",
    sws: "SWS_CanIf_00006 · ECUC_CanIf_00529",
    range: "PDUR | CANTP | CANNM | CAN_TSYN | CDD",
    typical: "Tự động gán theo chức năng của từng RxPdu",
    role: "Chỉ định module tầng trên nhận dữ liệu sau khi khung vượt qua lọc phần mềm và DLC Check.",
    mechanism: "CanIf lưu danh sách con trỏ hàm theo UL để gọi PduR_CanIfRxIndication, CanTp_RxIndication, CanNm_RxIndication, CanTSyn_RxIndication hoặc CDD.",
    scenarioImpact: "Minh họa đường phân nhánh đa đích trong kịch bản S6."
  },
  CanIfRxPduReadDataAndNotif: {
    title: "CanIfRxPduReadData & ReadNotifyStatus",
    ecucPath: "CanIf / CanIfInitCfg / CanIfRxPduCfg / CanIfRxPduReadData",
    sws: "SWS_CanIf_00194 · SWS_CanIf_00202 · ECUC_CanIf_00600",
    range: "boolean (false = Push Callback | true = Enable Polling Buffer)",
    typical: "false (Dùng callback RxIndication); true cho tác vụ Polling chậm",
    role: "Cho phép CanIf lưu bản sao payload và cờ thông báo nhận vào RAM nội bộ để tầng trên chủ động đọc.",
    mechanism: "Khi true, tầng trên gọi CanIf_ReadRxNotifStatus() (tự xóa cờ sau khi đọc) và CanIf_ReadRxPduData() để copy dữ liệu.",
    scenarioImpact: "Thử nghiệm chế độ Polling Rx ở kịch bản S6."
  },

  // Tab 4: HOH (HTH/HRH) & CAN FD (6)
  CanIfHthHandleType: {
    title: "CanIfHthHandleType (FullCAN vs BasicCAN Tx)",
    ecucPath: "CanIf / CanIfInitCfg / CanIfInitHohCfg / CanIfHthCfg",
    sws: "SWS_CanIf_00381 · ECUC_CanIf_00625",
    range: "BASIC (Multiplexed M:1 + TxBuffer) | FULL (Dedicated 1:1)",
    typical: "FULL cho tín hiệu tốc độ cao/NM; BASIC cho hàng chục PDU khác",
    role: "Phân loại phần cứng Mailbox truyền (HTH): Độc quyền 1 ID (FULL) hay dùng chung nhiều ID (BASIC).",
    mechanism: "BasicCAN HTH bắt buộc đi kèm CanIfTxBuffer để xếp hàng ưu tiên khi nhiều TxPdu tranh chấp 1 Mailbox phần cứng.",
    scenarioImpact: "Chuyển đổi Bit 5 (BASIC_HOH) trên Thanh ghi B và cách xử lý Can_Write()."
  },
  SimulateHthMailboxBusy: {
    title: "Simulate HTH_1 Mailbox Busy (CAN_BUSY)",
    ecucPath: "MCAL CanDrv Simulation / HTH_1 Hardware Register Status",
    sws: "SWS_CanIf_00381 · SWS_CanIf_00068",
    range: "boolean (true = Can_Write trả về CAN_BUSY | false = FREE/CAN_OK)",
    typical: "false (Tự bật khi đang truyền dở khung trên BasicCAN HTH_1)",
    role: "Giả lập tình huống Mailbox phần cứng HTH_1 đang bận phát khung trước đó trên dây bus CAN.",
    mechanism: "Khi true, mọi lệnh CanIf_Transmit() qua BasicCAN HTH_1 sẽ nhận CAN_BUSY và được đẩy vào hàng đợi ưu tiên CanIfTxBuffer.",
    scenarioImpact: "Nút gạt nhanh ngay trên Header Panel 1 và trọng tâm kịch bản S2."
  },
  CanIfHrhHandleType: {
    title: "CanIfHrhHandleType (FullCAN vs BasicCAN Rx)",
    ecucPath: "CanIf / CanIfInitCfg / CanIfInitHohCfg / CanIfHrhCfg",
    sws: "SWS_CanIf_00030 · ECUC_CanIf_00632",
    range: "BASIC (HW Range Mask + SwFilter) | FULL (HW Exact Match)",
    typical: "FULL cho khung nhận tần suất rất cao; BASIC cho các khung còn lại",
    role: "Phân loại Mailbox nhận (HRH): FullCAN lọc cứng 1 ID duy nhất tại MCAL; BasicCAN hứng nhiều ID rồi lọc lại bằng phần mềm.",
    mechanism: "Nếu dùng BasicCAN HRH, CanIf bắt buộc phải chạy thuật toán tìm RxPduId tương ứng bên trong CanIf_RxIndication().",
    scenarioImpact: "Ảnh hưởng bước lọc phần mềm trên Panel 1B (Rx Filter)."
  },
  CanIfHrhSoftwareFilter: {
    title: "CanIfHrhSoftwareFilter",
    ecucPath: "CanIf / CanIfInitCfg / CanIfHrhCfg / CanIfHrhSoftwareFilter",
    sws: "SWS_CanIf_00030 · ECUC_CanIf_00633",
    range: "boolean (true = Chạy Software Filter | false = Bỏ qua cho FullCAN)",
    typical: "true cho BasicCAN HRH; false cho FullCAN HRH",
    role: "Bật/tắt bước tra bảng lọc CAN ID bằng phần mềm trong CanIf_RxIndication().",
    mechanism: "Giúp FullCAN HRH tiết kiệm thời gian CPU trong ngắt vì phần cứng đã đảm bảo 100% chỉ nhận đúng 1 CAN ID.",
    scenarioImpact: "Quan sát sự khác nhau giữa Frame A (BasicCAN) và Frame C (FullCAN)."
  },
  TxRxPayloadPreviewHex: {
    title: "SduDataPtr Payload Hex Preview",
    ecucPath: "PduInfoType / SduDataPtr",
    sws: "SWS_CanIf_00005",
    range: "Chuỗi Hex tối đa 64 bytes",
    typical: "11 22 33 44 55 66 77 88",
    role: "Nội dung byte dữ liệu (Payload) hiển thị trong gói tin truyền/nhận và hàng đợi CanIfTxBuffer.",
    mechanism: "Được sao chép vào bộ đệm CanIfTxBuffer (nếu xếp hàng) hoặc chuyển thẳng xuống Can_PduType.sdu.",
    scenarioImpact: "Thấy ngay dữ liệu mới khi ghi đè tại chỗ trong CanIfTxBuffer ở kịch bản S2."
  },
  CanFdBitRateSwitchBrs: {
    title: "CAN FD Bit Rate Switch (BRS)",
    ecucPath: "CanDrv Frame Control / FD Data Phase 2 Mbps",
    sws: "ISO 11898-1:2015 · SWS_Can_00416",
    range: "boolean (true = Chuyển tốc độ cao 2 Mbps ở vùng Data | false = Giữ 500 kbps)",
    typical: "true cho khung CAN FD 12..64 bytes",
    role: "Bật cờ BRS trên khung CAN FD để truyền vùng Payload với tốc độ cao gấp 4 lần pha Arbitration.",
    mechanism: "Kết hợp cùng Bit 30 (FD_MODE_B30) trong Can_IdType để tối ưu băng thông bus CAN FD.",
    scenarioImpact: "Hiển thị trong kịch bản S5 và thanh thông số Bus SVG."
  },

  // Tab 5: PN, Wakeup & DET/IdsM (6)
  ActiveTransceiverMode: {
    title: "CanTrcv_TrcvModeType (Transceiver Mode)",
    ecucPath: "CanIfRuntime / CanIf_SetTrcvMode(TrcvId, Mode)",
    sws: "SWS_CanIf_00287 · SWS_CanTrcv",
    range: "CANTRCV_TRCVMODE_NORMAL | SLEEP | STANDBY",
    typical: "NORMAL khi chạy; STANDBY/SLEEP khi ngủ PN",
    role: "Chế độ hoạt động vật lý của IC thu phát CAN (như TJA1145) được CanSM điều khiển xuyên qua CanIf.",
    mechanism: "CanIf ánh xạ TrcvId tới CanTrcv_SetOpMode() và chuyển tiếp callback CanIf_TransceiverModeIndication() lên CanSM.",
    scenarioImpact: "Cập nhật trực tiếp trên khối CanTrcv trong sơ đồ SVG và kịch bản S7, S11."
  },
  CanIfPublicPnSupport: {
    title: "CanIfPublicPnSupport (Partial Networking)",
    ecucPath: "CanIf / CanIfPublicCfg / CanIfPublicPnSupport",
    sws: "SWS_CanIf_00750 · ECUC_CanIf_00772",
    range: "boolean (true | false)",
    typical: "true cho ECU có tính năng ngủ chọn lọc PN (Selective Wakeup)",
    role: "Bật hỗ trợ Partial Networking trong CanIf: bộ lọc CanIfPnFilter và các API ClearTrcvWufFlag / CheckTrcvWakeFlag.",
    mechanism: "Cho phép ECU chỉ thức dậy bởi khung WUF hợp lệ và giữ im lặng các bản tin ứng dụng cho tới khi PN xác nhận.",
    scenarioImpact: "Điều kiện để kích hoạt tính năng của kịch bản S9."
  },
  CanIfPublicWakeupCheckValidSupport: {
    title: "CanIfPublicWakeupCheckValidSupport",
    ecucPath: "CanIf / CanIfPublicCfg / CanIfPublicWakeupCheckValidSupport",
    sws: "SWS_CanIf_00226 · ECUC_CanIf_00611",
    range: "boolean (true | false)",
    typical: "true (Bắt buộc để chống đánh thức giả do nhiễu điện)",
    role: "Bật API CanIf_CheckValidation(WakeupSource) để xác thực nguồn đánh thức với EcuM.",
    mechanism: "Chỉ gọi EcuM_ValidateWakeupEvent() nếu CanIf đã nhận được ít nhất 1 khung CAN hợp lệ qua CanIf_RxIndication() sau khi CheckWakeup!",
    scenarioImpact: "Trọng tâm kịch bản S11 và Bit 0 (WKUP_VALID) trên Thanh A."
  },
  CanIfWakeupCheckValidByNM: {
    title: "CanIfPublicWakeupCheckValidByNM",
    ecucPath: "CanIf / CanIfPublicCfg / CanIfPublicWakeupCheckValidByNM",
    sws: "SWS_CanIf_00286 · ECUC_CanIf_00742",
    range: "boolean (true = Chỉ khung CanNm mới Validate | false = Khung Rx hợp lệ bất kỳ)",
    typical: "true (khuyến nghị để tránh các khung nhiễu/công cụ chẩn đoán làm thức nhầm)",
    role: "Siết chặt điều kiện xác thực Wakeup: Chỉ các Rx L-PDU định tuyến tới CanNm mới bật được cờ WakeupValidation.",
    mechanism: "Nếu nhận Frame A (PduR) trong lúc chờ Validate khi cờ này TRUE, CanIf vẫn giữ WKUP_VALID = 0; chỉ Frame C (CanNm) mới bật = 1!",
    scenarioImpact: "Thử nghiệm ở What-If của kịch bản S11."
  },
  PassInvalidPduOrCanIdTest: {
    title: "Inject Invalid PduId / CtrlId / NULL_PTR (DET)",
    ecucPath: "Fault Injection / Parameter Boundary Test",
    sws: "SWS_CanIf_00018 · SWS_Det",
    range: "boolean (true = Cố tình truyền tham số sai | false = Bình thường)",
    typical: "false (bật true để test DET)",
    role: "Giả lập lỗi gọi hàm sai tham số biên (TxPduId = 999, CtrlId = 99 hoặc NULL_PTR).",
    mechanism: "Khi CanIfDevErrorDetect == TRUE, CanIf chặn ngay, bật Bit 0 (DET_ERR) trên Thanh B và ghi vào DET Error Log.",
    scenarioImpact: "Trọng tâm kịch bản S12."
  },
  EnableIdsMSecurityEvents: {
    title: "Enable IdsM Security Event Reporting (R20-11+)",
    ecucPath: "CanIf / CanIfPublicCfg / CanIfSecurityEventRefs (IdsM)",
    sws: "SWS_CanIf (R20-11+) · SWS_IdsM",
    range: "boolean (true | false)",
    typical: "true trên các ECU kết nối Ethernet/CAN Gateway có Cybersecurity",
    role: "Cho phép CanIf báo cáo các sự kiện an ninh (CANIF_SEV_*) sang module IdsM khi phát hiện bất thường trên bus.",
    mechanism: "Khi gặp khung sai DLC (0x32) hoặc CAN ID lạ bất thường, CanIf gọi IdsM_SetSecurityEvent(CANIF_SEV_ERRORSTATE_BUSOFF / INVALID_DLC).",
    scenarioImpact: "Thử nghiệm kết hợp DET + IdsM trong kịch bản S12."
  }
};

const MODULES_INFO = {
  MOD_SWC: {
    title: "SWC_App & SWC_Diag (Application Software Components)",
    layer: "Application Layer (01_Application)",
    sws: "SWS_Rte · SWS_Com · SWS_Dcm",
    inputs: "Giá trị tín hiệu vật lý (Tốc độ xe, Góc lái, Phanh) qua Rte_Read(); yêu cầu chẩn đoán UDS từ Dcm.",
    processing: "SWC tuyệt đối KHÔNG gọi trực tiếp CanIf! Dữ liệu ứng dụng đi qua RTE xuống AUTOSAR COM (Data Path), còn yêu cầu bật/tắt mạng đi qua RTE xuống ComM (Control Path).",
    outputs: "Rte_Write_PP_SteerAngle_Val(), Rte_Call_UR_ComMUser_0_RequestComMode(COMM_FULL_COMMUNICATION)."
  },
  MOD_RTE: {
    title: "RTE & SchM (Runtime Environment & Exclusive Area)",
    layer: "RTE Layer (02_RTE)",
    sws: "SWS_Rte · SWS_SchM",
    inputs: "Lời gọi truyền tín hiệu từ SWC và các yêu cầu khóa vùng găng (Critical Section) từ CanIf.",
    processing: "1. RTE kết nối SWC tới COM/DCM/ComM.\n2. SchM cung cấp SchM_Enter_CanIf_EXCLUSIVE_AREA_0() bảo vệ hàng đợi CanIfTxBuffer và trạng thái PduMode khỏi xung đột giữa Task gọi CanIf_Transmit() và ngắt CAN ISR (CanIf_TxConfirmation / BusOff).",
    outputs: "SchM_Enter_CanIf_EXCLUSIVE_AREA_0(), SchM_Exit_CanIf_EXCLUSIVE_AREA_0()."
  },
  MOD_UL_DATA: {
    title: "Upper Layers (PduR/Com/SecOC · CanTp/Dcm · CanNm · CanTSyn · CDD)",
    layer: "Communication Services (03_Services)",
    sws: "SWS_PduR · SWS_CanTp · SWS_CanNm · SWS_CanTSyn",
    inputs: "I-PDU từ COM/SecOC/Dcm; nhận callback <User>_RxIndication, <User>_TxConfirmation, <User>_TriggerTransmit từ CanIf.",
    processing: "Đóng gói SduDataPtr và SduLength vào cấu trúc PduInfoType rồi gọi CanIf_Transmit(CanIfTxSduId, &PduInfo). Nhận lại L-PDU đã được CanIf lọc sạch và phân loại đúng đích theo từng tầng trên.",
    outputs: "CanIf_Transmit(), CanIf_SetDynamicTxId(), CanIf_ReadRxPduData(), CanIf_ReadRxNotifStatus()."
  },
  MOD_ECUM: {
    title: "EcuM (ECU State Manager — Wakeup Validation)",
    layer: "System Services (03_Services)",
    sws: "SWS_EcuM · SWS_CanIf_00219 · SWS_CanIf_00226",
    inputs: "Ngắt phần cứng đánh thức (Wakeup IRQ) khi xe ngủ; nhận callback EcuM_ValidateWakeupEvent() từ CanIf.",
    processing: "Phối hợp chống đánh thức giả (Glitch Filtering): Gọi CanIf_CheckWakeup() khi phát hiện xung -> bật lắng nghe CANIF_TX_OFFLINE -> gọi CanIf_CheckValidation() để kiểm tra xem CanIf đã nhận được khung CAN hợp lệ nào qua RxIndication chưa.",
    outputs: "CanIf_CheckWakeup(WakeupSource), CanIf_CheckValidation(WakeupSource)."
  },
  MOD_CANSM: {
    title: "CanSM, ComM & BswM (CAN Network & Mode Control)",
    layer: "Communication Services (03_Services)",
    sws: "SWS_CanSM · SWS_ComM · SWS_BswM",
    inputs: "Yêu cầu mạng từ SWC/ComM; nhận callback CanSM_ControllerBusOff, ControllerModeIndication, TransceiverModeIndication, ConfirmPnAvailability từ CanIf.",
    processing: "Là nhạc trưởng điều khiển trạng thái của CanIf: Chuyển ControllerMode (STOPPED <-> STARTED <-> SLEEP), điều khiển cổng PduMode (ONLINE, TX_OFFLINE khi Silent/BOR, TX_OFFLINE_ACTIVE khi ECU Passive), gọi SetBaudrate và đọc GetTxConfirmationState sau Bus-Off.",
    outputs: "CanIf_SetControllerMode(), CanIf_SetPduMode(), CanIf_SetTrcvMode(), CanIf_SetBaudrate(), CanIf_GetTxConfirmationState(), CanIf_ClearTrcvWufFlag()."
  },
  MOD_CANIF: {
    title: "CanIf (CAN Interface — Trọng Tâm Mô Phỏng)",
    layer: "ECU Abstraction Layer (04_ECU_Abstraction)",
    sws: "SWS_CanIf (ModuleId = 60 / 0x003C · R20-11 / R22-11 / R23-11)",
    inputs: "Lệnh truyền & điều khiển từ PduR, CanTp, CanNm, CanTSyn, CDD, CanSM, EcuM; ngắt Rx/Tx/BusOff/Mode từ CanDrv & CanTrcv.",
    processing: "1. Kiểm soát trạng thái qua ControllerMode & PduMode + PN Tx Filter.\n2. Ánh xạ L-PDU sang FullCAN/BasicCAN HTH, gắn Bit 31 (Ext) & Bit 30 (FD) vào Can_IdType.\n3. Xếp hàng ưu tiên theo CAN ID trong CanIfTxBuffer khi Can_Write() trả về CAN_BUSY và tự động xả trong TxConfirmation().\n4. Lọc phần mềm (Mask/BinarySearch) + DLC Check trong RxIndication() rồi điều phối lên đúng UL.",
    outputs: "Can_Write(), Can_SetControllerMode(), Can_SetBaudrate(), CanTrcv_SetOpMode(); callbacks lên CanSM, EcuM, PduR, CanTp, CanNm, CanTSyn, Det, IdsM."
  },
  MOD_CANDRV: {
    title: "CanDrv (MCAL CAN Controller Driver · HTH & HRH)",
    layer: "MCAL Layer (05_MCAL)",
    sws: "SWS_Can · SWS_Can_00416",
    inputs: "Lệnh Can_Write(Hth, &CanPdu), Can_SetControllerMode(), Can_SetBaudrate() từ CanIf; khung tín hiệu vật lý từ Transceiver.",
    processing: "Quản lý thanh ghi phần cứng và các Hardware Object (HTH/HRH FullCAN 1:1 & BasicCAN M:1). Trả về CAN_BUSY nếu HTH đang kẹt; phát ngắt RxIndication, TxConfirmation, TriggerTransmit, ControllerBusOff (khi TEC > 255) và ControllerModeIndication lên CanIf.",
    outputs: "CanIf_TxConfirmation(), CanIf_RxIndication(), CanIf_TriggerTransmit(), CanIf_ControllerBusOff(), CanIf_ControllerModeIndication()."
  },
  MOD_CANTRCV: {
    title: "CanTrcv (CAN Transceiver Driver · Partial Networking)",
    layer: "ECU Abstraction Layer (04_ECU_Abstraction)",
    sws: "SWS_CanTrcv · ISO 11898-2",
    inputs: "Lệnh CanTrcv_SetOpMode(NORMAL/STANDBY/SLEEP), CheckWakeup, ClearTrcvWufFlag, CheckWakeFlag từ CanIf; tín hiệu vi sai CAN_H/CAN_L.",
    processing: "Điều khiển IC thu phát CAN ngoại vi (VD: TJA1145 qua SPI). Ở chế độ ngủ hỗ trợ PN, giải mã phần cứng Wake-Up Frame (WUF) để đánh thức MCU đúng lúc.",
    outputs: "CanIf_TransceiverModeIndication(), CanIf_ClearTrcvWufFlagIndication(), CanIf_CheckTrcvWakeFlagIndication(), CanIf_ConfirmPnAvailability()."
  },
  MOD_DET: {
    title: "DET & IdsM (Error Tracer & Intrusion Detection)",
    layer: "System & Security Services (03_Services)",
    sws: "SWS_Det · SWS_IdsM · SWS_CanIf",
    inputs: "Det_ReportError() / Det_ReportRuntimeError() (ModuleId=60) và IdsM_SetSecurityEvent() từ CanIf.",
    processing: "Ghi nhận lỗi phát triển (UNINIT, INVALID_TXPDUID, PARAM_HOH, PARAM_CANID, PARAM_POINTER), lỗi Runtime (CANIF_E_INVALID_DATA_LENGTH = 0x32, CANIF_E_TXPDU_LENGTH_EXCEEDED = 0x33) và sự kiện an ninh khi phát hiện khung CAN bất thường.",
    outputs: "Cảnh báo trực tiếp trên Thanh ghi 8-Bit B (Bit 0 DET_ERR), API Trace & Inspector."
  }
};

const ABBREVIATIONS = [
  // CORE (12)
  { abbr: "CanIf", full: "CAN Interface (ModuleId 60 / 0x003C)", cat: "CORE", desc: "Module tầng ECU Abstraction tách biệt các tầng dịch vụ (PduR, CanTp, CanNm, CanSM) khỏi chi tiết Mailbox phần cứng của CanDrv và CanTrcv." },
  { abbr: "CanDrv", full: "CAN Controller Driver (MCAL)", cat: "CORE", desc: "Driver tầng MCAL điều khiển trực tiếp thanh ghi phần cứng bộ điều khiển CAN/CAN-FD (M_CAN, FlexCAN) và quản lý Mailbox HOH." },
  { abbr: "CanTrcv", full: "CAN Transceiver Driver", cat: "CORE", desc: "Module điều khiển IC thu phát vật lý (CAN_H/CAN_L, VD: TJA1145), chuyển đổi Normal/Standby/Sleep và hỗ trợ Selective Wakeup PN." },
  { abbr: "HOH", full: "Hardware Object Handle", cat: "CORE", desc: "Định danh trừu tượng của một bộ đệm phần cứng (Mailbox / Message RAM) trên bộ điều khiển CAN, gồm HTH (truyền) và HRH (nhận)." },
  { abbr: "HTH", full: "Hardware Transmit Handle", cat: "CORE", desc: "Mailbox phần cứng chuyên dùng cho chiều truyền; CanIf ánh xạ CanIfTxSduId sang HTH để gọi xuống Can_Write(Hth, &CanPdu)." },
  { abbr: "HRH", full: "Hardware Receive Handle", cat: "CORE", desc: "Mailbox phần cứng chuyên dùng cho chiều nhận (kèm bộ lọc phần cứng); truyền vào CanIf_RxIndication(&Mailbox, &PduInfo)." },
  { abbr: "FullCAN", full: "Full CAN Hardware Object (1:1 Mapping)", cat: "CORE", desc: "Cơ chế gán độc quyền 1 Mailbox phần cứng cho duy nhất 1 CAN ID (không cần Software Filter chiều nhận hay TxBuffer chiều truyền)." },
  { abbr: "BasicCAN", full: "Basic CAN Hardware Object (M:1 Multiplex)", cat: "CORE", desc: "Cơ chế cho phép nhiều L-PDU dùng chung 1 Mailbox phần cứng (cần CanIfTxBuffer ở chiều Tx và Software Filter ở chiều Rx)." },
  { abbr: "L-PDU", full: "Data Link Layer Protocol Data Unit", cat: "CORE", desc: "Khung dữ liệu ở tầng Liên kết dữ liệu CAN (gồm CAN ID, DLC và Payload) trao đổi giữa CanIf và CanDrv." },
  { abbr: "I-PDU", full: "Interaction Layer Protocol Data Unit", cat: "CORE", desc: "Gói dữ liệu ở tầng dịch vụ (COM, DCM, PduR, SecOC) trước khi được CanIf ánh xạ thành L-PDU có gắn CAN ID và HOH." },
  { abbr: "SDU", full: "Service Data Unit (PduInfoType Payload)", cat: "CORE", desc: "Phần dữ liệu payload (SduDataPtr + SduLength) truyền qua ranh giới giữa các module thông qua cấu trúc chuẩn PduInfoType." },
  { abbr: "SchM ExclusiveArea", full: "Schedule Manager Critical Section Lock", cat: "CORE", desc: "Vùng khóa ngắt bảo vệ hàng đợi CanIfTxBuffer khỏi tranh chấp giữa Task ứng dụng gọi Transmit và CAN ISR gọi TxConfirmation." },

  // TX (12)
  { abbr: "CanIf_Transmit", full: "Transmit Request API (ServiceId 0x49)", cat: "TX", desc: "API trung tâm do PduR/CanTp/CanNm gọi để gửi Tx L-PDU; kiểm tra ControllerMode/PduMode/PN Filter rồi gọi Can_Write hoặc đẩy vào TxBuffer." },
  { abbr: "CanIf_TxConfirmation", full: "Transmit Confirmation Callback (0x13)", cat: "TX", desc: "Callback do CanDrv gọi khi phát xong khung lên bus; giải phóng HTH, xả gói ưu tiên cao nhất trong CanIfTxBuffer và báo <User_TxConfirmation>." },
  { abbr: "CanIfTxBuffer", full: "CanIf Transmit Priority Queue (RAM)", cat: "TX", desc: "Bộ đệm RAM lưu các Tx L-PDU khi Can_Write() trả về CAN_BUSY trên BasicCAN HTH, sắp xếp theo thứ tự ưu tiên CAN ID (SWS_CanIf_00381)." },
  { abbr: "CAN_BUSY", full: "MCAL Can_Write Hardware Mailbox Busy", cat: "TX", desc: "Mã trả về của Can_Write() báo hiệu thanh ghi Mailbox HTH đang kẹt khung trước chưa phát xong, kích hoạt xếp hàng vào CanIfTxBuffer." },
  { abbr: "Inner Priority Inversion", full: "Priority Inversion inside Tx Buffer", cat: "TX", desc: "Hiện tượng gói ưu tiên thấp (ID lớn) kẹt làm nghẽn gói ưu tiên cao (ID nhỏ) nếu dùng FIFO; được CanIf giải quyết bằng Priority Queue theo CAN ID." },
  { abbr: "Overwrite in Place", full: "Same TxPduId Overwrite Rule (SWS_CanIf_00068)", cat: "TX", desc: "Khi cùng một TxPduId được gọi Transmit lần nữa lúc đang chờ trong CanIfTxBuffer, CanIf ghi đè payload mới nhất tại chỗ." },
  { abbr: "CanIf_TriggerTransmit", full: "Pull Latest Tx Data Callback (0x41)", cat: "TX", desc: "Cơ chế kéo dữ liệu tươi mới nhất từ tầng trên (CanNm/PduR) ngay sát thời điểm phần cứng bắt đầu phát lên dây bus (SWS_CanIf_00883)." },
  { abbr: "CanIf_SetDynamicTxId", full: "Runtime Dynamic CAN ID Update (0x0C)", cat: "TX", desc: "Hàm cho phép đổi nóng CAN ID của một DYNAMIC Tx L-PDU trong RAM lúc chạy (dùng cho J1939/XCP, SWS_CanIf_00189)." },
  { abbr: "CanIfTxPduTruncation", full: "Tx L-PDU Payload Truncation Flag", cat: "TX", desc: "Khi TRUE và SduLength > maxLen, CanIf báo Runtime Error 0x33 nhưng vẫn cắt gọn đúng maxLen để truyền; nếu FALSE thì hủy truyền." },
  { abbr: "CANIF_ONLINE", full: "PduMode 0x03: Full Tx & Rx Enabled", cat: "TX", desc: "Chế độ cổng đường truyền mở thông suốt cả chiều gửi Tx lẫn chiều nhận Rx trên CAN Controller (SWS_CanIf_00008)." },
  { abbr: "CANIF_TX_OFFLINE_ACTIVE", full: "PduMode 0x02: Simulated Passive Tx", cat: "TX", desc: "Chế độ ECU Passive: Mở Rx, KHÔNG gọi Can_Write() ra bus vật lý nhưng vẫn trả về E_OK và gọi ngay <User_TxConfirmation>() ảo (SWS_CanIf_00072)." },
  { abbr: "CANIF_TX_OFFLINE", full: "PduMode 0x01: Rx Enabled, Tx Blocked", cat: "TX", desc: "Chế độ im lặng: Cho phép nhận khung Rx (dùng trong SilentCom, Wakeup Validation, BOR S_TX_OFF) nhưng chặn mọi CanIf_Transmit()." },

  // RX (12)
  { abbr: "CanIf_RxIndication", full: "Receive Indication Callback (0x14)", cat: "RX", desc: "Callback do CanDrv gọi khi nhận khung từ bus; chạy Software Filter, DLC Check, cập nhật WakeupValidation và điều phối lên UL." },
  { abbr: "Can_IdType", full: "32-Bit CAN Identifier with MSB Flags", cat: "RX", desc: "Kiểu 32-bit chuẩn SWS_Can_00416: Bit 31 (0x80000000)=Extended 29-bit, Bit 30 (0x40000000)=CAN FD, Bit 28..0=CAN ID." },
  { abbr: "EXT_ID (Bit 31)", full: "Extended 29-bit Identifier Flag (0x80000000)", cat: "RX", desc: "Bit cao nhất của Can_IdType: 1 = khung Extended 29-bit (J1939/UDS Fixed), 0 = khung Standard 11-bit (0x000..0x7FF)." },
  { abbr: "FD_BIT (Bit 30)", full: "CAN FD Frame Flag (0x40000000)", cat: "RX", desc: "Bit 30 của Can_IdType: 1 = khung CAN FD (tối đa 64 Bytes + BRS), 0 = khung Classical CAN 2.0B (tối đa 8 Bytes)." },
  { abbr: "CAN FD", full: "CAN with Flexible Data-Rate (ISO 11898-1)", cat: "RX", desc: "Chuẩn CAN thế hệ mới hỗ trợ Payload lên tới 64 bytes và tốc độ dữ liệu 2..5 Mbps nhờ chuyển nhịp BRS." },
  { abbr: "BRS", full: "Bit Rate Switch (CAN FD Header Bit)", cat: "RX", desc: "Bit điều khiển trong khung CAN FD cho phép tăng tốc độ truyền từ pha Arbitration (500 kbps) sang pha Data (2 Mbps)." },
  { abbr: "Software Acceptance Filter", full: "CanIf Rx Software Filtering (SWS_CanIf_00030)", cat: "RX", desc: "Bộ lọc phần mềm trong CanIf_RxIndication() cho BasicCAN HRH theo kiểu MASK, BINARY_SEARCH, LINEAR hoặc TABLE." },
  { abbr: "DLC", full: "Data Length Code (Payload Size in Bytes)", cat: "RX", desc: "Số byte dữ liệu hợp lệ của khung CAN/CAN-FD (0..8 cho CAN 2.0; 0..64 cho CAN FD)." },
  { abbr: "CanIfPrivateDlcCheck", full: "Rx Minimum DLC Verification (SWS_CanIf_00026)", cat: "RX", desc: "Kiểm tra CanDlc >= CanIfRxPduDataLength; nếu ngắn hơn thì hủy khung và báo Runtime Error CANIF_E_INVALID_DATA_LENGTH (0x32)." },
  { abbr: "UL Dispatcher", full: "Upper Layer Rx/Tx Indication Dispatcher", cat: "RX", desc: "Cơ chế phân phát gói tin từ CanIf lên đúng tầng trên: PduR (COM/SecOC), CanTp (DCM), CanNm, CanTSyn hoặc CDD." },
  { abbr: "CanIf_ReadRxPduData", full: "Polling Read Buffered Rx Data (0x06)", cat: "RX", desc: "Hàm cho phép tầng trên đọc chủ động payload Rx mới nhất được CanIf lưu sẵn trong RAM (khi CanIfRxPduReadData=TRUE)." },
  { abbr: "CanIf_ReadRxNotifStatus", full: "Polling Read & Clear Rx Notification Flag (0x08)", cat: "RX", desc: "Hàm trả về CANIF_TX_RX_NOTIFICATION nếu có khung mới về kể từ lần đọc trước và tự động xóa cờ ngay sau khi đọc." },

  // MODE (12)
  { abbr: "Can_ControllerStateType", full: "Controller Mode Enum (SWS_CanIf_00308)", cat: "MODE", desc: "4 trạng thái của CAN Controller: CAN_CS_UNINIT (0), CAN_CS_STOPPED (1), CAN_CS_STARTED (2), CAN_CS_SLEEP (3)." },
  { abbr: "CAN_CS_STARTED", full: "Controller State: Active on CAN Bus (0x02)", cat: "MODE", desc: "Trạng thái bình thường cho phép tham gia truyền/nhận khung trên dây bus CAN vật lý." },
  { abbr: "CAN_CS_STOPPED", full: "Controller State: Initialized / Halted (0x01)", cat: "MODE", desc: "Controller đã Init nhưng ngắt khỏi bus (cầu nối bắt buộc giữa STARTED và SLEEP); mọi CanIfTxBuffer bị xóa sạch tại đây." },
  { abbr: "CAN_CS_SLEEP", full: "Controller State: Low Power Sleep (0x03)", cat: "MODE", desc: "Trạng thái ngủ tiết kiệm điện năng của khối ngoại vi CAN Controller MCU, chờ xung đánh thức trên bus." },
  { abbr: "CANIF_OFFLINE", full: "PduMode 0x00: Both Tx & Rx Blocked", cat: "MODE", desc: "Khóa hoàn toàn cả chiều truyền Tx lẫn chiều nhận Rx và xóa sạch CanIfTxBuffer của Controller." },
  { abbr: "CanIf_ControllerBusOff", full: "Bus-Off Interrupt Callback (0x16)", cat: "MODE", desc: "Callback do CanDrv gọi khi TEC > 255: CanIf tự chuyển về CAN_CS_STOPPED, khóa CANIF_TX_OFFLINE, xóa TxBuffer và báo CanSM." },
  { abbr: "CanIf_GetTxConfirmationState", full: "Query Successful Tx Flag (0x19)", cat: "MODE", desc: "Trả về CANIF_TX_RX_NOTIFICATION nếu đã có >=1 khung TxConfirmation từ lần Init/Start gần nhất (dùng xác nhận hết Bus-Off)." },
  { abbr: "CanIfPnFilter", full: "Partial Networking Tx Filter (SWS_CanIf_00750)", cat: "MODE", desc: "Bộ lọc chặn các Tx L-PDU thường khi ECU mới thức dậy, chỉ cho TxPdu có PnFilterPdu=TRUE (CanNm) đi qua cho tới khi mở khóa." },
  { abbr: "WUF", full: "Wake-Up Frame (PN Selective Wakeup)", cat: "MODE", desc: "Khung CAN đánh thức chọn lọc khớp mẫu cấu hình trong IC Transceiver (TJA1145) để đánh thức đúng ECU mục tiêu." },
  { abbr: "CanIf_CheckWakeup", full: "Hardware Wakeup Detection API (0x11)", cat: "MODE", desc: "API do EcuM gọi khi có xung đánh thức để kiểm tra xem CanDrv/CanTrcv có thực sự ghi nhận sự kiện Wakeup hay không." },
  { abbr: "CanIf_CheckValidation", full: "Rx-Confirmed Wakeup Validation API (0x12)", cat: "MODE", desc: "API chống nhiễu do EcuM gọi: chỉ báo EcuM_ValidateWakeupEvent() nếu CanIf đã nhận được >=1 khung CAN hợp lệ qua RxIndication." },
  { abbr: "CanIfWakeupCheckValidByNM", full: "NM-Only Wakeup Validation Option", cat: "MODE", desc: "Cấu hình khắt khe buộc khung xác thực Wakeup phải là bản tin của CanNm (loại bỏ khả năng bị đánh thức giả bởi khung khác)." },

  // API (10)
  { abbr: "CanIf_SetControllerMode", full: "Request Controller State Change (0x03)", cat: "API", desc: "Hàm bất đồng bộ do CanSM gọi xuống Can_SetControllerMode(); hoàn tất khi CanIf_ControllerModeIndication() trả về." },
  { abbr: "CanIf_SetPduMode", full: "Set PduMode Gate API (0x09)", cat: "API", desc: "Hàm đồng bộ do CanSM gọi để chuyển đổi cổng đường truyền giữa OFFLINE, TX_OFFLINE, TX_OFFLINE_ACTIVE và ONLINE." },
  { abbr: "CanIf_SetTrcvMode", full: "Request Transceiver OpMode API (0x0D)", cat: "API", desc: "Hàm bất đồng bộ điều khiển IC Transceiver chuyển sang NORMAL, STANDBY hoặc SLEEP thông qua CanTrcv_SetOpMode()." },
  { abbr: "CanIf_SetBaudrate", full: "Switch Controller Baudrate API (0x27)", cat: "API", desc: "Hàm chuyển cấu hình tốc độ truyền (BaudRateConfigID) xuống Can_SetBaudrate(), thường dùng cho dịch vụ chẩn đoán $87 LinkControl." },
  { abbr: "CanIf_GetVersionInfo", full: "Read Module Version API (0x0B)", cat: "API", desc: "Trả về VendorId, ModuleId (60 / 0x003C) và phiên bản phần mềm của CanIf vào con trỏ Std_VersionInfoType." },
  { abbr: "CANIF_E_INVALID_DATA_LENGTH", full: "Runtime Error 0x32: Rx DLC Too Short", cat: "API", desc: "Lỗi Runtime báo qua Det_ReportRuntimeError() khi khung nhận có CanDlc < CanIfRxPduDataLength (SWS_CanIf_00168)." },
  { abbr: "CANIF_E_TXPDU_LENGTH_EXCEEDED", full: "Runtime Error 0x33: Tx Payload Overflow", cat: "API", desc: "Lỗi Runtime báo khi SduLength truyền xuống vượt quá giới hạn tối đa của Tx L-PDU (SWS_CanIf_00893)." },
  { abbr: "CANIF_E_PARAM_CANID", full: "DET Error 0x0A: Invalid CanId Parameter", cat: "API", desc: "Lỗi DET bắn ra khi truyền CAN ID sai phạm vi (>0x7FF cho Standard hoặc >0x1FFFFFFF cho Extended)." },
  { abbr: "CANIF_E_PARAM_HOH", full: "DET Error 0x0C: Invalid HOH Parameter", cat: "API", desc: "Lỗi DET bắn ra trong CanIf_RxIndication() nếu Mailbox->Hoh không tồn tại trong bảng cấu hình HRH." },
  { abbr: "IdsM_SetSecurityEvent", full: "AUTOSAR R20-11+ Security Event (CANIF_SEV_*)", cat: "API", desc: "Giao diện báo cáo sự kiện an ninh (VD: sai DLC, ID bất thường, Bus-Off liên tiếp) từ CanIf sang Intrusion Detection System Manager." }
];
