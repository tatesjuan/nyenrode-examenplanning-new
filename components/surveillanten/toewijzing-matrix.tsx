'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface SlotRij {
  slotId: number;
  datum: string;
  tijdblok: string;
  startTijd: string;
  eindTijd: string;
  locatieNaam: string;
  campus: string;
  examenNaam: string;
  programma: string;
}

interface Surveillant {
  id: number;
  naam: string;
  kanHs: boolean;
  kanSurv: boolean;
}

interface SurvToewijzing {
  id: number;
  slotId: number;
  surveillantId: number;
  rol: 'Surveillant' | 'Hoofdsurveillant';
}

interface Beschikbaarheid {
  slotId: number;
  surveillantId: number;
  beschikbaar: boolean;
}

interface MatrixData {
  slots: SlotRij[];
  surveillanten: Surveillant[];
  toewijzingen: SurvToewijzing[];
  beschikbaarheid: Beschikbaarheid[];
}

const NL_MAANDEN = [
  'januari','februari','maart','april','mei','juni',
  'juli','augustus','september','oktober','november','december',
];

const NL_MAANDEN_KORT = ['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'];

const TIJDBLOK_LABEL: Record<string, string> = {
  ochtend: 'Och.',
  middag:  'Mid.',
  avond:   'Av.',
};

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function dagenInMaand(jaar: number, maand: number) {
  return new Date(jaar, maand + 1, 0).getDate();
}

function formatDatumKort(iso: string) {
  const [, m, d] = iso.split('-');
  return `${parseInt(d)} ${NL_MAANDEN_KORT[parseInt(m) - 1]}`;
}

