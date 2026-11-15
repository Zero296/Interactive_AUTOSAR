// ==================== DOIP REGISTERS, CONSTANTS, ECUC TOOLTIPS, MODULES & ABBREVIATIONS ====================

const DOIP_NODE_ROUTING_BITS = [
  { bit: 7, short: "ACT_LN", name: "Activation Line ON", tone: "ok", desc: "Bit 7: BswM/Pin kéo DoIP_ActivationLineSwitchActive() lên mức HIGH." },
  { bit: 6, short: "IP_RDY", name: "Local IP Assigned", tone: "ok", desc: "Bit 6: TcpIp đã cấp IP (TCPIP_IPADDR_STATE_ASSIGNED) qua SoAd -> DoIP." },
  { bit: 5, short: "UDP_AN", name: "UDP Announce Sent", tone: "ok", desc: "Bit 5: DoIP đã phát UDP Vehicle Announcement (0x0004) hoặc phục vụ Discovery 0x0001..03." },
  { bit: 4, short: "TCP_OP", name: "TCP Socket Online", tone: "ok", desc: "Bit 4: Có ít nhất 1 TCP SoConId (Port 13400 hoặc TLS 3496) ở trạng thái ONLINE." },
  { bit: 3, short: "RT_ACT", name: "Routing Active", tone: "ok", desc: "Bit 3: Ít nhất 1 Tester đã vượt qua 0x0005/0x0006 và đạt DOIP_ROUTING_ACTIVE." },
  { bit: 2, short: "SWC_AU", name: "SWC Auth Granted", tone: "ok", desc: "Bit 2: SWC_DoIPAuth qua RTE đã xác thực Routing Activation & Confirmation thành công." },
  { bit: 1, short: "ALV_WT", name: "Alive Check Wait", tone: "warn", desc: "Bit 1: Đang gửi Alive Check Request (0x0007) chờ 0x0008 trong 500ms để thu hồi socket." },
  { bit: 0, short: "GW_CAN", name: "CanTp Gateway Path", tone: "ok", desc: "Bit 0: Luồng UDS 0x8001 đang định tuyến qua Edge Gateway PduR -> CanTp -> CAN-FD (0x2001)." }
];

const DOIP_HEADER_DIAG_BITS = [
  { bit: 7, short: "HDR_OK", name: "Header Sync & XOR OK", tone: "ok", desc: "Bit 7: Byte 0 & Byte 1 thỏa (ProtoVer ^ InvVer) == 0xFF theo ISO 13400-2." },
  { bit: 6, short: "LEN_OK", name: "Payload Len Valid", tone: "ok", desc: "Bit 6: PayloadLength (4B) hợp lệ với PayloadType & <= DoIPMaxByteArrayLength." },
  { bit: 5, short: "SATA_OK", name: "Known SA & TA", tone: "ok", desc: "Bit 5: Tester Source Address & Target ECU Address khớp bảng DoIPTester/Channel." },
  { bit: 4, short: "TP_LCK", name: "TP Buffer Locked", tone: "warn", desc: "Bit 4: Đệm streaming PduR/DoIP đang bận nhận hoặc phát khung UDS dài (4KB TP)." },
  { bit: 3, short: "DG_ACK", name: "0x8002 Diag ACK", tone: "ok", desc: "Bit 3: DoIP đã gửi Diagnostic Message Positive ACK (0x8002 Code 0x00) về Tester." },
  { bit: 2, short: "DG_NCK", name: "0x8003 Diag NACK", tone: "err", desc: "Bit 2: DoIP từ chối gói 0x8001 và trả 0x8003 (Invalid SA 0x02 / Unknown TA 0x03 / TP Err 0x08)." },
  { bit: 1, short: "HD_NCK", name: "0x0000 Header NACK", tone: "err", desc: "Bit 1: Lỗi Generic Header -> DoIP phát NACK 0x0000 (0x00 Incorrect Pattern / 0x01 / 0x02)." },
  { bit: 0, short: "DET_SC", name: "DET(173)/IdsM Event", tone: "err", desc: "Bit 0: Có lỗi DET ModuleId=173 hoặc sự kiện an ninh IdsM vừa được ghi nhận." }
];

const DOIP_PAYLOAD_TYPES = {
  "0x0000": { name: "Generic DoIP Header NACK", transport: "UDP/TCP" },
  "0x0001": { name: "Vehicle Identification Req", transport: "UDP" },
  "0x0002": { name: "Vehicle ID Req with EID", transport: "UDP" },
  "0x0003": { name: "Vehicle ID Req with VIN", transport: "UDP" },
  "0x0004": { name: "Vehicle Announcement / ID Resp", transport: "UDP" },
  "0x0005": { name: "Routing Activation Request", transport: "TCP" },
  "0x0006": { name: "Routing Activation Response", transport: "TCP" },
  "0x0007": { name: "Alive Check Request", transport: "TCP" },
  "0x0008": { name: "Alive Check Response", transport: "TCP" },
  "0x4001": { name: "DoIP Entity Status Request", transport: "UDP" },
  "0x4002": { name: "DoIP Entity Status Response", transport: "UDP" },
  "0x4003": { name: "Diagnostic Power Mode Info Req", transport: "UDP" },
  "0x4004": { name: "Diagnostic Power Mode Info Rsp", transport: "UDP" },
  "0x8001": { name: "Diagnostic Message (UDS)", transport: "TCP" },
  "0x8002": { name: "Diagnostic Message Positive ACK", transport: "TCP" },
  "0x8003": { name: "Diagnostic Message Negative ACK", transport: "TCP" }
};

const DOIP_HEADER_NACK_CODES = {
  "0x00": "Incorrect pattern format (ProtoVer ^ InvVer != 0xFF -> Close TCP socket)",
  "0x01": "Unknown payload type",
  "0x02": "Message too large (> DoIPMaxByteArrayLength)",
  "0x03": "Out of memory (TP Rx buffer busy)",
  "0x04": "Invalid payload length"
};

const DOIP_ROUTING_CODES = {
  "0x00": "Denied: Unknown source address",
  "0x01": "Denied: All supported TCP sockets registered & active",
  "0x02": "Denied: SA different from active socket SA",
  "0x03": "Denied: SA already registered on another live socket",
  "0x04": "Denied: Missing authentication (SWC_DoIPAuth)",
  "0x05": "Denied: Rejected confirmation (SWC_DoIPAuth)",
  "0x06": "Denied: Unsupported routing activation type",
  "0x07": "Denied: Requires encrypted TLS connection (Port 3496)",
  "0x10": "Routing successfully activated",
  "0x11": "Routing activated, confirmation pending (async)"
};

const DOIP_DIAG_NACK_CODES = {
  "0x02": "Invalid source address (SA mismatch with socket)",
  "0x03": "Unknown target address (TA not in DoIPChannel table)",
  "0x04": "Diagnostic message too large",
  "0x05": "Out of memory",
  "0x06": "Target unreachable (PduR/Dcm/CanTp offline)",
  "0x07": "Unknown network",
  "0x08": "Transport protocol error (StartOfReception BUFREQ_E_NOT_OK / Busy)"
};

