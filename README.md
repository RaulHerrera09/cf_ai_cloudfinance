# CloudFinance AI

A full-stack financial assistant running entirely on **Cloudflare's global edge network**. Natural language input is parsed by a Llama 3.1 LLM, structured transactions are persisted per-user in a SQLite edge database, and the dashboard renders spending analytics in real time.

**Live demo →** https://cloudfinance-ai.pages.dev

```
Email:    demo@cloudfinance.dev
Password: Demo2024!
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **LLM** | Cloudflare Workers AI — `@cf/meta/llama-3.1-8b-instruct` |
| **Backend** | Cloudflare Workers + Hono v4 (TypeScript) |
| **Auth** | JWT (HMAC-SHA256) + PBKDF2 via Web Crypto API — no Node.js deps |
| **Database** | Cloudflare D1 (SQLite at the edge) |
| **Frontend** | React 19 + Vite 7 + Tailwind CSS v4 |
| **State** | Zustand (auth store) + React Router DOM v7 |
| **Charts** | Recharts |
| **Hosting** | Cloudflare Pages (SPA) |

---

## Features

- **Natural language input** — type *"spent £45 on dinner"* and Llama 3.1 extracts amount, category, and anomaly flag
- **JWT authentication** — register/login with access tokens (15 min) + rotating refresh tokens (7 days)
- **Per-user transaction history** — paginated table with type and category filters
- **CSV export** — one-click download of all your transactions as RFC 4180 CSV
- **Spending distribution** — donut chart by category updated on each transaction
- **Anomaly detection** — AI flags unusually high transactions relative to your spending history
- **Edge-native** — zero cold-start infrastructure: Workers, D1, Pages, and Workers AI all run on Cloudflare

---

## Local Setup

**Prerequisites:** Node.js 18+, a Cloudflare account, `wrangler` CLI.

```bash
# 1. Clone and install backend
git clone https://github.com/RaulHerrera09/cf_ai_cloudfinance.git
cd cf_ai_cloudfinance/apps/backend && npm install

# 2. Create local D1 and apply migrations
npx wrangler d1 execute cf_ai_db --local --file=../../data/schema.sql
npx wrangler d1 migrations apply cf_ai_db --local

# 3. Add JWT secret for local dev (create this file manually — it is gitignored)
echo 'JWT_SECRET=any-32-char-string-for-local-dev-only' > .dev.vars

# 4. Start the backend Worker
npm run dev

# 5. Install and start the frontend (new terminal)
cd ../frontend && npm install && npm run dev
```

The frontend dev server runs at `http://localhost:5173` and proxies API calls to `http://localhost:8787`.

---

## Deploy to Production

```bash
# Backend — set the JWT secret once, then deploy
npx wrangler secret put JWT_SECRET
cd apps/backend && npm run deploy

# Apply D1 migrations to production
npx wrangler d1 migrations apply cf_ai_db --remote

# Frontend — build and deploy to Pages
cd apps/frontend && npm run build
npx wrangler pages deploy dist --project-name cloudfinance-ai
```

---

## Project Structure

```
cf_ai_cloudfinance/
├── apps/
│   ├── backend/                  # Cloudflare Worker
│   │   ├── src/
│   │   │   ├── routes/           # auth.ts, transactions.ts, export.ts
│   │   │   ├── middleware/       # auth.ts (JWT verification)
│   │   │   ├── utils/            # jwt.ts, crypto.ts (Web Crypto only)
│   │   │   └── db/migrations/    # 0001 users/refresh_tokens, 0002 user_id+type
│   │   └── wrangler.toml
│   └── frontend/                 # React SPA
│       ├── src/
│       │   ├── components/       # Auth forms, TransactionHistory, ExportButton
│       │   ├── pages/            # LoginPage, RegisterPage, DashboardPage
│       │   ├── store/            # auth.ts (Zustand)
│       │   └── lib/              # api.ts (apiFetch + JWT interceptor)
│       └── public/_redirects     # Cloudflare Pages SPA routing
├── data/
│   └── schema.sql                # Original transactions table schema
├── DEVELOPMENT.md                # Full developer reference
├── HANDOFF.md                    # Phase status + decisions log
└── specs/                        # auth.md, transaction-persistence.md, csv-export.md
```

---


