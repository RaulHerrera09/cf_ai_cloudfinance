import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { apiFetch, API_URL } from '../lib/api';
import { useAuthStore } from '../store/auth';
import { TransactionHistory } from '../components/Transactions/TransactionHistory';
import { ExportButton } from '../components/Transactions/ExportButton';

interface Transaction {
  id: number;
  amount: number;
  currency: string;
  description: string;
  category: string;
  is_anomaly: boolean;
  created_at: string;
}

const COLORS = ['#818cf8', '#6366f1', '#4f46e5', '#4338ca', '#3730a3'];

export function DashboardPage() {
  const [text, setText] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [txRefreshKey, setTxRefreshKey] = useState(0);

  const { user, refreshToken, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const fetchDashboardData = async () => {
    try {
      const res = await apiFetch(`${API_URL}/transactions?limit=1000`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setTransactions(data.data ?? []);
    } catch {
      // silent — summary cards will just show empty state
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setIsAnalyzing(true);
    try {
      const res = await apiFetch(`${API_URL}/analyze`, {
        method: 'POST',
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error('AI Analysis failed');
      setText('');
      await fetchDashboardData();
      setTxRefreshKey((k) => k + 1);
    } catch {
      alert('An error occurred while processing your request with the AI.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLogout = async () => {
    if (refreshToken) {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {});
    }
    clearAuth();
    navigate('/login', { replace: true });
  };

  const chartData = transactions.reduce((acc: { name: string; value: number }[], t) => {
    const existing = acc.find((item) => item.name === t.category);
    if (existing) {
      existing.value += t.amount;
    } else {
      acc.push({ name: t.category, value: t.amount });
    }
    return acc;
  }, []);

  const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);
  const anomalyCount = transactions.filter((t) => t.is_anomaly).length;

  const getCategoryIcon = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes('food') || cat.includes('restau')) return '🍔';
    if (cat.includes('trans') || cat.includes('uber')) return '🚗';
    if (cat.includes('shop')) return '🛍️';
    if (cat.includes('bill') || cat.includes('util')) return '💡';
    return '💸';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30">

      {/* Header */}
      <header className="py-8 px-6 md:px-12 border-b border-white/5 bg-gradient-to-b from-indigo-950/20 to-transparent">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-blue-500 to-purple-500">
                CloudFinance AI
              </span>
            </h1>
            <p className="mt-2 text-slate-400 text-sm md:text-base max-w-2xl">
              Your personal financial assistant powered by{' '}
              <span className="text-indigo-400 font-semibold">Workers AI</span> at the Edge.
            </p>
          </div>

          {user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/60 rounded-xl border border-white/10">
                <User className="w-4 h-4 text-indigo-400" />
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-200 leading-none">{user.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{user.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                aria-label="Log out"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700 border border-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition min-h-[44px]"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex gap-3 text-sm">
              <Link to="/login" className="px-4 py-2 rounded-xl text-slate-300 hover:text-white border border-white/10 transition min-h-[44px] flex items-center">
                Sign in
              </Link>
              <Link to="/register" className="px-4 py-2 rounded-xl text-white bg-indigo-600 hover:bg-indigo-500 transition min-h-[44px] flex items-center">
                Register
              </Link>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 md:p-12 space-y-12">

        {/* AI Input */}
        <section className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" aria-hidden />
          <div className="relative bg-slate-900/80 backdrop-blur-xl p-8 rounded-2xl border border-white/10 shadow-2xl">
            <h2 className="text-xl font-semibold mb-6 flex items-center">
              <span className="bg-indigo-500/20 text-indigo-400 p-2 rounded-lg mr-3" aria-hidden>💬</span>
              Register New Expense
            </h2>
            <form onSubmit={handleAnalyze} className="flex flex-col md:flex-row gap-4">
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="e.g., I spent $45 on dinner with friends…"
                aria-label="Describe your expense in natural language"
                className="flex-1 bg-slate-800/50 border border-slate-700 rounded-xl px-6 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition placeholder:text-slate-500"
                disabled={isAnalyzing}
              />
              <button
                type="submit"
                disabled={isAnalyzing || !text.trim()}
                className={`px-8 py-4 rounded-xl font-bold text-lg shadow-lg transition transform hover:scale-105 active:scale-95 flex items-center justify-center min-w-[180px] min-h-[44px]
                  ${isAnalyzing
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed motion-safe:animate-pulse'
                    : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white'
                  }`}
              >
                {isAnalyzing ? (
                  <>
                    <svg className="motion-safe:animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden>
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Analyzing…
                  </>
                ) : (
                  '✨ Analyze'
                )}
              </button>
            </form>
            <p className="mt-4 text-sm text-slate-500 pl-2">Powered by Llama 3.1. Write naturally, the AI will understand.</p>
          </div>
        </section>

        {/* Summary Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6" aria-label="Summary statistics">
          <div className="bg-slate-900/60 border border-white/5 p-6 rounded-2xl flex items-center">
            <div className="bg-blue-500/20 p-4 rounded-full mr-4" aria-hidden><span className="text-3xl">💰</span></div>
            <div>
              <p className="text-slate-400 text-sm font-medium uppercase tracking-tight">Total Spent</p>
              <p className="text-3xl font-bold text-white">${totalSpent.toFixed(2)}</p>
            </div>
          </div>
          <div className="bg-slate-900/60 border border-white/5 p-6 rounded-2xl flex items-center">
            <div className="bg-green-500/20 p-4 rounded-full mr-4" aria-hidden><span className="text-3xl">🧾</span></div>
            <div>
              <p className="text-slate-400 text-sm font-medium uppercase tracking-tight">Transactions</p>
              <p className="text-3xl font-bold text-white">{transactions.length}</p>
            </div>
          </div>
          <div className={`bg-slate-900/60 border p-6 rounded-2xl flex items-center transition-colors ${anomalyCount > 0 ? 'border-red-500/30 bg-red-950/20' : 'border-white/5'}`}>
            <div className={`${anomalyCount > 0 ? 'bg-red-500/20' : 'bg-slate-500/20'} p-4 rounded-full mr-4`} aria-hidden>
              <span className="text-3xl">⚠️</span>
            </div>
            <div>
              <p className="text-slate-400 text-sm font-medium uppercase tracking-tight">Anomalies Detected</p>
              <p className={`text-3xl font-bold ${anomalyCount > 0 ? 'text-red-400' : 'text-white'}`}>{anomalyCount}</p>
            </div>
          </div>
        </section>

        {/* Spending Distribution Chart */}
        <section className="bg-slate-900/60 border border-white/5 p-8 rounded-2xl shadow-xl overflow-hidden">
          <h2 className="text-xl font-semibold mb-8 flex items-center">
            <span className="bg-purple-500/20 text-purple-400 p-2 rounded-lg mr-3" aria-hidden>📊</span>
            Spending Distribution
          </h2>
          <div className="h-[350px] w-full">
            {transactions.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="45%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {chartData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '10px' }}
                    itemStyle={{ color: '#f8fafc', fontSize: '14px' }}
                    cursor={{ fill: 'transparent' }}
                  />
                  <Legend verticalAlign="bottom" align="center" iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : isLoadingHistory ? (
              <div className="flex items-center justify-center h-full text-slate-500">
                <span className="motion-safe:animate-pulse text-sm">Synchronizing with D1…</span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2">
                <span className="text-4xl opacity-20" aria-hidden>📈</span>
                <p className="italic text-sm">Add transactions to visualize your spending habits…</p>
              </div>
            )}
          </div>
        </section>

        {/* Transaction History */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <ExportButton />
          </div>
          <TransactionHistory refreshKey={txRefreshKey} />
        </div>

        {/* Legacy history — hidden, kept only for getCategoryIcon usage */}
        <div className="hidden" aria-hidden>
          {transactions.map((t) => (
            <span key={t.id}>{getCategoryIcon(t.category)}</span>
          ))}
        </div>

      </main>
    </div>
  );
}
