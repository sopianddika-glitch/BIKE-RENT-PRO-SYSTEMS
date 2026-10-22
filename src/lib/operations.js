import { initialBikes, initialTransactions } from '../data/seed.js';
import { normalizeBike, normalizeTransaction } from './domain.js';
import { loadState } from './storage.js';

export const OPERATIONS_KEY = 'bike-rent-pro:operations';
const LOCK_NAME = OPERATIONS_KEY;

// Legacy keys remain untouched. The first successful write upgrades them to one atomic snapshot.
export const readOperations = (strict = false) => {
  try {
    const raw = window.localStorage.getItem(OPERATIONS_KEY);
    if (raw) {
      const state = JSON.parse(raw);
      if (state.schemaVersion !== 1 || !Number.isSafeInteger(state.revision) || state.revision < 0
        || !Array.isArray(state.bikes) || !Array.isArray(state.transactions)) throw new Error('Invalid operations snapshot');
      return { ...state, bikes: state.bikes.map(normalizeBike), transactions: state.transactions.map(normalizeTransaction) };
    }
  } catch {
    if (strict) throw new Error('Data operasional tidak dapat dibaca. Periksa penyimpanan browser dan backup data.');
  }
  const bikes = loadState('bike-rent-pro:bikes', initialBikes);
  const transactions = loadState('bike-rent-pro:transactions', initialTransactions);
  return {
    schemaVersion: 1,
    revision: 0,
    bikes: (Array.isArray(bikes) ? bikes : initialBikes).map(normalizeBike),
    transactions: (Array.isArray(transactions) ? transactions : initialTransactions).map(normalizeTransaction),
  };
};

export const updateOperations = async (update, { requireLock = false } = {}) => {
  const commit = () => {
    const current = readOperations(true);
    const next = update(current);
    if (!Array.isArray(next.bikes) || !Array.isArray(next.transactions)) throw new Error('Data operasional tidak valid.');
    const snapshot = { schemaVersion: 1, revision: current.revision + 1, bikes: next.bikes, transactions: next.transactions };
    try {
      // A single setItem either writes the entire rental/unit/history update or leaves the old value intact.
      window.localStorage.setItem(OPERATIONS_KEY, JSON.stringify(snapshot));
    } catch {
      throw new Error('Penyimpanan gagal. Perubahan belum diterapkan. Periksa ruang penyimpanan browser lalu coba lagi.');
    }
    return { snapshot, result: next.result || { success: true } };
  };
  if (navigator.locks?.request) return navigator.locks.request(LOCK_NAME, commit);
  if (requireLock) throw new Error('Ganti Unit memerlukan browser dengan penguncian data. Gunakan Chrome terbaru melalui HTTPS atau localhost.');
  // Existing workflows still work in older browsers; switching fails closed without cross-tab locking.
  return commit();
};
