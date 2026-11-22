import { useCallback, useEffect, useState } from 'react';
import { STORAGE_SYNC_ERROR } from './revisionFence.js';
import { initialSystemSettings } from '../data/seed.js';
import { OPERATIONS_KEY, readOperations, STORAGE_READ_ERROR, STORAGE_WRITE_ERROR, updateOperations } from './operations.js';

const emptySnapshot = { bikes: [], transactions: [], rentalRates: {}, systemSettings: initialSystemSettings, demo: false };

const readSnapshot = () => {
  try {
    return { snapshot: readOperations(), readError: '' };
  } catch (error) {
    return { snapshot: null, readError: error.message };
  }
};

export default function useOperations() {
  const [data, setData] = useState(readSnapshot);
  const [writeError, setWriteError] = useState('');
  useEffect(() => {
    const refresh = (event) => {
      if (event.type === 'storage' && event.key !== null && !event.key.startsWith('bike-rent-pro:')) return;
      const next = readSnapshot();
      setData((current) => ({ ...next, snapshot: next.snapshot ?? current.snapshot }));
      if (event.type === 'storage' && event.key === OPERATIONS_KEY && next.snapshot) setWriteError('');
    };
    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  const update = useCallback(async (updater, options) => {
    try {
      const { snapshot, result } = await updateOperations(updater, options);
      setData({ snapshot, readError: '' });
      setWriteError('');
      return result;
    } catch (error) {
      if (error.message === STORAGE_READ_ERROR) setData((current) => ({ ...current, readError: error.message }));
      if ([STORAGE_WRITE_ERROR, STORAGE_SYNC_ERROR].includes(error.message)) setWriteError(error.message);
      throw error;
    }
  }, []);

  return { ...(data.snapshot ?? emptySnapshot), storageError: data.readError || writeError, readError: data.readError, update };
}