// ==================== 36 ECUC TOOLTIP METADATA (HOVER > 1s) ====================
const configTooltipData = {
  // Tab 0: General & Identification
  DoIPDevErrorDetect: {
    title: "DoIPDevErrorDetect",
    ecucPath: "/AUTOSAR/EcucDefs/DoIP/DoIPGeneral/DoIPDevErrorDetect",
    sws: "SWS_DoIP_00010",
    range: "TRUE / FALSE",
    typical: "TRUE (Dev) / FALSE (Prod)",
    role: "Bật/tắt kiểm tra lỗi phát triển (DET) cho ModuleId = 173 (0x00AD).",
    mechanism: "Khi TRUE, mọi API đều kiểm tra trạng thái Init, con trỏ NULL (0x04), PduId hợp lệ (0x03) trước khi xử lý và báo Det_ReportError(173, ...).",
    scenarioImpact: "Ảnh hưởng trực tiếp Kịch bản S12: nếu FALSE, các lời gọi sai tham số sẽ không phát sự kiện DET."
  },
  DoIPVersionInfoApi: {
    title: "DoIPVersionInfoApi",
    ecucPath: "/AUTOSAR/EcucDefs/DoIP/DoIPGeneral/DoIPVersionInfoApi",
    sws: "SWS_DoIP_00015",
    range: "TRUE / FALSE",
    typical: "TRUE",
    role: "Cung cấp hàm DoIP_GetVersionInfo(Std_VersionInfoType* versioninfo).",
    mechanism: "Trả về VendorId, ModuleId = 173 (0x00AD) và phiên bản AUTOSAR R23-11 (23.11.0) phục vụ kiểm tra tích hợp BSW.",
    scenarioImpact: "Bật để nút Quick Action [DET / Ver] hoặc Kịch bản S12 có thể đọc Version Info chuẩn AUTOSAR."
  },
  DoIPActivationLinePinMode: {
    title: "DoIPActivationLinePinMode",
    ecucPath: "/AUTOSAR/EcucDefs/DoIP/DoIPGeneral/DoIPActivationLinePinMode",
    sws: "SWS_DoIP_00279",
    range: "ACTIVE | INACTIVE",
    typical: "ACTIVE (OBD Pin 8 = High)",
    role: "Phản ánh trạng thái đường kích hoạt phần cứng (Ethernet Activation Line Pin / BswM switch).",
    mechanism: "DoIP chỉ mở UDP Announcement và TCP Listen Socket 13400 khi cả Activation Line = ACTIVE lẫn Local IP = ASSIGNED.",
    scenarioImpact: "Ảnh hưởng S1 (Startup) và S11 (Shutdown khi tắt Activation Line)."
  },
  DoIPLogicalAddressHex: {
    title: "DoIPLogicalAddress",
    ecucPath: "/AUTOSAR/EcucDefs/DoIP/DoIPGeneral/DoIPLogicalAddress",
    sws: "SWS_DoIP_00017",
    range: "0x0001 .. 0xFFFE (16-bit)",
    typical: "0x1001",
    role: "Địa chỉ logic duy nhất 16-bit của DoIP Entity (node gateway/ECU) trên mạng xe.",
    mechanism: "Được nhúng vào trường Logical Address (Bytes 17..18 payload) trong gói Vehicle Announcement 0x0004 và Routing Activation Response 0x0006.",
    scenarioImpact: "Tester dùng giá trị này để nhận diện node DoIP chính khi phát 0x0001..0x0004."
  },
  DoIPEidMacHex: {
    title: "DoIPEid (Entity ID / MAC 6B)",
    ecucPath: "/AUTOSAR/EcucDefs/DoIP/DoIPGeneral/DoIPEid",
    sws: "SWS_DoIP_00018",
    range: "6 Bytes Hex (MAC)",
    typical: "00:1A:2B:3C:4D:5E",
    role: "Entity Identification 6 byte duy nhất của interface mạng ECU (thường lấy từ MAC EthIf).",
    mechanism: "Dùng để so khớp bộ lọc khi Tester gửi Vehicle Identification Request với EID (0x0002).",
    scenarioImpact: "Ảnh hưởng S2 (UDP Vehicle Discovery 0x0002) và nội dung gói 0x0004."
  },
  DoIPVinString: {
    title: "DoIPVin (17-char Vehicle ID)",
    ecucPath: "/AUTOSAR/EcucDefs/DoIP/DoIPGeneral/DoIPVin",
    sws: "SWS_DoIP_00021",
    range: "17 ký tự ASCII",
    typical: "WBA1234567890DOIP",
    role: "Số khung xe VIN 17 ký tự đọc từ NVM/Dem/SWC để quảng bá DoIP Discovery.",
    mechanism: "Khi nhận gói UDP 0x0003 (VID Req with VIN), DoIP so sánh từng byte với chuỗi VIN này; chỉ trả lời 0x0004 nếu khớp 100%.",
    scenarioImpact: "Thử thay đổi VIN trong S2 để thấy DoIP từ chối im lặng khi VIN Request không khớp."
  },

  // Tab 1: UDP Vehicle Announcement
  DoIPVehicleAnnounceCount: {
    title: "DoIPVehicleAnnouncementCount",
    ecucPath: "/AUTOSAR/EcucDefs/DoIP/DoIPUdpVehicleAnnouncement/DoIPVehicleAnnouncementCount",
    sws: "SWS_DoIP_00025",
    range: "0 .. 10 (ISO: A_DoIP_Announce_Num = 3)",
    typical: "3",
    role: "Số lần ECU tự động phát bản tin UDP Broadcast 0x0004 ngay sau khi có IP và Activation Line.",
    mechanism: "DoIP_MainFunction đếm ngược bộ đếm lặp và gọi SoAd_IfTransmit() đủ số lần cấu hình.",
    scenarioImpact: "Trong S1: mặc định phát 3 lần liên tiếp; chỉnh thành 1 hoặc 5 sẽ thay đổi số khung 0x0004 phát ra."
  },
  DoIPVehicleAnnounceIntervalMs: {
    title: "DoIPVehicleAnnouncementInterval",
    ecucPath: "/AUTOSAR/EcucDefs/DoIP/DoIPUdpVehicleAnnouncement/DoIPVehicleAnnouncementInterval",
    sws: "SWS_DoIP_00026",
    range: "50 .. 5000 ms (ISO: A_DoIP_Announce_Interval = 500ms)",
    typical: "500 ms",
    role: "Chu kỳ nghỉ giữa 2 lần phát UDP Vehicle Announcement 0x0004 liên tiếp.",
    mechanism: "Mỗi nhịp DoIP_MainFunction trừ dần biến đếm interval; khi về 0 thì phát gói kế tiếp.",
    scenarioImpact: "Hiển thị trực tiếp trên thanh timer T_Announce của kịch bản S1."
  },
  DoIPInitialVehicleAnnounceDelayMs: {
    title: "DoIPInitialVehicleAnnouncementTime",
    ecucPath: "/AUTOSAR/EcucDefs/DoIP/DoIPUdpVehicleAnnouncement/DoIPInitialVehicleAnnouncementTime",
    sws: "SWS_DoIP_00024",
    range: "0 .. 500 ms (ISO: A_DoIP_Announce_Wait)",
    typical: "250 ms",
    role: "Độ trễ ban đầu (random/config backoff 0..500ms) sau khi gán IP để tránh bão broadcast đồng thời trên Switch.",
    mechanism: "Bắt buộc chờ hết T_InitialAnnounce trước khi phát bản tin 0x0004 đầu tiên.",
    scenarioImpact: "Tạo bước chuyển trung gian ANNOUNCE_WAIT trong State Machine 1."
  },
  DoIPFurtherActionByteHex: {
    title: "DoIPFurtherActionByte",
    ecucPath: "/AUTOSAR/EcucDefs/DoIP/DoIPUdpVehicleAnnouncement/DoIPFurtherActionByte",
    sws: "SWS_DoIP_00201",
    range: "0x00 (None) | 0x10 (Central Security/Routing) | 0x11..0xFF (OEM)",
    typical: "0x00",
    role: "Byte báo cho Tester biết bước tiếp theo có yêu cầu chứng thực bảo mật tập trung hay không.",
    mechanism: "Nằm ở Byte 31 của payload Vehicle Announcement 0x0004.",
    scenarioImpact: "Nếu đặt 0x10, Tester hiểu cần chuẩn bị chứng chỉ xác thực khi mở TCP 0x0005."
  },
  DoIPVinGidSyncStatus: {
    title: "DoIPVinGidSyncStatus",
    ecucPath: "/AUTOSAR/EcucDefs/DoIP/DoIPUdpVehicleAnnouncement/DoIPVinGidSyncStatus",
    sws: "SWS_DoIP_00028",
    range: "TRUE (0x00 Synced) / FALSE (0x10 Not Synced)",
    typical: "TRUE",
    role: "Byte 32 tùy chọn cho biết VIN và GID (Group ID) trên toàn xe đã đồng bộ hay chưa.",
    mechanism: "Nếu FALSE, trường SyncStatus trong 0x0004 gửi giá trị 0x10 cảnh báo Tester đọc lại sau.",
    scenarioImpact: "Hiển thị trực tiếp trong bản tin 0x0004 ở S1 & S2."
  },
  DoIPUseMacForGid: {
    title: "DoIPUseMacAddressForIdentification",
    ecucPath: "/AUTOSAR/EcucDefs/DoIP/DoIPGeneral/DoIPUseMacAddressForIdentification",
    sws: "SWS_DoIP_00029",
    range: "TRUE / FALSE",
    typical: "TRUE",
    role: "Chọn dùng MAC của interface Ethernet làm GID (Group ID) mặc định khi SWC chưa cung cấp GID riêng.",
    mechanism: "Nếu FALSE, DoIP gọi callback Rte_Call_DoIP_GetGid() sang SWC để lấy 6 byte GID.",
    scenarioImpact: "Nếu FALSE, kịch bản S1/S2 kích hoạt luồng mũi tên RTE lấy GID từ SWC_DoIPAuth."
  },

  // Tab 2: TCP Sockets & Timers
  DoIPMaxTesterConnections: {
    title: "DoIPMaxTesterConnections",
    ecucPath: "/AUTOSAR/EcucDefs/DoIP/DoIPConnections/DoIPMaxTesterConnections",
    sws: "SWS_DoIP_00031",
    range: "1 .. 5 sockets (TCP)",
    typical: "3",
    role: "Số kết nối TCP chẩn đoán tối đa DoIP quản lý đồng thời trong bảng DoIP_TcpConnTable.",
    mechanism: "Khi số socket đạt Max và có Tester mới xin kích hoạt 0x0005, DoIP phát Alive Check 0x0007 để tìm socket chết/rỗi mà thu hồi.",
    scenarioImpact: "Thay đổi số hàng bảng DoIP_TcpConnTable và quyết định ngưỡng bùng nổ Alive Check trong S6!"
  },
  DoIPInitialInactivityTimeMs: {
    title: "DoIPInitialInactivityTime (T_TCP_Initial_Inactivity)",
    ecucPath: "/AUTOSAR/EcucDefs/DoIP/DoIPGeneral/DoIPInitialInactivityTime",
    sws: "SWS_DoIP_00033 / ISO 13400-2",
    range: "200 .. 20000 ms (Chuẩn ISO = 2000ms)",
    typical: "2000 ms",
    role: "Thời hạn tối đa sau khi TCP 3-way handshake mà Tester PHẢI gửi bản tin Routing Activation 0x0005.",
    mechanism: "Hết 2000ms chưa nhận được 0x0005 hợp lệ -> DoIP gọi SoAd_CloseSoCon() đóng ngay kết nối tránh treo slot.",
    scenarioImpact: "Kịch bản S4 mô phỏng thành công trước 2000ms và nhánh What-If timeout tại 2000ms."
  },
  DoIPGeneralInactivityTimeMs: {
    title: "DoIPGeneralInactivityTime (T_TCP_General_Inactivity)",
    ecucPath: "/AUTOSAR/EcucDefs/DoIP/DoIPGeneral/DoIPGeneralInactivityTime",
    sws: "SWS_DoIP_00034 / ISO 13400-2",
    range: "5000 .. 600000 ms (Chuẩn ISO = 300000ms / 5 phút)",
    typical: "300000 ms",
    role: "Thời gian chờ không có bất kỳ bản tin DoIP nào trên socket đã Active Routing.",
    mechanism: "Reset về 0 mỗi khi nhận 0x8001 hoặc 0x0008. Hết 300s không hoạt động -> DoIP tự đóng TCP Socket để giải phóng RAM/SoCon.",
    scenarioImpact: "Thử nghiệm chính trong Kịch bản S11 (Idle 300s Timeout)."
  },
  DoIPAliveCheckResponseTimeoutMs: {
    title: "DoIPAliveCheckResponseTimeout (T_TCP_Alive_Check)",
    ecucPath: "/AUTOSAR/EcucDefs/DoIP/DoIPGeneral/DoIPAliveCheckResponseTimeout",
    sws: "SWS_DoIP_00035 / ISO 13400-2",
    range: "100 .. 5000 ms (Chuẩn ISO = 500ms)",
    typical: "500 ms",
    role: "Cửa sổ thời gian chờ Tester trả lời Alive Check Response (0x0008) sau khi ECU gửi 0x0007.",
    mechanism: "Socket nào trả lời 0x0008 kịp trong 500ms được giữ lại; socket im lặng sẽ bị đóng ngay khi hết 500ms.",
    scenarioImpact: "Quyết định socket nào bị thu hồi nhường chỗ cho Tester 0x0E03 ở Kịch bản S6."
  },
  DoIPMainFunctionPeriodMs: {
    title: "DoIPMainFunctionPeriod",
    ecucPath: "/AUTOSAR/EcucDefs/DoIP/DoIPGeneral/DoIPMainFunctionPeriod",
    sws: "SWS_DoIP_00041",
    range: "1 .. 100 ms",
    typical: "10 ms",
    role: "Chu kỳ OS Schedule gọi hàm DoIP_MainFunction() để quét mọi bộ đếm thời gian và poll SWC Async.",
    mechanism: "Mỗi lần nhấn [+1 Tick] sẽ cộng thời gian mô phỏng đúng bằng chu kỳ này và kiểm tra timeout/DOIP_E_PENDING.",
    scenarioImpact: "Ảnh hưởng nhịp độ T_Announce, T_Initial_Inactivity, T_General_Inactivity, T_Alive_Check và SWC Polling."
  },
  DoIPHostNameSizeMax: {
    title: "DoIPHostNameSizeMax",
    ecucPath: "/AUTOSAR/EcucDefs/DoIP/DoIPGeneral/DoIPHostNameSizeMax",
    sws: "SWS_DoIP_00281",
    range: "8 .. 64 bytes",
    typical: "32",
    role: "Độ dài tối đa tên máy chủ mDNS / DHCP Option 12 khi cấu hình mở rộng danh tính Ethernet.",
    mechanism: "Đưa vào cấu trúc DoIP_ConfigType và DoIP_Cfg.h để giới hạn buffer tĩnh.",
    scenarioImpact: "Xuất ra macro DOIP_HOST_NAME_SIZE_MAX trong tab DoIP_Cfg.h."
  },
  DoIPEnableTlsPort3496: {
    title: "DoIPEnableTlsPort3496 (ISO 13400-2:2019 TLS)",
    ecucPath: "/AUTOSAR/EcucDefs/DoIP/DoIPConnections/DoIPEnableTlsPort3496",
    sws: "SWS_DoIP_00290 / ISO 13400-2:2019",
    range: "TRUE / FALSE",
    typical: "FALSE (Port 13400) / TRUE (TLS 3496)",
    role: "Bắt buộc dùng kênh mã hóa TLS 1.2/1.3 trên cổng TCP 3496 đối với Routing Activation bảo mật.",
    mechanism: "Khi TRUE, mọi gói Routing Activation 0x0005 loại 0xE0 đi vào cổng thường 13400 sẽ bị từ chối với Routing Code 0x07 (TLS required)!",
    scenarioImpact: "Bật ở S5 để chứng kiến NACK 0x07 trên port 13400 rồi chuyển sang TLS port 3496 thành công."
  },

  // Tab 3: Routing Activation & SWC
  DoIPMaxByteArrayLength: {
    title: "DoIPMaxByteArrayLength",
    ecucPath: "/AUTOSAR/EcucDefs/DoIP/DoIPGeneral/DoIPMaxByteArrayLength",
    sws: "SWS_DoIP_00037",
    range: "64 .. 65535 Bytes",
    typical: "4096",
    role: "Kích thước gói DoIP payload lớn nhất mà ECU đủ RAM tiếp nhận trong một thông điệp TP.",
    mechanism: "Nếu PayloadLength trong Generic Header 8B > DoIPMaxByteArrayLength, DoIP trả ngay Header NACK 0x0000 với code 0x02 (Message too large).",
    scenarioImpact: "Thử giảm xuống 512 rồi chạy S10 (Flash 4KB) hoặc S3 để kích hoạt Header NACK 0x02 / Diag NACK 0x04."
  },
  DoIPAuthCallbackMode: {
    title: "DoIPAuthenticationCallbackMode (SWC_DoIPAuth)",
    ecucPath: "/AUTOSAR/EcucDefs/DoIP/DoIPRoutingActivation/DoIPRoutingActivationAuthenticationCallback",
    sws: "SWS_DoIP_00105",
    range: "RTE_SYNC_OK | RTE_ASYNC_PENDING | RTE_DENIED | NONE",
    typical: "RTE_SYNC_OK",
    role: "Cấu hình hành vi hàm callback xác thực trực tiếp qua RTE giữa DoIP và SWC_DoIPAuth.",
    mechanism: "Nếu ASYNC_PENDING, SWC trả DOIP_E_PENDING nên DoIP giữ socket ở AUTH_PENDING và poll lại mỗi DoIP_MainFunction() cho tới khi E_OK.",
    scenarioImpact: "Kịch bản S5 khai thác triệt để chế độ RTE_ASYNC_PENDING & RTE_DENIED (trả Code 0x04)."
  },
  DoIPConfCallbackRequired: {
    title: "DoIPRoutingActivationConfirmationCallback",
    ecucPath: "/AUTOSAR/EcucDefs/DoIP/DoIPRoutingActivation/DoIPRoutingActivationConfirmationCallback",
    sws: "SWS_DoIP_00108",
    range: "TRUE / FALSE",
    typical: "TRUE",
    role: "Bắt buộc hỏi ý kiến xác nhận cuối cùng của SWC (ví dụ điều kiện an toàn xe đứng yên v=0) trước khi kích hoạt Routing.",
    mechanism: "Sau khi Authentication đỗ, DoIP gọi Confirmation Callback. Nếu SWC từ chối -> gửi 0x0006 mã 0x05 (Rejected confirmation).",
    scenarioImpact: "Tạo bước CONF_PENDING trong S5; tắt đi sẽ nhảy thẳng từ AUTH sang ACTIVE."
  },
  DoIPRoutingActivationNumHex: {
    title: "DoIPRoutingActivationNumber",
    ecucPath: "/AUTOSAR/EcucDefs/DoIP/DoIPRoutingActivation/DoIPRoutingActivationNumber",
    sws: "SWS_DoIP_00112",
    range: "0x00 (Default) | 0x01 (WWH-OBD) | 0xE0 (OEM Auth)",
    typical: "0x00",
    role: "Mã Activation Type được cấu hình hỗ trợ cho phiên Routing Activation.",
    mechanism: "Nếu Tester gửi mã khác danh sách hỗ trợ (VD 0xAA), DoIP trả NACK 0x0006 Code 0x06 (Unsupported Activation Type).",
    scenarioImpact: "Dùng bởi Quick Action [TCP Rout] và kịch bản S4, S5."
  },
  DoIPSourceAddressTester1Hex: {
    title: "DoIPTesterSA_1 (Primary Tester Logical Addr)",
    ecucPath: "/AUTOSAR/EcucDefs/DoIP/DoIPTester/DoIPTesterSA",
    sws: "SWS_DoIP_00120",
    range: "0x0E00 .. 0x0EFF (ISO Reserved External Test Equipment)",
    typical: "0x0E00",
    role: "Địa chỉ logic của Máy chẩn đoán chính được khai báo trong bảng DoIPTester.",
    mechanism: "Cả 0x0005 lẫn 0x8001 đều kiểm tra SA phải khớp Tester đã đăng ký; nếu sai trả 0x0006(0x00) hoặc 0x8003(0x02).",
    scenarioImpact: "Dùng xuyên suốt S4..S10."
  },
  DoIPSourceAddressTester2Hex: {
    title: "DoIPTesterSA_2 (Secondary Tester Logical Addr)",
    ecucPath: "/AUTOSAR/EcucDefs/DoIP/DoIPTester/DoIPTesterSA_2",
    sws: "SWS_DoIP_00120",
    range: "0x0E00 .. 0x0EFF",
    typical: "0x0E01",
    role: "Địa chỉ logic của Máy chẩn đoán thứ 2 dùng để mô phỏng tranh chấp đa kết nối & Alive Check.",
    mechanism: "Cho phép đồng thời nhiều Tester giữ socket trong DoIP_TcpConnTable.",
    scenarioImpact: "Dùng trong Kịch bản S6 để lấp đầy TCP socket pool và kích hoạt Alive Check 0x0007."
  },

  // Tab 4: Target Channels & Gateway
  DoIPLocalDcmTargetHex: {
    title: "DoIPLocalDcmTargetAddress",
    ecucPath: "/AUTOSAR/EcucDefs/DoIP/DoIPChannel/DoIPTargetAddressRef",
    sws: "SWS_DoIP_00132",
    range: "16-bit Target Logical Address",
    typical: "0x1001",
    role: "Target Address đại diện cho Dcm nội bộ ngay trên ECU chạy DoIP (nhánh Local UDS).",
    mechanism: "Khi nhận 0x8001 có TA=0x1001, DoIP map sang PduR RxPduId_0 -> PduR đẩy thẳng lên Dcm -> SWC_Diag.",
    scenarioImpact: "Kích hoạt nhánh Local Dcm trong S7 và S10."
  },
  DoIPGwCanTpTargetHex: {
    title: "DoIPGwCanTpTargetAddress (Edge Gateway)",
    ecucPath: "/AUTOSAR/EcucDefs/DoIP/DoIPChannel/DoIPTargetAddress_CanGW",
    sws: "SWS_DoIP_00133",
    range: "16-bit Target Logical Address",
    typical: "0x2001",
    role: "Target Address của ECU con nằm trên mạng CAN-FD sau bộ định tuyến PduR Edge Gateway.",
    mechanism: "Khi nhận 0x8001 có TA=0x2001, DoIP giữ nguyên luồng TP chuyển cho PduR; PduR rẽ nhánh sang CanTp -> CanIf -> CAN-FD!",
    scenarioImpact: "Kích hoạt luồng Ethernet-to-CAN Gateway hoàn chỉnh trong Kịch bản S9."
  },
  DoIPFuncGroupTargetHex: {
    title: "DoIPFunctionalGroupAddress",
    ecucPath: "/AUTOSAR/EcucDefs/DoIP/DoIPChannel/DoIPFuncTargetAddress",
    sws: "SWS_DoIP_00135",
    range: "0xE000 .. 0xEFFF (ISO Functional Addressing)",
    typical: "0xE400",
    role: "Địa chỉ nhóm Functional dùng để broadcast UDS (VD: TesterPresent 3E 80) đồng loạt tới nhiều ECU.",
    mechanism: "DoIP định tuyến TA=0xE400 tới tất cả các kênh PduR được ánh xạ vào nhóm functional.",
    scenarioImpact: "Có thể chọn gửi tới địa chỉ này hoặc kiểm tra trong bảng Lcfg.c."
  },
  DoIPUseHeaderNackOnInvalidLen: {
    title: "DoIPUseHeaderNackOnInvalidLen",
    ecucPath: "/AUTOSAR/EcucDefs/DoIP/DoIPGeneral/DoIPUseHeaderNackOnInvalidLen",
    sws: "SWS_DoIP_00059",
    range: "TRUE / FALSE",
    typical: "TRUE",
    role: "Kiểm tra độ dài Payload Length của từng Payload Type so với bảng quy định cứng của ISO 13400-2.",
    mechanism: "Ví dụ gói 0x0001 bắt buộc Length=0, gói 0x0005 dài 7B hoặc 11B. Sai quy chuẩn -> bắn 0x0000 Code 0x04 (Invalid payload length).",
    scenarioImpact: "Ảnh hưởng S3 (Header Guard) và What-If kiểm tra độ dài gói."
  },
  DoIPEnableDiagAck0x8002: {
    title: "DoIPEnableDiagAck0x8002",
    ecucPath: "/AUTOSAR/EcucDefs/DoIP/DoIPGeneral/DoIPEnableDiagAck0x8002",
    sws: "SWS_DoIP_00142",
    range: "TRUE / FALSE",
    typical: "TRUE",
    role: "Bật gửi gói xác nhận 0x8002 (Positive Diagnostic ACK, Code 0x00) ngay khi PduR_DoIPTpStartOfReception trả BUFREQ_OK.",
    mechanism: "Theo chuẩn ISO 13400-2, ngay khi chuyển giao UDS vào TP stack thành công, DoIP báo 0x8002 cho Tester trước khi có phản hồi UDS thực sự.",
    scenarioImpact: "Tắt để xem luồng S7 không gửi gói trung gian 0x8002 (chỉ chờ đáp án Dcm)."
  },
  DoIPMaxTpChunkBytes: {
    title: "DoIPMaxTpChunkBytes (TCP MSS Segment Size)",
    ecucPath: "/AUTOSAR/EcucDefs/DoIP/DoIPConnections/DoIPMaxTpChunkBytes",
    sws: "SWS_DoIP_00161",
    range: "64 .. 4096 Bytes",
    typical: "1460 Bytes",
    role: "Kích thước tối đa mỗi lần DoIP_SoAdTpCopyRxData / CopyTxData bơm dữ liệu cắt lát qua TCP.",
    mechanism: "Với gói Flash 0x36 dài 4096B và MaxTpChunk = 1460B, DoIP thực hiện đúng 3 chu kỳ streaming (1460 + 1460 + 1176 = 4096B).",
    scenarioImpact: "Thay đổi số chunk streaming TP trong Kịch bản S10!"
  },

  // Tab 5: Runtime Injection & Security
  InjectedProtoVerHex: {
    title: "InjectedProtoVer (Simulated Byte 0)",
    ecucPath: "Simulation/HeaderInject/ProtoVer",
    sws: "ISO 13400-2 Table 1",
    range: "0x02 (2012) | 0x03 (2019) | 0xFF (Default VID) | 0x99 (Bad)",
    typical: "0x02",
    role: "Giá trị Protocol Version (Byte 0) giả lập cho khung DoIP tiếp theo từ Tester.",
    mechanism: "Cùng với Byte 1 phải thỏa (Ver ^ InvVer) == 0xFF; nếu không khớp sẽ kích hoạt ngay Header NACK 0x0000 Code 0x00 và đóng TCP socket.",
    scenarioImpact: "Thay đổi giá trị này thành 0x04 rồi bấm UDS/UDP để test bẫy Header Guard."
  },
  InjectedInvVerHex: {
    title: "InjectedInvVer (Simulated Byte 1 = ~Ver)",
    ecucPath: "Simulation/HeaderInject/InvVer",
    sws: "ISO 13400-2 Table 1",
    range: "0xFD (~0x02) | 0xFC (~0x03) | 0x00 (Default VID)",
    typical: "0xFD",
    role: "Giá trị Inverse Protocol Version (Byte 1) dùng để phát hiện hỏng khung trên lớp TCP byte-stream.",
    mechanism: "Công thức kiểm tra bitwise tại tầng đầu vào DoIP: ((uint8)hdr[0] ^ (uint8)hdr[1]) == 0xFFu.",
    scenarioImpact: "Sửa thành 0xFE để phá luật XOR và quan sát Bit 1 Thanh B (HDR_NACK) bật đỏ."
  },
  InjectedDiagPayloadLen: {
    title: "InjectedDiagPayloadLen (Simulated Bytes 4..7)",
    ecucPath: "Simulation/HeaderInject/PayloadLength",
    sws: "ISO 13400-2 Section 9.2",
    range: "0 .. 100000 Bytes",
    typical: "6",
    role: "Độ dài payload khai báo trong 4 byte cuối Generic Header (bao gồm SA 2B + TA 2B + UDS bytes).",
    mechanism: "So sánh với DoIPMaxByteArrayLength; nếu vượt ngưỡng sẽ kích hoạt Header NACK 0x0000 Code 0x02 (Out of Bounds).",
    scenarioImpact: "Đặt 8192 (> 4096) để mô phỏng lỗi Overflow trong S3 hoặc Quick Action."
  },
  InjectedDiagDataHex: {
    title: "InjectedDiagDataHex (UDS SDU Payload)",
    ecucPath: "Simulation/DiagPayload/UdsHex",
    sws: "ISO 14229-1 UDS",
    range: "Hex bytes (VD: 22 F1 90)",
    typical: "22 F1 90",
    role: "Chuỗi byte UDS thực tế đi sau SA (2B) và TA (2B) bên trong Payload Type 0x8001.",
    mechanism: "VD: '22 F1 90' = ReadDataByIdentifier VIN; '10 02' = Programming Session; '36 01 ...' = TransferData.",
    scenarioImpact: "Hiển thị trong ô Payload Decode của Panel 1 và truyền sang Dcm/CanTp."
  },
  DoIPEnableIdsMSecurityEvents: {
    title: "DoIPEnableIdsMSecurityEvents",
    ecucPath: "/AUTOSAR/EcucDefs/DoIP/DoIPGeneral/DoIPSecurityEventReporting",
    sws: "SWS_DoIP_00302 / SWS_IdsM",
    range: "TRUE / FALSE",
    typical: "TRUE",
    role: "Báo cáo các bất thường giao thức DoIP sang Intrusion Detection System Manager (IdsM) bên cạnh DET.",
    mechanism: "Các hành vi như sai XOR liên tiếp, cố ý dùng SA giả mạo 0x8003(0x02), hoặc phá TLS port 3496 được đẩy IdsM_SetSecurityEvent().",
    scenarioImpact: "Tăng bộ đếm DET/IdsM trên Header và bật Bit 0 Thanh B (DET_SC) trong S3, S5, S8, S12."
  }
};

