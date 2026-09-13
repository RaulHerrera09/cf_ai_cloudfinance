import { RegisterForm } from '../components/Auth/RegisterForm';
import { AuthShell } from '../components/Auth/AuthShell';

export function RegisterPage() {
  return (
    <AuthShell eyebrow="New account" title="Start a precise record" intro="Create a private ledger with clear validation and no invented opening balance.">
      <RegisterForm />
    </AuthShell>
  );
}
