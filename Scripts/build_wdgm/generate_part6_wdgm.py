import json
from pathlib import Path
from hb_diagrams_wdgm import DIAGRAMS

HANDBOOK_TABS = [
    {
        "title": "1. Kiến Trúc WdgM & WdgIf",
        "subs": [
            {
                "label": "1.1 Vai trò WdgM trong ISO 26262 / ASIL",
                "html": f"""
<div class="hb-card">
  <h3>Vai Trò Trung Tâm Của WdgM Trong Hệ Thống An Toàn Chức Năng AUTOSAR</h3>
  <p><b>Watchdog Manager (WdgM)</b> thuộc tầng <i>System Services</i>, đóng vai trò người gác cổng tin cậy về thời gian và luồng điều khiển (Program Flow). Theo chuẩn an toàn <b>ISO 26262 (ASIL-A đến ASIL-D)</b>, các SWC ứng dụng tuyệt đối không được phép tự ý gõ trực tiếp vào thanh ghi Watchdog phần cứng, vì nếu một SWC bị kẹt vòng lặp vô tận trong khi các SWC khác đã chết, Watchdog vẫn bị đánh lừa là hệ thống còn sống.</p>
  {DIAGRAMS["ecosystem"]}
  <ul>
    <li><b>Tách biệt giám sát &amp; phần cứng:</b> Các SWC/BSW chỉ báo cáo các điểm mốc <code>WdgM_CheckpointReached(SEID, CPID)</code>. Chỉ khi <code>WdgM_MainFunction()</code> xác nhận mọi Thực thể (SE) đều khỏe mạnh mới ra lệnh xuống <code>WdgIf_SetTriggerCondition()</code>.</li>
    <li><b>Đa tầng bảo vệ:</b> Giám sát cả tần suất (<i>Alive</i>), thời gian thực thi (<i>Deadline</i>) và trình tự câu lệnh (<i>Logical Graph</i>).</li>
  </ul>
</div>"""
            },
            {
                "label": "1.2 Phân lớp 3 tầng: WdgM ↔ WdgIf ↔ Wdg",
                "html": f"""
<div class="hb-card">
  <h3>Kiến Trúc Phân Lớp 3 Tầng Điều Khiển Đa Watchdog</h3>
  <p>Một ECU ô tô hiện đại (đặc biệt ECU cấp ASIL-C/D) thường sử dụng đồng thời <b>2 bộ Watchdog độc lập</b>: Watchdog nội bộ tích hợp trong vi điều khiển (<code>Wdg_Int</code>) và Watchdog cửa sổ ngoài nằm trên chip nguồn <code>SBC/PMIC</code> (<code>Wdg_Ext</code>). Lớp <b>Watchdog Interface (WdgIf)</b> ẩn giấu sự khác biệt phần cứng thông qua chỉ số <code>DeviceIndex</code>.</p>
  {DIAGRAMS["layered_wdg"]}
  <table class="tbl">
    <thead><tr><th>Tầng AUTOSAR</th><th>Module</th><th>Vai trò chính</th><th>API tiêu biểu</th></tr></thead>
    <tbody>
      <tr><td>System Services</td><td><b>WdgM</b></td><td>Đánh giá Alive/Deadline/Logical, tính Local/Global Status</td><td><code>WdgM_MainFunction()</code></td></tr>
      <tr><td>ECU Abstraction</td><td><b>WdgIf</b></td><td>Định tuyến lệnh Trigger &amp; Mode theo <code>DeviceIndex (0, 1)</code></td><td><code>WdgIf_SetTriggerCondition()</code></td></tr>
      <tr><td>MCAL / Complex Driver</td><td><b>Wdg_Int / Wdg_Ext</b></td><td>Nạp bộ đếm thanh ghi MCU hoặc truyền khung SPI sang chip SBC</td><td><code>Wdg_SetTriggerCondition()</code></td></tr>
    </tbody>
  </table>
</div>"""
            },
            {
                "label": "1.3 Supervised Entity (SE) & Checkpoint (CP)",
                "html": f"""
<div class="hb-card">
  <h3>Khái Niệm Supervised Entity (SE) &amp; Ánh Xạ Cổng RTE</h3>
  <p><b>Supervised Entity (SE)</b> là đơn vị logic được WdgM giám sát độc lập (ví dụ <code>SE_0: SWC_BrakeCtrl</code>, <code>SE_1: SWC_EngineTrq</code>, <code>SE_2: BSW_CanDiag</code>). Bên trong mã nguồn của mỗi SE, kỹ sư đặt các điểm mốc <b>Checkpoint (CP)</b> tại đầu, giữa và cuối Runnable.</p>
  {DIAGRAMS["se_cp_map"]}
  <ul>
    <li><b>Port-Defined Argument Value:</b> Khi SWC gọi qua RTE (<code>Rte_Call_SE_CheckpointReached(CP_ID)</code>), RTE tự động chèn sẵn mã <code>SEID</code> cấu hình cứng cho SWC đó, ngăn chặn lỗi một SWC gọi nhầm ID của SWC khác.</li>
    <li><b>Bật/tắt linh hoạt theo Mode:</b> Một SE có thể được kích hoạt ở <code>SLOW_MODE</code> và tự động tắt (<code>DEACTIVATED</code>) khi hệ thống sang <code>FAST_MODE</code> (như <code>SE_2</code> trong trình mô phỏng).</li>
  </ul>
</div>"""
            },
            {
                "label": "1.4 Bảng Phân Tích I/O Chi Tiết 10 Module",
                "html": f"""
<div class="hb-card">
  <h3>Tổng Hợp Luồng Input ➔ Processing ➔ Output Của WdgM &amp; Các Module Liên Quan</h3>
  {DIAGRAMS["io_flow"]}
  <table class="tbl">
    <thead><tr><th>Module</th><th>📥 Input lấy từ đâu</th><th>⚙️ Xử lý nội bộ</th><th>📤 Output route đến đâu</th></tr></thead>
    <tbody>
      <tr><td><b>SWC (SE0, SE1)</b></td><td>TimingEvent từ RTE &amp; ModeSwitch từ WdgM</td><td>Đặt CP0/CP1/CP2 trong thân Runnable</td><td><code>WdgM_CheckpointReached(SEID, CPID)</code></td></tr>
      <tr><td><b>BSW_CanDiag (SE2)</b></td><td>SchM Tick trong SLOW_MODE</td><td>Giám sát trực tiếp bằng C API không qua RTE</td><td><code>WdgM_CheckpointReached(2, CPID)</code></td></tr>
      <tr><td><b>RTE &amp; SchM</b></td><td>Port Call từ SWC &amp; Tick 10ms từ OS</td><td>Gắn SEID, gọi định kỳ MainFunction, khóa vùng găng</td><td><code>WdgM_MainFunction()</code>, <code>Rte_Switch()</code></td></tr>
      <tr><td><b>OS &amp; OsCounter</b></td><td>Hardware Timer 1ms &amp; lệnh Partition Reset</td><td>Cung cấp Timestamp Δt &amp; RestartApplication()</td><td><code>GetCounterValue()</code>, OS Partition Restart</td></tr>
      <tr><td><b>WdgM Core</b></td><td>Checkpoint, MainFunction, SetMode, OsCounter</td><td>3 thuật toán, Local/Global SM, chốt 1stExpiredSEID</td><td><code>WdgIf</code>, <code>BswM</code>, <code>Mcu</code>, <code>Dem</code>, <code>Det</code></td></tr>
      <tr><td><b>WdgIf &amp; Wdg</b></td><td><code>SetMode</code> &amp; <code>SetTriggerCondition</code> từ WdgM</td><td>Chuyển sang Driver nội bộ (0) hoặc SPI SBC (1)</td><td>Thanh ghi WDG_SR hoặc chân <code>NRES</code></td></tr>
      <tr><td><b>BswM / EcuM / Mcu</b></td><td>Yêu cầu Partition Reset / Immediate Reset</td><td>Điều phối <code>WdgM_SetMode</code> theo Startup/Run/Sleep</td><td><code>Mcu_PerformReset()</code>, OS Restart</td></tr>
      <tr><td><b>DEM &amp; DET</b></td><td>Báo cáo lỗi Production &amp; Development Error</td><td>Lưu <code>WDGM_E_MONITORING/SET_MODE</code> &amp; mã DET <code>0x10..0x1F</code></td><td>Event Memory / NvM &amp; Trace Debug</td></tr>
    </tbody>
  </table>
</div>"""
            },
        ],
    },
    {
        "title": "2. 3 Thuật Toán Giám Sát",
        "subs": [
            {
                "label": "2.1 Alive Supervision (EAI, SRC & Margin)",
                "html": f"""
<div class="hb-card">
  <h3>Thuật Toán Alive Supervision — Giám Sát Tần Suất Chạy Định Kỳ (SWS_WdgM_00074)</h3>
  <p>Alive Supervision kiểm tra xem một Thực thể có chạy đúng số lần kỳ vọng trong một chu kỳ tham chiếu hay không. Rất hiệu quả để bắt cả <b>Task bị treo/chậm</b> lẫn <b>Task bị lặp vô tận (Babbling Task)</b>.</p>
  {DIAGRAMS["alive_algo"]}
  <table class="tbl">
    <thead><tr><th>Tham số</th><th>Ý nghĩa kỹ thuật</th><th>Ví dụ trong trình mô phỏng (SE_0)</th></tr></thead>
    <tbody>
      <tr><td><code>WdgMExpectedAliveIndications (EAI)</code></td><td>Số xung Alive kỳ vọng trong 1 chu kỳ tham chiếu</td><td><code>2</code> xung</td></tr>
      <tr><td><code>WdgMSupervisionReferenceCycle (SRC)</code></td><td>Số chu kỳ <code>WdgM_MainFunction()</code> gom thành 1 kỳ kiểm tra</td><td><code>2</code> chu kỳ (= 20 ms)</td></tr>
      <tr><td><code>WdgMMinMargin / WdgMMaxMargin</code></td><td>Biên độ sai số thiếu/dư xung bù sai lệch đồng hồ OS</td><td><code>Min=1, Max=1</code> ⇒ Dải hợp lệ <code>[1 .. 3]</code></td></tr>
      <tr><td><code>WdgMFailedAliveSupervisionRefCycleTol</code></td><td>Số kỳ sai liên tiếp được phép ở tạm trạng thái <code>FAILED</code></td><td><code>1</code> kỳ (sang kỳ 2 lỗi mới thành <code>EXPIRED</code>)</td></tr>
    </tbody>
  </table>
</div>"""
            },
            {
                "label": "2.2 Deadline Supervision & Timeout Detection",
                "html": f"""
<div class="hb-card">
  <h3>Thuật Toán Deadline Supervision — Giám Sát Thời Hạn Thực Thi Δt (SWS_WdgM_00229)</h3>
  <p>Khác với Alive chỉ đếm số lần xuất hiện, Deadline Supervision đo chính xác khoảng thời gian thực thi <b>Δt = t_stop − t_start</b> bằng <code>GetCounterValue(OsCounter)</code> ngay bên trong hàm <code>WdgM_CheckpointReached()</code>.</p>
  {DIAGRAMS["deadline_algo"]}
  <ul>
    <li><b>Kiểm tra 2 đầu (Tmin ≤ Δt ≤ Tmax):</b> Nếu <code>Δt &lt; Tmin</code> chứng tỏ hàm bị lỗi bỏ qua vòng lặp tính toán an toàn; nếu <code>Δt &gt; Tmax</code> chứng tỏ bị trễ hạn thời gian thực.</li>
    <li><b>WdgMEnableDeadlineTimeoutDetection (R20-11+):</b> Nếu Task vừa chạy qua <code>CP_Start</code> rồi bị treo chết cứng không bao giờ tới <code>CP_Stop</code>, cờ này giúp <code>WdgM_MainFunction()</code> phát hiện ngay khi <code>(t_now − t_start) &gt; Tmax</code>!</li>
  </ul>
</div>"""
            },
            {
                "label": "2.3 Logical Supervision: Internal Graph",
                "html": f"""
<div class="hb-card">
  <h3>Thuật Toán Logical Supervision — Đồ Thị Luồng Điều Khiển Nội Bộ (SWS_WdgM_00252)</h3>
  <p>Logical Supervision (Program Flow Monitoring) đảm bảo CPU thực thi đúng trình tự các nhánh lệnh an toàn đã định nghĩa trước dưới dạng đồ thị định hướng <b>Initial CP ➔ Intermediate CPs ➔ Final CP</b>.</p>
  {DIAGRAMS["logical_internal"]}
  <ul>
    <li><b>Cơ chế ActivityFlag:</b> Khi đang Idle (<code>ActivityFlag == FALSE</code>), thực thể bắt buộc phải đi vào <code>WdgMInitialCheckpoint (CP_0)</code>. Sau khi mở đồ thị, mọi bước đi kế tiếp phải nằm trong bảng cạnh <code>WdgMInternalTransition</code> cho tới khi đóng tại <code>WdgMFinalCheckpoint (CP_2)</code>.</li>
    <li><b>Bắt lỗi tức thời:</b> Mọi hành vi nhảy cóc (<code>CP0 → CP2</code>), vào nhầm cổng (<code>CP1</code> khi chưa mở), hoặc rẽ nhánh trái phép lập tức báo <code>WDGM_INCORRECT</code> và nhảy thẳng lên <code>LOCAL_STATUS_EXPIRED</code>!</li>
  </ul>
</div>"""
            },
            {
                "label": "2.4 Logical Supervision: External Graph Đa SWC",
                "html": f"""
<div class="hb-card">
  <h3>External Graph — Bảo Vệ Chuỗi Tương Tác Xuyên Nhiều SWC (SWS_WdgM_00271)</h3>
  <p>Nhiều chức năng an toàn đòi hỏi dữ liệu phải đi qua nhiều SWC nối tiếp nhau (ví dụ <code>SWC_BrakeCtrl (SE_0)</code> tính lực phanh xong mới kích hoạt <code>SWC_EngineTrq (SE_1)</code> cắt mô-men động cơ). <b>External Graph</b> kết nối Checkpoint giữa nhiều Thực thể khác nhau thành một đồ thị thống nhất.</p>
  {DIAGRAMS["logical_external"]}
  <table class="tbl">
    <thead><tr><th>Tiêu chí so sánh</th><th>Alive Supervision</th><th>Deadline Supervision</th><th>Logical Supervision</th></tr></thead>
    <tbody>
      <tr><td>Mục tiêu bảo vệ</td><td>Tần suất chạy định kỳ</td><td>Thời gian thực thi Δt</td><td>Trình tự luồng điều khiển</td></tr>
      <tr><td>Thời điểm đánh giá</td><td><code>WdgM_MainFunction()</code> (mỗi SRC)</td><td>Tức thời tại <code>CheckpointReached()</code> + Timeout</td><td>Tức thời tại <code>CheckpointReached()</code></td></tr>
      <tr><td>Có trạng thái đệm <code>FAILED</code>?</td><td><b>Có</b> (nhờ <code>FailedAliveTol</code>)</td><td><b>Không (Tol = 0)</b> → thẳng <code>EXPIRED</code></td><td><b>Không (Tol = 0)</b> → thẳng <code>EXPIRED</code></td></tr>
    </tbody>
  </table>
</div>"""
            },
        ],
    },
    {
        "title": "3. Máy Trạng Thái Local & Global",
        "subs": [
            {
                "label": "3.1 Local Supervision Status (4 Trạng Thái)",
                "html": f"""
<div class="hb-card">
  <h3>Máy Trạng Thái Cục Bộ Của Từng Thực Thể (WdgM_LocalStatusType — SWS_WdgM_00201)</h3>
  <p>Mỗi Supervised Entity sở hữu một máy trạng thái cục bộ độc lập gồm 4 giá trị chuẩn hóa (ánh xạ vào 3 bit thấp của <b>Thanh A</b> trong trình mô phỏng):</p>
  {DIAGRAMS["local_sm"]}
  <table class="tbl">
    <thead><tr><th>Mã</th><th>Trạng thái</th><th>Điều kiện vào &amp; Khả năng phục hồi</th></tr></thead>
    <tbody>
      <tr><td><code>0x00</code></td><td><code>WDGM_LOCAL_STATUS_OK</code></td><td>Tất cả thuật toán đang bật đều đạt <code>WDGM_CORRECT</code>.</td></tr>
      <tr><td><code>0x01</code></td><td><code>WDGM_LOCAL_STATUS_FAILED</code></td><td>CHỈ xảy ra khi Alive lỗi nhưng <code>FailedCnt ≤ Tol</code>. Tự phục hồi về <code>OK</code> khi các kỳ sau đạt chuẩn!</td></tr>
      <tr><td><code>0x02</code></td><td><code>WDGM_LOCAL_STATUS_EXPIRED</code></td><td>Vượt Alive Tol hoặc sai 1 lần Deadline/Logical. <b>Kẹt vĩnh viễn</b> trừ khi Partition Reset!</td></tr>
      <tr><td><code>0x04</code></td><td><code>WDGM_LOCAL_STATUS_DEACTIVATED</code></td><td>Thực thể bị tắt trong <code>WdgMMode</code> hiện tại (hoặc trước Init).</td></tr>
    </tbody>
  </table>
</div>"""
            },
            {
                "label": "3.2 Tại sao chỉ Alive mới có trạng thái FAILED?",
                "html": f"""
<div class="hb-card">
  <h3>Nguyên Lý Thiết Kế: Tolerance Của Alive vs Zero-Tolerance Của Deadline/Logical</h3>
  <p>Đây là câu hỏi phỏng vấn và thiết kế hệ thống AUTOSAR kinh điển nhất về WdgM:</p>
  {DIAGRAMS["tol_vs_zero"]}
  <ul>
    <li><b>Với Alive Supervision:</b> Xung gọi từ Task ứng dụng chạy trên đồng hồ OS có thể bị lệch pha (beat phenomenon / jitter) với chu kỳ gọi <code>WdgM_MainFunction()</code>, dẫn tới một kỳ bị thiếu 1 xung. Vì vậy AUTOSAR cung cấp cả <code>Min/MaxMargin</code> và bộ đếm dung sai <code>FailedAliveSupervisionRefCycleTol</code> cùng trạng thái đệm <code>FAILED</code> để cho phép tự phục hồi.</li>
    <li><b>Với Deadline &amp; Logical Supervision:</b> Bản thân khoảng <code>[Tmin, Tmax]</code> đã chứa dung sai thời gian rồi, còn đồ thị Logical là các nhánh lệnh bất biến. Nếu đã vi phạm Deadline hoặc đi sai đường Logical thì chắc chắn phần mềm đã gặp lỗi nghiêm trọng → bắt buộc nhảy thẳng lên <code>EXPIRED</code>!</li>
  </ul>
</div>"""
            },
            {
                "label": "3.3 Global Supervision Status (5 Trạng Thái)",
                "html": f"""
<div class="hb-card">
  <h3>Máy Trạng Thái Toàn Cục Của ECU (WdgM_GlobalStatusType — SWS_WdgM_00214)</h3>
  <p>Trong mỗi chu kỳ <code>WdgM_MainFunction()</code>, sau khi cập nhật <code>LocalStatus</code> cho toàn bộ các SE, WdgM tổng hợp thành trạng thái toàn cục của cả ECU (ánh xạ vào 3 bit thấp của <b>Thanh B</b>):</p>
  {DIAGRAMS["global_sm"]}
  <ul>
    <li><b>Chú ý vai trò của <code>GLOBAL_STATUS_EXPIRED</code>:</b> Khi có SE hết hạn và <code>WdgMExpiredSupervisionCycleTol &gt; 0</code>, WdgM <b>chưa cắt Watchdog ngay</b> mà giữ ở <code>GLOBAL_EXPIRED</code> trong số chu kỳ Tol đó. Khoảng thời gian ân hạn quý giá này giúp ECU kịp thực hiện Shutdown khẩn cấp hoặc ghi dữ liệu lỗi vào <code>NvM / DEM</code> trước khi rơi xuống <code>STOPPED</code>!</li>
  </ul>
</div>"""
            },
            {
                "label": "3.4 Ma Trận Tổng Hợp Local → Global",
                "html": f"""
<div class="hb-card">
  <h3>Quy Tắc Tổng Hợp Worst-Case Wins Từ Các SE Lên Toàn Cục</h3>
  {DIAGRAMS["aggregation"]}
  <table class="tbl">
    <thead><tr><th>Tổ hợp Local Status các SE đang Active</th><th>Global Status (Nếu ExpTol &gt; 0)</th><th>Global Status (Nếu ExpTol == 0)</th><th>Hành động WdgIf</th></tr></thead>
    <tbody>
      <tr><td>Tất cả <code>OK</code> (hoặc <code>DEACTIVATED</code>)</td><td><code>GLOBAL_STATUS_OK</code></td><td><code>GLOBAL_STATUS_OK</code></td><td>Nuôi bình thường (<code>Timeout &gt; 0</code>)</td></tr>
      <tr><td>Ít nhất 1 <code>FAILED</code>, không có <code>EXPIRED</code></td><td><code>GLOBAL_STATUS_FAILED</code></td><td><code>GLOBAL_STATUS_FAILED</code></td><td>Vẫn tiếp tục nuôi (<code>Timeout &gt; 0</code>)</td></tr>
      <tr><td>Có ít nhất 1 <code>EXPIRED</code> (đang trong ân hạn)</td><td><code>GLOBAL_STATUS_EXPIRED</code></td><td><code>GLOBAL_STATUS_STOPPED</code></td><td>Ân hạn vẫn nuôi; vào <code>STOPPED</code> cắt về <code>0</code>!</td></tr>
    </tbody>
  </table>
</div>"""
            },
        ],
    },
    {
        "title": "4. Nuôi WdgIf, Modes & Window",
        "subs": [
            {
                "label": "4.1 Bản chất WdgIf_SetTriggerCondition(Timeout)",
                "html": f"""
<div class="hb-card">
  <h3>Bản Chất Cơ Chế Nuôi Watchdog Trong AUTOSAR (Timeout Refresh)</h3>
  <p>Một hiểu lầm phổ biến là nghĩ WdgM trực tiếp đảo chân GPIO mỗi lần chạy. Thực tế theo chuẩn <b>AUTOSAR Wdg/WdgIf</b>, hàm <code>WdgM_MainFunction()</code> truyền vào một khoảng thời gian <b>Timeout (ms)</b> (<code>WdgMTriggerConditionValue</code>) xuống <code>WdgIf_SetTriggerCondition(DeviceIndex, Timeout)</code>.</p>
  {DIAGRAMS["trigger_cond"]}
  <ul>
    <li><b>Khi hệ thống khỏe mạnh:</b> Cứ mỗi 10ms, WdgM nạp lại Timeout = 20ms (lớn hơn 10ms nên bộ đếm phần cứng không bao giờ chạm 0ms).</li>
    <li><b>Khi vào <code>GLOBAL_STATUS_STOPPED</code>:</b> WdgM gọi <code>WdgIf_SetTriggerCondition(Idx, 0)</code> [SWS_WdgM_00223], ép bộ đếm phần cứng hết hạn tức thì để kéo Reset ECU!</li>
  </ul>
</div>"""
            },
            {
                "label": "4.2 Chuyển Chế Độ WdgM_SetMode (SLOW / FAST / OFF)",
                "html": f"""
<div class="hb-card">
  <h3>Điều Phối Chế Độ Hoạt Động Qua WdgM_SetMode() (SWS_WdgM_00154)</h3>
  <p>Tùy theo pha vận hành của xe, <code>EcuM / BswM</code> gọi <code>WdgM_SetMode(Mode)</code> để thay đổi đồng thời cả cấu hình giám sát các SE lẫn tốc độ của Watchdog phần cứng.</p>
  {DIAGRAMS["mode_switch"]}
  <ul>
    <li><b>SLOW_MODE (50ms):</b> Dùng trong pha khởi động (Startup) khi <code>NvM_ReadAll()</code> mất nhiều thời gian.</li>
    <li><b>FAST_MODE (20ms):</b> Dùng trong pha vận hành chính (RUN), tự động chuyển các thực thể khởi tạo (như <code>SE_2: BSW_CanDiag</code>) sang <code>DEACTIVATED</code>.</li>
  </ul>
</div>"""
            },
            {
                "label": "4.3 Nguyên Lý Window Watchdog Trên Chip Nguồn SBC",
                "html": f"""
<div class="hb-card">
  <h3>Window Watchdog: Closed Window (Cấm Kích Sớm) vs Open Window</h3>
  <p>Khác với Watchdog thông thường chỉ bắt lỗi kích quá trễ, <b>Window Watchdog</b> trên chip nguồn <code>SBC/PMIC</code> chia mỗi chu kỳ làm 2 vùng: <b>Closed Window</b> ở đầu chu kỳ và <b>Open Window</b> ở nửa sau.</p>
  {DIAGRAMS["window_wdg"]}
  <ul>
    <li>Nếu xung CPU bị lỗi dao động thạch anh chạy quá nhanh hoặc vòng lặp gọi Trigger sớm hơn <code>ClosedWindowMs</code> (VD &lt; 5ms), SBC lập tức kéo chân <code>NRES</code> Reset vi điều khiển!</li>
    <li>Với cấu hình chuẩn (<code>SupervisionCycle = 10ms</code>, <code>ClosedWindow = 5ms</code>, <code>Timeout = 20ms</code>), mỗi nhịp 10ms rơi chính xác vào giữa vùng <code>Open Window [5..20ms]</code>.</li>
  </ul>
</div>"""
            },
            {
                "label": "4.4 Cơ Chế Phòng Vệ WdgMDefensiveBehavior",
                "html": f"""
<div class="hb-card">
  <h3>Phòng Vệ An Toàn ASIL: Cấm Tắt Watchdog Trái Phép (SWS_WdgM_00031)</h3>
  <p>Trong các ECU an toàn cao (như Hệ thống phanh ABS/ESP, Trợ lực lái EPS), tuyệt đối không được phép để lỗi phần mềm vô tình gọi <code>WdgM_SetMode(OFF_MODE)</code> hay <code>WdgM_DeInit()</code> làm mất bảo vệ Watchdog khi xe đang chạy.</p>
  <table class="tbl">
    <thead><tr><th>Cấu hình <code>WdgMDefensiveBehavior</code></th><th>Gọi <code>WdgM_SetMode(OFF_MODE)</code> hoặc <code>WdgM_DeInit()</code></th><th>Kết quả &amp; Báo lỗi DET</th></tr></thead>
    <tbody>
      <tr><td><b>TRUE (Bật phòng vệ — Mặc định ASIL)</b></td><td>Bị từ chối hoàn toàn (<code>return E_NOT_OK</code>)</td><td>Watchdog giữ nguyên hoạt động; bắn <code>DET: WDGM_E_DISABLE_NOT_ALLOWED (0x15)</code></td></tr>
      <tr><td><b>FALSE (Cho phép OFF)</b></td><td>Chấp nhận chuyển <code>WdgIf_SetMode(WDGIF_OFF_MODE)</code></td><td>Chỉ tắt được khi <code>GlobalStatus == OK/FAILED</code> (không có SE nào EXPIRED)</td></tr>
    </tbody>
  </table>
</div>"""
            },
        ],
    },
    {
        "title": "5. Phục Hồi, Reset & 1stExpiredSEID",
        "subs": [
            {
                "label": "5.1 Chốt Thủ Phạm Đầu Tiên: FirstExpiredSEID",
                "html": f"""
<div class="hb-card">
  <h3>Cơ Chế Lưu Vết Nguyên Nhân Reset: WdgM_FirstExpiredSEID &amp; Double-Inverted RAM</h3>
  <p>Khi một lỗi phần mềm khiến ECU bị Watchdog Reset, nếu không lưu lại manh mối trước khi mất nguồn, kỹ sư sẽ không thể biết Thực thể nào trong hàng chục SWC đã gây ra sự cố đầu tiên.</p>
  {DIAGRAMS["first_exp_ram"]}
  <ul>
    <li><b>First-Latch Only:</b> <code>WdgM_FirstExpiredSEID</code> chỉ ghi nhận <b>duy nhất SE đầu tiên</b> rơi vào <code>EXPIRED</code>. Mọi SE khác chết dây chuyền sau đó không được ghi đè lên biến này!</li>
    <li><b>Chống nhiễu RAM khi Reset (SWS_WdgM_00215):</b> Biến được đặt trong vùng <code>NO_INIT_RAM</code> (không bị Startup code xóa về 0 khi Reset) và lưu song song 2 bản: <code>SEID</code> và bù đảo bit <code>~SEID</code>. Khi khởi động lại, hàm <code>WdgM_GetFirstExpiredSEID()</code> kiểm tra <code>(SEID == ~InvSEID)</code> để xác nhận dữ liệu đáng tin cậy!</li>
  </ul>
</div>"""
            },
            {
                "label": "5.2 Khôi Phục Cục Bộ: OS Partition Reset",
                "html": f"""
<div class="hb-card">
  <h3>Cô Lập Sự Cố Với OS Partition Reset vs Immediate MCU Reset</h3>
  <p>Trong kiến trúc đa phân vùng (Multi-Partition / Memory Protection), không phải mọi lỗi phần mềm đều cần đánh sập toàn bộ ECU.</p>
  {DIAGRAMS["part_reset"]}
  <ul>
    <li><b>OS Partition Reset (<code>WdgMPartitionResetEnabled = TRUE</code>):</b> Khi <code>SE_0</code> lỗi, WdgM gọi <code>BswM_WdgM_RequestPartitionReset(OsApp_ASILD_Brake)</code> [SWS_WdgM_00233]. OS chỉ khởi động lại phân vùng chứa <code>SE_0</code>, đưa <code>SE_0</code> về lại <code>OK</code> trong khi <code>SE_1</code> vẫn tiếp tục vận hành!</li>
    <li><b>Immediate MCU Reset (<code>WdgMImmediateReset = TRUE</code>):</b> Khi <code>GlobalStatus</code> vào <code>STOPPED</code>, thay vì chờ phần cứng Watchdog đếm hết timeout, WdgM gọi thẳng <code>Mcu_PerformReset()</code> [SWS_WdgM_00134] để rút ngắn thời gian phục hồi xuống mức tối thiểu.</li>
  </ul>
</div>"""
            },
            {
                "label": "5.3 Reset Khẩn Cấp WdgM_PerformReset & WdgM_DeInit",
                "html": """
<div class="hb-card">
  <h3>Dịch Vụ Reset Chủ Động (WdgM_PerformReset) &amp; Tắt An Toàn (WdgM_DeInit)</h3>
  <table class="tbl">
    <thead><tr><th>Hàm API</th><th>Điều kiện thực thi</th><th>Hành vi chuẩn AUTOSAR</th></tr></thead>
    <tbody>
      <tr><td><code>WdgM_PerformReset()</code><br><i>[SWS_WdgM_00133]</i></td><td>Gọi khi một SWC phát hiện lỗi nghiêm trọng không thể khắc phục</td><td>Bỏ qua mọi Tolerance, đẩy thẳng <code>GlobalStatus = STOPPED</code>, cắt xung <code>WdgIf(0)</code> và ép Reset MCU ngay lập tức!</td></tr>
      <tr><td><code>WdgM_DeInit()</code><br><i>[SWS_WdgM_00261]</i></td><td>Chỉ hợp lệ khi <code>DefensiveBehavior == FALSE</code> và <code>GlobalStatus == OK / FAILED</code></td><td>Đưa toàn bộ SE và Global về <code>DEACTIVATED (0x04)</code>, đặt <code>WdgIf_SetMode(OFF_MODE)</code> trước khi EcuM cắt nguồn ngủ ECU.</td></tr>
    </tbody>
  </table>
</div>"""
            },
            {
                "label": "5.4 Báo Cáo Sự Kiện Chẩn Đoán DEM",
                "html": """
<div class="hb-card">
  <h3>Phối Hợp Lưu Lỗi Vào Bộ Nhớ Chẩn Đoán DEM (SWS_WdgM_00375 &amp; 00142)</h3>
  <p>WdgM định nghĩa 2 mã Extended Production Error tiêu chuẩn báo sang <b>Diagnostic Event Manager (DEM)</b> để kỹ thuật viên đọc lại mã lỗi UDS/DTC khi xe vào xưởng bảo dưỡng:</p>
  <table class="tbl">
    <thead><tr><th>Mã sự kiện DEM</th><th>Khi nào báo <code>DEM_EVENT_STATUS_FAILED</code>?</th><th>Ý nghĩa chẩn đoán</th></tr></thead>
    <tbody>
      <tr><td><code>WDGM_E_MONITORING</code></td><td>Ngay khi <code>GlobalStatus</code> chuyển sang <code>WDGM_GLOBAL_STATUS_STOPPED</code></td><td>Xác nhận ECU bị reset là do một Thực thể giám sát vi phạm Alive, Deadline hoặc Logical Supervision.</td></tr>
      <tr><td><code>WDGM_E_SET_MODE</code></td><td>Khi lời gọi xuống <code>WdgIf_SetMode()</code> trả về <code>E_NOT_OK</code></td><td>Cảnh báo lỗi giao tiếp phần cứng xuống Watchdog (VD đứt đường truyền SPI tới chip nguồn SBC).</td></tr>
    </tbody>
  </table>
</div>"""
            },
        ],
    },
    {
        "title": "6. Chuẩn API R23-11, DET & ECUC",
        "subs": [
            {
                "label": "6.1 Danh sách API chuẩn R20-11 / R22-11 / R23-11",
                "html": f"""
<div class="hb-card">
  <h3>Bảng Tra Cứu Hàm API Chuẩn AUTOSAR Classic WdgM (Release Mới Nhất)</h3>
  {DIAGRAMS["api_evolution"]}
  <table class="tbl">
    <thead><tr><th>ServiceId</th><th>Prototype Hàm Chuẩn AUTOSAR</th><th>Mô tả &amp; Yêu cầu SWS</th></tr></thead>
    <tbody>
      <tr><td><code>0x00</code></td><td><code>void WdgM_Init(const WdgM_ConfigType* ConfigPtr)</code></td><td>Khởi tạo WdgM, cấu hình mode đầu tiên và các SE [SWS_WdgM_00151].</td></tr>
      <tr><td><code>0x01</code></td><td><code>void WdgM_DeInit(void)</code></td><td>Tắt WdgM về DEACTIVATED khi đi ngủ [SWS_WdgM_00261].</td></tr>
      <tr><td><code>0x03</code></td><td><code>Std_ReturnType WdgM_SetMode(WdgM_ModeType Mode)</code></td><td>Chuyển chế độ WdgMMode &amp; WdgIf_SetMode [SWS_WdgM_00154].</td></tr>
      <tr><td><code>0x0B</code></td><td><code>Std_ReturnType WdgM_GetMode(WdgM_ModeType* Mode)</code></td><td>Đọc chế độ giám sát hiện tại [SWS_WdgM_00168].</td></tr>
      <tr><td><code>0x0E</code></td><td><code>Std_ReturnType WdgM_CheckpointReached(WdgM_SupervisedEntityIdType SEID, WdgM_CheckpointIdType CPID)</code></td><td>Báo mốc kiểm tra cho cả Alive, Deadline &amp; Logical [SWS_WdgM_00263].</td></tr>
      <tr><td><code>0x0C</code></td><td><code>Std_ReturnType WdgM_GetLocalStatus(WdgM_SupervisedEntityIdType SEID, WdgM_LocalStatusType* Status)</code></td><td>Đọc trạng thái cục bộ của 1 SE [SWS_WdgM_00169].</td></tr>
      <tr><td><code>0x0D</code></td><td><code>Std_ReturnType WdgM_GetGlobalStatus(WdgM_GlobalStatusType* Status)</code></td><td>Đọc trạng thái tổng hợp của toàn ECU [SWS_WdgM_00175].</td></tr>
      <tr><td><code>0x0F</code></td><td><code>void WdgM_PerformReset(void)</code></td><td>Ép cắt Watchdog &amp; Reset ECU ngay lập tức [SWS_WdgM_00133].</td></tr>
      <tr><td><code>0x10</code></td><td><code>Std_ReturnType WdgM_GetFirstExpiredSEID(WdgM_SupervisedEntityIdType* SEID)</code></td><td>Đọc ID thủ phạm đầu tiên sau Reset [SWS_WdgM_00349].</td></tr>
      <tr><td><code>0x08</code></td><td><code>void WdgM_MainFunction(void)</code></td><td>Hàm chu kỳ đánh giá Alive, Timeout, State &amp; Trigger WdgIf [SWS_WdgM_00159].</td></tr>
    </tbody>
  </table>
</div>"""
            },
            {
                "label": "6.2 Tiến hóa API từ AUTOSAR 3.x lên 4.x / R23-11",
                "html": """
<div class="hb-card">
  <h3>Thay Đổi Quan Trọng Qua Các Phiên Bản AUTOSAR</h3>
  <ul>
    <li><b>Loại bỏ <code>WdgM_UpdateAliveCounter()</code> (AUTOSAR 3.x):</b> Từ AUTOSAR 4.0 trở đi (và xuyên suốt R20-11, R22-11, R23-11), hàm cũ chỉ đếm Alive đã bị loại bỏ hoàn toàn và hợp nhất vào duy nhất <code>WdgM_CheckpointReached(SEID, CPID)</code> để một điểm mốc có thể kích hoạt đồng thời cả Alive, Deadline lẫn Logical Graph.</li>
    <li><b>Bổ sung <code>WdgMEnableDeadlineTimeoutDetection</code> (R20-11+):</b> Khắc phục lỗ hổng của các bản 4.x đời đầu khi Task bị treo cứng ngay sau <code>CP_Start</code> mà không bao giờ gọi <code>CP_Stop</code>.</li>
    <li><b>Chuẩn hóa Multi-Partition &amp; Multicore:</b> Hỗ trợ mỗi phân vùng/core giám sát độc lập thông qua <code>WdgMOsApplicationRef</code> và <code>BswM_WdgM_RequestPartitionReset()</code>.</li>
  </ul>
</div>"""
            },
            {
                "label": "6.3 Bảng Mã Lỗi Phát Triển DET (ModuleId = 13)",
                "html": """
<div class="hb-card">
  <h3>Bảng Đầy Đủ Mã Lỗi Development Error Tracer (SWS_WdgM_00004)</h3>
  <table class="tbl">
    <thead><tr><th>Mã Hex</th><th>Tên Macro Chuẩn</th><th>Nguyên nhân phát sinh &amp; Cách kiểm thử ở Kịch bản S12</th></tr></thead>
    <tbody>
      <tr><td><code>0x10</code></td><td><code>WDGM_E_UNINIT</code></td><td>Gọi bất kỳ API nào của WdgM trước khi gọi <code>WdgM_Init()</code> (Tắt checkbox <code>WdgMInitialized</code>).</td></tr>
      <tr><td><code>0x11</code></td><td><code>WDGM_E_PARAM_CONFIG</code></td><td>Truyền <code>NULL_PTR</code> hoặc cấu hình sai vào <code>WdgM_Init()</code>.</td></tr>
      <tr><td><code>0x12</code></td><td><code>WDGM_E_PARAM_MODE</code></td><td>Truyền ID chế độ vượt ngoài cấu hình vào <code>WdgM_SetMode()</code>.</td></tr>
      <tr><td><code>0x13</code></td><td><code>WDGM_E_PARAM_SEID</code></td><td>Truyền <code>SEID</code> không tồn tại (VD <code>SEID = 99</code>).</td></tr>
      <tr><td><code>0x14</code></td><td><code>WDGM_E_INV_POINTER</code></td><td>Truyền <code>NULL_PTR</code> vào <code>GetLocalStatus</code>, <code>GetGlobalStatus</code>, <code>GetFirstExpiredSEID</code>.</td></tr>
      <tr><td><code>0x15</code></td><td><code>WDGM_E_DISABLE_NOT_ALLOWED</code></td><td>Cố gọi <code>SetMode(OFF_MODE)</code> hoặc <code>DeInit()</code> khi bật <code>WdgMDefensiveBehavior = TRUE</code>.</td></tr>
      <tr><td><code>0x16</code></td><td><code>WDGM_E_CPID</code></td><td>Truyền <code>CheckpointID</code> không thuộc thực thể <code>SEID</code> đó (VD <code>CPID = 55</code>).</td></tr>
      <tr><td><code>0x1F</code></td><td><code>WDGM_E_SEDEACTIVATED</code></td><td>Gọi <code>WdgM_CheckpointReached()</code> cho một SE đang <code>DEACTIVATED</code> (VD gọi cho <code>SE_2</code> khi đang ở <code>FAST_MODE</code>).</td></tr>
    </tbody>
  </table>
</div>"""
            },
            {
                "label": "6.4 Từ Điển Container ECUC WdgM (37 Tham Số)",
                "html": """
<div class="hb-card">
  <h3>Phân Nhóm Toàn Bộ 37 Tham Số Cấu Hình Trong Trình Mô Phỏng</h3>
  <table class="tbl">
    <thead><tr><th>Sub-Tab</th><th>ECUC Container</th><th>Các tham số cốt lõi (Hover &gt;1s ở Cột Trái để xem SWS)</th></tr></thead>
    <tbody>
      <tr><td><b>1. General</b></td><td><code>WdgMGeneral</code> &amp; <code>WdgMMode</code></td><td><code>WdgMInitialized</code>, <code>WdgMDevErrorDetect</code>, <code>WdgMVersionInfoApi</code>, <code>WdgMDefensiveBehavior</code>, <code>ActiveWdgMMode</code>, <code>WdgMSupervisionCycle</code></td></tr>
      <tr><td><b>2. Alive</b></td><td><code>WdgMAliveSupervision</code></td><td><code>SE0_AliveEnabled</code>, <code>WdgMExpectedAliveIndications</code>, <code>WdgMSupervisionReferenceCycle</code>, <code>WdgMMinMargin</code>, <code>WdgMMaxMargin</code>, <code>SE1_AliveEnabled</code>, <code>SE1_ExpectedAlive</code></td></tr>
      <tr><td><b>3. Deadline</b></td><td><code>WdgMDeadlineSupervision</code></td><td><code>SE0_DeadlineEnabled</code>, <code>WdgMDeadlineStartRef</code>, <code>WdgMDeadlineStopRef</code>, <code>WdgMDeadlineMin</code>, <code>WdgMDeadlineMax</code>, <code>WdgMEnableDeadlineTimeoutDetection</code></td></tr>
      <tr><td><b>4. Logical</b></td><td><code>WdgMInternal/ExternalGraph</code></td><td><code>SE0_InternalGraphEnabled</code>, <code>WdgMInitialCheckpoint</code>, <code>WdgMFinalCheckpoint</code>, <code>ValidInternalTransitions</code>, <code>ExternalGraphEnabled</code>, <code>ValidExternalTransitions</code></td></tr>
      <tr><td><b>5. Tol &amp; Rst</b></td><td><code>WdgMLocalStatusParams</code> &amp; <code>DEM</code></td><td><code>WdgMFailedAliveSupervisionRefCycleTol</code>, <code>SE1_FailedAliveTol</code>, <code>WdgMExpiredSupervisionCycleTol</code>, <code>WdgMImmediateReset</code>, <code>WdgMPartitionResetEnabled</code>, <code>WdgMDemEventParameterRefs</code></td></tr>
      <tr><td><b>6. WdgIf/HW</b></td><td><code>WdgMTrigger</code> &amp; <code>Wdg_Ext</code></td><td><code>WdgMTriggerMode_IntWdg</code>, <code>WdgMTriggerConditionValue_Int</code>, <code>ExternalWindowWdgEnabled</code>, <code>WdgMTriggerConditionValue_Ext</code>, <code>WindowWdgClosedWindowMs</code>, <code>SimulateWdgIfSetModeFail</code></td></tr>
    </tbody>
  </table>
</div>"""
            },
        ],
    },
]

