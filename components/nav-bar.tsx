'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import type { Rol } from '@/types/domain';
import { ROLLEN_PAGINAS } from '@/lib/auth/edge-config';

const PAGINA_LABELS: Record<string, string> = {
  kalender: 'Kalender',
  examens: 'Examens',
  surveillanten: 'Surveillanten',
  rapporten: 'Rapporten',
  beschikbaarheid: 'Mijn beschikbaarheid',
};

interface NavBarProps {
  gebruiker: {
    name?: string | null;
    rol: Rol;
  };
}

export function NavBar({ gebruiker }: NavBarProps) {
  const pathname = usePathname();
  const paginas = ROLLEN_PAGINAS[gebruiker.rol] ?? [];

  return (
    <nav className="bg-white border-b border-gray-200 px-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between h-14">
        <div className="flex items-center gap-6">
          <span className="font-semibold text-gray-900 text-sm">Nyenrode EP</span>
          <div className="flex gap-1">
            {paginas.map((pagina) => {
              const href = `/${pagina}`;
              const actief = pathname.startsWith(href);
              return (
                <Link
                  key={pagina}
                  href={href}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    actief
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {PAGINA_LABELS[pagina] ?? pagina}
                </Link>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{gebruiker.name}</span>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            Uitloggen
          </button>
        </div>
      </div>
    </nav>
  );
}
