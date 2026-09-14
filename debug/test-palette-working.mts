/**
 * workingPipeline harness — the v2 Working gradient's pure core.
 *
 *   1. identity detection over the Adjust params.
 *   2. passthrough: a stops input under the identity pipeline comes back VERBATIM
 *      (same config object, ramp = the direct stops render).
 *   3. a real transform (hue rotate / curves) breaks passthrough and produces a fitted
 *      config with a detail-scaled stop budget.
 *   4. bare-ramp inputs (Extract) produce a config of the right form; determinism.
 *
 * ADR-0122 (the ramp is the gradient), added 2026-09-14:
 *   5. a RAMP gradient (`stops: []` + `ramp`) under the identity pipeline passes through
 *      VERBATIM (same object, ramp = its texels); its base IS its texels.
 *   6. OUTPUT FORM under a real transform: no stops in → an automatic fit (a dense result stays
 *      a ramp, a cheap one gets stops ≤ STOP_LAYER_CAP); stops in, or a seeded Mix → stops,
 *      past the cap, and still stops when the Detail budget runs out.
 *   7. a HELD ramp during a drag follows the live ramp (the bar must move, ADR-0117 §5).
 *   8. `addStopsToConfig`: the explicit fit is uncapped and keeps the colorSpace.
 *   9. against the real stores (the gx-session harness's node trick): the Curves fit
 *      (`fitChannelsToTracks`) over a ramp zebra's base reproduces the texels — the 8ZEBBOW2
 *      bug drew black — and `addStopsToWorking` is one undo entry that undoes to the ramp.
 *
 * ── FALSIFIED 2026-09-14 — each break made, the run watched go red (exit 1), reverted ──
 *   W1  `channelsOfConfig` reading `c.stops` (the pre-ADR base: grey on a ramp gradient) → 5 red:
 *       [5] "base of a ramp gradient is its texels", [6] "dense ramp + Adjust → a ramp" and its
 *       byte check, [7] the held ramp, and [9] "Curves over a ramp zebra reproduces the texels"
 *       (max ΔE 0.9969; green is 0.0111 with 86 keys on L).
 *   W2  `fitWorkingOutput` always `fitRampToStops` (no automatic cap) → 4 red: [6] "dense ramp +
 *       Adjust → a ramp" (128 stops) + its byte check, "a dense Extract → a ramp", [7].
 *   W3  `fitWorkingOutput` always `rampToGradientConfig` (the cap on stop inputs too) → 3 red, all
 *       [6]: "stop input keeps stops past the cap", "… when the budget runs out", "seeded Mix …".
 *   W4  the stop branch as `rampToGradientConfig(…, { cap: Infinity })` → 1 red, [6] "stop input
 *       keeps stops when the budget runs out", and ONLY that: under budget the two agree, and
 *       that assertion exists to tell them apart.
 *   W5  `recolourHeldFit` without its ramp branch (a held ramp handed back) → 1 red, [7].
 *   W6  `addStopsToConfig` through `rampToGradientConfig` → 3 red, [8] ×2 and [9] "add stops: the
 *       document has stops past the cap".
 *   W7  the fold without its `paramEdit` → 2 red, [9] "exactly one undo entry" (0) and "undo puts
 *       the ramp input back".
 *   W8  `coerceInput` refusing a ramp config → 2 red, [9] "undo puts the ramp input back" and "a
 *       ramp gradient input survives the snapshot gate".
 *   W9  `configKey` without the ramp → 1 red, [9] "configKey tells two ramps apart".
 *   W10 the automatic branch always a ramp (no fit at all) → 1 red, [6] "cheap ramp + Adjust → stops".
 *   W11 the passthrough ramp rendered from `verbatim.stops` → 1 red, [5] "ramp is the texels".
 *   W12 passthrough only for a config WITH stops → 3 red, all [5] (flagged, verbatim object, texels).
 *   Section [4]'s form assertion was loosened to "either form" on purpose: its sawtooth fixture is
 *   not what pins the form, [6] is.
 *
 * Run: npx tsx debug/test-palette-working.mts
 */

