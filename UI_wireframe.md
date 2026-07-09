\# UI.md — Wireframe Specification



> \*\*Project:\*\* AI Security Armor for Agentic Workflows

> \*\*Scope:\*\* Website (5 trang) + App (3 chế độ chính)

> \*\*Không bao gồm:\*\* MCP Server \& Chrome Extension (không có giao diện riêng —

> Extension chỉ có badge/popup tối giản, MCP là giao thức máy-máy)

>

> \*\*Ký hiệu wireframe:\*\*

> `\[ Button ]` = nút bấm · `( Logo )` = logo/icon · `< Input >` = ô nhập liệu

> `{ Badge }` = nhãn động (màu theo mức rủi ro) · `\~\~\~` = nội dung text dài

> `═══` = phân vùng chính · `───` = phân vùng phụ



\---



\## PHẦN 1: WEBSITE



> Triết lý: Website là \*\*mặt tiền marketing + trải nghiệm thử nhanh\*\*.

> Người dùng mới thử qua Chat, người dùng thật được dẫn sang Extension/App

> (vì Extension check link trực tiếp hiệu quả hơn).



\### 1.1. Navigation Bar (dùng chung mọi trang)



```text

┌──────────────────────────────────────────────────────────────────────┐

│ ( Logo: AI Security Armor )   \[ Home ] \[ Pricing ] \[ About ] \[ Chat ]│

│                                          \[ Đăng nhập ] \[ Dùng thử ▶ ]│

└──────────────────────────────────────────────────────────────────────┘

```

\- Khi \*\*đã đăng nhập\*\*: `\[ Đăng nhập ] \[ Dùng thử ]` → `( Avatar ▾ )` 

&#x20; với dropdown: `\[ Tài khoản ] \[ Lịch sử scan ] \[ Đăng xuất ]`



\---



## 1.2. Trang HOME (Landing Page) — PHIÊN BẢN MỚI
> Hero cũ (tĩnh) được thay bằng Hero "Scroll-driven Video Reveal":
> Layer A (camera 3D) chạy theo % scroll · Layer B (video demo) autoplay/loop
> chạy độc lập theo thời gian, luôn dán đúng phối cảnh màn hình laptop.

┌──────────────────────────────────────────────────────────────────────┐
│                          NAVIGATION BAR                              │
╞══════════════════════ HERO — SCROLL 0% ═══════════════════════════════╡
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                                                                  │ │
│  │            [ VIDEO DEMO — autoplay/loop, full-screen ]           │ │
│  │                 (Layer B — chạy real-time)                      │ │
│  │                                                                  │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│         ~~~ chưa hiện laptop/bàn — camera áp sát màn hình ~~~        │
│                                                                      │
╞══════════════════════ HERO — SCROLL ~50% ══════════════════════════════╡
│                                                                      │
│                     ~~~ camera lùi ra (dolly-out) ~~~                │
│                                                                      │
│                    ┌──────────────────────────┐                     │
│                    │ [ VIDEO DEMO — vẫn dán    │                     │
│                    │   đúng góc màn hình ]     │  ◀── ( Laptop 3D )  │
│                    └──────────────────────────┘                     │
│                    ( Bàn làm việc — đang lộ dần )                    │
│                                                                      │
│         { Scroll progress: ●●●○○○○○ }  (Layer A — scrub theo scroll)│
│                                                                      │
╞══════════════════════ HERO — SCROLL 100% ══════════════════════════════╡
│                                                                      │
│              ( Toàn cảnh: laptop + bàn + không gian )                │
│                    ┌────────────────────┐                           │
│                    │ [ VIDEO DEMO — nhỏ  │                          │
│                    │   hơn, đúng phối    │                          │
│                    │   cảnh bàn ]        │                          │
│                    └────────────────────┘                           │
│                                                                      │
│          "AI có quyền hành động thay bạn thì AI cũng cần             │
│                một lớp giáp trước khi hành động"                     │
│                                                                      │
│        Đánh giá độ tin cậy URL, Email — cho người và AI agent        │
│                                                                      │
│      < Dán URL hoặc nội dung email để thử ngay...        > [ Quét ]  │
│                                                                      │
│         [ ▶ Cài Chrome Extension ]   [ Xem Demo 90 giây ]            │
│                                                                      │
╞══════════════════════════ 3 TRỤ CỘT ═════════════════════════════════╡
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐     │
│  │ ( icon: 🧠 )     │ │ ( icon: 🔬 )     │ │ ( icon: 🛡 )     │     │
│  │ Robust Risk Core │ │ Robustness Lab   │ │ MCP Armor        │     │
│  │ ~~~ mô tả ngắn   │ │ ~~~ mô tả ngắn   │ │ ~~~ mô tả ngắn   │     │
│  │ [ Tìm hiểu ]     │ │ [ Xem kết quả ]  │ │ [ Docs cho dev ] │     │
│  └──────────────────┘ └──────────────────┘ └──────────────────┘     │
╞══════════════════════ CÁCH HOẠT ĐỘNG (3 bước) ═══════════════════════╡
│   (1) Nhập/duyệt ──▶ (2) AI đánh giá + giải thích ──▶ (3) Quyết định │
╞══════════════════════════ SỐ LIỆU TIN CẬY ═══════════════════════════╡
│   { F1-score }   { Latency p95 }   { Số URL đã quét }  { Uptime }    │
╞═══════════════════════════════ FOOTER ═══════════════════════════════╡
│ ( Logo nhỏ )  [ Home ] [ Pricing ] [ About ] [ Privacy ] [ Contact ] │
└──────────────────────────────────────────────────────────────────────┘



