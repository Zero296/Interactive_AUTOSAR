# -*- coding: utf-8 -*-
"""Generates part6_handbook.js for AUTOSAR Classic MemIf Simulator (6x4 Handbook + Tab 7 Abbreviation Search + DOM Bootstrap)."""
import json
from pathlib import Path
from hb_diagrams_memif import DIAGRAMS

ROOT = Path(__file__).resolve().parent


def build_handbook_data():
    return [
        {
            "id": 0,
            "title": "1. Kiến Trúc Memory Stack & MemIf",
            "subs": [
                {
                    "title": "1.1. Tổng Quan Kiến Trúc AUTOSAR Memory Stack",
                    "html": f"""
<div class="hb-card">
  <h3>1.1. Vị Trí Chiến Lược Của MemIf Trong AUTOSAR Classic Memory Stack (R20-11 &rarr; R23-11)</h3>
  <p><strong>MemIf (Memory Abstraction Interface — Module ID 22 / 0x0016, <code>SWS_MemIf</code>)</strong> nằm tại lớp <strong>ECU Abstraction Layer (04_ECU_Abstraction)</strong>, đóng vai trò chiếc cầu nối chuẩn hóa duy nhất giữa <strong>NvM (NVRAM Manager)</strong> ở tầng Services và nhiều module giả lập/trừu tượng bộ nhớ khác nhau bên dưới như <strong>Fee (Flash EEPROM Emulation)</strong> và <strong>Ea (EEPROM Abstraction)</strong>.</p>
  {DIAGRAMS["mem_stack_overview"]}
  <div class="hb-grid2">
    <div>
      <h4>Tại sao Stack phân tách làm 3 tầng (Services &rarr; ECU Abstraction &rarr; MCAL)?</h4>
      <ul>
        <li><strong>Services (<code>NvM</code>):</strong> Quản lý hàng đợi công việc (Standard/Immediate Queue), tính CRC16/CRC32, cơ chế <code>NATIVE / REDUNDANT / DATASET</code>, khôi phục ROM Default khi dữ liệu hỏng.</li>
        <li><strong>ECU Abstraction (<code>MemIf + Fee + Ea</code>):</strong> Tách rời logic của <code>NvM</code> khỏi công nghệ phần cứng. <code>MemIf</code> chọn đúng thiết bị theo <code>DeviceIndex</code>; <code>Fee</code> giả lập EEPROM trên Flash nội bộ (Virtual Pages + Wear-Leveling + GC); <code>Ea</code> ánh xạ địa chỉ cố định lên EEPROM ngoài.</li>
        <li><strong>MCAL (<code>Fls / Eep + Spi</code> hoặc R23-11 <code>MemAcc + Mem</code>):</strong> Điều khiển thanh ghi vật lý Flash Sector / giao tiếp SPI.</li>
      </ul>
    </div>
    <div>
      <h4>Điểm Khác Biệt Độc Đáo Của MemIf</h4>
      <ul>
        <li><strong>Không lưu dữ liệu người dùng:</strong> MemIf hoàn toàn stateless đối với payload, không giữ bộ đệm RAM dữ liệu và <strong>không có <code>MemIf_MainFunction()</code></strong>.</li>
        <li><strong>Không có Callback nội bộ:</strong> Đường gọi lệnh đi từ trên xuống qua <code>MemIf</code>, nhưng thông báo hoàn tất (<code>NvM_JobEndNotification</code> / <code>NvM_JobErrorNotification</code>) được <code>Fee/Ea</code> gọi <strong>trực tiếp</strong> lên <code>NvM</code> để giảm độ trễ!</li>
        <li><strong>Hai chế độ biên dịch linh hoạt:</strong> Macro trực tiếp (1 thiết bị) hoặc mảng con trỏ hàm hằng số (2+ thiết bị).</li>
      </ul>
    </div>
  </div>
</div>"""
                },
                {
                    "title": "1.2. Vai Trò Trừu Tượng Hóa Giữa NvM & Fee/Ea",
                    "html": f"""
<div class="hb-card">
  <h3>1.2. Tại Sao Cần Lớp Trừu Tượng Hóa MemIf Giữa NvM Và Fee/Ea?</h3>
  <p>Trong một ECU ô tô thực tế, dữ liệu bền vững thường phải phân bổ trên nhiều loại chip nhớ dựa theo chi phí, chu kỳ ghi và kích thước (ví dụ: Calibration &amp; Crash DTC lưu ở Data Flash nội bộ qua <code>Fee</code>; Odometer cập nhật từng km và khóa Immobilizer lưu trên EEPROM SPI ngoài qua <code>Ea</code>).</p>
  <table class="tbl">
    <thead><tr><th>Khía Cạnh</th><th>Nếu NvM gọi trực tiếp Fee / Ea (Không có MemIf)</th><th>Khi đi qua lớp MemIf (Chuẩn AUTOSAR)</th></tr></thead>
    <tbody>
      <tr><td><strong>Độc lập phần cứng (Portability)</strong></td><td>Mã nguồn <code>NvM</code> phải dùng hàng loạt <code>#ifdef USE_FEE / USE_EA</code> rẽ nhánh cứng.</td><td><code>NvM</code> chỉ biết 1 bộ API duy nhất: <code>MemIf_Read(DeviceIndex, BlockNumber, ...)</code>.</td></tr>
      <tr><td><strong>Khả năng mở rộng đa chip nhớ</strong></td><td>Thêm chip EEPROM ngoài hoặc Flash phụ buộc phải sửa core <code>NvM</code>.</td><td>Chỉ cần tăng <code>MemIfNumberOfDevices</code> và điền thêm phần tử vào bảng con trỏ hàm <code>MemIf_*FctPtr[]</code>.</td></tr>
      <tr><td><strong>Quản lý trạng tháiShutdown toàn ECU</strong></td><td><code>EcuM/NvM</code> phải nhớ riêng lẻ từng module <code>Fee_GetStatus()</code>, <code>Ea_GetStatus()</code>.</td><td>Gọi duy nhất <code>MemIf_GetStatus(MEMIF_BROADCAST_ID = 0xFF)</code> để hợp nhất toàn cục.</td></tr>
      <tr><td><strong>Chi phí khi ECU chỉ có 1 thiết bị</strong></td><td>Tốn công cấu hình riêng.</td><td><code>MemIfNumberOfDevices == 1</code> &rarr; <code>MemIf</code> tự tiêu biến thành Macro <code>#define</code> với <strong>0 byte overhead</strong>!</td></tr>
    </tbody>
  </table>
</div>"""
                },
                {
                    "title": "1.3. SWC Tương Tác MemIf & Ánh Xạ BlockNumber",
                    "html": """
<div class="hb-card">
  <h3>1.3. Cách SWC Tương Tác Gián Tiếp Với MemIf Qua NvM &amp; Công Thức Ánh Xạ BlockNumber</h3>
  <p><strong>Nguyên tắc kiến trúc AUTOSAR:</strong> Các Application Software Component (<code>SWC_App</code>) bị cấm tuyệt đối gọi trực tiếp vào BSW <code>MemIf</code>, <code>Fee</code> hay <code>Ea</code>. Mọi yêu cầu đọc/ghi phải đi qua <strong>RTE Service Port của NvM</strong>.</p>
  <pre class="code-block mono">/* 1. SWC chỉ biết NvM BlockId (cấu hình trong RTE Port-Defined Argument Value) */
Rte_Call_NvMService_Calib_WriteBlock(&amp;RamMirror_CalibData);
   |---> RTE truyền tiếp BlockId = 4 tới NvM_WriteBlock(4, &amp;RamMirror_CalibData)

/* 2. Bên trong NvM: Tra NvMBlockDescriptor để tìm thiết bị vật lý */
MemIf_DeviceIndexType devIdx = NvM_BlockCfg[4].NvMDeviceIndex;       /* = 0 (Fee) */
uint16 feeBaseBlkNum         = NvM_BlockCfg[4].NvMNvBlockBaseNumber; /* = 0x0001 */
uint8  dataSelBits           = 2U; /* NvMDataSelectionBits = 2 bit cho 4 bản sao */

/* 3. Công thức hợp nhất BlockNumber xuống MemIf (trước DatasetIndex = 0..3): */
uint16 memIfBlockNum = (feeBaseBlkNum &lt;&lt; dataSelBits) | datasetIndex; /* VD: (1 &lt;&lt; 2) | 0 = 0x0004 */

/* 4. NvM gọi MemIf chuẩn xác tới đúng thiết bị + Block con: */
MemIf_Write(devIdx /* 0 */, memIfBlockNum /* 0x0004 */, NvM_InternalBuffer);</pre>
  <table class="tbl">
    <thead><tr><th>BlockId (NvM)</th><th>Kiểu NvM Management</th><th>DeviceIndex</th><th>MemIf BlockNumber</th><th>Đích Lưu Vật Lý</th></tr></thead>
    <tbody>
      <tr><td class="mono">BlockId 4 (NvM_CalibData)</td><td><code>NVM_BLOCK_NATIVE</code></td><td class="mono">0 (Fee)</td><td class="mono">0x0004</td><td>DFlash Active Sector · VP 32B</td></tr>
      <tr><td class="mono">BlockId 8 (NvM_VinNumber)</td><td><code>NVM_BLOCK_REDUNDANT</code></td><td class="mono">0 (Fee)</td><td class="mono">0x0008 (Copy 1) &amp; 0x0009 (Copy 2)</td><td>Hai bản sao độc lập dự phòng mất nguồn</td></tr>
      <tr><td class="mono">BlockId 15 (Dem_CrashDTC)</td><td><code>NVM_BLOCK_NATIVE + IMM</code></td><td class="mono">0 (Fee)</td><td class="mono">0x000F</td><td>Vùng Immediate dự trữ trên DFlash</td></tr>
      <tr><td class="mono">BlockId 10 (NvM_Odometer)</td><td><code>NVM_BLOCK_NATIVE</code></td><td class="mono">1 (Ea)</td><td class="mono">0x0010</td><td>External SPI EEPROM @ Offset 0x0180</td></tr>
      <tr><td class="mono">BlockId 12 (NvM_ImmoKey)</td><td><code>NVM_BLOCK_NATIVE</code></td><td class="mono">1 (Ea)</td><td class="mono">0x0020</td><td>External SPI EEPROM @ Offset 0x0240</td></tr>
    </tbody>
  </table>
</div>"""
                },
                {
                    "title": "1.4. Bảng Phân Tích I/O 9 Module Memory Stack",
                    "html": f"""
<div class="hb-card">
  <h3>1.4. Luồng Input &rarr; Processing &rarr; Output Chi Tiết Của Toàn Bộ Memory Stack</h3>
  {DIAGRAMS["io_flow"]}
  <table class="tbl">
    <thead><tr><th>Module (Tầng)</th><th>Input Lấy Từ Đâu</th><th>Xử Lý Nội Bộ Chính</th><th>Output Route Đi Đâu (API Chuẩn)</th></tr></thead>
    <tbody>
      <tr><td><strong>SWC_App</strong><br>(Application)</td><td>RAM Mirror vận hành, kết quả callback từ RTE</td><td>Quyết định khi nào cần lưu NVRAM hoặc đánh dấu RAM bẩn</td><td><code>Rte_Call_NvMService_Read/WriteBlock()</code>, <code>NvM_SetRamBlockStatus()</code></td></tr>
      <tr><td><strong>EcuM / BswM</strong><br>(System Services)</td><td>Sự kiện StartupTwo / GoOffOne; JobMode từ NvM</td><td>Đảm bảo nạp toàn bộ tham số xe khi bật khóa và lưu khi tắt</td><td><code>NvM_ReadAll()</code>, <code>NvM_WriteAll()</code>, <code>BswM_NvM_CurrentJobMode()</code></td></tr>
      <tr><td><strong>RTE &amp; SchM</strong><br>(RTE Layer)</td><td>Port gọi từ SWC; OS Tick (5ms / 10ms)</td><td>Chèn Port-Defined BlockId; lập lịch <code>MainFunction</code> từ trên xuống</td><td><code>NvM_MainFunction()</code> &rarr; <code>Fee/Ea_MainFunction()</code> &rarr; <code>Fls/Eep_MainFunction()</code></td></tr>
      <tr><td><strong>NvM</strong><br>(Services)</td><td>BlockId từ SWC/DEM; Notification hoặc Polling</td><td>Quản lý hàng đợi ưu tiên, tính CRC, Redundant Recovery, ánh xạ DeviceIdx</td><td>Tất cả 8 API điều khiển xuống <code>MemIf_*()</code>; báo DEM <code>NVM_E_INTEGRITY_FAILED</code></td></tr>
      <tr><td><strong>MemIf</strong><br>(ECU Abstraction)</td><td><code>DeviceIndex, BlockNum, Offset, Ptr, Mode</code> từ NvM</td><td>Check DET; định tuyến Macro/FctPtr[]; hợp nhất <code>GetStatus(0xFF)</code> &amp; <code>SetMode()</code></td><td>Xuống <code>Fee_*()</code> (Dev0) / <code>Ea_*()</code> (Dev1); báo <code>Det_ReportError(22, ...)</code></td></tr>
      <tr><td><strong>Fee</strong> (Dev 0)<br>(ECU Abstraction)</td><td>BlockNumber từ MemIf; Status/Callback từ Fls</td><td>Quản lý Virtual Pages, Append-only Wear-Leveling, Garbage Collection (GC)</td><td><code>Fls_Read/Write/Erase/Cancel()</code>; callback thẳng lên <code>NvM_JobEnd/ErrorNotification()</code></td></tr>
      <tr><td><strong>Ea</strong> (Dev 1)<br>(ECU Abstraction)</td><td>BlockNumber từ MemIf; Status/Callback từ Eep</td><td>Tính cố định Physical EEPROM Offset + Header quản lý trạng thái Block</td><td><code>Eep_Read/Write/Erase/Cancel()</code>; callback thẳng lên <code>NvM_JobEnd/ErrorNotification()</code></td></tr>
      <tr><td><strong>Fls / Eep</strong><br>(hoặc MemAcc+Mem)</td><td>Địa chỉ vật lý &amp; <code>Mode (SLOW/FAST)</code></td><td>Ghi/Xóa từng chunk theo chu kỳ tick; truyền SPI (Eep) hoặc ECC (Fls)</td><td>Phần cứng DFlash / SPI EEPROM; <code>Fee/Ea_JobEndNotification()</code>; báo DEM HW fault</td></tr>
      <tr><td><strong>DET &amp; DEM</strong><br>(Diagnostics)</td><td><code>Det_ReportError(22, ...)</code>; HW/CRC failure events</td><td>Lưu vết lỗi dev tham số; lưu FreezeFrame &amp; Crash DTC ưu tiên</td><td>Log DET trace; <code>NvM_WriteBlock(ImmediateCrashBlock)</code></td></tr>
    </tbody>
  </table>
</div>"""
                }
            ]
        },
        {
            "id": 1,
            "title": "2. Macro vs Function Pointer",
            "subs": [
                {
                    "title": "2.1. Chế Độ 1 Device (Macro Zero Overhead)",
                    "html": f"""
<div class="hb-card">
  <h3>2.1. Chế Độ 1 Thiết Bị (<code>MemIfNumberOfDevices == 1</code>): Pre-Compile Macro Mapping</h3>
  <p>Theo yêu cầu chuẩn <strong><code>SWS_MemIf_00019</code></strong>: Khi hệ thống chỉ cấu hình duy nhất 1 thiết bị bộ nhớ bên dưới (thông thường là Data Flash với <code>Fee</code>), <code>MemIf</code> bắt buộc phải được biên dịch dưới dạng <strong>Macro mở rộng trực tiếp</strong> trong <code>MemIf_Cfg.h</code> thay vì sinh ra các hàm C hay mảng con trỏ hàm.</p>
  {DIAGRAMS["macro_vs_fctptr"]}
  <pre class="code-block mono">/* Trong file sinh tự động MemIf_Cfg.h khi MemIfNumberOfDevices == 1 */
#define MEMIF_NUMBER_OF_DEVICES   (1U)
#define MemIf_Read(DeviceIndex, BlockNumber, BlockOffset, DataBufferPtr, Length) \\
        Fee_Read((BlockNumber), (BlockOffset), (DataBufferPtr), (Length))
#define MemIf_Write(DeviceIndex, BlockNumber, DataBufferPtr) \\
        Fee_Write((BlockNumber), (DataBufferPtr))
#define MemIf_Cancel(DeviceIndex)              Fee_Cancel()
#define MemIf_GetStatus(DeviceIndex)           Fee_GetStatus()
#define MemIf_GetJobResult(DeviceIndex)        Fee_GetJobResult()
#define MemIf_InvalidateBlock(DeviceIndex, BlockNumber) \\
        Fee_InvalidateBlock((BlockNumber))
#define MemIf_EraseImmediateBlock(DeviceIndex, BlockNumber) \\
        Fee_EraseImmediateBlock((BlockNumber))
#define MemIf_SetMode(Mode)                    Fee_SetMode((Mode))</pre>
  <ul>
    <li><strong>Tham số <code>DeviceIndex</code> biến mất hoàn toàn:</strong> Bộ tiền xử lý C loại bỏ <code>DeviceIndex</code> ngay trước khi biên dịch sang mã máy, giúp tiết kiệm thanh ghi CPU và 0 bytes bảng tra cứu ROM.</li>
    <li><strong>Hệ quả DET:</strong> Nếu truyền <code>DeviceIndex = 99</code> ở chế độ Macro, lệnh vẫn nhảy thẳng xuống <code>Fee_Read()</code> mà <code>MemIf</code> không chặn (khác hoàn toàn với chế độ 2 Devices!). Thử nghiệm ngay điều này ở <strong>Kịch bản S3</strong>!</li>
  </ul>
</div>"""
                },
                {
                    "title": "2.2. Chế Độ Đa Thiết Bị (FctPtr Array)",
                    "html": """
<div class="hb-card">
  <h3>2.2. Chế Độ Đa Thiết Bị (<code>MemIfNumberOfDevices &gt;= 2</code>): Constant Function Pointer Array</h3>
  <p>Theo yêu cầu <strong><code>SWS_MemIf_00020</code></strong>: Khi có từ 2 thiết bị trừu tượng hóa trở lên (ví dụ: <code>DeviceIndex 0 = Fee</code> và <code>DeviceIndex 1 = Ea</code>), <code>MemIf</code> lưu các bảng mảng con trỏ hàm hằng số trong Flash Code (<code>ROM / .rodata</code>) được đánh chỉ mục trực tiếp bởi <code>DeviceIndex</code>.</p>
  <table class="tbl">
    <thead><tr><th>Đặc Tính So Sánh</th><th>1 Device (Macro Mode)</th><th>2+ Devices (Function Pointer Mode)</th></tr></thead>
    <tbody>
      <tr><td><strong>Chuẩn AUTOSAR</strong></td><td><code>SWS_MemIf_00019</code></td><td><code>SWS_MemIf_00020</code></td></tr>
      <tr><td><strong>File chính thực thi</strong></td><td>Chỉ <code>MemIf_Cfg.h</code> (Macro Inline)</td><td><code>MemIf.c</code> + <code>MemIf_Cfg.c</code> (Constant Pointer Tables)</td></tr>
      <tr><td><strong>Dung lượng ROM bảng bảng tra</strong></td><td><strong>0 bytes</strong></td><td>Khoảng <code>8 * 4 * N</code> bytes (64 bytes cho 2 thiết bị trên ARM Cortex-R/M)</td></tr>
      <tr><td><strong>Chi phí CPU khi gọi</strong></td><td>0 chu kỳ phụ (Direct Branch)</td><td>Kiểm tra ranh giới DET + Indirect Branch (<code>BLX Rn</code>)</td></tr>
      <tr><td><strong>Hành vi với <code>GetStatus(0xFF)</code></strong></td><td>Gọi thẳng <code>Fee_GetStatus()</code></td><td>Vòng lặp <code>for(i=0; i&lt;N; i++)</code> quét từng thiết bị và hợp nhất</td></tr>
    </tbody>
  </table>
</div>"""
                },
                {
                    "title": "2.3. Giải Phẫu Mã C: MemIf_Cfg.c & MemIf.c",
                    "html": """
<div class="hb-card">
  <h3>2.3. Mã Nguồn C Thực Tế Của MemIf_Cfg.c &amp; Thân Hàm Định Tuyến MemIf.c</h3>
  <pre class="code-block mono">/* ===== FILE: MemIf_Cfg.c (Sinh bởi Công cụ Cấu hình AUTOSAR) ===== */
const MemIf_ReadFctPtrType MemIf_ReadFctPtr[MEMIF_NUMBER_OF_DEVICES] = {
    &amp;Fee_Read,  /* DeviceIndex = 0 */
    &amp;Ea_Read    /* DeviceIndex = 1 */
};
const MemIf_WriteFctPtrType MemIf_WriteFctPtr[MEMIF_NUMBER_OF_DEVICES] = {
    &amp;Fee_Write, /* DeviceIndex = 0 */
    &amp;Ea_Write   /* DeviceIndex = 1 */
};
/* Tương tự cho Cancel, GetStatus, GetJobResult, InvalidateBlock, EraseImmediateBlock, SetMode */

/* ===== FILE: MemIf.c (Module Core Implementation) ===== */
Std_ReturnType MemIf_Read(uint8 DeviceIndex, uint16 BlockNumber, uint16 BlockOffset,
                          uint8* DataBufferPtr, uint16 Length)
{
#if (MEMIF_DEV_ERROR_DETECT == STD_ON)
    if (DeviceIndex &gt;= MEMIF_NUMBER_OF_DEVICES) {
        (void)Det_ReportError(MEMIF_MODULE_ID, 0U, MEMIF_SID_READ, MEMIF_E_PARAM_DEVICE);
        return E_NOT_OK;
    }
    if (DataBufferPtr == NULL_PTR) {
        (void)Det_ReportError(MEMIF_MODULE_ID, 0U, MEMIF_SID_READ, MEMIF_E_PARAM_POINTER);
        return E_NOT_OK;
    }
#endif
    return MemIf_ReadFctPtr[DeviceIndex](BlockNumber, BlockOffset, DataBufferPtr, Length);
}</pre>
</div>"""
                },
                {
                    "title": "2.4. Hàng Rào DET Bảo Vệ Con Trỏ Hàm",
                    "html": """
<div class="hb-card">
  <h3>2.4. Cơ Chế Kiểm Tra Hàng Rào DET Trong Chế Độ Đa Thiết Bị</h3>
  <p>Trong ngôn ngữ C nhúng, việc truy cập mảng con trỏ hàm <code>MemIf_ReadFctPtr[DeviceIndex]</code> mà không kiểm tra chỉ số biên là <strong>cực kỳ nguy hiểm</strong> vì có thể đọc trúng giá trị rác ngoài vùng Flash bảng hàm và nhảy PC (Program Counter) gây ngoại lệ <strong>HardFault / BusFault</strong>.</p>
  <div class="hb-grid2">
    <div>
      <h4>Khi <code>MemIfDevErrorDetect == TRUE</code></h4>
      <ul>
        <li>Bắt buộc kiểm tra <code>DeviceIndex &lt; MEMIF_NUMBER_OF_DEVICES</code> cho mọi API đơn thiết bị (Read, Write, Cancel, GetJobResult, Invalidate, EraseImm).</li>
        <li>Riêng <code>MemIf_GetStatus(DeviceIndex)</code> cho phép ngoại lệ <code>DeviceIndex == MEMIF_BROADCAST_ID (0xFF)</code>.</li>
        <li>Kiểm tra con trỏ <code>NULL_PTR</code> ở <code>MemIf_Read</code>, <code>MemIf_Write</code>, và <code>MemIf_GetVersionInfo</code>.</li>
      </ul>
    </div>
    <div>
      <h4>Khi tắt DET trên Production Release</h4>
      <ul>
        <li>Các lệnh <code>if (DeviceIndex &gt;= ...)</code> được loại bỏ bởi <code>#if (MEMIF_DEV_ERROR_DETECT == STD_ON)</code>.</li>
        <li>Chỉ an toàn khi toàn bộ cặp <code>(DeviceIndex, BlockNumber)</code> của <code>NvM</code> đã được công cụ sinh cấu hình (DaVinci / EB tresos) kiểm chứng tĩnh lúc biên dịch (Design-time validation).</li>
      </ul>
    </div>
  </div>
</div>"""
                }
            ]
        },
        {
            "id": 2,
            "title": "3. 9 APIs & Broadcast (0xFF)",
            "subs": [
                {
                    "title": "3.1. Nhóm API Dữ Liệu (Read, Write, Inval, EraseImm)",
                    "html": """
<div class="hb-card">
  <h3>3.1. Giải Phẫu 4 API Thao Tác Dữ Liệu Bất Đồng Bộ Trong MemIf</h3>
  <table class="tbl">
    <thead><tr><th>Tên API &amp; Prototype Chuẩn R23-11</th><th>ServiceId</th><th>Giá Trị Trả Về Đồng Bộ</th><th>Chức Năng &amp; Lưu Ý Sử Dụng</th></tr></thead>
    <tbody>
      <tr>
        <td class="mono">MemIf_Read(DeviceIndex, BlockNumber, BlockOffset, DataBufferPtr, Length)</td>
        <td class="mono">0x02</td>
        <td class="mono">E_OK / E_NOT_OK</td>
        <td>Đọc toàn bộ hoặc một phần (<code>Offset + Length</code>) của Block vào buffer RAM. Kết quả đọc (OK/INCONSISTENT/INVALID) được trả sau qua Callback hoặc <code>GetJobResult()</code>.</td>
      </tr>
      <tr>
        <td class="mono">MemIf_Write(DeviceIndex, BlockNumber, DataBufferPtr)</td>
        <td class="mono">0x03</td>
        <td class="mono">E_OK / E_NOT_OK</td>
        <td>Ghi toàn bộ nội dung Block xuống bộ nhớ. Tham số <code>DataBufferPtr</code> phải giữ nguyên nội dung hợp lệ suốt thời gian <code>MEMIF_BUSY</code> (do bất đồng bộ!).</td>
      </tr>
      <tr>
        <td class="mono">MemIf_InvalidateBlock(DeviceIndex, BlockNumber)</td>
        <td class="mono">0x07</td>
        <td class="mono">E_OK / E_NOT_OK</td>
        <td>Đánh dấu Block đã bị hủy hiệu lực (xóa logic / Reset config) mà không cần tẩy xóa Flash Sector. Đọc lại kế tiếp sẽ trả về <code>MEMIF_BLOCK_INVALID (0x05)</code>.</td>
      </tr>
      <tr>
        <td class="mono">MemIf_EraseImmediateBlock(DeviceIndex, BlockNumber)</td>
        <td class="mono">0x09</td>
        <td class="mono">E_OK / E_NOT_OK</td>
        <td>Xóa trước vùng dự phòng cho Block có cờ <code>FeeImmediateData = TRUE</code> (như Airbag Crash DTC) để đảm bảo ghi tức thời không bị delay xóa Flash.</td>
      </tr>
    </tbody>
  </table>
</div>"""
                },
                {
                    "title": "3.2. Nhóm API Điều Khiển (SetMode, Cancel, VersionInfo)",
                    "html": """
<div class="hb-card">
  <h3>3.2. Nhóm API Điều Khiển Chế Độ, Hủy Lệnh &amp; Phiên Bản (5 API Còn Lại)</h3>
  <table class="tbl">
    <thead><tr><th>Tên API Chuẩn AUTOSAR</th><th>ServiceId</th><th>Hỗ Trợ 0xFF?</th><th>Đặc Điểm &amp; Hành Vi Định Tuyến</th></tr></thead>
    <tbody>
      <tr>
        <td class="mono">MemIf_SetMode(MemIf_ModeType Mode)</td>
        <td class="mono">0x01</td>
        <td>Tự quảng bá (No DevIdx!)</td>
        <td><strong>API duy nhất không có tham số DeviceIndex</strong> (<code>SWS_MemIf_00038</code>). Tự lặp gọi <code>Fee_SetMode(Mode)</code> và <code>Ea_SetMode(Mode)</code> để chuyển tốc độ <code>SLOW &harr; FAST</code>.</td>
      </tr>
      <tr>
        <td class="mono">MemIf_Cancel(uint8 DeviceIndex)</td>
        <td class="mono">0x04</td>
        <td>Không (DET 0x01)</td>
        <td>Hủy ngay lập tức tác vụ đang chạy trên một thiết bị (đưa về <code>MEMIF_IDLE</code> và <code>MEMIF_JOB_CANCELED</code>) để nhường Flash/SPI cho <code>Immediate Block</code>.</td>
      </tr>
      <tr>
        <td class="mono">MemIf_GetStatus(uint8 DeviceIndex)</td>
        <td class="mono">0x05</td>
        <td><strong>CÓ (SWS 00035..37)</strong></td>
        <td>Trả trạng thái thiết bị đơn lẻ hoặc trạng thái hợp nhất toàn stack khi truyền <code>MEMIF_BROADCAST_ID (0xFF)</code>.</td>
      </tr>
      <tr>
        <td class="mono">MemIf_GetJobResult(uint8 DeviceIndex)</td>
        <td class="mono">0x06</td>
        <td><strong>KHÔNG! (DET 0x01)</strong></td>
        <td>Chỉ truy vấn được trên từng thiết bị cụ thể (<code>0..N-1</code>). Truyền <code>0xFF</code> vào đây bị bắt lỗi DET <code>MEMIF_E_PARAM_DEVICE</code>!</td>
      </tr>
      <tr>
        <td class="mono">MemIf_GetVersionInfo(Std_VersionInfoType* Ptr)</td>
        <td class="mono">0x08</td>
        <td>N/A</td>
        <td>Biên dịch điều kiện theo <code>MemIfVersionInfoApi</code>; điền <code>moduleID = 22 (0x0016)</code>. Bắt <code>MEMIF_E_PARAM_POINTER</code> nếu <code>Ptr == NULL_PTR</code>.</td>
      </tr>
    </tbody>
  </table>
</div>"""
                },
                {
                    "title": "3.3. Quy Tắc Hợp Nhất MEMIF_BROADCAST_ID (0xFF)",
                    "html": f"""
<div class="hb-card">
  <h3>3.3. Quy Tắc Hợp Nhất Trạng Thái MemIf_GetStatus(MEMIF_BROADCAST_ID = 0xFF)</h3>
  <p>Khi gọi <code>MemIf_GetStatus(0xFF)</code>, <code>MemIf</code> không trả về mảng trạng thái từng driver mà phải tổng hợp thành một giá trị <code>MemIf_StatusType</code> duy nhất tuân theo bảng ưu tiên nghiêm ngặt của <strong><code>SWS_MemIf_00035</code> &rarr; <code>00037</code></strong>:</p>
  {DIAGRAMS["broadcast_priority"]}
  <table class="tbl">
    <thead><tr><th>Dev 0 (Fee)</th><th>Dev 1 (Ea)</th><th>Kết Quả <code>MemIf_GetStatus(0xFF)</code></th><th>Lý Do &amp; Quy Chuẩn SWS</th></tr></thead>
    <tbody>
      <tr><td><code>MEMIF_UNINIT</code></td><td>Bất kỳ (kể cả IDLE/BUSY)</td><td><strong><code>MEMIF_UNINIT (0x00)</code></strong></td><td><code>SWS_MemIf_00035</code>: Ưu tiên số 1 — Chưa thể kết luận hệ thống sẵn sàng.</td></tr>
      <tr><td><code>MEMIF_BUSY_INTERNAL</code></td><td><code>MEMIF_UNINIT</code></td><td><strong><code>MEMIF_UNINIT (0x00)</code></strong></td><td><code>SWS_MemIf_00035</code>: Bất kỳ 1 thiết bị chưa Init thì toàn Stack là UNINIT.</td></tr>
      <tr><td><code>MEMIF_BUSY</code></td><td><code>MEMIF_BUSY_INTERNAL</code></td><td><strong><code>MEMIF_BUSY (0x02)</code></strong></td><td><code>SWS_MemIf_00036</code>: Yêu cầu từ tầng trên (<code>BUSY</code>) thắng tác vụ ngầm (<code>BUSY_INTERNAL</code>).</td></tr>
      <tr><td><code>MEMIF_IDLE</code></td><td><code>MEMIF_BUSY</code></td><td><strong><code>MEMIF_BUSY (0x02)</code></strong></td><td><code>SWS_MemIf_00036</code>: Có ít nhất 1 thiết bị đang bận phục vụ NvM.</td></tr>
      <tr><td><code>MEMIF_BUSY_INTERNAL</code></td><td><code>MEMIF_IDLE</code></td><td><strong><code>MEMIF_BUSY_INTERNAL (0x03)</code></strong></td><td><code>SWS_MemIf_00037</code>: Fee đang Garbage Collection, EcuM Shutdown phải đợi!</td></tr>
      <tr><td><code>MEMIF_IDLE</code></td><td><code>MEMIF_IDLE</code></td><td><strong><code>MEMIF_IDLE (0x01)</code></strong></td><td>Tất cả đều rảnh hoàn toàn &rarr; An toàn tắt nguồn ECU.</td></tr>
    </tbody>
  </table>
</div>"""
                },
                {
                    "title": "3.4. Giải Mã 6 Giá Trị MemIf_JobResultType",
                    "html": """
<div class="hb-card">
  <h3>3.4. Phân Biệt Chi Tiết 6 Mã Kết Quả Công Việc (<code>MemIf_JobResultType</code> — <code>SWS_MemIf_00065</code>)</h3>
  <table class="tbl">
    <thead><tr><th>Tên Enum AUTOSAR</th><th>3-Bit Hiểu Thị (Reg B)</th><th>Khi Nào Xảy Ra &amp; Cách Tầng NvM Xử Lý</th></tr></thead>
    <tbody>
      <tr><td class="mono">MEMIF_JOB_OK</td><td class="mono">000b</td><td>Lệnh đọc/ghi/xóa/invalidate kết thúc trọn vẹn, kiểm tra Header/CRC/ECC toàn vẹn.</td></tr>
      <tr><td class="mono">MEMIF_JOB_PENDING</td><td class="mono">001b</td><td>Công việc đang diễn ra bất đồng bộ dưới <code>Fee/Fls</code> hoặc <code>Ea/Eep</code>.</td></tr>
      <tr><td class="mono">MEMIF_JOB_CANCELED</td><td class="mono">010b</td><td>Bị hủy chủ động bằng <code>MemIf_Cancel(DevIdx)</code>. NvM sẽ tự xếp hàng chạy lại job sau khi xong Immediate Job.</td></tr>
      <tr><td class="mono">MEMIF_JOB_FAILED</td><td class="mono">011b</td><td>Lỗi phần cứng thực sự (Flash Write Verify Fail, Timeout/Lỗi Bus SPI EEPROM). Thường đi kèm báo cáo DEM fault.</td></tr>
      <tr><td class="mono">MEMIF_BLOCK_INCONSISTENT</td><td class="mono">100b</td><td><strong>Rách trang / Flash trắng chưa từng ghi (Blank):</strong> Trailer mất do sập nguồn giữa chừng. NvM thử đọc Redundant Copy 2 trước khi nạp ROM Default!</td></tr>
      <tr><td class="mono">MEMIF_BLOCK_INVALID</td><td class="mono">101b</td><td><strong>Vô hiệu hóa chủ động:</strong> Từng gọi <code>MemIf_InvalidateBlock()</code> trước đó. Dữ liệu vẫn lành lặn nhưng logic đã bị đánh dấu hủy; NvM nạp thẳng ROM Default mà không coi là lỗi phần cứng!</td></tr>
    </tbody>
  </table>
</div>"""
                }
            ]
        },
        {
            "id": 3,
            "title": "4. Fee (GC) vs Ea & MemAcc R23-11",
            "subs": [
                {
                    "title": "4.1. Đặc Tính Vật Lý DFlash vs EEPROM",
                    "html": f"""
<div class="hb-card">
  <h3>4.1. Tại Sao Data Flash Cần Lớp Phức Tạp Fee Trong Khi EEPROM Chỉ Cần Ea Gọn Nhẹ?</h3>
  {DIAGRAMS["fee_vs_ea_layout"]}
  <table class="tbl">
    <thead><tr><th>Tiêu Chí Kỹ Thuật</th><th>Dev 0: Fee + Fls (Internal Data Flash)</th><th>Dev 1: Ea + Eep/Spi (External EEPROM)</th></tr></thead>
    <tbody>
      <tr><td><strong>Khả năng ghi đè tại chỗ (Overwrite)</strong></td><td><strong>KHÔNG</strong> — Phải xóa cả Sector (VD: 8KB/64KB) về <code>0xFF</code> mới ghi lại được bit <code>0</code>.</td><td><strong>CÓ</strong> — Ghi đè từng byte/trang trực tiếp mà không cần xóa trước cả khối.</td></tr>
      <tr><td><strong>Độ bền số lần ghi (Endurance)</strong></td><td>Giới hạn ~10k – 100k lần Erase/Sector &rarr; Cần <code>Fee</code> làm Wear-Leveling.</td><td>Rất cao (~1 triệu chu kỳ ghi từng byte).</td></tr>
      <tr><td><strong>Thuật toán quản lý địa chỉ</strong></td><td><strong>Append-Only Virtual Page:</strong> Ghi mỗi phiên bản mới vào trang trống kế tiếp, bản cũ thành <code>SUPERSEDED</code>.</td><td><strong>Fixed Offset Mapping:</strong> Block luôn nằm cố định tại 1 Offset EEPROM (VD: <code>0x0180</code>).</td></tr>
      <tr><td><strong>Garbage Collection (GC)</strong></td><td><strong>BẮT BUỘC</strong> khi Active Sector đầy &ge; 90% &rarr; Trạng thái <code>MEMIF_BUSY_INTERNAL</code>.</td><td><strong>KHÔNG CẦN</strong> &rarr; Không có hiện tượng GC bất ngờ.</td></tr>
    </tbody>
  </table>
</div>"""
                },
                {
                    "title": "4.2. Cơ Chế Virtual Page & Garbage Collection",
                    "html": f"""
<div class="hb-card">
  <h3>4.2. Cơ Chế Virtual Page Alignment &amp; Chu Trình Garbage Collection (Sector Switch)</h3>
  <p>Mỗi bản ghi Block trong <code>Fee</code> được căn chỉnh theo bội số của <strong><code>FeeVirtualPageSize</code></strong> (thường là 8 bytes hoặc 16 bytes — đúng bằng độ rộng câu lệnh lập trình Flash + ECC của vi điều khiển như TriCore AURIX PFLASH/DFLASH hay S32K).</p>
  {DIAGRAMS["fee_garbage_collection"]}
  <ul>
    <li><strong>Giai đoạn ghi bình thường (Append-Only):</strong> Mỗi lần gọi <code>MemIf_Write(0, Blk, Ptr)</code>, <code>Fee</code> tìm trang <code>FREE</code> tiếp theo trong Active Sector, ghi Start Marker + Payload + End Marker (Trailer) rồi mới đánh dấu bản cũ là <code>SUPERSEDED</code>. Nhờ có 2 đầu Header/Trailer, nếu mất điện giữa chừng thì bản cũ vẫn còn nguyên vẹn (Power-Loss Resilience!).</li>
    <li><strong>Giai đoạn Sector Switch (Garbage Collection):</strong> Khi Active Sector đầy (&ge; 90%), <code>Fee</code> chuyển sang <code>MEMIF_BUSY_INTERNAL</code>, quét ngược để chỉ copy những bản ghi <code>VALID</code> mới nhất sang Sector dự phòng, đổi Active Sector rồi gọi <code>Fls_Erase()</code> làm sạch toàn bộ Sector cũ!</li>
  </ul>
</div>"""
                },
                {
                    "title": "4.3. Quản Lý Immediate Block (Crash DTC)",
                    "html": """
<div class="hb-card">
  <h3>4.3. Immediate Block (<code>FeeImmediateData = TRUE</code>) &amp; <code>MemIf_EraseImmediateBlock()</code></h3>
  <p>Trong các ECU túi khí (Airbag ACU) hoặc điều khiển phanh ABS/ESP, khi xảy ra va chạm nguồn ắc quy có thể đứt trong vòng 5–15 mili-giây. Nếu dữ liệu va chạm (Crash DTC / Event Data Recorder) ghi theo luồng thông thường mà lúc đó <code>Fee</code> đang chạy Garbage Collection hoặc hết chỗ chờ xóa Sector, dữ liệu tai nạn sẽ mất vĩnh viễn.</p>
  <ol>
    <li><strong>Dự trữ không gian (Pre-reservation):</strong> Khi cấu hình <code>FeeImmediateData = TRUE</code>, công cụ cấu hình trừ sẵn dung lượng Block khẩn cấp + dự phòng trên mỗi Sector của DFlash (không bao giờ để các Block thường lấn chiếm hết).</li>
    <li><strong>Xóa trước khi chạy xe (<code>MemIf_EraseImmediateBlock</code>):</strong> Có thể gọi trước để vùng Flash dự phòng chắc chắn ở trạng thái erased sẵn sàng.</li>
    <li><strong>Quyền ngắt ngang Garbage Collection (Preemption):</strong> Khi nhận <code>MemIf_Write(0, 0x000F, CrashPtr)</code>, <code>Fee</code> tạm dừng ngay quá trình GC (hoặc dùng <code>MemIf_Cancel</code> cắt lệnh thường đang ghi dở) để lập trình Block khẩn cấp ngay lập tức!</li>
  </ol>
</div>"""
                },
                {
                    "title": "4.4. Tiến Hóa R21-11 / R22-11 / R23-11: MemAcc + Mem",
                    "html": f"""
<div class="hb-card">
  <h3>4.4. Kiến Trúc Memory Stack Thế Hệ Mới: <code>MemAcc</code> &amp; <code>Mem</code> (AUTOSAR R22-11 / R23-11)</h3>
  {DIAGRAMS["memacc_r23_11"]}
  <table class="tbl">
    <thead><tr><th>Khía Cạnh Kiến Trúc</th><th>Truyền Thống (R4.x / R20-11)</th><th>Thế Hệ Mới (R22-11 / R23-11)</th></tr></thead>
    <tbody>
      <tr><td><strong>Vị trí của MemIf</strong></td><td>Giữa <code>NvM</code> và <code>Fee/Ea</code> (9 APIs chuẩn)</td><td><strong>GIỮ NGUYÊN 100%</strong> — Đảm bảo tương thích ngược toàn bộ lớp <code>NvM</code> &amp; <code>SWC</code>!</td></tr>
      <tr><td><strong>Lớp bên dưới Fee / Ea</strong></td><td><code>Fls</code> Driver &amp; <code>Eep + Spi</code> Driver</td><td><strong><code>MemAcc</code> (Memory Access)</strong> + <strong><code>Mem</code> (Unified Memory Driver)</strong></td></tr>
      <tr><td><strong>Bài toán giải quyết</strong></td><td>Khó đồng bộ nếu Bootloader/FOTA A/B Swap truy cập Flash cùng lúc với Fee.</td><td><code>MemAcc</code> khóa/điều phối truy cập đa nguồn (AddressArea) từ cả Fee, FOTA &amp; HSM đa nhân.</td></tr>
    </tbody>
  </table>
  <p style="margin-top:6px"><em>Mẹo thử nghiệm:</em> Vào Tab cấu hình <strong>6. Fault/R23</strong> và bật checkbox <strong><code>EnableR2311MemAccLayer</code></strong>, hoặc chạy <strong>Kịch bản S11</strong> để thấy kiến trúc SVG và Call Trace chuyển đổi sang tầng <code>MemAcc + Mem</code>!</p>
</div>"""
                }
            ]
        },
        {
            "id": 4,
            "title": "5. Bất Đồng Bộ: Callback vs Polling",
            "subs": [
                {
                    "title": "5.1. Tại Sao MemIf Không Có Hàm Callback?",
                    "html": f"""
<div class="hb-card">
  <h3>5.1. Thiết Kế Bất Đối Xứng: Tại Sao Trong <code>SWS_MemIf</code> Không Có <code>MemIf_JobEndNotification()</code>?</h3>
  {DIAGRAMS["async_cbk_vs_polling"]}
  <p>Đây là một trong những câu hỏi phỏng vấn AUTOSAR phổ biến nhất! Câu trả lời nằm ở mô hình <strong>Single Upper Consumer (Chỉ có 1 tầng trên duy nhất)</strong>:</p>
  <ul>
    <li>Một ECU có thể có nhiều module bộ nhớ bên dưới (<code>Fee</code>, <code>Ea</code>, Flash ngoài...), nên cần <code>MemIf</code> ở đường đi xuống để rẽ nhánh theo <code>DeviceIndex</code>.</li>
    <li>Ngược lại, ở phía trên <code>MemIf</code> chỉ có <strong>duy nhất 1 ông chủ là <code>NvM</code></strong>. Do đó, mọi module <code>Fee</code> và <code>Ea</code> đều cấu hình trực tiếp tham số <code>FeeNvmJobEndNotification = &amp;NvM_JobEndNotification</code> và <code>EaNvmJobErrorNotification = &amp;NvM_JobErrorNotification</code>.</li>
    <li>Việc gọi thẳng từ <code>Fee/Ea</code> lên <code>NvM</code> (nhìn mũi tên nét đứt màu cam trong Panel 3) vừa loại bỏ hoàn toàn độ trễ qua lớp trung gian, vừa giúp <code>MemIf</code> không cần lưu bảng ngược con trỏ callback!</li>
  </ul>
</div>"""
                },
                {
                    "title": "5.2. Đối Chiếu Callback Mode vs Polling Mode",
                    "html": """
<div class="hb-card">
  <h3>5.2. So Sánh Cơ Chế Callback (Ngắt/Notify) vs Polling Thăm Dò Định Kỳ</h3>
  <table class="tbl">
    <thead><tr><th>Thuộc Tính</th><th>Callback Mode (<code>NvMPollingMode = FALSE</code>)</th><th>Polling Mode (<code>NvMPollingMode = TRUE</code>)</th></tr></thead>
    <tbody>
      <tr><td><strong>Độ trễ phản hồi hoàn tất</strong></td><td>Tức thời ngay trong nhịp kết thúc của <code>Fee/Ea_MainFunction()</code>.</td><td>Trễ thêm từ 1 đến 2 chu kỳ OS Task của <code>NvM_MainFunction()</code>.</td></tr>
      <tr><td><strong>Lưu lượng gọi qua MemIf</strong></td><td><code>MemIf</code> không được gọi lại sau khi phát lệnh xuống dưới.</td><td>Mỗi tick, <code>NvM</code> gọi <code>MemIf_GetStatus(dev)</code>; khi rảnh gọi <code>MemIf_GetJobResult(dev)</code>.</td></tr>
      <tr><td><strong>Lưu ý lịch trình Task (SchM)</strong></td><td>Hàm <code>NvM_JobEndNotification()</code> chạy trong ngữ cảnh của Task gọi Fee/Ea! Cần bảo vệ dữ liệu nếu khác OS Task.</td><td>An toàn tuyệt đối về đồng bộ luồng (Concurrency) vì mọi xử lý chỉ diễn ra trong <code>NvM_MainFunction()</code>.</td></tr>
    </tbody>
  </table>
  <p style="margin-top:6px">Thử chuyển đổi tức thời ở <strong>Thanh B (Bit 3 NVM_CBK)</strong> hoặc <strong>Kịch bản S9</strong> để quan sát mũi tên SVG chuyển hướng!</p>
</div>"""
                },
                {
                    "title": "5.3. Chu Trình NvM_ReadAll() & NvM_WriteAll()",
                    "html": """
<div class="hb-card">
  <h3>5.3. Phối Hợp Đa Tầng Trong Chu Trình Startup (<code>ReadAll</code>) &amp; Shutdown (<code>WriteAll</code>)</h3>
  <ol>
    <li><strong><code>NvM_SetMode</code> khởi động tốc độ cao:</strong> Khi <code>EcuM_StartupTwo</code> gọi <code>NvM_ReadAll()</code>, bước đầu tiên <code>NvM</code> gọi <strong><code>MemIf_SetMode(MEMIF_MODE_FAST)</code></strong> để quảng bá đồng thời sang cả <code>Fee</code> và <code>Ea</code> nâng lượng byte truyền mỗi tick (VD: từ 8B/tick lên 32B/tick).</li>
    <li><strong>Đọc/Ghi liên hoàn qua mọi thiết bị:</strong> <code>NvM</code> duyệt lần lượt danh sách Block ID đã bật cờ SelectForReadAll/WriteAll, định tuyến qua <code>MemIf_Read(0, ...)</code> cho khối Flash và <code>MemIf_Read(1, ...)</code> cho khối EEPROM.</li>
    <li><strong>Trở về chế độ tiết kiệm CPU:</strong> Sau khi hoàn tất toàn bộ danh sách, <code>NvM</code> gọi <strong><code>MemIf_SetMode(MEMIF_MODE_SLOW)</code></strong> trước khi báo <code>BswM_NvM_CurrentJobMode()</code> và cho phép hệ thống ứng dụng vận hành bình thường.</li>
    <li><strong>Thứ tự lập lịch <code>SchM</code> tối ưu:</strong> Nên gọi theo thứ tự từ trên xuống dưới (<code>NvM_MainFunction()</code> &rarr; <code>Fee/Ea_MainFunction()</code> &rarr; <code>Fls/Eep_MainFunction()</code>) để lệnh vừa phát ra ở <code>NvM</code> được đẩy xuống phần cứng ngay trong cùng chu kỳ 5ms!</li>
  </ol>
</div>"""
                },
                {
                    "title": "5.4. Chiến Lược Tự Phục Hồi NvM Redundant Block",
                    "html": f"""
<div class="hb-card">
  <h3>5.4. Tự Động Cứu Dữ Liệu Với <code>NVM_BLOCK_REDUNDANT</code> Khi Gặp <code>MEMIF_BLOCK_INCONSISTENT</code></h3>
  {DIAGRAMS["redundant_recovery"]}
  <p>Khi một block dữ liệu tối quan trọng (số khung VIN, số km Odometer, dữ liệu hiệu chỉnh an toàn) đang ghi mà mất nguồn, trang Flash ghi dở chỉ có Header nhưng mất Trailer (hoặc CRC sai lệch). Lúc khởi động lại:</p>
  <ul>
    <li><code>Fee</code> đọc Copy 1 (<code>0x0008</code>) và phát hiện hỏng &rarr; trả về <strong><code>MEMIF_BLOCK_INCONSISTENT (0x04)</code></strong>.</li>
    <li><code>NvM</code> nhận biết Block được cấu hình kiểu <code>NVM_BLOCK_REDUNDANT</code> nên không vội nạp giá trị mặc định ROM hay báo lỗi hỏng toàn bộ, mà âm thầm gọi <strong><code>MemIf_Read(0, 0x0009, ...)</code></strong> sang bản sao dự phòng Copy 2!</li>
    <li>Nếu Copy 2 trả <code>MEMIF_JOB_OK</code>, xe khôi phục 100% dữ liệu thực tế và sửa lại bản sao bị lỗi ở lần ghi kế tiếp. Kiểm chứng trực tiếp tại <strong>Kịch bản S10</strong>!</li>
  </ul>
</div>"""
                }
            ]
        },
        {
            "id": 5,
            "title": "6. ECUC, Lỗi DET/DEM & Thực Chiến",
            "subs": [
                {
                    "title": "6.1. Từ Điển 36 Tham Số Cấu Hình ECUC",
                    "html": """
<div class="hb-card">
  <h3>6.1. Bảng Tra Cứu Đầy Đủ Tham Số Cấu Hình ECUC Trên Giao Diện (Di Chuột &gt;1s Hoặc Click ⓘ Để Xem SWS)</h3>
  <table class="tbl">
    <thead><tr><th>Nhóm Tab Config</th><th>Tên Tham Số Chuẩn</th><th>Chuẩn AUTOSAR</th><th>Ý Nghĩa Thực Tiễn</th></tr></thead>
    <tbody>
      <tr><td><strong>1. General</strong></td><td class="mono">MemIfNumberOfDevices, MemIfDevErrorDetect, MemIfVersionInfoApi, ActiveMemIfMode</td><td><code>ECUC_MemIf_00032..35</code></td><td>Quyết định biên dịch Macro (1) vs FctPtr (N), kiểm soát rào DET và tốc độ SLOW/FAST.</td></tr>
      <tr><td><strong>2. Routing</strong></td><td class="mono">SelectedDeviceIndex, SelectedLogicalBlock, MemIfReadBlockOffset, MemIfReadLength</td><td><code>SWS_MemIf_00039..40</code></td><td>Chọn đích phần cứng (0=Fee, 1=Ea), tọa độ đọc từng phần Block và giả lập <code>NULL_PTR</code>.</td></tr>
      <tr><td><strong>3. Fee (Dev0)</strong></td><td class="mono">FeeDevErrorDetect, FeePollingMode, FeeSetModeSupported, FeeVirtualPageSize, FeeImmediateData, FeeActiveSectorUsagePct</td><td><code>ECUC_Fee_00105..150</code></td><td>Căn lề trang ảo Flash, cờ Immediate Block khẩn cấp và ngưỡng kích hoạt Garbage Collection (&ge;90%).</td></tr>
      <tr><td><strong>4. Ea (Dev1)</strong></td><td class="mono">EaDevErrorDetect, EaPollingMode, EaSetModeSupported, EaVirtualPageSize, FlsEepBytesPerCycleSlow/Fast</td><td><code>ECUC_Ea_*</code></td><td>Cấu hình trừu tượng EEPROM ngoài qua SPI và thông lượng byte mỗi nhịp tick SLOW/FAST.</td></tr>
      <tr><td><strong>5. NvM / Cbk</strong></td><td class="mono">NvMPollingMode, NvMSetRamBlockStatusApi, NvMDynamicConfiguration, NvMBlockManagementType, NvMDataSelectionBits</td><td><code>ECUC_NvM_*</code></td><td>Điều khiển nhánh Polling vs Callback, loại Block (Native/Redundant/Dataset) &amp; báo trạng thái BswM.</td></tr>
      <tr><td><strong>6. Fault / R23</strong></td><td class="mono">InjectBlockInconsistent, InjectBlockInvalid, InjectHardwareWriteEraseFail, ForceFeeGarbageCollection, EnableR2311MemAccLayer</td><td><code>R22-11 / R23-11 MemAcc</code></td><td>Bơm các tình huống rách trang, lỗi HW, cưỡng bức GC và trải nghiệm kiến trúc <code>MemAcc + Mem</code>.</td></tr>
    </tbody>
  </table>
</div>"""
                },
                {
                    "title": "6.2. Bảng Mã Lỗi DET & Sự Kiện Chẩn Đoán DEM",
                    "html": """
<div class="hb-card">
  <h3>6.2. Mã Lỗi Phát Triển (DET) &amp; Sự Kiện Chẩn Đoán Sản Xuất (DEM)</h3>
  <table class="tbl">
    <thead><tr><th>Module Báo (ModuleId)</th><th>Tên Mã Lỗi / Event</th><th>Mã Hex</th><th>Điều Kiện Kích Hoạt &amp; Hậu Quả</th></tr></thead>
    <tbody>
      <tr><td><strong>MemIf (22)</strong></td><td class="mono">MEMIF_E_PARAM_DEVICE</td><td class="mono">0x01</td><td>Truyền <code>DeviceIndex &gt;= MemIfNumberOfDevices</code> (VD: 99), hoặc truyền <code>0xFF</code> vào hàm không phải <code>MemIf_GetStatus</code> (như <code>GetJobResult(0xFF)</code>).</td></tr>
      <tr><td><strong>MemIf (22)</strong></td><td class="mono">MEMIF_E_PARAM_POINTER</td><td class="mono">0x02</td><td>Truyền <code>NULL_PTR</code> vào <code>DataBufferPtr</code> của <code>MemIf_Read/Write</code> hoặc <code>VersionInfoPtr</code> của <code>MemIf_GetVersionInfo</code>.</td></tr>
      <tr><td><strong>Fee (21)</strong></td><td class="mono">FEE_E_INVALID_BLOCK_NO</td><td class="mono">0x02</td><td>Gọi <code>MemIf_EraseImmediateBlock()</code> lên Block có <code>FeeImmediateData == FALSE</code> hoặc Block chưa cấu hình.</td></tr>
      <tr><td><strong>Fls / Eep</strong></td><td class="mono">FLS_E_WRITE_FAILED / EEP_E_WRITE_FAILED</td><td>DEM Event</td><td>Lỗi vật lý tế bào nhớ Flash hoặc mất ACK/SPI Timeout khi ghi EEPROM &rarr; Báo DEM và trả <code>MEMIF_JOB_FAILED</code>.</td></tr>
      <tr><td><strong>NvM (20)</strong></td><td class="mono">NVM_E_INTEGRITY_FAILED</td><td>DEM Event</td><td>Sai CRC hoặc mất cả 2 bản sao <code>Redundant</code> khi đọc &rarr; Báo DEM và phục hồi ROM Default Data.</td></tr>
    </tbody>
  </table>
</div>"""
                },
                {
                    "title": "6.3. 6 Bẫy Lỗi Cấu Hình Thực Tế Khi Tích Hợp",
                    "html": """
<div class="hb-card">
  <h3>6.3. 6 Bẫy Lỗi Kinh Điển Kỹ Sư Ô Tô Thường Gặp Khi Tích Hợp Memory Stack</h3>
  <ol>
    <li><strong>Truyền nhầm <code>MEMIF_BROADCAST_ID (0xFF)</code> vào <code>MemIf_GetJobResult(0xFF)</code>:</strong> Chỉ có duy nhất <code>MemIf_GetStatus(0xFF)</code> chấp nhận Broadcast ID! Mọi hàm khác đều bị DET chặn lỗi <code>0x01</code>.</li>
    <li><strong>Lệch kích thước Block giữa NvM và Fee/Ea:</strong> Khi bật CRC16 (2 bytes) hoặc CRC32 (4 bytes) trong NvM (<code>NvMBlockUseCrc = TRUE</code>), kích thước cấu hình ở <code>FeeBlockSize / EaBlockSize</code> phải bằng <code>NvMNvBlockLength + 2 (hoặc 4)</code>! Nếu quên cộng phần CRC, <code>Fee</code> sẽ báo lỗi kích thước hoặc đọc thiếu dữ liệu.</li>
    <li><strong>Quên dịch bit <code>NvMDataSelectionBits</code> cho Dataset/Redundant:</strong> Với Redundant Block, <code>FeeBlockNumber</code> cấp dưới phải có 2 ID liên tiếp (<code>0x0008</code> và <code>0x0009</code>) tương ứng Bit 0 chọn bản sao, nếu đặt Base Number lẻ hoặc trùng Block bên cạnh sẽ ghi đè dữ liệu lẫn nhau!</li>
    <li><strong>Đặt sai thứ tự MainFunction trong SchM / BSW Task:</strong> Nếu gọi ngược từ dưới lên (<code>Fls</code> &rarr; <code>Fee</code> &rarr; <code>NvM</code>), mỗi bước bắt tay giữa các tầng bị mất nguyên 1 chu kỳ OS Task, làm tăng gấp 2–3 lần thời gian khởi động ECU (<code>StartupTwo</code>)!</li>
    <li><strong>Không trừ vùng đệm Sector Switch &amp; Immediate Block:</strong> Tổng kích thước tất cả Block trên Fee vượt quá ~80% một Flash Sector sẽ làm Fee chạy Garbage Collection liên tục không ngừng, gây mòn nhanh Flash (giảm tuổi thọ chip!).</li>
    <li><strong>Giải phóng RAM Buffer của SWC quá sớm trước Notification:</strong> Vì toàn bộ luồng MemIf chạy bất đồng bộ, biến cục bộ stack không bao giờ được làm buffer truyền vào <code>MemIf_Read/Write</code>.</li>
  </ol>
</div>"""
                },
                {
                    "title": "6.4. Checklist Kiểm Thử Tích Hợp MemIf",
                    "html": """
<div class="hb-card">
  <h3>6.4. Checklist Kiểm Thử Tích Hợp (Integration Testing) Cho Nhóm MemIf – Fee/Ea – NvM</h3>
  <ul>
    <li>[x] <strong>Xác minh cấu hình <code>MemIfNumberOfDevices</code>:</strong> Kiểm tra file <code>MemIf_Cfg.h</code> sinh đúng Macro (nếu 1 Dev) hoặc <code>MemIf_Cfg.c</code> sinh đúng thứ tự mảng con trỏ <code>[0]=Fee, [1]=Ea</code> (khớp đúng chỉ số trong <code>NvMBlockDescriptor</code>).</li>
    <li>[x] <strong>Kiểm thử biên Broadcast Status (<code>0xFF</code>):</strong> Ép từng tổ hợp trạng thái <code>Fee</code> / <code>Ea</code> và kiểm tra đúng thứ tự ưu tiên <code>UNINIT &gt; BUSY &gt; BUSY_INTERNAL &gt; IDLE</code> trước khi cho phép <code>EcuM_GoOffTwo</code> ngắt nguồn.</li>
    <li>[x] <strong>Đo thời gian <code>NvM_ReadAll() / WriteAll()</code>:</strong> Bắt Trace kiểm chứng <code>MemIf_SetMode(MEMIF_MODE_FAST)</code> được gọi đầu chu trình và trả về <code>MEMIF_MODE_SLOW</code> ngay sau khi hoàn tất.</li>
    <li>[x] <strong>Power-Loss &amp; Crash Test (HIL):</strong> Cắt nguồn giữa lúc đang ghi Copy 1 Redundant Block để xác nhận đọc lại trả về <code>MEMIF_BLOCK_INCONSISTENT</code> và NvM phục hồi trơn tru từ Copy 2; kiểm tra thời gian ghi <code>Immediate Crash Block</code> khi Fee đang bận Garbage Collection.</li>
    <li>[x] <strong>Kiểm thử DET Negative Cases:</strong> Thử nghiệm <code>DeviceIndex = 99</code>, <code>GetJobResult(0xFF)</code> và <code>NULL_PTR</code> khi <code>MemIfDevErrorDetect = STD_ON</code>.</li>
  </ul>
</div>"""
                }
            ]
        }
    ]


