import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  Bike,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  History,
  LayoutDashboard,
  Pencil,
  Plus,
  PlusCircle,
  RotateCcw,
  Save,
  Search,
  Settings,
  SlidersHorizontal,
  Trash2,
  TrendingDown,
  TrendingUp,
  User,
  Wallet,
  Wrench,
  XCircle,
} from 'lucide-react';
import EmptyState from './components/EmptyState.jsx';
import KpiCard from './components/KpiCard.jsx';
import StatusBadge from './components/StatusBadge.jsx';
import { BIKE_STATUSES, STATUS_META, initialBikes, initialTransactions, quickFilters } from './data/seed.js';
import { getQuickRange, isDateWithinRange } from './lib/dateFilters.js';
import { formatCurrency, formatDate, normalizeText } from './lib/formatters.js';
import { loadState, saveState } from './lib/storage.js';

const STORAGE_KEYS = {
  bikes: 'bike-rent-pro:bikes',
  transactions: 'bike-rent-pro:transactions',
};

const emptyBikeForm = {
  number: '',
  type: '',
  status: 'baru',
  note: '',
};

const getTodayInput = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
};

const emptyTransactionForm = () => ({
  date: getTodayInput(),
  type: 'pendapatan',
  amount: '',
  note: '',
});

const navigationItems = [
  { id: 'dashboard', icon: LayoutDashboard, title: 'Dashboard' },
  { id: 'sepeda', icon: Bike, title: 'Katalog' },
  { id: 'keuangan', icon: Wallet, title: 'Audit' },
  { id: 'settings', icon: Settings, title: 'Sistem' },
];

const dashboardStatuses = ['tersedia', 'disewa', 'bengkel', 'hilang'];

