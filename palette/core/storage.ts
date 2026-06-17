/**
 * storage — tiny localStorage helpers shared by the palette persistence modules
 * (favientsStore, favientsPanelPersist, paletteFiltersPersist). Each guards against
 * unavailable / quota-exceeded storage, so callers don't repeat the try/catch.
 */

const ok = (): boolean => {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
};

export const lsGet = (key: string): string | null => {
  try {
    return ok() ? window.localStorage.getItem(key) : null;
  } catch {
    return null;
  }
};

export const lsSet = (key: string, value: string): void => {
  try {
    if (ok()) window.localStorage.setItem(key, value);
  } catch {
    /* quota / disabled */
  }
};

export const lsRemove = (key: string): void => {
  try {
    if (ok()) window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
};

/** Parse JSON from a key, returning `fallback` on missing/malformed data. */
export const lsGetJson = <T>(key: string, fallback: T): T => {
  const raw = lsGet(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export const lsSetJson = (key: string, value: unknown): void => lsSet(key, JSON.stringify(value));
