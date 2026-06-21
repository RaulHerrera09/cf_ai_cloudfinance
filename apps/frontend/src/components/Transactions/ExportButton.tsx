import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { apiFetch, API_URL } from '../../lib/api';

export function ExportButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`${API_URL}/export/csv`);
      if (!res.ok) throw new Error('Export failed. Please try again.');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'cloudfinance-export.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleExport}
        disabled={isLoading}
        aria-label="Export transactions as CSV"
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition min-h-[44px] min-w-[44px] text-sm font-medium"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 motion-safe:animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        {isLoading ? 'Exporting…' : 'Export CSV'}
      </button>
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
