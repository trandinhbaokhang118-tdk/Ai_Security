# Prewise Vietnamese Context v3 — Kaggle Ready

Bộ v3 sửa các lỗi chất lượng của v2:

- `user_context` được chọn theo đúng nhóm tình huống, không ghép ngẫu nhiên với nội dung.
- `evidence_reference` trỏ đúng `content`, trường `user_context`, hoặc lượt hội thoại cụ thể.
- `evidence_excerpt` luôn là đoạn con của nguồn được tham chiếu.
- Explanation trả lời theo loại câu hỏi của người dùng, không chỉ lặp một mẫu chung.
- Message và Explanation được nối bằng `case_id`; validator kiểm tra khớp risk, confidence, surface và evidence.
- Không có prompt trùng và không có family overlap giữa train/validation/test.

## Quy mô

Mỗi adapter có **39.999 mẫu**:

- Train: 32.799
- Validation: 3.200
- Test: 4.000

Tổng cộng: **79.998 mẫu SFT**.

Message Context:

- 25.200 scam
- 10.800 safe/hard-negative
- 3.999 ambiguous
- 100% tiếng Việt
- 100% có `user_context`
- 100% có câu hỏi người dùng
- khoảng 58% có hội thoại nhiều lượt
- 500 family, split theo family

## Cấu trúc input

`metadata.user_context` là lời kể của người dùng, luôn có:

- `how_received`
- `relationship`
- `known_sender`
- `expected_contact`
- `normal_behavior`
- `recent_event`
- `user_action_taken`
- `user_concern`
- `context_is_user_claim=true`

`metadata.conversation` chứa các lượt trước đó nếu có. `metadata.user_question` là điều người dùng thực sự muốn được giải thích.

## Kiểm tra local

```bash
python validate_vi_context_bundle_v3.py --bundle-root .
```

Kết quả phải có:

```json
{
  "ok": true,
  "duplicates": 0,
  "family_overlap": 0,
  "message_explanation_mismatches": 0
}
```

Trainer cũng đã được chạy ở chế độ `--validate-only` trên toàn bộ train/validation của cả hai adapter.

## Chạy trên Kaggle

1. Upload toàn bộ thư mục này thành Kaggle Dataset.
2. Tạo notebook và chọn **GPU T4 x2**.
3. Mở `prewise_vi_context_train_kaggle.ipynb`.
4. Chạy lần lượt từng cell.
5. Tải `/kaggle/working/prewise-adapters-v3.zip`.

Notebook sẽ:

1. Tìm bundle.
2. Validate checksum/schema/leakage.
3. Giải nén `.jsonl.gz`.
4. Cài dependency.
5. Train Message trên GPU 0 và Explanation trên GPU 1.
6. Đóng gói đúng contract `server/adapters/`.

## Đầu ra

```text
server-adapters/
├── manifest.json
├── message-context-adapter/current/
└── explanation-adapter/current/
```

Adapter không quyết định ALLOW/WARN/BLOCK. Risk Core và Policy Engine vẫn là nguồn quyết định cuối.

## Giới hạn

Đây là dữ liệu synthetic có kiểm soát để bootstrap. Trước production vẫn cần:

- test set tiếng Việt do con người kiểm duyệt độc lập;
- dữ liệu thật đã ẩn danh và có sự đồng ý;
- đánh giá riêng cho từng nhóm lừa đảo;
- kiểm tra calibration và false positive trên hard-negative.
