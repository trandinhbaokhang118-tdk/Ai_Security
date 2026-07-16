# CoreGuide — Hệ thống chấm điểm 64 tiêu chí phát hiện website lừa đảo

> Tài liệu này là đặc tả bắt buộc để AI coding triển khai Risk Core. Mục tiêu là tạo kết quả có thể giải thích, tránh cộng điểm trùng, giảm false positive và hoạt động ổn định trong môi trường production.

---

## 1. Mục tiêu đầu ra

Mỗi lần quét phải trả về tối thiểu các trường sau:

```json
{
  "risk_score": 0,
  "risk_level": "low",
  "confidence_score": 0,
  "decision": "allow",
  "internal_score": 0,
  "external_corroboration_score": 0,
  "override_applied": false,
  "override_reason": null,
  "criteria": [],
  "sources": [],
  "unavailable_checks": [],
  "scan_version": "risk-core-64-v1"
}
```

### Hai điểm bắt buộc phải tách riêng

- `risk_score`: mức độ nguy hiểm của website, từ 0 đến 100.
- `confidence_score`: mức độ chắc chắn của kết luận, từ 0 đến 100.

Không được coi `confidence_score` là điểm an toàn. Không được coi `risk_score` là xác suất website chắc chắn lừa đảo.

---

## 2. Nguyên tắc production

1. Không có dữ liệu không có nghĩa là an toàn.
2. API lỗi không được trả về kết quả “không tìm thấy”.
3. Một bằng chứng chỉ được cộng điểm rủi ro một lần.
4. Nguồn bên ngoài chủ yếu dùng để xác nhận chéo, không được cộng lặp với tiêu chí nội bộ.
5. Tín hiệu cực mạnh phải có cơ chế override.
6. Domain mới chỉ là tín hiệu yếu, không được tự động kết luận lừa đảo.
7. Mọi điểm cộng phải có bằng chứng, nguồn, thời gian và tiêu chí tương ứng.
8. Kết quả phải tái lập: cùng dữ liệu đầu vào phải cho cùng kết quả.
9. Trọng số phải nằm trong cấu hình có version, không hard-code rải rác.
10. Mọi thay đổi trọng số phải có migration, test và ghi lại phiên bản model/rule.

---

## 3. Cấu trúc điểm tổng

```text
Internal Risk Score:                 0–80 điểm
External Corroboration Score:        0–20 điểm
Base Risk Score:                     0–100 điểm
Final Risk Score sau override:       0–100 điểm
Confidence Score:                    0–100 điểm, tính riêng
```

### Công thức chính

```text
criterion_score = max_weight × severity × evidence_quality

internal_score = tổng điểm tiêu chí 1–49
external_score = tổng điểm xác nhận chéo 51–64 sau khi chống trùng và áp family cap
base_risk_score = min(100, internal_score + external_score)
final_risk_score = max(base_risk_score, override_floor)
```

Tiêu chí 50 là kết quả tổng hợp, có trọng số bằng 0 để tránh cộng điểm hai lần.

---

## 4. Phân biệt Severity và Evidence Quality

### 4.1 Severity — mức độ nguy hiểm của tín hiệu đã quan sát

| Giá trị | Ý nghĩa |
|---:|---|
| 0 | Không phát hiện trạng thái rủi ro |
| 0,50 | Tín hiệu nhẹ hoặc chỉ thỏa một phần điều kiện |
| 0,75 | Tín hiệu mạnh, có khả năng gây hại rõ ràng |
| 1,00 | Điều kiện nguy hiểm của tiêu chí được thỏa đầy đủ |

Severity đo mức độ nguy hiểm, không đo độ chắc chắn của nguồn.

### 4.2 Evidence Quality — độ đáng tin của bằng chứng

| Giá trị | Ý nghĩa |
|---:|---|
| 0 | Không kiểm tra được, API lỗi, timeout hoặc không có dữ liệu |
| 0,50 | Heuristic, AI hoặc báo cáo chưa xác minh |
| 0,80 | Nguồn độc lập có uy tín, kết quả hợp lệ nhưng chưa phải quan sát trực tiếp |
| 1,00 | Sandbox trực tiếp, dữ liệu kỹ thuật xác thực hoặc nguồn chính thức xác nhận |

### 4.3 Ví dụ

