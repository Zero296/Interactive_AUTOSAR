# -*- coding: utf-8 -*-
"""Generate part6_handbook.js: 6x4 Multi-level Handbook (24 topics + 18 SVGs) + Abbreviation Search + Bootstrap."""
import json
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)
from hb_diagrams_nvm import HANDBOOK_SVGS  # noqa: E402


def S(tab, sub):
    return HANDBOOK_SVGS[(tab, sub)]


HANDBOOK_TABS = [
    {
        "id": 0,
        "title": "1. Memory Stack & Giải Phẫu",
        "subTabs": [
            {
                "title": "1.1 Vị Trí NvM Trong BSW",
                "html": f"""
<div class="hb-card">
  <h3>1.1 Kiến Trúc Phân Tầng AUTOSAR Memory Stack (R23-11)</h3>
  <p><strong>NvM (NVRAM Manager)</strong> nằm tại tầng Services Layer (<code>SWS_NvM</code>), đóng vai trò điểm truy cập duy nhất (Single Point of Access) giúp phần mềm ứng dụng (<strong>SWC</strong>), chẩn đoán (<strong>Dcm</strong>), báo lỗi (<strong>Dem</strong>) và quản lý trạng thái (<strong>BswM/EcuM</strong>) đọc/ghi dữ liệu bền vững mà không cần quan tâm MCU bên dưới đang dùng Data Flash (<strong>Fee/Fls</strong>) hay EEPROM ngoài/nội (<strong>Ea/Eep</strong>).</p>
  {S(0, 0)}
  <table class="tbl">
    <thead><tr><th>Tầng / Module</th><th>Input Chính</th><th>Xử Lý Cốt Lõi</th><th>Output Đích</th></tr></thead>
    <tbody>
      <tr><td><strong>SWC / RTE</strong></td><td><code>NvM_ReadBlock / WriteBlock / PRAM</code></td><td>Chuẩn bị buffer RAM / Mirror callback</td><td>Callback <code>SingleBlockCallback(ServiceId, JobResult)</code></td></tr>
      <tr><td><strong>BswM / EcuM</strong></td><td><code>NvM_Init / ReadAll / WriteAll</code></td><td>Đồng bộ vòng đời Startup/Shutdown ECU</td><td><code>BswM_NvM_CurrentJobMode(MultiService, Result)</code></td></tr>
      <tr><td><strong>NvM Core</strong></td><td>Immediate + Standard Queues</td><td>Sắp xếp ưu tiên, Mirror Copy, CRC, Verify, Retry</td><td>Gọi <code>MemIf_Read / Write / Cancel / Erase</code></td></tr>
      <tr><td><strong>MemIf</strong></td><td><code>DeviceIndex</code> + <code>BlockNumber</code></td><td>Định tuyến đa thiết bị nhớ (0→Fee, 1→Ea)</td><td>Chuyển tiếp <code>Fee_*</code> hoặc <code>Ea_*</code></td></tr>
    </tbody>
  </table>
</div>"""
            },
            {
                "title": "1.2 Giải Phẫu 3 Vùng Nhớ Block",
                "html": f"""
<div class="hb-card">
  <h3>1.2 Cấu Trúc 3 Thành Phần Của Một NVRAM Block</h3>
  <p>Trong AUTOSAR NvM (<code>SWS_NvM_00059</code>), một khối NVRAM cơ bản được cấu thành từ 3 thành phần logic:</p>
  {S(0, 1)}
  <ul>
    <li><strong>1. RAM Block (hoặc Mirror):</strong> Lưu dữ liệu runtime đang thay đổi liên tục. Có thể là <em>Permanent RAM</em> (địa chỉ tĩnh <code>NvMRamBlockDataAddress</code>), <em>Temporary Pointer</em> (truyền lúc gọi API), hoặc <em>Explicit Sync Mirror</em> bên trong NvM.</li>
    <li><strong>2. NV Block (Non-Volatile):</strong> Lưu trên Flash/EEPROM theo khung: <code>[Static Block ID (2B, tùy chọn)] + [Payload (N Bytes)] + [CRC-8/16/32 (1/2/4B, tùy chọn)]</code>.</li>
    <li><strong>3. ROM Block / InitCallback:</strong> Giá trị hằng mặc định nằm trong Code Flash (<code>NvMRomBlockDataAddress</code>) hoặc hàm khởi tạo động (<code>NvMInitBlockCallback</code>), kích hoạt khi Flash mới chưa ghi hoặc hỏng toàn bộ CRC.</li>
  </ul>
</div>"""
            },
            {
                "title": "1.3 Fee (Flash) vs Ea (EEPROM)",
                "html": f"""
<div class="hb-card">
  <h3>1.3 Sự Khác Biệt Giữa Fee/Fls (Wear Leveling) &amp; Ea/Eep</h3>
  <p>Bộ nhớ DFlash vật lý chỉ cho phép xóa theo cả Sector (VD: 4KB–64KB) và bị mòn sau ~10k–100k chu kỳ xóa, trong khi EEPROM hỗ trợ xóa/ghi từng byte với chu kỳ cao hơn.</p>
  {S(0, 2)}
  <table class="tbl">
    <thead><tr><th>Tiêu Chí</th><th>Fee → Fls (Flash EEPROM Emulation)</th><th>Ea → Eep (EEPROM Abstraction)</th></tr></thead>
    <tbody>
      <tr><td>Cơ chế ghi</td><td>Ghi nối tiếp (Append-only) + cập nhật bảng quản lý</td><td>Ghi trực tiếp tại offset cố định trên EEPROM</td></tr>
      <tr><td>Chống mòn (Wear Leveling)</td><td><strong>Có</strong> — tự xoay vòng Sector &amp; Garbage Collection</td><td>Không cần phức tạp như Flash (EEPROM tự bền hơn)</td></tr>
      <tr><td>Trạng thái Erase vs Invalidate</td><td><code>MemIf_InvalidateBlock</code> chỉ gắn cờ Invalid siêu nhanh</td><td>Đánh dấu Invalid hoặc ghi đè trực tiếp</td></tr>
    </tbody>
  </table>
</div>"""
            },
            {
                "title": "1.4 Administrative Block & Job Status",
                "html": """
<div class="hb-card">
  <h3>1.4 Bảng Administrative Block (Thanh A) &amp; Kernel Control (Thanh B)</h3>
  <p>Mỗi Block ID (<code>1..N</code>) sở hữu một Administrative Block trong RAM của NvM để theo dõi trạng thái hợp lệ, cờ thay đổi, khóa bảo vệ và kết quả Job cuối cùng (<code>NvM_RequestResultType</code>):</p>
  <table class="tbl">
    <thead><tr><th>Mã Kết Quả (RequestResult)</th><th>Ý Nghĩa Kỹ Thuật</th><th>Kịch Bản Liên Quan</th></tr></thead>
    <tbody>
      <tr><td><code>NVM_REQ_OK</code> (0x00)</td><td>Yêu cầu đọc/ghi/xóa/validate đã thành công</td><td>S1, S2, S5, S6, S9</td></tr>
      <tr><td><code>NVM_REQ_NOT_OK</code> (0x01)</td><td>Thất bại chung (hết Retry phần cứng, Mirror quá hạn, Block bị khóa)</td><td>S3, S12, S13, S14</td></tr>
      <tr><td><code>NVM_REQ_PENDING</code> (0x02)</td><td>Job đang nằm trong Queue hoặc đang đợi tầng MemIf/Fee/Fls</td><td>S2, S7</td></tr>
      <tr><td><code>NVM_REQ_INTEGRITY_FAILED</code> (0x03)</td><td>Lỗi CRC trên toàn bộ các bản sao NV khả dụng</td><td>S9</td></tr>
      <tr><td><code>NVM_REQ_NV_INVALIDATED</code> (0x05)</td><td>Block Header đang bị Fee/Ea đánh dấu Invalid</td><td>S11</td></tr>
      <tr><td><code>NVM_REQ_CANCELED</code> (0x06)</td><td>Tiến trình <code>NvM_WriteAll()</code> bị ngắt bởi <code>NvM_CancelWriteAll()</code></td><td>S8</td></tr>
      <tr><td><code>NVM_REQ_RESTORED_FROM_ROM</code> (0x08)</td><td>Đã nạp giá trị mặc định từ ROM Default / InitBlockCallback</td><td>S10</td></tr>
    </tbody>
  </table>
</div>"""
            },
        ],
    },
    {
        "id": 1,
        "title": "2. NATIVE / REDUNDANT / DATASET",
        "subTabs": [
            {
                "title": "2.1 So Sánh 3 Kiểu Quản Lý Khối",
                "html": f"""
<div class="hb-card">
  <h3>2.1 Ba Kiểu Quản Lý Block Descriptor (NvMBlockManagementType)</h3>
  <p>Việc lựa chọn đúng kiểu Block quyết định độ an toàn khi mất điện đột ngột (Power-Loss Resilience) và dung lượng tiêu tốn trên Flash/EEPROM.</p>
  {S(1, 0)}
  <table class="tbl">
    <thead><tr><th>Kiểu Block</th><th>Số NV Copies</th><th>Hỗ Trợ Dataset Index</th><th>Đề Xuất Sử Dụng</th></tr></thead>
    <tbody>
      <tr><td><code>NVM_BLOCK_NATIVE</code></td><td>1 NV Copy + 0..1 ROM</td><td>Không (<code>DataIndex</code> luôn = 0)</td><td>Calibration, Flag thông thường, Event Log có CRC</td></tr>
      <tr><td><code>NVM_BLOCK_REDUNDANT</code></td><td>2 NV Copies (#0 &amp; #1) + 0..1 ROM</td><td>Không</td><td><strong>Odometer, ConfigId, DTC quan trọng</strong> — chống mất điện lúc đang ghi</td></tr>
      <tr><td><code>NVM_BLOCK_DATASET</code></td><td>M NV Slots + N ROM Slots</td><td>Có (<code>NvM_SetDataIndex</code>)</td><td>Biến thể thị trường (EU/US/JP), lịch sử Snapshot đóng băng</td></tr>
    </tbody>
  </table>
</div>"""
            },
            {
                "title": "2.2 Cơ Chế Tự Cứu Hộ REDUNDANT",
                "html": f"""
<div class="hb-card">
  <h3>2.2 Luồng Failover Cứu Hộ Kép Trên Khối REDUNDANT</h3>
  <p>Khi ghi một khối <code>NVM_BLOCK_REDUNDANT</code>, NvM ghi tuần tự Copy #0 xong mới ghi tiếp Copy #1. Nhờ vậy, nếu ECU bị sập nguồn ngay giữa lúc đang xóa/ghi Copy #0, bản sao Copy #1 cũ vẫn hoàn toàn nguyên vẹn cho lần boot kế tiếp!</p>
  {S(1, 1)}
  <ul>
    <li><strong>Bước 1:</strong> Khi <code>NvM_ReadBlock()</code> hoặc <code>NvM_ReadAll()</code> đọc Copy #0, nếu CRC hoặc Static ID sai (hoặc copy bị Erase), NvM thử đọc lại tối đa <code>NvMMaxNumOfReadRetries</code> lần.</li>
    <li><strong>Bước 2:</strong> Nếu Copy #0 vẫn lỗi, NvM ghi nhận sự kiện <code>Dem_SetEventStatus(NVM_E_LOSS_OF_REDUNDANCY, FAILED)</code> và chuyển sang đọc ngay Copy #1.</li>
    <li><strong>Bước 3:</strong> Nếu Copy #1 hợp lệ, SWC vẫn nhận <code>NVM_REQ_OK</code> với dữ liệu toàn vẹn! Nếu <em>cả #0 và #1</em> đều hỏng, NvM báo <code>NVM_E_INTEGRITY_FAILED</code> và nạp ROM Default (nếu có).</li>
  </ul>
</div>"""
            },
            {
                "title": "2.3 Quản Lý Con Trỏ DATASET",
                "html": f"""
<div class="hb-card">
  <h3>2.3 Vùng NV Slots &amp; ROM Slots Trong Khối NVM_BLOCK_DATASET</h3>
  <p>Khối <code>NVM_BLOCK_DATASET</code> gom nhiều bản ghi cùng kích thước dưới một Block ID duy nhất, phân biệt qua chỉ số <code>DataIndex</code> (0 .. <code>NvMNvBlockNum + NvMRomBlockNum - 1</code>).</p>
  {S(1, 2)}
  <ul>
    <li><strong>Vùng NV (0 .. NvBlockNum - 1):</strong> Đọc và ghi bình thường qua Fee/Ea. Ví dụ trong trình mô phỏng: Block #4 <code>Variant_Coding</code> có Index 0 (EU), Index 1 (US), Index 2 (JP).</li>
    <li><strong>Vùng ROM (NvBlockNum .. Total - 1):</strong> Ánh xạ trực tiếp tới hằng số Flash chỉ đọc (Index 3 &amp; 4). Gọi <code>NvM_ReadBlock()</code> sẽ nạp dữ liệu ROM; nhưng gọi <code>NvM_WriteBlock()</code>, <code>EraseNvBlock()</code> hoặc <code>InvalidateNvBlock()</code> sẽ bị chặn ngay bằng DET <code>NVM_E_PARAM_BLOCK_DATA_IDX (0x0C)</code>!</li>
  </ul>
</div>"""
            },
            {
                "title": "2.4 Nguyên Tắc Chọn Kiểu Block Thực Tế",
                "html": """
<div class="hb-card">
  <h3>2.4 Checklist Thiết Kế Phân Loại Khối Cho ECU Thực Tế</h3>
  <ul>
    <li><strong>Không bao giờ dùng NATIVE cho Odometer / Total Energy:</strong> Nếu mất điện giữa quá trình xóa trang hoặc ghi Fee, trang cũ có thể bị hỏng trước khi trang mới hoàn tất. Luôn dùng <code>NVM_BLOCK_REDUNDANT</code>.</li>
    <li><strong>Kiểm tra kích thước Cluster Fee:</strong> Mỗi khối <code>REDUNDANT</code> nhân đôi dung lượng tiêu thụ trên Flash Sector. Hãy cân bằng chu kỳ ghi và kích thước DFlash trước khi bật Redundant đồng loạt.</li>
    <li><strong>Cẩn trọng với ReadAll trên DATASET:</strong> NvM chỉ đọc đúng <code>DataIndex</code> hiện tại (mặc định là <code>0</code> sau <code>NvM_Init</code>), nên nếu cần đọc tất cả các index phải dùng vòng lặp <code>NvM_SetDataIndex + ReadBlock</code> sau khi ReadAll kết thúc.</li>
  </ul>
</div>"""
            },
        ],
    },
    {
        "id": 2,
        "title": "3. RAM & Explicit Sync Mirror",
        "subTabs": [
            {
                "title": "3.1 Ba Cơ Chế Truy Cập RAM",
                "html": f"""
<div class="hb-card">
  <h3>3.1 Permanent RAM vs Temporary Pointer vs Explicit Mirror</h3>
  <p>Làm sao ngăn xung đột dữ liệu (Data Tearing / Coherency Bug) khi SWC đang cập nhật biến đa byte trong lúc Task BSW thấp hơn chạy <code>NvM_MainFunction()</code> đọc/tính CRC?</p>
  {S(2, 0)}
  <ul>
    <li><strong>Permanent RAM Block:</strong> Tiện lợi cho <code>ReadAll()/WriteAll()</code> và <code>ReadPRAMBlock()/WritePRAMBlock()</code> (R20-11+), nhưng nếu không có Mirror thì SWC phải tự bảo vệ vùng RAM trong suốt thời gian job <code>PENDING</code>.</li>
    <li><strong>Temporary RAM Pointer:</strong> Cấp phát buffer tạm cho <code>NvM_ReadBlock(id, ptr)</code> / <code>NvM_WriteBlock(id, ptr)</code>. Tuyệt đối không giải phóng biến cục bộ (stack!) trước khi nhận callback hoàn tất.</li>
    <li><strong>Explicit Sync Mirror:</strong> SWC chỉ cần đồng bộ nhanh dữ liệu bên trong callback <code>NvMWriteRamBlockToNvMCallback</code> / <code>ReadRamBlockFromNvMCallback</code> với bộ đệm NvM Mirror biệt lập!</li>
  </ul>
</div>"""
            },
            {
                "title": "3.2 NvMRepeatMirrorOperations Retry",
                "html": f"""
<div class="hb-card">
  <h3>3.2 Cơ Chế Thử Lại Khi Mirror Callback Bị Xung Đột (Busy)</h3>
  <p>Nếu tại thời điểm <code>NvM_MainFunction()</code> gọi <code>WriteRamBlockToNvMCallback</code>, SWC đang nắm mutex/spinlock cập nhật cấu trúc dữ liệu thì SWC chỉ cần trả về <code>E_NOT_OK</code>.</p>
  {S(2, 1)}
  <p>NvM không hủy ngay Job mà trừ dần bộ đếm <code>NvMRepeatMirrorOperations</code> (VD: 3 lần) ở mỗi chu kỳ <code>NvM_MainFunction()</code>. Chỉ khi hết hoàn toàn số lượt thử lại mà vẫn nhận <code>E_NOT_OK</code>, NvM mới báo lỗi <code>NVM_E_REQ_FAILED</code> và trả <code>NVM_REQ_NOT_OK</code>.</p>
</div>"""
            },
            {
                "title": "3.3 SetRamBlockStatus & ValidateAll",
                "html": f"""
<div class="hb-card">
  <h3>3.3 Quản Lý Trạng Thái Dirty Qua NvM_SetRamBlockStatus()</h3>
  <p>Khi tắt máy (<code>NvM_WriteAll()</code>), nếu ghi toàn bộ hàng trăm khối xuống Flash sẽ làm quá thời gian shutdown tiêu chuẩn (VD: &lt;150ms) và làm mòn Flash vô ích.</p>
  {S(2, 2)}
  <ul>
    <li>Chỉ những khối thỏa mãn đồng thời: <code>NvMSelectBlockForWriteAll == TRUE</code> &amp;&amp; <code>VALID_RAM == 1</code> &amp;&amp; <code>CHANGED_SW == 1</code> mới được <code>WriteAll()</code> đưa xuống Flash.</li>
    <li>SWC cần gọi <code>NvM_SetRamBlockStatus(BlockId, TRUE)</code> mỗi khi sửa dữ liệu RAM (yêu cầu <code>NvMBlockUseSetRamBlockStatus = TRUE</code>).</li>
    <li>Khi bật <code>NvMBlockUseAutoValidation = TRUE</code>, hàm <code>NvM_ValidateAll()</code> hỗ trợ tính trước CRC cho các khối đã VALID trước lúc vào chu trình WriteAll cuối.</li>
  </ul>
</div>"""
            },
            {
                "title": "3.4 Mẫu C Callback Cho Explicit Sync",
                "html": """
<div class="hb-card">
  <h3>3.4 Ví Dụ C Code Chuẩn Cho Explicit Synchronization Callback</h3>
  <pre class="code-block mono">/* SWC → NvM Mirror (được gọi bởi NvM trước khi tính CRC &amp; MemIf_Write) */
Std_ReturnType App_WriteOdoToMirrorCbk(void* NvMBuffer) {
  if (g_OdoMutexBusy == TRUE) {
    return E_NOT_OK; /* NvM sẽ thử lại NvMRepeatMirrorOperations lần */
  }
  Rte_Enter_ExclusiveArea_Odo();
  memcpy(NvMBuffer, &amp;g_AppOdometerData, sizeof(OdoData_Type));
  Rte_Exit_ExclusiveArea_Odo();
  return E_OK;
}

/* NvM Mirror → SWC (được gọi bởi NvM sau khi ReadBlock/ReadAll xác thực CRC OK) */
Std_ReturnType App_ReadOdoFromMirrorCbk(const void* NvMBuffer) {
  Rte_Enter_ExclusiveArea_Odo();
  memcpy(&amp;g_AppOdometerData, NvMBuffer, sizeof(OdoData_Type));
  Rte_Exit_ExclusiveArea_Odo();
  return E_OK;
}</pre>
</div>"""
            },
        ],
    },
    {
        "id": 3,
        "title": "4. CRC, Compare, Verify & Bảo Vệ",
        "subTabs": [
            {
                "title": "4.1 CRC-8/16/32 & Static Block ID",
                "html": f"""
<div class="hb-card">
  <h3>4.1 Chuỗi Tính CRC &amp; Băm Kèm Static Block ID (SWS_NvM_00201)</h3>
  <p>Bật <code>NvMBlockUseCrc = TRUE</code> cho phép NvM liên kết với module <strong>Crc</strong> để tính CRC-8 (SAE J1850), CRC-16 (CCITT) hoặc CRC-32 (IEEE 802.3). Để tránh tốn thời gian CPU trong 1 chu kỳ MainFunction với khối dài (VD: 2KB), NvM chia nhỏ theo tham số <code>NvMCrcNumOfBytes</code> (VD: 64 bytes/tick).</p>
  {S(3, 0)}
  <p><strong>Tại sao cần Static Block ID Check?</strong> Nếu phần mềm có lỗi con trỏ/ánh xạ sai BlockId ở tầng Fee, dữ liệu của Block #2 có cùng kích thước &amp; CRC hợp lệ có thể bị đọc nhầm vào Block #3! Khi bật <code>NvMStaticBlockIDCheck = TRUE</code>, 2 byte <code>BlockId</code> được ghi và băm chung vào CRC — lệch ID lập tức báo DEM <code>NVM_E_WRONG_BLOCK_ID</code>.</p>
</div>"""
            },
            {
                "title": "4.2 CRC Compare Skip & WriteVerify",
                "html": f"""
<div class="hb-card">
  <h3>4.2 Giảm Mòn Flash (CRC Compare Skip) &amp; Đọc Ngược WriteVerification</h3>
  {S(3, 1)}
  <ul>
    <li><strong>NvMBlockUseCrcCompMechanism (Chống mòn Flash):</strong> Trước khi gọi <code>MemIf_Write()</code>, NvM tính CRC dữ liệu RAM mới và so sánh với CRC đã lưu trên NV ở lần đọc/ghi trước. Nếu trùng khớp tuyệt đối -> <strong>BỎ QUA hoàn toàn MemIf_Write()</strong> và trả ngay <code>NVM_REQ_OK</code>!</li>
    <li><strong>NvMWriteVerification (SWS_NvM_00842):</strong> Ngay sau khi <code>MemIf_Write()</code> xong, NvM tự động phát lệnh <code>MemIf_Read()</code> đọc ngược dữ liệu vật lý vừa ghi và đối chiếu từng byte với RAM/Mirror. Nếu sai do cell Flash bị chai -> tự retry hoặc báo DEM <code>NVM_E_VERIFY_FAILED</code>.</li>
  </ul>
</div>"""
            },
            {
                "title": "4.3 WriteProt & NvMWriteBlockOnce",
                "html": f"""
<div class="hb-card">
  <h3>4.3 Khóa Chống Ghi Mềm vs Khóa Vĩnh Viễn WriteBlockOnce</h3>
  {S(3, 2)}
  <p>Hai cơ chế bảo vệ dữ liệu nhạy cảm khỏi bị ghi đè ngoài ý muốn:</p>
  <ul>
    <li><code>NvM_SetBlockProtection(id, TRUE/FALSE)</code> (<code>API_CONFIG_CLASS_3</code>): Khóa/mở khóa động khi chạy phần mềm.</li>
    <li><code>NvMWriteBlockOnce = TRUE</code> (<code>SWS_NvM_00326</code>): Dành riêng cho dữ liệu EOL nhà máy (số VIN, Security Keys). Chỉ cho phép ghi 1 lần khi Flash còn trống; sau lần ReadAll hợp lệ hoặc Write thành công đầu tiên, bit <code>WR_ONCE_LOCKED</code> tự chốt vĩnh viễn không thể mở bằng <code>SetBlockProtection(FALSE)</code>!</li>
  </ul>
</div>"""
            },
            {
                "title": "4.4 Dynamic Configuration & SW Update",
                "html": """
<div class="hb-card">
  <h3>4.4 Cơ Chế NvMDynamicConfiguration &amp; ResistantToChangedSw</h3>
  <p>Khi ECU được cập nhật firmware mới (FOTA/Reflash) làm thay đổi layout struct hoặc bổ sung biến calibration trong NvM:</p>
  <ol>
    <li>Block #1 luôn là khối đặc biệt <code>NvMConfigId</code> chứa mã 16-bit <strong>CompiledConfigId</strong> của bản firmware mới.</li>
    <li>Khi <code>NvM_ReadAll()</code> đọc Block #1 thấy <code>CompiledConfigId != StoredConfigId</code> và <code>NvMDynamicConfiguration = TRUE</code>:</li>
    <li>Các khối cấu hình <code>NvMResistantToChangedSw = FALSE</code> (như tham số calib phiên bản cũ) sẽ tự động được reset về <strong>ROM Default</strong> và đánh dấu ghi lại xuống Flash; trong khi các khối cốt lõi như <strong>Odometer</strong> đặt <code>NvMResistantToChangedSw = TRUE</code> được giữ nguyên vẹn dữ liệu thực tế trên xe!</li>
  </ol>
</div>"""
            },
        ],
    },
    {
        "id": 4,
        "title": "5. Hàng Đợi & ReadAll / WriteAll",
        "subTabs": [
            {
                "title": "5.1 Immediate Queue Preemption",
                "html": f"""
<div class="hb-card">
  <h3>5.1 Hàng Đợi Ưu Tiên Kép &amp; Cắt Ngang Immediate (Priority = 0)</h3>
  <p>Trong tình huống tai nạn va chạm (Airbag/Crash), ECU chỉ còn vài chục mili-giây nguồn tụ dự phòng (Hold-up Capacitor) để lưu Crash Record trước khi mất điện hoàn toàn. NvM giải quyết bài toán này bằng hàng đợi kép khi <code>NvMJobPrioritization = TRUE</code>:</p>
  {S(4, 0)}
  <ul>
    <li><strong>Immediate Priority Queue (Priority = 0):</strong> Chứa các lệnh <code>NvM_WriteBlock</code>/<code>EraseNvBlock</code> khẩn cấp. Nếu có Job thường (Prio 1..255) đang chiếm dụng tầng <code>MemIf/Fee/Fls</code>, NvM lập tức gọi <code>MemIf_Cancel()</code> hủy ngang Job thường, tạm cất trạng thái Job thường vào <code>SuspendedJob</code>!</li>
    <li><strong>Auto-Resume:</strong> Khi toàn bộ Immediate Queue được ghi xong an toàn, NvM tự động lấy <code>SuspendedJob</code> ra khởi động lại mà SWC thường không hề hay biết bị gián đoạn.</li>
  </ul>
</div>"""
            },
            {
                "title": "5.2 Chu Trình Startup NvM_ReadAll()",
                "html": f"""
<div class="hb-card">
  <h3>5.2 Trình Tự Startup: EcuM → NvM_Init → NvM_ReadAll → BswM</h3>
  {S(4, 1)}
  <ul>
    <li><strong>1. MemIf_SetMode(MEMIF_MODE_FAST):</strong> Nếu bật <code>NvMDrvModeSwitch = TRUE</code>, NvM chuyển tầng driver Flash sang chế độ tốc độ cao (giảm chờ giữa các page, ưu tiên thời gian Wakeup/Boot &lt;100ms).</li>
    <li><strong>2. Đọc Block #1 ConfigId đầu tiên:</strong> Kiểm tra phiên bản phần mềm qua <code>NvMDynamicConfiguration</code>.</li>
    <li><strong>3. Duyệt khối #2..#N:</strong> Đọc tất cả khối có <code>NvMSelectBlockForReadAll = TRUE</code> (trừ khối DATASET/Immediate không chọn).</li>
    <li><strong>4. Hoàn tất:</strong> Khôi phục <code>MemIf_SetMode(MEMIF_MODE_SLOW)</code> và phát <code>BswM_NvM_CurrentJobMode(NVM_READ_ALL, NVM_REQ_OK)</code>.</li>
  </ul>
</div>"""
            },
            {
                "title": "5.3 Shutdown WriteAll & CancelWriteAll",
                "html": f"""
<div class="hb-card">
  <h3>5.3 Chu Trình Tắt Máy NvM_WriteAll() &amp; Wakeup NvM_CancelWriteAll()</h3>
  {S(4, 2)}
  <p>Nếu tài xế tắt chìa khóa rồi đổi ý bật lại chìa khóa (<code>IGN_ON</code>) ngay giữa lúc ECU đang thực hiện <code>NvM_WriteAll()</code>:</p>
  <ul>
    <li><strong>BswM gọi NvM_CancelWriteAll():</strong> NvM KHÔNG cắt cụt khối đang ghi dở giữa chừng để tránh làm rách dữ liệu Flash — nó đợi khối hiện tại ghi xong trọn vẹn bản sao, sau đó hủy toàn bộ các khối còn lại trong hàng đợi Multi-Block và báo <code>NVM_REQ_CANCELED</code> về BswM để ECU lập tức quay lại trạng thái RUN!</li>
  </ul>
</div>"""
            },
            {
                "title": "5.4 Tối Ưu Timing Shutdown NvM",
                "html": """
<div class="hb-card">
  <h3>5.4 Checklist Tối Ưu Hiệu Năng Đọc/Ghi Đa Khối</h3>
  <table class="tbl">
    <thead><tr><th>Tham Số ECUC</th><th>Mục Đích Tối Ưu</th><th>Lưu Ý Triển Khai</th></tr></thead>
    <tbody>
      <tr><td><code>NvMDrvModeSwitch = TRUE</code></td><td>Tăng tốc ReadAll/WriteAll gấp 2–4x</td><td>Đảm bảo MCU không chạy tác vụ an toàn nặng song song trong FAST mode</td></tr>
      <tr><td><code>NvMBlockUseCrcCompMechanism</code></td><td>Loại bỏ ghi trùng lặp</td><td>Giúp NvM_WriteAll hoặc WriteBlock định kỳ không ghi Flash khi dữ liệu y hệt</td></tr>
      <tr><td><code>NvMCrcNumOfBytes</code></td><td>Điều tiết tải CPU mỗi tick 10ms</td><td>Đặt ~64–256 bytes/cycle tránh gây watchdog/deadline miss trong Task 10ms</td></tr>
    </tbody>
  </table>
</div>"""
            },
        ],
    },
    {
        "id": 5,
        "title": "6. API R23-11, DEM/DET & ECUC",
        "subTabs": [
            {
                "title": "6.1 Phân Cấp API Config Class 1/2/3",
                "html": f"""
<div class="hb-card">
  <h3>6.1 Ba Cấp Độ Biên Dịch Dịch Vụ NvMApiConfigClass</h3>
  <p>Để tiết kiệm bộ nhớ Code Flash trên ECU nhỏ, <code>NvMApiConfigClass</code> phân tách API thành 3 tầng tích lũy. Đặc biệt từ AUTOSAR R20-11 đến R23-11, khuyến nghị sử dụng biến thể an toàn kiểu <code>*PRAMBlock*</code> cho Permanent RAM.</p>
  {S(5, 0)}
</div>"""
            },
            {
                "title": "6.2 Bảng Lỗi Phát Triển DET & Sự Cố DEM",
                "html": f"""
<div class="hb-card">
  <h3>6.2 Phân Tách Lỗi Lập Trình (DET Module 20) vs Lỗi Phần Cứng/Toàn Vẹn (DEM)</h3>
  {S(5, 1)}
  <p><strong>Quy tắc vàng AUTOSAR:</strong> Các lỗi có thể phát hiện ngay lúc gọi hàm đồng bộ (chưa init, BlockId=0, Block đang Pending, DataIndex tràn, Erase Prio!=0) đều thuộc về <strong>DET</strong> (chỉ bật khi Dev). Mọi sự cố phát hiện trong quá trình thực thi bất đồng bộ Flash/CRC/Verify (hỏng CRC, sai StaticID, lỗi Flash phần cứng, mất bản sao Redundant) đều báo tới <strong>DEM</strong> để lưu mã DTC trên xe thương mại!</p>
</div>"""
            },
            {
                "title": "6.3 Cấu Trúc Container ECUC NvM",
                "html": f"""
<div class="hb-card">
  <h3>6.3 Cây Tham Số Cấu Hình ECUC Chuẩn (.arxml → NvM_Cfg.h/.c)</h3>
  {S(5, 2)}
  <p>Tham số cấu hình trong <strong>DaVinci Configurator / EB Tresos / ISOLAR-AB</strong> được chia làm 2 nhánh lớn <code>NvMCommon</code> (toàn cục) và <code>NvMBlockDescriptor</code> (từng Block 1..N), liên kết xuống <code>MemIf → Fee/Ea → Fls/Eep</code> thông qua cặp tham chiếu <code>NvMNvramDeviceId</code> và <code>NvMNvBlockBaseNumber</code>.</p>
</div>"""
            },
            {
                "title": "6.4 Hướng Dẫn Dùng Trình Mô Phỏng & Xuất Code",
                "html": """
<div class="hb-card">
  <h3>6.4 Khai Thác Tối Đa 14 Kịch Bản &amp; Bộ Xuất Code Trực Tiếp</h3>
  <ul>
    <li><strong>Quick Actions Bar (Cột trái trên cùng):</strong> Thử đọc/ghi, đánh dấu Dirty, tiêm lỗi CRC hoặc bấm <em>🚨 Imm Crash (Prio=0)</em> ngay giữa lúc đang ghi khối thường mà không cần cuộn trang.</li>
    <li><strong>14 Kịch Bản &amp; 42 What-Ifs:</strong> Chọn từ thanh Header để chạy từng bước có giải thích Input → Xử lý → Output và thử các tình huống hỏng phần cứng/sai cấu hình.</li>
    <li><strong>Tooltip >1s (giống DEM):</strong> Di chuột giữ >1 giây (hoặc bấm nút <code>ⓘ</code>) vào bất kỳ trong 36 ô cấu hình ECUC để xem SWS ID, phạm vi giá trị và lưu ý thiết kế.</li>
    <li><strong>Xuất File Trực Tiếp:</strong> Nút <code>📦 Xuất ARXML / Cfg / C</code> sinh tức thì <code>NvM.arxml</code>, <code>NvM_Cfg.h</code>, <code>NvM_Cfg.c</code> và <code>NvM_Config.json</code> theo đúng các tham số bạn vừa tinh chỉnh!</li>
  </ul>
</div>"""
            },
        ],
    },
]


