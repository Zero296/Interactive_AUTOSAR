# -*- coding: utf-8 -*-
"""Generate part6_handbook.js with 6x4 Multi-Level Handbook + Abbreviation Table + DOMContentLoaded bootstrap."""

import json
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

from hb_diagrams_canif import build_diagrams


def build_handbook_data(DIAGRAMS):
    return [
        {
            "title": "1. Kiến Trúc CAN Stack & CanIf",
            "subs": [
                {
                    "title": "1.1 Vị Trí & Vai Trò ECU Abstraction",
                    "html": f"""
<div class="hb-card">
  <h3>1.1 CanIf Trong Kiến Trúc Phân Tầng AUTOSAR Classic (ModuleId = 60)</h3>
  <p><b>CanIf (CAN Interface)</b> nằm ở tầng <b>ECU Abstraction Layer</b>, đóng vai trò cầu nối chuẩn hóa giữa các tầng trên (<code>PduR</code>, <code>CanTp</code>, <code>CanNm</code>, <code>CanTSyn</code>, <code>J1939Nm</code>, <code>CDD</code>) với tầng phần cứng bên dưới (<code>CanDrv</code> MCAL và <code>CanTrcv</code>).</p>
  {DIAGRAMS["stack_position"]}
  <div class="hb-grid2">
    <div>
      <h4>Tại sao phải tách CanIf khỏi CanDrv?</h4>
      <ul>
        <li><b>Phần cứng độc lập (HW Abstraction):</b> Tầng trên chỉ biết tới <code>PduIdType</code> (ID logic); CanIf ánh xạ ID đó sang <code>Can_HwHandleType</code> (HTH/HRH) của từng chip MCU khác nhau (Infineon AURIX TC3xx, NXP S32K3, Renesas RH850).</li>
        <li><b>Không chứa giao thức hay đóng gói Signal:</b> CanIf chỉ xử lý nguyên khung <b>L-PDU</b> (tối đa 8B CAN 2.0 hoặc 64B CAN FD); việc giải mã Signal do <code>Com</code>, phân mảnh Multi-frame do <code>CanTp</code>, và State Machine mạng do <code>CanNm/CanSM</code>.</li>
      </ul>
    </div>
    <div>
      <h4>Luồng giao tiếp với từng nhóm module</h4>
      <table class="tbl">
        <tr><th>Nhóm Module</th><th>Hướng tương tác với CanIf</th></tr>
        <tr><td><b>PduR / CanTp / CanNm / CanTSyn</b></td><td>Gọi xuống <code>CanIf_Transmit()</code>; nhận callback <code>&lt;User&gt;_RxIndication</code>, <code>&lt;User&gt;_TxConfirmation</code>.</td></tr>
        <tr><td><b>CanSM / BswM</b></td><td>Điều khiển <code>CanIf_SetControllerMode()</code>, <code>CanIf_SetPduMode()</code>, <code>CanIf_SetTrcvMode()</code>, <code>CanIf_SetBaudrate()</code>.</td></tr>
        <tr><td><b>EcuM</b></td><td>Kiểm tra và xác thực đánh thức qua <code>CanIf_CheckWakeup()</code> &amp; <code>CanIf_CheckValidation()</code>.</td></tr>
        <tr><td><b>CanDrv / CanTrcv</b></td><td>Nhận lệnh <code>Can_Write()</code>, <code>CanTrcv_SetOpMode()</code> và đẩy ngắt <code>RxIndication</code> / <code>TxConfirmation</code> / <code>BusOff</code> lên CanIf.</td></tr>
      </table>
    </div>
  </div>
</div>"""
                },
                {
                    "title": "1.2 Cấu Trúc 32-bit Can_IdType (SWS_Can_00416)",
                    "html": f"""
<div class="hb-card">
  <h3>1.2 Giải Mã Thanh Ghi 32-bit Can_IdType: Standard vs Extended &amp; CAN FD</h3>
  <p>Thay vì truyền hai tham số tách rời (CAN ID và Frame Flag), AUTOSAR hợp nhất toàn bộ thông tin định danh và chuẩn khung truyền vào một số nguyên không dấu 32-bit duy nhất gọi là <code>Can_IdType</code>.</p>
  {DIAGRAMS["canid_bits"]}
  <table class="tbl">
    <tr><th>Vị Trí Bit</th><th>Tên Cờ</th><th>Giá Trị &amp; Ý Nghĩa (SWS_Can_00416)</th></tr>
    <tr><td class="mono">Bit 31 (MSB)</td><td><b>EXT_ID Flag</b></td><td><code>0</code> = Standard CAN (11-bit ID 0x000..0x7FF); <code>1</code> = Extended CAN (29-bit ID, cộng mặt nạ <code>0x80000000</code>).</td></tr>
    <tr><td class="mono">Bit 30</td><td><b>FD_MODE Flag</b></td><td><code>0</code> = Classical CAN 2.0 (Max 8B); <code>1</code> = CAN FD Frame lên tới 64 Bytes (cộng mặt nạ <code>0x40000000</code>).</td></tr>
    <tr><td class="mono">Bit 29</td><td><b>Reserved</b></td><td>Luôn bằng <code>0</code> trong chuẩn AUTOSAR R23-11.</td></tr>
    <tr><td class="mono">Bits 28..0</td><td><b>CAN Identifier</b></td><td>Giá trị Arbitration ID thực sự truyền lên bus vật lý CAN_H / CAN_L.</td></tr>
  </table>
</div>"""
                },
                {
                    "title": "1.3 SWC, RTE & Bảo Vệ SchM ExclusiveArea",
                    "html": """
<div class="hb-card">
  <h3>1.3 Tương Tác Gián Tiếp SWC ↔ CanIf &amp; Vùng Găng SchM</h3>
  <div class="hb-grid2">
    <div>
      <h4>SWC KHÔNG bao giờ gọi trực tiếp CanIf</h4>
      <p>Theo nguyên tắc phân tách AUTOSAR, Software Component (<code>SWC</code>) chỉ gọi API trừu tượng của <b>RTE</b> (ví dụ <code>Rte_Write_PpBrake_Torque()</code>). Sau đó <code>Com</code> gom tín hiệu vào I-PDU, đưa qua <code>PduR</code> định tuyến tới <code>CanIf_Transmit()</code>.</p>
      <p>Tương tự, với chuyển trạng thái mạng, <code>SWC</code> xin chế độ qua <code>ComM_RequestComMode()</code> ➔ <code>CanSM</code> ➔ <code>CanIf_SetControllerMode()</code>.</p>
    </div>
    <div>
      <h4>Tại sao CanIf cần SchM_Enter_CanIf_EXCLUSIVE_AREA_0?</h4>
      <ul>
        <li><b>Xung đột Task vs ISR:</b> Task 10ms đang gọi <code>CanIf_Transmit()</code> để chèn bản tin vào <code>CanIfTxBuffer</code>, đúng lúc đó ngắt cứng CAN ISR nhảy vào <code>CanIf_TxConfirmation()</code> để lấy phần tử đầu hàng đợi ra!</li>
        <li>Nếu không khóa ngắt ngắn bằng <code>SchM_Enter/Exit_CanIf_EXCLUSIVE_AREA_0()</code>, danh sách liên kết hoặc mảng ưu tiên sẽ bị hỏng con trỏ (Race Condition).</li>
        <li>Mảng Dynamic CAN ID (<code>CanIf_SetDynamicTxId</code>) và biến đếm Wakeup cũng dùng vùng găng bảo vệ tương tự.</li>
      </ul>
    </div>
  </div>
</div>"""
                },
                {
                    "title": "1.4 Các Phiên Bản Cấu Hình Pre-Compile / Link / Post-Build",
                    "html": """
<div class="hb-card">
  <h3>1.4 Phân Bố File Cấu Hình AUTOSAR CanIf</h3>
  <table class="tbl">
    <tr><th>File Sinh Tự Động</th><th>Config Class</th><th>Thành Phần Lưu Trữ Chính</th></tr>
    <tr><td class="mono">CanIf_Cfg.h</td><td>Pre-Compile (VariantPC)</td><td>Các macro bật/tắt tính năng biên dịch: <code>CANIF_DEV_ERROR_DETECT</code>, <code>CANIF_PUBLIC_TX_BUFFERING</code>, <code>CANIF_PRIVATE_DLC_CHECK</code>, số lượng Tx/Rx PDU.</td></tr>
    <tr><td class="mono">CanIf_Lcfg.c</td><td>Link-Time</td><td>Bảng con trỏ hàm callback lên các Upper Layer khác nhau (<code>PduR_CanIfRxIndication</code>, <code>CanTp_RxIndication</code>, <code>CanNm_RxIndication</code>...).</td></tr>
    <tr><td class="mono">CanIf_PBcfg.c</td><td>Post-Build (VariantPB)</td><td>Bảng ánh xạ <code>CanId</code> ↔ <code>TxPduId/RxPduId</code> ↔ <code>HTH/HRH</code>, mặt nạ <code>CanIfRxPduCanIdMask</code>, dung lượng <code>CanIfTxBuffer</code> cho phép đổi bộ calibration mà không biên dịch lại mã nguồn.</td></tr>
  </table>
</div>"""
                }
            ]
        },
        {
            "title": "2. HOH, CanIfTxBuffer & TriggerTx",
            "subs": [
                {
                    "title": "2.1 FullCAN vs BasicCAN HOH",
                    "html": f"""
<div class="hb-card">
  <h3>2.1 Chiến Lược Phân Bổ Hardware Object Handle (HTH &amp; HRH)</h3>
  <p>Trong phần cứng bộ điều khiển CAN (như M_CAN / FlexCAN), số lượng Hardware Message Buffer (Mailbox) có hạn (thường 32 hoặc 64 slot). AUTOSAR chia HOH thành hai loại để tối ưu giữa tốc độ CPU và dung lượng phần cứng:</p>
  {DIAGRAMS["full_vs_basic_hoh"]}
  <table class="tbl">
    <tr><th>Tiêu Chí</th><th>FullCAN HOH (1:1)</th><th>BasicCAN HOH (M:1)</th></tr>
    <tr><td><b>Tỷ lệ ánh xạ</b></td><td>1 HOH chỉ phục vụ duy nhất 1 L-PDU.</td><td>1 HOH dùng chung cho nhiều L-PDU khác nhau.</td></tr>
    <tr><td><b>Chiều Nhận (HRH)</b></td><td>Bộ lọc phần cứng chấp nhận chính xác CAN ID → CanIf KHÔNG cần chạy Software Filter.</td><td>Phần cứng mở mặt nạ rộng → CanIf BẮT BUỘC chạy Software Acceptance Filter.</td></tr>
    <tr><td><b>Chiều Truyền (HTH)</b></td><td>Không cần <code>CanIfTxBuffer</code>. Dùng cho tin tối khẩn cấp (CanNm / Airbag).</td><td>Phải bật <code>CanIfTxBuffer</code> để xếp hàng chống rớt tin khi Mailbox bận.</td></tr>
  </table>
</div>"""
                },
                {
                    "title": "2.2 CanIfTxBuffer & Priority Inversion",
                    "html": f"""
<div class="hb-card">
  <h3>2.2 Hàng Đợi Ưu Tiên CanIfTxBuffer &amp; Chống Đảo Ngược Ưu Tiên</h3>
  <p>Nếu ECU truyền 2 bản tin khác nhau (<code>0x7E8</code> ưu tiên thấp và <code>0x100</code> ưu tiên cao) qua cùng một <code>BasicCAN HTH_1</code> theo kiểu FIFO đơn thuần, <code>0x7E8</code> gửi trước sẽ chặn đường <code>0x100</code> — hiện tượng này gọi là <b>Inner Priority Inversion</b>.</p>
  {DIAGRAMS["tx_buffer_priority"]}
  <ul>
    <li><b>Sắp xếp theo CAN ID:</b> Khi <code>Can_Write()</code> trả về <code>CAN_BUSY</code>, CanIf chèn L-PDU vào <code>CanIfTxBuffer</code> theo thứ tự <b>CAN ID tăng dần</b> (ID nhỏ nhất = ưu tiên bus cao nhất đứng đầu hàng đợi).</li>
    <li><b>Ghi đè cùng TxPduId (SWS_CanIf_00068):</b> Nếu cùng một <code>TxPduId</code> được gọi <code>Transmit()</code> lần 2 khi bản cũ vẫn nằm trong <code>CanIfTxBuffer</code>, bản mới sẽ ghi đè dữ liệu vào chính slot đó thay vì chiếm 2 slot.</li>
    <li><b>Tự động xả trong TxConfirmation():</b> Ngay khi ngắt phần cứng <code>CanIf_TxConfirmation()</code> báo HTH vừa rảnh, CanIf nhấc ngay phần tử đầu hàng đợi (ID nhỏ nhất) gọi <code>Can_Write()</code> trước khi thoát ngắt!</li>
  </ul>
</div>"""
                },
                {
                    "title": "2.3 TriggerTransmit & DynamicTxId",
                    "html": f"""
<div class="hb-card">
  <h3>2.3 Kéo Dữ Liệu Tức Thời (TriggerTransmit) &amp; Đổi ID Động (SetDynamicTxId)</h3>
  {DIAGRAMS["trigger_dyn_id"]}
  <div class="hb-grid2">
    <div>
      <h4>CanIf_TriggerTransmit() (SWS_CanIf_00883)</h4>
      <p>Khi một TxPdu phải xếp hàng lâu hoặc đồng bộ chặt với chu kỳ bus (ví dụ mang <i>E2E Rolling Counter / CRC</i>), dữ liệu truyền ở bước <code>Transmit()</code> có thể bị cũ. Bật <code>CanIfTriggerTransmitSupport</code> cho phép <code>CanDrv</code> gọi callback kéo dữ liệu tươi mới từ <code>PduR/Com</code> vào đúng micro-giây cuối cùng trước khi phát.</p>
    </div>
    <div>
      <h4>CanIf_SetDynamicTxId() (SWS_CanIf_00189)</h4>
      <p>Rất phổ biến trong mạng xe tải <b>SAE J1939</b> (<code>J1939Nm</code> Address Claiming thay đổi Source Address 8-bit cuối của CAN ID 29-bit) hoặc chẩn đoán động <b>DoCAN</b>. CanIf giữ một mảng RAM lưu CAN ID hiện hành thay vì bảng hằng số Flash ROM.</p>
    </div>
  </div>
</div>"""
                },
                {
                    "title": "2.4 Vòng Đời TxConfirmation & Notification State",
                    "html": """
<div class="hb-card">
  <h3>2.4 CanIf_GetTxConfirmationState() &amp; Kiểm Soát Bus Hoạt Động</h3>
  <p>Trong bài toán đồng bộ tắt máy hoặc xác nhận kết nối bus (được <code>CanSM</code> hoặc <code>BswM</code> hỏi định kỳ), hàm <code>CanIf_GetTxConfirmationState(ControllerId)</code> trả về một trong hai giá trị:</p>
  <ul>
    <li><code>CANIF_NO_NOTIFICATION (0)</code>: Kể từ lần chuyển sang <code>CAN_CS_STARTED</code> hoặc sau lần <code>Bus-Off</code> / <code>STOPPED</code> gần nhất, chưa có khung Tx nào được xác nhận ACK thành công trên bus.</li>
    <li><code>CANIF_TX_RX_NOTIFICATION (1)</code>: Đã truyền thành công ít nhất 1 khung kể từ lần reset state gần nhất. Trạng thái này tự động xóa về 0 khi Controller rời khỏi <code>CAN_CS_STARTED</code> (<code>SWS_CanIf_00734</code>).</li>
  </ul>
</div>"""
                }
            ]
        },
        {
            "title": "3. Rx Filter, DLC Check & CAN-FD",
            "subs": [
                {
                    "title": "3.1 Software Acceptance Filter",
                    "html": f"""
<div class="hb-card">
  <h3>3.1 Thuật Toán Lọc Phần Mềm Cho BasicCAN HRH (CanIfPrivateSoftwareFilterType)</h3>
  <p>Khi <code>BasicCAN HRH</code> thu thập mọi khung tin lọt qua mặt nạ phần cứng, <code>CanIf_RxIndication()</code> phải nhanh chóng phân loại xem khung đó thuộc về <code>RxPduId</code> nào hoặc loại bỏ ngay để tiết kiệm tải CPU:</p>
  {DIAGRAMS["rx_filter_dlc"]}
  <table class="tbl">
    <tr><th>Thuật Toán</th><th>Độ Phức Tạp</th><th>Ứng Dụng Thực Tế</th></tr>
    <tr><td class="mono">BINARY_SEARCH</td><td>O(log N)</td><td>Khuyên dùng khi số RxPdu nhiều (20..200 ID); bảng cấu hình phải sắp theo thứ tự CAN ID.</td></tr>
    <tr><td class="mono">MASK</td><td>O(N) với Bitmask</td><td>Phép toán <code>(RxCanId &amp; Mask) == (CfgCanId &amp; Mask)</code> — cực mạnh cho dải ID <code>CanNm 0x500..0x5FF</code> (Mask <code>0x700</code>) hoặc J1939 PGN.</td></tr>
    <tr><td class="mono">INDEX / TABLE</td><td>O(1)</td><td>Tra mảng trực tiếp tốn RAM/Flash nhưng độ trễ thấp nhất.</td></tr>
    <tr><td class="mono">LINEAR</td><td>O(N)</td><td>Chỉ phù hợp ECU nhỏ dưới ~10 RxPdu trên BasicCAN.</td></tr>
  </table>
</div>"""
                },
                {
                    "title": "3.2 DLC Check & Lỗi Runtime 0x32",
                    "html": """
<div class="hb-card">
  <h3>3.2 Bảo Vệ Bộ Nhớ Với CanIfPrivateDlcCheck &amp; Runtime Error 0x32</h3>
  <p>Một trong những lỗi phổ biến và nguy hiểm nhất trên bus CAN là nhận được khung có <b>DLC thực tế ngắn hơn kỳ vọng</b> (do nhiễu hoặc giả mạo / ECU đối tác cấu hình sai). Nếu chuyển thẳng lên tầng <code>Com</code> hoặc <code>SecOC</code>, tác vụ giải mã sẽ đọc vượt ra ngoài buffer hợp lệ (<b>Out-of-Bounds Memory Read</b>).</p>
  <ul>
    <li><b>Điều kiện đạt:</b> <code>PduInfoPtr-&gt;SduLength &gt;= CanIfRxPduDataLength</code> (SWS_CanIf_00026). Lưu ý cho phép khung nhận DÀI HƠN hoặc bằng độ dài cấu hình, nhưng TUYỆT ĐỐI không chấp nhận NGẮN HƠN!</li>
    <li><b>Khi vi phạm:</b> CanIf dừng ngay chuỗi xử lý, báo Runtime Error <code>CANIF_E_INVALID_DATA_LENGTH (0x32)</code> (và bắn sự kiện an ninh sang <code>IdsM</code> nếu bật), không gọi callback tầng trên.</li>
  </ul>
</div>"""
                },
                {
                    "title": "3.3 CAN FD 64B, Bit Rate Switch & Truncation",
                    "html": """
<div class="hb-card">
  <h3>3.3 Tối Ưu CAN FD (64 Bytes + BRS) &amp; Cơ Chế Cắt Ngắn CanIfTxPduTruncation</h3>
  <div class="hb-grid2">
    <div>
      <h4>Đặc điểm CAN FD trong CanIf</h4>
      <ul>
        <li>Bit 30 của <code>Can_IdType</code> báo cho <code>CanDrv</code> biết chuyển sang định dạng khung FD (Payload tới 64 Bytes) và kích hoạt Bit Rate Switch (BRS — ví dụ Arbitration 500 kbps, Data phase 2 Mbps hoặc 5 Mbps).</li>
        <li>Trên bus CAN FD, các giá trị DLC từ 9..15 được ánh xạ phi tuyến thành <code>12, 16, 20, 24, 32, 48, 64</code> bytes.</li>
      </ul>
    </div>
    <div>
      <h4>Xử lý quá khổ: CANIF_E_TXPDU_LENGTH_EXCEEDED (0x33)</h4>
      <p>Nếu tầng trên gọi <code>CanIf_Transmit()</code> với độ dài SduLength lớn hơn <code>maxLen</code> (8B với CAN 2.0 hoặc 64B với FD):</p>
      <ul>
        <li>Luôn báo Runtime Error <code>0x33</code>.</li>
        <li>Nếu <code>CanIfTxPduTruncation = TRUE</code>: Tự động cắt bớt về <code>maxLen</code> và phát tiếp.</li>
        <li>Nếu <code>CanIfTxPduTruncation = FALSE</code>: Hủy bản tin và trả về <code>E_NOT_OK</code>!</li>
      </ul>
    </div>
  </div>
</div>"""
                },
                {
                    "title": "3.4 Dispatch Đa Tầng Trên & Polling ReadRxPduData",
                    "html": """
<div class="hb-card">
  <h3>3.4 Định Tuyến Callback Đa Tầng Trên vs Chế Độ Đọc Polling</h3>
  <p>Tùy từng <code>RxPduId</code>, mảng <code>CanIf_RxPduConfig[]</code> lưu con trỏ hàm đích tương ứng trong Link-Time/Post-Build:</p>
  <table class="tbl">
    <tr><th>Upper Layer</th><th>Callback Nhận</th><th>Callback Xác Nhận Phát</th></tr>
    <tr><td><b>PduR (COM / SecOC)</b></td><td class="mono">PduR_CanIfRxIndication()</td><td class="mono">PduR_CanIfTxConfirmation()</td></tr>
    <tr><td><b>CanTp (UDS ISO 15765-2)</b></td><td class="mono">CanTp_RxIndication()</td><td class="mono">CanTp_TxConfirmation()</td></tr>
    <tr><td><b>CanNm (Network Mgmt)</b></td><td class="mono">CanNm_RxIndication()</td><td class="mono">CanNm_TxConfirmation()</td></tr>
    <tr><td><b>CanTSyn (TimeSync)</b></td><td class="mono">CanTSyn_RxIndication()</td><td class="mono">CanTSyn_TxConfirmation()</td></tr>
  </table>
  <p style="margin-top:6px"><b>Polling Mode (<code>CanIfRxPduReadDataAndNotif</code>):</b> Dành cho một số Complex Device Driver (CDD) đọc theo chu kỳ thay vì ngắt: CanIf chép dữ liệu vào RAM nội bộ để CDD gọi <code>CanIf_ReadRxPduData()</code> &amp; <code>CanIf_ReadRxNotifStatus()</code>.</p>
</div>"""
                }
            ]
        },
        {
            "title": "4. Controller/PduMode, PN & Bus-Off",
            "subs": [
                {
                    "title": "4.1 Máy Trạng Thái ControllerMode (SWS_CanIf_00308)",
                    "html": f"""
<div class="hb-card">
  <h3>4.1 Điều Phối Can_ControllerStateType Giữa CanSM và CanDrv</h3>
  <p>CanIf giữ bản sao trạng thái Controller tại RAM và chỉ huy MCAL <code>Can_SetControllerMode()</code> tuân thủ nghiêm ngặt đồ thị chuyển trạng thái dưới đây:</p>
  {DIAGRAMS["ctrl_sm"]}
  <ul>
    <li><b>Quy tắc vàng:</b> KHÔNG BAO GIỜ được chuyển trực tiếp từ <code>CAN_CS_STARTED</code> sang <code>CAN_CS_SLEEP</code>! Phải đi qua trạm trung chuyển <code>CAN_CS_STOPPED</code> để hủy sạch hàng đợi <code>CanIfTxBuffer</code> và đưa bộ điều khiển về trạng thái an toàn trước khi ngủ.</li>
    <li>Mỗi lần hoàn tất chuyển đổi, <code>CanDrv</code> gọi ngược callback <code>CanIf_ControllerModeIndication()</code> để CanIf thông báo lên <code>CanSM</code>.</li>
  </ul>
</div>"""
                },
                {
                    "title": "4.2 Bốn Chế Độ PduMode & TX_OFFLINE_ACTIVE",
                    "html": f"""
<div class="hb-card">
  <h3>4.2 Giải Phẫu Cổng Logic CanIf_PduModeType &amp; ECU Passive Mode</h3>
  <p>Trong khi <code>ControllerMode</code> tắt/bật toàn bộ khối phần cứng ngoại vi CAN, <code>CanIf_PduModeType</code> là cổng khóa logic ở tầng phần mềm cho phép CanSM linh hoạt khóa riêng từng chiều Tx hoặc Rx:</p>
  {DIAGRAMS["pdu_mode_matrix"]}
  <p style="margin-top:6px"><b>Điểm đắt giá nhất — <code>CANIF_TX_OFFLINE_ACTIVE (0x02)</code> (SWS_CanIf_00072):</b> Dùng khi ECU đang chạy chế độ <i>Passive / Listen-Only Validation</i> hoặc không muốn phát xung lên bus nhưng vẫn giữ tầng ứng dụng <code>Com/PduR</code> hoạt động bình thường. Khi nhận lệnh <code>CanIf_Transmit()</code>, CanIf <b>bỏ qua <code>Can_Write()</code></b> và <b>tự bắn ngay callback ảo <code>&lt;User&gt;_TxConfirmation(E_OK)</code></b> lên tầng trên!</p>
</div>"""
                },
                {
                    "title": "4.3 Partial Networking (PN) Tx Filter",
                    "html": f"""
<div class="hb-card">
  <h3>4.3 Bộ Lọc Truyền Partial Networking &amp; TJA1145 Transceiver</h3>
  {DIAGRAMS["pn_and_busoff"]}
  <p>Với công nghệ Partial Networking, một ECU được đánh thức cục bộ không được phép làm ồn bus bằng bản tin ứng dụng cho đến khi cụm mạng PN xác nhận sẵn sàng:</p>
  <ul>
    <li>Khi <code>CanIfPnFilterEnabled = TRUE</code>, mọi lời gọi <code>CanIf_Transmit()</code> đều bị chặn với mã <code>E_NOT_OK</code> ngoại trừ các L-PDU đánh dấu <code>CanIfTxPduPnFilterPdu = TRUE</code> (thường là <code>CanNm</code> PDU).</li>
    <li>Sau khi hoàn tất bắt tay NM hoặc <code>CanTrcv</code> xác nhận cờ WUF hợp lệ, hàm <code>CanIf_ConfirmPnAvailability()</code> được gọi để gỡ bỏ bộ lọc PN trên Controller đó.</li>
  </ul>
</div>"""
                },
                {
                    "title": "4.4 Phản Ứng Khi Bus-Off (SWS_CanIf_00218)",
                    "html": """
<div class="hb-card">
  <h3>4.4 Quy Trình Xử Lý Ngắt CanIf_ControllerBusOff() &amp; Phối Hợp CanSM</h3>
  <p>Khi bộ đếm Transmit Error Counter (TEC) vượt quá 255 (do chập dây CAN_H/CAN_L hoặc nhiễu nặng), phần cứng tự động ngắt khỏi bus và kích hoạt ngắt <code>CanIf_ControllerBusOff(ControllerId)</code>:</p>
  <ol>
    <li><b>Cập nhật trạng thái:</b> CanIf đưa ngay <code>ControllerMode = CAN_CS_STOPPED</code> (khớp hành vi phần cứng M_CAN/FlexCAN tự vào Init/Stop mode).</li>
    <li><b>Khóa cổng phát:</b> Chuyển <code>PduMode = CANIF_TX_OFFLINE</code> nhằm chặn mọi yêu cầu phát mới từ Com/PduR trong thời gian hồi phục.</li>
    <li><b>Dọn sạch bộ đệm:</b> Xóa sạch toàn bộ L-PDU tồn đọng trong <code>CanIfTxBuffer</code> tránh việc khi phục hồi lại bus lại bắn ra hàng loạt tin cũ lỗi thời!</li>
    <li><b>Báo CanSM:</b> Reset <code>TxConfirmationState = CANIF_NO_NOTIFICATION</code> và gọi <code>CanSM_ControllerBusOff()</code> để CanSM chạy chiến lược hồi phục (BOR L1 Fast Recovery → L2 Slow Recovery).</li>
  </ol>
</div>"""
                }
            ]
        },
        {
            "title": "5. Wakeup Validation & CanTrcv",
            "subs": [
                {
                    "title": "5.1 Chu Trình Đánh Thức 2 Pha Chống Nhiễu",
                    "html": f"""
<div class="hb-card">
  <h3>5.1 Wakeup Validation: Phân Biệt Khung CAN Thật Với Nhiễu ESD (Glitch)</h3>
  <p>Nếu chỉ dựa vào một xung cạnh xuống trên chân CAN_RX để đánh thức toàn bộ hệ thống xe, ECU có thể bị bật sáng liên tục ban đêm bởi nhiễu điện từ trường gây sụt ắc quy. Do đó AUTOSAR thiết kế cơ chế xác thực 2 pha qua <code>CanIf</code> và <code>EcuM</code>:</p>
  {DIAGRAMS["wakeup_validation"]}
  <ul>
    <li><b>Pha 1 — <code>CanIf_CheckWakeup(WakeupSource)</code> (SWS_CanIf_00219):</b> Kiểm tra nguyên nhân đánh thức ở phần cứng Controller hoặc Transceiver. Nếu có cờ, gọi <code>EcuM_SetWakeupEvent()</code> nhưng <b>CHƯA xác nhận hợp lệ</b>.</li>
    <li><b>Pha 2 — <code>CanIf_CheckValidation(WakeupSource)</code> (SWS_CanIf_00178):</b> EcuM chỉ giữ ECU ở chế độ hoạt động nếu trong cửa sổ timeout đã thực sự nhận được ít nhất 1 khung <code>CanIf_RxIndication()</code> vượt qua bộ lọc + DLC Check! Có thể siết chặt hơn bằng <code>CanIfWakeupCheckValidByNM = TRUE</code> (chỉ tin khung từ <code>CanNm</code>).</li>
  </ul>
</div>"""
                },
                {
                    "title": "5.2 Điều Khiển CanTrcv & Cờ WUF",
                    "html": """
<div class="hb-card">
  <h3>5.2 Giao Tiếp Giữa CanIf Và CAN Transceiver (TJA1043 / TJA1145)</h3>
  <p>Trong xe hiện đại, ECU có thể dùng Transceiver thông minh giao tiếp SPI hỗ trợ Selective Wakeup:</p>
  <table class="tbl">
    <tr><th>API CanIf</th><th>Chuyển Xuống CanTrcv</th><th>Mục Đích Vận Hành</th></tr>
    <tr><td class="mono">CanIf_SetTrcvMode()</td><td class="mono">CanTrcv_SetOpMode()</td><td>Chuyển bộ thu phát qua <code>NORMAL</code>, <code>STANDBY</code> hoặc <code>SLEEP</code> (ngắt nguồn Vreg tiết kiệm uA).</td></tr>
    <tr><td class="mono">CanIf_GetTrcvMode()</td><td class="mono">CanTrcv_GetOpMode()</td><td>Đọc lại chế độ thực tế hiện tại của IC Transceiver.</td></tr>
    <tr><td class="mono">CanIf_ClearTrcvWufFlag()</td><td class="mono">CanTrcv_ClearTrcvWufFlag()</td><td>Xóa cờ Wake-Up Flag (WUF) trong thanh ghi Transceiver trước khi ECU tiến hành GoSleep lần kế tiếp.</td></tr>
    <tr><td class="mono">CanIf_CheckTrcvWakeFlag()</td><td class="mono">CanTrcv_CheckWakeFlag()</td><td>Kiểm tra lại cờ WUF sau khi cấu hình Partial Networking.</td></tr>
  </table>
</div>"""
                },
                {
                    "title": "5.3 Wakeup By NM vs Any Valid Frame",
                    "html": """
<div class="hb-card">
  <h3>5.3 Lựa Chọn CanIfWakeupCheckValidByNM Theo Chiến Lược OEM</h3>
  <div class="hb-grid2">
    <div>
      <h4>CanIfWakeupCheckValidByNM = FALSE</h4>
      <p>Bất kỳ RxPdu hợp lệ nào (Application COM Frame hoặc Diagnostic UDS Request 0x7E0) đến sau khi Controller vừa chuyển sang <code>CAN_CS_STARTED</code> đều đánh dấu cờ xác thực Wakeup hợp lệ.</p>
    </div>
    <div>
      <h4>CanIfWakeupCheckValidByNM = TRUE</h4>
      <p>Siết chặt kỷ luật: Chỉ những bản tin có <code>UpperLayer == CANNM</code> (hoặc <code>CanIfRxPduUserRxIndicationUL = CANNM</code>) mới được công nhận. Các khung ứng dụng lạc nhịp trước khi mạng khởi động sẽ không đánh lừa được <code>EcuM_ValidateWakeupEvent()</code>.</p>
    </div>
  </div>
</div>"""
                },
                {
                    "title": "5.4 Trạng Thái GoSleep & Phối Hợp Tắt Mạng",
                    "html": """
<div class="hb-card">
  <h3>5.4 Thứ Tự Đưa Hệ Thống CAN Về Ngủ An Toàn</h3>
  <ol>
    <li><code>ComM</code> hết yêu cầu → <code>CanNm</code> hết timer → <code>CanSM</code> bắt đầu chuỗi De-init truyền thông.</li>
    <li><code>CanSM</code> gọi <code>CanIf_SetPduMode(0, CANIF_OFFLINE)</code> khóa lưu lượng PDU.</li>
    <li><code>CanSM</code> gọi <code>CanIf_SetControllerMode(0, CAN_CS_STOPPED)</code> rồi tiếp tục <code>CAN_CS_SLEEP</code>.</li>
    <li><code>CanIf_ClearTrcvWufFlag(0)</code> xóa sạch cờ cũ, cuối cùng gọi <code>CanIf_SetTrcvMode(0, STANDBY/SLEEP)</code>.</li>
  </ol>
</div>"""
                }
            ]
        },
        {
            "title": "6. API R23-11, ECUC, DET & Thực Chiến",
            "subs": [
                {
                    "title": "6.1 Danh Mục API Chuẩn AUTOSAR R23-11",
                    "html": """
<div class="hb-card">
  <h3>6.1 Bảng Tra Cứu Nhanh Service ID &amp; API Chuẩn SWS_CanIf</h3>
  <table class="tbl">
    <tr><th>API Name (AUTOSAR R23-11)</th><th>SID</th><th>Ngữ Cảnh Gọi</th><th>Input ➔ Output</th></tr>
    <tr><td class="mono">CanIf_Init()</td><td class="mono">0x01</td><td>Startup Task (EcuM)</td><td>Post-Build Ptr ➔ Khởi tạo biến nội bộ &amp; Ctrl về STOPPED.</td></tr>
    <tr><td class="mono">CanIf_SetControllerMode()</td><td class="mono">0x03</td><td>CanSM State Machine</td><td>ControllerId, Mode ➔ <code>Can_SetControllerMode()</code>.</td></tr>
    <tr><td class="mono">CanIf_SetPduMode()</td><td class="mono">0x09</td><td>CanSM / BswM</td><td>ControllerId, PduModeReq ➔ Đóng/mở cổng Tx/Rx.</td></tr>
    <tr><td class="mono">CanIf_SetDynamicTxId()</td><td class="mono">0x0C</td><td>J1939Nm / CDD</td><td>TxPduId, NewCanId ➔ Cập nhật CAN ID động trong RAM.</td></tr>
    <tr><td class="mono">CanIf_CheckWakeup()</td><td class="mono">0x11</td><td>EcuM Wakeup Poll</td><td>WakeupSource ➔ Kiểm tra cờ HW WUF &amp; báo EcuM.</td></tr>
    <tr><td class="mono">CanIf_CheckValidation()</td><td class="mono">0x12</td><td>EcuM Validation</td><td>WakeupSource ➔ Kiểm tra đã thấy Rx hợp lệ chưa.</td></tr>
    <tr><td class="mono">CanIf_TxConfirmation()</td><td class="mono">0x13</td><td>CanDrv TX ISR</td><td>CanTxPduId ➔ Báo Upper Layer &amp; xả tiếp CanIfTxBuffer.</td></tr>
    <tr><td class="mono">CanIf_RxIndication()</td><td class="mono">0x14</td><td>CanDrv RX ISR</td><td>Mailbox, PduInfo ➔ SwFilter + DLC Check ➔ UL Callback.</td></tr>
    <tr><td class="mono">CanIf_ControllerBusOff()</td><td class="mono">0x16</td><td>CanDrv Err ISR</td><td>ControllerId ➔ STOPPED + TX_OFFLINE + ClearBuf ➔ CanSM.</td></tr>
    <tr><td class="mono">CanIf_SetBaudrate()</td><td class="mono">0x27</td><td>CanSM / ComM / BswM</td><td>ControllerId, BaudId ➔ Chuyển tiếp <code>Can_SetBaudrate()</code>.</td></tr>
    <tr><td class="mono">CanIf_TriggerTransmit()</td><td class="mono">0x41</td><td>CanDrv Tx Pre-load</td><td>TxPduId, PduInfoPtr ➔ Kéo payload tức thời từ PduR.</td></tr>
    <tr><td class="mono">CanIf_Transmit()</td><td class="mono">0x49</td><td>PduR / CanTp / CanNm</td><td>TxPduId, PduInfoPtr ➔ <code>Can_Write()</code> hoặc TxBuffer.</td></tr>
  </table>
</div>"""
                },
                {
                    "title": "6.2 Ma Trận Lỗi DET & Runtime Errors (Mod 60)",
                    "html": """
<div class="hb-card">
  <h3>6.2 Hàng Rào Bắt Lỗi Development Error (DET) &amp; Runtime Errors</h3>
  <table class="tbl">
    <tr><th>Mã Lỗi</th><th>Loại</th><th>Hex</th><th>Nguyên Nhân &amp; Cách Khắc Phục Nhanh</th></tr>
    <tr><td class="mono">CANIF_E_PARAM_CANID</td><td>DET</td><td class="mono">0x0A</td><td>Giá trị <code>CanId</code> vượt biên (Standard &gt; 0x7FF hoặc Extended &gt; 0x1FFFFFFF).</td></tr>
    <tr><td class="mono">CANIF_E_PARAM_CTRLMODE</td><td>DET</td><td class="mono">0x0D</td><td>Yêu cầu chuyển trạng thái Controller không hợp lệ (VD: STARTED ➔ SLEEP trực tiếp).</td></tr>
    <tr><td class="mono">CANIF_E_PARAM_CONTROLLERID</td><td>DET</td><td class="mono">0x0F</td><td>ControllerId truyền vào lớn hơn hoặc bằng số controller cấu hình.</td></tr>
    <tr><td class="mono">CANIF_E_UNINIT</td><td>DET</td><td class="mono">0x1E</td><td>Gọi API trước khi hoàn tất <code>CanIf_Init()</code>.</td></tr>
    <tr><td class="mono">CANIF_E_INVALID_TXPDUID</td><td>DET</td><td class="mono">0x32</td><td>TxPduId ngoài bảng <code>CanIfTxPduCfg</code>. Kiểm tra lại file ghép nối PduR ↔ CanIf ARXML!</td></tr>
    <tr><td class="mono">CANIF_E_INVALID_DATA_LENGTH</td><td>Runtime</td><td class="mono">0x32</td><td>Rx DLC thực tế ngắn hơn <code>CanIfRxPduDataLength</code> cấu hình. Khung bị hủy bảo vệ bộ nhớ.</td></tr>
    <tr><td class="mono">CANIF_E_TXPDU_LENGTH_EXCEEDED</td><td>Runtime</td><td class="mono">0x33</td><td>Tx SduLength vượt 8B (CAN 2.0) hoặc 64B (CAN FD). Kiểm tra <code>CanIfTxPduTruncation</code>.</td></tr>
  </table>
</div>"""
                },
                {
                    "title": "6.3 Checklist Debug CanIf Thực Chiến Trên Bench",
                    "html": """
<div class="hb-card">
  <h3>6.3 6 Lỗi Thực Chiến Hay Gặp Nhất Khi Tích Hợp CanIf Stack</h3>
  <ol>
    <li><b>Gọi CanIf_Transmit() trả về E_OK nhưng không thấy frame lên Bus:</b> Kiểm tra ngay xem <code>PduMode</code> có đang ở <code>CANIF_TX_OFFLINE_ACTIVE</code> (bắn TxConfirm ảo!) hoặc bản tin bị giữ trong <code>CanIfTxBuffer</code> do HTH kẹt BUSY.</li>
    <li><b>Bus có sóng CAN nhưng PduR không nhận được:</b> Kiểm tra lần lượt: (a) <code>ControllerMode == CAN_CS_STARTED</code>? (b) <code>PduMode != CANIF_OFFLINE</code>? (c) Mask của BasicCAN HRH có khớp ID chưa? (d) Có bị rớt tại <code>DLC Check 0x32</code> vì sender gửi 7 byte trong khi Min DLC đặt 8 byte?</li>
    <li><b>Lệch Extended vs Standard CAN ID:</b> Nhớ cộng <code>0x80000000</code> (Bit 31) và <code>0x40000000</code> (Bit 30 FD) khi kiểm tra bảng cấu hình ARXML ➔ C.</li>
    <li><b>Mất tin ưu tiên thấp hoặc kẹt CAN_BUSY:</b> Tăng <code>CanIfTxBufferSize</code> hoặc tách các khung tần suất cao sang FullCAN HTH riêng.</li>
    <li><b>ECU tự động thức dậy liên tục rồi ngủ lại:</b> Bật <code>CanIfPublicWakeupCheckValidSupport</code> và xem nhật ký có Rx hợp lệ nào đến trước khi hết timer EcuM không.</li>
    <li><b>Xử lý Bus-Off làm treo Com:</b> Phải đảm bảo <code>CanSM</code> lắng nghe được <code>CanIf_ControllerBusOff()</code> và gọi lại đúng trình tự <code>STOPPED ➔ STARTED ➔ ONLINE</code>.</li>
  </ol>
</div>"""
                },
                {
                    "title": "6.4 Hướng Dẫn Xuất ARXML / Cfg.h / Lcfg.c Sang DaVinci / Tresos",
                    "html": """
<div class="hb-card">
  <h3>6.4 Áp Dụng Kết Quả Simulator Vào Công Cụ Cấu Hình Thực Tế</h3>
  <ul>
    <li>Sau khi tinh chỉnh 36 tham số ECUC ở bảng bên trái (như <code>CanIfPublicTxBuffering</code>, <code>CanIfPrivateSoftwareFilterType</code>, <code>CanIfPrivateDlcCheck</code>, <code>CanIfTxPduTruncation</code>...), hãy bấm nút <b>📦 Xuất ARXML / Cfg / C</b> trên thanh header.</li>
    <li>Tab <b>CanIf.arxml</b> xuất đúng phân cấp container <code>/AUTOSAR/EcucDefs/CanIf/CanIfPublicCfg</code> &amp; <code>CanIfPrivateCfg</code> tương thích Vector DaVinci Configurator &amp; EB Tresos.</li>
    <li>Tab <b>CanIf_Cfg.h</b> &amp; <b>CanIf_Lcfg.c</b> cung cấp mã C trực tiếp để đối chiếu macro biên dịch và bảng định tuyến callback từng PDU.</li>
  </ul>
</div>"""
                }
            ]
        }
    ]


