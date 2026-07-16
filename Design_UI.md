---
title: "Design UI — AI Security Experience"
version: "1.0"
status: "Design direction / kế hoạch triển khai"
language: "vi"
---

# Design UI — AI Security Experience

## 1. Tuyên ngôn thiết kế

Web app được làm mới hoàn toàn như một **trung tâm phân tích nội dung bằng AI có cảm giác sống, thông minh và đáng tin cậy**. Trải nghiệm không mô phỏng dashboard SaaS thông thường; thay vào đó, giao diện được tổ chức như một **phòng thí nghiệm số có chiều sâu**, nơi dữ liệu đi qua một “lõi phân tích” và dần lộ ra các tín hiệu, bằng chứng, mức độ rủi ro và khuyến nghị.

Ba tính chất xuyên suốt:

1. **Cinematic nhưng có kiểm soát:** hiệu ứng tạo nhịp kể chuyện, không cản trở thao tác.
2. **Cá nhân hóa theo ngữ cảnh:** giao diện phản ứng với loại nội dung, mức rủi ro, hành vi và tùy chọn chuyển động của người dùng.
3. **Trust by design:** mọi kết luận đều đi kèm mức tin cậy, lý do, bằng chứng và giới hạn của AI.

> Nguyên tắc quan trọng: kỹ thuật nâng cao chỉ được dùng khi làm rõ ý nghĩa, trạng thái hoặc thứ bậc thông tin. Không biến sản phẩm thành một bản trình diễn hiệu ứng.

---

## 2. Mục tiêu sản phẩm

- Cho phép người dùng nhập/dán nội dung để AI đánh giá mức độ an toàn, đáng tin cậy hoặc rủi ro.
- Biến quá trình phân tích vốn trừu tượng thành một hành trình trực quan, dễ hiểu.
- Trình bày kết quả theo hai tầng: **kết luận nhanh** cho người phổ thông và **bằng chứng chi tiết** cho người cần kiểm chứng.
- Tạo cảm giác cá nhân nhưng không xâm phạm riêng tư.
- Hoạt động tốt trên desktop, tablet và mobile; trong đó desktop sử dụng bố cục dạng **workspace/editor Markdown**, còn mobile chuyển thành luồng thao tác tuần tự.

---

## 3. Đối tượng sử dụng

### 3.1. Người dùng phổ thông

Muốn kiểm tra nhanh một đoạn văn, email, tin nhắn, bài đăng hoặc nội dung đáng ngờ. Cần câu trả lời dễ đọc, ít thuật ngữ.

### 3.2. Người sáng tạo nội dung

Cần phân tích tính an toàn, thiên kiến, dấu hiệu thao túng, độ rõ ràng và các vấn đề có thể gây hiểu nhầm trước khi xuất bản.

### 3.3. Chuyên viên kiểm duyệt / an toàn thông tin

Cần xem bằng chứng, loại tín hiệu, mức tin cậy, lịch sử và khả năng xuất báo cáo.

### 3.4. Người dùng có nhu cầu tiếp cận đặc biệt

Cần tương phản cao, điều hướng bàn phím, giảm chuyển động, nội dung không phụ thuộc duy nhất vào màu sắc hoặc animation.

---

## 4. Kiến trúc thông tin và hệ thống trang

### 4.1. `/` — Home / Landing Page

Giới thiệu giá trị, minh họa cơ chế phân tích, các trường hợp sử dụng, nguyên tắc minh bạch và CTA bắt đầu đánh giá.

### 4.2. `/analyze` — Analysis Workspace

Trang cốt lõi để nhập nội dung, cấu hình mục tiêu phân tích, chạy đánh giá và xem kết quả. Desktop mang cấu trúc editor/workspace; mobile là quy trình theo bước.

### 4.3. `/result/:id` — Analysis Report

Báo cáo độc lập có thể lưu, chia sẻ hoặc xuất file; gồm điểm tổng quan, bằng chứng, phân loại tín hiệu, khuyến nghị và giới hạn của kết quả.

### 4.4. `/history` — Lịch sử phân tích

Danh sách hoặc timeline các lần phân tích, tìm kiếm, lọc theo loại nội dung, thời gian và mức rủi ro. Có chế độ riêng tư và xóa dữ liệu rõ ràng.

### 4.5. `/methodology` — Phương pháp & Minh bạch

Giải thích hệ thống đánh giá gì, cách đọc điểm, các giới hạn, quyền riêng tư và nguyên tắc AI có trách nhiệm.

### 4.6. `/settings` — Cá nhân hóa

Thiết lập giao diện, mức chuyển động, độ tương phản, ngôn ngữ, phong cách giải thích, lưu lịch sử và tùy chọn dữ liệu.

