import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, Filter, LoaderCircle, Plus, ReceiptText, RefreshCw, Trash2, X } from 'lucide-react';
import { apiFetch, API_URL } from '../../lib/api';
import { formatMoney, toMinorUnits } from '../../lib/finance';
import { buildTransactionQuery, type TransactionFilters } from '../../lib/transactionQuery';
import { createMutationGate, shouldSendDeleteRequest, type DeleteDecision } from '../../lib/interactionGuards';
import { ExportButton } from './ExportButton';

export type Transaction = {
  id: number;
  amount: number;
  currency: string | null;
  description: string | null;
  category: string | null;
  is_anomaly: number;
  created_at: string;
  user_id: string | null;
  type: 'income' | 'expense' | null;
};

type ListResponse = { data: Transaction[]; total: number; page: number; limit: number };
type ManualDraft = { amount: string; currency: string; category: string; type: 'income' | 'expense'; description: string };
type ManualErrors = Partial<Record<keyof ManualDraft, string>>;

const CATEGORIES = ['Food & Drinks', 'Transport', 'Housing', 'Utilities', 'Shopping', 'Health & Fitness', 'Education', 'Entertainment', 'Salary', 'Freelance', 'Other'];
const LIMIT = 10;
const emptyFilters: TransactionFilters = { type: '', category: '', from: '', to: '' };
const emptyManual: ManualDraft = { amount: '', currency: 'USD', category: 'Food & Drinks', type: 'expense', description: '' };

function validateManual(draft: ManualDraft): ManualErrors {
  const errors: ManualErrors = {};
  const amount = Number(draft.amount);
  if (!Number.isFinite(amount) || amount <= 0) errors.amount = 'Enter an amount greater than zero.';
  if (!/^[A-Z]{3}$/.test(draft.currency)) errors.currency = 'Use a three-letter code such as USD or GBP.';
  if (!draft.category.trim()) errors.category = 'Choose or enter a category.';
  if (draft.description.length > 240) errors.description = 'Keep the description to 240 characters or fewer.';
  return errors;
}

