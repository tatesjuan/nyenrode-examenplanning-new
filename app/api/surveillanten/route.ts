import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { surveillanten } from '@/lib/db/schema';
import { requireAuth, requireSchrijven } from '@/lib/auth/helpers';
import { z } from 'zod';

const invoerSchema = z.object({
  naam: z.string().min(1, 'Naam is verplicht'),
  email: z.string().email('Ongeldig e-mailadres'),
  kanHs: z.boolean().default(false),
  kanSurv: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const alleenActief = req.nextUrl.searchParams.get('actief') === 'true';
  let rijen = await db.select().from(surveillanten).orderBy(surveillanten.naam);

  if (alleenActief) {
    rijen = rijen.filter((s) => s.actief);
  }

  return NextResponse.json({ data: rijen, meta: { total: rijen.length } });
}

export async function POST(req: NextRequest) {
  const { error } = await requireSchrijven();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = invoerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Ongeldige invoer', details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const [nieuw] = await db.insert(surveillanten).values(parsed.data).returning();
  return NextResponse.json({ data: nieuw }, { status: 201 });
}
