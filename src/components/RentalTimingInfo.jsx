import { initialSystemSettings } from '../data/seed.js';
import { formatRentalDateTime, getRentalTimeStatus } from '../lib/rentalDuration.js';

export default function RentalTimingInfo({ transaction, now = Date.now(), dueSoonHours = initialSystemSettings.dueSoonHours, compact = false }) {
  if (!transaction) return null;
  const status = getRentalTimeStatus(transaction, now, dueSoonHours);
  const tone = status.id === 'overdue' ? 'text-rose-700 bg-rose-50' : status.id === 'dueSoon' ? 'text-amber-800 bg-amber-50' : 'text-slate-700 bg-slate-50';
  return (
    <div className="mt-2 min-w-0 space-y-1 break-words text-[11px] font-semibold">
      {!compact ? <p className="text-slate-500">Mulai: {formatRentalDateTime(transaction.startedAt, transaction.rentalTimeZone)}</p> : null}
      <p className="font-black text-slate-800">Selesai: {formatRentalDateTime(transaction.dueAt, transaction.rentalTimeZone)}</p>
      <p className={`inline-block rounded px-2 py-1 ${tone}`}>{status.label}{status.text ? ` · ${status.text}` : ''}</p>
    </div>
  );
}
