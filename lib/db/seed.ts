import { db } from './index';
import {
  locaties,
  surveillanten,
  gebruikers,
  academischeKalender,
  slots,
  examens,
} from './schema';
import bcrypt from 'bcryptjs';

const TIJDBLOKKEN = [
  { tijdblok: 'ochtend' as const, startTijd: '09:30', eindTijd: '13:00' },
  { tijdblok: 'middag' as const, startTijd: '14:00', eindTijd: '17:30' },
  { tijdblok: 'avond' as const, startTijd: '19:00', eindTijd: '22:30' },
];

function isoDate(datum: Date): string {
  return datum.toISOString().slice(0, 10);
}

function* weekdagen(van: Date, tot: Date): Generator<Date> {
  const dag = new Date(van);
  while (dag <= tot) {
    const d = dag.getDay();
    if (d >= 1 && d <= 5) yield new Date(dag);
    dag.setDate(dag.getDate() + 1);
  }
}

async function genereerSlots(allLocatieIds: number[]) {
  const van = new Date('2026-05-01');
  const tot = new Date('2027-06-30');
  const batch: typeof slots.$inferInsert[] = [];

  for (const dag of weekdagen(van, tot)) {
    for (const locatieId of allLocatieIds) {
      for (const { tijdblok, startTijd, eindTijd } of TIJDBLOKKEN) {
        batch.push({ datum: isoDate(dag), tijdblok, startTijd, eindTijd, locatieId });
        if (batch.length >= 200) {
          await db.insert(slots).values(batch).onConflictDoNothing();
          batch.length = 0;
        }
      }
    }
  }
  if (batch.length > 0) {
    await db.insert(slots).values(batch).onConflictDoNothing();
  }
}

