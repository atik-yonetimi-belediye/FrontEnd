import api from './api';

const DB_NAME = 'atik-offline-v1';
const STORE_NAME = 'requests';

export function createIdempotencyKey() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${crypto.getRandomValues(new Uint32Array(4)).join('-')}`;
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore(mode, action) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const request = action(transaction.objectStore(STORE_NAME));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
  });
}

export async function queueOfflineRequest(url, data, id = createIdempotencyKey(), ownerId = null) {
  await withStore('readwrite', (store) => store.put({ id, url, data, ownerId, createdAt: new Date().toISOString() }));
  return id;
}

export async function flushOfflineQueue(ownerId) {
  if (!navigator.onLine || !ownerId) return { sent: 0, pending: 0 };
  const allQueued = await withStore('readonly', (store) => store.getAll());
  const queued = allQueued.filter((item) => String(item.ownerId) === String(ownerId));
  let sent = 0;
  for (const item of queued) {
    try {
      await api.post(item.url, item.data, { headers: { 'Idempotency-Key': item.id } });
      await withStore('readwrite', (store) => store.delete(item.id));
      sent += 1;
    } catch (error) {
      if (!error.response || error.response.status >= 500 || error.response.status === 429) break;
      await withStore('readwrite', (store) => store.delete(item.id));
    }
  }
  if (sent) window.dispatchEvent(new CustomEvent('offline-sync-complete', { detail: { sent } }));
  return { sent, pending: Math.max(0, queued.length - sent) };
}

export async function getOfflineQueueCount(ownerId) {
  if (!ownerId) return 0;
  const queued = await withStore('readonly', (store) => store.getAll());
  return queued.filter((item) => String(item.ownerId) === String(ownerId)).length;
}

export async function clearPrivateCaches() {
  if ('caches' in window) {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith('private-')).map((name) => caches.delete(name)));
  }
}