| Tình huống | Severity | Quality | Giải thích |
|---|---:|---:|---|
| Domain dưới 30 ngày, RDAP xác nhận | 1,00 | 1,00 | Trạng thái “rất mới” là đúng, nhưng trọng số tiêu chí vốn thấp |
| AI nghi ngờ logo giả thương hiệu | 0,75 | 0,50 | Dấu hiệu mạnh nhưng bằng chứng chưa xác nhận |
| Form gửi mật khẩu sang domain khác trong sandbox | 1,00 | 1,00 | Nguy hiểm và quan sát trực tiếp |
| Một báo cáo cộng đồng chưa xác minh | 0,50 | 0,50 | Chỉ là tín hiệu tham khảo |
| API timeout | 0 | 0 | Không cộng điểm, đồng thời giảm confidence |

---

## 5. Trạng thái kiểm tra tiêu chí

Mỗi tiêu chí phải có một trong các trạng thái:

```text
not_applicable  Không áp dụng với website này
not_checked     Chưa chạy kiểm tra
unavailable     Có chạy nhưng nguồn/API lỗi
clean           Đã kiểm tra, không phát hiện rủi ro
suspicious      Có tín hiệu đáng ngờ
malicious       Có bằng chứng nguy hiểm rõ ràng
```

Quy tắc:

- `not_checked` và `unavailable` không được coi là `clean`.
- `not_applicable` không làm giảm coverage.
- `clean` chỉ được dùng khi kiểm tra thực sự đã hoàn tất.
- Kết quả hiển thị phải phân biệt “Không phát hiện” với “Không thể kiểm tra”.

---

## 6. Bảng 50 tiêu chí nội bộ — tổng tối đa 80 điểm

