# -*- coding: utf-8 -*-
"""Generator for part6_handbook.js — Multi-level Handbook (6x4 = 24 topics) + Live-Search Abbreviation Table + Bootstrap."""

import base64
import json
from pathlib import Path
from hb_diagrams_nm_cannm import build_diagrams

DIAGRAMS = build_diagrams()

# Embed Figure 7-1 image inline as base64 data URI if present, so downloaded standalone HTML works 100% offline.
FIG71_PATH = Path(__file__).parent.parent / "Simulation" / "assets" / "figure_7_1_cannm_algorithm.jpg"
if FIG71_PATH.exists():
    b64 = base64.b64encode(FIG71_PATH.read_bytes()).decode("ascii")
    FIG71_IMG_HTML = (
        f'<div style="text-align:center;margin:10px 0">'
        f'<img src="data:image/jpeg;base64,{b64}" alt="AUTOSAR SWS_CanNm Figure 7-1: CanNM Algorithm" '
        f'style="max-width:100%;border-radius:8px;border:1px solid var(--bdr);background:#fff;padding:6px" />'
        f'<div style="font-size:11px;color:var(--mut);margin-top:4px">Hình chuẩn AUTOSAR SWS_CanNm — Figure 7-1: CanNM Algorithm (nhúng offline trong HTML)</div>'
        f'</div>'
    )
else:
    FIG71_IMG_HTML = '<div class="hb-card"><i>(Chưa tìm thấy assets/figure_7_1_cannm_algorithm.jpg — dùng sơ đồ vector SVG bên dưới)</i></div>'


