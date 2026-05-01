import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { slots, locaties, toewijzingen, examens, surveillanten, survToewijzingen, beschikbaarheid } from '@/lib/db/schema';
import { eq, and, gte, lte, inArray } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/helpers';
import { z } from 'zod';

const querySchema = z.object({
  van: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Gebruik YYYY-MM-DD'),
  tot: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Gebruik YYYY-MM-DD'),
});

export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const query = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!query.success) {
    return NextResponse.json({ error: 'Geef van en tot mee (YYYY-MM-DD)' }, { status: 400 });
  }

  const { van, tot } = query.data;

  // Alleen slots mét een exam-toewijzing
  const slotRijen = await db
    .select({
      slotId: slots.id,
      datum: slots.datum,
      tijdblok: slots.tijdblok,
      startTijd: slots.startTijd,
      eindTijd: slots.eindTijd,
      locatieNaam: locaties.naam,
      campus: locaties.campus,
      examenNaam: examens.naam,
      programma: examens.programma,
    })
    .from(toewijzingen)
    .innerJoin(slots, eq(toewijzingen.slotId, slots.id))
    .innerJoin(locaties, eq(slots.locatieId, locaties.id))
    .innerJoin(examens, eq(toewijzingen.examenId, examens.id))
    .where(and(gte(slots.datum, van), lte(slots.datum, tot)))
    .orderBy(slots.datum, slots.tijdblok);

  const slotIds = slotRijen.map((s) => s.slotId);

  const [alleSurveillanten, survAssignments, beschikbaarheidData] = await Promise.all([
    db.select().from(surveillanten).where(eq(surveillanten.actief, true)).orderBy(surveillanten.naam),
    slotIds.length > 0
      ? db.select().from(survToewijzingen).where(inArray(survToewijzingen.slotId, slotIds))
      : Promise.resolve([]),
    slotIds.length > 0
      ? db.select().from(beschikbaarheid).where(inArray(beschikbaarheid.slotId, slotIds))
      : Promise.resolve([]),
  ]);

  return NextResponse.json({
    data: {
      slots: slotRijen,
      surveillanten: alleSurveillanten,
      toewijzingen: survAssignments,
      beschikbaarheid: beschikbaarheidData,
    },
  });
}