### 4.7. Các trạng thái hệ thống

- Trang lỗi 404 có điều hướng phục hồi.
- Trạng thái offline/mất kết nối.
- Trạng thái phân tích thất bại hoặc dữ liệu không đủ.
- Skeleton/loading và empty state riêng cho từng khu vực.

---

## 5. Big Idea — “Signal Core”

Biểu tượng trung tâm của sản phẩm là **Signal Core**: một lõi dữ liệu hình cầu/khối hữu cơ được tạo từ điểm, đường và trường lực. Nó thay đổi theo trạng thái:

- **Chưa có dữ liệu:** chuyển động nhẹ như đang chờ tín hiệu.
- **Đang nhập:** các hạt hội tụ theo nhịp gõ, biểu thị dữ liệu được hình thành.
- **Đang phân tích:** dòng hạt đi qua nhiều lớp lọc; camera tiến gần vào lõi.
- **Rủi ro thấp:** cấu trúc ổn định, màu cyan/teal dịu.
- **Cần chú ý:** cấu trúc bị nhiễu nhẹ, xuất hiện amber.
- **Rủi ro cao:** trường lực phân mảnh, coral/red xuất hiện có kiểm soát.

Signal Core được dùng xuyên suốt landing, workspace và report để tạo bản sắc thống nhất, nhưng mỗi trang có mức độ chi tiết khác nhau.

---

## 6. Ngôn ngữ thị giác

### 6.1. Phong cách

**Dark spatial interface + editorial clarity**: nền tối có chiều sâu, lớp kính mờ tiết chế, typography rõ như một tạp chí công nghệ và các tín hiệu màu có ý nghĩa.

Không sử dụng neon tràn lan, glow dày, glassmorphism ở mọi nơi hoặc card bo góc đồng dạng. Không gian phải có vùng nghỉ, mảng đặc và nhịp tương phản.

### 6.2. Bảng màu chính

| Token | Màu | Vai trò |
|---|---:|---|
| `Void 950` | `#05070D` | Nền sâu nhất |
| `Void 900` | `#090D16` | Nền chính |
| `Slate 850` | `#111827` | Surface/editor |
| `Slate 700` | `#273449` | Border, divider |
| `Mist 100` | `#E8EEF7` | Văn bản chính |
| `Mist 300` | `#AAB7C8` | Văn bản phụ |
| `Signal Cyan` | `#4DE6E1` | Primary/action, trạng thái an toàn |
| `Electric Violet` | `#8E7CFF` | AI, chiều sâu, secondary accent |
| `Amber` | `#FFBD59` | Cảnh báo trung bình |
| `Coral` | `#FF6577` | Rủi ro cao/lỗi |
| `Success Mint` | `#57E3A0` | Hoàn thành/tích cực |

### 6.3. Gradient

- **Brand field:** `#4DE6E1 → #8E7CFF`, chỉ dùng cho Signal Core, CTA chính hoặc focus đặc biệt.
- **Risk field:** `#FFBD59 → #FF6577`, dùng theo dữ liệu, không làm màu trang trí.
- Nền có radial gradient cực nhẹ để định hướng ánh nhìn; luôn bảo đảm tương phản văn bản.

### 6.4. Chế độ sáng

Light mode không đảo màu máy móc. Nền là `#F5F7FA`, surface `#FFFFFF`, chữ `#101522`; Signal Cyan được hạ độ sáng để đủ tương phản. Người dùng có thể chọn Dark, Light hoặc System.

---

## 7. Kiểu chữ

### 7.1. Font đề xuất

- **Display:** `Sora Variable` — hình học, hiện đại, dùng cho tiêu đề lớn.
- **UI/Body:** `Inter Variable` — rõ ràng ở kích thước nhỏ, hỗ trợ tiếng Việt tốt.
- **Editor/Code/Data:** `JetBrains Mono Variable` — dùng cho vùng nhập kiểu Markdown, chỉ số và metadata.

Font phải được self-host và subset phù hợp để giảm tải.

### 7.2. Thang chữ fluid

- Display XL: `clamp(3rem, 7vw, 7.5rem)`, line-height `0.94`.
- H1: `clamp(2.25rem, 5vw, 5rem)`.
- H2: `clamp(1.75rem, 3.2vw, 3.5rem)`.
- H3: `clamp(1.25rem, 2vw, 2rem)`.
- Body L: `1.125rem–1.25rem`.
- Body: `1rem`, line-height `1.65`.
- Caption/Data: `0.75rem–0.875rem`.

Quy tắc: dòng nội dung dài tối đa `68ch`; tiêu đề tối đa `14–18ch` để giữ nhịp thị giác.

