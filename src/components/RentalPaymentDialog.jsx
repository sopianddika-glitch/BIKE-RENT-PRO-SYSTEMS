import { useEffect, useRef, useState } from 'react';
import { getRentalFinancials } from '../lib/rentalPricing.js';
import { toDateTimeInput } from '../lib/rentalDuration.js';
import { formatCurrency } from '../lib/formatters.js';

export default function RentalPaymentDialog({ rental, onSubmit, onClose }) {
  const summary = getRentalFinancials(rental);
  const legacy = summary.amountPaid === null;
  const dialogRef = useRef(null);
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ amount: '', date: toDateTimeInput(new Date().toISOString(), rental.rentalTimeZone).slice(0, 10), note: '', verifyLegacyPayments: false });
  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    dialog.showModal();
    return () => { dialog.close(); if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus(); };
  }, []);
  const change = (field, value) => { setError(''); setForm((current) => ({ ...current, [field]: value })); };
  const submit = async (event) => {
    event.preventDefault();
    if (busyRef.current) return;
    const amount = Number(form.amount);
    if (form.amount === '' || !Number.isSafeInteger(amount) || amount < 0 || (!legacy && amount === 0) || amount > (summary.balanceDue ?? summary.totalCharge)) { setError('Isi pembayaran integer Rupiah sesuai sisa tagihan.'); return; }
    if (legacy && !form.verifyLegacyPayments) { setError('Konfirmasi hasil peninjauan pembayaran lama.'); return; }
    if (!form.date) { setError('Tanggal pembayaran wajib diisi.'); return; }
    if (!review) { setReview(true); return; }
    busyRef.current = true; setBusy(true);
    try {
      const result = await onSubmit({ ...form, rentalId: rental.id, expectedTotalCharge: summary.totalCharge, expectedPaymentCount: (rental.payments || []).length, expectedPaymentsKnown: !legacy });
      if (result?.success) onClose(); else setError(result?.error || 'Pembayaran belum berhasil dicatat.');
    } catch { setError('Pembayaran belum berhasil dicatat.'); }
    finally { busyRef.current = false; setBusy(false); }
  };
  return <dialog ref={dialogRef} aria-labelledby="rental-payment-title" aria-busy={busy} onCancel={(event) => { event.preventDefault(); if (!busyRef.current) onClose(); }} className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-lg bg-white p-5 text-slate-950 shadow-2xl backdrop:bg-slate-950/55">
    <form onSubmit={submit} noValidate className="space-y-4">
      <h2 id="rental-payment-title" className="text-lg font-black">Catat Pembayaran Rental</h2><p className="text-xs font-bold">{rental.rentalCode || `#${rental.id}`} · {rental.customerName || 'Pelanggan'} · {rental.bikeNumber}</p>
      <p className="text-sm">Total Charge: {formatCurrency(summary.totalCharge)}</p><p className="text-sm">Sudah Diterima: {legacy ? 'Belum dicatat' : formatCurrency(summary.amountPaid)}</p><p className="text-sm font-bold">Sisa Tagihan: {legacy ? 'Belum dapat ditentukan' : formatCurrency(summary.balanceDue)}</p>
      {!review ? <>
        {legacy ? <div className="space-y-3 rounded-md bg-amber-50 p-3 text-xs text-amber-900"><p>Data lama tidak memiliki bukti pembayaran. Tinjau seluruh pembayaran sebelumnya. Nominal awal harus mencakup seluruh uang yang sudah diterima dan dapat diverifikasi. Isi 0 hanya jika memang belum dibayar.</p><label className="flex gap-2 font-bold"><input type="checkbox" checked={form.verifyLegacyPayments} onChange={(event) => change('verifyLegacyPayments', event.target.checked)} />Saya sudah meninjau seluruh pembayaran lama</label></div> : null}
        <div><label htmlFor="payment-amount" className="mb-1 block text-xs font-black">{legacy ? 'Pembayaran awal terverifikasi' : 'Nominal pembayaran'}</label><input id="payment-amount" type="number" min="0" step="1" value={form.amount} onChange={(event) => change('amount', event.target.value)} className="w-full rounded-md border border-slate-200 p-3" /></div>
        <div><label htmlFor="payment-date" className="mb-1 block text-xs font-black">Tanggal pembayaran</label><input id="payment-date" type="date" value={form.date} onChange={(event) => change('date', event.target.value)} className="w-full min-w-0 rounded-md border border-slate-200 p-3" /></div>
        <div><label htmlFor="payment-note" className="mb-1 block text-xs font-black">Catatan pembayaran</label><textarea id="payment-note" maxLength={1000} value={form.note} onChange={(event) => change('note', event.target.value)} className="w-full rounded-md border border-slate-200 p-3" /></div>
      </> : <div className="space-y-2 rounded-md bg-cyan-50 p-3 text-sm font-bold text-cyan-900"><p>Pembayaran {formatCurrency(form.amount)} · {form.date}</p><p>{form.note || 'Tanpa catatan'}</p><p>Dicatat sebagai uang diterima, terpisah dari charge dan setoran modal.</p>{legacy ? <p>Seluruh pembayaran lama telah ditinjau.</p> : null}</div>}
      {error ? <p role="alert" className="text-sm font-bold text-rose-700">{error}</p> : null}
      <div className="flex flex-wrap justify-end gap-2"><button type="button" disabled={busy} onClick={onClose} className="rounded-md bg-slate-100 px-4 py-3 text-xs font-black">Batal</button>{review ? <button type="button" disabled={busy} onClick={() => setReview(false)} className="rounded-md bg-slate-100 px-4 py-3 text-xs font-black">Ubah Pilihan</button> : null}<button type="submit" disabled={busy} className="rounded-md bg-cyan-700 px-4 py-3 text-xs font-black text-white">{busy ? 'Menyimpan…' : review ? 'Konfirmasi Pembayaran' : 'Tinjau Pembayaran'}</button></div>
    </form>
  </dialog>;
}
