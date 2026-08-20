import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  Bike,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
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
import {
  BIKE_STATUSES,
  STATUS_META,
  initialBikes,
  initialRentalRates,
  initialTransactions,
  quickFilters,
} from './data/seed.js';
import { getQuickRange, isDateWithinRange } from './lib/dateFilters.js';
import { formatCurrency, formatDate, formatFullDate, normalizeText } from './lib/formatters.js';
import { loadState, saveState } from './lib/storage.js';

const STORAGE_KEYS = {
  bikes: 'bike-rent-pro:bikes',
  transactions: 'bike-rent-pro:transactions',
  rentalRates: 'bike-rent-pro:rental-rates',
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
  bikeId: '',
  pricingMode: 'auto',
  amount: '',
  note: '',
});

const navigationItems = [
  { id: 'dashboard', icon: LayoutDashboard, title: 'Overview' },
  { id: 'sepeda', icon: Bike, title: 'Katalog' },
  { id: 'keuangan', icon: Wallet, title: 'Keuangan' },
  { id: 'settings', icon: Settings, title: 'Sistem' },
];

const dashboardStatusCards = [
  { id: 'siap-sewa', status: 'tersedia' },
  { id: 'disewa', status: 'disewa' },
  { id: 'bengkel', status: 'bengkel' },
  { id: 'hilang', status: 'hilang' },
];
const rentableStatuses = ['tersedia', 'baru'];
const defaultRentalRate = { cost: 30000, price: 50000 };

const normalizeRentalRate = (rate = {}) => ({
  cost: Math.max(0, Number(rate.cost ?? defaultRentalRate.cost) || 0),
  price: Math.max(0, Number(rate.price ?? defaultRentalRate.price) || 0),
});

const statusIcons = {
  tersedia: Clock,
  disewa: User,
  baru: PlusCircle,
  bengkel: Wrench,
  hilang: AlertCircle,
};

const weekdayLabels = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

const parseInputDate = (value) => {
  if (!value) return null;

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toInputDate = (date) => {
  const localDate = new Date(date);
  localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
  return localDate.toISOString().slice(0, 10);
};

const getMonthStart = (date) => new Date(date.getFullYear(), date.getMonth(), 1);

const addMonths = (date, amount) => new Date(date.getFullYear(), date.getMonth() + amount, 1);

const getCalendarDays = (monthDate) => {
  const monthStart = getMonthStart(monthDate);
  const mondayOffset = (monthStart.getDay() + 6) % 7;
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - mondayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });
};

