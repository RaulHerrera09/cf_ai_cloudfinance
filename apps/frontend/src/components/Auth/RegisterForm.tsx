import { useRef, useState, type FormEvent } from 'react';
import { ArrowRight, Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { API_URL, decodeJWT, request } from '../../lib/api';
import { useAuthStore } from '../../store/auth';

type Fields = { name: string; email: string; password: string; confirm: string };
type Errors = Partial<Record<keyof Fields, string>>;

function validate(fields: Fields): Errors {
  const errors: Errors = {};
  if (!fields.name.trim()) errors.name = 'Enter the name you want shown in your ledger.';
  else if (fields.name.trim().length > 100) errors.name = 'Keep your name to 100 characters or fewer.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) errors.email = 'Enter a complete email address, such as name@example.com.';
  if (fields.password.length < 8 || !/\d/.test(fields.password)) errors.password = 'Use at least 8 characters and include one number.';
  if (!fields.confirm) errors.confirm = 'Repeat your password to confirm it.';
  else if (fields.password !== fields.confirm) errors.confirm = 'Passwords do not match. Re-enter both values.';
  return errors;
}

export function RegisterForm() {
  const [fields, setFields] = useState<Fields>({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const refs = { name: useRef<HTMLInputElement>(null), email: useRef<HTMLInputElement>(null), password: useRef<HTMLInputElement>(null), confirm: useRef<HTMLInputElement>(null) };
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  const update = (key: keyof Fields, value: string) => { setFields((current) => ({ ...current, [key]: value })); setErrors((current) => ({ ...current, [key]: undefined })); };
  const validateField = (key: keyof Fields) => setErrors((current) => ({ ...current, [key]: validate(fields)[key] }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validate(fields);
    setErrors(nextErrors);
    const first = Object.keys(nextErrors)[0] as keyof Fields | undefined;
    if (first) return refs[first].current?.focus();
    if (isLoading) return;
    setServerError(null);
    setIsLoading(true);
    try {
      const response = await request(`${API_URL}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: fields.name.trim(), email: fields.email, password: fields.password }) });
      const data = await response.json();
      if (!response.ok) {
        if (data.field && data.field in fields) setErrors({ [data.field]: data.error });
        else setServerError(data.error ?? 'The account could not be created.');
        return;
      }
      setAuth(data.accessToken, data.refreshToken, decodeJWT(data.accessToken) ?? undefined);
      navigate('/', { replace: true });
    } catch {
      setServerError('The service could not be reached. Check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <div className="field"><label htmlFor="name">Full name</label><input ref={refs.name} id="name" autoComplete="name" required value={fields.name} onChange={(e) => update('name', e.target.value)} onBlur={() => validateField('name')} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'name-error' : undefined} disabled={isLoading} />{errors.name && <p id="name-error" className="field-error">{errors.name}</p>}</div>
      <div className="field"><label htmlFor="reg-email">Email address</label><input ref={refs.email} id="reg-email" type="email" autoComplete="email" required value={fields.email} onChange={(e) => update('email', e.target.value)} onBlur={() => validateField('email')} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'reg-email-error' : undefined} disabled={isLoading} />{errors.email && <p id="reg-email-error" className="field-error">{errors.email}</p>}</div>
      <div className="field"><label htmlFor="reg-password">Password</label><div className="password-field"><input ref={refs.password} id="reg-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required value={fields.password} onChange={(e) => update('password', e.target.value)} onBlur={() => validateField('password')} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'reg-password-error' : 'password-hint'} disabled={isLoading} /><button className="password-toggle" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}>{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button></div>{errors.password ? <p id="reg-password-error" className="field-error">{errors.password}</p> : <p id="password-hint" className="field-hint">At least 8 characters, including one number.</p>}</div>
      <div className="field"><label htmlFor="confirm">Confirm password</label><input ref={refs.confirm} id="confirm" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required value={fields.confirm} onChange={(e) => update('confirm', e.target.value)} onBlur={() => validateField('confirm')} aria-invalid={Boolean(errors.confirm)} aria-describedby={errors.confirm ? 'confirm-error' : undefined} disabled={isLoading} />{errors.confirm && <p id="confirm-error" className="field-error">{errors.confirm}</p>}</div>
      {serverError && <p className="notice notice-error" role="alert">{serverError}</p>}
      <button className="button button-primary auth-submit" type="submit" disabled={isLoading}>{isLoading ? <LoaderCircle className="spin" size={19} /> : <ArrowRight size={19} />}{isLoading ? 'Creating ledger…' : 'Create my ledger'}</button>
      <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
    </form>
  );
}
