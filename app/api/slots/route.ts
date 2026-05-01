import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { slots, locaties, toewijzingen, examens } from '@/lib/db/schema';
import { and, gte, lte, eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/helpers';
import { z } from 'zod';

const slotsQuerySchema = z.object({
  van: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Datum moet ISO-formaat zijn (YYYY-MM-DD)'),
  tot: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Datum moet ISO-formaat zijn (YYYY-MM-DD)'),
  locatieId: z.coerce.number().int().positive().optional(),
});

export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const query = slotsQuerySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams),
  );
  if (!query.success) {
    return NextResponse.json(
      { error: 'Ongeldige query-parameters', details: query.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { van, tot, locatieId } = query.data;

  const conditions = [gte(slots.datum, van), lte(slots.datum, tot)];
  if (locatieId) conditions.push(eq(slots.locatieId, locatieId));

  const alleSlots = await db
    .select({
      id: slots.id,
      datum: slots.datum,
      tijdblok: slots.tijdblok,
      startTijd: slots.startTijd,
      eindTijd: slots.eindTijd,
      locatieId: slots.locatieId,
      locatieNaam: locaties.naam,
      campus: locaties.campus,
      capaciteit: locaties.capaciteit,
      geblokkeerd: slots.geblokkeerd,
      blokReden: slots.blokReden,
    })
    .from(slots)
    .innerJoin(locaties, eq(slots.locatieId, locaties.id))
    .where(and(...conditions))
    .orderBy(slots.datum, slots.tijdblok, locaties.voorkeurVolgorde);

  // Haal toewijzingen op voor deze periode
  const alleToewijzingen = await db
    .select({
      id: toewijzingen.id,
      slotId: toewijzingen.slotId,
      halveZaal: toewijzingen.halveZaal,
      overrideReden: toewijzingen.overrideReden,
      examenId: examens.id,
      examenNaam: examens.naam,
      examenProgramma: examens.programma,
      geschatAantal: examens.geschatAantal,
      examStatus: examens.status,
    })
    .from(toewijzingen)
    .innerJoin(examens, eq(toewijzingen.examenId, examens.id))
    .innerJoin(slots, eq(toewijzingen.slotId, slots.id))
    .where(and(gte(slots.datum, van), lte(slots.datum, tot)));

  const toewijzingPerSlot = new Map(alleToewijzingen.map((t) => [t.slotId, t]));

  const data = alleSlots.map((slot) => ({
    ...slot,
    toewijzing: toewijzingPerSlot.get(slot.id) ?? null,
  }));

  return NextResponse.json({ data, meta: { total: data.length } });
}
