/**
 * test-gradient-roundtrip — THE FIDELITY GUARD for every way a gradient leaves the app and comes
 * back (ADR-0123 Consequences, `plans/gradient-file-format.md` item 4). Every (path × format ×
 * corpus item) cell has an EXPECTED CLASS; the harness exports exactly as the app does, imports
 * through the one loader (`palette/core/importGradientFiles.ts`), prints the matrices, and exits 1
 * naming every cell that falls short of its class.
 *
 * Run: `npm run test:gradient-roundtrip` (node only, no browser, a few seconds). Last link of
 * `npm run test:palette`.
 *
 * Paths (rows) × corpus (columns, six gradients, each named with a space + a non-ASCII char):
 *   GMT  the GMT gradient file: ONE gradient through the real `runGradientFile` (.png, .json), and
 *        a SET through `runSetGradientFile` (.png, .json), each captured as the browser download
 *        and handed to the router; plus the same PNGs with the `iTXt` chunk stripped
 *        (`pngCodec.stripPngText`) — the copy a chat app or "copy image" leaves.
 *   A    every EXPORT_FORMATS entry, single gradient, through the REAL `runExport` (download
 *        captured by a `document.createElement('a')` / `URL.createObjectURL` shim), ramp subject
 *        and — for formats with one — swatches subject.
 *   B    the set through the REAL `runSetExport`: the .zip (or collection file) offered AS-IS to
 *        the router, as a drop would.
 *   C    `exportCollection()` → `importCollection(json, 'replace' | 'merge')` into an empty and a
 *        non-empty shelf (real favientsStore on a localStorage shim), and the same file routed.
 *   D    share link `encodeShare` → `decodeShare`.
 *   E    session: `saveSessionFile` (captured download) → `applySessionText`, against a real
 *        engine store with the working / stops / generator providers.
 *   F    the editor's Copy Gradient JSON (`handleCopy`'s shape, mirrored — it lives in a
 *        component) → (a) `normalizePaste` + `handlePaste`'s space rules, (b) saved as `.json` →
 *        the router, (c) the same with a `name`.
 *   G    cross-routing: the collection JSON, a session, an .svg, a .zip, a GMT PNG, a stripped PNG.
 *
 * CLASSES (the ADR's, asserted per cell):
 *   EXACT        config equal — stops (position, colour, bias, interpolation), blendSpace,
 *                colorSpace, ramp form and texels — AND the name exact. GMT file .png / .json (and
 *                its origin, source, set), collection replace / merge, session, editor paste,
 *                `{stops}` JSON. DEVIATIONS, each justified at its cell: the share link's positions
 *                are the wire's 4 decimals unless a stop would cross a texel (`shareUrl.ts`
 *                `wirePosition`, owner-accepted in the plan); the `{stops}` copy carries no name, so
 *                its name is the filename's; a merge into a shelf that already holds a byte-identical
 *                gradient keeps the existing entry (the dedupe is the point).
 *   COLOURS      max ΔE ≤ 0.025 (OKLab) on the 8-bit-rounded display ramps — the documented
 *                near-black re-fit slack is .022 (item 1 via .map). Stripped GMT PNG,
 *                .map / .gpl / .ggr / .cpt / .json (colours).
 *   REDUCED      lossy by nature — css linear-gradient, CSS variables, design tokens, and every
 *                swatches subject: the measured max ΔE may not exceed today's measurement
 *                (`REDUCED_TODAY`, written next to it) by more than `REDUCED_MARGIN`.
 *   EXPORT-ONLY  no importer: the build succeeds (one non-empty download) and the router REFUSES
 *                the file — zero gradients, not a garbage import.
 *   NAME         exact where the file carries a name (GMT file, .json, .gpl, .ggr, .cpt, css /
 *                cssvars comment, tokens; .grd: the name's bytes are in the file, which has no
 *                importer); otherwise the un-slugged filename stem (`unslugStem`, written out here
 *                rather than imported, so a router that stops un-slugging goes red) — except a
 *                member of a SET .zip, whose filename is `NNN_<name>` since 2026-09-16 and must
 *                come back as the name exactly (a credit's `/` as `-`, as on a single download).
 *   SETS         count and order for the GMT set file (and its stripped PNG) and every set .zip.
 * A new EXPORT_FORMATS entry with no class is itself a violation.
 *
 * ΔE is measured byte-vs-byte (both display ramps rounded to 8 bits): rounding item 1's float
 * ramp alone costs 0.051 at a near-black texel, which is the quantiser, not any format.
 *
 * Measured on the tree of 2026-09-14 after items 1–3 landed: every cell passes (see the report
 * the harness prints). It was REPORT MODE before that; the report's hand-checks still hold: A/map/
 * item 1 = 0.022 at texel 23 ((2,2,2) came back (4,4,4)); D/item 3 used to be 0.279 at texel 85
 * (4-dp rounding of a step edge), fixed by `wirePosition`.
 *
 * FALSIFIED 2026-09-14, each against the real source, then restored byte-for-byte (sha1 checked);
 * every run below exited 1 and every other cell stayed green:
 *   1. `gradientPng.writeGradientPng` writing the iTXt document with every stop's `bias` dropped →
 *      2 red: "GMT .png / 2 bias [EXACT] — 4 bias≠", "GMT set .png / 2 bias [EXACT + SETS order]".
 *      (Only item 2 authors a bias other than 0.5; the stripped rows stay green, as they should —
 *      the pixels are drawn from the real config.)
 *   2. `gradientPng` `readBands` reading texel t from the NEXT 4-px column (`min(t + 1, 255)`) →
 *      10 red: "GMT .png stripped / {1 bw .067, 2 bias .034, 3 step .315, 5 ramp .596, 6 dense40
 *      .055} [COLOURS]" and the same five in "GMT set .png stripped … (SETS order)". Item 4 (a
 *      smooth linear-light ramp) stays inside .025 by nature.
 *   3. The `{stops}` JSON importer respacing evenly again. The router holds that exactness TWICE:
 *      `gradientDocument.decodeGradientDocument`'s `{stops}` branch (reached first) and
 *      `importFormats.exactJsonConfig` (reached when the first refuses). Breaking EITHER alone left
 *      all 977 checks green — measured, both ways; breaking BOTH → 12 red: "F {stops} .json /
 *      {1..6} [EXACT]" and "F {name, stops} .json / {1..6} [EXACT]" (e.g. "3 step — pos±8.3e-2, 8
 *      colours≠, 12 interp≠", "4 linCS — stops 4→6, cs linear→srgb", "5 ramp — imported 0").
 *      Each layer alone is guarded by its own harness (`test:gradient-file` [1],
 *      `test-palette-importformats.mts` [9]).
 *   4. `importFormats.parseGradientText` sniffing ANY unknown extension (`else key = sniff(text)`)
 *      → 4 red: "A ramp .ai (ai) / {1 bw, 3 step, 6 dense40} [EXPORT-ONLY refused] — the router
 *      imported 1 gradient(s)", "B set ramp .ai (ai) [EXPORT-ONLY refused]". (The .ai sniffs as
 *      .cpt; items 2, 4 and 5 happen not to parse.)
 *   5. `importFormats` `parseGplFull` ignoring the `Name:` line → 24 red: "A ramp .gpl / {1..6}
 *      [NAME file]", "A swatches .gpl / {1..6}", "B set ramp .gpl / {1..6}", "B set swatches .gpl /
 *      {1..6}" (e.g. `name "Sea Glass" ≠ "Sea Glass é"` — the slugged filename's stem).
 *   6. (2026-09-16, the set .zip's member names) `favientsExport.zipMemberName` slugging again → 6
 *      red: "B set ramp .map (map) / {1..6} [NAME filename]" (e.g. `"Stufe B nder" ≠ "Stufe Bänder
 *      ä"`); the router keeping the `NNN_` index → the same 6 (`"001 Noir Blanc é"`); `runSetExport`
 *      not passing the member stems → 1, item 6 (`"… (cpt-citytest, CC BY 3.0)"`).
 */