| ID | Tiêu chí | Điểm tối đa | Điều kiện rủi ro cao nhất |
|---:|---|---:|---|
| 1 | Tuổi tên miền | 1,5 | Domain dưới 30 ngày |
| 2 | Thời hạn tên miền | 1,0 | Đăng ký ngắn hạn, sắp hết hạn hoặc vòng đời bất thường |
| 3 | Thông tin chủ sở hữu | 1,0 | Thông tin giả, mâu thuẫn hoặc che giấu bất thường |
| 4 | Nhà đăng ký tên miền | 1,0 | Registrar có dấu hiệu lạm dụng hoặc lịch sử rủi ro cao |
| 5 | Tên miền giả mạo | 3,0 | Typosquatting hoặc giả thương hiệu rõ ràng |
| 6 | Ký tự bất thường | 2,0 | Homoglyph, punycode hoặc ký tự gây nhầm lẫn |
| 7 | Subdomain đáng ngờ | 3,0 | Thương hiệu nằm trong subdomain nhưng domain thật không liên quan |
| 8 | Không sử dụng HTTPS | 1,0 | Trang truyền hoặc thu thập dữ liệu qua HTTP |
| 9 | Chứng chỉ SSL bất thường | 1,0 | Subject, issuer hoặc cấu hình TLS đáng ngờ |
| 10 | Lỗi chứng chỉ | 2,0 | Hết hạn, sai hostname, tự ký hoặc không hợp lệ |
| 11 | Có trong blacklist | 3,0 | URL/domain được nguồn đáng tin cậy đánh dấu độc hại |
| 12 | Uy tín tên miền thấp | 2,0 | Danh tiếng xấu hoặc lịch sử abuse rõ ràng |
| 13 | Uy tín IP thấp | 2,0 | IP liên quan phishing, malware, spam hoặc botnet |
| 14 | Vị trí máy chủ bất thường | 1,0 | Vị trí hosting mâu thuẫn nghiêm trọng với thông tin công bố |
| 15 | Hosting chung với website xấu | 1,0 | IP/ASN chứa mật độ domain độc hại cao |
| 16 | Chuyển hướng bất thường | 3,0 | Redirect qua domain không liên quan hoặc chuỗi né tránh |
| 17 | URL rút gọn | 1,5 | Shortlink che giấu đích cuối |
| 18 | Tham số URL bất thường | 2,5 | URL lồng, encoding, redirect parameter hoặc entropy cao |
| 19 | Giả mạo nội dung thương hiệu | 3,0 | Logo, giao diện hoặc nội dung sao chép thương hiệu |
| 20 | Thông tin liên hệ | 1,0 | Không có hoặc không thể xác minh |
| 21 | Email doanh nghiệp | 1,0 | Email miễn phí hoặc không khớp pháp nhân/domain |
| 22 | Địa chỉ doanh nghiệp | 1,5 | Địa chỉ giả, không tồn tại hoặc không liên quan |
| 23 | Thông tin pháp lý | 1,5 | Mã số thuế, giấy phép hoặc pháp nhân không hợp lệ |
| 24 | Chính sách bảo mật | 0,5 | Thu thập dữ liệu nhưng không có chính sách phù hợp |
| 25 | Điều khoản và hoàn tiền | 0,5 | Có giao dịch nhưng thiếu điều khoản cần thiết |
| 26 | Chất lượng nội dung | 1,0 | Nội dung máy móc, mâu thuẫn hoặc lỗi nghiêm trọng |
| 27 | Giá bán bất thường | 2,0 | Giá phi thực tế hoặc cam kết lợi nhuận vô lý |
| 28 | Nội dung gây áp lực | 3,0 | Đe dọa, đếm ngược hoặc ép hành động ngay |
| 29 | Yêu cầu dữ liệu nhạy cảm | 3,0 | Đòi OTP, PIN, CVV, mật khẩu hoặc seed phrase không hợp lý |
| 30 | Biểu mẫu đăng nhập | 3,0 | Form gửi dữ liệu sang domain không liên quan |
| 31 | Phương thức thanh toán | 2,5 | Chỉ nhận crypto, gift card hoặc phương thức khó hoàn tiền |
| 32 | Tài khoản nhận tiền | 3,0 | Tên chủ tài khoản không khớp doanh nghiệp |
| 33 | Quyền trình duyệt | 1,0 | Yêu cầu camera, micro, vị trí hoặc notification không cần thiết |
| 34 | Tệp tải xuống | 2,0 | Tự tải file thực thi hoặc file đáng ngờ |
| 35 | JavaScript độc hại | 2,5 | Obfuscation, credential theft hoặc exfiltration |
| 36 | Script bên thứ ba | 1,0 | Script từ domain uy tín thấp hoặc không liên quan |
| 37 | Popup lừa đảo | 1,0 | Cảnh báo virus, trúng thưởng hoặc hỗ trợ kỹ thuật giả |
| 38 | Quảng cáo độc hại | 1,0 | Quảng cáo chuyển hướng hoặc phát tán phần mềm |
| 39 | Sao chép nội dung | 1,0 | Nội dung sao chép phần lớn từ website khác |
| 40 | Hình ảnh giả | 1,5 | Hình sản phẩm, giấy phép hoặc nhân sự bị đánh cắp |
| 41 | Mạng xã hội | 1,0 | Link giả, tài khoản mới hoặc không liên quan |
| 42 | Lịch sử website | 1,0 | Domain từng dùng cho nội dung độc hại hoặc không liên quan |
| 43 | Thay đổi nội dung bất thường | 1,5 | Domain đột ngột đổi ngành, thương hiệu hoặc mục đích |
| 44 | DNS bất thường | 1,5 | NS, ASN hoặc IP thay đổi liên tục và đáng ngờ |
| 45 | MX, SPF, DKIM, DMARC | 0,5 | Domain doanh nghiệp có cấu hình email yếu hoặc mâu thuẫn |
| 46 | Title, favicon, metadata | 1,5 | Metadata giả thương hiệu hoặc không khớp domain |
| 47 | Kênh hỗ trợ | 0,5 | Không hoạt động hoặc không thể xác minh |
| 48 | Khiếu nại người dùng | 1,5 | Có nhiều báo cáo lừa đảo độc lập |
| 49 | Đánh giá giả | 1,0 | Đánh giá trùng lặp, dồn thời điểm hoặc có dấu hiệu nhân tạo |
| 50 | Điểm tổng hợp | 0 | Chỉ là đầu ra, không cộng điểm |

**Tổng trọng số tiêu chí 1–49: đúng 80 điểm.**

---

## 7. Bảng 14 nguồn xác minh bên ngoài

Tổng trọng số thô là 25 điểm nhưng sau khi áp giới hạn nhóm chỉ được cộng tối đa 20 điểm.