\### 1.3. Trang PRICING



```text

┌──────────────────────────────────────────────────────────────────────┐

│                          NAVIGATION BAR                              │

╞══════════════════════════════════════════════════════════════════════╡

│                    "Chọn gói phù hợp với bạn"                        │

│                 \[ Theo tháng ] | \[ Theo năm -20% ]                   │

│                                                                      │

│  ┌────────────────┐ ┌────────────────────┐ ┌────────────────┐       │

│  │    FREE        │ │   PRO  ★ Phổ biến  │ │  TEAM / API    │       │

│  │    0đ          │ │   xxx.000đ /tháng  │ │  Liên hệ       │       │

│  ├────────────────┤ ├────────────────────┤ ├────────────────┤       │

│  │ ✓ 50 scan/ngày │ │ ✓ Không giới hạn   │ │ ✓ Tất cả Pro   │       │

│  │ ✓ Extension    │ │ ✓ Extension + App  │ │ ✓ MCP endpoint │       │

│  │ ✓ Chat cơ bản  │ │ ✓ Chat + giải thích│ │ ✓ API key      │       │

│  │ ✗ Email scan   │ │ ✓ Email scan       │ │ ✓ SLA + support│       │

│  │ ✗ MCP          │ │ ✗ MCP              │ │ ✓ Dashboard    │       │

│  │                │ │                    │ │                │       │

│  │ \[ Bắt đầu ]    │ │ \[ Dùng thử 7 ngày ]│ │ \[ Liên hệ ]    │       │

│  └────────────────┘ └────────────────────┘ └────────────────┘       │

│                                                                      │

╞═════════════════════════════ FAQ ════════════════════════════════════╡

│  ▸ Dữ liệu của tôi có bị lưu không?                                  │

│  ▸ MCP endpoint dùng với ChatGPT/Claude thế nào?                     │

│  ▸ Có hỗ trợ tiếng Việt không?                                       │

╞═══════════════════════════════ FOOTER ═══════════════════════════════╡

└──────────────────────────────────────────────────────────────────────┘

```



\---



\### 1.4. Trang ABOUT



