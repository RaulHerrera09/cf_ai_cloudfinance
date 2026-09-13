import { useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, Check, CheckCircle2, LoaderCircle, PencilLine, Sparkles } from 'lucide-react';
import { apiFetch, API_URL } from '../../lib/api';
import { formatMoney, toMinorUnits } from '../../lib/finance';
import { createMutationGate } from '../../lib/interactionGuards';

type Draft = {
  amount: number;
  currency: string;
  category: string;
  type: 'income' | 'expense';
  description: string;
  is_anomaly: boolean;
};

type DraftErrors = Partial<Record<'amount' | 'currency' | 'category' | 'description', string>>;
type Stage = 'describe' | 'review' | 'recorded';

const CATEGORY_SUGGESTIONS = ['Food & Drinks', 'Transport', 'Housing', 'Utilities', 'Shopping', 'Health & Fitness', 'Education', 'Entertainment', 'Salary', 'Freelance', 'Other'];

function validateDraft(draft: Draft): DraftErrors {
  const errors: DraftErrors = {};
  if (!Number.isFinite(draft.amount) || draft.amount <= 0) errors.amount = 'Enter an amount greater than zero.';
  if (!/^[A-Z]{3}$/.test(draft.currency)) errors.currency = 'Use a three-letter code such as USD or GBP.';
  if (!draft.category.trim() || draft.category.trim().length > 64) errors.category = 'Enter a category up to 64 characters.';
  if (draft.description.length > 240) errors.description = 'Keep the description to 240 characters or fewer.';
  return errors;
}

