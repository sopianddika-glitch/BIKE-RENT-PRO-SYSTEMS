import { useCallback, useEffect, useState } from 'react';
import { OPERATIONS_KEY, readOperations, updateOperations } from './operations.js';

export default function useOperations() {
  const [snapshot, setSnapshot] = useState(readOperations);
  useEffect(() => {
    const refresh = (event) => {
      if (!event || event.type === 'focus' || event.key === OPERATIONS_KEY || event.key === null) setSnapshot(readOperations());
    };
    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);
  const update = useCallback(async (updater, options) => {
    const { snapshot: next, result } = await updateOperations(updater, options);
    setSnapshot(next);
    return result;
  }, []);
  return { bikes: snapshot.bikes, transactions: snapshot.transactions, update };
}
