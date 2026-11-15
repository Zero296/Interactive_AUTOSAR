// ============================================================================
// PART 3: CONSTANTS, BIT DEFINITIONS, 36 ECUC TOOLTIPS, MODULES & ABBREVIATIONS
// ============================================================================

const SOAD_MODULE_ID = 56; // 0x0038 per AUTOSAR BSW Module List
const SOAD_VENDOR_ID = 60;
const SOAD_SW_VERSION = { major: 4, minor: 5, patch: 0 };

const SOAD_SOCON_STATE_BITS = [
  { bit: 7, mask: 0x80, short: "IP_ASGN", name: "IP_ASSIGNED", desc: "Local IP từ TcpIp đang ở trạng thái TCPIP_IPADDR_STATE_ASSIGNED (tiên quyết để mở socket)." },
  { bit: 6, mask: 0x40, short: "ONLINE", name: "SOCON_ONLINE", desc: "Active SoCon đang ở SOAD_SOCON_ONLINE (đã sẵn sàng truyền/nhận PDU)." },
  { bit: 5, mask: 0x20, short: "RECONN", name: "SOCON_RECONN", desc: "Active SoCon ở SOAD_SOCON_RECONNECT (chờ kết nối TCP lại, UDP peer down, hoặc IP ONHOLD)." },
  { bit: 4, mask: 0x10, short: "TCP_EST", name: "TCP_ESTAB", desc: "Phiên TCP 3-way handshake đã thiết lập (qua TcpIp_TcpConnected hoặc TcpAccepted)." },
  { bit: 3, mask: 0x08, short: "REM_SET", name: "REM_ADDR_SET", desc: "Remote IPv4:Port đã xác định cụ thể (không phải Wildcard ANY:ANY)." },
  { bit: 2, mask: 0x04, short: "RG_EN", name: "RT_GRP_EN", desc: "RoutingGroup gắn với SoCon/PduRoute hiện tại đang Enabled (SD cho phép thông luồng)." },
  { bit: 1, mask: 0x02, short: "AUTO_OC", name: "AUTO_SOCON", desc: "SoAdSocketAutomaticSoConSetup = TRUE (tự mở không cần Upper Layer gọi OpenSoCon)." },
  { bit: 0, mask: 0x01, short: "UL_NTFY", name: "UL_MODE_CHG", desc: "SoAd đã báo SoConModeChg() tới Upper Layer / EthSM / BswM trong chu kỳ gần nhất." }
];

const SOAD_PDU_ROUTING_BITS = [
  { bit: 7, mask: 0x80, short: "HDR_EN", name: "PDU_HDR_EN", desc: "SoAdPduHeaderEnable = TRUE: thêm 8-byte Header (HeaderId 4B + PduLength 4B) ở Tx và tách ở Rx." },
  { bit: 6, mask: 0x40, short: "IS_TCP", name: "PROTO_TCP", desc: "Đang định tuyến trên Socket Group TCP (ngược với UDP datagram)." },
  { bit: 5, mask: 0x20, short: "nPDU_Q", name: "NPDU_BUNDLED", desc: "Tx PDU đang được giữ trong nPdu UDP Tx Buffer (TRIGGER_NEVER) hoặc vừa xả Multi-PDU." },
  { bit: 4, mask: 0x10, short: "TP_STRM", name: "TP_STREAM", desc: "Phiên TP CopyTxData/StartOfReception/CopyRxData hoặc ghép mảnh TCP stream trong SoAdRxBuffer." },
  { bit: 3, mask: 0x08, short: "BEST_M", name: "BEST_MATCH", desc: "Thuật toán Best-Match Remote IP:Port khớp thành công SoCon (Exact > IP-only > Port-only > ANY:ANY)." },
  { bit: 2, mask: 0x04, short: "UL_DISP", name: "UL_DISPATCH", desc: "Rx PDU đã khớp SocketRoute / HeaderId và phân phối lên đúng PduR / Sd / DoIP / Xcp." },
  { bit: 1, mask: 0x02, short: "TX_CONF", name: "TX_CONF_OK", desc: "SoAd đã chuyển tiếp TxConfirmation / TpTxConfirmation thành công lên Upper Layer." },
  { bit: 0, mask: 0x01, short: "DET_ERR", name: "DET_ERR", desc: "Cờ cảnh báo vừa phát hiện DET Development Error, Runtime Error hoặc drop gói." }
];

const SOCON_DEFS = [
  {
    id: 0,
    name: "SoCon_0",
    groupName: "SoConGrp_SomeIpUdp",
    proto: "UDP",
    autoSetup: false,
    tcpInitiate: false,
    headerEnable: true,
    localAddr: "192.168.10.20:30490",
    remoteAddr: "192.168.10.100:30490",
    rgId: "RG_0",
    desc: "SOME/IP Service Event/Field UDP Unicast (Manual OpenSoCon)"
  },
  {
    id: 1,
    name: "SoCon_1",
    groupName: "SoConGrp_DoIpTcpSrv",
    proto: "TCP",
    autoSetup: true,
    tcpInitiate: false,
    headerEnable: false,
    localAddr: "192.168.10.20:13400",
    remoteAddr: "ANY:ANY",
    rgId: "RG_1",
    desc: "DoIP Diagnostic TCP Server (Listen port 13400, Wildcard Accept)"
  },
  {
    id: 2,
    name: "SoCon_2",
    groupName: "SoConGrp_SdMulticast",
    proto: "UDP",
    autoSetup: true,
    tcpInitiate: false,
    headerEnable: false,
    localAddr: "192.168.10.20:30490",
    remoteAddr: "224.224.224.245:30490",
    rgId: "RG_2",
    desc: "SOME/IP-SD Discovery Multicast (AutoSetup, No SoAd Header)"
  },
  {
    id: 3,
    name: "SoCon_3",
    groupName: "SoConGrp_TcpClientExt",
    proto: "TCP",
    autoSetup: false,
    tcpInitiate: true,
    headerEnable: true,
    localAddr: "192.168.10.20:41000",
    remoteAddr: "192.168.10.120:40000",
    rgId: "RG_1",
    desc: "TCP Active Client (8B Header + Big Data TP / Sticky Rx Stream)"
  }
];

const TX_PDU_ROUTES = {
  PduRoute_0: {
    id: "PduRoute_0",
    label: "SOME/IP CameraStatus IF (SoCon_0)",
    soConId: 0,
    headerIdHex: "0x01010001",
    ulType: "IF",
    ulModule: "PduR / LdCom",
    triggerMode: "SOAD_TRIGGER_ALWAYS",
    rgId: "RG_0",
    payloadBytes: 32,
    proto: "UDP"
  },
  PduRoute_1: {
    id: "PduRoute_1",
    label: "DoIP / Diag Large Data TP (SoCon_3)",
    soConId: 3,
    headerIdHex: "0x02020010",
    ulType: "TP",
    ulModule: "PduR / Dcm / DoIP",
    triggerMode: "SOAD_TRIGGER_ALWAYS",
    rgId: "RG_1",
    payloadBytes: 1200,
    proto: "TCP"
  },
  PduRoute_2: {
    id: "PduRoute_2",
    label: "SOME/IP-SD OfferService (SoCon_2)",
    soConId: 2,
    headerIdHex: "0x00000000",
    ulType: "IF",
    ulModule: "Sd",
    triggerMode: "SOAD_TRIGGER_ALWAYS",
    rgId: "RG_2",
    payloadBytes: 48,
    proto: "UDP"
  },
  PduRoute_3A: {
    id: "PduRoute_3A",
    label: "nPdu Signal A · RadarObj (SoCon_0)",
    soConId: 0,
    headerIdHex: "0x010100A1",
    ulType: "IF",
    ulModule: "PduR / Com",
    triggerMode: "SOAD_TRIGGER_NEVER",
    rgId: "RG_0",
    payloadBytes: 24,
    proto: "UDP"
  },
  PduRoute_3B: {
    id: "PduRoute_3B",
    label: "nPdu Signal B · LaneInfo Flush (SoCon_0)",
    soConId: 0,
    headerIdHex: "0x010100B2",
    ulType: "IF",
    ulModule: "PduR / Com",
    triggerMode: "SOAD_TRIGGER_ALWAYS",
    rgId: "RG_0",
    payloadBytes: 20,
    proto: "UDP"
  }
};

const RX_PKT_PROFILES = {
  PKT_A: {
    id: "PKT_A",
    title: "Single UDP PDU with 8B Header",
    soConId: 0,
    proto: "UDP",
    remoteIpPort: "192.168.10.100:30490",
    headerIdHex: "0x01010002",
    payloadBytes: 32,
    ulTarget: "PDUR",
    kind: "SINGLE"
  },
  PKT_B: {
    id: "PKT_B",
    title: "Multi-PDU nPdu UDP (2 Sub-PDUs)",
    soConId: 0,
    proto: "UDP",
    remoteIpPort: "192.168.10.100:30490",
    headerIdHex: "0x01010002",
    payloadBytes: 56,
    ulTarget: "PDUR",
    kind: "MULTI_UDP",
    subPdus: [
      { hdrId: "0x01010002", len: 24, ul: "PDUR", name: "RxPdu_SomeIpEvtA" },
      { hdrId: "0x01010003", len: 16, ul: "PDUR", name: "RxPdu_SomeIpEvtB" }
    ]
  },
  PKT_C: {
    id: "PKT_C",
    title: "Fragmented TCP Stream (Split 8B Hdr + Body)",
    soConId: 3,
    proto: "TCP",
    remoteIpPort: "192.168.10.120:40000",
    headerIdHex: "0x02020020",
    payloadBytes: 120,
    ulTarget: "DOIP",
    kind: "TCP_FRAG"
  },
  PKT_D: {
    id: "PKT_D",
    title: "Sticky TCP Segment (2 Back-to-Back PDUs)",
    soConId: 3,
    proto: "TCP",
    remoteIpPort: "192.168.10.120:40000",
    headerIdHex: "0x02020020",
    payloadBytes: 80,
    ulTarget: "PDUR",
    kind: "TCP_STICKY",
    subPdus: [
      { hdrId: "0x02020020", len: 32, ul: "PDUR", name: "RxPdu_TcpMsg1" },
      { hdrId: "0x02020021", len: 32, ul: "PDUR", name: "RxPdu_TcpMsg2" }
    ]
  },
  PKT_E: {
    id: "PKT_E",
    title: "Unknown HeaderId (0xDEADBEEF)",
    soConId: 0,
    proto: "UDP",
    remoteIpPort: "192.168.10.100:30490",
    headerIdHex: "0xDEADBEEF",
    payloadBytes: 24,
    ulTarget: "PDUR",
    kind: "UNKNOWN_HDR"
  },
  PKT_F: {
    id: "PKT_F",
    title: "Raw UDP / DoIP / SD (No 8B Header)",
    soConId: 2,
    proto: "UDP",
    remoteIpPort: "192.168.10.100:30490",
    headerIdHex: "0x00000000",
    payloadBytes: 48,
    ulTarget: "SD",
    kind: "RAW_NO_HDR"
  }
};

