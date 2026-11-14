#!/usr/bin/env python3
"""
Generator for Part 6 of AUTOSAR EcuM Simulator:
- Multi-Level Interactive Handbook (6 Level-1 Tabs x 4 Level-2 Sub-Tabs = 24 Topics)
- Embeds all 18 Theme-Aware Inline SVGs from hb_diagrams_ecum.DIAGRAMS
- Tab 7 Live-Search Abbreviation Table (54 terms across 4 category pills)
- DOMContentLoaded bootstrap ending with </script></body></html>
"""

import json
import os
from hb_diagrams_ecum import DIAGRAMS


def build_handbook_tabs():
    d = DIAGRAMS
    return [
        # ==================== TAB 0: KIEN TRUC ECUM & BSWM ====================
        {
            "title": "1. Kiến Trúc EcuM & BswM",
            "subs": [
                {
                    "label": "1.1 Tổng Quan & Hệ Sinh Thái AUTOSAR",
                    "html": f"""
<div class="hb-card">
  <h3>🏛️ Vai Trò Trung Tâm Của EcuM Trong AUTOSAR Classic Stack</h3>
  <p><b>ECU State Manager (EcuM - ModuleId = 10)</b> nằm ở tầng <b>System Services</b> của AUTOSAR BSW. Khác với <code>ComM</code> chỉ quản lý kênh truyền thông, <b>EcuM quản lý toàn bộ sinh mệnh vật lý và logic của ECU</b>: từ khoảnh khắc chip vi điều khiển vừa được cấp điện ở vector Reset (trước khi OS tồn tại), xuyên suốt pha chạy bình thường, cho tới quá trình đưa CPU vào giấc ngủ sâu tiết kiệm điện (Sleep Halt/Poll) hoặc cắt hẳn nguồn nuôi (SBC SwitchOff).</p>
  {d["ecosystem"]}
  <h4>Bảng Phân Rã Input / Processing / Output Của Các Module Cộng Tác</h4>
  <table class="tbl">
    <thead><tr><th>Module</th><th>Input (Lấy từ đâu)</th><th>Cách xử lý cốt lõi</th><th>Output (Route tới đâu)</th></tr></thead>
    <tbody>
      <tr><td><b>EcuM</b></td><td><code>main()</code>, <code>Mcu_GetResetReason()</code>, <code>BswM</code>, <code>CanTrcv/Icu</code>, SWC Users</td><td>Điều phối 4 pha vòng đời (STARTUP, UP, SLEEP, SHUTDOWN), quản lý 4 mặt nạ bitmask 32-bit WakeupSource, kiểm tra ConsistencyHash &amp; RamHash.</td><td><code>StartOS()</code>, <code>Mcu_SetMode()</code>, <code>ComM_EcuM_WakeUpIndication()</code>, <code>BswM_EcuM_*</code>, <code>EcuM_AL_*</code></td></tr>
      <tr><td><b>BswM</b></td><td><code>EcuM_BswM_CurrentWakeup</code>, <code>ComM</code> mode, <code>NvM_JobStatus</code>, Rule ECUC</td><td>Đánh giá Rule Arbitrator thời gian thực ở EcuM Flexible để quyết định lúc nào khởi tạo Com stack và lúc nào đủ điều kiện Shutdown/Sleep.</td><td><code>EcuM_SetState()</code>, <code>EcuM_SelectShutdownTarget()</code>, <code>EcuM_GoDownHaltPoll()</code>, <code>ComM_CommunicationAllowed()</code></td></tr>
      <tr><td><b>Mcu / Gpt</b></td><td>Lệnh từ <code>EcuM</code> (Reset Reason, SetMode, Timer GPT)</td><td>Đọc cờ thanh ghi phần cứng Reset, chuyển chế độ điện năng (NORMAL / SLEEP / HALT), hoặc cấp timer Gpt cho Alarm Clock.</td><td>Trả <code>Mcu_ResetType</code> về <code>EcuM_Init()</code>; phát ngắt phần cứng hoặc đánh thức Core từ trạng thái dừng clock.</td></tr>
      <tr><td><b>ComM &amp; CanIf</b></td><td><code>ComM_EcuM_WakeUpIndication()</code>, <code>ComM_EcuM_PNCWakeUpIndication()</code></td><td>Khi EcuM xác thực nguồn Wakeup hợp lệ (VALIDATED), ComM chuyển kênh CAN/LIN sang Communication Requested và mở Nm/PduR.</td><td><code>BswM_ComM_CurrentMode()</code> báo ComM đã về <code>COMM_NO_COMMUNICATION</code> để cho phép ngủ.</td></tr>
      <tr><td><b>NvM</b></td><td>Yêu cầu <code>NvM_ReadAll()</code> lúc Startup, <code>NvM_WriteAll()</code> lúc Shutdown</td><td>Ghi toàn bộ dữ liệu học tập, DTC của Dem và biến cấu hình xuống Flash/FEE/EEPROM trước khi ngắt điện.</td><td>Báo trạng thái Pending/OK về BswM/EcuM để nhả cổng <code>ShutdownOS()</code>.</td></tr>
    </tbody>
  </table>
</div>
"""
                },
                {
                    "label": "1.2 EcuM Flexible vs EcuM Fixed",
                    "html": f"""
<div class="hb-card">
  <h3>🔀 So Sánh EcuM Flexible (R20-11/R23-11) Và EcuM Fixed</h3>
  <p>AUTOSAR tách <b>EcuM</b> thành hai mô hình kiến trúc rõ rệt. Trong trình mô phỏng này, bạn có thể chuyển đổi tức thời thông qua trường config <code>EcuMArchitectureVariant</code> ở Tab Config <b>01. General</b>.</p>
  {d["flex_vs_fixed"]}
  <table class="tbl">
    <thead><tr><th>Tiêu chí kỹ thuật</th><th>EcuM Flexible (Chuẩn R20-11 / R22-11 / R23-11)</th><th>EcuM Fixed (Kiến trúc cổ điển R3.x / legacy)</th></tr></thead>
    <tbody>
      <tr><td><b>Khởi tạo Driver</b></td><td>Chỉ giữ <code>DriverInitZero</code> &amp; <code>DriverInitOne</code>. Các driver tầng cao (DriverInitTwo/Three) do <b>BswM Action List</b> tự gọi sau <code>BswM_Init()</code>.</td><td>Bảng cứng nội bộ trong EcuM: EcuM tự lần lượt gọi <code>DriverInitZero</code> &rarr; <code>One</code> &rarr; <code>Two</code> &rarr; <code>Three</code>.</td></tr>
      <tr><td><b>Quản lý trạng thái RUN / POST_RUN</b></td><td>EcuM chỉ đóng vai trò kho lưu trữ biến trạng thái (nhận lệnh qua <code>EcuM_SetState()</code> từ BswM); các tùy chọn <code>RequestRUN</code> có thể được cấp cho BswM Mode Request Port.</td><td>EcuM trực tiếp giữ bảng đếm <code>User</code> với 4 API <code>RequestRUN</code>, <code>ReleaseRUN</code>, <code>RequestPOST_RUN</code>, <code>ReleasePOST_RUN</code> và timer <code>RunMinimumDuration</code>.</td></tr>
      <tr><td><b>Lệnh đi ngủ / tắt nguồn</b></td><td>BswM hoặc User được ủy quyền gọi <code>EcuM_GoDownHaltPoll(UserID)</code> thống nhất cho cả GoDown, GoHalt và GoPoll.</td><td>EcuM tự đánh giá khi tất cả POST_RUN Users nhả lock &rarr; tự động bước vào <code>PREP_SHUTDOWN</code>.</td></tr>
      <tr><td><b>Hỗ trợ Multi-Core</b></td><td>Chuẩn hóa đồng bộ đa nhân Master/Slave ngay trong Flexible Specification.</td><td>Không hỗ trợ Multi-Core chuẩn AUTOSAR R4.x+.</td></tr>
    </tbody>
  </table>
</div>
"""
                },
                {
                    "label": "1.3 4 Pha Chính & Handover Control",
                    "html": f"""
<div class="hb-card">
  <h3>🔄 Chuỗi Vòng Đời 4 Pha &amp; Bàn Giao Điều Khiển (Control Handover)</h3>
  <p>Vòng đời của một ECU chạy AUTOSAR luôn tuần hoàn qua 4 pha vĩ mô: <b>STARTUP &rarr; UP &rarr; SLEEP &rarr; SHUTDOWN</b>. Điểm đặc biệt nhất của EcuM là khái niệm <b>bàn giao quyền điều khiển</b> qua biên giới của Hệ điều hành (Pre-OS &harr; Post-OS).</p>
  {d["handover_flow"]}
  <div class="hb-grid2">
    <div>
      <h4>🔍 Giải Phẫu 2 Thanh Ghi Giám Sát 8-Bit (Tier-1B Simulator)</h4>
      <ul>
        <li><b><code>EcuM_PhaseControlByte</code></b>: Theo dõi trạng thái kích hoạt của 8 cờ pha lõi: <code>Bit0 INITIALIZED</code>, <code>Bit1 PRE_OS</code>, <code>Bit2 POST_OS</code>, <code>Bit3 RUN_ACTIVE</code>, <code>Bit4 POST_RUN</code>, <code>Bit5 PREP_SHUTDOWN</code>, <code>Bit6 SLEEP_HALT_POLL</code>, <code>Bit7 SHUTDOWN_OFF</code>.</li>
        <li><b><code>EcuM_WakeupStatusByte</code></b>: Theo dõi các cờ điều kiện đánh thức &amp; rào chắn an toàn: <code>Bit0 PENDING_ANY</code>, <code>Bit1 VALIDATED_ANY</code>, <code>Bit2 EXPIRED_ANY</code>, <code>Bit3 RAM_HASH_OK</code>, <code>Bit4 PB_HASH_OK</code>, <code>Bit5 ALARM_ARMED</code>, <code>Bit6 MULTICORE_SYNC</code>, <code>Bit7 COMM_NOTIFY</code>.</li>
      </ul>
    </div>
    <div>
      <h4>⚡ Quy Tắc Bàn Giao (Handover Rules)</h4>
      <ol>
        <li><b>main() &rarr; EcuM_Init()</b>: Không bao giờ return. Kết thúc bằng lệnh gọi <code>StartOS()</code>.</li>
        <li><b>StartOS() &rarr; EcuM_StartupTwo()</b>: Task init có độ ưu tiên cao nhất gọi lại EcuM để bật <code>SchM</code> &amp; <code>BswM</code>.</li>
        <li><b>BswM &rarr; EcuM_GoDownHaltPoll()</b>: Khi công việc xong, BswM trả quyền lại cho EcuM để ngủ hoặc tắt nguồn.</li>
        <li><b>ShutdownOS() &rarr; ShutdownHook() &rarr; EcuM_Shutdown()</b>: Khi tắt OS, Hook cuối cùng trao quyền cho <code>OffPreOS</code> cắt điện SBC.</li>
      </ol>
    </div>
  </div>
</div>
"""
                },
                {
                    "label": "1.4 BswM Arbitration & EcuM_SetState()",
                    "html": f"""
<div class="hb-card">
  <h3>🎛️ Cơ Chế Trọng Tài BswM Khi Phối Hợp Với EcuM Flexible</h3>
  <p>Trong <b>EcuM Flexible</b>, EcuM giống như <i>"bàn tay thực thi phần cứng"</i> còn BswM đóng vai trò <i>"bộ não ra quyết định logic"</i>. Bất cứ khi nào trạng thái Wakeup hay Phase thay đổi, EcuM đều gọi callback chỉ báo sang BswM.</p>
  <table class="tbl">
    <thead><tr><th>Callback từ EcuM sang BswM</th><th>Rule Logic điển hình bên trong BswM</th><th>Action List do BswM kích hoạt ngược lại</th></tr></thead>
    <tbody>
      <tr><td><code>BswM_EcuM_CurrentState(ECUM_STATE_STARTUP_TWO)</code></td><td>ECU vừa hoàn tất StartPostOS?</td><td>Chạy <code>NvM_ReadAll()</code>, <code>Can_Init()</code>, <code>ComM_Init()</code>, gọi <code>EcuM_SetState(ECUM_STATE_APP_RUN)</code>.</td></tr>
      <tr><td><code>BswM_EcuM_CurrentWakeup(CAN_CH0, VALIDATED)</code></td><td>Có nguồn CAN wakeup hợp lệ + điện áp ắc quy ổn định?</td><td>Cho phép <code>ComM_CommunicationAllowed(CH0, TRUE)</code> &rarr; bật <code>CanSM</code> truyền nhận NM frame.</td></tr>
      <tr><td><code>BswM_ComM_CurrentMode(CH0, NO_COM)</code> &amp;&amp; <code>NvM_Job == OK</code></td><td>Không còn SWC giữ RUN, ComM đã ngủ (Bus Sleep), NvM đã ghi xong?</td><td>Gọi <code>EcuM_SelectShutdownTarget(SLEEP/OFF)</code>, <code>EcuM_SetState(PREP_SHUTDOWN)</code>, rồi gọi <code>EcuM_GoDownHaltPoll(User0)</code>.</td></tr>
      <tr><td><code>BswM_EcuM_RequestedState(APP_POST_RUN, RELEASED)</code></td><td>Tất cả POST_RUN requests đã nhả?</td><td>Bắt đầu trình tự <code>NvM_WriteAll()</code> và hạ toàn bộ các PDU TX của module <code>Com</code>.</td></tr>
    </tbody>
  </table>
  <pre class="code-block">/* Ví dụ Rule BswM điều phối Shutdown ECU trong EcuM Flexible */
void BswM_Action_PrepareGoSleep(void) {{
    /* 1. Xóa các cờ Wakeup cũ trước khi vào SLEEP */
    EcuM_ClearWakeupEvent(ECUM_WKSOURCE_ALL_SOURCES);
    /* 2. Chọn mục tiêu SLEEP với SleepModeId = 0 (GoHalt) */
    EcuM_SelectShutdownTarget(ECUM_SHUTDOWN_TARGET_SLEEP, ECUM_SLEEP_MODE_HALT);
    /* 3. Ra lệnh trực tiếp cho EcuM thực thi chuỗi Halt/Poll */
    (void)EcuM_GoDownHaltPoll(ECUM_USER_BSWM);
}}</pre>
</div>
"""
                }
            ]
        },

        # ==================== TAB 1: STARTUP PREOS & POSTOS ====================
        {
            "title": "2. Startup PreOS & PostOS",
            "subs": [
                {
                    "label": "2.1 StartPreOS Timeline & Reset Reason",
                    "html": f"""
<div class="hb-card">
  <h3>🚀 Chuỗi Khởi Động Trước OS: EcuM_Init() &rarr; StartPreOS</h3>
  <p>Khi ECU vừa được cấp nguồn (Power-On) hoặc vừa Reset, hàm <code>main()</code> của ngôn ngữ C không chạy logic ứng dụng mà chỉ làm đúng 1 việc duy nhất: gọi <code>EcuM_Init()</code>. Lúc này Hệ điều hành AUTOSAR OS <b>chưa tồn tại</b>, không có Task hay Alarm nào chạy, mọi tác vụ đều phải thực thi tuần tự đồng bộ.</p>
  {d["start_pre_os"]}
  <h4>Chi Tiết Thứ Tự Bắt Buộc Trong StartPreOS (SWS_EcuM_02411)</h4>
  <ol>
    <li><b><code>EcuM_AL_DriverInitZero()</code></b>: Khởi tạo các module BSW tối thiểu không phụ thuộc Post-Build config (đặc biệt là <code>Det_Init()</code> để bắt lỗi phát triển ngay từ dòng lệnh đầu tiên).</li>
    <li><b><code>EcuM_DeterminePbConfiguration()</code></b>: Trả về con trỏ cấu hình Post-Build (<code>const EcuM_ConfigType*</code>) phù hợp với biến thể phần cứng / mã VIN.</li>
    <li><b>Kiểm tra <code>EcuMConfigConsistencyHash</code></b>: So sánh mã băm 32-bit biên dịch Pre-Compile với trường Hash nằm trong struct PBcfg. Nếu lệch &rarr; gọi <code>EcuM_ErrorHook(ECUM_E_CONFIGURATION_DATA_INCONSISTENT)</code> và dừng ngay lập tức!</li>
    <li><b><code>EcuM_LoopDetection()</code></b>: Nếu <code>EcuMLoopDetectionEnabled == TRUE</code>, kiểm tra bộ đếm Reset liên tiếp trong No-Init RAM để chặn vòng lặp Reset chết (bootloop).</li>
    <li><b><code>EcuM_AL_DriverInitOne(ConfigPtr)</code></b>: Khởi tạo các MCAL drivers cốt lõi: <code>Mcu_Init</code>, <code>Mcu_InitClock</code>, <code>Port_Init</code>, <code>Dio_Init</code>, <code>Gpt_Init</code>, <code>Wdg_Init</code>, <code>CanTrcv_Init</code>.</li>
    <li><b><code>Mcu_GetResetReason()</code></b>: Đọc thanh ghi phần cứng lý do Reset (ví dụ <code>MCU_POWER_ON_RESET</code> &rarr; set bit <code>POWER</code> vào <code>ValidatedWakeupEvents</code>; <code>MCU_WATCHDOG_RESET</code> &rarr; set bit <code>INT_WDG</code>).</li>
    <li><b><code>EcuM_SelectShutdownTarget(DefaultTarget, DefaultMode)</code></b>: Nạp cấu hình shutdown mặc định.</li>
    <li><b><code>StartOS(EcuMDefaultAppMode)</code></b>: Kích hoạt nhân Hệ điều hành thời gian thực OSEK/AUTOSAR OS!</li>
  </ol>
</div>
"""
                },
                {
                    "label": "2.2 PB Config Hash & LoopDetection Safety",
                    "html": f"""
<div class="hb-card">
  <h3>🛡️ Hàng Rào An Toàn: Consistency Hash &amp; Reset Loop Detection</h3>
  <p>Trong sản xuất thực tế, file Calibration/Post-Build (Flash sector riêng) đôi khi bị nạp sai phiên bản so với code Application Pre-Compile (Flash chính). EcuM ngăn thảm họa truy cập sai địa chỉ con trỏ thông qua hai cơ chế bảo vệ trước OS.</p>
  {d["pb_hash_check"]}
  <div class="hb-grid2">
    <div class="hb-card" style="margin:0">
      <h4>🔑 Cơ chế 1: EcuMConfigConsistencyHash (SWS_EcuM_02795)</h4>
      <p>Công cụ sinh code (Configurator) băm cấu trúc toàn bộ tham số Pre-Compile + Post-Build thành một số <code>uint32</code> (VD: <code>0xA55A1234</code>). Tại runtime, trước khi dùng PBcfg cho <code>DriverInitOne</code>, EcuM đối chiếu:</p>
      <pre class="code-block">if (ConfigPtr->ConfigConsistencyHash != ECUM_CONFIG_CONSISTENCY_HASH) {{
    EcuM_ErrorHook(ECUM_E_CONFIGURATION_DATA_INCONSISTENT);
}}</pre>
      <p><i>Thử nghiệm trong Simulator:</i> Chọn Kịch bản <b>S2</b> hoặc sửa trường <code>InjectedPbConfigHash</code> khác với <code>EcuMConfigConsistencyHash</code>!</p>
    </div>
    <div class="hb-card" style="margin:0">
      <h4>🔁 Cơ chế 2: EcuM_LoopDetection() (SWS_EcuM_02927)</h4>
      <p>Khi nguồn ắc quy yếu gây sụt áp ngay lúc vừa bật tải, ECU sẽ bị reset lặp vô tận. Nếu bật <code>EcuMLoopDetectionEnabled</code>, EcuM giữ bộ đếm trong No-Init RAM tăng lên mỗi lần vào <code>StartPreOS</code> (và chỉ reset đếm về 0 khi chạy ổn định trong pha <code>UP</code>). Vượt ngưỡng sẽ nhảy thẳng vào xử lý lỗi an toàn.</p>
    </div>
  </div>
</div>
"""
                },
                {
                    "label": "2.3 StartPostOS, SchM_Init & BswM_Init",
                    "html": f"""
<div class="hb-card">
  <h3>⚙️ Khởi Động Sau OS: EcuM_StartupTwo() &amp; BswM_Init()</h3>
  <p>Ngay sau lệnh <code>StartOS(OSDEFAULTAPPMODE)</code>, nhân OS bắt đầu chia lát cắt thời gian và gọi Task tự động khởi chạy (Autostart Task, thường tên là <code>OsTask_Init</code>). Dòng code đầu tiên của Task này gọi <code>EcuM_StartupTwo()</code>.</p>
  {d["start_post_os"]}
  <table class="tbl">
    <thead><tr><th>Bước</th><th>API / Callout</th><th>Tác vụ thực thi bên trong</th><th>Ai thực hiện?</th></tr></thead>
    <tbody>
      <tr><td>1</td><td><code>EcuM_StartupTwo()</code></td><td>Cập nhật trạng thái EcuM sang <code>ECUM_STATE_STARTUP_TWO</code>; mở cờ pha <code>POST_OS</code>.</td><td><code>OsTask_Init</code> &rarr; EcuM</td></tr>
      <tr><td>2</td><td><code>SchM_Init()</code></td><td>Khởi tạo BSW Scheduler (Rte/SchM Timing Events), bật chu kỳ gọi <code>EcuM_MainFunction()</code>, <code>ComM_MainFunction()</code>...</td><td>EcuM &rarr; SchM</td></tr>
      <tr><td>3</td><td><code>BswM_Init(BswM_Cfg)</code></td><td>Khởi động Bộ quản lý chế độ BSW. BswM ngay lập tức kích hoạt Action List khởi tạo các driver cần OS (DriverInitTwo/Three: Can, ComM, NvM, Dem).</td><td>EcuM &rarr; BswM</td></tr>
      <tr><td>4</td><td><code>BswM_EcuM_CurrentWakeup()</code></td><td>Nếu trong StartPreOS đã đọc được nguồn Wakeup Validated (như POWER hoặc CAN wakeup), báo ngay cho BswM biết!</td><td>EcuM &rarr; BswM</td></tr>
      <tr><td>5</td><td><code>EcuM_SetState(ECUM_STATE_RUN)</code></td><td>Kết thúc Startup! ECU bước sang pha <b>UP</b>, bật timer <code>EcuMRunMinimumDuration</code> để bảo vệ SWC khởi chạy.</td><td>BswM / EcuM Fixed</td></tr>
    </tbody>
  </table>
</div>
"""
                },
                {
                    "label": "2.4 DriverInit Lists (Zero, One, Two/Three, Restart)",
                    "html": f"""
<div class="hb-card">
  <h3>📦 Phân Hoạch Nhóm Khởi Tạo Driver (DriverInit Zero / One / Two / Restart)</h3>
  <p>Một trong những câu hỏi phỏng vấn AUTOSAR kinh điển là: <b>"Tại sao không khởi tạo tất cả Driver ở một nơi mà phải chia làm Zero, One, Two, Three?"</b> Câu trả lời nằm ở sự phụ thuộc vào <i>Post-Build Config</i>, <i>OS Interrupt/Timing</i> và <i>NvM ReadAll</i>.</p>
  <table class="tbl">
    <thead><tr><th>Danh sách DriverInit</th><th>Thời điểm chạy</th><th>OS đã chạy chưa?</th><th>Yêu cầu Post-Build?</th><th>Ví dụ Module điển hình</th></tr></thead>
    <tbody>
      <tr><td><b>DriverInitZero</b></td><td>Đầu <code>StartPreOS</code> (trong <code>EcuM_Init</code>)</td><td>❌ Chưa (Pre-OS)</td><td>❌ Không (Pre-Compile)</td><td><code>Det_Init()</code>, ghi log lỗi sớm.</td></tr>
      <tr><td><b>DriverInitOne</b></td><td>Giữa <code>StartPreOS</code> (sau DeterminePb)</td><td>❌ Chưa (Pre-OS)</td><td>✅ Có PBcfg</td><td><code>Mcu</code> (Clock/PLL), <code>Port</code>, <code>Dio</code>, <code>Gpt</code>, <code>Wdg</code>, <code>Spi</code>, <code>Adc</code>, <code>CanTrcv</code>.</td></tr>
      <tr><td><b>DriverInitTwo</b> *(do BswM gọi trong Flexible)*</td><td><code>StartPostOS</code> (sau <code>BswM_Init</code>)</td><td>✅ Đã chạy OS</td><td>✅ Có PBcfg</td><td><code>Can</code>, <code>CanIf</code>, <code>Lin</code>, <code>Fls</code>, <code>Fee</code>, <code>NvM_Init</code> &rarr; <code>NvM_ReadAll()</code>, <code>ComM</code>, <code>Com</code>.</td></tr>
      <tr><td><b>DriverInitThree</b> *(do BswM gọi sau NvM_ReadAll)*</td><td><code>StartPostOS</code> muộn (cần dữ liệu NVRAM)</td><td>✅ Đã chạy OS</td><td>✅ + Dữ liệu NvM</td><td><code>Dem_Init()</code> (cần đọc lịch sử lỗi DTC từ Flash), <code>Dcm</code>, các SWC học giá trị thích nghi.</td></tr>
      <tr><td><b>DriverRestart</b></td><td>Sau khi CPU thức dậy từ <code>SLEEP</code> (GoHalt/GoPoll)</td><td>✅ OS đang tạm dừng/phục hồi</td><td>✅ Có PBcfg</td><td>Khôi phục PLL/Peripheral bị mất điện áp ở DeepSleep, mở lại ngắt Timer &amp; Peripheral Bus.</td></tr>
    </tbody>
  </table>
</div>
"""
                }
            ]
        },

        # ==================== TAB 2: UP (RUN) & SHUTDOWN OFF/RST ====================
        {
            "title": "3. UP (RUN) & Shutdown OFF/RST",
            "subs": [
                {
                    "label": "3.1 Pha UP, RequestRUN & POST_RUN",
                    "html": f"""
<div class="hb-card">
  <h3>🟢 Pha UP: Quản Lý Giữ Thức (RUN / POST_RUN) &amp; RunMinimumDuration</h3>
  <p>Khi hoàn tất Startup, ECU bước vào <b>Pha UP</b> — pha làm việc chính nơi RTE và tất cả SWC thực thi. Tuy nhiên, làm thế nào để ECU biết khi nào mọi SWC đã hoàn thành công việc để đi ngủ mà không tắt ngang khi một module đang ghi dữ liệu?</p>
  {d["run_postrun"]}
  <h4>3 Tầng Khóa Giữ Pha UP (Keep-Awake Locks)</h4>
  <ul>
    <li><b>1. <code>EcuMRunMinimumDuration</code> (ECUC_EcuM_00110)</b>: Timer tối thiểu (VD: 5000 ms) bắt đầu đếm lùi ngay khi vừa vào <code>RUN</code> hoặc <code>WakeupRestart</code>. Trong khoảng thời gian này, dù chưa có User nào kịp gọi <code>EcuM_RequestRUN()</code>, ECU vẫn <b>cấm tuyệt đối</b> việc rơi xuống Shutdown/Sleep!</li>
    <li><b>2. <code>EcuM_RequestRUN(User)</code> / <code>ReleaseRUN(User)</code></b>: Các SWC ứng dụng (VD: EngineControl, HVAC) hoặc BswM Mode Request Port xin giữ trạng thái <code>APP_RUN</code>. Chỉ khi tất cả RUN Users nhả hết VÀ <code>runMinLeftMs == 0</code>, ECU mới chuyển sang <code>APP_POST_RUN</code>.</li>
    <li><b>3. <code>EcuM_RequestPOST_RUN(User)</code> / <code>ReleasePOST_RUN(User)</code></b>: Dành cho các tác vụ hậu kỳ (Diagnostic, Logger, NvM) hoàn tất đóng file sau khi xe tắt khóa điện KL15 trước khi chuyển sang <code>PREP_SHUTDOWN</code>.</li>
  </ul>
</div>
"""
                },
                {
                    "label": "3.2 Shutdown Sequence (PreOS & OffPreOS)",
                    "html": f"""
<div class="hb-card">
  <h3>🔻 Chuỗi Tắt Nguồn Hai Giai Đoạn: PreOS Shutdown &rarr; OffPreOS</h3>
  <p>Tương tự lúc khởi động, quá trình tắt ECU cũng bị chia đôi bởi ranh giới <code>ShutdownOS()</code> để đảm bảo các dịch vụ chạy trên nền OS (như ghi Flash <code>NvM_WriteAll()</code> hay xả hàng đợi CAN) được hoàn thành trọn vẹn trước khi tắt bộ lập lịch.</p>
  {d["shutdown_seq"]}
  <table class="tbl">
    <thead><tr><th>Giai đoạn</th><th>Ngữ cảnh thực thi</th><th>Chuỗi Callout / API bắt buộc</th></tr></thead>
    <tbody>
      <tr><td><b>Shutdown PreOS</b></td><td>Bên trong Task gọi <code>EcuM_GoDownHaltPoll()</code> (OS vẫn đang chạy)</td><td>Kiểm tra quyền User &rarr; Gọi <b><code>EcuM_OnGoOffOne()</code></b> (dùng để hủy các lịch <code>BswM_Deinit</code>, <code>SchM_Deinit</code>, kiểm tra <code>NvM_WriteAll</code> hoàn tất) &rarr; Khóa ngắt &rarr; Chạy <b><code>ShutdownOS(E_OK)</code></b>.</td></tr>
      <tr><td><b>OffPreOS</b></td><td>Bên trong <b><code>ShutdownHook()</code></b> của OS (Scheduler đã dừng hoàn toàn)</td><td>Gọi <b><code>EcuM_Shutdown()</code></b> &rarr; Gọi <b><code>EcuM_OnGoOffTwo()</code></b> (DeInit các driver mức thấp trước khi mất điện) &rarr; Thực thi mục tiêu: <code>EcuM_AL_SwitchOff()</code> (nếu OFF) hoặc <code>EcuM_AL_Reset(resetMode)</code> (nếu RESET).</td></tr>
    </tbody>
  </table>
</div>
"""
                },
                {
                    "label": "3.3 ShutdownTarget, Cause & BootTarget FBL",
                    "html": f"""
<div class="hb-card">
  <h3>🎯 ShutdownTarget, ShutdownCause &amp; Cơ Chế Nhảy Bootloader (FBL)</h3>
  <p>EcuM không tự đoán biết lần tắt sắp tới nên đi ngủ hay cắt nguồn hay nạp phần mềm; ứng dụng hoặc BswM phải chọn trước thông qua cặp API cấu hình mục tiêu.</p>
  {d["boot_target"]}
  <div class="hb-grid2">
    <div>
      <h4>📌 3 Mục Tiêu Shutdown (<code>EcuM_ShutdownTargetType</code>)</h4>
      <ul>
        <li><code>ECUM_SHUTDOWN_TARGET_SLEEP</code> + <code>SleepModeId</code>: Vào <b>SLEEP</b> (GoHalt hoặc GoPoll), giữ RAM và chờ đánh thức.</li>
        <li><code>ECUM_SHUTDOWN_TARGET_RESET</code> + <code>ResetModeId</code>: Thực thi <code>OffPreOS</code> rồi gọi <code>EcuM_AL_Reset()</code> khởi động lại chip MCU.</li>
        <li><code>ECUM_SHUTDOWN_TARGET_OFF</code>: Thực thi <code>OffPreOS</code> rồi gọi <code>EcuM_AL_SwitchOff()</code> ngắt mạch giữ nguồn ngoài.</li>
      </ul>
    </div>
    <div>
      <h4>🚀 3 Đích Khởi Động (<code>EcuM_BootTargetType</code>)</h4>
      <ul>
        <li><code>ECUM_BOOT_TARGET_APP</code>: Chạy thẳng ứng dụng chính bình thường sau khi Reset.</li>
        <li><code>ECUM_BOOT_TARGET_OEM_BOOTLOADER</code>: Dcm yêu cầu chẩn đoán (UDS 0x10 02 Programming Session) gọi <code>EcuM_SelectBootTarget(OEM_BOOTLOADER)</code> + Reset &rarr; ECU ở lại Flash Bootloader để nạp firmware mới (OTA / UDS Flashing)!</li>
        <li><code>ECUM_BOOT_TARGET_SYS_BOOTLOADER</code>: Nhảy vào System Bootloader của nhà cung cấp chip / Tier-1.</li>
      </ul>
    </div>
  </div>
</div>
"""
                },
                {
                    "label": "3.4 SBC Power Latch & NvM_WriteAll Gate",
                    "html": f"""
<div class="hb-card">
  <h3>🔌 Cổng Chặn NvM_WriteAll &amp; Mạch Tự Giữ Nguồn SBC Power Latch</h3>
  <p>Trên ô tô thực tế, kể cả khi người lái rút chìa khóa hoặc tắt dây KL15, ECU vẫn phải tự giữ nguồn sống cho chính mình bằng một chân DIO nối tới IC Nguồn <b>SBC (System Basis Chip)</b>.</p>
  <ol>
    <li>Khi KL15 tắt, <code>ComM</code> dừng truyền tin, SWC nhả <code>ReleaseRUN</code> &rarr; <code>BswM</code> gọi <code>NvM_WriteAll()</code> để lưu đồng hồ công-tơ-mét (Odometer), mã lỗi DTC và dữ liệu thích nghi xuống Flash.</li>
    <li>Nếu gọi <code>EcuM_GoDownHaltPoll()</code> trong khi <code>NvMWriteAllPendingDelay &gt; 0</code> (NvM vẫn đang ghi Flash), dữ liệu NVRAM sẽ bị lỗi (corrupted) hoặc rách sector EEPROM! Do đó BswM phải đặt điều kiện cổng <b><code>NvM_GetErrorStatus(MultiBlock) != NVM_REQ_PENDING</code></b>.</li>
    <li>Chỉ tại dòng cuối cùng của <code>EcuM_AL_SwitchOff()</code>, phần mềm mới kéo chân <code>DIO_SBC_PWR_HOLD = LOW</code>. Tụ lọc nguồn xả dần trong vài mili-giây và MCU tắt hẳn về 0 V.</li>
  </ol>
  <p><b>Mẹo Simulator:</b> Thử kích hoạt <i>What-If</i> ở Kịch bản <b>S6</b> để quan sát cơ chế NvM blocking gate khi <code>NvMWriteAllPendingDelay &gt; 0</code>!</p>
</div>
"""
                }
            ]
        },

        # ==================== TAB 3: SLEEP HALT/POLL & ALARM ====================
        {
            "title": "4. Sleep Halt/Poll & Alarm",
            "subs": [
                {
                    "label": "4.1 EcuM_GoHalt() & RamHash Integrity",
                    "html": f"""
<div class="hb-card">
  <h3>💤 Ngủ Sâu Tiết Kiệm Điện: EcuM_GoHalt() &amp; Bảo Vệ RamHash</h3>
  <p><b>GoHalt (Suspend Mode)</b> là chế độ tiết kiệm điện nhất mà vẫn giữ được nội dung RAM và tốc độ phục hồi tức thì (hàng mili-giây) không cần chạy lại <code>StartPreOS</code>. CPU bị dừng hoàn toàn xung nhịp cho tới khi có một ngắt phần cứng hợp lệ đánh thức.</p>
  {d["go_halt"]}
  <h4>Trình Tự Chuẩn SWS_EcuM_02960 Bên Trong GoHalt()</h4>
  <ol>
    <li>Xác nhận <code>PendingWakeupEvents == 0</code> (nếu đang có nguồn đánh thức chờ sẵn thì <b>từ chối ngủ</b> để xử lý ngay!).</li>
    <li>Bật các ngắt đánh thức của những nguồn có trong <code>EcuMSleepModeWakeupSourceMask</code> qua <code>EcuM_EnableWakeupSources()</code>.</li>
    <li>Khóa ngắt toàn cục, gọi <b><code>EcuM_GenerateRamHash()</code></b> để tính Checksum/CRC toàn bộ RAM đang duy trì.</li>
    <li>Gọi <b><code>Mcu_SetMode(MCU_MODE_HALT)</code></b> &rarr; CPU đóng băng ngay tại lệnh này! Dòng tiêu thụ giảm từ ~150 mA xuống ~100 &mu;A.</li>
    <li>Khi phần cứng (CanTrcv RX pin, KL15 pin, Gpt Alarm) phát ngắt đánh thức, CPU tiếp tục chạy từ lệnh ngay sau <code>Mcu_SetMode</code>.</li>
    <li>Khôi phục xung nhịp về <code>Mcu_SetMode(NORMAL)</code>, gọi ngay <b><code>EcuM_CheckRamHash()</code></b>:
      <ul>
        <li>Nếu trả về <b><code>1</code> (Hợp lệ)</b>: Tắt wakeup IRQ &rarr; gọi <code>EcuM_AL_DriverRestart()</code> &rarr; quay lại pha <b>UP</b>!</li>
        <li>Nếu trả về <b><code>0</code> (Hỏng RAM do sụt áp khi ngủ)</b>: Báo lỗi nghiêm trọng <code>EcuM_ErrorHook(ECUM_RAM_CHECK_FAILED)</code>! Không bao giờ tiếp tục dùng dữ liệu RAM lỗi!</li>
      </ul>
    </li>
  </ol>
</div>
"""
                },
                {
                    "label": "4.2 EcuM_GoPoll() & SleepActivity Loop",
                    "html": f"""
<div class="hb-card">
  <h3>🔁 Ngủ Nhẹ Thăm Dò: EcuM_GoPoll() &amp; EcuM_SleepActivity()</h3>
  <p>Không phải nguồn đánh thức nào trên phần cứng cũng có chân ngắt (Interrupt-capable). Ví dụ một số công tắc nối qua mạch chia áp ADC hoặc IC Watchdog ngoài cần CPU thỉnh thoảng mở mắt liếc qua. Khi <code>EcuMSleepModeSuspend == FALSE</code>, EcuM chạy cơ chế <b>GoPoll</b>.</p>
  {d["go_poll"]}
  <table class="tbl">
    <thead><tr><th>So sánh</th><th>EcuM_GoHalt() (Suspend = TRUE)</th><th>EcuM_GoPoll() (Suspend = FALSE)</th></tr></thead>
    <tbody>
      <tr><td><b>Trạng thái CPU</b></td><td>CPU dừng xung nhịp hoàn toàn (HALT / STOP). Chỉ đánh thức bằng ngắt ngoài.</td><td>CPU chạy ở xung nhịp thấp (LOW POWER RUN / DOZE), lặp liên tục vòng polling.</td></tr>
      <tr><td><b>Kiểm tra RamHash</b></td><td><b>Bắt buộc</b> gọi <code>GenerateRamHash()</code> và <code>CheckRamHash()</code>.</td><td>Không bắt buộc (RAM luôn được cấp nguồn ổn định cùng xung nhịp thấp).</td></tr>
      <tr><td><b>Callout vòng lặp</b></td><td>Không có vòng lặp (ngủ đông tại <code>Mcu_SetMode</code>).</td><td>Gọi lặp <b><code>EcuM_SleepActivity()</code></b> (đá Watchdog nhẹ) + <b><code>EcuM_CheckWakeup(sources)</code></b>.</td></tr>
      <tr><td><b>Thoát khỏi vòng ngủ</b></td><td>Thoát ngay khi ngắt đánh thức phục hồi CPU.</td><td>Thoát khi <code>PendingWakeupEvents</code> hoặc <code>ValidatedWakeupEvents != 0</code>.</td></tr>
    </tbody>
  </table>
</div>
"""
                },
                {
                    "label": "4.3 EcuM Alarm Clock (Gpt Self-Wakeup)",
                    "html": f"""
<div class="hb-card">
  <h3>⏰ Đồng Hồ Báo Thức Nội Bộ: EcuM Alarm Clock (Gpt)</h3>
  <p>Từ chuẩn AUTOSAR R4.x+, khi <code>EcuMAlarmClockPresent == TRUE</code>, các SWC (hoặc User) có thể hẹn giờ cho EcuM tự đánh thức ECU khỏi chế độ SLEEP sau một khoảng thời gian tương đối (<code>EcuM_SetRelAlarmClock</code>) hoặc tuyệt đối (<code>EcuM_SetAbsAlarmClock</code>) mà không cần bất kỳ gói tin mạng nào từ bên ngoài.</p>
  {d["alarm_clock"]}
  <ul>
    <li><b>Ứng dụng thực tế trên xe:</b> ECU quản lý Pin (BMS) ngủ qua đêm nhưng hẹn Alarm Clock cứ mỗi 4 tiếng tự dậy 1 lần đo điện áp cell pin rồi ngủ tiếp; hoặc ECU Telematics tự thức lúc 02:00 sáng để kiểm tra bản cập nhật OTA.</li>
    <li><b>Quy tắc Master Alarm:</b> Nếu nhiều User cùng hẹn giờ khác nhau, EcuM luôn chọn <b>thời điểm gần nhất (minimum remaining time)</b> để lập trình cho bộ đếm phần cứng Gpt Wakeup Source.</li>
    <li><b>Hủy hẹn giờ:</b> Gọi <code>EcuM_AbortWakeupAlarm(User)</code> để hủy Alarm Clock của User đó. Khi timer Gpt đếm về 0 lúc đang ngủ, ngắt Gpt kích hoạt nguồn <code>INTERNAL_GPT / Wakeup</code> đánh thức CPU quay lại pha UP!</li>
  </ul>
</div>
"""
                },
                {
                    "label": "4.4 WakeupRestart & MCU Mode Recovery",
                    "html": f"""
<div class="hb-card">
  <h3>🔋 Chuỗi Phục Hồi Sau Giấc Ngủ (WakeupRestart Sequence)</h3>
  <p>Một ưu điểm vượt trội của <code>SLEEP</code> so với <code>OFF + Cold Reset</code> là thời gian hồi sinh cực nhanh (~2–5 ms thay vì ~50–150 ms) vì toàn bộ biến toàn cục trên RAM, các Task của OS, và bảng định tuyến RTE đều còn nguyên vẹn.</p>
  <table class="tbl">
    <thead><tr><th>Thứ tự bước</th><th>API / Callout thực thi</th><th>Tác dụng chi tiết</th></tr></thead>
    <tbody>
      <tr><td>1</td><td><code>Mcu_SetMode(MCU_MODE_NORMAL)</code></td><td>Đóng lại khóa PLL clock tốc độ cao cho CPU và các Bus ngoại vi (APB/AHB).</td></tr>
      <tr><td>2</td><td><code>EcuM_CheckRamHash()</code> *(nếu GoHalt)*</td><td>Kiểm tra toàn vẹn vùng RAM giữ trạng thái; lỗi &rarr; nhảy thẳng <code>EcuM_ErrorHook()</code>.</td></tr>
      <tr><td>3</td><td><code>EcuM_DisableWakeupSources(mask)</code></td><td>Tắt các chân ngắt đánh thức chuyên dụng để trả chân phần cứng về chế độ giao tiếp bình thường (VD: chân CAN_RX trả về module Can).</td></tr>
      <tr><td>4</td><td><code>EcuM_AL_DriverRestart(ConfigPtr)</code></td><td>Khởi động lại các ngoại vi bị ngắt điện trong giấc ngủ (PWM, ADC, I2C, Watchdog tần số cao).</td></tr>
      <tr><td>5</td><td>Mở ngắt toàn cục &amp; Cập nhật Pha UP</td><td>OS tiếp tục tick bình thường; các bit Wakeup hợp lệ được chuyển giao cho BswM / ComM để mở mạng bus!</td></tr>
    </tbody>
  </table>
</div>
"""
                }
            ]
        },

        # ==================== TAB 4: WAKEUP VALIDATION PROTOCOL ====================
        {
            "title": "5. Wakeup Validation Protocol",
            "subs": [
                {
                    "label": "5.1 Bitmask 32-bit & 5+N Nguồn Wakeup",
                    "html": f"""
<div class="hb-card">
  <h3>🧬 Giải Phẫu Mặt Nạ Bit 32-Bit (EcuM_WakeupSourceType)</h3>
  <p>Toàn bộ hệ thống đánh thức của EcuM hoạt động thông qua kiểu dữ liệu mặt nạ bit không dấu 32-bit: <code>typedef uint32 EcuM_WakeupSourceType</code>. Điều này cho phép một ECU cấu hình tối đa <b>32 nguồn đánh thức độc lập</b> và cập nhật đồng thời bằng các phép toán bit O(1) an toàn ngay trong ngắt ISR!</p>
  {d["wkup_bitmask"]}
  <table class="tbl">
    <thead><tr><th>Bit</th><th>Tên nguồn trong Simulator</th><th>Loại</th><th>ValidationTimeout</th><th>Ý nghĩa phần cứng</th></tr></thead>
    <tbody>
      <tr><td class="mono">Bit 0 (0x01)</td><td><code>POWER</code></td><td>AUTOSAR Chuẩn</td><td>0 ms (Tin cậy ngay)</td><td>Cấp nguồn chính lần đầu (KL30 Power-On Reset).</td></tr>
      <tr><td class="mono">Bit 1 (0x02)</td><td><code>RESET</code></td><td>AUTOSAR Chuẩn</td><td>0 ms (Tin cậy ngay)</td><td>Reset phần mềm / nút reset ngoài (Pin Reset).</td></tr>
      <tr><td class="mono">Bit 2 (0x04)</td><td><code>INTERNAL_RESET</code></td><td>AUTOSAR Chuẩn</td><td>0 ms (Tin cậy ngay)</td><td>Reset nội bộ do MCU (Trap / Flash ECC / S/W reset).</td></tr>
      <tr><td class="mono">Bit 3 (0x08)</td><td><code>INTERNAL_WDG</code></td><td>AUTOSAR Chuẩn</td><td>0 ms (Tin cậy ngay)</td><td>Reset do Watchdog nội bộ hết hạn (treo Task).</td></tr>
      <tr><td class="mono">Bit 4 (0x10)</td><td><code>EXTERNAL_WDG</code></td><td>AUTOSAR Chuẩn</td><td>0 ms (Tin cậy ngay)</td><td>Reset từ IC Watchdog ngoài / SBC.</td></tr>
      <tr><td class="mono">Bit 5 (0x20)</td><td><code>CAN_CH0_RX</code></td><td>User Defined</td><td>Cấu hình (VD: 200 ms)</td><td>Xung cạnh xuống trên chân bus CAN thông qua CanTrcv.</td></tr>
      <tr><td class="mono">Bit 6 (0x40)</td><td><code>LIN_CH1_RX</code></td><td>User Defined</td><td>Cấu hình (VD: 150 ms)</td><td>Xung Sync Break trên dây bus LIN1 thông qua LinTrcv.</td></tr>
      <tr><td class="mono">Bit 7 (0x80)</td><td><code>KL15_IGNITION</code></td><td>User Defined</td><td>0 ms hoặc chống dội 50 ms</td><td>Tín hiệu chìa khóa đánh lửa (Ignition Switch) qua Dio/Icu.</td></tr>
    </tbody>
  </table>
</div>
"""
                },
                {
                    "label": "5.2 State Machine (NONE->PENDING->VALIDATED/EXPIRED)",
                    "html": f"""
<div class="hb-card">
  <h3>🔀 Máy Trạng Thái Xác Thực Nguồn Đánh Thức (SWS_EcuM_02344)</h3>
  <p>Mỗi bit <i>k</i> trong 32 nguồn đánh thức đều sở hữu một máy trạng thái riêng gồm 4 trạng thái được biểu diễn thông qua tổ hợp 3 thanh ghi mặt nạ song song: <b><code>PendingWakeupEvents</code></b>, <b><code>ValidatedWakeupEvents</code></b> và <b><code>ExpiredWakeupEvents</code></b>.</p>
  {d["wkup_sm"]}
  <ul>
    <li><b>NONE (0, 0, 0):</b> Nguồn đang nghỉ bình thường.</li>
    <li><b>PENDING (1, 0, 0):</b> Driver phần cứng gọi <code>EcuM_SetWakeupEvent(src)</code> với một nguồn có <code>EcuMValidationTimeout &gt; 0</code>. ECU phải thức tạm để lắng nghe xác thực!</li>
    <li><b>VALIDATED (0, 1, 0):</b> Có 2 con đường để vào trạng thái này:
      <ol>
        <li><code>ValidationTimeout == 0 ms</code>: Nguồn tin cậy tuyệt đối (như <code>POWER</code>, <code>KL15</code>), đi thẳng từ <code>NONE &rarr; VALIDATED</code> ngay trong <code>SetWakeupEvent()</code>!</li>
        <li>Đang <code>PENDING</code> và tầng giao tiếp (<code>CanIf / LinIf</code>) nhận được frame hợp lệ trước khi hết giờ &rarr; gọi <code>EcuM_ValidateWakeupEvent(src)</code>!</li>
      </ol>
    </li>
    <li><b>EXPIRED (0, 0, 1):</b> Bộ đếm validation trong <code>EcuM_MainFunction()</code> đếm về <code>0 ms</code> mà vẫn không thấy gói tin hợp lệ &rarr; Rơi vào <code>EXPIRED</code>, gọi <code>EcuM_StopWakeupSources(src)</code> và báo ECU ngủ trở lại!</li>
  </ul>
</div>
"""
                },
                {
                    "label": "5.3 Chống Nhiễu (Glitch Filter) & Start/StopSources",
                    "html": f"""
<div class="hb-card">
  <h3>📡 Cơ Chế Chống Nhiễu Điện Từ (EMI Glitch Filtering)</h3>
  <p>Trên ô tô, dây cáp CAN dài hàng mét đi qua khoang động cơ rất dễ bị nhiễu tĩnh điện hoặc tia lửa điện gây ra 1 xung điện áp giả trên đường bus. Nếu không có cơ chế <b>Wakeup Validation Timeout</b>, mỗi xung nhiễu sẽ đánh thức toàn bộ xe, mở mạng ComM và làm cạn bình ắc quy qua đêm!</p>
  {d["glitch_filter"]}
  <table class="tbl">
    <thead><tr><th>Tình huống</th><th>Hành động của EcuM</th><th>ComM có bị đánh thức không?</th></tr></thead>
    <tbody>
      <tr><td><b>Gói tin CAN thật</b> (Tức thì có Frame hợp lệ)</td><td>CanTrcv gọi <code>SetWakeupEvent</code> &rarr; <code>StartWakeupSources()</code> bật Can Controller nghe bus &rarr; CanIf giải mã CRC đúng gọi <code>ValidateWakeupEvent()</code>.</td><td>✅ <b>Có!</b> EcuM gọi <code>ComM_EcuM_WakeUpIndication(Channel)</code>.</td></tr>
      <tr><td><b>Nhiễu EMI thoáng qua</b> (Glitch không có Frame thật)</td><td>CanTrcv gọi <code>SetWakeupEvent</code> &rarr; <code>StartWakeupSources()</code> nghe bus trong <code>200 ms</code> &rarr; Hết timeout không có Frame &rarr; rơi sang <b><code>EXPIRED</code></b> &rarr; <code>StopWakeupSources()</code>.</td><td>❌ <b>Không bao giờ!</b> BswM thấy không có nguồn Validated nên lập tức đưa ECU ngủ lại <code>SLEEP</code>.</td></tr>
    </tbody>
  </table>
</div>
"""
                },
                {
                    "label": "5.4 Selective Wakeup PNC & WUF",
                    "html": f"""
<div class="hb-card">
  <h3>🎯 Đánh Thức Chọn Lọc Mạng Con (Partial Networking - PNC &amp; WUF)</h3>
  <p>Trong kiến trúc E/E hiện đại có hàng chục ECU dùng chung 1 đường dây CAN Backbone, đôi khi xe chỉ cần đánh thức cụm Đèn Cửa mà không cần đánh thức ECU Động Cơ hay Cửa Sổ Trời. Công nghệ <b>Selective Wakeup (ISO 11898-2)</b> giải quyết bài toán này trực tiếp ở mức phần cứng Transceiver.</p>
  {d["pnc_wakeup"]}
  <ul>
    <li>Khi bus CAN có tín hiệu, bộ lọc phần cứng bên trong <b><code>CanTrcv</code></b> tự đối chiếu CAN-ID và bitmask payload <b>WUF (Wake-Up Frame)</b> được lập trình sẵn mà không cần đánh thức CPU trước nếu sai mã PNC!</li>
    <li>Nếu WUF khớp đúng mã cụm PNC của ECU này: CPU thức dậy &rarr; <code>CanTrcv</code> báo <code>SetWakeupEvent</code> &rarr; <code>CanIf</code> gọi <code>ValidateWakeupEvent</code> &rarr; EcuM đọc tham chiếu <code>EcuMComMPNCRef</code> (<code>Can0ComMPNCRefEnabled == TRUE</code>) và gọi <b><code>ComM_EcuM_PNCWakeUpIndication(PNC_ID)</code></b> để chỉ mở đúng kênh logic PNC đó thay vì bật tràn lan cả cụm!</li>
  </ul>
</div>
"""
                }
            ]
        },

        # ==================== TAB 5: MULTI-CORE, API & 34 ECUC ====================
        {
            "title": "6. Multi-Core, API & 34 ECUC",
            "subs": [
                {
                    "label": "6.1 Multi-Core Master/Slave Barrier",
                    "html": f"""
<div class="hb-card">
  <h3>🧩 Đồng Bộ Đa Nhân Master Core 0 &harr; Slave Cores</h3>
  <p>Các Vi điều khiển ô tô hiện đại (như Infineon Aurix TC3xx/TC4xx hay NXP S32G) thường sở hữu 2 đến 6 nhân xử lý. Trong AUTOSAR Multi-Core, <b>Core 0 được chỉ định là Master EcuM</b>, các nhân còn lại đóng vai trò <b>Slave Core</b>.</p>
  {d["multicore"]}
  <div class="hb-grid2">
    <div>
      <h4>🚀 Quy trình Startup Đa Nhân</h4>
      <ol>
        <li>Reset phần cứng mặc định chỉ đánh thức <b>Master Core 0</b> chạy <code>EcuM_Init()</code>.</li>
        <li>Master thực hiện <code>DriverInitZero</code> &amp; <code>DriverInitOne</code> rồi gọi <b><code>StartCore(CoreId, &amp;Status)</code></b> để đánh thức các Slave Core.</li>
        <li>Cả Master và Slave đều gọi <code>StartOS()</code>; tại hàng rào đồng bộ OS, tất cả các nhân khớp đồng bộ rồi cùng bước vào <code>EcuM_StartupTwo()</code> của riêng nhân mình.</li>
      </ol>
    </div>
    <div>
      <h4>🛑 Quy trình Ngủ / Tắt Đa Nhân</h4>
      <ol>
        <li>Khi Master muốn tắt nguồn hoặc ngủ Halt qua <code>GoDownHaltPoll()</code>, Master phát tín hiệu yêu cầu tắt tới tất cả Slave.</li>
        <li>Slave Core 1 thực thi <code>NvM / local cleanup</code> xong sẽ bật cờ báo <b>ReadyForSleep</b>.</li>
        <li>Nếu <code>SlaveCore1ReadyForSleep == FALSE</code>, Master bị chặn lại tại rào chắn đồng bộ (<code>WAIT_SLAVE_SYNC</code>) — không bao giờ tắt nguồn giữa chừng làm treo Slave Core!</li>
      </ol>
    </div>
  </div>
</div>
"""
                },
                {
                    "label": "6.2 Bảng Tham Chiếu API & Callout R23-11",
                    "html": f"""
<div class="hb-card">
  <h3>📘 Bảng Tham Chiếu Chuẩn API &amp; Callouts (AUTOSAR SWS_EcuM R23-11)</h3>
  <table class="tbl">
    <thead><tr><th>Tên hàm (AUTOSAR API / Callout)</th><th>SWS Ref</th><th>Loại</th><th>Chức năng chính</th></tr></thead>
    <tbody>
      <tr><td class="mono">EcuM_Init()</td><td>02811</td><td>API</td><td>Khởi chạy StartPreOS từ main(); kết thúc bằng StartOS().</td></tr>
      <tr><td class="mono">EcuM_StartupTwo()</td><td>02838</td><td>API</td><td>Khởi chạy StartPostOS từ OsTask_Init: gọi SchM_Init() &amp; BswM_Init().</td></tr>
      <tr><td class="mono">EcuM_MainFunction()</td><td>02839</td><td>Scheduled</td><td>Đếm lùi ValidationTimeout, RunMinimumDuration, AlarmClock; báo EXPIRED.</td></tr>
      <tr><td class="mono">EcuM_SetState(state)</td><td>04005</td><td>API (Flex)</td><td>BswM cập nhật trạng thái pha logic cho EcuM Flexible.</td></tr>
      <tr><td class="mono">EcuM_RequestRUN(user) / ReleaseRUN(user)</td><td>01144/45</td><td>API</td><td>Xin/nhả khóa giữ trạng thái APP_RUN không cho phép ngủ/tắt.</td></tr>
      <tr><td class="mono">EcuM_RequestPOST_RUN / ReleasePOST_RUN</td><td>01146/47</td><td>API</td><td>Xin/nhả khóa giữ pha hậu kỳ POST_RUN cho NvM/Dcm dọn dẹp.</td></tr>
      <tr><td class="mono">EcuM_SelectShutdownTarget(tgt, mode)</td><td>02822</td><td>API</td><td>Đặt mục tiêu OFF, RESET (+ResetMode), hoặc SLEEP (+SleepMode).</td></tr>
      <tr><td class="mono">EcuM_SelectBootTarget(bootTarget)</td><td>02835</td><td>API</td><td>Chọn đích khởi động sau Reset (APP, OEM_BOOTLOADER, SYS_BOOTLOADER).</td></tr>
      <tr><td class="mono">EcuM_SelectShutdownCause(cause)</td><td>03227</td><td>API</td><td>Lưu nguyên nhân tắt ECU (OEM/ECU Cause ID) phục vụ chuẩn đoán.</td></tr>
      <tr><td class="mono">EcuM_GoDownHaltPoll(caller)</td><td>04050</td><td>API (Flex)</td><td>Thực thi mục tiêu đã chọn: vào GoHalt, GoPoll, hoặc Shutdown PreOS.</td></tr>
      <tr><td class="mono">EcuM_Shutdown()</td><td>02812</td><td>API</td><td>Chạy pha OffPreOS từ ShutdownHook(): OnGoOffTwo &rarr; SwitchOff / Reset.</td></tr>
      <tr><td class="mono">EcuM_SetWakeupEvent(sources)</td><td>02826</td><td>Callback</td><td>Driver/ISR báo có tín hiệu đánh thức: vào PENDING hoặc VALIDATED.</td></tr>
      <tr><td class="mono">EcuM_ValidateWakeupEvent(sources)</td><td>02827</td><td>Callback</td><td>CanIf/LinIf xác nhận frame hợp lệ &rarr; nâng PENDING lên VALIDATED.</td></tr>
      <tr><td class="mono">EcuM_ClearWakeupEvent(sources)</td><td>02828</td><td>API</td><td>Xóa bit trên cả Pending, Validated và Expired trước khi ngủ.</td></tr>
      <tr><td class="mono">EcuM_SetRelAlarmClock / AbortWakeupAlarm</td><td>04054/61</td><td>API</td><td>Hẹn hoặc hủy đồng hồ báo thức tự đánh thức ECU bằng GPT.</td></tr>
      <tr><td class="mono">EcuM_AL_DriverInitZero / One / Restart</td><td>02411/16/961</td><td>Callout</td><td>Các hook người dùng tự điền lệnh init MCAL trước OS và sau Sleep.</td></tr>
      <tr><td class="mono">EcuM_GenerateRamHash / CheckRamHash</td><td>02926</td><td>Callout</td><td>Bảo toàn chữ ký checksum RAM trước/sau khi tắt xung nhịp CPU trong GoHalt.</td></tr>
      <tr><td class="mono">EcuM_OnGoOffOne / OnGoOffTwo</td><td>02916/17</td><td>Callout</td><td>Hook cắt dọn phần mềm trước và sau ShutdownOS().</td></tr>
      <tr><td class="mono">EcuM_AL_SwitchOff / EcuM_AL_Reset</td><td>02920/4045</td><td>Callout</td><td>Tác động phần cứng cuối cùng: thả chân SBC Latch hoặc Reset MCU.</td></tr>
    </tbody>
  </table>
</div>
"""
                },
                {
                    "label": "6.3 Cây Chẩn Đoán Lỗi & DET Codes",
                    "html": f"""
<div class="hb-card">
  <h3>🛠️ Cây Chẩn Đoán Lỗi Thực Chiến &amp; Bảng Mã DET EcuM</h3>
  <p>Khi ECU không chịu đi ngủ, bị treo ở Bootloop, hoặc báo lỗi ngắt nguồn đột ngột, hãy dò theo cây quyết định dưới đây hoặc kiểm tra bảng mã lỗi <code>Det_ReportError(ModuleId = 10)</code>.</p>
  {d["debug_tree"]}
  <table class="tbl">
    <thead><tr><th>Mã lỗi DET / ErrorHook</th><th>Code</th><th>Nguyên nhân gốc rễ (Root Cause)</th><th>Cách xử lý trong Simulator</th></tr></thead>
    <tbody>
      <tr><td class="mono">ECUM_E_UNINIT</td><td>0x10</td><td>Gọi API EcuM (như RequestRUN, GoDownHaltPoll) khi <code>EcuMInitialized == FALSE</code>.</td><td>Gọi <code>EcuM_Init()</code> trước hoặc bật <code>EcuMInitialized</code>.</td></tr>
      <tr><td class="mono">ECUM_E_INVALID_PAR</td><td>0x12</td><td>Tham số không hợp lệ (User vượt ngưỡng, hoặc User0 gọi GoDown khi không được cấp quyền).</td><td>Kiểm tra lại ID User hoặc bật <code>EcuMGoDownAllowedForUser0</code>.</td></tr>
      <tr><td class="mono">ECUM_E_UNKNOWN_WAKEUP_SOURCE</td><td>0x15</td><td>Truyền bitmask WakeupSource = 0 hoặc chứa bit chưa khai báo vào SetWakeupEvent().</td><td>Kiểm tra giá trị bitmask hợp lệ trong bảng Wakeup Source.</td></tr>
      <tr><td class="mono">ECUM_E_CONFIGURATION_DATA_INCONSISTENT</td><td>ErrorHook</td><td><code>InjectedPbConfigHash != EcuMConfigConsistencyHash</code> lúc StartPreOS.</td><td>Đồng bộ lại phiên bản file PBcfg và Pre-Compile.</td></tr>
      <tr><td class="mono">ECUM_RAM_CHECK_FAILED</td><td>ErrorHook</td><td><code>EcuM_CheckRamHash()</code> trả về 0 sau khi thoát <code>GoHalt()</code> (RAM hỏng do sụt áp).</td><td>Reset lạnh ECU thay vì phục hồi từ RAM lỗi.</td></tr>
    </tbody>
  </table>
</div>
"""
                },
                {
                    "label": "6.4 Từ Điển 34 Trường Config ECUC",
                    "html": f"""
<div class="hb-card">
  <h3>🎛️ Từ Điển Toàn Bộ 34 Tham Số ECUC Trong Simulator</h3>
  <p>Ở thanh bên trái trình mô phỏng, di chuột đứng yên <b>&gt;1 giây</b> lên bất kỳ tham số nào hoặc bấm biểu tượng <span class="cfg-i" style="display:inline-flex">i</span> để xem tooltip giải thích chuyên sâu (ECUC Path, Miền giá trị, Vai trò, Cơ chế &amp; Tác động). Dưới đây là danh mục 34 tham số chia theo 6 nhóm Tab:</p>
  <table class="tbl">
    <thead><tr><th>Nhóm Config Tab</th><th>Danh sách các trường (ECUC Parameters)</th><th>Tác dụng điều khiển trong Simulator</th></tr></thead>
    <tbody>
      <tr><td><b>01. General (6)</b></td><td class="mono">EcuMInitialized, EcuMArchitectureVariant, EcuMDevErrorDetect, EcuMVersionInfoApi, EcuMMainFunctionPeriod, EcuMLoopDetectionEnabled</td><td>Bật tắt DET UNINIT, chọn Flexible/Fixed, chu kỳ MainFunction ms, bật chống bootloop.</td></tr>
      <tr><td><b>02. Startup (6)</b></td><td class="mono">EcuMDefaultAppMode, EcuMConfigConsistencyHash, InjectedPbConfigHash, SimulatedMcuResetReason, EcuMDriverInitZeroEnabled, EcuMDriverInitOneEnabled</td><td>Kiểm thử Hash mismatch, giả lập lý do Reset phần cứng từ Mcu, bật tắt DriverInitZero/One.</td></tr>
      <tr><td><b>03. Target (6)</b></td><td class="mono">EcuMDefaultShutdownTarget, EcuMSleepModeId, EcuMSleepModeSuspend, EcuMResetModeId, EcuMShutdownCauseId, CurrentBootTarget</td><td>Chọn đích SLEEP/RESET/OFF, phân biệt GoHalt vs GoPoll, định hướng Boot FBL vs APP.</td></tr>
      <tr><td><b>04. Wakeup (6)</b></td><td class="mono">Can0WakeupValidationTimeout, Lin1WakeupValidationTimeout, Kl15WakeupValidationTimeout, Can0ComMChannelRefEnabled, Can0ComMPNCRefEnabled, EcuMSleepModeWakeupSourceMask</td><td>Điều chỉnh thời gian chống nhiễu timeout ms, bật ComM/PNC route, cấu hình mặt nạ nguồn được phép đánh thức khi ngủ.</td></tr>
      <tr><td><b>05. Run/Alarm (6)</b></td><td class="mono">EcuMRunMinimumDuration, User0_RunRequestActive, User1_PostRunRequestActive, EcuMAlarmClockPresent, EcuMAlarmClockTimeOut, EcuMGoDownAllowedForUser0</td><td>Điều khiển khóa RUN/POST_RUN, timer RunMinimumDuration, hẹn giờ Alarm Clock và quyền gọi GoDownHaltPoll.</td></tr>
      <tr><td><b>06. Core/RAM (4)</b></td><td class="mono">EcuMMultiCoreSupport, SlaveCore1ReadyForSleep, SimulateRamHashCorruption, NvMWriteAllPendingDelay</td><td>Mô phỏng rào chắn Master-Slave Core 1, tiêm lỗi hỏng RAM khi Halt và độ trễ NvM_WriteAll().</td></tr>
    </tbody>
  </table>
</div>
"""
                }
            ]
        }
    ]


