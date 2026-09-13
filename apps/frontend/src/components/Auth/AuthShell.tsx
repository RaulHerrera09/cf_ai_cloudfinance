import { Cloud, Database, Network, ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';

export function AuthShell({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro: string; children: ReactNode }) {
  return (
    <main className="auth-shell">
      <a className="brand auth-brand" href="/" aria-label="CloudFinance AI home">
        <span className="brand-mark" aria-hidden="true"><Cloud size={19} /></span>
        <span>CloudFinance <strong>AI</strong></span>
      </a>
      <section className="auth-story" aria-labelledby="auth-story-title">
        <p className="eyebrow">Personal edge ledger</p>
        <h1 id="auth-story-title">Your money.<br /><em>Clearly accounted for.</em></h1>
        <p>Turn everyday language into records you can inspect, correct and trust—processed on Cloudflare's edge.</p>
        <ul>
          <li><Network size={19} /><span><strong>Interpret at the edge</strong><small>Workers AI structures each entry.</small></span></li>
          <li><Database size={19} /><span><strong>Keep a durable ledger</strong><small>D1 stores records per account.</small></span></li>
          <li><ShieldCheck size={19} /><span><strong>Review before recording</strong><small>You confirm the final data.</small></span></li>
        </ul>
      </section>
      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="auth-heading"><p className="eyebrow">{eyebrow}</p><h2 id="auth-title">{title}</h2><p>{intro}</p></div>
        {children}
      </section>
      <p className="auth-footnote">Built with React, Workers AI and D1.</p>
    </main>
  );
}
