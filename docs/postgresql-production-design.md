# PostgreSQL Production Design

> Current default: the portable/local product uses embedded SQLite and does not
> require a PostgreSQL server. This document remains the optional path for SaaS
> or larger multi-user production deployments.

Tai lieu nay thiet ke tang du lieu production cho AI Security Armor khi chuyen tu
demo/local sang he thong nhieu nguoi dung. Muc tieu la thay cac store tam thoi
trong memory va `localStorage` bang PostgreSQL, trong khi van giu core AI
inference stateless va nhanh.

## 1. Ket luan kien truc

Chon **PostgreSQL lam database chinh**.

PostgreSQL phu hop voi du an nay vi du lieu co quan he ro rang:

- Tai khoan, phien dang nhap, API key.
- Goi dich vu, subscription, quota hang ngay.
- Lich su scan, evidence, sandbox report.
- Admin jobs, model versions, audit logs.
- User feedback de active learning ve sau.

Khong nen luu model ONNX, tokenizer, dataset CSV lon vao PostgreSQL. Cac artifact
do nen o filesystem, object storage, DVC hoac MLflow; PostgreSQL chi luu metadata
va duong dan artifact.

Kien truc khuyen nghi:

```text
Web / Extension / MCP / API clients
        |
        v
FastAPI Security Gateway
        |
        +-- PostgreSQL: identity, quota, history, jobs, audit
        |
        +-- Redis optional: cache URL scan, distributed rate limit, job queue
        |
        +-- server/models: ONNX artifacts
        |
        +-- Ollama: explanation LLM
```

## 2. Pham vi production

Can persistence cho cac diem hien tai dang tam thoi:

| Hien tai | Production target |
|---|---|
| `USERS`, `SESSIONS` trong memory | `users`, `sessions` |
| API key dat trong user object memory | `api_keys` voi hash + rotation |
| `/account/history` tra `[]` | `scan_events`, `scan_evidence` |
| Quota client `localStorage` | `daily_quota_usage` server-side |
| Admin job status global dict | `admin_jobs`, `admin_job_events` |
| Demo metrics memory | `demo_sessions`, `demo_attack_events` |
| Model metadata JSON/file only | `model_versions` |
| Khong audit | `audit_logs` |

## 3. Runtime dependencies

Backend Python nen them:

```toml
dependencies = [
  "sqlalchemy[asyncio]>=2.0",
  "asyncpg>=0.29",
  "alembic>=1.13",
  "argon2-cffi>=23.1",
]
```

Neu muon dung driver sync cho scripts/migrations:

```toml
dependencies = [
  "psycopg[binary]>=3.2",
]
```

Bien moi truong production:

```env
DATABASE_URL=postgresql+asyncpg://armor_app:${DB_PASSWORD}@postgres:5432/armor
ALEMBIC_DATABASE_URL=postgresql+psycopg://armor_migrator:${DB_MIGRATOR_PASSWORD}@postgres:5432/armor
DATABASE_POOL_SIZE=10
DATABASE_MAX_OVERFLOW=20
DATABASE_POOL_TIMEOUT=30
SESSION_TTL_SECONDS=43200
API_KEY_PEPPER=<server-side-secret>
STORE_RAW_SCAN_INPUT=false
REDIS_URL=redis://redis:6379/0
```

## 4. Database roles

Dung toi thieu 4 role:

```sql
CREATE ROLE armor_migrator LOGIN PASSWORD '...';
CREATE ROLE armor_app LOGIN PASSWORD '...';
CREATE ROLE armor_readonly LOGIN PASSWORD '...';
CREATE ROLE armor_backup LOGIN PASSWORD '...';
```

Quyen:

- `armor_migrator`: tao/sua schema, chi dung trong migration.
- `armor_app`: `SELECT/INSERT/UPDATE/DELETE` tren bang app can dung.
- `armor_readonly`: dashboard/BI read-only.
- `armor_backup`: backup/export, khong ghi du lieu.

Khong dung superuser cho app.

## 5. Schema SQL v1