def main():
    diagrams = build_diagrams()
    tabs = build_handbook_data(diagrams)
    tabs_json = json.dumps(tabs, ensure_ascii=False, indent=2)

    js_tail = r"""
let hbState = {
  tab1: 0,
  subTab: [0, 0, 0, 0, 0, 0],
  abbrCat: "ALL"
};

function switchHbTab1(idx) {
  hbState.tab1 = idx;
  for (let i = 0; i < 7; i++) {
    const b = document.getElementById("hbTab1_" + i);
    if (b) b.classList.toggle("active", i === idx);
  }
  renderCurrentHandbookView();
}

function switchHbSubTab(subIdx) {
  hbState.subTab[hbState.tab1] = subIdx;
  renderCurrentHandbookView();
}

function setAbbrCategory(cat) {
  hbState.abbrCat = cat || "ALL";
  const allCats = ["ALL", "CORE", "TX", "RX", "MODE", "API"];
  allCats.forEach(c => {
    const el = document.getElementById("catPill_" + c);
    if (el) el.classList.toggle("active", c === hbState.abbrCat);
  });
  filterAbbreviationTable();
}

function highlightMatch(text, query) {
  const safeText = escHtml(text);
  const q = (query || "").trim();
  if (!q) return safeText;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp("(" + escaped + ")", "ig");
  return safeText.replace(re, "<mark>$1</mark>");
}

function renderAbbreviationTable(query) {
  const q = (query || "").trim().toLowerCase();
  const cat = hbState.abbrCat;
  const filtered = ABBREVIATIONS.filter(item => {
    if (cat !== "ALL" && item.cat !== cat) return false;
    if (!q) return true;
    const hay = (item.abbr + " " + item.full + " " + item.meaning + " " + item.cat).toLowerCase();
    return hay.indexOf(q) >= 0;
  });

  const badge = document.getElementById("abbrCountBadge");
  if (badge) badge.textContent = filtered.length + " / " + ABBREVIATIONS.length + " thuật ngữ";

  const area = document.getElementById("hbContentArea");
  if (!area) return;
  if (!filtered.length) {
    area.innerHTML = "<div class='hb-card'><p>Không tìm thấy thuật ngữ nào khớp từ khóa <b>" + escHtml(query) + "</b>. Hãy thử tìm: <code>HOH</code>, <code>BasicCAN</code>, <code>TxBuffer</code>, <code>0x32</code>, <code>WUF</code>...</p></div>";
    return;
  }

  const catLabels = { CORE: "CanIf Core", TX: "Tx & Buffer", RX: "Rx & CAN-FD", MODE: "Mode & Wakeup", API: "API & DET" };
  const rows = filtered.map(item =>
    "<tr>" +
    "  <td class='mono' style='font-weight:800;color:var(--pri);white-space:nowrap'>" + highlightMatch(item.abbr, query) + "</td>" +
    "  <td style='font-weight:700'>" + highlightMatch(item.full, query) + "</td>" +
    "  <td><span class='pill pill-cyan'>" + escHtml(catLabels[item.cat] || item.cat) + "</span></td>" +
    "  <td>" + highlightMatch(item.meaning, query) + "</td>" +
    "</tr>"
  ).join("");

  area.innerHTML =
    "<div class='hb-card'>" +
    "  <h3>7. Bảng Thuật Ngữ &amp; Viết Tắt AUTOSAR CanIf (" + filtered.length + " mục)</h3>" +
    "  <table class='tbl'>" +
    "    <thead><tr><th>Thuật Ngữ</th><th>Tên Đầy Đủ Tiếng Anh</th><th>Phân Nhóm</th><th>Giải Nghĩa &amp; Vai Trò Trong CanIf</th></tr></thead>" +
    "    <tbody>" + rows + "</tbody>" +
    "  </table>" +
    "</div>";
}

function filterAbbreviationTable() {
  const inp = document.getElementById("abbrSearchInput");
  renderAbbreviationTable(inp ? inp.value : "");
}

function renderCurrentHandbookView() {
  const nav2 = document.getElementById("hbNav2");
  const filterBox = document.getElementById("hbAbbrFilterBox");
  const area = document.getElementById("hbContentArea");

  if (hbState.tab1 === 6) {
    if (nav2) nav2.classList.add("hidden");
    if (filterBox) filterBox.classList.remove("hidden");
    filterAbbreviationTable();
    return;
  }

  if (filterBox) filterBox.classList.add("hidden");
  const tabData = HANDBOOK_TABS[hbState.tab1] || HANDBOOK_TABS[0];
  const activeSubIdx = hbState.subTab[hbState.tab1] || 0;

  if (nav2) {
    nav2.classList.remove("hidden");
    nav2.innerHTML = tabData.subs.map((s, idx) =>
      "<button class='hb-tab2 " + (idx === activeSubIdx ? "active" : "") + "' onclick='switchHbSubTab(" + idx + ")'>" + escHtml(s.title) + "</button>"
    ).join("");
  }

  if (area) {
    const subObj = tabData.subs[activeSubIdx] || tabData.subs[0];
    area.innerHTML = subObj.html;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initTooltipHandlers();
  switchCfgTab(0);
  onFaultKindChange();
  loadScenario("S1");
  renderCurrentHandbookView();
});
"""

    out_path = os.path.join(SCRIPT_DIR, "part6_handbook.js")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("// ================= PART 6: MULTI-LEVEL HANDBOOK (6x4), ABBREVIATION SEARCH & BOOTSTRAP =================\n\n")
        f.write("const HANDBOOK_TABS = " + tabs_json + ";\n")
        f.write(js_tail)
    print(f"Generated {out_path} cleanly ({len(tabs)} main tabs x 4 sub-tabs = {sum(len(t['subs']) for t in tabs)} topics).")


if __name__ == "__main__":
    main()
