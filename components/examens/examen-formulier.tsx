'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ExamenInvoer } from '@/lib/validatie/examen';

interface ExamenFormulierProps {
  initieel?: Partial<ExamenInvoer> & { id?: number };
  onSluiten: () => void;
}

const PROGRAMMA_OPTIES = ['BScBA', 'FTMScM', 'PT MScM', 'Executive MBA', 'PhD'];
const EXAMTYPE_OPTIES = ['C', 'H', 'C/H', 'H1', 'H2', 'H3'] as const;
const TIJDBLOK_OPTIES = ['ochtend', 'middag', 'avond'] as const;

export function ExamenFormulier({ initieel, onSluiten }: ExamenFormulierProps) {
  const queryClient = useQueryClient();
  const isBewerken = !!initieel?.id;

  const [form, setForm] = useState<Partial<ExamenInvoer>>({
    naam: '',
    programma: 'BScBA',
    examtype: 'C',
    isFau: false,
    geschatAantal: 0,
    duurMinuten: 210,
    bijlageVereist: false,
    nieuweStudenten: false,
    status: 'concept',
    ...initieel,
  });

  const [fout, setFout] = useState<string | null>(null);

  const aanmaken = useMutation({
    mutationFn: async (data: Partial<ExamenInvoer>) => {
      const url = isBewerken ? `/api/examens/${initieel!.id}` : '/api/examens';
      const method = isBewerken ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Onbekende fout');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['examens'] });
      onSluiten();
    },
    onError: (err: Error) => setFout(err.message),
  });

  function stel(veld: keyof ExamenInvoer, waarde: unknown) {
    setForm((v) => ({ ...v, [veld]: waarde }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFout(null);
    aanmaken.mutate(form);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {fout && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded p-3">{fout}</div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Naam */}
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Naam <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.naam ?? ''}
            onChange={(e) => stel('naam', e.target.value)}
            required
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Programma */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Programma <span className="text-red-500">*</span>
          </label>
          <select
            value={form.programma ?? ''}
            onChange={(e) => stel('programma', e.target.value)}
            required
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {PROGRAMMA_OPTIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        {/* Examtype */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Examtype</label>
          <select
            value={form.examtype ?? 'C'}
            onChange={(e) => stel('examtype', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {EXAMTYPE_OPTIES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Geschat aantal */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Studenten (geschat)</label>
          <input
            type="number"
            min={0}
            value={form.geschatAantal ?? 0}
            onChange={(e) => stel('geschatAantal', Number(e.target.value))}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Duur */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Duur (minuten)</label>
          <input
            type="number"
            min={30}
            step={30}
            value={form.duurMinuten ?? 210}
            onChange={(e) => stel('duurMinuten', Number(e.target.value))}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Voorkeur tijdblok */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Voorkeur tijdblok</label>
          <select
            value={form.voorkeurTijdblok ?? ''}
            onChange={(e) => stel('voorkeurTijdblok', e.target.value || undefined)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Geen voorkeur</option>
            {TIJDBLOK_OPTIES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Locatie voorkeur */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Voorkeur locatie</label>
          <select
            value={form.locatieVoorkeur ?? ''}
            onChange={(e) => stel('locatieVoorkeur', e.target.value || undefined)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Geen voorkeur</option>
            <option value="Breukelen">Breukelen</option>
            <option value="Amsterdam">Amsterdam</option>
          </select>
        </div>

        {/* Contactpersoon */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contactpersoon</label>
          <input
            type="text"
            value={form.contactpersoon ?? ''}
            onChange={(e) => stel('contactpersoon', e.target.value || undefined)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Budgetnummer */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Budgetnummer</label>
          <input
            type="text"
            value={form.budgetnummer ?? ''}
            onChange={(e) => stel('budgetnummer', e.target.value || undefined)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Checkboxes */}
        <div className="col-span-2 flex gap-6">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isFau ?? false}
              onChange={(e) => stel('isFau', e.target.checked)}
              className="rounded"
            />
            FAU (landelijk tentamen)
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.bijlageVereist ?? false}
              onChange={(e) => stel('bijlageVereist', e.target.checked)}
              className="rounded"
            />
            Bijlage vereist
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.nieuweStudenten ?? false}
              onChange={(e) => stel('nieuweStudenten', e.target.checked)}
              className="rounded"
            />
            Nieuwe studenten
          </label>
        </div>

        {/* Opmerkingen */}
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Opmerkingen</label>
          <textarea
            rows={3}
            value={form.opmerkingen ?? ''}
            onChange={(e) => stel('opmerkingen', e.target.value || undefined)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
        <button
          type="button"
          onClick={onSluiten}
          className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          Annuleren
        </button>
        <button
          type="submit"
          disabled={aanmaken.isPending}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {aanmaken.isPending ? 'Opslaan...' : isBewerken ? 'Opslaan' : 'Examen aanmaken'}
        </button>
      </div>
    </form>
  );
}
