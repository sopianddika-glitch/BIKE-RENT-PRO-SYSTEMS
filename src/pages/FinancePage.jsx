import { useState } from 'react';
import { ArrowDownRight, ArrowUpRight, CheckCircle2, CircleDollarSign, History, Save, Trash2, WalletCards } from 'lucide-react';
import EmptyState from '../components/EmptyState.jsx';
import { formatCurrency, formatFullDate } from '../lib/formatters.js';

export default function FinancePage({ stats, groups, dateFilter, form, error, onChange, onSubmit, onToggleSettlement, onDelete }) {
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const settlementProgress = stats.setoranRental > 0 ? Math.round((stats.setoranSudahDisetor / stats.setoranRental) * 100) : 0;

  return (
    <div className="space-y-5">
      {dateFilter}

      <section className="grid overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm sm:grid-cols-3">
        <div className="border-b border-slate-200 p-5 sm:border-b-0 sm:border-r"><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wide text-emerald-700"><ArrowUpRight size={15} /> Pendapatan</div><p className="mt-2 text-2xl font-black text-slate-950">{formatCurrency(stats.pendapatan)}</p></div>
        <div className="border-b border-slate-200 p-5 sm:border-b-0 sm:border-r"><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wide text-rose-700"><ArrowDownRight size={15} /> Total Biaya</div><p className="mt-2 text-2xl font-black text-slate-950">{formatCurrency(stats.pengeluaran)}</p></div>
        <div className="p-5"><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wide text-cyan-700"><CircleDollarSign size={15} /> Laba Bersih</div><p className={`mt-2 text-2xl font-black ${stats.laba >= 0 ? 'text-slate-950' : 'text-rose-700'}`}>{formatCurrency(stats.laba)}</p></div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="flex items-center gap-2 text-base font-black text-slate-950"><History size={18} className="text-cyan-700" /> Audit Transaksi</h2><p className="mt-1 text-xs font-semibold text-slate-500">{stats.totalTransactions} transaksi pada periode</p></div></div>
          {groups.length > 0 ? (
            <div className="divide-y divide-slate-200">
              {groups.map((group) => (
                <section key={group.date}>
                  <div className="flex flex-col gap-3 bg-slate-50 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-sm font-black text-slate-900">{formatFullDate(group.date)}</h3><p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">{group.transactions.length} transaksi</p></div><div className="flex gap-4 text-xs font-black"><span className="text-emerald-700">Masuk {formatCurrency(group.pendapatan)}</span><span className="text-rose-700">Keluar {formatCurrency(group.pengeluaran)}</span><span className={group.laba >= 0 ? 'text-cyan-700' : 'text-rose-700'}>Laba {formatCurrency(group.laba)}</span></div></div>
                  <div className="divide-y divide-slate-100">
                    {group.transactions.map((transaction) => {
                      const income = transaction.type === 'pendapatan';
                      return (
                        <div key={transaction.id} className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_auto] md:items-center">
                          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-black text-slate-800">{transaction.note}</p><span className={`rounded px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${transaction.category === 'rental' ? 'bg-cyan-50 text-cyan-700' : 'bg-slate-100 text-slate-500'}`}>{transaction.category === 'rental' ? 'Penyewaan' : 'Manual'}</span></div><p className="mt-1 text-xs font-semibold text-slate-500">{transaction.customerName ? `Tamu ${transaction.customerName}` : income ? 'Pendapatan lain' : 'Pengeluaran operasional'}{transaction.costAmount ? ` / Modal ${formatCurrency(transaction.costAmount)}` : ''}</p></div>
                          <div className="flex flex-wrap items-center justify-between gap-2 md:justify-end"><p className={`mr-2 text-sm font-black ${income ? 'text-emerald-700' : 'text-rose-700'}`}>{income ? '+' : '-'} {formatCurrency(transaction.amount)}</p>{transaction.costAmount ? <button type="button" onClick={() => onToggleSettlement(transaction.id)} className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-2 text-[10px] font-black ${transaction.settled ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}><CheckCircle2 size={14} /> {transaction.settled ? 'Sudah Disetor' : 'Tandai Disetor'}</button> : null}{confirmDeleteId === transaction.id ? <div className="flex gap-1"><button type="button" onClick={() => { onDelete(transaction.id); setConfirmDeleteId(null); }} className="rounded-md bg-rose-600 px-2.5 py-2 text-[10px] font-black text-white">Hapus</button><button type="button" onClick={() => setConfirmDeleteId(null)} className="rounded-md bg-slate-100 px-2.5 py-2 text-[10px] font-black text-slate-600">Batal</button></div> : <button type="button" onClick={() => setConfirmDeleteId(transaction.id)} aria-label={`Hapus transaksi ${transaction.note}`} className="rounded-md p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-700"><Trash2 size={15} /></button>}</div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          ) : <div className="p-6"><EmptyState icon={History} title="Belum ada transaksi pada periode ini" /></div>}
        </section>

        <div className="space-y-5">
          <form onSubmit={onSubmit} className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4"><h2 className="text-base font-black text-slate-950">Catat Keuangan</h2><p className="mt-1 text-xs font-semibold text-slate-500">Untuk transaksi di luar penyewaan</p></div>
            <div className="space-y-4 p-5">
              <div><label htmlFor="finance-date" className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-500">Tanggal</label><input id="finance-date" type="date" value={form.date} onChange={(event) => onChange('date', event.target.value)} className="w-full rounded-md border border-slate-200 px-3 py-3 text-sm font-bold outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /></div>
              <div><label htmlFor="finance-type" className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-500">Jenis</label><select id="finance-type" value={form.type} onChange={(event) => onChange('type', event.target.value)} className="w-full rounded-md border border-slate-200 px-3 py-3 text-sm font-bold outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"><option value="pendapatan">Pendapatan Lain</option><option value="pengeluaran">Pengeluaran Operasional</option></select></div>
              <div><label htmlFor="finance-amount" className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-500">Nominal</label><input id="finance-amount" type="number" min="0" step="1000" value={form.amount} onChange={(event) => onChange('amount', event.target.value)} placeholder="150000" className="w-full rounded-md border border-slate-200 px-3 py-3 text-sm font-bold outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /></div>
              <div><label htmlFor="finance-note" className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-500">Keterangan</label><textarea id="finance-note" rows="3" value={form.note} onChange={(event) => onChange('note', event.target.value)} placeholder="Contoh: servis rantai atau penjualan aksesori" className="w-full resize-none rounded-md border border-slate-200 px-3 py-3 text-sm font-semibold outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /></div>
              {error ? <p className="rounded-md bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700" role="alert">{error}</p> : null}
              <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-3 text-sm font-black text-white hover:bg-cyan-700"><Save size={17} /> Simpan Transaksi</button>
            </div>
          </form>

          <section className="rounded-lg border border-slate-800 bg-slate-950 p-5 text-white shadow-xl shadow-slate-950/10">
            <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-300">Setoran Rental</p><p className="mt-2 text-3xl font-black">{formatCurrency(stats.setoranBelumDisetor)}</p><p className="mt-1 text-xs font-semibold text-slate-400">belum dibayar ke bengkel</p></div><WalletCards size={22} className="text-cyan-300" /></div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${settlementProgress}%` }} /></div>
            <div className="mt-3 flex justify-between gap-3 text-xs font-bold text-slate-400"><span>{settlementProgress}% selesai</span><span>{formatCurrency(stats.setoranSudahDisetor)} disetor</span></div>
          </section>
        </div>
      </div>
    </div>
  );
}
