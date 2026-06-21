import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import type { Bindings, Variables } from '../types';

const exportRoute = new Hono<{ Bindings: Bindings; Variables: Variables }>();

exportRoute.use('*', authMiddleware);

type TransactionRow = {
  amount: number;
  currency: string | null;
  description: string | null;
  category: string | null;
  type: string | null;
  created_at: string;
};

function csvField(value: string | null | undefined): string {
  const str = value ?? '';
  return `"${str.replace(/"/g, '""')}"`;
}

// GET /api/export/csv
exportRoute.get('/csv', async (c) => {
  const user = c.get('user');

  const { results } = await c.env.DB.prepare(
    `SELECT amount, currency, description, category, type, created_at
     FROM transactions WHERE user_id = ? ORDER BY created_at ASC`
  )
    .bind(user.id)
    .all<TransactionRow>();

  const header = 'Date,Type,Category,Amount,Currency,Description\n';
  const rows = results.map((t) => {
    const date = t.created_at ? t.created_at.split('T')[0] : '';
    return [
      csvField(date),
      csvField(t.type),
      csvField(t.category),
      t.amount.toFixed(2),
      csvField(t.currency ?? 'USD'),
      csvField(t.description),
    ].join(',');
  });

  const csv = header + rows.join('\n');

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="cloudfinance-export.csv"',
    },
  });
});

export default exportRoute;
