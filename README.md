# CloudFinance AI — Personal Edge Ledger

CloudFinance AI is a personal financial ledger that turns natural language into reviewable transactions. The application combines React, Cloudflare Pages, Workers AI, and D1 to maintain a clear workflow: describe, review, and record.

**Production:** [cloudfinance-ai.pages.dev](https://cloudfinance-ai.pages.dev)

**Verified deployment:** [e08a5f3f.cloudfinance-ai.pages.dev](https://e08a5f3f.cloudfinance-ai.pages.dev)

**API:** [backend.raulherreradelgadillo09.workers.dev](https://backend.raulherreradelgadillo09.workers.dev)

## Included features

- Registration and login with JWT and rotating refresh tokens.
- Edge Ledger dashboard with separate income, expense, and balance views.
- Currency summaries with an explicit selector; currencies are never mixed.
- Expense breakdown using sorted bars and an accessible tabular alternative.
- History with filters, pagination, and CSV export.
- Manual transaction creation.
- Deletion through accessible contextual confirmation.
- Loading, empty, error, and success states for primary operations.
- Responsive and accessible design with keyboard- and touch-friendly controls.

## AI workflow

1. The user writes a phrase such as `Hamburguer 150 MXN`.
2. `POST /api/analyze/preview` interprets the amount, currency, type, category, and description.
3. The interface displays an editable preview.
4. The transaction is created through `POST /api/transactions` only after confirmation.

The preview does not persist information by itself. The frontend preserves the input after errors, allows retries, and prevents duplicate confirmations or late responses.

## Stack and deployment

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite 7, Tailwind CSS 4 |
| Navigation and state | React Router DOM 7, Zustand 5 |
| Icons | Lucide React |
| Backend | Cloudflare Workers + Hono 4 |
| AI | Workers AI, `@cf/meta/llama-3.1-8b-instruct-fp8` |
| Persistence | Cloudflare D1 (`DB` → `cf_ai_db`) |
| Hosting | Cloudflare Pages (SPA) |

The dashboard is loaded with `React.lazy`/`Suspense` and route-based code splitting. The Workers AI binding is `AI`.

## API

All protected routes require `Authorization: Bearer <access-token>`.

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Create an account |
| POST | `/api/auth/login` | Log in |
| POST | `/api/auth/refresh` | Refresh tokens |
| POST | `/api/auth/logout` | Revoke the refresh token |
| GET | `/api/auth/me` | Get the authenticated user |
| POST | `/api/analyze/preview` | Interpret text without persisting; authentication required |
| POST | `/api/analyze` | Compatible flow that interprets and persists a transaction |
| GET | `/api/transactions` | Paginated and filterable history |
| GET | `/api/transactions/summary` | Aggregated totals by currency, type, and category |
| POST | `/api/transactions` | Create a validated transaction |
| DELETE | `/api/transactions/:id` | Delete one of the user's transactions |
| GET | `/api/export/csv` | Export history as CSV |

AI errors use structured responses and safe messages:

- `AI_MODEL_ERROR` → HTTP 502.
- `AI_RESPONSE_PARSE_ERROR` → HTTP 502.
- `AI_TIMEOUT` → HTTP 504.

Worker logs record only technical codes; they do not record user text, tokens, or cookies.

## Local development

Requirements: Node.js 18+, npm, and a Cloudflare account to test remote bindings.

```bash
git clone https://github.com/RaulHerrera09/cf_ai_cloudfinance.git
cd cf_ai_cloudfinance/apps/backend
npm install
npm run dev
```

In another terminal:

```bash
cd cf_ai_cloudfinance/apps/frontend
npm install
npm run dev
```

The frontend uses `VITE_API_URL` to select the API. For an isolated frontend test, you can enable `VITE_USE_MOCKS=true`, which uses local fixtures and does not touch production.

## Available scripts

Frontend (`apps/frontend`):

- `npm run dev` — Vite development server.
- `npm run build` — Incremental typecheck and production build.
- `npm run lint` — ESLint.
- `npm test` — 11 automated tests.
- `npm run preview` — Serve the local build.

Backend (`apps/backend`):

- `npm run dev` — `wrangler dev`.
- `npm run deploy` — Deploy the Worker with minification.
- `npm run cf-typegen` — Generate binding types with Wrangler.

To publish Pages after building the frontend:

```bash
npx wrangler pages deploy dist --project-name cloudfinance-ai
```

## Covered tests

The current suite contains 11 automated tests for:

- Valid preview without persistence.
- Binding/model failure and unparseable response.
- Timeout and structured errors without exposing provider details.
- Single confirmation and retries without duplication.
- Delete cancellation without a destructive request.
- Filters, pagination, and CSV export.
- Separation between income and expenses.
- More than 100 transactions and separate currencies.

Destructive confirmation is validated with local fixtures so real data is not contaminated. These tests are not presented as validation on physical devices.

## Structure

```text
cf_ai_cloudfinance/
├── apps/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── routes/          # auth, transactions, export
│   │   │   ├── middleware/      # JWT authentication
│   │   │   ├── utils/           # AI, validation, and Web Crypto cryptography
│   │   │   └── db/migrations/   # D1 migrations
│   │   └── wrangler.toml
│   └── frontend/
│       ├── src/
│       │   ├── components/      # auth, dashboard, and ledger
│       │   ├── pages/           # login, registration, and dashboard
│       │   ├── lib/             # API, finance, filters, and guards
│       │   ├── mocks/           # local fixtures
│       │   └── store/           # authentication state
│       └── public/              # favicon and Pages redirects
├── data/
├── specs/
├── DEVELOPMENT.md
└── HANDOFF.md
```