---

## 8. Grid, kích thước và bố cục

### 8.1. Grid

- Desktop ≥ 1280px: 12 cột, max-width `1440px`, gutter `24–32px`.
- Tablet 768–1279px: 8 cột.
- Mobile < 768px: 4 cột, lề `16–20px`.
- Spacing theo hệ 4px, các mốc chính: `4, 8, 12, 16, 24, 32, 48, 64, 96, 128`.

### 8.2. Hình khối

- Radius nhỏ `8px` cho control, `16px` cho panel, `24px` cho khối nổi bật.
- Không bo tròn mọi thành phần; editor và data table có cạnh thẳng hơn để giữ cảm giác công cụ chuyên nghiệp.
- Border 1px với độ tương phản thấp; trạng thái focus dùng outline 2px rõ ràng.

### 8.3. Layer chiều sâu

1. **Environment:** gradient, noise rất nhẹ.
2. **Atmosphere:** hạt và trường sáng.
3. **Content:** typography, ảnh, panel.
4. **Interaction:** cursor, tooltip, selection.
5. **System:** modal, toast, command palette.

---

## 9. Thiết kế chi tiết Landing Page

### 9.1. Header nổi thích ứng

**Nội dung:** logo Signal Core, Sản phẩm, Cách hoạt động, Minh bạch, nút “Bắt đầu phân tích”, chuyển theme và menu cá nhân.

**Kỹ thuật:** header trong suốt khi ở đầu trang, chuyển sang nền đặc và thu gọn khi cuộn; spotlight mềm đi theo focus/cursor trong vùng nav.

**Mục đích:** giữ điều hướng hiện diện nhưng không che hero; phản hồi trạng thái cuộn một cách tự nhiên.

### 9.2. Hero — “Nhìn thấy tín hiệu ẩn trong nội dung”

**Nội dung:** headline ngắn, mô tả giá trị, CTA chính “Phân tích nội dung”, CTA phụ “Xem cách hoạt động”, demo input một dòng và các chỉ số tin cậy.

**Kỹ thuật:**

- WebGL Signal Core 3D nằm sau/phải nội dung.
- Cursor spotlight chỉ tác động lên lớp noise/particle, không làm chữ khó đọc.
- Multi-layer parallax: chữ, core, hạt và nền có tốc độ khác nhau.
- Fluid cursor trên desktop pointer chính xác; tự tắt trên touch device.
- Intro reveal bằng mask/clip-path, không dùng stagger quá dài.

**Ý tưởng:** nội dung của người dùng được biến thành các tín hiệu có thể quan sát.

**Mục đích:** truyền đạt ngay giá trị sản phẩm trong 5 giây đầu và tạo nhận diện khác biệt.

### 9.3. Trust strip

**Nội dung:** “Giải thích được”, “Quyền riêng tư có kiểm soát”, “Không kết luận tuyệt đối”, “Thiết kế cho con người”.

**Kỹ thuật:** marquee cực chậm hoặc hàng tĩnh tùy `prefers-reduced-motion`; icon SVG line morph nhẹ khi vào viewport.

**Mục đích:** cân bằng cảm giác futuristic bằng thông điệp tin cậy.

### 9.4. Scrollytelling — Hành trình qua lõi phân tích

Một section cao khoảng 300–400vh, nội dung sticky chia thành bốn chương:

1. **Input:** dữ liệu thô xuất hiện như dòng hạt.
2. **Detect:** các lớp tín hiệu được tách thành nhóm.
3. **Reason:** bằng chứng kết nối thành mạng quan hệ.
4. **Explain:** mạng dữ liệu thu lại thành báo cáo rõ ràng.

**Kỹ thuật:** camera fly-through theo scroll, WebGL shader transition giữa các chương, SVG morph cho sơ đồ phụ, text reveal đồng bộ với tiến trình cuộn.

**Mục đích:** giải thích công nghệ bằng trải nghiệm thay vì đoạn văn dài.

**Giới hạn:** camera chỉ di chuyển theo một trục chính, easing có quán tính nhẹ; không xoay tự do gây chóng mặt. Reduced-motion thay bằng bốn scene tĩnh và crossfade.

### 9.5. Interactive use cases

**Nội dung:** Email đáng ngờ, bài đăng mạng xã hội, nội dung xuất bản, phản hồi người dùng.

**Kỹ thuật:** physics-based cards có lực hút nhẹ khi hover; click một card làm Signal Core đổi cấu trúc và cập nhật demo kết quả. Không dùng hiệu ứng “tilt” quá 3–4 độ.

