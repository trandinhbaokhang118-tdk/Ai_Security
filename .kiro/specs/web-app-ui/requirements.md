# Requirements Document

## Web App UI — AI Security Armor

## Introduction

Tài liệu này đặc tả yêu cầu cho **Web App UI** — mặt tiền trình duyệt của sản phẩm *AI Security Armor for Agentic Workflows*, xây bằng **Next.js 14 (App Router) + TailwindCSS + TypeScript** tại `frontend/web/`. Yêu cầu được suy ra từ `design.md` đã được duyệt.

Triết lý: **"Web = thử nhanh, Extension/App = dùng thật"**. Web app gồm 5 trang công khai (Home/Landing, Pricing, About, Chat, Auth/Account), dùng chung bộ component rủi ro, tuân thủ **thang màu rủi ro nhất quán** (Xanh 0–39 / Vàng 40–69 / Đỏ 70–100) và nguyên tắc **"luôn có vì sao"** (mọi điểm số kèm bằng chứng SHAP + giải thích tiếng Việt). Web app giao tiếp backend qua một **lớp API client trừu tượng** với hai hiện thực (mock/real) để demo độc lập.

Toàn bộ nội dung hiển thị bằng **tiếng Việt** khớp wireframe gốc.

> Phạm vi: CHỈ web frontend. Không bao gồm Chrome Extension, MCP Server, Desktop/Tauri, Mobile, hay backend ML.

## Glossary

- **Web_App**: Ứng dụng web Next.js 14 mô tả trong tài liệu này (hệ thống tổng thể).
- **Risk_Module**: Module `lib/risk.ts` — nguồn duy nhất ánh xạ điểm số → mức rủi ro/màu/nhãn (`getRiskLevel`).
- **RiskBadge**: Component hiển thị nhãn rủi ro theo thang màu chuẩn.
- **EvidencePanel**: Component hiển thị danh sách bằng chứng SHAP + giải thích tiếng Việt.
- **ChatMessage**: Component render một bong bóng hội thoại (user/assistant).
- **NavigationBar**: Thanh điều hướng dùng chung, đổi trạng thái theo đăng nhập.
- **Footer**: Chân trang dùng chung.
- **ScrollHero**: Hero "Scroll-driven Product Reveal" ở trang Home.
- **Api_Client**: Interface trừu tượng hóa lời gọi backend (`ApiClient`).
- **Mock_Api_Client**: Hiện thực stub tất định, in-memory (`MockApiClient`).
- **Real_Api_Client**: Hiện thực gọi REST/WebSocket tới Security Gateway (`RealApiClient`).
- **Quota_Guard**: Dịch vụ quản lý số lượt quét còn lại trong ngày (`QuotaGuard`).
- **Auth_Context**: Ngữ cảnh client lưu session, plan, quota.
- **Assess_Result**: Kết quả đánh giá rủi ro (`AssessResult`).
- **Scan_Record**: Bản ghi một lần quét trong lịch sử.
- **Plan_Tier**: Gói dịch vụ — `free` | `pro` | `team`.
- **Risk_Score**: Điểm rủi ro nguyên trong khoảng [0, 100].
- **Risk_Level**: Mức rủi ro — `safe` (0–39) | `warn` (40–69) | `danger` (70–100).

## Requirements

### Requirement 1: Thang màu & ánh xạ mức rủi ro nhất quán

**User Story:** Là người dùng, tôi muốn mọi điểm rủi ro được hiển thị theo một thang màu thống nhất, để tôi hiểu mức độ nguy hiểm ngay lập tức và nhất quán trên toàn ứng dụng.

#### Acceptance Criteria

