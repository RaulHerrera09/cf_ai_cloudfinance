import { BarChart3, ListTree } from 'lucide-react';
import { expensePercentage, formatMoney, type CurrencySummary } from '../../lib/finance';

export function SpendingBreakdown({ summary }: { summary: CurrencySummary }) {
  const categories = summary.expenseCategories;
  return (
    <section className="analysis-panel" aria-labelledby="spending-title">
      <div className="section-heading">
        <span className="section-icon" aria-hidden="true"><BarChart3 size={20} /></span>
        <div><p className="eyebrow">Expense signal</p><h2 id="spending-title">Spending distribution</h2></div>
      </div>
      {summary.expenseMinor === 0 ? (
        <div className="empty-state compact">
          <ListTree size={24} aria-hidden="true" />
          <h3>No expenses recorded</h3>
          <p>Confirmed expenses will appear here by category.</p>
        </div>
      ) : (
        <>
          <div className="bar-list" aria-label={`Expense distribution in ${summary.currency}`}>
            {categories.map((item, index) => {
              const percentage = expensePercentage(item.totalMinor, summary.expenseMinor);
              return (
                <div className="bar-row" key={item.category}>
                  <div className="bar-meta"><span><b>{index + 1}</b>{item.category}</span><strong>{percentage}%</strong></div>
                  <div className="bar-track" aria-hidden="true"><span style={{ width: `${percentage}%` }} /></div>
                </div>
              );
            })}
          </div>
          <details className="data-disclosure">
            <summary>Category values</summary>
            <div className="table-scroll" tabIndex={0} aria-label="Scrollable expense category table">
              <table className="data-table compact-table">
                <caption className="sr-only">Expense totals and percentages by category</caption>
                <thead><tr><th scope="col">Category</th><th scope="col">Entries</th><th scope="col">Amount</th><th scope="col">Share</th></tr></thead>
                <tbody>{categories.map((item) => <tr key={item.category}>
                  <th scope="row">{item.category}</th><td>{item.count}</td>
                  <td className="money">{formatMoney(item.totalMinor, summary.currency)}</td>
                  <td>{expensePercentage(item.totalMinor, summary.expenseMinor)}%</td>
                </tr>)}</tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </section>
  );
}
