/**
 * importFormats harness — verifies the W7 import parsers (close the one-way export):
 *
 *   • DETERMINISM: parsing the same text twice yields a byte-identical ramp.
 *   • ROUND-TRIP: exporting a known ramp via exportFormats then re-parsing recovers it
 *     — byte-exact for the dense formats (.map/.gpl/.ggr/.cpt/.json), within a small
 *     tolerance for the lossy ones (.css reduces to 33 adaptively placed stops).
 *   • FAIL-SAFE: garbage / empty / truncated input returns null and never throws.
 *   • FORM [7] (ADR-0122, 2026-09-14): `importGradientFiles.parseGradientImports` brings a dense
 *     256-entry .map in as a RAMP gradient carrying the file's texels, a simple one as stops.
 *     Falsified 2026-09-14, each reverted: the import back on `fitRampToStops` → 2 red (the
 *     zebra came in as 32 stops, texels lost); `rampToGradientConfig` with `cap: 0` (everything
 *     a ramp) → 1 red ("a simple .map is stops").
 *
 * Run: npx tsx debug/test-palette-importformats.mts
 */

import { GRADIENT_PRESETS } from '../data/gradientPresets';
import { renderStopsToRamp } from '../palette/core/gmtGradient';
import { EXPORT_FORMATS } from '../palette/core/exportFormats';
import {
  parseGradientText,
  parseMap,
  parseGpl,
  parseGgr,
  parseCpt,
  parseCss,
  parseJson,
} from '../palette/core/importFormats';
import type { RGB } from '../palette/core/oklab';

let failures = 0;
const ok = (cond: boolean, msg: string) => {
  if (!cond) {
    failures++;
    console.error('  ✗ ' + msg);
  } else console.log('  ✓ ' + msg);
};

const ri = (c: RGB): [number, number, number] => [Math.round(c.r), Math.round(c.g), Math.round(c.b)];

/** Worst per-channel rounded delta between two ramps. */
const maxDelta = (a: RGB[], b: RGB[]): number => {
  let d = 0;
  for (let i = 0; i < 256; i++) {
    const ca = ri(a[i]);
    const cb = ri(b[i]);
    d = Math.max(d, Math.abs(ca[0] - cb[0]), Math.abs(ca[1] - cb[1]), Math.abs(ca[2] - cb[2]));
  }
  return d;
};

const buildOf = (key: string) => EXPORT_FORMATS.find((f) => f.key === key)!.build;

// A couple of representative ramps from the built-in presets.
const RAMPS: { name: string; ramp: RGB[] }[] = GRADIENT_PRESETS.slice(0, 6).map((p) => ({
  name: p.name,
  ramp: renderStopsToRamp(p.stops, 'oklab', 'srgb'),
}));

console.log('[1] round-trip: byte-exact dense formats (.map/.gpl/.ggr/.cpt/.json)');
for (const { name, ramp } of RAMPS) {
  for (const key of ['map', 'gpl', 'ggr', 'cpt', 'json'] as const) {
    const text = buildOf(key)(ramp) as string;
    const res = parseGradientText(text, key);
    ok(!!res, `${key}: "${name}" parses`);
    if (res) ok(maxDelta(res.ramp, ramp) === 0, `${key}: "${name}" round-trips byte-exact (Δ=${maxDelta(res.ramp, ramp)})`);
  }
}

/**
 * The .css bound is 8 levels, and it was 24 until 2026-09-13.
 *
 * 24 was not derived; it was the value the old Turbo preset happened to produce under EVEN
 * sampling, so it sat exactly on the line and could not tell a good reduction from a bad one.
 * The exporter places its 33 stops adaptively now (`reduceStopIndices`, see the css entry in
 * exportFormats.ts), which measures at most 4 across these six. 8 leaves that twice over and
 * still reds the regression it exists for: restoring even sampling fails two of the six —
 * Turbo 33, Spectrum 11 (falsified 2026-09-13).
 */
const CSS_BOUND = 8;
console.log('[2] round-trip: .css recovers within tolerance (33 adaptively placed stops)');
for (const { name, ramp } of RAMPS) {
  const text = buildOf('css')(ramp) as string;
  const res = parseGradientText(text, 'css');
  ok(!!res, `css: "${name}" parses`);
  if (res) {
    const d = maxDelta(res.ramp, ramp);
    ok(d <= CSS_BOUND, `css: "${name}" within tolerance (Δ=${d}, bound ${CSS_BOUND})`);
  }
}

console.log('[3] determinism: same text → identical ramp');
{
  const text = buildOf('ggr')(RAMPS[0].ramp) as string;
  const a = parseGradientText(text, 'ggr')!;
  const b = parseGradientText(text, 'ggr')!;
  ok(!!a && !!b && maxDelta(a.ramp, b.ramp) === 0, 'ggr parsed twice is identical');
  // determinism across formats, sniffed (no ext hint)
  const cssText = buildOf('css')(RAMPS[1].ramp) as string;
  const s1 = parseGradientText(cssText)!;
  const s2 = parseGradientText(cssText)!;
  ok(!!s1 && s1.format === 'css' && maxDelta(s1.ramp, s2.ramp) === 0, 'css sniffed + deterministic');
}

