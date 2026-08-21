import { useEffect, useMemo, useState } from 'react';
import AppShell from './components/AppShell.jsx';
import DateRangeFilter from './components/DateRangeFilter.jsx';
import { BIKE_STATUSES, initialBikes, initialRentalRates, initialTransactions } from './data/seed.js';
import DashboardPage from './pages/DashboardPage.jsx';
import FinancePage from './pages/FinancePage.jsx';
import FleetPage from './pages/FleetPage.jsx';
import RentalPage from './pages/RentalPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import { getQuickRange, isDateWithinRange } from './lib/dateFilters.js';
import { normalizeText } from './lib/formatters.js';
import { loadState, saveState } from './lib/storage.js';

const STORAGE_KEYS = {
  bikes: 'bike-rent-pro:bikes',
  transactions: 'bike-rent-pro:transactions',
  rentalRates: 'bike-rent-pro:rental-rates',
};

const pageMeta = {
  dashboard: { title: 'Pusat Operasi', subtitle: 'Ringkasan armada, arus kas, dan pekerjaan hari ini', description: 'Pantau armada, transaksi, laba, dan setoran rental sepeda dari satu pusat operasi.' },
  rental: { title: 'Penyewaan', subtitle: 'Aktifkan sewa baru dan proses pengembalian unit', description: 'Kelola penyewaan dan pengembalian unit sepeda dengan alur operasional yang jelas.' },
  fleet: { title: 'Armada', subtitle: 'Katalog unit, harga, kondisi, dan status operasional', description: 'Kelola katalog, kondisi, harga, dan status armada sepeda.' },
  finance: { title: 'Keuangan', subtitle: 'Audit transaksi, laba, biaya, dan penyelesaian setoran', description: 'Audit pendapatan, pengeluaran, laba, serta status setoran rental.' },
  settings: { title: 'Pengaturan Sistem', subtitle: 'Harga dinamis, modal, backup, dan pemulihan data', description: 'Atur harga sewa dinamis serta kelola backup data operasional.' },
};

const defaultRentalRate = { cost: 30000, price: 50000 };

const getTodayInput = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
};

const createRentalForm = () => ({ date: getTodayInput(), bikeIds: [], customerName: '', customerContact: '', prices: {}, note: '' });
const createFinanceForm = () => ({ date: getTodayInput(), type: 'pengeluaran', amount: '', note: '' });

const normalizeRentalRate = (rate = {}) => ({
  cost: Math.max(0, Number(rate.cost ?? defaultRentalRate.cost) || 0),
  price: Math.max(0, Number(rate.price ?? defaultRentalRate.price) || 0),
});

const normalizeBike = (bike) => ({
  ...bike,
  status: bike.status === 'baru' || !BIKE_STATUSES.includes(bike.status) ? 'tersedia' : bike.status,
});

const normalizeTransaction = (transaction) => ({
  ...transaction,
  category: transaction.category || (transaction.bikeId || Number(transaction.costAmount || 0) > 0 ? 'rental' : 'manual'),
  settled: Number(transaction.costAmount || 0) > 0 ? Boolean(transaction.settled) : null,
  returnedAt: transaction.returnedAt || null,
  rentalGroupId: transaction.rentalGroupId || null,
  rentalCode: transaction.rentalCode || null,
});

const loadBikes = () => {
  const value = loadState(STORAGE_KEYS.bikes, initialBikes);
  return Array.isArray(value) ? value.map(normalizeBike) : initialBikes.map(normalizeBike);
};

const loadTransactions = () => {
  const value = loadState(STORAGE_KEYS.transactions, initialTransactions);
  return Array.isArray(value) ? value.map(normalizeTransaction) : initialTransactions.map(normalizeTransaction);
};

const getInitialPage = () => {
  if (typeof window === 'undefined') return 'dashboard';
  const page = window.location.hash.replace('#', '');
  return pageMeta[page] ? page : 'dashboard';
};