const ROUTING_GROUPS = {
  RG_0: { id: "RG_0", name: "EventGrp Service 0x10 (SoCon_0)", soConIds: [0], triggerable: true },
  RG_1: { id: "RG_1", name: "Diag / BigData TCP Stream (SoCon_1/3)", soConIds: [1, 3], triggerable: false },
  RG_2: { id: "RG_2", name: "SOME/IP-SD Multicast Control (SoCon_2)", soConIds: [2], triggerable: true }
};

const DET_ERROR_CATALOG = {
  SOAD_E_NOTINIT: { code: "0x01", type: "DEV", desc: "API được gọi trước khi SoAd_Init() hoàn tất khởi tạo." },
  SOAD_E_PARAM_POINTER: { code: "0x02", type: "DEV", desc: "Con trỏ PDU/Buffer/VersionInfo/IpAddr truyền vào là NULL_PTR." },
  SOAD_E_INV_ARG: { code: "0x03", type: "DEV", desc: "Tham số không hợp lệ (ví dụ: RoutingGroupId, SoConId, TcpIpEvent ngoài dải)." },
  SOAD_E_NOBUFS: { code: "0x04", type: "RUNTIME", desc: "Hết bộ đệm nPdu / SoAdRxBuffer hoặc TcpIp không cấp phát được bộ đệm Tx." },
  SOAD_E_INV_PDUHEADER_ID: { code: "0x05", type: "RUNTIME", desc: "Gói tin đến mang HeaderId không khớp bất kỳ SocketRouteRx nào trên SoCon." },
  SOAD_E_INV_PDUID: { code: "0x06", type: "DEV", desc: "TxPduId không tồn tại trong bảng cấu hình SoAdPduRoute." },
  SOAD_E_INV_SOCKETID: { code: "0x07", type: "DEV", desc: "TcpIp SocketId không ánh xạ tới SoCon nào đang hoạt động." },
  SOAD_E_INIT_FAILED: { code: "0x08", type: "DEV", desc: "Con trỏ ConfigPtr của SoAd_Init() không hợp lệ." },
  SOAD_E_INV_METADATA: { code: "0x09", type: "RUNTIME", desc: "Metadata của PDU không hợp lệ hoặc không đủ quyền mở rộng." }
};