| ID | Nguồn | Điểm thô tối đa | Nhóm bằng chứng | Vai trò |
|---:|---|---:|---|---|
| 51 | ScamAdviser | 1,5 | Commercial reputation | Xác nhận uy tín thương mại |
| 52 | Criminal IP | 2,5 | Infrastructure/IP | IP, ASN, hosting và exposure |
| 53 | Hudson Rock | 1,0 | Breach/infostealer | Dấu hiệu infostealer liên quan |
| 54 | Have I Been Pwned | 0,5 | Breach/identity | Rò rỉ email/domain đã xác minh |
| 55 | PhishTank | 2,5 | Phishing | URL phishing đã được xác nhận |
| 56 | CyRadar | 1,5 | Threat intelligence | Dữ liệu threat intelligence |
| 57 | National Cybersecurity Association | 1,5 | Official/community warning | Cảnh báo an toàn mạng |
| 58 | NCSC | 2,5 | Official warning | Cảnh báo và danh sách nguy hiểm |
| 59 | ScamVN | 1,5 | Vietnam scam reports | Báo cáo lừa đảo tại Việt Nam |
| 60 | IP Quality Score | 2,0 | Infrastructure/IP | URL/IP reputation và abuse |
| 61 | Google Web Risk | 4,0 | Phishing/malware | Phishing, malware hoặc deceptive site |
| 62 | Bfore | 1,0 | Infrastructure/prediction | Domain, DNS và hạ tầng rủi ro |
| 63 | APIVoid | 2,0 | Infrastructure/reputation | URL, domain và IP reputation |
| 64 | PhishDestroy | 1,0 | Phishing/reporting | Phishing và báo cáo xử lý |

### Giới hạn theo nhóm nguồn

| Nhóm | Nguồn | Điểm tối đa sau cap |
|---|---|---:|
| Phishing/malware | 55, 56, 57, 58, 59, 61, 64 | 11,0 |
| Infrastructure/IP | 52, 60, 62, 63 | 6,0 |
| Commercial reputation | 51 | 1,5 |
| Breach/infostealer | 53, 54 | 1,5 |
| **Tổng** |  | **20,0** |

Không bắt buộc phải tích hợp toàn bộ 14 nguồn ngay lập tức. Adapter chưa tích hợp phải trả về `not_checked`; adapter lỗi phải trả về `unavailable`.

---

## 8. Quy tắc chống cộng điểm trùng

### 8.1 Evidence fingerprint

Mọi bằng chứng phải có fingerprint ổn định:

```text
fingerprint = SHA256(
  normalized_subject_type +
  normalized_subject_value +
  finding_type +
  time_bucket
)
```

Ví dụ:

```text
subject_type: url
subject_value: https://example.com/login
finding_type: confirmed_phishing
source_family: phishing_feed
```

### 8.2 Semantic-first scoring

1. Bằng chứng đầu tiên phải được ánh xạ vào tiêu chí nội bộ tương ứng, ví dụ blacklist vào tiêu chí 11.
2. Chính nguồn đã tạo bằng chứng đầu tiên không được đồng thời cộng điểm tại tiêu chí nguồn 51–64.
3. Nguồn thứ hai chỉ được cộng điểm external khi độc lập về tổ chức và source family.
4. Nhiều endpoint của cùng một nhà cung cấp được tính là một nguồn.
5. Các aggregator không được coi là độc lập nếu chúng chỉ tổng hợp lại cùng feed gốc.
6. Một fingerprint chỉ được nhận external bonus một lần trong mỗi source family.
7. “Không tìm thấy” không tạo external bonus và không chứng minh website sạch.

### 8.3 Ví dụ chống trùng

```text
Google Web Risk phát hiện phishing:
- Tiêu chí 11 được cộng theo bằng chứng Google.
- Tiêu chí 61 chưa được cộng thêm vì đây là nguồn đầu tiên.

PhishTank tiếp tục xác nhận cùng URL:
- Tiêu chí 11 không cộng lần hai.
- Tiêu chí 55 được phép cộng external corroboration vì là xác nhận độc lập.
```

---

## 9. Cơ chế giảm false positive cho domain mới

Domain mới không được tự động đẩy website vào mức nguy hiểm.

### 9.1 Legitimacy signals

Các tín hiệu chính danh mạnh:

1. Pháp nhân được đối chiếu với cơ sở dữ liệu chính thức.
2. Địa chỉ doanh nghiệp tồn tại và khớp pháp nhân.
3. Email dùng domain riêng, SPF/DKIM/DMARC hợp lệ.
4. Tên thương hiệu, domain, TLS và metadata nhất quán.
5. Mạng xã hội chính thức có lịch sử và liên kết hai chiều.

### 9.2 Công thức giảm nhẹ

```text
legitimacy_count = số tín hiệu chính danh mạnh đã xác minh

0 tín hiệu  => mitigation = 0
1 tín hiệu  => mitigation = 0,25
2 tín hiệu  => mitigation = 0,50
3+ tín hiệu => mitigation = 0,75

adjusted_newness_score = raw_newness_score × (1 - mitigation)
```

Chỉ áp dụng giảm nhẹ cho tiêu chí 1 và phần “tài khoản mới” của tiêu chí 41.

### 9.3 Điều kiện không được giảm nhẹ

Không áp dụng mitigation nếu có một trong các tín hiệu sau:

- Gửi mật khẩu, OTP, token hoặc canary ra ngoài.
- Phát tán hoặc tự tải malware.
- Form gửi dữ liệu sang domain không liên quan.
- Giả mạo thương hiệu rõ ràng.
- Hai nguồn phishing độc lập xác nhận.
- Có bằng chứng chỉnh sửa hoặc giả mạo thông tin pháp lý.

---

## 10. Quy tắc override bắt buộc

Override đặt mức điểm tối thiểu, không cộng trực tiếp vào điểm hiện tại.

| Bằng chứng | Điểm tối thiểu | Decision tối thiểu |
|---|---:|---|
| Sandbox phát hiện gửi mật khẩu, OTP, token hoặc canary ra ngoài | 95 | block |
| Phát hiện tải hoặc thực thi malware | 95 | block |
| Giả thương hiệu và form gửi dữ liệu sang domain khác | 90 | block |
| Ba nhóm nguồn độc lập xác nhận nguy hiểm | 90 | block |
| Nguồn phishing/malware có độ tin cậy cao xác nhận chính xác URL | 85 | block |
| Hai nguồn phishing độc lập xác nhận cùng URL | 85 | block |

Quy tắc:

```text
override_floor = max(tất cả override đã kích hoạt)
final_risk_score = max(base_risk_score, override_floor)
```

Không được override chỉ vì domain mới, thiếu chính sách, thiếu mạng xã hội hoặc điểm AI đơn lẻ.

---

## 11. Ngưỡng kết luận

| Risk score | Mức | Decision mặc định |
|---:|---|---|
| 0–19 | low | allow |
| 20–39 | caution | warn |
| 40–59 | suspicious | require_review hoặc sandbox |
| 60–79 | dangerous | block mặc định |
| 80–100 | critical | block cứng và đề xuất báo cáo |

### Điều chỉnh theo confidence

| Trường hợp | Hành động |
|---|---|
| Risk thấp, confidence thấp | Không ghi “an toàn”; ghi “chưa đủ dữ liệu” |
| Risk trung bình, confidence thấp | Yêu cầu kiểm tra chuyên sâu |
| Risk cao, confidence thấp | Chặn mềm hoặc yêu cầu xác nhận người dùng |
| Risk cao, confidence cao | Chặn mặc định |
| Override kích hoạt | Không được hạ quyết định vì confidence thấp |

---

## 12. Cách tính Confidence Score

```text
confidence_score = 100 × (
  0,45 × coverage +
  0,35 × agreement +
  0,20 × freshness
)
```

Tất cả thành phần nằm trong khoảng 0–1.

### 12.1 Coverage

```text
coverage = tổng trọng số kiểm tra đã hoàn tất / tổng trọng số kiểm tra áp dụng
```

- `clean`, `suspicious`, `malicious` được tính là đã hoàn tất.
- `not_checked`, `unavailable` không được tính.
- `not_applicable` bị loại khỏi mẫu số.

### 12.2 Agreement

```text
consensus_ratio = max(malicious_support, benign_support)
                  / max(malicious_support + benign_support, epsilon)

independence_factor = min(1, independent_source_families / 3)

agreement = consensus_ratio × (0,5 + 0,5 × independence_factor)
```

