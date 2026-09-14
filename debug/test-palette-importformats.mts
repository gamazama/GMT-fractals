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
 * ADR-0123 item 2 (2026-09-14) — what a file says beyond its colours (`ImportResult.name/config`):
 *   [8]  names: .gpl/.ggr/.cpt/.json/.css/CSS variables/design tokens (ramp and swatch forms)
 *        bring back the name the exporter wrote; unnamed and pre-names files (`gradient`) have
 *        none; other people's comments are not names; hostile names cannot become colour data.
 *   [9]  a `{stops}` JSON / bare stop array / ramp-form config is an exact `config` (position,
 *        colour, bias, interpolation, blend, colour space); a list the gate would thin is colours.
 *   [10] CSS variables and design tokens: their 11 colours (and a 7-swatch form) within OKLab
 *        ΔE 0.02 at their even positions; DTCG object values and inherited `$type`.
 *   [11] an extension we do not parse is refused (no sniffing an .ai into a .cpt); none / .txt
 *        still sniff.
 *   FALSIFIED 2026-09-14, one mutation at a time, each restored, every one exit 1:
 *     .gpl `Name:` not read → 3 red · .ggr → 2 · .cpt `# Name:` → 2 · JSON `name` → 4 · the CSS
 *     comment name → 4 · the `gradient` placeholder read as a name → 3 · parseGgr's header-letter
 *     guard removed → 1 (the FIRST cut stayed GREEN: the sanitised hostile name's fake segment
 *     sorted last and painted nothing, so "a Name line of 13 numbers is not a segment" was added
 *     with left 0 / right 1) · exportFormats `headerName` keeping control characters → 4 · the
 *     CSS leading comment not stripped before the gradient scan → 2 · `exactJsonConfig` off → 4 ·
 *     a thinned stop list accepted as exact → 1 · blend / colour space dropped → 3 · bias /
 *     interpolation dropped → 2 · the config's ramp not its display ramp → 1 · CSS variables not
 *     read → 7 · tokens not read → 8 · unknown extensions sniffed again → 3 · CSS variables
 *     written without the comment → 2 · tokens name not read → 2 · not written → 2.
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

// ════ ADR-0123 item 2 (2026-09-14): what a file says beyond its colours ════════════════════
const { getExportFormat } = await import('../palette/core/exportFormats');
const { oklabDistance } = await import('../palette/core/oklab');
const { gradientDisplayRamp } = await import('../palette/core/gmtGradient');
const NAME = 'Sea Glass é';
const SEVEN: RGB[] = [
  { r: 0, g: 0, b: 0 }, { r: 255, g: 0, b: 0 }, { r: 0, g: 255, b: 0 }, { r: 0, g: 0, b: 255 },
  { r: 255, g: 255, b: 0 }, { r: 18, g: 52, b: 86 }, { r: 255, g: 255, b: 255 },
];