export default function App() {
  const [activePage, setActivePage] = useState(getInitialPage);
  const [bikes, setBikes] = useState(loadBikes);
  const [transactions, setTransactions] = useState(loadTransactions);
  const [rentalRates, setRentalRates] = useState(() => loadState(STORAGE_KEYS.rentalRates, initialRentalRates));
  const [quickFilter, setQuickFilter] = useState('hari');
  const [dateRange, setDateRange] = useState(() => getQuickRange('hari'));
  const [rentalForm, setRentalForm] = useState(createRentalForm);
  const [rentalError, setRentalError] = useState('');
  const [financeForm, setFinanceForm] = useState(createFinanceForm);
  const [financeError, setFinanceError] = useState('');
  const [notice, setNotice] = useState(null);
  const [rentalDialogRequest, setRentalDialogRequest] = useState(false);

  useEffect(() => saveState(STORAGE_KEYS.bikes, bikes), [bikes]);
  useEffect(() => saveState(STORAGE_KEYS.transactions, transactions), [transactions]);
  useEffect(() => saveState(STORAGE_KEYS.rentalRates, rentalRates), [rentalRates]);

  useEffect(() => {
    const handleHistory = () => {
      const page = window.location.hash.replace('#', '');
      if (pageMeta[page]) setActivePage(page);
    };
    window.addEventListener('popstate', handleHistory);
    return () => window.removeEventListener('popstate', handleHistory);
  }, []);

  useEffect(() => {
    if (!notice) return undefined;
    const timeoutId = window.setTimeout(() => setNotice(null), 4200);
    return () => window.clearTimeout(timeoutId);
  }, [notice]);

  useEffect(() => {
    const meta = pageMeta[activePage];
    document.title = `${meta.title} | Bike Rent Pro Systems`;
    document.querySelector('meta[name="description"]')?.setAttribute('content', meta.description);
  }, [activePage]);

  const showNotice = (message, tone = 'success') => setNotice({ id: Date.now(), message, tone });

  const navigateTo = (page) => {
    if (!pageMeta[page]) return;
    setActivePage(page);
    if (window.location.hash !== `#${page}`) window.history.pushState(null, '', `#${page}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getRate = (bikeType) => normalizeRentalRate(rentalRates[bikeType]);
  const effectiveDateRange = useMemo(() => (quickFilter === 'custom' ? dateRange : getQuickRange(quickFilter)), [dateRange, quickFilter]);
  const filteredTransactions = useMemo(() => transactions.filter((transaction) => isDateWithinRange(transaction.date, effectiveDateRange)), [effectiveDateRange, transactions]);

  const stats = useMemo(() => {
    const statusGroups = BIKE_STATUSES.reduce((groups, status) => {
      groups[status] = bikes.filter((bike) => bike.status === status);
      return groups;
    }, {});
    const pendapatan = filteredTransactions.filter((transaction) => transaction.type === 'pendapatan').reduce((total, transaction) => total + Number(transaction.amount || 0), 0);
    const setoranRental = filteredTransactions.filter((transaction) => transaction.type === 'pendapatan').reduce((total, transaction) => total + Number(transaction.costAmount || 0), 0);
    const setoranBelumDisetor = filteredTransactions.filter((transaction) => Number(transaction.costAmount || 0) > 0 && !transaction.settled).reduce((total, transaction) => total + Number(transaction.costAmount || 0), 0);
    const transaksiBelumDisetor = filteredTransactions.filter((transaction) => Number(transaction.costAmount || 0) > 0 && !transaction.settled).length;
    const pengeluaranOperasional = filteredTransactions.filter((transaction) => transaction.type === 'pengeluaran').reduce((total, transaction) => total + Number(transaction.amount || 0), 0);
    const pengeluaran = setoranRental + pengeluaranOperasional;

    return { ...statusGroups, pendapatan, setoranRental, setoranBelumDisetor, setoranSudahDisetor: setoranRental - setoranBelumDisetor, transaksiBelumDisetor, pengeluaranOperasional, pengeluaran, laba: pendapatan - pengeluaran, totalTransactions: filteredTransactions.length };
  }, [bikes, filteredTransactions]);

  const activeRentals = useMemo(
    () => bikes.filter((bike) => bike.status === 'disewa').map((bike) => ({
      bike,
      transaction: [...transactions].filter((transaction) => Number(transaction.bikeId) === bike.id && transaction.category === 'rental' && !transaction.returnedAt).sort((first, second) => second.id - first.id)[0] || null,
    })),
    [bikes, transactions],
  );

  const transactionGroups = useMemo(() => {
    const sorted = [...filteredTransactions].sort((first, second) => second.date.localeCompare(first.date) || second.id - first.id);
    const groups = sorted.reduce((map, transaction) => {
      if (!map.has(transaction.date)) map.set(transaction.date, { date: transaction.date, transactions: [], pendapatan: 0, pengeluaran: 0 });
      const group = map.get(transaction.date);
      const amount = Number(transaction.amount || 0);
      const cost = Number(transaction.costAmount || 0);
      group.transactions.push(transaction);
      if (transaction.type === 'pendapatan') {
        group.pendapatan += amount;
        group.pengeluaran += cost;
      } else group.pengeluaran += amount;
      return map;
    }, new Map());
    return Array.from(groups.values()).map((group) => ({ ...group, laba: group.pendapatan - group.pengeluaran }));
  }, [filteredTransactions]);

  const recentTransactions = useMemo(() => [...filteredTransactions].sort((first, second) => second.date.localeCompare(first.date) || second.id - first.id), [filteredTransactions]);
  const availableBikes = useMemo(() => bikes.filter((bike) => bike.status === 'tersedia'), [bikes]);
  const bikeTypes = useMemo(() => Array.from(new Set([...bikes.map((bike) => bike.type).filter(Boolean), ...Object.keys(rentalRates)])).sort((first, second) => first.localeCompare(second)), [bikes, rentalRates]);

  const handleQuickFilter = (filter, range) => { setQuickFilter(filter); setDateRange(range); };
  const handleCustomRange = (range) => { setQuickFilter('custom'); setDateRange(range); };
  const dateFilter = <DateRangeFilter quickFilter={quickFilter} range={effectiveDateRange} onQuickFilter={handleQuickFilter} onRangeChange={handleCustomRange} />;

  const handleRentalChange = (field, value) => {
    setRentalError('');
    if (field === 'bikeIds') {
      const bikeIds = Array.from(new Set(value.map(Number))).filter((bikeId) => bikes.some((bike) => bike.id === bikeId));
      setRentalForm((current) => {
        const prices = bikeIds.reduce((nextPrices, bikeId) => {
          const bike = bikes.find((item) => item.id === bikeId);
          nextPrices[bikeId] = current.prices[bikeId] ?? String(getRate(bike?.type).price);
          return nextPrices;
        }, {});
        return { ...current, bikeIds, prices };
      });
      return;
    }
    if (field === 'price') {
      setRentalForm((current) => ({ ...current, prices: { ...current.prices, [value.bikeId]: value.amount } }));
      return;
    }
    setRentalForm((current) => ({ ...current, [field]: value }));
  };

  const handleCreateRental = (event) => {
    event.preventDefault();
    const selectedIds = new Set(rentalForm.bikeIds.map(Number));
    const selectedBikes = bikes.filter((bike) => selectedIds.has(bike.id));
    const customerName = rentalForm.customerName.trim();
    if (!selectedBikes.length || selectedBikes.some((bike) => bike.status !== 'tersedia')) {
      setRentalError('Pilih minimal satu unit yang tersedia.');
      return { error: true };
    }
    if (!customerName || !rentalForm.date) {
      setRentalError('Nama tamu dan tanggal sewa wajib diisi.');
      return { error: true };
    }
    if (selectedBikes.some((bike) => Number(rentalForm.prices[bike.id]) <= 0)) {
      setRentalError('Harga setiap unit harus lebih dari nol.');
      return { error: true };
    }

    const nextId = transactions.length ? Math.max(...transactions.map((transaction) => transaction.id)) + 1 : 1;
    const rentalGroupId = `rental-${Date.now()}-${nextId}`;
    const rentalCode = `SW-${rentalForm.date.replaceAll('-', '')}-${String(nextId).padStart(3, '0')}`;
    const rentalNote = rentalForm.note.trim();
    const customerContact = rentalForm.customerContact.trim();
    const newTransactions = selectedBikes.map((bike, index) => {
      const rate = getRate(bike.type);
      const amount = Number(rentalForm.prices[bike.id]);
      return {
        id: nextId + index,
        date: rentalForm.date,
        type: 'pendapatan',
        category: 'rental',
        amount,
        note: `Sewa ${bike.number} / ${customerName}${rentalNote ? ` / ${rentalNote}` : ''}`,
        bikeId: bike.id,
        bikeNumber: bike.number,
        customerName,
        customerContact,
        rentalNote,
        rentalGroupId,
        rentalCode,
        rentalUnitCount: selectedBikes.length,
        costAmount: rate.cost,
        grossProfit: amount - rate.cost,
        settled: false,
        settledAt: null,
        returnedAt: null,
        returnDate: null,
      };
    });
    setTransactions((current) => [...newTransactions, ...current]);
    setBikes((current) => current.map((item) => (selectedIds.has(item.id) ? { ...item, status: 'disewa' } : item)));
    setRentalForm(createRentalForm());
    showNotice(`${selectedBikes.length} unit untuk ${customerName} berhasil diaktifkan.`);
    return { success: true, rentalCode, unitCount: selectedBikes.length };
  };

  const handleReturnBikes = (bikeIds) => {
    const selectedIds = new Set(bikeIds.map(Number));
    const selectedBikes = bikes.filter((bike) => selectedIds.has(bike.id) && bike.status === 'disewa');
    if (!selectedBikes.length) return;
    const returnedAt = new Date().toISOString();
    const returnDate = getTodayInput();
    setBikes((current) => current.map((item) => (selectedIds.has(item.id) ? { ...item, status: 'tersedia' } : item)));
    setTransactions((current) => current.map((transaction) => (
      selectedIds.has(Number(transaction.bikeId)) && transaction.category === 'rental' && !transaction.returnedAt
        ? { ...transaction, returnedAt, returnDate }
        : transaction
    )));
    showNotice(selectedBikes.length === 1
      ? `${selectedBikes[0].number} selesai disewa dan kembali tersedia.`
      : `${selectedBikes.length} unit selesai disewa dan kembali tersedia.`);
  };

  const handleReturnBike = (bikeId) => handleReturnBikes([bikeId]);

  const handleStartRental = () => {
    navigateTo('rental');
    setRentalDialogRequest(true);
  };

  const handleFinanceChange = (field, value) => { setFinanceError(''); setFinanceForm((current) => ({ ...current, [field]: value })); };
  const handleCreateFinance = (event) => {
    event.preventDefault();
    const amount = Number(financeForm.amount);
    const note = financeForm.note.trim();
    if (!financeForm.date || amount <= 0 || !note) { setFinanceError('Tanggal, nominal, dan keterangan wajib diisi.'); return; }
    const nextId = transactions.length ? Math.max(...transactions.map((transaction) => transaction.id)) + 1 : 1;
    setTransactions((current) => [{ id: nextId, date: financeForm.date, type: financeForm.type, category: 'manual', amount, note, bikeId: null, costAmount: 0, grossProfit: null, settled: null, returnedAt: null }, ...current]);
    setFinanceForm(createFinanceForm());
    showNotice('Transaksi keuangan berhasil disimpan.');
  };

  const handleToggleSettlement = (transactionId) => {
    const transaction = transactions.find((item) => item.id === transactionId);
    const nextSettled = !transaction?.settled;
    setTransactions((current) => current.map((item) => item.id === transactionId ? { ...item, settled: nextSettled, settledAt: nextSettled ? new Date().toISOString() : null } : item));
    showNotice(nextSettled ? 'Setoran rental ditandai selesai.' : 'Setoran dikembalikan ke daftar tertunda.');
  };

  const handleDeleteTransaction = (transactionId) => { setTransactions((current) => current.filter((transaction) => transaction.id !== transactionId)); showNotice('Transaksi dihapus dari audit.', 'warning'); };

  const handleSaveBike = (form, editingId) => {
    const number = form.number.trim().toUpperCase();
    const type = form.type.trim();
    const duplicate = bikes.some((bike) => normalizeText(bike.number) === normalizeText(number) && bike.id !== editingId);
    if (!number || !type) return { error: 'Nomor unit dan tipe sepeda wajib diisi.' };
    if (duplicate) return { error: 'Nomor unit sudah terdaftar.' };
    if (editingId) {
      setBikes((current) => current.map((bike) => bike.id === editingId ? { ...bike, ...form, number, type, note: form.note.trim() } : bike));
      showNotice(`Unit ${number} berhasil diperbarui.`);
    } else {
      const nextId = bikes.length ? Math.max(...bikes.map((bike) => bike.id)) + 1 : 1;
      setBikes((current) => [...current, { id: nextId, ...form, number, type, note: form.note.trim() }]);
      showNotice(`Unit ${number} berhasil ditambahkan.`);
    }
    return { success: true };
  };

  const handleDeleteBike = (bikeId) => {
    const bike = bikes.find((item) => item.id === bikeId);
    if (bike?.status === 'disewa') { showNotice('Unit yang sedang disewa tidak dapat dihapus.', 'error'); return false; }
    setBikes((current) => current.filter((item) => item.id !== bikeId));
    showNotice(`Unit ${bike?.number || ''} dihapus dari armada.`, 'warning');
    return true;
  };

  const handleStatusChange = (bikeId, status) => {
    const bike = bikes.find((item) => item.id === bikeId);
    setBikes((current) => current.map((item) => (item.id === bikeId ? { ...item, status } : item)));
    if (bike?.status === 'disewa' && status !== 'disewa') {
      const activeTransaction = [...transactions].filter((transaction) => Number(transaction.bikeId) === bikeId && !transaction.returnedAt).sort((first, second) => second.id - first.id)[0];
      if (activeTransaction) setTransactions((current) => current.map((transaction) => transaction.id === activeTransaction.id ? { ...transaction, returnedAt: new Date().toISOString(), returnDate: getTodayInput() } : transaction));
    }
    showNotice(`Status ${bike?.number || 'unit'} berhasil diperbarui.`);
  };

  const handleRateChange = (type, field, value) => {
    const numericValue = Math.max(0, Number(value) || 0);
    setRentalRates((current) => ({ ...current, [type]: { ...normalizeRentalRate(current[type]), [field]: numericValue } }));
  };

  const handleExportData = () => {
    const payload = JSON.stringify({ schemaVersion: 3, exportedAt: new Date().toISOString(), bikes, transactions, rentalRates }, null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `bike-rent-pro-backup-${getTodayInput()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showNotice('Backup data berhasil dibuat.');
  };

  const handleImportData = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      if (!Array.isArray(payload.bikes) || !Array.isArray(payload.transactions) || !payload.rentalRates) throw new Error('Format backup tidak valid');
      setBikes(payload.bikes.map(normalizeBike));
      setTransactions(payload.transactions.map(normalizeTransaction));
      setRentalRates(payload.rentalRates);
      showNotice('Backup berhasil diimpor dan diterapkan.');
    } catch {
      showNotice('File backup tidak dapat dibaca.', 'error');
    } finally {
      event.target.value = '';
    }
  };

  const handleResetData = () => {
    setBikes(initialBikes.map(normalizeBike));
    setTransactions(initialTransactions.map(normalizeTransaction));
    setRentalRates(initialRentalRates);
    setRentalForm(createRentalForm());
    setFinanceForm(createFinanceForm());
    showNotice('Data demo berhasil dipulihkan.', 'warning');
  };

  const meta = pageMeta[activePage];

  return (
    <AppShell activePage={activePage} onNavigate={navigateTo} pageTitle={meta.title} pageSubtitle={meta.subtitle} notice={notice}>
      {activePage === 'dashboard' ? <DashboardPage stats={stats} dateFilter={dateFilter} recentTransactions={recentTransactions} activeRentals={activeRentals} onNavigate={navigateTo} onStartRental={handleStartRental} onReturnBike={handleReturnBike} /> : null}
      {activePage === 'rental' ? <RentalPage availableBikes={availableBikes} activeRentals={activeRentals} form={rentalForm} error={rentalError} getRate={getRate} openRequest={rentalDialogRequest} onOpenRequestHandled={() => setRentalDialogRequest(false)} onChange={handleRentalChange} onSubmit={handleCreateRental} onReturnBike={handleReturnBike} onReturnBikes={handleReturnBikes} onNavigate={navigateTo} /> : null}
      {activePage === 'fleet' ? <FleetPage bikes={bikes} getRate={getRate} onSaveBike={handleSaveBike} onDeleteBike={handleDeleteBike} onStatusChange={handleStatusChange} /> : null}
      {activePage === 'finance' ? <FinancePage stats={stats} groups={transactionGroups} dateFilter={dateFilter} form={financeForm} error={financeError} onChange={handleFinanceChange} onSubmit={handleCreateFinance} onToggleSettlement={handleToggleSettlement} onDelete={handleDeleteTransaction} /> : null}
      {activePage === 'settings' ? <SettingsPage bikeTypes={bikeTypes} bikes={bikes} transactions={transactions} getRate={getRate} onRateChange={handleRateChange} onExport={handleExportData} onImport={handleImportData} onReset={handleResetData} /> : null}
    </AppShell>
  );
}
