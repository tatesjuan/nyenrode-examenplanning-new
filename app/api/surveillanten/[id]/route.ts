import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { surveillanten } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireSchrijven } from '@/lib/auth/helpers';
import { z } from 'zod';

const updateSchema = z.object({
  naam: z.string().min(1).optional(),
  email: z.string().email().optional(),
  kanHs: z.boolean().optional(),
  kanSurv: z.boolean().optional(),
  actief: z.boolean().optional(),
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
    return NextResponse.json(
      { error: 'Ongeldige invoer', details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const [bijgewerkt] = await db
    .update(surveillanten)
    .set({ ...parsed.data, bijgewerktOp: new Date().toISOString() })
    .where(eq(surveillanten.id, id))
    .returning();

  if (!bijgewerkt) return NextResponse.json({ error: 'Surveillant niet gevonden' }, { status: 404 });

  return NextResponse.json({ data: bijgewerkt });
}
