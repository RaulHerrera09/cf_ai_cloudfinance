import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { accessToken, isBootstrapping } = useAuthStore();

  if (isBootstrapping) {
    return (
      <div className="route-loading" role="status" aria-live="polite">
        <span className="route-loading-mark" />
        <span>Restoring your secure session…</span>
      </div>
    );
  }

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