import {
  runWorkingPipeline,
  isIdentityAdjust,
  channelsOfConfig,
  channelsOfRamp,
  stopBudget,
  addStopsToConfig,
} from '../palette/core/workingPipeline';
import { DEFAULT_GENERATOR_PARAMS, decomposeRamp, buildGradientRamp, DEFAULT_SLOT_MODS } from '../palette/core/generatorPipeline';
import { renderStopsToRamp } from '../palette/core/gmtGradient';
import { fitRampToStops, STOP_LAYER_CAP } from '../palette/core/stopFit';
import { makeRampGradient, decodeRamp, isRampGradient, isRampString } from '../utils/gradientRamp';
import { rgbToOklab, oklabDistance } from '../palette/core/oklab';
import type { GradientConfig, JsonValue } from '../types';
import type { RGB } from '../palette/core/oklab';

let failures = 0;
const ok = (cond: boolean, msg: string) => {
  if (!cond) {
    failures++;
    console.error('  ✗ ' + msg);
  }
};

const cfg: GradientConfig = {
  stops: [
    { id: 'a', position: 0, color: '#1B2A6B' },
    { id: 'b', position: 0.45, color: '#F2B134' },
    { id: 'c', position: 0.7, color: '#E4572E' },
    { id: 'd', position: 1, color: '#17BEBB' },
  ],
  colorSpace: 'srgb',
  blendSpace: 'oklab',
};
const P = DEFAULT_GENERATOR_PARAMS;
const maxDiff = (a: RGB[], b: RGB[]) => {
  let m = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) m = Math.max(m, Math.abs(a[i].r - b[i].r), Math.abs(a[i].g - b[i].g), Math.abs(a[i].b - b[i].b));
  return m;
};

console.log('[1] identity');
{
  ok(isIdentityAdjust(P), 'defaults are the identity');
  ok(isIdentityAdjust({ ...P, bands: 1 }), 'bands = 1 is still off');
  ok(!isIdentityAdjust({ ...P, reverse: true }), 'reverse breaks identity');
  ok(!isIdentityAdjust({ ...P, repeats: 2 }), 'repeats = 2 breaks identity');
  ok(!isIdentityAdjust({ ...P, hueRotate: 15 }), 'hue rotate breaks identity');
  ok(!isIdentityAdjust({ ...P, chroma: 1.2 }), 'chroma breaks identity');
  ok(!isIdentityAdjust({ ...P, noise: 0.1 }), 'noise breaks identity');
  ok(isIdentityAdjust({ ...P, mixL: 0.7, mixC: 0.2, mixH: 1 }), 'the mix fields are not part of Adjust');
}

console.log('[2] passthrough');
{
  const base = channelsOfConfig(cfg);
  const out = runWorkingPipeline(base, P, null, 1, 8, cfg);
  ok(out.passthrough, 'passthrough flagged');
  ok(out.config === cfg, 'passthrough: config is the verbatim object');
  ok(maxDiff(out.ramp, renderStopsToRamp(cfg.stops, cfg.blendSpace, cfg.colorSpace)) === 0, 'passthrough: ramp is the direct render');
  ok(out.ramp.length === 256 && out.base.L.length === 256, 'shapes');
}

