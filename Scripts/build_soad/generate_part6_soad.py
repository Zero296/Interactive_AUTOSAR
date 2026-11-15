"""Generate part6_handbook.js containing 6x4 Multi-level Handbook + Abbreviation Search."""
import json
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

from hb_diagrams_soad import (
    svg_eth_stack,
    svg_socon_fsm,
    svg_pdu_header,
    svg_best_match,
    svg_if_tp_tx,
    svg_npdu_bundling,
    svg_tcp_stream,
    svg_sd_control,
    svg_tcpip_recovery,
    svg_ecuc_tree,
)


def build_handbook_data():
    tabs = [
        {
            "id": "tab0",
            "title": "1. Tổng quan & Kiến trúc",
            "subtabs": [
                {
                    "id": "t0_s0",
                    "title": "Vai trò SoAd & Cầu nối PDU-Socket",
                    "html": f"""
<div class="hb-topic-title">1.1 Vai trò SoAd (ModuleId 56 / 0x0038) trong Automotive Ethernet</div>
<div class="hb-callout ok"><strong>Sứ mệnh cốt lõi:</strong> Phần còn lại của BSW (<code>Com</code>, <code>PduR</code>, <code>Dcm</code>, <code>Sd</code>) chỉ giao tiếp bằng khái niệm <strong>I-PDU (PduId + Byte Array)</strong> hoàn toàn không biết IPv4/IPv6 hay TCP/UDP Port. <strong>SoAd</strong> là lớp chuyển đổi ở giữa, ánh xạ thế giới <em>PduId</em> sang thế giới <em>TcpIp Socket</em>.</div>
<div class="hb-svg-box">{svg_eth_stack()}</div>
<div class="hb-grid-2">
  <div class="hb-card">
    <h4>Module nào gọi vào SoAd?</h4>
    <ul>
      <li><strong>Qua PduR:</strong> <code>Com</code>, <code>LdCom</code> (tín hiệu SOME/IP qua <code>SomeIpXf</code>), <code>Dcm</code>, <code>SecOC</code>.</li>
      <li><strong>Kết nối trực tiếp (không qua PduR):</strong> <code>Sd</code> (SOME/IP Service Discovery), <code>DoIP</code> (Chẩn đoán ISO 13400), <code>UdpNm</code>, <code>Xcp</code>, <code>CDD</code>.</li>
      <li><strong>Tầng dưới gọi lên:</strong> <code>TcpIp</code> báo <code>RxIndication</code>, <code>CopyTxData</code>, <code>TxConfirmation</code>, <code>TcpConnected</code>, <code>TcpAccepted</code>, <code>TcpIpEvent</code>, <code>LocalIpAddrAssignmentChg</code>.</li>
    </ul>
  </div>
  <div class="hb-card">
    <h4>Tại sao không để PduR gọi thẳng TcpIp?</h4>
    <ul>
      <li><strong>Đa kênh trên 1 Socket:</strong> TcpIp chỉ hiểu từng Socket UDP/TCP; SoAd gắn thêm <strong>8-Byte PDU Header</strong> để ghép hàng chục service SOME/IP chung 1 cổng UDP/TCP.</li>
      <li><strong>Cân bằng IF vs TP:</strong> TCP là byte-stream không có ranh giới gói; SoAd cung cấp <code>SoAdRxBuffer</code> để ghép/tách chuẩn PduId.</li>
      <li><strong>Điều khiển động:</strong> Hỗ trợ <code>RoutingGroup</code> và <code>Best-Match</code> Remote IP:Port cho <code>Sd</code> và <code>DoIP</code>.</li>
    </ul>
  </div>
</div>"""
                },
                {
                    "id": "t0_s1",
                    "title": "SoConGroup, SoCon, PduRoute & SocketRoute",
                    "html": f"""
<div class="hb-topic-title">1.2 Tứ trụ Khái niệm Cấu hình ECUC trong SoAd</div>
<div class="hb-svg-box">{svg_ecuc_tree()}</div>
<table class="hb-table">
  <thead><tr><th>Thực thể ECUC</th><th>Chiều</th><th>Vai trò & Mối liên kết</th></tr></thead>
  <tbody>
    <tr><td><code>SoAdSocketConnectionGroup</code></td><td>Chung</td><td>Chứa <code>LocalAddress</code>, <code>LocalPort</code>, <code>Protocol (UDP/TCP)</code>, <code>SoAdPduHeaderEnable</code>, <code>AutoSetup</code>, <code>nPduTriggerTimeout</code>.</td></tr>
    <tr><td><code>SoAdSocketConnection (SoCon)</code></td><td>Chung</td><td>Cá thể kết nối con nằm trong Group; sở hữu <code>RemoteIp:Port</code> riêng (hoặc <code>ANY:ANY</code>), <code>TcpIp SocketId</code> và máy trạng thái <code>OFFLINE/RECONNECT/ONLINE</code>.</td></tr>
    <tr><td><code>SoAdPduRoute</code></td><td>Tx (Phát)</td><td>Ánh xạ <code>TxPduId</code> từ Upper Layer tới 1 hoặc nhiều <code>PduRouteDest</code> (chỉ định đích <code>SoCon</code>, <code>TxPduHeaderId</code>, <code>TriggerMode</code>, <code>RoutingGroup</code>).</td></tr>
    <tr><td><code>SoAdSocketRoute</code></td><td>Rx (Thu)</td><td>Ánh xạ ngược từ <code>SoCon</code> (hoặc Group) + <code>RxPduHeaderId</code> kỳ vọng tới <code>SocketRouteDest</code> (<code>PduR / Sd / DoIP / UdpNm</code>).</td></tr>
  </tbody>
</table>"""
                },
                {
                    "id": "t0_s2",
                    "title": "Máy trạng thái SoAd_SoConModeType",
                    "html": f"""
<div class="hb-topic-title">1.3 Vòng đời SoCon: OFFLINE ⇄ RECONNECT ⇄ ONLINE</div>
<div class="hb-svg-box">{svg_socon_fsm()}</div>
<div class="hb-grid-2">
  <div class="hb-card">
    <h4>3 Trạng thái chuẩn AUTOSAR</h4>
    <ul>
      <li><code>SOAD_SOCON_OFFLINE</code>: Chưa được phép mở (<code>OpenRefCount == 0</code>), chưa chiếm socket TcpIp. Mọi lệnh Tx/Rx đều trả <code>E_NOT_OK</code>.</li>
      <li><code>SOAD_SOCON_RECONNECT</code>: Đã có yêu cầu mở (<code>OpenRefCount > 0</code>), nhưng đang chờ <code>LocalIp == ASSIGNED</code>, hoặc là TCP chờ bắt tay xong, hoặc mới bị sự cố <code>TCP_RESET / ONHOLD</code>.</li>
      <li><code>SOAD_SOCON_ONLINE</code>: Socket đã sẵn sàng truyền/nhận dữ liệu hoàn toàn.</li>
    </ul>
  </div>
  <div class="hb-card">
    <h4>Callback SoConModeChg()</h4>
    <p>Mỗi lần bất kỳ SoCon nào đổi mode, SoAd thông báo cho các Upper Layer đã đăng ký (<code>Sd_SoConModeChg</code>, <code>DoIP_SoConModeChg</code>, <code>EthSM</code>/<code>BswM</code>) để hệ thống biết lúc nào có thể phát Service Offer hoặc bắt đầu chẩn đoán.</p>
  </div>
</div>"""
                },
                {
                    "id": "t0_s3",
                    "title": "AutoSetup vs Manual OpenSoCon & RefCount",
                    "html": """
<div class="hb-topic-title">1.4 Cơ chế Reference Counter của OpenSoCon / CloseSoCon</div>
<div class="hb-grid-2">
  <div class="hb-card">
    <h4>SoAdSocketAutomaticSoConSetup = TRUE</h4>
    <ul>
      <li>Thường dùng cho <strong>SOME/IP-SD Multicast (224.224.224.245:30490)</strong> hoặc <strong>DoIP TCP Listen Server (13400)</strong>.</li>
      <li>Ngay khi <code>LocalIpAddrAssignmentChg(ASSIGNED)</code> xảy ra, SoAd tự đặt <code>OpenRefCount = 1</code> và bind socket mà không cần Sd/BswM gọi <code>OpenSoCon()</code>.</li>
    </ul>
  </div>
  <div class="hb-card">
    <h4>Manual Setup & Abort Flag</h4>
    <ul>
      <li><code>SoAd_OpenSoCon(id)</code> tăng bộ đếm tham chiếu lên 1; nhiều consumer (ví dụ 2 client dùng chung 1 service) có thể gọi <code>OpenSoCon</code> nhiều lần.</li>
      <li><code>SoAd_CloseSoCon(id, FALSE)</code> chỉ giảm bộ đếm đi 1; socket chỉ thực sự đóng khi bộ đếm về <code>0</code>.</li>
      <li><code>SoAd_CloseSoCon(id, TRUE)</code> (<code>abort=TRUE</code>) cưỡng chế đóng socket ngay lập tức và reset <code>OpenRefCount = 0</code>.</li>
    </ul>
  </div>
</div>"""
                }
            ]
        },
        {
            "id": "tab1",
            "title": "2. 8-Byte Header & Best-Match",
            "subtabs": [
                {
                    "id": "t1_s0",
                    "title": "Cấu trúc 8-Byte SoAd PDU Header",
                    "html": f"""
<div class="hb-topic-title">2.1 Giải phẫu Khung 8-Byte SoAd PDU Header (HeaderId + PduLength)</div>
<div class="hb-svg-box">{svg_pdu_header()}</div>
<div class="hb-callout"><strong>Thứ tự Byte Mạng (Big-Endian):</strong> Khi <code>SoAdPduHeaderEnable = TRUE</code>, trước mỗi payload của 1 AUTOSAR I-PDU, SoAd tự động chèn đúng 8 byte: <strong>4 byte HeaderId</strong> + <strong>4 byte PduLength</strong>. Tầng trên (Com/PduR/SomeIpXf) KHÔNG bao giờ nhìn thấy 8 byte này.</div>
<table class="hb-table">
  <thead><tr><th>Offset</th><th>Trường</th><th>Kích thước</th><th>Ý nghĩa kỹ thuật</th></tr></thead>
  <tbody>
    <tr><td><code>0..3</code></td><td><code>HeaderId</code></td><td>32-bit unsigned (BE)</td><td>Định danh duy nhất tuyến <code>PduRouteDest</code> ở đầu Tx và dùng tra bảng <code>SocketRouteRx</code> ở đầu Rx. Với SOME/IP, thường mã hóa từ <code>ServiceId (16b) | MethodId/EventId (16b)</code>.</td></tr>
    <tr><td><code>4..7</code></td><td><code>PduLength</code></td><td>32-bit unsigned (BE)</td><td>Độ dài phần Payload phía sau tính theo byte. Nhờ trường này, SoAd biết chính xác nơi kết thúc PDU #1 để đọc tiếp Header của PDU #2 (trong nPdu UDP hoặc Sticky TCP).</td></tr>
    <tr><td><code>8..8+N-1</code></td><td><code>Payload (SDU)</code></td><td>N Bytes</td><td>Khối dữ liệu I-PDU thuần chuyển giao cho tầng trên.</td></tr>
  </tbody>
</table>"""
                },
                {
                    "id": "t1_s1",
                    "title": "Khi nào bật / tắt SoAdPduHeaderEnable?",
                    "html": """
<div class="hb-topic-title">2.2 Bảng So sánh Chế độ Header ON vs OFF (Raw)</div>
<table class="hb-table">
  <thead><tr><th>Tiêu chí</th><th>SoAdPduHeaderEnable = TRUE</th><th>SoAdPduHeaderEnable = FALSE (Raw)</th></tr></thead>
  <tbody>
    <tr><td>Ứng dụng điển hình</td><td>SOME/IP Events/Methods, ghép nhiều tín hiệu nPdu UDP, ghép/tách TCP Stream đa luồng.</td><td>SOME/IP-SD (port 30490 chuẩn 1-1), DoIP (đã có Header ISO 13400 8B riêng!), UdpNm, XCP.</td></tr>
    <tr><td>Số SocketRoute trên 1 SoCon</td><td><strong>N SocketRoutes</strong> (phân biệt bằng HeaderId).</td><td><strong>Tối đa 1 SocketRoute</strong> (toàn bộ payload đi thẳng vào 1 RxPduId).</td></tr>
    <tr><td>Hỗ trợ nPdu UDP Bundling</td><td><strong>Có</strong> (bắt buộc HeaderEnable=TRUE mới tách được các gói ghép chung).</td><td><strong>Không</strong> (mỗi UDP Datagram chỉ chứa 1 PDU duy nhất).</td></tr>
    <tr><td>Xử lý TCP Sticky Packet</td><td>Tự động tách từng PDU qua <code>PduLength</code> trong vòng lặp.</td><td>Không có ranh giới; đẩy nguyên stream vào TP Upper Layer (như DoIP tự parse header ISO 13400).</td></tr>
  </tbody>
</table>"""
                },
                {
                    "id": "t1_s2",
                    "title": "Thuật toán Best-Match & Message Acceptance Filter",
                    "html": f"""
<div class="hb-topic-title">2.3 Chấm điểm Best-Match Remote IP:Port & Chống Spoofing</div>
<div class="hb-svg-box">{svg_best_match()}</div>
<div class="hb-grid-2">
  <div class="hb-card">
    <h4>Thứ tự 4 Bậc ưu tiên Best-Match</h4>
    <ol>
      <li><strong>Bậc 4 (Exact IP : Exact Port):</strong> Khớp chính xác cả IP nguồn lẫn Port nguồn.</li>
      <li><strong>Bậc 3 (Exact IP : ANY Port):</strong> Đúng IP của ECU đối tác, chấp nhận mọi ephemeral port.</li>
      <li><strong>Bậc 2 (ANY IP : Exact Port):</strong> Khớp cứng port (ví dụ chuẩn port 30490) từ bất kỳ IP nào.</li>
      <li><strong>Bậc 1 (Wildcard ANY : ANY):</strong> Cứu cánh cuối cùng khi không có SoCon cụ thể nào khớp.</li>
    </ol>
  </div>
  <div class="hb-card">
    <h4>Message Acceptance Filter & IdsM</h4>
    <p>Khi <code>SoAdSocketMsgAcceptanceFilterEnabled = TRUE</code>, nếu gói tin đến không khớp bất kỳ SoCon nào đang <code>ONLINE</code> trên SocketGroup đó (và không có Wildcard <code>ANY:ANY</code>):</p>
    <ul>
      <li>Gói tin bị <strong>hủy ngay lập tức</strong>, tăng bộ đếm <code>SOAD_MEAS_DROP_UDP/TCP</code>.</li>
      <li>Nếu <code>SoAdEnableSecurityEventReporting = TRUE</code>, báo ngay tới <code>IdsM</code> để phát hiện giả mạo (IP Spoofing).</li>
    </ul>
  </div>
</div>"""
                },
                {
                    "id": "t1_s3",
                    "title": "Wildcard ANY:ANY, SetRemoteAddr & SetUniqueRemoteAddr",
                    "html": """
<div class="hb-topic-title">2.4 Quản lý Địa chỉ Remote Động tại Runtime</div>
<div class="hb-grid-2">
  <div class="hb-card">
    <h4>SoAd_SetRemoteAddr() & ReleaseRemoteAddr()</h4>
    <ul>
      <li>Dùng khi ban đầu SoCon cấu hình địa chỉ chưa biết hoặc tạm thời. Sau khi <code>Sd</code> nhận bản tin <em>OfferService</em> từ ECU cung cấp dịch vụ, <code>Sd</code> gọi <code>SoAd_SetRemoteAddr(SoConId, ProviderIpPort)</code>.</li>
      <li>Khi dịch vụ ngừng hoặc TTL hết hạn, gọi <code>SoAd_ReleaseRemoteAddr(SoConId)</code> trả về lại trạng thái chưa gán/Wildcard.</li>
    </ul>
  </div>
  <div class="hb-card">
    <h4>SoAd_SetUniqueRemoteAddr() — Phục vụ Đa Client/Tester</h4>
    <ul>
      <li>Trong <code>SoConGroup</code> có sẵn pool gồm N SoCon cấu hình <code>ANY:ANY</code> (ví dụ nhóm UDP Server hoặc DoIP nhiều Tester).</li>
      <li>Khi Client mới gửi request tới, tầng trên gọi <code>SoAd_SetUniqueRemoteAddr(SoConId, PeerAddr, &AssignedSoConId)</code>: nếu đã có SoCon gắn <code>PeerAddr</code> thì trả về SoCon đó; nếu chưa thì khóa 1 SoCon <code>ANY:ANY</code> rảnh thành riêng cho peer này!</li>
    </ul>
  </div>
</div>"""
                }
            ]
        },
        {
            "id": "tab2",
            "title": "3. Tx Mux, TP & nPdu",
            "subtabs": [
                {
                    "id": "t2_s0",
                    "title": "IF Transmit vs TP Transmit & CopyTxData",
                    "html": f"""
<div class="hb-topic-title">3.1 Cơ chế Truyền IF (Đồng bộ) và TP (Streaming qua CopyTxData)</div>
<div class="hb-svg-box">{svg_if_tp_tx()}</div>
<div class="hb-grid-2">
  <div class="hb-card">
    <h4>Khi nào dùng SoAd_IfTransmit()?</h4>
    <ul>
      <li>Các gói tin ngắn vừa trong 1 UDP Datagram hoặc thông điệp ngắn TCP (tín hiệu Com, SOME/IP Event nhỏ, SOME/IP-SD, UdpNm).</li>
      <li><code>PduInfoPtr-&gt;SduDataPtr</code> chứa sẵn toàn bộ byte tại thời điểm gọi hàm.</li>
    </ul>
  </div>
  <div class="hb-card">
    <h4>Khi nào dùng SoAd_TpTransmit()?</h4>
    <ul>
      <li>Dữ liệu chẩn đoán lớn (DoIP UDS Flash Reprogramming, Security Certificate, ảnh Camera/RPC lớn vượt MTU 1500B).</li>
      <li>SoAd không copy toàn bộ buffer vào RAM nội bộ; thay vào đó TcpIp gọi <code>SoAd_CopyTxData()</code> để rút trực tiếp từng chunk từ bộ đệm của Dcm/PduR.</li>
    </ul>
  </div>
</div>"""
                },
                {
                    "id": "t2_s1",
                    "title": "Cơ chế nPdu UDP Tx Bundling",
                    "html": f"""
<div class="hb-topic-title">3.2 Tối ưu Băng thông Ethernet bằng nPdu UDP Tx Buffer</div>
<div class="hb-svg-box">{svg_npdu_bundling()}</div>
<div class="hb-callout warn"><strong>3 Điều kiện Bắt buộc để Gom nPdu:</strong> (1) Socket là <strong>UDP</strong>, (2) <code>SoAdPduHeaderEnable = TRUE</code>, (3) Tuyến Tx có <code>SoAdTxUdpTriggerMode = SOAD_TRIGGER_NEVER</code>.</div>
<div class="hb-card">
  <h4>3 Sự kiện Xả (Flush) hàng đợi nPdu xuống TcpIp_UdpTransmit()</h4>
  <ol>
    <li><strong>Trigger Always:</strong> Có một PDU khác cùng trỏ về <code>SoCon</code> đó mang cấu hình <code>SOAD_TRIGGER_ALWAYS</code> -> Xả toàn bộ hàng đợi + PDU mới chung 1 gói UDP.</li>
    <li><strong>Trigger Timeout Hết hạn:</strong> Trong <code>SoAd_MainFunction()</code>, bộ đếm <code>SoAdSocketUdpTriggerTimeout</code> giảm về 0 -> Xả ngay để đảm bảo độ trễ thời gian thực.</li>
    <li><strong>Tràn Kích thước Tối đa (nPduBufferMax / MTU):</strong> Thêm PDU mới sẽ vượt giới hạn Datagram UDP -> Xả lô cũ trước rồi mới nạp gói mới (hoặc gửi riêng).</li>
  </ol>
</div>"""
                },
                {
                    "id": "t2_s2",
                    "title": "ImmediateTpTxConfirmation vs Chờ TCP ACK",
                    "html": """
<div class="hb-topic-title">3.3 Kiểm soát Thời điểm Báo Hoàn tất TP trên TCP</div>
<div class="hb-grid-2">
  <div class="hb-card">
    <h4>ImmediateTpTxConfirmation = FALSE (Chuẩn an toàn)</h4>
    <ul>
      <li>Sau khi <code>SoAd_CopyTxData()</code> giao byte cuối cùng cho TcpIp, SoAd <strong>chưa báo</strong> <code>PduR_SoAdTpTxConfirmation()</code> ngay.</li>
      <li>Chỉ khi nhận được TCP ACK từ đầu xa, TcpIp gọi <code>SoAd_TxConfirmation()</code> -> SoAd mới báo hoàn tất cho Dcm/PduR giải phóng buffer.</li>
    </ul>
  </div>
  <div class="hb-card">
    <h4>ImmediateTpTxConfirmation = TRUE (Hiệu năng cao)</h4>
    <ul>
      <li>Ngay sau lần <code>SoAd_CopyTxData()</code> copy trọn vẹn byte cuối cùng vào TCP Send Buffer, SoAd lập tức gọi <code>TpTxConfirmation(E_OK)</code>.</li>
      <li>Giúp Dcm/DoIP xoay vòng buffer nhanh hơn nhưng ứng dụng không chắc chắn đầu xa đã ACK lớp TCP.</li>
    </ul>
  </div>
</div>"""
                },
                {
                    "id": "t2_s3",
                    "title": "Fan-out đa PduRouteDest & VLAN 802.1Q PCP",
                    "html": """
<div class="hb-topic-title">3.4 Phát 1-Ra-Nhiều (Fan-out) & Phân luồng Ưu tiên VLAN QoS</div>
<div class="hb-grid-2">
  <div class="hb-card">
    <h4>PduRoute với Nhiều PduRouteDest (Fan-out)</h4>
    <p>Một <code>SoAd_IfTransmit(TxPduId)</code> duy nhất từ Com/LdCom có thể trỏ tới danh sách nhiều <code>PduRouteDest</code> (ví dụ phát bản tin sự kiện tới đồng thời 3 ECU Client Unicast khác nhau khi không dùng Multicast). Mỗi <code>PduRouteDest</code> tự kiểm tra <code>RoutingGroup</code> của riêng mình.</p>
  </div>
  <div class="hb-card">
    <h4>VLAN Priority Code Point (PCP 0..7)</h4>
    <p>Thuộc tính <code>SoAdSocketFramePriority</code> ánh xạ xuống <code>TcpIp_ChangeParameter(TCPIP_PARAMID_FRAMEPRIO)</code> cho phép gắn thẻ ưu tiên IEEE 802.1Q PCP (0 = Best Effort, 5-6 = ADAS/Control, 7 = Network Critical) giúp Switch Ethernet trong xe ưu tiên hàng đợi phần cứng.</p>
  </div>
</div>"""
                }
            ]
        },
        {
            "id": "tab3",
            "title": "4. Rx Demux & TCP Stream",
            "subtabs": [
                {
                    "id": "t3_s0",
                    "title": "UDP Multi-PDU Demux & StrictHeaderLenCheck",
                    "html": """
<div class="hb-topic-title">4.1 Giải mã Gói nPdu Đa Luồng & Kiểm tra Độ dài Nghiêm ngặt</div>
<div class="hb-grid-2">
  <div class="hb-card">
    <h4>Vòng lặp Tách Nhiều PDU trong 1 UDP Datagram</h4>
    <p>Khi <code>SoAdPduHeaderEnable = TRUE</code> trên UDP, SoAd đặt con trỏ <code>offset = 0</code> và lặp tới hết chiều dài datagram <code>Length</code>:</p>
    <ol>
      <li>Đọc <code>HeaderId (4B)</code> + <code>PduLength (4B)</code> tại vị trí <code>offset</code>.</li>
      <li>Tìm <code>SocketRoute</code> khớp <code>HeaderId</code>.</li>
      <li>Cắt đúng <code>PduLength</code> byte từ <code>offset + 8</code> đẩy lên Upper Layer tương ứng.</li>
      <li>Tăng <code>offset += 8 + PduLength</code> và tiếp tục phân tách PDU kế tiếp!</li>
    </ol>
  </div>
  <div class="hb-card">
    <h4>SoAdSocketUdpStrictHeaderLenCheck</h4>
    <ul>
      <li>Nếu gói UDP bị nhiễu/hỏng hoặc tấn công khai báo <code>PduLength</code> lớn hơn số byte thực sự còn lại trong gói UDP:</li>
      <li>Khi bật Strict Check = <code>TRUE</code>, SoAd phát hiện bất thường và từ chối/drop gói tin tăng <code>SOAD_MEAS_DROP_UDP</code> thay vì đọc tràn bộ nhớ hoặc phân phối dữ liệu cụt.</li>
    </ul>
  </div>
</div>"""
                },
                {
                    "id": "t3_s1",
                    "title": "TCP Fragmented & Sticky Stream Reassembly",
                    "html": f"""
<div class="hb-topic-title">4.2 Lắp ghép Mảnh Cắt & Tách Gói Dính (Sticky TCP) bằng SoAdRxBuffer</div>
<div class="hb-svg-box">{svg_tcp_stream()}</div>
<div class="hb-callout"><strong>Bản chất Byte-Stream của TCP:</strong> Không giống UDP bảo toàn từng datagram, tầng TCP trên dây mạng có thể gộp 2 PDU vào 1 TCP segment (<strong>Sticky Packets</strong>) hoặc xé 1 PDU (thậm chí xé đôi cả 8B Header!) qua 2-3 lần callback <code>SoAd_RxIndication()</code> liên tiếp (<strong>Fragmented Stream</strong>).</div>"""
                },
                {
                    "id": "t3_s2",
                    "title": "Tràn SoAdRxBuffer & Lỗi Unknown HeaderId",
                    "html": """
<div class="hb-topic-title">4.3 Xử lý Ngoại lệ Luồng Rx trên Ethernet ECU</div>
<div class="hb-grid-2">
  <div class="hb-card">
    <h4>Unknown HeaderId -> SOAD_E_INV_PDUHEADER_ID (0x05)</h4>
    <ul>
      <li>Khi giải mã được 8B Header hợp lệ nhưng <code>HeaderId</code> không nằm trong bất kỳ <code>SocketRoute</code> nào gắn với SoCon đó:</li>
      <li>SoAd gọi <code>Det_ReportRuntimeError(56, 0, 0x12, SOAD_E_INV_PDUHEADER_ID)</code>, tăng bộ đếm <code>DROP_UDP/TCP</code>, và nếu TCP cần nhảy cóc đúng <code>PduLength</code> byte (hoặc hủy PDU đó) để không làm lệch đồng bộ khung của các PDU hợp lệ phía sau!</li>
    </ul>
  </div>
  <div class="hb-card">
    <h4>Tràn SoAdRxBuffer -> SOAD_E_NOBUFS (0x04)</h4>
    <ul>
      <li>Mỗi kết nối TCP dùng 8B Header cần khai báo <code>SoAdRxBuffer</code> đủ lớn chứa ít nhất 1 PDU lớn nhất (hoặc dùng TP streaming trực tiếp).</li>
      <li>Nếu mảnh ghép vượt quá kích thước khả dụng trong <code>SoAdRxBuffer</code>, SoAd hủy khung dở dang, báo Runtime Error <code>SOAD_E_NOBUFS</code> và tăng drop counter.</li>
    </ul>
  </div>
</div>"""
                },
                {
                    "id": "t3_s3",
                    "title": "Định tuyến tới Đa Module Tầng Trên",
                    "html": """
<div class="hb-topic-title">4.4 Bảng Callback Upper Layers được SoAd hỗ trợ</div>
<table class="hb-table">
  <thead><tr><th>Module Đích</th><th>IF Rx API</th><th>TP Rx APIs</th><th>Ứng dụng điển hình</th></tr></thead>
  <tbody>
    <tr><td><code>PduR</code></td><td><code>PduR_SoAdIfRxIndication</code></td><td><code>StartOfReception / CopyRxData / TpRxIndication</code></td><td>Com signals, SOME/IP via LdCom, Dcm</td></tr>
    <tr><td><code>Sd</code></td><td><code>Sd_SoAdIfRxIndication</code></td><td>Không dùng TP</td><td>SOME/IP Service Discovery Offer/Subscribe</td></tr>
    <tr><td><code>DoIP</code></td><td><code>DoIP_SoAdIfRxIndication</code></td><td><code>DoIP_SoAdTpStartOfReception / CopyRxData</code></td><td>Vehicle Announcement (UDP) & UDS (TCP 13400)</td></tr>
    <tr><td><code>UdpNm</code></td><td><code>UdpNm_SoAdIfRxIndication</code></td><td>Không dùng TP</td><td>Ethernet Network Management Wakeup/Sleep</td></tr>
    <tr><td><code>Xcp / Cdd</code></td><td><code>&lt;Ul&gt;_SoAdIfRxIndication</code></td><td>Tùy cấu hình CDD</td><td>Đo đạc hiệu chỉnh (Calibration) & Custom Drivers</td></tr>
  </tbody>
</table>"""
                }
            ]
        },
        {
            "id": "tab4",
            "title": "5. SD, Recovery & DET",
            "subtabs": [
                {
                    "id": "t4_s0",
                    "title": "RoutingGroup Control & IfRoutingGroupTransmit",
                    "html": f"""
<div class="hb-topic-title">5.1 Điều khiển Luồng Thông minh bằng SoAdRoutingGroup</div>
<div class="hb-svg-box">{svg_sd_control()}</div>
<div class="hb-grid-2">
  <div class="hb-card">
    <h4>SoAd_EnableRouting / DisableRouting (0x0F / 0x10)</h4>
    <p>Trong SOME/IP, hai ECU có thể đã mở sẵn kết nối socket chung, nhưng ECU Server <strong>không được phép gửi Event</strong> cho Client nào chưa gửi gói <em>SubscribeEventgroup</em>. Sd sử dụng <code>RoutingGroup</code> như một van đóng/mở luồng dữ liệu tức thì mà không phải đóng mở lại TCP/UDP socket.</p>
  </div>
  <div class="hb-card">
    <h4>SoAd_IfRoutingGroupTransmit (0x04)</h4>
    <p>Khi một Client mới vừa Subscribe một <strong>SOME/IP Field</strong> (chứa giá trị trạng thái hiện tại, ví dụ vị trí cửa/nhiệt độ), Sd gọi <code>SoAd_IfRoutingGroupTransmit(rgId)</code> để kích SoAd gọi <code>PduR_SoAdIfTriggerTransmit()</code> bắn ngay bản tin Initial Event mà không đợi chu kỳ phát kế tiếp.</p>
  </div>
</div>"""
                },
                {
                    "id": "t4_s1",
                    "title": "TcpIpEvent (TCP_RESET/FIN) & LocalIpAddrAssignmentChg",
                    "html": f"""
<div class="hb-topic-title">5.2 Xử lý Ngắt Kết nối Đột ngột & Mất Địa chỉ IP</div>
<div class="hb-svg-box">{svg_tcpip_recovery()}</div>
<table class="hb-table">
  <thead><tr><th>Sự kiện từ TcpIp</th><th>Hành động nội bộ của SoAd</th><th>Trạng thái sau xử lý</th></tr></thead>
  <tbody>
    <tr><td><code>TCPIP_TCP_RESET</code> / <code>TCPIP_TCP_CLOSED</code></td><td>Hủy phiên TP Tx/Rx đang chạy (báo <code>E_NOT_OK</code>), xóa <code>SoAdRxBuffer</code> & hàng đợi <code>nPdu</code>, đóng TcpIp socket cũ.</td><td><code>RECONNECT</code> nếu <code>OpenRef &gt; 0</code> (để tự kết nối lại); <code>OFFLINE</code> nếu <code>OpenRef == 0</code>.</td></tr>
    <tr><td><code>TCPIP_TCP_FIN_RECEIVED</code></td><td>Peer đóng kết nối TCP lịch sự từ phía xa; dọn dẹp luồng TP dở dang và giải phóng socket.</td><td><code>RECONNECT</code> hoặc <code>OFFLINE</code> + báo <code>SoConModeChg</code>.</td></tr>
    <tr><td><code>TCPIP_IPADDR_STATE_UNASSIGNED</code> / <code>ONHOLD</code></td><td>Chuyển mọi SoCon sử dụng LocalAddr đó ra khỏi <code>ONLINE</code> (đóng socket nếu UNASSIGNED) và chuyển tiếp sự kiện cho Sd/EthSM.</td><td><code>RECONNECT</code>/<code>OFFLINE</code>; tự động bind/connect lại khi nhận <code>ASSIGNED</code>.</td></tr>
  </tbody>
</table>"""
                },
                {
                    "id": "t4_s2",
                    "title": "Runtime Socket Tuning & Cancel TP",
                    "html": """
<div class="hb-topic-title">5.3 Các API Điều chỉnh & Hủy Phiên khi Đang Chạy</div>
<div class="hb-grid-2">
  <div class="hb-card">
    <h4>SoAd_ChangeParameter(SoConId, ParamId, Value)</h4>
    <ul>
      <li>Cho phép Upper Layer (hoặc DoIP/CDD) thay đổi thông số socket tầng TcpIp tại runtime: tắt/bật Nagle (<code>TCP_NAGLE</code>), bật KeepAlive (<code>TCP_KEEPALIVE</code>), hoặc đổi <code>FRAMEPRIO</code> (VLAN PCP).</li>
    </ul>
  </div>
  <div class="hb-card">
    <h4>SoAd_TpCancelTransmit / TpCancelReceive</h4>
    <ul>
      <li>Cho phép Dcm/PduR hủy giữa chừng một phiên TP dài nếu chẩn đoán bị timeout hoặc bị preempt bởi yêu cầu khẩn cấp hơn. SoAd dừng <code>CopyTxData</code> và đóng/làm sạch TCP stream liên quan.</li>
    </ul>
  </div>
</div>"""
                },
                {
                    "id": "t4_s3",
                    "title": "Bảng mã DET Errors, IdsM & Measurement Data",
                    "html": """
<div class="hb-topic-title">5.4 Danh mục Lỗi DET, Runtime Error (ModuleId 56) & Security Events</div>
<table class="hb-table">
  <thead><tr><th>Mã lỗi SWS_SoAd</th><th>Hex</th><th>Phân loại</th><th>Nguyên nhân & Khi nào kích hoạt</th></tr></thead>
  <tbody>
    <tr><td><code>SOAD_E_NOTINIT</code></td><td>0x01</td><td>Dev Error</td><td>Gọi bất kỳ API SoAd nào (trừ GetVersionInfo) trước <code>SoAd_Init()</code>.</td></tr>
    <tr><td><code>SOAD_E_PARAM_POINTER</code></td><td>0x02</td><td>Dev Error</td><td>Truyền con trỏ <code>NULL_PTR</code> vào PduInfo, VersionInfo hoặc RemoteAddrPtr.</td></tr>
    <tr><td><code>SOAD_E_INV_ARG</code></td><td>0x03</td><td>Dev Error</td><td>Tham số sai: SoConId &gt;= SoAdSoConMax, RoutingGroup không hỗ trợ Triggerable, sai TcpIpEvent.</td></tr>
    <tr><td><code>SOAD_E_NOBUFS</code></td><td>0x04</td><td>Runtime</td><td>Cạn bộ đệm nPdu / tràn <code>SoAdRxBuffer</code> / TcpIp từ chối cấp phát Tx buffer.</td></tr>
    <tr><td><code>SOAD_E_INV_PDUHEADER_ID</code></td><td>0x05</td><td>Runtime</td><td>Nhận gói mang HeaderId không tồn tại trong bảng SocketRouteRx -> Kích IdsM Security Event.</td></tr>
    <tr><td><code>SOAD_E_INV_PDUID</code></td><td>0x06</td><td>Dev Error</td><td>TxPduId vượt ngoài bảng cấu hình PduRoute.</td></tr>
    <tr><td><code>SOAD_E_INV_SOCKETID</code></td><td>0x07</td><td>Dev Error</td><td>TcpIp SocketId hoặc RemoteAddr bị từ chối bởi Best-Match Filter.</td></tr>
    <tr><td><code>SOAD_E_INIT_FAILED</code></td><td>0x08</td><td>Dev Error</td><td>Lỗi con trỏ ConfigPtr lúc gọi <code>SoAd_Init()</code>.</td></tr>
    <tr><td><code>SOAD_E_INV_METADATA</code></td><td>0x09</td><td>Runtime</td><td>Metadata đính kèm PDU sai định dạng hoặc không hợp lệ.</td></tr>
  </tbody>
</table>"""
                }
            ]
        },
        {
            "id": "tab5",
            "title": "6. Tham chiếu API & Best Practices",
            "subtabs": [
                {
                    "id": "t5_s0",
                    "title": "Bảng API Chuẩn AUTOSAR SoAd (R22-11 / R23-11)",
                    "html": """
<div class="hb-topic-title">6.1 Danh mục Service ID & API Quan trọng Nhất của SoAd</div>
<table class="hb-table">
  <thead><tr><th>Tên Hàm API Chuẩn</th><th>SID</th><th>Ai gọi?</th><th>Chức năng chính</th></tr></thead>
  <tbody>
    <tr><td><code>SoAd_Init(ConfigPtr)</code></td><td>0x01</td><td>EcuM / BswM</td><td>Khởi tạo toàn bộ SoCon (AutoSetup hoặc OFFLINE) và RoutingGroup.</td></tr>
    <tr><td><code>SoAd_GetVersionInfo(versioninfo)</code></td><td>0x02</td><td>Diag / BSW</td><td>Trả về VendorId, ModuleId (56) và SW Version.</td></tr>
    <tr><td><code>SoAd_IfTransmit(TxPduId, PduInfoPtr)</code></td><td>0x03</td><td>PduR / Sd / UdpNm</td><td>Truyền 1 PDU qua IF (đóng 8B Header, nPdu Buffer hoặc gửi ngay).</td></tr>
    <tr><td><code>SoAd_IfRoutingGroupTransmit(id)</code></td><td>0x04</td><td>Sd / BswM</td><td>Đặt cờ yêu cầu gửi lại tất cả IF PDU thuộc RoutingGroup có Triggerable=TRUE.</td></tr>
    <tr><td><code>SoAd_TpTransmit(TxPduId, PduInfoPtr)</code></td><td>0x05</td><td>PduR / DoIP</td><td>Bắt đầu truyền luồng dữ liệu lớn TP (chỉ báo độ dài, copy sau qua CopyTxData).</td></tr>
    <tr><td><code>SoAd_OpenSoCon / CloseSoCon</code></td><td>0x09/0x0A</td><td>Sd / DoIP / BswM</td><td>Tăng/giảm OpenRefCounter để thiết lập hoặc đóng TcpIp socket.</td></tr>
    <tr><td><code>SoAd_EnableRouting / DisableRouting</code></td><td>0x0F/0x10</td><td>Sd / BswM</td><td>Mở/Khóa van truyền nhận dữ liệu của RoutingGroup động.</td></tr>
    <tr><td><code>SoAd_SetRemoteAddr / SetUniqueRemoteAddr</code></td><td>0x11/0x1E</td><td>Sd / DoIP / CDD</td><td>Gán Remote IP:Port động hoặc khóa 1 SoCon riêng từ pool Wildcard.</td></tr>
    <tr><td><code>SoAd_RxIndication / CopyTxData / TxConfirmation</code></td><td>0x12/13/15</td><td>TcpIp</td><td>Data-plane callbacks nhận gói, rút chunk TP Tx và xác nhận gửi xong.</td></tr>
    <tr><td><code>SoAd_TcpConnected / TcpAccepted / TcpIpEvent</code></td><td>0x16/14/17</td><td>TcpIp</td><td>Control-plane callbacks hoàn tất TCP handshake hoặc báo lỗi RST/FIN.</td></tr>
    <tr><td><code>SoAd_LocalIpAddrAssignmentChg</code></td><td>0x18</td><td>TcpIp</td><td>Thông báo trạng thái IP cục bộ ASSIGNED / ONHOLD / UNASSIGNED.</td></tr>
    <tr><td><code>SoAd_MainFunction()</code></td><td>0x19</td><td>SchM / OsTask</td><td>Hàm chu kỳ xả nPdu timeout, polling TCP RECONNECT & TriggerTransmit.</td></tr>
    <tr><td><code>SoAd_GetAndResetMeasurementData()</code></td><td>0x45</td><td>Diag / SecOC</td><td>Đọc và xóa bộ đếm rớt gói <code>SOAD_MEAS_DROP_TCP/UDP</code>.</td></tr>
  </tbody>
</table>"""
                },
                {
                    "id": "t5_s1",
                    "title": "Callbacks ngược từ SoAd lên Tầng Trên",
                    "html": """
<div class="hb-topic-title">6.2 Luồng Callback Upstream khi Nhận Gói hoặc Đổi Trạng Thái</div>
<div class="hb-card">
  <ul>
    <li><code>&lt;Up&gt;_SoAdIfRxIndication(RxPduId, PduInfoPtr)</code>: Chuyển gói IF vừa tách được (đã bỏ 8B Header) lên <code>PduR</code>, <code>Sd</code>, <code>UdpNm</code>, <code>DoIP</code>, <code>Xcp</code>, <code>Cdd</code>.</li>
    <li><code>&lt;Up&gt;_SoAdIfTxConfirmation(TxPduId, result)</code>: Báo truyền IF thành công/thất bại sau khi có <code>SoAd_TxConfirmation()</code>.</li>
    <li><code>&lt;Up&gt;_SoAdTpStartOfReception / CopyRxData / TpRxIndication</code>: Chuyển tiếp luồng dữ liệu TCP lớn từ <code>SoAdRxBuffer</code> lên <code>PduR</code> hoặc <code>DoIP</code>.</li>
    <li><code>&lt;Up&gt;_SoAdTpCopyTxData / TpTxConfirmation</code>: Kéo từng mảnh dữ liệu phát từ Dcm/DoIP và xác nhận kết thúc phiên TP.</li>
    <li><code>&lt;Up&gt;_SoConModeChg(SoConId, Mode)</code> & <code>&lt;Up&gt;_LocalIpAddrAssignmentChg(IpAddrId, State)</code>: Đồng bộ trạng thái mạng với <code>Sd</code>, <code>DoIP</code>, <code>EthSM</code>, <code>BswM</code>.</li>
  </ul>
</div>"""
                },
                {
                    "id": "t5_s2",
                    "title": "Mẫu Cấu hình C (SoAd_Cfg.h & SoAd_Lcfg.c)",
                    "html": """
<div class="hb-topic-title">6.3 Ví dụ Cấu hình Thực tế cho ECU Camera ADAS + DoIP</div>
<pre class="hb-pre">/* Cấu hình tiêu biểu phân tách 3 SocketGroup độc lập: */
// 1. SoConGrp_SomeIpUdp: Port 30490 | UDP | PduHeaderEnable=TRUE | AutoSetup=FALSE (SD điều khiển)
//    -> PduRoute_3A (0x010100A1, TRIGGER_NEVER) + PduRoute_3B (0x010100B2, TRIGGER_ALWAYS, TriggerTimeout=20ms)
// 2. SoConGrp_SdMulticast: Port 30490 | UDP | PduHeaderEnable=FALSE | AutoSetup=TRUE | Remote=224.224.224.245
// 3. SoConGrp_DoIpTcpSrv: Port 13400 | TCP | PduHeaderEnable=FALSE | TcpInitiate=FALSE (Listen) | Remote=ANY:ANY</pre>"""
                },
                {
                    "id": "t5_s3",
                    "title": "Checklist Debug Ethernet thực tế (Wireshark vs SoAd)",
                    "html": """
<div class="hb-topic-title">6.4 Kinh nghiệm Gỡ lỗi Thực chiến trên Xe & HIL</div>
<div class="hb-grid-2">
  <div class="hb-card">
    <h4>Có gói trên Wireshark nhưng Upper Layer không nhận được Rx?</h4>
    <ol>
      <li>Kiểm tra <strong>Best-Match & MessageAcceptanceFilter</strong>: Remote IP:Port nguồn trên Wireshark có khớp bảng SoCon không?</li>
      <li>Kiểm tra trạng thái <code>SoConMode == ONLINE</code> và <code>RoutingGroup == ENABLED</code>?</li>
      <li>Kiểm tra 8 byte đầu tiên (<strong>HeaderId Big-Endian</strong>) có trùng <code>SoAdRxPduHeaderId</code> cấu hình trên ECU không?</li>
      <li>Gọi <code>SoAd_GetAndResetMeasurementData()</code> xem <code>DROP_UDP/TCP</code> có tăng vọt không!</li>
    </ol>
  </div>
  <div class="hb-card">
    <h4>Gọi IfTransmit trả E_OK nhưng không thấy frame ra Wireshark?</h4>
    <ol>
      <li>Kiểm tra <code>RoutingGroup</code>: nếu RG đang Disabled, SoAd lặng lẽ chặn mà vẫn có thể trả <code>E_OK</code> tùy cấu hình/bỏ qua đích!</li>
      <li>Kiểm tra chế độ <code>nPdu TRIGGER_NEVER</code>: gói đang nằm chờ trong <code>nPdu Buffer</code> đợi <code>SoAdSocketUdpTriggerTimeout</code>!</li>
      <li>Kiểm tra <code>LocalIpAddrState</code>: IP có đang bị <code>ONHOLD/UNASSIGNED</code>?</li>
    </ol>
  </div>
</div>"""
                }
            ]
        }
    ]

    # Tab 7 (index 6): Abbreviations special view marker
    abbr_tab = {
        "id": "tab6",
        "title": "7. Thuật ngữ & Abbreviations (Tìm kiếm)",
        "isAbbrTab": True,
        "subtabs": [
            {
                "id": "t6_s0",
                "title": "Bảng tra cứu 64 thuật ngữ chuẩn SWS_SoAd",
                "html": ""
            }
        ]
    }
    tabs.append(abbr_tab)
    return tabs


