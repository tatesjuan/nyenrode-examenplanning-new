import { KalenderOverzicht } from '@/components/kalender/kalender-overzicht';

export default function KalenderPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Planningskalender</h1>
      <KalenderOverzicht />
    </div>
  );
}
