import { useCallback, useRef, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, CheckCircle2, CircleDollarSign, History, Plus, Save, Trash2, WalletCards } from 'lucide-react';
import Modal from '../components/Modal.jsx';
import EmptyState from '../components/EmptyState.jsx';
import RentalPaymentDialog from '../components/RentalPaymentDialog.jsx';
import RentalPriceBreakdown from '../components/RentalPriceBreakdown.jsx';
import { getRentalFinancials } from '../lib/rentalPricing.js';
import UnitHistory from '../components/UnitHistory.jsx';
import ExtensionHistory from '../components/ExtensionHistory.jsx';
import RentalTimingInfo from '../components/RentalTimingInfo.jsx';
import { formatCurrency, formatFullDate } from '../lib/formatters.js';

const fieldClass = 'w-full min-w-0 rounded-md border border-slate-200 px-3 py-2.5 text-sm font-semibold outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100';

export default function FinancePage({ stats, groups, dateFilter, form, error, onChange, onSubmit, onToggleSettlement, onDelete, onRentalPayment }) {
  const [paymentTarget, setPaymentTarget] = useState(null);
  const closePaymentDialog = useCallback(() => setPaymentTarget(null), []);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const deleting = useRef(false);
  const confirmDelete = async () => {
    if (deleting.current) return;
    deleting.current = true;
    setDeleteBusy(true);
    try {
      const result = await onDelete(deleteTarget.id);
      if (result?.error) setDeleteError(result.error);
      else setDeleteTarget(null);
    } finally {
      deleting.current = false;
      setDeleteBusy(false);
    }
  };
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const submittingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const result = await onSubmit();
      if (result?.success) setTransactionDialogOpen(false);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };
  const settlementProgress = stats.setoranRental > 0 ? Math.round((stats.setoranSudahDisetor / stats.setoranRental) * 100) : 0;

  return (
    <div className="space-y-4">
      {transactionDialogOpen ? (
        <Modal className="max-w-lg overflow-hidden" aria-labelledby="finance-entry-title" aria-describedby="finance-entry-description" onClose={() => setTransactionDialogOpen(false)} busy={submitting}>
          <form onSubmit={submit} className="flex max-h-[90dvh] flex-col">
            <div className="shrink-0 border-b border-slate-100 px-4 py-3 sm:px-5">
              <h2 id="finance-entry-title" tabIndex="-1" data-initial-focus className="text-lg font-black">Catat Keuangan</h2>
              <p id="finance-entry-description" className="mt-1 text-xs font-medium text-slate-600">Untuk transaksi di luar penyewaan</p>
            </div>
            <div className="min-h-0 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
              <fieldset disabled={submitting} className="grid min-w-0 gap-3 sm:grid-cols-2">
                <label className="block min-w-0 text-xs font-bold text-slate-700">
                  Tanggal
                  <input type="date" value={form.date} onChange={(event) => onChange('date', event.target.value)} className={`mt-1 block ${fieldClass}`} />
                </label>
                <label className="block min-w-0 text-xs font-bold text-slate-700">
                  Jenis
                  <select value={form.type} onChange={(event) => onChange('type', event.target.value)} className={`mt-1 block ${fieldClass}`}>
                    <option value="pendapatan">Pendapatan Lain (diterima)</option>
                    <option value="pengeluaran">Pengeluaran Operasional</option>
                  </select>
                </label>
                <label className="block min-w-0 text-xs font-bold text-slate-700 sm:col-span-2">
                  Nominal
                  <input type="number" inputMode="numeric" min="1" step="1" value={form.amount} onChange={(event) => onChange('amount', event.target.value)} placeholder="150000" className={`mt-1 block ${fieldClass}`} />
                </label>
                <label className="block min-w-0 text-xs font-bold text-slate-700 sm:col-span-2">
                  Keterangan
                  <textarea rows="3" value={form.note} onChange={(event) => onChange('note', event.target.value)} placeholder="Contoh: servis rantai atau penjualan aksesori" className={`mt-1 block resize-y ${fieldClass}`} />
                </label>
              </fieldset>
            </div>
            <div className="shrink-0 border-t border-slate-100 px-4 py-3 sm:px-5">
              {error ? <p className="mb-3 rounded-md bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700" role="alert">{error}</p> : null}
              <div className="flex justify-end gap-2">
                <button type="button" disabled={submitting} onClick={() => setTransactionDialogOpen(false)} className="min-h-11 rounded-md bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 sm:px-4">Batal</button>
                <button type="submit" disabled={submitting} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 py-2 text-xs font-extrabold text-white hover:bg-cyan-800 sm:px-4">
                  <Save size={16} aria-hidden="true" /> {submitting ? 'Menyimpan…' : 'Simpan Transaksi'}
                </button>
              </div>
            </div>
          </form>
        </Modal>
      ) : null}

      {deleteTarget ? (
        <Modal className="max-w-sm p-5" role="alertdialog" aria-labelledby="delete-transaction-title" onClose={() => setDeleteTarget(null)} busy={deleteBusy}>
          <h2 id="delete-transaction-title" className="text-base font-black">Hapus transaksi?</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{deleteTarget.note}</p>
          {deleteError ? <p role="alert" className="mt-3 text-sm font-bold text-rose-700">{deleteError}</p> : null}
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" data-initial-focus disabled={deleteBusy} onClick={() => setDeleteTarget(null)} className="rounded-md bg-slate-100 px-4 py-2 text-xs font-black">Batal</button>
            <button type="button" disabled={deleteBusy} onClick={confirmDelete} className="rounded-md bg-rose-700 px-4 py-2 text-xs font-black text-white">Hapus</button>
          </div>
        </Modal>
      ) : null}
      {paymentTarget ? <RentalPaymentDialog rental={paymentTarget} onSubmit={onRentalPayment} onClose={closePaymentDialog} /> : null}
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <button type="button" aria-haspopup="dialog" onClick={() => setTransactionDialogOpen(true)} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-cyan-700 px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-cyan-800 sm:self-start lg:self-center">
          <Plus size={18} aria-hidden="true" /> Catat Keuangan
        </button>
        <div className="min-w-0 flex-1">{dateFilter}</div>
      </div>

      <section className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 shadow-sm">
        <div className="min-w-0 bg-white p-2.5 sm:p-4"><div className="flex items-center gap-1.5 text-[11px] font-extrabold leading-4 text-emerald-700"><ArrowUpRight size={15} className="hidden shrink-0 sm:block" /> Pendapatan / Charges</div><p className="mt-1 [overflow-wrap:anywhere] text-lg font-black leading-tight sm:text-2xl text-slate-950">{formatCurrency(stats.pendapatan)}</p></div>
        <div className="min-w-0 bg-white p-2.5 sm:p-4"><div className="flex items-center gap-1.5 text-[11px] font-extrabold leading-4 text-rose-700"><ArrowDownRight size={15} className="hidden shrink-0 sm:block" /> Total Biaya</div><p className="mt-1 [overflow-wrap:anywhere] text-lg font-black leading-tight sm:text-2xl text-slate-950">{formatCurrency(stats.pengeluaran)}</p></div>
        <div className="min-w-0 bg-white p-2.5 sm:p-4"><div className="flex items-center gap-1.5 text-[11px] font-extrabold leading-4 text-cyan-700"><CircleDollarSign size={15} className="hidden shrink-0 sm:block" /> Laba Akrual</div><p className={`mt-1 [overflow-wrap:anywhere] text-lg font-black leading-tight sm:text-2xl ${stats.laba >= 0 ? 'text-slate-950' : 'text-rose-700'}`}>{formatCurrency(stats.laba)}</p></div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-3 sm:p-4"><p className="text-xs font-black text-emerald-700">Pembayaran Diterima</p><p data-testid="finance-paid" className="mt-1 [overflow-wrap:anywhere] text-lg font-black leading-tight sm:text-2xl">{formatCurrency(stats.paymentsReceived)}</p><p className="mt-1 text-xs text-slate-500">Pembayaran terverifikasi dan pendapatan lain pada periode ini.</p></div>
        <div className="rounded-lg border border-slate-200 bg-white p-3 sm:p-4"><p className="text-xs font-black text-amber-800">Piutang / Belum Dibayar</p><p data-testid="finance-balance" className="mt-1 [overflow-wrap:anywhere] text-lg font-black leading-tight sm:text-2xl">{formatCurrency(stats.balanceDue)}</p><p className="mt-1 text-xs text-slate-500">Saldo kumulatif s.d. {stats.balanceThrough}; hanya rental dengan pembayaran tercatat.</p></div>
      </section>
      <p className="text-xs font-semibold text-slate-600">Charges adalah nilai tagihan, bukan kas diterima. Laba akrual = charges + pendapatan lain − modal − biaya operasional. Setoran adalah kewajiban modal ke bengkel, terpisah dari pembayaran pelanggan.</p>
      {stats.unknownPaymentRentals ? <p role="status" className="rounded-md bg-amber-50 p-3 text-xs font-bold text-amber-900">{stats.unknownPaymentRentals} rental lama memiliki charge {formatCurrency(stats.unknownPaymentCharges)} dengan pembayaran belum dicatat. Saldo tersebut belum dapat dimasukkan ke piutang terverifikasi.</p> : null}

      <div className="grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="flex items-center gap-2 text-base font-black text-slate-950"><History size={18} className="text-cyan-700" /> Audit Transaksi</h2><p className="mt-1 text-xs font-semibold text-slate-500">{stats.totalTransactions} transaksi pada periode</p></div></div>
          {groups.length > 0 ? (
            <div className="divide-y divide-slate-200">
              {groups.map((group) => (
                <section key={group.date}>
                  <div className="flex flex-col gap-3 bg-slate-50 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-sm font-black text-slate-900">{formatFullDate(group.date)}</h3><p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">{group.transactions.length} catatan</p></div><div className="flex flex-wrap gap-4 text-xs font-black"><span className="text-emerald-700">Charges {formatCurrency(group.pendapatan)}</span><span className="text-cyan-700">Diterima {formatCurrency(group.paymentsReceived)}</span><span className="text-rose-700">Keluar {formatCurrency(group.pengeluaran)}</span><span className={group.laba >= 0 ? 'text-cyan-700' : 'text-rose-700'}>Laba {formatCurrency(group.laba)}</span></div></div>
                  <div className="divide-y divide-slate-100">
                    {group.transactions.map((transaction) => {
                      const payment = transaction.entryKind === 'payment';
                      const base = transaction.entryKind === 'base';
                      const rental = transaction.rentalSnapshot || transaction;
                      const income = transaction.type === 'pendapatan' || payment;
                      return (
                        <div key={transaction.id} className="grid grid-cols-1 gap-3 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="[overflow-wrap:anywhere] text-sm font-black text-slate-800">{transaction.note}</p><span className={`rounded px-2 py-0.5 text-[11px] font-black uppercase tracking-wide ${transaction.category === 'rental' ? 'bg-cyan-50 text-cyan-700' : 'bg-slate-100 text-slate-500'}`}>{transaction.category === 'rental' ? transaction.rentalCode || 'Penyewaan' : 'Manual'}</span></div><p className="mt-1 text-xs font-semibold text-slate-500">{transaction.customerName ? `Tamu ${transaction.customerName}` : income ? 'Pendapatan lain' : 'Pengeluaran operasional'}{transaction.costAmount ? ` / Modal ${formatCurrency(transaction.costAmount)}` : ''}</p><>{base ? <><RentalPriceBreakdown transaction={rental} /><UnitHistory transaction={rental} /><ExtensionHistory transaction={rental} /><RentalTimingInfo transaction={rental} /></> : null}</></div>
                          <div className="flex flex-wrap items-center justify-between gap-2 md:justify-end"><p className={`mr-2 text-sm font-black ${income ? 'text-emerald-700' : 'text-rose-700'}`}>{payment || (income && transaction.entryKind === 'manual') ? 'Diterima' : transaction.entryKind === 'adjustment' ? 'Penyesuaian' : income ? 'Charge' : '-'} {formatCurrency(transaction.amount)}</p>{transaction.costAmount ? <button type="button" onClick={() => onToggleSettlement(transaction.sourceTransactionId ?? transaction.id, transaction.extensionId || null, Boolean(transaction.settled))} className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-2 text-[11px] font-black ${transaction.settled ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}><CheckCircle2 size={14} /> {transaction.settled ? 'Sudah Disetor' : 'Tandai Disetor'}</button> : null}{base && getRentalFinancials(rental).balanceDue !== 0 ? <button type="button" onClick={() => setPaymentTarget(rental)} aria-label={`Catat pembayaran ${rental.rentalCode || rental.id} ${rental.bikeNumber || ''}`} className="rounded-md bg-cyan-50 px-3 py-2 text-xs font-black text-cyan-800">Catat Pembayaran</button> : null}{(base || transaction.entryKind === 'manual') && <button type="button" onClick={() => { setDeleteError(''); setDeleteTarget(transaction); }} aria-label={`Hapus transaksi ${transaction.note}`} className="min-w-11 rounded-md p-2 text-slate-600 hover:bg-rose-50 hover:text-rose-700"><Trash2 size={15} className="mx-auto" /></button>}</div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          ) : <div className="p-6"><EmptyState icon={History} title="Belum ada transaksi pada periode ini" /></div>}
        </section>

        <section className="self-start rounded-lg border border-slate-800 bg-slate-950 p-5 text-white shadow-xl shadow-slate-950/10">
          <div className="flex items-start justify-between gap-4"><div><p className="text-[11px] font-black uppercase tracking-[0.14em] text-cyan-300">Setoran Rental</p><p className="mt-2 text-3xl font-black">{formatCurrency(stats.setoranBelumDisetor)}</p><p className="mt-1 text-xs font-semibold text-slate-400">belum dibayar ke bengkel</p></div><WalletCards size={22} className="text-cyan-300" /></div>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${settlementProgress}%` }} /></div>
          <div className="mt-3 flex justify-between gap-3 text-xs font-bold text-slate-400"><span>{settlementProgress}% selesai</span><span>{formatCurrency(stats.setoranSudahDisetor)} disetor</span></div>
        </section>
      </div>
    </div>
  );
}
