import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bike,
  CalendarDays,
  Check,
  CheckCircle2,
  ListChecks,
  Phone,
  Search,
  StickyNote,
  UserRound,
  X,
} from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/formatters.js';

const steps = [
  { id: 1, label: 'Pilih Unit' },
  { id: 2, label: 'Data Tamu' },
  { id: 3, label: 'Konfirmasi' },
];

export default function RentalDialog({
  open,
  availableBikes,
  form,
  error,
  getRate,
  onChange,
  onSubmit,
  onClose,
}) {
  const [step, setStep] = useState(1);
  const [search, setSearch] = useState('');
  const [localError, setLocalError] = useState('');
  const dialogRef = useRef(null);

  const selectedIds = useMemo(() => new Set(form.bikeIds.map(Number)), [form.bikeIds]);
  const selectedBikes = useMemo(
    () => availableBikes.filter((bike) => selectedIds.has(bike.id)),
    [availableBikes, selectedIds],
  );
  const filteredBikes = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('id-ID');
    if (!query) return availableBikes;
    return availableBikes.filter((bike) => [bike.number, bike.type, bike.note].some((value) => String(value || '').toLocaleLowerCase('id-ID').includes(query)));
  }, [availableBikes, search]);

  const totals = useMemo(() => selectedBikes.reduce((summary, bike) => {
    const rate = getRate(bike.type);
    const price = Number(form.prices[bike.id] ?? rate.price) || 0;
    summary.price += price;
    summary.cost += Number(rate.cost || 0);
    summary.profit += price - Number(rate.cost || 0);
    return summary;
  }, { price: 0, cost: 0, profit: 0 }), [form.prices, getRate, selectedBikes]);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(dialogRef.current?.querySelectorAll('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])') || [])
        .filter((element) => element.getClientRects().length > 0);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [onClose, open]);

  useEffect(() => {
    if (open) {
      setStep(1);
      setLocalError('');
    }
  }, [open]);

  if (!open) return null;

  const toggleBike = (bikeId) => {
    const nextIds = selectedIds.has(bikeId)
      ? form.bikeIds.filter((id) => Number(id) !== bikeId)
      : [...form.bikeIds, bikeId];
    onChange('bikeIds', nextIds);
    setLocalError('');
  };

  const allFilteredSelected = filteredBikes.length > 0 && filteredBikes.every((bike) => selectedIds.has(bike.id));
  const toggleAllFiltered = () => {
    const filteredIds = new Set(filteredBikes.map((bike) => bike.id));
    const nextIds = allFilteredSelected
      ? form.bikeIds.filter((id) => !filteredIds.has(Number(id)))
      : Array.from(new Set([...form.bikeIds.map(Number), ...filteredIds]));
    onChange('bikeIds', nextIds);
    setLocalError('');
  };

  const goForward = () => {
    if (step === 1 && selectedBikes.length === 0) {
      setLocalError('Pilih minimal satu unit untuk melanjutkan.');
      return;
    }
    if (step === 2 && (!form.customerName.trim() || !form.date)) {
      setLocalError('Nama tamu dan tanggal sewa wajib diisi.');
      return;
    }
    setLocalError('');
    setStep((current) => Math.min(3, current + 1));
  };

  const submit = (event) => {
    if (step < 3) {
      event.preventDefault();
      goForward();
      return;
    }
    const result = onSubmit(event);
    if (result?.success) {
      setStep(1);
      setSearch('');
      setLocalError('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <form ref={dialogRef} onSubmit={submit} className="flex max-h-[96vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-lg bg-white shadow-2xl sm:max-h-[90vh] sm:rounded-lg" role="dialog" aria-modal="true" aria-labelledby="rental-dialog-title">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-700">Penyewaan Cepat</p>
            <h2 id="rental-dialog-title" className="mt-1 text-xl font-black text-slate-950">Penyewaan Baru</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950" aria-label="Tutup penyewaan"><X size={19} /></button>
        </div>

        <ol className="grid grid-cols-3 border-b border-slate-200 bg-slate-50 px-3 sm:px-6" aria-label="Tahapan penyewaan">
          {steps.map((item) => {
            const complete = item.id < step;
            const active = item.id === step;
            return (
              <li key={item.id} className={`flex min-w-0 items-center justify-center gap-2 border-b-2 px-2 py-3 text-[10px] font-black uppercase sm:text-xs ${active ? 'border-cyan-600 text-cyan-800' : complete ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-slate-600'}`} aria-current={active ? 'step' : undefined}>
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${active ? 'bg-cyan-700 text-white' : complete ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>{complete ? <Check size={14} /> : item.id}</span>
                <span className="truncate">{item.label}</span>
              </li>
            );
          })}
        </ol>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
          {step === 1 ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative min-w-0 flex-1">
                  <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input autoFocus type="search" value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Cari unit tersedia" placeholder="Cari nomor atau tipe sepeda" className="w-full rounded-md border border-slate-200 py-3 pl-10 pr-3 text-sm font-bold outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" />
                </div>
                <button type="button" onClick={toggleAllFiltered} disabled={!filteredBikes.length} className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-100 px-4 py-3 text-xs font-black text-slate-800 transition hover:bg-slate-200 disabled:opacity-50"><ListChecks size={16} /> {allFilteredSelected ? 'Batalkan Semua' : 'Pilih Semua'}</button>
              </div>

              {filteredBikes.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredBikes.map((bike) => {
                    const selected = selectedIds.has(bike.id);
                    const rate = getRate(bike.type);
                    return (
                      <button key={bike.id} type="button" onClick={() => toggleBike(bike.id)} aria-pressed={selected} aria-label={`${selected ? 'Batalkan pilihan' : 'Pilih'} ${bike.number} / ${bike.type}`} className={`relative min-h-32 rounded-md border p-4 text-left transition ${selected ? 'border-cyan-500 bg-cyan-50 ring-2 ring-cyan-100' : 'border-slate-200 bg-white hover:border-cyan-300 hover:bg-slate-50'}`}>
                        <span className={`absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-md border ${selected ? 'border-cyan-700 bg-cyan-700 text-white' : 'border-slate-300 bg-white text-transparent'}`}><Check size={14} /></span>
                        <Bike size={19} className={selected ? 'text-cyan-700' : 'text-slate-500'} />
                        <p className="mt-3 font-black text-slate-950">{bike.number}</p>
                        <p className="mt-1 truncate text-xs font-semibold text-slate-600">{bike.type}</p>
                        <p className="mt-3 text-sm font-black text-emerald-700">{formatCurrency(rate.price)}</p>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm font-bold text-slate-600">Unit tidak ditemukan</div>
              )}
            </div>
          ) : null}

          {step === 2 ? (
            <div className="mx-auto grid max-w-2xl gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><label htmlFor="bulk-rental-customer" className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-600">Nama Tamu</label><div className="relative"><UserRound size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input autoFocus id="bulk-rental-customer" type="text" value={form.customerName} onChange={(event) => onChange('customerName', event.target.value)} placeholder="Nama penyewa" className="w-full rounded-md border border-slate-200 py-3 pl-10 pr-3 text-sm font-bold outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /></div></div>
              <div><label htmlFor="bulk-rental-contact" className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-600">Kontak</label><div className="relative"><Phone size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input id="bulk-rental-contact" type="tel" value={form.customerContact} onChange={(event) => onChange('customerContact', event.target.value)} placeholder="Nomor telepon" className="w-full rounded-md border border-slate-200 py-3 pl-10 pr-3 text-sm font-bold outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /></div></div>
              <div><label htmlFor="bulk-rental-date" className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-600">Tanggal Sewa</label><div className="relative"><CalendarDays size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input id="bulk-rental-date" type="date" value={form.date} onChange={(event) => onChange('date', event.target.value)} className="w-full rounded-md border border-slate-200 py-3 pl-10 pr-3 text-sm font-bold outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /></div></div>
              <div className="sm:col-span-2"><label htmlFor="bulk-rental-note" className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-600">Catatan</label><div className="relative"><StickyNote size={17} className="absolute left-3 top-3 text-slate-500" /><textarea id="bulk-rental-note" rows="3" value={form.note} onChange={(event) => onChange('note', event.target.value)} placeholder="Jaminan, tujuan, atau kondisi khusus" className="w-full resize-none rounded-md border border-slate-200 py-3 pl-10 pr-3 text-sm font-semibold outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /></div></div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-5">
              <div className="grid overflow-hidden rounded-md border border-slate-200 bg-slate-50 sm:grid-cols-3">
                <div className="border-b border-slate-200 p-4 sm:border-b-0 sm:border-r"><p className="text-[9px] font-black uppercase tracking-wide text-slate-600">Tamu</p><p className="mt-1 truncate text-sm font-black text-slate-950">{form.customerName}</p></div>
                <div className="border-b border-slate-200 p-4 sm:border-b-0 sm:border-r"><p className="text-[9px] font-black uppercase tracking-wide text-slate-600">Jumlah Unit</p><p className="mt-1 text-sm font-black text-slate-950">{selectedBikes.length} sepeda</p></div>
                <div className="p-4"><p className="text-[9px] font-black uppercase tracking-wide text-slate-600">Tanggal</p><p className="mt-1 text-sm font-black text-slate-950">{formatDate(form.date)}</p></div>
              </div>

              <div className="overflow-hidden rounded-md border border-slate-200">
                <div className="grid grid-cols-[1fr_132px] border-b border-slate-200 bg-slate-50 px-4 py-3 text-[9px] font-black uppercase tracking-wide text-slate-600"><span>Unit</span><span>Harga Tamu</span></div>
                <div className="divide-y divide-slate-100">
                  {selectedBikes.map((bike) => {
                    const rate = getRate(bike.type);
                    return (
                      <div key={bike.id} className="grid grid-cols-[1fr_132px] items-center gap-3 px-4 py-3">
                        <div className="min-w-0"><p className="font-black text-slate-950">{bike.number}</p><p className="mt-1 truncate text-xs font-semibold text-slate-600">{bike.type} / Modal {formatCurrency(rate.cost)}</p></div>
                        <input type="number" min="1000" step="1000" value={form.prices[bike.id] ?? rate.price} onChange={(event) => onChange('price', { bikeId: bike.id, amount: event.target.value })} aria-label={`Harga ${bike.number}`} className="w-full rounded-md border border-slate-200 px-3 py-2.5 text-right text-sm font-black outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid overflow-hidden rounded-md bg-slate-950 text-white sm:grid-cols-3">
                <div className="border-b border-white/10 p-4 sm:border-b-0 sm:border-r"><p className="text-[9px] font-black uppercase tracking-wide text-cyan-300">Total Tamu</p><p className="mt-1 text-xl font-black">{formatCurrency(totals.price)}</p></div>
                <div className="border-b border-white/10 p-4 sm:border-b-0 sm:border-r"><p className="text-[9px] font-black uppercase tracking-wide text-rose-300">Total Modal</p><p className="mt-1 text-xl font-black">{formatCurrency(totals.cost)}</p></div>
                <div className="p-4"><p className="text-[9px] font-black uppercase tracking-wide text-emerald-300">Estimasi Laba</p><p className="mt-1 text-xl font-black">{formatCurrency(totals.profit)}</p></div>
              </div>
            </div>
          ) : null}

          {localError || error ? <p className="mt-4 rounded-md bg-rose-50 px-4 py-3 text-xs font-bold text-rose-800" role="alert">{localError || error}</p> : null}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:px-6">
          {step === 1 ? <button type="button" onClick={onClose} className="rounded-md px-3 py-2.5 text-xs font-black text-slate-700 hover:bg-slate-100">Batal</button> : <button type="button" onClick={() => { setLocalError(''); setStep((current) => Math.max(1, current - 1)); }} className="inline-flex items-center gap-2 rounded-md px-3 py-2.5 text-xs font-black text-slate-700 hover:bg-slate-100"><ArrowLeft size={15} /> Kembali</button>}
          <div className="flex items-center gap-3">
            <span className="hidden text-xs font-bold text-slate-600 sm:inline">{selectedBikes.length} unit dipilih</span>
            {step < 3 ? <button type="submit" className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-4 py-3 text-xs font-black text-white transition hover:bg-cyan-800">{step === 1 ? 'Lanjut ke Pelanggan' : 'Tinjau Transaksi'} <ArrowRight size={15} /></button> : <button type="submit" className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-4 py-3 text-xs font-black text-white transition hover:bg-emerald-800"><CheckCircle2 size={16} /> Aktifkan {selectedBikes.length} Unit</button>}
          </div>
        </div>
      </form>
    </div>
  );
}