### 5.1 Extensions va enums

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TYPE user_role AS ENUM ('user', 'admin');
CREATE TYPE account_status AS ENUM ('active', 'disabled', 'deleted');
CREATE TYPE plan_tier AS ENUM ('free', 'pro', 'team', 'enterprise');
CREATE TYPE subscription_status AS ENUM ('trialing', 'active', 'past_due', 'canceled', 'expired');
CREATE TYPE api_key_status AS ENUM ('active', 'revoked', 'expired');
CREATE TYPE source_channel AS ENUM ('web', 'extension', 'mcp', 'api', 'admin', 'demo');
CREATE TYPE modality AS ENUM ('url', 'email', 'text', 'sms', 'prompt', 'file', 'action');
CREATE TYPE risk_level AS ENUM ('safe', 'low', 'medium', 'high', 'critical');
CREATE TYPE decision AS ENUM ('ALLOW', 'WARN', 'BLOCK', 'ASK_USER_CONFIRMATION');
CREATE TYPE severity AS ENUM ('info', 'low', 'medium', 'high', 'critical');
CREATE TYPE job_type AS ENUM ('spec_execution', 'model_training', 'model_promotion', 'maintenance');
CREATE TYPE job_status AS ENUM ('queued', 'running', 'completed', 'failed', 'canceled');
CREATE TYPE model_status AS ENUM ('candidate', 'active', 'disabled', 'archived');
CREATE TYPE feedback_label AS ENUM ('correct', 'false_positive', 'false_negative', 'uncertain');
```

### 5.2 Users, sessions, API keys

```sql
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email citext NOT NULL UNIQUE,
  display_name text NOT NULL,
  avatar_url text,
  password_hash text NOT NULL,
  password_algorithm text NOT NULL DEFAULT 'argon2id',
  role user_role NOT NULL DEFAULT 'user',
  status account_status NOT NULL DEFAULT 'active',
  email_verified_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash char(64) NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  source_ip_hash char(64),
  user_agent_hash char(64),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at > created_at)
);

CREATE INDEX idx_sessions_user_active
  ON sessions(user_id, expires_at DESC)
  WHERE revoked_at IS NULL;

CREATE TABLE api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Default key',
  key_prefix text NOT NULL,
  key_hash char(64) NOT NULL UNIQUE,
  scopes text[] NOT NULL DEFAULT ARRAY['scan']::text[],
  status api_key_status NOT NULL DEFAULT 'active',
  expires_at timestamptz,
  last_used_at timestamptz,
  rotated_from_id uuid REFERENCES api_keys(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

CREATE INDEX idx_api_keys_user_status ON api_keys(user_id, status);
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);
```

Security rule:

- Session token va API key chi hien thi plaintext dung 1 lan khi tao.
- Database chi luu SHA-256/HMAC hash.
- API key nen co dang `sk_live_<prefix>_<secret>`.
- `key_prefix` dung de hien thi/mask va tra cuu nhanh, khong dung de xac thuc.

### 5.3 Plans, subscriptions, quota

```sql
CREATE TABLE plans (
  tier plan_tier PRIMARY KEY,
  label text NOT NULL,
  daily_scan_limit integer,
  monthly_price_vnd integer,
  yearly_price_vnd integer,
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (daily_scan_limit IS NULL OR daily_scan_limit >= 0)
);

INSERT INTO plans(tier, label, daily_scan_limit, monthly_price_vnd, yearly_price_vnd, features)
VALUES
  ('free', 'FREE', 50, 0, 0, '{"api_key": false, "history_days": 7}'::jsonb),
  ('pro', 'PRO', NULL, 99000, 990000, '{"api_key": true, "history_days": 90}'::jsonb),
  ('team', 'TEAM', NULL, 299000, 2990000, '{"api_key": true, "history_days": 365, "mcp": true}'::jsonb),
  ('enterprise', 'ENTERPRISE', NULL, NULL, NULL, '{"api_key": true, "history_days": 730, "mcp": true, "sso": true}'::jsonb);

