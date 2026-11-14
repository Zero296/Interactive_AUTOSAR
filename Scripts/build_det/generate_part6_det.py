# -*- coding: utf-8 -*-
"""Generates part6_handbook.js containing the 6x4 Multi-Level Handbook,
Abbreviation Table + Live Search JS, and DOMContentLoaded Bootstrap.
"""

import json
import os
from hb_diagrams_det import (
    svg_det_lifecycle,
    svg_3streams_routing,
    svg_swc_rte_pdav,
    svg_hooks_dlt_pipeline,
    svg_ringbuf_and_dem,
    svg_reentrancy_and_guards,
)


def build_handbook_data():
    d_life = svg_det_lifecycle()
    d_3str = svg_3streams_routing()
    d_rte = svg_swc_rte_pdav()
    d_pipe = svg_hooks_dlt_pipeline()
    d_dem = svg_ringbuf_and_dem()
    d_reen = svg_reentrancy_and_guards()

    return [
        # ==================== TAB 1 ====================
        {
            "title": "1. Kiến trúc & Vòng đời",
            "subs": [
                {
                    "title": "1.1. Từ Development -> Default Error Tracer",
                    "html": f"""
                    <div class="hb-article">
                      <h2>1.1. Sự Tiến Hóa Từ "Development Error Tracer" Sang "Default Error Tracer" (AUTOSAR 4.3 &rarr; R23-11)</h2>
                      <p class="hb-lead">Từ AUTOSAR Classic R4.3 trở về trước, Det chỉ xử lý lỗi phát triển (Development Error). Từ R4.3 / R20-11 / R22-11 / R23-11, chữ <strong>D</strong> đổi thành <strong>Default Error Tracer</strong> để quản lý tập trung cả 3 loại lỗi.</p>
                      <div class="hb-callout"><strong>Điểm mấu chốt:</strong> Một ECU thương mại (Production) tắt hoàn toàn <code>&lt;Mod&gt;DevErrorDetect</code> để tiết kiệm ROM/CPU, nhưng <strong>vẫn giữ Det hoạt động</strong> cho <code>Det_ReportRuntimeError (0x04)</code> và <code>Det_ReportTransientFault (0x05)</code>!</div>
                      {d_3str}
                      <div class="hb-grid2">
                        <div class="hb-card">
                          <h3>Tại sao cần mở rộng thêm 2 luồng?</h3>
                          <ul>
                            <li><strong>Runtime Error (0x04):</strong> Các sự cố tải trọng/tài nguyên thực tế (đầy queue CAN/NvM, timeout) không phải bug code nên không thể bỏ qua ở Production.</li>
                            <li><strong>Transient Fault (0x05):</strong> Lỗi phần cứng tạm thời ở MCAL (ECC 1-bit Flash, nhiễu SPI) cần cơ chế Callout thử phục hồi và trả <code>Std_ReturnType</code>.</li>
                          </ul>
                        </div>
                        <div class="hb-card">
                          <h3>ModuleId 15 trong BSW Architecture</h3>
                          <p>Det thuộc nhóm <strong>System Services (03_Services)</strong> với định danh chuẩn <code>DET_MODULE_ID = 15 (0x000F)</code>. Mọi BSW, MCAL và SWC (qua RTE) đều có thể gọi Det.</p>
                        </div>
                      </div>
                    </div>"""
                },
                {
                    "title": "1.2. Vòng đời Det_Init & Det_Start",
                    "html": f"""
                    <div class="hb-article">
                      <h2>1.2. Vị Trí Trung Tâm &amp; Lý Do Phải Init Det Đầu Tiên</h2>
                      <p class="hb-lead">Trong pha khởi động ECU, <code>EcuM_AL_DriverInitZero()</code> luôn phải gọi <code>Det_Init(NULL_PTR)</code> trước bất kỳ driver hay BSW nào khác.</p>
                      {d_life}
                      <div class="hb-grid2">
                        <div class="hb-card">
                          <h3>Trình tự khởi tạo chuẩn SWS_Det</h3>
                          <ol>
                            <li><strong>EcuM_AL_DriverInitZero():</strong> Gọi <code>Det_Init(NULL_PTR)</code> [SID 0x00]. Xóa sạch <code>Det_ErrorBuffer[]</code>, đặt trạng thái <code>DET_INIT</code>.</li>
                            <li><strong>DriverInitOne &amp; BSW Init:</strong> Nếu bất kỳ driver nào gặp lỗi cấu hình ngay lúc boot, Det đã sẵn sàng ghi nhận.</li>
                            <li><strong>EcuM_StartupTwo():</strong> Sau khi OS &amp; DLT khởi chạy xong, gọi <code>Det_Start()</code> [SID 0x02] &rarr; <code>DET_STARTED</code>.</li>
                          </ol>
                        </div>
                        <div class="hb-card">
                          <h3>Bảo vệ trước lúc Init (SWS_Det_00204)</h3>
                          <p>Nếu một hàm C khởi tạo quá sớm vô tình gọi <code>Det_ReportError()</code> trước <code>Det_Init()</code>, chuẩn AUTOSAR <code>SWS_Det_00204</code> bắt buộc Det phải kiểm tra biến <code>Det_Initialized == TRUE</code> để không ghi đè rác lên vùng RAM chưa khởi tạo.</p>
                        </div>
                      </div>
                    </div>"""
                },
                {
                    "title": "1.3. Giải phẫu 4-Tuple Error Signature",
                    "html": """
                    <div class="hb-article">
                      <h2>1.3. Giải Phẫu Gói Lỗi 4 Tham Số (4-Tuple Error Packet)</h2>
                      <p class="hb-lead">Tất cả 3 API báo lỗi của Det đều mang chính xác 4 định danh giống nhau giúp truy vết từ cấp hệ thống xuống tới dòng lệnh:</p>
                      <table class="tbl">
                        <thead><tr><th>Tham số</th><th>Kiểu dữ liệu</th><th>Ý nghĩa &amp; Quy ước đặt mã</th><th>Ví dụ thực tế</th></tr></thead>
                        <tbody>
                          <tr><td><strong>ModuleId</strong></td><td><code>uint16</code></td><td>Định danh module phát lỗi. BSW/MCAL &lt; 2048; SWC &ge; 2048 do RTE tự chèn.</td><td><code>20</code> (NvM), <code>60</code> (CanIf), <code>92</code> (Fls), <code>2048</code> (SWC_BrakeCtrl)</td></tr>
                          <tr><td><strong>InstanceId</strong></td><td><code>uint8</code></td><td>Chỉ số đối tượng con khi ECU có nhiều bộ điều khiển giống nhau.</td><td><code>0</code> (CanCtrl 0), <code>1</code> (CanCtrl 1 / Trục sau)</td></tr>
                          <tr><td><strong>ApiId (SID)</strong></td><td><code>uint8</code></td><td>Service ID của hàm đang thực thi lúc phát sinh sự cố.</td><td><code>0x07</code> (NvM_WriteBlock), <code>0x05</code> (CanIf_Transmit), <code>0x03</code> (Det_GetVersionInfo)</td></tr>
                          <tr><td><strong>ErrorId / FaultId</strong></td><td><code>uint8</code></td><td>Mã nguyên nhân lỗi cụ thể được định nghĩa trong SWS của Caller.</td><td><code>0x15</code> (NVM_E_PARAM_BLOCK_ID), <code>0x1A</code> (NVM_E_QUEUE_FULL)</td></tr>
                        </tbody>
                      </table>
                    </div>"""
                },
                {
                    "title": "1.4. Phân tích I/O 10 Module liên quan",
                    "html": """
                    <div class="hb-article">
                      <h2>1.4. Bảng Phân Tích I/O 10 Module Tương Tác Với Det</h2>
                      <p class="hb-lead">Tóm tắt nguồn Input, cơ chế xử lý và Output route của từng module xuất hiện trên sơ đồ tương tác:</p>
                      <table class="tbl">
                        <thead><tr><th>Module</th><th>Input lấy từ đâu</th><th>Xử lý chính</th><th>Output route đến đâu</th></tr></thead>
                        <tbody>
                          <tr><td><strong>MOD_SWC</strong></td><td>Runnable 10ms / Tín hiệu cảm biến</td><td>Báo lỗi 3 tham số qua C/S Port</td><td><code>Rte_Call_DETService_*</code> &rarr; MOD_RTE</td></tr>
                          <tr><td><strong>MOD_RTE</strong></td><td>3 tham số từ SWC</td><td>Tra bảng PDAV tự chèn <code>ModuleId &ge; 2048</code></td><td>Gọi <code>Det_ReportError / RuntimeError</code></td></tr>
                          <tr><td><strong>MOD_BSW</strong></td><td>NvM, CanIf, WdgM, ComM, BswM</td><td>Kiểm tra param <code>#if DEV_ERROR_DETECT</code> hoặc tải</td><td><code>Det_ReportError (0x01)</code> / <code>Runtime (0x04)</code></td></tr>
                          <tr><td><strong>MOD_MCAL</strong></td><td>Thanh ghi phần cứng Fls, Spi, Adc</td><td>Phát hiện nhiễu ECC/Bus tạm thời</td><td><code>Det_ReportTransientFault (0x05)</code></td></tr>
                          <tr><td><strong>MOD_ECUM</strong></td><td>Startup phases (DriverInitZero/Two)</td><td>Đảm bảo init Det đầu tiên</td><td><code>Det_Init()</code> &rarr; <code>Det_Start()</code></td></tr>
                          <tr><td><strong>MOD_DET</strong></td><td>4-Tuple từ Callers + Context</td><td>Guard &rarr; Filter &rarr; Hook &rarr; DLT &rarr; Buffer</td><td>MOD_HOOKS, MOD_DLT, MOD_BUFFER, Halt</td></tr>
                          <tr><td><strong>MOD_HOOKS</strong></td><td>4-Tuple vượt Global Filter</td><td>Chạy mảng callback &amp; chống đệ quy</td><td>.noinit RAM / Std_ReturnType</td></tr>
                          <tr><td><strong>MOD_DLT</strong></td><td>Dev (0x01) &amp; Runtime (0x04)</td><td>Đóng gói AppId/CtxId (KHÔNG nhận 0x05!)</td><td>PduR &rarr; CAN/Eth &rarr; PC DLT Viewer</td></tr>
                          <tr><td><strong>MOD_BUFFER</strong></td><td>4-Tuple sau Global Filter</td><td>Lưu RAM <code>FIFO Overwrite</code> hoặc <code>Stop-On-Full</code></td><td>Watch Window / Trace32 RAM Dump</td></tr>
                          <tr><td><strong>MOD_DEBUG_DEM</strong></td><td>Dev Halt hoặc Transient E_NOT_OK</td><td>Debug dừng CPU vs DEM ghi DTC</td><td>JTAG Call Stack hoặc <code>Dem_SetEventStatus</code></td></tr>
                        </tbody>
                      </table>
                    </div>"""
                }
            ]
        },
        # ==================== TAB 2 ====================
        {
            "title": "2. Phân luồng 3 API",
            "subs": [
                {
                    "title": "2.1. Development Error (SID 0x01)",
                    "html": """
                    <div class="hb-article">
                      <h2>2.1. Det_ReportError() — Luồng Lỗi Phát Triển [SID 0x01]</h2>
                      <p class="hb-lead">Dành riêng cho lỗi do lập trình viên (truyền NULL_PTR, gọi hàm khi Uninit, vượt dải ID/Index). Được biên dịch có điều kiện qua <code>&lt;Mod&gt;DevErrorDetect == STD_ON</code>.</p>
                      <pre class="code-blk">Std_ReturnType Det_ReportError(
  uint16 ModuleId, uint8 InstanceId, uint8 ApiId, uint8 ErrorId
); /* SWS_Det_00039 - Always returns E_OK (unless CPU halted in endless loop) */</pre>
                      <div class="hb-card">
                        <h3>Đặc điểm kỹ thuật bắt buộc</h3>
                        <ul>
                          <li>Bị loại bỏ hoàn toàn khỏi binary Production bằng tiền xử lý <code>#if (NVM_DEV_ERROR_DETECT == STD_ON)</code> ở phía Caller.</li>
                          <li>Được phép gọi <code>DetErrorHook[]</code>, chuyển tiếp <code>Dlt_DetForwardErrorTrace()</code>, ghi RAM Ring Buffer.</li>
                          <li>Là luồng <strong>DUY NHẤT</strong> được phép dừng CPU bằng <code>while(det_halt)</code> hoặc <code>__BKPT(0)</code> trên bàn Lab.</li>
                        </ul>
                      </div>
                    </div>"""
                },
                {
                    "title": "2.2. Runtime Error (SID 0x04)",
                    "html": """
                    <div class="hb-article">
                      <h2>2.2. Det_ReportRuntimeError() — Luồng Lỗi Vận Hành [SID 0x04]</h2>
                      <p class="hb-lead">Ghi nhận các bất thường tài nguyên khi ECU vận hành thực tế: đầy hàng đợi CanIf/NvM, timeout truyền thông, lỗi phân bổ buffer tạm thời.</p>
                      <pre class="code-blk">Std_ReturnType Det_ReportRuntimeError(
  uint16 ModuleId, uint8 InstanceId, uint8 ApiId, uint8 ErrorId
); /* SWS_Det_00501 - Active even in Production; Always returns E_OK */</pre>
                      <div class="hb-callout warn"><strong>Tại sao vẫn bật ở Production?</strong> Vì những lỗi này phụ thuộc vào tải xe thực tế ngoài đường, không thể phát hiện hết lúc biên dịch code. Tuy nhiên Det <strong>tuyệt đối không treo CPU</strong> vì xe đang chạy trên đường!</div>
                    </div>"""
                },
                {
                    "title": "2.3. Transient Fault (SID 0x05)",
                    "html": """
                    <div class="hb-article">
                      <h2>2.3. Det_ReportTransientFault() — Lỗi Phần Cứng Nhất Thời [SID 0x05]</h2>
                      <p class="hb-lead">Phục vụ tầng MCAL (Fls, Spi, Adc, Mcu) khi phần cứng gặp xung nhiễu EMI, lỗi ECC 1-bit đọc Flash hoặc lỗi giao tiếp tạm thời.</p>
                      <pre class="code-blk">Std_ReturnType Det_ReportTransientFault(
  uint16 ModuleId, uint8 InstanceId, uint8 ApiId, uint8 FaultId
); /* SWS_Det_00502 &amp; SWS_Det_00503 - Returns Callout Std_ReturnType! */</pre>
                      <div class="hb-card">
                        <h3>Hai điểm khác biệt sống còn của Transient Fault</h3>
                        <ol>
                          <li><strong>SWS_Det_00211:</strong> Det <strong>KHÔNG gọi</strong> <code>Dlt_DetForwardErrorTrace()</code> cho Transient Fault để tránh làm ngập bus CAN/Ethernet bởi nhiễu phần cứng ngắn hạn.</li>
                          <li><strong>SWS_Det_00503:</strong> Chỉ duy nhất API này trả về mã <code>Std_ReturnType</code> động do <code>DetReportTransientFaultCallout[]</code> quyết định (<code>E_OK</code> = tiếp tục retry, <code>E_NOT_OK</code> = hỏng thật &rarr; báo sang DEM!).</li>
                        </ol>
                      </div>
                    </div>"""
                },
                {
                    "title": "2.4. Bảng so sánh 0x01 vs 0x04 vs 0x05",
                    "html": f"""
                    <div class="hb-article">
                      <h2>2.4. Bảng So Sánh Toàn Diện 3 Luồng Báo Lỗi Chuẩn R22-11 / R23-11</h2>
                      {d_3str}
                      <table class="tbl">
                        <thead><tr><th>Tiêu chí</th><th>Dev Error (0x01)</th><th>Runtime Error (0x04)</th><th>Transient Fault (0x05)</th></tr></thead>
                        <tbody>
                          <tr><td><strong>API AUTOSAR</strong></td><td><code>Det_ReportError</code></td><td><code>Det_ReportRuntimeError</code></td><td><code>Det_ReportTransientFault</code></td></tr>
                          <tr><td><strong>Công tắc Production</strong></td><td>Bị lược bỏ khi Caller <code>DevErrorDetect=OFF</code></td><td><strong>Luôn sống</strong> ở Production</td><td><strong>Luôn sống</strong> ở Production</td></tr>
                          <tr><td><strong>Callout Array</strong></td><td><code>DetErrorHook[]</code></td><td><code>DetReportRuntimeErrorCallout[]</code></td><td><code>DetReportTransientFaultCallout[]</code></td></tr>
                          <tr><td><strong>Forward sang DLT?</strong></td><td><strong>CÓ</strong> (<code>SWS_Det_00211</code>)</td><td><strong>CÓ</strong> (<code>SWS_Det_00211</code>)</td><td><strong>KHÔNG</strong> (Cấm bởi <code>SWS_Det_00211</code>)</td></tr>
                          <tr><td><strong>Endless Loop / BKPT?</strong></td><td><strong>CÓ</strong> (nếu bật cấu hình)</td><td><strong>KHÔNG</strong> bao giờ</td><td><strong>KHÔNG</strong> bao giờ</td></tr>
                          <tr><td><strong>Giá trị trả về</strong></td><td>Luôn <code>E_OK</code></td><td>Luôn <code>E_OK</code></td><td>Theo kết quả Callout (<code>E_OK / E_NOT_OK</code>)</td></tr>
                        </tbody>
                      </table>
                    </div>"""
                }
            ]
        },
        # ==================== TAB 3 ====================
        {
            "title": "3. SWC & BSW Tương tác",
            "subs": [
                {
                    "title": "3.1. Cổng dịch vụ RTE DETService",
                    "html": f"""
                    <div class="hb-article">
                      <h2>3.1. Cơ Chế Cổng Dịch Vụ RTE (DETService) Cho Application SWC</h2>
                      <p class="hb-lead">Theo nguyên tắc phân tầng AUTOSAR, các Application SWC không được include trực tiếp <code>Det.h</code> mà phải nối qua Client-Server Port Interface chuẩn hóa mang tên <code>DETService</code>.</p>
                      {d_rte}
                      <div class="hb-card">
                        <h3>Ưu điểm của Service Port DETService</h3>
                        <ul>
                          <li>Cho phép SWC báo cả <code>ReportError</code> (lỗi logic/plausibility) và <code>ReportRuntimeError</code> (lỗi vận hành) mà không phụ thuộc đường dẫn header BSW.</li>
                          <li>Dễ dàng bật/tắt từng cổng SWC độc lập trong ARXML bằng <code>SwcBrake_DetPortEnabled</code>.</li>
                        </ul>
                      </div>
                    </div>"""
                },
                {
                    "title": "3.2. Kỹ thuật PDAV Auto-ModuleId",
                    "html": """
                    <div class="hb-article">
                      <h2>3.2. Kỹ Thuật Port-Defined Argument Value (PDAV) Trên RTE</h2>
                      <p class="hb-lead">Khi viết code trong SWC Runnable, lập trình viên chỉ gọi với <strong>3 tham số</strong> <code>(InstanceId, ApiId, ErrorId)</code>. Vậy tham số <code>ModuleId</code> đi đâu?</p>
                      <pre class="code-blk">/* Trong SWC_BrakeCtrl.c (Application): chỉ có 3 tham số! */
Rte_Call_DETService_ReportError(0U, 0x01U, SWC_E_WHEEL_SPD_RANGE);

/* Trong Rte_SWC_BrakeCtrl.c do công cụ RTE tự sinh (PDAV = 2048U): */
Std_ReturnType Rte_Call_SWC_BrakeCtrl_DETService_ReportError(uint8 inst, uint8 api, uint8 err) {
  return Det_ReportError(2048U /* PDAV! */, inst, api, err);
}</pre>
                      <div class="hb-callout"><strong>Lợi ích bảo mật kiến trúc (SWS_Det_00210):</strong> Mỗi SWC được khóa cứng vào một <code>DetModuleId &ge; 2048</code> trong ECUC. SWC không thể giả mạo ModuleId của NvM (20) hay CanIf (60)!</div>
                    </div>"""
                },
                {
                    "title": "3.3. Defensive Guards đầu hàm BSW",
                    "html": """
                    <div class="hb-article">
                      <h2>3.3. Mẫu Thiết Kế Cổng Bảo Vệ Đầu Hàm (Defensive API Guards) Trong BSW</h2>
                      <p class="hb-lead">Hầu hết BSW AUTOSAR đều đặt khối kiểm tra <code>#if (DEV_ERROR_DETECT == STD_ON)</code> ngay đầu mỗi Public API theo thứ tự ưu tiên chuẩn:</p>
                      <pre class="code-blk">Std_ReturnType NvM_WriteBlock(NvM_BlockIdType BlockId, const void* NvM_SrcPtr) {
  Std_ReturnType ret = E_NOT_OK;
#if (NVM_DEV_ERROR_DETECT == STD_ON)
  if (NvM_Initialized == FALSE) {
    (void)Det_ReportError(NVM_MODULE_ID, 0U, 0x07U, NVM_E_NOT_INITIALIZED);
  } else if (BlockId >= NVM_TOTAL_NUM_OF_NVRAM_BLOCKS) {
    (void)Det_ReportError(NVM_MODULE_ID, 0U, 0x07U, NVM_E_PARAM_BLOCK_ID); /* 0x15 */
  } else if (NvM_SrcPtr == NULL_PTR) {
    (void)Det_ReportError(NVM_MODULE_ID, 0U, 0x07U, NVM_E_PARAM_POINTER);
  } else
#endif
  {
    ret = NvM_InternalEnqueueJob(BlockId, NvM_SrcPtr);
    if (ret == E_NOT_OK) {
      (void)Det_ReportRuntimeError(NVM_MODULE_ID, 0U, 0x07U, NVM_E_QUEUE_FULL); /* 0x1A */
    }
  }
  return ret;
}</pre>
                    </div>"""
                },
                {
                    "title": "3.4. Reentrancy & SchM Exclusive Area",
                    "html": f"""
                    <div class="hb-article">
                      <h2>3.4. Tính Tái Nhập (Reentrancy) &amp; Bảo Vệ DET_EXCLUSIVE_AREA_0</h2>
                      <p class="hb-lead">Vì <code>Det_ReportError()</code> có thể được gọi đồng thời từ <code>Task_10ms</code> và <code>ISR_CanRx</code> (ngắt ưu tiên cao), mọi thao tác cập nhật con trỏ Ring Buffer phải được bảo vệ bằng <code>SchM_Enter_Det_DET_EXCLUSIVE_AREA_0()</code>.</p>
                      {d_reen}
                      <div class="hb-callout err"><strong>Mô phỏng thực tế ở Kịch bản S10:</strong> Nếu tắt <code>ProtectReentrancyWithSchM</code>, bạn sẽ thấy ngay ô nhớ <code>Det_ErrorBuffer[]</code> bị xé đôi (Torn Write &rarr; CORRUPT) khi ISR chen ngang Task!</div>
                    </div>"""
                }
            ]
        },
        # ==================== TAB 4 ====================
        {
            "title": "4. Hooks, DLT & Filter",
            "subs": [
                {
                    "title": "4.1. Kiến trúc 3 nhóm Hook & Callout",
                    "html": f"""
                    <div class="hb-article">
                      <h2>4.1. Kiến Trúc 3 Nhóm Hàm Hook / Callout Độc Lập</h2>
                      <p class="hb-lead">AUTOSAR Det tách bạch 3 mảng hàm callback riêng biệt cho 3 luồng lỗi để nhà tích hợp xử lý chính xác theo ngữ cảnh:</p>
                      {d_pipe}
                      <table class="tbl">
                        <thead><tr><th>Cấu hình ECUC Array</th><th>Kích hoạt bởi</th><th>Vai trò điển hình của Integrator</th></tr></thead>
                        <tbody>
                          <tr><td><code>DetErrorHook[]</code></td><td><code>Det_ReportError (0x01)</code></td><td>Lưu 4-Tuple vào .noinit RAM, nháy đèn lỗi phần cứng, ghi biến debugger.</td></tr>
                          <tr><td><code>DetReportRuntimeErrorCallout[]</code></td><td><code>Det_ReportRuntimeError (0x04)</code></td><td>Đếm tần suất tràn queue CAN/NvM, cảnh báo hiệu năng hệ thống.</td></tr>
                          <tr><td><code>DetReportTransientFaultCallout[]</code></td><td><code>Det_ReportTransientFault (0x05)</code></td><td>Thử reset ngoại vi/retry SPI và trả về <code>E_OK</code> hoặc <code>E_NOT_OK</code>.</td></tr>
                        </tbody>
                      </table>
                    </div>"""
                },
                {
                    "title": "4.2. Chống đệ quy Hook (SWS_Det_00180)",
                    "html": """
                    <div class="hb-article">
                      <h2>4.2. Quy Tắc An Toàn Khi Viết Hàm Hook (Anti-Recursion SWS_Det_00180)</h2>
                      <p class="hb-lead">Một lỗi kinh điển trong dự án thực tế: kỹ sư gọi một API BSW (như <code>NvM_WriteBlock</code> hoặc <code>CanIf_Transmit</code>) bên trong <code>DetErrorHook()</code>, và chính API đó lại phát sinh lỗi gọi ngược lại <code>Det_ReportError()</code>!</p>
                      <div class="hb-callout err"><strong>Cơ chế bảo vệ:</strong> Sử dụng biến cờ re-entry per-core <code>Det_HookActiveFlag</code>. Khi thấy cờ đang TRUE mà lại có cuộc gọi Det lồng nhau từ trong Hook, Det lập tức chặn nhánh Hook để tránh Stack Overflow sập ECU (Kiểm chứng ngay ở Kịch bản <strong>S8</strong>).</div>
                      <div class="hb-card">
                        <h3>Giới hạn thời gian thực thi (Timing Budget)</h3>
                        <p>Do Hook thường chạy ngay trong ngữ cảnh gọi (thậm chí trong <code>ISR_CanRx</code>), tổng thời gian thực thi mọi Hook phải cực nhỏ (thường &lt; <code>MaxHookExecutionTimeUs = 50 us</code>) và tuyệt đối <strong>KHÔNG</strong> gọi hàm blocking chờ I/O.</p>
                      </div>
                    </div>"""
                },
                {
                    "title": "4.3. Giao tiếp DLT (SWS_Det_00211)",
                    "html": """
                    <div class="hb-article">
                      <h2>4.3. Chuyển Tiếp Khung Lỗi Sang Module DLT (Diagnostic Log &amp; Trace)</h2>
                      <p class="hb-lead">Khi <code>DetForwardToDlt == TRUE</code> và <code>Det_Start()</code> đã chạy, Det gọi API chuẩn:</p>
                      <pre class="code-blk">void Dlt_DetForwardErrorTrace(
  uint16 ModuleId, uint8 InstanceId, uint8 ApiId, uint8 ErrorId
);</pre>
                      <div class="hb-card">
                        <h3>Quy tắc định tuyến DLT bắt buộc (SWS_Det_00211)</h3>
                        <ul>
                          <li><strong>ĐƯỢC PHÉP gửi DLT:</strong> <code>Det_ReportError (0x01)</code> và <code>Det_ReportRuntimeError (0x04)</code>.</li>
                          <li><strong>KHÔNG ĐƯỢC gửi DLT:</strong> <code>Det_ReportTransientFault (0x05)</code>.</li>
                          <li>DLT gắn cặp mã 4 ký tự <code>AppId / ContextId</code> (vd <code>"DET / ERRS"</code>) rồi đẩy qua <code>PduR &rarr; CanTp / SoAd</code> ra PC DLT Viewer theo thời gian thực.</li>
                        </ul>
                      </div>
                    </div>"""
                },
                {
                    "title": "4.4. Debug thực chiến & NoInit RAM",
                    "html": """
                    <div class="hb-article">
                      <h2>4.4. Kỹ Thuật Debug Thực Chiến: Endless Loop, __BKPT(0) &amp; NoInit Crash Crumb</h2>
                      <div class="hb-grid2">
                        <div class="hb-card">
                          <h3>1. Bàn Lab (JTAG / Trace32 attached)</h3>
                          <p>Bật <code>DetEndlessLoopInDevError</code> hoặc <code>DetBreakpointFilter</code> để dừng CPU đúng lúc lỗi xảy ra. Kỹ sư đọc Call Stack để biết chính xác hàm nào đã gọi sai, sau đó gán <code>det_halt = 0</code> (nút <strong>Break Endless Loop</strong>) để chạy tiếp.</p>
                        </div>
                        <div class="hb-card">
                          <h3>2. Xe chạy đường trường (.noinit RAM)</h3>
                          <p>Khi không cắm máy tính trên xe, không thể dừng CPU. Hook sẽ ghi <code>{ModId, InstId, ApiId, ErrorId, TaskId, Counter}</code> vào phân vùng linker <code>.noinit</code> (không bị Startup code xóa về 0 khi reset). Sau đó DLT hoặc DCM đọc ra khi xe về xưởng.</p>
                        </div>
                      </div>
                    </div>"""
                }
            ]
        },
        # ==================== TAB 5 ====================
        {
            "title": "5. An toàn, Buffer & DEM",
            "subs": [
                {
                    "title": "5.1. RAM Ring Buffer: FIFO vs Stop-on-Full",
                    "html": """
                    <div class="hb-article">
                      <h2>5.1. Thiết Kế RAM Ring Buffer: FIFO Overwrite vs Stop-On-Full Keep First</h2>
                      <p class="hb-lead">Do dung lượng RAM có hạn, <code>Det_ErrorBuffer[]</code> thường chỉ chứa 8 đến 32 phần tử. Lựa chọn chính sách tràn bộ đệm quyết định bạn có tìm được nguyên nhân gốc hay không!</p>
                      <table class="tbl">
                        <thead><tr><th>Chế độ</th><th>Hành vi khi Buffer đầy</th><th>Khi nào nên dùng?</th></tr></thead>
                        <tbody>
                          <tr><td><strong>FIFO_OVERWRITE_OLDEST</strong></td><td>Quay vòng ghi đè slot cũ nhất bằng lỗi mới nhất.</td><td>Khi cần theo dõi chuỗi sự cố vừa mới xảy ra tức thì trên băng thử.</td></tr>
                          <tr><td><strong>STOP_ON_FULL_KEEP_FIRST</strong></td><td>Khóa buffer không nhận thêm, bảo vệ 100% N lỗi đầu tiên.</td><td>Cực kỳ hiệu quả khi một lỗi khởi tạo ban đầu (Root Cause) làm đổ domino gây bão 50 lỗi phụ phía sau (Thử ngay ở <strong>Kịch bản S9</strong>).</td></tr>
                        </tbody>
                      </table>
                    </div>"""
                },
                {
                    "title": "5.2. Global Filter & Breakpoint Filter",
                    "html": """
                    <div class="hb-article">
                      <h2>5.2. Dập Nhiễu Với Global Filter &amp; Săn Lỗi Với Breakpoint Filter</h2>
                      <ul>
                        <li><strong>Global Filter (<code>DetGlobalFilterRule</code>):</strong> Dùng cú pháp <code>ModuleId:ErrorId</code> (hoặc wildcard <code>60:*</code>) để bỏ qua các lỗi đã biết trước đang làm nhiễu RAM Buffer trong lúc tích hợp tính năng khác.</li>
                        <li><strong>Breakpoint Filter (<code>DetBreakpointFilterRule</code>):</strong> Ngay cả khi bạn tắt treo CPU chung (<code>DetEndlessLoopInDevError = FALSE</code>), Breakpoint Filter giúp dừng CPU <strong>duy nhất</strong> khi đúng cặp lỗi mục tiêu xuất hiện (vd <code>20:0x15</code>).</li>
                      </ul>
                    </div>"""
                },
                {
                    "title": "5.3. Phân định ranh giới DET vs DEM",
                    "html": f"""
                    <div class="hb-article">
                      <h2>5.3. Phân Định Ranh Giới Sống Còn: DET (Module 15) vs DEM (Module 54)</h2>
                      <p class="hb-lead">Một nhầm lẫn phổ biến của người mới học AUTOSAR là dùng DET để báo hỏng phần cứng xe, hoặc dùng DEM để bắt lỗi NULL pointer. Hai module này phục vụ hai thế giới hoàn toàn khác nhau:</p>
                      {d_dem}
                      <table class="tbl">
                        <thead><tr><th>Tiêu chí so sánh</th><th>DET (Default Error Tracer)</th><th>DEM (Diagnostic Event Manager)</th></tr></thead>
                        <tbody>
                          <tr><td><strong>Đối tượng sự kiện</strong></td><td>Bug code (0x01), Nghẽn tải (0x04), Nhiễu MCAL (0x05)</td><td>Hỏng hóc phần cứng xe (đứt dây, ngắn mạch Vbat/GND, cảm biến hỏng)</td></tr>
                          <tr><td><strong>Ghi NvM Flash?</strong></td><td><strong>KHÔNG</strong> (chỉ lưu RAM / DLT / .noinit)</td><td><strong>CÓ</strong> (lưu dài hạn trong NVRAM xuyên suốt vòng đời xe)</td></tr>
                          <tr><td><strong>Cơ chế Debounce &amp; DTC</strong></td><td>Không có (báo 1 lần ăn ngay 4-Tuple)</td><td>Có bộ lọc Debounce, Aging Cycle, FreezeFrame &amp; mã DTC 3-byte</td></tr>
                          <tr><td><strong>Dịch vụ chẩn đoán UDS</strong></td><td>Không hỗ trợ</td><td>Máy chẩn đoán xưởng đọc qua <strong>UDS 0x19</strong> &amp; xóa bằng <strong>UDS 0x14</strong></td></tr>
                        </tbody>
                      </table>
                    </div>"""
                },
                {
                    "title": "5.4. Phối hợp DET + DEM + ISO 26262",
                    "html": """
                    <div class="hb-article">
                      <h2>5.4. Chiến Lược Phối Hợp DET + DEM + WdgM Trong Hệ Thống An Toàn ISO 26262</h2>
                      <p class="hb-lead">Khi kết hợp đúng, Det không chỉ phục vụ Debug mà trở thành tuyến phòng thủ đa tầng:</p>
                      <ol>
                        <li><strong>Tầng 1 (Biên dịch &amp; Unit Test):</strong> Bật 100% <code>DevErrorDetect</code> + Breakpoint để triệt tiêu toàn bộ bug NULL_PTR, Uninit trước khi lên xe.</li>
                        <li><strong>Tầng 2 (Vận hành Runtime 0x04 &amp; Transient 0x05):</strong> Theo dõi nghẽn tài nguyên và thực hiện phục hồi tự động khi có nhiễu ECC tạm thời.</li>
                        <li><strong>Tầng 3 (Leo thang DEM):</strong> Khi <code>Det_ReportTransientFault()</code> vượt quá <code>MaxTransientFaultRetries</code> và trả về <code>E_NOT_OK</code>, Driver báo ngay sang <code>Dem_SetEventStatus(EventId, DEM_EVENT_STATUS_FAILED)</code> để bật đèn MIL / đi vào Safe State.</li>
                      </ol>
                    </div>"""
                }
            ]
        },
        # ==================== TAB 6 ====================
        {
            "title": "6. API, ModuleId & ECUC",
            "subs": [
                {
                    "title": "6.1. Bảng 6 API & 4 Callout chuẩn",
                    "html": """
                    <div class="hb-article">
                      <h2>6.1. Từ Điển API &amp; Callout Chuẩn Của Module Det (R20-11 / R22-11 / R23-11)</h2>
                      <table class="tbl">
                        <thead><tr><th>SID</th><th>Hàm / Callout AUTOSAR</th><th>Reentrant?</th><th>Đặc tả &amp; Giá trị trả về</th></tr></thead>
                        <tbody>
                          <tr><td><code>0x00</code></td><td><code>void Det_Init(const Det_ConfigType* ConfigPtr)</code></td><td>Non-Reentrant</td><td><code>SWS_Det_00019</code>: Khởi tạo Det, xóa buffer RAM.</td></tr>
                          <tr><td><code>0x01</code></td><td><code>Std_ReturnType Det_ReportError(Mod, Inst, Api, Err)</code></td><td><strong>Reentrant</strong></td><td><code>SWS_Det_00039</code>: Báo Development Error, luôn trả <code>E_OK</code>.</td></tr>
                          <tr><td><code>0x02</code></td><td><code>void Det_Start(void)</code></td><td>Non-Reentrant</td><td><code>SWS_Det_00025</code>: Kích hoạt sau OS startup.</td></tr>
                          <tr><td><code>0x03</code></td><td><code>void Det_GetVersionInfo(Std_VersionInfoType* vi)</code></td><td>Reentrant</td><td><code>SWS_Det_00028</code>: Tự báo <code>0x01</code> nếu <code>vi == NULL_PTR</code>.</td></tr>
                          <tr><td><code>0x04</code></td><td><code>Std_ReturnType Det_ReportRuntimeError(Mod, Inst, Api, Err)</code></td><td><strong>Reentrant</strong></td><td><code>SWS_Det_00501</code>: Runtime Error cả Production, trả <code>E_OK</code>.</td></tr>
                          <tr><td><code>0x05</code></td><td><code>Std_ReturnType Det_ReportTransientFault(Mod, Inst, Api, Flt)</code></td><td><strong>Reentrant</strong></td><td><code>SWS_Det_00502/503</code>: Trả giá trị của Transient Callout.</td></tr>
                          <tr><td>Callback</td><td><code>DetErrorHook[] / RuntimeCallout[] / TransientCallout[]</code></td><td>Sync Call</td><td><code>SWS_Det_00014</code>: Chuỗi hàm tích hợp của OEM/Tier-1.</td></tr>
                        </tbody>
                      </table>
                    </div>"""
                },
                {
                    "title": "6.2. Bảng 30+ ModuleId AUTOSAR",
                    "html": """
                    <div class="hb-article">
                      <h2>6.2. Bảng Tra Cứu Nhanh Mã AUTOSAR ModuleId Chuẩn (BSW, MCAL &amp; SWC)</h2>
                      <table class="tbl">
                        <thead><tr><th>ModuleId</th><th>Tên Module</th><th>Tầng / Nhóm</th><th>Lỗi kinh điển thường gặp trên Det</th></tr></thead>
                        <tbody>
                          <tr><td><code>1</code></td><td><strong>Os</strong></td><td>System Service</td><td><code>E_OS_ACCESS</code>, <code>E_OS_ID</code>, Stack overflow</td></tr>
                          <tr><td><code>10</code></td><td><strong>EcuM</strong></td><td>System Service</td><td><code>ECUM_E_UNINIT</code>, sai pha Startup/Sleep</td></tr>
                          <tr><td><code>12</code></td><td><strong>ComM</strong></td><td>Com Service</td><td><code>COMM_E_PARAM_CHANNEL (0x11)</code></td></tr>
                          <tr><td><code>13</code></td><td><strong>WdgM</strong></td><td>System Service</td><td><code>WDGM_E_INV_POINTER (0x12)</code>, checkpoint sai</td></tr>
                          <tr><td><code>15</code></td><td><strong>Det</strong></td><td>System Service</td><td><code>DET_E_PARAM_POINTER (0x01)</code> (Self-error)</td></tr>
                          <tr><td><code>20</code></td><td><strong>NvM</strong></td><td>Memory Service</td><td><code>NVM_E_PARAM_BLOCK_ID (0x15)</code>, <code>NVM_E_QUEUE_FULL (0x1A)</code></td></tr>
                          <tr><td><code>42</code></td><td><strong>BswM</strong></td><td>Mode Mgmt</td><td><code>BSWM_E_PARAM_CONFIG (0x01)</code></td></tr>
                          <tr><td><code>50 / 51</code></td><td><strong>Com / PduR</strong></td><td>Communication</td><td><code>COM_E_PARAM</code>, <code>PDUR_E_PDU_ID_INVALID</code></td></tr>
                          <tr><td><code>53 / 54 / 55</code></td><td><strong>Dcm / Dem / Dlt</strong></td><td>Diagnostics</td><td><code>DCM_E_PARAM</code>, <code>DEM_E_WRONG_CONFIGURATION</code></td></tr>
                          <tr><td><code>60 / 80</code></td><td><strong>CanIf / Can</strong></td><td>CAN Stack</td><td><code>CANIF_E_UNINIT (0x1E)</code>, <code>CANIF_E_PARAM_POINTER (0x05)</code></td></tr>
                          <tr><td><code>83 / 92 / 101</code></td><td><strong>Spi / Fls / Mcu</strong></td><td>MCAL Drivers</td><td><code>FLS_E_BUSY (0x0A)</code>, ECC Transient <code>0x11</code>, <code>FLS_E_ERASE_FAILED</code></td></tr>
                          <tr><td><code>120 / 123 / 140</code></td><td><strong>Dio / Adc / CanSM</strong></td><td>MCAL / Com</td><td><code>DIO_E_PARAM_INVALID_PORT_ID</code>, <code>ADC_E_BUSY</code></td></tr>
                          <tr><td><code>&ge; 2048</code></td><td><strong>SWC_BrakeCtrl / Diag</strong></td><td>Application SWC</td><td>Chèn tự động bởi RTE PDAV (<code>2048, 2049...</code>)</td></tr>
                        </tbody>
                      </table>
                    </div>"""
                },
                {
                    "title": "6.3. Bảng mã lỗi phổ biến",
                    "html": """
                    <div class="hb-article">
                      <h2>6.3. Các Mã Lỗi Phổ Biến Nhất Khi Đọc Trace / RAM Buffer</h2>
                      <p class="hb-lead">Khi thấy 4-Tuple trong <code>Det_ErrorBuffer[8]</code>, kỹ sư thường đối chiếu trực tiếp mã <code>ErrorId</code> theo từng nhóm chuẩn:</p>
                      <ul>
                        <li><strong>Nhóm UNINIT:</strong> Thường mang tên <code>&lt;MOD&gt;_E_UNINIT</code> — gọi API module trước khi <code>&lt;Mod&gt;_Init()</code> chạy.</li>
                        <li><strong>Nhóm PARAM_POINTER:</strong> Thường mang giá trị <code>0x01</code> hoặc <code>0x05</code> (ví dụ chính Det dùng <code>DET_E_PARAM_POINTER = 0x01</code>).</li>
                        <li><strong>Nhóm Runtime BUSY / QUEUE_FULL:</strong> Ví dụ <code>NVM_E_QUEUE_FULL = 0x1A</code>, <code>FLS_E_BUSY = 0x0A</code> &rarr; gọi qua <code>Det_ReportRuntimeError (0x04)</code>.</li>
                        <li><strong>Nhóm Transient ECC / Hardware Glitch:</strong> Phát sinh ở <code>Fls (92)</code> hoặc <code>Spi (83)</code> qua <code>Det_ReportTransientFault (0x05)</code>.</li>
                      </ul>
                    </div>"""
                },
                {
                    "title": "6.4. Từ điển 36 tham số ECUC",
                    "html": """
                    <div class="hb-article">
                      <h2>6.4. Từ Điển 6 Nhóm (36 Tham Số) Cấu Hình ECUC Trong Trình Mô Phỏng</h2>
                      <p class="hb-lead">Di chuột quá 1 giây hoặc bấm biểu tượng <code>&#9432;</code> ở cột bên trái bất kỳ lúc nào để xem đường dẫn ARXML và giải thích từng tham số.</p>
                      <table class="tbl">
                        <thead><tr><th>Tab ECUC</th><th>6 Tham số bên trong</th><th>Mục tiêu cấu hình</th></tr></thead>
                        <tbody>
                          <tr><td><strong>1. Lifecycle</strong></td><td><code>DetInitialized</code>, <code>DetStarted</code>, <code>DetVersionInfoApi</code>, <code>RuntimeCalloutEnabled</code>, <code>TransientCalloutEnabled</code>, <code>EcuBuildProfile</code></td><td>Vòng đời ECU &amp; Profile Dev/Prod</td></tr>
                          <tr><td><strong>2. Dev &amp; Halt</strong></td><td><code>CallerDevErrorDetect</code>, <code>DetEndlessLoopInDevError</code>, <code>TriggerHardwareBkpt</code>, <code>ProtectReentrancyWithSchM</code>, <code>PreventRecursiveHookCall</code>, <code>MaxHookExecutionTimeUs</code></td><td>Hành vi Debug Halt, SchM lock &amp; Anti-Recursion</td></tr>
                          <tr><td><strong>3. Runtm/Trans</strong></td><td><code>LogRuntimeErrorsToBuffer</code>, <code>LogTransientFaultsToBuffer</code>, <code>TransientFaultRecoveryPolicy</code>, <code>MaxTransientFaultRetries</code>, <code>EnableSideBySideDemComparison</code>, <code>SaveCrashCrumbToNoInitRam</code></td><td>Chính sách khôi phục Transient &amp; ranh giới DEM</td></tr>
                          <tr><td><strong>4. Hooks &amp; DLT</strong></td><td><code>DetForwardToDlt</code>, <code>DltAppIdAndContextId</code>, <code>DetErrorHook_0/1</code>, <code>DetRuntimeErrorCallout_0</code>, <code>DetTransientFaultCallout_0</code></td><td>Chuỗi Callout &amp; kênh log DLT</td></tr>
                          <tr><td><strong>5. Buffer/Filter</strong></td><td><code>DetErrorBufferSize</code>, <code>DetBufferOverflowMode</code>, <code>DetGlobalFilterEnabled/Rule</code>, <code>DetBreakpointFilterEnabled/Rule</code></td><td>Dung lượng RAM Ring Buffer &amp; lọc bão lỗi</td></tr>
                          <tr><td><strong>6. SWC RTE</strong></td><td><code>SwcBrake_DetPortEnabled/ModId/InstId</code>, <code>SwcDiag_DetPortEnabled/ModId</code>, <code>CustomInject4Tuple</code></td><td>Cấu hình RTE PDAV cho tầng Application</td></tr>
                        </tbody>
                      </table>
                    </div>"""
                }
            ]
        }
    ]


