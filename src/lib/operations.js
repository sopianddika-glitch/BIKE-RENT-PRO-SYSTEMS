import { initialBikes, initialRentalRates, initialSystemSettings, initialTransactions } from '../data/seed.js';
import { normalizeBike, normalizeSystemSettings, normalizeTransaction } from './domain.js';
import { getRentalFinancials } from './rentalPricing.js';
import { withRevisionFence } from './revisionFence.js';

export const OPERATIONS_KEY = 'bike-rent-pro:operations';
const LEGACY_KEYS = {
  bikes: 'bike-rent-pro:bikes',
  transactions: 'bike-rent-pro:transactions',
  rentalRates: 'bike-rent-pro:rental-rates',
  systemSettings: 'bike-rent-pro:system-settings',
};
export const STORAGE_READ_ERROR = 'Data operasional tidak dapat dibaca. Periksa penyimpanan browser dan backup data.';
export const STORAGE_WRITE_ERROR = 'Penyimpanan gagal. Perubahan belum diterapkan. Periksa ruang penyimpanan browser lalu coba lagi.';

const isRecord = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const hasUniqueIds = (items) => items.every((item) => isRecord(item) && Number.isSafeInteger(item.id) && item.id > 0)
  && new Set(items.map((item) => item.id)).size === items.length;
const optionalRecords = (list) => list == null || (Array.isArray(list) && list.every(isRecord));
const isDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && new Date(`${value}T00:00:00Z`).toJSON()?.slice(0, 10) === value;
const validCollections = ({ bikes, transactions, rentalRates, systemSettings }) => (
  Array.isArray(bikes) && hasUniqueIds(bikes) && bikes.every((bike) => (
    typeof bike.number === 'string' && bike.number.trim() && typeof bike.type === 'string'
    && optionalRecords(bike.rateHistory) && (bike.rateHistory ?? []).every((event) => isRecord(event.next))
  ))
  && Array.isArray(transactions) && hasUniqueIds(transactions) && transactions.every((transaction) => (
    isDate(transaction.date)
    && ['pendapatan', 'pengeluaran'].includes(transaction.type)
    && transaction.amount != null && transaction.amount !== '' && Number.isFinite(Number(transaction.amount))
    && ['switchHistory', 'extensionHistory', 'payments', 'adjustments'].every((field) => optionalRecords(transaction[field]))
    && (transaction.payments ?? []).every((payment) => isDate(payment.date))
    && [...(transaction.extensionHistory ?? []), ...(transaction.adjustments ?? [])].every((event) => event.date == null || isDate(event.date))
  ))
  && isRecord(rentalRates) && Object.values(rentalRates).every(isRecord)
  && isRecord(systemSettings)
);

export const makeDemoData = () => ({
  bikes: initialBikes, transactions: initialTransactions, rentalRates: initialRentalRates,
  systemSettings: initialSystemSettings, demo: true,
});

const normalizeCollections = (state) => {
  const transactions = state.transactions.map(normalizeTransaction);
  for (const transaction of transactions) {
    if (transaction.category !== 'rental') continue;
    getRentalFinancials(transaction);
    if (transaction.rentalTimeZone) new Intl.DateTimeFormat('id-ID', { timeZone: transaction.rentalTimeZone });
  }
  return { ...state, bikes: state.bikes.map(normalizeBike), transactions, systemSettings: normalizeSystemSettings(state.systemSettings) };
};

export const parseBackup = (payload) => {
  if (!isRecord(payload) || (payload.schemaVersion != null
    && (!Number.isInteger(payload.schemaVersion) || payload.schemaVersion < 1 || payload.schemaVersion > 7))) {
    throw new Error('Versi backup tidak didukung.');
  }
  const data = { ...payload, systemSettings: payload.systemSettings ?? initialSystemSettings };
  if (!validCollections(data)) throw new Error('Backup berisi data tidak valid atau ID duplikat.');
  try {
    return normalizeCollections({
      bikes: data.bikes, transactions: data.transactions, rentalRates: data.rentalRates,
      systemSettings: data.systemSettings, demo: data.demo === true,
    });
  } catch {
    throw new Error('Backup berisi nominal, riwayat, atau zona waktu rental yang tidak valid.');
  }
};

// Read old keys only when the snapshot has no corresponding field.
export const readOperations = () => {
  try {
    const raw = window.localStorage.getItem(OPERATIONS_KEY);
    const state = raw === null ? { schemaVersion: 1, revision: 0 } : JSON.parse(raw);
    if (!isRecord(state) || state.schemaVersion !== 1 || !Number.isSafeInteger(state.revision) || state.revision < 0
      || (raw !== null && (!Array.isArray(state.bikes) || !Array.isArray(state.transactions)))) throw new Error();
    const defaults = makeDemoData();
    let hasStoredData = raw !== null;
    for (const [field, key] of Object.entries(LEGACY_KEYS)) {
      if (Object.hasOwn(state, field)) continue;
      const legacy = window.localStorage.getItem(key);
      hasStoredData ||= legacy !== null;
      state[field] = legacy === null ? defaults[field] : JSON.parse(legacy);
    }
    if (!validCollections(state)) throw new Error();
    return normalizeCollections({ ...state, demo: state.demo === true || !hasStoredData });
  } catch {
    throw new Error(STORAGE_READ_ERROR);
  }
};

export const updateOperations = async (update, { requireLock = false, actionName = 'Ganti Unit', expectedRevision } = {}) => {
  const prepare = (current) => {
    if (expectedRevision != null && current.revision !== expectedRevision) {
      throw new Error('Data berubah sejak pratinjau dibuka. Buka kembali dan unduh backup terbaru.');
    }
    const next = update(current);
    if (!validCollections(next)) throw new Error('Data operasional tidak valid.');
    const { result, ...data } = next;
    const snapshot = { ...data, schemaVersion: 1, revision: current.revision + 1 };
    return { snapshot, result: result || { success: true } };
  };
  const save = (snapshot) => {
    try {
      window.localStorage.setItem(OPERATIONS_KEY, JSON.stringify(snapshot));
    } catch {
      throw new Error(STORAGE_WRITE_ERROR);
    }
  };
  if (navigator.locks?.request) {
    return navigator.locks.request(OPERATIONS_KEY, () => withRevisionFence(readOperations, prepare, save));
  }
  if (requireLock) throw new Error(`${actionName} memerlukan browser dengan penguncian data. Gunakan Chrome terbaru melalui HTTPS atau localhost.`);
  const prepared = prepare(readOperations());
  save(prepared.snapshot);
  return prepared;
};
