# -*- coding: utf-8 -*-
"""Generates part6_handbook.js: 6 Main Tabs x 4 Sub-tabs (24 topics) + Live Abbreviation Search & Bootstrap."""
import json
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)
from hb_diagrams_doip import build_diagrams  # noqa: E402


def build_handbook_data(d):
    return [
        # MAIN TAB 0: KIEN TRUC & HEADER 8B
        {
            "name": "1. Kiến Trúc & Header 8B",
            "subs": [
                {
                    "title": "1.1 Tổng Quan DoIP Trong AUTOSAR Classic ComStack",
                    "html": f"""
<div class="hb-card">
  <h3>1.1 Vị Trí &amp; Nhiệm Vụ Của DoIP (ModuleId = 173 / 0x00AD)</h3>
  <p>Trong kiến trúc <b>AUTOSAR Classic (R20-11 / R22-11 / R23-11)</b>, module <b>DoIP (Diagnostics over IP)</b> nằm tại tầng Services ngay phía trên Socket Adaptor (<code>SoAd</code>) và song hành cùng <code>PduR</code> &amp; <code>Dcm</code>.</p>
  {d['diag_stack']}
  <div class="hb-callout">
    <b>Điểm khác biệt kiến trúc quan trọng:</b> DoIP vừa đi qua <code>PduR</code> để truyền gói UDS (về <code>Dcm</code> nội bộ hoặc <code>CanTp</code> Gateway), vừa kết nối <b>trực tiếp lên SWC qua RTE</b> cho các dịch vụ xác thực (<code>SWC_DoIPAuth</code>), đọc Power Mode và GID!
  </div>
</div>"""
                },
                {
                    "title": "1.2 Giải Phẫu 8-Byte Generic Header & Luật XOR",
                    "html": f"""
<div class="hb-card">
  <h3>1.2 Cấu Trúc Bắt Buộc Của Mọi Khung ISO 13400-2</h3>
  <p>Tất cả thông điệp UDP và TCP của DoIP đều mở đầu bằng đúng <b>8 bytes Generic Header</b> (Big-Endian / Network Byte Order):</p>
  {d['diag_header']}
  <table class="hb-tbl">
    <tr><th>Offset</th><th>Trường</th><th>Kích thước</th><th>Giải thích &amp; Quy tắc kiểm tra</th></tr>
    <tr><td class="mono">Byte 0</td><td>Protocol Version</td><td class="mono">1 Byte</td><td><code>0x02</code> (ISO 13400-2:2012), <code>0x03</code> (ISO 13400-2:2019 TLS), <code>0xFF</code> (Default VID UDP).</td></tr>
    <tr><td class="mono">Byte 1</td><td>Inverse Protocol Ver</td><td class="mono">1 Byte</td><td>Bù 1 của Byte 0: bắt buộc <code>(Byte0 ^ Byte1) == 0xFF</code> (VD 0x02 &amp; 0xFD).</td></tr>
    <tr><td class="mono">Bytes 2..3</td><td>Payload Type</td><td class="mono">2 Bytes</td><td>Phân loại bản tin: UDP <code>0x0001..0x0004</code> / <code>0x4001..0x4004</code>, TCP <code>0x0005..0x0008</code>, Diag <code>0x8001..0x8003</code>.</td></tr>
    <tr><td class="mono">Bytes 4..7</td><td>Payload Length</td><td class="mono">4 Bytes</td><td>Số byte nối sau header 8B. Phải khớp độ dài chuẩn và <code>&lt;= DoIPMaxByteArrayLength</code>.</td></tr>
  </table>
</div>"""
                },
                {
                    "title": "1.3 Giao Tiếp SoAd: Interface (UDP) vs TP (TCP)",
                    "html": """
<div class="hb-card">
  <h3>1.3 Hai Cơ Chế Truyền Tải Song Hành Bên Dưới DoIP</h3>
  <table class="hb-tbl">
    <tr><th>Kênh vận chuyển</th><th>Cổng mặc định</th><th>API AUTOSAR DoIP &amp; SoAd</th><th>Đặc điểm</th></tr>
    <tr><td><b>UDP Discovery</b></td><td class="mono">UDP 13400</td><td class="mono">DoIP_SoAdIfRxIndication()<br>SoAd_IfTransmit()</td><td>Truyền cả khung nguyên vẹn (Single Packet) cho Broadcast/Unicast Discovery.</td></tr>
    <tr><td><b>TCP Diagnostic</b></td><td class="mono">TCP 13400</td><td class="mono">DoIP_SoAdTpStartOfReception()<br>DoIP_SoAdTpCopyRxData()<br>SoAd_TpTransmit()</td><td>TCP là byte-stream nên SoAd dùng bộ hàm TP cắt/ghép lát dữ liệu, không cấp phát buffer khổng lồ.</td></tr>
    <tr><td><b>TLS Diagnostic</b></td><td class="mono">TCP 3496</td><td class="mono">DoIP_SoConModeChg() + TLS Sock</td><td>Bổ sung từ ISO 13400-2:2019; mã hóa chẩn đoán chống nghe lén &amp; giả mạo OBD.</td></tr>
  </table>
</div>"""
                },
                {
                    "title": "1.4 So Sánh UDS Qua CAN (CanTp) vs Ethernet (DoIP)",
                    "html": """
<div class="hb-card">
  <h3>1.4 Tại Sao Xe Hiện Đại Chuyển Sang DoIP Central Gateway?</h3>
  <ul>
    <li><b>Băng thông nạp Flash:</b> CAN 2.0 (~500 kbps) / CAN-FD (~2-5 Mbps) mất hàng chục phút cho file ADAS/Infotainment vài GB; DoIP trên Automotive Ethernet (100BASE-T1 / 1000BASE-T1) tăng tốc gấp 50-100 lần.</li>
    <li><b>Kích thước khung UDS:</b> ISO-TP trên CAN cắt gói tối đa 4095B (CAN 2.0) với mỗi bước SF/FF/FC tốn thời gian bus; DoIP hỗ trợ trường PayloadLength 32-bit kết hợp streaming TP qua TCP.</li>
    <li><b>Định tuyến đa Tester:</b> Một Central Gateway có thể mở nhiều TCP Socket đồng thời (OTA Backend nội bộ + Máy chẩn đoán xưởng ngoài OBD) được phân định bằng 16-bit Logical Address.</li>
  </ul>
</div>"""
                }
            ]
        },

        # MAIN TAB 1: STARTUP & UDP VID
        {
            "name": "2. Startup & UDP VID",
            "subs": [
                {
                    "title": "2.1 Activation Line & Local IP Assignment Gate",
                    "html": f"""
<div class="hb-card">
  <h3>2.1 Điều Kiện Kép Để Bật Stack DoIP</h3>
  {d['diag_udp']}
  <p>Một ECU DoIP không tự ý mở port Ethernet chỉ vì có điện nguồn. Nó yêu cầu đồng thời 2 điều kiện logic AND:</p>
  <ol>
    <li><b>Activation Line ACTIVE:</b> BswM gọi <code>DoIP_ActivationLineSwitchActive()</code> (khi nhận kích hoạt từ OBD Pin 8 hoặc trạng thái mạng FullCom).</li>
    <li><b>Local IP ASSIGNED:</b> TcpIp/DHCP hoàn tất cấp IP và SoAd gọi <code>DoIP_LocalIpAddrAssignmentChg(..., TCPIP_IPADDR_STATE_ASSIGNED)</code>.</li>
  </ol>
</div>"""
                },
                {
                    "title": "2.2 Chu Kỳ 3× UDP Vehicle Announcement (0x0004)",
                    "html": """
<div class="hb-card">
  <h3>2.2 Cơ Chế Tự Động Phát Quảng Bá Khi Lên Mạng</h3>
  <ul>
    <li><b>Pha chờ tránh đụng độ (Backoff):</b> Sau khi cả Activation Line và IP sẵn sàng, DoIP đợi hết <code>DoIPInitialVehicleAnnouncementTime</code> (mặc định 0..500ms, sim=250ms) để các ECU trên switch không broadcast trùng thời điểm.</li>
    <li><b>Phát lặp 3 lần:</b> DoIP gọi <code>SoAd_IfTransmit()</code> phát gói UDP Broadcast <code>0x0004</code> (dài 33B payload) tổng cộng <code>DoIPVehicleAnnouncementCount</code> (chuẩn 3 lần), giãn cách mỗi lần <code>DoIPVehicleAnnouncementInterval</code> (500ms).</li>
    <li><b>Thành phần payload 0x0004:</b> VIN (17B) + Logical Address (2B) + EID/MAC (6B) + GID (6B) + FurtherActionByte (1B) + SyncStatus (1B tùy chọn).</li>
  </ul>
</div>"""
                },
                {
                    "title": "2.3 Lọc Discovery 0x0001 / 0x0002 (EID) / 0x0003 (VIN)",
                    "html": """
<div class="hb-card">
  <h3>2.3 Phân Biệt 3 Loại Yêu Cầu Tìm Xe Của Tester</h3>
  <table class="hb-tbl">
    <tr><th>Payload Type</th><th>Payload Req</th><th>Quy tắc phản hồi của ECU DoIP</th></tr>
    <tr><td class="mono">0x0001</td><td class="mono">0 Bytes</td><td>Tất cả DoIP ECU đang Active đều trả lời Unicast bằng <code>0x0004</code>.</td></tr>
    <tr><td class="mono">0x0002</td><td class="mono">6 Bytes EID</td><td>So sánh 6 byte EID (MAC); nếu khớp trả <code>0x0004</code>, nếu lệch <b>IM LẶNG BỎ QUA</b> (không trả NACK!).</td></tr>
    <tr><td class="mono">0x0003</td><td class="mono">17 Bytes VIN</td><td>So sánh 17 ký tự VIN; nếu khớp trả <code>0x0004</code>, nếu lệch <b>IM LẶNG BỎ QUA</b>.</td></tr>
  </table>
</div>"""
                },
                {
                    "title": "2.4 Entity Status (0x4001) & Power Mode (0x4003)",
                    "html": """
<div class="hb-card">
  <h3>2.4 Kiểm Tra Sức Chứa &amp; Nguồn Trước Khi Mở TCP</h3>
  <ul>
    <li><b>Entity Status Request (0x4001 ➔ 0x4002):</b> Trả về loại node (Gateway/ECU), số TCP connection tối đa (<code>DoIPMaxTesterConnections</code>), số TCP đang mở hiện tại và <code>DoIPMaxByteArrayLength</code>.</li>
    <li><b>Diagnostic Power Mode Request (0x4003 ➔ 0x4004):</b> DoIP gọi thẳng qua RTE hàm <code>Rte_Call_DoIP_GetPowerModeStatus()</code> tới <code>SWC_DoIPAuth</code> để biết xe đã sẵn sàng chẩn đoán (<code>0x01 Ready</code> vs <code>0x00 Not Ready</code>) hay chưa.</li>
  </ul>
</div>"""
                }
            ]
        },

        # MAIN TAB 2: TCP & SWC AUTH / TLS
        {
            "name": "3. TCP & SWC Auth/TLS",
            "subs": [
                {
                    "title": "3.1 Bảng Kết Nối DoIP_TcpConnTable & T_Initial_Inactivity",
                    "html": f"""
<div class="hb-card">
  <h3>3.1 Quản Lý Vòng Đời Mỗi Socket TCP Qua SoConId</h3>
  {d['diag_tcp']}
  <p>Ngay khi TCP 3-way handshake thành công, SoAd báo <code>DoIP_SoConModeChg(SoConId, SOAD_SOCON_ONLINE)</code>. DoIP lập tức bật bộ đếm <b>T_TCP_Initial_Inactivity (2000ms)</b>. Nếu quá 2 giây Tester không gửi <code>0x0005</code>, DoIP gọi <code>SoAd_CloseSoCon()</code> để chống cạn kiệt socket!</p>
</div>"""
                },
                {
                    "title": "3.2 Routing Activation (0x0005 ➔ 0x0006) & Bảng Mã Code",
                    "html": """
<div class="hb-card">
  <h3>3.2 Tất Cả Mã Phản Hồi Trong Gói 0x0006</h3>
  <table class="hb-tbl">
    <tr><th>Code</th><th>Trạng thái</th><th>Nguyên nhân &amp; Hành động của DoIP</th></tr>
    <tr><td class="mono">0x00</td><td>Denied</td><td>Unknown Source Address — Tester SA không có trong bảng ECUC <code>DoIPTester</code> ➔ đóng TCP.</td></tr>
    <tr><td class="mono">0x01</td><td>Denied</td><td>All supported TCP sockets registered &amp; active (sau khi chạy Alive Check không thu hồi được slot).</td></tr>
    <tr><td class="mono">0x04</td><td>Denied</td><td>Missing Authentication — <code>SWC_DoIPAuth</code> từ chối xác thực ➔ đóng TCP + báo IdsM.</td></tr>
    <tr><td class="mono">0x05</td><td>Denied</td><td>Rejected Confirmation — Điều kiện an toàn (VD xe đang chạy) không đạt ➔ đóng TCP.</td></tr>
    <tr><td class="mono">0x06</td><td>Denied</td><td>Unsupported Routing Activation Type (VD gửi Type lạ khác 0x00/0x01/0xE0).</td></tr>
    <tr><td class="mono">0x07</td><td>Denied</td><td>Requires TLS Connection — gửi yêu cầu bảo mật qua cổng thường 13400 khi ECU bật TLS 3496.</td></tr>
    <tr><td class="mono">0x10</td><td>Activated</td><td>Thành công! Chuyển slot sang <code>DOIP_ROUTING_ACTIVE</code>, bật <code>T_General_Inactivity</code> (300s).</td></tr>
  </table>
</div>"""
                },
                {
                    "title": "3.3 Tương Tác Trực Tiếp DoIP ↔ RTE ↔ SWC_DoIPAuth",
                    "html": """
<div class="hb-card">
  <h3>3.3 Xử Lý Bất Đồng Bộ Với DOIP_E_PENDING</h3>
  <p>Khi ECU dùng OEM Authentication (như ký số PKI / HSM), việc kiểm tra không xong trong 1 hàm đồng bộ:</p>
  <ol>
    <li>DoIP gọi <code>Rte_Call_DoIP_RoutingActivationAuthentication_Authentication()</code>.</li>
    <li><code>SWC_DoIPAuth</code> trả về <code>DOIP_E_PENDING</code> trong lúc đợi HSM tính toán.</li>
    <li>DoIP giữ socket ở trạng thái <code>AUTH_PENDING</code> (dừng timer đóng socket) và tự động gọi thăm dò lại ở các chu kỳ <code>DoIP_MainFunction()</code> kế tiếp cho tới khi nhận <code>E_OK</code> hoặc <code>E_NOT_OK</code>.</li>
  </ol>
</div>"""
                },
                {
                    "title": "3.4 Bảo Mật ISO 13400-2:2019 Với TLS Cổng 3496",
                    "html": """
<div class="hb-card">
  <h3>3.4 Chống Hạ Cấp Mã Hóa (TLS Downgrade Protection)</h3>
  <p>Từ bản ISO 13400-2:2019 (<code>ProtoVer = 0x03</code>), kết nối chẩn đoán chuẩn hỗ trợ mã hóa TLS 1.2/1.3 trên cổng <b>TCP 3496</b>.</p>
  <p>Khi tham số <code>DoIPEnableTlsPort3496 = TRUE</code>, nếu có Tester cố tình gửi bản tin kích hoạt <code>0x0005</code> trên cổng thường <code>13400</code>, DoIP phải chủ động từ chối bằng mã <b>0x07 (Requires TLS)</b>, đóng ngay socket 13400 và báo sự kiện an ninh về <code>IdsM</code>.</p>
</div>"""
                }
            ]
        },

        # MAIN TAB 3: ALIVE CHECK & TIMERS
        {
            "name": "4. Alive Check & Timers",
            "subs": [
                {
                    "title": "4.1 Cơ Chế Alive Check (0x0007 / 0x0008) Thu Hồi Socket",
                    "html": """
<div class="hb-card">
  <h3>4.1 Xử Lý Khi Đầy Pool Socket (MaxTesterConnections)</h3>
  <p>Trên thực tế máy chẩn đoán hay bị rút nóng cáp OBD mà không kịp gửi TCP FIN, khiến ECU giữ socket "ma" trên <code>DoIP_TcpConnTable</code>.</p>
  <ul>
    <li>Khi toàn bộ các slot đều bận và có Tester mới xin vào, DoIP không vội từ chối <code>0x01</code> mà gửi đồng loạt <b>Alive Check Request (0x0007)</b> tới các kết nối hiện có và mở đồng hồ <b>500ms</b>.</li>
    <li>Socket nào còn sống sẽ trả ngay <b>0x0008 (Alive Check Response kèm SA 2B)</b>.</li>
    <li>Socket im lặng quá 500ms bị kết luận là kết nối chết -> <code>SoAd_CloseSoCon()</code> thu hồi ngay slot để nhường cho Tester mới!</li>
  </ul>
</div>"""
                },
                {
                    "title": "4.2 Ma Trận 4 Bộ Định Thời Chuẩn ISO 13400-2",
                    "html": """
<div class="hb-card">
  <h3>4.2 Bốn Bộ Timer Vận Hành Trong DoIP_MainFunction()</h3>
  <table class="hb-tbl">
    <tr><th>Tên Timer</th><th>Giá trị chuẩn ISO</th><th>Khi nào chạy / reset?</th><th>Hậu quả khi Timeout</th></tr>
    <tr><td class="mono">T_Announce_Wait / Interval</td><td class="mono">0..500ms / 500ms</td><td>Khi vừa có ActLine + IP Ready</td><td>Phát đủ 3 lần UDP <code>0x0004</code></td></tr>
    <tr><td class="mono">T_TCP_Initial_Inactivity</td><td class="mono">2000 ms (2s)</td><td>Từ lúc TCP ONLINE chờ <code>0x0005</code></td><td>Đóng TCP Socket nếu Tester câm lặng</td></tr>
    <tr><td class="mono">T_TCP_General_Inactivity</td><td class="mono">300,000 ms (5 phút)</td><td>Reset mỗi khi có <code>0x8001</code> / <code>0x0008</code></td><td>Đóng TCP Socket giải phóng bộ đệm RAM</td></tr>
    <tr><td class="mono">T_TCP_Alive_Check</td><td class="mono">500 ms</td><td>Khi gửi <code>0x0007</code> hỏi thăm</td><td>Thu hồi socket không trả lời <code>0x0008</code></td></tr>
  </table>
</div>"""
                },
                {
                    "title": "4.3 T_General_Inactivity (300s) & Quản Lý RAM",
                    "html": """
<div class="hb-card">
  <h3>4.3 Vì Sao Cần T_General_Inactivity?</h3>
  <p>Kể cả khi phiên Routing đã Active, nếu Tester quên tắt phần mềm nhưng không gửi lệnh UDS nào suốt <b>300 giây</b>, kết nối TCP vẫn chiếm giữ slot và TP session trên Dcm/PduR.</p>
  <p>Trong <code>DoIP_MainFunction()</code>, mỗi chu kỳ OS Task sẽ trừ dần <code>GenTimerMs</code>. Về 0 thì DoIP gọi <code>SoAd_CloseSoCon()</code> dọn sạch trạng thái Routing và TP Buffer.</p>
</div>"""
                },
                {
                    "title": "4.4 Shutdown: ActivationLineSwitchInactive & Mất IP",
                    "html": """
<div class="hb-card">
  <h3>4.4 Ba Con Đường Dừng Hoạt Động DoIP An Toàn</h3>
  <ul>
    <li><b>BswM ngắt Activation Line:</b> <code>DoIP_ActivationLineSwitchInactive()</code> lập tức dừng mọi bộ đếm announce, ngắt toàn bộ socket đang Active và đưa node về trạng thái <code>SHUTDOWN / INACTIVE</code>.</li>
    <li><b>Mất địa chỉ IP (Link Down / DHCP Renew fail):</b> <code>DoIP_LocalIpAddrAssignmentChg(..., UNASSIGNED)</code> hủy tức thời các kênh TCP để ngăn PduR gửi dữ liệu vào socket cụt.</li>
    <li><b>Timeout đồng hồ TCP:</b> Xảy ra cục bộ trên từng <code>SoConId</code> bị treo.</li>
  </ul>
</div>"""
                }
            ]
        },

        # MAIN TAB 4: UDS 0x8001 & CANTP GATEWAY
        {
            "name": "5. UDS 0x8001 & CanTp GW",
            "subs": [
                {
                    "title": "5.1 Chuỗi 0x8001 / 0x8002 ACK / 0x8003 NACK",
                    "html": f"""
<div class="hb-card">
  <h3>5.1 Xử Lý Gói Chẩn Đoán UDS Trên TCP (0x8001)</h3>
  {d['diag_tp_gw']}
  <p>Cấu trúc payload của <code>0x8001</code> gồm: <code>Tester SA (2B) | Target ECU TA (2B) | UDS Bytes...</code>. DoIP bắt buộc kiểm tra cặp địa chỉ trước khi đẩy vào PduR:</p>
  <ul>
    <li><b>0x8002 Positive ACK (Code 0x00):</b> Gửi về Tester ngay khi <code>PduR_DoIPTpStartOfReception()</code> chấp nhận cấp đệm thành công.</li>
    <li><b>0x8003 Negative ACK:</b> Trả <code>0x02</code> (Invalid SA), <code>0x03</code> (Unknown TA), <code>0x06</code> (Target Unreachable) hoặc <code>0x08</code> (TP Error / Buffer Busy).</li>
  </ul>
</div>"""
                },
                {
                    "title": "5.2 Phân Nhánh PduR: Local Dcm (0x1001) vs CanTp Gateway (0x2001)",
                    "html": """
<div class="hb-card">
  <h3>5.2 Định Tuyến Hai Nhánh Trên Cùng Một Module DoIP</h3>
  <table class="hb-tbl">
    <tr><th>Target Address</th><th>PduR Routing Path</th><th>Chuỗi xử lý tầng trên / sub-bus</th></tr>
    <tr><td class="mono">0x1001 (Local ECU)</td><td><code>DoIP -> PduR -> Dcm -> SWC_Diag</code></td><td>Dcm giải mã SID <code>22 F1 90</code>, gọi RTE vào SWC đọc VIN rồi trả <code>PduR_DcmTransmit()</code>.</td></tr>
    <tr><td class="mono">0x2001 (Edge GW)</td><td><code>DoIP -> PduR -> CanTp -> CanIf -> CAN-FD</code></td><td>DoIP chỉ giao cho PduR; PduR bẻ lái sang CanTp đóng khung FF/CF truyền ra bus CAN-FD!</td></tr>
    <tr><td class="mono">0xE400 (Functional)</td><td><code>DoIP -> PduR Multicast</code></td><td>Phát lệnh chung (VD TesterPresent <code>3E 80</code>) tới nhiều ECU đồng thời.</td></tr>
  </table>
</div>"""
                },
                {
                    "title": "5.3 Streaming TP 4KB: CopyRxData & CopyTxData",
                    "html": """
<div class="hb-card">
  <h3>5.3 Cơ Chế Cắt Lát Dữ Liệu Lớn Không Tốn RAM Đệm Trung Gian</h3>
  <p>Khi Tester nạp Flash khối <code>0x36 TransferData</code> dài <b>4096 Bytes</b> vượt 1 TCP MSS (1460B):</p>
  <ol>
    <li>Segment TCP #1 chứa 8B Header + 4B SA/TA + ~1448B đầu UDS ➔ DoIP kiểm tra Header &amp; SA/TA xong liền gọi <code>PduR_DoIPTpStartOfReception(4096B)</code> và bơm lát #1 qua <code>PduR_DoIPTpCopyRxData()</code>.</li>
    <li>Segment TCP #2 &amp; #3 không có Header DoIP 8B nữa; <code>DoIP_SoAdTpCopyRxData()</code> đẩy nối thẳng dữ liệu vào đệm đích của Dcm/CanTp.</li>
    <li>Đủ 4096B, <code>DoIP_SoAdTpRxIndication(E_OK)</code> thông báo hoàn tất để Dcm ghi Flash và trả <code>0x76</code> qua <code>DoIP_TpTransmit()</code> + <code>DoIP_SoAdTpCopyTxData()</code>.</li>
  </ol>
</div>"""
                },
                {
                    "title": "5.4 Khóa Đệm TP Buffer Lock & Khôi Phục Lỗi",
                    "html": """
<div class="hb-card">
  <h3>5.4 Ngăn Đụng Độ Dữ Liệu Giữa Các Gói Nối Tiếp</h3>
  <p>Khi một khung TP nhiều segment đang dở dang trên một <code>SoConId</code>, DoIP bật cờ khóa nội bộ (<b>Bit 4 Thanh B: TP_LCK</b>). Nếu kết nối bất ngờ ngắt giữa chừng (IP Loss hoặc Timeout), <code>DoIP_SoConModeChg(OFFLINE)</code> lập tức gọi <code>PduR_DoIPTpRxIndication(NTFRSLT_E_NOT_OK)</code> để tầng Dcm/CanTp hủy phiên chờ và không bị treo deadlock.</p>
</div>"""
                }
            ]
        },

        # MAIN TAB 5: API R23-11, DET & DEBUG
        {
            "name": "6. API R23-11, DET & Debug",
            "subs": [
                {
                    "title": "6.1 Bảng Full API Chuẩn SWS_DoIP R23-11",
                    "html": """
<div class="hb-card">
  <h3>6.1 Toàn Bộ Giao Diện API AUTOSAR Classic DoIP (ModuleId = 173)</h3>
  <table class="hb-tbl">
    <tr><th>API Name (SWS_DoIP R23-11)</th><th>Chiều / Caller</th><th>Chức năng chính</th></tr>
    <tr><td class="mono">DoIP_Init()</td><td>EcuM / BswM ➔ DoIP</td><td>Khởi tạo bảng TCP Conn Pool, Reset timers về INACTIVE.</td></tr>
    <tr><td class="mono">DoIP_GetVersionInfo()</td><td>BswM / Diag ➔ DoIP</td><td>Trả VendorId, ModuleId = 173 (0x00AD) &amp; SW Version.</td></tr>
    <tr><td class="mono">DoIP_ActivationLineSwitchActive/Inactive()</td><td>BswM ➔ DoIP</td><td>Bật/Tắt kích hoạt toàn tầng DoIP theo trạng thái Pin/Mạng.</td></tr>
    <tr><td class="mono">DoIP_LocalIpAddrAssignmentChg()</td><td>SoAd ➔ DoIP</td><td>Thông báo TcpIp vừa cấp IP (ASSIGNED) hoặc mất IP (UNASSIGNED).</td></tr>
    <tr><td class="mono">DoIP_SoConModeChg()</td><td>SoAd ➔ DoIP</td><td>Thông báo trạng thái kết nối TCP/UDP ONLINE hoặc OFFLINE.</td></tr>
    <tr><td class="mono">DoIP_SoAdIfRxIndication()</td><td>SoAd ➔ DoIP</td><td>Nhận khung UDP Discovery (0x0001..03, 0x4001, 0x4003).</td></tr>
    <tr><td class="mono">DoIP_SoAdTpStartOfReception / CopyRxData / RxIndication()</td><td>SoAd ➔ DoIP</td><td>Nhận chuỗi byte-stream TCP cho 0x0005, 0x0008, 0x8001.</td></tr>
    <tr><td class="mono">DoIP_TpTransmit / SoAdTpCopyTxData / TxConfirmation()</td><td>PduR / SoAd ➔ DoIP</td><td>Phát phản hồi UDS 0x8001 từ Dcm/CanTp xuống SoAd TCP.</td></tr>
    <tr><td class="mono">DoIP_MainFunction()</td><td>OS Task ➔ DoIP</td><td>Đếm 4 bộ timer &amp; lặp thăm dò SWC Async DOIP_E_PENDING.</td></tr>
  </table>
</div>"""
                },
                {
                    "title": "6.2 Mã Lỗi DET (ModuleId 173) & Sự Kiện An Ninh IdsM",
                    "html": """
<div class="hb-card">
  <h3>6.2 Chẩn Đoán Lỗi Phát Triển &amp; An Ninh Mạng UNECE R155</h3>
  <table class="hb-tbl">
    <tr><th>Mã Lỗi</th><th>Loại</th><th>Hex</th><th>Nguyên nhân &amp; Khuyến nghị</th></tr>
    <tr><td class="mono">DOIP_E_UNINIT</td><td>DET</td><td class="mono">0x01</td><td>Gọi API trước <code>DoIP_Init()</code>. Kiểm tra EcuM BswM Init Order.</td></tr>
    <tr><td class="mono">DOIP_E_PARAM</td><td>DET</td><td class="mono">0x02</td><td>SoConId hoặc tham số chế độ nằm ngoài phạm vi hợp lệ.</td></tr>
    <tr><td class="mono">DOIP_E_INVALID_PDU_SDU_ID</td><td>DET</td><td class="mono">0x03</td><td><code>DoIPTxPduId</code> không tồn tại trong <code>DoIP_Lcfg.c</code>.</td></tr>
    <tr><td class="mono">DOIP_E_PARAM_POINTER</td><td>DET</td><td class="mono">0x04</td><td>Truyền con trỏ <code>NULL_PTR</code> vào API có tham chiếu PDU.</td></tr>
    <tr><td class="mono">IdsM Security Events</td><td>IdsM</td><td class="mono">SEV</td><td>Phát hiện sai XOR lặp lại (0x0000), giả mạo SA (0x8003 0x02) hoặc cố kết nối Port 13400 khi bắt TLS 3496 (0x07).</td></tr>
  </table>
</div>"""
                },
                {
                    "title": "6.3 Sáu Lỗi Thực Chiến DoIP Hay Gặp Trên Bench & Wireshark",
                    "html": """
<div class="hb-card">
  <h3>6.3 Kinh Nghiệm Debug Tích Hợp DoIP Stack</h3>
  <ol>
    <li><b>ECU có IP Ping được nhưng không phát UDP 0x0004:</b> Kiểm tra BswM đã gọi <code>DoIP_ActivationLineSwitchActive()</code> chưa!</li>
    <li><b>Tester gửi UDP 0x0003 trên Wireshark thấy đi nhưng ECU im re:</b> Kiểm tra từng ký tự 17 byte VIN (thường lệch padding khoảng trắng hoặc chữ hoa/thường) — chuẩn ISO quy định im lặng nếu VIN không khớp.</li>
    <li><b>Mở TCP 13400 thành công nhưng bị ECU gửi FIN đóng ngay sau 2 giây:</b> Tester chưa kịp gửi <code>0x0005 Routing Activation</code> trước hạn <code>T_Initial_Inactivity (2000ms)</code>.</li>
    <li><b>Gửi 0x0005 bị trả 0x0006 Code 0x07:</b> ECU đang bật TLS port 3496; đổi kết nối Tester sang cổng 3496 với <code>ProtoVer = 0x03</code>.</li>
    <li><b>Nhận 0x8003 NACK 0x03 khi gọi Gateway xuống ECU CAN:</b> Thiếu khai báo Target Address <code>0x2001</code> trong cả bảng <code>DoIPChannel</code> lẫn <code>PduR</code> Routing Path.</li>
    <li><b>Truyền file Flash lớn bị trả 0x0000 Code 0x02:</b> Tăng <code>DoIPMaxByteArrayLength</code> lên đủ chứa UDS block size + 4B SA/TA.</li>
  </ol>
</div>"""
                },
                {
                    "title": "6.4 Hướng Dẫn Xuất ARXML / Cfg.h / Lcfg.c Sang Công Cụ Thực Tế",
                    "html": """
<div class="hb-card">
  <h3>6.4 Quy Trình Đồng Bộ Cấu Hình Sang DaVinci / Tresos</h3>
  <ul>
    <li>Điều chỉnh 36 tham số ECUC trên 6 tab bên trái cho đến khi kịch bản chạy đúng yêu cầu và không còn cảnh báo ở Validation Banner.</li>
    <li>Bấm nút <b>📦 Xuất ARXML / Cfg / C</b> ở góc trên phải để xem và tải về 4 định dạng chuẩn: <code>DoIP.arxml</code>, <code>DoIP_Cfg.h</code>, <code>DoIP_Lcfg.c</code>, và <code>DoIP_Config.json</code>.</li>
    <li>Bấm <b>⬇️ Tải .HTML</b> bất kỳ lúc nào để xuất một file web offline hoàn chỉnh chia sẻ ngay cho đồng đội mà không cần server hay Internet!</li>
  </ul>
</div>"""
                }
            ]
        }
    ]


