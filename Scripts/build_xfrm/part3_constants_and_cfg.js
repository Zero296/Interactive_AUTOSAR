// ==================== XFRM CONSTANTS, REGISTERS, MODULES, TOOLTIPS & ABBREVIATIONS ====================

const XFRM_RETURN_ERR_BITS = [
  { bit: 7, key: 'HARD_ERR_B7', label: 'HARD_ERR', severity: 'err', desc: 'Bit 7 (MSB): Hard Transformer Error (0x80..0xFF). Nếu =1 trên Rx, RTE NGẮT CHUỖI NGAY (Abort Chain) và trả RTE_E_HARD_TRANSFORMER_ERROR (0x88) cho SWC.' },
  { bit: 6, key: 'E2E_PRF_B6', label: 'PRF_B6', severity: 'warn', desc: 'Bit 6: High Nibble Bit 2 của E2EXf hoặc lỗi Version của SomeIpXf (VD: 0x87 WrongProtocolVersion / 0x88 WrongInterfaceVersion).' },
  { bit: 5, key: 'E2E_SEQ_CRC', label: 'SEQ_CRC', severity: 'warn', desc: 'Bit 5: Cảnh báo mất đồng bộ chuỗi Counter (WRONGSEQUENCE = 0x2_) hoặc CRC lỗi (0x3_ = bit5|bit4).' },
  { bit: 4, key: 'E2E_REP_ERR', label: 'REP_ERR', severity: 'warn', desc: 'Bit 4: Cờ khung lặp Counter Delta=0 (REPEATED = 0x1_) hoặc tham gia tạo mã CRC lỗi (E2E_P_ERROR = 0x3_).' },
  { bit: 3, key: 'SER_ERR_B3', label: 'SER_ERR', severity: 'err', desc: 'Bit 3: Lỗi Serializer/Deserializer (SomeIpXf Malformed 0x89 / Unknown TLV HardErr) hoặc cờ RTE 0x88/0x8A overlay.' },
  { bit: 2, key: 'SM_NODATA', label: 'SM_NODAT', severity: 'warn', desc: 'Bit 2: Trạng thái E2E_SM_NODATA (0x_1) hoặc E2E_SM_DEINIT (0x_4) trong giai đoạn khởi động cửa sổ E2E.' },
  { bit: 1, key: 'SM_INVALID', label: 'SM_INVLD', severity: 'err', desc: 'Bit 1: Trạng thái E2E_SM_INVALID (0x_3) — Vượt MaxErrorStateValid, kết hợp với Bit 7 = 1 ép ngắt chuỗi!' },
  { bit: 0, key: 'SM_VALID_OK', label: 'SM_OK', severity: 'ok', desc: 'Bit 0: Xác thực chuỗi an toàn E2E_SM_VALID (0x_0) và luồng dữ liệu hợp lệ (RTE_E_OK).' }
];

const XFRM_PIPELINE_BITS = [
  { bit: 7, key: 'XFRM_INIT', label: 'INIT', severity: 'ok', desc: 'Bit 7: Trạng thái khởi tạo họ module Xfrm (<Mip>_Init() đã chạy). Nếu = 0, mọi API chính đều kích DET XFRM_E_UNINIT (0x01).' },
  { bit: 6, key: 'DIR_INV_RX', label: 'RX_INV', severity: 'warn', desc: 'Bit 6: Chiều luồng xử lý. 0 = Tx Forward (Serializer -> E2EXf); 1 = Rx Inverse (E2EXf_Inv trước -> Deserializer sau).' },
  { bit: 5, key: 'MODE_SOMEIP', label: 'SOMEIP', severity: 'ok', desc: 'Bit 5: Họ Serializer chính. 0 = ComXf (#175 trên COM CAN); 1 = SomeIpXf (#174 trên LdCom Ethernet).' },
  { bit: 4, key: 'E2E_CHAINED', label: 'E2E_ON', severity: 'ok', desc: 'Bit 4: Ghép tầng E2EXf (#176) vào DataTransformation Chain (ActiveProfile != NONE).' },
  { bit: 3, key: 'INPLACE_BUF', label: 'INPLACE', severity: 'ok', desc: 'Bit 3: XfrmBufferComputationMode = IN_PLACE (HeaderShift Zero-Copy dùng chung 1 RAM array) vs 0 = OUT_OF_PLACE.' },
  { bit: 2, key: 'BIG_ENDIAN', label: 'BIG_END', severity: 'ok', desc: 'Bit 2: Thứ tự byte tuần tự hóa (1 = Big-Endian Motorola / Network Byte Order của SOME/IP; 0 = Little-Endian Intel).' },
  { bit: 1, key: 'CS_TLV_EXT', label: 'TLV_RPC', severity: 'warn', desc: 'Bit 1: Bật tính năng mở rộng của SomeIpXf (TLV WireType+DataId hoặc giao dịch Client-Server RPC Request/Response/Error).' },
  { bit: 0, key: 'DET_ERR_FLG', label: 'DET_ERR', severity: 'err', desc: 'Bit 0: Cờ phát hiện vừa có báo cáo lỗi DET (Det_ReportError hoặc Det_ReportRuntimeError 0x05).' }
];

const E2E_PROFILES_META = {
  NONE: { name: 'NONE (Không bọc E2E)', headerBytes: 0, crcType: 'Không có', counterBits: 0, dataIdBits: 0, lengthFieldBytes: 0, sws: 'ASWS_TransformerGeneral' },
  PROFILE_01: { name: 'E2E Profile 01 (CAN 8B)', headerBytes: 2, crcType: 'CRC-8-SAE-J1850', counterBits: 4, dataIdBits: 16, lengthFieldBytes: 0, sws: 'SWS_E2E_00075' },
  PROFILE_05: { name: 'E2E Profile 05 (CAN-FD)', headerBytes: 3, crcType: 'CRC-16-CCITT', counterBits: 8, dataIdBits: 16, lengthFieldBytes: 0, sws: 'SWS_E2E_00405' },
  PROFILE_04: { name: 'E2E Profile 04 (Ethernet)', headerBytes: 12, crcType: 'CRC-32P4 (0xF4ACFB13)', counterBits: 16, dataIdBits: 32, lengthFieldBytes: 2, sws: 'SWS_E2E_00372' },
  PROFILE_07: { name: 'E2E Profile 07 (Large SOA)', headerBytes: 20, crcType: 'CRC-64-ECMA', counterBits: 32, dataIdBits: 32, lengthFieldBytes: 4, sws: 'SWS_E2E_00478' }
};

const E2E_CHECK_STATUS_MAP = {
  0x00: { name: 'E2E_P_OK', desc: 'CRC & Counter đúng, dữ liệu mới' },
  0x10: { name: 'E2E_P_REPEATED', desc: 'CRC đúng nhưng Counter lặp lại (Delta = 0)' },
  0x20: { name: 'E2E_P_WRONGSEQUENCE', desc: 'CRC đúng nhưng nhảy Counter (> MaxDeltaCounter)' },
  0x30: { name: 'E2E_P_ERROR', desc: 'Sai CRC, sai Length hoặc sai DataID' },
  0x40: { name: 'E2E_P_NOTAVAILABLE', desc: 'Chưa nhận được khung mới từ tầng dưới' },
  0x50: { name: 'E2E_P_NONEWDATA', desc: 'Buffer không có cờ dữ liệu mới' }
};

const E2E_SM_STATE_MAP = {
  0x00: { name: 'E2E_SM_VALID', desc: 'Cửa sổ trượt đạt chuẩn an toàn (Bit 7=0 nếu Soft hoặc OK)' },
  0x01: { name: 'E2E_SM_NODATA', desc: 'Chưa nhận khung dữ liệu đầu tiên' },
  0x02: { name: 'E2E_SM_INIT', desc: 'Đang tích lũy đủ MinOkStateValid khung tốt' },
  0x03: { name: 'E2E_SM_INVALID', desc: 'Vượt MaxErrorStateValid -> Lỗi cứng Hard Error (Bit 7=1)!' },
  0x04: { name: 'E2E_SM_DEINIT', desc: 'E2E State Machine chưa khởi tạo' }
};

