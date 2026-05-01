import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { toewijzingen, examens, slots, locaties } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/helpers';
import ExcelJS from 'exceljs';

const NL_MAANDEN = ['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'];

function formatDatum(iso: string) {
  const [, m, d] = iso.split('-');
  return `${parseInt(d)} ${NL_MAANDEN[parseInt(m) - 1]}`;
}

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const rijen = await db
    .select({
      examenNaam: examens.naam,
      programma: examens.programma,
      examtype: examens.examtype,
      geschatAantal: examens.geschatAantal,
      datum: slots.datum,
      startTijd: slots.startTijd,
      eindTijd: slots.eindTijd,
      locatieNaam: locaties.naam,
      format: examens.format,
      halveZaal: toewijzingen.halveZaal,
      bijlageVereist: examens.bijlageVereist,
      contactpersoon: examens.contactpersoon,
      budgetnummer: examens.budgetnummer,
      opmerkingen: examens.opmerkingen,
      status: examens.status,
      overrideReden: toewijzingen.overrideReden,
    })
    .from(toewijzingen)
    .innerJoin(examens, eq(toewijzingen.examenId, examens.id))
    .innerJoin(slots, eq(toewijzingen.slotId, slots.id))
    .innerJoin(locaties, eq(slots.locatieId, locaties.id))
    .orderBy(slots.datum, slots.startTijd);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Nyenrode Examenplanning';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Facilitor export');

  sheet.columns = [
    { header: 'Tentamen',       key: 'tentamen',       width: 35 },
    { header: 'Programma',      key: 'programma',      width: 20 },
    { header: 'Type',           key: 'type',           width: 8  },
    { header: 'Studenten',      key: 'studenten',      width: 10 },
    { header: 'Datum',          key: 'datum',          width: 12 },
    { header: 'Start',          key: 'start',          width: 8  },
    { header: 'Eind',           key: 'eind',           width: 8  },
    { header: 'Locatie',        key: 'locatie',        width: 20 },
    { header: 'Format',         key: 'format',         width: 12 },
    { header: 'Halve zaal',     key: 'halveZaal',      width: 12 },
    { header: 'Bijlage',        key: 'bijlage',        width: 10 },
    { header: 'Contactpersoon', key: 'contactpersoon', width: 22 },
    { header: 'Budgetnummer',   key: 'budgetnummer',   width: 16 },
    { header: 'Opmerkingen',    key: 'opmerkingen',    width: 30 },
    { header: 'Status',         key: 'status',         width: 12 },
    { header: 'Override reden', key: 'overrideReden',  width: 25 },
  ];

  // Koptekstrij opmaken
  const headerRij = sheet.getRow(1);
  headerRij.font = { bold: true };
  headerRij.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F0FE' } };
  headerRij.border = {
    bottom: { style: 'thin', color: { argb: 'FF9AACCC' } },
  };

  for (const r of rijen) {
    sheet.addRow({
      tentamen:       r.examenNaam,
      programma:      r.programma,
      type:           r.examtype,
      studenten:      r.geschatAantal,
      datum:          formatDatum(r.datum),
      start:          r.startTijd,
      eind:           r.eindTijd,
      locatie:        r.locatieNaam,
      format:         r.format ?? '',
      halveZaal:      r.halveZaal ? 'Ja' : 'Nee',
      bijlage:        r.bijlageVereist ? 'Ja' : 'Nee',
      contactpersoon: r.contactpersoon ?? '',
      budgetnummer:   r.budgetnummer ?? '',
      opmerkingen:    r.opmerkingen ?? '',
      status:         r.status,
      overrideReden:  r.overrideReden ?? '',
    });
  }

  // Afwisselende rijkleuring
  sheet.eachRow((row, nr) => {
    if (nr > 1 && nr % 2 === 0) {
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(buffer as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="facilitor-export-${new Date().toISOString().slice(0,10)}.xlsx"`,
    },
  });
}
