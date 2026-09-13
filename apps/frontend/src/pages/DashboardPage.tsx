import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AIComposer } from '../components/Dashboard/AIComposer';
import { FinancialBand } from '../components/Dashboard/FinancialBand';
import { SpendingBreakdown } from '../components/Dashboard/SpendingBreakdown';
import { TopBar } from '../components/Dashboard/TopBar';
import { TransactionHistory } from '../components/Transactions/TransactionHistory';
import { API_URL, apiFetch, request } from '../lib/api';
import { loadingSummary, parseSummaryResponse, type SummaryState } from '../lib/finance';
import { useAuthStore } from '../store/auth';

export function DashboardPage() {
  const [summary, setSummary] = useState<SummaryState>(loadingSummary);
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { user, refreshToken, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const fetchSummary = useCallback(async () => {
    setSummary((current) => current.status === 'ready' ? current : loadingSummary);
    try {
      const response = await apiFetch(`${API_URL}/transactions/summary`);
      if (!response.ok) throw new Error('We could not load your financial overview.');
      const data = parseSummaryResponse(await response.json());
      setSummary({ status: 'ready', data, error: null });
      setSelectedCurrency((current) => data.currencies.some((item) => item.currency === current)
        ? current
        : data.currencies[0]?.currency ?? 'USD');
    } catch (error) {
      setSummary({
        status: 'error',
        data: null,
        error: error instanceof Error ? error.message : 'We could not load your financial overview.',
      });
    }
  }, []);

  useEffect(() => { void fetchSummary(); }, [fetchSummary]);

  const handleRecorded = () => {
    setHistoryRefreshKey((key) => key + 1);
    void fetchSummary();
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      if (refreshToken) {
        await request(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
      }
    } finally {
      clearAuth();
      navigate('/login', { replace: true });
    }
  };

  const currencySummary = summary.status === 'ready'
    ? summary.data.currencies.find((item) => item.currency === selectedCurrency)
    : undefined;

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <TopBar user={user} isLoggingOut={isLoggingOut} onLogout={handleLogout} />
      <main id="main-content" className="dashboard">
        <header className="dashboard-intro">
          <div>
            <p className="eyebrow">Personal edge ledger</p>
            <h1>Money, made legible.</h1>
          </div>
          <p>Describe a transaction naturally, verify the interpretation, and keep a precise record that remains yours.</p>
        </header>

        {summary.status === 'loading' && (
          <section className="financial-band band-skeleton" aria-label="Loading financial overview" aria-busy="true">
            <div className="skeleton-line wide" /><div className="skeleton-values"><span /><span /><span /></div>
          </section>
        )}
        {summary.status === 'error' && (
          <section className="summary-error" role="alert">
            <div><ShieldCheck size={22} aria-hidden="true" /><span><strong>Overview unavailable</strong><small>{summary.error} Your ledger has not been shown as zero.</small></span></div>
            <button className="button button-secondary" type="button" onClick={() => void fetchSummary()}><RefreshCw size={17} />Retry</button>
          </section>
        )}
        {summary.status === 'ready' && summary.data.currencies.length === 0 && (
          <section className="financial-band empty-band">
            <div><p className="eyebrow">Financial position</p><h2>No recorded activity yet</h2></div>
            <p>Your first confirmed entry will establish income, expenses and balance without inventing an opening value.</p>
          </section>
        )}
        {currencySummary && (
          <FinancialBand
            summary={currencySummary}
            currencyOptions={summary.status === 'ready' ? summary.data.currencies.map((item) => item.currency) : []}
            selectedCurrency={selectedCurrency}
            onCurrencyChange={setSelectedCurrency}
            periodLabel={summary.status === 'ready' ? summary.data.period.label : 'All recorded activity'}
          />
        )}

        <div className="workspace-grid">
          <AIComposer onRecorded={handleRecorded} />
          {currencySummary ? <SpendingBreakdown summary={currencySummary} /> : (
            <section className="analysis-panel analysis-placeholder" aria-labelledby="spending-placeholder-title">
              <p className="eyebrow">Expense signal</p><h2 id="spending-placeholder-title">Spending distribution</h2>
              <p>{summary.status === 'error' ? 'Distribution is unavailable until the overview is restored.' : 'Confirm an expense to begin the category view.'}</p>
            </section>
          )}
        </div>

        <TransactionHistory refreshKey={historyRefreshKey} onDataChanged={handleRecorded} />
      </main>
      <footer className="site-footer"><span>CloudFinance AI</span><span>Workers AI · D1 · Cloudflare edge</span></footer>
    </div>
  );
}
