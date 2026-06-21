# CloudFinance AI — Handoff Document

Read this file at the start of every session, after reading `DEVELOPMENT.md`.

---

## Current Phase Status

| Phase | Status | Notes |
|---|---|---|
| Phase 0 — Audit & Documentation | **COMPLETE** | PROMPTS.md deleted, audit done, management files created, specs written |
| Phase 1 — Auth System | **COMPLETE** | JWT auth deployed to production, migration 0001 applied |
| Phase 2 — Transaction Persistence & CSV Export | **COMPLETE** | Migration 0002 applied, all routes deployed |
| Phase 3 — Frontend Integration & UI Polish | Not started | Blocked on Phase 2 |
| Phase 4 — Polish, README & Deployment | Not started | Blocked on Phase 3 |

---

## Existing Functionality (Audit Results)

### Backend — `apps/backend/`

**Framework:** Hono v4.11.3 on Cloudflare Workers (TypeScript)  
**Entry point:** `apps/backend/src/index.ts`  
**Worker name:** `backend`  
**Production URL:** `https://backend.raulherreradelgadillo09.workers.dev`

**Existing routes:**

| Method | Path | Description |
|---|---|---|
| GET | `/` | Health check — returns "CloudFinance AI API is online!" |
| POST | `/api/analyze` | Takes `{ text }`, calls Llama 3.1, parses JSON response, inserts into D1 `transactions` table |
| GET | `/api/transactions` | Returns all rows from `transactions` ordered by `created_at DESC` — no auth, no pagination |

**Bindings (wrangler.toml):**
- `AI` — Workers AI binding
- `DB` — D1 database, name `cf_ai_db`, ID `b33d2258-53be-4cfa-80a5-ac8535c2539a`

**No migrations directory exists yet.** Schema applied via `data/schema.sql` directly.

**No auth middleware, no JWT, no per-user isolation.** All transactions are shared globally.

---

### Database — Cloudflare D1 (`cf_ai_db`)

**Existing schema** (`data/schema.sql`):
```sql
CREATE TABLE transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'USD',
    description TEXT,
    category TEXT,
    is_anomaly INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Key differences from Phase 2 spec:**
- `id` is `INTEGER AUTOINCREMENT` (not `TEXT UUID`)
- No `user_id` column (to be added in migration `0002`)
- No `type` column (income/expense — the spec adds this; need to decide if adding to existing table or only new rows)
- No indexes
- `currency` column exists (not in the Phase 2 spec — preserve it, do not drop)

**No migration files exist yet.** Phase 1 will establish the migrations directory and apply the first two migrations (users table, refresh_tokens table).

---

### Frontend — `apps/frontend/`

**Framework:** React 19 + Vite 7 + Tailwind CSS v4  
**Production URL:** `https://84b5031a.cloudfinance-ai.pages.dev/`  
**Pages project name:** `cloudfinance-ai`  
**Package manager:** npm

**Single component:** `apps/frontend/src/App.tsx` — all logic in one file.

**Existing features:**
- Natural language input field → `POST /api/analyze` → AI extracts and saves transaction
- Transaction history list (fetched from `GET /api/transactions`)
- Summary cards: total spent, transaction count, anomaly count
- Spending distribution pie chart (Recharts)
- Glassmorphism dark UI (Slate-950 background, indigo/blue gradient accents)

**Existing dependencies:**
- `recharts` v3.6.0 — pie chart
- `@tailwindcss/vite`, `@tailwindcss/postcss`, `tailwindcss` v4 — styling
- No react-router yet
- No Zustand yet
- No Lucide React yet

**API URL hardcoded** in `App.tsx` line 29: `https://backend.raulherreradelgadillo09.workers.dev/api`

**Uses emoji as icons** (getCategoryIcon function). Phase 3 will replace new icons with Lucide, but existing emoji icons are preserved.

---

## What Was Done in Phase 0

1. Read full prompt from `PROMPT_CloudFinanceAI.md`
2. Audited all existing files: backend routes, D1 schema, frontend components, wrangler.toml, package.json files
3. Deleted `PROMPTS.md` — committed as `chore: remove internal development notes`
4. Created `DEVELOPMENT.md`, `HANDOFF.md`, `CONTEXT.md`
5. Created spec files: `specs/auth.md`, `specs/transaction-persistence.md`, `specs/csv-export.md`
6. No code changed

---

## Phase 1 — Completed