**Mục đích:** giúp người dùng nhận ra tình huống của mình và đi thẳng vào mẫu phân tích tương ứng.

### 9.6. Live analysis preview

**Nội dung:** workspace thu gọn với ví dụ đầu vào, điểm rủi ro, highlight bằng chứng và khuyến nghị.

**Kỹ thuật:** spotlight reveal kéo ngang để so sánh “Nội dung thô” với “Tín hiệu được phát hiện”; shader distortion nhỏ tại đường phân cách.

**Mục đích:** chứng minh đầu ra cụ thể trước khi yêu cầu người dùng đăng nhập hoặc nhập dữ liệu.

### 9.7. Methodology / Transparency

**Nội dung:** hệ thống có thể làm gì, không thể làm gì, cách đọc độ tin cậy và nguyên tắc bảo vệ dữ liệu.

**Kỹ thuật:** bố cục editorial, sơ đồ SVG morph từ “black box” thành các lớp giải thích. Animation đơn giản, ưu tiên đọc hiểu.

**Mục đích:** giảm sự thần bí hóa AI và thiết lập kỳ vọng đúng.

### 9.8. Final CTA

**Nội dung:** “Đưa nội dung vào ánh sáng”, nút bắt đầu, tùy chọn thử dữ liệu mẫu.

**Kỹ thuật:** particle field tương tác thời gian thực hội tụ quanh CTA; hạt tránh con trỏ và phản ứng lực nhẹ khi click.

**Mục đích:** kết thúc hành trình bằng hình ảnh dữ liệu đã được tổ chức, thúc đẩy chuyển đổi.

### 9.9. Footer

Liên kết sản phẩm, phương pháp, quyền riêng tư, điều khoản, hỗ trợ, trạng thái hệ thống; không sử dụng animation nặng.

---

## 10. Analysis Workspace — Trang nhập và đánh giá

### 10.1. Desktop layout

Bố cục ba vùng có thể resize:

1. **Rail trái (64–280px):** tạo phân tích mới, lịch sử gần đây, mẫu nội dung, collection.
2. **Editor trung tâm (45–55%):** vùng nhập phong cách Markdown/editor, toolbar tối giản, word count, trạng thái lưu.
3. **Inspector phải (35–45%):** cấu hình phân tích trước khi chạy; sau khi chạy sẽ chuyển thành kết quả và bằng chứng.

Top bar chứa breadcrumb, tên tài liệu, trạng thái riêng tư, nút chia sẻ/xuất và hồ sơ. Bottom status bar hiển thị ngôn ngữ, số từ, mô hình/chế độ phân tích và trạng thái kết nối.

### 10.2. Vùng nhập kiểu Markdown

- Hỗ trợ plain text và Markdown cơ bản.
- Placeholder gồm các gợi ý có thể chọn: email, bài đăng, bài viết, phản hồi.
- Có drag & drop file nếu tính năng backend hỗ trợ; định dạng chưa hỗ trợ phải báo rõ.
- Slash command `/` để chèn mẫu hoặc chọn mục tiêu phân tích.
- Command palette `Ctrl/Cmd + K` cho thao tác nhanh.
- Selection toolbar để “chỉ phân tích đoạn đã chọn”.
- Auto-save hiển thị kín đáo; không giả định dữ liệu được lưu cloud nếu chưa có đồng ý.

### 10.3. Cấu hình đánh giá

- Loại nội dung.
- Mục tiêu: an toàn, lừa đảo/thao túng, độc hại, thiên kiến, tính đáng tin, độ rõ ràng.
- Đối tượng đọc dự kiến.
- Mức chi tiết: Nhanh / Cân bằng / Chuyên sâu.
- Giọng giải thích: Dễ hiểu / Chuyên môn.
- Tùy chọn ẩn dữ liệu nhạy cảm trước khi gửi.

### 10.4. Nút phân tích

CTA sticky ở đáy inspector: **“Phân tích nội dung”**. Nút chỉ sáng mạnh khi đầu vào hợp lệ. Keyboard shortcut được hiển thị nhưng không thay thế nhãn.

### 10.5. Trạng thái đang phân tích

**Kỹ thuật:** Signal Core thu nhỏ nằm trong inspector; các hạt đi qua từng lớp tương ứng với bước xử lý. Text trạng thái trung thực như “Đang nhận diện tín hiệu”, “Đang tổng hợp bằng chứng”, không hiển thị phần trăm giả.

**Mục đích:** biến thời gian chờ thành giải thích tiến trình, đồng thời duy trì niềm tin.

### 10.6. Kết quả trong workspace

Inspector chuyển thành các tab:

