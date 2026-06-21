# CloudFinance AI — Development Guide

## Stack Overview

CloudFinance AI runs entirely on Cloudflare's edge network. There is no traditional server — all compute happens in V8 isolates distributed globally.

| Layer | Technology | Location |
|---|---|---|
| Backend | Cloudflare Workers + Hono (TypeScript) | `apps/backend/` |
| AI | Workers AI — `@cf/meta/llama-3.1-8b-instruct` | bound as `AI` |
| Database | Cloudflare D1 (SQLite at the edge) | bound as `DB`, name `cf_ai_db` |
| Frontend | Cloudflare Pages — React 19 + Vite + Tailwind CSS v4 | `apps/frontend/` |

**Package manager:** npm (both apps). Do not switch to pnpm or yarn.

---

## Wrangler Commands

All backend commands run from `apps/backend/`:

```bash
# Start local dev server (D1 uses local SQLite file)
npm run dev
# or: npx wrangler dev

# Deploy Worker to production
npm run deploy
# or: npx wrangler deploy --minify

# Stream live logs from production Worker
npx wrangler tail

# Apply D1 migrations locally (test first)
npx wrangler d1 migrations apply cf_ai_db --local

# Apply D1 migrations to production (only after local passes)
npx wrangler d1 migrations apply cf_ai_db --remote

# Set a production secret (never commit secrets to git)
npx wrangler secret put JWT_SECRET

# Type generation from wrangler.toml bindings
npm run cf-typegen
```

---

## D1 Migrations — How to Add One

1. Create a new file in `apps/backend/src/db/migrations/` named with the next sequential number: `0003_describe_what_it_does.sql`.
2. Write only additive SQL (new tables, new columns with defaults, new indexes). Never drop columns or modify existing ones destructively.
3. Test locally: `npx wrangler d1 migrations apply cf_ai_db --local` from `apps/backend/`.
4. Verify the local dev server still works: `npm run dev`.
5. Apply to production: `npx wrangler d1 migrations apply cf_ai_db --remote`.
6. Commit the migration file.

**Important:** Never edit an existing migration file after it has been applied. D1 tracks which migrations have run — editing an applied file will corrupt the migration state.

The `wrangler.toml` must have a `migrations_dir` configured for the `d1_databases` entry:
```toml
[[d1_databases]]
binding = "DB"
database_name = "cf_ai_db"
database_id = "b33d2258-53be-4cfa-80a5-ac8535c2539a"
migrations_dir = "src/db/migrations"
```

---

## Adding a New Hono Route

1. Create a new file in `apps/backend/src/routes/`, e.g. `auth.ts`.
2. Export a Hono app instance from that file:
   ```typescript
   import { Hono } from 'hono';
   const auth = new Hono<{ Bindings: Bindings; Variables: Variables }>();
   auth.post('/register', async (c) => { ... });
   export default auth;
   ```
3. Mount it in `apps/backend/src/index.ts`:
   ```typescript
   import auth from './routes/auth';
   app.route('/api/auth', auth);
   ```
4. Apply middleware to the route group if needed (e.g. JWT auth middleware).

---

## Workers AI Integration

The existing AI call is in `apps/backend/src/index.ts` at `POST /api/analyze`. It uses the `AI` binding:

```typescript
const aiResponse: any = await c.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
  messages: [
    { role: 'system', content: '...' },
    { role: 'user', content: text },
  ],
});
```

The model returns `aiResponse.response` as a string. The existing code uses a regex (`/\{.*\}/s`) to extract JSON from the response — keep this pattern, as the model sometimes wraps JSON in prose.

---

## JWT Implementation (Web Crypto Only)

**Do not install `jsonwebtoken` or any JWT npm package.** Workers run in V8 isolates — Node.js built-in modules (`crypto`, `buffer`, etc.) are not available. Use the Web Crypto API exclusively.

### Access token signing (HMAC-SHA256):
```typescript
const key = await crypto.subtle.importKey(
  'raw',
  new TextEncoder().encode(secret),
  { name: 'HMAC', hash: 'SHA-256' },
  false,
  ['sign', 'verify']
);
```

### Password hashing (PBKDF2):
```typescript
const keyMaterial = await crypto.subtle.importKey(
  'raw',
  new TextEncoder().encode(password),
  'PBKDF2',
  false,
  ['deriveBits']
);
const bits = await crypto.subtle.deriveBits(
  { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
  keyMaterial,
  256
);
```

---

## Cloudflare-Specific Constraints

- **No Node.js APIs.** Use Web APIs only: `fetch`, `crypto.subtle`, `Request`, `Response`, `URL`, `TextEncoder`, `TextDecoder`.
- **1MB Worker size limit (compressed).** Run `npx wrangler deploy --dry-run` after adding any new dependency. If over limit, identify and remove the largest unnecessary dependency.
- **D1 eventual consistency on free tier.** Do not assume immediate read-after-write in tests or production code.
- **`wrangler dev` uses local SQLite.** For final validation of schema changes, use `wrangler dev --remote`.
- **Secrets:** Never hardcode secrets. Use `wrangler secret put <NAME>` for production. Use `.dev.vars` (gitignored) for local dev secrets.
- **UUID generation:** Use `crypto.randomUUID()` — available in Workers runtime.

---

## Required Secrets

| Secret | Purpose | How to set |
|---|---|---|
| `JWT_SECRET` | HMAC-SHA256 key for signing JWTs | `npx wrangler secret put JWT_SECRET` (from `apps/backend/`) |

For local development, add to `apps/backend/.dev.vars` (gitignored):
```
JWT_SECRET=local-dev-secret-at-least-32-chars
```

---

## Active Skills

This project uses these skills throughout development:

- **caveman** — terse responses during active phases; full prose for management files only
- **grill-me** — decision tree at start of each phase before any code
- **spec** — every feature has a spec in `specs/` written before coding
- **build** — build exactly what the spec describes, nothing more
- **review** — verify every spec requirement after building
- **frontend-design** — preserve existing aesthetic when adding new UI
- **ui-ux-pro-max** — quality gates for all new UI components
- **diagnose** — six-phase debugging protocol for any breakage

---

## Session Start Ritual

**Every new Claude Code session must begin by reading:**
1. `DEVELOPMENT.md` (this file) — stack, constraints, commands
2. `HANDOFF.md` — current phase status, what's been built, what's next

Do not touch any code before completing the session start ritual.

---

## Deployment URLs

- **Frontend (Cloudflare Pages):** `https://84b5031a.cloudfinance-ai.pages.dev/`
- **Backend (Cloudflare Workers):** `https://backend.raulherreradelgadillo09.workers.dev`
- **Pages project name:** `cloudfinance-ai`
- **Worker name:** `backend`

Both URLs must remain functional throughout all phases of development.