Không được coi ba API của cùng một nhà cung cấp là ba nguồn độc lập.

### 12.3 Freshness

Mỗi bằng chứng có TTL riêng:

| Loại dữ liệu | TTL khuyến nghị |
|---|---|
| Blacklist, URL reputation | 6 giờ |
| DNS, IP, TLS | 24 giờ |
| WHOIS/RDAP | 7 ngày |
| Pháp lý, địa chỉ doanh nghiệp | 30 ngày |
| Nội dung website và sandbox | Theo từng lần quét |

```text
freshness_item = max(0, 1 - age_seconds / ttl_seconds)
freshness = trung bình có trọng số của freshness_item
```

---

## 13. Chuẩn dữ liệu Evidence

```json
{
  "evidence_id": "uuid",
  "fingerprint": "sha256",
  "criterion_id": 30,
  "source_id": "browser_sandbox",
  "source_family": "direct_observation",
  "subject_type": "url",
  "subject_value": "https://example.com/login",
  "finding_type": "external_form_action",
  "status": "malicious",
  "severity": 1.0,
  "evidence_quality": 1.0,
  "max_weight": 3.0,
  "score": 3.0,
  "observed_at": "2026-07-15T00:00:00Z",
  "expires_at": "2026-07-15T06:00:00Z",
  "summary": "Form gửi mật khẩu sang domain khác",
  "raw_reference": "sandbox-event-id",
  "independent": true
}
```

Không lưu mật khẩu, OTP, cookie, token hoặc dữ liệu nhạy cảm thật trong evidence. Chỉ dùng canary tổng hợp và dữ liệu đã che/mask.

---

## 14. Pseudocode triển khai

```python
def calculate_scan(criteria, external_sources, overrides, now):
    internal_score = 0.0

    for criterion in criteria:
        if criterion.id == 50:
            continue
        criterion.score = (
            criterion.max_weight
            * criterion.severity
            * criterion.evidence_quality
        )
        internal_score += criterion.score

    internal_score = min(80.0, internal_score)

    apply_new_domain_mitigation(criteria)
    internal_score = min(80.0, sum(c.score for c in criteria if c.id != 50))

    deduplicated = deduplicate_external_evidence(external_sources)
    corroboration = score_external_corroboration(deduplicated)
    corroboration = apply_family_caps(corroboration)
    external_score = min(20.0, corroboration.total)

    base_score = min(100.0, internal_score + external_score)
    override_floor, override_reason = resolve_override(overrides)
    final_score = max(base_score, override_floor)

    confidence = calculate_confidence(criteria, external_sources, now)
    level, decision = resolve_level_and_decision(final_score, confidence, override_floor)

    return {
        "risk_score": round(final_score, 2),
        "risk_level": level,
        "confidence_score": round(confidence, 2),
        "decision": decision,
        "internal_score": round(internal_score, 2),
        "external_corroboration_score": round(external_score, 2),
        "override_applied": override_floor > 0,
        "override_reason": override_reason,
    }
```

---

## 15. Quy tắc adapter nguồn ngoài

Mỗi adapter phải trả về cùng một contract:

```json
{
  "source_id": "phishtank",
  "status": "completed",
  "verdict": "malicious",
  "confidence": 0.95,
  "matched_subject": "exact_url",
  "source_family": "phishing_feed",
  "observed_at": "2026-07-15T00:00:00Z",
  "evidence": [],
  "error": null
}
```

Các trạng thái adapter:

```text
completed
not_configured
rate_limited
timeout
provider_error
invalid_response
disabled
```

- Không được chuyển `timeout`, `rate_limited`, `provider_error` thành verdict sạch.
- API key phải nằm trong secret manager hoặc environment variable.
- Phải có timeout, retry có backoff, circuit breaker và cache.
- Không gửi dữ liệu người dùng không cần thiết tới nhà cung cấp.
- Phải tuân thủ điều khoản sử dụng và giấy phép của từng nguồn.

---

## 16. Yêu cầu giải thích kết quả

Mỗi kết quả phải hiển thị:

1. Tiêu chí nào kích hoạt.
2. Điểm tối đa, severity, evidence quality và điểm thực tế.
3. Nguồn bằng chứng.
4. Thời gian quan sát.
5. Bằng chứng có còn mới hay đã hết TTL.
6. Nguồn nào không kiểm tra được.
7. Có override hay không.
8. Có mitigation domain mới hay không.
9. Vì sao hệ thống cho phép, cảnh báo hoặc chặn.