1. WHEN một Risk_Score trong khoảng [0, 39] được cung cấp, THE Risk_Module SHALL trả về mức `safe` với nhãn "AN TOÀN", icon "✅", và màu xanh.
2. WHEN một Risk_Score trong khoảng [40, 69] được cung cấp, THE Risk_Module SHALL trả về mức `warn` với nhãn "ĐÁNG NGỜ", icon "⚠", và màu vàng.
3. WHEN một Risk_Score trong khoảng [70, 100] được cung cấp, THE Risk_Module SHALL trả về mức `danger` với nhãn "RỦI RO CAO", icon "⛔", và màu đỏ.
4. THE Risk_Module SHALL trả về đúng một Risk_Level sao cho `min ≤ score ≤ max` cho mọi Risk_Score hợp lệ.
5. WHEN cùng một Risk_Score được cung cấp nhiều lần, THE Risk_Module SHALL trả về kết quả giống nhau (ánh xạ tất định).
6. IF một Risk_Score nằm ngoài khoảng [0, 100] được cung cấp, THEN THE Risk_Module SHALL báo lỗi tiền điều kiện.

### Requirement 2: Component RiskBadge

**User Story:** Là người dùng, tôi muốn thấy một huy hiệu rủi ro rõ ràng kèm điểm số và nhãn, để nhanh chóng nắm được kết quả đánh giá.

#### Acceptance Criteria

1. WHEN RiskBadge nhận một Risk_Score, THE RiskBadge SHALL hiển thị màu, icon và nhãn đúng bằng kết quả của Risk_Module cho điểm đó.
2. WHERE thuộc tính `showScore` được bật, THE RiskBadge SHALL hiển thị điểm dạng "X/100".
3. WHERE thuộc tính `showLabel` được bật, THE RiskBadge SHALL hiển thị nhãn mức rủi ro tương ứng.
4. THE RiskBadge SHALL lấy mức rủi ro từ Risk_Module và SHALL KHÔNG tự tính ngưỡng riêng.
5. WHERE thuộc tính `size` được cung cấp là "sm", "md" hoặc "lg", THE RiskBadge SHALL render theo kích thước tương ứng.

### Requirement 3: Đánh giá rủi ro nhất quán nội tại (Assess_Result)

**User Story:** Là người dùng, tôi muốn kết quả đánh giá luôn hợp lệ và nhất quán, để tôi tin tưởng vào điểm số và mức rủi ro hiển thị.

#### Acceptance Criteria

1. WHEN Api_Client trả về một Assess_Result, THE Web_App SHALL đảm bảo `riskLevel` bằng đúng mức do Risk_Module tính từ `score`.
2. THE Web_App SHALL đảm bảo mọi Assess_Result có `score` trong khoảng [0, 100].
3. THE Web_App SHALL đảm bảo mọi Assess_Result có `confidence` trong khoảng [0, 1].
4. WHEN Mock_Api_Client đánh giá cùng một đầu vào nhiều lần, THE Mock_Api_Client SHALL trả về cùng một Risk_Score (tất định).
5. THE Assess_Result SHALL bao gồm danh sách `reasons` (tiếng Việt) và danh sách `evidence`.

### Requirement 4: Bằng chứng SHAP và giải thích ("luôn có vì sao")

**User Story:** Là người dùng, tôi muốn xem vì sao một mục bị đánh giá rủi ro, để tôi ra quyết định có căn cứ thay vì tin mù quáng.

#### Acceptance Criteria

1. WHEN một Assess_Result có bằng chứng, THE EvidencePanel SHALL hiển thị danh sách bằng chứng được sắp xếp theo `severity` giảm dần.
2. THE EvidencePanel SHALL vẽ thanh tỷ lệ đóng góp dựa trên `contribution` khi có, ngược lại dựa trên `severity`.
3. WHERE có `explanation` tiếng Việt, THE EvidencePanel SHALL hiển thị phần giải thích ngôn ngữ tự nhiên.
4. WHEN người dùng bật/tắt chế độ thu gọn, THE EvidencePanel SHALL chuyển giữa trạng thái thu gọn và mở rộng.
5. THE sortEvidenceBySeverity SHALL trả về một hoán vị của danh sách gốc (cùng đa tập phần tử) mà KHÔNG làm thay đổi mảng gốc.

### Requirement 5: Trang Home & ScrollHero

**User Story:** Là khách truy cập mới, tôi muốn một trang chủ trực quan giới thiệu sản phẩm và cho thử quét nhanh, để tôi hiểu giá trị và trải nghiệm ngay.

#### Acceptance Criteria