// EXACT 36 KEYS WITH 2-SPACE INDENTATION FOR 4-WAY PARITY CHECK
const configTooltipData = {
  SoAdDevErrorDetect: {
    title: "SoAdDevErrorDetect",
    ecucPath: "/AUTOSAR/EcucDefs/SoAd/SoAdGeneral/SoAdDevErrorDetect",
    sws: "ECUC_SoAd_00001 · SWS_SoAd_00101",
    range: "Boolean (TRUE / FALSE)",
    typical: "TRUE trong giai đoạn Dev/HIL, có thể FALSE ở Release tối ưu",
    role: "Bật/tắt cơ chế phát hiện lỗi phát triển (Development Error Detection) và báo cáo về Det_ReportError().",
    mechanism: "Khi TRUE, mọi API của SoAd kiểm tra InitState, NULL pointer, PduId hợp lệ trước khi xử lý routing. Runtime Error (0x04, 0x05) vẫn báo về Det_ReportRuntimeError() độc lập.",
    scenarioImpact: "Ảnh hưởng trực tiếp S12: nếu TRUE, PassInvalidArgOrUninitForDetTest sẽ ghi nhận DET error và bật bit B0 (DET_ERR)."
  },
  SoAdMainFunctionPeriodMs: {
    title: "SoAdMainFunctionPeriodMs",
    ecucPath: "/AUTOSAR/EcucDefs/SoAd/SoAdGeneral/SoAdMainFunctionPeriodMs",
    sws: "ECUC_SoAd_00002 · SWS_SoAd_00121",
    range: "1 .. 100 ms (bội số OsTask Ethernet)",
    typical: "5 ms hoặc 10 ms",
    role: "Chu kỳ gọi hàm định kỳ SoAd_MainFunction() từ BSW Scheduler (SchM).",
    mechanism: "Mỗi lần tick: giảm bộ đếm nPdu Tx Trigger Timer để xả các UDP frame gom chung; thực thi State Machine chuyển TCP RECONNECT -> bind/connect; kéo dữ liệu TP Tx pending qua PduR_SoAdTpCopyTxData().",
    scenarioImpact: "Ảnh hưởng S6 (nPdu flush theo timeout) và S2/S10 (TCP reconnect polling)."
  },
  SoAdGetAndResetMeasurementDataApi: {
    title: "SoAdGetAndResetMeasurementDataApi",
    ecucPath: "/AUTOSAR/EcucDefs/SoAd/SoAdGeneral/SoAdGetAndResetMeasurementDataApi",
    sws: "ECUC_SoAd_00130 · SWS_SoAd_00733",
    range: "Boolean (TRUE / FALSE)",
    typical: "TRUE trên ECU có giám sát SecOC / Ethernet diagnostics",
    role: "Bật/tắt API SoAd_GetAndResetMeasurementData() dùng đọc và xóa bộ đếm gói rớt.",
    mechanism: "Theo dõi số gói rớt SOAD_MEAS_DROP_TCP (0x01), SOAD_MEAS_DROP_UDP (0x02) do sai HeaderId, tràn SoAdRxBuffer hoặc filter loại bỏ.",
    scenarioImpact: "Ảnh hưởng S12 & Fault Menu: gọi MEAS_DATA sẽ trả về số lượng drop và reset về 0 nếu API được bật."
  },
  SoAdVersionInfoApi: {
    title: "SoAdVersionInfoApi",
    ecucPath: "/AUTOSAR/EcucDefs/SoAd/SoAdGeneral/SoAdVersionInfoApi",
    sws: "ECUC_SoAd_00004 · SWS_SoAd_00096",
    range: "Boolean (TRUE / FALSE)",
    typical: "FALSE hoặc TRUE khi chẩn đoán version BSW",
    role: "Cung cấp hàm SoAd_GetVersionInfo(Std_VersionInfoType* versioninfo).",
    mechanism: "Điền vendorID, moduleID (56), sw_major_version, sw_minor_version, sw_patch_version. Nếu versioninfo == NULL_PTR và DET bật -> báo SOAD_E_PARAM_POINTER (0x02).",
    scenarioImpact: "Dùng trong Fault Menu (ℹ GetVersionInfo) và kiểm thử NULL pointer."
  },
  SoAdSoConMax: {
    title: "SoAdSoConMax",
    ecucPath: "/AUTOSAR/EcucDefs/SoAd/SoAdGeneral/SoAdSoConMax",
    sws: "ECUC_SoAd_00003 · SWS_SoAd_00588",
    range: "1 .. 64 Socket Connections",
    typical: "8 .. 32 trên ECU trung tâm Ethernet",
    role: "Giới hạn tĩnh số lượng SoAd_SoConIdType được cấp phát RAM trong hệ thống.",
    mechanism: "Kiểm tra biên SoConId trong OpenSoCon/CloseSoCon/SetRemoteAddr. Chọn SoConId >= SoAdSoConMax gây lỗi cấu hình / SOAD_E_INV_ARG.",
    scenarioImpact: "Nếu hạ thấp hơn SoConId đang dùng, bảng Validation sẽ báo cảnh báo cấu hình."
  },
  SoAdEnableSecurityEventReporting: {
    title: "SoAdEnableSecurityEventReporting",
    ecucPath: "/AUTOSAR/EcucDefs/SoAd/SoAdGeneral/SoAdEnableSecurityEventReporting",
    sws: "ECUC_SoAd_00137 · SWS_SoAd_00765",
    range: "Boolean (TRUE / FALSE)",
    typical: "TRUE trên kiến trúc có IdsM (AUTOSAR R20-11+)",
    role: "Bật báo cáo sự kiện an ninh mạng tới Intrusion Detection System Manager (IdsM).",
    mechanism: "Khi gói tin đến bị từ chối bởi Message Acceptance Filter hoặc sai HeaderId không xác định (SOAD_E_INV_PDUHEADER_ID), SoAd phát IdsM_SetSecurityEvent(SOAD_SEV_REJECTED_PDU).",
    scenarioImpact: "Bật trong S12/S8 sẽ tăng bộ đếm IdsM SecEvent mỗi khi có Unknown HeaderId hoặc drop do filter."
  },
  SelectedSoConId: {
    title: "SelectedSoConId",
    ecucPath: "/AUTOSAR/EcucDefs/SoAd/SoAdConfig/SoAdSocketConnectionGroup/SoAdSocketConnection/SoAdSocketId",
    sws: "ECUC_SoAd_00018 · SWS_SoAd_00511",
    range: "0 (SoCon_0) .. 3 (SoCon_3)",
    typical: "0 = SOME/IP UDP, 1 = DoIP TCP Srv, 2 = SD MC, 3 = TCP Client",
    role: "Chọn Socket Connection đang hiển thị trạng thái trên Thanh A và thao tác bởi Quick Actions.",
    mechanism: "Mỗi SoCon giữ máy trạng thái riêng (OFFLINE / RECONNECT / ONLINE), SocketId từ TcpIp, bộ đếm Open/Close reference count và Remote IP:Port.",
    scenarioImpact: "Thay đổi lập tức cập nhật Thanh A, State Machine SM1 và highlight dòng tương ứng trong bảng SoCon."
  },
  SoAdPduHeaderEnable: {
    title: "SoAdPduHeaderEnable",
    ecucPath: "/AUTOSAR/EcucDefs/SoAd/SoAdConfig/SoAdSocketConnectionGroup/SoAdPduHeaderEnable",
    sws: "ECUC_SoAd_00010 · SWS_SoAd_00197",
    range: "Boolean (TRUE / FALSE)",
    typical: "TRUE cho SOME/IP Mux/nPdu/TCP framing; FALSE cho SD Multicast hoặc DoIP raw",
    role: "Bật định dạng tiêu đề 8-byte SoAd PDU Header gồm HeaderId (32-bit BE) + PduLength (32-bit BE).",
    mechanism: "Khi TRUE: cho phép ghép nhiều PduRoute (nPdu) vào chung 1 socket, tách gói dính trên TCP Stream, và phân biệt nhiều SocketRouteRx theo HeaderId. Khi FALSE: truyền raw payload 1-1.",
    scenarioImpact: "Ảnh hưởng trực tiếp S5, S6, S7, S8 và bảng trực quan 8-Byte Header trên Panel 1."
  },
  SoAdSocketAutomaticSoConSetup: {
    title: "SoAdSocketAutomaticSoConSetup",
    ecucPath: "/AUTOSAR/EcucDefs/SoAd/SoAdConfig/SoAdSocketConnectionGroup/SoAdSocketAutomaticSoConSetup",
    sws: "ECUC_SoAd_00013 · SWS_SoAd_00588",
    range: "Boolean (TRUE / FALSE)",
    typical: "TRUE cho SD Multicast / Always-on UDP; FALSE cho SOME/IP động theo SD",
    role: "Cho phép SoAd tự động mở kết nối socket ngay khi LocalIp đạt TCPIP_IPADDR_STATE_ASSIGNED.",
    mechanism: "Nếu TRUE, không cần tầng trên (Sd/BswM) gọi SoAd_OpenSoCon(). Nếu FALSE, OpenRefCounter khởi tạo = 0 và SoCon giữ ở OFFLINE tới khi nhận OpenSoCon().",
    scenarioImpact: "S1 kiểm chứng trực tiếp sự khác biệt giữa AutoSetup=TRUE và Manual OpenSoCon()."
  },
  SoAdSocketProtocolChoice: {
    title: "SoAdSocketProtocolChoice",
    ecucPath: "/AUTOSAR/EcucDefs/SoAd/SoAdConfig/SoAdSocketConnectionGroup/SoAdSocketProtocolChoice",
    sws: "ECUC_SoAd_00015 · SWS_SoAd_00590",
    range: "UDP / TCP",
    typical: "UDP cho SOME/IP Events & SD; TCP cho DoIP Diagnostics & Large RPC",
    role: "Chọn giao thức tầng giao vận (TcpIpUdp / TcpIpTcp) cho Socket Connection Group.",
    mechanism: "UDP đi ngay vào ONLINE khi bind cổng xong. TCP bắt buộc chuyển qua RECONNECT để thực hiện TcpConnect (Client) hoặc TcpListen+TcpAccepted (Server) mới vào ONLINE.",
    scenarioImpact: "Điều khiển S2 (TCP handshake), S6 (UDP nPdu), S8 (TCP stream reassembly) và Bit B6 (PROTO_TCP)."
  },
  SoAdSocketTcpInitiate: {
    title: "SoAdSocketTcpInitiate",
    ecucPath: "/AUTOSAR/EcucDefs/SoAd/SoAdConfig/SoAdSocketConnectionGroup/SoAdSocketTcp/SoAdSocketTcpInitiate",
    sws: "ECUC_SoAd_00024 · SWS_SoAd_00591",
    range: "Boolean (TRUE = Client Active / FALSE = Server Listen)",
    typical: "FALSE cho DoIP Server (ECU bị động chờ Tester); TRUE cho Client chủ động",
    role: "Xác định vai trò TCP Client chủ động (TcpIp_TcpConnect) hay TCP Server lắng nghe (TcpIp_TcpListen).",
    mechanism: "Khi TRUE, SoAd chủ động gọi TcpIp_TcpConnect(RemoteAddr) và đợi callback TcpIp_TcpConnected(). Khi FALSE, SoAd mở Listen socket và đợi TcpIp_TcpAccepted().",
    scenarioImpact: "Quyết định nhánh xử lý TCP trong S2 và khi bấm nút header TCP Accept/Conn."
  },
  SoAdSocketTcpNoDelayAndKeepAlive: {
    title: "SoAdSocketTcpNoDelayAndKeepAlive",
    ecucPath: "/AUTOSAR/EcucDefs/SoAd/SoAdConfig/SoAdSocketConnectionGroup/SoAdSocketTcp/SoAdSocketTcpNoDelay",
    sws: "ECUC_SoAd_00025 · ECUC_SoAd_00105 · SWS_SoAd_00684",
    range: "Boolean (TRUE / FALSE)",
    typical: "TRUE cho DoIP/SOME-IP nhạy độ trễ",
    role: "Cấu hình TcpIp_ChangeParameter() để tắt thuật toán Nagle (TCPIP_PARAMID_TCP_NAGLE) và bật KeepAlive.",
    mechanism: "Sau khi lấy TcpIp Socket, SoAd gọi TcpIp_ChangeParameter() với thông số NoDelay và KeepAlive để đẩy gói nhỏ tức thì và phát hiện đứt cáp âm thầm.",
    scenarioImpact: "Hiển thị trong Fault Menu -> ChangeParameter và S11 (Runtime socket option tuning)."
  },
  ActiveLocalIpAddrState: {
    title: "ActiveLocalIpAddrState",
    ecucPath: "Runtime State via SoAd_LocalIpAddrAssignmentChg()",
    sws: "SWS_SoAd_00209 · SWS_SoAd_00598",
    range: "TCPIP_IPADDR_STATE_ASSIGNED / ONHOLD / UNASSIGNED",
    typical: "ASSIGNED khi DHCP/AutoIP/Static IP sẵn sàng",
    role: "Phản ánh trạng thái địa chỉ IP cục bộ được mô-đun TcpIp thông báo cho SoAd.",
    mechanism: "Nếu chuyển từ ASSIGNED sang UNASSIGNED hoặc ONHOLD: mọi SoCon trên LocalAddr này lập tức đóng/rơi khỏi ONLINE xuống RECONNECT/OFFLINE và hủy các TP session dở dang.",
    scenarioImpact: "Điều khiển trực tiếp S10, nút header LocalIp Assigned và Bit B7 (IP_ASSIGNED)."
  },
  SoAdSocketLocalAddressAndPort: {
    title: "SoAdSocketLocalAddressAndPort",
    ecucPath: "/AUTOSAR/EcucDefs/SoAd/SoAdConfig/SoAdSocketConnectionGroup/SoAdSocketLocalAddressRef + Port",
    sws: "ECUC_SoAd_00012 · SWS_SoAd_00589",
    range: "IPv4:Port (vd: 192.168.10.20:30490)",
    typical: "30490 (SOME/IP), 13400 (DoIP)",
    role: "Cặp Địa chỉ IP cục bộ và Port được truyền cho TcpIp_Bind().",
    mechanism: "TcpIp chỉ nhận các gói Ethernet gửi tới đúng Local IP và Local Port này trước khi callback SoAd_RxIndication().",
    scenarioImpact: "Hiển thị trong bảng SoCon, Module Inspector và ARXML export."
  },
  SoAdSocketRemoteAddressAndPort: {
    title: "SoAdSocketRemoteAddressAndPort",
    ecucPath: "/AUTOSAR/EcucDefs/SoAd/SoAdConfig/SoAdSocketConnectionGroup/SoAdSocketConnection/SoAdSocketRemoteAddress",
    sws: "ECUC_SoAd_00020 · SWS_SoAd_00529",
    range: "IPv4:Port cụ thể hoặc ANY:ANY / IP:ANY",
    typical: "192.168.10.100:30490 hoặc ANY:ANY cho Wildcard Server",
    role: "Địa chỉ đích/nguồn của peer từ xa gắn với từng SoCon.",
    mechanism: "Dùng để gửi Tx PDU và để chấm điểm Best-Match khi nhận gói Rx. Nếu mang Wildcard ANY:ANY, SoCon chấp nhận peer bất kỳ và có thể khóa tạm bằng SetUniqueRemoteAddr().",
    scenarioImpact: "Cốt lõi của S3 (Best-Match priority & Wildcard SetRemoteAddr/SetUniqueRemoteAddr) và Bit B3 (REM_ADDR_SET)."
  },
  SoAdSocketMsgAcceptanceFilterEnabled: {
    title: "SoAdSocketMsgAcceptanceFilterEnabled",
    ecucPath: "/AUTOSAR/EcucDefs/SoAd/SoAdConfig/SoAdSocketConnectionGroup/SoAdSocketMsgAcceptanceFilterEnabled",
    sws: "ECUC_SoAd_00109 · SWS_SoAd_00592",
    range: "Boolean (TRUE / FALSE)",
    typical: "TRUE để bảo vệ chống spoofing IP/Port lạ",
    role: "Bật bộ lọc chấp nhận gói đến theo Remote IP:Port kết hợp thuật toán Best-Match.",
    mechanism: "Khi TRUE, gói UDP/TCP đến từ Remote IP:Port không khớp bất kỳ SoCon nào (và không có Wildcard ANY:ANY) sẽ bị loại bỏ, tăng DROP_UDP/TCP và báo IdsM nếu bật.",
    scenarioImpact: "Ảnh hưởng S3 (What-If đổi RemoteAddr lạ -> rớt gói) và Measurement Data."
  },
  SoAdSocketUdpAliveSupervisionTimeoutEn: {
    title: "SoAdSocketUdpAliveSupervisionTimeoutEn",
    ecucPath: "/AUTOSAR/EcucDefs/SoAd/SoAdConfig/SoAdSocketConnectionGroup/SoAdSocketUdp/SoAdSocketUdpAliveSupervisionTimeout",
    sws: "ECUC_SoAd_00099 · SWS_SoAd_00695",
    range: "Boolean (TRUE / FALSE)",
    typical: "TRUE khi giám sát gói keepalive UDP peer",
    role: "Giám sát thời gian sống UDP để tự chuyển SoCon về RECONNECT nếu peer im lặng quá lâu.",
    mechanism: "Mỗi khi nhận gói UDP hợp lệ, timer supervision được nạp lại. Nếu hết hạn không nhận dữ liệu, SoAd báo SOAD_SOCON_RECONNECT và nhả Remote Address động.",
    scenarioImpact: "Được xử lý trong SoAd_MainFunction() ở S10 / Quick Action MainFunction."
  },
  SoAdSocketFramePriorityVlanPcp: {
    title: "SoAdSocketFramePriorityVlanPcp",
    ecucPath: "/AUTOSAR/EcucDefs/SoAd/SoAdConfig/SoAdSocketConnectionGroup/SoAdSocketFramePriority",
    sws: "ECUC_SoAd_00014 · SWS_SoAd_00683",
    range: "0 .. 7 (IEEE 802.1Q VLAN PCP)",
    typical: "3..5 cho Audio/ADAS control, 0..1 cho Best-Effort",
    role: "Thiết lập mức ưu tiên QoS tầng MAC/VLAN (TCPIP_PARAMID_FRAMEPRIO) cho socket.",
    mechanism: "SoAd gọi TcpIp_ChangeParameter(TCPIP_PARAMID_FRAMEPRIO) ngay khi cấp phát socket mới hoặc khi ứng dụng gọi SoAd_ChangeParameter().",
    scenarioImpact: "Xuất hiện trong ChangeParameter (S11) và code sinh SoAd_Lcfg.c."
  },
  SelectedTxPduRouteId: {
    title: "SelectedTxPduRouteId",
    ecucPath: "/AUTOSAR/EcucDefs/SoAd/SoAdConfig/SoAdPduRoute",
    sws: "ECUC_SoAd_00028 · SWS_SoAd_00539",
    range: "PduRoute_0 .. PduRoute_3B",
    typical: "Mỗi TxPdu từ PduR/Sd/DoIP ánh xạ 1 PduRouteId",
    role: "Chọn PduRouteTx làm mục tiêu khi bấm SoAd_IfTransmit() hoặc SoAd_TpTransmit().",
    mechanism: "Mỗi PduRoute liên kết tới 1..N SoAdPduRouteDest (chỉ định SoCon, HeaderId, TriggerMode nPdu và RoutingGroupRef).",
    scenarioImpact: "Quyết định đường chạy ở S4 (IF), S5 (TP), S6 (nPdu 3A+3B) và Quick Actions Tx."
  },
  SoAdTxPduHeaderIdHex: {
    title: "SoAdTxPduHeaderIdHex",
    ecucPath: "/AUTOSAR/EcucDefs/SoAd/SoAdConfig/SoAdPduRoute/SoAdPduRouteDest/SoAdTxPduHeaderId",
    sws: "ECUC_SoAd_00033 · SWS_SoAd_00542",
    range: "32-bit Hex (0x00000000 .. 0xFFFFFFFF)",
    typical: "0x01010001 (SOME/IP ServiceId 0x0101 + Method/EventId 0x0001)",
    role: "Mã nhận dạng 32-bit được SoAd ghi vào 4 byte đầu của 8-Byte PDU Header khi truyền đi.",
    mechanism: "Cho phép đầu thu tách ghép nhiều luồng logic (Com signals, SOME/IP events) trên cùng một cặp IP:Port duy nhất.",
    scenarioImpact: "Hiển thị trực tiếp ở ô xanh dương trên dải 8-Byte PDU Header Panel 1."
  },
  SoAdTxUpperLayerType: {
    title: "SoAdTxUpperLayerType",
    ecucPath: "/AUTOSAR/EcucDefs/SoAd/SoAdConfig/SoAdPduRoute/SoAdTxUpperLayerType",
    sws: "ECUC_SoAd_00031 · SWS_SoAd_00540",
    range: "IF / TP",
    typical: "IF cho PDU ngắn Com/SOME/IP/SD; TP cho gói lớn Dcm/DoIP/Image",
    role: "Xác định giao diện truyền dữ liệu với Upper Layer (IfTransmit vs TpTransmit + CopyTxData).",
    mechanism: "Nếu IF: payload có sẵn lúc gọi IfTransmit(). Nếu TP: SoAd_TpTransmit() chỉ khởi tạo phiên, sau đó TcpIp gọi SoAd_CopyTxData() -> PduR_SoAdTpCopyTxData() từng chunk.",
    scenarioImpact: "S4 minh họa nhánh IF, S5 minh họa nhánh TP streaming và bit B4 (TP_STREAM)."
  },
  SoAdTxUdpTriggerMode: {
    title: "SoAdTxUdpTriggerMode",
    ecucPath: "/AUTOSAR/EcucDefs/SoAd/SoAdConfig/SoAdPduRoute/SoAdPduRouteDest/SoAdTxUdpTriggerMode",
    sws: "ECUC_SoAd_00090 · SWS_SoAd_00545",
    range: "SOAD_TRIGGER_ALWAYS / SOAD_TRIGGER_NEVER",
    typical: "TRIGGER_NEVER cho các tín hiệu phụ cần đóng gói nPdu; TRIGGER_ALWAYS cho gói chót đẩy đi ngay",
    role: "Kiểm soát việc xả ngay lập tức hay trì hoãn vào nPdu UDP Tx Buffer.",
    mechanism: "Khi TRIGGER_NEVER (và HeaderEnable=TRUE): SoAd copy Header+Payload vào nPdu Buffer và kích hoạt nPdu Trigger Timer. Khi TRIGGER_ALWAYS đến (hoặc hết timer/đầy MTU): xả toàn bộ hàng đợi xuống TcpIp_UdpTransmit() trong 1 gói UDP duy nhất.",
    scenarioImpact: "Cơ chế trọng tâm của S6 (nPdu UDP Bundling) và thanh tiến trình nPdu Buffer."
  },
  SoAdTxUdpTriggerTimeoutMs: {
    title: "SoAdTxUdpTriggerTimeoutMs",
    ecucPath: "/AUTOSAR/EcucDefs/SoAd/SoAdConfig/SoAdSocketConnectionGroup/SoAdSocketUdp/SoAdSocketUdpTriggerTimeout",
    sws: "ECUC_SoAd_00091 · SWS_SoAd_00696",
    range: "0 .. 500 ms",
    typical: "20 ms .. 50 ms",
    role: "Thời gian tối đa các gói TRIGGER_NEVER được phép nằm chờ trong nPdu UDP Tx Buffer.",
    mechanism: "Nếu chưa có gói TRIGGER_ALWAYS nào xuất hiện để đẩy hàng đợi đi trước khi hết timeout, SoAd_MainFunction() tự động flush toàn bộ nPdu Buffer nhằm tránh trễ quá hạn.",
    scenarioImpact: "Trong S6 & Quick Action MainFunction(), bộ đếm timer đếm ngược tới 0 ms sẽ xả nPdu."
  },
  SoAdSocketTcpImmediateTpTxConfirmation: {
    title: "SoAdSocketTcpImmediateTpTxConfirmation",
    ecucPath: "/AUTOSAR/EcucDefs/SoAd/SoAdConfig/SoAdSocketConnectionGroup/SoAdSocketTcp/SoAdSocketTcpImmediateTpTxConfirmation",
    sws: "ECUC_SoAd_00108 · SWS_SoAd_00658",
    range: "Boolean (TRUE / FALSE)",
    typical: "FALSE để đảm bảo TCP ACK từ đối phương trước khi báo Upper Layer",
    role: "Quyết định thời điểm SoAd gọi PduR_SoAdTpTxConfirmation().",
    mechanism: "Khi TRUE: báo TxConfirmation ngay sau khi CopyTxData() giao xong byte cuối cho TcpIp. Khi FALSE: chờ TcpIp_TxConfirmation(Length) xác nhận TCP ACK trên đường truyền mới báo Upper Layer.",
    scenarioImpact: "Thay đổi trình tự bước 3-4 trong S5 (TP Transmit)."
  },
  SelectedRxPacketProfile: {
    title: "SelectedRxPacketProfile",
    ecucPath: "Simulation Rx Stimulus Profile (PKT_A .. PKT_F)",
    sws: "SWS_SoAd_00557 · SWS_SoAd_00267 · SWS_SoAd_00567",
    range: "PKT_A .. PKT_F",
    typical: "PKT_A (Single), PKT_B (Multi-PDU), PKT_C (Frag TCP), PKT_D (Sticky TCP), PKT_E (Unknown), PKT_F (Raw)",
    role: "Chọn mẫu frame Ethernet/IP/TCP/UDP giả lập được bơm vào SoAd_RxIndication().",
    mechanism: "Kiểm thử khả năng phân tách 8-byte Header vòng lặp (Multi-PDU / Sticky TCP), ghép mảnh qua SoAdRxBuffer khi TCP giao thiếu byte, hoặc xử lý lỗi Unknown HeaderId.",
    scenarioImpact: "Dùng trong S7 (Multi-PDU UDP), S8 (TCP Fragmented & Sticky) và nút header TcpIp RxInd."
  },
  SoAdRxPduHeaderIdExpectedHex: {
    title: "SoAdRxPduHeaderIdExpectedHex",
    ecucPath: "/AUTOSAR/EcucDefs/SoAd/SoAdConfig/SoAdSocketRoute/SoAdRxPduHeaderId",
    sws: "ECUC_SoAd_00043 · SWS_SoAd_00559",
    range: "32-bit Hex",
    typical: "0x01010002",
    role: "HeaderId cấu hình trong bảng SocketRouteRx để ánh xạ từ Header trên dây cáp sang RxPduId.",
    mechanism: "Khi HeaderEnable=TRUE, SoAd đọc 4 byte HeaderId của mỗi PDU tách được và tìm SocketRoute tương ứng. Không khớp -> Runtime Error SOAD_E_INV_PDUHEADER_ID.",
    scenarioImpact: "Ảnh hưởng S7/S8 và What-If Unknown HeaderId."
  },
  SoAdRxUpperLayerTarget: {
    title: "SoAdRxUpperLayerTarget",
    ecucPath: "/AUTOSAR/EcucDefs/SoAd/SoAdConfig/SoAdSocketRoute/SoAdSocketRouteDest/SoAdRxUpperLayerType",
    sws: "ECUC_SoAd_00044 · SWS_SoAd_00560",
    range: "PDUR / SD / DOIP / UDPNM / XCP / CDD",
    typical: "PDUR cho Com/LdCom/Dcm; SD cho bản tin Service Discovery",
    role: "Chọn module BSW tầng trên nhận hàm callback RxIndication() hoặc StartOfReception()/CopyRxData().",
    mechanism: "SoAd phân tuyến động dựa trên SocketRouteDest: PduR_SoAdIfRxIndication, Sd_SoAdIfRxIndication, DoIP_SoAdTpStartOfReception, UdpNm_SoAdIfRxIndication...",
    scenarioImpact: "Hiển thị mũi tên tương ứng trên SVG Panel 3 và tên hàm trong API Trace."
  },
  InjectedRxPayloadLengthBytes: {
    title: "InjectedRxPayloadLengthBytes",
    ecucPath: "Injected TcpIp_RxIndication Payload Length",
    sws: "SWS_SoAd_00097",
    range: "4 .. 4096 Bytes",
    typical: "32 .. 1400 Bytes",
    role: "Độ dài dữ liệu payload mô phỏng truyền vào SoAd_RxIndication(SocketId, RemoteAddr, BufPtr, Length).",
    mechanism: "Nếu Length + 8 > SoAdRxBufferMaxCapacityBytes khi đang lắp mảnh TCP, hoặc Length vượt kích thước khả dụng trong UDP strict check -> tràn bộ đệm / SOAD_E_NOBUFS.",
    scenarioImpact: "Thử nghiệm tràn SoAdRxBuffer trong S8 What-If."
  },
  SoAdRxBufferMaxCapacityBytes: {
    title: "SoAdRxBufferMaxCapacityBytes",
    ecucPath: "/AUTOSAR/EcucDefs/SoAd/SoAdConfig/SoAdSocketConnectionGroup/SoAdSocketTcp/SoAdRxBuffer",
    sws: "ECUC_SoAd_00102 · SWS_SoAd_00567",
    range: "64 .. 4096 Bytes",
    typical: "1500 .. 4096 Bytes trên kết nối TCP có PDU Header",
    role: "Dung lượng RAM SoAdRxBuffer dùng để tích lũy các mảnh TCP byte-stream bị xé lẻ.",
    mechanism: "TCP không bảo toàn ranh giới message. Khi nhận thiếu 8-byte Header hoặc thiếu phần thân so với PduLength, SoAd lưu tạm vào SoAdRxBuffer để đợi lần RxIndication() tiếp theo.",
    scenarioImpact: "Hiển thị thanh dung lượng SoAdRxBuffer ở Panel 1 và kịch bản S8."
  },
  SoAdSocketUdpStrictHeaderLenCheck: {
    title: "SoAdSocketUdpStrictHeaderLenCheck",
    ecucPath: "/AUTOSAR/EcucDefs/SoAd/SoAdConfig/SoAdSocketConnectionGroup/SoAdSocketUdp/SoAdSocketUdpStrictHeaderLenCheckEnabled",
    sws: "ECUC_SoAd_00116 · SWS_SoAd_00712",
    range: "Boolean (TRUE / FALSE)",
    typical: "TRUE để loại bỏ gói UDP hỏng hoặc bị cắt cụt sai cấu trúc",
    role: "Kiểm tra nghiêm ngặt độ dài PDU khai báo trong 8B Header không vượt quá số byte còn lại của UDP Datagram.",
    mechanism: "Nếu PduLength > RemainingBytes của datagram UDP, khi TRUE SoAd loại bỏ toàn bộ datagram (hoặc các phần dư hỏng) và ghi nhận DROP_UDP.",
    scenarioImpact: "Kiểm thử gói UDP hỏng độ dài trong S7 What-If."
  },
  SelectedRoutingGroupId: {
    title: "SelectedRoutingGroupId",
    ecucPath: "/AUTOSAR/EcucDefs/SoAd/SoAdConfig/SoAdRoutingGroup",
    sws: "ECUC_SoAd_00050 · SWS_SoAd_00660",
    range: "RG_0 / RG_1 / RG_2",
    typical: "Mỗi EventGroup SOME/IP-SD gắn 1 RoutingGroupId",
    role: "Chọn Routing Group để SD/BswM thực hiện EnableRouting / DisableRouting / IfRoutingGroupTransmit.",
    mechanism: "RoutingGroup đóng vai trò 'công tắc phần mềm' của từng luồng PduRoute/SocketRoute mà không cần đóng socket vật lý.",
    scenarioImpact: "Điều khiển trực tiếp S9 (SOME/IP-SD Control) và Quick Action EnableRouting/Trig."
  },
  SoAdRoutingGroupIsEnabledAfterInit: {
    title: "SoAdRoutingGroupIsEnabledAfterInit",
    ecucPath: "/AUTOSAR/EcucDefs/SoAd/SoAdConfig/SoAdRoutingGroup/SoAdRoutingGroupIsEnabledAfterInit",
    sws: "ECUC_SoAd_00052 · SWS_SoAd_00602",
    range: "Boolean (TRUE / FALSE)",
    typical: "FALSE với SOME/IP Service động (đợi SubscribeEventgroupAck từ SD); TRUE với luồng tĩnh",
    role: "Trạng thái Enabled/Disabled mặc định của RoutingGroup ngay sau SoAd_Init().",
    mechanism: "Nếu FALSE, mọi lệnh SoAd_IfTransmit() qua PduRoute thuộc RG này dù trả E_OK (hoặc skip theo spec) sẽ bị chặn không phát xuống TcpIp cho tới khi Sd gọi SoAd_EnableRouting(RG_x).",
    scenarioImpact: "Thể hiện rõ ở S9 bước 1-2 và badge RG trên Header + bit B2 (RT_GRP_EN)."
  },
  SoAdRoutingGroupTxTriggerable: {
    title: "SoAdRoutingGroupTxTriggerable",
    ecucPath: "/AUTOSAR/EcucDefs/SoAd/SoAdConfig/SoAdRoutingGroup/SoAdRoutingGroupTxTriggerable",
    sws: "ECUC_SoAd_00053 · SWS_SoAd_00656",
    range: "Boolean (TRUE / FALSE)",
    typical: "TRUE cho SOME/IP Field (Initial Event cần bắn ngay khi Client vừa Subscribe)",
    role: "Cho phép gọi SoAd_IfRoutingGroupTransmit(rgId) để kích hoạt truyền lại các IF Tx PDU thuộc RG đó.",
    mechanism: "Khi Client mới đăng ký SOME/IP-SD, Sd bật RG rồi gọi SoAd_IfRoutingGroupTransmit(). SoAd đánh dấu pending và kích PduR_SoAdIfTriggerTransmit() trong MainFunction.",
    scenarioImpact: "Cơ chế chính ở S9 bước 3 và What-If tắt TxTriggerable -> báo SOAD_E_INV_ARG."
  },
  SimulateTcpIpBufferBusyOrNoBufs: {
    title: "SimulateTcpIpBufferBusyOrNoBufs",
    ecucPath: "Fault Injection: TcpIp BUFREQ_E_BUSY / E_NOT_OK",
    sws: "SWS_SoAd_00650 · SOAD_E_NOBUFS (0x04)",
    range: "Boolean (TRUE / FALSE)",
    typical: "FALSE trong vận hành bình thường",
    role: "Giả lập tình trạng tầng TcpIp cạn kiệt bộ đệm Tx hoặc bận không truyền được gói.",
    mechanism: "Khi bật TRUE: SoAd_IfTransmit() / SoAd_TpTransmit() hoặc flush nPdu sẽ nhận lỗi từ TcpIp, ghi nhận Runtime Error SOAD_E_NOBUFS (0x04) và tăng drop counter.",
    scenarioImpact: "Kích hoạt What-If lỗi bộ đệm ở S4, S5, S12."
  },
  PassInvalidArgOrUninitForDetTest: {
    title: "PassInvalidArgOrUninitForDetTest",
    ecucPath: "Fault Injection: DET Parameter / State Test",
    sws: "SWS_SoAd_00101 · SWS_SoAd_00215",
    range: "Boolean (TRUE / FALSE)",
    typical: "FALSE; bật TRUE để kiểm thử bắt lỗi DET",
    role: "Ép các lệnh gọi Quick Actions / API truyền PduId giả mạo, NULL_PTR hoặc khi chưa Init.",
    mechanism: "Khi bật TRUE cùng SoAdDevErrorDetect=TRUE, API lập tức abort, gọi Det_ReportError(56, ...), không đụng phần cứng TcpIp và bật bit B0 (DET_ERR).",
    scenarioImpact: "Trọng tâm kiểm thử S12 (DET & Measurement Data)."
  },
  InjectedTcpIpEventType: {
    title: "InjectedTcpIpEventType",
    ecucPath: "Callback Event: SoAd_TcpIpEvent(SocketId, Event)",
    sws: "SWS_SoAd_00144 · SWS_SoAd_00642",
    range: "TCPIP_TCP_RESET / TCPIP_TCP_CLOSED / TCPIP_TCP_FIN_RECEIVED / TCPIP_UDP_CLOSED",
    typical: "TCPIP_TCP_RESET khi peer sập nguồn; TCPIP_TCP_FIN_RECEIVED khi peer đóng kết nối lịch sự",
    role: "Chọn sự kiện socket từ TcpIp chuyển lên callback SoAd_TcpIpEvent().",
    mechanism: "Khi nhận TCP_RESET hoặc TCP_CLOSED: SoAd hủy phiên TP/Tx/Rx đang chạy (báo TpTxConfirmation(E_NOT_OK)), dọn SoAdRxBuffer và đưa SoCon về RECONNECT (nếu OpenRef > 0) hoặc OFFLINE.",
    scenarioImpact: "Quyết định hành vi S10 (TCP_RESET Recovery) và nút header ⚡ TCP RST/FIN."
  }
};

