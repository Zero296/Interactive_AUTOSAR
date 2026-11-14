import json
from pathlib import Path
from hb_diagrams_comm import DIAGRAMS

HANDBOOK_TABS = [
    {
        "title": "1. Kiến Trúc & Arbitration",
        "subs": [
            {
                "label": "1.1 Vai trò ComM & Hệ sinh thái Stack",
                "html": f"""
<div class="hb-card">
  <h3>Vai Trò Trung Tâm Của ComM Trong AUTOSAR Classic System Services</h3>
  <p><b>Communication Manager (ComM)</b> đóng vai trò nhạc trưởng phân xử nhu cầu truyền thông tập trung (Mode Arbitration). Các Software Component (SWC) phía trên hoàn toàn được trừu tượng hóa khỏi loại bus vật lý (CAN, Ethernet, FlexRay, LIN) hay cơ chế ngủ/thức mạng (CanNm, UdpNm).</p>
  {DIAGRAMS["ecosystem"]}
  <table class="tbl">
    <thead><tr><th>Tầng / Module</th><th>Hướng giao tiếp</th><th>Input lấy từ đâu / Output route tới đâu</th><th>API chuẩn AUTOSAR R23-11</th></tr></thead>
    <tbody>
      <tr><td><b>SWC Users / RTE</b></td><td>Top → ComM → Top</td><td>Nhận nhu cầu chế độ từ SWC; báo ngược mode thực tế qua <code>Rte_Switch</code> khi BusSM hoàn tất.</td><td><code>ComM_RequestComMode()</code></td></tr>
      <tr><td><b>DCM</b></td><td>Diagnostic → ComM</td><td>Báo phiên chẩn đoán UDS đang hoạt động; ghi đè vượt mọi Mode Inhibition.</td><td><code>ComM_DCM_ActiveDiagnostic()</code></td></tr>
      <tr><td><b>EcuM / BswM</b></td><td>System ↔ ComM</td><td>EcuM mở <code>CommunicationAllowed</code> &amp; báo Wakeup; BswM bật/tắt I-PDU Group theo ComM Mode.</td><td><code>ComM_CommunicationAllowed()</code>, <code>BswM_ComM_CurrentMode()</code></td></tr>
      <tr><td><b>BusSM (CanSM)</b></td><td>ComM ↔ Bottom HW</td><td>Thực thi bật/tắt CanIf Controller &amp; CanTrcv, xác nhận lại qua callback bất đồng bộ.</td><td><code>BusSM_RequestComMode()</code>, <code>ComM_BusSM_ModeIndication()</code></td></tr>
      <tr><td><b>Nm / CanNm</b></td><td>ComM ↔ Network Mgmt</td><td>Điều phối bản tin NM giữ mạng chủ động (<code>NetworkRequest</code>) hoặc nhả mạng (<code>NetworkRelease</code>).</td><td><code>Nm_NetworkRequest()</code>, <code>ComM_Nm_PrepareBusSleepMode()</code></td></tr>
    </tbody>
  </table>
</div>"""
            },
            {
                "label": "1.2 Phân xử Đa User (OR Arbitration)",
                "html": f"""
<div class="hb-card">
  <h3>Kiến Trúc 2 Tầng: ComMUser ↔ ComMChannel &amp; Phép Toán OR</h3>
  <p>Nhiều SWC (ví dụ <code>User 0</code> cho chẩn đoán nội bộ, <code>User 1</code> cho Body Control, <code>User 2</code> qua PNC #16) có thể dùng chung một kênh vật lý <code>ComMChannel_0</code>. ComM lưu bảng yêu cầu độc lập cho từng User và áp dụng nguyên tắc <b>Highest Requested Mode Wins</b> (<code>FULL_COM &gt; NO_COM</code>).</p>
  {DIAGRAMS["arb"]}
  <ul>
    <li><b>Khi 1 trong N User còn xin FULL_COM:</b> Kênh bắt buộc ở <code>COMM_FULL_COM_NETWORK_REQUESTED</code>. Việc User 0 nhả mạng không thể làm tắt bus nếu User 1 vẫn đang yêu cầu.</li>
    <li><b>Khi TẤT CẢ User và PNC đã về NO_COM:</b> Nếu không còn DCM Active hay timer <code>TMinFullComModeDuration</code>, kênh mới chuyển sang <code>COMM_FULL_COM_READY_SLEEP</code> để chuẩn bị ngủ.</li>
    <li><b>Ánh xạ Nhiều-Nhiều (N:M):</b> 1 User có thể map vào nhiều kênh (hoặc map thông qua 1 PNC gồm nhiều kênh vật lý).</li>
  </ul>
</div>"""
            },
            {
                "label": "1.3 Bắt Tay Bất Đồng Bộ BusSM & Rte_Switch",
                "html": f"""
<div class="hb-card">
  <h3>Cơ Chế Xác Nhận BusSM &amp; Quy Tắc An Toàn Cho SWC / BswM</h3>
  <p>Rất nhiều kỹ sư tích hợp mới nhầm tưởng gọi <code>ComM_RequestComMode(FULL_COM)</code> xong là SWC gửi frame CAN được ngay. Thực tế theo <code>SWS_ComM_00675</code>, việc bật Transceiver/Controller trên CanSM tốn thời gian và có thể đang bận khôi phục Bus-Off.</p>
  {DIAGRAMS["bussm"]}
  <table class="tbl">
    <thead><tr><th>Giai đoạn</th><th>ComM Channel Mode</th><th>BusSM_ModeIndication</th><th>User CurrentMode &amp; BswM</th></tr></thead>
    <tbody>
      <tr><td>1. Ngay sau Request</td><td><code>COMM_FULL_COM_NETWORK_REQUESTED</code></td><td>Chưa có (Đang đợi CanSM)</td><td><b>Vẫn là NO_COM</b> — SWC chưa được truyền Tx PDU!</td></tr>
      <tr><td>2. Đang khởi tạo CAN HW</td><td><code>COMM_FULL_COM_NETWORK_REQUESTED</code></td><td>CanSM đang wake CanTrcv + start CanIf</td><td>Bit 1 (<code>BUSSM</code>) Thanh A = 0</td></tr>
      <tr><td>3. CanSM gọi ModeIndication</td><td><code>COMM_FULL_COM_NETWORK_REQUESTED</code></td><td><code>COMM_FULL_COMMUNICATION</code> confirmed!</td><td>Bật Bit 1 <code>BUSSM = 1</code> → báo <code>BswM_ComM_CurrentMode()</code> &amp; <code>Rte_Switch(FULL)</code>.</td></tr>
    </tbody>
  </table>
</div>"""
            },
            {
                "label": "1.4 Synchronous WakeUp Đa Kênh",
                "html": f"""
<div class="hb-card">
  <h3>Cơ Chế ComMSynchronousWakeUp &amp; EcuM Wakeup Interaction</h3>
  <p>Trên các ECU có từ 2 kênh mạng trở lên (ví dụ Ch0 nối Backbone CAN và Ch1 nối Body CAN), tham số <code>ComMSynchronousWakeUp</code> (<code>SWS_ComM_00695</code>) quyết định xem một xung wakeup phần cứng trên một kênh có đồng thời kéo tất cả các kênh còn lại ra khỏi giấc ngủ hay không.</p>
  {DIAGRAMS["syncwake"]}
  <ul>
    <li><b>ComMSynchronousWakeUp = TRUE:</b> Một lời gọi <code>ComM_EcuM_WakeUpIndication(Ch0)</code> tự động đánh dấu pending wakeup cho cả Ch1 và mọi kênh khác trên ECU.</li>
    <li><b>ComMSynchronousWakeUp = FALSE:</b> Chỉ duy nhất kênh nhận wakeup (Ch0) thức dậy; Ch1 tiếp tục ngủ <code>NO_COM</code> để tiết kiệm điện năng cho đến khi Gateway hoặc User gọi trực tiếp.</li>
  </ul>
</div>"""
            },
        ],
    },
    {
        "title": "2. Máy Trạng Thái & NM Variants",
        "subs": [
            {
                "label": "2.1 Bản đồ 3 Modes & 5 Sub-States",
                "html": f"""
<div class="hb-card">
  <h3>Máy Trạng Thái 2 Cấp Của Kênh ComM (SWS_ComM_00298)</h3>
  <p>ComM định nghĩa 3 chế độ lớn (<code>ComM_ModeType</code>) giao tiếp ra ngoài và 5 trạng thái con nội bộ (<code>ComM_StateType</code>) để điều phối chính xác từng pha quá độ với Nm và EcuM.</p>
  {DIAGRAMS["ch_sm"]}
  <table class="tbl">
    <thead><tr><th>Mode Lớn</th><th>Sub-State (SWS_ComM_00298)</th><th>Điều kiện kích hoạt &amp; Hành vi bus</th></tr></thead>
    <tbody>
      <tr><td><code>NO_COM</code></td><td><code>COMM_NO_COM_NO_PENDING_REQUEST</code></td><td>Ngủ hoàn toàn, không có request chờ, BusSM đang ở NO_COM.</td></tr>
      <tr><td><code>NO_COM</code></td><td><code>COMM_NO_COM_REQUEST_PENDING</code></td><td>Đã có User hoặc Wakeup yêu cầu nhưng đang bị chốt <code>CommunicationAllowed == FALSE</code> giữ lại.</td></tr>
      <tr><td><code>FULL_COM</code></td><td><code>COMM_FULL_COM_NETWORK_REQUESTED</code></td><td>Có ít nhất 1 User, PNC, DCM hoặc timer <code>TMinFull</code> giữ mạng; phát <code>Nm_NetworkRequest()</code>.</td></tr>
      <tr><td><code>FULL_COM</code></td><td><code>COMM_FULL_COM_READY_SLEEP</code></td><td>Mọi chủ thể đã release hoặc thức do Passive Wakeup; gọi <code>Nm_NetworkRelease()</code> (FULL) hoặc chạy <code>NmLightTimeout</code> (LIGHT).</td></tr>
      <tr><td><code>SILENT_COM</code></td><td><code>COMM_SILENT_COM</code></td><td>Chỉ dùng cho biến thể FULL/PASSIVE khi CanNm vào <code>PrepareBusSleepMode</code>: Chỉ nhận (Rx), cấm phát (Tx).</td></tr>
    </tbody>
  </table>
</div>"""
            },
            {
                "label": "2.2 So sánh 4 Biến Thể NM (FULL / LIGHT / PASSIVE / NONE)",
                "html": f"""
<div class="hb-card">
  <h3>Chiến Lược Quản Lý Mạng ComMNmVariant</h3>
  {DIAGRAMS["variants"]}
  <table class="tbl">
    <thead><tr><th>Đặc điểm kỹ thuật</th><th>FULL</th><th>LIGHT</th><th>PASSIVE</th><th>NONE</th></tr></thead>
    <tbody>
      <tr><td>Giao tiếp module Nm/CanNm</td><td>Có (Đầy đủ Tx/Rx NM PDU)</td><td><b>Không có gói NM</b></td><td>Có (Chỉ nghe Rx NM PDU)</td><td>Không dùng NM</td></tr>
      <tr><td>Cho phép SWC đòi chủ động (NET_REQ)</td><td>Có</td><td>Có</td><td><b>Không (Chỉ Passive Wakeup!)</b></td><td>Có</td></tr>
      <tr><td>Sử dụng <code>TMinFullComModeDuration</code></td><td>Không (NmTimeout quản lý)</td><td><b>Có</b></td><td>Không</td><td><b>Có</b></td></tr>
      <tr><td>Sử dụng <code>ComMNmLightTimeout</code></td><td>Không</td><td><b>Có (chạy ở READY_SLEEP)</b></td><td>Không</td><td>Không</td></tr>
      <tr><td>Có trạng thái <code>SILENT_COM</code></td><td><b>Có</b></td><td>Không</td><td><b>Có</b></td><td>Không</td></tr>
      <tr><td>Ứng dụng thực tế</td><td>Backbone CAN, Gateway, ECU chính</td><td>ECU nhánh đơn giản cần tắt theo timer</td><td>ECU Slave chỉ nghe theo Master</td><td>Bus nội bộ ECU, Local LIN/ETH</td></tr>
    </tbody>
  </table>
</div>"""
            },
            {
                "label": "2.3 Gatekeeper CommunicationAllowed & Pending",
                "html": f"""
<div class="hb-card">
  <h3>Chốt Chặn An Toàn Khởi Động: ComM_CommunicationAllowed()</h3>
  <p>Trong pha Startup của ECU, SWC hoặc BSW có thể gọi <code>ComM_RequestComMode(FULL_COM)</code> trước khi nguồn ổn định hoặc NvM đọc xong. <code>CommunicationAllowed</code> đảm bảo không có frame nào lọt xuống transceiver trước khi ECU sẵn sàng.</p>
  {DIAGRAMS["gatekeeper"]}
  <ul>
    <li><b>SWS_ComM_00895:</b> Nếu <code>Allowed == FALSE</code>, mọi yêu cầu/wakeup đều đỗ tại <code>COMM_NO_COM_REQUEST_PENDING</code> (Bit 5 <code>WAKEUP_PEND</code> = 1 trên Thanh A).</li>
    <li>Ngay khi EcuM/BswM gọi <code>ComM_CommunicationAllowed(Ch, TRUE)</code>, ở chu kỳ <code>ComM_MainFunction</code> kế tiếp, kênh tự động chuyển sang <code>FULL_COM</code> mà SWC không cần gọi lại API!</li>
  </ul>
</div>"""
            },
            {
                "label": "2.4 Graceful Shutdown & Bộ Đếm Thời Gian",
                "html": f"""
<div class="hb-card">
  <h3>Quy Trình Tắt Mạng Êm Dịu &amp; Phân Biệt Hai Bộ Đếm Timer</h3>
  {DIAGRAMS["shutdown"]}
  <ul>
    <li><b>Với biến thể FULL:</b> ComM không tự đếm thời gian ngủ. ComM gọi <code>Nm_NetworkRelease()</code>, sau đó hoàn toàn lắng nghe hai callback từ CanNm: <code>ComM_Nm_PrepareBusSleepMode()</code> (sang <code>SILENT_COM</code>) và <code>ComM_Nm_BusSleepMode()</code> (về <code>NO_COM</code>).</li>
    <li><b>Với biến thể LIGHT:</b> <code>TMinFullComModeDuration</code> bảo vệ kênh trong pha <code>NETWORK_REQUESTED</code> để bus ổn định; khi về <code>READY_SLEEP</code>, <code>ComMNmLightTimeout</code> đếm ngược để chuyển thẳng về <code>NO_COM</code>.</li>
  </ul>
</div>"""
            },
        ],
    },
    {
        "title": "3. Mode Inhibition, NvM & DCM",
        "subs": [
            {
                "label": "3.1 Bit 0 NoWakeup vs Bit 1 LimitToNoCom",
                "html": f"""
<div class="hb-card">
  <h3>Phân Biệt Hai Cơ Chế Mode Inhibition (SWS_ComM_00669)</h3>
  <p>ComM cung cấp chuẩn dữ liệu <code>ComM_InhibitionStatusType</code> (uint8) với 2 bit cốt lõi (ánh xạ trực tiếp vào Bit 0 và Bit 1 của Thanh B trong trình mô phỏng):</p>
  {DIAGRAMS["inhib"]}
  <table class="tbl">
    <thead><tr><th>Bit</th><th>Tên API / Tham số</th><th>Trạng thái bị ảnh hưởng</th><th>Hành vi chuẩn AUTOSAR</th></tr></thead>
    <tbody>
      <tr><td><b>Bit 0 (0x01)</b></td><td><code>ComM_PreventWakeUp(Ch, TRUE)</code> / <code>ComMNoWakeup</code></td><td>Kênh đang ở <code>NO_COM</code> hoặc <code>SILENT_COM</code></td><td>Chặn SWC User đánh thức bus; <b>KHÔNG</b> chặn Passive Wakeup từ bus ngoài và KHÔNG ngắt kênh đang ở <code>FULL_COM</code>.</td></tr>
      <tr><td><b>Bit 1 (0x02)</b></td><td><code>ComM_LimitChannelToNoComMode(Ch, TRUE)</code> / <code>LimitECUToNoComMode</code></td><td>Tất cả trạng thái (kể cả đang <code>FULL_COM</code>)</td><td>Cưỡng bức kênh nhả mạng (gọi <code>Nm_NetworkRelease</code>) để tắt về <code>NO_COM</code> bất chấp User đang giữ yêu cầu.</td></tr>
    </tbody>
  </table>
</div>"""
            },
            {
                "label": "3.2 Bảng Chân Trị ECU Group Classification",
                "html": f"""
<div class="hb-card">
  <h3>Mặt Nạ Toàn Cục ComMEcuGroupClassification (Masking Truth Table)</h3>
  <p>Ngay cả khi bạn gọi <code>ComM_PreventWakeUp(TRUE)</code> hay <code>ComM_LimitChannelToNoComMode(TRUE)</code>, lệnh đó CHỈ có tác dụng thực tế nếu bit tương ứng trong <code>ComMEcuGroupClassification</code> bằng <code>1</code>!</p>
  {DIAGRAMS["mask_truth"]}
  <table class="tbl">
    <thead><tr><th>Giá trị Classification (Hex / Bin)</th><th>Bit 0 (NoWakeup Mask)</th><th>Bit 1 (LimitToNoCom Mask)</th><th>Kết quả thực tế khi bật Inhibition</th></tr></thead>
    <tbody>
      <tr><td><code>0x00</code> (<code>0b00</code>)</td><td>0 (Disabled)</td><td>0 (Disabled)</td><td><b>Vô hiệu hóa hoàn toàn Mode Inhibition</b> — mọi User xin mạng bình thường.</td></tr>
      <tr><td><code>0x01</code> (<code>0b01</code>)</td><td>1 (Enabled)</td><td>0 (Disabled)</td><td>Chỉ cho phép <code>PreventWakeUp</code>; lệnh <code>LimitChannelToNoComMode</code> bị bỏ qua!</td></tr>
      <tr><td><code>0x02</code> (<code>0b10</code>)</td><td>0 (Disabled)</td><td>1 (Enabled)</td><td>Chỉ cho phép <code>LimitToNoCom</code>; lệnh <code>PreventWakeUp</code> không hoạt động!</td></tr>
      <tr><td><code>0x03</code> (<code>0b11</code>)</td><td>1 (Enabled)</td><td>1 (Enabled)</td><td><b>Cả hai tính năng đều hoạt động đầy đủ</b> (cấu hình mặc định khuyến nghị).</td></tr>
    </tbody>
  </table>
</div>"""
            },
            {
                "label": "3.3 InhibitCounter & Lưu Trữ Bền Vững NvM",
                "html": f"""
<div class="hb-card">
  <h3>Cơ Chế Đếm Từ Chối (ComMInhibitCounter) &amp; Quản Lý NvM</h3>
  <p>Để kỹ sư chẩn đoán/OEM biết được có bao nhiêu lần phần mềm ứng dụng cố gắng đòi truyền thông khi xe đang ở chế độ ngủ tiết kiệm điện, ComM duy trì bộ đếm <code>uint16 ComMInhibitCounter</code>:</p>
  {DIAGRAMS["nvm_counter"]}
  <ul>
    <li>Mỗi khi <code>ComM_RequestComMode(User, FULL_COM)</code> bị từ chối bởi Bit 0 hoặc Bit 1 Inhibition, ComM tăng counter thêm 1 (chống tràn ở <code>65535</code>) và gọi <code>NvM_SetRamBlockStatus(BlockId, TRUE)</code>.</li>
    <li>Nếu cấu hình <code>ComMNoWakeupNvMStorage = TRUE</code>, cờ <code>ComMNoWakeup</code> của từng kênh cũng được phản chiếu xuống NvM để giữ nguyên trạng thái chống wakeup sau khi ECU ngủ/tắt nguồn IG-OFF.</li>
    <li>Ứng dụng đọc giá trị qua <code>ComM_ReadInhibitCounter(&amp;Counter)</code> và xóa về 0 qua <code>ComM_ResetInhibitCounter()</code>.</li>
  </ul>
</div>"""
            },
            {
                "label": "3.4 Quyền Tối Cao DCM ActiveDiagnostic",
                "html": f"""
<div class="hb-card">
  <h3>Thứ Tự Ưu Tiên Tuyệt Đối Của Chẩn Đoán UDS (SWS_ComM_00303)</h3>
  <p>Khi kỹ thuật viên cắm máy chẩn đoán OBD/DoIP để đọc lỗi DTC hoặc nạp Flash phần mềm ECU, quá trình này tuyệt đối không được phép bị ngắt ngang bởi chế độ tiết kiệm pin (Mode Inhibition).</p>
  {DIAGRAMS["dcm_priority"]}
  <ul>
    <li><b>1. ComM_DCM_ActiveDiagnostic(Channel):</b> Vượt qua (override) mọi cờ <code>PreventWakeUp</code>, <code>LimitChannelToNoComMode</code> và <code>LimitECUToNoComMode</code>. Đẩy kênh ngay vào <code>COMM_FULL_COM_NETWORK_REQUESTED</code> (Bit 6 Thanh A <code>DCM_DIAG = 1</code>).</li>
    <li><b>2. Lưu ý Passive Channel:</b> Theo đặc tả AUTOSAR, kênh <code>PASSIVE</code> vẫn bị ràng buộc bởi bản chất chỉ nghe bus (hoặc tùy cấu hình gateway chẩn đoán).</li>
    <li><b>3. ComM_DCM_InactiveDiagnostic(Channel):</b> Khi hết phiên S3 chẩn đoán, DCM trả lại quyền phân xử cho ComM; nếu <code>LimitToNoCom</code> vẫn đang bật, kênh ngay lập tức chuyển xuống <code>READY_SLEEP</code> để đi ngủ.</li>
  </ul>
</div>"""
            },
        ],
    },
    {
        "title": "4. Partial Net (PNC & GW)",
        "subs": [
            {
                "label": "4.1 Giải Phẫu Bit Vector PNC (Offset & Mask)",
                "html": f"""
<div class="hb-card">
  <h3>Bản Chất Partial Networking Cluster (PNC) &amp; Khung NM PDU</h3>
  <p>Partial Networking cho phép chỉ đánh thức một nhóm ECU phục vụ một chức năng cụ thể (ví dụ cụm sạc pin hoặc khóa cửa) trên cùng một dây bus vật lý trong khi các ECU không liên quan tự đóng bộ thu phát đi ngủ thông qua Selective Wakeup Transceiver.</p>
  {DIAGRAMS["pnc_vec"]}
  <ul>
    <li>Mỗi cụm PNC có 1 ID (ví dụ PNC #16, PNC #18). Với <code>ComMPncInfoOffset = 2</code> (bỏ qua Byte 0 NodeID và Byte 1 CBV trong gói CanNm), Byte Index = <code>(16 / 8) - 2 = 0</code> (tức Byte 2 của Frame NM), Bit Mask = <code>1 &lt;&lt; (16 % 8) = 0x01</code>.</li>
    <li>Bit = 1 nghĩa là cụm PNC đó đang được yêu cầu duy trì kết nối trên bus.</li>
  </ul>
</div>"""
            },
            {
                "label": "4.2 Máy Trạng Thái PNC 4 Bước (SWS_ComM_00909)",
                "html": f"""
<div class="hb-card">
  <h3>Chuyển Pha Chính Xác Của Máy Trạng Thái PNC</h3>
  {DIAGRAMS["pnc_sm"]}
  <table class="tbl">
    <thead><tr><th>Trạng thái PNC</th><th>Tx PN Bit Signal</th><th>Tác động lên kênh vật lý &amp; BswM</th></tr></thead>
    <tbody>
      <tr><td><code>COMM_PNC_NO_COMMUNICATION</code></td><td><b>0</b></td><td>Không yêu cầu kênh; BswM tắt các I-PDU Group thuộc PNC này.</td></tr>
      <tr><td><code>COMM_PNC_REQUESTED</code></td><td><b>1</b> (Gọi <code>Com_SendSignal</code>)</td><td>Có User nội bộ hoặc Gateway ACTIVE yêu cầu → chủ động phát bit=1 lên mạng và kéo kênh vào <code>FULL_COM</code>.</td></tr>
      <tr><td><code>COMM_PNC_READY_SLEEP</code></td><td><b>0</b> (Không tự phát!)</td><td>User nội bộ đã nhả nhưng <code>Rx EIRA</code> từ ECU ngoài vẫn bằng 1 → ECU giữ kênh thức để nghe dữ liệu PNC.</td></tr>
      <tr><td><code>COMM_PNC_PREPARE_SLEEP</code></td><td><b>0</b></td><td>Cả User nội bộ lẫn <code>Rx EIRA</code> đã về 0 → chạy <code>ComMPncPrepareSleepTimer</code> trước khi tắt hẳn.</td></tr>
    </tbody>
  </table>
</div>"""
            },
            {
                "label": "4.3 EIRA vs ERA & Luồng 10 Bước Rx EIRA",
                "html": f"""
<div class="hb-card">
  <h3>Phân Biệt Vector EIRA Và ERA Trong AUTOSAR COM ↔ ComM</h3>
  {DIAGRAMS["eira_era"]}
  <table class="tbl">
    <thead><tr><th>Tiêu chí</th><th>EIRA (External &amp; Internal Request Array)</th><th>ERA (External Request Array)</th></tr></thead>
    <tbody>
      <tr><td>Phạm vi tổng hợp</td><td>Tổng hợp yêu cầu từ <b>bên ngoài bus + nội bộ</b> trên phạm vi đa kênh của cùng 1 PNC.</td><td>Chỉ chứa yêu cầu đến từ <b>bên ngoài bus trên từng kênh vật lý riêng biệt</b> (Ch0, Ch1...).</td></tr>
      <tr><td>Mục đích sử dụng</td><td>Quyết định chuyển PNC sang <code>COMM_PNC_READY_SLEEP</code> để bật/giữ giao tiếp nội bộ ECU.</td><td>Làm đầu vào bắt buộc cho <b>PNC Gateway (GW Routing)</b> để chuyển tiếp sang các bus khác mà không bị tự dội ngược vòng lặp!</td></tr>
      <tr><td>Callback từ COM</td><td><code>ComM_COMCbk_&lt;EiraSignalId&gt;()</code></td><td><code>ComM_COMCbk_&lt;EraSignalId_ChN&gt;()</code></td></tr>
    </tbody>
  </table>
</div>"""
            },
            {
                "label": "4.4 PNC Gateway (ACTIVE / PASSIVE) & Sync Shutdown",
                "html": f"""
<div class="hb-card">
  <h3>Định Tuyến PNC Đa Kênh, Chống Loop &amp; Synchronized Shutdown (R21-11+)</h3>
  {DIAGRAMS["pnc_gw"]}
  <ul>
    <li><b>Kênh ACTIVE Gateway:</b> Có thể nhận ERA và định tuyến sang TẤT CẢ các kênh ACTIVE và PASSIVE khác.</li>
    <li><b>Kênh PASSIVE Gateway:</b> Chỉ được phép chuyển tiếp ERA tới các kênh <code>ACTIVE</code> — <b>tuyệt đối cấm định tuyến sang một kênh PASSIVE khác</b> (<code>SWS_ComM_00944</code>) để loại bỏ nguy cơ giữ mạng vĩnh viễn thành vòng lặp giữa 2 mạng con.</li>
    <li><b>Synchronized PNC Shutdown (<code>SWS_ComM_01059</code>):</b> Khi Coordinator tắt PNC trên hệ thống gateway, ComM gọi <code>Nm_RequestSynchronizedPncShutdown()</code> để thông báo tắt đồng loạt nhanh thay vì phải đợi hết NmTimeout từng node.</li>
  </ul>
</div>"""
            },
        ],
    },
    {
        "title": "5. Cấu Hình ECUC & Chuẩn API",
        "subs": [
            {
                "label": "5.1 Kiến Trúc 34+ Tham Số ECUC ComM",
                "html": f"""
<div class="hb-card">
  <h3>Phân Nhóm Tham Số Cấu Hình AUTOSAR ECUC ComM</h3>
  {DIAGRAMS["ecuc_tree"]}
  <table class="tbl">
    <thead><tr><th>Container ECUC</th><th>Các tham số cốt lõi</th><th>Ý nghĩa thiết kế &amp; Ràng buộc</th></tr></thead>
    <tbody>
      <tr><td><code>ComMGeneral</code></td><td><code>ComMDevErrorDetect</code>, <code>ComMVersionInfoApi</code>, <code>ComMModeLimitationEnabled</code>, <code>ComMWakeupInhibitionEnabled</code>, <code>ComMSynchronousWakeUp</code>, <code>ComMTMinFullComModeDuration</code>, <code>ComMEcuGroupClassification</code>, <code>ComMPncSupport</code>, <code>ComMPncPrepareSleepTimer</code>, <code>ComMPncGatewayEnabled</code></td><td>Cấu hình hành vi toàn cục cấp ECU và công tắc biên dịch Pre-Compile (<code>ComM_Cfg.h</code>).</td></tr>
      <tr><td><code>ComMChannel</code></td><td><code>ComMChannelId</code>, <code>ComMBusType</code>, <code>ComMMainFunctionPeriod</code>, <code>ComMNmVariant</code>, <code>ComMNmLightTimeout</code>, <code>ComMNoWakeupNvMStorage</code>, <code>ComMPncNmRequest</code>, <code>ComMPncGatewayType</code></td><td>Cấu hình riêng cho từng bus CAN/ETH/FR/LIN được ánh xạ vào bảng struct trong <code>ComM_Lcfg.c</code>.</td></tr>
      <tr><td><code>ComMUser</code></td><td><code>ComMUserIdentifier</code>, <code>ComMUserEcucPartitionRef</code>, Channel / PNC References</td><td>Định nghĩa cổng phục vụ SWC gọi <code>ComM_RequestComMode()</code>.</td></tr>
      <tr><td><code>ComMPnc</code></td><td><code>ComMPncId</code>, <code>ComMPncChannelPerPnc</code>, <code>ComMPncUserRef</code>, <code>ComMPncComSignal (EIRA / ERA / TX)</code></td><td>Định nghĩa Bit Mask và tín hiệu COM liên kết từng cụm PNC.</td></tr>
    </tbody>
  </table>
</div>"""
            },
            {
                "label": "5.2 Danh Bảng Chuẩn APIs (R20-11 → R23-11)",
                "html": """
<div class="hb-card">
  <h3>Tra Cứu Signature API Chuẩn AUTOSAR Classic (R23-11)</h3>
  <table class="tbl">
    <thead><tr><th>Nhóm API</th><th>Prototype Chuẩn</th><th>Caller / Callee &amp; Ghi chú</th></tr></thead>
    <tbody>
      <tr><td>System Init &amp; Main</td><td><code>void ComM_Init(const ComM_ConfigType* ConfigPtr)</code><br><code>void ComM_MainFunction_&lt;Channel&gt;(void)</code></td><td>EcuM gọi Init lúc Startup; SchM/OS Task gọi MainFunction mỗi 10-20ms.</td></tr>
      <tr><td>SWC Request</td><td><code>Std_ReturnType ComM_RequestComMode(ComM_UserHandleType User, ComM_ModeType ComMode)</code><br><code>Std_ReturnType ComM_GetCurrentComMode(ComM_UserHandleType User, ComM_ModeType* ComMode)</code></td><td>SWC (qua RTE) gọi yêu cầu và kiểm tra mode đã confirm.</td></tr>
      <tr><td>Inhibition &amp; NvM</td><td><code>Std_ReturnType ComM_PreventWakeUp(NetworkHandleType Channel, boolean Status)</code><br><code>Std_ReturnType ComM_LimitChannelToNoComMode(NetworkHandleType Channel, boolean Status)</code><br><code>Std_ReturnType ComM_LimitECUToNoComMode(boolean Status)</code><br><code>Std_ReturnType ComM_ReadInhibitCounter(uint16* CounterValue)</code></td><td>BswM hoặc DCM Service ($28/$85) điều khiển giới hạn truyền thông.</td></tr>
      <tr><td>Callbacks</td><td><code>void ComM_CommunicationAllowed(NetworkHandleType Channel, boolean Allowed)</code><br><code>void ComM_BusSM_ModeIndication(NetworkHandleType Channel, const ComM_ModeType* ComMode)</code><br><code>void ComM_BusSM_BusSleepMode(NetworkHandleType Channel)</code> (R20-11+)<br><code>void ComM_Nm_NetworkStartIndication / PrepareBusSleepMode / BusSleepMode</code><br><code>void ComM_DCM_ActiveDiagnostic / InactiveDiagnostic</code></td><td>Các hàm báo ngược bất đồng bộ từ BSW bên dưới và EcuM/DCM lên ComM.</td></tr>
    </tbody>
  </table>
</div>"""
            },
            {
                "label": "5.3 Cấu Trúc ComM_Cfg.h vs ComM_Lcfg.c",
                "html": """
<div class="hb-card">
  <h3>Phân Tách Dữ Liệu Pre-Compile Và Link-Time / Post-Build</h3>
  <ul>
    <li><b><code>ComM_Cfg.h</code> (Pre-Compile Switches &amp; Macros):</b> Chứa các macro <code>STD_ON / STD_OFF</code> (như <code>COMM_DEV_ERROR_DETECT</code>, <code>COMM_PNC_SUPPORT</code>, <code>COMM_MODE_LIMITATION_ENABLED</code>) nhằm loại bỏ mã nguồn chết giúp tối ưu bộ nhớ Flash/RAM vi điều khiển.</li>
    <li><b><code>ComM_Lcfg.c / ComM_PBcfg.c</code> (Link-Time / Post-Build Tables):</b> Chứa các bảng cấu trúc hằng (<code>const ComM_ChannelConfigType[]</code>, ánh xạ <code>User → Channel</code>, mặt nạ bit PNC và bảng tham chiếu SignalId COM) để có thể thay đổi cấu hình mạng theo biến thể xe.</li>
    <li><i>Mẹo:</i> Bạn có thể bấm nút <b>"📦 Xuất ARXML / Cfg / C"</b> ngay trên thanh Header để xem live bộ code sinh ra tương ứng với cấu hình đang chỉnh!</li>
  </ul>
</div>"""
            },
            {
                "label": "5.4 Điểm Mới Từ AUTOSAR R4.x Lên R20-11 / R23-11",
                "html": """
<div class="hb-card">
  <h3>Tiến Hóa Đặc Tả ComM Qua Các Phiên Bản AUTOSAR Classic</h3>
  <table class="tbl">
    <thead><tr><th>Thay đổi</th><th>AUTOSAR 4.2 / 4.3</th><th>AUTOSAR R20-11 / R22-11 / R23-11</th></tr></thead>
    <tbody>
      <tr><td>Xác nhận BusSM tắt xong</td><td>Phụ thuộc vào <code>ComM_BusSM_ModeIndication(NO_COM)</code></td><td>Bổ sung callback chuyên biệt <code>ComM_BusSM_BusSleepMode(Channel)</code> cho giao thức Ethernet/L2 Wakeup.</td></tr>
      <tr><td>Tắt PNC đồng bộ</td><td>Chờ hết timer NM/PrepareSleep từng node độc lập</td><td>Chuẩn hóa <code>ComMSynchronizedPncShutdownEnabled</code> phối hợp PNC Coordinator qua <code>Nm_RequestSynchronizedPncShutdown()</code>.</td></tr>
      <tr><td>Kiểu <code>ComM_BusSM_ModeIndication</code></td><td>Truyền tham trị hoặc con trỏ tùy phiên bản cũ</td><td>Thống nhất truyền con trỏ <code>const ComM_ModeType* ComMode</code> (R19-11+ trở đi) kèm check <code>COMM_E_PARAM_POINTER</code>.</td></tr>
      <tr><td>Multi-Core Partition</td><td>Đơn nhân (1 MainFunction)</td><td>Hỗ trợ phân chia User/Channel theo <code>EcucPartition</code> trên ECU đa nhân.</td></tr>
    </tbody>
  </table>
</div>"""
            },
        ],
    },
    {
        "title": "6. Lỗi Thực Tế, DET & Debug",
        "subs": [
            {
                "label": "6.1 Danh Mục Mã Lỗi DET (SWS_ComM_00234)",
                "html": """
<div class="hb-card">
  <h3>Các Mã Lỗi Phát Triển Chuẩn Của ComM (Module ID = 12)</h3>
  <table class="tbl">
    <thead><tr><th>Tên Mã Lỗi (ErrorId)</th><th>Giá trị</th><th>Nguyên nhân gốc rễ</th><th>Cách phòng tránh / xử lý</th></tr></thead>
    <tbody>
      <tr><td><code>COMM_E_UNINIT</code></td><td><code>0x01</code></td><td>Gọi API (RequestComMode, MainFunction...) trước khi EcuM hoàn thành <code>ComM_Init()</code>.</td><td>Đảm bảo <code>BswM</code> / OS Task chỉ bật SWC hoặc chạy <code>ComM_MainFunction</code> sau pha Init.</td></tr>
      <tr><td><code>COMM_E_WRONG_PARAMETERS</code></td><td><code>0x02</code></td><td>Truyền <code>UserId</code>, <code>ChannelId</code> vượt cấu hình hoặc <code>ComMode</code> sai (VD gọi <code>SILENT_COM</code> từ SWC User!).</td><td>SWC chỉ được gọi <code>FULL_COM</code> hoặc <code>NO_COM</code>; kiểm tra handle ID sinh từ RTE.</td></tr>
      <tr><td><code>COMM_E_PARAM_POINTER</code></td><td><code>0x03</code></td><td>Truyền con trỏ <code>NULL_PTR</code> vào <code>GetCurrentComMode</code>, <code>GetState</code>, <code>GetVersionInfo</code>...</td><td>Luôn truyền địa chỉ biến hợp lệ đã cấp phát.</td></tr>
      <tr><td><code>COMM_E_INIT_FAILED</code></td><td><code>0x04</code></td><td>Con trỏ cấu hình Post-Build truyền vào <code>ComM_Init(ConfigPtr)</code> bị NULL hoặc sai chữ ký.</td><td>Kiểm tra script liên kết <code>ComM_PBcfg</code> trong BSW startup.</td></tr>
    </tbody>
  </table>
</div>"""
            },
            {
                "label": "6.2 Checklist 5 Ca Bệnh Kẹt Mạng Thường Gặp",
                "html": f"""
<div class="hb-card">
  <h3>Cẩm Nang Xử Lý Nhanh Sự Cố Tích Hợp ComM Ngoài Dự Án</h3>
  {DIAGRAMS["debug_tree"]}
  <ol>
    <li><b>Bệnh 1 — Kênh kẹt mãi ở <code>COMM_NO_COM_REQUEST_PENDING</code> (Bit 5 = 1):</b> Quên gọi <code>ComM_CommunicationAllowed(Ch, TRUE)</code> trong cấu hình <code>BswM</code> rule lúc Startup Two.</li>
    <li><b>Bệnh 2 — Channel đã báo <code>FULL_COM</code> nhưng SWC vẫn không gửi được frame CAN:</b> <code>CanSM</code> bị kẹt ở Bus-Off hoặc chờ CanTrcv chưa gọi lại <code>ComM_BusSM_ModeIndication(FULL_COM)</code> (Bit 1 <code>BUSSM = 0</code>), hoặc <code>BswM</code> quên bật Tx I-PDU Group.</li>
    <li><b>Bệnh 3 — Gọi <code>ComM_LimitChannelToNoComMode(TRUE)</code> nhưng xe vẫn không tắt mạng:</b> Kiểm tra <code>ComMEcuGroupClassification</code> xem Bit 1 (0x02) có bị đặt = 0 không, hoặc xem module <code>DCM</code> có đang quên gọi <code>InactiveDiagnostic()</code> sau khi rút máy chẩn đoán không!</li>
    <li><b>Bệnh 4 — Gọi <code>ComM_RequestComMode(FULL)</code> mà <code>InhibitCounter</code> tăng vọt:</b> Bit 0 <code>NoWakeup</code> đang lưu lại từ lần ngủ trước trong NvM (<code>ComMNoWakeupNvMStorage=TRUE</code>) mà chưa được xóa khi IG-ON.</li>
    <li><b>Bệnh 5 — Kênh cấu hình <code>PASSIVE</code> không bao giờ tự lên <code>NETWORK_REQUESTED</code>:</b> Thiết kế AUTOSAR cấm kênh <code>PASSIVE</code> tự xin mạng; muốn chủ động phải đổi sang <code>FULL</code> hoặc <code>LIGHT</code>.</li>
  </ol>
</div>"""
            },
            {
                "label": "6.3 Bẫy Cạn Bình Ắc Quy (ECU Không Ngủ Được)",
                "html": """
<div class="hb-card">
  <h3>Truy Vết Nguyên Nhân Gây Rò Dòng Khi Xe Đỗ (Dark Current Drain)</h3>
  <ul>
    <li><b>User rò rỉ (User Leak):</b> Một SWC gọi <code>ComM_RequestComMode(User_X, FULL_COM)</code> lúc có lỗi rồi kẹt ở nhánh exception không bao giờ gọi <code>NO_COM</code>. Dùng Debugger kiểm tra mảng <code>ComM_UserRequestedMode[]</code> để tìm đúng User đang còn giá trị 1.</li>
    <li><b>Dính Bit PNC EIRA / RxERA:</b> Một ECU lạ trên bus vẫn gửi gói NM chứa Bit PNC = 1 khiến cụm PNC kẹt mãi ở <code>COMM_PNC_READY_SLEEP</code>, làm Gateway giữ toàn bộ xe thức.</li>
    <li><b>CanNm RepeatMessage / TMinFull lặp vòng:</b> Có bản tin wake giả từ CanTrcv liên tục gọi <code>ComM_EcuM_WakeUpIndication</code> đúng lúc vừa tắt về <code>NO_COM</code>.</li>
  </ul>
</div>"""
            },
            {
                "label": "6.4 Kỹ Thuật Trace CANoe & Debugger Trace32",
                "html": """
<div class="hb-card">
  <h3>Phương Pháp Đo Kiểm Phối Hợp Giữa Bus Trace &amp; Biến RAM ECU</h3>
  <ul>
    <li><b>Bước 1 (CANoe Trace):</b> Quan sát thời điểm khung CanNm cuối cùng biến mất trên bus. Nếu khung NM biến mất nhưng bản tin ứng dụng vẫn phát → kiểm tra xem có kênh <code>LIGHT/NONE</code> giữ hay <code>Nm_NetworkRelease()</code> chưa được gọi.</li>
    <li><b>Bước 2 (Trace32 Watch):</b> Đặt Watch trực tiếp 4 biến sống còn: <code>ComM_ChannelState[0]</code>, <code>ComM_BusSmMode[0]</code>, <code>ComM_InhibitionStatus[0]</code>, và <code>ComM_DcmDiagnosticActive[0]</code>.</li>
    <li><b>Bước 3 (BreakPoint vàng):</b> Đặt breakpoint tại <code>ComM_BusSM_ModeIndication()</code> và <code>ComM_Nm_BusSleepMode()</code> để đo chính xác độ trễ bắt tay phần cứng xuống millisecond.</li>
  </ul>
</div>"""
            },
        ],
    },
]

