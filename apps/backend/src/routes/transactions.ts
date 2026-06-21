import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import type { Bindings, Variables } from '../types';

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
    `SELECT category, SUM(amount) as total, COUNT(*) as count
     FROM transactions WHERE user_id = ? GROUP BY category`
  )
    .bind(user.id)
    .all<{ category: string; total: number; count: number }>();

  const grandTotal = results.reduce((sum, row) => sum + row.total, 0);

  return c.json({ totals: results, grandTotal });
});

// POST /api/transactions — create transaction for current user
transactions.post('/', async (c) => {
  const user = c.get('user');

  let body: { amount?: unknown; description?: unknown; category?: unknown; type?: unknown; currency?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const { amount, description, category, type, currency } = body;

  if (typeof amount !== 'number' || amount <= 0) {
    return c.json({ error: 'Amount must be a positive number', field: 'amount' }, 400);
  }
  if (typeof category !== 'string' || !category.trim()) {
    return c.json({ error: 'Category is required', field: 'category' }, 400);
  }
  if (type !== 'income' && type !== 'expense') {
    return c.json({ error: 'Type must be "income" or "expense"', field: 'type' }, 400);
  }

  const now = new Date().toISOString();
  const safeDescription = typeof description === 'string' ? description.trim() : null;
  const safeCurrency = typeof currency === 'string' ? currency.trim() : 'USD';

  const result = await c.env.DB.prepare(
    `INSERT INTO transactions (amount, description, category, is_anomaly, currency, user_id, type, created_at)
     VALUES (?, ?, ?, 0, ?, ?, ?, ?)`
  )
    .bind(amount, safeDescription, category.trim(), safeCurrency, user.id, type, now)
    .run();

  return c.json(
    {
      success: true,
      data: {
        id: result.meta.last_row_id,
        amount,
        description: safeDescription,
        category: category.trim(),
        type,
        currency: safeCurrency,
        user_id: user.id,
        is_anomaly: 0,
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