// ── window / document / URL shims, BEFORE any store module loads ────────────────────────────
const disk = new Map<string, string>();
const listeners = new Map<string, Set<() => void>>();
const on = (t: string, fn: () => void) => { if (!listeners.has(t)) listeners.set(t, new Set()); listeners.get(t)!.add(fn); };
const off = (t: string, fn: () => void) => { listeners.get(t)?.delete(fn); };
const lsShim = {
  getItem: (k: string) => (disk.has(k) ? disk.get(k)! : null),
  setItem: (k: string, v: string) => { disk.set(k, String(v)); },
  removeItem: (k: string) => { disk.delete(k); },
  clear: () => disk.clear(),
  get length() { return disk.size; },
  key: (i: number) => [...disk.keys()][i] ?? null,
};
(globalThis as any).window = {
  localStorage: lsShim,
  addEventListener: on,
  removeEventListener: off,
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }),
  innerWidth: 1920,
  innerHeight: 1080,
  devicePixelRatio: 1,
  location: { search: '', href: 'http://localhost/', hash: '' },
};
(globalThis as any).localStorage = lsShim;
(globalThis as any).matchMedia = (globalThis as any).window.matchMedia;
(globalThis as any).location = (globalThis as any).window.location;

/** Every download the app starts, in order: the filename it would save and the bytes. */
const downloads: { name: string; blob: Blob }[] = [];
const blobUrls = new Map<string, Blob>();
let urlSeq = 0;
(URL as any).createObjectURL = (b: Blob) => { const u = `blob:rt/${urlSeq++}`; blobUrls.set(u, b); return u; };
(URL as any).revokeObjectURL = () => {};
(globalThis as any).document = {
  visibilityState: 'visible',
  addEventListener: on,
  removeEventListener: off,
  createElement: (tag: string) => {
    if (tag !== 'a') throw new Error(`createElement(${tag}) not shimmed`);
    const a = { href: '', download: '', click() { downloads.push({ name: a.download, blob: blobUrls.get(a.href)! }); } };
    return a;
  },
};
const takeDownloads = () => downloads.splice(0, downloads.length);

// ── the engine store half first (feature registry freezes when the store is built) ─────────
const { featureRegistry } = await import('../engine/FeatureSystem');
featureRegistry.register((await import('../palette/features/paletteGenerator')).PaletteGeneratorFeature);
featureRegistry.register((await import('../palette/features/paletteImage')).PaletteImageFeature);
featureRegistry.register((await import('../palette/features/paletteFilters')).PaletteFiltersFeature);
const { registerDocumentProvider } = await import('../store/documentRegistry');
const { registerHistoryProvider } = await import('../store/slices/historySlice');
const { captureEditorConfig, applyEditorConfig, usePaletteEditorStore } = await import('../palette/store/paletteEditorStore');
const { generatorHistoryProvider } = await import('../palette/store/generatorStore');
const { serializeGeneratorDocument, restoreGeneratorDocument } = await import('../palette/store/generatorDocument');
const { installWorking } = await import('../palette/installWorking');
registerHistoryProvider('paletteEditor', { capture: captureEditorConfig, restore: applyEditorConfig });
registerDocumentProvider('stops', { serialize: captureEditorConfig, restore: applyEditorConfig });
registerHistoryProvider('paletteGenerator', generatorHistoryProvider);
registerDocumentProvider('generator', { serialize: serializeGeneratorDocument, restore: restoreGeneratorDocument });
let imageDoc: any = { src: null };
registerDocumentProvider('image', { serialize: () => imageDoc, restore: (s: any) => { imageDoc = s; } });
installWorking();
await import('../store/engineStore');
const { useWorkingStore, autoWorkingName } = await import('../palette/store/workingStore');
const { workingSessionAdapter } = await import('../palette/store/workingSession');
const { saveSessionFile, applySessionText } = await import('../engine/plugins/Session');

// ── the modules under measurement ───────────────────────────────────────────────────────────
const { EXPORT_FORMATS } = await import('../palette/core/exportFormats');
const { parseGradientImports, readGradientFiles } = await import('../palette/core/importGradientFiles');
const { runExport, runSetExport, runGradientFile, runSetGradientFile, slugName } = await import('../gradient-explorer/v2/exportActions');
const { GX_SESSION_SUFFIX } = await import('../gradient-explorer/v2/session');
const { useFavientsStore, RECENT_GROUP, favientSig } = await import('../palette/store/favientsStore');
const { encodeShare, decodeShare } = await import('../gradient-explorer/v2/shareUrl');
const { normalizePaste } = await import('../utils/stopOps');
const { editorAffordances } = await import('../components/gradient/rampMode');
const { gradientDisplayRamp } = await import('../palette/core/gmtGradient');
const { oklabDistance } = await import('../palette/core/oklab');
const { encodeRamp, isRampGradient } = await import('../utils/gradientRamp');
const { stripPngText, readPngTextChunks } = await import('../utils/pngCodec');
const { layoutPositions, swatchesAt } = await import('../palette/core/paletteSample');
const { originKey, withExportName } = await import('../palette/core/catalogOrigin');
const { unzipSync } = await import('fflate');
type GradientConfig = import('../types').GradientConfig;
type RGB = { r: number; g: number; b: number };

// ── corpus ──────────────────────────────────────────────────────────────────────────────────
const hsvHex = (h: number, s: number, v: number): string => {
  const f = (n: number) => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); };
  return '#' + [f(5), f(3), f(1)].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
};
interface Item { key: string; name: string; config: GradientConfig }
const CORPUS: Item[] = [
  {
    key: '1 bw', name: 'Noir Blanc é',
    config: { stops: [
      { id: 'a', position: 0, color: '#000000', bias: 0.5, interpolation: 'linear' },
      { id: 'b', position: 1, color: '#FFFFFF', bias: 0.5, interpolation: 'linear' },
    ], colorSpace: 'srgb', blendSpace: 'oklab' },
  },
  {
    key: '2 bias', name: 'Sea Glass é',
    config: { stops: [
      { id: 'a', position: 0, color: '#0B3D4F', bias: 0.3, interpolation: 'linear' },
      { id: 'b', position: 0.18, color: '#2A9D8F', bias: 0.7, interpolation: 'smooth' },
      { id: 'c', position: 0.47, color: '#E9C46A', bias: 0.2, interpolation: 'linear' },
      { id: 'd', position: 0.73, color: '#F4A261', bias: 0.85, interpolation: 'smooth' },
      { id: 'e', position: 1, color: '#E76F51', bias: 0.5, interpolation: 'linear' },
    ], colorSpace: 'srgb', blendSpace: 'hsv' },
  },
  {
    key: '3 step', name: 'Stufe Bänder ä',
    config: { stops: Array.from({ length: 12 }, (_, i) => ({
      id: `s${i}`, position: i / 12, color: hsvHex((i * 360) / 12, 0.75, i % 2 ? 0.95 : 0.6), bias: 0.5, interpolation: 'step' as const,
    })), colorSpace: 'srgb', blendSpace: 'oklab' },
  },
  {
    key: '4 linCS', name: 'Linear Pick ø',
    config: { stops: [
      { id: 'a', position: 0, color: '#1B0A3A', bias: 0.5, interpolation: 'linear' },
      { id: 'b', position: 0.4, color: '#B8336A', bias: 0.5, interpolation: 'linear' },
      { id: 'c', position: 0.75, color: '#F6AE2D', bias: 0.5, interpolation: 'linear' },
      { id: 'd', position: 1, color: '#FFF8E7', bias: 0.5, interpolation: 'linear' },
    ], colorSpace: 'linear', blendSpace: 'oklab' },
  },
  {
    key: '5 ramp', name: 'Zebra Phase ß',
    config: {
      stops: [],
      ramp: encodeRamp(Array.from({ length: 256 }, (_, i) => ((i + 1) % 2 ? { r: 240, g: 230, b: 200 } : { r: 20, g: Math.round(i * 0.6), b: 255 - i }))),
      colorSpace: 'srgb', blendSpace: 'oklab',
    },
  },
  {
    key: '6 dense40', name: 'Spectrum Wheel ü',
    config: { stops: Array.from({ length: 40 }, (_, i) => ({
      id: `w${i}`, position: i / 39, color: hsvHex((i * 720) / 39 % 360, 0.55 + 0.4 * Math.sin(i * 0.7) ** 2, 0.45 + 0.5 * Math.cos(i * 0.45) ** 2), bias: 0.5, interpolation: 'smooth' as const,
    })), colorSpace: 'srgb', blendSpace: 'oklab' },
  },
];
/** Item 6 is an unmodified catalogue pick: its origin must ride the GMT file and the collection. */
const ORIGIN6 = { ref: 'cpt-city/test', credit: 'cpt-city/test, CC BY 3.0', key: originKey(CORPUS[5].config) };
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