const SOMEIP_ERR_CODES = {
  0x00: 'E_OK (0x00)',
  0x81: 'E_SER_GENERIC_ERROR / AppError (0x81)',
  0x87: 'E_SER_WRONG_PROTOCOL_VERSION (0x87)',
  0x88: 'E_SER_WRONG_INTERFACE_VERSION (0x88)',
  0x89: 'E_SER_MALFORMED_MESSAGE (0x89)',
  0x8A: 'E_SER_WRONG_MESSAGE_TYPE (0x8A)'
};

const MODULES_INFO = {
  SWC: {
    id: 'SWC (Application Layer)',
    moduleId: 'SW-Component',
    sws: 'AUTOSAR RTE / VFB Specification (R23-11)',
    role: 'Thành phần phần mềm ứng dụng (Sender, Receiver, Client, Server Runnable)',
    input: 'Nhận struct dữ liệu sạch (ApplicationDataType) từ RTE (chỉ khi không bị Abort Hard Error 0x88) hoặc nhận Std_ReturnType từ Rte_Call/Rte_Result.',
    processing: 'Hoàn toàn TRONG SUỐT (transparent) với định dạng byte mạng, Endianness, TLV hay CRC E2E. Chỉ đọc/ghi biến C nguyên thủy hoặc Struct ứng dụng.',
    output: 'Ghi dữ liệu vào Rte_Write_<Port>_<Data>(&struct) hoặc gọi hàm RPC Rte_Call_<Port>_<Op>(in, &out).',
    apis: ['Rte_Write_PpVehDyn_Status(&data)', 'Rte_Read_RpVehDyn_Status(&data)', 'Rte_Call_RpPlanner_CalcPath(in, &out)', 'Rte_Result_RpPlanner_CalcPath(&out)']
  },
  RTE: {
    id: 'RTE (Runtime Environment Orchestrator)',
    moduleId: 'ModuleId 2 (RTE)',
    sws: 'AUTOSAR SWS RTE & ASWS TransformerGeneral (R23-11)',
    role: 'Mã keo điều phối (Glue Code) gọi tuần tự các Transformer trong chuỗi DataTransformation',
    input: 'Chiều Tx: nhận Struct từ SWC. Chiều Rx: nhận mảng byte thô từ Com_ReceiveSignalGroupArray() hoặc callback Rte_LdComCbkRxIndication().',
    processing: 'Cấp phát Rte_XfrmBuffer[], tính HeaderShift cho IN_PLACE (Zero-Copy) hoặc 2 mảng cho OUT_OF_PLACE. Điều phối Tx (Serializer -> E2EXf) và đảo ngược Rx (E2EXf_Inv -> Deserializer). Dùng Rte_Cs_TransactionHandleType khớp cặp RPC Request/Response và phủ mã lỗi RTE_E_HARD_TRANSFORMER_ERROR (0x88) / RTE_E_SOFT_TRANSFORMER_ERROR (0x8A).',
    output: 'Chiều Tx: đẩy mảng byte xuống Com / LdCom. Chiều Rx: trả Struct sạch hoặc mã lỗi về SWC.',
    apis: ['Rte_ComHook_*', 'Rte_LdComCbkRxIndication(id, PduInfoPtr)', 'SomeIpXf_ExtractProtocolHeaderFields(...)']
  },
  Det: {
    id: 'DET (Default Error Tracer)',
    moduleId: 'ModuleId 15 (0x000F)',
    sws: 'AUTOSAR SWS DefaultErrorTracer (R23-11)',
    role: 'Bộ ghi nhận và truy vết lỗi phát triển (Dev Error) và lỗi runtime (Runtime Error)',
    input: 'Nhận báo cáo từ SomeIpXf (#174), ComXf (#175), E2EXf (#176) khi phát hiện trạng thái bất hợp lệ.',
    processing: 'Phân biệt Development Errors (chỉ bật khi XfrmDevErrorDetect = TRUE: 0x01 UNINIT, 0x02 INIT_FAILED, 0x03 PARAM, 0x04 PARAM_POINTER) với Runtime Errors (luôn bật cả bản Production: 0x05 XFRM_E_MALFORMED_MESSAGE).',
    output: 'Lưu bản ghi lỗi (ModuleId, InstanceId, ApiId, ErrorId) phục vụ debug/nhả hook lỗi hệ thống.',
    apis: ['Det_ReportError(ModuleId, InstanceId, ApiId, ErrorId)', 'Det_ReportRuntimeError(ModuleId, InstanceId, ApiId, ErrorId)']
  },
  ComXf: {
    id: 'ComXf (COM Transformer)',
    moduleId: 'ModuleId 175 (0x00AF)',
    sws: 'AUTOSAR SWS ComXf — COM Based Transformer (R23-11)',
    role: 'Tuần tự hóa tốc độ cao giữa Struct ISignalGroup và mảng byte phẳng I-PDU',
    input: 'Tx: Con trỏ struct const T* dataElement từ SWC. Rx (ComXf_Inv): Mảng byte const uint8* buffer[] đã được E2EXf_Inv kiểm tra.',
    processing: 'Đóng gói từng tín hiệu theo BitPosition, BitSize, ByteOrder (Motorola Big-Endian vs Intel Little-Endian), xử lý mở rộng dấu (sint16) và điền các bit trống bằng ComXfUnusedBitFillPattern (VD: 0xFF/0x00).',
    output: 'Tx: Ghi mảng byte phẳng để RTE gọi Com_SendSignalGroupArray(). Rx: Khôi phục struct cho SWC.',
    apis: ['ComXf_Init(config)', 'ComXf_<transformerId>(buffer, &bufLen, dataElement)', 'ComXf_Inv_<transformerId>(buffer, bufLen, &dataElement)', 'ComXf_GetVersionInfo(&ver)']
  },
  SomeIpXf: {
    id: 'SomeIpXf (SOME/IP Transformer)',
    moduleId: 'ModuleId 174 (0x00AE)',
    sws: 'AUTOSAR SWS SomeIpXf — SOME/IP Transformer (R23-11)',
    role: 'Tuần tự hóa Struct phức hợp, Mảng động, String, TLV & Giao thức RPC trên Ethernet',
    input: 'Tx: Struct/Tham số hàm từ SWC (+ Rte_Cs_TransactionHandleType nếu RPC). Rx: Luồng byte thô từ LdCom (hoặc sau E2EXf_Inv).',
    processing: 'Chèn/kiểm tra 8-byte SOME/IP Header (ClientId, SessionId, ProtoVer=0x01, IfVer, MsgType, RetCode); ghi LengthField (1/2/4B), Alignment Padding; mã hóa/bỏ qua thẻ TLV [WireType|DataId]; tách luồng nhanh qua SomeIpXf_ExtractProtocolHeaderFields().',
    output: 'Tx: Mảng byte SOME/IP (thiếu 8B đầu ServiceID/MethodID/Len do SoAd bổ sung). Rx: Struct, mảng động, hoặc lỗi 0x87..0x8A.',
    apis: ['SomeIpXf_Init(config)', 'SomeIpXf_<transformerId>(...)', 'SomeIpXf_Inv_<transformerId>(...)', 'SomeIpXf_ExtractProtocolHeaderFields(buf, len, &type, &res)', 'SomeIpXf_GetVersionInfo(&ver)']
  },
  E2EXf: {
    id: 'E2EXf (End-to-End Safety Transformer)',
    moduleId: 'ModuleId 176 (0x00B0)',
    sws: 'AUTOSAR SWS E2EXf & SWS E2E Library (R23-11)',
    role: 'Bảo vệ an toàn chức năng ISO 26262 (CRC + Counter + DataID + Length + E2E_SMCheck)',
    input: 'Tx: Buffer chứa payload do Serializer vừa tạo (hoặc &buf[HeaderShift] khi IN_PLACE). Rx: Frame nhận từ bus (luôn chạy TRƯỚC Deserializer!).',
    processing: 'Tx: Tăng Counter, nhúng DataID & Length, tính CRC (P01 CRC-8 / P05 CRC-16 / P04 CRC-32P4 / P07 CRC-64) và ghi E2E Header vào đầu buffer. Rx: Gọi E2E_PxxCheck() + E2E_SMCheck() cập nhật cửa sổ trượt, đóng gói mã trả về 2-Nibble [High:CheckStatus | Low:SMState] (Bit 7 = 1 nếu SM_INVALID).',
    output: 'Tx: Frame hoàn chỉnh có E2E Header. Rx: Payload sạch + Std_TransformerForwardCode trả về RTE.',
    apis: ['E2EXf_Init(config)', 'E2EXf_<transformerId>(buffer, &bufLen, inputBuffer, inLen)', 'E2EXf_Inv_<transformerId>(buffer, &bufLen, inputBuffer, inLen)', 'E2EXf_GetVersionInfo(&ver)']
  },
  Com: {
    id: 'AUTOSAR COM (Signal & SignalGroup Array)',
    moduleId: 'ModuleId 50 (0x0032)',
    sws: 'AUTOSAR SWS Communication (R23-11)',
    role: 'Truyền thông tin theo tín hiệu/nhóm tín hiệu trên mạng CAN, CAN-FD, LIN, FlexRay',
    input: 'Tx: Mảng byte đã biến đổi từ ComXf/E2EXf qua Com_SendSignalGroupArray(). Rx: I-PDU từ PduR_ComRxIndication().',
    processing: 'Thay vì mất hàng trăm chu kỳ CPU đóng gói từng signal trong ComMainFunction, COM copy thẳng mảng byte SignalGroupArray vào I-PDU buffer để gửi ngay xuống PduR.',
    output: 'Tx: PduR_ComTransmit(ComTxPduId, &PduInfo). Rx: Mảng byte trả lên RTE qua Com_ReceiveSignalGroupArray().',
    apis: ['Com_SendSignalGroupArray(SignalGroupId, SignalGroupArrayPtr)', 'Com_ReceiveSignalGroupArray(SignalGroupId, SignalGroupArrayPtr)']
  },
  LdCom: {
    id: 'LdCom (Large Data COM)',
    moduleId: 'ModuleId 49 (0x0031)',
    sws: 'AUTOSAR SWS Large Data COM (R23-11)',
    role: 'Cổng truyền dữ liệu kích thước lớn trực tiếp (Pass-Through) cho SomeIpXf & TP/Eth',
    input: 'Tx: PduInfoType* chứa buffer đã qua SomeIpXf (+E2EXf). Rx: Dữ liệu PDU lớn từ PduR_LdComRxIndication().',
    processing: 'Không hiểu cấu trúc tín hiệu bên trong (Zero Signal Unpacking) — truyền nguyên khối PduInfoPtr giữa RTE và PduR/SoAd với độ trễ cực thấp, hỗ trợ TP streaming (CopyTxData/CopyRxData) hoặc IF pass-through.',
    output: 'Tx: PduR_LdComTransmit(Id, PduInfoPtr). Rx: Đánh thức RTE qua Rte_LdComCbkRxIndication().',
    apis: ['LdCom_Transmit(Id, PduInfoPtr)', 'LdCom_RxIndication(RxPduId, PduInfoPtr)', 'Rte_LdComCbkRxIndication(...)']
  },
  BusIf: {
    id: 'PduR ➔ CanIf / SoAd (Physical Transport)',
    moduleId: 'ModuleId 51 / 60 / 56',
    sws: 'AUTOSAR SWS PduR / CanIf / SoAd (R23-11)',
    role: 'Định tuyến PDU và gắn đóng khung tầng liên kết (CAN-FD hoặc 16B SOME/IP TCP/UDP)',
    input: 'Nhận PduInfoPtr từ COM (kênh CAN) hoặc từ LdCom (kênh Ethernet SOME/IP).',
    processing: 'PduR định tuyến tới CanIf (truyền khung CAN 8B / CAN-FD 64B) hoặc SoAd (Socket Adaptor tự động ghép thêm 8 byte đầu gồm ServiceID + MethodID + TotalLength phía trước 8 byte Header của SomeIpXf để tạo thành Header SOME/IP 16 byte hoàn chỉnh trên dây Ethernet!).',
    output: 'Khung vật lý CAN/CAN-FD hoặc gói UDP/TCP Ethernet lên đường truyền vật lý.',
    apis: ['PduR_ComTransmit()', 'PduR_LdComTransmit()', 'CanIf_Transmit()', 'SoAd_IfTransmit()']
  }
};

