import type { Status } from '@/types/domain';

const STIJL: Record<Status, string> = {
  concept: 'bg-gray-100 text-gray-700',
  ingediend: 'bg-blue-100 text-blue-700',
  gepland: 'bg-amber-100 text-amber-700',
  bevestigd: 'bg-green-100 text-green-700',
};

const LABEL: Record<Status, string> = {
  concept: 'Concept',
  ingediend: 'Ingediend',
  gepland: 'Gepland',
  bevestigd: 'Bevestigd',
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STIJL[status]}`}>
      {LABEL[status]}
    </span>
  );
}
