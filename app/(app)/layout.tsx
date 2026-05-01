import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { NavBar } from '@/components/nav-bar';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect('/login');

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar gebruiker={session.user} />
      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
