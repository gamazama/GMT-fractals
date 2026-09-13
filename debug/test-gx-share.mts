/**
 * test-gx-share — the v2 Share link codec (gradient-explorer/v2/shareUrl.ts).
 *
 *   [1] round trip keeps every stop field, the name, blend + colour space
 *   [2] the default-valued fields are elided from the wire (short links) yet restored
 *   [3] garbage decodes to null: not base64, not JSON, wrong version, a bad stop row, a
 *       config the shared gate rejects
 *   [4] the Share URL (`shareUrlFor`) opens the explorer page and round-trips through
 *       `takeShareFromLocation`, which also strips the param so a refresh does not re-apply
 *       the gradient. (Until 2026-09-07 this tested the "Back to GMT" hand-back URL; the owner dropped it — GMT's My Gradients already has the gradient.)
 *   [5] "Back to GMT" shows only when the page came from the studio: `cameFromGmtFor` over
 *       `?from=gmt` and the same-origin referrer at `/`, `/app-gmt`, `/app-gmt.html`; and
 *       app-gmt's `openGradientExplorer` actually appends the param (2026-09-13).
 *
 * Node only, no browser. `npm run test:gx-share`.
 */

import { readFileSync } from 'node:fs';
import { encodeShare, decodeShare, shareUrlFor, takeShareFromLocation, cameFromGmtFor, SHARE_PARAM } from '../gradient-explorer/v2/shareUrl';
import type { GradientConfig } from '../types';

let failures = 0;
const check = (ok: boolean, msg: string): void => {
  console.log(`  ${ok ? '✓' : '✗'} ${msg}`);
  if (!ok) failures++;
};

console.log('[1] round trip');
{
  const cfg: GradientConfig = {
    stops: [
      { id: 'a', position: 0, color: '#FF0000', bias: 0.5, interpolation: 'linear' },
      { id: 'b', position: 0.3333, color: '#00FF00', bias: 0.25, interpolation: 'smooth' },
      { id: 'c', position: 1, color: '#0000FF', bias: 0.5, interpolation: 'step' },
    ],
    blendSpace: 'oklab',
    colorSpace: 'srgb',
  };
  const code = encodeShare(cfg, 'Test name');
  check(/^[A-Za-z0-9_-]+$/.test(code), 'the code is base64url (no + / =)');
  const back = decodeShare(code);
  check(!!back, 'decodes');
  if (back) {
    check(back.name === 'Test name', 'the name survives');
    check(back.config.blendSpace === 'oklab' && back.config.colorSpace === 'srgb', 'blend + colour space survive');
    check(back.config.stops.length === 3, 'three stops');
    const s = back.config.stops;
    check(s[1].position === 0.3333 && s[1].color.toUpperCase() === '#00FF00', 'position + colour survive');
    check(s[1].interpolation === 'smooth' && s[1].bias === 0.25, 'interpolation + bias survive');
    check(s[2].interpolation === 'step' && (s[2].bias ?? 0.5) === 0.5, 'a step stop with default bias survives');
    check((s[0].interpolation ?? 'linear') === 'linear' && (s[0].bias ?? 0.5) === 0.5, 'round trip keeps every stop field');
  }
}