// ==================== 9 MODULE DESCRIPTORS (COMPLETE SCHEMA FOR TAB 1) ====================
const MODULES_INFO = {
  MOD_SWC: {
    title: "SWC Layer (SWC_DoIPAuth & SWC_Diag)",
    layer: "Application Software Component Layer (ASW)",
    sws: "AUTOSAR RTE / VFB Interface",
    role: "Đóng vai trò 2 thành phần ứng dụng: (1) SWC_DoIPAuth kết nối TRỰC TIẾP với DoIP qua RTE để xác thực Routing Activation, kiểm tra Power Mode & cung cấp GID; (2) SWC_Diag phục vụ nghiệp vụ UDS (đọc VIN, nạp Flash) kết nối qua Dcm.",
    inputs: [
      "Từ DoIP qua RTE (Server Port): Authentication(SA, Type, ReqData), Confirmation(Res, SA, Type), GetPowerMode(), GetGid()",
      "Từ Dcm qua RTE: ReadDataByIdentifier (0x22 F1 90 VIN), RoutineControl / TransferData (0x36)"
    ],
    processing: "SWC_DoIPAuth kiểm tra chữ ký bảo mật / trạng thái an toàn xe; có thể trả ngay E_OK, từ chối E_NOT_OK hoặc trả DOIP_E_PENDING nếu đang đợi HSM xử lý bất đồng bộ. SWC_Diag đọc dữ liệu chẩn đoán ECU và tạo response UDS.",
    outputs: [
      "Trả về DoIP qua RTE: Std_ReturnType (E_OK / E_NOT_OK / DOIP_E_PENDING), AuthentificationResult, PowerMode(READY)",
      "Trả về Dcm qua RTE: Positive UDS Payload (VD: 62 F1 90 + VIN 17B)"
    ],
    apis: [
      "Rte_Call_DoIP_RoutingActivationAuthentication_Authentication()",
      "Rte_Call_DoIP_RoutingActivationConfirmation_Confirmation()",
      "Rte_Call_DoIP_GetPowerModeStatus_GetPowerMode()",
      "Rte_Call_DataServices_VIN_ReadData()"
    ],
    notes: "Đây là điểm đặc biệt kiến trúc của DoIP so với CanIf: DoIP có kênh gọi thẳng lên SWC qua RTE mà KHÔNG cần đi vòng qua PduR/Dcm!"
  },
  MOD_RTE: {
    title: "RTE (Runtime Environment)",
    layer: "AUTOSAR Runtime Environment",
    sws: "SWS_Rte R23-11",
    role: "Tạo cầu nối Client-Server / Sender-Receiver giữa lớp BSW Service (DoIP, Dcm) và lớp Ứng dụng SWC, đảm bảo tách biệt phần cứng và đa nhiệm OS Task.",
    inputs: [
      "Lời gọi đồng bộ/bất đồng bộ từ DoIP (Auth/Conf/PowerMode/GID) và từ Dcm (UDS DataServices)"
    ],
    processing: "Ánh xạ port interface, bảo vệ vùng nhớ chéo partition/core (IOC) và truyền con trỏ buffer dữ liệu xác thực OEM.",
    outputs: [
      "Chuyển tiếp lời gọi xuống SWC_DoIPAuth / SWC_Diag và trả kết quả phản hồi về BSW."
    ],
    apis: [
      "Rte_Call_DoIP_AuthPort(...)",
      "Rte_Call_DoIP_ConfPort(...)",
      "Rte_Call_Dcm_DidServices(...)"
    ],
    notes: "Khi DoIP nhận DOIP_E_PENDING từ RTE, DoIP_MainFunction() sẽ tự động lặp lại lời gọi ở chu kỳ tiếp theo."
  },
  MOD_DCM: {
    title: "Dcm (Diagnostic Communication Manager)",
    layer: "Services Layer (BSW Diagnostic Stack)",
    sws: "SWS_Dcm R23-11",
    role: "Xử lý giao thức chẩn đoán UDS (ISO 14229-1) cho ECU cục bộ (Local Target Address = 0x1001): quản lý Session (0x10), Security Access (0x27), DID (0x22) và Flash Download (0x34/0x36).",
    inputs: [
      "Nhận luồng UDS Rx từ PduR: Dcm_StartOfReception(), Dcm_CopyRxData(), Dcm_TpRxIndication()"
    ],
    processing: "Giải mã SID UDS, kiểm tra phân quyền Session/Security hiện tại, gọi sang SWC_Diag qua RTE để lấy VIN hoặc ghi Flash block, sau đó đóng gói Positive/Negative UDS Response (0x62 / 0x76 / 0x7F).",
    outputs: [
      "Gọi PduR_DcmTransmit() với PduId phản hồi để đẩy ngược gói UDS về DoIP -> TCP 13400.",
      "Cấp phát dữ liệu theo chu kỳ Dcm_CopyTxData()."
    ],
    apis: [
      "Dcm_StartOfReception()",
      "Dcm_CopyRxData()",
      "Dcm_TpRxIndication()",
      "PduR_DcmTransmit()"
    ],
    notes: "Chỉ những bản tin DoIP 0x8001 có Target Address trỏ vào ECU nội bộ (0x1001) mới đi tới Dcm."
  },
  MOD_PDUR: {
    title: "PduR (PDU Router)",
    layer: "Services Layer (BSW Communication Stack)",
    sws: "SWS_PduR R23-11",
    role: "Ngã ba định tuyến Zero-Copy TP: phân loại thông điệp UDS từ DoIP dựa trên Target Address (RxPduId) để gửi lên Dcm nội bộ (0x1001) HOẶC bẻ lái sang CanTp Edge Gateway (0x2001).",
    inputs: [
      "Từ DoIP: PduR_DoIPTpStartOfReception(), PduR_DoIPTpCopyRxData(), PduR_DoIPTpRxIndication()",
      "Từ Dcm / CanTp (chiều về): PduR_DcmTransmit() / PduR_CanTpTpRxIndication()"
    ],
    processing: "Tra bảng định tuyến tĩnh PduR_RoutingPathTable: ánh xạ 1-1 từ DoIP RxPduId sang đường dẫn đích (Local Dcm hay Gateway CanTp) với chi phí CPU gần như bằng 0 (Gateway on-the-fly hoặc buffered).",
    outputs: [
      "Nhánh Local (TA=0x1001): Gọi Dcm_StartOfReception() / Dcm_CopyRxData().",
      "Nhánh Gateway (TA=0x2001): Gọi CanTp_Transmit() để xuất ra mạng CAN-FD.",
      "Chiều về Tester: Gọi ngược DoIP_TpTransmit()."
    ],
    apis: [
      "PduR_DoIPTpStartOfReception()",
      "PduR_DoIPTpCopyRxData()",
      "PduR_DoIPTpRxIndication()",
      "PduR_DoIPTpCopyTxData()",
      "PduR_DoIPTpTxConfirmation()"
    ],
    notes: "Nếu cấu hình Target Address sai hoặc đích đang Offline, PduR trả BUFREQ_E_NOT_OK khiến DoIP gửi ngay 0x8003 NACK (Code 0x06 hoặc 0x08)."
  },
  MOD_CANTP_GW: {
    title: "CanTp + CanIf + CAN-FD (Edge Gateway Sub-Bus)",
    layer: "Services / ECU Abstraction (Sub-Bus CAN)",
    sws: "SWS_CanTp & SWS_CanIf R23-11",
    role: "Cổng chuyển tiếp Edge Gateway: nhận gói UDS lớn từ mạng Ethernet/DoIP qua PduR (TA=0x2001), thực hiện phân mảnh ISO-TP (SF/FF/FC/CF) trên khung CAN-FD 64B gửi tới ECU con.",
    inputs: [
      "Từ PduR: CanTp_Transmit(TxPduId_GW, PduInfoPtr) kèm yêu cầu PduR_CanTpCopyTxData()"
    ],
    processing: "Phân tách gói UDS thành First Frame (FF) + Consecutive Frame (CF) chờ Flow Control (FC) từ ECU đích trên bus CAN-FD; khi ECU CAN trả lời, CanTp tái lắp ghép rồi báo lên PduR.",
    outputs: [
      "Gửi xuống CanIf_Transmit() -> Bus CAN-FD (TA=0x2001).",
      "Phản hồi chiều về đẩy qua PduR -> DoIP_TpTransmit() -> TCP 13400."
    ],
    apis: [
      "CanTp_Transmit()",
      "CanTp_RxIndication()",
      "PduR_CanTpStartOfReception()",
      "CanIf_Transmit()"
    ],
    notes: "Nhờ mô hình DoIP -> PduR -> CanTp này, Máy chẩn đoán ngoài có thể nạp Flash cho ECU động cơ/phanh chỉ có CAN thông qua Central Gateway!"
  },
  MOD_BSWM: {
    title: "BswM / EcuM (Activation Line Controller)",
    layer: "System Services Layer (BSW Mode Management)",
    sws: "SWS_BswM & SWS_DoIP R23-11",
    role: "Điều khiển trạng thái kích hoạt phần cứng (Ethernet Activation Line / DoIP Enable Switch) khi có yêu cầu chẩn đoán OBD/ETH hoặc cần tắt DoIP tiết kiệm điện.",
    inputs: [
      "Tín hiệu chân cứng OBD Pin 8 (Ethernet Activation Line), ComM FullCom Request hoặc sự kiện tắt máy ECU Shutdown."
    ],
    processing: "Đánh giá luật Mode Arbitration; khi điều kiện thỏa mãn, BswM kích hoạt DoIP lên trạng thái sẵn sàng hoạt động hoặc hạ xuống chế độ ngủ an toàn.",
    outputs: [
      "Gọi API: DoIP_ActivationLineSwitchActive() hoặc DoIP_ActivationLineSwitchInactive()."
    ],
    apis: [
      "DoIP_ActivationLineSwitchActive()",
      "DoIP_ActivationLineSwitchInactive()",
      "BswM_RequestMode()"
    ],
    notes: "Nếu chỉ có địa chỉ IP DHCP mà Activation Line vẫn INACTIVE, DoIP kiên quyết KHÔNG mở cổng TCP 13400 và KHÔNG phát UDP 0x0004!"
  },
  MOD_DOIP: {
    title: "DoIP — Diagnostics over IP (Hero ModuleId = 173 / 0x00AD)",
    layer: "Services Layer (BSW Communication Stack)",
    sws: "SWS_DoIP R23-11 | ISO 13400-2:2012 & 2019",
    role: "Module trung tâm thực thi đầy đủ giao thức chẩn đoán trên nền IP/Ethernet: kiểm tra Generic Header 8B (luật XOR), khám phá xe UDP (0x0001..0x0004, 0x4001..0x4004), quản lý Pool TCP Socket & 4 bộ Timer, kích hoạt định tuyến kèm SWC Auth/TLS và streaming TP lên PduR.",
    inputs: [
      "Từ SoAd: DoIP_SoAdIfRxIndication() (UDP), DoIP_SoAdTpStartOfReception() / CopyRxData() / RxIndication() (TCP)",
      "Từ TcpIp/SoAd: DoIP_LocalIpAddrAssignmentChg(), DoIP_SoConModeChg()",
      "Từ BswM: DoIP_ActivationLineSwitchActive/Inactive()",
      "Từ PduR: DoIP_TpTransmit(), DoIP_TpCancelTransmit(), DoIP_TpCancelReceive()"
    ],
    processing: "1) Kiểm tra 8B Header: (Byte0 ^ Byte1) == 0xFF & PayloadLen <= Max. 2) Chế độ UDP: phát 3× 0x0004 sau T_InitialDelay, lọc EID/VIN cho 0x0001..03. 3) Chế độ TCP: quản lý DoIP_TcpConnTable, đếm T_Initial (2000ms), T_General (300s), T_Alive (500ms); gọi SWC_DoIPAuth. 4) Chế độ UDS 0x8001: xác thực SA/TA, phát 0x8002 ACK và cắt lát TP qua PduR.",
    outputs: [
      "Xuống SoAd: SoAd_IfTransmit() (UDP), SoAd_TpTransmit() (TCP 0x0006/0x0007/0x8001/0x8002/0x8003), SoAd_CloseSoCon()",
      "Lên PduR: PduR_DoIPTpStartOfReception(), PduR_DoIPTpCopyRxData(), PduR_DoIPTpRxIndication()",
      "Sang RTE/SWC: Rte_Call_DoIP_Auth/Conf/PowerMode/Gid",
      "Sang DET/IdsM: Det_ReportError(173, ...) / IdsM_SetSecurityEvent()"
    ],
    apis: [
      "DoIP_Init()",
      "DoIP_MainFunction()",
      "DoIP_ActivationLineSwitchActive()",
      "DoIP_LocalIpAddrAssignmentChg()",
      "DoIP_SoAdIfRxIndication()",
      "DoIP_SoAdTpStartOfReception()",
      "DoIP_SoAdTpCopyRxData()",
      "DoIP_SoAdTpCopyTxData()",
      "DoIP_TpTransmit()"
    ],
    notes: "ModuleId chuẩn = 173 (0x00AD). Quản lý cả 2 chuẩn ISO 13400-2:2012 (0x02, TCP 13400) và ISO 13400-2:2019 (0x03, TLS Port 3496)."
  },
  MOD_SOAD: {
    title: "SoAd + TcpIp + EthIf (Ethernet Lower Stack)",
    layer: "ECU Abstraction / Services Lower Network Stack",
    sws: "SWS_SoAd & SWS_TcpIp R23-11",
    role: "Cung cấp các kênh truyền tải Socket Abstraction (UDP Discovery 13400, TCP Diag 13400, TLS Encrypted 3496) và trừu tượng hóa TCP Byte-Stream thành AUTOSAR TP API cho DoIP.",
    inputs: [
      "Từ External Tester qua PHY/EthIf/TcpIp: các gói UDP Broadcast/Unicast và luồng TCP Segment.",
      "Từ DoIP: SoAd_IfTransmit(), SoAd_TpTransmit(), SoAd_OpenSoCon(), SoAd_CloseSoCon()."
    ],
    processing: "TcpIp thực hiện ARP/DHCP/AutoIP cấp phát địa chỉ IP và bắt tay TCP/TLS. SoAd ánh xạ mỗi kết nối TCP thành một SoConId riêng biệt và cung cấp dữ liệu vào DoIP thông qua bộ API StartOfReception / CopyRxData / CopyTxData.",
    outputs: [
      "Đẩy lên DoIP: DoIP_LocalIpAddrAssignmentChg(), DoIP_SoConModeChg(), DoIP_SoAdIfRxIndication(), DoIP_SoAdTp*().",
      "Đẩy ra dây mạng Ethernet PHY về External Tester."
    ],
    apis: [
      "SoAd_IfTransmit()",
      "SoAd_TpTransmit()",
      "SoAd_OpenSoCon()",
      "SoAd_CloseSoCon()",
      "DoIP_SoAdTpCopyRxData()"
    ],
    notes: "Lưu ý trong thực tế TCP là byte-stream nên một gói DoIP 4KB sẽ được SoAd cắt thành nhiều TCP segment (VD 1460B) gọi lặp DoIP_SoAdTpCopyRxData()."
  },
  MOD_LOWER_DET: {
    title: "DET (ModuleId 173) & IdsM Security Monitor",
    layer: "System Services (Diagnostics & Intrusion Detection)",
    sws: "SWS_Det & SWS_IdsM R23-11",
    role: "Ghi nhận và cảnh báo mọi lỗi lập trình API (DET) cũng như các hành vi nghi vấn tấn công mạng Ethernet/DoIP (IdsM Security Events).",
    inputs: [
      "Det_ReportError(ModuleId=173, InstanceId, ApiId, ErrorId)",
      "IdsM_SetSecurityEvent() khi gặp liên tiếp Header NACK 0x0000, giả mạo Tester SA 0x8003(0x02) hoặc từ chối TLS 0x07."
    ],
    processing: "Lưu vết mã lỗi (0x01 UNINIT, 0x02 PARAM, 0x03 INVALID_PDU_SDU_ID, 0x04 PARAM_POINTER), dừng hệ thống ở chế độ Debug hoặc gửi Security Event Record qua Dem/IdsM lên SOC.",
    outputs: [
      "Ghi vào nhật ký Trace Simulator, bật Bit 0 Thanh B (DET_SC) và tăng bộ đếm DET/IdsM trên Header."
    ],
    apis: [
      "Det_ReportError(173, 0, ApiId, ErrorId)",
      "Det_ReportRuntimeError(173, 0, ApiId, ErrorId)",
      "IdsM_SetSecurityEvent(DOIP_SEV_...)"
    ],
    notes: "Trong xe thương mại UNECE R155 Cyber Security, giám sát DoIP via IdsM là yêu cầu bắt buộc tại cổng Ethernet OBD."
  }
};