Không được chỉ trả về một con số không có giải thích.

---

## 17. Yêu cầu kiểm thử bắt buộc

### 17.1 Unit tests

- Tổng trọng số tiêu chí 1–49 phải bằng chính xác 80.
- Tổng family cap nguồn ngoài phải bằng chính xác 20.
- Tiêu chí 50 luôn bằng 0.
- Score không bao giờ nhỏ hơn 0 hoặc lớn hơn 100.
- API lỗi không làm giảm risk score về 0.
- `unavailable` làm giảm confidence nhưng không cộng risk.
- Evidence trùng fingerprint chỉ được cộng một lần.
- Nguồn cùng công ty không được tính là độc lập.
- Mitigation không hoạt động khi có hard red flag.
- Override luôn đặt đúng score floor.

### 17.2 Integration tests

- URL an toàn lâu năm, đầy đủ dữ liệu.
- Startup hợp pháp có domain mới.
- Website clone thương hiệu có form đăng nhập ngoài domain.
- URL shortlink chuyển qua nhiều domain.
- Website yêu cầu OTP và gửi canary ra ngoài.
- Website tự tải file thực thi.
- Tất cả API ngoài cùng timeout.
- Hai nguồn ngoài mâu thuẫn verdict.
- Hai nguồn phishing độc lập cùng xác nhận.
- Nguồn aggregator lặp dữ liệu feed gốc.

### 17.3 Calibration tests

Phải đo tối thiểu:

```text
precision
recall
F1-score
false positive rate
false negative rate
ROC-AUC hoặc PR-AUC
calibration error
latency p50/p95/p99
provider availability
```

Phải có tập validation riêng cho website Việt Nam. Không dùng tập training để công bố độ chính xác.

---

## 18. Versioning và audit

Mỗi lần quét phải lưu:

```text
rules_version
weights_version
model_version
source_adapter_versions
scan_timestamp
normalized_url_hash
criteria_scores
override_result
confidence_components
```

Không thay đổi lịch sử kết quả cũ khi cập nhật trọng số mới. Khi cần so sánh, phải re-scan và ghi phiên bản mới.

---

## 19. Các lỗi implementation bị cấm

- Cộng cả tiêu chí 11 và điểm Google/PhishTank cho cùng một bằng chứng đầu tiên.
- Coi API không trả dữ liệu là website sạch.
- Cộng điểm chỉ vì website dùng CDN hoặc shared hosting phổ biến.
- Chặn website chỉ vì domain mới.
- Dùng kết quả AI không có evidence để override.
- Cộng tất cả nguồn ngoài không giới hạn family cap.
- Ghi “độ chính xác 99%” khi chưa có validation độc lập.
- Gửi mật khẩu/OTP thật vào sandbox hoặc API bên ngoài.
- Hiển thị “Không tìm thấy” khi adapter chưa tích hợp hoặc chưa cấu hình.
- Sử dụng `risk_score` như xác suất thống kê nếu chưa hiệu chỉnh xác suất.

---

## 20. Tiêu chí hoàn thành triển khai

Risk Core chỉ được coi là hoàn thành khi:

- Có đủ cấu hình 64 tiêu chí.
- Trọng số nội bộ đúng 80 và external cap đúng 20.
- Có evidence schema thống nhất.
- Có chống trùng bằng fingerprint.
- Có confidence score độc lập.
- Có mitigation domain mới.
- Có override và test đầy đủ.
- Có trạng thái `not_checked`, `unavailable`, `clean`, `suspicious`, `malicious`.
- Có audit log và versioning.
- Có dashboard giải thích điểm.
- Có validation thực tế và theo dõi false positive/false negative.

---

## 21. Ghi chú cuối

Bộ trọng số này là baseline kỹ thuật để triển khai production, không phải chân lý cố định. Trọng số, threshold và override phải được hiệu chỉnh bằng dữ liệu thật, có nhãn rõ ràng và được đánh giá định kỳ. Mọi thay đổi phải ưu tiên giảm false negative ở hành vi đánh cắp thông tin, đồng thời kiểm soát false positive với website mới nhưng minh bạch và hợp pháp.
