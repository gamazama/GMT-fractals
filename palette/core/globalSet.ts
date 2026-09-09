/**
 * globalSet — the GX GLOBAL set: gradients everyone using the app sees, fetched rather
 * than kept (owner, 2026-09-09: "a 'GX global' group that is a shared resource between
 * anyone that uses the app").
 *
 * READ-ONLY, and deliberately so for now. Making it writable is not a hookup — it needs a
 * signed-in user, and the Gradient Explorer's own bundle has no auth in it at all (the
 * whole Supabase + auth stack this project already ships is mounted only by app-gmt). It
 * also needs answers the code cannot supply: moderation of the free-text NAME field, what a
 * duplicate submission means, who decides the ORDER when no user owns it, and a size cap.
 * None of that is blocked by this file — the transport is one function and swapping it for
 * a Supabase query changes nothing above it.
 *
 * NOT PART OF THE SHELF. These gradients never enter `favients`, are never written to
 * `gmt.favients`, and are therefore invisible to the collection export, the scene document,
 * undo, and the other three apps that share that key. The whole safety argument rests on
 * that one line, plus `itemOf` omitting `favId` in `useGroundSource` — a tile with no
 * `favId` already reads as "not yours" everywhere in the app, so the trash refuses it, a
 * drag files a COPY rather than moving it, and Delete has nothing to remove. It is the
 * catalogue's own contract, reused.
 *
 * Transport follows `catalogLoader`: CDN first, the shipped local copy as a fallback. The
 * local copy is not optional — `cdn.gmt-fractals.com` does NOT send CORS headers to
 * `dev.gmt-fractals.com` or to `localhost:3499` (measured; see HANDOFF.md), and the
 * licensed packs' missing local fallback is exactly why a /dev walk silently loses 11,131
 * gradients. A brand-new feature should not repeat that.
 *
 * @assumption the payload is small enough to render on the main thread when the set is
 *   selected. `favientsToEntries` runs `renderStopsToRamp` + `computeFacets` per entry,
 *   and `groundSets`' body cache clears wholesale past 4,000 entries. Comfortable to a
 *   couple of thousand; unbounded is not. If this set is ever meant to be large, ship it in
 *   `bake-palette-catalog`'s pre-baked ramp+facet format instead of stops.
 * @see palette/core/catalogLoader.ts (the fetch pattern this follows)
 * @see palette/store/globalSetStore.ts (the React binding)
 */

import type { GradientConfig } from '../../types';
import type { Favient } from '../store/favientsStore';
import { PALETTE_CDN_BASE, PALETTE_LOCAL_BASE } from './catalogLoader';

/** The file, on both bases. */
const FILE = 'gxglobal.json';

/** Reserved id prefix, so a global gradient can never be confused with a shelf one. */
export const GLOBAL_ID_PREFIX = 'gx-global:';

/** The wire shape. Deliberately the stops document, so a curator can hand-write one. */
interface WireItem {
  id?: string;
  name?: string;
  config?: GradientConfig;
}
interface WireFile {
  version?: number;
  items?: WireItem[];
}

const isConfig = (c: unknown): c is GradientConfig =>
  !!c && typeof c === 'object' && Array.isArray((c as GradientConfig).stops) && (c as GradientConfig).stops.length > 0;

/**
 * Validate and normalise the payload. Untrusted input: anything malformed is dropped, and
 * nothing here throws — a broken file must leave the chip empty, never break the shell.
 */
export const parseGlobalSet = (raw: unknown): Favient[] => {
  const items = (raw as WireFile | null)?.items;
  if (!Array.isArray(items)) return [];
  const out: Favient[] = [];
  const seen = new Set<string>();
  items.forEach((it, i) => {
    if (!it || !isConfig(it.config)) return;
    const id = `${GLOBAL_ID_PREFIX}${typeof it.id === 'string' && it.id ? it.id : i}`;
    if (seen.has(id)) return;
    seen.add(id);
    out.push({
      id,
      name: typeof it.name === 'string' && it.name.trim() ? it.name.trim().slice(0, 64) : `Gradient ${i + 1}`,
      source: 'GX global',
      config: it.config,
      createdAt: 0,
      // No group: it is not in any shelf group, and nothing may file it into one.
      group: undefined,
    });
  });
  return out;
};

/** Fetch it, CDN first, then the copy shipped in `public/palette/`. Never throws. */
export const loadGlobalSet = async (): Promise<Favient[]> => {
  for (const base of [PALETTE_CDN_BASE, PALETTE_LOCAL_BASE]) {
    try {
      const r = await fetch(`${base}${FILE}`);
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      return parseGlobalSet(await r.json());
    } catch (err) {
      // The CDN one is expected to fail on origins that are not on its allowlist; only say
      // something when there is nothing left to try.
      if (base === PALETTE_LOCAL_BASE) console.warn('[gx-global] could not load the shared set', err);
    }
  }
  return [];
};
