# Phase 4: Repository Structure

> **Project:** AI Security Armor for Agentic Workflows  
> **Competition:** Cyber Solutions Challenge 2026 — ĐH Nguyễn Tất Thành  
> **Author:** Principal Software Architect & Security Architect  
> **Date:** July 2026

---

## 1. Monorepo Justification

A monorepo is chosen over a polyrepo approach for the following reasons:

| Factor | Monorepo Advantage |
|--------|-------------------|
| API Contract Sync | Pydantic schemas in `shared/` are imported by both backend and AI modules — no version drift |
| Atomic Changes | A single PR can update the API schema, backend handler, and extension client simultaneously |
| Team Velocity | 5 developers working on a 10-day sprint benefit from shared tooling and unified CI |
| AI Agent Readability | AI coding agents perform better with full project context in a single repository |

---

## 2. Complete Directory Tree

```
ai-security-armor/
├── backend/
│   ├── __init__.py
│   ├── main.py                          # FastAPI app entry point
│   ├── config.py                        # Environment variable loading (pydantic-settings)
│   ├── dependencies.py                  # Dependency injection (model singletons)
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── assess.py                    # POST /v1/assess/{url,text,prompt,action,batch}
│   │   ├── chat.py                      # WebSocket /v1/chat
│   │   └── health.py                    # GET /v1/health
│   ├── services/
│   │   ├── __init__.py
│   │   ├── inference_service.py         # Orchestrates Layer 1 model calls
│   │   ├── explanation_service.py       # Interfaces with Ollama for Layer 2
│   │   └── policy_service.py            # Wraps the Policy Engine for API use
│   ├── middleware/
│   │   ├── __init__.py
│   │   ├── rate_limiter.py              # Token-bucket rate limiting
│   │   ├── cors.py                      # CORS configuration for Extension
│   │   └── sanitizer.py                 # Unicode normalization middleware
│   └── mcp_server.py                    # MCP Security Armor Server (standalone process)
│
├── frontend/
│   ├── web/                             # Next.js 14 App Router
│   │   ├── app/
│   │   │   ├── page.tsx                 # Landing page / Scanner UI
│   │   │   ├── chat/page.tsx            # Chat interface
│   │   │   └── dashboard/page.tsx       # Scan history dashboard
│   │   ├── components/
│   │   │   ├── RiskBadge.tsx
│   │   │   ├── EvidencePanel.tsx
│   │   │   └── ChatMessage.tsx
│   │   ├── package.json
│   │   └── tailwind.config.ts
│   │
│   ├── extension/                       # Chrome Extension (Manifest V3)
│   │   ├── manifest.json
│   │   ├── background.js               # Service worker: API calls, badge updates
│   │   ├── content.js                   # Content script: DOM reading, UI injection
│   │   ├── popup/
│   │   │   ├── popup.html              # Extension popup UI
│   │   │   └── popup.js
│   │   ├── components/
│   │   │   └── floating-badge.js       # Shadow DOM badge component
│   │   └── icons/
│   │       ├── icon-16.png
│   │       ├── icon-48.png
│   │       └── icon-128.png
│   │
│   └── desktop/                         # Tauri 2.0 (polish phase)
│       ├── src-tauri/
│       └── src/
│
├── shared/
│   ├── __init__.py
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── models.py                    # Core Pydantic models (AssessRequest, etc.)
│   │   ├── agent_context.py             # AgentContext, AssessActionRequest
│   │   ├── responses.py                 # AssessResponse, DecisionResponse
│   │   └── evidence.py                  # Evidence model
│   ├── constants.py                     # Risk thresholds, action types, asset types
│   └── types/
│       └── index.ts                     # Auto-generated TypeScript interfaces
│
├── ai/
│   ├── adapters/
│   │   ├── __init__.py
│   │   ├── url_adapter.py              # URL lexical feature extraction (15 features)
│   │   ├── text_adapter.py             # Email chunking + tokenization
│   │   └── prompt_adapter.py           # Prompt injection tokenization
│   ├── inference/
│   │   ├── __init__.py
│   │   ├── engine.py                   # ONNX Runtime session management
│   │   ├── calibrator.py              # Confidence calibration (Platt/isotonic)
│   │   └── evidence_generator.py      # SHAP + attention → evidence strings
│   ├── training/
│   │   ├── train_lgbm_url.py          # LightGBM URL model training script
│   │   ├── train_mdeberta_text.py     # mDeBERTa fine-tuning script
│   │   ├── export_onnx.py            # PyTorch → ONNX conversion
│   │   └── adversarial_augment.py     # TextAttack adversarial data generation
│   ├── models/                         # DVC-tracked model artifacts
│   │   ├── url_lgbm.onnx
│   │   ├── mdeberta_text.onnx
│   │   ├── protectai_prompt.onnx
│   │   └── .gitignore                 # Models tracked by DVC, not Git
│   └── evaluation/
│       ├── eval_clean.py              # Evaluate on clean test set
│       ├── eval_adversarial.py        # Evaluate on adversarial test set
│       └── eval_agentic.py            # Evaluate UABR on agentic scenarios
│
├── security/
│   ├── __init__.py
│   ├── policy_engine.py               # Core decision logic (ALLOW/WARN/BLOCK/ASK)
│   ├── action_evaluator.py            # Action-specific risk rules
│   ├── asset_registry.py             # Protected User Assets definitions
│   └── rules/
│       ├── url_rules.py               # URL-specific policy rules
│       ├── action_rules.py            # Action-type-specific rules
│       └── threshold_config.py        # Configurable risk thresholds
│
├── docs/
│   ├── architecture.md                # This engineering plan
│   ├── api-reference.md               # Auto-generated from FastAPI OpenAPI
│   ├── model-cards/
│   │   ├── url-lgbm.md               # Model card for URL classifier
│   │   ├── mdeberta-text.md           # Model card for text classifier
│   │   └── protectai-prompt.md        # Model card for injection detector
│   ├── presentation/
│   │   ├── pitch-script.md            # 3-5 minute demo script
│   │   └── slides-outline.md          # Slide structure
│   └── adversarial-report.md          # Clean vs Adversarial metrics report
│
├── infra/
│   ├── docker-compose.yml             # Full stack: backend + ollama + redis
│   ├── Dockerfile.backend             # Python backend image
│   ├── Dockerfile.ollama              # Ollama with pre-pulled model
│   ├── .env.example                   # Template environment variables
│   └── cloudflare-tunnel.yml          # Tunnel config for MCP remote access
│
├── scripts/
│   ├── download_models.sh             # Download pre-trained weights from HuggingFace
│   ├── generate_types.py             # Pydantic → TypeScript interface generator
│   ├── setup_dev.sh                   # One-command dev environment setup
│   ├── run_eval.sh                    # Run full evaluation pipeline
│   └── demo_scenario.py              # Script to simulate agentic attack scenarios
│
├── tests/
│   ├── unit/
│   │   ├── test_url_adapter.py
│   │   ├── test_text_adapter.py
│   │   ├── test_policy_engine.py
│   │   └── test_inference_service.py
│   ├── integration/
│   │   ├── test_api_endpoints.py
│   │   ├── test_mcp_server.py
│   │   └── test_extension_api.py
│   ├── adversarial/
│   │   ├── test_url_adversarial.py    # Typosquatting, encoding attacks
│   │   ├── test_text_adversarial.py   # Synonym swap, homoglyph attacks
│   │   └── test_prompt_adversarial.py # Injection bypass attempts
│   └── conftest.py                    # Shared fixtures (mock models, test data)
│
├── data/                              # DVC-tracked datasets
│   ├── raw/
│   │   ├── phishtank_urls.csv
│   │   ├── spamassassin_emails/
│   │   └── deepset_prompt_injections.jsonl
│   ├── processed/
│   │   ├── url_features_train.parquet
│   │   ├── url_features_test.parquet
│   │   ├── text_train.jsonl
│   │   └── text_test.jsonl
│   ├── adversarial/
│   │   ├── url_adversarial_test.csv
│   │   └── text_adversarial_test.jsonl
│   └── .gitignore
│
├── experiments/                        # MLflow experiment tracking
│   ├── mlruns/
│   └── notebooks/
│       ├── 01_url_eda.ipynb
│       ├── 02_text_eda.ipynb
│       └── 03_adversarial_analysis.ipynb
│
├── .github/
│   └── workflows/
│       └── ci.yml                     # Lint + unit tests on push
│
├── pyproject.toml                     # Python project config (ruff, pytest, dependencies)
├── dvc.yaml                           # DVC pipeline definition
├── .env.example
├── .gitignore
└── README.md
```