def main():
    js_lines = [
        "// ================= PART 6: MULTI-LEVEL HANDBOOK (6x4 = 24 TOPICS) & ABBREVIATION SEARCH =================",
        "const HANDBOOK_TABS = " + json.dumps(HANDBOOK_TABS, ensure_ascii=False).replace("</", "<\\/") + ";",
        "",
        "let currentHbTab1 = 0;",
        "let currentHbTab2 = 0;",
        "let currentAbbrCat = 'ALL';",
        "",
        "function switchHbTab1(idx) {",
        "  currentHbTab1 = idx;",
        "  currentHbTab2 = 0;",
        "  for (let i = 0; i < 7; i++) {",
        "    const b = document.getElementById('hbTab1_' + i);",
        "    if (b) b.classList.toggle('active', i === idx);",
        "  }",
        "  renderCurrentHandbookView();",
        "}",
        "",
        "function switchHbSubTab(subIdx) {",
        "  currentHbTab2 = subIdx;",
        "  renderCurrentHandbookView();",
        "}",
        "",
        "function setAbbrCategory(cat) {",
        "  currentAbbrCat = cat || 'ALL';",
        "  ['ALL', 'ARCH', 'QUEUE', 'CRC', 'STACK'].forEach(c => {",
        "    const el = document.getElementById('catPill_' + c);",
        "    if (el) el.classList.toggle('active', c === currentAbbrCat);",
        "  });",
        "  filterAbbreviationTable();",
        "}",
        "",
        "function highlightSearchMatch(text, query) {",
        "  const safe = escHtml(text);",
        "  if (!query) return safe;",
        "  const qSafe = query.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');",
        "  const re = new RegExp('(' + qSafe + ')', 'gi');",
        "  return safe.replace(re, '<mark>$1</mark>');",
        "}",
        "",
        "function filterAbbreviationTable() {",
        "  const area = document.getElementById('hbContentArea');",
        "  if (!area) return;",
        "  const inp = document.getElementById('abbrSearchInput');",
        "  const rawQ = inp ? inp.value.trim() : '';",
        "  const q = rawQ.toLowerCase();",
        "  const rows = ABBREVIATIONS_DATA.filter(item => {",
        "    if (currentAbbrCat !== 'ALL' && item.cat !== currentAbbrCat) return false;",
        "    if (!q) return true;",
        "    return (",
        "      item.abbr.toLowerCase().indexOf(q) >= 0 ||",
        "      item.full.toLowerCase().indexOf(q) >= 0 ||",
        "      item.vi.toLowerCase().indexOf(q) >= 0 ||",
        "      item.desc.toLowerCase().indexOf(q) >= 0 ||",
        "      item.sws.toLowerCase().indexOf(q) >= 0",
        "    );",
        "  });",
        "  const badge = document.getElementById('abbrCountBadge');",
        "  if (badge) badge.textContent = rows.length + ' / ' + ABBREVIATIONS_DATA.length + ' thuật ngữ';",
        "  const tbodyHtml = rows.length",
        "    ? rows.map(r =>",
        "        '<tr>' +",
        "          '<td class=\"mono\"><strong>' + highlightSearchMatch(r.abbr, rawQ) + '</strong></td>' +",
        "          '<td>' + highlightSearchMatch(r.full, rawQ) + '</td>' +",
        "          '<td><span class=\"pill-tag pt-cyan\">' + escHtml(r.cat) + '</span> ' + highlightSearchMatch(r.vi, rawQ) + '</td>' +",
        "          '<td>' + highlightSearchMatch(r.desc, rawQ) + '</td>' +",
        "          '<td class=\"mono\">' + highlightSearchMatch(r.sws, rawQ) + '</td>' +",
        "        '</tr>'",
        "      ).join('')",
        "    : '<tr><td colspan=\"5\" style=\"text-align:center;color:var(--mut);padding:16px\">Không tìm thấy thuật ngữ nào khớp với \"' + escHtml(rawQ) + '\".</td></tr>';",
        "  area.innerHTML =",
        "    '<div class=\"hb-card\">' +",
        "      '<h3>7. Bảng Thuật Ngữ &amp; Viết Tắt Chuyên Sâu AUTOSAR NvM (54 Thuật Ngữ)</h3>' +",
        "      '<p>Hỗ trợ tra cứu nhanh theo từ khóa tiếng Anh/Việt, mã lỗi SWS/DEM/DET hoặc lọc theo nhóm chuyên đề Memory Stack.</p>' +",
        "      '<table class=\"tbl\">' +",
        "        '<thead><tr><th>Thuật Ngữ / Ký Hiệu</th><th>Tên Đầy Đủ (AUTOSAR)</th><th>Nhóm &amp; Nghĩa Tiếng Việt</th><th>Giải Thích Kỹ Thuật &amp; Luồng Ảnh Hưởng</th><th>SWS / Tham Chiếu</th></tr></thead>' +",
        "        '<tbody>' + tbodyHtml + '</tbody>' +",
        "      '</table>' +",
        "    '</div>';",
        "}",
        "",
        "function renderCurrentHandbookView() {",
        "  const nav2 = document.getElementById('hbNav2');",
        "  const abbrBox = document.getElementById('hbAbbrFilterBox');",
        "  const area = document.getElementById('hbContentArea');",
        "  if (currentHbTab1 === 6) {",
        "    if (nav2) nav2.classList.add('hidden');",
        "    if (abbrBox) abbrBox.classList.remove('hidden');",
        "    filterAbbreviationTable();",
        "    return;",
        "  }",
        "  if (nav2) nav2.classList.remove('hidden');",
        "  if (abbrBox) abbrBox.classList.add('hidden');",
        "  const tabObj = HANDBOOK_TABS[currentHbTab1] || HANDBOOK_TABS[0];",
        "  if (nav2) {",
        "    nav2.innerHTML = tabObj.subTabs.map((st, idx) =>",
        "      '<button class=\"hb-tab2 ' + (idx === currentHbTab2 ? 'active' : '') + '\" onclick=\"switchHbSubTab(' + idx + ')\">' + escHtml(st.title) + '</button>'",
        "    ).join('');",
        "  }",
        "  const sub = tabObj.subTabs[currentHbTab2] || tabObj.subTabs[0];",
        "  if (area && sub) area.innerHTML = sub.html;",
        "}",
        "",
        "document.addEventListener('DOMContentLoaded', () => {",
        "  initTooltipHandlers();",
        "  loadScenario(0);",
        "  renderCurrentHandbookView();",
        "});",
        "<" + "/script>",
        "</body>",
        "</html>",
        ""
    ]

    out_path = os.path.join(SCRIPT_DIR, "part6_handbook.js")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(js_lines))
    print(f"Generated {out_path} ({len(HANDBOOK_TABS)} main tabs, {sum(len(t['subTabs']) for t in HANDBOOK_TABS)} sub-tabs, {len(HANDBOOK_SVGS)} SVGs)")


if __name__ == "__main__":
    main()
