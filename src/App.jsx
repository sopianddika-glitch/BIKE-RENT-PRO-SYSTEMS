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
import useOperations from './lib/useOperations.js';
import { getSwitchActivities, getReplacementBikes, switchRentalUnit } from './lib/unitSwitch.js';

const STORAGE_KEYS = {
  rentalRates: 'bike-rent-pro:rental-rates',
  systemSettings: 'bike-rent-pro:system-settings',
};

const pageMeta = {
  dashboard: { title: 'Dashboard', subtitle: 'Ringkasan armada, arus kas, dan pekerjaan hari ini', description: 'Pantau armada, transaksi, laba, dan setoran rental sepeda dari satu pusat operasi.' },
  rental: { title: 'Rental', subtitle: 'Aktifkan sewa baru dan proses pengembalian unit', description: 'Kelola penyewaan dan pengembalian unit sepeda dengan alur operasional yang jelas.' },
  fleet: { title: 'Unit', subtitle: 'Katalog unit, harga, kondisi, dan status operasional', description: 'Kelola katalog, kondisi, harga, dan status armada sepeda.' },
  finance: { title: 'Keuangan', subtitle: 'Audit transaksi, laba, biaya, dan penyelesaian setoran', description: 'Audit pendapatan, pengeluaran, laba, serta status setoran rental.' },
  settings: { title: 'Pengaturan', subtitle: 'Bisnis, workflow, harga, dashboard, dan keamanan data', description: 'Atur workflow, penomoran, harga, tampilan dashboard, dan backup data operasional.' },
};

const getTodayInput = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
};

const createRentalForm = () => ({ date: getTodayInput(), bikeIds: [], customerName: '', customerContact: '', prices: {}, note: '' });
const createFinanceForm = () => ({ date: getTodayInput(), type: 'pengeluaran', amount: '', note: '' });

const loadSystemSettings = () => normalizeSystemSettings(loadState(STORAGE_KEYS.systemSettings, initialSystemSettings));

const getInitialPage = () => {
  if (typeof window === 'undefined') return 'dashboard';
  const page = window.location.hash.replace('#', '');
  return pageMeta[page] ? page : 'dashboard';
};

