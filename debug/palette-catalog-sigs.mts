/**
 * palette-catalog-sigs — WHICH HASHES one catalogue entry contributes to the GX Global refusal
 * list, and how to read the ramps back out of the packs on disk. Shared by the bake
 * (`debug/bake-palette-catalog.mts`, full and `--sigs-only`) and the licensing harness, so the
 * list the harness checks is built by the rule the bake writes with.
 *
 * Per entry, up to two hashes (`palette/core/catalogSigs.ts` explains the canonical forms):
 *   1. THE PICK: `catalogHashOf(entryToGradientConfig(entry))` — what a wall pick sends today.
 *      A ramp gradient for a dense entry (ADR-0122), a stop gradient otherwise.
 *   2. THE LEGACY PICK: `catalogHashOf` of the entry's 128-stop fit at ΔE 0.02 — what a pick sent
 *      before ADR-0122 (2026-09-14). It stays in the list because that fit is still out there:
 *      favourites saved before the change hold it, a tab still running the old build sends it,
 *      and rows contributed earlier are hidden from the GET by it. Dropping it would let an
 *      unedited catalogue gradient into GX Global through an old shelf, and would put back on the
 *      GET rows that were filtered out. Where the two fits agree the Set dedupes them.
 *
 * Measured 2026-09-14 over the six packs on disk (11,131 entries): the legacy hashes alone are
 * EXACTLY the pre-ADR list (11,129 unique = HEAD's catalog-sigs.json); 1,984 entries became ramp
 * gradients (Softology 1,895); and 22 cpt-city entries that stayed stops fit to DIFFERENT stops
 * than before — the fitter is budget-dependent (maxStops 49 vs 128) even when it finishes under
 * the smaller budget — so their pick hash is new and their legacy hash is kept beside it.
 */

import fs from 'fs';
import zlib from 'zlib';
import { entryToGradientConfig } from '../palette/core/gradientSeam';
import { fitRampToStops, bufferToRamp } from '../palette/core/stopFit';
import { catalogHashOf } from '../palette/core/catalogSigs';
import { isRampGradient } from '../utils/gradientRamp';
import type { CatalogEntry } from '../palette/core/presetCatalog';

/** The seam's fit before ADR-0122 (gradientSeam's SEAM_MAX_STOPS, ΔE 0.02). Frozen: this is a
 *  record of what old builds sent, not a knob. */
export const LEGACY_SEAM_FIT = { targetDE: 0.02, maxStops: 128 } as const;

export interface EntrySigs {
  /** The hash of what a pick sends today. */
  pick: string | null;
  /** The hash of the pre-ADR-0122 128-stop fit. */
  legacy: string | null;
  /** The pick is a ramp gradient. */
  ramp: boolean;
}

/** The hashes one entry contributes, from its 256-texel RGBA ramp (`CatalogEntry.ramp`). */
export const entrySigsOf = (rgba: Uint8Array): EntrySigs => {
  const cfg = entryToGradientConfig({ id: '', name: '', ramp: rgba, row: 0 } as CatalogEntry);
  const pick = catalogHashOf(cfg);
  const legacy = catalogHashOf(fitRampToStops(bufferToRamp(rgba), LEGACY_SEAM_FIT));
  return { pick, legacy, ramp: isRampGradient(cfg) };
};

/** Every hash of one entry, for the list. */
export const entryHashes = (s: EntrySigs): string[] => [s.pick, s.legacy].filter((h): h is string => !!h);

/** Undo the bake's Sub filter on one pack's `.bin.gz`: N × 256 RGBA ramps (alpha 255). */
export const readPackRamps = (binGzPath: string): Uint8Array[] => {
  const f = zlib.gunzipSync(fs.readFileSync(binGzPath));
  if (f.length % 768 !== 0) throw new Error(`${binGzPath}: ${f.length} bytes is not a whole number of 768-byte ramps`);
  const out: Uint8Array[] = [];
  for (let off = 0; off < f.length; off += 768) {
    const rgba = new Uint8Array(1024);
    let r = 0, g = 0, b = 0;
    for (let k = 0; k < 256; k++) {
      r = (r + f[off + k * 3]) & 255;
      g = (g + f[off + k * 3 + 1]) & 255;
      b = (b + f[off + k * 3 + 2]) & 255;
      rgba[k * 4] = r; rgba[k * 4 + 1] = g; rgba[k * 4 + 2] = b; rgba[k * 4 + 3] = 255;
    }
    out.push(rgba);
  }
  return out;
};
