# Spec: Per-User Transaction Persistence

## Objective

Tie transactions to authenticated users. All transaction reads and writes must be scoped to the requesting user's `user_id` (from JWT). Unauthenticated requests to transaction endpoints return 401. The existing anonymous shared transaction table is migrated additively — no data is dropped.

---

## Must-Have Requirements

### D1 Schema (migration `0002_add_user_id_to_transactions.sql`)

- [ ] Adds `user_id TEXT REFERENCES users(id)` column to existing `transactions` table (nullable for backward compatibility with existing anonymous rows)
- [ ] Adds `type TEXT CHECK(type IN ('income', 'expense'))` column (nullable for existing rows)
- [ ] Creates index: `CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id)`
- [ ] Creates index: `CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(user_id, date DESC)` — note: existing table uses `created_at` not `date`; use `created_at` for this index
- [ ] Migration file at `apps/backend/src/db/migrations/0002_add_user_id_to_transactions.sql`
- [ ] Existing data not deleted — anonymous rows have `user_id = NULL`

### Route: GET /api/transactions (modified)

- [ ] Protected by auth middleware — returns 401 if unauthenticated
- [ ] Queries only transactions where `user_id = currentUser.id`
- [ ] Supports pagination: `?page=1&limit=20` (default limit 20, max 100)
- [ ] Supports filter: `?category=Food` (case-insensitive match)
- [ ] Supports filter: `?type=expense` or `?type=income`
- [ ] Supports filter: `?from=2024-01-01&to=2024-12-31` (ISO 8601 date strings, compare against `created_at`)
- [ ] Returns `{ data: Transaction[], total: number, page: number, limit: number }`

### Route: POST /api/transactions (modified)

- [ ] Protected by auth middleware — returns 401 if unauthenticated
- [ ] Accepts JSON body: `{ amount, description, category, type, currency? }`
- [ ] `user_id` is taken from JWT claims — NOT from request body (user cannot set their own user_id)
- [ ] Validates `amount`: required, positive number
- [ ] Validates `category`: required, non-empty string
- [ ] Validates `type`: required, must be `'income'` or `'expense'`
- [ ] Generates `id` using `crypto.randomUUID()` — stored as TEXT (new rows use UUID, not INTEGER autoincrement)
- [ ] Sets `created_at` to ISO 8601 UTC timestamp
- [ ] Returns 201 `{ success: true, data: { id, amount, description, category, type, currency, user_id, created_at } }`

### Route: POST /api/analyze (modified)

- [ ] If user is authenticated (valid Bearer token), saves transaction with `user_id`
- [ ] If no Bearer token, route still works but saves with `user_id = NULL` (backward compat)
- [ ] AI extraction logic unchanged — same Llama 3.1 prompt and JSON parsing
- [ ] After extraction, inserts with `user_id` from JWT if present
- [ ] `type` defaults to `'expense'` for AI-extracted transactions (AI does not extract income/expense distinction in current prompt)

### Route: DELETE /api/transactions/:id (new)

- [ ] Protected by auth middleware — returns 401 if unauthenticated
- [ ] Queries D1 for transaction by `id` — returns 404 if not found
- [ ] Returns 403 if transaction's `user_id` does not match current user's id (ownership check)
- [ ] Deletes the row and returns 200 `{ success: true }`

### Route: GET /api/transactions/summary (new)

- [ ] Protected by auth middleware — returns 401 if unauthenticated
- [ ] Returns aggregated totals by category for the current user
- [ ] Response: `{ totals: [{ category: string, total: number, count: number }], grandTotal: number }`
- [ ] Used by frontend AI analysis section to show real user data

---

## Edge Cases

- GET /api/transactions with no query params → returns first page (20 items) for authenticated user
- GET /api/transactions for user with no transactions → returns `{ data: [], total: 0, page: 1, limit: 20 }`
- POST /api/transactions with negative amount → 400
- DELETE /api/transactions/:id for another user's transaction → 403 (not 404 — do not reveal the row exists)
- Pagination: `?page=999` beyond available data → returns `{ data: [], total: N, page: 999, limit: 20 }`
- Filter combination: `?type=income&category=Salary&from=2024-01-01` → all filters applied together (AND logic)

---

## Definition of Done

- Migration `0002` applied locally without error
- Existing anonymous transactions still exist in D1 (data not deleted)
- Authenticated user can create transactions and only sees their own in GET
- User A cannot delete User B's transactions (returns 403)
- Unauthenticated GET /api/transactions → 401
- Pagination works: `?page=2&limit=5` returns correct slice
- GET /api/transactions/summary returns correct aggregated totals
- All /review checks pass requirement by requirement
