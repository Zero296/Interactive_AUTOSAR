# -*- coding: utf-8 -*-
"""Generates part6_handbook.js with 6x4 Multi-Level Handbook Tabs, 18 SVGs & Tab 7 Searchable Abbreviations."""

import json
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

from hb_diagrams_iohwab import get_hb_diagrams


def build_handbook_tabs(d: dict[str, str]) -> list[dict]:
    return [
        # TAB 0: Architecture & Responsibilities
        {
            "id": 0,
            "title": "1. Kiến Trúc & Trách Nhiệm",
            "subs": [
                {
                    "title": "1.1 VFB & Tầng ECU Abstraction",
                    "html": f"""
<div class="hb-card">
  <h3>Vai Trò Trung Tâm Của IoHwAb Trong Kiến Trúc AUTOSAR Classic</h3>
  <p><b>IoHwAb (I/O Hardware Abstraction)</b> nằm tại tầng <b>ECU Abstraction Layer (ECUAL)</b> (Module ID chuẩn = <code>254</code>). Nhiệm vụ cốt lõi là thiết lập bức tường cách ly giữa phần mềm ứng dụng (<b>SWC</b>) với các driver phần cứng đặc thù vi điều khiển (<b>MCAL</b>).</p>
  {d['hb_0_layers']}
  <ul>
    <li><b>SWC Application:</b> Chỉ hiểu đơn vị kỹ thuật (<code>0..100%</code> bàn đạp ga, <code>RPM</code> tốc độ bánh xe, <code>TRUE/FALSE</code> công tắc phanh). Nếu chuyển đổi vi điều khiển (vd từ Infineon Aurix sang NXP S32K) hay đổi sơ đồ chân mạch PCB, mã nguồn C của SWC <b>không phải sửa 1 dòng</b>.</li>
    <li><b>IoHwAb Core:</b> Chứa toàn bộ ánh xạ chân (Pin Mapping), độ phân giải SAR-ADC (10/12-bit), cực tính điện áp Active-Low/High, công thức Ratiometric, bộ lọc IIR, giới hạn kẹp cầu H và logic an toàn FiM/DEM.</li>
    <li><b>MCAL Layer:</b> Port, Dio, Adc, Pwm, Icu, Spi chỉ thực thi lệnh đọc/ghi thanh ghi ngoại vi thô (STD_LOW, Raw Count 2048, Duty 0x4000).</li>
  </ul>
</div>"""
                },
                {
                    "title": "1.2 Giao Tiếp Client-Server & Luồng F9",
                    "html": f"""
<div class="hb-card">
  <h3>Chuẩn Giao Tiếp Client-Server (C/S) Qua RTE Trong Luồng F9</h3>
  <p>Khác với các BSW Service thuần cấu hình tĩnh, IoHwAb phơi bày các Port dạng <b>Client-Server Interface</b> qua RTE để SWC Sensor/Actuator gọi đồng bộ tại runtime.</p>
  {d['hb_0_cs_interface']}
  <table class="tbl">
    <thead><tr><th>Chiều Tín Hiệu</th><th>Hàm RTE (Phía SWC)</th><th>Hàm IoHwAb Thực Thi</th><th>MCAL / Driver Bên Dưới</th></tr></thead>
    <tbody>
      <tr><td>Cảm biến Analog</td><td><code>Rte_Call_RpIoHwAb_Pedal_GetPhysVal(&amp;Pct, &amp;Qual)</code></td><td><code>IoHwAb_PedalSensor_GetPhysVal()</code></td><td><code>Adc_ReadGroup()</code> → Scaling → IIR</td></tr>
      <tr><td>Công tắc Digital</td><td><code>Rte_Call_RpIoHwAb_BrakeSw_GetState(&amp;Pressed, &amp;Qual)</code></td><td><code>IoHwAb_BrakeSw_GetState()</code></td><td><code>Dio_ReadChannel()</code> → Invert → Debounce</td></tr>
      <tr><td>Cơ cấu Chấp hành</td><td><code>Rte_Call_RpIoHwAb_Throttle_SetDuty(Target, Dir)</code></td><td><code>IoHwAb_ThrottleAct_SetDuty()</code></td><td><code>Dio_WriteChannel(DIR)</code> + <code>Pwm_SetDutyCycle(0x8000)</code></td></tr>
      <tr><td>Đo Tốc độ ICU</td><td><code>Rte_Call_RpIoHwAb_WheelSpd_GetRpm(&amp;Rpm, &amp;Duty)</code></td><td><code>IoHwAb_WheelSpeed_GetRpm()</code></td><td><code>Icu_GetDutyCycleValues()</code> → RPM Formula</td></tr>
    </tbody>
  </table>
</div>"""
                },
                {
                    "title": "1.3 Chuỗi Khởi Tạo Init Stack & MainFunction",
                    "html": f"""
<div class="hb-card">
  <h3>Thứ Tự Bắt Buộc Trong EcuM_StartupTwo &amp; Cyclic Execution</h3>
  <p>IoHwAb phụ thuộc trực tiếp vào thanh ghi MCAL và xung clock ngoại vi. Vì vậy <code>EcuM</code> / <code>BswM</code> bắt buộc tuân thủ trình tự Init nghiêm ngặt:</p>
  {d['hb_0_init_seq']}
  <ol>
    <li><code>Port_Init(&amp;Port_Config)</code>: Thiết lập hướng chân, chức năng AltFunc (ADC/PWM/ICU) và điện trở kéo nội (<code>PORT_PIN_IN_PULL_UP</code>).</li>
    <li><code>Adc_Init / Pwm_Init / Icu_Init</code>: Cấp clock ngoại vi, cài đặt tần số sóng mang 2000Hz và bật thanh ghi đệm Shadow Register.</li>
    <li><code>IoHwAb_Init(&amp;IoHwAb_Config)</code>: Khởi tạo biến trạng thái bộ lọc IIR/Debounce, xóa bộ đếm lỗi DEM và bật cờ <b>Bit7 IOHWAB_INIT = 1</b>.</li>
    <li><b>OS Cyclic Task (5ms):</b> Gọi <code>IoHwAb_MainFunction()</code> cập nhật bộ đếm chống dội DIO, lọc IIR, đọc dòng SmartFET và kiểm tra FiM Safe-State.</li>
  </ol>
</div>"""
                },
                {
                    "title": "1.4 So Sánh ranh giới IoHwAb vs MCAL vs SWC",
                    "html": """
<div class="hb-card">
  <h3>Bảng Phân Ranh Giới Thiết Kế Chuẩn Production (Tránh Vi Phạm Layer)</h3>
  <table class="tbl">
    <thead><tr><th>Chức Năng / Dữ Liệu</th><th>Nằm Tại Tầng</th><th>Lý Do Thiết Kế AUTOSAR</th></tr></thead>
    <tbody>
      <tr><td>Chọn thanh ghi <code>ADC_CH_3</code> hoặc <code>PORT_D_PIN_1</code></td><td><b>MCAL (ECUC)</b></td><td>Phụ thuộc sơ đồ chân chip MCU cụ thể.</td></tr>
      <tr><td>Bù trừ nguồn <code>5V_Ref</code>, hệ số chia áp PCB, lọc IIR</td><td><b>IoHwAb (ECUAL)</b></td><td>Phụ thuộc mạch điện tử bo mạch ECU (PCB Layout).</td></tr>
      <tr><td>Đảo cực tính <code>ACTIVE_LOW</code> công tắc &amp; Debounce 15ms</td><td><b>IoHwAb (ECUAL)</b></td><td>Giấu cách đấu nối phần cứng công tắc kéo mass hay dương.</td></tr>
      <tr><td>Đổi điện trở nhiệt NTC sang độ C bằng bảng tra 20 điểm</td><td><b>IoHwAb</b> hoặc <b>SWC_SA</b></td><td>IoHwAb xuất mV/Ω tuyến tính hoặc °C trực tiếp tùy dự án.</td></tr>
      <tr><td>Thuật toán điều khiển mô-men xoắn PID / Cruise Control</td><td><b>SWC_App (ASW)</b></td><td>Logic nghiệp vụ xe thuần túy, tái sử dụng qua mọi nền tảng.</td></tr>
    </tbody>
  </table>
</div>"""
                }
            ]
        },

        # TAB 1: Analog & Ratiometric
        {
            "id": 1,
            "title": "2. Chuỗi Analog & Ratiometric",
            "subs": [
                {
                    "title": "2.1 Quy Trình 5 Tầng Analog Acquisition",
                    "html": f"""
<div class="hb-card">
  <h3>Biến Đổi Tín Hiệu Từ Điện Áp Chân MCU Đến Giá Trị Vật Lý (%)</h3>
  <p>Tín hiệu cảm biến bàn đạp ga (CH0 <code>Pin P02.3</code>) đi qua chuỗi 5 bước chuyển đổi toán học và kiểm định chặt chẽ trước khi rời IoHwAb:</p>
  {d['hb_1_adc_chain']}
  <ul>
    <li><b>Lượng tử hóa SAR-ADC:</b> Với độ phân giải 12-bit (<code>0..4095</code>) và Vref = 5000mV, mỗi <code>1 LSB ≈ 1.22 mV</code>. Ở 2500mV, <code>Raw = round(2500/5000 × 4095) = 2048</code>.</li>
    <li><b>Chẩn đoán trước khi lọc:</b> Giá trị thô mV được so sánh ngay với ngưỡng Short-to-GND (&lt;250mV) và Short-to-Bat (&gt;4750mV) để gai chập dây không đầu độc giá trị bộ lọc IIR.</li>
    <li><b>Scaling Tuyến Tính PCB:</b> Sử dụng hệ số <code>Gain = 0.025</code> và <code>Offset = -12.5</code> để biến đổi dải cảm biến hợp lệ <code>500..4500 mV</code> thành chuẩn <code>0.0% .. 100.0%</code>.</li>
  </ul>
</div>"""
                },
                {
                    "title": "2.2 Công Thức Bù Tỷ Lệ Nguồn 5V Ratiometric",
                    "html": f"""
<div class="hb-card">
  <h3>Tại Sao Bù Ratiometric Là Bắt Buộc Với Cảm Biến Hall &amp; Biến Trở Ô Tô?</h3>
  <p>Các cảm biến vị trí dùng nguồn nuôi <code>5V_Ref</code> làm tham chiếu tỷ lệ điện áp đầu ra (ví dụ giữa hành trình luôn xuất đúng <code>50% × V_5V</code>). Khi nguồn 5V sụt áp trên dây dẫn hoặc LDO bị tải nặng, điện áp đo tại chân ADC sẽ giảm theo.</p>
  {d['hb_1_ratiometric']}
  <p><b>Công thức chuẩn IoHwAb:</b> <code>V_comp = V_measured × (5000.0 / V_5V_Measured)</code></p>
  <p><i>Ví dụ thực tế (Kịch bản S5):</i> Chân bàn đạp giữ cố định ở 50% khi V5V tụt từ <code>5000mV</code> xuống <code>4800mV</code>, cảm biến chỉ xuất <code>2400mV</code>. Nếu không có bù ratiometric, công thức cho kết quả sai là <code>47.5%</code>. Khi bật <code>IoHwAbEnableRatiometricCompensation</code>, IoHwAb nhân bù <code>5000/4800</code> phục hồi chính xác <code>2500mV → 50.0%</code>.</p>
</div>"""
                },
                {
                    "title": "2.3 Bộ Lọc Thông Thấp Số IIR EMA",
                    "html": f"""
<div class="hb-card">
  <h3>Triệt Tiêu Nhiễu Xung EMI Bằng IIR Exponential Moving Average</h3>
  <p>Để tiết kiệm RAM trên ECU (không cần lưu mảng 16–32 mẫu như bộ lọc FIR/Moving Average), IoHwAb dùng bộ lọc IIR bậc 1 siêu gọn nhẹ:</p>
  <p style="font-size:13.5px"><code>y[n] = α · x[n] + (1 − α) · y[n−1]</code></p>
  {d['hb_1_iir_ema']}
  <table class="tbl">
    <thead><tr><th>Hệ Số α</th><th>Độ Mượt Lọc Nhiễu</th><th>Tốc Độ Hội Tụ (5ms/tick)</th><th>Ứng Dụng Khuyến Nghị</th></tr></thead>
    <tbody>
      <tr><td><code>α = 0.15</code></td><td>Cực cao (Giảm ~85% gai 1-tick)</td><td>Chậm (~90 ms đạt 95%)</td><td>Cảm biến nhiệt độ nước, mức nhiên liệu</td></tr>
      <tr><td><code>α = 0.40</code></td><td>Cân bằng tốt (Mặc định)</td><td>Nhanh (~30 ms đạt 95%)</td><td>Bàn đạp ga (PedalPos), Cảm biến bướm ga</td></tr>
      <tr><td><code>α = 1.00</code></td><td>Bypass (Không lọc)</td><td>Tức thời (0 ms)</td><td>Đọc xung hoặc tín hiệu đã lọc phần cứng RC</td></tr>
    </tbody>
  </table>
</div>"""
                },
                {
                    "title": "2.4 Software Trigger vs Hardware Trigger (SAR-ADC)",
                    "html": """
<div class="hb-card">
  <h3>So Sánh Hai Chế Độ Kích Hoạt Lấy Mẫu Của MCAL Adc Driver</h3>
  <table class="tbl">
    <thead><tr><th>Thuộc Tính</th><th>ADC_TRIGG_SRC_SW (Software)</th><th>ADC_TRIGG_SRC_HW (Hardware Timer)</th></tr></thead>
    <tbody>
      <tr><td>Cơ chế kích</td><td>OS Task / IoHwAb gọi <code>Adc_StartGroupConversion()</code></td><td>Phần cứng GTM/eTPU Timer tự kích ngay giữa xung PWM</td></tr>
      <tr><td>Độ nhiễu đóng cắt MOSFET</td><td>Có thể rơi trúng thời điểm chuyển mạch H-Bridge</td><td>Né hoàn toàn thời điểm nhiễu dV/dt (đọc dòng chính xác nhất)</td></tr>
      <tr><td>Xử lý lỗi Busy</td><td>Phải check <code>Adc_GetGroupStatus() != ADC_BUSY</code></td><td>Tự động cập nhật vùng nhớ DMA theo chu kỳ phần cứng</td></tr>
    </tbody>
  </table>
</div>"""
                }
            ]
        },

        # TAB 2: DIO, PWM & ICU
        {
            "id": 2,
            "title": "3. DIO, PWM (0x8000) & ICU",
            "subs": [
                {
                    "title": "3.1 DIO Active-Low, Pull-Up & Debounce",
                    "html": f"""
<div class="hb-card">
  <h3>Chuẩn Hóa Tín Hiệu Số Công Tắc Cơ Khí (Brake Switch P00.7)</h3>
  <p>Đa số công tắc trên ô tô đấu nối kiểu <b>Low-Side Switch</b> (chân nối xuống mass GND khi nhấn) để giảm nguy cơ chập dương 12V trên dây vỏ xe.</p>
  {d['hb_2_dio_dbnc']}
  <ul>
    <li><b>Port Pin Pull-Up:</b> Điện trở kéo lên nội bộ giữ chân ở mức <code>STD_HIGH (5V/3.3V)</code> khi hở công tắc, chống trôi nhiễu floating pin.</li>
    <li><b>Inversion Logic:</b> Với <code>IoHwAbDioActivePolarity = ACTIVE_LOW</code>, mức phần cứng <code>STD_LOW</code> được đảo thành Logical <code>TRUE</code> cho SWC.</li>
    <li><b>Mechanical Contact Debounce:</b> Khi đóng/ngắt, lá đồng công tắc rung nảy trong 5..12ms. Cấu hình <code>IoHwAbDioDebounceTimeMs = 15ms</code> kết hợp chu kỳ 5ms yêu cầu 3 ticks liên tiếp ổn định trước khi đảo cờ gửi lên SWC.</li>
  </ul>
</div>"""
                },
                {
                    "title": "3.2 DIO Output Readback Integrity Check",
                    "html": """
<div class="hb-card">
  <h3>Giám Sát Hư Hỏng Ngõ Ra Bằng Readback (ISO 26262 Safety Check)</h3>
  <p>Trong các hệ thống liên quan đến an toàn (Main Relay, Fuel Pump Relay), không đủ nếu chỉ gọi <code>Dio_WriteChannel(CH_RELAY, STD_HIGH)</code> rồi tin rằng rơ-le đã đóng.</p>
  <ul>
    <li><b>Cơ chế Readback:</b> Với <code>IoHwAbDioOutputReadbackVerify = TRUE</code>, ngay sau lệnh ghi (hoặc tại đầu tick kế tiếp), IoHwAb gọi <code>Dio_ReadChannel(CH_RELAY)</code> đọc ngược trạng thái thanh ghi Input Buffer của chân đó.</li>
    <li><b>Phát hiện Stuck-at Fault:</b> Nếu lệnh ghi <code>STD_HIGH</code> mà chân đọc về vẫn <code>STD_LOW</code> (do chân vi điều khiển chập mass hoặc driver hỏng), IoHwAb tăng bộ đếm lỗi DEM và chuyển trạng thái <code>FIM_SAFE_IDLE</code>.</li>
    <li><b>Khóa Hướng Chân:</b> Tham số <code>PortPinDirectionChangeable</code> mặc định là <code>FALSE</code> để bảo vệ tuyệt đối không cho code lỗi vô tình chuyển chân Output công suất thành Input.</li>
  </ul>
</div>"""
                },
                {
                    "title": "3.3 PWM 15-bit 0x8000 Scale & Cầu H Safety Clamp",
                    "html": f"""
<div class="hb-card">
  <h3>Chuẩn Hóa Duty Cycle AUTOSAR 15-Bit (0x0000 .. 0x8000) &amp; Bảo Vệ Cầu H</h3>
  <p>AUTOSAR chuẩn hóa toàn bộ giao diện <code>Pwm_SetDutyCycle(Channel, DutyCycle)</code> dùng số nguyên 16-bit biểu diễn dải <b>0x0000 (0%) → 0x8000 (100%)</b>, không phụ thuộc Timer phần cứng 8-bit, 16-bit hay 24-bit bên dưới.</p>
  {d['hb_2_pwm_hbridge']}
  <table class="tbl">
    <thead><tr><th>Duty Phần Trăm</th><th>Công Thức Quy Đổi</th><th>Giá Trị Hex 15-bit</th><th>Ghi Chú An Toàn</th></tr></thead>
    <tbody>
      <tr><td><code>0.0 % (Idle)</code></td><td><code>Pwm_SetOutputToIdle()</code></td><td><code>0x0000 (0)</code></td><td>Tắt hoàn toàn MOSFET khi IDLE / FiM Safe</td></tr>
      <tr><td><code>5.0 % (Min Clamp)</code></td><td><code>0.05 × 32768</code></td><td><code>0x0666 (1638)</code></td><td>Biên dưới tối thiểu giữ ổn định kích mở</td></tr>
      <tr><td><code>50.0 %</code></td><td><code>0.50 × 32768</code></td><td><code>0x4000 (16384)</code></td><td>Mức chuẩn trong kịch bản F9</td></tr>
      <tr><td><code>80.0 %</code></td><td><code>0.80 × 32768</code></td><td><code>0x6666 (26214)</code></td><td>Tải cao / Uji thử DCM 0x2F</td></tr>
      <tr><td><code>95.0 % (Max Clamp)</code></td><td><code>0.95 × 32768</code></td><td><code>0x799A (31130)</code></td><td>Kẹp an toàn bảo vệ tụ Bootstrap H-Bridge</td></tr>
      <tr><td><code>100.0 %</code></td><td><code>1.00 × 32768</code></td><td><code>0x8000 (32768)</code></td><td>Chỉ đạt được khi tắt Duty Clamp</td></tr>
    </tbody>
  </table>
</div>"""
                },
                {
                    "title": "3.4 ICU Hardware Signal Measurement & RPM",
                    "html": f"""
<div class="hb-card">
  <h3>Đo Tần Số Bánh Xe &amp; Phát Hiện Mất Xung (Stall Timeout)</h3>
  <p>Module MCAL <code>Icu</code> sử dụng bộ đếm Timer phần cứng (1 MHz trong trình mô phỏng, <code>1 tick = 1 µs</code>) để ghi dấu thời gian các cạnh xung không tốn tải ngắt CPU ở tốc độ cao.</p>
  {d['hb_2_icu_rpm']}
  <ul>
    <li><b>Tính Tần Số &amp; RPM:</b> <code>Freq_Hz = 1,000,000 / PeriodTime_us</code>; sau đó IoHwAb nhân số răng đĩa cảm biến <code>Teeth = 20</code>: <code>RPM = (Freq_Hz × 60) / Teeth</code>. Ví dụ 500 Hz (2000 µs) tương ứng <code>1500 RPM</code>.</li>
    <li><b>Zero-Speed / Stall Detection:</b> Nếu quá thời gian <code>IoHwAbIcuTimeoutMs = 50ms</code> không bắt được cạnh mới, IoHwAb xác nhận bánh xe dừng (hoặc đứt cảm biến tốc độ), đặt <code>RPM = 0</code> và hạ <b>Bit1 ICU_CAP = 0</b>.</li>
  </ul>
</div>"""
                }
            ]
        },

        # TAB 3: Electrical Diag & DEM/FiM
        {
            "id": 3,
            "title": "4. Diag Điện & DEM / FiM",
            "subs": [
                {
                    "title": "4.1 Cửa Sổ Chẩn Đoán Điện Áp (0..5000 mV)",
                    "html": f"""
<div class="hb-card">
  <h3>Phát Hiện Chạm Mass (SCG) &amp; Chạm Nguồn Dương (SCB) Bằng Vùng Chết</h3>
  <p>Một nguyên tắc sống còn trong điện tử ô tô là dải hoạt động hợp lệ của cảm biến tương tự chỉ nằm ở giữa (<b>500..4500 mV</b>) để chừa khoảng trống phát hiện hư hỏng đường dây:</p>
  {d['hb_3_diag_window']}
  <ul>
    <li><b>Short-to-GND (&lt; 250 mV):</b> Chập dây xuống vỏ xe hoặc hở dây nguồn 5V kéo chân xuống mass. Thanh B bật <b>Bit7 SHORT_GND</b>.</li>
    <li><b>Short-to-Battery (&gt; 4750 mV):</b> Chập dây tín hiệu lên 5V/12V. Nếu không chặn ngưỡng này, ECU sẽ hiểu nhầm tài xế đang đạp 100% chân ga! Thanh B bật <b>Bit6 SHORT_BAT</b>.</li>
    <li><b>Supply 5V Monitor:</b> Nguồn nuôi cảm biến <code>5V_Ref</code> phải nằm trong <code>4750..5250 mV</code>; ra ngoài vùng này sẽ bật <b>Bit3 SUP_5V_FLT</b> và hạ Signal Quality xuống <code>DEGRADED</code>.</li>
  </ul>
</div>"""
                },
                {
                    "title": "4.2 DEM Event Debounce & Chính Sách Thay Thế",
                    "html": f"""
<div class="hb-card">
  <h3>Lọc Nhiễu Chẩn Đoán &amp; Chiến Lược Substitution Giá Trị An Toàn</h3>
  <p>Để tránh bật đèn Check Engine (MIL) vì một tia lửa nhiễu tức thời 5ms, IoHwAb kết hợp với DEM thực hiện cơ chế lọc đếm bước lỗi (Counter-based Debounce):</p>
  {d['hb_3_dem_debounce']}
  <table class="tbl">
    <thead><tr><th>Chiến Lược (<code>IoHwAbFaultSubstStrategy</code>)</th><th>Hành Vi Khi DEM == FAILED</th><th>Ý Nghĩa Vận Hành</th></tr></thead>
    <tbody>
      <tr><td><code>USE_REPLACEMENT_VALUE</code></td><td>Trả mức cố định <code>ReplacementPct</code> (10%)</td><td>Chế độ Limp-Home an toàn, đưa xe về số chậm cố định</td></tr>
      <tr><td><code>HOLD_LAST_VALID_VALUE</code></td><td>Giữ nguyên giá trị hợp lệ cuối cùng</td><td>Tránh giật cục đột ngột trong thời gian ngắn</td></tr>
      <tr><td><code>PASS_RAW_WITH_FAULT_FLAG</code></td><td>Truyền nguyên số đo + gắn <code>Qual=FAULT</code></td><td>Nhường toàn quyền xử lý dự phòng đa kênh cho SWC</td></tr>
    </tbody>
  </table>
</div>"""
                },
                {
                    "title": "4.3 Chuỗi An Toàn ISO 26262: DEM → FiM Safe-State",
                    "html": f"""
<div class="hb-card">
  <h3>Ngắt Chấp Hành Bằng Function Inhibition Manager (FiM)</h3>
  <p>Theo tiêu chuẩn an toàn chức năng ISO 26262, các lỗi nặng (kẹt Relay chính, mất đồng thời 2 cảm biến ga, quá dòng kéo dài) phải vô hiệu hóa tức thời cơ cấu chấp hành.</p>
  {d['hb_3_fim_safety']}
  <ul>
    <li><b>Tách biệt logic chẩn đoán khỏi SWC:</b> IoHwAb chỉ gọi <code>Dem_SetEventStatus()</code>. FiM tự động tổng hợp bảng ánh xạ DTC nào cấm <code>FID_THROTTLE_ACTUATOR</code>.</li>
    <li><b>FiM Hook trong IoHwAb:</b> Khi <code>IoHwAbEnableFiMSafeStateCheck == TRUE</code>, ở mỗi chu kỳ ghi ngõ ra, IoHwAb kiểm tra <code>FiM_GetFunctionPermission()</code>. Nếu <code>FALSE</code>, IoHwAb gọi <code>Pwm_SetOutputToIdle()</code> ép Duty về <b>0x0000</b> ngay lập tức.</li>
  </ul>
</div>"""
                },
                {
                    "title": "4.4 Thanh Ghi Trạng Thái 8-Bit (Reg A & Reg B)",
                    "html": """
<div class="hb-card">
  <h3>Giải Mã Nhanh Hai Thanh Ghi Tổng Hợp Trong Trình Mô Phỏng</h3>
  <p>Mặc định khi khởi tạo lành mạnh (F9): <b>Thanh A = <code>0xFB</code></b> (mọi bit=1 trừ b2 CLAMP=0) và <b>Thanh B = <code>0x00</code></b> (không có lỗi hay ghi đè).</p>
  <table class="tbl">
    <thead><tr><th>Bit</th><th>Thanh A (Signal Status Byte)</th><th>Thanh B (Diag &amp; Control Byte)</th></tr></thead>
    <tbody>
      <tr><td><code>b7 (0x80)</code></td><td><code>IOHWAB_INIT</code>: Module đã Init xong</td><td><code>SHORT_GND</code>: Chập Mass (&lt;250mV)</td></tr>
      <tr><td><code>b6 (0x40)</code></td><td><code>ADC_VALID</code>: Nhóm ADC không Busy/Lỗi</td><td><code>SHORT_BAT</code>: Chập Dương (&gt;4750mV)</td></tr>
      <tr><td><code>b5 (0x20)</code></td><td><code>RATIO_COMP</code>: Đang bù tỷ lệ 5V</td><td><code>OPEN_LOAD</code>: Hở mạch tải (0mA)</td></tr>
      <tr><td><code>b4 (0x10)</code></td><td><code>IIR_SETTLED</code>: Bộ lọc IIR đã hội tụ</td><td><code>OVER_CURR</code>: Quá dòng SmartFET (&gt;8A)</td></tr>
      <tr><td><code>b3 (0x08)</code></td><td><code>DIO_DEBOUNCE</code>: Phanh ổn định đủ 15ms</td><td><code>SUP_5V_FLT</code>: Nguồn 5V ngoài cửa sổ</td></tr>
      <tr><td><code>b2 (0x04)</code></td><td><code>PWM_CLAMPED</code>: Duty bị kẹp biên 5..95%</td><td><code>DEM_FAULT</code>: Lỗi xác nhận DEM FAILED</td></tr>
      <tr><td><code>b1 (0x02)</code></td><td><code>ICU_CAP</code>: Cảm biến tốc độ đang có xung</td><td><code>FIM_SAFE</code>: FiM Inhibit Safe-State Idle</td></tr>
      <tr><td><code>b0 (0x01)</code></td><td><code>SIG_GOOD</code>: Chất lượng tổng thể GOOD</td><td><code>DCM_0x2F</code>: Máy chẩn đoán 0x2F đang chiếm</td></tr>
    </tbody>
  </table>
</div>"""
                }
            ]
        },

        # TAB 4: DCM 0x2F & Shutdown
        {
            "id": 4,
            "title": "5. DCM UDS 0x2F & Sleep",
            "subs": [
                {
                    "title": "5.1 Kiến Trúc Multiplexer Ưu Tiên Trong IoHwAb",
                    "html": f"""
<div class="hb-card">
  <h3>Thang Thứ Tự Ưu Tiên Quyết Định Quyền Chiếm Ngõ Ra Actuator</h3>
  <p>Trong một chu kỳ, cùng lúc cả <code>SWC_App</code>, máy chẩn đoán <code>DCM 0x2F</code>, mạch bảo vệ <code>OCP</code> và <code>FiM</code> đều có thể tác động lên chân PWM. IoHwAb áp dụng bộ phân kênh (Multiplexer) 5 cấp nghiêm ngặt:</p>
  {d['hb_4_mux_priority']}
  <ol>
    <li><b>UNINIT / DEINIT:</b> Chưa Init hoặc đang tắt nguồn → Bắt buộc 0x0000 IDLE.</li>
    <li><b>FiM Safe-State:</b> Lỗi an toàn nghiêm trọng → Cắt 0x0000 IDLE, thắng cả lệnh thử nghiệm từ gara (DCM 0x2F)!</li>
    <li><b>Hardware Over-Current:</b> Dòng ISENSE vượt giới hạn MOSFET → Ngắt bảo vệ phần cứng tức thời.</li>
    <li><b>DCM UDS 0x2F Override:</b> Chỉ hoạt động khi an toàn (Cấp 1..3 không kích hoạt).</li>
    <li><b>Normal SWC_App:</b> Trạng thái vận hành lái xe bình thường.</li>
  </ol>
</div>"""
                },
                {
                    "title": "5.2 Bốn Chức Năng Chuẩn Của UDS Service 0x2F",
                    "html": f"""
<div class="hb-card">
  <h3>InputOutputControlByIdentifier (0x2F) Phục Vụ Kiểm Thử Xưởng</h3>
  <p>Thông qua cổng OBD-II, kỹ thuật viên gửi bản tin UDS <code>0x2F</code> tới DCM để điều khiển trực tiếp từng van/motor nhằm cô lập lỗi cơ khí vs phần mềm:</p>
  {d['hb_4_uds_0x2f']}
  <table class="tbl">
    <thead><tr><th>Tham Số Control</th><th>Mã Hex</th><th>API Mapping Xuống IoHwAb</th><th>Hành Vi Ngõ Ra</th></tr></thead>
    <tbody>
      <tr><td><code>ReturnControlToECU</code></td><td><code>0x00</code></td><td><code>IoHwAb_Dcm_*_ReturnControlToECU()</code></td><td>Xóa bit DCM_0x2F, trả quyền ngay cho SWC</td></tr>
      <tr><td><code>ResetToDefault</code></td><td><code>0x01</code></td><td><code>IoHwAb_Dcm_*_ResetToDefault()</code></td><td>Ép về giá trị mặc định tĩnh (0.0%), vẫn giữ quyền</td></tr>
      <tr><td><code>FreezeCurrentState</code></td><td><code>0x02</code></td><td><code>IoHwAb_Dcm_*_FreezeCurrentState()</code></td><td>Chốt cứng giá trị Duty đang chạy hiện hành</td></tr>
      <tr><td><code>ShortTermAdjustment</code></td><td><code>0x03</code></td><td><code>IoHwAb_Dcm_*_ShortTermAdjustment(Val)</code></td><td>Áp đặt giá trị mong muốn từ Tester (vd 80.0%)</td></tr>
    </tbody>
  </table>
</div>"""
                },
                {
                    "title": "5.3 Bảo Vệ SmartFET (Open-Load / OCP) & Sleep DeInit",
                    "html": f"""
<div class="hb-card">
  <h3>Chẩn Đoán Dòng Tải Thông Minh &amp; Tắt Nguồn ECU (IoHwAb_DeInit)</h3>
  <p>Các IC lái tải hiện đại (Infineon PROFET / Cầu H SmartFET) cấp tín hiệu dòng phản hồi <code>ISENSE</code> về chân ADC hoặc thanh ghi SPI để IoHwAb kiểm chứng tải vật lý thực sự:</p>
  {d['hb_4_smartfet_sleep']}
  <ul>
    <li><b>Open-Load (0 mA):</b> Nếu PWM đang lái &gt;10% mà dòng đo về = 0mA → Dây nối cuộn dây motor bị đứt hoặc lỏng giắc cắm (Thanh B Bit5 = 1).</li>
    <li><b>Over-Current (&gt;8000 mA):</b> Dây tải chạm vỏ xe gây đoản mạch → Tự động ngắt <code>Pwm_SetOutputToIdle()</code> bảo vệ chip driver.</li>
    <li><b>Shutdown Sleep:</b> Khi <code>BswM</code> chuyển chế độ <code>GO_OFF</code>, gọi <code>IoHwAb_DeInit()</code> cắt toàn bộ ngõ ra tránh rò dòng ắc quy qua đêm.</li>
  </ul>
</div>"""
                },
                {
                    "title": "5.4 Kiểm Chứng Clamp Ngay Cả Khi Đang Test DCM 0x2F",
                    "html": """
<div class="hb-card">
  <h3>Tại Sao Tester Gửi 0x2F = 100% Vẫn Bị Giới Hạn Ở 95%?</h3>
  <p>Trong kiến trúc phân tầng an toàn của IoHwAb, mô-đun kẹp biên <code>Duty Clamp Envelope (5%..95%)</code> nằm ở <b>tầng dưới của Multiplexer</b> (sau bước chọn giữa SWC và DCM 0x2F).</p>
  <p>Nhờ vậy, ngay cả khi kỹ thuật viên bảo dưỡng vô tình gửi lệnh <code>ShortTermAdjustment(99%)</code> trên cầu H chạy tụ Bootstrap, IoHwAb vẫn bảo vệ mạch công suất bằng cách kẹp xuống <code>95.0% (0x799A)</code> và bật <b>Thanh A Bit2 PWM_CLAMPED = 1</b>.</p>
</div>"""
                }
            ]
        },

        # TAB 5: API R23-11, DET & ECUC
        {
            "id": 5,
            "title": "6. API R23-11, DET & ECUC",
            "subs": [
                {
                    "title": "6.1 Danh Mục API Chuẩn AUTOSAR R22-11 / R23-11",
                    "html": f"""
<div class="hb-card">
  <h3>Hệ Thống Hàm API Của IoHwAb Theo Đặc Tả SWS Mới Nhất</h3>
  <p>Theo AUTOSAR Classic Release R20-11 đến R23-11, ngoại trừ các hàm vòng đời chuẩn, tên hàm dịch vụ I/O của IoHwAb được sinh tự động theo quy tắc định danh ShortName trong ECUC.</p>
  {d['hb_5_sws_apis']}
  <table class="tbl">
    <thead><tr><th>Nhóm Hàm API</th><th>Nguyên Mẫu Hàm C (Signature)</th><th>SWS Ref</th></tr></thead>
    <tbody>
      <tr><td>Khởi tạo</td><td><code>void IoHwAb_Init(const IoHwAb_ConfigType* ConfigPtr)</code></td><td>SWS_IoHwAb_00119</td></tr>
      <tr><td>Phiên bản</td><td><code>void IoHwAb_GetVersionInfo(Std_VersionInfoType* versioninfo)</code></td><td>SWS_IoHwAb_00120</td></tr>
      <tr><td>Tắt an toàn</td><td><code>void IoHwAb_DeInit(void)</code></td><td>Extension / BswM</td></tr>
      <tr><td>Cảm biến Analog</td><td><code>Std_ReturnType IoHwAb_&lt;Name&gt;_GetPhysVal(float32* Val, uint8* Qual)</code></td><td>C/S Sensor Port</td></tr>
      <tr><td>Chấp hành PWM</td><td><code>Std_ReturnType IoHwAb_&lt;Name&gt;_SetDuty(float32 DutyPct, uint8 Dir)</code></td><td>C/S Actuator Port</td></tr>
      <tr><td>DCM 0x2F Hook</td><td><code>Std_ReturnType IoHwAb_Dcm_&lt;Name&gt;_ShortTermAdjustment(...)</code></td><td>SWS_Dcm / IoHwAb</td></tr>
      <tr><td>Xử lý chu kỳ</td><td><code>void IoHwAb_MainFunction(void)</code></td><td>SchM Scheduled</td></tr>
    </tbody>
  </table>
</div>"""
                },
                {
                    "title": "6.2 Bảng Mã Lỗi DET (Module ID = 254)",
                    "html": f"""
<div class="hb-card">
  <h3>Bắt Lỗi Phát Triển DET &amp; Trạng Thái MCAL ADC_E_BUSY</h3>
  <p>Khi thông số <code>IoHwAbDevErrorDetect == TRUE</code>, IoHwAb kiểm tra tính hợp lệ đầu vào trước khi thực thi phần cứng và gọi <code>Det_ReportError(254, 0, ApiId, ErrorId)</code>.</p>
  {d['hb_5_det_errors']}
  <table class="tbl">
    <thead><tr><th>Mã Lỗi DET</th><th>Giá Trị Hex</th><th>Nguyên Nhân Phát Sinh</th><th>Hành Động Bảo Vệ</th></tr></thead>
    <tbody>
      <tr><td><code>IOHWAB_E_UNINIT</code></td><td><code>0x01</code></td><td>Gọi API khi <code>IoHwAbInitialized == FALSE</code></td><td>Trả E_NOT_OK, khóa Actuator IDLE</td></tr>
      <tr><td><code>IOHWAB_E_PARAM_POINTER</code></td><td><code>0x02</code></td><td>Truyền <code>NULL_PTR</code> vào GetPhysVal / VersionInfo</td><td>Thoát hàm an toàn tránh Page Fault</td></tr>
      <tr><td><code>IOHWAB_E_PARAM_CHANNEL</code></td><td><code>0x03</code></td><td>Channel ID vượt quá bảng ECUC</td><td>Không truy cập tràn mảng con trỏ</td></tr>
      <tr><td><code>IOHWAB_E_PARAM_VALUE</code></td><td><code>0x04</code></td><td>Duty <code>NaN</code> hoặc thông số ngoài biên vật lý</td><td>Từ chối ghi ra MCAL</td></tr>
    </tbody>
  </table>
</div>"""
                },
                {
                    "title": "6.3 Cấu Trúc ECUC Container & Sinh Mã ARXML",
                    "html": f"""
<div class="hb-card">
  <h3>Từ Cấu Hình ARXML Đến Tệp C Thực Tế (Cfg.h / Lcfg.c)</h3>
  <p>Tất cả 36 trường cấu hình trong panel bên trái mô phỏng trực tiếp các container thuộc file mô tả hệ thống <code>IoHwAb.arxml</code>:</p>
  {d['hb_5_ecuc_containers']}
  <ul>
    <li><b>IoHwAbGeneral:</b> Chứa công tắc DET, VersionInfo, chu kỳ MainFunction và ngưỡng giám sát nguồn 5V.</li>
    <li><b>IoHwAbConfig / Signals:</b> Liên kết từng Signal ID với tham chiếu <code>AdcGroupRef</code>, <code>DioChannelRef</code>, <code>PwmChannelRef</code>, <code>IcuChannelRef</code> tương ứng trong MCAL.</li>
    <li><b>Xuất Cấu Hình:</b> Bạn có thể bấm nút <b>"Xuất ARXML/C/JSON"</b> trên thanh Header bất cứ lúc nào để tải về bộ cấu hình hiện hành của trình mô phỏng.</li>
  </ul>
</div>"""
                },
                {
                    "title": "6.4 Checklist Rà Soát Cấu Hình ECU Trước Khi Build",
                    "html": """
<div class="hb-card">
  <h3>7 Điểm Kiểm Tra Nhanh Khi Cấu Hình IoHwAb Thực Tế (DaVinci / EB Tresos)</h3>
  <ol>
    <li>Đảm bảo <code>Port_Init</code> được đặt <b>trước</b> mọi driver khác và <code>IoHwAb_Init</code> đặt <b>sau cùng</b> trong EcuM InitList.</li>
    <li>Đồng bộ cặp thông số <code>PortPinPullMode</code> (Pull-Up) với <code>IoHwAbDioActivePolarity</code> (Active-Low).</li>
    <li>Kiểm tra <code>IoHwAbDioDebounceTimeMs</code> phải là bội số chẵn của <code>IoHwAbMainFunctionPeriodMs</code> (vd 15ms = 3 × 5ms).</li>
    <li>Xác nhận chỉ bật <code>IoHwAbEnableRatiometricCompensation</code> cho cảm biến ăn chung nguồn 5V tham chiếu ADC.</li>
    <li>Đảm bảo ngưỡng <code>ShortToGndThr (250mV)</code> &lt; Min Cảm Biến (500mV) và <code>ShortToBatThr (4750mV)</code> &gt; Max Cảm Biến (4500mV).</li>
    <li>Luôn giữ <code>IoHwAbEnableFiMSafeStateCheck = TRUE</code> để FiM ngắt được DCM 0x2F trong tình huống khẩn cấp.</li>
    <li>Cấu hình <code>PwmPolarityAndIdleState = IDLE_LOW</code> khớp với logic chân Enable/MOSFET mạch cầu H trên PCB.</li>
  </ol>
</div>"""
                }
            ]
        }
    ]


