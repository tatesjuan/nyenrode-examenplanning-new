import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Nyenrode Examenplanning</h1>
          <p className="text-sm text-gray-500 mt-1">Log in met uw e-mailadres en pincode</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