console.log('[8] names: a file that carries one brings it back');
{
  const ramp = RAMPS[1].ramp;
  for (const key of ['gpl', 'ggr', 'cpt', 'json', 'css', 'cssvars', 'tokens']) {
    const f = getExportFormat(key)!;
    const res = parseGradientText(f.build(ramp, NAME) as string, f.ext);
    ok(res?.name === NAME, `[8] ${key}: the name survives (got ${JSON.stringify(res?.name)})`);
  }
  for (const key of ['gpl', 'json', 'cssvars', 'tokens']) {
    const f = getExportFormat(key)!;
    const res = parseGradientText(f.swatches!(SEVEN, NAME) as string, f.ext);
    ok(res?.name === NAME, `[8] ${key} swatches: the name survives (got ${JSON.stringify(res?.name)})`);
  }
  // Unnamed, and every file written before 2026-09-14: the placeholder is not a name, so the
  // caller still names it from the filename rather than calling everything "gradient".
  for (const key of ['gpl', 'ggr', 'cpt', 'json', 'css', 'cssvars', 'tokens']) {
    const f = getExportFormat(key)!;
    const res = parseGradientText(f.build(ramp) as string, f.ext);
    ok(!!res && res.name === undefined, `[8] ${key} unnamed / pre-names file: no name (got ${JSON.stringify(res?.name)})`);
  }
  // Somebody else's header comments are not names.
  ok(parseGradientText('# cpt-city notes\n0 0 0 0 1 255 255 255\n', 'cpt')?.name === undefined, '[8] a bare .cpt comment is not a name');
  ok(parseGradientText('/*! normalize.css v8\n * MIT */\nbackground: linear-gradient(90deg, #000 0%, #fff 100%);', 'css')?.name === undefined, '[8] a multi-line CSS licence comment is not a name');
  // A hostile name cannot write data: a newline in a header field, 13 numbers in a .ggr name
  // line, a CSS gradient + terminator inside the comment.
  const evil = 'x 1 2 3 4 5 6 7 8 9 10 11 12 13\n0 0 0';
  for (const key of ['gpl', 'ggr', 'cpt']) {
    const f = getExportFormat(key)!;
    const res = parseGradientText(f.build(ramp, evil) as string, f.ext);
    ok(!!res && maxDelta(res.ramp, ramp) === 0, `[8] ${key}: a name full of numbers and a newline leaves the colours byte-exact (Δ=${res ? maxDelta(res.ramp, ramp) : 'null'})`);
    ok(res?.name === 'x 1 2 3 4 5 6 7 8 9 10 11 12 13 0 0 0', `[8] ${key}: …and comes back on one line (got ${JSON.stringify(res?.name)})`);
  }
  // A .ggr whose Name line reads as a whole segment spanning 0..1 (13 numbers, left 0, right 1):
  // read as data it would sort FIRST and paint the entire ramp.
  const ggrEvil = parseGradientText('GIMP Gradient\nName: 0 0.5 1 1 1 1 1 1 0 0 1 0 0\n1\n0 0.5 1 0 0 0 1 1 1 1 1 0 0\n', 'ggr');
  ok(!!ggrEvil && ri(ggrEvil.ramp[0]).join() === '0,0,0' && ri(ggrEvil.ramp[255]).join() === '255,255,255', `[8] ggr: a Name line of 13 numbers is not a segment (${ggrEvil ? ri(ggrEvil.ramp[0]) + ' → ' + ri(ggrEvil.ramp[255]) : 'null'})`);
  const cssEvil = 'Dusk gradient(2) #fff */ red';
  const cssRes = parseGradientText(getExportFormat('css')!.build(ramp, cssEvil) as string, 'css');
  ok(!!cssRes && maxDelta(cssRes.ramp, ramp) <= CSS_BOUND, `[8] css: a name holding "gradient(", a hex and a comment terminator is not read as colour (Δ=${cssRes ? maxDelta(cssRes.ramp, ramp) : 'null'})`);
  ok(cssRes?.name === 'Dusk gradient(2) #fff * / red', `[8] css: …and reads back with the terminator broken (got ${JSON.stringify(cssRes?.name)})`);
}

console.log('[9] a {stops} JSON is an EXACT gradient (the editor\'s Copy shape, a bare GMT config)');
{
  const stops = [
    { position: 0, color: '#0B3D4F', bias: 0.3, interpolation: 'linear' },
    { position: 0.18, color: '#2A9D8F', bias: 0.7, interpolation: 'smooth' },
    { position: 0.47, color: '#E9C46A', bias: 0.2, interpolation: 'step' },
    { position: 0.731, color: '#F4A261', bias: 0.85, interpolation: 'cubic' },
    { position: 1, color: '#E76F51', bias: 0.5, interpolation: 'linear' },
  ];
  const copy = { name: NAME, stops, colorSpace: 'linear', blendSpace: 'hsv' };
  const res = parseGradientText(JSON.stringify(copy), 'json');
  const c = res?.config;
  ok(!!c, '[9] {stops} JSON returns a config');
  if (c) {
    ok(c.stops.length === stops.length && c.stops.every((s, i) => s.position === stops[i].position && s.color === stops[i].color && s.bias === stops[i].bias && s.interpolation === stops[i].interpolation),
      `[9] every stop exact — position, colour, bias, interpolation (got ${JSON.stringify(c.stops.map((s) => [s.position, s.color, s.bias, s.interpolation]))})`);
    ok(c.blendSpace === 'hsv' && c.colorSpace === 'linear', `[9] blend + colour space exact (got ${c.blendSpace} / ${c.colorSpace})`);
    ok(maxDelta(res!.ramp, gradientDisplayRamp(c)) === 0, '[9] its ramp is the config\'s display ramp');
    ok(res!.name === NAME, `[9] and its name (got ${JSON.stringify(res!.name)})`);
  }
  const bare = parseGradientText(JSON.stringify(stops), 'json');
  ok(!!bare?.config && bare.config.stops[3].position === 0.731 && bare.config.stops[3].interpolation === 'cubic', '[9] a bare array of positioned stops is exact too');
  const zebra = Array.from({ length: 256 }, (_, i) => (i % 2 ? { r: 255, g: i, b: 0 } : { r: 0, g: 0, b: 255 - i }));
  const { encodeRamp, isRampGradient } = await import('../utils/gradientRamp');
  const rampStr = encodeRamp(zebra);
  const rr = parseGradientText(JSON.stringify({ stops: [], ramp: rampStr, colorSpace: 'srgb', blendSpace: 'oklab' }), 'json');
  ok(!!rr?.config && isRampGradient(rr.config) && rr.config.ramp === rampStr, '[9] a RAMP config (stops: [] + ramp) returns its ramp verbatim');
  ok(!!rr && rr.ramp.every((t, i) => t.r === zebra[i].r && t.g === zebra[i].g && t.b === zebra[i].b), '[9] …and its texels are the ramp');
  // A list the gate would thin is not a gradient we can reproduce: colours, as before.
  const thinned = parseGradientText(JSON.stringify({ stops: [{ position: 0, color: '#000000' }, { color: '#FF0000' }, { position: 1, color: '#FFFFFF' }] }), 'json');
  ok(!!thinned && !thinned.config && ri(thinned.ramp[128])[0] > 200 && ri(thinned.ramp[128])[1] < 60, `[9] a stop the gate would drop → colours evenly spaced, no config (texel 128 ${thinned ? ri(thinned.ramp[128]).join(',') : 'null'})`);
  const legacy = parseGradientText(getExportFormat('json')!.build(RAMPS[0].ramp, NAME) as string, 'json');
  ok(!!legacy && !legacy.config && legacy.name === NAME && maxDelta(legacy.ramp, RAMPS[0].ramp) === 0, '[9] {name, colors} is unchanged and keeps its name');
}

