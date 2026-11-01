/** Local-only sketch storage. No images are uploaded to a server. */
export type StoredSketch = {
  id: string;
  name: string;
  createdAt: number;
  blob: Blob;
};

const DATABASE = "unocalc-creative-v1";
const STORE = "sketches";

const openSketchDatabase = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  if (typeof indexedDB === "undefined") {
    reject(new Error("IndexedDB unavailable"));
    return;
  }
  const request = indexedDB.open(DATABASE, 1);
  request.onupgradeneeded = () => {
    const database = request.result;
    if (!database.objectStoreNames.contains(STORE)) database.createObjectStore(STORE, { keyPath: "id" });
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error ?? new Error("Unable to open sketch storage"));
});

export const listSketches = async (): Promise<StoredSketch[]> => {
  const db = await openSketchDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
    request.onsuccess = () => resolve((request.result as StoredSketch[]).sort((a, b) => a.createdAt - b.createdAt));
    request.onerror = () => reject(request.error ?? new Error("Unable to read sketches"));
    db.onversionchange = () => db.close();
    request.transaction.oncomplete = () => db.close();
    request.transaction.onerror = () => db.close();
  });
};

const mutateSketch = async (mode: "put" | "delete", value: StoredSketch | string): Promise<void> => {
  const db = await openSketchDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, "readwrite");
    const store = transaction.objectStore(STORE);
    if (mode === "put") store.put(value as StoredSketch);
    else store.delete(value as string);
    transaction.oncomplete = () => { db.close(); resolve(); };
    transaction.onerror = () => { db.close(); reject(transaction.error ?? new Error("Unable to update sketches")); };
    transaction.onabort = () => { db.close(); reject(transaction.error ?? new Error("Sketch transaction aborted")); };
  });
};

export const storeSketch = (sketch: StoredSketch) => mutateSketch("put", sketch);
export const removeStoredSketch = (id: string) => mutateSketch("delete", id);
