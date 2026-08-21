import { Bike, CheckCircle2, CircleDollarSign, Phone, RefreshCw, Search, UserRound } from 'lucide-react';
import EmptyState from '../components/EmptyState.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { formatCurrency, formatDate } from '../lib/formatters.js';

export default function RentalPage({
  availableBikes,
  activeRentals,
  form,
  error,
  selectedBike,
  selectedRate,
  onChange,
  onSubmit,
  onReturnBike,
  onNavigate,
}) {
  const profit = Math.max(0, Number(form.amount || 0) - Number(selectedRate.cost || 0));

  return (
    <div className="grid gap-5 xl:grid-cols-[430px_1fr]">
      <form onSubmit={onSubmit} className="self-start rounded-lg border border-slate-200 bg-white shadow-sm xl:sticky xl:top-[132px]">
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div><h2 className="text-base font-black text-slate-950">Transaksi Penyewaan</h2><p className="mt-1 text-xs font-semibold text-slate-500">Transaksi baru</p></div>
            <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-700">{availableBikes.length} tersedia</span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2" aria-label="Tahapan transaksi">
            {['Unit', 'Tamu', 'Konfirmasi'].map((step, index) => (
              <div key={step} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wide text-slate-500">
                <span className={`flex h-6 w-6 items-center justify-center rounded-md ${index === 0 || selectedBike ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600'}`}>{index + 1}</span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-5 p-5">
          <div>
            <label htmlFor="rental-bike" className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Pilih Unit</label>
            <select id="rental-bike" value={form.bikeId} disabled={availableBikes.length === 0} onChange={(event) => onChange('bikeId', event.target.value)} className="w-full rounded-md border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-800 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 disabled:bg-slate-100">
              <option value="">{availableBikes.length ? 'Pilih sepeda siap sewa' : 'Tidak ada unit siap sewa'}</option>
              {availableBikes.map((bike) => <option key={bike.id} value={bike.id}>{bike.number} / {bike.type}</option>)}
            </select>
          </div>

          {selectedBike ? (
            <div className="grid grid-cols-3 overflow-hidden rounded-md border border-slate-200 bg-slate-50">
              <div className="border-r border-slate-200 p-3"><p className="text-[9px] font-black uppercase text-slate-600">Modal</p><p className="mt-1 text-sm font-black text-rose-700">{formatCurrency(selectedRate.cost)}</p></div>
              <div className="border-r border-slate-200 p-3"><p className="text-[9px] font-black uppercase text-slate-600">Harga</p><p className="mt-1 text-sm font-black text-emerald-700">{formatCurrency(form.amount)}</p></div>
              <div className="p-3"><p className="text-[9px] font-black uppercase text-slate-600">Laba</p><p className="mt-1 text-sm font-black text-cyan-700">{formatCurrency(profit)}</p></div>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <div>
              <label htmlFor="rental-customer" className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Nama Tamu</label>
              <div className="relative"><UserRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input id="rental-customer" type="text" value={form.customerName} onChange={(event) => onChange('customerName', event.target.value)} placeholder="Nama penyewa" className="w-full rounded-md border border-slate-200 py-3 pl-10 pr-3 text-sm font-bold outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /></div>
            </div>
            <div>
              <label htmlFor="rental-contact" className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Kontak</label>
              <div className="relative"><Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input id="rental-contact" type="tel" value={form.customerContact} onChange={(event) => onChange('customerContact', event.target.value)} placeholder="Nomor telepon" className="w-full rounded-md border border-slate-200 py-3 pl-10 pr-3 text-sm font-bold outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /></div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <div><label htmlFor="rental-date" className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Tanggal Sewa</label><input id="rental-date" type="date" value={form.date} onChange={(event) => onChange('date', event.target.value)} className="w-full rounded-md border border-slate-200 px-3 py-3 text-sm font-bold outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /></div>
            <div><label htmlFor="rental-amount" className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Harga ke Tamu</label><div className="relative"><CircleDollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input id="rental-amount" type="number" min="0" step="1000" value={form.amount} onChange={(event) => onChange('amount', event.target.value)} placeholder="50000" className="w-full rounded-md border border-slate-200 py-3 pl-10 pr-3 text-sm font-bold outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /></div></div>
          </div>

          <div><label htmlFor="rental-note" className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Catatan</label><textarea id="rental-note" rows="3" value={form.note} onChange={(event) => onChange('note', event.target.value)} placeholder="Jaminan, tujuan, atau catatan kondisi" className="w-full resize-none rounded-md border border-slate-200 px-3 py-3 text-sm font-semibold outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /></div>

          {error ? <p className="rounded-md bg-rose-50 px-3 py-2.5 text-xs font-bold text-rose-700" role="alert">{error}</p> : null}

          <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-3.5 text-sm font-black text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300" disabled={!availableBikes.length}>
            <CheckCircle2 size={18} /> Aktifkan Penyewaan
          </button>
        </div>
      </form>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="text-base font-black text-slate-950">Penyewaan Aktif</h2><p className="mt-1 text-xs font-semibold text-slate-500">{activeRentals.length} unit sedang berada di tamu</p></div>
          <div className="flex gap-2"><button type="button" onClick={() => onNavigate('fleet')} className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-200"><Search size={14} /> Armada</button></div>
        </div>

        {activeRentals.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {activeRentals.map(({ bike, transaction }) => (
              <article key={bike.id} className="grid gap-4 px-5 py-5 md:grid-cols-[1fr_auto] md:items-center">
                <div className="flex min-w-0 items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-cyan-50 text-cyan-700"><Bike size={22} /></div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><h3 className="text-base font-black text-slate-950">{bike.number}</h3><StatusBadge status="disewa" /></div>
                    <p className="mt-1 text-sm font-bold text-slate-600">{bike.type}</p>
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs font-semibold text-slate-500">
                      <span>Tamu: <strong className="text-slate-800">{transaction?.customerName || 'Belum dicatat'}</strong></span>
                      {transaction?.customerContact ? <span>Kontak: <strong className="text-slate-800">{transaction.customerContact}</strong></span> : null}
                      {transaction?.date ? <span>Mulai: <strong className="text-slate-800">{formatDate(transaction.date)}</strong></span> : null}
                    </div>
                  </div>
                </div>
                <button type="button" onClick={() => onReturnBike(bike.id)} className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 py-3 text-xs font-black text-white transition hover:bg-emerald-800">
                  <RefreshCw size={16} /> Selesaikan & Kembalikan
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="p-5"><EmptyState icon={Bike} title="Belum ada penyewaan aktif" /></div>
        )}
      </section>
    </div>
  );
}
