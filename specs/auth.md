# Spec: Auth System

## Objective

Add JWT-based authentication to the CloudFinance AI backend. Users can register with email + password, log in to receive a JWT access token and opaque refresh token, and access protected routes using a Bearer token. The existing public AI route (`/api/analyze`) and transactions route behavior will be adjusted — both become user-scoped after Phase 2, but the auth middleware is built here.

---

## Must-Have Requirements

### D1 Schema (migration `0001_create_users.sql`)

- [ ] `users` table with columns: `id TEXT PRIMARY KEY` (UUID), `email TEXT UNIQUE NOT NULL`, `password_hash TEXT NOT NULL`, `name TEXT NOT NULL`, `created_at TEXT NOT NULL` (ISO 8601 UTC)
- [ ] `refresh_tokens` table with columns: `id TEXT PRIMARY KEY` (UUID), `user_id TEXT NOT NULL REFERENCES users(id)`, `token_hash TEXT NOT NULL`, `expires_at TEXT NOT NULL`, `revoked_at TEXT` (nullable), `created_at TEXT NOT NULL`
- [ ] Migration file at `apps/backend/src/db/migrations/0001_create_users.sql`
- [ ] `migrations_dir = "src/db/migrations"` added to `wrangler.toml` `[[d1_databases]]` entry

### Route: POST /api/auth/register

- [ ] Accepts JSON body: `{ email, password, name }`
- [ ] Validates email: valid format, max 254 chars — returns 400 with field-specific error if invalid
- [ ] Validates password: min 8 chars, at least 1 number — returns 400 with field-specific error if invalid
- [ ] Validates name: required, non-empty, max 100 chars — returns 400 with field-specific error if invalid
- [ ] Hashes password with PBKDF2 via `crypto.subtle` (100,000 iterations, SHA-256, 32-byte output) — stores as hex string with salt prefix: `salt:hash`
- [ ] Generates UUID via `crypto.randomUUID()` for user id
- [ ] Inserts user into D1 `users` table
- [ ] Returns 409 Conflict if email already registered
- [ ] On success: generates access token (15 min) + refresh token (7 days), returns `{ user: { id, email, name }, accessToken, refreshToken }`
- [ ] Returns 500 with generic error message if unexpected failure

### Route: POST /api/auth/login

- [ ] Accepts JSON body: `{ email, password }`
- [ ] Queries D1 for user by email
- [ ] Returns 401 with generic "Invalid credentials" message if email not found (do not reveal whether email exists)
- [ ] Verifies password against stored PBKDF2 hash using `crypto.subtle`
- [ ] Returns 401 with "Invalid credentials" if password incorrect
- [ ] On success: generates access token (15 min) + refresh token (7 days)
- [ ] Inserts refresh token hash into `refresh_tokens` table
- [ ] Returns `{ user: { id, email, name }, accessToken, refreshToken }`

### Route: POST /api/auth/refresh

- [ ] Accepts JSON body: `{ refreshToken }`
- [ ] Hashes the provided token and looks up in D1 `refresh_tokens`
- [ ] Returns 401 if token not found, already revoked, or expired
- [ ] Rotates the token: marks old token as revoked (`revoked_at = now`), issues new refresh token
- [ ] Issues new access token (15 min) + new refresh token (7 days)
- [ ] Returns `{ accessToken, refreshToken }`

### Route: POST /api/auth/logout

- [ ] Accepts JSON body: `{ refreshToken }`
- [ ] Hashes token, marks as revoked in D1 (`revoked_at = now`)
- [ ] Returns 200 `{ success: true }` regardless of whether token was found (do not reveal token validity)

### Route: GET /api/auth/me

- [ ] Protected by auth middleware (requires valid Bearer token)
- [ ] Returns `{ user: { id, email, name } }` from JWT claims — no D1 query needed
- [ ] Returns 401 if token missing or invalid

### JWT Implementation

- [ ] Signing algorithm: HMAC-SHA256 via `crypto.subtle`
- [ ] Access token payload: `{ sub: userId, email, name, exp: unixTimestamp }`
- [ ] Access token format: standard base64url-encoded JWT (header.payload.signature)
- [ ] Access token lifetime: 15 minutes
- [ ] Refresh token: `crypto.randomUUID()` stored as a hash (SHA-256) in D1
- [ ] Signing key imported from `JWT_SECRET` env var via `crypto.subtle.importKey()`
- [ ] No npm JWT library installed

### Auth Middleware (`apps/backend/src/middleware/auth.ts`)

- [ ] Extracts Bearer token from `Authorization: Bearer <token>` header
- [ ] Validates JWT signature using `crypto.subtle.verify()`
- [ ] Validates `exp` claim — returns 401 if expired
- [ ] Sets `c.set('user', { id, email, name })` in Hono context on success
- [ ] Returns 401 JSON `{ error: 'Unauthorized' }` if token missing, malformed, invalid, or expired
- [ ] Exported as a Hono middleware function

---

## Edge Cases

- Duplicate email registration → 409 (not 500)
- Missing required fields → 400 with specific field name in error
- JWT with tampered payload → 401 (signature verification fails)
- Expired access token → 401 (check `exp` claim)
- Refresh token used twice → second use gets 401 (token revoked after first use)
- Refresh token expired → 401
- `JWT_SECRET` not set in environment → 500 with "Server configuration error" (do not reveal the missing key name)
- Malformed JSON body → 400

---

## Definition of Done

- `wrangler d1 migrations apply cf_ai_db --local` runs without error
- `wrangler dev` starts without error
- `POST /api/auth/register` with valid body → 201, returns tokens
- `POST /api/auth/login` with correct credentials → 200, returns tokens
- `GET /api/auth/me` with valid Bearer token → 200, returns user
- `GET /api/auth/me` with no token → 401
- `GET /api/auth/me` with expired token → 401
- `POST /api/auth/refresh` with valid token → 200, returns new token pair
- `POST /api/auth/refresh` with used token → 401
- All /review checks pass requirement by requirement
