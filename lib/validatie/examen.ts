import { z } from 'zod';

export const examenInvoerSchema = z.object({
  naam: z.string().min(1, 'Naam is verplicht'),
  programma: z.string().min(1, 'Programma is verplicht'),
  afdeling: z.string().optional(),
  examtype: z.enum(['C', 'H', 'C/H', 'H1', 'H2', 'H3']).default('C'),
  isFau: z.boolean().default(false),
  voorkeurDatum: z.string().optional(),
  voorkeurWeek: z.number().int().positive().optional(),
  voorkeurTijdblok: z.enum(['ochtend', 'middag', 'avond']).optional(),
  duurMinuten: z.number().int().positive().default(210),
  geschatAantal: z.number().int().min(0).default(0),
  locatieVoorkeur: z.enum(['Breukelen', 'Amsterdam']).optional(),
  format: z.string().optional(),
  bijlageVereist: z.boolean().default(false),
  nieuweStudenten: z.boolean().default(false),
  contactpersoon: z.string().optional(),
  budgetnummer: z.string().optional(),
  opmerkingen: z.string().optional(),
  status: z.enum(['concept', 'ingediend', 'gepland', 'bevestigd']).default('concept'),
  ingediendDoor: z.string().optional(),
});

export const examenUpdateSchema = examenInvoerSchema.partial();

export type ExamenInvoer = z.infer<typeof examenInvoerSchema>;
export type ExamenUpdate = z.infer<typeof examenUpdateSchema>;
