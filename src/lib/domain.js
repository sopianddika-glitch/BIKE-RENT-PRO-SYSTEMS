import { BIKE_STATUSES, initialSystemSettings } from '../data/seed.js';

const dashboardRanges = ['hari', 'minggu', 'bulan', 'tahun'];

const toSafeInteger = (value, fallback, minimum, maximum) => {
  const numericValue = Number.parseInt(value, 10);
  if (!Number.isFinite(numericValue)) return fallback;
  return Math.min(maximum, Math.max(minimum, numericValue));
};

const cleanCode = (value, fallback) => {
  const code = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8);
  return code || fallback;
};

export const defaultRentalRate = { cost: 30000, price: 50000 };

export const normalizeRentalRate = (rate = {}) => ({
  cost: Math.max(0, Number(rate.cost ?? defaultRentalRate.cost) || 0),
  price: Math.max(0, Number(rate.price ?? defaultRentalRate.price) || 0),
});

export const normalizeBike = (bike = {}) => ({
  ...bike,
  status: bike.status === 'baru' || !BIKE_STATUSES.includes(bike.status) ? 'tersedia' : bike.status,
});

export const normalizeTransaction = (transaction = {}) => ({
  ...transaction,
  category: transaction.category || (transaction.bikeId || Number(transaction.costAmount || 0) > 0 ? 'rental' : 'manual'),
  settled: Number(transaction.costAmount || 0) > 0 ? Boolean(transaction.settled) : null,
  returnedAt: transaction.returnedAt || null,
  rentalGroupId: transaction.rentalGroupId || null,
  rentalCode: transaction.rentalCode || null,
});

export const normalizeSystemSettings = (settings = {}) => {
  const merged = { ...initialSystemSettings, ...(settings && typeof settings === 'object' ? settings : {}) };
  return {
    ...merged,
    businessName: String(merged.businessName || initialSystemSettings.businessName).trim().slice(0, 60) || initialSystemSettings.businessName,
    adminName: String(merged.adminName || initialSystemSettings.adminName).trim().slice(0, 60) || initialSystemSettings.adminName,
    businessLocation: String(merged.businessLocation || '').trim().slice(0, 100),
    businessContact: String(merged.businessContact || '').trim().slice(0, 60),
    unitPrefix: cleanCode(merged.unitPrefix, initialSystemSettings.unitPrefix),
    unitDigits: toSafeInteger(merged.unitDigits, initialSystemSettings.unitDigits, 2, 6),
    rentalCodePrefix: cleanCode(merged.rentalCodePrefix, initialSystemSettings.rentalCodePrefix),
    lowAvailabilityThreshold: toSafeInteger(merged.lowAvailabilityThreshold, initialSystemSettings.lowAvailabilityThreshold, 0, 999),
    defaultDashboardRange: dashboardRanges.includes(merged.defaultDashboardRange) ? merged.defaultDashboardRange : initialSystemSettings.defaultDashboardRange,
    dashboardShowFinance: Boolean(merged.dashboardShowFinance),
    dashboardShowFleet: Boolean(merged.dashboardShowFleet),
    dashboardShowActiveRentals: Boolean(merged.dashboardShowActiveRentals),
    dashboardShowStock: Boolean(merged.dashboardShowStock),
    dashboardShowActivity: Boolean(merged.dashboardShowActivity),
  };
};

export const getNextUnitNumber = (bikes, settings) => {
  const normalizedSettings = normalizeSystemSettings(settings);
  const prefix = normalizedSettings.unitPrefix;
  const pattern = new RegExp(`^${prefix}[-\\s]?(\\d+)$`, 'i');
  const highestNumber = bikes.reduce((highest, bike) => {
    const match = String(bike.number || '').trim().match(pattern);
    return match ? Math.max(highest, Number(match[1]) || 0) : highest;
  }, 0);
  return `${prefix}-${String(highestNumber + 1).padStart(normalizedSettings.unitDigits, '0')}`;
};

export const createRentalCode = (date, sequence, settings) => {
  const prefix = normalizeSystemSettings(settings).rentalCodePrefix;
  return `${prefix}-${String(date || '').replaceAll('-', '')}-${String(sequence).padStart(3, '0')}`;
};

