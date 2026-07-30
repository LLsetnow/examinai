export type LocalHistoryDirectoryStatus =
  | "saved"
  | "unavailable"
  | "unsupported"
  | "permission-denied";

interface LocalFileHandle {
  createWritable(): Promise<{
    write(contents: string): Promise<void>;
    close(): Promise<void>;
  }>;
}

interface LocalDirectoryHandle {
  name: string;
  getFileHandle(name: string, options: { create: boolean }): Promise<LocalFileHandle>;
  queryPermission?: (options: { mode: "readwrite" }) => Promise<PermissionState>;
  requestPermission?: (options: { mode: "readwrite" }) => Promise<PermissionState>;
}

interface DirectoryPickerWindow extends Window {
  showDirectoryPicker?: (options: { id: string; mode: "readwrite" }) => Promise<LocalDirectoryHandle>;
}

const DATABASE_NAME = "examinai-browser-settings";
const STORE_NAME = "handles";
const DIRECTORY_KEY = "local-history-directory";
const DIRECTORY_NAME_KEY = "examinai-local-history-directory-name-v1";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readDirectoryHandle(): Promise<LocalDirectoryHandle | null> {
  try {
    const database = await openDatabase();
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).get(DIRECTORY_KEY);
      request.onsuccess = () => resolve((request.result as LocalDirectoryHandle | undefined) ?? null);
      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => database.close();
    });
  } catch {
    return null;
  }
}

async function writeDirectoryHandle(handle: LocalDirectoryHandle | null) {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = handle ? store.put(handle, DIRECTORY_KEY) : store.delete(DIRECTORY_KEY);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
  });
}

export function isLocalHistoryDirectorySupported() {
  return typeof window !== "undefined" && typeof (window as DirectoryPickerWindow).showDirectoryPicker === "function";
}

export function getLocalHistoryDirectoryName() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(DIRECTORY_NAME_KEY) ?? "";
}

export async function selectLocalHistoryDirectory(): Promise<LocalHistoryDirectoryStatus> {
  const picker = (window as DirectoryPickerWindow).showDirectoryPicker;
  if (!picker) return "unsupported";

  try {
    const handle = await picker({ id: "examinai-history", mode: "readwrite" });
    await writeDirectoryHandle(handle);
    window.localStorage.setItem(DIRECTORY_NAME_KEY, handle.name);
    return "saved";
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return "unavailable";
    return "permission-denied";
  }
}

export async function clearLocalHistoryDirectory() {
  window.localStorage.removeItem(DIRECTORY_NAME_KEY);
  try {
    await writeDirectoryHandle(null);
  } catch {
    // The visible browser-local setting has still been cleared.
  }
}

export async function saveJsonToLocalHistoryDirectory(
  fileName: string,
  content: string,
): Promise<LocalHistoryDirectoryStatus> {
  const directory = await readDirectoryHandle();
  if (!directory) return "unavailable";

  try {
    const options = { mode: "readwrite" as const };
    let permission = await directory.queryPermission?.(options);
    if (permission !== "granted" && directory.requestPermission) {
      permission = await directory.requestPermission(options);
    }
    if (permission && permission !== "granted") return "permission-denied";

    const file = await directory.getFileHandle(fileName, { create: true });
    const writable = await file.createWritable();
    await writable.write(content);
    await writable.close();
    return "saved";
  } catch {
    return "permission-denied";
  }
}