HANDBOOK_DATA = [
    # ================= TAB 1 =================
    {
        "title": "1. Kiến Trúc Phối Hợp Nm & CanNm",
        "topics": [
            {
                "label": "1.1. Tại Sao Tách Lớp Nm & CanNm?",
                "html": f"""
<div class="hb-card">
  <h3>1.1. Triết Lý Phân Tầng AUTOSAR: Generic `Nm` Interface vs Bus-Specific `CanNm`</h3>
  <p>Trong kiến trúc AUTOSAR Classic, việc quản lý thức/ngủ của ECU được tách đôi thành hai module phối hợp chặt chẽ ở tầng <b>Communication Services</b>:</p>
  <div class="hb-grid2" style="margin-top:8px">
    <div class="insp-card">
      <div class="insp-h">🧭 Module Nm (ModuleId = 29 / 0x1D)</div>
      <ul>
        <li><b>Trừu tượng hóa bus vật lý:</b> Ẩn toàn bộ chi tiết phần cứng CAN/FlexRay/Ethernet khỏi tầng trên <code>ComM</code>. Dù xe dùng CAN, FlexRay hay Ethernet, <code>ComM</code> chỉ gọi duy nhất một bộ API chuẩn trong <code>Nm.h</code>.</li>
        <li><b>NM Coordinator:</b> Nắm toàn cảnh đa kênh (ví dụ <code>Ch0: CAN_Body</code> + <code>Ch1: CAN_SubNet</code>) để giữ và tắt đồng bộ cả cụm <code>NmCoordCluster</code>.</li>
        <li><b>NmStateReport:</b> Đóng vai cầu nối đẩy mã 6-bit trạng thái chuyển tiếp xuống <code>AUTOSAR COM</code>.</li>
      </ul>
    </div>
    <div class="insp-card">
      <div class="insp-h">🎛️ Module CanNm (ModuleId = 31 / 0x1F)</div>
      <ul>
        <li><b>Thực thi nghi thức CAN:</b> Điều hành Máy Trạng Thái 2 cấp (Bus-Sleep, Prepare Bus-Sleep, Network Mode: Repeat Message / Normal Operation / Ready Sleep) trên từng kênh CAN riêng lẻ.</li>
        <li><b>Đóng gói khung 8-Byte PDU:</b> Quản lý Byte định danh nguồn <code>SNI</code>, byte cờ điều khiển <code>CBV</code>, bộ đếm <code>Timeout / RepeatMsg / WaitBusSleep</code>.</li>
        <li><b>Lọc Partial Networking:</b> Tính toán vector <code>EIRA / ERA</code> và báo cáo trạng thái đường bus lên <code>Nm</code>.</li>
      </ul>
    </div>
  </div>
  {DIAGRAMS["arch_separation"]}
</div>"""
            },
            {
                "label": "1.2. Chuỗi Tương Tác End-to-End 8 Khối",
                "html": f"""
<div class="hb-card">
  <h3>1.2. Luồng Dữ Liệu End-to-End: Input Từ Đâu ➔ Xử Lý Gì ➔ Output Route Đi Đâu?</h3>
  {DIAGRAMS["e2e_flow"]}
  <table class="tbl">
    <thead><tr><th>Khối / Tầng</th><th>Input (Đầu vào)</th><th>Xử lý nội bộ (Core Logic)</th><th>Output (Định tuyến đầu ra)</th></tr></thead>
    <tbody>
      <tr><td><b>SWC_App / SWC_Diag</b></td><td>Khóa điện IG_ON, nút bấm, phản hồi RTE mode</td><td>Xin FULL_COM; gọi điểm danh <code>Nm_RepeatMessageRequest()</code> hoặc đọc NID</td><td><code>Rte_Call_UR_RequestComMode()</code> ➔ ComM; gọi dịch vụ tới Nm/COM</td></tr>
      <tr><td><b>ComM / BswM / Dcm</b></td><td>User requests, UDS <code>0x28</code>, callbacks từ Nm</td><td>Phân xử tất cả User &amp; PNC; KHÔNG bao giờ gọi thẳng xuống CanNm</td><td><code>Nm_NetworkRequest/Release/PassiveStartUp()</code>, <code>Nm_DisableCommunication()</code></td></tr>
      <tr><td><b>Nm Interface &amp; Coord</b></td><td>Lệnh từ ComM + Callbacks từ CanNm</td><td>Dispatcher 1-1 theo <code>NmBusType</code>; chạy thuật toán Cluster; mã hóa NMS Report</td><td><code>CanNm_*()</code>, <code>CanNm_SetSleepReadyBit()</code>, <code>Com_SendSignal(NMS)</code>, <code>ComM_Nm_*()</code></td></tr>
      <tr><td><b>CanNm Engine</b></td><td>Lệnh từ Nm + <code>CanIf</code> Rx/Tx + <code>CanSM</code> PN Avail</td><td>Chạy State Machine, 5+1 timers, lọc PN Bit Mask, tính EIRA/ERA, xây 8-Byte PDU</td><td><code>CanIf_Transmit()</code>, <code>PduR_CanNmTriggerTransmit()</code>, 15+ callbacks lên <code>Nm</code></td></tr>
      <tr><td><b>AUTOSAR COM &amp; PduR</b></td><td><code>Com_SendSignal(NMS)</code>, <code>PduR_CanNmRxIndication()</code></td><td>Cập nhật Byte 4 I-PDU; định tuyến vector ERA/EIRA tới ComM PNC State Machine</td><td>Payload UserData+NMS cho <code>CanNm</code>; tín hiệu Rx EIRA/ERA lên <code>ComM</code></td></tr>
      <tr><td><b>CanSM / CanIf / Bus</b></td><td><code>CanSM_RequestComMode()</code>, Tx PDU, sóng điện áp bus</td><td>Bật/tắt Transceiver, gọi <code>CanNm_ConfirmPnAvailability()</code>, truyền khung CAN 0x51A</td><td>Ngắt <code>CanNm_RxIndication()</code> &amp; <code>CanNm_TxConfirmation()</code></td></tr>
    </tbody>
  </table>
</div>"""
            },
            {
                "label": "1.3. Ma Trận API Chiều Xuống",
                "html": """
<div class="hb-card">
  <h3>1.3. Bảng Ma Trận Ánh Xạ API Chiều Xuống (`ComM / BswM / SWC ➔ Nm ➔ CanNm`)</h3>
  <p>Khi cấu hình <code>NmBusType = NM_BUSNM_CANNM</code>, module <code>Nm</code> định tuyến các API chuẩn từ tầng trên xuống <code>CanNm</code> theo bảng ánh xạ dưới đây:</p>
  <table class="tbl">
    <thead><tr><th>Caller (Tầng gọi)</th><th>API của Module Nm (<code>Nm.h</code>)</th><th>SWS Ref</th><th>Hàm CanNm tương ứng (<code>CanNm.h</code>)</th><th>Ghi chú điều phối tại tầng Nm</th></tr></thead>
    <tbody>
      <tr><td>ComM</td><td class="mono">Nm_NetworkRequest(ch)</td><td class="mono">SWS_Nm_00031</td><td class="mono">CanNm_NetworkRequest(ch)</td><td>Bị chặn nếu <code>NmPassiveModeEnabled=TRUE</code>. Nếu Coordinator=ON ➔ kéo toàn Cluster thức.</td></tr>
      <tr><td>ComM</td><td class="mono">Nm_NetworkRelease(ch)</td><td class="mono">SWS_Nm_00032</td><td class="mono">CanNm_NetworkRelease(ch)</td><td>Nếu Coordinator=ON ➔ Nm GIỮ LẠI lệnh Release cho tới khi hết <code>NmShutdownDelayTimer</code>!</td></tr>
      <tr><td>ComM</td><td class="mono">Nm_PassiveStartUp(ch)</td><td class="mono">SWS_Nm_00030</td><td class="mono">CanNm_PassiveStartUp(ch)</td><td>Đánh thức CanNm vào Repeat Message với AWB=0, HOLD=0.</td></tr>
      <tr><td>SWC / BswM</td><td class="mono">Nm_RepeatMessageRequest(ch)</td><td class="mono">SWS_Nm_00035</td><td class="mono">CanNm_RepeatMessageRequest(ch)</td><td>Bật CBV Bit 0 (RMR=1) khi bật <code>NmNodeDetectionEnabled=TRUE</code>.</td></tr>
      <tr><td>Nm Coord</td><td class="mono"><i>(Nội bộ Nm Coordinator)</i></td><td class="mono">SWS_Nm_00238</td><td class="mono">CanNm_SetSleepReadyBit(ch, srb)</td><td>Hàm chuyên biệt chỉ Nm Coordinator gọi xuống CanNm để đặt CBV Bit 3 (SRB=1/0)!</td></tr>
      <tr><td>ComM (R22+)</td><td class="mono">Nm_RequestSynchronizedPncShutdown(ch, pnc)</td><td class="mono">SWS_Nm_91009</td><td class="mono">CanNm_RequestSynchronizedPncShutdown(ch, pnc)</td><td>Bật CBV Bit 5 (PNSR=1) phát yêu cầu tắt đồng loạt PNC trên CAN Bus.</td></tr>
      <tr><td>Dcm / BswM</td><td class="mono">Nm_DisableCommunication(ch)</td><td class="mono">SWS_Nm_00033</td><td class="mono">CanNm_DisableCommunication(ch)</td><td>Khóa truyền NM PDU &amp; đóng băng NM-Timeout Timer (UDS 0x28).</td></tr>
      <tr><td>Dcm / BswM</td><td class="mono">Nm_EnableCommunication(ch)</td><td class="mono">SWS_Nm_00034</td><td class="mono">CanNm_EnableCommunication(ch)</td><td>Mở lại truyền NM PDU và chạy lại NM-Timeout Timer.</td></tr>
      <tr><td>SWC</td><td class="mono">Nm_SetUserData(ch, ptr)</td><td class="mono">SWS_Nm_00033</td><td class="mono">CanNm_SetUserData(ch, ptr)</td><td>Chỉ dùng khi <code>NmComUserDataSupport=FALSE</code>.</td></tr>
      <tr><td>SWC / Diag</td><td class="mono">Nm_GetNodeIdentifier / GetPduData / GetState</td><td class="mono">SWS_Nm_00036..43</td><td class="mono">CanNm_GetNodeIdentifier / GetPduData / GetState</td><td>Truy vấn SNI, toàn bộ buffer 8-Byte PDU và Mode/State hiện tại của CanNm.</td></tr>
      <tr><td>BswM / App</td><td class="mono">Nm_CheckRemoteSleepIndication(ch, &amp;flag)</td><td class="mono">SWS_Nm_00153</td><td class="mono">CanNm_CheckRemoteSleepIndication(ch, &amp;flag)</td><td>Kiểm tra các node từ xa trên nhánh mạng đã sẵn sàng ngủ hay chưa.</td></tr>
    </tbody>
  </table>
</div>"""
            },
            {
                "label": "1.4. Ma Trận Callbacks Chiều Lên",
                "html": """
<div class="hb-card">
  <h3>1.4. Bảng Ma Trận Callbacks Chiều Lên (`CanNm ➔ Nm_Cbk.h ➔ ComM / BswM / COM`)</h3>
  <p>Module <code>CanNm</code> không gọi trực tiếp vào <code>ComM</code> hay <code>BswM</code>; mọi sự kiện trạng thái đều phải đi qua lớp callback <code>Nm_Cbk.h</code>:</p>
  <table class="tbl">
    <thead><tr><th>Callback từ CanNm gọi lên Nm</th><th>SWS Ref</th><th>Hành động xử lý tại Module Nm</th><th>Output đẩy lên ComM / BswM / COM</th></tr></thead>
    <tbody>
      <tr><td class="mono">Nm_NetworkStartIndication(ch)</td><td class="mono">SWS_Nm_00092</td><td>Báo có node khác đánh thức bus khi đang Bus-Sleep</td><td class="mono">ComM_Nm_NetworkStartIndication(ch)</td></tr>
      <tr><td class="mono">Nm_NetworkMode(ch)</td><td class="mono">SWS_Nm_00093</td><td>Xác nhận CanNm đã vào NM_MODE_NETWORK</td><td class="mono">ComM_Nm_NetworkMode(ch)</td></tr>
      <tr><td class="mono">Nm_PrepareBusSleepMode(ch)</td><td class="mono">SWS_Nm_00094</td><td>Xác nhận vào pha đệm chuẩn bị ngủ</td><td class="mono">ComM_Nm_PrepareBusSleepMode(ch)</td></tr>
      <tr><td class="mono">Nm_BusSleepMode(ch)</td><td class="mono">SWS_Nm_00095</td><td>Xác nhận ngủ hoàn toàn; cập nhật Coordinator cluster</td><td class="mono">ComM_Nm_BusSleepMode(ch)</td></tr>
      <tr><td class="mono">Nm_StateChangeNotification(ch, prev, curr)</td><td class="mono">SWS_Nm_00099</td><td>Mã hóa cặp trạng thái thành mã 6-bit NMS nếu bật NmStateReportEnabled</td><td class="mono">Com_SendSignal(NMS) &amp; BswM_Nm_StateChangeNotification()</td></tr>
      <tr><td class="mono">Nm_RemoteSleepIndication(ch)</td><td class="mono">SWS_Nm_00150</td><td>Ghi nhận kênh <code>ch</code> đã đủ im lặng từ xa cho Coordinator</td><td>Kích hoạt điều kiện Coordinated Shutdown trong Nm</td></tr>
      <tr><td class="mono">Nm_RemoteSleepCancellation(ch)</td><td class="mono">SWS_Nm_00178</td><td>Hủy cờ RemoteSleep trên kênh <code>ch</code></td><td><b>Kích hoạt Abort Coordinated Shutdown [SWS_Nm_00180]!</b></td></tr>
      <tr><td class="mono">Nm_SynchronizationPoint(ch)</td><td class="mono">SWS_Nm_00226</td><td>Đánh dấu điểm đồng bộ thời gian phát PDU cho cụm</td><td>Cho phép Coordinator bắt đầu đếm <code>NmShutdownDelayTimer</code></td></tr>
      <tr><td class="mono">Nm_CoordReadyToSleepIndication(ch)</td><td class="mono">SWS_Nm_00242</td><td>Passive Coordinator nhận SRB=1 từ Main Coordinator</td><td>Khởi động quy trình đóng các kênh phụ thuộc</td></tr>
      <tr><td class="mono">Nm_CoordReadyToSleepCancellation(ch)</td><td class="mono">SWS_Nm_00272</td><td>Main Coordinator xóa SRB 1➔0 trên bus</td><td>Hủy quy trình ngủ trên Passive Coordinator</td></tr>
      <tr><td class="mono">Nm_CarWakeUpIndication(ch)</td><td class="mono">SWS_Nm_00250</td><td>Xác nhận cờ CarWakeUp hợp lệ sau bộ lọc NodeId</td><td class="mono">BswM_Nm_CarWakeUpIndication(ch)</td></tr>
      <tr><td class="mono">Nm_ForwardSynchronizedPncShutdown(ch)</td><td class="mono">SWS_Nm_91010</td><td>Chuyển tiếp lệnh tắt đồng bộ PNC (R22-11+)</td><td class="mono">ComM_Nm_ForwardSynchronizedPncShutdown(ch)</td></tr>
      <tr><td class="mono">Nm_TxTimeoutException(ch)</td><td class="mono">SWS_Nm_00066</td><td>Báo quá hạn chờ TxConfirmation từ CanIf</td><td>Cảnh báo lỗi truyền thông tầng Nm (cùng CanSM)</td></tr>
    </tbody>
  </table>
</div>"""
            }
        ]
    },
    # ================= TAB 2 =================
    {
        "title": "2. NM Coordinator & Ngủ Đồng Bộ",
        "topics": [
            {
                "label": "2.1. Bài Toán Gateway & NmCoordCluster",
                "html": f"""
<div class="hb-card">
  <h3>2.1. Bài Toán Gateway Đa Nhánh Mạng &amp; Cụm `NmCoordCluster`</h3>
  <p>Trên các ECU Gateway hoặc Domain Controller kết nối nhiều mạng CAN độc lập (như <b>Ch0: CAN_Body</b> và <b>Ch1: CAN_SubNet</b>), việc để từng kênh CanNm tự đi ngủ theo timeout riêng sẽ gây ra lỗi định tuyến nghiêm trọng: <i>Ch0 đã tắt CAN Transceiver trong khi Ch1 vẫn còn nhận bản tin cần chuyển tiếp sang Ch0!</i></p>
  <p>Do đó, AUTOSAR đưa thuật toán <b>NM Coordinator</b> vào bên trong module <code>Nm</code> (`NmCoordinatorSupportEnabled = TRUE`). Tất cả các kênh gắn cùng chỉ số <code>NmCoordClusterIndex</code> sẽ chịu sự chỉ huy tập trung:</p>
  <ul>
    <li>Chỉ cần <b>1 kênh bất kỳ</b> còn được <code>ComM</code> yêu cầu hoặc còn node từ xa đang phát NM PDU, <code>Nm Coordinator</code> sẽ chủ động giữ lệnh <code>CanNm_NetworkRequest()</code> trên <b>TẤT CẢ</b> các kênh trong Cluster.</li>
    <li>Mô phỏng tại kịch bản <b>S8</b> minh họa rõ tình huống Ch0 đã gọi Release nhưng vẫn phải ở <code>NORMAL_OPERATION</code> chờ Ch1 hoàn tất.</li>
  </ul>
  {DIAGRAMS["coord_cluster"]}
</div>"""
            },
            {
                "label": "2.2. RemoteSleepIndication & SleepMaster",
                "html": """
<div class="hb-card">
  <h3>2.2. Cơ Chế Phát Hiện Ngủ Từ Xa (`RemoteSleepInd`) &amp; Vai Trò `NmChannelSleepMaster`</h3>
  <table class="tbl">
    <thead><tr><th>Khái niệm / Tham số</th><th>Kênh áp dụng</th><th>Cách phối hợp giữa CanNm &amp; Nm Coordinator</th></tr></thead>
    <tbody>
      <tr><td class="mono">Nm_RemoteSleepIndication(Ch)</td><td>Kênh có node ngoài (VD: Ch0 CAN_Body)</td><td>Khi ECU cục bộ đang ở <code>NM_STATE_NORMAL_OPERATION</code> mà không nhận được bất kỳ gói NM PDU nào từ các ECU khác trong thời gian <code>CanNmRemoteSleepIndTime</code> (mặc định 1500ms), CanNm gọi <code>Nm_RemoteSleepIndication(Ch)</code> báo tất cả các node từ xa trên nhánh này đã sẵn sàng ngủ!</td></tr>
      <tr><td class="mono">NmRemoteSleepIndEnabled = TRUE</td><td>Bắt buộc (SWS_Nm_00201)</td><td>Mọi kênh thuộc NM Coordinator Cluster (trừ kênh cấu hình SleepMaster) BẮT BUỘC phải bật cờ này trên cả Nm và CanNm. Nếu quên bật, trình kiểm tra Timing Validator sẽ cảnh báo ngay lập tức.</td></tr>
      <tr><td class="mono">NmChannelSleepMaster = TRUE</td><td>Kênh nhánh phụ (VD: Ch1 CAN_SubNet)</td><td>Dùng khi ECU Gateway là node "chủ" duy nhất giữ mạng trên nhánh phụ (các node con trên Ch1 là Passive hoặc chỉ nghe theo Gateway). Với <code>SleepMaster = TRUE</code>, Nm Coordinator KHÔNG cần đợi <code>Nm_RemoteSleepIndication(Ch1)</code> mà coi Ch1 sẵn sàng ngủ ngay khi ComM gọi <code>Nm_NetworkRelease(Ch1)</code>!</td></tr>
    </tbody>
  </table>
</div>"""
            },
            {
                "label": "2.3. Coordinated Shutdown & ShutdownDelayTimer",
                "html": f"""
<div class="hb-card">
  <h3>2.3. Chu Trình Đóng Cụm Đồng Bộ: `SynchronizationPoint`, `SleepReadyBit` &amp; `NmShutdownDelayTimer`</h3>
  {DIAGRAMS["coord_shutdown_seq"]}
  <div class="insp-card">
    <div class="insp-h">📐 Công Thức Chuẩn AUTOSAR Tính `NmShutdownDelayTimer` (SWS_Nm_00232)</div>
    <p>Tại mỗi nhịp <code>Nm_MainFunction()</code>, nếu tất cả các kênh trong Cluster đều thỏa mãn <code>ComM Released</code> + <code>RemoteSleep/SleepMaster Ready</code>:</p>
    <ol>
      <li>Nếu <code>NmSynchronizingNetwork = TRUE</code>: Coordinator chờ callback <code>Nm_SynchronizationPoint(Ch0)</code> từ CanNm khi gói NM định kỳ tiếp theo được phát.</li>
      <li><b>Bật SRB=1:</b> Coordinator chuyển sang <code>NM_COORD_SHUTDOWN_INITIATED</code>, gọi <code>CanNm_SetSleepReadyBit(0, TRUE)</code> bật Bit 3 trên CBV và nạp <code>NmShutdownDelayTimer = NmGlobalCoordinatorTime (1500ms)</code>.</li>
      <li><b>Release đồng loạt:</b> Ngay khi <code>NmShutdownDelayTimer == 0</code>, Nm Coordinator gọi <code>CanNm_NetworkRelease(Ch0)</code> và <code>CanNm_NetworkRelease(Ch1)</code> đồng thời trong cùng 1 task cycle! Nhờ đó cả Ch0 và Ch1 cùng bước vào <code>Ready Sleep ➔ Prepare Bus-Sleep ➔ Bus-Sleep</code> đồng bộ tuyệt đối!</li>
    </ol>
  </div>
</div>"""
            },
            {
                "label": "2.4. Abort Shutdown & Active vs Passive Coord",
                "html": """
<div class="hb-card">
  <h3>2.4. Bảo Vệ Chống Ngủ Lệch Pha (`Abort Shutdown`) &amp; Active vs Passive Coordinator</h3>
  <div class="hb-grid2">
    <div class="insp-card">
      <div class="insp-h">🛡️ Cơ Chế Abort Coordinated Shutdown (SWS_Nm_00180)</div>
      <p>Nếu trong khi <code>NmShutdownDelayTimer</code> đang đếm ngược mà có 1 node bất kỳ thức dậy (<code>Nm_RemoteSleepCancellation()</code>) HOẶC ComM xin lại mạng (<code>Nm_NetworkRequest()</code>):</p>
      <ul>
        <li><b>Dừng ngay Timer:</b> Hủy đếm lùi <code>NmShutdownDelayTimer = 0</code>.</li>
        <li><b>Xóa Bit 3 SRB:</b> Gọi <code>CanNm_SetSleepReadyBit(0, FALSE)</code> và phát gói NM thông báo hủy ngủ ra bus!</li>
        <li><b>Giữ lại toàn cụm:</b> Gọi <code>CanNm_NetworkRequest()</code> cho toàn Cluster để kéo mọi nhánh về trạng thái thức bình thường (Thử ngay ở Kịch bản <b>S10</b>).</li>
      </ul>
    </div>
    <div class="insp-card">
      <div class="insp-h">⚖️ Active Coordinator vs Passive Coordinator (S11)</div>
      <ul>
        <li><b>Active Coordinator (<code>NmActiveCoordinator = TRUE</code>):</b> Nắm quyền chủ trì cụm, tự quyết định phát bit <code>CBV Bit 3 SRB=1</code> qua <code>CanNm_SetSleepReadyBit()</code>.</li>
        <li><b>Passive Coordinator (<code>NmActiveCoordinator = FALSE</code>):</b> Đóng vai điều phối cấp dưới khi nối chung bus với một Main Gateway khác. Nó lắng nghe bit SRB từ Main Coordinator qua callback <code>Nm_CoordReadyToSleepIndication()</code> và <code>Nm_CoordReadyToSleepCancellation()</code> [SWS_Nm_00242].</li>
      </ul>
    </div>
  </div>
</div>"""
            }
        ]
    },
    # ================= TAB 3 =================
    {
        "title": "3. Máy Trạng Thái & Figure 7-1",
        "topics": [
            {
                "label": "3.1. 3 Modes & 3+1 Sub-States Của CanNm",
                "html": f"""
<div class="hb-card">
  <h3>3.1. Máy Trạng Thái 2 Cấp Của `CanNm` &amp; Ý Nghĩa Từng Trạng Thái</h3>
  <p><code>CanNm</code> tổ chức trạng thái theo kiến trúc 2 tầng: <b>3 Network Modes</b> bên ngoài và <b>3 Sub-states</b> bên trong <code>NM_MODE_NETWORK</code> (cùng trạng thái khởi tạo ban đầu <code>NM_STATE_UNINIT</code> trước khi gọi <code>CanNm_Init()</code>):</p>
  {DIAGRAMS["cannm_sm"]}
  <table class="tbl">
    <thead><tr><th>Mode / Sub-State</th><th>Hành vi phát TX NM PDU</th><th>Điều kiện chuyển &amp; Callbacks lên Nm</th></tr></thead>
    <tbody>
      <tr><td class="mono">NM_MODE_BUS_SLEEP<br/>(NM_STATE_BUS_SLEEP)</td><td>Tắt hoàn toàn Tx/Rx</td><td>Ngủ sâu. Nhận Rx frame ở đây báo runtime error <code>CANNM_E_NET_START_IND</code> + <code>Nm_NetworkStartIndication()</code>.</td></tr>
      <tr><td class="mono">NM_MODE_PREPARE_BUS_SLEEP</td><td>Ngưng phát NM PDU</td><td>Đếm lùi <code>CanNmWaitBusSleepTime</code>. Xóa <code>AWB=0</code>, báo <code>Nm_PrepareBusSleepMode()</code>. Hết giờ ➔ Bus-Sleep + <code>Nm_BusSleepMode()</code>.</td></tr>
      <tr><td class="mono">NM_STATE_REPEAT_MESSAGE</td><td>Phát Burst / Chu kỳ MsgCycleTime</td><td>Điểm vào duy nhất khi vừa thức dậy (Active/Passive) hoặc nhận lệnh điểm danh <code>RMR=1</code>. Hết <code>RepeatMessageTime</code>: giữ Hold ➔ Normal Op; không Hold ➔ Ready Sleep.</td></tr>
      <tr><td class="mono">NM_STATE_NORMAL_OPERATION</td><td>Phát định kỳ MsgCycleTime</td><td>Ứng dụng/Coordinator đang giữ mạng (<code>CANNM_HOLD=1</code>). Chạy bộ đếm <code>RemoteSleepIndTime</code> phát hiện bus rảnh.</td></tr>
      <tr><td class="mono">NM_STATE_READY_SLEEP</td><td>Ngưng phát (chỉ nghe Rx)</td><td>Đã gọi Release (<code>CANNM_HOLD=0</code>). Chỉ nghe bus, nạp lại <code>TimeoutTime</code> mỗi khi có Rx PDU. Timeout = 0 ➔ Prepare Bus-Sleep!</td></tr>
    </tbody>
  </table>
</div>"""
            },
            {
                "label": "3.2. Sơ Đồ Thuật Toán Figure 7-1",
                "html": f"""
<div class="hb-card">
  <h3>3.2. Sơ Đồ Thuật Toán Chuẩn `Figure 7-1: CanNM Algorithm` (AUTOSAR SWS_CanNm)</h3>
  <p>Dưới đây là sơ đồ nguyên bản từ đặc tả AUTOSAR R22-11/R23-11 <i>Specification of CAN Network Management</i> kèm sơ đồ chỉ rõ các điểm mà <code>CanNm</code> bắn callbacks ngược lên module <code>Nm</code>:</p>
  {FIG71_IMG_HTML}
  {DIAGRAMS["fig71_algo"]}
</div>"""
            },
            {
                "label": "3.3. 6 Bộ Định Thời & Ràng Buộc Timing",
                "html": """
<div class="hb-card">
  <h3>3.3. Phân Tích 6 Bộ Định Thời Cốt Lõi &amp; Quy Tắc Ràng Buộc Timing</h3>
  <table class="tbl">
    <thead><tr><th>Tên Timer / Tham số ECUC</th><th>Mặc định</th><th>Module sở hữu</th><th>Chức năng &amp; Ràng buộc chuẩn AUTOSAR (Validator kiểm tra)</th></tr></thead>
    <tbody>
      <tr><td class="mono">CanNmMsgCycleTime</td><td class="mono">1000 ms</td><td>CanNm</td><td>Chu kỳ phát bản tin NM định kỳ trong Repeat Message &amp; Normal Operation.</td></tr>
      <tr><td class="mono">CanNmTimeoutTime</td><td class="mono">2000 ms</td><td>CanNm</td><td><b>Ràng buộc SWS_CanNm_00246:</b> BẮT BUỘC <code>&gt; CanNmMsgCycleTime</code> (thường 2x–3x). Nếu nhỏ hơn, node tự rớt ngủ ngay giữa chu kỳ phát!</td></tr>
      <tr><td class="mono">CanNmRepeatMessageTime</td><td class="mono">1500 ms</td><td>CanNm</td><td>Thời gian ở lại Repeat Message State; phải là bội số của <code>CanNmMainFunctionPeriod</code>.</td></tr>
      <tr><td class="mono">CanNmWaitBusSleepTime</td><td class="mono">1500 ms</td><td>CanNm</td><td>Khoảng đệm chờ phần cứng trước khi gọi <code>Nm_BusSleepMode()</code>. Tránh đánh thức giả do trễ tắt giữa các ECU.</td></tr>
      <tr><td class="mono">CanNmRemoteSleepIndTime</td><td class="mono">1500 ms</td><td>CanNm</td><td><b>Ràng buộc Coordinator:</b> BẮT BUỘC <code>&gt; CanNmMsgCycleTime</code> để không báo nhầm <code>Nm_RemoteSleepIndication()</code> giữa 2 lần phát hợp lệ của ECU khác!</td></tr>
      <tr><td class="mono">NmGlobalCoordinatorTime</td><td class="mono">1500 ms</td><td>Nm Coord</td><td>Thời gian đếm lùi <code>NmShutdownDelayTimer</code> trước khi gọi <code>CanNm_NetworkRelease()</code> đồng loạt xuống Cluster.</td></tr>
    </tbody>
  </table>
</div>"""
            },
            {
                "label": "3.4. Active Wakeup Burst Tx vs Passive Wakeup",
                "html": """
<div class="hb-card">
  <h3>3.4. So Sánh Active Wakeup (Burst Tx), Passive Wakeup &amp; Immediate Restart</h3>
  <table class="tbl">
    <thead><tr><th>Tiêu chí kỹ thuật</th><th>Active Wakeup (Nm_NetworkRequest)</th><th>Passive Wakeup (Nm_PassiveStartUp)</th></tr></thead>
    <tbody>
      <tr><td><b>Nguyên nhân khởi phát</b></td><td>SWC nội bộ ECU cần phát dữ liệu (<code>Nm_NetworkRequest</code>)</td><td>Nhận khung NM từ ECU khác khi ngủ (<code>Nm_NetworkStartIndication</code> ➔ <code>Nm_PassiveStartUp</code>)</td></tr>
      <tr><td><b>Cờ CBV Bit 4 (AWB)</b></td><td><b>1</b> (nếu <code>CanNmActiveWakeupBitEnabled=TRUE</code>) — báo cho toàn xe biết mình là nguồn gây thức!</td><td><b>0</b> — đánh dấu chỉ dậy hưởng ứng theo bus</td></tr>
      <tr><td><b>Chiến lược phát gói đầu</b></td><td>Bắn chùm tốc độ cao <code>CanNmImmediateNmTransmissions</code> gói cách nhau <code>CanNmImmediateNmCycleTime (100ms)</code></td><td>Đợi hết độ trễ lệch pha <code>CanNmMsgCycleOffset</code> (tránh nhiều node cùng thức dậy gây nghẽn CAN Bus!)</td></tr>
      <tr><td><b>Nhánh rẽ sau Repeat Message</b></td><td>Chuyển sang <code>NM_STATE_NORMAL_OPERATION</code> (tiếp tục giữ mạng)</td><td>Rẽ thẳng sang <code>NM_STATE_READY_SLEEP</code> (im lặng chờ ngủ nếu không có SWC xin thêm)</td></tr>
      <tr><td><b>Tại Prepare Bus-Sleep</b></td><td colspan="2">Nếu bật <code>CanNmImmediateRestartEnabled = TRUE</code>, một lệnh <code>Nm_NetworkRequest()</code> giữa pha Prepare Bus-Sleep sẽ bắn ngay 1 gói NM PDU ở t=0ms để cứu toàn mạng quay lại Network Mode trước khi WaitBusSleep hết hạn!</td></tr>
    </tbody>
  </table>
</div>"""
            }
        ]
    },
    # ================= TAB 4 =================
    {
        "title": "4. 8-Byte PDU, CBV & NmStateReport",
        "topics": [
            {
                "label": "4.1. Cấu Trúc Khung 8-Byte CanNm PDU",
                "html": f"""
<div class="hb-card">
  <h3>4.1. Giải Phẫu Khung 8-Byte CanNm PDU Trên CAN Bus</h3>
  <p>Vị trí 2 byte điều khiển đầu tiên có thể hoán đổi linh hoạt thông qua <code>CanNmPduNidPosition</code> và <code>CanNmPduCbvPosition</code> (cố định sao cho không đè lên nhau). Các byte còn lại phân bổ cho Partial Networking, tín hiệu NmStateReport và COM User Data:</p>
  {DIAGRAMS["pdu_layout"]}
</div>"""
            },
            {
                "label": "4.2. Giải Mã 8 Bit Thanh Ghi CBV",
                "html": """
<div class="hb-card">
  <h3>4.2. Giải Mã Chi Tiết Từng Bit Trong Thanh Ghi CBV (`Control Bit Vector` — Byte 1)</h3>
  <table class="tbl">
    <thead><tr><th>Bit</th><th>Mask</th><th>Ký hiệu chuẩn</th><th>Module đặt &amp; Cơ chế kích hoạt</th><th>Hành vi ở đầu nhận (CanNm_RxIndication)</th></tr></thead>
    <tbody>
      <tr><td class="mono">Bit 0</td><td class="mono">0x01</td><td class="mono">RMR</td><td>Bật = 1 khi gọi <code>Nm_RepeatMessageRequest()</code>; tự xóa = 0 khi hết RepeatMessageTime</td><td>Kéo ECU nhận từ Normal Op / Ready Sleep về Repeat Message và gọi <code>Nm_RepeatMessageIndication()</code>.</td></tr>
      <tr><td class="mono">Bit 1-2</td><td class="mono">0x06</td><td class="mono">Reserved</td><td>Luôn giữ = 0 theo SWS_CanNm_00045</td><td>Bỏ qua ở đầu nhận.</td></tr>
      <tr><td class="mono">Bit 3</td><td class="mono">0x08</td><td class="mono">SRB / CWU</td><td><b>Đa năng:</b> (1) Nm Coordinator đặt = 1 qua <code>CanNm_SetSleepReadyBit(TRUE)</code>; (2) ECU nguồn đặt = 1 báo Car WakeUp</td><td>(1) Nếu Passive Coord ➔ gọi <code>Nm_CoordReadyToSleepIndication()</code>; (2) Nếu CarWakeUp qua Filter ➔ gọi <code>Nm_CarWakeUpIndication()</code> ➔ <code>BswM</code>!</td></tr>
      <tr><td class="mono">Bit 4</td><td class="mono">0x10</td><td class="mono">AWB</td><td>Bật = 1 khi Active Wakeup (<code>Nm_NetworkRequest</code>), giữ suốt Network Mode và chỉ xóa = 0 ở Prepare Bus-Sleep</td><td>Giúp phân tích chuẩn đoán/Gateway biết node nào vừa chủ động đánh thức xe!</td></tr>
      <tr><td class="mono">Bit 5</td><td class="mono">0x20</td><td class="mono">PNSR</td><td>Bật = 1 khi ComM gọi <code>Nm_RequestSynchronizedPncShutdown()</code> (R20-11+)</td><td>CanNm kích hoạt <code>Nm_ForwardSynchronizedPncShutdown()</code> báo lên ComM tắt đồng bộ PNC.</td></tr>
      <tr><td class="mono">Bit 6</td><td class="mono">0x40</td><td class="mono">PNI</td><td>Luôn bằng 1 khi kênh bật <code>CanNmPnEnabled = TRUE</code></td><td>Cho phép bộ lọc PN đọc 2+ byte PNC Vector (nếu PNI=0, gói bị bỏ qua khi đang bật PN!).</td></tr>
      <tr><td class="mono">Bit 7</td><td class="mono">0x80</td><td class="mono">Reserved</td><td>Luôn giữ = 0 theo SWS_CanNm_00045</td><td>Bỏ qua ở đầu nhận.</td></tr>
    </tbody>
  </table>
</div>"""
            },
            {
                "label": "4.3. Vòng Tròn NmStateReport (SWS_Nm_00154)",
                "html": f"""
<div class="hb-card">
  <h3>4.3. Vòng Tròn Khép Kín `NmStateReport`: `CanNm ➔ Nm ➔ COM ➔ PduR ➔ CanNm`</h3>
  <p>Đây là một trong những ví dụ rõ nhất cho sự phối hợp giữa <b>Nm</b> và <b>CanNm</b> thông qua <b>AUTOSAR COM</b> (Kịch bản <b>S4</b>):</p>
  {DIAGRAMS["nms_loop"]}
</div>"""
            },
            {
                "label": "4.4. User Data: SetUserData vs TriggerTransmit",
                "html": """
<div class="hb-card">
  <h3>4.4. So Sánh 2 Cơ Chế Quản Lý User Data (`NmComUserDataSupport = TRUE` vs `FALSE`)</h3>
  <table class="tbl">
    <thead><tr><th>Thuộc tính</th><th>Cơ chế cũ (`NmComUserDataSupport = FALSE`)</th><th>Cơ chế chuẩn R22-11 (`NmComUserDataSupport = TRUE`)</th></tr></thead>
    <tbody>
      <tr><td><b>Cách ghi dữ liệu</b></td><td>Ứng dụng phải gọi thủ công <code>Nm_SetUserData(ch, ptr)</code> ➔ <code>CanNm_SetUserData()</code></td><td>SWC hoặc Nm ghi tín hiệu qua COM (<code>Rte_Write</code> / <code>Com_SendSignal</code>) như mọi frame CAN thông thường!</td></tr>
      <tr><td><b>Đồng bộ thời điểm Tx</b></td><td>Phải quản lý vùng nhớ đệm riêng; dễ bị dữ liệu cũ nếu không gọi kịp</td><td>Ngay trước khi phát khung NM, CanNm gọi <code>PduR_CanNmTriggerTransmit()</code> ➔ <code>Com_TriggerTransmit()</code> kéo dữ liệu tươi nhất (gồm cả Byte 4 NMS!)</td></tr>
      <tr><td><b>Tính khả dụng Nm_SetUserData</b></td><td>Khả dụng (E_OK)</td><td>Bị khóa / không dùng theo <code>SWS_CanNm_00327</code> để tránh ghi đè dữ liệu từ COM.</td></tr>
    </tbody>
  </table>
</div>"""
            }
        ]
    },
    # ================= TAB 5 =================
    {
        "title": "5. Partial Net, EIRA/ERA & Sync PNC",
        "topics": [
            {
                "label": "5.1. Nguyên Lý Partial Networking & PN Filter",
                "html": f"""
<div class="hb-card">
  <h3>5.1. Bộ Lọc Partial Networking (`CanNmPnEnabled`) &amp; `CanNm_ConfirmPnAvailability`</h3>
  <p>Partial Networking (PN) cho phép các ECU không liên quan tiếp tục ngủ ngay cả khi xe đang có lưu thông trên CAN Bus cho một cụm chức năng khác (ví dụ đang Sạc pin <code>PNC #16</code> thì các ECU Gương/Ghế <code>PNC #20</code> vẫn ngủ say tiết kiệm ắc quy):</p>
  {DIAGRAMS["pn_eira_era"]}
  <ul>
    <li><b>Điều kiện mở khóa bộ lọc:</b> Sau khi CAN Controller &amp; Transceiver sẵn sàng, <code>CanSM</code> bắt buộc gọi <code>CanNm_ConfirmPnAvailability(ch)</code> [SWS_CanNm_00404] thì CanNm mới bật bộ lọc PN.</li>
    <li><b>Lọc gói tin Rx:</b> Mọi gói NM đến phải có <code>CBV Bit 6 (PNI) == 1</code> và phép <code>(RxPNI &amp; CanNmPnFilterMaskByte) != 0</code>. Nếu không khớp, CanNm vứt bỏ gói tin ngay lập tức — không reset <code>CanNmTimeoutTime</code> [SWS_CanNm_00409].</li>
  </ul>
</div>"""
            },
            {
                "label": "5.2. Vector ERA / EIRA & CanNmPnResetTime",
                "html": """
<div class="hb-card">
  <h3>5.2. Cơ Chế Tính Toán `EIRA` / `ERA` &amp; Bộ Đếm `CanNmPnResetTime`</h3>
  <table class="tbl">
    <thead><tr><th>Khái niệm</th><th>Phạm vi tổng hợp</th><th>Vai trò đối với ComM &amp; ECU Gateway</th></tr></thead>
    <tbody>
      <tr><td class="mono">EIRA (External &amp; Internal Request Array)</td><td>Gộp chung Tx nội bộ + Rx bên ngoài trên TẤT CẢ các kênh</td><td>CanNm gửi qua <code>PduR_CanNmRxIndication()</code> lên <code>ComM</code> để cho ECU cục bộ biết cụm PNC nào vẫn đang được mạng yêu cầu duy trì thức.</td></tr>
      <tr><td class="mono">ERA (External Request Array)</td><td>Tách riêng theo TỪNG kênh, CHỈ phản ánh Rx từ bên ngoài</td><td>Dùng riêng cho Gateway (`CanNmPnEraCalcEnabled = TRUE`): nếu bên Ch0 có ECU ngoài xin PNC #16, Gateway đọc ERA_Ch0 để chuyển tiếp yêu cầu sang nhánh Ch1!</td></tr>
      <tr><td class="mono">CanNmPnResetTime</td><td>1500 ms (điển hình)</td><td>Mỗi bit trong EIRA/ERA đều đi kèm bộ đếm reset. Nếu quá <code>CanNmPnResetTime</code> không còn gói NM nào mang bit PNC đó bằng 1, CanNm xóa bit đó về 0 và báo ComM tắt PNC tương ứng.</td></tr>
    </tbody>
  </table>
</div>"""
            },
            {
                "label": "5.3. Synchronized PNC Shutdown (R22-11+)",
                "html": f"""
<div class="hb-card">
  <h3>5.3. Tắt Đồng Bộ Cụm PNC 2 Chiều (`Synchronized PNC Shutdown` — R20-11 / R22-11 / R23-11)</h3>
  <p>Trong mạng cây PNC có Gateway làm Coordinator, nếu các ECU tự tắt PNC theo <code>PnResetTime</code> lệch pha nhau thì ECU tắt chậm phát gói cuối cùng có thể vô tình đánh thức lại ECU vừa tắt (hiện tượng <b>Wakeup Ping-Pong</b>). Chuẩn R20-11+ bổ sung cơ chế 2 chiều giữa <code>ComM</code>, <code>Nm</code> và <code>CanNm</code> (Kịch bản <b>S13</b>):</p>
  {DIAGRAMS["sync_pnc_shdn"]}
</div>"""
            },
            {
                "label": "5.4. Car WakeUp & UDS 0x28 CommControl",
                "html": """
<div class="hb-card">
  <h3>5.4. Đánh Thức Toàn Xe (`Car WakeUp`) &amp; Kiểm Soát Chẩn Đoán `UDS 0x28`</h3>
  <div class="hb-grid2">
    <div class="insp-card">
      <div class="insp-h">🚗 Car WakeUp Qua CanNm ➔ Nm ➔ BswM (S7)</div>
      <p>Khi một ECU đầu não phát khung NM bật bit <code>CWU = 1</code> (CBV Bit 3):</p>
      <ul>
        <li><code>CanNm_RxIndication()</code> kiểm tra <code>CanNmCarWakeUpRxEnabled == TRUE</code> và đối chiếu <code>SNI == CanNmCarWakeUpFilterNodeId</code> [SWS_CanNm_00408].</li>
        <li>Nếu hợp lệ, CanNm gọi <code>Nm_CarWakeUpIndication(ch)</code> ➔ Nm đẩy lên <code>BswM_Nm_CarWakeUpIndication(ch)</code> [SWS_Nm_00250] để BswM ép đồng loạt toàn xe thức dậy!</li>
      </ul>
    </div>
    <div class="insp-card">
      <div class="insp-h">🔇 UDS 0x28 CommunicationControl (S14)</div>
      <p>Khi máy chẩn đoán nạp Flash gửi dịch vụ UDS <code>0x28 DisableRxAndTx</code>:</p>
      <ul>
        <li><code>Dcm / BswM</code> gọi <code>Nm_DisableCommunication(ch)</code> ➔ <code>CanNm_DisableCommunication(ch)</code> [SWS_CanNm_00170].</li>
        <li>CanNm lập tức <b>khóa phát Tx NM PDU</b> và <b>đóng băng NM-Timeout Timer</b> để ECU không rớt ngủ giữa chừng trong lúc bus im lặng nạp code!</li>
      </ul>
    </div>
  </div>
</div>"""
            }
        ]
    },
    # ================= TAB 6 =================
    {
        "title": "6. Từ Điển API R23-11, DET & ECUC",
        "topics": [
            {
                "label": "6.1. Bảng Đầy Đủ API Module Nm",
                "html": """
<div class="hb-card">
  <h3>6.1. Từ Điển API Chuẩn Module `Nm` (AUTOSAR SWS_Nm R22-11 / R23-11 — ModuleId 29)</h3>
  <table class="tbl">
    <thead><tr><th>Function Prototype</th><th>ServiceId</th><th>SWS Ref</th><th>Mô tả &amp; Hành vi chính</th></tr></thead>
    <tbody>
      <tr><td class="mono">void Nm_Init(const Nm_ConfigType* ConfigPtr)</td><td class="mono">0x00</td><td class="mono">SWS_Nm_00030</td><td>Khởi tạo module Nm &amp; bộ điều phối Coordinator Cluster.</td></tr>
      <tr><td class="mono">Std_ReturnType Nm_PassiveStartUp(NetworkHandleType nmHandle)</td><td class="mono">0x01</td><td class="mono">SWS_Nm_00030</td><td>Gọi CanNm_PassiveStartUp() khởi động thụ động với AWB=0.</td></tr>
      <tr><td class="mono">Std_ReturnType Nm_NetworkRequest(NetworkHandleType nmHandle)</td><td class="mono">0x02</td><td class="mono">SWS_Nm_00031</td><td>Giữ kênh thức qua CanNm_NetworkRequest() (bị chặn nếu PassiveMode=TRUE).</td></tr>
      <tr><td class="mono">Std_ReturnType Nm_NetworkRelease(NetworkHandleType nmHandle)</td><td class="mono">0x03</td><td class="mono">SWS_Nm_00032</td><td>Nhả kênh hoặc báo Coordinator sẵn sàng đóng kênh.</td></tr>
      <tr><td class="mono">Std_ReturnType Nm_DisableCommunication(NetworkHandleType nmHandle)</td><td class="mono">0x04</td><td class="mono">SWS_Nm_00033</td><td>UDS 0x28: Gọi CanNm_DisableCommunication() khóa Tx &amp; đóng băng Timeout.</td></tr>
      <tr><td class="mono">Std_ReturnType Nm_EnableCommunication(NetworkHandleType nmHandle)</td><td class="mono">0x05</td><td class="mono">SWS_Nm_00034</td><td>Mở lại truyền thông CanNm và khôi phục Timeout Timer.</td></tr>
      <tr><td class="mono">Std_ReturnType Nm_SetUserData(NetworkHandleType nmHandle, const uint8* dataPtr)</td><td class="mono">0x06</td><td class="mono">SWS_Nm_00033</td><td>Ghi User Data thủ công (khi NmComUserDataSupport=FALSE).</td></tr>
      <tr><td class="mono">Std_ReturnType Nm_RepeatMessageRequest(NetworkHandleType nmHandle)</td><td class="mono">0x09</td><td class="mono">SWS_Nm_00035</td><td>Yêu cầu CanNm phát CBV Bit 0 (RMR=1) điểm danh toàn mạng.</td></tr>
      <tr><td class="mono">Std_ReturnType Nm_GetNodeIdentifier / GetLocalNodeIdentifier(...)</td><td class="mono">0x0A/0B</td><td class="mono">SWS_Nm_00036/37</td><td>Đọc SNI của node từ xa gần nhất hoặc của ECU cục bộ.</td></tr>
      <tr><td class="mono">Std_ReturnType Nm_GetPduData(NetworkHandleType, uint8* pduDataPtr)</td><td class="mono">0x08</td><td class="mono">SWS_Nm_00040</td><td>Lấy toàn bộ 8 bytes của khung NM PDU mới nhất nhận được.</td></tr>
      <tr><td class="mono">Std_ReturnType Nm_GetState(NetworkHandleType, Nm_StateType*, Nm_ModeType*)</td><td class="mono">0x0E</td><td class="mono">SWS_Nm_00043</td><td>Trả về State và Mode hiện tại của CanNm bên dưới.</td></tr>
      <tr><td class="mono">Std_ReturnType Nm_CheckRemoteSleepIndication(NetworkHandleType, boolean*)</td><td class="mono">0x0D</td><td class="mono">SWS_Nm_00153</td><td>Kiểm tra cờ sẵn sàng ngủ của các node khác trên nhánh mạng.</td></tr>
      <tr><td class="mono">Std_ReturnType Nm_RequestSynchronizedPncShutdown(NetworkHandleType, PNCHandleType)</td><td class="mono">0x24</td><td class="mono">SWS_Nm_91009</td><td>R20-11+: Gửi yêu cầu tắt đồng bộ PNC xuống CanNm đặt PNSR=1.</td></tr>
      <tr><td class="mono">void Nm_MainFunction(void)</td><td class="mono">0x10</td><td class="mono">SWS_Nm_00118</td><td>Thực thi thuật toán NM Coordinator &amp; đếm NmShutdownDelayTimer.</td></tr>
    </tbody>
  </table>
</div>"""
            },
            {
                "label": "6.2. Bảng Đầy Đủ API & Callbacks CanNm",
                "html": """
<div class="hb-card">
  <h3>6.2. Từ Điển API &amp; Callbacks Chuẩn Module `CanNm` (AUTOSAR SWS_CanNm — ModuleId 31)</h3>
  <table class="tbl">
    <thead><tr><th>Function Prototype</th><th>SID</th><th>SWS Ref</th><th>Vai trò &amp; Tương tác</th></tr></thead>
    <tbody>
      <tr><td class="mono">void CanNm_Init(const CanNm_ConfigType* cannmConfigPtr)</td><td class="mono">0x00</td><td class="mono">SWS_CanNm_00208</td><td>Khởi tạo CanNm về NM_MODE_BUS_SLEEP / NM_STATE_BUS_SLEEP.</td></tr>
      <tr><td class="mono">Std_ReturnType CanNm_SetSleepReadyBit(NetworkHandleType, boolean nmSleepReadyBit)</td><td class="mono">0x17</td><td class="mono">SWS_CanNm_00342</td><td>Chỉ được Nm Coordinator gọi để bật/tắt CBV Bit 3 (SRB) &amp; phát gói đồng bộ.</td></tr>
      <tr><td class="mono">void CanNm_ConfirmPnAvailability(NetworkHandleType nmChannelHandle)</td><td class="mono">0x16</td><td class="mono">SWS_CanNm_00404</td><td>Do CanSM gọi khi vào FULLCOM để kích hoạt bộ lọc Partial Networking.</td></tr>
      <tr><td class="mono">Std_ReturnType CanNm_RequestSynchronizedPncShutdown(NetworkHandleType, PNCHandleType)</td><td class="mono">0x1B</td><td class="mono">SWS_CanNm_91003</td><td>Đặt CBV Bit 5 (PNSR=1) &amp; bit PNC vào payload truyền ngay lên bus.</td></tr>
      <tr><td class="mono">void CanNm_RxIndication(PduIdType RxPduId, const PduInfoType* PduInfoPtr)</td><td class="mono">0x42</td><td class="mono">SWS_CanNm_00231</td><td>Callback từ CanIf khi nhận gói NM; giải mã SNI, CBV (RMR/SRB/CWU/PNI/PNSR), EIRA/ERA.</td></tr>
      <tr><td class="mono">void CanNm_TxConfirmation(PduIdType TxPduId, Std_ReturnType result)</td><td class="mono">0x40</td><td class="mono">SWS_CanNm_00228</td><td>Callback từ CanIf xác nhận gói NM đã truyền xong; xóa MsgTimeoutTimer &amp; reload TimeoutTimer.</td></tr>
      <tr><td class="mono">Std_ReturnType CanNm_TriggerTransmit(PduIdType TxPduId, PduInfoType* PduInfoPtr)</td><td class="mono">0x41</td><td class="mono">SWS_CanNm_00328</td><td>Kéo toàn bộ 8-Byte NM PDU (đặc biệt khi dùng PduR TriggerTransmit cho COM UserData/NMS).</td></tr>
      <tr><td class="mono">void CanNm_MainFunction(void)</td><td class="mono">0x13</td><td class="mono">SWS_CanNm_00234</td><td>Chạy định kỳ xử lý 5 timers CanNm + RemoteSleepIndTimer &amp; State Machine.</td></tr>
    </tbody>
  </table>
</div>"""
            },
            {
                "label": "6.3. Bảng Mã Lỗi DET & Runtime Errors",
                "html": """
<div class="hb-card">
  <h3>6.3. Bảng Tra Cứu Mã Lỗi DET (`Development Error`) &amp; Runtime Errors (`Nm` vs `CanNm`)</h3>
  <table class="tbl">
    <thead><tr><th>Module (ModuleId)</th><th>Tên Hằng Lỗi</th><th>Mã Hex</th><th>Loại</th><th>Nguyên nhân &amp; Cách kiểm thử trong Bộ Mô Phỏng</th></tr></thead>
    <tbody>
      <tr><td><b>Nm (29 / 0x1D)</b></td><td class="mono">NM_E_UNINIT</td><td class="mono">0x00</td><td>DET</td><td>Gọi bất kỳ hàm <code>Nm_*</code> nào trước khi gọi <code>Nm_Init()</code> (Thử tắt checkbox Init ở Tab 1 &amp; bấm Req).</td></tr>
      <tr><td><b>Nm (29 / 0x1D)</b></td><td class="mono">NM_E_HANDLE_UNDEF</td><td class="mono">0x01</td><td>DET</td><td>Truyền <code>nmNetworkHandle</code> vượt quá <code>NM_NUMBER_OF_CHANNELS</code>.</td></tr>
      <tr><td><b>Nm (29 / 0x1D)</b></td><td class="mono">NM_E_PARAM_POINTER</td><td class="mono">0x02</td><td>DET</td><td>Truyền con trỏ <code>NULL_PTR</code> vào <code>Nm_GetState / GetNodeIdentifier / GetPduData</code>.</td></tr>
      <tr><td><b>CanNm (31 / 0x1F)</b></td><td class="mono">CANNM_E_UNINIT</td><td class="mono">0x01</td><td>DET</td><td>Gọi API CanNm khi chưa chạy <code>CanNm_Init()</code> (SWS_CanNm_00191).</td></tr>
      <tr><td><b>CanNm (31 / 0x1F)</b></td><td class="mono">CANNM_E_INVALID_CHANNEL</td><td class="mono">0x02</td><td>DET</td><td>Handle kênh truyền vào CanNm không tồn tại trong cấu hình.</td></tr>
      <tr><td><b>CanNm (31 / 0x1F)</b></td><td class="mono">CANNM_E_PARAM_POINTER</td><td class="mono">0x12</td><td>DET</td><td>Con trỏ null truyền vào API truy vấn hoặc <code>RxIndication</code>.</td></tr>
      <tr><td><b>CanNm (31 / 0x1F)</b></td><td class="mono">CANNM_E_NET_START_IND</td><td class="mono">0x04</td><td>Runtime</td><td>Nhận được khung <code>CanNm_RxIndication()</code> bất ngờ khi kênh đang ở <code>NM_MODE_BUS_SLEEP</code> (Xem Kịch bản S2).</td></tr>
      <tr><td><b>CanNm (31 / 0x1F)</b></td><td class="mono">CANNM_E_NETWORK_TIMEOUT</td><td class="mono">0x11</td><td>Runtime</td><td><code>CanNmMsgTimeoutTime</code> hết hạn mà không nhận được <code>TxConfirmation</code> ➔ Bắn <code>Nm_TxTimeoutException()</code> (Xem S14).</td></tr>
    </tbody>
  </table>
</div>"""
            },
            {
                "label": "6.4. Từ Điển 46 Tham Số ECUC Nm + CanNm",
                "html": """
<div class="hb-card">
  <h3>6.4. Tổng Hợp Nhóm Tham Số ECUC Kết Hợp `Nm` &amp; `CanNm` (Hover &gt;1s Ở Cột Trái)</h3>
  <table class="tbl">
    <thead><tr><th>Sub-Tab ECUC</th><th>Container Chuẩn AUTOSAR</th><th>Các tham số tiêu biểu đã được số hóa tương tác</th></tr></thead>
    <tbody>
      <tr><td><b>1. Nm Intf/Rpt</b></td><td class="mono">NmGlobalConfig / NmChannelConfig</td><td><code>NmCanNmInitialized</code>, <code>NmDevErrorDetect</code>, <code>NmBusType</code>, <code>NmPassiveModeEnabled</code>, <code>NmStateChangeIndEnabled</code>, <code>NmStateReportEnabled</code>, <code>NmStateReportSignalRef</code></td></tr>
      <tr><td><b>2. Nm Coord</b></td><td class="mono">NmGlobalFeatures / NmChannelConfig</td><td><code>NmCoordinatorSupportEnabled</code>, <code>NmCycletimeMainFunction</code>, <code>NmGlobalCoordinatorTime</code>, <code>NmActiveCoordinator</code>, <code>NmChannelSleepMaster</code>, <code>NmSynchronizingNetwork</code></td></tr>
      <tr><td><b>3. CanNm Timers</b></td><td class="mono">CanNmChannelConfig</td><td><code>CanNmMainFunctionPeriod</code>, <code>CanNmMsgCycleTime</code>, <code>CanNmMsgCycleOffset</code>, <code>CanNmRepeatMessageTime</code>, <code>CanNmTimeoutTime</code>, <code>CanNmWaitBusSleepTime</code>, <code>CanNmMsgTimeoutTime</code></td></tr>
      <tr><td><b>4. PDU/CBV/NID</b></td><td class="mono">CanNmChannelConfig / NmGlobalFeatures</td><td><code>CanNmNodeId</code>, <code>CanNmBaseCanId</code>, <code>CanNmPduNidPosition</code>, <code>CanNmPduCbvPosition</code>, <code>CanNmActiveWakeupBitEnabled</code>, <code>NmNodeIdEnabled</code>, <code>NmNodeDetectionEnabled</code></td></tr>
      <tr><td><b>5. RemSlp/Burst</b></td><td class="mono">NmGlobalFeatures / CanNmChannelConfig</td><td><code>NmRemoteSleepIndEnabled</code>, <code>CanNmRemoteSleepIndTime</code>, <code>NmRepeatMsgIndEnabled</code>, <code>NmPduRxIndicationEnabled</code>, <code>CanNmImmediateNmTransmissions</code>, <code>CanNmImmediateNmCycleTime</code>, <code>CanNmImmediateRestartEnabled</code>, <code>NmBusLoadReductionEnabled</code>, <code>CanNmMsgReducedTime</code></td></tr>
      <tr><td><b>6. PN/Sync/Diag</b></td><td class="mono">CanNmPnInfo / NmGlobalFeatures</td><td><code>CanNmPnEnabled</code>, <code>CanNmPnFilterMaskHex</code>, <code>CanNmPnResetTime</code>, <code>NmSynchronizedPncShutdownEnabled</code>, <code>NmComUserDataSupport</code>, <code>UserDataBytesHex</code>, <code>NmCarWakeUpRxEnabled</code>, <code>CanNmCarWakeUpFilterEnabled</code>, <code>CanNmCarWakeUpFilterNodeId</code>, <code>NmComControlEnabled</code></td></tr>
    </tbody>
  </table>
</div>"""
            }
        ]
    }
]