```text

┌──────────────────────────────────────────────────────────────────────┐

│                          NAVIGATION BAR                              │

╞══════════════════════════════════════════════════════════════════════╡

│                     "Vì sao chúng tôi xây sản phẩm này"              │

│   \~\~\~ Câu chuyện: phishing nhắm vào người → giờ nhắm vào AI agent    │

│   \~\~\~ Prompt injection = phishing dành cho AI \~\~\~                    │

╞═══════════════════════ THREAT MODEL (hình minh họa) ═════════════════╡

│   \[ Sơ đồ: Attacker → Email/URL → { Người } và { AI Agent } ]        │

╞══════════════════════════════ ĐỘI NGŨ ═══════════════════════════════╡

│   ( ảnh ) Tên — vai trò   ( ảnh ) Tên — vai trò   ( ảnh ) ...        │

╞═══════════════════════════ CÔNG NGHỆ ════════════════════════════════╡

│   { LightGBM } { PhoBERT } { ONNX } { FastAPI } { MCP Protocol }     │

│                        \[ Đọc tài liệu kỹ thuật ]                     │

╞═══════════════════════════════ FOOTER ═══════════════════════════════╡

└──────────────────────────────────────────────────────────────────────┘

```



\---



\### 1.5. Trang CHAT (trải nghiệm thử — đơn giản chủ đích)



> Mục đích: khách mới \*\*thử nhanh không cần cài gì\*\*. Không cố thay thế

> Extension — cuối phiên chat luôn gợi ý cài Extension để bảo vệ thật.



```text

┌──────────────────────────────────────────────────────────────────────┐

│                          NAVIGATION BAR                              │

╞══════════════════════════════════════════════════════════════════════╡

│                                                                      │

│  ┌────────────────────────────────────────────────────────────────┐ │

│  │ ( 🛡 ) Chào bạn! Dán URL hoặc nội dung email vào đây,          │ │

│  │        tôi sẽ đánh giá độ tin cậy và giải thích lý do.          │ │

│  └────────────────────────────────────────────────────────────────┘ │

│                                                                      │

│                       ┌────────────────────────────────────────────┐│

│                       │ User: http://vietc0mbank-secure.xyz/login  ││

│                       └────────────────────────────────────────────┘│

│                                                                      │

│  ┌────────────────────────────────────────────────────────────────┐ │

│  │ ( 🛡 )  { ⛔ RỦI RO CAO — 94/100 }                              │ │

│  │  Lý do chính:                                                   │ │

│  │  • Domain giả mạo thương hiệu (homoglyph "0" thay "o")          │ │

│  │  • Không HTTPS · Domain mới đăng ký                             │ │

│  │  ▸ \[ Xem đầy đủ bằng chứng (SHAP) ]                             │ │

│  │  Khuyến nghị: KHÔNG truy cập, không nhập thông tin.             │ │

│  └────────────────────────────────────────────────────────────────┘ │

│                                                                      │

│  💡 Muốn được bảo vệ tự động khi duyệt web? \[ Cài Extension ]        │

│                                                                      │

├──────────────────────────────────────────────────────────────────────┤

│ < Dán URL hoặc nội dung email...                          > \[ Gửi ▶ ]│

│   \[ 📎 Tải file .eml ]                  Còn lại hôm nay: 47/50 scan  │

└──────────────────────────────────────────────────────────────────────┘

```



\---



\### 1.6. TÀI KHOẢN — Đăng nhập / Đăng ký / Quản lý



\*\*Đăng nhập (modal hoặc trang riêng):\*\*



```text

┌──────────────────────────────────┐

│        ( Logo )                  │

│        Đăng nhập                 │

│                                  │

│  < Email                       > │

│  < Mật khẩu                  👁 > │

│                                  │

│  \[        Đăng nhập        ]     │

│  ──────── hoặc ────────          │

│  \[ ( G ) Tiếp tục với Google ]   │

│                                  │

│  Chưa có tài khoản? \[ Đăng ký ]  │

│  \[ Quên mật khẩu? ]              │

└──────────────────────────────────┘

```



\*\*Trang Tài khoản (sau đăng nhập):\*\*



