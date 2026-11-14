# -*- coding: utf-8 -*-
"""Generates Scripts/build_eep/part6_handbook.js from hb_diagrams_eep.py and structured AUTOSAR Eep handbook & abbreviation data."""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)

from hb_diagrams_eep import build_all_hb_diagrams


def build_handbook_tabs(D):
    return [
        {
            "id": 0,
            "title": "1. Kiến Trúc & Vai Trò Eep",
            "subtabs": [
                {
                    "title": "1.1 Vị Trí MCAL & Stack",
                    "html": f"""
<div class="hb-card">
  <h3>Vị Trí Của Eep Driver (ModuleId 90 / 0x005A) Trong Kiến Trúc AUTOSAR Classic</h3>
  <p><b>Eep (EEPROM Driver)</b> là module thuộc tầng thấp nhất <b>MCAL (Microcontroller Abstraction Layer)</b> trong họ Memory Stack. Eep chịu trách nhiệm trực tiếp đóng gói thanh ghi EEPROM nội vi MCU hoặc điều khiển chip EEPROM gắn ngoài (ví dụ <code>25LC256 / M95256</code> qua bus <code>Spi</code>) thành một giao diện bất đồng bộ thống nhất cho tầng trên.</p>
  {D["hbSvg_0_1"]}
  <ul>
    <li><b>Input của Eep:</b> Nhận địa chỉ offset vật lý tuyến tính <code>Eep_AddressType</code>, độ dài <code>Eep_LengthType</code>, con trỏ bộ đệm RAM từ <code>Ea</code>, lệnh khởi tạo từ <code>EcuM</code>, nhịp polling <code>5ms</code> từ <code>SchM</code>.</li>
    <li><b>Output của Eep:</b> Khung truyền <code>Spi_AsyncTransmit()</code> hoặc thanh ghi <code>EECTRL/EEDATA</code>; Callback <code>Ea_JobEndNotification()</code> / <code>Ea_JobErrorNotification()</code>; báo lỗi <code>Det</code> và <code>Dem</code>.</li>
  </ul>
</div>"""
                },
                {
                    "title": "1.2 Bảng I/O 10 Module Liên Quan",
                    "html": f"""
<div class="hb-card">
  <h3>Bảng Tương Tác Input · Xử Lý · Output Giữa 10 Module Quanh Eep</h3>
  <table class="tbl">
    <thead>
      <tr><th>Module / Tầng</th><th>Input Lấy Từ Đâu</th><th>Cách Xử Lý Bên Trong</th><th>Output Route Đến Đâu</th></tr>
    </thead>
    <tbody>
      <tr><td><b>SWC_App</b> (01_App)</td><td>Sự kiện nghiệp vụ (Odometer, Crash, Calib) &amp; <code>Rte_Call_NvMNotifyJobFinished</code></td><td>Chuẩn bị buffer RAM, KHÔNG bao giờ biết địa chỉ EEPROM vật lý</td><td><code>Rte_Call_NvMService_Read/WriteBlock()</code></td></tr>
      <tr><td><b>RTE</b> (02_RTE)</td><td>Port Client-Server từ SWC &amp; thông báo hoàn tất từ NvM</td><td>Ánh xạ Port sang lời gọi hàm C kèm <code>NvM_BlockIdType</code></td><td><code>NvM_ReadBlock() / NvM_WriteBlock()</code></td></tr>
      <tr><td><b>NvM</b> (03_Services)</td><td>Yêu cầu SWC, <code>EcuM ReadAll/WriteAll</code>, Callback từ Ea</td><td>Xếp hàng đợi Priority, tính CRC16/32, thử lại (Retry) khi fail</td><td><code>MemIf_Read/Write(DeviceIdx=0, BlkNo)</code></td></tr>
      <tr><td><b>MemIf</b> (04_ECUA)</td><td>Lệnh từ NvM kèm tham số <code>DeviceIndex</code></td><td>Multiplexer: <code>Dev=0 -> Ea_*</code>, <code>Dev=1 -> Fee_*</code></td><td>Gọi trực tiếp <code>Ea_Read/Write/SetMode()</code></td></tr>
      <tr><td><b>Ea</b> (04_ECUA)</td><td>Lệnh từ MemIf &amp; Callback <code>Ea_JobEnd/ErrorNotification</code></td><td>Caller trực tiếp duy nhất của Eep; tách <code>Ea_Write</code> thành 3 Sub-Jobs</td><td><code>Eep_Read / Write / Erase / Compare / Cancel</code></td></tr>
      <tr><td><b>Eep Driver</b> (05_MCAL)</td><td>API từ Ea, <code>Eep_Init</code> từ EcuM, nhịp từ SchM, trạng thái HW</td><td>Check DET/Runtime -> Chia Chunk SLOW/FAST -> Verify -> CycleRed</td><td><code>Spi_AsyncTransmit()</code> / Reg nội, Callback Ea, DET/DEM</td></tr>
      <tr><td><b>Spi &amp; EEPROM HW</b></td><td><code>Spi_SetupEB + Spi_AsyncTransmit</code> hoặc thanh ghi EECTRL</td><td>Mở khóa <code>WREN (0x06)</code>, lập trình trang (<code>WIP=1</code> ~5ms)</td><td>Trả dữ liệu đọc MISO, cờ <code>RDSR WIP</code> &amp; IRQ</td></tr>
      <tr><td><b>EcuM / BswM</b></td><td>Pha Startup <code>EcuM_AL_DriverInitOne</code> &amp; Shutdown</td><td>Khởi tạo Eep trước Ea; đổi <code>MemIf_SetMode(FAST)</code> lúc ReadAll</td><td><code>Eep_Init(&amp;Eep_Config)</code> -> <code>Ea_Init()</code></td></tr>
      <tr><td><b>SchM &amp; OS</b></td><td>OS Timer Tick (5ms) &amp; Ngắt phần cứng EEPROM/SPI</td><td>Gọi định kỳ <code>Eep_MainFunction()</code> &amp; khóa vùng găng</td><td>Thúc đẩy Chunk hoặc chạy <code>ISR(Eep_JobEndIsr)</code></td></tr>
      <tr><td><b>DET &amp; DEM</b></td><td><code>Det_ReportError / RuntimeError</code> &amp; <code>Dem_SetEventStatus</code></td><td>Lưu lỗi lập trình (<code>0x00..0x0A</code>) &amp; lỗi phần cứng DTC</td><td>Hiển thị Fault Log, Bit cờ trên Thanh A/B</td></tr>
    </tbody>
  </table>
  {D["hbSvg_0_2"]}
</div>"""
                },
                {
                    "title": "1.3 Mô Hình Bất Đồng Bộ & Callback",
                    "html": f"""
<div class="hb-card">
  <h3>Cơ Chế Xử Lý Bất Đồng Bộ (Non-Blocking Async) &amp; Thông Báo Callback</h3>
  <p>Tất cả 4 hàm tác động bộ nhớ của Eep (<code>Eep_Read</code>, <code>Eep_Write</code>, <code>Eep_Erase</code>, <code>Eep_Compare</code>) đều trả về <b>tức thì trong vài micro-giây</b> với giá trị <code>E_OK</code> sau khi xác thực tham số và ghi nhận Job vào cấu trúc nội bộ. Việc truyền SPI hoặc lập trình cell kéo dài hàng mili-giây được thực thi dần qua hàm chu kỳ <code>Eep_MainFunction()</code>.</p>
  {D["hbSvg_0_3"]}
  <ul>
    <li><b>Khi đang chạy:</b> <code>Eep_GetStatus() == MEMIF_BUSY</code>, <code>Eep_GetJobResult() == MEMIF_JOB_PENDING</code>.</li>
    <li><b>Khi hoàn tất thành công:</b> Status về <code>MEMIF_IDLE</code>, Result = <code>MEMIF_JOB_OK</code> và gọi <code>Ea_JobEndNotification()</code> [SWS_Eep_00141].</li>
    <li><b>Khi lỗi/hủy/lệch:</b> Status về <code>MEMIF_IDLE</code>, Result = <code>MEMIF_JOB_FAILED</code> / <code>MEMIF_JOB_CANCELED</code> / <code>MEMIF_BLOCK_INCONSISTENT</code> và gọi <code>Ea_JobErrorNotification()</code> [SWS_Eep_00142].</li>
  </ul>
</div>"""
                },
                {
                    "title": "1.4 Dual 8-Bit Status & Control Registers",
                    "html": """
<div class="hb-card">
  <h3>Giải Mã 2 Thanh Ghi 8-Bit Trực Quan Trong Trình Mô Phỏng</h3>
  <table class="tbl">
    <thead><tr><th>Bit</th><th>Thanh A: Eep_DriverJobStatusByte</th><th>Thanh B: Eep_HwStatusCtrlByte (EESTAT / RDSR)</th></tr></thead>
    <tbody>
      <tr><td><b>b7</b></td><td><code>EEP_INIT (0x80)</code>: 1 = Đã Init (IDLE/BUSY); 0 = MEMIF_UNINIT</td><td><code>HW_RDY (0x80)</code>: Phần cứng EEPROM / SPI rảnh</td></tr>
      <tr><td><b>b6</b></td><td><code>EEP_BUSY (0x40)</code>: 1 = MEMIF_BUSY (chặn lệnh chen ngang)</td><td><code>WEL_EN (0x40)</code>: Write Enable Latch đã mở (WREN 0x06)</td></tr>
      <tr><td><b>b5</b></td><td><code>JOB_PEND (0x20)</code>: 1 = MEMIF_JOB_PENDING</td><td><code>WIP_BSY (0x20)</code>: Chip EEPROM đang nạp điện áp (WIP=1)</td></tr>
      <tr><td><b>b4</b></td><td><code>JOB_OK (0x10)</code>: 1 = MEMIF_JOB_OK</td><td><code>ERS_OK (0x10)</code>: Xác thực xóa trắng 0xFF (Erase Verify) OK</td></tr>
      <tr><td><b>b3</b></td><td><code>ERR_INC (0x08)</code>: 1 = JOB_FAILED hoặc BLOCK_INCONSISTENT</td><td><code>WR_VRFY (0x08)</code>: Đọc ngược sau ghi (Write Verify) khớp RAM</td></tr>
      <tr><td><b>b2</b></td><td><code>CANCELED (0x04)</code>: 1 = Job vừa bị Eep_Cancel() hủy</td><td><code>CMP_MIS (0x04)</code>: Eep_Compare() bắt được byte sai lệch</td></tr>
      <tr><td><b>b1</b></td><td><code>FAST_MD (0x02)</code>: 1 = MEMIF_MODE_FAST; 0 = SLOW</td><td><code>DEM_ERR (0x02)</code>: Đã phát sự kiện DEM FAILED sang Dem</td></tr>
      <tr><td><b>b0</b></td><td><code>ISR_MD (0x01)</code>: 1 = EepUseInterrupts=TRUE; 0 = Polling</td><td><code>TIMEOUT (0x01)</code>: WIP kẹt &gt; ngưỡng -&gt; EEP_E_TIMEOUT (0x05)</td></tr>
    </tbody>
  </table>
</div>"""
                }
            ]
        },
        {
            "id": 1,
            "title": "2. Địa Chỉ, Chunk & SetMode",
            "subtabs": [
                {
                    "title": "2.1 Địa Chỉ Tuyến Tính & Units",
                    "html": f"""
<div class="hb-card">
  <h3>Quy Tắc Ánh Xạ Địa Chỉ Vật Lý &amp; Đơn Vị Căn Chỉnh (Alignment Units)</h3>
  <p>Khác với lớp <code>Ea</code> dùng số hiệu Block logic (BlockNumber), toàn bộ API của <code>Eep</code> làm việc trên <b>không gian địa chỉ tuyến tính</b> tính từ <code>EepBaseAddress</code>.</p>
  {D["hbSvg_1_1"]}
  <ul>
    <li><b>Kiểm tra biên:</b> Mọi lời gọi phải thỏa <code>EepromAddress &lt; EepSize</code> và <code>EepromAddress + Length &lt;= EepSize</code> [SWS_Eep_00019].</li>
    <li><b>Kiểm tra bội số Unit:</b> Địa chỉ và độ dài phải là bội số của <code>EepReadUnitSize</code> (1B), <code>EepWriteUnitSize</code> (1B), và <code>EepEraseUnitSize</code> (mặc định 8B).</li>
  </ul>
</div>"""
                },
                {
                    "title": "2.2 Chunking SLOW vs FAST Mode",
                    "html": f"""
<div class="hb-card">
  <h3>Chia Nhỏ Dữ Liệu (Cyclic Chunking) Theo Eep_SetMode()</h3>
  <p>Để không làm nghẽn hệ điều hành thời gian thực (RTOS Task Deadline), mỗi lần <code>Eep_MainFunction()</code> chạy chỉ đọc/ghi tối đa một <b>Chunk</b> bằng tham số đã cấu hình cho chế độ hiện tại.</p>
  {D["hbSvg_1_2"]}
  <table class="tbl">
    <thead><tr><th>Chế độ MemIf</th><th>Đọc tối đa / Tick</th><th>Ghi tối đa / Tick</th><th>Ngữ cảnh sử dụng điển hình</th></tr></thead>
    <tbody>
      <tr><td><b>MEMIF_MODE_SLOW</b></td><td><code>EepNormalReadBlockSize</code> (16B)</td><td><code>EepNormalWriteBlockSize</code> (8B)</td><td>Runtime bình thường khi xe đang chạy (ưu tiên Real-Time CPU thấp)</td></tr>
      <tr><td><b>MEMIF_MODE_FAST</b></td><td><code>EepFastReadBlockSize</code> (64B)</td><td><code>EepFastWriteBlockSize</code> (32B)</td><td>Lúc Startup (<code>NvM_ReadAll</code>) &amp; Shutdown (<code>NvM_WriteAll</code>) cần tốc độ 4x</td></tr>
    </tbody>
  </table>
</div>"""
                },
                {
                    "title": "2.3 Hai Máy Trạng Thái Song Song",
                    "html": f"""
<div class="hb-card">
  <h3>Phối Hợp Giữa Driver State Machine &amp; Hardware/SPI State Machine</h3>
  <p>Một điểm tinh tế khi debug MCAL <code>Eep</code> là phân biệt <b>trạng thái phần mềm Driver</b> (do <code>Eep_GetStatus()</code> trả về) và <b>trạng thái phần cứng EEPROM</b> (cờ WEL/WIP bên trong silicon hoặc SPI).</p>
  {D["hbSvg_1_3"]}
</div>"""
                },
                {
                    "title": "2.4 Khởi Tạo EcuM & ReadAll",
                    "html": """
<div class="hb-card">
  <h3>Thứ Tự Chuẩn Khi Bật Nguồn ECU (Startup Sequence)</h3>
  <ol>
    <li><code>EcuM_AL_DriverInitOne()</code> gọi <code>Spi_Init()</code> (nếu dùng External SPI EEPROM) rồi gọi <code>Eep_Init(&amp;Eep_Config)</code>.</li>
    <li>Khi <code>Eep_GetStatus() == MEMIF_IDLE</code>, EcuM mới được gọi <code>Ea_Init(&amp;Ea_Config)</code>.</li>
    <li><code>BswM</code> / <code>NvM</code> chuyển chế độ <code>MemIf_SetMode(MEMIF_MODE_FAST)</code> để chạy <code>NvM_ReadAll()</code> nhanh nhất.</li>
    <li>Sau khi ReadAll hoàn tất, trả lại <code>MemIf_SetMode(MEMIF_MODE_SLOW)</code> cho pha <code>RUN</code>.</li>
  </ol>
</div>"""
                }
            ]
        },
        {
            "id": 2,
            "title": "3. Ghi/Xóa, Verify & Compare",
            "subtabs": [
                {
                    "title": "3.1 WriteCycleReduction",
                    "html": f"""
<div class="hb-card">
  <h3>Tối Ưu Tuổi Thọ Silicon Với EepWriteCycleReduction [SWS_Eep_00024]</h3>
  <p>Mỗi ô nhớ EEPROM vật lý có giới hạn chu kỳ xóa/ghi (ví dụ <code>100,000</code> cycles). Khi bật <code>EepWriteCycleReduction = TRUE</code>, trước khi phát xung lập trình, <code>Eep</code> âm thầm đọc vùng EEPROM mục tiêu để so với dữ liệu RAM.</p>
  {D["hbSvg_2_1"]}
  <p>Trong Kịch bản <b>S7</b>, bạn có thể thử tắt và bật cờ này để nhìn trực tiếp số <code>WriteCount</code> và thời gian thực thi thay đổi ngay trên bản đồ 256 byte!</p>
</div>"""
                },
                {
                    "title": "3.2 Verify vs Compare",
                    "html": f"""
<div class="hb-card">
  <h3>So Sánh Write Verify, Erase Verify Và Lệnh Eep_Compare()</h3>
  {D["hbSvg_2_2"]}
  <ul>
    <li><b>Write Verification [SWS_Eep_00054]:</b> Bắt buộc đọc ngược lại từng byte sau khi ghi xong Chunk. Sai khác -&gt; <code>Dem_SetEventStatus(EEP_E_WRITE_FAILED, FAILED)</code> &amp; <code>MEMIF_JOB_FAILED</code>.</li>
    <li><b>Erase Verification [SWS_Eep_00053]:</b> Kiểm tra toàn bộ vùng vừa xóa có bằng đúng <code>EepEraseValue</code> (0xFF) không. Sai khác -&gt; <code>EEP_E_ERASE_FAILED</code>.</li>
    <li><b>Eep_Compare() [SWS_Eep_00056]:</b> Khi phát hiện byte EEPROM khác RAM, Eep trả về mã trạng thái đặc biệt <b><code>MEMIF_BLOCK_INCONSISTENT</code></b> để lớp trên biết dữ liệu không khớp (ví dụ cần nạp giá trị mặc định ROM), không đánh đồng là hỏng phần cứng Dem.</li>
  </ul>
</div>"""
                },
                {
                    "title": "3.3 Ea 3 Sub-Jobs Trên EEPROM",
                    "html": f"""
<div class="hb-card">
  <h3>Cách Lớp Ea Phân Rã 1 Lệnh Ea_Write Thành 3 Sub-Jobs Eep_Write</h3>
  <p><code>Eep</code> chỉ nhìn thấy từng mảng byte thô (raw bytes). Toàn bộ siêu dữ liệu chống mất nguồn giữa chừng (Power-Loss Protection) đều do lớp <code>Ea</code> tạo ra bằng cách gọi <code>Eep_Write()</code> 3 lần nối tiếp nhau qua Callback.</p>
  {D["hbSvg_2_3"]}
</div>"""
                },
                {
                    "title": "3.4 Stuck Bit & Phục Hồi DEM",
                    "html": """
<div class="hb-card">
  <h3>Cơ Chế Tự Chữa Lành Sự Cố Dem (Event Healing)</h3>
  <p>Trong AUTOSAR, khi ô nhớ EEPROM bị lỗi tạm thời (nhiễu bus SPI hoặc Stuck Bit), Eep báo <code>DEM_EVENT_STATUS_FAILED</code>. Ngay khi một thao tác Write/Read/Erase/Compare kế tiếp ở vùng hợp lệ thành công, Eep chủ động báo lại <code>DEM_EVENT_STATUS_PASSED</code> để hệ thống Dem xóa cờ trạng thái Active Fault.</p>
</div>"""
                }
            ]
        },
        {
            "id": 3,
            "title": "4. Internal vs External SPI HW",
            "subtabs": [
                {
                    "title": "4.1 Kiến Trúc Hai Nhánh Phần Cứng",
                    "html": f"""
<div class="hb-card">
  <h3>So Sánh Internal On-Chip EEPROM vs External SPI EEPROM</h3>
  {D["hbSvg_3_1"]}
  <table class="tbl">
    <thead><tr><th>Thuộc tính</th><th>Internal On-Chip EEPROM</th><th>External SPI EEPROM (25LC256 / M95256)</th></tr></thead>
    <tbody>
      <tr><td><b>Giao tiếp vật lý</b></td><td>Thanh ghi nội vi MCU (<code>EECTRL / EEDATA / EESTAT</code>)</td><td>Module MCAL <code>Spi</code> (<code>Spi_SetupEB + Spi_AsyncTransmit</code>)</td></tr>
      <tr><td><b>Đóng gói khung</b></td><td>Ghi trực tiếp địa chỉ &amp; data vào thanh ghi</td><td>Gói lệnh SPI <code>WREN (0x06) -&gt; WRITE (0x02) -&gt; RDSR (0x05)</code></td></tr>
      <tr><td><b>Độ trễ truyền</b></td><td>Rất thấp (truy cập bus nội AHB/APB)</td><td>Phụ thuộc SPI Baudrate &amp; số kênh Sequence</td></tr>
      <tr><td><b>Điểm dễ hỏng</b></td><td>Brown-out điện áp nạp MCU</td><td>Đứt dây CS/MISO/MOSI dẫn tới treo <code>RDSR WIP=1</code></td></tr>
    </tbody>
  </table>
</div>"""
                },
                {
                    "title": "4.2 Trình Tự SPI Sequence",
                    "html": f"""
<div class="hb-card">
  <h3>Chi Tiết Từng Khung Lệnh Giao Tiếp SPI EEPROM [SWS_Eep_00116]</h3>
  {D["hbSvg_3_2"]}
  <p>Bất kỳ thao tác ghi hoặc xóa nào qua SPI đều phải bắt đầu bằng lệnh 1 byte <code>WREN (0x06)</code> để bật Write Enable Latch (<code>WEL = 1</code>) bên trong chip EEPROM trước khi hạ chân CS cho khung <code>WRITE (0x02)</code>.</p>
</div>"""
                },
                {
                    "title": "4.3 Polling vs Ngắt (ISR)",
                    "html": f"""
<div class="hb-card">
  <h3>Eep_MainFunction Polling vs Eep_JobEndIsr Interrupt-Driven</h3>
  {D["hbSvg_3_3"]}
</div>"""
                },
                {
                    "title": "4.4 Giả Lập Timeout WIP_BUSY",
                    "html": """
<div class="hb-card">
  <h3>Bảo Vệ Hệ Thống Khỏi Treo Vòng Lặp Vô Hạn (EEP_E_TIMEOUT = 0x05)</h3>
  <p>Khi phần cứng EEPROM (hoặc thanh ghi <code>RDSR</code> trên bus SPI) giữ bit <code>WIP = 1</code> quá ngưỡng thời gian thiết kế (trong simulator là <b>3 chu kỳ MainFunction</b>), Eep Driver chủ động thoát khỏi vòng chờ, phát <code>Det_ReportRuntimeError(90, 0, 0x09, EEP_E_TIMEOUT)</code> và gọi <code>Ea_JobErrorNotification()</code> để giải phóng NvM Stack.</p>
</div>"""
                }
            ]
        },
        {
            "id": 4,
            "title": "5. So Sánh Eep vs Fls",
            "subtabs": [
                {
                    "title": "5.1 Bản Chất Silicon EEPROM vs Flash",
                    "html": f"""
<div class="hb-card">
  <h3>Tại Sao AUTOSAR Tách Biệt Eep (EEPROM Driver) Và Fls (Flash Driver)?</h3>
  {D["hbSvg_4_1"]}
</div>"""
                },
                {
                    "title": "5.2 Định Tuyến MemIf Song Song",
                    "html": f"""
<div class="hb-card">
  <h3>Hai Nhánh Song Song Bên Dưới MemIf (Multiplexer)</h3>
  {D["hbSvg_4_2"]}
</div>"""
                },
                {
                    "title": "5.3 Bảng Đối Chiếu Toàn Diện",
                    "html": f"""
<div class="hb-card">
  <h3>Ma Trận So Sánh Chi Tiết Eep vs Fls</h3>
  {D["hbSvg_4_3"]}
</div>"""
                },
                {
                    "title": "5.4 Khi Nào Chọn Eep Thay Vì Fls?",
                    "html": """
<div class="hb-card">
  <h3>Tiêu Chí Lựa Chọn Kiến Trúc Cho Dự Án ECU</h3>
  <ul>
    <li><b>Chọn Eep + Ea + External/Internal EEPROM:</b> Khi ECU cần lưu liên tục dữ liệu nhỏ thay đổi thường xuyên (Odometer, lỗi DTC, học góc lái) và yêu cầu phần mềm BSW gọn nhẹ, không tốn RAM đệm cho thuật toán gom rác (Garbage Collection / Sector Swap) như <code>Fee</code>.</li>
    <li><b>Chọn Fls + Fee + DataFlash:</b> Khi dung lượng dữ liệu NVRAM lớn (&gt; 64KB - 512KB), muốn tối ưu chi phí BOM bằng cách tận dụng DataFlash tích hợp sẵn trong vi điều khiển (như Infineon Aurix TC3xx / NXP S32K3xx).</li>
  </ul>
</div>"""
                }
            ]
        },
        {
            "id": 5,
            "title": "6. API R23-11, Lỗi & 36 ECUC",
            "subtabs": [
                {
                    "title": "6.1 Danh Sách 14 Hàm & Callback Chuẩn",
                    "html": """
<div class="hb-card">
  <h3>Tất Cả Hàm API &amp; Notification Chuẩn AUTOSAR Classic R23-11 (Eep ModuleId = 90)</h3>
  <table class="tbl">
    <thead><tr><th>API / Callback Signature</th><th>ID</th><th>Loại</th><th>Mã SWS</th><th>Chức năng chính</th></tr></thead>
    <tbody>
      <tr><td><code>void Eep_Init(const Eep_ConfigType* ConfigPtr)</code></td><td>0x00</td><td>Sync</td><td>SWS_Eep_00146</td><td>Khởi tạo Driver UNINIT -&gt; IDLE</td></tr>
      <tr><td><code>void Eep_SetMode(MemIf_ModeType Mode)</code></td><td>0x01</td><td>Sync</td><td>SWS_Eep_00147</td><td>Đổi Chunking SLOW &lt;-&gt; FAST khi IDLE</td></tr>
      <tr><td><code>Std_ReturnType Eep_Read(Addr, DstPtr, Len)</code></td><td>0x02</td><td>Async</td><td>SWS_Eep_00148</td><td>Đọc bất đồng bộ từ EEPROM về RAM</td></tr>
      <tr><td><code>Std_ReturnType Eep_Write(Addr, SrcPtr, Len)</code></td><td>0x03</td><td>Async</td><td>SWS_Eep_00149</td><td>Ghi + CycleReduction + Verify</td></tr>
      <tr><td><code>Std_ReturnType Eep_Erase(Addr, Len)</code></td><td>0x04</td><td>Async</td><td>SWS_Eep_00150</td><td>Xóa về EepEraseValue (0xFF) + Verify</td></tr>
      <tr><td><code>Std_ReturnType Eep_Compare(Addr, DataPtr, Len)</code></td><td>0x05</td><td>Async</td><td>SWS_Eep_00151</td><td>So sánh EEPROM vs RAM</td></tr>
      <tr><td><code>void Eep_Cancel(void)</code></td><td>0x06</td><td>Sync</td><td>SWS_Eep_00152</td><td>Hủy Job pending -&gt; CANCELED</td></tr>
      <tr><td><code>MemIf_StatusType Eep_GetStatus(void)</code></td><td>0x07</td><td>Sync</td><td>SWS_Eep_00153</td><td>Trả UNINIT / IDLE / BUSY</td></tr>
      <tr><td><code>MemIf_JobResultType Eep_GetJobResult(void)</code></td><td>0x08</td><td>Sync</td><td>SWS_Eep_00154</td><td>Trả OK / PENDING / FAILED / CANCELED / INCONSISTENT</td></tr>
      <tr><td><code>void Eep_MainFunction(void)</code></td><td>0x09</td><td>Cyclic</td><td>SWS_Eep_00155</td><td>Xử lý từng Chunk theo nhịp 5ms SchM</td></tr>
      <tr><td><code>void Eep_GetVersionInfo(Std_VersionInfoType* ptr)</code></td><td>0x0A</td><td>Sync</td><td>SWS_Eep_00156</td><td>Lấy ModuleId 90 &amp; SW Version</td></tr>
      <tr><td><code>void Ea_JobEndNotification(void)</code></td><td>Cbk</td><td>Callback</td><td>SWS_Eep_00141</td><td>Báo Job thành công lên tầng Ea</td></tr>
      <tr><td><code>void Ea_JobErrorNotification(void)</code></td><td>Cbk</td><td>Callback</td><td>SWS_Eep_00142</td><td>Báo lỗi / hủy / lệch dữ liệu lên tầng Ea</td></tr>
      <tr><td><code>ISR(Eep_JobEndIsr)</code></td><td>ISR</td><td>Interrupt</td><td>SWS_Eep_00117</td><td>Ngắt phần cứng thúc đẩy Chunk kế</td></tr>
    </tbody>
  </table>
</div>"""
                },
                {
                    "title": "6.2 Bảng Mã Lỗi DET, Runtime & DEM",
                    "html": f"""
<div class="hb-card">
  <h3>Phân Tách Rạch Ròi 3 Loại Lỗi Trong AUTOSAR R20-11 .. R23-11</h3>
  {D["hbSvg_5_1"]}
  <table class="tbl">
    <thead><tr><th>Tên Lỗi</th><th>Mã Hex</th><th>Loại</th><th>Hàm Báo Lỗi</th><th>Nguyên Nhân Kích Hoạt</th></tr></thead>
    <tbody>
      <tr><td><code>EEP_E_UNINIT</code></td><td>0x00</td><td>DET Dev</td><td>Det_ReportError</td><td>Gọi API trước khi chạy Eep_Init()</td></tr>
      <tr><td><code>EEP_E_INVALID_ADDRESS</code></td><td>0x01</td><td>DET Dev</td><td>Det_ReportError</td><td>Địa chỉ vượt EepSize hoặc lệch bội số Unit</td></tr>
      <tr><td><code>EEP_E_INVALID_DATA</code></td><td>0x02</td><td>DET Dev</td><td>Det_ReportError</td><td>DataBufferPtr == NULL_PTR</td></tr>
      <tr><td><code>EEP_E_INVALID_LENGTH</code></td><td>0x03</td><td>DET Dev</td><td>Det_ReportError</td><td>Length = 0, Addr+Len &gt; EepSize hoặc lệch Unit</td></tr>
      <tr><td><code>EEP_E_BUSY</code></td><td>0x04</td><td>Runtime</td><td>Det_ReportRuntimeError</td><td>Gọi Read/Write/Erase/SetMode khi đang MEMIF_BUSY</td></tr>
      <tr><td><code>EEP_E_TIMEOUT</code></td><td>0x05</td><td>Runtime</td><td>Det_ReportRuntimeError</td><td>Cờ WIP_HW_BUSY kẹt quá ngưỡng EepTimeoutTicks</td></tr>
      <tr><td><code>EEP_E_INIT_FAILED</code></td><td>0x09</td><td>DET Dev</td><td>Det_ReportError</td><td>Eep_Init(NULL_PTR) hoặc lỗi phần cứng Init</td></tr>
      <tr><td><code>EEP_E_PARAM_POINTER</code></td><td>0x0A</td><td>DET Dev</td><td>Det_ReportError</td><td>versioninfo == NULL_PTR ở Eep_GetVersionInfo()</td></tr>
      <tr><td><code>EEP_E_*_FAILED</code></td><td>DEM</td><td>Ext Prod</td><td>Dem_SetEventStatus</td><td>4 sự kiện: WRITE / READ / ERASE / COMPARE FAILED</td></tr>
    </tbody>
  </table>
</div>"""
                },
                {
                    "title": "6.3 Eep_Cancel() An Toàn",
                    "html": f"""
<div class="hb-card">
  <h3>Chiến Lược Cắt Ngang An Toàn Với Eep_Cancel() [SWS_Eep_00031]</h3>
  {D["hbSvg_5_3"]}
</div>"""
                },
                {
                    "title": "6.4 Từ Điển Đầy Đủ 36 Tham Số ECUC",
                    "html": f"""
<div class="hb-card">
  <h3>Hệ Thống 36 Tham Số Cấu Hình ECUC Trong Trình Mô Phỏng</h3>
  {D["hbSvg_5_2"]}
  <div id="hbEcucDynamicList"></div>
</div>"""
                }
            ]
        }
    ]