CREATE TABLE subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_tier plan_tier NOT NULL REFERENCES plans(tier),
  status subscription_status NOT NULL DEFAULT 'active',
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  trial_ends_at timestamptz,
  renews_at timestamptz,
  canceled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscriptions_user_active
  ON subscriptions(user_id, status, created_at DESC);

CREATE TABLE daily_quota_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  api_key_id uuid REFERENCES api_keys(id) ON DELETE SET NULL,
  anonymous_id text,
  usage_day date NOT NULL,
  scan_count integer NOT NULL DEFAULT 0,
  limit_snapshot integer,
  last_scan_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (scan_count >= 0),
  CHECK (limit_snapshot IS NULL OR limit_snapshot >= 0),
  CHECK (
    ((user_id IS NOT NULL)::int +
     (api_key_id IS NOT NULL)::int +
     (anonymous_id IS NOT NULL)::int) = 1
  )
);

CREATE UNIQUE INDEX uq_quota_user_day
  ON daily_quota_usage(user_id, usage_day)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX uq_quota_api_key_day
  ON daily_quota_usage(api_key_id, usage_day)
  WHERE api_key_id IS NOT NULL;

CREATE UNIQUE INDEX uq_quota_anonymous_day
  ON daily_quota_usage(anonymous_id, usage_day)
  WHERE anonymous_id IS NOT NULL;
```

`daily_scan_limit = NULL` nghia la unlimited. Quota phai enforce o backend, khong
tin `localStorage`.

### 5.4 Scan history va evidence

```sql
CREATE TABLE scan_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL UNIQUE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  api_key_id uuid REFERENCES api_keys(id) ON DELETE SET NULL,
  channel source_channel NOT NULL,
  modality modality NOT NULL,
  normalized_url text,
  input_sha256 char(64),
  input_preview text,
  input_size_bytes integer,
  risk_score numeric(5,4) NOT NULL,
  risk_level risk_level NOT NULL,
  decision decision NOT NULL,
  confidence numeric(5,4) NOT NULL,
  model_version text NOT NULL,
  latency_ms numeric(10,2) NOT NULL DEFAULT 0,
  source_ip_hash char(64),
  user_agent_hash char(64),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (risk_score >= 0 AND risk_score <= 1),
  CHECK (confidence >= 0 AND confidence <= 1),
  CHECK (input_size_bytes IS NULL OR input_size_bytes >= 0)
);

CREATE INDEX idx_scan_events_user_created
  ON scan_events(user_id, created_at DESC);

CREATE INDEX idx_scan_events_api_key_created
  ON scan_events(api_key_id, created_at DESC);

CREATE INDEX idx_scan_events_hash_created
  ON scan_events(input_sha256, created_at DESC);

CREATE INDEX idx_scan_events_url_created
  ON scan_events(normalized_url, created_at DESC)
  WHERE normalized_url IS NOT NULL;

CREATE INDEX idx_scan_events_modality_level
  ON scan_events(modality, risk_level, created_at DESC);

CREATE TABLE scan_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_event_id uuid NOT NULL REFERENCES scan_events(id) ON DELETE CASCADE,
  source text NOT NULL,
  message text NOT NULL,
  severity severity NOT NULL DEFAULT 'info',
  feature text,
  contribution numeric(10,6),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_scan_evidence_scan ON scan_evidence(scan_event_id);
