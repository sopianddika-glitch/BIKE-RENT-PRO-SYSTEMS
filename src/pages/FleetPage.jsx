import { useMemo, useState } from 'react';
import { Bike, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import EmptyState from '../components/EmptyState.jsx';
import { BIKE_STATUSES, STATUS_META } from '../data/seed.js';
import { formatCurrency, normalizeText } from '../lib/formatters.js';

const emptyForm = { number: '', type: '', status: 'tersedia', note: '' };
const filters = [
  { id: 'semua', label: 'Semua' },
  { id: 'tersedia', label: 'Tersedia' },
  { id: 'disewa', label: 'Disewa' },
  { id: 'bengkel', label: 'Bengkel' },
  { id: 'hilang', label: 'Hilang' },
];

export default function FleetPage({ bikes, getRate, onSaveBike, onDeleteBike, onStatusChange }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('semua');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingBike, setEditingBike] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [deleteBike, setDeleteBike] = useState(null);

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
    setForm(emptyForm);
    setError('');
  };

  const openEdit = (bike) => {
    setIsEditorOpen(true);
    setEditingBike(bike);
    setForm({ number: bike.number, type: bike.type, status: bike.status, note: bike.note || '' });
    setError('');
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    setEditingBike(null);
    setForm(emptyForm);
    setError('');
  };

  const submit = (event) => {
    event.preventDefault();
    const result = onSaveBike(form, editingBike?.id);
    if (result?.error) {
      setError(result.error);
      return;
    }
    closeEditor();
  };

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row">
          <div className="relative min-w-0 flex-1 lg:max-w-md">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Cari armada" placeholder="Cari nomor unit, tipe, atau catatan" className="w-full rounded-md border border-slate-200 py-3 pl-10 pr-3 text-sm font-bold outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" />
          </div>
          <div className="flex gap-1 overflow-x-auto" role="group" aria-label="Filter status armada">
            {filters.map((filter) => (
              <button key={filter.id} type="button" onClick={() => setStatusFilter(filter.id)} aria-pressed={statusFilter === filter.id} className={`shrink-0 rounded-md px-3 py-2 text-xs font-black transition ${statusFilter === filter.id ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>{filter.label}</button>
            ))}
          </div>
        </div>
        <button type="button" onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-md bg-cyan-700 px-4 py-3 text-sm font-black text-white transition hover:bg-cyan-800"><Plus size={17} /> Tambah Unit</button>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div><h2 className="text-sm font-black text-slate-950">Katalog Armada</h2><p className="mt-1 text-xs font-semibold text-slate-500">{filteredBikes.length} dari {bikes.length} unit</p></div>
          <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-600">Kontrol langsung</span>
        </div>
        {filteredBikes.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] border-collapse text-left">
              <thead><tr className="border-b border-slate-200 bg-slate-50"><th className="px-5 py-3 text-[10px] font-black uppercase tracking-wide text-slate-500">Unit</th><th className="px-5 py-3 text-[10px] font-black uppercase tracking-wide text-slate-500">Tipe & Catatan</th><th className="px-5 py-3 text-[10px] font-black uppercase tracking-wide text-slate-500">Harga Tamu</th><th className="px-5 py-3 text-[10px] font-black uppercase tracking-wide text-slate-500">Status</th><th className="px-5 py-3 text-right text-[10px] font-black uppercase tracking-wide text-slate-500">Aksi</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBikes.map((bike) => (
                  <tr key={bike.id} className="transition hover:bg-slate-50">
                    <td className="px-5 py-4"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-slate-700"><Bike size={17} /></div><span className="font-black text-slate-950">{bike.number}</span></div></td>
                    <td className="px-5 py-4"><p className="text-sm font-black text-slate-800">{bike.type}</p><p className="mt-1 max-w-[360px] truncate text-xs font-semibold text-slate-500">{bike.note || 'Tanpa catatan'}</p></td>
                    <td className="px-5 py-4"><p className="text-sm font-black text-emerald-700">{formatCurrency(getRate(bike.type).price)}</p><p className="mt-1 text-[10px] font-bold text-slate-600">Modal {formatCurrency(getRate(bike.type).cost)}</p></td>
                    <td className="px-5 py-4"><select value={bike.status} onChange={(event) => onStatusChange(bike.id, event.target.value)} aria-label={`Status ${bike.number}`} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100">{BIKE_STATUSES.map((status) => <option key={status} value={status}>{STATUS_META[status].selectLabel}</option>)}</select></td>
                    <td className="px-5 py-4"><div className="flex justify-end gap-2"><button type="button" onClick={() => openEdit(bike)} className="inline-flex items-center gap-1.5 rounded-md bg-cyan-50 px-3 py-2 text-xs font-black text-cyan-700 hover:bg-cyan-100"><Pencil size={14} /> Edit</button><button type="button" onClick={() => setDeleteBike(bike)} className="inline-flex items-center gap-1.5 rounded-md bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 hover:bg-rose-100"><Trash2 size={14} /> Hapus</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="p-6"><EmptyState icon={Search} title="Unit tidak ditemukan" action={<button type="button" onClick={() => { setSearch(''); setStatusFilter('semua'); }} className="rounded-md bg-slate-950 px-4 py-2 text-xs font-black text-white">Reset Filter</button>} /></div>}
      </section>

      {isEditorOpen ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="fleet-editor-title">
          <form onSubmit={submit} className="w-full max-w-lg rounded-t-lg bg-white shadow-2xl sm:rounded-lg">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 id="fleet-editor-title" className="text-base font-black text-slate-950">{editingBike ? 'Edit Unit' : 'Tambah Unit'}</h2><p className="mt-1 text-xs font-semibold text-slate-500">Data armada dan status operasional</p></div><button type="button" onClick={closeEditor} className="rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label="Tutup"><X size={18} /></button></div>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <div><label htmlFor="fleet-number" className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-500">Nomor Unit</label><input id="fleet-number" type="text" value={form.number} onChange={(event) => setForm({ ...form, number: event.target.value })} placeholder="S-008" className="w-full rounded-md border border-slate-200 px-3 py-3 text-sm font-bold uppercase outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /></div>
              <div><label htmlFor="fleet-type" className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-500">Tipe Sepeda</label><input id="fleet-type" type="text" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} placeholder="Mountain Bike" className="w-full rounded-md border border-slate-200 px-3 py-3 text-sm font-bold outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /></div>
              <div><label htmlFor="fleet-status" className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-500">Status</label><select id="fleet-status" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className="w-full rounded-md border border-slate-200 px-3 py-3 text-sm font-bold outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100">{BIKE_STATUSES.map((status) => <option key={status} value={status}>{STATUS_META[status].selectLabel}</option>)}</select></div>
              <div className="sm:col-span-2"><label htmlFor="fleet-note" className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-500">Catatan</label><textarea id="fleet-note" rows="3" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="Kondisi, lokasi, atau informasi unit" className="w-full resize-none rounded-md border border-slate-200 px-3 py-3 text-sm font-semibold outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /></div>
              {error ? <p className="rounded-md bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 sm:col-span-2" role="alert">{error}</p> : null}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4"><button type="button" onClick={closeEditor} className="rounded-md bg-slate-100 px-4 py-2.5 text-xs font-black text-slate-700">Batal</button><button type="submit" className="rounded-md bg-slate-950 px-5 py-2.5 text-xs font-black text-white hover:bg-cyan-700">Simpan Unit</button></div>
          </form>
        </div>
      ) : null}

      {deleteBike ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" role="alertdialog" aria-modal="true" aria-labelledby="delete-bike-title">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-2xl"><div className="flex h-10 w-10 items-center justify-center rounded-md bg-rose-50 text-rose-700"><Trash2 size={19} /></div><h2 id="delete-bike-title" className="mt-4 text-base font-black text-slate-950">Hapus {deleteBike.number}?</h2><p className="mt-2 text-sm font-semibold leading-6 text-slate-500">Unit akan dihapus dari katalog armada.</p><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setDeleteBike(null)} className="rounded-md bg-slate-100 px-4 py-2.5 text-xs font-black text-slate-700">Batal</button><button type="button" onClick={() => { if (onDeleteBike(deleteBike.id) !== false) setDeleteBike(null); }} className="rounded-md bg-rose-600 px-4 py-2.5 text-xs font-black text-white">Hapus Unit</button></div></div>
        </div>
      ) : null}
    </div>
  );
}
