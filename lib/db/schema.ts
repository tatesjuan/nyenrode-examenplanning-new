import { sqliteTable, integer, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

const tijdstempel = {
  aangemaaktOp: text('aangemaakt_op').notNull().default(sql`(datetime('now'))`),
  bijgewerktOp: text('bijgewerkt_op').notNull().default(sql`(datetime('now'))`),
};

export const locaties = sqliteTable('locaties', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  naam: text('naam').notNull(),
  campus: text('campus', { enum: ['Breukelen', 'Amsterdam'] }).notNull(),
  capaciteit: integer('capaciteit').notNull(),
  isPrimair: integer('is_primair', { mode: 'boolean' }).notNull().default(false),
  voorkeurVolgorde: integer('voorkeur_volgorde').notNull().default(0),
  ...tijdstempel,
});

export const examens = sqliteTable('examens', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  naam: text('naam').notNull(),
  programma: text('programma').notNull(),
  afdeling: text('afdeling'),
  examtype: text('examtype', { enum: ['C', 'H', 'C/H', 'H1', 'H2', 'H3'] }).notNull().default('C'),
  isFau: integer('is_fau', { mode: 'boolean' }).notNull().default(false),
  voorkeurDatum: text('voorkeur_datum'),
  voorkeurWeek: integer('voorkeur_week'),
  voorkeurTijdblok: text('voorkeur_tijdblok', { enum: ['ochtend', 'middag', 'avond'] }),
  duurMinuten: integer('duur_minuten').notNull().default(210),
  geschatAantal: integer('geschat_aantal').notNull().default(0),
  locatieVoorkeur: text('locatie_voorkeur', { enum: ['Breukelen', 'Amsterdam'] }),
  format: text('format'),
  bijlageVereist: integer('bijlage_vereist', { mode: 'boolean' }).notNull().default(false),
  nieuweStudenten: integer('nieuwe_studenten', { mode: 'boolean' }).notNull().default(false),
  contactpersoon: text('contactpersoon'),
  budgetnummer: text('budgetnummer'),
  opmerkingen: text('opmerkingen'),
  status: text('status', { enum: ['concept', 'ingediend', 'gepland', 'bevestigd'] }).notNull().default('concept'),
  ingediendDoor: text('ingediend_door'),
  ...tijdstempel,
});

export const slots = sqliteTable('slots', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  datum: text('datum').notNull(),
  tijdblok: text('tijdblok', { enum: ['ochtend', 'middag', 'avond'] }).notNull(),
  startTijd: text('start_tijd').notNull(),
  eindTijd: text('eind_tijd').notNull(),
  locatieId: integer('locatie_id').notNull().references(() => locaties.id),
  geblokkeerd: integer('geblokkeerd', { mode: 'boolean' }).notNull().default(false),
  blokReden: text('blok_reden'),
  ...tijdstempel,
}, (table) => ({
  uniekSlot: uniqueIndex('slots_datum_tijdblok_locatie_uniek').on(table.datum, table.tijdblok, table.locatieId),
}));

export const toewijzingen = sqliteTable('toewijzingen', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  examenId: integer('examen_id').notNull().references(() => examens.id),
  slotId: integer('slot_id').notNull().references(() => slots.id),
  halveZaal: integer('halve_zaal', { mode: 'boolean' }).notNull().default(false),
  aangemeldDoor: text('aangemeld_door').notNull(),
  overrideReden: text('override_reden'),
  ...tijdstempel,
});

export const surveillanten = sqliteTable('surveillanten', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  naam: text('naam').notNull(),
  email: text('email').notNull().unique(),
  kanHs: integer('kan_hs', { mode: 'boolean' }).notNull().default(false),
  kanSurv: integer('kan_surv', { mode: 'boolean' }).notNull().default(true),
  actief: integer('actief', { mode: 'boolean' }).notNull().default(true),
  ...tijdstempel,
});

export const gebruikers = sqliteTable('gebruikers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  naam: text('naam').notNull(),
  email: text('email').notNull().unique(),
  pincodeHash: text('pincode_hash').notNull(),
  rol: text('rol', {
    enum: ['planner', 'hoofd_operations', 'programmacoördinator', 'surveillant', 'examencommissie'],
  }).notNull(),
  surveillantId: integer('surveillant_id').references(() => surveillanten.id),
  actief: integer('actief', { mode: 'boolean' }).notNull().default(true),
  ...tijdstempel,
});

export const beschikbaarheid = sqliteTable('beschikbaarheid', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  surveillantId: integer('surveillant_id').notNull().references(() => surveillanten.id),
  slotId: integer('slot_id').notNull().references(() => slots.id),
  beschikbaar: integer('beschikbaar', { mode: 'boolean' }).notNull().default(true),
  ...tijdstempel,
});

export const survToewijzingen = sqliteTable('surv_toewijzingen', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  surveillantId: integer('surveillant_id').notNull().references(() => surveillanten.id),
  slotId: integer('slot_id').notNull().references(() => slots.id),
  rol: text('rol', { enum: ['Surveillant', 'Hoofdsurveillant'] }).notNull(),
  ...tijdstempel,
});

export const academischeKalender = sqliteTable('academische_kalender', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  programma: text('programma').notNull(),
  startDatum: text('start_datum').notNull(),
  eindDatum: text('eind_datum').notNull(),
  omschrijving: text('omschrijving'),
  ...tijdstempel,
});
