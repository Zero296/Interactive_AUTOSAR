# -*- coding: utf-8 -*-
"""Generates part6_handbook.js containing the 6x4 AUTOSAR Fee Technical Handbook,
Abbreviation Search & Filter controller, and DOMContentLoaded bootstrap."""

import json
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

from hb_diagrams_fee import get_fee_diagram  # noqa: E402


HANDBOOK_TOPICS = [
    {
        "title": "Tổng Quan & Kiến Trúc Stack",
        "subs": [
            {
                "title": "Vai Trò Fee & EEPROM vs Data Flash",
                "diag": "0-0",
                "html": """
<p><b>AUTOSAR Classic Fee (Flash EEPROM Emulation — Module ID 21)</b> nằm ở tầng <b>ECU Abstraction Layer</b>. Nhiệm vụ cốt lõi là cung cấp một giao diện lưu trữ dữ liệu logic giống EEPROM (đọc/ghi theo từng block kích thước nhỏ bất kỳ) ngay trên bộ nhớ <b>Data Flash (DFlash)</b> vật lý vốn bị giới hạn chỉ xóa được theo từng Sector lớn và chỉ cho phép nạp bit từ <code>1 -&gt; 0</code>.</p>
<h4>So sánh phần cứng EEPROM vs Data Flash</h4>
<table class="tbl">
  <thead><tr><th>Tiêu chí</th><th>External EEPROM (Module Ea)</th><th>MCU Internal DFlash (Module Fee)</th></tr></thead>
  <tbody>
    <tr><td>Đơn vị xóa tối thiểu</td><td>Theo Byte hoặc Page nhỏ (4-64B)</td><td>Theo cả Sector lớn (2KB - 64KB)</td></tr>
    <tr><td>Hao mòn vật lý</td><td>Rất bền tại chỗ (1M cycles/byte)</td><td>Giới hạn P/E cycles/Sector (10k - 250k)</td></tr>
    <tr><td>Chi phí BOM hệ thống</td><td>Tốn chip ngoài + bus SPI/I2C</td><td>Tích hợp sẵn trong MCU -&gt; Tiết kiệm chi phí</td></tr>
    <tr><td>Chiến lược phần mềm</td><td>Ghi trực tiếp (In-place overwrite)</td><td><b>Append-Only + 2-Bank Garbage Collection</b></td></tr>
  </tbody>
</table>
"""
            },
            {
                "title": "Luồng Tương Tác NvM <-> MemIf <-> Fee <-> Fls",
                "diag": "0-1",
                "html": """
<p>Trong stack bộ nhớ AUTOSAR, các module không bao giờ bỏ qua tầng phân cấp:</p>
<ul>
  <li><b>SWC -&gt; RTE -&gt; NvM:</b> Ứng dụng gọi <code>Rte_Call_NvMService_WriteBlock()</code>. NvM tính CRC payload, quản lý hàng đợi ưu tiên và RAM Mirror.</li>
  <li><b>NvM -&gt; MemIf (DeviceIndex = 0):</b> MemIf là lớp định tuyến siêu mỏng (thường dùng Macro/Inline) ánh xạ <code>DeviceIndex = 0</code> xuống <code>Fee_*()</code> (Flash) và <code>DeviceIndex = 1</code> xuống <code>Ea_*()</code> (EEPROM).</li>
  <li><b>Fee -&gt; Fls / MemAcc:</b> Fee chịu trách nhiệm tính địa chỉ vật lý trên Bank đang hoạt động, đóng gói Header + Padding + Trailer và đẩy từng chunk xuống <code>Fls_Write()</code> hoặc <code>MemAcc_Write()</code>.</li>
  <li><b>Callback Ngược (Async Notification):</b> Sau khi <code>Fee_MainFunction()</code> hoàn tất quá trình ghi, Fee gọi <code>Fee_JobEndNotification()</code> trả trạng thái <code>MEMIF_JOB_OK</code> ngược lên NvM.</li>
</ul>
"""
            },
            {
                "title": "EcuM Startup & Kiến Trúc R20 vs R23 MemAcc",
                "diag": "0-2",
                "html": """
<p>Quá trình chuyển giao giữa <b>AUTOSAR R20-11 (Classic Fls)</b> và <b>AUTOSAR R23-11 (MemAcc)</b> được mô phỏng trực tiếp trên Tab 5 (<code>FeeLowerLayerArchitecture</code>):</p>
<ul>
  <li><b>Startup (EcuM_StartupTwo):</b> EcuM gọi đồng bộ <code>Fee_Init(&amp;Fee_Config)</code>. Module chuyển từ <code>MEMIF_UNINIT</code> sang quét 2 Bank DFlash, phát hiện Torn Write nếu có và xây dựng bảng <code>RAM LUT</code> trước khi NvM gọi <code>NvM_ReadAll()</code>.</li>
  <li><b>R20-11 (Classic Fls):</b> Fee giao tiếp thẳng xuống MCAL <code>Fls_Write/Read/Erase()</code>. Chỉ phù hợp hệ thống 1 core truy cập flash.</li>
  <li><b>R23-11 (MemAcc):</b> AUTOSAR tách quản trị vùng địa chỉ và trọng tài bus (Bus Arbitration) vào module <code>MemAcc</code> nằm giữa Fee và Fls Hardware Driver, cho phép nhiều Fee instance hoặc FOTA cùng chia sẻ DFlash an toàn.</li>
</ul>
"""
            },
            {
                "title": "Tệp Tin Cấu Hình ECUC & Build Artifacts",
                "diag": "0-3",
                "html": """
<p>Trình mô phỏng hỗ trợ xuất 4 định dạng chuẩn thực tế thông qua nút <b>📥 Export</b> trên Header:</p>
<table class="tbl">
  <thead><tr><th>Tệp Tin</th><th>Giai Đoạn Build</th><th>Nội Dung Chính</th></tr></thead>
  <tbody>
    <tr><td><code>Fee_EcucValues.arxml</code></td><td>System Configuration</td><td>Lưu trữ toàn bộ container <code>FeeGeneral</code>, <code>FeeBlockConfiguration</code> dạng AUTOSAR XML.</td></tr>
    <tr><td><code>Fee_Cfg.h</code></td><td>Pre-Compile</td><td>Chứa các macro bật tắt API: <code>FEE_DEV_ERROR_DETECT</code>, <code>FEE_VIRTUAL_PAGE_SIZE</code>, <code>FEE_USE_MEMACC_LOWER_LAYER</code>.</td></tr>
    <tr><td><code>Fee_Lcfg.c</code></td><td>Link-Time</td><td>Mảng hằng cấu trúc <code>Fee_BlockConfig[]</code> và <code>Fee_SectorConfig[2]</code>.</td></tr>
    <tr><td><code>Fee_SimConfig.json</code></td><td>Simulator Snapshot</td><td>Xuất toàn bộ 36 thông số mô phỏng hiện hành để lưu trữ hoặc chia sẻ.</td></tr>
  </tbody>
</table>
"""
            }
        ]
    },
    {
        "title": "Giải Phẫu Block & Virtual Page",
        "subs": [
            {
                "title": "Block Header, Alignment Padding & Trailer 0xA5A5",
                "diag": "1-0",
                "html": """
<p>Mỗi khi <code>Fee_Write()</code> lưu một bản ghi mới lên DFlash, không gian vật lý bị tiêu tốn luôn lớn hơn kích thước raw payload do 2 nguyên nhân:</p>
<ol>
  <li><b>Block Header Overhead:</b> Tối thiểu <code>AlignUp(FeeBlockHeaderSize, FeeVirtualPageSize)</code> bytes đầu tiên chứa <code>BlockNumber</code>, <code>BlockSize</code>, <code>WriteSequence</code> và <code>HeaderCRC</code>.</li>
  <li><b>Virtual Page Padding:</b> Phần dữ liệu payload được làm tròn lên bội số của <code>FeeVirtualPageSize</code> bằng các byte <code>FeeErasedValue (0xFF)</code>.</li>
  <li><b>Valid Trailer (0xA5A5):</b> Dấu xác nhận được ghi sau cùng (Phase 3) để đảm bảo tính nguyên tử (Atomic Commit).</li>
</ol>
<p><i>Ví dụ trong trình mô phỏng:</i> <code>Blk#1 (14B)</code> với <code>VP=8B</code> sẽ chiếm <code>8B (Hdr) + 16B (14B data + 2B pad 0xFF) = 24 Bytes</code>.</p>
"""
            },
            {
                "title": "Dataset BlockNumber & RAM LUT Address Cache",
                "diag": "1-1",
                "html": """
<p>AUTOSAR cho phép một NVRAM Block mang nhiều bản sao song song (Dataset DS0, DS1... ví dụ <code>0x0020</code> và <code>0x0021</code>). Bit thấp nhất có độ rộng <code>FeeDatasetSelectionBits</code> dùng để phân biệt index.</p>
<h4>Tại sao RAM LUT Cache quan trọng?</h4>
<ul>
  <li><b>Khi <code>FeeEnableRamLutCache = TRUE</code>:</b> Ngay lúc <code>Fee_Init()</code> quét xong Flash, Fee giữ một bảng băm/mảng trong RAM ánh xạ trực tiếp <code>BlockNumber -&gt; {BankId, Offset, Seq}</code>. Mỗi lần <code>Fee_Read()</code> chỉ mất đúng <b>O(1)</b> để đọc thẳng địa chỉ vật lý.</li>
  <li><b>Khi tắt RAM LUT:</b> Fee phải dò ngược từ cuối tới đầu Active Bank theo từng Header (<code>O(N)</code>), làm tăng đáng kể độ trễ đọc khi Bank gần đầy.</li>
</ul>
"""
            },
            {
                "title": "3-Phase Async Write Pipeline",
                "diag": "1-2",
                "html": """
<p>Trong <code>Fee_MainFunction()</code>, một lệnh ghi luôn được tách thành 3 pha tuần tự để bảo vệ toàn vẹn dữ liệu trước rủi ro ngắt nguồn giữa chừng:</p>
<ul>
  <li><b>Phase 1 (WRITE_HEADER):</b> Ghi thông tin quản lý Header. Bật Bit 7 <code>HDR_WRITTEN</code> (Thanh B).</li>
  <li><b>Phase 2 (WRITE_PAYLOAD):</b> Ghi từng khối dữ liệu theo thông lượng <code>FlsBytesPerCycleSlow</code> (8B/tick) hoặc <code>Fast</code> (64B/tick) cộng thêm byte Padding <code>0xFF</code>. Bật Bit 6 <code>DATA_ALIGNED</code>.</li>
  <li><b>Phase 3 (WRITE_TRAILER):</b> Chỉ khi toàn bộ payload đã nạp khớp trên DFlash, Fee mới ghi Pattern <code>0xA5A5</code> vào Trailer, bật Bit 5 <code>VALID_TRAILR</code>, đánh dấu bản cũ là <code>SUPERSEDED</code> và cập nhật <code>RAM LUT</code>.</li>
</ul>
"""
            },
            {
                "title": "Partial Read (Offset + Length) & Endurance Cycles",
                "diag": "1-3",
                "html": """
<p>Khác với EEPROM cũ buộc đọc cả khối, API <code>Fee_Read(BlockNumber, BlockOffset, DataBufferPtr, Length)</code> cho phép ứng dụng trích xuất chính xác một đoạn dữ liệu con bên trong Block với độ mịn <code>FeeMinimumReadPageSize</code> (thường 1 byte).</p>
<ul>
  <li>Địa chỉ Flash thực tế = <code>BankBase + SlotOffset + HeaderSize + BlockOffset</code>.</li>
  <li>Nếu caller truyền <code>BlockOffset &gt;= FeeBlockSize</code> -&gt; báo DET <code>FEE_E_INVALID_BLOCK_OFS (0x03)</code>.</li>
  <li>Nếu <code>Length == 0</code> hoặc <code>BlockOffset + Length &gt; FeeBlockSize</code> -&gt; báo DET <code>FEE_E_INVALID_BLOCK_LEN (0x05)</code>.</li>
</ul>
"""
            }
        ]
    },
    {
        "title": "2-Bank Wear Leveling & GC",
        "subs": [
            {
                "title": "Cơ Chế Append-Only & Superseded Instance",
                "diag": "2-0",
                "html": """
<p>Vì ô nhớ Flash đã ghi về <code>0</code> không thể viết đè lại lên <code>1</code> nếu chưa Erase toàn bộ Sector, module Fee áp dụng chiến lược <b>Append-Only (Ghi Nối Tiếp)</b>:</p>
<ol>
  <li>Bản ghi mới luôn được cấp phát vào phần cuối còn trống (<code>0xFF</code>) của Active Bank với <code>Seq = Seq_cũ + 1</code>.</li>
  <li>Ngay sau khi Phase 3 hoàn tất, bản ghi cũ trong Bank tự động trở thành rác (<code>SUPERSEDED</code> — Bit 2 Thanh B = 1) và không bao giờ bị xóa đơn lẻ ngay lập tức.</li>
  <li>Lượt mòn được phân bổ đều trên toàn bộ Bank thay vì dồn hết vào 1 địa chỉ cố định.</li>
</ol>
"""
            },
            {
                "title": "Garbage Collection: Copy Valid -> Switch -> Erase",
                "diag": "2-1",
                "html": """
<p>Khi dung lượng đã sử dụng trên Active Bank vượt quá ngưỡng <code>FeeGcTriggerThresholdPct</code> (mặc định <b>75% = 192B/256B</b>), Fee kích hoạt quy trình <b>Garbage Collection (GC)</b> luân phiên 2 Bank:</p>
<ul>
  <li><b>Bước 1 (GC_COPY_VALID):</b> Quét Active Bank (Bank 0) và <b>chỉ copy duy nhất các instance VALID mới nhất</b> sang Standby Bank (Bank 1 đang sạch 0xFF). Toàn bộ slot <code>SUPERSEDED</code> và <code>INVALIDATED</code> bị bỏ lại.</li>
  <li><b>Bước 2 (GC_SWITCH_BANK):</b> Đảo vai trò: Bank 1 chính thức thành <code>ACTIVE BANK</code>, đồng thời cập nhật đồng bộ <code>RAM LUT</code> sang địa chỉ mới.</li>
  <li><b>Bước 3 (GC_ERASE_OLD):</b> Gọi <code>Fls_Erase(Bank 0)</code> kéo dài trong <code>FlsSectorEraseDurationTicks</code> (3 ticks) để đưa Bank 0 về <code>0xFF</code> làm Standby Bank mới và tăng <code>EraseCount++</code>.</li>
</ul>
"""
            },
            {
                "title": "Immediate Data Preemption & Reserved Zone",
                "diag": "2-2",
                "html": """
<p>Theo yêu cầu <b>SWS_Fee_00060</b>, các dữ liệu tối khẩn (ví dụ: sự kiện nổ túi khí Crash Event <code>0x0030</code> cấu hình <code>FeeImmediateData = TRUE</code>) không được phép bị kẹt chờ Garbage Collection kéo dài hàng chục mili-giây.</p>
<ul>
  <li><b>Reserved Immediate Zone:</b> Khoảng dung lượng từ Threshold (75%) tới 100% cuối mỗi Bank (64B) bị khóa cứng đối với Standard Block, chỉ dành riêng cho Immediate Block.</li>
  <li><b>Preemption giữa GC:</b> Khi có lệnh <code>Fee_Write()</code> của Immediate Block xen ngang lúc GC đang chạy, Fee bật Bit 2 <code>IMM_PREEMPT</code> (Thanh A), tạm hoãn GC, ghi nhanh Crash Data vào Reserved Zone của Old Active Bank, rồi khi GC tiếp tục sẽ tự động mang cả Crash Block mới này sang New Bank!</li>
</ul>
"""
            },
            {
                "title": "Background GC vs Foreground Urgent GC",
                "diag": "2-3",
                "html": """
<p>Quá trình Garbage Collection có thể vận hành ở 2 chế độ ảnh hưởng khác nhau tới độ trễ ứng dụng:</p>
<table class="tbl">
  <thead><tr><th>Đặc điểm</th><th>Background GC (<code>MEMIF_BUSY_INTERNAL</code>)</th><th>Foreground Urgent GC</th></tr></thead>
  <tbody>
    <tr><td>Điều kiện kích hoạt</td><td>Chủ động chạy từng tick khi không có user job</td><td>Bị động khi user Standard Write không đủ chỗ</td></tr>
    <tr><td>Trạng thái báo về MemIf</td><td><code>MEMIF_BUSY_INTERNAL</code></td><td><code>MEMIF_BUSY</code> (User Write nằm chờ)</td></tr>
    <tr><td>Độ trễ User Write</td><td>Thấp (không gian luôn được dọn trước)</td><td>Cao (cộng thêm thời gian Copy + Fls_Erase)</td></tr>
  </tbody>
</table>
"""
            }
        ]
    },
    {
        "title": "Torn Write, Phục Hồi & Lỗi",
        "subs": [
            {
                "title": "Mất Điện Giữa Chừng (Torn Write) & Fallback",
                "diag": "3-0",
                "html": """
<p>Một tình huống thực chiến hay gặp trên ô tô là người dùng rút chìa khóa hoặc nguồn ắc-quy sụt áp đúng lúc ECU đang nạp DFlash. Nếu dữ liệu đang ghi giữa Phase 1/2 mà chưa ghi xong Phase 3 Valid Trailer <code>0xA5A5</code>, slot đó gọi là <b>Torn Write</b>.</p>
<ul>
  <li><b>Nhận diện khi Reboot:</b> Trong hàm <code>Fee_Init()</code> lúc khởi động lại, bộ quét kiểm tra Trailer của mọi instance. Bất kỳ slot nào thiếu Pattern <code>0xA5A5</code> hoặc sai HeaderCRC đều bị gắn cờ <code>INCONSISTENT</code> (Bit 0 Thanh B = 1).</li>
  <li><b>Chiến lược Fallback (<code>FeeAutoFallbackPreviousInstance</code>):</b> Nếu bật <code>TRUE</code>, Fee tự lùi tìm bản ghi liền trước hợp lệ (<code>Seq #N-1</code>) đưa vào RAM LUT -&gt; Lần đọc kế tiếp vẫn trả về dữ liệu an toàn trước lúc mất điện! Nếu tắt <code>FALSE</code>, Fee trả <code>MEMIF_BLOCK_INCONSISTENT</code>.</li>
</ul>
"""
            },
            {
                "title": "Xóa Mềm (Fee_InvalidateBlock) & MEMIF_BLOCK_INVALID",
                "diag": "3-1",
                "html": """
<p>Khi muốn xóa logic một tham số đã lưu (ví dụ: Reset DTC History hoặc Reset Adaptive Engine Trim), Fee không xóa tại chỗ mà dùng <code>Fee_InvalidateBlock(BlockNumber)</code>:</p>
<ul>
  <li>Append một header slot mang dấu hiệu <b>Invalidation Marker</b> (Bit 1 <code>INVALIDATED = 1</code> trên Thanh B).</li>
  <li>Bản ghi cũ bị chuyển thành <code>SUPERSEDED</code> và <code>RAM LUT</code> cập nhật trạng thái thành <code>INVALIDATED</code>.</li>
  <li>Mọi lần gọi <code>Fee_Read()</code> sau đó đều trả ngay kết quả <code>MEMIF_BLOCK_INVALID</code>, giúp NvM biết để nạp lại giá trị mặc định từ ROM Default! Đến đợt GC kế tiếp, slot invalidated này được loại bỏ hoàn toàn.</li>
</ul>
"""
            },
            {
                "title": "DET Runtime Guards (Module ID 21) & Fee_Cancel",
                "diag": "3-2",
                "html": """
<p>Khi <code>FeeDevErrorDetect = STD_ON</code>, mọi lời gọi API sai hợp đồng đều bị chặn trước khi xuống DFlash và ghi nhận qua <code>Det_ReportError(21, 0, ApiId, ErrorId)</code>:</p>
<table class="tbl">
  <thead><tr><th>Mã Lỗi DET</th><th>Hex</th><th>Nguyên Nhân Phát Sinh</th></tr></thead>
  <tbody>
    <tr><td><code>FEE_E_UNINIT</code></td><td><code>0x01</code></td><td>Gọi Read/Write/Invalidate/SetMode trước <code>Fee_Init()</code>.</td></tr>
    <tr><td><code>FEE_E_INVALID_BLOCK_NO</code></td><td><code>0x02</code></td><td>BlockNumber = <code>0x0000</code>, <code>0xFFFF</code> hoặc không có trong cấu hình.</td></tr>
    <tr><td><code>FEE_E_INVALID_BLOCK_OFS</code></td><td><code>0x03</code></td><td><code>BlockOffset &gt;= FeeBlockSize</code>.</td></tr>
    <tr><td><code>FEE_E_PARAM_POINTER</code></td><td><code>0x04</code></td><td>Con trỏ Buffer là <code>NULL_PTR</code>.</td></tr>
    <tr><td><code>FEE_E_INVALID_BLOCK_LEN</code></td><td><code>0x05</code></td><td><code>Length == 0</code> hoặc tràn qua cuối Block.</td></tr>
    <tr><td><code>FEE_E_BUSY</code></td><td><code>0x06</code></td><td>Gửi lệnh mới khi module đang <code>MEMIF_BUSY</code>.</td></tr>
    <tr><td><code>FEE_E_INVALID_CANCEL</code></td><td><code>0x08</code></td><td>Gọi <code>Fee_Cancel()</code> lúc module đang rảnh <code>MEMIF_IDLE</code>.</td></tr>
  </tbody>
</table>
"""
            },
            {
                "title": "DEM Hardware Faults: Write Verify, Erase & ECC",
                "diag": "3-3",
                "html": """
<p>Khác với DET (lỗi phần mềm lúc phát triển), <b>DEM (Diagnostic Event Manager)</b> bắt các sự cố phần cứng sản xuất phát sinh ngoài thực địa khi xe vận hành lâu năm:</p>
<ul>
  <li><b>Flash Write Verify Failed:</b> Sau khi nạp dữ liệu, phần cứng đọc lại không khớp RAM buffer -&gt; <code>Fls</code> trả <code>MEMIF_JOB_FAILED</code> -&gt; Fee gọi <code>Dem_SetEventStatus(FEE_E_FLS_WRITE_FAILED, FAILED)</code> và phát <code>Fee_JobErrorNotification()</code>.</li>
  <li><b>GC Erase Failure:</b> Ô nhớ đã vượt ngưỡng hao mòn <code>FeeMaxEraseCyclesPerSector</code> khiến <code>Fls_Erase()</code> thất bại -&gt; Sector bị khóa sang trạng thái <code>SECTOR_CORRUPT_DEM</code>.</li>
  <li><b>Uncorrectable ECC Double-Bit Flip:</b> Khi đọc Payload gặp lỗi ECC 2 bit không sửa được -&gt; Fee lập tức hủy đọc, trả <code>MEMIF_BLOCK_INCONSISTENT</code> lên NvM và báo DEM.</li>
</ul>
"""
            }
        ]
    },
    {
        "title": "State Machines & Bit Registers",
        "subs": [
            {
                "title": "Fee Module & Async Job State Machine",
                "diag": "4-0",
                "html": """
<p>Trình mô phỏng theo dõi đồng thời máy trạng thái module trả ra qua <code>Fee_GetStatus()</code> và kết quả Job qua <code>Fee_GetJobResult()</code>:</p>
<ul>
  <li><code>MEMIF_UNINIT</code>: Trạng thái mặc định sau Reset (hoặc vừa sập nguồn), chỉ thoát bằng <code>Fee_Init()</code>.</li>
  <li><code>MEMIF_IDLE</code>: Đã hoàn tất quét Flash, sẵn sàng nhận mọi API Read/Write/Invalidate/SetMode.</li>
  <li><code>MEMIF_BUSY</code>: Đang xử lý yêu cầu từ NvM/MemIf.</li>
  <li><code>MEMIF_BUSY_INTERNAL</code>: Đang thực hiện Garbage Collection nền nội bộ; NvM vẫn có thể quan sát trạng thái bận nội bộ hoặc gửi Immediate Write xen ngang.</li>
</ul>
"""
            },
            {
                "title": "Flash Sector & Block Lifecycle State Machine",
                "diag": "4-1",
                "html": """
<p>Song song với trạng thái phần mềm Fee là vòng đời phần cứng của hai Logical Bank (<code>Bank 0</code> &amp; <code>Bank 1</code>):</p>
<ol>
  <li><code>ACTIVE_NORMAL</code>: Tiếp nhận append các instance mới tới giới hạn Threshold.</li>
  <li><code>GC_COPYING_TO_STANDBY</code>: Đang chép từng bản VALID sang Bank dự phòng.</li>
  <li><code>GC_ERASING_OLD_BANK</code>: Đã chuyển Active Bank sang đích mới, đang gọi <code>Fls_Erase()</code> xóa Bank cũ.</li>
  <li><code>IMMEDIATE_PREEMPT_ZONE</code>: Vùng đệm Reserved đang được Immediate Block chiếm dụng khẩn cấp.</li>
  <li><code>SECTOR_CORRUPT_DEM</code>: Sector hỏng phần cứng không thể xóa an toàn.</li>
</ol>
"""
            },
            {
                "title": "Thanh Ghi A: Fee_ModuleControlByte (8 Bits)",
                "diag": "4-2",
                "html": """
<p>Thanh ghi ảo 8-bit <b>Thanh A (<code>Fee_ModuleControlByte</code>)</b> cô đọng toàn bộ trạng thái vận hành của module Fee (có thể click trực tiếp từng bit trên màn hình mô phỏng để kiểm tra phản ứng):</p>
<table class="tbl">
  <thead><tr><th>Bit</th><th>Tên Cờ</th><th>Mask</th><th>Ý Nghĩa Thực Thi</th></tr></thead>
  <tbody>
    <tr><td><b>B7</b></td><td><code>FEE_INIT</code></td><td><code>0x80</code></td><td>Đã hoàn tất <code>Fee_Init()</code> &amp; dựng LUT (<code>0</code> = <code>MEMIF_UNINIT</code>).</td></tr>
    <tr><td><b>B6</b></td><td><code>FEE_BUSY</code></td><td><code>0x40</code></td><td>Có User Job (Read/Write/Invalidate) đang chạy.</td></tr>
    <tr><td><b>B5</b></td><td><code>FEE_BUSY_INT</code></td><td><code>0x20</code></td><td>Đang bận nội bộ (Garbage Collection / Repair).</td></tr>
    <tr><td><b>B4</b></td><td><code>FAST_MODE</code></td><td><code>0x10</code></td><td><code>1</code> = <code>MEMIF_MODE_FAST</code> (64B/tick); <code>0</code> = <code>SLOW</code> (8B/tick).</td></tr>
    <tr><td><b>B3</b></td><td><code>GC_ACTIVE</code></td><td><code>0x08</code></td><td>Đang thực hiện Copy Valid hoặc Fls_Erase() chuyển Bank.</td></tr>
    <tr><td><b>B2</b></td><td><code>IMM_PREEMPT</code></td><td><code>0x04</code></td><td>Immediate Block đang tạm hoãn GC để ghi khẩn.</td></tr>
    <tr><td><b>B1</b></td><td><code>JOB_ERR_PEND</code></td><td><code>0x02</code></td><td>Job gần nhất kết thúc với lỗi/bị hủy (<code>FAILED/INCONSISTENT/CANCELED</code>).</td></tr>
    <tr><td><b>B0</b></td><td><code>JOB_OK_DONE</code></td><td><code>0x01</code></td><td>Job gần nhất hoàn thành sạch sẽ (<code>MEMIF_JOB_OK</code>).</td></tr>
  </tbody>
</table>
"""
            },
            {
                "title": "Thanh Ghi B: Fee_BlockHeaderStatusByte (8 Bits)",
                "diag": "4-3",
                "html": """
<p>Thanh ghi ảo 8-bit <b>Thanh B (<code>Fee_BlockHeaderStatusByte</code>)</b> phản ánh giải phẫu trạng thái của đúng Instance Slot đang được chọn soi trên Flash Map:</p>
<table class="tbl">
  <thead><tr><th>Bit</th><th>Tên Cờ</th><th>Mask</th><th>Ý Nghĩa Slot Flash</th></tr></thead>
  <tbody>
    <tr><td><b>B7</b></td><td><code>HDR_WRITTEN</code></td><td><code>0x80</code></td><td>Phase 1 Block Header đã nạp thành công xuống DFlash.</td></tr>
    <tr><td><b>B6</b></td><td><code>DATA_ALIGNED</code></td><td><code>0x40</code></td><td>Phase 2 Payload + Virtual Page Padding đã ghi đủ.</td></tr>
    <tr><td><b>B5</b></td><td><code>VALID_TRAILR</code></td><td><code>0x20</code></td><td>Phase 3 Valid Trailer <code>0xA5A5</code> đã xác nhận (không phải Torn Write).</td></tr>
    <tr><td><b>B4</b></td><td><code>IMM_BLOCK</code></td><td><code>0x10</code></td><td>Khối dữ liệu khẩn cấp (<code>FeeImmediateData = TRUE</code>).</td></tr>
    <tr><td><b>B3</b></td><td><code>LUT_CACHED</code></td><td><code>0x08</code></td><td>Địa chỉ slot đang được giữ trong bảng tra nhanh RAM LUT.</td></tr>
    <tr><td><b>B2</b></td><td><code>SUPERSEDED</code></td><td><code>0x04</code></td><td>Phiên bản cũ đã lỗi thời, GC sẽ loại bỏ.</td></tr>
    <tr><td><b>B1</b></td><td><code>INVALIDATED</code></td><td><code>0x02</code></td><td>Bị xóa mềm qua <code>Fee_InvalidateBlock()</code>.</td></tr>
    <tr><td><b>B0</b></td><td><code>INCONSISTENT</code></td><td><code>0x01</code></td><td>Torn Write (thiếu Trailer) hoặc hỏng ECC.</td></tr>
  </tbody>
</table>
"""
            }
        ]
    },
    {
        "title": "API Reference & Tuning Guide",
        "subs": [
            {
                "title": "Danh Sách Đầy Đủ AUTOSAR Fee Standard APIs",
                "diag": "5-0",
                "html": """
<p>Tất cả tên hàm dưới đây tuân thủ đặc tả <b>AUTOSAR SWS_Fee (R20-11 &amp; R23-11)</b>:</p>
<table class="tbl">
  <thead><tr><th>API Hàm Chuẩn</th><th>Loại</th><th>Chức Năng Chính</th></tr></thead>
  <tbody>
    <tr><td><code>Fee_Init(ConfigPtr)</code></td><td>Sync Init</td><td>Quét 2 Bank DFlash, phục hồi Torn Write &amp; dựng RAM LUT.</td></tr>
    <tr><td><code>Fee_SetMode(Mode)</code></td><td>Sync Ctrl</td><td>Chuyển <code>MEMIF_MODE_SLOW</code> <-> <code>MEMIF_MODE_FAST</code>.</td></tr>
    <tr><td><code>Fee_Read(Blk, Ofs, Buf, Len)</code></td><td>Async Job</td><td>Đọc toàn bộ hoặc một lát Offset+Length từ DFlash lên RAM.</td></tr>
    <tr><td><code>Fee_Write(Blk, DataBufferPtr)</code></td><td>Async Job</td><td>Append bản ghi mới theo pipeline 3 pha (Header -&gt; Data -&gt; Trailer).</td></tr>
    <tr><td><code>Fee_InvalidateBlock(Blk)</code></td><td>Async Job</td><td>Ghi Invalidation Marker để lần đọc sau trả <code>MEMIF_BLOCK_INVALID</code>.</td></tr>
    <tr><td><code>Fee_EraseImmediateBlock(Blk)</code></td><td>Async Prep</td><td>Dọn sẵn vùng Reserved Immediate Zone cho dữ liệu va chạm.</td></tr>
    <tr><td><code>Fee_Cancel()</code></td><td>Sync Abort</td><td>Hủy user job đang <code>MEMIF_BUSY</code> -&gt; <code>MEMIF_JOB_CANCELED</code>.</td></tr>
    <tr><td><code>Fee_GetStatus() / Fee_GetJobResult()</code></td><td>Sync Query</td><td>Kiểm tra trạng thái module và kết quả job cho NvM/MemIf polling.</td></tr>
    <tr><td><code>Fee_MainFunction()</code></td><td>Cyclic (5ms)</td><td>Máy bơm thực thi từng chunk Write/Read/Garbage Collection.</td></tr>
  </tbody>
</table>
"""
            },
            {
                "title": "Cân Bằng Slow Mode vs Fast Mode Throughput",
                "diag": "5-1",
                "html": """
<p>Thông số tốc độ mỗi chu kỳ <code>Fee_MainFunction()</code> quyết định trực tiếp CPU load lúc xe chạy vs thời gian tắt máy (Shutdown Time):</p>
<ul>
  <li><b>MEMIF_MODE_SLOW (Mặc định khi chạy xe):</b> Giới hạn khoảng <code>8 B/tick</code> để không chiếm dụng lâu bus SPI/Flash hay gây jitter cho ngắt động cơ. Một block <code>32B</code> cần <code>32 / 8 = 4 ticks = 20ms</code>.</li>
  <li><b>MEMIF_MODE_FAST (Khi EcuM Shutdown / NvM_WriteAll):</b> Đẩy lên <code>64 B/tick</code> (hoặc 128B/tick), giúp chính block <code>32B</code> đó ghi xong trong chỉ <b>1 tick = 5ms</b> (nhanh gấp 4 lần), đảm bảo lưu hết toàn bộ Odometer và Error Memory trước khi tắt rơ-le nguồn chính ECU!</li>
</ul>
"""
            },
            {
                "title": "Tính Toán Dung Lượng Sector & Hệ Số Hao Mòn",
                "diag": "5-2",
                "html": """
<p>Khi thiết kế cấu hình Fee cho một dự án ECU thực tế, kỹ sư Memory Stack phải kiểm chứng bài toán <b>Endurance Sizing</b>:</p>
<ol>
  <li>Tính tổng dung lượng cần lưu đồng thời ít nhất 1 bản <code>VALID</code> cho tất cả <code>N</code> Block: <code>Sum(SlotSize_i)</code>.</li>
  <li>Đảm bảo <code>BankSize * (GcThreshold / 100) &gt;&gt; Sum(SlotSize_i)</code>. Nếu <code>Sum(SlotSize_i)</code> quá sát ngưỡng Threshold, Fee sẽ rơi vào vòng lặp <b>GC Thrashing</b> (vừa mới GC xong đã chạm ngưỡng lại phải GC tiếp)!</li>
  <li>Luôn giữ <code>Bank0Size == Bank1Size</code> và chừa tối thiểu vùng <code>ReservedImmediateSpaceBytes &gt;= Sum(ImmediateSlots)</code>.</li>
</ol>
"""
            },
            {
                "title": "Checklist Kiểm Thử Thực Chiến & Debug Pitfalls",
                "diag": "5-3",
                "html": """
<p>Danh sách các lỗi thường gặp trong thực tế dự án và cách dùng Trình Mô Phỏng này để kiểm chứng:</p>
<ul>
  <li><b>Pitfall 1 — Quên gọi <code>Fee_SetMode(FAST)</code> trước <code>NvM_WriteAll()</code>:</b> Khiến ECU hết pin tụ nguồn trước khi kịp lưu dữ liệu -&gt; thử ngay Kịch bản <b>S9</b>!</li>
  <li><b>Pitfall 2 — Chọn <code>FeeVirtualPageSize</code> quá lớn (ví dụ 32B) cho các Block nhỏ 8B:</b> Gây lãng phí tới 75% DFlash cho byte padding <code>0xFF</code> -&gt; thử đổi Tab 2 Page Size trên mô phỏng để thấy dung lượng tăng vọt!</li>
  <li><b>Pitfall 3 — Chưa test Power-Cut đúng Phase 2:</b> Bỏ sót cấu hình Fallback khiến Odometer mất trắng về 0 sau khi rút cọc bình -&gt; chạy Kịch bản <b>S7</b>!</li>
</ul>
"""
            }
        ]
    }
]