js_lines = [
    "// ================= PART 6: MULTI-LEVEL HANDBOOK (6x4 TOPICS) & ABBREVIATION TABLE + LIVE SEARCH =================",
    "",
    "const HANDBOOK_DATA = " + json.dumps(HANDBOOK_TABS, ensure_ascii=False, indent=2) + ";",
    "",
    """let currentHbTab1 = 0;
let currentHbSubTab = 0;
let currentAbbrCategory = "ALL";

function switchHbTab1(idx) {
  currentHbTab1 = idx;
  currentHbSubTab = 0;
  renderCurrentHandbookView();
}

function switchHbSubTab(subIdx) {
  currentHbSubTab = subIdx;
  renderHandbookContent();
  renderHbSubNav();
}

function renderHbSubNav() {
  const nav2 = document.getElementById("hbNav2");
  const filterBox = document.getElementById("hbAbbrFilterBox");
  const isAbbrTab = (currentHbTab1 === 6);

  if (filterBox) filterBox.classList.toggle("hidden", !isAbbrTab);
  if (nav2) nav2.classList.toggle("hidden", isAbbrTab);

  if (!isAbbrTab && nav2) {
    const tabData = HANDBOOK_DATA[currentHbTab1];
    nav2.innerHTML = tabData.subs.map((s, idx) =>
      "<button class=\\"hb-tab2 " + (idx === currentHbSubTab ? "active" : "") + "\\" onclick=\\"switchHbSubTab(" + idx + ")\\">" + escapeHtmlSafe(s.label) + "</button>"
    ).join("");
  }
}

function renderHandbookContent() {
  const area = document.getElementById("hbContentArea");
  if (!area) return;
  if (currentHbTab1 === 6) {
    renderAbbreviationTable();
    return;
  }
  const tabData = HANDBOOK_DATA[currentHbTab1];
  const sub = tabData && tabData.subs[currentHbSubTab];
  area.innerHTML = sub ? sub.html : "<div class=\\"hb-card\\">Đang cập nhật nội dung...</div>";
}

function renderCurrentHandbookView() {
  for (let i = 0; i <= 6; i++) {
    const b = document.getElementById("hbTab1_" + i);
    if (b) b.classList.toggle("active", i === currentHbTab1);
  }
  renderHbSubNav();
  renderHandbookContent();
}

function highlightMatch(text, query) {
  const safe = escapeHtmlSafe(text);
  if (!query) return safe;
  const escapedQuery = query.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&");
  const re = new RegExp("(" + escapedQuery + ")", "gi");
  return safe.replace(re, "<mark>$1</mark>");
}

function setAbbrCategory(cat) {
  currentAbbrCategory = cat;
  ["ALL", "CORE", "INHIB", "PN", "STACK"].forEach((c) => {
    const pill = document.getElementById("catPill_" + c);
    if (pill) pill.classList.toggle("active", c === cat);
  });
  filterAbbreviationTable();
}

function filterAbbreviationTable() {
  renderAbbreviationTable();
}

function renderAbbreviationTable() {
  const area = document.getElementById("hbContentArea");
  if (!area) return;
  const qEl = document.getElementById("abbrSearchInput");
  const query = qEl ? qEl.value.trim() : "";
  const ql = query.toLowerCase();

  const catLabels = {
    CORE: "🎛️ Core & Modes",
    INHIB: "🚫 Inhibition & DCM",
    PN: "🌐 Partial Net & PNC",
    STACK: "🧩 AUTOSAR Stack"
  };

  const filtered = ABBREVIATIONS_DATA.filter((item) => {
    if (currentAbbrCategory !== "ALL" && item.cat !== currentAbbrCategory) return false;
    if (!ql) return true;
    return (
      item.abbr.toLowerCase().includes(ql) ||
      item.full.toLowerCase().includes(ql) ||
      item.vi.toLowerCase().includes(ql) ||
      item.desc.toLowerCase().includes(ql) ||
      item.sws.toLowerCase().includes(ql)
    );
  });

  const badge = document.getElementById("abbrCountBadge");
  if (badge) badge.textContent = filtered.length + " / " + ABBREVIATIONS_DATA.length + " thuật ngữ";

  const rowsHtml = filtered.length
    ? filtered.map((item) =>
        "<tr>" +
          "<td><strong class=\\"mono\\" style=\\"color:var(--pri)\\">" + highlightMatch(item.abbr, query) + "</strong></td>" +
          "<td>" + highlightMatch(item.full, query) + "<br/><span style=\\"font-size:11px;color:var(--cyan)\\">" + highlightMatch(item.vi, query) + "</span></td>" +
          "<td><span class=\\"step-pill\\">" + (catLabels[item.cat] || item.cat) + "</span></td>" +
          "<td>" + highlightMatch(item.desc, query) + "</td>" +
          "<td class=\\"mono\\" style=\\"font-size:11px;color:var(--mut)\\">" + highlightMatch(item.sws, query) + "</td>" +
        "</tr>"
      ).join("")
    : "<tr><td colspan=\\"5\\" style=\\"text-align:center;color:var(--mut);padding:16px\\">Không tìm thấy thuật ngữ phù hợp với từ khóa \\"" + escapeHtmlSafe(query) + "\\".</td></tr>";

  area.innerHTML =
    "<div class=\\"hb-card\\">" +
      "<h3>Bảng Tra Cứu Thuật Ngữ &amp; Viết Tắt AUTOSAR ComM (" + ABBREVIATIONS_DATA.length + " Thuật Ngữ Chuyên Sâu)</h3>" +
      "<table class=\\"tbl\\">" +
        "<thead><tr><th style=\\"width:140px\\">Viết tắt / Term</th><th style=\\"width:240px\\">Tên đầy đủ &amp; Nghĩa Việt</th><th style=\\"width:145px\\">Nhóm</th><th>Giải thích kỹ thuật &amp; Chức năng</th><th style=\\"width:115px\\">Chuẩn SWS</th></tr></thead>" +
        "<tbody>" + rowsHtml + "</tbody>" +
      "</table>" +
    "</div>";
}

// ================= APPLICATION BOOTSTRAP =================
document.addEventListener("DOMContentLoaded", () => {
  initTooltipHandlers();
  loadScenario(0);
  switchCfgTab(0);
  switchInspTab(0);
});
</script>
</body>
</html>"""
]

out_path = Path(__file__).parent / "part6_handbook.js"
out_path.write_text("\n".join(js_lines), encoding="utf-8")
print(f"Generated {out_path} ({len(out_path.read_text(encoding='utf-8'))} bytes)")