1. WHEN trang Home tải, THE ScrollHero SHALL bắt đầu ở trạng thái `intro` và phát video demo dạng loop.
2. WHEN người dùng bắt đầu cuộn, THE ScrollHero SHALL chuyển sang trạng thái `scroll_driven` và scrub khung hình theo tiến độ cuộn.
3. WHEN tiến độ cuộn đạt mức tối đa, THE ScrollHero SHALL chuyển sang trạng thái `idle`.
4. THE ScrollHero SHALL chỉ chuyển trạng thái theo thứ tự `intro → scroll_driven → idle` và SHALL KHÔNG quay lại trạng thái trước trong cùng một phiên.
5. WHILE ở trạng thái `scroll_driven`, THE ScrollHero SHALL giữ chỉ số khung hình trong khoảng [0, TOTAL_FRAMES-1].
6. IF `reducedMotion` được bật hoặc thiết bị/mạng yếu, THEN THE ScrollHero SHALL hiển thị khung hình tĩnh cuối cùng kèm video thường và bỏ hiệu ứng cuộn.
7. THE trang Home SHALL cung cấp ô quét nhanh ("Dán URL... [Quét]") và các CTA "[Cài Chrome Extension]" và "[Xem Demo 90 giây]".

### Requirement 6: Quét nhanh có kiểm soát quota

**User Story:** Là người dùng, tôi muốn quét nhanh một URL hoặc email và bị giới hạn theo gói, để hệ thống công bằng và khuyến khích nâng cấp.

#### Acceptance Criteria

1. WHEN người dùng gửi một đầu vào quét không rỗng và còn quota, THE Web_App SHALL giảm quota đúng 1 và gọi Api_Client để lấy Assess_Result.
2. IF đầu vào quét rỗng hoặc chỉ chứa khoảng trắng, THEN THE Web_App SHALL báo lỗi validation, SHALL KHÔNG gọi Api_Client, và SHALL KHÔNG thay đổi quota.
3. IF quota còn lại bằng 0, THEN THE Web_App SHALL chặn quét, hiển thị thông báo hết lượt kèm CTA nâng cấp, và SHALL KHÔNG thay đổi quota.
4. WHEN một đầu vào trông giống URL được gửi, THE Web_App SHALL đánh giá theo modality "url"; ngược lại SHALL đánh giá theo modality "email".
5. WHEN một lần quét thành công hoàn tất, THE Web_App SHALL hiển thị RiskBadge, danh sách lý do, EvidencePanel, và CTA "Cài Extension".

### Requirement 7: Quản lý quota theo gói

**User Story:** Là người dùng, tôi muốn thấy số lượt quét còn lại theo gói của mình, để tôi biết khi nào cần nâng cấp.

#### Acceptance Criteria

1. WHERE gói là `free`, THE Quota_Guard SHALL đặt giới hạn quét hằng ngày là 50 và trả về số còn lại bằng `max(0, 50 - usedToday)`.
2. WHERE gói là `pro` hoặc `team`, THE Quota_Guard SHALL trả về số lượt còn lại là vô hạn.
3. THE Quota_Guard SHALL trả về số lượt còn lại là số không âm.
4. WHEN sang ngày mới, THE Quota_Guard SHALL đặt lại số lượt đã dùng về 0.
5. WHEN được hỏi `canScan`, THE Quota_Guard SHALL trả về true khi và chỉ khi số lượt còn lại lớn hơn 0.

### Requirement 8: Chat đánh giá có ngữ cảnh (streaming)

**User Story:** Là người dùng, tôi muốn hỏi đáp về một URL/email trong giao diện chat và nhận trả lời theo thời gian thực, để hiểu sâu hơn về rủi ro.

#### Acceptance Criteria

1. WHEN người dùng gửi một câu hỏi không rỗng, THE Web_App SHALL mở luồng chat qua Api_Client và hiển thị các đoạn phản hồi theo thời gian thực.
2. WHILE phản hồi đang được stream, THE ChatMessage SHALL hiển thị trạng thái đang gõ (con trỏ nhấp nháy).
3. WHEN luồng chat kết thúc kèm một Assess_Result, THE ChatMessage SHALL nhúng RiskBadge và EvidencePanel trong bong bóng phản hồi.
4. IF câu hỏi rỗng sau khi trim, THEN THE Web_App SHALL không gửi và SHALL báo lỗi validation.
5. IF kết nối WebSocket bị đóng giữa chừng, THEN THE Web_App SHALL hiển thị thông báo mất kết nối, giữ lịch sử hội thoại, và thử kết nối lại.
6. THE ChatMessage SHALL phân biệt và render khác nhau cho vai trò `user` và `assistant`.