CREATE INDEX idx_scan_evidence_severity ON scan_evidence(severity);
```

Privacy rule:

- Mac dinh khong luu raw email/text/prompt.
- Luu `input_sha256`, kich thuoc, sanitized preview ngan, evidence va output.
- Neu can debugging enterprise, them co `STORE_RAW_SCAN_INPUT=true` va bang rieng
  co retention ngan + encryption application-level.

### 5.5 Sandbox reports

```sql
CREATE TABLE sandbox_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_event_id uuid REFERENCES scan_events(id) ON DELETE SET NULL,
  sandbox_type text NOT NULL CHECK (sandbox_type IN ('http', 'browser')),
  url text NOT NULL,
  final_url text,
  execution_status text NOT NULL CHECK (execution_status IN ('completed', 'failed')),
  ok boolean NOT NULL DEFAULT false,
  status_code integer,
  resolved_ip inet,
  content_type text,
  bytes_read integer,
  page_title text,
  elapsed_ms numeric(10,2) NOT NULL DEFAULT 0,
  tls jsonb NOT NULL DEFAULT '{}'::jsonb,
  page_signals jsonb NOT NULL DEFAULT '{}'::jsonb,
  redirects jsonb NOT NULL DEFAULT '[]'::jsonb,
  issues jsonb NOT NULL DEFAULT '[]'::jsonb,
  scan_steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  network_events jsonb NOT NULL DEFAULT '[]'::jsonb,
  browser_events jsonb NOT NULL DEFAULT '[]'::jsonb,
  canary jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (bytes_read IS NULL OR bytes_read >= 0)
);

CREATE INDEX idx_sandbox_runs_scan ON sandbox_runs(scan_event_id);
CREATE INDEX idx_sandbox_runs_created ON sandbox_runs(created_at DESC);
CREATE INDEX idx_sandbox_runs_issues_gin ON sandbox_runs USING gin(issues);
```

### 5.6 Chat persistence optional

Chi bat neu muon nguoi dung xem lai chat. Neu khong, co the bo qua v1.

```sql
CREATE TABLE chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  title text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  scan_event_id uuid REFERENCES scan_events(id) ON DELETE SET NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  content_redacted boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_messages_conversation
  ON chat_messages(conversation_id, created_at ASC);
```

### 5.7 Admin jobs, model versions, audit

```sql
CREATE TABLE admin_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type job_type NOT NULL,
  status job_status NOT NULL DEFAULT 'queued',
  progress integer NOT NULL DEFAULT 0,
  current_step text,
  message text,
  spec_id text,
  data_path text,
  models text[] NOT NULL DEFAULT ARRAY[]::text[],
  started_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (progress >= 0 AND progress <= 100)
);

CREATE INDEX idx_admin_jobs_status_created
  ON admin_jobs(status, created_at DESC);

CREATE TABLE admin_job_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES admin_jobs(id) ON DELETE CASCADE,
  level text NOT NULL CHECK (level IN ('debug', 'info', 'warning', 'error')),
  message text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_job_events_job_created
  ON admin_job_events(job_id, created_at ASC);

CREATE TABLE model_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name text NOT NULL,
  modality modality NOT NULL,
  status model_status NOT NULL DEFAULT 'candidate',
  artifact_uri text NOT NULL,
  metadata_uri text,
  tokenizer_uri text,
  training_dataset_uri text,
  validation_dataset_uri text,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  f1 numeric(6,5),
  accuracy numeric(6,5),
  precision_score numeric(6,5),
  recall numeric(6,5),
  trained_by_job_id uuid REFERENCES admin_jobs(id) ON DELETE SET NULL,
  promoted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (f1 IS NULL OR (f1 >= 0 AND f1 <= 1)),
  CHECK (accuracy IS NULL OR (accuracy >= 0 AND accuracy <= 1))
);

CREATE INDEX idx_model_versions_name_status
  ON model_versions(model_name, status, created_at DESC);

CREATE UNIQUE INDEX uq_active_model_per_name
  ON model_versions(model_name)
  WHERE status = 'active';

CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  actor_api_key_id uuid REFERENCES api_keys(id) ON DELETE SET NULL,
  actor_channel source_channel NOT NULL,
  action text NOT NULL,
  resource_type text,
  resource_id uuid,
  source_ip_hash char(64),
  user_agent_hash char(64),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_actor_time
  ON audit_logs(actor_user_id, created_at DESC);

CREATE INDEX idx_audit_logs_action_time
  ON audit_logs(action, created_at DESC);
