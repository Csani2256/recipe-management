import type { AppUser, Recipe } from "@/lib/types";

type Snapshot = { user: AppUser; recipes: Recipe[] };
const DATABASE = "morzsa-offline-v1";
const STORE = "snapshots";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") { reject(new Error("IndexedDB unavailable")); return; }
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveOfflineSnapshot(snapshot: Snapshot): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE, "readwrite");
      transaction.objectStore(STORE).put(snapshot, "latest");
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally { database.close(); }
}

export async function readOfflineSnapshot(): Promise<Snapshot | null> {
  const database = await openDatabase();
  try {
    return await new Promise<Snapshot | null>((resolve, reject) => {
      const request = database.transaction(STORE, "readonly").objectStore(STORE).get("latest");
      request.onsuccess = () => resolve((request.result as Snapshot | undefined) ?? null);
      request.onerror = () => reject(request.error);
    });
  } finally { database.close(); }
}

export async function clearOfflineSnapshot(): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE, "readwrite");
      transaction.objectStore(STORE).delete("latest");
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally { database.close(); }
}
