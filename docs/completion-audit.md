# Completion Audit

Audit date: 2026-07-11

## Verified product requirements

| Requirement | Evidence |
|---|---|
| Web scanner/chat | Next.js production build; REST/WebSocket contract tests |
| Chrome Extension source | MV3 manifest, opt-in privacy control, Shadow DOM warning UI, CI syntax gate |
| URL/text/SMS/file/prompt adapters | Runtime implementations and backend tests |
| Long text handling | Sentence chunking with max-risk aggregation in `ai/inference/engine.py` |
| Vietnamese explanation | Ollama Qwen service with deterministic fallback and sanitized evidence-only prompt |
| Robustness lab | `robustness_report.json`: 100% detection for URL homoglyph, VI leetspeak, base64 prompt and zero-width cases |
| MCP Security Armor | Seven strict Pydantic-validated tools; stdio, SSE and Streamable HTTP transports |
| MCP filesystem isolation | `assess_file_static` is contained in `MCP_SANDBOX_DIR`, with traversal and size tests |
| Authentication/account | Hashed sessions/API keys, profile, password rotation, quota, history and subscription cancellation tests |
| Admin operations | Admin-only RBAC, contained paths, one-model-per-job training and candidate artifact directory |
| Quality gate | Ruff clean; 96 backend tests; 71% runtime coverage (minimum 65%); frontend test/typecheck/build pass |
| Supply chain | `npm audit --audit-level=moderate` reports zero vulnerabilities |
| Local deployment definition | `docker compose config` passes and includes backend, web, MCP and Ollama services |

## Environment-dependent release checks

These checks cannot be claimed as passed from the current environment:

1. `docker compose build backend web mcp` — Docker Desktop daemon was not running.
2. Chrome “Load unpacked” interactive check — installation requires user confirmation in Chrome.
3. Public MCP fixed-domain tunnel — requires an owned domain/tunnel credentials and external deployment authority.

Run before a public release:

```bash
docker compose build backend web mcp
docker compose up -d
curl http://localhost:8000/v1/health
```

Then load `frontend/extension/` from `chrome://extensions`, enable protection in the popup, and verify the safe/warn/danger/offline cases. For external MCP, expose only `127.0.0.1:3001/mcp` through an authenticated HTTPS tunnel.