console.log('[3] real transforms');
{
  const base = channelsOfConfig(cfg);
  const direct = renderStopsToRamp(cfg.stops, cfg.blendSpace, cfg.colorSpace);
  const rot = runWorkingPipeline(base, { ...P, hueRotate: 120 }, null, 1, 8, cfg);
  ok(!rot.passthrough && rot.config !== cfg, 'hue rotate: not passthrough, config is fitted');
  ok(maxDiff(rot.ramp, direct) > 40, 'hue rotate: the ramp actually changed (Δ=' + maxDiff(rot.ramp, direct).toFixed(1) + ')');
  ok(rot.config.stops.length >= 2 && rot.config.stops.length <= stopBudget(8).maxStops, 'hue rotate: fitted stop count within the detail budget');
  const flatL = { L: Array.from({ length: 256 }, () => 0.5) };
  const cur = runWorkingPipeline(base, P, flatL, 1, 8, cfg);
  ok(!cur.passthrough, 'a curve override breaks passthrough even at identity Adjust');
  ok(maxDiff(cur.ramp, direct) > 10, 'flat-L curve: the ramp changed');
  const rev = runWorkingPipeline(base, { ...P, reverse: true }, null, 1, 8, cfg);
  ok(maxDiff(rev.ramp, direct.slice().reverse()) < 3, 'reverse ≈ the direct render reversed (Δ=' + maxDiff(rev.ramp, direct.slice().reverse()).toFixed(1) + ')');
  ok(stopBudget(2).maxStops < stopBudget(10).maxStops && stopBudget(2).targetDE > stopBudget(10).targetDE, 'detail buys stops and tightens ΔE');
}

console.log('[4] bare ramp inputs + determinism');
{
  const ramp: RGB[] = Array.from({ length: 256 }, (_, i) => ({ r: i, g: 255 - i, b: (i * 7) % 256 }));
  const base = channelsOfRamp(ramp);
  const a = runWorkingPipeline(base, P, null, 1, 8, null);
  const b = runWorkingPipeline(base, P, null, 1, 8, null);
  ok(!a.passthrough && (a.config.stops.length >= 2 || isRampGradient(a.config)), 'no verbatim → a config of either form');
  ok(maxDiff(a.ramp, b.ramp) === 0 && JSON.stringify(a.config) === JSON.stringify(b.config), 'deterministic');
  const noisy = runWorkingPipeline(base, { ...P, noise: 0.3 }, null, 7, 8, null);
  const noisy2 = runWorkingPipeline(base, { ...P, noise: 0.3 }, null, 7, 8, null);
  ok(maxDiff(noisy.ramp, noisy2.ramp) === 0, 'noise is seeded, not random');
}

// ── ADR-0122 fixtures ───────────────────────────────────────────────────────────────
/** Period-2 zebra: black on every even texel, a colour sweep on the odd ones (8ZEBBOW2's shape). */
const ZEBRA: RGB[] = Array.from({ length: 256 }, (_, i) => (i % 2 ? { r: 255, g: (i * 3) % 256, b: 255 - i } : { r: 0, g: 0, b: 0 }));
/** Eight sine periods, phase-shifted per channel: a free fit at Detail 8 needs ~92 stops — past
 *  the cap, inside the budget (128). The harness checks both halves rather than trusting this. */
const WAVE8: RGB[] = Array.from({ length: 256 }, (_, i) => {
  const a = (i / 255) * Math.PI * 16;
  return { r: 128 + 110 * Math.sin(a), g: 128 + 110 * Math.sin(a + 2.1), b: 128 + 110 * Math.sin(a + 4.2) };
});
const maxDE = (a: RGB[], b: RGB[]): number => {
  let m = 0;
  for (let i = 0; i < 256; i++) m = Math.max(m, oklabDistance(a[i], b[i]));
  return m;
};
const HUE = { ...P, hueRotate: 40 };
const D = 8;
const budget = stopBudget(D).maxStops;
const freeFit = (ramp: RGB[]) => fitRampToStops(ramp, { ...stopBudget(D), maxStops: 1000, fitBias: true }).stops.length;
{
  const need = freeFit(WAVE8);
  if (!(need > STOP_LAYER_CAP && need <= budget)) {
    console.error(`  ✗ fixture: WAVE8 must need more than the cap and no more than the budget (needs ${need})`);
    failures++;
  }
}