const configTooltipData = {
  XfrmDevErrorDetect: {
    title: 'XfrmDevErrorDetect',
    ecucPath: 'SomeIpXfGeneral / ComXfGeneral / E2EXfGeneral',
    sws: 'SWS_ComXf_00010 / SWS_SomeIpXf_00010 / SWS_E2EXf_00010',
    desc: 'Bật/tắt cơ chế báo lỗi phát triển (Development Error Detection) qua Det_ReportError() khi gặp UNINIT (0x01), PARAM (0x03) hoặc PARAM_POINTER (0x04).',
    values: 'TRUE (Khuyên dùng trong Debug/SIL) | FALSE (Tắt Dev Error ở bản Production, nhưng Det_ReportRuntimeError 0x05 vẫn chạy!)'
  },
  ActiveTransformerChainPreset: {
    title: 'ActiveTransformerChainPreset',
    ecucPath: 'SystemTemplate / DataTransformation / TransformerChainRef',
    sws: 'ASWS_TransformerGeneral & TPS_SystemTemplate',
    desc: 'Chọn chuỗi DataTransformation đang cấu hình cho tín hiệu hoặc cổng RPC: dùng độc lập ComXf/SomeIpXf hoặc ghép nối tiếp thêm tầng an toàn E2EXf.',
    values: 'COMXF_ONLY | COMXF_E2E_P05 | COMXF_E2E_P01 | SOMEIPXF_ONLY | SOMEIPXF_E2E_P04 | SOMEIPXF_E2E_P07'
  },
  XfrmBufferComputationMode: {
    title: 'XfrmBufferComputationMode',
    ecucPath: 'DataTransformation / XfrmBufferComputation (RTE ECUC)',
    sws: 'ASWS_TransformerGeneral [SWS_Xfrm_00040]',
    desc: 'Quy định RTE cấp phát bộ đệm theo kiểu Zero-Copy dùng chung 1 mảng (IN_PLACE + HeaderShift) hay cấp phát 2 mảng tách biệt (OUT_OF_PLACE + memcpy).',
    values: 'IN_PLACE (Tiết kiệm RAM & 0 memcpy, Serializer viết dịch vào &buf[HeaderShift]) | OUT_OF_PLACE (Copy qua mảng trung gian)'
  },
  XfrmAllocatedRteBufferSize: {
    title: 'XfrmAllocatedRteBufferSize',
    ecucPath: 'RteBswModuleInstance / XfrmBufferLength',
    sws: 'SWS_Rte & ASWS_TransformerGeneral',
    desc: 'Tổng dung lượng mảng byte Rte_XfrmBuffer[] do RTE cấp phát tĩnh. Nếu nhỏ hơn tổng HeaderShift + SomeIpHdr + Payload sẽ gây lỗi tràn bộ đệm / DET 0x03.',
    values: '4 .. 256 Bytes (VD: CAN = 8B, SOME/IP+P04 DynArr = 32..96B)'
  },
  RteForwardSoftErrorToSwc: {
    title: 'RteForwardSoftErrorToSwc',
    ecucPath: 'RteSwComponentInstance / TransformerHardErrorEvent',
    sws: 'SWS_Rte_08752 / SWS_E2EXf_00032',
    desc: 'Khi E2EXf_Inv trả về mã có Bit 7 = 0 nhưng High Nibble != 0 (VD: 0x10 REPEATED hay 0x20 WRONGSEQUENCE trong giới hạn MaxErrorStateValid), RTE giữ lại payload giải mã và trả RTE_E_SOFT_TRANSFORMER_ERROR (0x8A).',
    values: 'TRUE (Giao dữ liệu kèm cờ cảnh báo 0x8A) | FALSE (Chặn mọi sai lệch như Hard Error)'
  },
  XfrmInitializedState: {
    title: 'XfrmInitializedState',
    ecucPath: 'BswM / EcuM Initialization State of Xfrm Modules',
    sws: 'SWS_ComXf_00017 / SWS_SomeIpXf_00101 / SWS_E2EXf_00037',
    desc: 'Biểu thị các hàm <Mip>_Init(ConfigPtr) đã được gọi sau khởi động ECU hay chưa. Nếu FALSE, lời gọi hàm Transformer sẽ kích DET XFRM_E_UNINIT (0x01).',
    values: 'TRUE (Đã Init, sẵn sàng phục vụ) | FALSE (Chưa Init — kích DET 0x01)'
  },
  ComXfSignalEndianness: {
    title: 'ComXfSignalEndianness',
    ecucPath: 'ISignalIPdu / ISignalToIPduMapping / PackingByteOrder',
    sws: 'SWS_ComXf_00018 [TPS_SYST_01053]',
    desc: 'Thứ tự byte khi ComXf đóng gói tín hiệu đa byte (uint16/sint16). BIG_ENDIAN (Motorola) đặt MSB trước tại offset thấp; LITTLE_ENDIAN (Intel) đặt LSB trước.',
    values: 'BIG_ENDIAN (VD: 1205 = 0x04 B5) | LITTLE_ENDIAN (VD: 1205 = 0xB5 04)'
  },
  ComXfUnusedBitFillPatternHex: {
    title: 'ComXfUnusedBitFillPatternHex',
    ecucPath: 'ComXfTransformationDescription / UnusedBitPattern',
    sws: 'SWS_ComXf_00020',
    desc: 'Giá trị byte/bit mặc định để ComXf lấp đầy toàn bộ các bit không có tín hiệu ánh xạ trong mảng byte I-PDU, tránh rò rỉ dữ liệu rác từ RAM.',
    values: '0xFF (Mặc định chuẩn CAN) | 0x00 | 0xAA | 0x55'
  },
  SwcInputVehicleSpeedKmh: {
    title: 'SwcInputVehicleSpeedKmh',
    ecucPath: 'SWC ApplicationDataType: BrakeStatus_t.VehicleSpeed (uint16)',
    sws: 'AUTOSAR Application Data Interface',
    desc: 'Giá trị đầu vào từ SWC cho trường tốc độ xe (đơn vị 0.1 km/h, uint16). Giá trị mặc định 1205 tương ứng 120.5 km/h = 0x04B5.',
    values: '0 .. 4000 (uint16 nguyên dương)'
  },
  SwcInputSteerAngleDeg: {
    title: 'SwcInputSteerAngleDeg',
    ecucPath: 'SWC ApplicationDataType: BrakeStatus_t.SteerAngle (sint16)',
    sws: 'SWS_ComXf (Signed Two\'s Complement & Sign Extension)',
    desc: 'Giá trị góc lái có dấu từ SWC (đơn vị 0.1 độ, sint16). Giá trị âm (VD: -120 = 0xFF88) kiểm chứng khả năng bảo toàn bit dấu bù 2 khi giải mã Rx.',
    values: '-1800 .. +1800 (sint16 bù 2)'
  },
  SwcInputGearPosition: {
    title: 'SwcInputGearPosition',
    ecucPath: 'SWC ApplicationDataType: BrakeStatus_t.Gear (uint4)',
    sws: 'SWS_ComXf Bit-Level Packing',
    desc: 'Giá trị số hộp số chiếm đúng 4 bit (BitSize=4). 4 bit cao còn lại của Byte 4 được ComXf điền theo ComXfUnusedBitFillPattern.',
    values: '0 .. 15 (4-bit Signal)'
  },
  ComSendSignalGroupArrayEnable: {
    title: 'ComSendSignalGroupArrayEnable',
    ecucPath: 'ComSignalGroup / ComDataBasedTransformationRef',
    sws: 'SWS_Com_00851 / SWS_Com_00852',
    desc: 'Khi TRUE, RTE sử dụng Com_SendSignalGroupArray() và Com_ReceiveSignalGroupArray() để đẩy cả mảng 1 lần thay vì từng Com_SendSignal().',
    values: 'TRUE (Bắt buộc cho ComXf tối ưu CPU) | FALSE (Đóng gói COM truyền thống)'
  },
  SomeIpXfServiceAndMethodIdHex: {
    title: 'SomeIpXfServiceAndMethodIdHex',
    ecucPath: 'SomeIpServiceInterfaceDeployment / ServiceId & MethodId',
    sws: 'PRS_SOMEIP_00030 (8-Byte đầu do SoAd gắn)',
    desc: 'Cặp 16-bit ServiceID:MethodID (4 bytes) + 4 bytes MessageLength tạo nên 8 byte đầu tiên của gói tin SOME/IP 16B do module SoAd thêm/kiểm tra.',
    values: 'Định dạng 0xSSSS:0xMMMM (VD: 0x1234:0x0001)'
  },
  SomeIpXfClientAndSessionIdHex: {
    title: 'SomeIpXfClientAndSessionIdHex',
    ecucPath: 'Rte_Cs_TransactionHandleType / SomeIpRequestId',
    sws: 'SWS_SomeIpXf_00112 (Byte 0..3 của 8B Header SomeIpXf)',
    desc: 'Định danh phiên giao dịch 32-bit gồm ClientId (16b) và SessionId (16b). SomeIpXf ghi trực tiếp vào Byte 0..3 và RTE dùng để khớp cặp Request-Response.',
    values: 'Định dạng 0xCCCC:0xSSSS (VD: 0x0001:0x0007)'
  },
  SomeIpXfProtocolVersion: {
    title: 'SomeIpXfProtocolVersion',
    ecucPath: 'SomeIpXf Header Byte 4 (SOME/IP Protocol Version)',
    sws: 'PRS_SOMEIP_00051 / SWS_SomeIpXf_00114',
    desc: 'Phiên bản giao thức SOME/IP tại Byte 4. Theo đặc tả AUTOSAR luôn bằng 0x01; nếu ECU nhận thấy != 0x01 sẽ trả lỗi E_SER_WRONG_PROTOCOL_VERSION (0x87).',
    values: '1 (0x01 Chuẩn AUTOSAR)'
  },
  SomeIpXfInterfaceVersion: {
    title: 'SomeIpXfInterfaceVersion',
    ecucPath: 'SomeIpXfTransformationDescription / InterfaceVersion',
    sws: 'SWS_SomeIpXf_00115',
    desc: 'Phiên bản Major của ServiceInterface tại Byte 5. Nếu lệch phiên bản cấu hình trên ECU nhận, SomeIpXf_Inv trả về E_SER_WRONG_INTERFACE_VERSION (0x88).',
    values: '1 .. 255 (Mặc định 1)'
  },
  SomeIpXfMessageType: {
    title: 'SomeIpXfMessageType',
    ecucPath: 'SomeIpXfTransformationDescription / MessageType (Byte 6)',
    sws: 'PRS_SOMEIP_00055 / SWS_SomeIpXf_00171',
    desc: 'Loại bản tin SOME/IP tại Byte 6: Notification (0x02 Fire&Forget Event), Request RPC (0x00), RequestNoReturn (0x01), Response (0x80), hoặc Error (0x81).',
    values: 'NOTIFICATION_0x02 | REQUEST_0x00 | REQUEST_NO_RETURN_0x01 | RESPONSE_0x80 | ERROR_0x81'
  },
  SomeIpXfStructAlignmentBytes: {
    title: 'SomeIpXfStructAlignmentBytes',
    ecucPath: 'SomeIpTransformationISignalProps / Alignment',
    sws: 'SWS_SomeIpXf_00138',
    desc: 'Bội số căn chỉnh bộ nhớ (Alignment Padding) cho các trường trong Struct/Array động. Nếu kích thước phần tử không chia hết Alignment, SomeIpXf tự chèn byte AlignPad 0x00.',
    values: '1 (Packed) | 2 | 4 (32-bit Word) | 8 (64-bit)'
  },
  SomeIpXfLengthFieldSize: {
    title: 'SomeIpXfLengthFieldSize',
    ecucPath: 'SomeIpTransformationDescription / SizeOfArrayLengthField',
    sws: 'SWS_SomeIpXf_00125',
    desc: 'Kích thước (1, 2 hoặc 4 bytes Big-Endian) của trường LengthField đặt ngay trước mảng động (Dynamic Array) hoặc chuỗi độ dài biến thiên.',
    values: '1 Byte | 2 Bytes | 4 Bytes (Chuẩn phổ biến nhất)'
  },
  SomeIpXfDynamicArrayElementCount: {
    title: 'SomeIpXfDynamicArrayElementCount',
    ecucPath: 'SWC Variable-Size Array RadarObj[N]',
    sws: 'SWS_SomeIpXf Dynamic Length Array Serialization',
    desc: 'Số phần tử thực tế N của mảng động RadarObj[] trong chu kỳ hiện tại. LengthField và tổng chiều dài gói tin tự động co giãn theo N.',
    values: '0 .. 8 phần tử (Mỗi phần tử RadarObj = 4 Bytes)'
  },
  SomeIpXfEnableTlvEncoding: {
    title: 'SomeIpXfEnableTlvEncoding',
    ecucPath: 'SomeIpTransformationDescription / ImplementsLegacyStringSerialization & TlvEncoding',
    sws: 'SWS_SomeIpXf_00201 / PRS_SOMEIP_00370',
    desc: 'Bật/tắt mã hóa mở rộng Tag-Length-Value (TLV). Mỗi trường dữ liệu được gắn thêm thẻ Tag 16-bit [Bit 14..12: WireType | Bit 11..0: DataId].',
    values: 'TRUE (Thêm thẻ Tag 2B, cho phép tương thích V1 <-> V2 OTA) | FALSE (Chuẩn tuần tự hóa cố định)'
  },
  SomeIpXfTlvWireType: {
    title: 'SomeIpXfTlvWireType',
    ecucPath: 'TLV 16-bit Tag Field Bits [14..12]',
    sws: 'PRS_SOMEIP_00376 (Wire Types 0..7)',
    desc: '3 bit WireType trong Tag quy định cách tính độ dài dữ liệu theo sau: 0..3 là độ dài cơ sở cố định (1/2/4/8B); 4..6 là kèm LengthField động (1/2/4B).',
    values: '0_8BIT_BASE | 1_16BIT_BASE | 2_32BIT_BASE | 3_64BIT_BASE | 4_LEN_1B | 5_LEN_2B | 6_LEN_4B'
  },
  SomeIpXfUnrecognizedTlvBehavior: {
    title: 'SomeIpXfUnrecognizedTlvBehavior',
    ecucPath: 'SomeIpXf General TLV Unknown DataId Handling',
    sws: 'PRS_SOMEIP_00385 / SWS_SomeIpXf TLV Deserialization',
    desc: 'Cách SomeIpXf_Inv (bản phần mềm V1 cũ) phản ứng khi gặp DataId lạ từ ECU V2 (VD: 0x0003): dùng WireType nhảy qua an toàn hay từ chối báo lỗi 0x89.',
    values: 'IGNORE_SKIP_UNKNOWN_TAG (Tương thích ngược) | REPORT_MALFORMED_HARD_ERR (0x89)'
  },
  SomeIpXfStringEncoding: {
    title: 'SomeIpXfStringEncoding',
    ecucPath: 'SomeIpTransformationISignalProps / StringEncoding',
    sws: 'PRS_SOMEIP_00084 / SWS_SomeIpXf String',
    desc: 'Chuẩn mã hóa chuỗi ký tự SOME/IP: chuỗi động UTF-8 (có BOM + null-terminator + LengthField), chuỗi cố định 16B hoặc UTF-16 Big-Endian.',
    values: 'UTF8_DYNAMIC_LEN | UTF8_FIXED_16B | UTF16_BE_DYNAMIC'
  },
  E2EXfActiveProfile: {
    title: 'E2EXfActiveProfile',
    ecucPath: 'E2EXfConfig / E2EXfProfileConfigRef',
    sws: 'SWS_E2EXf_00018 & AUTOSAR SWS E2E Library',
    desc: 'Chọn Profile bảo vệ an toàn ISO 26262 của tầng E2EXf: Profile 01 (2B CAN), Profile 05 (3B CAN-FD), Profile 04 (12B Eth CRC-32P4) hoặc Profile 07 (20B CRC-64).',
    values: 'NONE | PROFILE_01 (2B) | PROFILE_05 (3B) | PROFILE_04 (12B) | PROFILE_07 (20B)'
  },
  E2EXfDataIdHex: {
    title: 'E2EXfDataIdHex',
    ecucPath: 'E2EXfProfileConfig / DataId (16-bit or 32-bit)',
    sws: 'SWS_E2E DataID Integrity Check',
    desc: 'Mã định danh DataID duy nhất của thông điệp an toàn, được đưa trực tiếp vào phép tính CRC (ngay cả khi không truyền rõ trên dây ở P01/P05) để chống nhầm gói.',
    values: 'Hex 16/32-bit (VD: 0x1A2B3C4D)'
  },
  E2EXfHeaderBitOffset: {
    title: 'E2EXfHeaderBitOffset',
    ecucPath: 'E2EXfProfileConfig / HeaderLength & BitOffset',
    sws: 'SWS_E2EXf_00039 / HeaderShift Calculation',
    desc: 'Vị trí bắt đầu chèn E2E Header tính từ đầu buffer theo đơn vị Bit (thường là 0 tức Byte 0 đầu tiên của luồng E2EXf output).',
    values: '0 .. 64 bits (bước 8 bits)'
  },
  E2EXfMaxDeltaCounter: {
    title: 'E2EXfMaxDeltaCounter',
    ecucPath: 'E2EXfProfileConfig / MaxDeltaCounter',
    sws: 'SWS_E2E Counter Sequence Check',
    desc: 'Độ chênh lệch tối đa cho phép giữa Counter nhận được và Counter trước đó. Nếu Delta > MaxDeltaCounter, E2E_PxxCheck() trả về E2E_P_WRONGSEQUENCE (0x20).',
    values: '0 .. 15 (Thường đặt = 1 cho truyền chu kỳ ổn định)'
  },
  E2EXfMinOkStateValid: {
    title: 'E2EXfMinOkStateValid',
    ecucPath: 'E2EStateMachineConfig / MinOkStateValid & MinOkStateInvalid',
    sws: 'SWS_E2E_00354 (E2E_SMCheck Transition)',
    desc: 'Số khung dữ liệu sạch (E2E_P_OK) liên tiếp cần thiết để máy trạng thái E2E_SMCheck() chuyển từ INIT/INVALID lên trạng thái an toàn E2E_SM_VALID.',
    values: '1 .. 10 khung (Mặc định = 2)'
  },
  E2EXfMaxErrorStateValid: {
    title: 'E2EXfMaxErrorStateValid',
    ecucPath: 'E2EStateMachineConfig / MaxErrorStateValid',
    sws: 'SWS_E2E_00354 (Soft Error Tolerance Window)',
    desc: 'Số khung lỗi tối đa được phép xuất hiện trong cửa sổ trượt khi đang ở E2E_SM_VALID trước khi sập xuống E2E_SM_INVALID (kích Bit 7 = 1 Hard Error!).',
    values: '0 .. 10 khung (Mặc định = 1 -> lỗi 1 lần ra Soft 0x8A, lần 2 sập 0x88)'
  },
  InjectE2ECrcCorruption: {
    title: 'InjectE2ECrcCorruption',
    ecucPath: 'Fault Injection Tool / Physical Bus Bit-Flip',
    sws: 'SWS_E2E CRC Verification & SWS_E2EXf_00040',
    desc: 'Bơm lỗi đảo bit vào các byte CRC trong Rte_XfrmBuffer[]. Khi chạy Rx InvChain, E2EXf_Inv trả về High Nibble = 0x3_ (E2E_P_ERROR).',
    values: 'TRUE (CRC bị làm sai 0xFF XOR) | FALSE (CRC chuẩn)'
  },
  InjectE2ECounterFaultMode: {
    title: 'InjectE2ECounterFaultMode',
    ecucPath: 'Fault Injection Tool / E2E Counter Anomaly',
    sws: 'SWS_E2E_00345 (REPEATED vs WRONGSEQUENCE)',
    desc: 'Giả lập lỗi bộ đếm gói tin trên đường truyền: bình thường (+1), khung gửi lặp (Delta = 0 -> 0x10 REPEATED), hoặc mất nhiều gói (Delta = +5 -> 0x20 WRONGSEQUENCE).',
    values: 'NORMAL_INC_PLUS_1 | REPEATED_DELTA_0 | JUMP_SEQ_PLUS_5'
  },
  InjectSomeIpHeaderFault: {
    title: 'InjectSomeIpHeaderFault',
    ecucPath: 'Fault Injection Tool / Corrupted SOME/IP Header',
    sws: 'SWS_SomeIpXf_00152..00160 (0x87 / 0x88 / 0x8A)',
    desc: 'Cố tình làm sai trường ProtocolVersion (0x87), InterfaceVersion (0x88) hoặc MessageType (0x8A) trong 8-byte Header để kiểm chứng nhánh Abort tại SomeIpXf_Inv.',
    values: 'NONE | WRONG_PROTOCOL_VER | WRONG_INTERFACE_VER | WRONG_MESSAGE_TYPE'
  },
  InjectTruncatedBufferBytes: {
    title: 'InjectTruncatedBufferBytes',
    ecucPath: 'Fault Injection Tool / Short Buffer Truncation',
    sws: 'SWS_SomeIpXf_00165 & DET XFRM_E_MALFORMED_MESSAGE (0x05)',
    desc: 'Cắt cụt chiều dài buffer nhận được khiến gói tin ngắn hơn 8B Header hoặc ngắn hơn LengthField -> kích trả về 0x89 và Det_ReportRuntimeError(..., 0x05)!',
    values: 'TRUE (Cắt ngắn gói tin) | FALSE (Đủ byte)'
  },
  PassNullPtrOrUninitForDetTest: {
    title: 'PassNullPtrOrUninitForDetTest',
    ecucPath: 'Fault Injection Tool / Invalid API Pointer Test',
    sws: 'SWS_ComXf_00024 / SWS_SomeIpXf_00120 / SWS_E2EXf_00043',
    desc: 'Giả lập ứng dụng truyền con trỏ NULL_PTR vào buffer/dataElement/versioninfo -> Nếu XfrmDevErrorDetect=TRUE sẽ gọi Det_ReportError(..., XFRM_E_PARAM_POINTER = 0x04).',
    values: 'TRUE (Truyền NULL_PTR) | FALSE (Con trỏ hợp lệ)'
  },
  E2ESmWindowClearOnReset: {
    title: 'E2ESmWindowClearOnReset',
    ecucPath: 'Simulator Control / Reset Behavior',
    sws: 'SWS_E2E State Machine Re-initialization',
    desc: 'Tự động xóa lịch sử cửa sổ trượt E2E_SMCheck và đưa Counter về 0 khi chuyển kịch bản hoặc bấm Reset.',
    values: 'TRUE (Xóa sạch khi Reset) | FALSE (Giữ nguyên cửa sổ liên tục giữa các phép thử)'
  }
};

