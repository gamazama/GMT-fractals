/**
 * globalSet — the GX GLOBAL set: gradients everyone using the app sees, fetched rather
 * than kept (owner, 2026-09-09: "a 'GX global' group that is a shared resource between
 * anyone that uses the app").
 *
 * OPEN, with no sign-in: anyone can read it and anyone can add to it (owner, 2026-09-09 —
 * "we will need this to be totally open with no sign in for it to succeed"). Both halves are
 * a plain `fetch` against ONE anonymous Edge Function, `gx-gradients`, which holds the
 * service role; the table itself has RLS on with no policies at all, so PostgREST is shut.
 *
 * That is why the read is a GET on the function rather than a select policy: this bundle
 * contains no supabase-js and no auth, and the feature depends on keeping it that way. A
 * select policy would mean an anon-key client in a page that has never had one.
 * `engine-gmt/feedback` already POSTs anonymously from this same bundle with a bare fetch,
 * which is the proof the shape works here.
 *
 * WHAT STANDS IN FOR A LOGIN, since there is not one: no names (a gradient carries no text,
 * so there is nothing to moderate — the one problem this codebase has no answer for on an
 * anonymous path); no duplicates, hashed and enforced SERVER-side so a client cannot claim a
 * signature; an hourly per-IP cap and a separate cap on the whole set. See the migration
 * `backend/supabase/migrations/0005_gx_gradients.sql`, which explains each.
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

/** The shared endpoint — GET the set, POST one to it. Hardcoded, as every other
 *  function URL in this app is (grep SUBMIT_URL / SHARE_URL). */
const ENDPOINT = 'https://ehoacsxzeruhajosexzb.supabase.co/functions/v1/gx-gradients';

/** The starter set, shipped in `public/palette/`. Read when the endpoint cannot be. */
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

/**
 * Fetch the set: the live endpoint first, then the CDN copy, then the one shipped in
 * `public/palette/`. Never throws — an empty chip is the failure mode, never a broken
 * shell, which is the contract `globalSetStore` and `parseGlobalSet` both hold.
 *
 * The shipped copy is not decoration. `cdn.gmt-fractals.com` sends no CORS headers to
 * `dev.gmt-fractals.com` or `localhost:3499`, and the Edge Function's own allowlist is a
 * config line that can be forgotten on a deploy; the licensed packs' missing local fallback
 * is exactly why a /dev walk silently loses 11,131 gradients today. So there is always
 * something to show.
 */
export const loadGlobalSet = async (): Promise<Favient[]> => {
  try {
    const r = await fetch(ENDPOINT, { headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    const items = parseGlobalSet(await r.json());
    if (items.length) return items;
    // A reachable but EMPTY set is a real answer (nobody has contributed yet), not a
    // failure — but fall through to the starter file so a fresh deploy is not blank.
  } catch (err) {
    console.warn('[gx-global] the shared endpoint is unreachable; falling back to the shipped set', err);
  }
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

export class GlobalSetError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
    this.name = 'GlobalSetError';
  }
}

export interface SubmitResult {
  ok: true;
  /** False when that gradient was already in the set — a success, not a failure. */
  added: boolean;
  id: string | null;
}

/**
 * Contribute one gradient to the shared set. No account, no name — the stops and the two
 * colour spaces, nothing else. The server canonicalises and hashes them to decide whether
 * it is already in there, so an identical gradient submitted twice is `added: false` rather
 * than an error, and costs no quota.
 *
 * Throws `GlobalSetError` with the server's own message on a refusal, following
 * `FeedbackClient` / `sharedScene` — the three of them share this error shape.
 */
export const submitToGlobalSet = async (config: GradientConfig): Promise<SubmitResult> => {
  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: { stops: config.stops, colorSpace: config.colorSpace, blendSpace: config.blendSpace } }),
    });
  } catch {
    throw new GlobalSetError('Could not reach the shared set — check your connection.', 0);
  }
  if (!res.ok) {
    let msg = `Could not add it (${res.status})`;
    let code: string | undefined;
    try {
      const j = await res.json();
      if (j?.error) msg = j.error;
      if (j?.code) code = j.code;
    } catch {
      /* non-JSON */
    }
    throw new GlobalSetError(msg, res.status, code);
  }
  return (await res.json()) as SubmitResult;
};
