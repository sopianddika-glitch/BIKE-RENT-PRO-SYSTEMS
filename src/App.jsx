import { useEffect, useMemo, useState } from 'react';
import AppShell from './components/AppShell.jsx';
import DateRangeFilter from './components/DateRangeFilter.jsx';
import { initialBikes, initialRentalRates, initialSystemSettings, initialTransactions } from './data/seed.js';
import DashboardPage from './pages/DashboardPage.jsx';
import FinancePage from './pages/FinancePage.jsx';
import FleetPage from './pages/FleetPage.jsx';
import RentalPage from './pages/RentalPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import { getQuickRange, isDateWithinRange } from './lib/dateFilters.js';
import {
  buildDashboardStats,
  buildDataHealth,
  buildFleetOverview,
  createRentalCode,
  getActiveRentals,
  getNextUnitNumber,
  normalizeBike,
  normalizeRentalRate,
  normalizeSystemSettings,
  normalizeTransaction,
} from './lib/domain.js';
import { normalizeText } from './lib/formatters.js';
import { loadState, saveState } from './lib/storage.js';

const STORAGE_KEYS = {
  bikes: 'bike-rent-pro:bikes',
  transactions: 'bike-rent-pro:transactions',
  rentalRates: 'bike-rent-pro:rental-rates',
  systemSettings: 'bike-rent-pro:system-settings',
};

const pageMeta = {
  dashboard: { title: 'Pusat Operasi', subtitle: 'Ringkasan armada, arus kas, dan pekerjaan hari ini', description: 'Pantau armada, transaksi, laba, dan setoran rental sepeda dari satu pusat operasi.' },
  rental: { title: 'Penyewaan', subtitle: 'Aktifkan sewa baru dan proses pengembalian unit', description: 'Kelola penyewaan dan pengembalian unit sepeda dengan alur operasional yang jelas.' },
  fleet: { title: 'Armada', subtitle: 'Katalog unit, harga, kondisi, dan status operasional', description: 'Kelola katalog, kondisi, harga, dan status armada sepeda.' },
  finance: { title: 'Keuangan', subtitle: 'Audit transaksi, laba, biaya, dan penyelesaian setoran', description: 'Audit pendapatan, pengeluaran, laba, serta status setoran rental.' },
  settings: { title: 'Pengaturan Sistem', subtitle: 'Bisnis, workflow, harga, dashboard, dan keamanan data', description: 'Atur workflow, penomoran, harga, tampilan dashboard, dan backup data operasional.' },
};

const getTodayInput = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
};

const createRentalForm = () => ({ date: getTodayInput(), bikeIds: [], customerName: '', customerContact: '', prices: {}, note: '' });
const createFinanceForm = () => ({ date: getTodayInput(), type: 'pengeluaran', amount: '', note: '' });

const loadBikes = () => {
  const value = loadState(STORAGE_KEYS.bikes, initialBikes);
  return Array.isArray(value) ? value.map(normalizeBike) : initialBikes.map(normalizeBike);
};

const loadTransactions = () => {
  const value = loadState(STORAGE_KEYS.transactions, initialTransactions);
  return Array.isArray(value) ? value.map(normalizeTransaction) : initialTransactions.map(normalizeTransaction);
};

