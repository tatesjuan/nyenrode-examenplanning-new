import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { survToewijzingen } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireSchrijven } from '@/lib/auth/helpers';
import { z } from 'zod';

const updateSchema = z.object({
  rol: z.enum(['Surveillant', 'Hoofdsurveillant']),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireSchrijven();
  if (error) return error;

  const { id: idStr } = await params;
  const id = parseInt(idStr);
  if (isNaN(id)) return NextResponse.json({ error: 'Ongeldig ID' }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ongeldige invoer' }, { status: 400 });
  }

  const [bijgewerkt] = await db
    .update(survToewijzingen)
    .set({ ...parsed.data, bijgewerktOp: new Date().toISOString() })
    .where(eq(survToewijzingen.id, id))
    .returning();

  if (!bijgewerkt) return NextResponse.json({ error: 'Toewijzing niet gevonden' }, { status: 404 });

  return NextResponse.json({ data: bijgewerkt });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireSchrijven();
  if (error) return error;

  const { id: idStr } = await params;
  const id = parseInt(idStr);
  if (isNaN(id)) return NextResponse.json({ error: 'Ongeldig ID' }, { status: 400 });

  await db.delete(survToewijzingen).where(eq(survToewijzingen.id, id));
  return new NextResponse(null, { status: 204 });
}
