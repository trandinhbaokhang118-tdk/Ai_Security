# Authentication

The local real-API mode uses opaque Bearer sessions for account endpoints.

## Flow

1. `POST /v1/auth/login` or `POST /v1/auth/register` returns a session token.
2. Send `Authorization: Bearer <token>` to logout and every `/v1/account/*` endpoint.
3. `POST /v1/auth/logout` revokes the current token.

Sessions expire after 12 hours. Only a SHA-256 digest of each opaque token is kept
server-side. Passwords use salted PBKDF2-HMAC-SHA256, and API keys are generated and
rotated independently for each user.

The current user, session and API-key stores are in memory for local development.
Restarting the backend clears registered users and sessions, then restores only the
demo account. Production deployment still requires a persistent identity/session
store and HttpOnly cookie or equivalent hardened token storage.
