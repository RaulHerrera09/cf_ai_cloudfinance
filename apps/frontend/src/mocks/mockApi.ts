import type { Transaction } from '../components/Transactions/TransactionHistory';
import { buildCurrencySummaries, type AggregateRow } from '../../../backend/src/utils/transactions.ts';

const descriptions = [
  'Monthly salary payment', 'Neighbourhood market and pantry staples', 'Train to client workshop',
  'Independent design consultation', 'Electricity and broadband bill', 'Dinner with friends after the product launch',
  'Accessibility reference books', 'Annual health check', 'Cloud storage subscription', 'Desk lamp and notebook',
];
const categories = ['Salary', 'Groceries', 'Transport', 'Freelance', 'Utilities', 'Food & Drinks', 'Education', 'Health & Fitness', 'Other', 'Shopping'];

function makeFixtures(): Transaction[] {
  return Array.from({ length: 125 }, (_, index) => {
    const income = index % 17 === 0;
    const currency = index % 11 === 0 ? 'USD' : index % 7 === 0 ? 'EUR' : 'GBP';
    const amount = income ? 2450 + index * 1.25 : Math.round((8.35 + ((index * 13.17) % 180)) * 100) / 100;
    const category = income ? (index % 34 === 0 ? 'Salary' : 'Freelance') : categories[(index % (categories.length - 2)) + 1];
    return {
      id: 1000 + index,
      amount,
      currency,
      description: index === 4 ? 'A deliberately long transaction description used to verify that complete ledger details remain available on narrow screens and at high zoom levels.' : descriptions[index % descriptions.length],
      category,
      type: income ? 'income' : 'expense',
      is_anomaly: index === 22 ? 1 : 0,
      created_at: new Date(Date.UTC(2026, 8, 12 - (index % 90))).toISOString(),
      user_id: 'local-demo-user',
    };
  });
}

let transactions = makeFixtures();
let nextId = 2000;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

function token() {
  const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode({ sub: 'local-demo-user', email: 'demo@cloudfinance.dev', name: 'Local Demo' })}.fixture`;
}

function summaryRows(source: Transaction[] = transactions): AggregateRow[] {
  const rows = new Map<string, AggregateRow>();
  for (const transaction of source) {
    const key = `${transaction.currency}|${transaction.type}|${transaction.category}`;
    const row = rows.get(key) ?? { currency: transaction.currency, type: transaction.type, category: transaction.category, total_minor: 0, count: 0 };
    row.total_minor += Math.round(transaction.amount * 100);
    row.count += 1;
    rows.set(key, row);
  }
  return [...rows.values()];
}

export function resetMockFixtures() { transactions = makeFixtures(); nextId = 2000; }
export function mockTransactionCount() { return transactions.length; }

export async function mockFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const configuredDelay = typeof localStorage === 'undefined' ? 0 : Number(localStorage.getItem('cf_mock_delay') ?? 90);
  await new Promise((resolve) => setTimeout(resolve, Math.max(0, configuredDelay)));
  const parsed = new URL(url, 'http://local.test');
  const method = options.method ?? 'GET';
  const source = typeof localStorage !== 'undefined' && localStorage.getItem('cf_mock_empty') === 'true' ? [] : transactions;

  if (parsed.pathname.endsWith('/auth/login') || parsed.pathname.endsWith('/auth/register') || parsed.pathname.endsWith('/auth/refresh')) {
    return json({ accessToken: token(), refreshToken: 'local-refresh-token', user: { id: 'local-demo-user', email: 'demo@cloudfinance.dev', name: 'Local Demo' } });
  }
  if (parsed.pathname.endsWith('/auth/logout')) return json({ success: true });

  if (parsed.pathname.endsWith('/analyze/preview') && method === 'POST') {
    const body = JSON.parse(String(options.body ?? '{}')) as { text?: string };
    const text = body.text?.trim() ?? '';
    if (!text) return json({ error: 'Describe a transaction first.' }, 400);
    const amount = Number(text.match(/\d+(?:[.,]\d{1,2})?/)?.[0].replace(',', '.') ?? 0);
    if (!amount) return json({ error: 'Include an amount so the entry can be reviewed.' }, 400);
    const currency = /\bGBP\b|£/i.test(text) ? 'GBP' : /\bEUR\b|€/i.test(text) ? 'EUR' : 'USD';
    const type = /salary|paid me|received|income/i.test(text) ? 'income' : 'expense';
    const category = type === 'income' ? 'Income' : /train|uber|bus/i.test(text) ? 'Transport' : /dinner|food|coffee/i.test(text) ? 'Food & Drinks' : 'Other';
    return json({ success: true, data: { amount, currency, type, category, description: text, is_anomaly: false } });
  }

  if (parsed.pathname.endsWith('/transactions/summary')) {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('cf_mock_summary_error') === 'true') {
      return json({ error: 'Fixture summary unavailable.' }, 503);
    }
    return json({ period: { kind: 'all-time', label: 'All recorded activity' }, currencies: buildCurrencySummaries(summaryRows(source)), totals: [], grandTotal: 0 });
  }

  if (parsed.pathname.endsWith('/export/csv')) {
    const rows = source.map((item) => `${item.created_at.slice(0, 10)},${item.type},${item.category},${item.amount.toFixed(2)},${item.currency},"${item.description?.replace(/"/g, '""') ?? ''}"`);
    return new Response(`Date,Type,Category,Amount,Currency,Description\n${rows.join('\n')}`, { headers: { 'Content-Type': 'text/csv' } });
  }

  if (/\/transactions\/\d+$/.test(parsed.pathname) && method === 'DELETE') {
    const id = Number(parsed.pathname.split('/').at(-1));
    transactions = transactions.filter((item) => item.id !== id);
    return json({ success: true });
  }

  if (parsed.pathname.endsWith('/transactions') && method === 'POST') {
    const body = JSON.parse(String(options.body ?? '{}')) as Partial<Transaction>;
    const created: Transaction = { id: nextId++, amount: Number(body.amount), currency: body.currency ?? 'USD', category: body.category ?? 'Other', description: body.description ?? null, type: body.type === 'income' ? 'income' : 'expense', is_anomaly: 0, created_at: new Date().toISOString(), user_id: 'local-demo-user' };
    transactions = [created, ...transactions];
    return json({ success: true, data: created }, 201);
  }

  if (parsed.pathname.endsWith('/transactions')) {
    let filtered = [...source];
    const type = parsed.searchParams.get('type');
    const category = parsed.searchParams.get('category');
    const from = parsed.searchParams.get('from');
    const to = parsed.searchParams.get('to');
    if (type) filtered = filtered.filter((item) => item.type === type);
    if (category) filtered = filtered.filter((item) => item.category === category);
    if (from) filtered = filtered.filter((item) => item.created_at.slice(0, 10) >= from);
    if (to) filtered = filtered.filter((item) => item.created_at.slice(0, 10) <= to);
    const page = Number(parsed.searchParams.get('page') ?? 1);
    const limit = Number(parsed.searchParams.get('limit') ?? 10);
    return json({ data: filtered.slice((page - 1) * limit, page * limit), total: filtered.length, page, limit });
  }

  return json({ error: 'Mock route not found.' }, 404);
}