export default function App() {
  const [activePage, setActivePage] = useState(getInitialPage);
  const { bikes, transactions, update: updateOperations } = useOperations();
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

  const recentTransactions = useMemo(() => [...filteredTransactions, ...getSwitchActivities(transactions).filter((event) => isDateWithinRange(event.date, effectiveDateRange))]
    .sort((first, second) => `${second.timestamp || second.date}`.localeCompare(`${first.timestamp || first.date}`) || Number(second.id) - Number(first.id)), [effectiveDateRange, filteredTransactions, transactions]);
  const availableBikes = useMemo(() => getReplacementBikes(bikes, transactions, null), [bikes, transactions]);
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

  const commitOperation = async (updater, message, options = {}) => {
    try {
      const result = await updateOperations(updater, options);
      if (message) showNotice(typeof message === 'function' ? message(result) : message, options.tone || 'success');
      return result;
    } catch (error) {
      showNotice(error.message, 'error');
      return { error: error.message };
    }
  };

  const handleCreateRental = async (event) => {
    event.preventDefault();
    const result = await commitOperation((current) => {
      const selectedIds = new Set(rentalForm.bikeIds.map(Number));
      const selectedBikes = current.bikes.filter((bike) => selectedIds.has(bike.id));
      const available = getReplacementBikes(current.bikes, current.transactions, null);
      if (!selectedBikes.length || selectedBikes.length !== selectedIds.size || selectedBikes.some((bike) => !available.some((item) => item.id === bike.id))) {
        throw new Error('Unit ini sudah tidak tersedia. Pilih unit lain.');
      }
      const customerName = rentalForm.customerName.trim();
      if (!customerName || !rentalForm.date) throw new Error('Nama tamu dan tanggal sewa wajib diisi.');
      if (selectedBikes.some((bike) => !Number.isFinite(Number(rentalForm.prices[bike.id])) || Number(rentalForm.prices[bike.id]) <= 0)) {
        throw new Error('Harga setiap unit harus lebih dari nol.');
      }
      const nextId = current.transactions.length ? Math.max(...current.transactions.map((transaction) => transaction.id)) + 1 : 1;
      const rentalGroupId = `rental-${Date.now()}-${nextId}`;
      const rentalCode = createRentalCode(rentalForm.date, nextId, systemSettings);
      const rentalNote = rentalForm.note.trim();
      const customerContact = rentalForm.customerContact.trim();
      const newTransactions = selectedBikes.map((bike, index) => {
        const rate = getRate(bike.type);
        const amount = Number(rentalForm.prices[bike.id]);
        return normalizeTransaction({
          id: nextId + index, date: rentalForm.date, startedAt: rentalForm.date === getTodayInput() ? new Date().toISOString() : null,
          type: 'pendapatan', category: 'rental', amount,
          note: `Sewa ${bike.number} / ${customerName}${rentalNote ? ` / ${rentalNote}` : ''}`,
          bikeId: bike.id, bikeNumber: bike.number, customerName, customerContact, rentalNote,
          rentalGroupId, rentalCode, rentalUnitCount: selectedBikes.length,
          costAmount: rate.cost, grossProfit: amount - rate.cost, settled: false, settledAt: null,
          returnedAt: null, returnDate: null,
        });
      });
      return {
        ...current,
        transactions: [...newTransactions, ...current.transactions],
        bikes: current.bikes.map((bike) => selectedIds.has(bike.id) ? { ...bike, status: 'disewa' } : bike),
        result: { success: true, rentalCode, unitCount: selectedBikes.length, customerName },
      };
    }, ({ unitCount, customerName }) => `${unitCount} unit untuk ${customerName} berhasil diaktifkan.`);
    if (result.error) setRentalError(result.error);
    else setRentalForm(createRentalForm());
    return result;
  };

  const handleSwitchUnit = (request) => commitOperation((current) => {
    const next = switchRentalUnit(current, request);
    const transaction = next.transactions.find((item) => item.id === request.rentalId);
    const event = transaction.switchHistory.at(-1);
    return { ...next, result: { success: true, from: event.fromBikeNumber, to: event.toBikeNumber } };
  }, ({ from, to }) => `Unit berhasil diganti dari ${from} ke ${to}.`, { requireLock: true });

  const handleReturnBikes = (bikeIds) => {
    const selectedIds = new Set(bikeIds.map(Number));
    const expected = new Map(activeRentals.filter(({ bike }) => selectedIds.has(bike.id)).map(({ bike, transaction }) => [bike.id, transaction?.id ?? null]));
    return commitOperation((current) => {
      const selectedBikes = current.bikes.filter((bike) => selectedIds.has(bike.id) && bike.status === 'disewa');
      if (!selectedBikes.length || selectedBikes.length !== selectedIds.size) throw new Error('Unit rental sudah berubah. Muat ulang daftar rental aktif.');
      for (const bike of selectedBikes) {
        const transaction = getActiveRentals(current.bikes, current.transactions).find((item) => item.bike.id === bike.id)?.transaction;
        if (!expected.has(bike.id) || expected.get(bike.id) !== (transaction?.id ?? null)) throw new Error('Rental sudah berubah. Periksa unit aktif sebelum pengembalian.');
      }
      const returnedAt = new Date().toISOString();
      return {
        ...current,
        bikes: current.bikes.map((bike) => selectedIds.has(bike.id) ? { ...bike, status: 'tersedia' } : bike),
        transactions: current.transactions.map((transaction) => selectedIds.has(Number(transaction.bikeId)) && transaction.category === 'rental' && !transaction.returnedAt
          ? { ...transaction, returnedAt, returnDate: getTodayInput() } : transaction),
        result: { success: true, count: selectedBikes.length, number: selectedBikes[0].number },
      };
    }, ({ count, number }) => count === 1 ? `${number} selesai disewa dan kembali tersedia.` : `${count} unit selesai disewa dan kembali tersedia.`);
  };

  const handleReturnBike = (bikeId) => handleReturnBikes([bikeId]);

  const handleStartRental = () => {
    navigateTo('rental');
    setRentalDialogRequest(true);
  };

  const handleFinanceChange = (field, value) => { setFinanceError(''); setFinanceForm((current) => ({ ...current, [field]: value })); };
  const handleCreateFinance = async (event) => {
    event.preventDefault();
    const amount = Number(financeForm.amount);
    const note = financeForm.note.trim();
    if (!financeForm.date || !Number.isFinite(amount) || amount <= 0 || !note) { setFinanceError('Tanggal, nominal, dan keterangan wajib diisi.'); return; }
    const result = await commitOperation((current) => {
      const nextId = current.transactions.length ? Math.max(...current.transactions.map((transaction) => transaction.id)) + 1 : 1;
      return { ...current, transactions: [{ id: nextId, date: financeForm.date, type: financeForm.type, category: 'manual', amount, note, bikeId: null, costAmount: 0, grossProfit: null, settled: null, returnedAt: null }, ...current.transactions] };
    }, 'Transaksi keuangan berhasil disimpan.');
    if (result.error) setFinanceError(result.error);
    else setFinanceForm(createFinanceForm());
  };

  const handleToggleSettlement = (transactionId) => commitOperation((current) => {
    const transaction = current.transactions.find((item) => item.id === transactionId);
    if (!transaction) throw new Error('Transaksi tidak ditemukan.');
    const nextSettled = !transaction.settled;
    return { ...current, transactions: current.transactions.map((item) => item.id === transactionId ? { ...item, settled: nextSettled, settledAt: nextSettled ? new Date().toISOString() : null } : item), result: { success: true, settled: nextSettled } };
  }, ({ settled }) => settled ? 'Setoran rental ditandai selesai.' : 'Setoran dikembalikan ke daftar tertunda.');

  const handleDeleteTransaction = (transactionId) => commitOperation((current) => {
    const transaction = current.transactions.find((item) => item.id === transactionId);
    if (!transaction) throw new Error('Transaksi tidak ditemukan.');
    return {
      ...current,
      bikes: current.bikes.map((bike) => transaction.category === 'rental' && !transaction.returnedAt && bike.id === Number(transaction.bikeId) ? { ...bike, status: 'tersedia' } : bike),
      transactions: current.transactions.filter((item) => item.id !== transactionId),
    };
  }, 'Transaksi dihapus dan status unit telah disinkronkan.', { tone: 'warning' });

  const handleSaveBike = (form, editingId, expectedStatus) => commitOperation((current) => {
    const number = form.number.trim().toUpperCase();
    const type = form.type.trim();
    const duplicate = current.bikes.some((bike) => normalizeText(bike.number) === normalizeText(number) && bike.id !== editingId);
    const existingBike = current.bikes.find((bike) => bike.id === editingId);
    if (!number || !type) throw new Error('Nomor unit dan tipe sepeda wajib diisi.');
    if (duplicate) throw new Error('Nomor unit sudah terdaftar.');
    if (editingId && !existingBike) throw new Error('Unit tidak ditemukan.');
    if (editingId && existingBike.status !== expectedStatus) throw new Error('Status unit sudah berubah. Tutup editor dan buka kembali unit tersebut.');
    if (form.status === 'disewa' && existingBike?.status !== 'disewa') throw new Error('Aktifkan status disewa melalui menu Rental agar data tamu dan transaksi tetap sinkron.');
    const nextId = current.bikes.length ? Math.max(...current.bikes.map((bike) => bike.id)) + 1 : 1;
    return {
      ...current,
      bikes: editingId ? current.bikes.map((bike) => bike.id === editingId ? { ...bike, ...form, number, type, note: form.note.trim() } : bike)
        : [...current.bikes, { id: nextId, ...form, number, type, note: form.note.trim() }],
      transactions: current.transactions.map((transaction) => existingBike?.status === 'disewa' && form.status !== 'disewa' && transaction.category === 'rental' && Number(transaction.bikeId) === editingId && !transaction.returnedAt
        ? { ...transaction, returnedAt: new Date().toISOString(), returnDate: getTodayInput() } : transaction),
      result: { success: true, number, edited: Boolean(editingId) },
    };
  }, ({ number, edited }) => `Unit ${number} berhasil ${edited ? 'diperbarui' : 'ditambahkan'}.`);

  const handleDeleteBike = (bikeId) => commitOperation((current) => {
    const bike = current.bikes.find((item) => item.id === bikeId);
    if (!bike) throw new Error('Unit tidak ditemukan.');
    if (bike.status === 'disewa' || current.transactions.some((transaction) => transaction.category === 'rental' && !transaction.returnedAt && Number(transaction.bikeId) === bikeId)) throw new Error('Unit yang sedang disewa tidak dapat dihapus.');
    return { ...current, bikes: current.bikes.filter((item) => item.id !== bikeId), result: { success: true, number: bike.number } };
  }, ({ number }) => `Unit ${number} dihapus dari armada.`, { tone: 'warning' });

  const handleStatusChange = (bikeId, status) => commitOperation((current) => {
    const bike = current.bikes.find((item) => item.id === bikeId);
    if (!bike) throw new Error('Unit tidak ditemukan.');
    if (bike.status !== bikes.find((item) => item.id === bikeId)?.status) throw new Error('Status unit sudah berubah. Periksa kembali daftar Unit.');
    if (status === 'disewa' && bike.status !== 'disewa') throw new Error('Gunakan menu Rental untuk mengaktifkan unit agar transaksi tetap sinkron.');
    return {
      ...current,
      bikes: current.bikes.map((item) => item.id === bikeId ? { ...item, status } : item),
      transactions: current.transactions.map((transaction) => bike.status === 'disewa' && status !== 'disewa' && transaction.category === 'rental' && Number(transaction.bikeId) === bikeId && !transaction.returnedAt
        ? { ...transaction, returnedAt: new Date().toISOString(), returnDate: getTodayInput() } : transaction),
      result: { success: true, number: bike.number },
    };
  }, ({ number }) => `Status ${number} berhasil diperbarui.`);

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
    const payload = JSON.stringify({ schemaVersion: 5, exportedAt: new Date().toISOString(), bikes, transactions, rentalRates, systemSettings }, null, 2);
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
      const result = await commitOperation((current) => ({ ...current, bikes: payload.bikes.map(normalizeBike), transactions: payload.transactions.map(normalizeTransaction) }));
      if (result.error) return;
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

  const handleResetData = async () => {
    const result = await commitOperation((current) => ({ ...current, bikes: initialBikes.map(normalizeBike), transactions: initialTransactions.map(normalizeTransaction) }));
    if (result.error) return;
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
      {activePage === 'rental' ? <RentalPage bikes={bikes} transactions={transactions} onSwitchUnit={handleSwitchUnit} availableBikes={availableBikes} activeRentals={activeRentals} form={rentalForm} error={rentalError} getRate={getRate} openRequest={rentalDialogRequest} onOpenRequestHandled={() => setRentalDialogRequest(false)} onChange={handleRentalChange} onSubmit={handleCreateRental} onReturnBike={handleReturnBike} onReturnBikes={handleReturnBikes} onNavigate={navigateTo} /> : null}
      {activePage === 'fleet' ? <FleetPage bikes={bikes} bikeTypes={bikeTypes} suggestedUnitNumber={suggestedUnitNumber} getRate={getRate} onSaveBike={handleSaveBike} onDeleteBike={handleDeleteBike} onStatusChange={handleStatusChange} /> : null}
      {activePage === 'finance' ? <FinancePage stats={stats} groups={transactionGroups} dateFilter={dateFilter} form={financeForm} error={financeError} onChange={handleFinanceChange} onSubmit={handleCreateFinance} onToggleSettlement={handleToggleSettlement} onDelete={handleDeleteTransaction} /> : null}
      {activePage === 'settings' ? <SettingsPage bikeTypes={bikeTypes} bikes={bikes} transactions={transactions} systemSettings={systemSettings} dataHealth={dataHealth} suggestedUnitNumber={suggestedUnitNumber} getRate={getRate} onRateChange={handleRateChange} onAddBikeType={handleAddBikeType} onRemoveBikeType={handleRemoveBikeType} onSettingChange={handleSystemSettingChange} onExport={handleExportData} onImport={handleImportData} onReset={handleResetData} /> : null}
    </AppShell>
  );
}