```

### 5.8 Feedback va outbox

```sql
CREATE TABLE user_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_event_id uuid NOT NULL REFERENCES scan_events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  label feedback_label NOT NULL,
  corrected_risk_level risk_level,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_feedback_scan ON user_feedback(scan_event_id);
CREATE INDEX idx_user_feedback_label_created ON user_feedback(label, created_at DESC);

CREATE TABLE outbox_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  published_at timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_outbox_unpublished
  ON outbox_events(created_at ASC)
  WHERE published_at IS NULL;
```

Outbox dung neu sau nay co worker async: email, analytics, training pipeline,
webhook billing.

### 5.9 Updated-at trigger

```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER plans_set_updated_at
  BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER subscriptions_set_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER daily_quota_usage_set_updated_at
  BEFORE UPDATE ON daily_quota_usage
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER chat_conversations_set_updated_at
  BEFORE UPDATE ON chat_conversations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER admin_jobs_set_updated_at
  BEFORE UPDATE ON admin_jobs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

## 6. Backend integration design

Them cac module:

```text
backend/
  db.py                         # async engine, sessionmaker, health check
  models.py                     # SQLAlchemy ORM models
  repositories/
    users.py
    sessions.py
    api_keys.py
    quota.py
    scans.py
    admin_jobs.py
    audit.py
  services/
    auth_service.py
    quota_service.py
    scan_log_service.py
    api_key_service.py
    audit_service.py
```

`backend/dependencies.py` nen them:

```python
async def get_db_session() -> AsyncIterator[AsyncSession]:
    async with async_sessionmaker() as session:
        yield session
```

Auth endpoints khong nen thao tac dict global nua. Chuyen sang service:

- `register`: insert `users`, insert default `subscriptions`, create session row.
- `login`: find user by email, verify password hash, insert session row, update last login.
- `logout`: set `sessions.revoked_at`.
- `get_plan`: read active subscription + plans.
- `get_api_key`: return active key metadata, not full secret unless just created.
- `rotate_api_key`: revoke old active key, create new key, audit log.

## 7. E2E request flow

### 7.1 Register/login

```text
POST /v1/auth/register
  -> normalize email
  -> hash password with Argon2id
  -> INSERT users
  -> INSERT subscriptions(plan_tier='free')
  -> INSERT sessions(token_hash, expires_at)
  -> INSERT audit_logs(action='auth.register')
  -> return session token + user + plan
```

Production nen uu tien HttpOnly Secure SameSite cookie. Neu van dung Bearer token
cho web UI, token phai ngan han va luu server-side hash nhu schema tren.

### 7.2 Scan URL/text

```text
POST /v1/assess/url
  -> authenticate optional user/API key
  -> validate + sanitize input
  -> reserve quota in PostgreSQL
  -> run inference outside long transaction
  -> INSERT scan_events
  -> INSERT scan_evidence[]
  -> INSERT audit_logs(action='scan.url')
  -> return AssessResponse
```

Quota reservation phai atomic. Vi du cho user:

```sql
INSERT INTO daily_quota_usage(user_id, usage_day, scan_count, limit_snapshot, last_scan_at)
VALUES (:user_id, CURRENT_DATE, 1, :limit_snapshot, now())
ON CONFLICT (user_id, usage_day) WHERE user_id IS NOT NULL
DO UPDATE SET
  scan_count = daily_quota_usage.scan_count + 1,
  limit_snapshot = EXCLUDED.limit_snapshot,
  last_scan_at = now()
WHERE EXCLUDED.limit_snapshot IS NULL
   OR daily_quota_usage.scan_count < EXCLUDED.limit_snapshot
RETURNING scan_count, limit_snapshot;
```

Neu query khong return row thi quota exceeded. `limit_snapshot = NULL` nghia la
unlimited.

Khong giu DB transaction trong luc ONNX/Ollama chay. Transaction chi nen ngan:
reserve quota, insert scan result, insert evidence.

### 7.3 Account history

```text
GET /v1/account/history
  -> require session
  -> SELECT latest scan_events WHERE user_id = current_user
  -> map to ScanRecord: id, timestamp, type, score, riskLevel
```