// ── the expected classes ────────────────────────────────────────────────────────────────────
type Klass = 'EXACT' | 'COLOURS' | 'REDUCED' | 'EXPORT-ONLY';
const COLOURS_MAX = 0.025;

/** The RAMP subject, by EXPORT_FORMATS key. A key missing here is a violation. */
const RAMP_CLASS: Record<string, Klass> = {
  map: 'COLOURS', gpl: 'COLOURS', ggr: 'COLOURS', cpt: 'COLOURS', json: 'COLOURS',
  // CSS honours a stop budget and cannot express a ramp; variables / tokens are 11 even colours.
  css: 'REDUCED', cssvars: 'REDUCED', tokens: 'REDUCED',
  hex: 'EXPORT-ONLY', svg: 'EXPORT-ONLY', js: 'EXPORT-ONLY', py: 'EXPORT-ONLY', csv: 'EXPORT-ONLY',
  pdn: 'EXPORT-ONLY', grd: 'EXPORT-ONLY', c4d: 'EXPORT-ONLY', blender: 'EXPORT-ONLY', ai: 'EXPORT-ONLY',
  idml: 'EXPORT-ONLY', ugr: 'EXPORT-ONLY', ase: 'EXPORT-ONLY', tw: 'EXPORT-ONLY',
};
/** The SWATCHES subject, by key, for formats with a `swatches` builder. A 7-colour palette is a
 *  reduction of the gradient by nature, so the importable ones are REDUCED, never COLOURS. */
const SWATCH_CLASS: Record<string, Klass> = {
  json: 'REDUCED', gpl: 'REDUCED', tokens: 'REDUCED', cssvars: 'REDUCED',
  hex: 'EXPORT-ONLY', js: 'EXPORT-ONLY', py: 'EXPORT-ONLY', csv: 'EXPORT-ONLY', pdn: 'EXPORT-ONLY', ase: 'EXPORT-ONLY', tw: 'EXPORT-ONLY',
};
/** Formats whose FILE carries the gradient's name, which must come back exactly. */
const RAMP_NAME_IN_FILE = new Set(['json', 'gpl', 'ggr', 'cpt', 'css', 'cssvars', 'tokens']);
const SWATCH_NAME_IN_FILE = new Set(['json', 'gpl', 'tokens', 'cssvars']);

/**
 * REDUCED bounds: max ΔE measured 2026-09-14 on the tree that landed plan items 1–3, per corpus
 * item, rounded UP to 3 dp. A cell fails when it measures more than today + REDUCED_MARGIN — so a
 * regression still shows, and a real improvement is printed as "tighten". The swatches rows are
 * the 7 colours at their even positions (palette ΔE), not the whole ramp.
 */
const REDUCED_MARGIN = 0.01;
const REDUCED_TODAY: Record<string, readonly number[]> = {
  //                  1 bw   2 bias 3 step 4 linCS 5 ramp 6 dense40
  // measured:        .0672  .0195  .0301  .0033  .5866  .0471  (single and set zip alike)
  'ramp:css':        [0.068, 0.020, 0.031, 0.004, 0.587, 0.048],
  // measured:        .0847  .0946  .2604  .0157  .5942  .2323  (11 even colours; tokens identical)
  'ramp:cssvars':    [0.085, 0.095, 0.261, 0.016, 0.595, 0.233],
  'ramp:tokens':     [0.085, 0.095, 0.261, 0.016, 0.595, 0.233],
  // measured:        .0000  .0173  .0036  .0113  .0065  .0127  (all four formats, single and set zip)
  'swatches:json':   [0.000, 0.018, 0.004, 0.012, 0.007, 0.013],
  'swatches:gpl':    [0.000, 0.018, 0.004, 0.012, 0.007, 0.013],
  'swatches:tokens': [0.000, 0.018, 0.004, 0.012, 0.007, 0.013],
  'swatches:cssvars':[0.000, 0.018, 0.004, 0.012, 0.007, 0.013],
};

// ── assertions ──────────────────────────────────────────────────────────────────────────────
let checks = 0;
const violations: string[] = [];
const notes: string[] = [];
/** Assert one cell; returns whether it passed so the matrix can mark it. */
const check = (cell: string, pass: boolean, why: string): boolean => {
  checks++;
  if (!pass) violations.push(`${cell} — ${why}`);
  return pass;
};
const mark = (pass: boolean) => (pass ? '✓' : '✗');

// ── measurement helpers ─────────────────────────────────────────────────────────────────────
/** Byte-quantised: every file format and the GPU texture are 8-bit (see the header). */
const qRamp = (r: RGB[]): RGB[] => r.map((c) => ({ r: Math.round(c.r), g: Math.round(c.g), b: Math.round(c.b) }));
const rampDelta = (ra: RGB[], rb: RGB[]) => {
  let max = 0, sum = 0;
  for (let i = 0; i < 256; i++) { const d = oklabDistance(ra[i], rb[i]); if (d > max) max = d; sum += d; }
  return { max, mean: sum / 256 };
};
const deltaE = (a: GradientConfig, b: GradientConfig) => rampDelta(qRamp(gradientDisplayRamp(a)), qRamp(gradientDisplayRamp(b)));
/** The 7 even swatches of a gradient against the imported gradient at those positions. */
const paletteOf = (c: GradientConfig): RGB[] => { const ramp = gradientDisplayRamp(c); return swatchesAt(ramp, layoutPositions('even', 7, ramp, c)).map((s) => s.color); };
const paletteDelta = (palette: RGB[], back: GradientConfig): number => {
  const br = gradientDisplayRamp(back);
  let pmax = 0;
  palette.forEach((c, k) => { pmax = Math.max(pmax, oklabDistance(qRamp([c])[0], qRamp([br[Math.round((k / (palette.length - 1)) * 255)]])[0])); });
  return pmax;
};
const formOf = (c: GradientConfig) => (isRampGradient(c) ? 'R' : `S${c.stops.length}`);
const normStops = (c: GradientConfig) =>
  [...c.stops].sort((x, y) => x.position - y.position).map((s) => ({ p: s.position, c: s.color.toUpperCase(), b: s.bias ?? 0.5, i: s.interpolation ?? 'linear' }));
/** Everything that differs between two configs, as short tags. Empty = EXACT. `posTol` is 0 except
 *  for the share link's documented wire precision. */
const configDiff = (orig: GradientConfig, back: GradientConfig, posTol = 0): string[] => {
  const out: string[] = [];
  if (formOf(orig)[0] !== formOf(back)[0]) out.push(`form ${formOf(orig)}→${formOf(back)}`);
  if (isRampGradient(orig)) {
    if (!isRampGradient(back) || back.ramp !== orig.ramp) out.push('ramp≠');
  } else {
    const a = normStops(orig), b = normStops(back);
    if (a.length !== b.length) out.push(`stops ${a.length}→${b.length}`);
    else {
      let posErr = 0, col = 0, bias = 0, interp = 0;
      a.forEach((s, i) => {
        posErr = Math.max(posErr, Math.abs(s.p - b[i].p));
        if (s.c !== b[i].c) col++;
        if (Math.abs(s.b - b[i].b) > 1e-9) bias++;
        if (s.i !== b[i].i) interp++;
      });
      if (posErr > posTol + 1e-12) out.push(`pos±${posErr.toExponential(1)}`);
      if (col) out.push(`${col} colours≠`);
      if (bias) out.push(`${bias} bias≠`);
      if (interp) out.push(`${interp} interp≠`);
    }
  }
  if ((orig.blendSpace ?? 'oklab') !== (back.blendSpace ?? 'oklab')) out.push(`blend ${orig.blendSpace}→${back.blendSpace}`);
  if ((orig.colorSpace ?? 'srgb') !== (back.colorSpace ?? 'srgb')) out.push(`cs ${orig.colorSpace}→${back.colorSpace}`);
  return out;
};
const f3 = (x: number) => x.toFixed(3).replace(/^0/, '');
const f4 = (x: number) => x.toFixed(4).replace(/^0/, '');

/**
 * The name a file that carries none must come back with: its filename's stem, un-slugged —
 * directory and extension dropped (`.gmt-gradients.json` / `.gxsession.json` as one extension),
 * `_` read as a space, trimmed. Written out, not imported from the router.
 */
