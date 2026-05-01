import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { examens } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { examenInvoerSchema } from '@/lib/validatie/examen';
import { requireAuth, requireSchrijven } from '@/lib/auth/helpers';
import { z } from 'zod';

const lijstQuerySchema = z.object({
  status: z.enum(['concept', 'ingediend', 'gepland', 'bevestigd']).optional(),
  programma: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const query = lijstQuerySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams),
  );
  if (!query.success) {
    return NextResponse.json({ error: 'Ongeldige query-parameters' }, { status: 400 });
  }

  let rijen = await db.select().from(examens).orderBy(examens.aangemaaktOp);

  if (query.data.status) {
    rijen = rijen.filter((e) => e.status === query.data.status);
  }
  if (query.data.programma) {
    rijen = rijen.filter((e) => e.programma === query.data.programma);
  }

  return NextResponse.json({ data: rijen, meta: { total: rijen.length } });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireSchrijven();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = examenInvoerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Ongeldige invoer', details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const [nieuw] = await db
    .insert(examens)
    .values({ ...parsed.data, ingediendDoor: session!.user.name ?? session!.user.email ?? '' })
    .returning();

  return NextResponse.json({ data: nieuw }, { status: 201 });
}
