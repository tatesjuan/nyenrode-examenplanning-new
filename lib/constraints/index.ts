import type { Examen, Slot, Locatie } from '@/types/domain';
import type { ConstraintResult } from './types';
import { db } from '@/lib/db';
import { academischeKalender } from '@/lib/db/schema';
import { and, lte, gte } from 'drizzle-orm';

const SPORTHAL_NAAM = 'Sporthal Breukelen';

export async function isExamenweek(datum: string, programma: string): Promise<boolean> {
  const rijen = await db
    .select()
    .from(academischeKalender)
    .where(
      and(
        lte(academischeKalender.startDatum, datum),
        gte(academischeKalender.eindDatum, datum),
      ),
    );
  return rijen.some((r) => r.programma === programma || r.programma === '*');
}

export async function checkAlleConstraints(
  examen: Examen,
  slot: Slot,
  locatie: Locatie,
  andereExamensInSlot: Examen[],
  andereExamensOpDag: { slot: Slot; examen: Examen; locatie: Locatie }[],
  override: boolean,
): Promise<ConstraintResult> {
  const blokkades: string[] = [];
  const waarschuwingen: string[] = [];
  let halvezaalSuggestie = false;

  // 1. Capaciteitsconstraint
  if (examen.geschatAantal > locatie.capaciteit) {
    blokkades.push(
      `Te veel studenten (${examen.geschatAantal}) voor ${locatie.naam} (max ${locatie.capaciteit}).`,
    );
  } else if (examen.geschatAantal > locatie.capaciteit * 0.9) {
    waarschuwingen.push(
      `Bijna vol: ${examen.geschatAantal} studenten in ${locatie.naam} (max ${locatie.capaciteit}).`,
    );
  }

  if (locatie.naam === SPORTHAL_NAAM && examen.geschatAantal <= locatie.capaciteit / 2) {
    halvezaalSuggestie = true;
  }

  // 2. FAU-isolatieconstraint
  if (examen.isFau) {
    if (slot.tijdblok !== 'ochtend') {
      blokkades.push('FAU-examen moet in het ochtendblok gepland worden.');
    }
    if (andereExamensInSlot.length > 0) {
      blokkades.push('FAU-examen vereist een leeg slot — geen andere examens in dit blok.');
    }
    const breukelenZelfdedag = andereExamensOpDag.filter(
      ({ locatie: l }) => l.campus === 'Breukelen',
    );
    if (breukelenZelfdedag.length > 0) {
      blokkades.push(
        'FAU-examen blokkeert alle andere Breukelen-slots op deze dag — er zijn al andere examens gepland.',
      );
    }
  }

  // 3. Ochtendblok-restrictie (Breukelen)
  if (locatie.campus === 'Breukelen' && slot.tijdblok === 'ochtend') {
    const dag = new Date(slot.datum).getDay(); // 0=zo, 1=ma, 2=di, 5=vr
    const isBeperkteDag = dag === 1 || dag === 2 || dag === 5;

    if (isBeperkteDag) {
      const inExamenweek = await isExamenweek(slot.datum, examen.programma);
      if (!inExamenweek) {
        blokkades.push(
          'Ochtendblok op maandag/dinsdag/vrijdag is niet beschikbaar in Breukelen buiten examenperioden.',
        );
      }
    }
  }

  // 4. HS-ratio-waarschuwing
  const aantalInSlot = andereExamensInSlot.length + 1;
  const hsBenodigd = Math.ceil(aantalInSlot / 2);
  if (hsBenodigd > 3) {
    waarschuwingen.push(
      `Hoog aantal examens in dit slot (${aantalInSlot}): ${hsBenodigd} hoofdsurveillanten nodig.`,
    );
  }

  // 5. Splitsingsconstraint — één locatie per examen
  const gesplitst = andereExamensOpDag.some(
    ({ examen: e, locatie: l }) => e.id === examen.id && l.id !== locatie.id,
  );
  if (gesplitst) {
    blokkades.push('Examen mag niet over meerdere locaties worden gesplitst.');
  }

  // Bij override: waarschuwingen worden genegeerd, blokkades blijven blokkades
  return {
    ok: blokkades.length === 0,
    blokkades,
    waarschuwingen: override ? [] : waarschuwingen,
    halvezaalSuggestie,
  };
}
