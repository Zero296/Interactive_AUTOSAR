"""Generator script creating part6_handbook.js for AUTOSAR FiM Simulator."""

import json
import os
from hb_diagrams_fim import DIAGRAMS

OUT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "part6_handbook.js")

HANDBOOK_TABS = [
    {
        "title": "Kiến Trúc & Tổng Quan FiM",
        "subs": [
            {
                "title": "1.1 Decoupling SW-C vs Dem",
                "html": f"""
<div class="hb-card">
  <h3>Vai trò Decoupling: Tại Sao SW-C Không Gọi Trực Tiếp Dem?</h3>
  <p>Trong kiến trúc phân lớp AUTOSAR Classic, <b>FiM (Function Inhibition Manager)</b> đóng vai trò là lớp trung gian (<i>Abstraction &amp; Arbitration Layer</i>) nằm giữa tầng ứng dụng (<b>SW-C / RTE</b>) và trình quản lý sự kiện chẩn đoán (<b>Dem</b>).</p>
  {DIAGRAMS["decoupling"]}
  <h4>Vấn đề khi thiết kế kết dính chặt (Tight Coupling)</h4>
  <ul>
    <li><b>Bùng nổ phụ thuộc:</b> Một thuật toán như <code>SwcFuelInjection</code> có thể phải dừng khi có hàng chục lỗi khác nhau (cảm biến áp suất rail, bơm nhiên liệu, điện áp ắc-quy, CAN timeout...). Nếu SW-C tự gọi <code>Dem_GetEventUdsStatus()</code> cho 15 <code>EventId</code>, mọi thay đổi cấu hình lỗi sẽ buộc phải sửa và biên dịch lại mã C ứng dụng.</li>
    <li><b>Giải pháp FiM:</b> SW-C chỉ cần hỏi đúng một cổng boolean qua RTE: <code>FiM_GetFunctionPermission(FID_0, &amp;Permission)</code>.</li>
    <li><b>Lợi ích Calibration:</b> Kỹ sư chẩn đoán/an toàn có thể thêm, bớt hoặc đổi mặt nạ kích hoạt (<code>FiMInhInhibitionMask</code>) trực tiếp trong ARXML/Calib Post-Build mà không cần chạm vào một dòng code nào của SW-C.</li>
  </ul>
</div>
"""
            },
            {
                "title": "1.2 Chuỗi Khởi Tạo 2-Phase",
                "html": f"""
<div class="hb-card">
  <h3>Chuỗi Khởi Tạo 2 Pha (2-Phase Cold-Start Initialization)</h3>
  <p>FiM phụ thuộc trực tiếp vào dữ liệu trạng thái lỗi từ <b>Dem</b> (bao gồm cả dữ liệu NVM được khôi phục sau chu kỳ ngủ). Vì vậy chuẩn <b>SWS_FiM_00059 / SWS_FiM_00060</b> quy định nghiêm ngặt trình tự khởi tạo 2 pha.</p>
  {DIAGRAMS["init_seq"]}
  <table class="tbl">
    <thead><tr><th>Bước</th><th>API / Caller</th><th>Trạng thái FiM sau bước</th><th>Hành vi cấp phép (FID Permission)</th></tr></thead>
    <tbody>
      <tr><td><b>0</b></td><td>Power-On Reset</td><td><code>FIM_UNINIT</code></td><td>Mọi lời gọi API runtime bị chặn bởi DET <code>FIM_E_UNINIT</code> (nếu bật DET), ép <code>*Permission = FALSE</code>.</td></tr>
      <tr><td><b>1</b></td><td><code>EcuM_AL_DriverInitOne()</code> gọi <code>FiM_Init(ConfigPtr)</code></td><td><code>FIM_INITIALIZED_NO_DEM</code></td><td>FiM khởi tạo bảng FID, bộ đếm ức chế = 0, trạng thái khả dụng mặc định = <code>TRUE</code>, nhưng <b>chưa tin cậy Dem</b> nên vẫn trả về an toàn <code>FALSE</code> (hoặc giữ trạng thái chờ đồng bộ Dem).</td></tr>
      <tr><td><b>2</b></td><td><code>Dem_Init()</code> đọc NVM DTC</td><td><code>FIM_INITIALIZED_NO_DEM</code></td><td>Dem khôi phục <code>Dem_UdsStatusByte</code> từ bộ nhớ NvM (VD: giữ bit <code>CDTC</code> / <code>TF</code> từ chuyến xe trước).</td></tr>
      <tr><td><b>3</b></td><td><code>FiM_DemInit()</code></td><td><code>FIM_INITIALIZED</code></td><td>FiM quét đồng loạt tất cả Event cấu hình, tính toán ma trận mặt nạ đầu tiên và mở khóa các FID hợp lệ (<code>E_OK</code>).</td></tr>
    </tbody>
  </table>
</div>
"""
            },
            {
                "title": "1.3 Sơ Đồ 8 Module Tương Tác",
                "html": f"""
<div class="hb-card">
  <h3>Hệ Sinh Thái 8 Module Xung Quanh FiM &amp; Định Tuyến Input/Output</h3>
  <p>Trong hệ thống AUTOSAR Classic đầy đủ, FiM không đứng độc lập mà là giao điểm của 8 khối chức năng từ Application đến BSW Driver.</p>
  {DIAGRAMS["io_map"]}
  <table class="tbl">
    <thead><tr><th>Module</th><th>Hướng tương tác</th><th>API / Interface chuẩn AUTOSAR</th><th>Dữ liệu truyền &amp; Vai trò</th></tr></thead>
    <tbody>
      <tr><td><b>SW-C / RTE</b></td><td>Query Permission &amp; Control</td><td><code>FiM_GetFunctionPermission()</code><br><code>FiM_SetFunctionAvailable()</code></td><td>Input: <code>FID</code>; Output: <code>boolean *Permission</code> quyết định bật/tắt cơ cấu chấp hành hoặc monitor.</td></tr>
      <tr><td><b>Dem (Event)</b></td><td>Input Fault Status</td><td><code>FiM_DemTriggerOnEventStatus()</code><br><code>Dem_GetEventUdsStatus()</code></td><td>Cung cấp 8-bit <code>Dem_UdsStatusByteType</code> theo cơ chế Push hoặc Polling.</td></tr>
      <tr><td><b>Dem (Component)</b></td><td>Input HW Health</td><td><code>FiM_DemTriggerOnComponentStatus()</code></td><td>Cập nhật trạng thái hỏng hóc gộp theo cụm phần cứng cha-con (DAG).</td></tr>
      <tr><td><b>EcuM / BswM</b></td><td>Lifecycle &amp; OS Tick</td><td><code>FiM_Init()</code>, <code>FiM_DemInit()</code>, <code>FiM_MainFunction()</code></td><td>Điều phối trình tự khởi động lạnh 2 pha và nhịp Task 10ms/20ms cho Polling.</td></tr>
      <tr><td><b>Dcm</b></td><td>Indirect via Dem</td><td>UDS <code>0x14</code> -&gt; <code>Dem_ClearDTC()</code></td><td>Reset byte trạng thái về <code>0x50</code>, kích hoạt tính toán lại toàn bộ FID.</td></tr>
      <tr><td><b>Det</b></td><td>Error Sink</td><td><code>Det_ReportError(11, 0, ApiId, ErrId)</code></td><td>Ghi nhận 5 lỗi phát triển <code>0x01..0x05</code> khi gọi sai API hoặc out-of-range.</td></tr>
      <tr><td><b>ECUC / ARXML</b></td><td>Static Calibration</td><td><code>FiM_ConfigType</code>, <code>FiM_Cfg.h</code>, <code>FiM_Lcfg.c</code></td><td>Định nghĩa bảng ánh xạ N-đến-M (Event/Summary/Component -&gt; Mask -&gt; FID).</td></tr>
    </tbody>
  </table>
</div>
"""
            },
            {
                "title": "1.4 Vòng Đời & Trạng Thái Toàn Cục",
                "html": """
<div class="hb-card">
  <h3>Máy Trạng Thái Vòng Đời (FiM Lifecycle State Machine)</h3>
  <p>Khác với ComM có NoCom/SilentCom/FullCom, vòng đời nội bộ của FiM tập trung vào <b>tính hợp lệ của cấu hình và mức độ sẵn sàng đồng bộ với Dem</b> theo nguyên tắc Fail-Safe (<i>SWS_FiM_00059</i>):</p>
  <table class="tbl">
    <thead><tr><th>Trạng thái</th><th>Điều kiện chuyển vào</th><th>Trạng thái FID trả về cho SW-C</th><th>Ghi chú kỹ thuật</th></tr></thead>
    <tbody>
      <tr><td><b>FIM_UNINIT</b></td><td>Reset MCU hoặc <code>FiM_Init(NULL_PTR)</code> thất bại</td><td><code>*Permission = FALSE</code><br>(Return <code>E_NOT_OK</code> + DET)</td><td>Chặn hoàn toàn hành vi cho phép chạy chức năng khi chưa có bảng định cấu hình an toàn.</td></tr>
      <tr><td><b>FIM_INITIALIZED_NO_DEM</b></td><td>Sau <code>FiM_Init(ConfigPtr)</code> hợp lệ</td><td><code>*Permission = FALSE</code> (Chế độ an toàn chờ Dem)</td><td>Xóa sạch cache event nội bộ về 0x50, reset counter ức chế, thiết lập <code>FID.available = TRUE</code>. Chờ <code>FiM_DemInit()</code>.</td></tr>
      <tr><td><b>FIM_INITIALIZED</b></td><td>Sau khi Dem gọi <code>FiM_DemInit()</code></td><td><code>*Permission = (InhCount==0 &amp;&amp; Avail)</code><br>(Return <code>E_OK</code>)</td><td>Trạng thái vận hành bình thường. Cập nhật tức thời qua Push callback hoặc theo chu kỳ qua <code>FiM_MainFunction()</code>.</td></tr>
    </tbody>
  </table>
  <h4>Tại sao phải giữ Permission = FALSE trong pha NO_DEM?</h4>
  <p>Trong thực tế trên xe, ở vài mili-giây đầu tiên khi BSW đang đọc EEPROM/NvM, một cảm biến hoặc động cơ chấp hành không nên hoạt động nếu chúng từng gặp sự cố nghiêm trọng ở chu kỳ lái xe trước hoặc chưa qua kiểm tra khởi động lạnh. Chính sách giữ <code>FALSE</code> cho tới khi <code>FiM_DemInit()</code> hoàn tất là hàng rào bảo vệ tiêu chuẩn ISO 26262.</p>
</div>
"""
            }
        ]
    },
    {
        "title": "Cơ Chế Bit-Level & 4 Mặt Nạ",
        "subs": [
            {
                "title": "2.1 Kiến Trúc So Sánh Bitwise",
                "html": f"""
<div class="hb-card">
  <h3>Bộ So Sánh Bitwise: (Dem_UdsStatusByte &amp; InhMask) == InhPattern</h3>
  <p>Thay vì thực hiện nhiều câu lệnh rẽ nhánh phức tạp, nhân FiM thực thi phép lọc mặt nạ nhị phân thuần túy với độ phức tạp <b>O(1)</b> cho mỗi cấu hình liên kết (<code>FiMInhibitionConfiguration</code>).</p>
  {DIAGRAMS["bitwise_arch"]}
  <h4>Phân tích công thức lõi (SWS_FiM_00097)</h4>
  <ul>
    <li><b>Bước 1 - Lấy Status Byte:</b> FiM đọc bản sao 8-bit <code>Dem_UdsStatusByteType</code> của <code>EventId</code> nguồn (đồng bộ từ Push callback hoặc bộ nhớ cache Polling).</li>
    <li><b>Bước 2 - Bitwise AND (&amp;):</b> Lọc ra chỉ những bit quan trọng (ví dụ chỉ giữ Bit 0 <code>TF</code> hoặc Bit 6 <code>TNCTOC</code>, loại bỏ ảnh hưởng của Bit 2 <code>PDTC</code> hay Bit 3 <code>CDTC</code>).</li>
    <li><b>Bước 3 - So sánh Pattern (==):</b> Kiểm tra giá trị sau khi lọc có khớp chính xác với <code>InhPattern</code> của loại mặt nạ đã chọn hay không.</li>
    <li><b>Kết quả:</b> Nếu khớp -&gt; Điều kiện ức chế kích hoạt (<code>Inhibited = TRUE</code>), tăng bộ đếm ức chế của <code>FID</code> đích lên 1.</li>
  </ul>
</div>
"""
            },
            {
                "title": "2.2 Bảng Chân Lý 4 Mặt Nạ Chuẩn",
                "html": f"""
<div class="hb-card">
  <h3>4 Mặt Nạ Ức Chế Chuẩn AUTOSAR FiM (SWS_FiM_00097)</h3>
  <p>Mọi cấu hình <code>FiMInhibitionConfiguration</code> phải chọn chính xác 1 trong 4 hằng số enumeration chuẩn dưới đây:</p>
  {DIAGRAMS["mask_truth"]}
  <table class="tbl">
    <thead><tr><th>Tên Mặt Nạ (Enum)</th><th>Mask Byte</th><th>Pattern Byte</th><th>Biểu thức C tương đương</th><th>Khi nào kích hoạt (Ức chế)?</th></tr></thead>
    <tbody>
      <tr><td><b>FIM_LAST_FAILED</b></td><td><code>0x01</code></td><td><code>0x01</code></td><td><code>(uds &amp; 0x01) == 0x01</code></td><td>Ngay khi Bit 0 (<code>TestFailed</code>) = 1. Phản hồi nhanh nhất với lỗi tức thời.</td></tr>
      <tr><td><b>FIM_NOT_TESTED</b></td><td><code>0x40</code></td><td><code>0x40</code></td><td><code>(uds &amp; 0x40) == 0x40</code></td><td>Khi Bit 6 (<code>TNCTOC</code>) = 1. Chức năng bị khóa ngay đầu chu kỳ cho đến khi monitor chạy xong lần đầu.</td></tr>
      <tr><td><b>FIM_TESTED</b></td><td><code>0x40</code></td><td><code>0x00</code></td><td><code>(uds &amp; 0x40) == 0x00</code></td><td>Khi Bit 6 (<code>TNCTOC</code>) = 0. Chỉ khóa chức năng SAU KHI monitor đã chạy ít nhất 1 lần (dù PASSED hay FAILED).</td></tr>
      <tr><td><b>FIM_TESTED_AND_FAILED</b></td><td><code>0x41</code></td><td><code>0x01</code></td><td><code>(uds &amp; 0x41) == 0x01</code></td><td>Khi đồng thời <code>TNCTOC == 0</code> VÀ <code>TestFailed == 1</code>. Tránh lỗi cũ (stale TF=1 từ cycle trước) khóa nhầm trước khi test lại.</td></tr>
    </tbody>
  </table>
</div>
"""
            },
            {
                "title": "2.3 Khởi Động Lạnh 0x50 / 0x6D",
                "html": f"""
<div class="hb-card">
  <h3>Bẫy Khởi Động Lạnh 0x50 / 0x6D: Sự Khác Biệt Giữa LAST_FAILED và TESTED_AND_FAILED</h3>
  <p>Nhiều kỹ sư mới thường nhầm lẫn giữa <code>FIM_LAST_FAILED</code> và <code>FIM_TESTED_AND_FAILED</code>. Sự khác biệt sống còn xuất hiện ở chu kỳ khởi động lạnh khi bộ nhớ NvM vẫn còn lưu trạng thái lỗi cũ.</p>
  {DIAGRAMS["cold_start_0x6d"]}
  <h4>Ví dụ thực tế với UDS Status Byte = 0x6D (hoặc 0x50)</h4>
  <ul>
    <li><b>Tình huống 0x50 (Mới xóa DTC / Bắt đầu Operation Cycle):</b> Bit 6 (<code>TNCTOC=1</code>), Bit 4 (<code>TNCSLC=1</code>), Bit 0 (<code>TF=0</code>).
      <br>- <code>FIM_LAST_FAILED</code>: <code>(0x50 &amp; 0x01) = 0x00 != 0x01</code> -&gt; <b>KHÔNG ức chế</b> (Cho phép chạy ngay).
      <br>- <code>FIM_NOT_TESTED</code>: <code>(0x50 &amp; 0x40) = 0x40 == 0x40</code> -&gt; <b>ỨC CHẾ</b> (Khóa chờ kiểm tra xong).
    </li>
    <li><b>Tình huống 0x6D (0b0110_1101 - Stale TF từ cycle trước khi bật khóa):</b> Giả sử một hệ thống không xóa TF ở Operation Cycle Start mà giữ <code>TF=1</code>, đồng thời bật <code>TNCTOC=1</code> (chưa test ở cycle mới):
      <br>- <code>FIM_LAST_FAILED</code>: <code>(0x6D &amp; 0x01) = 0x01 == 0x01</code> -&gt; <b>Ức chế NGAY LẬP TỨC</b> dựa trên dấu vết cũ.
      <br>- <code>FIM_TESTED_AND_FAILED</code>: <code>(0x6D &amp; 0x41) = 0x41 != 0x01</code> -&gt; <b>KHÔNG ức chế</b> cho đến khi monitor của chu kỳ hiện tại thực sự chạy lại và khẳng định lại lỗi (<code>TNCTOC -&gt; 0</code>)!
    </li>
  </ul>
</div>
"""
            },
            {
                "title": "2.4 Chi Tiết 8 Bit UDS ISO 14229-1",
                "html": """
<div class="hb-card">
  <h3>Giải Phẫu 8 Bit Thanh Ghi Dem_UdsStatusByteType (ISO 14229-1)</h3>
  <p>Trong thanh ghi 8-bit <code>Dem_UdsStatusByteType</code>, AUTOSAR FiM chỉ trực tiếp lọc hai bit (Bit 0 và Bit 6), nhưng tất cả 8 bit đều thay đổi theo vòng đời chẩn đoán của Dem và hiển thị đồng bộ trên màn hình mô phỏng:</p>
  <table class="tbl">
    <thead><tr><th>Bit</th><th>Giá trị Hex</th><th>Tên chuẩn UDS / Dem</th><th>Ý nghĩa</th><th>Ảnh hưởng tới 4 Mặt Nạ FiM</th></tr></thead>
    <tbody>
      <tr><td><b>Bit 0</b></td><td><code>0x01</code></td><td><code>TF</code> (TestFailed)</td><td>Kết quả lần chạy gần nhất là FAILED (1) hay PASSED (0).</td><td><b>Trực tiếp:</b> Quyết định <code>LAST_FAILED</code> và <code>TESTED_AND_FAILED</code>.</td></tr>
      <tr><td><b>Bit 1</b></td><td><code>0x02</code></td><td><code>TFTOC</code> (FailedThisOpCycle)</td><td>Đã từng thất bại ít nhất 1 lần trong chu kỳ lái xe hiện tại.</td><td>Gián tiếp qua lịch sử vòng đời lỗi trong Dem.</td></tr>
      <tr><td><b>Bit 2</b></td><td><code>0x04</code></td><td><code>PDTC</code> (PendingDTC)</td><td>Lỗi chờ xác nhận (đang theo dõi qua nhiều chu kỳ).</td><td>Không dùng trực tiếp trong 4 mặt nạ chuẩn FiM.</td></tr>
      <tr><td><b>Bit 3</b></td><td><code>0x08</code></td><td><code>CDTC</code> (ConfirmedDTC)</td><td>Lỗi đã được xác nhận và lưu vào bộ nhớ chính thức (DTC).</td><td>Được Dem phục hồi từ NvM sau reset.</td></tr>
      <tr><td><b>Bit 4</b></td><td><code>0x10</code></td><td><code>TNCSLC</code> (NotCompletedSinceLastClear)</td><td>Chưa hoàn thành test nào kể từ lần xóa DTC (<code>0x14</code>) gần nhất.</td><td>Đặt lên 1 cùng với Bit 6 khi chạy <code>Dem_ClearDTC</code> (tạo byte <code>0x50</code>).</td></tr>
      <tr><td><b>Bit 5</b></td><td><code>0x20</code></td><td><code>TFSLC</code> (FailedSinceLastClear)</td><td>Từng thất bại kể từ lần xóa DTC cuối cùng.</td><td>Duy trì trạng thái lịch sử phục vụ đọc DTC <code>0x19</code>.</td></tr>
      <tr><td><b>Bit 6</b></td><td><code>0x40</code></td><td><code>TNCTOC</code> (NotCompletedThisOpCycle)</td><td><b>Chưa chạy xong lần nào trong chu kỳ hiện tại</b> (1 = chưa test, 0 = đã test).</td><td><b>Trực tiếp:</b> Quyết định <code>NOT_TESTED</code>, <code>TESTED</code> và <code>TESTED_AND_FAILED</code>.</td></tr>
      <tr><td><b>Bit 7</b></td><td><code>0x80</code></td><td><code>WIR</code> (WarningIndicatorRequested)</td><td>Yêu cầu bật đèn báo lỗi động cơ (MIL / Wrench lamp) trên táp-lô.</td><td>Thường đi kèm lỗi OBD nghiêm trọng; đồng bộ trên thanh ghi UI.</td></tr>
    </tbody>
  </table>
</div>
"""
            }
        ]
    },
    {
        "title": "Đồng Bộ DEM Push vs Polling",
        "subs": [
            {
                "title": "3.1 Push Mode vs Polling Mode",
                "html": f"""
<div class="hb-card">
  <h3>Hai Kiến Trúc Đồng Bộ Giữa Dem Và FiM: Push vs Polling</h3>
  <p>Làm thế nào FiM biết được khi nào một <code>EventId</code> trong Dem vừa đổi bit trạng thái? Tham số boolean <code>FiMEventUpdateTriggeredByDem</code> trong ECUC quyết định hoàn toàn kiến trúc đồng bộ:</p>
  {DIAGRAMS["push_vs_poll"]}
  <table class="tbl">
    <thead><tr><th>Tiêu chí so sánh</th><th>Push Mode (<code>FiMEventUpdateTriggeredByDem = TRUE</code>)</th><th>Polling Mode (<code>FiMEventUpdateTriggeredByDem = FALSE</code>)</th></tr></thead>
    <tbody>
      <tr><td><b>API đồng bộ</b></td><td><code>FiM_DemTriggerOnEventStatus(EventId, OldByte, NewByte)</code></td><td><code>FiM_MainFunction()</code> chủ động gọi <code>Dem_GetEventUdsStatus()</code></td></tr>
      <tr><td><b>Độ trễ ức chế (Latency)</b></td><td><b>Gần như 0 us (Tức thời)</b> - ngay trong context của hàm <code>Dem_SetEventStatus</code>.</td><td><b>Trễ 1..N chu kỳ</b> tùy <code>FiMTaskTime</code> (VD: 10ms - 20ms) và tải CPU.</td></tr>
      <tr><td><b>Tải CPU đỉnh (WCET)</b></td><td>Tăng nhẹ thời gian thực thi bên trong mỗi lần <code>Dem_SetEventStatus</code> được gọi.</td><td>Phân bổ đều CPU bằng tham số <code>FiMMaxEventsPerCalcCycle</code>.</td></tr>
      <tr><td><b>Ứng dụng khuyến nghị</b></td><td>Các chức năng <b>ASIL-C/D / Safety</b> (Cắt phun xăng, ngắt mô-tơ EPS, ngắt relay HV).</td><td>Các chức năng không nhạy thời gian (sưởi gương, chẩn đoán phụ trợ IUMPR).</td></tr>
    </tbody>
  </table>
</div>
"""
            },
            {
                "title": "3.2 Ngân Sách CPU & MainFunction",
                "html": f"""
<div class="hb-card">
  <h3>Kiểm Soát Ngân Sách CPU Trong Polling Mode (FiM_MainFunction)</h3>
  <p>Khi một ECU động cơ hoặc ADAS quản lý tới <b>500 - 1,000 DemEventId</b>, việc quét toàn bộ danh sách event trong một lần gọi <code>FiM_MainFunction()</code> có thể gây quá tải OS Task (Task Overrun). Do đó AUTOSAR thiết kế cơ chế chia lát cắt (<i>Time-Slicing</i>).</p>
  {DIAGRAMS["polling_budget"]}
  <h4>Các tham số điều khiển Polling</h4>
  <ul>
    <li><b><code>FiMTaskTime</code>:</b> Chu kỳ gọi <code>FiM_MainFunction()</code> do SchM/OS cấu hình (mặc định mô phỏng <code>20 ms</code>, phổ biến <code>10 ms</code> hoặc <code>20 ms</code>).</li>
    <li><b><code>FiMMaxEventsPerCalcCycle</code>:</b> Số lượng Event tối đa được phép thăm dò từ Dem trong một lần thực thi <code>FiM_MainFunction()</code> (ví dụ <code>20</code> event/tick). FiM lưu lại con trỏ vòng (round-robin cursor) để tick tiếp theo xử lý tiếp các event còn lại.</li>
    <li><b>Ảnh hưởng khi tắt <code>FiMEventUpdateTriggeredByDem = FALSE</code> trong trình mô phỏng:</b> Khi bạn bấm thay đổi trạng thái event (VD: <code>Failed Event</code>), Dem cập nhật ngay nhưng đèn FID trên FiM sẽ giữ trạng thái cũ cho đến khi bạn bấm nút <b>+20ms MainFn</b> hoặc bật <b>Auto Clock</b>!</li>
  </ul>
</div>
"""
            },
            {
                "title": "3.3 Hiệu Ứng Kép Khi ClearDTC 0x14",
                "html": f"""
<div class="hb-card">
  <h3>Hiệu Ứng Kép Khi Dcm Gửi Lệnh UDS 0x14 (Dem_ClearDTC)</h3>
  <p>Một hiện tượng cực kỳ kinh điển nhưng dễ gây bất ngờ khi kiểm thử chẩn đoán trên bàn HIL là hiệu ứng phân kỳ trái ngược giữa các FID ngay sau khi máy chẩn đoán xóa lỗi bằng dịch vụ <b>UDS 0x14 ClearDiagnosticInformation</b>.</p>
  {DIAGRAMS["clear_dtc_dual"]}
  <h4>Giải thích cơ chế phân kỳ</h4>
  <ol>
    <li>Dịch vụ <code>Dcm</code> gọi <code>Dem_ClearDTC()</code> xóa sạch bộ nhớ lỗi. Tất cả thanh ghi <code>Dem_UdsStatusByte</code> được đặt lại về giá trị khởi đầu <code>0x50</code> (trong đó Bit 0 <code>TF = 0</code>, nhưng Bit 6 <code>TNCTOC = 1</code> và Bit 4 <code>TNCSLC = 1</code>).</li>
    <li><b>FID gắn mặt nạ <code>FIM_LAST_FAILED</code> hoặc <code>TESTED_AND_FAILED</code>:</b> Vì <code>TF</code> trở về 0, điều kiện ức chế biến mất ngay -&gt; <b>FID chuyển từ FALSE thành TRUE (Phục hồi hoạt động)</b>.</li>
    <li><b>FID gắn mặt nạ <code>FIM_NOT_TESTED</code> (VD: Monitor OBD / Safe Launch):</b> Vì <code>TNCTOC</code> bị reset ngược lên 1, điều kiện <code>(0x50 &amp; 0x40) == 0x40</code> lại thỏa mãn -&gt; <b>FID lập tức bị ức chế trở lại thành FALSE</b>! Nó sẽ tiếp tục bị khóa cho đến khi ECU thực hiện chu kỳ lái xe kiểm tra lại monitor nguồn.</li>
  </ol>
</div>
"""
            },
            {
                "title": "3.4 Cấu Hình BswM / SchM_FiM & Tuning",
                "html": """
<div class="hb-card">
  <h3>Tích Hợp SchM_FiM, Critical Section &amp; Tuning Tham Số</h3>
  <p>Vì <code>FiM_GetFunctionPermission()</code> có thể được gọi từ Task 5ms mức ứng dụng trong khi <code>FiM_DemTriggerOnEventStatus()</code> lại chạy ở Task khác hoặc ISR context, FiM bắt buộc phải bảo vệ vùng tranh chấp dữ liệu (race condition) thông qua <b>SchM (Schedule Manager)</b>:</p>
  <ul>
    <li><b><code>SchM_Enter_FiM_FIM_EXCLUSIVE_AREA_0()</code>:</b> Khóa ngắt tạm thời trong vài chu kỳ CPU khi cập nhật bảng <code>FiM_InhibitCounter[FID]</code> hoặc khi đọc nguyên tử cặp byte trạng thái.</li>
    <li><b>Nguyên tắc Optimization:</b> Thay vì quét lại toàn bộ bảng mỗi khi có yêu cầu đọc <code>FiM_GetFunctionPermission(FID)</code>, đa số triển khai AUTOSAR (như Vector MICROSAR, ETAS RTA-FiM, EB tresos) duy trì một mảng đếm <code>FiM_InhibitCounter[FID]</code> cập nhật theo độ lệch (+1 khi event chuyển sang khớp mask, -1 khi thôi khớp). Nhờ đó thời gian thực thi của <code>FiM_GetFunctionPermission()</code> đạt hằng số <b>O(1)</b> (~15 lệnh Assembly).</li>
    <li><b>Lưu ý Anti-Double-Count:</b> Khi nhận callback <code>FiM_DemTriggerOnEventStatus(EventId, OldByte, NewByte)</code>, FiM bắt buộc kiểm tra đồng thời kết quả mask trên <code>OldByte</code> và <code>NewByte</code>. Chỉ khi kết quả thay đổi (FALSE-&gt;TRUE hoặc TRUE-&gt;FALSE) mới cộng/trừ bộ đếm ức chế!</li>
  </ul>
</div>
"""
            }
        ]
    },
    {
        "title": "Ma Trận Many-to-Many & Aggregation",
        "subs": [
            {
                "title": "4.1 Đồ Thị Hai Phía & Cổng OR",
                "html": f"""
<div class="hb-card">
  <h3>Ma Trận Quan Hệ Nhiều-Nhiều (Many-to-Many Bipartite Mapping)</h3>
  <p>Một sự kiện chẩn đoán (Event) có thể khóa nhiều chức năng (FID) với các mặt nạ khác nhau, và ngược lại một FID có thể bị khóa bởi hàng chục nguồn sự kiện khác nhau theo logic cổng <b>OR bảo thủ</b>.</p>
  {DIAGRAMS["many_to_many"]}
  <h4>Phương trình cấp phép chuẩn của mỗi FID</h4>
  <ul>
    <li>Một FID chỉ được cấp phép khi <b>TẤT CẢ</b> các hàng <code>FiMInhibitionConfiguration</code> liên kết tới nó đều KHÔNG kích hoạt (tức <code>InhibitCount == 0</code>), VÀ cờ khả dụng runtime đang bật (<code>Available == TRUE</code>).</li>
    <li>Ngược lại, chỉ cần <b>BẤT KỲ 1</b> Event nguồn (hoặc Summary Event, hoặc DemComponent) thỏa mãn mặt nạ ức chế -&gt; Bộ đếm <code>InhibitCount &gt;= 1</code> -&gt; FID lập tức bị ép về <b>FALSE (INHIBITED)</b>.</li>
    <li><b>Trên giao diện mô phỏng:</b> Nhấp vào bất kỳ dòng nào trong bảng <i>Many-to-Many Inhibition Matrix</i> hoặc thẻ <i>FID_0..FID_2</i> để khóa tiêu điểm Inspector C-Code và Bitwise vào đúng cặp Event-FID đó!</li>
  </ul>
</div>
"""
            },
            {
                "title": "4.2 FiMSummaryEvent Aggregator",
                "html": f"""
<div class="hb-card">
  <h3>FiMSummaryEvent: Gom Nhóm Sự Kiện Để Tiết Kiệm ROM / RAM</h3>
  <p>Giả sử hệ thống động cơ V6/V8 có 8 Event liên quan đến lỗi kim phun từng xi-lanh (<code>Evt_Cyl1..Evt_Cyl8</code>) và tất cả 8 lỗi này đều cùng ức chế 5 FID khác nhau (<code>FID_CutFuel, FID_Turbo, FID_CatHeat, FID_EcoMode, FID_AutoStart</code>).</p>
  {DIAGRAMS["summary_event"]}
  <table class="tbl">
    <thead><tr><th>Kiến trúc bảng</th><th>Số lượng bản ghi cấu hình cần lưu</th><th>Mức tiêu thụ Flash (ROM)</th></tr></thead>
    <tbody>
      <tr><td><b>Nối trực tiếp 8 Event x 5 FID</b></td><td><code>8 x 5 = 40</code> cấu hình <code>FiMInhibitionConfiguration</code></td><td>Tốn 5 lần dung lượng bảng ánh xạ</td></tr>
      <tr><td><b>Dùng <code>Sum_01 (FiMSummaryEventId)</code></b></td><td>8 liên kết vào <code>Sum_01</code> + 5 liên kết ra FID = <b>13 bản ghi</b></td><td><b>Giảm &gt; 65%</b> bảng cấu hình, dễ bảo trì ECUC</td></tr>
    </tbody>
  </table>
  <p style="margin-top:6px"><b>Cơ chế hoạt động:</b> <code>Sum_01</code> tính trạng thái ức chế bằng cách lấy phép <b>OR</b> tất cả Event thành viên thuộc nhóm đó đối với cùng một <code>InhMask</code>. Khi bạn bật nút <b>Trigger Sum_01</b> hoặc chỉnh <b>Sum_01 Mask</b> trên simulator, cả nhóm liên kết tới FID sẽ phản ứng đồng thời.</p>
</div>
"""
            },
            {
                "title": "4.3 DemComponent DAG & Callback",
                "html": f"""
<div class="hb-card">
  <h3>Tương Tác Với DemComponent (Component Status Tree)</h3>
  <p>Bắt đầu từ các phiên bản AUTOSAR Classic R4.2 / R20-11 trở lên, <b>DemComponent</b> mô hình hóa phần cứng hệ thống theo đồ thị có hướng không chu trình (<b>DAG - Directed Acyclic Graph</b>), ví dụ cụm <code>Comp_01 (Turbocharger Actuator)</code> phụ thuộc vào nguồn 12V và bus truyền thông.</p>
  {DIAGRAMS["component_dag"]}
  <h4>Cơ chế đồng bộ <code>FiM_DemTriggerOnComponentStatus</code></h4>
  <ul>
    <li>Khi phần cứng cha (parent node) gặp lỗi, Dem lan truyền cờ <code>DemComponentFailed = TRUE</code> xuống toàn bộ nhánh phụ thuộc và gọi đúng <b>một callback duy nhất</b> tới FiM: <code>FiM_DemTriggerOnComponentStatus(ComponentId, TRUE)</code>.</li>
    <li>Nhờ cơ chế này, FiM có thể khóa ngay lập tức toàn bộ <code>FID_1 (TurboBoostControl)</code> mà không cần cấu hình hàng chục event con riêng lẻ vào bảng FiM.</li>
    <li>Ngược lại, khi phần cứng phục hồi và Dem báo <code>ComponentFailedStatus = FALSE</code>, FiM trừ bỏ trạng thái ức chế do component đó gây ra (chỉ nhả FID nếu không còn Event thông thường nào khác đang ức chế FID đó).</li>
  </ul>
</div>
"""
            },
            {
                "title": "4.4 Cổng Khả Dụng FiM_SetFunctionAvailable",
                "html": f"""
<div class="hb-card">
  <h3>Cổng Điều Khiển Khả Dụng Runtime: FiM_SetFunctionAvailable</h3>
  <p>Ngoài lý do hỏng hóc phần cứng từ Dem, một ECU nền tảng chung (Platform ECU) thường được nạp một phần mềm cho nhiều phiên bản xe khác nhau (Trim Levels: Bản Base không có ADAS Adaptive Cruise, bản Luxury có đầy đủ).</p>
  {DIAGRAMS["avail_gate"]}
  <ul>
    <li><b>Cấu hình bắt buộc:</b> Tham số tiền biên dịch <code>FiMAvailabilitySupport = TRUE</code> trong <code>FiMGeneral</code>. Nếu tắt (= <code>FALSE</code>), hàm <code>FiM_SetFunctionAvailable()</code> sẽ không được biên dịch vào mã C hoặc trả về lỗi không hỗ trợ.</li>
    <li><b>Công thức cổng AND hai lớp:</b> <code>Permission = (!InhibitedByDem) &amp;&amp; (FunctionAvailable)</code>.</li>
    <li><b>Ưu tiên tuyệt đối:</b> Nếu trạm kiểm tra cuối dây chuyền (EoL) hoặc BswM/Variant Coding gọi <code>FiM_SetFunctionAvailable(FID_1, FALSE)</code>, dù toàn bộ thanh ghi UDS trên xe sạch sẽ <code>0x00</code> (0 lỗi), <code>FiM_GetFunctionPermission(FID_1)</code> vẫn trả về <code>FALSE</code>!</li>
  </ul>
</div>
"""
            }
        ]
    },
    {
        "title": "Chẩn Đoán OBD, Safety & Cascading",
        "subs": [
            {
                "title": "5.1 Chặn Lỗi Dây Chuyền (Cascading)",
                "html": f"""
<div class="hb-card">
  <h3>Cascading Fault Suppression: Chấm Dứt Cơn Bão DTC Giả</h3>
  <p>Một trong những công dụng giá trị nhất của FiM trong kỹ thuật chẩn đoán (không chỉ để tắt tính năng lái mà còn để <b>tắt các thuật toán chẩn đoán thứ cấp</b>) là ngăn ngừa lỗi dây chuyền.</p>
  {DIAGRAMS["cascading_block"]}
  <h4>Kịch bản điển hình trên xe</h4>
  <ol>
    <li>Ắc-quy sụt áp xuống dưới 8.5V (<code>Evt_03 LowBattery</code> bật bit <code>TF=1</code>).</li>
    <li>Tại điện áp thấp, 12 cảm biến tương tự (O2 sensor, MAF, Rail Pressure, Throttle...) đều cho giá trị điện áp sai lệch khỏi ngưỡng chuẩn.</li>
    <li>Nếu các SW-C chẩn đoán của 12 cảm biến này vẫn chạy, chúng sẽ báo 12 mã lỗi hỏng cảm biến giả lên <b>Dem</b> khiến kỹ thuật viên sửa xe thay nhầm hàng loạt linh kiện đắt tiền!</li>
    <li><b>Giải pháp bằng FiM:</b> Nối <code>Evt_03</code> ức chế <code>FID_Diag_SensorMonitors</code>. Trước khi đánh giá lỗi cảm biến, mỗi SW-C monitor hỏi <code>FiM_GetFunctionPermission()</code>; thấy <code>FALSE</code> thì bỏ qua việc gọi <code>Dem_SetEventStatus()</code>. Bộ nhớ DTC chỉ ghi nhận duy nhất <b>1 lỗi gốc Ắc-quy</b>!</li>
  </ol>
</div>
"""
            },
            {
                "title": "5.2 Fail-Safe & Limp-Home ISO 26262",
                "html": f"""
<div class="hb-card">
  <h3>Chiến Lược Fail-Safe Degradation &amp; Limp-Home (ISO 26262)</h3>
  <p>Trong hệ thống an toàn chức năng ASIL-C/D (động cơ, lái trợ lực điện EPS, phanh điện tử EBS, biến tần xe điện Inverter), khi hỏng hóc xảy ra, hệ thống không được phép ngắt đột ngột gây mất kiểm soát mà phải chuyển sang chế độ <b>chạy dự phòng an toàn (Limp-Home)</b>.</p>
  {DIAGRAMS["fail_safe"]}
  <ul>
    <li><b>Tầng 1 - Ngắt điều khiển hiệu năng cao:</b> Khi <code>Evt_01 (RailSensor)</code> kích hoạt mặt nạ <code>FIM_LAST_FAILED</code>, FiM lập tức hạ <code>FID_0 (FuelInjection / FullTorque) = FALSE</code> qua Push callback trong &lt; 5 us.</li>
    <li><b>Tầng 2 - Kích hoạt chiến lược dự phòng:</b> SW-C nhận thấy <code>Permission == FALSE</code> lập tức ngừng vòng kín áp suất cao và chuyển sang bảng tra (Open-loop Backup Map) giới hạn vòng tua tối đa 2,000 RPM hoặc tốc độ xe 40 km/h để tài xế lái vào lề an toàn.</li>
    <li><b>Tùy chọn cấu hình:</b> Đặt <code>FiMEventUpdateTriggeredByDem = TRUE</code> để đảm bảo thời gian phản hồi nằm gọn trong <b>FTTI (Fault Tolerant Time Interval)</b> của tiêu chuẩn an toàn.</li>
  </ul>
</div>
"""
            },
            {
                "title": "5.3 OBD-II / Euro-7 IUMPR & MIL",
                "html": f"""
<div class="hb-card">
  <h3>Điều Phối Giám Sát Khí Thải OBD-II / Euro-7 &amp; Bộ Đếm IUMPR</h3>
  <p>Các tiêu chuẩn khí thải CARB / EPA / Euro-7 yêu cầu mọi thuật toán giám sát xúc tác (Catalyst Monitor), hệ thống bay hơi (EVAP), cảm biến NOx phải đạt tỉ lệ giám sát thực tế (<b>IUMPR - In-Use Monitor Performance Ratio</b>) và tuyệt đối <b>không được bật đèn MIL giả</b> khi điều kiện tiên quyết chưa thỏa mãn.</p>
  {DIAGRAMS["obd_iumpr"]}
  <ul>
    <li><b>Khóa điều kiện tiên quyết bằng <code>FIM_NOT_TESTED</code>:</b> Bộ giám sát Catalyst (<code>FID_2</code>) chỉ được phép chạy sau khi bộ giám sát Misfire (<code>Evt_02</code>) đã hoàn thành bài kiểm tra trong chu kỳ lái hiện tại (<code>TNCTOC == 0</code>) VÀ kết quả <code>TF == 0</code>.</li>
    <li><b>Cấu hình tối ưu:</b> Có thể gán 2 mặt nạ hoặc phối hợp sự kiện điều kiện môi trường (<code>Evt_TempSensor</code> với <code>FIM_LAST_FAILED</code> + <code>Evt_Misfire</code> với <code>FIM_NOT_TESTED</code>) cùng ức chế chung <code>FID_CatMonitor</code>.</li>
    <li><b>Kết quả IUMPR:</b> Khi FID trả về <code>FALSE</code>, SW-C vừa khóa việc cập nhật tử số/mẫu số IUMPR sai lệch, vừa ngăn Dem tích lũy bộ đếm Debounce dẫn tới bật đèn Check Engine giả.</li>
  </ul>
</div>
"""
            },
            {
                "title": "5.4 Giao Tiếp RTE Port Cho SW-C",
                "html": """
<div class="hb-card">
  <h3>Thiết Kế Cổng RTE Cho SW-C Tiêu Chuẩn (SWS_FiM AUTOSAR Interface)</h3>
  <p>Các Application SW-C không bao giờ gọi trực tiếp hàm C <code>FiM_GetFunctionPermission()</code> bằng cách include <code>FiM.h</code> (vi phạm quy tắc cách ly tầng RTE của AUTOSAR), mà giao tiếp qua <b>Client-Server Port Interface</b>:</p>
  <table class="tbl">
    <thead><tr><th>Tên RTE Interface</th><th>Loại Port</th><th>Chữ ký hàm trong SW-C</th><th>Mô tả vận hành</th></tr></thead>
    <tbody>
      <tr><td><code>FunctionInhibition</code></td><td>Require-Port (Client) on SW-C</td><td><code>Rte_Call_FiM_FID_0_GetFunctionPermission(&amp;perm)</code></td><td>RTE ánh xạ <i>PortDefinedArgumentValue</i> tương ứng với ID của FID đó vào hàm BSW <code>FiM_GetFunctionPermission(FID_0, &amp;perm)</code>.</td></tr>
      <tr><td><code>ControlFunctionAvailable</code></td><td>Require-Port (Client) on Mode-SWC</td><td><code>Rte_Call_FiM_Avail_FID_1_SetFunctionAvailable(FALSE)</code></td><td>Chỉ sinh ra khi bật <code>FiMAvailabilitySupport = TRUE</code>. Cho phép SW-C hoặc BswM bật/tắt tính năng động.</td></tr>
    </tbody>
  </table>
  <p style="margin-top:6px"><b>Mẹo tối ưu hóa MISRA-C trong SW-C:</b> Luôn khởi tạo biến cục bộ <code>boolean perm = FALSE;</code> trước khi gọi RTE. Nếu kết quả trả về khác <code>E_OK</code> (VD DET bắt lỗi chưa init), biến <code>perm</code> vẫn giữ giá trị an toàn <code>FALSE</code>!</p>
</div>
"""
            }
        ]
    },
    {
        "title": "DET Guards, API Reference & ECUC",
        "subs": [
            {
                "title": "6.1 5 Mã Lỗi DET Chuẩn SWS_FiM",
                "html": f"""
<div class="hb-card">
  <h3>Kiểm Tra Tham Số &amp; 5 Mã Lỗi DET Chuẩn SWS_FiM_00076</h3>
  <p>Khi bật công tắc tiền biên dịch <code>FiMDevErrorDetect = TRUE</code>, mọi API công khai và callback của FiM đều thực hiện kiểm tra tiền điều kiện phòng thủ trước khi truy cập bảng cấu hình:</p>
  {DIAGRAMS["det_guard"]}
  <table class="tbl">
    <thead><tr><th>Tên Hằng Số DET</th><th>Mã Hex</th><th>API thường gặp</th><th>Điều kiện gây lỗi &amp; Phản ứng an toàn</th></tr></thead>
    <tbody>
      <tr><td><b><code>FIM_E_UNINIT</code></b></td><td><code>0x01</code></td><td><code>FiM_GetFunctionPermission</code>, <code>FiM_MainFunction</code>, <code>FiM_DemInit</code></td><td>Gọi trước <code>FiM_Init()</code>. Ép <code>*Permission = FALSE</code>, trả về <code>E_NOT_OK</code>.</td></tr>
      <tr><td><b><code>FIM_E_FID_OUT_OF_RANGE</code></b></td><td><code>0x02</code></td><td><code>FiM_GetFunctionPermission</code>, <code>FiM_SetFunctionAvailable</code></td><td>Tham số <code>FID &gt;= FiMMaxFids</code>. Báo DET <code>0x02</code>, ép <code>*Permission = FALSE</code>.</td></tr>
      <tr><td><b><code>FIM_E_EVENTID_OUT_OF_RANGE</code></b></td><td><code>0x03</code></td><td><code>FiM_DemTriggerOnEventStatus</code></td><td><code>EventId == 0</code> hoặc vượt ngưỡng Dem Events hợp lệ. Hủy callback.</td></tr>
      <tr><td><b><code>FIM_E_PARAM_POINTER</code></b></td><td><code>0x04</code></td><td><code>FiM_GetFunctionPermission</code>, <code>FiM_GetVersionInfo</code></td><td>Con trỏ <code>Permission == NULL_PTR</code> hoặc <code>versioninfo == NULL_PTR</code>.</td></tr>
      <tr><td><b><code>FIM_E_INIT_FAILED</code></b></td><td><code>0x05</code></td><td><code>FiM_Init</code></td><td>Truyền <code>ConfigPtr == NULL_PTR</code> ở chế độ Post-Build. Giữ FiM ở <code>FIM_UNINIT</code>.</td></tr>
    </tbody>
  </table>
  <p style="margin-top:6px"><i>Gợi ý thực hành:</i> Chọn Kịch bản <b>S12 (DET Error Injection)</b> hoặc nút Quick Action <b>Inject DET</b> để kích hoạt trực tiếp các lỗi này và xem log Det!</p>
</div>
"""
            },
            {
                "title": "6.2 Bảng Tra Cứu API AUTOSAR",
                "html": """
<div class="hb-card">
  <h3>Bảng Tra Cứu Toàn Bộ API Chuẩn AUTOSAR FiM (R20-11 / R22-11 / R23-11)</h3>
  <table class="tbl">
    <thead><tr><th>Tên Hàm API Chuẩn</th><th>API ID</th><th>Caller</th><th>Tham số &amp; Kiểu trả về</th><th>Chức năng chính</th></tr></thead>
    <tbody>
      <tr><td><code>FiM_Init</code></td><td><code>0x00</code></td><td>EcuM</td><td><code>(const FiM_ConfigType* FiMConfigPtr) -&gt; void</code></td><td>Khởi tạo biến nội bộ FiM và con trỏ cấu hình (Pha 1).</td></tr>
      <tr><td><code>FiM_GetFunctionPermission</code></td><td><code>0x01</code></td><td>SW-C / RTE</td><td><code>(FiM_FunctionIdType FID, boolean* Permission) -&gt; Std_ReturnType</code></td><td>Đọc quyền chạy (TRUE/FALSE) cho chức năng FID.</td></tr>
      <tr><td><code>FiM_SetFunctionAvailable</code></td><td><code>0x07</code></td><td>SW-C / BswM</td><td><code>(FiM_FunctionIdType FID, boolean Availability) -&gt; Std_ReturnType</code></td><td>Khóa/mở khả dụng runtime độc lập với Dem (tùy chọn).</td></tr>
      <tr><td><code>FiM_DemTriggerOnEventStatus</code></td><td><code>0x02</code></td><td>Dem</td><td><code>(Dem_EventIdType EventId, Dem_UdsStatusByteType Old, New) -&gt; void</code></td><td>Callback Push đồng bộ ngay khi 1 event đổi trạng thái.</td></tr>
      <tr><td><code>FiM_DemTriggerOnComponentStatus</code></td><td><code>0x06</code></td><td>Dem</td><td><code>(Dem_ComponentIdType ComponentId, boolean ComponentFailedStatus) -&gt; void</code></td><td>Callback cập nhật trạng thái cụm phần cứng DemComponent.</td></tr>
      <tr><td><code>FiM_DemInit</code></td><td><code>0x03</code></td><td>Dem / BswM</td><td><code>(void) -&gt; void</code></td><td>Hoàn tất Pha 2 khởi tạo sau khi Dem phục hồi xong NVM.</td></tr>
      <tr><td><code>FiM_GetVersionInfo</code></td><td><code>0x04</code></td><td>App / BSW</td><td><code>(Std_VersionInfoType* versioninfo) -&gt; void</code></td><td>Trả về VendorId, ModuleId (11), và phiên bản SW.</td></tr>
      <tr><td><code>FiM_MainFunction</code></td><td><code>0x05</code></td><td>SchM / OS</td><td><code>(void) -&gt; void</code></td><td>Tác vụ định kỳ thăm dò Dem (Polling) &amp; tính toán lại theo lát cắt.</td></tr>
    </tbody>
  </table>
</div>
"""
            },
            {
                "title": "6.3 Cây Tham Số ECUC & Sinh Mã C",
                "html": f"""
<div class="hb-card">
  <h3>Cấu Trúc Cây ECUC Và Đầu Ra Sinh Mã (FiM_Cfg.h / FiM_Lcfg.c)</h3>
  <p>Trong quy trình cấu hình BSW (DaVinci Configurator, EB tresos, ISOLAR-AB), 29 trường config bạn thấy ở bảng bên trái (Tab Simulation) được tổ chức thành 2 nhánh ECUC lớn:</p>
  {DIAGRAMS["ecuc_tree"]}
  <ul>
    <li><b><code>FiMGeneral</code> (Pre-Compile):</b> Sinh trực tiếp các macro <code>#define</code> trong <code>FiM_Cfg.h</code> (<code>FIM_DEV_ERROR_DETECT</code>, <code>FIM_EVENT_UPDATE_TRIGGERED_BY_DEM</code>, <code>FIM_AVAILABILITY_SUPPORT</code>, <code>FIM_MAX_FIDS</code>, <code>FIM_MAX_EVENTS_PER_CALC_CYCLE</code>...).</li>
    <li><b><code>FiMConfigSet</code> (Link-Time / Post-Build):</b> Sinh bảng hằng số trong <code>FiM_Lcfg.c</code> / <code>FiM_PBcfg.c</code> chứa danh sách FID (<code>FiMFID</code>), bảng liên kết (<code>FiMInhibitionConfiguration</code>) và danh sách nhóm sự kiện (<code>FiMEventSummary</code>).</li>
    <li><b>Tính năng Xuất Code Trực Tiếp:</b> Nhấn nút <b>📦 Xuất ARXML/C/JSON</b> trên thanh tiêu đề để xuất ngay file <code>FiM.arxml</code>, <code>FiM_Cfg.h</code>, <code>FiM_Lcfg.c</code> phản ánh đúng giá trị bạn vừa chỉnh sửa trong UI!</li>
  </ul>
</div>
"""
            },
            {
                "title": "6.4 Checklist Kiểm Định SIL / HIL",
                "html": """
<div class="hb-card">
  <h3>Checklist Kiểm Định Unit Test &amp; Tích Hợp SIL/HIL Cho FiM</h3>
  <p>Dùng danh sách kiểm tra tiêu chuẩn ASPICE SWE.4 / SWE.5 dưới đây khi thẩm định một module FiM thực tế trên xe hoặc bàn test:</p>
  <table class="tbl">
    <thead><tr><th>Hạng mục kiểm thử</th><th>Trạng thái kỳ vọng phải xác minh</th><th>Kịch bản mô phỏng tương ứng</th></tr></thead>
    <tbody>
      <tr><td><b>Cold-Start Two-Phase Order</b></td><td>FID luôn giữ <code>FALSE</code> giữa <code>FiM_Init()</code> và <code>FiM_DemInit()</code>, không lộ xung glitch cho phép SW-C chạy sớm.</td><td><code>S6: Cold Start 2-Phase Init</code></td></tr>
      <tr><td><b>Stale TF=1 vs 0x41 Mask</b></td><td>Với byte <code>0x6D</code> (chưa chạy chu kỳ mới), <code>TESTED_AND_FAILED</code> không được phép khóa sớm cho tới khi <code>TNCTOC=0</code>.</td><td><code>S4: FIM_TESTED_AND_FAILED</code></td></tr>
      <tr><td><b>Push vs Polling Timing</b></td><td>Trong Polling Mode, thay đổi trên Dem không tác động ngay cho đến khi chạy đủ tick <code>FiM_MainFunction()</code>.</td><td><code>S5: Push vs Polling Mode</code></td></tr>
      <tr><td><b>UDS 0x14 Re-Inhibition</b></td><td>Khi tester gửi ClearDTC (byte -&gt; 0x50), các FID dùng <code>NOT_TESTED</code> phải tự động khóa lại thành <code>FALSE</code> ngay lập tức.</td><td><code>S7: UDS 0x14 Dem_ClearDTC</code></td></tr>
      <tr><td><b>Availability Override</b></td><td>Khi <code>SetFunctionAvailable(FID, FALSE)</code>, bất chấp UDS sạch <code>0x00</code>, Permission vẫn bắt buộc là <code>FALSE</code>.</td><td><code>S11: FiM_SetFunctionAvailable</code></td></tr>
      <tr><td><b>DET Range &amp; Null Checks</b></td><td>Tất cả 5 mã <code>0x01..0x05</code> phải báo DET đầy đủ và không bao giờ dereference null pointer hoặc tràn mảng FID.</td><td><code>S12: DET Error Injection</code></td></tr>
    </tbody>
  </table>
</div>
"""
            }
        ]
    }
]