// ==================== 64 ABBREVIATIONS DICTIONARY ====================
const ABBREVIATIONS = [
  { abbr: "DoIP", full: "Diagnostics over Internet Protocol", cat: "CORE", desc: "Giao thức chẩn đoán ô tô qua IP/Ethernet chuẩn ISO 13400-2 & AUTOSAR SWS_DoIP (ModuleId 173 / 0x00AD)." },
  { abbr: "ISO 13400-2", full: "Road vehicles — DoIP Transport Protocol & Network Layer", cat: "CORE", desc: "Tiêu chuẩn quốc tế định nghĩa Generic Header 8B, UDP 13400, TCP 13400, TLS 3496 và các mã Payload Type." },
  { abbr: "SWS_DoIP", full: "AUTOSAR Specification of Diagnostics over IP", cat: "CORE", desc: "Tài liệu đặc tả chuẩn AUTOSAR Classic quy định cấu trúc ECUC, State Machine và API C của module DoIP." },
  { abbr: "ModuleId 173", full: "DoIP Standard AUTOSAR Module ID (0x00AD)", cat: "CORE", desc: "Mã định danh duy nhất của DoIP khi báo cáo với DET, IdsM và trả về trong DoIP_GetVersionInfo()." },
  { abbr: "Generic Header", full: "8-Byte Fixed DoIP Protocol Header", cat: "CORE", desc: "8 byte đầu tiên của mọi khung UDP/TCP DoIP: [ProtoVer (1B), InvVer (1B), PayloadType (2B), PayloadLength (4B)]." },
  { abbr: "XOR Check", full: "Protocol Version & Inverse Version Bitwise Guard", cat: "CORE", desc: "Kiểm tra bắt buộc (Byte0 ^ Byte1) == 0xFF nhằm phát hiện mất đồng bộ luồng TCP hoặc bản tin rác." },
  { abbr: "ProtoVer 0x02", full: "ISO 13400-2:2012 Protocol Version", cat: "CORE", desc: "Phiên bản DoIP kinh điển trên cổng TCP/UDP 13400; Inverse Version đi kèm là 0xFD." },
  { abbr: "ProtoVer 0x03", full: "ISO 13400-2:2019 Protocol Version", cat: "CORE", desc: "Phiên bản DoIP mới hỗ trợ bảo mật TLS cổng 3496; Inverse Version đi kèm là 0xFC." },
  { abbr: "ProtoVer 0xFF", full: "Default Vehicle Identification Version Byte", cat: "CORE", desc: "Giá trị phiên bản mặc định dùng riêng cho UDP Request 0x0001..0x0003 trước khi Tester biết bản DoIP của xe (InvVer = 0x00)." },
  { abbr: "0x0000", full: "Generic DoIP Header Negative Acknowledge (NACK)", cat: "CORE", desc: "Báo lỗi định dạng header (0x00 sai XOR, 0x01 sai Type, 0x02 quá kích thước, 0x03 tràn RAM, 0x04 sai độ dài)." },
  { abbr: "Activation Line", full: "OBD Ethernet Activation Line / BswM Control", cat: "CORE", desc: "Tín hiệu phần cứng hoặc lệnh BswM (DoIP_ActivationLineSwitchActive) cho phép ECU bật stack DoIP." },
  { abbr: "VIN", full: "Vehicle Identification Number (17 ASCII chars)", cat: "UDP", desc: "Số khung xe 17 ký tự được truyền trong gói Vehicle Announcement 0x0004 và dùng lọc gói 0x0003." },
  { abbr: "EID", full: "Entity Identification (6 Bytes, typically MAC)", cat: "UDP", desc: "Mã định danh 6 byte duy nhất của giao diện Ethernet ECU, dùng cho discovery 0x0002." },
  { abbr: "GID", full: "Group Identification (6 Bytes)", cat: "UDP", desc: "Mã nhóm 6 byte để gộp nhiều ECU DoIP trong cùng một chiếc xe khi quảng bá discovery." },
  { abbr: "Logical Address", full: "16-bit DoIP Source/Target Node Identifier", cat: "CORE", desc: "Địa chỉ logic 2 byte định danh Tester (0x0E00..0x0EFF) và từng ECU đích (VD: Dcm 0x1001, CanGW 0x2001)." },
  { abbr: "0x0001", full: "Vehicle Identification Request (Broadcast)", cat: "UDP", desc: "Gói UDP Broadcast Tester gửi tới cổng 13400 để quét tất cả các ECU DoIP hiện diện trên mạng." },
  { abbr: "0x0002", full: "Vehicle Identification Request with EID", cat: "UDP", desc: "Gói UDP tìm chính xác ECU có 6 byte EID (MAC) trùng khớp." },
  { abbr: "0x0003", full: "Vehicle Identification Request with VIN", cat: "UDP", desc: "Gói UDP tìm chính xác xe có số khung VIN 17 ký tự trùng khớp." },
  { abbr: "0x0004", full: "Vehicle Announcement / Identification Response", cat: "UDP", desc: "Gói UDP ECU trả lời 0x0001..03 hoặc tự động phát 3 lần liên tiếp khi vừa có IP và Activation Line." },
  { abbr: "A_DoIP_Announce_Wait", full: "Initial Vehicle Announcement Delay (0..500ms)", cat: "UDP", desc: "Thời gian chờ khởi đầu trước khi ECU phát gói 0x0004 đầu tiên nhằm tránh đụng độ đồng thời." },
  { abbr: "A_DoIP_Announce_Num", full: "Vehicle Announcement Repetition Count (3)", cat: "UDP", desc: "Số lần tự động lặp lại bản tin UDP 0x0004 sau khi gán IP (mặc định ISO là 3 lần)." },
  { abbr: "A_DoIP_Announce_Interval", full: "Vehicle Announcement Interval (500ms)", cat: "UDP", desc: "Khoảng nghỉ giữa 2 lần tự động phát 0x0004 (mặc định 500ms)." },
  { abbr: "0x4001 / 0x4002", full: "DoIP Entity Status Request & Response", cat: "UDP", desc: "Gói UDP hỏi nhanh sức chứa TCP socket tối đa, số socket đang mở và giới hạn kích thước gói ECU." },
  { abbr: "0x4003 / 0x4004", full: "Diagnostic Power Mode Info Request & Response", cat: "UDP", desc: "Gói UDP hỏi trạng thái nguồn chẩn đoán (0x00 Not Ready, 0x01 Ready) lấy trực tiếp từ SWC qua RTE." },
  { abbr: "FurtherActionByte", full: "Byte 31 of 0x0004 Announcement Payload", cat: "UDP", desc: "Chỉ thị Tester có cần bước xác thực bảo mật (0x10) hay hành động OEM đặc biệt (0x11..0xFF) trước khi Routing Activation." },
  { abbr: "VIN/GID Sync", full: "VIN and GID Synchronization Status Byte", cat: "UDP", desc: "Byte tùy chọn cuối gói 0x0004 báo hiệu VIN và GID đã đồng bộ (0x00) hay chưa đồng bộ (0x10)." },
  { abbr: "UDP 13400", full: "ISO 13400-2 Standardized Discovery UDP Port", cat: "UDP", desc: "Cổng UDP chuẩn 13400 dành cho mọi gói Vehicle ID, Announcement, Entity Status và Power Mode." },
  { abbr: "TCP 13400", full: "ISO 13400-2 Unencrypted Diagnostic TCP Port", cat: "TCP", desc: "Cổng TCP chuẩn 13400 dành cho Routing Activation, Alive Check và UDS Diagnostic Messages." },
  { abbr: "TLS 3496", full: "ISO 13400-2:2019 Encrypted Diagnostic TLS Port", cat: "TCP", desc: "Cổng TCP+TLS bảo mật chuẩn 3496 bắt buộc với các xe thế hệ mới bảo vệ UDS khỏi nghe lén/giả mạo." },
  { abbr: "SoConId", full: "SoAd Socket Connection Identifier", cat: "TCP", desc: "Chỉ số quản lý từng kết nối TCP trong DoIP_TcpConnTable (tương ứng hàng 0..Max-1)." },
  { abbr: "DoIP_TcpConnTable", full: "Internal TCP Connection & Routing State Table", cat: "TCP", desc: "Bảng nội bộ DoIP theo dõi trạng thái Socket, Tester SA, 3 Timer và khóa TP Buffer trên từng SoConId." },
  { abbr: "0x0005", full: "Routing Activation Request (TCP)", cat: "TCP", desc: "Gói đầu tiên Tester phải gửi trên TCP sau khi kết nối nhằm đăng ký SA và xin phép định tuyến UDS." },
  { abbr: "0x0006", full: "Routing Activation Response (TCP)", cat: "TCP", desc: "Phản hồi của DoIP xác nhận thành công (Code 0x10) hoặc từ chối (0x00..0x07)." },
  { abbr: "Routing Code 0x10", full: "Routing Successfully Activated", cat: "TCP", desc: "Mã thành công trong gói 0x0006, chuyển TCP Socket sang DOIP_ROUTING_ACTIVE để bắt đầu gửi UDS." },
  { abbr: "Routing Code 0x04/0x05", full: "Denied: Missing Auth / Rejected Confirmation", cat: "TCP", desc: "Mã từ chối kích hoạt khi SWC_DoIPAuth không cấp quyền hoặc điều kiện xe không an toàn." },
  { abbr: "Routing Code 0x07", full: "Denied: Requires TLS Connection (Port 3496)", cat: "TCP", desc: "Mã từ chối khi cấu hình DoIPEnableTlsPort3496=TRUE nhưng Tester gửi Activation Type bảo mật qua cổng 13400." },
  { abbr: "SWC_DoIPAuth", full: "Application Auth/Power/GID SWC (via RTE)", cat: "TCP", desc: "Component ứng dụng kết nối trực tiếp với DoIP qua RTE để xét duyệt chứng chỉ và điều kiện định tuyến." },
  { abbr: "DOIP_E_PENDING", full: "Pending Return Value for Async SWC Callbacks", cat: "TCP", desc: "Mã trả về đặc biệt cho biết SWC cần thêm thời gian (VD HSM tính chữ ký); DoIP giữ AUTH_PENDING và poll lại trong MainFunction." },
  { abbr: "T_Initial_Inactivity", full: "Initial Inactivity Timer (2000ms)", cat: "TCP", desc: "Giới hạn 2 giây từ lúc TCP mở kết nối; quá 2 giây chưa nhận 0x0005 thì DoIP ngắt socket ngay." },
  { abbr: "T_General_Inactivity", full: "General Inactivity Timer (300,000ms / 5 min)", cat: "TCP", desc: "Giới hạn 5 phút nhàn rỗi trên socket đã Active; hết thời gian tự đóng socket thu hồi tài nguyên." },
  { abbr: "0x0007 / 0x0008", full: "Alive Check Request & Alive Check Response", cat: "TCP", desc: "Cơ chế kiểm tra sức sống các socket cũ khi Pool đầy hoặc phát hiện trùng lặp SA." },
  { abbr: "T_Alive_Check", full: "Alive Check Response Timeout (500ms)", cat: "TCP", desc: "Cửa sổ 500ms chờ phản hồi 0x0008; socket không trả lời bị kết luận chết và thu hồi." },
  { abbr: "0x8001", full: "Diagnostic Message (DoIP Encapsulated UDS)", cat: "TP_GW", desc: "Khung chở thông điệp UDS [Tester SA 2B | ECU TA 2B | UDS SDU Bytes...] trên kết nối TCP." },
  { abbr: "0x8002", full: "Diagnostic Message Positive ACK", cat: "TP_GW", desc: "DoIP phản hồi Code 0x00 xác nhận UDS đã được PduR/Dcm tiếp nhận bộ đệm (StartOfReception OK)." },
  { abbr: "0x8003", full: "Diagnostic Message Negative ACK", cat: "TP_GW", desc: "DoIP từ chối gói 0x8001 với mã lỗi 0x02 (Invalid SA), 0x03 (Unknown TA), 0x06 (Unreachable), 0x08 (TP Error)." },
  { abbr: "SA / TA", full: "Source Address (Tester) & Target Address (ECU)", cat: "TP_GW", desc: "2 cặp địa chỉ 16-bit đầu payload 0x8001 dùng phân định quyền gửi của Tester và đích ECU nhận." },
  { abbr: "Local Dcm Path", full: "DoIP -> PduR -> Dcm -> SWC_Diag (TA 0x1001)", cat: "TP_GW", desc: "Luồng xử lý UDS nội bộ tại ECU chạy DoIP (VD đọc VIN 22 F1 90, nạp Flash chính ECU đó)." },
  { abbr: "Edge Gateway Path", full: "DoIP -> PduR -> CanTp -> CanIf -> CAN-FD (TA 0x2001)", cat: "TP_GW", desc: "Luồng Gateway bẻ lái gói DoIP sang mạng CAN-FD để chẩn đoán/flash ECU con không có Ethernet." },
  { abbr: "Functional TA 0xE400", full: "ISO 13400 Functional Multicast Target Address", cat: "TP_GW", desc: "Địa chỉ nhóm để một gói 0x8001 broadcast đồng thời tới nhiều ECU dưới quyền PduR." },
  { abbr: "TP Streaming", full: "Chunked Transport Protocol Segmentation", cat: "TP_GW", desc: "Cơ chế cắt gói UDS lớn (VD 4096B Flash 0x36) thành các lát TCP 1460B không tốn RAM copy trung gian." },
  { abbr: "BUFREQ_OK", full: "AUTOSAR TP Buffer Request Succeeded", cat: "TP_GW", desc: "Giá trị trả về của StartOfReception/CopyRxData/CopyTxData cho biết đệm tầng trên/dưới sẵn sàng." },
  { abbr: "BUFREQ_E_NOT_OK", full: "AUTOSAR TP Buffer Request Failed", cat: "TP_GW", desc: "Báo lỗi cấp phát bộ đệm từ PduR/Dcm khiến DoIP gửi ngay 0x8003 NACK Code 0x08." },
  { abbr: "DoIP_Init", full: "DoIP Module Initialization API", cat: "API", desc: "Hàm khởi tạo bảng cấu hình DoIP_ConfigType, xóa bảng Socket Pool và chuyển node sang trạng thái INACTIVE." },
  { abbr: "DoIP_MainFunction", full: "Cyclic Timing & Polling Task API", cat: "API", desc: "Hàm chạy định kỳ (VD 10ms) điều phối T_Announce, 3 TCP Timers và poll hàm SWC_DoIPAuth đang PENDING." },
  { abbr: "DoIP_ActivationLineSwitch", full: "DoIP_ActivationLineSwitchActive / Inactive", cat: "API", desc: "Hai hàm điều khiển bởi BswM để bật hoặc ngắt hoàn toàn tầng DoIP theo trạng thái đường kích hoạt." },
  { abbr: "DoIP_LocalIpAddrAssignmentChg", full: "TcpIp IP Assignment Callback to DoIP", cat: "API", desc: "SoAd gọi thông báo trạng thái IP cục bộ (ASSIGNED / UNASSIGNED) sau quá trình DHCP hoặc AutoIP." },
  { abbr: "DoIP_SoConModeChg", full: "SoAd Socket Mode Change Callback", cat: "API", desc: "Báo cho DoIP biết kết nối TCP/UDP đã chuyển sang ONLINE, RECONNECT hay OFFLINE." },
  { abbr: "DoIP_SoAdIfRxIndication", full: "UDP Discovery Indication Callback", cat: "API", desc: "SoAd đẩy dữ liệu gói UDP 13400 nhận được (0x0001..03, 0x4001, 0x4003) lên tầng phân tích DoIP." },
  { abbr: "DoIP_SoAdTpStartOfReception", full: "TCP TP Frame Start Callback", cat: "API", desc: "Khởi đầu phiên nhận một khung DoIP qua TCP và kiểm tra nhanh 8-byte Generic Header." },
  { abbr: "DoIP_SoAdTpCopyRxData", full: "TCP TP Rx Streaming Data Callback", cat: "API", desc: "Sao chép từng phân đoạn payload TCP từ SoAd đẩy dần vào DoIP -> PduR (truyền 4KB TP theo từng lát)." },
  { abbr: "DoIP_SoAdTpCopyTxData", full: "TCP TP Tx Streaming Data Callback", cat: "API", desc: "SoAd kéo từng phân đoạn payload phản hồi từ DoIP <- PduR để đẩy ra dây Ethernet." },
  { abbr: "DoIP_TpTransmit", full: "PduR Diagnostic Response Transmit Trigger", cat: "API", desc: "Hàm PduR gọi DoIP khi Dcm hoặc CanTp Gateway có gói phản hồi UDS cần đóng đầu 0x8001 gửi về Tester." },
  { abbr: "DET Error 0x01..0x04", full: "UNINIT(0x01), PARAM(0x02), PDU(0x03), PTR(0x04)", cat: "API", desc: "4 mã lỗi phát triển chuẩn SWS_DoIP báo về Det_ReportError(ModuleId=173, ...) khi vi phạm hợp đồng API." },
  { abbr: "IdsM", full: "Intrusion Detection System Manager", cat: "API", desc: "Module an ninh ô tô AUTOSAR R20-11+ tiếp nhận sự kiện tấn công DoIP (sai XOR, spoof SA, downgrade TLS)." }
];
