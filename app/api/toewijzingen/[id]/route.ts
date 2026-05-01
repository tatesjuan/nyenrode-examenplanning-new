import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { toewijzingen, examens } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireSchrijven } from '@/lib/auth/helpers';

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { error } = await requireSchrijven();
  if (error) return error;

  const { id } = await params;

  const [toewijzing] = await db
    .select()
    .from(toewijzingen)
    .where(eq(toewijzingen.id, Number(id)))
    .limit(1);
  if (!toewijzing) return NextResponse.json({ error: 'Toewijzing niet gevonden' }, { status: 404 });

  await db.delete(toewijzingen).where(eq(toewijzingen.id, Number(id)));

  // Zet examen terug op 'ingediend'
  await db
    .update(examens)
    .set({ status: 'ingediend', bijgewerktOp: new Date().toISOString() })
    .where(eq(examens.id, toewijzing.examenId));

  return NextResponse.json({ data: { deleted: true } });
}
