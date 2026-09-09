/**
 * bake-gx-global — write the GX GLOBAL set's payload.
 *
 * The shared set is a plain JSON file of stops documents, fetched at boot by
 * `palette/core/globalSet.ts` (CDN first, `public/palette/` as the fallback that makes dev
 * and the /dev preview work — `cdn.gmt-fractals.com` sends no CORS headers to
 * `dev.gmt-fractals.com` or `localhost:3499`).
 *
 * It is a FILE and not a database on purpose, for now: making the set writable needs a
 * signed-in user, and the Gradient Explorer's bundle has no auth in it at all. Swapping the
 * transport for a Supabase query later changes `globalSet.ts` and nothing above it.
 *
 * Curating: edit `PICKS` below, run `npx tsx debug/bake-gx-global.mts`, then upload the
 * result to `cdn.gmt-fractals.com/palette/` as well, or the CDN copy goes stale and every
 * origin that CAN reach the CDN sees the old set while dev sees the new one.
 *
 *   npx tsx debug/bake-gx-global.mts
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { GRADIENT_PRESETS } from '../data/gradientPresets';

/** The starter selection, by preset name. A curator's list, not an algorithm's. */
const PICKS = [
  'Spectrum', 'Turbo', 'Inferno', 'Plasma', 'Viridis',
  'Cosmic Energy', 'Lava Lamp', 'Deep Ocean', 'Neon Cyber', 'Aurora Strata',
  'Kindlmann', 'Cool Warm', 'Black Body', 'Rainbow Full', 'Cosine Rainbow',
  'Warm Sunset', 'Cool Forest', 'Earth Tones', 'Pastel Dreams', 'Spring Floral',
];

const byName = new Map(GRADIENT_PRESETS.map((p) => [p.name, p]));
const missing = PICKS.filter((n) => !byName.has(n));
if (missing.length) console.warn(`[bake-gx-global] not in GRADIENT_PRESETS, skipped: ${missing.join(', ')}`);

const items = PICKS.filter((n) => byName.has(n)).map((n) => {
  const p = byName.get(n)!;
  return {
    id: n.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name: p.name,
    config: { stops: p.stops, colorSpace: 'srgb', blendSpace: 'oklab' },
  };
});

const out = resolve(dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '../public/palette/gxglobal.json');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ version: 1, items }, null, 0), 'utf-8');
console.log(`[bake-gx-global] ${items.length} gradients -> ${out}`);