console.log('[10] CSS variables and design tokens import the colours they list');
{
  const worst = (text: string, ext: string, colors: RGB[]): number => {
    const res = parseGradientText(text, ext);
    if (!res) return Infinity;
    let w = 0;
    colors.forEach((col, k) => { w = Math.max(w, oklabDistance(col, res.ramp[Math.round((k / (colors.length - 1)) * 255)])); });
    return w;
  };
  for (const key of ['cssvars', 'tokens']) {
    const f = getExportFormat(key)!;
    for (const { name, ramp } of RAMPS) {
      const eleven = Array.from({ length: 11 }, (_, k) => { const c = ramp[Math.round((k / 10) * 255)]; return { r: Math.round(c.r), g: Math.round(c.g), b: Math.round(c.b) }; });
      const d = worst(f.build(ramp, name) as string, f.ext, eleven);
      ok(d <= 0.02, `[10] ${key}: "${name}" — its 11 colours come back within ΔE 0.02 (worst ${d.toFixed(4)})`);
    }
    const d7 = worst(f.swatches!(SEVEN, NAME) as string, f.ext, SEVEN);
    ok(d7 <= 0.02, `[10] ${key} swatches: seven colours come back in order within ΔE 0.02 (worst ${d7.toFixed(4)})`);
  }
  // The DTCG 2025 object form and an inherited group $type.
  const dtcg = { brand: { $type: 'color', a: { $value: { colorSpace: 'srgb', components: [1, 0, 0] } }, b: { $value: { hex: '#0000ff' } }, gap: { $type: 'dimension', $value: '4px' } } };
  const t = parseGradientText(JSON.stringify(dtcg), 'json');
  ok(!!t && ri(t.ramp[0]).join() === '255,0,0' && ri(t.ramp[255]).join() === '0,0,255', `[10] tokens: object-form values and an inherited $type read, a dimension skipped (${t ? ri(t.ramp[0]) + ' → ' + ri(t.ramp[255]) : 'null'})`);
}

console.log('[11] an extension we do not parse is refused, never sniffed as another format');
{
  const ramp = RAMPS[2].ramp;
  const gplText = getExportFormat('gpl')!.build(ramp, NAME) as string;
  for (const key of ['ai', 'svg', 'ugr', 'c4d']) {
    const f = getExportFormat(key)!;
    const out = f.build(ramp, NAME);
    const text = typeof out === 'string' ? out : new TextDecoder().decode(out);
    ok(parseGradientText(text, f.ext.split('.').pop()) === null, `[11] our own .${f.ext} is refused`);
  }
  ok(parseGradientText(gplText, 'ai') === null, '[11] a GIMP palette named .ai is refused (the extension decides)');
  ok(parseGradientText(gplText, 'png') === null, '[11] …and named .png');
  ok(parseGradientText(gplText, '')?.format === 'gpl', '[11] no extension → sniffed');
  ok(parseGradientText(gplText, 'txt')?.format === 'gpl', '[11] .txt → sniffed');
  ok(parseGradientText(gplText, 'GPL')?.format === 'gpl', '[11] an upper-case extension is still ours');
  ok(parseGradientText(getExportFormat('cssvars')!.build(ramp, NAME) as string)?.format === 'css', '[11] CSS variables with no extension sniff as css');
}

if (failures) {
  console.error(`\nimportFormats: ${failures} FAILED`);
  process.exit(1);
}
console.log('\nimportFormats: all green');
