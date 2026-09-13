import { useState } from 'react';
import { Check, Download, LoaderCircle } from 'lucide-react';
import { apiFetch, API_URL } from '../../lib/api';

export function ExportButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleExport = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);
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
      setSuccess(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="export-control">
      <button
        onClick={handleExport}
        disabled={isLoading}
        aria-label="Export transactions as CSV"
        className="button button-secondary"
      >
        {isLoading ? (
          <LoaderCircle className="spin" size={18} aria-hidden="true" />
        ) : (
          <Download size={18} aria-hidden="true" />
        )}
        {isLoading ? 'Exporting…' : 'Export CSV'}
      </button>
      <span className="sr-only" aria-live="polite">{success ? 'CSV export downloaded.' : ''}</span>
      {success && <Check className="export-success" size={16} aria-label="Export downloaded" />}
      {error && <p role="alert" className="field-error export-error">{error}</p>}
    </div>
  );
}
