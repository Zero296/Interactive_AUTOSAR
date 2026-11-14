# -*- coding: utf-8 -*-
"""Generates part6_handbook.js containing 9x4=36 multi-level Handbook topics,
live-searchable Abbreviation Table renderer (68 terms), and DOMContentLoaded bootstrap.
"""

import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)

from hb_diagrams_mcal import ALL_HB_DIAGRAMS


def card(title, body_html):
    return f'<div class="hb-card"><h3>{title}</h3>{body_html}</div>'


def tbl(headers, rows):
    th = "".join(f"<th>{h}</th>" for h in headers)
    trs = "".join("<tr>" + "".join(f"<td>{c}</td>" for c in r) + "</tr>" for r in rows)
    return f'<table class="tbl"><thead><tr>{th}</tr></thead><tbody>{trs}</tbody></table>'


def build_handbook_data():
    D = {k: fn() for k, fn in ALL_HB_DIAGRAMS.items()}

    sec0 = [
        {
            "title": "1.1. Vị Trí 4 Nhóm MCAL Trong AUTOSAR",
            "html": card("Sơ Đồ Kiến Trúc Tổng Thể SWC ↔ RTE ↔ ECU Abstraction ↔ 8 Core MCAL ↔ Silicon HW",
                         D["arch_layers"] +
                         tbl(["Nhóm MCAL", "Các Module Cốt Lõi", "Module ID", "Nhiệm vụ cốt lõi & Phối hợp tầng trên"], [
                             ["Microcontroller Drivers", "<b>Mcu</b>", "<span class='mono'>101</span>", "Clock Tree, PLL Lock/Distribute, ResetReason, PowerMode (RUN/HALT/STOP), Init RAM Section. Điều phối bởi <code>EcuM</code>."],
                             ["I/O Drivers", "<b>Port · Dio · Adc · Pwm</b>", "<span class='mono'>124, 120, 123, 121</span>", "Pin Mux PCR, đọc/ghi Digital tức thời, chuyển đổi cảm biến Analog SAR 12-bit, điều chế xung PWM 0..0x8000 qua <code>IoHwAb</code>."],
                             ["Communication Drivers", "<b>Spi · Can</b>", "<span class='mono'>83, 80</span>", "Truyền chuỗi <code>Seq→Job→Ch</code> (QSPI) và điều phối khung CAN / CAN-FD qua hộp thư <code>HTH / HRH</code> qua <code>CanIf / CanTrcv</code>."],
                             ["Memory Drivers", "<b>Fls</b>", "<span class='mono'>92</span>", "Xóa Sector (0xFF), Ghi/Đọc/So sánh Page Data Flash bất đồng bộ không chặn CPU qua <code>Fls_MainFunction()</code> phục vụ <code>Fee → NvM</code>."],
                         ]))
        },
        {
            "title": "1.2. Tại Sao SWC Không Gọi Trực Tiếp MCAL?",
            "html": card("Nguyên Tắc Độc Lập Phần Cứng Của AUTOSAR Classic (Application ↔ BSW)",
                         "<p>Trong AUTOSAR, <b>Software Component (SWC)</b> ở tầng Application <b>TUYỆT ĐỐI KHÔNG</b> được <code>#include &lt;Dio.h&gt;</code> hay gọi thẳng API của <code>Adc / Pwm / Can / Fls</code>. Điều này giúp mã nguồn nghiệp vụ xe (ví dụ <code>SWC_ThermalCtrl</code>) chạy giống hệt nhau trên cả chip NXP S32K, Infineon Aurix hay Renesas RH850 mà không cần viết lại dòng code ứng dụng nào.</p>" +
                         tbl(["Đường ống tương tác", "Luồng gọi chuẩn từ SWC → Silicon HW", "Vai trò lớp trung gian"], [
                             ["<b>I/O &amp; Cảm biến / Chấp hành</b>", "<code>SWC</code> ⇄ <code>RTE</code> ⇄ <code>IoHwAb</code> ⇄ <code>Port / Dio / Adc / Pwm / Spi</code>", "<code>IoHwAb</code> ẩn mã chân Pin/Channel và quy đổi đơn vị thô (0..4095) ↔ đại lượng vật lý (°C, V, % quạt)."],
                             ["<b>Truyền thông CAN / CAN-FD</b>", "<code>SWC</code> ⇄ <code>RTE</code> ⇄ <code>COM</code> ⇄ <code>PduR</code> ⇄ <code>CanIf / CanSM</code> ⇄ <code>Can</code>", "<code>CanIf</code> ánh xạ PDU ID sang HTH/HRH, giữ TxQueue khi <code>CAN_BUSY</code> và phục hồi Bus-Off cùng <code>CanSM</code>."],
                             ["<b>Bộ nhớ Non-Volatile (NVRAM)</b>", "<code>SWC</code> ⇄ <code>RTE</code> ⇄ <code>NvM</code> ⇄ <code>MemIf</code> ⇄ <code>Fee / Ea</code> ⇄ <code>Fls / Spi</code>", "<code>Fee</code> cân bằng hao mòn ô nhớ (Wear Leveling) và chuyển đổi Block ID sang địa chỉ Sector/Page Flash."],
                             ["<b>Khởi tạo &amp; An toàn hệ thống</b>", "<code>EcuM / BswM / SchM</code> ➔ <code>8 MCAL</code> ➔ <code>Det / Dem</code>", "<code>EcuM</code> điều phối Init toàn chip; <code>SchM</code> chạy <code>*_MainFunction()</code>; <code>Det/Dem</code> thu thập lỗi."],
                         ]))
        },
        {
            "title": "1.3. Trình Tự Khởi Tạo EcuM_AL_DriverInitOne()",
            "html": card("Chuỗi Khởi Tạo Bắt Buộc Trong EcuM (Từ Xung Nhịp → Chân Pin → Ngoại Vi)",
                         D["ecu_init_seq"] +
                         "<ul><li><b>Tại sao <code>Mcu</code> phải chạy đầu tiên?</b> Mọi module (<code>Adc, Pwm, Spi, Can</code>) đều lấy xung nhịp chia từ bộ nhân PLL do <code>Mcu_DistributePllClock()</code> cấp.</li>"
                         "<li><b>Tại sao <code>Port_Init()</code> phải chạy trước <code>Dio / Adc / Pwm / Spi / Can</code>?</b> Chân vật lý phải được định tuyến đúng chức năng Multiplexer (<code>PCR[n].MUX</code>) và mức điện áp ban đầu trước khi ngoại vi phát tín hiệu.</li>"
                         "<li><b>Điểm đặc biệt của <code>Dio</code>:</b> Module <code>Dio</code> không có hàm <code>Dio_Init()</code> (Stateless) trong AUTOSAR R20-11/R22-11/R23-11!</li></ul>")
        },
        {
            "title": "1.4. Synchronous vs Asynchronous & Bảng Tổng Hợp 8 Module",
            "html": card("Tổng Hợp Cơ Chế Thực Thi, Input Lấy Từ Đâu & Output Route Đến Đâu",
                         tbl(["Module", "Cơ chế thực thi", "Input lấy từ đâu?", "Output route đến đâu?"], [
                             ["<b>Mcu (101)</b>", "Synchronous + Wait PLL", "<code>EcuM / BswM</code> &amp; thanh ghi <code>PLL_SR, RGM</code>", "Xung nhịp hệ thống (<code>fCPU/fCAN/fADC</code>), ResetReason &amp; <code>Dem/Det</code>."],
                             ["<b>Port (124)</b>", "Synchronous", "<code>EcuM</code> (Init) &amp; <code>IoHwAb</code> (SetDir/Mode/Refresh)", "Ma trận Mux <code>PCR[0..N]</code> tới mọi chân chip &amp; <code>Det</code>."],
                             ["<b>Dio (120)</b>", "Synchronous Atomic", "<code>IoHwAb</code> &amp; thanh ghi mức logic <code>GPIO_PDIR</code>", "<code>GPIO_PDOR/PTOR</code> (Chân Pin vật lý) &amp; trả về <code>IoHwAb → SWC</code>."],
                             ["<b>Adc (123)</b>", "Async (ISR EOC / HW Trig)", "<code>IoHwAb</code>, xung Timer HW &amp; áp Analog chân <code>ANx</code>", "Result Buffer RAM 12-bit &amp; callback <code>IoHwAb_AdcNotification()</code>."],
                             ["<b>Pwm (121)</b>", "Sync Register Shadow", "<code>IoHwAb</code> truyền Duty (0..0x8000) &amp; Period", "Sóng vuông chân Pin (cuối chu kỳ) &amp; callback <code>Pwm_Notification()</code>."],
                             ["<b>Spi (83)</b>", "Sync (Lv0) / Async (ISR/Poll)", "<code>Wdg / CanTrcv / Ea</code> nạp <code>IB / EB</code> &amp; MISO", "MOSI + <code>CS</code> + <code>Spi_JobEnd/SeqEndNotification()</code> + <code>Dem</code>."],
                             ["<b>Can (80)</b>", "Async (Interrupt / Polling)", "<code>CanIf_Transmit</code> → <code>Can_Write(HTH)</code> &amp; CAN Bus", "<code>CanIf_TxConfirmation / RxIndication(HRH) / ControllerBusOff</code>."],
                             ["<b>Fls (92)</b>", "Async Non-Blocking (MainFn)", "<code>Fee</code> (Erase/Write/Read/Compare) &amp; nhịp <code>SchM</code>", "Ô nhớ Data Flash (0xFF) &amp; <code>Fee_JobEnd/ErrorNotification()</code>."],
                         ]))
        }
    ]

    sec1 = [
        {
            "title": "2.1. Clock Tree & Quy Trình 3 Bước Khóa Pha PLL",
            "html": card("Quy Trình 3 Bước An Toàn: Mcu_InitClock → GetPllStatus → DistributePllClock",
                         D["mcu_pll"] +
                         "<ol><li><b>Bước 1 — <code>Mcu_InitClock()</code>:</b> Cấu hình bộ chia và khởi động VCO nhân tần PLL (<code>16 MHz → 160 MHz</code>), nhưng <b>tuyệt đối không nối thẳng vào CPU</b> lúc mạch VCO chưa ổn định tần số.</li>"
                         "<li><b>Bước 2 — <code>Mcu_GetPllStatus()</code>:</b> EcuM thăm dò đến khi thanh ghi phần cứng <code>PLL_SR[LOCK] = 1</code> (Bit 7 <code>PLL_LOCK_OK</code> trên Thanh A bật 1 ➔ trả về <code>MCU_PLL_LOCKED</code>). Nếu <code>McuNoPll = TRUE</code> thì trả về <code>MCU_PLL_STATUS_UNDEFINED</code>.</li>"
                         "<li><b>Bước 3 — <code>Mcu_DistributePllClock()</code>:</b> Đóng bộ chọn MUX phân phối xung <code>fCPU=160MHz, fBUS=80MHz, fCAN=80MHz, fADC=40MHz</code>. Nếu gọi hàm này khi PLL chưa khóa sẽ kích hoạt ngay <code>Det_ReportError(MCU_E_PLL_NOT_LOCKED = 0x0E)</code>!</li></ol>")
        },
        {
            "title": "2.2. Giải Mã Thanh Ghi Reset (ResetReason vs Raw)",
            "html": card("Mcu_GetResetReason() & Mcu_GetResetRawValue() (SWS_Mcu_00005 / 00006)",
                         "<p>Vi điều khiển lưu vết nguyên nhân lần khởi động lại gần nhất trong thanh ghi phần cứng (như <code>RGM_DES / FES</code>). <code>EcuM</code> đọc giá trị này ngay pha <code>StartPreOS</code> để phân biệt mở khóa điện hay tự reset do Watchdog lỗi.</p>" +
                         tbl(["Giá trị Enum chuẩn", "Nguyên nhân vật lý", "Ứng xử của hệ thống &amp; Nút thử S2"], [
                             ["<code>MCU_POWER_ON_RESET</code>", "Cấp nguồn ắc-quy (POR) lần đầu", "Khởi tạo đầy đủ RAM, phục hồi bình thường."],
                             ["<code>MCU_WATCHDOG_RESET</code>", "Watchdog tràn bộ đếm do treo CPU", "Ghi lỗi chẩn đoán <code>Dem</code>, chuyển sang Safe-State / Degraded Mode."],
                             ["<code>MCU_SW_RESET</code>", "Gọi <code>Mcu_PerformReset()</code>", "Xảy ra khi nhận dịch vụ UDS <code>0x11 ECUReset</code> để nhảy vào Bootloader FOTA."],
                             ["<code>MCU_RESET_UNDEFINED</code>", "Chưa xác định được cờ phần cứng", "Xử lý fallback an toàn tại <code>EcuM</code>."],
                         ]))
        },
        {
            "title": "2.3. Chế Độ Năng Lượng (RUN/HALT/STOP) & RAM",
            "html": card("Quản Lý Tiết Kiệm Điện Qua Mcu_SetMode() & Mcu_InitRamSection()",
                         tbl(["Power Mode", "Trạng thái CPU Core", "Trạng thái PLL (Bit 7 Thanh A)", "Cách đánh thức (Wakeup)"], [
                             ["<code>MCU_MODE_RUN</code>", "Chạy full-speed (160 MHz)", "1 (PLL_LOCKED)", "Đang thức hoạt động bình thường."],
                             ["<code>MCU_MODE_HALT</code>", "Tạm dừng (lệnh WFI)", "Giữ nguyên / Giảm nhịp", "Bất kỳ ngắt ngoại vi nào (CAN Rx / Timer / GPIO IRQ)."],
                             ["<code>MCU_MODE_STOP</code>", "Ngủ sâu Deep Sleep (Cắt xung)", "0 (PLL tắt hẳn!)", "Xung đánh thức Wakeup qua <code>EcuM_CheckWakeup()</code> &amp; khóa lại PLL."],
                         ]) + "<p style='margin-top:8px'><b>Lưu ý:</b> <code>Mcu_PerformReset()</code> chỉ tồn tại khi bật cấu hình biên dịch <code>McuPerformResetApi = TRUE</code> (SWS_Mcu_00145).</p>")
        },
        {
            "title": "2.4. Từ Điển API SWS_Mcu R23-11 & Mã Lỗi DET/DEM",
            "html": card("Danh Mục API & Mã Lỗi Chuẩn Module Mcu (ModuleId = 101)",
                         tbl(["Hàm API chuẩn AUTOSAR R23-11", "SWS Ref", "Mô tả ngắn &amp; Lỗi liên quan"], [
                             ["<code>Mcu_Init(const Mcu_ConfigType* ConfigPtr)</code>", "SWS_Mcu_00153", "Khởi tạo driver Mcu. Lỗi: <code>MCU_E_INIT_FAILED</code>."],
                             ["<code>Mcu_InitClock(Mcu_ClockType ClockSetting)</code>", "SWS_Mcu_00155", "Kích cấu hình Clock setting ID &amp; PLL VCO."],
                             ["<code>Mcu_GetPllStatus(void)</code>", "SWS_Mcu_00157", "Trả về <code>MCU_PLL_LOCKED / UNLOCKED / UNDEFINED</code>."],
                             ["<code>Mcu_DistributePllClock(void)</code>", "SWS_Mcu_00156", "Nối PLL ra hệ thống. DET: <code>MCU_E_PLL_NOT_LOCKED (0x0E)</code>."],
                             ["<code>Mcu_SetMode(Mcu_ModeType McuMode)</code>", "SWS_Mcu_00161", "Chuyển <code>RUN / HALT / STOP</code>. DET: <code>MCU_E_PARAM_MODE (0x0C)</code>."],
                             ["<code>Mcu_PerformReset(void)</code>", "SWS_Mcu_00160", "Trigger HW Reset mềm (Khi <code>McuPerformResetApi=TRUE</code>)."],
                             ["<code>Mcu_GetResetReason() / InitRamSection()</code>", "SWS_Mcu_00158", "Đọc nguyên nhân Reset &amp; Xóa khởi tạo phân đoạn RAM."],
                             ["<code>Dem_SetEventStatus(MCU_E_CLOCK_FAILURE)</code>", "SWS_Mcu_00166", "Lỗi phần cứng DEM khi mất dao động thạch anh / PLL Unlock bất thường."],
                         ]))
        }
    ]

    sec2 = [
        {
            "title": "3.1. Ma Trận Pin Mux (PCR) & Kéo Áp / Slew Rate",
            "html": card("Kiến Trúc Pin Control Register (PCR) Trên Chip Vi Điều Khiển",
                         D["port_dio"] +
                         "<p>Mỗi chân vật lý trên vi điều khiển (ví dụ <code>PA0..PA3, PB0..PB3</code>) nối với một bộ chuyển mạch <b>Pin Multiplexer (ALT0..ALT7)</b> bên trong thanh ghi <code>PCR[n]</code>. Driver <b>Port</b> chịu trách nhiệm định tuyến toàn bộ chân chip một lần lúc khởi động: gắn chân nào cho <code>DIO</code>, chân nào cho <code>ADC</code>, chân nào phát xung <code>PWM</code>, hay giao tiếp bus <code>SPI / CAN</code>.</p>")
        },
        {
            "title": "3.2. Chống Nháy Chân Output (Level Trước Direction)",
            "html": card("Tại Sao Port_Init() Phải Ghi PortPinLevelValue Trước Khi Bật Output?",
                         "<p>Khi cấu hình một chân điều khiển Rơ-le hoặc Cầu H (Active High hoặc Active Low) làm ngõ ra:</p>"
                         "<ul><li>Nếu bật hướng <code>PORT_PIN_OUT</code> trước khi ghi mức mặc định, thanh ghi <code>GPIO_PDOR</code> đang mang giá trị rác (0V) sẽ tạo ra một <b>xung nháy (Glitch)</b> vài micro-giây làm giật rơ-le lúc mới bật chìa khóa!</li>"
                         "<li>Do đó theo <code>SWS_Port_00055</code>, <code>Port_Init()</code> <b>bắt buộc ghi mức logic khởi tạo <code>PortPinLevelValue</code> trước</b> rồi mới mở cổng đệm xuất <code>PORT_PIN_OUT</code> trong thanh ghi hướng!</li></ul>")
        },
        {
            "title": "3.3. Đổi Runtime & Chống Nhiễu EMC (Port_Refresh)",
            "html": card("Port_SetPinDirection / SetPinMode & Port_RefreshPortDirection()",
                         tbl(["Hàm Runtime", "Điều kiện ECUC bắt buộc", "Hành vi &amp; Bảo vệ an toàn"], [
                             ["<code>Port_SetPinDirection(Pin, Dir)</code>", "<code>PortPinDirectionChangeable == TRUE</code>", "Nếu chân bị khóa (<code>FALSE</code>, ví dụ chân LED/SPI cố định), lập tức chặn và báo <code>PORT_E_DIRECTION_UNCHANGEABLE (0x0B)</code>!"],
                             ["<code>Port_SetPinMode(Pin, Mode)</code>", "<code>PortPinModeChangeable == TRUE</code>", "Cho phép chuyển nóng chân giữa <code>DIO ↔ PWM</code> lúc runtime; nếu khóa báo <code>PORT_E_MODE_UNCHANGEABLE (0x0E)</code>."],
                             ["<code>Port_RefreshPortDirection()</code>", "Tự động áp cho mọi chân <code>FALSE</code>", "Đọc lại cấu hình chuẩn từ ROM nạp xuống thanh ghi hướng các chân cố định để sửa lỗi bit bị lật do nhiễu <b>EMC</b>, đồng thời giữ nguyên hướng chân changeable (PA0)!"],
                         ]))
        },
        {
            "title": "3.4. Từ Điển API SWS_Port R23-11 & Mã Lỗi DET",
            "html": card("Danh Mục API & Mã Lỗi DET Module Port (ModuleId = 124)",
                         tbl(["API chuẩn AUTOSAR R23-11", "SWS Ref", "Lỗi DET thường gặp"], [
                             ["<code>Port_Init(const Port_ConfigType* ConfigPtr)</code>", "SWS_Port_00140", "<code>PORT_E_INIT_FAILED (0x0C)</code>"],
                             ["<code>Port_SetPinDirection(Pin, Direction)</code>", "SWS_Port_00141", "<code>PORT_E_PARAM_PIN (0x0A)</code>, <code>PORT_E_DIRECTION_UNCHANGEABLE (0x0B)</code>"],
                             ["<code>Port_RefreshPortDirection(void)</code>", "SWS_Port_00142", "<code>PORT_E_UNINIT (0x0F)</code>"],
                             ["<code>Port_SetPinMode(Pin, Mode)</code>", "SWS_Port_00145", "<code>PORT_E_PARAM_INVALID_MODE (0x0D)</code>, <code>PORT_E_MODE_UNCHANGEABLE (0x0E)</code>"],
                             ["<code>Port_GetVersionInfo(Std_VersionInfoType*)</code>", "SWS_Port_00143", "<code>PORT_E_PARAM_POINTER (0x10)</code>"],
                         ]))
        }
    ]

    sec3 = [
        {
            "title": "4.1. Tại Sao Dio Không Có Hàm Dio_Init()?",
            "html": card("Triết Lý Stateless & Reentrant Của Driver Dio",
                         "<p>Khác với Mcu, Port, Adc, Pwm, Spi, Can, Fls — từ AUTOSAR 4.x / R20-11 / R23-11 trở đi, driver <b>Dio hoàn toàn KHÔNG CÓ hàm <code>Dio_Init()</code></b> (<code>SWS_Dio_00005</code>):</p>"
                         "<ul><li>Toàn bộ việc cài đặt hướng chân (Input/Output), điện trở kéo (Pull-Up/Down), tốc độ sườn và mức khởi tạo đã do <b>Port_Init()</b> thực hiện từ pha khởi động.</li>"
                         "<li><code>Dio</code> chỉ là tầng <b>ánh xạ thanh ghi I/O nguyên tử (Stateless &amp; Reentrant)</b> cực nhanh giúp nhiều Task / Ngắt đọc ghi đồng thời không bị tranh chấp.</li>"
                         "<li><b>An toàn Input (<code>SWS_Dio_00028</code>):</b> Nếu vô tình gọi <code>Dio_WriteChannel()</code> lên một chân đang là <code>PORT_PIN_IN</code>, Dio tự động bỏ qua thao tác ghi phần cứng!</li></ul>")
        },
        {
            "title": "4.2. Phân Biệt 3 Cấp: Channel, Port & ChannelGroup",
            "html": card("3 Cấp Độ Truy Cập Thanh Ghi Trong Dio",
                         D["port_dio"] +
                         tbl(["Cấp độ", "Khái niệm phần cứng", "API đọc &amp; ghi tương ứng"], [
                             ["<b>1. Dio_Channel</b>", "1 chân Pin đơn lẻ (VD: PA0 công tắc, PA1 đèn)", "<code>Dio_ReadChannel</code>, <code>Dio_WriteChannel</code>, <code>Dio_FlipChannel</code>"],
                             ["<b>2. Dio_Port</b>", "Cả cổng 8/16/32 chân (VD: Port 0 = 0xA5)", "<code>Dio_ReadPort</code>, <code>Dio_WritePort</code>, <code>Dio_MaskedWritePort</code>"],
                             ["<b>3. Dio_ChannelGroup</b>", "Một cụm các chân liền kề nhau trên cùng 1 Port xác định bởi <code>Mask</code> &amp; <code>Offset</code>", "<code>Dio_ReadChannelGroup</code>, <code>Dio_WriteChannelGroup</code>"],
                         ]))
        },
        {
            "title": "4.3. Phép Toán Mặt Nạ Bit (Mask & Offset)",
            "html": card("Cơ Chế Dịch Bit & Mặt Nạ Không Phá Các Chân Khác",
                         "<p>Giả sử ta dùng 4 chân cao (<code>Pin 4..7</code>) của Port 0 làm đèn LED Bar, còn 4 chân thấp (<code>Pin 0..3</code>) giữ giá trị đang có là <code>0101b (0x05)</code>. Khi cấu hình <code>Mask = 0xF0</code>, <code>Offset = 4</code> và gọi <code>Dio_WriteChannelGroup(&amp;LedGroup, 0x0A)</code>:</p>"
                         "<pre class='code-block'>Port0_New = (Port0_Old &amp; ~Mask) | ((Level &lt;&lt; Offset) &amp; Mask)\n"
                         "          = (0x55 &amp; 0x0F)       | ((0x0A &lt;&lt; 4) &amp; 0xF0)\n"
                         "          = 0x05                | 0xA0  =  0xA5 (1010_0101b)!</pre>"
                         "<p style='margin-top:6px'>Ngoài ra từ AUTOSAR R19-11+, <code>Dio_MaskedWritePort(PortId, Level, Mask)</code> cho phép chỉ định cặp (Level, Mask) bất kỳ mà không cần khai báo trước struct <code>ChannelGroup</code>.</p>")
        },
        {
            "title": "4.4. Từ Điển API SWS_Dio R23-11 & Mã Lỗi DET",
            "html": card("Danh Mục API & Mã Lỗi DET Module Dio (ModuleId = 120)",
                         tbl(["API chuẩn AUTOSAR R23-11", "SWS Ref", "Lỗi DET thường gặp"], [
                             ["<code>Dio_ReadChannel(ChannelId)</code>", "SWS_Dio_00133", "<code>DIO_E_PARAM_INVALID_CHANNEL_ID (0x0A)</code>"],
                             ["<code>Dio_WriteChannel(ChannelId, Level)</code>", "SWS_Dio_00134", "<code>DIO_E_PARAM_INVALID_CHANNEL_ID (0x0A)</code>"],
                             ["<code>Dio_FlipChannel(ChannelId)</code>", "SWS_Dio_00190", "Chỉ tồn tại khi bật <code>DioFlipChannelApi=TRUE</code>."],
                             ["<code>Dio_ReadPort / WritePort(PortId, ...)</code>", "SWS_Dio_00135", "<code>DIO_E_PARAM_INVALID_PORT_ID (0x14)</code>"],
                             ["<code>Dio_ReadChannelGroup / WriteChannelGroup</code>", "SWS_Dio_00137", "<code>DIO_E_PARAM_INVALID_GROUP (0x1F)</code>, <code>DIO_E_PARAM_POINTER (0x20)</code>"],
                             ["<code>Dio_MaskedWritePort(PortId, Level, Mask)</code>", "SWS_Dio_00300", "Chỉ tồn tại khi bật <code>DioMaskedWritePortApi=TRUE</code>."],
                         ]))
        }
    ]

    sec4 = [
        {
            "title": "5.1. Kiến Trúc AdcGroup & Máy Trạng Thái 4 Bước",
            "html": card("Vòng Đời Nhóm Kênh AdcGroup (SWS_Adc_00307)",
                         D["adc_pwm"] +
                         "<ul><li><code>Adc</code> gom các chân tương tự (VD: <code>AN0 TempSens</code>, <code>AN1 Vbat</code>) vào chung một <b><code>AdcGroup</code></b> để kích mẫu đồng loạt.</li>"
                         "<li><b>Máy trạng thái 4 bước:</b> <code>ADC_IDLE</code> (ngồi chờ) ➔ <code>ADC_BUSY</code> (SAR đang lấy mẫu, Bit 6 = 1) ➔ <code>ADC_COMPLETED</code> (xong 1 mẫu/vòng quét) ➔ <code>ADC_STREAM_COMPLETED</code> (đã lấp đầy đủ <code>AdcStreamingNumSamples</code> vào Result Buffer, bật Bit 5 <code>ADC_CONV_OK=1</code>).</li></ul>")
        },
        {
            "title": "5.2. SW Trigger vs HW Trigger & One-Shot vs Continuous",
            "html": card("Phân Biệt Nguồn Kích & Chế Độ Chuyển Đổi Trong Adc",
                         tbl(["Thuộc tính", "Lựa chọn 1", "Lựa chọn 2 &amp; Ràng buộc DET"], [
                             ["<b>Trigger Source</b><br>(<code>AdcGroupTriggSrc</code>)", "<code>ADC_TRIGG_SRC_SW</code>: Phần mềm gọi <code>Adc_StartGroupConversion()</code>", "<code>ADC_TRIGG_SRC_HW</code>: Xung từ Timer/PWM gọi qua <code>Adc_EnableHardwareTrigger()</code>. Gọi Start trên nhóm HW báo lỗi <code>ADC_E_WRONG_TRIGG_SRC (0x17)</code>!"],
                             ["<b>Conversion Mode</b><br>(<code>AdcGroupConvMode</code>)", "<code>ADC_CONV_MODE_ONESHOT</code>: Đủ N mẫu rồi tự dừng; sau <code>Adc_ReadGroup()</code> trở về <code>ADC_IDLE</code>", "<code>ADC_CONV_MODE_CONTINUOUS</code>: Tự động lặp lại vòng quét liên tục tới khi gọi <code>Adc_StopGroupConversion()</code> (Chỉ áp cho SW Trig)."],
                         ]))
        },
        {
            "title": "5.3. Single vs Streaming Buffer & SetupResultBuffer",
            "html": card("Tại Sao Bắt Buộc Phải Gọi Adc_SetupResultBuffer() Trước Khi Đo?",
                         "<p>Bộ điều khiển SAR ADC (hoặc DMA) cần biết trước địa chỉ mảng RAM nơi chứa dữ liệu 12-bit (<code>0..4095</code>) do tầng trên (<code>IoHwAb</code>) cấp phát:</p>"
                         "<ul><li>Nếu gọi <code>Adc_StartGroupConversion()</code> khi chưa gọi <code>Adc_SetupResultBuffer()</code> (Bit 3 <code>BUFF_LOCK_RDY == 0</code>), driver lập tức chặn và báo <b><code>ADC_E_BUFFER_UNINIT (0x19)</code></b>!</li>"
                         "<li><b><code>ADC_ACCESS_MODE_SINGLE</code>:</b> Lưu 1 mẫu gần nhất cho mỗi kênh, đọc qua <code>Adc_ReadGroup()</code>.</li>"
                         "<li><b><code>ADC_ACCESS_MODE_STREAMING</code>:</b> Thu thập liên tiếp N mẫu (<code>Linear</code> tự dừng khi đầy, <code>Circular</code> quay vòng ghi đè) và đọc nhanh zero-copy qua <code>Adc_GetStreamLastPointer()</code>.</li></ul>")
        },
        {
            "title": "5.4. Từ Điển API SWS_Adc R23-11 & Mã Lỗi DET",
            "html": card("Danh Mục API & Mã Lỗi DET Module Adc (ModuleId = 123)",
                         tbl(["API chuẩn AUTOSAR R23-11", "SWS Ref", "Chi tiết &amp; DET liên quan"], [
                             ["<code>Adc_Init(ConfigPtr)</code> / <code>Adc_DeInit()</code>", "SWS_Adc_00365", "<code>ADC_E_ALREADY_INITIALIZED (0x0D)</code>, <code>ADC_E_BUSY (0x0B)</code>"],
                             ["<code>Adc_SetupResultBuffer(Group, DataBufferPtr)</code>", "SWS_Adc_00419", "Cấp vùng nhớ ghi kết quả trước khi Start."],
                             ["<code>Adc_StartGroupConversion / StopGroupConversion</code>", "SWS_Adc_00367", "<code>ADC_E_BUFFER_UNINIT (0x19)</code>, <code>ADC_E_WRONG_TRIGG_SRC (0x17)</code>"],
                             ["<code>Adc_ReadGroup(Group, DataBufferPtr)</code>", "SWS_Adc_00369", "<code>ADC_E_IDLE (0x0C)</code> nếu gọi khi chưa đo xong."],
                             ["<code>Adc_EnableHardwareTrigger / DisableHardwareTrigger</code>", "SWS_Adc_00370", "Chỉ dùng cho nhóm <code>ADC_TRIGG_SRC_HW</code>."],
                             ["<code>Adc_EnableGroupNotification / GetStreamLastPointer</code>", "SWS_Adc_00372", "Kích callback <code>IoHwAb_AdcNotification_&lt;Group&gt;()</code> (SWS_Adc_00060)."],
                         ]))
        }
    ]

    sec5 = [
        {
            "title": "6.1. Thang Đo 16-Bit Chuẩn (0x0000 .. 0x8000)",
            "html": card("Tại Sao DutyCycle AUTOSAR Không Dùng % Mà Dùng Hệ 16-Bit 0x0000..0x8000?",
                         D["adc_pwm"] +
                         "<p>Vi điều khiển khác nhau có Timer 8-bit, 12-bit, 16-bit hoặc 32-bit khác nhau. Để tầng <code>IoHwAb / SWC</code> dùng chung một dải số chuẩn, AUTOSAR quy ước <b>100% = 0x8000 (32768 = 2¹⁵)</b>!</p>"
                         "<pre class='code-block'>Hardware_Compare_Ticks = (PeriodTicks * DutyCycle) &gt;&gt; 15\n"
                         "• 0x0000 (0)     =   0.0%   |  • 0x2000 (8192)  =  25.0%\n"
                         "• 0x4000 (16384) =  50.0%   |  • 0x6000 (24576) =  75.0%\n"
                         "• 0x8000 (32768) = 100.0%</pre>")
        },
        {
            "title": "6.2. FIXED_PERIOD vs VARIABLE_PERIOD & IdleState",
            "html": card("Phân Loại Kênh PwmChannelClass & Trạng Thái An Toàn PwmIdleState",
                         tbl(["Loại kênh (PwmChannelClass)", "Hàm được phép gọi", "Bảo vệ chống đổi tần số nhầm"], [
                             ["<code>PWM_FIXED_PERIOD</code>", "<code>Pwm_SetDutyCycle()</code>", "Nếu gọi <code>Pwm_SetPeriodAndDuty()</code> sẽ lập tức báo <code>PWM_E_PERIOD_UNCHANGEABLE (0x13)</code>!"],
                             ["<code>PWM_FIXED_PERIOD_SHIFTED</code>", "<code>Pwm_SetDutyCycle()</code>", "Chu kỳ cố định nhưng lệch pha so với kênh tham chiếu (giảm sụt áp nguồn)."],
                             ["<code>PWM_VARIABLE_PERIOD</code>", "<code>Pwm_SetDutyCycle()</code> + <code>Pwm_SetPeriodAndDuty()</code>", "Cho phép điều chỉnh động cả tần số (chu kỳ) và độ rộng xung cùng lúc."],
                         ]) + "<p style='margin-top:6px'>Khi gọi <b><code>Pwm_SetOutputToIdle(Ch)</code></b>, bộ đếm ngắt phát xung tức thời và khóa chân đầu ra về mức an toàn <code>PwmIdleState</code> (<code>PWM_LOW</code> hoặc <code>PWM_HIGH</code>, hạ Bit 4 <code>PWM_OUT_ACT=0</code>).</p>")
        },
        {
            "title": "6.3. Shadow Register Chống Xung Gai (Glitch-Free)",
            "html": card("Kỹ Thuật Cập Nhật Cuối Chu Kỳ (PwmDutycycleUpdatedEndperiod)",
                         "<p>Khi đang điều khiển MOSFET cầu H hoặc van tuyến tính, việc thay đổi thanh ghi So sánh (Compare Register) ngay giữa lúc bộ đếm Timer đang chạy có thể khiến chu kỳ hiện tại bị đứt gãy, sinh ra <b>xung gai nhiễu (Glitch)</b> gây đoản mạch!</p>"
                         "<ul><li>Khi bật <code>PwmDutycycleUpdatedEndperiod = TRUE</code>, giá trị Duty mới chỉ được nạp vào <b>Thanh ghi Bóng (Shadow/Double Buffer Register)</b> và phần cứng tự động chuyển nạp đồng bộ tại thời điểm bộ đếm quay về 0 (<b>End of Period</b>).</li>"
                         "<li>Hỗ trợ ngắt sườn xung <code>Pwm_EnableNotification(Ch, PWM_RISING_EDGE / FALLING_EDGE / BOTH_EDGES)</code> để đồng bộ hóa đo dòng động cơ.</li></ul>")
        },
        {
            "title": "6.4. Từ Điển API SWS_Pwm R23-11 & Mã Lỗi DET",
            "html": card("Danh Mục API & Mã Lỗi DET Module Pwm (ModuleId = 121)",
                         tbl(["API chuẩn AUTOSAR R23-11", "SWS Ref", "Ghi chú &amp; DET Error Code"], [
                             ["<code>Pwm_Init(ConfigPtr)</code> / <code>Pwm_DeInit()</code>", "SWS_Pwm_00095", "<code>PWM_E_ALREADY_INITIALIZED (0x14)</code>"],
                             ["<code>Pwm_SetDutyCycle(Channel, DutyCycle)</code>", "SWS_Pwm_00097", "Thang <code>0x0000 .. 0x8000</code> (<code>>=0x8000</code> giữ HIGH 100%)."],
                             ["<code>Pwm_SetPeriodAndDuty(Channel, Period, Duty)</code>", "SWS_Pwm_00098", "<code>PWM_E_PERIOD_UNCHANGEABLE (0x13)</code> nếu kênh FIXED."],
                             ["<code>Pwm_SetOutputToIdle(Channel)</code>", "SWS_Pwm_00099", "Đưa chân về mức <code>PwmIdleState</code> ngay lập tức."],
                             ["<code>Pwm_GetOutputState(Channel)</code>", "SWS_Pwm_00100", "Trả về <code>PWM_HIGH</code> hoặc <code>PWM_LOW</code>."],
                             ["<code>Pwm_EnableNotification / DisableNotification</code>", "SWS_Pwm_00102", "Chọn sườn <code>RISING / FALLING / BOTH_EDGES</code>."],
                         ]))
        }
    ]

    sec6 = [
        {
            "title": "7.1. Kiến Trúc 3 Tầng: Sequence → Job → Channel",
            "html": card("Mô Hình Phân Cấp Cốt Lõi Của AUTOSAR Spi Handler/Driver",
                         D["spi_hierarchy"] +
                         "<ol><li><b><code>SpiChannel</code>:</b> Gói dữ liệu cơ bản (độ dài, độ rộng bit 8/16/32, dịch <code>MSB</code> hay <code>LSB</code> trước, loại đệm IB/EB).</li>"
                         "<li><b><code>SpiJob</code>:</b> Nhóm các Channel truyền liên tiếp trong <b>một chu kỳ kéo chân <code>CS (Chip Select)</code> chung</b> tới cùng một IC ngoại vi (gắn với HW Unit, Baudrate, <code>CPOL/CPHA</code> và độ ưu tiên <code>SpiJobPriority = 0..3</code>). Kết thúc gọi <code>Spi_JobEndNotification()</code>.</li>"
                         "<li><b><code>SpiSequence</code>:</b> Nhóm một hoặc nhiều Job phải thực hiện nối tiếp; kết thúc toàn bộ Sequence gọi <code>Spi_SeqEndNotification()</code>.</li></ol>")
        },
        {
            "title": "7.2. So Sánh Internal Buffer (IB) vs External Buffer (EB)",
            "html": card("Khi Nào Dùng IB (Spi_WriteIB) & Khi Nào Dùng EB (Spi_SetupEB)?",
                         tbl(["Tiêu chí", "Internal Buffer (IB)", "External Buffer (EB)"], [
                             ["<b>Cấp phát bộ nhớ</b>", "Cấp phát tĩnh ngay trong RAM của Driver <code>Spi</code>", "Do tầng trên (<code>Ea / CanTrcv / Wdg</code>) giữ buffer riêng"],
                             ["<b>API nạp / đọc</b>", "<code>Spi_WriteIB()</code> &amp; <code>Spi_ReadIB()</code> (có copy byte)", "<code>Spi_SetupEB(Ch, SrcPtr, DesPtr, Length)</code> (<b>Zero-Copy</b>!)"],
                             ["<b>Ứng dụng tối ưu</b>", "Lệnh điều khiển ngắn ≤ 16 bytes (làm tươi SBC Watchdog, đọc thanh ghi CanTrcv)", "Khối dữ liệu lớn 64..4096 bytes (lưu trang SPI EEPROM ngoài, màn hình LCD)"],
                         ]))
        },
        {
            "title": "7.3. 3 Cấp LevelDelivered (0/1/2) & Chèn Ngang Preemption",
            "html": card("Cấp Độ Mở Rộng & Lập Lịch Chèn Ngang Interruptible Sequence",
                         "<ul><li><b><code>LEVEL 0</code>:</b> Chỉ hỗ trợ truyền đồng bộ <code>Spi_SyncTransmit()</code> (blocking CPU).</li>"
                         "<li><b><code>LEVEL 1</code>:</b> Chỉ hỗ trợ truyền bất đồng bộ <code>Spi_AsyncTransmit()</code> qua <code>SPI_INTERRUPT_MODE</code> hoặc <code>SPI_POLLING_MODE</code> (quét qua <code>Spi_MainFunction_Handling()</code>).</li>"
                         "<li><b><code>LEVEL 2</code> (Mặc định mô phỏng):</b> Hỗ trợ cả Sync và Async cùng cơ chế ưu tiên <code>SpiJobPriority (0..3)</code>!</li>"
                         "<li><b>Chèn ngang (<code>SpiInterruptibleSequence = TRUE</code>):</b> Khi Sequence EEPROM (Prio 1) gồm <code>Job_A</code> + <code>Job_B</code> vừa chạy xong <code>Job_A</code> (nhả CS), nếu có lệnh khẩn cấp Prio 3 tới, <code>Spi</code> tạm hoãn <code>Job_B</code> để ưu tiên chạy Prio 3 trước!</li></ul>")
        },
        {
            "title": "7.4. Từ Điển API SWS_Spi R23-11 & Mã Lỗi DET/DEM",
            "html": card("Danh Mục API & Mã Lỗi Module Spi (ModuleId = 83)",
                         tbl(["API chuẩn AUTOSAR R23-11", "SWS Ref", "DET / DEM Error Codes"], [
                             ["<code>Spi_Init(ConfigPtr)</code> / <code>Spi_DeInit()</code>", "SWS_Spi_00175", "<code>SPI_E_ALREADY_INITIALIZED (0x4A)</code>"],
                             ["<code>Spi_WriteIB / Spi_ReadIB(Channel, Ptr)</code>", "SWS_Spi_00177", "<code>SPI_E_PARAM_CHANNEL (0x0A)</code>"],
                             ["<code>Spi_SetupEB(Ch, SrcPtr, DesPtr, Length)</code>", "SWS_Spi_00180", "<code>SPI_E_PARAM_LENGTH (0x0D)</code>"],
                             ["<code>Spi_AsyncTransmit(Sequence)</code>", "SWS_Spi_00178", "<code>SPI_E_SEQ_PENDING (0x2A)</code> nếu truyền lồng trùng Sequence."],
                             ["<code>Spi_SyncTransmit(Sequence)</code>", "SWS_Spi_00185", "<code>SPI_E_SEQ_IN_PROCESS (0x3A)</code>"],
                             ["<code>Spi_Cancel(Seq)</code> / <code>Spi_SetAsyncMode(Mode)</code>", "SWS_Spi_00188", "<code>SPI_SEQ_CANCELLED</code>, <code>SPI_INTERRUPT/POLLING_MODE</code>"],
                             ["<code>Dem_SetEventStatus(SPI_E_HARDWARE_ERROR)</code>", "SWS_Spi_00068", "Lỗi phần cứng QSPI (Bus Collision / Hardware Timeout)."],
                         ]))
        }
    ]

    sec7 = [
        {
            "title": "8.1. Máy Trạng Thái Can Controller (SWS_Can_00414)",
            "html": card("4 Trạng Thái Của Can Controller & Quy Tắc Chuyển Đổi Nghiêm Ngặt",
                         D["can_flow"] +
                         "<ul><li><code>CAN_CS_UNINIT</code> ➔ <code>Can_Init()</code> ➔ <code>CAN_CS_STOPPED</code> (Đã nạp Baudrate/Filter nhưng chưa lên bus).</li>"
                         "<li><code>CAN_CS_STOPPED</code> ➔ <code>Can_SetControllerMode(CAN_CS_STARTED)</code> ➔ Đồng bộ 11 bit lặng trên bus, bật Bit 2 (<code>CAN_TXRX_OK=1</code>) &amp; báo <code>CanIf_ControllerModeIndication()</code>.</li>"
                         "<li><b>Chú ý DET <code>CAN_E_TRANSITION (0x06)</code>:</b> Cấm chuyển thẳng từ <code>CAN_CS_STARTED</code> sang <code>CAN_CS_SLEEP</code>! Phải qua <code>CAN_CS_STOPPED</code> trước.</li></ul>")
        },
        {
            "title": "8.2. Hộp Thư HOH: HTH Multiplexed & HRH Filter Mask",
            "html": card("Cơ Chế Định Tuyến Phần Cứng Hardware Object Handles (HOH)",
                         "<p>Trong AUTOSAR, driver <code>Can</code> giao tiếp với <code>CanIf</code> qua các handle phần cứng <b>HOH = HTH (Tx) + HRH (Rx)</b>:</p>"
                         "<ul><li><b><code>HTH (Hardware Transmit Handle)</code> &amp; <code>CanMultiplexedTransmission</code>:</b> Khi bật Multiplexed, 1 <code>HTH</code> quản lý một cụm 3 Tx Mailboxes xếp theo độ ưu tiên CAN ID, khắc phục nghẽn khung ưu tiên thấp chặn khung cao (<b>Priority Inversion</b>). Nếu đầy cả 3 hộp thư, trả về <b><code>CAN_BUSY</code></b> để <code>CanIf</code> xếp vào TxQueue phần mềm!</li>"
                         "<li><b><code>HRH (Hardware Receive Handle)</code> &amp; Lọc phần cứng:</b> Bộ lọc silicon chỉ nhận các khung thỏa điều kiện <code>(RxCanId &amp; FilterMask) == (FilterCode &amp; FilterMask)</code> (VD: <code>0x100 / 0x7F0</code> nhận <code>0x100..0x10F</code>). Khung lạ (<code>0x350</code>) bị vứt ngay ở phần cứng mà không làm tốn ngắt CPU!</li></ul>")
        },
        {
            "title": "8.3. CAN FD (64B + BRS) & Phục Hồi Bus-Off Với CanIf/CanSM",
            "html": card("CAN Flexible Data-Rate & Quy Trình Xử Lý Bus-Off Tự Động",
                         "<ul><li><b>Cờ nhận diện CAN FD:</b> Trong tham số <code>Can_PduType.id</code>, 2 bit MSB mang ý nghĩa đặc biệt: bit <code>0x80000000</code> báo Extended ID 29-bit, còn bit <b><code>0x40000000</code></b> bật chế độ <b>CAN FD</b> (lên tới <code>64 bytes</code> &amp; Bit Rate Switch <code>BRS = 2000 kbps</code>). Nếu tắt <code>CanFdBaudrateConfig=FALSE</code> mà truyền >8 bytes sẽ báo ngay <code>CAN_E_PARAM_DATA_LENGTH (0x03)</code>!</li>"
                         "<li><b>Sự cố Bus-Off (<code>TEC &gt;= 256</code>):</b> Khi bộ đếm lỗi truyền vượt 127 ➔ <code>CAN_ERRORSTATE_PASSIVE</code>; chạm 256 ➔ phần cứng ngắt bus về <code>CAN_CS_STOPPED</code> và gọi ngay <b><code>CanIf_ControllerBusOff()</code></b> ➔ <code>CanSM</code> đợi <code>BorTimeL1</code> rồi gọi lại <code>Can_SetControllerMode(STARTED)</code> phục hồi!</li></ul>")
        },
        {
            "title": "8.4. Từ Điển API SWS_Can R23-11 & Mã Lỗi DET",
            "html": card("Danh Mục API & Callbacks Module Can (ModuleId = 80)",
                         tbl(["API / Callback chuẩn AUTOSAR R23-11", "SWS Ref", "Mô tả &amp; DET Error Code"], [
                             ["<code>Can_Init(Config)</code> / <code>Can_DeInit()</code>", "SWS_Can_00223", "<code>CAN_E_UNINIT (0x05)</code>"],
                             ["<code>Can_SetControllerMode(Ctrl, Transition)</code>", "SWS_Can_00230", "<code>CAN_E_TRANSITION (0x06)</code> nếu sai sơ đồ trạng thái."],
                             ["<code>Can_Write(Hth, PduInfo)</code>", "SWS_Can_00233", "Trả <code>CAN_BUSY</code> nếu HTH đầy; <code>CAN_E_PARAM_DATA_LENGTH (0x03)</code>."],
                             ["<code>Can_GetControllerErrorState / TxErrorCounter</code>", "SWS_Can_00450", "Đọc <code>ACTIVE/PASSIVE/BUSOFF</code> và thanh ghi <code>TEC/REC</code>."],
                             ["<code>Can_CheckWakeup(Controller)</code>", "SWS_Can_00360", "Xác nhận xung đánh thức trên bus lúc <code>CAN_CS_SLEEP</code>."],
                             ["<code>CanIf_TxConfirmation / RxIndication / BusOff</code>", "SWS_CanIf", "Callbacks bắt buộc gọi ngược lên tầng <code>CanIf</code>."],
                         ]))
        }
    ]

    sec8 = [
        {
            "title": "9.1. Xử Lý Bất Đồng Bộ Qua Fls_MainFunction()",
            "html": card("Tại Sao Lệnh Fls_Erase & Fls_Write Không Bao Giờ Chặn CPU?",
                         D["fls_async"] +
                         "<p>Thao tác xóa 1 Sector Flash hoặc ghi 1 Page Flash cần từ vài milli-giây đến hàng chục milli-giây điện áp cao. Để không làm treo Real-Time OS (SchM/OSEK), <code>Fls_Erase()</code> và <code>Fls_Write()</code> chỉ kiểm tra điều kiện biên rồi trả về <b><code>E_OK</code> ngay lập tức</b> (<code>MEMIF_BUSY</code>).</p>"
                         "<ul><li>Công việc thực tế được chia thành từng mảnh nhỏ bên trong hàm định kỳ <b><code>Fls_MainFunction()</code></b> do <code>SchM</code> gọi theo chu kỳ OS.</li>"
                         "<li><b><code>MEMIF_MODE_SLOW</code> (Normal):</b> Chỉ xử lý <code>8B Write / 16B Read</code> mỗi tick để chừa CPU cho các Task điều khiển động cơ.</li>"
                         "<li><b><code>MEMIF_MODE_FAST</code> (Fast):</b> Tăng lên <code>32B Write / 64B Read</code> mỗi tick lúc <code>NvM_ReadAll</code> khởi động xe hoặc <code>NvM_WriteAll</code> tắt máy!</li></ul>")
        },
        {
            "title": "9.2. Ràng Buộc Vật Lý 0xFF→0 & Căn Chỉnh Sector/Page",
            "html": card("Quy Tắc Phần Cứng Bộ Nhớ Flash & Kiểm Tra Alignment",
                         "<ul><li><b>Luật <code>0xFF → 0x00</code>:</b> Bơm điện áp lập trình chỉ kéo được bit từ <code>1</code> (trạng thái <code>0xFF ERASED</code>) xuống <code>0</code>; muốn lật ngược bit <code>0</code> lên <code>1</code> bắt buộc phải chạy <b><code>Fls_Erase()</code></b> cho cả Sector!</li>"
                         "<li><b>Lỗi ghi đè:</b> Nếu bật <code>FlsWriteVerificationEnabled = TRUE</code> mà gọi <code>Fls_Write()</code> vào Page đang chứa dữ liệu (<code>!= 0xFF</code>), driver báo ngay <code>FLS_E_VERIFY_WRITE_FAILED</code> &amp; <code>Dem_SetEventStatus(FLS_E_WRITE_FAILED, FAILED)</code>!</li>"
                         "<li><b>Căn chỉnh địa chỉ (Alignment):</b> Lệnh <code>Fls_Write()</code> phải chia hết cho <code>FlsPageSize (8B)</code> và <code>Fls_Erase()</code> phải chia hết cho <code>FlsSectorSize</code>; sai sẽ báo <code>FLS_E_PARAM_ADDRESS (0x02)</code> / <code>FLS_E_PARAM_LENGTH (0x03)</code>.</li></ul>")
        },
        {
            "title": "9.3. BlankCheck, Cancel & Phân Biệt DET vs DEM",
            "html": card("Fls_BlankCheck / Cancel & Bức Tranh Tổng Thể DET vs DEM",
                         D["det_dem"] +
                         "<ul><li><b><code>Fls_BlankCheck(Addr, Len)</code> (R20-11+):</b> Kiểm tra nhanh vùng Flash đã trống <code>0xFF</code> sẵn chưa để <code>Fee</code> ghi thẳng mà không cần Erase lại, kéo dài tuổi thọ Flash.</li>"
                         "<li><b><code>Fls_Cancel()</code>:</b> Dừng ngay lập tức Job Flash đang dở (<code>MEMIF_JOB_CANCELED</code>, hạ Bit 1 <code>FLS_HV_BUSY=0</code>) để nhường ưu tiên Shutdown khẩn hoặc đọc cấp bách.</li></ul>")
        },
        {
            "title": "9.4. Từ Điển API SWS_Fls R23-11, Fee & Mã Lỗi DET/DEM",
            "html": card("Danh Mục API & Mã Lỗi Module Fls (ModuleId = 92)",
                         tbl(["API / Callback chuẩn AUTOSAR R23-11", "SWS Ref", "Ghi chú &amp; DET / DEM Error Code"], [
                             ["<code>Fls_Init(ConfigPtr)</code> / <code>Fls_MainFunction()</code>", "SWS_Fls_00249", "Hàm định kỳ thực thi tiến trình Erase/Write/Compare."],
                             ["<code>Fls_Erase(TargetAddress, Length)</code>", "SWS_Fls_00250", "<code>FLS_E_BUSY (0x06)</code>, <code>FLS_E_PARAM_ADDRESS (0x02)</code>."],
                             ["<code>Fls_Write(TargetAddress, SrcPtr, Length)</code>", "SWS_Fls_00251", "Căn chỉnh theo <code>FlsPageSize</code>; Verify khi <code>FlsWriteVerificationEnabled</code>."],
                             ["<code>Fls_Read / Fls_Compare(Addr, Buf, Len)</code>", "SWS_Fls_00256", "Trả <code>MEMIF_BLOCK_INCONSISTENT</code> nếu dữ liệu lệch."],
                             ["<code>Fls_BlankCheck(Addr, Len)</code> / <code>Fls_Cancel()</code>", "SWS_Fls_00371", "Dừng khẩn cấp đặt <code>MEMIF_JOB_CANCELED</code>."],
                             ["<code>Fee_JobEndNotification / Fee_JobErrorNotification</code>", "SWS_Fls_00347", "Báo hoàn tất hoặc lỗi về tầng <code>Fee → NvM</code>."],
                             ["<code>Dem: FLS_E_ERASE / WRITE / READ / COMPARE_FAILED</code>", "SWS_Fls_00260", "4 mã lỗi phần cứng báo trực tiếp lên <code>Dem</code>."],
                         ]))
        }
    ]

    return [sec0, sec1, sec2, sec3, sec4, sec5, sec6, sec7, sec8]