const unslugStem = (fileName: string): string => {
  const base = fileName.slice(Math.max(fileName.lastIndexOf('/'), fileName.lastIndexOf('\\')) + 1);
  const dbl = /\.(gmt-gradients|gxsession)\.json$/i;
  const stem = dbl.test(base) ? base.replace(dbl, '') : base.replace(/\.[^.]*$/, '');
  return stem.replace(/_/g, ' ').trim();
};

const COLW = 16;
const printTable = (title: string, rows: { label: string; cells: string[]; note?: string }[], cols = CORPUS.map((c) => c.key)) => {
  console.log(`\n${title}`);
  const LW = Math.max(14, ...rows.map((r) => r.label.length)) + 1;
  console.log(''.padEnd(LW) + cols.map((c) => c.padEnd(COLW)).join('') + 'note');
  for (const r of rows) console.log(r.label.padEnd(LW) + r.cells.map((c) => (c.length > COLW - 1 ? c.slice(0, COLW - 2) + '…' : c).padEnd(COLW)).join('') + (r.note ?? ''));
};

/** Offer files to the router exactly as the picker / drop does (bytes, content-routed). */
const importFiles = async (files: { name: string; blob: Blob }[]) => {
  const reads = await readGradientFiles(files.map((d) => new File([d.blob], d.name)));
  return parseGradientImports(reads);
};
const bytesOf = async (b: Blob) => new Uint8Array(await b.arrayBuffer());

/**
 * One imported-gradient cell against its class. Returns the matrix text. `bound` is REDUCED's
 * per-item bound; `palette` switches the measure to the swatches' palette ΔE.
 */
const gradeCell = (cell: string, klass: Klass, it: Item, i: number, back: GradientConfig, reducedKey: string, palette?: RGB[]): string => {
  const d = palette ? paletteDelta(palette, back) : deltaE(it.config, back).max;
  if (klass === 'COLOURS') return `${mark(check(`${cell} [COLOURS]`, d <= COLOURS_MAX, `max ΔE ${f4(d)} > ${COLOURS_MAX}`))}${f3(d)} ${formOf(back)}`;
  if (klass === 'REDUCED') {
    const today = REDUCED_TODAY[reducedKey]?.[i];
    if (today === undefined) { check(`${cell} [REDUCED]`, false, `no REDUCED_TODAY bound for ${reducedKey}`); return '✗ no bound'; }
    const pass = check(`${cell} [REDUCED ≤ ${f3(today)}+${REDUCED_MARGIN}]`, d <= today + REDUCED_MARGIN, `max ΔE ${f4(d)} is worse than today's ${f3(today)} by more than ${REDUCED_MARGIN}`);
    if (d < today - 2 * REDUCED_MARGIN) notes.push(`${cell}: measures ${f4(d)}, well under today's ${f3(today)} — tighten REDUCED_TODAY`);
    return `${mark(pass)}${f4(d)}≤${f3(today + REDUCED_MARGIN)}`;
  }
  const diffs = configDiff(it.config, back);
  return `${mark(check(`${cell} [EXACT]`, diffs.length === 0, diffs.join(', ')))}${diffs.join(',') || 'exact'}`;
};

/** An EXPORT-ONLY file: built (one non-empty download) and refused by the router. */
const gradeExportOnly = async (cell: string, dl: { name: string; blob: Blob }[]): Promise<string> => {
  if (!check(`${cell} [EXPORT-ONLY build]`, dl.length === 1 && dl[0].blob.size > 0, `${dl.length} downloads${dl[0] ? `, ${dl[0].blob.size} bytes` : ''}`)) return '✗ no build';
  const res = await importFiles(dl);
  const refused = res.items.length === 0 && res.sessions.length === 0 && res.scenes.length === 0;
  check(`${cell} [EXPORT-ONLY refused]`, refused, `the router imported ${res.items.length} gradient(s) (${res.items.map((x) => formOf(x.config)).join(',')}) / ${res.sessions.length} session(s) from a file it has no importer for`);
  return refused ? '— refused' : `✗ took ${res.items.length}`;
};

// Sanity pin for the ΔE measure itself: identical → 0; black→white vs black→black is large.
{
  const same = deltaE(CORPUS[0].config, clone(CORPUS[0].config));
  const diff = deltaE(CORPUS[0].config, { ...CORPUS[0].config, stops: CORPUS[0].config.stops.map((s) => ({ ...s, color: '#000000' })) });
  check('sanity ΔE', same.max === 0 && diff.max > 0.9, `identical ${same.max}, black→white vs black ${diff.max}`);
  console.log(`(sanity) ΔE identical max=${same.max} · black→white vs flat black max=${diff.max.toFixed(3)} — all ΔE below are byte-vs-byte`);
}
// Every export format has a class (a new format must be classified here before it ships).
for (const f of EXPORT_FORMATS) {
  check(`classes: ramp .${f.ext} (${f.key})`, !!RAMP_CLASS[f.key], 'unclassified export format — add it to RAMP_CLASS');
  if (f.swatches) check(`classes: swatches .${f.ext} (${f.key})`, !!SWATCH_CLASS[f.key], 'unclassified swatches format — add it to SWATCH_CLASS');
}

