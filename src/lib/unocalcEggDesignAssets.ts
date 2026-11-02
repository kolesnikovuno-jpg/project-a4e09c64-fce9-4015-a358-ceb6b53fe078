/** Sketches for the experimental Egg design loop. Stored only in this browser. */
export type EggDesignAsset = { id: string; name: string; blob: Blob; createdAt: number };
const DATABASE = "unocalc-egg-design-v1";
const STORE = "assets";
const openDb = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  if (typeof indexedDB === "undefined") { reject(new Error("IndexedDB unavailable")); return; }
  const req = indexedDB.open(DATABASE, 1);
  req.onupgradeneeded = () => {
    const db = req.result;
    if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
  };
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error ?? new Error("Cannot open image storage"));
});
export const listEggDesignAssets = async (): Promise<EggDesignAsset[]> => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as EggDesignAsset[]);
    req.onerror = () => reject(req.error ?? new Error("Cannot read images"));
    tx.oncomplete = () => db.close();
    tx.onerror = () => db.close();
  });
};
export const putEggDesignAsset = async (image: EggDesignAsset): Promise<void> => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(image);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error ?? new Error("Cannot save image")); };
    tx.onabort = () => { db.close(); reject(tx.error ?? new Error("Save interrupted")); };
  });
};
export const clearEggDesignAssets = async (): Promise<void> => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error ?? new Error("Cannot clear images")); };
  });
};
