'use client';

import { useState } from 'react';

interface ExportKaartProps {
  titel: string;
  beschrijving: string;
  endpoint: string;
  bestandsnaam: string;
}

function ExportKaart({ titel, beschrijving, endpoint, bestandsnaam }: ExportKaartProps) {
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  async function handleDownload() {
    setBezig(true);
    setFout(null);
    try {
      const res = await fetch(endpoint);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? 'Download mislukt');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = bestandsnaam;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setFout((e as Error).message);
    } finally {
      setBezig(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold text-gray-900">{titel}</h2>
        <p className="mt-1 text-sm text-gray-500">{beschrijving}</p>
      </div>
      {fout && (
        <div className="text-sm text-red-600 bg-red-50 rounded p-2">{fout}</div>
      )}
      <button
        onClick={handleDownload}
        disabled={bezig}
        className="self-start px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {bezig ? 'Exporteren...' : '↓ Download Excel'}
      </button>
    </div>
  );
}

export default function RapportenPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Rapporten & exports</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ExportKaart
          titel="Facilitor-export"
          beschrijving="Alle geplande tentamens met datum, tijdblok, locatie, studenten en overige details — klaar voor import in Facilitor. Kolommen conform de vastgestelde volgorde."
          endpoint="/api/export/facilitor"
          bestandsnaam={`facilitor-export-${new Date().toISOString().slice(0, 10)}.xlsx`}
        />
        <ExportKaart
          titel="Surveillantenmatrix"
          beschrijving="Overzicht van alle komende tentamenslots met de toegewezen surveillanten (S) en hoofdsurveillanten (H). Niet-beschikbare surveillanten worden gemarkeerd met ✖."
          endpoint="/api/export/surveillanten"
          bestandsnaam={`surveillanten-matrix-${new Date().toISOString().slice(0, 10)}.xlsx`}
        />
      </div>
    </div>
  );
}
