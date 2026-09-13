/**
 * shareUrl — the v2 Share link: the WORKING gradient's stops in the page URL
 * (plans/ge-v2-design.md §5.8 / §13 item 1; owner 2026-09-06 "connect the elements that
 * aren't hooked up yet").
 *
 * `?g=<base64url JSON>` carrying `{ v: 1, n: name, b: blendSpace, c: colorSpace, s: [[position,
 * "#hex", interpolation?, bias?], …] }`. Stops only — the palette rule / count is a viewer
 * preference and does not ride the link (§10 open, resolved the simple way). The decoder
 * runs the shared `coerceGradientConfig` gate, so a tampered link yields null, never a
 * throw. Pure: no DOM except in the two `location` helpers at the bottom.
 *
 * @invariant encode → decode is the identity on stops (position · colour · interpolation ·
 *   bias), name, blend space and colour space, and decode of anything else is null —
 *   proven by: `npx tsx debug/test-gx-share.mts` ("round trip keeps every stop field",
 *   "garbage decodes to null").
 */

import type { GradientConfig, GradientStop } from '../../types';
import { coerceGradientConfig } from '../../palette/core/editorConfig';

export const SHARE_PARAM = 'g';

type Wire = { v: 1; n: string; b?: string; c?: string; s: (string | number)[][] };

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

const r4 = (x: number): number => Math.round(x * 10000) / 10000;

export const encodeShare = (config: GradientConfig, name: string): string => {
  const wire: Wire = {
    v: 1,
    n: name,
    s: config.stops.map((st) => {
      const row: (string | number)[] = [r4(st.position), st.color];
      const interp = st.interpolation ?? 'linear';
      const bias = st.bias ?? 0.5;
      if (interp !== 'linear' || bias !== 0.5) row.push(interp);
      if (bias !== 0.5) row.push(r4(bias));
      return row;
    }),
  };
  if (config.blendSpace) wire.b = config.blendSpace;
  if (config.colorSpace) wire.c = config.colorSpace;
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
  const config = coerceGradientConfig({ stops, blendSpace: o.b, colorSpace: o.c });
  if (!config) return null;
  return { config, name: typeof o.n === 'string' && o.n.trim() ? o.n : 'Shared gradient' };
};

/** The full link for the current page. */
export const shareUrlFor = (config: GradientConfig, name: string): string => {
  const u = new URL(window.location.href);
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
