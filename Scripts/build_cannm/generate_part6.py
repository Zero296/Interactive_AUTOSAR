# -*- coding: utf-8 -*-
"""
Script to generate the updated part6_handbook.js for AUTOSAR CanNM Simulator.
Includes:
- Requirement 1: Repeat Message mechanics, why entry here is mandatory, burst mode timeline and reasons.
- Requirement 2: Matrix of impact when ECU2 sends NM PDU on current state of ECU1.
- Requirement 3: Models/Diagrams/Graphs/Tables across all 26 subtopics (replacing text-only sections).
"""

import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hb_diagrams import get_diagram

def build_part6():
    output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "part6_handbook.js")

    js_code = """/*************************************************************************
 * PART 6: MULTI-LEVEL HANDBOOK & ABBREVIATION TABLE + LIVE SEARCH
 * Standard: AUTOSAR Classic R22-11 / R23-11 (SWS_CanNm, SWS_Nm, SWS_ComM)
 * Visual Layout: Models, Diagrams, Graphs, Flowcharts & Tables + Deep Analysis
 *************************************************************************/

let activeHbTab1 = 0;
let activeHbSubTab = 0;
let activeAbbrCategory = "ALL";

// 1. HANDBOOK TOPICS DATABASE (6 MAIN TABS x MULTI SUBTOPICS + TAB 7 ABBREVIATION)
const HANDBOOK_DATA = [
  // =========================================================================
  // TAB 1: KIẾN TRÚC & HỆ SINH THÁI
  // =========================================================================
  {
    title: "1. Kiến Trúc CanNM & Tương Tác Hệ Sinh Thái",
    subtopics: [
      {
        title: "1.1. Nguyên Lý Quản Lý Mạng Phân Tán (Decentralized Direct NM)",
        content: `
          <h2>1.1. Nguyên Lý Quản Lý Mạng Phân Tán (Decentralized Direct NM)</h2>
          <p>Trong các hệ thống mạng ô tô hiện đại, <b>AUTOSAR CanNM</b> áp dụng cơ chế <b>Quản lý mạng phân tán trực tiếp (Decentralized Direct Network Management)</b> thay vì kiến trúc Master-Slave truyền thống.</p>

          <div style="margin:12px 0; background:var(--code); border:1px solid var(--border); border-radius:8px; padding:12px">
            <div class="mono small" style="font-weight:700; color:#38bdf8; margin-bottom:8px">🏛️ SƠ ĐỒ ĐỐI CHIẾU MÔ HÌNH: TẬP TRUNG (MASTER-SLAVE) VS PHÂN TÁN (AUTOSAR CANNM)</div>
            <pre class="code" style="margin:0; font-size:11px; line-height:1.45">
[MÔ HÌNH MASTER-SLAVE TRUYỀN THỐNG]               [MÔ HÌNH PHÂN TÁN TRỰC TIẾP (AUTOSAR CANNM)]
      ┌─────────────┐                                ┌─────────┐      ┌─────────┐      ┌─────────┐
      │ Master Node │ (Single Point of Failure)      │ ECU #1  │◄────►│ ECU #2  │◄────►│ ECU #3  │
      └──────┬──────┘                                └────┬────┘      └────┬────┘      └────┬────┘
     Polling │ Heartbeat                                  │                │                │
  ┌──────────┼──────────┐                            ═════╧════════════════╧════════════════╧═════
  ▼          ▼          ▼                                          CAN BUS (Peer-to-Peer)
┌────┐     ┌────┐     ┌────┐                         • Không có Master: Quyền lực phân tán bình đẳng
│Node│     │Node│     │Node│                         • Nhận NM PDU = Mạng có nhu cầu thức
└────┘     └────┘     └────┘                         • Đồng thuận 100% không ai phát thì mới ngủ
            </pre>
          </div>

          <table class="tbl">
            <thead>
              <tr>
                <th style="width:160px">Tiêu Chí Đối Chiếu</th>
                <th style="width:280px">Mô Hình Tập Trung (Master-Slave)</th>
                <th>Mô Hình Phân Tán Trực Tiếp (AUTOSAR CanNM)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><b>Quyền lực điều khiển mạng</b></td>
                <td>Chỉ 1 nút Master duy nhất ra lệnh bật/tắt toàn bộ mạng.</td>
                <td><b>Bình đẳng tuyệt đối (Peer-to-Peer):</b> Mọi ECU trên bus đều có quyền giữ mạng thức hoặc đồng ý đi ngủ.</td>
              </tr>
              <tr>
                <td><b>Điểm nghẽn lỗi (Single Point of Failure)</b></td>
                <td>Rất nguy hiểm: Nếu Master hỏng hoặc mất nguồn, toàn bộ node khác bị tê liệt hoặc không thể ngủ.</td>
                <td><b>Chống chịu lỗi cao:</b> Bất kỳ ECU nào chết hoặc ngắt kết nối thì các ECU còn lại vẫn tự điều phối chu trình ngủ/thức bình thường.</td>
              </tr>
              <tr>
                <td><b>Cơ chế báo hiệu giữ mạng</b></td>
                <td>Master gửi lệnh Polling / Heartbeat định kỳ.</td>
                <td><b>Bản tin NM PDU mang tín hiệu giữ mạng:</b> Hễ có bất kỳ ECU nào phát bản tin NM PDU thì đồng hồ sinh tử <code>CanNmTimeoutTime</code> của tất cả các node đều được nạp lại đầy.</td>
              </tr>
              <tr>
                <td><b>Nguyên tắc đồng thuận trước khi ngủ</b></td>
                <td>Master phát lệnh cưỡng bức ngủ (Go to Sleep).</td>
                <td><b>Đồng thuận 100%:</b> Toàn bộ mạng chỉ được phép ngủ khi <b>TẤT CẢ các ECU đều đã nhả mạng (Ready Sleep)</b> và bus hoàn toàn yên ắng suốt thời gian quy định.</td>
              </tr>
            </tbody>
          </table>

          <div style="margin-top:14px; background:var(--panel2); border-left:4px solid #38bdf8; border-radius:0 8px 8px 0; padding:10px 14px">
            <div class="mono" style="font-weight:700; color:#38bdf8; margin-bottom:4px">📌 3 NGUYÊN TẮC VÀNG CỦA AUTOSAR CANNM:</div>
            <table class="tbl">
              <tr><td style="width:140px"><b>Nguyên tắc 1: Cần là Thức</b></td><td>Bất kỳ ECU nào có nhu cầu truyền thông ứng dụng thì tự động nhảy vào Network Mode và phát bản tin NM PDU.</td></tr>
              <tr><td><b>Nguyên tắc 2: Hết việc thì Chờ</b></td><td>ECU hoàn tất nhiệm vụ thì chuyển sang Ready Sleep State và <b>ngưng phát bản tin</b>, kiên nhẫn đứng nghe ngóng bus.</td></tr>
              <tr><td><b>Nguyên tắc 3: Cùng ngủ Đồng loạt</b></td><td>Chỉ khi không còn ai phát bản tin suốt <code>CanNmTimeoutTime + CanNmWaitBusSleepTime</code> thì các ECU mới đồng loạt tắt phần cứng.</td></tr>
            </table>
          </div>
        `
      },
      {
        title: "1.2. Chuỗi Tương Tác SWC ↔ RTE ↔ ComM ↔ Nm ↔ CanNm ↔ CanSM",
        content: `
          <h2>1.2. Chuỗi Tương Tác SWC ↔ RTE ↔ ComM ↔ Nm ↔ CanNm ↔ CanSM</h2>
          <p>Luồng thực thi lệnh và truyền tín hiệu điều phối mạng được thiết kế phân tầng nghiêm ngặt trong AUTOSAR Classic:</p>

          <div style="margin:12px 0; background:var(--code); border:1px solid var(--border); border-radius:8px; padding:12px">
            <div class="mono small" style="font-weight:700; color:#fbbf24; margin-bottom:8px">🧩 SƠ ĐỒ LUỒNG PHÂN CẤP TƯƠNG TÁC (LAYERED CALL FLOW):</div>
            <pre class="code" style="margin:0; font-size:11px; line-height:1.45">
[SWC App / PncUser] ──(RequestComMode: FULL_COM)──► [RTE / ComM]
                                                         │
                        ┌────────────────────────────────┴────────────────────────────────┐
                        ▼ (Bật phần cứng Controller/Trcv)                                ▼ (Đồng bộ chu trình mạng)
                   [CanSM Core]                                                      [Nm Interface]
                        │                                                                 │
                   [CanIf Driver] ◄──────(CanIf_Transmit: Khung NM PDU 8-byte)───────── [CanNM Core]
                        │                                                                 │
                 [CAN Bus Vật Lý] ◄═════════(Đường truyền vi sai CAN_H / CAN_L)═════════════╝
            </pre>
          </div>

          <table class="tbl">
            <thead>
              <tr>
                <th style="width:70px">Thứ Tự</th>
                <th style="width:120px">Tầng BSW</th>
                <th style="width:230px">Hàm API Chuẩn Được Gọi</th>
                <th style="width:130px">Chiều Hướng</th>
                <th>Mục Đích &amp; Hành Vi Kỹ Thuật Chi Tiết</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><b>Bước 1</b></td>
                <td>Application (SWC)</td>
                <td><code>Rte_Call_RequestComMode()</code></td>
                <td>SWC ➔ ComM</td>
                <td>Ứng dụng yêu cầu chế độ mạng <code>COMM_FULL_COMMUNICATION</code>. SWC không bao giờ gọi trực tiếp CanNM.</td>
              </tr>
              <tr>
                <td><b>Bước 2</b></td>
                <td>ComM</td>
                <td><code>CanSM_RequestComMode()</code></td>
                <td>ComM ➔ CanSM</td>
                <td>ComM ra lệnh cho CanSM bật Controller CAN (<code>CAN_CS_STARTED</code>) và Transceiver (<code>NORMAL</code>).</td>
              </tr>
              <tr>
                <td><b>Bước 3</b></td>
                <td>ComM ➔ Nm</td>
                <td><code>Nm_NetworkRequest()</code></td>
                <td>ComM ➔ Nm ➔ CanNm</td>
                <td>ComM gọi Nm Interface chuyển tiếp <code>CanNm_NetworkRequest()</code> xuống kênh mạng tương ứng.</td>
              </tr>
              <tr>
                <td><b>Bước 4</b></td>
                <td>CanNM Engine</td>
                <td><code>CanIf_Transmit()</code></td>
                <td>CanNm ➔ CanIf ➔ Bus</td>
                <td>CanNM vào Repeat Message State, bật <b>Bit 4 (AWB=1)</b> trong CBV và bắn chùm <code>Immediate Burst Tx</code>.</td>
              </tr>
              <tr>
                <td><b>Bước 5</b></td>
                <td>CanNM ➔ Nm ➔ ComM</td>
                <td><code>Nm_BusSleepMode()</code></td>
                <td>CanNm ➔ ComM ➔ CanSM</td>
                <td>Khi hết chu trình ngủ, CanNM báo <code>Nm_BusSleepMode()</code>; ComM mới ra lệnh cho CanSM tắt phần cứng về <code>NO_COM</code>.</td>
              </tr>
            </tbody>
          </table>
        `
      },
      {
        title: "1.3. Bảng Phân Tích I/O Chi Tiết 10 Module Liên Quan",
        content: `
          <h2>1.3. Bảng Phân Tích I/O Chi Tiết 10 Module Liên Quan</h2>
          <p>Mọi khối chức năng trong hệ sinh thái AUTOSAR CanNM đều có giao diện đầu vào/đầu ra và trách nhiệm xác định:</p>

          <div style="margin:12px 0; background:var(--code); border:1px solid var(--border); border-radius:8px; padding:12px">
            <div class="mono small" style="font-weight:700; color:#a78bfa; margin-bottom:8px">🗺️ SƠ ĐỒ ĐIỀU PHỐI DỮ LIỆU LIÊN MODULE (BSW SIGNAL ROUTING MATRIX)</div>
            <pre class="code" style="margin:0; font-size:11px; line-height:1.45">
[SWC Ứng Dụng] ────────(Yêu cầu chế độ mạng)────────► [ComM] ───────(Mode Req)────────► [CanSM]
      ▲                                                  │                                  │ (Bật HW)
      │ (Trạng thái)                                     ▼ (Network Req)                    ▼
[BswM / EcuM] ◄──────(State Change Callbacks)────── [Nm Interface] ◄─────────────────── [CanIf]
      ▲                                                  │                                  ▲
      │ (Báo lỗi DET)                                    ▼ (API Calls & Callbacks)          │ (Tx / Rx)
  [Det Log] ◄────────(CANNM_E_*)──────────────────── [CanNM Engine] ────────────────────────┘
            </pre>
          </div>

          <table class="tbl">
            <thead>
              <tr>
                <th style="width:110px">Module</th>
                <th style="width:90px">Lớp BSW</th>
                <th style="width:180px">Input Lấy Từ Đâu?</th>
                <th style="width:230px">Xử Lý Nội Bộ (Processing &amp; Timers)</th>
                <th>Output Route Đến Đâu &amp; API Chuẩn</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><b>SWC_App</b></td>
                <td>Application</td>
                <td>Sự kiện RTE, người lái xe, cảm biến</td>
                <td>Tạo yêu cầu truyền thông, cập nhật User Data</td>
                <td>Gọi ComM: <code>Rte_Call_RequestComMode()</code></td>
              </tr>
              <tr>
                <td><b>RTE / SchM</b></td>
                <td>RTE Layer</td>
                <td>OS Alarm nhịp 100ms</td>
                <td>Bảo vệ vùng găng <code>EA_0</code>, giảm các Timer</td>
                <td>Gọi CanNM: <code>CanNm_MainFunction()</code></td>
              </tr>
              <tr>
                <td><b>ComM</b></td>
                <td>Services</td>
                <td>SWC Users &amp; Dcm chẩn đoán</td>
                <td>Phân xử nhu cầu mạng, điều phối CanSM và Nm</td>
                <td>Gọi Nm: <code>Nm_NetworkRequest()</code>, CanSM: <code>CanSM_RequestComMode()</code></td>
              </tr>
              <tr>
                <td><b>BswM</b></td>
                <td>Services</td>
                <td>Nm &amp; CanSM state callbacks</td>
                <td>Đánh giá Mode Rules để bật/tắt I-PDU Group</td>
                <td>Gọi BswM Actions: điều khiển PduR routing</td>
              </tr>
              <tr>
                <td><b>EcuM</b></td>
                <td>System</td>
                <td>Wakeup Interrupt (CAN, KL15, Pin)</td>
                <td>Wakeup Validation, khởi tạo BSW Driver</td>
                <td>Khởi động ComM, CanSM và phần cứng CAN</td>
              </tr>
              <tr>
                <td><b>Nm</b></td>
                <td>Services</td>
                <td>ComM requests, CanNM callbacks</td>
                <td>Bộ định tuyến trung gian trừu tượng hóa bus CAN/FR/ETH</td>
                <td>Route 1-1 xuống <code>CanNm_*</code> tương ứng</td>
              </tr>
              <tr>
                <td><b>CanNM</b></td>
                <td>Services</td>
                <td>Nm calls, CanIf Rx, SchM Ticks</td>
                <td>Máy trạng thái 3 Mode, 5 Timer, PDU Packing, PN filter</td>
                <td>Bắn Tx qua CanIf; Báo callback lên Nm</td>
              </tr>
              <tr>
                <td><b>CanSM</b></td>
                <td>Services</td>
                <td>ComM Mode Requests</td>
                <td>Quản lý trạng thái State Manager phần cứng CAN</td>
                <td>Bật/Tắt Controller (<code>CanIf_SetControllerMode</code>)</td>
              </tr>
              <tr>
                <td><b>CanIf</b></td>
                <td>ECU Abstraction</td>
                <td>CanDrv driver, CanNM Transmit</td>
                <td>Kiểm tra PDU-ID, lọc Hardware Acceptance Filter</td>
                <td>Gọi <code>CanNm_RxIndication()</code> / <code>CanNm_TxConfirmation()</code></td>
              </tr>
              <tr>
                <td><b>PduR / COM</b></td>
                <td>Services</td>
                <td>COM Signals, CanNM User Data</td>
                <td>Đóng gói tín hiệu ứng dụng vào User Data của NM PDU</td>
                <td>Route User Data qua <code>CanNm_Transmit()</code></td>
              </tr>
            </tbody>
          </table>
        `
      },
      {
        title: "1.4. Phân Biệt Vai Trò Của ComM vs CanSM vs CanNm",
        content: `
          <h2>1.4. Phân Biệt Vai Trò Của ComM vs CanSM vs CanNm</h2>
          <p>Nhiều kỹ sư thường nhầm lẫn vai trò của 3 module này. Trong AUTOSAR, quyền lực quản lý mạng được phân chia như "Tam Quyền Phân Lập":</p>

          <div style="margin:12px 0; background:var(--code); border:1px solid var(--border); border-radius:8px; padding:12px">
            <div class="mono small" style="font-weight:700; color:#34d399; margin-bottom:8px">⚖️ TAM GIÁC PHÂN QUYỀN TRUYỀN THÔNG (COMMUNICATION MANAGEMENT TRIAD)</div>
            <pre class="code" style="margin:0; font-size:11px; line-height:1.45">
                           ┌────────────────────────┐
                           │      ComM (Policy)     │  QUYỀN LẬP PHÁP: Ra quyết định chính sách
                           │  Communication Manager │  ECU được phép thức hay ngủ
                           └───────────┬────────────┘
                                       │
                      ┌────────────────┴────────────────┐
                      ▼                                 ▼
      ┌────────────────────────┐       ┌────────────────────────┐
      │   CanSM (Hardware SM)  │       │     CanNM (Network)    │
      │   CAN State Manager    │       │     CAN Network Mgmt   │
      │  QUYỀN HÀNH PHÁP PHẦN CỨNG     │  QUYỀN ĐIỀU PHỐI GIAO THỨC BUS
      │  Bật/Tắt Transceiver,          │  Thuật toán máy trạng thái phân tán,
      │  Controller, xử lý Bus-Off     │  bắn PDU, đếm timer giữ mạng
      └────────────────────────┘       └────────────────────────┘
            </pre>
          </div>

          <table class="tbl">
            <thead>
              <tr>
                <th style="width:160px">Tiêu Chí So Sánh</th>
                <th style="width:230px">ComM (Communication Manager)</th>
                <th style="width:230px">CanSM (CAN State Manager)</th>
                <th>CanNm (CAN Network Management)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><b>Bản chất cốt lõi</b></td>
                <td>Nhà lập pháp &amp; Phân xử chính sách người dùng (Resource Manager).</td>
                <td>Quản đốc phần cứng CAN Controller &amp; Transceiver.</td>
                <td>Giao thức thuật toán mạng phân tán phân chia thời gian.</td>
              </tr>
              <tr>
                <td><b>Quyền lực cao nhất</b></td>
                <td>Quyết định <b>KHI NÀO</b> ECU được thức hoặc phải ngủ.</td>
                <td>Quyết định <b>CÁCH BẬT/TẮT</b> chip phần cứng CAN.</td>
                <td>Quyết định <b>NỘI DUNG &amp; CHU KỲ BẮN BẢN TIN</b> giữ mạng.</td>
              </tr>
              <tr>
                <td><b>Biết về CAN Bus?</b></td>
                <td><b>KHÔNG:</b> ComM hoàn toàn độc lập bus (hỗ trợ cả LIN, FlexRay, ETH).</td>
                <td><b>CÓ:</b> Chuyên trách về CAN Controller, CAN Transceiver, Bus-Off.</td>
                <td><b>CÓ:</b> Chuyên trách về cấu trúc bản tin NM PDU CAN 8-byte.</td>
              </tr>
              <tr>
                <td><b>Trạng thái quản lý</b></td>
                <td><code>NO_COM</code>, <code>SILENT_COM</code>, <code>FULL_COM</code>.</td>
                <td><code>NO_COMMUNICATION</code>, <code>SILENT_COMMUNICATION</code>, <code>FULL_COMMUNICATION</code>.</td>
                <td><code>Bus-Sleep</code>, <code>Prepare Bus-Sleep</code>, <code>Network Mode</code> (RMS, NOS, RSS).</td>
              </tr>
            </tbody>
          </table>
        `
      }
    ]
  },

  // =========================================================================
  // TAB 2: MÁY TRẠNG THÁI CANNM
  // =========================================================================
  {
    title: "2. Máy Trạng Thái CanNM (Operational Modes & Core States)",
    subtopics: [
      {
        title: "2.1. Tổng Quan 3 Chế Độ Lớn & Sơ Đồ Cấu Trúc Máy Trạng Thái",
        content: `
          <h2>2.1. Tổng Quan 3 Chế Độ Vận Hành Chính Của CanNM</h2>
          <p>Máy trạng thái CanNM được phân cấp thành 3 chế độ vận hành (Operational Modes) với các đặc tính kỹ thuật riêng biệt:</p>

          <div style="margin:12px 0; background:var(--code); border:1px solid var(--border); border-radius:8px; padding:12px">
            <div class="mono small" style="font-weight:700; color:#38bdf8; margin-bottom:8px">🔄 SƠ ĐỒ PHÂN CẤP 3 CHẾ ĐỘ VẬN HÀNH CHÍNH (3-TIER OPERATIONAL MODES)</div>
            <pre class="code" style="margin:0; font-size:11px; line-height:1.45">
         ┌────────────────────────────────────────────────────────────────────────┐
         │                          NETWORK MODE (NM)                             │
         │  ┌───────────────────────┐  NetReq==1  ┌────────────────────────────┐  │
         │  │ Repeat Message (RMS)  ├────────────►│  Normal Operation (NOS)    │  │
         │  │ (Bắt buộc vào đầu!)   │             │  (Phát định kỳ MsgCycle)   │  │
         │  └───────────┬───────────┘             └─────────────┬──────────────┘  │
         │              │ NetReq==0                             │ NetRelease      │
         │              ▼                                       ▼                 │
         │  ┌──────────────────────────────────────────────────────────────────┐  │
         │  │                      Ready Sleep State (RSS)                     │  │
         │  │              (Dừng phát Tx, chỉ lắng nghe đếm Timeout)           │  │
         │  └───────────────────────────────────┬──────────────────────────────┘  │
         └──────────────────────────────────────┼─────────────────────────────────┘
             ▲                                  │ CanNmTimeoutTime hết hạn (0ms)
             │ Wakeup / NetReq                  ▼
         ┌───┴────────────────────────────────────────────────────────────────────┐
         │                    PREPARE BUS-SLEEP MODE (PBSM)                       │
         │            (Chạy đệm WaitBusSleepTimer 1500ms, HW còn mở)              │
         └──────────────────────────────────────┬─────────────────────────────────┘
             ▲                                  │ CanNmWaitBusSleepTime hết hạn (0ms)
             │ PassiveStartUp                   ▼
         ┌───┴────────────────────────────────────────────────────────────────────┐
         │                         BUS-SLEEP MODE (BSM)                           │
         │            (ECU ngủ sâu, Controller SLEEP, Trcv STANDBY)               │
         └────────────────────────────────────────────────────────────────────────┘
            </pre>
          </div>

          <table class="tbl">
            <thead>
              <tr>
                <th style="width:160px">Chế Độ (Mode)</th>
                <th style="width:180px">Trạng Thái Phần Cứng CAN</th>
                <th style="width:110px">Dòng Điện Tiêu Thụ</th>
                <th style="width:120px">Truyền / Nhận?</th>
                <th>Bộ Định Thời Hoạt Động &amp; Hành Vi Kỹ Thuật</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><b>1. Bus-Sleep Mode (BSM)</b></td>
                <td>Controller: <code>SLEEP</code><br/>Transceiver: <code>STANDBY</code></td>
                <td>Cực thấp (&lt; 100 µA)<br/>Tiết kiệm ắc-quy</td>
                <td>Khóa cả Tx và Rx thông thường</td>
                <td><b>Mọi Timer = OFF:</b> ECU ngủ hoàn toàn. Chỉ thức dậy khi có ngắt phần cứng Wakeup hoặc lệnh chủ động từ EcuM.</td>
              </tr>
              <tr>
                <td><b>2. Prepare Bus-Sleep Mode (PBSM)</b></td>
                <td>Controller: <code>STARTED</code><br/>Transceiver: <code>NORMAL</code></td>
                <td>Bình thường (~50 - 100 mA)</td>
                <td>Không phát Tx; vẫn nhận được Rx</td>
                <td><b>Chạy <code>CanNmWaitBusSleepTime</code> (1500ms):</b> Pha đệm an toàn. Đảm bảo toàn bộ các ECU trên bus sập nguồn đồng loạt mà không bị sót node.</td>
              </tr>
              <tr>
                <td><b>3. Network Mode (NM)</b></td>
                <td>Controller: <code>STARTED</code><br/>Transceiver: <code>NORMAL</code></td>
                <td>Đầy đủ (Active Mode)</td>
                <td>Tx và Rx mở thông suốt</td>
                <td><b>Chạy <code>CanNmTimeoutTime</code>:</b> Đồng hồ sinh tử giữ mạng. Bao gồm 3 trạng thái con (Repeat Message, Normal Operation, Ready Sleep).</td>
              </tr>
            </tbody>
          </table>
        `
      },
      {
        title: "2.2. Chuyên Sâu Repeat Message: Vì Sao Phải Vào Đầu Tiên & Cơ Chế Burst Mode",
        content: `
          <h2>2.2. Chuyên Sâu Repeat Message State: Bản Chất, Lý Do Phải Vào Đầu Tiên &amp; Cơ Chế Burst Mode</h2>
          <p>Trạng thái <b>Repeat Message State (RMS)</b> là <i>trung tâm điều phối bắt buộc (Mandatory Gateway)</i> của mọi chu trình chuyển tiếp vào Network Mode trong chuẩn AUTOSAR CanNM.</p>

          <div style="margin:12px 0; background:var(--code); border:1px solid var(--border); border-radius:8px; padding:12px">
            <div class="mono small" style="font-weight:700; color:#f59e0b; margin-bottom:8px">🚪 SƠ ĐỒ CỬA NGÕ BẮT BUỘC: MỌI LỐI VÀO NETWORK MODE ĐỀU PHẢI QUA REPEAT MESSAGE</div>
            <pre class="code" style="margin:0; font-size:11px; line-height:1.45">
[Bus-Sleep Mode] ──────────(Active Wakeup / PassiveStartUp)─────────┐
                                                                    │
[Prepare Bus-Sleep Mode] ──(CanNm_NetworkRequest / Rx NM PDU)───────┼──► ╔══════════════════════════════╗
                                                                    │    ║   REPEAT MESSAGE STATE (RMS) ║
[Ready Sleep State] ───────(CanNm_NetworkRequest / Rx RMR==1)───────┤    ║ • Bắt buộc vào đầu tiên      ║
                                                                    │    ║ • Chạy RepeatMessageTimer    ║
[Normal Operation] ────────(Bit RMR==1 nhận từ bus hoặc lệnh SWC)───┘    ║ • Bắn Burst Tx (nếu Active)  ║
                                                                         ╚══════════════╦═══════════════╝
                                      ┌─────────────────────────────────────────┴─────────────────────────────────────────┐
                                      ▼ (Khi hết RepeatMessageTime &amp; NetReq==1)                                            ▼ (Khi hết RepeatMessageTime &amp; NetReq==0)
                        ┌───────────────────────────┐                                                        ┌───────────────────────────┐
                        │   Normal Operation State  │                                                        │     Ready Sleep State     │
                        └───────────────────────────┘                                                        └───────────────────────────┘
            </pre>
          </div>

          <div style="margin-top:14px; background:var(--panel2); border-left:4px solid #f59e0b; border-radius:0 8px 8px 0; padding:10px 14px">
            <div class="mono" style="font-weight:700; color:#f59e0b; margin-bottom:4px">❓ VÌ SAO CANNM LUÔN PHẢI VÀO REPEAT MESSAGE STATE ĐẦU TIÊN?</div>
            <p style="margin:4px 0 8px; color:var(--text); font-size:12px">AUTOSAR quy định bất kỳ ECU nào khi thức dậy hoặc khi phát hiện yêu cầu quét mạng đều <b>BẮT BUỘC</b> phải vào Repeat Message State trước khi được rẽ sang Normal Operation hay Ready Sleep vì 4 lý do sống còn:</p>
            <table class="tbl">
              <thead>
                <tr>
                  <th style="width:180px">Lý Do Cốt Lõi</th>
                  <th>Giải Thích Kỹ Thuật Chi Tiết &amp; Hậu Quả Nếu Bỏ Qua</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><b>1. Đồng bộ sự hiện diện toàn mạng (Node Discovery)</b></td>
                  <td>
                    Khi mạng vừa bật hoặc 1 ECU thức dậy, các ECU khác trên bus hoàn toàn chưa biết ECU này đã tỉnh giấc.<br/>
                    Trong thời gian <code>CanNmRepeatMessageTime</code> (thường 1500ms), ECU bắt buộc phải phát các bản tin NM PDU mang Node ID của mình để toàn bộ các nút trên bus ghi nhận sự hiện diện (Node Detection), cập nhật bảng định tuyến và chuẩn bị nhận App Messages.
                  </td>
                </tr>
                <tr>
                  <td><b>2. Cửa sổ lắng nghe &amp; Thu thập PNC (Listening Window)</b></td>
                  <td>
                    Khi thức dậy, ECU cần một khoảng thời gian tối thiểu để lắng nghe các bản tin NM từ những ECU khác, nhằm:<br/>
                    • Thu thập bitmask Partial Networking (PNC Info) xem những cụm mạng nào đang được yêu cầu.<br/>
                    • Đọc User Data / Trạng thái chẩn đoán từ các node lân cận trước khi đưa ra quyết định chuyển sang trạng thái ngủ (Ready Sleep).
                  </td>
                </tr>
                <tr>
                  <td><b>3. Triệt tiêu Race-Condition &amp; Chống "Ngủ Non" (Premature Sleep)</b></td>
                  <td>
                    Nếu không có RMS: Khi một ECU bị đánh thức thụ động (Passive Wakeup), tại thời điểm thức dậy tầng Application (SWC) vẫn đang bận boot/init phần cứng và chưa kịp gọi <code>CanNm_NetworkRequest()</code>.<br/>
                    Nếu lập tức cho ECU vào Ready Sleep, node này có thể đếm hết timeout và <b>tự ý đi ngủ ngay lập tức</b> trước khi App kịp thức dậy yêu cầu giữ mạng! RMS cung cấp một khoảng thời gian đệm bảo vệ (Grace Period) để chờ SWC hoàn tất boot.
                  </td>
                </tr>
                <tr>
                  <td><b>4. Phục vụ yêu cầu chẩn đoán Tester (Repeat Message Request - RMR)</b></td>
                  <td>
                    Khi thiết bị chẩn đoán (Tester) hoặc Gateway cần kiểm tra danh sách ECU đang sống trên bus (Node Detection Routine), nó gửi bản tin NM PDU có bật <b>Bit 0 CBV: RMR = 1</b>.<br/>
                    Mọi ECU trên bus khi nhận được gói này lập tức bị kéo ngược về Repeat Message State để phát lại bản tin báo danh, giúp Tester vẽ lại bản đồ mạng toàn xe trong vòng 1.5 giây.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style="margin-top:16px; background:var(--code); border:1px solid var(--border); border-radius:8px; padding:12px">
            <div class="mono small" style="font-weight:700; color:#38bdf8; margin-bottom:8px">⚡ BIỂU ĐỒ THỜI GIAN BURST MODE: SO SÁNH CHU KỲ PHÁT 20ms VS CHU KỲ CHUẨN 1000ms</div>
            <pre class="code" style="margin:0; font-size:11px; line-height:1.45">
Timeline (ms):  0ms    20ms   40ms   60ms                                            1060ms
                │      │      │      │                                               │
Burst Mode:     ▼ Tx#1 ▼ Tx#2 ▼ Tx#3 ▼ Tx#4 (Hết số gói burst)                       ▼ Tx#5 (Chuyển sang chu kỳ chuẩn)
                ├──────┼──────┼──────┼───────────────────────────────────────────────┤
                ◄── CanNmImmediateNmCycleTime = 20ms ──►◄───── CanNmMsgCycleTime = 1000ms ──────►
                [PHA 1: BẮN BURST TỨC THÌ ĐÁNH THỨC TOÀN MẠNG] [PHA 2: PHÁT ĐỊNH KỲ DUY TRÌ BÌNH THƯỜNG]

Không có Burst: ▼ Tx#1 (Đợi offset 100ms)                                            ▼ Tx#2 (Đợi tiếp 1000ms!)
                └──────────────────────────[QUÁ CHẬM! CÁC ECU KHÁC CÓ THỂ ĐÃ BỊ TIMEOUT NGỦ]──►
            </pre>
          </div>

          <div style="margin-top:14px">
            <h3>⚡ Phân Tích Cơ Chế Burst Mode (CanNmImmediateNmTransmissions): Tại Sao &amp; Khi Nào Cần Dùng?</h3>
            <table class="tbl">
              <thead>
                <tr>
                  <th style="width:170px">Khía Cạnh Kỹ Thuật</th>
                  <th>Phân Tích Chi Tiết Theo Chuẩn AUTOSAR SWS_CanNm</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><b>Bản chất Burst Mode</b></td>
                  <td>
                    Khi được kích hoạt, CanNM sẽ tạm thời bỏ qua chu kỳ phát thông thường <code>CanNmMsgCycleTime</code> (1000ms) và phát liên tiếp một số lượng bản tin nhất định (<code>CanNmImmediateNmTransmissions</code>, ví dụ: 3 đến 5 bản tin) với chu kỳ cực ngắn (<code>CanNmImmediateNmCycleTime</code>, ví dụ: 20ms hoặc 50ms).
                  </td>
                </tr>
                <tr>
                  <td><b>Tại sao cần dùng Burst Mode?</b></td>
                  <td>
                    <b>1. Rút ngắn thời gian khởi động hệ thống (T_boot Latency):</b> Truyền thông ứng dụng chỉ được phép bắt đầu khi mạng đã thức. Nếu phải đợi 1000ms mới phát gói NM đầu tiên, toàn bộ tính năng xe (màn hình giải trí, camera lùi, đèn pha) sẽ bị trễ cả giây.<br/>
                    <b>2. Cứu các node khác không bị ngủ nhầm:</b> Nếu một ECU thức dậy trong khi các node khác đang đếm lùi những mili-giây cuối cùng của <code>CanNmTimeoutTime</code>, việc bắn Burst dồn dập ngay tại t=0ms sẽ nạp lại (reload) đồng hồ sinh tử của các node kia ngay lập tức, ngăn mạng sập ngoài ý muốn.
                  </td>
                </tr>
                <tr>
                  <td><b>Khi nào BẮT BUỘC dùng Burst Mode?</b></td>
                  <td>
                    <b>Trường hợp 1 — Active Wakeup:</b> Khi ECU thức dậy do sự kiện chủ động nội bộ (người lái mở cửa, cắm chìa KL15, khởi động xe, SWC gọi <code>CanNm_NetworkRequest()</code>). ECU bắt buộc bật <b>Bit 4 AWB=1</b> và bắn Burst ngay lập tức.<br/>
                    <b>Trường hợp 2 — Partial Networking Cluster Activation:</b> Khi một cụm PNC mới được kích hoạt và cần thông báo khẩn cấp đến các ECU liên quan trong cụm.
                  </td>
                </tr>
                <tr>
                  <td><b>Khi nào CẤM hoặc KHÔNG NÊN dùng Burst Mode?</b></td>
                  <td>
                    <b>Trường hợp 1 — Passive Wakeup:</b> Khi ECU bị kéo thức dậy bởi một bản tin NM PDU từ ECU khác trên bus. Lúc này mạng <b>ĐÃ CÓ SÓNG</b> và đang được giữ thức bởi node khác, việc ECU này bắn thêm Burst là hoàn toàn không cần thiết, thậm chí gây nghẽn bus.<br/>
                    <b>Trường hợp 2 — Passive Mode (CanNmPassiveModeEnabled = TRUE):</b> Nút chỉ lắng nghe, không bao giờ được phát bất kỳ gói nào.<br/>
                    <b>Trường hợp 3 — Kênh CAN có Bus Load quá cao:</b> Cần cấu hình giới hạn số lượng burst (tối đa 3 gói) để không chiếm quyền ưu tiên của các khung CAN an toàn (Phanh ABS, Cân bằng ESP).
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        `
      },
      {
        title: "2.3. Ma Trận Tác Động: Khi ECU2 Gửi NM PDU Thì Trạng Thái ECU1 Bị Ảnh Hưởng Thế Nào?",
        content: `
          <h2>2.3. Ma Trận Tác Động: Khi Có Bản Tin NM PDU Từ ECU2 Gửi Đến Thì Ảnh Hưởng Thế Nào Đến State Của ECU1?</h2>
          <p>Đây là một trong những câu hỏi kiến trúc cốt lõi nhất khi phát triển hệ thống mạng AUTOSAR. Tác động của bản tin NM PDU từ ECU2 lên ECU1 phụ thuộc hoàn toàn vào <b>Trạng thái hiện tại của ECU1</b> và <b>Nội dung cờ CBV (đặc biệt là bit RMR)</b> trong bản tin của ECU2:</p>

          <div style="margin:12px 0; background:var(--code); border:1px solid var(--border); border-radius:8px; padding:12px">
            <div class="mono small" style="font-weight:700; color:#38bdf8; margin-bottom:8px">📡 SƠ ĐỒ TƯƠNG TÁC ĐA ECU: ECU2 PHÁT NM PDU ──► CAN BUS ──► ECU1 XỬ LÝ NỘI BỘ</div>
            <pre class="code" style="margin:0; font-size:11px; line-height:1.45">
[ ECU #2 (Transmitter) ]                              [ ECU #1 (Receiver - Node Đang Xét) ]
┌───────────────────────────┐                         ┌────────────────────────────────────────────────────────┐
│ CanNm Tx PDU (8-Byte)     │                         │ 1. CanDrv ngắt Rx ➔ CanIf chuyển tiếp                  │
│ • CAN ID: 0x500 + NodeID2 │                         │ 2. CanNm_RxIndication() được gọi                       │
│ • CBV Byte: [RMR,CSR,AWB] │                         │ 3. CanNM kiểm tra: ECU1 ĐANG Ở TRẠNG THÁI NÀO?         │
│ • UserData / PN Bitmask   │                         └───────────────────────────┬────────────────────────────┘
└─────────────┬─────────────┘                                                     │
              │ CAN BUS (0x502)                                                   ▼
              ═════════════════════════════════════════════════════► [MA TRẬN PHÂN XỬ HÀNH VI TẠI ECU1]
            </pre>
          </div>

          <div style="margin-top:14px">
            <div class="mono" style="font-weight:700; color:#fbbf24; margin-bottom:6px">📋 BẢNG MA TRẬN TÁC ĐỘNG TOÀN DIỆN KHI ECU1 NHẬN NM PDU TỪ ECU2 (TỪNG STATE CỦA ECU1):</div>
            <table class="tbl">
              <thead>
                <tr>
                  <th style="width:140px">Trạng Thái Hiện Tại Của ECU1</th>
                  <th style="width:90px">Cờ RMR Của ECU2</th>
                  <th style="width:180px">Trạng Thái Đích Của ECU1 (State Transition)</th>
                  <th style="width:190px">Tác Động Đến Bộ Định Thời (Timers Impact)</th>
                  <th>Hành Vi Kỹ Thuật, Callbacks &amp; Căn Cứ AUTOSAR SWS</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><b>1. Bus-Sleep Mode (BSM)</b></td>
                  <td>Bất kỳ (0 hoặc 1)</td>
                  <td><b>VẪN Ở LẠI: Bus-Sleep Mode!</b><br/>(Chưa đổi state ngay)</td>
                  <td>Mọi timer vẫn dừng (OFF)</td>
                  <td>
                    • Báo Runtime Error <b><code>CANNM_E_NET_START_IND (0x04)</code></b> (SWS_CanNm_00336).<br/>
                    • Gọi callback <b><code>Nm_NetworkStartIndication()</code></b> báo lên ComM.<br/>
                    • <i>Hệ quả tiếp theo:</i> ComM phối hợp CanSM bật Controller CAN, rồi ComM gọi xuống <code>CanNm_PassiveStartUp()</code>. Lúc này ECU1 mới chính thức vào <b>Repeat Message State</b> (AWB=0).
                  </td>
                </tr>
                <tr>
                  <td><b>2. Prepare Bus-Sleep (PBSM)</b></td>
                  <td>Bất kỳ (0 hoặc 1)</td>
                  <td><b>CHUYỂN NGAY SANG: Repeat Message State!</b></td>
                  <td>
                    • Hủy bỏ (Stop) <code>WaitBusSleepTimer</code>.<br/>
                    • Nạp đầy (Reload) <code>CanNmTimeoutTime</code>.<br/>
                    • Nạp đầy <code>CanNmRepeatMessageTime</code>.
                  </td>
                  <td>
                    • <b>Đánh thức khẩn cấp từ pha đệm:</b> Ngăn chặn ECU1 tắt nguồn.<br/>
                    • Gọi callback <b><code>Nm_NetworkMode()</code></b> thông báo cho Nm/ComM biết mạng đã có sóng trở lại (SWS_CanNm_00124).<br/>
                    • ECU1 trở thành node bị đánh thức thụ động (AWB=0).
                  </td>
                </tr>
                <tr>
                  <td><b>3. Ready Sleep State (RSS)</b></td>
                  <td><b>RMR = 0</b><br/>(Gói tin NM bình thường)</td>
                  <td><b>GIỮ NGUYÊN: Ready Sleep State!</b><br/>(ECU1 không phát bản tin)</td>
                  <td>
                    <b>RELOAD LẬP TỨC:</b><br/>
                    <code>CanNmTimeoutTime = 2000ms</code> đầy lại từ đầu!
                  </td>
                  <td>
                    • <b>CƠ CHẾ CỨU SỐNG MẠNG (KEEP-ALIVE):</b> ECU1 không cần nói, chỉ cần nghe ECU2 phát là tự động gia hạn thêm 2000ms thời gian thức.<br/>
                    • ECU1 tiếp tục giữ yên lặng (Tx = OFF) để tiết kiệm tải mạng CAN, kiên nhẫn đợi ECU2 dùng xong bus.
                  </td>
                </tr>
                <tr>
                  <td><b>4. Ready Sleep State (RSS)</b></td>
                  <td><b>RMR = 1</b><br/>(ECU2 yêu cầu quét mạng)</td>
                  <td><b>BỊ ÉP CHUYỂN VỀ: Repeat Message State!</b></td>
                  <td>
                    • Nạp đầy <code>CanNmRepeatMessageTime</code> (1500ms).<br/>
                    • Nạp đầy <code>CanNmTimeoutTime</code> (2000ms).
                  </td>
                  <td>
                    • <b>BẬT LẠI TRUYỀN PHÁT (Tx = ON):</b> ECU1 đang im lặng chuẩn bị ngủ bị buộc phải thức dậy phát bản tin mang Node ID của mình để báo danh cho ECU2.<br/>
                    • Gọi <code>Nm_StateChangeNotification()</code> báo đổi trạng thái (SWS_CanNm_00111).
                  </td>
                </tr>
                <tr>
                  <td><b>5. Normal Operation (NOS)</b></td>
                  <td><b>RMR = 0</b></td>
                  <td><b>GIỮ NGUYÊN: Normal Operation State!</b></td>
                  <td>
                    <b>RELOAD LẬP TỨC:</b><br/>
                    <code>CanNmTimeoutTime = 2000ms</code> đầy lại.
                  </td>
                  <td>
                    • ECU1 tiếp tục duy trì phát bản tin định kỳ của mình theo <code>CanNmMsgCycleTime</code>.<br/>
                    • Nếu có Partial Networking (PN): CanNM trích xuất PNC bitmask của ECU2 để cập nhật ERA/EIRA và reload <code>CanNmPnResetTime</code>.
                  </td>
                </tr>
                <tr>
                  <td><b>6. Normal Operation (NOS)</b></td>
                  <td><b>RMR = 1</b></td>
                  <td><b>CHUYỂN VỀ: Repeat Message State!</b></td>
                  <td>
                    • Nạp đầy <code>CanNmRepeatMessageTime</code> (1500ms).<br/>
                    • Nạp đầy <code>CanNmTimeoutTime</code> (2000ms).
                  </td>
                  <td>
                    • Reset chu kỳ phát, có thể phát theo Burst hoặc MsgCycleTime để phục vụ chu trình kiểm tra chẩn đoán toàn mạng của ECU2 (SWS_CanNm_00112).
                  </td>
                </tr>
                <tr>
                  <td><b>7. Repeat Message (RMS)</b></td>
                  <td>Bất kỳ (0 hoặc 1)</td>
                  <td><b>TIẾP TỤC Ở LẠI: Repeat Message State!</b></td>
                  <td>
                    • <b>Reload</b> <code>CanNmTimeoutTime</code>.<br/>
                    • <b>KHÔNG RELOAD</b> <code>CanNmRepeatMessageTime</code> (vẫn tiếp tục đếm đến 0).
                  </td>
                  <td>
                    • Ghi nhận thông tin node ECU2.<br/>
                    • Thời gian RMS của ECU1 không bị kéo dài vô tận khi nhận liên tiếp nhiều gói NM, đảm bảo ECU1 sẽ thoát sang Normal Operation hoặc Ready Sleep đúng hạn (SWS_CanNm_00102).
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style="margin-top:16px; background:var(--code); border:1px solid var(--border); border-radius:8px; padding:12px">
            <div class="mono small" style="font-weight:700; color:#34d399; margin-bottom:8px">⏱️ SƠ ĐỒ TUẦN TỰ: KỊCH BẢN ECU2 PHÁT BẢN TIN CỨU MẠNG ECU1 TẠI GIÂY PHÚT CUỐI CÙNG</div>
            <pre class="code" style="margin:0; font-size:11px; line-height:1.45">
Thời gian:   t = 1900ms                       t = 1950ms (Chỉ còn 50ms nữa là ngủ!)       t = 1951ms (Cứu sống!)
             │                                │                                            │
ECU #1:      [Ready Sleep: Timeout còn 100ms] ──► [Ready Sleep: Timeout còn 50ms]          │
                                                                                           │
ECU #2:      (Bất ngờ có nhu cầu gửi dữ liệu) ──► Bắn CanNm PDU (ID: 0x502) ───────────────┼──► CanIf của ECU1 nhận
                                                                                           │    ▼
                                                                                           │ CanNm_RxIndication() gọi
                                                                                           │    ▼
                                                                                           │ ECU1 RELOAD CanNmTimeoutTime = 2000ms!
                                                                                           │ ECU1 tiếp tục ở Ready Sleep thêm 2 giây!
            </pre>
          </div>
        `
      },
      {
        title: "2.4. Chi Tiết Trạng Thái Con Normal Operation & Ready Sleep",
        content: `
          <h2>2.4. Chi Tiết Trạng Thái Con Normal Operation &amp; Ready Sleep</h2>
          <p>Hai trạng thái con <b>Normal Operation</b> và <b>Ready Sleep</b> tạo thành mô hình hai động cơ (Dual-Engine Operation) phản ánh nhu cầu thực tế của ứng dụng:</p>

          <div style="margin:12px 0; background:var(--code); border:1px solid var(--border); border-radius:8px; padding:12px">
            <div class="mono small" style="font-weight:700; color:#38bdf8; margin-bottom:8px">🔄 MÔ HÌNH HAI ĐỘNG CƠ TRUYỀN PHÁT: NORMAL OPERATION (TX ON) VS READY SLEEP (TX OFF)</div>
            <pre class="code" style="margin:0; font-size:11px; line-height:1.45">
       [ỨNG DỤNG CẦN MẠNG]                                        [ỨNG DỤNG HẾT VIỆC]
    CanNm_NetworkRequest()                                      CanNm_NetworkRelease()
             │                                                           │
             ▼                                                           ▼
┌──────────────────────────────┐        CanNm_NetworkRelease()   ┌──────────────────────────────┐
│    Normal Operation State    ├────────────────────────────────►│      Ready Sleep State       │
│  • Truyền phát Tx: BẬT       │◄────────────────────────────────┤  • Truyền phát Tx: TẮT       │
│  • Lắng nghe Rx: BẬT         │        CanNm_NetworkRequest()   │  • Lắng nghe Rx: BẬT         │
│  • Bắn định kỳ MsgCycleTime  │                                 │  • Đếm lùi TimeoutTime       │
└──────────────────────────────┘                                 └──────────────┬───────────────┘
                                                                                │ Timeout hết hạn (0ms)
                                                                                ▼
                                                                  [ Prepare Bus-Sleep Mode ]
            </pre>
          </div>

          <table class="tbl">
            <thead>
              <tr>
                <th style="width:160px">Đặc Tính Kỹ Thuật</th>
                <th style="width:280px">Normal Operation State (NOS)</th>
                <th>Ready Sleep State (RSS)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><b>Trạng thái truyền phát (Tx)</b></td>
                <td><b>BẬT (Active Transmission):</b> Phát bản tin NM PDU định kỳ theo <code>CanNmMsgCycleTime</code>.</td>
                <td><b>TẮT (Silent):</b> Không phát bất kỳ bản tin NM nào để giải phóng băng thông bus.</td>
              </tr>
              <tr>
                <td><b>Trạng thái lắng nghe (Rx)</b></td>
                <td><b>BẬT:</b> Tiếp nhận gói tin NM từ các node khác, reload TimeoutTimer.</td>
                <td><b>BẬT:</b> Tiếp nhận gói tin NM từ các node khác, reload TimeoutTimer.</td>
              </tr>
              <tr>
                <td><b>Mục đích sử dụng</b></td>
                <td>ECU đang có nhu cầu truyền thông dữ liệu ứng dụng thực tế.</td>
                <td>ECU đã xong việc nhưng chưa thể ngủ vì các ECU khác trên xe vẫn đang thức.</td>
              </tr>
              <tr>
                <td><b>Điều kiện chuyển sang trạng thái kia</b></td>
                <td>Khi ứng dụng gọi <code>CanNm_NetworkRelease()</code> ➔ Rẽ sang <b>Ready Sleep</b>.</td>
                <td>Khi ứng dụng gọi <code>CanNm_NetworkRequest()</code> ➔ Rẽ ngược lại <b>Normal Operation</b>.</td>
              </tr>
              <tr>
                <td><b>Điều kiện dẫn đến đi ngủ</b></td>
                <td><b>Không thể đi ngủ trực tiếp từ NOS!</b> Bắt buộc phải qua Ready Sleep trước.</td>
                <td>Nếu bus hoàn toàn yên ắng trong suốt <code>CanNmTimeoutTime</code> ➔ Rẽ sang <b>Prepare Bus-Sleep</b>.</td>
              </tr>
            </tbody>
          </table>
        `
      },
      {
        title: "2.5. Ma Trận Chuyển Trạng Thái Toàn Diện (Full State Transition Matrix)",
        content: `
          <h2>2.5. Bảng Ma Trận Chuyển Trạng Thái Toàn Diện (20 Vectors Chuẩn AUTOSAR SWS_CanNm)</h2>
          <p>Dưới đây là ma trận 20 chuyển dịch trạng thái toàn diện quy định trong tài liệu chuẩn AUTOSAR Classic SWS_CanNm:</p>

          <div style="margin:12px 0; background:var(--code); border:1px solid var(--border); border-radius:8px; padding:12px">
            <div class="mono small" style="font-weight:700; color:#34d399; margin-bottom:8px">🗺️ SƠ ĐỒ CHUYỂN DỊCH TỔNG QUÁT MÁY TRẠNG THÁI CANNM</div>
            <pre class="code" style="margin:0; font-size:11px; line-height:1.45">
          [Bus-Sleep] ──────────────(1: NetworkRequest / 2: PassiveStartUp)────────────► [Repeat Message]
               ▲                                                                               │
               │                                                      ┌────────────────────────┴───────────────────────┐
          (9: WaitSleep=0)                                            ▼ (3: RepeatTimer=0 &amp; NetReq=1)                  ▼ (4: RepeatTimer=0 &amp; NetReq=0)
               │                                            [Normal Operation] ──(5: NetworkRelease)──► [Ready Sleep]
      [Prepare Bus-Sleep] ◄──────(7: TimeoutTime=0)───────────────────┴──────────◄──(6: NetworkRequest)───────────────┤
               │                                                                                                      │
               └────────────────────(8: Emergency NetworkRequest / Immediate Restart)─────────────────────────────────┘
            </pre>
          </div>

          <table class="tbl">
            <thead>
              <tr>
                <th style="width:50px">STT</th>
                <th style="width:140px">Trạng Thái Ban Đầu</th>
                <th style="width:230px">Sự Kiện Kích Hoạt (Trigger Event)</th>
                <th style="width:150px">Trạng Thái Đích</th>
                <th style="width:150px">Hành Động Đi Kèm</th>
                <th>Căn Cứ Chuẩn AUTOSAR</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>1</td><td>Bus-Sleep</td><td><code>CanNm_NetworkRequest()</code></td><td>Repeat Message</td><td>Set AWB=1, Burst Tx</td><td>SWS_CanNm_00129</td></tr>
              <tr><td>2</td><td>Bus-Sleep</td><td><code>CanNm_PassiveStartUp()</code></td><td>Repeat Message</td><td>Giữ AWB=0, Offset Tx</td><td>SWS_CanNm_00128</td></tr>
              <tr><td>3</td><td>Repeat Message</td><td>Hết RepeatMessageTimer &amp; NetReq==1</td><td>Normal Operation</td><td>Xóa RMR=0, phát định kỳ</td><td>SWS_CanNm_00103</td></tr>
              <tr><td>4</td><td>Repeat Message</td><td>Hết RepeatMessageTimer &amp; NetReq==0</td><td>Ready Sleep</td><td>Xóa RMR=0, dừng phát Tx</td><td>SWS_CanNm_00106</td></tr>
              <tr><td>5</td><td>Normal Operation</td><td><code>CanNm_NetworkRelease()</code></td><td>Ready Sleep</td><td>Dừng phát bản tin Tx</td><td>SWS_CanNm_00118</td></tr>
              <tr><td>6</td><td>Ready Sleep</td><td><code>CanNm_NetworkRequest()</code></td><td>Normal Operation</td><td>Bật lại phát bản tin Tx</td><td>SWS_CanNm_00110</td></tr>
              <tr><td>7</td><td>Ready Sleep</td><td>CanNmTimeoutTime chạm 0 ms</td><td>Prepare Bus-Sleep</td><td>Clear AWB=0, chạy WaitSleep</td><td>SWS_CanNm_00115</td></tr>
              <tr><td>8</td><td>Prepare Bus-Sleep</td><td><code>CanNm_NetworkRequest()</code></td><td>Repeat Message</td><td>Immediate Restart (t=0ms)</td><td>SWS_CanNm_00122</td></tr>
              <tr><td>9</td><td>Prepare Bus-Sleep</td><td>CanNmWaitBusSleepTime chạm 0 ms</td><td>Bus-Sleep</td><td>Báo <code>Nm_BusSleepMode()</code></td><td>SWS_CanNm_00117</td></tr>
              <tr><td>10</td><td>Normal Operation</td><td>Nhận PDU có bit RMR = 1</td><td>Repeat Message</td><td>Nạp lại RepeatMessageTime</td><td>SWS_CanNm_00112</td></tr>
              <tr><td>11</td><td>Ready Sleep</td><td>Nhận PDU có bit RMR = 1</td><td>Repeat Message</td><td>Nạp lại RepeatMessageTime</td><td>SWS_CanNm_00111</td></tr>
              <tr><td>12</td><td>Prepare Bus-Sleep</td><td>Nhận bản tin NM PDU từ bus</td><td>Repeat Message</td><td>Passive Wakeup từ PBSM</td><td>SWS_CanNm_00124</td></tr>
              <tr><td>13</td><td>Ready Sleep</td><td>Nhận bản tin NM PDU có RMR = 0</td><td>Ready Sleep (ở lại)</td><td>Reload CanNmTimeoutTime</td><td>SWS_CanNm_00098</td></tr>
              <tr><td>14</td><td>Normal Operation</td><td>Nhận bản tin NM PDU có RMR = 0</td><td>Normal Operation (ở lại)</td><td>Reload CanNmTimeoutTime</td><td>SWS_CanNm_00098</td></tr>
            </tbody>
          </table>
        `
      },
      {
        title: "2.6. Active Wakeup vs Passive Wakeup & Đột Biến Immediate Restart",
        content: `
          <h2>2.6. Bảng So Sánh Đối Đầu: Active Wakeup vs Passive Wakeup vs Immediate Restart</h2>
          <p>Phân biệt tường minh nguồn gốc đánh thức và kịch bản khởi động khẩn cấp:</p>

          <div style="margin:12px 0; background:var(--code); border:1px solid var(--border); border-radius:8px; padding:12px">
            <div class="mono small" style="font-weight:700; color:#f87171; margin-bottom:8px">⚡ SƠ ĐỒ ĐỘT BIẾN IMMEDIATE RESTART TRONG PREPARE BUS-SLEEP MODE</div>
            <pre class="code" style="margin:0; font-size:11px; line-height:1.45">
[Chuẩn bị ngủ: Prepare Bus-Sleep] ──(WaitBusSleepTimer đang đếm lùi: 1500ms... 800ms...)──┐
                                                                                           │
  BẤT NGỜ: Ứng dụng gọi CanNm_NetworkRequest() hoặc nhận NM PDU từ bus!                   │
                                                                                           ▼
  ┌────────────────────────────────────────────────────────────────────────────────────────┐
  │                           IMMEDIATE RESTART KÍCH HOẠT!                                 │
  │ • Lập tức hủy bộ đếm WaitBusSleepTimer                                                 │
  │ • Chuyển trạng thái ngay về Repeat Message State tại t = 0ms!                          │
  │ • Nếu CanNmImmediateRestartEnabled == TRUE: Bắn gói NM đầu tiên ngay lập tức không trễ!│
  └────────────────────────────────────────────────────────────────────────────────────────┘
            </pre>
          </div>

          <table class="tbl">
            <thead>
              <tr>
                <th style="width:150px">Tiêu Chí Kỹ Thuật</th>
                <th style="width:220px">Active Wakeup (Đánh Thức Chủ Động)</th>
                <th style="width:220px">Passive Wakeup (Đánh Thức Thụ Động)</th>
                <th>Immediate Restart (Đánh Thức Khẩn Cấp)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><b>Nguồn gốc kích hoạt</b></td>
                <td>Ứng dụng nội bộ ECU gọi <code>CanNm_NetworkRequest()</code>.</td>
                <td>Nhận được khung NM từ ECU khác trên bus gọi <code>CanNm_PassiveStartUp()</code>.</td>
                <td>SWC yêu cầu mạng khi node đang ở <code>Prepare Bus-Sleep Mode</code>.</td>
              </tr>
              <tr>
                <td><b>Bit AWB (Bit 4 CBV)</b></td>
                <td><b>BẬT = 1 (Active Wakeup):</b> Giúp chẩn đoán biết ECU này là nguồn gây thức.</td>
                <td><b>GIỮ = 0 (Passive):</b> ECU này thức dậy do bị ECU khác kéo dậy.</td>
                <td><b>BẬT = 1:</b> Trở thành nguồn gây thức lại mạng.</td>
              </tr>
              <tr>
                <td><b>Thời điểm phát gói đầu</b></td>
                <td>Phát ngay tại <b>t = 0 ms</b> (Immediate Burst Tx).</td>
                <td>Trễ sau <code>CanNmMsgCycleOffset</code> (100ms) để nhường bus.</td>
                <td>Phát ngay tại <b>t = 0 ms</b> nếu <code>CanNmImmediateRestartEnabled=TRUE</code>.</td>
              </tr>
              <tr>
                <td><b>Rẽ nhánh sau Repeat Message</b></td>
                <td>Rẽ sang <b>Normal Operation State</b> (tiếp tục phát bản tin).</td>
                <td>Rẽ sang <b>Ready Sleep State</b> (dừng phát, chỉ nghe bus).</td>
                <td>Rẽ sang <b>Normal Operation State</b> (duy trì mạng).</td>
              </tr>
            </tbody>
          </table>
        `
      }
    ]
  },

  // =========================================================================
  // TAB 3: GIẢI PHẪU PDU & CBV
  // =========================================================================
  {
    title: "3. Giải Phẫu 8-Byte NM PDU & Thanh Ghi CBV",
    subtopics: [
      {
        title: "3.1. Cấu Trúc Khung 8-Byte NM PDU & Quy Tắc Định Địa Chỉ CAN ID",
        content: `
          <h2>3.1. Cấu Trúc Khung 8-Byte NM PDU &amp; Quy Tắc Định Địa Chỉ CAN ID</h2>
          <p>Mỗi bản tin Quản lý Mạng CanNM được truyền tải dưới dạng một khung CAN 8-byte tiêu chuẩn (Standard hoặc Extended Frame):</p>

          <div style="margin:12px 0; background:var(--code); border:1px solid var(--border); border-radius:8px; padding:12px">
            <div class="mono small" style="font-weight:700; color:#38bdf8; margin-bottom:8px">📦 SƠ ĐỒ BỐ TRÍ BỘ NHỚ KHUNG 8-BYTE NM PDU (CAN DATA LINK LAYER BLUEPRINT)</div>
            <pre class="code" style="margin:0; font-size:11px; line-height:1.45">
CAN ID (11-bit / 29-bit): BaseCanId (0x500) + NodeId (0x1A) = 0x51A
┌──────────────┬──────────────┬──────────────┬──────────────┬──────────────┬──────────────┬──────────────┬──────────────┐
│    Byte 0    │    Byte 1    │    Byte 2    │    Byte 3    │    Byte 4    │    Byte 5    │    Byte 6    │    Byte 7    │
├──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┤
│ Source Node  │ Control Bit  │              │              │              │              │              │              │
│  ID (SNI)    │ Vector (CBV) │  User Data   │  User Data   │  User Data   │  User Data   │  User Data   │  User Data   │
│   (0x1A)     │    (0x10)    │   Byte #0    │   Byte #1    │   Byte #2    │   Byte #3    │   Byte #4    │   Byte #5    │
└──────────────┴──────────────┴──────────────┴──────────────┴──────────────┴──────────────┴──────────────┴──────────────┘
◄── Header Quản Lý Mạng CanNM ──►◄───────────── Khoang Dữ Liệu Ứng Dụng &amp; Partial Networking (User Data) ──────────────►
            </pre>
          </div>

          <table class="tbl">
            <thead>
              <tr>
                <th style="width:110px">Byte Offset</th>
                <th style="width:170px">Trường Dữ Liệu (Field)</th>
                <th style="width:130px">Giá Trị Mặc Định</th>
                <th>Ý Nghĩa Kỹ Thuật &amp; Cấu Hình ECUC Liên Quan</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><b>Byte 0</b></td>
                <td>Source Node ID (SNI)</td>
                <td><code>0x1A</code> (26 dec)</td>
                <td>Định danh ECU phát sóng. Cấu hình vị trí động qua <code>CanNmPduNidPosition</code> (BYTE_0, BYTE_1, OFF).</td>
              </tr>
              <tr>
                <td><b>Byte 1</b></td>
                <td>Control Bit Vector (CBV)</td>
                <td><code>0x10</code> (AWB=1)</td>
                <td>Thanh ghi điều khiển mạng 8-bit. Cấu hình vị trí qua <code>CanNmPduCbvPosition</code>.</td>
              </tr>
              <tr>
                <td><b>Byte 2 .. 7</b></td>
                <td>User Data / PN Info</td>
                <td><code>0x00 .. 0x00</code></td>
                <td>Khoang dữ liệu 6-byte mang cờ Partial Network Cluster (PNC Bitmask) hoặc tín hiệu ứng dụng từ COM module.</td>
              </tr>
            </tbody>
          </table>
        `
      },
      {
        title: "3.2. Giải Mã Từng Bit Trong Thanh Ghi CBV (RMR, CSR, AWB, PNI)",
        content: `
          <h2>3.2. Giải Mã Chi Tiết 8 Bit Trong Thanh Ghi Điều Khiển CBV (Control Bit Vector)</h2>
          <p>Thanh ghi CBV là "bộ não" điều khiển ngữ nghĩa của bản tin CanNM:</p>

          <div style="margin:12px 0; background:var(--code); border:1px solid var(--border); border-radius:8px; padding:12px">
            <div class="mono small" style="font-weight:700; color:#fbbf24; margin-bottom:8px">🔢 SƠ ĐỒ BITFIELD THANH GHI 8-BIT CONTROL BIT VECTOR (CBV)</div>
            <pre class="code" style="margin:0; font-size:11px; line-height:1.45">
┌──────────────┬──────────────┬──────────────┬──────────────┬──────────────┬──────────────┬──────────────┬──────────────┐
│    Bit 7     │    Bit 6     │    Bit 5     │    Bit 4     │    Bit 3     │    Bit 2     │    Bit 1     │    Bit 0     │
├──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┤
│   Reserved   │  PnInfoBit   │   Reserved   │ ActiveWakeup │   Reserved   │   Reserved   │  CoordReady  │  RepeatMsg   │
│   (Res7)     │    (PNI)     │   (Res5)     │    (AWB)     │   (Res3)     │   (Res2)     │  Sleep (CSR) │ Request(RMR) │
└──────────────┴──────────────┴──────────────┴──────────────┴──────────────┴──────────────┴──────────────┴──────────────┘
            </pre>
          </div>

          <table class="tbl">
            <thead>
              <tr>
                <th style="width:70px">Bit</th>
                <th style="width:130px">Tên Viết Tắt</th>
                <th style="width:180px">Tên Tiếng Anh Chuẩn</th>
                <th style="width:100px">Giá Trị</th>
                <th>Ý Nghĩa Kỹ Thuật &amp; Tác Động Hệ Thống Theo Chuẩn SWS_CanNm</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Bit 0</td><td><b>RMR</b></td><td>Repeat Message Request</td><td>0 / 1</td><td>Khi = 1: Bắt buộc toàn bộ ECU trên bus quay trở lại Repeat Message State để phục vụ Node Detection.</td></tr>
              <tr><td>Bit 1</td><td><b>CSR</b></td><td>Coord Ready to Sleep</td><td>0 / 1</td><td>Sử dụng trong thuật toán phối hợp ngủ đồng bộ mạng (NM Coordinator). =1 khi node sẵn sàng ngủ.</td></tr>
              <tr><td>Bit 2</td><td><b>Res2</b></td><td>Reserved Bit 2</td><td>0</td><td>Dự phòng, bắt buộc ghi 0 theo chuẩn AUTOSAR.</td></tr>
              <tr><td>Bit 3</td><td><b>Res3</b></td><td>Reserved Bit 3</td><td>0</td><td>Dự phòng, bắt buộc ghi 0 theo chuẩn AUTOSAR.</td></tr>
              <tr><td>Bit 4</td><td><b>AWB</b></td><td>Active Wakeup Bit</td><td>0 / 1</td><td>=1 khi ECU thức dậy do sự kiện nội bộ chủ động; =0 khi bị đánh thức thụ động bởi gói tin khác.</td></tr>
              <tr><td>Bit 5</td><td><b>Res5</b></td><td>Reserved Bit 5</td><td>0</td><td>Dự phòng, bắt buộc ghi 0.</td></tr>
              <tr><td>Bit 6</td><td><b>PNI</b></td><td>Partial Network Info</td><td>0 / 1</td><td>=1 khi User Data mang thông tin lọc mạng cục bộ (PNC Bitmask); =0 nếu User Data là dữ liệu thường.</td></tr>
              <tr><td>Bit 7</td><td><b>Res7</b></td><td>Reserved Bit 7</td><td>0</td><td>Dự phòng, bắt buộc ghi 0.</td></tr>
            </tbody>
          </table>
        `
      },
      {
        title: "3.3. Cấu Hình Vị Trí Động SNI / CBV (BYTE_0, BYTE_1, OFF)",
        content: `
          <h2>3.3. Cấu Hình Vị Trí Động Của Source Node ID &amp; CBV Trong Khung NM PDU</h2>
          <p>Chuẩn AUTOSAR hỗ trợ cấu hình vị trí linh hoạt để tương thích với các tiêu chuẩn OEM (như Volkswagen, BMW, GM, Stellantis):</p>

          <div style="margin:12px 0; background:var(--code); border:1px solid var(--border); border-radius:8px; padding:12px">
            <div class="mono small" style="font-weight:700; color:#34d399; margin-bottom:8px">📐 SƠ ĐỒ MA TRẬN 3 BỐ CỤC VỊ TRÍ PDU PHỔ BIẾN NHẤT TRONG NGÀNH Ô TÔ</div>
            <pre class="code" style="margin:0; font-size:11px; line-height:1.45">
LAYOUT A (AUTOSAR Chuẩn):      [ Byte 0: SNI ]   [ Byte 1: CBV ]   [ Bytes 2..7: User Data (6 bytes) ]
LAYOUT B (OEM Variant):         [ Byte 0: CBV ]   [ Byte 1: SNI ]   [ Bytes 2..7: User Data (6 bytes) ]
LAYOUT C (Full Payload):        [ OFF: Không NID] [ Byte 0: CBV ]   [ Bytes 1..7: User Data (7 bytes!) ]
            </pre>
          </div>

          <table class="tbl">
            <thead>
              <tr>
                <th style="width:170px">Kiểu Cấu Hình</th>
                <th style="width:170px">Tham Số Cấu Hình ECUC</th>
                <th style="width:160px">Dung Lượng User Data</th>
                <th>Đánh Giá Kỹ Thuật &amp; Kịch Bản Khuyên Dùng</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><b>CANNM_PDU_BYTE_0 / BYTE_1</b></td>
                <td><code>PduNidPosition = BYTE_0</code><br/><code>PduCbvPosition = BYTE_1</code></td>
                <td><b>6 Bytes</b> (Byte 2 .. 7)</td>
                <td><b>Khuyên dùng mặc định:</b> Dễ dàng giải mã bằng các công cụ CANoe/CANalyzer, tương thích 100% chuẩn AUTOSAR R22-11.</td>
              </tr>
              <tr>
                <td><b>CANNM_PDU_BYTE_1 / BYTE_0</b></td>
                <td><code>PduNidPosition = BYTE_1</code><br/><code>PduCbvPosition = BYTE_0</code></td>
                <td><b>6 Bytes</b> (Byte 2 .. 7)</td>
                <td>Áp dụng cho một số dòng xe châu Âu quy định đọc cờ điều khiển mạng ngay tại byte đầu tiên của frame CAN.</td>
              </tr>
              <tr>
                <td><b>CANNM_PDU_OFF</b></td>
                <td><code>PduNidPosition = OFF</code><br/><code>PduCbvPosition = BYTE_0</code></td>
                <td><b>7 Bytes</b> (Byte 1 .. 7)</td>
                <td>Mở rộng tối đa dung lượng User Data (7 bytes). Node ID được xác định trực tiếp thông qua dải CAN ID mở rộng.</td>
              </tr>
            </tbody>
          </table>
        `
      },
      {
        title: "3.4. Cơ Chế Truyền User Data Tự Động Qua PduR & AUTOSAR COM",
        content: `
          <h2>3.4. Cơ Chế Truyền User Data Tự Động Qua PduR &amp; AUTOSAR COM</h2>
          <p>AUTOSAR cho phép tận dụng các byte còn lại của bản tin NM PDU để mang tín hiệu ứng dụng:</p>

          <div style="margin:12px 0; background:var(--code); border:1px solid var(--border); border-radius:8px; padding:12px">
            <div class="mono small" style="font-weight:700; color:#a78bfa; margin-bottom:8px">🔀 SƠ ĐỒ ĐƯỜNG ỐNG DỮ LIỆU USER DATA ROUTING (DATA PIPELINE FLOW)</div>
            <pre class="code" style="margin:0; font-size:11px; line-height:1.45">
[COM Module: Signal Transmission] ──(Tín hiệu ứng dụng: Odo, Speed, Engine Status)──┐
                                                                                     ▼
                                                                     [PduR: PDU Router Routing]
                                                                                     │
                       ┌─────────────────────────────────────────────────────────────┴────────────────────────────────┐
                       ▼ (Đường 1: COM I-PDU thông thường)                                                            ▼ (Đường 2: User Data đóng gói vào NM PDU)
                [CanIf_Transmit]                                                                               [CanNm_Transmit / SetUserData]
                       │                                                                                              │
                       ▼                                                                                              ▼
            [Khung CAN Data Thường]                                                                        [Khung NM PDU: Bytes 2..7]
            </pre>
          </div>

          <table class="tbl">
            <thead>
              <tr>
                <th style="width:180px">Cơ Chế Truyền</th>
                <th style="width:230px">API / Cấu Hình Sử Dụng</th>
                <th>Đặc Điểm Vận Hành &amp; Ưu/Nhược Điểm Kỹ Thuật</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><b>1. Truyền động qua PduR (COM Routing)</b></td>
                <td><code>CanNmComUserDataSupport = TRUE</code><br/>Gọi <code>CanNm_Transmit()</code></td>
                <td><b>Tự động &amp; đồng bộ:</b> Module COM tự động copy tín hiệu mới nhất vào User Data trước mỗi chu kỳ phát bản tin NM. Tiết kiệm băng thông, không cần gửi thêm frame CAN riêng.</td>
              </tr>
              <tr>
                <td><b>2. Ghi tĩnh trực tiếp (Static API)</b></td>
                <td><code>CanNmUserDataEnabled = TRUE</code><br/>Gọi <code>CanNm_SetUserData()</code></td>
                <td><b>Đơn giản:</b> SWC hoặc Dem gọi trực tiếp để ghi dữ liệu mã lỗi hoặc trạng thái xe vào bộ nhớ đệm của CanNM. Dữ liệu sẽ giữ nguyên cho đến khi có lời gọi ghi mới.</td>
              </tr>
            </tbody>
          </table>
        `
      }
    ]
  },

  // =========================================================================
  // TAB 4: THUẬT TOÁN FIG 7-1 & TIMERS
  // =========================================================================
  {
    title: "4. Sơ Đồ Thuật Toán Figure 7-1 & 5 Bộ Định Thời",
    subtopics: [
      {
        title: "4.1. Sơ Đồ Thuật Toán Chuẩn Figure 7-1 (AUTOSAR SWS_CanNm) & Phân Tích Chuyên Sâu",
        content: `
          <h2>4.1. Sơ Đồ Thuật Toán Chuẩn Figure 7-1 (AUTOSAR SWS_CanNm) &amp; Phân Tích Chuyên Sâu</h2>
          <p>Dưới đây là sơ đồ thuật toán chuẩn <b>Figure 7-1: CanNm algorithm</b> trích từ tài liệu đặc tả AUTOSAR SWS_CanNm:</p>

          <div style="background:var(--code); border:1px solid var(--border); border-radius:10px; padding:12px; text-align:center; margin:12px 0">
            <img src="assets/figure_7_1_cannm_algorithm.jpg" alt="Figure 7-1: CanNm Algorithm" style="max-width:100%; height:auto; border-radius:6px; box-shadow:0 4px 16px rgba(0,0,0,.4)" onerror="this.onerror=null; this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'400\\' height=\\'120\\'><rect width=\\'400\\' height=\\'120\\' fill=\\'%23111827\\'/><text x=\\'200\\' y=\\'65\\' fill=\\'%2338bdf8\\' font-size=\\'14\\' text-anchor=\\'middle\\'>Figure 7-1: CanNm Algorithm (SWS_CanNm)</text></svg>'">
            <div class="muted small" style="margin-top:6px">Hình 7-1: Lưu đồ thuật toán máy trạng thái phân tán CanNM chuẩn AUTOSAR</div>
          </div>

          <div style="margin-top:16px; background:var(--panel2); border-left:4px solid #f87171; border-radius:0 8px 8px 0; padding:12px 16px">
            <div class="mono" style="font-weight:800; font-size:13px; color:#f87171; margin-bottom:6px">
              🔍 PHÂN TÍCH CHUYÊN SÂU: NHẬN CanNm_RxIndication() KHI ECU ĐANG Ở BUS-SLEEP MODE
            </div>
            <p style="margin-top:0; color:var(--text)">Trong sơ đồ Figure 7-1, tại khối <b>Bus-Sleep Mode</b>, có một nhánh rẽ điều kiện: <code>CanNm_RxIndication called?</code> dẫn đến hành động <code>Nm_NetworkStartIndication()</code> và <b>mũi tên quay vòng ngược lại chính nó (Loopback Arrow)</b>. Đây là một trong những điểm đặc biệt nhất trong kiến trúc AUTOSAR:</p>

            <table class="tbl" style="margin-top:8px">
              <thead>
                <tr>
                  <th style="width:180px">Khía Cạnh Phân Tích</th>
                  <th>Giải Thích Kỹ Thuật Chi Tiết &amp; Căn Cứ Chuẩn AUTOSAR</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><b>1. Khái niệm (Concept): Tại sao ở Bus-Sleep lại nhận được RxIndication?</b></td>
                  <td>
                    Bình thường khi ECU ngủ ở Bus-Sleep Mode, CAN Controller ở trạng thái <code>SLEEP</code> và Transceiver ở <code>STANDBY</code>. Quá trình đánh thức chuẩn bắt đầu từ ngắt phần cứng ➔ EcuM kiểm tra nguồn đánh thức (Wakeup Validation) ➔ CanSM khởi động Controller ➔ ComM gọi <code>CanNm_PassiveStartUp()</code>.<br/>
                    Tuy nhiên, khi một ECU khác trên bus phát bản tin NM PDU trước khi ComM kịp gọi lệnh, khung CAN này được CanIf tiếp nhận và chuyển tiếp lên <code>CanNm_RxIndication()</code> trong lúc CanNM <b>vẫn đang ở <code>NM_MODE_BUS_SLEEP</code></b>.<br/>
                    Theo <b>SWS_CanNm_00336</b>, đây được phân loại là một <b>Runtime Error: <code>CANNM_E_NET_START_IND (0x04)</code></b>. CanNM không được nuốt gói tin này mà bắt buộc phải gọi callback <b><code>Nm_NetworkStartIndication()</code></b> (SWS_CanNm_00127) báo lên Nm ➔ ComM.
                  </td>
                </tr>
                <tr>
                  <td><b>2. Trạng thái đích (Destination State)</b></td>
                  <td>
                    <b>ĐÍCH ĐẾN VẪN LÀ: <code>NM_MODE_BUS_SLEEP</code>!</b><br/>
                    CanNM <b>TUYỆT ĐỐI KHÔNG TỰ Ý CHUYỂN SANG NETWORK MODE</b> tại thời điểm này. Module chỉ thực hiện thông báo sự kiện rồi tiếp tục ở lại Bus-Sleep Mode.
                  </td>
                </tr>
                <tr>
                  <td><b>3. Vì sao mũi tên trong Figure 7-1 lại quay vòng (Loopback Arrow)?</b></td>
                  <td>
                    <b>Lý do 1 — Nguyên tắc phân quyền kiến trúc (Architectural Decoupling):</b> CanNM là module thừa hành, không có quyền quyết định chính sách ECU được phép thức hay không. Quyền tối cao thuộc về <b>ComM (Communication Manager)</b> và <b>EcuM (ECU State Manager)</b>.<br/>
                    <b>Lý do 2 — Hạ tầng BSW chưa sẵn sàng:</b> Tại thời điểm đó, CanSM có thể chưa hoàn tất chuyển Controller sang <code>CAN_CS_STARTED</code>, Transceiver chưa sang <code>NORMAL</code>, PduR chưa bật routing, COM chưa mở IPDU Group. Nếu CanNM tự nhảy sang Network Mode và phát bản tin, hệ thống sẽ crash hoặc tràn buffer phần cứng.<br/>
                    <b>Lý do 3 — Cơ chế bắt tay 2 chiều (Handshake Flow):</b><br/>
                    • <i>Chiều lên:</i> CanNM gọi <code>Nm_NetworkStartIndication()</code> ➔ ComM ghi nhận sự kiện có sóng trên bus.<br/>
                    • <i>Chiều xuống:</i> ComM kiểm tra điều kiện an toàn, phối hợp CanSM bật Controller, rồi <b>ComM mới chính thức gọi xuống <code>Nm_PassiveStartUp()</code> ➔ <code>CanNm_PassiveStartUp()</code></b>.<br/>
                    <b>CHÍNH LỜI GỌI <code>CanNm_PassiveStartUp()</code> NÀY MỚI LÀ MŨI TÊN ĐƯA CanNM SANG NETWORK MODE (Repeat Message State)!</b>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style="margin-top:14px; background:var(--code); border:1px solid var(--border); border-radius:8px; padding:10px">
            <div class="mono small" style="font-weight:700; color:#38bdf8; margin-bottom:6px">🔄 SƠ ĐỒ TUẦN TỰ GIẢI THÍCH MŨI TÊN QUAY VÒNG (SEQUENCE FLOW):</div>
            <pre class="code" style="margin:0; font-size:11px; line-height:1.45">
CAN Bus                 CanIf                 CanNM (Bus-Sleep)           Nm / ComM              CanSM
   │                      │                          │                        │                    │
   ├──(Khung NM PDU)─────►│                          │                        │                    │
   │                      ├──CanNm_RxIndication()───►│                        │                    │
   │                      │                          ├─(CANNM_E_NET_START_IND)│                    │
   │                      │                          ├──Nm_NetStartInd()─────►│                    │
   │                      │                          │                        │                    │
   │                      │                          │ [MŨI TÊN QUAY VÒNG]    │                    │
   │                      │                          │ Vẫn ở Bus-Sleep Mode!  │                    │
   │                      │                          │                        ├──CanSM_Request()──►│ (Bật HW)
   │                      │                          │                        │                    │
   │                      │                          │◄──Nm_PassiveStartUp()──┤ (Lệnh chính thức!) │
   │                      │                          │                        │                    │
   │                      │                          ▼ [MŨI TÊN ĐI THỰC SỰ]   │                    │
   │                      │                          Vào REPEAT_MESSAGE State!│                    │
            </pre>
          </div>
        `
      },
      {
        title: "4.2. Phân Tích 5 Bộ Định Thời Cốt Lõi & Điều Kiện Nạp Lại (Reload)",
        content: `
          <h2>4.2. Phân Tích 5 Bộ Định Thời Cốt Lõi Của CanNM</h2>
          <p>5 bộ đếm thời gian này là "nhịp tim" duy trì sự sống và ổn định của mạng CanNM:</p>

          <div style="margin:12px 0; background:var(--code); border:1px solid var(--border); border-radius:8px; padding:12px">
            <div class="mono small" style="font-weight:700; color:#fbbf24; margin-bottom:8px">⚙️ SƠ ĐỒ ĐỒNG HỒ 5 BỘ ĐỊNH THỜI CỐT LÕI (5-GEAR TIMING CLOCKWORK)</div>
            <pre class="code" style="margin:0; font-size:11px; line-height:1.45">
[Network Mode] ══════════════════════════════════════════════════════════════════════════╗
  ║ 1. CanNmTimeoutTime (2000ms): Đồng hồ sinh tử toàn mạng (Reload khi có Tx/Rx)        ║
  ║ 2. CanNmRepeatMessageTime (1500ms): Cửa sổ đóng băng bắt buộc tại Repeat Message     ║
  ║ 3. CanNmMsgCycleTime (1000ms): Chu kỳ phát bản tin NM định kỳ                        ║
  ║ 4. CanNmMsgTimeoutTime (500ms): Giám sát lỗi nghẽn TxConfirmation phần cứng           ║
╚══════════════════════════════════════════════════════════════════════════════════════════╝
                                  │ Chạm 0ms
                                  ▼
[Prepare Bus-Sleep] ═════════════════════════════════════════════════════════════════════╗
  ║ 5. CanNmWaitBusSleepTime (1500ms): Bộ đếm thời gian đệm trước khi tắt Controller     ║
╚══════════════════════════════════════════════════════════════════════════════════════════╝
            </pre>
          </div>

          <table class="tbl">
            <thead>
              <tr>
                <th style="width:160px">Bộ Định Thời (Timer)</th>
                <th style="width:130px">Giá Trị Cấu Hình</th>
                <th style="width:220px">Điều Kiện Nạp Lại (Reload Trigger)</th>
                <th style="width:130px">Trạng Thái Chạy</th>
                <th>Hậu Quả Kỹ Thuật Khi Chạm Mốc 0 ms</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><b>1. CanNmTimeoutTime</b></td>
                <td><code>2000 ms</code></td>
                <td>Nhận được bất kỳ bản tin NM PDU (Rx) hoặc phát thành công (Tx).</td>
                <td>Cả 3 trạng thái của Network Mode</td>
                <td>Hết giờ giữ mạng! Nếu đang ở Ready Sleep thì chuyển sang <b>Prepare Bus-Sleep Mode</b>.</td>
              </tr>
              <tr>
                <td><b>2. CanNmRepeatMessageTime</b></td>
                <td><code>1500 ms</code></td>
                <td>Vào Repeat Message State do Wakeup, Restart hoặc nhận RMR=1.</td>
                <td>Chỉ ở Repeat Message State</td>
                <td>Hết thời gian phát lặp. Tùy cờ <code>NetworkRequested</code> để rẽ sang <b>Normal Operation</b> hoặc <b>Ready Sleep</b>.</td>
              </tr>
              <tr>
                <td><b>3. CanNmMsgCycleTime</b></td>
                <td><code>1000 ms</code></td>
                <td>Sau mỗi lần phát thành công khung NM PDU (Tx Confirmation).</td>
                <td>Repeat Message, Normal Operation</td>
                <td>Đến hạn phát bản tin NM PDU tiếp theo lên bus.</td>
              </tr>
              <tr>
                <td><b>4. CanNmWaitBusSleepTime</b></td>
                <td><code>1500 ms</code></td>
                <td>Vào Prepare Bus-Sleep Mode từ Ready Sleep State.</td>
                <td>Chỉ ở Prepare Bus-Sleep</td>
                <td>Hết thời gian đệm an toàn! CanNM gọi <code>Nm_BusSleepMode()</code> cho phép ComM tắt phần cứng.</td>
              </tr>
              <tr>
                <td><b>5. CanNmMsgTimeoutTime</b></td>
                <td><code>500 ms</code></td>
                <td>Bắt đầu gọi <code>CanIf_Transmit()</code>.</td>
                <td>Khi đang chờ TxConfirmation</td>
                <td>Lỗi phần cứng CAN Transmit Timeout! Báo <code>Nm_TxTimeoutException()</code> lên ComM.</td>
              </tr>
            </tbody>
          </table>
        `
      },
      {
        title: "4.3. Quy Tắc Ràng Buộc Timing Bắt Buộc Trong Thực Tế Dự Án",
        content: `
          <h2>4.3. Quy Tắc Ràng Buộc Timing Bắt Buộc Trong Thực Tế Dự Án</h2>
          <p>Nếu cấu hình các bộ định thời sai quy tắc bất đẳng thức, mạng sẽ bị sập sớm hoặc không thể đi ngủ:</p>

          <div style="margin:12px 0; background:var(--code); border:1px solid var(--border); border-radius:8px; padding:12px">
            <div class="mono small" style="font-weight:700; color:#f87171; margin-bottom:8px">📐 SƠ ĐỒ KHOẢNG ĐỆM AN TOÀN TIMING (TIMELINE SAFETY MARGIN)</div>
            <pre class="code" style="margin:0; font-size:11px; line-height:1.45">
0ms                  1000ms (MsgCycleTime)        1500ms (Safety Margin)       2000ms (TimeoutTime)
├───────────────────────┼────────────────────────────┼────────────────────────────┤
▲                       ▲                            ▲                            ▲
Phát Tx #1              Hạn phát Tx #2               Khoảng đệm chống mất gói    Hạn chót sập mạng nếu mất tin!
                                                     (Tx Jitter + Drop Frame)
            </pre>
          </div>

          <table class="tbl">
            <thead>
              <tr>
                <th style="width:220px">Quy Tắc Bất Đẳng Thức</th>
                <th style="width:180px">Công Thức Chuẩn AUTOSAR</th>
                <th>Lý Do Kỹ Thuật &amp; Rủi Ro Dự Án Nếu Vi Phạm</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><b>Quy tắc 1: Timeout &gt; CycleTime</b></td>
                <td><code>CanNmTimeoutTime &gt; CanNmMsgCycleTime + CanNmMsgCycleOffset + Margin</code></td>
                <td><b>Sống còn:</b> Đảm bảo nếu một gói NM bị trễ do tranh chấp bus (Arbitration Jitter) hoặc bị mất 1 gói, mạng vẫn không bị đếm hết timeout để sập nhầm vào Bus-Sleep.</td>
              </tr>
              <tr>
                <td><b>Quy tắc 2: RepeatTime &gt; MsgCycle</b></td>
                <td><code>CanNmRepeatMessageTime &gt;= 2 * CanNmMsgCycleTime</code></td>
                <td>Đảm bảo trong suốt pha Repeat Message, node phát được <b>ít nhất 2 bản tin NM PDU</b> lên bus để khẳng định sự hiện diện.</td>
              </tr>
              <tr>
                <td><b>Quy tắc 3: WaitSleepTime an toàn</b></td>
                <td><code>CanNmWaitBusSleepTime &gt;= 1500 ms</code></td>
                <td>Thời gian để các ECU khác hoàn tất ghi dữ liệu NVM (Non-Volatile Memory) vào Flash/EEPROM trước khi cắt hoàn toàn nguồn V_BAT.</td>
              </tr>
            </tbody>
          </table>
        `
      },
      {
        title: "4.4. Cơ Chế Immediate Burst Tx & Bus Load Reduction",
        content: `
          <h2>4.4. Cơ Chế Immediate Burst Tx &amp; Bus Load Reduction</h2>
          <p>Cân bằng giữa tốc độ đánh thức tức thì và kiểm soát tải mạng CAN:</p>

          <div style="margin:12px 0; background:var(--code); border:1px solid var(--border); border-radius:8px; padding:12px">
            <div class="mono small" style="font-weight:700; color:#38bdf8; margin-bottom:8px">⚡ LƯU ĐỒ THUẬT TOÁN BURST TX &amp; BUS LOAD REDUCTION</div>
            <pre class="code" style="margin:0; font-size:11px; line-height:1.45">
[Active Wakeup Event] ──► [CanNmImmediateNmTransmissions &gt; 0?]
                                    │
                    ┌───────────────┴───────────────┐
                    ▼ CÓ                            ▼ KHÔNG
          Bắn ngay gói Tx #1 tại t=0ms       Đợi CanNmMsgCycleOffset (100ms)
          Đặt chu kỳ = ImmediateNmCycle(20ms) Đặt chu kỳ = CanNmMsgCycleTime(1000ms)
                    │                               │
                    ▼                               ▼
          Bắn hết N gói Burst?               Phát định kỳ bình thường
                    │                               │
                    ▼                               │
          Chuyển sang MsgCycle bình thường ◄────────┘
            </pre>
          </div>

          <table class="tbl">
            <thead>
              <tr>
                <th style="width:160px">Chế Độ</th>
                <th style="width:190px">Cấu Hình ECUC</th>
                <th style="width:140px">Chu Kỳ Phát</th>
                <th>Hiệu Quả &amp; Khuyến Cáo Sử Dụng</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><b>Immediate Burst Tx</b></td>
                <td><code>CanNmImmediateNmTransmissions = 3</code><br/><code>CanNmImmediateNmCycleTime = 20ms</code></td>
                <td><b>20 ms</b> (bắn 3 gói)</td>
                <td>Rút ngắn thời gian khởi động mạng từ 1000ms xuống chỉ còn <b>40ms</b>. Áp dụng cho các ECU quan trọng (Gateway, BCM, VCU).</td>
              </tr>
              <tr>
                <td><b>Bus Load Reduction</b></td>
                <td><code>CanNmBusLoadReductionEnabled = TRUE</code></td>
                <td>Giảm chu kỳ khi bus yên lặng</td>
                <td>Tự động kéo dài chu kỳ phát khi không có sự thay đổi dữ liệu User Data, giúp tiết kiệm 40% băng thông bus.</td>
              </tr>
            </tbody>
          </table>
        `
      }
    ]
  },

  // =========================================================================
  // TAB 5: PARTIAL NETWORKING (PN)
  // =========================================================================
  {
    title: "5. Quản Lý Mạng Cục Bộ Partial Networking (PN)",
    subtopics: [
      {
        title: "5.1. Nguyên Lý Partial Networking (ISO 11898-6) & Bộ Lọc PN Mask",
        content: `
          <h2>5.1. Nguyên Lý Partial Networking (ISO 11898-6) &amp; Bộ Lọc PN Mask</h2>
          <p>Partial Networking (Mạng cục bộ bán phần) cho phép chỉ đánh thức các ECU thuộc cụm chức năng có nhu cầu hoạt động:</p>

          <div style="margin:12px 0; background:var(--code); border:1px solid var(--border); border-radius:8px; padding:12px">
            <div class="mono small" style="font-weight:700; color:#38bdf8; margin-bottom:8px">🌐 SƠ ĐỒ CỤM MẠNG CỤC BỘ TRÊN XE (PARTIAL NETWORK CLUSTERS TOPOLOGY)</div>
            <pre class="code" style="margin:0; font-size:11px; line-height:1.45">
[CAN BUS XE] ═════════════════════════════════════════════════════════════════════════════════
                      │                                  │                                  │
       ┌──────────────┴──────────────┐    ┌──────────────┴──────────────┐    ┌──────────────┴──────────────┐
       │   PNC #1: CỤM SƯỞI GHẾ      │    │   PNC #2: CỤM ĐÈN CHIẾU     │    │   PNC #3: CỤM SẠC PIN (EV)  │
       │   • Ghế lái (ECU_SeatL)     │    │   • Đèn trước (ECU_HeadL)   │    │   • Bộ sạc On-Board (OBC)   │
       │   • Ghế phụ (ECU_SeatR)     │    │   • Đèn sau (ECU_TailL)     │    │   • Quản lý pin (BMS)       │
       └─────────────────────────────┘    └─────────────────────────────┘    └─────────────────────────────┘
       • Khi cắm sạc xe điện ban đêm: CHỈ CÓ PNC #3 THỨC DẬY! PNC #1 và PNC #2 VẪN NGỦ SAY &lt; 100 µA!
            </pre>
          </div>

          <table class="tbl">
            <thead>
              <tr>
                <th style="width:160px">Tiêu Chí Kỹ Thuật</th>
                <th style="width:230px">Nguyên Lý Bitwise PN Filter Mask</th>
                <th>Ý Nghĩa Kỹ Thuật &amp; Căn Cứ Chuẩn ISO 11898-6</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><b>Thuật toán lọc PN</b></td>
                <td><code>(RxPnInfoByte &amp; PnFilterMaskByte) != 0</code></td>
                <td>CanNM thực hiện phép AND từng bit giữa Byte PN Info nhận được từ bus với Mask được cấu hình nội bộ của node. Nếu kết quả khác 0 ➔ Bản tin có liên quan đến ECU này!</td>
              </tr>
              <tr>
                <td><b>Transceiver hỗ trợ PN</b></td>
                <td>CAN Transceiver hỗ trợ <b>Selective Wakeup</b> (ISO 11898-6)</td>
                <td>Transceiver phần cứng có bộ giải mã frame độc lập, chỉ kích hoạt chân WAKE khi nhận đúng frame có cờ PNC tương ứng.</td>
              </tr>
            </tbody>
          </table>
        `
      },
      {
        title: "5.2. Cơ Chế Tính Toán ERA / EIRA & Bộ Đếm CanNmPnResetTime",
        content: `
          <h2>5.2. Cơ Chế Tính Toán ERA / EIRA &amp; Bộ Đếm CanNmPnResetTime</h2>
          <p>Phân biệt 2 luồng đánh giá nhu cầu cụm mạng cục bộ trong AUTOSAR CanNM:</p>

          <div style="margin:12px 0; background:var(--code); border:1px solid var(--border); border-radius:8px; padding:12px">
            <div class="mono small" style="font-weight:700; color:#fbbf24; margin-bottom:8px">🔀 SƠ ĐỒ ĐƯỜNG ỐNG ĐÁNH GIÁ NHU CẦU CỤM MẠNG: EIRA VS ERA</div>
            <pre class="code" style="margin:0; font-size:11px; line-height:1.45">
Bản tin NM Rx từ bus ──► [Bộ lọc PN Mask] ──► [EIRA: External + Internal Requests] ──► ComM PNC State Machine
                                            ▲
Nhu cầu nội bộ từ SWC ──────────────────────┘

Kênh CAN Gateway ──────► [Bộ lọc Gateway] ──► [ERA: External Requests Only] ────────► ComM Router Gateway
            </pre>
          </div>

          <table class="tbl">
            <thead>
              <tr>
                <th style="width:140px">Khái Niệm</th>
                <th style="width:200px">Tên Tiếng Anh Chuẩn</th>
                <th>Mục Đích Sử Dụng &amp; Cơ Chế Vận Hành</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><b>EIRA</b></td>
                <td>External / Internal Requests Aggregated</td>
                <td>Tập hợp tất cả các yêu cầu PNC từ cả bên ngoài (nhận qua bus CAN) và bên trong (từ ứng dụng SWC nội bộ). Quyết định ECU có cần thức hay không.</td>
              </tr>
              <tr>
                <td><b>ERA</b></td>
                <td>External Requests Aggregated</td>
                <td>Chỉ tính toán các yêu cầu PNC từ bên ngoài nhận qua bus. Dùng cho các nút Gateway để quyết định có cần chuyển tiếp sóng sang kênh bus khác hay không.</td>
              </tr>
              <tr>
                <td><b>CanNmPnResetTime</b></td>
                <td>Bộ đếm thời gian sống của PNC (ví dụ: <code>1500 ms</code>)</td>
                <td>Mỗi khi nhận được cờ PNC, bộ đếm được nạp lại. Nếu sau 1500ms không còn ai yêu cầu PNC đó nữa, CanNM thông báo cho ComM biết cụm PNC này đã hết nhu cầu.</td>
              </tr>
            </tbody>
          </table>
        `
      },
      {
        title: "5.3. Đồng Bộ Tắt PNC (Synchronized PNC Shutdown — R20-11/R22-11)",
        content: `
          <h2>5.3. Đồng Bộ Tắt PNC (Synchronized PNC Shutdown — R20-11/R22-11)</h2>
          <p>Cơ chế mới được bổ sung từ AUTOSAR R20-11 giúp ngăn ngừa hiện tượng một ECU tắt PNC trước trong khi ECU khác vẫn đang phát dở dữ liệu:</p>

          <div style="margin:12px 0; background:var(--code); border:1px solid var(--border); border-radius:8px; padding:12px">
            <div class="mono small" style="font-weight:700; color:#34d399; margin-bottom:8px">⏱️ SƠ ĐỒ BẮT TAY ĐỒNG BỘ TẮT CỤM MẠNG (PNC SHUTDOWN HANDSHAKE SEQUENCE)</div>
            <pre class="code" style="margin:0; font-size:11px; line-height:1.45">
ECU #1 (PNC Coordinator)                                           ECU #2 (PNC Client)
         │                                                                   │
         ├──(Phát NM PDU: Cờ PNC = 0, Cờ CSR = 1: Báo chuẩn bị tắt)────────►│
         │                                                                   ├─ Nhận tin, chuẩn bị tắt App
         │                                                                   │
         ├──(Đợi hết khoảng thời gian CanNmPnResetTime)──────────────────────┤
         │                                                                   │
         ▼                                                                   ▼
[TẮT ĐỒNG THỜI CỤM PNC #1 TRÊN CẢ 2 ECU MÀ KHÔNG GÂY LỖI TRUYỀN THÔNG DỮ LIỆU!]
            </pre>
          </div>

          <table class="tbl">
            <thead>
              <tr>
                <th style="width:150px">Giai Đoạn</th>
                <th style="width:230px">Hành Động Của CanNM &amp; ComM</th>
                <th>Ý Nghĩa Kỹ Thuật Đảm Bảo Tính Toàn Vẹn Hệ Thống</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><b>Giai đoạn 1: Báo hiệu</b></td>
                <td>Nút Coordinator hạ cờ PNC trong bản tin NM PDU và bật bit CSR = 1.</td>
                <td>Thông báo cho các ECU khác trong cụm biết chu trình hoạt động của PNC đã kết thúc.</td>
              </tr>
              <tr>
                <td><b>Giai đoạn 2: Đếm lùi</b></td>
                <td>Các ECU giữ trạng thái PNC trong thời gian <code>CanNmPnResetTime</code>.</td>
                <td>Cho phép các thông điệp dữ liệu ứng dụng (Application Messages) đang nằm trong hàng đợi CAN buffer kịp phát hết.</td>
              </tr>
              <tr>
                <td><b>Giai đoạn 3: Tắt đồng loạt</b></td>
                <td>ComM ra lệnh khóa I-PDU Group của cụm PNC tương ứng.</td>
                <td>Cụm PNC đi vào giấc ngủ đồng loạt mà không tạo ra bất kỳ lỗi Timeout Communication nào trên bus.</td>
              </tr>
            </tbody>
          </table>
        `
      },
      {
        title: "5.4. Đánh Thức Toàn Xe (Car Wakeup CSR) & Remote Sleep Indication",
        content: `
          <h2>5.4. Đánh Thức Toàn Xe (Car Wakeup CSR) &amp; Remote Sleep Indication</h2>
          <p>Các tính năng cao cấp phục vụ cho kiểm soát đồng bộ mạng:</p>

          <div style="margin:12px 0; background:var(--code); border:1px solid var(--border); border-radius:8px; padding:12px">
            <div class="mono small" style="font-weight:700; color:#f87171; margin-bottom:8px">📢 SƠ ĐỒ ĐÁNH THỨC TOÀN XE (CAR WAKEUP BROADCAST CASCADE)</div>
            <pre class="code" style="margin:0; font-size:11px; line-height:1.45">
[Khóa cửa thông minh / Cảnh báo trộm] ──► Bắn NM PDU có Byte CarWakeup = 0x55
                                                 │
                                                 ▼
      ══════════════════════════════════════════════════════════════════════════
                                 CAN BUS TOÀN XE
      ══════════════════════════════════════════════════════════════════════════
              │                                  │                   │
              ▼                                  ▼                   ▼
      [Đánh thức ECU Đèn]                [Đánh thức Còi hú]  [Đánh thức Gateway]
            </pre>
          </div>

          <table class="tbl">
            <thead>
              <tr>
                <th style="width:170px">Tính Năng</th>
                <th style="width:210px">Tham Số Cấu Hình ECUC</th>
                <th>Mô Tả Chức Năng Kỹ Thuật</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><b>Car Wakeup (CWU)</b></td>
                <td><code>CanNmCarWakeUpBytePosition</code><br/><code>CanNmCarWakeUpFilterValue</code></td>
                <td>Cho phép 1 nút (như Chống trộm, Phanh khẩn cấp) đánh thức toàn bộ các ECU trên xe bất kể ECU đó có thuộc cụm PN hay không.</td>
              </tr>
              <tr>
                <td><b>Remote Sleep Indication</b></td>
                <td><code>CanNmRemoteSleepIndTime</code><br/>(ví dụ: <code>1000 ms</code>)</td>
                <td>Báo hiệu cho ứng dụng biết rằng <b>tất cả các ECU khác trên bus đều đã sẵn sàng đi ngủ</b> (chỉ còn lại mỗi ECU này đang giữ mạng).</td>
              </tr>
            </tbody>
          </table>
        `
      }
    ]
  },

  // =========================================================================
  // TAB 6: TỪ ĐIỂN API & ECUC
  // =========================================================================
  {
    title: "6. Từ Điển API & Bảng Cấu Hình ECUC CanNM",
    subtopics: [
      {
        title: "6.1. Bảng API Chuẩn CanNM (Standard & Control APIs)",
        content: `
          <h2>6.1. Bảng Từ Điển API Chuẩn CanNM (AUTOSAR Classic R22-11)</h2>
          <p>Danh sách các API chuẩn được gọi bởi các module tầng trên (ComM, Nm Interface):</p>

          <div style="margin:12px 0; background:var(--code); border:1px solid var(--border); border-radius:8px; padding:12px">
            <div class="mono small" style="font-weight:700; color:#38bdf8; margin-bottom:8px">🔄 SƠ ĐỒ VÒNG ĐỜI GỌI API THEO CHU TRÌNH SỐNG CỦA CANNM</div>
            <pre class="code" style="margin:0; font-size:11px; line-height:1.45">
[Khởi động BSW] ──► CanNm_Init(&amp;Config)
                          │
                          ▼
[Yêu cầu mạng] ──► CanNm_NetworkRequest() / CanNm_PassiveStartUp()
                          │
                          ▼
[Chu kỳ vận hành] ──► CanNm_MainFunction() (100ms) ◄──► CanNm_SetUserData()
                          │
                          ▼
[Nhả mạng đi ngủ] ──► CanNm_NetworkRelease() ──► Chờ ngủ ──► CanNm_DeInit()
            </pre>
          </div>

          <table class="tbl">
            <thead>
              <tr>
                <th style="width:210px">Tên Hàm API</th>
                <th style="width:140px">Tham Số Truyền Vào</th>
                <th style="width:90px">Trả Về</th>
                <th style="width:120px">Module Gọi</th>
                <th>Mô Tả Chức Năng Kỹ Thuật</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><code>CanNm_Init(const ConfigPtr)</code></td><td>Con trỏ cấu hình</td><td>void</td><td>EcuM / BswM</td><td>Khởi tạo module CanNM, đưa các biến và timer về giá trị mặc định.</td></tr>
              <tr><td><code>CanNm_DeInit()</code></td><td>void</td><td>void</td><td>BswM</td><td>Hủy khởi tạo module khi ECU chuẩn bị tắt nguồn hoàn toàn.</td></tr>
              <tr><td><code>CanNm_NetworkRequest(nmChannel)</code></td><td>NetworkHandleType</td><td>Std_ReturnType</td><td>Nm ➔ ComM</td><td>Yêu cầu giữ mạng (Active Wakeup), đưa module vào Repeat Message / Normal Operation.</td></tr>
              <tr><td><code>CanNm_NetworkRelease(nmChannel)</code></td><td>NetworkHandleType</td><td>Std_ReturnType</td><td>Nm ➔ ComM</td><td>Nhả mạng, cho phép module chuyển từ Normal Operation sang Ready Sleep.</td></tr>
              <tr><td><code>CanNm_PassiveStartUp(nmChannel)</code></td><td>NetworkHandleType</td><td>Std_ReturnType</td><td>Nm ➔ ComM</td><td>Khởi động mạng thụ động khi nhận được sóng CAN từ bus ngoài.</td></tr>
              <tr><td><code>CanNm_MainFunction()</code></td><td>void (kênh 0)</td><td>void</td><td>SchM / OS Task</td><td>Hàm chu kỳ (mặc định 100ms), xử lý đếm lùi các Timer và logic chuyển state.</td></tr>
              <tr><td><code>CanNm_SetUserData(nmChannel, ptr)</code></td><td>Kênh, con trỏ mảng</td><td>Std_ReturnType</td><td>SWC / COM</td><td>Cập nhật User Data tĩnh để truyền đi trong các bản tin NM tiếp theo.</td></tr>
              <tr><td><code>CanNm_GetUserData(nmChannel, ptr)</code></td><td>Kênh, con trỏ đích</td><td>Std_ReturnType</td><td>SWC / COM</td><td>Đọc User Data nhận được từ bản tin NM PDU mới nhất của bus.</td></tr>
              <tr><td><code>CanNm_GetState(nmChannel, state, mode)</code></td><td>Kênh, 2 con trỏ</td><td>Std_ReturnType</td><td>Nm / Diagnostic</td><td>Lấy trạng thái con và chế độ vận hành hiện tại của module.</td></tr>
              <tr><td><code>CanNm_RepeatMessageRequest(nmChannel)</code></td><td>NetworkHandleType</td><td>Std_ReturnType</td><td>Nm / Tester</td><td>Yêu cầu phát bản tin có bit RMR = 1 để ép các node khác báo danh.</td></tr>
            </tbody>
          </table>
        `
      },
      {
        title: "6.2. Bảng Callback & Callout (CanIf, PduR, Nm, CanSM)",
        content: `
          <h2>6.2. Bảng Callback &amp; Callout Chuẩn AUTOSAR CanNM</h2>
          <p>Giao diện tiếp nhận sự kiện từ driver phần cứng và thông báo ngược lên tầng trên:</p>

          <div style="margin:12px 0; background:var(--code); border:1px solid var(--border); border-radius:8px; padding:12px">
            <div class="mono small" style="font-weight:700; color:#fbbf24; margin-bottom:8px">📡 SƠ ĐỒ ĐIỀU PHỐI CALLBACK (CALLBACK DISPATCHER PIPELINE)</div>
            <pre class="code" style="margin:0; font-size:11px; line-height:1.45">
[CanIf Driver] ──(CanNm_RxIndication)──────► [ CanNM Engine ] ──(Nm_NetworkMode)──────────► [Nm / ComM]
[CanIf Driver] ──(CanNm_TxConfirmation)────► [ Máy Trạng Thái ] ──(Nm_BusSleepMode)─────────► [Nm / ComM]
[PduR Router]  ◄──(CanNm_TriggerTransmit)─── [ Quản Lý Timers ] ──(Nm_StateChangeNotif)─────► [Nm / ComM]
            </pre>
          </div>

          <table class="tbl">
            <thead>
              <tr>
                <th style="width:230px">Tên Hàm Callback / Callout</th>
                <th style="width:130px">Module Gọi Đến</th>
                <th style="width:140px">Thời Điểm Kích Hoạt</th>
                <th>Hành Vi Xử Lý Kỹ Thuật Chi Tiết</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><code>CanNm_RxIndication(RxPduId, PduInfo)</code></td><td>CanIf</td><td>Khi nhận khung NM PDU từ bus</td><td>Kiểm tra PDU ID, trích xuất SNI/CBV, reload TimeoutTimer, xử lý cờ RMR và PN Mask.</td></tr>
              <tr><td><code>CanNm_TxConfirmation(TxPduId, result)</code></td><td>CanIf</td><td>Khi CAN Controller phát xong</td><td>Xác nhận phát thành công, nạp lại MsgCycleTimer, reload TimeoutTimer.</td></tr>
              <tr><td><code>CanNm_TriggerTransmit(TxPduId, PduInfo)</code></td><td>CanIf</td><td>Trước thời điểm phát gói</td><td>Hỏi PduR/COM để copy User Data mới nhất vào buffer trước khi đẩy xuống transceiver.</td></tr>
              <tr><td><code>Nm_StateChangeNotification(...)</code></td><td>CanNM gọi lên Nm</td><td>Khi đổi Mode hoặc State</td><td>Thông báo cho Nm và ComM biết trạng thái mới của kênh mạng.</td></tr>
              <tr><td><code>Nm_NetworkMode(nmNetworkHandle)</code></td><td>CanNM gọi lên Nm</td><td>Khi vào Network Mode</td><td>ComM bật cho phép giao tiếp ứng dụng (I-PDU Group).</td></tr>
              <tr><td><code>Nm_BusSleepMode(nmNetworkHandle)</code></td><td>CanNM gọi lên Nm</td><td>Khi hết WaitBusSleepTime</td><td>ComM ra lệnh cho CanSM tắt phần cứng Controller.</td></tr>
            </tbody>
          </table>
        `
      },
      {
        title: "6.3. Bảng Mã Lỗi DET & Runtime Errors (CANNM_E_*)",
        content: `
          <h2>6.3. Bảng Mã Lỗi DET &amp; Runtime Errors (CANNM_E_*)</h2>
          <p>Mã lỗi được quy định trong chuẩn AUTOSAR SWS_CanNm để ghi nhận qua Det_ReportError hoặc Det_ReportRuntimeError:</p>

          <div style="margin:12px 0; background:var(--code); border:1px solid var(--border); border-radius:8px; padding:12px">
            <div class="mono small" style="font-weight:700; color:#f87171; margin-bottom:8px">🚨 SƠ ĐỒ BẪY LỖI &amp; BÁO CÁO DET (ERROR TRAPPING &amp; REPORTING)</div>
            <pre class="code" style="margin:0; font-size:11px; line-height:1.45">
[CanNM API Call] ──► [Kiểm tra Init? / Con trỏ NULL? / Sai Kênh?]
                           │ Có lỗi
                           ▼
                  [Det_ReportError(ModuleID=31, Instance=0, ApiID, ErrorCode)]
                           │
                           ▼
                  [Ghi nhận vào RAM Freeze Frame / Báo lỗi chẩn đoán Dcm]
            </pre>
          </div>

          <table class="tbl">
            <thead>
              <tr>
                <th style="width:100px">Mã Lỗi Hex</th>
                <th style="width:230px">Tên Lỗi Chuẩn AUTOSAR</th>
                <th style="width:130px">Phân Loại</th>
                <th>Nguyên Nhân Kích Hoạt &amp; Cách Khắc Phục Kỹ Thuật</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><code>0x01</code></td><td><b>CANNM_E_UNINIT</b></td><td>Development Error</td><td>Gọi bất kỳ API nào khi CanNM chưa được khởi tạo qua <code>CanNm_Init()</code>.</td></tr>
              <tr><td><code>0x02</code></td><td><b>CANNM_E_INVALID_CHANNEL</b></td><td>Development Error</td><td>Tham số <code>nmChannelHandle</code> truyền vào vượt quá số lượng kênh cấu hình.</td></tr>
              <tr><td><code>0x03</code></td><td><b>CANNM_E_PARAM_POINTER</b></td><td>Development Error</td><td>Truyền con trỏ <code>NULL</code> vào các API trả về dữ liệu (như GetState, GetUserData).</td></tr>
              <tr><td><code>0x04</code></td><td><b>CANNM_E_NET_START_IND</b></td><td>Runtime Error</td><td>Nhận được <code>CanNm_RxIndication()</code> khi ECU đang ở <b>Bus-Sleep Mode</b>. Bắt buộc gọi <code>Nm_NetworkStartIndication()</code>.</td></tr>
              <tr><td><code>0x11</code></td><td><b>CANNM_E_NETWORK_TIMEOUT</b></td><td>Runtime Error</td><td>CanNmMsgTimeoutTime chạm 0 ms mà không nhận được TxConfirmation từ CanIf.</td></tr>
              <tr><td><code>0x12</code></td><td><b>CANNM_E_INIT_FAILED</b></td><td>Development Error</td><td>Khởi tạo thất bại do con trỏ cấu hình <code>ConfigPtr</code> không hợp lệ.</td></tr>
            </tbody>
          </table>
        `
      },
      {
        title: "6.4. Từ Điển Đầy Đủ 34 Tham Số Cấu Hình ECUC CanNM",
        content: `
          <h2>6.4. Từ Điển Đầy Đủ 34 Tham Số Cấu Hình ECUC CanNM (Autosar CanNm ECUC)</h2>
          <p>Bảng tra cứu toàn diện 34 tham số cấu hình CanNM theo tài liệu AUTOSAR SWS_CanNm:</p>

          <div style="margin:12px 0; background:var(--code); border:1px solid var(--border); border-radius:8px; padding:12px">
            <div class="mono small" style="font-weight:700; color:#34d399; margin-bottom:8px">📦 SƠ ĐỒ 6 NHÓM CẤU HÌNH ECUC CONTAINER HIERARCHY</div>
            <pre class="code" style="margin:0; font-size:11px; line-height:1.45">
[CanNmGlobalConfig] ────────┬──► [1. CanNmGeneral]: DevErrorDetect, PassiveMode, ActiveWakeupBit...
                            ├──► [2. CanNmChannelConfig / Timing]: MainFunctionPeriod, MsgCycleTime, TimeoutTime...
                            ├──► [3. CanNmPduConfig]: PduNidPosition, PduCbvPosition, BaseCanId, NodeId...
                            ├──► [4. CanNmBurstConfig]: ImmediateTransmissions, ImmediateCycleTime...
                            ├──► [5. CanNmPnFilterConfig]: PnEnabled, PnFilterMask, PnResetTime...
                            └──► [6. CanNmUserDataConfig]: UserDataSupport, ComUserDataSupport...
            </pre>
          </div>

          <table class="tbl">
            <thead>
              <tr>
                <th style="width:220px">Tên Tham Số ECUC</th>
                <th style="width:90px">Kiểu Dữ Liệu</th>
                <th style="width:90px">Mặc Định</th>
                <th>Ý Nghĩa Kỹ Thuật &amp; Tác Động Trực Tiếp Đến Module</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><code>CanNmDevErrorDetect</code></td><td>EcucBoolean</td><td>TRUE</td><td>Bật/tắt kiểm tra và báo lỗi phát triển phần mềm qua Det_ReportError.</td></tr>
              <tr><td><code>CanNmPassiveModeEnabled</code></td><td>EcucBoolean</td><td>FALSE</td><td>Nếu TRUE: ECU chỉ lắng nghe, không bao giờ phát bất kỳ bản tin NM PDU nào.</td></tr>
              <tr><td><code>CanNmActiveWakeupBitEnabled</code></td><td>EcucBoolean</td><td>TRUE</td><td>Bật/tắt việc ghi Bit 4 (AWB=1) trong CBV khi thức dậy chủ động.</td></tr>
              <tr><td><code>CanNmMainFunctionPeriod</code></td><td>EcucFloat</td><td>0.1 s (100ms)</td><td>Chu kỳ gọi hàm <code>CanNm_MainFunction()</code> từ hệ điều hành OS Task.</td></tr>
              <tr><td><code>CanNmMsgCycleTime</code></td><td>EcucFloat</td><td>1.0 s (1000ms)</td><td>Chu kỳ phát bản tin NM PDU định kỳ khi ở Normal Operation / Repeat Message.</td></tr>
              <tr><td><code>CanNmTimeoutTime</code></td><td>EcucFloat</td><td>2.0 s (2000ms)</td><td>Thời gian giám sát sinh tử. Nếu không có bản tin nào trong 2s ➔ chuyển sang Prepare Bus-Sleep.</td></tr>
              <tr><td><code>CanNmRepeatMessageTime</code></td><td>EcucFloat</td><td>1.5 s (1500ms)</td><td>Thời gian lưu lại ở Repeat Message State để ổn định mạng và báo danh.</td></tr>
              <tr><td><code>CanNmWaitBusSleepTime</code></td><td>EcucFloat</td><td>1.5 s (1500ms)</td><td>Thời gian lưu lại ở Prepare Bus-Sleep Mode trước khi ngắt phần cứng về Bus-Sleep.</td></tr>
              <tr><td><code>CanNmImmediateNmTransmissions</code></td><td>EcucInteger</td><td>3</td><td>Số lượng bản tin phát dồn dập (Burst Tx) ngay khi thức dậy chủ động.</td></tr>
              <tr><td><code>CanNmImmediateNmCycleTime</code></td><td>EcucFloat</td><td>0.02 s (20ms)</td><td>Chu kỳ phát giữa các bản tin Burst Tx (20ms).</td></tr>
              <tr><td><code>CanNmPnEnabled</code></td><td>EcucBoolean</td><td>TRUE</td><td>Bật/tắt tính năng quản lý mạng cục bộ Partial Networking.</td></tr>
              <tr><td><code>CanNmPnResetTime</code></td><td>EcucFloat</td><td>1.5 s (1500ms)</td><td>Thời gian duy trì cụm PNC trước khi giải phóng nếu không có yêu cầu mới.</td></tr>
            </tbody>
          </table>
        `
      }
    ]
  }
];

// 2. HANDBOOK RENDERING LOGIC
function switchHbTab1(tabIdx) {
  activeHbTab1 = tabIdx;
  activeHbSubTab = 0;
  renderCurrentHandbookView();
}

function renderCurrentHandbookView() {
  const tabs = document.querySelectorAll("#hbNav1 .hb-tab1");
  tabs.forEach((t, i) => {
    if (i === activeHbTab1) t.classList.add("active");
    else t.classList.remove("active");
  });

  const filterBox = document.getElementById("hbAbbrFilterBox");
  const nav2 = document.getElementById("hbNav2");

  if (activeHbTab1 === 6) {
    // Tab 7: Abbreviation Table
    if (nav2) nav2.innerHTML = "";
    if (filterBox) filterBox.classList.remove("hidden");
    renderAbbreviationTable();
  } else {
    // Tabs 0..5: Technical Topics
    if (filterBox) filterBox.classList.add("hidden");
    renderHbSubNav();
    renderHandbookContent();
  }
}

function renderHbSubNav() {
  const nav2 = document.getElementById("hbNav2");
  if (!nav2) return;

  const mainTopic = HANDBOOK_DATA[activeHbTab1];
  if (!mainTopic || !mainTopic.subtopics) {
    nav2.innerHTML = "";
    return;
  }

  let html = "";
  mainTopic.subtopics.forEach((sub, i) => {
    const activeClass = i === activeHbSubTab ? "active" : "";
    html += `
      <button class="hb-pill ${activeClass}" onclick="switchHbSubTab(${i})">
        ${sub.title}
      </button>
    `;
  });
  nav2.innerHTML = html;
}

function switchHbSubTab(subIdx) {
  activeHbSubTab = subIdx;
  const pills = document.querySelectorAll("#hbNav2 .hb-pill");
  pills.forEach((p, i) => {
    if (i === subIdx) p.classList.add("active");
    else p.classList.remove("active");
  });
  renderHandbookContent();
}

function renderHandbookContent() {
  const contentArea = document.getElementById("hbContentArea");
  if (!contentArea) return;

  if (activeHbTab1 === 6) {
    renderAbbreviationTable();
    return;
  }

  const mainTopic = HANDBOOK_DATA[activeHbTab1];
  const sub = mainTopic && mainTopic.subtopics[activeHbSubTab] ? mainTopic.subtopics[activeHbSubTab] : null;

  if (sub) {
    contentArea.innerHTML = sub.content;
  } else {
    contentArea.innerHTML = `<p class="muted">Chưa có nội dung cho chuyên đề này.</p>`;
  }
}

// 3. ABBREVIATION TABLE RENDERING & LIVE SEARCH BOX
function renderAbbreviationTable() {
  const contentArea = document.getElementById("hbContentArea");
  if (!contentArea) return;

  const searchInput = document.getElementById("abbrSearchInput");
  const query = searchInput ? searchInput.value.trim().toLowerCase() : "";

  let filtered = ABBREVIATIONS_DATA.filter(item => {
    const matchCat = (activeAbbrCategory === "ALL" || item.cat === activeAbbrCategory);
    if (!matchCat) return false;

    if (!query) return true;
    return (
      item.abbr.toLowerCase().includes(query) ||
      item.full.toLowerCase().includes(query) ||
      item.vi.toLowerCase().includes(query) ||
      item.desc.toLowerCase().includes(query) ||
      item.sws.toLowerCase().includes(query)
    );
  });

  const countBadge = document.getElementById("lblAbbrMatchCount");
  if (countBadge) {
    countBadge.innerText = `Đang hiện: ${filtered.length} / ${ABBREVIATIONS_DATA.length} mục`;
  }

  let html = `
    <table class="tbl">
      <thead>
        <tr>
          <th style="width:90px">Thuật Ngữ</th>
          <th style="width:70px">Nhóm</th>
          <th style="width:220px">Tên Tiếng Anh Chuẩn (Full Name)</th>
          <th style="width:190px">Giải Thích Tiếng Việt</th>
          <th>Mô Tả Chức Năng Chi Tiết &amp; Căn Cứ SWS</th>
          <th style="width:120px">Mã SWS AUTOSAR</th>
        </tr>
      </thead>
      <tbody>
  `;

  if (filtered.length === 0) {
    html += `
      <tr>
        <td colspan="6" style="text-align:center; padding:24px; color:var(--muted)">
          Không tìm thấy thuật ngữ nào phù hợp với từ khóa: <b>"${escapeHtml(query)}"</b>
        </td>
      </tr>
    `;
  } else {
    filtered.forEach(item => {
      let badgeClass = "badge";
      if (item.cat === "CORE") badgeClass += " ok";
      else if (item.cat === "CBV") badgeClass += " warn";
      else if (item.cat === "PN") badgeClass += " info";
      else badgeClass += " purple";

      html += `
        <tr>
          <td><span class="mono" style="font-weight:700; color:var(--accent)">${highlightMatch(item.abbr, query)}</span></td>
          <td><span class="${badgeClass}" style="font-size:10px">${item.cat}</span></td>
          <td><b>${highlightMatch(item.full, query)}</b></td>
          <td style="color:var(--text)">${highlightMatch(item.vi, query)}</td>
          <td style="color:var(--text); line-height:1.45">${highlightMatch(item.desc, query)}</td>
          <td><span class="badge mono" style="font-size:10px">${highlightMatch(item.sws, query)}</span></td>
        </tr>
      `;
    });
  }

  html += `
      </tbody>
    </table>
  `;

  contentArea.innerHTML = html;
}

function setAbbrCategoryFilter(cat) {
  activeAbbrCategory = cat;
  const buttons = document.querySelectorAll("#hbAbbrFilterBox button");
  buttons.forEach(b => {
    if (b.getAttribute("onclick") && b.getAttribute("onclick").includes(`'${cat}'`)) {
      b.classList.add("active");
    } else {
      b.classList.remove("active");
    }
  });
  renderAbbreviationTable();
}

function filterAbbreviationTable() {
  renderAbbreviationTable();
}

function highlightMatch(text, query) {
  if (!query || !text) return escapeHtml(text || "");
  const escapedQuery = escapeRegex(query);
  const regex = new RegExp(`(${escapedQuery})`, "gi");
  return escapeHtml(text).replace(regex, "<mark>$1</mark>");
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&");
}

// 4. WINDOW ONLOAD INITIALIZATION
window.addEventListener("DOMContentLoaded", () => {
  updateConfigFromUI();
  initTooltipHandlers();
  loadScenario(1);
  renderAll();
  renderCurrentHandbookView(); // Render Handbook Tabs & Sub-nav pills immediately!
  console.log("AUTOSAR CanNM Simulator initialized successfully.");
});
"""

    diag_counter = [0]
    def _replace_pre_with_svg(_match):
        diag_counter[0] += 1
        return get_diagram(diag_counter[0])

    js_code, n_replaced = re.subn(r'<pre\b[^>]*>.*?</pre>', _replace_pre_with_svg, js_code, flags=re.S)
    assert n_replaced == 28, f"Expected 28 <pre> diagrams in handbook, found {n_replaced}"

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(js_code)
    print(f"SUCCESS: Generated {output_path} ({len(js_code)} chars, {n_replaced} SVG shape diagrams)")

if __name__ == "__main__":
    build_part6()
