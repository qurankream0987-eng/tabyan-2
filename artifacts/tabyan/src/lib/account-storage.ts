export interface AccountKeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

export function accountStorageKey(accountId: string, key: string): string {
  return `tabyan.account.${encodeURIComponent(accountId)}.${key}`;
}

function browserStorage(): AccountKeyValueStorage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readAccountStorage(
  accountId: string | null,
  key: string,
  storage: AccountKeyValueStorage | null = browserStorage(),
): string | null {
  if (!accountId || !storage) return null;
  try {
    return storage.getItem(accountStorageKey(accountId, key));
  } catch {
    return null;
  }
}

export function writeAccountStorage(
  accountId: string | null,
  key: string,
  value: string,
  storage: AccountKeyValueStorage | null = browserStorage(),
): void {
  if (!accountId || !storage) return;
  try {
    storage.setItem(accountStorageKey(accountId, key), value);
  } catch {
    // Local persistence is optional; it must not block reading.
  }
}

export function removeAccountStorage(
  accountId: string | null,
  key: string,
  storage: AccountKeyValueStorage | null = browserStorage(),
): void {
  if (!accountId || !storage?.removeItem) return;
  try {
    storage.removeItem(accountStorageKey(accountId, key));
  } catch {
    // Local persistence is optional; it must not block account transitions.
  }
}
