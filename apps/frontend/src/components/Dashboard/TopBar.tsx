import { Cloud, LogOut, UserRound } from 'lucide-react';
import type { User } from '../../store/auth';

type Props = {
  user: User | null;
  isLoggingOut: boolean;
  onLogout: () => void;
};

export function TopBar({ user, isLoggingOut, onLogout }: Props) {
  return (
    <header className="topbar">
      <a className="brand" href="#main-content" aria-label="CloudFinance AI dashboard">
        <span className="brand-mark" aria-hidden="true"><Cloud size={19} /></span>
        <span>CloudFinance <strong>AI</strong></span>
      </a>
      {user && (
        <div className="account-cluster">
          <div className="account-copy">
            <UserRound size={18} aria-hidden="true" />
            <span><strong>{user.name}</strong><small>{user.email}</small></span>
          </div>
          <button className="button button-quiet" type="button" onClick={onLogout} disabled={isLoggingOut}>
            <LogOut size={18} aria-hidden="true" />
            <span className="logout-label">{isLoggingOut ? 'Signing out…' : 'Log out'}</span>
          </button>
        </div>
      )}
    </header>
  );
}
