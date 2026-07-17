# Third-party model notices

## AI image detection ONNX model

- Source: `onnx-community/ai-image-detection-ONNX`
- Base model: `capcheck/ai-image-detection`
- Packaged artifact: `ai/models/deepfake_image_q4.onnx`
- License: Apache License 2.0
- Purpose in this project: local screening of still images for AI-generated pixel patterns

The model is provided without a guarantee that it can detect every manipulation technique. See `licenses/Apache-2.0.txt` for the license text and `ai/models/deepfake_image.meta.json` for scope and checksum.

## Phishing.Database active URL feed

- Source: `Phishing-Database/Phishing.Database`
- Local clone: `.aisec-data/Phishing.Database` (not committed)
- License: MIT; the upstream `LICENSE` file is retained in the clone
- Purpose: exact-URL lookup against upstream's actively revalidated phishing feed

Only exact URL/campaign-key matches are used as malicious evidence. A registrable-domain
match alone is not treated as proof that an unrelated URL is malicious.
