# -*- coding: utf-8 -*-
"""Generate part6_handbook.js: 6x4 Multi-level Handbook (with 18 theme-aware SVGs) + Live Search Abbreviations + Bootstrap."""

import json
import os
import hb_diagrams_bswm as d


def card(title, body_html):
    return f'<div class="hb-card"><h3>{title}</h3>{body_html}</div>'


def tbl(headers, rows):
    ths = "".join(f"<th>{h}</th>" for h in headers)
    trs = "".join("<tr>" + "".join(f"<td>{c}</td>" for c in r) + "</tr>" for r in rows)
    return f'<table class="tbl"><thead><tr>{ths}</tr></thead><tbody>{trs}</tbody></table>'


HANDBOOK_TABS = [
    {
        "id": 0,
        "title": "1. Kiến Trúc & Arbitration",
        "subTabs": [
            {
                "title": "1.1 Kiến Trúc 2 Nửa",
                "html": card(
                    "Kiến Trúc Lõi Của Module BswM Trong AUTOSAR Classic",
                    "<p><b>BswM (Basic Software Mode Manager — SWS_BswM)</b> là bộ não điều phối chính sách (Policy Engine) ở tầng System Services. Thay vì để ComM, CanSM, EcuM hay DCM tự ra lệnh cho nhau rối rắm, mọi thông báo trạng thái đi về BswM qua 2 nửa kiến trúc tách biệt:</p>"
                    + d.svg_bswm_architecture()
                    + "<ul>"
                    "<li><b>Nửa 1 — Mode Arbitration:</b> Thu thập tín hiệu từ <code>BswMModeRequestPort (MRP)</code>, so sánh trong <code>BswMModeCondition</code>, tổ hợp bằng <code>BswMLogicalExpression</code> (AND/OR/XOR/NAND) và quyết định kết quả nhị phân của từng <code>BswMRule</code>.</li>"
                    "<li><b>Nửa 2 — Mode Control:</b> Dựa vào kết quả <code>TRUE / FALSE</code> và lịch sử đổi trạng thái (<code>Prev != Curr</code>), chọn thực thi <code>BswMTrueActionList</code> hoặc <code>BswMFalseActionList</code> gồm các hành động nguyên tử lên COM, PduR, RTE, SchM, ComM, Nm, EcuM.</li>"
                    "</ul>"
                ),
            },
            {
                "title": "1.2 Chuỗi Xử Lý End-to-End",
                "html": card(
                    "Chuỗi Xử Lý Từ Indication / Request Tới Thực Thi ActionList",
                    "<p>Mỗi khi có sự kiện đổi mode đi vào BswM, luồng thực thi tuân thủ 4 bước chặt chẽ nhằm đảm bảo tính tất định (deterministic):</p>"
                    + d.svg_arb_vs_ctrl_pipeline()
                    + tbl(
                        ["Giai Đoạn", "Thành Phần", "Cơ Chế Hoạt Động", "Tham Chiếu SWS"],
                        [
                            ["Bước 1", "Guard & MRP Update", "Kiểm tra BSWM_INIT, NULL_PTR, Range (phát DET Mod 42 nếu sai), ghi nhận giá trị mới vào MRP.", "SWS_BswM_00029"],
                            ["Bước 2", "Context Routing", "Nếu MRP = BSWM_IMMEDIATE (và không re-entrant) → nhảy thẳng Bước 3; ngược lại → ghi Queue chờ MainFunction.", "SWS_BswM_00051 / 52"],
                            ["Bước 3", "Rule Evaluation", "Nếu bật IndependentEval chỉ xét các Rule có deps chứa MRP đổi; tính biểu thức và đối chiếu Prev → Curr.", "SWS_BswM_00055"],
                            ["Bước 4", "ActionList Exec", "Nếu TRIGGER & đổi trạng thái (hoặc CONDITION), tuần tự chạy Item #1..N, xử lý Cascaded List & AbortOnFail.", "SWS_BswM_00056 / 65"],
                        ],
                    ),
                ),
            },
            {
                "title": "1.3 Bảng Input / Output",
                "html": card(
                    "Bản Đồ Input Sources ↔ BswM Processing ↔ Output Action Targets",
                    "<p>BswM tương tác trực tiếp với hầu hết các module BSW cốt lõi và tầng ứng dụng SWC qua RTE:</p>"
                    + d.svg_io_interaction_map()
                    + tbl(
                        ["Module", "Input Vào BswM (API / Port)", "Xử Lý Trong BswM", "Output BswM Ra Lệnh"],
                        [
                            ["<b>EcuM</b>", "<code>BswM_EcuM_CurrentState()</code>", "Theo dõi STARTUP_TWO, PREP_SHUTDOWN qua Rule_01a/01b/07/08.", "<code>EcuM_SelectShutdownTarget()</code>, <code>EcuM_GoDownHaltPoll()</code>"],
                            ["<b>NvM</b>", "<code>BswM_NvM_CurrentJobMode()</code>", "Phân biệt <code>NVM_READ_ALL</code> (boot) và <code>NVM_WRITE_ALL</code> (shutdown).", "User Callout <code>NvM_ReadAll()</code>, <code>NvM_WriteAll()</code>"],
                            ["<b>ComM / Nm</b>", "<code>BswM_ComM_CurrentMode()</code>, <code>CurrentPNCMode()</code>", "Đánh giá FULL / SILENT / NO_COM & cụm PNC #16.", "<code>ComM_CommunicationAllowed()</code>, <code>Nm_Disable/EnableCommunication()</code>"],
                            ["<b>CanSM</b>", "<code>BswM_CanSM_CurrentState()</code>", "Ưu tiên <code>BSWM_IMMEDIATE</code> để bắt tức thời <code>CANSM_BSWM_BUS_OFF</code>.", "Cắt khẩn cấp <code>IG_0_Tx</code> & tắt <code>IG_2_Rx_DM</code>"],
                            ["<b>DCM</b>", "<code>BswM_Dcm_CommunicationMode_CurrentState()</code>", "Rule_04 xử lý lệnh UDS 0x28 CommunicationControl.", "Khóa Normal/NM PDU, giữ riêng <code>IG_5_Diag_Pdu</code>"],
                            ["<b>AUTOSAR COM</b>", "(Không gửi Indication vào BswM)", "Thực thi BswMPduGroupSwitch, DeadlineMonitoring & TriggerSend.", "<code>Com_IpduGroupStart/Stop()</code>, <code>Enable/DisableRxDM()</code>"],
                            ["<b>PduR</b>", "(Không gửi Indication vào BswM)", "Điều khiển nhóm đường định tuyến Gateway theo mạng/timer.", "<code>PduR_EnableRouting()</code>, <code>PduR_DisableRouting()</code>"],
                            ["<b>RTE / SWC</b>", "<code>BswMSwcModeRequest</code> (APP_MODE)", "Nhận yêu cầu từ SWC, kết hợp điều kiện mạng ComM.", "<code>Rte_Start()</code>, <code>Rte_Stop()</code>, <code>Rte_Switch()</code>, <code>SchM_Switch()</code>"],
                            ["<b>DET / WdgM</b>", "<code>BswM_WdgM_RequestPartitionReset()</code>", "Phòng vệ lỗi API & phân vùng giám sát Watchdog.", "<code>Det_ReportError(42, ...)</code> & Action cô lập lỗi"],
                        ],
                    ),
                ),
            },
            {
                "title": "1.4 Hai Thanh Ghi 8-Bit",
                "html": card(
                    "Giải Mã 2 Thanh Ghi Trạng Thái 8-Bit Trong Trình Mô Phỏng",
                    "<p>Để giúp quan sát tức thời mọi bit trạng thái nội bộ mà không phải cuộn chuột, trình mô phỏng cung cấp 2 thanh ghi 8-bit tương tác (click từng bit để thử nghiệm):</p>"
                    + tbl(
                        ["Bit", "Thanh A: BswM_ArbitrationStatusByte", "Thanh B: BswM_ActionControlByte"],
                        [
                            ["<b>Bit 7 (0x80)</b>", "<code>BSWM_INIT</code>: 1 khi <code>BswM_Init()</code> đã xong; 0 sẽ kích lỗi DET <code>BSWM_E_NO_INIT</code>.", "<code>COMM_ALLOW</code>: 1 khi BswM đã gọi <code>ComM_CommunicationAllowed(Ch0, TRUE)</code>."],
                            ["<b>Bit 6 (0x40)</b>", "<code>IMM_PROC</code>: Sáng khi bước vừa rồi xử lý qua cổng <code>BSWM_IMMEDIATE</code>.", "<code>IPDU_TX_ON</code>: Sáng khi nhóm <code>IG_0_Tx_App</code> đang BẬT trong COM."],
                            ["<b>Bit 5 (0x20)</b>", "<code>DEF_PENDING</code>: 1 khi <code>Deferred Queue</code> có >= 1 cổng chờ MainFunction.", "<code>IPDU_RX_ON</code>: Sáng khi nhóm <code>IG_1_Rx_App</code> đang BẬT (gồm cả SILENT_COM)."],
                            ["<b>Bit 4 (0x10)</b>", "<code>RULE_TRUE</code>: Biểu thức Rule trọng tâm vừa đánh giá ra <code>BSWM_TRUE</code>.", "<code>RX_DM_EN</code>: Sáng khi Reception Deadline Monitoring (<code>IG_2_Rx_DM</code>) BẬT."],
                            ["<b>Bit 3 (0x08)</b>", "<code>RULE_CHG</code>: Kết quả Rule vừa đổi trạng thái (<code>Prev != Curr</code>).", "<code>PDUR_RT_EN</code>: Sáng khi Gateway <code>RPG_0_Gateway</code> trong PduR đang MỞ."],
                            ["<b>Bit 2 (0x04)</b>", "<code>ACT_COND</code>: Có Rule vừa thực thi theo kiểu <code>BSWM_CONDITION</code>.", "<code>DCM_DIS</code>: Sáng khi UDS 0x28 đang khóa một phần/toàn bộ truyền thông."],
                            ["<b>Bit 1 (0x02)</b>", "<code>TMR_RUN</code>: Bộ đếm nội bộ <code>BswMTimer_0</code> đang đếm lùi.", "<code>ABORT_FAIL</code>: Sáng ĐỎ khi <code>BswMAbortOnFail=TRUE</code> hủy ActionList."],
                            ["<b>Bit 0 (0x01)</b>", "<code>RTE_START</code>: BswM đã bật <code>Rte_Start()</code> cho tầng SWC chạy.", "<code>SHUTDOWN</code>: Sáng khi ECU đang trong chuỗi <code>PREP_SHUTDOWN → GO_OFF</code>."],
                        ],
                    ),
                ),
            },
        ],
    },
    {
        "id": 1,
        "title": "2. MRP & IMMEDIATE/DEFERRED",
        "subTabs": [
            {
                "title": "2.1 Phân Loại 3 Nhóm MRP",
                "html": card(
                    "Mode Request Port (MRP) — Cửa Ngõ Đầu Vào Của BswM",
                    "<p>Tất cả thông tin từ thế giới bên ngoài đi vào BswM đều phải ánh xạ qua một <b>BswMModeRequestPort</b>:</p>"
                    + d.svg_mrp_indication_vs_request()
                    + "<p>Mỗi MRP lưu giữ giá trị chế độ gần nhất (Last Reported Mode) và sở hữu tham số <code>BswMRequestProcessing</code> quy định việc xử lý diễn ra <i>tức thời</i> hay <i>hoãn lại</i>.</p>"
                ),
            },
            {
                "title": "2.2 IMMEDIATE vs DEFERRED",
                "html": card(
                    "Đối Chiếu BSWM_IMMEDIATE và BSWM_DEFERRED (Kịch Bản S4 & S5)",
                    "<p>Việc chọn sai <code>BswMRequestProcessing</code> là nguyên nhân phổ biến gây lỗi Timing hoặc trễ ngắt gói tin khi Bus-Off:</p>"
                    + d.svg_immediate_vs_deferred_timing()
                    + tbl(
                        ["Tiêu Chí", "BSWM_IMMEDIATE (SWS_BswM_00051)", "BSWM_DEFERRED (SWS_BswM_00052)"],
                        [
                            ["<b>Thời điểm chạy Rule</b>", "Ngay bên trong hàm caller (trước khi API return).", "Hoãn lại vào Deferred Queue, chờ <code>BswM_MainFunction()</code>."],
                            ["<b>Ngữ cảnh OS (Context)</b>", "Chạy trên Stack/Priority của Caller (có thể là ISR/Task mạng).", "Luôn chạy trong BSW Task cố định (VD: 10ms Task)."],
                            ["<b>Độ trễ phản hồi</b>", "0 ms (tức thời).", "Từ 0 ms tới <code>BswMMainFunctionPeriod</code> (tối đa 10ms)."],
                            ["<b>Cổng nên dùng</b>", "<code>MRP_CanSM_Ch0</code> (Bus-Off), <code>MRP_Dcm_ComCtrl</code>, <code>MRP_ComM_Ch0</code>.", "<code>MRP_Swc_AppMode</code>, <code>MRP_EcuM_State</code>, <code>MRP_NvM_Job</code>."],
                        ],
                    ),
                ),
            },
            {
                "title": "2.3 Chống Re-entrancy & Queue",
                "html": card(
                    "Cơ Chế Tự Bảo Vệ Khi Xảy Ra Gọi Lồng Nhau (Re-entrancy Guard)",
                    "<p>Điều gì xảy ra nếu BswM đang thực thi một ActionList (gọi xuống ComM hoặc CanSM), và module đó lại gọi ngược lại vào <code>BswM_ComM_CurrentMode()</code> ở cổng cấu hình <code>BSWM_IMMEDIATE</code>?</p>"
                    + d.svg_reentrancy_and_queue()
                    + "<p>Theo yêu cầu <b>SWS_BswM_00143</b>, BswM dùng cờ khóa (bảo vệ bằng <code>SchM_Enter_BswM_BSWM_EXCLUSIVE_AREA_0</code>): bất kỳ lời gọi đệ quy nào khi ActionList đang chạy đều bị chuyển hướng an toàn vào <b>Deferred Queue</b> thay vì làm sai lệch kết quả đánh giá giữa chừng.</p>"
                ),
            },
            {
                "title": "2.4 Generic Request (User/Mode)",
                "html": card(
                    "Cổng BswMGenericRequest & Hàm BswM_RequestMode(UserId, Mode)",
                    "<p>Đối với các Complex Device Driver (CDD) hoặc module không thuộc danh sách Indication tiêu chuẩn AUTOSAR, BswM cung cấp API đa năng:</p>"
                    "<pre class='code-block'>Std_ReturnType BswM_RequestMode(BswM_UserType requesting_user, BswM_ModeType requested_mode);</pre>"
                    "<ul>"
                    "<li><b>requesting_user:</b> Định danh nguồn yêu cầu (giới hạn cấu hình trong mô phỏng: <code>MaxUserId</code> từ trường <code>GenericReq_UserId_And_MaxMode</code>). Vượt giới hạn phát lỗi <code>BSWM_E_REQ_USER_OUT_OF_RANGE (0x04)</code>.</li>"
                    "<li><b>requested_mode:</b> Giá trị số nguyên mode mong muốn (giới hạn bởi <code>MaxMode</code>). Vượt giới hạn phát lỗi <code>BSWM_E_REQ_MODE_OUT_OF_RANGE (0x05)</code>.</li>"
                    "</ul>"
                ),
            },
        ],
    },
    {
        "id": 2,
        "title": "3. Rules & TRIGGER/CONDITION",
        "subTabs": [
            {
                "title": "3.1 Logic Rule & Biểu Thức",
                "html": card(
                    "Cấu Trúc ModeCondition → LogicalExpression → BswMRule",
                    "<p>Mỗi <code>BswMRule</code> liên kết tới một cây biểu thức logic gồm các điều kiện lá <code>BswMModeCondition</code>:</p>"
                    + d.svg_rule_truth_table_flow()
                    + "<p>Thử nghiệm ngay ở Tab <b>2. Rules & Expr</b>: thay đổi toán tử <code>Rule02_LogicalOperator</code> từ <code>BSWM_AND</code> sang <code>BSWM_OR</code>, <code>BSWM_XOR</code> hoặc <code>BSWM_NAND</code> và quan sát bảng chân trị tự cập nhật!</p>"
                ),
            },
            {
                "title": "3.2 TRIGGER vs CONDITION",
                "html": card(
                    "Sóng Xung Thực Thi: BSWM_TRIGGER vs BSWM_CONDITION (Kịch Bản S6)",
                    "<p>Đây là điểm khác biệt mấu chốt chi phối tần suất chạy ActionList trong chu kỳ <code>BswM_MainFunction()</code>:</p>"
                    + d.svg_trigger_vs_condition_wave()
                    + "<ul>"
                    "<li><b>BSWM_TRIGGER (Theo Sườn / Edge-Triggered):</b> Chỉ chạy khi <code>PrevResult != CurrResult</code>. Rất lý tưởng cho bật/tắt I-PDU Group (<code>AL_EnableTxRxDM</code>), <code>Rte_Start()</code>, <code>NvM_ReadAll()</code> — chạy đúng 1 lần rồi giữ nguyên trạng thái.</li>"
                    "<li><b>BSWM_CONDITION (Theo Mức / Level-Triggered):</b> Chạy lại ở <b>MỌI chu kỳ đánh giá</b> miễn Rule cho kết quả khớp nhánh True/False. Dùng khi cần liên tục gọi Switch hoặc phát lại Trigger IPDU.</li>"
                    "</ul>"
                ),
            },
            {
                "title": "3.3 BSWM_UNDEFINED InitState",
                "html": card(
                    "Bí Mật Của Tham Số BswMRuleInitState = BSWM_UNDEFINED (Kịch Bản S7)",
                    "<p>Rất nhiều kỹ sư AUTOSAR gặp lỗi ActionList nhánh False không chạy lúc mới mở nguồn nếu để mặc định <code>BswMRuleInitState = BSWM_FALSE</code>:</p>"
                    + d.svg_rule_init_undefined()
                ),
            },
            {
                "title": "3.4 Independent Evaluation",
                "html": card(
                    "Tối Ưu Hóa CPU: Independent Rule Evaluation & Toán Tử Logic",
                    "<p>Trong một ECU thực tế có thể cấu hình hơn 80 Rule. Khi cổng <code>MRP_Swc_AppMode</code> thay đổi, BswM có phải quét lại tất cả 80 Rule hay không?</p>"
                    + tbl(
                        ["Chế Độ Đánh Giá", "Cơ Chế", "Ưu Điểm / Lưu Ý"],
                        [
                            ["<b>EnableIndependentRuleEvaluation = TRUE</b>", "BswM chỉ lọc và đánh giá tập con Rule có tham chiếu tới MRP vừa đổi (dựa trên bảng dependency tĩnh sinh ra từ ARXML).", "Tiết kiệm CPU vượt trội khi một cổng IMMEDIATE (như CanSM/Dcm) bắn vào giữa chu kỳ."],
                            ["<b>EnableIndependentRuleEvaluation = FALSE</b>", "Đánh giá toàn bộ danh sách Rule mỗi lần kích hoạt Arbitration.", "Đảm bảo phản ánh lại cả những biểu thức có tác động dây chuyền nếu không cấu hình Sub-Rule."],
                        ],
                    ),
                ),
            },
        ],
    },
    {
        "id": 3,
        "title": "4. ActionList, I-PDU & DCM 0x28",
        "subTabs": [
            {
                "title": "4.1 Cascaded List & AbortOnFail",
                "html": card(
                    "ActionList Lồng Nhau (Cascaded) & Cơ Chế BswMAbortOnFail (Kịch Bản S8)",
                    "<p>Một <code>BswMActionList</code> chứa các <code>BswMActionListItem</code> sắp xếp theo <code>ItemIndex</code>. Một Item có thể là hành động nguyên tử (Atomic), lệnh gọi lồng sang một ActionList con, hoặc kích hoạt đánh giá tiếp một Sub-Rule:</p>"
                    + d.svg_cascaded_action_abort()
                    + "<p>Nếu bật <code>BswMAbortOnFail = TRUE</code> và Item #2 trả về <code>E_NOT_OK</code> (do lỗi phần cứng hoặc kiểm tra an toàn thất bại), BswM <b>hủy bỏ toàn bộ Item #3 và #4 còn lại</b> và bật Bit 1 (<code>ABORT_FAIL</code>) trên Thanh B.</p>"
                ),
            },
            {
                "title": "4.2 Vector 8-Bit Com_IpduGroup",
                "html": card(
                    "Cơ Chế BswMPduGroupSwitch Điều Khiển AUTOSAR COM & PduR",
                    "<p>Module AUTOSAR COM không tự quyết định lúc nào được phép phát gói tin CAN lên bus. Sau <code>Com_Init()</code>, mọi I-PDU Group mặc định <b>STOPPED (0x00)</b> và hoàn toàn tuân lệnh <code>Com_IpduGroupStart() / Stop()</code> từ BswM:</p>"
                    + d.svg_ipdu_vector_bitmask()
                ),
            },
            {
                "title": "4.3 UDS 0x28 DCM CommControl",
                "html": card(
                    "Phối Hợp DCM ↔ BswM Khi Thực Thi Dịch Vụ UDS 0x28 (Kịch Bản S12)",
                    "<p>Trong quá trình cập nhật phần mềm ECU (Flash Bootloader Programming) hoặc kiểm tra sản xuất EOL, Tester gửi lệnh UDS Service <code>0x28 CommunicationControl</code> yêu cầu khóa giao tiếp Normal & NM:</p>"
                    + d.svg_dcm0x28_matrix()
                ),
            },
            {
                "title": "4.4 PNC #16, Rx DM & TriggerSend",
                "html": card(
                    "Điều Khiển Mạng Con PNC, Reception DM & Kích Phát I-PDU",
                    "<ul>"
                    "<li><b>Partial Networking (S10):</b> Khi ECU hỗ trợ cụm chức năng riêng (<code>PNC #16</code>), <code>BswM_ComM_CurrentPNCMode(16, COMM_PNC_REQUESTED)</code> kích hoạt <code>Rule_05</code> chỉ mở <code>IG_3_PNC16_Tx</code> & <code>IG_4_PNC16_Rx</code> trong khi giữ im các cụm khác để tiết kiệm điện.</li>"
                    "<li><b>Reception Deadline Monitoring (SWS_BswM_00122):</b> Khi sang <code>SILENT_COM</code> hoặc <code>CANSM_BSWM_BUS_OFF</code>, các ECU khác có thể không gửi hoặc bus ngắt, nên BswM phải gọi <code>Com_DisableReceptionDM(IG_2_Rx_DM)</code> để ngăn báo DTC timeout giả.</li>"
                    "<li><b>BswMTriggerIPduSend (SWS_BswM_00121):</b> Khi <code>EnableTriggerIpduSendAction = TRUE</code>, BswM gọi <code>Com_TriggerIPDUSend()</code> ép phát ngay frame báo trạng thái mới mà không cần chờ hết chu kỳ phát định kỳ.</li>"
                    "</ul>"
                ),
            },
        ],
    },
    {
        "id": 4,
        "title": "5. Vòng Đời ECU & SWC/RTE",
        "subTabs": [
            {
                "title": "5.1 Boot-Up ECU 2 Pha (S1)",
                "html": card(
                    "Điều Phối Khởi Động ECU Flexible: EcuM → NvM_ReadAll → Rte_Start",
                    "<p>Trong kiến trúc AUTOSAR EcuM Flexible, EcuM bàn giao toàn quyền quyết định thời điểm khởi chạy RTE và mở cổng mạng ComM cho các Rule của BswM:</p>"
                    + d.svg_ecum_boot_sequence()
                ),
            },
            {
                "title": "5.2 Tắt Máy An Toàn (S13)",
                "html": card(
                    "Chu Trình PREP_SHUTDOWN → Rte_Stop → NvM_WriteAll → GoOff (S13)",
                    "<p>Khi mất khóa điện IG hoặc hết nhu cầu giữ mạng, ECU không được ngắt nguồn đột ngột mà phải đi qua chuỗi ActionList khóa mạng và xả dữ liệu bền vững xuống Flash:</p>"
                    + d.svg_ecum_shutdown_sequence()
                ),
            },
            {
                "title": "5.3 SWC ↔ RTE ↔ BswM (S9)",
                "html": card(
                    "Tương Tác Hai Chiều Với Tầng Ứng Dụng Qua RTE & SchM",
                    "<p>BswM vừa là nơi nhận đề xuất chuyển chế độ từ SWC, vừa là bộ thực thi phát tín hiệu kích hoạt Runnable chuyển mode xuống các SWC và bộ lập lịch SchM:</p>"
                    + d.svg_swc_rte_two_way()
                ),
            },
            {
                "title": "5.4 BswMTimer & WdgM Reset",
                "html": card(
                    "Bộ Đếm Nội Bộ BswMTimerControl & Xử Lý Lỗi Phân Vùng Watchdog",
                    "<ul>"
                    "<li><b>BswMTimerControl (SWS_BswM_00205):</b> Một ActionList có thể START một timer đếm lùi (<code>BswMTimerValue = 300ms</code>). Ở mỗi <code>BswM_MainFunction()</code>, BswM trừ đi <code>BswMMainFunctionPeriod</code>; khi về 0ms, MRP tương ứng chuyển <code>BSWM_TIMER_EXPIRED</code> kích hoạt Rule timeout (Kịch bản S11 hoặc giải cứu NvM treo ở S1).</li>"
                    "<li><b>BswM_WdgM_RequestPartitionReset():</b> Khi Watchdog Manager phát hiện lỗi deadline/logical trong một OS Application partition, WdgM gọi API này vào BswM để chạy ActionList dừng nhóm I-PDU an toàn hoặc reset phân vùng.</li>"
                    "</ul>"
                ),
            },
        ],
    },
    {
        "id": 5,
        "title": "6. API R23-11, DET & ECUC",
        "subTabs": [
            {
                "title": "6.1 API Chuẩn R23-11",
                "html": card(
                    "Danh Mục Hàm Giao Tiếp Chuẩn AUTOSAR Classic BswM (R20-11 / R22-11 / R23-11)",
                    "<p>Toàn bộ các API chuẩn của BswM đều mang <code>ModuleId = 42 (0x002A)</code> và ServiceId chuẩn hóa cho truy vết DET:</p>"
                    + d.svg_bswm_api_map()
                ),
            },
            {
                "title": "6.2 Chốt Lỗi DET (Mod 42)",
                "html": card(
                    "Cơ Chế Kiểm Tra Và Báo Lỗi Phát Triển / Runtime Qua DET (S14)",
                    "<p>Khi cấu hình <code>BswMDevErrorDetect = TRUE</code>, mọi lời gọi API vào BswM đều phải vượt qua các chốt bảo vệ đầu hàm trước khi chạm tới MRP hay Rule:</p>"
                    + d.svg_det_error_guards()
                    + tbl(
                        ["Mã Lỗi DET", "Hex", "Điều Kiện Phát Sinh", "Tham Chiếu SWS"],
                        [
                            ["<code>BSWM_E_NO_INIT</code>", "0x01", "Gọi API BswM trước khi <code>BswM_Init()</code> chạy hoặc sau <code>BswM_Deinit()</code>.", "SWS_BswM_00077"],
                            ["<code>BSWM_E_NULL_POINTER</code>", "0x02", "Truyền <code>NULL_PTR</code> vào <code>BswM_GetVersionInfo()</code> hoặc con trỏ bắt buộc.", "SWS_BswM_00078"],
                            ["<code>BSWM_E_REQ_USER_OUT_OF_RANGE</code>", "0x04", "<code>requesting_user</code> trong <code>BswM_RequestMode()</code> vượt quá cấu hình.", "SWS_BswM_00080"],
                            ["<code>BSWM_E_REQ_MODE_OUT_OF_RANGE</code>", "0x05", "<code>requested_mode</code> trong <code>BswM_RequestMode()</code> vượt quá MaxMode.", "SWS_BswM_00081"],
                            ["<code>BSWM_E_PARAM_CONFIG</code>", "0x06", "Gọi <code>BswM_Init(NULL_PTR)</code> với cấu hình Post-Build rỗng.", "SWS_BswM_00082"],
                            ["<code>BSWM_E_ACTION_FAILED</code>", "0x80", "Runtime Error báo khi ActionList Item lỗi với <code>BswMAbortOnFail = TRUE</code>.", "SWS_BswM_00065"],
                        ],
                    ),
                ),
            },
            {
                "title": "6.3 Cây ECUC BswM.arxml",
                "html": card(
                    "Cấu Trúc Phân Cấp Tham Số Cấu Hình ECUC BswM",
                    "<p>File <code>BswM.arxml</code> quản lý đồng bộ 36 tham số cấu hình chia thành 3 nhóm container lớn và ánh xạ vào 6 Sub-tabs bên trái trình mô phỏng:</p>"
                    + d.svg_ecuc_container_tree()
                ),
            },
            {
                "title": "6.4 Tra Cứu 36 Tham Số ECUC",
                "html": card(
                    "Bảng Tóm Tắt 36 Tham Số Cấu Hình ECUC Trong Trình Mô Phỏng",
                    tbl(
                        ["Nhóm Sub-Tab", "Các Tham Số (Rê chuột >1s ở Panel Trái để xem Tooltip chi tiết)"],
                        [
                            ["<b>0. General</b>", "<code>BswMInitialized</code>, <code>BswMDevErrorDetect</code>, <code>BswMVersionInfoApi</code>, <code>BswMMainFunctionPeriod</code>, <code>BswMComMEnabled</code>, <code>BswMDcmEnabled</code>"],
                            ["<b>1. Mode Req Ports</b>", "<code>MRP_ComM_Ch0_Processing</code>, <code>MRP_CanSM_Ch0_Processing</code>, <code>MRP_Dcm_ComCtrl_Processing</code>, <code>MRP_EcuM_State_Processing</code>, <code>MRP_NvM_Job_Processing</code>, <code>MRP_Swc_AppMode_Processing</code>"],
                            ["<b>2. Rules & Expr</b>", "<code>Rule02_ComMFull_InitState</code>, <code>Rule02_LogicalOperator</code>, <code>Rule02_EnableFalseActionList</code>, <code>Rule06_SwcSport_InitState</code>, <code>EnableIndependentRuleEvaluation</code>, <code>GenericReq_UserId_And_MaxMode</code>"],
                            ["<b>3. ActionLists</b>", "<code>AL_EnableTxRxDM_Execution</code>, <code>AL_SwcSportMode_Execution</code>, <code>BswMActionListPriority</code>, <code>BswMAbortOnFail</code>, <code>InjectActionItemFailure</code>, <code>EnableCascadedActionList</code>"],
                            ["<b>4. PDU / PduR / Timer</b>", "<code>BswMPduGroupSwitchReinit</code>, <code>EnableReceptionDmControl</code>, <code>EnableTriggerIpduSendAction</code>, <code>EnablePduRouterControl</code>, <code>BswMComMPncEnabled</code>, <code>BswMTimerValue</code>"],
                            ["<b>5. Lifecycle & DCM</b>", "<code>EcuMShutdownTarget</code>, <code>RequireNvMReadAllBeforeRteStart</code>, <code>RequireNvMWriteAllBeforeGoOff</code>, <code>DcmCommunicationControlMode</code>, <code>EnableNmControlOnDcm0x28</code>, <code>EnableWdgMPartitionResetRule</code>"],
                        ],
                    ),
                ),
            },
        ],
    },
]

