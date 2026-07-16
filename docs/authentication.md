# Authentication

The local real-API mode uses opaque Bearer sessions for account endpoints.

## Flow

1. `POST /v1/auth/login` or `POST /v1/auth/register` returns a session token.
2. Send `Authorization: Bearer <token>` to logout and every `/v1/account/*` endpoint.
3. `POST /v1/auth/logout` revokes the current token.

Sessions expire after 12 hours. Only a SHA-256 digest of each opaque token is kept
server-side. Passwords use salted PBKDF2-HMAC-SHA256, and API keys are generated and
rotated independently for each user.

The current user, session and API-key stores are database-backed through the
SQLAlchemy persistence layer, but the portable product does not require a
database server. Local development and Docker Compose use an embedded SQLite
file by default:

```env
DATABASE_URL=sqlite:///./.aisec-data/armor.db
DATABASE_AUTO_CREATE=true
```

This keeps login, API keys, scan history and quota available after restart while
still allowing the project to be copied to another machine without installing
PostgreSQL. PostgreSQL remains an optional SaaS/large-production path through
`pip install -e ".[postgres]"` and Alembic migrations.
