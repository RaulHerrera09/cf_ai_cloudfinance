import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCurrencySummaries } from '../../backend/src/utils/transactions.ts';
import { interpretTransaction } from '../../backend/src/utils/ai-preview.ts';
import { expensePercentage, parseSummaryResponse, toMinorUnits } from '../src/lib/finance.ts';
import { createMutationGate, shouldSendDeleteRequest } from '../src/lib/interactionGuards.ts';
import { buildTransactionQuery } from '../src/lib/transactionQuery.ts';
import { mockFetch, mockTransactionCount, resetMockFixtures } from '../src/mocks/mockApi.ts';

test('income is excluded from expense totals and distribution', () => {
  const [summary] = buildCurrencySummaries([
    { currency: 'GBP', type: 'income', category: 'Salary', total_minor: 250000, count: 1 },
    { currency: 'GBP', type: 'expense', category: 'Food', total_minor: 2550, count: 2 },
  ]);
  assert.equal(summary.incomeMinor, 250000);
  assert.equal(summary.expenseMinor, 2550);
  assert.deepEqual(summary.expenseCategories.map((item) => item.category), ['Food']);
  assert.equal(summary.balanceMinor, 247450);
});

test('summary represents more than 100 transactions without page truncation', () => {
  const [summary] = buildCurrencySummaries([
    { currency: 'USD', type: 'expense', category: 'Other', total_minor: 12500, count: 125 },
  ]);
  assert.equal(summary.transactionCount, 125);
  assert.equal(summary.expenseMinor, 12500);
});

test('different currencies remain separate', () => {
  const summaries = buildCurrencySummaries([
    { currency: 'EUR', type: 'expense', category: 'Travel', total_minor: 1010, count: 1 },
    { currency: 'USD', type: 'expense', category: 'Travel', total_minor: 2020, count: 1 },
  ]);
  assert.deepEqual(summaries.map((item) => item.currency), ['EUR', 'USD']);
  assert.deepEqual(summaries.map((item) => item.expenseMinor), [1010, 2020]);
});

test('invalid or failed summary cannot be parsed as zero', () => {
  assert.throws(() => parseSummaryResponse({ error: 'offline' }), /missing currency totals/);
});

test('money helpers round decimals at minor-unit boundaries', () => {
  assert.equal(toMinorUnits(10.235), 1024);
  assert.equal(toMinorUnits(0.1 + 0.2), 30);
  assert.equal(expensePercentage(1, 3), 33.3);
});

test('AI preview does not persist and mutation gate permits one confirmation', async () => {
  resetMockFixtures();
  const before = mockTransactionCount();
  const response = await mockFetch('http://local/api/analyze/preview', { method: 'POST', body: JSON.stringify({ text: 'Paid GBP 28.40 for dinner' }) });
  assert.equal(response.status, 200);
  assert.equal(mockTransactionCount(), before);
  const gate = createMutationGate();
  assert.equal(gate.begin(), true);
  assert.equal(gate.begin(), false);
  gate.end();
  assert.equal(gate.begin(), true);
});

test('backend AI interpretation returns a draft without any persistence dependency', async () => {
  let calls = 0;
  const ai = { run: async () => { calls += 1; return { response: '{"amount":10.235,"currency":"gbp","description":"Lunch","category":"Food","type":"expense","is_anomaly":false}' }; } };
  const draft = await interpretTransaction(ai, 'Paid GBP 10.235 for lunch');
  assert.equal(calls, 1);
  assert.equal(draft.amount, 10.24);
  assert.equal(draft.currency, 'GBP');
  assert.equal(draft.type, 'expense');
});

test('cancelling deletion never authorizes a destructive request', () => {
  assert.equal(shouldSendDeleteRequest('cancel'), false);
  assert.equal(shouldSendDeleteRequest('confirm'), true);
});

test('filters, pagination and CSV export remain available', async () => {
  const query = buildTransactionQuery(3, 10, { type: 'expense', category: 'Food & Drinks', from: '2026-01-01', to: '2026-12-31' });
  const params = new URLSearchParams(query);
  assert.equal(params.get('page'), '3');
  assert.equal(params.get('category'), 'Food & Drinks');
  const exportResponse = await mockFetch('http://local/api/export/csv');
  assert.match(exportResponse.headers.get('content-type') ?? '', /text\/csv/);
  assert.match(await exportResponse.text(), /^Date,Type,Category,Amount,Currency,Description/);
});