JS_HB_TAIL = r"""
// ================= PART 6: MULTI-LEVEL HANDBOOK & ABBREVIATION SEARCH =================

let currentHbTab1 = 0;
let currentHbSubTab = [0, 0, 0, 0, 0, 0];
let currentAbbrCategory = "ALL";
let currentAbbrSearch = "";

function highlightMatch(text, q) {
  const safe = escapeHtmlSafe(text);
  if (!q) return safe;
  const esc = q.replace(/[.*+?^${}()|\[\]\\]/g, "\\$&");
  const re = new RegExp("(" + esc + ")", "gi");
  return safe.replace(re, "<mark>$1</mark>");
}

function switchHbTab1(idx) {
  currentHbTab1 = Math.max(0, Math.min(6, idx));
  renderCurrentHandbookView();
}

function switchHbSubTab(subIdx) {
  if (currentHbTab1 >= 0 && currentHbTab1 < 6) {
    currentHbSubTab[currentHbTab1] = subIdx;
    renderCurrentHandbookView();
  }
}

function setAbbrCategory(cat) {
  currentAbbrCategory = cat || "ALL";
  ["ALL", "PHASE", "START", "WKUP", "SLEEP"].forEach((c) => {
    const el = document.getElementById("catPill_" + c);
    if (el) el.classList.toggle("active", c === currentAbbrCategory);
  });
  if (currentHbTab1 === 6) renderAbbreviationTable();
}

function filterAbbreviationTable() {
  const inp = document.getElementById("abbrSearchInput");
  currentAbbrSearch = inp ? inp.value.trim() : "";
  if (currentHbTab1 === 6) renderAbbreviationTable();
}

function renderAbbreviationTable() {
  const q = currentAbbrSearch.toLowerCase();
  const filtered = ABBREVIATIONS_DATA.filter((item) => {
    const catMatch = (currentAbbrCategory === "ALL") || (item.cat === currentAbbrCategory);
    if (!catMatch) return false;
    if (!q) return true;
    const hay = (item.abbr + " " + item.full + " " + item.vi + " " + item.desc + " " + item.sws).toLowerCase();
    return hay.includes(q);
  });

  const badge = document.getElementById("abbrCountBadge");
  if (badge) {
    badge.textContent = filtered.length + " / " + ABBREVIATIONS_DATA.length + " thuật ngữ";
  }

  const area = document.getElementById("hbContentArea");
  if (!area) return;

  if (!filtered.length) {
    area.innerHTML =
      "<div class=\"hb-card\" style=\"text-align:center;padding:28px\">" +
        "<p style=\"font-size:14px;color:var(--mut)\">Không tìm thấy thuật ngữ nào khớp với từ khóa <b>\"" + escapeHtmlSafe(currentAbbrSearch) + "\"</b> trong nhóm <b>" + escapeHtmlSafe(currentAbbrCategory) + "</b>.</p>" +
      "</div>";
    return;
  }

  const catLabels = {
    PHASE: "🏛️ Phase & Core",
    START: "🚀 Startup & Callout",
    WKUP: "⚡ Wakeup & Validation",
    SLEEP: "💤 Sleep, Shut & Core"
  };

  const rowsHtml = filtered.map((item, idx) =>
    "<tr>" +
      "<td class=\"mono\" style=\"color:var(--mut);width:36px\">" + (idx + 1) + "</td>" +
      "<td class=\"mono\" style=\"font-weight:700;color:var(--pri)\">" + highlightMatch(item.abbr, currentAbbrSearch) + "</td>" +
      "<td><strong>" + highlightMatch(item.full, currentAbbrSearch) + "</strong><br/><span style=\"font-size:11px;color:var(--cyan)\">" + highlightMatch(item.vi, currentAbbrSearch) + "</span></td>" +
      "<td style=\"white-space:nowrap\"><span class=\"step-pill\">" + escapeHtmlSafe(catLabels[item.cat] || item.cat) + "</span></td>" +
      "<td class=\"mono\" style=\"font-size:11px;color:var(--ok)\">" + highlightMatch(item.sws, currentAbbrSearch) + "</td>" +
      "<td>" + highlightMatch(item.desc, currentAbbrSearch) + "</td>" +
    "</tr>"
  ).join("");

  area.innerHTML =
    "<div class=\"hb-card\">" +
      "<h3>📖 Bảng Thuật Ngữ AUTOSAR EcuM &amp; BSW Lifecycle (" + filtered.length + " kết quả)</h3>" +
      "<p>Gõ từ khóa bất kỳ (tên API, SWS_EcuM, bitmask, tiếng Việt hoặc tiếng Anh) hoặc lọc theo nhóm chuyên đề ở thanh phía trên.</p>" +
      "<table class=\"tbl\">" +
        "<thead><tr><th>#</th><th>Thuật Ngữ / API</th><th>Tên Đầy Đủ &amp; Nghĩa Tiếng Việt</th><th>Nhóm</th><th>Tham Chiếu</th><th>Giải Thích Kỹ Thuật Chi Tiết</th></tr></thead>" +
        "<tbody>" + rowsHtml + "</tbody>" +
      "</table>" +
    "</div>";
}

function renderCurrentHandbookView() {
  for (let i = 0; i < 7; i++) {
    const b = document.getElementById("hbTab1_" + i);
    if (b) b.classList.toggle("active", i === currentHbTab1);
  }

  const nav2 = document.getElementById("hbNav2");
  const abbrBar = document.getElementById("hbAbbrFilterBox");
  const area = document.getElementById("hbContentArea");

  if (currentHbTab1 === 6) {
    if (nav2) nav2.classList.add("hidden");
    if (abbrBar) abbrBar.classList.remove("hidden");
    renderAbbreviationTable();
    return;
  }

  if (nav2) nav2.classList.remove("hidden");
  if (abbrBar) abbrBar.classList.add("hidden");

  const tabObj = HANDBOOK_DATA[currentHbTab1];
  if (!tabObj) return;
  const subIdx = Math.max(0, Math.min(tabObj.subs.length - 1, currentHbSubTab[currentHbTab1] || 0));

  if (nav2) {
    nav2.innerHTML = tabObj.subs.map((s, idx) =>
      "<button id=\"hbSubBtn_" + idx + "\" class=\"hb-tab2" + (idx === subIdx ? " active" : "") + "\" onclick=\"switchHbSubTab(" + idx + ")\">" + escapeHtmlSafe(s.label) + "</button>"
    ).join("");
  }

  if (area) {
    area.innerHTML = tabObj.subs[subIdx].html;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initTooltipHandlers();
  loadScenario(0);
  switchCfgTab(0);
  switchInspTab(0);
  setAbbrCategory("ALL");
});
</script>
</body>
</html>
"""


def main():
    assert len(DIAGRAMS) == 18, f"Expected 18 diagrams, got {len(DIAGRAMS)}"
    tabs = build_handbook_tabs()
    assert len(tabs) == 6, f"Expected 6 handbook main tabs, got {len(tabs)}"
    for i, t in enumerate(tabs):
        assert len(t["subs"]) == 4, f"Tab {i} expected 4 sub-tabs, got {len(t['subs'])}"

    out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "part6_handbook.js")
    payload = "const HANDBOOK_DATA = " + json.dumps(tabs, ensure_ascii=False, indent=2) + ";\n" + JS_HB_TAIL
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(payload)
    print(f"Generated {out_path} ({len(payload)} bytes, {len(DIAGRAMS)} embedded SVGs)")


if __name__ == "__main__":
    main()