def main():
    out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "part6_handbook.js")
    hb_json = json.dumps(build_handbook_data(), ensure_ascii=False, indent=2)

    js_tail = r"""
// ==================== PART 6: MULTI-LEVEL HANDBOOK & ABBREVIATION SEARCH + BOOTSTRAP ====================

const HANDBOOK_DATA = """ + hb_json + r""";

let curHbTab1 = 0;
let curHbTab2 = 0;
let curAbbrCat = "ALL";

function selectHbTab1(idx) {
  curHbTab1 = idx;
  curHbTab2 = 0;
  for (let i = 0; i < 7; i++) {
    const b = document.getElementById("hbTab1_" + i);
    if (b) b.classList.toggle("active", i === idx);
  }
  const nav2 = document.getElementById("hbNav2");
  const abbrBox = document.getElementById("hbAbbrFilterBox");
  if (idx === 6) {
    nav2.style.display = "none";
    abbrBox.style.display = "flex";
    renderAbbreviationTable();
  } else {
    abbrBox.style.display = "none";
    nav2.style.display = "flex";
    const subs = HANDBOOK_DATA[idx].subs;
    nav2.innerHTML = subs.map((s, sIdx) =>
      `<button id="hbTab2_${sIdx}" type="button" class="hb-tab2 ${sIdx === 0 ? "active" : ""}" onclick="selectHbTab2(${sIdx})">${escapeHtml(s.title)}</button>`
    ).join("");
    selectHbTab2(0);
  }
}

function selectHbTab2(subIdx) {
  curHbTab2 = subIdx;
  const subs = HANDBOOK_DATA[curHbTab1] ? HANDBOOK_DATA[curHbTab1].subs : [];
  subs.forEach((_, idx) => {
    const b = document.getElementById("hbTab2_" + idx);
    if (b) b.classList.toggle("active", idx === subIdx);
  });
  const area = document.getElementById("hbContentArea");
  if (area && subs[subIdx]) {
    area.innerHTML = subs[subIdx].html;
  }
}

function renderCurrentHandbookView() {
  if (curHbTab1 === 6) renderAbbreviationTable();
  else selectHbTab2(curHbTab2);
}

function setAbbrCategory(cat) {
  curAbbrCat = cat;
  ["ALL", "CORE", "CALLER", "HOOK", "SAFETY"].forEach(c => {
    const btn = document.getElementById("abbrCat_" + c);
    if (btn) btn.classList.toggle("active", c === cat);
  });
  renderAbbreviationTable();
}

function highlightMatch(text, query) {
  const safe = escapeHtml(text);
  if (!query) return safe;
  const escapedQ = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp("(" + escapedQ + ")", "gi");
  return safe.replace(re, '<mark class="hl">$1</mark>');
}

function renderAbbreviationTable() {
  const q = (document.getElementById("abbrSearchInput").value || "").trim();
  const qLow = q.toLowerCase();
  const filtered = ABBREVIATIONS.filter(item => {
    const catOk = (curAbbrCat === "ALL") || (item.cat === curAbbrCat);
    if (!catOk) return false;
    if (!qLow) return true;
    return (
      item.abbr.toLowerCase().includes(qLow) ||
      item.full.toLowerCase().includes(qLow) ||
      item.cat.toLowerCase().includes(qLow) ||
      item.desc.toLowerCase().includes(qLow)
    );
  });

  document.getElementById("abbrCountBadge").textContent = `${filtered.length} / ${ABBREVIATIONS.length} thuật ngữ`;
  const area = document.getElementById("hbContentArea");

  if (filtered.length === 0) {
    area.innerHTML = `<div class="hb-callout warn">Không tìm thấy thuật ngữ nào khớp từ khóa <code>${escapeHtml(q)}</code> trong nhóm <strong>${escapeHtml(curAbbrCat)}</strong>.</div>`;
    return;
  }

  const rows = filtered.map(it => `
    <tr>
      <td><strong>${highlightMatch(it.abbr, q)}</strong></td>
      <td>${highlightMatch(it.full, q)}</td>
      <td><span class="card-tag">${escapeHtml(it.cat)}</span></td>
      <td>${highlightMatch(it.desc, q)}</td>
    </tr>
  `).join("");

  area.innerHTML = `
    <div class="hb-article">
      <h2>Bảng Tra Cứu Thuật Ngữ &amp; Từ Viết Tắt AUTOSAR Det</h2>
      <p class="hb-lead">Gồm ${ABBREVIATIONS.length} thuật ngữ cốt lõi phân nhóm CORE, CALLER, HOOK và SAFETY.</p>
      <table class="tbl">
        <thead>
          <tr>
            <th style="width:16%">Thuật ngữ</th>
            <th style="width:26%">Tên đầy đủ (English Term)</th>
            <th style="width:11%">Nhóm</th>
            <th>Giải thích kỹ thuật &amp; Vai trò trong Det</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

// ==================== APPLICATION BOOTSTRAP ====================
document.addEventListener("DOMContentLoaded", () => {
  populateScenarioSelect();
  initConfigTooltips();
  loadScenario(0);
  selectHbTab1(0);
  switchView("sim");
});
</script>
</body>
</html>
"""
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(js_tail.lstrip())
    print(f"Generated {out_path} ({os.path.getsize(out_path)} bytes)")


if __name__ == "__main__":
    main()