export function TransactionHistory({ refreshKey = 0, onDataChanged }: { refreshKey?: number; onDataChanged?: () => void }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [filters, setFilters] = useState<TransactionFilters>(emptyFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [manual, setManual] = useState<ManualDraft>(emptyManual);
  const [manualErrors, setManualErrors] = useState<ManualErrors>({});
  const [isAdding, setIsAdding] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<number>>(new Set());
  const requestSequence = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const currencyRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLInputElement>(null);
  const deleteDialogRef = useRef<HTMLDivElement>(null);
  const cancelDeleteRef = useRef<HTMLButtonElement>(null);
  const deleteReturnRef = useRef<HTMLButtonElement | null>(null);
  const deleteGate = useRef(createMutationGate());

  const fetchTransactions = useCallback(async (requestedPage: number) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const sequence = ++requestSequence.current;
    setStatus('loading');
    setError(null);
    try {
      const query = buildTransactionQuery(requestedPage, LIMIT, filters);
      const response = await apiFetch(`${API_URL}/transactions?${query}`, { signal: controller.signal });
      if (!response.ok) throw new Error('Your ledger could not be loaded.');
      const payload: ListResponse = await response.json();
      if (sequence !== requestSequence.current) return;
      setTransactions(payload.data ?? []);
      setTotal(payload.total ?? 0);
      setStatus('ready');
    } catch (caught) {
      if (controller.signal.aborted) return;
      setError(caught instanceof Error ? caught.message : 'Your ledger could not be loaded.');
      setStatus('error');
    }
  }, [filters]);

  useEffect(() => {
    setPage(1);
  }, [filters, refreshKey]);

  useEffect(() => {
    void fetchTransactions(page);
    return () => abortRef.current?.abort();
  }, [fetchTransactions, page, refreshKey]);

  useEffect(() => {
    if (!pendingDelete) return;
    cancelDeleteRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !deleteGate.current.isPending()) {
        event.preventDefault();
        setPendingDelete(null);
      }
      if (event.key === 'Tab' && deleteDialogRef.current) {
        const controls = [...deleteDialogRef.current.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
        const first = controls[0];
        const last = controls.at(-1);
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      window.setTimeout(() => deleteReturnRef.current?.focus(), 0);
    };
  }, [pendingDelete]);

  const updateFilter = (key: keyof TransactionFilters, value: string) => setFilters((current) => ({ ...current, [key]: value }));
  const updateManual = <K extends keyof ManualDraft>(key: K, value: ManualDraft[K]) => {
    setManual((current) => ({ ...current, [key]: value }));
    setManualErrors((current) => ({ ...current, [key]: undefined }));
  };
  const validateManualField = (field: keyof ManualDraft) => setManualErrors((current) => ({ ...current, [field]: validateManual(manual)[field] }));

  const handleAdd = async (event: FormEvent) => {
    event.preventDefault();
    if (isAdding) return;
    const errors = validateManual(manual);
    setManualErrors(errors);
    const first = Object.keys(errors)[0] as keyof ManualDraft | undefined;
    if (first) {
      if (first === 'amount') amountRef.current?.focus();
      if (first === 'currency') currencyRef.current?.focus();
      if (first === 'category') categoryRef.current?.focus();
      return;
    }
    setIsAdding(true);
    setNotice(null);
    try {
      const response = await apiFetch(`${API_URL}/transactions`, {
        method: 'POST',
        body: JSON.stringify({ ...manual, amount: Number(manual.amount) }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'The transaction could not be recorded.');
      setManual(emptyManual);
      setShowAddForm(false);
      setNotice('Transaction recorded in the ledger.');
      setPage(1);
      await fetchTransactions(1);
      onDataChanged?.();
    } catch (caught) {
      setNotice(null);
      setManualErrors((current) => ({ ...current, amount: caught instanceof Error ? caught.message : 'The transaction could not be recorded.' }));
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteDecision = async (decision: DeleteDecision) => {
    if (!shouldSendDeleteRequest(decision)) {
      setPendingDelete(null);
      return;
    }
    if (!pendingDelete || !deleteGate.current.begin()) return;
    setIsDeleting(true);
    setError(null);
    try {
      const response = await apiFetch(`${API_URL}/transactions/${pendingDelete.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('The transaction could not be deleted.');
      setTransactions((current) => current.filter((transaction) => transaction.id !== pendingDelete.id));
      setTotal((current) => Math.max(0, current - 1));
      setNotice('Transaction deleted.');
      setPendingDelete(null);
      onDataChanged?.();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The transaction could not be deleted.');
    } finally {
      deleteGate.current.end();
      setIsDeleting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const hasFilters = Object.values(filters).some(Boolean);
  const formatDate = (iso: string) => new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso));

  return (
    <section className="ledger" aria-labelledby="ledger-title">
      <div className="ledger-heading">
        <div className="section-heading">
          <span className="section-icon" aria-hidden="true"><ReceiptText size={20} /></span>
          <div><p className="eyebrow">Verified records</p><h2 id="ledger-title">Transaction ledger</h2></div>
        </div>
        <div className="ledger-actions">
          <ExportButton />
          <button className="button button-secondary" type="button" onClick={() => setShowAddForm((value) => !value)} aria-expanded={showAddForm} aria-controls="manual-entry-form">
            {showAddForm ? <X size={18} /> : <Plus size={18} />}{showAddForm ? 'Close entry' : 'Manual entry'}
          </button>
        </div>
      </div>

      {showAddForm && (
        <form id="manual-entry-form" className="manual-form" onSubmit={handleAdd} noValidate>
          <div className="manual-form-heading"><div><p className="eyebrow">Direct entry</p><h3>Add without AI</h3></div><p>Every field is saved exactly as reviewed.</p></div>
          <div className="manual-grid">
            <div className="field"><label htmlFor="manual-amount">Amount</label><input ref={amountRef} id="manual-amount" type="number" inputMode="decimal" min="0.01" step="0.01" value={manual.amount} onChange={(e) => updateManual('amount', e.target.value)} onBlur={() => validateManualField('amount')} aria-invalid={Boolean(manualErrors.amount)} aria-describedby={manualErrors.amount ? 'manual-amount-error' : undefined} />{manualErrors.amount && <p id="manual-amount-error" className="field-error">{manualErrors.amount}</p>}</div>
            <div className="field"><label htmlFor="manual-currency">Currency</label><input ref={currencyRef} id="manual-currency" value={manual.currency} maxLength={3} onChange={(e) => updateManual('currency', e.target.value.toUpperCase())} onBlur={() => validateManualField('currency')} aria-invalid={Boolean(manualErrors.currency)} aria-describedby={manualErrors.currency ? 'manual-currency-error' : undefined} />{manualErrors.currency && <p id="manual-currency-error" className="field-error">{manualErrors.currency}</p>}</div>
            <div className="field"><label htmlFor="manual-type">Type</label><select id="manual-type" value={manual.type} onChange={(e) => updateManual('type', e.target.value as ManualDraft['type'])}><option value="expense">Expense</option><option value="income">Income</option></select></div>
            <div className="field"><label htmlFor="manual-category">Category</label><input ref={categoryRef} id="manual-category" list="manual-categories" value={manual.category} onChange={(e) => updateManual('category', e.target.value)} onBlur={() => validateManualField('category')} aria-invalid={Boolean(manualErrors.category)} aria-describedby={manualErrors.category ? 'manual-category-error' : undefined} />{manualErrors.category && <p id="manual-category-error" className="field-error">{manualErrors.category}</p>}</div>
            <div className="field field-wide"><label htmlFor="manual-description">Description <span>optional</span></label><input id="manual-description" value={manual.description} maxLength={240} onChange={(e) => updateManual('description', e.target.value)} onBlur={() => validateManualField('description')} aria-invalid={Boolean(manualErrors.description)} aria-describedby={manualErrors.description ? 'manual-description-error' : undefined} />{manualErrors.description && <p id="manual-description-error" className="field-error">{manualErrors.description}</p>}</div>
          </div>
          <datalist id="manual-categories">{CATEGORIES.map((category) => <option value={category} key={category} />)}</datalist>
          <div className="form-actions"><button className="button button-primary" disabled={isAdding}>{isAdding ? <LoaderCircle className="spin" size={18} /> : <Plus size={18} />}{isAdding ? 'Recording…' : 'Record entry'}</button></div>
        </form>
      )}

      <div className="filter-bar">
        <button className="button button-filter" type="button" onClick={() => setFiltersOpen((value) => !value)} aria-expanded={filtersOpen} aria-controls="ledger-filters"><Filter size={18} />Filters{hasFilters && <span className="filter-indicator">Active</span>}</button>
        <div className={`filters ${filtersOpen ? 'open' : ''}`} id="ledger-filters">
          <label>Type<select value={filters.type} onChange={(e) => updateFilter('type', e.target.value)}><option value="">All types</option><option value="income">Income</option><option value="expense">Expense</option></select></label>
          <label>Category<select value={filters.category} onChange={(e) => updateFilter('category', e.target.value)}><option value="">All categories</option>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
          <label>From<input type="date" value={filters.from} onChange={(e) => updateFilter('from', e.target.value)} /></label>
          <label>To<input type="date" value={filters.to} onChange={(e) => updateFilter('to', e.target.value)} /></label>
          {hasFilters && <button className="button button-text" type="button" onClick={() => setFilters(emptyFilters)}>Clear filters</button>}
        </div>
      </div>

      <div className="live-region" aria-live="polite" aria-atomic="true">{notice}</div>
      {status === 'error' && <div className="notice notice-error ledger-notice" role="alert"><span>{error}</span><button className="button button-secondary" onClick={() => void fetchTransactions(page)}><RefreshCw size={17} />Retry</button></div>}
      {status === 'loading' && <div className="ledger-loading" aria-busy="true" aria-label="Loading transactions"><div className="skeleton-row" /><div className="skeleton-row" /><div className="skeleton-row" /></div>}
      {status === 'ready' && transactions.length === 0 && <div className="empty-state"><ReceiptText size={28} /><h3>{hasFilters ? 'No matching entries' : 'Your ledger is ready'}</h3><p>{hasFilters ? 'Adjust or clear the filters to see other records.' : 'Use the AI composer or manual entry to record your first transaction.'}</p>{hasFilters && <button className="button button-secondary" onClick={() => setFilters(emptyFilters)}>Clear filters</button>}</div>}
      {status === 'ready' && transactions.length > 0 && (
        <div className="table-scroll" tabIndex={0} aria-label="Scrollable transaction table">
          <table className="data-table ledger-table">
            <caption className="sr-only">Transactions, newest first</caption>
            <thead><tr><th scope="col">Date</th><th scope="col">Type</th><th scope="col">Category</th><th scope="col">Amount</th><th scope="col">Description</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>{transactions.map((transaction) => {
              const expanded = expandedDescriptions.has(transaction.id);
              const description = transaction.description || 'No description';
              const currency = transaction.currency || 'USD';
              const amount = formatMoney(toMinorUnits(transaction.amount), currency);
              return <tr key={transaction.id}>
                <td data-label="Date">{formatDate(transaction.created_at)}</td>
                <td data-label="Type"><span className={`type-chip ${transaction.type === 'income' ? 'income' : 'expense'}`}>{transaction.type === 'income' ? 'Income' : 'Expense'}</span></td>
                <td data-label="Category"><span className="category-label">{transaction.category || 'Other'}</span></td>
                <td data-label="Amount" className="money"><span className={transaction.type === 'income' ? 'income-text' : 'expense-text'}>{transaction.type === 'income' ? '+' : '−'} {amount}</span>{Boolean(transaction.is_anomaly) && <span className="anomaly"><AlertTriangle size={15} />Anomaly</span>}</td>
                <td data-label="Description"><button className={`description-toggle ${expanded ? 'expanded' : ''}`} type="button" onClick={() => setExpandedDescriptions((current) => { const next = new Set(current); if (next.has(transaction.id)) next.delete(transaction.id); else next.add(transaction.id); return next; })} aria-expanded={expanded}>{description}</button></td>
                <td className="row-action"><button className="icon-button danger" type="button" aria-label={`Delete ${description}, ${amount}`} onClick={(event) => { deleteReturnRef.current = event.currentTarget; setPendingDelete(transaction); }}><Trash2 size={18} /></button></td>
              </tr>;
            })}</tbody>
          </table>
        </div>
      )}

      {status === 'ready' && total > 0 && <div className="pagination"><span>{total} transaction{total === 1 ? '' : 's'}</span><div><button className="icon-button" type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1} aria-label="Previous page"><ChevronLeft size={19} /></button><span><b>{page}</b> of {totalPages}</span><button className="icon-button" type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page >= totalPages} aria-label="Next page"><ChevronRight size={19} /></button></div></div>}

      {pendingDelete && <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !isDeleting) setPendingDelete(null); }}><div className="confirm-dialog" ref={deleteDialogRef} role="alertdialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-description">
        <span className="dialog-icon" aria-hidden="true"><Trash2 size={22} /></span><p className="eyebrow">Permanent action</p><h2 id="delete-title">Delete this transaction?</h2><p id="delete-description"><strong>{pendingDelete.description || pendingDelete.category || 'Transaction'}</strong><br />{formatMoney(toMinorUnits(pendingDelete.amount), pendingDelete.currency || 'USD')} · {pendingDelete.type === 'income' ? 'Income' : 'Expense'}</p><p>This removes the record permanently. It cannot be undone.</p>
        {error && <p className="field-error" role="alert">{error}</p>}
        <div className="dialog-actions"><button ref={cancelDeleteRef} className="button button-secondary" type="button" disabled={isDeleting} onClick={() => void handleDeleteDecision('cancel')}>Cancel</button><button className="button button-danger" type="button" disabled={isDeleting} onClick={() => void handleDeleteDecision('confirm')}>{isDeleting ? <LoaderCircle className="spin" size={18} /> : <Trash2 size={18} />}{isDeleting ? 'Deleting…' : 'Delete transaction'}</button></div>
      </div></div>}
    </section>
  );
}