js_lines = [
    "// ================= PART 6: HANDBOOK (6x4 TOPICS) + LIVE-SEARCH ABBREVIATION TABLE & BOOTSTRAP =================",
    "",
    f"const HANDBOOK_DATA = {json.dumps(HANDBOOK_DATA, ensure_ascii=False, indent=2)};",
    "",
    """let currentHbTab1 = 0;
let currentHbTab2 = 0;
let currentAbbrCategory = "ALL";

function highlightMatch(text, query) {
  const safe = escapeHtmlSafe(text);
  if (!query) return safe;
  const escapedQ = query.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&");
  try {
    const re = new RegExp("(" + escapedQ + ")", "gi");
    return safe.replace(re, "<mark>$1</mark>");
  } catch (e) {
    return safe;
  }
}

function renderHandbook() {
  for (let i = 0; i < 7; i++) {
    const b = document.getElementById("hbTab1_" + i);
    if (b) b.classList.toggle("active", i === currentHbTab1);
  }
  const nav2 = document.getElementById("hbNav2");
  const abbrBar = document.getElementById("hbAbbrFilterBox");
  const area = document.getElementById("hbContentArea");
  if (!nav2 || !abbrBar || !area) return;

  if (currentHbTab1 === 6) {
    nav2.classList.add("hidden");
    abbrBar.classList.remove("hidden");
    filterAbbreviationTable();
    return;
  }

  nav2.classList.remove("hidden");
  abbrBar.classList.add("hidden");
  const sec = HANDBOOK_DATA[currentHbTab1] || HANDBOOK_DATA[0];
  if (currentHbTab2 >= sec.topics.length) currentHbTab2 = 0;

  nav2.innerHTML = sec.topics.map((t, idx) =>
    "<button class=\\"hb-tab2 " + (idx === currentHbTab2 ? "active" : "") + "\\" onclick=\\"switchHbTab2(" + idx + ")\\">" +
      escapeHtmlSafe(t.label) +
    "</button>"
  ).join("");

  area.innerHTML = sec.topics[currentHbTab2].html;
}

function switchHbTab1(idx) {
  currentHbTab1 = idx;
  currentHbTab2 = 0;
  renderHandbook();
}

function switchHbTab2(idx) {
  currentHbTab2 = idx;
  renderHandbook();
}

function setAbbrCategory(cat) {
  currentAbbrCategory = cat;
  ["ALL", "NM_COORD", "CANNM", "CBV_TMR", "PN_SYNC", "STACK"].forEach((c) => {
    const el = document.getElementById("catPill_" + c);
    if (el) el.classList.toggle("active", c === cat);
  });
  filterAbbreviationTable();
}

function filterAbbreviationTable() {
  const area = document.getElementById("hbContentArea");
  if (!area) return;
  const qEl = document.getElementById("abbrSearchInput");
  const query = qEl ? qEl.value.trim() : "";
  const ql = query.toLowerCase();

  const catLabels = {
    NM_COORD: "🧭 Nm Interface & Coord",
    CANNM: "🎛️ CanNm Core & States",
    CBV_TMR: "🔢 CBV Bits & Timers",
    PN_SYNC: "🌐 PN & Sync PNC",
    STACK: "🧩 AUTOSAR Stack"
  };

  const filtered = ABBREVIATIONS.filter((item) => {
    if (currentAbbrCategory !== "ALL" && item.cat !== currentAbbrCategory) return false;
    if (!ql) return true;
    return (
      item.abbr.toLowerCase().includes(ql) ||
      item.full.toLowerCase().includes(ql) ||
      item.desc.toLowerCase().includes(ql) ||
      item.cat.toLowerCase().includes(ql)
    );
  });

  const badge = document.getElementById("abbrCountBadge");
  if (badge) badge.textContent = filtered.length + " / " + ABBREVIATIONS.length + " thuật ngữ";

  const rowsHtml = filtered.length
    ? filtered.map((item) =>
        "<tr>" +
          "<td><strong class=\\"mono\\" style=\\"color:var(--pri)\\">" + highlightMatch(item.abbr, query) + "</strong></td>" +
          "<td><b>" + highlightMatch(item.full, query) + "</b></td>" +
          "<td><span class=\\"step-pill\\">" + escapeHtmlSafe(catLabels[item.cat] || item.cat) + "</span></td>" +
          "<td>" + highlightMatch(item.desc, query) + "</td>" +
        "</tr>"
      ).join("")
    : "<tr><td colspan=\\"4\\" style=\\"text-align:center;color:var(--mut);padding:18px\\">Không tìm thấy thuật ngữ phù hợp với \\"" + escapeHtmlSafe(query) + "\\".</td></tr>";

  area.innerHTML =
    "<div class=\\"hb-card\\">" +
      "<h3>Bảng Tra Cứu Thuật Ngữ &amp; Từ Viết Tắt AUTOSAR Nm &amp; CanNm (" + ABBREVIATIONS.length + " Thuật Ngữ)</h3>" +
      "<table class=\\"tbl\\">" +
        "<thead><tr><th style=\\"width:145px\\">Từ viết tắt / Term</th><th style=\\"width:255px\\">Tên đầy đủ (English Term)</th><th style=\\"width:170px\\">Phân nhóm</th><th>Giải thích kỹ thuật &amp; Vai trò (Nm &amp; CanNm)</th></tr></thead>" +
        "<tbody>" + rowsHtml + "</tbody>" +
      "</table>" +
    "</div>";
}

// ================= APPLICATION BOOTSTRAP =================
document.addEventListener("DOMContentLoaded", () => {
  syncConfigToDOM();
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
