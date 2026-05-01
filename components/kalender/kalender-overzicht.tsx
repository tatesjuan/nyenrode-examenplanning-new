'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DagDetail } from './dag-detail';
import type { SlotMetToewijzing, OngeplandExamen } from '@/types/kalender';

const NL_MAANDEN = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
];
const NL_DAGEN_KORT = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];

function isoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function dagenInMaand(jaar: number, maand: number) {
  return new Date(jaar, maand + 1, 0).getDate();
}

function isSlotBeperkt(slot: SlotMetToewijzing): boolean {
  if (slot.geblokkeerd || slot.campus !== 'Breukelen' || slot.tijdblok !== 'ochtend') return false;
  const [jaar, maand, dag] = slot.datum.split('-').map(Number);
  const dagVanWeek = new Date(jaar, maand - 1, dag).getDay();
  return dagVanWeek === 1 || dagVanWeek === 2 || dagVanWeek === 5;
}

export function KalenderOverzicht() {
  const vandaag = new Date();
  const [jaar, setJaar] = useState(vandaag.getFullYear());
  const [maand, setMaand] = useState(vandaag.getMonth());
  const [geselecteerdeDag, setGeselecteerdeDag] = useState<string | null>(null);
  const [geselecteerdExamen, setGeselecteerdExamen] = useState<OngeplandExamen | null>(null);
  const queryClient = useQueryClient();

  const maandStart = isoDate(new Date(jaar, maand, 1));
  const maandEind = isoDate(new Date(jaar, maand, dagenInMaand(jaar, maand)));

  const { data: slotsData } = useQuery({
    queryKey: ['slots', maandStart, maandEind],
    queryFn: async () => {
      const res = await fetch(`/api/slots?van=${maandStart}&tot=${maandEind}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json.data as SlotMetToewijzing[];
    },
  });

  const { data: examensData } = useQuery({
    queryKey: ['examens', 'ingediend'],
    queryFn: async () => {
      const res = await fetch('/api/examens?status=ingediend');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json.data as OngeplandExamen[];
    },
  });

  const toewijzen = useMutation({
    mutationFn: async ({ examenId, slotId }: { examenId: number; slotId: number }) => {
      const res = await fetch('/api/toewijzingen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examenId, slotId }),
      });
      const json = await res.json();
      if (!res.ok) {
        const bericht = json.details?.blokkades?.[0] ?? json.error ?? 'Fout bij toewijzen';
        throw new Error(bericht);
      }
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slots'] });
      queryClient.invalidateQueries({ queryKey: ['examens'] });
      setGeselecteerdExamen(null);
    },
    onError: (err: Error) => alert(err.message),
  });

  const verwijderToewijzing = useMutation({
    mutationFn: async (toewijzingId: number) => {
      const res = await fetch(`/api/toewijzingen/${toewijzingId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Verwijderen mislukt');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slots'] });
      queryClient.invalidateQueries({ queryKey: ['examens'] });
    },
  });

  const slotsByDatum = new Map<string, SlotMetToewijzing[]>();
  for (const slot of slotsData ?? []) {
    const bestaand = slotsByDatum.get(slot.datum) ?? [];
    slotsByDatum.set(slot.datum, [...bestaand, slot]);
  }

  // Maandgrid
  const eersteWeekdag = new Date(jaar, maand, 1).getDay();
  const aantalDagen = dagenInMaand(jaar, maand);
  const cellen: (number | null)[] = [
    ...Array(eersteWeekdag).fill(null),
    ...Array.from({ length: aantalDagen }, (_, i) => i + 1),
  ];
  while (cellen.length % 7 !== 0) cellen.push(null);

  function navigeer(delta: number) {
    const d = new Date(jaar, maand + delta, 1);
    setJaar(d.getFullYear());
    setMaand(d.getMonth());
    setGeselecteerdeDag(null);
  }

  const handleSlotKlik = useCallback(
    (slot: SlotMetToewijzing) => {
      if (slot.geblokkeerd) return;
      if (slot.toewijzing) {
        if (confirm(`Toewijzing van "${slot.toewijzing.examenNaam}" verwijderen?`)) {
          verwijderToewijzing.mutate(slot.toewijzing.id);
        }
        return;
      }
      if (geselecteerdExamen) {
        toewijzen.mutate({ examenId: geselecteerdExamen.id, slotId: slot.id });
      }
    },
    [geselecteerdExamen, toewijzen, verwijderToewijzing],
  );

  const geselecteerdeDagSlots = geselecteerdeDag ? (slotsByDatum.get(geselecteerdeDag) ?? []) : [];
  const ongeplandExamens = examensData ?? [];

  return (
    <div className="flex gap-6">
      {/* Kalender */}
      <div className="flex-1 min-w-0">
        {/* Navigatie */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigeer(-1)} className="p-2 rounded hover:bg-gray-100 text-gray-600 transition-colors">←</button>
          <h2 className="text-lg font-semibold text-gray-900 capitalize">{NL_MAANDEN[maand]} {jaar}</h2>
          <button onClick={() => navigeer(1)} className="p-2 rounded hover:bg-gray-100 text-gray-600 transition-colors">→</button>
        </div>

        {/* Weekdag headers */}
        <div className="grid grid-cols-7 mb-1">
          {NL_DAGEN_KORT.map((d) => (
            <div key={d} className="text-center text-xs font-medium text-gray-500 py-1">{d}</div>
          ))}
        </div>

        {/* Dag-cellen */}
        <div className="grid grid-cols-7 gap-1">
          {cellen.map((dagNr, idx) => {
            if (dagNr === null) return <div key={idx} />;
            const datum = isoDate(new Date(jaar, maand, dagNr));
            const dagSlots = slotsByDatum.get(datum) ?? [];
            const geplandAantal = dagSlots.filter((s) => s.toewijzing).length;
            const beschikbareSlots = dagSlots.filter((s) => !s.geblokkeerd && !isSlotBeperkt(s));
            const isGeselecteerd = geselecteerdeDag === datum;
            const isVandaag = datum === isoDate(vandaag);

            return (
              <button
                key={idx}
                onClick={() => setGeselecteerdeDag((h) => (h === datum ? null : datum))}
                className={`min-h-[80px] p-1.5 text-left rounded-lg border transition-all ${
                  isGeselecteerd ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50'
                }`}
              >
                <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                  isVandaag ? 'bg-blue-600 text-white' : 'text-gray-700'
                }`}>
                  {dagNr}
                </div>
                {geplandAantal > 0 && (
                  <div className="text-xs text-blue-700 bg-blue-100 rounded px-1 py-0.5 mb-0.5">{geplandAantal} gepland</div>
                )}
                {beschikbareSlots.length > 0 && geplandAantal === 0 && (
                  <div className="text-xs text-gray-300">beschikbaar</div>
                )}
                {dagSlots.length > 0 && beschikbareSlots.length === 0 && geplandAantal === 0 && (
                  <div className="text-xs text-red-400">beperkt</div>
                )}
              </button>
            );
          })}
        </div>

        {/* Dag detail */}
        {geselecteerdeDag && (
          <DagDetail
            datum={geselecteerdeDag}
            slots={geselecteerdeDagSlots}
            geselecteerdExamen={geselecteerdExamen}
            onSlotKlik={handleSlotKlik}
          />
        )}
      </div>

      {/* Sidebar ongeplande examens */}
      <div className="w-72 flex-shrink-0">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Ongeplande examens
            {ongeplandExamens.length > 0 && (
              <span className="ml-2 bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded-full">{ongeplandExamens.length}</span>
            )}
          </h3>
          {geselecteerdExamen && (
            <div className="mb-3 text-xs text-blue-700 bg-blue-50 rounded p-2">
              Geselecteerd: <strong>{geselecteerdExamen.naam}</strong>
              <br />Klik op een dag → leeg slot om in te plannen.
              <button onClick={() => setGeselecteerdExamen(null)} className="ml-2 underline">Annuleer</button>
            </div>
          )}
          {ongeplandExamens.length === 0 ? (
            <p className="text-xs text-gray-400">Alle ingediende examens zijn gepland.</p>
          ) : (
            <div className="space-y-2">
              {ongeplandExamens.map((examen) => (
                <button
                  key={examen.id}
                  onClick={() => setGeselecteerdExamen((h) => (h?.id === examen.id ? null : examen))}
                  className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all ${
                    geselecteerdExamen?.id === examen.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium text-gray-900 truncate">{examen.naam}</div>
                  <div className="text-gray-500 mt-0.5">
                    {examen.programma} · {examen.geschatAantal} stud.{examen.isFau && ' · FAU'}
                  </div>
                  {(examen.voorkeurTijdblok || examen.locatieVoorkeur) && (
                    <div className="text-gray-400 mt-0.5">
                      {[examen.voorkeurTijdblok, examen.locatieVoorkeur].filter(Boolean).join(' · ')}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
