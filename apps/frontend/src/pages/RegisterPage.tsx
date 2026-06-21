import { RegisterForm } from '../components/Auth/RegisterForm';

export function RegisterPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-blue-500 to-purple-500">
            CloudFinance AI
          </h1>
          <p className="mt-2 text-slate-400 text-sm">Create your account</p>
        </div>

        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl blur opacity-20" />
          <div className="relative bg-slate-900/80 backdrop-blur-xl p-8 rounded-2xl border border-white/10 shadow-2xl">
            <RegisterForm />
          </div>
        </div>
      </div>
    </div>
  );
}
