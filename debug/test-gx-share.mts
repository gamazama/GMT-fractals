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
 *       Since the entry-point swap (2026-09-16) also: a link made on the ALIAS page
 *       (`gradient-explorer-next`, with or without `.html`, any directory) is written on the
 *       canonical `gradient-explorer` page, and the alias HTML is the canonical HTML byte for
 *       byte below its leading comment, so an old `?g=` link opens the same app. Falsified
 *       2026-09-16, each reverted, exit 1: dropping the pathname rewrite in `shareUrlFor` → 2 red
 *       (the alias, the pretty URL); one changed `<title>` in the alias → 1 red (byte for byte).
 *   [5] "Back to GMT" shows only when the page came from the studio: `cameFromGmtFor` over
 *       `?from=gmt` and the same-origin referrer at `/`, `/app-gmt`, `/app-gmt.html`; and
 *       app-gmt's `openGradientExplorer` actually appends the param (2026-09-13).
 *   [6] (2026-09-14, ADR-0122) a RAMP gradient round-trips byte-exact as `s: []` + `r`, under
 *       2,000 characters of URL; a stop gradient's code is PINNED to the pre-ramp encoder's
 *       output (checked against HEAD's shareUrl.ts that day, three configs, byte-identical)
 *       and a stale ramp does not change it; a malformed ramp / no rows and no ramp → null;
 *       rows AND a ramp decode as a stop gradient.
 *       Falsified 2026-09-14 (each reverted, exit 1): the encoder never writing `r` → 2 red
 *       ("round-trips byte-exact", "with its name"); writing `r` whenever the config has a
 *       ramp → 1 red ("unchanged by a stale ramp"); the decoder ignoring `r` → 2 red.
 *   [7] (2026-09-14, ADR-0123 item 2) a STEP edge renders the same texels after decode — every
 *       edge on a sample (i/255), on a half texel ((i - 0.5)/255) and 3e-5 either side of a
 *       sample, plus the 12-band k/12 corpus gradient; an ordinary gradient's wire is the exact
 *       4-decimal wire; a link from the 4-decimal encoder still decodes.
 *       Falsified 2026-09-14 (each restored, exit 1): positions back to plain 4 decimals → 2 red
 *       (229 of 1,016 edges moved, and the k/12 bands); never writing 4 decimals → 1 red (the
 *       ordinary link grew `0.47123`); a decoder that refuses the old link's step rows → 4 red.
 *       Half-texel edges alone do NOT catch the 4-decimal bug — 5e-5 of rounding cannot reach
 *       half a texel — which is why the on-sample and ±3e-5 edges are in the sweep.
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
    location: { href: 'http://localhost:3400/gradient-explorer.html?zoom=2' },
    history: { replaceState: (_a: unknown, _b: unknown, url: string) => { replaced = url; } },
  };
  const url = shareUrlFor(cfg, 'Dusk over water');
  check(url.startsWith('http://localhost:3400/gradient-explorer.html?g='), `the link opens the explorer, carrying only ?g= (${url.slice(0, 60)})`);

  // The ALIAS (entry-point swap, 2026-09-16): the preview address still serves the app, and a
  // link made there is written on the canonical page, with or without `.html`, in the same
  // directory (the /dev preview deploy). Anything else is left alone.
  const linkFrom = (href: string): string => {
    (globalThis as any).window.location.href = href;
    return shareUrlFor(cfg, 'Dusk over water').split('?')[0];
  };
  check(linkFrom('http://localhost:3400/gradient-explorer-next.html?zoom=2') === 'http://localhost:3400/gradient-explorer.html', '[4] a link made on the alias names the canonical page');
  check(linkFrom('https://app.gmt-fractals.com/dev/gradient-explorer-next') === 'https://app.gmt-fractals.com/dev/gradient-explorer', '[4] …under a pretty URL, in the same directory');
  check(linkFrom('https://app.gmt-fractals.com/gradient-explorer') === 'https://app.gmt-fractals.com/gradient-explorer', '[4] the canonical pretty URL is left alone');
  check(linkFrom('https://example.com/my-gradient-explorer-next.html') === 'https://example.com/my-gradient-explorer-next.html', '[4] only the alias page itself is rewritten');
  (globalThis as any).window.location.href = url;

  // …and the alias PAGE is the canonical page: same markup, same module, so an old link opens
  // exactly what a new one does. Only the alias's leading comment may differ.
  const page = (f: string) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const canonical = page('gradient-explorer.html');
  const alias = page('gradient-explorer-next.html').replace(/<!-- ALIAS[\s\S]*?-->\n/, '');
  check(canonical.includes('src="/gradient-explorer/v2/main.tsx"'), '[4] gradient-explorer.html loads the v2 shell');
  check(alias === canonical, '[4] gradient-explorer-next.html is gradient-explorer.html, byte for byte below its alias comment');

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

