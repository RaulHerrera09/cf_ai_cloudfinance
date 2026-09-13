import { useRef, useState, type FormEvent } from 'react';
import { ArrowRight, Eye, EyeOff, LoaderCircle, PlayCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { API_URL, decodeJWT, request } from '../../lib/api';
import { useAuthStore } from '../../store/auth';

const PUBLIC_DEMO = { email: 'demo@cloudfinance.dev', password: 'Demo2024!' } as const;
type Errors = { email?: string; password?: string };

function validate(email: string, password: string): Errors {
  const errors: Errors = {};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a complete email address, such as name@example.com.';
  if (!password) errors.password = 'Enter your password to continue.';
  return errors;
}

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const login = async (nextEmail: string, nextPassword: string) => {
    if (isLoading) return;
    setServerError(null);
    setIsLoading(true);
    try {
      const response = await request(`${API_URL}/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: nextEmail, password: nextPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error === 'Invalid credentials' ? 'Email or password did not match. Check both fields and try again.' : data.error ?? 'Sign in failed.');
      setAuth(data.accessToken, data.refreshToken, decodeJWT(data.accessToken) ?? undefined);
      navigate('/', { replace: true });
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'The service could not be reached. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validate(email, password);
    setErrors(nextErrors);
    if (nextErrors.email) return emailRef.current?.focus();
    if (nextErrors.password) return passwordRef.current?.focus();
    void login(email, password);
  };

  const useDemo = () => {
    setEmail(PUBLIC_DEMO.email);
    setPassword(PUBLIC_DEMO.password);
    setErrors({});
    void login(PUBLIC_DEMO.email, PUBLIC_DEMO.password);
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <div className="field"><label htmlFor="email">Email address</label><input ref={emailRef} id="email" type="email" autoComplete="email" required value={email} onChange={(e) => { setEmail(e.target.value); setErrors((current) => ({ ...current, email: undefined })); }} onBlur={() => setErrors((current) => ({ ...current, email: validate(email, password).email }))} disabled={isLoading} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'email-error' : undefined} placeholder="you@example.com" />{errors.email && <p id="email-error" className="field-error">{errors.email}</p>}</div>
      <div className="field"><label htmlFor="password">Password</label><div className="password-field"><input ref={passwordRef} id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(e) => { setPassword(e.target.value); setErrors((current) => ({ ...current, password: undefined })); }} onBlur={() => setErrors((current) => ({ ...current, password: validate(email, password).password }))} disabled={isLoading} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'password-error' : undefined} /><button className="password-toggle" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}>{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button></div>{errors.password && <p id="password-error" className="field-error">{errors.password}</p>}</div>
      {serverError && <p className="notice notice-error" role="alert">{serverError}</p>}
      <button className="button button-primary auth-submit" type="submit" disabled={isLoading}>{isLoading ? <LoaderCircle className="spin" size={19} /> : <ArrowRight size={19} />}{isLoading ? 'Opening ledger…' : 'Open ledger'}</button>
      <div className="auth-divider"><span>or</span></div>
      <button className="button button-demo" type="button" onClick={useDemo} disabled={isLoading}><PlayCircle size={19} />Enter public demo</button>
      <p className="demo-note">Uses the deliberately public portfolio account documented in this repository.</p>
      <p className="auth-switch">New to CloudFinance? <Link to="/register">Create an account</Link></p>
    </form>
  );
}
