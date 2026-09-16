/**
 * shareUrl — the v2 Share link: the WORKING gradient's stops in the page URL
 * (plans/ge-v2-design.md §5.8 / §13 item 1; owner 2026-09-06 "connect the elements that
 * aren't hooked up yet").
 *
 * `?g=<base64url JSON>` carrying `{ v: 1, n: name, b: blendSpace, c: colorSpace, s: [[position,
 * "#hex", interpolation?, bias?], …] }`. The gradient only — the palette rule / count is a
 * viewer preference and does not ride the link (§10 open, resolved the simple way). The
 * decoder runs the shared `coerceGradientConfig` gate, so a tampered link yields null, never
 * a throw. Pure: no DOM except in the two `location` helpers at the bottom.
 *
 * A RAMP gradient (ADR-0122) rides the same v1 wire as `s: []` plus `r: <ramp string>`. A
 * stop gradient's wire is byte-identical to before ramps (no `r`, even when a stale `ramp`
 * rides the config), so every link already shared still decodes and re-encodes the same. An
 * older build handed a ramp link reaches its gate with no stops and opens nothing (null) —
 * which `shareOpensFrom` reads as "not a link", so that tab falls back to its session rather
 * than an empty shell. Cost: the ramp is base64 inside base64url, ~1.4 KB of URL against the
 * ~100 characters of a two-stop link — under the 2 KB a link can safely be.
 *
 * @invariant encode → decode is the identity on stops (colour · interpolation · bias to 4
 *   decimals · position to 4 decimals or finer), name, blend space and colour space; on a ramp
 *   gradient it is the identity on the ramp string; a stop gradient's wire carries no ramp; and
 *   decode of anything else is null — proven by: `npx tsx debug/test-gx-share.mts` ("round trip
 *   keeps every stop field", "garbage decodes to null", "[6] a ramp gradient round-trips
 *   byte-exact", "[6] a stop gradient's link is unchanged by a stale ramp"). [6] falsified
 *   2026-09-14, see the harness.
 * @invariant a decoded stop is on the same side of every ramp sample (`i / 255`) as the stop
 *   that was encoded, so a step gradient's link renders texel-identical; a position that 4
 *   decimals already keep on its side is written as 4 decimals (links for ordinary gradients do
 *   not change); and a link written by the 4-decimal encoder still decodes — proven by:
 *   `npx tsx debug/test-gx-share.mts` ("[7] every step edge renders the same texels after
 *   decode", "[7] an ordinary gradient's link is the 4-decimal link", "[7] a link from the
 *   4-decimal encoder still decodes"). Falsified 2026-09-14, see the harness header.
 */

import type { GradientConfig, GradientStop } from '../../types';
import { coerceGradientConfig } from '../../palette/core/editorConfig';
import { isRampGradient } from '../../utils/gradientRamp';

export const SHARE_PARAM = 'g';

/** `r` — the ramp string of a RAMP gradient, present only when `s` is empty (ADR-0122). */
type Wire = { v: 1; n: string; b?: string; c?: string; s: (string | number)[][]; r?: string };

const b64url = {
  enc: (s: string): string => {
    const bytes = new TextEncoder().encode(s);
    let bin = '';
    for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  },
  dec: (s: string): string | null => {
    try {
      const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
      const bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
      return new TextDecoder().decode(bytes);
    } catch {
      return null;
    }
  },
};

const rd = (x: number, d: number): number => Math.round(x * 10 ** d) / 10 ** d;
const r4 = (x: number): number => rd(x, 4);

/** How many of the 256 ramp samples (`i / 255`) sit AT OR BELOW `p`. `sampleSorted` gives a
 *  sample exactly at a stop's position to the segment on its LEFT, so this count is which side
 *  of every sample the stop is on — the thing a step edge cannot survive changing. */
const samplesAtOrBelow = (p: number): number => {
  let c = Math.floor(p * 255);
  if (c < 0) return p >= 0 ? 1 : 0;
  if (c > 255) return 256;
  while (c + 1 <= 255 && (c + 1) / 255 <= p) c++;
  while (c >= 0 && c / 255 > p) c--;
  return c + 1;
};

/**
 * A stop position for the wire: 4 decimals — what every link shared before 2026-09-14 carried,
 * so an ordinary gradient's link is byte-identical — unless rounding would move the stop across
 * a ramp sample. Then the fewest decimals (up to 12) that keep it on the same side, else the
 * exact double.
 *
 * Why: a STEP stop's edge is a discontinuity at a sample. The corpus's 12-band step gradient has
 * an edge at 4/12 = 85/255 exactly; 4 decimals wrote 0.3333, below the sample, and texel 85
 * changed band on decode (ΔE 0.279, `debug/test-gradient-roundtrip.mts` row D). Measured
 * 2026-09-14: 1 random position in ~166 needs more than 4 decimals, but 125 of the 256 positions
 * that sit exactly ON a sample do — the ones snapped and evenly divided stops produce. Bias has no
 * discontinuity and stays at 4.
 */
const wirePosition = (p: number): number => {
  if (!Number.isFinite(p)) return r4(p);
  const side = samplesAtOrBelow(p);
  const q4 = r4(p);
  if (samplesAtOrBelow(q4) === side) return q4;
  for (let d = 5; d <= 12; d++) {
    const q = rd(p, d);
    if (samplesAtOrBelow(q) === side) return q;
  }
  return p;
};

