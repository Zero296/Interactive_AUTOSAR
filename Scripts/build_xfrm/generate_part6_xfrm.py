"""Generates part6_handbook.js containing the 6x4 Multi-level Handbook, Tab 7 Abbreviation Search, and Bootstrap."""

import json
from pathlib import Path
from hb_diagrams_xfrm import (
    svg_1_1_xfrm_swc_transparent,
    svg_1_2_symmetric_mirror,
    svg_2_1_comxf_vs_com,
    svg_2_2_endianness_bits,
    svg_3_1_someip_16b_hdr,
    svg_3_2_dynarr_align,
    svg_3_3_tlv_wiretype,
    svg_3_4_rpc_sequence,
    svg_4_1_e2e_profiles,
    svg_4_2_e2e_sm_window,
    svg_4_3_two_nibble_byte,
    svg_4_4_rx_order_safety,
    svg_5_1_inplace_vs_outofplace,
    svg_5_2_error_decision,
    svg_5_4_com_vs_ldcom,
    svg_6_3_det_barrier,
)


def build_handbook_data():
    return [
        # MAIN TAB 0: Tab 1
        {
            "title": "1. Kiến Trúc Transformer Tổng Thể (ASWS_TransformerGeneral)",
            "subs": [
                {
                    "pill": "1.1 Vai Trò & Tính Trong Suốt Với SWC",
                    "html": (
                        "<h2>1.1. Vai Trò Của Họ Module Xfrm Trong AUTOSAR Classic (R23-11)</h2>"
                        + svg_1_1_xfrm_swc_transparent()
                        + "<p>Trước AUTOSAR R4.2, việc chuyển đổi kiểu dữ liệu phức hợp hay tính CRC E2E thường bị viết lẫn vào SWC hoặc cấu hình COM phức tạp. Từ R4.2 tới R23-11, AUTOSAR tách biệt thành cụm BSW Service độc lập gọi là <strong>Xfrm</strong>: <code>SomeIpXf (#174)</code>, <code>ComXf (#175)</code> và <code>E2EXf (#176)</code>.</p>"
                        + "<div class='hb-callout'><strong>Tính trong suốt hoàn toàn với SWC (VFB Abstraction):</strong> Ứng dụng SWC chỉ thao tác bằng biến struct C thông thường (<code>ApplicationDataType</code>) qua <code>Rte_Write()</code> hoặc <code>Rte_Call()</code> mà không biết bên dưới dùng CAN <code>ComXf</code> hay Ethernet <code>SomeIpXf</code>, dùng Big-Endian hay Little-Endian, có bọc CRC E2E hay TLV hay không.</div>"
                        + "<ul><li><strong>Không lưu trạng thái dữ liệu ứng dụng (Stateless Serialization):</strong> <code>ComXf</code> và <code>SomeIpXf</code> chuyển đổi thuần túy theo mapping ARXML.</li>"
                        + "<li><strong>Riêng E2EXf (#176):</strong> Cần giữ bộ đếm <code>Counter</code> và lịch sử cửa sổ trượt <code>E2E_SMCheck()</code> cho từng DataID.</li></ul>"
                    ),
                },
                {
                    "pill": "1.2 Chuỗi Đối Xứng Gương (Tx vs Rx Inverse)",
                    "html": (
                        "<h2>1.2. Kiến Trúc Ghép Chuỗi Đối Xứng Gương (Symmetric Mirror Chain)</h2>"
                        + svg_1_2_symmetric_mirror()
                        + "<p>Trong tệp ARXML (<code>DataTransformation / TransformerChainRef</code>), kỹ sư cấu hình một chuỗi gồm 1 hoặc nhiều Transformer nối tiếp nhau. <strong>Quy tắc vàng bất biến</strong> là chiều nhận <code>Rx</code> LUÔN thực thi theo thứ tự đảo ngược hoàn toàn so với chiều gửi <code>Tx</code>:</p>"
                        + "<table class='hb-table'><thead><tr><th>Chiều Luồng</th><th>Thứ Tự Thực Thi Chuỗi</th><th>Giải Thích Lý Do Bắt Buộc</th></tr></thead><tbody>"
                        + "<tr><td><strong>Tx Forward (Gửi đi)</strong></td><td><code>SWC ➔ Serializer (ComXf/SomeIpXf) ➔ E2EXf_Tx ➔ COM/LdCom</code></td><td>Phải tuần tự hóa Struct thành mảng byte trước rồi mới tính CRC E2E bao phủ toàn bộ payload + header đó.</td></tr>"
                        + "<tr><td><strong>Rx Inverse (Nhận về)</strong></td><td><code>COM/LdCom ➔ E2EXf_Inv ➔ Deserializer_Inv ➔ SWC</code></td><td><code>E2EXf_Inv</code> bắt buộc kiểm tra CRC &amp; Counter TRƯỚC để loại bỏ frame hỏng trên dây trước khi chạm vào Deserializer!</td></tr>"
                        + "</tbody></table>"
                    ),
                },
                {
                    "pill": "1.3 Mã Keo RTE (Rte.c) & Quản Lý Biên SWC",
                    "html": (
                        "<h2>1.3. Cơ Chế Mã Keo RTE (Rte.c): Cấp Phát Buffer &amp; Xử Lý Lỗi</h2>"
                        + "<p><code>RTE</code> đóng vai trò nhạc trưởng gọi lần lượt các hàm <code>&lt;Mip&gt;_&lt;transformerId&gt;</code> và kiểm tra Bit 7 của mã trả về sau từng bước:</p>"
                        + "<div class='hb-code'>/* Mẫu mã keo Rte.c tại ECU Nhận (Rx Inverse) */\nuint8 ret1 = E2EXf_Inv_Brake(cleanBuf, &amp;cleanLen, rxBuf, rxLen);\nif ((ret1 &amp; 0x80U) != 0U) {\n    return RTE_E_HARD_TRANSFORMER_ERROR; /* 0x88: Ngắt chuỗi ngay! */\n}\nuint8 ret2 = ComXf_Inv_Brake(&amp;swcStruct, cleanBuf, cleanLen);\nreturn (ret1 != 0x00U) ? RTE_E_SOFT_TRANSFORMER_ERROR : RTE_E_OK;</div>"
                        + "<ul><li>Nếu lỗi ở <code>E2EXf_Inv</code> có <strong>Bit 7 = 1</strong>, RTE bỏ qua bước gọi <code>ComXf_Inv / SomeIpXf_Inv</code> để tránh ghi dữ liệu rác vào RAM của SWC.</li>"
                        + "<li>Với Client-Server RPC qua <code>SomeIpXf</code>, RTE quản lý thêm <code>Rte_Cs_TransactionHandleType { clientId, sequenceCounter }</code> để đối chiếu đúng phiên phản hồi.</li></ul>"
                    ),
                },
                {
                    "pill": "1.4 Bảng I/O 9 Module Liên Quan Tới Xfrm",
                    "html": (
                        "<h2>1.4. Phân Tích Input ➔ Processing ➔ Output Của 9 Module AUTOSAR</h2>"
                        + "<table class='hb-table'><thead><tr><th>Module (ID)</th><th>Input Lấy Từ Đâu</th><th>Xử Lý Trọng Tâm</th><th>Output Route Đến Đâu</th></tr></thead><tbody>"
                        + "<tr><td><strong>SWC</strong></td><td>Biến ứng dụng / RTE sạch</td><td>Logic điều khiển xe (trong suốt Xfrm)</td><td><code>Rte_Write()</code> / <code>Rte_Call()</code></td></tr>"
                        + "<tr><td><strong>RTE (#2)</strong></td><td>SWC (Tx) / COM, LdCom (Rx)</td><td>Quản lý Buffer <code>HeaderShift</code>, gọi chuỗi, Overlay <code>0x88/0x8A</code></td><td><code>ComXf / SomeIpXf / E2EXf / SWC</code></td></tr>"
                        + "<tr><td><strong>ComXf (#175)</strong></td><td>Struct ISignalGroup (Tx) / CleanBuf (Rx)</td><td>Đóng gói bit, Motorola/Intel Endian, FillPattern, SignExt</td><td><code>Com_SendSignalGroupArray()</code> / SWC</td></tr>"
                        + "<tr><td><strong>SomeIpXf (#174)</strong></td><td>Struct, DynArr, RPC Handle</td><td>8B Header, LengthField, AlignPad, TLV, <code>ExtractProtocolHeaderFields()</code></td><td><code>LdCom_Transmit()</code> / SWC</td></tr>"
                        + "<tr><td><strong>E2EXf (#176)</strong></td><td>Payload Serializer (Tx) / Frame bus (Rx)</td><td>CRC P01/P04/P05/P07, Counter, <code>E2E_SMCheck()</code>, 2-Nibble code</td><td>Buffer + Header (Tx) / CleanBuf + ret (Rx)</td></tr>"
                        + "<tr><td><strong>COM (#50)</strong></td><td>Mảng byte từ RTE / I-PDU từ PduR</td><td>Truyền nguyên khối qua <code>SignalGroupArray</code> giảm tải CPU</td><td><code>PduR_ComTransmit()</code> / <code>Com_ReceiveSignalGroupArray()</code></td></tr>"
                        + "<tr><td><strong>LdCom (#49)</strong></td><td><code>PduInfoPtr</code> từ RTE / PduR</td><td>Pass-through không bóc tín hiệu cho Ethernet/SOME/IP lớn</td><td><code>PduR_LdComTransmit()</code> / <code>Rte_LdComCbkRxIndication()</code></td></tr>"
                        + "<tr><td><strong>PduR/CanIf/SoAd</strong></td><td>I-PDU từ COM / LdCom</td><td>Định tuyến &amp; gắn 8B ServiceID/MethodID/Len (SoAd)</td><td>Bus vật lý CAN-FD / Ethernet TCP-UDP</td></tr>"
                        + "<tr><td><strong>DET (#15)</strong></td><td>Cảnh báo lỗi Dev/Runtime từ Xfrm</td><td>Lưu vết <code>0x01..0x04</code> (Dev) &amp; <code>0x05</code> (Runtime)</td><td>Error Hook / Trace Debug</td></tr>"
                        + "</tbody></table>"
                    ),
                },
            ],
        },
        # MAIN TAB 1: Tab 2 (ComXf)
        {
            "title": "2. Giải Phẫu ComXf (ModuleId 175) — SignalGroup & COM",
            "subs": [
                {
                    "pill": "2.1 ComXf vs Bit-Packing Truyền Thống Trong COM",
                    "html": (
                        "<h2>2.1. Tăng Tốc Độ Truyền Tín Hiệu Với ComXf &amp; Com_SendSignalGroupArray()</h2>"
                        + svg_2_1_comxf_vs_com()
                        + "<p>Ở kiến trúc truyền thống, <code>AUTOSAR COM</code> phải lặp qua từng <code>ComSignal</code> trong nhóm, tính dịch bit và gán vào I-PDU lúc runtime, gây tốn CPU khi ECU có hàng trăm SignalGroup.</p>"
                        + "<div class='hb-callout'><strong>Giải pháp ComXf (#175):</strong> Khi cấu hình <code>ComDataBasedTransformationRef</code>, code sinh tĩnh của <code>ComXf_&lt;id&gt;()</code> đóng gói thẳng cả struct thành mảng byte tuyến tính tối ưu bằng thanh ghi CPU, sau đó gọi 1 lần duy nhất <code>Com_SendSignalGroupArray(SignalGroupId, BufferPtr)</code> (<code>SWS_Com_00851</code>).</div>"
                        + "<ul><li><strong>Lưu ý tích hợp:</strong> Khi dùng <code>ComXf</code>, KHÔNG bật cấu hình đóng gói từng signal song song bên trong COM cho cùng nhóm đó để tránh xung đột bit!</li></ul>"
                    ),
                },
                {
                    "pill": "2.2 Quy Tắc BitPosition, Motorola BE vs Intel LE",
                    "html": (
                        "<h2>2.2. Ánh Xạ Endianness: Motorola (Big-Endian) vs Intel (Little-Endian)</h2>"
                        + svg_2_2_endianness_bits()
                        + "<p>Thử trực tiếp trong mô phỏng <strong>Kịch bản S1</strong> với <code>VehicleSpeed = 1205 (0x04B5)</code>:</p>"
                        + "<table class='hb-table'><thead><tr><th>Chế độ</th><th>Byte 0</th><th>Byte 1</th><th>Giải Thích</th></tr></thead><tbody>"
                        + "<tr><td><code>BIG_ENDIAN</code> (Motorola)</td><td><code>0x04</code> (MSB)</td><td><code>0xB5</code> (LSB)</td><td>Byte trọng số cao nằm ở địa chỉ offset thấp hơn (phổ biến nhất trên CAN OEM).</td></tr>"
                        + "<tr><td><code>LITTLE_ENDIAN</code> (Intel)</td><td><code>0xB5</code> (LSB)</td><td><code>0x04</code> (MSB)</td><td>Byte trọng số thấp nằm trước theo kiến trúc CPU x86/ARM/TriCore.</td></tr>"
                        + "</tbody></table>"
                    ),
                },
                {
                    "pill": "2.3 SignExtension & UnusedBitPattern (FillPattern)",
                    "html": (
                        "<h2>2.3. Mở Rộng Dấu (sint16) &amp; Điền Bit Trống (ComXfUnusedBitPattern)</h2>"
                        + "<ul><li><strong>Two's Complement &amp; SignExtension:</strong> Khi góc lái <code>SteerAngle = -120</code> (<code>sint16 = 0xFF88</code>) hoặc tín hiệu có dấu 12-bit âm được giải mã bởi <code>ComXf_Inv</code>, ComXf thực hiện dịch bit và mở rộng bit dấu (Sign Extension) lên kiểu <code>sint16</code> chuẩn để SWC nhận đúng giá trị <code>-120</code> thay vì <code>65416</code>.</li>"
                        + "<li><strong>ComXfUnusedBitFillPattern (<code>SWS_ComXf_00020</code>):</strong> Giả sử <code>Gear = 4</code> chỉ dùng 4 bit thấp của Byte 4, và Byte 5..7 chưa dùng. ComXf điền giá trị mặc định (thường <code>0xFF</code> hoặc <code>0x00</code>) vào các bit dư để không rò rỉ rác RAM của ECU lên bus CAN!</li></ul>"
                    ),
                },
                {
                    "pill": "2.4 Giới Hạn Khung CAN / CAN-FD & Luồng Dữ Liệu",
                    "html": (
                        "<h2>2.4. Luồng Dữ Liệu ComXf ➔ COM ➔ PduR ➔ CanIf</h2>"
                        + "<ul><li><strong>CAN Classic (8 Bytes):</strong> Nếu ghép với <code>E2EXf Profile 01 (2B)</code> hoặc <code>Profile 05 (3B)</code>, phần dữ liệu <code>ComXf</code> còn tối đa 6B hoặc 5B để lọt vừa khung CAN 8B chuẩn.</li>"
                        + "<li><strong>CAN-FD (lên tới 64 Bytes):</strong> Cho phép truyền các <code>SignalGroupArray</code> lớn kết hợp E2E mà không cần phân mảnh TP.</li>"
                        + "<li><strong>API COM dùng kèm:</strong> Chiều Tx gọi <code>Com_SendSignalGroupArray()</code>, chiều Rx gọi <code>Com_ReceiveSignalGroupArray()</code> lấy trọn vẹn mảng byte về cho <code>E2EXf_Inv ➔ ComXf_Inv</code>.</li></ul>"
                    ),
                },
            ],
        },
        # MAIN TAB 2: Tab 3 (SomeIpXf)
        {
            "title": "3. Giải Phẫu SomeIpXf (ModuleId 174) — TLV & RPC",
            "subs": [
                {
                    "pill": "3.1 Tách Bạch 8B SomeIpXf Header vs 8B SoAd Header",
                    "html": (
                        "<h2>3.1. Phân Tách 16-Byte SOME/IP Header Trên Ethernet</h2>"
                        + svg_3_1_someip_16b_hdr()
                        + "<p>Một nhầm lẫn rất phổ biến là nghĩ <code>SomeIpXf</code> tạo ra đủ 16 byte Header SOME/IP. Thực tế AUTOSAR tách làm đôi rõ rệt:</p>"
                        + "<ol><li><strong>8 Byte Đầu (Do <code>SoAd #56</code> thêm vào):</strong> <code>ServiceID (2B)</code> + <code>MethodID/EventID (2B)</code> + <code>TotalMessageLength (4B)</code>.</li>"
                        + "<li><strong>8 Byte Sau (Do <code>SomeIpXf #174</code> tạo ra &amp; kiểm tra):</strong> <code>ClientID (2B)</code> + <code>SessionID (2B)</code> + <code>ProtocolVersion (1B = 0x01)</code> + <code>InterfaceVersion (1B)</code> + <code>MessageType (1B)</code> + <code>ReturnCode (1B)</code>.</li></ol>"
                    ),
                },
                {
                    "pill": "3.2 Alignment Padding, LengthField & Mảng Động",
                    "html": (
                        "<h2>3.2. Tuần Tự Hóa Struct Động, LengthField (1/2/4B) &amp; Alignment</h2>"
                        + svg_3_2_dynarr_align()
                        + "<ul><li><strong>LengthField (<code>SomeIpXfLengthFieldSize</code>):</strong> Đặt ngay trước mỗi Dynamic Array hoặc Dynamic String (1, 2 hoặc 4 bytes Big-Endian) ghi tổng số byte dữ liệu động theo sau.</li>"
                        + "<li><strong>Alignment Padding:</strong> Nếu cấu hình căn chỉnh <code>4 Bytes</code> mà trường cố định trước đó chỉ chiếm 3 bytes, <code>SomeIpXf</code> tự chèn 1 byte <code>0x00</code> (AlignPad) để đưa offset về bội số 4 trước khi ghi <code>LengthField</code>.</li></ul>"
                    ),
                },
                {
                    "pill": "3.3 Cơ Chế TLV (WireType + DataId) & Tương Thích OTA",
                    "html": (
                        "<h2>3.3. Mã Hóa Mở Rộng TLV &amp; Khả Năng Tương Thích Tiến/Lùi</h2>"
                        + svg_3_3_tlv_wiretype()
                        + "<p>Khi bật <code>SomeIpXfEnableTlvEncoding = TRUE</code>, trước mỗi thành viên struct đều có <strong>Tag 16-bit</strong> gồm: <code>Bits 14..12 = WireType</code> và <code>Bits 11..0 = DataId</code>.</p>"
                        + "<div class='hb-callout'><strong>Tại sao ECU V1 đọc được gói của ECU V2 mới hơn?</strong> Khi gặp <code>DataId = 0x0003</code> lạ, V1 đọc 3 bit <code>WireType</code> để biết chính xác độ dài cần nhảy qua (1/2/4/8B hoặc theo LengthField) rồi tiếp tục giải mã các trường sau mà không bị lệch offset (khi bật <code>IGNORE_SKIP_UNKNOWN_TAG</code>)!</div>"
                    ),
                },
                {
                    "pill": "3.4 Client-Server RPC, TransactionHandle & ExtractHeader",
                    "html": (
                        "<h2>3.4. Giao Tiếp Client-Server RPC &amp; ExtractProtocolHeaderFields()</h2>"
                        + svg_3_4_rpc_sequence()
                        + "<ul><li><strong>Rte_Cs_TransactionHandleType:</strong> Lưu <code>clientId</code> và <code>sequenceCounter</code> (SessionId) xuyên suốt từ <code>Rte_Call()</code> (<code>REQUEST 0x00</code>) tới lúc nhận <code>RESPONSE (0x80)</code>.</li>"
                        + "<li><strong>SomeIpXf_ExtractProtocolHeaderFields() (<code>SWS_SomeIpXf_00171</code>):</strong> RTE gọi trước hàm này để đọc Byte 6 (<code>MessageType</code>) và Byte 7 (<code>ReturnCode</code>) nhằm biết phải rẽ nhánh vào Request, Response bình thường hay gói báo lỗi nghiệp vụ <code>ERROR (0x81)</code> (vốn KHÔNG mang tham số OUT!).</li></ul>"
                    ),
                },
            ],
        },
        # MAIN TAB 3: Tab 4 (E2EXf)
        {
            "title": "4. Giải Phẫu E2EXf (ModuleId 176) — Profile & 2-Nibble",
            "subs": [
                {
                    "pill": "4.1 So Sánh Profile P01, P05, P04 & P07",
                    "html": (
                        "<h2>4.1. So Sánh 4 E2E Safety Profiles Trong E2EXf (#176)</h2>"
                        + svg_4_1_e2e_profiles()
                        + "<table class='hb-table'><thead><tr><th>Profile</th><th>Header Size</th><th>Thuật Toán CRC</th><th>Ứng Dụng Điển Hình</th></tr></thead><tbody>"
                        + "<tr><td><code>PROFILE_01</code></td><td>2 Bytes</td><td>CRC-8-SAE-J1850</td><td>CAN Classic 8B (4-bit Counter + 4-bit DataID nibble)</td></tr>"
                        + "<tr><td><code>PROFILE_05</code></td><td>3 Bytes</td><td>CRC-16-CCITT</td><td>CAN-FD gọn nhẹ (8-bit Counter, DataID 16b ẩn trong CRC)</td></tr>"
                        + "<tr><td><code>PROFILE_04</code></td><td>12 Bytes</td><td>CRC-32P4 (0xF4ACFB13)</td><td>Ethernet SOME/IP SOA (Len 2B + Cnt 2B + DataID 4B + CRC 4B)</td></tr>"
                        + "<tr><td><code>PROFILE_07</code></td><td>20 Bytes</td><td>CRC-64-ECMA</td><td>Camera/Radar/Lidar ADAS cỡ cực lớn (&gt; 4KB) ASIL-D</td></tr>"
                        + "</tbody></table>"
                    ),
                },
                {
                    "pill": "4.2 Cửa Sổ Trượt E2E_SMCheck() & Tham Số Ngưỡng",
                    "html": (
                        "<h2>4.2. Cửa Sổ Trượt Máy Trạng Thái E2E_SMCheck()</h2>"
                        + svg_4_2_e2e_sm_window()
                        + "<ul><li><strong>MinOkStateValid:</strong> Số khung tốt liên tiếp cần tích lũy ở <code>NODATA/INIT</code> (hoặc <code>MinOkStateInvalid</code> khi hồi phục từ <code>INVALID</code>) để lên trạng thái an toàn <code>E2E_SM_VALID</code>.</li>"
                        + "<li><strong>MaxErrorStateValid:</strong> Số khung lỗi cho phép khi đang <code>VALID</code> (tạo vùng đệm Soft Error <code>0x8A</code>). Vượt quá ngưỡng này ➔ sập tức thì xuống <code>E2E_SM_INVALID</code>!</li></ul>"
                    ),
                },
                {
                    "pill": "4.3 Bảng Giải Mã Đầy Đủ 2-Nibble Return Code",
                    "html": (
                        "<h2>4.3. Giải Mã Byte Trả Về 2-Nibble Của E2EXf_Inv (SWS_E2EXf_00032)</h2>"
                        + svg_4_3_two_nibble_byte()
                        + "<table class='hb-table'><thead><tr><th>Mã Hex</th><th>High Nibble (CheckStatus)</th><th>Low Nibble (SMState)</th><th>Bit 7</th><th>Hành Động Của RTE</th></tr></thead><tbody>"
                        + "<tr><td><code>0x00</code></td><td><code>0x0</code> E2E_P_OK</td><td><code>0x0</code> VALID</td><td>0</td><td>Gọi Deserializer, trả <code>RTE_E_OK (0x00)</code></td></tr>"
                        + "<tr><td><code>0x10</code></td><td><code>0x1</code> REPEATED</td><td><code>0x0</code> VALID</td><td>0</td><td>Vẫn giải mã, trả <code>RTE_E_SOFT_TRANSFORMER_ERROR (0x8A)</code></td></tr>"
                        + "<tr><td><code>0x20</code></td><td><code>0x2</code> WRONGSEQUENCE</td><td><code>0x0</code> VALID</td><td>0</td><td>Vẫn giải mã, trả <code>RTE_E_SOFT_TRANSFORMER_ERROR (0x8A)</code></td></tr>"
                        + "<tr><td><code>0xA3</code></td><td><code>0x2</code> WRONGSEQUENCE</td><td><code>0x3</code> INVALID</td><td><strong>1</strong></td><td><strong>ABORT CHAIN!</strong> Không gọi Deserializer, trả <code>0x88</code></td></tr>"
                        + "<tr><td><code>0xB3</code></td><td><code>0x3</code> ERROR (CRC/Len)</td><td><code>0x3</code> INVALID</td><td><strong>1</strong></td><td><strong>ABORT CHAIN!</strong> Chặn đứng payload hỏng, trả <code>0x88</code></td></tr>"
                        + "</tbody></table>"
                    ),
                },
                {
                    "pill": "4.4 Tại Sao E2EXf_Inv Phải Chạy Trước Deserializer?",
                    "html": (
                        "<h2>4.4. Lý Do An Toàn Khi Đặt E2EXf_Inv Trước SomeIpXf_Inv / ComXf_Inv</h2>"
                        + svg_4_4_rx_order_safety()
                        + "<div class='hb-callout danger'><strong>Rủi ro chết người nếu đảo ngược thứ tự Rx:</strong> Nếu để <code>SomeIpXf_Inv</code> giải mã trước khi kiểm tra CRC E2E, một bit nhiễu trên dây Ethernet làm hỏng trường <code>LengthField</code> thành <code>0xFFFFFFFF</code> có thể khiến Deserializer đọc tràn bộ nhớ (Out-of-Bounds / Fault Trap) hoặc giải mã ra thông số phanh/lái sai lệch cực kỳ nguy hiểm!</div>"
                        + "<p>Bằng cách đặt <code>E2EXf_Inv</code> làm chốt chặn đầu tiên ở chiều Rx, bất kỳ lỗi bit nào đều bị phát hiện qua CRC và chặn đứng bằng <code>Bit 7 = 1 (0x88 Abort)</code> trước khi bất kỳ byte nào chạm tới Deserializer.</p>"
                    ),
                },
            ],
        },
        # MAIN TAB 4: Tab 5 (InPlace, Errors, Com vs LdCom)
        {
            "title": "5. Bộ Đệm In-Place, Lỗi 0x88/0x8A & COM vs LdCom",
            "subs": [
                {
                    "pill": "5.1 In-Place Buffer (HeaderShift Zero-Copy) vs Out-of-Place",
                    "html": (
                        "<h2>5.1. Quản Lý Bộ Đệm In-Place (HeaderShift) vs Out-of-Place</h2>"
                        + svg_5_1_inplace_vs_outofplace()
                        + "<ul><li><strong>IN_PLACE (Chuẩn tối ưu):</strong> RTE chỉ cấp phát 1 mảng <code>Rte_XfrmBuf[]</code> duy nhất. Khi gọi Serializer tầng 1, RTE truyền địa chỉ dịch sẵn <code>&amp;Rte_XfrmBuf[HeaderShift]</code> (với <code>HeaderShift = 2/3/12/20B</code> tùy E2E Profile). E2EXf chỉ việc tính CRC và điền thẳng vào phần đầu <code>[0..HeaderShift-1]</code> — <strong>0 bytes memcpy</strong>!</li>"
                        + "<li><strong>OUT_OF_PLACE:</strong> Khi có Transformer không hỗ trợ ghi dịch offset hoặc cấu hình tách rời, RTE phải cấp phát 2 mảng riêng biệt và tốn chu kỳ CPU copy toàn bộ payload giữa các tầng.</li></ul>"
                    ),
                },
                {
                    "pill": "5.2 Quy Tắc Bit 7: Hard Error (0x88) vs Soft Error (0x8A)",
                    "html": (
                        "<h2>5.2. Cơ Chế Phủ Lỗi Của RTE (SWS_Rte_08752)</h2>"
                        + svg_5_2_error_decision()
                        + "<p>Mọi mã trả về 8-bit của các Transformer đều tuân thủ chuẩn phân định <strong>Bit 7</strong>:</p>"
                        + "<ul><li><strong>Bit 7 == 0 (0x01..0x7F): Soft Transformer Error:</strong> Lỗi nhẹ chưa vi phạm ngưỡng an toàn hệ thống (VD: E2E bị lặp/nhảy 1 frame nhưng vẫn trong <code>MaxErrorStateValid</code>). RTE vẫn tiếp tục chuỗi và gắn mã <code>RTE_E_SOFT_TRANSFORMER_ERROR (0x8A)</code> khi trả dữ liệu cho SWC.</li>"
                        + "<li><strong>Bit 7 == 1 (0x80..0xFF): Hard Transformer Error:</strong> Lỗi không thể khôi phục (<code>E2E_SM_INVALID</code>, sai Version <code>0x87/0x88</code>, bản tin cắt cụt <code>0x89</code>). RTE ngắt chuỗi ngay lập tức và trả <code>RTE_E_HARD_TRANSFORMER_ERROR (0x88)</code>.</li></ul>"
                    ),
                },
                {
                    "pill": "5.3 Phân Biệt Application Error (0x81) vs Hard (0x88) vs Soft (0x8A)",
                    "html": (
                        "<h2>5.3. Ba Nhóm Lỗi Thường Bị Nhầm Lẫn Trong AUTOSAR RPC</h2>"
                        + "<table class='hb-table'><thead><tr><th>Loại Lỗi</th><th>Nguồn Phát Sinh</th><th>Giá Trị Tại Gói Tin</th><th>Hành Vi Deserializer &amp; SWC</th></tr></thead><tbody>"
                        + "<tr><td><strong>Hard Error (0x88)</strong></td><td>Hạ tầng (CRC sai, Version sai, Cắt gói)</td><td>Byte E2E có Bit 7=1 hoặc SomeIpXf 0x87/0x89</td><td><strong>Abort Chain!</strong> Không giao dữ liệu cho SWC.</td></tr>"
                        + "<tr><td><strong>Soft Error (0x8A)</strong></td><td>E2E cảnh báo nhẹ trong ngưỡng dung nạp</td><td>E2E <code>0x10/0x20</code> (Bit 7=0)</td><td>Vẫn giải mã giao dữ liệu + báo <code>0x8A</code> để SWC tự quyết.</td></tr>"
                        + "<tr><td><strong>Application Error (0x81)</strong></td><td>Logic Server Runnable trả lỗi nghiệp vụ</td><td>Header <code>MsgType = 0x81 (ERROR)</code>, <code>RetCode = 0x01..0x5E</code></td><td>Tầng E2E &amp; mạng vẫn <code>OK (0x00)</code>. RTE bỏ giải mã OUT, trả đúng mã lỗi nghiệp vụ cho Client SWC!</td></tr>"
                        + "</tbody></table>"
                    ),
                },
                {
                    "pill": "5.4 Chọn Đường Truyền: AUTOSAR COM vs LdCom",
                    "html": (
                        "<h2>5.4. Ranh Giới Giữa AUTOSAR COM (#50) và Large Data COM (LdCom #49)</h2>"
                        + svg_5_4_com_vs_ldcom()
                        + "<ul><li><strong>AUTOSAR COM (<code>Com_SendSignalGroupArray</code>):</strong> Dùng cho bus truyền thống (CAN/CAN-FD/LIN/FlexRay) kết hợp <code>ComXf (+E2EXf)</code>. Hỗ trợ Update-bit, deadline monitoring, filter tín hiệu ở mức PDU cố định (&le; 64B).</li>"
                        + "<li><strong>LdCom (<code>LdCom_Transmit</code>):</strong> Sinh ra cho <code>SomeIpXf (+E2EXf)</code> trên Ethernet hoặc TP kích thước lớn. Không can thiệp nội dung bên trong (Pass-through hoàn toàn), cho phép truyền thẳng con trỏ tới SoAd/PduR với kích thước thay đổi động mỗi chu kỳ!</li></ul>"
                    ),
                },
            ],
        },
        # MAIN TAB 5: Tab 6 (API Reference, ECUC, DET & Pitfalls)
        {
            "title": "6. Từ Điển API R23-11, DET & 6 Bẫy Tích Hợp Thực Chiến",
            "subs": [
                {
                    "pill": "6.1 Từ Điển API Chuẩn R23-11 (174, 175, 176)",
                    "html": (
                        "<h2>6.1. Bảng Tra Cứu API Chuẩn Của SomeIpXf (#174), ComXf (#175) &amp; E2EXf (#176)</h2>"
                        + "<table class='hb-table'><thead><tr><th>Module (ID)</th><th>API Signature (AUTOSAR R22-11 / R23-11)</th><th>SID</th><th>Chức Năng</th></tr></thead><tbody>"
                        + "<tr><td>ComXf (#175)</td><td><code>void ComXf_Init(const ComXf_ConfigType* config)</code></td><td>0x01</td><td>Khởi tạo trạng thái ComXf trước khi chạy chuỗi</td></tr>"
                        + "<tr><td>ComXf (#175)</td><td><code>uint8 ComXf_&lt;transformerId&gt;(uint8* buffer, uint16* bufferLength, const T* dataElement)</code></td><td>0x03</td><td>Tx tuần tự hóa struct thành mảng SignalGroupArray</td></tr>"
                        + "<tr><td>ComXf (#175)</td><td><code>uint8 ComXf_Inv_&lt;transformerId&gt;(const uint8* buffer, uint16 bufferLength, T* dataElement)</code></td><td>0x04</td><td>Rx giải mã mảng byte về struct + SignExtension</td></tr>"
                        + "<tr><td>SomeIpXf (#174)</td><td><code>uint8 SomeIpXf_&lt;transformerId&gt;(uint8* buffer, uint32* bufferLength, ...)</code></td><td>0x03</td><td>Tx tuần tự hóa 8B Header + Align + LengthField + TLV + RPC</td></tr>"
                        + "<tr><td>SomeIpXf (#174)</td><td><code>Std_ReturnType SomeIpXf_ExtractProtocolHeaderFields(const uint8* buf, uint32 len, Std_MessageTypeType* type, Std_MessageResultType* res)</code></td><td>0x05</td><td>Đọc nhanh MsgType &amp; ReturnCode tại Byte 6..7 trước Deserializer</td></tr>"
                        + "<tr><td>E2EXf (#176)</td><td><code>uint8 E2EXf_&lt;transformerId&gt;(uint8* buffer, uint32* bufLen, const uint8* inputBuf, uint32 inLen)</code></td><td>0x03</td><td>Tx bảo vệ CRC + Counter + DataID vào đầu buffer</td></tr>"
                        + "<tr><td>E2EXf (#176)</td><td><code>uint8 E2EXf_Inv_&lt;transformerId&gt;(uint8* buffer, uint32* bufLen, const uint8* inputBuf, uint32 inLen)</code></td><td>0x04</td><td>Rx kiểm tra E2E + cập nhật E2E_SMCheck() trả mã 2-Nibble</td></tr>"
                        + "<tr><td>Cả 3 (#174/5/6)</td><td><code>void &lt;Mip&gt;_GetVersionInfo(Std_VersionInfoType* versioninfo)</code></td><td>0x02</td><td>Trả VendorID, ModuleID &amp; SW version (check NULL_PTR)</td></tr>"
                        + "</tbody></table>"
                    ),
                },
                {
                    "pill": "6.2 Bảng Tham Số Cấu Hình ECUC Trọng Tâm",
                    "html": (
                        "<h2>6.2. Cấu Hình ECUC Xfrm Trong System Template &amp; BSWMD</h2>"
                        + "<ul><li><strong>DataTransformation / TransformerChainRef:</strong> Khai báo thứ tự chuỗi <code>[SomeIpXf -&gt; E2EXf]</code> hoặc <code>[ComXf -&gt; E2EXf]</code>.</li>"
                        + "<li><strong>XfrmBufferComputationMode:</strong> Chọn <code>IN_PLACE</code> (truyền địa chỉ <code>&amp;buf[HeaderShift]</code>) hoặc <code>OUT_OF_PLACE</code>.</li>"
                        + "<li><strong>ComXfTransformationDescription:</strong> Định nghĩa <code>PackingByteOrder</code> (Big/Little) và <code>UnusedBitPattern</code> (0xFF/0x00).</li>"
                        + "<li><strong>SomeIpTransformationDescription:</strong> Định nghĩa <code>SizeOfArrayLengthField</code> (1/2/4B), <code>Alignment</code>, <code>InterfaceVersion</code>, và <code>TLV Encoding</code>.</li>"
                        + "<li><strong>E2EXfProfileConfig:</strong> Chọn Profile P01/P04/P05/P07, <code>DataId</code>, <code>MaxDeltaCounter</code>, <code>MinOkStateValid</code>, <code>MaxErrorStateValid</code>.</li></ul>"
                    ),
                },
                {
                    "pill": "6.3 Hàng Rào Lỗi DET (Dev Errors vs Production Runtime 0x05)",
                    "html": (
                        "<h2>6.3. Bảng Mã Lỗi DET Chuẩn Của Họ Module Xfrm</h2>"
                        + svg_6_3_det_barrier()
                        + "<table class='hb-table'><thead><tr><th>Mã Lỗi DET</th><th>Giá Trị</th><th>Phân Loại API</th><th>Điều Kiện Kích Hoạt</th></tr></thead><tbody>"
                        + "<tr><td><code>XFRM_E_UNINIT</code></td><td><code>0x01</code></td><td>Dev Error (<code>Det_ReportError</code>)</td><td>Gọi API chính khi chưa gọi <code>&lt;Mip&gt;_Init()</code></td></tr>"
                        + "<tr><td><code>XFRM_E_INIT_FAILED</code></td><td><code>0x02</code></td><td>Dev Error (<code>Det_ReportError</code>)</td><td>Con trỏ ConfigPtr truyền vào <code>Init()</code> không hợp lệ</td></tr>"
                        + "<tr><td><code>XFRM_E_PARAM</code></td><td><code>0x03</code></td><td>Dev Error (<code>Det_ReportError</code>)</td><td>Độ dài buffer vượt ngưỡng hoặc giá trị tham số bất hợp lệ</td></tr>"
                        + "<tr><td><code>XFRM_E_PARAM_POINTER</code></td><td><code>0x04</code></td><td>Dev Error (<code>Det_ReportError</code>)</td><td>Tham số <code>buffer</code>, <code>dataElement</code> hoặc <code>versioninfo == NULL_PTR</code></td></tr>"
                        + "<tr><td><code>XFRM_E_MALFORMED_MESSAGE</code></td><td><code>0x05</code></td><td><strong>Runtime Error</strong> (<code>Det_ReportRuntimeError</code>)</td><td>Luồng byte SomeIpXf cắt cụt (&lt;8B), sai LengthField hoặc hỏng Tag TLV (chạy ngay cả khi <code>XfrmDevErrorDetect = FALSE</code>!)</td></tr>"
                        + "</tbody></table>"
                    ),
                },
                {
                    "pill": "6.4 6 Bẫy Lỗi Tích Hợp Thực Chiến Hay Gặp Nhất",
                    "html": (
                        "<h2>6.4. 6 Bẫy Lỗi Kinh Điển Khi Tích Hợp Chuỗi Transformer Ngoài Dự Án</h2>"
                        + "<ol><li><strong>Đảo nhầm thứ tự Tx và Rx trong ARXML:</strong> Đặt Deserializer chạy trước E2EXf_Inv ở chiều Rx khiến E2EXf kiểm tra CRC trên dữ liệu đã giải mã sai hoàn toàn!</li>"
                        + "<li><strong>Quên cộng HeaderShift khi IN_PLACE:</strong> Truyền <code>&amp;buf[0]</code> cho SomeIpXf rồi sau đó E2EXf Profile 04 ghi 12 byte đè nát 8 byte Header SOME/IP đầu tiên!</li>"
                        + "<li><strong>Bật Com Signal packing song song với ComXf:</strong> COM tự dịch bit đè lên mảng byte đã đóng gói sẵn của <code>ComXf</code> làm sai lệch payload.</li>"
                        + "<li><strong>Lệch Endianness hoặc LengthFieldSize (2B vs 4B) giữa 2 ECU:</strong> Khiến độ dài mảng động bị đọc sai hàng nghìn byte và kích <code>0x89 E_SER_MALFORMED_MESSAGE</code>.</li>"
                        + "<li><strong>Quên xử lý <code>MessageType = ERROR (0x81)</code> ở Client RPC:</strong> Cố gọi <code>SomeIpXf_Inv</code> cho các tham số OUT khi gói tin lỗi vốn không chứa OUT params!</li>"
                        + "<li><strong>Hiểu nhầm Soft Error 0x8A là lỗi phần cứng:</strong> Không kiểm tra Bit 7 trước khi hủy dữ liệu khiến hệ thống ngắt tín hiệu quá nhạy với 1 khung lặp đơn lẻ.</li></ol>"
                    ),
                },
            ],
        },
    ]