// ═══ GMT. the GMT gradient file ═════════════════════════════════════════════════════════════
const SET = 'Meine Sammlung ü';
const SET_GROUP = 'grp-rt-set';
/** The set as favourites: one labelled set, item 6 an unmodified catalogue pick. */
const setFavs = () =>
  CORPUS.map((it, i) => ({
    id: `fav-${i}`, name: it.name, config: clone(it.config), createdAt: 1_700_000_000_000 + i, group: SET_GROUP, source: 'Browse',
    ...(i === 5 ? { origin: clone(ORIGIN6) } : {}),
  }));
{
  const rows: { label: string; cells: string[]; note?: string }[] = [];
  for (const kind of ['png', 'json'] as const) {
    const exact: string[] = [];
    const stripped: string[] = [];
    let fname = '';
    for (const it of CORPUS) {
      const cell = `GMT .${kind} / ${it.key}`;
      const origin = it.key === '6 dense40' ? ORIGIN6 : undefined;
      runGradientFile(kind, it.name, { config: clone(it.config), ...(origin ? { origin } : {}), source: 'Browse' });
      const dl = takeDownloads();
      if (!check(`${cell} [EXACT]`, dl.length === 1, `${dl.length} downloads`)) { exact.push('✗ no file'); continue; }
      fname = dl[0].name;
      const res = await importFiles(dl);
      if (!check(`${cell} [EXACT]`, res.items.length === 1, `imported ${res.items.length}`)) { exact.push(`✗ ${res.items.length} items`); continue; }
      const back = res.items[0];
      // EXACT: the config, and what the file carries beside it (catalogue credit, source).
      const diffs = configDiff(it.config, back.config);
      if (JSON.stringify(back.origin ?? null) !== JSON.stringify(origin ?? null)) diffs.push(`origin ${JSON.stringify(back.origin ?? null)}`);
      if (back.source !== 'Browse') diffs.push(`source "${back.source}"`);
      const pass = check(`${cell} [EXACT]`, diffs.length === 0, diffs.join(', '));
      const npass = check(`${cell} [NAME file]`, back.name === it.name, `name ${JSON.stringify(back.name)} ≠ ${JSON.stringify(it.name)}`);
      exact.push(`${mark(pass && npass)}${diffs.join(',') || 'exact'} ${formOf(back.config)}`);

      if (kind === 'png') {
        const scell = `GMT .png stripped / ${it.key}`;
        const bytes = stripPngText(await bytesOf(dl[0].blob));
        if (!check(`${scell} [COLOURS]`, !!bytes && readPngTextChunks(bytes).length === 0, 'stripPngText left a text chunk (the cell would measure the metadata)')) { stripped.push('✗ strip'); continue; }
        const sres = await importFiles([{ name: fname, blob: new Blob([bytes as unknown as BlobPart]) }]);
        if (!check(`${scell} [COLOURS]`, sres.items.length === 1 && sres.files[0]?.kind === 'gradients' && !(sres.files[0] as any).document, `imported ${sres.items.length} (${sres.files.map((f) => f.kind).join(',')})`)) { stripped.push(`✗ ${sres.items.length} items`); continue; }
        const sb = sres.items[0];
        const txt = gradeCell(scell, 'COLOURS', it, CORPUS.indexOf(it), sb.config, '');
        check(`${scell} [COLOURS]`, isRampGradient(sb.config), `came back as ${formOf(sb.config)}, not a ramp (the band reader writes ramps)`);
        // No metadata: the name is the filename's — which `gradientFileStem` keeps as the real name,
        // and for an unmodified catalogue pick as the credited name.
        const nOk = check(`${scell} [NAME filename]`, sb.name === unslugStem(fname), `name ${JSON.stringify(sb.name)} ≠ ${JSON.stringify(unslugStem(fname))}`);
        if (origin) check(`${scell} [NAME filename]`, sb.name.includes(ORIGIN6.credit.replace('/', '-')), `the stripped copy lost the credit its filename carries (${JSON.stringify(sb.name)})`);
        stripped.push(`${nOk ? txt : txt.replace(/^✓/, '✗')}`);
      }
    }
    rows.push({ label: `one .${kind}`, cells: exact, note: `EXACT + NAME file; "${fname}"` });
    if (kind === 'png') rows.push({ label: 'one .png strip', cells: stripped, note: 'COLOURS + NAME filename' });
  }

  // The SET: one file, every member back with its set, in order.
  useFavientsStore.setState({ groupLabels: { ...useFavientsStore.getState().groupLabels, [SET_GROUP]: SET } });
  const favs = setFavs();
  for (const kind of ['png', 'json'] as const) {
    const cellBase = `GMT set .${kind}`;
    runSetGradientFile(kind, favs as any, SET);
    const dl = takeDownloads();
    if (!check(`${cellBase} [SETS]`, dl.length === 1, `${dl.length} downloads`)) continue;
    const res = await importFiles(dl);
    const file = res.files[0];
    check(`${cellBase} [SETS count]`, res.items.length === CORPUS.length, `imported ${res.items.length}/${CORPUS.length}`);
    check(`${cellBase} [SETS label]`, file?.kind === 'gradients' && file.document && file.groups[SET_GROUP] === SET, `the set label did not come back (${JSON.stringify(file?.kind === 'gradients' ? file.groups : file?.kind)})`);
    const cells = CORPUS.map((it, i) => {
      const cell = `${cellBase} / ${it.key}`;
      const back = res.items[i];
      if (!back) return '✗ missing';
      // ORDER is part of EXACT here: item i must be CORPUS[i], by config.
      const diffs = configDiff(it.config, back.config);
      if (back.group !== SET_GROUP) diffs.push(`group ${back.group}`);
      if (JSON.stringify(back.origin ?? null) !== JSON.stringify(favs[i].origin ?? null)) diffs.push('origin≠');
      if (back.createdAt !== favs[i].createdAt) diffs.push('createdAt≠');
      if (back.source !== 'Browse') diffs.push(`source "${back.source}"`);
      const pass = check(`${cell} [EXACT + SETS order]`, diffs.length === 0, diffs.join(', '));
      const npass = check(`${cell} [NAME file]`, back.name === it.name, `name ${JSON.stringify(back.name)}`);
      return `${mark(pass && npass)}${diffs.join(',') || 'exact'}`;
    });
    rows.push({ label: `set .${kind}`, cells, note: `EXACT + order + set label; "${dl[0].name}"` });

    if (kind === 'png') {
      const bytes = stripPngText(await bytesOf(dl[0].blob));
      const sres = await importFiles([{ name: dl[0].name, blob: new Blob([bytes as unknown as BlobPart]) }]);
      check(`GMT set .png stripped [SETS count]`, sres.items.length === CORPUS.length, `imported ${sres.items.length}/${CORPUS.length}`);
      const base = unslugStem(dl[0].name);
      const scells = CORPUS.map((it, i) => {
        const cell = `GMT set .png stripped / ${it.key}`;
        const back = sres.items[i];
        if (!back) return '✗ missing';
        // COLOURS in position i IS the order check: bands are read top to bottom.
        const txt = gradeCell(`${cell} (SETS order)`, 'COLOURS', it, i, back.config, '');
        const want = `${base} ${i + 1}`;
        const nOk = check(`${cell} [NAME filename, numbered]`, back.name === want, `name ${JSON.stringify(back.name)} ≠ ${JSON.stringify(want)}`);
        return nOk ? txt : txt.replace(/^✓/, '✗');
      });
      rows.push({ label: 'set .png strip', cells: scells, note: 'COLOURS in order + NAME filename numbered' });
    }
  }
  printTable('GMT. the GMT gradient file: runGradientFile / runSetGradientFile → router   (and the PNG with iTXt stripped)', rows);
}

// ═══ A. single-gradient registry exports ════════════════════════════════════════════════════
{
  const rows: { label: string; cells: string[]; note?: string }[] = [];
  for (const f of EXPORT_FORMATS) {
    const klass = RAMP_CLASS[f.key];
    if (!klass) continue; // already a violation above
    const cells: string[] = [];
    let fileName = '';
    for (const [i, it] of CORPUS.entries()) {
      const cell = `A ramp .${f.ext} (${f.key}) / ${it.key}`;
      runExport({ kind: 'download', key: f.key }, gradientDisplayRamp(it.config), it.name, [], {});
      const dl = takeDownloads();
      fileName = dl[0]?.name ?? '';
      if (klass === 'EXPORT-ONLY') { cells.push(await gradeExportOnly(cell, dl)); continue; }
      const res = await importFiles(dl);
      if (!check(`${cell} [${klass}]`, dl.length === 1 && res.items.length === 1, `${dl.length} downloads, imported ${res.items.length}`)) { cells.push(`✗ ${res.items.length} items`); continue; }
      const back = res.items[0];
      const txt = gradeCell(cell, klass, it, i, back.config, `ramp:${f.key}`);
      const want = RAMP_NAME_IN_FILE.has(f.key) ? it.name : unslugStem(fileName);
      const nOk = check(`${cell} [NAME ${RAMP_NAME_IN_FILE.has(f.key) ? 'file' : 'filename'}]`, back.name === want, `name ${JSON.stringify(back.name)} ≠ ${JSON.stringify(want)}`);
      cells.push(nOk ? txt : txt.replace(/^✓/, '✗'));
    }
    // .grd has no importer, but its name field is readable: the v3 header (`8BGR`, version, count)
    // is followed by the name as a Pascal string — one length byte, then UTF-8 (`grdNameBytes`).
    let nameNote = '';
    if (f.key === 'grd') {
      for (const it of CORPUS) {
        runExport({ kind: 'download', key: f.key }, gradientDisplayRamp(it.config), it.name, [], {});
        const bytes = await bytesOf(takeDownloads()[0].blob);
        const magic = new TextDecoder().decode(bytes.slice(0, 4));
        const read = new TextDecoder().decode(bytes.slice(9, 9 + bytes[8]));
        const pass = check(`A ramp .grd / ${it.key} [NAME file bytes]`, magic === '8BGR' && read === it.name, `the .grd name field reads ${JSON.stringify(read)} (magic ${JSON.stringify(magic)})`);
        if (it.key === '2 bias') nameNote = `; name field ${pass ? 'exact' : JSON.stringify(read)}`;
      }
    }
    rows.push({ label: `${f.key} .${f.ext}`, cells, note: `${klass}${RAMP_NAME_IN_FILE.has(f.key) ? ' + NAME file' : klass === 'EXPORT-ONLY' ? '' : ' + NAME filename'}; "${fileName}"${nameNote}` });
  }
  printTable('A. single gradient, RAMP subject: runExport(download) → router   [class mark · max ΔE (≤bound) · form]', rows);

  const srows: { label: string; cells: string[]; note?: string }[] = [];
  for (const f of EXPORT_FORMATS.filter((x) => !!x.swatches)) {
    const klass = SWATCH_CLASS[f.key];
    if (!klass) continue;
    const cells: string[] = [];
    let fileName = '';
    for (const [i, it] of CORPUS.entries()) {
      const cell = `A swatches .${f.ext} (${f.key}) / ${it.key}`;
      const palette = paletteOf(it.config);
      runExport({ kind: 'download', key: f.key, subject: 'swatches' }, gradientDisplayRamp(it.config), it.name, palette, {});
      const dl = takeDownloads();
      fileName = dl[0]?.name ?? '';
      if (klass === 'EXPORT-ONLY') { cells.push(await gradeExportOnly(cell, dl)); continue; }
      const res = await importFiles(dl);
      if (!check(`${cell} [${klass}]`, dl.length === 1 && res.items.length === 1, `${dl.length} downloads, imported ${res.items.length}`)) { cells.push(`✗ ${res.items.length} items`); continue; }
      const back = res.items[0];
      const txt = gradeCell(cell, klass, it, i, back.config, `swatches:${f.key}`, palette);
      const want = SWATCH_NAME_IN_FILE.has(f.key) ? it.name : unslugStem(fileName);
      const nOk = check(`${cell} [NAME ${SWATCH_NAME_IN_FILE.has(f.key) ? 'file' : 'filename'}]`, back.name === want, `name ${JSON.stringify(back.name)} ≠ ${JSON.stringify(want)}`);
      cells.push(nOk ? txt : txt.replace(/^✓/, '✗'));
    }
    srows.push({ label: `${f.key} .${f.ext}`, cells, note: `${klass}; "${fileName}"` });
  }
  printTable('A. single gradient, SWATCHES subject (7 even swatches) → router   [palette ΔE: the 7 colours at their even positions]', srows);
}