JS_PART6_TAIL = r'''
let activeHbTab1 = 0;
let activeHbTab2 = 0;
let activeAbbrCategory = "ALL";

function switchHbTab1(idx) {
  activeHbTab1 = idx;
  activeHbTab2 = 0;
  for (let i = 0; i <= 9; i++) {
    const b = document.getElementById("hbTab1_" + i);
    if (b) b.classList.toggle("active", i === idx);
  }
  const nav2 = document.getElementById("hbNav2");
  const abbrBox = document.getElementById("hbAbbrFilterBox");
  const isAbbr = idx === 9;
  if (nav2) nav2.classList.toggle("hidden", isAbbr);
  if (abbrBox) abbrBox.classList.toggle("hidden", !isAbbr);

  if (isAbbr) {
    filterAbbreviationTable();
  } else {
    renderHbNav2();
    renderHbContent();
  }
}

function renderHbNav2() {
  const nav2 = document.getElementById("hbNav2");
  if (!nav2) return;
  const topics = HANDBOOK_DATA[activeHbTab1] || [];
  nav2.innerHTML = topics.map((t, i) =>
    `<button class="hb-tab2 ${i === activeHbTab2 ? "active" : ""}" onclick="switchHbTab2(${i})">${escHtml(t.title)}</button>`
  ).join("");
}

function switchHbTab2(subIdx) {
  activeHbTab2 = subIdx;
  renderHbNav2();
  renderHbContent();
}

function renderHbContent() {
  const area = document.getElementById("hbContentArea");
  if (!area) return;
  const topics = HANDBOOK_DATA[activeHbTab1] || [];
  const item = topics[activeHbTab2] || topics[0];
  area.innerHTML = item ? item.html : "";
}

function setAbbrCategory(cat) {
  activeAbbrCategory = cat;
  ["ALL", "ARCH", "MCU", "PORT", "DIO", "ADC", "PWM", "SPI", "CAN", "FLS"].forEach(c => {
    const p = document.getElementById("catPill_" + c);
    if (p) p.classList.toggle("active", c === cat);
  });
  filterAbbreviationTable();
}

function highlightMatch(text, query) {
  const safe = escHtml(text);
  if (!query) return safe;
  const escapedQ = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp("(" + escapedQ + ")", "gi");
  return safe.replace(re, "<mark>$1</mark>");
}

function filterAbbreviationTable() {
  const area = document.getElementById("hbContentArea");
  const input = document.getElementById("abbrSearchInput");
  const badge = document.getElementById("abbrCountBadge");
  if (!area) return;
  const q = (input ? input.value : "").trim();
  const ql = q.toLowerCase();

  const filtered = ABBREVIATIONS.filter(item => {
    const catOk = activeAbbrCategory === "ALL" || item.cat === activeAbbrCategory;
    if (!catOk) return false;
    if (!ql) return true;
    return (
      item.abbr.toLowerCase().includes(ql) ||
      item.full.toLowerCase().includes(ql) ||
      item.desc.toLowerCase().includes(ql) ||
      item.cat.toLowerCase().includes(ql)
    );
  });

  if (badge) badge.textContent = `${filtered.length} / ${ABBREVIATIONS.length} thuật ngữ`;

  const rowsHtml = filtered.length === 0
    ? `<tr><td colspan="4" style="text-align:center;color:var(--mut);padding:16px">Không tìm thấy thuật ngữ phù hợp với "${escHtml(q)}".</td></tr>`
    : filtered.map(it => `
        <tr>
          <td class="mono" style="font-weight:800;color:var(--pri);white-space:nowrap">${highlightMatch(it.abbr, q)}</td>
          <td><span class="ch-pill pur">${highlightMatch(it.cat, q)}</span></td>
          <td class="mono" style="color:var(--cyan)">${highlightMatch(it.full, q)}</td>
          <td>${highlightMatch(it.desc, q)}</td>
        </tr>`).join("");

  area.innerHTML = `
    <div class="hb-card">
      <h3>🔤 Từ Điển Thuật Ngữ 8 Module MCAL Cốt Lõi (LIVE SEARCH)</h3>
      <table class="tbl">
        <thead><tr><th>Viết Tắt</th><th>Nhóm</th><th>Tên Đầy Đủ (English Full Name)</th><th>Giải Nghĩa Tiếng Việt &amp; Vai Trò Trong AUTOSAR MCAL</th></tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>`;
}

// ==================== BOOTSTRAP ON DOM READY ====================
document.addEventListener("DOMContentLoaded", () => {
  applySavedTheme();
  syncConfigFromStateToInputs();
  initTooltipHandlers();
  switchHbTab1(0);
  handleUrlHashOnBoot();
});
</script>
</body>
</html>
'''


def main():
    hb_data = build_handbook_data()
    out_path = os.path.join(HERE, "part6_handbook.js")
    with open(out_path, "w", encoding="utf-8", newline="\n") as f:
        f.write("// ================= PART 6: AUTO-GENERATED 9x4 HANDBOOK + LIVE ABBREVIATION SEARCH + BOOTSTRAP =================\n")
        f.write("const HANDBOOK_DATA = ")
        json.dump(hb_data, f, ensure_ascii=False, indent=2)
        f.write(";\n")
        f.write(JS_PART6_TAIL)
    print(f"Generated {out_path} ({len(hb_data)} sections x 4 topics = {sum(len(s) for s in hb_data)} topics)")


if __name__ == "__main__":
    main()
