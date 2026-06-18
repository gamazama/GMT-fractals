/**
 * storage — tiny localStorage helpers shared by the palette persistence modules
 * (favientsStore, favientsPanelPersist, paletteFiltersPersist). The low-level
 * access guard lives in engine-core (`store/safeLocalStorage.ts`); these are the
 * palette-named string/JSON accessors built on it.
 */

import { safeLocalGet, safeLocalSet, safeLocalRemove } from '../../store/safeLocalStorage';

export const lsGet = (key: string): string | null => safeLocalGet(key);
export const lsSet = (key: string, value: string): void => safeLocalSet(key, value);
export const lsRemove = (key: string): void => safeLocalRemove(key);

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
