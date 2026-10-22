import { getRentalFinancials } from '../lib/rentalPricing.js';
import { formatCurrency } from '../lib/formatters.js';
import { formatRentalDateTime, formatRentalDuration } from '../lib/rentalDuration.js';

export default function ExtensionHistory({ transaction }) {
  const history = transaction?.extensionHistory || [];
  if (!history.length) return null;
  const summary = getRentalFinancials(transaction);
  return (
    <details className="mt-3 min-w-0 rounded-md border border-slate-200 bg-slate-50 text-xs">
      <summary className="cursor-pointer px-3 py-3 font-black text-cyan-800">Riwayat Perpanjangan · {history.length}x</summary>
      <div className="border-t border-slate-200 p-3">
        <p className="break-words font-bold">Harga Awal {formatCurrency(summary.baseCharge)} · Tambahan {formatCurrency(summary.extensionCharge)} · Total Rental {formatCurrency(summary.totalCharge)}</p>
        <ol className="mt-3 space-y-4">{history.map((event) => <li key={event.id} className="break-words border-l-2 border-cyan-200 pl-3">
          <p className="font-black text-slate-800">+{formatRentalDuration(event.additionalDays)} · {formatCurrency(event.charge)}</p>
          <p className="mt-1 text-slate-500">{formatRentalDateTime(event.extendedAt, transaction.rentalTimeZone)}</p>
          <p className="mt-1 text-slate-700">Sebelumnya: {formatRentalDateTime(event.previousDueAt, transaction.rentalTimeZone)}</p>
          <p className="mt-1 font-bold text-slate-800">Selesai baru: {formatRentalDateTime(event.dueAt, transaction.rentalTimeZone)}</p>
          {event.pricingMode === 'booked-rate' ? <p className="mt-1 text-cyan-800">Rate kontrak {formatCurrency(event.bookedRate)} × {event.additionalDays === 0.5 ? '1 periode ½ hari' : `${event.additionalDays} hari`}</p> : null}
          <p className="mt-1 text-slate-600">Modal tambahan: {formatCurrency(event.costAmount)}</p>
          {event.wasOverdue ? <p className="mt-1 font-bold text-rose-700">Sudah terlambat {Math.ceil(event.overdueMilliseconds / 60000)} menit saat diperpanjang.</p> : null}
          {event.legacyTimingProvided ? <p className="mt-1 text-slate-500">Waktu rental lama dikonfirmasi pada perpanjangan ini.</p> : null}
          {event.note ? <p className="mt-1 whitespace-pre-wrap text-slate-600">{event.note}</p> : null}
        </li>)}</ol>
      </div>
    </details>
  );
}