**Files added/modified:**
- `apps/backend/src/types.ts` — shared `Bindings` (AI, DB, JWT_SECRET) and `Variables` (user) types
- `apps/backend/src/utils/jwt.ts` — `signAccessToken` (HMAC-SHA256) and `verifyJWT` (Web Crypto only)
- `apps/backend/src/utils/crypto.ts` — PBKDF2 password hash/verify, SHA-256 token hash
- `apps/backend/src/middleware/auth.ts` — Hono `authMiddleware` using `createMiddleware` from `hono/factory`
- `apps/backend/src/routes/auth.ts` — 5 routes: register, login, refresh, logout, me
- `apps/backend/src/db/migrations/0001_create_auth_tables.sql` — users + refresh_tokens tables
- `apps/backend/wrangler.toml` — added `migrations_dir = "src/db/migrations"`
- `apps/backend/src/index.ts` — mounted auth routes at `/api/auth`, updated Bindings type

**Production state:**
- Migration 0001 applied to remote D1 (users + refresh_tokens tables created)
- `JWT_SECRET` set via `wrangler secret put`
- Worker deployed: `https://backend.raulherreradelgadillo09.workers.dev`
- Test user created in production: `phase1test@example.com`

**Verified locally and in production:**
- Register → 201 with JWT pair
- Login → 200 with JWT pair
- /me with valid token → 200 user object
- /me without token → 401
- Duplicate email → 409
- Invalid credentials → 401
- Refresh → 200 new pair, old token revoked
- Revoked refresh token → 401
- Logout → 200 always

## Phase 2 — Completed

**Files added/modified:**
- `apps/backend/src/db/migrations/0002_add_user_columns.sql` — ALTER TABLE: adds `user_id TEXT` + `type TEXT` + 2 indexes
- `apps/backend/src/routes/transactions.ts` — GET (paginated, filterable), GET /summary, POST, DELETE /:id (auth-protected, ownership-checked)
- `apps/backend/src/routes/export.ts` — GET /csv (auth-protected, in-memory CSV, correct Content-Type + Content-Disposition)
- `apps/backend/src/index.ts` — removed old public GET /api/transactions, mounted new routes, updated POST /api/analyze with optional JWT user_id

**Decisions logged:**
- `transactions.id` kept as INTEGER AUTOINCREMENT (can't non-destructively change to TEXT UUID); spec adaptation documented
- `POST /api/analyze` is optionally authenticated — saves with user_id from JWT if present, NULL if not (backward compat for existing frontend)

**Production state:**
- Migration 0002 applied to remote D1 (user_id + type columns + indexes on transactions)
- Worker deployed: `https://backend.raulherreradelgadillo09.workers.dev`
- Verified: register → POST /api/transactions → GET /api/transactions → GET /api/export/csv all working in production

**Verified locally and in production:**
- GET /api/transactions returns only current user's transactions (not others') ✅
- GET /api/transactions unauthenticated → 401 ✅
- Pagination (?page=1&limit=1) ✅
- Filter by type (?type=expense) ✅
- GET /api/transactions/summary → aggregated totals ✅
- POST /api/transactions → 201 with created row ✅
- DELETE /api/transactions/:id → 200, ownership-checked ✅
- DELETE non-existent → 404 ✅
- DELETE another user's transaction → 403 ✅
- Validation errors (bad amount) → 400 with field key ✅
- GET /api/export/csv → 200 with correct headers and RFC 4180 CSV ✅
- GET /api/export/csv unauthenticated → 401 ✅

## Next Steps — Phase 3 (Frontend Integration & UI Polish)

**Requires explicit approval before starting.**

Phase 3 will:
1. Run grill-me decision tree (4 decisions: token storage, refresh interceptor, route protection, component strategy)
2. Install react-router-dom, Zustand, lucide-react in `apps/frontend`
3. Create `useAuth` hook (Zustand store: in-memory token, login, logout, register, auto-refresh on 401)
4. Create `LoginForm` and `RegisterForm` components at `/login` and `/register`
5. Add route protection — redirect to /login if unauthenticated
6. Update Header: show user name/email + Logout when authenticated
7. Create `TransactionHistory` component: table with pagination, filters, delete, empty state
8. Create `ExportButton` component: download CSV with loading state
9. Update AI analyze flow: send Bearer token so transactions save under the user's account
10. Apply ui-ux-pro-max checklist before marking done

**Deliverable:** Full user flow works end-to-end: register → login → add transactions → view history → export CSV → logout.

---

## Known Limitations / Decisions Deferred

- **`transactions.id` is INTEGER** — the Phase 2 spec assumes TEXT UUID. Existing rows use INTEGER. The `user_id` column will be TEXT (UUID from users table). New transaction inserts in Phase 2 will use TEXT UUIDs for `id` if we recreate the table, or keep INTEGER and use `user_id` TEXT as a foreign key. Decision: keep INTEGER id for backward compatibility, add TEXT `user_id` column.
- **No `type` column** (income/expense) in existing transactions table. The Phase 2 spec adds it. We will add it as a nullable column (existing rows get NULL, new rows require it). Decision to confirm in Phase 2 grill-me.
- **CORS** is currently set to `app.use('/api/*', cors())` with permissive defaults. Will need to restrict origins after auth is added.
