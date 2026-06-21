import { useAuthStore } from '../store/auth';

export const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  'https://backend.raulherreradelgadillo09.workers.dev/api';

export function decodeJWT(token: string): { id: string; email: string; name: string } | null {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    const padded = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padding = (4 - (padded.length % 4)) % 4;
    const decoded = JSON.parse(atob(padded + '='.repeat(padding)));
    return { id: decoded.sub, email: decoded.email, name: decoded.name };
  } catch {
    return null;
  }
}

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const store = useAuthStore.getState();
  const { accessToken, refreshToken } = store;

  const buildHeaders = (token: string | null): Record<string, string> => ({
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });

  const res = await fetch(url, { ...options, headers: buildHeaders(accessToken) });
  if (res.status !== 401 || !refreshToken) return res;

  const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!refreshRes.ok) {
    store.clearAuth();
    window.location.replace('/login');
    return res;
  }

  const { accessToken: newToken, refreshToken: newRefresh } = await refreshRes.json();
  store.setAuth(newToken, newRefresh);

  return fetch(url, { ...options, headers: buildHeaders(newToken) });
}