ABBREVIATIONS_DATA = [
    # 1. ADDR (15)
    {"abbr": "Eep", "full": "EEPROM Driver Module (MCAL)", "cat": "ADDR", "catLabel": "Eep Core & Addressing", "sws": "Mod 90 / 0x005A", "meaning": "Trình điều khiển phần cứng EEPROM cấp thấp trong AUTOSAR Classic MCAL."},
    {"abbr": "EepBaseAddress", "full": "EEPROM Physical Base Address", "cat": "ADDR", "catLabel": "Eep Core & Addressing", "sws": "ECUC_Eep_00165", "meaning": "Địa chỉ vật lý gốc mà tại đó không gian bộ nhớ Eep bắt đầu."},
    {"abbr": "EepSize", "full": "Configured Usable EEPROM Size", "cat": "ADDR", "catLabel": "Eep Core & Addressing", "sws": "ECUC_Eep_00173", "meaning": "Tổng dung lượng logic/vật lý tối đa (256B ở simulator) cho phép truy cập."},
    {"abbr": "EepTotalSize", "full": "Physical Silicon Total Capacity", "cat": "ADDR", "catLabel": "Eep Core & Addressing", "sws": "ECUC_Eep_00174", "meaning": "Tổng dung lượng vật lý của chip EEPROM; luôn >= EepSize."},
    {"abbr": "EepEraseValue", "full": "EEPROM Erased Cell Value", "cat": "ADDR", "catLabel": "Eep Core & Addressing", "sws": "ECUC_Eep_00193", "meaning": "Giá trị từng byte sau khi Eep_Erase() thành công (0xFF hoặc 0x00)."},
    {"abbr": "EepReadUnitSize", "full": "Minimum Hardware Read Unit", "cat": "ADDR", "catLabel": "Eep Core & Addressing", "sws": "ECUC_Eep_00194", "meaning": "Bội số byte tối thiểu cho địa chỉ và độ dài khi gọi Eep_Read()."},
    {"abbr": "EepWriteUnitSize", "full": "Minimum Hardware Write Unit", "cat": "ADDR", "catLabel": "Eep Core & Addressing", "sws": "ECUC_Eep_00195", "meaning": "Đơn vị byte tối thiểu khi ghi (thường là 1B với EEPROM thực)."},
    {"abbr": "EepEraseUnitSize", "full": "Minimum Hardware Erase Unit", "cat": "ADDR", "catLabel": "Eep Core & Addressing", "sws": "ECUC_Eep_00196", "meaning": "Đơn vị byte tối thiểu bắt buộc khi gọi Eep_Erase() (vd 8B page)."},
    {"abbr": "EepDefaultMode", "full": "Default MemIf Operation Mode", "cat": "ADDR", "catLabel": "Eep Core & Addressing", "sws": "ECUC_Eep_00166", "meaning": "Chế độ mặc định nạp sau khi gọi Eep_Init(&Eep_Config)."},
    {"abbr": "MEMIF_MODE_SLOW", "full": "Memory Interface Slow Mode", "cat": "ADDR", "catLabel": "Eep Core & Addressing", "sws": "SWS_Eep_00011", "meaning": "Chế độ chạy nền ưu tiên ít tải CPU (Chunk đọc 16B, ghi 8B)."},
    {"abbr": "MEMIF_MODE_FAST", "full": "Memory Interface Fast Mode", "cat": "ADDR", "catLabel": "Eep Core & Addressing", "sws": "SWS_Eep_00011", "meaning": "Chế độ truyền tốc độ cao khi Startup/Shutdown (Chunk đọc 64B, ghi 32B)."},
    {"abbr": "EepNormalReadBlockSize", "full": "Normal Mode Read Chunk Size", "cat": "ADDR", "catLabel": "Eep Core & Addressing", "sws": "ECUC_Eep_00171", "meaning": "Số byte tối đa đọc mỗi chu kỳ MainFunction khi ở SLOW Mode."},
    {"abbr": "EepNormalWriteBlockSize", "full": "Normal Mode Write Chunk Size", "cat": "ADDR", "catLabel": "Eep Core & Addressing", "sws": "ECUC_Eep_00172", "meaning": "Số byte tối đa ghi mỗi chu kỳ MainFunction khi ở SLOW Mode."},
    {"abbr": "EepFastReadBlockSize", "full": "Fast Mode Read Chunk Size", "cat": "ADDR", "catLabel": "Eep Core & Addressing", "sws": "ECUC_Eep_00167", "meaning": "Số byte tối đa đọc mỗi chu kỳ MainFunction khi ở FAST Mode."},
    {"abbr": "EepFastWriteBlockSize", "full": "Fast Mode Write Chunk Size", "cat": "ADDR", "catLabel": "Eep Core & Addressing", "sws": "ECUC_Eep_00168", "meaning": "Số byte tối đa ghi mỗi chu kỳ MainFunction khi ở FAST Mode."},

    # 2. HW (13)
    {"abbr": "EEPROM", "full": "Electrically Erasable Programmable ROM", "cat": "HW", "catLabel": "Hardware, SPI & Timing", "sws": "Hardware", "meaning": "Bộ nhớ bất khả biến xóa/ghi được từng byte bằng điện áp."},
    {"abbr": "SPI", "full": "Serial Peripheral Interface", "cat": "HW", "catLabel": "Hardware, SPI & Timing", "sws": "SWS_Eep_00116", "meaning": "Bus nối tiếp 4 dây kết nối MCU với chip EEPROM ngoài (25LC256)."},
    {"abbr": "MOSI", "full": "Master Out Slave In", "cat": "HW", "catLabel": "Hardware, SPI & Timing", "sws": "SPI Bus", "meaning": "Đường truyền lệnh WREN/WRITE và dữ liệu từ MCU xuống chip EEPROM."},
    {"abbr": "MISO", "full": "Master In Slave Out", "cat": "HW", "catLabel": "Hardware, SPI & Timing", "sws": "SPI Bus", "meaning": "Đường đọc dữ liệu và thanh ghi trạng thái RDSR từ EEPROM về MCU."},
    {"abbr": "CS / SS", "full": "Chip Select / Slave Select", "cat": "HW", "catLabel": "Hardware, SPI & Timing", "sws": "SPI Bus", "meaning": "Chân chọn chip mức thấp; cạnh lên CS kích hoạt chu kỳ lập trình EEPROM."},
    {"abbr": "WREN (0x06)", "full": "Write Enable Instruction", "cat": "HW", "catLabel": "Hardware, SPI & Timing", "sws": "SPI EEPROM Cmd", "meaning": "Mã lệnh SPI bắt buộc gửi trước mọi thao tác ghi để bật chốt WEL=1."},
    {"abbr": "WRITE (0x02)", "full": "Write Data to Memory Array", "cat": "HW", "catLabel": "Hardware, SPI & Timing", "sws": "SPI EEPROM Cmd", "meaning": "Mã lệnh SPI nạp byte/page dữ liệu vào địa chỉ EEPROM chỉ định."},
    {"abbr": "READ (0x03)", "full": "Read Data from Memory Array", "cat": "HW", "catLabel": "Hardware, SPI & Timing", "sws": "SPI EEPROM Cmd", "meaning": "Mã lệnh SPI đọc tuần tự dữ liệu ra từ địa chỉ EEPROM bất kỳ."},
    {"abbr": "RDSR (0x05)", "full": "Read Status Register", "cat": "HW", "catLabel": "Hardware, SPI & Timing", "sws": "SPI EEPROM Cmd", "meaning": "Mã lệnh SPI đọc thanh ghi trạng thái chip để thăm dò bit WIP và WEL."},
    {"abbr": "WIP", "full": "Write-In-Progress Bit (Bit 0 RDSR)", "cat": "HW", "catLabel": "Hardware, SPI & Timing", "sws": "HW Status Bit", "meaning": "Bit phần cứng = 1 trong ~5ms khi chip EEPROM đang bận lập trình cell."},
    {"abbr": "WEL", "full": "Write Enable Latch Bit (Bit 1 RDSR)", "cat": "HW", "catLabel": "Hardware, SPI & Timing", "sws": "HW Status Bit", "meaning": "Bit cho phép ghi nội bộ chip, tự xóa về 0 sau khi ghi xong."},
    {"abbr": "ISR (Eep_JobEndIsr)", "full": "Interrupt Service Routine", "cat": "HW", "catLabel": "Hardware, SPI & Timing", "sws": "SWS_Eep_00117", "meaning": "Ngắt hoàn tất phần cứng thúc đẩy Chunk kế nhanh gấp đôi Polling."},
    {"abbr": "EepWriteCycleReduction", "full": "Write Cycle Reduction Optimization", "cat": "HW", "catLabel": "Hardware, SPI & Timing", "sws": "SWS_Eep_00024", "meaning": "Đọc so sánh trước khi ghi; bỏ qua Chunk trùng dữ liệu để tăng tuổi thọ."},

    # 3. STACK (12)
    {"abbr": "MCAL", "full": "Microcontroller Abstraction Layer", "cat": "STACK", "catLabel": "Memory Stack", "sws": "Layered Arch", "meaning": "Tầng phần mềm thấp nhất tiếp xúc trực tiếp thanh ghi vi điều khiển."},
    {"abbr": "Ea", "full": "EEPROM Abstraction (Mod 40)", "cat": "STACK", "catLabel": "Memory Stack", "sws": "SWS_Ea", "meaning": "Lớp trên gọi trực tiếp duy nhất xuống Eep, chia 1 Block thành 3 Sub-Jobs."},
    {"abbr": "MemIf", "full": "Memory Abstraction Interface (Mod 22)", "cat": "STACK", "catLabel": "Memory Stack", "sws": "SWS_MemIf", "meaning": "Bộ định tuyến hợp nhất giữa NvM với Ea (EEPROM) hoặc Fee (Flash)."},
    {"abbr": "NvM", "full": "NVRAM Manager (Mod 20)", "cat": "STACK", "catLabel": "Memory Stack", "sws": "SWS_NvM", "meaning": "Dịch vụ quản lý Queue, CRC, Retry, ReadAll/WriteAll cho ứng dụng."},
    {"abbr": "RTE", "full": "Runtime Environment", "cat": "STACK", "catLabel": "Memory Stack", "sws": "AUTOSAR RTE", "meaning": "Cầu nối trung gian kết nối Client-Server Port từ SWC xuống NvM."},
    {"abbr": "SWC", "full": "Software Component", "cat": "STACK", "catLabel": "Memory Stack", "sws": "App Layer", "meaning": "Thành phần ứng dụng (Odometer, UDS Diagnostic), cách ly hoàn toàn với Eep."},
    {"abbr": "EcuM", "full": "ECU State Manager", "cat": "STACK", "catLabel": "Memory Stack", "sws": "SWS_EcuM", "meaning": "Khởi tạo Eep_Init(&Eep_Config) trước Ea_Init() ở giai đoạn Startup."},
    {"abbr": "BswM", "full": "Basic Software Mode Manager", "cat": "STACK", "catLabel": "Memory Stack", "sws": "SWS_BswM", "meaning": "Điều phối chuyển chế độ MemIf FAST lúc khởi động/tắt máy sang SLOW lúc chạy."},
    {"abbr": "SchM", "full": "Schedule Manager", "cat": "STACK", "catLabel": "Memory Stack", "sws": "SWS_SchM", "meaning": "Lập lịch gọi định kỳ Eep_MainFunction() (mặc định 5ms) và vùng găng."},
    {"abbr": "Sub-Job (Hdr/Data/Ftr)", "full": "Ea Block Write Sub-Jobs", "cat": "STACK", "catLabel": "Memory Stack", "sws": "Ea Architecture", "meaning": "Ea tách mỗi Block thành Header (0xA5) -> Payload -> Footer (0x5A) qua 3 lệnh Eep_Write."},
    {"abbr": "Ea_JobEndNotification", "full": "Job End Success Callback", "cat": "STACK", "catLabel": "Memory Stack", "sws": "SWS_Eep_00141", "meaning": "Hàm callback do Eep gọi lên Ea khi hoàn tất thành công toàn bộ Job."},
    {"abbr": "Ea_JobErrorNotification", "full": "Job Error / Cancel Callback", "cat": "STACK", "catLabel": "Memory Stack", "sws": "SWS_Eep_00142", "meaning": "Hàm callback báo lỗi, hủy lệnh Eep_Cancel() hoặc Compare không khớp lên Ea."},

    # 4. ERR (12)
    {"abbr": "DET", "full": "Default Error Tracer", "cat": "ERR", "catLabel": "Errors: DET, Runtime & Dem", "sws": "SWS_Det", "meaning": "Module ghi nhận lỗi lập trình/tham số (Mod 90) và Runtime Errors."},
    {"abbr": "DEM", "full": "Diagnostic Event Manager", "cat": "ERR", "catLabel": "Errors: DET, Runtime & Dem", "sws": "SWS_Dem", "meaning": "Module quản lý sự kiện chẩn đoán và lưu mã lỗi DTC khi hỏng phần cứng."},
    {"abbr": "EEP_E_UNINIT (0x00)", "full": "Driver Not Initialized Error", "cat": "ERR", "catLabel": "Errors: DET, Runtime & Dem", "sws": "SWS_Eep_00047", "meaning": "Báo qua Det_ReportError khi gọi API lúc Driver đang ở MEMIF_UNINIT."},
    {"abbr": "EEP_E_INVALID_ADDRESS (0x01)", "full": "Address Out-of-Range / Unaligned", "cat": "ERR", "catLabel": "Errors: DET, Runtime & Dem", "sws": "SWS_Eep_00047", "meaning": "Địa chỉ >= EepSize hoặc không chia hết cho Read/Write/Erase UnitSize."},
    {"abbr": "EEP_E_INVALID_DATA (0x02)", "full": "Invalid NULL Data Pointer", "cat": "ERR", "catLabel": "Errors: DET, Runtime & Dem", "sws": "SWS_Eep_00047", "meaning": "Con trỏ DataBufferPtr truyền vào Eep_Read/Write/Compare là NULL_PTR."},
    {"abbr": "EEP_E_INVALID_LENGTH (0x03)", "full": "Invalid Data Length Error", "cat": "ERR", "catLabel": "Errors: DET, Runtime & Dem", "sws": "SWS_Eep_00047", "meaning": "Độ dài = 0, Addr + Length > EepSize hoặc lệch đơn vị UnitSize."},
    {"abbr": "EEP_E_BUSY (0x04)", "full": "Driver Busy Runtime Error", "cat": "ERR", "catLabel": "Errors: DET, Runtime & Dem", "sws": "SWS_Eep_00047", "meaning": "Runtime Error luôn bật khi gọi lệnh mới lúc Eep đang MEMIF_BUSY."},
    {"abbr": "EEP_E_TIMEOUT (0x05)", "full": "Hardware Timeout Runtime Error", "cat": "ERR", "catLabel": "Errors: DET, Runtime & Dem", "sws": "SWS_Eep_00047", "meaning": "Runtime Error kích hoạt khi cờ phần cứng WIP kẹt ở mức 1 quá hạn."},
    {"abbr": "EEP_E_INIT_FAILED (0x09)", "full": "Initialization Failure DET", "cat": "ERR", "catLabel": "Errors: DET, Runtime & Dem", "sws": "SWS_Eep_00047", "meaning": "Lỗi DET khi gọi Eep_Init(NULL_PTR) hoặc lỗi phần cứng khi Init."},
    {"abbr": "EEP_E_PARAM_POINTER (0x0A)", "full": "Null Parameter Pointer DET", "cat": "ERR", "catLabel": "Errors: DET, Runtime & Dem", "sws": "SWS_Eep_00047", "meaning": "Lỗi DET khi truyền NULL_PTR vào Eep_GetVersionInfo()."},
    {"abbr": "MEMIF_BLOCK_INCONSISTENT", "full": "Compare Mismatch Job Result", "cat": "ERR", "catLabel": "Errors: DET, Runtime & Dem", "sws": "SWS_Eep_00056", "meaning": "Kết quả trả về khi Eep_Compare() phát hiện dữ liệu EEPROM lệch với RAM."},
    {"abbr": "EEP_E_WRITE_FAILED", "full": "Dem Hardware Write Failure Event", "cat": "ERR", "catLabel": "Errors: DET, Runtime & Dem", "sws": "SWS_Eep_00054", "meaning": "Sự kiện Dem báo về ECU khi Write Verification phát hiện ô nhớ hỏng / Stuck Bit."}
]


