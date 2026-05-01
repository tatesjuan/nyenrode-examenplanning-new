import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { slots, locaties, toewijzingen, examens, surveillanten, survToewijzingen, beschikbaarheid } from '@/lib/db/schema';
import { eq, gte } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/helpers';
import ExcelJS from 'exceljs';

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  // Vanaf vandaag alle slots met examens
  const vandaag = new Date().toISOString().slice(0, 10);

  const slotRijen = await db
    .select({
      slotId: slots.id,
      datum: slots.datum,
      tijdblok: slots.tijdblok,
      startTijd: slots.startTijd,
      locatieNaam: locaties.naam,
      examenNaam: examens.naam,
    })
    .from(toewijzingen)
    .innerJoin(slots, eq(toewijzingen.slotId, slots.id))
    .innerJoin(locaties, eq(slots.locatieId, locaties.id))
    .innerJoin(examens, eq(toewijzingen.examenId, examens.id))
    .where(gte(slots.datum, vandaag))
    .orderBy(slots.datum, slots.tijdblok);

  const alleSurveillanten = await db
    .select()
    .from(surveillanten)
    .where(eq(surveillanten.actief, true))
    .orderBy(surveillanten.naam);

  const slotIds = slotRijen.map((s) => s.slotId);

  const [assignments, beschikbaarheidData] = slotIds.length > 0
    ? await Promise.all([
        db.select().from(survToewijzingen),
        db.select().from(beschikbaarheid),
      ])
    : [[], []];

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Nyenrode Examenplanning';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Surveillanten matrix');

  // Kolomdefinitie: eerste kolom = slot info, daarna één per surveillant
  sheet.columns = [
    { header: 'Datum / Tijdblok / Locatie / Tentamen', key: 'slot', width: 45 },
    ...alleSurveillanten.map((s) => ({
      header: s.naam,
      key: `surv_${s.id}`,
      width: 18,
    })),
  ];

  const headerRij = sheet.getRow(1);
  headerRij.font = { bold: true };
  headerRij.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F0FE' } };
  headerRij.alignment = { wrapText: true };

  const TIJDBLOK_LABEL: Record<string, string> = {
    ochtend: 'Ochtend 09:30',
    middag: 'Middag 14:00',
    avond: 'Avond 19:00',
  };

  for (const s of slotRijen) {
    const rijData: Record<string, string> = {
      slot: `${s.datum}  ${TIJDBLOK_LABEL[s.tijdblok] ?? s.tijdblok}  ${s.locatieNaam}  —  ${s.examenNaam}`,
    };

    for (const surv of alleSurveillanten) {
      const toewijzing = assignments.find(
        (t) => t.slotId === s.slotId && t.surveillantId === surv.id,
      );
      const isOnbeschikbaar = beschikbaarheidData.some(
        (b) => b.slotId === s.slotId && b.surveillantId === surv.id && !b.beschikbaar,
      );

      if (toewijzing) {
        rijData[`surv_${surv.id}`] = toewijzing.rol === 'Hoofdsurveillant' ? 'H' : 'S';
      } else if (isOnbeschikbaar) {
        rijData[`surv_${surv.id}`] = '✖';
      } else {
        rijData[`surv_${surv.id}`] = '?';
      }
    }

    const rij = sheet.addRow(rijData);

    // Kleuren per cel
    for (let col = 2; col <= alleSurveillanten.length + 1; col++) {
      const cel = rij.getCell(col);
      cel.alignment = { horizontal: 'center', vertical: 'middle' };
      if (cel.value === 'H') {
        cel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
        cel.font = { bold: true, color: { argb: 'FF065F46' } };
      } else if (cel.value === 'S') {
        cel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
        cel.font = { color: { argb: 'FF1E40AF' } };
      } else if (cel.value === '✖') {
        cel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
        cel.font = { color: { argb: 'FF9CA3AF' } };
      }
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(buffer as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="surveillanten-matrix-${new Date().toISOString().slice(0,10)}.xlsx"`,
    },
  });
}
