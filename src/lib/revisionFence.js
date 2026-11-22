const DATABASE = 'bike-rent-pro-write-fence';
const STORE = 'revisions';
const KEY = 'operations';

export const STORAGE_SYNC_ERROR = 'Revisi penyimpanan belum sinkron. Perubahan dihentikan untuk melindungi data. Periksa tab lain atau backup sebelum mencoba lagi.';

const openDatabase = () => new Promise((resolve, reject) => {
  const request = window.indexedDB.open(DATABASE, 1);
  request.onupgradeneeded = () => request.result.createObjectStore(STORE);
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(new Error(STORAGE_SYNC_ERROR));
  request.onblocked = () => reject(new Error(STORAGE_SYNC_ERROR));
});

const accessRevision = (database, revision) => new Promise((resolve, reject) => {
  const writing = revision !== undefined;
  const transaction = database.transaction(STORE, writing ? 'readwrite' : 'readonly');
  const store = transaction.objectStore(STORE);
  const request = writing ? store.put(revision, KEY) : store.get(KEY);
  transaction.oncomplete = () => resolve(writing ? revision : (request.result ?? 0));
  transaction.onabort = () => reject(new Error(STORAGE_SYNC_ERROR));
});

// Chrome can grant the next Web Lock before that tab's localStorage cache has received the last write.
export const withRevisionFence = async (read, prepare, save) => {
  let database;
  try {
    database = await openDatabase();
  } catch {
    throw new Error(STORAGE_SYNC_ERROR);
  }

  try {
    const lastRevision = await accessRevision(database);
    let current = read();
    for (let attempt = 0; current.revision < lastRevision && attempt < 8; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 16));
      current = read();
    }
    if (current.revision < lastRevision) throw new Error(STORAGE_SYNC_ERROR);
    const prepared = prepare(current);
    await accessRevision(database, prepared.snapshot.revision);
    try {
      save(prepared.snapshot);
    } catch (error) {
      await accessRevision(database, lastRevision);
      throw error;
    }
    return prepared;
  } finally {
    database.close();
  }
};
