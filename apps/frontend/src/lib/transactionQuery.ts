export type TransactionFilters = {
  type: string;
  category: string;
  from: string;
  to: string;
};

export function buildTransactionQuery(page: number, limit: number, filters: TransactionFilters): string {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (filters.type) params.set('type', filters.type);
  if (filters.category) params.set('category', filters.category);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  return params.toString();
}