// ═══ B. set registry exports ════════════════════════════════════════════════════════════════
{
  const rows: { label: string; cells: string[]; note?: string }[] = [];
  const favs = setFavs();
  for (const subject of ['ramp', 'swatches'] as const) {
    for (const f of subject === 'ramp' ? EXPORT_FORMATS : EXPORT_FORMATS.filter((x) => !!x.swatches)) {
      const klass = (subject === 'ramp' ? RAMP_CLASS : SWATCH_CLASS)[f.key];
      if (!klass) continue;
      const label = `${subject[0]} ${f.key}`;
      const cellBase = `B set ${subject} .${f.ext} (${f.key})`;
      runSetExport(f.key, favs as any, SET, subject, 7);
      const dl = takeDownloads();
      const file = dl[0];
      if (klass === 'EXPORT-ONLY') {
        const txt = await gradeExportOnly(cellBase, dl);
        rows.push({ label, cells: CORPUS.map(() => txt), note: `EXPORT-ONLY; "${file?.name}"` });
        continue;
      }
      if (!check(`${cellBase} [SETS]`, !!file && file.name.endsWith('.zip'), `expected one .zip, got ${dl.map((d) => d.name).join(', ') || 'nothing'}`)) continue;
      // The zip's own member order is the set's order (001_…), and the router must keep it.
      const members = Object.keys(unzipSync(await bytesOf(file.blob)));
      check(`${cellBase} [SETS zip order]`, members.length === CORPUS.length && members.every((m, i) => m.startsWith(String(i + 1).padStart(3, '0'))), `members ${members.join(', ')}`);
      const res = await importFiles([file]);
      check(`${cellBase} [SETS count]`, res.items.length === CORPUS.length, `imported ${res.items.length}/${CORPUS.length}`);
      const nameInFile = (subject === 'ramp' ? RAMP_NAME_IN_FILE : SWATCH_NAME_IN_FILE).has(f.key);
      const cells = CORPUS.map((it, i) => {
        const cell = `${cellBase} / ${it.key}`;
        const back = res.items[i];
        if (!back) return '✗ missing';
        // Graded in position i against CORPUS[i]: a reordered zip reads as wrong colours.
        const txt = gradeCell(`${cell} (SETS order)`, klass, it, i, back.config, `${subject}:${f.key}`, subject === 'swatches' ? paletteOf(it.config) : undefined);
        // A ramp set export credits an unmodified catalogue member in its name (`withExportName`).
        const credited = subject === 'ramp' ? withExportName(favs[i] as any).name : it.name;
        // No name in the file: the member's filename carries it AS IT IS since 2026-09-16 — the
        // `NNN_` index dropped, spaces and non-ASCII kept, the credit's `/` as `-` exactly as a
        // single download names it. Written out, not derived from `members[i]`, so a zip that goes
        // back to slugging (or a router that keeps the index) is red.
        const want = nameInFile ? credited : credited.replace(/\s*\/\s*/g, '-');
        const nOk = check(`${cell} [NAME ${nameInFile ? 'file' : 'filename'}]`, back.name === want, `name ${JSON.stringify(back.name)} ≠ ${JSON.stringify(want)}`);
        return nOk ? txt : txt.replace(/^✓/, '✗');
      });
      rows.push({ label, cells, note: `${klass} + count + order; "${file.name}" → ${res.items.length} (e.g. "${res.items[1]?.name}")` });
    }
  }
  printTable(`B. SET "${SET}" of all six: runSetExport → the .zip / file AS-IS → router   [r = ramp subject, s = swatches]`, rows);
}

