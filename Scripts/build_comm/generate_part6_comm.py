import json
from pathlib import Path
from hb_diagrams_comm import DIAGRAMS

HANDBOOK_TABS = [
    {
        "title": "1. Kiến Trúc & Arbitration",
        "subs": [
            {
                "label": "1.1 Vai trò ComM & Hệ sinh thái Stack",
                "swsRefs": [
                    {"id": "SWS_ComM_00875", "desc": "Phân xử nhu cầu từ Users / PNC / DCM để quyết định mode kênh"},
                    {"id": "SWS_ComM_00266", "desc": "Thông báo chuyển mode cho DCM (Dcm_ComM_*ModeEntered)"},
                    {"id": "SWS_ComM_00976", "desc": "Báo trạng thái Kênh & PNC cho BswM điều phối COM I-PDU"},
                    {"id": "SWS_ComM_00675", "desc": "Bắt tay bất đồng bộ với <Bus>SM qua ModeIndication (by-value)"},
                    {"id": "SWS_ComM_01060", "desc": "Trao đổi trực tiếp vector bit PNC (EIRA / ERA / IRA) với NmIf"},
                ],
                "html": f"""
<div class="hb-card">
  <h3>Vai Trò Trung Tâm Của ComM Trong AUTOSAR Classic System Services</h3>
  <p><b>Communication Manager (ComM)</b> đóng vai trò nhạc trưởng phân xử nhu cầu truyền thông tập trung (Mode Arbitration). Các Software Component (SWC) phía trên hoàn toàn được trừu tượng hóa khỏi loại bus vật lý (CAN, Ethernet, FlexRay, LIN) hay cơ chế ngủ/thức mạng (CanNm, UdpNm).</p>
  {DIAGRAMS["ecosystem"]}
  <table class="tbl">
    <thead><tr><th>Tầng / Module</th><th>Hướng giao tiếp</th><th>Input lấy từ đâu / Output route tới đâu</th><th>API chuẩn AUTOSAR R25-11</th></tr></thead>
    <tbody>
      <tr><td><b>SWC Users / RTE</b></td><td>Top → ComM → Top</td><td>Nhận nhu cầu từ SWC; báo ngược mode thực tế qua <code>Rte_Switch</code> khi BusSM hoàn tất.</td><td><code>ComM_RequestComMode()</code></td></tr>
      <tr><td><b>DCM</b></td><td>Diagnostic ↔ ComM</td><td>Báo phiên chẩn đoán UDS; nhận xác nhận từ ComM khi kênh vào/ra từng mode.</td><td><code>ComM_DCM_ActiveDiagnostic()</code>, <code>Dcm_ComM_FullComModeEntered()</code></td></tr>
      <tr><td><b>EcuM</b></td><td>System → ComM</td><td>Khởi tạo/hủy ComM, mở chốt <code>CommunicationAllowed</code> (Init=FALSE) &amp; báo Wakeup.</td><td><code>ComM_Init()</code>, <code>ComM_CommunicationAllowed()</code>, <code>ComM_EcuM_WakeUpIndication()</code></td></tr>
      <tr><td><b>BswM → COM</b></td><td>ComM → BswM → COM</td><td>BswM nhận trạng thái Kênh &amp; PNC từ ComM để đóng/mở nhóm I-PDU Tx/Rx trong COM.</td><td><code>BswM_ComM_CurrentMode()</code>, <code>BswM_ComM_CurrentPNCMode()</code></td></tr>
      <tr><td><b>&lt;Bus&gt;SM</b></td><td>ComM ↔ Bottom HW</td><td>Thực thi bật/tắt Controller &amp; Transceiver (trừ <code>INTERNAL</code>, SWS_ComM_00664); bắt tay by-value.</td><td><code>&lt;Bus&gt;SM_RequestComMode()</code>, <code>ComM_&lt;Bus&gt;SM_ModeIndication()</code></td></tr>
      <tr><td><b>NmIf / CanNm</b></td><td>ComM ↔ Network Mgmt</td><td>Điều phối bản tin NM &amp; trao đổi trực tiếp các bit vector PNC (EIRA / ERA / IRA / SyncShutdown).</td><td><code>Nm_NetworkRequest()</code>, <code>Nm_UpdateIRA()</code>, <code>ComM_Nm_UpdateEIRA()</code></td></tr>
    </tbody>
  </table>
</div>"""
            },
            {
                "label": "1.2 Phân xử Đa User (OR Arbitration)",
                "swsRefs": [
                    {"id": "SWS_ComM_00110", "desc": "ComM_RequestComMode(User, ComMode) lưu nhu cầu từng User"},
                    {"id": "SWS_ComM_00875", "desc": "Phân xử Highest Requested Mode (OR logic đa User / PNC / DCM)"},
                    {"id": "SWS_ComM_00867", "desc": "Giữ COMM_FULL_COMMUNICATION khi còn ít nhất 1 chủ thể xin"},
                    {"id": "SWS_ComM_00868", "desc": "Chỉ hạ về COMM_NO_COMMUNICATION khi toàn bộ đã release"},
                    {"id": "SWS_ComM_00929", "desc": "Ánh xạ N:M giữa ComMUser, ComMPnc và các ComMChannel"},
                ],
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
                "swsRefs": [
                    {"id": "SWS_ComM_00675", "desc": "ComM_<Bus>SM_ModeIndication(Ch, ComMode) truyền giá trị (by-value)"},
                    {"id": "SWS_ComM_00828", "desc": "<Bus>SM_RequestComMode() điều khiển Controller / Transceiver"},
                    {"id": "SWS_ComM_00073", "desc": "Chỉ cập nhật Rte_Switch lên User khi chế độ thực sự đạt chuẩn"},
                    {"id": "SWS_ComM_00664", "desc": "Kênh COMM_BUS_TYPE_INTERNAL bỏ qua <Bus>SM, chuyển tức thì"},
                ],
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
      <tr><td>3. CanSM gọi ModeIndication</td><td><code>COMM_FULL_COM_NETWORK_REQUESTED</code></td><td><code>COMM_FULL_COMMUNICATION</code> confirmed!</td><td>Bật Bit 1 <code>BUSSM = 1</code> → báo <code>BswM_ComM_CurrentMode()</code>, <code>Dcm_ComM_FullComModeEntered()</code> &amp; <code>Rte_Switch(FULL)</code>.</td></tr>
    </tbody>
  </table>
</div>"""
            },
            {
                "label": "1.4 Synchronous WakeUp Đa Kênh",
                "swsRefs": [
                    {"id": "ECUC_ComM_00695", "desc": "Tham số ComMSynchronousWakeUp bật/tắt đánh thức đồng loạt"},
                    {"id": "SWS_ComM_00694", "desc": "Đánh thức tất cả kênh sang NO_COM_REQUEST_PENDING khi có Wakeup"},
                    {"id": "SWS_ComM_01063", "desc": "Đồng bộ đánh thức kênh kèm PNC từ ComM_EcuM_WakeUpIndication"},
                    {"id": "SWS_ComM_01064", "desc": "ComM_EcuM_PNCWakeUpIndication(PNC) đánh thức các kênh map PNC"},
                ],
                "html": f"""
<div class="hb-card">
  <h3>Cơ Chế ComMSynchronousWakeUp &amp; EcuM Wakeup Interaction</h3>
  <p>Trên các ECU có từ 2 kênh mạng trở lên, tham số <code>ComMSynchronousWakeUp</code> (<code>ECUC_ComM_00695</code>, <code>SWS_ComM_00694</code>, <code>SWS_ComM_01063</code>) quyết định xem một sự kiện đánh thức trên 1 kênh có đồng thời kéo các kênh khác ra khỏi giấc ngủ hay không.</p>
  {DIAGRAMS["syncwake"]}
  <ul>
    <li><b>ComMSynchronousWakeUp = TRUE:</b> Một lời gọi <code>ComM_EcuM_WakeUpIndication(Ch0)</code> (hoặc <code>ComM_EcuM_PNCWakeUpIndication</code>) tự động đưa các kênh khác sang <code>COMM_NO_COM_REQUEST_PENDING</code>.</li>
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
                "swsRefs": [
                    {"id": "SWS_ComM_00879", "desc": "Chế độ COMM_NO_COMMUNICATION và 2 sub-states nội bộ"},
                    {"id": "SWS_ComM_00880", "desc": "Chế độ COMM_FULL_COMMUNICATION (NETWORK_REQUESTED / READY_SLEEP)"},
                    {"id": "SWS_ComM_00881", "desc": "Chế độ COMM_SILENT_COMMUNICATION (chỉ Rx, cấm phát Tx)"},
                    {"id": "SWS_ComM_00674", "desc": "Định nghĩa kiểu ComM_StateType gồm 5 sub-states chuẩn"},
                    {"id": "SWS_ComM_00665", "desc": "Passive Wakeup qua NETWORK_REQUESTED (Nm_PassiveStartUp) -> READY_SLEEP"},
                ],
                "html": f"""
<div class="hb-card">
  <h3>Máy Trạng Thái 2 Cấp Của Kênh ComM (SWS_ComM_00879..00881 &amp; 00674)</h3>
  <p>ComM định nghĩa 3 chế độ lớn (<code>ComM_ModeType</code>) giao tiếp ra ngoài và 5 trạng thái con nội bộ (<code>ComM_StateType</code>, <code>SWS_ComM_00674</code>) để điều phối chính xác từng pha quá độ với Nm, BusSM và EcuM.</p>
  {DIAGRAMS["ch_sm"]}
  <table class="tbl">
    <thead><tr><th>Mode Lớn</th><th>Sub-State (SWS_ComM_00674)</th><th>Điều kiện kích hoạt &amp; Hành vi bus</th></tr></thead>
    <tbody>
      <tr><td><code>NO_COM</code> (<code>00879</code>)</td><td><code>COMM_NO_COM_NO_PENDING_REQUEST</code></td><td>Ngủ hoàn toàn sau <code>ComM_Init()</code> (với <code>CommunicationAllowed = FALSE</code>, <code>00884</code>), không có request chờ.</td></tr>
      <tr><td><code>NO_COM</code> (<code>00879</code>)</td><td><code>COMM_NO_COM_REQUEST_PENDING</code></td><td>Đã có User hoặc Passive Wakeup nhưng đang bị chốt <code>CommunicationAllowed == FALSE</code> giữ lại (<code>00895</code>).</td></tr>
      <tr><td><code>FULL_COM</code> (<code>00880</code>)</td><td><code>COMM_FULL_COM_NETWORK_REQUESTED</code></td><td>Mọi đường thức từ <code>NO_COM</code> ĐỀU quá cảnh qua đây: User/DCM (gọi <code>Nm_NetworkRequest</code>) hoặc Passive Wakeup (gọi <code>Nm_PassiveStartUp</code> rồi qua READY_SLEEP, <code>00665/00888</code>).</td></tr>
      <tr><td><code>FULL_COM</code> (<code>00880</code>)</td><td><code>COMM_FULL_COM_READY_SLEEP</code></td><td>Mọi chủ thể đã release hoặc vừa quá cảnh từ Passive Wakeup; gọi <code>Nm_NetworkRelease()</code> (FULL) hoặc chạy <code>NmLightTimeout</code> (LIGHT).</td></tr>
      <tr><td><code>SILENT_COM</code> (<code>00881</code>)</td><td><code>COMM_SILENT_COM</code></td><td>Chỉ dùng cho FULL/PASSIVE khi CanNm vào <code>PrepareBusSleepMode</code>: Chỉ nhận (Rx). Khi thoát lên FULL_COM từ đây, <b>BỎ QUA <code>CommunicationAllowed</code></b> (<code>SWS_ComM_00896</code>)!</td></tr>
    </tbody>
  </table>
</div>"""
            },
            {
                "label": "2.2 So sánh 6 Biến Thể NM (R25-11 Table 7.3)",
                "swsRefs": [
                    {"id": "ECUC_ComM_00568", "desc": "ComMNmVariant: FULL | LIGHT | PASSIVE | SLAVE_ACTIVE | SLAVE_PASSIVE | NONE"},
                    {"id": "SWS_ComM_00599", "desc": "Bảng đặc tính giữ mạng & đồng bộ tắt theo từng biến thể NM"},
                    {"id": "SWS_ComM_00667", "desc": "Biến thể PASSIVE bị cấm gọi Nm_NetworkRequest() chủ động"},
                    {"id": "SWS_ComM_01017", "desc": "Biến thể SLAVE_ACTIVE / SLAVE_PASSIVE phục vụ kênh không NM"},
                    {"id": "SWS_ComM_01018", "desc": "Kênh Slave nhận ComM_<Bus>SM_BusSleepMode() để xuống NO_COM"},
                ],
                "html": f"""
<div class="hb-card">
  <h3>Chiến Lược Quản Lý Mạng ComMNmVariant (FULL / LIGHT / PASSIVE / SLAVE_* / NONE)</h3>
  {DIAGRAMS["variants"]}
  <table class="tbl">
    <thead><tr><th>Đặc điểm kỹ thuật</th><th>FULL</th><th>LIGHT</th><th>PASSIVE</th><th>SLAVE_ACTIVE</th><th>SLAVE_PASSIVE</th><th>NONE</th></tr></thead>
    <tbody>
      <tr><td>Giao tiếp Nm / CanNm</td><td>Có (Tx/Rx NM)</td><td>Không</td><td>Chỉ nghe Rx NM</td><td>Không</td><td>Không</td><td>Không</td></tr>
      <tr><td>SWC / DCM đòi chủ động</td><td>Có</td><td>Có</td><td><b>Không</b></td><td>Có</td><td><b>Không</b></td><td>Có</td></tr>
      <tr><td>Dùng <code>TMinFullCom</code></td><td>Không</td><td><b>Có</b></td><td>Không</td><td>Không</td><td>Không</td><td><b>Có</b></td></tr>
      <tr><td>Dùng <code>NmLightTimeout</code></td><td>Không</td><td><b>Có</b></td><td>Không</td><td>Không</td><td>Không</td><td>Không</td></tr>
      <tr><td>Có <code>SILENT_COM</code></td><td><b>Có</b></td><td>Không</td><td><b>Có</b></td><td>Không</td><td>Không</td><td>Không</td></tr>
      <tr><td>Hành vi khi hết yêu cầu</td><td><code>Nm_NetworkRelease()</code> chờ CanNm</td><td>Hết <code>NmLightTimeout</code> → <code>NO_COM</code></td><td>Nhả ngay về <code>READY_SLEEP</code></td><td>Đợi <code>ComM_&lt;Bus&gt;SM_BusSleepMode()</code></td><td>Đợi <code>BusSM_BusSleepMode()</code></td><td><b>Bus vật lý:</b> dừng ở <code>READY_SLEEP</code> (<code>00889</code>)<br><b>INTERNAL:</b> về <code>NO_COM</code> (<code>00664</code>)</td></tr>
    </tbody>
  </table>
</div>"""
            },
            {
                "label": "2.3 Gatekeeper CommunicationAllowed & Pending",
                "swsRefs": [
                    {"id": "SWS_ComM_00884", "desc": "Khởi tạo mặc định CommunicationAllowed = FALSE trên mọi kênh"},
                    {"id": "SWS_ComM_00895", "desc": "Giữ tại NO_COM_REQUEST_PENDING khi CommunicationAllowed == FALSE"},
                    {"id": "SWS_ComM_00871", "desc": "API ComM_CommunicationAllowed(Ch, Allowed) mở chốt sang FULL_COM"},
                    {"id": "SWS_ComM_00896", "desc": "Khi đang ở COMM_SILENT_COM, ComM bỏ qua cờ CommunicationAllowed"},
                ],
                "html": f"""
<div class="hb-card">
  <h3>Chốt Chặn An Toàn Khởi Động: ComM_CommunicationAllowed()</h3>
  <p>Ngay sau <code>ComM_Init()</code>, cờ <code>CommunicationAllowed</code> mặc định bằng <b><code>FALSE</code></b> trên mọi kênh (<code>SWS_ComM_00884</code>). Chốt này đảm bảo không có frame nào lọt xuống transceiver trước khi ECU sẵn sàng.</p>
  {DIAGRAMS["gatekeeper"]}
  <ul>
    <li><b>SWS_ComM_00895:</b> Khi kênh ở <code>NO_COM</code> và <code>Allowed == FALSE</code>, mọi yêu cầu/wakeup đều đỗ tại <code>COMM_NO_COM_REQUEST_PENDING</code> (Bit 5 <code>WAKEUP_PEND = 1</code>).</li>
    <li><b>SWS_ComM_00896 (Ngoại lệ quan trọng):</b> Khi kênh đang ở <code>COMM_SILENT_COM</code>, <code>CommunicationAllowed</code> được BỎ QUA — nếu User/DCM đòi <code>FULL_COM</code> (hoặc CanNm gọi <code>ComM_Nm_NetworkMode()</code>, <code>00296</code>), kênh chuyển thẳng về <code>FULL_COM</code> ngay!</li>
    <li>Ngay khi EcuM/BswM gọi <code>ComM_CommunicationAllowed(Ch, TRUE)</code>, ở chu kỳ kế tiếp kênh chuyển sang <code>FULL_COM_NETWORK_REQUESTED</code> mà SWC không cần gọi lại API!</li>
  </ul>
</div>"""
            },
            {
                "label": "2.4 Graceful Shutdown & Bộ Đếm Thời Gian",
                "swsRefs": [
                    {"id": "ECUC_ComM_00557", "desc": "Timer ComMTMinFullComModeDuration cho biến thể LIGHT / NONE"},
                    {"id": "SWS_ComM_00886", "desc": "Khởi chạy TMinFull khi vào COMM_FULL_COM_NETWORK_REQUESTED"},
                    {"id": "SWS_ComM_00889", "desc": "Hết TMinFull & hết User -> READY_SLEEP (NONE vật lý dừng ở đây)"},
                    {"id": "SWS_ComM_00891", "desc": "ComMNmLightTimeout (ECUC_ComM_00606) đưa LIGHT thẳng về NO_COM"},
                    {"id": "SWS_ComM_00296", "desc": "ComM_Nm_NetworkMode() kéo từ SILENT_COM về FULL_COM_READY_SLEEP"},
                ],
                "html": f"""
<div class="hb-card">
  <h3>Quy Trình Tắt Mạng Êm Dịu &amp; Sự Khác Biệt Giữa Các Biến Thể</h3>
  {DIAGRAMS["shutdown"]}
  <ul>
    <li><b>Với biến thể FULL:</b> ComM gọi <code>Nm_NetworkRelease()</code>, sau đó nghe callback từ CanNm: <code>ComM_Nm_PrepareBusSleepMode()</code> (sang <code>SILENT_COM</code>), <code>ComM_Nm_BusSleepMode()</code> (về <code>NO_COM</code>), hoặc <code>ComM_Nm_NetworkMode()</code> (quay lại <code>FULL_COM_READY_SLEEP</code>, <code>00296</code>).</li>
    <li><b>Với biến thể LIGHT:</b> <code>TMinFullComModeDuration</code> bảo vệ kênh trong <code>NETWORK_REQUESTED</code> (bị hủy ngay nếu Limit NO_COM, <code>00890</code>); sau đó <code>NmLightTimeout</code> đếm ngược ở <code>READY_SLEEP</code> để về thẳng <code>NO_COM</code>.</li>
    <li><b>Với biến thể NONE:</b> Nếu là kênh <code>COMM_BUS_TYPE_INTERNAL</code>, hết TMin sẽ tắt thẳng xuống <code>NO_COM</code>; nhưng nếu là bus vật lý (CAN/ETH/LIN), theo <code>SWS_ComM_00889</code> kênh giữ tại <code>READY_SLEEP</code> cho đến khi có Limit NO_COM.</li>
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
                "swsRefs": [
                    {"id": "SWS_ComM_00669", "desc": "Bitmask ComM_InhibitionStatusType: Bit 0 NoWakeup | Bit 1 LimitToNoCom"},
                    {"id": "SWS_ComM_00218", "desc": "ComM_PreventWakeUp(TRUE) chặn User đánh thức từ NO_COM / SILENT_COM"},
                    {"id": "SWS_ComM_00219", "desc": "PreventWakeUp không chặn request nếu kênh đã ở FULL_COM"},
                    {"id": "SWS_ComM_00839", "desc": "Yêu cầu bị chặn bởi PreventWakeUp vẫn được lưu để tự bật khi gỡ"},
                    {"id": "SWS_ComM_00582", "desc": "LimitToNoCom (00215) hủy TMinFull (00890) & xóa sạch User Req"},
                ],
                "html": f"""
<div class="hb-card">
  <h3>Phân Biệt Hai Cơ Chế Mode Inhibition (SWS_ComM_00669)</h3>
  <p>ComM cung cấp chuẩn dữ liệu <code>ComM_InhibitionStatusType</code> (uint8) với 2 bit cốt lõi (ánh xạ trực tiếp vào Bit 0 và Bit 1 của Thanh B trong trình mô phỏng):</p>
  {DIAGRAMS["inhib"]}
  <table class="tbl">
    <thead><tr><th>Bit</th><th>Tên API / Tham số</th><th>Trạng thái bị ảnh hưởng</th><th>Hành vi chuẩn AUTOSAR</th></tr></thead>
    <tbody>
      <tr><td><b>Bit 0 (0x01)</b></td><td><code>ComM_PreventWakeUp(Ch, TRUE)</code> / <code>ComMNoWakeup</code></td><td><code>NO_COM</code> hoặc <code>SILENT_COM</code></td><td>Chặn User đánh thức bus (trả <code>COMM_E_MODE_LIMITATION</code>, <b>VẪN GIỮ</b> User Req, <code>00839</code>). KHÔNG chặn Passive Wakeup và bỏ qua nếu đã ở <code>FULL_COM</code> (<code>00219</code>).</td></tr>
      <tr><td><b>Bit 1 (0x02)</b></td><td><code>ComM_LimitChannelToNoComMode(Ch, TRUE)</code> / <code>LimitECUToNoComMode</code></td><td>Mọi trạng thái (kể cả <code>FULL_COM</code>)</td><td>Hủy <code>TMinFull</code> ngay (<code>00890</code>), <b>XÓA sạch</b> User Req về <code>NO_COM</code> (<code>00582</code>) và gọi <code>Nm_NetworkRelease()</code> (trừ khi có DCM).</td></tr>
    </tbody>
  </table>
</div>"""
            },
            {
                "label": "3.2 Bảng Chân Trị ECU Group Classification",
                "swsRefs": [
                    {"id": "ECUC_ComM_00563", "desc": "Tham số cấu hình mặt nạ ComMEcuGroupClassification"},
                    {"id": "SWS_ComM_01102", "desc": "Kiểm soát quyền gọi API PreventWakeUp() (Bit 0 = 0 -> E_NOT_OK)"},
                    {"id": "SWS_ComM_01103", "desc": "Kiểm soát quyền gọi LimitChannel/ECUToNoComMode() (Bit 1 = 0 -> E_NOT_OK)"},
                    {"id": "SWS_ComM_01104", "desc": "Lưu trữ bền vững ComMEcuGroupClassification vào NvM (ECUC_ComM_00902)"},
                ],
                "html": f"""
<div class="hb-card">
  <h3>Mặt Nạ Kiểm Soát Gọi API: ComMEcuGroupClassification (SWS_ComM_01102 / 01103)</h3>
  <p><code>ComMEcuGroupClassification</code> quy định việc gọi API <code>ComM_PreventWakeUp()</code> hay <code>ComM_LimitChannel/ECUToNoComMode()</code> có được chấp nhận (<code>E_OK</code>) hay bị từ chối (<code>E_NOT_OK</code>). Lưu ý chuẩn R25-11: Đổi Classification không tự tắt các cờ đã bật trước đó!</p>
  {DIAGRAMS["mask_truth"]}
  <table class="tbl">
    <thead><tr><th>Giá trị Classification (Hex / Bin)</th><th>Bit 0 (PreventWakeUp API)</th><th>Bit 1 (LimitToNoCom API)</th><th>Kết quả khi gọi Runtime API (SWS_ComM_01102 / 01103)</th></tr></thead>
    <tbody>
      <tr><td><code>0x00</code> (<code>0b00</code>)</td><td>0 (Disabled)</td><td>0 (Disabled)</td><td>Từ chối mọi API PreventWakeUp / LimitToNoCom mới (trả <code>E_NOT_OK</code>).</td></tr>
      <tr><td><code>0x01</code> (<code>0b01</code>)</td><td>1 (Enabled)</td><td>0 (Disabled)</td><td>Cho gọi <code>PreventWakeUp</code> (<code>E_OK</code>); từ chối gọi <code>LimitChannel/ECUToNoComMode</code> (<code>E_NOT_OK</code>).</td></tr>
      <tr><td><code>0x02</code> (<code>0b10</code>)</td><td>0 (Disabled)</td><td>1 (Enabled)</td><td>Cho gọi <code>LimitToNoCom</code> (<code>E_OK</code>); từ chối gọi <code>PreventWakeUp</code> (<code>E_NOT_OK</code>).</td></tr>
      <tr><td><code>0x03</code> (<code>0b11</code>)</td><td>1 (Enabled)</td><td>1 (Enabled)</td><td><b>Cả hai nhóm API đều hoạt động đầy đủ</b> (cấu hình mặc định khuyến nghị).</td></tr>
    </tbody>
  </table>
</div>"""
            },
            {
                "label": "3.3 InhibitCounter & Lưu Trữ Bền Vững NvM",
                "swsRefs": [
                    {"id": "SWS_ComM_91027", "desc": "Trả mã lỗi COMM_E_MODE_LIMITATION khi request bị ức chế"},
                    {"id": "SWS_ComM_00141", "desc": "Tăng ComMInhibitCounter mỗi lần từ chối User Request (00140)"},
                    {"id": "SWS_ComM_00142", "desc": "Bão hòa counter ở giá trị cực đại 65535 (uint16)"},
                    {"id": "ECUC_ComM_00789", "desc": "ComMNoWakeUpInhibitionNvmStorage lưu cờ NoWakeup xuống NvM (SWS_ComM_00157)"},
                    {"id": "SWS_ComM_00865", "desc": "Ghi đồng bộ dữ liệu NvM khi ComM_DeInit() tắt hẳn"},
                ],
                "html": f"""
<div class="hb-card">
  <h3>Cơ Chế Đếm Từ Chối (ComMInhibitCounter) &amp; Quản Lý NvM</h3>
  <p>Để kỹ sư chẩn đoán/OEM biết được có bao nhiêu lần ứng dụng cố gắng đòi truyền thông khi đang bị Mode Inhibition từ chối (<code>COMM_E_MODE_LIMITATION</code>, <code>SWS_ComM_91027</code>), ComM duy trì bộ đếm <code>uint16 ComMInhibitCounter</code>:</p>
  {DIAGRAMS["nvm_counter"]}
  <ul>
    <li>Mỗi khi <code>ComM_RequestComMode(User, FULL_COM)</code> bị từ chối bởi Bit 0 hoặc Bit 1 Inhibition, ComM tăng counter thêm 1 (bão hòa tại <code>65535</code>, <code>SWS_ComM_00142</code>) và gọi <code>NvM_SetRamBlockStatus(BlockId, TRUE)</code>.</li>
    <li>Nếu cấu hình <code>ComMNoWakeUpInhibitionNvmStorage = TRUE</code> (<code>ECUC_ComM_00789</code>, <code>SWS_ComM_00157</code>), cờ <code>ComMNoWakeup</code> cũng được lưu NvM qua chu kỳ tắt nguồn; khi <code>ComM_DeInit()</code> ghi qua <code>NvM_WriteBlock()</code> (<code>SWS_ComM_00865</code>).</li>
    <li>Ứng dụng đọc giá trị qua <code>ComM_ReadInhibitCounter(&amp;Counter)</code> và xóa về 0 qua <code>ComM_ResetInhibitCounter()</code>.</li>
  </ul>
</div>"""
            },
            {
                "label": "3.4 Quyền Tối Cao DCM ActiveDiagnostic",
                "swsRefs": [
                    {"id": "SWS_ComM_00873", "desc": "ComM_DCM_ActiveDiagnostic(Ch) bật quyền ưu tiên UDS tối cao"},
                    {"id": "SWS_ComM_00874", "desc": "ComM_DCM_InactiveDiagnostic(Ch) nhả quyền chẩn đoán về Arbitration"},
                    {"id": "SWS_ComM_00303", "desc": "Vượt qua mọi Mode Inhibition (trừ biến thể PASSIVE / SLAVE_PASSIVE)"},
                    {"id": "SWS_ComM_00866", "desc": "Giữ kênh trong COMM_FULL_COM_NETWORK_REQUESTED suốt phiên chẩn đoán"},
                ],
                "html": f"""
<div class="hb-card">
  <h3>Thứ Tự Ưu Tiên Tuyệt Đối Của Chẩn Đoán UDS (SWS_ComM_00873 / 00866)</h3>
  <p>Khi kỹ thuật viên cắm máy chẩn đoán OBD/DoIP để đọc lỗi DTC hoặc nạp Flash phần mềm ECU, quá trình này tuyệt đối không được phép bị ngắt ngang bởi chế độ tiết kiệm pin (Mode Inhibition).</p>
  {DIAGRAMS["dcm_priority"]}
  <ul>
    <li><b>1. ComM_DCM_ActiveDiagnostic(Channel):</b> Vượt qua mọi cờ <code>PreventWakeUp</code>, <code>LimitChannelToNoComMode</code> và <code>LimitECUToNoComMode</code>. Đẩy kênh ngay vào <code>COMM_FULL_COM_NETWORK_REQUESTED</code> và báo ngược <code>Dcm_ComM_FullComModeEntered()</code> / <code>Silent</code> / <code>NoComModeEntered()</code> (<code>SWS_ComM_00266</code>).</li>
    <li><b>2. Lưu ý Passive Channels:</b> Kênh <code>PASSIVE</code> và <code>SLAVE_PASSIVE</code> bỏ qua lời gọi <code>ActiveDiagnostic</code> vì chỉ hoạt động thụ động theo bus.</li>
    <li><b>3. ComM_DCM_InactiveDiagnostic(Channel):</b> Khi hết phiên S3 chẩn đoán, DCM trả lại quyền phân xử; nếu <code>LimitToNoCom</code> đang bật, kênh ngay lập tức nhả mạng đi ngủ.</li>
  </ul>
</div>"""
            },
        ],
    },
    {
        "title": "4. Partial Net (PNC & GW)",
        "subs": [
            {
                "label": "4.1 Giải Phẫu Bit Vector PNC (SWS_ComM_00825)",
                "swsRefs": [
                    {"id": "ECUC_ComM_00839", "desc": "Công tắc tổng ComMPncSupport bật tính năng PNC (SWS_ComM_00910 / 00911)"},
                    {"id": "ECUC_ComM_00843", "desc": "Container ComMPnc & ComMPncId (ECUC_ComM_00874)"},
                    {"id": "SWS_ComM_00825", "desc": "Công thức tính ByteIndex & BitMask cho từng PNC ID trong vector"},
                    {"id": "SWS_ComM_00929", "desc": "Liên kết ComMChannelPerPnc (ECUC_ComM_00880) & ComMUserPerPnc (00932)"},
                ],
                "html": f"""
<div class="hb-card">
  <h3>Bản Chất Partial Networking Cluster (PNC) &amp; Khung NM PDU</h3>
  <p>Partial Networking cho phép chỉ đánh thức một nhóm ECU phục vụ một chức năng cụ thể (ví dụ cụm sạc pin hoặc khóa cửa) trên cùng một dây bus vật lý trong khi các ECU không liên quan tự đóng bộ thu phát đi ngủ.</p>
  {DIAGRAMS["pnc_vec"]}
  <ul>
    <li>Mỗi cụm PNC có 1 ID (ví dụ PNC #16, PNC #18). Theo <code>SWS_ComM_00825</code>, vị trí trong vector bit PNC được tính bằng <code>ByteIndex = (PncId / 8) - StartOffset</code> (với offset 2 byte đầu của CanNm PDU: Byte 2 → index 0) và <code>BitMask = 1 &lt;&lt; (PncId % 8)</code>.</li>
    <li>Bit = 1 nghĩa là cụm PNC đó đang được yêu cầu duy trì kết nối trên bus.</li>
  </ul>
</div>"""
            },
            {
                "label": "4.2 Máy Trạng Thái PNC 4 Bước (SWS_ComM_00909)",
                "swsRefs": [
                    {"id": "SWS_ComM_00909", "desc": "4 trạng thái PNC SM: NO_COM, REQUESTED, READY_SLEEP, PREPARE_SLEEP"},
                    {"id": "SWS_ComM_00978", "desc": "Chuyển pha PNC do ComM_RequestComMode() thực thi trong ComM_MainFunction"},
                    {"id": "SWS_ComM_01069", "desc": "Chỉ khi ở COMM_PNC_REQUESTED (01086), PNC mới xin FULL_COM trên kênh map"},
                    {"id": "SWS_ComM_00938", "desc": "Rời COMM_PNC_REQUESTED luôn chuyển sang COMM_PNC_READY_SLEEP trước"},
                    {"id": "SWS_ComM_00952", "desc": "Đếm ComMPncPrepareSleepTimer (ECUC_ComM_00841) ở PREPARE_SLEEP (00947)"},
                ],
                "html": f"""
<div class="hb-card">
  <h3>Chuyển Pha Chính Xác Của Máy Trạng Thái PNC (R25-11)</h3>
  {DIAGRAMS["pnc_sm"]}
  <table class="tbl">
    <thead><tr><th>Trạng thái PNC</th><th>Tx IRA (Nm_UpdateIRA)</th><th>Tác động lên kênh vật lý &amp; Quy tắc chuyển pha</th></tr></thead>
    <tbody>
      <tr><td><code>COMM_PNC_NO_COMMUNICATION</code></td><td><b>0</b></td><td>Không yêu cầu kênh; BswM tắt các I-PDU Group thuộc PNC này.</td></tr>
      <tr><td><code>COMM_PNC_REQUESTED</code></td><td><b>1</b> (Gọi <code>Nm_UpdateIRA()</code>)</td><td>User (xử lý trong <code>MainFunction</code>, <code>SWS_ComM_00978</code>) hoặc Gateway ACTIVE yêu cầu → phát bit=1 và CHỈ xin <code>FULL_COM</code> trên kênh trong trạng thái này (<code>SWS_ComM_01069</code>).</td></tr>
      <tr><td><code>COMM_PNC_READY_SLEEP</code></td><td><b>0</b> (Xóa IRA=0 &amp; nhả kênh)</td><td>Mọi chuyển pha rời <code>REQUESTED</code> PHẢI qua đây trước (<code>SWS_ComM_00938</code>). Giữ ở đây nếu <code>Rx EIRA = 1</code> từ <code>NmIf</code>; nếu EIRA = 0 chuyển tiếp xuống PREPARE_SLEEP.</td></tr>
      <tr><td><code>COMM_PNC_PREPARE_SLEEP</code></td><td><b>0</b></td><td>Chạy <code>ComMPncPrepareSleepTimer</code> trước khi tắt hẳn (<code>SWS_ComM_00952</code>).</td></tr>
    </tbody>
  </table>
</div>"""
            },
            {
                "label": "4.3 EIRA / ERA / IRA Giữa NmIf ↔ ComM",
                "swsRefs": [
                    {"id": "SWS_ComM_01060", "desc": "ComM_Nm_UpdateEIRA() đẩy vector EIRA trực tiếp từ NmIf sang READY_SLEEP (00940)"},
                    {"id": "SWS_ComM_01061", "desc": "ComM_Nm_UpdateERA(Channel) báo External Request từng kênh cho Gateway"},
                    {"id": "SWS_ComM_01062", "desc": "Nm_UpdateIRA(Channel, IRA) truyền yêu cầu PNC từ ComM xuống NmIf"},
                    {"id": "SWS_ComM_00980", "desc": "ComMPncNmRequest (ECUC_ComM_00886) gọi Nm_NetworkRequest khi PNC vào REQUESTED"},
                    {"id": "SWS_ComM_01067", "desc": "ComMPncWakeupSleepRequestEnabled (ECUC_ComM_00899) điều phối thức/ngủ BswM PNC"},
                ],
                "html": f"""
<div class="hb-card">
  <h3>Phân Biệt Vector EIRA, ERA Và IRA Trong AUTOSAR NmIf ↔ ComM (R25-11)</h3>
  {DIAGRAMS["eira_era"]}
  <table class="tbl">
    <thead><tr><th>Tiêu chí</th><th>EIRA (External &amp; Internal Request Array)</th><th>ERA (External Request Array)</th><th>IRA (Internal Request Array)</th></tr></thead>
    <tbody>
      <tr><td>Hướng &amp; Module giao tiếp</td><td><b>NmIf → ComM</b> (R25-11 bỏ trung gian COM!)</td><td><b>NmIf → ComM</b> theo từng kênh</td><td><b>ComM → NmIf</b> theo từng kênh</td></tr>
      <tr><td>Mục đích sử dụng</td><td>Tổng hợp ngoài+nội bộ để giữ PNC tại <code>COMM_PNC_READY_SLEEP</code>.</td><td>Đầu vào cho <b>PNC Gateway (GW Routing)</b> chuyển tiếp sang bus khác chống loop.</td><td>Tổng hợp User nội bộ + GW ERA rồi truyền xuống Nm phát gói NM.</td></tr>
      <tr><td>API chuẩn R25-11</td><td><code>ComM_Nm_UpdateEIRA()</code> (<code>01060</code>)</td><td><code>ComM_Nm_UpdateERA(Ch)</code> (<code>01061</code>)</td><td><code>Nm_UpdateIRA(Ch, IRA)</code> (<code>01062</code>)</td></tr>
    </tbody>
  </table>
</div>"""
            },
            {
                "label": "4.4 PNC Gateway (ACTIVE / PASSIVE) & Sync Shutdown",
                "swsRefs": [
                    {"id": "ECUC_ComM_00887", "desc": "Bật tính năng PNC Gateway (SWS_ComM_01066 / SWS_ComM_01072)"},
                    {"id": "ECUC_ComM_00842", "desc": "Vai trò kênh ComMPncGatewayType: ACTIVE | PASSIVE | NONE"},
                    {"id": "SWS_ComM_01079", "desc": "Chống routing loop: cấm định tuyến ERA từ PASSIVE -> PASSIVE"},
                    {"id": "SWS_ComM_01083", "desc": "Top-Level Coordinator gọi Nm_RequestSynchronizedPncShutdown() (ECUC_ComM_00897)"},
                    {"id": "SWS_ComM_01082", "desc": "Intermediate GW chuyển tiếp qua ComM_Nm_ForwardSynchronizedPncShutdown() (91030)"},
                ],
                "html": f"""
<div class="hb-card">
  <h3>Định Tuyến PNC Đa Kênh, Chống Loop &amp; Synchronized Shutdown (R25-11)</h3>
  {DIAGRAMS["pnc_gw"]}
  <ul>
    <li><b>Kênh ACTIVE Gateway:</b> Nhận ERA từ <code>ComM_Nm_UpdateERA</code> và tính <code>Nm_UpdateIRA</code> sang TẤT CẢ các kênh ACTIVE và PASSIVE khác (<code>SWS_ComM_01072</code>).</li>
    <li><b>Kênh PASSIVE Gateway:</b> Chỉ được phép chuyển tiếp ERA tới các kênh <code>ACTIVE</code> — <b>tuyệt đối cấm định tuyến sang một kênh PASSIVE khác</b> (<code>SWS_ComM_01079</code>) để tránh routing loop giữa các mạng con.</li>
    <li><b>Synchronized PNC Shutdown:</b> Top-Level Coordinator gọi <code>Nm_RequestSynchronizedPncShutdown()</code> mỗi khi release PNC (<code>SWS_ComM_01083</code>). Intermediate Gateway nhận <code>ComM_Nm_ForwardSynchronizedPncShutdown()</code> trên kênh ACTIVE để forward xuống kênh PASSIVE (<code>SWS_ComM_01082 / 91030</code>).</li>
  </ul>
</div>"""
            },
        ],
    },
    {
        "title": "5. Cấu Hình ECUC & Chuẩn API",
        "subs": [
            {
                "label": "5.1 Kiến Trúc Tham Số ECUC ComM (R25-11)",
                "swsRefs": [
                    {"id": "ECUC_ComM_00554", "desc": "Container ComMGeneral chứa công tắc và thông số toàn ECU"},
                    {"id": "ECUC_ComM_00565", "desc": "Container ComMChannel cấu hình từng bus (00567, 00635, 00556)"},
                    {"id": "ECUC_ComM_00607", "desc": "Container ComMNetworkManagement (NmVariant, NmLightTimeout, PncNmRequest)"},
                    {"id": "ECUC_ComM_00843", "desc": "Container ComMPnc cấu hình PNC ID, kênh và User liên kết"},
                ],
                "html": f"""
<div class="hb-card">
  <h3>Phân Nhóm Tham Số Cấu Hình AUTOSAR ECUC ComM</h3>
  {DIAGRAMS["ecuc_tree"]}
  <table class="tbl">
    <thead><tr><th>Container ECUC</th><th>Các tham số cốt lõi (ECUC_ComM_*)</th><th>Ý nghĩa thiết kế &amp; Ràng buộc</th></tr></thead>
    <tbody>
      <tr><td><code>ComMGeneral</code></td><td><code>ComMDevErrorDetect</code>, <code>ComMVersionInfoApi</code>, <code>ComMModeLimitationEnabled</code>, <code>ComMWakeupInhibitionEnabled</code>, <code>ComMSynchronousWakeUp</code>, <code>ComMTMinFullComModeDuration</code>, <code>ComMEcuGroupClassification</code>, <code>ComMPncSupport</code>, <code>ComMPncPrepareSleepTimer</code>, <code>ComMPncGatewayEnabled</code>, <code>ComMSynchronizedPncShutdownEnabled</code></td><td>Cấu hình hành vi toàn cục cấp ECU và công tắc Pre-Compile (<code>ComM_Cfg.h</code>).</td></tr>
      <tr><td><code>ComMChannel</code></td><td><code>ComMChannelId</code>, <code>ComMBusType</code>, <code>ComMMainFunctionPeriod</code>, <code>ComMNmVariant</code> (<code>FULL|LIGHT|PASSIVE|SLAVE_ACTIVE|SLAVE_PASSIVE|NONE</code>), <code>ComMNmLightTimeout</code>, <code>ComMNoWakeUpInhibitionNvmStorage</code>, <code>ComMPncNmRequest</code>, <code>ComMPncGatewayType</code></td><td>Cấu hình riêng cho từng kênh bus ánh xạ vào bảng struct trong <code>ComM_Lcfg.c</code>.</td></tr>
      <tr><td><code>ComMUser</code></td><td><code>ComMUserIdentifier</code>, <code>ComMUserEcucPartitionRef</code>, Channel / PNC References</td><td>Định nghĩa cổng phục vụ SWC gọi <code>ComM_RequestComMode()</code>.</td></tr>
      <tr><td><code>ComMPnc</code></td><td><code>ComMPncId</code>, <code>ComMChannelPerPnc</code>, <code>ComMUserPerPnc</code>, <code>ComMPncWakeupSleepRequestEnabled</code></td><td>Định nghĩa Bit Mask (<code>SWS_ComM_00825</code>) và ánh xạ User/Kênh của từng cụm PNC.</td></tr>
    </tbody>
  </table>
</div>"""
            },
            {
                "label": "5.2 Danh Bảng Chuẩn APIs (R25-11)",
                "swsRefs": [
                    {"id": "SWS_ComM_00793", "desc": "ComM_Init() (00313) và ComM_DeInit() có guard NO_COM_NO_PENDING (00794)"},
                    {"id": "SWS_ComM_00110", "desc": "ComM_RequestComMode(), GetRequestedComMode() (00795), GetCurrentComMode() (00176)"},
                    {"id": "SWS_ComM_00675", "desc": "ComM_<Bus>SM_ModeIndication(Ch, ComMode) truyền ComMode by-value"},
                    {"id": "SWS_ComM_00429", "desc": "ComM_MainFunction_<Channel>() xử lý chu kỳ timer & PNC SM (00818)"},
                ],
                "html": """
<div class="hb-card">
  <h3>Tra Cứu Signature API Chuẩn AUTOSAR Classic (R25-11)</h3>
  <table class="tbl">
    <thead><tr><th>Nhóm API</th><th>Prototype Chuẩn</th><th>Caller / Callee &amp; Ghi chú</th></tr></thead>
    <tbody>
      <tr><td>System Init / DeInit</td><td><code>void ComM_Init(const ComM_ConfigType* ConfigPtr)</code><br><code>void ComM_DeInit(void)</code><br><code>void ComM_MainFunction_&lt;Channel&gt;(void)</code></td><td><code>Init</code> đặt <code>CommAllowed=FALSE</code> (<code>00884</code>); <code>DeInit</code> chỉ chạy khi mọi kênh ở <code>NO_COM_NO_PENDING_REQUEST</code> (<code>00794</code>).</td></tr>
      <tr><td>SWC Request</td><td><code>Std_ReturnType ComM_RequestComMode(ComM_UserHandleType User, ComM_ModeType ComMode)</code><br><code>Std_ReturnType ComM_GetCurrentComMode(ComM_UserHandleType User, ComM_ModeType* ComMode)</code></td><td>SWC qua RTE; có thể trả <code>COMM_E_MODE_LIMITATION</code> (<code>91027</code>). Chuyển pha PNC chạy trong <code>MainFunction</code> (<code>00978</code>).</td></tr>
      <tr><td>Inhibition &amp; NvM</td><td><code>Std_ReturnType ComM_PreventWakeUp(NetworkHandleType Channel, boolean Status)</code><br><code>Std_ReturnType ComM_LimitChannelToNoComMode(NetworkHandleType Channel, boolean Status)</code><br><code>Std_ReturnType ComM_LimitECUToNoComMode(boolean Status)</code><br><code>Std_ReturnType ComM_ReadInhibitCounter(uint16* CounterValue)</code></td><td>Trả <code>E_NOT_OK</code> nếu Bit Classification tương ứng = 0 (<code>01102 / 01103</code>).</td></tr>
      <tr><td>BusSM / Nm / EcuM / DCM</td><td><code>void ComM_CommunicationAllowed(NetworkHandleType Channel, boolean Allowed)</code><br><code>void ComM_&lt;Bus&gt;SM_ModeIndication(NetworkHandleType Channel, ComM_ModeType ComMode)</code><br><code>void ComM_&lt;Bus&gt;SM_BusSleepMode(NetworkHandleType Channel)</code><br><code>void ComM_Nm_NetworkMode / PrepareBusSleepMode / BusSleepMode / RestartIndication</code><br><code>void ComM_Nm_UpdateEIRA(const uint8* PncBitVectorPtr)</code><br><code>void ComM_Nm_UpdateERA(NetworkHandleType Channel, const uint8* PncBitVectorPtr)</code><br><code>void ComM_DCM_ActiveDiagnostic / InactiveDiagnostic</code></td><td>Lưu ý <code>SWS_ComM_00675</code>: <code>&lt;Bus&gt;SM_ModeIndication</code> nhận <code>ComMode</code> <b>by-value</b> (không phải con trỏ!).</td></tr>
    </tbody>
  </table>
</div>"""
            },
            {
                "label": "5.3 Cấu Trúc ComM_Cfg.h vs ComM_Lcfg.c",
                "swsRefs": [
                    {"id": "ECUC_ComM_00555", "desc": "Pre-compile switches (DevErrorDetect, VersionInfoApi 00622, ModeLimitation 00560)"},
                    {"id": "ECUC_ComM_00787", "desc": "Cấu hình kênh ComMFullCommRequestNotificationEnabled (SWS_ComM_00734)"},
                    {"id": "ECUC_ComM_00789", "desc": "Tham số ComMNoWakeUpInhibitionNvmStorage xuất vào ComM_Lcfg.c"},
                    {"id": "ECUC_ComM_00783", "desc": "Tham chiếu ComMGlobalNvMBlockDescriptor lưu RAM mirror ComM"},
                ],
                "html": """
<div class="hb-card">
  <h3>Phân Tách Dữ Liệu Pre-Compile Và Link-Time / Post-Build</h3>
  <ul>
    <li><b><code>ComM_Cfg.h</code> (Pre-Compile Switches &amp; Macros):</b> Chứa các macro <code>STD_ON / STD_OFF</code> (như <code>COMM_DEV_ERROR_DETECT</code>, <code>COMM_PNC_SUPPORT</code>, <code>COMM_MODE_LIMITATION_ENABLED</code>) nhằm loại bỏ mã nguồn chết giúp tối ưu bộ nhớ vi điều khiển.</li>
    <li><b><code>ComM_Lcfg.c / ComM_PBcfg.c</code> (Link-Time / Post-Build Tables):</b> Chứa các bảng cấu trúc hằng (<code>const ComM_ChannelConfigType[]</code>, ánh xạ <code>User → Channel</code>, ánh xạ PNC và <code>ComMNoWakeUpInhibitionNvmStorage</code>).</li>
    <li><i>Mẹo:</i> Bạn có thể bấm nút <b>"📦 Xuất ARXML / Cfg / C"</b> ngay trên thanh Header để xem live bộ code sinh ra tương ứng với cấu hình đang chỉnh!</li>
  </ul>
</div>"""
            },
            {
                "label": "5.4 Điểm Mới Từ AUTOSAR R4.x Lên R20-11 / R25-11",
                "swsRefs": [
                    {"id": "SWS_ComM_01060", "desc": "Chuyển giao tiếp PNC EIRA/ERA/IRA từ COM sang trực tiếp NmIf (01061, 01062)"},
                    {"id": "SWS_ComM_01018", "desc": "Bổ sung callback ComM_<Bus>SM_BusSleepMode() cho SLAVE_ACTIVE / SLAVE_PASSIVE"},
                    {"id": "SWS_ComM_01083", "desc": "Chuẩn hóa Synchronized PNC Shutdown trên Top-Level & Intermediate GW (01082)"},
                    {"id": "SWS_ComM_00675", "desc": "Chữ ký ComM_<Bus>SM_ModeIndication(Ch, ComMode) truyền giá trị trong R25-11"},
                ],
                "html": """
<div class="hb-card">
  <h3>Tiến Hóa Đặc Tả ComM Qua Các Phiên Bản AUTOSAR Classic</h3>
  <table class="tbl">
    <thead><tr><th>Thay đổi</th><th>AUTOSAR 4.x cũ</th><th>AUTOSAR R20-11 → R25-11</th></tr></thead>
    <tbody>
      <tr><td>Xác nhận BusSM tắt xong (Slave)</td><td>Chỉ dùng <code>ComM_BusSM_ModeIndication</code></td><td>Bổ sung callback <code>ComM_&lt;Bus&gt;SM_BusSleepMode(Channel)</code> cho biến thể <code>SLAVE_ACTIVE</code> &amp; <code>SLAVE_PASSIVE</code> (<code>01018</code>).</td></tr>
      <tr><td>Kiến trúc PNC Vector</td><td>Qua <code>AUTOSAR COM</code> (Tín hiệu PNC TX/RX cũ)</td><td>Trao đổi trực tiếp với <b><code>NmIf</code></b> qua <code>ComM_Nm_UpdateEIRA</code>, <code>ComM_Nm_UpdateERA</code>, <code>Nm_UpdateIRA</code> (<code>01060..01062</code>).</td></tr>
      <tr><td>Tắt PNC đồng bộ</td><td>Chờ hết timer NM từng node độc lập</td><td>Chuẩn hóa <code>ComMSynchronizedPncShutdownEnabled</code> cho cả Top-Level (<code>01083</code>) và Intermediate GW (<code>01082 / 91030</code>).</td></tr>
      <tr><td>Chữ ký <code>&lt;Bus&gt;SM_ModeIndication</code></td><td>Tham khảo chuẩn từng stack</td><td>Đặc tả R25-11 (<code>SWS_ComM_00675</code>): <code>ComM_&lt;Bus&gt;SM_ModeIndication(NetworkHandleType Channel, ComM_ModeType ComMode)</code> (truyền giá trị - pass-by-value).</td></tr>
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
                "swsRefs": [
                    {"id": "SWS_ComM_00234", "desc": "Phân loại chuẩn Development Errors (ModuleId = 12)"},
                    {"id": "ECUC_ComM_00555", "desc": "Công tắc Pre-Compile ComMDevErrorDetect (SWS_ComM_00858)"},
                    {"id": "SWS_ComM_00858", "desc": "Báo COMM_E_UNINIT (0x01) nếu gọi API trước ComM_Init()"},
                    {"id": "SWS_ComM_91027", "desc": "Phân biệt lỗi runtime COMM_E_MODE_LIMITATION (không bắn DET)"},
                ],
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
                "swsRefs": [
                    {"id": "SWS_ComM_00895", "desc": "Kẹt NO_COM_REQUEST_PENDING vì thiếu ComM_CommunicationAllowed(TRUE)"},
                    {"id": "SWS_ComM_00675", "desc": "User kẹt NO_COM dù kênh đã FULL_COM vì chờ <Bus>SM_ModeIndication"},
                    {"id": "SWS_ComM_01103", "desc": "API LimitChannelToNoComMode trả E_NOT_OK khi Classification Bit 1 = 0"},
                    {"id": "SWS_ComM_00794", "desc": "ComM_DeInit() bị từ chối vì còn kênh chưa ở NO_COM_NO_PENDING_REQUEST"},
                ],
                "html": f"""
<div class="hb-card">
  <h3>Cẩm Nang Xử Lý Nhanh Sự Cố Tích Hợp ComM Ngoài Dự Án</h3>
  {DIAGRAMS["debug_tree"]}
  <ol>
    <li><b>Bệnh 1 — Kênh kẹt mãi ở <code>COMM_NO_COM_REQUEST_PENDING</code> (Bit 5 = 1):</b> Quên gọi <code>ComM_CommunicationAllowed(Ch, TRUE)</code> trong cấu hình <code>BswM</code> rule lúc Startup Two.</li>
    <li><b>Bệnh 2 — Channel đã báo <code>FULL_COM</code> nhưng SWC vẫn không gửi được frame CAN:</b> <code>CanSM</code> bị kẹt ở Bus-Off hoặc chờ CanTrcv chưa gọi lại <code>ComM_BusSM_ModeIndication(FULL_COM)</code> (Bit 1 <code>BUSSM = 0</code>), hoặc <code>BswM</code> quên bật Tx I-PDU Group.</li>
    <li><b>Bệnh 3 — Gọi <code>ComM_LimitChannelToNoComMode(TRUE)</code> bị trả <code>E_NOT_OK</code> hoặc không tắt được mạng:</b> Kiểm tra Bit 1 trong <code>ComMEcuGroupClassification</code> (<code>0x02</code>, <code>SWS_ComM_01103</code>), hoặc kiểm tra xem <code>DCM</code> có đang giữ <code>ActiveDiagnostic</code> không!</li>
    <li><b>Bệnh 4 — Gọi <code>ComM_RequestComMode(FULL)</code> mà <code>InhibitCounter</code> tăng vọt:</b> Bit 0 <code>NoWakeup</code> đang lưu lại từ lần ngủ trước trong NvM (<code>ComMNoWakeUpInhibitionNvmStorage=TRUE</code>, <code>ECUC_ComM_00789</code>) mà chưa được xóa khi IG-ON.</li>
    <li><b>Bệnh 5 — Kênh <code>PASSIVE</code> không lên <code>NETWORK_REQUESTED</code> hoặc <code>ComM_DeInit()</code> thất bại:</b> Kênh <code>PASSIVE</code> chỉ thức thụ động qua <code>Nm_PassiveStartUp</code>; còn <code>ComM_DeInit()</code> luôn bị chặn trừ khi TẤT CẢ kênh đang ở <code>COMM_NO_COM_NO_PENDING_REQUEST</code> (<code>SWS_ComM_00794</code>).</li>
  </ol>
</div>"""
            },
            {
                "label": "6.3 Bẫy Cạn Bình Ắc Quy (ECU Không Ngủ Được)",
                "swsRefs": [
                    {"id": "SWS_ComM_00875", "desc": "User leak giữ OR Arbitration khiến kênh kẹt ở NETWORK_REQUESTED"},
                    {"id": "SWS_ComM_01060", "desc": "Bit EIRA ngoài bus còn 1 làm PNC kẹt tại COMM_PNC_READY_SLEEP"},
                    {"id": "SWS_ComM_00157", "desc": "Không bật/reset ComMNoWakeUpInhibitionNvmStorage (ECUC_ComM_00789) khi đỗ xe"},
                    {"id": "SWS_ComM_00873", "desc": "Phiên chẩn đoán DCM quên gọi InactiveDiagnostic() giữ ECU thức"},
                ],
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
                "swsRefs": [
                    {"id": "SWS_ComM_00370", "desc": "Truy vấn ComM_GetVersionInfo() kiểm tra version stack (ECUC_ComM_00622)"},
                    {"id": "SWS_ComM_00191", "desc": "Đọc trạng thái kênh runtime qua ComM_GetState() & GetCurrentComMode() (00176)"},
                    {"id": "SWS_ComM_00802", "desc": "Đọc ComM_GetInhibitionStatus() (00669) & ReadInhibitCounter() (00803)"},
                ],
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

function buildSwsRefBar(refs) {
  if (!Array.isArray(refs) || refs.length === 0) return "";
  const chips = refs.map((ref) => {
    const idStr = String(ref.id || "");
    const cls = idStr.startsWith("ECUC_") ? " is-ecuc" : (idStr.startsWith("SWS_ComM_") ? "" : " is-sys");
    return "<span class=\\"hb-sws-chip" + cls + "\\" title=\\"" + escapeHtmlSafe(ref.desc || idStr) + "\\">" +
      "<span class=\\"hb-sws-id\\">" + escapeHtmlSafe(idStr) + "</span>" +
      "<span class=\\"hb-sws-desc\\">" + escapeHtmlSafe(ref.desc || "") + "</span>" +
    "</span>";
  }).join("");
  return "<div class=\\"hb-sws-bar\\" role=\\"note\\" aria-label=\\"AUTOSAR SWS References\\">" +
    "<span class=\\"hb-sws-hdr\\">📘 AUTOSAR SWS_ID:</span>" +
    "<div class=\\"hb-sws-list\\">" + chips + "</div>" +
  "</div>";
}

function injectSwsRefBar(html, refs) {
  const bar = buildSwsRefBar(refs);
  if (!bar) return html;
  const h3End = html.indexOf("</h3>");
  if (h3End !== -1) {
    return html.slice(0, h3End + 5) + "\\n  " + bar + html.slice(h3End + 5);
  }
  const h2End = html.indexOf("</h2>");
  if (h2End !== -1) {
    return html.slice(0, h2End + 5) + "\\n  " + bar + html.slice(h2End + 5);
  }
  return bar + "\\n" + html;
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
  area.innerHTML = sub ? injectSwsRefBar(sub.html, sub.swsRefs) : "<div class=\\"hb-card\\">Đang cập nhật nội dung...</div>";
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
