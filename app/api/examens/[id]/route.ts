import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { examens, toewijzingen } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { examenUpdateSchema } from '@/lib/validatie/examen';
import { requireAuth, requireSchrijven } from '@/lib/auth/helpers';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const [examen] = await db.select().from(examens).where(eq(examens.id, Number(id))).limit(1);
  if (!examen) return NextResponse.json({ error: 'Examen niet gevonden' }, { status: 404 });

  return NextResponse.json({ data: examen });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { error } = await requireSchrijven();
  if (error) return error;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = examenUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Ongeldige invoer', details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const [bestaand] = await db.select().from(examens).where(eq(examens.id, Number(id))).limit(1);
  if (!bestaand) return NextResponse.json({ error: 'Examen niet gevonden' }, { status: 404 });

  const [bijgewerkt] = await db
    .update(examens)
    .set({ ...parsed.data, bijgewerktOp: new Date().toISOString() })
    .where(eq(examens.id, Number(id)))
    .returning();

  return NextResponse.json({ data: bijgewerkt });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { error } = await requireSchrijven();
  if (error) return error;

  const { id } = await params;
  const [bestaand] = await db.select().from(examens).where(eq(examens.id, Number(id))).limit(1);
  if (!bestaand) return NextResponse.json({ error: 'Examen niet gevonden' }, { status: 404 });

  // Cascade: verwijder eerst toewijzingen
  await db.delete(toewijzingen).where(eq(toewijzingen.examenId, Number(id)));
  await db.delete(examens).where(eq(examens.id, Number(id)));

  return NextResponse.json({ data: { deleted: true } });
}