console.log('[5] ramp passthrough');
{
  const z = makeRampGradient(ZEBRA);
  const base = channelsOfConfig(z);
  const out = runWorkingPipeline(base, P, null, 1, D, z);
  ok(out.passthrough, 'ramp passthrough flagged');
  ok(out.config === z, 'ramp passthrough: config is the verbatim ramp object');
  ok(maxDiff(out.ramp, decodeRamp(z.ramp)!) === 0, 'ramp passthrough: ramp is the texels');
  const direct = decomposeRamp(ZEBRA);
  let d = 0;
  for (let i = 0; i < 256; i++) d = Math.max(d, Math.abs(base.L[i] - direct.L[i]), Math.abs(base.C[i] - direct.C[i]));
  ok(d < 1e-9, 'base of a ramp gradient is its texels (ΔL/ΔC=' + d.toExponential(1) + ')');
}

console.log('[6] output form under a real transform');
{
  const z = makeRampGradient(ZEBRA);
  const dense = runWorkingPipeline(channelsOfConfig(z), HUE, null, 1, D, z);
  ok(isRampGradient(dense.config), `dense ramp + Adjust → a ramp (got ${dense.config.stops.length} stops)`);
  ok(isRampString(dense.config.ramp) && maxDiff(decodeRamp(dense.config.ramp)!, dense.ramp) <= 0.5, '…and that ramp is the pipeline output, to the byte');

  const cheap = makeRampGradient(renderStopsToRamp(cfg.stops, cfg.blendSpace, 'srgb'));
  const cheapOut = runWorkingPipeline(channelsOfConfig(cheap), { ...P, hueRotate: 120 }, null, 1, D, cheap);
  ok(cheapOut.config.stops.length >= 2 && cheapOut.config.stops.length <= STOP_LAYER_CAP && !('ramp' in cheapOut.config),
    `cheap ramp + Adjust → stops (got ${cheapOut.config.stops.length})`);

  const extract = runWorkingPipeline(channelsOfRamp(WAVE8), HUE, null, 1, D, null);
  ok(isRampGradient(extract.config), `a dense Extract → a ramp (got ${extract.config.stops.length} stops)`);

  const waveStops = fitRampToStops(WAVE8, { ...stopBudget(D), fitBias: true });
  const kept = runWorkingPipeline(channelsOfConfig(waveStops), HUE, null, 1, D, waveStops);
  ok(kept.config.stops.length > STOP_LAYER_CAP && kept.config.stops.length <= budget,
    `stop input keeps stops past the cap (${waveStops.stops.length} in → ${kept.config.stops.length} out, cap ${STOP_LAYER_CAP}, budget ${budget})`);

  // A stop input whose output a free fit cannot finish within the budget: still stops, truncated
  // at the budget as before ADR-0122 — never dropped to a ramp.
  const zebraStops = fitRampToStops(ZEBRA, { ...stopBudget(D), fitBias: true });
  const over = runWorkingPipeline(channelsOfRamp(ZEBRA), HUE, null, 1, D, zebraStops);
  const overNeed = freeFit(over.ramp);
  ok(overNeed > budget, `fixture: the zebra's Adjust output overflows the budget (needs ${overNeed} > ${budget})`);
  ok(over.config.stops.length > 0 && over.config.stops.length <= budget, `stop input keeps stops when the budget runs out (got ${over.config.stops.length})`);

  const seeded = runWorkingPipeline(channelsOfRamp(WAVE8), HUE, null, 1, D, null, [{ position: 0.5 }]);
  ok(seeded.config.stops.length > STOP_LAYER_CAP, `seeded Mix keeps stops past the cap (got ${seeded.config.stops.length})`);
}

