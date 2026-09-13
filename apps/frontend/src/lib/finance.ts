export type ExpenseCategory = {
  category: string;
  totalMinor: number;
  count: number;
};

export type CurrencySummary = {
  currency: string;
  incomeMinor: number;
  expenseMinor: number;
  balanceMinor: number;
  transactionCount: number;
  expenseCategories: ExpenseCategory[];
};

export type SummaryResponse = {
  period: { kind: 'all-time'; label: string };
  currencies: CurrencySummary[];
};

export type SummaryState =
  | { status: 'loading'; data: null; error: null }
  | { status: 'error'; data: null; error: string }
  | { status: 'ready'; data: SummaryResponse; error: null };

export const loadingSummary: SummaryState = { status: 'loading', data: null, error: null };

export function formatMoney(minor: number, currency: string, locale = 'en-GB'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    currencyDisplay: 'code',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(minor / 100);
}

export function toMinorUnits(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100);
}

export function expensePercentage(totalMinor: number, expenseMinor: number): number {
  if (expenseMinor <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((totalMinor / expenseMinor) * 1000) / 10));
}

export function parseSummaryResponse(value: unknown): SummaryResponse {
  if (!value || typeof value !== 'object') throw new Error('The summary response was not valid.');
  const data = value as Partial<SummaryResponse>;
  if (!Array.isArray(data.currencies) || !data.period?.label) {
    throw new Error('The summary response is missing currency totals.');
  }
  return data as SummaryResponse;
}
