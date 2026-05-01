import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { survToewijzingen } from '@/lib/db/schema';
import { requireSchrijven } from '@/lib/auth/helpers';
import { z } from 'zod';

const invoerSchema = z.object({
  slotId: z.number().int().positive(),
  surveillantId: z.number().int().positive(),
  rol: z.enum(['Surveillant', 'Hoofdsurveillant']),
});

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

  const [nieuw] = await db.insert(survToewijzingen).values(parsed.data).returning();
  return NextResponse.json({ data: nieuw }, { status: 201 });
}
