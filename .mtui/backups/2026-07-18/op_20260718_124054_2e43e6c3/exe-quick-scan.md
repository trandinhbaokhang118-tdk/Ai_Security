# Test nhanh EXE trong Lab

## Mục tiêu

`Test nhanh EXE` cung cấp bước sàng lọc trước khi đưa tệp sang Sandbox Pro. Tính năng này không chạy tệp trên máy chủ. Nó đọc cấu trúc PE, tính SHA-256, đo entropy section và tra cứu uy tín hash qua provider tùy chọn.

## Chế độ mặc định: chỉ phân tích cục bộ

Không cần API key. Backend kiểm tra:

- DOS/PE header và định dạng PE32 hoặc PE32+;
- kiến trúc, subsystem và entry point;
- section, quyền đọc/ghi/thực thi và entropy;
- section RWX, section chồng lấn hoặc vượt khỏi kích thước tệp;
- dấu hiệu packer/protector trong tên section;
- Authenticode table có tồn tại hay không, nhưng không tuyên bố chữ ký hợp lệ;
- overlay và compile timestamp bất thường.

Kết quả tĩnh không chứng minh tệp an toàn. Trường `dynamic_execution` luôn là `false` trong chế độ này.

## MetaDefender Cloud tùy chọn

Cấu hình server:

```env
METADEFENDER_API_KEY=
METADEFENDER_BASE_URL=https://api.metadefender.com/v4
METADEFENDER_TIMEOUT_SECONDS=20
```

Luồng xử lý:

1. Backend luôn phân tích PE cục bộ và tính SHA-256.
2. Nếu có API key, backend gọi `GET /hash/{sha256}` trước.
3. Nếu hash chưa có báo cáo, backend chỉ gọi `POST /file` khi request có `share_with_provider=true`.
4. Provider trả `data_id`; frontend poll `GET /v1/assess/file/exe-quick-scan/provider/{data_id}` với nhịp chậm để tránh tiêu hao quota.

## Quyền riêng tư

Mặc định `share_with_provider=false`. Giao diện phải yêu cầu người dùng chủ động bật đồng ý hoặc bấm nút đồng ý gửi mẫu. Không gửi file nội bộ, dữ liệu cá nhân, mã nguồn riêng tư hoặc phần mềm chưa công bố lên tài khoản community.

## API nội bộ

### Phân tích ban đầu

```http
POST /v1/assess/file/exe-quick-scan
Content-Type: multipart/form-data
```

Form fields:

- `file`: tệp `.exe`;
- `share_with_provider`: boolean, mặc định `false`.

### Lấy báo cáo provider

```http
GET /v1/assess/file/exe-quick-scan/provider/{data_id}
```

`data_id` được kiểm tra và mã hóa như một path segment trước khi gửi tới provider.

## Phân biệt với Sandbox Pro

| Test nhanh EXE | Sandbox Pro |
|---|---|
| Không thực thi file | Thực thi trong Windows cô lập |
| Kết quả PE và multi-AV | Process tree, file, registry, network |
| Nhanh và ít tài nguyên | Tốn máy ảo và thời gian |
| Provider ngoài là tùy chọn | Telemetry do Prewise kiểm soát |

## Kiểm thử

```powershell
python -m pytest -q tests/test_exe_quick_scan.py tests/test_exe_quick_scan_api.py
cd frontend/web
npm run typecheck
```
