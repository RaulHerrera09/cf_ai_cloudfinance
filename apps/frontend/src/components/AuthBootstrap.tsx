import { useEffect } from 'react';
import { useAuthStore } from '../store/auth';
import { API_URL, decodeJWT } from '../lib/api';

export function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const { refreshToken, setAuth, clearAuth, setBootstrapping } = useAuthStore();

  useEffect(() => {
    if (!refreshToken) {
      setBootstrapping(false);
      return;
    }

    fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('refresh failed');
        return res.json();
      })
      .then(({ accessToken, refreshToken: newRefresh }) => {
        const user = decodeJWT(accessToken) ?? undefined;
        setAuth(accessToken, newRefresh, user);
      })
      .catch(() => clearAuth())
      .finally(() => setBootstrapping(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <>{children}</>;
}