console.log('[7] a held ramp follows the live ramp');
{
  const z = makeRampGradient(ZEBRA);
  const base = channelsOfConfig(z);
  const settled = runWorkingPipeline(base, HUE, null, 1, D, z);
  const mid = runWorkingPipeline(base, { ...P, hueRotate: 90 }, null, 1, D, z, [], settled.config);
  ok(isRampGradient(mid.config) && maxDiff(decodeRamp(mid.config.ramp)!, mid.ramp) <= 0.5, 'held ramp: the config is the LIVE ramp, not the held one');
  const same = runWorkingPipeline(base, HUE, null, 1, D, z, [], settled.config);
  ok(same.config === settled.config, 'held ramp: nothing moved → the held object itself');
}

console.log('[8] addStopsToConfig');
{
  const w = makeRampGradient(WAVE8, 'linear');
  const added = addStopsToConfig(w, D);
  ok(added.stops.length > STOP_LAYER_CAP && added.stops.length <= budget, `add stops (pure): uncapped, at the Detail budget (got ${added.stops.length})`);
  ok(added.colorSpace === 'linear' && !('ramp' in added), 'add stops (pure): the colorSpace is kept, no ramp rides along');
  ok(addStopsToConfig(cfg, D) === cfg, 'add stops (pure): a stop gradient comes back by identity');
}

// ══ the store half (debug/test-gx-session.mts's node trick) ═══════════════════════════
{
  const disk = new Map<string, string>();
  (globalThis as any).window = {
    localStorage: {
      getItem: (k: string) => (disk.has(k) ? disk.get(k)! : null),
      setItem: (k: string, v: string) => { disk.set(k, String(v)); },
      removeItem: (k: string) => { disk.delete(k); },
      clear: () => disk.clear(),
      get length() { return disk.size; },
      key: (i: number) => [...disk.keys()][i] ?? null,
    },
    addEventListener() {},
    removeEventListener() {},
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }),
    innerWidth: 1920,
    innerHeight: 1080,
    devicePixelRatio: 1,
    location: { search: '', href: 'http://localhost/', hash: '' },
  };
  (globalThis as any).document = { visibilityState: 'visible', addEventListener() {}, removeEventListener() {} };
  (globalThis as any).matchMedia = (globalThis as any).window.matchMedia;
  (globalThis as any).location = (globalThis as any).window.location;
}
const { featureRegistry } = await import('../engine/FeatureSystem');
featureRegistry.register((await import('../palette/features/paletteGenerator')).PaletteGeneratorFeature);
featureRegistry.register((await import('../palette/features/paletteImage')).PaletteImageFeature);
featureRegistry.register((await import('../palette/features/paletteFilters')).PaletteFiltersFeature);
const { registerHistoryProvider } = await import('../store/slices/historySlice');
const { captureEditorConfig, applyEditorConfig, usePaletteEditorStore } = await import('../palette/store/paletteEditorStore');
const { captureGeneratorHistory, restoreGeneratorHistory, useGeneratorStore, fitChannelsToTracks, sampleCurves } = await import('../palette/store/generatorStore');
const { DEFAULT_CURVE_SPACE } = await import('../palette/core/curveSpaces');
registerHistoryProvider('paletteEditor', { capture: captureEditorConfig, restore: applyEditorConfig });
registerHistoryProvider('paletteGenerator', { capture: captureGeneratorHistory, restore: restoreGeneratorHistory });
const { installWorking } = await import('../palette/installWorking');
const collected: GradientConfig[] = [];
const updates: GradientConfig[] = [];
installWorking({
  collectRecent: (c) => { collected.push(c); return 'recent-' + collected.length; },
  updateRecent: (_id, c) => { updates.push(c); return true; },
});
const { useEngineStore } = await import('../store/engineStore');
const { useWorkingStore, addStopsToWorking, coerceWorkingSnapshot } = await import('../palette/store/workingStore');
const engine = () => useEngineStore.getState() as unknown as Record<string, any>;