- **Tổng quan:** điểm, nhãn mức độ, tóm tắt 2–3 câu.
- **Tín hiệu:** các nhóm vấn đề và mức tin cậy.
- **Bằng chứng:** trích đoạn liên kết hai chiều với editor.
- **Khuyến nghị:** bước xử lý, chỉnh sửa hoặc kiểm chứng.
- **Giới hạn:** điều hệ thống chưa chắc chắn.

Khi hover/focus một bằng chứng ở inspector, đoạn tương ứng trong editor được highlight; khi chọn highlight trong editor, inspector cuộn tới giải thích tương ứng.

### 10.7. Mobile layout

Không ép ba panel vào màn hình hẹp. Chuyển thành ba bước:

1. **Nhập nội dung.**
2. **Chọn cách đánh giá.**
3. **Xem báo cáo.**

Thanh hành động cố định ở đáy; kết quả dùng accordion và bottom sheet. WebGL được giảm số hạt hoặc thay bằng Canvas 2D/SVG.

---

## 11. Analysis Report

### 11.1. Hero báo cáo

- Tên tài liệu và thời gian.
- Risk dial dạng vòng cung, luôn kèm nhãn văn bản.
- Tóm tắt kết luận.
- Mức tin cậy và phạm vi đánh giá.
- Hành động: lưu, chia sẻ, xuất, phân tích lại.

**Kỹ thuật:** SVG morph từ Signal Core thành risk dial khi chuyển từ workspace sang report; shared-element transition nếu trình duyệt hỗ trợ View Transitions API.

### 11.2. Evidence map

Bản đồ quan hệ giữa trích đoạn, loại tín hiệu và kết luận.

**Kỹ thuật:** generative graph layout có physics nhẹ; người dùng có thể kéo node, zoom, khóa hoặc chuyển sang danh sách accessible.

**Mục đích:** cho chuyên gia thấy logic liên kết mà không biến kết quả thành “điểm số bí ẩn”.

### 11.3. Timeline / Layers

Phân tích lần lượt theo các lớp: ngôn ngữ, ý định, mẫu thao túng, độ tin cậy, tác động tiềm ẩn. Scroll-driven animation chỉ dùng để mở từng lớp, không khóa cuộn.

### 11.4. Action plan

Khuyến nghị được chia thành:

- Làm ngay.
- Nên kiểm chứng thêm.
- Có thể bỏ qua.

Mỗi hành động giải thích lý do và tác động; cho phép copy hoặc tạo phiên bản nội dung đã chỉnh sửa nếu sản phẩm hỗ trợ.

---

## 12. History, Methodology và Settings

### 12.1. History

- Search lớn ở đầu trang.
- Filter chips theo ngày, loại, mức rủi ro.
- Hai chế độ list và timeline.
- Preview báo cáo không cần mở trang mới.
- Bulk delete và retention policy dễ tìm.

Animation chỉ dùng cho chuyển chế độ list/timeline và reordering có FLIP transition.

### 12.2. Methodology

Bố cục tài liệu đọc dài, mục lục sticky, biểu đồ giải thích, glossary và FAQ. Không dùng 3D nền liên tục; chỉ một mô hình SVG/WebGL nhẹ ở phần đầu.

### 12.3. Settings / Personalization

- Theme: Dark / Light / System.
- Motion: Full / Balanced / Reduced.
- Mật độ: Comfortable / Compact.
- Chế độ giải thích: Dễ hiểu / Chuyên gia.
- Màu nhấn tùy chọn trong một tập màu đã kiểm tra tương phản.
- Quyền lưu lịch sử, thời hạn lưu và xóa toàn bộ dữ liệu.
- Webcam/microphone là **opt-in**, tắt mặc định.

---

## 13. Hệ thống cá nhân hóa

### 13.1. Cá nhân hóa không cần dữ liệu nhạy cảm

- Ghi nhớ theme, motion, density và kiểu giải thích trên thiết bị.
- Gợi ý template dựa trên loại nội dung người dùng chọn gần đây.
- Dashboard chào theo thời điểm ở mức vừa phải, không phô trương tên liên tục.
- Kết quả tự điều chỉnh độ sâu giải thích theo lựa chọn, không tự suy đoán trình độ.

### 13.2. Adaptive visual state

Màu, mật độ hạt và cấu trúc Signal Core thay đổi theo loại nội dung và trạng thái rủi ro. Thay đổi chỉ mang tính hỗ trợ; nội dung, icon và nhãn vẫn là nguồn thông tin chính.

### 13.3. Webcam / audio reactive — chế độ trải nghiệm tùy chọn

Trong landing có thể cung cấp nút **“Bật chế độ phản ứng môi trường”**:

