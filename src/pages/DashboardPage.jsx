import {
  ArrowRight,
  Bike,
  CircleDollarSign,
  Clock3,
  RefreshCw,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  WalletCards,
  Wrench,
} from 'lucide-react';
import EmptyState from '../components/EmptyState.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { formatCurrency, formatDate } from '../lib/formatters.js';

const statusRows = [
  { key: 'tersedia', label: 'Siap disewa', icon: Clock3, color: 'bg-emerald-500', text: 'text-emerald-700' },
  { key: 'disewa', label: 'Sedang disewa', icon: Bike, color: 'bg-cyan-500', text: 'text-cyan-700' },
  { key: 'bengkel', label: 'Dalam perbaikan', icon: Wrench, color: 'bg-amber-500', text: 'text-amber-700' },
  { key: 'hilang', label: 'Perlu ditangani', icon: ShieldAlert, color: 'bg-rose-500', text: 'text-rose-700' },
];

function Metric({ icon: Icon, label, value, meta, tone }) {
  const tones = {
    cyan: 'bg-cyan-50 text-cyan-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    rose: 'bg-rose-50 text-rose-700',
    slate: 'bg-slate-100 text-slate-700',
  };

  return (
    <div className="border-b border-slate-200 bg-white px-5 py-5 sm:border-b-0 sm:border-r last:border-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</p>
          <p className="mt-2 truncate text-2xl font-black text-slate-950">{value}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">{meta}</p>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${tones[tone]}`}>
          <Icon size={19} />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage({ stats, dateFilter, recentTransactions, activeRentals, onNavigate, onReturnBike }) {
  const totalBikes = stats.tersedia.length + stats.disewa.length + stats.bengkel.length + stats.hilang.length;

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950 text-white shadow-xl shadow-slate-950/10">
        <div className="grid lg:grid-cols-[1fr_auto]">
          <div className="p-5 sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">Operasi Hari Ini</p>
            <div className="mt-3 flex flex-wrap items-end gap-x-7 gap-y-3">
              <div>
                <p className="text-4xl font-black">{stats.tersedia.length}</p>
                <p className="mt-1 text-xs font-bold text-slate-400">unit siap disewa</p>
              </div>
              <div>
                <p className="text-4xl font-black">{stats.disewa.length}</p>
                <p className="mt-1 text-xs font-bold text-slate-400">sewa sedang aktif</p>
              </div>
              <div>
                <p className="text-4xl font-black text-rose-300">{formatCurrency(stats.setoranBelumDisetor)}</p>
                <p className="mt-1 text-xs font-bold text-slate-400">setoran belum selesai</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 border-t border-white/10 sm:grid-cols-3 lg:w-[510px] lg:border-l lg:border-t-0">
            <button type="button" onClick={() => onNavigate('rental')} className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-4 text-left transition hover:bg-white/5 sm:border-b-0 sm:border-r">
              <span>
                <span className="block text-[10px] font-black uppercase tracking-wide text-cyan-300">Utama</span>
                <span className="mt-1 block text-sm font-black">Mulai Sewa</span>
              </span>
              <ArrowRight size={18} />
            </button>
            <button type="button" onClick={() => onNavigate('rental')} className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-4 text-left transition hover:bg-white/5 sm:border-b-0 sm:border-r">
              <span>
                <span className="block text-[10px] font-black uppercase tracking-wide text-emerald-300">Aktif</span>
                <span className="mt-1 block text-sm font-black">Pengembalian</span>
              </span>
              <RefreshCw size={18} />
            </button>
            <button type="button" onClick={() => onNavigate('finance')} className="flex items-center justify-between gap-3 px-4 py-4 text-left transition hover:bg-white/5">
              <span>
                <span className="block text-[10px] font-black uppercase tracking-wide text-rose-300">Audit</span>
                <span className="mt-1 block text-sm font-black">Kelola Setoran</span>
              </span>
              <WalletCards size={18} />
            </button>
          </div>
        </div>
      </section>

      {dateFilter}

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="grid sm:grid-cols-2 xl:grid-cols-4">
          <Metric icon={TrendingUp} label="Pendapatan Tamu" value={formatCurrency(stats.pendapatan)} meta={`${stats.totalTransactions} transaksi`} tone="emerald" />
          <Metric icon={WalletCards} label="Setoran Rental" value={formatCurrency(stats.setoranBelumDisetor)} meta={`${stats.transaksiBelumDisetor} belum disetor`} tone="cyan" />
          <Metric icon={TrendingDown} label="Biaya Operasional" value={formatCurrency(stats.pengeluaranOperasional)} meta="di luar modal rental" tone="rose" />
          <Metric icon={CircleDollarSign} label="Laba Bersih" value={formatCurrency(stats.laba)} meta="setelah seluruh biaya" tone="slate" />
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-sm font-black text-slate-950">Status Armada</h2>
              <p className="mt-1 text-xs font-semibold text-slate-500">{totalBikes} unit terdaftar</p>
            </div>
            <button type="button" onClick={() => onNavigate('fleet')} className="inline-flex items-center gap-1.5 text-xs font-black text-cyan-700 hover:text-cyan-900">
              Buka Armada <ArrowRight size={14} />
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {statusRows.map(({ key, label, icon: Icon, color, text }) => {
              const count = stats[key].length;
              const percentage = totalBikes > 0 ? Math.round((count / totalBikes) * 100) : 0;

              return (
                <div key={key} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-5 py-4">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-md bg-slate-50 ${text}`}><Icon size={17} /></div>
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-black text-slate-800">{label}</p>
                      <p className="text-[10px] font-bold text-slate-600">{percentage}%</p>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${color}`} style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                  <p className="w-8 text-right text-xl font-black text-slate-950">{count}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-sm font-black text-slate-950">Penyewaan Aktif</h2>
              <p className="mt-1 text-xs font-semibold text-slate-500">Unit yang sedang berada di tamu</p>
            </div>
            <span className="rounded-md bg-cyan-50 px-2.5 py-1 text-xs font-black text-cyan-700">{activeRentals.length} aktif</span>
          </div>
          {activeRentals.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {activeRentals.slice(0, 5).map(({ bike, transaction }) => (
                <div key={bike.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-cyan-50 text-cyan-700"><Bike size={19} /></div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2"><p className="font-black text-slate-950">{bike.number}</p><StatusBadge status="disewa" /></div>
                      <p className="mt-1 truncate text-xs font-semibold text-slate-500">{transaction?.customerName || bike.note || bike.type}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => onReturnBike(bike.id)} className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 transition hover:bg-emerald-100">
                    <RefreshCw size={14} /> Kembalikan
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-5"><EmptyState icon={Bike} title="Tidak ada penyewaan aktif" /></div>
          )}
        </section>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-black text-slate-950">Aktivitas Terbaru</h2>
          <button type="button" onClick={() => onNavigate('finance')} className="text-xs font-black text-cyan-700">Lihat Audit</button>
        </div>
        {recentTransactions.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {recentTransactions.slice(0, 5).map((transaction) => (
              <div key={transaction.id} className="grid gap-2 px-5 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                <div className="min-w-0"><p className="truncate text-sm font-black text-slate-800">{transaction.note}</p><p className="mt-1 text-xs font-semibold text-slate-500">{formatDate(transaction.date)}</p></div>
                <p className={`text-sm font-black ${transaction.type === 'pendapatan' ? 'text-emerald-700' : 'text-rose-700'}`}>{transaction.type === 'pendapatan' ? '+' : '-'} {formatCurrency(transaction.amount)}</p>
                <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">{transaction.category === 'rental' ? 'Sewa' : 'Manual'}</span>
              </div>
            ))}
          </div>
        ) : <div className="p-5"><EmptyState icon={CircleDollarSign} title="Belum ada aktivitas pada periode ini" /></div>}
      </section>
    </div>
  );
}