def main():
    tabs = build_handbook_data()
    out_path = os.path.join(SCRIPT_DIR, "part6_handbook.js")

    js_lines = [
        "// ============================================================================",
        "// PART 6: MULTI-LEVEL HANDBOOK (6x4 TOPICS + TAB 7 ABBREVIATION SEARCH)",
        "// AUTO-GENERATED BY generate_part6_soad.py",
        "// ============================================================================",
        "",
        f"const HANDBOOK_TABS = {json.dumps(tabs, ensure_ascii=False, indent=2)};",
        "",
        """const hbState = {
  activeTab1: 0,
  activeSubTab: 0,
  abbrSearch: "",
  abbrCategory: "ALL"
};

function switchHbTab1(idx) {
  hbState.activeTab1 = idx;
  hbState.activeSubTab = 0;
  renderCurrentHandbookView();
}

function switchHbSubTab(subIdx) {
  hbState.activeSubTab = subIdx;
  renderCurrentHandbookView();
}

function setAbbrCategory(cat) {
  hbState.abbrCategory = cat;
  renderAbbreviationTable();
}

function onAbbrSearchInput(val) {
  hbState.abbrSearch = val || "";
  renderAbbreviationTable();
}

function highlightMatch(text, query) {
  const safe = String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  if (!query || !query.trim()) return safe;
  const escapedQ = query.trim().replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&");
  const re = new RegExp(`(${escapedQ})`, "gi");
  return safe.replace(re, `<mark class="hl">$1</mark>`);
}

function renderAbbreviationTable() {
  const host = document.getElementById("abbrTableHost");
  if (!host) return;
  const q = hbState.abbrSearch.trim().toLowerCase();
  const cat = hbState.abbrCategory;

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

  const pillsEl = document.getElementById("abbrPillsRow");
  if (pillsEl) {
    const cats = [
      { id: "ALL", lbl: `Tất cả (${ABBREVIATIONS.length})` },
      { id: "CORE", lbl: "CORE · SoCon & Route" },
      { id: "HDR", lbl: "HDR · 8B Header" },
      { id: "NPDU", lbl: "NPDU · Buffer & TP" },
      { id: "ETH", lbl: "ETH · Stack & QoS" },
      { id: "API", lbl: "API · AUTOSAR Calls" }
    ];
    pillsEl.innerHTML = cats.map(c =>
      `<button class="abbr-pill ${hbState.abbrCategory === c.id ? "active" : ""}" onclick="setAbbrCategory('${c.id}')">${c.lbl}</button>`
    ).join("");
  }

  const countEl = document.getElementById("abbrCountLabel");
  if (countEl) {
    countEl.textContent = `Hiển thị ${filtered.length} / ${ABBREVIATIONS.length} thuật ngữ`;
  }

  if (filtered.length === 0) {
    host.innerHTML = `<div class="hb-callout warn">Không tìm thấy thuật ngữ nào khớp với từ khóa "${hbState.abbrSearch}".</div>`;
    return;
  }

  host.innerHTML = `
    <table class="hb-table">
      <thead>
        <tr>
          <th style="width:170px">Viết tắt / Ký hiệu</th>
          <th style="width:260px">Tên đầy đủ (English / AUTOSAR)</th>
          <th style="width:95px">Nhóm</th>
          <th>Giải thích chức năng trong SoAd</th>
        </tr>
      </thead>
      <tbody>
        ${filtered.map(r => `
          <tr>
            <td class="mono" style="font-weight:800;color:var(--accent)">${highlightMatch(r.abbr, hbState.abbrSearch)}</td>
            <td style="font-weight:600">${highlightMatch(r.full, hbState.abbrSearch)}</td>
            <td><span class="pill-badge info">${r.cat}</span></td>
            <td>${highlightMatch(r.desc, hbState.abbrSearch)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function renderCurrentHandbookView() {
  const l1El = document.getElementById("hbTabsL1");
  const l2El = document.getElementById("hbTabsL2");
  const bodyEl = document.getElementById("hbContent");
  const abbrPane = document.getElementById("hbAbbrPane");
  if (!l1El || !l2El || !bodyEl || !abbrPane) return;

  l1El.innerHTML = HANDBOOK_TABS.map((t, idx) =>
    `<button class="hb-tab-l1 ${idx === hbState.activeTab1 ? "active" : ""}" onclick="switchHbTab1(${idx})">${t.title}</button>`
  ).join("");

  const curTab = HANDBOOK_TABS[hbState.activeTab1] || HANDBOOK_TABS[0];
  l2El.innerHTML = curTab.subtabs.map((s, sIdx) =>
    `<button class="hb-tab-l2 ${sIdx === hbState.activeSubTab ? "active" : ""}" onclick="switchHbSubTab(${sIdx})">${s.title}</button>`
  ).join("");

  if (curTab.isAbbrTab) {
    bodyEl.style.display = "none";
    abbrPane.style.display = "flex";
    const inp = document.getElementById("abbrSearchInput");
    if (inp && inp.value !== hbState.abbrSearch) inp.value = hbState.abbrSearch;
    renderAbbreviationTable();
  } else {
    abbrPane.style.display = "none";
    bodyEl.style.display = "flex";
    const sub = curTab.subtabs[hbState.activeSubTab] || curTab.subtabs[0];
    bodyEl.innerHTML = sub.html;
  }
}

function initHandbook() {
  renderCurrentHandbookView();
}

document.addEventListener("DOMContentLoaded", () => {
  initSimulator();
  initHandbook();
});
"""
    ]

    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(js_lines))
    print(f"Generated {out_path} successfully.")


if __name__ == "__main__":
    main()
