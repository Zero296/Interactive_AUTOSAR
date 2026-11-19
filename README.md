# AUTOSAR Classic R25-11 Interactive Hub

Trang web offline tương tác giúp tra cứu kiến trúc **AUTOSAR Classic Platform R25-11** (theo `[SWS_BSW_91000..91002]`, **108** modules), chạy thử **27** luồng mô phỏng (**256** bước end-to-end) và mở nhanh **38** thẻ liên kết (**29** file `.html` mô phỏng chi tiết từng module).

---

## 1. Cách sử dụng nhanh

- **Mở trực tiếp (không cần cài đặt):** Double-click file `AUTOSAR.html`.
- **Hoặc chạy qua local server** *(khuyên dùng nếu muốn tự động tải lại `autosar_modules.json` khi chỉnh sửa)*:
  ```powershell
  python -m http.server 8000
  ```
  Sau đó mở trình duyệt tại `http://localhost:8000/AUTOSAR.html`.

---

## 2. Chức năng chính trên giao diện

- **Kiến Trúc (Canvas):**
  - Bấm vào từng module để xem tóm tắt, API/kết nối giữa các tầng và mở mô phỏng (chấm xanh lá).
  - Chọn **Bus / Nhóm** (`Core`, `CAN`, `CAN XL`, `Diagnostic`, `Security`, `Ethernet`, `TimeSync`, `J1939`, `LIN`, `FlexRay`, `Memory`, `I/O`) hoặc gõ `FuSa` vào **ô tìm kiếm** (hoặc bấm vào tag `🛡️ FuSa` / `+ Tag` trong khung **Chi tiết & Mô phỏng**) để lọc **15** module Functional Safety ISO 26262.
  - Chọn **Luồng mô phỏng (`F1`–`F27`)** ở thanh công cụ để xem đường đi gói tin/tín hiệu từng bước kèm mũi tên động và giải thích API R25-11.
- **Danh Mục:** Bảng tra cứu toàn bộ 108 module theo tầng, chuẩn AUTOSAR R25-11 và trạng thái liên kết.
- **JSON / Links:** Dán hoặc tải `autosar_modules.json` để cập nhật đường dẫn mô phỏng mà không cần sửa HTML.
- **Hướng Dẫn:** Tổng hợp kiến trúc phân tầng R25-11, danh sách 38 thẻ liên kết (29 file `.html`) và bộ 27 luồng mô phỏng.

---

## 3. Điểm cập nhật chuẩn AUTOSAR Classic R25-11

- **Cấu trúc BSW mới:** Bổ sung đầy đủ module chuẩn `[SWS_BSW_91000..91002]` như `Arti`, `SchM`, `SwCluC`, `BndM`, `LSduR`, `MemAcc`, `Mem`, `CorTst`, `RamTst`, `FlsTst`, `CanXL`, `CanXLTrcv`, `Dds`, `SomeIpXf`/`ComXf`/`E2EXf`/`DdsXf`, `SomeIpTp`, `Fw`, `Mka`, `Mirror`, `CanTSyn`/`EthTSyn`/`FrTSyn`, `IEEE1722Tp`, `FrArTp`, `Chrg`, `VdpCmR`, `Xcp`, `J1939*`, `I2C`, `Ocu`.
- **Hợp nhất & thay thế theo R25-11:**
  - `LdCom` được gộp vào `Com` dưới dạng **Large Data Path** (`Com_Transmit`).
  - `LSduR` nằm giữa Upper Comm và `CanIf`/`EthIf`/`LinIf`/`FrIf` trên đường dữ liệu L-SDU.
  - `MemAcc` + `Mem` thay thế truy cập trực tiếp `Fls`/`Eep` dưới `Fee`/`Ea`/`BndM` *(vẫn giữ 2 thẻ `[Legacy ≤ R20-11]` trỏ tới `AUTOSAR_MCAL.html#Fls` và `AUTOSAR_Eep.html` để không mất trình mô phỏng sẵn có)*.
  - `Det` bỏ gọi trực tiếp sang `Dlt`, chuyển sang dùng hook `<User_Error_Hooks>` / `DetReportRuntimeErrorCallout`.
- **4 luồng mô phỏng R25-11 mới (`F24`–`F27`):** `CanXL` + `Fw`, `Mka` MACsec + `EthTSyn`, `Dds` + `DdsXf`, và `SwCluC` + `BndM` + `CorTst`/`RamTst`/`FlsTst` + `MemAcc` + `Mem`.

---

## 4. Cấu trúc thư mục

- `AUTOSAR.html`: Trang hub chính (nhúng sẵn JSON để chạy offline bằng `file://`).
- `autosar_modules.json`: Dữ liệu 108 module, 38 liên kết mô phỏng và 27 luồng (256 bước).
- `Simulation/`: Các file `.html` mô phỏng chi tiết được phân theo tầng (`01_Application` -> `06_CDD`).
- `LocalDoc/`: Tài liệu tham khảo tiêu chuẩn **AUTOSAR Classic R25-11** (`CP/`).