```text

┌──────────────────────────────────────────────────────────────────────┐

│                          NAVIGATION BAR                              │

╞═══════════╦══════════════════════════════════════════════════════════╡

│ SIDEBAR   ║  HỒ SƠ                                                   │

│           ║  ( Avatar )  < Tên hiển thị >   < Email (khóa) >         │

│ \[ Hồ sơ ] ║  \[ Đổi mật khẩu ]  \[ Lưu thay đổi ]                      │

│ \[ Gói \&   ║ ──────────────────────────────────────────────────────── │

│  Thanh    ║  GÓI HIỆN TẠI: { PRO }  hạn đến 02/08/2026               │

│  toán ]   ║  \[ Nâng cấp ] \[ Hủy gia hạn ]                            │

│ \[ Lịch sử ║ ──────────────────────────────────────────────────────── │

│  scan ]   ║  LỊCH SỬ SCAN (bảng)                                     │

│ \[ API/MCP ║  ┌─────────────┬─────────┬────────┬──────────┐           │

│  key ]    ║  │ Ngày        │ Loại    │ Điểm   │ Kết quả  │           │

│           ║  │ 02/07 18:32 │ URL     │ 94     │ { ⛔ }   │           │

│ \[ Đăng    ║  │ 02/07 17:10 │ Email   │ 12     │ { ✅ }   │           │

│  xuất ]   ║  └─────────────┴─────────┴────────┴──────────┘           │

╘═══════════╩══════════════════════════════════════════════════════════╛

```



\---



\## PHẦN 2: APP (Desktop)



> \*\*Triết lý thiết kế — "Browser Cover":\*\* App trông như một trình duyệt /

> trình đọc email, NHƯNG \*\*không bao giờ render nội dung thật\*\*. Vị trí đáng

> lẽ hiển thị trang web/nội dung thư sẽ hiển thị \*\*kết quả \& quá trình đánh

> giá\*\*. Đây vừa là UX vừa là quyết định bảo mật: nội dung độc hại không có

> cơ hội chạm vào mắt người dùng hay engine render.

>

> Điều hướng chính: 2 chế độ làm việc + cài đặt/tài khoản.



\### 2.1. Khung App tổng thể (App Shell)



```text

┌──────────────────────────────────────────────────────────────────────┐

│ ( Logo )  \[ 🌐 Website Check ] \[ ✉ Email Guard ]      \[ ⚙ ] ( 👤 ▾ ) │

╞══════════════════════════════════════════════════════════════════════╡

│                                                                      │

│                     VÙNG NỘI DUNG THEO CHẾ ĐỘ                        │

│                                                                      │

├──────────────────────────────────────────────────────────────────────┤

│ < Hỏi về kết quả đánh giá này...                          > \[ Gửi ▶ ]│

└──────────────────────────────────────────────────────────────────────┘

```

\- Thanh chat \*\*luôn cố định dưới cùng\*\* ở cả 2 chế độ — chat có ngữ cảnh

&#x20; (biết bạn đang xem URL/email nào để trả lời đúng đối tượng).



\---



\### 2.2. Chế độ 1: WEBSITE CHECK (browser cover)



\*\*Trạng thái ban đầu:\*\*



```text

┌──────────────────────────────────────────────────────────────────────┐

│ ( Logo )  \[ 🌐 Website Check\* ] \[ ✉ Email Guard ]     \[ ⚙ ] ( 👤 ▾ ) │

├──────────────────────────────────────────────────────────────────────┤

│  \[ ◀ ] \[ ▶ ] \[ ⟳ ]  < 🔍 Nhập URL cần kiểm tra...       > \[ Quét ▶ ] │

╞══════════════════════════════════════════════════════════════════════╡

│                                                                      │

│                        ( 🛡 icon lớn, mờ )                           │

│              "Nhập URL — chúng tôi kiểm tra thay bạn,                │

│               bạn không cần mở trang web nguy hiểm"                  │

│                                                                      │

│   Gần đây:  { ⛔ vietc0mbank...xyz }  { ✅ github.com }  { ⚠ bit.ly/x }│

├──────────────────────────────────────────────────────────────────────┤

│ < Hỏi về kết quả đánh giá này...                          > \[ Gửi ▶ ]│

└──────────────────────────────────────────────────────────────────────┘

```



\*\*Đang quét (quá trình đánh giá hiển thị theo pipeline thật):\*\*