def main() -> None:
    diagrams = get_hb_diagrams()
    tabs = build_handbook_tabs(diagrams)
    tabs_json = json.dumps(tabs, ensure_ascii=False, indent=2)

    js_code = f"""// ==================== PART 6: HANDBOOK (6x4 = 24 SUB-TABS), TAB 7 ABBREVIATION SEARCH & BOOTSTRAP ====================

const HANDBOOK_TABS = {tabs_json};

let activeHbTab1 = 0;
let activeHbSub = 0;
let activeAbbrCategory = "ALL";

function escapeHtml(s) {{
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}}

function escapeRegex(s) {{
  return s.replace(/[.*+?^${{}}()|[\\]\\\\]/g, "\\\\$&");
}}

function highlightMatch(text, query) {{
  const safe = escapeHtml(text);
  if (!query || !query.trim()) return safe;
  const rx = new RegExp("(" + escapeRegex(query.trim()) + ")", "gi");
  return safe.replace(rx, "<mark>$1</mark>");
}}

function switchHbTab1(idx) {{
  activeHbTab1 = idx;
  activeHbSub = 0;
  for (let i = 0; i <= 6; i++) {{
    document.getElementById("hbTab1_" + i)?.classList.toggle("active", i === idx);
  }}
  renderHandbook();
}}

function switchHbSubTab(subIdx) {{
  activeHbSub = subIdx;
  renderHandbook();
}}

function setAbbrCategory(cat) {{
  activeAbbrCategory = cat;
  ["ALL", "CORE", "ADC", "DPWM", "DIAG"].forEach((c) => {{
    document.getElementById("catPill_" + c)?.classList.toggle("active", c === cat);
  }});
  filterAbbreviationTable();
}}

function filterAbbreviationTable() {{
  if (activeHbTab1 !== 6) return;
  const q = (document.getElementById("abbrSearchInput")?.value || "").trim();
  const ql = q.toLowerCase();
  const filtered = ABBREVIATIONS_DATA.filter((item) => {{
    if (activeAbbrCategory !== "ALL" && item.cat !== activeAbbrCategory) return false;
    if (!ql) return true;
    return (
      item.abbr.toLowerCase().includes(ql) ||
      item.full.toLowerCase().includes(ql) ||
      item.desc.toLowerCase().includes(ql) ||
      item.cat.toLowerCase().includes(ql)
    );
  }});

  const badge = document.getElementById("abbrCountBadge");
  if (badge) badge.textContent = filtered.length + " thuật ngữ";

  const catNames = {{
    CORE: "Core & VFB",
    ADC: "Analog & Scaling",
    DPWM: "DIO, PWM & ICU",
    DIAG: "Diag, DEM/FiM & 0x2F"
  }};

  const area = document.getElementById("hbContentArea");
  if (!area) return;
  if (!filtered.length) {{
    area.innerHTML = `<div class="hb-card"><p>Không tìm thấy thuật ngữ phù hợp với từ khóa "<b>${{escapeHtml(q)}}</b>".</p></div>`;
    return;
  }}

  const rows = filtered.map((item) => `
    <tr>
      <td class="mono"><b>${{highlightMatch(item.abbr, q)}}</b></td>
      <td><b>${{highlightMatch(item.full, q)}}</b></td>
      <td><span class="state-badge sb-pri">${{catNames[item.cat] || item.cat}}</span></td>
      <td>${{highlightMatch(item.desc, q)}}</td>
    </tr>
  `).join("");

  area.innerHTML = `
    <div class="hb-card">
      <h3>📖 Bảng Tra Cứu Thuật Ngữ &amp; Viết Tắt AUTOSAR IoHwAb (${{filtered.length}}/${{ABBREVIATIONS_DATA.length}} Mục)</h3>
      <table class="tbl">
        <thead>
          <tr>
            <th style="width:120px">Viết Tắt</th>
            <th style="width:240px">Tên Đầy Đủ (Tiếng Anh)</th>
            <th style="width:155px">Nhóm Chức Năng</th>
            <th>Giải Thích Kỹ Thuật &amp; Vai Trò Trong IoHwAb</th>
          </tr>
        </thead>
        <tbody>${{rows}}</tbody>
      </table>
    </div>
  `;
}}

function renderHandbook() {{
  const nav2 = document.getElementById("hbNav2");
  const abbrBox = document.getElementById("hbAbbrFilterBox");
  const area = document.getElementById("hbContentArea");
  if (!nav2 || !abbrBox || !area) return;

  if (activeHbTab1 === 6) {{
    nav2.classList.add("hidden");
    abbrBox.classList.remove("hidden");
    filterAbbreviationTable();
    return;
  }}

  nav2.classList.remove("hidden");
  abbrBox.classList.add("hidden");
  const tab = HANDBOOK_TABS[activeHbTab1] || HANDBOOK_TABS[0];
  const sub = tab.subs[activeHbSub] || tab.subs[0];

  nav2.innerHTML = tab.subs.map((s, i) => `
    <button class="hb-tab2 ${{i === activeHbSub ? "active" : ""}}" onclick="switchHbSubTab(${{i}})">${{s.title}}</button>
  `).join("");

  area.innerHTML = sub.html;
}}

// -------------------- INITIAL BOOTSTRAP --------------------

document.addEventListener("DOMContentLoaded", () => {{
  initConfigTooltips();
  createInitialSimState();
  loadScenario("S4");
  renderAll();
}});
</script>
</body>
</html>
"""

    out_path = os.path.join(SCRIPT_DIR, "part6_handbook.js")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(js_code)
    print(f"Generated {out_path} ({len(js_code)} bytes, {len(tabs)} main tabs, {sum(len(t['subs']) for t in tabs)} sub-tabs, {len(diagrams)} SVGs)")


if __name__ == "__main__":
    main()