- Microphone chỉ dùng biên độ/tần số cục bộ để làm particle field phản ứng theo âm thanh.
- Webcam chỉ dùng optical flow hoặc luminance cục bộ để tạo distortion nền.
- Không upload, không ghi hình, có indicator rõ ràng và nút tắt ngay lập tức.
- Đây là lớp ambient, không ảnh hưởng kết quả phân tích.

Tính năng không được tự bật, không phải điều kiện để sử dụng sản phẩm và có fallback hoàn chỉnh.

---

## 14. Motion system

### 14.1. Nguyên tắc

- Motion phải trả lời một trong ba câu hỏi: “Tôi đang ở đâu?”, “Điều gì vừa thay đổi?”, “Tôi nên nhìn vào đâu?”.
- Micro interaction: `120–220ms`.
- Panel/route transition: `280–500ms`.
- Cinematic scene: điều khiển bằng scroll progress, có snap logic mềm ở mốc nội dung.
- Easing vật lý: spring damping cao cho UI; spring mềm hơn chỉ dùng với particle/card.

### 14.2. Cursor effects

- Fluid cursor chỉ trên thiết bị có `pointer: fine`.
- Cursor mặc định vẫn hiện hoặc replacement phải có độ trễ gần như bằng 0.
- Spotlight có bán kính nhỏ, opacity thấp; tắt trong editor để không gây nhiễu lúc đọc/gõ.
- Magnetic button tối đa 6–8px dịch chuyển.

### 14.3. Scroll-driven cinematic

- Ưu tiên CSS Scroll-driven Animations khi hỗ trợ; fallback Intersection Observer.
- Không hijack scroll.
- Không khóa wheel/touch.
- Nội dung phải đọc được nếu JavaScript/WebGL lỗi.

### 14.4. SVG morph

Dùng cho icon trạng thái, sơ đồ phương pháp và chuyển Signal Core → risk dial. Mọi path morph phải giữ silhouette dễ nhận biết và có fallback crossfade.

### 14.5. Physics interaction

Dùng cho evidence graph, use-case cards và particle CTA. Không áp dụng vật lý lên form, text input hoặc navigation vì sẽ làm giảm độ chính xác thao tác.

---

## 15. WebGL, WebGPU và generative graphics

### 15.1. Phân tầng công nghệ

- **Baseline:** HTML/CSS/SVG đầy đủ chức năng.
- **Enhanced:** Canvas/WebGL2 cho Signal Core và shader transition.
- **Advanced:** WebGPU/GPGPU particle simulation nếu được hỗ trợ và thiết bị đủ mạnh.

### 15.2. Progressive enhancement

- Tự đánh giá GPU tier và FPS trong vài giây đầu.
- High: 50k–150k particles tùy thiết bị.
- Medium: 10k–30k particles, shader đơn giản.
- Low/mobile: 1k–5k particles hoặc texture/video pre-rendered.
- Reduced motion: scene tĩnh + opacity transition.
- `saveData` hoặc pin yếu: tắt simulation liên tục.

### 15.3. Shader transition

Dùng displacement/noise để chuyển giữa các trạng thái dữ liệu, tối đa 600–900ms. Không distortion chữ hoặc control; shader chỉ tác động vào lớp visual.

### 15.4. Procedural identity

Từ một seed không nhạy cảm (ID phiên hoặc ID báo cáo), sinh ra cấu trúc Signal Core riêng. Nhờ đó mỗi báo cáo có “dấu vân tay thị giác” nhưng không mã hóa dữ liệu cá nhân vào hình ảnh.

---

## 16. Component system

### 16.1. Thành phần nền tảng

- Button: primary, secondary, ghost, danger, icon.
- Input, textarea/editor, select, segmented control, checkbox, switch.
- Tooltip, popover, dropdown, command palette.
- Modal, drawer, bottom sheet, toast.
- Tabs, accordion, breadcrumb, pagination.
- Badge trạng thái và confidence indicator.

### 16.2. Thành phần đặc thù

- `SignalCore`
- `RiskDial`
- `EvidenceHighlight`
- `EvidenceGraph`
- `AnalysisProgress`
- `ConfidenceMeter`
- `FindingCard`
- `RecommendationStep`
- `PrivacyIndicator`
- `ContentTemplatePicker`
- `ResizableWorkspace`

### 16.3. Quy tắc card

Card không phải container mặc định cho mọi nội dung. Chỉ dùng khi một nhóm có hành động/trạng thái độc lập. Các phần editorial dùng divider và khoảng trắng thay cho card lồng card.

---

## 17. Nội dung và UX writing

### 17.1. Giọng điệu

