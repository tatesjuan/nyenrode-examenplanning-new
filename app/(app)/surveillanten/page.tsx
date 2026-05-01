'use client';

import { useState } from 'react';
import { SurveillantenLijst } from '@/components/surveillanten/surveillanten-lijst';
import { ToewijzingMatrix } from '@/components/surveillanten/toewijzing-matrix';

type Tab = 'lijst' | 'matrix';

export default function SurveillantenPage() {
  const [tab, setTab] = useState<Tab>('lijst');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Surveillanten</h1>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-0">
          {([
            { id: 'lijst', label: 'Overzicht & beheer' },
            { id: 'matrix', label: 'Toewijzingsmatrix' },
          ] as { id: Tab; label: string }[]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'lijst' && <SurveillantenLijst />}
      {tab === 'matrix' && <ToewijzingMatrix />}
    </div>
  );
}
