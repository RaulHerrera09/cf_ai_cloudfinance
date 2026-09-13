import { ArrowDownLeft, ArrowUpRight, Scale } from 'lucide-react';
import { formatMoney, type CurrencySummary } from '../../lib/finance';

type Props = {
  summary: CurrencySummary;
  currencyOptions: string[];
  selectedCurrency: string;
  onCurrencyChange: (currency: string) => void;
  periodLabel: string;
};

export function FinancialBand({ summary, currencyOptions, selectedCurrency, onCurrencyChange, periodLabel }: Props) {
  const items = [
    { label: 'Income', value: summary.incomeMinor, icon: ArrowDownLeft, tone: 'income' },
    { label: 'Expenses', value: summary.expenseMinor, icon: ArrowUpRight, tone: 'expense' },
    { label: 'Balance', value: summary.balanceMinor, icon: Scale, tone: 'balance' },
  ] as const;

  return (
    <section className="financial-band" aria-labelledby="overview-title">
      <div className="band-heading">
        <div>
          <p className="eyebrow">Financial position</p>
          <h2 id="overview-title">{periodLabel}</h2>
        </div>
        {currencyOptions.length > 1 ? (
          <label className="currency-picker">Currency
            <select value={selectedCurrency} onChange={(event) => onCurrencyChange(event.target.value)}>
              {currencyOptions.map((currency) => <option key={currency}>{currency}</option>)}
            </select>
          </label>
        ) : <span className="currency-code">{selectedCurrency}</span>}
      </div>
      <div className="band-values">
        {items.map(({ label, value, icon: Icon, tone }) => (
          <div className={`band-value band-value-${tone}`} key={label}>
            <Icon size={18} aria-hidden="true" />
            <span>{label}</span>
            <strong>{formatMoney(value, selectedCurrency)}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