console.log('\n[2] defaults are elided');
{
  const cfg: GradientConfig = {
    stops: [
      { id: 'a', position: 0, color: '#000000', bias: 0.5, interpolation: 'linear' },
      { id: 'b', position: 1, color: '#FFFFFF', bias: 0.5, interpolation: 'linear' },
    ],
  };
  const code = encodeShare(cfg, 'bw');
  const json = Buffer.from(code.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
  check(!json.includes('linear') && !json.includes('0.5'), 'default interpolation + bias are not on the wire');
  check(json.length < 90, `the wire stays short (${json.length} chars)`);
  const back = decodeShare(code);
  check(!!back && back.config.stops.length === 2, 'and still decodes to two stops');
}

console.log('\n[3] garbage');
{
  check(decodeShare('***') === null, 'not base64 → null');
  check(decodeShare(Buffer.from('not json').toString('base64url')) === null, 'not JSON → null');
  check(decodeShare(Buffer.from(JSON.stringify({ v: 2, s: [] })).toString('base64url')) === null, 'wrong version → null');
  check(decodeShare(Buffer.from(JSON.stringify({ v: 1, s: [[0, 5]] })).toString('base64url')) === null, 'a bad stop row → null');
  check(decodeShare(Buffer.from(JSON.stringify({ v: 1, s: [] })).toString('base64url')) === null, 'garbage decodes to null');
}

console.log('\n[4] the Share URL round-trips');
{
  // `shareUrlFor` / `takeShareFromLocation` read `window.location` at CALL time, so a
  // minimal stub is enough to exercise them on node (the module itself imports clean).
  const cfg: GradientConfig = {
    stops: [
      { id: 'a', position: 0, color: '#123456' },
      { id: 'b', position: 0.5, color: '#abcdef', interpolation: 'smooth' },
      { id: 'c', position: 1, color: '#FFFFFF' },
    ],
    blendSpace: 'oklab',
  };
  let replaced: string | null = null;
  (globalThis as any).window = {
    location: { href: 'http://localhost:3400/gradient-explorer-next.html?zoom=2' },
    history: { replaceState: (_a: unknown, _b: unknown, url: string) => { replaced = url; } },
  };
  const url = shareUrlFor(cfg, 'Dusk over water');
  check(url.includes('/gradient-explorer-next.html?'), `the link opens the explorer (${url.slice(0, 60)})`);
  const code = new URL(url).searchParams.get(SHARE_PARAM) ?? '';
  check(code.length > 0 && /^[A-Za-z0-9_-]+$/.test(code), 'it carries a base64url ?g= code');

  // Arrival: the explorer boots by calling exactly this.
  (globalThis as any).window.location.href = url;
  const arrived = takeShareFromLocation();
  check(!!arrived, 'it decodes with the same module');
  if (arrived) {
    check(arrived.name === 'Dusk over water', 'the name round-trips');
    check(arrived.config.stops.length === 3, 'three stops arrive');
    check(
      arrived.config.stops[1].color.toUpperCase() === '#ABCDEF' && arrived.config.stops[1].interpolation === 'smooth',
      'colour + interpolation survive the link',
    );
    check(
      (arrived.config.stops[0].bias ?? 0.5) === 0.5 && (arrived.config.stops[0].interpolation ?? 'linear') === 'linear',
      'elided defaults are restored on arrival',
    );
    check(arrived.config.blendSpace === 'oklab', 'the blend space survives');
  }
  check(replaced !== null && !String(replaced).includes(SHARE_PARAM + '='), 'the param is stripped (a refresh does not re-apply it)');
  delete (globalThis as any).window;
}

console.log('\n[5] "Back to GMT" — cameFromGmtFor, and the opener that feeds it');
{
  // Until 2026-09-13 this could never pass in production: nothing appended `?from=gmt`, and
  // the referrer fallback wanted a path ending `app-gmt.html`, which the studio is not served
  // at (it is `/`, or `/app-gmt` under Cloudflare's pretty URLs). Falsified that day two ways:
  // restoring `endsWith('app-gmt.html')` reds the `/` and `/app-gmt` referrer checks, and
  // taking `?from=gmt` back out of `openGradientExplorer` reds the last check.
  const GX = 'https://app.gmt-fractals.com/gradient-explorer.html';
  check(cameFromGmtFor(`${GX}?from=gmt`, ''), '?from=gmt with no referrer (window.open noopener may send none)');
  check(!cameFromGmtFor(GX, ''), 'a bare page with no referrer is not from GMT');
  check(cameFromGmtFor(GX, 'https://app.gmt-fractals.com/'), 'the studio at the site root (production)');
  check(cameFromGmtFor(GX, 'https://app.gmt-fractals.com/app-gmt'), 'the studio under a Cloudflare pretty URL');
  check(cameFromGmtFor('http://localhost:3400/gradient-explorer-next.html', 'http://localhost:3400/app-gmt.html'), 'the studio on a dev server');
  check(!cameFromGmtFor(GX, 'https://elsewhere.example/app-gmt.html'), 'a cross-origin referrer does not count');
  check(!cameFromGmtFor(GX, 'https://app.gmt-fractals.com/fluid-toy.html'), 'fluid-toy is not the studio');
  check(!cameFromGmtFor(GX, 'https://app.gmt-fractals.com/gradient-explorer.html'), 'a reload of the Explorer itself is not the studio');
  check(!cameFromGmtFor(`${GX}?from=fluid`, ''), 'another ?from value does not count');
  check(!cameFromGmtFor('not a url', 'also not'), 'garbage is false, never a throw');

  // THE OPENER. The decoder above is only half of it — the page app-gmt actually opens has to
  // carry the signal. Read as text rather than imported: installFavients pulls the panel
  // registry and the store, which this node harness has no reason to boot.
  const src = readFileSync(new URL('../palette/installFavients.ts', import.meta.url), 'utf8');
  const opened = /export const openGradientExplorer[\s\S]*?window\.open\('([^']+)'/.exec(src)?.[1] ?? '';
  check(!!opened && cameFromGmtFor(new URL(opened, 'https://app.gmt-fractals.com/').toString(), ''), `app-gmt's opener carries the signal (${opened || 'no window.open found'})`);
}

console.log(failures === 0 ? '\nPASS — share codec' : `\nFAIL — ${failures} assertion(s)`);
process.exit(failures === 0 ? 0 : 1);
