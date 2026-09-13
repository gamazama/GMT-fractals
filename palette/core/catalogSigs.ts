/**
 * catalogSigs — "is this gradient one of the catalogue's, unedited?" for GX GLOBAL.
 *
 * Owner, 2026-09-13: "GX Global has no names, and shouldn't accept duplicates from the repo."
 * An unedited catalogue gradient carries somebody else's licence and attribution, and GX
 * Global carries neither, so the shared set refuses one. Two locks, same as the set's own
 * dedupe: the client refuses before it asks (`gradient-explorer/v2/contributeToGlobal.ts`),
 * the server refuses regardless (`backend/supabase/functions/gx-gradients/validate.ts`).
 *
 * WHAT A SIGNATURE IS. The server's canonical form, computed from the stops a pick would
 * actually send: `entryToGradientConfig(entry)` — the fit every wall pick, drag and "Keep
 * these N" goes through — then canonicalised exactly as `gx-gradients` canonicalises a POST
 * (positions rounded to 1/1000, hex expanded and upper-cased, interpolation reduced to
 * step / linear, sorted by position), then hashed to 16 hex characters. The bake
 * (`debug/bake-palette-catalog.mts`) writes one sorted hash per survivor of EVERY pack —
 * core, the CDN packs, the optional packs and the unpublished one — to
 * `public/palette/catalog-sigs.json` and the same list to the function's `catalog-sigs.ts`.
 * A hash, not the stops: the list must not be a way to fetch gradients that are not published.
 *
 * MIRRORED, NOT SHARED. The backend repo must not import the GPL client, and this bundle
 * cannot import the backend, so the canonicaliser exists twice. The harness
 * `debug/test-palette-catalog-licensing.mts` imports BOTH and compares them over a corpus —
 * that comparison, not this comment, is what keeps them equal.
 *
 * @invariant `canonicalSigOf` equals the backend's `canonicalise(...).sig` and `gxSigHash`
 *   equals its `sigHash` on every config the harness corpus holds — proven by:
 *   `npx tsx debug/test-palette-catalog-licensing.mts` ("client and server canonicalise
 *   identically"). Falsified 2026-09-13 by dropping `.toUpperCase()` here.
 * @assumption The fit is bit-identical between the bake (node/V8) and the browser. True in
 *   V8 by construction; JavaScriptCore/SpiderMonkey may differ by an ULP in `Math.cbrt` /
 *   `Math.pow`, which rounding to 8-bit hex and 1/1000 positions absorbs almost always, but
 *   nothing proves always. A miss means one catalogue gradient slips past the check.
 */

import type { GradientConfig } from '../../types';

export interface CanonicalStop {
  position: number;
  color: string;
  interpolation: 'step' | 'linear';
}

/** `#abc` / `#aabbcc` → `#AABBCC`; anything else → null. Mirrors the server's `normHex`. */
export const normHex = (raw: unknown): string | null => {
  const s = String(raw ?? '').trim().toUpperCase();
  const hexOk = (t: string) => t.length > 0 && [...t].every((ch) => (ch >= '0' && ch <= '9') || (ch >= 'A' && ch <= 'F'));
  if (s.length === 4 && s[0] === '#' && hexOk(s.slice(1))) return `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`;
  if (s.length === 7 && s[0] === '#' && hexOk(s.slice(1))) return s;
  return null;
};

/**
 * The canonical signature of a stops list, or null when the server would refuse the stops
 * outright (a bad colour or position). NO count limit here: the catalogue fits up to 128
 * stops, and the server's 2..64 check answers those before the catalogue check does.
 */
export const canonicalSigOf = (stops: unknown): string | null => {
  if (!Array.isArray(stops) || stops.length === 0) return null;
  const out: CanonicalStop[] = [];
  for (const s of stops as { position?: unknown; color?: unknown; interpolation?: unknown }[]) {
    const pos = Number(s?.position);
    if (!Number.isFinite(pos) || pos < 0 || pos > 1) return null;
    const color = normHex(s?.color);
    if (!color) return null;
    out.push({ position: Math.round(pos * 1000) / 1000, color, interpolation: String(s?.interpolation ?? 'linear') === 'step' ? 'step' : 'linear' });
  }
  out.sort((a, b) => a.position - b.position);
  return out.map((s) => `${Math.round(s.position * 1000)}:${s.color}:${s.interpolation === 'step' ? 's' : 'l'}`).join('|');
};

/** 64-bit string hash (two 32-bit multiply-xorshift lanes, cyrb53's mixer), 16 hex chars.
 *  Mirrors the server's `sigHash`. */
export const gxSigHash = (str: string): string => {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
};

/** The hash of a config's canonical signature, or null when it has none. */
export const catalogHashOf = (config: GradientConfig | null | undefined): string | null => {
  const sig = canonicalSigOf(config?.stops);
  return sig ? gxSigHash(sig) : null;
};

export const CATALOG_SIGS_FILE = 'catalog-sigs.json';
export const CATALOG_SIGS_VERSION = 1;

export interface CatalogSigsFile {
  version: number;
  algo: string;
  count: number;
  /** Concatenated 16-hex hashes, sorted — one string so the file is a few flat bytes. */
  hashes: string;
}

/** Parse the file into a Set; a malformed file is an empty set (never throws). */
export const parseCatalogSigs = (raw: unknown): Set<string> => {
  const f = raw as Partial<CatalogSigsFile> | null;
  if (!f || f.version !== CATALOG_SIGS_VERSION || typeof f.hashes !== 'string' || f.hashes.length % 16 !== 0) return new Set();
  const out = new Set<string>();
  for (let i = 0; i < f.hashes.length; i += 16) out.add(f.hashes.slice(i, i + 16));
  return out;
};

export const packCatalogSigs = (hashes: Iterable<string>): CatalogSigsFile => {
  const sorted = [...new Set(hashes)].sort();
  return { version: CATALOG_SIGS_VERSION, algo: 'canonical-stops/cyrb64', count: sorted.length, hashes: sorted.join('') };
};

let _sigs: Promise<Set<string>> | null = null;

/**
 * The catalogue signature set, fetched once from the always-shipped local base (it lists
 * every pack, loaded or not, so a pack the user never opened is covered too). A failed
 * fetch resolves to an EMPTY set and is retried next time — the server still refuses, so
 * a missing file must not block a contribution the client cannot judge.
 */
export const loadCatalogSigs = (base: string): Promise<Set<string>> => {
  if (!_sigs) {
    _sigs = fetch(`${base}${CATALOG_SIGS_FILE}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(parseCatalogSigs)
      .then((set) => {
        if (!set.size) _sigs = null;
        return set;
      })
      .catch(() => {
        _sigs = null;
        return new Set<string>();
      });
  }
  return _sigs;
};
