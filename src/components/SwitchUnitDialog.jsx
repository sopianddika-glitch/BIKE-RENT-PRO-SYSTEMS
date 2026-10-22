import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeftRight, Search, X } from 'lucide-react';
import { getReplacementBikes, OLD_UNIT_STATUSES, SWITCH_REASONS } from '../lib/unitSwitch.js';

export default function SwitchUnitDialog({ target, bikes, transactions, onSubmit, onClose }) {
  const dialogRef = useRef(null);
  const submittingRef = useRef(false);
  const [form, setForm] = useState({ replacementBikeId: '', reason: 'Kerusakan', oldBikeStatus: 'bengkel', note: '' });
  const [search, setSearch] = useState('');
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { bike, transaction } = target;
  const replacements = useMemo(() => getReplacementBikes(bikes, transactions, bike.id), [bike.id, bikes, transactions]);
  const filtered = replacements.filter((item) => [item.number, item.type, item.note].some((value) => String(value || '').toLocaleLowerCase('id-ID').includes(search.trim().toLocaleLowerCase('id-ID'))));
  const selectedBike = bikes.find((item) => item.id === Number(form.replacementBikeId));

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);

  useEffect(() => {
    dialogRef.current?.querySelector(review ? 'button[type="submit"]' : 'input')?.focus();
  }, [review]);

  const change = (field, value) => {
    setError('');
    setForm((current) => ({ ...current, [field]: value, ...(field === 'reason' ? { oldBikeStatus: ['Kerusakan', 'Masalah Teknis'].includes(value) ? 'bengkel' : 'tersedia' } : {}) }));
  };
  const submit = async (event) => {
    event.preventDefault();
    if (submittingRef.current) return;
    if (!review) {
      if (!replacements.some((item) => item.id === Number(form.replacementBikeId))) { setError('Pilih unit pengganti yang tersedia.'); return; }
      if (form.reason === 'Lainnya' && !form.note.trim()) { setError('Catatan wajib diisi untuk alasan Lainnya.'); return; }
      setError('');
      setReview(true);
      return;
    }
    submittingRef.current = true;
    setBusy(true);
    try {
      const result = await onSubmit({
        ...form,
        rentalId: transaction.id,
        currentBikeId: bike.id,
        replacementBikeId: Number(form.replacementBikeId),
        expectedSwitchCount: (transaction.switchHistory || []).length,
      });
      if (result?.success) onClose();
      else setError(result?.error || 'Unit belum berhasil diganti. Coba lagi.');
    } catch {
      setError('Unit belum berhasil diganti. Periksa data lalu coba lagi.');
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  };

  return (
    <dialog ref={dialogRef} aria-labelledby="switch-unit-title" aria-busy={busy} onCancel={(event) => { event.preventDefault(); if (!submittingRef.current) onClose(); }} className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-lg bg-white p-0 text-slate-950 shadow-2xl backdrop:bg-slate-950/55 backdrop:backdrop-blur-sm">
      <form onSubmit={submit}>
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-5">
          <div><p className="text-[10px] font-black uppercase tracking-wide text-cyan-700">{review ? 'Review pergantian' : 'Rental aktif'}</p><h2 id="switch-unit-title" className="mt-1 flex items-center gap-2 text-xl font-black"><ArrowLeftRight size={20} /> Ganti Unit</h2></div>
          <button type="button" aria-label="Tutup Ganti Unit" disabled={busy} onClick={onClose} className="rounded-md p-3 text-slate-500 hover:bg-slate-100 disabled:opacity-50"><X size={18} /></button>
        </div>
        <div className="space-y-4 p-5">
          <dl className="grid min-w-0 grid-cols-2 gap-3 rounded-md bg-slate-50 p-3 text-xs">
            <div className="min-w-0"><dt className="font-bold text-slate-500">Rental</dt><dd className="mt-1 break-words font-black">{transaction.rentalCode || `#${transaction.id}`}</dd></div>
            <div className="min-w-0"><dt className="font-bold text-slate-500">Customer</dt><dd className="mt-1 break-words font-black">{transaction.customerName || 'Belum dicatat'}</dd></div>
            <div className="col-span-2"><dt className="font-bold text-slate-500">Unit saat ini</dt><dd className="mt-1 break-words font-black">{bike.number} / {bike.type}</dd></div>
          </dl>
          {review ? (
            <dl className="space-y-3 break-words text-sm">
              {[
                ['Unit pengganti', selectedBike ? `${selectedBike.number} / ${selectedBike.type}` : 'Unit tidak ditemukan'],
                ['Alasan', form.reason],
                ['Kondisi unit lama', OLD_UNIT_STATUSES.find((status) => status.id === form.oldBikeStatus)?.label],
                ['Catatan', form.note.trim() || 'Tanpa catatan'],
              ].map(([label, value]) => <div key={label}><dt className="text-xs font-bold text-slate-500">{label}</dt><dd className="mt-1 whitespace-pre-wrap font-black">{value}</dd></div>)}
              <p className="rounded-md bg-cyan-50 p-3 text-xs font-semibold text-cyan-900">Rental tetap aktif. Tarif, pembayaran, dan setoran yang sudah disepakati tetap sama.</p>
            </dl>
          ) : (
            <>
              <fieldset><legend className="mb-2 text-xs font-black">Unit pengganti</legend>
                <div className="relative"><Search size={16} className="absolute left-3 top-3.5 text-slate-400" /><input aria-label="Cari unit pengganti" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nomor atau tipe unit" className="w-full rounded-md border border-slate-200 py-3 pl-9 pr-3 text-sm" /></div>
                <div className="mt-2 max-h-48 space-y-2 overflow-y-auto p-1">
                  {filtered.map((item) => <label key={item.id} className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 text-xs ${Number(form.replacementBikeId) === item.id ? 'border-cyan-600 bg-cyan-50' : 'border-slate-200'}`}><input type="radio" name="replacementBikeId" aria-label={`${item.number} / ${item.type}`} checked={Number(form.replacementBikeId) === item.id} onChange={() => change('replacementBikeId', String(item.id))} /><span className="min-w-0"><span className="block break-words font-black">{item.number} / {item.type}</span><span className="mt-1 block font-semibold text-emerald-700">Tersedia</span></span></label>)}
                  {!filtered.length ? <p className="py-3 text-xs font-semibold text-slate-500">{replacements.length ? 'Tidak ada unit yang cocok.' : 'Belum ada unit pengganti yang tersedia.'}</p> : null}
                </div>
              </fieldset>
              <div><label htmlFor="switch-reason" className="mb-2 block text-xs font-black">Alasan pergantian</label><select id="switch-reason" value={form.reason} onChange={(event) => change('reason', event.target.value)} className="w-full rounded-md border border-slate-200 p-3 text-sm">{SWITCH_REASONS.map((reason) => <option key={reason}>{reason}</option>)}</select></div>
              <div><label htmlFor="switch-status" className="mb-2 block text-xs font-black">Kondisi unit lama</label><select id="switch-status" value={form.oldBikeStatus} onChange={(event) => change('oldBikeStatus', event.target.value)} className="w-full rounded-md border border-slate-200 p-3 text-sm">{OLD_UNIT_STATUSES.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}</select></div>
              <div><label htmlFor="switch-note" className="mb-2 block text-xs font-black">Catatan{form.reason === 'Lainnya' ? ' (wajib)' : ''}</label><textarea id="switch-note" value={form.note} onChange={(event) => change('note', event.target.value)} maxLength={1000} rows={3} className="w-full resize-none rounded-md border border-slate-200 p-3 text-sm" /></div>
            </>
          )}
          {error ? <p role="alert" className="rounded-md bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p> : null}
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 p-4">
          <button type="button" disabled={busy} onClick={onClose} className="rounded-md bg-slate-100 px-4 py-3 text-xs font-black disabled:opacity-50">Batal</button>
          {review ? <button type="button" disabled={busy} onClick={() => { setReview(false); setError(''); }} className="rounded-md bg-slate-100 px-4 py-3 text-xs font-black disabled:opacity-50">Ubah Pilihan</button> : null}
          <button type="submit" disabled={busy} className="rounded-md bg-cyan-700 px-4 py-3 text-xs font-black text-white hover:bg-cyan-800 disabled:opacity-50">{busy ? 'Menyimpan…' : review ? 'Konfirmasi Ganti Unit' : 'Tinjau Pergantian'}</button>
        </div>
      </form>
    </dialog>
  );
}
