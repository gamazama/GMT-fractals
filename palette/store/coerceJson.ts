/**
 * Tiny fail-safe coercers for restoring NON-DDFS document snapshots out of untrusted
 * scene files (the document-provider `restore` paths). Each returns the fallback rather
 * than letting a missing / wrong-typed / non-finite value through. Shared by the
 * generator + image document bridges (and any future document provider).
 */

/** A finite number, or the fallback. */
export const num = (v: unknown, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback;

/** A boolean, or the fallback. */
export const bool = (v: unknown, fallback: boolean): boolean =>
  typeof v === 'boolean' ? v : fallback;

/** A string, or null (the absent-field sentinel for document snapshots). */
export const str = (v: unknown): string | null => (typeof v === 'string' ? v : null);

/** True when `v` is a plain (non-array) object — the shape every snapshot must be. */
export const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