const MODULES_INFO = {
  MOD_SWC: {
    title: "Application SW-C (Software Component)",
    layer: "AUTOSAR Application Layer",
    sws: "AUTOSAR RTE / SOME-IP Service Interface",
    inputs: [
      "Dữ liệu cảm biến / dịch vụ (Camera Frame, Radar Objects, Diagnostic Requests).",
      "Callback nhận dữ liệu sự kiện/phương thức SOME/IP qua RTE_Read / RTE_Call."
    ],
    processing: [
      "Tạo Service Request hoặc Signal Update hướng đối tượng (Service-Oriented Communication).",
      "Không hề biết địa chỉ IP, Port, UDP hay TCP bên dưới — hoàn toàn trừu tượng hóa."
    ],
    outputs: [
      "Ghi dữ liệu vào RTE Ports (Sender-Receiver / Client-Server) để chuyển xuống SomeIpXf."
    ]
  },
  MOD_RTE: {
    title: "RTE + Transformers (SomeIpXf / E2EXf) + SchM",
    layer: "Runtime Environment",
    sws: "SWS_SomeIpXf · SWS_E2EXf · SWS_Rte",
    inputs: [
      "Struct / Array cấp Application từ SW-C (Tx) hoặc Byte Array từ Com/LdCom (Rx).",
      "OS Task tick định kỳ kích hoạt SchM_MainFunction."
    ],
    processing: [
      "SomeIpXf tuần tự hóa (serialize) dữ liệu C struct thành byte stream chuẩn SOME/IP Message Header + Payload.",
      "E2EXf bổ sung CRC/Counter bảo toàn an toàn chức năng (ASIL).",
      "SchM lập lịch gọi SoAd_MainFunction() mỗi SoAdMainFunctionPeriodMs (vd 5-10ms)."
    ],
    outputs: [
      "Xuất I-PDU byte array xuống Com / LdCom / PduR và kích nhịp thời gian cho SoAd."
    ]
  },
  MOD_PDUR: {
    title: "PduR / LdCom / Com / Dcm / SecOC",
    layer: "Communication Services Layer (Upper Layer)",
    sws: "SWS_PduR · SWS_LdCom · SWS_Com · SWS_Dcm",
    inputs: [
      "Tx I-PDU từ Com/LdCom/Dcm (gồm cả big data TP > Ethernet MTU).",
      "Callbacks Rx từ SoAd: PduR_SoAdIfRxIndication(), PduR_SoAdTpStartOfReception(), PduR_SoAdTpCopyRxData()."
    ],
    processing: [
      "Định tuyến không gian PduId từ lớp trên xuống đúng SoAd TxPduId (PduRoute).",
      "Cung cấp từng mảnh dữ liệu Tx cho SoAd khi được gọi PduR_SoAdTpCopyTxData() hoặc PduR_SoAdIfTriggerTransmit().",
      "Xử lý xác nhận truyền TxConfirmation / TpTxConfirmation để giải phóng buffer."
    ],
    outputs: [
      "Gọi SoAd_IfTransmit(TxPduId, PduInfoPtr) hoặc SoAd_TpTransmit(TxPduId, PduInfoPtr)."
    ]
  },
  MOD_SD: {
    title: "Sd (SOME/IP Service Discovery)",
    layer: "Communication Services Layer (Control Plane)",
    sws: "SWS_ServiceDiscovery (AUTOSAR Classic)",
    inputs: [
      "Các bản tin Multicast SD (224.224.224.245:30490) qua Sd_SoAdIfRxIndication().",
      "Trạng thái đóng/mở kết nối qua Sd_SoConModeChg() và IP qua Sd_LocalIpAddrAssignmentChg()."
    ],
    processing: [
      "Phân tích bản tin FindService / OfferService / SubscribeEventgroup.",
      "Quyết định mở kết nối UDP/TCP Unicast động và chỉ định Remote IP:Port của đối tác từ OfferService.",
      "Điều khiển đóng/mở luồng dữ liệu cụ thể qua RoutingGroup (chỉ cho phép phát Event khi có Client Subscribe)."
    ],
    outputs: [
      "Gọi SoAd_OpenSoCon(), SoAd_SetRemoteAddr(), SoAd_EnableRouting(), SoAd_IfRoutingGroupTransmit()."
    ]
  },
  MOD_UL_DIRECT: {
    title: "Direct SoAd Upper Layers (DoIP / UdpNm / Xcp / CDD)",
    layer: "Diagnostics, NM & Calibration Layer",
    sws: "SWS_DoIP · SWS_UdpNm · SWS_Xcp",
    inputs: [
      "Dcm diagnostic TP frames (DoIP TCP port 13400 / UDP port 13400 Vehicle Announcement).",
      "Network Management wakeup/keep-alive PDUs (UdpNm) hoặc XCP measurement packets."
    ],
    processing: [
      "Các module này kết nối TRỰC TIẾP vào SoAd (bỏ qua PduR) để tận dụng điều khiển trực tiếp Socket Connection.",
      "DoIP mở SoCon TCP Server listen port 13400 và xử lý nhiều Tester qua Wildcard/Best-Match."
    ],
    outputs: [
      "Gọi SoAd_TpTransmit(), SoAd_IfTransmit(), SoAd_OpenSoCon(), SoAd_ReleaseRemoteAddr()."
    ]
  },
  MOD_ETHSM: {
    title: "EthSM / ComM / BswM (Mode Management)",
    layer: "System & Communication Mode Management",
    sws: "SWS_EthSM · SWS_ComM · SWS_BswM",
    inputs: [
      "Thông báo SoAd_SoConModeChg(SoConId, Mode) và TcpIp LocalIpAddrAssignmentChg."
    ],
    processing: [
      "Điều phối chuyển đổi trạng thái FULL_COMMUNICATION / NO_COMMUNICATION của mạng Ethernet.",
      "BswM dùng quy tắc logic để tự động bật/tắt RoutingGroup tĩnh hoặc Open/Close SoCon khi chuyển nguồn KL15."
    ],
    outputs: [
      "Kích hoạt BswM Actions gọi SoAd_OpenSoCon(), SoAd_CloseSoCon(), SoAd_EnableRouting()."
    ]
  },
  MOD_SOAD: {
    title: "SoAd Core — Socket Adaptor (ModuleId 56 / 0x0038)",
    layer: "Communication Services Layer (Core Adaptor)",
    sws: "SWS_SoAd (R22-11 / R23-11)",
    inputs: [
      "Tx từ Upper Layers: SoAd_IfTransmit(), SoAd_TpTransmit(), SoAd_IfRoutingGroupTransmit().",
      "Control từ SD/BswM: OpenSoCon, CloseSoCon, EnableRouting, SetRemoteAddr, SetUniqueRemoteAddr.",
      "Rx & Events từ TcpIp: SoAd_RxIndication(), SoAd_CopyTxData(), SoAd_TxConfirmation(), TcpConnected, TcpAccepted, TcpIpEvent, LocalIpAddrAssignmentChg."
    ],
    processing: [
      "Ánh xạ trừu tượng AUTOSAR PduId ↔ TCP/IP SocketId (1 Socket có thể ghép nhiều PduId qua 8-byte Header).",
      "Tạo & tách 8-Byte PDU Header (HeaderId 4B + PduLength 4B Big-Endian).",
      "Thực thi nPdu UDP Bundling Buffer (TRIGGER_NEVER + TriggerTimeout) giảm tải frame Ethernet.",
      "Thực thi TCP Rx Stream Reassembly trong SoAdRxBuffer (xử lý mảnh cắt và gói dính Sticky TCP).",
      "Chạy Best-Match Remote Address Filter & RoutingGroup gating + Máy trạng thái SoCon (OFFLINE/RECONNECT/ONLINE)."
    ],
    outputs: [
      "Gọi xuống TcpIp: TcpIp_GetSocket, TcpIp_Bind, TcpIp_TcpConnect, TcpIp_TcpListen, TcpIp_UdpTransmit, TcpIp_TcpTransmit, TcpIp_Close.",
      "Báo cáo lỗi & đếm drop về Det / IdsM và trả Rx/Confirm lên PduR / Sd / DoIP / UdpNm."
    ]
  },
  MOD_TCPIP: {
    title: "TcpIp Stack (UDP / TCP / IPv4 / IPv6 / DHCP / ARP)",
    layer: "Communication Hardware Abstraction / Network Stack",
    sws: "SWS_TcpIp (AUTOSAR Classic)",
    inputs: [
      "Lệnh điều khiển socket & truyền dữ liệu từ SoAd (TcpIp_UdpTransmit, TcpIp_TcpTransmit, ChangeParameter).",
      "Ethernet payload thô từ EthIf_RxIndication() và ARP/ICMP."
    ],
    processing: [
      "Quản lý bảng định tuyến IP, cấp phát IP (Static/DHCP/AutoIP) và báo LocalIpAddrAssignmentChg.",
      "Thực thi TCP 3-way handshake, sliding window, retransmissions và Pull dữ liệu Tx qua SoAd_CopyTxData().",
      "Đóng gói IPv4/IPv6 + UDP/TCP header và truyền xuống EthIf."
    ],
    outputs: [
      "Callback lên SoAd: RxIndication, TxConfirmation, TcpConnected, TcpAccepted, TcpIpEvent.",
      "Xuất Ethernet Frame xuống EthIf_Transmit()."
    ]
  },
  MOD_ETHHW_DET: {
    title: "EthIf / EthTrcv / Bus & Det / IdsM",
    layer: "MCAL / Driver + System Diagnostics & Security",
    sws: "SWS_EthIf · SWS_Det · SWS_IdsM",
    inputs: [
      "Ethernet Frame từ TcpIp kèm VLAN PCP Priority (0..7).",
      "Cảnh báo lỗi API từ SoAd: Det_ReportError(56,...), Det_ReportRuntimeError(56,...), IdsM_SetSecurityEvent()."
    ],
    processing: [
      "EthIf / Eth / EthTrcv truyền bit vật lý qua PHY Automotive 100BASE-T1 / 1000BASE-T1 kèm tag IEEE 802.1Q.",
      "Det lưu mã lỗi dev/runtime phục vụ debug HIL; IdsM ghi nhận tấn công gói tin lạ / spoofing IP."
    ],
    outputs: [
      "Khung dây truyền trên bus Ethernet xe và log chẩn đoán gửi tới DEM / Security Log."
    ]
  }
};

