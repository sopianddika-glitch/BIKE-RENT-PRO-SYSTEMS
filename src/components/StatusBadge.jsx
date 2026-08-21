import { STATUS_META } from '../data/seed.js';

export default function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.tersedia;

  return (
    <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold ring-1 ${meta.badgeClass}`}>
      {meta.label}
    </span>
  );
}
