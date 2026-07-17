# Five-layer malicious-link detection pipeline

## Layer 1 — Local threat feeds

`ThreatFeedIndicator` and `ThreatFeedSyncState` store normalized exact URL,
campaign and registrable-domain keys in SQLite for local development or PostgreSQL
in production. The bounded collector supports:

- PhishTank hourly CSV/GZip with conditional ETag requests and an optional app key.
- OpenPhish Community text feed, limited to one fetch per 12 hours.
- URLhaus `recent.csv` with the required abuse.ch Auth-Key.

The FastAPI scheduler is disabled by default. Enable only the feeds whose terms
have been accepted and whose credentials are configured. Admin endpoints:

- `GET /admin/threat-feeds`
- `POST /admin/threat-feeds/sync`

Exact local IOC matches are added to Risk Core criterion 11 before remote provider
results. Expired rows are removed after successful scheduler runs.

## Layer 2 — Shared 88-feature schema

The deployed 15-feature ONNX model remains compatible. New training jobs use the
88-feature schema from `ai.adapters.url_adapter.FEATURE_NAMES`, including lexical,
URL structure, DNS, RDAP, TLS, redirect, DOM, visual hash and local-feed fields.
Every network-derived group has an availability flag to distinguish “not checked”
from a clean result.

## Layer 3 — Candidate ensemble and retraining

`ai/training/train_url_ensemble.py` trains LightGBM, Random Forest and XGBoost,
uses a registrable-domain grouped holdout, and exports separate ONNX artifacts and
feature metadata. The inference engine combines every reviewed artifact that is
present. Weekly candidate training is available through
`MODEL_RETRAIN_SCHEDULER_ENABLED`; it never promotes a model automatically.

## Layer 4 — Browser visual comparison

The Playwright worker captures an in-memory viewport screenshot, computes SHA-256
and dHash64, and immediately discards the pixels. Curated reference hashes live in
`data/brand_visual_hashes.json`. Add analyst-approved official screenshots with:

```powershell
python scripts/enroll_brand_visual.py --brand paypal --domain paypal.com --image D:\approved\paypal.png
```

A close visual match on a non-official domain becomes Risk Core criterion 19.

## Layer 5 — MISP and Telegram

MISP lookup is read-only during scans and uses the official
`POST /attributes/restSearch` endpoint. Admins can explicitly export reviewed local
IOC rows with `POST /admin/misp/export-local-iocs`; automatic publishing is disabled.

For self-hosting, bootstrap the official MISP Docker project without starting it:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/bootstrap_misp.ps1
```

Review its generated `.env`, TLS, passwords, storage drive and image sizes before
running Docker Compose. On this workstation MISP is intentionally not auto-started
because Docker data is on drive C and space is limited.

The Telegram endpoint is `POST /v1/integrations/telegram/webhook`. Configure
BotFather's webhook with `TELEGRAM_WEBHOOK_SECRET` as Telegram's `secret_token` so
the platform sends `X-Telegram-Bot-Api-Secret-Token`. Optional chat IDs form an
allowlist. Update IDs are deduplicated in PostgreSQL/SQLite and raw messages are not
stored.

Official references:

- https://phishtank.org/developer_info.php
- https://www.openphish.com/phishing_feeds.html
- https://urlhaus.abuse.ch/api/
- https://www.misp-project.org/openapi/
- https://github.com/MISP/misp-docker
- https://core.telegram.org/bots/api