export function ToewijzingMatrix() {
  const vandaag = new Date();
  const [jaar, setJaar] = useState(vandaag.getFullYear());
  const [maand, setMaand] = useState(vandaag.getMonth());
  const queryClient = useQueryClient();

  const van = isoDate(new Date(jaar, maand, 1));
  const tot = isoDate(new Date(jaar, maand, dagenInMaand(jaar, maand)));

  const { data, isLoading, error } = useQuery({
    queryKey: ['matrix', van, tot],
    queryFn: async () => {
      const res = await fetch(`/api/beschikbaarheid/matrix?van=${van}&tot=${tot}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json.data as MatrixData;
    },
  });

  const toevoegen = useMutation({
    mutationFn: async ({ slotId, surveillantId, rol }: { slotId: number; surveillantId: number; rol: 'Surveillant' | 'Hoofdsurveillant' }) => {
      const res = await fetch('/api/surv-toewijzingen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotId, surveillantId, rol }),
      });
      if (!res.ok) throw new Error('Toewijzen mislukt');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['matrix'] }),
  });

  const wijzigen = useMutation({
    mutationFn: async ({ id, rol }: { id: number; rol: 'Surveillant' | 'Hoofdsurveillant' }) => {
      const res = await fetch(`/api/surv-toewijzingen/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rol }),
      });
      if (!res.ok) throw new Error('Wijzigen mislukt');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['matrix'] }),
  });

  const verwijderen = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`/api/surv-toewijzingen/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['matrix'] }),
  });

  const handleCelKlik = useCallback(
    (slotId: number, surv: Surveillant) => {
      if (!data) return;
      const toewijzing = data.toewijzingen.find(
        (t) => t.slotId === slotId && t.surveillantId === surv.id,
      );
      const isOnbeschikbaar = data.beschikbaarheid.some(
        (b) => b.slotId === slotId && b.surveillantId === surv.id && !b.beschikbaar,
      );

      if (isOnbeschikbaar) return;

      if (!toewijzing) {
        if (!surv.kanSurv) return;
        toevoegen.mutate({ slotId, surveillantId: surv.id, rol: 'Surveillant' });
      } else if (toewijzing.rol === 'Surveillant') {
        if (surv.kanHs) {
          wijzigen.mutate({ id: toewijzing.id, rol: 'Hoofdsurveillant' });
        } else {
          verwijderen.mutate(toewijzing.id);
        }
      } else {
        verwijderen.mutate(toewijzing.id);
      }
    },
    [data, toevoegen, wijzigen, verwijderen],
  );

  function navigeer(delta: number) {
    const d = new Date(jaar, maand + delta, 1);
    setJaar(d.getFullYear());
    setMaand(d.getMonth());
  }

  const slots = data?.slots ?? [];
  const surveillanten = data?.surveillanten ?? [];

  // Samenvatting per slot
  function telToewijzingen(slotId: number) {
    const toewijzingen = data?.toewijzingen ?? [];
    return {
      hs: toewijzingen.filter((t) => t.slotId === slotId && t.rol === 'Hoofdsurveillant').length,
      surv: toewijzingen.filter((t) => t.slotId === slotId && t.rol === 'Surveillant').length,
    };
  }

  return (
    <div className="space-y-4">
      {/* Maand-navigatie */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigeer(-1)} className="p-2 rounded hover:bg-gray-100 text-gray-600">←</button>
        <h3 className="text-base font-semibold text-gray-900 capitalize w-36 text-center">
          {NL_MAANDEN[maand]} {jaar}
        </h3>
        <button onClick={() => navigeer(1)} className="p-2 rounded hover:bg-gray-100 text-gray-600">→</button>
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-gray-400 text-sm">Laden...</div>
      ) : error ? (
        <div className="text-center py-10 text-red-500 text-sm">Fout bij laden</div>
      ) : slots.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm">
          Geen geplande examens in {NL_MAANDEN[maand]} {jaar}.
        </div>
      ) : (
        <div className="overflow-auto rounded-lg border border-gray-200">
          <table className="text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50">
                {/* Vaste kolom: slot-info */}
                <th className="sticky left-0 z-10 bg-gray-50 px-3 py-2 text-left font-medium text-gray-700 border-r border-gray-200 min-w-[220px]">
                  Tentamen
                </th>
                {surveillanten.map((s) => (
                  <th
                    key={s.id}
                    className="px-2 py-2 text-center font-medium text-gray-700 min-w-[60px] border-l border-gray-100"
                    title={s.naam}
                  >
                    <div className="truncate max-w-[56px]">{s.naam.split(' ')[0]}</div>
                    {s.kanHs && <div className="text-green-600 font-normal">HS</div>}
                  </th>
                ))}
                <th className="px-3 py-2 text-center font-medium text-gray-700 border-l border-gray-200 min-w-[60px]">
                  Bezetting
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {slots.map((slot) => {
                const { hs, surv } = telToewijzingen(slot.slotId);
                return (
                  <tr key={slot.slotId} className="hover:bg-gray-50">
                    <td className="sticky left-0 z-10 bg-white hover:bg-gray-50 px-3 py-2 border-r border-gray-200">
                      <div className="font-medium text-gray-900 truncate max-w-[200px]" title={slot.examenNaam}>
                        {slot.examenNaam}
                      </div>
                      <div className="text-gray-400 mt-0.5">
                        {formatDatumKort(slot.datum)} · {TIJDBLOK_LABEL[slot.tijdblok]} · {slot.locatieNaam}
                      </div>
                    </td>
                    {surveillanten.map((surv) => {
                      const toewijzing = data?.toewijzingen.find(
                        (t) => t.slotId === slot.slotId && t.surveillantId === surv.id,
                      );
                      const isOnbeschikbaar = data?.beschikbaarheid.some(
                        (b) => b.slotId === slot.slotId && b.surveillantId === surv.id && !b.beschikbaar,
                      );
                      const kanKlikken = !isOnbeschikbaar && (surv.kanSurv || surv.kanHs);

                      let celKlasse = 'border border-gray-100 text-center ';
                      let inhoud = '';

                      if (isOnbeschikbaar) {
                        celKlasse += 'bg-gray-50 text-gray-300 cursor-not-allowed';
                        inhoud = '✖';
                      } else if (toewijzing?.rol === 'Hoofdsurveillant') {
                        celKlasse += 'bg-green-50 text-green-700 font-bold cursor-pointer hover:bg-green-100';
                        inhoud = 'H';
                      } else if (toewijzing?.rol === 'Surveillant') {
                        celKlasse += 'bg-blue-50 text-blue-700 cursor-pointer hover:bg-blue-100';
                        inhoud = 'S';
                      } else if (kanKlikken) {
                        celKlasse += 'bg-white text-gray-200 cursor-pointer hover:bg-blue-50 hover:text-blue-400';
                        inhoud = '+';
                      } else {
                        celKlasse += 'bg-gray-50 text-gray-200 cursor-not-allowed';
                        inhoud = '';
                      }

                      return (
                        <td
                          key={surv.id}
                          className={celKlasse}
                          onClick={() => kanKlikken && handleCelKlik(slot.slotId, surv)}
                          title={
                            isOnbeschikbaar
                              ? `${surv.naam}: niet beschikbaar`
                              : toewijzing
                                ? `${surv.naam}: ${toewijzing.rol} — klik om te wijzigen`
                                : `${surv.naam}: klik om toe te wijzen`
                          }
                        >
                          <div className="w-full h-full px-2 py-2">{inhoud}</div>
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-center border-l border-gray-200">
                      <div className={`text-xs font-medium ${hs === 0 ? 'text-red-500' : 'text-green-700'}`}>
                        {hs} HS
                      </div>
                      <div className="text-xs text-gray-500">{surv} S</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {surveillanten.length > 0 && (
        <p className="text-xs text-gray-400">
          Klik op een cel om toe te wijzen · S → H → verwijder · HS = hoofdsurveillant-bevoegd
        </p>
      )}
    </div>
  );
}