```text

╞══════════════════════════════════════════════════════════════════════╡

│   Đang đánh giá: http://vietc0mbank-secure.xyz/login                 │

│                                                                      │

│   \[✓] Phân tích cấu trúc URL (15 đặc trưng)              0.03s       │

│   \[✓] Chạy model phân loại (LightGBM)                    0.05s       │

│   \[◌] Kiểm tra nội dung trang \& prompt injection...      ▓▓▓░░       │

│   \[ ] Sinh giải thích \& khuyến nghị                                  │

╞══════════════════════════════════════════════════════════════════════╡

```



\*\*Kết quả (thay thế hoàn toàn "trang web"):\*\*



```text

┌──────────────────────────────────────────────────────────────────────┐

│  \[ ◀ ] \[ ▶ ] \[ ⟳ ]  < http://vietc0mbank-secure.xyz/login >  { ⛔ 94 }│

╞══════════════════════════════════════════════════════════════════════╡

│  ┌──────────────────────┐  ┌──────────────────────────────────────┐ │

│  │   ĐIỂM RỦI RO        │  │  BẰNG CHỨNG (SHAP)                   │ │

│  │                      │  │  ▓▓▓▓▓▓▓▓ Homoglyph domain    +0.38  │ │

│  │      ⛔  94/100      │  │  ▓▓▓▓▓    Không HTTPS         +0.21  │ │

│  │    RỦI RO CAO        │  │  ▓▓▓▓     Domain mới < 7 ngày +0.17  │ │

│  │                      │  │  ▓▓       Path chứa "login"   +0.09  │ │

│  └──────────────────────┘  └──────────────────────────────────────┘ │

│  ┌────────────────────────────────────────────────────────────────┐ │

│  │ 📋 GIẢI THÍCH: Trang này giả mạo Vietcombank bằng ký tự "0"    │ │

│  │ thay "o". \~\~\~                                                   │ │

│  │ ⚠ PHÁT HIỆN THÊM: Nội dung trang chứa đoạn văn bản nghi là     │ │

│  │ prompt injection nhắm vào AI agent. { Injection: 0.87 }         │ │

│  └────────────────────────────────────────────────────────────────┘ │

│    \[ 🚫 Chặn domain này ]  \[ 📄 Xuất báo cáo ]  \[ ⚠ Báo sai ]        │

├──────────────────────────────────────────────────────────────────────┤

│ ( 🛡 ): "Trang này nguy hiểm vì..."   User: "vì sao homoglyph nặng?" │

│ < Hỏi về kết quả đánh giá này...                          > \[ Gửi ▶ ]│

└──────────────────────────────────────────────────────────────────────┘

```



\---



\### 2.3. Chế độ 2: EMAIL GUARD (email browser cover)



> Giao diện 2 cột như trình đọc mail quen thuộc. Mỗi thư có \*\*nhãn rủi ro\*\*.

> Click vào thư → cột phải hiển thị \*\*lý do chấm điểm\*\*, KHÔNG hiển thị

> nội dung thư gốc.



