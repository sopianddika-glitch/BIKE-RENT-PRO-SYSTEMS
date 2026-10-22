import { useEffect, useRef, useState } from 'react';
import { Clock3, X } from 'lucide-react';
import DurationPicker from './DurationPicker.jsx';
import { formatCurrency } from '../lib/formatters.js';
import { addRentalDuration, formatRentalDateTime, formatRentalDuration, fromDateTimeInput, getExtensionQuote, getRentalTimeStatus, toDateTimeInput, validateRentalLimit } from '../lib/rentalDuration.js';

export default function ExtendRentalDialog({ target, settings, getRate, now, onSubmit, onClose }) {
  const { bike, transaction } = target;
  const timeZone = transaction.rentalTimeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const formatTime = (value) => formatRentalDateTime(value, timeZone);
  const dialogRef = useRef(null);
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(() => {
    const quote = getExtensionQuote(getRate(bike.type), 1);
    return { additionalDays: '1', charge: quote?.charge ?? '', costAmount: quote?.costAmount ?? '', note: '', legacyStartInput: toDateTimeInput(transaction.startedAt, timeZone), legacyDueInput: toDateTimeInput(transaction.dueAt, timeZone) };
  });
  const legacy = !transaction.startedAt || !transaction.dueAt;
  const quote = getExtensionQuote(getRate(bike.type), form.additionalDays);
  let preview = null;
  let previewError = '';
  try {
    const startedAt = transaction.startedAt || fromDateTimeInput(form.legacyStartInput, timeZone);
    const previousDueAt = transaction.dueAt || fromDateTimeInput(form.legacyDueInput, timeZone);
    const dueAt = addRentalDuration(previousDueAt, form.additionalDays, timeZone);
    validateRentalLimit(startedAt, previousDueAt, settings.maxRentalDays, timeZone);
    validateRentalLimit(startedAt, dueAt, settings.maxRentalDays, timeZone);
    preview = { startedAt, previousDueAt, dueAt };
  } catch (cause) { previewError = cause.message; }
  const timeStatus = getRentalTimeStatus({ dueAt: preview?.previousDueAt }, now, settings.dueSoonHours);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => { dialog.close(); document.body.style.overflow = previousOverflow; if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus(); };
  }, []);
  useEffect(() => { dialogRef.current?.querySelector(review ? 'button[type="submit"]' : 'input, select')?.focus(); }, [review]);

  const change = (field, value) => {
    setError('');
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === 'additionalDays') {
        const nextQuote = getExtensionQuote(getRate(bike.type), value);
        next.charge = nextQuote?.charge ?? '';
        next.costAmount = nextQuote?.costAmount ?? '';
      }
      return next;
    });
  };
  const submit = async (event) => {
    event.preventDefault();
    if (busyRef.current) return;
    if (!preview) { setError(previewError); return; }
    if (['charge', 'costAmount'].some((field) => form[field] === '' || !Number.isSafeInteger(Number(form[field])) || Number(form[field]) < 0)) {
      setError('Harga tambahan dan modal wajib diisi dengan nominal rupiah yang valid.'); return;
    }
    if (!review) { setReview(true); setError(''); return; }
    busyRef.current = true;
    setBusy(true);
    try {
      const result = await onSubmit({ ...form, legacyStartedAt: preview.startedAt, legacyDueAt: preview.previousDueAt, rentalId: transaction.id, currentBikeId: bike.id, expectedDueAt: transaction.dueAt || null, expectedExtensionCount: (transaction.extensionHistory || []).length });
      if (result?.success) onClose();
      else setError(result?.error || 'Rental belum berhasil diperpanjang.');
    } catch { setError('Rental belum berhasil diperpanjang. Periksa data lalu coba lagi.'); }
    finally { busyRef.current = false; setBusy(false); }
  };
  return (
    <dialog ref={dialogRef} aria-labelledby="extend-title" aria-busy={busy} onCancel={(event) => { event.preventDefault(); if (!busyRef.current) onClose(); }} className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-lg bg-white p-0 text-slate-950 shadow-2xl backdrop:bg-slate-950/55 backdrop:backdrop-blur-sm">
      <form onSubmit={submit} noValidate>
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-5"><div><p className="text-[10px] font-black uppercase tracking-wide text-cyan-700">{review ? 'Review perpanjangan' : transaction.rentalCode || `#${transaction.id}`}</p><h2 id="extend-title" className="mt-1 flex items-center gap-2 text-lg font-black"><Clock3 size={20} /> Perpanjang Rental</h2></div><button type="button" disabled={busy} onClick={onClose} aria-label="Tutup Perpanjang Rental" className="rounded-md p-3 text-slate-500 hover:bg-slate-100"><X size={18} /></button></div>
        <div className="space-y-4 p-5">
          <div className="rounded-md bg-slate-50 p-3 text-xs"><p className="break-words font-black">{transaction.customerName || 'Belum dicatat'} · {bike.number} / {bike.type}</p><p className="mt-2 text-slate-600">Mulai: {formatTime(preview?.startedAt || transaction.startedAt)}</p><p className="mt-1 font-bold text-slate-800">Due saat ini: {formatTime(preview?.previousDueAt || transaction.dueAt)}</p></div>
          {timeStatus.id === 'overdue' ? <div role="status" className="rounded-md bg-amber-50 p-3 text-xs font-bold text-amber-900"><p>Rental sudah melewati waktu pengembalian.</p><p className="mt-1">Sekarang: {formatTime(new Date(now).toISOString())}</p><p className="mt-1">{timeStatus.text}. Tambahan tetap dihitung dari due sebelumnya.</p></div> : null}
          {!review ? <>
            {legacy ? <fieldset className="space-y-3 rounded-md border border-amber-200 p-3"><legend className="px-1 text-xs font-black text-amber-900">Waktu rental lama</legend><p className="text-xs font-semibold text-slate-600">Isi waktu mulai dan batas pengembalian yang memang sudah disepakati.</p>{[['legacyStartInput', 'Mulai rental lama', transaction.startedAt], ['legacyDueInput', 'Batas pengembalian lama', transaction.dueAt]].map(([field, label, existing]) => <div key={field}><label htmlFor={field} className="mb-1 block text-xs font-bold">{label}</label><input id={field} type="datetime-local" readOnly={Boolean(existing)} value={form[field]} onChange={(event) => change(field, event.target.value)} className="w-full min-w-0 rounded-md border border-slate-200 p-3 text-sm" /></div>)}</fieldset> : null}
            <DurationPicker id="extend-duration" label="Tambahan Durasi" value={form.additionalDays} onChange={(value) => change('additionalDays', value)} maxDays={settings.maxRentalDays} />
            <div className="rounded-md bg-cyan-50 p-3 text-xs font-bold text-cyan-900">Selesai baru: {preview ? formatTime(preview.dueAt) : previewError}</div>
            <p className="text-xs font-semibold text-slate-500">{quote ? 'Biaya menggunakan tarif perpanjangan per tipe. Tinjau atau sesuaikan nominal yang disepakati.' : 'Tarif perpanjangan belum diatur untuk durasi ini. Isi harga tambahan dan modal sesuai kesepakatan; isi 0 jika tidak ada biaya.'}</p>
            <div className="grid grid-cols-2 gap-3">{[['charge', 'Harga tambahan'], ['costAmount', 'Modal tambahan']].map(([field, label]) => <div key={field}><label htmlFor={`extend-${field}`} className="mb-1 block text-xs font-black">{label}</label><input id={`extend-${field}`} type="number" min="0" step="1" value={form[field]} onChange={(event) => change(field, event.target.value)} className="w-full rounded-md border border-slate-200 p-3 text-sm font-bold" /></div>)}</div>
            <div><label htmlFor="extend-note" className="mb-1 block text-xs font-black">Catatan perpanjangan</label><textarea id="extend-note" rows={3} maxLength={1000} value={form.note} onChange={(event) => change('note', event.target.value)} className="w-full resize-none rounded-md border border-slate-200 p-3 text-sm" /></div>
          </> : <div className="space-y-3 break-words text-sm">
            <p className="font-bold">Sebelumnya: {formatTime(preview?.previousDueAt)}</p><p>Tambahan: +{formatRentalDuration(form.additionalDays)}</p><p className="font-black text-cyan-800">Selesai baru: {formatTime(preview?.dueAt)}</p>
            <div className="space-y-1 rounded-md bg-slate-50 p-3 text-xs"><p>Harga Awal: {formatCurrency(transaction.originalAmount ?? transaction.amount)}</p><p>Total saat ini: {formatCurrency(transaction.amount)}</p><p>Tambahan kali ini: {formatCurrency(form.charge)}</p><p>Modal tambahan: {formatCurrency(form.costAmount)}</p><p className="font-black">Total Rental Baru: {formatCurrency(Number(transaction.amount) + Number(form.charge))}</p></div>
            <p className="whitespace-pre-wrap text-xs text-slate-600">{form.note || 'Tanpa catatan'}</p>
          </div>}
          {error ? <p role="alert" className="rounded-md bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p> : null}
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 p-4"><button type="button" disabled={busy} onClick={onClose} className="rounded-md bg-slate-100 px-4 py-3 text-xs font-black">Batal</button>{review ? <button type="button" disabled={busy} onClick={() => { setReview(false); setError(''); }} className="rounded-md bg-slate-100 px-4 py-3 text-xs font-black">Ubah Pilihan</button> : null}<button type="submit" disabled={busy} className="rounded-md bg-cyan-700 px-4 py-3 text-xs font-black text-white disabled:opacity-50">{busy ? 'Menyimpan…' : review ? 'Konfirmasi Perpanjangan' : 'Tinjau Perpanjangan'}</button></div>
      </form>
    </dialog>
  );
}