def build_handbook_payload():
    data = []
    for main_idx, tab in enumerate(HANDBOOK_TOPICS):
        subs_out = []
        for sub_idx, sub in enumerate(tab["subs"]):
            svg = get_fee_diagram(sub["diag"])
            subs_out.append({
                "title": sub["title"],
                "contentHtml": f"""
<div class="hb-card">
  <h3>{sub["title"]}</h3>
  {svg}
  <div style="margin-top:10px">{sub["html"]}</div>
</div>
"""
            })
        data.append({
            "title": tab["title"],
            "subs": subs_out
        })
    return data


def main():
    hb_data = build_handbook_payload()
    hb_json = json.dumps(hb_data, ensure_ascii=False, indent=2)

    js_output = f"""// ============================================================================
// PART 6: GENERATED HANDBOOK (6x4 TOPICS + SVGs), ABBREVIATIONS & BOOTSTRAP
// ============================================================================

const HANDBOOK_DATA = {hb_json};

let hbState = {{
  mainTab: 0,
  subTab: 0,
  abbrCat: 'ALL'
}};

function switchHbTab1(idx) {{
  hbState.mainTab = idx;
  hbState.subTab = 0;
  for (let i = 0; i < 7; i++) {{
    const btn = getEl(`hbTab1_${{i}}`);
    if (btn) btn.classList.toggle('active', i === idx);
  }}
  renderCurrentHandbookView();
}}

function switchHbTab2(subIdx) {{
  hbState.subTab = subIdx;
  renderCurrentHandbookView();
}}

function renderHbSubNav() {{
  const nav2 = getEl('hbNav2');
  const abbrBar = getEl('hbAbbrFilterBox');
  if (hbState.mainTab === 6) {{
    if (nav2) nav2.classList.add('hidden');
    if (abbrBar) abbrBar.classList.remove('hidden');
    return;
  }}
  if (abbrBar) abbrBar.classList.add('hidden');
  if (!nav2) return;
  const tab = HANDBOOK_DATA[hbState.mainTab];
  if (!tab) return;
  nav2.classList.remove('hidden');
  nav2.innerHTML = tab.subs
    .map((s, idx) => `<button class="hb-tab2 ${{idx === hbState.subTab ? 'active' : ''}}" onclick="switchHbTab2(${{idx}})">${{idx + 1}}. ${{escapeHtml(s.title)}}</button>`)
    .join('');
}}

function renderCurrentHandbookView() {{
  if (typeof document === 'undefined') return;
  renderHbSubNav();
  const area = getEl('hbContentArea');
  if (!area) return;

  if (hbState.mainTab === 6) {{
    renderAbbreviationTable();
    return;
  }}
  const tab = HANDBOOK_DATA[hbState.mainTab];
  const sub = tab && tab.subs[hbState.subTab];
  if (sub) {{
    area.innerHTML = sub.contentHtml;
  }}
}}

function setAbbrCategory(cat) {{
  hbState.abbrCat = cat;
  ['ALL', 'CORE', 'GC', 'STACK', 'HW'].forEach((c) => {{
    const p = getEl(`catPill_${{c}}`);
    if (p) p.classList.toggle('active', c === cat);
  }});
  renderAbbreviationTable();
}}

function filterAbbreviationTable() {{
  renderAbbreviationTable();
}}

function highlightTerm(text, query) {{
  const safe = escapeHtml(text);
  if (!query) return safe;
  const escapedRe = query.replace(/[.*+?^${{}}()|[\\]\\\\]/g, '\\\\$&');
  return safe.replace(new RegExp(`(${{escapedRe}})`, 'gi'), '<mark>$1</mark>');
}}

function renderAbbreviationTable() {{
  if (typeof document === 'undefined') return;
  const area = getEl('hbContentArea');
  if (!area || hbState.mainTab !== 6) return;

  const input = getEl('abbrSearchInput');
  const query = input ? input.value.trim().toLowerCase() : '';
  const filtered = ABBREVIATIONS.filter((item) => {{
    const catOk = hbState.abbrCat === 'ALL' || item.cat === hbState.abbrCat;
    if (!catOk) return false;
    if (!query) return true;
    return (
      item.abbr.toLowerCase().includes(query) ||
      item.full.toLowerCase().includes(query) ||
      item.desc.toLowerCase().includes(query) ||
      item.cat.toLowerCase().includes(query)
    );
  }});

  const countBadge = getEl('abbrCountBadge');
  if (countBadge) countBadge.textContent = `${{filtered.length}} thuật ngữ`;

  const rowsHtml = filtered
    .map((item) => `
      <tr>
        <td class="mono"><b>${{highlightTerm(item.abbr, query)}}</b></td>
        <td><b>${{highlightTerm(item.full, query)}}</b></td>
        <td><span class="pill pill-cyan">${{escapeHtml(item.cat)}}</span></td>
        <td>${{highlightTerm(item.desc, query)}}</td>
      </tr>`)
    .join('');

  area.innerHTML = `
    <div class="hb-card">
      <h3>Bảng Tra Cứu Thuật Ngữ AUTOSAR Fee &amp; Flash Stack (${{filtered.length}}/${{ABBREVIATIONS.length}})</h3>
      <table class="tbl">
        <thead>
          <tr><th style="width:110px">Viết tắt</th><th style="width:240px">Tên Đầy Đủ</th><th style="width:90px">Nhóm</th><th>Giải Thích Chi Tiết</th></tr>
        </thead>
        <tbody>
          ${{rowsHtml || '<tr><td colspan="4" style="text-align:center;color:var(--mut)">Không tìm thấy thuật ngữ phù hợp.</td></tr>'}}
        </tbody>
      </table>
    </div>`;
}}

// ============================================================================
// BOOTSTRAP ON DOM READY
// ============================================================================
if (typeof document !== 'undefined') {{
  document.addEventListener('DOMContentLoaded', () => {{
    setupConfigTooltips();
    loadScenarioByIndex(0, 0);
    switchCfgTab(0);
    switchInspTab(0);
  }});
}}
</script>
</body>
</html>
"""

    out_path = os.path.join(SCRIPT_DIR, "part6_handbook.js")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(js_output)
    print(f"Generated {out_path} cleanly ({len(hb_data)} main tabs, {sum(len(t['subs']) for t in hb_data)} sub-topics).")


if __name__ == "__main__":
    main()
