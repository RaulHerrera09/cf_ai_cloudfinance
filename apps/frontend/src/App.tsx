import { useState, useEffect } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';

// Define the exact data structure coming from the Cloudflare D1 Backend
interface Transaction {
  id: number;
  amount: number;
  currency: string;
  description: string;
  category: string;
  is_anomaly: boolean;
  created_at: string;
}

function App() {
  const [text, setText] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  //  Backend URL for Cloudflare Workers
  const API_URL = 'https://backend.raulherreradelgadillo09.workers.dev/api';

  /**
   * Fetches transaction history from the D1 database
   */
  const fetchTransactions = async () => {
    try {
      const res = await fetch(`${API_URL}/transactions`);
      if (!res.ok) throw new Error('Failed to fetch history');
      const data: Transaction[] = await res.json();
      setTransactions(data);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  /**
   * Load history on component mount
   */
  useEffect(() => {
    fetchTransactions();
  }, []);

  /**
   * Sends natural language text to the AI (Llama 3.1) for analysis
   */
  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setIsAnalyzing(true);
    try {
      const res = await fetch(`${API_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) throw new Error('AI Analysis failed');

      setText(''); // Clear input on success
      await fetchTransactions(); // Refresh the table with new data
    } catch (error) {
      console.error("Error during analysis:", error);
      alert("An error occurred while processing your request with the AI.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  /**
   * Data Transformation for the Visualization
   * Aggregates total spent per category for the PieChart
   */
  const chartData = transactions.reduce((acc: any[], t) => {
    const existing = acc.find(item => item.name === t.category);
    if (existing) {
      existing.value += t.amount;
    } else {
      acc.push({ name: t.category, value: t.amount });
    }
    return acc;
  }, []);

  // Professional color palette for the financial dashboard
  const COLORS = ['#818cf8', '#6366f1', '#4f46e5', '#4338ca', '#3730a3'];

  // Quick calculations for the Summary cards
  const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);
  const anomalyCount = transactions.filter(t => t.is_anomaly).length;

  /**
   * Helper to return appropriate icons based on the AI-generated category
   */
  const getCategoryIcon = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes('food') || cat.includes('restau')) return '🍔';
    if (cat.includes('trans') || cat.includes('uber')) return '6';
    if (cat.includes('shop')) return '🛍️';
    if (cat.includes('bill') || cat.includes('util')) return '💡';
    return '💸';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30">

      {/* Header Section with dynamic gradient */}
      <header className="py-12 px-6 md:px-12 text-center border-b border-white/5 bg-gradient-to-b from-indigo-950/20 to-transparent">
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-blue-500 to-purple-500">
            CloudFinance AI
          </span>
        </h1>
        <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
          Your personal financial assistant powered by <span className="text-indigo-400 font-semibold">Workers AI</span> at the Edge.
        </p>
      </header>

      <main className="max-w-5xl mx-auto p-6 md:p-12 space-y-12">

        {/* Section 1: Intelligent Input (Glassmorphism Effect) */}
        <section className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative bg-slate-900/80 backdrop-blur-xl p-8 rounded-2xl border border-white/10 shadow-2xl">
            <h2 className="text-xl font-semibold mb-6 flex items-center">
              <span className="bg-indigo-500/20 text-indigo-400 p-2 rounded-lg mr-3">💬</span>
              Register New Expense
            </h2>
            <form onSubmit={handleAnalyze} className="flex flex-col md:flex-row gap-4">
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="e.g., I spent $45 on dinner with friends..."
                className="flex-1 bg-slate-800/50 border border-slate-700 rounded-xl px-6 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition placeholder:text-slate-500"
                disabled={isAnalyzing}
              />
              <button
                type="submit"
                disabled={isAnalyzing || !text.trim()}
                className={`px-8 py-4 rounded-xl font-bold text-lg shadow-lg transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center min-w-[180px]
                  ${isAnalyzing
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed animate-pulse'
                    : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white'
                  }`}
              >
                {isAnalyzing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Analyzing...
                  </>
                ) : '✨ Analyze'}
              </button>
            </form>
            <p className="mt-4 text-sm text-slate-500 pl-2">Tested with Llama 3.1. Write naturally, the AI will understand.</p>
          </div>
        </section>

        {/* Section 2: Data Insights Summary Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900/60 border border-white/5 p-6 rounded-2xl flex items-center">
            <div className="bg-blue-500/20 p-4 rounded-full mr-4"><span className="text-3xl">💰</span></div>
            <div><p className="text-slate-400 text-sm font-medium uppercase tracking-tight">Total Spent</p><p className="text-3xl font-bold text-white">${totalSpent.toFixed(2)}</p></div>
          </div>
          <div className="bg-slate-900/60 border border-white/5 p-6 rounded-2xl flex items-center">
            <div className="bg-green-500/20 p-4 rounded-full mr-4"><span className="text-3xl">🧾</span></div>
            <div><p className="text-slate-400 text-sm font-medium uppercase tracking-tight">Transactions</p><p className="text-3xl font-bold text-white">{transactions.length}</p></div>
          </div>
          <div className={`bg-slate-900/60 border p-6 rounded-2xl flex items-center transition-colors ${anomalyCount > 0 ? 'border-red-500/30 bg-red-950/20' : 'border-white/5'}`}>
            <div className={`${anomalyCount > 0 ? 'bg-red-500/20' : 'bg-slate-500/20'} p-4 rounded-full mr-4`}><span className="text-3xl">⚠️</span></div>
            <div><p className="text-slate-400 text-sm font-medium uppercase tracking-tight">Anomalies Detected</p><p className={`text-3xl font-bold ${anomalyCount > 0 ? 'text-red-400' : 'text-white'}`}>{anomalyCount}</p></div>
          </div>
        </section>

        {/* Section 3: Visual Insights (Pie Chart) */}
        <section className="bg-slate-900/60 border border-white/5 p-8 rounded-2xl shadow-xl overflow-hidden">
          <h2 className="text-xl font-semibold mb-8 flex items-center">
            <span className="bg-purple-500/20 text-purple-400 p-2 rounded-lg mr-3">📊</span>
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
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2">
                <span className="text-4xl opacity-20">📈</span>
                <p className="italic">Add transactions to visualize your spending habits...</p>
              </div>
            )}
          </div>
        </section>

        {/* Section 4: Transaction History (Modern List Style) */}
        <section className="bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-xl">
          <div className="p-6 border-b border-white/5 flex justify-between items-center">
            <h2 className="text-xl font-semibold flex items-center">
              <span className="bg-blue-500/20 text-blue-400 p-2 rounded-lg mr-3">📜</span>
              Recent History
            </h2>
            {isLoadingHistory && <span className="text-sm text-slate-500 animate-pulse">Synchronizing with D1...</span>}
          </div>

          {!isLoadingHistory && transactions.length === 0 ? (
            <div className="p-12 text-center text-slate-500">No transactions found. Try analyzing an expense above!</div>
          ) : (
            <ul>
              {transactions.map((t) => (
                <li key={t.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors duration-200">
                  <div className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1">
                      <span className="text-4xl" role="img" aria-label="category icon">{getCategoryIcon(t.category)}</span>
                      <div>
                        <p className="font-medium text-lg text-slate-200">{t.description}</p>
                        <div className="flex items-center mt-1 gap-3">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-800 px-2 py-1 rounded-md">{t.category}</span>
                          <span className="text-xs text-slate-600">{new Date(t.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 self-end md:self-auto">
                      {t.is_anomaly && (
                        <span className="flex items-center gap-1 text-xs font-bold text-red-400 bg-red-950/50 border border-red-900/50 px-3 py-1 rounded-full animate-pulse">
                          ⚠️ Anomaly
                        </span>
                      )}
                      <div className="text-right">
                        <span className="text-sm text-slate-500 mr-1">{t.currency}</span>
                        <span className="text-2xl font-bold text-indigo-300">${t.amount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;