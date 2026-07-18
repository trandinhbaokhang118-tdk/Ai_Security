# Context adapters

Backend dùng một registry chung, tích hợp trực tiếp vào pipeline hiện tại:

`Layer 1 -> contextual/phone observations -> Risk Core -> Policy Engine`

Adapter chỉ tạo observation/evidence. Schema của adapter không có trường
`ALLOW`, `WARN` hoặc `BLOCK`; Risk Core và Policy Engine vẫn là nơi duy nhất tạo
quyết định cuối. Explanation adapter chỉ nhận evidence đã allow-list và citation
không tồn tại trong input sẽ bị từ chối.

Email, website, SMS, chat, transcript, câu hỏi và metadata đều được đóng gói
trong trust boundary `untrusted_data`. System prompt yêu cầu model coi chúng là
dữ liệu, không phải instruction.

## Đặt LoRA vào server

1. Sao chép `server/adapters/manifest.example.json` thành
   `server/adapters/manifest.json`.
2. Đặt từng PEFT package vào `path` tương ứng:

   ```text
   server/adapters/
     manifest.json
     message-context-adapter/current/
       adapter_config.json
       adapter_model.safetensors
     web-context-adapter/current/
       adapter_config.json
       adapter_model.safetensors
     explanation-adapter/current/
       adapter_config.json
       adapter_model.safetensors
   ```

3. `base_model_name_or_path` trong mọi `adapter_config.json` phải khớp chính xác
   với `base_model` trong manifest. Nên khóa `base_revision` bằng commit cụ thể.
4. Mỗi LoRA cần một `served_model_name` riêng. `task` phải là một trong:
   `message-context-adapter`, `web-context-adapter`, `explanation-adapter`,
   `phone-intelligence`.
5. Chạy AI server và trỏ backend tới endpoint đó:

   ```powershell
   $env:LLM_API_KEY = "replace-me"
   docker compose -f docker-compose.ai.yml up --build
   $env:ADAPTER_BASE_URL = "http://localhost:8001/v1"
   $env:ADAPTER_API_KEY = "replace-me"
   ```

Launcher vLLM đọc manifest và nạp tất cả entry `openai_lora` đang bật trên cùng
một base model. Registry backend tự reload khi manifest đổi và tự đổi cache
namespace; không cần sửa source code. Restart AI server khi thay trọng số hoặc
danh sách LoRA đang được vLLM phục vụ.

## Manifest và environment

Mỗi entry có `adapter_id`, `task`, `runtime`, `enabled`, `priority` và timeout
riêng. Với `runtime=openai_lora`, khai báo `path` và `served_model_name`. Với
`runtime=http_json`, khai báo `endpoint`; cú pháp `env:TEN_BIEN` đọc URL từ
environment, như entry phone trong manifest mẫu.

Các biến backend:

- `ADAPTER_REGISTRY_ENABLED`: tắt toàn bộ contextual specialist mà không sửa manifest.
- `ADAPTER_MANIFEST_PATH`: đường dẫn manifest.
- `ADAPTER_BASE_URL`, `ADAPTER_API_KEY`: OpenAI-compatible vLLM endpoint.
- `ADAPTER_TIMEOUT_SECONDS`: timeout mặc định.
- `ADAPTER_MAX_RISK_CONTRIBUTION`: trần đóng góp của contextual finding vào
  legacy score; Risk Core vẫn thực hiện scoring/policy.
- `PHONE_INTELLIGENCE_URL`: endpoint provider phone thật khi dùng entry mẫu.

## Contract và fallback

- Message input hỗ trợ `email`, `sms`, `text`, `chat`, `call_transcript`.
- Web input gồm nội dung, forms, actions, stated purpose và snapshot URL Layer 1.
- Explanation input chỉ gồm evidence, câu hỏi đã làm sạch và assessment fields
  đã allow-list; output phải cite đúng `evidence_id`.
- Phone output phải nêu provider/status. `unavailable` không được có reputation;
  `no_hit` không được tạo claim tốt/xấu.

Thiếu manifest, adapter bị tắt, artifact thiếu/sai base, endpoint chưa cấu hình,
timeout, HTTP error hoặc output sai schema đều làm specialist bị bỏ qua an toàn.
Các endpoint cũ tiếp tục dùng Layer 1/Risk Core/Policy hiện tại và backend vẫn
khởi động bình thường.

Nếu chưa có phone provider, giữ entry phone tắt. `POST /v1/assess/phone` trả
`provider_status=unavailable`, `reputation=null`. Nếu có `sms` hoặc `transcript`,
nội dung vẫn được chuyển sang message adapter rồi hợp nhất với phone evidence
trước khi Policy Engine tính lại kết quả.

`GET /v1/health` trả trạng thái route theo task tại
`model_status.context_adapters.adapters` và trạng thái từng package/provider tại
`model_status.context_adapters.adapter_instances`. Các trạng thái gồm `ready`,
`completed`, `not_configured`, `disabled`, `artifact_missing`, `incompatible`,
`timeout`, `invalid_schema` và `error`.