js_lines = [
    "// ================= PART 6: MULTI-LEVEL HANDBOOK, ABBREVIATION SEARCH & BOOTSTRAP =================",
    "",
    f"const HANDBOOK_DATA = {json.dumps(HANDBOOK_TABS, ensure_ascii=False, indent=2)};",
    "",
    """let currentHbTab1 = 0;
let currentHbSubTab = 0;
let currentAbbrCategory = "ALL";

function switchHbTab1(idx) {
  currentHbTab1 = idx;
  currentHbSubTab = 0;
  renderCurrentHandbookView();
}

function switchHbSubTab(idx) {
  currentHbSubTab = idx;
  renderCurrentHandbookView();
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
  ["ALL", "CORE", "ALGO", "HW", "SAFETY"].forEach((c) => {
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
    CORE: "🛡️ WdgM Core & States",
    ALGO: "🧮 3 Thuật Toán",
    HW: "⏱️ WdgIf & HW Wdg",
    SAFETY: "🚨 Reset & Safety"
  };

  const filtered = ABBREVIATIONS.filter((item) => {
    if (currentAbbrCategory !== "ALL" && item.cat !== currentAbbrCategory) return false;
    if (!ql) return true;
    return (
      item.abbr.toLowerCase().includes(ql) ||
      item.full.toLowerCase().includes(ql) ||
      item.desc.toLowerCase().includes(ql) ||
      (catLabels[item.cat] || "").toLowerCase().includes(ql)
    );
  });

  const badge = document.getElementById("abbrCountBadge");
  if (badge) badge.textContent = filtered.length + " / " + ABBREVIATIONS.length + " thuật ngữ";

  const rowsHtml = filtered.length
    ? filtered.map((item) =>
        "<tr>" +
          "<td><strong class=\\"mono\\" style=\\"color:var(--pri)\\">" + highlightMatch(item.abbr, query) + "</strong></td>" +
          "<td>" + highlightMatch(item.full, query) + "</td>" +
          "<td><span class=\\"step-pill\\">" + (catLabels[item.cat] || item.cat) + "</span></td>" +
          "<td>" + highlightMatch(item.desc, query) + "</td>" +
        "</tr>"
      ).join("")
    : "<tr><td colspan=\\"4\\" style=\\"text-align:center;color:var(--mut);padding:16px\\">Không tìm thấy thuật ngữ phù hợp với từ khóa \\"" + escapeHtmlSafe(query) + "\\".</td></tr>";

  area.innerHTML =
    "<div class=\\"hb-card\\">" +
      "<h3>Bảng Tra Cứu Thuật Ngữ &amp; Viết Tắt AUTOSAR WdgM (" + ABBREVIATIONS.length + " Thuật Ngữ Chuyên Sâu)</h3>" +
      "<table class=\\"tbl\\">" +
        "<thead><tr><th style=\\"width:165px\\">Thuật ngữ / Viết tắt</th><th style=\\"width:265px\\">Tên đầy đủ (English Term)</th><th style=\\"width:165px\\">Phân nhóm</th><th>Giải thích kỹ thuật &amp; Vai trò trong WdgM</th></tr></thead>" +
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
