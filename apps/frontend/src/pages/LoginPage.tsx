import { LoginForm } from '../components/Auth/LoginForm';
import { AuthShell } from '../components/Auth/AuthShell';

export function LoginPage() {
  return (
    <AuthShell eyebrow="Welcome back" title="Open your ledger" intro="Continue with your account or enter the public portfolio demo.">
      <LoginForm />
    </AuthShell>
  );
}