const ABBREVIATIONS = [
  // CORE (14)
  { abbr: "SoAd", full: "Socket Adaptor", cat: "CORE", desc: "Module AUTOSAR BSW (ID 56) làm cầu nối ánh xạ giữa hệ thống PDU (PduR/SD/DoIP) và TCP/IP Sockets." },
  { abbr: "SoCon", full: "Socket Connection", cat: "CORE", desc: "Thực thể kết nối logic bên trong SoAd quản lý một socket TcpIp cùng máy trạng thái OFFLINE/RECONNECT/ONLINE." },
  { abbr: "SoConGroup", full: "Socket Connection Group", cat: "CORE", desc: "Nhóm các SoCon dùng chung thuộc tính giao thức (UDP/TCP), Local Port, HeaderEnable và AutoSetup." },
  { abbr: "PduRoute", full: "PDU Route (Tx Path)", cat: "CORE", desc: "Cấu hình đường phát Tx ánh xạ một TxPduId từ tầng trên tới một hoặc nhiều PduRouteDest (Fan-out)." },
  { abbr: "PduRouteDest", full: "PDU Route Destination", cat: "CORE", desc: "Đích phát cụ thể của PduRoute, chỉ định SoCon (hoặc Group), TxHeaderId, nPdu TriggerMode và RoutingGroup." },
  { abbr: "SocketRoute", full: "Socket Route (Rx Path)", cat: "CORE", desc: "Cấu hình đường thu Rx ánh xạ từ SoCon + RxHeaderId lên RxPduId của tầng trên." },
  { abbr: "SocketRouteDest", full: "Socket Route Destination", cat: "CORE", desc: "Đích nhận Rx trỏ vào RxPduId của PduR, Sd, DoIP, UdpNm, Xcp hoặc CDD." },
  { abbr: "RoutingGroup", full: "Routing Group (RG)", cat: "CORE", desc: "Công tắc bật/tắt luồng dữ liệu PduRoute/SocketRoute động (thường do SD điều khiển khi Subscribe)." },
  { abbr: "Best-Match", full: "Best-Match Remote Address Filter", cat: "CORE", desc: "Thuật toán chấm điểm ưu tiên khớp Remote IP:Port (Exact IP:Port > IP:ANY > ANY:Port > ANY:ANY)." },
  { abbr: "Wildcard", full: "Wildcard Remote Address (ANY:ANY)", cat: "CORE", desc: "SoCon cấu hình địa chỉ xa bằng IP=ANY / Port=ANY để tiếp nhận kết nối từ mọi peer mới." },
  { abbr: "ECUC", full: "ECU Configuration", cat: "CORE", desc: "Mô tả cấu hình ARXML sinh mã nguồn tiền biên dịch (SoAd_Cfg.h) và hậu liên kết (SoAd_Lcfg.c)." },
  { abbr: "DET", full: "Default Error Tracer", cat: "CORE", desc: "Module tiếp nhận Development Error (0x01..0x08) và Runtime Error (0x04, 0x05, 0x09) từ SoAd." },
  { abbr: "IdsM", full: "Intrusion Detection System Manager", cat: "CORE", desc: "Module an ninh nhận báo cáo Security Events khi SoAd drop gói sai HeaderId hoặc sai IP lọc." },
  { abbr: "MeasData", full: "Measurement Data Counters", cat: "CORE", desc: "Bộ đếm gói bị drop SOAD_MEAS_DROP_TCP / SOAD_MEAS_DROP_UDP đọc qua GetAndResetMeasurementData." },

  // HDR (10)
  { abbr: "HeaderId", full: "SoAd PDU Header Identifier (32-bit)", cat: "HDR", desc: "Trường 4 byte Big-Endian đầu tiên trong SoAd PDU Header dùng ghép kênh nhiều PDU trên 1 socket." },
  { abbr: "PduLength", full: "SoAd PDU Header Length (32-bit)", cat: "HDR", desc: "Trường 4 byte tiếp theo chỉ độ dài payload tính bằng byte của đúng PDU hiện tại (không tính 8B header)." },
  { abbr: "8B Header", full: "8-Byte SoAd PDU Header", cat: "HDR", desc: "Định dạng đóng khung chuẩn AUTOSAR gồm [4B HeaderId | 4B PduLength | N-Byte Payload]." },
  { abbr: "Mux / Demux", full: "Multiplexing / Demultiplexing", cat: "HDR", desc: "Ghép nhiều PduRoute vào 1 socket khi Tx và phân tách lên nhiều SocketRoute khi Rx nhờ HeaderId." },
  { abbr: "StrictLenChk", full: "UDP Strict Header Length Check", cat: "HDR", desc: "Kiểm tra PduLength không vượt quá phần byte còn lại của gói UDP để phát hiện khung hỏng." },
  { abbr: "Fan-out", full: "Multi-Destination PduRouteDest", cat: "HDR", desc: "Một lệnh IfTransmit đơn lẻ nhưng có nhiều PduRouteDest phát ra nhiều SoCon khác nhau." },
  { abbr: "BE", full: "Big-Endian (Network Byte Order)", cat: "HDR", desc: "Thứ tự byte MSB-first chuẩn mạng dùng mã hóa HeaderId và PduLength trong khung Ethernet." },
  { abbr: "I-PDU", full: "Interaction Layer Protocol Data Unit", cat: "HDR", desc: "Gói dữ liệu logic trao đổi giữa PduR/Com/SD và SoAd qua PduInfoType." },
  { abbr: "PduInfoType", full: "AUTOSAR PDU Info Structure", cat: "HDR", desc: "Struct chứa { SduDataPtr, MetaDataPtr, SduLength } truyền qua mọi API truyền/nhận SoAd." },
  { abbr: "MetaDataPtr", full: "PDU Metadata Pointer", cat: "HDR", desc: "Con trỏ mang thông tin bổ sung (ví dụ SoConId hoặc Priority động) đính kèm PDU." },

  // NPDU (11)
  { abbr: "nPdu", full: "Multi-PDU UDP Tx Bundling Buffer", cat: "NPDU", desc: "Cơ chế gom nhiều IF Tx PDU nhỏ vào cùng một UDP Datagram để giảm overhead header IP/MAC." },
  { abbr: "TRIGGER_ALWAYS", full: "SOAD_TRIGGER_ALWAYS", cat: "NPDU", desc: "Chế độ bắt buộc xả ngay toàn bộ nPdu Buffer (kèm PDU vừa tới) xuống TcpIp_UdpTransmit()." },
  { abbr: "TRIGGER_NEVER", full: "SOAD_TRIGGER_NEVER", cat: "NPDU", desc: "Chế độ chỉ nạp PDU vào nPdu Buffer và chờ PDU TRIGGER_ALWAYS, tràn MTU hoặc TriggerTimeout." },
  { abbr: "TriggerTimeout", full: "SoAdSocketUdpTriggerTimeout", cat: "NPDU", desc: "Thời gian chờ tối đa (ms) cho gói TRIGGER_NEVER trong nPdu trước khi MainFunction() tự xả." },
  { abbr: "SoAdRxBuffer", full: "TCP Stream Reassembly Buffer", cat: "NPDU", desc: "Bộ đệm RAM gắn trên SoCon TCP giúp tích lũy dữ liệu khi 8B Header hoặc Payload bị cắt mảnh." },
  { abbr: "Sticky TCP", full: "Back-to-Back TCP PDU Concatenation", cat: "NPDU", desc: "Hiện tượng một TCP segment chứa liền lúc từ 2 PDU trở lên; SoAd lặp phân tách cho hết buffer." },
  { abbr: "Fragmented TCP", full: "Split / Partial TCP Stream", cat: "NPDU", desc: "Hiện tượng một PDU lớn hoặc 8B Header bị TCP tách qua 2+ lần callback SoAd_RxIndication()." },
  { abbr: "IF Interface", full: "Communication Interface (Single-Shot)", cat: "NPDU", desc: "Truyền/nhận trực tiếp từng PDU trọn vẹn trong một lần gọi (SoAd_IfTransmit / IfRxIndication)." },
  { abbr: "TP Interface", full: "Transport Protocol (Streaming)", cat: "NPDU", desc: "Truyền/nhận luồng dữ liệu lớn chia mảnh theo buffer với StartOfReception, CopyRxData, CopyTxData." },
  { abbr: "BufReq_ReturnType", full: "Buffer Request Return Type", cat: "NPDU", desc: "Giá trị trả về của CopyTxData/CopyRxData: BUFREQ_OK, BUFREQ_E_NOT_OK, BUFREQ_E_BUSY, BUFREQ_E_OVFL." },
  { abbr: "ImmTpTxConf", full: "TCP Immediate TP Tx Confirmation", cat: "NPDU", desc: "Cờ báo hoàn tất TpTxConfirmation ngay sau khi đẩy hết byte cho TcpIp mà không đợi TCP ACK." },

  // ETH (13)
  { abbr: "TcpIp", full: "AUTOSAR TCP/IP Stack Module", cat: "ETH", desc: "Module cung cấp UDP, TCP, IPv4/IPv6, DHCP, ARP và giao tiếp socket ngay dưới SoAd." },
  { abbr: "SOME/IP", full: "Scalable service-Oriented MiddlewarE over IP", cat: "ETH", desc: "Giao thức middleware chuẩn ô tô chạy trên UDP/TCP qua SoAd để RPC và Publish/Subscribe." },
  { abbr: "SOME/IP-SD", full: "SOME/IP Service Discovery (Sd)", cat: "ETH", desc: "Module tìm kiếm dịch vụ và đăng ký Eventgroup dùng Multicast UDP qua SoAd." },
  { abbr: "DoIP", full: "Diagnostics over Internet Protocol (ISO 13400)", cat: "ETH", desc: "Giao thức chẩn đoán và nạp phần mềm ECU qua Ethernet sử dụng TCP port 13400 và UDP broadcast." },
  { abbr: "UdpNm", full: "UDP Network Management", cat: "ETH", desc: "Module đồng bộ trạng thái thức/ngủ của các ECU Ethernet qua gói broadcast/multicast UDP." },
  { abbr: "EthIf", full: "Ethernet Interface", cat: "ETH", desc: "Lớp trừu tượng hóa các bộ điều khiển MAC (Eth) và PHY (EthTrcv) nằm bên dưới TcpIp." },
  { abbr: "EthSM", full: "Ethernet State Manager", cat: "ETH", desc: "Module phối hợp ComM kiểm soát chế độ mạng NO_COM / FULL_COM và trạng thái link PHY." },
  { abbr: "PduR", full: "PDU Router", cat: "ETH", desc: "Bộ định tuyến PDU trung tâm chuyển tiếp giữa Com/LdCom/Dcm và SoAd/CanIf/FrIf." },
  { abbr: "SomeIpXf", full: "SOME/IP Transformer", cat: "ETH", desc: "Bộ chuyển đổi dữ liệu tại RTE mã hóa/giải mã cấu trúc dữ liệu ứng dụng thành khung SOME/IP." },
  { abbr: "BswM", full: "Basic Software Mode Manager", cat: "ETH", desc: "Bộ quản lý luật kích hoạt OpenSoCon, CloseSoCon hoặc EnableRouting theo ngữ cảnh xe." },
  { abbr: "VLAN PCP", full: "IEEE 802.1Q Priority Code Point (0..7)", cat: "ETH", desc: "3-bit ưu tiên trong VLAN tag xác định hàng đợi phần cứng (QoS) của Switch/MAC Ethernet." },
  { abbr: "NoDelay", full: "TCP_NODELAY (Disable Nagle Algorithm)", cat: "ETH", desc: "Tắt cơ chế gom gói trễ của Nagle trên TCP để gửi các gói phản hồi chẩn đoán tức thì." },
  { abbr: "KeepAlive", full: "TCP / UDP Alive Supervision", cat: "ETH", desc: "Cơ chế phát hiện đối tác mất kết nối vật lý hoặc treo hệ thống khi không có lưu lượng." },

  // API (16)
  { abbr: "SoAd_Init", full: "SoAd_Init(ConfigPtr)", cat: "API", desc: "Khởi tạo SoAd, Reset SoCon về OFFLINE và áp dụng trạng thái ban đầu của RoutingGroup." },
  { abbr: "SoAd_MainFunction", full: "SoAd_MainFunction() [0x19]", cat: "API", desc: "Hàm chu kỳ xử lý nPdu Timeout, đẩy kết nối TCP RECONNECT và pull TP Tx chunk." },
  { abbr: "SoAd_IfTransmit", full: "SoAd_IfTransmit(TxPduId, PduInfoPtr) [0x03]", cat: "API", desc: "API truyền gói IF đồng bộ (đóng 8B Header, nPdu buffer hoặc gửi thẳng xuống TcpIp)." },
  { abbr: "SoAd_TpTransmit", full: "SoAd_TpTransmit(TxPduId, PduInfoPtr) [0x05]", cat: "API", desc: "API khởi phát phiên truyền TP dài; dữ liệu được rút dần qua SoAd_CopyTxData()." },
  { abbr: "SoAd_RxIndication", full: "SoAd_RxIndication(SocketId, RemoteAddr, Buf, Len) [0x12]", cat: "API", desc: "Callback TcpIp báo có dữ liệu đến; SoAd lọc Best-Match, tách Header/Reassembly và đẩy tầng trên." },
  { abbr: "SoAd_CopyTxData", full: "SoAd_CopyTxData(SocketId, BufPtr, BufLen) [0x13]", cat: "API", desc: "Callback TcpIp kéo byte phát TCP TP từ tầng trên qua PduR_SoAdTpCopyTxData()." },
  { abbr: "SoAd_TxConfirmation", full: "SoAd_TxConfirmation(SocketId, Length) [0x15]", cat: "API", desc: "Callback TcpIp xác nhận số byte TCP/UDP đã truyền xong để báo Upper Layer TxConfirmation." },
  { abbr: "SoAd_OpenSoCon", full: "SoAd_OpenSoCon(SoConId) [0x09]", cat: "API", desc: "Yêu cầu mở SoCon (tăng OpenRefCounter) và chuyển tới bind/connect thành ONLINE." },
  { abbr: "SoAd_CloseSoCon", full: "SoAd_CloseSoCon(SoConId, abort) [0x0A]", cat: "API", desc: "Đóng SoCon (giảm OpenRefCounter hoặc ép hủy ngay nếu abort=TRUE)." },
  { abbr: "SoAd_EnableRouting", full: "SoAd_EnableRouting(id) [0x0F]", cat: "API", desc: "Cho phép truyền/nhận các PDU thuộc RoutingGroup id (thường được SD gọi)." },
  { abbr: "SoAd_DisableRouting", full: "SoAd_DisableRouting(id) [0x10]", cat: "API", desc: "Khóa luồng truyền/nhận của RoutingGroup id nhưng vẫn giữ kết nối socket mở." },
  { abbr: "SoAd_IfRoutingGroupTransmit", full: "SoAd_IfRoutingGroupTransmit(id) [0x04]", cat: "API", desc: "Kích hoạt gửi lại các IF PDU (Initial Events) thuộc RoutingGroup có TxTriggerable=TRUE." },
  { abbr: "SoAd_SetRemoteAddr", full: "SoAd_SetRemoteAddr(SoConId, RemoteAddrPtr) [0x11]", cat: "API", desc: "Gán hoặc cập nhật Remote IP:Port động cho SoCon tại runtime (khi SD tìm thấy Service)." },
  { abbr: "SoAd_SetUniqueRemoteAddr", full: "SoAd_SetUniqueRemoteAddr(SoConId, RemoteAddr, AssignedId) [0x1E]", cat: "API", desc: "Cấp/khóa một SoCon riêng biệt từ nhóm Wildcard cho từng peer hoặc trả về ID đang tồn tại." },
  { abbr: "SoAd_TcpIpEvent", full: "SoAd_TcpIpEvent(SocketId, Event) [0x17]", cat: "API", desc: "Callback xử lý TCP_RESET, TCP_CLOSED, TCP_FIN_RECEIVED để abort TP và hồi phục RECONNECT." },
  { abbr: "SoAd_LocalIpAddrAssignmentChg", full: "SoAd_LocalIpAddrAssignmentChg(IpAddrId, State) [0x18]", cat: "API", desc: "Callback báo đổi trạng thái IP cục bộ (ASSIGNED / ONHOLD / UNASSIGNED) từ TcpIp." }
];