### Requirement 9: Trang Pricing

**User Story:** Là khách truy cập, tôi muốn so sánh các gói và tính năng, để chọn gói phù hợp.

#### Acceptance Criteria

1. THE trang Pricing SHALL hiển thị các gói FREE, PRO và TEAM/API với giá theo tháng/năm hoặc "Liên hệ" khi giá là null.
2. WHERE một gói được đánh dấu `highlighted`, THE trang Pricing SHALL làm nổi bật gói đó (ví dụ PRO ★ Phổ biến).
3. THE trang Pricing SHALL hiển thị danh sách tính năng của mỗi gói với chỉ báo có (✓) hoặc không (✗).
4. THE trang Pricing SHALL hiển thị nhãn CTA tương ứng của mỗi gói ("Bắt đầu" | "Dùng thử 7 ngày" | "Liên hệ").

### Requirement 10: Trang About

**User Story:** Là khách truy cập, tôi muốn tìm hiểu về sản phẩm và sứ mệnh, để tin tưởng và hiểu bối cảnh.

#### Acceptance Criteria

1. THE trang About SHALL hiển thị nội dung giới thiệu sản phẩm bằng tiếng Việt.
2. THE trang About SHALL được render tĩnh (Server Component) để tối ưu tải và SEO.

### Requirement 11: Xác thực (Auth)

**User Story:** Là người dùng, tôi muốn đăng nhập và đăng ký, để truy cập tài khoản và các tính năng cá nhân hóa.

#### Acceptance Criteria

1. WHEN người dùng gửi thông tin đăng nhập hợp lệ qua AuthModal, THE Api_Client SHALL trả về một Session gồm token, hồ sơ người dùng và thông tin gói.
2. WHEN đăng nhập thành công, THE Auth_Context SHALL lưu session và THE NavigationBar SHALL chuyển hiển thị sang Avatar kèm dropdown tài khoản.
3. WHEN người dùng đăng xuất, THE Auth_Context SHALL xóa session và THE NavigationBar SHALL chuyển về trạng thái hiển thị nút "Đăng nhập" và "Dùng thử".
4. IF định dạng email không hợp lệ, THEN THE Web_App SHALL báo lỗi validation và SHALL KHÔNG gọi đăng nhập/đăng ký.
5. WHEN người dùng gửi thông tin đăng ký hợp lệ, THE Api_Client SHALL trả về một Session cho tài khoản mới.

### Requirement 12: Trang Tài khoản — Hồ sơ

**User Story:** Là người dùng đã đăng nhập, tôi muốn xem và quản lý hồ sơ của mình, để cập nhật thông tin cá nhân.

#### Acceptance Criteria

1. WHILE người dùng đã đăng nhập, THE trang Hồ sơ SHALL hiển thị email và tên hiển thị của người dùng.
2. IF người dùng chưa đăng nhập truy cập trang tài khoản, THEN THE Web_App SHALL yêu cầu đăng nhập trước khi hiển thị nội dung.

### Requirement 13: Trang Tài khoản — Gói & Thanh toán

**User Story:** Là người dùng đã đăng nhập, tôi muốn xem gói hiện tại và thông tin thanh toán, để quản lý đăng ký.

#### Acceptance Criteria

1. WHILE người dùng đã đăng nhập, THE trang Gói & Thanh toán SHALL hiển thị tên gói hiện tại và ngày gia hạn nếu có.
2. THE trang Gói & Thanh toán SHALL hiển thị giới hạn quét hằng ngày tương ứng với gói hiện tại.

### Requirement 14: Trang Tài khoản — Lịch sử scan

**User Story:** Là người dùng đã đăng nhập, tôi muốn xem lại lịch sử các lần quét, để theo dõi hoạt động của mình.

