import type { StateStorage } from "zustand/middleware";

/**
 * IndexedDB key/value storage for the wizard's in-progress design.
 * localStorage holds about 5 MB per origin, and one uploaded photo kept as a
 * data URL can be larger, so the draft lives in IndexedDB. Every failure (a
 * private window, storage switched off, quota) degrades to "not saved":
 * the studio keeps working, it just will not survive a reload.
 */

const DB_NAME = "ezmailout";
const STORE = "drafts";

let dbPromise: Promise<IDBDatabase | null> | null = null;

function db(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  dbPromise ??= new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

function run<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T | null> {
  return db().then(
    (d) =>
      new Promise((resolve) => {
        if (!d) return resolve(null);
        try {
          const req = fn(d.transaction(STORE, mode).objectStore(STORE));
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      }),
  );
}

export const draftStorage: StateStorage = {
  getItem: async (name) => {
    const v = await run<unknown>("readonly", (s) => s.get(name));
    return typeof v === "string" ? v : null;
  },
  setItem: async (name, value) => {
    await run("readwrite", (s) => s.put(value, name));
  },
  removeItem: async (name) => {
    await run("readwrite", (s) => s.delete(name));
  },
};
