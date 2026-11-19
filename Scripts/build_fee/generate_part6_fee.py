# -*- coding: utf-8 -*-
"""Generates part6_handbook.js containing the 6x4 AUTOSAR Fee Technical Handbook
with AUTOSAR R25-11 SWS_ID strips, Abbreviation Search & Filter controller,
and DOMContentLoaded bootstrap."""

import html
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
                "swsRefs": [
                    {"id": "SWS_Fee_00076", "desc": "Virtual page alignment (>= physical page)"},
                    {"id": "SWS_Fee_00005", "desc": "Block size aligns to integer virtual pages"},
                    {"id": "SWS_Fee_00102", "desc": "Uniform wear leveling across clusters"},
                    {"id": "SWS_Fee_00153", "desc": "Data integrity & atomicity guarantees"},
                ],
                "html": """
<p><b>AUTOSAR Classic Fee (Flash EEPROM Emulation — Module ID 21)</b> nằm ở tầng <b>ECU Abstraction Layer</b>. Nhiệm vụ cốt lõi là cung cấp giao diện lưu trữ dữ liệu logic giống EEPROM (đọc/ghi theo từng block kích thước nhỏ bất kỳ) ngay trên bộ nhớ <b>Data Flash (DFlash)</b> vật lý vốn bị giới hạn chỉ xóa được theo từng Sector/Cluster lớn và chỉ cho phép nạp bit từ <code>1 -&gt; 0</code>.</p>
<h4>So sánh phần cứng EEPROM vs Data Flash</h4>
<table class="tbl">
  <thead><tr><th>Tiêu chí</th><th>External EEPROM (Module Ea)</th><th>MCU Internal DFlash (Module Fee)</th></tr></thead>
  <tbody>
    <tr><td>Đơn vị xóa tối thiểu</td><td>Theo Byte hoặc Page nhỏ (4-64B)</td><td>Theo cả Sector lớn (2KB - 64KB)</td></tr>
    <tr><td>Hao mòn vật lý</td><td>Rất bền tại chỗ (1M cycles/byte)</td><td>Giới hạn P/E cycles/Sector (10k - 250k)</td></tr>
    <tr><td>Chi phí BOM hệ thống</td><td>Tốn chip ngoài + bus SPI/I2C</td><td>Tích hợp sẵn trong MCU -&gt; Tiết kiệm chi phí</td></tr>
    <tr><td>Chiến lược phần mềm</td><td>Ghi trực tiếp (In-place overwrite)</td><td><b>Append-Only + 2-Bank Garbage Collection [SWS_Fee_00102]</b></td></tr>
  </tbody>
</table>
"""
            },
            {
                "title": "Luồng Tương Tác NvM <-> MemIf <-> Fee <-> Fls",
                "diag": "0-1",
                "swsRefs": [
                    {"id": "SWS_Fee_00105", "desc": "Upper-layer MemIf & NvM interfaces"},
                    {"id": "SWS_Fee_00104", "desc": "Lower-layer MemAcc / Mem driver interface"},
                    {"id": "SWS_Fee_00095", "desc": "Unified Fee_JobEndNotification callback"},
                    {"id": "SWS_Fee_00194", "desc": "Inspect MemAcc_GetJobResult & notify NvM"},
                    {"id": "SWS_Fee_00055", "desc": "NvM_JobEndNotification on MEMIF_JOB_OK"},
                ],
                "html": """
<p>Trong stack bộ nhớ AUTOSAR, các module giao tiếp nghiêm ngặt qua giao diện chuẩn <b>[SWS_Fee_00104 / SWS_Fee_00105]</b>:</p>
<ul>
  <li><b>SWC -&gt; RTE -&gt; NvM:</b> Ứng dụng gọi <code>Rte_Call_NvMService_WriteBlock()</code>. NvM tính CRC payload, quản lý hàng đợi ưu tiên và RAM Mirror.</li>
  <li><b>NvM -&gt; MemIf (DeviceIndex = 0):</b> MemIf là lớp định tuyến siêu mỏng (Macro/Inline) ánh xạ <code>DeviceIndex = 0</code> xuống <code>Fee_*()</code> (Flash) và <code>DeviceIndex = 1</code> xuống <code>Ea_*()</code> (EEPROM).</li>
  <li><b>Fee -&gt; MemAcc / Fls:</b> Fee quản lý bảng địa chỉ ảo 32-bit, đóng gói Header + Padding + Trailer và đẩy lệnh xuống <code>MemAcc_Write()</code> (R23-11/R25-11) hoặc <code>Fls_Write()</code> (R20-11).</li>
  <li><b>Unified Async Notification [SWS_Fee_00095 / SWS_Fee_00194]:</b> Ở R25-11, chỉ còn một callback thống nhất <code>Fee_JobEndNotification(AddressAreaId, JobResult)</code> từ MemAcc (thay cho cặp <code>JobEnd</code>/<code>JobError</code> riêng lẻ trước đây). Fee kiểm tra kết quả rồi phát <code>NvM_JobEndNotification()</code> <b>[SWS_Fee_00055]</b> hoặc <code>NvM_JobErrorNotification()</code> <b>[SWS_Fee_00056]</b>.</li>
</ul>
"""
            },
            {
                "title": "EcuM Startup & Kiến Trúc R20 vs R23/R25 MemAcc",
                "diag": "0-2",
                "swsRefs": [
                    {"id": "SWS_Fee_00085", "desc": "Fee_Init(ConfigPtr) synchronous startup API"},
                    {"id": "SWS_Fee_00120", "desc": "Fee_Init sets MEMIF_UNINIT -> MEMIF_BUSY_INTERNAL"},
                    {"id": "SWS_Fee_00197", "desc": "Fee_MainFunction ends init/internal -> MEMIF_IDLE"},
                    {"id": "ECUC_Fee_00155", "desc": "FeeMemAccAddressArea reference (R23/R25)"},
                ],
                "html": """
<p>Quá trình khởi động và chuyển giao kiến trúc từ <b>AUTOSAR R20-11 (Classic Fls)</b> lên <b>AUTOSAR R23-11 / R25-11 (MemAcc)</b> được mô phỏng trực tiếp trên Tab 5 (<code>FeeLowerLayerArchitecture</code>):</p>
<ul>
  <li><b>Startup 2 Bước [SWS_Fee_00120 -&gt; SWS_Fee_00197]:</b> <code>EcuM</code> gọi đồng bộ <code>Fee_Init(&amp;Fee_Config)</code> <b>[SWS_Fee_00085]</b>, đưa module từ <code>MEMIF_UNINIT</code> sang <b><code>MEMIF_BUSY_INTERNAL</code></b> <b>[SWS_Fee_00120]</b>. Sau đó <code>Fee_MainFunction()</code> quét 2 Bank DFlash, phát hiện/phục hồi Torn Write, dựng bảng <code>RAM LUT</code> rồi mới chuyển về <code>MEMIF_IDLE</code> <b>[SWS_Fee_00197]</b> (tuy nhiên <code>Fee_Read/Write</code> vẫn được chấp nhận ngay trong lúc <code>MEMIF_BUSY_INTERNAL</code>).</li>
  <li><b>R20-11 (Classic Fls):</b> Fee giao tiếp thẳng xuống MCAL <code>Fls_Write/Read/Erase()</code> và hỗ trợ <code>Fee_SetMode()</code> chuyển đổi tốc độ <code>SLOW/FAST</code>.</li>
  <li><b>R23-11 / R25-11 (MemAcc):</b> AUTOSAR tách quản trị vùng địa chỉ (<code>FeeMemAccAddressArea</code> <b>[ECUC_Fee_00155]</b>) và trọng tài bus (Bus Arbitration) vào module <code>MemAcc</code> nằm giữa Fee và <code>Mem</code> Driver, đồng thời loại bỏ <code>Fee_SetMode()</code> để nhiều tác nhân (Fee + FOTA) dùng chung Flash an toàn.</li>
</ul>
"""
            },
            {
                "title": "Tệp Tin Cấu Hình ECUC & Build Artifacts",
                "diag": "0-3",
                "swsRefs": [
                    {"id": "ECUC_Fee_00154", "desc": "Fee module def (VARIANT-PRE-COMPILE only)"},
                    {"id": "ECUC_Fee_00039", "desc": "FeeGeneral configuration container"},
                    {"id": "ECUC_Fee_00040", "desc": "FeeBlockConfiguration container"},
                    {"id": "ECUC_Fee_00043", "desc": "FeePublishedInformation read-only overhead params"},
                ],
                "html": """
<p>Trình mô phỏng hỗ trợ xuất 4 định dạng chuẩn thực tế thông qua nút <b>📥 Export</b> trên Header:</p>
<table class="tbl">
  <thead><tr><th>Tệp Tin</th><th>Giai Đoạn Build</th><th>Nội Dung Chính</th></tr></thead>
  <tbody>
    <tr><td><code>Fee_EcucValues.arxml</code></td><td>System Configuration (<code>VARIANT-PRE-COMPILE</code> <b>[ECUC_Fee_00154]</b>)</td><td>Lưu trữ container <code>FeeGeneral</code> <b>[ECUC_Fee_00039]</b>, <code>FeeBlockConfiguration</code> <b>[ECUC_Fee_00040]</b> và <code>FeeMinimumReadPageSize</code> <b>[ECUC_Fee_00156]</b>.</td></tr>
    <tr><td><code>Fee_Cfg.h</code></td><td>Pre-Compile</td><td>Macro cấu hình: <code>FEE_DEV_ERROR_DETECT</code>, <code>FEE_VIRTUAL_PAGE_SIZE</code>, <code>FEE_MINIMUM_READ_PAGE_SIZE</code>, <code>FEE_USE_MEMACC_LOWER_LAYER</code>.</td></tr>
    <tr><td><code>Fee_Lcfg.c</code></td><td>Compiled Table (Mô phỏng)</td><td>Minh họa bảng hằng <code>Fee_BlockConfig[]</code> và <code>Fee_SectorConfig[2]</code> biên dịch từ ARXML (<i>Lưu ý R25-11 [ECUC_Fee_00154]: chuẩn chính thức chỉ dùng Pre-Compile variant</i>).</td></tr>
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
                "swsRefs": [
                    {"id": "SWS_Fee_00076", "desc": "Virtual page >= physical flash page size"},
                    {"id": "SWS_Fee_00005", "desc": "Logical block occupies integer multiple of VP"},
                    {"id": "SWS_Fee_00195", "desc": "Buffer alignment constraint (FeeBufferAlignmentValue)"},
                    {"id": "ECUC_Fee_00116", "desc": "FeeVirtualPageSize parameter"},
                    {"id": "ECUC_Fee_00117", "desc": "FeeBlockOverhead published info"},
                    {"id": "ECUC_Fee_00118", "desc": "FeePageOverhead published info"},
                ],
                "html": """
<p>Mỗi khi <code>Fee_Write()</code> lưu một bản ghi mới lên DFlash, dung lượng vật lý bị tiêu tốn luôn lớn hơn kích thước raw payload. Đặc tả AUTOSAR chuẩn hóa nguyên tắc căn trang ảo <b>[SWS_Fee_00076 / SWS_Fee_00005]</b> và khai báo overhead qua <code>FeePublishedInformation</code> <b>[ECUC_Fee_00117 / ECUC_Fee_00118]</b> (bố cục bit chi tiết của Header/Trailer do từng nhà cung cấp BSW quy định):</p>
<ol>
  <li><b>Block Header Overhead [ECUC_Fee_00117]:</b> Tối thiểu <code>AlignUp(FeeBlockHeaderSize, FeeVirtualPageSize)</code> bytes đầu tiên chứa <code>BlockNumber</code>, <code>BlockSize</code>, <code>WriteSequence</code> và <code>HeaderCRC</code>.</li>
  <li><b>Virtual Page Padding [SWS_Fee_00005]:</b> Phần payload được làm tròn lên bội số của <code>FeeVirtualPageSize</code> <b>[ECUC_Fee_00116]</b> bằng các byte trống <code>FeeErasedValue (0xFF)</code>.</li>
  <li><b>Valid Trailer (Mô phỏng 0xA5A5):</b> Dấu xác nhận ghi sau cùng (Phase 3) để đảm bảo tính nguyên tử (Atomic Commit).</li>
</ol>
<p><i>Ví dụ trong trình mô phỏng:</i> <code>Blk#1 (14B)</code> với <code>VP=8B</code> chiếm <code>8B (Hdr) + 16B (14B data + 2B pad 0xFF) = 24 Bytes</code>.</p>
"""
            },
            {
                "title": "Dataset BlockNumber & RAM LUT Address Cache",
                "diag": "1-1",
                "swsRefs": [
                    {"id": "SWS_Fee_00006", "desc": "Block numbers 0x0000 and 0xFFFF prohibited"},
                    {"id": "SWS_Fee_00007", "desc": "Linear address calculation from BlockNumber/Dataset"},
                    {"id": "SWS_Fee_00100", "desc": "Virtual 32-bit block numbering & dataset encoding"},
                    {"id": "ECUC_Fee_00150", "desc": "FeeBlockNumber ECUC config parameter"},
                    {"id": "ECUC_Fee_00148", "desc": "FeeBlockSize ECUC config parameter"},
                ],
                "html": """
<p>AUTOSAR quy định số thứ tự Block <code>FeeBlockNumber</code> <b>[ECUC_Fee_00150]</b> tuyệt đối <b>không được dùng <code>0x0000</code> hoặc <code>0xFFFF</code></b> <b>[SWS_Fee_00006]</b> (dành làm mã nhận diện flash xóa trắng hoặc header hỏng). Với Dataset Block, các bit thấp nhất (<code>FeeDatasetSelectionBits</code>) mã hóa chỉ số tập dữ liệu (ví dụ <code>0x0020</code> DS0 và <code>0x0021</code> DS1) <b>[SWS_Fee_00007 / SWS_Fee_00100]</b>.</p>
<h4>Tại sao RAM LUT Cache quan trọng?</h4>
<ul>
  <li><b>Khi <code>FeeEnableRamLutCache = TRUE</code>:</b> Sau khi <code>Fee_Init()</code> + <code>Fee_MainFunction()</code> quét xong Flash, Fee giữ một bảng ánh xạ trong RAM <code>BlockNumber -&gt; {BankId, Offset, Seq}</code>. Mỗi lần <code>Fee_Read()</code> chỉ mất <b>O(1)</b> để đọc thẳng địa chỉ vật lý.</li>
  <li><b>Khi tắt RAM LUT:</b> Fee phải dò ngược từ cuối tới đầu Active Bank theo từng Header (<code>O(N)</code>), làm tăng đáng kể độ trễ đọc khi Bank gần đầy.</li>
</ul>
"""
            },
            {
                "title": "3-Phase Async Write Pipeline",
                "diag": "1-2",
                "swsRefs": [
                    {"id": "SWS_Fee_00088", "desc": "Fee_Write(BlockNumber, DataBufferPtr) API"},
                    {"id": "SWS_Fee_00024", "desc": "Asynchronous write request queueing"},
                    {"id": "SWS_Fee_00025", "desc": "Fee_Write transitions state to MEMIF_BUSY"},
                    {"id": "SWS_Fee_00097", "desc": "Fee_MainFunction executes async jobs"},
                    {"id": "SWS_Fee_00153", "desc": "Written block integrity upon completion"},
                ],
                "html": """
<p>Khi gọi <code>Fee_Write()</code> <b>[SWS_Fee_00088]</b>, module kiểm tra tham số rồi chuyển ngay sang <code>MEMIF_BUSY</code> <b>[SWS_Fee_00025]</b> và <code>MEMIF_JOB_PENDING</code> <b>[SWS_Fee_00156]</b>. Trong <code>Fee_MainFunction()</code> <b>[SWS_Fee_00097]</b>, lệnh ghi được tách thành 3 pha tuần tự để bảo vệ toàn vẹn dữ liệu trước rủi ro mất nguồn:</p>
<ul>
  <li><b>Phase 1 (WRITE_HEADER):</b> Ghi thông tin quản lý Header. Bật Bit 7 <code>HDR_WRITTEN</code> (Thanh B).</li>
  <li><b>Phase 2 (WRITE_PAYLOAD):</b> Ghi từng chunk dữ liệu (mô phỏng qua <code>FlsBytesPerCycleSlow</code>/<code>Fast</code>) cộng byte Padding <code>0xFF</code>. Bật Bit 6 <code>DATA_ALIGNED</code>.</li>
  <li><b>Phase 3 (WRITE_TRAILER):</b> Chỉ khi toàn bộ payload đã nạp khớp trên DFlash, Fee mới chốt Trailer <code>0xA5A5</code>, bật Bit 5 <code>VALID_TRAILR</code>, đánh dấu bản cũ <code>SUPERSEDED</code> và cập nhật <code>RAM LUT</code> <b>[SWS_Fee_00153]</b>.</li>
</ul>
"""
            },
            {
                "title": "Partial Read (Offset + Length) & Endurance Cycles",
                "diag": "1-3",
                "swsRefs": [
                    {"id": "SWS_Fee_00087", "desc": "Fee_Read(BlockNumber, BlockOffset, Ptr, Len)"},
                    {"id": "SWS_Fee_00021", "desc": "Fee_Read asynchronous execution & data transfer"},
                    {"id": "SWS_Fee_00187", "desc": "MemAcc_BlankCheck check before read (R25-11)"},
                    {"id": "SWS_Fee_00196", "desc": "Read length/alignment (FeeMinimumReadPageSize)"},
                    {"id": "SWS_Fee_00135", "desc": "DET FEE_E_INVALID_BLOCK_OFS on bad offset"},
                    {"id": "SWS_Fee_00137", "desc": "DET FEE_E_INVALID_BLOCK_LEN on bad length"},
                    {"id": "ECUC_Fee_00110", "desc": "FeeNumberOfWriteCycles configuration"},
                ],
                "html": """
<p>Khác với EEPROM cũ buộc đọc cả khối, API <code>Fee_Read(BlockNumber, BlockOffset, DataBufferPtr, Length)</code> <b>[SWS_Fee_00087]</b> cho phép trích xuất chính xác một lát cắt dữ liệu con bên trong Block với độ mịn <code>FeeMinimumReadPageSize</code> <b>[ECUC_Fee_00156 / SWS_Fee_00196]</b>:</p>
<ul>
  <li>Địa chỉ Flash thực tế = <code>BankBase + SlotOffset + HeaderSize + BlockOffset</code>.</li>
  <li>Trên kiến trúc R25-11 <code>MemAcc</code>, trước khi đọc dữ liệu có thể gọi <code>MemAcc_BlankCheck()</code> <b>[SWS_Fee_00187]</b> để xác nhận vùng nhớ chưa ghi thay vì đọc trực tiếp vùng trống có thể gây lỗi ECC trên phần cứng.</li>
  <li>Nếu <code>BlockOffset &gt;= FeeBlockSize</code> -&gt; báo Dev Error <code>FEE_E_INVALID_BLOCK_OFS (0x03)</code> <b>[SWS_Fee_00135]</b>.</li>
  <li>Nếu <code>Length == 0</code> hoặc <code>BlockOffset + Length &gt; FeeBlockSize</code> -&gt; báo <code>FEE_E_INVALID_BLOCK_LEN (0x05)</code> <b>[SWS_Fee_00137]</b>.</li>
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
                "swsRefs": [
                    {"id": "SWS_Fee_00102", "desc": "Uniform wear leveling over underlying sectors"},
                    {"id": "SWS_Fee_00103", "desc": "Write cycles distribution up to configured endurance"},
                    {"id": "SWS_Fee_00005", "desc": "Integer multiple of Virtual Page for append slots"},
                    {"id": "SWS_Fee_00071", "desc": "Physical address alignment in clusters"},
                ],
                "html": """
<p>Vì ô nhớ Flash đã ghi bit về <code>0</code> không thể viết đè lại lên <code>1</code> nếu chưa Erase toàn bộ Sector, module Fee áp dụng chiến lược <b>Append-Only (Ghi Nối Tiếp)</b> nhằm phân bổ đều số chu kỳ xóa/ghi theo <b>[SWS_Fee_00102 / SWS_Fee_00103]</b>:</p>
<ol>
  <li>Bản ghi mới luôn được cấp phát nối tiếp vào vùng còn trống (<code>0xFF</code>) của Active Bank với <code>Seq = Seq_cũ + 1</code>.</li>
  <li>Ngay sau khi Phase 3 hoàn tất, bản ghi cũ trong Bank tự động chuyển sang trạng thái rác (<code>SUPERSEDED</code> — Bit 2 Thanh B = 1) và không bị xóa ngay.</li>
  <li>Độ hao mòn được trải đều trên toàn bộ dung lượng cụm sector thay vì dồn hết vào 1 ô nhớ cố định.</li>
</ol>
"""
            },
            {
                "title": "Garbage Collection: Copy Valid -> Switch -> Erase",
                "diag": "2-1",
                "swsRefs": [
                    {"id": "SWS_Fee_00102", "desc": "Cluster reorganization / wear leveling"},
                    {"id": "SWS_Fee_00103", "desc": "Erase count balancing across clusters"},
                    {"id": "SWS_Fee_00074", "desc": "Internal management runs in MEMIF_BUSY_INTERNAL"},
                    {"id": "SWS_Fee_00197", "desc": "Internal op returns Fee to MEMIF_IDLE"},
                    {"id": "ECUC_Fee_00155", "desc": "MemAcc AddressArea covering sector banks"},
                ],
                "html": """
<p>Khi dung lượng đã sử dụng trên Active Bank vượt ngưỡng <code>FeeGcTriggerThresholdPct</code> (mặc định <b>75% = 192B/256B</b>), Fee kích hoạt quy trình <b>Garbage Collection (GC)</b> luân phiên 2 Bank:</p>
<ul>
  <li><b>Bước 1 (GC_COPY_VALID):</b> Quét Active Bank (Bank 0) và <b>chỉ copy duy nhất các instance VALID mới nhất</b> sang Standby Bank (Bank 1 đang sạch 0xFF). Toàn bộ slot <code>SUPERSEDED</code> và <code>INVALIDATED</code> bị loại bỏ.</li>
  <li><b>Bước 2 (GC_SWITCH_BANK):</b> Đảo vai trò: Bank 1 chính thức thành <code>ACTIVE BANK</code>, đồng thời cập nhật đồng bộ <code>RAM LUT</code> sang địa chỉ mới.</li>
  <li><b>Bước 3 (GC_ERASE_OLD):</b> Gọi <code>MemAcc_Erase() / Fls_Erase(Bank 0)</code> để đưa Bank 0 về <code>0xFF</code> làm Standby Bank mới và tăng <code>EraseCount++</code>. Nếu không có job tầng trên chờ, module về <code>MEMIF_IDLE</code> <b>[SWS_Fee_00197]</b>.</li>
</ul>
"""
            },
            {
                "title": "Immediate Data Preemption & Reserved Zone",
                "diag": "2-2",
                "swsRefs": [
                    {"id": "SWS_Fee_00009", "desc": "Immediate data preempts internal mgmt (BUSY_INTERNAL)"},
                    {"id": "SWS_Fee_00144", "desc": "Rejects even Immediate write if already MEMIF_BUSY"},
                    {"id": "SWS_Fee_00174", "desc": "Fee_Write accepted during IDLE or BUSY_INTERNAL"},
                    {"id": "SWS_Fee_00094", "desc": "Fee_EraseImmediateBlock async prep API"},
                    {"id": "SWS_Fee_00066", "desc": "Immediate write without sector erase delay"},
                    {"id": "SWS_Fee_00068", "desc": "FEE_E_INVALID_BLOCK_NO if ImmediateData == FALSE"},
                    {"id": "ECUC_Fee_00151", "desc": "FeeImmediateData block flag"},
                ],
                "html": """
<p>Theo yêu cầu <b>[SWS_Fee_00009]</b>, các dữ liệu tối khẩn (ví dụ Crash Event <code>0x0030</code> cấu hình <code>FeeImmediateData = TRUE</code> <b>[ECUC_Fee_00151]</b>) cần được đảm bảo không gian ghi sẵn để không bị trễ bởi việc xóa Flash khi sự cố xảy ra:</p>
<ul>
  <li><b>Reserved Immediate Zone &amp; <code>Fee_EraseImmediateBlock()</code> [SWS_Fee_00094 / SWS_Fee_00066 / SWS_Fee_00067]:</b> Khoảng dung lượng từ Threshold (75%) tới 100% cuối Bank (64B) được khóa với Standard Block. Tầng trên có thể gọi trước <code>Fee_EraseImmediateBlock(0x0030)</code> (bắt buộc block có <code>FeeImmediateData == TRUE</code> <b>[SWS_Fee_00068]</b>) để chuẩn bị bất đồng bộ vùng nhớ này.</li>
  <li><b>Preemption giữa <code>MEMIF_BUSY_INTERNAL</code> [SWS_Fee_00009]:</b> Nếu Fee đang bận nội bộ (GC nền <code>MEMIF_BUSY_INTERNAL</code>), lệnh <code>Fee_Write()</code> của Immediate Block xen ngang ngay (bật Bit 2 <code>IMM_PREEMPT</code>), ghi nhanh Crash Data vào Reserved Zone, rồi GC tiếp tục sao chép cả bản mới sang Bank đích!</li>
  <li><b>Lưu ý quan trọng [SWS_Fee_00009 Note / SWS_Fee_00144]:</b> Nếu module đang ở trạng thái <b><code>MEMIF_BUSY</code></b> (đang thực thi một job của tầng trên), mọi lệnh <code>Fee_Write()</code> — <i>kể cả Immediate Block</i> — đều BẮT BUỘC bị từ chối với Runtime Error <code>FEE_E_BUSY (0x06)</code>!</li>
</ul>
"""
            },
            {
                "title": "Background GC vs Foreground Urgent GC",
                "diag": "2-3",
                "swsRefs": [
                    {"id": "SWS_Fee_00074", "desc": "Background internal op reports MEMIF_BUSY_INTERNAL"},
                    {"id": "SWS_Fee_00025", "desc": "User-triggered write/GC reports MEMIF_BUSY"},
                    {"id": "SWS_Fee_00129", "desc": "Fee_GetStatus returns MEMIF_BUSY during user job"},
                    {"id": "SWS_Fee_00155", "desc": "Internal ops must not overwrite Fee_GetJobResult()"},
                    {"id": "SWS_Fee_00156", "desc": "Active user job reports MEMIF_JOB_PENDING"},
                ],
                "html": """
<p>Quá trình Garbage Collection có thể vận hành ở 2 ngữ cảnh với hành vi <code>Fee_GetStatus()</code> và <code>Fee_GetJobResult()</code> hoàn toàn khác nhau theo chuẩn R25-11:</p>
<table class="tbl">
  <thead><tr><th>Đặc điểm</th><th>Background GC (Nội bộ nền)</th><th>Foreground Urgent GC (Do User Write kích hoạt)</th></tr></thead>
  <tbody>
    <tr><td>Điều kiện kích hoạt</td><td>Chủ động chạy trong nền khi chưa có yêu cầu tầng trên</td><td>Phát sinh khi có lệnh <code>Fee_Write()</code> của user vượt ngưỡng</td></tr>
    <tr><td><code>Fee_GetStatus()</code></td><td><b><code>MEMIF_BUSY_INTERNAL</code> [SWS_Fee_00074]</b></td><td><b><code>MEMIF_BUSY</code> [SWS_Fee_00025 / SWS_Fee_00129]</b></td></tr>
    <tr><td><code>Fee_GetJobResult()</code></td><td><b>Không thay đổi</b> kết quả job trước đó <b>[SWS_Fee_00155]</b></td><td>Trả về <b><code>MEMIF_JOB_PENDING</code> [SWS_Fee_00156]</b> cho tới khi ghi xong</td></tr>
    <tr><td>Chấp nhận lệnh mới</td><td>Vẫn nhận <code>Read/Write</code> (Immediate có thể preempt)</td><td>Từ chối mọi User API mới với <code>FEE_E_BUSY</code> <b>[SWS_Fee_00144]</b></td></tr>
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
                "swsRefs": [
                    {"id": "SWS_Fee_00023", "desc": "Detect inconsistent data -> MEMIF_BLOCK_INCONSISTENT"},
                    {"id": "SWS_Fee_00153", "desc": "Completed block guaranteed valid on power cycle"},
                    {"id": "SWS_Fee_00154", "desc": "Read guarantees data validity or inconsistent status"},
                    {"id": "SWS_Fee_00159", "desc": "JobResult = MEMIF_BLOCK_INCONSISTENT on corrupt data"},
                    {"id": "SWS_Fee_00056", "desc": "Notify NvM_JobErrorNotification on inconsistency"},
                ],
                "html": """
<p>Một tình huống thực chiến trên ô tô là rút chìa khóa hoặc sụt áp ắc-quy đúng lúc ECU đang nạp DFlash. Nếu dữ liệu đang ghi giữa Phase 1/2 mà chưa ghi xong Phase 3 Valid Trailer <code>0xA5A5</code>, slot đó gọi là <b>Torn Write</b>:</p>
<ul>
  <li><b>Nhận diện khi Reboot [SWS_Fee_00023 / SWS_Fee_00154]:</b> Khi gọi <code>Fee_Init()</code> rồi chạy <code>Fee_MainFunction()</code> quét lại Bank, mọi slot thiếu Valid Trailer <code>0xA5A5</code> hoặc sai HeaderCRC đều bị đánh dấu <code>INCONSISTENT</code> (Bit 0 Thanh B = 1).</li>
  <li><b>Chiến lược Fallback (<code>FeeAutoFallbackPreviousInstance</code>):</b> Nếu bật <code>TRUE</code>, Fee tự lùi tìm bản ghi liền trước toàn vẹn (<code>Seq #N-1</code>) nạp lại vào RAM LUT -&gt; lần đọc kế tiếp trả về dữ liệu an toàn trước lúc mất điện! Nếu tắt <code>FALSE</code> hoặc không có bản cũ, Fee đặt <code>MEMIF_BLOCK_INCONSISTENT</code> <b>[SWS_Fee_00159]</b> và gọi <code>NvM_JobErrorNotification()</code> <b>[SWS_Fee_00056]</b>.</li>
</ul>
"""
            },
            {
                "title": "Xóa Mềm (Fee_InvalidateBlock) & MEMIF_BLOCK_INVALID",
                "diag": "3-1",
                "swsRefs": [
                    {"id": "SWS_Fee_00092", "desc": "Fee_InvalidateBlock(BlockNumber) async API"},
                    {"id": "SWS_Fee_00036", "desc": "Logical invalidation request queueing"},
                    {"id": "SWS_Fee_00037", "desc": "Marks block invalid without sector erase"},
                    {"id": "SWS_Fee_00192", "desc": "Accepted during MEMIF_IDLE or MEMIF_BUSY_INTERNAL"},
                    {"id": "SWS_Fee_00022", "desc": "Fee_Read invalidated/blank -> MEMIF_BLOCK_INVALID"},
                    {"id": "SWS_Fee_00160", "desc": "Fee_GetJobResult returns MEMIF_BLOCK_INVALID"},
                ],
                "html": """
<p>Khi muốn xóa logic một tham số đã lưu (ví dụ Reset VIN/DTC History qua UDS), Fee không xóa tại chỗ mà dùng <code>Fee_InvalidateBlock(BlockNumber)</code> <b>[SWS_Fee_00092]</b>:</p>
<ul>
  <li>Append một Invalidation Marker mới ở cuối Active Bank <b>[SWS_Fee_00036 / SWS_Fee_00037]</b> (bật Bit 1 <code>INVALIDATED = 1</code> trên Thanh B), chuyển bản cũ sang <code>SUPERSEDED</code> và cập nhật <code>RAM LUT</code>.</li>
  <li>Mọi lần gọi <code>Fee_Read()</code> sau đó (cũng như khi đọc một block chưa từng ghi có <code>BlankCheck</code> trống) đều trả <b><code>MEMIF_BLOCK_INVALID</code></b> <b>[SWS_Fee_00022 / SWS_Fee_00160]</b>, giúp NvM phân biệt với lỗi hỏng phần cứng (<code>INCONSISTENT</code>) để nạp lại giá trị mặc định từ ROM Default!</li>
  <li>Ở đợt GC kế tiếp, các slot <code>INVALIDATED</code> được loại bỏ hoàn toàn.</li>
</ul>
"""
            },
            {
                "title": "DET Guards & Runtime Errors (Module ID 21) & Fee_Cancel",
                "diag": "3-2",
                "swsRefs": [
                    {"id": "SWS_Fee_00010", "desc": "Development Errors 0x01..0x05 via Det_ReportError"},
                    {"id": "SWS_Fee_91002", "desc": "Runtime Errors 0x06 & 0x08 via Det_ReportRuntimeError"},
                    {"id": "SWS_Fee_00184", "desc": "FEE_E_INVALID_CANCEL if status != MEMIF_BUSY"},
                    {"id": "SWS_Fee_00089", "desc": "Fee_Cancel() synchronous abort service"},
                    {"id": "ECUC_Fee_00111", "desc": "FeeDevErrorDetect enables Dev errors only"},
                ],
                "html": """
<p>Đặc tả AUTOSAR R25-11 phân tách rõ hai nhóm lỗi cho Module ID = 21:</p>
<h4>1. Development Errors [SWS_Fee_00010] — Chỉ báo qua <code>Det_ReportError()</code> khi <code>FeeDevErrorDetect == TRUE</code> [ECUC_Fee_00111]</h4>
<table class="tbl">
  <thead><tr><th>Mã Lỗi Dev</th><th>Hex</th><th>Nguyên Nhân Phát Sinh</th></tr></thead>
  <tbody>
    <tr><td><code>FEE_E_UNINIT</code></td><td><code>0x01</code></td><td>Gọi Read/Write/GetJobResult/Invalidate/EraseImmediate/Cancel trước <code>Fee_Init()</code> (<i>Lưu ý: <code>Fee_GetJobResult()</code> trả <code>MEMIF_JOB_FAILED</code> <b>[SWS_Fee_00125]</b></i>).</td></tr>
    <tr><td><code>FEE_E_INVALID_BLOCK_NO</code></td><td><code>0x02</code></td><td>BlockNumber = <code>0x0000</code>/<code>0xFFFF</code> <b>[SWS_Fee_00006]</b>, chưa cấu hình, hoặc gọi <code>Fee_EraseImmediateBlock()</code> cho block không phải Immediate <b>[SWS_Fee_00068]</b>.</td></tr>
    <tr><td><code>FEE_E_INVALID_BLOCK_OFS</code></td><td><code>0x03</code></td><td><code>BlockOffset &gt;= FeeBlockSize</code> khi gọi <code>Fee_Read()</code> <b>[SWS_Fee_00135]</b>.</td></tr>
    <tr><td><code>FEE_E_PARAM_POINTER</code></td><td><code>0x04</code></td><td>Con trỏ <code>DataBufferPtr</code> hoặc <code>VersionInfoPtr</code> bị <code>NULL_PTR</code> <b>[SWS_Fee_00134 / 00147]</b>.</td></tr>
    <tr><td><code>FEE_E_INVALID_BLOCK_LEN</code></td><td><code>0x05</code></td><td><code>Length == 0</code> hoặc <code>BlockOffset + Length &gt; FeeBlockSize</code> <b>[SWS_Fee_00137]</b>.</td></tr>
  </tbody>
</table>
<h4 style="margin-top:8px">2. Runtime Errors [SWS_Fee_91002] — LUÔN báo qua <code>Det_ReportRuntimeError()</code> bất kể <code>FeeDevErrorDetect</code></h4>
<table class="tbl">
  <thead><tr><th>Mã Lỗi Runtime</th><th>Hex</th><th>Nguyên Nhân Phát Sinh</th></tr></thead>
  <tbody>
    <tr><td><code>FEE_E_BUSY</code></td><td><code>0x06</code></td><td>Gọi Read/Write/Invalidate/EraseImmediate khi trạng thái đang <code>MEMIF_BUSY</code> <b>[SWS_Fee_00144..00146]</b> (<i>kể cả Immediate Block!</i>).</td></tr>
    <tr><td><code>FEE_E_INVALID_CANCEL</code></td><td><code>0x08</code></td><td>Gọi <code>Fee_Cancel()</code> khi trạng thái KHÔNG phải <code>MEMIF_BUSY</code> (tức đang <code>MEMIF_IDLE</code> hoặc <code>MEMIF_BUSY_INTERNAL</code>) <b>[SWS_Fee_00184 / SWS_Fee_00164]</b>.</td></tr>
  </tbody>
</table>
"""
            },
            {
                "title": "Lỗi Phần Cứng Tầng Dưới (Mem/Fls DEM) & Unified Callback",
                "diag": "3-3",
                "swsRefs": [
                    {"id": "SWS_Fee_00158", "desc": "JobResult = MEMIF_JOB_FAILED on lower HW failure"},
                    {"id": "SWS_Fee_00159", "desc": "JobResult = MEMIF_BLOCK_INCONSISTENT on ECC/corrupt"},
                    {"id": "SWS_Fee_00194", "desc": "Fee_JobEndNotification inspects MemAcc_GetJobResult"},
                    {"id": "SWS_Fee_00056", "desc": "Calls NvM_JobErrorNotification on failed/invalid job"},
                    {"id": "ECUC_Fee_00113", "desc": "FeeNvmJobErrorNotification callback config"},
                ],
                "html": """
<p><b>Quy định quan trọng của AUTOSAR R25-11 (§7.2.3 &amp; §7.2.4):</b> Bản thân module <b>Fee KHÔNG định nghĩa bất kỳ Production Error (DEM Event) hay Extended Production Error riêng nào</b>. Thay vào đó, khi phần cứng DFlash gặp sự cố ngoài thực địa:</p>
<ul>
  <li><b>Báo cáo lỗi phần cứng tại tầng dưới (<code>Mem</code> / <code>Fls</code> Driver):</b> Driver Flash cấp thấp phát hiện Write Verify Fail, Erase Failed hoặc Uncorrectable ECC -> báo DTC phần cứng lên <b>DEM</b> và trả kết quả lỗi (<code>MEMACC_FAILED</code> / <code>MEMACC_ECC_UNCORRECTABLE</code>) qua <code>MemAcc_GetJobResult()</code>.</li>
  <li><b>Callback Thống Nhất [SWS_Fee_00095 / SWS_Fee_00194]:</b> <code>MemAcc</code> gọi vào <code>Fee_JobEndNotification()</code>. Fee truy vấn kết quả, đánh dấu slot lỗi là <code>INCONSISTENT</code> (bảo toàn RAM LUT cũ), đặt <code>JobResult = MEMIF_JOB_FAILED</code> <b>[SWS_Fee_00158]</b> hoặc <code>MEMIF_BLOCK_INCONSISTENT</code> <b>[SWS_Fee_00159]</b>.</li>
  <li><b>Chuyển tiếp lên NvM [SWS_Fee_00056]:</b> Fee gọi <code>NvM_JobErrorNotification()</code> <b>[ECUC_Fee_00113]</b> để <code>NvM</code> quyết định đọc bản sao dự phòng, nạp ROM Default hoặc ghi nhận NvM Production Error (ví dụ <code>NVM_E_REQ_FAILED</code>) lên DEM.</li>
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
                "swsRefs": [
                    {"id": "SWS_Fee_00090", "desc": "Fee_GetStatus() returns current MemIf_StatusType"},
                    {"id": "SWS_Fee_00120", "desc": "Fee_Init sets MEMIF_UNINIT -> MEMIF_BUSY_INTERNAL"},
                    {"id": "SWS_Fee_00197", "desc": "Fee_MainFunction -> MEMIF_IDLE when internal ends"},
                    {"id": "SWS_Fee_00074", "desc": "MEMIF_BUSY_INTERNAL during background management"},
                    {"id": "SWS_Fee_00128", "desc": "Fee_GetStatus returns MEMIF_UNINIT cleanly (no DET)"},
                    {"id": "SWS_Fee_00129", "desc": "Fee_GetStatus returns MEMIF_BUSY during user job"},
                    {"id": "SWS_Fee_00155", "desc": "Internal mgmt ops do not affect Fee_GetJobResult()"},
                ],
                "html": """
<p>Trình mô phỏng theo dõi đồng thời máy trạng thái module trả ra qua <code>Fee_GetStatus()</code> <b>[SWS_Fee_00090]</b> và kết quả job qua <code>Fee_GetJobResult()</code> <b>[SWS_Fee_00091]</b>:</p>
<ul>
  <li><code>MEMIF_UNINIT</code> <b>[SWS_Fee_00128]</b>: Mặc định sau Reset (hoặc mất nguồn). Chỉ thoát bằng <code>Fee_Init()</code>.</li>
  <li><code>MEMIF_BUSY_INTERNAL</code> <b>[SWS_Fee_00120 / SWS_Fee_00074]</b>: Ngay sau <code>Fee_Init()</code> (chờ Startup Scan) hoặc khi đang dọn rác nền. <b>Vẫn chấp nhận</b> <code>Fee_Read/Write/Invalidate</code> <b>[SWS_Fee_00172/00174/00192]</b> và không làm thay đổi <code>Fee_GetJobResult()</code> <b>[SWS_Fee_00155]</b>.</li>
  <li><code>MEMIF_IDLE</code> <b>[SWS_Fee_00034 / SWS_Fee_00197]</b>: Đã quét xong Flash, sẵn sàng nhận mọi API tầng trên.</li>
  <li><code>MEMIF_BUSY</code> <b>[SWS_Fee_00025 / SWS_Fee_00129]</b>: Đang thực thi User Job (hoặc Foreground GC phục vụ User Write). Từ chối mọi yêu cầu mới (<code>FEE_E_BUSY</code>), chỉ cho phép <code>Fee_Cancel()</code> <b>[SWS_Fee_00184]</b>.</li>
</ul>
"""
            },
            {
                "title": "Flash Sector & Block Lifecycle State Machine",
                "diag": "4-1",
                "swsRefs": [
                    {"id": "SWS_Fee_00102", "desc": "Active/standby cluster rotation for wear leveling"},
                    {"id": "SWS_Fee_00103", "desc": "Sector erase cycles managed across clusters"},
                    {"id": "SWS_Fee_00009", "desc": "Reserved Immediate Zone preemption handling"},
                    {"id": "SWS_Fee_00023", "desc": "Torn write / ECC inconsistent block isolation"},
                    {"id": "SWS_Fee_00037", "desc": "Block invalidation lifecycle"},
                ],
                "html": """
<p>Song song với trạng thái phần mềm Fee là vòng đời phần cứng của hai Logical Bank (<code>Bank 0</code> &amp; <code>Bank 1</code>):</p>
<ol>
  <li><code>ACTIVE_NORMAL</code>: Tiếp nhận append các instance mới tới giới hạn Threshold.</li>
  <li><code>GC_COPYING_TO_STANDBY</code>: Đang chép từng bản VALID sang Bank dự phòng.</li>
  <li><code>GC_ERASING_OLD_BANK</code>: Đã chuyển Active Bank sang đích mới, đang gọi <code>MemAcc_Erase() / Fls_Erase()</code> xóa Bank cũ.</li>
  <li><code>IMMEDIATE_PREEMPT_ZONE</code>: Vùng đệm Reserved đang phục vụ <code>Fee_EraseImmediateBlock()</code> / Immediate Write khẩn cấp <b>[SWS_Fee_00009]</b>.</li>
  <li><code>SECTOR_CORRUPT_DEM</code>: Sector hỏng phần cứng (tầng dưới báo DEM, Fee trả <code>MEMIF_JOB_FAILED</code> <b>[SWS_Fee_00158]</b>).</li>
</ol>
"""
            },
            {
                "title": "Thanh Ghi A: Fee_ModuleControlByte (8 Bits)",
                "diag": "4-2",
                "swsRefs": [
                    {"id": "SWS_Fee_00090", "desc": "Maps Fee_GetStatus() MemIf_StatusType bits"},
                    {"id": "SWS_Fee_00091", "desc": "Maps Fee_GetJobResult() MemIf_JobResultType flags"},
                    {"id": "SWS_Fee_00034", "desc": "Module state transition rules"},
                    {"id": "SWS_Fee_00035", "desc": "Job result valid & status transitions"},
                    {"id": "SWS_Fee_00155", "desc": "JOB_OK / JOB_FAILED independence from internal GC"},
                ],
                "html": """
<p>Thanh ghi ảo 8-bit <b>Thanh A (<code>Fee_ModuleControlByte</code>)</b> là công cụ trực quan hóa trong trình mô phỏng giúp tổng hợp trạng thái <code>Fee_GetStatus()</code> <b>[SWS_Fee_00090]</b>, <code>Fee_GetJobResult()</code> <b>[SWS_Fee_00091]</b> và cờ GC/Preempt nội bộ (có thể click từng bit để kiểm tra):</p>
<table class="tbl">
  <thead><tr><th>Bit</th><th>Tên Cờ</th><th>Mask</th><th>Ý Nghĩa Thực Thi</th></tr></thead>
  <tbody>
    <tr><td><b>B7</b></td><td><code>FEE_INIT</code></td><td><code>0x80</code></td><td>Đã gọi <code>Fee_Init()</code> (<code>0</code> = <code>MEMIF_UNINIT</code>).</td></tr>
    <tr><td><b>B6</b></td><td><code>FEE_BUSY</code></td><td><code>0x40</code></td><td>Có User Job (hoặc Foreground GC) -> <code>MEMIF_BUSY</code>.</td></tr>
    <tr><td><b>B5</b></td><td><code>FEE_BUSY_INT</code></td><td><code>0x20</code></td><td>Đang Startup Scan hoặc GC nền -> <code>MEMIF_BUSY_INTERNAL</code>.</td></tr>
    <tr><td><b>B4</b></td><td><code>FAST_MODE</code></td><td><code>0x10</code></td><td>Classic R20-11 Legacy: <code>1</code> = <code>MEMIF_MODE_FAST</code> (64B/tk); <code>0</code> = <code>SLOW</code>.</td></tr>
    <tr><td><b>B3</b></td><td><code>GC_ACTIVE</code></td><td><code>0x08</code></td><td>Đang thực hiện Copy Valid hoặc Erase chuyển Bank.</td></tr>
    <tr><td><b>B2</b></td><td><code>IMM_PREEMPT</code></td><td><code>0x04</code></td><td>Immediate Block đang tạm hoãn GC nền để ghi khẩn.</td></tr>
    <tr><td><b>B1</b></td><td><code>JOB_ERR_PEND</code></td><td><code>0x02</code></td><td>Job gần nhất kết thúc với lỗi/bị hủy (<code>FAILED/INCONSISTENT/INVALID/CANCELED</code>).</td></tr>
    <tr><td><b>B0</b></td><td><code>JOB_OK_DONE</code></td><td><code>0x01</code></td><td>Job gần nhất hoàn thành sạch sẽ (<code>MEMIF_JOB_OK</code>).</td></tr>
  </tbody>
</table>
"""
            },
            {
                "title": "Thanh Ghi B: Fee_BlockHeaderStatusByte (8 Bits)",
                "diag": "4-3",
                "swsRefs": [
                    {"id": "SWS_Fee_00153", "desc": "Block completeness & validity upon write"},
                    {"id": "SWS_Fee_00154", "desc": "Read validity / inconsistency checks"},
                    {"id": "SWS_Fee_00022", "desc": "Invalidated / unwritten block status"},
                    {"id": "SWS_Fee_00023", "desc": "Torn write inconsistent detection"},
                    {"id": "SWS_Fee_00037", "desc": "Invalidated block marker flag"},
                ],
                "html": """
<p>Thanh ghi ảo 8-bit <b>Thanh B (<code>Fee_BlockHeaderStatusByte</code>)</b> giải phẫu trực quan trạng thái của đúng Instance Slot đang được chọn trên Flash Map:</p>
<table class="tbl">
  <thead><tr><th>Bit</th><th>Tên Cờ</th><th>Mask</th><th>Ý Nghĩa Slot Flash</th></tr></thead>
  <tbody>
    <tr><td><b>B7</b></td><td><code>HDR_WRITTEN</code></td><td><code>0x80</code></td><td>Phase 1 Block Header đã nạp thành công xuống DFlash.</td></tr>
    <tr><td><b>B6</b></td><td><code>DATA_ALIGNED</code></td><td><code>0x40</code></td><td>Phase 2 Payload + Virtual Page Padding đã ghi đủ.</td></tr>
    <tr><td><b>B5</b></td><td><code>VALID_TRAILR</code></td><td><code>0x20</code></td><td>Phase 3 Valid Trailer <code>0xA5A5</code> đã xác nhận (không phải Torn Write).</td></tr>
    <tr><td><b>B4</b></td><td><code>IMM_BLOCK</code></td><td><code>0x10</code></td><td>Khối dữ liệu khẩn cấp (<code>FeeImmediateData = TRUE</code>).</td></tr>
    <tr><td><b>B3</b></td><td><code>LUT_CACHED</code></td><td><code>0x08</code></td><td>Địa chỉ slot đang được giữ trong bảng tra nhanh RAM LUT.</td></tr>
    <tr><td><b>B2</b></td><td><code>SUPERSEDED</code></td><td><code>0x04</code></td><td>Phiên bản cũ đã lỗi thời, GC sẽ loại bỏ.</td></tr>
    <tr><td><b>B1</b></td><td><code>INVALIDATED</code></td><td><code>0x02</code></td><td>Bị xóa mềm qua <code>Fee_InvalidateBlock()</code> <b>[SWS_Fee_00037]</b>.</td></tr>
    <tr><td><b>B0</b></td><td><code>INCONSISTENT</code></td><td><code>0x01</code></td><td>Torn Write (thiếu Trailer) hoặc hỏng ECC <b>[SWS_Fee_00023]</b>.</td></tr>
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
                "title": "Danh Sách Đầy Đủ AUTOSAR Fee Standard APIs (R25-11)",
                "diag": "5-0",
                "swsRefs": [
                    {"id": "SWS_Fee_00085", "desc": "0x00 Fee_Init(ConfigPtr)"},
                    {"id": "SWS_Fee_00087", "desc": "0x02 Fee_Read(Blk, Ofs, Buf, Len)"},
                    {"id": "SWS_Fee_00088", "desc": "0x03 Fee_Write(Blk, DataBufferPtr)"},
                    {"id": "SWS_Fee_00089", "desc": "0x04 Fee_Cancel()"},
                    {"id": "SWS_Fee_00090", "desc": "0x05 Fee_GetStatus()"},
                    {"id": "SWS_Fee_00091", "desc": "0x06 Fee_GetJobResult()"},
                    {"id": "SWS_Fee_00092", "desc": "0x07 Fee_InvalidateBlock(Blk)"},
                    {"id": "SWS_Fee_00093", "desc": "0x08 Fee_GetVersionInfo(VersionInfoPtr)"},
                    {"id": "SWS_Fee_00094", "desc": "0x09 Fee_EraseImmediateBlock(Blk)"},
                    {"id": "SWS_Fee_00095", "desc": "0x10 Fee_JobEndNotification (Unified)"},
                    {"id": "SWS_Fee_00097", "desc": "0x12 Fee_MainFunction()"},
                ],
                "html": """
<p>Tất cả Service ID và tên hàm dưới đây tuân thủ chính xác đặc tả <b>AUTOSAR CP SWS_FlashEEPROMEmulation R25-11 (Doc ID 286)</b>:</p>
<table class="tbl">
  <thead><tr><th>SID</th><th>API Hàm Chuẩn R25-11</th><th>SWS_ID</th><th>Chức Năng Chính</th></tr></thead>
  <tbody>
    <tr><td><code>0x00</code></td><td><code>Fee_Init(ConfigPtr)</code></td><td><code>SWS_Fee_00085</code></td><td>Sync Init -> chuyển <code>MEMIF_BUSY_INTERNAL</code> <b>[00120]</b> lên lịch quét Flash.</td></tr>
    <tr><td><code>0x02</code></td><td><code>Fee_Read(Blk, Ofs, Buf, Len)</code></td><td><code>SWS_Fee_00087</code></td><td>Async Read toàn phần hoặc lát cắt Offset+Length (dùng <code>MemAcc_BlankCheck</code> <b>[00187]</b>).</td></tr>
    <tr><td><code>0x03</code></td><td><code>Fee_Write(Blk, DataBufferPtr)</code></td><td><code>SWS_Fee_00088</code></td><td>Async Write append bản ghi mới + alignment + commit.</td></tr>
    <tr><td><code>0x04</code></td><td><code>Fee_Cancel()</code></td><td><code>SWS_Fee_00089</code></td><td>Sync Abort hủy user job đang <code>MEMIF_BUSY</code> -&gt; <code>MEMIF_JOB_CANCELED</code>.</td></tr>
    <tr><td><code>0x05</code></td><td><code>Fee_GetStatus()</code></td><td><code>SWS_Fee_00090</code></td><td>Sync Query trả <code>MEMIF_UNINIT / IDLE / BUSY / BUSY_INTERNAL</code>.</td></tr>
    <tr><td><code>0x06</code></td><td><code>Fee_GetJobResult()</code></td><td><code>SWS_Fee_00091</code></td><td>Sync Query trả <code>MEMIF_JOB_OK / PENDING / FAILED / CANCELED / INVALID / INCONSISTENT</code>.</td></tr>
    <tr><td><code>0x07</code></td><td><code>Fee_InvalidateBlock(Blk)</code></td><td><code>SWS_Fee_00092</code></td><td>Async Invalidate để lần đọc sau trả <code>MEMIF_BLOCK_INVALID</code>.</td></tr>
    <tr><td><code>0x08</code></td><td><code>Fee_GetVersionInfo(Ptr)</code></td><td><code>SWS_Fee_00093</code></td><td>Sync Query lấy Vendor/Module/SW Version (bật qua <code>ECUC_Fee_00115</code>).</td></tr>
    <tr><td><code>0x09</code></td><td><code>Fee_EraseImmediateBlock(Blk)</code></td><td><code>SWS_Fee_00094</code></td><td>Async Prep dọn sẵn không gian cho block có <code>FeeImmediateData = TRUE</code>.</td></tr>
    <tr><td><code>0x10</code></td><td><code>Fee_JobEndNotification(...)</code></td><td><code>SWS_Fee_00095</code></td><td>Unified R25-11 callback từ <code>MemAcc</code> <b>[SWS_Fee_00194]</b> (gộp cả lỗi thay cho <code>0x11</code> cũ).</td></tr>
    <tr><td><code>0x12</code></td><td><code>Fee_MainFunction()</code></td><td><code>SWS_Fee_00097</code></td><td>Scheduled Cyclic Engine thực thi Read/Write/EraseImm/GC/Startup Scan.</td></tr>
  </tbody>
</table>
<p style="margin-top:6px"><i>Ghi chú Legacy R20-11:</i> Service ID <code>0x01 Fee_SetMode(Mode)</code> đã được <b>loại bỏ</b> kể từ khi AUTOSAR chuyển tầng dưới sang <code>MemAcc</code> (R21-11..R25-11). Trình mô phỏng vẫn giữ nút Speed Mode để so sánh trực tiếp kịch bản Classic <code>Fls</code> (Kịch bản S9).</p>
"""
            },
            {
                "title": "Cân Bằng Slow Mode vs Fast Mode & MemAcc Timing",
                "diag": "5-1",
                "swsRefs": [
                    {"id": "ECUC_Fee_00153", "desc": "FeeMainFunctionPeriod cyclic period (s)"},
                    {"id": "ECUC_Fee_00114", "desc": "FeePollingMode vs Callback mode"},
                    {"id": "ECUC_Fee_00157", "desc": "FeeBufferAlignmentValue alignment constraint"},
                    {"id": "SWS_Fee_00195", "desc": "DataBufferPtr aligned to FeeBufferAlignmentValue"},
                ],
                "html": """
<p>Chu kỳ gọi <code>Fee_MainFunction()</code> (<code>FeeMainFunctionPeriod</code> <b>[ECUC_Fee_00153]</b>), cơ chế hỏi/ngắt (<code>FeePollingMode</code> <b>[ECUC_Fee_00114]</b>) và thông lượng tầng dưới quyết định CPU load lúc xe chạy vs Shutdown Time:</p>
<ul>
  <li><b>MEMIF_MODE_SLOW (Classic R20-11 khi xe đang chạy):</b> Giới hạn khoảng <code>8 B/tick</code> để không chiếm dụng lâu bus Flash hay gây jitter ngắt động cơ. Một block <code>32B</code> cần <code>32 / 8 = 4 ticks = 20ms</code> (với chu kỳ 5ms).</li>
  <li><b>MEMIF_MODE_FAST (Khi EcuM Shutdown / NvM_WriteAll):</b> Đẩy lên <code>64 B/tick</code>, giúp block <code>32B</code> ghi xong chỉ trong <b>1 tick = 5ms</b> (nhanh gấp 4 lần).</li>
  <li><b>Trên R23-11 / R25-11 MemAcc:</b> Thay cho <code>Fee_SetMode()</code>, nhà tích hợp tinh chỉnh độ ưu tiên AddressArea trong <code>MemAcc</code>, chu kỳ <code>FeeMainFunctionPeriod</code> <b>[ECUC_Fee_00153]</b> và căn chỉnh RAM buffer theo <code>FeeBufferAlignmentValue</code> <b>[SWS_Fee_00195 / ECUC_Fee_00157]</b> để bật DMA zero-copy!</li>
</ul>
"""
            },
            {
                "title": "Tính Toán Dung Lượng Sector & Hệ Số Hao Mòn",
                "diag": "5-2",
                "swsRefs": [
                    {"id": "ECUC_Fee_00148", "desc": "FeeBlockSize payload length"},
                    {"id": "ECUC_Fee_00110", "desc": "FeeNumberOfWriteCycles block endurance"},
                    {"id": "ECUC_Fee_00116", "desc": "FeeVirtualPageSize alignment unit"},
                    {"id": "ECUC_Fee_00117", "desc": "FeeBlockOverhead bytes per instance"},
                    {"id": "ECUC_Fee_00118", "desc": "FeePageOverhead bytes per page"},
                    {"id": "SWS_Fee_00102", "desc": "Uniform sector wear calculation"},
                    {"id": "SWS_Fee_00103", "desc": "Cluster erase endurance formula"},
                ],
                "html": """
<p>Khi thiết kế cấu hình Fee cho một dự án ECU thực tế, kỹ sư Memory Stack phải kiểm chứng bài toán <b>Endurance Sizing [SWS_Fee_00102 / SWS_Fee_00103]</b>:</p>
<ol>
  <li>Tính tổng dung lượng cần lưu đồng thời ít nhất 1 bản <code>VALID</code> cho tất cả <code>N</code> Block: <code>Sum(AlignUp(FeeBlockOverhead, VP) + AlignUp(FeeBlockSize_i, VP))</code> <b>[ECUC_Fee_00116/00117/00148]</b>.</li>
  <li>Đảm bảo <code>BankSize * (GcThreshold / 100) &gt;&gt; Sum(SlotSize_i)</code>. Nếu quá sát ngưỡng Threshold, Fee sẽ rơi vào vòng lặp <b>GC Thrashing</b> (vừa GC xong đã chạm ngưỡng lại phải GC tiếp)!</li>
  <li>Luôn chừa đủ vùng <code>ReservedImmediateSpaceBytes &gt;= Sum(ImmediateSlots)</code> và kiểm tra tổng số lần xóa dự kiến từ <code>FeeNumberOfWriteCycles</code> <b>[ECUC_Fee_00110]</b> không vượt P/E tối đa của MCU Flash.</li>
</ol>
"""
            },
            {
                "title": "Checklist Kiểm Thử Thực Chiến & Debug Pitfalls",
                "diag": "5-3",
                "swsRefs": [
                    {"id": "SWS_Fee_00009", "desc": "Immediate preempts BUSY_INTERNAL (not MEMIF_BUSY)"},
                    {"id": "SWS_Fee_00144", "desc": "FEE_E_BUSY if any write called while MEMIF_BUSY"},
                    {"id": "SWS_Fee_00184", "desc": "FEE_E_INVALID_CANCEL if Cancel != MEMIF_BUSY"},
                    {"id": "SWS_Fee_00194", "desc": "Unified Fee_JobEndNotification handling"},
                    {"id": "SWS_Fee_91002", "desc": "Runtime errors always reported to DET"},
                ],
                "html": """
<p>Danh sách các lỗi thực chiến phổ biến nhất và kịch bản kiểm chứng ngay trên Trình Mô Phỏng:</p>
<ul>
  <li><b>Pitfall 1 — Quên chuyển tốc độ trước <code>NvM_WriteAll()</code> (R20-11) hoặc thiếu băng thông MemAcc:</b> Khiến tụ nguồn cạn trước khi lưu xong -&gt; kiểm chứng ở Kịch bản <b>S9</b>!</li>
  <li><b>Pitfall 2 — Chọn <code>FeeVirtualPageSize</code> quá lớn (ví dụ 32B) cho các Block nhỏ 8B:</b> Gây lãng phí tới 75% DFlash cho byte padding <code>0xFF</code> -&gt; đổi Tab 2 Page Size để quan sát!</li>
  <li><b>Pitfall 3 — Chưa test Power-Cut đúng Phase 2 (Torn Write):</b> Bỏ sót <code>FeeAutoFallbackPreviousInstance</code> khiến Odometer mất trắng sau khi rút cọc bình -&gt; chạy Kịch bản <b>S6</b>!</li>
  <li><b>Pitfall 4 — Nhầm lẫn Immediate Data Preemption [SWS_Fee_00009 Note]:</b> Immediate Block chỉ xen ngang được <code>MEMIF_BUSY_INTERNAL</code> (GC nền); nếu gọi khi module đang <code>MEMIF_BUSY</code> (User Job), lệnh vẫn bị từ chối với Runtime Error <code>FEE_E_BUSY (0x06)</code> <b>[SWS_Fee_00144 / SWS_Fee_91002]</b> -&gt; kiểm tra ở Kịch bản <b>S8 &amp; S12</b>!</li>
</ul>
"""
            }
        ]
    },
    {
        "title": "Khái Niệm Sector, Page, Bank & Virtual Bank/Page",
        "subs": [
            {
                "title": "Physical Sector & Erase Unit",
                "diag": "6-0",
                "swsRefs": [
                    {"id": "SWS_Fee_00102", "desc": "Uniform wear leveling over physical sectors"},
                    {"id": "SWS_Fee_00103", "desc": "Cluster/sector erase cycle endurance guarantees"},
                    {"id": "SWS_Fee_00076", "desc": "Respects underlying Flash physical boundaries"},
                    {"id": "ECUC_Fee_00155", "desc": "FeeMemAccAddressArea groups sectors into banks"},
                ],
                "html": """
<p>Trên bộ nhớ <b>NOR Data Flash</b> của vi điều khiển ô tô, thao tác <b>Nạp (Program)</b> và thao tác <b>Xóa (Erase)</b> có kích thước đơn vị tối thiểu hoàn toàn khác nhau:</p>
<ul>
  <li><b>Physical Sector (Erase Block / Erase Unit):</b> Là <b>đơn vị nhỏ nhất có thể xóa</b> bằng lệnh phần cứng (<code>MemAcc_Erase() / Fls_Erase()</code>) để kéo toàn bộ các bit từ <code>0 -&gt; 1</code> về giá trị mặc định <code>FeeErasedValue (0xFF)</code>.</li>
  <li><b>Kích thước thực tế:</b> Trên MCU ô tô (Infineon AURIX TC3xx/TC4xx, NXP S32K, Renesas RH850...), một Physical Sector DFlash thường lớn từ <b>2 KB, 4 KB, 8 KB tới 64 KB</b> (trình mô phỏng thu nhỏ thành <code>256 B</code> để dễ quan sát từng slot).</li>
  <li><b>Hệ quả với Fee:</b> Một Logical Block của ứng dụng (ví dụ Odometer <code>14 B</code>, VIN <code>17 B</code>) nhỏ hơn hàng trăm lần so với 1 Sector, nên tuyệt đối không thể xóa lẻ 1 block! Vì thế Fee gom nối tiếp hàng chục/hàng trăm bản ghi vào chung một Sector (<i>Append-Only</i>) và chỉ xóa cả Sector khi thực hiện <b>Garbage Collection</b>.</li>
</ul>
<table class="tbl">
  <thead><tr><th>Thực thể</th><th>Phạm vi</th><th>Thao tác phần cứng</th><th>Vai trò trong Fee</th></tr></thead>
  <tbody>
    <tr><td><b>Physical Sector</b></td><td>Vùng Flash cố định trên silicon (VD: 4 KB)</td><td>Erase toàn khối (<code>0 -&gt; 1 = 0xFF</code>)</td><td>Giới hạn độ mịn thu hồi rác &amp; hao mòn P/E cycles <b>[SWS_Fee_00103]</b></td></tr>
    <tr><td><b>Bank / Cluster</b></td><td>Gồm <code>&gt;= 1</code> Physical Sector liên tiếp</td><td>Quản lý chung qua <code>FeeMemAccAddressArea</code> <b>[ECUC_Fee_00155]</b></td><td>Đơn vị hoán đổi <code>ACTIVE</code> ↔ <code>STANDBY</code> khi chạy GC</td></tr>
    <tr><td><b>Logical Block</b></td><td>Khối dữ liệu NvM (VD: <code>0x0010</code>, 14B)</td><td>Append ghi mới + đánh dấu bản cũ <code>SUPERSEDED</code></td><td>Đơn vị đọc/ghi/xóa mềm logic gửi xuống từ MemIf/NvM</td></tr>
  </tbody>
</table>
"""
            },
            {
                "title": "Physical Page vs Virtual Page",
                "diag": "6-1",
                "swsRefs": [
                    {"id": "SWS_Fee_00076", "desc": "Virtual page must align to physical write page"},
                    {"id": "SWS_Fee_00005", "desc": "Block header/payload occupy integer VP multiples"},
                    {"id": "SWS_Fee_00196", "desc": "FeeMinimumReadPageSize for partial read"},
                    {"id": "ECUC_Fee_00116", "desc": "FeeVirtualPageSize configuration parameter"},
                    {"id": "ECUC_Fee_00156", "desc": "FeeMinimumReadPageSize configuration parameter"},
                ],
                "html": """
<p>Kỹ sư Memory Stack cần phân biệt rạch ròi <b>Physical Page</b> (đơn vị phần cứng Flash), <b>Virtual Page</b> (đơn vị căn chỉnh của Fee) và <b>Minimum Read Page</b>:</p>
<ol>
  <li><b>Physical Write Page (ECC Phrase / Wordline):</b> Là kích thước nhỏ nhất phần cứng cho phép nạp một lần (Bit <code>1 -&gt; 0</code>) kèm mã sửa lỗi ECC nội tại (thường <code>4 B</code>, <code>8 B</code> hoặc <code>16 B</code>). Không bao giờ được nạp nửa Physical Page rồi quay lại ghi nốt nửa còn lại vì sẽ làm sai lệch ECC của cả phrase!</li>
  <li><b>Virtual Page (<code>FeeVirtualPageSize</code> [ECUC_Fee_00116]):</b> Đơn vị căn chỉnh logic do AUTOSAR Fee định nghĩa:
    <ul>
      <li><b>Quy tắc [SWS_Fee_00076]:</b> <code>FeeVirtualPageSize</code> phải lớn hơn hoặc bằng và là <b>bội số nguyên dương</b> của Physical Write Page (và Read Page).</li>
      <li><b>Quy tắc [SWS_Fee_00005]:</b> Cả <i>Block Header/Management Info</i> lẫn <i>Block Payload</i> đều phải được đệm byte trống (<code>0xFF</code>) lên bội số nguyên của Virtual Page (`SlotSize = AlignUp(Hdr, VP) + AlignUp(Data, VP)`).</li>
    </ul>
  </li>
  <li><b>Minimum Read Page (<code>FeeMinimumReadPageSize</code> [ECUC_Fee_00156 / SWS_Fee_00196]):</b> Kích thước nhỏ nhất để đọc Flash (thường là <code>1 B</code>), giải thích vì sao <code>Fee_Read()</code> có thể đọc từng byte lẻ ở giữa block dù khi ghi phải đệm theo Virtual Page!</li>
</ol>
<p><i>Ví dụ số học:</i> Nếu Physical Page = <code>8B</code> và cấu hình <code>VP = 8B</code>, khối Odometer <code>14B</code> sẽ chiếm <code>8B Hdr + 16B Payload (14B + 2B pad 0xFF) = 24B</code>. Nếu đặt nhầm <code>VP = 32B</code>, chỉ 14B dữ liệu sẽ tiêu tốn tới <code>32B Hdr + 32B Payload = 64B</code>!</p>
"""
            },
            {
                "title": "Physical/Logical Bank & Kiến Trúc Đa Bank (2–4 Banks)",
                "diag": "6-2",
                "swsRefs": [
                    {"id": "SWS_Fee_00102", "desc": "Uniform wear leveling over sectors/banks"},
                    {"id": "SWS_Fee_00103", "desc": "Spreading erase cycles across clusters/banks"},
                    {"id": "SWS_Fee_00009", "desc": "Reserved Immediate space inside Active Bank"},
                    {"id": "SWS_Fee_00074", "desc": "Internal management runs in MEMIF_BUSY_INTERNAL"},
                    {"id": "SWS_Fee_00197", "desc": "Returns to MEMIF_IDLE after GC Bank switch/erase"},
                ],
                "html": """
<p>Trong hệ thống Fee, <b>Bank (Logical Cluster)</b> là một phân vùng chứa <code>&gt;= 1</code> Physical Sector có khả năng bị xóa độc lập mà không làm ảnh hưởng các Bank khác:</p>
<ul>
  <li><b>Tại sao tối thiểu &amp; mặc định phải có 2 Bank?</b> Để bảo toàn dữ liệu khi sập nguồn giữa lúc dọn rác (<i>Power-Fail Safe GC</i>): tại mọi thời điểm chỉ có <b>1 Bank Active</b> nhận ghi mới và ít nhất <b>1 Bank Standby đã xóa sạch (<code>0xFF</code>)</b>. Fee luôn copy dữ liệu sống sang Bank Standby và đảo nhãn Active xong xuôi rồi mới gọi <code>Erase()</code> lên Bank cũ.</li>
  <li><b>Mở rộng lên 3 hoặc 4 Bank (Tối đa 4 Bank trên Simulator):</b> Khi tăng số Bank từ 2 lên 3 hoặc 4, bộ thu gom rác sẽ xoay vòng chọn Bank Standby sạch có số lần xóa (<code>EraseCount</code>) nhỏ nhất làm đích tiếp theo (<code>Bank 0 -&gt; Bank 1 -&gt; Bank 2 -&gt; Bank 3 -&gt; Bank 0</code>), giúp giảm tần suất xóa trên từng sector và tăng tổng tuổi thọ ECU <b>[SWS_Fee_00102 / SWS_Fee_00103]</b>.</li>
  <li><b>Quy tắc Bớt Bank An Toàn:</b> Chỉ được phép xóa bớt Bank khi tổng số Bank <code>&gt; 2</code>, Bank bị xóa <b>không phải là <code>ACTIVE BANK</code></b> (tránh mất dữ liệu đang chạy) và hệ thống <b>không có Garbage Collection đang kích hoạt (GC Triggered)</b>.</li>
</ul>
"""
            },
            {
                "title": "Virtual Bank, Virtual Address & Cách Fee Ảo Hóa EEPROM",
                "diag": "6-3",
                "swsRefs": [
                    {"id": "SWS_Fee_00007", "desc": "Block addressing & dataset selection calculation"},
                    {"id": "SWS_Fee_00100", "desc": "Virtual 32-bit block numbering & dataset index"},
                    {"id": "SWS_Fee_00071", "desc": "Logical-to-physical cluster alignment"},
                    {"id": "ECUC_Fee_00150", "desc": "FeeBlockNumber logical block identifier"},
                    {"id": "ECUC_Fee_00155", "desc": "FeeMemAccAddressArea linear address mapping"},
                ],
                "html": """
<p>Thuật ngữ <b>Virtual Bank</b> và <b>Virtual Page / Virtual Address</b> phản ánh 2 tầng trừu tượng hóa mà Fee tạo ra để "biến Data Flash thành EEPROM":</p>
<ul>
  <li><b>"Virtual Bank" là gì?</b> Chuẩn AUTOSAR SWS không đặt từ khóa <code>Virtual Bank</code> làm tham số ECUC chính thức, nhưng trong thực tế thuật ngữ này được dùng để chỉ <b>vai trò logic động của Bank/Cluster</b> (<code>Virtual Active Bank</code> vs <code>Virtual Standby Bank</code>) hoặc <b>vùng địa chỉ tuyến tính ảo</b> do <code>MemAcc_AddressAreaId</code> <b>[ECUC_Fee_00155]</b> gộp nhiều Physical Sector thành một Bank logic thống nhất. NvM không bao giờ biết dữ liệu thực nằm ở Physical Bank 0, Bank 1, Bank 2 hay Bank 3.</li>
  <li><b>Virtual Block Addressing [SWS_Fee_00007 / SWS_Fee_00100]:</b> Tầng trên <code>NvM/MemIf</code> chỉ làm việc với <code>BlockNumber</code> 16-bit (kết hợp <code>DatasetIndex</code> ở các bit LSB) và <code>BlockOffset</code> tính theo byte. Sau mỗi lần ghi nối đuôi hoặc GC đổi Bank, Fee âm thầm cập nhật ánh xạ <code>BlockNumber -&gt; {BankId, PhysicalOffset}</code> trong <code>RAM LUT</code>.</li>
</ul>
<h4>Bảng Tổng Hợp Phân Biệt 4 Khái Niệm Cốt Lõi</h4>
<table class="tbl">
  <thead><tr><th>Khái niệm</th><th>Thuộc Tầng</th><th>Bản chất</th><th>Ví dụ trên Simulator</th></tr></thead>
  <tbody>
    <tr><td><b>Physical Page</b></td><td>Phần cứng DFlash</td><td>Đơn vị lập trình ECC tối thiểu (<code>1 -&gt; 0</code>)</td><td>8 Bytes / phrase phần cứng</td></tr>
    <tr><td><b>Virtual Page</b></td><td>AUTOSAR Fee Config</td><td>Đơn vị căn chỉnh Header &amp; Payload <b>[SWS_Fee_00005/00076]</b></td><td><code>FeeVirtualPageSize = 8B / 16B / 32B</code></td></tr>
    <tr><td><b>Physical Sector</b></td><td>Phần cứng DFlash</td><td>Đơn vị Erase tối thiểu (<code>0 -&gt; 1 = 0xFF</code>)</td><td>1 Bank = 256B (thực tế 2KB..64KB)</td></tr>
    <tr><td><b>Bank / Virtual Bank</b></td><td>Fee / MemAcc Cluster</td><td>Phân vùng xoay vòng vai trò <code>ACTIVE</code> ↔ <code>STANDBY</code></td><td><code>2..4 Banks</code> (<code>0x0800_0000..0x0800_3000</code>) + RAM LUT</td></tr>
  </tbody>
</table>
"""
            }
        ]
    }
]


def build_sws_ref_bar(refs):
    if not refs:
        return ""
    chips = []
    for r in refs:
        rid = str(r["id"])
        cls = ""
        if rid.startswith("ECUC_"):
            cls = "is-ecuc"
        elif not rid.startswith("SWS_Fee_"):
            cls = "is-sys"
        title_attr = html.escape(r["desc"], quote=True)
        chips.append(
            f'<span class="hb-sws-chip {cls}" title="{title_attr}">'
            f'<span class="hb-sws-id">{html.escape(rid)}</span>'
            f'<span class="hb-sws-desc">{html.escape(r["desc"])}</span>'
            f'</span>'
        )
    return (
        '<div class="hb-sws-bar" role="note" aria-label="AUTOSAR SWS References">'
        '<span class="hb-sws-hdr">📘 AUTOSAR SWS_ID:</span>'
        f'<div class="hb-sws-list">{"".join(chips)}</div>'
        '</div>'
    )


def build_handbook_payload():
    data = []
    for main_idx, tab in enumerate(HANDBOOK_TOPICS):
        subs_out = []
        for sub_idx, sub in enumerate(tab["subs"]):
            svg = get_fee_diagram(sub["diag"])
            sws_bar = build_sws_ref_bar(sub.get("swsRefs", []))
            subs_out.append({
                "title": sub["title"],
                "contentHtml": f"""
<div class="hb-card">
  <h3>{sub["title"]}</h3>
  {sws_bar}
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
// PART 6: GENERATED HANDBOOK (7x4 TOPICS + SVGs), ABBREVIATIONS & BOOTSTRAP
// ============================================================================

const HANDBOOK_DATA = {hb_json};
const HB_ABBR_TAB_IDX = HANDBOOK_DATA.length;

let hbState = {{
  mainTab: 0,
  subTab: 0,
  abbrCat: 'ALL'
}};

function switchHbTab1(idx) {{
  hbState.mainTab = idx;
  hbState.subTab = 0;
  for (let i = 0; i <= HB_ABBR_TAB_IDX; i++) {{
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
  if (hbState.mainTab === HB_ABBR_TAB_IDX) {{
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

  if (hbState.mainTab === HB_ABBR_TAB_IDX) {{
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
  if (!area || hbState.mainTab !== HB_ABBR_TAB_IDX) return;

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
