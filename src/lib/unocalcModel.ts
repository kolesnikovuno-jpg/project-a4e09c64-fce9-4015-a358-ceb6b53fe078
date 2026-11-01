/** One locally stored GLB file for the object workspace. No server upload. */
export type StoredObjectModel = {
  id: "current";
  name: string;
  savedAt: number;
  blob: Blob;
};

const DATABASE = "unocalc-object-model-v1";
const STORE = "models";

const openDatabase = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  if (typeof indexedDB === "undefined") {
    reject(new Error("IndexedDB unavailable"));
    return;
  }
  const request = indexedDB.open(DATABASE, 1);
  request.onupgradeneeded = () => {
    const db = request.result;
    if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error ?? new Error("Cannot open model storage"));
});

export const loadObjectModel = async (): Promise<StoredObjectModel | null> => {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).get("current");
    request.onsuccess = () => resolve((request.result as StoredObjectModel | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error("Cannot read model"));
    tx.oncomplete = () => db.close();
    tx.onerror = () => db.close();
  });
};

const mutateModel = async (mode: "put" | "delete", value?: StoredObjectModel): Promise<void> => {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    if (mode === "put" && value) tx.objectStore(STORE).put(value);
    else tx.objectStore(STORE).delete("current");
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error ?? new Error("Cannot update model")); };
    tx.onabort = () => { db.close(); reject(tx.error ?? new Error("Model transaction aborted")); };
  });
};

export const saveObjectModel = (model: StoredObjectModel) => mutateModel("put", model);
export const deleteObjectModel = () => mutateModel("delete");
