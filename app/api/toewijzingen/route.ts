import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { examens, slots, locaties, toewijzingen } from '@/lib/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { toewijzingInvoerSchema } from '@/lib/validatie/toewijzing';
import { requireSchrijven, kanOverride } from '@/lib/auth/helpers';
import { checkAlleConstraints } from '@/lib/constraints';
import type { Examen, Slot, Locatie, Rol } from '@/types/domain';

export async function POST(req: NextRequest) {
  const { session, error } = await requireSchrijven();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = toewijzingInvoerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Ongeldige invoer', details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { examenId, slotId, halveZaal, override, overrideReden } = parsed.data;
  const rol = session!.user.rol as Rol;

  if (override && !kanOverride(rol)) {
    return NextResponse.json({ error: 'Uw rol heeft geen overridebevoegdheid' }, { status: 403 });
  }

  // Haal entiteiten op
  const [examen] = await db.select().from(examens).where(eq(examens.id, examenId)).limit(1);
  if (!examen) return NextResponse.json({ error: 'Examen niet gevonden' }, { status: 404 });

  const [slot] = await db.select().from(slots).where(eq(slots.id, slotId)).limit(1);
  if (!slot) return NextResponse.json({ error: 'Slot niet gevonden' }, { status: 404 });

  const [locatie] = await db.select().from(locaties).where(eq(locaties.id, slot.locatieId)).limit(1);
  if (!locatie) return NextResponse.json({ error: 'Locatie niet gevonden' }, { status: 404 });

  // Check of slot al bezet is
  const [bestaandeToewijzing] = await db
    .select()
    .from(toewijzingen)
    .where(eq(toewijzingen.slotId, slotId))
    .limit(1);
  if (bestaandeToewijzing) {
    return NextResponse.json({ error: 'Slot is al bezet' }, { status: 409 });
  }

  // Haal andere examens in hetzelfde slot op
  const andereInSlotRijen = await db
    .select({ examen: examens })
    .from(toewijzingen)
    .innerJoin(examens, eq(toewijzingen.examenId, examens.id))
    .where(eq(toewijzingen.slotId, slotId));
  const andereExamensInSlot = andereInSlotRijen.map((r) => r.examen as unknown as Examen);

  // Haal alle toewijzingen op voor dezelfde dag
  const dagStart = slot.datum;
  const dagEind = slot.datum;
  const dagToewijzingen = await db
    .select({
      slot: slots,
      examen: examens,
      locatie: locaties,
    })
    .from(toewijzingen)
    .innerJoin(examens, eq(toewijzingen.examenId, examens.id))
    .innerJoin(slots, eq(toewijzingen.slotId, slots.id))
    .innerJoin(locaties, eq(slots.locatieId, locaties.id))
    .where(and(gte(slots.datum, dagStart), lte(slots.datum, dagEind)));

  const andereExamensOpDag = dagToewijzingen.map((r) => ({
    slot: r.slot as unknown as Slot,
    examen: r.examen as unknown as Examen,
    locatie: r.locatie as unknown as Locatie,
  }));

  // Constraint check
  const constraintResult = await checkAlleConstraints(
    examen as unknown as Examen,
    slot as unknown as Slot,
    locatie as unknown as Locatie,
    andereExamensInSlot,
    andereExamensOpDag,
    override,
  );

  if (!constraintResult.ok) {
    return NextResponse.json(
      {
        error: 'Planning niet mogelijk',
        details: {
          blokkades: constraintResult.blokkades,
          waarschuwingen: constraintResult.waarschuwingen,
        },
      },
      { status: 422 },
    );
  }

  // Maak toewijzing aan + update examen status
  const [niueToewijzing] = await db
    .insert(toewijzingen)
    .values({
      examenId,
      slotId,
      halveZaal,
      aangemeldDoor: session!.user.name ?? session!.user.email ?? '',
      overrideReden: override ? overrideReden : undefined,
    })
    .returning();

  await db.update(examens).set({ status: 'gepland', bijgewerktOp: new Date().toISOString() }).where(eq(examens.id, examenId));

  return NextResponse.json(
    {
      data: niueToewijzing,
      meta: {
        waarschuwingen: constraintResult.waarschuwingen,
        halvezaalSuggestie: constraintResult.halvezaalSuggestie,
      },
    },
    { status: 201 },
  );
}