// ═══ C. favourites collection file ═════════════════════════════════════════════════════════
{
  const st = () => useFavientsStore.getState();
  const seedShelf = () => {
    st().clear();
    st().collectRecent(CORPUS[0].config, CORPUS[0].name, 'Browse');
    st().collectRecent(CORPUS[1].config, CORPUS[1].name, 'Browse');
    st().add(CORPUS[2].config, CORPUS[2].name, 'Import · .map');
    st().insertMany([{ config: CORPUS[3].config, name: CORPUS[3].name }, { config: CORPUS[4].config, name: CORPUS[4].name }], 'grp-folder', 'Ordner ö');
    st().add(CORPUS[5].config, CORPUS[5].name, 'Picker', ORIGIN6 as any);
  };
  seedShelf();
  const before = clone(st().favients);
  const beforeLabels = { ...st().groupLabels };
  const json = st().exportCollection();
  const sig = (f: any) => JSON.stringify({ n: f.name, g: f.group ?? '', o: f.origin ?? null, s: f.source ?? null, c: f.config, t: f.createdAt });
  const recentContiguousAt0 = (arr: any[]) => {
    const idx = arr.map((f, i) => (f.group === RECENT_GROUP ? i : -1)).filter((i) => i >= 0);
    return idx.every((v, k) => v === k);
  };
  const otherShelf = () => {
    st().clear();
    st().collectRecent({ ...CORPUS[0].config, stops: CORPUS[0].config.stops.map((s) => ({ ...s, color: s.color === '#000000' ? '#330000' : s.color })) }, 'Other Recent', 'Browse');
    st().add(CORPUS[2].config, 'Stufe (already mine)', 'Mine'); // byte-identical to item 3
    st().insertMany([{ config: { ...CORPUS[1].config, blendSpace: 'rgb' } as GradientConfig, name: 'Mine rgb' }], 'grp-mine', 'Meins'); // item 2 but for blend
  };
  const rows: { label: string; cells: string[]; note?: string }[] = [];
  const measure = (label: string, mode: 'replace' | 'merge', prepare: () => void, dedupedItem = -1) => {
    prepare();
    const pre = clone(st().favients);
    const n = st().importCollection(json, mode);
    const after = st().favients;
    const cells = CORPUS.map((_, i) => before.find((b: any) => b.name === CORPUS[i].name)).map((b: any, i) => {
      const cell = `C collection ${label} / ${CORPUS[i].key}`;
      const hits = after.filter((a: any) => JSON.stringify(a.config) === JSON.stringify(b.config));
      if (i === dedupedItem) {
        // DEVIATION from EXACT, by design: the shelf already holds this gradient byte for byte
        // ("Stufe (already mine)"), so the merge keeps the EXISTING entry and adds nothing.
        const pass = check(`${cell} [deduped: the existing entry kept]`, hits.length === 1 && hits[0].name === 'Stufe (already mine)', `hits ${hits.map((h: any) => h.name).join(' | ') || 'none'}`);
        return `${mark(pass)}dedup (mine)`;
      }
      const diffs: string[] = [];
      if (!hits.length) {
        const twin = pre.find((p: any) => favientSig(p.config) === favientSig(b.config));
        diffs.push(twin ? `deduped vs "${twin.name}"` : 'absent');
      } else {
        const a = hits[hits.length - 1];
        if (a.name !== b.name) diffs.push(`name→${a.name}`);
        if ((a.group ?? '') !== (b.group ?? '')) diffs.push(`group ${b.group || 'Kept'}→${a.group || 'Kept'}`);
        if (JSON.stringify(a.origin ?? null) !== JSON.stringify(b.origin ?? null)) diffs.push('origin lost');
        if (a.source !== b.source) diffs.push('source≠');
        if (hits.length > 1) diffs.push(`×${hits.length}`);
      }
      return `${mark(check(`${cell} [EXACT]`, diffs.length === 0, diffs.join(', ')))}${diffs.join(',') || 'exact'}`;
    });
    const itemOrder = after.filter((a: any) => before.some((b: any) => sig(b) === sig(a))).map((a: any) => before.findIndex((b: any) => sig(b) === sig(a)));
    const orderOk = itemOrder.every((v: number, i: number) => i === 0 || v > itemOrder[i - 1]);
    const contig = recentContiguousAt0(after);
    const labelsOk = Object.entries(beforeLabels).every(([k, v]) => st().groupLabels[k] === v);
    const wantN = CORPUS.length - (dedupedItem >= 0 ? 1 : 0);
    check(`C collection ${label} [SETS order]`, orderOk, `order changed: ${itemOrder.join(',')}`);
    check(`C collection ${label} [Recent one block at 0]`, contig, `Recent run split / not at 0`);
    check(`C collection ${label} [labels kept]`, labelsOk, JSON.stringify(st().groupLabels));
    check(`C collection ${label} [count]`, n === wantN, `returned ${n}, want ${wantN}`);
    rows.push({ label, cells, note: `returned ${n}; order ${orderOk ? 'kept' : 'CHANGED'}; Recent ${contig ? 'contiguous@0' : 'SPLIT'}; labels ${labelsOk ? 'kept' : 'CHANGED'}; shelf ${pre.length}→${after.length}` });
  };
  measure('replace→empty', 'replace', () => st().clear());
  measure('replace→full', 'replace', otherShelf);
  measure('merge→empty', 'merge', () => st().clear());
  measure('merge→full', 'merge', otherShelf, 2);

  // The same file through the ONE loader (a drop on the Explorer): every favourite, every field.
  {
    const res = parseGradientImports([{ name: 'favients-collection.json', text: json }]);
    const file = res.files[0];
    check('C collection routed [SETS count]', res.items.length === before.length, `routed ${res.items.length}/${before.length}`);
    check('C collection routed [document]', file?.kind === 'gradients' && file.document && Object.entries(beforeLabels).every(([k, v]) => file.groups[k] === v), `kind ${file?.kind}`);
    const cells = CORPUS.map((it) => {
      const bi = before.findIndex((b: any) => b.name === it.name);
      const b = before[bi];
      const back = res.items[bi];
      const cell = `C collection routed / ${it.key}`;
      if (!back) return `${mark(check(`${cell} [EXACT]`, false, 'missing'))}missing`;
      const diffs = configDiff(b.config, back.config);
      if (back.name !== b.name) diffs.push(`name→${back.name}`);
      if ((back.group ?? '') !== (b.group ?? '')) diffs.push('group≠');
      if (JSON.stringify(back.origin ?? null) !== JSON.stringify(b.origin ?? null)) diffs.push('origin≠');
      // A favourite with no source line (insertMany wrote none) comes back with the router's
      // provenance, `Import · .json` — a label filled in, not a field lost; one WITH a source keeps it.
      const wantSource = b.source ?? 'Import · .json';
      if (back.source !== wantSource) diffs.push(`source "${back.source}"≠"${wantSource}"`);
      if (back.createdAt !== b.createdAt) diffs.push('createdAt≠');
      return `${mark(check(`${cell} [EXACT + order]`, diffs.length === 0, diffs.join(', ')))}${diffs.join(',') || 'exact'}`;
    });
    rows.push({ label: 'routed (drop)', cells, note: `parseGradientImports → ${res.items.length} in shelf order` });
  }
  printTable('C. favients collection (the gmt-gradients document): exportCollection → importCollection / router   [EXACT = config, name, group, origin, source]', rows);
  console.log('   merge→full seeds: "Other Recent" (unrelated), "Stufe (already mine)" = item 3 byte-identical (dedupe expected), "Mine rgb" = item 2 with ONLY blendSpace hsv→rgb (a different gradient, must import)');
  // ADR-0123 Consequences: the signature learns blend, bias and interpolation; colour space stays out.
  {
    const base = CORPUS[1].config;
    const probes: [string, GradientConfig, boolean][] = [
      ['blendSpace hsv→rgb', { ...base, blendSpace: 'rgb' }, false],
      ['every bias → 0.5', { ...base, stops: base.stops.map((s) => ({ ...s, bias: 0.5 })) }, false],
      ['every interpolation → linear', { ...base, stops: base.stops.map((s) => ({ ...s, interpolation: 'linear' as const })) }, false],
      ['colorSpace srgb→linear', { ...base, colorSpace: 'linear' }, true],
    ];
    for (const [what, cfg, wantSame] of probes) check(`C favientSig: ${what}`, (favientSig(cfg) === favientSig(base)) === wantSame, `signature ${wantSame ? 'differs' : 'is equal'} (ΔE ${f3(deltaE(base, cfg).max)})`);
    console.log(`   favientSig — ${probes.map(([w, c]) => `${w}: equal=${favientSig(c) === favientSig(base)}`).join(' · ')}`);
  }
}

// ═══ D. share link ════════════════════════════════════════════════════════════════════════
{
  /** How many ramp samples i/255 sit at or below p — the side of every texel a stop is on. */
  const side = (p: number) => { let c = 0; for (let i = 0; i < 256; i++) if (i / 255 <= p) c++; return c; };
  const cells = CORPUS.map((it) => {
    const cell = `D share / ${it.key}`;
    const code = encodeShare(it.config, it.name);
    const back = decodeShare(code);
    if (!back) return `${mark(check(`${cell} [EXACT]`, false, 'does not decode'))}null`;
    // DEVIATION from EXACT, documented in shareUrl.ts `wirePosition`: positions ride the wire at
    // 4 decimals unless that would move a stop across a ramp sample (then finer). So: everything
    // else exact, positions within 5e-5, and every stop on the same side of every texel.
    const diffs = configDiff(it.config, back.config, 5e-5);
    const a = normStops(it.config), b = normStops(back.config);
    if (a.length === b.length && a.some((s, i) => side(s.p) !== side(b[i].p))) diffs.push('a stop crossed a texel');
    if (back.name !== it.name) diffs.push(`name→${back.name}`);
    const d = deltaE(it.config, back.config);
    return `${mark(check(`${cell} [EXACT, positions to the wire]`, diffs.length === 0, diffs.join(', ')))}${diffs.join(',') || 'exact'} ${f3(d.max)}`;
  });
  printTable('D. share link: encodeShare → decodeShare   [EXACT (positions to 4 dp, never across a texel) · max ΔE]', [{ label: 'share ?g=', cells }]);
}

// ═══ E. session file ══════════════════════════════════════════════════════════════════════
{
  const ws = () => useWorkingStore.getState();
  const cellsW: string[] = [];
  const cellsS: string[] = [];
  const decoy: GradientConfig = { stops: [{ id: 'x', position: 0, color: '#123456' }, { id: 'y', position: 1, color: '#654321' }], colorSpace: 'srgb', blendSpace: 'rgb' };
  let fileName = '';
  for (const it of CORPUS) {
    const cell = `E session / ${it.key}`;
    ws().use(it.config, it.name, 'Browse');
    usePaletteEditorStore.setState({ config: clone(it.config) });
    const s = ws();
    fileName = `${slugName(s.name ?? autoWorkingName(s.input, s.bakedFrom))}${GX_SESSION_SUFFIX}`;
    saveSessionFile(workingSessionAdapter, fileName);
    const text = await takeDownloads()[0].blob.text();
    ws().use(decoy, 'Decoy', 'Browse');
    usePaletteEditorStore.setState({ config: decoy });
    const okApply = applySessionText(workingSessionAdapter, text);
    const w = ws();
    if (!check(`${cell} [EXACT]`, okApply && w.input.kind === 'gradient', `refused / input kind ${w.input.kind}`)) { cellsW.push('✗ refused'); cellsS.push('✗'); continue; }
    const dW = configDiff(it.config, (w.input as any).config);
    const nameBack = w.name ?? autoWorkingName(w.input, w.bakedFrom);
    if (nameBack !== it.name) dW.push(`name→${nameBack}`);
    cellsW.push(`${mark(check(`${cell} working input [EXACT + NAME]`, dW.length === 0, dW.join(', ')))}${dW.join(',') || 'exact'}`);
    const dS = configDiff(it.config, usePaletteEditorStore.getState().config);
    cellsS.push(`${mark(check(`${cell} stops document [EXACT]`, dS.length === 0, dS.join(', ')))}${dS.join(',') || 'exact'}`);
  }
  printTable(`E. session: saveSessionFile ("${fileName}") → applySessionText   [EXACT: working input + name, stops document]`, [
    { label: 'working input', cells: cellsW },
    { label: 'stops document', cells: cellsS },
  ]);
}