console.log('[4] sniffing: extension-less parse picks the right format');
{
  ok(parseGradientText(buildOf('gpl')(RAMPS[0].ramp) as string)?.format === 'gpl', 'GIMP Palette sniffed');
  ok(parseGradientText(buildOf('ggr')(RAMPS[0].ramp) as string)?.format === 'ggr', 'GIMP Gradient sniffed');
  ok(parseGradientText(buildOf('map')(RAMPS[0].ramp) as string)?.format === 'map', 'Fractint .map sniffed');
  ok(parseGradientText(buildOf('json')(RAMPS[0].ramp) as string)?.format === 'json', 'JSON sniffed');
}

console.log('[5] fail-safe: garbage / empty / truncated never throws, returns null');
{
  const garbage = ['', '   ', 'not a gradient at all', '{{{', '\x00\x01\x02', 'GIMP Palette\nName: x', '#'.repeat(5000)];
  for (const g of garbage) {
    let threw = false;
    let res: unknown;
    try {
      res = parseGradientText(g);
    } catch {
      threw = true;
    }
    ok(!threw, `no throw on ${JSON.stringify(g.slice(0, 16))}`);
    ok(res === null, `null on ${JSON.stringify(g.slice(0, 16))}`);
  }
  // individual parsers also fail safe on cross-fed garbage
  for (const p of [parseMap, parseGpl, parseGgr, parseCpt, parseCss, parseJson]) {
    let threw = false;
    try {
      p('### nonsense ###\n!!!\n');
    } catch {
      threw = true;
    }
    ok(!threw, `${p.name} no throw on nonsense`);
  }
  // malformed numbers / out-of-range channels are clamped, not crashed
  const wild = parseGradientText('999 -50 12\n0 0 0\n', 'map');
  ok(!!wild && wild.ramp[0].r === 255 && wild.ramp[0].g === 0, 'out-of-range channels clamped to [0,255]');
}

console.log('[6] single-colour input → flat ramp');
{
  const res = parseGradientText('128 64 200', 'map');
  ok(!!res && ri(res.ramp[0])[0] === 128 && ri(res.ramp[255])[2] === 200, 'one triplet fills the ramp');
}

console.log('[7] the import\'s config FORM (ADR-0122, palette/core/importGradientFiles.ts)');
{
  // importGradientFiles pulls in the favourites store: shim localStorage before it loads.
  const mem = new Map<string, string>();
  const shim = {
    getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
    setItem: (k: string, v: string) => { mem.set(k, String(v)); },
    removeItem: (k: string) => { mem.delete(k); },
    clear: () => mem.clear(),
    key: (i: number) => Array.from(mem.keys())[i] ?? null,
    get length() { return mem.size; },
  };
  (globalThis as any).window ??= { localStorage: shim, addEventListener: () => {} };
  (globalThis as any).localStorage ??= shim;
  const { parseGradientImports } = await import('../palette/core/importGradientFiles');
  const { isRampGradient, decodeRamp } = await import('../utils/gradientRamp');
  // A 256-entry .map of a period-2 zebra — 8ZEBBOW2's shape. Before ADR-0122 this was squashed
  // to a truncated 32-stop fit; it must come in as its own texels.
  const zebra = Array.from({ length: 256 }, (_, i) => (i % 2 ? [255, (i * 3) % 256, 255 - i] : [0, 0, 0]));
  const dense = parseGradientImports([{ name: 'zebra.map', text: zebra.map((c) => c.join(' ')).join('\n') + '\n' }]).items[0]?.config;
  ok(!!dense && isRampGradient(dense), `import: a dense .map is a ramp gradient (got ${dense ? dense.stops.length + ' stops' : 'nothing'})`);
  const texels = dense && isRampGradient(dense) ? decodeRamp(dense.ramp) : null;
  ok(!!texels && texels.every((c, i) => c.r === zebra[i][0] && c.g === zebra[i][1] && c.b === zebra[i][2]), 'import: its texels are the file\'s');
  const simple = parseGradientImports([{ name: 'four.map', text: '0 0 0\n255 0 0\n0 255 0\n255 255 255\n' }]).items[0]?.config;
  ok(!!simple && simple.stops.length >= 2 && simple.stops.length <= 32 && !('ramp' in simple), `import: a simple .map is stops (got ${simple?.stops.length})`);
}

if (failures) {
  console.error(`\nimportFormats: ${failures} FAILED`);
  process.exit(1);
}
console.log('\nimportFormats: all green');