console.log('[9] Curves + Add stops against the real stores');
{
  // THE 8ZEBBOW2 BUG: Curves fits its keys from the Working base. For a ramp gradient that base
  // must be the texels — through the stop fit it was black, and so were the curves.
  const z = makeRampGradient(ZEBRA);
  const base = channelsOfConfig(z);
  const tracks = fitChannelsToTracks(base, D, 0, DEFAULT_CURVE_SPACE);
  const curves = sampleCurves(tracks, true, DEFAULT_CURVE_SPACE);
  const drawn = buildGradientRamp(base, base, DEFAULT_SLOT_MODS, DEFAULT_SLOT_MODS, { ...P, mixL: 0, mixC: 0, mixH: 0 }, curves, 1).ramp;
  const de = maxDE(drawn, ZEBRA);
  let oddL = 0;
  for (let i = 1; i < 256; i += 2) oddL += rgbToOklab(drawn[i]).L / 128;
  console.log(`  Curves over the zebra: max ΔE ${de.toFixed(4)}, ${tracks[Object.keys(tracks)[0]].keyframes.length} keys on the first channel`);
  ok(de < 0.02 && oddL > 0.3, `Curves over a ramp zebra reproduces the texels (max ΔE ${de.toFixed(4)}, mean L of the coloured texels ${oddL.toFixed(2)})`);

  // ADD STOPS — explicit, uncapped, one undo entry, undoes back to the ramp input.
  useGeneratorStore.setState({ detail: D, tracks: null, curvesOn: false });
  const w8 = makeRampGradient(WAVE8, 'linear');
  useWorkingStore.getState().use(w8, 'wave', 'test');
  const before = engine().paramUndoStack.length;
  addStopsToWorking();
  const doc = usePaletteEditorStore.getState().config;
  ok(useWorkingStore.getState().input.kind === 'stops', 'add stops: the working input is the stops document');
  ok(doc.stops.length > STOP_LAYER_CAP && doc.stops.length <= budget, `add stops: the document has stops past the cap (got ${doc.stops.length})`);
  ok(engine().paramUndoStack.length === before + 1, `add stops: exactly one undo entry (got ${engine().paramUndoStack.length - before})`);
  engine().undoParam();
  const back = useWorkingStore.getState().input;
  ok(back.kind === 'gradient' && isRampGradient(back.config) && back.config.ramp === w8.ramp, 'add stops: undo puts the ramp input back');

  const depth = engine().paramUndoStack.length;
  useWorkingStore.getState().use(cfg, 'stops', 'test');
  const d2 = engine().paramUndoStack.length;
  addStopsToWorking();
  ok(engine().paramUndoStack.length === d2 && useWorkingStore.getState().input.kind === 'gradient', 'add stops: a no-op (no entry, no fold) on a gradient that has stops');
  ok(d2 === depth + 1, 'fixture: use() is itself one entry');

  // configKey: two different ramps must not compare equal (every ramp's stops are []).
  const snap = coerceWorkingSnapshot(JSON.parse(JSON.stringify({ input: { kind: 'gradient', config: makeRampGradient(ZEBRA), name: 'z', source: 's' } })) as JsonValue);
  ok(!!snap && snap.input.kind === 'gradient' && isRampGradient(snap.input.config), 'a ramp gradient input survives the snapshot gate');
  // A pinned session from the bin whose output is a DIFFERENT ramp must open a new entry.
  useWorkingStore.getState().use(makeRampGradient(ZEBRA), 'z', 'test', { fromRecent: true });
  useWorkingStore.setState({ sessionId: 'pinned', sessionPinned: true });
  const nCollected = collected.length;
  engine().setPaletteGenerator({ hueRotate: 40 });
  useWorkingStore.getState().syncRecent();
  ok(collected.length === nCollected + 1, 'configKey tells two ramps apart (a changed ramp output leaves its pinned bin entry alone)');
  engine().setPaletteGenerator({ hueRotate: 0 });
}

if (failures) {
  console.error(`\n${failures} assertion(s) failed`);
  process.exit(1);
}
console.log('\nOK — workingPipeline: all assertions passed');
