# Kịch bản demo cho ban giám khảo

Mở `http://127.0.0.1:3001/demo` sau khi backend và web đã chạy.

## Đề tài 1: Deepfake & Phishing Detection

1. Chọn `Giả mạo Facebook` và bấm `Chạy so sánh A/B`.
2. Giải thích cột Trước: blacklist tĩnh không biết URL mới nên cho phép.
3. Giải thích cột Sau: Armor phân tích tên miền, subdomain, từ khóa và model URL; URL bị chặn kèm risk score và evidence.
4. Chọn `URL an toàn` và chạy lại để chứng minh hệ thống không chặn nhầm mọi URL.

### Ảnh AI-generated / deepfake tĩnh

1. Bấm `Dùng ảnh AI demo có sẵn` hoặc tải một ảnh PNG/JPG/WebP.
2. Cột Trước chỉ xác nhận file hợp lệ nên vẫn cho phép.
3. Cột Sau chạy model ViT ONNX cục bộ và hiển thị xác suất `REAL/FAKE`, evidence, latency và verdict.

Phạm vi phải được trình bày chính xác: model sàng lọc ảnh tĩnh và tập trung dấu vết ảnh AI-generated. Dự án chưa phân tích video/audio, không bao phủ mọi kỹ thuật face-swap và không coi kết quả model là bằng chứng pháp y tuyệt đối.

## Đề tài 2: AI Security & Robustness

### Prompt injection

1. Chọn `Đánh cắp system prompt` và bấm `Chạy so sánh A/B`.
2. Cột Trước cho thấy chatbot sandbox nhận payload, lộ `ARMOR-CANARY-2026` và yêu cầu một tool call giả lập.
3. Cột Sau cho thấy cùng payload bị chặn trước chatbot, không lộ canary, kèm model version và evidence.
4. Chọn `Câu hỏi an toàn` để chứng minh prompt hợp lệ vẫn được phép đi qua.

Canary và tool call chỉ tồn tại trong sandbox; không dùng secret, dữ liệu hoặc kết nối tới hệ thống thật.

### Bảo vệ dữ liệu huấn luyện

1. Chọn `Đảo nhãn phishing`, sau đó bấm `Kiểm tra dataset`.
2. Cột Trước nhận toàn bộ dataset nên còn một bản ghi độc trong tập huấn luyện.
3. Cột Sau đối chiếu nhãn với phishing score và cách ly bản ghi mâu thuẫn.
4. Chạy lại với `Instruction injection` để trình bày dữ liệu có chỉ dẫn độc hại bị chặn trước training pipeline.

## Thông điệp kết luận

Armor không thay thế chatbot hoặc mô hình nghiệp vụ. Nó là security gateway đứng trước người dùng, LLM, công cụ agent và pipeline huấn luyện để phân tích, đưa bằng chứng và áp policy `ALLOW/WARN/BLOCK`.
