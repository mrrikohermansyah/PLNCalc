export const NAMESPACE = 'plncalc';

function memoryBackend() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
    get length() {
      return map.size;
    },
    key: (i) => Array.from(map.keys())[i] ?? null,
  };
}

export class StorageError extends Error {
  constructor(message, cause = null) {
    super(message);
    this.name = 'StorageError';
    this.cause = cause;
  }
}

export function createStorage(backend = globalThis.localStorage, namespace = NAMESPACE) {
  let safeBackend = backend;
  if (!safeBackend) safeBackend = memoryBackend();
  try {
    const probeKey = `${namespace}.__probe__`;
    safeBackend.setItem(probeKey, '1');
    safeBackend.removeItem(probeKey);
  } catch {
    safeBackend = memoryBackend();
  }

  const fullKey = (key) => `${namespace}.${key}`;

  function read(key, fallback = null) {
    try {
      const raw = safeBackend.getItem(fullKey(key));
      if (raw == null) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      safeBackend.setItem(fullKey(key), JSON.stringify(value));
      return true;
    } catch (err) {
      const name = err?.name ?? '';
      if (name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED' || name === 'SecurityError') {
        throw new StorageError('Penyimpanan lokal penuh atau diblokir browser. Hapus sebagian riwayat lalu coba lagi.', err);
      }
      throw new StorageError('Gagal menyimpan data ke penyimpanan lokal.', err);
    }
  }

  function remove(key) {
    try {
      safeBackend.removeItem(fullKey(key));
    } catch {
      /* abaikan */
    }
  }

  function clearAll() {
    try {
      const keysToRemove = [];
      for (let i = 0; i < safeBackend.length; i += 1) {
        const key = safeBackend.key(i);
        if (key && key.startsWith(`${namespace}.`)) keysToRemove.push(key);
      }
      keysToRemove.forEach((key) => safeBackend.removeItem(key));
    } catch {
      /* abaikan */
    }
  }

  return { read, write, remove, clearAll, backend: safeBackend };
}

export const storage = createStorage();
