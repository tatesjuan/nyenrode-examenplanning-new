'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

interface Surveillant {
  id: number;
  naam: string;
  email: string;
  kanHs: boolean;
  kanSurv: boolean;
  actief: boolean;
}

const legeForm = { naam: '', email: '', kanHs: false, kanSurv: true };
type FormState = typeof legeForm;
type Modal = { type: 'nieuw' } | { type: 'bewerken'; surveillant: Surveillant } | null;

export function SurveillantenLijst() {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState<Modal>(null);
  const [form, setForm] = useState<FormState>(legeForm);
  const [fout, setFout] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['surveillanten'],
    queryFn: async () => {
      const res = await fetch('/api/surveillanten');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json.data as Surveillant[];
    },
  });

  const opslaan = useMutation({
    mutationFn: async (payload: FormState & { id?: number }) => {
      const { id, ...body } = payload;
      const res = await fetch(id ? `/api/surveillanten/${id}` : '/api/surveillanten', {
        method: id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Opslaan mislukt');
      return json.data as Surveillant;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveillanten'] });
      setModal(null);
      setFout(null);
    },
    onError: (e: Error) => setFout(e.message),
  });

  const toggleActief = useMutation({
    mutationFn: async ({ id, actief }: { id: number; actief: boolean }) => {
      const res = await fetch(`/api/surveillanten/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actief }),
      });
      if (!res.ok) throw new Error('Bijwerken mislukt');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['surveillanten'] }),
  });

  function openNieuw() {
    setForm(legeForm);
    setFout(null);
    setModal({ type: 'nieuw' });
  }

  function openBewerken(s: Surveillant) {
    setForm({ naam: s.naam, email: s.email, kanHs: s.kanHs, kanSurv: s.kanSurv });
    setFout(null);
    setModal({ type: 'bewerken', surveillant: s });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const id = modal?.type === 'bewerken' ? modal.surveillant.id : undefined;
    opslaan.mutate({ ...form, id });
  }

  const surveillanten = data ?? [];
  const actiefCount = surveillanten.filter((s) => s.actief).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {actiefCount} actief · {surveillanten.length - actiefCount} inactief
        </p>
        <button
          onClick={openNieuw}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
        >
          + Nieuwe surveillant
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-gray-400 text-sm">Laden...</div>
      ) : surveillanten.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm">Geen surveillanten gevonden.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Naam</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">E-mail</th>
                <th className="px-4 py-3 text-center font-medium text-gray-700">Surveillant</th>
                <th className="px-4 py-3 text-center font-medium text-gray-700">Hoofdsurv.</th>
                <th className="px-4 py-3 text-center font-medium text-gray-700">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Acties</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {surveillanten.map((s) => (
                <tr key={s.id} className={`hover:bg-gray-50 ${!s.actief ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 font-medium text-gray-900">{s.naam}</td>
                  <td className="px-4 py-3 text-gray-600">{s.email}</td>
                  <td className="px-4 py-3 text-center">
                    {s.kanSurv ? (
                      <span className="inline-block w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center">✓</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {s.kanHs ? (
                      <span className="inline-block w-5 h-5 rounded-full bg-green-100 text-green-700 text-xs flex items-center justify-center">✓</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleActief.mutate({ id: s.id, actief: !s.actief })}
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        s.actief
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {s.actief ? 'Actief' : 'Inactief'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openBewerken(s)}
                      className="text-xs text-gray-600 hover:underline"
                    >
                      Bewerken
                    </button>
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900">
                {modal.type === 'nieuw' ? 'Nieuwe surveillant' : 'Surveillant bewerken'}
              </h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {fout && (
                <div className="text-sm text-red-600 bg-red-50 rounded p-2">{fout}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Naam</label>
                <input
                  type="text"
                  value={form.naam}
                  onChange={(e) => setForm((f) => ({ ...f, naam: e.target.value }))}
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mailadres</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.kanSurv}
                    onChange={(e) => setForm((f) => ({ ...f, kanSurv: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-gray-700">Kan surveilleren</span>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.kanHs}
                    onChange={(e) => setForm((f) => ({ ...f, kanHs: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-gray-700">Kan hoofdsurveillant zijn</span>
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  disabled={opslaan.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {opslaan.isPending ? 'Opslaan...' : 'Opslaan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
