import { z } from 'zod';

export const toewijzingInvoerSchema = z.object({
  examenId: z.number().int().positive(),
  slotId: z.number().int().positive(),
  halveZaal: z.boolean().default(false),
  override: z.boolean().default(false),
  overrideReden: z.string().optional(),
}).refine(
  (data) => !data.override || (data.overrideReden && data.overrideReden.trim().length > 0),
  { message: 'Override vereist een reden', path: ['overrideReden'] },
);

export type ToewijzingInvoer = z.infer<typeof toewijzingInvoerSchema>;