console.log('\n[6] a RAMP gradient rides the link (ADR-0122); a stop gradient\'s link does not change');
{
  const { encodeRamp, isRampGradient } = await import('../utils/gradientRamp');
  const ramp = encodeRamp(Array.from({ length: 256 }, (_, i) => ({ r: i, g: (i * 5) % 256, b: i % 2 ? 0 : 255 })));
  const rampCfg: GradientConfig = { stops: [], ramp, blendSpace: 'oklab', colorSpace: 'linear' };
  const code = encodeShare(rampCfg, 'Zebra');
  const back = decodeShare(code);
  check(!!back && isRampGradient(back.config) && back.config.ramp === ramp, '[6] a ramp gradient round-trips byte-exact');
  check(!!back && back.name === 'Zebra' && back.config.colorSpace === 'linear', '[6] with its name and colour space');
  const url = `https://app.gmt-fractals.com/gradient-explorer.html?${SHARE_PARAM}=${code}`;
  check(url.length < 2000, `[6] the ramp link stays under 2,000 characters (${url.length})`);

  // Pinned: the pre-ramp encoder's exact output for this gradient (checked against HEAD's
  // shareUrl.ts on 2026-09-14) — a link already shared must not change a byte.
  const bw: GradientConfig = {
    stops: [{ id: 'a', position: 0, color: '#000000' }, { id: 'b', position: 1, color: '#FFFFFF' }],
    blendSpace: 'oklab', colorSpace: 'srgb',
  };
  const PINNED = 'eyJ2IjoxLCJuIjoibiIsInMiOltbMCwiIzAwMDAwMCJdLFsxLCIjRkZGRkZGIl1dLCJiIjoib2tsYWIiLCJjIjoic3JnYiJ9';
  check(encodeShare(bw, 'n') === PINNED, '[6] a stop gradient\'s link is byte-identical to the pre-ramp encoder');
  check(encodeShare({ ...bw, ramp }, 'n') === PINNED, '[6] a stop gradient\'s link is unchanged by a stale ramp');

  const wire = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
  check(decodeShare(wire({ v: 1, n: 'x', s: [], r: ramp.slice(2) })) === null, '[6] a link with a malformed ramp decodes to null');
  check(decodeShare(wire({ v: 1, n: 'x', s: [] })) === null, '[6] a link with neither rows nor a ramp decodes to null');
  const both = decodeShare(wire({ v: 1, n: 'x', s: [[0, '#000000'], [1, '#FFFFFF']], r: ramp }));
  check(!!both && both.config.stops.length === 2 && !('ramp' in both.config), '[6] rows AND a ramp is a stop gradient (stops win)');
}

