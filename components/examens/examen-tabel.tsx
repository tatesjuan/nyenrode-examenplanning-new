'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StatusBadge } from './status-badge';
import { ExamenFormulier } from './examen-formulier';
import type { Status } from '@/types/domain';

interface ExamenRij {
  id: number;
  naam: string;
  programma: string;
  examtype: string;
  isFau: boolean;
  geschatAantal: number;
  voorkeurTijdblok?: string | null;
  locatieVoorkeur?: string | null;
  status: Status;
  contactpersoon?: string | null;
  budgetnummer?: string | null;
}

const STATUS_TABS: { label: string; waarde: Status | 'alle' }[] = [
  { label: 'Alle', waarde: 'alle' },
  { label: 'Concept', waarde: 'concept' },
  { label: 'Ingediend', waarde: 'ingediend' },
  { label: 'Gepland', waarde: 'gepland' },
  { label: 'Bevestigd', waarde: 'bevestigd' },
];

type ModalModus = { type: 'nieuw' } | { type: 'bewerken'; examen: ExamenRij } | null;

export function ExamenTabel() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<Status | 'alle'>('alle');
  const [modal, setModal] = useState<ModalModus>(null);
  const [verwijderBezig, setVerwijderBezig] = useState<number | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['examens', statusFilter],
    queryFn: async () => {
      const params = statusFilter !== 'alle' ? `?status=${statusFilter}` : '';
      const res = await fetch(`/api/examens${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json.data as ExamenRij[];
    },
  });

  const verwijder = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/examens/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Verwijderen mislukt');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['examens'] }),
    onSettled: () => setVerwijderBezig(null),
  });

  const statusWijzig = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: Status }) => {
      const res = await fetch(`/api/examens/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Statuswijziging mislukt');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['examens'] }),
  });

  const examens = data ?? [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.waarde}
              onClick={() => setStatusFilter(tab.waarde)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                statusFilter === tab.waarde
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setModal({ type: 'nieuw' })}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
        >
          + Nieuw examen
        </button>
      </div>

      {/* Tabel */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500 text-sm">Laden...</div>
      ) : error ? (
        <div className="text-center py-12 text-red-500 text-sm">Fout bij laden: {(error as Error).message}</div>
      ) : examens.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">Geen examens gevonden.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Naam</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Programma</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Type</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">Studenten</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Voorkeur</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Acties</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {examens.map((examen) => (
                <tr key={examen.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {examen.naam}
                    {examen.isFau && (
                      <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">FAU</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{examen.programma}</td>
                  <td className="px-4 py-3 text-gray-600">{examen.examtype}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{examen.geschatAantal}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {[examen.voorkeurTijdblok, examen.locatieVoorkeur].filter(Boolean).join(' · ') || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={examen.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {examen.status === 'concept' && (
                        <button
                          onClick={() => statusWijzig.mutate({ id: examen.id, status: 'ingediend' })}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Indienen
                        </button>
                      )}
                      {examen.status === 'gepland' && (
                        <button
                          onClick={() => statusWijzig.mutate({ id: examen.id, status: 'bevestigd' })}
                          className="text-xs text-green-600 hover:underline"
                        >
                          Bevestigen
                        </button>
                      )}
                      <button
                        onClick={() => setModal({ type: 'bewerken', examen })}
                        className="text-xs text-gray-600 hover:underline"
                      >
                        Bewerken
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Examen "${examen.naam}" verwijderen?`)) {
                            setVerwijderBezig(examen.id);
                            verwijder.mutate(examen.id);
                          }
                        }}
                        disabled={verwijderBezig === examen.id}
                        className="text-xs text-red-500 hover:underline disabled:opacity-50"
                      >
                        Verwijderen
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900">
                {modal.type === 'nieuw' ? 'Nieuw examen' : 'Examen bewerken'}
              </h2>
              <button
                onClick={() => setModal(null)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>
            <ExamenFormulier
              initieel={modal.type === 'bewerken' ? {
                ...modal.examen,
                id: modal.examen.id,
                examtype: modal.examen.examtype as 'C' | 'H' | 'C/H' | 'H1' | 'H2' | 'H3',
                voorkeurTijdblok: (modal.examen.voorkeurTijdblok ?? undefined) as 'ochtend' | 'middag' | 'avond' | undefined,
                locatieVoorkeur: (modal.examen.locatieVoorkeur ?? undefined) as 'Breukelen' | 'Amsterdam' | undefined,
                contactpersoon: modal.examen.contactpersoon ?? undefined,
                budgetnummer: modal.examen.budgetnummer ?? undefined,
              } : undefined}
              onSluiten={() => setModal(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
