export interface SlotMetToewijzing {
  id: number;
  datum: string;
  tijdblok: string;
  startTijd: string;
  eindTijd: string;
  locatieId: number;
  locatieNaam: string;
  campus: string;
  capaciteit: number;
  geblokkeerd: boolean;
  blokReden: string | null;
  toewijzing: {
    id: number;
    slotId: number;
    examenId: number;
    examenNaam: string;
    examenProgramma: string;
    geschatAantal: number;
    halveZaal: boolean;
  } | null;
}

export interface OngeplandExamen {
  id: number;
  naam: string;
  programma: string;
  geschatAantal: number;
  voorkeurTijdblok?: string | null;
  locatieVoorkeur?: string | null;
  isFau: boolean;
}