console.log('\n[7] a step edge lands on the same texel after decode (ADR-0123 item 2); old links still decode');
{
  const { renderStopsToRamp } = await import('../utils/colorUtils');
  const sameTexels = (a: GradientConfig, b: GradientConfig): number => {
    const ra = renderStopsToRamp(a.stops, a.blendSpace, a.colorSpace);
    const rb = renderStopsToRamp(b.stops, b.blendSpace, b.colorSpace);
    return ra.findIndex((c, i) => c.r !== rb[i].r || c.g !== rb[i].g || c.b !== rb[i].b);
  };
  const stepAt = (p: number): GradientConfig => ({
    stops: [
      { id: 'a', position: 0, color: '#102030', interpolation: 'step' },
      { id: 'b', position: p, color: '#F0E0D0', interpolation: 'step' },
      { id: 'c', position: 1, color: '#FFFFFF' },
    ],
    blendSpace: 'oklab', colorSpace: 'srgb',
  });
  // Every edge ON a sample (i/255), every edge on a HALF texel ((i - 0.5)/255), and just either
  // side of every sample (±3e-5, inside what 4 decimals rounds away).
  const bad: string[] = [];
  for (let i = 1; i < 255; i++) {
    for (const p of [i / 255, (i - 0.5) / 255, i / 255 + 3e-5, i / 255 - 3e-5]) {
      const back = decodeShare(encodeShare(stepAt(p), 'e'));
      const at = back ? sameTexels(stepAt(p), back.config) : 0;
      if (!back || at !== -1) bad.push(`${p} (texel ${at})`);
    }
  }
  check(bad.length === 0, `[7] every step edge renders the same texels after decode (${bad.length} of ${254 * 4} moved${bad.length ? ': ' + bad.slice(0, 3).join(', ') : ''})`);
  // The harness corpus's 12-band step gradient: edges at k/12, 4/12 = 85/255 exactly.
  const bands: GradientConfig = { stops: Array.from({ length: 12 }, (_, k) => ({ id: `s${k}`, position: k / 12, color: k % 2 ? '#F2A0A0' : '#203040', interpolation: 'step' as const })), blendSpace: 'oklab', colorSpace: 'srgb' };
  const bandsBack = decodeShare(encodeShare(bands, 'bands'));
  check(!!bandsBack && sameTexels(bands, bandsBack.config) === -1, '[7] the 12-band k/12 step gradient is texel-identical after decode');

  // An ordinary gradient keeps the exact 4-decimal wire every link used before (no longer links).
  const ordinary: GradientConfig = {
    stops: [
      { id: 'a', position: 0, color: '#0B3D4F', bias: 0.3 },
      { id: 'b', position: 0.18, color: '#2A9D8F', bias: 0.7, interpolation: 'smooth' },
      { id: 'c', position: 0.4712345, color: '#E9C46A' },
      { id: 'd', position: 1, color: '#E76F51' },
    ],
    blendSpace: 'hsv', colorSpace: 'srgb',
  };
  const wireOf = (code: string) => Buffer.from(code, 'base64url').toString('utf8');
  check(
    wireOf(encodeShare(ordinary, 'o')) === '{"v":1,"n":"o","s":[[0,"#0B3D4F","linear",0.3],[0.18,"#2A9D8F","smooth",0.7],[0.4712,"#E9C46A"],[1,"#E76F51"]],"b":"hsv","c":"srgb"}',
    `[7] an ordinary gradient's link is the 4-decimal link (${wireOf(encodeShare(ordinary, 'o'))})`,
  );
  // A link written by the 4-decimal encoder (before 2026-09-14) — the k/12 bands at r4 — decodes.
  const OLD = Buffer.from(JSON.stringify({ v: 1, n: 'Stufe Bänder ä', s: [[0, '#203040', 'step'], [0.3333, '#F2A0A0', 'step'], [0.6667, '#203040', 'step'], [1, '#F2A0A0']], b: 'oklab', c: 'srgb' })).toString('base64url');
  const old = decodeShare(OLD);
  check(!!old && old.name === 'Stufe Bänder ä' && old.config.stops.length === 4 && old.config.stops[1].position === 0.3333 && old.config.stops[1].interpolation === 'step' && (old.config.stops[1].bias ?? 0.5) === 0.5,
    '[7] a link from the 4-decimal encoder still decodes (positions as written, elided defaults restored)');
}

console.log(failures === 0 ? '\nPASS — share codec' : `\nFAIL — ${failures} assertion(s)`);
process.exit(failures === 0 ? 0 : 1);