const loadSystemSettings = () => normalizeSystemSettings(loadState(STORAGE_KEYS.systemSettings, initialSystemSettings));

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
  const [systemSettings, setSystemSettings] = useState(loadSystemSettings);
  const [quickFilter, setQuickFilter] = useState(() => loadSystemSettings().defaultDashboardRange);
  const [dateRange, setDateRange] = useState(() => getQuickRange(loadSystemSettings().defaultDashboardRange));
  const [rentalForm, setRentalForm] = useState(createRentalForm);
  const [rentalError, setRentalError] = useState('');
  const [financeForm, setFinanceForm] = useState(createFinanceForm);
  const [financeError, setFinanceError] = useState('');
  const [notice, setNotice] = useState(null);
  const [rentalDialogRequest, setRentalDialogRequest] = useState(false);

  useEffect(() => saveState(STORAGE_KEYS.bikes, bikes), [bikes]);
  useEffect(() => saveState(STORAGE_KEYS.transactions, transactions), [transactions]);
  useEffect(() => saveState(STORAGE_KEYS.rentalRates, rentalRates), [rentalRates]);
  useEffect(() => saveState(STORAGE_KEYS.systemSettings, systemSettings), [systemSettings]);

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

  const stats = useMemo(() => buildDashboardStats(bikes, filteredTransactions), [bikes, filteredTransactions]);
  const fleetOverview = useMemo(() => buildFleetOverview(bikes), [bikes]);
  const activeRentals = useMemo(() => getActiveRentals(bikes, transactions), [bikes, transactions]);
  const dataHealth = useMemo(() => buildDataHealth(bikes, transactions, rentalRates), [bikes, rentalRates, transactions]);

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
  const suggestedUnitNumber = useMemo(() => getNextUnitNumber(bikes, systemSettings), [bikes, systemSettings]);

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
    const rentalCode = createRentalCode(rentalForm.date, nextId, systemSettings);
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

  const handleDeleteTransaction = (transactionId) => {
    const transaction = transactions.find((item) => item.id === transactionId);
    if (transaction?.category === 'rental' && transaction.bikeId && !transaction.returnedAt) {
      setBikes((current) => current.map((bike) => bike.id === Number(transaction.bikeId) ? { ...bike, status: 'tersedia' } : bike));
    }
    setTransactions((current) => current.filter((item) => item.id !== transactionId));
    showNotice('Transaksi dihapus dan status unit telah disinkronkan.', 'warning');
  };

  const handleSaveBike = (form, editingId) => {
    const number = form.number.trim().toUpperCase();
    const type = form.type.trim();
    const duplicate = bikes.some((bike) => normalizeText(bike.number) === normalizeText(number) && bike.id !== editingId);
    const existingBike = bikes.find((bike) => bike.id === editingId);
    if (!number || !type) return { error: 'Nomor unit dan tipe sepeda wajib diisi.' };
    if (duplicate) return { error: 'Nomor unit sudah terdaftar.' };
    if (form.status === 'disewa' && existingBike?.status !== 'disewa') return { error: 'Aktifkan status disewa melalui menu Penyewaan agar data tamu dan transaksi tetap sinkron.' };
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
    if (!bike) return false;
    if (status === 'disewa' && bike.status !== 'disewa') {
      showNotice('Gunakan menu Penyewaan untuk mengaktifkan unit agar transaksi tetap sinkron.', 'error');
      return false;
    }
    setBikes((current) => current.map((item) => (item.id === bikeId ? { ...item, status } : item)));
    if (bike?.status === 'disewa' && status !== 'disewa') {
      const activeTransaction = [...transactions].filter((transaction) => Number(transaction.bikeId) === bikeId && !transaction.returnedAt).sort((first, second) => second.id - first.id)[0];
      if (activeTransaction) setTransactions((current) => current.map((transaction) => transaction.id === activeTransaction.id ? { ...transaction, returnedAt: new Date().toISOString(), returnDate: getTodayInput() } : transaction));
    }
    showNotice(`Status ${bike?.number || 'unit'} berhasil diperbarui.`);
    return true;
  };

  const handleRateChange = (type, field, value) => {
    const numericValue = Math.max(0, Number(value) || 0);
    setRentalRates((current) => ({ ...current, [type]: { ...normalizeRentalRate(current[type]), [field]: numericValue } }));
  };

  const handleAddBikeType = ({ type, cost, price }) => {
    const cleanType = String(type || '').trim();
    if (!cleanType) return { error: 'Nama tipe sepeda wajib diisi.' };
    if (bikeTypes.some((item) => normalizeText(item) === normalizeText(cleanType))) return { error: 'Tipe sepeda sudah tersedia.' };
    setRentalRates((current) => ({ ...current, [cleanType]: normalizeRentalRate({ cost, price }) }));
    showNotice(`Tipe ${cleanType} berhasil ditambahkan.`);
    return { success: true };
  };

  const handleRemoveBikeType = (type) => {
    if (bikes.some((bike) => bike.type === type)) return { error: 'Tipe masih digunakan oleh unit armada dan tidak dapat dihapus.' };
    setRentalRates((current) => Object.fromEntries(Object.entries(current).filter(([key]) => key !== type)));
    showNotice(`Tipe ${type} dihapus dari daftar harga.`, 'warning');
    return { success: true };
  };

  const handleSystemSettingChange = (field, value) => {
    const freeTextLimits = { businessName: 60, adminName: 60, businessLocation: 100, businessContact: 60 };
    const codeFields = ['unitPrefix', 'rentalCodePrefix'];
    let nextSettings;
    if (freeTextLimits[field]) {
      nextSettings = { ...systemSettings, [field]: String(value).slice(0, freeTextLimits[field]) };
    } else if (codeFields.includes(field)) {
      nextSettings = { ...systemSettings, [field]: String(value).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) };
    } else {
      nextSettings = normalizeSystemSettings({ ...systemSettings, [field]: value });
    }
    setSystemSettings(nextSettings);
    if (field === 'defaultDashboardRange') {
      setQuickFilter(nextSettings.defaultDashboardRange);
      setDateRange(getQuickRange(nextSettings.defaultDashboardRange));
    }
  };

  const handleExportData = () => {
    const payload = JSON.stringify({ schemaVersion: 4, exportedAt: new Date().toISOString(), bikes, transactions, rentalRates, systemSettings }, null, 2);
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
      setRentalRates(Object.fromEntries(Object.entries(payload.rentalRates).map(([type, rate]) => [type, normalizeRentalRate(rate)])));
      const importedSettings = normalizeSystemSettings(payload.systemSettings);
      setSystemSettings(importedSettings);
      setQuickFilter(importedSettings.defaultDashboardRange);
      setDateRange(getQuickRange(importedSettings.defaultDashboardRange));
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
    setSystemSettings(initialSystemSettings);
    setQuickFilter(initialSystemSettings.defaultDashboardRange);
    setDateRange(getQuickRange(initialSystemSettings.defaultDashboardRange));
    setRentalForm(createRentalForm());
    setFinanceForm(createFinanceForm());
    showNotice('Data demo berhasil dipulihkan.', 'warning');
  };

  const meta = pageMeta[activePage];

  return (
    <AppShell activePage={activePage} onNavigate={navigateTo} pageTitle={meta.title} pageSubtitle={meta.subtitle} notice={notice} systemSettings={systemSettings}>
      {activePage === 'dashboard' ? <DashboardPage stats={stats} fleetOverview={fleetOverview} systemSettings={systemSettings} dateFilter={dateFilter} recentTransactions={recentTransactions} activeRentals={activeRentals} onNavigate={navigateTo} onStartRental={handleStartRental} onReturnBike={handleReturnBike} /> : null}
      {activePage === 'rental' ? <RentalPage availableBikes={availableBikes} activeRentals={activeRentals} form={rentalForm} error={rentalError} getRate={getRate} openRequest={rentalDialogRequest} onOpenRequestHandled={() => setRentalDialogRequest(false)} onChange={handleRentalChange} onSubmit={handleCreateRental} onReturnBike={handleReturnBike} onReturnBikes={handleReturnBikes} onNavigate={navigateTo} /> : null}
      {activePage === 'fleet' ? <FleetPage bikes={bikes} bikeTypes={bikeTypes} suggestedUnitNumber={suggestedUnitNumber} getRate={getRate} onSaveBike={handleSaveBike} onDeleteBike={handleDeleteBike} onStatusChange={handleStatusChange} /> : null}
      {activePage === 'finance' ? <FinancePage stats={stats} groups={transactionGroups} dateFilter={dateFilter} form={financeForm} error={financeError} onChange={handleFinanceChange} onSubmit={handleCreateFinance} onToggleSettlement={handleToggleSettlement} onDelete={handleDeleteTransaction} /> : null}
      {activePage === 'settings' ? <SettingsPage bikeTypes={bikeTypes} bikes={bikes} transactions={transactions} systemSettings={systemSettings} dataHealth={dataHealth} suggestedUnitNumber={suggestedUnitNumber} getRate={getRate} onRateChange={handleRateChange} onAddBikeType={handleAddBikeType} onRemoveBikeType={handleRemoveBikeType} onSettingChange={handleSystemSettingChange} onExport={handleExportData} onImport={handleImportData} onReset={handleResetData} /> : null}
    </AppShell>
  );
}