- Bình tĩnh, rõ ràng, không phán xét.
- Không nói “AI chắc chắn rằng…”.
- Dùng “Hệ thống phát hiện…”, “Có dấu hiệu…”, “Nên kiểm chứng…”.
- Luôn phân biệt **rủi ro**, **bằng chứng** và **độ tin cậy**.

### 17.2. Ví dụ microcopy

- Empty editor: “Dán nội dung bạn muốn kiểm tra, hoặc bắt đầu bằng một mẫu.”
- Loading: “Đang liên kết tín hiệu với bằng chứng…”
- Low confidence: “Chưa đủ ngữ cảnh để đưa ra đánh giá đáng tin cậy.”
- Error: “Phân tích chưa hoàn tất. Nội dung của bạn vẫn còn trong trình soạn thảo.”
- Privacy: “Nội dung chỉ được gửi khi bạn nhấn Phân tích.”

### 17.3. Điểm số

Không chỉ hiển thị `82/100`. Phải có:

- Nhãn: Thấp / Cần chú ý / Cao / Nghiêm trọng.
- Khoảng tin cậy hoặc mức confidence.
- Các yếu tố chính làm tăng/giảm điểm.
- Cảnh báo rằng điểm không thay thế đánh giá của con người.

---

## 18. Accessibility

Mục tiêu tối thiểu **WCAG 2.2 AA**.

- Tương phản chữ và control đạt chuẩn ở cả hai theme.
- Mọi thao tác thực hiện được bằng bàn phím.
- Focus ring rõ, không bị animation che.
- Có skip link và landmark đúng semantic.
- Graph/3D luôn có bản danh sách hoặc mô tả tương đương.
- Không truyền đạt rủi ro chỉ bằng màu; dùng icon, nhãn và pattern.
- Tôn trọng `prefers-reduced-motion`, `prefers-contrast`, `forced-colors`.
- Screen reader được thông báo trạng thái phân tích bằng live region nhưng không spam.
- Canvas/WebGL đặt `aria-hidden` nếu chỉ trang trí.
- Touch target tối thiểu 44×44px.

---

## 19. Responsive và input modality

- Desktop ưu tiên productivity và đa panel.
- Tablet dùng editor + inspector dạng drawer.
- Mobile dùng step flow, bottom sheet và nội dung một cột.
- Hover effect chỉ kích hoạt khi thiết bị thực sự hỗ trợ hover.
- Không sử dụng cursor replacement trên touch/stylus.
- Landscape mobile phải giữ được CTA và editor mà không che bàn phím ảo.

---

## 20. Performance budget

- LCP mục tiêu ≤ 2.5s trên thiết bị tầm trung.
- INP ≤ 200ms; CLS ≤ 0.1.
- JavaScript ban đầu cho landing ≤ 220KB gzip, phần 3D lazy-load.
- Workspace không tải scene cinematic của landing.
- WebGL canvas dừng render khi tab ẩn hoặc ngoài viewport.
- Texture nén, font subset, icon SVG inline có chọn lọc.
- Route-level code splitting và prefetch theo ý định người dùng.
- Giữ 60fps ở desktop tốt; tự giảm chất lượng nếu duy trì dưới 45fps.

---

## 21. Quyền riêng tư và an toàn

- Webcam/microphone tắt mặc định, xin quyền đúng thời điểm và giải thích trước khi mở prompt hệ điều hành.
- Xử lý visual reactive tại máy; không lưu media.
- Chế độ phân tích riêng tư không lưu lịch sử.
- Có redaction preview cho email, số điện thoại và dữ liệu nhận dạng.
- Hiển thị rõ nội dung được lưu ở đâu, trong bao lâu và cách xóa.
- Không dùng dark pattern để ép đăng ký, bật quyền hoặc chia sẻ dữ liệu.

---

## 22. Các kỹ thuật được chọn và vị trí sử dụng

