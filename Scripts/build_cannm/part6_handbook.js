/*************************************************************************
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
            <svg viewBox="0 0 920 260" class="hb-svg" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Diagram b01"><defs><marker id="b01_arr_sky" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-sky)"/></marker><marker id="b01_arr_ok" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-ok)"/></marker><marker id="b01_arr_warn" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-warn)"/></marker><marker id="b01_arr_err" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-err)"/></marker><marker id="b01_arr_vio" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-vio)"/></marker><marker id="b01_arr_ind" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-ind)"/></marker><marker id="b01_arr_mut" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-stroke)"/></marker></defs><rect x="14" y="20" width="326" height="224" rx="10" fill="var(--hb-card2)" fill-opacity="0.35" stroke="var(--hb-err)" stroke-width="1.5" stroke-dasharray="6,4"/><rect x="26" y="9" width="236" height="22" rx="11" fill="var(--hb-bg)" stroke="var(--hb-err)" stroke-width="1.4"/><text x="144.0" y="24" fill="var(--hb-err)" font-size="10.5" font-weight="800" text-anchor="middle">MÔ HÌNH MASTER-SLAVE TRUYỀN THỐNG</text><rect x="92" y="42" width="170" height="52" rx="8" fill="var(--hb-card)" stroke="var(--hb-err)" stroke-width="2"/><rect x="92" y="42" width="170" height="52" rx="8" fill="var(--hb-err-bg)" stroke="none"/><path d="M 92 50 Q 92 42 100 42 L 254 42 Q 262 42 262 50 L 262 64 L 92 64 Z" fill="var(--hb-err)" fill-opacity="0.22"/><line x1="92" y1="64" x2="262" y2="64" stroke="var(--hb-err)" stroke-width="1" stroke-opacity="0.5"/><text x="177.0" y="57.0" fill="var(--hb-err)" font-size="12" font-weight="800" text-anchor="middle">Master Node</text><text x="177.0" y="82.5" fill="var(--text)" font-size="10.5" text-anchor="middle">Single Point of Failure!</text><rect x="109.0" y="104.0" width="136" height="20" rx="5" fill="var(--hb-bg)" stroke="var(--hb-err)" stroke-width="1" stroke-opacity="0.7"/><text x="177" y="117.5" fill="var(--hb-err)" font-size="10" font-weight="700" text-anchor="middle">Polling / Heartbeat</text><path d="M 177 94 L 177 128 L 80 128 L 80 152" fill="none" stroke="var(--hb-err)" stroke-width="2" stroke-linejoin="round" marker-end="url(#b01_arr_err)"/><rect x="38" y="152" width="84" height="42" rx="8" fill="var(--hb-card)" stroke="var(--hb-stroke)" stroke-width="2"/><rect x="38" y="152" width="84" height="42" rx="8" fill="var(--hb-card2)" stroke="none"/><text x="80.0" y="169.5" fill="var(--hb-stroke)" font-size="11" font-weight="800" text-anchor="middle">Slave Node</text><text x="80.0" y="184.5" fill="var(--muted)" font-size="9.5" text-anchor="middle">Chờ lệnh Master</text><path d="M 177 94 L 177 128 L 176 128 L 176 152" fill="none" stroke="var(--hb-err)" stroke-width="2" stroke-linejoin="round" marker-end="url(#b01_arr_err)"/><rect x="134" y="152" width="84" height="42" rx="8" fill="var(--hb-card)" stroke="var(--hb-stroke)" stroke-width="2"/><rect x="134" y="152" width="84" height="42" rx="8" fill="var(--hb-card2)" stroke="none"/><text x="176.0" y="169.5" fill="var(--hb-stroke)" font-size="11" font-weight="800" text-anchor="middle">Slave Node</text><text x="176.0" y="184.5" fill="var(--muted)" font-size="9.5" text-anchor="middle">Chờ lệnh Master</text><path d="M 177 94 L 177 128 L 272 128 L 272 152" fill="none" stroke="var(--hb-err)" stroke-width="2" stroke-linejoin="round" marker-end="url(#b01_arr_err)"/><rect x="230" y="152" width="84" height="42" rx="8" fill="var(--hb-card)" stroke="var(--hb-stroke)" stroke-width="2"/><rect x="230" y="152" width="84" height="42" rx="8" fill="var(--hb-card2)" stroke="none"/><text x="272.0" y="169.5" fill="var(--hb-stroke)" font-size="11" font-weight="800" text-anchor="middle">Slave Node</text><text x="272.0" y="184.5" fill="var(--muted)" font-size="9.5" text-anchor="middle">Chờ lệnh Master</text><rect x="34.0" y="206.0" width="286" height="24" rx="12.0" fill="var(--hb-card)" stroke="none"/><rect x="34.0" y="206.0" width="286" height="24" rx="12.0" fill="var(--hb-err-bg)" stroke="var(--hb-err)" stroke-width="1.5"/><text x="177" y="221.8" fill="var(--hb-err)" font-size="10.5" font-weight="800" text-anchor="middle">Master hỏng -&gt; Toàn mạng tê liệt!</text><rect x="364" y="20" width="542" height="224" rx="10" fill="var(--hb-card2)" fill-opacity="0.35" stroke="var(--hb-sky)" stroke-width="1.5"/><rect x="376" y="9" width="295" height="22" rx="11" fill="var(--hb-bg)" stroke="var(--hb-sky)" stroke-width="1.4"/><text x="523.5" y="24" fill="var(--hb-sky)" font-size="10.5" font-weight="800" text-anchor="middle">MÔ HÌNH PHÂN TÁN TRỰC TIẾP — AUTOSAR CANNM</text><rect x="400" y="44" width="120" height="50" rx="8" fill="var(--hb-card)" stroke="var(--hb-sky)" stroke-width="2"/><rect x="400" y="44" width="120" height="50" rx="8" fill="var(--hb-sky-bg)" stroke="none"/><path d="M 400 52 Q 400 44 408 44 L 512 44 Q 520 44 520 52 L 520 66 L 400 66 Z" fill="var(--hb-sky)" fill-opacity="0.22"/><line x1="400" y1="66" x2="520" y2="66" stroke="var(--hb-sky)" stroke-width="1" stroke-opacity="0.5"/><text x="460.0" y="59.0" fill="var(--hb-sky)" font-size="12" font-weight="800" text-anchor="middle">ECU #1</text><text x="460.0" y="83.5" fill="var(--text)" font-size="10.5" text-anchor="middle">Peer-to-Peer</text><line x1="460" y1="94" x2="460" y2="146" stroke="var(--hb-sky)" stroke-width="2" marker-start="url(#b01_arr_sky)" marker-end="url(#b01_arr_sky)"/><rect x="575" y="44" width="120" height="50" rx="8" fill="var(--hb-card)" stroke="var(--hb-sky)" stroke-width="2"/><rect x="575" y="44" width="120" height="50" rx="8" fill="var(--hb-sky-bg)" stroke="none"/><path d="M 575 52 Q 575 44 583 44 L 687 44 Q 695 44 695 52 L 695 66 L 575 66 Z" fill="var(--hb-sky)" fill-opacity="0.22"/><line x1="575" y1="66" x2="695" y2="66" stroke="var(--hb-sky)" stroke-width="1" stroke-opacity="0.5"/><text x="635.0" y="59.0" fill="var(--hb-sky)" font-size="12" font-weight="800" text-anchor="middle">ECU #2</text><text x="635.0" y="83.5" fill="var(--text)" font-size="10.5" text-anchor="middle">Peer-to-Peer</text><line x1="635" y1="94" x2="635" y2="146" stroke="var(--hb-sky)" stroke-width="2" marker-start="url(#b01_arr_sky)" marker-end="url(#b01_arr_sky)"/><rect x="750" y="44" width="120" height="50" rx="8" fill="var(--hb-card)" stroke="var(--hb-sky)" stroke-width="2"/><rect x="750" y="44" width="120" height="50" rx="8" fill="var(--hb-sky-bg)" stroke="none"/><path d="M 750 52 Q 750 44 758 44 L 862 44 Q 870 44 870 52 L 870 66 L 750 66 Z" fill="var(--hb-sky)" fill-opacity="0.22"/><line x1="750" y1="66" x2="870" y2="66" stroke="var(--hb-sky)" stroke-width="1" stroke-opacity="0.5"/><text x="810.0" y="59.0" fill="var(--hb-sky)" font-size="12" font-weight="800" text-anchor="middle">ECU #3</text><text x="810.0" y="83.5" fill="var(--text)" font-size="10.5" text-anchor="middle">Peer-to-Peer</text><line x1="810" y1="94" x2="810" y2="146" stroke="var(--hb-sky)" stroke-width="2" marker-start="url(#b01_arr_sky)" marker-end="url(#b01_arr_sky)"/><line x1="520" y1="69" x2="575" y2="69" stroke="var(--hb-ok)" stroke-width="2" marker-start="url(#b01_arr_ok)" marker-end="url(#b01_arr_ok)"/><line x1="695" y1="69" x2="750" y2="69" stroke="var(--hb-ok)" stroke-width="2" marker-start="url(#b01_arr_ok)" marker-end="url(#b01_arr_ok)"/><line x1="388" y1="152" x2="882" y2="152" stroke="var(--hb-sky)" stroke-width="2.2"/><line x1="388" y1="156" x2="882" y2="156" stroke="var(--hb-sky)" stroke-width="2.2"/><rect x="531.5" y="143" width="207" height="22" rx="11" fill="var(--hb-bg)" stroke="var(--hb-sky)" stroke-width="1.6"/><text x="635.0" y="157.8" fill="var(--hb-sky)" font-size="10.5" font-weight="800" text-anchor="middle">CAN BUS VẬT LÝ (Peer-to-Peer)</text><rect x="379.0" y="190.0" width="146" height="24" rx="12.0" fill="var(--hb-card)" stroke="none"/><rect x="379.0" y="190.0" width="146" height="24" rx="12.0" fill="var(--hb-ok-bg)" stroke="var(--hb-ok)" stroke-width="1.5"/><text x="452" y="205.8" fill="var(--hb-ok)" font-size="10" font-weight="800" text-anchor="middle">Không có Master cố định</text><rect x="546.0" y="190.0" width="176" height="24" rx="12.0" fill="var(--hb-card)" stroke="none"/><rect x="546.0" y="190.0" width="176" height="24" rx="12.0" fill="var(--hb-sky-bg)" stroke="var(--hb-sky)" stroke-width="1.5"/><text x="634" y="205.8" fill="var(--hb-sky)" font-size="10" font-weight="800" text-anchor="middle">Nhận NM PDU = Giữ mạng thức</text><rect x="734.0" y="190.0" width="148" height="24" rx="12.0" fill="var(--hb-card)" stroke="none"/><rect x="734.0" y="190.0" width="148" height="24" rx="12.0" fill="var(--hb-vio-bg)" stroke="var(--hb-vio)" stroke-width="1.5"/><text x="808" y="205.8" fill="var(--hb-vio)" font-size="10" font-weight="800" text-anchor="middle">Đồng thuận 100% mới ngủ</text></svg>
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
            <svg viewBox="0 0 920 296" class="hb-svg" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Diagram b02"><defs><marker id="b02_arr_sky" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-sky)"/></marker><marker id="b02_arr_ok" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-ok)"/></marker><marker id="b02_arr_warn" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-warn)"/></marker><marker id="b02_arr_err" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-err)"/></marker><marker id="b02_arr_vio" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-vio)"/></marker><marker id="b02_arr_ind" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-ind)"/></marker><marker id="b02_arr_mut" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-stroke)"/></marker></defs><rect x="30" y="18" width="210" height="48" rx="8" fill="var(--hb-card)" stroke="var(--hb-ind)" stroke-width="2"/><rect x="30" y="18" width="210" height="48" rx="8" fill="var(--hb-ind-bg)" stroke="none"/><path d="M 30 26 Q 30 18 38 18 L 232 18 Q 240 18 240 26 L 240 40 L 30 40 Z" fill="var(--hb-ind)" fill-opacity="0.22"/><line x1="30" y1="40" x2="240" y2="40" stroke="var(--hb-ind)" stroke-width="1" stroke-opacity="0.5"/><text x="135.0" y="33.0" fill="var(--hb-ind)" font-size="12" font-weight="800" text-anchor="middle">SWC App / PncUser</text><text x="135.0" y="56.5" fill="var(--text)" font-size="10.5" text-anchor="middle">Tầng Ứng Dụng</text><line x1="240" y1="42" x2="430" y2="42" stroke="var(--hb-sky)" stroke-width="2.2" marker-end="url(#b02_arr_sky)"/><rect x="248.0" y="15.0" width="174" height="20" rx="5" fill="var(--hb-bg)" stroke="var(--hb-sky)" stroke-width="1" stroke-opacity="0.7"/><text x="335" y="28.5" fill="var(--hb-sky)" font-size="10" font-weight="700" text-anchor="middle">RequestComMode(FULL_COM)</text><rect x="430" y="18" width="220" height="48" rx="8" fill="var(--hb-card)" stroke="var(--hb-ok)" stroke-width="2"/><rect x="430" y="18" width="220" height="48" rx="8" fill="var(--hb-ok-bg)" stroke="none"/><path d="M 430 26 Q 430 18 438 18 L 642 18 Q 650 18 650 26 L 650 40 L 430 40 Z" fill="var(--hb-ok)" fill-opacity="0.22"/><line x1="430" y1="40" x2="650" y2="40" stroke="var(--hb-ok)" stroke-width="1" stroke-opacity="0.5"/><text x="540.0" y="33.0" fill="var(--hb-ok)" font-size="12" font-weight="800" text-anchor="middle">RTE / ComM</text><text x="540.0" y="56.5" fill="var(--text)" font-size="10.5" text-anchor="middle">Communication Manager</text><path d="M 540 66 L 540 88 L 220 88 L 220 112" fill="none" stroke="var(--hb-ok)" stroke-width="2" stroke-linejoin="round" marker-end="url(#b02_arr_ok)"/><rect x="252.0" y="78.0" width="156" height="20" rx="5" fill="var(--hb-bg)" stroke="var(--hb-ok)" stroke-width="1" stroke-opacity="0.7"/><text x="330" y="91.5" fill="var(--hb-ok)" font-size="10" font-weight="700" text-anchor="middle">Bật HW Controller / Trcv</text><path d="M 540 66 L 540 88 L 710 88 L 710 112" fill="none" stroke="var(--hb-vio)" stroke-width="2" stroke-linejoin="round" marker-end="url(#b02_arr_vio)"/><rect x="601.0" y="78.0" width="122" height="20" rx="5" fill="var(--hb-bg)" stroke="var(--hb-vio)" stroke-width="1" stroke-opacity="0.7"/><text x="662" y="91.5" fill="var(--hb-vio)" font-size="10" font-weight="700" text-anchor="middle">Đồng bộ chu trình</text><rect x="120" y="112" width="200" height="48" rx="8" fill="var(--hb-card)" stroke="var(--hb-ok)" stroke-width="2"/><rect x="120" y="112" width="200" height="48" rx="8" fill="var(--hb-ok-bg)" stroke="none"/><path d="M 120 120 Q 120 112 128 112 L 312 112 Q 320 112 320 120 L 320 134 L 120 134 Z" fill="var(--hb-ok)" fill-opacity="0.22"/><line x1="120" y1="134" x2="320" y2="134" stroke="var(--hb-ok)" stroke-width="1" stroke-opacity="0.5"/><text x="220.0" y="127.0" fill="var(--hb-ok)" font-size="12" font-weight="800" text-anchor="middle">CanSM Core</text><text x="220.0" y="150.5" fill="var(--text)" font-size="10.5" text-anchor="middle">CAN State Manager</text><rect x="610" y="112" width="200" height="48" rx="8" fill="var(--hb-card)" stroke="var(--hb-vio)" stroke-width="2"/><rect x="610" y="112" width="200" height="48" rx="8" fill="var(--hb-vio-bg)" stroke="none"/><path d="M 610 120 Q 610 112 618 112 L 802 112 Q 810 112 810 120 L 810 134 L 610 134 Z" fill="var(--hb-vio)" fill-opacity="0.22"/><line x1="610" y1="134" x2="810" y2="134" stroke="var(--hb-vio)" stroke-width="1" stroke-opacity="0.5"/><text x="710.0" y="127.0" fill="var(--hb-vio)" font-size="12" font-weight="800" text-anchor="middle">Nm Interface</text><text x="710.0" y="150.5" fill="var(--text)" font-size="10.5" text-anchor="middle">Generic NM Layer</text><line x1="220" y1="160" x2="220" y2="190" stroke="var(--hb-ok)" stroke-width="2" marker-end="url(#b02_arr_ok)"/><line x1="710" y1="160" x2="710" y2="190" stroke="var(--hb-vio)" stroke-width="2" marker-end="url(#b02_arr_vio)"/><rect x="120" y="190" width="200" height="50" rx="8" fill="var(--hb-card)" stroke="var(--hb-stroke)" stroke-width="2"/><rect x="120" y="190" width="200" height="50" rx="8" fill="var(--hb-card2)" stroke="none"/><path d="M 120 198 Q 120 190 128 190 L 312 190 Q 320 190 320 198 L 320 212 L 120 212 Z" fill="var(--hb-stroke)" fill-opacity="0.22"/><line x1="120" y1="212" x2="320" y2="212" stroke="var(--hb-stroke)" stroke-width="1" stroke-opacity="0.5"/><text x="220.0" y="205.0" fill="var(--hb-stroke)" font-size="12" font-weight="800" text-anchor="middle">CanIf Driver</text><text x="220.0" y="229.5" fill="var(--text)" font-size="10.5" text-anchor="middle">CAN Interface</text><rect x="610" y="190" width="200" height="50" rx="8" fill="var(--hb-card)" stroke="var(--hb-sky)" stroke-width="2"/><rect x="610" y="190" width="200" height="50" rx="8" fill="var(--hb-sky-bg)" stroke="none"/><rect x="614" y="194" width="192" height="42" rx="5" fill="none" stroke="var(--hb-sky)" stroke-width="1.2" stroke-opacity="0.8"/><path d="M 610 198 Q 610 190 618 190 L 802 190 Q 810 190 810 198 L 810 212 L 610 212 Z" fill="var(--hb-sky)" fill-opacity="0.22"/><line x1="610" y1="212" x2="810" y2="212" stroke="var(--hb-sky)" stroke-width="1" stroke-opacity="0.5"/><text x="710.0" y="205.0" fill="var(--hb-sky)" font-size="12" font-weight="800" text-anchor="middle">CanNM Core Engine</text><text x="710.0" y="229.5" fill="var(--text)" font-size="10.5" text-anchor="middle">8-Byte NM PDU + Timers</text><line x1="610" y1="215" x2="320" y2="215" stroke="var(--hb-sky)" stroke-width="2.4" marker-end="url(#b02_arr_sky)"/><rect x="366.0" y="205.0" width="198" height="20" rx="5" fill="var(--hb-bg)" stroke="var(--hb-sky)" stroke-width="1" stroke-opacity="0.7"/><text x="465" y="218.5" fill="var(--hb-sky)" font-size="10" font-weight="700" text-anchor="middle">CanIf_Transmit(NM PDU 8-byte)</text><line x1="220" y1="240" x2="220" y2="266" stroke="var(--hb-ok)" stroke-width="2" marker-end="url(#b02_arr_ok)"/><line x1="710" y1="240" x2="710" y2="266" stroke="var(--hb-sky)" stroke-width="2" marker-end="url(#b02_arr_sky)"/><line x1="60" y1="270" x2="860" y2="270" stroke="var(--hb-sky)" stroke-width="2.2"/><line x1="60" y1="274" x2="860" y2="274" stroke="var(--hb-sky)" stroke-width="2.2"/><rect x="289.0" y="261" width="342" height="22" rx="11" fill="var(--hb-bg)" stroke="var(--hb-sky)" stroke-width="1.6"/><text x="460.0" y="275.8" fill="var(--hb-sky)" font-size="10.5" font-weight="800" text-anchor="middle">CAN BUS VẬT LÝ (Đường truyền vi sai CAN_H / CAN_L)</text></svg>
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
            <svg viewBox="0 0 920 282" class="hb-svg" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Diagram b03"><defs><marker id="b03_arr_sky" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-sky)"/></marker><marker id="b03_arr_ok" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-ok)"/></marker><marker id="b03_arr_warn" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-warn)"/></marker><marker id="b03_arr_err" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-err)"/></marker><marker id="b03_arr_vio" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-vio)"/></marker><marker id="b03_arr_ind" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-ind)"/></marker><marker id="b03_arr_mut" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-stroke)"/></marker></defs><rect x="50" y="20" width="200" height="52" rx="8" fill="var(--hb-card)" stroke="var(--hb-ind)" stroke-width="2"/><rect x="50" y="20" width="200" height="52" rx="8" fill="var(--hb-ind-bg)" stroke="none"/><path d="M 50 28 Q 50 20 58 20 L 242 20 Q 250 20 250 28 L 250 42 L 50 42 Z" fill="var(--hb-ind)" fill-opacity="0.22"/><line x1="50" y1="42" x2="250" y2="42" stroke="var(--hb-ind)" stroke-width="1" stroke-opacity="0.5"/><text x="150.0" y="35.0" fill="var(--hb-ind)" font-size="12" font-weight="800" text-anchor="middle">SWC Ứng Dụng</text><text x="150.0" y="60.5" fill="var(--text)" font-size="10.5" text-anchor="middle">Yêu cầu chế độ mạng</text><rect x="355" y="20" width="210" height="52" rx="8" fill="var(--hb-card)" stroke="var(--hb-ok)" stroke-width="2"/><rect x="355" y="20" width="210" height="52" rx="8" fill="var(--hb-ok-bg)" stroke="none"/><path d="M 355 28 Q 355 20 363 20 L 557 20 Q 565 20 565 28 L 565 42 L 355 42 Z" fill="var(--hb-ok)" fill-opacity="0.22"/><line x1="355" y1="42" x2="565" y2="42" stroke="var(--hb-ok)" stroke-width="1" stroke-opacity="0.5"/><text x="460.0" y="35.0" fill="var(--hb-ok)" font-size="12" font-weight="800" text-anchor="middle">ComM</text><text x="460.0" y="60.5" fill="var(--text)" font-size="10.5" text-anchor="middle">Communication Manager</text><rect x="670" y="20" width="200" height="52" rx="8" fill="var(--hb-card)" stroke="var(--hb-ok)" stroke-width="2"/><rect x="670" y="20" width="200" height="52" rx="8" fill="var(--hb-ok-bg)" stroke="none"/><path d="M 670 28 Q 670 20 678 20 L 862 20 Q 870 20 870 28 L 870 42 L 670 42 Z" fill="var(--hb-ok)" fill-opacity="0.22"/><line x1="670" y1="42" x2="870" y2="42" stroke="var(--hb-ok)" stroke-width="1" stroke-opacity="0.5"/><text x="770.0" y="35.0" fill="var(--hb-ok)" font-size="12" font-weight="800" text-anchor="middle">CanSM</text><text x="770.0" y="60.5" fill="var(--text)" font-size="10.5" text-anchor="middle">Bật/Tắt HW &amp; Bus-Off</text><rect x="50" y="116" width="200" height="52" rx="8" fill="var(--hb-card)" stroke="var(--hb-warn)" stroke-width="2"/><rect x="50" y="116" width="200" height="52" rx="8" fill="var(--hb-warn-bg)" stroke="none"/><path d="M 50 124 Q 50 116 58 116 L 242 116 Q 250 116 250 124 L 250 138 L 50 138 Z" fill="var(--hb-warn)" fill-opacity="0.22"/><line x1="50" y1="138" x2="250" y2="138" stroke="var(--hb-warn)" stroke-width="1" stroke-opacity="0.5"/><text x="150.0" y="131.0" fill="var(--hb-warn)" font-size="12" font-weight="800" text-anchor="middle">BswM / EcuM</text><text x="150.0" y="156.5" fill="var(--text)" font-size="10.5" text-anchor="middle">Quản lý Mode &amp; Nguồn</text><rect x="355" y="116" width="210" height="52" rx="8" fill="var(--hb-card)" stroke="var(--hb-vio)" stroke-width="2"/><rect x="355" y="116" width="210" height="52" rx="8" fill="var(--hb-vio-bg)" stroke="none"/><path d="M 355 124 Q 355 116 363 116 L 557 116 Q 565 116 565 124 L 565 138 L 355 138 Z" fill="var(--hb-vio)" fill-opacity="0.22"/><line x1="355" y1="138" x2="565" y2="138" stroke="var(--hb-vio)" stroke-width="1" stroke-opacity="0.5"/><text x="460.0" y="131.0" fill="var(--hb-vio)" font-size="12" font-weight="800" text-anchor="middle">Nm Interface</text><text x="460.0" y="156.5" fill="var(--text)" font-size="10.5" text-anchor="middle">Điều phối trung gian</text><rect x="670" y="116" width="200" height="52" rx="8" fill="var(--hb-card)" stroke="var(--hb-stroke)" stroke-width="2"/><rect x="670" y="116" width="200" height="52" rx="8" fill="var(--hb-card2)" stroke="none"/><path d="M 670 124 Q 670 116 678 116 L 862 116 Q 870 116 870 124 L 870 138 L 670 138 Z" fill="var(--hb-stroke)" fill-opacity="0.22"/><line x1="670" y1="138" x2="870" y2="138" stroke="var(--hb-stroke)" stroke-width="1" stroke-opacity="0.5"/><text x="770.0" y="131.0" fill="var(--hb-stroke)" font-size="12" font-weight="800" text-anchor="middle">CanIf</text><text x="770.0" y="156.5" fill="var(--text)" font-size="10.5" text-anchor="middle">Giao tiếp Driver Tx/Rx</text><rect x="50" y="212" width="200" height="52" rx="8" fill="var(--hb-card)" stroke="var(--hb-err)" stroke-width="2"/><rect x="50" y="212" width="200" height="52" rx="8" fill="var(--hb-err-bg)" stroke="none"/><path d="M 50 220 Q 50 212 58 212 L 242 212 Q 250 212 250 220 L 250 234 L 50 234 Z" fill="var(--hb-err)" fill-opacity="0.22"/><line x1="50" y1="234" x2="250" y2="234" stroke="var(--hb-err)" stroke-width="1" stroke-opacity="0.5"/><text x="150.0" y="227.0" fill="var(--hb-err)" font-size="12" font-weight="800" text-anchor="middle">Det Log</text><text x="150.0" y="252.5" fill="var(--text)" font-size="10.5" text-anchor="middle">CANNM_E_* Error Freeze</text><rect x="355" y="212" width="210" height="54" rx="8" fill="var(--hb-card)" stroke="var(--hb-sky)" stroke-width="2"/><rect x="355" y="212" width="210" height="54" rx="8" fill="var(--hb-sky-bg)" stroke="none"/><rect x="359" y="216" width="202" height="46" rx="5" fill="none" stroke="var(--hb-sky)" stroke-width="1.2" stroke-opacity="0.8"/><path d="M 355 220 Q 355 212 363 212 L 557 212 Q 565 212 565 220 L 565 234 L 355 234 Z" fill="var(--hb-sky)" fill-opacity="0.22"/><line x1="355" y1="234" x2="565" y2="234" stroke="var(--hb-sky)" stroke-width="1" stroke-opacity="0.5"/><text x="460.0" y="227.0" fill="var(--hb-sky)" font-size="12" font-weight="800" text-anchor="middle">CanNM Engine</text><text x="460.0" y="253.5" fill="var(--text)" font-size="10.5" text-anchor="middle">Core State Machine &amp; Timers</text><line x1="250" y1="46" x2="355" y2="46" stroke="var(--hb-ind)" stroke-width="2" marker-end="url(#b03_arr_ind)"/><rect x="265.0" y="20.0" width="74" height="20" rx="5" fill="var(--hb-bg)" stroke="var(--hb-ind)" stroke-width="1" stroke-opacity="0.7"/><text x="302" y="33.5" fill="var(--hb-ind)" font-size="10" font-weight="700" text-anchor="middle">Mode Req</text><line x1="565" y1="46" x2="670" y2="46" stroke="var(--hb-ok)" stroke-width="2" marker-end="url(#b03_arr_ok)"/><rect x="581.0" y="20.0" width="74" height="20" rx="5" fill="var(--hb-bg)" stroke="var(--hb-ok)" stroke-width="1" stroke-opacity="0.7"/><text x="618" y="33.5" fill="var(--hb-ok)" font-size="10" font-weight="700" text-anchor="middle">Mode Req</text><line x1="150" y1="116" x2="150" y2="72" stroke="var(--hb-warn)" stroke-width="2" marker-end="url(#b03_arr_warn)"/><rect x="51.0" y="84.0" width="74" height="20" rx="5" fill="var(--hb-bg)" stroke="var(--hb-warn)" stroke-width="1" stroke-opacity="0.7"/><text x="88" y="97.5" fill="var(--hb-warn)" font-size="10" font-weight="700" text-anchor="middle">Trạng thái</text><line x1="150" y1="212" x2="150" y2="168" stroke="var(--hb-err)" stroke-width="2" marker-end="url(#b03_arr_err)"/><line x1="460" y1="72" x2="460" y2="116" stroke="var(--hb-ok)" stroke-width="2" marker-end="url(#b03_arr_ok)"/><rect x="477.0" y="84.0" width="86" height="20" rx="5" fill="var(--hb-bg)" stroke="var(--hb-ok)" stroke-width="1" stroke-opacity="0.7"/><text x="520" y="97.5" fill="var(--hb-ok)" font-size="10" font-weight="700" text-anchor="middle">Network Req</text><line x1="460" y1="168" x2="460" y2="212" stroke="var(--hb-vio)" stroke-width="2" marker-start="url(#b03_arr_vio)" marker-end="url(#b03_arr_vio)"/><rect x="474.0" y="180.0" width="104" height="20" rx="5" fill="var(--hb-bg)" stroke="var(--hb-vio)" stroke-width="1" stroke-opacity="0.7"/><text x="526" y="193.5" fill="var(--hb-vio)" font-size="10" font-weight="700" text-anchor="middle">APIs &amp; Callbacks</text><line x1="770" y1="72" x2="770" y2="116" stroke="var(--hb-ok)" stroke-width="2" marker-end="url(#b03_arr_ok)"/><rect x="788.0" y="84.0" width="64" height="20" rx="5" fill="var(--hb-bg)" stroke="var(--hb-ok)" stroke-width="1" stroke-opacity="0.7"/><text x="820" y="97.5" fill="var(--hb-ok)" font-size="10" font-weight="700" text-anchor="middle">Bật HW</text><line x1="355" y1="142" x2="250" y2="142" stroke="var(--hb-vio)" stroke-width="2" marker-end="url(#b03_arr_vio)"/><rect x="253.0" y="116.0" width="98" height="20" rx="5" fill="var(--hb-bg)" stroke="var(--hb-vio)" stroke-width="1" stroke-opacity="0.7"/><text x="302" y="129.5" fill="var(--hb-vio)" font-size="10" font-weight="700" text-anchor="middle">State Change CB</text><line x1="670" y1="142" x2="565" y2="142" stroke="var(--hb-stroke)" stroke-width="2" marker-end="url(#b03_arr_mut)"/><line x1="355" y1="239" x2="250" y2="239" stroke="var(--hb-err)" stroke-width="2" marker-end="url(#b03_arr_err)"/><rect x="260.0" y="213.0" width="84" height="20" rx="5" fill="var(--hb-bg)" stroke="var(--hb-err)" stroke-width="1" stroke-opacity="0.7"/><text x="302" y="226.5" fill="var(--hb-err)" font-size="10" font-weight="700" text-anchor="middle">CANNM_E_*</text><path d="M 565 239 L 770 239 L 770 168" fill="none" stroke="var(--hb-sky)" stroke-width="2" stroke-linejoin="round" marker-start="url(#b03_arr_sky)" marker-end="url(#b03_arr_sky)"/><rect x="630.0" y="229.0" width="110" height="20" rx="5" fill="var(--hb-bg)" stroke="var(--hb-sky)" stroke-width="1" stroke-opacity="0.7"/><text x="685" y="242.5" fill="var(--hb-sky)" font-size="10" font-weight="700" text-anchor="middle">Tx / Rx NM PDU</text></svg>
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
            <svg viewBox="0 0 920 270" class="hb-svg" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Diagram b04"><defs><marker id="b04_arr_sky" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-sky)"/></marker><marker id="b04_arr_ok" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-ok)"/></marker><marker id="b04_arr_warn" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-warn)"/></marker><marker id="b04_arr_err" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-err)"/></marker><marker id="b04_arr_vio" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-vio)"/></marker><marker id="b04_arr_ind" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-ind)"/></marker><marker id="b04_arr_mut" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-stroke)"/></marker></defs><rect x="260" y="12" width="400" height="96" rx="10" fill="var(--hb-card2)" fill-opacity="0.35" stroke="var(--hb-warn)" stroke-width="1.5"/><rect x="272" y="1" width="171" height="22" rx="11" fill="var(--hb-bg)" stroke="var(--hb-warn)" stroke-width="1.4"/><text x="357.5" y="16" fill="var(--hb-warn)" font-size="10.5" font-weight="800" text-anchor="middle">QUYỀN LẬP PHÁP (POLICY)</text><rect x="282" y="28" width="356" height="68" rx="8" fill="var(--hb-card)" stroke="var(--hb-warn)" stroke-width="2"/><rect x="282" y="28" width="356" height="68" rx="8" fill="var(--hb-warn-bg)" stroke="none"/><text x="460.0" y="51.0" fill="var(--hb-warn)" font-size="13" font-weight="800" text-anchor="middle">ComM — Communication Manager</text><text x="460.0" y="66.0" fill="var(--muted)" font-size="10.5" text-anchor="middle">Ra quyết định chính sách:</text><text x="460.0" y="81.0" fill="var(--muted)" font-size="10.5" text-anchor="middle">ECU được phép thức dậy hay đi ngủ</text><path d="M 460 108 L 460 128 L 235 128 L 235 154" fill="none" stroke="var(--hb-ok)" stroke-width="2" stroke-linejoin="round" marker-end="url(#b04_arr_ok)"/><path d="M 460 108 L 460 128 L 685 128 L 685 154" fill="none" stroke="var(--hb-sky)" stroke-width="2" stroke-linejoin="round" marker-end="url(#b04_arr_sky)"/><rect x="45" y="146" width="380" height="108" rx="10" fill="var(--hb-card2)" fill-opacity="0.35" stroke="var(--hb-ok)" stroke-width="1.5"/><rect x="57" y="135" width="184" height="22" rx="11" fill="var(--hb-bg)" stroke="var(--hb-ok)" stroke-width="1.4"/><text x="149.0" y="150" fill="var(--hb-ok)" font-size="10.5" font-weight="800" text-anchor="middle">QUYỀN HÀNH PHÁP PHẦN CỨNG</text><rect x="65" y="162" width="340" height="80" rx="8" fill="var(--hb-card)" stroke="var(--hb-ok)" stroke-width="2"/><rect x="65" y="162" width="340" height="80" rx="8" fill="var(--hb-ok-bg)" stroke="none"/><text x="235.0" y="191.0" fill="var(--hb-ok)" font-size="12.5" font-weight="800" text-anchor="middle">CanSM — CAN State Manager</text><text x="235.0" y="206.0" fill="var(--muted)" font-size="10.5" text-anchor="middle">Bật/Tắt Transceiver &amp; CAN Controller,</text><text x="235.0" y="221.0" fill="var(--muted)" font-size="10.5" text-anchor="middle">Xử lý phục hồi lỗi phần cứng Bus-Off</text><rect x="495" y="146" width="380" height="108" rx="10" fill="var(--hb-card2)" fill-opacity="0.35" stroke="var(--hb-sky)" stroke-width="1.5"/><rect x="507" y="135" width="210" height="22" rx="11" fill="var(--hb-bg)" stroke="var(--hb-sky)" stroke-width="1.4"/><text x="612.0" y="150" fill="var(--hb-sky)" font-size="10.5" font-weight="800" text-anchor="middle">QUYỀN ĐIỀU PHỐI GIAO THỨC BUS</text><rect x="515" y="162" width="340" height="80" rx="8" fill="var(--hb-card)" stroke="var(--hb-sky)" stroke-width="2"/><rect x="515" y="162" width="340" height="80" rx="8" fill="var(--hb-sky-bg)" stroke="none"/><rect x="519" y="166" width="332" height="72" rx="5" fill="none" stroke="var(--hb-sky)" stroke-width="1.2" stroke-opacity="0.8"/><text x="685.0" y="191.0" fill="var(--hb-sky)" font-size="12.5" font-weight="800" text-anchor="middle">CanNM — CAN Network Management</text><text x="685.0" y="206.0" fill="var(--muted)" font-size="10.5" text-anchor="middle">Thuật toán máy trạng thái phân tán,</text><text x="685.0" y="221.0" fill="var(--muted)" font-size="10.5" text-anchor="middle">Bắn bản tin NM PDU &amp; đếm timer giữ mạng</text></svg>
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
            <svg viewBox="0 0 920 422" class="hb-svg" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Diagram b05"><defs><marker id="b05_arr_sky" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-sky)"/></marker><marker id="b05_arr_ok" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-ok)"/></marker><marker id="b05_arr_warn" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-warn)"/></marker><marker id="b05_arr_err" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-err)"/></marker><marker id="b05_arr_vio" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-vio)"/></marker><marker id="b05_arr_ind" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-ind)"/></marker><marker id="b05_arr_mut" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-stroke)"/></marker></defs><rect x="165" y="20" width="715" height="195" rx="10" fill="var(--hb-card2)" fill-opacity="0.35" stroke="var(--hb-sky)" stroke-width="1.5"/><rect x="177" y="9" width="217" height="22" rx="11" fill="var(--hb-bg)" stroke="var(--hb-sky)" stroke-width="1.4"/><text x="285.5" y="24" fill="var(--hb-sky)" font-size="10.5" font-weight="800" text-anchor="middle">NM_MODE_NETWORK (Network Mode)</text><rect x="195" y="42" width="270" height="58" rx="8" fill="var(--hb-card)" stroke="var(--hb-sky)" stroke-width="2"/><rect x="195" y="42" width="270" height="58" rx="8" fill="var(--hb-sky-bg)" stroke="none"/><rect x="199" y="46" width="262" height="50" rx="5" fill="none" stroke="var(--hb-sky)" stroke-width="1.2" stroke-opacity="0.8"/><path d="M 195 50 Q 195 42 203 42 L 457 42 Q 465 42 465 50 L 465 64 L 195 64 Z" fill="var(--hb-sky)" fill-opacity="0.22"/><line x1="195" y1="64" x2="465" y2="64" stroke="var(--hb-sky)" stroke-width="1" stroke-opacity="0.5"/><text x="330.0" y="57.0" fill="var(--hb-sky)" font-size="12" font-weight="800" text-anchor="middle">Repeat Message (RMS)</text><text x="330.0" y="85.5" fill="var(--text)" font-size="10.5" text-anchor="middle">Bắt buộc vào đầu tiên! • RptTimer</text><rect x="575" y="42" width="275" height="58" rx="8" fill="var(--hb-card)" stroke="var(--hb-ok)" stroke-width="2"/><rect x="575" y="42" width="275" height="58" rx="8" fill="var(--hb-ok-bg)" stroke="none"/><path d="M 575 50 Q 575 42 583 42 L 842 42 Q 850 42 850 50 L 850 64 L 575 64 Z" fill="var(--hb-ok)" fill-opacity="0.22"/><line x1="575" y1="64" x2="850" y2="64" stroke="var(--hb-ok)" stroke-width="1" stroke-opacity="0.5"/><text x="712.5" y="57.0" fill="var(--hb-ok)" font-size="12" font-weight="800" text-anchor="middle">Normal Operation (NOS)</text><text x="712.5" y="85.5" fill="var(--text)" font-size="10.5" text-anchor="middle">Phát định kỳ mỗi MsgCycleTime</text><line x1="465" y1="71" x2="575" y2="71" stroke="var(--hb-ok)" stroke-width="2" marker-end="url(#b05_arr_ok)"/><rect x="479.0" y="43.0" width="82" height="20" rx="5" fill="var(--hb-bg)" stroke="var(--hb-ok)" stroke-width="1" stroke-opacity="0.7"/><text x="520" y="56.5" fill="var(--hb-ok)" font-size="10" font-weight="700" text-anchor="middle">NetReq == 1</text><rect x="240" y="142" width="560" height="56" rx="8" fill="var(--hb-card)" stroke="var(--hb-warn)" stroke-width="2"/><rect x="240" y="142" width="560" height="56" rx="8" fill="var(--hb-warn-bg)" stroke="none"/><path d="M 240 150 Q 240 142 248 142 L 792 142 Q 800 142 800 150 L 800 164 L 240 164 Z" fill="var(--hb-warn)" fill-opacity="0.22"/><line x1="240" y1="164" x2="800" y2="164" stroke="var(--hb-warn)" stroke-width="1" stroke-opacity="0.5"/><text x="520.0" y="157.0" fill="var(--hb-warn)" font-size="12" font-weight="800" text-anchor="middle">Ready Sleep State (RSS)</text><text x="520.0" y="184.5" fill="var(--text)" font-size="10.5" text-anchor="middle">Dừng phát Tx bản tin NM • Chỉ lắng nghe bus &amp; đếm lùi CanNmTimeoutTime</text><path d="M 330 100 L 330 142" fill="none" stroke="var(--hb-warn)" stroke-width="2" stroke-linejoin="round" marker-end="url(#b05_arr_warn)"/><rect x="224.0" y="110.0" width="88" height="20" rx="5" fill="var(--hb-bg)" stroke="var(--hb-warn)" stroke-width="1" stroke-opacity="0.7"/><text x="268" y="123.5" fill="var(--hb-warn)" font-size="10" font-weight="700" text-anchor="middle">NetReq == 0</text><path d="M 712 100 L 712 142" fill="none" stroke="var(--hb-warn)" stroke-width="2" stroke-linejoin="round" marker-end="url(#b05_arr_warn)"/><rect x="734.0" y="110.0" width="92" height="20" rx="5" fill="var(--hb-bg)" stroke="var(--hb-warn)" stroke-width="1" stroke-opacity="0.7"/><text x="780" y="123.5" fill="var(--hb-warn)" font-size="10" font-weight="700" text-anchor="middle">NetRelease()</text><line x1="520" y1="215" x2="520" y2="248" stroke="var(--hb-err)" stroke-width="2.2" marker-end="url(#b05_arr_err)"/><rect x="542.0" y="221.0" width="216" height="20" rx="5" fill="var(--hb-bg)" stroke="var(--hb-err)" stroke-width="1" stroke-opacity="0.7"/><text x="650" y="234.5" fill="var(--hb-err)" font-size="10" font-weight="700" text-anchor="middle">CanNmTimeoutTime hết hạn (0ms)</text><rect x="165" y="248" width="715" height="64" rx="10" fill="var(--hb-card2)" fill-opacity="0.35" stroke="var(--hb-warn)" stroke-width="1.5"/><rect x="177" y="237" width="210" height="22" rx="11" fill="var(--hb-bg)" stroke="var(--hb-warn)" stroke-width="1.4"/><text x="282.0" y="252" fill="var(--hb-warn)" font-size="10.5" font-weight="800" text-anchor="middle">PREPARE BUS-SLEEP MODE (PBSM)</text><rect x="190" y="263" width="665" height="40" rx="8" fill="var(--hb-card)" stroke="var(--hb-warn)" stroke-width="2"/><rect x="190" y="263" width="665" height="40" rx="8" fill="var(--hb-warn-bg)" stroke="none"/><text x="522.5" y="287.0" fill="var(--text)" font-size="11" font-weight="800" text-anchor="middle">Chạy đệm WaitBusSleepTimer (1500ms) • Phần cứng CAN vẫn mở sẵn sàng nghe lại</text><line x1="520" y1="312" x2="520" y2="344" stroke="var(--hb-stroke)" stroke-width="2.2" marker-end="url(#b05_arr_mut)"/><rect x="543.0" y="318.0" width="238" height="20" rx="5" fill="var(--hb-bg)" stroke="var(--hb-stroke)" stroke-width="1" stroke-opacity="0.7"/><text x="662" y="331.5" fill="var(--text)" font-size="10" font-weight="700" text-anchor="middle">CanNmWaitBusSleepTime hết hạn (0ms)</text><rect x="165" y="344" width="715" height="64" rx="10" fill="var(--hb-card2)" fill-opacity="0.35" stroke="var(--hb-ind)" stroke-width="1.5"/><rect x="177" y="333" width="152" height="22" rx="11" fill="var(--hb-bg)" stroke="var(--hb-ind)" stroke-width="1.4"/><text x="253.0" y="348" fill="var(--hb-ind)" font-size="10.5" font-weight="800" text-anchor="middle">BUS-SLEEP MODE (BSM)</text><rect x="190" y="359" width="665" height="40" rx="8" fill="var(--hb-card)" stroke="var(--hb-ind)" stroke-width="2"/><rect x="190" y="359" width="665" height="40" rx="8" fill="var(--hb-ind-bg)" stroke="none"/><text x="522.5" y="383.0" fill="var(--text)" font-size="11" font-weight="800" text-anchor="middle">ECU ngủ sâu • Controller SLEEP, Transceiver STANDBY (Tiết kiệm &lt; 100 µA)</text><path d="M 165 280 L 105 280 L 105 110 L 165 110" fill="none" stroke="var(--hb-ok)" stroke-width="2.2" stroke-linejoin="round" marker-end="url(#b05_arr_ok)"/><rect x="29.0" y="185.0" width="118" height="20" rx="5" fill="var(--hb-bg)" stroke="var(--hb-ok)" stroke-width="1" stroke-opacity="0.7"/><text x="88" y="198.5" fill="var(--hb-ok)" font-size="10" font-weight="700" text-anchor="middle">Wakeup / NetReq</text><path d="M 165 376 L 44 376 L 44 71 L 165 71" fill="none" stroke="var(--hb-sky)" stroke-width="2.2" stroke-linejoin="round" marker-end="url(#b05_arr_sky)"/><rect x="16.0" y="316.0" width="104" height="20" rx="5" fill="var(--hb-bg)" stroke="var(--hb-sky)" stroke-width="1" stroke-opacity="0.7"/><text x="68" y="329.5" fill="var(--hb-sky)" font-size="10" font-weight="700" text-anchor="middle">PassiveStartUp</text></svg>
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
            <svg viewBox="0 0 920 264" class="hb-svg" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Diagram b06"><defs><marker id="b06_arr_sky" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-sky)"/></marker><marker id="b06_arr_ok" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-ok)"/></marker><marker id="b06_arr_warn" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-warn)"/></marker><marker id="b06_arr_err" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-err)"/></marker><marker id="b06_arr_vio" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-vio)"/></marker><marker id="b06_arr_ind" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-ind)"/></marker><marker id="b06_arr_mut" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-stroke)"/></marker></defs><rect x="16" y="22" width="165" height="44" rx="8" fill="var(--hb-card)" stroke="var(--hb-ind)" stroke-width="2"/><rect x="16" y="22" width="165" height="44" rx="8" fill="var(--hb-ind-bg)" stroke="none"/><text x="98.5" y="48.0" fill="var(--text)" font-size="11" font-weight="800" text-anchor="middle">Bus-Sleep Mode</text><path d="M 181 44 L 368 44 L 368 134 L 408 134" fill="none" stroke="var(--hb-ind)" stroke-width="2" stroke-linejoin="round" marker-end="url(#b06_arr_ind)"/><rect x="189.0" y="34.5" width="170" height="19" rx="5" fill="var(--hb-bg)" stroke="var(--hb-ind)" stroke-width="1" stroke-opacity="0.7"/><text x="274" y="47.5" fill="var(--hb-ind)" font-size="9.5" font-weight="700" text-anchor="middle">Active Wakeup / PassiveStartUp</text><rect x="16" y="82" width="165" height="44" rx="8" fill="var(--hb-card)" stroke="var(--hb-warn)" stroke-width="2"/><rect x="16" y="82" width="165" height="44" rx="8" fill="var(--hb-warn-bg)" stroke="none"/><text x="98.5" y="108.0" fill="var(--text)" font-size="11" font-weight="800" text-anchor="middle">Prepare Bus-Sleep</text><path d="M 181 104 L 368 104 L 368 134 L 408 134" fill="none" stroke="var(--hb-warn)" stroke-width="2" stroke-linejoin="round" marker-end="url(#b06_arr_warn)"/><rect x="189.0" y="94.5" width="170" height="19" rx="5" fill="var(--hb-bg)" stroke="var(--hb-warn)" stroke-width="1" stroke-opacity="0.7"/><text x="274" y="107.5" fill="var(--hb-warn)" font-size="9.5" font-weight="700" text-anchor="middle">NetworkRequest / Rx NM PDU</text><rect x="16" y="142" width="165" height="44" rx="8" fill="var(--hb-card)" stroke="var(--hb-ok)" stroke-width="2"/><rect x="16" y="142" width="165" height="44" rx="8" fill="var(--hb-ok-bg)" stroke="none"/><text x="98.5" y="168.0" fill="var(--text)" font-size="11" font-weight="800" text-anchor="middle">Ready Sleep State</text><path d="M 181 164 L 368 164 L 368 134 L 408 134" fill="none" stroke="var(--hb-ok)" stroke-width="2" stroke-linejoin="round" marker-end="url(#b06_arr_ok)"/><rect x="189.0" y="154.5" width="170" height="19" rx="5" fill="var(--hb-bg)" stroke="var(--hb-ok)" stroke-width="1" stroke-opacity="0.7"/><text x="274" y="167.5" fill="var(--hb-ok)" font-size="9.5" font-weight="700" text-anchor="middle">NetworkRequest / Rx RMR==1</text><rect x="16" y="202" width="165" height="44" rx="8" fill="var(--hb-card)" stroke="var(--hb-sky)" stroke-width="2"/><rect x="16" y="202" width="165" height="44" rx="8" fill="var(--hb-sky-bg)" stroke="none"/><text x="98.5" y="228.0" fill="var(--text)" font-size="11" font-weight="800" text-anchor="middle">Normal Operation</text><path d="M 181 224 L 368 224 L 368 134 L 408 134" fill="none" stroke="var(--hb-sky)" stroke-width="2" stroke-linejoin="round" marker-end="url(#b06_arr_sky)"/><rect x="189.0" y="214.5" width="170" height="19" rx="5" fill="var(--hb-bg)" stroke="var(--hb-sky)" stroke-width="1" stroke-opacity="0.7"/><text x="274" y="227.5" fill="var(--hb-sky)" font-size="9.5" font-weight="700" text-anchor="middle">Bit RMR==1 hoặc lệnh SWC</text><rect x="408" y="66" width="210" height="136" rx="8" fill="var(--hb-card)" stroke="var(--hb-sky)" stroke-width="2"/><rect x="408" y="66" width="210" height="136" rx="8" fill="var(--hb-sky-bg)" stroke="none"/><rect x="412" y="70" width="202" height="128" rx="5" fill="none" stroke="var(--hb-sky)" stroke-width="1.2" stroke-opacity="0.8"/><path d="M 408 74 Q 408 66 416 66 L 610 66 Q 618 66 618 74 L 618 92 L 408 92 Z" fill="var(--hb-sky)" fill-opacity="0.22"/><line x1="408" y1="92" x2="618" y2="92" stroke="var(--hb-sky)" stroke-width="1" stroke-opacity="0.5"/><text x="513.0" y="83.0" fill="var(--hb-sky)" font-size="11.5" font-weight="800" text-anchor="middle">REPEAT MESSAGE (RMS)</text><text x="513.0" y="135.5" fill="var(--text)" font-size="10" text-anchor="middle">• Bắt buộc vào đầu tiên</text><text x="513.0" y="150.5" fill="var(--text)" font-size="10" text-anchor="middle">• Chạy RepeatMessageTimer</text><text x="513.0" y="165.5" fill="var(--text)" font-size="10" text-anchor="middle">• Bắn Burst Tx (nếu Active)</text><line x1="618" y1="134" x2="650" y2="134" stroke="var(--hb-warn)" stroke-width="2.2" marker-end="url(#b06_arr_warn)"/><polygon points="714,92 778,134 714,176 650,134" fill="var(--hb-card)" stroke="var(--hb-warn)" stroke-width="2"/><polygon points="714,92 778,134 714,176 650,134" fill="var(--hb-warn-bg)" stroke="none"/><text x="714" y="131.0" fill="var(--hb-warn)" font-size="10.5" font-weight="800" text-anchor="middle">Hết Timer &amp;</text><text x="714" y="145.0" fill="var(--hb-warn)" font-size="10.5" font-weight="800" text-anchor="middle">NetReq == ?</text><path d="M 714 92 L 714 54 L 748 54" fill="none" stroke="var(--hb-ok)" stroke-width="2" stroke-linejoin="round" marker-end="url(#b06_arr_ok)"/><rect x="675.0" y="62.0" width="78" height="20" rx="5" fill="var(--hb-bg)" stroke="var(--hb-ok)" stroke-width="1" stroke-opacity="0.7"/><text x="714" y="75.5" fill="var(--hb-ok)" font-size="10" font-weight="700" text-anchor="middle">NetReq == 1</text><rect x="748" y="30" width="156" height="48" rx="8" fill="var(--hb-card)" stroke="var(--hb-ok)" stroke-width="2"/><rect x="748" y="30" width="156" height="48" rx="8" fill="var(--hb-ok-bg)" stroke="none"/><path d="M 748 38 Q 748 30 756 30 L 896 30 Q 904 30 904 38 L 904 52 L 748 52 Z" fill="var(--hb-ok)" fill-opacity="0.22"/><line x1="748" y1="52" x2="904" y2="52" stroke="var(--hb-ok)" stroke-width="1" stroke-opacity="0.5"/><text x="826.0" y="45.0" fill="var(--hb-ok)" font-size="11" font-weight="800" text-anchor="middle">Normal Operation</text><text x="826.0" y="68.5" fill="var(--text)" font-size="10.5" text-anchor="middle">Tiếp tục phát Tx</text><path d="M 714 176 L 714 214 L 748 214" fill="none" stroke="var(--hb-err)" stroke-width="2" stroke-linejoin="round" marker-end="url(#b06_arr_err)"/><rect x="675.0" y="186.0" width="78" height="20" rx="5" fill="var(--hb-bg)" stroke="var(--hb-err)" stroke-width="1" stroke-opacity="0.7"/><text x="714" y="199.5" fill="var(--hb-err)" font-size="10" font-weight="700" text-anchor="middle">NetReq == 0</text><rect x="748" y="190" width="156" height="48" rx="8" fill="var(--hb-card)" stroke="var(--hb-err)" stroke-width="2"/><rect x="748" y="190" width="156" height="48" rx="8" fill="var(--hb-err-bg)" stroke="none"/><path d="M 748 198 Q 748 190 756 190 L 896 190 Q 904 190 904 198 L 904 212 L 748 212 Z" fill="var(--hb-err)" fill-opacity="0.22"/><line x1="748" y1="212" x2="904" y2="212" stroke="var(--hb-err)" stroke-width="1" stroke-opacity="0.5"/><text x="826.0" y="205.0" fill="var(--hb-err)" font-size="11" font-weight="800" text-anchor="middle">Ready Sleep</text><text x="826.0" y="228.5" fill="var(--text)" font-size="10.5" text-anchor="middle">Ngưng phát Tx</text></svg>
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
            <svg viewBox="0 0 920 242" class="hb-svg" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Diagram b07"><defs><marker id="b07_arr_sky" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-sky)"/></marker><marker id="b07_arr_ok" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-ok)"/></marker><marker id="b07_arr_warn" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-warn)"/></marker><marker id="b07_arr_err" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-err)"/></marker><marker id="b07_arr_vio" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-vio)"/></marker><marker id="b07_arr_ind" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-ind)"/></marker><marker id="b07_arr_mut" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-stroke)"/></marker></defs><line x1="130" y1="34" x2="886" y2="34" stroke="var(--hb-stroke)" stroke-width="1.5"/><line x1="140" y1="28" x2="140" y2="40" stroke="var(--hb-sky)" stroke-width="1.8"/><text x="140" y="20" fill="var(--muted)" font-size="10.5" font-weight="700" text-anchor="middle" class="mono-svg">0ms</text><line x1="225" y1="28" x2="225" y2="40" stroke="var(--hb-sky)" stroke-width="1.8"/><text x="225" y="20" fill="var(--muted)" font-size="10.5" font-weight="700" text-anchor="middle" class="mono-svg">20ms</text><line x1="310" y1="28" x2="310" y2="40" stroke="var(--hb-sky)" stroke-width="1.8"/><text x="310" y="20" fill="var(--muted)" font-size="10.5" font-weight="700" text-anchor="middle" class="mono-svg">40ms</text><line x1="395" y1="28" x2="395" y2="40" stroke="var(--hb-sky)" stroke-width="1.8"/><text x="395" y="20" fill="var(--muted)" font-size="10.5" font-weight="700" text-anchor="middle" class="mono-svg">60ms</text><line x1="520" y1="28" x2="520" y2="40" stroke="var(--hb-sky)" stroke-width="1.8"/><text x="520" y="20" fill="var(--muted)" font-size="10.5" font-weight="700" text-anchor="middle" class="mono-svg">100ms</text><line x1="850" y1="28" x2="850" y2="40" stroke="var(--hb-sky)" stroke-width="1.8"/><text x="850" y="20" fill="var(--muted)" font-size="10.5" font-weight="700" text-anchor="middle" class="mono-svg">1060ms</text><rect x="14" y="54" width="108" height="72" rx="8" fill="var(--hb-card)" stroke="var(--hb-ok)" stroke-width="2"/><rect x="14" y="54" width="108" height="72" rx="8" fill="var(--hb-ok-bg)" stroke="none"/><text x="68.0" y="79.0" fill="var(--hb-ok)" font-size="11" font-weight="800" text-anchor="middle">Burst Mode</text><text x="68.0" y="94.0" fill="var(--muted)" font-size="9.5" text-anchor="middle">Immediate = 4</text><text x="68.0" y="109.0" fill="var(--muted)" font-size="9.5" text-anchor="middle">Cycle = 20ms</text><rect x="134" y="54" width="276" height="72" rx="10" fill="var(--hb-card2)" fill-opacity="0.35" stroke="var(--hb-ok)" stroke-width="1.5"/><rect x="146" y="43" width="249" height="22" rx="11" fill="var(--hb-bg)" stroke="var(--hb-ok)" stroke-width="1.4"/><text x="270.5" y="58" fill="var(--hb-ok)" font-size="10.5" font-weight="800" text-anchor="middle">PHA 1: BURST TỨC THÌ ĐÁNH THỨC MẠNG</text><rect x="136.0" y="77.0" width="56" height="26" rx="13.0" fill="var(--hb-card)" stroke="none"/><rect x="136.0" y="77.0" width="56" height="26" rx="13.0" fill="var(--hb-ok)" stroke="var(--hb-ok)" stroke-width="1.5"/><text x="164" y="93.8" fill="#ffffff" font-size="10.5" font-weight="800" text-anchor="middle">Tx#1</text><rect x="204.0" y="77.0" width="56" height="26" rx="13.0" fill="var(--hb-card)" stroke="none"/><rect x="204.0" y="77.0" width="56" height="26" rx="13.0" fill="var(--hb-ok)" stroke="var(--hb-ok)" stroke-width="1.5"/><text x="232" y="93.8" fill="#ffffff" font-size="10.5" font-weight="800" text-anchor="middle">Tx#2</text><rect x="272.0" y="77.0" width="56" height="26" rx="13.0" fill="var(--hb-card)" stroke="none"/><rect x="272.0" y="77.0" width="56" height="26" rx="13.0" fill="var(--hb-ok)" stroke="var(--hb-ok)" stroke-width="1.5"/><text x="300" y="93.8" fill="#ffffff" font-size="10.5" font-weight="800" text-anchor="middle">Tx#3</text><rect x="340.0" y="77.0" width="56" height="26" rx="13.0" fill="var(--hb-card)" stroke="none"/><rect x="340.0" y="77.0" width="56" height="26" rx="13.0" fill="var(--hb-ok)" stroke="var(--hb-ok)" stroke-width="1.5"/><text x="368" y="93.8" fill="#ffffff" font-size="10.5" font-weight="800" text-anchor="middle">Tx#4</text><rect x="420" y="54" width="476" height="72" rx="10" fill="var(--hb-card2)" fill-opacity="0.35" stroke="var(--hb-sky)" stroke-width="1.5"/><rect x="432" y="43" width="184" height="22" rx="11" fill="var(--hb-bg)" stroke="var(--hb-sky)" stroke-width="1.4"/><text x="524.0" y="58" fill="var(--hb-sky)" font-size="10.5" font-weight="800" text-anchor="middle">PHA 2: PHÁT ĐỊNH KỲ CHUẨN</text><rect x="440" y="74" width="340" height="38" rx="8" fill="var(--hb-card)" stroke="var(--hb-sky)" stroke-width="2"/><rect x="440" y="74" width="340" height="38" rx="8" fill="var(--hb-sky-bg)" stroke="none"/><text x="610.0" y="97.0" fill="var(--text)" font-size="11" font-weight="800" text-anchor="middle">CanNmMsgCycleTime = 1000ms (Nhịp ổn định)</text><rect x="803.0" y="80.0" width="66" height="26" rx="13.0" fill="var(--hb-card)" stroke="none"/><rect x="803.0" y="80.0" width="66" height="26" rx="13.0" fill="var(--hb-sky)" stroke="var(--hb-sky)" stroke-width="1.5"/><text x="836" y="96.8" fill="#06101c" font-size="10.5" font-weight="800" text-anchor="middle">Tx#5</text><rect x="14" y="152" width="108" height="72" rx="8" fill="var(--hb-card)" stroke="var(--hb-err)" stroke-width="2"/><rect x="14" y="152" width="108" height="72" rx="8" fill="var(--hb-err-bg)" stroke="none"/><text x="68.0" y="177.0" fill="var(--hb-err)" font-size="11" font-weight="800" text-anchor="middle">Không Burst</text><text x="68.0" y="192.0" fill="var(--muted)" font-size="9.5" text-anchor="middle">Immediate = 0</text><text x="68.0" y="207.0" fill="var(--muted)" font-size="9.5" text-anchor="middle">Trễ theo Offset</text><rect x="134" y="152" width="366" height="72" rx="10" fill="var(--hb-card2)" fill-opacity="0.35" stroke="var(--hb-warn)" stroke-width="1.5" stroke-dasharray="6,4"/><rect x="146" y="141" width="139" height="22" rx="11" fill="var(--hb-bg)" stroke="var(--hb-warn)" stroke-width="1.4"/><text x="215.5" y="156" fill="var(--hb-warn)" font-size="10.5" font-weight="800" text-anchor="middle">ĐỢI OFFSET (100ms)</text><rect x="149.0" y="175.0" width="102" height="26" rx="13.0" fill="var(--hb-card)" stroke="none"/><rect x="149.0" y="175.0" width="102" height="26" rx="13.0" fill="var(--hb-warn-bg)" stroke="var(--hb-warn)" stroke-width="1.5"/><text x="200" y="191.8" fill="var(--hb-warn)" font-size="10" font-weight="800" text-anchor="middle">Chờ Offset...</text><rect x="300.0" y="175.0" width="120" height="26" rx="13.0" fill="var(--hb-card)" stroke="none"/><rect x="300.0" y="175.0" width="120" height="26" rx="13.0" fill="var(--hb-err-bg)" stroke="var(--hb-err)" stroke-width="1.5"/><text x="360" y="191.8" fill="var(--hb-err)" font-size="10" font-weight="800" text-anchor="middle">Tx#1 (Quá muộn!)</text><rect x="510" y="152" width="386" height="72" rx="10" fill="var(--hb-card2)" fill-opacity="0.35" stroke="var(--hb-err)" stroke-width="1.5" stroke-dasharray="6,4"/><rect x="522" y="141" width="152" height="22" rx="11" fill="var(--hb-bg)" stroke="var(--hb-err)" stroke-width="1.4"/><text x="598.0" y="156" fill="var(--hb-err)" font-size="10.5" font-weight="800" text-anchor="middle">RỦI RO TIMEOUT MẠNG!</text><rect x="526" y="170" width="254" height="42" rx="8" fill="var(--hb-card)" stroke="var(--hb-err)" stroke-width="2"/><rect x="526" y="170" width="254" height="42" rx="8" fill="var(--hb-err-bg)" stroke="none"/><text x="653.0" y="187.5" fill="var(--hb-err)" font-size="10.5" font-weight="800" text-anchor="middle">Đợi tiếp 1000ms -&gt; ECU khác</text><text x="653.0" y="202.5" fill="var(--muted)" font-size="9.5" text-anchor="middle">có thể đã bị Timeout sập ngủ!</text><rect x="803.0" y="178.0" width="66" height="26" rx="13.0" fill="var(--hb-card)" stroke="none"/><rect x="803.0" y="178.0" width="66" height="26" rx="13.0" fill="var(--hb-err-bg)" stroke="var(--hb-err)" stroke-width="1.5"/><text x="836" y="194.8" fill="var(--hb-err)" font-size="10.5" font-weight="800" text-anchor="middle">Tx#2</text></svg>
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
            <svg viewBox="0 0 920 206" class="hb-svg" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Diagram b08"><defs><marker id="b08_arr_sky" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-sky)"/></marker><marker id="b08_arr_ok" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-ok)"/></marker><marker id="b08_arr_warn" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-warn)"/></marker><marker id="b08_arr_err" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-err)"/></marker><marker id="b08_arr_vio" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-vio)"/></marker><marker id="b08_arr_ind" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-ind)"/></marker><marker id="b08_arr_mut" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-stroke)"/></marker></defs><rect x="14" y="22" width="245" height="166" rx="10" fill="var(--hb-card2)" fill-opacity="0.35" stroke="var(--hb-ind)" stroke-width="1.5"/><rect x="26" y="11" width="152" height="22" rx="11" fill="var(--hb-bg)" stroke="var(--hb-ind)" stroke-width="1.4"/><text x="102.0" y="26" fill="var(--hb-ind)" font-size="10.5" font-weight="800" text-anchor="middle">ECU #2 (Transmitter)</text><rect x="28" y="46" width="217" height="126" rx="8" fill="var(--hb-card)" stroke="var(--hb-ind)" stroke-width="2"/><rect x="28" y="46" width="217" height="126" rx="8" fill="var(--hb-ind-bg)" stroke="none"/><path d="M 28 54 Q 28 46 36 46 L 237 46 Q 245 46 245 54 L 245 72 L 28 72 Z" fill="var(--hb-ind)" fill-opacity="0.22"/><line x1="28" y1="72" x2="245" y2="72" stroke="var(--hb-ind)" stroke-width="1" stroke-opacity="0.5"/><text x="136.5" y="63.0" fill="var(--hb-ind)" font-size="11.5" font-weight="800" text-anchor="middle">CanNm Tx PDU (8-Byte)</text><text x="136.5" y="110.5" fill="var(--text)" font-size="10" text-anchor="middle">• CAN ID: 0x500 + NodeID2</text><text x="136.5" y="125.5" fill="var(--text)" font-size="10" text-anchor="middle">• CBV Byte: [RMR, CSR, AWB]</text><text x="136.5" y="140.5" fill="var(--text)" font-size="10" text-anchor="middle">• UserData / PN Bitmask</text><line x1="259" y1="109" x2="345" y2="109" stroke="var(--hb-sky)" stroke-width="2.8" marker-end="url(#b08_arr_sky)"/><rect x="266.0" y="76.0" width="72" height="20" rx="5" fill="var(--hb-bg)" stroke="var(--hb-sky)" stroke-width="1" stroke-opacity="0.7"/><text x="302" y="89.5" fill="var(--hb-sky)" font-size="10" font-weight="700" text-anchor="middle">CAN BUS</text><rect x="271.0" y="120.0" width="62" height="20" rx="5" fill="var(--hb-bg)" stroke="var(--hb-ind)" stroke-width="1" stroke-opacity="0.7"/><text x="302" y="133.5" fill="var(--hb-ind)" font-size="10" font-weight="700" text-anchor="middle">0x502</text><rect x="345" y="22" width="560" height="166" rx="10" fill="var(--hb-card2)" fill-opacity="0.35" stroke="var(--hb-sky)" stroke-width="1.5"/><rect x="357" y="11" width="236" height="22" rx="11" fill="var(--hb-bg)" stroke="var(--hb-sky)" stroke-width="1.4"/><text x="475.0" y="26" fill="var(--hb-sky)" font-size="10.5" font-weight="800" text-anchor="middle">ECU #1 (Receiver — Node Đang Xét)</text><rect x="362" y="56" width="150" height="98" rx="8" fill="var(--hb-card)" stroke="var(--hb-stroke)" stroke-width="2"/><rect x="362" y="56" width="150" height="98" rx="8" fill="var(--hb-card2)" stroke="none"/><path d="M 362 64 Q 362 56 370 56 L 504 56 Q 512 56 512 64 L 512 82 L 362 82 Z" fill="var(--hb-stroke)" fill-opacity="0.22"/><line x1="362" y1="82" x2="512" y2="82" stroke="var(--hb-stroke)" stroke-width="1" stroke-opacity="0.5"/><text x="437.0" y="73.0" fill="var(--hb-stroke)" font-size="11" font-weight="800" text-anchor="middle">1. CanDrv -&gt; CanIf</text><text x="437.0" y="114.0" fill="var(--text)" font-size="9.8" text-anchor="middle">Ngắt Rx CAN phần cứng</text><text x="437.0" y="129.0" fill="var(--text)" font-size="9.8" text-anchor="middle">Chuyển lên CanNM</text><line x1="512" y1="105" x2="536" y2="105" stroke="var(--hb-sky)" stroke-width="2" marker-end="url(#b08_arr_sky)"/><rect x="536" y="56" width="146" height="98" rx="8" fill="var(--hb-card)" stroke="var(--hb-sky)" stroke-width="2"/><rect x="536" y="56" width="146" height="98" rx="8" fill="var(--hb-sky-bg)" stroke="none"/><path d="M 536 64 Q 536 56 544 56 L 674 56 Q 682 56 682 64 L 682 82 L 536 82 Z" fill="var(--hb-sky)" fill-opacity="0.22"/><line x1="536" y1="82" x2="682" y2="82" stroke="var(--hb-sky)" stroke-width="1" stroke-opacity="0.5"/><text x="609.0" y="73.0" fill="var(--hb-sky)" font-size="11" font-weight="800" text-anchor="middle">2. RxIndication()</text><text x="609.0" y="114.0" fill="var(--text)" font-size="9.8" text-anchor="middle">CanNm_RxIndication()</text><text x="609.0" y="129.0" fill="var(--text)" font-size="9.8" text-anchor="middle">Giải mã CBV &amp; Mask</text><line x1="682" y1="105" x2="706" y2="105" stroke="var(--hb-warn)" stroke-width="2" marker-end="url(#b08_arr_warn)"/><polygon points="756,61 806,105 756,149 706,105" fill="var(--hb-card)" stroke="var(--hb-warn)" stroke-width="2"/><polygon points="756,61 806,105 756,149 706,105" fill="var(--hb-warn-bg)" stroke="none"/><text x="756" y="102.0" fill="var(--hb-warn)" font-size="10.2" font-weight="800" text-anchor="middle">ECU1 ở</text><text x="756" y="116.0" fill="var(--hb-warn)" font-size="10.2" font-weight="800" text-anchor="middle">State nào?</text><line x1="806" y1="105" x2="822" y2="105" stroke="var(--hb-ok)" stroke-width="2" marker-end="url(#b08_arr_ok)"/><rect x="822" y="56" width="74" height="98" rx="8" fill="var(--hb-card)" stroke="var(--hb-ok)" stroke-width="2"/><rect x="822" y="56" width="74" height="98" rx="8" fill="var(--hb-ok-bg)" stroke="none"/><text x="859.0" y="94.0" fill="var(--hb-ok)" font-size="10.5" font-weight="800" text-anchor="middle">Phân Xử</text><text x="859.0" y="109.0" fill="var(--muted)" font-size="9.5" text-anchor="middle">Ma trận</text><text x="859.0" y="124.0" fill="var(--muted)" font-size="9.5" text-anchor="middle">hành vi</text></svg>
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
            <svg viewBox="0 0 920 232" class="hb-svg" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Diagram b09"><defs><marker id="b09_arr_sky" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-sky)"/></marker><marker id="b09_arr_ok" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-ok)"/></marker><marker id="b09_arr_warn" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-warn)"/></marker><marker id="b09_arr_err" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-err)"/></marker><marker id="b09_arr_vio" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-vio)"/></marker><marker id="b09_arr_ind" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-ind)"/></marker><marker id="b09_arr_mut" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-stroke)"/></marker></defs><line x1="160" y1="34" x2="160" y2="215" stroke="var(--hb-stroke)" stroke-dasharray="4,4" stroke-width="1"/><rect x="76.0" y="9.0" width="168" height="22" rx="11.0" fill="var(--hb-card)" stroke="none"/><rect x="76.0" y="9.0" width="168" height="22" rx="11.0" fill="var(--hb-warn-bg)" stroke="var(--hb-warn)" stroke-width="1.5"/><text x="160" y="23.8" fill="var(--hb-warn)" font-size="10" font-weight="800" text-anchor="middle">t = 1900 ms</text><line x1="380" y1="34" x2="380" y2="215" stroke="var(--hb-stroke)" stroke-dasharray="4,4" stroke-width="1"/><rect x="265.0" y="9.0" width="230" height="22" rx="11.0" fill="var(--hb-card)" stroke="none"/><rect x="265.0" y="9.0" width="230" height="22" rx="11.0" fill="var(--hb-warn-bg)" stroke="var(--hb-warn)" stroke-width="1.5"/><text x="380" y="23.8" fill="var(--hb-warn)" font-size="10" font-weight="800" text-anchor="middle">t = 1950 ms (Chỉ còn 50ms là ngủ!)</text><line x1="720" y1="34" x2="720" y2="215" stroke="var(--hb-stroke)" stroke-dasharray="4,4" stroke-width="1"/><rect x="605.0" y="9.0" width="230" height="22" rx="11.0" fill="var(--hb-card)" stroke="none"/><rect x="605.0" y="9.0" width="230" height="22" rx="11.0" fill="var(--hb-sky-bg)" stroke="var(--hb-sky)" stroke-width="1.5"/><text x="720" y="23.8" fill="var(--hb-sky)" font-size="10" font-weight="800" text-anchor="middle">t = 1951 ms (Cứu sống kịp thời!)</text><rect x="14" y="58" width="92" height="54" rx="8" fill="var(--hb-card)" stroke="var(--hb-sky)" stroke-width="2"/><rect x="14" y="58" width="92" height="54" rx="8" fill="var(--hb-sky-bg)" stroke="none"/><path d="M 14 66 Q 14 58 22 58 L 98 58 Q 106 58 106 66 L 106 80 L 14 80 Z" fill="var(--hb-sky)" fill-opacity="0.22"/><line x1="14" y1="80" x2="106" y2="80" stroke="var(--hb-sky)" stroke-width="1" stroke-opacity="0.5"/><text x="60.0" y="73.0" fill="var(--hb-sky)" font-size="12" font-weight="800" text-anchor="middle">ECU #1</text><text x="60.0" y="99.5" fill="var(--text)" font-size="10.5" text-anchor="middle">Target Node</text><rect x="120" y="58" width="175" height="54" rx="8" fill="var(--hb-card)" stroke="var(--hb-warn)" stroke-width="2"/><rect x="120" y="58" width="175" height="54" rx="8" fill="var(--hb-warn-bg)" stroke="none"/><text x="207.5" y="81.5" fill="var(--hb-warn)" font-size="11" font-weight="800" text-anchor="middle">Ready Sleep</text><text x="207.5" y="96.5" fill="var(--muted)" font-size="10.5" text-anchor="middle">Timeout còn: 100ms</text><line x1="295" y1="85" x2="326" y2="85" stroke="var(--hb-warn)" stroke-width="2" marker-end="url(#b09_arr_warn)"/><rect x="326" y="58" width="180" height="54" rx="8" fill="var(--hb-card)" stroke="var(--hb-err)" stroke-width="2"/><rect x="326" y="58" width="180" height="54" rx="8" fill="var(--hb-err-bg)" stroke="none"/><text x="416.0" y="81.5" fill="var(--hb-err)" font-size="11" font-weight="800" text-anchor="middle">Ready Sleep</text><text x="416.0" y="96.5" fill="var(--muted)" font-size="10.5" text-anchor="middle">Timeout còn: 50ms!</text><line x1="506" y1="85" x2="558" y2="85" stroke="var(--hb-ok)" stroke-width="2" marker-end="url(#b09_arr_ok)"/><rect x="558" y="52" width="342" height="66" rx="8" fill="var(--hb-card)" stroke="var(--hb-ok)" stroke-width="2"/><rect x="558" y="52" width="342" height="66" rx="8" fill="var(--hb-ok-bg)" stroke="none"/><rect x="562" y="56" width="334" height="58" rx="5" fill="none" stroke="var(--hb-ok)" stroke-width="1.2" stroke-opacity="0.8"/><path d="M 558 60 Q 558 52 566 52 L 892 52 Q 900 52 900 60 L 900 74 L 558 74 Z" fill="var(--hb-ok)" fill-opacity="0.22"/><line x1="558" y1="74" x2="900" y2="74" stroke="var(--hb-ok)" stroke-width="1" stroke-opacity="0.5"/><text x="729.0" y="67.0" fill="var(--hb-ok)" font-size="11.5" font-weight="800" text-anchor="middle">RELOAD TimeoutTime = 2000 ms!</text><text x="729.0" y="99.5" fill="var(--text)" font-size="10" text-anchor="middle">CanNm_RxIndication() -&gt; ECU1 giữ Ready Sleep thêm 2s</text><rect x="14" y="154" width="92" height="54" rx="8" fill="var(--hb-card)" stroke="var(--hb-ind)" stroke-width="2"/><rect x="14" y="154" width="92" height="54" rx="8" fill="var(--hb-ind-bg)" stroke="none"/><path d="M 14 162 Q 14 154 22 154 L 98 154 Q 106 154 106 162 L 106 176 L 14 176 Z" fill="var(--hb-ind)" fill-opacity="0.22"/><line x1="14" y1="176" x2="106" y2="176" stroke="var(--hb-ind)" stroke-width="1" stroke-opacity="0.5"/><text x="60.0" y="169.0" fill="var(--hb-ind)" font-size="12" font-weight="800" text-anchor="middle">ECU #2</text><text x="60.0" y="195.5" fill="var(--text)" font-size="10.5" text-anchor="middle">Remote Node</text><rect x="120" y="154" width="240" height="54" rx="8" fill="var(--hb-card)" stroke="var(--hb-ind)" stroke-width="2"/><rect x="120" y="154" width="240" height="54" rx="8" fill="var(--hb-ind-bg)" stroke="none"/><text x="240.0" y="177.5" fill="var(--hb-ind)" font-size="11" font-weight="800" text-anchor="middle">Bất ngờ có nhu cầu truyền tin</text><text x="240.0" y="192.5" fill="var(--muted)" font-size="10.5" text-anchor="middle">Ứng dụng thức -&gt; CanNm PDU</text><line x1="360" y1="181" x2="470" y2="181" stroke="var(--hb-ind)" stroke-width="2" marker-end="url(#b09_arr_ind)"/><rect x="470" y="154" width="195" height="54" rx="8" fill="var(--hb-card)" stroke="var(--hb-ind)" stroke-width="2"/><rect x="470" y="154" width="195" height="54" rx="8" fill="var(--hb-ind-bg)" stroke="none"/><text x="567.5" y="177.5" fill="var(--hb-ind)" font-size="11" font-weight="800" text-anchor="middle">Bắn CanNm PDU (0x502)</text><text x="567.5" y="192.5" fill="var(--muted)" font-size="10.5" text-anchor="middle">Phát lên CAN Bus @ 1951ms</text><path d="M 665 181 L 729 181 L 729 118" fill="none" stroke="var(--hb-ok)" stroke-width="2.4" stroke-linejoin="round" marker-end="url(#b09_arr_ok)"/><rect x="708.0" y="140.0" width="174" height="20" rx="5" fill="var(--hb-bg)" stroke="var(--hb-ok)" stroke-width="1" stroke-opacity="0.7"/><text x="795" y="153.5" fill="var(--hb-ok)" font-size="10" font-weight="700" text-anchor="middle">CanIf -&gt; CanNm_RxIndication()</text></svg>
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
            <svg viewBox="0 0 920 276" class="hb-svg" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Diagram b10"><defs><marker id="b10_arr_sky" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-sky)"/></marker><marker id="b10_arr_ok" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-ok)"/></marker><marker id="b10_arr_warn" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-warn)"/></marker><marker id="b10_arr_err" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-err)"/></marker><marker id="b10_arr_vio" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-vio)"/></marker><marker id="b10_arr_ind" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-ind)"/></marker><marker id="b10_arr_mut" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-stroke)"/></marker></defs><rect x="110.0" y="11.0" width="210" height="26" rx="13.0" fill="var(--hb-card)" stroke="none"/><rect x="110.0" y="11.0" width="210" height="26" rx="13.0" fill="var(--hb-sky-bg)" stroke="var(--hb-sky)" stroke-width="1.5"/><text x="215" y="27.8" fill="var(--hb-sky)" font-size="10" font-weight="800" text-anchor="middle">Ứng dụng cần mạng: NetworkRequest()</text><line x1="215" y1="37" x2="215" y2="68" stroke="var(--hb-sky)" stroke-width="2" marker-end="url(#b10_arr_sky)"/><rect x="600.0" y="11.0" width="210" height="26" rx="13.0" fill="var(--hb-card)" stroke="none"/><rect x="600.0" y="11.0" width="210" height="26" rx="13.0" fill="var(--hb-warn-bg)" stroke="var(--hb-warn)" stroke-width="1.5"/><text x="705" y="27.8" fill="var(--hb-warn)" font-size="10" font-weight="800" text-anchor="middle">Ứng dụng hết việc: NetworkRelease()</text><line x1="705" y1="37" x2="705" y2="68" stroke="var(--hb-warn)" stroke-width="2" marker-end="url(#b10_arr_warn)"/><rect x="50" y="68" width="330" height="114" rx="8" fill="var(--hb-card)" stroke="var(--hb-sky)" stroke-width="2"/><rect x="50" y="68" width="330" height="114" rx="8" fill="var(--hb-sky-bg)" stroke="none"/><rect x="54" y="72" width="322" height="106" rx="5" fill="none" stroke="var(--hb-sky)" stroke-width="1.2" stroke-opacity="0.8"/><path d="M 50 76 Q 50 68 58 68 L 372 68 Q 380 68 380 76 L 380 94 L 50 94 Z" fill="var(--hb-sky)" fill-opacity="0.22"/><line x1="50" y1="94" x2="380" y2="94" stroke="var(--hb-sky)" stroke-width="1" stroke-opacity="0.5"/><text x="215.0" y="85.0" fill="var(--hb-sky)" font-size="12" font-weight="800" text-anchor="middle">NORMAL OPERATION STATE (NOS)</text><text x="215.0" y="126.5" fill="var(--text)" font-size="10.5" text-anchor="middle">• Truyền phát Tx: BẬT (Enable Tx)</text><text x="215.0" y="141.5" fill="var(--text)" font-size="10.5" text-anchor="middle">• Lắng nghe Rx: BẬT (Listen Rx)</text><text x="215.0" y="156.5" fill="var(--text)" font-size="10.5" text-anchor="middle">• Phát định kỳ mỗi CanNmMsgCycleTime</text><rect x="540" y="68" width="330" height="114" rx="8" fill="var(--hb-card)" stroke="var(--hb-warn)" stroke-width="2"/><rect x="540" y="68" width="330" height="114" rx="8" fill="var(--hb-warn-bg)" stroke="none"/><path d="M 540 76 Q 540 68 548 68 L 862 68 Q 870 68 870 76 L 870 94 L 540 94 Z" fill="var(--hb-warn)" fill-opacity="0.22"/><line x1="540" y1="94" x2="870" y2="94" stroke="var(--hb-warn)" stroke-width="1" stroke-opacity="0.5"/><text x="705.0" y="85.0" fill="var(--hb-warn)" font-size="12" font-weight="800" text-anchor="middle">READY SLEEP STATE (RSS)</text><text x="705.0" y="126.5" fill="var(--text)" font-size="10.5" text-anchor="middle">• Truyền phát Tx: TẮT (Silent Mode)</text><text x="705.0" y="141.5" fill="var(--text)" font-size="10.5" text-anchor="middle">• Lắng nghe Rx: BẬT (Listen Rx)</text><text x="705.0" y="156.5" fill="var(--text)" font-size="10.5" text-anchor="middle">• Đếm lùi CanNmTimeoutTime</text><line x1="380" y1="102" x2="540" y2="102" stroke="var(--hb-warn)" stroke-width="2.2" marker-end="url(#b10_arr_warn)"/><rect x="386.0" y="76.0" width="148" height="20" rx="5" fill="var(--hb-bg)" stroke="var(--hb-warn)" stroke-width="1" stroke-opacity="0.7"/><text x="460" y="89.5" fill="var(--hb-warn)" font-size="10" font-weight="700" text-anchor="middle">CanNm_NetworkRelease()</text><line x1="540" y1="148" x2="380" y2="148" stroke="var(--hb-sky)" stroke-width="2.2" marker-end="url(#b10_arr_sky)"/><rect x="386.0" y="156.0" width="148" height="20" rx="5" fill="var(--hb-bg)" stroke="var(--hb-sky)" stroke-width="1" stroke-opacity="0.7"/><text x="460" y="169.5" fill="var(--hb-sky)" font-size="10" font-weight="700" text-anchor="middle">CanNm_NetworkRequest()</text><line x1="705" y1="182" x2="705" y2="216" stroke="var(--hb-err)" stroke-width="2.2" marker-end="url(#b10_arr_err)"/><rect x="734.0" y="188.0" width="124" height="20" rx="5" fill="var(--hb-bg)" stroke="var(--hb-err)" stroke-width="1" stroke-opacity="0.7"/><text x="796" y="201.5" fill="var(--hb-err)" font-size="10" font-weight="700" text-anchor="middle">TimeoutTime = 0ms</text><rect x="540" y="216" width="330" height="44" rx="8" fill="var(--hb-card)" stroke="var(--hb-err)" stroke-width="2"/><rect x="540" y="216" width="330" height="44" rx="8" fill="var(--hb-err-bg)" stroke="none"/><text x="705.0" y="234.5" fill="var(--hb-err)" font-size="11.5" font-weight="800" text-anchor="middle">Prepare Bus-Sleep Mode (PBSM)</text><text x="705.0" y="249.5" fill="var(--muted)" font-size="10.5" text-anchor="middle">Đếm WaitBusSleepTimer trước khi ngủ</text></svg>
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
            <svg viewBox="0 0 920 304" class="hb-svg" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Diagram b11"><defs><marker id="b11_arr_sky" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-sky)"/></marker><marker id="b11_arr_ok" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-ok)"/></marker><marker id="b11_arr_warn" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-warn)"/></marker><marker id="b11_arr_err" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-err)"/></marker><marker id="b11_arr_vio" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-vio)"/></marker><marker id="b11_arr_ind" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-ind)"/></marker><marker id="b11_arr_mut" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-stroke)"/></marker></defs><rect x="20" y="118" width="150" height="74" rx="8" fill="var(--hb-card)" stroke="var(--hb-ind)" stroke-width="2"/><rect x="20" y="118" width="150" height="74" rx="8" fill="var(--hb-ind-bg)" stroke="none"/><path d="M 20 126 Q 20 118 28 118 L 162 118 Q 170 118 170 126 L 170 143 L 20 143 Z" fill="var(--hb-ind)" fill-opacity="0.22"/><line x1="20" y1="143" x2="170" y2="143" stroke="var(--hb-ind)" stroke-width="1" stroke-opacity="0.5"/><text x="95.0" y="134.5" fill="var(--hb-ind)" font-size="11.5" font-weight="800" text-anchor="middle">Bus-Sleep Mode</text><text x="95.0" y="171.0" fill="var(--text)" font-size="10.5" text-anchor="middle">BSM (Ngủ sâu)</text><rect x="270" y="26" width="200" height="70" rx="8" fill="var(--hb-card)" stroke="var(--hb-sky)" stroke-width="2"/><rect x="270" y="26" width="200" height="70" rx="8" fill="var(--hb-sky-bg)" stroke="none"/><rect x="274" y="30" width="192" height="62" rx="5" fill="none" stroke="var(--hb-sky)" stroke-width="1.2" stroke-opacity="0.8"/><path d="M 270 34 Q 270 26 278 26 L 462 26 Q 470 26 470 34 L 470 49 L 270 49 Z" fill="var(--hb-sky)" fill-opacity="0.22"/><line x1="270" y1="49" x2="470" y2="49" stroke="var(--hb-sky)" stroke-width="1" stroke-opacity="0.5"/><text x="370.0" y="41.5" fill="var(--hb-sky)" font-size="11.5" font-weight="800" text-anchor="middle">Repeat Message</text><text x="370.0" y="76.0" fill="var(--text)" font-size="10.5" text-anchor="middle">RMS (Khởi động/Điểm danh)</text><rect x="660" y="26" width="230" height="70" rx="8" fill="var(--hb-card)" stroke="var(--hb-ok)" stroke-width="2"/><rect x="660" y="26" width="230" height="70" rx="8" fill="var(--hb-ok-bg)" stroke="none"/><path d="M 660 34 Q 660 26 668 26 L 882 26 Q 890 26 890 34 L 890 49 L 660 49 Z" fill="var(--hb-ok)" fill-opacity="0.22"/><line x1="660" y1="49" x2="890" y2="49" stroke="var(--hb-ok)" stroke-width="1" stroke-opacity="0.5"/><text x="775.0" y="41.5" fill="var(--hb-ok)" font-size="11.5" font-weight="800" text-anchor="middle">Normal Operation</text><text x="775.0" y="76.0" fill="var(--text)" font-size="10.5" text-anchor="middle">NOS (Giữ mạng &amp; phát Tx)</text><rect x="660" y="206" width="230" height="70" rx="8" fill="var(--hb-card)" stroke="var(--hb-warn)" stroke-width="2"/><rect x="660" y="206" width="230" height="70" rx="8" fill="var(--hb-warn-bg)" stroke="none"/><path d="M 660 214 Q 660 206 668 206 L 882 206 Q 890 206 890 214 L 890 229 L 660 229 Z" fill="var(--hb-warn)" fill-opacity="0.22"/><line x1="660" y1="229" x2="890" y2="229" stroke="var(--hb-warn)" stroke-width="1" stroke-opacity="0.5"/><text x="775.0" y="221.5" fill="var(--hb-warn)" font-size="11.5" font-weight="800" text-anchor="middle">Ready Sleep</text><text x="775.0" y="256.0" fill="var(--text)" font-size="10.5" text-anchor="middle">RSS (Dừng Tx, chờ Timeout)</text><rect x="270" y="206" width="200" height="70" rx="8" fill="var(--hb-card)" stroke="var(--hb-err)" stroke-width="2"/><rect x="270" y="206" width="200" height="70" rx="8" fill="var(--hb-err-bg)" stroke="none"/><path d="M 270 214 Q 270 206 278 206 L 462 206 Q 470 206 470 214 L 470 229 L 270 229 Z" fill="var(--hb-err)" fill-opacity="0.22"/><line x1="270" y1="229" x2="470" y2="229" stroke="var(--hb-err)" stroke-width="1" stroke-opacity="0.5"/><text x="370.0" y="221.5" fill="var(--hb-err)" font-size="11.5" font-weight="800" text-anchor="middle">Prepare Bus-Sleep</text><text x="370.0" y="256.0" fill="var(--text)" font-size="10.5" text-anchor="middle">PBSM (Đếm WaitBusSleep)</text><path d="M 95 118 L 95 61 L 270 61" fill="none" stroke="var(--hb-sky)" stroke-width="2.2" stroke-linejoin="round" marker-end="url(#b11_arr_sky)"/><circle cx="152" cy="61" r="10" fill="var(--hb-card)" stroke="var(--hb-sky)" stroke-width="1.8"/><text x="152" y="64.8" fill="var(--hb-sky)" font-size="10" font-weight="800" text-anchor="middle">1</text><circle cx="176" cy="61" r="10" fill="var(--hb-card)" stroke="var(--hb-ind)" stroke-width="1.8"/><text x="176" y="64.8" fill="var(--hb-ind)" font-size="10" font-weight="800" text-anchor="middle">2</text><rect x="91.0" y="26.0" width="148" height="20" rx="5" fill="var(--hb-bg)" stroke="var(--hb-sky)" stroke-width="1" stroke-opacity="0.7"/><text x="165" y="39.5" fill="var(--hb-sky)" font-size="10" font-weight="700" text-anchor="middle">NetReq / PassiveStartUp</text><line x1="470" y1="61" x2="660" y2="61" stroke="var(--hb-ok)" stroke-width="2.2" marker-end="url(#b11_arr_ok)"/><circle cx="565" cy="61" r="10" fill="var(--hb-card)" stroke="var(--hb-ok)" stroke-width="1.8"/><text x="565" y="64.8" fill="var(--hb-ok)" font-size="10" font-weight="800" text-anchor="middle">3</text><rect x="492.0" y="26.0" width="146" height="20" rx="5" fill="var(--hb-bg)" stroke="var(--hb-ok)" stroke-width="1" stroke-opacity="0.7"/><text x="565" y="39.5" fill="var(--hb-ok)" font-size="10" font-weight="700" text-anchor="middle">RptTimer=0 &amp; NetReq=1</text><path d="M 425 96 L 425 148 L 620 148 L 620 226 L 660 226" fill="none" stroke="var(--hb-warn)" stroke-width="2" stroke-linejoin="round" marker-end="url(#b11_arr_warn)"/><circle cx="522" cy="148" r="10" fill="var(--hb-card)" stroke="var(--hb-warn)" stroke-width="1.8"/><text x="522" y="151.8" fill="var(--hb-warn)" font-size="10" font-weight="800" text-anchor="middle">4</text><rect x="449.0" y="116.0" width="146" height="20" rx="5" fill="var(--hb-bg)" stroke="var(--hb-warn)" stroke-width="1" stroke-opacity="0.7"/><text x="522" y="129.5" fill="var(--hb-warn)" font-size="10" font-weight="700" text-anchor="middle">RptTimer=0 &amp; NetReq=0</text><line x1="735" y1="96" x2="735" y2="206" stroke="var(--hb-warn)" stroke-width="2" marker-end="url(#b11_arr_warn)"/><circle cx="735" cy="151" r="10" fill="var(--hb-card)" stroke="var(--hb-warn)" stroke-width="1.8"/><text x="735" y="154.8" fill="var(--hb-warn)" font-size="10" font-weight="800" text-anchor="middle">5</text><rect x="641.0" y="168.0" width="78" height="20" rx="5" fill="var(--hb-bg)" stroke="var(--hb-warn)" stroke-width="1" stroke-opacity="0.7"/><text x="680" y="181.5" fill="var(--hb-warn)" font-size="10" font-weight="700" text-anchor="middle">NetRelease</text><line x1="825" y1="206" x2="825" y2="96" stroke="var(--hb-ok)" stroke-width="2" marker-end="url(#b11_arr_ok)"/><circle cx="825" cy="151" r="10" fill="var(--hb-card)" stroke="var(--hb-ok)" stroke-width="1.8"/><text x="825" y="154.8" fill="var(--hb-ok)" font-size="10" font-weight="800" text-anchor="middle">6</text><rect x="831.0" y="114.0" width="62" height="20" rx="5" fill="var(--hb-bg)" stroke="var(--hb-ok)" stroke-width="1" stroke-opacity="0.7"/><text x="862" y="127.5" fill="var(--hb-ok)" font-size="10" font-weight="700" text-anchor="middle">NetReq</text><line x1="660" y1="250" x2="470" y2="250" stroke="var(--hb-err)" stroke-width="2.2" marker-end="url(#b11_arr_err)"/><circle cx="565" cy="250" r="10" fill="var(--hb-card)" stroke="var(--hb-err)" stroke-width="1.8"/><text x="565" y="253.8" fill="var(--hb-err)" font-size="10" font-weight="800" text-anchor="middle">7</text><rect x="494.0" y="265.0" width="142" height="20" rx="5" fill="var(--hb-bg)" stroke="var(--hb-err)" stroke-width="1" stroke-opacity="0.7"/><text x="565" y="278.5" fill="var(--hb-err)" font-size="10" font-weight="700" text-anchor="middle">CanNmTimeoutTime = 0</text><line x1="350" y1="206" x2="350" y2="96" stroke="var(--hb-vio)" stroke-width="2.2" marker-end="url(#b11_arr_vio)"/><circle cx="350" cy="151" r="10" fill="var(--hb-card)" stroke="var(--hb-vio)" stroke-width="1.8"/><text x="350" y="154.8" fill="var(--hb-vio)" font-size="10" font-weight="800" text-anchor="middle">8</text><rect x="166.0" y="141.0" width="164" height="20" rx="5" fill="var(--hb-bg)" stroke="var(--hb-vio)" stroke-width="1" stroke-opacity="0.7"/><text x="248" y="154.5" fill="var(--hb-vio)" font-size="10" font-weight="700" text-anchor="middle">Immediate Restart (NetReq/Rx)</text><path d="M 270 241 L 95 241 L 95 192" fill="none" stroke="var(--hb-ind)" stroke-width="2.2" stroke-linejoin="round" marker-end="url(#b11_arr_ind)"/><circle cx="165" cy="241" r="10" fill="var(--hb-card)" stroke="var(--hb-ind)" stroke-width="1.8"/><text x="165" y="244.8" fill="var(--hb-ind)" font-size="10" font-weight="800" text-anchor="middle">9</text><rect x="94.0" y="256.0" width="142" height="20" rx="5" fill="var(--hb-bg)" stroke="var(--hb-ind)" stroke-width="1" stroke-opacity="0.7"/><text x="165" y="269.5" fill="var(--hb-ind)" font-size="10" font-weight="700" text-anchor="middle">WaitBusSleepTime = 0</text></svg>
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
            <svg viewBox="0 0 920 202" class="hb-svg" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Diagram b12"><defs><marker id="b12_arr_sky" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-sky)"/></marker><marker id="b12_arr_ok" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-ok)"/></marker><marker id="b12_arr_warn" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-warn)"/></marker><marker id="b12_arr_err" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-err)"/></marker><marker id="b12_arr_vio" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-vio)"/></marker><marker id="b12_arr_ind" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-ind)"/></marker><marker id="b12_arr_mut" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-stroke)"/></marker></defs><rect x="16" y="48" width="226" height="86" rx="8" fill="var(--hb-card)" stroke="var(--hb-warn)" stroke-width="2"/><rect x="16" y="48" width="226" height="86" rx="8" fill="var(--hb-warn-bg)" stroke="none"/><path d="M 16 56 Q 16 48 24 48 L 234 48 Q 242 48 242 56 L 242 74 L 16 74 Z" fill="var(--hb-warn)" fill-opacity="0.22"/><line x1="16" y1="74" x2="242" y2="74" stroke="var(--hb-warn)" stroke-width="1" stroke-opacity="0.5"/><text x="129.0" y="65.0" fill="var(--hb-warn)" font-size="11.5" font-weight="800" text-anchor="middle">Prepare Bus-Sleep (PBSM)</text><text x="129.0" y="100.0" fill="var(--text)" font-size="10.5" text-anchor="middle">WaitBusSleepTimer đếm lùi:</text><text x="129.0" y="115.0" fill="var(--text)" font-size="10.5" text-anchor="middle">1500ms -&gt; 800ms -&gt; ...</text><line x1="242" y1="91" x2="290" y2="91" stroke="var(--hb-err)" stroke-width="2.2" marker-end="url(#b12_arr_err)"/><polygon points="370,45 450,91 370,137 290,91" fill="var(--hb-card)" stroke="var(--hb-err)" stroke-width="2"/><polygon points="370,45 450,91 370,137 290,91" fill="var(--hb-err-bg)" stroke="none"/><text x="370" y="88.0" fill="var(--hb-err)" font-size="10.5" font-weight="800" text-anchor="middle">BẤT NGỜ!</text><text x="370" y="102.0" fill="var(--hb-err)" font-size="10.5" font-weight="800" text-anchor="middle">NetReq() / Rx PDU?</text><line x1="450" y1="91" x2="492" y2="91" stroke="var(--hb-sky)" stroke-width="2.2" marker-end="url(#b12_arr_sky)"/><rect x="450.0" y="56.0" width="42" height="20" rx="5" fill="var(--hb-bg)" stroke="var(--hb-err)" stroke-width="1" stroke-opacity="0.7"/><text x="471" y="69.5" fill="var(--hb-err)" font-size="10" font-weight="700" text-anchor="middle">CÓ</text><rect x="492" y="22" width="412" height="162" rx="10" fill="var(--hb-card2)" fill-opacity="0.35" stroke="var(--hb-sky)" stroke-width="1.5"/><rect x="504" y="11" width="204" height="22" rx="11" fill="var(--hb-bg)" stroke="var(--hb-sky)" stroke-width="1.4"/><text x="606.0" y="26" fill="var(--hb-sky)" font-size="10.5" font-weight="800" text-anchor="middle">IMMEDIATE RESTART KÍCH HOẠT!</text><rect x="510" y="42" width="376" height="36" rx="8" fill="var(--hb-card)" stroke="var(--hb-warn)" stroke-width="2"/><rect x="510" y="42" width="376" height="36" rx="8" fill="var(--hb-warn-bg)" stroke="none"/><text x="698.0" y="64.0" fill="var(--text)" font-size="11" font-weight="800" text-anchor="middle">1. Lập tức HỦY bộ đếm WaitBusSleepTimer</text><line x1="698" y1="78" x2="698" y2="92" stroke="var(--hb-sky)" stroke-width="2" marker-end="url(#b12_arr_sky)"/><rect x="510" y="92" width="376" height="36" rx="8" fill="var(--hb-card)" stroke="var(--hb-sky)" stroke-width="2"/><rect x="510" y="92" width="376" height="36" rx="8" fill="var(--hb-sky-bg)" stroke="none"/><text x="698.0" y="114.0" fill="var(--text)" font-size="11" font-weight="800" text-anchor="middle">2. Chuyển ngay về Repeat Message State tại t = 0ms</text><line x1="698" y1="128" x2="698" y2="142" stroke="var(--hb-ok)" stroke-width="2" marker-end="url(#b12_arr_ok)"/><rect x="510" y="142" width="376" height="34" rx="8" fill="var(--hb-card)" stroke="var(--hb-ok)" stroke-width="2"/><rect x="510" y="142" width="376" height="34" rx="8" fill="var(--hb-ok-bg)" stroke="none"/><text x="698.0" y="163.0" fill="var(--text)" font-size="10.8" font-weight="800" text-anchor="middle">3. CanNmImmediateRestartEnabled = TRUE: Bắn Tx ngay!</text></svg>
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
            <svg viewBox="0 0 920 204" class="hb-svg" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Diagram b13"><defs><marker id="b13_arr_sky" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-sky)"/></marker><marker id="b13_arr_ok" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-ok)"/></marker><marker id="b13_arr_warn" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-warn)"/></marker><marker id="b13_arr_err" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-err)"/></marker><marker id="b13_arr_vio" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-vio)"/></marker><marker id="b13_arr_ind" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-ind)"/></marker><marker id="b13_arr_mut" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-stroke)"/></marker></defs><rect x="18" y="14" width="884" height="34" rx="8" fill="var(--hb-card)" stroke="var(--hb-sky)" stroke-width="2"/><rect x="18" y="14" width="884" height="34" rx="8" fill="var(--hb-sky-bg)" stroke="none"/><text x="460.0" y="35.0" fill="var(--text)" font-size="11.5" font-weight="800" text-anchor="middle">CAN ID (11-bit / 29-bit) = BaseCanId (0x500) + NodeId (0x1A) = 0x51A</text><rect x="22" y="62" width="104" height="86" rx="8" fill="var(--hb-card)" stroke="var(--hb-sky)" stroke-width="2"/><rect x="22" y="62" width="104" height="86" rx="8" fill="var(--hb-sky-bg)" stroke="none"/><path d="M 22 70 Q 22 62 30 62 L 118 62 Q 126 62 126 70 L 126 88 L 22 88 Z" fill="var(--hb-sky)" fill-opacity="0.22"/><line x1="22" y1="88" x2="126" y2="88" stroke="var(--hb-sky)" stroke-width="1" stroke-opacity="0.5"/><text x="74.0" y="79.0" fill="var(--hb-sky)" font-size="11" font-weight="800" text-anchor="middle">Byte 0</text><text x="74.0" y="114.0" fill="var(--text)" class="mono-svg" font-size="9.5" text-anchor="middle">SNI (NodeId)</text><text x="74.0" y="129.0" fill="var(--text)" class="mono-svg" font-size="9.5" text-anchor="middle">0x1A</text><rect x="132" y="62" width="104" height="86" rx="8" fill="var(--hb-card)" stroke="var(--hb-warn)" stroke-width="2"/><rect x="132" y="62" width="104" height="86" rx="8" fill="var(--hb-warn-bg)" stroke="none"/><path d="M 132 70 Q 132 62 140 62 L 228 62 Q 236 62 236 70 L 236 88 L 132 88 Z" fill="var(--hb-warn)" fill-opacity="0.22"/><line x1="132" y1="88" x2="236" y2="88" stroke="var(--hb-warn)" stroke-width="1" stroke-opacity="0.5"/><text x="184.0" y="79.0" fill="var(--hb-warn)" font-size="11" font-weight="800" text-anchor="middle">Byte 1</text><text x="184.0" y="114.0" fill="var(--text)" class="mono-svg" font-size="9.5" text-anchor="middle">CBV Vector</text><text x="184.0" y="129.0" fill="var(--text)" class="mono-svg" font-size="9.5" text-anchor="middle">0x10</text><rect x="242" y="62" width="104" height="86" rx="8" fill="var(--hb-card)" stroke="var(--hb-vio)" stroke-width="2"/><rect x="242" y="62" width="104" height="86" rx="8" fill="var(--hb-vio-bg)" stroke="none"/><path d="M 242 70 Q 242 62 250 62 L 338 62 Q 346 62 346 70 L 346 88 L 242 88 Z" fill="var(--hb-vio)" fill-opacity="0.22"/><line x1="242" y1="88" x2="346" y2="88" stroke="var(--hb-vio)" stroke-width="1" stroke-opacity="0.5"/><text x="294.0" y="79.0" fill="var(--hb-vio)" font-size="11" font-weight="800" text-anchor="middle">Byte 2</text><text x="294.0" y="114.0" fill="var(--text)" class="mono-svg" font-size="9.5" text-anchor="middle">User Data #0</text><text x="294.0" y="129.0" fill="var(--text)" class="mono-svg" font-size="9.5" text-anchor="middle">0x11 / PN0</text><rect x="352" y="62" width="104" height="86" rx="8" fill="var(--hb-card)" stroke="var(--hb-vio)" stroke-width="2"/><rect x="352" y="62" width="104" height="86" rx="8" fill="var(--hb-vio-bg)" stroke="none"/><path d="M 352 70 Q 352 62 360 62 L 448 62 Q 456 62 456 70 L 456 88 L 352 88 Z" fill="var(--hb-vio)" fill-opacity="0.22"/><line x1="352" y1="88" x2="456" y2="88" stroke="var(--hb-vio)" stroke-width="1" stroke-opacity="0.5"/><text x="404.0" y="79.0" fill="var(--hb-vio)" font-size="11" font-weight="800" text-anchor="middle">Byte 3</text><text x="404.0" y="114.0" fill="var(--text)" class="mono-svg" font-size="9.5" text-anchor="middle">User Data #1</text><text x="404.0" y="129.0" fill="var(--text)" class="mono-svg" font-size="9.5" text-anchor="middle">0x22 / PN1</text><rect x="462" y="62" width="104" height="86" rx="8" fill="var(--hb-card)" stroke="var(--hb-stroke)" stroke-width="2"/><rect x="462" y="62" width="104" height="86" rx="8" fill="var(--hb-card2)" stroke="none"/><path d="M 462 70 Q 462 62 470 62 L 558 62 Q 566 62 566 70 L 566 88 L 462 88 Z" fill="var(--hb-stroke)" fill-opacity="0.22"/><line x1="462" y1="88" x2="566" y2="88" stroke="var(--hb-stroke)" stroke-width="1" stroke-opacity="0.5"/><text x="514.0" y="79.0" fill="var(--hb-stroke)" font-size="11" font-weight="800" text-anchor="middle">Byte 4</text><text x="514.0" y="114.0" fill="var(--text)" class="mono-svg" font-size="9.5" text-anchor="middle">User Data #2</text><text x="514.0" y="129.0" fill="var(--text)" class="mono-svg" font-size="9.5" text-anchor="middle">0x33</text><rect x="572" y="62" width="104" height="86" rx="8" fill="var(--hb-card)" stroke="var(--hb-stroke)" stroke-width="2"/><rect x="572" y="62" width="104" height="86" rx="8" fill="var(--hb-card2)" stroke="none"/><path d="M 572 70 Q 572 62 580 62 L 668 62 Q 676 62 676 70 L 676 88 L 572 88 Z" fill="var(--hb-stroke)" fill-opacity="0.22"/><line x1="572" y1="88" x2="676" y2="88" stroke="var(--hb-stroke)" stroke-width="1" stroke-opacity="0.5"/><text x="624.0" y="79.0" fill="var(--hb-stroke)" font-size="11" font-weight="800" text-anchor="middle">Byte 5</text><text x="624.0" y="114.0" fill="var(--text)" class="mono-svg" font-size="9.5" text-anchor="middle">User Data #3</text><text x="624.0" y="129.0" fill="var(--text)" class="mono-svg" font-size="9.5" text-anchor="middle">0x44</text><rect x="682" y="62" width="104" height="86" rx="8" fill="var(--hb-card)" stroke="var(--hb-stroke)" stroke-width="2"/><rect x="682" y="62" width="104" height="86" rx="8" fill="var(--hb-card2)" stroke="none"/><path d="M 682 70 Q 682 62 690 62 L 778 62 Q 786 62 786 70 L 786 88 L 682 88 Z" fill="var(--hb-stroke)" fill-opacity="0.22"/><line x1="682" y1="88" x2="786" y2="88" stroke="var(--hb-stroke)" stroke-width="1" stroke-opacity="0.5"/><text x="734.0" y="79.0" fill="var(--hb-stroke)" font-size="11" font-weight="800" text-anchor="middle">Byte 6</text><text x="734.0" y="114.0" fill="var(--text)" class="mono-svg" font-size="9.5" text-anchor="middle">User Data #4</text><text x="734.0" y="129.0" fill="var(--text)" class="mono-svg" font-size="9.5" text-anchor="middle">0x55</text><rect x="792" y="62" width="104" height="86" rx="8" fill="var(--hb-card)" stroke="var(--hb-stroke)" stroke-width="2"/><rect x="792" y="62" width="104" height="86" rx="8" fill="var(--hb-card2)" stroke="none"/><path d="M 792 70 Q 792 62 800 62 L 888 62 Q 896 62 896 70 L 896 88 L 792 88 Z" fill="var(--hb-stroke)" fill-opacity="0.22"/><line x1="792" y1="88" x2="896" y2="88" stroke="var(--hb-stroke)" stroke-width="1" stroke-opacity="0.5"/><text x="844.0" y="79.0" fill="var(--hb-stroke)" font-size="11" font-weight="800" text-anchor="middle">Byte 7</text><text x="844.0" y="114.0" fill="var(--text)" class="mono-svg" font-size="9.5" text-anchor="middle">User Data #5</text><text x="844.0" y="129.0" fill="var(--text)" class="mono-svg" font-size="9.5" text-anchor="middle">0x66</text><rect x="22.0" y="161.0" width="214" height="26" rx="13.0" fill="var(--hb-card)" stroke="none"/><rect x="22.0" y="161.0" width="214" height="26" rx="13.0" fill="var(--hb-sky-bg)" stroke="var(--hb-sky)" stroke-width="1.5"/><text x="129.0" y="177.8" fill="var(--hb-sky)" font-size="10" font-weight="800" text-anchor="middle">Header Quản Lý Mạng (2 Bytes)</text><rect x="244.0" y="161.0" width="650" height="26" rx="13.0" fill="var(--hb-card)" stroke="none"/><rect x="244.0" y="161.0" width="650" height="26" rx="13.0" fill="var(--hb-vio-bg)" stroke="var(--hb-vio)" stroke-width="1.5"/><text x="569.0" y="177.8" fill="var(--hb-vio)" font-size="10.5" font-weight="800" text-anchor="middle">Khoang Dữ Liệu Ứng Dụng &amp; Partial Networking (User Data / PNC — 6 Bytes)</text></svg>
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
            <svg viewBox="0 0 920 176" class="hb-svg" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Diagram b14"><defs><marker id="b14_arr_sky" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-sky)"/></marker><marker id="b14_arr_ok" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-ok)"/></marker><marker id="b14_arr_warn" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-warn)"/></marker><marker id="b14_arr_err" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-err)"/></marker><marker id="b14_arr_vio" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-vio)"/></marker><marker id="b14_arr_ind" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-ind)"/></marker><marker id="b14_arr_mut" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-stroke)"/></marker></defs><rect x="22" y="20" width="104" height="102" rx="8" fill="var(--hb-card)" stroke="var(--hb-stroke)" stroke-width="2"/><rect x="22" y="20" width="104" height="102" rx="8" fill="var(--hb-card2)" stroke="none"/><path d="M 22 28 Q 22 20 30 20 L 118 20 Q 126 20 126 28 L 126 46 L 22 46 Z" fill="var(--hb-stroke)" fill-opacity="0.22"/><line x1="22" y1="46" x2="126" y2="46" stroke="var(--hb-stroke)" stroke-width="1" stroke-opacity="0.5"/><text x="74.0" y="37.0" fill="var(--hb-stroke)" font-size="11.5" font-weight="800" text-anchor="middle">Bit 7</text><text x="74.0" y="80.0" fill="var(--text)" class="mono-svg" font-size="10" text-anchor="middle">Reserved</text><text x="74.0" y="95.0" fill="var(--text)" class="mono-svg" font-size="10" text-anchor="middle">Res7 (0)</text><rect x="132" y="20" width="104" height="102" rx="8" fill="var(--hb-card)" stroke="var(--hb-vio)" stroke-width="2"/><rect x="132" y="20" width="104" height="102" rx="8" fill="var(--hb-vio-bg)" stroke="none"/><rect x="136" y="24" width="96" height="94" rx="5" fill="none" stroke="var(--hb-vio)" stroke-width="1.2" stroke-opacity="0.8"/><path d="M 132 28 Q 132 20 140 20 L 228 20 Q 236 20 236 28 L 236 46 L 132 46 Z" fill="var(--hb-vio)" fill-opacity="0.22"/><line x1="132" y1="46" x2="236" y2="46" stroke="var(--hb-vio)" stroke-width="1" stroke-opacity="0.5"/><text x="184.0" y="37.0" fill="var(--hb-vio)" font-size="11.5" font-weight="800" text-anchor="middle">Bit 6</text><text x="184.0" y="80.0" fill="var(--text)" class="mono-svg" font-size="10" text-anchor="middle">PnInfoBit</text><text x="184.0" y="95.0" fill="var(--text)" class="mono-svg" font-size="10" text-anchor="middle">PNI (0x40)</text><rect x="242" y="20" width="104" height="102" rx="8" fill="var(--hb-card)" stroke="var(--hb-stroke)" stroke-width="2"/><rect x="242" y="20" width="104" height="102" rx="8" fill="var(--hb-card2)" stroke="none"/><path d="M 242 28 Q 242 20 250 20 L 338 20 Q 346 20 346 28 L 346 46 L 242 46 Z" fill="var(--hb-stroke)" fill-opacity="0.22"/><line x1="242" y1="46" x2="346" y2="46" stroke="var(--hb-stroke)" stroke-width="1" stroke-opacity="0.5"/><text x="294.0" y="37.0" fill="var(--hb-stroke)" font-size="11.5" font-weight="800" text-anchor="middle">Bit 5</text><text x="294.0" y="80.0" fill="var(--text)" class="mono-svg" font-size="10" text-anchor="middle">Reserved</text><text x="294.0" y="95.0" fill="var(--text)" class="mono-svg" font-size="10" text-anchor="middle">Res5 (0)</text><rect x="352" y="20" width="104" height="102" rx="8" fill="var(--hb-card)" stroke="var(--hb-ok)" stroke-width="2"/><rect x="352" y="20" width="104" height="102" rx="8" fill="var(--hb-ok-bg)" stroke="none"/><rect x="356" y="24" width="96" height="94" rx="5" fill="none" stroke="var(--hb-ok)" stroke-width="1.2" stroke-opacity="0.8"/><path d="M 352 28 Q 352 20 360 20 L 448 20 Q 456 20 456 28 L 456 46 L 352 46 Z" fill="var(--hb-ok)" fill-opacity="0.22"/><line x1="352" y1="46" x2="456" y2="46" stroke="var(--hb-ok)" stroke-width="1" stroke-opacity="0.5"/><text x="404.0" y="37.0" fill="var(--hb-ok)" font-size="11.5" font-weight="800" text-anchor="middle">Bit 4</text><text x="404.0" y="80.0" fill="var(--text)" class="mono-svg" font-size="10" text-anchor="middle">ActiveWakeup</text><text x="404.0" y="95.0" fill="var(--text)" class="mono-svg" font-size="10" text-anchor="middle">AWB (0x10)</text><rect x="462" y="20" width="104" height="102" rx="8" fill="var(--hb-card)" stroke="var(--hb-stroke)" stroke-width="2"/><rect x="462" y="20" width="104" height="102" rx="8" fill="var(--hb-card2)" stroke="none"/><path d="M 462 28 Q 462 20 470 20 L 558 20 Q 566 20 566 28 L 566 46 L 462 46 Z" fill="var(--hb-stroke)" fill-opacity="0.22"/><line x1="462" y1="46" x2="566" y2="46" stroke="var(--hb-stroke)" stroke-width="1" stroke-opacity="0.5"/><text x="514.0" y="37.0" fill="var(--hb-stroke)" font-size="11.5" font-weight="800" text-anchor="middle">Bit 3</text><text x="514.0" y="80.0" fill="var(--text)" class="mono-svg" font-size="10" text-anchor="middle">Reserved</text><text x="514.0" y="95.0" fill="var(--text)" class="mono-svg" font-size="10" text-anchor="middle">Res3 (0)</text><rect x="572" y="20" width="104" height="102" rx="8" fill="var(--hb-card)" stroke="var(--hb-stroke)" stroke-width="2"/><rect x="572" y="20" width="104" height="102" rx="8" fill="var(--hb-card2)" stroke="none"/><path d="M 572 28 Q 572 20 580 20 L 668 20 Q 676 20 676 28 L 676 46 L 572 46 Z" fill="var(--hb-stroke)" fill-opacity="0.22"/><line x1="572" y1="46" x2="676" y2="46" stroke="var(--hb-stroke)" stroke-width="1" stroke-opacity="0.5"/><text x="624.0" y="37.0" fill="var(--hb-stroke)" font-size="11.5" font-weight="800" text-anchor="middle">Bit 2</text><text x="624.0" y="80.0" fill="var(--text)" class="mono-svg" font-size="10" text-anchor="middle">Reserved</text><text x="624.0" y="95.0" fill="var(--text)" class="mono-svg" font-size="10" text-anchor="middle">Res2 (0)</text><rect x="682" y="20" width="104" height="102" rx="8" fill="var(--hb-card)" stroke="var(--hb-warn)" stroke-width="2"/><rect x="682" y="20" width="104" height="102" rx="8" fill="var(--hb-warn-bg)" stroke="none"/><rect x="686" y="24" width="96" height="94" rx="5" fill="none" stroke="var(--hb-warn)" stroke-width="1.2" stroke-opacity="0.8"/><path d="M 682 28 Q 682 20 690 20 L 778 20 Q 786 20 786 28 L 786 46 L 682 46 Z" fill="var(--hb-warn)" fill-opacity="0.22"/><line x1="682" y1="46" x2="786" y2="46" stroke="var(--hb-warn)" stroke-width="1" stroke-opacity="0.5"/><text x="734.0" y="37.0" fill="var(--hb-warn)" font-size="11.5" font-weight="800" text-anchor="middle">Bit 1</text><text x="734.0" y="80.0" fill="var(--text)" class="mono-svg" font-size="10" text-anchor="middle">CoordSleep</text><text x="734.0" y="95.0" fill="var(--text)" class="mono-svg" font-size="10" text-anchor="middle">CSR (0x02)</text><rect x="792" y="20" width="104" height="102" rx="8" fill="var(--hb-card)" stroke="var(--hb-sky)" stroke-width="2"/><rect x="792" y="20" width="104" height="102" rx="8" fill="var(--hb-sky-bg)" stroke="none"/><rect x="796" y="24" width="96" height="94" rx="5" fill="none" stroke="var(--hb-sky)" stroke-width="1.2" stroke-opacity="0.8"/><path d="M 792 28 Q 792 20 800 20 L 888 20 Q 896 20 896 28 L 896 46 L 792 46 Z" fill="var(--hb-sky)" fill-opacity="0.22"/><line x1="792" y1="46" x2="896" y2="46" stroke="var(--hb-sky)" stroke-width="1" stroke-opacity="0.5"/><text x="844.0" y="37.0" fill="var(--hb-sky)" font-size="11.5" font-weight="800" text-anchor="middle">Bit 0</text><text x="844.0" y="80.0" fill="var(--text)" class="mono-svg" font-size="10" text-anchor="middle">RepeatMsgReq</text><text x="844.0" y="95.0" fill="var(--text)" class="mono-svg" font-size="10" text-anchor="middle">RMR (0x01)</text><rect x="200.0" y="135.0" width="520" height="26" rx="13.0" fill="var(--hb-card)" stroke="none"/><rect x="200.0" y="135.0" width="520" height="26" rx="13.0" fill="var(--hb-warn-bg)" stroke="var(--hb-warn)" stroke-width="1.5"/><text x="460" y="151.8" fill="var(--hb-warn)" font-size="10.2" font-weight="800" text-anchor="middle">MSB (Bit 7) ◄────────── Control Bit Vector (1 Byte = 8 Bits) ──────────► LSB (Bit 0)</text></svg>
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
            <svg viewBox="0 0 920 220" class="hb-svg" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Diagram b15"><defs><marker id="b15_arr_sky" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-sky)"/></marker><marker id="b15_arr_ok" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-ok)"/></marker><marker id="b15_arr_warn" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-warn)"/></marker><marker id="b15_arr_err" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-err)"/></marker><marker id="b15_arr_vio" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-vio)"/></marker><marker id="b15_arr_ind" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-ind)"/></marker><marker id="b15_arr_mut" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-stroke)"/></marker></defs><rect x="14" y="18" width="186" height="50" rx="8" fill="var(--hb-card)" stroke="var(--hb-sky)" stroke-width="2"/><rect x="14" y="18" width="186" height="50" rx="8" fill="var(--hb-sky-bg)" stroke="none"/><path d="M 14 26 Q 14 18 22 18 L 192 18 Q 200 18 200 26 L 200 40 L 14 40 Z" fill="var(--hb-sky)" fill-opacity="0.22"/><line x1="14" y1="40" x2="200" y2="40" stroke="var(--hb-sky)" stroke-width="1" stroke-opacity="0.5"/><text x="107.0" y="33.0" fill="var(--hb-sky)" font-size="11" font-weight="800" text-anchor="middle">LAYOUT A</text><text x="107.0" y="57.5" fill="var(--text)" font-size="10.5" text-anchor="middle">AUTOSAR Chuẩn</text><rect x="212" y="21" width="128" height="44" rx="8" fill="var(--hb-card)" stroke="var(--hb-sky)" stroke-width="2"/><rect x="212" y="21" width="128" height="44" rx="8" fill="var(--hb-sky-bg)" stroke="none"/><text x="276.0" y="47.0" fill="var(--text)" font-size="10.2" font-weight="800" text-anchor="middle">Byte 0: SNI (NodeID)</text><rect x="350" y="21" width="128" height="44" rx="8" fill="var(--hb-card)" stroke="var(--hb-warn)" stroke-width="2"/><rect x="350" y="21" width="128" height="44" rx="8" fill="var(--hb-warn-bg)" stroke="none"/><text x="414.0" y="47.0" fill="var(--text)" font-size="10.2" font-weight="800" text-anchor="middle">Byte 1: CBV</text><rect x="488" y="21" width="414" height="44" rx="8" fill="var(--hb-card)" stroke="var(--hb-ok)" stroke-width="2"/><rect x="488" y="21" width="414" height="44" rx="8" fill="var(--hb-ok-bg)" stroke="none"/><text x="695.0" y="47.0" fill="var(--text)" font-size="10.2" font-weight="800" text-anchor="middle">Bytes 2..7: User Data (6 Bytes)</text><rect x="14" y="86" width="186" height="50" rx="8" fill="var(--hb-card)" stroke="var(--hb-vio)" stroke-width="2"/><rect x="14" y="86" width="186" height="50" rx="8" fill="var(--hb-vio-bg)" stroke="none"/><path d="M 14 94 Q 14 86 22 86 L 192 86 Q 200 86 200 94 L 200 108 L 14 108 Z" fill="var(--hb-vio)" fill-opacity="0.22"/><line x1="14" y1="108" x2="200" y2="108" stroke="var(--hb-vio)" stroke-width="1" stroke-opacity="0.5"/><text x="107.0" y="101.0" fill="var(--hb-vio)" font-size="11" font-weight="800" text-anchor="middle">LAYOUT B</text><text x="107.0" y="125.5" fill="var(--text)" font-size="10.5" text-anchor="middle">OEM Variant</text><rect x="212" y="89" width="128" height="44" rx="8" fill="var(--hb-card)" stroke="var(--hb-warn)" stroke-width="2"/><rect x="212" y="89" width="128" height="44" rx="8" fill="var(--hb-warn-bg)" stroke="none"/><text x="276.0" y="115.0" fill="var(--text)" font-size="10.2" font-weight="800" text-anchor="middle">Byte 0: CBV</text><rect x="350" y="89" width="128" height="44" rx="8" fill="var(--hb-card)" stroke="var(--hb-sky)" stroke-width="2"/><rect x="350" y="89" width="128" height="44" rx="8" fill="var(--hb-sky-bg)" stroke="none"/><text x="414.0" y="115.0" fill="var(--text)" font-size="10.2" font-weight="800" text-anchor="middle">Byte 1: SNI (NodeID)</text><rect x="488" y="89" width="414" height="44" rx="8" fill="var(--hb-card)" stroke="var(--hb-ok)" stroke-width="2"/><rect x="488" y="89" width="414" height="44" rx="8" fill="var(--hb-ok-bg)" stroke="none"/><text x="695.0" y="115.0" fill="var(--text)" font-size="10.2" font-weight="800" text-anchor="middle">Bytes 2..7: User Data (6 Bytes)</text><rect x="14" y="154" width="186" height="50" rx="8" fill="var(--hb-card)" stroke="var(--hb-ok)" stroke-width="2"/><rect x="14" y="154" width="186" height="50" rx="8" fill="var(--hb-ok-bg)" stroke="none"/><path d="M 14 162 Q 14 154 22 154 L 192 154 Q 200 154 200 162 L 200 176 L 14 176 Z" fill="var(--hb-ok)" fill-opacity="0.22"/><line x1="14" y1="176" x2="200" y2="176" stroke="var(--hb-ok)" stroke-width="1" stroke-opacity="0.5"/><text x="107.0" y="169.0" fill="var(--hb-ok)" font-size="11" font-weight="800" text-anchor="middle">LAYOUT C</text><text x="107.0" y="193.5" fill="var(--text)" font-size="10.5" text-anchor="middle">Full Payload (OFF NID)</text><rect x="212" y="157" width="128" height="44" rx="8" fill="var(--hb-card)" stroke="var(--hb-stroke)" stroke-width="2"/><rect x="212" y="157" width="128" height="44" rx="8" fill="var(--hb-card2)" stroke="none"/><text x="276.0" y="183.0" fill="var(--text)" font-size="10.2" font-weight="800" text-anchor="middle">OFF: Không NID</text><rect x="350" y="157" width="128" height="44" rx="8" fill="var(--hb-card)" stroke="var(--hb-warn)" stroke-width="2"/><rect x="350" y="157" width="128" height="44" rx="8" fill="var(--hb-warn-bg)" stroke="none"/><text x="414.0" y="183.0" fill="var(--text)" font-size="10.2" font-weight="800" text-anchor="middle">Byte 0: CBV</text><rect x="488" y="157" width="414" height="44" rx="8" fill="var(--hb-card)" stroke="var(--hb-ok)" stroke-width="2"/><rect x="488" y="157" width="414" height="44" rx="8" fill="var(--hb-ok-bg)" stroke="none"/><rect x="492" y="161" width="406" height="36" rx="5" fill="none" stroke="var(--hb-ok)" stroke-width="1.2" stroke-opacity="0.8"/><text x="695.0" y="183.0" fill="var(--text)" font-size="10.2" font-weight="800" text-anchor="middle">Bytes 1..7: User Data (7 Bytes!)</text></svg>
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
            <svg viewBox="0 0 920 220" class="hb-svg" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Diagram b16"><defs><marker id="b16_arr_sky" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-sky)"/></marker><marker id="b16_arr_ok" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-ok)"/></marker><marker id="b16_arr_warn" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-warn)"/></marker><marker id="b16_arr_err" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-err)"/></marker><marker id="b16_arr_vio" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-vio)"/></marker><marker id="b16_arr_ind" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-ind)"/></marker><marker id="b16_arr_mut" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-stroke)"/></marker></defs><rect x="16" y="72" width="200" height="68" rx="8" fill="var(--hb-card)" stroke="var(--hb-ind)" stroke-width="2"/><rect x="16" y="72" width="200" height="68" rx="8" fill="var(--hb-ind-bg)" stroke="none"/><path d="M 16 80 Q 16 72 24 72 L 208 72 Q 216 72 216 80 L 216 95 L 16 95 Z" fill="var(--hb-ind)" fill-opacity="0.22"/><line x1="16" y1="95" x2="216" y2="95" stroke="var(--hb-ind)" stroke-width="1" stroke-opacity="0.5"/><text x="116.0" y="87.5" fill="var(--hb-ind)" font-size="11.5" font-weight="800" text-anchor="middle">COM Module</text><text x="116.0" y="113.5" fill="var(--text)" font-size="10.5" text-anchor="middle">Signal Transmission:</text><text x="116.0" y="128.5" fill="var(--text)" font-size="10.5" text-anchor="middle">Odo, Speed, Engine Status</text><line x1="216" y1="106" x2="268" y2="106" stroke="var(--hb-ind)" stroke-width="2.2" marker-end="url(#b16_arr_ind)"/><rect x="268" y="72" width="165" height="68" rx="8" fill="var(--hb-card)" stroke="var(--hb-warn)" stroke-width="2"/><rect x="268" y="72" width="165" height="68" rx="8" fill="var(--hb-warn-bg)" stroke="none"/><path d="M 268 80 Q 268 72 276 72 L 425 72 Q 433 72 433 80 L 433 95 L 268 95 Z" fill="var(--hb-warn)" fill-opacity="0.22"/><line x1="268" y1="95" x2="433" y2="95" stroke="var(--hb-warn)" stroke-width="1" stroke-opacity="0.5"/><text x="350.5" y="87.5" fill="var(--hb-warn)" font-size="11.5" font-weight="800" text-anchor="middle">PduR Router</text><text x="350.5" y="113.5" fill="var(--text)" font-size="10.5" text-anchor="middle">Định tuyến I-PDU</text><text x="350.5" y="128.5" fill="var(--text)" font-size="10.5" text-anchor="middle">theo TxPduId</text><path d="M 433 106 L 465 106 L 465 52 L 502 52" fill="none" stroke="var(--hb-ok)" stroke-width="2.2" stroke-linejoin="round" marker-end="url(#b16_arr_ok)"/><rect x="416.0" y="14.0" width="168" height="20" rx="5" fill="var(--hb-bg)" stroke="var(--hb-ok)" stroke-width="1" stroke-opacity="0.7"/><text x="500" y="27.5" fill="var(--hb-ok)" font-size="10" font-weight="700" text-anchor="middle">Đường 1: COM I-PDU thường</text><rect x="502" y="28" width="178" height="48" rx="8" fill="var(--hb-card)" stroke="var(--hb-ok)" stroke-width="2"/><rect x="502" y="28" width="178" height="48" rx="8" fill="var(--hb-ok-bg)" stroke="none"/><text x="591.0" y="48.5" fill="var(--hb-ok)" font-size="11" font-weight="800" text-anchor="middle">CanIf_Transmit()</text><text x="591.0" y="63.5" fill="var(--muted)" font-size="10.5" text-anchor="middle">Gửi trực tiếp CanIf</text><line x1="680" y1="52" x2="718" y2="52" stroke="var(--hb-ok)" stroke-width="2.2" marker-end="url(#b16_arr_ok)"/><rect x="718" y="28" width="186" height="48" rx="8" fill="var(--hb-card)" stroke="var(--hb-ok)" stroke-width="2"/><rect x="718" y="28" width="186" height="48" rx="8" fill="var(--hb-ok-bg)" stroke="none"/><path d="M 718 36 Q 718 28 726 28 L 896 28 Q 904 28 904 36 L 904 50 L 718 50 Z" fill="var(--hb-ok)" fill-opacity="0.22"/><line x1="718" y1="50" x2="904" y2="50" stroke="var(--hb-ok)" stroke-width="1" stroke-opacity="0.5"/><text x="811.0" y="43.0" fill="var(--hb-ok)" font-size="11" font-weight="800" text-anchor="middle">Khung CAN Data</text><text x="811.0" y="66.5" fill="var(--text)" font-size="10.5" text-anchor="middle">Dữ liệu ứng dụng thường</text><path d="M 433 106 L 465 106 L 465 162 L 502 162" fill="none" stroke="var(--hb-sky)" stroke-width="2.2" stroke-linejoin="round" marker-end="url(#b16_arr_sky)"/><rect x="422.0" y="186.0" width="156" height="20" rx="5" fill="var(--hb-bg)" stroke="var(--hb-sky)" stroke-width="1" stroke-opacity="0.7"/><text x="500" y="199.5" fill="var(--hb-sky)" font-size="10" font-weight="700" text-anchor="middle">Đường 2: NM User Data</text><rect x="502" y="136" width="178" height="52" rx="8" fill="var(--hb-card)" stroke="var(--hb-sky)" stroke-width="2"/><rect x="502" y="136" width="178" height="52" rx="8" fill="var(--hb-sky-bg)" stroke="none"/><text x="591.0" y="158.5" fill="var(--hb-sky)" font-size="10.5" font-weight="800" text-anchor="middle">CanNm_TriggerTransmit</text><text x="591.0" y="173.5" fill="var(--muted)" font-size="10.5" text-anchor="middle">/ CanNm_SetUserData()</text><line x1="680" y1="162" x2="718" y2="162" stroke="var(--hb-sky)" stroke-width="2.2" marker-end="url(#b16_arr_sky)"/><rect x="718" y="136" width="186" height="52" rx="8" fill="var(--hb-card)" stroke="var(--hb-sky)" stroke-width="2"/><rect x="718" y="136" width="186" height="52" rx="8" fill="var(--hb-sky-bg)" stroke="none"/><rect x="722" y="140" width="178" height="44" rx="5" fill="none" stroke="var(--hb-sky)" stroke-width="1.2" stroke-opacity="0.8"/><path d="M 718 144 Q 718 136 726 136 L 896 136 Q 904 136 904 144 L 904 158 L 718 158 Z" fill="var(--hb-sky)" fill-opacity="0.22"/><line x1="718" y1="158" x2="904" y2="158" stroke="var(--hb-sky)" stroke-width="1" stroke-opacity="0.5"/><text x="811.0" y="151.0" fill="var(--hb-sky)" font-size="11" font-weight="800" text-anchor="middle">Khung NM PDU</text><text x="811.0" y="176.5" fill="var(--text)" font-size="10.5" text-anchor="middle">Đóng gói vào Bytes 2..7</text></svg>
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
            <img src="assets/figure_7_1_cannm_algorithm.jpg" alt="Figure 7-1: CanNm Algorithm" style="max-width:100%; height:auto; border-radius:6px; box-shadow:0 4px 16px rgba(0,0,0,.4)" onerror="this.onerror=null; this.src='data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'400\' height=\'120\'><rect width=\'400\' height=\'120\' fill=\'%23111827\'/><text x=\'200\' y=\'65\' fill=\'%2338bdf8\' font-size=\'14\' text-anchor=\'middle\'>Figure 7-1: CanNm Algorithm (SWS_CanNm)</text></svg>'">
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
            <svg viewBox="0 0 920 352" class="hb-svg" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Diagram b17"><defs><marker id="b17_arr_sky" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-sky)"/></marker><marker id="b17_arr_ok" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-ok)"/></marker><marker id="b17_arr_warn" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-warn)"/></marker><marker id="b17_arr_err" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-err)"/></marker><marker id="b17_arr_vio" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-vio)"/></marker><marker id="b17_arr_ind" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-ind)"/></marker><marker id="b17_arr_mut" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-stroke)"/></marker></defs><line x1="85" y1="54" x2="85" y2="338" stroke="var(--hb-stroke)" stroke-dasharray="5,4" stroke-width="1.5"/><rect x="13" y="12" width="144" height="42" rx="8" fill="var(--hb-card)" stroke="var(--hb-stroke)" stroke-width="2"/><rect x="13" y="12" width="144" height="42" rx="8" fill="var(--hb-card2)" stroke="none"/><text x="85.0" y="37.0" fill="var(--text)" font-size="11" font-weight="800" text-anchor="middle">CAN Bus</text><line x1="250" y1="54" x2="250" y2="338" stroke="var(--hb-stroke)" stroke-dasharray="5,4" stroke-width="1.5"/><rect x="178" y="12" width="144" height="42" rx="8" fill="var(--hb-card)" stroke="var(--hb-ind)" stroke-width="2"/><rect x="178" y="12" width="144" height="42" rx="8" fill="var(--hb-ind-bg)" stroke="none"/><text x="250.0" y="37.0" fill="var(--text)" font-size="11" font-weight="800" text-anchor="middle">CanIf</text><line x1="455" y1="54" x2="455" y2="338" stroke="var(--hb-stroke)" stroke-dasharray="5,4" stroke-width="1.5"/><rect x="383" y="12" width="144" height="42" rx="8" fill="var(--hb-card)" stroke="var(--hb-sky)" stroke-width="2"/><rect x="383" y="12" width="144" height="42" rx="8" fill="var(--hb-sky-bg)" stroke="none"/><text x="455.0" y="37.0" fill="var(--text)" font-size="11" font-weight="800" text-anchor="middle">CanNM (Bus-Sleep)</text><line x1="670" y1="54" x2="670" y2="338" stroke="var(--hb-stroke)" stroke-dasharray="5,4" stroke-width="1.5"/><rect x="598" y="12" width="144" height="42" rx="8" fill="var(--hb-card)" stroke="var(--hb-vio)" stroke-width="2"/><rect x="598" y="12" width="144" height="42" rx="8" fill="var(--hb-vio-bg)" stroke="none"/><text x="670.0" y="37.0" fill="var(--text)" font-size="11" font-weight="800" text-anchor="middle">Nm / ComM</text><line x1="845" y1="54" x2="845" y2="338" stroke="var(--hb-stroke)" stroke-dasharray="5,4" stroke-width="1.5"/><rect x="773" y="12" width="144" height="42" rx="8" fill="var(--hb-card)" stroke="var(--hb-ok)" stroke-width="2"/><rect x="773" y="12" width="144" height="42" rx="8" fill="var(--hb-ok-bg)" stroke="none"/><text x="845.0" y="37.0" fill="var(--text)" font-size="11" font-weight="800" text-anchor="middle">CanSM</text><line x1="85" y1="78" x2="250" y2="78" stroke="var(--hb-ind)" stroke-width="2" marker-end="url(#b17_arr_ind)"/><rect x="108.0" y="60.0" width="118" height="20" rx="5" fill="var(--hb-bg)" stroke="var(--hb-ind)" stroke-width="1" stroke-opacity="0.7"/><text x="167" y="73.5" fill="var(--hb-ind)" font-size="10" font-weight="700" text-anchor="middle">1. Khung NM PDU</text><line x1="250" y1="110" x2="455" y2="110" stroke="var(--hb-sky)" stroke-width="2" marker-end="url(#b17_arr_sky)"/><rect x="278.0" y="92.0" width="148" height="20" rx="5" fill="var(--hb-bg)" stroke="var(--hb-sky)" stroke-width="1" stroke-opacity="0.7"/><text x="352" y="105.5" fill="var(--hb-sky)" font-size="10" font-weight="700" text-anchor="middle">2. CanNm_RxIndication()</text><rect x="350.0" y="132.0" width="210" height="24" rx="12.0" fill="var(--hb-card)" stroke="none"/><rect x="350.0" y="132.0" width="210" height="24" rx="12.0" fill="var(--hb-err-bg)" stroke="var(--hb-err)" stroke-width="1.5"/><text x="455" y="147.8" fill="var(--hb-err)" font-size="9.8" font-weight="800" text-anchor="middle">3. Báo lỗi DET: CANNM_E_NET_START_IND</text><line x1="455" y1="178" x2="670" y2="178" stroke="var(--hb-vio)" stroke-width="2" marker-end="url(#b17_arr_vio)"/><rect x="475.0" y="160.0" width="174" height="20" rx="5" fill="var(--hb-bg)" stroke="var(--hb-vio)" stroke-width="1" stroke-opacity="0.7"/><text x="562" y="173.5" fill="var(--hb-vio)" font-size="10" font-weight="700" text-anchor="middle">4. Nm_NetworkStartIndication()</text><path d="M 455 202 L 517 202 L 517 234 L 459 234" fill="none" stroke="var(--hb-warn)" stroke-width="2.2" stroke-linejoin="round" marker-end="url(#b17_arr_warn)"/><rect x="265.0" y="205.0" width="224" height="26" rx="13.0" fill="var(--hb-card)" stroke="none"/><rect x="265.0" y="205.0" width="224" height="26" rx="13.0" fill="var(--hb-warn-bg)" stroke="var(--hb-warn)" stroke-width="1.5"/><text x="377" y="221.8" fill="var(--hb-warn)" font-size="10" font-weight="800" text-anchor="middle">5. [QUAY VÒNG] Vẫn giữ Bus-Sleep Mode!</text><line x1="670" y1="256" x2="845" y2="256" stroke="var(--hb-ok)" stroke-width="2" marker-end="url(#b17_arr_ok)"/><rect x="691.0" y="238.0" width="132" height="20" rx="5" fill="var(--hb-bg)" stroke="var(--hb-ok)" stroke-width="1" stroke-opacity="0.7"/><text x="757" y="251.5" fill="var(--hb-ok)" font-size="10" font-weight="700" text-anchor="middle">6. Bật HW Controller</text><line x1="670" y1="288" x2="455" y2="288" stroke="var(--hb-ok)" stroke-width="2.4" marker-end="url(#b17_arr_ok)"/><rect x="452.0" y="270.0" width="220" height="20" rx="5" fill="var(--hb-bg)" stroke="var(--hb-ok)" stroke-width="1" stroke-opacity="0.7"/><text x="562" y="283.5" fill="var(--hb-ok)" font-size="10" font-weight="700" text-anchor="middle">7. Nm_PassiveStartUp() (Lệnh chính thức)</text><rect x="340" y="306" width="230" height="34" rx="8" fill="var(--hb-card)" stroke="var(--hb-ok)" stroke-width="2"/><rect x="340" y="306" width="230" height="34" rx="8" fill="var(--hb-ok-bg)" stroke="none"/><rect x="344" y="310" width="222" height="26" rx="5" fill="none" stroke="var(--hb-ok)" stroke-width="1.2" stroke-opacity="0.8"/><text x="455.0" y="327.0" fill="var(--text)" font-size="10.5" font-weight="800" text-anchor="middle">8. [ĐÍCH ĐẾN] REPEAT_MESSAGE State!</text></svg>
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
            <svg viewBox="0 0 920 290" class="hb-svg" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Diagram b18"><defs><marker id="b18_arr_sky" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-sky)"/></marker><marker id="b18_arr_ok" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-ok)"/></marker><marker id="b18_arr_warn" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-warn)"/></marker><marker id="b18_arr_err" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-err)"/></marker><marker id="b18_arr_vio" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-vio)"/></marker><marker id="b18_arr_ind" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-ind)"/></marker><marker id="b18_arr_mut" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-stroke)"/></marker></defs><rect x="16" y="18" width="888" height="150" rx="10" fill="var(--hb-card2)" fill-opacity="0.35" stroke="var(--hb-sky)" stroke-width="1.5"/><rect x="28" y="7" width="360" height="22" rx="11" fill="var(--hb-bg)" stroke="var(--hb-sky)" stroke-width="1.4"/><text x="208.0" y="22" fill="var(--hb-sky)" font-size="10.5" font-weight="800" text-anchor="middle">NM_MODE_NETWORK (4 Bộ Định Thời Hoạt Động Song Song)</text><rect x="36" y="40" width="416" height="52" rx="8" fill="var(--hb-card)" stroke="var(--hb-sky)" stroke-width="2"/><rect x="36" y="40" width="416" height="52" rx="8" fill="var(--hb-sky-bg)" stroke="none"/><path d="M 36 48 Q 36 40 44 40 L 444 40 Q 452 40 452 48 L 452 62 L 36 62 Z" fill="var(--hb-sky)" fill-opacity="0.22"/><line x1="36" y1="62" x2="452" y2="62" stroke="var(--hb-sky)" stroke-width="1" stroke-opacity="0.5"/><text x="244.0" y="55.0" fill="var(--hb-sky)" font-size="11" font-weight="800" text-anchor="middle">1. CanNmTimeoutTime (2000ms)</text><text x="244.0" y="80.5" fill="var(--text)" font-size="10" text-anchor="middle">Đồng hồ sinh tử toàn mạng (Reload khi Tx/Rx)</text><rect x="468" y="40" width="416" height="52" rx="8" fill="var(--hb-card)" stroke="var(--hb-ind)" stroke-width="2"/><rect x="468" y="40" width="416" height="52" rx="8" fill="var(--hb-ind-bg)" stroke="none"/><path d="M 468 48 Q 468 40 476 40 L 876 40 Q 884 40 884 48 L 884 62 L 468 62 Z" fill="var(--hb-ind)" fill-opacity="0.22"/><line x1="468" y1="62" x2="884" y2="62" stroke="var(--hb-ind)" stroke-width="1" stroke-opacity="0.5"/><text x="676.0" y="55.0" fill="var(--hb-ind)" font-size="11" font-weight="800" text-anchor="middle">2. CanNmRepeatMessageTime (1500ms)</text><text x="676.0" y="80.5" fill="var(--text)" font-size="10" text-anchor="middle">Cửa sổ đóng băng bắt buộc tại Repeat Message</text><rect x="36" y="102" width="416" height="52" rx="8" fill="var(--hb-card)" stroke="var(--hb-ok)" stroke-width="2"/><rect x="36" y="102" width="416" height="52" rx="8" fill="var(--hb-ok-bg)" stroke="none"/><path d="M 36 110 Q 36 102 44 102 L 444 102 Q 452 102 452 110 L 452 124 L 36 124 Z" fill="var(--hb-ok)" fill-opacity="0.22"/><line x1="36" y1="124" x2="452" y2="124" stroke="var(--hb-ok)" stroke-width="1" stroke-opacity="0.5"/><text x="244.0" y="117.0" fill="var(--hb-ok)" font-size="11" font-weight="800" text-anchor="middle">3. CanNmMsgCycleTime (1000ms)</text><text x="244.0" y="142.5" fill="var(--text)" font-size="10" text-anchor="middle">Chu kỳ phát bản tin NM định kỳ</text><rect x="468" y="102" width="416" height="52" rx="8" fill="var(--hb-card)" stroke="var(--hb-err)" stroke-width="2"/><rect x="468" y="102" width="416" height="52" rx="8" fill="var(--hb-err-bg)" stroke="none"/><path d="M 468 110 Q 468 102 476 102 L 876 102 Q 884 102 884 110 L 884 124 L 468 124 Z" fill="var(--hb-err)" fill-opacity="0.22"/><line x1="468" y1="124" x2="884" y2="124" stroke="var(--hb-err)" stroke-width="1" stroke-opacity="0.5"/><text x="676.0" y="117.0" fill="var(--hb-err)" font-size="11" font-weight="800" text-anchor="middle">4. CanNmMsgTimeoutTime (500ms)</text><text x="676.0" y="142.5" fill="var(--text)" font-size="10" text-anchor="middle">Giám sát lỗi nghẽn TxConfirmation phần cứng</text><line x1="460" y1="168" x2="460" y2="206" stroke="var(--hb-warn)" stroke-width="2.4" marker-end="url(#b18_arr_warn)"/><rect x="474.0" y="177.0" width="148" height="20" rx="5" fill="var(--hb-bg)" stroke="var(--hb-warn)" stroke-width="1" stroke-opacity="0.7"/><text x="548" y="190.5" fill="var(--hb-warn)" font-size="10" font-weight="700" text-anchor="middle">TimeoutTime chạm 0ms</text><rect x="16" y="206" width="888" height="72" rx="10" fill="var(--hb-card2)" fill-opacity="0.35" stroke="var(--hb-warn)" stroke-width="1.5"/><rect x="28" y="195" width="165" height="22" rx="11" fill="var(--hb-bg)" stroke="var(--hb-warn)" stroke-width="1.4"/><text x="110.5" y="210" fill="var(--hb-warn)" font-size="10.5" font-weight="800" text-anchor="middle">PREPARE BUS-SLEEP MODE</text><rect x="120" y="224" width="680" height="44" rx="8" fill="var(--hb-card)" stroke="var(--hb-warn)" stroke-width="2"/><rect x="120" y="224" width="680" height="44" rx="8" fill="var(--hb-warn-bg)" stroke="none"/><path d="M 120 232 Q 120 224 128 224 L 792 224 Q 800 224 800 232 L 800 246 L 120 246 Z" fill="var(--hb-warn)" fill-opacity="0.22"/><line x1="120" y1="246" x2="800" y2="246" stroke="var(--hb-warn)" stroke-width="1" stroke-opacity="0.5"/><text x="460.0" y="239.0" fill="var(--hb-warn)" font-size="11.5" font-weight="800" text-anchor="middle">5. CanNmWaitBusSleepTime (1500ms)</text><text x="460.0" y="260.5" fill="var(--text)" font-size="10" text-anchor="middle">Bộ đếm thời gian đệm trước khi ra lệnh CanSM tắt hoàn toàn Controller &amp; Transceiver</text></svg>
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
            <svg viewBox="0 0 920 196" class="hb-svg" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Diagram b19"><defs><marker id="b19_arr_sky" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-sky)"/></marker><marker id="b19_arr_ok" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-ok)"/></marker><marker id="b19_arr_warn" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-warn)"/></marker><marker id="b19_arr_err" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-err)"/></marker><marker id="b19_arr_vio" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-vio)"/></marker><marker id="b19_arr_ind" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-ind)"/></marker><marker id="b19_arr_mut" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-stroke)"/></marker></defs><rect x="20.0" y="14.0" width="80" height="24" rx="12.0" fill="var(--hb-card)" stroke="none"/><rect x="20.0" y="14.0" width="80" height="24" rx="12.0" fill="var(--hb-sky-bg)" stroke="var(--hb-sky)" stroke-width="1.5"/><text x="60" y="29.8" fill="var(--hb-sky)" font-size="9.8" font-weight="800" text-anchor="middle">0 ms</text><line x1="60" y1="38" x2="60" y2="70" stroke="var(--hb-sky)" stroke-width="2"/><rect x="387.0" y="14.0" width="146" height="24" rx="12.0" fill="var(--hb-card)" stroke="none"/><rect x="387.0" y="14.0" width="146" height="24" rx="12.0" fill="var(--hb-ok-bg)" stroke="var(--hb-ok)" stroke-width="1.5"/><text x="460" y="29.8" fill="var(--hb-ok)" font-size="9.8" font-weight="800" text-anchor="middle">1000 ms (MsgCycleTime)</text><line x1="460" y1="38" x2="460" y2="70" stroke="var(--hb-ok)" stroke-width="2"/><rect x="587.0" y="14.0" width="146" height="24" rx="12.0" fill="var(--hb-card)" stroke="none"/><rect x="587.0" y="14.0" width="146" height="24" rx="12.0" fill="var(--hb-warn-bg)" stroke="var(--hb-warn)" stroke-width="1.5"/><text x="660" y="29.8" fill="var(--hb-warn)" font-size="9.8" font-weight="800" text-anchor="middle">1500 ms</text><line x1="660" y1="38" x2="660" y2="70" stroke="var(--hb-warn)" stroke-width="2"/><rect x="787.0" y="14.0" width="146" height="24" rx="12.0" fill="var(--hb-card)" stroke="none"/><rect x="787.0" y="14.0" width="146" height="24" rx="12.0" fill="var(--hb-err-bg)" stroke="var(--hb-err)" stroke-width="1.5"/><text x="860" y="29.8" fill="var(--hb-err)" font-size="9.8" font-weight="800" text-anchor="middle">2000 ms (TimeoutTime)</text><line x1="860" y1="38" x2="860" y2="70" stroke="var(--hb-err)" stroke-width="2"/><rect x="60" y="70" width="400" height="58" rx="8" fill="var(--hb-card)" stroke="var(--hb-sky)" stroke-width="2"/><rect x="60" y="70" width="400" height="58" rx="8" fill="var(--hb-sky-bg)" stroke="none"/><path d="M 60 78 Q 60 70 68 70 L 452 70 Q 460 70 460 78 L 460 92 L 60 92 Z" fill="var(--hb-sky)" fill-opacity="0.22"/><line x1="60" y1="92" x2="460" y2="92" stroke="var(--hb-sky)" stroke-width="1" stroke-opacity="0.5"/><text x="260.0" y="85.0" fill="var(--hb-sky)" font-size="11" font-weight="800" text-anchor="middle">Khoảng Chu Kỳ Phát (CanNmMsgCycleTime)</text><text x="260.0" y="113.5" fill="var(--text)" font-size="10.5" text-anchor="middle">1000 ms</text><rect x="460" y="70" width="200" height="58" rx="8" fill="var(--hb-card)" stroke="var(--hb-ok)" stroke-width="2"/><rect x="460" y="70" width="200" height="58" rx="8" fill="var(--hb-ok-bg)" stroke="none"/><path d="M 460 78 Q 460 70 468 70 L 652 70 Q 660 70 660 78 L 660 92 L 460 92 Z" fill="var(--hb-ok)" fill-opacity="0.22"/><line x1="460" y1="92" x2="660" y2="92" stroke="var(--hb-ok)" stroke-width="1" stroke-opacity="0.5"/><text x="560.0" y="85.0" fill="var(--hb-ok)" font-size="11" font-weight="800" text-anchor="middle">Khoảng Đệm An Toàn</text><text x="560.0" y="113.5" fill="var(--text)" font-size="9.5" text-anchor="middle">Tx Jitter + Drop Frame (+500ms)</text><rect x="660" y="70" width="200" height="58" rx="8" fill="var(--hb-card)" stroke="var(--hb-err)" stroke-width="2"/><rect x="660" y="70" width="200" height="58" rx="8" fill="var(--hb-err-bg)" stroke="none"/><path d="M 660 78 Q 660 70 668 70 L 852 70 Q 860 70 860 78 L 860 92 L 660 92 Z" fill="var(--hb-err)" fill-opacity="0.22"/><line x1="660" y1="92" x2="860" y2="92" stroke="var(--hb-err)" stroke-width="1" stroke-opacity="0.5"/><text x="760.0" y="85.0" fill="var(--hb-err)" font-size="11" font-weight="800" text-anchor="middle">Vùng Nguy Hiểm Timeout</text><text x="760.0" y="113.5" fill="var(--text)" font-size="9.5" text-anchor="middle">Mất &gt;1 gói vẫn kịp cứu!</text><line x1="60" y1="128" x2="60" y2="152" stroke="var(--hb-sky)" stroke-width="1.8"/><rect x="10.0" y="154.0" width="100" height="24" rx="12.0" fill="var(--hb-card)" stroke="none"/><rect x="10.0" y="154.0" width="100" height="24" rx="12.0" fill="var(--hb-sky-bg)" stroke="var(--hb-sky)" stroke-width="1.5"/><text x="60" y="169.8" fill="var(--hb-sky)" font-size="10" font-weight="800" text-anchor="middle">Phát Tx #1</text><line x1="460" y1="128" x2="460" y2="152" stroke="var(--hb-ok)" stroke-width="1.8"/><rect x="384.0" y="154.0" width="152" height="24" rx="12.0" fill="var(--hb-card)" stroke="none"/><rect x="384.0" y="154.0" width="152" height="24" rx="12.0" fill="var(--hb-ok-bg)" stroke="var(--hb-ok)" stroke-width="1.5"/><text x="460" y="169.8" fill="var(--hb-ok)" font-size="10" font-weight="800" text-anchor="middle">Hạn phát Tx #2</text><line x1="660" y1="128" x2="660" y2="152" stroke="var(--hb-warn)" stroke-width="1.8"/><rect x="584.0" y="154.0" width="152" height="24" rx="12.0" fill="var(--hb-card)" stroke="none"/><rect x="584.0" y="154.0" width="152" height="24" rx="12.0" fill="var(--hb-warn-bg)" stroke="var(--hb-warn)" stroke-width="1.5"/><text x="660" y="169.8" fill="var(--hb-warn)" font-size="10" font-weight="800" text-anchor="middle">Đệm +500 ms</text><line x1="860" y1="128" x2="860" y2="152" stroke="var(--hb-err)" stroke-width="1.8"/><rect x="784.0" y="154.0" width="152" height="24" rx="12.0" fill="var(--hb-card)" stroke="none"/><rect x="784.0" y="154.0" width="152" height="24" rx="12.0" fill="var(--hb-err-bg)" stroke="var(--hb-err)" stroke-width="1.5"/><text x="860" y="169.8" fill="var(--hb-err)" font-size="10" font-weight="800" text-anchor="middle">Hạn chót sập mạng!</text></svg>
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
            <svg viewBox="0 0 920 244" class="hb-svg" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Diagram b20"><defs><marker id="b20_arr_sky" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-sky)"/></marker><marker id="b20_arr_ok" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-ok)"/></marker><marker id="b20_arr_warn" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-warn)"/></marker><marker id="b20_arr_err" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-err)"/></marker><marker id="b20_arr_vio" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-vio)"/></marker><marker id="b20_arr_ind" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-ind)"/></marker><marker id="b20_arr_mut" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-stroke)"/></marker></defs><rect x="16" y="94" width="156" height="56" rx="8" fill="var(--hb-card)" stroke="var(--hb-ind)" stroke-width="2"/><rect x="16" y="94" width="156" height="56" rx="8" fill="var(--hb-ind-bg)" stroke="none"/><path d="M 16 102 Q 16 94 24 94 L 164 94 Q 172 94 172 102 L 172 116 L 16 116 Z" fill="var(--hb-ind)" fill-opacity="0.22"/><line x1="16" y1="116" x2="172" y2="116" stroke="var(--hb-ind)" stroke-width="1" stroke-opacity="0.5"/><text x="94.0" y="109.0" fill="var(--hb-ind)" font-size="11" font-weight="800" text-anchor="middle">Active Wakeup</text><text x="94.0" y="136.5" fill="var(--text)" font-size="10.5" text-anchor="middle">Event kích hoạt</text><line x1="172" y1="122" x2="212" y2="122" stroke="var(--hb-sky)" stroke-width="2" marker-end="url(#b20_arr_sky)"/><polygon points="304,72 396,122 304,172 212,122" fill="var(--hb-card)" stroke="var(--hb-warn)" stroke-width="2"/><polygon points="304,72 396,122 304,172 212,122" fill="var(--hb-warn-bg)" stroke="none"/><text x="304" y="119.0" fill="var(--hb-warn)" font-size="10" font-weight="800" text-anchor="middle">CanNmImmediate</text><text x="304" y="133.0" fill="var(--hb-warn)" font-size="10" font-weight="800" text-anchor="middle">NmTransmissions &gt; 0?</text><path d="M 304 72 L 304 42 L 424 42" fill="none" stroke="var(--hb-ok)" stroke-width="2.2" stroke-linejoin="round" marker-end="url(#b20_arr_ok)"/><rect x="325.0" y="32.0" width="78" height="20" rx="5" fill="var(--hb-bg)" stroke="var(--hb-ok)" stroke-width="1" stroke-opacity="0.7"/><text x="364" y="45.5" fill="var(--hb-ok)" font-size="10" font-weight="700" text-anchor="middle">CÓ (TRUE)</text><rect x="424" y="16" width="236" height="52" rx="8" fill="var(--hb-card)" stroke="var(--hb-ok)" stroke-width="2"/><rect x="424" y="16" width="236" height="52" rx="8" fill="var(--hb-ok-bg)" stroke="none"/><path d="M 424 24 Q 424 16 432 16 L 652 16 Q 660 16 660 24 L 660 38 L 424 38 Z" fill="var(--hb-ok)" fill-opacity="0.22"/><line x1="424" y1="38" x2="660" y2="38" stroke="var(--hb-ok)" stroke-width="1" stroke-opacity="0.5"/><text x="542.0" y="31.0" fill="var(--hb-ok)" font-size="10.8" font-weight="800" text-anchor="middle">Bắn ngay Tx #1 @ t = 0 ms</text><text x="542.0" y="56.5" fill="var(--text)" font-size="9.5" text-anchor="middle">Chu kỳ = ImmediateNmCycle (20ms)</text><line x1="660" y1="42" x2="704" y2="42" stroke="var(--hb-ok)" stroke-width="2" marker-end="url(#b20_arr_ok)"/><rect x="704" y="16" width="196" height="52" rx="8" fill="var(--hb-card)" stroke="var(--hb-ok)" stroke-width="2"/><rect x="704" y="16" width="196" height="52" rx="8" fill="var(--hb-ok-bg)" stroke="none"/><text x="802.0" y="38.5" fill="var(--hb-ok)" font-size="10.8" font-weight="800" text-anchor="middle">Bắn hết N gói Burst</text><text x="802.0" y="53.5" fill="var(--muted)" font-size="9.5" text-anchor="middle">Đánh thức tức thì toàn bus</text><path d="M 304 172 L 304 202 L 424 202" fill="none" stroke="var(--hb-err)" stroke-width="2.2" stroke-linejoin="round" marker-end="url(#b20_arr_err)"/><rect x="317.0" y="192.0" width="94" height="20" rx="5" fill="var(--hb-bg)" stroke="var(--hb-err)" stroke-width="1" stroke-opacity="0.7"/><text x="364" y="205.5" fill="var(--hb-err)" font-size="10" font-weight="700" text-anchor="middle">KHÔNG (FALSE)</text><rect x="424" y="176" width="260" height="52" rx="8" fill="var(--hb-card)" stroke="var(--hb-err)" stroke-width="2"/><rect x="424" y="176" width="260" height="52" rx="8" fill="var(--hb-err-bg)" stroke="none"/><path d="M 424 184 Q 424 176 432 176 L 676 176 Q 684 176 684 184 L 684 198 L 424 198 Z" fill="var(--hb-err)" fill-opacity="0.22"/><line x1="424" y1="198" x2="684" y2="198" stroke="var(--hb-err)" stroke-width="1" stroke-opacity="0.5"/><text x="554.0" y="191.0" fill="var(--hb-err)" font-size="10.8" font-weight="800" text-anchor="middle">Đợi CanNmMsgCycleOffset (100ms)</text><text x="554.0" y="216.5" fill="var(--text)" font-size="9.5" text-anchor="middle">Rồi mới phát Tx #1 định kỳ</text><path d="M 802 68 L 802 96" fill="none" stroke="var(--hb-sky)" stroke-width="2" stroke-linejoin="round" marker-end="url(#b20_arr_sky)"/><path d="M 684 202 L 802 202 L 802 148" fill="none" stroke="var(--hb-sky)" stroke-width="2" stroke-linejoin="round" marker-end="url(#b20_arr_sky)"/><rect x="704" y="96" width="196" height="52" rx="8" fill="var(--hb-card)" stroke="var(--hb-sky)" stroke-width="2"/><rect x="704" y="96" width="196" height="52" rx="8" fill="var(--hb-sky-bg)" stroke="none"/><rect x="708" y="100" width="188" height="44" rx="5" fill="none" stroke="var(--hb-sky)" stroke-width="1.2" stroke-opacity="0.8"/><text x="802.0" y="118.5" fill="var(--hb-sky)" font-size="11" font-weight="800" text-anchor="middle">Chu Kỳ Chuẩn</text><text x="802.0" y="133.5" fill="var(--muted)" font-size="10" text-anchor="middle">CanNmMsgCycleTime (1000ms)</text></svg>
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
            <svg viewBox="0 0 920 218" class="hb-svg" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Diagram b21"><defs><marker id="b21_arr_sky" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-sky)"/></marker><marker id="b21_arr_ok" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-ok)"/></marker><marker id="b21_arr_warn" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-warn)"/></marker><marker id="b21_arr_err" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-err)"/></marker><marker id="b21_arr_vio" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-vio)"/></marker><marker id="b21_arr_ind" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-ind)"/></marker><marker id="b21_arr_mut" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-stroke)"/></marker></defs><line x1="30" y1="26" x2="890" y2="26" stroke="var(--hb-sky)" stroke-width="2.2"/><line x1="30" y1="30" x2="890" y2="30" stroke="var(--hb-sky)" stroke-width="2.2"/><rect x="295.5" y="17" width="329" height="22" rx="11" fill="var(--hb-bg)" stroke="var(--hb-sky)" stroke-width="1.6"/><text x="460.0" y="31.8" fill="var(--hb-sky)" font-size="10.5" font-weight="800" text-anchor="middle">CAN BUS XE VẬT LÝ — ISO 11898-6 SELECTIVE WAKEUP</text><line x1="165" y1="30" x2="165" y2="66" stroke="var(--hb-stroke)" stroke-width="2.2" marker-end="url(#b21_arr_mut)"/><rect x="30" y="66" width="270" height="96" rx="8" fill="var(--hb-card)" stroke="var(--hb-stroke)" stroke-width="2"/><rect x="30" y="66" width="270" height="96" rx="8" fill="var(--hb-card2)" stroke="none"/><path d="M 30 74 Q 30 66 38 66 L 292 66 Q 300 66 300 74 L 300 92 L 30 92 Z" fill="var(--hb-stroke)" fill-opacity="0.22"/><line x1="30" y1="92" x2="300" y2="92" stroke="var(--hb-stroke)" stroke-width="1" stroke-opacity="0.5"/><text x="165.0" y="83.0" fill="var(--hb-stroke)" font-size="11" font-weight="800" text-anchor="middle">PNC #1: CỤM SƯỞI GHẾ</text><text x="165.0" y="123.0" fill="var(--text)" font-size="10" text-anchor="middle">• Ghế lái (ECU_SeatL)</text><text x="165.0" y="138.0" fill="var(--text)" font-size="10" text-anchor="middle">• Ghế phụ (ECU_SeatR)</text><rect x="60.0" y="173.0" width="210" height="26" rx="13.0" fill="var(--hb-card)" stroke="none"/><rect x="60.0" y="173.0" width="210" height="26" rx="13.0" fill="var(--hb-card2)" stroke="var(--hb-stroke)" stroke-width="1.5"/><text x="165" y="189.8" fill="var(--hb-stroke)" font-size="10" font-weight="800" text-anchor="middle">NGỦ SAY &lt; 100 µA</text><line x1="460" y1="30" x2="460" y2="66" stroke="var(--hb-stroke)" stroke-width="2.2" marker-end="url(#b21_arr_mut)"/><rect x="325" y="66" width="270" height="96" rx="8" fill="var(--hb-card)" stroke="var(--hb-stroke)" stroke-width="2"/><rect x="325" y="66" width="270" height="96" rx="8" fill="var(--hb-card2)" stroke="none"/><path d="M 325 74 Q 325 66 333 66 L 587 66 Q 595 66 595 74 L 595 92 L 325 92 Z" fill="var(--hb-stroke)" fill-opacity="0.22"/><line x1="325" y1="92" x2="595" y2="92" stroke="var(--hb-stroke)" stroke-width="1" stroke-opacity="0.5"/><text x="460.0" y="83.0" fill="var(--hb-stroke)" font-size="11" font-weight="800" text-anchor="middle">PNC #2: CỤM ĐÈN CHIẾU</text><text x="460.0" y="123.0" fill="var(--text)" font-size="10" text-anchor="middle">• Đèn trước (ECU_HeadL)</text><text x="460.0" y="138.0" fill="var(--text)" font-size="10" text-anchor="middle">• Đèn sau (ECU_TailL)</text><rect x="355.0" y="173.0" width="210" height="26" rx="13.0" fill="var(--hb-card)" stroke="none"/><rect x="355.0" y="173.0" width="210" height="26" rx="13.0" fill="var(--hb-card2)" stroke="var(--hb-stroke)" stroke-width="1.5"/><text x="460" y="189.8" fill="var(--hb-stroke)" font-size="10" font-weight="800" text-anchor="middle">NGỦ SAY &lt; 100 µA</text><line x1="755" y1="30" x2="755" y2="66" stroke="var(--hb-ok)" stroke-width="2.2" marker-end="url(#b21_arr_ok)"/><rect x="620" y="66" width="270" height="96" rx="8" fill="var(--hb-card)" stroke="var(--hb-ok)" stroke-width="2"/><rect x="620" y="66" width="270" height="96" rx="8" fill="var(--hb-ok-bg)" stroke="none"/><rect x="624" y="70" width="262" height="88" rx="5" fill="none" stroke="var(--hb-ok)" stroke-width="1.2" stroke-opacity="0.8"/><path d="M 620 74 Q 620 66 628 66 L 882 66 Q 890 66 890 74 L 890 92 L 620 92 Z" fill="var(--hb-ok)" fill-opacity="0.22"/><line x1="620" y1="92" x2="890" y2="92" stroke="var(--hb-ok)" stroke-width="1" stroke-opacity="0.5"/><text x="755.0" y="83.0" fill="var(--hb-ok)" font-size="11" font-weight="800" text-anchor="middle">PNC #3: CỤM SẠC PIN (EV)</text><text x="755.0" y="123.0" fill="var(--text)" font-size="10" text-anchor="middle">• Bộ sạc On-Board (OBC)</text><text x="755.0" y="138.0" fill="var(--text)" font-size="10" text-anchor="middle">• Quản lý pin (BMS)</text><rect x="650.0" y="173.0" width="210" height="26" rx="13.0" fill="var(--hb-card)" stroke="none"/><rect x="650.0" y="173.0" width="210" height="26" rx="13.0" fill="var(--hb-ok)" stroke="var(--hb-ok)" stroke-width="1.5"/><text x="755" y="189.8" fill="#ffffff" font-size="10" font-weight="800" text-anchor="middle">THỨC DẬY KHI CẮM SẠC!</text></svg>
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
            <svg viewBox="0 0 920 224" class="hb-svg" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Diagram b22"><defs><marker id="b22_arr_sky" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-sky)"/></marker><marker id="b22_arr_ok" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-ok)"/></marker><marker id="b22_arr_warn" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-warn)"/></marker><marker id="b22_arr_err" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-err)"/></marker><marker id="b22_arr_vio" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-vio)"/></marker><marker id="b22_arr_ind" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-ind)"/></marker><marker id="b22_arr_mut" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-stroke)"/></marker></defs><rect x="16" y="20" width="175" height="48" rx="8" fill="var(--hb-card)" stroke="var(--hb-sky)" stroke-width="2"/><rect x="16" y="20" width="175" height="48" rx="8" fill="var(--hb-sky-bg)" stroke="none"/><text x="103.5" y="40.5" fill="var(--hb-sky)" font-size="10.8" font-weight="800" text-anchor="middle">Bản tin NM Rx từ bus</text><text x="103.5" y="55.5" fill="var(--muted)" font-size="9.5" text-anchor="middle">CanNm_RxIndication()</text><line x1="191" y1="44" x2="232" y2="44" stroke="var(--hb-sky)" stroke-width="2" marker-end="url(#b22_arr_sky)"/><rect x="232" y="20" width="165" height="48" rx="8" fill="var(--hb-card)" stroke="var(--hb-vio)" stroke-width="2"/><rect x="232" y="20" width="165" height="48" rx="8" fill="var(--hb-vio-bg)" stroke="none"/><text x="314.5" y="40.5" fill="var(--hb-vio)" font-size="11" font-weight="800" text-anchor="middle">Bộ lọc PN Mask</text><text x="314.5" y="55.5" fill="var(--muted)" font-size="10.5" text-anchor="middle">So Bitwise AND</text><line x1="397" y1="44" x2="444" y2="44" stroke="var(--hb-vio)" stroke-width="2" marker-end="url(#b22_arr_vio)"/><rect x="444" y="20" width="224" height="48" rx="8" fill="var(--hb-card)" stroke="var(--hb-ok)" stroke-width="2"/><rect x="444" y="20" width="224" height="48" rx="8" fill="var(--hb-ok-bg)" stroke="none"/><rect x="448" y="24" width="216" height="40" rx="5" fill="none" stroke="var(--hb-ok)" stroke-width="1.2" stroke-opacity="0.8"/><path d="M 444 28 Q 444 20 452 20 L 660 20 Q 668 20 668 28 L 668 42 L 444 42 Z" fill="var(--hb-ok)" fill-opacity="0.22"/><line x1="444" y1="42" x2="668" y2="42" stroke="var(--hb-ok)" stroke-width="1" stroke-opacity="0.5"/><text x="556.0" y="35.0" fill="var(--hb-ok)" font-size="10.8" font-weight="800" text-anchor="middle">EIRA (Ext + Int Req)</text><text x="556.0" y="58.5" fill="var(--text)" font-size="10.5" text-anchor="middle">Hợp nhất tất cả kênh &amp; nội bộ</text><line x1="668" y1="44" x2="714" y2="44" stroke="var(--hb-ok)" stroke-width="2" marker-end="url(#b22_arr_ok)"/><rect x="714" y="20" width="190" height="48" rx="8" fill="var(--hb-card)" stroke="var(--hb-ok)" stroke-width="2"/><rect x="714" y="20" width="190" height="48" rx="8" fill="var(--hb-ok-bg)" stroke="none"/><text x="809.0" y="40.5" fill="var(--hb-ok)" font-size="10.5" font-weight="800" text-anchor="middle">ComM PNC State Machine</text><text x="809.0" y="55.5" fill="var(--muted)" font-size="10.5" text-anchor="middle">Bật/Tắt cụm PNC toàn ECU</text><rect x="232" y="92" width="165" height="42" rx="8" fill="var(--hb-card)" stroke="var(--hb-ind)" stroke-width="2"/><rect x="232" y="92" width="165" height="42" rx="8" fill="var(--hb-ind-bg)" stroke="none"/><text x="314.5" y="109.5" fill="var(--hb-ind)" font-size="10.5" font-weight="800" text-anchor="middle">Nhu cầu nội bộ SWC</text><text x="314.5" y="124.5" fill="var(--muted)" font-size="10.5" text-anchor="middle">ComM_RequestComMode</text><path d="M 397 113 L 556 113 L 556 68" fill="none" stroke="var(--hb-ind)" stroke-width="2" stroke-linejoin="round" marker-end="url(#b22_arr_ind)"/><rect x="16" y="158" width="175" height="48" rx="8" fill="var(--hb-card)" stroke="var(--hb-warn)" stroke-width="2"/><rect x="16" y="158" width="175" height="48" rx="8" fill="var(--hb-warn-bg)" stroke="none"/><text x="103.5" y="178.5" fill="var(--hb-warn)" font-size="10.8" font-weight="800" text-anchor="middle">Kênh CAN Gateway</text><text x="103.5" y="193.5" fill="var(--muted)" font-size="9.5" text-anchor="middle">Từng kênh vật lý riêng</text><line x1="191" y1="182" x2="232" y2="182" stroke="var(--hb-warn)" stroke-width="2" marker-end="url(#b22_arr_warn)"/><rect x="232" y="158" width="165" height="48" rx="8" fill="var(--hb-card)" stroke="var(--hb-warn)" stroke-width="2"/><rect x="232" y="158" width="165" height="48" rx="8" fill="var(--hb-warn-bg)" stroke="none"/><text x="314.5" y="178.5" fill="var(--hb-warn)" font-size="10.8" font-weight="800" text-anchor="middle">Bộ lọc Gateway ERA</text><text x="314.5" y="193.5" fill="var(--muted)" font-size="10.5" text-anchor="middle">Tách riêng từng bus CAN</text><line x1="397" y1="182" x2="444" y2="182" stroke="var(--hb-warn)" stroke-width="2" marker-end="url(#b22_arr_warn)"/><rect x="444" y="158" width="224" height="48" rx="8" fill="var(--hb-card)" stroke="var(--hb-warn)" stroke-width="2"/><rect x="444" y="158" width="224" height="48" rx="8" fill="var(--hb-warn-bg)" stroke="none"/><path d="M 444 166 Q 444 158 452 158 L 660 158 Q 668 158 668 166 L 668 180 L 444 180 Z" fill="var(--hb-warn)" fill-opacity="0.22"/><line x1="444" y1="180" x2="668" y2="180" stroke="var(--hb-warn)" stroke-width="1" stroke-opacity="0.5"/><text x="556.0" y="173.0" fill="var(--hb-warn)" font-size="10.8" font-weight="800" text-anchor="middle">ERA (External Only)</text><text x="556.0" y="196.5" fill="var(--text)" font-size="10.5" text-anchor="middle">Chỉ tính yêu cầu từ bus ngoài</text><line x1="668" y1="182" x2="714" y2="182" stroke="var(--hb-warn)" stroke-width="2" marker-end="url(#b22_arr_warn)"/><rect x="714" y="158" width="190" height="48" rx="8" fill="var(--hb-card)" stroke="var(--hb-warn)" stroke-width="2"/><rect x="714" y="158" width="190" height="48" rx="8" fill="var(--hb-warn-bg)" stroke="none"/><text x="809.0" y="178.5" fill="var(--hb-warn)" font-size="10.5" font-weight="800" text-anchor="middle">ComM Router Gateway</text><text x="809.0" y="193.5" fill="var(--muted)" font-size="10.5" text-anchor="middle">Chuyển tiếp PNC sang bus khác</text></svg>
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
            <svg viewBox="0 0 920 248" class="hb-svg" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Diagram b23"><defs><marker id="b23_arr_sky" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-sky)"/></marker><marker id="b23_arr_ok" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-ok)"/></marker><marker id="b23_arr_warn" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-warn)"/></marker><marker id="b23_arr_err" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-err)"/></marker><marker id="b23_arr_vio" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-vio)"/></marker><marker id="b23_arr_ind" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-ind)"/></marker><marker id="b23_arr_mut" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-stroke)"/></marker></defs><line x1="220" y1="54" x2="220" y2="210" stroke="var(--hb-stroke)" stroke-dasharray="5,4" stroke-width="1.6"/><line x1="700" y1="54" x2="700" y2="210" stroke="var(--hb-stroke)" stroke-dasharray="5,4" stroke-width="1.6"/><rect x="95" y="14" width="250" height="42" rx="8" fill="var(--hb-card)" stroke="var(--hb-sky)" stroke-width="2"/><rect x="95" y="14" width="250" height="42" rx="8" fill="var(--hb-sky-bg)" stroke="none"/><path d="M 95 22 Q 95 14 103 14 L 337 14 Q 345 14 345 22 L 345 36 L 95 36 Z" fill="var(--hb-sky)" fill-opacity="0.22"/><line x1="95" y1="36" x2="345" y2="36" stroke="var(--hb-sky)" stroke-width="1" stroke-opacity="0.5"/><text x="220.0" y="29.0" fill="var(--hb-sky)" font-size="12" font-weight="800" text-anchor="middle">ECU #1 (PNC Coordinator)</text><text x="220.0" y="49.5" fill="var(--text)" font-size="10.5" text-anchor="middle">Điều phối đồng bộ tắt PNC</text><rect x="575" y="14" width="250" height="42" rx="8" fill="var(--hb-card)" stroke="var(--hb-vio)" stroke-width="2"/><rect x="575" y="14" width="250" height="42" rx="8" fill="var(--hb-vio-bg)" stroke="none"/><path d="M 575 22 Q 575 14 583 14 L 817 14 Q 825 14 825 22 L 825 36 L 575 36 Z" fill="var(--hb-vio)" fill-opacity="0.22"/><line x1="575" y1="36" x2="825" y2="36" stroke="var(--hb-vio)" stroke-width="1" stroke-opacity="0.5"/><text x="700.0" y="29.0" fill="var(--hb-vio)" font-size="12" font-weight="800" text-anchor="middle">ECU #2 (PNC Client)</text><text x="700.0" y="49.5" fill="var(--text)" font-size="10.5" text-anchor="middle">Thực thi tắt cụm mạng con</text><line x1="220" y1="88" x2="700" y2="88" stroke="var(--hb-warn)" stroke-width="2.4" marker-end="url(#b23_arr_warn)"/><rect x="288.0" y="66.0" width="344" height="20" rx="5" fill="var(--hb-bg)" stroke="var(--hb-warn)" stroke-width="1" stroke-opacity="0.7"/><text x="460" y="79.5" fill="var(--hb-warn)" font-size="10" font-weight="700" text-anchor="middle">Phát NM PDU: Cờ PNC = 0, Cờ CSR = 1 (Báo chuẩn bị tắt)</text><rect x="584.0" y="109.0" width="232" height="26" rx="13.0" fill="var(--hb-card)" stroke="none"/><rect x="584.0" y="109.0" width="232" height="26" rx="13.0" fill="var(--hb-vio-bg)" stroke="var(--hb-vio)" stroke-width="1.5"/><text x="700" y="125.8" fill="var(--hb-vio)" font-size="10" font-weight="800" text-anchor="middle">Nhận tin -&gt; Chuẩn bị tắt App SWC</text><line x1="220" y1="160" x2="700" y2="160" stroke="var(--hb-sky)" stroke-width="2" stroke-dasharray="5,4" marker-start="url(#b23_arr_sky)" marker-end="url(#b23_arr_sky)"/><rect x="344.0" y="150.0" width="232" height="20" rx="5" fill="var(--hb-bg)" stroke="var(--hb-sky)" stroke-width="1" stroke-opacity="0.7"/><text x="460" y="163.5" fill="var(--hb-sky)" font-size="10" font-weight="700" text-anchor="middle">Đợi đồng bộ hết CanNmPnResetTime</text><rect x="120" y="192" width="680" height="42" rx="8" fill="var(--hb-card)" stroke="var(--hb-ok)" stroke-width="2"/><rect x="120" y="192" width="680" height="42" rx="8" fill="var(--hb-ok-bg)" stroke="none"/><rect x="124" y="196" width="672" height="34" rx="5" fill="none" stroke="var(--hb-ok)" stroke-width="1.2" stroke-opacity="0.8"/><text x="460.0" y="209.5" fill="var(--hb-ok)" font-size="11.5" font-weight="800" text-anchor="middle">TẮT ĐỒNG THỜI CỤM PNC #1 TRÊN CẢ 2 ECU</text><text x="460.0" y="224.5" fill="var(--muted)" font-size="10.5" text-anchor="middle">Không gây mất gói hoặc lỗi truyền thông dữ liệu cuối chu kỳ!</text></svg>
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
            <svg viewBox="0 0 920 224" class="hb-svg" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Diagram b24"><defs><marker id="b24_arr_sky" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-sky)"/></marker><marker id="b24_arr_ok" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-ok)"/></marker><marker id="b24_arr_warn" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-warn)"/></marker><marker id="b24_arr_err" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-err)"/></marker><marker id="b24_arr_vio" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-vio)"/></marker><marker id="b24_arr_ind" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-ind)"/></marker><marker id="b24_arr_mut" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-stroke)"/></marker></defs><rect x="120" y="18" width="280" height="50" rx="8" fill="var(--hb-card)" stroke="var(--hb-warn)" stroke-width="2"/><rect x="120" y="18" width="280" height="50" rx="8" fill="var(--hb-warn-bg)" stroke="none"/><path d="M 120 26 Q 120 18 128 18 L 392 18 Q 400 18 400 26 L 400 40 L 120 40 Z" fill="var(--hb-warn)" fill-opacity="0.22"/><line x1="120" y1="40" x2="400" y2="40" stroke="var(--hb-warn)" stroke-width="1" stroke-opacity="0.5"/><text x="260.0" y="33.0" fill="var(--hb-warn)" font-size="12" font-weight="800" text-anchor="middle">Khóa cửa / Cảnh báo trộm</text><text x="260.0" y="57.5" fill="var(--text)" font-size="10.5" text-anchor="middle">Sự kiện khẩn cấp toàn xe</text><line x1="400" y1="43" x2="470" y2="43" stroke="var(--hb-err)" stroke-width="2.2" marker-end="url(#b24_arr_err)"/><rect x="470" y="18" width="310" height="50" rx="8" fill="var(--hb-card)" stroke="var(--hb-err)" stroke-width="2"/><rect x="470" y="18" width="310" height="50" rx="8" fill="var(--hb-err-bg)" stroke="none"/><rect x="474" y="22" width="302" height="42" rx="5" fill="none" stroke="var(--hb-err)" stroke-width="1.2" stroke-opacity="0.8"/><path d="M 470 26 Q 470 18 478 18 L 772 18 Q 780 18 780 26 L 780 40 L 470 40 Z" fill="var(--hb-err)" fill-opacity="0.22"/><line x1="470" y1="40" x2="780" y2="40" stroke="var(--hb-err)" stroke-width="1" stroke-opacity="0.5"/><text x="625.0" y="33.0" fill="var(--hb-err)" font-size="12" font-weight="800" text-anchor="middle">NM PDU (CarWakeup Byte = 0x55)</text><text x="625.0" y="57.5" fill="var(--text)" font-size="10.5" text-anchor="middle">Bật cờ CSR / Bit đánh thức xe</text><line x1="625" y1="68" x2="625" y2="114" stroke="var(--hb-err)" stroke-width="2.4" marker-end="url(#b24_arr_err)"/><line x1="40" y1="116" x2="880" y2="116" stroke="var(--hb-err)" stroke-width="2.2"/><line x1="40" y1="120" x2="880" y2="120" stroke="var(--hb-err)" stroke-width="2.2"/><rect x="318.0" y="107" width="284" height="22" rx="11" fill="var(--hb-bg)" stroke="var(--hb-err)" stroke-width="1.6"/><text x="460.0" y="121.8" fill="var(--hb-err)" font-size="10.5" font-weight="800" text-anchor="middle">CAN BUS TOÀN XE (PHÁT QUẢNG BÁ ĐÁNH THỨC)</text><line x1="185" y1="120" x2="185" y2="160" stroke="var(--hb-err)" stroke-width="2.2" marker-end="url(#b24_arr_err)"/><rect x="70" y="160" width="230" height="48" rx="8" fill="var(--hb-card)" stroke="var(--hb-ok)" stroke-width="2"/><rect x="70" y="160" width="230" height="48" rx="8" fill="var(--hb-ok-bg)" stroke="none"/><path d="M 70 168 Q 70 160 78 160 L 292 160 Q 300 160 300 168 L 300 182 L 70 182 Z" fill="var(--hb-ok)" fill-opacity="0.22"/><line x1="70" y1="182" x2="300" y2="182" stroke="var(--hb-ok)" stroke-width="1" stroke-opacity="0.5"/><text x="185.0" y="175.0" fill="var(--hb-ok)" font-size="11" font-weight="800" text-anchor="middle">Đánh thức ECU Đèn</text><text x="185.0" y="198.5" fill="var(--text)" font-size="10.5" text-anchor="middle">Nm_CarWakeUpIndication()</text><line x1="460" y1="120" x2="460" y2="160" stroke="var(--hb-err)" stroke-width="2.2" marker-end="url(#b24_arr_err)"/><rect x="345" y="160" width="230" height="48" rx="8" fill="var(--hb-card)" stroke="var(--hb-ok)" stroke-width="2"/><rect x="345" y="160" width="230" height="48" rx="8" fill="var(--hb-ok-bg)" stroke="none"/><path d="M 345 168 Q 345 160 353 160 L 567 160 Q 575 160 575 168 L 575 182 L 345 182 Z" fill="var(--hb-ok)" fill-opacity="0.22"/><line x1="345" y1="182" x2="575" y2="182" stroke="var(--hb-ok)" stroke-width="1" stroke-opacity="0.5"/><text x="460.0" y="175.0" fill="var(--hb-ok)" font-size="11" font-weight="800" text-anchor="middle">Đánh thức Còi hú</text><text x="460.0" y="198.5" fill="var(--text)" font-size="10.5" text-anchor="middle">Nm_CarWakeUpIndication()</text><line x1="735" y1="120" x2="735" y2="160" stroke="var(--hb-err)" stroke-width="2.2" marker-end="url(#b24_arr_err)"/><rect x="620" y="160" width="230" height="48" rx="8" fill="var(--hb-card)" stroke="var(--hb-ok)" stroke-width="2"/><rect x="620" y="160" width="230" height="48" rx="8" fill="var(--hb-ok-bg)" stroke="none"/><path d="M 620 168 Q 620 160 628 160 L 842 160 Q 850 160 850 168 L 850 182 L 620 182 Z" fill="var(--hb-ok)" fill-opacity="0.22"/><line x1="620" y1="182" x2="850" y2="182" stroke="var(--hb-ok)" stroke-width="1" stroke-opacity="0.5"/><text x="735.0" y="175.0" fill="var(--hb-ok)" font-size="11" font-weight="800" text-anchor="middle">Đánh thức Gateway</text><text x="735.0" y="198.5" fill="var(--text)" font-size="10.5" text-anchor="middle">Nm_CarWakeUpIndication()</text></svg>
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
            <svg viewBox="0 0 920 212" class="hb-svg" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Diagram b25"><defs><marker id="b25_arr_sky" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-sky)"/></marker><marker id="b25_arr_ok" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-ok)"/></marker><marker id="b25_arr_warn" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-warn)"/></marker><marker id="b25_arr_err" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-err)"/></marker><marker id="b25_arr_vio" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-vio)"/></marker><marker id="b25_arr_ind" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-ind)"/></marker><marker id="b25_arr_mut" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-stroke)"/></marker></defs><rect x="18" y="26" width="200" height="74" rx="8" fill="var(--hb-card)" stroke="var(--hb-ind)" stroke-width="2"/><rect x="18" y="26" width="200" height="74" rx="8" fill="var(--hb-ind-bg)" stroke="none"/><path d="M 18 34 Q 18 26 26 26 L 210 26 Q 218 26 218 34 L 218 51 L 18 51 Z" fill="var(--hb-ind)" fill-opacity="0.22"/><line x1="18" y1="51" x2="218" y2="51" stroke="var(--hb-ind)" stroke-width="1" stroke-opacity="0.5"/><text x="118.0" y="42.5" fill="var(--hb-ind)" font-size="11" font-weight="800" text-anchor="middle">1. Khởi động BSW</text><text x="118.0" y="79.0" fill="var(--text)" class="mono-svg" font-size="10" text-anchor="middle">CanNm_Init(&amp;Config)</text><line x1="218" y1="63" x2="246" y2="63" stroke="var(--hb-ind)" stroke-width="2.2" marker-end="url(#b25_arr_ind)"/><rect x="246" y="26" width="200" height="74" rx="8" fill="var(--hb-card)" stroke="var(--hb-ok)" stroke-width="2"/><rect x="246" y="26" width="200" height="74" rx="8" fill="var(--hb-ok-bg)" stroke="none"/><path d="M 246 34 Q 246 26 254 26 L 438 26 Q 446 26 446 34 L 446 51 L 246 51 Z" fill="var(--hb-ok)" fill-opacity="0.22"/><line x1="246" y1="51" x2="446" y2="51" stroke="var(--hb-ok)" stroke-width="1" stroke-opacity="0.5"/><text x="346.0" y="42.5" fill="var(--hb-ok)" font-size="11" font-weight="800" text-anchor="middle">2. Đánh thức mạng</text><text x="346.0" y="71.5" fill="var(--text)" class="mono-svg" font-size="10" text-anchor="middle">NetworkRequest() /</text><text x="346.0" y="86.5" fill="var(--text)" class="mono-svg" font-size="10" text-anchor="middle">PassiveStartUp()</text><line x1="446" y1="63" x2="474" y2="63" stroke="var(--hb-ok)" stroke-width="2.2" marker-end="url(#b25_arr_ok)"/><rect x="474" y="26" width="200" height="74" rx="8" fill="var(--hb-card)" stroke="var(--hb-sky)" stroke-width="2"/><rect x="474" y="26" width="200" height="74" rx="8" fill="var(--hb-sky-bg)" stroke="none"/><rect x="478" y="30" width="192" height="66" rx="5" fill="none" stroke="var(--hb-sky)" stroke-width="1.2" stroke-opacity="0.8"/><path d="M 474 34 Q 474 26 482 26 L 666 26 Q 674 26 674 34 L 674 51 L 474 51 Z" fill="var(--hb-sky)" fill-opacity="0.22"/><line x1="474" y1="51" x2="674" y2="51" stroke="var(--hb-sky)" stroke-width="1" stroke-opacity="0.5"/><text x="574.0" y="42.5" fill="var(--hb-sky)" font-size="11" font-weight="800" text-anchor="middle">3. Chu kỳ vận hành</text><text x="574.0" y="71.5" fill="var(--text)" class="mono-svg" font-size="10" text-anchor="middle">CanNm_MainFunction()</text><text x="574.0" y="86.5" fill="var(--text)" class="mono-svg" font-size="10" text-anchor="middle">(Chu kỳ 100ms)</text><line x1="674" y1="63" x2="702" y2="63" stroke="var(--hb-sky)" stroke-width="2.2" marker-end="url(#b25_arr_sky)"/><rect x="702" y="26" width="200" height="74" rx="8" fill="var(--hb-card)" stroke="var(--hb-err)" stroke-width="2"/><rect x="702" y="26" width="200" height="74" rx="8" fill="var(--hb-err-bg)" stroke="none"/><path d="M 702 34 Q 702 26 710 26 L 894 26 Q 902 26 902 34 L 902 51 L 702 51 Z" fill="var(--hb-err)" fill-opacity="0.22"/><line x1="702" y1="51" x2="902" y2="51" stroke="var(--hb-err)" stroke-width="1" stroke-opacity="0.5"/><text x="802.0" y="42.5" fill="var(--hb-err)" font-size="11" font-weight="800" text-anchor="middle">4. Nhả &amp; Tắt ECU</text><text x="802.0" y="71.5" fill="var(--text)" class="mono-svg" font-size="10" text-anchor="middle">NetworkRelease() -&gt;</text><text x="802.0" y="86.5" fill="var(--text)" class="mono-svg" font-size="10" text-anchor="middle">CanNm_DeInit()</text><line x1="574" y1="100" x2="574" y2="146" stroke="var(--hb-vio)" stroke-width="2" marker-start="url(#b25_arr_vio)" marker-end="url(#b25_arr_vio)"/><rect x="591.0" y="114.0" width="118" height="20" rx="5" fill="var(--hb-bg)" stroke="var(--hb-vio)" stroke-width="1" stroke-opacity="0.7"/><text x="650" y="127.5" fill="var(--hb-vio)" font-size="10" font-weight="700" text-anchor="middle">Cập nhật payload</text><rect x="454" y="146" width="240" height="48" rx="8" fill="var(--hb-card)" stroke="var(--hb-vio)" stroke-width="2"/><rect x="454" y="146" width="240" height="48" rx="8" fill="var(--hb-vio-bg)" stroke="none"/><text x="574.0" y="166.5" fill="var(--hb-vio)" font-size="11" font-weight="800" text-anchor="middle">CanNm_SetUserData()</text><text x="574.0" y="181.5" fill="var(--muted)" font-size="10.5" text-anchor="middle">Ghi 6 bytes User Data đồng bộ</text></svg>
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
            <svg viewBox="0 0 920 232" class="hb-svg" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Diagram b26"><defs><marker id="b26_arr_sky" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-sky)"/></marker><marker id="b26_arr_ok" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-ok)"/></marker><marker id="b26_arr_warn" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-warn)"/></marker><marker id="b26_arr_err" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-err)"/></marker><marker id="b26_arr_vio" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-vio)"/></marker><marker id="b26_arr_ind" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-ind)"/></marker><marker id="b26_arr_mut" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-stroke)"/></marker></defs><rect x="18" y="22" width="190" height="52" rx="8" fill="var(--hb-card)" stroke="var(--hb-ind)" stroke-width="2"/><rect x="18" y="22" width="190" height="52" rx="8" fill="var(--hb-ind-bg)" stroke="none"/><path d="M 18 30 Q 18 22 26 22 L 200 22 Q 208 22 208 30 L 208 44 L 18 44 Z" fill="var(--hb-ind)" fill-opacity="0.22"/><line x1="18" y1="44" x2="208" y2="44" stroke="var(--hb-ind)" stroke-width="1" stroke-opacity="0.5"/><text x="113.0" y="37.0" fill="var(--hb-ind)" font-size="12" font-weight="800" text-anchor="middle">CanIf Driver (Rx)</text><text x="113.0" y="62.5" fill="var(--text)" font-size="10.5" text-anchor="middle">Lớp giao tiếp CAN thấp</text><rect x="18" y="92" width="190" height="52" rx="8" fill="var(--hb-card)" stroke="var(--hb-ind)" stroke-width="2"/><rect x="18" y="92" width="190" height="52" rx="8" fill="var(--hb-ind-bg)" stroke="none"/><path d="M 18 100 Q 18 92 26 92 L 200 92 Q 208 92 208 100 L 208 114 L 18 114 Z" fill="var(--hb-ind)" fill-opacity="0.22"/><line x1="18" y1="114" x2="208" y2="114" stroke="var(--hb-ind)" stroke-width="1" stroke-opacity="0.5"/><text x="113.0" y="107.0" fill="var(--hb-ind)" font-size="12" font-weight="800" text-anchor="middle">CanIf Driver (Tx)</text><text x="113.0" y="132.5" fill="var(--text)" font-size="10.5" text-anchor="middle">Xác nhận phát xong</text><rect x="18" y="162" width="190" height="52" rx="8" fill="var(--hb-card)" stroke="var(--hb-vio)" stroke-width="2"/><rect x="18" y="162" width="190" height="52" rx="8" fill="var(--hb-vio-bg)" stroke="none"/><path d="M 18 170 Q 18 162 26 162 L 200 162 Q 208 162 208 170 L 208 184 L 18 184 Z" fill="var(--hb-vio)" fill-opacity="0.22"/><line x1="18" y1="184" x2="208" y2="184" stroke="var(--hb-vio)" stroke-width="1" stroke-opacity="0.5"/><text x="113.0" y="177.0" fill="var(--hb-vio)" font-size="12" font-weight="800" text-anchor="middle">PduR Router</text><text x="113.0" y="202.5" fill="var(--text)" font-size="10.5" text-anchor="middle">Cung cấp User Data</text><rect x="360" y="42" width="200" height="152" rx="8" fill="var(--hb-card)" stroke="var(--hb-sky)" stroke-width="2"/><rect x="360" y="42" width="200" height="152" rx="8" fill="var(--hb-sky-bg)" stroke="none"/><rect x="364" y="46" width="192" height="144" rx="5" fill="none" stroke="var(--hb-sky)" stroke-width="1.2" stroke-opacity="0.8"/><path d="M 360 50 Q 360 42 368 42 L 552 42 Q 560 42 560 50 L 560 68 L 360 68 Z" fill="var(--hb-sky)" fill-opacity="0.22"/><line x1="360" y1="68" x2="560" y2="68" stroke="var(--hb-sky)" stroke-width="1" stroke-opacity="0.5"/><text x="460.0" y="59.0" fill="var(--hb-sky)" font-size="12.5" font-weight="800" text-anchor="middle">CanNM Engine</text><text x="460.0" y="119.5" fill="var(--text)" font-size="10.5" text-anchor="middle">• Máy Trạng Thái</text><text x="460.0" y="134.5" fill="var(--text)" font-size="10.5" text-anchor="middle">• Quản Lý 5 Timers</text><text x="460.0" y="149.5" fill="var(--text)" font-size="10.5" text-anchor="middle">• Đóng Gói CBV &amp; SNI</text><rect x="712" y="42" width="190" height="152" rx="8" fill="var(--hb-card)" stroke="var(--hb-ok)" stroke-width="2"/><rect x="712" y="42" width="190" height="152" rx="8" fill="var(--hb-ok-bg)" stroke="none"/><path d="M 712 50 Q 712 42 720 42 L 894 42 Q 902 42 902 50 L 902 68 L 712 68 Z" fill="var(--hb-ok)" fill-opacity="0.22"/><line x1="712" y1="68" x2="902" y2="68" stroke="var(--hb-ok)" stroke-width="1" stroke-opacity="0.5"/><text x="807.0" y="59.0" fill="var(--hb-ok)" font-size="12" font-weight="800" text-anchor="middle">Nm / ComM</text><text x="807.0" y="119.5" fill="var(--text)" font-size="10" text-anchor="middle">Tầng Điều Phối Trên</text><text x="807.0" y="134.5" fill="var(--text)" font-size="10" text-anchor="middle">(Thông báo trạng thái</text><text x="807.0" y="149.5" fill="var(--text)" font-size="10" text-anchor="middle">mạng theo chuẩn Nm)</text><line x1="208" y1="48" x2="360" y2="74" stroke="var(--hb-ind)" stroke-width="2" marker-end="url(#b26_arr_ind)"/><rect x="215.0" y="51.0" width="138" height="20" rx="5" fill="var(--hb-bg)" stroke="var(--hb-ind)" stroke-width="1" stroke-opacity="0.7"/><text x="284" y="64.5" fill="var(--hb-ind)" font-size="10" font-weight="700" text-anchor="middle">CanNm_RxIndication()</text><line x1="208" y1="118" x2="360" y2="118" stroke="var(--hb-ind)" stroke-width="2" marker-end="url(#b26_arr_ind)"/><rect x="213.0" y="108.0" width="142" height="20" rx="5" fill="var(--hb-bg)" stroke="var(--hb-ind)" stroke-width="1" stroke-opacity="0.7"/><text x="284" y="121.5" fill="var(--hb-ind)" font-size="10" font-weight="700" text-anchor="middle">CanNm_TxConfirmation()</text><line x1="360" y1="166" x2="208" y2="188" stroke="var(--hb-vio)" stroke-width="2" marker-end="url(#b26_arr_vio)"/><rect x="212.0" y="167.0" width="144" height="20" rx="5" fill="var(--hb-bg)" stroke="var(--hb-vio)" stroke-width="1" stroke-opacity="0.7"/><text x="284" y="180.5" fill="var(--hb-vio)" font-size="10" font-weight="700" text-anchor="middle">CanNm_TriggerTransmit()</text><line x1="560" y1="74" x2="712" y2="74" stroke="var(--hb-ok)" stroke-width="2" marker-end="url(#b26_arr_ok)"/><rect x="570.0" y="64.0" width="132" height="20" rx="5" fill="var(--hb-bg)" stroke="var(--hb-ok)" stroke-width="1" stroke-opacity="0.7"/><text x="636" y="77.5" fill="var(--hb-ok)" font-size="10" font-weight="700" text-anchor="middle">Nm_NetworkMode()</text><line x1="560" y1="118" x2="712" y2="118" stroke="var(--hb-warn)" stroke-width="2" marker-end="url(#b26_arr_warn)"/><rect x="570.0" y="108.0" width="132" height="20" rx="5" fill="var(--hb-bg)" stroke="var(--hb-warn)" stroke-width="1" stroke-opacity="0.7"/><text x="636" y="121.5" fill="var(--hb-warn)" font-size="10" font-weight="700" text-anchor="middle">Nm_BusSleepMode()</text><line x1="560" y1="162" x2="712" y2="162" stroke="var(--hb-sky)" stroke-width="2" marker-end="url(#b26_arr_sky)"/><rect x="565.0" y="152.0" width="142" height="20" rx="5" fill="var(--hb-bg)" stroke="var(--hb-sky)" stroke-width="1" stroke-opacity="0.7"/><text x="636" y="165.5" fill="var(--hb-sky)" font-size="10" font-weight="700" text-anchor="middle">Nm_StateChangeNotif()</text></svg>
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
            <svg viewBox="0 0 920 224" class="hb-svg" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Diagram b27"><defs><marker id="b27_arr_sky" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-sky)"/></marker><marker id="b27_arr_ok" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-ok)"/></marker><marker id="b27_arr_warn" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-warn)"/></marker><marker id="b27_arr_err" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-err)"/></marker><marker id="b27_arr_vio" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-vio)"/></marker><marker id="b27_arr_ind" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-ind)"/></marker><marker id="b27_arr_mut" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-stroke)"/></marker></defs><rect x="16" y="72" width="158" height="56" rx="8" fill="var(--hb-card)" stroke="var(--hb-sky)" stroke-width="2"/><rect x="16" y="72" width="158" height="56" rx="8" fill="var(--hb-sky-bg)" stroke="none"/><path d="M 16 80 Q 16 72 24 72 L 166 72 Q 174 72 174 80 L 174 94 L 16 94 Z" fill="var(--hb-sky)" fill-opacity="0.22"/><line x1="16" y1="94" x2="174" y2="94" stroke="var(--hb-sky)" stroke-width="1" stroke-opacity="0.5"/><text x="95.0" y="87.0" fill="var(--hb-sky)" font-size="12" font-weight="800" text-anchor="middle">CanNM API Call</text><text x="95.0" y="114.5" fill="var(--text)" font-size="10.5" text-anchor="middle">Gọi từ lớp trên/dưới</text><line x1="174" y1="100" x2="214" y2="100" stroke="var(--hb-sky)" stroke-width="2" marker-end="url(#b27_arr_sky)"/><polygon points="324,46 434,100 324,154 214,100" fill="var(--hb-card)" stroke="var(--hb-warn)" stroke-width="2"/><polygon points="324,46 434,100 324,154 214,100" fill="var(--hb-warn-bg)" stroke="none"/><text x="324" y="97.0" fill="var(--hb-warn)" font-size="10.5" font-weight="800" text-anchor="middle">Kiểm tra Init?</text><text x="324" y="111.0" fill="var(--hb-warn)" font-size="10.5" font-weight="800" text-anchor="middle">NULL Ptr? Kênh?</text><path d="M 324 46 L 324 26 L 504 26" fill="none" stroke="var(--hb-ok)" stroke-width="2.2" stroke-linejoin="round" marker-end="url(#b27_arr_ok)"/><rect x="367.0" y="16.0" width="94" height="20" rx="5" fill="var(--hb-bg)" stroke="var(--hb-ok)" stroke-width="1" stroke-opacity="0.7"/><text x="414" y="29.5" fill="var(--hb-ok)" font-size="10" font-weight="700" text-anchor="middle">HỢP LỆ (OK)</text><rect x="504" y="8" width="396" height="42" rx="8" fill="var(--hb-card)" stroke="var(--hb-ok)" stroke-width="2"/><rect x="504" y="8" width="396" height="42" rx="8" fill="var(--hb-ok-bg)" stroke="none"/><text x="702.0" y="33.0" fill="var(--text)" font-size="11" font-weight="800" text-anchor="middle">Thực thi logic CanNM Engine bình thường</text><line x1="434" y1="100" x2="504" y2="100" stroke="var(--hb-err)" stroke-width="2.2" marker-end="url(#b27_arr_err)"/><rect x="436.0" y="70.0" width="64" height="20" rx="5" fill="var(--hb-bg)" stroke="var(--hb-err)" stroke-width="1" stroke-opacity="0.7"/><text x="468" y="83.5" fill="var(--hb-err)" font-size="10" font-weight="700" text-anchor="middle">CÓ LỖI!</text><rect x="504" y="71" width="396" height="58" rx="8" fill="var(--hb-card)" stroke="var(--hb-err)" stroke-width="2"/><rect x="504" y="71" width="396" height="58" rx="8" fill="var(--hb-err-bg)" stroke="none"/><rect x="508" y="75" width="388" height="50" rx="5" fill="none" stroke="var(--hb-err)" stroke-width="1.2" stroke-opacity="0.8"/><path d="M 504 79 Q 504 71 512 71 L 892 71 Q 900 71 900 79 L 900 93 L 504 93 Z" fill="var(--hb-err)" fill-opacity="0.22"/><line x1="504" y1="93" x2="900" y2="93" stroke="var(--hb-err)" stroke-width="1" stroke-opacity="0.5"/><text x="702.0" y="86.0" fill="var(--hb-err)" font-size="10.5" font-weight="800" text-anchor="middle">Det_ReportError(ModuleID=31, Instance=0, Api, Err)</text><text x="702.0" y="114.5" fill="var(--text)" font-size="9.5" text-anchor="middle">Từ chối &amp; báo lỗi chuẩn AUTOSAR DET (CANNM_E_*)</text><line x1="702" y1="129" x2="702" y2="158" stroke="var(--hb-err)" stroke-width="2" marker-end="url(#b27_arr_err)"/><rect x="504" y="158" width="396" height="50" rx="8" fill="var(--hb-card)" stroke="var(--hb-warn)" stroke-width="2"/><rect x="504" y="158" width="396" height="50" rx="8" fill="var(--hb-warn-bg)" stroke="none"/><text x="702.0" y="187.0" fill="var(--text)" font-size="11" font-weight="800" text-anchor="middle">Ghi RAM Freeze Frame / Báo chẩn đoán Dcm</text></svg>
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
            <svg viewBox="0 0 920 316" class="hb-svg" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Diagram b28"><defs><marker id="b28_arr_sky" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-sky)"/></marker><marker id="b28_arr_ok" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-ok)"/></marker><marker id="b28_arr_warn" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-warn)"/></marker><marker id="b28_arr_err" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-err)"/></marker><marker id="b28_arr_vio" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-vio)"/></marker><marker id="b28_arr_ind" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-ind)"/></marker><marker id="b28_arr_mut" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--hb-stroke)"/></marker></defs><rect x="16" y="116" width="210" height="74" rx="8" fill="var(--hb-card)" stroke="var(--hb-sky)" stroke-width="2"/><rect x="16" y="116" width="210" height="74" rx="8" fill="var(--hb-sky-bg)" stroke="none"/><rect x="20" y="120" width="202" height="66" rx="5" fill="none" stroke="var(--hb-sky)" stroke-width="1.2" stroke-opacity="0.8"/><path d="M 16 124 Q 16 116 24 116 L 218 116 Q 226 116 226 124 L 226 141 L 16 141 Z" fill="var(--hb-sky)" fill-opacity="0.22"/><line x1="16" y1="141" x2="226" y2="141" stroke="var(--hb-sky)" stroke-width="1" stroke-opacity="0.5"/><text x="121.0" y="132.5" fill="var(--hb-sky)" font-size="12" font-weight="800" text-anchor="middle">CanNmGlobalConfig</text><text x="121.0" y="161.5" fill="var(--text)" font-size="10.5" text-anchor="middle">Gốc Cây Cấu Hình ECUC</text><text x="121.0" y="176.5" fill="var(--text)" font-size="10.5" text-anchor="middle">(AUTOSAR ARXML Container)</text><line x1="226" y1="153" x2="276" y2="153" stroke="var(--hb-sky)" stroke-width="2.2"/><line x1="276" y1="34" x2="276" y2="284" stroke="var(--hb-sky)" stroke-width="2.2"/><line x1="276" y1="34" x2="316" y2="34" stroke="var(--hb-ind)" stroke-width="2" marker-end="url(#b28_arr_ind)"/><rect x="316" y="14" width="224" height="40" rx="8" fill="var(--hb-card)" stroke="var(--hb-ind)" stroke-width="2"/><rect x="316" y="14" width="224" height="40" rx="8" fill="var(--hb-ind-bg)" stroke="none"/><text x="428.0" y="38.0" fill="var(--text)" font-size="11" font-weight="800" text-anchor="middle">1. CanNmGeneral</text><rect x="548" y="14" width="354" height="40" rx="8" fill="var(--hb-card)" stroke="var(--hb-stroke)" stroke-width="2"/><rect x="548" y="14" width="354" height="40" rx="8" fill="var(--hb-card2)" stroke="none"/><text x="725.0" y="38.0" fill="var(--text)" font-size="10" font-weight="800" text-anchor="middle">DevErrorDetect, PassiveMode, ActiveWakeupBit...</text><line x1="276" y1="84" x2="316" y2="84" stroke="var(--hb-sky)" stroke-width="2" marker-end="url(#b28_arr_sky)"/><rect x="316" y="64" width="224" height="40" rx="8" fill="var(--hb-card)" stroke="var(--hb-sky)" stroke-width="2"/><rect x="316" y="64" width="224" height="40" rx="8" fill="var(--hb-sky-bg)" stroke="none"/><text x="428.0" y="88.0" fill="var(--text)" font-size="11" font-weight="800" text-anchor="middle">2. CanNmChannelConfig</text><rect x="548" y="64" width="354" height="40" rx="8" fill="var(--hb-card)" stroke="var(--hb-stroke)" stroke-width="2"/><rect x="548" y="64" width="354" height="40" rx="8" fill="var(--hb-card2)" stroke="none"/><text x="725.0" y="88.0" fill="var(--text)" font-size="10" font-weight="800" text-anchor="middle">MainFunctionPeriod, MsgCycleTime, TimeoutTime...</text><line x1="276" y1="134" x2="316" y2="134" stroke="var(--hb-ok)" stroke-width="2" marker-end="url(#b28_arr_ok)"/><rect x="316" y="114" width="224" height="40" rx="8" fill="var(--hb-card)" stroke="var(--hb-ok)" stroke-width="2"/><rect x="316" y="114" width="224" height="40" rx="8" fill="var(--hb-ok-bg)" stroke="none"/><text x="428.0" y="138.0" fill="var(--text)" font-size="11" font-weight="800" text-anchor="middle">3. CanNmPduConfig</text><rect x="548" y="114" width="354" height="40" rx="8" fill="var(--hb-card)" stroke="var(--hb-stroke)" stroke-width="2"/><rect x="548" y="114" width="354" height="40" rx="8" fill="var(--hb-card2)" stroke="none"/><text x="725.0" y="138.0" fill="var(--text)" font-size="10" font-weight="800" text-anchor="middle">PduNidPosition, PduCbvPosition, BaseCanId, NodeId...</text><line x1="276" y1="184" x2="316" y2="184" stroke="var(--hb-warn)" stroke-width="2" marker-end="url(#b28_arr_warn)"/><rect x="316" y="164" width="224" height="40" rx="8" fill="var(--hb-card)" stroke="var(--hb-warn)" stroke-width="2"/><rect x="316" y="164" width="224" height="40" rx="8" fill="var(--hb-warn-bg)" stroke="none"/><text x="428.0" y="188.0" fill="var(--text)" font-size="11" font-weight="800" text-anchor="middle">4. CanNmBurstConfig</text><rect x="548" y="164" width="354" height="40" rx="8" fill="var(--hb-card)" stroke="var(--hb-stroke)" stroke-width="2"/><rect x="548" y="164" width="354" height="40" rx="8" fill="var(--hb-card2)" stroke="none"/><text x="725.0" y="188.0" fill="var(--text)" font-size="10" font-weight="800" text-anchor="middle">ImmediateTransmissions, ImmediateCycleTime...</text><line x1="276" y1="234" x2="316" y2="234" stroke="var(--hb-vio)" stroke-width="2" marker-end="url(#b28_arr_vio)"/><rect x="316" y="214" width="224" height="40" rx="8" fill="var(--hb-card)" stroke="var(--hb-vio)" stroke-width="2"/><rect x="316" y="214" width="224" height="40" rx="8" fill="var(--hb-vio-bg)" stroke="none"/><text x="428.0" y="238.0" fill="var(--text)" font-size="11" font-weight="800" text-anchor="middle">5. CanNmPnFilterConfig</text><rect x="548" y="214" width="354" height="40" rx="8" fill="var(--hb-card)" stroke="var(--hb-stroke)" stroke-width="2"/><rect x="548" y="214" width="354" height="40" rx="8" fill="var(--hb-card2)" stroke="none"/><text x="725.0" y="238.0" fill="var(--text)" font-size="10" font-weight="800" text-anchor="middle">PnEnabled, PnFilterMask, PnResetTime...</text><line x1="276" y1="284" x2="316" y2="284" stroke="var(--hb-err)" stroke-width="2" marker-end="url(#b28_arr_err)"/><rect x="316" y="264" width="224" height="40" rx="8" fill="var(--hb-card)" stroke="var(--hb-err)" stroke-width="2"/><rect x="316" y="264" width="224" height="40" rx="8" fill="var(--hb-err-bg)" stroke="none"/><text x="428.0" y="288.0" fill="var(--text)" font-size="11" font-weight="800" text-anchor="middle">6. CanNmUserDataConfig</text><rect x="548" y="264" width="354" height="40" rx="8" fill="var(--hb-card)" stroke="var(--hb-stroke)" stroke-width="2"/><rect x="548" y="264" width="354" height="40" rx="8" fill="var(--hb-card2)" stroke="none"/><text x="725.0" y="288.0" fill="var(--text)" font-size="10" font-weight="800" text-anchor="middle">UserDataSupport, ComUserDataSupport...</text></svg>
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
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
