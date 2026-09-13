import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import type { Bindings, Variables } from '../types';
import { normalizeTransactionDraft, TransactionValidationError } from '../utils/transactions';
import { buildCurrencySummaries, type AggregateRow } from '../utils/transactions';

const transactions = new Hono<{ Bindings: Bindings; Variables: Variables }>();

transactions.use('*', authMiddleware);

type TransactionRow = {
  id: number;
  amount: number;
  currency: string | null;
  description: string | null;
  category: string | null;
  is_anomaly: number;
  created_at: string;
  user_id: string | null;
  type: string | null;
};

// GET /api/transactions — paginated, filterable
transactions.get('/', async (c) => {
  const user = c.get('user');

  const page = Math.max(1, parseInt(c.req.query('page') ?? '1'));
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') ?? '20')));
  const offset = (page - 1) * limit;

  const conditions: string[] = ['user_id = ?'];
  const params: (string | number)[] = [user.id];

  const category = c.req.query('category');
  if (category) {
    conditions.push('LOWER(category) = LOWER(?)');
    params.push(category);
  }

  const type = c.req.query('type');
  if (type && (type === 'income' || type === 'expense')) {
    conditions.push('type = ?');
    params.push(type);
  }

  const from = c.req.query('from');
  if (from) {
    conditions.push("date(created_at) >= date(?)");
    params.push(from);
  }

  const to = c.req.query('to');
  if (to) {
    conditions.push("date(created_at) <= date(?)");
    params.push(to);
  }

  const where = conditions.join(' AND ');

  const countRow = await c.env.DB.prepare(
    `SELECT COUNT(*) as total FROM transactions WHERE ${where}`
  )
    .bind(...params)
    .first<{ total: number }>();

  const { results } = await c.env.DB.prepare(
    `SELECT * FROM transactions WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  )
    .bind(...params, limit, offset)
    .all<TransactionRow>();

  return c.json({
    data: results,
    total: countRow?.total ?? 0,
    page,
    limit,
  });
});

// GET /api/transactions/summary — aggregated totals for AI analysis
transactions.get('/summary', async (c) => {
  const user = c.get('user');

  const { results } = await c.env.DB.prepare(
    `SELECT COALESCE(currency, 'USD') as currency,
            COALESCE(type, 'expense') as type,
            COALESCE(category, 'Other') as category,
            SUM(CAST(ROUND(amount * 100) AS INTEGER)) as total_minor,
            COUNT(*) as count
     FROM transactions
     WHERE user_id = ?
     GROUP BY COALESCE(currency, 'USD'), COALESCE(type, 'expense'), COALESCE(category, 'Other')`
  )
    .bind(user.id)
    .all<AggregateRow>();

  const currencies = buildCurrencySummaries(results);
  const legacyTotals = new Map<string, { category: string; total: number; count: number }>();
  for (const row of results) {
    const category = row.category ?? 'Other';
    const current = legacyTotals.get(category) ?? { category, total: 0, count: 0 };
    current.total += row.total_minor / 100;
    current.count += row.count;
    legacyTotals.set(category, current);
  }
  const totals = [...legacyTotals.values()];
  const grandTotal = totals.reduce((sum, row) => sum + row.total, 0);

  return c.json({
    totals,
    grandTotal,
    period: { kind: 'all-time', label: 'All recorded activity' },
    currencies,
  });
});

// POST /api/transactions — create transaction for current user
transactions.post('/', async (c) => {
  const user = c.get('user');

  let body: { amount?: unknown; description?: unknown; category?: unknown; type?: unknown; currency?: unknown; is_anomaly?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  let draft;
  try {
    draft = normalizeTransactionDraft(body);
  } catch (error) {
    if (error instanceof TransactionValidationError) {
      return c.json({ error: error.message, field: error.field }, 400);
    }
    throw error;
  }

  const now = new Date().toISOString();
  const result = await c.env.DB.prepare(
    `INSERT INTO transactions (amount, description, category, is_anomaly, currency, user_id, type, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(draft.amount, draft.description || null, draft.category, draft.is_anomaly ? 1 : 0, draft.currency, user.id, draft.type, now)
    .run();

  return c.json(
    {
      success: true,
      data: {
        id: result.meta.last_row_id,
        amount: draft.amount,
        description: draft.description || null,
        category: draft.category,
        type: draft.type,
        currency: draft.currency,
        user_id: user.id,
        is_anomaly: draft.is_anomaly ? 1 : 0,
        created_at: now,
      },
    },
    201
  );
});

// DELETE /api/transactions/:id — ownership-checked delete
transactions.delete('/:id', async (c) => {
  const user = c.get('user');
  const rawId = parseInt(c.req.param('id'));

  if (isNaN(rawId)) return c.json({ error: 'Invalid transaction id' }, 400);

  const row = await c.env.DB.prepare('SELECT id, user_id FROM transactions WHERE id = ?')
    .bind(rawId)
    .first<{ id: number; user_id: string | null }>();

  if (!row) return c.json({ error: 'Transaction not found' }, 404);
  if (row.user_id !== user.id) return c.json({ error: 'Forbidden' }, 403);

  await c.env.DB.prepare('DELETE FROM transactions WHERE id = ?').bind(rawId).run();

  return c.json({ success: true });
});

export default transactions;