async function seed() {
  console.log('Seeding database...');

  // Locaties
  const ingevoegdeLocaties = await db
    .insert(locaties)
    .values([
      { naam: 'Sporthal Breukelen', campus: 'Breukelen', capaciteit: 350, isPrimair: true, voorkeurVolgorde: 1 },
      { naam: 'DR02/03', campus: 'Breukelen', capaciteit: 30, isPrimair: false, voorkeurVolgorde: 2 },
      { naam: 'Collegezaal J', campus: 'Breukelen', capaciteit: 30, isPrimair: false, voorkeurVolgorde: 3 },
      { naam: '1.06/1.07 Amsterdam', campus: 'Amsterdam', capaciteit: 85, isPrimair: false, voorkeurVolgorde: 4 },
    ])
    .onConflictDoNothing()
    .returning({ id: locaties.id });

  const locatieIds = ingevoegdeLocaties.map((l) => l.id);

  // Surveillanten
  await db
    .insert(surveillanten)
    .values([
      { naam: 'Anouk van der Berg', email: 'a.vanderberg@nyenrode.nl', kanHs: true, kanSurv: true },
      { naam: 'Bas Janssen', email: 'b.janssen@nyenrode.nl', kanHs: true, kanSurv: true },
      { naam: 'Carla de Wit', email: 'c.dewit@nyenrode.nl', kanHs: false, kanSurv: true },
      { naam: 'David Smit', email: 'd.smit@nyenrode.nl', kanHs: false, kanSurv: true },
      { naam: 'Eva Peters', email: 'e.peters@nyenrode.nl', kanHs: true, kanSurv: true },
      { naam: 'Frank Visser', email: 'f.visser@nyenrode.nl', kanHs: false, kanSurv: true },
      { naam: 'Greta Bakker', email: 'g.bakker@nyenrode.nl', kanHs: false, kanSurv: true },
      { naam: 'Hans Mulder', email: 'h.mulder@nyenrode.nl', kanHs: true, kanSurv: true },
      { naam: 'Iris Koster', email: 'i.koster@nyenrode.nl', kanHs: false, kanSurv: true },
      { naam: 'Jan de Boer', email: 'j.deboer@nyenrode.nl', kanHs: false, kanSurv: true },
      { naam: 'Karen van Dijk', email: 'k.vandijk@nyenrode.nl', kanHs: true, kanSurv: true },
    ])
    .onConflictDoNothing();

  // Gebruikers (pin: 1234 voor dev)
  const pinHash = await bcrypt.hash('1234', 12);
  await db
    .insert(gebruikers)
    .values([
      { naam: 'Juan Tates', email: 'juantates@gmail.com', pincodeHash: pinHash, rol: 'hoofd_operations' },
      { naam: 'Planner Demo', email: 'planner@nyenrode.nl', pincodeHash: pinHash, rol: 'planner' },
      { naam: 'Coordinator Demo', email: 'coordinator@nyenrode.nl', pincodeHash: pinHash, rol: 'programmacoördinator' },
    ])
    .onConflictDoNothing();

  // Academische kalender 2026–2027
  await db
    .insert(academischeKalender)
    .values([
      { programma: 'BScBA', startDatum: '2026-10-19', eindDatum: '2026-10-23', omschrijving: 'Examenweek BScBA okt' },
      { programma: 'BScBA', startDatum: '2026-12-14', eindDatum: '2026-12-18', omschrijving: 'Examenweek BScBA dec' },
      { programma: 'BScBA', startDatum: '2027-01-25', eindDatum: '2027-01-29', omschrijving: 'Examenweek BScBA jan' },
      { programma: 'BScBA', startDatum: '2027-03-22', eindDatum: '2027-03-26', omschrijving: 'Examenweek BScBA mrt' },
      { programma: 'BScBA', startDatum: '2027-05-17', eindDatum: '2027-05-21', omschrijving: 'Examenweek BScBA mei' },
      { programma: 'FTMScM', startDatum: '2026-10-05', eindDatum: '2026-10-09', omschrijving: 'Examenweek FTMScM okt' },
      { programma: 'FTMScM', startDatum: '2026-12-14', eindDatum: '2026-12-18', omschrijving: 'Examenweek FTMScM dec' },
      { programma: 'FTMScM', startDatum: '2027-02-22', eindDatum: '2027-02-26', omschrijving: 'Examenweek FTMScM feb' },
      { programma: 'FTMScM', startDatum: '2027-05-10', eindDatum: '2027-05-14', omschrijving: 'Examenweek FTMScM mei' },
      { programma: 'PT MScM', startDatum: '2026-10-05', eindDatum: '2026-10-09', omschrijving: 'Examenweek PT MScM okt' },
      { programma: 'PT MScM', startDatum: '2026-12-07', eindDatum: '2026-12-11', omschrijving: 'Examenweek PT MScM dec' },
    ])
    .onConflictDoNothing();

  // Slots genereren (mei 2026 – juni 2027)
  if (locatieIds.length > 0) {
    console.log('Slots genereren...');
    await genereerSlots(locatieIds);
  } else {
    // Locaties bestonden al, haal IDs op
    const bestaandeLocaties = await db.select({ id: locaties.id }).from(locaties);
    await genereerSlots(bestaandeLocaties.map((l) => l.id));
  }

  // Voorbeeldexamens
  await db
    .insert(examens)
    .values([
      {
        naam: 'Financial Accounting',
        programma: 'BScBA',
        examtype: 'C',
        isFau: false,
        geschatAantal: 120,
        duurMinuten: 210,
        voorkeurTijdblok: 'middag',
        locatieVoorkeur: 'Breukelen',
        status: 'ingediend',
        contactpersoon: 'Dr. H. Bakker',
        budgetnummer: 'BSC-001',
      },
      {
        naam: 'Landelijk Accountancy Tentamen (FAU)',
        programma: 'FTMScM',
        examtype: 'H',
        isFau: true,
        geschatAantal: 180,
        duurMinuten: 210,
        voorkeurTijdblok: 'ochtend',
        locatieVoorkeur: 'Breukelen',
        status: 'ingediend',
        contactpersoon: 'Prof. R. de Jong',
        budgetnummer: 'FTM-FAU-01',
      },
      {
        naam: 'Business Strategy',
        programma: 'BScBA',
        examtype: 'C',
        isFau: false,
        geschatAantal: 85,
        duurMinuten: 210,
        status: 'concept',
        contactpersoon: 'Dr. A. van Leeuwen',
      },
      {
        naam: 'Corporate Finance',
        programma: 'PT MScM',
        examtype: 'C/H',
        isFau: false,
        geschatAantal: 45,
        duurMinuten: 180,
        voorkeurTijdblok: 'avond',
        locatieVoorkeur: 'Amsterdam',
        status: 'ingediend',
        contactpersoon: 'Dr. M. Smeets',
      },
      {
        naam: 'Organizational Behavior',
        programma: 'BScBA',
        examtype: 'C',
        isFau: false,
        geschatAantal: 200,
        duurMinuten: 210,
        voorkeurTijdblok: 'middag',
        locatieVoorkeur: 'Breukelen',
        status: 'concept',
        nieuweStudenten: true,
      },
      {
        naam: 'Management Accounting',
        programma: 'FTMScM',
        examtype: 'H',
        isFau: false,
        geschatAantal: 60,
        duurMinuten: 210,
        status: 'ingediend',
        contactpersoon: 'Prof. B. Jansen',
        budgetnummer: 'FTM-003',
      },
    ])
    .onConflictDoNothing();

  console.log('Seed voltooid.');
}

seed().catch((err) => {
  console.error('Seed mislukt:', err);
  process.exit(1);
});
