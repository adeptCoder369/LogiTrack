import { App } from '@capacitor/app';
import { Network } from '@capacitor/network';
import { Preferences } from '@capacitor/preferences';

const DB_NAME = 'logitrack-offline-db';
const DB_VERSION = 1;
const STORE_NAME = 'offline-queue';
const SUMMARY_KEY = 'logitrack:offline-summary';
const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

let dbPromise;
let flushing = false;
let initialized = false;

function emit(name, detail = {}) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(`logitrack:offline-${name}`, { detail }));
}

function openDb() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

function transaction(mode = 'readonly') {
  return openDb().then((db) => db.transaction(STORE_NAME, mode).objectStore(STORE_NAME));
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function isOnline() {
  try {
    const status = await Network.getStatus();
    return status.connected && navigator.onLine !== false;
  } catch {
    return navigator.onLine !== false;
  }
}

export function isMutation(config = {}) {
  const method = (config.method || 'get').toUpperCase();
  return MUTATION_METHODS.has(method);
}

export function serializeRequestConfig(config = {}) {
  return {
    url: config.url,
    method: (config.method || 'get').toUpperCase(),
    baseURL: config.baseURL,
    headers: config.headers ? { ...config.headers } : undefined,
    params: config.params,
    data: config.data,
    timeout: config.timeout,
    withCredentials: config.withCredentials,
  };
}

export async function enqueueOfflineRequest(config) {
  const item = {
    id: crypto.randomUUID ? crypto.randomUUID() : `offline-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    config: serializeRequestConfig(config),
    createdAt: Date.now(),
  };

  const store = await transaction('readwrite');
  await requestToPromise(store.put(item));
  await updateSummary();
  emit('queued', { id: item.id, method: item.config.method, url: item.config.url });
  return item;
}

export async function getOfflineQueue() {
  try {
    const store = await transaction('readonly');
    const items = await requestToPromise(store.getAll());
    return (items || []).sort((a, b) => a.createdAt - b.createdAt);
  } catch {
    return [];
  }
}

export async function getOfflineQueueCount() {
  const queue = await getOfflineQueue();
  return queue.length;
}

async function removeOfflineRequest(id) {
  const store = await transaction('readwrite');
  await requestToPromise(store.delete(id));
}

async function saveOfflineQueue(queue) {
  const store = await transaction('readwrite');
  await requestToPromise(store.clear());
  await Promise.all(queue.map((item) => requestToPromise(store.put(item))));
  await updateSummary();
}

async function updateSummary() {
  try {
    const count = await getOfflineQueueCount();
    await Preferences.set({ key: SUMMARY_KEY, value: String(count) });
    emit('summary', { count });
  } catch {
    emit('summary', { count: 0 });
  }
}

export async function flushOfflineQueue(api) {
  if (flushing) return;
  if (!(await isOnline())) return;

  flushing = true;
  emit('sync-start');

  try {
    const queue = await getOfflineQueue();
    const remaining = [];

    for (const item of queue) {
      try {
        await api.request(item.config);
        await removeOfflineRequest(item.id);
        emit('synced', { id: item.id, method: item.config.method, url: item.config.url });
      } catch (error) {
        remaining.push(item);
        if (error.response?.status === 401) {
          await saveOfflineQueue([]);
          emit('auth-required');
          throw error;
        }
        emit('sync-failed', { id: item.id, error: error.message || 'Sync failed' });
        break;
      }
    }

    if (remaining.length) {
      await saveOfflineQueue(remaining);
    } else {
      await updateSummary();
    }

    emit('sync-end', { count: remaining.length });
  } finally {
    flushing = false;
  }
}

export function initOfflineSupport(api) {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  window.addEventListener('online', () => flushOfflineQueue(api));
  flushOfflineQueue(api);

  try {
    Network.addListener('networkStatusChange', (status) => {
      if (status.connected) flushOfflineQueue(api);
    });
  } catch {}

  try {
    App.addListener('resume', () => flushOfflineQueue(api));
  } catch {}
}
