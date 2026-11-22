import { useMemo, useRef, useState } from 'react';
import { Bike, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import Modal from '../components/Modal.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { getUnitRateSnapshot, UNIT_RATE_FIELDS } from '../lib/rentalPricing.js';
import { formatRentalDateTime } from '../lib/rentalDuration.js';
import RentalTimingInfo from '../components/RentalTimingInfo.jsx';
import { BIKE_STATUSES, STATUS_META } from '../data/seed.js';
import { formatCurrency, normalizeText } from '../lib/formatters.js';

const emptyForm = { number: '', type: '', status: 'tersedia', note: '', dailyRate: '', halfDayRate: '', dailyCost: '0', halfDayCost: '0' };
const filters = [
  { id: 'semua', label: 'Semua' },
  { id: 'tersedia', label: 'Tersedia' },
  { id: 'disewa', label: 'Disewa' },
  { id: 'bengkel', label: 'Bengkel' },
  { id: 'hilang', label: 'Hilang' },
];

export default function FleetPage({ activeRentals, now, dueSoonHours, bikes, bikeTypes, suggestedUnitNumber, onSaveBike, onDeleteBike, onStatusChange }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('semua');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingBike, setEditingBike] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const submittingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteBike, setDeleteBike] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  const confirmDelete = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const result = await onDeleteBike(deleteBike.id);
      if (result?.success) setDeleteBike(null);
      else setDeleteError(result?.error || 'Unit tidak dapat dihapus.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const rentalsByBike = useMemo(() => new Map(activeRentals.map(({ bike, transaction }) => [bike.id, transaction])), [activeRentals]);
  const filteredBikes = useMemo(() => {
    const query = normalizeText(search);
    return bikes.filter((bike) => {
      const matchesStatus = statusFilter === 'semua' || bike.status === statusFilter;
      const matchesSearch = !query || [bike.number, bike.type, bike.note, bike.status].some((value) => normalizeText(value).includes(query));
      return matchesStatus && matchesSearch;
    });
  }, [bikes, search, statusFilter]);

  const openCreate = () => {
    setIsEditorOpen(true);
    setEditingBike(null);
    setForm({ ...emptyForm, number: suggestedUnitNumber });
    setError('');
  };

  const openEdit = (bike) => {
    setIsEditorOpen(true);
    setEditingBike(bike);
    setForm({ number: bike.number, type: bike.type, status: bike.status, note: bike.note || '', ...Object.fromEntries(UNIT_RATE_FIELDS.map((field) => [field, bike[field] ?? ''])) });
    setError('');
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    setEditingBike(null);
    setForm(emptyForm);
    setError('');
  };

  const submit = async (event) => {
    event.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const result = await onSaveBike(form, editingBike?.id, editingBike?.status, editingBike ? getUnitRateSnapshot(editingBike) : null);
      if (result?.error) { setError(result.error); return; }
      closeEditor();
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="flex flex-col gap-2.5 rounded-lg border border-slate-200 bg-white p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row">
          <div className="relative min-w-0 flex-1 lg:max-w-md">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Cari armada" placeholder="Cari nomor unit, tipe, atau catatan" className="w-full rounded-md border border-slate-200 py-3 pl-10 pr-3 text-sm font-bold outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" />
          </div>
          <div className="flex flex-wrap gap-1" role="group" aria-label="Filter status armada">
            {filters.map((filter) => (
              <button key={filter.id} type="button" onClick={() => setStatusFilter(filter.id)} aria-pressed={statusFilter === filter.id} className={`shrink-0 rounded-md px-2 py-1.5 text-xs font-black transition ${statusFilter === filter.id ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>{filter.label}</button>
            ))}
          </div>
        </div>
        <button type="button" onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-md bg-cyan-700 px-4 py-3 text-sm font-black text-white transition hover:bg-cyan-800"><Plus size={17} /> Tambah Unit</button>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div><h2 className="text-sm font-black text-slate-950">Katalog Armada</h2><p className="mt-1 text-xs font-semibold text-slate-500">{filteredBikes.length} dari {bikes.length} unit</p></div>
          <span className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-600">Kontrol langsung</span>
        </div>
        {filteredBikes.length > 0 ? (
          <div className="overflow-x-auto">
            <table role="table" aria-label="Katalog Armada" className="responsive-table w-full border-collapse text-left">
              <thead role="rowgroup"><tr role="row" className="border-b border-slate-200 bg-slate-50"><th scope="col" role="columnheader" className="px-5 py-3 text-[11px] font-black uppercase tracking-wide text-slate-500">Unit</th><th scope="col" role="columnheader" className="px-5 py-3 text-[11px] font-black uppercase tracking-wide text-slate-500">Tipe & Catatan</th><th scope="col" role="columnheader" className="px-5 py-3 text-[11px] font-black uppercase tracking-wide text-slate-500">Rate Harian</th><th scope="col" role="columnheader" className="px-5 py-3 text-[11px] font-black uppercase tracking-wide text-slate-500">Status</th><th scope="col" role="columnheader" className="px-5 py-3 text-right text-[11px] font-black uppercase tracking-wide text-slate-500">Aksi</th></tr></thead>
              <tbody role="rowgroup" className="divide-y divide-slate-100">
                {filteredBikes.map((bike) => (
                  <tr role="row" key={bike.id} className="transition hover:bg-slate-50">
                    <td role="cell" data-label="Unit" className="px-5 py-4"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-slate-700"><Bike size={17} /></div><div><span className="font-black text-slate-950">{bike.number}</span><RentalTimingInfo transaction={rentalsByBike.get(bike.id)} now={now} dueSoonHours={dueSoonHours} compact /></div></div></td>
                    <td role="cell" data-label="Tipe & Catatan" className="px-5 py-4"><p className="text-sm font-black text-slate-800">{bike.type}</p><p className="mt-1 max-w-[360px] [overflow-wrap:anywhere] text-xs font-semibold text-slate-500">{bike.note || 'Tanpa catatan'}</p></td>
                    <td role="cell" data-label="Rate Harian" className="px-5 py-4"><p className="text-sm font-black text-emerald-700">{bike.dailyRate == null ? 'Belum diatur' : `${formatCurrency(bike.dailyRate)} / hari`}</p><p className="mt-1 text-[11px] font-bold text-slate-600">½ hari: {bike.halfDayRate == null ? 'Belum diatur' : formatCurrency(bike.halfDayRate)}</p><p className="mt-1 text-[11px] font-bold text-slate-600">Modal / hari: {bike.dailyCost == null ? 'Belum diatur' : formatCurrency(bike.dailyCost)}</p>{bike.rateHistory?.length ? <details className="mt-2 text-xs"><summary className="cursor-pointer font-bold text-cyan-800">Riwayat Rate</summary>{bike.rateHistory.map((event, index) => <p key={index} className="mt-2">{formatRentalDateTime(event.changedAt)} · Harian {event.previous?.dailyRate == null ? 'Belum diatur' : formatCurrency(event.previous.dailyRate)} → {event.next.dailyRate == null ? 'Belum diatur' : formatCurrency(event.next.dailyRate)} · ½ hari {event.previous?.halfDayRate == null ? 'Belum diatur' : formatCurrency(event.previous.halfDayRate)} → {event.next.halfDayRate == null ? 'Belum diatur' : formatCurrency(event.next.halfDayRate)}</p>)}</details> : null}</td>
                    <td role="cell" data-label="Status" className="px-5 py-4"><select value={bike.status} onChange={(event) => onStatusChange(bike.id, event.target.value)} aria-label={`Status ${bike.number}`} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100">{BIKE_STATUSES.map((status) => <option key={status} value={status} disabled={status === 'disewa' && bike.status !== 'disewa'}>{status === 'disewa' && bike.status !== 'disewa' ? 'Disewa (via Rental)' : STATUS_META[status].selectLabel}</option>)}</select></td>
                    <td role="cell" data-label="Aksi" className="px-5 py-4"><div className="flex justify-end gap-2"><button type="button" onClick={() => openEdit(bike)} className="inline-flex items-center gap-1.5 rounded-md bg-cyan-50 px-3 py-2 text-xs font-black text-cyan-700 hover:bg-cyan-100"><Pencil size={14} /> Edit</button><button type="button" onClick={() => { setDeleteError(''); setDeleteBike(bike); }} className="inline-flex items-center gap-1.5 rounded-md bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 hover:bg-rose-100"><Trash2 size={14} /> Hapus</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="p-6"><EmptyState icon={Search} title="Unit tidak ditemukan" action={<button type="button" onClick={() => { setSearch(''); setStatusFilter('semua'); }} className="rounded-md bg-slate-950 px-4 py-2 text-xs font-black text-white">Reset Filter</button>} /></div>}
      </section>

      {isEditorOpen ? (
        <Modal className="max-w-lg" onClose={closeEditor} busy={submitting} aria-labelledby="fleet-editor-title">
          <form onSubmit={submit}>
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 id="fleet-editor-title" className="text-base font-black text-slate-950">{editingBike ? 'Edit Unit' : 'Tambah Unit'}</h2><p className="mt-1 text-xs font-semibold text-slate-500">Data armada dan status operasional</p></div><button type="button" onClick={closeEditor} disabled={submitting} className="rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label="Tutup"><X size={18} /></button></div>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <div><label htmlFor="fleet-number" className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-500">Nomor Unit</label><input id="fleet-number" data-initial-focus required type="text" value={form.number} onChange={(event) => setForm({ ...form, number: event.target.value })} placeholder={suggestedUnitNumber} className="w-full rounded-md border border-slate-200 px-3 py-3 text-sm font-bold uppercase outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /><p className="mt-1.5 text-[11px] font-semibold text-slate-500">Saran berikutnya: {suggestedUnitNumber}</p></div>
              <div><label htmlFor="fleet-type" className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-500">Tipe Sepeda</label><input id="fleet-type" required type="text" list="fleet-types" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} placeholder="Mountain Bike" className="w-full rounded-md border border-slate-200 px-3 py-3 text-sm font-bold outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /><datalist id="fleet-types">{bikeTypes.map((type) => <option key={type} value={type} />)}</datalist></div>
              <div><label htmlFor="fleet-status" className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-500">Status</label><select id="fleet-status" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className="w-full rounded-md border border-slate-200 px-3 py-3 text-sm font-bold outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100">{BIKE_STATUSES.map((status) => <option key={status} value={status} disabled={status === 'disewa' && editingBike?.status !== 'disewa'}>{status === 'disewa' && editingBike?.status !== 'disewa' ? 'Disewa (via Rental)' : STATUS_META[status].selectLabel}</option>)}</select></div>
              <p className="text-xs font-semibold text-slate-500 sm:col-span-2">Rate per unit untuk rental baru. Kosong berarti belum diatur; modal 0 berarti tidak ada biaya. Perubahan tidak mengubah kontrak yang sudah dibuat.</p>
              {[['dailyRate', 'Rate Harian'], ['halfDayRate', 'Rate ½ Hari'], ['dailyCost', 'Modal Harian'], ['halfDayCost', 'Modal ½ Hari']].map(([field, label]) => <div key={field}><label htmlFor={`fleet-${field}`} className="mb-1.5 block text-xs font-black text-slate-600">{label}</label><input id={`fleet-${field}`} type="number" min="0" step="1" value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} placeholder={field.includes('Cost') ? '0 jika tidak ada' : 'Belum diatur'} className="w-full rounded-md border border-slate-200 p-3 text-sm font-bold" /></div>)}
              <div className="sm:col-span-2"><label htmlFor="fleet-note" className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-500">Catatan</label><textarea id="fleet-note" rows="3" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="Kondisi, lokasi, atau informasi unit" className="w-full resize-none rounded-md border border-slate-200 px-3 py-3 text-sm font-semibold outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /></div>
              {error ? <p className="rounded-md bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 sm:col-span-2" role="alert">{error}</p> : null}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4"><button type="button" onClick={closeEditor} disabled={submitting} className="rounded-md bg-slate-100 px-4 py-2.5 text-xs font-black text-slate-700">Batal</button><button type="submit" disabled={submitting} className="rounded-md bg-slate-950 px-5 py-2.5 text-xs font-black text-white hover:bg-cyan-700">Simpan Unit</button></div>
          </form>
        </Modal>
      ) : null}

      {deleteBike ? (
        <Modal className="max-w-sm p-5" role="alertdialog" aria-labelledby="delete-bike-title" onClose={() => setDeleteBike(null)} busy={submitting}>
          <h2 id="delete-bike-title" className="text-base font-black">Hapus {deleteBike.number}?</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Unit akan dihapus dari katalog armada.</p>
          {deleteError ? <p role="alert" className="mt-3 text-sm font-bold text-rose-700">{deleteError}</p> : null}
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" data-initial-focus disabled={submitting} onClick={() => setDeleteBike(null)} className="rounded-md bg-slate-100 px-4 py-2.5 text-xs font-black">Batal</button>
            <button type="button" disabled={submitting} onClick={confirmDelete} className="rounded-md bg-rose-600 px-4 py-2.5 text-xs font-black text-white">Hapus Unit</button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
