# -*- coding: utf-8 -*-
"""Generates part6_handbook.js (6x4 Multi-level Handbook + 18 SVGs + 52 Abbreviations + Live Search + Bootstrap)."""

import json
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

from hb_diagrams_ea import DIAGRAM_BUILDERS


def card(title, body_html):
    return f'<div class="hb-card"><h3>{title}</h3>{body_html}</div>'


def tbl(headers, rows):
    ths = "".join(f"<th>{h}</th>" for h in headers)
    trs = "".join("<tr>" + "".join(f"<td>{c}</td>" for c in r) + "</tr>" for r in rows)
    return f'<table class="tbl"><thead><tr>{ths}</tr></thead><tbody>{trs}</tbody></table>'


# =========================================================================
# 6 MAIN LEVEL-1 TABS x 4 LEVEL-2 SUB-TABS (24 TOPICS WITH 18 SVGS)
# =========================================================================

HANDBOOK_TABS = [
    {
        "id": 0,
        "title": "1. Kiến Trúc Memory Stack & Ea",
        "subTabs": [
            {
                "title": "1.1 Tổng Quan 5 Tầng",
                "html": (
                    card(
                        "Vai Trò Của Ea (ModuleId = 40) Trong AUTOSAR Classic",
                        "<p><b>Ea (EEPROM Abstraction)</b> nằm tại tầng <b>ECU Abstraction (04_ECU_Abstraction)</b>. Nhiệm vụ cốt lõi là cung cấp cơ chế đánh địa chỉ 32-bit ảo hóa không gian <b>Logical Block (BlockNumber)</b> bất biến cho tầng trên (<b>MemIf / NvM</b>), che giấu hoàn toàn sự thay đổi địa chỉ vật lý trên chip <b>EEPROM (SPI/I2C)</b> bên dưới.</p>"
                        + DIAGRAM_BUILDERS["memstack_5layer"]()
                    )
                    + card(
                        "Nguyên Tắc Tách Biệt Trong Memory Stack",
                        "<ul>"
                        "<li><b>SWC &amp; Application:</b> Chỉ gọi <code>Rte_Call_NvMService_*()</code>, tuyệt đối không biết Block nằm ở EEPROM hay Data Flash.</li>"
                        "<li><b>NvM:</b> Lo hàng đợi Immediate/Standard, CRC, Retry, ROM Fallback và Dataset Index.</li>"
                        "<li><b>MemIf:</b> Lớp trừu tượng đồng nhất API cho cả <code>Ea</code> và <code>Fee</code>.</li>"
                        "<li><b>Ea:</b> Quản lý tính toàn vẹn Slot (Header/Footer), Wear-Leveling, Virtual Page Alignment và phát Job tới <code>Eep</code>.</li>"
                        "</ul>"
                    )
                )
            },
            {
                "title": "1.2 Bảng I/O 10 Module",
                "html": card(
                    "Luồng Input / Processing / Output Của 10 Module Tương Tác Với Ea",
                    tbl(
                        ["STT", "Module", "Input Nhận Vào", "Xử Lý Cốt Lõi", "Output Gửi Đi"],
                        [
                            ["1", "<b>SWC_App / Diag</b>", "Sự kiện App / UDS 0x2E, Callback RTE", "Chuẩn bị RAM buffer, gọi cổng Client-Server", "<code>Rte_Call_NvMService_Write/ReadBlock</code>"],
                            ["2", "<b>RTE</b>", "Port call từ SWC &amp; NvM Callback", "Ánh xạ Port-Defined BlockId", "<code>NvM_WriteBlock()</code> / Runnable trigger"],
                            ["3", "<b>EcuM / BswM</b>", "Startup / Shutdown / Mode switch", "Điều phối init driver &amp; FAST/SLOW", "<code>Ea_Init(NULL_PTR)</code>, <code>Ea_SetMode()</code>"],
                            ["4", "<b>SchM / OS</b>", "OS Alarm chu kỳ 5ms (Configurable)", "Kích hoạt Scheduled Function", "<code>Ea_MainFunction()</code>, <code>Eep_MainFunction()</code>"],
                            ["5", "<b>NvM (ID=20)</b>", "Job từ RTE, Callback từ Ea", "Xếp hàng đợi, CRC, ghép Dataset", "<code>MemIf_Read/Write/Invalidate/Erase</code>"],
                            ["6", "<b>MemIf (ID=22)</b>", "<code>(DeviceIndex, BlockNumber)</code>", "Macro (1 dev) hoặc FctPtr[Idx] (2+ dev)", "<code>Ea_Read()</code> / <code>Ea_Write()</code> (khi DevIdx=0)"],
                            ["7", "<b>Ea (ID=40)</b>", "API MemIf, Callback/Poll Eep, Tick", "Logical→Physical, Header/Footer, Wear-Level", "<code>Eep_Write/Read/Erase()</code>, NvM Cbk"],
                            ["8", "<b>Eep (ID=90)</b>", "Physical Address, Buffer, Length", "Đóng khung SPI/I2C theo Slow/Fast Chunk", "Gửi lệnh phần cứng &amp; báo DEM/JobEnd"],
                            ["9", "<b>SPI / EEPROM HW</b>", "SPI MOSI/CLK/CS Frames", "Ghi cell EEPROM (từ 3-5ms mỗi page)", "MISO Data / ECC status / Timeout"],
                            ["10", "<b>DET &amp; DEM</b>", "<code>Det_ReportError</code> / <code>Dem_SetEventStatus</code>", "Ghi nhận lỗi phát triển &amp; lỗi HW thực tế", "Lưu DTC/Event, chặn Job sai luật"]
                        ]
                    )
                )
            },
            {
                "title": "1.3 Định Tuyến MemIf → Ea",
                "html": (
                    card(
                        "Cách MemIf Phân Nhánh Giữa Ea Và Fee",
                        "<p><code>MemIf</code> giúp <code>NvM</code> chỉ cần biết cặp <code>(DeviceIndex, BlockNumber)</code>. Giá trị <code>EaIndex</code> trong Container <code>EaGeneral</code> quy định chỉ số DeviceIndex mà Ea phụ trách (mặc định <code>0</code>).</p>"
                        + DIAGRAM_BUILDERS["memif_routing"]()
                    )
                    + card(
                        "Macro Mode vs Function Pointer Array",
                        tbl(
                            ["Chế độ MemIf", "Điều kiện cấu hình", "Cơ chế gọi hàm", "Chi phí RAM/Flash"],
                            [
                                ["<b>1 Device (Only Ea)</b>", "<code>MemIfNumberOfDevices == 1</code>", "Macro <code>#define MemIf_Write(dev,blk,ptr) Ea_Write(blk,ptr)</code>", "0 byte Flash table, tốc độ tối đa"],
                                ["<b>2+ Devices (Ea + Fee)</b>", "<code>MemIfNumberOfDevices &gt;= 2</code>", "Bảng con trỏ hàm <code>MemIf_WriteFctPtr[DeviceIndex](blk,ptr)</code>", "Tốn nhẹ ROM bảng lookup, linh hoạt hybrid"]
                            ]
                        )
                    )
                )
            },
            {
                "title": "1.4 Hai Thanh Ghi 8-Bit",
                "html": (
                    card(
                        "Giải Mã Dual 8-Bit Monitor Trong Simulator",
                        "<p>Simulator nén toàn bộ trạng thái nội tại của Ea thành 2 thanh ghi 8-bit tương tác trực tiếp, giúp quan sát ngay lập tức mỗi biến đổi bit sau từng <code>+5ms MainFn</code> hoặc mỗi lần tiêm lỗi.</p>"
                        + DIAGRAM_BUILDERS["dual_registers"]()
                    )
                    + card(
                        "Chi Tiết Từng Bit & Tương Tác Click-To-Toggle",
                        tbl(
                            ["Bit", "Reg A: Ea_ModuleJobStatusByte", "Reg B: Ea_BlockHeaderControlByte"],
                            [
                                ["<b>b7</b>", "<code>EA_INITIALIZED</code> (1=Init xong, 0=UNINIT)", "<code>BLK_HDR_START_WR</code> (1 khi Header[0]==0xA5)"],
                                ["<b>b6</b>", "<code>EA_STATUS_BUSY</code> (1=MEMIF_BUSY)", "<code>BLK_FTR_VALID</code> (1 khi Footer[0]==0x5A khớp Cnt)"],
                                ["<b>b5</b>", "<code>EA_BUSY_INTERNAL</code> (1 khi Init quét Slot)", "<code>BLK_INCONSISTENT</code> (1 khi mất nguồn / 0xFF rỗng)"],
                                ["<b>b4</b>", "<code>JOB_PENDING</code> (1 khi Job chưa xong)", "<code>BLK_INVALIDATED</code> (1 khi Header==0x0000)"],
                                ["<b>b3</b>", "<code>JOB_RESULT_OK</code> (1 khi hoàn tất OK)", "<code>IMM_DATA_BLOCK</code> (1 khi EaImmediateData=TRUE)"],
                                ["<b>b2</b>", "<code>EEP_SUBJOB_ACTV</code> (1 khi chờ Eep_MainFunction)", "<code>IMM_PRE_ERASED</code> (1 khi đã gọi EraseImmediate)"],
                                ["<b>b1</b>", "<code>FAST_MODE_EN</code> (1=FAST, 0=SLOW)", "<code>WEAR_SLOT_ROTATE</code> (1 khi Block có &gt;1 Slot)"],
                                ["<b>b0</b>", "<code>POLLING_MODE_EN</code> (1=Polling, 0=Callback)", "<code>JOB_ERR_OR_CANCEL</code> (1 khi Cancel/HW Err/DET)"]
                            ]
                        )
                    )
                )
            }
        ]
    },
    {
        "id": 1,
        "title": "2. Ánh Xạ, Virtual Page & Wear-Level",
        "subTabs": [
            {
                "title": "2.1 Công Thức BlockNumber",
                "html": (
                    card(
                        "Cách NvM Tạo EaBlockNumber Từ BlockBase & DataIndex",
                        "<p>Trong AUTOSAR, một <code>NvMBlockDescriptor</code> kiểu <code>NVM_BLOCK_DATASET</code> có thể chứa nhiều bản sao dữ liệu cùng cấu trúc (ví dụ Key/VIN/Chẩn đoán). Khi truyền xuống Ea, NvM mã hóa <b>BlockBase</b> và <b>DataIndex</b> thành <b>EaBlockNumber</b> duy nhất theo chuẩn <code>SWS_Ea</code>:</p>"
                        + DIAGRAM_BUILDERS["blocknumber_formula"]()
                    )
                    + card(
                        "4 Block Mẫu Trong Simulator",
                        tbl(
                            ["Logical Entry", "BlockNumber", "Payload Size", "Thuộc Tính Chính", "Mục Đích Thực Tế"],
                            [
                                ["<b>Blk_Calibration (BLK1)</b>", "<code>#1 (0x0001)</code>", "12 B → 16 B", "Single Slot · Immediate=FALSE", "Tham số hiệu chỉnh chuẩn"],
                                ["<b>Blk_Dataset[0/1]</b>", "<code>#2, #3</code>", "8 B → 16 B", "Base=2 · Dataset Copy 0 &amp; 1", "2 phiên bản VIN / Certificate"],
                                ["<b>Blk_Odometer_Wear</b>", "<code>#4 (0x0004)</code>", "4 B → 8 B × 4", "WriteCycles=400k → 4 Slots", "Ghi quãng đường liên tục"],
                                ["<b>Blk_Crash_ImmData</b>", "<code>#5 (0x0005)</code>", "10 B → 16 B", "ImmediateData=TRUE", "Dữ liệu túi khí va chạm"]
                            ]
                        )
                    )
                )
            },
            {
                "title": "2.2 Virtual Page & Padding",
                "html": (
                    card(
                        "Căn Chỉnh Địa Chỉ Vật Lý Theo EaVirtualPageSize",
                        "<p>Để tương thích với độ rộng trang ghi (Page Size) của phần cứng EEPROM (4B, 8B, 16B hoặc 32B) và đảm bảo hai block kề nhau không bao giờ ghi đè chung một trang EEPROM vật lý, Ea luôn làm tròn kích thước mỗi Slot lên bội số của <code>EaVirtualPageSize</code>.</p>"
                        + DIAGRAM_BUILDERS["virtual_page_align"]()
                    )
                    + card(
                        "Công Thức Tính Toán Kích Thước Thực Tế",
                        "<ul>"
                        "<li><code>RawSize = EaBlockSize + EaBlockOverhead</code> (mặc định Overhead = 4B cho 2B Header + 2B Footer).</li>"
                        "<li><code>AlignedSlotSize = Math.ceil(RawSize / EaVirtualPageSize) * EaVirtualPageSize</code>.</li>"
                        "<li><code>PaddingBytes = AlignedSlotSize - RawSize</code> (được giữ ở giá trị erased <code>0xFF</code>).</li>"
                        "<li><b>Trade-off:</b> Tăng <code>EaVirtualPageSize</code> từ 8B lên 16B sẽ làm mỗi block tốn thêm Padding <code>0xFF</code> và tăng tổng dung lượng EEPROM tiêu thụ! Hãy thử điều chỉnh ở Tab 0 hoặc What-If trong Kịch bản <b>S1/S5</b>.</li>"
                        "</ul>"
                    )
                )
            },
            {
                "title": "2.3 Multi-Slot Wear-Leveling",
                "html": (
                    card(
                        "Thuật Toán Xoay Vòng Slot Chống Chai Mòn EEPROM",
                        "<p>Mỗi cell EEPROM chỉ chịu được tối đa <code>EepAllowedWriteCycles</code> (ví dụ <code>100,000</code> lần). Nếu một Block như Odometer cần <code>EaNumberOfWriteCycles = 400,000</code> lần trong vòng đời xe, Ea tự động cấp phát <code>Math.ceil(400000 / 100000) = 4 Slots</code> liền kề và xoay vòng luân phiên mỗi lần <code>Ea_Write()</code>.</p>"
                        + DIAGRAM_BUILDERS["wear_leveling_slots"]()
                    )
                    + card(
                        "Lợi Ích Kép Của Multi-Slot Rotation",
                        "<ul>"
                        "<li><b>Kéo dài tuổi thọ gấp N lần:</b> Mỗi Slot chỉ phải chịu <code>1/N</code> số chu kỳ xóa-ghi thực tế.</li>"
                        "<li><b>An toàn Rollback tự nhiên:</b> Vì lần ghi mới viết sang Slot kế tiếp (ví dụ từ Slot #2 sang Slot #3), nếu xe sập nguồn đột ngột giữa pha ghi Slot #3, toàn bộ dữ liệu cũ trong <b>Slot #2 vẫn còn nguyên vẹn VALID</b>!</li>"
                        "</ul>"
                    )
                )
            },
            {
                "title": "2.4 Quét Slot & Wrap-Around",
                "html": card(
                    "Thuật Toán Xác Định Bản Ghi Mới Nhất Khi Khởi Động (Counter Rollover)",
                    "<p>Mỗi Header/Footer mang theo 1-byte <b>Sequence Counter</b> tăng dần sau mỗi lần ghi thành công (<code>0x01 → 0x02 → ... → 0xFE → 0xFF → 0x00</code>). Khi Counter quay vòng từ <code>0xFF</code> sang <code>0x00</code>, nếu so sánh số nguyên thông thường (<code>0x00 &lt; 0xFF</code>) sẽ chọn nhầm bản cũ!</p>"
                    + tbl(
                        ["Slot", "Header Cnt", "Footer Cnt", "Trạng Thái Slot", "So Sánh Modulo ((a - b) &amp; 0xFF) &lt; 128"],
                        [
                            ["Slot #0", "<code>0xFE</code>", "<code>0xFE</code>", "VALID", "Cũ hơn <code>0xFF</code>"],
                            ["Slot #1", "<code>0xFF</code>", "<code>0xFF</code>", "VALID", "Cũ hơn <code>0x00</code> vì <code>(0x00 - 0xFF) &amp; 0xFF == 1 &lt; 128</code>"],
                            ["Slot #2", "<code>0x00</code>", "<code>0x00</code>", "<b>VALID (MỚI NHẤT!)</b>", "Được Ea chọn làm Active Slot sau Wrap-Around!"],
                            ["Slot #3", "<code>0xFF</code>", "<code>0xFF</code>", "ERASED / INCONSIS", "Bị bỏ qua khi tìm bản Valid mới nhất"]
                        ]
                    )
                    + "<p style='margin-top:8px'>💡 Trải nghiệm thực tế ở <b>Kịch bản S8</b> để chứng kiến <code>0xFF → 0x00</code> hoạt động chính xác như thế nào!</p>"
                )
            }
        ]
    },
    {
        "id": 2,
        "title": "3. Header/Footer & Chống Sập Nguồn",
        "subTabs": [
            {
                "title": "3.1 Giải Phẫu 1 Slot EEPROM",
                "html": (
                    card(
                        "Định Dạng Vật Lý Của Một Block Slot Trong Ea",
                        "<p>Thay vì lưu dữ liệu thô dễ hỏng khi mất điện, Ea bọc mỗi bản ghi giữa <b>Start Marker (Header)</b> ở đầu và <b>Valid Marker (Footer)</b> ở cuối. Chính khoảng cách hai đầu này giúp phát hiện chính xác việc ghi bị ngắt quãng ở bất kỳ byte nào ở giữa.</p>"
                        + DIAGRAM_BUILDERS["slot_anatomy"]()
                    )
                    + card(
                        "Ý Nghĩa Các Giá Trị Byte Đặc Biệt",
                        tbl(
                            ["Byte Pattern", "Vị Trí", "Ý Nghĩa Kỹ Thuật"],
                            [
                                ["<code>0xA5, Cnt</code>", "Header (2B đầu)", "Bắt đầu phiên ghi thứ <code>Cnt</code>"],
                                ["<code>0x5A, Cnt</code>", "Footer (2B sau Data)", "Xác nhận Payload + Padding ghi hoàn tất nguyên vẹn"],
                                ["<code>0x00, 0x00</code>", "Header &amp; Footer", "Block đã bị <code>Ea_InvalidateBlock()</code> vô hiệu hóa chủ động"],
                                ["<code>0xFF, 0xFF</code>", "Toàn vùng / Footer", "Ô nhớ trắng mới xóa (Erased) hoặc Footer chưa kịp ghi khi mất điện"]
                            ]
                        )
                    )
                )
            },
            {
                "title": "3.2 Ghi 3 Pha & Power-Loss",
                "html": (
                    card(
                        "Chuỗi Ghi Nguyên Tử (Atomic Commit) 3 Bước Trong Ea_MainFunction()",
                        "<p>Một lệnh <code>Ea_Write()</code> không bao giờ ghi 1 mạch vô điều kiện. Nó chia làm 3 sub-job tuần tự thông qua <code>Eep_Write()</code>:</p>"
                        + DIAGRAM_BUILDERS["atomic_powerloss"]()
                    )
                    + card(
                        "Điều Gì Xảy Ra Nếu Bật SimulatePowerLossMidWrite = TRUE?",
                        "<ul>"
                        "<li><b>Pha 1 xong:</b> Header đã xuống EEPROM là <code>[0xA5, Cnt]</code>.</li>"
                        "<li><b>Pha 2 bị ngắt giữa chừng:</b> Chỉ một nửa Payload được ghi, Pha 3 (<code>WRITE_FTR</code>) không bao giờ được thực thi nên Footer vẫn giữ <code>0xFF, 0xFF</code>.</li>"
                        "<li><b>Kết quả đọc lại:</b> Khi gọi <code>Ea_Read()</code>, Ea thấy <code>Hdr=0xA5</code> nhưng <code>Ftr!=0x5A</code> → kết luận ngay <b><code>MEMIF_BLOCK_INCONSISTENT</code></b> để ngăn SWC dùng dữ liệu nửa vời bị rác!</li>"
                        "</ul>"
                    )
                )
            },
            {
                "title": "3.3 Cây Quyết Định Ea_Read",
                "html": (
                    card(
                        "Cách Ea Phân Loại Kết Quả Đọc Lên NvM (SWS_Ea_00086)",
                        "<p>Mỗi lần <code>Ea_Read()</code> chạy, Ea không tin tưởng mù quáng vào payload mà kiểm tra cặp Header/Footer trước khi xác nhận kết quả cho <code>NvM</code>:</p>"
                        + DIAGRAM_BUILDERS["read_decision_tree"]()
                    )
                    + card(
                        "Phản Ứng Của NvM Trước Từng Mã Lỗi",
                        tbl(
                            ["JobResult từ Ea", "Ý nghĩa tại tầng Ea", "Hành động tiếp theo của NvM"],
                            [
                                ["<code>MEMIF_JOB_OK</code>", "Hdr 0xA5 &amp; Ftr 0x5A khớp Cnt", "Kiểm tra CRC; nếu đạt → copy vào RAM SWC"],
                                ["<code>MEMIF_BLOCK_INVALID</code>", "Hdr == 0x0000 (Invalidate)", "Ghi nhận Block rỗng hợp lệ, nạp ROM Default nếu cấu hình"],
                                ["<code>MEMIF_BLOCK_INCONSISTENT</code>", "Dữ liệu hỏng / sập nguồn / mới tinh 0xFF", "Tự động thử Read Redundant/Wear Slot cũ hoặc nạp ROM Default"]
                            ]
                        )
                    )
                )
            },
            {
                "title": "3.4 Invalidate vs Erase",
                "html": card(
                    "So Sánh Ea_InvalidateBlock() vs Ea_EraseImmediateBlock()",
                    tbl(
                        ["Tiêu chí", "Ea_InvalidateBlock(BlkNo) [0x07]", "Ea_EraseImmediateBlock(BlkNo) [0x09]"],
                        [
                            ["<b>Mục đích</b>", "Hủy bỏ dữ liệu cũ (vd: xóa thông tin nhạy cảm / reset factory) mà không xóa toàn slot", "Xóa trắng sẵn ô nhớ trước khi sự kiện khẩn cấp xảy ra"],
                            ["<b>Byte ghi xuống HW</b>", "Ghi đè <code>0x00, 0x00</code> vào 2 byte Header (tốn ít thời gian ghi nhất)", "Gọi <code>Eep_Erase()</code> đưa toàn bộ <code>SlotSize</code> byte về <code>0xFF</code>"],
                            ["<b>Điều kiện cấu hình</b>", "Mọi Block hợp lệ đều gọi được", "Bắt buộc <code>EaImmediateData == TRUE</code>"],
                            ["<b>Kết quả Ea_Read sau đó</b>", "<code>MEMIF_BLOCK_INVALID</code>", "<code>MEMIF_BLOCK_INCONSISTENT</code> (vì toàn vùng là <code>0xFF</code>)"]
                        ]
                    )
                )
            }
        ]
    },
    {
        "id": 3,
        "title": "4. Bất Đồng Bộ, Immediate & Polling",
        "subTabs": [
            {
                "title": "4.1 Máy Trạng Thái Ea",
                "html": (
                    card(
                        "4 Trạng Thái Chuẩn Của Ea_GetStatus() : MemIf_StatusType",
                        "<p>Là module trừu tượng bất đồng bộ, mọi API truyền nhận dữ liệu của Ea chỉ xác nhận đưa vào hàng đợi ngay (<code>E_OK</code>) rồi xử lý dần trong <code>Ea_MainFunction()</code>.</p>"
                        + DIAGRAM_BUILDERS["state_machine"]()
                    )
                    + card(
                        "Quy Tắc Chuyển Trạng Thái",
                        "<ul>"
                        "<li><code>MEMIF_UNINIT → MEMIF_BUSY_INTERNAL</code>: Khi <code>Ea_Init()</code> bắt đầu khởi tạo nội bộ.</li>"
                        "<li><code>MEMIF_BUSY_INTERNAL → MEMIF_IDLE</code>: Khi hoàn tất quét cấu hình Block/Wear-Slots.</li>"
                        "<li><code>MEMIF_IDLE → MEMIF_BUSY</code>: Khi nhận thành công lệnh <code>Read / Write / Invalidate / EraseImmediate</code>.</li>"
                        "<li><code>MEMIF_BUSY → MEMIF_IDLE</code>: Khi Job kết thúc (<code>JOB_OK / FAILED / INCONSISTENT / INVALID</code>) hoặc bị hủy bởi <code>Ea_Cancel()</code>.</li>"
                        "</ul>"
                    )
                )
            },
            {
                "title": "4.2 Immediate & Pre-Erase",
                "html": (
                    card(
                        "Cơ Chế Xử Lý Khẩn Cấp Cho Dữ Liệu Túi Khí / Crash Event",
                        "<p>Khi tai nạn xảy ra, điện áp bình ắc quy có thể sụt trong vài chục mili-giây. Để kịp ghi khối <code>Blk_Crash_Imm</code> trước khi mất nguồn hoàn toàn, AUTOSAR thiết kế cơ chế <b>Pre-Erase + ImmediateWrite</b>.</p>"
                        + DIAGRAM_BUILDERS["immediate_preerase"]()
                    )
                    + card(
                        "Lưu Ý Thực Tế Khi Dùng EaImmediateData",
                        "<p>Trong Simulator, <b>Blk #4 (Blk_Crash_Imm)</b> được bật <code>ImmediateData = TRUE</code>, còn <b>Blk #1</b> mặc định <code>FALSE</code>. Bạn có thể bấm thử <b>EraseImm</b> lên Blk #1 trong Quick Actions để xem <code>StrictImmediateEraseCheck</code> bắt lỗi ngay tức khắc!</p>"
                    )
                )
            },
            {
                "title": "4.3 Callback vs Polling",
                "html": (
                    card(
                        "Hai Phương Thức Nhận Kết Quả Từ Eep Driver",
                        "<p><code>EaPollingMode</code> trong Container <code>EaGeneral</code> quyết định cách Ea biết được khi nào <code>Eep Driver</code> thực thi xong một Sub-Job:</p>"
                        + DIAGRAM_BUILDERS["callback_vs_polling"]()
                    )
                    + card(
                        "So Sánh Độ Trễ & Cấu Hình Interrupt",
                        tbl(
                            ["Tham số / Đặc tính", "EaPollingMode = FALSE (Callback)", "EaPollingMode = TRUE (Polling)"],
                            [
                                ["<b>Cơ chế báo từ Eep</b>", "Ngắt/Callback gọi <code>Ea_JobEndNotification()</code> ngay", "Ea tự gọi <code>Eep_GetJobResult()</code> trong <code>Ea_MainFunction()</code>"],
                                ["<b>Độ trễ phản hồi</b>", "Nhanh nhất (gần như tức thời khi xong)", "Trễ tối đa thêm 1 chu kỳ <code>EaMainFunctionPeriod</code> (5ms)"],
                                ["<b>Yêu cầu cấu hình Eep</b>", "Phải nối Notification Ptr sang hàm của Ea", "Không cần cấu hình interrupt callback của Eep"]
                            ]
                        )
                    )
                )
            },
            {
                "title": "4.4 Ea_SetMode & Ea_Cancel",
                "html": card(
                    "Điều Chỉnh Băng Thông (SLOW/FAST) Và Hủy Job Khẩn Cấp",
                    tbl(
                        ["API", "Chức năng &amp; Ngữ cảnh dùng", "Hệ quả tại Ea &amp; Eep"],
                        [
                            ["<code>Ea_SetMode(MEMIF_MODE_FAST)</code>", "Được BswM/EcuM gọi trong pha <b>NvM_ReadAll</b> khi bật khóa điện (Startup) hoặc <b>WriteAll</b> lúc tắt máy", "Tăng Chunk Size mỗi tick (ví dụ từ 8B → 32B/tick), giúp khởi động ECU nhanh hơn nhiều lần"],
                            ["<code>Ea_SetMode(MEMIF_MODE_SLOW)</code>", "Gọi sau khi vào chu trình chạy bình thường", "Giảm tải SPI/CPU xuống 8B/tick để nhường ưu tiên cho các tác vụ điều khiển động cơ/phanh"],
                            ["<code>Ea_Cancel()</code> [0x04]", "Hủy Job hiện tại khi cần nhường ngay EEPROM cho khối khẩn cấp hoặc Shutdown", "Gọi xuống <code>Eep_Cancel()</code>, đặt JobResult thành <code>MEMIF_JOB_CANCELED</code>, đưa Ea về <code>MEMIF_IDLE</code>"]
                        ]
                    )
                )
            }
        ]
    },
    {
        "id": 4,
        "title": "5. So Sánh Chuyên Sâu: Ea vs Fee",
        "subTabs": [
            {
                "title": "5.1 EEPROM vs Data Flash",
                "html": (
                    card(
                        "Khác Biệt Vật Lý Giữa Ea (EEPROM) Và Fee (Data Flash)",
                        "<p>Dù cùng đứng ngang hàng dưới tầng <code>MemIf</code> với bộ API giống hệt nhau (<code>Read/Write/Invalidate/EraseImmediate/Cancel/SetMode</code>), kiến trúc bên trong của <b>Ea</b> và <b>Fee</b> khác hoàn toàn do bản chất silicon bên dưới:</p>"
                        + DIAGRAM_BUILDERS["vs_fee_hw"]()
                    )
                )
            },
            {
                "title": "5.2 Fixed-Slot vs Garbage Collect",
                "html": (
                    card(
                        "Tại Sao Ea Không Cần Garbage Collection Như Fee?",
                        "<p>Flash bắt buộc phải <b>xóa nguyên Sector lớn (4KB–64KB)</b> trước khi ghi đè lại, nên <b>Fee</b> phải ghi nối đuôi (Append-Only) và chạy Garbage Collection rất tốn CPU/thời gian khi đầy Sector. Ngược lại, <b>EEPROM</b> hỗ trợ ghi/xóa từng byte hoặc page nhỏ (4B–16B), nên <b>Ea</b> dùng địa chỉ Slot cố định:</p>"
                        + DIAGRAM_BUILDERS["vs_fee_gc"]()
                    )
                    + card(
                        "Bảng So Sánh Toàn Diện Ea vs Fee",
                        tbl(
                            ["Tiêu chí", "Ea (EEPROM Abstraction - ID 40)", "Fee (Flash EEPROM Emulation - ID 21)"],
                            [
                                ["<b>MCAL Driver bên dưới</b>", "<code>Eep</code> (ModuleId = 90)", "<code>Fls</code> (ModuleId = 92)"],
                                ["<b>Phần cứng lưu trữ</b>", "External SPI / I2C EEPROM", "Internal MCU Data Flash (hoặc PFlash)"],
                                ["<b>Đơn vị xóa tối thiểu</b>", "Byte / Small Page (4..32 Bytes)", "Toàn bộ Flash Sector (4 KB .. 64 KB)"],
                                ["<b>Vị trí ghi dữ liệu</b>", "Fixed Physical Slot Address (+ Rotation)", "Dynamic Append-Only Log trong Sector đang Active"],
                                ["<b>Garbage Collection (GC)</b>", "<b>Không có GC</b> (Thời gian đáp ứng ổn định)", "<b>Bắt buộc có GC</b> khi chuyển Sector"],
                                ["<b>Giá trị Byte Erased</b>", "Mặc định <code>0xFF</code>", "Tùy MCU Silicon (thường <code>0xFF</code> hoặc <code>0x00</code>)"]
                            ]
                        )
                    )
                )
            },
            {
                "title": "5.3 Kiến Trúc Hybrid Dual-Device",
                "html": (
                    card(
                        "Khi Nào ECU Dùng Đồng Thời Cả Ea Và Fee?",
                        "<p>Nhiều ECU hiện đại kết hợp Internal Data Flash cho dữ liệu lớn ít đổi, đồng thời gắn thêm một chip External EEPROM nhỏ bền bỉ cho Odometer ghi liên tục mỗi kilômét:</p>"
                        + DIAGRAM_BUILDERS["hybrid_dual_stack"]()
                    )
                )
            },
            {
                "title": "5.4 Tiêu Chí Chọn Ea Cho Dự Án",
                "html": card(
                    "Checklist Lựa Chọn Ea Trong Thực Tế Ô Tô",
                    "<ul>"
                    "<li><b>Chọn Ea + Eep khi:</b> ECU đã có sẵn EEPROM ngoài, yêu cầu số chu kỳ ghi cực cao (&gt;300k–1M lần như Odometer/Trip meter), hoặc hệ thống an toàn yêu cầu <b>Real-Time Deterministic</b> không chấp nhận độ trễ bất ngờ từ Flash Garbage Collection.</li>"
                    "<li><b>Chọn Fee + Fls khi:</b> Muốn cắt giảm chi phí linh kiện BOM (bỏ chip EEPROM ngoài), chỉ lưu cấu hình, lịch sử DTC kích thước lớn vài KB ít khi ghi đè.</li>"
                    "<li><b>Kiến trúc AUTOSAR đảm bảo:</b> Tầng NvM &amp; SWC không phải sửa một dòng code nào khi chuyển đổi Block giữa <code>Ea</code> và <code>Fee</code> — chỉ cần đổi <code>DeviceIndex</code> trong ECUC!</li>"
                    "</ul>"
                )
            }
        ]
    },
    {
        "id": 5,
        "title": "6. API R23-11, Lỗi DET & 36 ECUC",
        "subTabs": [
            {
                "title": "6.1 Danh Mục API R23-11",
                "html": (
                    card(
                        "Toàn Bộ Giao Diện API & Notification Chuẩn AUTOSAR Classic Ea R23-11",
                        DIAGRAM_BUILDERS["api_catalog"]()
                    )
                    + card(
                        "Bảng Service ID & Chữ Ký Hàm Chuẩn",
                        tbl(
                            ["ServiceId", "Tên Hàm Chuẩn (SWS_Ea)", "Kiểu Gọi", "Mô tả ngắn gọn"],
                            [
                                ["<code>0x00</code>", "<code>Ea_Init(const Ea_ConfigType* ConfigPtr)</code>", "Sync", "Khởi tạo module &amp; ánh xạ Slot (Post-Build / Link-Time)"],
                                ["<code>0x01</code>", "<code>Ea_SetMode(MemIf_ModeType Mode)</code>", "Sync", "Chuyển tốc độ/chunk giữa SLOW &amp; FAST"],
                                ["<code>0x02</code>", "<code>Ea_Read(Blk, Off, Ptr, Len)</code>", "Async", "Đọc <code>Len</code> bytes từ offset <code>Off</code> của Block"],
                                ["<code>0x03</code>", "<code>Ea_Write(Blk, DataPtr)</code>", "Async", "Ghi toàn bộ Block theo chuỗi 3 pha an toàn"],
                                ["<code>0x04</code>", "<code>Ea_Cancel(void)</code>", "Sync", "Hủy Job đang chạy và gọi <code>Eep_Cancel()</code>"],
                                ["<code>0x05</code>", "<code>Ea_GetStatus(void)</code>", "Sync", "Trả về <code>MEMIF_UNINIT / BUSY_INTERNAL / IDLE / BUSY</code>"],
                                ["<code>0x06</code>", "<code>Ea_GetJobResult(void)</code>", "Sync", "Trả về <code>JOB_OK / PENDING / FAILED / CANCELED / INCONSISTENT / INVALID</code>"],
                                ["<code>0x07</code>", "<code>Ea_InvalidateBlock(Blk)</code>", "Async", "Ghi <code>0x0000</code> vào Header đánh dấu block vô hiệu"],
                                ["<code>0x08</code>", "<code>Ea_GetVersionInfo(VersionInfoPtr)</code>", "Sync", "Lấy VendorId, ModuleId=40, SwVersion"],
                                ["<code>0x09</code>", "<code>Ea_EraseImmediateBlock(Blk)</code>", "Async", "Pre-erase slot cho block có <code>EaImmediateData=TRUE</code>"],
                                ["<code>0x10 / 0x11</code>", "<code>Ea_JobEnd / JobErrorNotification()</code>", "Cbk", "Callback từ Eep Driver báo xong sub-job"],
                                ["<code>0x12</code>", "<code>Ea_MainFunction(void)</code>", "Sched", "Máy trạng thái xử lý bất đồng bộ theo chu kỳ SchM"]
                            ]
                        )
                    )
                )
            },
            {
                "title": "6.2 Lỗi DET & Runtime R23-11",
                "html": (
                    card(
                        "Chuỗi Kiểm Tra Đầu Vào (Development Error vs Runtime Error)",
                        "<p>Từ các release mới (R19-11 đến R23-11), AUTOSAR tách rõ <b>Development Errors</b> (lỗi lập trình/cấu hình do bật <code>EaDevErrorDetect</code>) và <b>Runtime Errors</b> (luôn báo qua <code>Det_ReportRuntimeError</code> ngay cả trên bản Production).</p>"
                        + DIAGRAM_BUILDERS["det_runtime_guard"]()
                    )
                    + card(
                        "Mã Lỗi DET, Runtime & Production DEM",
                        tbl(
                            ["Mã Lỗi", "Hex", "Phân Loại", "Nguyên Nhân Kích Hoạt"],
                            [
                                ["<code>EA_E_UNINIT</code>", "<code>0x01</code>", "Development", "Gọi API bất kỳ trước khi <code>Ea_Init()</code> xong"],
                                ["<code>EA_E_INVALID_BLOCK_NO</code>", "<code>0x02</code>", "Development", "<code>BlockNumber</code> không tồn tại hoặc gọi EraseImm cho Block non-Immediate"],
                                ["<code>EA_E_INVALID_BLOCK_OFS</code>", "<code>0x03</code>", "Development", "<code>BlockOffset >= EaBlockSize</code>"],
                                ["<code>EA_E_INVALID_DATA_PTR</code>", "<code>0x04</code>", "Development", "Con trỏ <code>DataBufferPtr</code> hoặc <code>VersionInfoPtr</code> là <code>NULL_PTR</code>"],
                                ["<code>EA_E_INVALID_BLOCK_LEN</code>", "<code>0x05</code>", "Development", "<code>Length == 0</code> hoặc <code>BlockOffset + Length &gt; EaBlockSize</code>"],
                                ["<code>EA_E_BUSY</code>", "<code>0x06</code>", "<b>Runtime Error</b>", "Module đang <code>MEMIF_BUSY</code> mà nhận tiếp yêu cầu mới"],
                                ["<code>EA_E_INVALID_CANCEL</code>", "<code>0x08</code>", "<b>Runtime Error</b>", "Gọi <code>Ea_Cancel()</code> khi không có Job nào đang chạy (<code>MEMIF_IDLE</code>)"],
                                ["<code>EEP_E_*_FAILED</code>", "DEM", "Production HW", "Lỗi phần cứng từ Eep Driver (SPI timeout, checksum/ECC)"]
                            ]
                        )
                    )
                )
            },
            {
                "title": "6.3 Bản Đồ 36 Tham Số ECUC",
                "html": (
                    card(
                        "6 Nhóm Cấu Hình ECUC Trong Simulator (Hover > 1s Để Xem Tooltip)",
                        DIAGRAM_BUILDERS["ecuc_containers"]()
                    )
                    + card(
                        "Chú Giải Các Tham Số Ảnh Hưởng Mạnh Nhất",
                        "<ul>"
                        "<li><code>EaVirtualPageSize</code> &amp; <code>EaBlockOverhead</code>: Thay đổi trực tiếp kích thước căn chỉnh vật lý của mọi Block trong EEPROM Map.</li>"
                        "<li><code>EaPollingMode</code>: Bật/tắt đường nhận kết quả Polling (<code>Eep_GetJobResult</code>) vs Callback (<code>Ea_JobEndNotification</code>).</li>"
                        "<li><code>Blk3_NumberOfWriteCycles</code> &amp; <code>EepAllowedWriteCycles</code>: Quyết định tự động số lượng Slot Wear-Leveling xoay vòng cho Odometer.</li>"
                        "<li><b>Tab 5 Fault Injection:</b> Gồm 5 công tắc mô phỏng mất nguồn giữa pha ghi, lỗi phần cứng EEPROM, NULL_PTR test, và strict check.</li>"
                        "</ul>"
                    )
                )
            },
            {
                "title": "6.4 Hướng Dẫn 14 Kịch Bản & Export",
                "html": card(
                    "Bản Đồ 14 Kịch Bản Tương Tác (S1–S14) & Xuất Code Cấu Hình",
                    tbl(
                        ["Nhóm", "Kịch Bản", "Trọng Tâm Khám Phá"],
                        [
                            ["Nhóm 1", "<b>S1 – S4</b>", "Init từ UNINIT, Luồng ghi 3 pha SWC→EEPROM, Ea_Read offset/len, Dataset #8/#9 &amp; VP Padding"],
                            ["Nhóm 2", "<b>S5 – S8</b>", "Power-Loss Mid-Write (<code>INCONSISTENT</code>), InvalidateBlock (<code>0x0000</code>), Wear-Leveling 4 Slots &amp; Wrap-Around <code>0xFF→0x00</code>"],
                            ["Nhóm 3", "<b>S9 – S11</b>", "Immediate Crash + Pre-Erase, <code>Ea_SetMode(FAST/SLOW)</code>, Polling vs Callback Notification"],
                            ["Nhóm 4", "<b>S12 – S14</b>", "<code>Ea_Cancel()</code>, Tiêm lỗi phần cứng DEM từ Eep, Full Test 6 mã lỗi DET &amp; Runtime Errors"]
                        ]
                    )
                    + "<p style='margin-top:8px'>Mọi thay đổi trên cấu hình ECUC đều có thể xuất ngay ở nút <b>📦 Export</b> trên Header thành <code>Ea.arxml</code>, <code>Ea_Cfg.h</code>, <code>Ea_Lcfg.c</code>, hoặc <code>Ea_Config.json</code> — và tải toàn bộ Simulator về máy bằng nút <b>⬇ Tải .HTML</b>.</p>"
                )
            }
        ]
    }
]


