export type Status = 'concept' | 'ingediend' | 'gepland' | 'bevestigd';
export type Tijdblok = 'ochtend' | 'middag' | 'avond';
export type Campus = 'Breukelen' | 'Amsterdam';
export type Rol = 'planner' | 'hoofd_operations' | 'programmacoördinator' | 'surveillant' | 'examencommissie';
export type ExamType = 'C' | 'H' | 'C/H' | 'H1' | 'H2' | 'H3';
export type SurveillantRol = 'Surveillant' | 'Hoofdsurveillant';

export interface Examen {
  id: number;
  naam: string;
  programma: string;
  afdeling?: string;
  examtype: ExamType;
  isFau: boolean;
  voorkeurDatum?: string;
  voorkeurWeek?: number;
  voorkeurTijdblok?: Tijdblok;
  duurMinuten: number;
  geschatAantal: number;
  locatieVoorkeur?: Campus;
  format?: string;
  bijlageVereist: boolean;
  nieuweStudenten: boolean;
  contactpersoon?: string;
  budgetnummer?: string;
  opmerkingen?: string;
  status: Status;
  ingediendDoor?: string;
  aangemaaktOp: Date;
}

export interface Locatie {
  id: number;
  naam: string;
  campus: Campus;
  capaciteit: number;
  isPrimair: boolean;
  voorkeurVolgorde: number;
}

export interface Slot {
  id: number;
  datum: string;
  tijdblok: Tijdblok;
  startTijd: string;
  eindTijd: string;
  locatieId: number;
  geblokkeerd: boolean;
  blokReden?: string;
}

export interface Toewijzing {
  id: number;
  examenId: number;
  slotId: number;
  halveZaal: boolean;
  aangemeldDoor: string;
  aangemeldOp: Date;
  overrideReden?: string;
}

export interface Surveillant {
  id: number;
  naam: string;
  email: string;
  kanHs: boolean;
  kanSurv: boolean;
  actief: boolean;
}

export interface Gebruiker {
  id: number;
  naam: string;
  email: string;
  pincodeHash: string;
  rol: Rol;
  surveillantId?: number;
  actief: boolean;
}

export interface AcademischeKalender {
  id: number;
  programma: string;
  startDatum: string;
  eindDatum: string;
  omschrijving?: string;
}

export interface Beschikbaarheid {
  id: number;
  surveillantId: number;
  slotId: number;
  beschikbaar: boolean;
}

export interface SurvToewijzing {
  id: number;
  surveillantId: number;
  slotId: number;
  rol: SurveillantRol;
}

export const TIJDBLOK_TIJDEN: Record<Tijdblok, { start: string; eind: string }> = {
  ochtend: { start: '09:30', eind: '13:00' },
  middag: { start: '14:00', eind: '17:30' },
  avond: { start: '19:00', eind: '22:30' },
};
