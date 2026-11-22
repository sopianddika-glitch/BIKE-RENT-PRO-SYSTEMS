import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeftRight, ArrowRight, Bike, Clock3, Plus, RefreshCw, Search, UsersRound, WalletCards } from 'lucide-react';
import EmptyState from '../components/EmptyState.jsx';
import RentalDialog from '../components/RentalDialog.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import SwitchUnitDialog from '../components/SwitchUnitDialog.jsx';
import UnitHistory from '../components/UnitHistory.jsx';
import ExtendRentalDialog from '../components/ExtendRentalDialog.jsx';
import ExtensionHistory from '../components/ExtensionHistory.jsx';
import RentalPriceBreakdown from '../components/RentalPriceBreakdown.jsx';
import { getRentalFinancials } from '../lib/rentalPricing.js';
import RentalTimingInfo from '../components/RentalTimingInfo.jsx';
import { formatCurrency, formatDate } from '../lib/formatters.js';

export default function RentalPage({
  now,
  settings,
  onExtendRental,
  bikes,
  transactions,
  onSwitchUnit,
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
  const openRentalDialog = () => { onChange('refreshStart'); setIsDialogOpen(true); };
  const [switchTarget, setSwitchTarget] = useState(null);
  const [extendTarget, setExtendTarget] = useState(null);
  const closeExtendDialog = useCallback(() => setExtendTarget(null), []);
  const closeSwitchDialog = useCallback(() => setSwitchTarget(null), []);

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
    <div className="space-y-4">
      <section aria-labelledby="rental-overview" className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950 text-white shadow-lg shadow-slate-950/10">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(300px,40%)]">
          <div className="p-3 sm:px-4">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h2 id="rental-overview" className="text-sm font-black leading-5">Transaksi Multi-unit</h2>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-bold leading-4 text-slate-200">Data tamu satu kali</span>
            </div>
            <dl className="mt-2.5 grid grid-cols-3 gap-2 sm:gap-3">
              <div className="flex flex-col gap-0.5"><dt className="text-[11px] font-semibold leading-4 text-slate-300 sm:text-xs">unit tersedia</dt><dd className="order-first text-xl font-black tabular-nums leading-tight sm:text-2xl">{availableBikes.length}</dd></div>
              <div className="flex flex-col gap-0.5"><dt className="text-[11px] font-semibold leading-4 text-slate-300 sm:text-xs">pesanan aktif</dt><dd className="order-first text-xl font-black tabular-nums leading-tight sm:text-2xl">{rentalGroups.length}</dd></div>
              <div className="flex flex-col gap-0.5"><dt className="text-[11px] font-semibold leading-4 text-slate-300 sm:text-xs">unit di pelanggan</dt><dd className="order-first text-xl font-black tabular-nums leading-tight text-cyan-300 sm:text-2xl">{activeRentals.length}</dd></div>
            </dl>
          </div>
          <div className="grid grid-cols-2 items-stretch gap-2 border-t border-white/10 bg-white/[0.03] p-2 lg:items-center lg:border-l lg:border-t-0 lg:p-3">
            <button type="button" onClick={openRentalDialog} disabled={!availableBikes.length} className="flex min-h-12 items-center justify-center gap-1.5 rounded-md bg-cyan-300 px-1.5 py-1 text-center text-xs font-extrabold text-slate-950 transition hover:bg-cyan-200">
              <Plus size={16} aria-hidden="true" className="shrink-0" /> Buat Penyewaan
            </button>
            <button type="button" onClick={() => onNavigate('fleet')} className="flex min-h-12 items-center justify-center gap-1.5 rounded-md border border-white/15 px-1.5 py-1 text-center text-xs font-extrabold transition hover:bg-white/10">
              <ArrowRight size={16} aria-hidden="true" className="shrink-0 text-cyan-300" /> Buka Unit
            </button>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div><h2 className="text-base font-black text-slate-950">Pesanan Aktif</h2><p className="mt-1 text-xs font-semibold text-slate-600">{rentalGroups.length} pesanan / {activeRentals.length} unit</p></div>
          <button type="button" onClick={openRentalDialog} disabled={!availableBikes.length} className="inline-flex items-center justify-center gap-2 rounded-md bg-cyan-700 px-4 py-3 text-xs font-black text-white transition hover:bg-cyan-800 disabled:bg-slate-300"><Plus size={16} /> Penyewaan Baru</button>
        </div>

        {rentalGroups.length > 0 ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {rentalGroups.map((group) => {
              const total = group.items.reduce((sum, item) => sum + (item.transaction ? getRentalFinancials(item.transaction).totalCharge : 0), 0);
              const bikeIds = group.items.map((item) => item.bike.id);
              return (
                <article key={group.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                  <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2"><span className="rounded bg-slate-950 px-2 py-1 text-[11px] font-black uppercase tracking-wide text-white">{group.code}</span><span className="text-xs font-black text-cyan-700">{group.items.length} unit</span></div>
                      <h3 className="mt-3 [overflow-wrap:anywhere] text-base font-black text-slate-950">{group.customerName}</h3>
                      <p className="mt-1 text-xs font-semibold text-slate-600">{group.customerContact || 'Tanpa kontak'}{group.date ? ` / ${formatDate(group.date)}` : ''}</p>
                    </div>
                    <div className="shrink-0 sm:text-right"><p className="text-[11px] font-black uppercase tracking-wide text-slate-600">Total Tamu</p><p className="mt-1 text-lg font-black text-emerald-700">{formatCurrency(total)}</p></div>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {group.items.map(({ bike, transaction }) => (
                      <div key={bike.id} className="px-5 py-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-cyan-50 text-cyan-700"><Bike size={19} /></div>
                            <div className="min-w-0"><div className="flex items-center gap-2"><p className="font-black text-slate-950">{bike.number}</p><StatusBadge status="disewa" /></div><p className="mt-1 [overflow-wrap:anywhere] text-xs font-semibold text-slate-600">{bike.type} / {formatCurrency(transaction ? getRentalFinancials(transaction).totalCharge : 0)}</p></div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {transaction ? <button type="button" aria-label={`Perpanjang Rental ${bike.number}`} onClick={() => setExtendTarget({ bike, transaction })} className="inline-flex items-center justify-center gap-2 rounded-md bg-cyan-50 px-3 py-3 text-xs font-black text-cyan-800 hover:bg-cyan-100"><Clock3 size={14} /> Perpanjang Rental</button> : null}
                            {transaction ? <button type="button" aria-label={`Ganti Unit ${bike.number}`} onClick={() => setSwitchTarget({ bike, transaction })} className="inline-flex items-center justify-center gap-2 rounded-md bg-cyan-50 px-3 py-3 text-xs font-black text-cyan-800 hover:bg-cyan-100"><ArrowLeftRight size={14} /> Ganti Unit</button> : null}
                            <button type="button" onClick={() => onReturnBike(bike.id)} className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-50 px-3 py-3 text-xs font-black text-emerald-800 transition hover:bg-emerald-100"><RefreshCw size={14} /> Kembalikan</button>
                          </div>
                        </div>
                        <RentalTimingInfo transaction={transaction} now={now} dueSoonHours={settings.dueSoonHours} />
                        <RentalPriceBreakdown transaction={transaction} />
                        <UnitHistory transaction={transaction} />
                        <ExtensionHistory transaction={transaction} />
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
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><EmptyState icon={UsersRound} title="Belum ada pesanan aktif" action={<button type="button" onClick={openRentalDialog} className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-4 py-2.5 text-xs font-black text-white"><Plus size={15} /> Penyewaan Baru</button>} /></div>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <button type="button" onClick={() => onNavigate('fleet')} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-cyan-300"><span><span className="text-[11px] font-black uppercase tracking-wide text-slate-600">Unit</span><span className="mt-1 block text-sm font-black text-slate-950">Cari dan ubah status</span></span><Search size={18} className="text-cyan-700" /></button>
        <button type="button" onClick={() => onNavigate('finance')} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-cyan-300"><span><span className="text-[11px] font-black uppercase tracking-wide text-slate-600">Keuangan</span><span className="mt-1 block text-sm font-black text-slate-950">Setoran dan audit</span></span><WalletCards size={18} className="text-cyan-700" /></button>
        <button type="button" onClick={openRentalDialog} disabled={!availableBikes.length} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-cyan-300 disabled:opacity-50"><span><span className="text-[11px] font-black uppercase tracking-wide text-slate-600">Cepat</span><span className="mt-1 block text-sm font-black text-slate-950">Tambah pesanan</span></span><Plus size={18} className="text-cyan-700" /></button>
      </section>

      {extendTarget ? <ExtendRentalDialog target={extendTarget} settings={settings} getRate={getRate} now={now} onSubmit={onExtendRental} onClose={closeExtendDialog} /> : null}
      {switchTarget ? <SwitchUnitDialog target={switchTarget} bikes={bikes} transactions={transactions} onSubmit={onSwitchUnit} onClose={closeSwitchDialog} /> : null}
      <RentalDialog onConfigureRates={() => { closeDialog(); onNavigate('fleet'); }} maxRentalDays={settings.maxRentalDays} open={isDialogOpen} availableBikes={availableBikes} form={form} error={error} onChange={onChange} onSubmit={onSubmit} onClose={closeDialog} />
    </div>
  );
}