# =========================================================================
# 52 TECHNICAL ABBREVIATIONS WITH LIVE SEARCH & 4 CATEGORIES
# Categories: ADDR, INTEG, STACK, HW_ERR
# =========================================================================

ABBREVIATIONS_DATA = [
    # STACK (16 terms)
    {"abbr": "Ea", "full": "EEPROM Abstraction", "vi": "Lớp Trừu Tượng EEPROM", "cat": "STACK", "sws": "SWS_Ea (ID 40)", "desc": "Module BSW tầng ECU Abstraction ánh xạ Logical Block sang Physical EEPROM Address và quản lý toàn vẹn dữ liệu."},
    {"abbr": "MemIf", "full": "Memory Abstraction Interface", "vi": "Giao Diện Trừu Tượng Bộ Nhớ", "cat": "STACK", "sws": "SWS_MemIf (ID 22)", "desc": "Tầng đồng nhất giao diện giữa NvM với các module Ea và Fee thông qua DeviceIndex."},
    {"abbr": "NvM", "full": "NVRAM Manager", "vi": "Trình Quản Lý NVRAM", "cat": "STACK", "sws": "SWS_NvM (ID 20)", "desc": "Module Service quản lý hàng đợi Read/Write, tính CRC, Dataset Index, Retry và ReadAll/WriteAll."},
    {"abbr": "Fee", "full": "Flash EEPROM Emulation", "vi": "Giả Lập EEPROM Trên Flash", "cat": "STACK", "sws": "SWS_Fee (ID 21)", "desc": "Module song song với Ea nhưng dùng cho Internal Data Flash thay vì External EEPROM, cần Garbage Collection."},
    {"abbr": "Eep", "full": "EEPROM Driver", "vi": "Trình Điều Khiển EEPROM", "cat": "STACK", "sws": "SWS_Eep (ID 90)", "desc": "Driver tầng MCAL trực tiếp điều khiển ngoại vi SPI/I2C hoặc nội vi EEPROM."},
    {"abbr": "Fls", "full": "Flash Driver", "vi": "Trình Điều Khiển Bộ Nhớ Flash", "cat": "STACK", "sws": "SWS_Fls (ID 92)", "desc": "Driver tầng MCAL phục vụ module Fee (xóa theo từng Sector Flash lớn)."},
    {"abbr": "EcuM", "full": "ECU State Manager", "vi": "Trình Quản Lý Trạng Thái ECU", "cat": "STACK", "sws": "SWS_EcuM", "desc": "Gọi Ea_Init() trong pha DriverInitTwo và điều phối pha Startup ReadAll / Shutdown WriteAll."},
    {"abbr": "BswM", "full": "Basic Software Mode Manager", "vi": "Quản Lý Chế Độ Phần Mềm Cơ Bản", "cat": "STACK", "sws": "SWS_BswM", "desc": "Kích hoạt Ea_SetMode(FAST/SLOW) tùy chế độ vận hành ECU."},
    {"abbr": "SchM", "full": "Schedule Manager", "vi": "Trình Lập Lịch BSW", "cat": "STACK", "sws": "SWS_SchM", "desc": "Định kỳ gọi hàm Ea_MainFunction() mỗi chu kỳ (vd 5ms) để đẩy máy trạng thái bất đồng bộ."},
    {"abbr": "RTE", "full": "Runtime Environment", "vi": "Môi Trường Thực Thi", "cat": "STACK", "sws": "SWS_Rte", "desc": "Cung cấp cổng Client-Server Rte_Call_NvMService_* để SWC giao tiếp với NvM."},
    {"abbr": "SWC", "full": "Software Component", "vi": "Thành Phần Phần Mềm Ứng Dụng", "cat": "STACK", "sws": "TPS_SWCT", "desc": "Ứng dụng tầng trên lưu trữ dữ liệu qua NvM mà không biết sự tồn tại của Ea."},
    {"abbr": "MEMIF_MODE_FAST", "full": "MemIf Fast Mode", "vi": "Chế Độ Truyền Tốc Độ Cao", "cat": "STACK", "sws": "SWS_Ea_00085", "desc": "Tăng kích thước Chunk truyền mỗi tick trong Eep/Ea, ưu tiên tốc độ trong ReadAll/WriteAll."},
    {"abbr": "MEMIF_MODE_SLOW", "full": "MemIf Slow Mode", "vi": "Chế Độ Truyền Chuẩn (Chậm)", "cat": "STACK", "sws": "SWS_Ea_00085", "desc": "Chunk truyền nhỏ hơn mỗi chu kỳ để giảm tải SPI/CPU trong lúc xe đang chạy bình thường."},
    {"abbr": "MEMIF_UNINIT", "full": "MemIf Uninitialized Status", "vi": "Trạng Thái Chưa Khởi Tạo", "cat": "STACK", "sws": "SWS_Ea_00089", "desc": "Trạng thái trước khi Ea_Init() được gọi; mọi API khác đều bị từ chối với lỗi DET EA_E_UNINIT."},
    {"abbr": "MEMIF_IDLE", "full": "MemIf Idle Status", "vi": "Trạng Thái Nhàn Rỗi", "cat": "STACK", "sws": "SWS_Ea_00089", "desc": "Ea đã sẵn sàng tiếp nhận yêu cầu Read/Write/Invalidate/EraseImmediate mới."},
    {"abbr": "MEMIF_BUSY_INTERNAL", "full": "MemIf Busy Internal", "vi": "Bận Xử Lý Nội Bộ", "cat": "STACK", "sws": "SWS_Ea_00129", "desc": "Trạng thái tạm thời trong lúc Ea_Init() quét và tính toán lại các Slot sau khi reset."},

    # ADDR (12 terms)
    {"abbr": "EaBlockNumber", "full": "Ea Logical Block Identifier", "vi": "Mã Định Danh Khối Logic Ea", "cat": "ADDR", "sws": "ECUC_Ea_00116", "desc": "Số hiệu duy nhất đại diện cho một Block hoặc một bản copy Dataset (1..65534)."},
    {"abbr": "EaBlockSize", "full": "Ea Logical Block Size", "vi": "Kích Thước Payload Khối Logic", "cat": "ADDR", "sws": "ECUC_Ea_00117", "desc": "Số byte dữ liệu người dùng thực tế của Block (chưa tính Header/Footer Overhead)."},
    {"abbr": "EaVirtualPageSize", "full": "Virtual Page Alignment Size", "vi": "Kích Thước Trang Ảo Căn Chỉnh", "cat": "ADDR", "sws": "ECUC_Ea_00120", "desc": "Độ lớn trang ảo (4B/8B/16B...) mà mọi kích thước vật lý Slot phải làm tròn thành bội số."},
    {"abbr": "EaBlockOverhead", "full": "Block Administrative Overhead", "vi": "Số Byte Quản Trị Mỗi Block", "cat": "ADDR", "sws": "SWS_Ea_00136", "desc": "Tổng số byte cho Header và Footer (mặc định 4B = 2B Header + 2B Footer) cộng thêm vào mỗi Slot."},
    {"abbr": "EaPageOverhead", "full": "Page Administrative Overhead", "vi": "Byte Quản Trị Mỗi Trang Ảo", "cat": "ADDR", "sws": "SWS_Ea_00137", "desc": "Số byte quản trị phụ trội trên từng Virtual Page (thường bằng 0 đối với Ea)."},
    {"abbr": "SlotSize", "full": "Aligned Physical Slot Size", "vi": "Kích Thước Vật Lý Đã Căn Chỉnh", "cat": "ADDR", "sws": "SWS_Ea", "desc": "Ceil((BlockSize + BlockOverhead) / VirtualPageSize) * VirtualPageSize bytes chiếm dụng trong EEPROM."},
    {"abbr": "EaNumberOfWriteCycles", "full": "Required Block Write Cycles", "vi": "Số Chu Kỳ Ghi Yêu Cầu", "cat": "ADDR", "sws": "ECUC_Ea_00119", "desc": "Tổng số lần ghi dự kiến suốt đời ECU; nếu vượt quá EepAllowedWriteCycles, Ea tự nhân nhiều Slot xoay vòng."},
    {"abbr": "EepAllowedWriteCycles", "full": "EEPROM Cell Endurance Limit", "vi": "Giới Hạn Bền Bỉ Của Cell EEPROM", "cat": "ADDR", "sws": "ECUC_Eep", "desc": "Số lần xóa/ghi tối đa cho phép của 1 ô nhớ vật lý theo datasheet chip EEPROM (vd: 100,000)."},
    {"abbr": "DatasetBlock", "full": "NvM Dataset Block Selection", "vi": "Khối Dữ Liệu Đa Phiên Bản (Dataset)", "cat": "ADDR", "sws": "SWS_NvM", "desc": "Cơ chế lưu nhiều bản sao độc lập (DataIndex 0, 1...) dưới công thức BlkNo = (Base << k) | DataIdx."},
    {"abbr": "NvMDatasetSelectionBits", "full": "Number of Dataset Index Bits", "vi": "Số Bit Chọn Bản Sao Dataset", "cat": "ADDR", "sws": "ECUC_NvM", "desc": "Số bit LSB trong EaBlockNumber dành riêng để phân biệt DataIndex (vd 2 bit → 4 bản sao)."},
    {"abbr": "EaIndex", "full": "Ea Module Device Index", "vi": "Chỉ Số Thiết Bị Của Ea", "cat": "ADDR", "sws": "ECUC_Ea_00124", "desc": "Chỉ số DeviceIndex phân biệt chip/instance Ea khi hệ thống có nhiều thiết bị bộ nhớ."},
    {"abbr": "EepBaseAddress", "full": "EEPROM Physical Base Address", "vi": "Địa Chỉ Vật Lý Nền EEPROM", "cat": "ADDR", "sws": "ECUC_Eep", "desc": "Địa chỉ byte đầu tiên trong dải EEPROM vật lý mà Ea bắt đầu phân bổ các Block."},

    # INTEG (12 terms)
    {"abbr": "Hdr_0xA5", "full": "Header Start Marker (0xA5)", "vi": "Dấu Hiệu Bắt Đầu Ghi Header", "cat": "INTEG", "sws": "Ea Design", "desc": "Byte nhận diện đầu Slot chứng minh quá trình ghi mới đã bắt đầu xuống EEPROM."},
    {"abbr": "Ftr_0x5A", "full": "Footer Valid Commit Marker (0x5A)", "cat": "INTEG", "vi": "Dấu Hiệu Chốt Toàn Vẹn Footer", "sws": "Ea Design", "desc": "Byte cuối Slot chỉ được ghi ở pha 3 sau khi Payload xong hoàn toàn để xác nhận Slot hợp lệ."},
    {"abbr": "SeqCounter", "full": "8-bit Write Sequence Counter", "vi": "Bộ Đếm Thứ Tự Phiên Ghi 8-Bit", "cat": "INTEG", "sws": "Ea Design", "desc": "Byte thứ 2 trong Header và Footer; giúp xác định Slot mới nhất khi Wear-Leveling kể cả khi tràn 0xFF→0x00."},
    {"abbr": "WrapAround", "full": "Counter Rollover Comparison", "vi": "So Sánh Tràn Vòng Bộ Đếm", "cat": "INTEG", "sws": "Ea Design", "desc": "Phép toán modulo ((a - b) & 0xFF) < 128 nhận biết 0x00 mới hơn 0xFF khi quay vòng 8-bit."},
    {"abbr": "MEMIF_JOB_OK", "full": "MemIf Job Completed Successfully", "vi": "Job Hoàn Tất Thành Công", "cat": "INTEG", "sws": "SWS_Ea_00090", "desc": "Lệnh đọc/ghi/xóa/vô hiệu hóa hoàn thành không lỗi."},
    {"abbr": "MEMIF_JOB_PENDING", "full": "MemIf Job In Progress", "vi": "Job Đang Thực Thi Bất Đồng Bộ", "cat": "INTEG", "sws": "SWS_Ea_00090", "desc": "Ea vẫn đang chạy các bước đọc/ghi từng pha trong Ea_MainFunction()."},
    {"abbr": "MEMIF_BLOCK_INCONSISTENT", "full": "Block Data Inconsistency Result", "vi": "Khối Không Đồng Nhất / Hỏng Dữ Liệu", "cat": "INTEG", "sws": "SWS_Ea_00090", "desc": "Header/Footer lệch nhau (sập nguồn khi ghi) hoặc vùng nhớ còn trắng 0xFF chưa từng ghi."},
    {"abbr": "MEMIF_BLOCK_INVALID", "full": "Invalidated Block Result", "vi": "Khối Đã Bị Vô Hiệu Hóa Chủ Động", "cat": "INTEG", "sws": "SWS_Ea_00090", "desc": "Trả về khi đọc Block đã gọi Ea_InvalidateBlock() (Header chứa marker 0x0000)."},
    {"abbr": "EaImmediateData", "full": "Immediate Priority Crash Block", "vi": "Cấu Hình Khối Dữ Liệu Khẩn Cấp", "cat": "INTEG", "sws": "ECUC_Ea_00118", "desc": "Cho phép Block được phép dùng Ea_EraseImmediateBlock() xóa trước và ưu tiên ghi khẩn."},
    {"abbr": "Ea_EraseImmediateBlock", "full": "Pre-Erase Immediate Block API", "vi": "Hàm Xóa Sẵn Khối Khẩn Cấp", "cat": "INTEG", "sws": "SWS_Ea_00093", "desc": "Dọn sẵn toàn bộ Slot về 0xFF trước khi tai nạn/va chạm xảy ra để tiết kiệm thời gian lúc ghi crash."},
    {"abbr": "Ea_InvalidateBlock", "full": "Invalidate Block API", "vi": "Hàm Vô Hiệu Hóa Khối Logic", "cat": "INTEG", "sws": "SWS_Ea_00091", "desc": "Ghi 0x0000 vào Header để vô hiệu hóa Block nhanh chóng mà không phải xóa toàn vùng Payload."},
    {"abbr": "PowerLossMidWrite", "full": "Power Failure During Write", "vi": "Mất Nguồn Giữa Quá Trình Ghi", "cat": "INTEG", "sws": "Safety Goal", "desc": "Tình huống sập pin giữa pha WRITE_DATA khiến Footer vẫn là 0xFF, kích hoạt bảo vệ INCONSISTENT."},

    # HW_ERR (12 terms)
    {"abbr": "EaPollingMode", "full": "Ea Polling vs Notification Mode", "vi": "Chế Độ Hỏi Vòng Hay Callback", "cat": "HW_ERR", "sws": "ECUC_Ea_00123", "desc": "TRUE: Ea hỏi Eep_GetJobResult() định kỳ; FALSE: Eep gọi Ea_JobEndNotification() ngay khi xong."},
    {"abbr": "EaDevErrorDetect", "full": "Development Error Detection Switch", "vi": "Công Tắc Bắt Lỗi Phát Triển DET", "cat": "HW_ERR", "sws": "ECUC_Ea_00121", "desc": "Bật/tắt kiểm tra và báo lỗi lập trình (UNINIT, NULL_PTR, INVALID_BLOCK...) lên DET."},
    {"abbr": "DET", "full": "Default Error Tracer", "vi": "Bộ Theo Dõi Lỗi Mặc Định", "cat": "HW_ERR", "sws": "SWS_Det", "desc": "Module tiếp nhận báo cáo Development Error và Runtime Error (R19-11+) từ Ea."},
    {"abbr": "DEM", "full": "Diagnostic Event Manager", "vi": "Trình Quản Lý Sự Kiện Chẩn Đoán", "cat": "HW_ERR", "sws": "SWS_Dem", "desc": "Ghi nhận lỗi phần cứng thực tế (EEP_E_READ/WRITE/ERASE_FAILED) từ MCAL EEPROM Driver."},
    {"abbr": "EA_E_UNINIT", "full": "DET Uninitialized Error (0x01)", "vi": "Lỗi Gọi API Trước Khi Init", "cat": "HW_ERR", "sws": "SWS_Ea_00049", "desc": "Development error báo khi chưa chạy xong Ea_Init() mà đã gọi API đọc/ghi."},
    {"abbr": "EA_E_INVALID_BLOCK_NO", "full": "DET Invalid BlockNumber (0x02)", "vi": "Lỗi Sai Số Hiệu Block (0x02)", "cat": "HW_ERR", "sws": "SWS_Ea_00049", "desc": "Số hiệu Block không có trong bảng cấu hình hoặc gọi EraseImmediate cho Block thường."},
    {"abbr": "EA_E_INVALID_BLOCK_OFS", "full": "DET Invalid Block Offset (0x03)", "vi": "Lỗi Vượt Offset Block (0x03)", "cat": "HW_ERR", "sws": "SWS_Ea_00049", "desc": "Tham số BlockOffset truyền cho Ea_Read() lớn hơn hoặc bằng EaBlockSize."},
    {"abbr": "EA_E_INVALID_DATA_PTR", "full": "DET Invalid Data Pointer (0x04)", "vi": "Lỗi Con Trỏ NULL (0x04)", "cat": "HW_ERR", "sws": "SWS_Ea_00049", "desc": "Development error khi truyền DataBufferPtr hoặc VersionInfoPtr bằng NULL_PTR."},
    {"abbr": "EA_E_INVALID_BLOCK_LEN", "full": "DET Invalid Block Length (0x05)", "vi": "Lỗi Sai Chiều Dài Đọc (0x05)", "cat": "HW_ERR", "sws": "SWS_Ea_00049", "desc": "Length == 0 hoặc BlockOffset + Length vượt quá EaBlockSize."},
    {"abbr": "EA_E_BUSY", "full": "Runtime Busy Error (0x06)", "vi": "Lỗi Runtime Đang Bận Job (0x06)", "cat": "HW_ERR", "sws": "SWS_Ea_00185", "desc": "Runtime error luôn hoạt động kể cả khi tắt DET; báo khi gọi Job mới lúc Ea đang MEMIF_BUSY."},
    {"abbr": "EA_E_INVALID_CANCEL", "full": "Runtime Invalid Cancel (0x08)", "vi": "Lỗi Hủy Khi Không Có Job (0x08)", "cat": "HW_ERR", "sws": "SWS_Ea_00186", "desc": "Runtime error khi gọi Ea_Cancel() lúc Ea đang ở trạng thái MEMIF_IDLE."},
    {"abbr": "MEMIF_JOB_CANCELED", "full": "Job Canceled Result", "vi": "Kết Quả Job Bị Hủy Bỏ", "cat": "HW_ERR", "sws": "SWS_Ea_00088", "desc": "Trạng thái trả về bởi Ea_GetJobResult() sau khi thực hiện thành công lệnh Ea_Cancel()."}
]