| Kỹ thuật | Vị trí | Mục đích | Không dùng khi |
|---|---|---|---|
| Cursor spotlight | Header, hero, CTA cuối | Dẫn mắt, tạo phản hồi không gian | Touch, reduced motion, editor |
| Spotlight reveal | Live preview | So sánh trước/sau phân tích | Màn hình nhỏ nếu làm giảm đọc hiểu |
| Multi-layer parallax | Hero | Tạo chiều sâu thương hiệu | Thiết bị yếu/reduced motion |
| Scroll cinematic | How it works | Kể quy trình phân tích | Không hijack scroll |
| SVG morph | Methodology, route transition | Biến trạng thái trừu tượng thành dễ hiểu | Fallback crossfade |
| Fluid cursor | Landing desktop | Tăng cảm giác vật lý | Form, editor, touch |
| WebGL shader transition | Signal Core scenes | Chuyển trạng thái dữ liệu mượt | Không áp lên chữ/control |
| 3D camera fly-through | Scrollytelling | Cho người dùng “đi qua” quy trình | Reduced motion/mobile thấp |
| Particle system | Signal Core, final CTA, loading | Biểu diễn tín hiệu và tiến trình | Tự giảm theo GPU |
| Physics interaction | Evidence graph, use-case cards | Thể hiện quan hệ, tăng khám phá | Navigation/form |
| Generative graphics | Report identity | Cá nhân hóa mỗi báo cáo | Không dùng dữ liệu nhạy cảm làm seed |
| Webcam/audio distortion | Ambient mode tùy chọn | Trải nghiệm cá nhân theo môi trường | Không tự bật, không upload |
| WebGPU/GPGPU | Particle simulation cao cấp | Quy mô hạt lớn, phản ứng thời gian thực | Fallback WebGL/Canvas bắt buộc |

---

## 23. Những kỹ thuật chủ động không lạm dụng

- Không đặt scene 3D nặng trên mọi trang.
- Không dùng smooth-scroll làm thay đổi hành vi cuộn mặc định.
- Không làm text chạy theo cursor hoặc méo liên tục.
- Không dùng âm thanh tự động.
- Không dùng hiệu ứng webcam như tính năng bắt buộc.
- Không để animation trì hoãn khả năng bấm CTA.
- Không dùng glassmorphism trên mọi surface.
- Không hiển thị dashboard dày đặc chỉ để tạo cảm giác “chuyên nghiệp”.

---

## 24. Lộ trình triển khai UI

### Giai đoạn 1 — Foundation

- Design tokens: màu, type, spacing, radius, elevation, motion.
- Semantic HTML, responsive grid, theme và accessibility baseline.
- Component primitives và trạng thái form.

### Giai đoạn 2 — Product core

- Analysis Workspace desktop/mobile.
- Luồng nhập → cấu hình → loading → kết quả.
- Report, evidence linking, history và settings.
- Mock data contract rõ ràng để tích hợp backend.

### Giai đoạn 3 — Brand experience

- Landing page và Signal Core bản WebGL.
- Scrollytelling, shader transition, SVG morph.
- Route/View transitions có fallback.

### Giai đoạn 4 — Advanced interaction

- Evidence graph physics.
- WebGPU/GPGPU tier cao.
- Ambient webcam/audio opt-in.
- Procedural report identity.

### Giai đoạn 5 — Hardening

- Audit WCAG, keyboard và screen reader.
- Performance profiling trên thiết bị thấp/trung/cao.
- Giảm motion, fallback không WebGL và xử lý lỗi.
- Visual regression, responsive QA và usability test.

---

## 25. Tiêu chí nghiệm thu thiết kế

1. Người mới hiểu sản phẩm làm gì trong 5 giây đầu của landing.
2. Người dùng hoàn thành một lượt phân tích mà không cần hướng dẫn ngoài giao diện.
3. Kết quả luôn có bằng chứng, confidence và giới hạn.
4. Desktop có workspace hiệu quả; mobile không phải bản thu nhỏ của desktop.
5. Toàn bộ chức năng cốt lõi vẫn dùng được khi WebGL/WebGPU bị tắt.
6. Reduced-motion không làm mất nội dung hoặc ngữ cảnh.
7. Không có quyền webcam/microphone nào được yêu cầu trước thao tác chủ động.
8. Hiệu ứng nâng cao không ảnh hưởng nhập liệu, focus hoặc độ trễ tương tác.
9. Giao diện thống nhất qua token, typography, motion và biểu tượng Signal Core.
10. Đạt mục tiêu WCAG 2.2 AA và Core Web Vitals đã đặt ra.

---

## 26. Kết luận định hướng

Bản thiết kế chọn một số kỹ thuật nâng cao có vai trò rõ ràng thay vì đưa tất cả hiệu ứng vào cùng lúc. **Signal Core**, camera fly-through và particle simulation tạo lớp nhận diện cinematic; editor dạng Markdown, evidence linking và report nhiều tầng đảm bảo giá trị sử dụng thực tế; progressive enhancement, accessibility và privacy giữ trải nghiệm bền vững.

Khi chuyển sang giai đoạn code, thứ tự ưu tiên là: **luồng sản phẩm hoàn chỉnh → responsive/accessibility → motion có ý nghĩa → 3D/WebGPU nâng cao**. Nhờ đó giao diện vẫn là một sản phẩm đáng tin cậy trước khi trở thành một trải nghiệm thị giác ấn tượng.
