# URLVet và IOC telemetry đa máy

## Trạng thái tích hợp

- Upstream được clone tại `urlvet/`, commit `6266bcbb0f2981cf5a71254c063099dfd8c425f2` (2026-07-15).
- URLVet là bộ phân tích heuristic có thể giải thích, không phải dataset huấn luyện và không chứa model ML. Vì vậy dự án dùng nó làm analyzer/evaluation độc lập thay vì gắn nhãn giả rồi tuyên bố đã train model.
- URLVet dùng AGPL-3.0/commercial dual license. Mã nguồn không được chép vào Risk Core; `security/urlvet_adapter.py` chỉ gọi HTTP tới service riêng và ánh xạ response công khai.

## Chạy URLVet riêng

Docker Compose chỉ bind API vào loopback `127.0.0.1:8080`, không chạy frontend URLVet nên không xung đột web chính ở cổng 3000.

```powershell
$env:URLVET_CACHE_PASSWORD = '<random-secret>'
$env:URLVET_ADMIN_JWT_SECRET = '<random-secret-at-least-32-bytes>'
docker compose -f docker-compose.urlvet.yml up -d --build
$env:URLVET_ENABLED = 'true'
$env:URLVET_API_URL = 'http://127.0.0.1:8080'
```

Máy hiện tại không thể kéo Docker image vì ổ C hết dung lượng. Runtime đang dùng Go 1.25.12 portable đã kiểm SHA-256 trong `.tools/` (được git-ignore), build `urlvet.exe` trên ổ D và chạy không Valkey. Clone upstream có một thay đổi nhỏ: hỗ trợ `BIND_ADDR=127.0.0.1` để bản Windows không lắng nghe trên LAN. Khi ổ C có dung lượng trở lại, có thể chuyển sang Compose để có Valkey/rate-limit mà không đổi adapter.

```powershell
$env:ADMIN_JWT_SECRET = '<random-secret-at-least-32-bytes>'
$env:BIND_ADDR = '127.0.0.1'
$env:PORT = '8080'
$env:CACHE_ADDR = '127.0.0.1:1' # cache lỗi nhanh; analyzer vẫn tiếp tục
& .\.tools\urlvet\urlvet.exe
```

Adapter đưa các kiểm tra sau vào báo cáo: IP host, punycode/homoglyph, shortener, độ dài/depth/subdomain, từ khóa phishing, TLD rủi ro, redirect khác miền, TLS/chứng thư, tuổi và độ ngẫu nhiên domain, typosquat, login/payment form, iframe ẩn, form gửi khác miền, password không TLS, brand mismatch và PhishTank.

Kết quả tổng hợp `Safe/Risky` của URLVet chỉ để hiển thị. Risk Core chỉ chấm các finding cụ thể; PhishTank `valid=true, verified=true` mới kích hoạt hard-block. Báo cáo chưa xác minh chỉ là tín hiệu đáng ngờ.

## Telemetry log nhiễm độc từ nhiều máy

Endpoint nhận IOC:

```http
POST /v1/telemetry/url-events
Authorization: Bearer <sensor-api-key-with-telemetry:write>
Content-Type: application/json

{
  "events": [{
    "event_id": "host-a:20260717:000001",
    "sensor_id": "host-a-installation-id",
    "url": "https://example.test/login",
    "verdict": "malicious",
    "event_type": "endpoint",
    "confidence": 0.94,
    "observed_at": "2026-07-17T07:00:00Z",
    "malware_family": "credential-stealer",
    "tags": ["browser-log"]
  }]
}
```

Quy tắc chống data poisoning và bảo vệ riêng tư:

1. Mỗi máy phải có một API key riêng với scope `telemetry:write`; một key chỉ có một phiếu dù gửi nhiều `sensor_id`.
2. URL chính xác chỉ bị hard-block khi ít nhất 2 API key sensor độc lập báo `malicious` trong cửa sổ 14 ngày.
3. Tín hiệu domain/campaign cần ít nhất 3 sensor và chỉ tạo mức `suspicious`.
4. Event trùng được loại bằng HMAC sensor + `event_id`; timestamp ngoài retention 30 ngày hoặc quá 5 phút tương lai bị từ chối.
5. Không lưu URL thô hay tên máy. Hệ thống chỉ lưu khóa URL/campaign, registrable domain, sensor HMAC và metadata IOC tối thiểu.
6. Chỉ dữ liệu đã đạt đồng thuận mới được xem là candidate label cho lần huấn luyện offline sau này; log nhiễm độc đơn lẻ không được tự động đưa vào model production.

## Ý nghĩa giao diện

- `✓` xanh: phép kiểm tra đã hoàn tất và nguồn đó không thấy chỉ báo nguy hiểm. Đây không phải chứng nhận URL chắc chắn an toàn và không cộng “điểm tin cậy”.
- `✕` đỏ: phép kiểm tra đã tìm thấy finding nguy hiểm/đáng ngờ.
- `!` vàng: có dữ liệu nhưng chưa đủ đồng thuận hoặc cần xem xét.
- `—` xám: nguồn chưa cấu hình, timeout hoặc không khả dụng.

Migration: `0007_url_telemetry_observations`. Runtime không để lỗi URLVet/telemetry làm hỏng toàn bộ lượt quét; nguồn lỗi được trả về rõ ràng là `unavailable`.