```text

┌──────────────────────────────────────────────────────────────────────┐

│ ( Logo )  \[ 🌐 Website Check ] \[ ✉ Email Guard\* ]     \[ ⚙ ] ( 👤 ▾ ) │

├──────────────────────────────────────────────────────────────────────┤

│ \[ ⟳ Đồng bộ ]  \[ 📎 Nhập file .eml ]     Lọc: \[ Tất cả ▾ ] \[ ⛔ ⚠ ✅ ]│

╞══════════════════════╦═══════════════════════════════════════════════╡

│ HỘP THƯ              ║  ĐÁNH GIÁ THƯ ĐANG CHỌN                       │

│                      ║                                               │

│ ┌──────────────────┐ ║  Từ: "Vietcombank" <noreply@vtcb-alert.xyz>   │

│ │{⛔ 91} "Vietcom..│ ║  Chủ đề: "Tài khoản của bạn sẽ bị khóa!"      │

│ │ Tài khoản sắp..  │◀║                                               │

│ └──────────────────┘ ║  ┌─────────────────────────────────────────┐  │

│ ┌──────────────────┐ ║  │        ⛔  91/100 — RỦI RO CAO           │  │

│ │{⚠ 55} "Khuyến   │ ║  └─────────────────────────────────────────┘  │

│ │ mãi đặc biệt.."  │ ║  VÌ SAO BỊ CHẤM ĐIỂM NÀY:                     │

│ └──────────────────┘ ║  • Domain gửi không thuộc Vietcombank         │

│ ┌──────────────────┐ ║  • Ngôn ngữ hối thúc ("sẽ bị khóa", "ngay")   │

│ │{✅ 8} "Biên bản  │ ║  • Chứa link tới domain {⛔ vtcb-alert.xyz}    │

│ │ họp tuần.."      │ ║  • ⚠ Phát hiện prompt injection ẩn nhắm       │

│ └──────────────────┘ ║    vào AI agent đọc thư { 0.83 }              │

│ ┌──────────────────┐ ║                                               │

│ │{✅ 3} "Hóa đơn   │ ║  \[ ▸ Xem bằng chứng chi tiết ]                │

│ │ tháng 6.."       │ ║  \[ 🚫 Chặn người gửi ] \[ ⚠ Báo sai ]          │

│ └──────────────────┘ ║  \[ 👁 Tôi hiểu rủi ro — xem thư gốc ]         │

╞══════════════════════╩═══════════════════════════════════════════════╡

│ < Hỏi về email này...                                     > \[ Gửi ▶ ]│

└──────────────────────────────────────────────────────────────────────┘

```

\- `\[ 👁 Tôi hiểu rủi ro — xem thư gốc ]`: lối thoát có chủ đích (sanitized

&#x20; view, link bị vô hiệu hóa) — người dùng luôn có quyền cuối cùng.



\---



\### 2.4. CÀI ĐẶT \& TÀI KHOẢN (trong app)



```text

┌──────────────────────────────────────────────────────────────────────┐

│ ( Logo )  \[ 🌐 Website Check ] \[ ✉ Email Guard ]     \[ ⚙\* ] ( 👤 ▾ ) │

╞═══════════╦══════════════════════════════════════════════════════════╡

│ \[ Chung ] ║  CHUNG                                                   │

│ \[ Bảo vệ ]║   Ngôn ngữ            \[ Tiếng Việt ▾ ]                   │

│ \[ Email  ]║   Khởi động cùng máy  \[ ✓ ]                              │

│ \[ Tài    ║   Giao diện           \[ Sáng | Tối | Hệ thống ]           │

│  khoản ] ║ ──────────────────────────────────────────────────────── │

│           ║  BẢO VỆ                                                  │

│           ║   Ngưỡng cảnh báo     \[ ──────●──── ] 60/100             │

│           ║   Tự chặn khi ⛔ ≥ 80 \[ ✓ ]                              │

│           ║   Quét prompt injection trong nội dung  \[ ✓ ]            │

│           ║ ──────────────────────────────────────────────────────── │

│           ║  TÀI KHOẢN                                               │

│           ║   ( Avatar )  user@email.com   Gói: { PRO }              │

│           ║   \[ Quản lý gói ]  \[ Đồng bộ lịch sử ]  \[ Đăng xuất ]    │

╘═══════════╩══════════════════════════════════════════════════════════╛

```



\---



\## PHẦN 3: NGUYÊN TẮC UI CHUNG



| Nguyên tắc | Áp dụng |

|---|---|

| \*\*Màu rủi ro nhất quán\*\* | ✅ Xanh (0–39) · ⚠ Vàng (40–69) · ⛔ Đỏ (70–100) — giống Extension badge |

| \*\*Không render nội dung độc hại\*\* | App chỉ hiển thị đánh giá; xem gốc phải qua sanitized view |

| \*\*Luôn có "vì sao"\*\* | Mọi điểm số đi kèm bằng chứng SHAP + giải thích ngôn ngữ tự nhiên |

| \*\*Chat có ngữ cảnh\*\* | Thanh chat dưới cùng biết đang xem URL/email nào |

| \*\*Web = thử, App/Extension = dùng thật\*\* | Web chat luôn có CTA dẫn sang Extension |

| \*\*Quyền cuối cùng thuộc người dùng\*\* | Có nút "báo sai" và "tôi hiểu rủi ro" ở mọi cảnh báo |