JS_TEMPLATE = r"""// ================= PART 6: MULTI-LEVEL HANDBOOK, 52 ABBREVIATIONS & BOOTSTRAP =================

const HANDBOOK_TABS = __HANDBOOK_JSON__;
const ABBREVIATIONS_DATA = __ABBR_JSON__;

let hbActiveTab1 = 0;
let hbActiveSubTab = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
let abbrActiveCategory = "ALL";

function switchHbTab1(idx) {
  hbActiveTab1 = Number(idx) || 0;
  for (let i = 0; i < 7; i++) {
    const b = document.getElementById("hbTab1_" + i);
    if (b) b.classList.toggle("active", i === hbActiveTab1);
  }
  renderCurrentHandbookView();
}

function switchHbSubTab(subIdx) {
  hbActiveSubTab[hbActiveTab1] = Number(subIdx) || 0;
  renderCurrentHandbookView();
}

function setAbbrCategory(cat) {
  abbrActiveCategory = cat || "ALL";
  ["ALL", "ADDR", "INTEG", "STACK", "HW_ERR"].forEach((c) => {
    const pill = document.getElementById("catPill_" + c);
    if (pill) pill.classList.toggle("active", c === abbrActiveCategory);
  });
  filterAbbreviationTable();
}

function highlightMatch(text, query) {
  const safe = escapeHtml(text);
  if (!query) return safe;
  const escapedQ = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  try {
    const re = new RegExp("(" + escapedQ + ")", "gi");
    return safe.replace(re, "<mark>$1</mark>");
  } catch (e) {
    return safe;
  }
}

function filterAbbreviationTable() {
  const inp = document.getElementById("abbrSearchInput");
  const q = inp ? inp.value.trim() : "";
  const ql = q.toLowerCase();

  const filtered = ABBREVIATIONS_DATA.filter((item) => {
    if (abbrActiveCategory !== "ALL" && item.cat !== abbrActiveCategory) return false;
    if (!ql) return true;
    return (
      item.abbr.toLowerCase().includes(ql) ||
      item.full.toLowerCase().includes(ql) ||
      item.vi.toLowerCase().includes(ql) ||
      item.desc.toLowerCase().includes(ql) ||
      item.sws.toLowerCase().includes(ql)
    );
  });

  const badge = document.getElementById("abbrCountBadge");
  if (badge) badge.textContent = filtered.length + " / " + ABBREVIATIONS_DATA.length + " thuật ngữ";

  const catLabels = {
    ADDR: "📐 Addressing & Wear-Leveling",
    INTEG: "🛡️ Integrity & Power-Loss",
    STACK: "🧩 Memory Stack & MemIf",
    HW_ERR: "🚨 HW, Polling & DET/DEM"
  };

  const area = document.getElementById("hbContentArea");
  if (!area) return;

  if (filtered.length === 0) {
    area.innerHTML = `<div class="hb-card"><h3>Không tìm thấy thuật ngữ phù hợp</h3><p>Thử xóa bớt từ khóa hoặc chọn danh mục "Tất cả (${ABBREVIATIONS_DATA.length})" để hiển thị toàn bộ.</p></div>`;
    return;
  }

  const rowsHtml = filtered.map((item) => `
    <tr>
      <td class="mono" style="font-weight:800;color:var(--pri);white-space:nowrap">${highlightMatch(item.abbr, q)}</td>
      <td style="font-weight:600">${highlightMatch(item.full, q)}</td>
      <td>${highlightMatch(item.vi, q)}</td>
      <td><span class="blk-pill bp-cyan">${escapeHtml(catLabels[item.cat] || item.cat)}</span></td>
      <td>${highlightMatch(item.desc, q)}</td>
      <td class="mono" style="font-size:11px;color:var(--cyan);white-space:nowrap">${highlightMatch(item.sws, q)}</td>
    </tr>`).join("");

  area.innerHTML = `
    <div class="hb-card">
      <h3>🔤 Bảng Thuật Ngữ &amp; Viết Tắt AUTOSAR Classic Ea (${filtered.length} mục)</h3>
      <table class="tbl">
        <thead>
          <tr>
            <th>Viết Tắt / Ký Hiệu</th>
            <th>Tên Đầy Đủ (English)</th>
            <th>Nghĩa Tiếng Việt</th>
            <th>Nhóm</th>
            <th>Giải Thích Kỹ Thuật &amp; Vai Trò Trong Ea</th>
            <th>Chuẩn AUTOSAR</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>`;
}

function renderCurrentHandbookView() {
  const nav2 = document.getElementById("hbNav2");
  const filterBox = document.getElementById("hbAbbrFilterBox");
  const area = document.getElementById("hbContentArea");
  if (!area) return;

  if (hbActiveTab1 === 6) {
    if (nav2) nav2.classList.add("hidden");
    if (filterBox) filterBox.classList.remove("hidden");
    filterAbbreviationTable();
    return;
  }

  if (nav2) nav2.classList.remove("hidden");
  if (filterBox) filterBox.classList.add("hidden");

  const topic = HANDBOOK_TABS[hbActiveTab1] || HANDBOOK_TABS[0];
  const subIdx = hbActiveSubTab[hbActiveTab1] || 0;
  const sub = topic.subTabs[subIdx] || topic.subTabs[0];

  if (nav2) {
    nav2.innerHTML = topic.subTabs.map((st, idx) =>
      `<button class="hb-tab2${idx === subIdx ? " active" : ""}" onclick="switchHbSubTab(${idx})">${escapeHtml(st.title)}</button>`
    ).join("");
  }
  area.innerHTML = sub ? sub.html : "";
}

// -------------------- BOOTSTRAP ON PAGE LOAD --------------------

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    syncConfigToDOM();
    initTooltipHandlers();
    loadScenario("S1");
    renderCurrentHandbookView();
  });
}
</script>
</body>
</html>
"""

js_out = (
    JS_TEMPLATE
    .replace("__HANDBOOK_JSON__", json.dumps(HANDBOOK_TABS, ensure_ascii=False, indent=2))
    .replace("__ABBR_JSON__", json.dumps(ABBREVIATIONS_DATA, ensure_ascii=False, indent=2))
)

out_path = os.path.join(SCRIPT_DIR, "part6_handbook.js")
with open(out_path, "w", encoding="utf-8") as f:
    f.write(js_out)

print(
    f"Generated {out_path} ({len(js_out)} chars, {len(HANDBOOK_TABS)} main tabs, "
    f"{sum(len(t['subTabs']) for t in HANDBOOK_TABS)} sub-tabs, {len(ABBREVIATIONS_DATA)} abbreviations)."
)
