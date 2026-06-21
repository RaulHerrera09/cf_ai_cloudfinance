import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Loader2 } from 'lucide-react';
import { API_URL, decodeJWT } from '../../lib/api';
import { useAuthStore } from '../../store/auth';

type FieldErrors = { name?: string; email?: string; password?: string; confirm?: string };

export function RegisterForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {};
    if (!name.trim()) errors.name = 'Name is required';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Valid email is required';
    if (password.length < 8 || !/\d/.test(password))
      errors.password = 'Password must be at least 8 characters and contain a number';
    if (password !== confirm) errors.confirm = 'Passwords do not match';
    return errors;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.field) {
          setFieldErrors({ [data.field]: data.error });
        } else {
          setServerError(data.error ?? 'Registration failed');
        }
        return;
      }

      const user = decodeJWT(data.accessToken) ?? undefined;
      setAuth(data.accessToken, data.refreshToken, user);
      navigate('/', { replace: true });
    } catch {
      setServerError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass =
    'w-full bg-slate-800/50 border rounded-xl px-4 py-3 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition disabled:opacity-50';
  const errorInputClass = 'border-red-500/60';
  const okInputClass = 'border-slate-700 focus:border-indigo-500/50';

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Register form">
      <div className="space-y-5">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-1.5">
            Full name
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isLoading}
            aria-describedby={fieldErrors.name ? 'name-error' : undefined}
            className={`${inputClass} ${fieldErrors.name ? errorInputClass : okInputClass}`}
            placeholder="Jane Smith"
          />
          {fieldErrors.name && (
            <p id="name-error" role="alert" className="mt-1 text-xs text-red-400">
              {fieldErrors.name}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="reg-email" className="block text-sm font-medium text-slate-300 mb-1.5">
            Email address
          </label>
          <input
            id="reg-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            aria-describedby={fieldErrors.email ? 'email-error' : undefined}
            className={`${inputClass} ${fieldErrors.email ? errorInputClass : okInputClass}`}
            placeholder="you@example.com"
          />
          {fieldErrors.email && (
            <p id="email-error" role="alert" className="mt-1 text-xs text-red-400">
              {fieldErrors.email}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="reg-password" className="block text-sm font-medium text-slate-300 mb-1.5">
            Password
          </label>
          <input
            id="reg-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            aria-describedby={fieldErrors.password ? 'password-error' : 'password-hint'}
            className={`${inputClass} ${fieldErrors.password ? errorInputClass : okInputClass}`}
            placeholder="••••••••"
          />
          {fieldErrors.password ? (
            <p id="password-error" role="alert" className="mt-1 text-xs text-red-400">
              {fieldErrors.password}
            </p>
          ) : (
            <p id="password-hint" className="mt-1 text-xs text-slate-500">
              At least 8 characters, including a number
            </p>
          )}
        </div>

        <div>
          <label htmlFor="confirm" className="block text-sm font-medium text-slate-300 mb-1.5">
            Confirm password
          </label>
          <input
            id="confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={isLoading}
            aria-describedby={fieldErrors.confirm ? 'confirm-error' : undefined}
            className={`${inputClass} ${fieldErrors.confirm ? errorInputClass : okInputClass}`}
            placeholder="••••••••"
          />
          {fieldErrors.confirm && (
            <p id="confirm-error" role="alert" className="mt-1 text-xs text-red-400">
              {fieldErrors.confirm}
            </p>
          )}
        </div>

        {serverError && (
          <p role="alert" className="text-sm text-red-400 bg-red-950/40 border border-red-900/40 rounded-lg px-3 py-2">
            {serverError}
          </p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition min-h-[44px]"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 motion-safe:animate-spin" />
          ) : (
            <UserPlus className="w-5 h-5" />
          )}
          {isLoading ? 'Creating account…' : 'Create account'}
        </button>

        <p className="text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-400 hover:text-indigo-300 transition">
            Sign in
          </Link>
        </p>
      </div>
    </form>
  );
}