const statusIcons = {
  tersedia: Clock,
  disewa: User,
  baru: PlusCircle,
  bengkel: Wrench,
  hilang: AlertCircle,
};

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [settingsView, setSettingsView] = useState('menu');
  const [bikes, setBikes] = useState(() => loadState(STORAGE_KEYS.bikes, initialBikes));
  const [transactions, setTransactions] = useState(() => loadState(STORAGE_KEYS.transactions, initialTransactions));
  const [expandedCard, setExpandedCard] = useState('aset-aktif');
  const [searchTerm, setSearchTerm] = useState('');
  const [quickFilter, setQuickFilter] = useState('bulan');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [editingBike, setEditingBike] = useState(null);
  const [bikeForm, setBikeForm] = useState(emptyBikeForm);
  const [bikeFormError, setBikeFormError] = useState('');
  const [deleteBikeId, setDeleteBikeId] = useState(null);
  const [transactionForm, setTransactionForm] = useState(emptyTransactionForm);

  useEffect(() => {
    saveState(STORAGE_KEYS.bikes, bikes);
  }, [bikes]);

  useEffect(() => {
    saveState(STORAGE_KEYS.transactions, transactions);
  }, [transactions]);

  const effectiveDateRange = useMemo(() => {
    if (quickFilter === 'custom') return dateRange;
    return getQuickRange(quickFilter);
  }, [dateRange, quickFilter]);

  const filteredTransactions = useMemo(
    () => transactions.filter((transaction) => isDateWithinRange(transaction.date, effectiveDateRange)),
    [effectiveDateRange, transactions],
  );

  const filteredBikes = useMemo(() => {
    const query = normalizeText(searchTerm);
    if (!query) return bikes;

    return bikes.filter((bike) =>
      [bike.number, bike.type, bike.status, bike.note].some((value) => normalizeText(value).includes(query)),
    );
  }, [bikes, searchTerm]);

  const stats = useMemo(() => {
    const statusGroups = BIKE_STATUSES.reduce((groups, status) => {
      groups[status] = bikes.filter((bike) => bike.status === status);
      return groups;
    }, {});

    const pendapatan = filteredTransactions
      .filter((transaction) => transaction.type === 'pendapatan')
      .reduce((total, transaction) => total + Number(transaction.amount || 0), 0);
    const pengeluaran = filteredTransactions
      .filter((transaction) => transaction.type === 'pengeluaran')
      .reduce((total, transaction) => total + Number(transaction.amount || 0), 0);

    return {
      ...statusGroups,
      totalMilikKita: statusGroups.tersedia.length + statusGroups.disewa.length,
      pendapatan,
      pengeluaran,
      laba: pendapatan - pengeluaran,
    };
  }, [bikes, filteredTransactions]);

  const toggleExpand = (id) => {
    setExpandedCard((currentId) => (currentId === id ? null : id));
  };

  const handleQuickFilter = (filter) => {
    setQuickFilter(filter);
    setDateRange({ start: '', end: '' });
  };

  const handleDateRangeChange = (field, value) => {
    setQuickFilter('custom');
    setDateRange((currentRange) => ({ ...currentRange, [field]: value }));
  };

  const resetBikeForm = () => {
    setEditingBike(null);
    setBikeForm(emptyBikeForm);
    setBikeFormError('');
  };

  const startEditBike = (bike) => {
    setEditingBike(bike);
    setBikeForm({
      number: bike.number,
      type: bike.type,
      status: bike.status,
      note: bike.note || '',
    });
    setBikeFormError('');
    setActiveTab('settings');
    setSettingsView('kustomisasi');
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  };

  const handleSaveBike = (event) => {
    event.preventDefault();
    const normalizedNumber = bikeForm.number.trim().toUpperCase();
    const normalizedType = bikeForm.type.trim();
    const isDuplicate = bikes.some(
      (bike) => normalizeText(bike.number) === normalizeText(normalizedNumber) && bike.id !== editingBike?.id,
    );

    if (!normalizedNumber || !normalizedType) {
      setBikeFormError('Nomor unit dan tipe sepeda wajib diisi.');
      return;
    }

    if (isDuplicate) {
      setBikeFormError('Nomor unit sudah terdaftar.');
      return;
    }

    if (editingBike) {
      setBikes((currentBikes) =>
        currentBikes.map((bike) =>
          bike.id === editingBike.id
            ? { ...bike, ...bikeForm, number: normalizedNumber, type: normalizedType, note: bikeForm.note.trim() }
            : bike,
        ),
      );
    } else {
      const nextId = bikes.length > 0 ? Math.max(...bikes.map((bike) => bike.id)) + 1 : 1;
      setBikes((currentBikes) => [
        ...currentBikes,
        {
          id: nextId,
          ...bikeForm,
          number: normalizedNumber,
          type: normalizedType,
          note: bikeForm.note.trim(),
        },
      ]);
    }

    resetBikeForm();
  };

  const handleDeleteBike = (id) => {
    setBikes((currentBikes) => currentBikes.filter((bike) => bike.id !== id));
    setDeleteBikeId(null);
    if (editingBike?.id === id) resetBikeForm();
  };

  const updateBikeStatus = (id, status) => {
    setBikes((currentBikes) => currentBikes.map((bike) => (bike.id === id ? { ...bike, status } : bike)));
  };

  const handleAddTransaction = (event) => {
    event.preventDefault();
    const amount = Number(transactionForm.amount);

    if (!transactionForm.date || !transactionForm.note.trim() || amount <= 0) return;

    const nextId = transactions.length > 0 ? Math.max(...transactions.map((transaction) => transaction.id)) + 1 : 1;
    setTransactions((currentTransactions) => [
      {
        id: nextId,
        date: transactionForm.date,
        type: transactionForm.type,
        amount,
        note: transactionForm.note.trim(),
      },
      ...currentTransactions,
    ]);
    setTransactionForm(emptyTransactionForm());
  };

  const handleDeleteTransaction = (id) => {
    setTransactions((currentTransactions) => currentTransactions.filter((transaction) => transaction.id !== id));
  };

  const handleResetDemoData = () => {
    setBikes(initialBikes);
    setTransactions(initialTransactions);
    resetBikeForm();
    setDeleteBikeId(null);
  };

  const pageTitle =
    activeTab === 'dashboard'
      ? 'Overview Real-time'
      : activeTab === 'sepeda'
        ? 'Katalog Armada'
        : activeTab === 'keuangan'
          ? 'Audit Keuangan'
          : settingsView === 'kustomisasi'
            ? 'Kustomisasi Data'
            : 'Sistem Konfigurasi';

  const renderBikeMiniList = (items, emptyText = 'Tidak ada unit') =>
    items.length > 0 ? (
      <div className="space-y-2">
        {items.map((bike) => (
          <div key={bike.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-slate-800">{bike.number}</p>
              <p className="truncate text-xs font-semibold text-slate-500">{bike.type}</p>
            </div>
            <StatusBadge status={bike.status} />
          </div>
        ))}
      </div>
    ) : (
      <p className="rounded-lg bg-slate-50 px-3 py-4 text-center text-xs font-bold text-slate-400">{emptyText}</p>
    );

  const renderDateFilter = () => (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {quickFilters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => handleQuickFilter(filter.id)}
              className={`rounded-md px-4 py-2 text-xs font-black transition ${
                quickFilter === filter.id
                  ? 'bg-slate-950 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-[auto_1fr_auto_1fr] sm:items-center">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500">
            <Calendar size={16} />
            Periode
          </div>
          <input
            type="date"
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
            value={effectiveDateRange.start || ''}
            onChange={(event) => handleDateRangeChange('start', event.target.value)}
          />
          <span className="hidden text-slate-300 sm:block">-</span>
          <input
            type="date"
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
            value={effectiveDateRange.end || ''}
            onChange={(event) => handleDateRangeChange('end', event.target.value)}
          />
        </div>
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="space-y-6">
      {renderDateFilter()}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <button
          type="button"
          onClick={() => toggleExpand('aset-aktif')}
          className="rounded-lg border border-slate-800 bg-slate-950 p-6 text-left text-white shadow-soft transition hover:bg-slate-900 md:col-span-2 xl:col-span-4"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Aset aktif</p>
              <p className="mt-2 text-4xl font-black tracking-tight">
                {stats.totalMilikKita}
                <span className="ml-2 text-base font-bold text-slate-400">unit parkir dan sewa</span>
              </p>
            </div>
            <div className="rounded-lg bg-white/10 p-3">
              {expandedCard === 'aset-aktif' ? <ChevronUp size={22} /> : <ChevronDown size={22} />}
            </div>
          </div>

          {expandedCard === 'aset-aktif' ? (
            <div className="mt-6 grid gap-4 border-t border-white/10 pt-5 md:grid-cols-2">
              <div>
                <p className="mb-3 text-xs font-black uppercase tracking-wide text-emerald-300">
                  Parkir siap sewa ({stats.tersedia.length})
                </p>
                {renderBikeMiniList(stats.tersedia)}
              </div>
              <div>
                <p className="mb-3 text-xs font-black uppercase tracking-wide text-sky-300">
                  Sedang disewa ({stats.disewa.length})
                </p>
                {renderBikeMiniList(stats.disewa)}
              </div>
            </div>
          ) : null}
        </button>

        {dashboardStatuses.map((status) => {
          const meta = STATUS_META[status];
          const Icon = statusIcons[status];
          const items = stats[status];
          const isExpanded = expandedCard === status;

          return (
            <div
              key={status}
              className={`rounded-lg border bg-white p-5 shadow-soft transition ${meta.borderClass} ${
                isExpanded ? 'xl:row-span-2' : ''
              }`}
            >
              <button
                type="button"
                onClick={() => toggleExpand(status)}
                className="flex w-full items-start justify-between gap-4 text-left"
              >
                <div className={`rounded-lg p-3 ${meta.iconClass}`}>
                  <Icon size={22} />
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-slate-950">{items.length}</p>
                  <p className="text-xs font-bold text-slate-500">{meta.title}</p>
                </div>
              </button>
              {isExpanded ? <div className="mt-4 border-t border-slate-100 pt-4">{renderBikeMiniList(items)}</div> : null}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <KpiCard
          icon={TrendingUp}
          label="Total Pendapatan"
          value={formatCurrency(stats.pendapatan)}
          helper={`${filteredTransactions.length} transaksi dalam periode`}
          accentClass="bg-emerald-50 text-emerald-700"
        />
        <KpiCard
          icon={TrendingDown}
          label="Total Pengeluaran"
          value={formatCurrency(stats.pengeluaran)}
          helper={`${formatDate(effectiveDateRange.start)} - ${formatDate(effectiveDateRange.end)}`}
          accentClass="bg-rose-50 text-rose-700"
        />
        <div className="rounded-lg border border-slate-800 bg-slate-950 p-5 text-white shadow-soft">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-slate-400">Laba bersih</p>
              <p className="mt-2 text-3xl font-black tracking-tight">{formatCurrency(stats.laba)}</p>
              <p className="mt-1 text-xs font-semibold text-slate-400">Setelah pengeluaran operasional</p>
            </div>
            <div className="rounded-lg bg-white/10 p-3 text-sky-200">
              <ArrowUpRight size={24} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderArmada = () => (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-950">Katalog Armada Aktif</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">{bikes.length} unit terdaftar</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative min-w-0 sm:min-w-[320px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Cari nomor, tipe, status, catatan..."
              className="w-full rounded-md border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm font-semibold outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              resetBikeForm();
              setActiveTab('settings');
              setSettingsView('kustomisasi');
            }}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-sky-700"
          >
            <Plus size={18} />
            Unit
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-soft">
        <div className="custom-scrollbar overflow-x-auto">
          <table className="w-full min-w-[840px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">Nomor Unit</th>
                <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">Tipe & Catatan</th>
                <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">Status</th>
                <th className="px-5 py-4 text-right text-xs font-black uppercase tracking-wide text-slate-500">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBikes.length > 0 ? (
                filteredBikes.map((bike) => (
                  <tr key={bike.id} className="transition hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <span className="rounded-md bg-slate-100 px-3 py-1 text-sm font-black text-slate-900">
                        {bike.number}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-800">{bike.type}</p>
                      <p className="mt-1 max-w-[420px] truncate text-xs font-semibold text-slate-500">
                        {bike.note || 'Tidak ada catatan'}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <select
                        value={bike.status}
                        onChange={(event) => updateBikeStatus(bike.id, event.target.value)}
                        className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                      >
                        {BIKE_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {STATUS_META[status].selectLabel}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => startEditBike(bike)}
                          className="inline-flex items-center gap-2 rounded-md bg-sky-50 px-3 py-2 text-xs font-black text-sky-700 transition hover:bg-sky-100"
                          title="Edit unit"
                        >
                          <Pencil size={15} />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteBikeId(bike.id)}
                          className="inline-flex items-center gap-2 rounded-md bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 transition hover:bg-rose-100"
                          title="Hapus unit"
                        >
                          <Trash2 size={15} />
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-5 py-12">
                    <EmptyState
                      icon={Search}
                      title="Unit tidak ditemukan"
                      action={
                        <button
                          type="button"
                          onClick={() => setSearchTerm('')}
                          className="rounded-md bg-slate-950 px-4 py-2 text-xs font-black text-white"
                        >
                          Reset pencarian
                        </button>
                      }
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {deleteBikeId ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-bold text-rose-800">
              Hapus unit {bikes.find((bike) => bike.id === deleteBikeId)?.number} dari database?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleDeleteBike(deleteBikeId)}
                className="rounded-md bg-rose-600 px-4 py-2 text-xs font-black text-white transition hover:bg-rose-700"
              >
                Ya, hapus
              </button>
              <button
                type="button"
                onClick={() => setDeleteBikeId(null)}
                className="rounded-md bg-white px-4 py-2 text-xs font-black text-rose-700 ring-1 ring-rose-200"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );

  const renderFinance = () => (
    <div className="space-y-6">
      {renderDateFilter()}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
        <div className="rounded-lg border border-slate-200 bg-white shadow-soft">
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 p-5">
            <div>
              <h2 className="flex items-center gap-2 text-base font-black text-slate-950">
                <History size={18} className="text-sky-700" />
                Riwayat Transaksi
              </h2>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {formatDate(effectiveDateRange.start)} - {formatDate(effectiveDateRange.end)}
              </p>
            </div>
            <span className="rounded-md bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
              {filteredTransactions.length} data
            </span>
          </div>

          <div className="custom-scrollbar max-h-[560px] overflow-y-auto p-4">
            {filteredTransactions.length > 0 ? (
              <div className="space-y-3">
                {filteredTransactions.map((transaction) => {
                  const isIncome = transaction.type === 'pendapatan';
                  const Icon = isIncome ? TrendingUp : TrendingDown;

                  return (
                    <div
                      key={transaction.id}
                      className="flex flex-col gap-3 rounded-lg border border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`rounded-lg p-2 ${isIncome ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                          <Icon size={18} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{transaction.note}</p>
                          <p className="text-xs font-semibold text-slate-500">{formatDate(transaction.date)}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-3 sm:justify-end">
                        <p className={`text-sm font-black ${isIncome ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {isIncome ? '+' : '-'} {formatCurrency(transaction.amount)}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleDeleteTransaction(transaction.id)}
                          className="rounded-md p-2 text-slate-400 transition hover:bg-white hover:text-rose-600"
                          title="Hapus transaksi"
                        >
                          <XCircle size={18} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState icon={History} title="Belum ada transaksi dalam periode ini" />
            )}
          </div>
        </div>

        <div className="space-y-4">
          <form onSubmit={handleAddTransaction} className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
            <h3 className="mb-4 flex items-center gap-2 text-base font-black text-slate-950">
              <PlusCircle size={18} className="text-sky-700" />
              Transaksi Baru
            </h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Tanggal</label>
                <input
                  type="date"
                  className="w-full rounded-md border border-slate-200 px-3 py-3 text-sm font-semibold outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  value={transactionForm.date}
                  onChange={(event) => setTransactionForm({ ...transactionForm, date: event.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Jenis</label>
                <select
                  className="w-full rounded-md border border-slate-200 px-3 py-3 text-sm font-semibold outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  value={transactionForm.type}
                  onChange={(event) => setTransactionForm({ ...transactionForm, type: event.target.value })}
                >
                  <option value="pendapatan">Pendapatan</option>
                  <option value="pengeluaran">Pengeluaran</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Nominal</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="150000"
                  className="w-full rounded-md border border-slate-200 px-3 py-3 text-sm font-semibold outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  value={transactionForm.amount}
                  onChange={(event) => setTransactionForm({ ...transactionForm, amount: event.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Catatan</label>
                <textarea
                  rows="3"
                  placeholder="Contoh: Sewa S-001 selama 3 jam"
                  className="w-full resize-none rounded-md border border-slate-200 px-3 py-3 text-sm font-semibold outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  value={transactionForm.note}
                  onChange={(event) => setTransactionForm({ ...transactionForm, note: event.target.value })}
                />
              </div>
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-sky-700"
              >
                <Save size={18} />
                Simpan Transaksi
              </button>
            </div>
          </form>

          <div className="rounded-lg border border-slate-800 bg-slate-950 p-5 text-white shadow-soft">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">Target bulanan</p>
            <p className="mt-2 text-3xl font-black">Rp25.000.000</p>
            <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-[65%] rounded-full bg-sky-400" />
            </div>
            <p className="mt-2 text-xs font-bold text-slate-400">65% dari target tercapai</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSettingsMenu = () => (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <button
        type="button"
        onClick={() => setSettingsView('kustomisasi')}
        className="rounded-lg border border-slate-200 bg-white p-6 text-left shadow-soft transition hover:border-sky-200 hover:bg-sky-50"
      >
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
          <SlidersHorizontal size={24} />
        </div>
        <h3 className="text-lg font-black text-slate-950">Kustomisasi Armada</h3>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
          Kelola database unit, status operasional, dan catatan armada.
        </p>
        <div className="mt-5 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide text-sky-700">
          Buka Manajemen <ArrowUpRight size={15} />
        </div>
      </button>

      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-white text-slate-400">
          <Settings size={24} />
        </div>
        <h3 className="text-lg font-black text-slate-400">Profil Bisnis</h3>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-400">Nama rental, alamat, dan kontak operasional.</p>
      </div>

      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-white text-slate-400">
          <CheckCircle2 size={24} />
        </div>
        <h3 className="text-lg font-black text-slate-400">Checklist Harian</h3>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-400">Pemeriksaan unit sebelum dan sesudah sewa.</p>
      </div>
    </div>
  );

  const renderBikeManagement = () => (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => {
            setSettingsView('menu');
            resetBikeForm();
          }}
          className="inline-flex items-center gap-2 text-sm font-black text-slate-500 transition hover:text-sky-700"
        >
          <ChevronDown className="rotate-90" size={18} />
          Kembali ke Sistem
        </button>
        <button
          type="button"
          onClick={handleResetDemoData}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-100 px-4 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-200"
        >
          <RotateCcw size={15} />
          Reset Data Demo
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_1fr]">
        <form onSubmit={handleSaveBike} className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <h3 className="mb-5 flex items-center gap-2 text-base font-black text-slate-950">
            {editingBike ? <Pencil size={18} className="text-sky-700" /> : <PlusCircle size={18} className="text-sky-700" />}
            {editingBike ? 'Edit Unit' : 'Registrasi Unit Baru'}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Nomor Seri/Plat</label>
              <input
                type="text"
                placeholder="Contoh: S-011"
                className="w-full rounded-md border border-slate-200 px-3 py-3 text-sm font-semibold uppercase outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                value={bikeForm.number}
                onChange={(event) => setBikeForm({ ...bikeForm, number: event.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Tipe Sepeda</label>
              <input
                type="text"
                placeholder="Contoh: Electric Scooter"
                className="w-full rounded-md border border-slate-200 px-3 py-3 text-sm font-semibold outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                value={bikeForm.type}
                onChange={(event) => setBikeForm({ ...bikeForm, type: event.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Status</label>
              <select
                className="w-full rounded-md border border-slate-200 px-3 py-3 text-sm font-semibold outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                value={bikeForm.status}
                onChange={(event) => setBikeForm({ ...bikeForm, status: event.target.value })}
              >
                {BIKE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_META[status].selectLabel}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Catatan</label>
              <textarea
                rows="4"
                placeholder="Kondisi unit, lokasi parkir, penyewa, atau catatan bengkel"
                className="w-full resize-none rounded-md border border-slate-200 px-3 py-3 text-sm font-semibold outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                value={bikeForm.note}
                onChange={(event) => setBikeForm({ ...bikeForm, note: event.target.value })}
              />
            </div>

            {bikeFormError ? <p className="rounded-md bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{bikeFormError}</p> : null}

            <div className="flex gap-2">
              <button
                type="submit"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-sky-700"
              >
                <Save size={18} />
                {editingBike ? 'Simpan' : 'Tambah'}
              </button>
              {editingBike ? (
                <button
                  type="button"
                  onClick={resetBikeForm}
                  className="rounded-md bg-slate-100 px-4 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-200"
                >
                  Batal
                </button>
              ) : null}
            </div>
          </div>
        </form>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-soft">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Daftar Kendali Penuh</p>
            <span className="rounded-md bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{bikes.length} unit</span>
          </div>
          <div className="custom-scrollbar max-h-[640px] divide-y divide-slate-100 overflow-y-auto">
            {bikes.map((bike) => {
              const Icon = statusIcons[bike.status] || Bike;
              const meta = STATUS_META[bike.status] || STATUS_META.baru;

              return (
                <div key={bike.id} className="p-5 transition hover:bg-slate-50">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-4">
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${meta.iconClass}`}>
                        <Icon size={22} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-black text-slate-950">{bike.number}</p>
                        <p className="truncate text-sm font-semibold text-slate-500">{bike.type}</p>
                        {bike.note ? <p className="mt-1 truncate text-xs font-semibold text-slate-400">{bike.note}</p> : null}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <StatusBadge status={bike.status} />
                      <button
                        type="button"
                        onClick={() => startEditBike(bike)}
                        className="rounded-md p-2 text-slate-400 transition hover:bg-sky-50 hover:text-sky-700"
                        title="Edit unit"
                      >
                        <SlidersHorizontal size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteBikeId(bike.id)}
                        className="rounded-md p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-700"
                        title="Hapus unit"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {deleteBikeId ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-bold text-rose-800">
              Hapus unit {bikes.find((bike) => bike.id === deleteBikeId)?.number} dari database?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleDeleteBike(deleteBikeId)}
                className="rounded-md bg-rose-600 px-4 py-2 text-xs font-black text-white transition hover:bg-rose-700"
              >
                Ya, hapus
              </button>
              <button
                type="button"
                onClick={() => setDeleteBikeId(null)}
                className="rounded-md bg-white px-4 py-2 text-xs font-black text-rose-700 ring-1 ring-rose-200"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <nav className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-white shadow-soft">
              <Bike size={22} />
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-black leading-none tracking-tight">BIKE RENT</p>
              <p className="text-[10px] font-black leading-none tracking-wide text-sky-700">PRO SYSTEMS</p>
            </div>
          </div>

          <div className="flex rounded-lg bg-slate-100 p-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    setSettingsView('menu');
                  }}
                  title={item.title}
                  className={`relative rounded-md p-3 transition ${
                    isActive ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Icon size={20} />
                  <span className="sr-only">{item.title}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right md:block">
              <p className="text-xs font-black text-slate-900">Admin Utama</p>
              <p className="text-[10px] font-bold text-slate-500">Operasional</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm">
              <User size={19} />
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <div className="mb-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-700">Sistem Monitoring Bisnis</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{pageTitle}</h1>
        </div>

        {activeTab === 'dashboard' ? renderDashboard() : null}
        {activeTab === 'sepeda' ? renderArmada() : null}
        {activeTab === 'keuangan' ? renderFinance() : null}
        {activeTab === 'settings' ? (settingsView === 'menu' ? renderSettingsMenu() : renderBikeManagement()) : null}
      </main>
    </div>
  );
}