def main():
    out_path = Path(__file__).resolve().parent / "part6_handbook.js"
    data_json = json.dumps(build_handbook_data(), ensure_ascii=False, indent=2)

    js = f"""// ==================== AUTO-GENERATED HANDBOOK (6x4) & ABBREVIATION GLOSSARY ====================

const HANDBOOK_DATA = {data_json};

function selectHandbookMainTab(idx) {{
  uiState.hbMainTab = idx;
  uiState.hbSubTab = 0;
  for (let i = 0; i < 7; i++) {{
    const btn = document.getElementById('hbTab1_' + i);
    if (btn) btn.classList.toggle('active', i === idx);
  }}
  renderCurrentHandbookView();
}}

function selectHandbookSubTab(subIdx) {{
  uiState.hbSubTab = subIdx;
  renderCurrentHandbookView();
}}

function onAbbrSearchInput() {{
  const inp = document.getElementById('abbrSearchInput');
  uiState.abbrSearch = inp ? inp.value : '';
  renderAbbreviationTable();
}}

function clearAbbrFilter() {{
  uiState.abbrSearch = '';
  uiState.abbrCat = 'ALL';
  const inp = document.getElementById('abbrSearchInput');
  if (inp) inp.value = '';
  ['ALL', 'CORE', 'COM', 'SOMEIP', 'E2E', 'API'].forEach(c => {{
    const b = document.getElementById('abbrCatBtn_' + c);
    if (b) b.classList.toggle('active', c === 'ALL');
  }});
  renderAbbreviationTable();
}}

function setAbbrCategory(cat) {{
  uiState.abbrCat = cat;
  ['ALL', 'CORE', 'COM', 'SOMEIP', 'E2E', 'API'].forEach(c => {{
    const b = document.getElementById('abbrCatBtn_' + c);
    if (b) b.classList.toggle('active', c === cat);
  }});
  renderAbbreviationTable();
}}

function highlightMatch(text, query) {{
  const safe = escapeHtml(text);
  const q = String(query || '').trim();
  if (!q) return safe;
  const escapedQ = q.replace(/[.*+?^${{}}()|[\\]\\\\]/g, '\\\\$&');
  const re = new RegExp('(' + escapedQ + ')', 'gi');
  return safe.replace(re, '<mark>$1</mark>');
}}

function renderAbbreviationTable() {{
  const container = document.getElementById('hbArticleContent');
  if (!container) return;
  const q = String(uiState.abbrSearch || '').trim().toLowerCase();
  const cat = uiState.abbrCat || 'ALL';

  const filtered = ABBREVIATIONS.filter(item => {{
    if (cat !== 'ALL' && item.cat !== cat) return false;
    if (!q) return true;
    return (
      item.abbr.toLowerCase().indexOf(q) >= 0 ||
      item.full.toLowerCase().indexOf(q) >= 0 ||
      item.catLabel.toLowerCase().indexOf(q) >= 0 ||
      item.desc.toLowerCase().indexOf(q) >= 0
    );
  }});

  const countPill = document.getElementById('abbrMatchCount');
  if (countPill) {{
    countPill.textContent = filtered.length + ' / ' + ABBREVIATIONS.length + ' mục';
  }}

  if (!filtered.length) {{
    container.innerHTML = '<div class="hb-callout warn">Không tìm thấy thuật ngữ khớp với từ khóa <strong>' + escapeHtml(uiState.abbrSearch) + '</strong>. Hãy thử Xóa bộ lọc hoặc nhập từ khóa khác (VD: TLV, E2E, HeaderShift, 0x88).</div>';
    return;
  }}

  const rows = filtered.map(item => `<tr>
    <td><strong>${{highlightMatch(item.abbr, uiState.abbrSearch)}}</strong></td>
    <td>${{highlightMatch(item.full, uiState.abbrSearch)}}</td>
    <td><span class="st-pill info" style="font-size:10px;">${{highlightMatch(item.catLabel, uiState.abbrSearch)}}</span></td>
    <td>${{highlightMatch(item.desc, uiState.abbrSearch)}}</td>
  </tr>`).join('');

  container.innerHTML = `
    <h2>🔤 Từ Điển Thuật Ngữ &amp; Từ Viết Tắt AUTOSAR Xfrm (${{filtered.length}} mục)</h2>
    <table class="hb-table">
      <thead>
        <tr>
          <th style="width:14%;">Từ Viết Tắt</th>
          <th style="width:26%;">Tên Đầy Đủ (English Term)</th>
          <th style="width:18%;">Phân Nhóm</th>
          <th style="width:42%;">Giải Thích Chi Tiết &amp; Vai Trò Trong Xfrm</th>
        </tr>
      </thead>
      <tbody>${{rows}}</tbody>
    </table>
  `;
}}

function renderCurrentHandbookView() {{
  const nav2 = document.getElementById('hbNav2');
  const abbrBox = document.getElementById('hbAbbrFilterBox');
  const contentEl = document.getElementById('hbArticleContent');
  if (!nav2 || !abbrBox || !contentEl) return;

  if (uiState.hbMainTab === 6) {{
    nav2.style.display = 'none';
    abbrBox.style.display = 'flex';
    renderAbbreviationTable();
    return;
  }}

  abbrBox.style.display = 'none';
  nav2.style.display = 'flex';
  const topic = HANDBOOK_DATA[uiState.hbMainTab] || HANDBOOK_DATA[0];
  nav2.innerHTML = topic.subs.map((sub, i) =>
    `<button id="hbTab2_${{i}}" class="hb-tab2 ${{i === uiState.hbSubTab ? 'active' : ''}}" onclick="selectHandbookSubTab(${{i}})">${{escapeHtml(sub.pill)}}</button>`
  ).join('');

  const activeSub = topic.subs[uiState.hbSubTab] || topic.subs[0];
  contentEl.innerHTML = activeSub ? activeSub.html : '';
}}

window.addEventListener('DOMContentLoaded', () => {{
  syncInputsFromConfig();
  initTooltipHandlers();
  loadScenario('S1');
  renderCurrentHandbookView();
}});
"""
    out_path.write_text(js, encoding="utf-8")
    print(f"Generated {out_path} ({len(js)} chars)")


if __name__ == "__main__":
    main()
