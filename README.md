# AUTOSAR Classic Interactive Architecture & Simulation Hub

Bộ công cụ web tương tác mô phỏng kiến trúc phân tầng **AUTOSAR Classic R23-11** (74 modules, 13 luồng chạy end-to-end với 128 bước chi tiết) và liên kết tới **29 module đã gắn mô phỏng** (trên 22 file `.html`).

---

## 1. Cách mở nhanh

- **Mở trực tiếp (Offline):** Double-click file `AUTOSAR.html` bằng trình duyệt bất kỳ (Chrome, Edge, Firefox). Toàn bộ dữ liệu mặc định đã được nhúng sẵn, không cần cài server hay internet.
- **Chạy qua HTTP cục bộ (tự đồng bộ khi sửa `autosar_modules.json`):**
  ```bash
  python -m http.server 8000
  ```
  Sau đó mở `http://localhost:8000/AUTOSAR.html`. Khi bạn chỉnh sửa `autosar_modules.json`, bấm **🔄 Reload** để cập nhật ngay.

---

## 2. Cấu trúc thư mục

```text
├── AUTOSAR.html              # Trang Hub chính (Kiến trúc, Danh mục, JSON Studio, Hướng dẫn)
├── autosar_modules.json      # File JSON cấu hình modules, đường dẫn .html và các luồng mô phỏng
├── Simulation/               # 22 file mô phỏng phân theo layer AUTOSAR (tương ứng 29 module)
│   ├── 01_Application/       # Tầng ASW (chờ bổ sung)
│   ├── 02_RTE/               # AUTOSAR_RTE.html
│   ├── 03_Services/          # 16 file (OS, EcuM, BswM, WdgM, DEM, FiM, NvM, ComM, COM, PduR, SecOC, DCM, Nm_CanNm, CanNM, CanSM, DoCAN)
│   ├── 04_ECU_Abstraction/   # 4 file (MemIf, Fee, Ea, IoHwAb)
│   ├── 05_MCAL/              # AUTOSAR_MCAL.html (8-Module Core MCAL: #Mcu, #Port, #Dio, #Adc, #Pwm, #Spi, #Can, #Fls)
│   ├── 06_Complex_Drivers/   # Chờ bổ sung
│   ├── assets/               # Tài nguyên hình ảnh phụ trợ
│   └── old/                  # Các bản mô phỏng cũ
├── Design_docs/              # 17 tài liệu thiết kế mô phỏng (*_Simulation_design.md)
├── Scripts/                  # 13 thư mục script build module (build_bswm, build_ecum, build_nvm, build_mcal, ...)
└── _Archive/                 # File nén lưu trữ cũ
```

---

## 3. Thao tác nhanh trên `AUTOSAR.html`

1. **Khám phá module (`🗺️ Kiến Trúc`):**
   - Click vào card module để chọn (highlight dây kết nối & xem API/mô tả ở cột phải **sticky**); click lại lần nữa để bỏ chọn.
   - Double-click vào card màu xanh hoặc bấm **Mở ↗** để mở trình mô phỏng chi tiết của module đó.
   - Gõ `/` để tìm nhanh module/API, lăn `Ctrl + Scroll` để zoom, kéo vùng trống để di chuyển.
2. **Mô phỏng luồng chạy (`Luồng mô phỏng`):**
   - Chọn 1 trong 13 luồng tiêu chuẩn (Boot-Up, CAN Tx/Rx, Non-Diag CanTp đa khung, NM Wakeup, Shutdown/NvM, UDS Diag, Dem Debounce/FiM, Watchdog ISO 26262, SecOC Crypto, I/O Adc-IoHwAb-Pwm, Ethernet SOME/IP-SD, CDD) rồi dùng **Bước Tiếp ▶** hoặc **▶ Tự Động** để xem đường đi động và giải thích API/ngữ cảnh/ý nghĩa ở cột phải.
3. **Danh mục & Hướng dẫn (`📋 Danh Mục`, `📖 Hướng Dẫn`):**
   - Tra cứu bảng toàn bộ 74 modules, kiểm tra trạng thái liên kết và khởi chạy nhanh các luồng từ tài liệu hướng dẫn.

---

## 4. Thêm / sửa đường dẫn mô phỏng bằng JSON

Khi tạo thêm file mô phỏng mới (ví dụ `Simulation/03_Services/AUTOSAR_NvM.html`), bạn có thể cập nhật theo 1 trong 2 cách:

- **Cách 1 — Sửa file `autosar_modules.json`:** Điền đường dẫn tương đối vào trường `"htmlPath"` của module tương ứng (hoặc thêm object mới vào `"modules"`). Nếu mở dạng `file://`, chỉ cần **kéo-thả file `.json` vào cửa sổ trình duyệt** hoặc bấm **📂 Nạp JSON**.
- **Cách 2 — Sửa trực tiếp trên web:** Chọn module bất kỳ để gắn/sửa link ở cột phải, hoặc vào tab **🧩 JSON / Links** để chỉnh trực tiếp / thêm module mới.
- **Lưu & chia sẻ:** Bấm **💾 Xuất JSON** để tải file `autosar_modules.json` mới, hoặc bấm **📥 Tải .HTML** để đóng gói toàn bộ cấu hình vào **1 file `AUTOSAR.html` duy nhất** gửi cho người khác.