export const encodeShare = (config: GradientConfig, name: string): string => {
  const wire: Wire = {
    v: 1,
    n: name,
    s: config.stops.map((st) => {
      const row: (string | number)[] = [wirePosition(st.position), st.color];
      const interp = st.interpolation ?? 'linear';
      const bias = st.bias ?? 0.5;
      if (interp !== 'linear' || bias !== 0.5) row.push(interp);
      if (bias !== 0.5) row.push(r4(bias));
      return row;
    }),
  };
  if (config.blendSpace) wire.b = config.blendSpace;
  if (config.colorSpace) wire.c = config.colorSpace;
  // Stops win: `r` only when there are none, so a stop gradient's link never grows.
  if (isRampGradient(config)) wire.r = config.ramp;
  return b64url.enc(JSON.stringify(wire));
};

export const decodeShare = (code: string): { config: GradientConfig; name: string } | null => {
  const json = b64url.dec(code);
  if (!json) return null;
  let w: unknown;
  try {
    w = JSON.parse(json);
  } catch {
    return null;
  }
  if (!w || typeof w !== 'object') return null;
  const o = w as Partial<Wire>;
  if (o.v !== 1 || !Array.isArray(o.s)) return null;
  const stops: Partial<GradientStop>[] = [];
  for (let i = 0; i < o.s.length; i++) {
    const row = o.s[i];
    if (!Array.isArray(row) || typeof row[0] !== 'number' || typeof row[1] !== 'string') return null;
    const st: Partial<GradientStop> = { id: `s${i}`, position: row[0], color: row[1] };
    if (typeof row[2] === 'string') st.interpolation = row[2] as GradientStop['interpolation'];
    if (typeof row[3] === 'number') st.bias = row[3];
    stops.push(st);
  }
  // A ramp link: no stop rows and a ramp. The gate validates the ramp string; a row list AND
  // a ramp is a stop gradient (stops win), so `r` is not even passed then.
  const ramp = stops.length === 0 ? o.r : undefined;
  const config = coerceGradientConfig({ stops, blendSpace: o.b, colorSpace: o.c, ...(ramp !== undefined ? { ramp } : {}) });
  if (!config) return null;
  return { config, name: typeof o.n === 'string' && o.n.trim() ? o.n : 'Shared gradient' };
};

/**
 * The preview address the v2 shell had until the entry-point swap (2026-09-16) — the last path
 * segment, with or without `.html` (Cloudflare serves both). That page is now an ALIAS of
 * `gradient-explorer.html`, kept so links shared from it keep opening.
 */
const ALIAS_PAGE = /\/gradient-explorer-next(\.html)?$/;

/**
 * The full link for the current page — always written on the CANONICAL page: opened through
 * the alias, the link names `gradient-explorer.html` (or `gradient-explorer` under a pretty
 * URL) in the same directory, so the alias never gains new links.
 */
export const shareUrlFor = (config: GradientConfig, name: string): string => {
  const u = new URL(window.location.href);
  u.pathname = u.pathname.replace(ALIAS_PAGE, '/gradient-explorer$1');
  u.search = '';
  u.hash = '';
  u.searchParams.set(SHARE_PARAM, encodeShare(config, name));
  return u.toString();
};

/**
 * Does this query string carry a share link that OPENS? Asked BEFORE the shell renders (and
 * so before `takeShareFromLocation` strips it) by the session restore: a share link WINS
 * over the autosaved session on that load (gradient-explorer/v2/session.ts). Validity, not
 * mere presence — a truncated or tampered link opens nothing, and then yesterday's session
 * is the better thing to show than an empty shell.
 */
export const shareOpensFrom = (search: string): boolean => {
  const code = new URLSearchParams(search).get(SHARE_PARAM);
  return !!code && decodeShare(code) !== null;
};

/** Read (and strip) a share link from the current location, once, on boot. */
export const takeShareFromLocation = (): { config: GradientConfig; name: string } | null => {
  const u = new URL(window.location.href);
  const code = u.searchParams.get(SHARE_PARAM);
  if (!code) return null;
  u.searchParams.delete(SHARE_PARAM);
  try {
    window.history.replaceState(null, '', u.toString());
  } catch {
    /* a sandboxed page cannot rewrite its URL; the link still opens */
  }
  return decodeShare(code);
};

/** The query value `openGradientExplorer` (palette/installFavients.ts) appends as `?from=`. */
export const FROM_GMT = 'gmt';

/**
 * Pure: was a page at `href` opened FROM the GMT studio? `?from=gmt` is the signal (what
 * app-gmt's `openGradientExplorer` appends, 2026-09-13); a same-origin referrer on the
 * studio's own entry is the fallback, for an Explorer tab opened some other way.
 *
 * The studio's entry is `/` in production (app.gmt-fractals.com serves app-gmt at the root)
 * and `/app-gmt` under Cloudflare's pretty URLs, as well as `/app-gmt.html` on a dev server
 * — the fallback used to match only the last, so it could never pass in production, and
 * nothing appended the param either (the parity checklist's swap risk 2). The Explorer's own
 * pages are never the root, so matching `/` cannot mistake a reload for the studio.
 */
export const cameFromGmtFor = (href: string, referrer: string): boolean => {
  try {
    const here = new URL(href);
    if (here.searchParams.get('from') === FROM_GMT) return true;
    if (!referrer) return false;
    const ru = new URL(referrer);
    return ru.origin === here.origin && /^\/(app-gmt(\.html)?)?$/.test(ru.pathname);
  } catch {
    return false;
  }
};

/**
 * True when this page was opened from the GMT studio (`cameFromGmtFor` on this page). Read
 * once at module load. The `?from` param survives `takeShareFromLocation`'s rewrite (it
 * deletes only its own param), so a reload keeps the link.
 */
export const cameFromGmt = typeof window === 'undefined' ? false : cameFromGmtFor(window.location.href, document.referrer);