### 7.4 Extension/MCP API key

```text
Request header: Authorization: Bearer sk_live_xxx
  -> parse prefix
  -> hash secret with API_KEY_PEPPER
  -> find api_keys.key_hash status active
  -> load user/subscription/scopes
  -> enforce quota
  -> audit actor_api_key_id
```

### 7.5 Admin model training

```text
POST /admin/models/train
  -> require admin user
  -> INSERT admin_jobs(status='queued')
  -> worker picks job
  -> update progress in admin_jobs
  -> write events to admin_job_events
  -> training script writes artifact to server/models or object storage
  -> INSERT model_versions(status='candidate', metrics)
  -> admin promotes candidate
  -> transaction: old active -> archived, candidate -> active
```

Admin UI poll `/admin/models/train/status` by job id, khong dung global dict.

## 8. Redis optional

PostgreSQL la source of truth. Redis chi nen dung cho:

- URL scan cache 5-15 phut: key `scan:url:<sha256>`.
- Distributed rate limit.
- Background job queue neu khong dung Postgres polling.
- WebSocket pub/sub cho demo metrics/admin progress.

Redis cache miss thi goi inference va ghi PostgreSQL. Redis cache hit co the van
ghi `scan_events` neu muon lich su day du.

## 9. Deployment production

### 9.1 Docker Compose production baseline

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: armor
      POSTGRES_USER: armor_migrator
      POSTGRES_PASSWORD: ${DB_MIGRATOR_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U armor_migrator -d armor"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    environment:
      DATABASE_URL: postgresql+asyncpg://armor_app:${DB_PASSWORD}@postgres:5432/armor
      ALEMBIC_DATABASE_URL: postgresql+psycopg://armor_migrator:${DB_MIGRATOR_PASSWORD}@postgres:5432/armor
    depends_on:
      postgres:
        condition: service_healthy

volumes:
  postgres-data:
```

Voi production thuc te, uu tien managed PostgreSQL hon container tu quan ly.

### 9.2 Connection pooling

- Local/small deployment: SQLAlchemy pool la du.
- Multi-instance backend: them PgBouncer o transaction pooling mode.
- Dat `pool_size` theo `max_connections` cua Postgres va so replica backend.

### 9.3 Backup/restore

Muc tieu toi thieu:

- Daily full backup.
- WAL/PITR neu dung managed database.
- RPO <= 24h cho MVP paid; <= 15 phut cho production paid.
- RTO <= 4h cho MVP paid; <= 1h cho production paid.
- Hang thang test restore vao staging.

Retention:

- `sessions`: xoa row expired/revoked sau 30 ngay.
- `scan_events`: free 30-90 ngay, paid 365 ngay, enterprise tuy hop dong.
- `audit_logs`: toi thieu 365 ngay.
- `admin_jobs/model_versions`: giu lau hon vi can reproducibility.

## 10. Security controls

Bat buoc:

- TLS toi database.
- Database trong private network, khong expose public internet.
- Password, API key, session token chi luu hash.
- `API_KEY_PEPPER` nam trong secret manager, khong nam trong DB.
- Principle of least privilege cho DB roles.
- Audit moi thao tac nhay cam: login fail, key rotate, plan change, admin job,
  model promote, scan blocked high-risk.
- Raw user input default khong luu.
- Neu bat raw storage, can encryption application-level va retention ngan.

Nen co:

- Row-level security cho enterprise multi-tenant.
- Read replica cho analytics/history neu load lon.
- WAF/API gateway o public edge.
- `pg_stat_statements` de quan sat query cham.

## 11. Migration roadmap tu repo hien tai

### Phase 1: DB foundation

- Them `backend/db.py`.
- Them SQLAlchemy + Alembic.
- Tao migration schema v1.
- Them health check DB vao `/v1/health`.
- Chua doi behavior API.

### Phase 2: Auth persistence

- Thay `USERS` va `SESSIONS` bang `users`, `sessions`.
- Seed demo user bang migration/script idempotent.
- Update tests `tests/test_auth.py`.
- Frontend contract giu nguyen.

### Phase 3: API keys + quota

- Chuyen `ApiKeyInfo` sang `api_keys`.
- Enforce quota server-side trong assess endpoints.
- Client `QuotaGuard` chi con dung de hien thi optimistic, khong la source of truth.

### Phase 4: Scan history

- Insert `scan_events` va `scan_evidence` sau moi assess.
- `/v1/account/history` doc tu DB.
- Mock client van co the giu `localStorage` cho standalone mode.

### Phase 5: Admin jobs + model versions

- Thay `training_status` va `task_execution_status` global dict.
- Job id explicit.
- Luu metrics va artifact metadata vao `model_versions`.

### Phase 6: Audit, retention, backups

- Them audit service.
- Them scheduled cleanup.
- Them backup/restore runbook.
- Them monitoring query + dashboard.

## 12. Test plan

Can co tests:

- Migration test: migrate up/down tren Postgres test container.
- Auth persistence: restart app van login duoc user da tao.
- Session revocation: logout revoke token hash.
- API key rotation: old key bi tu choi, new key duoc chap nhan.
- Quota race test: 100 request dong thoi, free user khong vuot 50/ngay.
- Scan history: assess xong co record dung user, dung evidence.
- Privacy: raw input khong duoc luu khi `STORE_RAW_SCAN_INPUT=false`.
- Admin job persistence: restart backend van doc duoc job status.
- Model promotion transaction: chi co 1 active model moi `model_name`.
- Audit logs: co log cho login, rotate key, admin train, model promote.

## 13. API contract changes toi thieu

Nen giu contract frontend hien tai de it sua UI:

- `POST /v1/auth/login` tra `Session`.
- `POST /v1/auth/register` tra `Session`.
- `GET /v1/account/history` tra `ScanRecord[]`.
- `GET /v1/account/api-key` tra masked/current metadata. Neu can plaintext, chi tra
  khi create/rotate.
- `POST /v1/account/api-key/rotate` tra plaintext key mot lan.

Nen them endpoints:

```text
GET  /v1/account/quota
POST /v1/account/api-key
DELETE /v1/account/api-key/{id}
GET  /v1/account/audit
POST /v1/scans/{scan_id}/feedback
GET  /admin/jobs/{job_id}
GET  /admin/models
POST /admin/models/{model_version_id}/promote
```

## 14. Operational queries

High-risk scans trong 24h:

```sql
SELECT modality, risk_level, count(*)
FROM scan_events
WHERE created_at >= now() - interval '24 hours'
GROUP BY modality, risk_level
ORDER BY modality, risk_level;
```

Top URLs scan lap lai:

```sql
SELECT normalized_url, count(*) AS scans, max(created_at) AS last_seen
FROM scan_events
WHERE normalized_url IS NOT NULL
GROUP BY normalized_url
ORDER BY scans DESC
LIMIT 50;
```

Quota gan het:

```sql
SELECT user_id, usage_day, scan_count, limit_snapshot
FROM daily_quota_usage
WHERE usage_day = CURRENT_DATE
  AND limit_snapshot IS NOT NULL
  AND scan_count >= limit_snapshot * 0.8
ORDER BY scan_count DESC;
```

Model dang active:

```sql
SELECT model_name, modality, artifact_uri, metrics, promoted_at
FROM model_versions
WHERE status = 'active'
ORDER BY model_name;
```

## 15. Definition of done

Duoc coi la PostgreSQL production-ready khi:

- Khong con user/session/API key production trong memory.
- Quota duoc enforce server-side bang transaction atomic.
- Moi scan thanh cong co `scan_events` va `scan_evidence`.
- Account history doc tu DB.
- Admin training/status doc tu DB.
- API key va session token chi luu hash.
- Co Alembic migration reproducible.
- Co backup/restore runbook.
- Co audit logs cho hanh dong nhay cam.
- Tests bao phu concurrency quota va auth persistence.
