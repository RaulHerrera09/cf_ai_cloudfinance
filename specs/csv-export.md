# Spec: CSV Export

## Objective

Allow authenticated users to download their full transaction history as a CSV file. The CSV is generated in memory on the Worker — no file system, no external library. One click in the UI triggers a file download in the browser.

---

## Must-Have Requirements

### Route: GET /api/export/csv

- [ ] Protected by auth middleware — returns 401 if unauthenticated
- [ ] Queries ALL transactions for the current user (no pagination — full export)
- [ ] Ordered by `created_at ASC` (chronological, oldest first)
- [ ] Builds CSV string in memory as a plain string concatenation — no npm CSV library
- [ ] CSV headers: `Date,Type,Category,Amount,Currency,Description`
- [ ] Each row maps to: `created_at (date portion only),type,category,amount,currency,description`
- [ ] `description` field is quoted with double quotes and any internal double quotes are escaped as `""`
- [ ] Sets response header `Content-Type: text/csv; charset=utf-8`
- [ ] Sets response header `Content-Disposition: attachment; filename="cloudfinance-export.csv"`
- [ ] Returns 200 with CSV body
- [ ] If user has no transactions, returns a valid CSV with only the header row (not an empty body)
- [ ] Route implemented in `apps/backend/src/routes/export.ts` and mounted at `/api/export/csv` in `apps/backend/src/index.ts`

### CSV Format Example

```
Date,Type,Category,Amount,Currency,Description
2024-01-15,expense,Food,45.00,USD,"Dinner with friends"
2024-01-16,income,Other,2500.00,USD,"Monthly salary"
2024-01-17,expense,Transport,12.50,USD,"Uber to airport"
```

---

## Edge Cases

- User with no transactions → returns headers only, no data rows, HTTP 200
- Description containing commas → must be quoted: `"Coffee, pastry, and juice"`
- Description containing double quotes → escaped: `"Said ""hello"" to everyone"`
- Description is NULL/empty → output as empty quoted string: `""`
- Large transaction sets (100+ rows) → generated in memory, no streaming required for this scale
- Unauthenticated request → 401 JSON error (not a CSV error response)

---

## Definition of Done

- GET /api/export/csv with valid Bearer token → response has `Content-Type: text/csv`, `Content-Disposition: attachment; filename="cloudfinance-export.csv"`, and valid CSV body
- GET /api/export/csv unauthenticated → 401 JSON
- CSV can be opened in Excel and Google Sheets without import errors
- User with 0 transactions → valid single-row CSV (headers only)
- Special characters in description (commas, quotes) → correctly escaped
- No npm CSV library installed in the Worker
- All /review checks pass requirement by requirement