def main():
    D = build_all_hb_diagrams()
    tabs = build_handbook_tabs(D)

    js_lines = [
        "// ================= PART 6: HANDBOOK (6 x 4 = 24 SUB-TABS, 18 SVGs) & 52 ABBREVIATIONS + BOOTSTRAP =================",
        "const HANDBOOK_TABS = " + json.dumps(tabs, ensure_ascii=False) + ";",
        "const ABBREVIATIONS_DATA = " + json.dumps(ABBREVIATIONS_DATA, ensure_ascii=False) + ";",
        "",
        """const hbState = {
  tab1: 0,
  tab2: 0,
  abbrCat: "ALL",
  abbrQuery: ""
};

function switchHbTab1(idx) {
  hbState.tab1 = idx;
  hbState.tab2 = 0;
  for (let i = 0; i <= 6; i++) {
    const b = document.getElementById("hbTab1_" + i);
    if (b) b.classList.toggle("active", i === idx);
  }
  const nav2 = document.getElementById("hbNav2");
  const filterBox = document.getElementById("hbAbbrFilterBox");
  if (idx === 6) {
    if (nav2) nav2.classList.add("hidden");
    if (filterBox) filterBox.classList.remove("hidden");
  } else {
    if (nav2) nav2.classList.remove("hidden");
    if (filterBox) filterBox.classList.add("hidden");
  }
  renderHandbook();
}

function switchHbTab2(idx) {
  hbState.tab2 = idx;
  renderHandbook();
}

function setAbbrCategory(cat) {
  hbState.abbrCat = cat || "ALL";
  ["ALL", "ADDR", "HW", "STACK", "ERR"].forEach((c) => {
    const pill = document.getElementById("catPill_" + c);
    if (pill) pill.classList.toggle("active", c === hbState.abbrCat);
  });
  renderAbbreviationTable();
}

function filterAbbreviationTable() {
  const inp = document.getElementById("abbrSearchInput");
  hbState.abbrQuery = inp ? inp.value.trim() : "";
  renderAbbreviationTable();
}

function highlightMatch(text, query) {
  const safe = escHtml(text);
  if (!query) return safe;
  const qEsc = query.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&");
  try {
    const re = new RegExp("(" + qEsc + ")", "ig");
    return safe.replace(re, "<mark>$1</mark>");
  } catch (e) {
    return safe;
  }
}

function renderAbbreviationTable() {
  const area = document.getElementById("hbContentArea");
  const badge = document.getElementById("abbrCountBadge");
  if (!area) return;

  const q = (hbState.abbrQuery || "").toLowerCase();
  const filtered = ABBREVIATIONS_DATA.filter((item) => {
    if (hbState.abbrCat !== "ALL" && item.cat !== hbState.abbrCat) return false;
    if (!q) return true;
    const hay = `${item.abbr} ${item.full} ${item.catLabel} ${item.sws} ${item.meaning}`.toLowerCase();
    return hay.includes(q);
  });

  if (badge) {
    badge.textContent = `${filtered.length} / ${ABBREVIATIONS_DATA.length} thuật ngữ`;
  }

  if (filtered.length === 0) {
    area.innerHTML = `<div class="hb-card"><h3>Không tìm thấy thuật ngữ phù hợp</h3><p>Không có mục nào khớp với từ khóa <code>${escHtml(hbState.abbrQuery)}</code> trong bộ lọc hiện tại.</p></div>`;
    return;
  }

  const rowsHtml = filtered.map((item) => `
    <tr>
      <td class="mono" style="font-weight:800;color:var(--pri)">${highlightMatch(item.abbr, hbState.abbrQuery)}</td>
      <td>${highlightMatch(item.full, hbState.abbrQuery)}</td>
      <td><span class="state-badge sb-cyan">${escHtml(item.catLabel)}</span></td>
      <td class="mono" style="font-size:11px;color:var(--mut)">${highlightMatch(item.sws, hbState.abbrQuery)}</td>
      <td>${highlightMatch(item.meaning, hbState.abbrQuery)}</td>
    </tr>
  `).join("");

  area.innerHTML = `
    <div class="hb-card">
      <h3>Bảng Tra Cứu 52 Thuật Ngữ &amp; Viết Tắt Chuyên Ngành AUTOSAR Eep</h3>
      <table class="tbl">
        <thead>
          <tr><th>Thuật ngữ / Ký hiệu</th><th>Tên Đầy Đủ</th><th>Phân Nhóm</th><th>SWS / ECUC</th><th>Giải Nghĩa &amp; Vai Trò</th></tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>
  `;
}

function populateEcucDictionaryIntoHandbook() {
  const holder = document.getElementById("hbEcucDynamicList");
  if (!holder) return;
  const rows = Object.keys(defaultConfig).map((k, idx) => {
    const meta = configTooltipData[k] || {};
    return `<tr>
      <td class="mono">${idx + 1}</td>
      <td class="mono" style="font-weight:700;color:var(--pri)">${escHtml(k)}</td>
      <td class="mono" style="font-size:11px">${escHtml(meta.sws || "")}</td>
      <td class="mono" style="font-size:11px">${escHtml(JSON.stringify(defaultConfig[k]))}</td>
      <td>${escHtml(meta.desc || "")}</td>
    </tr>`;
  }).join("");
  holder.innerHTML = `
    <table class="tbl">
      <thead><tr><th>#</th><th>ECUC Parameter</th><th>SWS / ECUC Ref</th><th>Mặc Định</th><th>Giải Thích Chi Tiết</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderHandbook() {
  if (hbState.tab1 === 6) {
    renderAbbreviationTable();
    return;
  }
  const topic = HANDBOOK_TABS[hbState.tab1] || HANDBOOK_TABS[0];
  const nav2 = document.getElementById("hbNav2");
  if (nav2) {
    nav2.innerHTML = topic.subtabs.map((st, i) =>
      `<button class="hb-tab2${i === hbState.tab2 ? " active" : ""}" onclick="switchHbTab2(${i})">${escHtml(st.title)}</button>`
    ).join("");
  }
  const area = document.getElementById("hbContentArea");
  const sub = topic.subtabs[hbState.tab2] || topic.subtabs[0];
  if (area && sub) {
    area.innerHTML = sub.html;
    if (hbState.tab1 === 5 && hbState.tab2 === 3) {
      populateEcucDictionaryIntoHandbook();
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  try {
    const savedRaw = document.body.getAttribute("data-saved-cfg");
    if (savedRaw) {
      const parsed = JSON.parse(savedRaw);
      Object.keys(defaultConfig).forEach((k) => {
        if (parsed && parsed[k] !== undefined) defaultConfig[k] = parsed[k];
      });
    }
  } catch (e) {}
  setupConfigTooltips();
  switchCfgTab(0);
  switchInspTab(0);
  loadScenario("S1");
  renderHandbook();
});"""
    ]

    out_path = os.path.join(HERE, "part6_handbook.js")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(js_lines) + "\n")
    print(f"Generated {out_path}: {len(tabs)} main tabs, {sum(len(t['subtabs']) for t in tabs)} subtabs, {len(D)} SVGs, {len(ABBREVIATIONS_DATA)} abbreviations.")


if __name__ == "__main__":
    main()
