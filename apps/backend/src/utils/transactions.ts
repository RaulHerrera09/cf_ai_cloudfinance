export type TransactionDraft = {
  amount: number;
  currency: string;
  description: string;
  category: string;
  type: 'income' | 'expense';
  is_anomaly: boolean;
};

export class TransactionValidationError extends Error {
  field: keyof TransactionDraft;

  constructor(field: keyof TransactionDraft, message: string) {
    super(message);
    this.field = field;
  }
}

export function normalizeTransactionDraft(value: unknown): TransactionDraft {
  const input = typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};
  const rawAmount = input.amount;
  if (typeof rawAmount !== 'number' || !Number.isFinite(rawAmount) || rawAmount <= 0) {
    throw new TransactionValidationError('amount', 'Enter an amount greater than zero.');
  }
  if (rawAmount > 1_000_000_000) {
    throw new TransactionValidationError('amount', 'Enter an amount below 1,000,000,000.');
  }

  const rawCategory = typeof input.category === 'string' ? input.category.trim() : '';
  if (!rawCategory || rawCategory.length > 64) {
    throw new TransactionValidationError('category', 'Enter a category between 1 and 64 characters.');
  }

  if (input.type !== 'income' && input.type !== 'expense') {
    throw new TransactionValidationError('type', 'Choose either income or expense.');
  }

  const rawCurrency = typeof input.currency === 'string' ? input.currency.trim().toUpperCase() : 'USD';
  if (!/^[A-Z]{3}$/.test(rawCurrency)) {
    throw new TransactionValidationError('currency', 'Use a three-letter currency code such as USD or GBP.');
  }

  const rawDescription = typeof input.description === 'string' ? input.description.trim() : '';
  if (rawDescription.length > 240) {
    throw new TransactionValidationError('description', 'Keep the description to 240 characters or fewer.');
  }

  return {
    amount: Math.round((rawAmount + Number.EPSILON) * 100) / 100,
    currency: rawCurrency,
    description: rawDescription,
    category: rawCategory,
    type: input.type,
    is_anomaly: Boolean(input.is_anomaly),
  };
}

export type AggregateRow = {
  currency: string | null;
  type: string | null;
  category: string | null;
  total_minor: number;
  count: number;
};

export type CurrencySummary = {
  currency: string;
  incomeMinor: number;
  expenseMinor: number;
  balanceMinor: number;
  transactionCount: number;
  expenseCategories: Array<{ category: string; totalMinor: number; count: number }>;
};

export function buildCurrencySummaries(rows: AggregateRow[]): CurrencySummary[] {
  const summaries = new Map<string, CurrencySummary>();

  for (const row of rows) {
    const currency = /^[A-Z]{3}$/.test(row.currency ?? '') ? row.currency! : 'USD';
    const summary = summaries.get(currency) ?? {
      currency,
      incomeMinor: 0,
      expenseMinor: 0,
      balanceMinor: 0,
      transactionCount: 0,
      expenseCategories: [],
    };
    const minor = Math.round(Number(row.total_minor) || 0);
    const type = row.type === 'income' ? 'income' : 'expense';
    summary.transactionCount += Number(row.count) || 0;

    if (type === 'income') {
      summary.incomeMinor += minor;
    } else {
      summary.expenseMinor += minor;
      summary.expenseCategories.push({
        category: row.category?.trim() || 'Other',
        totalMinor: minor,
        count: Number(row.count) || 0,
      });
    }
    summary.balanceMinor = summary.incomeMinor - summary.expenseMinor;
    summaries.set(currency, summary);
  }

  return [...summaries.values()]
    .map((summary) => ({
      ...summary,
      expenseCategories: summary.expenseCategories.sort((a, b) => b.totalMinor - a.totalMinor),
    }))
    .sort((a, b) => a.currency.localeCompare(b.currency));
}