// EXACT 58 ABBREVIATIONS (12 CORE + 10 COM + 14 SOMEIP + 12 E2E + 10 API = 58)
const ABBREVIATIONS = [
  // CORE (12)
  { abbr: 'Xfrm', full: 'AUTOSAR Transformer Cluster', cat: 'CORE', catLabel: 'Xfrm Core & RTE', desc: 'Nhóm các BSW Service Module (ComXf #175, SomeIpXf #174, E2EXf #176) chuyển đổi giữa Struct ứng dụng và mảng byte tuyến tính.' },
  { abbr: 'ASWS_Xfrm', full: 'General Requirements on Transformers', cat: 'CORE', catLabel: 'Xfrm Core & RTE', desc: 'Tài liệu đặc tả chung ASWS_TransformerGeneral quy định chuỗi DataTransformation, HeaderShift và mã lỗi Transformer.' },
  { abbr: 'RTE', full: 'Runtime Environment', cat: 'CORE', catLabel: 'Xfrm Core & RTE', desc: 'Tầng trung gian sinh mã keo (Rte.c) cấp phát đệm, gọi tuần tự các Transformer ở Tx/Rx và ánh xạ lỗi về SWC.' },
  { abbr: 'SWC', full: 'Software Component', cat: 'CORE', catLabel: 'Xfrm Core & RTE', desc: 'Thành phần phần mềm ứng dụng chỉ giao tiếp bằng ApplicationDataType, hoàn toàn trong suốt với định dạng mạng bên dưới.' },
  { abbr: 'DataXfrm', full: 'DataTransformation Chain', cat: 'CORE', catLabel: 'Xfrm Core & RTE', desc: 'Cấu hình ARXML định nghĩa thứ tự ghép chuỗi Transformer (VD: [SomeIpXf -> E2EXf] khi Tx và tự động đảo ngược khi Rx).' },
  { abbr: 'In-Place', full: 'In-Place Buffer Computation', cat: 'CORE', catLabel: 'Xfrm Core & RTE', desc: 'Chế độ Zero-Copy dùng chung 1 mảng RAM duy nhất bằng cách chừa sẵn HeaderShift byte ở đầu cho Transformer kế tiếp.' },
  { abbr: 'Out-of-Place', full: 'Out-of-Place Buffer Computation', cat: 'CORE', catLabel: 'Xfrm Core & RTE', desc: 'Chế độ cấp phát mảng RAM tách biệt cho từng tầng Transformer; đòi hỏi copy bộ nhớ (memcpy) giữa các tầng.' },
  { abbr: 'HeaderShift', full: 'In-Place Header Offset Shift', cat: 'CORE', catLabel: 'Xfrm Core & RTE', desc: 'Số byte chừa trống ở đầu mảng Rte_XfrmBuffer[] cho tầng bao bọc (như E2EXf: 2B P01, 3B P05, 12B P04, 20B P07).' },
  { abbr: 'Inv_Tx/Rx', full: 'Inverse Transformer Function', cat: 'CORE', catLabel: 'Xfrm Core & RTE', desc: 'Hàm giải tuần tự / kiểm tra ở chiều nhận (<Mip>_Inv_<transformerId>), luôn thực thi theo thứ tự ngược lại với chiều gửi.' },
  { abbr: 'Hard Error', full: 'RTE_E_HARD_TRANSFORMER_ERROR (0x88)', cat: 'CORE', catLabel: 'Xfrm Core & RTE', desc: 'Mã lỗi nghiêm trọng (Bit 7 = 1) buộc RTE ngắt chuỗi ngay lập tức, không giải mã hay ghi dữ liệu rác vào SWC.' },
  { abbr: 'Soft Error', full: 'RTE_E_SOFT_TRANSFORMER_ERROR (0x8A)', cat: 'CORE', catLabel: 'Xfrm Core & RTE', desc: 'Mã cảnh báo nhẹ (Bit 7 = 0, VD: E2E REPEATED/WRONGSEQUENCE chưa vượt MaxErrorStateValid); SWC vẫn nhận được payload.' },
  { abbr: 'Abort Chain', full: 'Transformer Chain Abortion', cat: 'CORE', catLabel: 'Xfrm Core & RTE', desc: 'Cơ chế dừng khẩn cấp chuỗi Rx Inverse ngay tại E2EXf_Inv nếu Bit 7 = 1 để bảo vệ Deserializer khỏi payload hỏng.' },

  // COM (10)
  { abbr: 'ComXf', full: 'COM Based Transformer (ModuleId 175)', cat: 'COM', catLabel: 'ComXf & SigGrp', desc: 'Module Service chuẩn R4.2-R23-11 đóng gói struct ISignalGroup thành mảng byte phẳng phục vụ CAN/CAN-FD.' },
  { abbr: 'ISignalGroup', full: 'Interaction Layer Signal Group', cat: 'COM', catLabel: 'ComXf & SigGrp', desc: 'Nhóm các tín hiệu liên quan đồng bộ về mặt thời gian và nhất quán dữ liệu trong System Template.' },
  { abbr: 'SigGrpArray', full: 'COM SignalGroupArray Optimization', cat: 'COM', catLabel: 'ComXf & SigGrp', desc: 'Cơ chế cho phép ComXf xử lý toàn bộ đóng gói bit rồi truyền nguyên mảng qua Com_SendSignalGroupArray() giảm tải CPU COM.' },
  { abbr: 'Motorola BE', full: 'Big-Endian (Motorola Byte Order)', cat: 'COM', catLabel: 'ComXf & SigGrp', desc: 'Thứ tự byte đặt byte trọng số cao nhất (MSB) tại địa chỉ byte thấp nhất trong buffer/khung CAN.' },
  { abbr: 'Intel LE', full: 'Little-Endian (Intel Byte Order)', cat: 'COM', catLabel: 'ComXf & SigGrp', desc: 'Thứ tự byte đặt byte trọng số thấp nhất (LSB) tại địa chỉ byte thấp nhất.' },
  { abbr: 'FillPattern', full: 'ComXfUnusedBitPattern', cat: 'COM', catLabel: 'ComXf & SigGrp', desc: 'Mẫu bit/byte cố định (thường là 0xFF hoặc 0x00) điền vào các bit không sử dụng trong mảng I-PDU.' },
  { abbr: 'SignExt', full: 'Two\'s Complement Sign Extension', cat: 'COM', catLabel: 'ComXf & SigGrp', desc: 'Phép mở rộng bit dấu khi giải mã tín hiệu có dấu có số bit nhỏ hơn kiểu nguyên chuẩn (sint8/sint16/sint32).' },
  { abbr: 'I-PDU', full: 'Interaction Layer Protocol Data Unit', cat: 'COM', catLabel: 'ComXf & SigGrp', desc: 'Đơn vị dữ liệu giao thức tại tầng COM và PduR (CAN Classic tối đa 8B, CAN-FD tối đa 64B).' },
  { abbr: 'PduR', full: 'PDU Router (ModuleId 51)', cat: 'COM', catLabel: 'ComXf & SigGrp', desc: 'Module định tuyến I-PDU từ COM/LdCom xuống CanIf, FrIf, LinIf hoặc SoAd theo bảng định tuyến tĩnh.' },
  { abbr: 'CanIf', full: 'CAN Interface (ModuleId 60)', cat: 'COM', catLabel: 'ComXf & SigGrp', desc: 'Tầng giao diện trừu tượng hóa bộ điều khiển CAN/CAN-FD, nhận L-PDU từ PduR để đưa xuống Can Drv.' },

  // SOMEIP (14)
  { abbr: 'SomeIpXf', full: 'SOME/IP Transformer (ModuleId 174)', cat: 'SOMEIP', catLabel: 'SomeIpXf, TLV & RPC', desc: 'Transformer tuần tự hóa dữ liệu SOA phức hợp, Struct có Alignment, Mảng động, String, TLV và RPC trên Ethernet.' },
  { abbr: 'SOME/IP', full: 'Scalable service-Oriented MiddlewarE over IP', cat: 'SOMEIP', catLabel: 'SomeIpXf, TLV & RPC', desc: 'Giao thức hướng dịch vụ trên Ethernet ô tô hỗ trợ Events, Notifications, Fields và Client-Server RPC.' },
  { abbr: '8B Xf Hdr', full: '8-Byte SomeIpXf Header (Part 2 of 16B)', cat: 'SOMEIP', catLabel: 'SomeIpXf, TLV & RPC', desc: '8 byte do SomeIpXf tạo: ClientID (2B) + SessionID (2B) + ProtoVer (1B) + IfVer (1B) + MsgType (1B) + RetCode (1B).' },
  { abbr: 'SoAd Hdr', full: '8-Byte SoAd SOME/IP PDU Header (Part 1)', cat: 'SOMEIP', catLabel: 'SomeIpXf, TLV & RPC', desc: '8 byte đầu gồm ServiceID (2B) + MethodID (2B) + MessageLength (4B) do SoAd quản lý tách biệt khỏi SomeIpXf.' },
  { abbr: 'RequestId', full: 'SOME/IP Request Identifier (ClientId:SessionId)', cat: 'SOMEIP', catLabel: 'SomeIpXf, TLV & RPC', desc: '32-bit định danh lời gọi gồm ClientID (ECU gọi) và SessionID (tăng dần mỗi lần gọi để phân biệt các RPC song song).' },
  { abbr: 'MsgType', full: 'SOME/IP Message Type (Byte 6)', cat: 'SOMEIP', catLabel: 'SomeIpXf, TLV & RPC', desc: 'Phân loại gói tin SOME/IP: 0x00 REQUEST, 0x01 REQ_NO_RET, 0x02 NOTIFICATION, 0x80 RESPONSE, 0x81 ERROR.' },
  { abbr: 'LengthField', full: 'Dynamic Length Field (1B / 2B / 4B)', cat: 'SOMEIP', catLabel: 'SomeIpXf, TLV & RPC', desc: 'Trường độ dài ghi ngay trước Dynamic Array hoặc String để bên nhận biết số byte thực tế của dữ liệu động.' },
  { abbr: 'AlignPad', full: 'Struct Alignment Padding Bytes', cat: 'SOMEIP', catLabel: 'SomeIpXf, TLV & RPC', desc: 'Các byte đệm 0x00 chèn thêm giúp địa chỉ dữ liệu kế tiếp chia hết cho bội số Alignment (2, 4 hoặc 8 bytes).' },
  { abbr: 'TLV', full: 'Tag-Length-Value Extended Encoding', cat: 'SOMEIP', catLabel: 'SomeIpXf, TLV & RPC', desc: 'Kiểu mã hóa gắn thẻ Tag 16-bit trước mỗi trường dữ liệu giúp ECU khác phiên bản vẫn tương thích tiến/lùi.' },
  { abbr: 'WireType', full: 'TLV Wire Type (Tag Bits 14..12)', cat: 'SOMEIP', catLabel: 'SomeIpXf, TLV & RPC', desc: '3 bit quy định kích thước phần tử sau Tag (0=1B, 1=2B, 2=4B, 3=8B, 4..6=kèm LengthField 1/2/4B) để nhảy qua Tag lạ.' },
  { abbr: 'DataId (TLV)', full: 'TLV Member Data Identifier (Tag Bits 11..0)', cat: 'SOMEIP', catLabel: 'SomeIpXf, TLV & RPC', desc: '12-bit định danh duy nhất cho từng thành viên trong Struct/Parameter List khi bật chế độ TLV.' },
  { abbr: 'RPC', full: 'Remote Procedure Call (Client-Server)', cat: 'SOMEIP', catLabel: 'SomeIpXf, TLV & RPC', desc: 'Mô hình Client gọi hàm từ xa (Rte_Call) trên ECU Server qua mạng Ethernet và chờ phản hồi (RESPONSE/ERROR).' },
  { abbr: 'TxHandle', full: 'Rte_Cs_TransactionHandleType', cat: 'SOMEIP', catLabel: 'SomeIpXf, TLV & RPC', desc: 'Struct gồm clientId và sequenceCounter do RTE truyền giữa Request và Response để khớp đúng phiên giao dịch RPC.' },
  { abbr: 'LdCom', full: 'Large Data COM (ModuleId 49)', cat: 'SOMEIP', catLabel: 'SomeIpXf, TLV & RPC', desc: 'Module truyền dữ liệu kích thước lớn trực tiếp không giải mã tín hiệu giữa RTE và PduR/SoAd.' },

  // E2E (12)
  { abbr: 'E2EXf', full: 'End-to-End Protection Transformer (ModuleId 176)', cat: 'E2E', catLabel: 'E2EXf & SMCheck', desc: 'Transformer bọc/kiểm tra dữ liệu an toàn theo chuẩn ISO 26262 sử dụng thư viện E2E Library và E2E State Machine.' },
  { abbr: 'CRC', full: 'Cyclic Redundancy Check', cat: 'E2E', catLabel: 'E2EXf & SMCheck', desc: 'Mã kiểm tra dư vòng phát hiện lỗi bit trên bus (P01 dùng CRC-8, P05 CRC-16, P04 CRC-32P4, P07 CRC-64).' },
  { abbr: 'P01', full: 'E2E Profile 01 (2-Byte Header, CAN 8B)', cat: 'E2E', catLabel: 'E2EXf & SMCheck', desc: 'Profile kinh điển cho CAN 8B: 1B CRC-8 + 4-bit Counter + 4-bit DataID Nibble; bảo toàn băng thông tối đa.' },
  { abbr: 'P04', full: 'E2E Profile 04 (12-Byte Header, Eth)', cat: 'E2E', catLabel: 'E2EXf & SMCheck', desc: 'Profile cho Ethernet/SOME/IP cỡ lớn (tới 4KB): 2B Length + 2B Counter + 4B DataID + 4B CRC-32P4.' },
  { abbr: 'P05', full: 'E2E Profile 05 (3-Byte Header, CAN-FD)', cat: 'E2E', catLabel: 'E2EXf & SMCheck', desc: 'Profile gọn nhẹ hiện đại thay P01 trên CAN-FD: 2B CRC-16-CCITT + 1B Counter (DataID 16-bit ngầm trong CRC).' },
  { abbr: 'P07', full: 'E2E Profile 07 (20-Byte Header, High ASIL-D)', cat: 'E2E', catLabel: 'E2EXf & SMCheck', desc: 'Profile mạnh nhất cho dữ liệu cực lớn (>4KB đến 4MB): 4B Length + 4B Counter + 4B DataID + 8B CRC-64.' },
  { abbr: 'DataID (E2E)', full: 'E2E Safety Data Identifier', cat: 'E2E', catLabel: 'E2EXf & SMCheck', desc: 'Mã số định danh duy nhất cho mỗi thông điệp an toàn, ngăn ngừa lỗi định tuyến nhầm gói tin (Masquerading).' },
  { abbr: 'E2E_SM', full: 'E2E State Machine (E2E_SMCheck)', cat: 'E2E', catLabel: 'E2EXf & SMCheck', desc: 'Cửa sổ trượt đánh giá chất lượng kênh truyền theo thời gian qua 4 trạng thái: NODATA, INIT, VALID, INVALID.' },
  { abbr: '2-Nibble', full: 'E2EXf 2-Nibble Std_TransformerForwardCode', cat: 'E2E', catLabel: 'E2EXf & SMCheck', desc: 'Byte trả về của E2EXf_Inv: 4 bit cao là Profile CheckStatus (0x0..0x5), 4 bit thấp là SMState (0x0..0x4), Bit 7 = Hard Error.' },
  { abbr: 'P_REPEATED', full: 'E2E_P_REPEATED (0x10)', cat: 'E2E', catLabel: 'E2EXf & SMCheck', desc: 'Trạng thái khung có CRC hợp lệ nhưng Counter bằng đúng khung trước (Delta = 0 — lặp gói hoặc treo bộ phát).' },
  { abbr: 'P_WRONGSEQ', full: 'E2E_P_WRONGSEQUENCE (0x20)', cat: 'E2E', catLabel: 'E2EXf & SMCheck', desc: 'Trạng thái khung nhảy cóc Counter vượt MaxDeltaCounter (mất khung tin giữa đường truyền hoặc chèn gói).' },
  { abbr: 'P_ERROR', full: 'E2E_P_ERROR (0x30)', cat: 'E2E', catLabel: 'E2EXf & SMCheck', desc: 'Lỗi toàn vẹn nghiêm trọng tại E2E Profile Check (sai CRC, sai độ dài hoặc sai DataID trên header).' },

  // API (10)
  { abbr: 'ExtractHdr', full: 'SomeIpXf_ExtractProtocolHeaderFields()', cat: 'API', catLabel: 'APIs, Errors & ECUC', desc: 'API SWS_SomeIpXf_00171 đọc nhanh MessageType & ReturnCode ở Byte 6..7 trước khi RTE gọi đúng hàm Deserializer.' },
  { abbr: 'SendSigGrpArr', full: 'Com_SendSignalGroupArray()', cat: 'API', catLabel: 'APIs, Errors & ECUC', desc: 'API SWS_Com_00851 nhận nguyên mảng byte từ ComXf/E2EXf để truyền SignalGroup mà không tách lại từng bit.' },
  { abbr: 'GetVerInfo', full: '<Mip>_GetVersionInfo()', cat: 'API', catLabel: 'APIs, Errors & ECUC', desc: 'Hàm đọc VendorID, ModuleID (174/175/176) và phiên bản phần mềm của từng Transformer; kiểm tra NULL_PTR (DET 0x04).' },
  { abbr: 'DET', full: 'Default Error Tracer (ModuleId 15)', cat: 'API', catLabel: 'APIs, Errors & ECUC', desc: 'Module nhận Det_ReportError (Dev Error) và Det_ReportRuntimeError (Runtime Error) từ tất cả Transformer.' },
  { abbr: 'XFRM_E_UNINIT', full: 'DET Error Code 0x01 (Uninitialized)', cat: 'API', catLabel: 'APIs, Errors & ECUC', desc: 'Lỗi phát triển kích hoạt khi gọi hàm Transformer lúc <Mip>_Init() chưa được thực thi.' },
  { abbr: 'XFRM_E_PTR', full: 'DET XFRM_E_PARAM_POINTER (0x04)', cat: 'API', catLabel: 'APIs, Errors & ECUC', desc: 'Lỗi phát triển kích hoạt khi truyền con trỏ NULL_PTR vào buffer, bufferLength, dataElement hoặc versioninfo.' },
  { abbr: 'XFRM_E_MALF', full: 'DET XFRM_E_MALFORMED_MESSAGE (0x05)', cat: 'API', catLabel: 'APIs, Errors & ECUC', desc: 'Lỗi Runtime luôn bật ở Production khi SomeIpXf phát hiện khung byte cắt ngắn, sai Length hoặc Tag TLV hỏng.' },
  { abbr: 'E_SER_0x87', full: 'E_SER_WRONG_PROTOCOL_VERSION (0x87)', cat: 'API', catLabel: 'APIs, Errors & ECUC', desc: 'Mã lỗi Hard Error trả về khi Byte 4 (ProtocolVersion) trong SOME/IP Header khác 0x01.' },
  { abbr: 'E_SER_0x89', full: 'E_SER_MALFORMED_MESSAGE (0x89)', cat: 'API', catLabel: 'APIs, Errors & ECUC', desc: 'Mã lỗi Hard Error khi kích thước luồng byte SOME/IP không đủ tối thiểu 8B hoặc mâu thuẫn với LengthField/TLV.' },
  { abbr: 'ECUC', full: 'ECU Configuration Parameters', cat: 'API', catLabel: 'APIs, Errors & ECUC', desc: 'Cấu trúc tham số cấu hình ARXML của DataTransformation, ComXf, SomeIpXf, E2EXf dùng để sinh Xfrm_Cfg.h và Rte.c.' }
];
