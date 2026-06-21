# CloudFinance AI — Handoff Document

Read this file at the start of every session, after reading `DEVELOPMENT.md`.

---

## Current Phase Status

| Phase | Status | Notes |
|---|---|---|
| Phase 0 — Audit & Documentation | **COMPLETE** | PROMPTS.md deleted, audit done, management files created, specs written |
| Phase 1 — Auth System | Not started | Requires explicit approval to begin |
| Phase 2 — Transaction Persistence & CSV Export | Not started | Blocked on Phase 1 |
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

## Next Steps — Phase 1 (Auth System)

**Requires explicit approval before starting.**

Phase 1 will:
1. Run grill-me decision tree (4 decisions)
2. Confirm `specs/auth.md` is complete
3. Add `migrations_dir` to `wrangler.toml`
4. Create migration `0001_create_users.sql` (users + refresh_tokens tables)
5. Create `apps/backend/src/middleware/auth.ts` (JWT validation)
6. Create `apps/backend/src/routes/auth.ts` (register, login, refresh, logout, me)
7. Wire auth routes into `apps/backend/src/index.ts`
8. Apply migrations locally, verify with wrangler dev

**Deliverable:** `wrangler dev` locally — register → login → JWT → `/api/auth/me` all working.

---

## Known Limitations / Decisions Deferred

- **`transactions.id` is INTEGER** — the Phase 2 spec assumes TEXT UUID. Existing rows use INTEGER. The `user_id` column will be TEXT (UUID from users table). New transaction inserts in Phase 2 will use TEXT UUIDs for `id` if we recreate the table, or keep INTEGER and use `user_id` TEXT as a foreign key. Decision: keep INTEGER id for backward compatibility, add TEXT `user_id` column.
- **No `type` column** (income/expense) in existing transactions table. The Phase 2 spec adds it. We will add it as a nullable column (existing rows get NULL, new rows require it). Decision to confirm in Phase 2 grill-me.
- **CORS** is currently set to `app.use('/api/*', cors())` with permissive defaults. Will need to restrict origins after auth is added.