def main():
    tabs = build_handbook_data()
    tabs_json = json.dumps(tabs, ensure_ascii=False, indent=2)

    js_tail = r"""
let hbState = {
  tab1: 0,
  tab2: 0,
  abbrCat: "ALL"
};

function switchHbTab1(idx) {
  hbState.tab1 = idx;
  hbState.tab2 = 0;
  for (let i = 0; i < 7; i++) {
    const btn = document.getElementById("hbTab1_" + i);
    if (btn) btn.classList.toggle("active", i === idx);
  }
  const nav2 = document.getElementById("hbNav2");
  const abbrBar = document.getElementById("hbAbbrFilterBox");
  if (idx === 6) {
    if (nav2) nav2.classList.add("hidden");
    if (abbrBar) abbrBar.classList.remove("hidden");
    renderAbbreviationTable();
  } else {
    if (nav2) nav2.classList.remove("hidden");
    if (abbrBar) abbrBar.classList.add("hidden");
    renderCurrentHandbookView();
  }
}

function switchHbSubTab(idx) {
  hbState.tab2 = idx;
  renderCurrentHandbookView();
}

function renderCurrentHandbookView() {
  if (hbState.tab1 === 6) {
    renderAbbreviationTable();
    return;
  }
  const tabData = HANDBOOK_TABS[hbState.tab1] || HANDBOOK_TABS[0];
  const subs = tabData.subs || [];
  const subIdx = Math.max(0, Math.min(subs.length - 1, hbState.tab2));
  hbState.tab2 = subIdx;

  const nav2 = document.getElementById("hbNav2");
  if (nav2) {
    nav2.innerHTML = subs.map((s, i) =>
      `<button class="hb-tab2 ${i === subIdx ? "active" : ""}" onclick="switchHbSubTab(${i})">${escHtml(s.title)}</button>`
    ).join("");
  }

  const area = document.getElementById("hbContentArea");
  if (area && subs[subIdx]) {
    area.innerHTML = subs[subIdx].html;
  }
}

function highlightMatch(text, query) {
  const safe = escHtml(text);
  const q = (query || "").trim();
  if (!q) return safe;
  const escapedRe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp("(" + escapedRe + ")", "gi");
  return safe.replace(re, "<mark>$1</mark>");
}

function setAbbrCategory(cat) {
  hbState.abbrCat = cat;
  ["ALL", "CORE", "API", "FEE", "EA_NVM"].forEach((c) => {
    const pill = document.getElementById("catPill_" + c);
    if (pill) pill.classList.toggle("active", c === cat);
  });
  renderAbbreviationTable();
}

function filterAbbreviationTable() {
  renderAbbreviationTable();
}

function catBadgeHtml(cat) {
  if (cat === "CORE") return '<span class="pill pill-cyan">MemIf Core</span>';
  if (cat === "API") return '<span class="pill pill-warn">API &amp; Status</span>';
  if (cat === "FEE") return '<span class="pill pill-ok">Fee / Flash / MemAcc</span>';
  return '<span class="pill pill-pur">Ea / NvM / DET</span>';
}

function renderAbbreviationTable() {
  const input = document.getElementById("abbrSearchInput");
  const badge = document.getElementById("abbrCountBadge");
  const area = document.getElementById("hbContentArea");
  if (!area || typeof ABBREVIATIONS === "undefined") return;

  const q = (input ? input.value : "").trim().toLowerCase();
  const filtered = ABBREVIATIONS.filter((item) => {
    if (hbState.abbrCat !== "ALL" && item.cat !== hbState.abbrCat) return false;
    if (!q) return true;
    return (
      item.abbr.toLowerCase().includes(q) ||
      item.full.toLowerCase().includes(q) ||
      item.desc.toLowerCase().includes(q) ||
      item.cat.toLowerCase().includes(q)
    );
  });

  if (badge) badge.textContent = filtered.length + " / " + ABBREVIATIONS.length + " thuật ngữ";
  if (hbState.tab1 !== 6) return;

  const rows = filtered.map((it) => `
    <tr>
      <td class="mono" style="font-weight:800;color:var(--pri);white-space:nowrap">${highlightMatch(it.abbr, q)}</td>
      <td style="font-weight:600">${highlightMatch(it.full, q)}</td>
      <td>${catBadgeHtml(it.cat)}</td>
      <td>${highlightMatch(it.desc, q)}</td>
    </tr>`
  ).join("");

  area.innerHTML = `
    <div class="hb-card">
      <h3>7. Bảng Giải Thích Thuật Ngữ &amp; Từ Viết Tắt AUTOSAR MemIf (${filtered.length} kết quả)</h3>
      <table class="tbl">
        <thead>
          <tr>
            <th style="width:18%">Từ Viết Tắt / API</th>
            <th style="width:24%">Tên Đầy Đủ (English)</th>
            <th style="width:15%">Phân Nhóm</th>
            <th>Giải Thích Chi Tiết &amp; Vai Trò Trong Memory Stack</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="4" style="text-align:center;color:var(--mut);padding:16px">Không tìm thấy thuật ngữ phù hợp với từ khóa tìm kiếm.</td></tr>'}
        </tbody>
      </table>
    </div>`;
}

document.addEventListener("DOMContentLoaded", function () {
  initTooltipHandlers();
  switchCfgTab(0);
  onFaultKindChange();
  loadScenario("S1");
  renderCurrentHandbookView();
});
"""

    out_path = ROOT / "part6_handbook.js"
    out_path.write_text(
        "// ================= PART 6: 6x4 TECHNICAL HANDBOOK, ABBREVIATION SEARCH & BOOTSTRAP =================\n\n"
        f"const HANDBOOK_TABS = {tabs_json};\n" + js_tail,
        encoding="utf-8"
    )
    print(f"Generated {out_path} ({len(tabs)} main tabs, {sum(len(t['subs']) for t in tabs)} sub-topics).")


if __name__ == "__main__":
    main()