// ═══ F. editor Copy Gradient JSON ════════════════════════════════════════════════════════
{
  /** `AdvancedGradientEditor.handleCopy`'s payload, mirrored: knots are the config's stops with
   *  bias ?? 0.5 and interpolation ?? 'linear', sorted by position (the component's prop sync). */
  const copyText = (c: GradientConfig): string =>
    JSON.stringify({
      stops: [...c.stops].map((s) => ({ position: s.position, color: s.color, bias: s.bias ?? 0.5, interpolation: s.interpolation ?? 'linear' })).sort((a, b) => a.position - b.position),
      colorSpace: c.colorSpace,
      blendSpace: c.blendSpace || 'oklab',
    });
  /** `handlePaste`'s result config: normalizePaste, ≥ 2 stops, the wrapper's spaces or srgb/oklab. */
  const pasteConfig = (text: string): GradientConfig | null => {
    const data = JSON.parse(text);
    const parsed = normalizePaste(data);
    if (!parsed || parsed.length < 2) return null;
    let cs: any = 'srgb', bl: any = 'rgb';
    if (data && typeof data === 'object' && !Array.isArray(data)) { cs = data.colorSpace || 'srgb'; bl = data.blendSpace || 'oklab'; }
    return { stops: parsed.map((s, i) => ({ id: s.id ?? `p${i}`, position: s.position, color: s.color, bias: s.bias ?? 0.5, interpolation: s.interpolation ?? 'linear' })), colorSpace: cs, blendSpace: bl };
  };
  const cellsA: string[] = [];
  const cellsB: string[] = [];
  const cellsC: string[] = [];
  for (const it of CORPUS) {
    const isRamp = isRampGradient(it.config);
    const canCopy = editorAffordances({ isRamp, knotsStale: false, canAddStops: true }).clipboard;
    // (a) paste. A ramp gradient has no knots to copy: the editor disables the clipboard (asserted).
    if (isRamp) cellsA.push(`${mark(check(`F paste / ${it.key} [n/a: clipboard disabled on a ramp]`, !canCopy, 'the editor offers copy on a ramp gradient'))}n/a (ramp)`);
    else {
      const back = pasteConfig(copyText(it.config));
      const diffs = back ? configDiff(it.config, back) : ['refused'];
      cellsA.push(`${mark(check(`F paste / ${it.key} [EXACT]`, diffs.length === 0, diffs.join(', ')))}${diffs.join(',') || 'exact'}`);
    }
    // (b) the same text saved as .json → the router. For the ramp item, the bare ramp-form config
    // (`{stops: [], ramp, …}`), which is the `{stops}` JSON of that form.
    const text = isRamp ? JSON.stringify(it.config) : copyText(it.config);
    const fname = `${slugName(it.name)}.json`;
    const grade = async (label: string, body: string, wantName: string, how: string, sink: string[]) => {
      const cell = `F ${label} / ${it.key}`;
      const res = await importFiles([{ name: fname, blob: new Blob([body]) }]);
      if (!check(`${cell} [EXACT]`, res.items.length === 1, `imported ${res.items.length}`)) { sink.push('✗ refused'); return; }
      const diffs = configDiff(it.config, res.items[0].config);
      const pass = check(`${cell} [EXACT]`, diffs.length === 0, diffs.join(', '));
      const nOk = check(`${cell} [NAME ${how}]`, res.items[0].name === wantName, `name ${JSON.stringify(res.items[0].name)} ≠ ${JSON.stringify(wantName)}`);
      sink.push(`${mark(pass && nOk)}${diffs.join(',') || 'exact'} ${formOf(res.items[0].config)}`);
    };
    // DEVIATION (name): the editor's copy shape carries no name, so the filename's stem is the name.
    await grade('{stops} .json', text, unslugStem(fname), 'filename', cellsB);
    // (c) the same with a `name` field: exact.
    await grade('{name, stops} .json', JSON.stringify({ name: it.name, ...JSON.parse(text) }), it.name, 'file', cellsC);
  }
  printTable('F. editor Copy Gradient JSON → (a) Paste · (b) saved as .json → router · (c) with a name', [
    { label: '(a) paste', cells: cellsA },
    { label: '(b) as .json', cells: cellsB },
    { label: '(c) + name', cells: cellsC },
  ]);
}

// ═══ G. cross-routing ═════════════════════════════════════════════════════════════════════
{
  const collection = useFavientsStore.getState().exportCollection();
  const shelfN = useFavientsStore.getState().favients.length;
  useWorkingStore.getState().use(CORPUS[1].config, CORPUS[1].name, 'Browse');
  saveSessionFile(workingSessionAdapter, `${slugName(CORPUS[1].name)}${GX_SESSION_SUFFIX}`);
  const session = takeDownloads()[0];
  runExport({ kind: 'download', key: 'svg' }, gradientDisplayRamp(CORPUS[1].config), CORPUS[1].name, [], {});
  const svg = takeDownloads()[0];
  runExport({ kind: 'download', key: 'json' }, gradientDisplayRamp(CORPUS[1].config), CORPUS[1].name, [], {});
  const gjson = takeDownloads()[0];
  runSetExport('map', setFavs() as any, 'Set', 'ramp');
  const zip = takeDownloads()[0];
  runGradientFile('png', CORPUS[1].name, { config: CORPUS[1].config });
  const png = takeDownloads()[0];
  const strippedPng = { name: png.name, blob: new Blob([stripPngText(await bytesOf(png.blob)) as unknown as BlobPart]) };
  const cases: { file: { name: string; blob: Blob }; want: string; ok: (r: Awaited<ReturnType<typeof importFiles>>) => boolean }[] = [
    { file: { name: 'favients-collection.json', blob: new Blob([collection]) }, want: `${shelfN} gradients, a document`, ok: (r) => r.items.length === shelfN && r.files[0]?.kind === 'gradients' && r.files[0].document },
    { file: session, want: 'a session, no gradients', ok: (r) => r.sessions.length === 1 && r.items.length === 0 },
    { file: svg, want: 'refused', ok: (r) => r.items.length === 0 && r.skipped === 1 },
    { file: zip, want: '6 gradients', ok: (r) => r.items.length === 6 },
    { file: gjson, want: '1 gradient', ok: (r) => r.items.length === 1 },
    { file: png, want: '1 gradient, a document', ok: (r) => r.items.length === 1 && r.files[0]?.kind === 'gradients' && r.files[0].document },
    { file: strippedPng, want: '1 ramp gradient, not a document', ok: (r) => r.items.length === 1 && r.files[0]?.kind === 'gradients' && !r.files[0].document && isRampGradient(r.items[0].config) },
  ];
  console.log('\nG. cross-routing   [what the one loader makes of each file · the collection loader · the session loader]');
  for (const [k, c] of cases.entries()) {
    const text = await c.file.blob.text();
    const res = await importFiles([c.file]);
    const pass = check(`G ${c.file.name}${k === 6 ? ' (stripped)' : ''} [routes as ${c.want}]`, c.ok(res), `items ${res.items.length}, sessions ${res.sessions.length}, skipped ${res.skipped}, files ${res.files.map((f) => f.kind).join(',')}`);
    const sess = k === 1 ? applySessionText(workingSessionAdapter, text) : null;
    console.log(`   ${mark(pass)} ${(c.file.name + (k === 6 ? ' (stripped)' : '')).padEnd(40)} → items ${res.items.length} sessions ${res.sessions.length} skipped ${res.skipped} (want: ${c.want})${k === 1 ? ` · session-load ${sess ? 'APPLIED' : 'refused'}` : ''}`);
  }
}

// ═══ summary ═════════════════════════════════════════════════════════════════════════════
if (notes.length) {
  console.log('\n── notes (not failures) ──');
  for (const n of notes) console.log(`  ${n}`);
}
if (violations.length) {
  console.log(`\n══ ${violations.length} VIOLATION(S) of ${checks} checks ══`);
  for (const v of violations) console.log(`  ✗ ${v}`);
  process.exit(1);
}
console.log(`\n══ all ${checks} checks pass ══`);
process.exit(0);