js_output = """// ================= PART 6: MULTI-LEVEL HANDBOOK, SEARCHABLE ABBREVIATIONS & BOOTSTRAP =================

const HANDBOOK_TABS = __HANDBOOK_JSON__;

let hbActiveTab1 = 0;
let hbActiveSubTab = [0, 0, 0, 0, 0, 0];
let abbrCategory = "ALL";

function highlightMatch(text, query) {
  const safe = escapeHtml(text);
  if (!query) return safe;
  const escapedQ = query.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&");
  try {
    const re = new RegExp("(" + escapedQ + ")", "gi");
    return safe.replace(re, "<mark>$1</mark>");
  } catch (e) {
    return safe;
  }
}

function switchHbTab1(idx) {
  hbActiveTab1 = idx;
  for (let i = 0; i < 7; i++) {
    const btn = document.getElementById("hbTab1_" + i);
    if (btn) btn.classList.toggle("active", i === idx);
  }
  renderCurrentHandbookView();
}

function switchHbSubTab(subIdx) {
  hbActiveSubTab[hbActiveTab1] = subIdx;
  renderCurrentHandbookView();
}

function setAbbrCategory(cat) {
  abbrCategory = cat;
  ["ALL", "ARB", "ACT", "PDU", "LIFE"].forEach((c) => {
    const btn = document.getElementById("catPill_" + c);
    if (btn) btn.classList.toggle("active", c === cat);
  });
  filterAbbreviationTable();
}

function filterAbbreviationTable() {
  if (hbActiveTab1 !== 6) return;
  const inp = document.getElementById("abbrSearchInput");
  const q = inp ? inp.value.trim() : "";
  const ql = q.toLowerCase();

  const filtered = ABBREVIATIONS_DATA.filter((item) => {
    const matchCat = abbrCategory === "ALL" || item.cat === abbrCategory;
    if (!matchCat) return false;
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
    ARB: "🧠 Arbitration & Rules",
    ACT: "⚡ ActionLists & Actions",
    PDU: "📡 PDU, PduR & DCM",
    LIFE: "🔄 Lifecycle, RTE & BSW"
  };

  const area = document.getElementById("hbContentArea");
  if (!area) return;

  if (filtered.length === 0) {
    area.innerHTML = `<div class="hb-card"><h3>Không tìm thấy thuật ngữ phù hợp</h3><p>Thử xóa bớt từ khóa hoặc chọn danh mục "Tất cả (${ABBREVIATIONS_DATA.length})" để xem toàn bộ.</p></div>`;
    return;
  }

  const rowsHtml = filtered.map((item) => `
    <tr>
      <td class="mono" style="font-weight:800;color:var(--pri);white-space:nowrap">${highlightMatch(item.abbr, q)}</td>
      <td style="font-weight:600">${highlightMatch(item.full, q)}</td>
      <td>${highlightMatch(item.vi, q)}</td>
      <td><span class="rule-pill rp-trig">${escapeHtml(catLabels[item.cat] || item.cat)}</span></td>
      <td>${highlightMatch(item.desc, q)}</td>
      <td class="mono" style="font-size:11px;color:var(--cyan);white-space:nowrap">${highlightMatch(item.sws, q)}</td>
    </tr>`).join("");

  area.innerHTML = `
    <div class="hb-card">
      <h3>📚 Bảng Thuật Ngữ &amp; Viết Tắt AUTOSAR Classic BswM (${filtered.length} mục)</h3>
      <table class="tbl">
        <thead>
          <tr>
            <th>Viết Tắt / Ký Hiệu</th>
            <th>Tên Đầy Đủ (English)</th>
            <th>Nghĩa Tiếng Việt</th>
            <th>Nhóm</th>
            <th>Giải Thích Kỹ Thuật &amp; Vai Trò Trong BswM</th>
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
""".replace("__HANDBOOK_JSON__", json.dumps(HANDBOOK_TABS, ensure_ascii=False, indent=2))

out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "part6_handbook.js")
with open(out_path, "w", encoding="utf-8") as f:
    f.write(js_output)
print(f"Generated {out_path} ({len(js_output)} chars, {len(HANDBOOK_TABS)} main tabs).")
