import { formatCurrency } from '../lib/formatters.js';
import { formatRentalDuration } from '../lib/rentalDuration.js';

export default function BookingUnitPricing({ bike, quote, error, input = {}, editable = false, onChange }) {
  return <div className="space-y-3 rounded-md border border-slate-200 p-4 text-xs" data-testid={`booking-price-${bike.id}`}>
    <p className="font-black text-slate-950">{bike.number} / {bike.type}</p>
    {quote ? <><p className="font-bold text-cyan-800">Rate {formatCurrency(quote.rate)} / {quote.half ? '½ hari' : 'hari'}</p><p>Perhitungan: {formatCurrency(quote.rate)} × {quote.half ? '1 periode ½ hari' : `${quote.days} hari`}</p><p>Durasi: {formatRentalDuration(quote.days)}</p><p>Base Rental: {formatCurrency(quote.baseCharge)}</p><p>Penyesuaian: {formatCurrency(quote.adjustmentCharge)}</p><p className="font-black">Total Rental: {formatCurrency(quote.totalCharge)}</p><p className="text-slate-600">Modal periode: {formatCurrency(quote.costAmount)}</p></> : <p role="status" className="font-bold text-amber-800">{error}</p>}
    {editable ? <div className="grid gap-3 sm:grid-cols-2">
      <div><label htmlFor={`adjustment-${bike.id}`} className="mb-1 block font-bold">Penyesuaian {bike.number}</label><input id={`adjustment-${bike.id}`} type="number" step="1" value={input.adjustment ?? '0'} onChange={(event) => onChange('adjustment', event.target.value)} className="w-full rounded-md border border-slate-200 p-3" /><p className="mt-1 text-slate-500">Negatif untuk diskon; rate kontrak tetap.</p></div>
      <div><label htmlFor={`paid-${bike.id}`} className="mb-1 block font-bold">Pembayaran diterima {bike.number}</label><input id={`paid-${bike.id}`} type="number" min="0" step="1" value={input.initialPaid ?? '0'} onChange={(event) => onChange('initialPaid', event.target.value)} className="w-full rounded-md border border-slate-200 p-3" /><p className="mt-1 text-slate-500">Isi uang yang benar-benar diterima; 0 jika belum.</p></div>
      {Number(input.adjustment || 0) !== 0 ? <div className="sm:col-span-2"><label htmlFor={`adjust-note-${bike.id}`} className="mb-1 block font-bold">Alasan penyesuaian {bike.number}</label><input id={`adjust-note-${bike.id}`} value={input.adjustmentNote || ''} maxLength={1000} onChange={(event) => onChange('adjustmentNote', event.target.value)} className="w-full rounded-md border border-slate-200 p-3" /></div> : null}
    </div> : null}
  </div>;
}