FOOTER_JS = r"""
let hbTab1 = 0;
let hbTab2 = 0;
let abbrCategory = "ALL";

function switchHbTab1(idx) {
  hbTab1 = Math.max(0, Math.min(6, idx));
  hbTab2 = 0;
  for (let i = 0; i <= 6; i++) {
    const btn = document.getElementById("hbTab1_" + i);
    if (btn) btn.classList.toggle("active", i === hbTab1);
  }
  renderCurrentHandbookView();
}

function switchHbTab2(subIdx) {
  hbTab2 = Math.max(0, subIdx);
  renderCurrentHandbookView();
}

function setAbbrCategory(cat) {
  abbrCategory = cat;
  ["ALL", "CORE", "MASK", "DEM", "SAFETY", "STACK"].forEach((c) => {
    const pill = document.getElementById("catPill_" + c);
    if (pill) pill.classList.toggle("active", c === cat);
  });
  renderAbbreviationTable();
}

function filterAbbreviationTable() {
  renderAbbreviationTable();
}

function highlightMatch(text, query) {
  const safe = escapeHtmlSafe(text);
  if (!query) return safe;
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rx = new RegExp("(" + escapedQuery + ")", "gi");
  return safe.replace(rx, "<mark>$1</mark>");
}

function renderAbbreviationTable() {
  const area = document.getElementById("hbContentArea");
  const badge = document.getElementById("abbrCountBadge");
  const inp = document.getElementById("abbrSearchInput");
  if (!area) return;

  const q = inp ? inp.value.trim() : "";
  const ql = q.toLowerCase();

  const catNames = {
    CORE: "FiM Core & FID",
    MASK: "Masks & Bits",
    DEM: "DEM & Component",
    SAFETY: "Safety & OBD",
    STACK: "AUTOSAR Stack"
  };

  const filtered = ABBREVIATIONS_DATA.filter((item) => {
    if (abbrCategory !== "ALL" && item.cat !== abbrCategory) return false;
    if (!ql) return true;
    return (
      item.abbr.toLowerCase().includes(ql) ||
      item.full.toLowerCase().includes(ql) ||
      item.vi.toLowerCase().includes(ql) ||
      item.sws.toLowerCase().includes(ql) ||
      item.desc.toLowerCase().includes(ql)
    );
  });

  if (badge) {
    badge.textContent = (filtered.length === ABBREVIATIONS_DATA.length)
      ? (ABBREVIATIONS_DATA.length + " thuật ngữ")
      : (filtered.length + " / " + ABBREVIATIONS_DATA.length + " khớp");
  }

  let rows = "";
  if (filtered.length === 0) {
    rows = "<tr><td colspan=\"5\" style=\"text-align:center;color:var(--mut);padding:18px\">Không tìm thấy thuật ngữ nào khớp với từ khóa \"" + escapeHtmlSafe(q) + "\".</td></tr>";
  } else {
    rows = filtered.map((it) =>
      "<tr>" +
        "<td><strong class=\"mono\" style=\"color:var(--pri)\">" + highlightMatch(it.abbr, q) + "</strong><br><span class=\"badge badge-neutral\" style=\"margin-top:3px\">" + escapeHtmlSafe(catNames[it.cat] || it.cat) + "</span></td>" +
        "<td><b>" + highlightMatch(it.full, q) + "</b></td>" +
        "<td style=\"color:var(--cyan);font-weight:700\">" + highlightMatch(it.vi, q) + "</td>" +
        "<td class=\"mono\" style=\"color:var(--warn)\">" + highlightMatch(it.sws, q) + "</td>" +
        "<td>" + highlightMatch(it.desc, q) + "</td>" +
      "</tr>"
    ).join("");
  }

  area.innerHTML =
    "<div class=\"hb-card\">" +
      "<h3>Bảng Tra Cứu Thuật Ngữ &amp; Viết Tắt AUTOSAR FiM (48 Thuật Ngữ)</h3>" +
      "<table class=\"tbl\">" +
        "<thead><tr><th style=\"width:130px\">Viết tắt</th><th style=\"width:210px\">Tên đầy đủ</th><th style=\"width:185px\">Thuật ngữ Việt</th><th style=\"width:130px\">Chuẩn SWS</th><th>Giải thích kỹ thuật chi tiết</th></tr></thead>" +
        "<tbody>" + rows + "</tbody>" +
      "</table>" +
    "</div>";
}

function renderCurrentHandbookView() {
  const nav2 = document.getElementById("hbNav2");
  const filterBox = document.getElementById("hbAbbrFilterBox");
  const area = document.getElementById("hbContentArea");
  if (!nav2 || !filterBox || !area) return;

  if (hbTab1 === 6) {
    nav2.classList.add("hidden");
    filterBox.classList.remove("hidden");
    renderAbbreviationTable();
    return;
  }

  nav2.classList.remove("hidden");
  filterBox.classList.add("hidden");

  const tab = HANDBOOK_DATA[hbTab1] || HANDBOOK_DATA[0];
  const subs = tab.subs || [];
  if (hbTab2 >= subs.length) hbTab2 = 0;

  nav2.innerHTML = subs.map((s, idx) =>
    "<button class=\"hb-tab2" + (idx === hbTab2 ? " active" : "") + "\" onclick=\"switchHbTab2(" + idx + ")\">" + escapeHtmlSafe(s.title) + "</button>"
  ).join("");

  area.innerHTML = (subs[hbTab2] && subs[hbTab2].html) ? subs[hbTab2].html : "";
}

document.addEventListener("DOMContentLoaded", () => {
  initTooltipHandlers();
  loadScenario(0);
  switchCfgTab(0);
  switchInspTab(0);
});
</script>
</body>
</html>
"""


def main():
    json_str = json.dumps(HANDBOOK_TABS, ensure_ascii=False, indent=2)
    content = (
        "// ================= PART 6: HANDBOOK (6x4 TOPICS), ABBREVIATION GLOSSARY & BOOTSTRAP =================\n\n"
        "const HANDBOOK_DATA = " + json_str + ";\n"
        + FOOTER_JS
    )
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Generated {OUT_PATH} ({len(content)} bytes, {len(HANDBOOK_TABS)} main tabs)")


if __name__ == "__main__":
    main()
