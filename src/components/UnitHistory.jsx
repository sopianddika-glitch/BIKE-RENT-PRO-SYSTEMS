import { OLD_UNIT_STATUSES } from '../lib/unitSwitch.js';
import { formatDate } from '../lib/formatters.js';

const formatTime = (value) => {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date) : '-';
};

export default function UnitHistory({ transaction }) {
  const history = transaction?.switchHistory || [];
  if (!history.length) return null;
  return (
    <details className="mt-3 min-w-0 rounded-md border border-slate-200 bg-slate-50 text-xs">
      <summary className="cursor-pointer px-3 py-3 font-black text-cyan-800">Riwayat Unit · {history.length}x pergantian unit</summary>
      <ol className="space-y-3 border-t border-slate-200 p-3">
        <li className="break-words"><p className="font-black text-slate-800">Rental dimulai · {transaction.originalBikeNumber || history[0].fromBikeNumber}</p><p className="mt-1 text-slate-500">{transaction.startedAt ? formatTime(transaction.startedAt) : formatDate(transaction.date)}</p></li>
        {history.map((event) => (
          <li key={event.id} className="break-words border-l-2 border-cyan-200 pl-3">
            <p className="font-black text-slate-800">{event.fromBikeNumber} → {event.toBikeNumber}</p>
            <p className="mt-1 text-slate-500">{formatTime(event.switchedAt)}</p>
            <p className="mt-1 font-semibold text-slate-700">Alasan: {event.reason}</p>
            <p className="mt-1 text-slate-600">Unit lama: {OLD_UNIT_STATUSES.find((status) => status.id === event.oldBikeStatus)?.label || event.oldBikeStatus}</p>
            {event.note ? <p className="mt-1 whitespace-pre-wrap text-slate-600">{event.note}</p> : null}
          </li>
        ))}
        {transaction.returnedAt ? <li className="break-words"><p className="font-black text-emerald-800">Rental selesai · {transaction.bikeNumber}</p><p className="mt-1 text-slate-500">{formatTime(transaction.returnedAt)}</p></li> : null}
      </ol>
    </details>
  );
}
