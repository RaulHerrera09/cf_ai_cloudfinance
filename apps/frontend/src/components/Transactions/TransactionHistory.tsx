import { useState, useEffect, type FormEvent } from 'react';
import { Trash2, AlertTriangle, ChevronLeft, ChevronRight, Plus, X, Loader2 } from 'lucide-react';
import { apiFetch, API_URL } from '../../lib/api';

interface Transaction {
  id: number;
  amount: number;
  currency: string | null;
  description: string | null;
  category: string | null;
  is_anomaly: number;
  created_at: string;
  user_id: string | null;
  type: string | null;
}

interface ListResponse {
  data: Transaction[];
  total: number;
  page: number;
  limit: number;
}

const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Utilities', 'Other'];
const LIMIT = 10;

interface Props {
  refreshKey?: number;
}

export function TransactionHistory({ refreshKey = 0 }: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [filterType, setFilterType] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  const [showAddForm, setShowAddForm] = useState(false);
  const [addAmount, setAddAmount] = useState('');
  const [addDescription, setAddDescription] = useState('');
  const [addCategory, setAddCategory] = useState('Food');
  const [addType, setAddType] = useState<'income' | 'expense'>('expense');
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const fetchTransactions = async (p: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) });
      if (filterType) params.set('type', filterType);
      if (filterCategory) params.set('category', filterCategory);
      if (filterFrom) params.set('from', filterFrom);
      if (filterTo) params.set('to', filterTo);

      const res = await apiFetch(`${API_URL}/transactions?${params}`);
      if (!res.ok) throw new Error('Failed to load transactions');
      const json: ListResponse = await res.json();
      setTransactions(json.data ?? []);
      setTotal(json.total ?? 0);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load transactions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [filterType, filterCategory, filterFrom, filterTo, refreshKey]);

  useEffect(() => {
    fetchTransactions(page);
  }, [page, filterType, filterCategory, filterFrom, filterTo, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      const res = await apiFetch(`${API_URL}/transactions/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      setTotal((prev) => prev - 1);
    } catch {
      setError('Could not delete transaction. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    setAddError(null);
    const amount = parseFloat(addAmount);
    if (isNaN(amount) || amount <= 0) {
      setAddError('Enter a valid positive amount');
      return;
    }
    setIsAdding(true);
    try {
      const res = await apiFetch(`${API_URL}/transactions`, {
        method: 'POST',
        body: JSON.stringify({
          amount,
          description: addDescription.trim() || null,
          category: addCategory,
          type: addType,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Failed to add transaction');
      }
      setAddAmount('');
      setAddDescription('');
      setAddCategory('Food');
      setAddType('expense');
      setShowAddForm(false);
      setPage(1);
      await fetchTransactions(1);
    } catch (e: unknown) {
      setAddError(e instanceof Error ? e.message : 'Failed to add');
    } finally {
      setIsAdding(false);
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return iso;
    }
  };

  const inputCls =
    'bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition';

  return (
    <section className="bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-xl">
      {/* Header */}
      <div className="p-6 border-b border-white/5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <span className="bg-blue-500/20 text-blue-400 p-2 rounded-lg text-base" aria-hidden>📜</span>
            Transaction History
          </h2>
          <button
            onClick={() => setShowAddForm((v) => !v)}
            aria-expanded={showAddForm}
            aria-controls="add-form"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition min-h-[44px]"
          >
            {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showAddForm ? 'Cancel' : 'Add Transaction'}
          </button>
        </div>

        {/* Inline Add Form */}
        {showAddForm && (
          <form
            id="add-form"
            onSubmit={handleAdd}
            aria-label="Add transaction form"
            className="mt-4 p-4 bg-slate-800/50 rounded-xl border border-white/5 space-y-3"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label htmlFor="add-amount" className="block text-xs text-slate-400 mb-1">Amount</label>
                <input
                  id="add-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={addAmount}
                  onChange={(e) => setAddAmount(e.target.value)}
                  placeholder="0.00"
                  className={inputCls + ' w-full'}
                  required
                />
              </div>
              <div>
                <label htmlFor="add-type" className="block text-xs text-slate-400 mb-1">Type</label>
                <select
                  id="add-type"
                  value={addType}
                  onChange={(e) => setAddType(e.target.value as 'income' | 'expense')}
                  className={inputCls + ' w-full'}
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>
              <div>
                <label htmlFor="add-category" className="block text-xs text-slate-400 mb-1">Category</label>
                <select
                  id="add-category"
                  value={addCategory}
                  onChange={(e) => setAddCategory(e.target.value)}
                  className={inputCls + ' w-full'}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="add-desc" className="block text-xs text-slate-400 mb-1">Description</label>
                <input
                  id="add-desc"
                  type="text"
                  value={addDescription}
                  onChange={(e) => setAddDescription(e.target.value)}
                  placeholder="Optional"
                  className={inputCls + ' w-full'}
                />
              </div>
            </div>
            {addError && <p role="alert" className="text-xs text-red-400">{addError}</p>}
            <button
              type="submit"
              disabled={isAdding}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition min-h-[44px]"
            >
              {isAdding ? <Loader2 className="w-4 h-4 motion-safe:animate-spin" /> : <Plus className="w-4 h-4" />}
              {isAdding ? 'Saving…' : 'Save'}
            </button>
          </form>
        )}

        {/* Filters */}
        <div className="mt-4 flex flex-wrap gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            aria-label="Filter by type"
            className={inputCls}
          >
            <option value="">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            aria-label="Filter by category"
            className={inputCls}
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input
            type="date"
            value={filterFrom}
            onChange={(e) => setFilterFrom(e.target.value)}
            aria-label="From date"
            className={inputCls}
          />
          <input
            type="date"
            value={filterTo}
            onChange={(e) => setFilterTo(e.target.value)}
            aria-label="To date"
            className={inputCls}
          />
          {(filterType || filterCategory || filterFrom || filterTo) && (
            <button
              onClick={() => { setFilterType(''); setFilterCategory(''); setFilterFrom(''); setFilterTo(''); }}
              className="px-3 py-2 text-xs text-slate-400 hover:text-slate-200 transition"
              aria-label="Clear filters"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {error && (
        <p role="alert" className="p-4 text-sm text-red-400 text-center">{error}</p>
      )}

      {isLoading ? (
        <div className="p-12 flex justify-center">
          <Loader2 className="w-8 h-8 text-slate-500 motion-safe:animate-spin" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="p-12 text-center text-slate-500 space-y-2">
          <p className="text-lg">No transactions yet.</p>
          <p className="text-sm">Add your first transaction to get started.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm" role="table">
            <thead>
              <tr className="border-b border-white/5 text-left">
                <th scope="col" className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Date</th>
                <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Type</th>
                <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Category</th>
                <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Amount</th>
                <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Description</th>
                <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right sr-only">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(transactions ?? []).map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"
                  tabIndex={0}
                >
                  <td className="px-6 py-4 text-slate-400 whitespace-nowrap">{formatDate(t.created_at)}</td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                        t.type === 'income'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {t.type ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-800 px-2 py-1 rounded-md">
                      {t.category ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right font-semibold text-indigo-300 whitespace-nowrap">
                    {t.type === 'income' ? '+' : '-'}
                    {t.currency ?? 'USD'} {t.amount.toFixed(2)}
                    {Boolean(t.is_anomaly) && (
                      <AlertTriangle
                        className="inline ml-1.5 w-3.5 h-3.5 text-red-400 motion-safe:animate-pulse"
                        aria-label="Anomaly detected"
                      />
                    )}
                  </td>
                  <td className="px-4 py-4 text-slate-300 max-w-[200px] truncate">
                    {t.description ?? <span className="text-slate-600 italic">No description</span>}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button
                      onClick={() => handleDelete(t.id)}
                      disabled={deletingId === t.id}
                      aria-label={`Delete transaction: ${t.description ?? t.id}`}
                      className="p-2 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-950/30 focus:outline-none focus:ring-1 focus:ring-red-500 disabled:opacity-40 transition min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                      {deletingId === t.id ? (
                        <Loader2 className="w-4 h-4 motion-safe:animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between text-sm text-slate-400">
          <span>{total} transaction{total !== 1 ? 's' : ''}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              aria-label="Previous page"
              className="p-2 rounded-lg hover:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-30 transition min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span>
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              aria-label="Next page"
              className="p-2 rounded-lg hover:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-30 transition min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