def main():
    diagrams = build_diagrams()
    tabs = build_handbook_data(diagrams)
    tabs_json = json.dumps(tabs, ensure_ascii=False, indent=2)

    js_tail = r"""
let hbState = {
  tab1: 0,
  subTab: [0, 0, 0, 0, 0, 0],
  abbrCat: "ALL"
};

function switchHbTab1(idx) {
  hbState.tab1 = idx;
  for (let i = 0; i < 7; i++) {
    const b = document.getElementById("hbTab1_" + i);
    if (b) b.classList.toggle("active", i === idx);
  }
  renderCurrentHandbookView();
}

function switchHbSubTab(subIdx) {
  hbState.subTab[hbState.tab1] = subIdx;
  renderCurrentHandbookView();
}

function setAbbrCategory(cat) {
  hbState.abbrCat = cat || "ALL";
  const allCats = ["ALL", "CORE", "UDP", "TCP", "TP_GW", "API"];
  allCats.forEach(c => {
    const el = document.getElementById("catPill_" + c);
    if (el) el.classList.toggle("active", c === hbState.abbrCat);
  });
  filterAbbreviationTable();
}

function highlightMatch(text, query) {
  const safeText = escHtml(text);
  const q = (query || "").trim();
  if (!q) return safeText;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  try {
    const re = new RegExp("(" + escaped + ")", "gi");
    return safeText.replace(re, "<mark>$1</mark>");
  } catch (e) {
    return safeText;
  }
}

function filterAbbreviationTable() {
  const inp = document.getElementById("abbrSearchInput");
  const q = (inp ? inp.value : "").trim().toLowerCase();
  const cat = hbState.abbrCat || "ALL";
  const area = document.getElementById("hbContentArea");
  const badge = document.getElementById("abbrCountBadge");
  if (!area) return;

  const filtered = ABBREVIATIONS.filter(item => {
    const catOk = cat === "ALL" || item.cat === cat;
    if (!catOk) return false;
    if (!q) return true;
    return (
      item.abbr.toLowerCase().includes(q) ||
      item.full.toLowerCase().includes(q) ||
      item.desc.toLowerCase().includes(q)
    );
  });

  if (badge) badge.textContent = filtered.length + " / " + ABBREVIATIONS.length + " mục";

  const rowsHtml = filtered.map(item =>
    "<tr>" +
    '<td class="mono" style="font-weight:700;color:var(--pri);white-space:nowrap;">' + highlightMatch(item.abbr, q) + "</td>" +
    "<td><b>" + highlightMatch(item.full, q) + "</b></td>" +
    '<td><span class="state-badge sb-cyan">' + escHtml(item.cat) + "</span></td>" +
    "<td>" + highlightMatch(item.desc, q) + "</td>" +
    "</tr>"
  ).join("");

  area.innerHTML =
    '<div class="hb-card">' +
    "<h3>7. Từ Điển Thuật Ngữ &amp; Viết Tắt AUTOSAR DoIP / ISO 13400-2 (" + filtered.length + " mục phù hợp)</h3>" +
    '<table class="hb-tbl">' +
    "<thead><tr><th style=\"width:170px;\">Thuật Ngữ / Code</th><th style=\"width:280px;\">Tên Đầy Đủ</th><th style=\"width:95px;\">Nhóm</th><th>Ý Nghĩa &amp; Vai Trò Trong AUTOSAR DoIP</th></tr></thead>" +
    "<tbody>" + (rowsHtml || '<tr><td colspan="4" style="text-align:center;color:var(--txt3);">Không tìm thấy thuật ngữ phù hợp từ khóa "' + escHtml(q) + '".</td></tr>') + "</tbody>" +
    "</table></div>";
}

function renderCurrentHandbookView() {
  const nav2 = document.getElementById("hbNav2");
  const abbrBox = document.getElementById("hbAbbrFilterBox");
  const area = document.getElementById("hbContentArea");
  if (!nav2 || !abbrBox || !area) return;

  if (hbState.tab1 === 6) {
    nav2.innerHTML = "";
    abbrBox.classList.remove("hidden");
    filterAbbreviationTable();
    return;
  }

  abbrBox.classList.add("hidden");
  const mainTab = HANDBOOK_TABS[hbState.tab1] || HANDBOOK_TABS[0];
  const curSub = hbState.subTab[hbState.tab1] || 0;
  nav2.innerHTML = mainTab.subs.map((sub, sIdx) =>
    '<button id="hbSubBtn_' + sIdx + '" class="hb-tab2 ' + (sIdx === curSub ? "active" : "") + '" onclick="switchHbSubTab(' + sIdx + ')">' + escHtml(sub.title) + "</button>"
  ).join("");

  const subObj = mainTab.subs[curSub] || mainTab.subs[0];
  area.innerHTML = subObj.html;
}

// ==================== BOOTSTRAP ON DOM READY ====================
document.addEventListener("DOMContentLoaded", function () {
  populateScenarioSelect();
  onQaSelectorChange();
  loadScenario("S1");
  initTooltipHandlers();
  switchMainView("sim");
});
"""

    out_path = os.path.join(SCRIPT_DIR, "part6_handbook.js")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("// Generated by generate_part6_doip.py\n")
        f.write("const HANDBOOK_TABS = " + tabs_json + ";\n")
        f.write(js_tail.strip() + "\n")
    print(f"Generated {out_path} ({os.path.getsize(out_path)} bytes)")


if __name__ == "__main__":
    main()
