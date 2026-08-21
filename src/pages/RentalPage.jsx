import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, Bike, Plus, RefreshCw, Search, UsersRound, WalletCards } from 'lucide-react';
import EmptyState from '../components/EmptyState.jsx';
import RentalDialog from '../components/RentalDialog.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { formatCurrency, formatDate } from '../lib/formatters.js';

export default function RentalPage({
  availableBikes,
  activeRentals,
  form,
  error,
  getRate,
  openRequest,
  onOpenRequestHandled,
  onChange,
  onSubmit,
  onReturnBike,
  onReturnBikes,
  onNavigate,
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const closeDialog = useCallback(() => setIsDialogOpen(false), []);

  useEffect(() => {
    if (openRequest) {
      setIsDialogOpen(true);
      onOpenRequestHandled();
    }
  }, [onOpenRequestHandled, openRequest]);

  const rentalGroups = useMemo(() => {
    const groups = new Map();
    activeRentals.forEach(({ bike, transaction }) => {
      const groupId = transaction?.rentalGroupId || `single-${bike.id}`;
      if (!groups.has(groupId)) {
        groups.set(groupId, {
          id: groupId,
          code: transaction?.rentalCode || 'Sewa Aktif',
          customerName: transaction?.customerName || 'Belum dicatat',
          customerContact: transaction?.customerContact || '',
          date: transaction?.date || '',
          items: [],
        });
      }
      groups.get(groupId).items.push({ bike, transaction });
    });
    return Array.from(groups.values());
  }, [activeRentals]);

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950 text-white shadow-xl shadow-slate-950/10">
        <div className="grid lg:grid-cols-[1fr_auto]">
          <div className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-300">Transaksi Multi-unit</p>
              <span className="rounded bg-white/10 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-slate-200">Data tamu satu kali</span>
            </div>
            <div className="mt-4 flex flex-wrap items-end gap-x-8 gap-y-3">
              <div><p className="text-4xl font-black">{availableBikes.length}</p><p className="mt-1 text-xs font-bold text-slate-300">unit tersedia</p></div>
              <div><p className="text-4xl font-black">{rentalGroups.length}</p><p className="mt-1 text-xs font-bold text-slate-300">pesanan aktif</p></div>
              <div><p className="text-4xl font-black text-cyan-300">{activeRentals.length}</p><p className="mt-1 text-xs font-bold text-slate-300">unit di pelanggan</p></div>
            </div>
          </div>
          <div className="grid border-t border-white/10 sm:grid-cols-2 lg:w-[430px] lg:border-l lg:border-t-0">
            <button type="button" onClick={() => setIsDialogOpen(true)} disabled={!availableBikes.length} className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-5 text-left transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50 sm:border-b-0 sm:border-r">
              <span><span className="block text-[10px] font-black uppercase tracking-wide text-emerald-300">Utama</span><span className="mt-1 block text-sm font-black">Buat Penyewaan</span></span><Plus size={19} />
            </button>
            <button type="button" onClick={() => onNavigate('fleet')} className="flex items-center justify-between gap-4 px-5 py-5 text-left transition hover:bg-white/5">
              <span><span className="block text-[10px] font-black uppercase tracking-wide text-cyan-300">Katalog</span><span className="mt-1 block text-sm font-black">Buka Armada</span></span><ArrowRight size={19} />
            </button>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div><h2 className="text-base font-black text-slate-950">Pesanan Aktif</h2><p className="mt-1 text-xs font-semibold text-slate-600">{rentalGroups.length} pesanan / {activeRentals.length} unit</p></div>
          <button type="button" onClick={() => setIsDialogOpen(true)} disabled={!availableBikes.length} className="inline-flex items-center justify-center gap-2 rounded-md bg-cyan-700 px-4 py-3 text-xs font-black text-white transition hover:bg-cyan-800 disabled:bg-slate-300"><Plus size={16} /> Penyewaan Baru</button>
        </div>

        {rentalGroups.length > 0 ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {rentalGroups.map((group) => {
              const total = group.items.reduce((sum, item) => sum + Number(item.transaction?.amount || 0), 0);
              const bikeIds = group.items.map((item) => item.bike.id);
              return (
                <article key={group.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                  <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2"><span className="rounded bg-slate-950 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-white">{group.code}</span><span className="text-xs font-black text-cyan-700">{group.items.length} unit</span></div>
                      <h3 className="mt-3 truncate text-base font-black text-slate-950">{group.customerName}</h3>
                      <p className="mt-1 text-xs font-semibold text-slate-600">{group.customerContact || 'Tanpa kontak'}{group.date ? ` / ${formatDate(group.date)}` : ''}</p>
                    </div>
                    <div className="shrink-0 sm:text-right"><p className="text-[9px] font-black uppercase tracking-wide text-slate-600">Total Tamu</p><p className="mt-1 text-lg font-black text-emerald-700">{formatCurrency(total)}</p></div>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {group.items.map(({ bike, transaction }) => (
                      <div key={bike.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-cyan-50 text-cyan-700"><Bike size={19} /></div>
                          <div className="min-w-0"><div className="flex items-center gap-2"><p className="font-black text-slate-950">{bike.number}</p><StatusBadge status="disewa" /></div><p className="mt-1 truncate text-xs font-semibold text-slate-600">{bike.type} / {formatCurrency(transaction?.amount || 0)}</p></div>
                        </div>
                        <button type="button" onClick={() => onReturnBike(bike.id)} className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-800 transition hover:bg-emerald-100"><RefreshCw size={14} /> Kembalikan</button>
                      </div>
                    ))}
                  </div>

                  {group.items.length > 1 ? (
                    <div className="flex justify-end border-t border-slate-100 bg-slate-50 px-5 py-3"><button type="button" onClick={() => onReturnBikes(bikeIds)} className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-4 py-2.5 text-xs font-black text-white transition hover:bg-emerald-800"><RefreshCw size={15} /> Kembalikan Semua</button></div>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><EmptyState icon={UsersRound} title="Belum ada pesanan aktif" action={<button type="button" onClick={() => setIsDialogOpen(true)} className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-4 py-2.5 text-xs font-black text-white"><Plus size={15} /> Penyewaan Baru</button>} /></div>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <button type="button" onClick={() => onNavigate('fleet')} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-cyan-300"><span><span className="text-[9px] font-black uppercase tracking-wide text-slate-600">Armada</span><span className="mt-1 block text-sm font-black text-slate-950">Cari dan ubah status</span></span><Search size={18} className="text-cyan-700" /></button>
        <button type="button" onClick={() => onNavigate('finance')} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-cyan-300"><span><span className="text-[9px] font-black uppercase tracking-wide text-slate-600">Keuangan</span><span className="mt-1 block text-sm font-black text-slate-950">Setoran dan audit</span></span><WalletCards size={18} className="text-cyan-700" /></button>
        <button type="button" onClick={() => setIsDialogOpen(true)} disabled={!availableBikes.length} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-cyan-300 disabled:opacity-50"><span><span className="text-[9px] font-black uppercase tracking-wide text-slate-600">Cepat</span><span className="mt-1 block text-sm font-black text-slate-950">Tambah pesanan</span></span><Plus size={18} className="text-cyan-700" /></button>
      </section>

      <RentalDialog open={isDialogOpen} availableBikes={availableBikes} form={form} error={error} getRate={getRate} onChange={onChange} onSubmit={onSubmit} onClose={closeDialog} />
    </div>
  );
}
