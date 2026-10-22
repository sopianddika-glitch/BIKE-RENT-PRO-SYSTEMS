import { getRentalFinancials } from '../lib/rentalPricing.js';
import { formatCurrency } from '../lib/formatters.js';
import { formatRentalDuration } from '../lib/rentalDuration.js';

export default function RentalPriceBreakdown({ transaction }) {
  if (!transaction || transaction.category !== 'rental') return null;
  const summary = getRentalFinancials(transaction);
  return <details className="mt-3 min-w-0 rounded-md border border-slate-200 bg-white text-xs">
    <summary className="cursor-pointer px-3 py-3 font-black text-cyan-800">Rincian Harga & Pembayaran · {summary.paymentStatus}</summary>
    <div className="space-y-2 break-words border-t border-slate-200 p-3">
      {transaction.pricingVersion === 1 ? <><p>Rate kontrak: {transaction.bookedDailyRate == null ? 'Belum diatur' : `${formatCurrency(transaction.bookedDailyRate)} / hari`}</p><p>Rate ½ hari: {transaction.bookedHalfDayRate == null ? 'Belum diatur' : formatCurrency(transaction.bookedHalfDayRate)}</p></> : <p className="text-amber-800">Harga historis dipertahankan; rate kontrak lama tidak diasumsikan.</p>}
      <p>Durasi awal: {summary.originalDuration === null ? 'Belum dicatat' : formatRentalDuration(summary.originalDuration)}</p><p>Durasi saat ini: {summary.currentDuration === null ? 'Belum dicatat' : formatRentalDuration(summary.currentDuration)}</p>
      <p>Base Charge: {formatCurrency(summary.baseCharge)}</p><p>Extension Charge: {formatCurrency(summary.extensionCharge)}</p><p>Penyesuaian: {formatCurrency(summary.adjustmentCharge)}</p><p className="font-black">Total Charge: {formatCurrency(summary.totalCharge)}</p>
      <p>Pembayaran Diterima: {summary.amountPaid === null ? 'Belum dicatat' : formatCurrency(summary.amountPaid)}</p><p className="font-black">Sisa Tagihan: {summary.balanceDue === null ? 'Belum dapat ditentukan' : formatCurrency(summary.balanceDue)}</p><p>Status: {summary.paymentStatus}</p>
      {(transaction.adjustments || []).map((event) => <p key={event.id}>Penyesuaian {formatCurrency(event.amount)} · {event.note}</p>)}
      {(transaction.payments || []).map((event) => <p key={event.id}>Pembayaran {event.date}: {formatCurrency(event.amount)} · {event.note || 'Pelanggan'}{event.legacyPaymentsVerified ? ' · Pembayaran lama ditinjau' : ''}</p>)}
    </div>
  </details>;
}