---

## 3. Folder Rationale

| Folder | Why It Exists | What Happens If Removed |
|--------|--------------|------------------------|
| `backend/` | Separates the API layer from ML logic, enabling independent scaling | API and ML code become entangled, making testing and deployment harder |
| `frontend/` | Groups all client-facing code; each subfolder is a deployable unit | No clear boundary between server and client code |
| `shared/` | Single source of truth for data contracts prevents schema drift | Backend and frontend schemas diverge, causing runtime errors |
| `ai/` | Isolates heavy ML dependencies (PyTorch, ONNX) from the lightweight API | FastAPI startup becomes slow due to unnecessary ML imports |
| `security/` | Policy logic is pure business rules, separate from ML inference | Risk scores and decisions become coupled, making threshold tuning impossible |
| `docs/` | Competition requires documentation; centralized docs enable consistent narrative | Documentation scattered across code comments, hard to present |
| `infra/` | One-command deployment for demo day; reproducible environment | "Works on my machine" problems during competition presentation |
| `scripts/` | Automates repetitive tasks; AI agents can execute these directly | Manual steps that are error-prone and time-consuming |
| `tests/` | Proves system correctness; adversarial tests prove robustness to judges | No evidence of quality; judges cannot verify claims |
| `data/` | DVC-tracked datasets ensure reproducibility of model training | Models cannot be retrained; results are not reproducible |
| `experiments/` | MLflow tracking provides evidence of systematic model development | No audit trail of model improvements for the presentation |

---

## 4. Key Configuration Files

| File | Purpose |
|------|---------|
| `pyproject.toml` | Centralizes Python dependencies, linting rules (ruff), and test configuration |
| `dvc.yaml` | Defines the ML pipeline stages (download → preprocess → train → evaluate) |
| `docker-compose.yml` | Orchestrates all services for single-command startup |
| `.env.example` | Documents all required environment variables with safe defaults |
| `manifest.json` | Chrome Extension permissions and content script declarations |