#### Acceptance Criteria

1. WHILE người dùng đã đăng nhập, THE trang Lịch sử scan SHALL hiển thị danh sách Scan_Record gồm thời điểm, loại (URL/Email), điểm số và mức rủi ro.
2. THE trang Lịch sử scan SHALL hiển thị mỗi Scan_Record kèm RiskBadge theo thang màu chuẩn.
3. THE formatScanTimestamp SHALL định dạng thời điểm quét theo dạng "DD/MM HH:mm".
4. WHEN một chuỗi thời gian sinh bởi formatScanTimestamp được đọc lại, THE Web_App SHALL bảo toàn thông tin ngày/tháng/giờ/phút (bỏ giây).

### Requirement 15: Trang Tài khoản — API/MCP key

**User Story:** Là người dùng gói Team, tôi muốn quản lý API/MCP key, để tích hợp dịch vụ vào quy trình của mình một cách an toàn.

#### Acceptance Criteria

1. WHILE người dùng đã đăng nhập, THE trang API key SHALL hiển thị API key ở dạng che một phần.
2. WHEN người dùng yêu cầu tạo lại key, THE Api_Client SHALL trả về một ApiKeyInfo mới và THE trang API key SHALL hiển thị key mới ở dạng che một phần.
3. THE Web_App SHALL cung cấp nút sao chép key và SHALL KHÔNG ghi giá trị key ra console.

### Requirement 16: Lớp API client có thể hoán đổi

**User Story:** Là nhà phát triển, tôi muốn UI hoạt động độc lập với backend qua một lớp API trừu tượng, để demo được ngay cả khi gateway chưa chạy.

#### Acceptance Criteria

1. WHERE biến môi trường `NEXT_PUBLIC_API_MODE` là "mock", THE Web_App SHALL sử dụng Mock_Api_Client.
2. WHERE biến môi trường `NEXT_PUBLIC_API_MODE` là "real", THE Web_App SHALL sử dụng Real_Api_Client gọi REST `/v1/assess/*` và WebSocket `/v1/chat`.
3. THE Mock_Api_Client và Real_Api_Client SHALL hiện thực cùng một interface Api_Client.
4. THE Mock_Api_Client SHALL lưu lịch sử scan và quota trong bộ nhớ và `localStorage`.
5. WHEN đổi `NEXT_PUBLIC_API_MODE` giữa "mock" và "real", THE Web_App SHALL hoạt động mà không cần sửa mã UI.

### Requirement 17: Layout dùng chung (NavigationBar & Footer)

**User Story:** Là người dùng, tôi muốn điều hướng và chân trang nhất quán trên mọi trang, để trải nghiệm liền mạch.

#### Acceptance Criteria

1. THE NavigationBar SHALL hiển thị logo và các liên kết Home, Pricing, About, Chat trên mọi trang.
2. WHEN đang ở một trang, THE NavigationBar SHALL đánh dấu liên kết tương ứng đang active theo đường dẫn hiện tại.
3. WHERE người dùng chưa đăng nhập, THE NavigationBar SHALL hiển thị nút "Đăng nhập" và "Dùng thử ▶".
4. WHERE người dùng đã đăng nhập, THE NavigationBar SHALL hiển thị Avatar kèm dropdown "Tài khoản / Lịch sử scan / Đăng xuất".
5. THE Footer SHALL hiển thị các liên kết chân trang trên mọi trang.

### Requirement 18: An toàn hiển thị nội dung

**User Story:** Là người dùng, tôi muốn giao diện an toàn khi hiển thị nội dung độc hại được đánh giá, để không bị tấn công qua chính công cụ bảo vệ.

#### Acceptance Criteria

1. THE Web_App SHALL sanitize mọi văn bản do người dùng cung cấp trước khi render (dùng escaping của JSX/`textContent`).
2. THE Web_App SHALL KHÔNG dùng `dangerouslySetInnerHTML` để render nội dung do người dùng cung cấp.
3. THE Web_App SHALL KHÔNG nhúng liên kết sống bên trong khu vực hiển thị nội dung bị đánh giá là độc hại.
