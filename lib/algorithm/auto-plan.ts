import type { Examen, Slot, Locatie, Toewijzing } from '@/types/domain';
import { checkAlleConstraints } from '@/lib/constraints';

export interface PlanResultaat {
  gepland: { examen: Examen; slot: Slot; locatie: Locatie }[];
  nietGepland: { examen: Examen; reden: string }[];
}

export async function autoPlan(
  examens: Examen[],
  beschikbareSlots: Slot[],
  locaties: Locatie[],
  bestaandeToewijzingen: Toewijzing[],
): Promise<PlanResultaat> {
  const gepland: PlanResultaat['gepland'] = [];
  const nietGepland: PlanResultaat['nietGepland'] = [];

  // FAU-examens eerst, dan op geschatAantal DESC
  const gesorteerd = [...examens].sort((a, b) => {
    if (a.isFau !== b.isFau) return a.isFau ? -1 : 1;
    return b.geschatAantal - a.geschatAantal;
  });

  const geplandeSlotIds = new Set(bestaandeToewijzingen.map((t) => t.slotId));
  const locatiesMap = new Map(locaties.map((l) => [l.id, l]));

  for (const examen of gesorteerd) {
    // Stel voorkeurs-volgorde voor slots op
    const gesorteerdeSlots = sorteerSlots(beschikbareSlots, examen, locaties);
    let ingepland = false;

    for (const slot of gesorteerdeSlots) {
      if (geplandeSlotIds.has(slot.id) || slot.geblokkeerd) continue;

      const locatie = locatiesMap.get(slot.locatieId);
      if (!locatie) continue;

      const andereExamensInSlot = gepland
        .filter((g) => g.slot.id === slot.id)
        .map((g) => g.examen);

      const andereExamensOpDag = gepland
        .filter((g) => g.slot.datum === slot.datum)
        .map((g) => ({ slot: g.slot, examen: g.examen, locatie: g.locatie }));

      const result = await checkAlleConstraints(
        examen,
        slot,
        locatie,
        andereExamensInSlot,
        andereExamensOpDag,
        false,
      );

      if (result.ok) {
        gepland.push({ examen, slot, locatie });
        geplandeSlotIds.add(slot.id);
        ingepland = true;
        break;
      }
    }

    if (!ingepland) {
      nietGepland.push({ examen, reden: 'Geen geschikt slot gevonden.' });
    }
  }

  return { gepland, nietGepland };
}

function sorteerSlots(slots: Slot[], examen: Examen, locaties: Locatie[]): Slot[] {
  return [...slots].sort((a, b) => {
    const locA = locaties.find((l) => l.id === a.locatieId);
    const locB = locaties.find((l) => l.id === b.locatieId);

    // Voorkeur tijdblok
    if (examen.voorkeurTijdblok) {
      const aMatch = a.tijdblok === examen.voorkeurTijdblok ? 0 : 1;
      const bMatch = b.tijdblok === examen.voorkeurTijdblok ? 0 : 1;
      if (aMatch !== bMatch) return aMatch - bMatch;
    }

    // Voorkeur campus
    if (examen.locatieVoorkeur) {
      const aMatch = locA?.campus === examen.locatieVoorkeur ? 0 : 1;
      const bMatch = locB?.campus === examen.locatieVoorkeur ? 0 : 1;
      if (aMatch !== bMatch) return aMatch - bMatch;
    }

    // Fallback: middag → avond → ochtend, Breukelen heel eerst
    const tijdblokVolgorde = { middag: 0, avond: 1, ochtend: 2 };
    const tijdVerschil =
      tijdblokVolgorde[a.tijdblok] - tijdblokVolgorde[b.tijdblok];
    if (tijdVerschil !== 0) return tijdVerschil;

    // Primaire locatie eerst
    const aIsPrimair = locA?.isPrimair ? 0 : 1;
    const bIsPrimair = locB?.isPrimair ? 0 : 1;
    return aIsPrimair - bIsPrimair;
  });
}
