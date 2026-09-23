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
 * Recent through the REAL shelf, added 2026-09-16 (the seam wired to favientsStore as
 * gradient-explorer/v2/registerFeatures.ts wires it; each `syncRecent` = the 400 ms debounce):
 *  10. a gradient picked back out of a dated bin — pick → sync → edit → sync, and pick → fold →
 *      sync → stop edit → sync — leaves the entry it came from alone and opens a new one.
 *  11. a ♥ inside the debounce (WorkingHero's write: sync, then `add()`) flashes Kept, the set it
 *      filed into, not the bin the flushed sync grew (gradient-explorer/v2/setSaveFlash.ts).
 *  12. the debounce firing INSIDE an open undo bracket (`syncRecentOutsideUndo`, the shell's
 *      timer): with the `favients` history provider registered as registerPaletteUI registers
 *      it, (a) the wave's shape on the palette route — open, change, sync ×2, put back, close — is
 *      no entry, and the held sync writes after the close; (b) an Adjust-slider gesture on the
 *      DDFS route (`handleInteractionStart('param')`) that keeps its change is one entry carrying
 *      neither the shelf nor the session id, and its undo leaves the shelf alone; (c) a bracket
 *      re-opened in the same task keeps the sync waiting; (d) the control — a direct `syncRecent`
 *      inside a bracket IS captured, so (a) can see a capture (and the ♥ relies on it).
 *
 * A use starts fresh, added 2026-09-23 (owner: a pick throws pending dials away like Cancel):
 *  13. `use` from a state with a value in every Adjust bin and edited HSV curves: every
 *      `ADJUST_FACE_DEFAULTS` control back (Frequency and Targets too), no curves, the axes on
 *      OkLCh, the output the new gradient verbatim, ONE entry — and one undo brings back the old
 *      gradient, its dials and its HSV curves. `fitCurves` (the Curves face open): fresh untouched
 *      OkLCh curves of the NEW gradient in the same one entry. `bakes` (leaving Mix / Image): the
 *      chain and curves reset, Frequency and Targets stay.
 *
 * An untouched Curves fit is the source restated, added 2026-09-23 (smoke:ge-tray [14] went red
 * on it — the hero dropped a stop selected in the Curves face when the face closed):
 *  14. with Adjust at identity and the fit untouched, `runWorkingPipeline` hands back the input's
 *      own config (not a re-fit of the curves' drawing, which for the fixture is a paraphrase);
 *      edited curves or a moved dial still fit; through the stores, `deriveWorkingNow`, Recent and
 *      `beginEdit` all see the gradient's own stops, the fold is a copy and one undo entry.
 *
 * ── FALSIFIED 2026-09-23 (section [14]) — each break made, run red (exit 1), reverted ──
 *   R1  `restated` forced false in `runWorkingPipeline` (the code before the fix) → 4 red: the
 *       pure "hands back the input's own config", the store flag, Recent ("#B2D3D0" bias 0.35 in
 *       the write) and "beginEdit folds the gradient's own stops".
 *   R2  `restated` without `curvesUntouched` → 3 red: "an edited fit is a fitted config", "edited
 *       curves give the fit of what they draw" and the fixture line.
 *   R3  `restated` without the Adjust identity → 1 red, "not with an Adjust dial moved".
 *   R4  `deriveWorkingNow` passing `false` for the flag → 3 red: the store flag, Recent, beginEdit.
 *   R5  `beginEdit` folding `d.config` itself on a restated output → 1 red, "… as a copy".
 *   (`useWorkingDerived` passing `false` is invisible here — no React in node — and reds
 *   smoke:ge-tray [14].)
 *
 * ── FALSIFIED 2026-09-23 (section [13]) — each break made, run red (exit 1), reverted ──
 *   U1  the reset back under `if (opts?.bakes)` (the code before the fix) → 6 red: every dial left,
 *       the HSV curves left, not passthrough, and the three `fitCurves` checks.
 *   U2  `MAIN_DEFAULTS` for a pick too → 2 red: "left noiseFreq=64, noiseL=false, noiseC=true" (use
 *       and fitCurves).
 *   U3  `fitCurves` ignored → 1 red, "fresh, untouched curves in OkLCh". (Its output check stays
 *       green: with no curves the output IS the new gradient — the curves check is the guard.)
 *   U4  the space not reset → 1 red, "the axes back on OkLCh (space hsv…)".
 *   U5  `ADJUST_FACE_DEFAULTS` for a bake too → 1 red, "bakes: noise Frequency and Targets stay".
 *   U6  the refit as its own `fitFromChannels` call after the bracket → 3 red: "still exactly one
 *       undo entry (got 2)", the Ctrl+Z after it, and a cascade into the bake check (that one undo
 *       left the stack a step off).
 *
 * ── FALSIFIED 2026-09-16 (section [12]) — each break made, run red (exit 1), reverted ──
 *   S1  `syncRecentOutsideUndo` calling `syncRecent` directly (the debounce before the fix) → 8
 *       red: all of (a), (b) and (c), e.g. "a cancelled gesture … leaves NO undo entry (got 1,
 *       diff __ext__favients,__ext__working)". The browser half went red too: smoke:ge-wave [7],
 *       [7b], [7c]. (b) moved its dial to 80, not 40, after the first cut stayed green on "carrying
 *       neither the shelf nor the session" under S1 — (a) had left the entry at 40 already, so the
 *       update wrote nothing.
 *   S2  `paramUndoBracket.isParamTransactionOpen` reading the drag depth instead of the engine's
 *       snapshot → 3 red, all (b): the DDFS route never touches the depth, so its sync landed inside
 *       ("diff __ext__favients,paletteGenerator") and the undo rewound the shelf.
 *   S3  `drainAfterClose` without its re-check → 2 red, both (c): the sync ran inside the re-opened
 *       bracket ("1 entries, 1 undo").
 *
 * ── FALSIFIED 2026-09-16 (sections [10]–[11]) — each break made, run red (exit 1), reverted ──
 *   R1  `syncRecent`'s pin back to `s.sessionPinned && next === s.sessionId` (the first sync
 *       drops it) → 4 red, all [10]: both "the entry … is left as it was" assertions, "the edit
 *       opened a new entry (2 entries)", "a second edit …". [9] stays green — it sets the pin by
 *       hand and never runs the first sync, which is why [10] exists.
 *   R2  `stillThePick` reading only a `gradient` input (not a fold's `bakedFrom`) → 1 red, [10]
 *       "pick from a bin → fold → sync → stop edit → sync".
 *   R3  `setSaveFlash.ts` `countsNow` counting the bins again → 1 red, [11] "the flash names
 *       Kept" (got `bin:<today>`).
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

// ══ Recent through the REAL shelf (sections [10]–[11]) ══════════════════════════════════
// The fake collector above answers every collect with a new id and every update with true, so
// it cannot tell a promote from a new entry. From here the seam is wired to the real store,
// exactly as gradient-explorer/v2/registerFeatures.ts wires it, and each sync call stands for
// the shell's 400 ms debounce firing (GradientExplorerV2App, grep `syncRecent`).
{
  const { useFavientsStore, favientSig, DEFAULT_GROUP, RECENT_GROUP } = await import('../palette/store/favientsStore');
  const { setRecentCollector, setRecentUpdater } = await import('../palette/store/workingStore');
  const { groupSetId } = await import('../palette/core/groundSets');
  const { flashSaveWhereItLanded, setSaveFlashNow } = await import('../gradient-explorer/v2/setSaveFlash');
  setRecentCollector((c, n, s, o) => useFavientsStore.getState().collectRecent(c, n, s, o));
  setRecentUpdater((id, c, n) => useFavientsStore.getState().updateRecent(id, c, n));
  const fav = () => useFavientsStore.getState();
  const w = () => useWorkingStore.getState();
  const two = (a: string, b: string): GradientConfig => ({ stops: [{ id: 'a', position: 0, color: a }, { id: 'b', position: 1, color: b }], colorSpace: 'srgb', blendSpace: 'oklab' });
  const A = two('#ff0000', '#0000ff');
  const B = two('#00ff00', '#000000');
  const sigA = favientSig(A);
  useGeneratorStore.setState({ tracks: null, curvesOn: false });
  engine().setPaletteGenerator({ hueRotate: 0 });

  console.log('[10] a gradient picked back out of a dated bin: its first change opens a NEW entry');
  {
    fav().clear();
    w().use(A, 'A', 'Browse'); w().syncRecent();
    w().use(B, 'B', 'Browse'); w().syncRecent();
    const idA = fav().favients.find((f) => f.name === 'A')?.id;
    ok(!!idA && fav().favients.length === 2, 'fixture: two picks make two Recent entries');
    const entryA = () => fav().favients.find((f) => f.id === idA);

    // The real order: the pick, the debounced sync, THEN the edit. (A harness that sets the pinned
    // state by hand skips the first sync, which is exactly where the pin used to fall.)
    w().use(A, 'A', 'My Gradients', { fromRecent: true });
    w().syncRecent();
    ok(w().sessionId === idA, 'the bin pick is collected onto the entry it came from (same id)');
    engine().setPaletteGenerator({ hueRotate: 40 });
    w().syncRecent();
    ok(!!entryA() && favientSig(entryA()!.config) === sigA, 'pick from a bin → sync → edit → sync: the entry it was picked from is left as it was');
    ok(fav().favients.length === 3 && !!w().sessionId && w().sessionId !== idA, `… and the edit opened a new entry (${fav().favients.length} entries)`);
    engine().setPaletteGenerator({ hueRotate: 80 });
    w().syncRecent();
    ok(fav().favients.length === 3 && favientSig(entryA()!.config) === sigA, 'a second edit refreshes the new entry in place; still three, the original untouched');
    engine().setPaletteGenerator({ hueRotate: 0 });

    // The same through a FOLD inside the debounce (a knot clicked without moving), then a stop edit.
    fav().clear();
    w().use(A, 'A', 'Browse'); w().syncRecent();
    const idA2 = fav().favients[0].id;
    w().use(B, 'B', 'Browse'); w().syncRecent();
    w().use(A, 'A', 'My Gradients', { fromRecent: true });
    w().beginEdit();
    ok(w().input.kind === 'stops', 'fixture: beginEdit folded the pick into the stops document');
    w().syncRecent();
    usePaletteEditorStore.getState().setConfig(two('#ff0000', '#00ff88'));
    w().syncRecent();
    const orig = fav().favients.find((f) => f.id === idA2);
    ok(!!orig && favientSig(orig.config) === sigA && fav().favients.length === 3, 'pick from a bin → fold → sync → stop edit → sync: the bin entry is left alone and a new one opens');
  }

  console.log('[11] a ♥ inside the debounce flashes the set it filed into, not today\'s bin');
  {
    fav().clear();
    const C = two('#abcdef', '#123456');
    w().use(C, 'C', 'Browse');
    // WorkingHero's toggleStar write, verbatim in shape: flush the Recent sync, then file with add().
    flashSaveWhereItLanded(C, () => { w().syncRecent(); fav().add(C, 'C', 'Browse'); }, { slow: true });
    const grewBin = fav().favients.some((f) => f.group === RECENT_GROUP);
    const kept = fav().favients.some((f) => (f.group ?? DEFAULT_GROUP) === DEFAULT_GROUP);
    ok(grewBin && kept, 'fixture: the ♥\'s write grew today\'s bin (the flushed sync) AND Kept (the save)');
    ok(setSaveFlashNow()?.setId === groupSetId(DEFAULT_GROUP), `the flash names Kept, where add() filed it (got ${setSaveFlashNow()?.setId})`);
  }

  console.log('[12] a Recent sync held past the debounce never lands inside an open undo bracket');
  {
    // The shelf rides undo exactly as registerPaletteUI registers it — without this provider no
    // bracket could capture a Recent write, and every assertion below would pass for nothing.
    const { captureFavientsHistory, restoreFavientsHistory } = await import('../palette/store/favientsStore');
    const { paramEditStart, paramEditEnd } = await import('../palette/store/paramUndoBracket');
    registerHistoryProvider('favients', { capture: captureFavientsHistory, restore: restoreFavientsHistory });
    // The deferred write drains in a microtask after the close; a macrotask is past all of them.
    const settle = () => new Promise<void>((r) => setTimeout(r, 0));
    const depth = (): number => engine().paramUndoStack.length;
    const topDiff = (): string => {
      const st = engine().paramUndoStack as { diff: Record<string, unknown> }[];
      return st.length ? Object.keys(st[st.length - 1].diff).sort().join(',') : '';
    };
    const hue = (v: number) => engine().setPaletteGenerator({ hueRotate: v });
    const readHue = (): number => engine().paletteGenerator?.hueRotate;

    // (a) THE WAVE'S SHAPE, on the palette route (`paramEditStart`): arm → the preview changes the
    // output → the 400 ms debounce fires (twice) → cancel puts it back → close. A fresh session
    // (`use`, no sync yet), so a captured write would change BOTH the shelf and the session id.
    fav().clear();
    w().use(A, 'A', 'Browse');
    const d0 = depth();
    paramEditStart();
    hue(40);
    w().syncRecentOutsideUndo();
    w().syncRecentOutsideUndo();
    ok(fav().favients.length === 0 && w().sessionId === null, 'palette route: while the bracket is open the sync writes nothing');
    hue(0);
    paramEditEnd();
    ok(depth() === d0, `palette route: a cancelled gesture held past the debounce leaves NO undo entry (got ${depth() - d0}${depth() > d0 ? `, diff ${topDiff()}` : ''})`);
    await settle();
    ok(fav().favients.length === 1 && w().sessionId === fav().favients[0].id && favientSig(fav().favients[0].config) === sigA,
      `… and the held sync writes once the bracket closes: one entry, the gradient as the gesture left it (${fav().favients.length} entries)`);

    // (b) THE DDFS ROUTE (`handleInteractionStart('param')` — every Adjust slider), which never
    // touches the palette's drag depth. A gesture that KEEPS its change: one entry, and it must
    // carry the dial alone.
    const d1 = depth();
    engine().handleInteractionStart('param');
    hue(80); // not (a)'s 40: a shelf (a) had wrongly left at 40 must still see a real write here
    w().syncRecentOutsideUndo();
    ok(favientSig(fav().favients[0].config) === sigA, 'DDFS route: while the slider bracket is open the sync writes nothing');
    engine().handleInteractionEnd();
    ok(depth() === d1 + 1 && !/__ext__(favients|working)/.test(topDiff()), `DDFS route: the kept change is one entry carrying neither the shelf nor the session (diff ${topDiff()})`);
    await settle();
    ok(fav().favients.length === 1 && favientSig(fav().favients[0].config) !== sigA, 'DDFS route: the held sync refreshes the session entry after the release');
    const shelf = JSON.stringify(fav().favients);
    engine().undoParam();
    ok(JSON.stringify(fav().favients) === shelf && readHue() === 0, 'undoing that gesture puts the dial back and leaves My Gradients alone');

    // (c) A bracket opened again IN THE SAME TASK (a fold, then a drag start) keeps it waiting.
    fav().clear();
    w().use(B, 'B', 'Browse');
    const d2 = depth();
    paramEditStart();
    w().syncRecentOutsideUndo();
    paramEditEnd();
    paramEditStart();
    await settle();
    ok(fav().favients.length === 0, 'a bracket re-opened before the drain keeps the sync waiting');
    paramEditEnd();
    await settle();
    ok(fav().favients.length === 1 && depth() === d2, `… it writes when that one closes, and neither bracket has an entry (${fav().favients.length} entries, ${depth() - d2} undo)`);

    // (d) CONTROL: a direct `syncRecent` inside a bracket IS captured — so (a) could have seen a
    // capture, and this is what the ♥ keeps on purpose (its sync, then `add()`, in one bracket).
    fav().clear();
    w().use(A, 'A', 'Browse');
    const d3 = depth();
    paramEditStart();
    hue(40);
    w().syncRecent();
    hue(0);
    paramEditEnd();
    ok(depth() === d3 + 1 && /__ext__favients/.test(topDiff()), `control: a direct syncRecent inside a bracket is captured (diff ${topDiff()})`);
  }
}

// ══ [13] a use starts fresh (owner, 2026-09-23) ══════════════════════════════════════════
// A wall pick is `use`. It kept whatever was live: a moved dial applied to the new pick (Apply
// still offered, to bake it in), a Phase that "return to source" had put back rode on unseen, and
// with the Curves face open the output stayed the OLD gradient's curves. Now `use` discards the
// dials (everything the Adjust face's Cancel resets) and the curves inside its own bracket.
console.log('[13] a use starts fresh: dials and curves go, and one Ctrl+Z brings them back');
{
  const { ADJUST_FACE_DEFAULTS } = await import('../palette/store/generatorStore');
  const { deriveWorkingNow } = await import('../palette/store/workingStore');
  const w = () => useWorkingStore.getState();
  const g = () => useGeneratorStore.getState();
  const gen = () => engine().paletteGenerator as Record<string, unknown>;
  const depth = (): number => engine().paramUndoStack.length;
  const two = (a: string, b: string): GradientConfig => ({ stops: [{ id: 'a', position: 0, color: a }, { id: 'b', position: 1, color: b }], colorSpace: 'srgb', blendSpace: 'oklab' });
  const A = two('#1B2A6B', '#F2B134');
  const B = two('#E4572E', '#17BEBB');
  const stopsKey = (c: GradientConfig | null | undefined) => JSON.stringify(c?.stops.map((s) => [s.position, s.color.toUpperCase()]) ?? null);
  // What a user can leave live: a value in every Adjust bin (Frequency and Targets among them),
  // and EDITED curves drawn in HSV.
  const DIALS = { hueRotate: 30, phase: 0.05, bands: 4, noise: 0.3, noiseFreq: 64, noiseL: false, noiseC: true };
  const offDefault = () => Object.entries(ADJUST_FACE_DEFAULTS).filter(([k, v]) => gen()[k] !== v).map(([k]) => `${k}=${String(gen()[k])}`);
  const missing = () => Object.entries(DIALS).filter(([k, v]) => gen()[k] !== v).map(([k]) => `${k}=${String(gen()[k])}`);
  w().use(A, 'A', 'Browse');
  engine().setPaletteGenerator(DIALS);
  useGeneratorStore.setState({ curveSpace: 'hsv', tracks: fitChannelsToTracks(channelsOfConfig(A), D, 0, 'hsv'), curvesOn: true, tracksEdited: true });
  const tracksA = JSON.stringify(g().tracks);
  const rampA = deriveWorkingNow()!.ramp;

  // the pick
  const d0 = depth();
  w().use(B, 'B', 'Browse');
  ok(offDefault().length === 0, `use: every Adjust control is back at its default, Frequency and Targets included (left ${offDefault().join(', ') || 'none'})`);
  ok(g().tracks === null && !g().curvesOn && !g().tracksEdited && g().curveSpace === DEFAULT_CURVE_SPACE, `use: no curves left and the axes back on OkLCh (space ${g().curveSpace}, curvesOn ${g().curvesOn})`);
  const dB = deriveWorkingNow();
  ok(!!dB && dB.passthrough && stopsKey(dB.config) === stopsKey(B), 'use: the output is the new gradient, verbatim (passthrough)');
  ok(depth() === d0 + 1, `use: exactly one undo entry (got ${depth() - d0})`);
  engine().undoParam();
  const back = w().input;
  ok(back.kind === 'gradient' && back.name === 'A' && stopsKey(back.config) === stopsKey(A), 'use → one Ctrl+Z: the previous gradient is back');
  ok(missing().length === 0, `use → one Ctrl+Z: … with its dials (wrong: ${missing().join(', ') || 'none'})`);
  ok(JSON.stringify(g().tracks) === tracksA && g().curvesOn && g().curveSpace === 'hsv', `use → one Ctrl+Z: … and its curves, in the space they were drawn in (space ${g().curveSpace})`);

  // the pick with the Curves face open: refitted to the NEW gradient, in the same one entry
  const d1 = depth();
  w().use(B, 'B', 'Browse', { fitCurves: true });
  ok(depth() === d1 + 1, `fitCurves: still exactly one undo entry (got ${depth() - d1})`);
  ok(!!g().tracks && g().curvesOn && !g().tracksEdited && g().curveSpace === DEFAULT_CURVE_SPACE, `fitCurves: fresh, untouched curves in OkLCh (space ${g().curveSpace}, edited ${g().tracksEdited})`);
  ok(offDefault().length === 0, `fitCurves: the dials start fresh too (left ${offDefault().join(', ') || 'none'})`);
  const dF = deriveWorkingNow()!;
  const toNew = maxDE(dF.ramp, dB!.ramp);
  const toOld = maxDE(dF.ramp, rampA);
  console.log(`  fitCurves: max ΔE ${toNew.toFixed(4)} from the new pick, ${toOld.toFixed(4)} from the old gradient's output`);
  ok(toNew < 0.03 && toOld > 0.2, `fitCurves: the output is the NEW gradient, not the old curves (max ΔE ${toNew.toFixed(4)} to it, ${toOld.toFixed(4)} to the old)`);
  engine().undoParam();
  ok(w().input.kind === 'gradient' && JSON.stringify(g().tracks) === tracksA && g().curveSpace === 'hsv' && missing().length === 0, 'fitCurves → one Ctrl+Z: the previous gradient, its dials and its HSV curves');

  // a BAKE (leaving a live Mix / Image) resets what it folded in, and leaves Frequency and Targets
  // where they are, as every other bake does (MAIN_DEFAULTS)
  w().use(B, 'B', 'Mix', { bakes: true });
  ok(gen().hueRotate === 0 && gen().phase === 0 && gen().bands === 0 && gen().noise === 0 && g().tracks === null, 'bakes: the chain and the curves reset');
  ok(gen().noiseFreq === 64 && gen().noiseL === false && gen().noiseC === true, 'bakes: noise Frequency and Targets stay, as after every bake');
  engine().undoParam();
  engine().setPaletteGenerator({ ...ADJUST_FACE_DEFAULTS });
  useGeneratorStore.setState({ tracks: null, curvesOn: false, tracksEdited: false, curveSpace: DEFAULT_CURVE_SPACE });
}

// ══ [14] an untouched Curves fit is the source restated (2026-09-23) ══════════════════════
// Opening the Curves face fits keys to the gradient. The output config was a re-fit of their
// drawing, which for most gradients is a PARAPHRASE of the stops, not the stops — so an untouched
// visit swapped the hero editor's knot list (a stop selected in the face was dropped on leaving:
// smoke:ge-tray [14]), `beginEdit` baked the paraphrase, and Recent rewrote its copy.
console.log('[14] an untouched Curves fit hands back the gradient itself');
{
  const { deriveWorkingNow } = await import('../palette/store/workingStore');
  // The catalogue's thamesville-00 as a wall pick hands it over (a fitted pick: ids in fit order,
  // two step segments, 'linear' texture profile). Its untouched re-fit moves two knots by a level
  // and one bias 0.5 → 0.35 at Detail 8 / Smooth 0 — the app's defaults (asserted below).
  const T: GradientConfig = {
    stops: [
      { id: 's0', position: 0, color: '#B1D3D3', bias: 0.5, interpolation: 'step' },
      { id: 's2', position: 0.4411764705882353, color: '#B2D3D1', bias: 0.5, interpolation: 'linear' },
      { id: 's4', position: 0.4980392156862745, color: '#D2D3AB', bias: 0.5, interpolation: 'linear' },
      { id: 's3', position: 0.5549019607843137, color: '#F3D385', bias: 0.5, interpolation: 'step' },
      { id: 's1', position: 1, color: '#F3D385', bias: 0.5, interpolation: 'linear' },
    ],
    colorSpace: 'linear',
    blendSpace: 'oklab',
  };
  // everything the editor's knot identity compares (`knotsKey` in AdvancedGradientEditor)
  const knotKey = (c: GradientConfig | null | undefined) =>
    JSON.stringify([...(c?.stops ?? [])].sort((a, b) => a.position - b.position).map((s) => [s.id, s.position, s.color, s.bias ?? 0.5, s.interpolation ?? 'linear']));
  useGeneratorStore.setState({ detail: 8, smooth: 0 });
  const base = channelsOfConfig(T);
  const curves = sampleCurves(fitChannelsToTracks(base, 8, 0, DEFAULT_CURVE_SPACE), true, DEFAULT_CURVE_SPACE);
  const refit = runWorkingPipeline(base, P, curves, 1, 8, T, [], null, false);
  ok(knotKey(refit.config) !== knotKey(T), 'fixture: this gradient\'s untouched re-fit is a paraphrase of its stops (else nothing below can fail)');

  // pure
  const r = runWorkingPipeline(base, P, curves, 1, 8, T, [], null, true);
  ok(r.config === T && r.restated && !r.passthrough, `restated: an untouched fit hands back the input's own config (same object ${r.config === T}, restated ${r.restated}, passthrough ${r.passthrough})`);
  ok(maxDiff(r.ramp, refit.ramp) === 0, 'restated: the ramp is still the curves\' own drawing (the face stays live on the bar)');
  ok(refit.config !== T && !refit.restated, 'restated: an edited fit is a fitted config');
  const dial = runWorkingPipeline(base, { ...P, hueRotate: 30 }, curves, 1, 8, T, [], null, true);
  ok(dial.config !== T && !dial.restated, 'restated: not with an Adjust dial moved (the output is a real transform)');
  ok(!runWorkingPipeline(base, P, null, 1, 8, T, [], null, true).restated, 'restated: never together with passthrough (no curves)');
  ok(!runWorkingPipeline(channelsOfRamp(WAVE8), P, curves, 1, 8, null, [], null, true).restated, 'restated: never without an input config of its own (a live source)');

  // the store: the Curves face open on a pick (`fitCurves`), untouched
  const w = () => useWorkingStore.getState();
  w().use(T, 'thamesville-00', 'Browse', { fitCurves: true });
  const input = w().input;
  const d = deriveWorkingNow()!;
  ok(!!useGeneratorStore.getState().tracks && !useGeneratorStore.getState().tracksEdited, 'fixture: the Curves fit is live and untouched');
  ok(input.kind === 'gradient' && d.restated && d.config === input.config, 'restated: the store passes the untouched flag (deriveWorkingNow hands back the input config)');
  // what the shell's debounced sync writes into Recent (a local seam: [10] wired the real shelf)
  const { setRecentCollector, setRecentUpdater } = await import('../palette/store/workingStore');
  const written: GradientConfig[] = [];
  setRecentCollector((c) => { written.push(c); return 'r14'; });
  setRecentUpdater((_id, c) => { written.push(c); return true; });
  w().syncRecent();
  ok(written.length === 1 && knotKey(written[0]) === knotKey(T), `restated: Recent keeps the gradient's own stops (${written.length} write(s))`);
  const d0 = engine().paramUndoStack.length;
  w().beginEdit();
  const doc = usePaletteEditorStore.getState().config;
  ok(w().input.kind === 'stops' && knotKey(doc) === knotKey(T) && doc.colorSpace === 'linear', `restated: beginEdit folds the gradient's own stops (${JSON.stringify(doc.stops.map((s) => [s.color, s.bias]))})`);
  ok(input.kind === 'gradient' && doc !== input.config && doc.stops !== input.config.stops, 'restated: … as a copy, never the input\'s own object');
  ok(engine().paramUndoStack.length === d0 + 1 && useGeneratorStore.getState().tracks === null, 'restated: the fold is one entry and the fit goes with it');
  engine().undoParam();
  ok(w().input === input || (w().input.kind === 'gradient' && knotKey((w().input as { config: GradientConfig }).config) === knotKey(T)), 'restated: one Ctrl+Z puts the gradient back');

  // EDITED curves still bake what they draw
  useGeneratorStore.setState({ tracksEdited: true });
  const e = deriveWorkingNow()!;
  ok(!e.restated && knotKey(e.config) === knotKey(refit.config), 'restated: edited curves give the fit of what they draw');
  useGeneratorStore.setState({ tracks: null, curvesOn: false, tracksEdited: false, curveSpace: DEFAULT_CURVE_SPACE });
}

if (failures) {
  console.error(`\n${failures} assertion(s) failed`);
  process.exit(1);
}
console.log('\nOK — workingPipeline: all assertions passed');