export function AIComposer({ onRecorded }: { onRecorded: () => void }) {
  const [stage, setStage] = useState<Stage>('describe');
  const [sourceText, setSourceText] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [draftErrors, setDraftErrors] = useState<DraftErrors>({});
  const [requestError, setRequestError] = useState<string | null>(null);
  const [isInterpreting, setIsInterpreting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const sourceRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const currencyRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLInputElement>(null);
  const requestId = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const saveGate = useRef(createMutationGate());

  const interpret = async (event: FormEvent) => {
    event.preventDefault();
    if (!sourceText.trim()) {
      setSourceError('Describe one income or expense, including an amount.');
      sourceRef.current?.focus();
      return;
    }
    setSourceError(null);
    setRequestError(null);
    setIsInterpreting(true);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const id = ++requestId.current;
    try {
      const response = await apiFetch(`${API_URL}/analyze/preview`, {
        method: 'POST',
        body: JSON.stringify({ text: sourceText.trim() }),
        signal: controller.signal,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'The transaction could not be interpreted.');
      if (id !== requestId.current) return;
      setDraft({
        amount: Number(payload.data.amount),
        currency: String(payload.data.currency ?? 'USD').toUpperCase(),
        category: String(payload.data.category ?? 'Other'),
        type: payload.data.type === 'income' ? 'income' : 'expense',
        description: String(payload.data.description ?? ''),
        is_anomaly: Boolean(payload.data.is_anomaly),
      });
      setStage('review');
    } catch (error) {
      if (controller.signal.aborted) return;
      setRequestError(error instanceof Error ? error.message : 'AI preview failed. Try again.');
    } finally {
      if (id === requestId.current) setIsInterpreting(false);
    }
  };

  const updateDraft = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((current) => current ? { ...current, [key]: value } : current);
    setDraftErrors((current) => ({ ...current, [key]: undefined }));
  };

  const validateField = (field: keyof DraftErrors) => {
    if (!draft) return;
    const error = validateDraft(draft)[field];
    setDraftErrors((current) => ({ ...current, [field]: error }));
  };

  const confirm = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft || !saveGate.current.begin()) return;
    const errors = validateDraft(draft);
    setDraftErrors(errors);
    const first = Object.keys(errors)[0] as keyof DraftErrors | undefined;
    if (first) {
      saveGate.current.end();
      ({ amount: amountRef, currency: currencyRef, category: categoryRef, description: null }[first]?.current)?.focus();
      return;
    }
    setIsSaving(true);
    setRequestError(null);
    try {
      const response = await apiFetch(`${API_URL}/transactions`, {
        method: 'POST',
        body: JSON.stringify(draft),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'The transaction could not be saved.');
      setStage('recorded');
      onRecorded();
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'The transaction could not be saved.');
    } finally {
      saveGate.current.end();
      setIsSaving(false);
    }
  };

  const reset = () => {
    abortRef.current?.abort();
    requestId.current += 1;
    setStage('describe');
    setSourceText('');
    setDraft(null);
    setDraftErrors({});
    setRequestError(null);
    setTimeout(() => sourceRef.current?.focus(), 0);
  };

  return (
    <section className="composer" aria-labelledby="composer-title">
      <div className="composer-accent" aria-hidden="true" />
      <div className="section-heading composer-heading">
        <span className="section-icon ai-icon" aria-hidden="true"><Sparkles size={21} /></span>
        <div>
          <p className="eyebrow">Workers AI · structured review</p>
          <h2 id="composer-title">Record what just happened</h2>
        </div>
      </div>

      <ol className="edge-trace" aria-label="Transaction progress">
        {(['describe', 'review', 'recorded'] as const).map((item, index) => {
          const activeIndex = ['describe', 'review', 'recorded'].indexOf(stage);
          const complete = index < activeIndex;
          return <li key={item} className={index === activeIndex ? 'active' : complete ? 'complete' : ''} aria-current={index === activeIndex ? 'step' : undefined}>
            <span>{complete ? <Check size={13} /> : index + 1}</span>{item === 'describe' ? 'Describe' : item === 'review' ? 'Review' : 'Recorded'}
          </li>;
        })}
      </ol>

      {stage === 'describe' && (
        <form onSubmit={interpret} noValidate className="composer-form">
          <label htmlFor="transaction-description">Describe one transaction</label>
          <div className="composer-input-row">
            <input
              ref={sourceRef}
              id="transaction-description"
              value={sourceText}
              onChange={(event) => { setSourceText(event.target.value); setSourceError(null); }}
              onBlur={() => !sourceText.trim() && sourceText.length > 0 && setSourceError('Describe one income or expense, including an amount.')}
              aria-invalid={Boolean(sourceError)}
              aria-describedby={sourceError ? 'source-error' : 'source-hint'}
              placeholder="Paid GBP 28.40 for dinner with friends"
              autoComplete="off"
              disabled={isInterpreting}
              maxLength={1000}
            />
            <button className="button button-ai" disabled={isInterpreting || !sourceText.trim()}>
              {isInterpreting ? <LoaderCircle className="spin" size={19} /> : <Sparkles size={19} />}
              {isInterpreting ? 'Interpreting…' : 'Interpret'}
            </button>
          </div>
          {sourceError ? <p className="field-error" id="source-error">{sourceError}</p> : <p className="field-hint" id="source-hint">Nothing is saved until you review and confirm the structured entry.</p>}
        </form>
      )}

      {stage === 'review' && draft && (
        <form onSubmit={confirm} noValidate className="preview-form">
          <div className="preview-heading"><div><p className="eyebrow">Interpreted entry</p><h3>Check every field</h3></div><button type="button" className="button button-text" onClick={() => setStage('describe')}><ArrowLeft size={17} />Back to phrase</button></div>
          <div className="preview-grid">
            <div className="field"><label htmlFor="preview-amount">Amount</label><input ref={amountRef} id="preview-amount" type="number" inputMode="decimal" min="0.01" step="0.01" value={draft.amount} onChange={(e) => updateDraft('amount', Number(e.target.value))} onBlur={() => validateField('amount')} aria-invalid={Boolean(draftErrors.amount)} aria-describedby={draftErrors.amount ? 'preview-amount-error' : undefined} />{draftErrors.amount && <p id="preview-amount-error" className="field-error">{draftErrors.amount}</p>}</div>
            <div className="field"><label htmlFor="preview-currency">Currency</label><input ref={currencyRef} id="preview-currency" value={draft.currency} maxLength={3} autoCapitalize="characters" onChange={(e) => updateDraft('currency', e.target.value.toUpperCase())} onBlur={() => validateField('currency')} aria-invalid={Boolean(draftErrors.currency)} aria-describedby={draftErrors.currency ? 'preview-currency-error' : undefined} />{draftErrors.currency && <p id="preview-currency-error" className="field-error">{draftErrors.currency}</p>}</div>
            <fieldset className="field type-field"><legend>Type</legend><div className="segmented"><label><input type="radio" name="preview-type" checked={draft.type === 'expense'} onChange={() => updateDraft('type', 'expense')} /><span>Expense</span></label><label><input type="radio" name="preview-type" checked={draft.type === 'income'} onChange={() => updateDraft('type', 'income')} /><span>Income</span></label></div></fieldset>
            <div className="field"><label htmlFor="preview-category">Category</label><input ref={categoryRef} id="preview-category" list="category-suggestions" value={draft.category} maxLength={64} onChange={(e) => updateDraft('category', e.target.value)} onBlur={() => validateField('category')} aria-invalid={Boolean(draftErrors.category)} aria-describedby={draftErrors.category ? 'preview-category-error' : undefined} />{draftErrors.category && <p id="preview-category-error" className="field-error">{draftErrors.category}</p>}</div>
            <div className="field field-wide"><label htmlFor="preview-description">Description</label><input id="preview-description" value={draft.description} maxLength={240} onChange={(e) => updateDraft('description', e.target.value)} onBlur={() => validateField('description')} aria-invalid={Boolean(draftErrors.description)} aria-describedby={draftErrors.description ? 'preview-description-error' : undefined} />{draftErrors.description && <p id="preview-description-error" className="field-error">{draftErrors.description}</p>}</div>
          </div>
          <datalist id="category-suggestions">{CATEGORY_SUGGESTIONS.map((category) => <option key={category} value={category} />)}</datalist>
          {requestError && <p className="notice notice-error" role="alert">{requestError}</p>}
          <div className="form-actions"><button type="button" className="button button-secondary" onClick={() => setStage('describe')} disabled={isSaving}>Cancel</button><button className="button button-primary" disabled={isSaving}>{isSaving ? <LoaderCircle className="spin" size={18} /> : <Check size={18} />}{isSaving ? 'Recording…' : 'Confirm entry'}</button></div>
        </form>
      )}

      {stage === 'recorded' && draft && (
        <div className="recorded-state" role="status">
          <CheckCircle2 size={30} aria-hidden="true" />
          <div><p className="eyebrow">Recorded once</p><h3>{formatMoney(toMinorUnits(draft.amount), draft.currency)} · {draft.category}</h3><p>{draft.description || `${draft.type === 'income' ? 'Income' : 'Expense'} transaction`}</p></div>
          <button className="button button-secondary" type="button" onClick={reset}><PencilLine size={17} />Record another</button>
        </div>
      )}
      {stage === 'describe' && requestError && <p className="notice notice-error" role="alert">{requestError}</p>}
    </section>
  );
}