const isWithinRange = (dateValue, range) =>
  Boolean(range.start && range.end && dateValue >= range.start && dateValue <= range.end);

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [settingsView, setSettingsView] = useState('menu');
  const [bikes, setBikes] = useState(() => loadState(STORAGE_KEYS.bikes, initialBikes));
  const [transactions, setTransactions] = useState(() => loadState(STORAGE_KEYS.transactions, initialTransactions));
  const [rentalRates, setRentalRates] = useState(() => loadState(STORAGE_KEYS.rentalRates, initialRentalRates));
  const [expandedCard, setExpandedCard] = useState('aset-aktif');
  const [searchTerm, setSearchTerm] = useState('');
  const [quickFilter, setQuickFilter] = useState('hari');
  const [dateRange, setDateRange] = useState(() => getQuickRange('hari'));
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => parseInputDate(getQuickRange('hari').start) || new Date());
  const [editingBike, setEditingBike] = useState(null);
  const [bikeForm, setBikeForm] = useState(emptyBikeForm);
  const [bikeFormError, setBikeFormError] = useState('');
  const [deleteBikeId, setDeleteBikeId] = useState(null);
  const [deleteTransactionId, setDeleteTransactionId] = useState(null);
  const [transactionForm, setTransactionForm] = useState(emptyTransactionForm);
  const [transactionFormError, setTransactionFormError] = useState('');
  const [notice, setNotice] = useState(null);
  const transactionBikeRef = useRef(null);

  useEffect(() => {
    saveState(STORAGE_KEYS.bikes, bikes);
  }, [bikes]);

  useEffect(() => {
    saveState(STORAGE_KEYS.transactions, transactions);
  }, [transactions]);

  useEffect(() => {
    saveState(STORAGE_KEYS.rentalRates, rentalRates);
  }, [rentalRates]);

  useEffect(() => {
    if (!notice) return undefined;

    const timeoutId = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [notice]);

  const showNotice = (message, tone = 'success') => {
    setNotice({ id: Date.now(), message, tone });
  };

  const navigateTo = (tab, view = 'menu', focusTransaction = false) => {
    setActiveTab(tab);
    setSettingsView(view);
    setIsDatePickerOpen(false);

    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (focusTransaction) transactionBikeRef.current?.focus();
    });
  };

  const effectiveDateRange = useMemo(() => {
    if (quickFilter === 'custom') return dateRange;
    return getQuickRange(quickFilter);
  }, [dateRange, quickFilter]);

  const calendarDays = useMemo(() => getCalendarDays(calendarMonth), [calendarMonth]);

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

  const rentableBikes = useMemo(
    () => bikes.filter((bike) => rentableStatuses.includes(bike.status)),
    [bikes],
  );

  const bikeTypes = useMemo(() => {
    const types = new Set([
      ...bikes.map((bike) => bike.type).filter(Boolean),
      ...Object.keys(rentalRates),
    ]);

    return Array.from(types).sort((firstType, secondType) => firstType.localeCompare(secondType));
  }, [bikes, rentalRates]);

  const selectedTransactionBike = useMemo(
    () => bikes.find((bike) => bike.id === Number(transactionForm.bikeId)),
    [bikes, transactionForm.bikeId],
  );

  const selectedRentalRate = selectedTransactionBike
    ? normalizeRentalRate(rentalRates[selectedTransactionBike.type])
    : defaultRentalRate;
  const calculatedRentalAmount =
    selectedTransactionBike && transactionForm.pricingMode === 'auto'
      ? selectedRentalRate.price
      : 0;
  const calculatedRentalProfit = selectedTransactionBike
    ? (transactionForm.pricingMode === 'auto' ? selectedRentalRate.price : Number(transactionForm.amount) || 0) -
      selectedRentalRate.cost
    : 0;

  const stats = useMemo(() => {
    const statusGroups = BIKE_STATUSES.reduce((groups, status) => {
      groups[status] = bikes.filter((bike) => bike.status === status);
      return groups;
    }, {});

    const pendapatan = filteredTransactions
      .filter((transaction) => transaction.type === 'pendapatan')
      .reduce((total, transaction) => total + Number(transaction.amount || 0), 0);
    const setoranRental = filteredTransactions
      .filter((transaction) => transaction.type === 'pendapatan')
      .reduce((total, transaction) => total + Number(transaction.costAmount || 0), 0);
    const pengeluaranOperasional = filteredTransactions
      .filter((transaction) => transaction.type === 'pengeluaran')
      .reduce((total, transaction) => total + Number(transaction.amount || 0), 0);
    const pengeluaran = setoranRental + pengeluaranOperasional;
    const transaksiBelumDisetor = filteredTransactions.filter(
      (transaction) =>
        transaction.type === 'pendapatan' && Number(transaction.costAmount || 0) > 0 && !transaction.settled,
    );
    const setoranBelumDisetor = transaksiBelumDisetor.reduce(
      (total, transaction) => total + Number(transaction.costAmount || 0),
      0,
    );
    const setoranSudahDisetor = setoranRental - setoranBelumDisetor;
    const siapSewa = bikes.filter((bike) => rentableStatuses.includes(bike.status));

    return {
      ...statusGroups,
      siapSewa,
      totalMilikKita: siapSewa.length + statusGroups.disewa.length,
      pendapatan,
      setoranRental,
      setoranBelumDisetor,
      setoranSudahDisetor,
      transaksiBelumDisetor: transaksiBelumDisetor.length,
      pengeluaranOperasional,
      pengeluaran,
      laba: pendapatan - pengeluaran,
    };
  }, [bikes, filteredTransactions]);

  const transactionGroups = useMemo(() => {
    const sortedTransactions = [...filteredTransactions].sort((firstTransaction, secondTransaction) => {
      const dateComparison = secondTransaction.date.localeCompare(firstTransaction.date);
      if (dateComparison !== 0) return dateComparison;
      return secondTransaction.id - firstTransaction.id;
    });

    const groups = sortedTransactions.reduce((groupMap, transaction) => {
      if (!groupMap.has(transaction.date)) {
        groupMap.set(transaction.date, {
          date: transaction.date,
          transactions: [],
          pendapatan: 0,
          pengeluaran: 0,
        });
      }

      const group = groupMap.get(transaction.date);
      const amount = Number(transaction.amount || 0);
      const costAmount = Number(transaction.costAmount || 0);
      group.transactions.push(transaction);

      if (transaction.type === 'pendapatan') {
        group.pendapatan += amount;
        group.pengeluaran += costAmount;
      } else {
        group.pengeluaran += amount;
      }

      return groupMap;
    }, new Map());

    return Array.from(groups.values()).map((group) => ({
      ...group,
      laba: group.pendapatan - group.pengeluaran,
    }));
  }, [filteredTransactions]);

  const toggleExpand = (id) => {
    setExpandedCard((currentId) => (currentId === id ? null : id));
  };

  const handleQuickFilter = (filter) => {
    const nextRange = getQuickRange(filter);
    setQuickFilter(filter);
    setDateRange(nextRange);
    setCalendarMonth(parseInputDate(nextRange.start) || new Date());
    setIsDatePickerOpen(false);
  };

  const handleCalendarDateSelect = (dateValue) => {
    const activeDate = parseInputDate(dateValue);
    const shouldStartNewRange =
      quickFilter !== 'custom' || !dateRange.start || (dateRange.start && dateRange.end && dateRange.start !== dateRange.end);

    if (shouldStartNewRange) {
      setDateRange({ start: dateValue, end: dateValue });
    } else if (dateValue < dateRange.start) {
      setDateRange({ start: dateValue, end: dateRange.start });
    } else {
      setDateRange({ start: dateRange.start, end: dateValue });
    }

    setQuickFilter('custom');
    if (activeDate) setCalendarMonth(getMonthStart(activeDate));
  };

  const handleTodayRange = () => {
    const todayRange = getQuickRange('hari');
    setQuickFilter('hari');
    setDateRange(todayRange);
    setCalendarMonth(parseInputDate(todayRange.start) || new Date());
    setIsDatePickerOpen(false);
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

    const wasEditing = Boolean(editingBike);

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
    showNotice(wasEditing ? `Unit ${normalizedNumber} berhasil diperbarui.` : `Unit ${normalizedNumber} berhasil ditambahkan.`);
  };

  const handleDeleteBike = (id) => {
    const deletedBike = bikes.find((bike) => bike.id === id);
    setBikes((currentBikes) => currentBikes.filter((bike) => bike.id !== id));
    setDeleteBikeId(null);
    if (editingBike?.id === id) resetBikeForm();
    showNotice(`Unit ${deletedBike?.number || ''} telah dihapus.`, 'warning');
  };

  const updateBikeStatus = (id, status) => {
    setBikes((currentBikes) => currentBikes.map((bike) => (bike.id === id ? { ...bike, status } : bike)));
    const bike = bikes.find((item) => item.id === id);
    showNotice(`Status ${bike?.number || 'unit'} menjadi ${STATUS_META[status]?.label || status}.`);
  };

  const handleAddTransaction = (event) => {
    event.preventDefault();
    const selectedBikeId = Number(transactionForm.bikeId);
    const selectedBike = bikes.find((bike) => bike.id === selectedBikeId);
    const shouldRentBike = transactionForm.type === 'pendapatan' && selectedBike;
    const amount =
      shouldRentBike && transactionForm.pricingMode === 'auto'
        ? calculatedRentalAmount
        : Number(transactionForm.amount);
    const rentalRate = shouldRentBike ? normalizeRentalRate(rentalRates[selectedBike.type]) : defaultRentalRate;
    const costAmount = shouldRentBike ? rentalRate.cost : 0;
    const cleanNote = transactionForm.note.trim();

    if (!transactionForm.date || amount <= 0 || (!cleanNote && !shouldRentBike)) {
      setTransactionFormError('Tanggal, nominal, dan catatan atau unit sewa wajib diisi.');
      return;
    }

    if (shouldRentBike && !rentableStatuses.includes(selectedBike.status)) {
      setTransactionFormError('Unit yang dipilih tidak siap disewa.');
      return;
    }

    const nextId = transactions.length > 0 ? Math.max(...transactions.map((transaction) => transaction.id)) + 1 : 1;
    const transactionNote = shouldRentBike
      ? cleanNote
        ? `Sewa ${selectedBike.number} - ${cleanNote}`
        : `Sewa ${selectedBike.number}`
      : cleanNote;

    setTransactions((currentTransactions) => [
      {
        id: nextId,
        date: transactionForm.date,
        type: transactionForm.type,
        amount,
        note: transactionNote,
        bikeId: shouldRentBike ? selectedBike.id : null,
        bikeNumber: shouldRentBike ? selectedBike.number : null,
        costAmount: shouldRentBike ? costAmount : 0,
        grossProfit: shouldRentBike ? amount - costAmount : null,
        settled: shouldRentBike ? false : null,
        settledAt: null,
      },
      ...currentTransactions,
    ]);

    if (shouldRentBike) {
      setBikes((currentBikes) =>
        currentBikes.map((bike) => (bike.id === selectedBike.id ? { ...bike, status: 'disewa' } : bike)),
      );
    }

    setTransactionFormError('');
    setTransactionForm(emptyTransactionForm());
    showNotice(
      shouldRentBike
        ? `Sewa ${selectedBike.number} tercatat dan unit berstatus Disewa.`
        : 'Transaksi berhasil disimpan.',
    );
  };

  const handleDeleteTransaction = (id) => {
    setTransactions((currentTransactions) => currentTransactions.filter((transaction) => transaction.id !== id));
    setDeleteTransactionId(null);
    showNotice('Transaksi telah dihapus.', 'warning');
  };

  const handleToggleSettlement = (id) => {
    const transaction = transactions.find((item) => item.id === id);
    const nextSettled = !transaction?.settled;

    setTransactions((currentTransactions) =>
      currentTransactions.map((item) =>
        item.id === id
          ? { ...item, settled: nextSettled, settledAt: nextSettled ? new Date().toISOString() : null }
          : item,
      ),
    );
    showNotice(nextSettled ? 'Setoran rental ditandai sudah dibayar.' : 'Setoran dikembalikan ke daftar belum dibayar.');
  };

  const updateRentalRate = (bikeType, field, value) => {
    const numericValue = Math.max(0, Number(value) || 0);
    setRentalRates((currentRates) => ({
      ...currentRates,
      [bikeType]: {
        ...normalizeRentalRate(currentRates[bikeType]),
        [field]: numericValue,
      },
    }));
  };

  const resetRentalRates = () => {
    setRentalRates(initialRentalRates);
    showNotice('Harga sewa dikembalikan ke nilai awal.', 'warning');
  };

  const handleResetDemoData = () => {
    setBikes(initialBikes);
    setTransactions(initialTransactions);
    setRentalRates(initialRentalRates);
    resetBikeForm();
    setDeleteBikeId(null);
    setDeleteTransactionId(null);
    showNotice('Seluruh data demo berhasil dipulihkan.', 'warning');
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
            : settingsView === 'harga'
              ? 'Pengaturan Harga'
              : 'Sistem Konfigurasi';

  useEffect(() => {
    const description =
      activeTab === 'dashboard'
        ? 'Pantau armada, transaksi, laba, dan setoran rental sepeda secara real-time.'
        : activeTab === 'sepeda'
          ? 'Kelola katalog, kondisi, dan status ketersediaan armada sepeda.'
          : activeTab === 'keuangan'
            ? 'Catat pendapatan, pengeluaran, laba, dan penyelesaian setoran rental.'
            : 'Atur armada dan harga sewa dinamis untuk operasional rental sepeda.';

    document.title = `${pageTitle} | Bike Rent Pro Systems`;
    document.querySelector('meta[name="description"]')?.setAttribute('content', description);
  }, [activeTab, pageTitle]);

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

  const selectedDateRangeLabel =
    effectiveDateRange.start === effectiveDateRange.end
      ? formatDate(effectiveDateRange.start)
      : `${formatDate(effectiveDateRange.start)} - ${formatDate(effectiveDateRange.end)}`;

  const renderDateFilter = () => (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter cepat periode">
          {quickFilters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => handleQuickFilter(filter.id)}
              aria-pressed={quickFilter === filter.id}
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

        <div className="relative">
          <button
            type="button"
            onClick={() => setIsDatePickerOpen((isOpen) => !isOpen)}
            className="flex w-full min-w-[280px] items-center justify-between gap-4 rounded-md border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-sky-300 focus:border-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-100 sm:w-auto"
            aria-expanded={isDatePickerOpen}
            aria-haspopup="dialog"
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-sky-50 text-sky-700">
                <Calendar size={17} />
              </span>
              <span className="min-w-0">
                <span className="block text-[10px] font-black uppercase tracking-wide text-slate-600">Periode</span>
                <span className="block truncate text-sm font-black text-slate-800">{selectedDateRangeLabel}</span>
              </span>
            </span>
            <ChevronDown size={18} className={`shrink-0 text-slate-400 transition ${isDatePickerOpen ? 'rotate-180' : ''}`} />
          </button>

          {isDatePickerOpen ? (
            <div
              className="absolute right-0 top-full z-30 mt-3 w-[min(92vw,380px)] rounded-lg border border-slate-200 bg-white p-4 shadow-2xl"
              role="dialog"
              aria-label="Kalender pemilih periode"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setCalendarMonth((currentMonth) => addMonths(currentMonth, -1))}
                  className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                  title="Bulan sebelumnya"
                  aria-label="Bulan sebelumnya"
                >
                  <ChevronLeft size={18} />
                </button>
                <div className="text-center">
                  <p className="text-sm font-black text-slate-950">
                    {new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(calendarMonth)}
                  </p>
                  <p className="text-xs font-semibold text-slate-500">{selectedDateRangeLabel}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCalendarMonth((currentMonth) => addMonths(currentMonth, 1))}
                  className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                  title="Bulan berikutnya"
                  aria-label="Bulan berikutnya"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center">
                {weekdayLabels.map((label) => (
                  <div key={label} className="py-2 text-[10px] font-black uppercase tracking-wide text-slate-400">
                    {label}
                  </div>
                ))}
                {calendarDays.map((date) => {
                  const dateValue = toInputDate(date);
                  const isCurrentMonth = date.getMonth() === calendarMonth.getMonth();
                  const isStart = dateValue === effectiveDateRange.start;
                  const isEnd = dateValue === effectiveDateRange.end;
                  const isSelected = isStart || isEnd;
                  const isRangeMiddle = isWithinRange(dateValue, effectiveDateRange) && !isSelected;
                  const isToday = dateValue === getQuickRange('hari').start;

                  return (
                    <button
                      key={dateValue}
                      type="button"
                      onClick={() => handleCalendarDateSelect(dateValue)}
                      aria-label={formatFullDate(dateValue)}
                      aria-pressed={isWithinRange(dateValue, effectiveDateRange)}
                      className={`h-10 rounded-md text-sm font-bold transition ${
                        isSelected
                          ? 'bg-slate-950 text-white shadow-sm'
                          : isRangeMiddle
                            ? 'bg-sky-50 text-sky-800'
                            : isToday
                              ? 'bg-slate-100 text-slate-950 ring-1 ring-sky-200'
                              : 'text-slate-700 hover:bg-slate-100'
                      } ${isCurrentMonth ? '' : 'opacity-40'}`}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={handleTodayRange}
                  className="rounded-md bg-sky-50 px-3 py-2 text-xs font-black text-sky-700 transition hover:bg-sky-100"
                >
                  Hari ini
                </button>
                <button
                  type="button"
                  onClick={() => setIsDatePickerOpen(false)}
                  className="rounded-md bg-slate-950 px-4 py-2 text-xs font-black text-white transition hover:bg-slate-800"
                >
                  Terapkan
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="space-y-6">
      {renderDateFilter()}

      <section className="flex flex-col gap-4 border-y border-slate-200 py-4 lg:flex-row lg:items-center lg:justify-between" aria-labelledby="quick-actions-title">
        <div>
          <h2 id="quick-actions-title" className="text-sm font-black text-slate-950">Aksi Cepat Operasional</h2>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {stats.disewa.length} unit disewa · {stats.transaksiBelumDisetor} setoran belum selesai
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => {
              setTransactionForm((currentForm) => ({ ...currentForm, type: 'pendapatan' }));
              navigateTo('keuangan', 'menu', true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-3 text-xs font-black text-white transition hover:bg-sky-700"
          >
            <PlusCircle size={17} />
            Catat Sewa
          </button>
          <button
            type="button"
            onClick={() => {
              setSearchTerm('disewa');
              navigateTo('sepeda');
            }}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-sky-50 px-4 py-3 text-xs font-black text-sky-800 ring-1 ring-sky-200 transition hover:bg-sky-100"
          >
            <CheckCircle2 size={17} />
            Pengembalian ({stats.disewa.length})
          </button>
          <button
            type="button"
            onClick={() => navigateTo('keuangan')}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-rose-50 px-4 py-3 text-xs font-black text-rose-800 ring-1 ring-rose-200 transition hover:bg-rose-100"
          >
            <Wallet size={17} />
            Setoran {formatCurrency(stats.setoranBelumDisetor)}
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <section className="rounded-lg border border-slate-800 bg-slate-950 p-6 text-left text-white shadow-soft md:col-span-2 xl:col-span-4">
          <button
            type="button"
            onClick={() => toggleExpand('aset-aktif')}
            className="flex w-full items-start justify-between gap-4 text-left"
            aria-expanded={expandedCard === 'aset-aktif'}
          >
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
          </button>

          {expandedCard === 'aset-aktif' ? (
            <div className="mt-6 grid gap-4 border-t border-white/10 pt-5 md:grid-cols-2">
              <div>
                <p className="mb-3 text-xs font-black uppercase tracking-wide text-emerald-300">
                  Parkir siap sewa ({stats.siapSewa.length})
                </p>
                {renderBikeMiniList(stats.siapSewa)}
              </div>
              <div>
                <p className="mb-3 text-xs font-black uppercase tracking-wide text-sky-300">
                  Sedang disewa ({stats.disewa.length})
                </p>
                {renderBikeMiniList(stats.disewa)}
              </div>
            </div>
          ) : null}
        </section>

        {dashboardStatusCards.map(({ id, status }) => {
          const meta = STATUS_META[status];
          const Icon = statusIcons[status];
          const items = id === 'siap-sewa' ? stats.siapSewa : stats[status];
          const isExpanded = expandedCard === id;

          return (
            <div
              key={id}
              className={`rounded-lg border bg-white p-5 shadow-soft transition ${meta.borderClass} ${
                isExpanded ? 'xl:row-span-2' : ''
              }`}
            >
              <button
                type="button"
                onClick={() => toggleExpand(id)}
                className="flex w-full items-start justify-between gap-4 text-left"
                aria-expanded={isExpanded}
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={TrendingUp}
          label="Pendapatan Tamu"
          value={formatCurrency(stats.pendapatan)}
          helper={`${filteredTransactions.length} transaksi dalam periode`}
          accentClass="bg-emerald-50 text-emerald-700"
        />
        <KpiCard
          icon={Wallet}
          label="Setoran Belum Dibayar"
          value={formatCurrency(stats.setoranBelumDisetor)}
          helper={`${stats.transaksiBelumDisetor} transaksi menunggu setoran`}
          accentClass="bg-sky-50 text-sky-700"
        />
        <KpiCard
          icon={TrendingDown}
          label="Operasional"
          value={formatCurrency(stats.pengeluaranOperasional)}
          helper="Di luar modal/setoran rental"
          accentClass="bg-rose-50 text-rose-700"
        />
        <div className="rounded-lg border border-slate-800 bg-slate-950 p-5 text-white shadow-soft">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-slate-400">Laba bersih</p>
              <p className="mt-2 text-3xl font-black tracking-tight">{formatCurrency(stats.laba)}</p>
              <p className="mt-1 text-xs font-semibold text-slate-400">
                Setelah setoran {formatCurrency(stats.setoranRental)}
              </p>
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
              id="catalog-search"
              type="text"
              aria-label="Cari unit di katalog"
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
                        aria-label={`Status unit ${bike.number}`}
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
                        {bike.status === 'disewa' ? (
                          <button
                            type="button"
                            onClick={() => updateBikeStatus(bike.id, 'tersedia')}
                            className="inline-flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 transition hover:bg-emerald-100"
                            title="Tandai unit sudah kembali"
                          >
                            <CheckCircle2 size={15} />
                            Kembalikan
                          </button>
                        ) : null}
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

          <div className="border-b border-slate-100 p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-emerald-700">
                  <TrendingUp size={16} />
                  Pendapatan
                </div>
                <p className="mt-2 text-xl font-black text-emerald-800">{formatCurrency(stats.pendapatan)}</p>
              </div>
              <div className="rounded-lg border border-rose-100 bg-rose-50 p-4">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-rose-700">
                  <TrendingDown size={16} />
                  Pengeluaran
                </div>
                <p className="mt-2 text-xl font-black text-rose-800">{formatCurrency(stats.pengeluaran)}</p>
              </div>
              <div className="rounded-lg border border-sky-100 bg-sky-50 p-4">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-sky-700">
                  <ArrowUpRight size={16} />
                  Keuntungan
                </div>
                <p className={`mt-2 text-xl font-black ${stats.laba >= 0 ? 'text-sky-800' : 'text-rose-800'}`}>
                  {formatCurrency(stats.laba)}
                </p>
              </div>
            </div>
          </div>

          <div className="custom-scrollbar max-h-[640px] overflow-y-auto p-4">
            {transactionGroups.length > 0 ? (
              <div className="space-y-5">
                {transactionGroups.map((group) => (
                  <section key={group.date} className="rounded-lg border border-slate-200 bg-white">
                    <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <h3 className="text-sm font-black text-slate-950">{formatFullDate(group.date)}</h3>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          {group.transactions.length} transaksi pada tanggal ini
                        </p>
                      </div>
                      <div className="grid grid-cols-1 gap-2 text-right sm:grid-cols-3">
                        <div className="rounded-md bg-white px-3 py-2 ring-1 ring-slate-200">
                          <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Masuk</p>
                          <p className="text-xs font-black text-emerald-700">{formatCurrency(group.pendapatan)}</p>
                        </div>
                        <div className="rounded-md bg-white px-3 py-2 ring-1 ring-slate-200">
                          <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Keluar</p>
                          <p className="text-xs font-black text-rose-700">{formatCurrency(group.pengeluaran)}</p>
                        </div>
                        <div className="rounded-md bg-white px-3 py-2 ring-1 ring-slate-200">
                          <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Laba</p>
                          <p className={`text-xs font-black ${group.laba >= 0 ? 'text-sky-700' : 'text-rose-700'}`}>
                            {formatCurrency(group.laba)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="divide-y divide-slate-100 p-2">
                      {group.transactions.map((transaction, index) => {
                        const isIncome = transaction.type === 'pendapatan';
                        const Icon = isIncome ? TrendingUp : TrendingDown;

                        return (
                          <div
                            key={transaction.id}
                            className="grid gap-3 rounded-md px-3 py-4 transition hover:bg-slate-50 md:grid-cols-[auto_1fr_auto] md:items-center"
                          >
                            <div className="flex items-center gap-3">
                              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-xs font-black text-slate-500">
                                {index + 1}
                              </span>
                              <div
                                className={`rounded-lg p-2 ${
                                  isIncome ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                                }`}
                              >
                                <Icon size={18} />
                              </div>
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-bold text-slate-800">{transaction.note}</p>
                              <p className="mt-1 text-xs font-semibold text-slate-500">
                                {isIncome ? 'Pendapatan' : 'Pengeluaran'}
                                {transaction.bikeNumber ? ` - Unit ${transaction.bikeNumber}` : ''}
                                {transaction.costAmount
                                  ? ` - Modal ${formatCurrency(transaction.costAmount)} - Laba ${formatCurrency(
                                      Number(transaction.amount || 0) - Number(transaction.costAmount || 0),
                                    )}`
                                  : ''}
                              </p>
                            </div>
                            <div className="flex items-center justify-between gap-3 md:justify-end">
                              <p className={`text-sm font-black ${isIncome ? 'text-emerald-700' : 'text-rose-700'}`}>
                                {isIncome ? '+' : '-'} {formatCurrency(transaction.amount)}
                              </p>
                              {transaction.costAmount ? (
                                <button
                                  type="button"
                                  onClick={() => handleToggleSettlement(transaction.id)}
                                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-2 text-xs font-black transition ${
                                    transaction.settled
                                      ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                      : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                  }`}
                                  title={transaction.settled ? 'Batalkan status setoran' : 'Tandai setoran sudah dibayar'}
                                >
                                  <CheckCircle2 size={16} />
                                  {transaction.settled ? 'Disetor' : 'Setor'}
                                </button>
                              ) : null}
                              {deleteTransactionId === transaction.id ? (
                                <div className="flex items-center gap-1 rounded-md bg-rose-50 p-1">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteTransaction(transaction.id)}
                                    className="rounded px-2 py-1.5 text-xs font-black text-rose-700 transition hover:bg-rose-100"
                                  >
                                    Hapus
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteTransactionId(null)}
                                    className="rounded px-2 py-1.5 text-xs font-black text-slate-600 transition hover:bg-white"
                                  >
                                    Batal
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setDeleteTransactionId(transaction.id)}
                                  className="rounded-md p-2 text-slate-400 transition hover:bg-white hover:text-rose-600"
                                  title="Hapus transaksi"
                                  aria-label={`Hapus transaksi ${transaction.note}`}
                                >
                                  <XCircle size={18} />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ))}
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
                <label htmlFor="transaction-date" className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Tanggal</label>
                <input
                  id="transaction-date"
                  type="date"
                  className="w-full rounded-md border border-slate-200 px-3 py-3 text-sm font-semibold outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  value={transactionForm.date}
                  onChange={(event) => {
                    setTransactionForm({ ...transactionForm, date: event.target.value });
                    setTransactionFormError('');
                  }}
                />
              </div>
              <div>
                <label htmlFor="transaction-type" className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Jenis</label>
                <select
                  id="transaction-type"
                  className="w-full rounded-md border border-slate-200 px-3 py-3 text-sm font-semibold outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  value={transactionForm.type}
                  onChange={(event) => {
                    const nextType = event.target.value;
                    setTransactionForm({
                      ...transactionForm,
                      type: nextType,
                      bikeId: nextType === 'pendapatan' ? transactionForm.bikeId : '',
                    });
                    setTransactionFormError('');
                  }}
                >
                  <option value="pendapatan">Pendapatan</option>
                  <option value="pengeluaran">Pengeluaran</option>
                </select>
              </div>
              {transactionForm.type === 'pendapatan' ? (
                <>
                  <div>
                    <label htmlFor="transaction-bike" className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Unit Disewa</label>
                    <select
                      id="transaction-bike"
                      ref={transactionBikeRef}
                      className="w-full rounded-md border border-slate-200 px-3 py-3 text-sm font-semibold outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 disabled:bg-slate-100 disabled:text-slate-400"
                      value={transactionForm.bikeId}
                      disabled={rentableBikes.length === 0}
                      onChange={(event) => {
                        setTransactionForm({
                          ...transactionForm,
                          bikeId: event.target.value,
                          pricingMode: event.target.value ? 'auto' : transactionForm.pricingMode,
                        });
                        setTransactionFormError('');
                      }}
                    >
                      <option value="">
                        {rentableBikes.length > 0 ? 'Pilih unit dari katalog' : 'Tidak ada unit siap sewa'}
                      </option>
                      {rentableBikes.map((bike) => {
                        const rate = normalizeRentalRate(rentalRates[bike.type]);

                        return (
                          <option key={bike.id} value={bike.id}>
                            {bike.number} - {bike.type} ({STATUS_META[bike.status].label}) - Tamu {formatCurrency(rate.price)}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {selectedTransactionBike ? (
                    <div className="rounded-lg border border-sky-100 bg-sky-50 p-3">
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <div className="rounded-md bg-white px-3 py-2 ring-1 ring-sky-100">
                          <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Modal</p>
                          <p className="text-sm font-black text-rose-700">{formatCurrency(selectedRentalRate.cost)}</p>
                        </div>
                        <div className="rounded-md bg-white px-3 py-2 ring-1 ring-sky-100">
                          <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Harga Tamu</p>
                          <p className="text-sm font-black text-emerald-700">{formatCurrency(selectedRentalRate.price)}</p>
                        </div>
                        <div className="rounded-md bg-white px-3 py-2 ring-1 ring-sky-100">
                          <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Laba</p>
                          <p className={`text-sm font-black ${calculatedRentalProfit >= 0 ? 'text-sky-700' : 'text-rose-700'}`}>
                            {formatCurrency(calculatedRentalProfit)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2 ring-1 ring-sky-100">
                        <span className="text-xs font-black uppercase tracking-wide text-slate-500">Hitung Modal</span>
                        <span className="text-sm font-black text-sky-800">
                          {formatCurrency(selectedRentalRate.price)} - {formatCurrency(selectedRentalRate.cost)} ={' '}
                          {formatCurrency(calculatedRentalProfit)}
                        </span>
                      </div>
                    </div>
                  ) : null}
                </>
              ) : null}
              <div>
                <label htmlFor="transaction-amount" className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Nominal</label>
                <input
                  id="transaction-amount"
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="150000"
                  className="w-full rounded-md border border-slate-200 px-3 py-3 text-sm font-semibold outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  value={
                    selectedTransactionBike && transactionForm.pricingMode === 'auto'
                      ? String(calculatedRentalAmount || '')
                      : transactionForm.amount
                  }
                  onChange={(event) => {
                    setTransactionForm({ ...transactionForm, amount: event.target.value, pricingMode: 'manual' });
                    setTransactionFormError('');
                  }}
                />
                {selectedTransactionBike && transactionForm.pricingMode === 'manual' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setTransactionForm({ ...transactionForm, pricingMode: 'auto' });
                      setTransactionFormError('');
                    }}
                    className="mt-2 text-xs font-black text-sky-700 transition hover:text-sky-900"
                  >
                    Pakai harga tamu dinamis
                  </button>
                ) : null}
              </div>
              <div>
                <label htmlFor="transaction-note" className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Catatan</label>
                <textarea
                  id="transaction-note"
                  rows="3"
                  placeholder="Contoh: Sewa 3 jam atau servis rantai"
                  className="w-full resize-none rounded-md border border-slate-200 px-3 py-3 text-sm font-semibold outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  value={transactionForm.note}
                  onChange={(event) => {
                    setTransactionForm({ ...transactionForm, note: event.target.value });
                    setTransactionFormError('');
                  }}
                />
              </div>
              {transactionFormError ? (
                <p className="rounded-md bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
                  {transactionFormError}
                </p>
              ) : null}
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
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">Status Setoran Rental</p>
            <p className="mt-2 text-3xl font-black">{formatCurrency(stats.setoranBelumDisetor)}</p>
            <p className="mt-1 text-xs font-semibold text-slate-400">Belum dibayar ke bengkel</p>
            <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-emerald-400 transition-all"
                style={{
                  width: `${stats.setoranRental > 0 ? Math.round((stats.setoranSudahDisetor / stats.setoranRental) * 100) : 0}%`,
                }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between gap-4 text-xs font-bold text-slate-400">
              <span>Sudah disetor</span>
              <span>{formatCurrency(stats.setoranSudahDisetor)} dari {formatCurrency(stats.setoranRental)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSettingsMenu = () => (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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

      <button
        type="button"
        onClick={() => setSettingsView('harga')}
        className="rounded-lg border border-slate-200 bg-white p-6 text-left shadow-soft transition hover:border-emerald-200 hover:bg-emerald-50"
      >
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
          <Wallet size={24} />
        </div>
        <h3 className="text-lg font-black text-slate-950">Harga Sewa</h3>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
          Atur modal bengkel dan harga tamu per tipe sepeda.
        </p>
        <div className="mt-5 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide text-emerald-700">
          Buka Harga <ArrowUpRight size={15} />
        </div>
      </button>

    </div>
  );

  const renderPriceSettings = () => (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => setSettingsView('menu')}
          className="inline-flex items-center gap-2 text-sm font-black text-slate-500 transition hover:text-emerald-700"
        >
          <ChevronDown className="rotate-90" size={18} />
          Kembali ke Sistem
        </button>
        <button
          type="button"
          onClick={resetRentalRates}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-100 px-4 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-200"
        >
          <RotateCcw size={15} />
          Reset Harga
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <KpiCard
          icon={Bike}
          label="Tipe Harga"
          value={bikeTypes.length}
          helper={`${bikes.length} unit memakai daftar harga`}
          accentClass="bg-sky-50 text-sky-700"
        />
        <KpiCard
          icon={Clock}
          label="Modal Rata-rata"
          value={formatCurrency(
            bikeTypes.reduce((total, type) => total + normalizeRentalRate(rentalRates[type]).cost, 0) /
              Math.max(1, bikeTypes.length),
          )}
          helper="Biaya bengkel per sepeda"
          accentClass="bg-rose-50 text-rose-700"
        />
        <KpiCard
          icon={Calendar}
          label="Harga Tamu"
          value={formatCurrency(
            bikeTypes.reduce((total, type) => total + normalizeRentalRate(rentalRates[type]).price, 0) /
              Math.max(1, bikeTypes.length),
          )}
          helper="Rata-rata jual ke tamu"
          accentClass="bg-emerald-50 text-emerald-700"
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-soft">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-black text-slate-950">Daftar Harga Sewa</h2>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Modal bengkel dan harga tamu otomatis mengikuti tipe unit di katalog.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
              <CheckCircle2 size={14} />
              Tersimpan otomatis
            </span>
            <span className="rounded-md bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
              {bikeTypes.length} tipe
            </span>
          </div>
        </div>

        <div className="custom-scrollbar overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">Tipe Sepeda</th>
                <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">Jumlah Unit</th>
                <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">Modal</th>
                <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">Harga Tamu</th>
                <th className="px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500">Laba</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bikeTypes.map((bikeType) => {
                const rate = normalizeRentalRate(rentalRates[bikeType]);
                const unitCount = bikes.filter((bike) => bike.type === bikeType).length;
                const margin = rate.price - rate.cost;

                return (
                  <tr key={bikeType} className="transition hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <p className="font-black text-slate-950">{bikeType}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {unitCount > 0 ? 'Aktif di katalog' : 'Tersimpan di harga'}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-md bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                        {unitCount} unit
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        aria-label={`Modal ${bikeType}`}
                        className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-bold text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                        value={rate.cost}
                        onChange={(event) => updateRentalRate(bikeType, 'cost', event.target.value)}
                      />
                    </td>
                    <td className="px-5 py-4">
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        aria-label={`Harga tamu ${bikeType}`}
                        className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-bold text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                        value={rate.price}
                        onChange={(event) => updateRentalRate(bikeType, 'price', event.target.value)}
                      />
                    </td>
                    <td className="px-5 py-4">
                      <div className="space-y-1 text-xs font-bold text-slate-500">
                        <p>
                          Modal: <span className="font-black text-rose-700">{formatCurrency(rate.cost)}</span>
                        </p>
                        <p>
                          Tamu: <span className="font-black text-emerald-700">{formatCurrency(rate.price)}</span>
                        </p>
                        <p>
                          Laba:{' '}
                          <span className={`font-black ${margin >= 0 ? 'text-sky-700' : 'text-rose-700'}`}>
                            {formatCurrency(margin)}
                          </span>
                        </p>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
              <label htmlFor="bike-number" className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Nomor Seri/Plat</label>
              <input
                id="bike-number"
                type="text"
                placeholder="Contoh: S-011"
                className="w-full rounded-md border border-slate-200 px-3 py-3 text-sm font-semibold uppercase outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                value={bikeForm.number}
                onChange={(event) => setBikeForm({ ...bikeForm, number: event.target.value })}
              />
            </div>
            <div>
              <label htmlFor="bike-type" className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Tipe Sepeda</label>
              <input
                id="bike-type"
                type="text"
                placeholder="Contoh: Electric Scooter"
                className="w-full rounded-md border border-slate-200 px-3 py-3 text-sm font-semibold outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                value={bikeForm.type}
                onChange={(event) => setBikeForm({ ...bikeForm, type: event.target.value })}
              />
            </div>
            <div>
              <label htmlFor="bike-status" className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Status</label>
              <select
                id="bike-status"
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
              <label htmlFor="bike-note" className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Catatan</label>
              <textarea
                id="bike-note"
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
      <a
        href="#main-content"
        className="fixed left-4 top-3 z-[60] -translate-y-20 rounded-md bg-slate-950 px-4 py-2 text-sm font-black text-white transition focus:translate-y-0"
      >
        Lewati ke konten utama
      </a>
      <nav
        className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur"
        aria-label="Navigasi utama"
      >
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
                  onClick={() => navigateTo(item.id)}
                  title={item.title}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-3 py-2.5 transition ${
                    isActive ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Icon size={20} />
                  <span className="hidden text-xs font-black xl:inline">{item.title}</span>
                  <span className="sr-only xl:hidden">{item.title}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right md:block">
              <p className="text-xs font-black text-slate-900">Admin Utama</p>
              <p className="text-[10px] font-bold text-slate-500">Operasional</p>
            </div>
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm"
              role="img"
              aria-label="Profil Admin Utama"
            >
              <User size={19} />
            </div>
          </div>
        </div>
      </nav>

      <main id="main-content" className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10" tabIndex="-1">
        <div className="mb-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-700">Sistem Monitoring Bisnis</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{pageTitle}</h1>
        </div>

        {activeTab === 'dashboard' ? renderDashboard() : null}
        {activeTab === 'sepeda' ? renderArmada() : null}
        {activeTab === 'keuangan' ? renderFinance() : null}
        {activeTab === 'settings'
          ? settingsView === 'menu'
            ? renderSettingsMenu()
            : settingsView === 'harga'
              ? renderPriceSettings()
              : renderBikeManagement()
          : null}
      </main>

      <div className="pointer-events-none fixed bottom-4 right-4 z-50 w-[min(92vw,380px)]" aria-live="polite" aria-atomic="true">
        {notice ? (
          <div
            key={notice.id}
            className={`flex items-start gap-3 rounded-lg border bg-white p-4 shadow-2xl ${
              notice.tone === 'warning' ? 'border-amber-200' : 'border-emerald-200'
            }`}
          >
            <div
              className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
                notice.tone === 'warning' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              {notice.tone === 'warning' ? <AlertCircle size={17} /> : <CheckCircle2 size={17} />}
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-slate-400">Pembaruan data</p>
              <p className="mt-1 text-sm font-bold text-slate-800">{notice.message}</p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
