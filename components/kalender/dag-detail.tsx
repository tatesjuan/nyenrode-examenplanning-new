'use client';

import type { SlotMetToewijzing, OngeplandExamen } from '@/types/kalender';

const TIJDBLOK_VOLGORDE = ['ochtend', 'middag', 'avond'];

function isOchtendBeperkt(slot: SlotMetToewijzing): boolean {
  if (slot.campus !== 'Breukelen' || slot.tijdblok !== 'ochtend') return false;
  const [jaar, maand, dag] = slot.datum.split('-').map(Number);
  const dagVanWeek = new Date(jaar, maand - 1, dag).getDay();
  return dagVanWeek === 1 || dagVanWeek === 2 || dagVanWeek === 5; // ma, di, vr
}
const TIJDBLOK_LABEL: Record<string, string> = {
  ochtend: 'Ochtend (09:30–13:00)',
  middag: 'Middag (14:00–17:30)',
  avond: 'Avond (19:00–22:30)',
};

const NL_MAANDEN_KORT = ['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'];

interface DagDetailProps {
  datum: string;
  slots: SlotMetToewijzing[];
  geselecteerdExamen: OngeplandExamen | null;
  onSlotKlik: (slot: SlotMetToewijzing) => void;
}

export function DagDetail({ datum, slots, geselecteerdExamen, onSlotKlik }: DagDetailProps) {
  const [jaarStr, maandStr, dagStr] = datum.split('-');
  const datumLabel = `${parseInt(dagStr)} ${NL_MAANDEN_KORT[parseInt(maandStr) - 1]} ${jaarStr}`;

  const slotsByTijdblok = TIJDBLOK_VOLGORDE.reduce<Record<string, SlotMetToewijzing[]>>(
    (acc, blok) => ({ ...acc, [blok]: slots.filter((s) => s.tijdblok === blok) }),
    {},
  );

  return (
    <div className="mt-4 bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">{datumLabel}</h3>
      {geselecteerdExamen && (
        <div className="mb-3 text-xs text-blue-700 bg-blue-50 rounded p-2">
          Klik op een leeg slot om <strong>{geselecteerdExamen.naam}</strong> in te plannen.
        </div>
      )}
      <div className="space-y-4">
        {TIJDBLOK_VOLGORDE.map((blok) => {
          const blokSlots = slotsByTijdblok[blok] ?? [];
          if (blokSlots.length === 0) return null;
          return (
            <div key={blok}>
              <div className="text-xs font-medium text-gray-500 mb-2">{TIJDBLOK_LABEL[blok]}</div>
              <div className="grid grid-cols-2 gap-2">
                {blokSlots.map((slot) => {
                  const heeftToewijzing = !!slot.toewijzing;
                  const beperkt = !slot.geblokkeerd && isOchtendBeperkt(slot);
                  const kanKlikken = !slot.geblokkeerd && !beperkt && (heeftToewijzing || !!geselecteerdExamen);

                  return (
                    <button
                      key={slot.id}
                      onClick={() => kanKlikken && onSlotKlik(slot)}
                      disabled={!kanKlikken}
                      className={`text-left p-2.5 rounded-lg border text-xs transition-all ${
                        slot.geblokkeerd
                          ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                          : beperkt
                            ? 'border-red-200 bg-red-50 cursor-not-allowed'
                            : heeftToewijzing
                              ? 'border-amber-300 bg-amber-50 hover:bg-amber-100 cursor-pointer'
                              : geselecteerdExamen
                                ? 'border-blue-300 bg-blue-50 hover:bg-blue-100 cursor-pointer'
                                : 'border-gray-200 bg-white cursor-default'
                      }`}
                    >
                      <div className="font-medium text-gray-700">{slot.locatieNaam}</div>
                      <div className="text-gray-400 mt-0.5">{slot.capaciteit} plaatsen</div>
                      {slot.geblokkeerd && (
                        <div className="mt-1 text-gray-400 italic">{slot.blokReden ?? 'Geblokkeerd'}</div>
                      )}
                      {beperkt && (
                        <div className="mt-1 text-red-500 font-medium">
                          ✕ Niet beschikbaar
                          <div className="text-red-400 font-normal mt-0.5">Ochtendblok ma/di/vr buiten examenperiode</div>
                        </div>
                      )}
                      {heeftToewijzing && slot.toewijzing && (
                        <div className="mt-1 text-amber-800">
                          <div className="font-medium truncate">{slot.toewijzing.examenNaam}</div>
                          <div className="text-amber-600">
                            {slot.toewijzing.examenProgramma} · {slot.toewijzing.geschatAantal} stud.
                            {slot.toewijzing.halveZaal && ' · halve zaal'}
                          </div>
                        </div>
                      )}
                      {!heeftToewijzing && !slot.geblokkeerd && !beperkt && (
                        <div className="mt-1 text-gray-300 italic">
                          {geselecteerdExamen ? 'Klik om in te plannen' : 'Leeg'}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        {slots.length === 0 && (
          <p className="text-sm text-gray-400">Geen slots voor deze dag.</p>
        )}
      </div>
    </div>
  );
}