export const buildDashboardStats = (bikes, transactions) => {
  const statusGroups = BIKE_STATUSES.reduce((groups, status) => {
    groups[status] = bikes.filter((bike) => bike.status === status);
    return groups;
  }, {});
  const incomeTransactions = transactions.filter((transaction) => transaction.type === 'pendapatan');
  const rentalTransactions = transactions.filter((transaction) => Number(transaction.costAmount || 0) > 0);
  const pendapatan = incomeTransactions.reduce((total, transaction) => total + Number(transaction.amount || 0), 0);
  const setoranRental = rentalTransactions.reduce((total, transaction) => total + Number(transaction.costAmount || 0), 0);
  const pendingSettlements = rentalTransactions.filter((transaction) => !transaction.settled);
  const setoranBelumDisetor = pendingSettlements.reduce((total, transaction) => total + Number(transaction.costAmount || 0), 0);
  const pengeluaranOperasional = transactions
    .filter((transaction) => transaction.type === 'pengeluaran')
    .reduce((total, transaction) => total + Number(transaction.amount || 0), 0);
  const pengeluaran = setoranRental + pengeluaranOperasional;

  return {
    ...statusGroups,
    pendapatan,
    setoranRental,
    setoranBelumDisetor,
    setoranSudahDisetor: setoranRental - setoranBelumDisetor,
    transaksiBelumDisetor: pendingSettlements.length,
    pengeluaranOperasional,
    pengeluaran,
    laba: pendapatan - pengeluaran,
    totalTransactions: transactions.length,
  };
};

export const buildFleetOverview = (bikes) => {
  const byStatus = BIKE_STATUSES.reduce((groups, status) => {
    groups[status] = bikes
      .filter((bike) => bike.status === status)
      .sort((first, second) => first.number.localeCompare(second.number, 'id', { numeric: true }));
    return groups;
  }, {});
  const byTypeMap = bikes.reduce((map, bike) => {
    const key = bike.type || 'Tanpa tipe';
    if (!map.has(key)) map.set(key, { type: key, total: 0, tersedia: 0, disewa: 0, bengkel: 0, hilang: 0, numbers: [] });
    const summary = map.get(key);
    summary.total += 1;
    summary[bike.status] += 1;
    summary.numbers.push(bike.number);
    return map;
  }, new Map());
  const byType = Array.from(byTypeMap.values())
    .map((summary) => ({ ...summary, numbers: summary.numbers.sort((first, second) => first.localeCompare(second, 'id', { numeric: true })) }))
    .sort((first, second) => first.type.localeCompare(second.type, 'id'));
  const total = bikes.length;

  return {
    total,
    byStatus,
    byType,
    availabilityRate: total ? Math.round((byStatus.tersedia.length / total) * 100) : 0,
    utilizationRate: total ? Math.round((byStatus.disewa.length / total) * 100) : 0,
    attentionCount: byStatus.bengkel.length + byStatus.hilang.length,
  };
};

export const getActiveRentals = (bikes, transactions) => bikes
  .filter((bike) => bike.status === 'disewa')
  .map((bike) => ({
    bike,
    transaction: [...transactions]
      .filter((transaction) => Number(transaction.bikeId) === bike.id && transaction.category === 'rental' && !transaction.returnedAt)
      .sort((first, second) => second.id - first.id)[0] || null,
  }));

export const buildDataHealth = (bikes, transactions, rentalRates) => {
  const bikeIds = new Set(bikes.map((bike) => Number(bike.id)));
  const numberCounts = bikes.reduce((counts, bike) => {
    const number = String(bike.number || '').trim().toLowerCase();
    counts.set(number, (counts.get(number) || 0) + 1);
    return counts;
  }, new Map());
  const duplicateUnitNumbers = Array.from(numberCounts.values()).filter((count) => count > 1).length;
  const orphanRentalTransactions = transactions.filter((transaction) => transaction.category === 'rental' && transaction.bikeId && !bikeIds.has(Number(transaction.bikeId))).length;
  const negativeMarginTypes = Object.values(rentalRates).filter((rate) => {
    const normalizedRate = normalizeRentalRate(rate);
    return normalizedRate.price < normalizedRate.cost;
  }).length;
  return {
    duplicateUnitNumbers,
    orphanRentalTransactions,
    negativeMarginTypes,
    issueCount: duplicateUnitNumbers + orphanRentalTransactions + negativeMarginTypes,
  };
};
